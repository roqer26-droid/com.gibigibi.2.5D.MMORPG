import { describe, expect, it } from 'vitest';
import { ENEMY_ART_BY_ID, ENEMY_ART_LAYOUT, ENEMY_ART_META, ENEMY_BREATH_DEFAULT, ENEMY_FLOATING_ARCHETYPES, clampBreathSec, enemyArtKey } from '../src/data/enemyArt';
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
    expect(bosses.length).toBe(36);
    for (const b of bosses) expect(ENEMY_ART_LAYOUT[enemyArtKey(b.id)!].height).toBeGreaterThanOrEqual(0.5);
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

describe('v1.23.0: beş bölge bossu', () => {
  const BOSSES: [string, string, string][] = [
    ['forest_lord', 'forest_8_enemy', 'forest_lord'],
    ['frost_giant_king', 'mountains_8_enemy', 'frost_giant_king'],
    ['magma_empress', 'volcano_8_enemy', 'magma_empress'],
    ['rune_emperor', 'ruins_8_enemy', 'rune_emperor'],
    ['abyss_empress', 'abyss_8_enemy', 'abyss_empress'],
  ];
  it('bossId → gerçek enemy.id → çizim; kimlikler oyun verisiyle doğrulanır', () => {
    for (const [bossId, enemyId, key] of BOSSES) {
      const e = allEnemies.find((x) => x.id === enemyId)!;
      expect(e.bossId, enemyId).toBe(bossId);
      expect(e.isBoss).toBe(true);
      expect(enemyArtKey(enemyId)).toBe(key);
      expect(ENEMY_ART_META[key]).toBeTruthy();
      expect(ENEMY_ART_LAYOUT[key].height).toBeLessThanOrEqual(0.76);
    }
    expect(ENEMY_ART_LAYOUT['abyss_empress'].bob).toBeGreaterThan(0);
  });
  it('önceki 45 özel çizimin eşleştirmesi korunur; toplam 155 çizim, 267 düşman kimliği', () => {
    const before = ['goblin_raider', 'elder_treant', 'boss_frost_queen', 'boss_shadow_demon', 'forest_6_enemy', 'sky_3_enemy', 'eternity_6_enemy', 'boss_forest_guardian', 'boss_abyssal_king', 'abyss_general'];
    for (const id of before) expect(enemyArtKey(id), id).toBeTruthy();
    expect(Object.keys(ENEMY_ART_BY_ID).length).toBe(267);
    expect(new Set(Object.values(ENEMY_ART_BY_ID)).size).toBe(155);
  });
  it('Kadim Orman Muhafızı, Elit Magma Lordu, Buzul Dev Avcısı ve Malakor kendi çizimlerinde kalır', () => {
    expect(enemyArtKey('boss_forest_guardian')).toBe('boss_forest_guardian');
    expect(enemyArtKey('volcano_4_enemy') ?? enemyArtKey('magma_lord')).toBe('magma_lord');
    expect(enemyArtKey('mountains_6_enemy')).toBe('buzul_dev_avcisi');
    expect(enemyArtKey('boss_abyssal_king')).toBe('boss_abyssal_king');
  });
});

