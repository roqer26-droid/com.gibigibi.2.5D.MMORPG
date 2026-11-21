import { describe, expect, it } from 'vitest';
import { ENEMY_ART_BY_ID, ENEMY_ART_LAYOUT, ENEMY_ART_META, enemyArtKey } from '../src/data/enemyArt';
import { WORLD_REGIONS } from '../src/data/world';

const allEnemies = WORLD_REGIONS.flatMap((r) => r.stages.map((s) => s.enemy));

describe('düşman görselleri', () => {
  it('dört düşman kimliği var ve aşamalarda bulunuyor', () => {
    for (const id of Object.keys(ENEMY_ART_BY_ID)) expect(allEnemies.some((e) => e.id === id), id).toBe(true);
    for (const key of Object.values(ENEMY_ART_BY_ID)) {
      expect(ENEMY_ART_META[key].aspect).toBeGreaterThan(0.5);
      expect(ENEMY_ART_LAYOUT[key].height).toBeLessThanOrEqual(0.86);
    }
  });
  it('yalnızca hedeflenen düşman özel görsel alır; aynı arketipi paylaşanlar etkilenmez', () => {
    const withArt = allEnemies.filter((e) => enemyArtKey(e.id));
    expect(withArt.map((e) => e.id).sort()).toEqual(['boss_frost_queen', 'boss_shadow_demon', 'elder_treant', 'goblin_raider']);
    const others = allEnemies.filter((e) => ['treant', 'shadow_demon', 'goblin', 'frost_queen'].includes(e.visualArchetype) && !enemyArtKey(e.id));
    expect(others.length).toBeGreaterThan(0);
    expect(others.some((e) => e.visualArchetype === 'treant')).toBe(true);
    expect(others.some((e) => e.visualArchetype === 'shadow_demon')).toBe(true);
  });
});
