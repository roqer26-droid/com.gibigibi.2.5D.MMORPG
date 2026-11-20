import { describe, expect, it } from 'vitest';
import {
  CHEST_REWARD_MULT,
  REGION_OBJECTIVES,
  applyStageMastery,
  chestReward,
  chestThresholds,
  claimMasteryChest,
  enemySupports,
  getStageObjectives,
  objectiveRequirement,
  objectiveText,
  regionMastery,
  sanitizeMastery,
  stageStars,
} from '../src/data/mastery';
import { WORLD_REGIONS } from '../src/data/world';
import {
  createMasteryState,
  onEnemyAction,
  onFrozenCleared,
  onResolve,
  progressOf,
  setMoveKind,
  startTurn,
} from '../src/game/masteryTracker';
import type { GameSaveState, GemType } from '../src/types/game';
import { createInitialSaveState, parseSaveString } from '../src/utils/storage';

const all = WORLD_REGIONS.flatMap((r) => r.stages);
const stage = (id: string) => all.find((s) => s.id === id)!;
const fresh = (): GameSaveState => createInitialSaveState();
const counts = (c: Partial<Record<GemType, number>>): Record<GemType, number> => ({ fire: 0, frost: 0, nature: 0, lightning: 0, arcane: 0, golden: 0, ...c });

describe('mastery objective data (500 stages)', () => {
  it('every one of the 500 stages has exactly two distinct, valid objectives', () => {
    expect(all).toHaveLength(500);
    for (const st of all) {
      const [a, b] = getStageObjectives(st.id);
      expect(a, st.id).toBeTruthy();
      expect(b, st.id).toBeTruthy();
      expect(JSON.stringify(a), `${st.id} objectives differ`).not.toBe(JSON.stringify(b));
      for (const o of [a, b]) {
        expect(o.count).toBeGreaterThanOrEqual(1);
        expect(o.count).toBeLessThanOrEqual(5);
        if (o.kind === 'gem_turns' || o.kind === 'gem_burst') expect(o.gem).toBeTruthy();
        expect(objectiveText(o).length).toBeGreaterThan(5);
      }
    }
    for (const r of WORLD_REGIONS) expect(REGION_OBJECTIVES[r.id], r.id).toBeTruthy();
  });

  it('conditional objectives (heavy attack / frozen tiles) only sit on stages whose enemy can actually do that', () => {
    let heavy = 0;
    let frozen = 0;
    for (const st of all) {
      for (const o of getStageObjectives(st.id)) {
        const req = objectiveRequirement(o);
        expect(enemySupports(st.enemy, req), `${st.id} ${o.kind}`).toBe(true);
        if (o.kind === 'block_heavy') heavy++;
        if (o.kind === 'clear_frozen') {
          frozen++;
          expect(st.enemy.bossId).toBe('frost_queen');
        }
      }
    }
    expect(frozen).toBe(1);
    expect(heavy).toBeGreaterThan(10);
    // ağır saldırı hedefi olan her aşama bir boss aşamasıdır
    for (const st of all) if (getStageObjectives(st.id).some((o) => o.kind === 'block_heavy')) expect(st.enemy.isBoss).toBe(true);
  });

  it('follows the stone themes and examples from the spec', () => {
    const t = (id: string) => getStageObjectives(id).map((o) => objectiveText(o));
    expect(t('forest_1')).toEqual(['Savaşta 2 adet 2×2 kare oluştur', '3 ayrı turda doğa taşı eşleştir']);
    expect(t('mountains_1')[0]).toBe('3 ayrı turda buz taşı eşleştir');
    const queen = all.find((s) => s.enemy.bossId === 'frost_queen')!;
    expect(t(queen.id)[1]).toBe('Savaşta bir donmuş taşı temizle');
    expect(t('mountains_1')[1]).not.toContain('donmuş');
    expect(t('volcano_1')[0]).toBe('Tek turda en az 4 ateş taşı temizle');
    const volcBoss = WORLD_REGIONS.find((r) => r.id === 'volcano')!.stages.find((s) => s.enemy.isBoss)!;
    expect(t(volcBoss.id)[1]).toBe('Ağır saldırıyı bir kez engelle');
    expect(t('glass_forest_1')).toEqual(['Savaşta 2 adet 2×2 kare oluştur', 'Tek hamlede 3 adımlık zincirleme eşleşme yap']);
    expect(t('glass_forest_10')).toEqual(t('glass_forest_1'));
  });
});

