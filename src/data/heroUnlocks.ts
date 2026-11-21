import type { GameSaveState, HeroClassId, ImageHeroClassId } from '../types/game';
import { HERO_CLASSES } from './classes';
import { speedUnlockReached } from './battleSpeed';
import { WORLD_REGIONS } from './world';

/**
 * Başarıyla açılan kahramanlar. Koşullar mevcut kayıt verilerinden okunur, bu yüzden eski kayıtlardaki başarılar da tanınır:
 *  - Kurt Adam: Büyülü Orman'ın tüm aşamaları tamamlandı
 *  - Vampir: Karanlık Uçurum'un son (boss) aşaması tamamlandı
 *  - Kocaayak: Köklerin Mahzeni'nin son savaşı kazanıldı (zindan tamamlanma kaydı)
 *  - Gecenin Çığırtkanı: Dünya Haritası'nın genel sırasındaki 100. aşama tamamlandı
 */
const lastStageOf = (regionId: string) => {
  const stages = WORLD_REGIONS.find((r) => r.id === regionId)!.stages;
  return stages[stages.length - 1].id;
};

export const HERO_UNLOCK_RULES: Record<ImageHeroClassId, (save: GameSaveState) => boolean> = {
  werewolf: (s) => WORLD_REGIONS.find((r) => r.id === 'forest')!.stages.every((st) => s.completedStages.includes(st.id)),
  vampire: (s) => s.completedStages.includes(lastStageOf('abyss')),
  bigfoot: (s) => (s.dungeons.roots_vault?.completions ?? 0) > 0,
  night_screecher: (s) => speedUnlockReached(s.completedStages),
};

export const HERO_UNLOCK_IDS = Object.keys(HERO_UNLOCK_RULES) as ImageHeroClassId[];

export const heroConditionMet = (save: GameSaveState, id: HeroClassId): boolean =>
  id in HERO_UNLOCK_RULES && HERO_UNLOCK_RULES[id as ImageHeroClassId](save);

/** Koşulu sağlanan ama henüz açılmamış kahramanları açar (zaten açık olanlara dokunmaz; aktif kahraman ve ekipman korunur). */
export function applyHeroUnlocks(save: GameSaveState): { save: GameSaveState; newlyUnlocked: HeroClassId[] } {
  const newly = HERO_UNLOCK_IDS.filter((id) => !save.heroUnlocks.includes(id) && HERO_UNLOCK_RULES[id](save));
  if (newly.length === 0) return { save, newlyUnlocked: [] };
  return { save: { ...save, heroUnlocks: [...save.heroUnlocks, ...newly] }, newlyUnlocked: newly };
}

export const heroUnlockText = (id: HeroClassId): string | null => HERO_CLASSES[id].unlockCondition?.text ?? null;
