import { describe, expect, it } from 'vitest';
import { WORLD_REGIONS } from '../src/data/world';
import { applyStageMastery, claimMasteryChest, regionMastery, stageStars } from '../src/data/mastery';
import {
  firstMissingStage,
  matchesFilter,
  missingStagesInRegion,
  nextMissingStage,
  regionRouteSummary,
  stageMasteryState,
} from '../src/game/masteryRoute';
import { isStageUnlocked } from '../src/utils/worldProgress';
import type { GameSaveState } from '../src/types/game';
import { createInitialSaveState, parseSaveString } from '../src/utils/storage';

const ROUTE = WORLD_REGIONS.flatMap((r) => r.stages);
const fresh = (): GameSaveState => createInitialSaveState();

/** Deterministik "rastgele" kayıt: rotanın ilk N aşaması kazanılmış, hedefler karışık. */
function mixedSave(won: number, seed = 7): GameSaveState {
  let x = seed;
  const rnd = () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
  const s = fresh();
  const objectives: GameSaveState['mastery']['objectives'] = {};
  ROUTE.slice(0, won).forEach((st) => {
    const r = rnd();
    if (r < 0.3) objectives[st.id] = { o1: true, o2: true };
    else if (r < 0.55) objectives[st.id] = { o1: true, o2: false };
    else if (r < 0.7) objectives[st.id] = { o1: false, o2: true };
  });
  // kazanılmamış aşamada hedef kaydı (savunma: eski/bozuk kayıt) eksik filtresine girmemeli
  objectives[ROUTE[won + 1]?.id ?? ROUTE[0].id] = { o1: true, o2: false };
  return { ...s, completedStages: ROUTE.slice(0, won).map((st) => st.id), mastery: { ...s.mastery, objectives } };
}

describe('Ustalık Rotası: filtreler (500 aşamanın tamamı)', () => {
  it('route has 500 stages in map order', () => {
    expect(ROUTE).toHaveLength(500);
  });

  for (const won of [0, 1, 37, 260, 499, 500]) {
    it(`filters are exact for every stage (won = ${won})`, () => {
      const save = mixedSave(won);
      let total = 0;
      for (const region of WORLD_REGIONS) {
        const sum = regionRouteSummary(save, region);
        expect(sum.counts.all).toBe(region.stages.length);
        let miss = 0;
        let comp = 0;
        let missingStars = 0;
        for (const st of region.stages) {
          const s = stageStars(save, st.id);
          const state = stageMasteryState(save, st.id);
          const expected = s.count === 3 ? 'complete' : s.victory ? 'missing' : 'unwon';
          expect(state, st.id).toBe(expected);
          expect(sum.states[st.id]).toBe(state);
          if (state === 'missing') {
            miss++;
            missingStars += 3 - s.count;
            // eksik filtresindeki her aşama açık ve kazanılmış
            expect(isStageUnlocked(save, st.id)).toBe(true);
            expect(save.completedStages).toContain(st.id);
          }
          if (state === 'complete') comp++;
          expect(matchesFilter(state, 'all')).toBe(true);
          expect(matchesFilter(state, 'missing')).toBe(state === 'missing');
          expect(matchesFilter(state, 'complete')).toBe(state === 'complete');
          total++;
        }
        expect(sum.counts.missing).toBe(miss);
        expect(sum.counts.complete).toBe(comp);
        expect(sum.missingStars).toBe(missingStars);
        const rm = regionMastery(save, region);
        expect([sum.stars, sum.max, sum.toNextChest]).toEqual([rm.stars, rm.max, rm.toNextChest]);
        expect(sum.pct).toBe(rm.stars === rm.max ? 100 : Math.floor((rm.stars / rm.max) * 100));
        expect(sum.complete).toBe(rm.stars === rm.max);
        expect(missingStagesInRegion(save, region).map((s) => s.id)).toEqual(region.stages.filter((s) => sum.states[s.id] === 'missing').map((s) => s.id));
      }
      expect(total).toBe(500);
    });
  }

  it('locked / never-won stages are never in the missing filter or chosen by the route', () => {
    const save = mixedSave(12);
    for (const st of ROUTE.slice(12)) {
      expect(stageMasteryState(save, st.id)).not.toBe('missing');
    }
    for (const region of WORLD_REGIONS) {
      const first = firstMissingStage(save, region);
      if (first) expect(save.completedStages).toContain(first.id);
      for (const st of region.stages) {
        const n = nextMissingStage(save, region, st.id);
        if (n) {
          expect(save.completedStages).toContain(n.id);
          expect(isStageUnlocked(save, n.id)).toBe(true);
        }
      }
    }
  });
});

