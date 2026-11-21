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
};

export const ENEMY_ART_META = meta as Record<string, { aspect: number; footFrac: number }>;

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
