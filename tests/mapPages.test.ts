import { describe, expect, it } from 'vitest';
import { WORLD_REGIONS } from '../src/data/world';
import { MAP_PAGE_SIZE, pageCount, pageOf, pageRange } from '../src/utils/mapPages';
import { createInitialSaveState } from '../src/utils/storage';
import { focusRegionIndex, getRegionStatuses, overallProgress } from '../src/utils/worldProgress';

const all = WORLD_REGIONS.flatMap((r) => r.stages.map((s) => s.id));

describe('world map pages', () => {
  it('splits the regions in order into pages of 10: 1-10 … 51-53 (6 pages)', () => {
    const n = WORLD_REGIONS.length;
    expect(MAP_PAGE_SIZE).toBe(10);
    expect(pageCount(n)).toBe(6);
    expect([0, 1, 2, 3, 4, 5].map((p) => pageRange(p, n).map((x, i) => (i === 0 ? x + 1 : x)))).toEqual([[1, 10], [11, 20], [21, 30], [31, 40], [41, 50], [51, 53]]);
    expect(pageOf(9)).toBe(0);
    expect(pageOf(10)).toBe(1);
    expect(pageOf(49)).toBe(4);
    expect(pageOf(50)).toBe(5);
  });

  it('page count follows the region count automatically', () => {
    expect(pageCount(53)).toBe(6);
    expect(pageCount(60)).toBe(6);
    expect(pageCount(61)).toBe(7);
    expect(pageCount(1)).toBe(1);
    expect(pageRange(5, 61)).toEqual([50, 60]);
  });

  it('opens on the last accessible region and counts overall progress across the whole map', () => {
    const base = createInitialSaveState();
    expect(focusRegionIndex(getRegionStatuses(base))).toBe(0);
    const half = { ...base, completedStages: all.slice(0, 250) };
    const st = getRegionStatuses(half);
    expect(focusRegionIndex(st)).toBe(28);
    expect(pageOf(focusRegionIndex(st))).toBe(2);
    expect(overallProgress(st)).toEqual({ done: 250, total: 500 });
    const full = getRegionStatuses({ ...base, completedStages: all });
    expect(focusRegionIndex(full)).toBe(52);
    expect(overallProgress(full)).toEqual({ done: 500, total: 500 });
  });
});
