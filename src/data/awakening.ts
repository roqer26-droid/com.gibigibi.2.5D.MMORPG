/**
 * Kahraman Uyanışı: her kahraman için bağımsız 5 kademe (0 = uyanmamış). Malzemeler ortak envanterdedir.
 * Kademe bonusları TOPLAM değerdir (önceki kademeler üst üste eklenmez). Uyanış kesin başarılıdır; seviye, ekipman, kostüm ve
 * yetenek puanları korunur. Boss canları uyanışa göre değişmez.
 */
import { WORLD_REGIONS } from './world';
import type { GameSaveState, HeroClassId, StageDef } from '../types/game';

export const AWAKEN_MAX_TIER = 5;
/** Uyanış için gereken kahraman seviyesi (oyunun seviye sınırı) */
export const AWAKEN_LEVEL_REQ = 50;

export type AwakenMaterialId = 'awakenShard' | 'soulCrystal' | 'divineEssence';
export type AwakenMaterials = Record<AwakenMaterialId, number>;

export const emptyMaterials = (): AwakenMaterials => ({ awakenShard: 0, soulCrystal: 0, divineEssence: 0 });

export function sanitizeMaterials(value: unknown): AwakenMaterials {
  const v = (value && typeof value === 'object' ? value : {}) as Partial<Record<AwakenMaterialId, unknown>>;
  const n = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) && x > 0 ? Math.min(999999, Math.floor(x)) : 0);
  return { awakenShard: n(v.awakenShard), soulCrystal: n(v.soulCrystal), divineEssence: n(v.divineEssence) };
}

export const sanitizeAwakening = (v: unknown): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(AWAKEN_MAX_TIER, Math.floor(v))) : 0;

export interface AwakenBonuses {
  hpPct: number;
  atkPct: number;
  defPct: number;
  /** Taş eşleşmelerinden mana kazanımı */
  manaPct: number;
  /** Taş eşleşmelerinden ulti kazanımı */
  ultiPct: number;
}

export interface AwakenCost {
  awakenShard: number;
  soulCrystal: number;
  divineEssence: number;
  gold: number;
}

export interface AwakenTierDef {
  tier: number;
  name: string;
  roman: string;
  /** Aura rengi (CSS) */
  color: string;
  /** İkincil (parlama) rengi */
  glow: string;
  bonuses: AwakenBonuses;
  cost: AwakenCost;
  /** Dünya rotasında tamamlanması gereken aşama sırası (1 tabanlı) */
  stageOrder: number;
}

export const AWAKEN_TIERS: readonly AwakenTierDef[] = [
  { tier: 1, name: 'Uyanmış', roman: 'I', color: '#2dd4bf', glow: '#99f6e4', stageOrder: 50, bonuses: { hpPct: 3, atkPct: 2, defPct: 2, manaPct: 0, ultiPct: 0 }, cost: { awakenShard: 25, soulCrystal: 0, divineEssence: 0, gold: 25000 } },
  { tier: 2, name: 'Yükselmiş', roman: 'II', color: '#3b82f6', glow: '#93c5fd', stageOrder: 100, bonuses: { hpPct: 6, atkPct: 4, defPct: 4, manaPct: 3, ultiPct: 0 }, cost: { awakenShard: 50, soulCrystal: 5, divineEssence: 0, gold: 75000 } },
  { tier: 3, name: 'Aşkın', roman: 'III', color: '#a855f7', glow: '#d8b4fe', stageOrder: 200, bonuses: { hpPct: 10, atkPct: 7, defPct: 6, manaPct: 5, ultiPct: 3 }, cost: { awakenShard: 100, soulCrystal: 15, divineEssence: 0, gold: 150000 } },
  { tier: 4, name: 'Efsanevi', roman: 'IV', color: '#f59e0b', glow: '#fde68a', stageOrder: 350, bonuses: { hpPct: 15, atkPct: 10, defPct: 9, manaPct: 7, ultiPct: 5 }, cost: { awakenShard: 175, soulCrystal: 30, divineEssence: 5, gold: 300000 } },
  { tier: 5, name: 'İlahi', roman: 'V', color: '#fef3c7', glow: '#fbbf24', stageOrder: 500, bonuses: { hpPct: 20, atkPct: 15, defPct: 12, manaPct: 10, ultiPct: 8 }, cost: { awakenShard: 250, soulCrystal: 50, divineEssence: 15, gold: 500000 } },
];

