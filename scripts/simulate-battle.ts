/**
 * Denge aracı: gerçek eşleşme modülü + savaş formülleriyle (becerisiz, çıplak başlangıç ekipmanı)
 * her aşamayı simüle eder. Kullanım:
 *   npx vite-node scripts/simulate-battle.ts [sınıf] [aşamaSayısı] [oyun sayısı]
 * Çıktı: ortalama oyuncu (rastgele hamle) ve iyi oyuncu (en çok taş) için kaç hamlede bittiği ve
 * kahramanın can kaybı. Beceriler ve drop ekipmanlar dahil değildir, yani gerçek oyun biraz daha kolaydır.
 */
import { HERO_CLASSES } from "../src/data/classes";
import { capGemShield } from "../src/data/difficulty";
import { WORLD_REGIONS } from "../src/data/world";
import { findMatches, findPossibleMoves, type MatchGrid } from "../src/game/match3";
import type { ElementType, GemType, HeroClassId, StageDef } from "../src/types/game";
import { computeHeroBuild } from "../src/utils/rpgLogic";
import { createInitialSaveState } from "../src/utils/storage";

const BASE: GemType[] = ["fire", "frost", "nature", "lightning", "arcane"];
const SIZE = 8;

function randomGem(): GemType {
  return Math.random() < 0.045 ? "golden" : BASE[Math.floor(Math.random() * BASE.length)];
}
function newGrid(): MatchGrid {
  for (;;) {
    const g: MatchGrid = Array.from({ length: SIZE }, () =>
      Array.from({ length: SIZE }, () => ({ type: randomGem(), special: "none" as const, frozen: 0 }))
    );
    if (findMatches(g).matchedSet.size === 0 && findPossibleMoves(g).length > 0) return g;
  }
}
function collapse(g: MatchGrid) {
  for (let c = 0; c < SIZE; c++) {
    const col = [];
    for (let r = SIZE - 1; r >= 0; r--) if (g[r][c]) col.push(g[r][c]);
    for (let r = SIZE - 1; r >= 0; r--) {
      g[r][c] = col[SIZE - 1 - r] ?? { type: randomGem(), special: "none", frozen: 0 };
    }
  }
}

interface Result { moves: number; hpLostPct: number; won: boolean }

