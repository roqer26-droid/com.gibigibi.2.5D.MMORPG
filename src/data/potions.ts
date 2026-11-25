import type { GameSaveState, HeroClassId, HeroProgress, StageDef } from '../types/game';
import { applyXpToHero, xpRequiredForLevel } from '../utils/rpgLogic';
import { SKILL_POINTS_PER_LEVEL } from './passiveTree';

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

export interface PotionLevelUpResult {
  save: GameSaveState;
  ok: boolean;
  toast: string;
  /** Tüketilen iksirler */
  used?: PotionStock;
  newLevel?: number;
}

/**
 * "Seviye Atlat": kahramanın bir sonraki seviyeye kalan XP'si dolana kadar stoktan rastgele iksir tüketir ve TAM 1 seviye verir.
 * Seçim: kalan ihtiyacı aşmayan iksirler arasından adetlerine göre rastgele; hepsi aşıyorsa eldeki en küçük iksir (israfı azaltır).
 * Artan XP sonraki seviyeye taşınır, ancak ikinci bir seviye atlatmayacak şekilde sınırlanır.
 * Yeterli iksir yoksa (ya da kahraman kilitli / seviye 50) kayıt hiç değişmez.
 */
export function levelUpWithPotions(save: GameSaveState, heroId: HeroClassId, rng: () => number = Math.random): PotionLevelUpResult {
  const hero = save.heroes[heroId];
  if (!hero || !save.heroUnlocks.includes(heroId)) return { save, ok: false, toast: 'Kahraman kilitli.' };
  if (hero.level >= 50) return { save, ok: false, toast: 'Kahraman zaten en üst seviyede.' };
  const need = Math.max(1, xpRequiredForLevel(hero.level) - hero.xp);
  const stock: PotionStock = { ...emptyPotions(), ...sanitizePotions(save.potions) };
  const total = POTION_SIZES.reduce((n, s) => n + stock[s] * potionXp(s), 0);
  if (total < need) return { save, ok: false, toast: 'Yeterli iksir yok' };
  const used = emptyPotions();
  let gained = 0;
  while (gained < need) {
    const avail = POTION_SIZES.filter((s) => stock[s] > 0);
    const rem = need - gained;
    const under = avail.filter((s) => potionXp(s) <= rem);
    let pick: PotionSize;
    if (under.length > 0) {
      const weight = under.reduce((n, s) => n + stock[s], 0);
      let r = rng() * weight;
      pick = under[under.length - 1];
      for (const s of under) {
        if (r < stock[s]) { pick = s; break; }
        r -= stock[s];
      }
    } else {
      pick = avail.reduce((a, b) => (potionXp(a) <= potionXp(b) ? a : b));
    }
    stock[pick] -= 1;
    used[pick] += 1;
    gained += potionXp(pick);
  }
  const newLevel = hero.level + 1;
  const carry = hero.xp + gained - xpRequiredForLevel(hero.level);
  const xp = newLevel >= 50 ? 0 : Math.max(0, Math.min(carry, xpRequiredForLevel(newLevel) - 1));
  const usedText = POTION_SIZES.filter((s) => used[s] > 0).map((s) => `${used[s]} ${POTION_META[s].name.replace(' Seviye İksiri', '').toLocaleLowerCase('tr-TR')}`).join(', ');
  return {
    save: {
      ...save,
      potions: stock,
      heroes: { ...save.heroes, [heroId]: { ...hero, level: newLevel, xp, skillPoints: hero.skillPoints + SKILL_POINTS_PER_LEVEL } },
    },
    ok: true,
    toast: `Seviye ${newLevel}! (${usedText} iksir)`,
    used,
    newLevel,
  };
}
