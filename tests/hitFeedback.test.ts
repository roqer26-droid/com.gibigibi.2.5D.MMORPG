import { describe, expect, it } from 'vitest';
import { existsSync } from 'fs';
import { HERO_ATTACK_SOUNDS, HIT_CUES, HIT_FX, heroHitCue, hitCue, hitOutcome, hitSoundWindow, pilotAttackCue, shouldPlayHitSound } from '../src/game/hitFeedback';

describe('v1.82.0–v1.83.0: vuruş sesi ve isabet efekti', () => {
  it('yedi ses anahtarı, her birinin MP3 dosyası ve efekt tanımı var', () => {
    expect(HIT_CUES.sort()).toEqual(['arrow', 'block', 'claw', 'critical', 'fist', 'spell', 'sword']);
    for (const c of HIT_CUES) {
      expect(existsSync(`src/audio/sfx/${c}.mp3`), c).toBe(true);
      expect(HIT_FX[c].durationMs).toBeGreaterThan(100);
    }
  });

  it('v2: 22 kahramanın varsayılan görünümü eşleşti; kostümler ve bilinmeyen anahtarlar eski ses akışında', () => {
    expect(Object.keys(HERO_ATTACK_SOUNDS)).toHaveLength(22);
    const by = (c: string) => Object.keys(HERO_ATTACK_SOUNDS).filter((h) => HERO_ATTACK_SOUNDS[h] === c).sort();
    expect(by('sword')).toEqual(['assassin', 'demon', 'dragonheart', 'minotaur', 'naga', 'paladin', 'vampire', 'warrior']);
    expect(by('claw')).toEqual(['kitsune', 'werewolf']);
    expect(by('fist')).toEqual(['bigfoot', 'golem']);
    expect(by('arrow')).toEqual(['ranger']);
    expect(by('spell')).toEqual(['djinn', 'fairy', 'mage', 'necromancer', 'night_screecher', 'phoenix', 'seraph', 'siren', 'stormcaller']);
    expect(pilotAttackCue('warrior')).toBe('sword');
    expect(pilotAttackCue('ranger')).toBe('arrow');
    expect(pilotAttackCue('warrior_koz_muhafizi')).toBeNull();
    expect(pilotAttackCue('toString')).toBeNull();
    expect(pilotAttackCue(null)).toBeNull();
    expect(heroHitCue({ hero: 'ranger', outcome: 'hit' })).toBe('arrow');
    expect(heroHitCue({ hero: 'ranger', outcome: 'critical' })).toBe('critical');
    expect(heroHitCue({ hero: 'seraph', outcome: 'block' })).toBe('block');
    expect(heroHitCue({ hero: 'seraph', outcome: 'dodge' })).toBeNull();
    expect(heroHitCue({ hero: 'mage_ay_kristali', outcome: 'hit' })).toBeNull();
  });

  it('sonuç: tam kalkan engellemesi > kritik > normal (kısmen emilen dahil); ıska/sıyrılmada ses yok', () => {
    expect(hitOutcome({ crit: false, hpDamage: 120, absorbed: 0 })).toBe('hit');
    expect(hitOutcome({ crit: false, hpDamage: 40, absorbed: 80 })).toBe('hit');
    expect(hitOutcome({ crit: true, hpDamage: 200, absorbed: 0 })).toBe('critical');
    expect(hitOutcome({ crit: true, hpDamage: 0, absorbed: 200 })).toBe('block');
    expect(hitOutcome({ crit: false, hpDamage: 0, absorbed: 50 })).toBe('block');
    expect(hitCue({ attack: 'sword', outcome: 'hit' })).toBe('sword');
    expect(hitCue({ attack: 'sword', outcome: 'critical' })).toBe('critical');
    expect(hitCue({ attack: 'claw', outcome: 'block' })).toBe('block');
    expect(hitCue({ attack: 'claw', outcome: 'dodge' })).toBeNull();
    expect(hitCue({ attack: 'unknown', outcome: 'hit' })).toBe('fist');
  });

  it('ses yığılması: 1× 48 ms, 2× 75 ms içinde tekrar bastırılır; kritik/kalkan normal sese öncelik alır', () => {
    expect(hitSoundWindow(1)).toBeCloseTo(0.048);
    expect(hitSoundWindow(2)).toBeCloseTo(0.075);
    const normal = { time: 10, priority: false };
    const prio = { time: 10, priority: true };
    expect(shouldPlayHitSound(null, 10, 'sword', 1)).toBe(true);
    expect(shouldPlayHitSound(normal, 10.03, 'sword', 1)).toBe(false);
    expect(shouldPlayHitSound(normal, 10.05, 'sword', 1)).toBe(true);
    expect(shouldPlayHitSound(normal, 10.06, 'sword', 2)).toBe(false); // 2× daha geniş pencere
    expect(shouldPlayHitSound(normal, 10.08, 'sword', 2)).toBe(true);
    expect(shouldPlayHitSound(normal, 10.01, 'critical', 1)).toBe(true); // öncelik
    expect(shouldPlayHitSound(normal, 10.01, 'block', 2)).toBe(true);
    expect(shouldPlayHitSound(prio, 10.01, 'critical', 1)).toBe(false); // öncelikli üst üste binmez
    expect(shouldPlayHitSound(prio, 10.01, 'sword', 1)).toBe(false);
  });
});