const NO_BONUS: AwakenBonuses = { hpPct: 0, atkPct: 0, defPct: 0, manaPct: 0, ultiPct: 0 };

/** Kademenin toplam bonusu (0 → bonus yok). */
export function awakenBonuses(tier: number | undefined): AwakenBonuses {
  const t = sanitizeAwakening(tier);
  return t > 0 ? AWAKEN_TIERS[t - 1].bonuses : NO_BONUS;
}

export const awakenTierDef = (tier: number): AwakenTierDef | null => AWAKEN_TIERS[tier - 1] ?? null;

// --- Boss koşulları (gerçek dünya rotası) ---------------------------------------------

const ROUTE: StageDef[] = WORLD_REGIONS.flatMap((r) => r.stages);

export interface AwakenBossReq {
  stageId: string;
  stageName: string;
  bossName: string;
  bossId: string;
  regionName: string;
  order: number;
}

/** Eşik aşamasında (ya da öncesindeki en yakın) dünya haritası bossu: eşik aşamasına ulaşmak için yenilmiş olmalıdır. */
export function bossForStageOrder(order: number): AwakenBossReq {
  for (let i = Math.min(order, ROUTE.length) - 1; i >= 0; i--) {
    const s = ROUTE[i];
    if (s.enemy.isBoss && s.enemy.bossId) {
      const region = WORLD_REGIONS.find((r) => r.id === s.regionId)!;
      return { stageId: s.id, stageName: s.name, bossName: s.enemy.name, bossId: s.enemy.bossId, regionName: region.name, order: i + 1 };
    }
  }
  throw new Error(`boss yok: ${order}`);
}

export const stageAtOrder = (order: number): StageDef => ROUTE[order - 1];

// --- Malzemeler ve düşme ---------------------------------------------------------------------

export interface MaterialMeta {
  id: AwakenMaterialId;
  name: string;
  short: string;
  color: string;
  description: string;
  sources: string[];
}

/**
 * Düşme ayarları. Oranlar önerilen değerlerdir; adetler ekonomi analiziyle belirlendi (CHANGELOG v1.97.0): damla başına 1 adetle
 * 500 aşamanın ilk geçişi tek kahramanın tam uyanışının yalnızca ~%6'sını veriyordu. Bu adetlerle ilk geçiş her kademe eşiğine
 * yaklaşık olarak ulaştırır; aradaki fark elit / boss tekrarlarıyla kapanır.
 */
export const AWAKEN_DROPS = {
  shard: { fromOrder: 51, eliteChance: 0.15, bossChance: 0.3, elite: [8, 12] as [number, number], boss: [15, 25] as [number, number] },
  crystal: { fromOrder: 101, bossChance: 0.15, amount: [10, 16] as [number, number] },
  essence: { fromOrder: 201, bossChance: 0.05, amount: [10, 14] as [number, number] },
  /** Yüksek zorluklu Boss Avları: Kâbus kademesindeki her zafer %10 (bkz. huntScaling.ts, v1.99.0) */
  huntEssence: { chance: 0.1, amount: [10, 14] as [number, number] },
};