describe('v1.24.0: beş yeni bölge düşmanı + ortak nefes', () => {
  const GROUPS: [string, string, number[]][] = [
    ['glass_forest', 'cam_agac_ruhu', [1, 2, 4, 6, 8]],
    ['silent_shore', 'sessiz_yagmaci', [1, 2, 4, 6, 8]],
    ['copper_mines', 'bakir_yagmaci', [1, 2, 4, 6, 8]],
    ['mist_aqueduct', 'sis_bosluk_avcisi', [1, 2, 4, 6, 8]],
    ['thorn_citadel', 'diken_kurt', [1, 2, 4, 6, 8]],
  ];
  it('25 kimlik, 5 ayrı çizime bağlı; hepsi bölgenin NORMAL aşamasında ve aynı adlı', () => {
    let total = 0;
    for (const [region, key, nums] of GROUPS) {
      const names = new Set<string>();
      for (const n of nums) {
        const id = `${region}_${n}_enemy`;
        const e = allEnemies.find((x) => x.id === id)!;
        expect(e, id).toBeTruthy();
        expect(enemyArtKey(id), id).toBe(key);
        names.add(e.name);
        total++;
      }
      expect(names.size, key).toBe(1);
      expect(ENEMY_ART_META[key]).toBeTruthy();
      expect(ENEMY_ART_LAYOUT[key]).toBeTruthy();
    }
    expect(total).toBe(25);
    expect(new Set(GROUPS.map((g) => g[1])).size).toBe(5);
  });
  it('aynı bölgenin hazine/elit/boss düşmanları kendi görseline sahip değildir (aynı türü paylaşsalar da)', () => {
    for (const id of ['iron_orbit_9_enemy']) {
      expect(enemyArtKey(id), id).toBeNull();
    }
  });
  it('ortak nefes varsayılanları: %1–2 esneme, 2,5–4 sn', () => {
    expect(ENEMY_BREATH_DEFAULT.stretch).toBeGreaterThanOrEqual(0.01);
    expect(ENEMY_BREATH_DEFAULT.stretch).toBeLessThanOrEqual(0.02);
    for (const sec of [ENEMY_BREATH_DEFAULT.normalSec, ENEMY_BREATH_DEFAULT.bossSec]) {
      expect(sec).toBeGreaterThanOrEqual(2.5);
      expect(sec).toBeLessThanOrEqual(4);
    }
    for (const l of Object.values(ENEMY_ART_LAYOUT)) {
      expect(clampBreathSec(l.breathSec)).toBeGreaterThanOrEqual(2.5);
      expect(clampBreathSec(l.breathSec)).toBeLessThanOrEqual(4);
    }
    expect(clampBreathSec(2.2)).toBe(2.5);
    expect(clampBreathSec(9)).toBe(4);
    expect(ENEMY_FLOATING_ARCHETYPES.has('celestial')).toBe(true);
  });
});

describe('v1.25.0: sıradaki beş genişleme düşmanı', () => {
  const GROUPS: [string, string][] = [
    ['amber_dunes', 'kehribar_semender'],
    ['sunken_archive', 'batik_yagmaci'],
    ['salt_bastion', 'tuz_tas_nobetci'],
    ['obsidian_harbor', 'obsidyen_yagmaci'],
    ['black_tide', 'kara_bosluk_avcisi'],
  ];
  it('25 kimlik, 5 ayrı çizime bağlı; hepsi bölgenin aynı adlı normal aşamasında', () => {
    let total = 0;
    for (const [region, key] of GROUPS) {
      const names = new Set<string>();
      for (const n of [1, 2, 4, 6, 8]) {
        const id = `${region}_${n}_enemy`;
        const e = allEnemies.find((x) => x.id === id)!;
        expect(e, id).toBeTruthy();
        expect(enemyArtKey(id), id).toBe(key);
        names.add(e.name);
        total++;
      }
      expect(names.size, key).toBe(1);
      expect(ENEMY_ART_META[key]).toBeTruthy();
      expect(ENEMY_ART_LAYOUT[key]).toBeTruthy();
    }
    expect(total).toBe(25);
  });
  it('aynı bölgenin hazine/elit/boss düşmanları ve önceki paket etkilenmez', () => {
    for (const id of ['echo_terrace_5_enemy']) expect(enemyArtKey(id), id).toBeNull();
    expect(enemyArtKey('glass_forest_1_enemy')).toBe('cam_agac_ruhu');
    expect(enemyArtKey('thorn_citadel_8_enemy')).toBe('diken_kurt');
  });
});

