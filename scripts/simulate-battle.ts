/**
 * Denge aracı: gerçek eşleşme modülü + savaş formülleriyle (becerisiz, çıplak başlangıç ekipmanı)
 * her aşamayı simüle eder. Kullanım:
 *   npx vite-node scripts/simulate-battle.ts [sınıf] [aşamaSayısı] [oyun sayısı]
 */
import { HERO_CLASSES } from "../src/data/classes";
import { WORLD_REGIONS } from "../src/data/world";
import type { HeroClassId, StageDef } from "../src/types/game";
import { fight } from "./lib/battleSim";

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