export const MATERIAL_META: Record<AwakenMaterialId, MaterialMeta> = {
  awakenShard: {
    id: 'awakenShard',
    name: 'Uyanış Parçası',
    short: 'Parça',
    color: '#2dd4bf',
    description: 'Kahraman Uyanışı’nın temel malzemesi.',
    sources: [`50. aşamadan sonraki elitler: %15 (${AWAKEN_DROPS.shard.elite.join('–')} adet)`, `50. aşamadan sonraki bosslar: %30 (${AWAKEN_DROPS.shard.boss.join('–')} adet)`, 'Sonsuzluk Kulesi: 25., 50., 75. ve 100. katların ilk zaferi'],
  },
  soulCrystal: {
    id: 'soulCrystal',
    name: 'Kadim Ruh Kristali',
    short: 'Kristal',
    color: '#a78bfa',
    description: 'Kademe II ve sonrası için gereken nadir kristal.',
    sources: [`100. aşamadan sonraki bosslar: %15 (${AWAKEN_DROPS.crystal.amount.join('–')} adet)`, 'Sonsuzluk Kulesi: 50., 75. ve 100. katların ilk zaferi'],
  },
  divineEssence: {
    id: 'divineEssence',
    name: 'İlahi Öz',
    short: 'Öz',
    color: '#fbbf24',
    description: 'Kademe IV ve V için gereken en nadir öz.',
    sources: [`200. aşamadan sonraki bosslar: %5 (${AWAKEN_DROPS.essence.amount.join('–')} adet)`, 'Boss Avları (Kâbus zorluğu): her zaferde %10 (10–14 adet)', 'Sonsuzluk Kulesi: 75. ve 100. katların ilk zaferi'],
  },
};

export const MATERIAL_IDS: AwakenMaterialId[] = ['awakenShard', 'soulCrystal', 'divineEssence'];

const roll = (rng: () => number, [lo, hi]: [number, number]) => lo + Math.floor(rng() * (hi - lo + 1));

/** Dünya Haritası zaferinden düşen uyanış malzemeleri (`order`: haritadaki gerçek sıra). */
export function rollAwakenDrop(stage: Pick<StageDef, 'type' | 'enemy'>, order: number, rng: () => number = Math.random): AwakenMaterials {
  const out = emptyMaterials();
  const boss = stage.enemy.isBoss;
  const D = AWAKEN_DROPS;
  if (order >= D.shard.fromOrder) {
    if (boss && rng() < D.shard.bossChance) out.awakenShard += roll(rng, D.shard.boss);
    else if (!boss && stage.type === 'elite' && rng() < D.shard.eliteChance) out.awakenShard += roll(rng, D.shard.elite);
  }
  if (boss && order >= D.crystal.fromOrder && rng() < D.crystal.bossChance) out.soulCrystal += roll(rng, D.crystal.amount);
  if (boss && order >= D.essence.fromOrder && rng() < D.essence.bossChance) out.divineEssence += roll(rng, D.essence.amount);
  return out;
}

export const hasAnyMaterial = (m: AwakenMaterials): boolean => m.awakenShard + m.soulCrystal + m.divineEssence > 0;
export const addMaterials = (a: AwakenMaterials, b: AwakenMaterials): AwakenMaterials => ({
  awakenShard: a.awakenShard + b.awakenShard,
  soulCrystal: a.soulCrystal + b.soulCrystal,
  divineEssence: a.divineEssence + b.divineEssence,
});

// --- Durum ve uyanış -----------------------------------------------------------------------

export interface AwakenRequirementRow {
  key: AwakenMaterialId | 'gold';
  label: string;
  need: number;
  have: number;
  ok: boolean;
}

export interface AwakenStatus {
  tier: number;
  maxed: boolean;
  next: AwakenTierDef | null;
  levelOk: boolean;
  materials: AwakenRequirementRow[];
  boss: (AwakenBossReq & { ok: boolean }) | null;
  stageOk: boolean;
  canAwaken: boolean;
  /** Eksik şartların kısa açıklaması (düğme / bildirim için) */
  blockers: string[];
}

type AwakenSave = Pick<GameSaveState, 'heroes' | 'gold' | 'completedStages' | 'heroUnlocks'> & { materials?: AwakenMaterials };