function fight(stage: StageDef, classId: HeroClassId, smart: boolean, maxMoves = 80): Result {
  const hero = { ...createInitialSaveState().heroes[classId], level: stage.recommendedLevel };
  const build = computeHeroBuild(hero);
  const e = stage.enemy;
  const maxHp = build.stats.health;
  let hp = maxHp, minHp = maxHp, shield = 0, rage = 0, eHp = e.maxHp, eShield = 0;
  let counter = e.attackInterval, enraged = false;
  let grid = newGrid();
  const p = build.passives;
  const elemBoost = 1 + build.stats.elementalDamage / 100;

  const hit = (raw: number, el: GemType, forceCrit = false, pierce = false) => {
    let d = raw;
    const crit = forceCrit || Math.random() * 100 < build.stats.critChance + (el === "lightning" ? 12 : 0);
    if (crit) d = Math.round(d * build.stats.critDamage / 100);
    if (el === (e.weakness as ElementType) || el === "golden") d = Math.round(d * (1.45 + p.weaknessBonusPct / 100));
    if (e.resistance === el) d = Math.round(d * 0.72);
    if (e.isBoss && p.bossDmgPct > 0) d = Math.round(d * (1 + p.bossDmgPct / 100));
    if (!pierce) d = Math.max(8, Math.round(d - e.defense * 0.45));
    if (p.lifestealPct > 0) hp = Math.min(maxHp, hp + Math.max(1, Math.round(d * p.lifestealPct / 100)));
    const ab = Math.min(eShield, d); eShield -= ab; d -= ab;
    eHp = Math.max(0, eHp - d);
  };

  for (let move = 1; move <= maxMoves; move++) {
    const moves = findPossibleMoves(grid);
    if (moves.length === 0) grid = newGrid();
    const list = findPossibleMoves(grid);
    let pick = list[Math.floor(Math.random() * list.length)];
    if (smart) {
      let best = -1;
      for (const m of list) {
        const t = grid.map((r) => [...r]);
        [t[m.a.row][m.a.col], t[m.b.row][m.b.col]] = [t[m.b.row][m.b.col], t[m.a.row][m.a.col]];
        const n = findMatches(t).matchedSet.size;
        if (n > best) { best = n; pick = m; }
      }
    }
    [grid[pick.a.row][pick.a.col], grid[pick.b.row][pick.b.col]] = [grid[pick.b.row][pick.b.col], grid[pick.a.row][pick.a.col]];

    let combo = 0;
    for (;;) {
      const { matchedSet } = findMatches(grid);
      if (matchedSet.size === 0) break;
      combo++;
      const counts: Record<GemType, number> = { fire: 0, frost: 0, nature: 0, lightning: 0, arcane: 0, golden: 0 };
      matchedSet.forEach((k) => {
        const [r, c] = k.split(",").map(Number);
        counts[grid[r][c]!.type]++;
        grid[r][c] = null;
      });
      const comboMult = 1 + (combo - 1) * (0.28 + p.comboBoostPct / 100);
      const atk = build.stats.attack * (1 + rage * 0.08);
      if (counts.fire) {
        if (classId === "warrior" || classId === "dragonheart") rage = Math.min(12, rage + 1);
        hit(Math.round(atk * 0.34 * counts.fire * comboMult * (1 + (p.fireDmgPct + p.gemBonuses.fire) / 100)), "fire");
      }
      if (counts.frost) hit(Math.round(atk * 0.16 * counts.frost * elemBoost * comboMult), "frost");
      if (counts.nature) {
        hp = Math.min(maxHp, hp + Math.round(maxHp * 0.025 * counts.nature * comboMult));
        shield = Math.max(shield, capGemShield(shield + Math.round((16 + build.stats.defense * 0.9) * counts.nature * 0.55), maxHp));
      }
      if (counts.lightning) hit(Math.round(atk * 0.31 * counts.lightning * elemBoost * comboMult * (1 + (p.lightningCritPct + p.gemBonuses.lightning) / 100)), "lightning");
      if (counts.arcane) hit(Math.round(atk * 0.28 * counts.arcane * elemBoost * comboMult), "arcane", false, true);
      if (counts.golden) {
        hp = Math.min(maxHp, hp + Math.round(maxHp * 0.05 * counts.golden));
        shield = Math.max(shield, capGemShield(shield + 35 * counts.golden, maxHp));
        hit(Math.round(atk * 0.55 * counts.golden * comboMult), "golden", true, true);
      }
      if (eHp <= 0) return { moves: move, hpLostPct: Math.round(100 * (maxHp - minHp) / maxHp), won: true };
      collapse(grid);
    }

    counter--;
    if (counter <= 0) {
      if (Math.random() * 100 >= build.stats.dodge) {
        let raw = e.attack * (enraged ? 1.32 : 1);
        if (e.isBoss && Math.random() < 0.45) raw *= 1.25;
        let d = Math.max(8, Math.round(raw * 100 / (100 + build.stats.defense * 1.45)));
        const ab = Math.min(shield, d); shield -= ab; d -= ab;
        hp = Math.max(0, hp - d);
        minHp = Math.min(minHp, hp);
      }
      counter = enraged ? Math.max(1, e.attackInterval - 1) : e.attackInterval;
    }
    if (!enraged && e.isBoss && eHp / e.maxHp < 0.4) enraged = true;
    if (hp <= 0) return { moves: move, hpLostPct: 100, won: false };
  }
  return { moves: maxMoves, hpLostPct: Math.round(100 * (maxHp - minHp) / maxHp), won: false };
}

const median = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

function simulate(stage: StageDef, classId: HeroClassId, runs: number) {
  const out: Record<string, { moves: number; hpLost: number; win: number }> = {};
  for (const [name, smart] of [["avg", false], ["good", true]] as const) {
    const rs = Array.from({ length: runs }, () => fight(stage, classId, smart));
    out[name] = {
      moves: median(rs.map((r) => r.moves)),
      hpLost: median(rs.map((r) => r.hpLostPct)),
      win: Math.round(100 * rs.filter((r) => r.won).length / runs),
    };
  }
  return out;
}

{
  const classId = (process.argv[2] ?? "warrior") as HeroClassId;
  const count = Number(process.argv[3] ?? 24);
  const runs = Number(process.argv[4] ?? 60);
  if (!HERO_CLASSES[classId]) throw new Error(`Bilinmeyen sınıf: ${classId}`);
  const stages = WORLD_REGIONS.flatMap((r) => r.stages).slice(0, count);
  console.log(`Sınıf: ${classId}, ${runs} oyun/aşama (hamle = medyan, can% = savaş boyunca en düşük can kaybı, medyan)`);
  console.log("aşama".padEnd(16), "tür".padEnd(9), "Sv", "düşmanCan".padStart(9), " | ort.oyuncu hamle/can%/kazanma | iyi oyuncu");
  for (const s of stages) {
    const r = simulate(s, classId, runs);
    console.log(
      s.id.padEnd(16), s.type.padEnd(9), String(s.recommendedLevel).padStart(2), String(s.enemy.maxHp).padStart(9), "|",
      `${r.avg.moves}`.padStart(3), `${r.avg.hpLost}%`.padStart(5), `${r.avg.win}%`.padStart(5), "|",
      `${r.good.moves}`.padStart(3), `${r.good.hpLost}%`.padStart(5), `${r.good.win}%`.padStart(5)
    );
  }
}
