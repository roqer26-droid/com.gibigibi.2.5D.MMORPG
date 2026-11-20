/**
 * Zindan dengesi: üç savaşı can taşıma + iyileşme + rastgele güç seçimleriyle simüle eder.
 * Yetenekler ve zindan güçlerinin savaş içi etkileri dahildir (bkz. scripts/lib/battleSim.ts, basit oyuncu politikası).
 * Kullanım: npx vite-node scripts/simulate-dungeon.ts [seviyeler "6,10,15"] [oyun sayısı] [mod: new|legacy] [skills: 1|0] [scaling JSON]
 *   scaling JSON örn. {"hpExponent":0.75,"attackExponent":0.5}
 * Ekipman: her sınıf kendi başlangıç ekipmanıyla (aynı kalite); düşman değerleri deneme başında seviyeden hesaplanır.
 */
import { HERO_CLASSES } from "../src/data/classes";
import {
  applyRelicsToBuild,
  computeDungeonEnemies,
  drawRelicOffer,
  dungeonBattleStage,
  getDungeon,
  legacyDungeonEnemies,
} from "../src/data/dungeons";
import type { HeroClassId, RelicId } from "../src/types/game";
import { fight } from "./lib/battleSim";

const baseDef = getDungeon("roots_vault");
const levels = (process.argv[2] ?? "6").split(",").map(Number);
const runs = Number(process.argv[3] ?? 200);
const mode = process.argv[4] ?? "new";
const useSkills = (process.argv[5] ?? "1") === "1";
const scaling = process.argv[6] ? { ...baseDef.scaling, ...JSON.parse(process.argv[6]) } : baseDef.scaling;
const def = { ...baseDef, scaling };
const CLASSES: HeroClassId[] = ["warrior", "paladin", "ranger", "mage"];

function runOnce(classId: HeroClassId, level: number, smart: boolean) {
  const enemies = mode === "legacy" ? legacyDungeonEnemies(def) : computeDungeonEnemies(def, level);
  let hp: number | undefined;
  const relics: RelicId[] = [];
  const hpAfter: number[] = [];
  for (let i = 0; i < def.battles.length; i++) {
    const stage = dungeonBattleStage(def, i, { enemies });
    const r = fight(stage, classId, smart, {
      level,
      startHp: hp,
      maxMoves: 120,
      skills: useSkills,
      relics: [...relics],
      tweakBuild: (b) => applyRelicsToBuild(b, relics),
    });
    if (!r.won) return { won: false, reached: i, hpAfter };
    hpAfter.push(Math.round((100 * r.hpLeft) / r.maxHp));
    const heal = i < def.healAfterBattles ? Math.round((r.maxHp * def.healPctOfMax) / 100) : 0;
    hp = Math.min(r.maxHp, r.hpLeft + heal);
    if (i < def.battles.length - 1) {
      const offer = drawRelicOffer(def, relics);
      relics.push(offer[Math.floor(Math.random() * offer.length)]);
    }
  }
  return { won: true, reached: 3, hpAfter };
}

console.log(`Köklerin Mahzeni · mod=${mode} · yetenek=${useSkills ? "açık" : "kapalı"} · ${runs} deneme/sınıf · ölçekleme ${JSON.stringify({ h: scaling.hpExponent, a: scaling.attackExponent })}`);
for (const level of levels) {
  const e = mode === "legacy" ? legacyDungeonEnemies(def) : computeDungeonEnemies(def, level);
  console.log(`\n== Seviye ${level} · düşmanlar (can/saldırı): ${e.map((x) => `${x.hp}/${x.attack}`).join("  ")}`);
  for (const smart of [false, true]) {
    for (const c of CLASSES) {
      const res = Array.from({ length: runs }, () => runOnce(c, level, smart));
      const wins = res.filter((r) => r.won).length;
      const fail = [0, 1, 2].map((i) => Math.round((100 * res.filter((r) => !r.won && r.reached === i).length) / runs));
      const reach = [0, 1, 2].map((i) => res.filter((r) => r.hpAfter.length > i).length);
      const avgHp = [0, 1, 2].map((i) => {
        const xs = res.filter((r) => r.hpAfter.length > i).map((r) => r.hpAfter[i]);
        return xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0;
      });
      void reach;
      console.log(
        `  ${smart ? "iyi " : "ort."} ${HERO_CLASSES[c].name.padEnd(9)} kazanma %${String(Math.round((100 * wins) / runs)).padStart(3)}  savaşta elenen% [1,2,3]: ${JSON.stringify(fail)}  savaş sonu ort. can% [1,2,3]: ${JSON.stringify(avgHp)}`
      );
    }
  }
}
