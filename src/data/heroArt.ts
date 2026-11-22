import type { HeroClassId } from '../types/game';
import meta from '../art/heroes/meta.json';
import costumeMeta from '../art/costumes/meta.json';
import { isValidCostume } from './costumes';

/**
 * Şeffaf tam boy kahraman çizimleri (dosya adı = sınıf kimliği). Çizimler şeffaf kenarlarından kırpılmıştır;
 * `meta.json` her çizimin oranını ve ayak çizgisini (görsel boyunun oranı) içerir. Ekipman çizim üzerindedir:
 * ayrıca silah/zırh katmanı çizilmez, ekipman yalnızca hesaplamalarda kullanılır.
 */
const URLS = import.meta.glob('../art/heroes/*.webp', { eager: true, import: 'default', query: '?url' }) as Record<string, string>;

const COSTUME_URLS = import.meta.glob('../art/costumes/*.webp', { eager: true, import: 'default', query: '?url' }) as Record<string, string>;

/** Çizim anahtarı → görsel adresi. Anahtar: sınıf kimliği (varsayılan görünüm) ya da kostüm kimliği. */
export const HERO_ART_URL: Record<string, string> = {};
for (const [path, url] of Object.entries(URLS)) {
  HERO_ART_URL[path.split('/').pop()!.replace(/\.webp$/, '')] = url;
}
for (const [path, url] of Object.entries(COSTUME_URLS)) {
  HERO_ART_URL[path.split('/').pop()!.replace(/\.webp$/, '')] = url;
}

export const HERO_ART_META = { ...meta, ...costumeMeta } as Record<string, { aspect: number; footFrac: number }>;

export const hasHeroArt = (id: string): boolean => !!HERO_ART_URL[id] && !!HERO_ART_META[id];

/** Yüklenemeyen çizim anahtarları: bunlar için varsayılan görsele dönülür. */
const failed = new Set<string>();
export const heroArtFailed = (key: string): boolean => failed.has(key);

/**
 * Şampiyonun gösterilecek çizim anahtarı: geçerli ve yüklenebilir bir kostüm seçiliyse kostüm kimliği, aksi halde (kostüm yok, geçersiz kimlik,
 * dosya yok ya da yükleme hatası) sınıfın varsayılan görseli. Yerleşim her zaman sınıfa göre (`HERO_ART_LAYOUT[classId]`) yapılır.
 */
export function heroArtKey(classId: string, costumeId?: string | null): string {
  if (costumeId && isValidCostume(classId, costumeId) && hasHeroArt(costumeId) && !failed.has(costumeId)) return costumeId;
  return classId;
}

export interface HeroArtLayout {
  /** Ayak çizgisinden çizimin tepesine kadar yükseklik (kahraman dokusu birimi; ortak zemin çizgisi y=+74) */
  above: number;
  /** Yerden yükseklik (Gecenin Çığırtkanı hafifçe havada) */
  float: number;
  /** Çizimin toplam genişlik sınırı */
  maxWidth: number;
  /** Havada süzülme genliği */
  bob: number;
}

/**
 * Yerleşim: standart kahraman ≈210 birim boyunda; silah/asa başın üstüne çıkan kahramanlar (Büyücü, Nekromant, Fırtına Çağıran)
 * biraz daha yüksek tutulur ki gövde boyları birbirine yakın kalsın. Tüm kahramanların ayakları aynı zemin çizgisine oturur.
 */
export const HERO_ART_LAYOUT: Partial<Record<HeroClassId, HeroArtLayout>> = {
  warrior: { above: 212, float: 0, maxWidth: 240, bob: 0 },
  paladin: { above: 214, float: 0, maxWidth: 240, bob: 0 },
  ranger: { above: 212, float: 0, maxWidth: 240, bob: 0 },
  mage: { above: 230, float: 0, maxWidth: 240, bob: 0 },
  necromancer: { above: 228, float: 0, maxWidth: 250, bob: 0 },
  assassin: { above: 212, float: 0, maxWidth: 240, bob: 0 },
  stormcaller: { above: 230, float: 0, maxWidth: 240, bob: 0 },
  dragonheart: { above: 214, float: 0, maxWidth: 240, bob: 0 },
  werewolf: { above: 206, float: 0, maxWidth: 230, bob: 0 },
  vampire: { above: 218, float: 0, maxWidth: 230, bob: 0 },
  bigfoot: { above: 204, float: 0, maxWidth: 240, bob: 0 },
  night_screecher: { above: 156, float: 30, maxWidth: 236, bob: 5 },
  // Yaratık kahramanlar. Havada duranlarda (Peri, Anka, Cin, Serafim) `float` + `bob` hafif süzülme verir; ayaklı olanların ayağı sabittir.
  // `above` ve `maxWidth` kahraman başına ayarlanır: kanatlar/kuyruklar/mızrak kesilmesin diye maxWidth geniş, iri kahramanlar tahtaya taşmasın diye above sınırlı.
  fairy: { above: 212, float: 26, maxWidth: 250, bob: 5 },
  kitsune: { above: 172, float: 0, maxWidth: 250, bob: 0 },
  naga: { above: 226, float: 0, maxWidth: 250, bob: 0 },
  siren: { above: 224, float: 0, maxWidth: 250, bob: 0 },
  minotaur: { above: 240, float: 0, maxWidth: 250, bob: 0 },
  golem: { above: 236, float: 0, maxWidth: 250, bob: 0 },
  phoenix: { above: 196, float: 30, maxWidth: 250, bob: 6 },
  djinn: { above: 204, float: 30, maxWidth: 250, bob: 5 },
  demon: { above: 228, float: 0, maxWidth: 250, bob: 0 },
  seraph: { above: 212, float: 24, maxWidth: 250, bob: 4 },
};

/** Nefes döngüsü: yaklaşık 3 saniye, gövde en fazla %1,5 esner; ayaklar sabit kalır. */
export const HERO_BREATH = { periodSec: 3, stretch: 0.015 } as const;

const cache = new Map<string, HTMLImageElement>();

function load(id: string): HTMLImageElement | null {
  const url = HERO_ART_URL[id as HeroClassId];
  if (!url || typeof Image === 'undefined') return null;
  let img = cache.get(id);
  if (!img) {
    img = new Image();
    img.decoding = 'async';
    img.addEventListener('error', () => failed.add(id), { once: true });
    img.src = url;
    cache.set(id, img);
  }
  return img;
}

/** Yüklenmişse görsel, değilse null (yükleme başlatılır; çizim sonraki karede görseli kullanır). */
export function heroImage(id: string): HTMLImageElement | null {
  const img = load(id);
  return img && img.complete && img.naturalWidth > 0 ? img : null;
}

/** Görsel hazır olunca çözülür (yoksa hemen). */
export function heroImageReady(id: string): Promise<void> {
  const img = load(id);
  if (!img || (img.complete && img.naturalWidth > 0)) return Promise.resolve();
  return new Promise((resolve) => {
    img.addEventListener('load', () => resolve(), { once: true });
    img.addEventListener('error', () => resolve(), { once: true });
  });
}


/**
 * Şampiyonun (kostümüyle) görseli hazır olunca çözülür: kostüm yüklenemezse varsayılan görsel de beklenir.
 * Kostüm görselleri yalnızca gösterildiklerinde istenir.
 */
export async function heroArtReady(classId: string, costumeId?: string | null): Promise<void> {
  const key = heroArtKey(classId, costumeId);
  await heroImageReady(key);
  const after = heroArtKey(classId, costumeId);
  if (after !== key) await heroImageReady(after);
}
