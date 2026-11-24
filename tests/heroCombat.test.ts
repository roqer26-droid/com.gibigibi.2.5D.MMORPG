import { describe, expect, it } from 'vitest';
import manifest from '../src/art/heroes-combat/combat-manifest.json';
import { COMBAT_ORIGIN, COMBAT_SOURCE_FRAME, allCombatClips, clipContactMs, clipEventsBetween, clipFrameAt, clipFrameStarts, combatClip } from '../src/data/heroCombat';
import { IDLE_ORIGIN } from '../src/data/heroIdle';

describe('v1.73.0: çizilmiş saldırı ve hasar alma klipleri', () => {
  it('manifest: dört kahramanın varsayılan görünümü, saldırı 4×2 / 520 ms, hasar 4×1 / 260 ms; idle ile aynı ayak noktası', () => {
    expect(allCombatClips()).toHaveLength(44);
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
    expect(manifest.textures.every((t) => t.costume === 'default')).toBe(true);
  });

  it('kostüm ya da klibi olmayan görünüm eski statik poza düşer', () => {
    expect(combatClip('warrior_koz_muhafizi', 'attack')).toBeNull();
    expect(combatClip('seraph_gece_mabedi', 'attack')).toBeNull();
    expect(combatClip('phoenix_gunes_taci', 'attack')).toBeNull();
    expect(combatClip('fairy_yildiz_tozu', 'attack')).toBeNull();
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
    expect(combatClip('night_screecher_firtina_cigligi', 'attack')).toBeNull();
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
    expect(combatClip('assassin_mor_sis', 'attack')).toBeNull();
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
    expect(new Set(allCombatClips().map((c) => c.key)).size).toBe(22);
    expect(combatClip('djinn', 'attack')!.events[0].projectile).toBe('aetherOrb'); // önceki paketler korunur
  });
});
