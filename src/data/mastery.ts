import type { GameSaveState, GemType, MasterySave, Rarity, RegionDef, RegionId, StageDef, StageMastery } from '../types/game';
import { creditChestParts } from './companions';
import { generateEquipmentItem } from './items';
import { WORLD_REGIONS } from './world';

/**
 * Üç Yıldızlı Aşama Ustalığı.
 *  ★1: aşama zaferi (eski kayıtlarda tamamlanmış her aşama bunu zaten kazanmıştır)
 *  ★2 / ★3: iki ayrı savaş hedefi (hedef 1, hedef 2); farklı zaferlerde tamamlanabilir, yenilgide yıldız verilmez.
 * Bölge sandıkları, bölgede kazanılabilir toplam yıldızın %50 / %75 / %100'ünde açılır.
 */

export type ObjectiveKind =
  | 'squares' // savaşta N adet 2×2 kare çözümle
  | 'gem_turns' // N ayrı oyuncu turunda belirli taşı eşleştir
  | 'gem_burst' // tek turda (zincirler dahil) en az N belirli taş temizle
  | 'chain' // tek hamlede N adımlık zincirleme eşleşme
  | 'block_heavy' // planlanan ağır saldırıyı iptal et / kalkanla tamamen karşıla
  | 'clear_frozen'; // donmuş taş temizle

export type TrackedGem = Exclude<GemType, 'golden'>;

export interface ObjectiveDef {
  kind: ObjectiveKind;
  gem?: TrackedGem;
  count: number;
}

export const sq = (count: number): ObjectiveDef => ({ kind: 'squares', count });
export const gt = (gem: TrackedGem, count: number): ObjectiveDef => ({ kind: 'gem_turns', gem, count });
export const gb = (gem: TrackedGem, count: number): ObjectiveDef => ({ kind: 'gem_burst', gem, count });
export const ch = (count: number): ObjectiveDef => ({ kind: 'chain', count });
export const hv = (count = 1): ObjectiveDef => ({ kind: 'block_heavy', count });
export const fz = (count = 1): ObjectiveDef => ({ kind: 'clear_frozen', count });

const GEM_TR: Record<TrackedGem, string> = { fire: 'ateş', frost: 'buz', nature: 'doğa', lightning: 'yıldırım', arcane: 'arkan' };

export function objectiveText(o: ObjectiveDef): string {
  switch (o.kind) {
    case 'squares':
      return `Savaşta ${o.count} adet 2×2 kare oluştur`;
    case 'gem_turns':
      return `${o.count} ayrı turda ${GEM_TR[o.gem!]} taşı eşleştir`;
    case 'gem_burst':
      return `Tek turda en az ${o.count} ${GEM_TR[o.gem!]} taşı temizle`;
    case 'chain':
      return `Tek hamlede ${o.count} adımlık zincirleme eşleşme yap`;
    case 'block_heavy':
      return o.count === 1 ? 'Ağır saldırıyı bir kez engelle' : `Ağır saldırıyı ${o.count} kez engelle`;
    case 'clear_frozen':
      return o.count === 1 ? 'Savaşta bir donmuş taşı temizle' : `Savaşta ${o.count} donmuş taşı temizle`;
  }
}

/** Hedefin, düşman davranışına bağlı koşulu: bu koşul savaşta gerçekleşemiyorsa hedef o aşamaya konmaz. */
export type ObjectiveRequirement = 'heavy_attack' | 'frozen_tiles' | null;

export function objectiveRequirement(o: ObjectiveDef): ObjectiveRequirement {
  return o.kind === 'block_heavy' ? 'heavy_attack' : o.kind === 'clear_frozen' ? 'frozen_tiles' : null;
}

/** Savaş motorundaki gerçek davranışlar: boss'lar ağır saldırı planlar; yalnızca Buz Kraliçesi taş dondurur. */
export function enemySupports(enemy: { isBoss: boolean; bossId?: string }, req: ObjectiveRequirement): boolean {
  if (req === 'heavy_attack') return enemy.isBoss;
  if (req === 'frozen_tiles') return enemy.bossId === 'frost_queen';
  return true;
}

// ---------------------------------------------------------------------------
// Bölge varsayılanları (taş teması + düşman davranışı)
// ---------------------------------------------------------------------------

interface RegionObjectives {
  /** Hedef 1 (tüm aşamalarda) */
  a: ObjectiveDef;
  /** Hedef 2 varsayılanı */
  b: ObjectiveDef;
  /** Bu bölgenin boss aşamasında hedef 2 yerine kullanılır (ağır saldırı gerçekleşebildiği için) */
  bossB?: ObjectiveDef;
}

const R = (a: ObjectiveDef, b: ObjectiveDef, bossB?: ObjectiveDef): RegionObjectives => ({ a, b, bossB });

