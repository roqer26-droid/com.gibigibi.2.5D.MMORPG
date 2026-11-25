/**
 * Ustalık Rotası (saf hesaplar): bölge ekranındaki filtreler, kompakt ustalık ilerlemesi ve "Sıradaki Eksik Aşama".
 * - Eksik yıldız: zaferi kazanılmış ama 3/3 yıldızı olmayan aşama. Kilitli ya da henüz kazanılmamış aşama sayılmaz.
 * - Sıra: Dünya Haritası'ndaki gerçek ilerleme sırası (bölge içindeki aşama sırası); aşama kimliğindeki sayıya bakılmaz.
 * - Yıldızlar her zaman güncel kayıttan okunur (zafer kaydından sonra çağrılırsa bu savaşta kazanılan yıldız eksik görünmez).
 */
import { regionMastery, stageStars } from '../data/mastery';
import { WORLD_REGIONS } from '../data/world';
import { isStageUnlocked } from '../utils/worldProgress';
import type { GameSaveState, RegionDef, RegionId, StageDef } from '../types/game';

type RouteSave = Pick<GameSaveState, 'completedStages' | 'mastery'> & Partial<Pick<GameSaveState, 'bossVictories'>>;

export type MasteryFilter = 'all' | 'missing' | 'complete';

export type StageMasteryState = 'complete' | 'missing' | 'unwon';

/** Aşamanın filtre durumu: 3/3 → tamamlandı; zafer var ama yıldız eksik (ve açık) → eksik; diğerleri (kilitli / kazanılmamış) → unwon. */
export function stageMasteryState(save: RouteSave, stageId: string): StageMasteryState {
  const s = stageStars(save, stageId);
  if (s.count === 3) return 'complete';
  if (s.victory && isStageUnlocked(save, stageId)) return 'missing';
  return 'unwon';
}

export function matchesFilter(state: StageMasteryState, filter: MasteryFilter): boolean {
  return filter === 'all' || (filter === 'missing' ? state === 'missing' : filter === 'complete' ? state === 'complete' : false);
}

export interface RegionRouteSummary {
  stars: number;
  max: number;
  /** Bölge ustalık yüzdesi (tam sayı, aşağı yuvarlanır; yalnızca tüm yıldızlarda 100) */
  pct: number;
  threeStarStages: number;
  totalStages: number;
  /** Zaferi kazanılmış aşamalarda eksik kalan yıldızlar (rota ile tamamlanabilecekler) */
  missingStars: number;
  /** Eksik yıldızlı (kazanılmış) aşama sayısı */
  missingStages: number;
  /** Sıradaki sandık eşiğine kalan yıldız (mevcut sandık sistemi; hepsine ulaşıldıysa null) */
  toNextChest: number | null;
  /** Filtre sayıları */
  counts: Record<MasteryFilter, number>;
  /** Her aşamanın durumu (bölge sırası) */
  states: Record<string, StageMasteryState>;
  /** Bölgenin tüm yıldızları alındı */
  complete: boolean;
}

export function regionRouteSummary(save: RouteSave & Pick<GameSaveState, 'mastery'>, region: RegionDef): RegionRouteSummary {
  const rm = regionMastery(save as Pick<GameSaveState, 'completedStages' | 'mastery'>, region);
  const states: Record<string, StageMasteryState> = {};
  let threeStar = 0;
  let missingStars = 0;
  let missingStages = 0;
  for (const st of region.stages) {
    const state = stageMasteryState(save, st.id);
    states[st.id] = state;
    if (state === 'complete') threeStar++;
    if (state === 'missing') {
      missingStages++;
      missingStars += 3 - stageStars(save, st.id).count;
    }
  }
  return {
    stars: rm.stars,
    max: rm.max,
    pct: rm.stars >= rm.max ? 100 : Math.floor((rm.stars / rm.max) * 100),
    threeStarStages: threeStar,
    totalStages: region.stages.length,
    missingStars,
    missingStages,
    toNextChest: rm.toNextChest,
    counts: { all: region.stages.length, missing: missingStages, complete: threeStar },
    states,
    complete: rm.stars >= rm.max,
  };
}

/** Bölgedeki eksik yıldızlı aşamalar, harita sırasıyla. */
export function missingStagesInRegion(save: RouteSave, region: RegionDef): StageDef[] {
  return region.stages.filter((st) => stageMasteryState(save, st.id) === 'missing');
}

/** "Sıradaki Eksik Aşama" (bölge ekranı): bölgenin harita sırasındaki ilk eksik aşaması; yoksa null. */
export function firstMissingStage(save: RouteSave, region: RegionDef): StageDef | null {
  return missingStagesInRegion(save, region)[0] ?? null;
}

/**
 * Zafer ekranındaki "Sıradaki Eksik Aşama": mevcut aşamadan SONRAKİ ilk eksik aşama; listenin sonuna gelindiyse baştan
 * (önceki eksik aşamalara) döner. Mevcut aşama hâlâ eksikse yalnızca başka eksik aşama kalmadığında kendisi önerilmez (null);
 * tekrar için "Tekrar Oyna" kullanılır.
 */
export function nextMissingStage(save: RouteSave, region: RegionDef, currentStageId: string): StageDef | null {
  const list = region.stages;
  const idx = list.findIndex((s) => s.id === currentStageId);
  for (let k = 1; k <= list.length; k++) {
    const st = list[(Math.max(0, idx) + k) % list.length];
    if (st.id === currentStageId) continue;
    if (stageMasteryState(save, st.id) === 'missing') return st;
  }
  return null;
}

export function regionOfStage(stageId: string): { region: RegionDef; index: number } | null {
  const index = WORLD_REGIONS.findIndex((r) => r.stages.some((s) => s.id === stageId));
  return index < 0 ? null : { region: WORLD_REGIONS[index], index };
}

export const regionById = (id: RegionId): RegionDef | undefined => WORLD_REGIONS.find((r) => r.id === id);