describe('v1.26.0: üçüncü beşli düşman paketi', () => {
  const GROUPS: [string, string][] = [
    ['echo_terrace', 'yanki_bosluk_avcisi'],
    ['mercury_foundry', 'civa_ates_ruhu'],
    ['cinder_garden', 'kor_semender'],
    ['prism_labyrinth', 'prizma_tas_nobetci'],
    ['iron_orbit', 'demir_yagmaci'],
  ];
  it('25 kimlik, 5 ayrı çizime bağlı; hepsi bölgenin aynı adlı normal aşamasında', () => {
    let total = 0;
    for (const [region, key] of GROUPS) {
      const names = new Set<string>();
      for (const n of [1, 2, 4, 6, 8]) {
        const id = `${region}_${n}_enemy`;
        const e = allEnemies.find((x) => x.id === id)!;
        expect(e, id).toBeTruthy();
        expect(enemyArtKey(id), id).toBe(key);
        names.add(e.name);
        total++;
      }
      expect(names.size, key).toBe(1);
      expect(ENEMY_ART_META[key]).toBeTruthy();
      expect(ENEMY_ART_LAYOUT[key]).toBeTruthy();
    }
    expect(total).toBe(25);
    expect(ENEMY_ART_LAYOUT['civa_ates_ruhu'].bob).toBeGreaterThan(0);
    for (const k of ['yanki_bosluk_avcisi', 'kor_semender', 'prizma_tas_nobetci', 'demir_yagmaci']) expect(ENEMY_ART_LAYOUT[k].bob ?? 0, k).toBe(0);
  });
  it('aynı bölgenin hazine/elit/boss düşmanları ve önceki paketler etkilenmez', () => {
    for (const id of ['echo_terrace_5_enemy', 'mercury_foundry_7_enemy', 'prism_labyrinth_5_enemy']) expect(enemyArtKey(id), id).toBeNull();
    expect(enemyArtKey('amber_dunes_1_enemy')).toBe('kehribar_semender');
    expect(enemyArtKey('glass_forest_8_enemy')).toBe('cam_agac_ruhu');
  });
});

describe('v1.27.0: dördüncü beşli düşman seti', () => {
  const GROUPS: [string, string][] = [
    ['aurora_vault', 'kutup_buz_golemi'],
    ['dream_marsh', 'dus_agac_ruhu'],
    ['mirror_court', 'ayna_bosluk_avcisi'],
    ['midnight_observatory', 'gece_bosluk_avcisi'],
    ['hollow_sun', 'sonuk_ates_ruhu'],
  ];
  it('25 kimlik, 5 ayrı çizime bağlı; hepsi bölgenin aynı adlı normal aşamasında', () => {
    let total = 0;
    for (const [region, key] of GROUPS) {
      const names = new Set<string>();
      for (const n of [1, 2, 4, 6, 8]) {
        const id = `${region}_${n}_enemy`;
        const e = allEnemies.find((x) => x.id === id)!;
        expect(e, id).toBeTruthy();
        expect(enemyArtKey(id), id).toBe(key);
        names.add(e.name);
        total++;
      }
      expect(names.size, key).toBe(1);
      expect(ENEMY_ART_META[key]).toBeTruthy();
      expect(ENEMY_ART_LAYOUT[key]).toBeTruthy();
    }
    expect(total).toBe(25);
    expect(ENEMY_ART_LAYOUT['sonuk_ates_ruhu'].bob).toBeGreaterThan(0);
    for (const k of ['kutup_buz_golemi', 'dus_agac_ruhu', 'ayna_bosluk_avcisi', 'gece_bosluk_avcisi']) expect(ENEMY_ART_LAYOUT[k].bob ?? 0, k).toBe(0);
  });
  it('Ayna ve Gece Boşluk Avcıları aynı türü paylaşsa da farklı çizim kullanır', () => {
    expect(enemyArtKey('mirror_court_1_enemy')).not.toBe(enemyArtKey('midnight_observatory_1_enemy'));
    expect(allEnemies.find((e) => e.id === 'mirror_court_1_enemy')!.visualArchetype).toBe(allEnemies.find((e) => e.id === 'midnight_observatory_1_enemy')!.visualArchetype);
  });
  it('hazine/elit/boss düşmanları ve önceki setler etkilenmez', () => {
    for (const id of ['aurora_vault_5_enemy', 'dream_marsh_7_enemy', 'midnight_observatory_5_enemy']) expect(enemyArtKey(id), id).toBeNull();
    expect(enemyArtKey('echo_terrace_1_enemy')).toBe('yanki_bosluk_avcisi');
  });
});

