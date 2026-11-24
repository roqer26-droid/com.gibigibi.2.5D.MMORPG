/**
 * Hızlı Tekrar ve Ustalık Hedefleri (Dünya Haritası aşama zaferleri): zafer ekranının saf kararları.
 * - Sıradaki aşama: dünya rotasının gerçek sırası (bölge sırası + bölge içi aşama sırası) ve mevcut açılma kuralı (`isStageUnlocked`).
 *   Aşama kimliğindeki sayıya bakılmaz.
 * - Yıldız durumu: zafer kaydedildikten sonraki güncel kayıttan okunur (bu savaşta kazanılan yıldız eksik görünmez).
 */
import { WORLD_REGIONS } from '../data/world';
import { getStageObjectives, objectiveText, stageStars } from '../data/mastery';
import { isStageUnlocked } from '../utils/worldProgress';
import type { GameSaveState, StageDef } from '../types/game';

const ROUTE: StageDef[] = WORLD_REGIONS.flatMap((r) => r.stages);

type ProgressSave = Pick<GameSaveState, 'completedStages'> & Partial<Pick<GameSaveState, 'bossVictories'>>;

export type NextStageChoice =
  /** Sıradaki aşama açık: doğrudan başlatılabilir */
  | { kind: 'next'; stage: StageDef; unlocked: true }
  /** Sıradaki aşama var ama mevcut kurallara göre kilitli: düğme pasif */
  | { kind: 'next'; stage: StageDef; unlocked: false }
  /** Dünya rotasının son aşaması: düğmenin yerinde "Haritaya Dön" */
  | { kind: 'end' };

/** Dünya rotasında bu aşamadan sonraki aşama ve açık olup olmadığı (bölge sonundaki bosstan sonra sıradaki bölgenin ilk aşaması). */
export function nextRouteStage(save: ProgressSave, stageId: string): NextStageChoice {
  const idx = ROUTE.findIndex((s) => s.id === stageId);
  if (idx < 0 || idx + 1 >= ROUTE.length) return { kind: 'end' };
  const stage = ROUTE[idx + 1];
  return isStageUnlocked(save, stage.id) ? { kind: 'next', stage, unlocked: true } : { kind: 'next', stage, unlocked: false };
}

/** Rotadaki sıra numarası (1 tabanlı) ve toplam aşama sayısı. */
export function routePosition(stageId: string): { index: number; total: number } {
  return { index: ROUTE.findIndex((s) => s.id === stageId) + 1, total: ROUTE.length };
}

export interface VictoryStarStatus {
  /** 0–3 */
  count: number;
  stars: [boolean, boolean, boolean];
  complete: boolean;
  /** Eksik ustalık hedeflerinin açıklamaları (savaşta tamamlanmamış ve kayıtta da olmayanlar) */
  missing: string[];
}

/** Zafer kaydından sonra aşamanın yıldız durumu ve eksik hedefler (eski kayıtlarda tamamlanmış aşama zafer yıldızını taşır). */
export function victoryStarStatus(save: Pick<GameSaveState, 'completedStages' | 'mastery'>, stageId: string): VictoryStarStatus {
  const s = stageStars(save, stageId);
  const objectives = getStageObjectives(stageId);
  const missing = [!s.o1 ? objectiveText(objectives[0]) : null, !s.o2 ? objectiveText(objectives[1]) : null].filter((x): x is string => !!x);
  return { count: s.count, stars: [s.victory, s.o1, s.o2], complete: s.count === 3, missing };
}

/**
 * Zafer geçiş kilidi: geçişler zafer kaydı tamamlanınca açılır, ilk dokunuş kilitler (çift dokunma ikinci savaşı başlatmaz).
 * Yeni savaş başlayınca `reset` ile yeniden kurulur.
 */
export function createTransitionGate() {
  let used = false;
  return {
    /** Geçiş yapılabilir mi (kayıt hazır ve daha önce kullanılmadı); true dönerse kilitlenir. */
    take(recorded: boolean): boolean {
      if (!recorded || used) return false;
      used = true;
      return true;
    },
    get used() {
      return used;
    },
    reset() {
      used = false;
    },
  };
}
