import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getDungeon, computeDungeonEnemies } from '../src/data/dungeons';
import { TOTAL_STAGES, WORLD_REGIONS, findStageById, getNextStageAfter } from '../src/data/world';
import { createInitialSaveState, parseSaveString } from '../src/utils/storage';
import { getRegionStatuses, isStageUnlocked } from '../src/utils/worldProgress';

type Json = {
  afterRegionId: string;
  stageCount: number;
  regions: {
    id: string; name: string; icon: string; arc: number; orderAfterEternity: number; bossWeakness: string; bossResistance: string;
    enemyArchetypes: { normal: string; elite: string; boss: string };
    stages: { id: string; order: number; name: string; type: string; enemyName?: string; bossId?: string }[];
  }[];
};
const json: Json = JSON.parse(readFileSync(new URL('../src/data/expansionRegions.json', import.meta.url), 'utf8'));
const all = WORLD_REGIONS.flatMap((r) => r.stages);
const newRegions = WORLD_REGIONS.slice(28);
const newStages = newRegions.flatMap((r) => r.stages);
const save = (completed: string[], bossVictories: string[] = []) =>
  ({ ...createInitialSaveState(), completedStages: completed, bossVictories } as ReturnType<typeof createInitialSaveState>);

describe('Sonsuzluğun Ötesi expansion (25 regions / 250 stages)', () => {
  it('adds exactly 25 regions and 250 stages after the eternity throne; old ids are untouched', () => {
    expect(json.afterRegionId).toBe('eternity');
    expect(newRegions).toHaveLength(25);
    expect(newStages).toHaveLength(250);
    expect(TOTAL_STAGES).toBe(500);
    expect(WORLD_REGIONS[27].id).toBe('eternity');
    expect(all[249].id).toBe('eternity_10');
    expect(all[250].id).toBe('glass_forest_1');
    expect(new Set(all.map((s) => s.id)).size).toBe(500);
  });

  it('uses the region, stage and boss ids and names from the JSON, in the given order', () => {
    const ordered = json.regions.slice().sort((a, b) => a.orderAfterEternity - b.orderAfterEternity);
    expect(newRegions.map((r) => r.id)).toEqual(ordered.map((r) => r.id));
    for (const jr of ordered) {
      const r = WORLD_REGIONS.find((x) => x.id === jr.id)!;
      expect(r.name).toBe(jr.name);
      expect(r.stages.map((s) => s.id)).toEqual(jr.stages.map((s) => s.id));
      expect(r.stages.map((s) => s.name)).toEqual(jr.stages.map((s) => s.name));
      expect(r.stages.map((s) => s.type)).toEqual(jr.stages.map((s) => s.type));
      const boss = r.stages[9];
      expect(boss.enemy.isBoss).toBe(true);
      expect(boss.enemy.bossId).toBe(jr.stages[9].bossId);
      expect(boss.enemy.name).toBe(jr.stages[9].enemyName);
      expect(boss.enemy.weakness).toBe(jr.bossWeakness);
      expect(boss.enemy.resistance).toBe(jr.bossResistance);
      expect(boss.enemy.visualArchetype).toBe(jr.enemyArchetypes.boss);
      r.stages.forEach((s, i) => {
        if (s.type === 'normal') expect(s.enemy.visualArchetype).toBe(jr.enemyArchetypes.normal);
        if (s.type === 'elite') expect(s.enemy.visualArchetype).toBe(jr.enemyArchetypes.elite);
        if (s.type !== 'boss') expect(s.enemy.isBoss).toBe(false);
        expect(s.regionId).toBe(jr.id);
        expect(s.stageNumber).toBe(i + 1);
      });
    }
    expect(all.filter((s) => s.type === 'boss')).toHaveLength(59);
    expect(new Set(newStages.filter((s) => s.enemy.bossId).map((s) => s.enemy.bossId)).size).toBe(25);
  });

  it('each stage pattern follows the existing rules: 5 normal-ish, treasure, elites, boss last; treasure/elite/boss guarantee loot', () => {
    for (const r of newRegions) {
      expect(r.stages.map((s) => s.type)).toEqual(['normal', 'normal', 'treasure', 'normal', 'elite', 'normal', 'elite', 'normal', 'elite', 'boss'].map((t, i) => (i === 7 ? 'normal' : t)));
      for (const s of r.stages) {
        if (s.type === 'boss') expect(s.rewards.guaranteedRarity).toBe('mythic');
        if (s.type === 'elite' || s.type === 'treasure') expect(s.rewards.guaranteedRarity).toBe('legendary');
        expect(s.rewards.dropChance).toBe(s.type === 'normal' ? 0.72 : 1);
      }
    }
  });

  it('binds each of the 25 icons to the right region (file name = region id = JSON icon path)', () => {
    const files = readdirSync(new URL('../src/art/regions/', import.meta.url));
    for (const jr of json.regions) {
      expect(jr.icon).toBe(`icons/${jr.id}.png`);
      expect(files).toContain(`${jr.id}.webp`);
    }
    expect(json.regions).toHaveLength(25);
  });

  it('stat curve continues from the eternity stages without a jump, and rises region after region', () => {
    const eternityBoss = all[249].enemy;
    const firstNew = all[250].enemy;
    // ilk yeni normal aşama, Sonsuzluk'un normal aşamalarıyla aynı seviyede (Sv. 93) ve aynı büyüklükte
    const eternityNormal = all[246].enemy; // eternity_7? (elit) -> use normal one below
    void eternityNormal;
    const eternityNormals = all.slice(240, 250).filter((s) => s.type === 'normal').map((s) => s.enemy.maxHp);
    expect(firstNew.maxHp).toBeGreaterThanOrEqual(Math.max(...eternityNormals));
    expect(firstNew.maxHp).toBeLessThan(eternityBoss.maxHp);
    for (const type of ['normal', 'elite', 'boss'] as const) {
      const per = newRegions.map((r) => r.stages.find((s) => s.type === type)!.enemy);
      for (let i = 1; i < per.length; i++) {
        expect(per[i].maxHp, `${type} hp ${i}`).toBeGreaterThan(per[i - 1].maxHp);
        expect(per[i].attack, `${type} atk ${i}`).toBeGreaterThan(per[i - 1].attack);
      }
    }
    const last = newRegions[24].stages[9];
    expect(last.enemy.maxHp / eternityBoss.maxHp).toBeLessThan(2.6); // yumuşak eğri: son boss ≈2,2× Sonsuzluk İmparatoru
    expect(last.enemy.level).toBe(168);
    expect(newRegions[0].stages[0].recommendedLevel).toBe(93);
  });

  it('whole route is reachable: finishing stages in order opens every next stage up to dawn_core_10', () => {
    let done: string[] = all.slice(0, 250).map((s) => s.id); // eski hikâye bitti
    expect(isStageUnlocked(save(done), 'glass_forest_1')).toBe(true);
    expect(isStageUnlocked(save(done), 'glass_forest_2')).toBe(false);
    for (let i = 250; i < 500; i++) {
      expect(isStageUnlocked(save(done), all[i].id), all[i].id).toBe(true);
      if (i + 1 < 500) expect(isStageUnlocked(save(done), all[i + 1].id), all[i + 1].id).toBe(false);
      done = [...done, all[i].id];
    }
    const st = getRegionStatuses(save(done));
    expect(st).toHaveLength(53);
    expect(st.every((r) => r.cleared && r.unlocked)).toBe(true);
    expect(getNextStageAfter('eternity_10')?.id).toBe('glass_forest_1');
    expect(getNextStageAfter('dawn_core_10')).toBeNull();
    expect(findStageById('dawn_core_10')?.region.name).toBe('Şafağın Çekirdeği');
  });

  it('old saves: Cam Ormanı opens with the cleared throne, or from the Eternity Emperor victory alone; locked otherwise', () => {
    const old = all.slice(0, 249).map((s) => s.id);
    expect(isStageUnlocked(save(old), 'glass_forest_1')).toBe(false);
    expect(isStageUnlocked(save(old.concat('eternity_10')), 'glass_forest_1')).toBe(true);
    expect(isStageUnlocked(save(old, ['eternity_emperor']), 'glass_forest_1')).toBe(true);
    expect(isStageUnlocked(save(old, ['eternity_emperor']), 'glass_forest_2')).toBe(false);
    const statuses = getRegionStatuses(save(old, ['eternity_emperor']));
    expect(statuses[28].unlocked).toBe(true);
    expect(statuses[29].unlocked).toBe(false);
  });

  it('an old save (v8, 250 stages cleared) loads with its ids and shows progress 250/500', () => {
    const s = createInitialSaveState();
    const raw = { ...s, version: 8, completedStages: all.slice(0, 250).map((x) => x.id), bossVictories: ['eternity_emperor'] };
    const loaded = parseSaveString(JSON.stringify(raw))!;
    expect(loaded.completedStages).toHaveLength(250);
    expect(loaded.completedStages.length + '/' + TOTAL_STAGES).toBe('250/500');
    expect(isStageUnlocked(loaded, 'glass_forest_1')).toBe(true);
  });

  it('Köklerin Mahzeni keeps its own hero-level scaling and is not touched by the expansion', () => {
    const def = getDungeon('roots_vault');
    expect(def.battles.map((b) => b.stageId)).toEqual(['forest_1', 'forest_4', 'forest_5']);
    expect(computeDungeonEnemies(def, 6).map((e) => [e.hp, e.attack])).toEqual([[1559, 350], [5394, 468], [9306, 296]]);
  });
});