describe('v1.28.0: 13 görsel, 33 karşılaşma', () => {
  const NORMAL: [string, string][] = [['comet_bridge', 'kuyruklu_buz_golemi'], ['rune_necropolis', 'run_yagmaci'], ['shattered_sky', 'kirik_bosluk_avcisi'], ['zero_threshold', 'sifir_bosluk_avcisi'], ['dawn_core', 'safak_ates_ruhu']];
  const BOSS: [string, string][] = [['glass_forest', 'camorman_bekcisi'], ['silent_shore', 'sonuk_fenerin_bekcisi'], ['copper_mines', 'bakir_yurekli_golem'], ['mist_aqueduct', 'sisin_mimari'], ['thorn_citadel', 'diken_taci'], ['amber_dunes', 'altin_kabuklu_mahrak'], ['sunken_archive', 'derinliklerin_arsivcisi'], ['salt_bastion', 'surlarin_beyaz_muhafizi']];
  it('5 normal x 5 + 8 boss = 33 kimlik', () => {
    let total = 0;
    for (const [region, key] of NORMAL) {
      const names = new Set<string>();
      for (const n of [1, 2, 4, 6, 8]) {
        const id = `${region}_${n}_enemy`;
        const e = allEnemies.find((x) => x.id === id)!;
        expect(enemyArtKey(id), id).toBe(key);
        expect(e.isBoss).toBe(false);
        names.add(e.name);
        total++;
      }
      expect(names.size).toBe(1);
    }
    for (const [region, key] of BOSS) {
      const id = `${region}_10_enemy`;
      const e = allEnemies.find((x) => x.id === id)!;
      expect(e.isBoss, id).toBe(true);
      expect(enemyArtKey(id), id).toBe(key);
      expect(ENEMY_ART_LAYOUT[key].height).toBeLessThanOrEqual(0.76);
      total++;
    }
    expect(total).toBe(33);
    for (const [, k] of [...NORMAL, ...BOSS]) { expect(ENEMY_ART_META[k], k).toBeTruthy(); expect(ENEMY_ART_LAYOUT[k], k).toBeTruthy(); }
    for (const k of ['safak_ates_ruhu', 'sisin_mimari']) expect(ENEMY_ART_LAYOUT[k].bob).toBeGreaterThan(0);
  });
  it('aynı bölgelerin hazine/elit düşmanları ve önceki setler etkilenmez', () => {
    for (const id of ['comet_bridge_7_enemy', 'zero_threshold_5_enemy']) expect(enemyArtKey(id), id).toBeNull();
    expect(enemyArtKey('glass_forest_1_enemy')).toBe('cam_agac_ruhu');
    expect(enemyArtKey('hollow_sun_8_enemy')).toBe('sonuk_ates_ruhu');
  });
});

