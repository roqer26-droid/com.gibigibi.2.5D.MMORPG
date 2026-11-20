import { WORLD_REGIONS } from '../data/world';
import type { GameSaveState, RegionDef } from '../types/game';

const ALL_STAGES = WORLD_REGIONS.flatMap((r) => r.stages);

type ProgressSave = Pick<GameSaveState, 'completedStages'> & Partial<Pick<GameSaveState, 'bossVictories'>>;

/**
 * Bir aşama, bir önceki aşama tamamlandıysa açıktır (ilk aşama her zaman açık). Önceki aşama bir bossun aşamasıysa ve o boss
 * daha önce yenildiyse (`bossVictories`) de açılır: Sonsuzluk İmparatoru'nu yenmiş eski kayıtlar Cam Ormanı'na doğrudan girer.
 */
export function isStageUnlocked(save: ProgressSave, stageId: string): boolean {
  const idx = ALL_STAGES.findIndex((s) => s.id === stageId);
  if (idx <= 0) return true;
  const prev = ALL_STAGES[idx - 1];
  if (save.completedStages.includes(prev.id)) return true;
  const bossId = prev.enemy.bossId;
  return !!bossId && !!save.bossVictories?.includes(bossId);
}

export interface RegionStatus {
  region: RegionDef;
  index: number;
  /** İlk aşaması açık mı (önceki bölgenin son aşaması tamamlandı) */
  unlocked: boolean;
  done: number;
  total: number;
  cleared: boolean;
}

export function getRegionStatuses(save: ProgressSave): RegionStatus[] {
  return WORLD_REGIONS.map((region, index) => {
    const done = region.stages.filter((s) => save.completedStages.includes(s.id)).length;
    return {
      region,
      index,
      unlocked: isStageUnlocked(save, region.stages[0].id),
      done,
      total: region.stages.length,
      cleared: done === region.stages.length,
    };
  });
}

/** Haritanın ilk açılışta odaklanacağı bölge: açık ve tamamlanmamış ilk bölge; hepsi bittiyse sonuncu. */
export function focusRegionIndex(statuses: RegionStatus[]): number {
  const open = statuses.find((s) => s.unlocked && !s.cleared);
  return open ? open.index : statuses.length - 1;
}

/** Kilitli bölgenin açılma koşulu metni. */
export function unlockHint(statuses: RegionStatus[], index: number): string {
  const prev = statuses[index - 1];
  if (!prev) return '';
  const last = prev.region.stages[prev.region.stages.length - 1];
  return `Önce ${prev.region.name} bölgesini bitir: “${last.name}” aşamasını tamamla.`;
}

/** "Sv. 6 - 10" -> "Sv. 6–10" */
export function formatLevelRange(range: string): string {
  return range.replace(/\s*-\s*/g, '–');
}
