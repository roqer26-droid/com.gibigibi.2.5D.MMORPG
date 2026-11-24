/**
 * Dünya Haritası düşman canı artışı (yalnızca Dünya Haritası aşama savaşları; Seçimli Zindan, Lig ve Boss Avı kendi ayarlarını
 * kullanır). Sıra, haritanın gerçek aşama sırasıdır (ilk aşama 1; bölge değişince devam eder). Yüzde, aşağıdaki tablodaki
 * aralıklarda doğrusal hesaplanır; son aralıktan sonra son değerde kalır. Yeni can = temel can × (1 + yüzde/100), en sonda yuvarlanır.
 * Düşmanın saldırısı, saldırı sıklığı, savunması ve ödüller değişmez.
 */
import { WORLD_REGIONS } from './world';
import type { StageDef, StageType } from '../types/game';

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

/**
 * Güç tabanı (v1.89.0). Referans kahraman: aşamanın önerilen seviyesinde, seviyeye uygun tam set (36. seviyeden itibaren
 * tam efsanevi), pasif puanları dağıtılmış, iyi hamle seçen oyuncu (en büyük eşleşme, 4-5'li ve özel taş öncelikli, Ulti dolunca Ulti).
 * Hamle başına ortalama hasar gerçek oyunda (BattleScene) Savaşçı/Büyücü/Korucu ile 8–130. seviyelerde ölçüldü ve
 * REF_DPM_COEF × seviye^REF_DPM_EXP ile uyumlu çıktı (36 → ~58.000, 64 → ~150.000, 100 → ~310.000; bkz. CHANGELOG v1.89.0).
 * Dünya Haritası düşmanının canı, bu hasarla aşama türünün hedef hamle sayısında bitmeyecek değerin altına inmez.
 */
export const REF_DPM_COEF = 163;
export const REF_DPM_EXP = 1.64;
/**
 * Referans hasarla hedeflenen ortalama hamle (zayıf hamle seçen ya da daha düşük ekipmanlı oyuncu için daha uzun).
 * Boss ve elitte daha yüksek: boss/elit hasar pasifleri ve Ulti (altın = her zaman zayıflık) bu savaşlarda hasarı belirgin artırır;
 * ölçümde 9 hamlelik boss hedefi 36. seviyede 3–5 hamlede bitiyordu.
 */
export const WORLD_TARGET_MOVES: Readonly<Record<StageType, number>> = { normal: 5, treasure: 5, elite: 8, boss: 12 };

/** Referans kahramanın hamle başına ortalama hasarı (önerilen seviyede). */
export const referenceDamagePerMove = (level: number): number => REF_DPM_COEF * Math.pow(Math.max(1, level), REF_DPM_EXP);

/**
 * Taban kademeli devreye girer: önerilen seviye 12 ve altında etkisiz (erken oyun mevcut ayarıyla kalır), 24 ve üstünde tam.
 * Ölçümler 8. seviyeden başlar; erken aşamalarda sorun gözlenmedi.
 */
export const POWER_FLOOR_BLEND = { fromLevel: 12, fullLevel: 24 } as const;

const smoothStep = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

/** Güç tabanı: referans hasar × hedef hamle × kademeli geçiş (yüzlere yuvarlanır). */
export function worldPowerFloorHp(type: StageType, recommendedLevel: number): number {
  const { fromLevel, fullLevel } = POWER_FLOOR_BLEND;
  const blend = smoothStep((recommendedLevel - fromLevel) / (fullLevel - fromLevel));
  return Math.round((referenceDamagePerMove(recommendedLevel) * WORLD_TARGET_MOVES[type] * blend) / 100) * 100;
}

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

/** Sıra yüzdesi uygulanmış can (temel can × artış, en sonda yuvarlanır). */
export function applyWorldHpBonus(order: number, baseMaxHp: number): number {
  return Math.round(baseMaxHp * (1 + worldHpBonusPct(order) / 100));
}

/**
 * Dünya Haritası savaşında düşmanın en yüksek canı: max(temel can × sıra artışı, güç tabanı) × varsa aşama düzeltmesi.
 * Bilinmeyen aşamada temel can değişmez.
 */
export function worldEnemyMaxHp(stageId: string, baseMaxHp: number): number {
  const entry = BY_ID.get(stageId);
  if (!entry) return baseMaxHp;
  const scaled = applyWorldHpBonus(entry.order, baseMaxHp);
  const floor = worldPowerFloorHp(entry.stage.type, entry.stage.recommendedLevel);
  return Math.round(Math.max(scaled, floor) * (WORLD_HP_STAGE_ADJUST[stageId] ?? 1));
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
