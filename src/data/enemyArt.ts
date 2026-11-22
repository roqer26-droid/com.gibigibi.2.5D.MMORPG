import meta from '../art/enemies/meta.json';

/**
 * Düşmana özel şeffaf çizimler. Anahtar düşman KİMLİĞİDİR (arketip değil): aynı arketipi paylaşan diğer düşmanlar
 * (normal ağaç, kaya muhafızı, harabelerdeki diğer gölge iblisi…) eski çizimlerini korur.
 * Çizimler sola dönüktür ve savaşta kahramana bakar; ayrıca aynalanmaz.
 */
export type EnemyArtKey = string;

const URLS = import.meta.glob('../art/enemies/*.webp', { eager: true, import: 'default', query: '?url' }) as Record<string, string>;
const URL_BY_KEY: Record<string, string> = {};
for (const [path, url] of Object.entries(URLS)) URL_BY_KEY[path.split('/').pop()!.replace(/\.webp$/, '')] = url;

/** Düşman kimliği → çizim anahtarı */
export const ENEMY_ART_BY_ID: Record<string, EnemyArtKey> = {
  goblin_raider: 'goblin',
  elder_treant: 'treant',
  boss_frost_queen: 'frost_queen',
  boss_shadow_demon: 'shadow_demon',
  // v1.21.0: her düşmanın kendi kimliği (dosya adı = kimlik)
  // v1.22.0: genişleme bölgeleri (şablonla üretilen düşmanlar). Anahtar şablonun aşama başına KİMLİĞİDİR (`<bölge>_<no>_enemy`);
  // aynı şablonun tekrarlandığı aşamalar (normal + Elit varyantı) aynı çizimi kullanır, yalnızca türü paylaşan diğer düşmanlar kullanmaz.
  forest_6_enemy: 'dikenli_yaban_domuzu',
  forest_7_enemy: 'kutsal_koru_bekcisi',
  mountains_6_enemy: 'buzul_dev_avcisi',
  volcano_6_enemy: 'magma_fenrisi',
  abyss_6_enemy: 'ucurum_celladi',
  sky_3_enemy: 'gok_hazine_kartali',
  sky_1_enemy: 'bulut_kartali',
  sky_5_enemy: 'bulut_kartali',
  sky_2_enemy: 'firtina_sovalyesi',
  sky_6_enemy: 'firtina_sovalyesi',
  ocean_1_enemy: 'deniz_yilani',
  ocean_5_enemy: 'deniz_yilani',
  desert_2_enemy: 'col_akrebi',
  desert_6_enemy: 'col_akrebi',
  desert_7_enemy: 'mumya_muhafiz',
  swamp_4_enemy: 'sis_cadisi',
  moonlit_1_enemy: 'ay_kurdu',
  moonlit_5_enemy: 'ay_kurdu',
  crystal_caves_7_enemy: 'elmas_golem',
  ashen_1_enemy: 'kul_zombisi',
  ashen_5_enemy: 'kul_zombisi',
  time_rift_7_enemy: 'zaman_kurdu',
  blood_moon_2_enemy: 'kan_yarasasi',
  blood_moon_6_enemy: 'kan_yarasasi',
  eternal_winter_1_enemy: 'buz_ejderi_yavrusu',
  eternal_winter_5_enemy: 'buz_ejderi_yavrusu',
  eternal_winter_9_enemy: 'buz_ejderi_yavrusu',
  dragon_roost_1_enemy: 'yavru_ejderha',
  dragon_roost_5_enemy: 'yavru_ejderha',
  dragon_roost_9_enemy: 'yavru_ejderha',
  eternity_2_enemy: 'kaos_lordu',
  eternity_6_enemy: 'kaos_lordu',
  // v1.23.0: genişleme bölgelerinin ilk beş bölge bossu (anahtar = bossId; render `enemy.id` ile arar)
  forest_8_enemy: 'forest_lord',
  mountains_8_enemy: 'frost_giant_king',
  volcano_8_enemy: 'magma_empress',
  ruins_8_enemy: 'rune_emperor',
  abyss_8_enemy: 'abyss_empress',
  // v1.24.0: beş yeni bölge düşmanı, bölge başına 5 normal karşılaşma (aşama 1, 2, 4, 6, 8); hazine/elit/boss aşamaları kendi çizimlerini korur
  glass_forest_1_enemy: 'cam_agac_ruhu',
  glass_forest_2_enemy: 'cam_agac_ruhu',
  glass_forest_4_enemy: 'cam_agac_ruhu',
  glass_forest_6_enemy: 'cam_agac_ruhu',
  glass_forest_8_enemy: 'cam_agac_ruhu',
  silent_shore_1_enemy: 'sessiz_yagmaci',
  silent_shore_2_enemy: 'sessiz_yagmaci',
  silent_shore_4_enemy: 'sessiz_yagmaci',
  silent_shore_6_enemy: 'sessiz_yagmaci',
  silent_shore_8_enemy: 'sessiz_yagmaci',
  copper_mines_1_enemy: 'bakir_yagmaci',
  copper_mines_2_enemy: 'bakir_yagmaci',
  copper_mines_4_enemy: 'bakir_yagmaci',
  copper_mines_6_enemy: 'bakir_yagmaci',
  copper_mines_8_enemy: 'bakir_yagmaci',
  mist_aqueduct_1_enemy: 'sis_bosluk_avcisi',
  mist_aqueduct_2_enemy: 'sis_bosluk_avcisi',
  mist_aqueduct_4_enemy: 'sis_bosluk_avcisi',
  mist_aqueduct_6_enemy: 'sis_bosluk_avcisi',
  mist_aqueduct_8_enemy: 'sis_bosluk_avcisi',
  thorn_citadel_1_enemy: 'diken_kurt',
  thorn_citadel_2_enemy: 'diken_kurt',
  thorn_citadel_4_enemy: 'diken_kurt',
  thorn_citadel_6_enemy: 'diken_kurt',
  thorn_citadel_8_enemy: 'diken_kurt',
  // v1.25.0: sıradaki beş bölge düşmanı (bölge başına 5 normal karşılaşma: aşama 1, 2, 4, 6, 8)
  amber_dunes_1_enemy: 'kehribar_semender',
  amber_dunes_2_enemy: 'kehribar_semender',
  amber_dunes_4_enemy: 'kehribar_semender',
  amber_dunes_6_enemy: 'kehribar_semender',
  amber_dunes_8_enemy: 'kehribar_semender',
  sunken_archive_1_enemy: 'batik_yagmaci',
  sunken_archive_2_enemy: 'batik_yagmaci',
  sunken_archive_4_enemy: 'batik_yagmaci',
  sunken_archive_6_enemy: 'batik_yagmaci',
  sunken_archive_8_enemy: 'batik_yagmaci',
  salt_bastion_1_enemy: 'tuz_tas_nobetci',
  salt_bastion_2_enemy: 'tuz_tas_nobetci',
  salt_bastion_4_enemy: 'tuz_tas_nobetci',
  salt_bastion_6_enemy: 'tuz_tas_nobetci',
  salt_bastion_8_enemy: 'tuz_tas_nobetci',
  obsidian_harbor_1_enemy: 'obsidyen_yagmaci',
  obsidian_harbor_2_enemy: 'obsidyen_yagmaci',
  obsidian_harbor_4_enemy: 'obsidyen_yagmaci',
  obsidian_harbor_6_enemy: 'obsidyen_yagmaci',
  obsidian_harbor_8_enemy: 'obsidyen_yagmaci',
  black_tide_1_enemy: 'kara_bosluk_avcisi',
  black_tide_2_enemy: 'kara_bosluk_avcisi',
  black_tide_4_enemy: 'kara_bosluk_avcisi',
  black_tide_6_enemy: 'kara_bosluk_avcisi',
  black_tide_8_enemy: 'kara_bosluk_avcisi',
  // v1.26.0: üçüncü beşli paket (bölge başına 5 normal karşılaşma: aşama 1, 2, 4, 6, 8)
  echo_terrace_1_enemy: 'yanki_bosluk_avcisi',
  echo_terrace_2_enemy: 'yanki_bosluk_avcisi',
  echo_terrace_4_enemy: 'yanki_bosluk_avcisi',
  echo_terrace_6_enemy: 'yanki_bosluk_avcisi',
  echo_terrace_8_enemy: 'yanki_bosluk_avcisi',
  mercury_foundry_1_enemy: 'civa_ates_ruhu',
  mercury_foundry_2_enemy: 'civa_ates_ruhu',
  mercury_foundry_4_enemy: 'civa_ates_ruhu',
  mercury_foundry_6_enemy: 'civa_ates_ruhu',
  mercury_foundry_8_enemy: 'civa_ates_ruhu',
  cinder_garden_1_enemy: 'kor_semender',
  cinder_garden_2_enemy: 'kor_semender',
  cinder_garden_4_enemy: 'kor_semender',
  cinder_garden_6_enemy: 'kor_semender',
  cinder_garden_8_enemy: 'kor_semender',
  prism_labyrinth_1_enemy: 'prizma_tas_nobetci',
  prism_labyrinth_2_enemy: 'prizma_tas_nobetci',
  prism_labyrinth_4_enemy: 'prizma_tas_nobetci',
  prism_labyrinth_6_enemy: 'prizma_tas_nobetci',
  prism_labyrinth_8_enemy: 'prizma_tas_nobetci',
  iron_orbit_1_enemy: 'demir_yagmaci',
  iron_orbit_2_enemy: 'demir_yagmaci',
  iron_orbit_4_enemy: 'demir_yagmaci',
  iron_orbit_6_enemy: 'demir_yagmaci',
  iron_orbit_8_enemy: 'demir_yagmaci',
  // v1.27.0: dördüncü beşli set (bölge başına 5 normal karşılaşma: aşama 1, 2, 4, 6, 8)
  aurora_vault_1_enemy: 'kutup_buz_golemi',
  aurora_vault_2_enemy: 'kutup_buz_golemi',
  aurora_vault_4_enemy: 'kutup_buz_golemi',
  aurora_vault_6_enemy: 'kutup_buz_golemi',
  aurora_vault_8_enemy: 'kutup_buz_golemi',
  dream_marsh_1_enemy: 'dus_agac_ruhu',
  dream_marsh_2_enemy: 'dus_agac_ruhu',
  dream_marsh_4_enemy: 'dus_agac_ruhu',
  dream_marsh_6_enemy: 'dus_agac_ruhu',
  dream_marsh_8_enemy: 'dus_agac_ruhu',
  mirror_court_1_enemy: 'ayna_bosluk_avcisi',
  mirror_court_2_enemy: 'ayna_bosluk_avcisi',
  mirror_court_4_enemy: 'ayna_bosluk_avcisi',
  mirror_court_6_enemy: 'ayna_bosluk_avcisi',
  mirror_court_8_enemy: 'ayna_bosluk_avcisi',
  midnight_observatory_1_enemy: 'gece_bosluk_avcisi',
  midnight_observatory_2_enemy: 'gece_bosluk_avcisi',
  midnight_observatory_4_enemy: 'gece_bosluk_avcisi',
  midnight_observatory_6_enemy: 'gece_bosluk_avcisi',
  midnight_observatory_8_enemy: 'gece_bosluk_avcisi',
  hollow_sun_1_enemy: 'sonuk_ates_ruhu',
  hollow_sun_2_enemy: 'sonuk_ates_ruhu',
  hollow_sun_4_enemy: 'sonuk_ates_ruhu',
  hollow_sun_6_enemy: 'sonuk_ates_ruhu',
  hollow_sun_8_enemy: 'sonuk_ates_ruhu',
  // v1.28.0: beş normal düşman (bölge başına 5 normal karşılaşma) + sekiz bölge bossu (aşama 10)
  comet_bridge_1_enemy: 'kuyruklu_buz_golemi',
  comet_bridge_2_enemy: 'kuyruklu_buz_golemi',
  comet_bridge_4_enemy: 'kuyruklu_buz_golemi',
  comet_bridge_6_enemy: 'kuyruklu_buz_golemi',
  comet_bridge_8_enemy: 'kuyruklu_buz_golemi',
  rune_necropolis_1_enemy: 'run_yagmaci',
  rune_necropolis_2_enemy: 'run_yagmaci',
  rune_necropolis_4_enemy: 'run_yagmaci',
  rune_necropolis_6_enemy: 'run_yagmaci',
  rune_necropolis_8_enemy: 'run_yagmaci',
  shattered_sky_1_enemy: 'kirik_bosluk_avcisi',
  shattered_sky_2_enemy: 'kirik_bosluk_avcisi',
  shattered_sky_4_enemy: 'kirik_bosluk_avcisi',
  shattered_sky_6_enemy: 'kirik_bosluk_avcisi',
  shattered_sky_8_enemy: 'kirik_bosluk_avcisi',
  zero_threshold_1_enemy: 'sifir_bosluk_avcisi',
  zero_threshold_2_enemy: 'sifir_bosluk_avcisi',
  zero_threshold_4_enemy: 'sifir_bosluk_avcisi',
  zero_threshold_6_enemy: 'sifir_bosluk_avcisi',
  zero_threshold_8_enemy: 'sifir_bosluk_avcisi',
  dawn_core_1_enemy: 'safak_ates_ruhu',
  dawn_core_2_enemy: 'safak_ates_ruhu',
  dawn_core_4_enemy: 'safak_ates_ruhu',
  dawn_core_6_enemy: 'safak_ates_ruhu',
  dawn_core_8_enemy: 'safak_ates_ruhu',
  glass_forest_10_enemy: 'camorman_bekcisi',
  silent_shore_10_enemy: 'sonuk_fenerin_bekcisi',
  copper_mines_10_enemy: 'bakir_yurekli_golem',
  mist_aqueduct_10_enemy: 'sisin_mimari',
  thorn_citadel_10_enemy: 'diken_taci',
  amber_dunes_10_enemy: 'altin_kabuklu_mahrak',
  sunken_archive_10_enemy: 'derinliklerin_arsivcisi',
  salt_bastion_10_enemy: 'surlarin_beyaz_muhafizi',
  // v1.29.0: paket 2 — 12 bölge bossu (aşama 10)
  obsidian_harbor_10_enemy: 'obsidyen_amiral',
  black_tide_10_enemy: 'kara_gelgitin_leviathani',
  echo_terrace_10_enemy: 'bin_sesli_velora',
  mercury_foundry_10_enemy: 'civa_ustasi_rhodin',
  cinder_garden_10_enemy: 'kullerin_bahcivani',
  prism_labyrinth_10_enemy: 'spektrum_muhafizi',
  iron_orbit_10_enemy: 'demir_gezegenin_kalbi',
  aurora_vault_10_enemy: 'aurora_anahtarcisi',
  dream_marsh_10_enemy: 'ruya_dokuyucusu',
  mirror_court_10_enemy: 'cift_suretli_hukumdar',
  midnight_observatory_10_enemy: 'yildiz_avcisi_neros',
  hollow_sun_10_enemy: 'solgun_gunesin_yutucusu',
  // v1.30.0: son beş genişleme bossu
  comet_bridge_10_enemy: 'kopru_kuyruklu_muhafiz',
  rune_necropolis_10_enemy: 'adsiz_mezar_krali',
  shattered_sky_10_enemy: 'gokkubbeyi_kiran_velyr',
  zero_threshold_10_enemy: 'sifirin_bekcisi',
  dawn_core_10_enemy: 'safagin_kalbi_aurel',
  // v1.31.0: ilk beş genişleme hazine karşılaşması (aşama 3, treasure)
  glass_forest_3_enemy: 'cam_kozasi',
  silent_shore_3_enemy: 'fener_sandigi',
  copper_mines_3_enemy: 'cevher_kasasi',
  mist_aqueduct_3_enemy: 'sarnic_hazinesi',
  thorn_citadel_3_enemy: 'dikenli_kasa',
  // v1.34.0: ikinci hazine seti (aşama 3, treasure; yalnızca bu karşılaşma kimlikleri)
  amber_dunes_3_enemy: 'kehribar_yigini',
  sunken_archive_3_enemy: 'muhurlu_katalog',
  salt_bastion_3_enemy: 'kristal_ambar',
  obsidian_harbor_3_enemy: 'kirik_capa_sandigi',
  black_tide_3_enemy: 'gelgit_kasasi',
  echo_terrace_3_enemy: 'ses_muhuru',
  mercury_foundry_3_enemy: 'civa_dokum_kasasi',
  cinder_garden_3_enemy: 'kizil_mantar_sandigi',
  prism_labyrinth_3_enemy: 'spektrum_hazinesi',
  iron_orbit_3_enemy: 'yorunge_kasasi',
  // v1.35.0: üçüncü hazine seti (aşama 3, treasure; yalnızca bu karşılaşma kimlikleri)
  aurora_vault_3_enemy: 'aurora_emaneti',
  dream_marsh_3_enemy: 'ruya_kavanozu',
  mirror_court_3_enemy: 'ayna_kutusu',
  midnight_observatory_3_enemy: 'gozlem_sandigi',
  hollow_sun_3_enemy: 'gunes_centigi',
  comet_bridge_3_enemy: 'kuyruk_kristali',
  rune_necropolis_3_enemy: 'muhurlu_lahit',
  shattered_sky_3_enemy: 'kubbe_kalintisi',
  zero_threshold_3_enemy: 'esik_muhuru',
  dawn_core_3_enemy: 'safak_hazinesi',
  // v1.36.0: ilk on elit karşılaşma (kimlik = aşama kimliği + _enemy; aynı türü paylaşan diğer aşamalar etkilenmez)
  glass_forest_5_enemy: 'glass_forest_5',
  glass_forest_7_enemy: 'glass_forest_7',
  glass_forest_9_enemy: 'glass_forest_9',
  silent_shore_5_enemy: 'silent_shore_5',
  silent_shore_7_enemy: 'silent_shore_7',
  silent_shore_9_enemy: 'silent_shore_9',
  copper_mines_5_enemy: 'copper_mines_5',
  copper_mines_7_enemy: 'copper_mines_7',
  copper_mines_9_enemy: 'copper_mines_9',
  mist_aqueduct_5_enemy: 'mist_aqueduct_5',
  // v1.37.0: elit karşılaşmalar 11–20 (kimlik = aşama kimliği + _enemy)
  mist_aqueduct_7_enemy: 'mist_aqueduct_7',
  mist_aqueduct_9_enemy: 'mist_aqueduct_9',
  thorn_citadel_5_enemy: 'thorn_citadel_5',
  thorn_citadel_7_enemy: 'thorn_citadel_7',
  thorn_citadel_9_enemy: 'thorn_citadel_9',
  amber_dunes_5_enemy: 'amber_dunes_5',
  amber_dunes_7_enemy: 'amber_dunes_7',
  amber_dunes_9_enemy: 'amber_dunes_9',
  sunken_archive_5_enemy: 'sunken_archive_5',
  sunken_archive_7_enemy: 'sunken_archive_7',
  // v1.38.0: elit karşılaşmalar 21–30 (kimlik = aşama kimliği + _enemy)
  sunken_archive_9_enemy: 'sunken_archive_9',
  salt_bastion_5_enemy: 'salt_bastion_5',
  salt_bastion_7_enemy: 'salt_bastion_7',
  salt_bastion_9_enemy: 'salt_bastion_9',
  obsidian_harbor_5_enemy: 'obsidian_harbor_5',
  obsidian_harbor_7_enemy: 'obsidian_harbor_7',
  obsidian_harbor_9_enemy: 'obsidian_harbor_9',
  black_tide_5_enemy: 'black_tide_5',
  black_tide_7_enemy: 'black_tide_7',
  black_tide_9_enemy: 'black_tide_9',
  // v1.40.0: elit karşılaşmalar 51–60 (kimlik = aşama kimliği + _enemy)
  dream_marsh_9_enemy: 'dream_marsh_9',
  mirror_court_5_enemy: 'mirror_court_5',
  mirror_court_7_enemy: 'mirror_court_7',
  mirror_court_9_enemy: 'mirror_court_9',
  midnight_observatory_5_enemy: 'midnight_observatory_5',
  midnight_observatory_7_enemy: 'midnight_observatory_7',
  midnight_observatory_9_enemy: 'midnight_observatory_9',
  hollow_sun_5_enemy: 'hollow_sun_5',
  hollow_sun_7_enemy: 'hollow_sun_7',
  hollow_sun_9_enemy: 'hollow_sun_9',
  // v1.39.0: elit karşılaşmalar 31–40 (kimlik = aşama kimliği + _enemy)
  echo_terrace_5_enemy: 'echo_terrace_5',
  echo_terrace_7_enemy: 'echo_terrace_7',
  echo_terrace_9_enemy: 'echo_terrace_9',
  mercury_foundry_5_enemy: 'mercury_foundry_5',
  mercury_foundry_7_enemy: 'mercury_foundry_7',
  mercury_foundry_9_enemy: 'mercury_foundry_9',
  cinder_garden_5_enemy: 'cinder_garden_5',
  cinder_garden_7_enemy: 'cinder_garden_7',
  cinder_garden_9_enemy: 'cinder_garden_9',
  prism_labyrinth_5_enemy: 'prism_labyrinth_5',
  ...Object.fromEntries(
    [
      'shadow_wolf', 'moss_sentinel', 'boss_forest_guardian', 'frost_wolf', 'mountain_yeti', 'crystal_ice_golem', 'elite_ice_golem',
      'lava_salamander', 'flame_elemental', 'obsidian_vault_guard', 'magma_lord', 'boss_infernal_dragon', 'stone_sentinel', 'void_stalker',
      'prism_warden', 'boss_crystal_titan', 'abyss_stalker', 'abyss_colossus', 'mythic_vault_keeper', 'abyss_general', 'boss_abyssal_king',
    ].map((id) => [id, id])
  ),
};