describe('v1.29.0: paket 2, 12 bölge bossu', () => {
  const B: [string, string][] = [['obsidian_harbor', 'obsidyen_amiral'], ['black_tide', 'kara_gelgitin_leviathani'], ['echo_terrace', 'bin_sesli_velora'], ['mercury_foundry', 'civa_ustasi_rhodin'], ['cinder_garden', 'kullerin_bahcivani'], ['prism_labyrinth', 'spektrum_muhafizi'], ['iron_orbit', 'demir_gezegenin_kalbi'], ['aurora_vault', 'aurora_anahtarcisi'], ['dream_marsh', 'ruya_dokuyucusu'], ['mirror_court', 'cift_suretli_hukumdar'], ['midnight_observatory', 'yildiz_avcisi_neros'], ['hollow_sun', 'solgun_gunesin_yutucusu']];
  it('12 boss kimliği, 12 ayrı çizim; hepsi gerçek boss', () => {
    for (const [region, key] of B) {
      const id = `${region}_10_enemy`;
      const e = allEnemies.find((x) => x.id === id)!;
      expect(e.isBoss, id).toBe(true);
      expect(enemyArtKey(id), id).toBe(key);
      expect(ENEMY_ART_META[key]).toBeTruthy();
      expect(ENEMY_ART_LAYOUT[key].height).toBeLessThanOrEqual(0.76);
    }
    expect(new Set(B.map((b) => b[1])).size).toBe(12);
    for (const k of ['demir_gezegenin_kalbi', 'solgun_gunesin_yutucusu']) expect(ENEMY_ART_LAYOUT[k].bob).toBeGreaterThan(0);
    for (const [, k] of B.filter((b) => !['demir_gezegenin_kalbi', 'solgun_gunesin_yutucusu'].includes(b[1]))) expect(ENEMY_ART_LAYOUT[k].bob ?? 0, k).toBe(0);
  });
  it('paket 1 + paket 2 birlikte 25 görsel, 45 karşılaşma', () => {
    const P1N = ['comet_bridge', 'rune_necropolis', 'shattered_sky', 'zero_threshold', 'dawn_core'];
    const P1B = ['glass_forest', 'silent_shore', 'copper_mines', 'mist_aqueduct', 'thorn_citadel', 'amber_dunes', 'sunken_archive', 'salt_bastion'];
    const ids = [...P1N.flatMap((r) => [1, 2, 4, 6, 8].map((n) => `${r}_${n}_enemy`)), ...P1B.map((r) => `${r}_10_enemy`), ...B.map(([r]) => `${r}_10_enemy`)];
    expect(ids.length).toBe(45);
    for (const id of ids) expect(enemyArtKey(id), id).toBeTruthy();
    expect(new Set(ids.map((i) => enemyArtKey(i))).size).toBe(25);
  });
  it('bu bölgelerin hazine/elit düşmanları etkilenmez', () => {
    for (const id of ['echo_terrace_7_enemy', 'hollow_sun_7_enemy', 'iron_orbit_9_enemy']) expect(enemyArtKey(id), id).toBeNull();
  });
});

describe('v1.30.0: son beş genişleme bossu, 25 genişleme bossu tamam', () => {
  const B: [string, string][] = [['comet_bridge', 'kopru_kuyruklu_muhafiz'], ['rune_necropolis', 'adsiz_mezar_krali'], ['shattered_sky', 'gokkubbeyi_kiran_velyr'], ['zero_threshold', 'sifirin_bekcisi'], ['dawn_core', 'safagin_kalbi_aurel']];
  it('5 boss kimliği, ayrı çizimler; Mezar Kralı ve Sıfırın Bekçisi süzülür', () => {
    for (const [region, key] of B) {
      const id = `${region}_10_enemy`;
      const e = allEnemies.find((x) => x.id === id)!;
      expect(e.isBoss, id).toBe(true);
      expect(enemyArtKey(id), id).toBe(key);
      expect(ENEMY_ART_META[key]).toBeTruthy();
      expect(ENEMY_ART_LAYOUT[key].height).toBeLessThanOrEqual(0.76);
    }
    for (const k of ['adsiz_mezar_krali', 'sifirin_bekcisi']) expect(ENEMY_ART_LAYOUT[k].bob).toBeGreaterThan(0);
    for (const k of ['kopru_kuyruklu_muhafiz', 'gokkubbeyi_kiran_velyr', 'safagin_kalbi_aurel']) expect(ENEMY_ART_LAYOUT[k].bob ?? 0, k).toBe(0);
  });
  it('25 genişleme bossunun (glass_forest … dawn_core aşama 10) hepsi kendi çizimine bağlı', () => {
    const regions = ['glass_forest', 'silent_shore', 'copper_mines', 'mist_aqueduct', 'thorn_citadel', 'amber_dunes', 'sunken_archive', 'salt_bastion', 'obsidian_harbor', 'black_tide', 'echo_terrace', 'mercury_foundry', 'cinder_garden', 'prism_labyrinth', 'iron_orbit', 'aurora_vault', 'dream_marsh', 'mirror_court', 'midnight_observatory', 'hollow_sun', 'comet_bridge', 'rune_necropolis', 'shattered_sky', 'zero_threshold', 'dawn_core'];
    expect(regions.length).toBe(25);
    const keys = regions.map((r) => {
      const id = `${r}_10_enemy`;
      expect(allEnemies.find((x) => x.id === id)!.isBoss, id).toBe(true);
      expect(enemyArtKey(id), id).toBeTruthy();
      return enemyArtKey(id);
    });
    expect(new Set(keys).size).toBe(25);
  });
  it('aynı bölgelerin normal/elit/hazine eşleşmeleri korunur', () => {
    expect(enemyArtKey('comet_bridge_1_enemy')).toBe('kuyruklu_buz_golemi');
    expect(enemyArtKey('dawn_core_8_enemy')).toBe('safak_ates_ruhu');
    for (const id of ['rune_necropolis_5_enemy', 'shattered_sky_7_enemy']) expect(enemyArtKey(id), id).toBeNull();
  });
});

