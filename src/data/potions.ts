import type { GameSaveState, StageDef } from '../types/game';
import { applyXpToHero, xpRequiredForLevel } from '../utils/rpgLogic';

/**
 * Seviye iksirleri: yeni alınan kahramanı hızla yetiştirmek için. Etki mevcut seviyenin XP ihtiyacına oranlıdır, yani her seviyede
 * aynı "değer" taşır (küçük ≈ ⅓ seviye, orta ≈ 1,2 seviye, büyük ≈ 4 seviye). Seviye üst sınırı 50'dir.
 *
 * Düşme: her aşama zaferinde küçük iksir (1–2 adet) neredeyse garanti; orta iksir belli ihtimalle (elit/hazinede daha yüksek);
 * büyük iksir YALNIZCA boss zaferlerinde belli ihtimalle düşer.
 */
export type PotionSize = 'small' | 'medium' | 'large';
export type PotionStock = Record<PotionSize, number>;

export const POTION_SIZES: PotionSize[] = ['small', 'medium', 'large'];

export const POTION_META: Record<PotionSize, { name: string; xpLevelFraction: number; color: string }> = {
  small: { name: 'Küçük Seviye İksiri', xpLevelFraction: 0.35, color: '#4ade80' },
  medium: { name: 'Orta Seviye İksiri', xpLevelFraction: 1.2, color: '#38bdf8' },
  large: { name: 'Büyük Seviye İksiri', xpLevelFraction: 4, color: '#f59e0b' },
};

/** Düşme ayarları (kolayca ayarlanır). */
export const POTION_DROP = {
  smallChance: 0.9,
  smallDoubleChance: 0.3,
  mediumChance: { normal: 0.18, treasure: 0.3, elite: 0.3, boss: 0.45 },
  largeBossChance: 0.3,
};

export const emptyPotions = (): PotionStock => ({ small: 0, medium: 0, large: 0 });

export function sanitizePotions(value: unknown): PotionStock {
  const v = (value && typeof value === 'object' ? value : {}) as Partial<Record<PotionSize, unknown>>;
  const n = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) && x > 0 ? Math.min(99999, Math.floor(x)) : 0);
  return { small: n(v.small), medium: n(v.medium), large: n(v.large) };
}

/** Bir aşama zaferinden düşen iksirler. `rng` 0–1 arası rastgele sayı üretir. */
export function rollPotionDrop(stage: Pick<StageDef, 'type' | 'enemy'>, rng: () => number = Math.random): PotionStock {
  const out = emptyPotions();
  if (rng() < POTION_DROP.smallChance) out.small = rng() < POTION_DROP.smallDoubleChance ? 2 : 1;
  const kind = stage.enemy.isBoss ? 'boss' : stage.type === 'elite' ? 'elite' : stage.type === 'treasure' ? 'treasure' : 'normal';
  if (rng() < POTION_DROP.mediumChance[kind]) out.medium = 1;
  if (stage.enemy.isBoss && rng() < POTION_DROP.largeBossChance) out.large = 1;
  return out;
}

export const hasAnyPotion = (p: PotionStock): boolean => p.small + p.medium + p.large > 0;

export function addPotions(stock: PotionStock, gain: PotionStock): PotionStock {
  return { small: stock.small + gain.small, medium: stock.medium + gain.medium, large: stock.large + gain.large };
}

/** Mevcut seviyede bir iksirin verdiği XP. */
export const potionXp = (size: PotionSize, level: number): number => Math.round(xpRequiredForLevel(Math.max(1, level)) * POTION_META[size].xpLevelFraction);

export interface PotionUseResult {
  save: GameSaveState;
  ok: boolean;
  toast: string;
  levelsGained?: number;
  newLevel?: number;
}

/** Etkin kahramana iksir kullanır. Seviye 50'de kullanılamaz; iksir harcanmaz. */
export function usePotion(save: GameSaveState, size: PotionSize): PotionUseResult {
  const hero = save.heroes[save.activeHeroClass];
  if ((save.potions?.[size] ?? 0) <= 0) return { save, ok: false, toast: 'Bu iksirden yok.' };
  if (hero.level >= 50) return { save, ok: false, toast: 'Kahraman zaten en üst seviyede.' };
  const xp = potionXp(size, hero.level);
  const res = applyXpToHero(hero, xp);
  return {
    save: { ...save, potions: { ...save.potions, [size]: save.potions[size] - 1 }, heroes: { ...save.heroes, [save.activeHeroClass]: res.updatedHero } },
    ok: true,
    toast: res.leveledUp ? `+${xp} XP — Seviye ${res.newLevel}!` : `+${xp} XP`,
    levelsGained: res.levelsGained,
    newLevel: res.newLevel,
  };
}
