import meta from '../art/enemies/meta.json';

/**
 * Düşmana özel şeffaf çizimler. Anahtar düşman KİMLİĞİDİR (arketip değil): aynı arketipi paylaşan diğer düşmanlar
 * (normal ağaç, kaya muhafızı, harabelerdeki diğer gölge iblisi…) eski çizimlerini korur.
 * Çizimler sola dönüktür ve savaşta kahramana bakar; ayrıca aynalanmaz.
 */
export type EnemyArtKey = 'goblin' | 'treant' | 'frost_queen' | 'shadow_demon';

const URLS = import.meta.glob('../art/enemies/*.webp', { eager: true, import: 'default', query: '?url' }) as Record<string, string>;
const URL_BY_KEY: Record<string, string> = {};
for (const [path, url] of Object.entries(URLS)) URL_BY_KEY[path.split('/').pop()!.replace(/\.webp$/, '')] = url;

/** Düşman kimliği → çizim anahtarı */
export const ENEMY_ART_BY_ID: Record<string, EnemyArtKey> = {
  goblin_raider: 'goblin',
  elder_treant: 'treant',
  boss_frost_queen: 'frost_queen',
  boss_shadow_demon: 'shadow_demon',
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
