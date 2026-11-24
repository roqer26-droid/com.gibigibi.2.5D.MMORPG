/**
 * Dünya Haritası can artışı karşılaştırması: eski (temel) ve yeni (artırılmış) düşman canıyla kazanma süresi (oyuncu hamlesi).
 * Önerilen seviye (üst sınır yok), seviyeye uygun tam set ekipman, seviyeye göre dağıtılmış pasif puanları,
 * yetenekler/Ulti açık, zayıflığı tercih eden iyi oyuncu.
 *   npx vite-node scripts/simulate-world-hp.ts [oyun sayısı] [sınıflar,virgülle]
 */
import { WORLD_REGIONS } from "../src/data/world";
import { worldBattleStage, worldHpBonusPct, worldStageOrder } from "../src/data/stageHpScaling";
import type { HeroClassId, Rarity, StageDef } from "../src/types/game";
import { fight } from "./lib/battleSim";

const median = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
/** Bölgeye uygun ekipman nadirliği (önerilen seviyeye göre; temkinli: 36+ efsanevi, mitik varsayılmaz) */
export const gearFor = (lvl: number): Rarity => (lvl < 6 ? "common" : lvl < 14 ? "uncommon" : lvl < 24 ? "rare" : lvl < 36 ? "epic" : "legendary");

const runs = Number(process.argv[2] ?? 40);
const classes = (process.argv[3] ?? "warrior,mage,ranger").split(",") as HeroClassId[];
const ROUTE = WORLD_REGIONS.flatMap((r) => r.stages);
const picks = (process.argv[4] ?? "1,5,8,10,13,16,20,21,24,28,32,40,48,49,50,56,64,80,120,200,300,500").split(",").map(Number);

const run = (st: StageDef, c: HeroClassId) => {
  const rs = Array.from({ length: runs }, () => fight(st, c, true, { gear: gearFor(st.recommendedLevel), skills: true, weakAware: true, passives: true, levelCap: 999, maxMoves: 120 }));
  return { m: median(rs.map((r) => r.moves)), w: Math.round((100 * rs.filter((r) => r.won).length) / runs), hp: median(rs.map((r) => r.hpLostPct)) };
};

console.log(`${runs} oyun/aşama, sınıflar: ${classes.join(", ")} — hamle = medyan (eski → yeni), kazanma %, can kaybı % (yeni)`);
console.log("sıra aşama            tür     Sv    eskiCan    yeniCan   artış | " + classes.map((c) => c.padEnd(22)).join("| "));
for (const o of picks) {
  const st = ROUTE[o - 1];
  if (!st) continue;
  const nw = worldBattleStage(st);
  const cells = classes.map((c) => {
    const a = run(st, c), b = run(nw, c);
    return `${String(a.m).padStart(3)} → ${String(b.m).padStart(3)}  ${String(b.w).padStart(3)}% ${String(b.hp).padStart(3)}%`.padEnd(22);
  });
  console.log(
    String(worldStageOrder(st.id)).padStart(4), st.id.padEnd(16), st.type.padEnd(8), String(st.recommendedLevel).padStart(3),
    String(st.enemy.maxHp).padStart(10), String(nw.enemy.maxHp).padStart(10), `%${worldHpBonusPct(o).toFixed(1)}`.padStart(7), "|", cells.join("| ")
  );
}
