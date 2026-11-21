import { describe, expect, it } from 'vitest';
import { HERO_ART_LAYOUT, HERO_ART_META, HERO_ART_URL, HERO_PORTRAIT_URL, hasHeroArt } from '../src/data/heroArt';
import { HERO_CLASS_LIST } from '../src/data/classes';

describe('kahraman görselleri', () => {
  it('22 kahramanın hepsinin görseli, ölçüleri ve yerleşimi var', () => {
    expect(HERO_CLASS_LIST.length).toBe(22);
    for (const c of HERO_CLASS_LIST) {
      expect(hasHeroArt(c.id), c.id).toBe(true);
      expect(HERO_ART_URL[c.id], c.id).toBeTruthy();
      expect(HERO_ART_LAYOUT[c.id], c.id).toBeTruthy();
      const m = HERO_ART_META[c.id];
      expect(m.aspect).toBeGreaterThan(0.4);
      expect(m.footFrac).toBeGreaterThan(0.8);
      expect(m.footFrac).toBeLessThanOrEqual(1);
    }
  });
  it('havada duran kahramanlar süzülür, ayaklı kahramanlar sabit durur', () => {
    for (const id of ['fairy', 'phoenix', 'djinn', 'seraph', 'night_screecher'] as const) {
      expect(HERO_ART_LAYOUT[id]!.float).toBeGreaterThan(0);
      expect(HERO_ART_LAYOUT[id]!.bob).toBeGreaterThan(0);
    }
    for (const id of ['minotaur', 'golem', 'naga', 'kitsune', 'siren', 'demon'] as const) expect(HERO_ART_LAYOUT[id]!.bob).toBe(0);
  });
  it('yeni 10 kahramanın küçük portresi var', () => {
    for (const id of ['fairy', 'kitsune', 'naga', 'siren', 'minotaur', 'golem', 'phoenix', 'djinn', 'demon', 'seraph'] as const) {
      expect(HERO_PORTRAIT_URL[id], id).toBeTruthy();
    }
  });
});