describe('star rules', () => {
  const s1 = stage('forest_1');

  it('first victory gives the victory star; objectives are separate and may come in different wins', () => {
    let save = fresh();
    let r = applyStageMastery(save, s1, [true, false]);
    expect(r.outcome.earned).toEqual({ victory: true, o1: true, o2: false });
    expect(r.outcome.stars.count).toBe(2);
    save = r.save;
    expect(save.completedStages).toContain('forest_1');
    // ikinci zafer: yalnızca eksik hedef; zaten kazanılanlar tekrar verilmez
    r = applyStageMastery(save, s1, [true, true]);
    expect(r.outcome.earned).toEqual({ victory: false, o1: false, o2: true });
    expect(r.outcome.stars.count).toBe(3);
    save = r.save;
    r = applyStageMastery(save, s1, [true, true]);
    expect(r.outcome.earned).toEqual({ victory: false, o1: false, o2: false });
    expect(r.save.mastery).toBe(save.mastery); // değişiklik yok
    expect(save.mastery.objectives.forest_1).toEqual({ o1: true, o2: true });
  });

  it('a first win with no objective done gives exactly one star', () => {
    const r = applyStageMastery(fresh(), s1, [false, false]);
    expect(r.outcome.stars).toMatchObject({ victory: true, o1: false, o2: false, count: 1 });
    expect(r.save.mastery.objectives.forest_1).toBeUndefined();
  });

  it('old saves: completed stages already carry the victory star; the two objectives can be earned by replaying', () => {
    const old = { ...fresh(), completedStages: ['forest_1', 'forest_2'] };
    expect(stageStars(old, 'forest_1')).toMatchObject({ victory: true, o1: false, o2: false, count: 1 });
    expect(stageStars(old, 'forest_3').count).toBe(0);
    const r = applyStageMastery(old, s1, [true, true]);
    expect(r.outcome.earned).toEqual({ victory: false, o1: true, o2: true });
    expect(r.outcome.stars.count).toBe(3);
    const loaded = parseSaveString(JSON.stringify({ ...old, version: 8, mastery: undefined }))!;
    expect(loaded.mastery).toEqual({ objectives: {}, chests: [] });
    expect(stageStars(loaded, 'forest_2').victory).toBe(true);
  });

  it('victory flow keeps unlock rules: stars never change completedStages beyond the won stage', () => {
    const r = applyStageMastery(fresh(), stage('forest_3'), [true, true]);
    expect(r.save.completedStages).toEqual(['forest_3']);
  });

  it('sanitizeMastery drops unknown stages / chests and keeps valid ones', () => {
    const m = sanitizeMastery({ objectives: { forest_1: { o1: true, o2: false }, nope_1: { o1: true }, forest_2: { o1: false, o2: false } }, chests: ['forest:0', 'forest:7', 'xx:1', 5] });
    expect(m.objectives).toEqual({ forest_1: { o1: true, o2: false } });
    expect(m.chests).toEqual(['forest:0']);
    expect(sanitizeMastery(null)).toEqual({ objectives: {}, chests: [] });
  });
});

