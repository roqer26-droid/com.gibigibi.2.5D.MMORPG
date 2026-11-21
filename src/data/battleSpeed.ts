import type { GameSaveState } from '../types/game';
import { WORLD_REGIONS } from './world';

/**
 * 2× savaş hızı: Dünya Haritası'ndaki genel sıraya göre 100. aşama tamamlanınca (ya da sonraki bir aşama tamamlanmış
 * eski kayıtlarda) kalıcı olarak açılır. Aşama bölge ve aşama verilerinden bulunur.
 */
export const SPEED_UNLOCK_STAGE_NUMBER = 100;

const ALL_STAGE_IDS = WORLD_REGIONS.flatMap((r) => r.stages.map((s) => s.id));

/** Açılışı belirleyen aşamanın kimliği (genel sıradaki 100. aşama). */
export const SPEED_UNLOCK_STAGE_ID: string = ALL_STAGE_IDS[SPEED_UNLOCK_STAGE_NUMBER - 1];

export type BattleSpeed = 1 | 2;

/** 100. ya da sonraki bir aşama tamamlandı mı (genel sıraya göre)? */
export function speedUnlockReached(completedStages: string[]): boolean {
  const done = new Set(completedStages);
  for (let i = SPEED_UNLOCK_STAGE_NUMBER - 1; i < ALL_STAGE_IDS.length; i++) if (done.has(ALL_STAGE_IDS[i])) return true;
  return false;
}

export const isSpeedUnlocked = (save: Pick<GameSaveState, 'speed'>): boolean => save.speed.unlocked;

/** Şart sağlandıysa kalıcı olarak açar (zaten açıksa aynı nesneyi döndürür). Zafer ve yükleme sırasında çağrılır. */
export function applySpeedUnlock(save: GameSaveState): GameSaveState {
  if (save.speed.unlocked || !speedUnlockReached(save.completedStages)) return save;
  return { ...save, speed: { unlocked: true, noticeShown: false } };
}

/** Kullanılacak hız: kilitliyken her zaman 1×; açıkken oyuncunun son tercihi. */
export function effectiveSpeed(save: Pick<GameSaveState, 'speed' | 'settings'>): BattleSpeed {
  return save.speed.unlocked && save.settings.battleSpeed === 2 ? 2 : 1;
}

/** Tercihi kaydeder; yalnızca açıkken değişir. */
export function setBattleSpeed(save: GameSaveState, speed: BattleSpeed): GameSaveState {
  if (!save.speed.unlocked || save.settings.battleSpeed === speed) return save;
  return { ...save, settings: { ...save.settings, battleSpeed: speed } };
}

export function sanitizeSpeed(value: unknown): GameSaveState['speed'] {
  const v = (value ?? {}) as Partial<GameSaveState['speed']>;
  return { unlocked: v.unlocked === true, noticeShown: v.noticeShown === true };
}
