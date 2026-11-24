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
 * Güç tabanı (v1.89.0, v1.90.0'da hedefler yükseltildi). Referans kahraman: aşamanın önerilen seviyesinde, seviyeye uygun tam set
 * (36. seviyeden itibaren tam efsanevi), pasif puanları dağıtılmış, iyi hamle seçen oyuncu (en büyük eşleşme, 4-5'li ve özel taş
 * öncelikli, Ulti dolunca Ulti). Hamle başına ortalama hasar gerçek oyunda (BattleScene) Savaşçı/Büyücü/Korucu ile 1–130.
 * seviyelerde ölçüldü (sınıf ortalaması). 16. seviyeye kadar ölçüm tablosu (log-log ara değer), sonrasında
 * REF_DPM_COEF × seviye^REF_DPM_EXP (36 → ~58.000, 64 → ~150.000, 100 → ~310.000; bkz. CHANGELOG v1.89.0 / v1.90.0).
 */
export const REF_DPM_LOW: ReadonlyArray<readonly [number, number]> = [
  [1, 950], [3, 1450], [5, 2100], [7, 2850], [10, 4400], [12, 6200], [16, 15400],
];
export const REF_DPM_COEF = 163;
export const REF_DPM_EXP = 1.64;

/** Tek ayar tablosu: referans kahramanın aşamayı bitirmesi hedeflenen ortalama hamle sayısı. */
export const WORLD_TARGET_MOVES: Readonly<Record<StageType, number>> = { normal: 10, treasure: 10, elite: 20, boss: 25 };

/**
 * Bu tür savaşlarda hamle başına hasarın normal düşmana göre oranı, önerilen seviyeye göre (gerçek savaş ölçümü, v1.90.0).
 * Erken bosslar can/kalkan fazları yüzünden yavaş biter (çarpan < 1); boss/elit hasar pasifleri ve Ulti açıldıkça
 * (yaklaşık 16. seviyeden sonra) bu savaşlarda hamle başına hasar normalden belirgin yüksektir. Taban bununla çarpılır ki
 * hedef hamle tutsun. Ara seviyelerde doğrusal ara değer; tablonun dışında uç değer.
 */
export const TYPE_DAMAGE_FACTOR: Readonly<Record<StageType, ReadonlyArray<readonly [number, number]>>> = {
  normal: [[1, 1], [24, 1], [36, 1.7], [52, 1.3], [64, 0.9], [100, 1]],
  treasure: [[1, 1], [24, 1], [36, 1.7], [52, 1.3], [64, 0.9], [100, 1]],
  elite: [[1, 1.05], [8, 1.05], [16, 1.3], [36, 1.65], [64, 1.1]],
  boss: [[1, 0.75], [5, 0.75], [8, 0.8], [16, 1.6], [36, 1.5], [100, 1.2]],
};

/** Türün önerilen seviyedeki hasar çarpanı. */
export function typeDamageFactor(type: StageType, level: number): number {
  const t = TYPE_DAMAGE_FACTOR[type];
  if (level <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++) {
    if (level <= t[i][0]) {
      const [x0, y0] = t[i - 1];
      const [x1, y1] = t[i];
      return y0 + ((y1 - y0) * (level - x0)) / (x1 - x0);
    }
  }
  return t[t.length - 1][1];
}

/** Referans kahramanın hamle başına ortalama hasarı (önerilen seviyede). */
export function referenceDamagePerMove(level: number): number {
  const L = Math.max(1, level);
  const t = REF_DPM_LOW;
  const last = t[t.length - 1];
  if (L >= last[0]) return REF_DPM_COEF * Math.pow(L, REF_DPM_EXP);
  for (let i = 1; i < t.length; i++) {
    if (L <= t[i][0]) {
      const [x0, y0] = t[i - 1];
      const [x1, y1] = t[i];
      const k = (Math.log(L) - Math.log(x0)) / (Math.log(x1) - Math.log(x0));
      return Math.exp(Math.log(y0) + k * (Math.log(y1) - Math.log(y0)));
    }
  }
  return t[0][1];
}

/** Güç tabanı: referans hasar × tür çarpanı × hedef hamle (yüzlere yuvarlanır). */
export function worldPowerFloorHp(type: StageType, recommendedLevel: number): number {
  return Math.round((referenceDamagePerMove(recommendedLevel) * typeDamageFactor(type, recommendedLevel) * WORLD_TARGET_MOVES[type]) / 100) * 100;
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