describe('Ustalık Rotası: sıradaki eksik aşama', () => {
  const forest = WORLD_REGIONS[0];
  const ids = forest.stages.map((s) => s.id);
  const base = (): GameSaveState => {
    const s = fresh();
    // tüm orman kazanıldı; 1, 4, 6 eksik; diğerleri 3/3
    const objectives: GameSaveState['mastery']['objectives'] = {};
    ids.forEach((id, i) => { if (![0, 3, 5].includes(i)) objectives[id] = { o1: true, o2: true }; });
    objectives[ids[3]] = { o1: true, o2: false };
    return { ...s, completedStages: [...ids], mastery: { ...s.mastery, objectives } };
  };

  it('first missing stage follows the real map order', () => {
    expect(firstMissingStage(base(), forest)!.id).toBe(ids[0]);
  });

  it('after the current stage, then wraps to earlier missing stages; never returns the current one', () => {
    const s = base();
    expect(nextMissingStage(s, forest, ids[0])!.id).toBe(ids[3]);
    expect(nextMissingStage(s, forest, ids[3])!.id).toBe(ids[5]);
    expect(nextMissingStage(s, forest, ids[5])!.id).toBe(ids[0]); // sona gelince başa döner
    expect(nextMissingStage(s, forest, ids[7])!.id).toBe(ids[0]);
  });

  it('stars earned in a victory update instantly: completed stage leaves the route', () => {
    const s = base();
    const stage = forest.stages[3];
    const after = applyStageMastery(s, stage, [false, true]).save;
    expect(stageMasteryState(after, stage.id)).toBe('complete');
    expect(regionRouteSummary(after, forest).counts.missing).toBe(2);
    expect(nextMissingStage(after, forest, stage.id)!.id).toBe(ids[5]);
    // tek eksik kalan: kendisi önerilmez, başka yoksa null
    const only = { ...after, mastery: { ...after.mastery, objectives: { ...after.mastery.objectives, [ids[0]]: { o1: true, o2: true } } } };
    expect(nextMissingStage(only, forest, ids[5])).toBeNull();
    const done = applyStageMastery(only, forest.stages[5], [true, true]).save;
    expect(firstMissingStage(done, forest)).toBeNull();
    expect(regionRouteSummary(done, forest).complete).toBe(true);
    expect(regionRouteSummary(done, forest).pct).toBe(100);
  });

  it('chests: claimable once with current stars; a second claim is rejected and gives nothing', () => {
    const s = { ...base(), gold: 0 };
    const sum = regionRouteSummary(s, forest);
    expect(sum.stars).toBeGreaterThanOrEqual(regionMastery(s, forest).chests[1].threshold);
    const c1 = claimMasteryChest(s, 'forest', 0);
    expect(c1.ok).toBe(true);
    const gold = c1.save.gold;
    const c2 = claimMasteryChest(c1.save, 'forest', 0);
    expect(c2.ok).toBe(false);
    expect(c2.save).toBe(c1.save);
    expect(c2.save.gold).toBe(gold);
    // sandık alındı bilgisi rotanın sandık sayacını bozmaz
    expect(regionRouteSummary(c1.save, forest).toNextChest).toBe(regionMastery(c1.save, forest).toNextChest);
  });

  it('works on existing saves without migration (old save with mastery from v9 format)', () => {
    const s = base();
    const loaded = parseSaveString(JSON.stringify(s))!;
    expect(loaded.mastery.objectives).toEqual(s.mastery.objectives);
    expect(regionRouteSummary(loaded, forest)).toEqual(regionRouteSummary(s, forest));
    // eski kayıt: ustalık alanı yok → tamamlanmış aşamalar 1/3 yıldızla eksik filtresinde
    const legacy = parseSaveString(JSON.stringify({ ...s, version: 8, mastery: undefined }))!;
    expect(regionRouteSummary(legacy, forest).counts.missing).toBe(8);
    expect(firstMissingStage(legacy, forest)!.id).toBe(ids[0]);
  });
});
