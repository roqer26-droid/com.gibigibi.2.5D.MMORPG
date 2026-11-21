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
    expect(withArt.length).toBe(25);
    for (const id of ['boss_frost_queen', 'boss_shadow_demon', 'elder_treant', 'goblin_raider']) expect(withArt.some((e) => e.id === id), id).toBe(true);
    const others = allEnemies.filter((e) => ['treant', 'shadow_demon', 'goblin', 'frost_queen'].includes(e.visualArchetype) && !enemyArtKey(e.id));
    expect(others.length).toBeGreaterThan(0);
    expect(others.some((e) => e.visualArchetype === 'treant')).toBe(true);
  });
});

describe('v1.21.0: 21 düşman görseli', () => {
  const IDS21 = ['shadow_wolf', 'moss_sentinel', 'boss_forest_guardian', 'frost_wolf', 'mountain_yeti', 'crystal_ice_golem', 'elite_ice_golem', 'lava_salamander', 'flame_elemental', 'obsidian_vault_guard', 'magma_lord', 'boss_infernal_dragon', 'stone_sentinel', 'void_stalker', 'prism_warden', 'boss_crystal_titan', 'abyss_stalker', 'abyss_colossus', 'mythic_vault_keeper', 'abyss_general', 'boss_abyssal_king'];
  it('21 kimlik de tek bir aşamaya bağlı düşmanı çözümler ve görsel/ölçü/yerleşimi var', () => {
    for (const id of IDS21) {
      const key = enemyArtKey(id);
      expect(key, id).toBe(id);
      expect(allEnemies.filter((e) => e.id === id).length, id).toBe(1);
      expect(ENEMY_ART_META[key!], id).toBeTruthy();
      expect(ENEMY_ART_LAYOUT[key!], id).toBeTruthy();
    }
    expect(Object.keys(ENEMY_ART_BY_ID).length).toBe(25);
  });
  it('bosslar normal düşmanlardan yüksek, havadakiler süzülür', () => {
    const bosses = allEnemies.filter((e) => e.isBoss && enemyArtKey(e.id));
    expect(bosses.length).toBe(6);
    for (const b of bosses) expect(ENEMY_ART_LAYOUT[enemyArtKey(b.id)!].height).toBeGreaterThanOrEqual(0.6);
    for (const id of ['flame_elemental', 'obsidian_vault_guard', 'void_stalker']) expect(ENEMY_ART_LAYOUT[id].bob).toBeGreaterThan(0);
    for (const id of ['shadow_wolf', 'mountain_yeti', 'stone_sentinel']) expect(ENEMY_ART_LAYOUT[id].float ?? 0).toBe(0);
  });
  it('aynı arketipi paylaşan diğer düşmanlar eski çizimini korur', () => {
    for (const id of ['forest_6_enemy', 'forest_7_enemy', 'mountains_6_enemy', 'volcano_7_enemy', 'abyss_7_enemy']) {
      expect(allEnemies.some((e) => e.id === id), id).toBe(true);
      expect(enemyArtKey(id), id).toBeNull();
    }
  });
});