describe('region chests', () => {
  const forest = WORLD_REGIONS.find((r) => r.id === 'forest')!;
  const glass = WORLD_REGIONS.find((r) => r.id === 'glass_forest')!;
  const withStars = (region: typeof forest, stars: number): GameSaveState => {
    const save = fresh();
    const objectives: GameSaveState['mastery']['objectives'] = {};
    const completed: string[] = [];
    let left = stars;
    for (const st of region.stages) {
      const v = left > 0 ? 1 : 0; left -= v;
      const a = left > 0 ? 1 : 0; left -= a;
      const b = left > 0 ? 1 : 0; left -= b;
      if (v) completed.push(st.id);
      if (a || b) objectives[st.id] = { o1: !!a, o2: !!b };
    }
    return { ...save, completedStages: completed, mastery: { objectives, chests: [] } };
  };

  it('thresholds are 50% / 75% / 100% of the region total (10 stages: 15, 23, 30)', () => {
    expect(chestThresholds(30)).toEqual([15, 23, 30]);
    expect(chestThresholds(24)).toEqual([12, 18, 24]);
    expect(regionMastery(fresh(), glass).chests.map((c) => c.threshold)).toEqual([15, 23, 30]);
    expect(regionMastery(fresh(), forest).chests.map((c) => c.threshold)).toEqual([12, 18, 24]);
    expect(regionMastery(fresh(), glass).max).toBe(30);
  });

  it('a chest opens only with enough stars, once per region, with reward + claimed flag in one update', () => {
    const low = withStars(glass, 14);
    const refused = claimMasteryChest(low, 'glass_forest', 0);
    expect(refused.ok).toBe(false);
    expect(refused.save).toBe(low);
    expect(regionMastery(low, glass).toNextChest).toBe(1);

    const ready = withStars(glass, 15);
    expect(regionMastery(ready, glass).chests[0].claimable).toBe(true);
    const r = claimMasteryChest(ready, 'glass_forest', 0);
    expect(r.ok).toBe(true);
    expect(r.save.mastery.chests).toEqual(['glass_forest:0']);
    expect(r.save.gold).toBe(ready.gold + r.reward!.gold);
    expect(r.save.crystals).toBe(ready.crystals + r.reward!.crystals);
    expect(r.save.inventory.length).toBe(ready.inventory.length + 1);
    // ikinci kez alınamaz
    const again = claimMasteryChest(r.save, 'glass_forest', 0);
    expect(again.ok).toBe(false);
    expect(again.save.gold).toBe(r.save.gold);
    expect(again.save.inventory.length).toBe(r.save.inventory.length);
    expect(regionMastery(r.save, glass).chests[0]).toMatchObject({ claimed: true, claimable: false });
    // sandıklar bölge başına: başka bölgenin 0. sandığı ayrı
    expect(claimMasteryChest(withStars(forest, 12), 'forest', 0).ok).toBe(true);
  });

  it('stars stay as total progress after a chest is claimed', () => {
    const s = claimMasteryChest(withStars(glass, 23), 'glass_forest', 1).save;
    expect(regionMastery(s, glass).stars).toBe(23);
    expect(regionMastery(s, glass).chests.map((c) => c.claimable)).toEqual([true, false, false]);
  });

  it('chest rewards follow the region boss reward curve and rise with level and tier', () => {
    const boss = glass.stages[9];
    const r = [0, 1, 2].map((t) => chestReward(glass, t as 0 | 1 | 2));
    expect(r[1].gold).toBe(Math.round(boss.rewards.gold * CHEST_REWARD_MULT[1]));
    expect(r[2].gold).toBeGreaterThan(r[0].gold);
    expect(r[2].rarity).toBe(boss.rewards.guaranteedRarity);
    const early = chestReward(forest, 2);
    expect(r[2].gold).toBeGreaterThan(early.gold * 3);
    expect(early.level).toBeLessThanOrEqual(50);
  });
});