export const REGION_OBJECTIVES: Record<RegionId, RegionObjectives> = {
  forest: R(sq(2), gt('nature', 3)),
  mountains: R(gt('frost', 3), ch(2), hv()),
  volcano: R(gb('fire', 4), gt('fire', 3), hv()),
  ruins: R(sq(2), gt('arcane', 3)),
  abyss: R(gb('arcane', 4), ch(2), hv()),
  sky: R(gt('lightning', 3), sq(2)),
  ocean: R(gt('frost', 3), gb('frost', 4)),
  desert: R(gt('fire', 3), ch(2)),
  swamp: R(gt('nature', 3), gb('nature', 4)),
  moonlit: R(gt('arcane', 3), sq(2)),
  crystal_caves: R(sq(2), gt('frost', 3)),
  ashen: R(gb('fire', 4), ch(2), hv()),
  astral: R(gt('arcane', 3), ch(3)),
  spirit: R(sq(2), gt('nature', 3)),
  chaos: R(sq(2), ch(3), hv()),
  star_gate: R(gt('lightning', 3), sq(2)),
  time_rift: R(gb('arcane', 4), ch(2)),
  blood_moon: R(gt('fire', 3), gb('fire', 4)),
  iron_inferno: R(gb('fire', 4), sq(2), hv()),
  eternal_winter: R(gt('frost', 3), gb('frost', 4)),
  dreamscape: R(gt('arcane', 3), ch(2)),
  light_shadow: R(sq(2), gt('lightning', 3)),
  dragon_roost: R(gb('fire', 4), ch(3), hv()),
  gods_court: R(gt('lightning', 3), sq(2)),
  rebirth: R(gt('nature', 3), gb('nature', 4)),
  cosmic_storm: R(gb('lightning', 4), ch(3), hv()),
  immortality: R(sq(2), gt('nature', 3)),
  eternity: R(ch(3), sq(2), hv()),
  glass_forest: R(sq(2), ch(3)),
  silent_shore: R(gt('frost', 3), sq(2)),
  copper_mines: R(gt('fire', 3), gb('fire', 4)),
  mist_aqueduct: R(gt('frost', 3), ch(2)),
  thorn_citadel: R(gt('nature', 3), sq(2), hv()),
  amber_dunes: R(gt('fire', 3), ch(2)),
  sunken_archive: R(gt('arcane', 3), sq(2)),
  salt_bastion: R(sq(2), gb('nature', 4)),
  obsidian_harbor: R(gb('fire', 4), ch(2), hv()),
  black_tide: R(gt('frost', 3), gb('frost', 4), hv()),
  echo_terrace: R(gb('arcane', 4), ch(3)),
  mercury_foundry: R(gt('fire', 3), sq(2)),
  cinder_garden: R(gb('fire', 4), gt('nature', 3), hv()),
  prism_labyrinth: R(sq(2), gt('arcane', 3)),
  iron_orbit: R(gt('lightning', 3), ch(2), hv()),
  aurora_vault: R(gt('frost', 3), gb('frost', 4)),
  dream_marsh: R(gt('nature', 3), ch(2)),
  mirror_court: R(sq(2), ch(3)),
  midnight_observatory: R(gt('arcane', 3), gb('arcane', 4)),
  hollow_sun: R(gt('fire', 3), sq(2), hv()),
  comet_bridge: R(gt('frost', 3), ch(3)),
  rune_necropolis: R(gb('arcane', 4), sq(2), hv()),
  shattered_sky: R(gt('lightning', 3), gb('lightning', 4)),
  zero_threshold: R(ch(3), sq(2), hv()),
  dawn_core: R(gt('fire', 3), ch(3), hv()),
};

/** Aşamaya özel hedef 2 (boss'un özel davranışı): Buz Kraliçesi taş dondurur. */
const BOSS_OBJECTIVE_2: Record<string, ObjectiveDef> = {
  frost_queen: fz(),
};

export function stageObjectives(stage: StageDef, regionId: RegionId = stage.regionId): [ObjectiveDef, ObjectiveDef] {
  const r = REGION_OBJECTIVES[regionId];
  let second = r.b;
  if (stage.enemy.isBoss) {
    second = (stage.enemy.bossId && BOSS_OBJECTIVE_2[stage.enemy.bossId]) || r.bossB || r.b;
  }
  return [r.a, second];
}

const STAGE_OBJECTIVES = new Map<string, [ObjectiveDef, ObjectiveDef]>(
  WORLD_REGIONS.flatMap((region) => region.stages.map((st) => [st.id, stageObjectives(st)] as const))
);

export function getStageObjectives(stageId: string): [ObjectiveDef, ObjectiveDef] {
  return STAGE_OBJECTIVES.get(stageId) ?? [sq(2), ch(2)];
}

// ---------------------------------------------------------------------------
// Kayıt durumu
// ---------------------------------------------------------------------------

