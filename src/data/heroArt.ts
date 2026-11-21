import type { HeroClassId, ImageHeroClassId } from '../types/game';

/** Şeffaf tam boy kahraman görselleri (dosya adı = sınıf kimliği); kenar boşlukları kırpılmıştır, ayaklar görselin alt kenarıdır. */
const URLS = import.meta.glob('../art/heroes/*.webp', { eager: true, import: 'default', query: '?url' }) as Record<string, string>;

export const HERO_ART_URL: Partial<Record<HeroClassId, string>> = {};
for (const [path, url] of Object.entries(URLS)) {
  HERO_ART_URL[path.split('/').pop()!.replace(/\.webp$/, '') as HeroClassId] = url;
}

/**
 * Yerleşim (kahraman dokusu koordinatları: yer çizgisi y=+74, standart kahraman ≈200 birim boyunda).
 * height: görsel boyu; float: yerden yükseklik (Gecenin Çığırtkanı hafifçe havada durur); maxWidth: genişlik sınırı.
 */
export const HERO_ART_LAYOUT: Record<ImageHeroClassId, { height: number; float: number; maxWidth: number; bob: number }> = {
  werewolf: { height: 206, float: 0, maxWidth: 230, bob: 0 },
  vampire: { height: 218, float: 0, maxWidth: 230, bob: 0 },
  bigfoot: { height: 204, float: 0, maxWidth: 240, bob: 0 },
  night_screecher: { height: 156, float: 30, maxWidth: 236, bob: 5 },
};

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