describe('battle tracker (real battle events)', () => {
  it('counts resolved 2×2 squares across resolution steps', () => {
    let s = setMoveKind(startTurn(createMasteryState()), true);
    s = onResolve(s, counts({ nature: 4 }), 1);
    s = onResolve(s, counts({ fire: 4 }), 1);
    expect(progressOf(s, { kind: 'squares', count: 2 })).toEqual({ current: 2, target: 2, done: true });
  });

  it('gem_turns counts distinct turns, not steps within a turn', () => {
    let s = createMasteryState();
    s = setMoveKind(startTurn(s), true);
    s = onResolve(s, counts({ nature: 3 }), 0);
    s = onResolve(s, counts({ nature: 3 }), 0); // aynı turda zincir
    expect(s.gemTurns.nature).toBe(1);
    s = setMoveKind(startTurn(s), true);
    s = onResolve(s, counts({ nature: 3 }), 0);
    s = setMoveKind(startTurn(s), true);
    s = onResolve(s, counts({ frost: 3 }), 0);
    expect(s.gemTurns.nature).toBe(2);
    s = setMoveKind(startTurn(s), true);
    s = onResolve(s, counts({ nature: 3 }), 0);
    expect(progressOf(s, { kind: 'gem_turns', gem: 'nature', count: 3 }).done).toBe(true);
  });

  it('gem_burst sums one turn including cascades and resets next turn', () => {
    let s = setMoveKind(startTurn(createMasteryState()), true);
    s = onResolve(s, counts({ fire: 3 }), 0);
    expect(progressOf(s, { kind: 'gem_burst', gem: 'fire', count: 4 }).done).toBe(false);
    s = onResolve(s, counts({ fire: 1 }), 0);
    expect(progressOf(s, { kind: 'gem_burst', gem: 'fire', count: 4 }).done).toBe(true);
    s = setMoveKind(startTurn(s), true);
    s = onResolve(s, counts({ fire: 3 }), 0);
    expect(s.bestBurst.fire).toBe(4);
    expect(s.turnGems.fire).toBe(3);
  });

  it('chain counts resolution steps of one swap move only (skills do not chain)', () => {
    let s = setMoveKind(startTurn(createMasteryState()), true);
    s = onResolve(onResolve(s, counts({ fire: 3 }), 0), counts({ frost: 3 }), 0);
    expect(s.bestChain).toBe(2);
    s = onResolve(s, counts({ nature: 3 }), 0);
    expect(progressOf(s, { kind: 'chain', count: 3 }).done).toBe(true);
    // yeni hamle zinciri sıfırdan sayar; en iyi korunur
    s = setMoveKind(startTurn(s), true);
    s = onResolve(s, counts({ fire: 3 }), 0);
    expect(s.stepsThisMove).toBe(1);
    expect(s.bestChain).toBe(3);
    // yetenek turu: zincir artmaz
    let k = setMoveKind(startTurn(createMasteryState()), false);
    k = onResolve(onResolve(onResolve(k, counts({ fire: 3 }), 0), counts({ fire: 3 }), 0), counts({ fire: 3 }), 0);
    expect(k.bestChain).toBe(0);
  });

  it('heavy attack counts only when truly cancelled or fully absorbed by shield; delays and damage do not', () => {
    let s = createMasteryState();
    s = onEnemyAction(s, { kind: 'attack' }, { cancelled: true, hpDamage: 0 }); // normal saldırı sayılmaz
    expect(s.heavyBlocked).toBe(0);
    s = onEnemyAction(s, { kind: 'heavy' }, { cancelled: false, hpDamage: 120 }); // hasar aldı
    expect(s.heavyBlocked).toBe(0);
    s = onEnemyAction(s, { kind: 'heavy' }, { cancelled: false, hpDamage: 0 }); // kalkan tamamen karşıladı
    expect(s.heavyBlocked).toBe(1);
    s = onEnemyAction(s, { kind: 'breath' }, { cancelled: true, hpDamage: 0 }); // sıyrılma = iptal
    expect(s.heavyBlocked).toBe(2);
    // geciktirme (donma/sersemletme) eylem çözümüne hiç gelmez: sayaç değişmez
    expect(progressOf(s, { kind: 'block_heavy', count: 2 }).done).toBe(true);
    expect(progressOf(createMasteryState(), { kind: 'block_heavy', count: 1 }).done).toBe(false);
  });

  it('frozen tiles cleared accumulate', () => {
    let s = onFrozenCleared(createMasteryState(), 0);
    expect(progressOf(s, { kind: 'clear_frozen', count: 1 }).done).toBe(false);
    s = onFrozenCleared(s, 1);
    expect(progressOf(s, { kind: 'clear_frozen', count: 1 }).done).toBe(true);
  });
});