export const emptyMastery = (): MasterySave => ({ objectives: {}, chests: [] });

const STAGE_IDS = new Set(WORLD_REGIONS.flatMap((r) => r.stages.map((s) => s.id)));
const CHEST_TIERS = [0, 1, 2];

/** Bozuk/eski kayıttaki ustalık verisini güvenli hale getirir. */
export function sanitizeMastery(value: unknown): MasterySave {
  const out = emptyMastery();
  if (!value || typeof value !== 'object') return out;
  const v = value as { objectives?: unknown; chests?: unknown };
  if (v.objectives && typeof v.objectives === 'object') {
    for (const [id, m] of Object.entries(v.objectives as Record<string, unknown>)) {
      if (!STAGE_IDS.has(id) || !m || typeof m !== 'object') continue;
      const o1 = (m as StageMastery).o1 === true;
      const o2 = (m as StageMastery).o2 === true;
      if (o1 || o2) out.objectives[id] = { o1, o2 };
    }
  }
  if (Array.isArray(v.chests)) {
    const regionIds = new Set<string>(WORLD_REGIONS.map((r) => r.id));
    out.chests = Array.from(
      new Set(
        v.chests.filter((c): c is string => {
          if (typeof c !== 'string') return false;
          const [rid, tier] = c.split(':');
          return regionIds.has(rid) && CHEST_TIERS.includes(Number(tier));
        })
      )
    );
  }
  return out;
}

export interface StageStars {
  victory: boolean;
  o1: boolean;
  o2: boolean;
  count: number;
}

type MasteryView = Pick<GameSaveState, 'completedStages' | 'mastery'>;

/** Eski kayıtlarda tamamlanmış aşamalar zafer yıldızını zaten taşır. */
export function stageStars(save: MasteryView, stageId: string): StageStars {
  const victory = save.completedStages.includes(stageId);
  const m = save.mastery?.objectives[stageId];
  const o1 = !!m?.o1;
  const o2 = !!m?.o2;
  return { victory, o1, o2, count: Number(victory) + Number(o1) + Number(o2) };
}

/** Bölgede kazanılabilir toplam yıldız ve sandık eşikleri (%50 / %75 / %100, yukarı yuvarlanır). */
export function chestThresholds(maxStars: number): [number, number, number] {
  return [Math.ceil(maxStars * 0.5), Math.ceil(maxStars * 0.75), maxStars];
}

export interface ChestState {
  tier: 0 | 1 | 2;
  threshold: number;
  claimed: boolean;
  claimable: boolean;
}

export interface RegionMastery {
  stars: number;
  max: number;
  chests: ChestState[];
  /** Henüz ulaşılmamış sıradaki eşiğe kalan yıldız (hepsi ulaşıldıysa null) */
  toNextChest: number | null;
}

export function regionMastery(save: MasteryView & { mastery: MasterySave }, region: RegionDef): RegionMastery {
  const stars = region.stages.reduce((n, st) => n + stageStars(save, st.id).count, 0);
  const max = region.stages.length * 3;
  const th = chestThresholds(max);
  const chests = th.map((threshold, i) => {
    const claimed = save.mastery.chests.includes(`${region.id}:${i}`);
    return { tier: i as 0 | 1 | 2, threshold, claimed, claimable: !claimed && stars >= threshold };
  });
  const next = th.find((t) => stars < t);
  return { stars, max, chests, toNextChest: next === undefined ? null : next - stars };
}

export function totalMastery(save: MasteryView & { mastery: MasterySave }): { stars: number; max: number } {
  return WORLD_REGIONS.reduce(
    (acc, r) => {
      const m = regionMastery(save, r);
      return { stars: acc.stars + m.stars, max: acc.max + m.max };
    },
    { stars: 0, max: 0 }
  );
}

// ---------------------------------------------------------------------------
// Eylemler (saf; tek kayıt güncellemesi döndürür)
// ---------------------------------------------------------------------------

export interface MasteryOutcome {
  /** Bu zaferde yeni kazanılan yıldızlar */
  earned: { victory: boolean; o1: boolean; o2: boolean };
  /** Zafer sonrası aşamanın durumu */
  stars: StageStars;
  objectives: [ObjectiveDef, ObjectiveDef];
  regionStars: number;
  regionMax: number;
  /** Sıradaki sandığa kalan yıldız (hepsi ulaşıldıysa null) */
  toNextChest: number | null;
  claimableChests: number;
}

/**
 * Aşama zaferini ustalığa işler: ilk zafer yıldızı (aşama daha önce tamamlanmadıysa) ve savaşta tamamlanan hedefler.
 * Zaten kazanılmış yıldızlar tekrar verilmez. Çağıran aynı güncellemede `completedStages`'ı da yazmalıdır.
 */
