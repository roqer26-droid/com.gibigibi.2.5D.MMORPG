import { afterEach, describe, expect, it, vi } from 'vitest';
import { COSTUMES, isValidCostume, type CostumeDef } from '../src/data/costumes';
import { HERO_CLASS_LIST } from '../src/data/classes';
import { hasHeroArt } from '../src/data/heroArt';
import { combatClip } from '../src/data/heroCombat';
import { idleSheetKey } from '../src/data/heroIdle';
import { HERO_ATTACK_SOUNDS, appearanceAttackCue, heroAttackCue, heroHitCue } from '../src/game/hitFeedback';

describe('v1.84.0: vuruş sesi kahramandan (heroId), tüm kostümlerde', () => {
  const heroes = HERO_CLASS_LIST.map((c) => c.id).filter((id) => hasHeroArt(id));

  it('ses tablosunda yalnızca kahraman kimlikleri var (kostüm başına ses kaydı yok)', () => {
    expect(heroes).toHaveLength(22);
    expect(Object.keys(HERO_ATTACK_SOUNDS).sort()).toEqual([...heroes].sort());
    for (const c of COSTUMES) expect(Object.prototype.hasOwnProperty.call(HERO_ATTACK_SOUNDS, c.id), c.id).toBe(false);
  });

  it('22 kahramanın 66 görünümü: her kostüm kahramanının varsayılan sesini kullanır; animasyon kostümün kendisinden', () => {
    const appearances: Array<{ hero: string; costume: string | null }> = [
      ...heroes.map((h) => ({ hero: h, costume: null })),
      ...COSTUMES.map((c) => ({ hero: c.heroId, costume: c.id })),
    ];
    expect(appearances).toHaveLength(66);
    for (const a of appearances) {
      const label = a.costume ?? a.hero;
      const cue = appearanceAttackCue(a.hero, a.costume);
      expect(cue, label).toBe(HERO_ATTACK_SOUNDS[a.hero]);
      expect(heroHitCue({ hero: a.hero, outcome: 'hit' }), label).toBe(cue);
      expect(heroHitCue({ hero: a.hero, outcome: 'critical' }), label).toBe('critical');
      expect(heroHitCue({ hero: a.hero, outcome: 'block' }), label).toBe('block');
      expect(heroHitCue({ hero: a.hero, outcome: 'dodge' }), label).toBeNull();
      // animasyon/efekt seçimi görünüm anahtarıyla (kostüm kendi klibini kullanır)
      const key = idleSheetKey(a.hero, a.costume);
      expect(key, label).toBe(a.costume ?? a.hero);
      expect(combatClip(key, 'attack')?.key, label).toBe(key);
    }
    // örnek: Savaşçı'nın üç görünümü aynı kılıç sesi, farklı saldırı klipleri
    const w = ['warrior', 'warrior_koz_muhafizi', 'warrior_kutup_celigi'];
    expect(w.map((k) => appearanceAttackCue('warrior', k === 'warrior' ? null : k))).toEqual(['sword', 'sword', 'sword']);
    expect(new Set(w.map((k) => combatClip(k, 'attack')!.url)).size).toBe(3);
  });
});

describe('geçici test kostümü: ses tanımı olmadan kahramanın sesini alır', () => {
  afterEach(() => {
    vi.doUnmock('../src/data/costumes');
    vi.resetModules();
  });

  it('listeye eklenen yeni kostüm (ses kaydı yok) kahramanın sesini otomatik alır; savaş klibi yoksa eski akış', async () => {
    vi.resetModules();
    const temp: CostumeDef = { id: 'warrior_gecici_test', heroId: 'warrior', name: 'Geçici Test' } as CostumeDef;
    const temp2: CostumeDef = { id: 'ranger_gecici_test', heroId: 'ranger', name: 'Geçici Test 2' } as CostumeDef;
    vi.doMock('../src/data/costumes', async (orig) => {
      const real = await orig<typeof import('../src/data/costumes')>();
      const list = [...real.COSTUMES, temp, temp2];
      const byId = new Map(list.map((c) => [c.id, c]));
      return { ...real, COSTUMES: list, costumeById: (id: string | null | undefined) => (id ? byId.get(id) ?? null : null), isValidCostume: (h: string, id: string | null | undefined) => !!id && byId.get(id)?.heroId === h };
    });
    const costumes = await import('../src/data/costumes');
    const fb = await import('../src/game/hitFeedback');
    const combat = await import('../src/data/heroCombat');
    expect(costumes.COSTUMES).toHaveLength(46);
    for (const t of [temp, temp2]) {
      expect(costumes.isValidCostume(t.heroId, t.id)).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(fb.HERO_ATTACK_SOUNDS, t.id)).toBe(false); // ayrı ses tanımı yok
      expect(fb.appearanceAttackCue(t.heroId, t.id)).toBe(fb.heroAttackCue(t.heroId)); // kahramanın sesi
      expect(combat.combatClip(t.id, 'attack')).toBeNull(); // kostüm klibi yok → mevcut animasyon zamanlaması
    }
    expect(fb.appearanceAttackCue('warrior', 'warrior_gecici_test')).toBe('sword');
    expect(fb.appearanceAttackCue('ranger', 'ranger_gecici_test')).toBe('arrow');
    expect(isValidCostume('warrior', 'warrior_gecici_test')).toBe(false); // gerçek listeye dokunulmadı
    expect(heroAttackCue('warrior')).toBe('sword');
  });
});