export function awakenStatus(save: AwakenSave, heroId: HeroClassId): AwakenStatus {
  const hero = save.heroes[heroId];
  const tier = sanitizeAwakening(hero?.awakening);
  const next = awakenTierDef(tier + 1);
  const levelOk = (hero?.level ?? 0) >= AWAKEN_LEVEL_REQ;
  if (!next) return { tier, maxed: true, next: null, levelOk, materials: [], boss: null, stageOk: true, canAwaken: false, blockers: [] };
  const mats = save.materials ?? emptyMaterials();
  const rows: AwakenRequirementRow[] = MATERIAL_IDS.filter((id) => next.cost[id] > 0).map((id) => ({
    key: id,
    label: MATERIAL_META[id].name,
    need: next.cost[id],
    have: mats[id],
    ok: mats[id] >= next.cost[id],
  }));
  rows.push({ key: 'gold', label: 'Altın', need: next.cost.gold, have: save.gold, ok: save.gold >= next.cost.gold });
  const bossReq = bossForStageOrder(next.stageOrder);
  const threshold = stageAtOrder(next.stageOrder);
  const stageOk = save.completedStages.includes(threshold.id);
  const bossOk = save.completedStages.includes(bossReq.stageId);
  const unlocked = save.heroUnlocks.includes(heroId);
  const blockers: string[] = [];
  if (!unlocked) blockers.push('Kahraman kilitli');
  if (!levelOk) blockers.push(`Seviye ${AWAKEN_LEVEL_REQ} gerekli`);
  if (!stageOk) blockers.push(`${next.stageOrder}. aşamayı tamamla`);
  if (!bossOk) blockers.push(`${bossReq.bossName} yenilmeli`);
  for (const r of rows) if (!r.ok) blockers.push(`${r.need - r.have} ${r.label} eksik`);
  return {
    tier,
    maxed: false,
    next,
    levelOk,
    materials: rows,
    boss: { ...bossReq, ok: bossOk },
    stageOk,
    canAwaken: blockers.length === 0,
    blockers,
  };
}

export interface AwakenResult {
  save: GameSaveState;
  ok: boolean;
  toast: string;
  tier?: number;
}

/**
 * Uyanışı gerçekleştirir. `expectedTier`: dokunulduğu andaki kademe — hızlı çift dokunmada ikinci istek reddedilir
 * (malzeme yetse bile bir sonraki kademe kendiliğinden açılmaz). Şartlar eksikse kayıt hiç değişmez.
 */
export function performAwakening(save: GameSaveState, heroId: HeroClassId, expectedTier: number): AwakenResult {
  const st = awakenStatus(save, heroId);
  if (st.tier !== expectedTier) return { save, ok: false, toast: 'Uyanış zaten gerçekleşti.' };
  if (st.maxed || !st.next) return { save, ok: false, toast: 'Maksimum uyanış.' };
  if (!st.canAwaken) return { save, ok: false, toast: st.blockers[0] ?? 'Şartlar sağlanmadı.' };
  const c = st.next.cost;
  const mats = save.materials ?? emptyMaterials();
  const hero = save.heroes[heroId];
  return {
    save: {
      ...save,
      gold: save.gold - c.gold,
      materials: {
        awakenShard: mats.awakenShard - c.awakenShard,
        soulCrystal: mats.soulCrystal - c.soulCrystal,
        divineEssence: mats.divineEssence - c.divineEssence,
      },
      heroes: { ...save.heroes, [heroId]: { ...hero, awakening: st.next.tier } },
    },
    ok: true,
    toast: `Kademe ${st.next.roman} — ${st.next.name}!`,
    tier: st.next.tier,
  };
}

/** Kahraman kartı bildirimi: uyanış şu an gerçekleştirilebilir mi. */
export const canAwakenNow = (save: AwakenSave, heroId: HeroClassId): boolean => awakenStatus(save, heroId).canAwaken;
