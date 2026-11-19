import { WORLD_REGIONS } from '../data/world';
import type { GameSaveState, RegionDef } from '../types/game';

const ALL_STAGES = WORLD_REGIONS.flatMap((r) => r.stages);

/** Bir aşama, bir önceki aşama tamamlandıysa açıktır (ilk aşama her zaman açık). */
export function isStageUnlocked(save: Pick<GameSaveState, 'completedStages'>, stageId: string): boolean {
  const idx = ALL_STAGES.findIndex((s) => s.id === stageId);
  if (idx <= 0) return true;
  return save.completedStages.includes(ALL_STAGES[idx - 1].id);
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

export function getRegionStatuses(save: Pick<GameSaveState, 'completedStages'>): RegionStatus[] {
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
