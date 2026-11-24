import { skillPointBudget } from "../../src/data/passiveTree";
/**
 * Denge aracı: gerçek eşleşme modülü + savaş formülleriyle (becerisiz, çıplak başlangıç ekipmanı)
 * her aşamayı simüle eder. Kullanım:
 *   npx vite-node scripts/simulate-battle.ts [sınıf] [aşamaSayısı] [oyun sayısı]
 * Çıktı: ortalama oyuncu (rastgele hamle) ve iyi oyuncu (en çok taş) için kaç hamlede bittiği ve
 * kahramanın can kaybı. Beceriler ve drop ekipmanlar dahil değildir, yani gerçek oyun biraz daha kolaydır.
 */
import { HERO_CLASSES } from "../../src/data/classes";
import { capGemShield, enemyHitDamage } from "../../src/data/difficulty";
import { WORLD_REGIONS } from "../../src/data/world";
import { findMatches, findPossibleMoves, type MatchGrid } from "../../src/game/match3";
import type { ElementType, GemType, HeroClassId, StageDef } from "../../src/types/game";
import { getSkillLoadout } from "../../src/data/skills";
import { computeRelicEffects, relicStartShield } from "../../src/data/dungeons";
import type { ActiveSkillDef, RelicId } from "../../src/types/game";
import { computeHeroBuild } from "../../src/utils/rpgLogic";
import { createInitialSaveState } from "../../src/utils/storage";
import { generateEquipmentItem } from "../../src/data/items";
import type { EquipmentSlot, Rarity } from "../../src/types/game";

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

export interface Result { moves: number; hpLostPct: number; won: boolean; hpLeft: number; maxHp: number }

export interface FightOptions {
  maxMoves?: number;
  /** Kahraman seviyesi (varsayılan: aşamanın önerilen seviyesi) */
  level?: number;
  /** Başlangıç canı (zindan can taşıma); varsayılan tam can */
  startHp?: number;
  /** Kahramana uygulanacak ek yapı dönüşümü (ör. zindan güçleri) */
  tweakBuild?: (b: ReturnType<typeof computeHeroBuild>) => ReturnType<typeof computeHeroBuild>;
  /** Savaş başında kalkan */
  startShield?: number;
  /** Tam set ekipman: tüm yuvalara bu nadirlikte (aşama seviyesinde) eşya takılır */
  gear?: Rarity;
  /** Yetenekleri (ve Ulti'yi) kullan: sınıfın seviyesine açık yetenekleri, basit ama sabit bir oyuncu politikasıyla */
  skills?: boolean;
  /** Zindan güçleri: savaş içi etkileri (Ulti Kıvılcımı, Kare Siper, Hazır Muhafız) simülasyona eklenir */
  relics?: RelicId[];
  /** Akıllı oyuncu zayıflık taşlarını tercih eder (eşleşen zayıflık taşı 1,45 sayılır) */
  weakAware?: boolean;
  /** Pasif puanlarını seviyeye göre dağıt (hasar → kaynak → ortak → savunma, her dalda alt kademeden başlayarak) */
  passives?: boolean;
  /** Seviye/eşya seviyesi üst sınırı (varsayılan 50, eski dengeleme betikleriyle uyum) */
  levelCap?: number;
}

