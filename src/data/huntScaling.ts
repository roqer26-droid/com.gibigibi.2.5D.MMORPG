/**
 * Boss Avları: zorluk kademeleri, kahraman gücüne göre ölçekleme ve her zaferde verilen tekrar ödülü.
 *
 * Av bossu hikâyedeki boss aşamasından (görsel, zayıflık, boss fazları, av kuralı) türetilir; canı ve saldırısı ise ava giren
 * kahramanın savaş gücüne göre ayarlanır. Böylece kahraman geliştikçe av kolaylaşmaz; ödüller de kahraman seviyesiyle büyür.
 * Güç → hamle başına hasar tablosu gerçek savaş ölçümlerinden (Savaşçı / Büyücü / Korucu, iyi oyuncu politikası; v1.89 ve
 * v1.98 ölçümleri) çıkarıldı.
 */
import type { EquipmentItem, GameSaveState, HeroProgress, HuntDifficulty, HuntId, Rarity, StageDef } from '../types/game';
import { computeHeroBuild } from '../utils/rpgLogic';
import { findStageById } from './world';
import { getHunt } from './hunts';
import { AWAKEN_DROPS } from './awakening';
import { generateEquipmentItem } from './items';

export type { HuntDifficulty };
export const HUNT_DIFFICULTY_IDS: HuntDifficulty[] = ['normal', 'hard', 'nightmare'];

export interface HuntDifficultyDef {
  id: HuntDifficulty;
  name: string;
  color: string;
  /** Ölçülen hasarla hedeflenen ortalama hamle */
  targetMoves: number;
  /** Boss vuruşunun (savunma sonrası) kahramanın en yüksek canına oranı */
  hitPct: number;
  /** Tekrar ödülü çarpanı */
  rewardMult: number;
  /** Ekipman düşme şansı ve nadirliği */
  itemChance: number;
  itemRarity: Rarity;
  /** İlahi Öz düşme şansı (yalnızca yüksek zorluk) */
  essenceChance: number;
  /** Açılış şartı (aynı avda bu kademenin zaferi) */
  requires: HuntDifficulty | null;
}

export const HUNT_DIFFICULTIES: Record<HuntDifficulty, HuntDifficultyDef> = {
  normal: { id: 'normal', name: 'Normal', color: '#34d399', targetMoves: 24, hitPct: 0.12, rewardMult: 1, itemChance: 0.35, itemRarity: 'rare', essenceChance: 0, requires: null },
  hard: { id: 'hard', name: 'Zor', color: '#f59e0b', targetMoves: 34, hitPct: 0.15, rewardMult: 1.8, itemChance: 0.5, itemRarity: 'epic', essenceChance: 0, requires: 'normal' },
  nightmare: { id: 'nightmare', name: 'Kâbus', color: '#ef4444', targetMoves: 44, hitPct: 0.18, rewardMult: 3, itemChance: 0.7, itemRarity: 'legendary', essenceChance: AWAKEN_DROPS.huntEssence.chance, requires: 'hard' },
};

/**
 * Savaş gücü → hamle başına ortalama hasar (gerçek oyun ölçümü, log-log ara değer; tablonun ötesinde güçle doğru orantılı).
 * Ör. güç 16.000 (Sv.35 efsanevi set) ≈ 70 B, güç 71.000 (Sv.50 mitik +10, Uyanış V) ≈ 426 B.
 */
export const HUNT_POWER_DPM: ReadonlyArray<readonly [number, number]> = [
  [1500, 950], [2300, 1800], [3200, 3000], [4400, 5500], [6500, 13000], [10000, 40000],
  [17000, 70000], [22000, 100000], [35000, 200000], [52000, 340000], [71000, 426000],
];

export function huntDamagePerMove(power: number): number {
  const t = HUNT_POWER_DPM;
  const p = Math.max(1, power);
  if (p <= t[0][0]) return (t[0][1] * p) / t[0][0];
  for (let i = 1; i < t.length; i++) {
    if (p <= t[i][0]) {
      const [x0, y0] = t[i - 1];
      const [x1, y1] = t[i];
      const k = (Math.log(p) - Math.log(x0)) / (Math.log(x1) - Math.log(x0));
      return Math.exp(Math.log(y0) + k * (Math.log(y1) - Math.log(y0)));
    }
  }
  const last = t[t.length - 1];
  return (last[1] * p) / last[0];
}

