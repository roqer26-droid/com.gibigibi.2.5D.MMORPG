/**
 * Vuruş sesi ve isabet efekti kararları (saf mantık; ses çalma SoundEngine'de, çizim BattleScene'de).
 * Kaynak: vuruş ve ses paketi (combat-feedback.mjs, hero-sounds.mjs) — ses kahramandan (heroId), tüm kostümler dahil.
 */

export type HitCue = 'sword' | 'claw' | 'fist' | 'arrow' | 'spell' | 'critical' | 'block';
export type HitOutcome = 'hit' | 'critical' | 'block' | 'dodge' | 'none';

/** Efekt rengi, 1× süresi (ms) ve kesik sayısı. */
export const HIT_FX: Readonly<Record<HitCue, { color: number; durationMs: number; slashes: number }>> = {
  sword: { color: 0xffe0a0, durationMs: 180, slashes: 1 },
  claw: { color: 0xe0b8ff, durationMs: 180, slashes: 3 },
  fist: { color: 0xffd19a, durationMs: 220, slashes: 0 },
  arrow: { color: 0xd0ffbd, durationMs: 150, slashes: 1 },
  spell: { color: 0xd6b9ff, durationMs: 240, slashes: 0 },
  critical: { color: 0xffdf85, durationMs: 245, slashes: 2 },
  block: { color: 0xaee8ff, durationMs: 185, slashes: 0 },
};

export const HIT_CUES = Object.keys(HIT_FX) as HitCue[];

/**
 * 22 kahramanın saldırı sesi (vuruş ve ses paketi v2, `hero-sounds.mjs`). Anahtar yalnızca kahraman kimliğidir (`heroId`);
 * kahramanın tüm görünümleri (varsayılan + kostümler) bu sesi paylaşır.
 */
export const HERO_ATTACK_SOUNDS: Readonly<Record<string, HitCue>> = {
  warrior: 'sword',
  paladin: 'sword',
  ranger: 'arrow',
  mage: 'spell',
  werewolf: 'claw',
  vampire: 'sword',
  bigfoot: 'fist',
  night_screecher: 'spell',
  necromancer: 'spell',
  assassin: 'sword',
  stormcaller: 'spell',
  dragonheart: 'sword',
  fairy: 'spell',
  kitsune: 'claw',
  naga: 'sword',
  siren: 'spell',
  minotaur: 'sword',
  golem: 'fist',
  phoenix: 'spell',
  djinn: 'spell',
  demon: 'sword',
  seraph: 'spell',
};
/** Geriye uyumluluk: ilk pilot (v1.82.0) bu tablonun alt kümesiydi. */
export const HIT_PILOT = HERO_ATTACK_SOUNDS;

const ownSound = (heroId: string | null | undefined): HitCue | null =>
  heroId && Object.prototype.hasOwnProperty.call(HERO_ATTACK_SOUNDS, heroId) ? HERO_ATTACK_SOUNDS[heroId] : null;

/**
 * Kahramanın vuruş sesi — yalnızca `heroId` üzerinden. Varsayılan görünüm ve tüm kostümler (gelecekte eklenecekler dahil)
 * aynı ses kaydını kullanır; kostüm başına ses tanımı ya da MP3 yoktur. Bilinmeyen kahramanda null (eski ses akışı).
 */
export function heroAttackCue(heroId: string | null | undefined): HitCue | null {
  return ownSound(heroId);
}

/**
 * Bir görünümün (kahraman + kostüm) vuruş sesi: kostüm yok sayılır, ses kahramandan gelir.
 * (Animasyon ve görsel efekt ise `heroId + costumeId` ile ayrı seçilir: heroCombat / CLIP_FX.)
 */
export function appearanceAttackCue(heroId: string, _costumeId?: string | null): HitCue | null {
  return heroAttackCue(heroId);
}

/** v1.82.0 uyumluluğu: anahtar bir kahraman kimliğiyse sesi (kostüm kimliği verilirse null). Yeni kod `heroAttackCue` kullanır. */
export function pilotAttackCue(appearanceKey: string | null | undefined): HitCue | null {
  return ownSound(appearanceKey);
}

/** `heroHitCue({hero, outcome})` karşılığı: kahraman + savaş sonucu → ses; sıyrılmada ya da kahraman yoksa null. */
export function heroHitCue({ hero, outcome = 'hit' }: { hero: string; outcome?: HitOutcome }): HitCue | null {
  const attack = heroAttackCue(hero);
  return attack ? hitCue({ attack, outcome }) : null;
}

/** Savaş sonucundan çalınacak ses/efekt: tam engelleme ve kritik, saldırı sesinin yerini alır; ıska/sıyrılmada yok. */
export function hitCue({ attack, outcome = 'hit' }: { attack: HitCue | string; outcome?: HitOutcome }): HitCue | null {
  if (outcome === 'dodge' || outcome === 'none') return null;
  if (outcome === 'block' || outcome === 'critical') return outcome;
  return attack in HIT_FX ? (attack as HitCue) : 'fist';
}

/**
 * Vuruş sonucu: kalkan tüm hasarı emdiyse `block`, kritikse `critical`, kısmen emilen dahil diğer gerçek hasar `hit`.
 * (Kritik vuruşu kalkan tamamen emerse sonuç `block`tur: kalkan sesi kritik sesin yerini alır.)
 */
export function hitOutcome(opts: { crit: boolean; hpDamage: number; absorbed: number }): HitOutcome {
  if (opts.hpDamage <= 0 && opts.absorbed > 0) return 'block';
  if (opts.crit) return 'critical';
  return 'hit';
}

/** Ses yığılmasını önleme penceresi (saniye): 1× 48 ms, 2× 75 ms. */
export const hitSoundWindow = (speed: number) => (speed >= 2 ? 0.075 : 0.048);

export interface LastHitSound {
  time: number;
  priority: boolean;
}

/**
 * Bu ses şimdi çalınsın mı? Pencere içindeki tekrar bastırılır; kritik ve tam engelleme yakın zamanda çalan
 * normal sese öncelik alır (önceki öncelikli değilse).
 */
export function shouldPlayHitSound(prev: LastHitSound | null, now: number, cue: HitCue, speed: number): boolean {
  if (!prev) return true;
  const priority = cue === 'block' || cue === 'critical';
  if (now - prev.time < hitSoundWindow(speed) && (!priority || prev.priority)) return false;
  return true;
}
