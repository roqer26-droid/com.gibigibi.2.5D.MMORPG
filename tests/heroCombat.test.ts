import { describe, expect, it } from 'vitest';
import manifest from '../src/art/heroes-combat/combat-manifest.json';
import { COMBAT_ORIGIN, COMBAT_SOURCE_FRAME, allCombatClips, clipContactMs, clipEventsBetween, clipFrameAt, clipFrameStarts, combatClip } from '../src/data/heroCombat';
import { IDLE_ORIGIN, idleSheetKey } from '../src/data/heroIdle';
import { COSTUMES } from '../src/data/costumes';
import { hasHeroArt } from '../src/data/heroArt';
import { HERO_CLASS_LIST } from '../src/data/classes';

describe('v1.73.0: çizilmiş saldırı ve hasar alma klipleri', () => {
  it('manifest: dört kahramanın varsayılan görünümü, saldırı 4×2 / 520 ms, hasar 4×1 / 260 ms; idle ile aynı ayak noktası', () => {
    expect(allCombatClips()).toHaveLength(132);
    expect(COMBAT_SOURCE_FRAME).toEqual({ w: 480, h: 384 });
    expect(COMBAT_ORIGIN).toEqual(IDLE_ORIGIN);
    for (const hero of ['warrior', 'paladin', 'ranger', 'mage', 'werewolf', 'vampire', 'bigfoot', 'night_screecher', 'necromancer', 'assassin', 'stormcaller', 'dragonheart', 'fairy', 'kitsune', 'naga', 'siren', 'minotaur', 'golem', 'phoenix', 'djinn', 'demon', 'seraph']) {
      const a = combatClip(hero, 'attack')!;
      const h = combatClip(hero, 'hurt')!;
      expect([a.columns, a.rows, a.frameCount, a.durationMs], hero).toEqual([4, 2, 8, 520]);
      expect([h.columns, h.rows, h.frameCount, h.durationMs], hero).toEqual([4, 1, 4, 260]);
      expect(a.frameDurationsMs.reduce((x, y) => x + y, 0)).toBe(a.durationMs);
      expect(h.frameDurationsMs.reduce((x, y) => x + y, 0)).toBe(h.durationMs);
      expect(a.url).toBeTruthy();
    }
    expect(manifest.textures.filter((t) => t.costume !== 'default')).toHaveLength(44);
  });

  it('kaydı olmayan görünüm eski statik poza düşer', () => {
    expect(combatClip(null, 'hurt')).toBeNull();
  });

  it('temas anı: yakın dövüşte impact (240 ms), Korucu/Büyücüde atış + yolculuk', () => {
    expect(clipContactMs(combatClip('warrior', 'attack')!)).toBe(240);
    expect(clipContactMs(combatClip('paladin', 'attack')!)).toBe(240);
    expect(clipContactMs(combatClip('ranger', 'attack')!)).toBe(240 + 120);
    expect(clipContactMs(combatClip('mage', 'attack')!)).toBe(240 + 140);
    const r = combatClip('ranger', 'attack')!.events[0];
    expect(r.type).toBe('projectileRelease');
    expect(r.projectile).toBe('arrow');
    expect(r.originPx).toEqual({ x: 351, y: 116 });
    expect(combatClip('mage', 'attack')!.events[0].projectile).toBe('spell');
  });

  it('kare zamanlaması ve olaylar: atlanan karede bile olay bir kez, sırayla', () => {
    const a = combatClip('warrior', 'attack')!;
    expect(clipFrameStarts(a)).toEqual([0, 60, 120, 180, 240, 300, 360, 440]);
    expect(clipFrameAt(a, 0)).toBe(0);
    expect(clipFrameAt(a, 239)).toBe(3);
    expect(clipFrameAt(a, 240)).toBe(4); // impact karesi
    expect(clipFrameAt(a, 519)).toBe(7);
    expect(clipFrameAt(a, 900)).toBe(7);
    // tek adımda 0 → 500 ms (kareler atlanır): impact yine bir kez
    expect(clipEventsBetween(a, -1, 500).map((e) => e.type)).toEqual(['impact']);
    expect(clipEventsBetween(a, -1, 200)).toEqual([]);
    expect(clipEventsBetween(a, 200, 240)).toHaveLength(1);
    expect(clipEventsBetween(a, 240, 520)).toEqual([]);
  });

  it('Paket 2: Kurt Adam/Vampir/Koca Ayak impact 240 ms; Gecenin Çığırtkanı ses dalgası (originPx, 120 ms yolculuk)', () => {
    for (const h of ['werewolf', 'vampire', 'bigfoot']) {
      const a = combatClip(h, 'attack')!;
      expect(a.events.map((e) => [e.type, e.atMs]), h).toEqual([['impact', 240]]);
      expect(clipContactMs(a)).toBe(240);
    }
    const ns = combatClip('night_screecher', 'attack')!;
    expect(ns.events).toHaveLength(1);
    expect(ns.events[0]).toMatchObject({ type: 'projectileRelease', projectile: 'sonicPulse', atMs: 240, suggestedTravelMs: 120, originPx: { x: 314, y: 198 } });
    expect(clipContactMs(ns)).toBe(360);
    // Paket 1 kayıtları korunur
    expect(clipContactMs(combatClip('ranger', 'attack')!)).toBe(360);
  });

  it('Paket 3: Suikastçı/Ejderkalp impact 240 ms; Ölüm Çağıran ruh büyüsü, Fırtına Çağıran yıldırım (originPx, 120 ms)', () => {
    for (const h of ['assassin', 'dragonheart']) expect(combatClip(h, 'attack')!.events.map((e) => [e.type, e.atMs]), h).toEqual([['impact', 240]]);
    expect(combatClip('necromancer', 'attack')!.events[0]).toMatchObject({ type: 'projectileRelease', projectile: 'spiritBolt', atMs: 240, suggestedTravelMs: 120, originPx: { x: 380, y: 162 } });
    expect(combatClip('stormcaller', 'attack')!.events[0]).toMatchObject({ type: 'projectileRelease', projectile: 'lightningBolt', atMs: 240, suggestedTravelMs: 120, originPx: { x: 421, y: 95 } });
    expect(clipContactMs(combatClip('necromancer', 'attack')!)).toBe(360);
    expect(clipContactMs(combatClip('dragonheart', 'attack')!)).toBe(240);
    // önceki paketler korunur; alternatif kostüm eski akışta
    expect(combatClip('night_screecher', 'attack')!.events[0].projectile).toBe('sonicPulse');
    expect(combatClip('warrior', 'hurt')).not.toBeNull();
  });

  it('Paket 4: Ruh Tilkisi/Naga impact 240 ms; Peri pembe kıvılcım, Siren mavi ses dalgası (originPx, 120 ms)', () => {
    for (const h of ['kitsune', 'naga']) expect(combatClip(h, 'attack')!.events.map((e) => [e.type, e.atMs]), h).toEqual([['impact', 240]]);
    expect(combatClip('fairy', 'attack')!.events[0]).toMatchObject({ type: 'projectileRelease', projectile: 'blossomBolt', atMs: 240, suggestedTravelMs: 120, originPx: { x: 329, y: 108 } });
    expect(combatClip('siren', 'attack')!.events[0]).toMatchObject({ type: 'projectileRelease', projectile: 'lyreWave', atMs: 240, suggestedTravelMs: 120, originPx: { x: 277, y: 131 } });
    expect(clipContactMs(combatClip('siren', 'attack')!)).toBe(360);
    expect(clipContactMs(combatClip('naga', 'attack')!)).toBe(240);
    expect(combatClip('necromancer', 'attack')!.events[0].projectile).toBe('spiritBolt'); // önceki paketler korunur
  });

  it('Paket 5: Minotor/Kristal Golem impact 240 ms; Anka turuncu kor, Cin turkuaz küre (originPx, 120 ms)', () => {
    for (const h of ['minotaur', 'golem']) expect(combatClip(h, 'attack')!.events.map((e) => [e.type, e.atMs]), h).toEqual([['impact', 240]]);
    expect(combatClip('phoenix', 'attack')!.events[0]).toMatchObject({ type: 'projectileRelease', projectile: 'emberBolt', atMs: 240, suggestedTravelMs: 120, originPx: { x: 347, y: 187 } });
    expect(combatClip('djinn', 'attack')!.events[0]).toMatchObject({ type: 'projectileRelease', projectile: 'aetherOrb', atMs: 240, suggestedTravelMs: 120, originPx: { x: 391, y: 92 } });
    expect(clipContactMs(combatClip('djinn', 'attack')!)).toBe(360);
    expect(clipContactMs(combatClip('golem', 'attack')!)).toBe(240);
    expect(combatClip('siren', 'attack')!.events[0].projectile).toBe('lyreWave'); // önceki paketler korunur
  });

  it('Paket 6: İblis impact 240 ms; Serafim altın ışık hilali (originPx, 120 ms); 22 kahramanın tamamı', () => {
    expect(combatClip('demon', 'attack')!.events.map((e) => [e.type, e.atMs])).toEqual([['impact', 240]]);
    expect(combatClip('seraph', 'attack')!.events[0]).toMatchObject({ type: 'projectileRelease', projectile: 'radiantCrescent', atMs: 240, suggestedTravelMs: 120, originPx: { x: 388, y: 117 } });
    expect(clipContactMs(combatClip('seraph', 'attack')!)).toBe(360);
    expect(new Set(allCombatClips().map((c) => c.key)).size).toBe(66);
    expect(combatClip('djinn', 'attack')!.events[0].projectile).toBe('aetherOrb'); // önceki paketler korunur
  });

  it('Paket 7: dört kostüm (hero + costume çifti); varsayılan klipler korunur; animasyonu olmayan kostüm eski akışta', () => {
    for (const k of ['warrior_koz_muhafizi', 'paladin_gumus_safak']) {
      expect(combatClip(k, 'attack')!.events.map((e) => [e.type, e.atMs]), k).toEqual([['impact', 240]]);
      expect(combatClip(k, 'hurt'), k).not.toBeNull();
    }
    expect(combatClip('ranger_gece_izcisi', 'attack')!.events[0]).toMatchObject({ type: 'projectileRelease', projectile: 'arrow', atMs: 240, suggestedTravelMs: 120, originPx: { x: 456, y: 114 } });
    expect(combatClip('mage_ay_kristali', 'attack')!.events[0]).toMatchObject({ type: 'projectileRelease', projectile: 'spell', atMs: 240, suggestedTravelMs: 140, originPx: { x: 455, y: 87 } });
    expect(clipContactMs(combatClip('mage_ay_kristali', 'attack')!)).toBe(380);
    // varsayılan görünümün klibi ayrı kalır
    expect(combatClip('ranger', 'attack')!.events[0].originPx).toEqual({ x: 351, y: 116 });
    expect(combatClip('ranger', 'attack')!.url).not.toBe(combatClip('ranger_gece_izcisi', 'attack')!.url);
  });

  it('Paket 8: on kostüm (hero + costume); yakın saldırılar impact, uzak saldırılar mermi; varsayılanlar korunur', () => {
    const melee = ['werewolf_ay_pencesi', 'vampire_kizil_kadife', 'bigfoot_kiragi_gezgini', 'assassin_kizil_golge', 'dragonheart_safir_ejder', 'kitsune_sonbahar_ruhu'];
    for (const k of melee) {
      expect(combatClip(k, 'attack')!.events.map((e) => [e.type, e.atMs]), k).toEqual([['impact', 240]]);
      expect(combatClip(k, 'hurt'), k).not.toBeNull();
    }
    const ranged: Array<[string, string, { x: number; y: number }]> = [
      ['night_screecher_firtina_cigligi', 'sonicPulse', { x: 316, y: 192 }],
      ['necromancer_mezar_ayazi', 'spiritBolt', { x: 373, y: 188 }],
      ['stormcaller_kara_bulut', 'lightningBolt', { x: 441, y: 14 }],
      ['fairy_ciy_bahcesi', 'blossomBolt', { x: 379, y: 141 }],
    ];
    for (const [k, proj, o] of ranged) {
      expect(combatClip(k, 'attack')!.events[0], k).toMatchObject({ type: 'projectileRelease', projectile: proj, atMs: 240, suggestedTravelMs: 120, originPx: o });
      expect(clipContactMs(combatClip(k, 'attack')!), k).toBe(360);
    }
    expect(combatClip('necromancer', 'attack')!.events[0].originPx).toEqual({ x: 380, y: 162 });
  });

  it('Paket 9 sonrası tam kapsam: 22 varsayılan görünüm + 44 kostümün her birinde saldırı ve hasar alma klibi, idle sheet anahtarıyla aynı', () => {
    const heroes = HERO_CLASS_LIST.map((c) => c.id).filter((id) => hasHeroArt(id));
    expect(heroes).toHaveLength(22);
    expect(COSTUMES).toHaveLength(44);
    for (const h of heroes) {
      const key = idleSheetKey(h);
      expect(key, h).toBe(h);
      for (const a of ['attack', 'hurt'] as const) expect(combatClip(key, a), `${h} ${a}`).not.toBeNull();
    }
    for (const c of COSTUMES) {
      const key = idleSheetKey(c.heroId, c.id);
      expect(key, c.id).toBe(c.id); // savaşta seçili kostümün kaydı çağrılır
      const atk = combatClip(key, 'attack')!;
      const hurt = combatClip(key, 'hurt')!;
      expect(atk, c.id).not.toBeNull();
      expect(hurt, c.id).not.toBeNull();
      expect([atk.columns, atk.rows, atk.frameCount, atk.durationMs], c.id).toEqual([4, 2, 8, 520]);
      expect([hurt.columns, hurt.rows, hurt.frameCount, hurt.durationMs], c.id).toEqual([4, 1, 4, 260]);
      expect(atk.events, c.id).toHaveLength(1);
      expect(atk.url).not.toBe(combatClip(c.heroId, 'attack')!.url); // kostüm klibi varsayılandan ayrı
    }
    // paket kimliği farklı olan kostümler mevcut kimliklere eşlendi
    expect(combatClip('naga_yakut_tahti', 'attack')!.events[0].type).toBe('impact');
    expect(combatClip('djinn_gece_sarayi', 'attack')!.events[0]).toMatchObject({ projectile: 'aetherOrb', originPx: { x: 387, y: 118 } });
    expect(combatClip('seraph_gunes_mabedi', 'attack')!.events[0]).toMatchObject({ projectile: 'radiantCrescent', originPx: { x: 378, y: 121 } });
    expect(combatClip('stormcaller_mercan_firtinasi', 'attack')!.events[0]).toMatchObject({ projectile: 'lightningBolt', originPx: { x: 447, y: 63 } });
  });
});
