/**
 * Dünya Haritası düşman canı artışı (yalnızca Dünya Haritası aşama savaşları; Seçimli Zindan, Lig ve Boss Avı kendi ayarlarını
 * kullanır). Sıra, haritanın gerçek aşama sırasıdır (ilk aşama 1; bölge değişince devam eder). Yüzde, aşağıdaki tablodaki
 * aralıklarda doğrusal hesaplanır; son aralıktan sonra son değerde kalır. Yeni can = temel can × (1 + yüzde/100), en sonda yuvarlanır.
 * Düşmanın saldırısı, saldırı sıklığı, savunması ve ödüller değişmez.
 */
import { WORLD_REGIONS } from './world';
import type { StageDef } from '../types/game';

/** Tek ayar tablosu: [ilk aşama, son aşama, başlangıç %, bitiş %] */
export const WORLD_HP_BONUS_TABLE: ReadonlyArray<{ from: number; to: number; startPct: number; endPct: number }> = [
  { from: 1, to: 10, startPct: 0, endPct: 10 },
  { from: 11, to: 20, startPct: 10, endPct: 20 },
  { from: 21, to: 50, startPct: 20, endPct: 50 },
];

/**
 * Tek tek aşama düzeltmeleri (yeni canla gereğinden uzun süren aşamalar için; çarpan, tablo artışından sonra uygulanır).
 * Boş: denge ölçümlerinde düzeltme gerektiren aşama çıkmadı (bkz. CHANGELOG v1.88.0).
 */
export const WORLD_HP_STAGE_ADJUST: Readonly<Record<string, number>> = {};

const ROUTE: StageDef[] = WORLD_REGIONS.flatMap((r) => r.stages);
const BY_ID = new Map(ROUTE.map((s, i) => [s.id, { stage: s, order: i + 1 }]));

/** Haritadaki gerçek sıra (1 tabanlı); bilinmeyen aşamada 0. */
export const worldStageOrder = (stageId: string): number => BY_ID.get(stageId)?.order ?? 0;

/** Sıradaki aşamanın can artışı yüzdesi (ara değerler yuvarlanmaz). */
export function worldHpBonusPct(order: number): number {
  if (!(order >= 1)) return 0;
  for (const seg of WORLD_HP_BONUS_TABLE) {
    if (order >= seg.from && order <= seg.to) {
      const span = seg.to - seg.from;
      return span > 0 ? seg.startPct + ((seg.endPct - seg.startPct) * (order - seg.from)) / span : seg.endPct;
    }
  }
  const last = WORLD_HP_BONUS_TABLE[WORLD_HP_BONUS_TABLE.length - 1];
  return order > last.to ? last.endPct : 0;
}

/** Dünya Haritası savaşında düşmanın en yüksek canı (temel can × artış × varsa aşama düzeltmesi, en sonda yuvarlanır). */
export function worldEnemyMaxHp(stageId: string, baseMaxHp: number): number {
  const pct = worldHpBonusPct(worldStageOrder(stageId));
  return Math.round(baseMaxHp * (1 + pct / 100) * (WORLD_HP_STAGE_ADJUST[stageId] ?? 1));
}

/**
 * Dünya Haritası savaşı için aşama: her zaman veri tablosundaki temel aşamadan türetilir, bu yüzden aynı aşama tekrar
 * oynandığında (ya da türetilmiş aşama yeniden verildiğinde) artış bir kez uygulanır. Dünya rotasında olmayan aşama değişmez.
 */
export function worldBattleStage(stage: StageDef): StageDef {
  const base = BY_ID.get(stage.id)?.stage;
  if (!base) return stage;
  const maxHp = worldEnemyMaxHp(base.id, base.enemy.maxHp);
  return maxHp === base.enemy.maxHp ? base : { ...base, enemy: { ...base.enemy, maxHp } };
}