export interface EnemyArtLayout {
  /** Çizimin yüksekliği (doku kenarının oranı) */
  height: number;
  /** Çizimin en fazla genişliği (doku kenarının oranı) */
  maxWidth: number;
  /** Kristal parlamasının rengi */
  glow: string;
  /** Nefes döngüsü süresi (sn) */
  breathSec: number;
  /** Havada duran ruh/element: yerden yükseklik (doku kenarının oranı); 0 = yerde */
  float?: number;
  /** Süzülme genliği (doku kenarının oranı) */
  bob?: number;
}

/** Ayak/kök çizgisi (doku yüksekliğinin oranı): mevcut düşman çizimlerinin zemin çizgisiyle aynıdır. */
export const ENEMY_ART_GROUND = 0.86;

/**
 * Silüete göre ayar: Goblin küçük, Elit Ağaç geniş ve ağır, Buz Kraliçesi uzun (taç ve asa kadrajda),
 * Gölge İblisi alçak ve geniş (kuyruk kadrajda). Nefes: ayak çizgisinde sabit, %1,5 esneme.
 */
export const ENEMY_ART_LAYOUT: Record<EnemyArtKey, EnemyArtLayout> = {
  goblin: { height: 0.62, maxWidth: 0.82, glow: '#fb923c', breathSec: 2.8 },
  treant: { height: 0.84, maxWidth: 0.97, glow: '#34d399', breathSec: 3.4 },
  frost_queen: { height: 0.76, maxWidth: 0.9, glow: '#7dd3fc', breathSec: 3.6 },
  shadow_demon: { height: 0.68, maxWidth: 0.97, glow: '#e879f9', breathSec: 3.2 },
  // Normal / hazine: 240'lık doku; boss: 300'lük doku (zaten ~%50 daha büyük gösterilir) ve görselin kendi alanında da daha yüksek
  shadow_wolf: { height: 0.44, maxWidth: 0.9, glow: '#a855f7', breathSec: 2.6 },
  moss_sentinel: { height: 0.56, maxWidth: 0.88, glow: '#34d399', breathSec: 3.4 },
  boss_forest_guardian: { height: 0.72, maxWidth: 0.9, glow: '#4ade80', breathSec: 3.8 },
  frost_wolf: { height: 0.56, maxWidth: 0.9, glow: '#93c5fd', breathSec: 2.8 },
  mountain_yeti: { height: 0.72, maxWidth: 0.94, glow: '#bae6fd', breathSec: 3.2 },
  crystal_ice_golem: { height: 0.58, maxWidth: 0.88, glow: '#7dd3fc', breathSec: 3.4 },
  elite_ice_golem: { height: 0.76, maxWidth: 0.9, glow: '#7dd3fc', breathSec: 3.6 },
  lava_salamander: { height: 0.46, maxWidth: 0.9, glow: '#f97316', breathSec: 2.6 },
  flame_elemental: { height: 0.66, maxWidth: 0.9, glow: '#fb923c', breathSec: 2.4, float: 0.06, bob: 0.014 },
  obsidian_vault_guard: { height: 0.64, maxWidth: 0.8, glow: '#e879f9', breathSec: 3.0, float: 0.06, bob: 0.014 },
  magma_lord: { height: 0.76, maxWidth: 0.92, glow: '#fb923c', breathSec: 3.6 },
  boss_infernal_dragon: { height: 0.64, maxWidth: 0.98, glow: '#ef4444', breathSec: 3.8 },
  stone_sentinel: { height: 0.68, maxWidth: 0.92, glow: '#fbbf24', breathSec: 3.4 },
  void_stalker: { height: 0.5, maxWidth: 0.78, glow: '#d946ef', breathSec: 2.8, float: 0.1, bob: 0.016 },
  prism_warden: { height: 0.62, maxWidth: 0.92, glow: '#67e8f9', breathSec: 3.2 },
  boss_crystal_titan: { height: 0.68, maxWidth: 0.96, glow: '#67e8f9', breathSec: 3.8 },
  abyss_stalker: { height: 0.66, maxWidth: 0.9, glow: '#f472b6', breathSec: 2.6 },
  abyss_colossus: { height: 0.5, maxWidth: 0.96, glow: '#e879f9', breathSec: 3.4 },
  mythic_vault_keeper: { height: 0.56, maxWidth: 0.92, glow: '#d946ef', breathSec: 3.2 },
  abyss_general: { height: 0.76, maxWidth: 0.9, glow: '#c084fc', breathSec: 3.4 },
  boss_abyssal_king: { height: 0.7, maxWidth: 0.92, glow: '#c026d3', breathSec: 3.8 },
  // v1.22.0 genişleme düşmanları (240'lık doku). Elit/hazine karşılaşmaları normal düşmandan büyük çizilir.
  dikenli_yaban_domuzu: { height: 0.56, maxWidth: 0.96, glow: '#f59e0b', breathSec: 3.0 },
  kutsal_koru_bekcisi: { height: 0.76, maxWidth: 0.82, glow: '#a3e635', breathSec: 3.4 },
  buzul_dev_avcisi: { height: 0.8, maxWidth: 0.84, glow: '#7dd3fc', breathSec: 3.4 },
  magma_fenrisi: { height: 0.6, maxWidth: 0.96, glow: '#f97316', breathSec: 2.8 },
  ucurum_celladi: { height: 0.78, maxWidth: 0.94, glow: '#e11d48', breathSec: 3.4 },
  gok_hazine_kartali: { height: 0.74, maxWidth: 0.98, glow: '#38bdf8', breathSec: 3.0, float: 0.04, bob: 0.014 },
  bulut_kartali: { height: 0.5, maxWidth: 0.96, glow: '#bae6fd', breathSec: 2.6, float: 0.07, bob: 0.016 },
  firtina_sovalyesi: { height: 0.68, maxWidth: 0.82, glow: '#facc15', breathSec: 3.0 },
  deniz_yilani: { height: 0.62, maxWidth: 0.86, glow: '#2dd4bf', breathSec: 3.2 },
  col_akrebi: { height: 0.46, maxWidth: 0.94, glow: '#fb923c', breathSec: 2.6 },
  mumya_muhafiz: { height: 0.7, maxWidth: 0.7, glow: '#a3e635', breathSec: 3.2 },
  sis_cadisi: { height: 0.66, maxWidth: 0.78, glow: '#c084fc', breathSec: 3.0, float: 0.03, bob: 0.012 },
  ay_kurdu: { height: 0.56, maxWidth: 0.86, glow: '#cbd5e1', breathSec: 2.8 },
  elmas_golem: { height: 0.7, maxWidth: 0.92, glow: '#e9d5ff', breathSec: 3.6 },
  kul_zombisi: { height: 0.6, maxWidth: 0.78, glow: '#ef4444', breathSec: 3.0 },
  zaman_kurdu: { height: 0.58, maxWidth: 0.96, glow: '#fbbf24', breathSec: 2.8 },
  kan_yarasasi: { height: 0.44, maxWidth: 0.96, glow: '#e11d48', breathSec: 2.2, float: 0.12, bob: 0.018 },
  buz_ejderi_yavrusu: { height: 0.54, maxWidth: 0.9, glow: '#7dd3fc', breathSec: 3.0 },
  yavru_ejderha: { height: 0.52, maxWidth: 0.9, glow: '#fb923c', breathSec: 3.0 },
  kaos_lordu: { height: 0.7, maxWidth: 0.84, glow: '#d946ef', breathSec: 3.2 },
  // v1.23.0 bölge bossları (300'lük doku; sahne yüksekliğine sığması için boy ≤ 0.76)
  forest_lord: { height: 0.74, maxWidth: 0.98, glow: '#4ade80', breathSec: 3.8 },
  frost_giant_king: { height: 0.74, maxWidth: 0.98, glow: '#7dd3fc', breathSec: 3.8 },
  magma_empress: { height: 0.76, maxWidth: 0.9, glow: '#fb923c', breathSec: 3.6 },
  rune_emperor: { height: 0.74, maxWidth: 0.96, glow: '#22d3ee', breathSec: 3.8 },
  abyss_empress: { height: 0.72, maxWidth: 0.96, glow: '#a855f7', breathSec: 3.4, float: 0.03, bob: 0.012 },
  // v1.24.0 yeni bölge düşmanları (240'lık doku)
  cam_agac_ruhu: { height: 0.72, maxWidth: 0.74, glow: '#6ee7b7', breathSec: 3.2 },
  sessiz_yagmaci: { height: 0.58, maxWidth: 0.9, glow: '#5eead4', breathSec: 2.8 },
  bakir_yagmaci: { height: 0.62, maxWidth: 0.86, glow: '#fb923c', breathSec: 3.0 },
  sis_bosluk_avcisi: { height: 0.7, maxWidth: 0.94, glow: '#99f6e4', breathSec: 3.0 },
  diken_kurt: { height: 0.5, maxWidth: 0.96, glow: '#84cc16', breathSec: 2.8 },
  // v1.25.0 (240'lık doku)
  kehribar_semender: { height: 0.44, maxWidth: 0.96, glow: '#f59e0b', breathSec: 2.8 },
  batik_yagmaci: { height: 0.64, maxWidth: 0.86, glow: '#5eead4', breathSec: 2.8 },
  tuz_tas_nobetci: { height: 0.66, maxWidth: 0.9, glow: '#fde68a', breathSec: 3.4 },
  obsidyen_yagmaci: { height: 0.64, maxWidth: 0.86, glow: '#c084fc', breathSec: 2.8 },
  kara_bosluk_avcisi: { height: 0.66, maxWidth: 0.96, glow: '#38bdf8', breathSec: 3.0 },
  // v1.26.0 (240'lık doku)
  yanki_bosluk_avcisi: { height: 0.72, maxWidth: 0.9, glow: '#c4b5fd', breathSec: 2.8 },
  civa_ates_ruhu: { height: 0.66, maxWidth: 0.9, glow: '#fb923c', breathSec: 2.8, float: 0.06, bob: 0.014 },
  kor_semender: { height: 0.44, maxWidth: 0.96, glow: '#f87171', breathSec: 2.8 },
  prizma_tas_nobetci: { height: 0.66, maxWidth: 0.9, glow: '#67e8f9', breathSec: 3.4 },
  demir_yagmaci: { height: 0.64, maxWidth: 0.86, glow: '#f87171', breathSec: 2.8 },
  // v1.27.0 (240'lık doku)
  kutup_buz_golemi: { height: 0.62, maxWidth: 0.92, glow: '#7dd3fc', breathSec: 3.4 },
  dus_agac_ruhu: { height: 0.74, maxWidth: 0.94, glow: '#c084fc', breathSec: 3.4 },
  ayna_bosluk_avcisi: { height: 0.72, maxWidth: 0.92, glow: '#f0abfc', breathSec: 2.8 },
  gece_bosluk_avcisi: { height: 0.76, maxWidth: 0.86, glow: '#818cf8', breathSec: 2.8 },
  sonuk_ates_ruhu: { height: 0.64, maxWidth: 0.86, glow: '#fb923c', breathSec: 3.0, float: 0.06, bob: 0.014 },
  // v1.28.0 normal düşmanlar (240'lık doku)
  kuyruklu_buz_golemi: { height: 0.66, maxWidth: 0.92, glow: '#7dd3fc', breathSec: 3.4 },
  run_yagmaci: { height: 0.66, maxWidth: 0.86, glow: '#a3e635', breathSec: 2.8 },
  kirik_bosluk_avcisi: { height: 0.74, maxWidth: 0.86, glow: '#818cf8', breathSec: 2.8 },
  sifir_bosluk_avcisi: { height: 0.68, maxWidth: 0.94, glow: '#a78bfa', breathSec: 2.8 },
  safak_ates_ruhu: { height: 0.68, maxWidth: 0.8, glow: '#fb923c', breathSec: 2.8, float: 0.06, bob: 0.014 },
  // v1.28.0 bölge bossları (300'lük doku; boy ≤ 0.76 sahneye sığar)
  camorman_bekcisi: { height: 0.70, maxWidth: 0.94, glow: '#34d399', breathSec: 3.8 },
  sonuk_fenerin_bekcisi: { height: 0.72, maxWidth: 0.98, glow: '#5eead4', breathSec: 3.8 },
  bakir_yurekli_golem: { height: 0.68, maxWidth: 0.98, glow: '#fb923c', breathSec: 3.8 },
  sisin_mimari: { height: 0.56, maxWidth: 0.82, glow: '#c4b5fd', breathSec: 3.6, float: 0.02, bob: 0.012 },
  diken_taci: { height: 0.62, maxWidth: 0.98, glow: '#84cc16', breathSec: 3.6 },
  altin_kabuklu_mahrak: { height: 0.56, maxWidth: 0.98, glow: '#fbbf24', breathSec: 3.8 },
  derinliklerin_arsivcisi: { height: 0.74, maxWidth: 0.9, glow: '#2dd4bf', breathSec: 3.6 },
  surlarin_beyaz_muhafizi: { height: 0.68, maxWidth: 0.98, glow: '#a7f3d0', breathSec: 3.8 },
  // v1.29.0 paket 2 bölge bossları (300'lük doku; boy ≤ 0.74, uzun mızrak/anahtar/yay uçları için daha düşük)
  obsidyen_amiral: { height: 0.64, maxWidth: 0.96, glow: '#fbbf24', breathSec: 3.8 },
  kara_gelgitin_leviathani: { height: 0.68, maxWidth: 0.92, glow: '#2dd4bf', breathSec: 3.6 },
  bin_sesli_velora: { height: 0.66, maxWidth: 0.9, glow: '#f0abfc', breathSec: 3.6 },
  civa_ustasi_rhodin: { height: 0.62, maxWidth: 0.98, glow: '#fb923c', breathSec: 3.8 },
  kullerin_bahcivani: { height: 0.64, maxWidth: 0.94, glow: '#ef4444', breathSec: 3.6 },
  spektrum_muhafizi: { height: 0.64, maxWidth: 0.9, glow: '#67e8f9', breathSec: 3.6 },
  demir_gezegenin_kalbi: { height: 0.6, maxWidth: 0.9, glow: '#ef4444', breathSec: 3.8, float: 0.03, bob: 0.012 },
  aurora_anahtarcisi: { height: 0.64, maxWidth: 0.96, glow: '#a7f3d0', breathSec: 3.6 },
  ruya_dokuyucusu: { height: 0.56, maxWidth: 0.98, glow: '#c084fc', breathSec: 3.6 },
  cift_suretli_hukumdar: { height: 0.66, maxWidth: 0.9, glow: '#e9d5ff', breathSec: 3.6 },
  yildiz_avcisi_neros: { height: 0.64, maxWidth: 0.96, glow: '#818cf8', breathSec: 3.6 },
  // v1.31.0 hazine karşılaşmaları (240'lık doku)
  cam_kozasi: { height: 0.7, maxWidth: 0.78, glow: '#6ee7b7', breathSec: 3.2 },
  fener_sandigi: { height: 0.5, maxWidth: 0.96, glow: '#22d3ee', breathSec: 3.0 },
  cevher_kasasi: { height: 0.64, maxWidth: 0.88, glow: '#fbbf24', breathSec: 3.0 },
  sarnic_hazinesi: { height: 0.62, maxWidth: 0.9, glow: '#67e8f9', breathSec: 3.2, float: 0.04, bob: 0.012 },
  // v1.34.0 hazine karşılaşmaları (240'lık doku)
  // v1.35.0 hazine karşılaşmaları (240'lık doku)
  // v1.36.0 elit karşılaşmalar (240'lık doku; elitler normal düşmandan büyük çizilir)
  // v1.37.0 elit karşılaşmalar (240'lık doku)
  // v1.38.0 elit karşılaşmalar (240'lık doku)
  // v1.39.0 elit karşılaşmalar (240'lık doku)
  echo_terrace_5: { height: 0.76, maxWidth: 0.92, glow: '#fbbf24', breathSec: 3.4 },
  echo_terrace_7: { height: 0.64, maxWidth: 0.94, glow: '#c084fc', breathSec: 3.4 },
  echo_terrace_9: { height: 0.76, maxWidth: 0.6, glow: '#c4b5fd', breathSec: 3.4 },
  mercury_foundry_5: { height: 0.76, maxWidth: 0.9, glow: '#fb923c', breathSec: 3.4 },
  mercury_foundry_7: { height: 0.7, maxWidth: 0.78, glow: '#cbd5e1', breathSec: 3.4, float: 0.04, bob: 0.012 },
  mercury_foundry_9: { height: 0.5, maxWidth: 0.96, glow: '#94a3b8', breathSec: 3.4 },
  cinder_garden_5: { height: 0.56, maxWidth: 0.96, glow: '#f97316', breathSec: 3.4 },
  cinder_garden_7: { height: 0.76, maxWidth: 0.84, glow: '#fb923c', breathSec: 3.4 },
  cinder_garden_9: { height: 0.76, maxWidth: 0.9, glow: '#ef4444', breathSec: 3.4 },
  prism_labyrinth_5: { height: 0.7, maxWidth: 0.86, glow: '#67e8f9', breathSec: 3.4, float: 0.04, bob: 0.012 },
  // v1.40.0 elit karşılaşmalar 51–60
  dream_marsh_9: { height: 0.5, maxWidth: 0.96, glow: '#a78bfa', breathSec: 3.4 },
  mirror_court_5: { height: 0.76, maxWidth: 0.9, glow: '#e0e7ff', breathSec: 3.4 },
  mirror_court_7: { height: 0.7, maxWidth: 0.92, glow: '#c084fc', breathSec: 3.4 },
  mirror_court_9: { height: 0.76, maxWidth: 0.7, glow: '#a5b4fc', breathSec: 3.4 },
  midnight_observatory_5: { height: 0.6, maxWidth: 0.96, glow: '#38bdf8', breathSec: 3.4, float: 0.04, bob: 0.012 },
  midnight_observatory_7: { height: 0.66, maxWidth: 0.9, glow: '#a5b4fc', breathSec: 3.4, float: 0.04, bob: 0.012 },
  midnight_observatory_9: { height: 0.76, maxWidth: 0.8, glow: '#818cf8', breathSec: 3.4 },
  hollow_sun_5: { height: 0.76, maxWidth: 0.86, glow: '#fbbf24', breathSec: 3.4 },
  hollow_sun_7: { height: 0.72, maxWidth: 0.92, glow: '#f97316', breathSec: 3.4 },
  hollow_sun_9: { height: 0.7, maxWidth: 0.94, glow: '#facc15', breathSec: 3.4 },
  sunken_archive_9: { height: 0.76, maxWidth: 0.88, glow: '#2dd4bf', breathSec: 3.4 },
  salt_bastion_5: { height: 0.44, maxWidth: 0.96, glow: '#e5e7eb', breathSec: 3.4 },
  salt_bastion_7: { height: 0.74, maxWidth: 0.94, glow: '#f9a8d4', breathSec: 3.4 },
  salt_bastion_9: { height: 0.76, maxWidth: 0.84, glow: '#c4b5fd', breathSec: 3.4 },
  obsidian_harbor_5: { height: 0.76, maxWidth: 0.9, glow: '#f87171', breathSec: 3.4 },
  obsidian_harbor_7: { height: 0.76, maxWidth: 0.86, glow: '#a78bfa', breathSec: 3.4 },
  obsidian_harbor_9: { height: 0.54, maxWidth: 0.96, glow: '#818cf8', breathSec: 3.4 },
  black_tide_5: { height: 0.58, maxWidth: 0.96, glow: '#2dd4bf', breathSec: 3.4 },
  black_tide_7: { height: 0.76, maxWidth: 0.88, glow: '#4ade80', breathSec: 3.4 },
  black_tide_9: { height: 0.6, maxWidth: 0.96, glow: '#c084fc', breathSec: 3.4 },
  mist_aqueduct_7: { height: 0.76, maxWidth: 0.9, glow: '#94a3b8', breathSec: 3.4 },
  mist_aqueduct_9: { height: 0.7, maxWidth: 0.92, glow: '#7dd3fc', breathSec: 3.4 },
  thorn_citadel_5: { height: 0.72, maxWidth: 0.92, glow: '#84cc16', breathSec: 3.4 },
  thorn_citadel_7: { height: 0.76, maxWidth: 0.84, glow: '#f87171', breathSec: 3.4 },
  thorn_citadel_9: { height: 0.62, maxWidth: 0.96, glow: '#ef4444', breathSec: 3.4 },
  amber_dunes_5: { height: 0.56, maxWidth: 0.96, glow: '#fbbf24', breathSec: 3.4 },
  amber_dunes_7: { height: 0.74, maxWidth: 0.94, glow: '#ef4444', breathSec: 3.4 },
  amber_dunes_9: { height: 0.66, maxWidth: 0.96, glow: '#fb923c', breathSec: 3.4 },
  sunken_archive_5: { height: 0.76, maxWidth: 0.7, glow: '#a78bfa', breathSec: 3.4, float: 0.04, bob: 0.012 },
  sunken_archive_7: { height: 0.76, maxWidth: 0.78, glow: '#2dd4bf', breathSec: 3.4 },
  glass_forest_5: { height: 0.74, maxWidth: 0.82, glow: '#6ee7b7', breathSec: 3.4 },
  glass_forest_7: { height: 0.58, maxWidth: 0.96, glow: '#34d399', breathSec: 3.4 },
  glass_forest_9: { height: 0.76, maxWidth: 0.9, glow: '#4ade80', breathSec: 3.4 },
  silent_shore_5: { height: 0.76, maxWidth: 0.88, glow: '#5eead4', breathSec: 3.4 },
  silent_shore_7: { height: 0.76, maxWidth: 0.84, glow: '#f87171', breathSec: 3.4 },
  silent_shore_9: { height: 0.76, maxWidth: 0.9, glow: '#94a3b8', breathSec: 3.4 },
  copper_mines_5: { height: 0.74, maxWidth: 0.92, glow: '#fbbf24', breathSec: 3.4 },
  copper_mines_7: { height: 0.5, maxWidth: 0.96, glow: '#fb923c', breathSec: 3.4 },
  copper_mines_9: { height: 0.74, maxWidth: 0.92, glow: '#f87171', breathSec: 3.4 },
  mist_aqueduct_5: { height: 0.76, maxWidth: 0.86, glow: '#7dd3fc', breathSec: 3.4 },
  aurora_emaneti: { height: 0.6, maxWidth: 0.92, glow: '#5eead4', breathSec: 3.2 },
  ruya_kavanozu: { height: 0.64, maxWidth: 0.9, glow: '#e879f9', breathSec: 3.2 },
  ayna_kutusu: { height: 0.7, maxWidth: 0.8, glow: '#bfdbfe', breathSec: 3.2 },
  gozlem_sandigi: { height: 0.68, maxWidth: 0.88, glow: '#818cf8', breathSec: 3.2 },
  gunes_centigi: { height: 0.64, maxWidth: 0.9, glow: '#fb923c', breathSec: 3.2 },
  kuyruk_kristali: { height: 0.5, maxWidth: 0.96, glow: '#7dd3fc', breathSec: 3.0, float: 0.06, bob: 0.014 },
  muhurlu_lahit: { height: 0.72, maxWidth: 0.86, glow: '#34d399', breathSec: 3.4 },
  kubbe_kalintisi: { height: 0.64, maxWidth: 0.9, glow: '#a78bfa', breathSec: 3.2, float: 0.05, bob: 0.014 },
  esik_muhuru: { height: 0.72, maxWidth: 0.74, glow: '#f472b6', breathSec: 3.0, float: 0.04, bob: 0.012 },
  safak_hazinesi: { height: 0.62, maxWidth: 0.92, glow: '#fbbf24', breathSec: 3.2 },
  kehribar_yigini: { height: 0.66, maxWidth: 0.88, glow: '#f59e0b', breathSec: 3.2 },
  muhurlu_katalog: { height: 0.66, maxWidth: 0.88, glow: '#2dd4bf', breathSec: 3.2 },
  kristal_ambar: { height: 0.6, maxWidth: 0.96, glow: '#e5e7eb', breathSec: 3.4 },
  kirik_capa_sandigi: { height: 0.66, maxWidth: 0.9, glow: '#f87171', breathSec: 3.2 },
  gelgit_kasasi: { height: 0.58, maxWidth: 0.96, glow: '#a3e635', breathSec: 3.0 },
  ses_muhuru: { height: 0.7, maxWidth: 0.8, glow: '#c4b5fd', breathSec: 3.4, float: 0.04, bob: 0.012 },
  civa_dokum_kasasi: { height: 0.58, maxWidth: 0.96, glow: '#fb923c', breathSec: 3.2 },
  kizil_mantar_sandigi: { height: 0.64, maxWidth: 0.9, glow: '#ef4444', breathSec: 3.0 },
  spektrum_hazinesi: { height: 0.7, maxWidth: 0.84, glow: '#67e8f9', breathSec: 3.0 },
  yorunge_kasasi: { height: 0.6, maxWidth: 0.96, glow: '#94a3b8', breathSec: 3.2 },
  dikenli_kasa: { height: 0.52, maxWidth: 0.96, glow: '#f59e0b', breathSec: 3.0 },
  // v1.30.0 son beş genişleme bossu (300'lük doku; boy ≤ 0.7)
  kopru_kuyruklu_muhafiz: { height: 0.58, maxWidth: 0.98, glow: '#7dd3fc', breathSec: 3.8 },
  adsiz_mezar_krali: { height: 0.66, maxWidth: 0.9, glow: '#34d399', breathSec: 3.6, float: 0.03, bob: 0.012 },
  gokkubbeyi_kiran_velyr: { height: 0.64, maxWidth: 0.98, glow: '#fbbf24', breathSec: 3.8 },
  sifirin_bekcisi: { height: 0.6, maxWidth: 0.98, glow: '#5eead4', breathSec: 3.6, float: 0.03, bob: 0.012 },
  safagin_kalbi_aurel: { height: 0.66, maxWidth: 0.98, glow: '#fb923c', breathSec: 3.8 },
  solgun_gunesin_yutucusu: { height: 0.6, maxWidth: 0.98, glow: '#f59e0b', breathSec: 3.8, float: 0.03, bob: 0.012 },
};