describe('v1.31.0: ilk beş genişleme hazine karşılaşması', () => {
  const T: [string, string][] = [['glass_forest', 'cam_kozasi'], ['silent_shore', 'fener_sandigi'], ['copper_mines', 'cevher_kasasi'], ['mist_aqueduct', 'sarnic_hazinesi'], ['thorn_citadel', 'dikenli_kasa']];
  it('5 hazine kimliği (aşama 3), ayrı çizimler; yalnızca Sarnıç Hazinesi süzülür', () => {
    for (const [region, key] of T) {
      const id = `${region}_3_enemy`;
      const st = WORLD_REGIONS.flatMap((r) => r.stages).find((s) => s.id === `${region}_3`)!;
      expect(st.type, id).toBe('treasure');
      expect(st.enemy.id).toBe(id);
      expect(enemyArtKey(id), id).toBe(key);
      expect(ENEMY_ART_META[key]).toBeTruthy();
      expect(ENEMY_ART_LAYOUT[key]).toBeTruthy();
      expect((ENEMY_ART_LAYOUT[key].bob ?? 0) > 0, key).toBe(key === 'sarnic_hazinesi');
    }
    expect(new Set(T.map((x) => x[1])).size).toBe(5);
  });
  it('aynı bölgelerin normal/elit/boss eşleşmeleri korunur', () => {
    expect(enemyArtKey('glass_forest_1_enemy')).toBe('cam_agac_ruhu');
    expect(enemyArtKey('thorn_citadel_10_enemy')).toBe('diken_taci');
    expect(enemyArtKey('echo_terrace_9_enemy')).toBeNull();
    expect(enemyArtKey('mercury_foundry_5_enemy')).toBeNull();
  });
});

describe('v1.34.0: ikinci hazine seti', () => {
  const T: [string, string][] = [['amber_dunes', 'kehribar_yigini'], ['sunken_archive', 'muhurlu_katalog'], ['salt_bastion', 'kristal_ambar'], ['obsidian_harbor', 'kirik_capa_sandigi'], ['black_tide', 'gelgit_kasasi'], ['echo_terrace', 'ses_muhuru'], ['mercury_foundry', 'civa_dokum_kasasi'], ['cinder_garden', 'kizil_mantar_sandigi'], ['prism_labyrinth', 'spektrum_hazinesi'], ['iron_orbit', 'yorunge_kasasi']];
  it('10 hazine karşılaşması: bölge + karşılaşma kimliği, ayrı çizimler; yalnızca Ses Mührü salınır', () => {
    const stages = WORLD_REGIONS.flatMap((r) => r.stages);
    for (const [region, key] of T) {
      const treasure = stages.filter((s) => s.regionId === region && s.type === 'treasure');
      expect(treasure.length, region).toBe(1);
      expect(treasure[0].enemy.id).toBe(`${region}_3_enemy`);
      expect(enemyArtKey(treasure[0].enemy.id), region).toBe(key);
      expect(ENEMY_ART_META[key]).toBeTruthy();
      expect(ENEMY_ART_LAYOUT[key]).toBeTruthy();
      expect((ENEMY_ART_LAYOUT[key].bob ?? 0) > 0, key).toBe(key === 'ses_muhuru');
    }
    expect(new Set(T.map((x) => x[1])).size).toBe(10);
  });
  it('aynı bölgelerin normal/elit/boss eşleşmeleri korunur; çizimsiz elitler çizimsiz kalır', () => {
    expect(enemyArtKey('amber_dunes_1_enemy')).toBe('kehribar_semender');
    expect(enemyArtKey('iron_orbit_10_enemy')).toBe('demir_gezegenin_kalbi');
    expect(enemyArtKey('echo_terrace_5_enemy')).toBeNull();
    expect(enemyArtKey('mercury_foundry_7_enemy')).toBeNull();
  });
});

