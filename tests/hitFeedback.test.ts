import { describe, expect, it } from 'vitest';
import { existsSync } from 'fs';
import { HIT_CUES, HIT_FX, HIT_PILOT, hitCue, hitOutcome, hitSoundWindow, pilotAttackCue, shouldPlayHitSound } from '../src/game/hitFeedback';

describe('v1.82.0: vuruş sesi ve isabet efekti pilotu', () => {
  it('yedi ses anahtarı, her birinin MP3 dosyası ve efekt tanımı var', () => {
    expect(HIT_CUES.sort()).toEqual(['arrow', 'block', 'claw', 'critical', 'fist', 'spell', 'sword']);
    for (const c of HIT_CUES) {
      expect(existsSync(`src/audio/sfx/${c}.mp3`), c).toBe(true);
      expect(HIT_FX[c].durationMs).toBeGreaterThan(100);
    }
  });

  it('pilot yalnızca dört varsayılan görünüm; kostümler ve diğer kahramanlar eski ses akışında', () => {
    expect(HIT_PILOT).toEqual({ warrior: 'sword', werewolf: 'claw', golem: 'fist', mage: 'spell' });
    expect(pilotAttackCue('warrior')).toBe('sword');
    expect(pilotAttackCue('mage')).toBe('spell');
    expect(pilotAttackCue('warrior_koz_muhafizi')).toBeNull();
    expect(pilotAttackCue('ranger')).toBeNull();
    expect(pilotAttackCue(null)).toBeNull();
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