/** Elit varyantı: aynı çizim biraz büyük gösterilir (yalnızca normal + Elit ortak çizimi olan düşmanlarda). */
export const ENEMY_ART_ELITE_SCALE = 1.08;
const SHARED_WITH_ELITE = new Set(['bulut_kartali', 'deniz_yilani', 'ay_kurdu', 'kul_zombisi', 'buz_ejderi_yavrusu', 'yavru_ejderha']);
export function enemyArtScale(key: EnemyArtKey, enemyName: string): number {
  return SHARED_WITH_ELITE.has(key) && enemyName.startsWith('Elit ') ? ENEMY_ART_ELITE_SCALE : 1;
}

export const ENEMY_ART_META = meta as Record<string, { aspect: number; footFrac: number }>;

/**
 * Ortak bekleme nefesi (tüm düşmanlar: çizimli ve eski vektör çizimli). Çizime özel `breathSec` yoksa varsayılan kullanılır.
 * Esneme yaklaşık %1,5; döngü 2,5–4 sn; temas noktası (ayak/kök/pençe) sabit kalır.
 */
export const ENEMY_BREATH_DEFAULT = { normalSec: 3.0, bossSec: 3.6, stretch: 0.015 } as const;
/** Çizime özel `breathSec` ne olursa olsun döngü 2,5–4 sn aralığında tutulur (hızlı/sinirli görünmesin). */
export const clampBreathSec = (sec: number): number => Math.min(4, Math.max(2.5, sec));