describe('v1.35.0: üçüncü hazine seti', () => {
  const T: [string, string][] = [['aurora_vault', 'aurora_emaneti'], ['dream_marsh', 'ruya_kavanozu'], ['mirror_court', 'ayna_kutusu'], ['midnight_observatory', 'gozlem_sandigi'], ['hollow_sun', 'gunes_centigi'], ['comet_bridge', 'kuyruk_kristali'], ['rune_necropolis', 'muhurlu_lahit'], ['shattered_sky', 'kubbe_kalintisi'], ['zero_threshold', 'esik_muhuru'], ['dawn_core', 'safak_hazinesi']];
  const FLOATERS = ['kuyruk_kristali', 'kubbe_kalintisi', 'esik_muhuru'];
  it('10 hazine karşılaşması: bölge + karşılaşma kimliği; yalnızca üç havada duran salınır', () => {
    const stages = WORLD_REGIONS.flatMap((r) => r.stages);
    for (const [region, key] of T) {
      const tr = stages.filter((s) => s.regionId === region && s.type === 'treasure');
      expect(tr.length, region).toBe(1);
      expect(tr[0].enemy.id).toBe(`${region}_3_enemy`);
      expect(enemyArtKey(tr[0].enemy.id), region).toBe(key);
      expect(ENEMY_ART_META[key]).toBeTruthy();
      expect((ENEMY_ART_LAYOUT[key].bob ?? 0) > 0, key).toBe(FLOATERS.includes(key));
    }
    expect(new Set(T.map((x) => x[1])).size).toBe(10);
  });
  it('tüm 25 genişleme bölgesinin hazine karşılaşması çizimli; aynı bölgelerin elitleri korunur', () => {
    const stages = WORLD_REGIONS.flatMap((r) => r.stages);
    const keys = new Set<string>();
    for (const s of stages.filter((x) => x.type === 'treasure' && /_3$/.test(x.id) && x.enemy.id.endsWith('_3_enemy') && x.regionId !== 'forest')) {
      const k = enemyArtKey(s.enemy.id);
      if (k) keys.add(k);
    }
    expect(keys.size).toBeGreaterThanOrEqual(25);
    expect(enemyArtKey('dawn_core_8_enemy')).toBe('safak_ates_ruhu');
    expect(enemyArtKey('aurora_vault_5_enemy')).toBeNull();
  });
});

describe('v1.36.0: ilk on elit karşılaşma', () => {
  const IDS = ['glass_forest_5', 'glass_forest_7', 'glass_forest_9', 'silent_shore_5', 'silent_shore_7', 'silent_shore_9', 'copper_mines_5', 'copper_mines_7', 'copper_mines_9', 'mist_aqueduct_5'];
  it('10 elit aşama kimliği çizime bağlı; hepsi gerçek elit, süzülen yok', () => {
    const stages = WORLD_REGIONS.flatMap((r) => r.stages);
    for (const id of IDS) {
      const st = stages.find((s) => s.id === id)!;
      expect(st.type, id).toBe('elite');
      expect(st.enemy.isBoss).toBe(false);
      expect(enemyArtKey(st.enemy.id), id).toBe(id);
      expect(ENEMY_ART_META[id]).toBeTruthy();
      expect(ENEMY_ART_LAYOUT[id].height).toBeLessThanOrEqual(0.76);
      expect(ENEMY_ART_LAYOUT[id].bob ?? 0).toBe(0);
    }
  });
  it('aynı türü paylaşan diğer aşamalar korunur (önceki hazine/boss/normal eşleşmeleri; kalan elitler çizimsiz)', () => {
    expect(enemyArtKey('glass_forest_3_enemy')).toBe('cam_kozasi');
    expect(enemyArtKey('glass_forest_10_enemy')).toBe('camorman_bekcisi');
    expect(enemyArtKey('glass_forest_1_enemy')).toBe('cam_agac_ruhu');
    expect(enemyArtKey('mercury_foundry_9_enemy')).toBeNull();
    expect(enemyArtKey('cinder_garden_5_enemy')).toBeNull();
  });
});

