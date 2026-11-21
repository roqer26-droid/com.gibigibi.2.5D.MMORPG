import type { HeroClassId } from '../types/game';
import meta from '../art/heroes/meta.json';

/**
 * Şeffaf tam boy kahraman çizimleri (dosya adı = sınıf kimliği). Çizimler şeffaf kenarlarından kırpılmıştır;
 * `meta.json` her çizimin oranını ve ayak çizgisini (görsel boyunun oranı) içerir. Ekipman çizim üzerindedir:
 * ayrıca silah/zırh katmanı çizilmez, ekipman yalnızca hesaplamalarda kullanılır.
 */
const URLS = import.meta.glob('../art/heroes/*.webp', { eager: true, import: 'default', query: '?url' }) as Record<string, string>;

export const HERO_ART_URL: Partial<Record<HeroClassId, string>> = {};
for (const [path, url] of Object.entries(URLS)) {
  HERO_ART_URL[path.split('/').pop()!.replace(/\.webp$/, '') as HeroClassId] = url;
}

export const HERO_ART_META = meta as Record<string, { aspect: number; footFrac: number }>;

export const hasHeroArt = (id: string): boolean => !!HERO_ART_URL[id as HeroClassId] && !!HERO_ART_META[id];

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

// Görseller ilk yüklemede arka planda isteklenir (küçük dosyalar; ekran açılınca hazırdır)
Object.keys(HERO_ART_URL).forEach((id) => load(id));