/**
 * Boss savaşı düzeltmesi (gerçek savaş ölçümü, v1.99.0): av bosslarına karşı hamle başına hasar normal düşmana göre ~2 kat
 * (boss hasar pasifleri, zayıflık taşı, düşük boss savunması). Düzeltmesiz ölçüm: Normal 9–20 (ort. ~13) hamle, Kâbus 16–24.
 */
export const HUNT_BOSS_HP_ADJUST = 2.1;

export interface HuntBossStats {
  maxHp: number;
  attack: number;
  level: number;
  power: number;
}

/** Ava giren kahramana göre boss değerleri (savaş başında bir kez hesaplanır, savaş içinde değişmez). */
export function huntBossStats(huntId: HuntId, difficulty: HuntDifficulty, hero: HeroProgress): HuntBossStats {
  const base = findStageById(getHunt(huntId).storyStageId)!.stage;
  const d = HUNT_DIFFICULTIES[difficulty];
  const build = computeHeroBuild(hero);
  const power = build.powerRating;
  const maxHp = Math.max(base.enemy.maxHp, Math.round((huntDamagePerMove(power) * d.targetMoves * HUNT_BOSS_HP_ADJUST) / 100) * 100);
  const attack = Math.max(base.enemy.attack, Math.round(d.hitPct * build.stats.health * ((100 + build.stats.defense * 1.45) / 100)));
  return { maxHp, attack, level: Math.max(base.enemy.level, hero.level), power };
}

/** Av savaşı aşaması: hikâye bossu (görsel, fazlar, zayıflık) + ölçeklenmiş can / saldırı. */
export function huntBattleStage(huntId: HuntId, difficulty: HuntDifficulty, hero: HeroProgress): StageDef {
  const base = findStageById(getHunt(huntId).storyStageId)!.stage;
  const s = huntBossStats(huntId, difficulty, hero);
  return {
    ...base,
    recommendedLevel: s.level,
    enemy: { ...base.enemy, maxHp: s.maxHp, attack: s.attack, level: s.level },
  };
}

// ---------------------------------------------------------------------------
// Kademe açılışı
// ---------------------------------------------------------------------------

export function isDifficultyUnlocked(save: Pick<GameSaveState, 'huntRecords'>, huntId: HuntId, difficulty: HuntDifficulty): boolean {
  const req = HUNT_DIFFICULTIES[difficulty].requires;
  return !req || (save.huntRecords[huntId]?.cleared ?? []).includes(req);
}

/** Varsayılan seçim: açık olan en yüksek kademe. */
export function defaultDifficulty(save: Pick<GameSaveState, 'huntRecords'>, huntId: HuntId): HuntDifficulty {
  return [...HUNT_DIFFICULTY_IDS].reverse().find((d) => isDifficultyUnlocked(save, huntId, d)) ?? 'normal';
}

// ---------------------------------------------------------------------------
// Tekrar ödülü (her zafer)
// ---------------------------------------------------------------------------

export interface HuntRepeatReward {
  gold: number;
  crystals: number;
  item: EquipmentItem | null;
  /** İlahi Öz (Kâbus) */
  essence: number;
}

/** Ödülün sabit kısmı (önizleme): kahraman seviyesiyle büyür. */
export function huntRewardPreview(difficulty: HuntDifficulty, heroLevel: number) {
  const d = HUNT_DIFFICULTIES[difficulty];
  const L = Math.max(1, Math.min(50, heroLevel));
  return {
    gold: Math.round(((600 + 220 * L) * d.rewardMult) / 10) * 10,
    crystals: Math.round((6 + 0.5 * L) * d.rewardMult),
    itemChance: d.itemChance,
    itemRarity: d.itemRarity,
    essenceChance: d.essenceChance,
  };
}

export function rollHuntRepeatReward(
  difficulty: HuntDifficulty,
  hero: Pick<HeroProgress, 'level' | 'classId'>,
  rng: () => number = Math.random,
  makeItem: (p: { level: number; rarity: Rarity; preferredClass?: HeroProgress['classId'] }) => EquipmentItem = (p) => generateEquipmentItem(p)
): HuntRepeatReward {
  const pv = huntRewardPreview(difficulty, hero.level);
  const item = rng() < pv.itemChance ? makeItem({ level: Math.max(1, Math.min(50, hero.level)), rarity: pv.itemRarity, preferredClass: hero.classId }) : null;
  const [lo, hi] = AWAKEN_DROPS.huntEssence.amount;
  const essence = pv.essenceChance > 0 && rng() < pv.essenceChance ? lo + Math.floor(rng() * (hi - lo + 1)) : 0;
  return { gold: pv.gold, crystals: pv.crystals, item, essence };
}