describe('v1.37.0: elit karşılaşmalar 11–20', () => {
  const IDS = ['mist_aqueduct_7', 'mist_aqueduct_9', 'thorn_citadel_5', 'thorn_citadel_7', 'thorn_citadel_9', 'amber_dunes_5', 'amber_dunes_7', 'amber_dunes_9', 'sunken_archive_5', 'sunken_archive_7'];
  it('10 elit aşama kimliği çizime bağlı; yalnızca Mürekkep Yılanı süzülür', () => {
    const stages = WORLD_REGIONS.flatMap((r) => r.stages);
    for (const id of IDS) {
      const st = stages.find((s) => s.id === id)!;
      expect(st.type, id).toBe('elite');
      expect(enemyArtKey(st.enemy.id), id).toBe(id);
      expect(ENEMY_ART_META[id]).toBeTruthy();
      expect(ENEMY_ART_LAYOUT[id].height).toBeLessThanOrEqual(0.76);
      expect((ENEMY_ART_LAYOUT[id].bob ?? 0) > 0, id).toBe(id === 'sunken_archive_5');
    }
  });
  it('önceki elit/hazine eşleşmeleri ve çizimsiz kalan elitler korunur', () => {
    expect(enemyArtKey('glass_forest_5_enemy')).toBe('glass_forest_5');
    expect(enemyArtKey('aurora_vault_3_enemy')).toBe('aurora_emaneti');
    expect(enemyArtKey('cinder_garden_7_enemy')).toBeNull();
    expect(enemyArtKey('cinder_garden_9_enemy')).toBeNull();
  });
});

describe('v1.38.0: elit karşılaşmalar 21–30', () => {
  const IDS = ['sunken_archive_9', 'salt_bastion_5', 'salt_bastion_7', 'salt_bastion_9', 'obsidian_harbor_5', 'obsidian_harbor_7', 'obsidian_harbor_9', 'black_tide_5', 'black_tide_7', 'black_tide_9'];
  it('10 elit aşama kimliği çizime bağlı; süzülen yok', () => {
    const stages = WORLD_REGIONS.flatMap((r) => r.stages);
    for (const id of IDS) {
      const st = stages.find((s) => s.id === id)!;
      expect(st.type, id).toBe('elite');
      expect(enemyArtKey(st.enemy.id), id).toBe(id);
      expect(ENEMY_ART_META[id]).toBeTruthy();
      expect(ENEMY_ART_LAYOUT[id].height).toBeLessThanOrEqual(0.76);
      expect(ENEMY_ART_LAYOUT[id].bob ?? 0, id).toBe(0);
    }
  });
  it('önceki elit/hazine paketleri korunur; aynı bölgelerin normal ve boss eşleşmeleri değişmez', () => {
    expect(enemyArtKey('sunken_archive_7_enemy')).toBe('sunken_archive_7');
    expect(enemyArtKey('amber_dunes_3_enemy')).toBe('kehribar_yigini');
    expect(enemyArtKey('black_tide_1_enemy')).toBe('kara_bosluk_avcisi');
    expect(enemyArtKey('salt_bastion_10_enemy')).toBe('surlarin_beyaz_muhafizi');
  });
});
