import { describe, expect, it } from 'vitest';
import { GEM_ART_URL, GEM_TYPES, gemTextureKey } from '../src/data/gemArt';
import { readdirSync } from 'fs';
import { createGemTextures } from '../src/phaser/GemTextures';

describe('v1.57.0: savaş taşı görselleri (kristal set)', () => {
  it('altı temel taşın görseli var; dosya adı = Phaser doku anahtarı; taş kimlikleri değişmedi', () => {
    expect(GEM_TYPES).toEqual(['fire', 'frost', 'nature', 'lightning', 'arcane', 'golden']);
    for (const t of GEM_TYPES) {
      expect(gemTextureKey(t)).toBe(`gem_${t}`);
      expect(GEM_ART_URL[`gem_${t}`], t).toBeTruthy();
    }
    const files = readdirSync('src/art/gems').filter((f) => f.endsWith('.png')).map((f) => f.replace('.png', '')).sort();
    expect(files).toEqual(GEM_TYPES.map((t) => `gem_${t}`).sort());
  });

  it('yedek: eksik/yüklenemeyen taş için eski çizim işlevi o tür dokusunu üretir; var olan dokuya dokunmaz', () => {
    const created: string[] = [];
    const existing = new Set(['gem_fire', 'gem_frost', 'gem_nature', 'gem_arcane', 'gem_golden']); // gem_lightning yüklenemedi
    const fakeCtx = new Proxy({}, { get: () => () => ({ addColorStop() {} }), set: () => true });
    const scene = {
      textures: {
        exists: (k: string) => existing.has(k),
        createCanvas: (k: string) => {
          created.push(k);
          return { getContext: () => fakeCtx, refresh() {} };
        },
      },
    } as never;
    createGemTextures(scene);
    expect(created.filter((k) => k.startsWith('gem_') && k !== 'gem_frozen')).toEqual(['gem_lightning']);
    expect(created).toContain('special_nova'); // özel taş ve donma katmanları hâlâ çizilir
  });
});
