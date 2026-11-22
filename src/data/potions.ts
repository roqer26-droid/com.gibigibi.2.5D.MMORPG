import type { GameSaveState, HeroProgress, StageDef } from '../types/game';
import { applyXpToHero } from '../utils/rpgLogic';

/**
 * Seviye iksirleri: yeni alınan kahramanı hızla yetiştirmek için. Her iksir seçili kahramana seviyesinden bağımsız SABİT miktarda XP verir
 * (mevcut XP sistemi üzerinden; tek kullanımda birden fazla seviye atlanabilir). Seviye üst sınırı 50'dir.
 *
 * Düşme (yalnızca dünya haritası zaferleri; lig/zindan/boss avı iksir düşürmez): küçük iksir için zafer başına TEK %70 kontrolü
 * (başarılıysa 1 adet, %30 ihtimalle 2 adet); orta iksir türe göre sabit oranlarla; büyük iksir yalnızca dünya haritası boss zaferlerinde %25.
 */
export type PotionSize = 'small' | 'medium' | 'large';
export type PotionStock = Record<PotionSize, number>;

export const POTION_SIZES: PotionSize[] = ['small', 'medium', 'large'];

export const POTION_META: Record<PotionSize, { name: string; xp: number; color: string }> = {
  small: { name: 'Küçük Seviye İksiri', xp: 2000, color: '#4ade80' },
  medium: { name: 'Orta Seviye İksiri', xp: 5000, color: '#38bdf8' },
  large: { name: 'Büyük Seviye İksiri', xp: 20000, color: '#f59e0b' },
};

/** Düşme ayarları (kolayca ayarlanır). */
export const POTION_DROP = {
  /** Zafer başına tek düşme kontrolü; iki adet gelmesi bu %70'in içindedir */
  smallChance: 0.7,
  /** Düşme başarılıysa 2 adet verme olasılığı */
  smallDoubleChance: 0.3,
  mediumChance: { normal: 0.18, treasure: 0.3, elite: 0.3, boss: 0.45 },
  largeBossChance: 0.25,
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

/** Bir iksirin verdiği sabit XP (seviyeden bağımsız). */
export const potionXp = (size: PotionSize): number => POTION_META[size].xp;

export interface PotionPreview {
  xp: number;
  fromLevel: number;
  toLevel: number;
  /** Kahraman seviye 50'de: iksir kullanılamaz */
  blocked: boolean;
}

/** Kullanım öncesi gerçek sonuç: uygulamayla AYNI XP hesabı (`applyXpToHero`) kullanılır. */
export function previewPotion(hero: HeroProgress, size: PotionSize): PotionPreview {
  const xp = potionXp(size);
  if (hero.level >= 50) return { xp, fromLevel: hero.level, toLevel: hero.level, blocked: true };
  return { xp, fromLevel: hero.level, toLevel: applyXpToHero(hero, xp).newLevel, blocked: false };
}

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
  const xp = potionXp(size);
  const res = applyXpToHero(hero, xp);
  return {
    save: { ...save, potions: { ...save.potions, [size]: save.potions[size] - 1 }, heroes: { ...save.heroes, [save.activeHeroClass]: res.updatedHero } },
    ok: true,
    toast: res.leveledUp ? `+${xp} XP — Seviye ${res.newLevel}!` : `+${xp} XP`,
    levelsGained: res.levelsGained,
    newLevel: res.newLevel,
  };
}