/** Eski vektör çizimli düşmanlarda havada duran türler: nefese hafif süzülme eşlik eder. */
export const ENEMY_FLOATING_ARCHETYPES = new Set(['celestial', 'void_stalker', 'fire_elemental']);

export const enemyArtKey = (enemyId: string): EnemyArtKey | null => ENEMY_ART_BY_ID[enemyId] ?? null;

const cache = new Map<string, HTMLImageElement>();

function load(key: EnemyArtKey): HTMLImageElement | null {
  const url = URL_BY_KEY[key];
  if (!url || typeof Image === 'undefined') return null;
  let img = cache.get(key);
  if (!img) {
    img = new Image();
    img.decoding = 'async';
    img.src = url;
    cache.set(key, img);
  }
  return img;
}

/** Yüklenmişse görsel, değilse null (yükleme başlatılır; o sürece mevcut yedek çizim kullanılır). */
export function enemyImage(key: EnemyArtKey): HTMLImageElement | null {
  const img = load(key);
  return img && img.complete && img.naturalWidth > 0 ? img : null;
}

export function enemyImageReady(key: EnemyArtKey): Promise<void> {
  const img = load(key);
  if (!img || (img.complete && img.naturalWidth > 0)) return Promise.resolve();
  return new Promise((resolve) => {
    img.addEventListener('load', () => resolve(), { once: true });
    img.addEventListener('error', () => resolve(), { once: true });
  });
}
