/** Tam setli kahramanın aşama zorluğu: npx vite-node scripts/simulate-gear.ts [sınıf] [nadirlik] [oyun] [başlangıç] [bitiş] */
import { WORLD_REGIONS } from "../src/data/world";
import type { HeroClassId, Rarity } from "../src/types/game";
import { fight } from "./lib/battleSim";
const med = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const classId = (process.argv[2] ?? "warrior") as HeroClassId;
const gear = (process.argv[3] ?? "legendary") as Rarity | "none";
const runs = Number(process.argv[4] ?? 30);
const from = Number(process.argv[5] ?? 0), to = Number(process.argv[6] ?? 500);
const stages = WORLD_REGIONS.flatMap((r) => r.stages).slice(from, to);
console.log(`${classId} gear=${gear} runs=${runs}  (avg = rastgele hamle, good = en çok taş; beceri kullanımı açık)`);
console.log("idx", "aşama".padEnd(14), "tür".padEnd(8), "Sv", "düşCan".padStart(8), "| avg hamle/can%/kz | good hamle/can%/kz");
stages.forEach((s, i) => {
  if ((from + i) % 12 !== 0 && s.type !== "boss") return; if (s.type === "boss" && (from + i) % 4 !== 0) return;
  const o = { gear: gear === "none" ? undefined : gear, skills: true } as const;
  const r = (smart: boolean) => { const rs = Array.from({ length: runs }, () => fight(s, classId, smart, o)); return [med(rs.map((x) => x.moves)), med(rs.map((x) => x.hpLostPct)), Math.round(100 * rs.filter((x) => x.won).length / runs)]; };
  const a = r(false), g = r(true);
  console.log(String(from + i).padStart(3), s.id.padEnd(14), s.type.padEnd(8), String(s.recommendedLevel).padStart(2), String(s.enemy.maxHp).padStart(8), "|", a.join("/").padStart(11), "|", g.join("/"));
});
