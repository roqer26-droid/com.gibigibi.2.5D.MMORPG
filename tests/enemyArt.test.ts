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
    expect(withArt.length).toBeGreaterThanOrEqual(25);
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
    expect(Object.keys(ENEMY_ART_BY_ID).length).toBeGreaterThanOrEqual(25);
  });
  it('bosslar normal düşmanlardan yüksek, havadakiler süzülür', () => {
    const bosses = allEnemies.filter((e) => e.isBoss && enemyArtKey(e.id));
    expect(bosses.length).toBe(6);
    for (const b of bosses) expect(ENEMY_ART_LAYOUT[enemyArtKey(b.id)!].height).toBeGreaterThanOrEqual(0.6);
    for (const id of ['flame_elemental', 'obsidian_vault_guard', 'void_stalker']) expect(ENEMY_ART_LAYOUT[id].bob).toBeGreaterThan(0);
    for (const id of ['shadow_wolf', 'mountain_yeti', 'stone_sentinel']) expect(ENEMY_ART_LAYOUT[id].float ?? 0).toBe(0);
  });
  it('aynı arketipi paylaşan diğer düşmanlar eski çizimini korur', () => {
    for (const id of ['mountains_7_enemy', 'volcano_7_enemy', 'ruins_6_enemy', 'ruins_7_enemy', 'abyss_7_enemy']) {
      expect(allEnemies.some((e) => e.id === id), id).toBe(true);
      expect(enemyArtKey(id), id).toBeNull();
    }
  });
});

describe('v1.22.0: genişleme 20 düşman', () => {
  const NEW20 = ['dikenli_yaban_domuzu', 'kutsal_koru_bekcisi', 'buzul_dev_avcisi', 'magma_fenrisi', 'ucurum_celladi', 'gok_hazine_kartali', 'bulut_kartali', 'firtina_sovalyesi', 'deniz_yilani', 'col_akrebi', 'mumya_muhafiz', 'sis_cadisi', 'ay_kurdu', 'elmas_golem', 'kul_zombisi', 'zaman_kurdu', 'kan_yarasasi', 'buz_ejderi_yavrusu', 'yavru_ejderha', 'kaos_lordu'];
  it('20 çizim de en az bir mevcut aşama düşmanına bağlı; ölçü ve yerleşimi var', () => {
    for (const key of NEW20) {
      const ids = Object.entries(ENEMY_ART_BY_ID).filter(([, k]) => k === key).map(([id]) => id);
      expect(ids.length, key).toBeGreaterThan(0);
      for (const id of ids) expect(allEnemies.some((e) => e.id === id), id).toBe(true);
      expect(ENEMY_ART_META[key], key).toBeTruthy();
      expect(ENEMY_ART_LAYOUT[key], key).toBeTruthy();
    }
  });
  it('şablon tekrarları aynı adlı düşmanlara bağlı (Elit varyantı dahil), başka adlara değil', () => {
    for (const [id, key] of Object.entries(ENEMY_ART_BY_ID)) {
      if (!NEW20.includes(key)) continue;
      const e = allEnemies.find((x) => x.id === id)!;
      const base = e.name.replace(/^Elit /, '');
      const sameName = allEnemies.filter((x) => x.name.replace(/^Elit /, '') === base).map((x) => x.id);
      for (const sid of sameName) expect(ENEMY_ART_BY_ID[sid], `${base}:${sid}`).toBe(key);
    }
  });
  it('Gök Hazine Kartalı, Bulut Kartalı, Ay Kurdu, Zaman Kurdu, Magma Fenrisi, Buz Ejderi Yavrusu ve Yavru Ejderha ayrı çizim', () => {
    const keys = ['sky_3_enemy', 'sky_1_enemy', 'moonlit_1_enemy', 'time_rift_7_enemy', 'volcano_6_enemy', 'eternal_winter_1_enemy', 'dragon_roost_1_enemy'].map((i) => ENEMY_ART_BY_ID[i]);
    expect(new Set(keys).size).toBe(7);
    expect(ENEMY_ART_BY_ID['sky_3_enemy']).toBe('gok_hazine_kartali');
  });
  it('aynı şablon türünü paylaşan paket dışı düşman eski çizimini korur', () => {
    const arch = new Set(Object.keys(ENEMY_ART_BY_ID).map((id) => allEnemies.find((e) => e.id === id)!.visualArchetype));
    const outsiders = allEnemies.filter((e) => arch.has(e.visualArchetype) && !ENEMY_ART_BY_ID[e.id]);
    expect(outsiders.length).toBeGreaterThan(100);
    for (const e of outsiders.slice(0, 50)) expect(enemyArtKey(e.id)).toBeNull();
  });
  it('havadakiler süzülür, gerçek bosslar bu pakette değil', () => {
    for (const k of ['bulut_kartali', 'gok_hazine_kartali', 'kan_yarasasi', 'sis_cadisi']) expect(ENEMY_ART_LAYOUT[k].bob).toBeGreaterThan(0);
    for (const id of Object.keys(ENEMY_ART_BY_ID).filter((i) => NEW20.includes(ENEMY_ART_BY_ID[i]))) expect(allEnemies.find((e) => e.id === id)!.isBoss, id).toBe(false);
  });
});
