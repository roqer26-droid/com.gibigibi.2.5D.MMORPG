/**
 * Zindan dengesi: üç savaşı can taşıma + iyileşme + rastgele güç seçimleriyle simüle eder (becerisiz, başlangıç ekipmanı).
 * Kullanım: npx vite-node scripts/simulate-dungeon.ts [seviye] [oyun sayısı]
 */
import { HERO_CLASSES } from "../src/data/classes";
import {
  applyRelicsToBuild,
  computeRelicEffects,
  drawRelicOffer,
  dungeonBattleStage,
  getDungeon,
  relicStartShield,
} from "../src/data/dungeons";
import type { HeroClassId, RelicId } from "../src/types/game";
import { fight } from "./lib/battleSim";

const baseDef = getDungeon("roots_vault");
// 3. argüman: çarpanları denemek için JSON, ör. [[1.5,2],[1.6,1.8],[1.7,1.6]] (hpMult, attackMult)
const mults: [number, number][] | null = process.argv[4] ? JSON.parse(process.argv[4]) : null;
const def = mults
  ? { ...baseDef, battles: baseDef.battles.map((b, i) => ({ ...b, hpMult: mults[i][0], attackMult: mults[i][1] })) }
  : baseDef;
const level = Number(process.argv[2] ?? 6);
const runs = Number(process.argv[3] ?? 150);
const CLASSES: HeroClassId[] = ["warrior", "mage", "ranger", "paladin"];

function runOnce(classId: HeroClassId, smart: boolean) {
  let hp: number | undefined;
  const relics: RelicId[] = [];
  const hpAfter: number[] = [];
  for (let i = 0; i < def.battles.length; i++) {
    const stage = dungeonBattleStage(def, i);
    const fx = computeRelicEffects(relics);
    const r = fight(stage, classId, smart, {
      level,
      startHp: hp,
      maxMoves: 120,
      tweakBuild: (b) => applyRelicsToBuild(b, relics),
      startShield: undefined,
    });
    // Hazır Muhafız kalkanı (max canın %10'u) fight içinde ayrı verilir
    if (fx.startShieldPct > 0 && r.won === false && false) hp = 0;
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

console.log(`Köklerin Mahzeni · seviye ${level} · ${runs} deneme/sınıf (beceri yok, başlangıç ekipmanı)`);
for (const smart of [false, true]) {
  console.log(smart ? "\niyi oyuncu:" : "\nortalama oyuncu:");
  for (const c of CLASSES) {
    const res = Array.from({ length: runs }, () => runOnce(c, smart));
    const wins = res.filter((r) => r.won).length;
    const fail = [0, 1, 2].map((i) => res.filter((r) => !r.won && r.reached === i).length);
    const avgHp = [0, 1, 2].map((i) => {
      const xs = res.filter((r) => r.hpAfter.length > i).map((r) => r.hpAfter[i]);
      return xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0;
    });
    console.log(
      `  ${HERO_CLASSES[c].name.padEnd(10)} kazanma %${Math.round((100 * wins) / runs)}  yenilen savaş [1,2,3]: ${JSON.stringify(fail)}  savaş sonu ort. can% [1,2,3]: ${JSON.stringify(avgHp)}`
    );
  }
}
void relicStartShield;