export function fight(stage: StageDef, classId: HeroClassId, smart: boolean, opts: FightOptions = {}): Result {
  const maxMoves = opts.maxMoves ?? 80;
  const cap = opts.levelCap ?? 50;
  const hero = { ...createInitialSaveState().heroes[classId], level: opts.level ?? Math.min(cap, stage.recommendedLevel) };
  if (opts.passives) {
    let pts = skillPointBudget(hero.level);
    const order = { offense: 0, magic: 1, common: 2, defense: 3 } as const;
    const nodes = [...HERO_CLASSES[classId].skillTree].sort((a, b) => order[a.branch] - order[b.branch] || a.tier - b.tier);
    const ranks: Record<string, number> = {};
    for (const n of nodes) {
      if (pts <= 0) break;
      const r = Math.min(n.maxRank, pts);
      ranks[n.id] = r;
      pts -= r;
    }
    hero.skillRanks = ranks;
  }
  if (opts.gear) {
    const slots: EquipmentSlot[] = ["helmet", "chest", "gloves", "pants", "boots", "weapon", "offhand", "necklace", "ring1", "ring2"];
    hero.equipped = { ...hero.equipped };
    for (const sl of slots) hero.equipped[sl] = generateEquipmentItem({ level: Math.min(cap, hero.level), rarity: opts.gear, slot: sl, preferredClass: classId });
  }
  const build = opts.tweakBuild ? opts.tweakBuild(computeHeroBuild(hero)) : computeHeroBuild(hero);
  const e = stage.enemy;
  const maxHp = build.stats.health;
  const rfx = computeRelicEffects(opts.relics ?? []);
  let hp = Math.min(maxHp, opts.startHp ?? maxHp), minHp = hp, shield = (opts.startShield ?? 0) + relicStartShield(rfx, maxHp), rage = 0, eHp = e.maxHp, eShield = 0;
  let counter = e.attackInterval, enraged = false;
  let grid = newGrid();
  const p = build.passives;
  const elemBoost = 1 + build.stats.elementalDamage / 100;
  let mana = Math.round(build.stats.mana * 0.25) + Math.round((build.stats.mana * p.startManaPct) / 100);
  let ulti = Math.min(100, Math.round((100 * p.startUltiPct) / 100));
  let frozen = 0, squareUsed = false;
  const cds: Record<string, number> = {};
  const loadout: ActiveSkillDef[] = opts.skills ? getSkillLoadout(classId, hero.level) : [];
  const ultiDef = HERO_CLASSES[classId].ultimateSkill;
  const atkNow = () => build.stats.attack * (1 + rage * 0.08);
  const skillAtk = () => atkNow() * elemBoost * (1 + p.skillPowerPct / 100);
  const heal = (n: number) => { hp = Math.min(maxHp, hp + Math.round(n)); };
  const addShield = (n: number) => { shield += Math.round(n); };

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
    ulti = Math.min(100, ulti + 4);
  };

  /** Bir tur harcayan yetenek: ilk uygun olanı seçer. Oyuncu politikası: Ulti > can düşükse iyileştirme > düşman saldırmak üzereyken dondurma > en yüksek hasar. */
  const trySkill = (): boolean => {
    if (!opts.skills) return false;
    if (ulti >= 100) {
      ulti = 0;
      const d = Math.round(skillAtk() * ultiDef.powerMultiplier);
      hit(d, "golden", true, true);
      if (classId === "warrior") { /* yakma: hesaba katılmaz */ }
      if (classId === "mage") frozen += 1;
      if (classId === "paladin") { heal(maxHp * 0.35); addShield(maxHp * 0.25); }
      return true;
    }
    const ready = loadout.filter((sk) => (cds[sk.id] ?? 0) <= 0 && mana >= sk.manaCost);
    if (ready.length === 0) return false;
    const healers = ready.filter((sk) => ["natures_blessing", "stone_bulwark", "holy_shield", "divine_heal"].includes(sk.effectType));
    if (hp < maxHp * 0.55 && healers.length) {
      const sk = healers[0];
      mana -= sk.manaCost; cds[sk.id] = sk.cooldown;
      if (sk.effectType === "natures_blessing") { heal(maxHp * sk.powerMultiplier); addShield(maxHp * 0.22); }
      else if (sk.effectType === "stone_bulwark") addShield(maxHp * sk.powerMultiplier);
      else if (sk.effectType === "holy_shield") { addShield(maxHp * sk.powerMultiplier); heal(maxHp * 0.12); }
      else { heal(maxHp * sk.powerMultiplier); addShield(maxHp * 0.3); }
      return true;
    }
    const dmgSkills = ready.filter((sk) => !["natures_blessing", "stone_bulwark", "holy_shield", "divine_heal"].includes(sk.effectType));
    if (dmgSkills.length === 0) return false;
    const freezers = dmgSkills.filter((sk) => ["ice_storm", "frost_lance"].includes(sk.effectType));
    const sk = counter <= 1 && freezers.length ? freezers[0] : dmgSkills.sort((a, b) => b.powerMultiplier - a.powerMultiplier)[0];
    mana -= sk.manaCost; cds[sk.id] = sk.cooldown;
    const raw = Math.round(skillAtk() * sk.powerMultiplier);
    const el = sk.element === "physical" ? "fire" : (sk.element as GemType);
    switch (sk.effectType) {
      case "ice_storm": frozen += 2; hit(raw, "frost"); break;
      case "frost_lance": frozen += 1; hit(raw, "frost", false, true); break;
      case "lightning_strike": case "thunder_chain": hit(raw, "lightning", true); break;
      case "arcane_explosion": hit(raw, "arcane", false, true); break;
      case "flame_rain": for (let i = 0; i < 5; i++) hit(Math.round(raw / 5 * 1.2), "fire", i === 4); break;
      case "multi_shot": for (let i = 0; i < 3; i++) hit(raw, "lightning", Math.random() < 0.5); break;
      case "shield_bash": counter += 1; hit(raw, "fire"); break;
      case "mana_surge": mana = Math.min(build.stats.mana, mana + Math.round(build.stats.mana * 0.6)); hit(raw, "frost"); break;
      default: hit(raw, el);
    }
    if (classId === "paladin") heal(maxHp * 0.05);
    return true;
  };

  for (let move = 1; move <= maxMoves; move++) {
    const castTurn = trySkill();
    if (castTurn && eHp <= 0) return { moves: move, hpLostPct: Math.round(100 * (maxHp - minHp) / maxHp), won: true, hpLeft: hp, maxHp };
    if (!castTurn) {
    const moves = findPossibleMoves(grid);
    if (moves.length === 0) grid = newGrid();
    const list = findPossibleMoves(grid);
    let pick = list[Math.floor(Math.random() * list.length)];
    if (smart) {
      let best = -1;
      for (const m of list) {
        const t = grid.map((r) => [...r]);
        [t[m.a.row][m.a.col], t[m.b.row][m.b.col]] = [t[m.b.row][m.b.col], t[m.a.row][m.a.col]];
        const fm = findMatches(t).matchedSet;
        let n = fm.size;
        if (opts.weakAware) fm.forEach((k) => { const [r, c] = k.split(",").map(Number); if (t[r][c]?.type === (e.weakness as GemType)) n += 0.45; });
        if (n > best) { best = n; pick = m; }
      }
    }
    [grid[pick.a.row][pick.a.col], grid[pick.b.row][pick.b.col]] = [grid[pick.b.row][pick.b.col], grid[pick.a.row][pick.a.col]];

    let combo = 0;
    let turnMatch = false;
    for (;;) {
      const { matchedSet, squares } = findMatches(grid);
      if (matchedSet.size === 0) break;
      combo++;
      if (!turnMatch) { turnMatch = true; ulti = Math.min(100, ulti + rfx.firstMatchUlti); } // Ulti Kıvılcımı: turun ilk eşleşmesi
      if (squares.length > 0 && !squareUsed && rfx.squareShieldPct > 0) { squareUsed = true; addShield(maxHp * rfx.squareShieldPct / 100); } // Kare Siper
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
      if (counts.frost) mana = Math.min(build.stats.mana, mana + Math.round(counts.frost * 5.2 * comboMult * (1 + (p.frostManaPct + p.gemBonuses.frost + (classId === "mage" ? 35 : 0)) / 100)));
      if (counts.frost) hit(Math.round(atk * 0.16 * counts.frost * elemBoost * comboMult), "frost");
      if (counts.nature) {
        hp = Math.min(maxHp, hp + Math.round(maxHp * 0.025 * counts.nature * comboMult * (1 + (p.natureHealPct + p.gemBonuses.nature) / 100) * (1 + p.natureHealOnlyPct / 100)));
        shield = Math.max(shield, capGemShield(shield + Math.round((16 + build.stats.defense * 0.9) * counts.nature * 0.55), maxHp));
      }
      if (counts.lightning) hit(Math.round(atk * 0.31 * counts.lightning * elemBoost * comboMult * (1 + (p.lightningCritPct + p.gemBonuses.lightning) / 100)), "lightning");
      if (counts.arcane) ulti = Math.min(100, ulti + Math.round(counts.arcane * 6.8 * (1 + (p.arcaneUltiPct + p.gemBonuses.arcane + (classId === "mage" ? 35 : 0)) / 100)));
      if (counts.arcane) hit(Math.round(atk * 0.28 * counts.arcane * elemBoost * comboMult), "arcane", false, true);
      if (counts.golden) {
        mana = Math.min(build.stats.mana, mana + 15 * counts.golden); ulti = Math.min(100, ulti + 14 * counts.golden);
        hp = Math.min(maxHp, hp + Math.round(maxHp * 0.05 * counts.golden));
        shield = Math.max(shield, capGemShield(shield + 35 * counts.golden, maxHp));
        hit(Math.round(atk * 0.55 * counts.golden * comboMult), "golden", true, true);
      }
      if (eHp <= 0) return { moves: move, hpLostPct: Math.round(100 * (maxHp - minHp) / maxHp), won: true, hpLeft: hp, maxHp };
      collapse(grid);
    }

    }
    for (const k of Object.keys(cds)) if (cds[k] > 0) cds[k]--;
    if (frozen > 0) { frozen--; } else {
    counter--;
    if (counter <= 0) {
      if (Math.random() * 100 >= build.stats.dodge) {
        let raw = e.attack * (enraged ? 1.32 : 1);
        if (e.isBoss && Math.random() < 0.45) raw *= 1.25;
        let d = enemyHitDamage({ rawAtk: raw, enemyAttack: e.attack, defense: build.stats.defense, enemyLevel: e.level, isBoss: e.isBoss, heroMaxHp: maxHp });
        const ab = Math.min(shield, d); shield -= ab; d -= ab;
        hp = Math.max(0, hp - d);
        minHp = Math.min(minHp, hp);
      }
      counter = enraged ? Math.max(1, e.attackInterval - 1) : e.attackInterval;
    }
    }
    if (!enraged && e.isBoss && eHp / e.maxHp < 0.4) enraged = true;
    if (hp <= 0) return { moves: move, hpLostPct: 100, won: false, hpLeft: 0, maxHp };
  }
  return { moves: maxMoves, hpLostPct: Math.round(100 * (maxHp - minHp) / maxHp), won: false, hpLeft: hp, maxHp };
}

