import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { WORLD_REGIONS } from '../src/data/world';
import {
  EDGE,
  ICON_R,
  SPACING,
  boxesOverlap,
  computeRouteLayout,
  iconBox,
  labelBox,
  nodeBox,
  sampleSegment,
} from '../src/utils/routeLayout';
import {
  focusRegionIndex,
  formatLevelRange,
  getRegionStatuses,
  isStageUnlocked,
  unlockHint,
} from '../src/utils/worldProgress';
import { createInitialSaveState } from '../src/utils/storage';

const allStages = WORLD_REGIONS.flatMap((r) => r.stages);
const saveWith = (completed: string[]) => ({ ...createInitialSaveState(), completedStages: completed });
const upTo = (regionIdx: number) =>
  WORLD_REGIONS.slice(0, regionIdx).flatMap((r) => r.stages.map((s) => s.id));

describe('region unlocking (existing rules)', () => {
  it('fresh save: only the first region is open', () => {
    const st = getRegionStatuses(saveWith([]));
    expect(st.map((s) => s.unlocked)).toEqual(WORLD_REGIONS.map((_, i) => i === 0));
    expect(st[0].done).toBe(0);
    expect(st[0].total).toBe(8);
  });

  it('a region opens when the previous region is fully cleared', () => {
    const st = getRegionStatuses(saveWith(upTo(1)));
    expect(st[0].cleared).toBe(true);
    expect(st[1].unlocked).toBe(true);
    expect(st[2].unlocked).toBe(false);
  });

  it('a region stays locked while its predecessor still has an unfinished last stage', () => {
    const almost = upTo(1).slice(0, -1); // son aşama (boss) eksik
    const st = getRegionStatuses(saveWith(almost));
    expect(st[0].cleared).toBe(false);
    expect(st[1].unlocked).toBe(false);
  });

  it('stage rule matches the old screen: previous stage completed', () => {
    const s = saveWith(['forest_1']);
    expect(isStageUnlocked(s, 'forest_1')).toBe(true);
    expect(isStageUnlocked(s, 'forest_2')).toBe(true);
    expect(isStageUnlocked(s, 'forest_3')).toBe(false);
  });

  it('focus: first unlocked unfinished region, last region when everything is done', () => {
    expect(focusRegionIndex(getRegionStatuses(saveWith([])))).toBe(0);
    expect(focusRegionIndex(getRegionStatuses(saveWith(upTo(3))))).toBe(3);
    // 2. bölgenin ortasındayken odak 2. bölge
    expect(focusRegionIndex(getRegionStatuses(saveWith([...upTo(1), 'mountains_1'])))).toBe(1);
    expect(focusRegionIndex(getRegionStatuses(saveWith(allStages.map((s) => s.id))))).toBe(52);
  });

  it('unlock hint names the previous region', () => {
    const st = getRegionStatuses(saveWith([]));
    expect(unlockHint(st, 1)).toContain('Büyülü Orman');
    expect(unlockHint(st, 0)).toBe('');
  });

  it('formats level ranges like the design', () => {
    expect(formatLevelRange('Sv. 6 - 10')).toBe('Sv. 6–10');
  });
});

describe('route layout', () => {
  it('places all 53 regions bottom to top with even spacing', () => {
    const l = computeRouteLayout(WORLD_REGIONS.length, 360);
    expect(l.nodes).toHaveLength(53);
    expect(l.segments).toHaveLength(52);
    for (let i = 1; i < l.nodes.length; i++) {
      expect(l.nodes[i - 1].y - l.nodes[i].y).toBe(SPACING);
    }
    expect(l.nodes[0].y).toBeGreaterThan(l.nodes[52].y);
    expect(l.nodes[52].y - ICON_R).toBeGreaterThan(0);
    expect(l.nodes[0].y + ICON_R).toBeLessThanOrEqual(l.height);
  });

  it('alternates left and right so the route winds', () => {
    const l = computeRouteLayout(53, 360);
    for (let i = 1; i < 53; i++) expect(l.nodes[i].side).not.toBe(l.nodes[i - 1].side);
  });

  for (const width of [320, 340, 360, 390, 412, 430, 480]) {
    it(`no overlaps at ${width}px: labels vs icons, labels vs route line, everything inside the screen`, () => {
      const l = computeRouteLayout(53, width);
      for (const n of l.nodes) {
        const lb = labelBox(n);
        const nb = nodeBox(n);
        expect(n.labelWidth, `label width @${n.index}`).toBeGreaterThanOrEqual(110);
        expect(nb.left).toBeGreaterThanOrEqual(EDGE - 1);
        expect(nb.right).toBeLessThanOrEqual(width - EDGE + 1);
        for (const other of l.nodes) {
          if (other.index === n.index) continue;
          expect(boxesOverlap(lb, iconBox(other)), `label ${n.index} vs icon ${other.index}`).toBe(false);
          expect(boxesOverlap(lb, labelBox(other)), `label ${n.index} vs label ${other.index}`).toBe(false);
        }
        expect(boxesOverlap(lb, iconBox(n))).toBe(false);
      }
      for (let i = 0; i < l.nodes.length - 1; i++) {
        for (const pt of sampleSegment(l.nodes[i], l.nodes[i + 1])) {
          for (const n of l.nodes) {
            const lb = labelBox(n);
            const hit = pt.x > lb.left - 4 && pt.x < lb.right + 4 && pt.y > lb.top - 4 && pt.y < lb.bottom + 4;
            expect(hit, `route ${i}->${i + 1} crosses label ${n.index}`).toBe(false);
          }
        }
      }
    });
  }
});

describe('region art', () => {
  const files = readdirSync(new URL('../src/art/regions/', import.meta.url)).map((f) => f.replace(/\.webp$/, ''));

  it('has a transparent image for each of the 49 regions after the first four', () => {
    const ids = WORLD_REGIONS.slice(4).map((r) => r.id);
    expect(ids).toHaveLength(49);
    for (const id of ids) expect(files, id).toContain(id);
    expect(files).toHaveLength(49);
  });
});