export function applyStageMastery(
  save: GameSaveState,
  stage: StageDef,
  done: [boolean, boolean] | undefined
): { save: GameSaveState; outcome: MasteryOutcome } {
  const before = stageStars(save, stage.id);
  const o1 = !!done?.[0] && !before.o1;
  const o2 = !!done?.[1] && !before.o2;
  const earned = { victory: !before.victory, o1, o2 };
  const objectives =
    o1 || o2
      ? { ...save.mastery.objectives, [stage.id]: { o1: before.o1 || o1, o2: before.o2 || o2 } }
      : save.mastery.objectives;
  const next: GameSaveState = {
    ...save,
    mastery: objectives === save.mastery.objectives ? save.mastery : { ...save.mastery, objectives },
    completedStages: before.victory ? save.completedStages : [...save.completedStages, stage.id],
  };
  const region = WORLD_REGIONS.find((r) => r.id === stage.regionId)!;
  const rm = regionMastery(next, region);
  return {
    save: next,
    outcome: {
      earned,
      stars: stageStars(next, stage.id),
      objectives: getStageObjectives(stage.id),
      regionStars: rm.stars,
      regionMax: rm.max,
      toNextChest: rm.toNextChest,
      claimableChests: rm.chests.filter((c) => c.claimable).length,
    },
  };
}

// --- Sandık ödülleri ---------------------------------------------------------

const RARITY_LADDER: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
/** Sandık kademesi çarpanları: bölge bossunun aşama ödülüne (altın/kristal) göre. */
export const CHEST_REWARD_MULT = [0.6, 1, 1.6] as const;

function levelRarity(level: number): Rarity {
  return level >= 50 ? 'mythic' : level >= 33 ? 'legendary' : level >= 12 ? 'epic' : 'rare';
}

export interface ChestReward {
  gold: number;
  crystals: number;
  rarity: Rarity;
  level: number;
}

/**
 * Sandık ödülü bölgenin boss aşamasının mevcut ödül eğrisine bağlıdır: altın/kristal = boss ödülü × kademe çarpanı,
 * ekipman nadirliği = boss garanti nadirliğinden kademe başına bir basamak aşağı (en üst kademe bossla aynı).
 */
export function chestReward(region: RegionDef, tier: 0 | 1 | 2): ChestReward {
  const boss = region.stages[region.stages.length - 1];
  const mult = CHEST_REWARD_MULT[tier];
  const top = RARITY_LADDER.indexOf(boss.rewards.guaranteedRarity ?? levelRarity(boss.recommendedLevel));
  return {
    gold: Math.round(boss.rewards.gold * mult),
    crystals: Math.round(boss.rewards.crystals * mult),
    rarity: RARITY_LADDER[Math.max(1, top - (2 - tier))],
    level: Math.max(1, Math.min(boss.recommendedLevel, 50)),
  };
}

export interface ChestClaimResult {
  save: GameSaveState;
  ok: boolean;
  toast?: string;
  reward?: ChestReward & { itemName: string };
}

/** Sandığı açar: yıldız eşiği, tek seferlik alım; ödül ve "alındı" bilgisi aynı kayıt güncellemesinde yazılır. */
export function claimMasteryChest(save: GameSaveState, regionId: RegionId, tier: 0 | 1 | 2): ChestClaimResult {
  const region = WORLD_REGIONS.find((r) => r.id === regionId);
  if (!region) return { save, ok: false, toast: 'Bölge bulunamadı.' };
  const key = `${regionId}:${tier}`;
  if (save.mastery.chests.includes(key)) return { save, ok: false, toast: 'Bu sandık zaten alındı.' };
  const rm = regionMastery(save, region);
  if (rm.stars < rm.chests[tier].threshold) {
    return { save, ok: false, toast: `Sandık için ${rm.chests[tier].threshold - rm.stars} yıldız daha gerekli.` };
  }
  const reward = chestReward(region, tier);
  const item = generateEquipmentItem({ level: reward.level, rarity: reward.rarity, preferredClass: save.activeHeroClass });
  const claimed: GameSaveState = {
    ...save,
    gold: save.gold + reward.gold,
    crystals: save.crystals + reward.crystals,
    inventory: [...save.inventory, item],
    mastery: { ...save.mastery, chests: [...save.mastery.chests, key] },
  };
  // Yoldaş parça payı (ikinci / üçüncü sandık) aynı kayıt güncellemesinde yazılır
  const credited = creditChestParts(claimed, regionId, tier);
  const partsText = credited.gain ? `, +${credited.gain.parts} ${credited.gain.partName}` : '';
  return {
    save: credited.save,
    ok: true,
    reward: { ...reward, itemName: item.name },
    toast: `${region.name} sandığı açıldı: +${reward.gold.toLocaleString('tr-TR')} altın, +${reward.crystals} kristal, ${item.name}${partsText}`,
  };
}
