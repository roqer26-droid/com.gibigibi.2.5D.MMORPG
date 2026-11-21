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
