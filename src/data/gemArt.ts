import type { GemType } from '../types/game';

/**
 * Savaş tahtası taşlarının çizimleri (128×128 şeffaf PNG, merkez hizalı). Dosya adı = Phaser doku anahtarı (`gem_<tür>`).
 * Savaş sahnesi bunları tahta kurulmadan önce yükler (`BattleScene.preload`); bir doku yüklenemezse o taş için
 * `GemTextures.createGemTextures` içindeki mevcut çizim işlevi yedek olarak çalışır.
 */
const URLS = import.meta.glob('../art/gems/gem_*.png', { eager: true, import: 'default', query: '?url' }) as Record<string, string>;

export const GEM_TYPES: readonly GemType[] = ['fire', 'frost', 'nature', 'lightning', 'arcane', 'golden'];

/** Doku anahtarı → görsel adresi (yalnızca dosyası bulunan taşlar). */
export const GEM_ART_URL: Record<string, string> = {};
for (const [path, url] of Object.entries(URLS)) {
  GEM_ART_URL[path.split('/').pop()!.replace(/\.png$/, '')] = url;
}

export const gemTextureKey = (type: GemType): string => `gem_${type}`;
