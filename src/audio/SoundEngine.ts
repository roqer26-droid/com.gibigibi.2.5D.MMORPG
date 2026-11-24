import { GameSettings, GemType } from '../types/game';
import { HIT_CUES, shouldPlayHitSound, type HitCue, type LastHitSound } from '../game/hitFeedback';

/** Vuruş ses dosyaları (vuruş ve ses paketi): anahtar başına bir MP3. */
const HIT_SFX_URL = import.meta.glob('./sfx/*.mp3', { eager: true, import: 'default', query: '?url' }) as Record<string, string>;
const hitSfxUrl = (cue: HitCue): string | undefined => HIT_SFX_URL[`./sfx/${cue}.mp3`];

type MusicMode = 'none' | 'menu' | 'battle' | 'boss';

class SoundEngineImpl {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  private settings: GameSettings = {
    musicVolume: 0.38,
    sfxVolume: 0.65,
    muted: false,
    screenShake: true,
    highParticles: true,
    battleSpeed: 1,
  };

  private mode: MusicMode = 'none';
  private step = 0;
  private timerId: number | null = null;
  private intensity = 1; // increases during combos / ultimates

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain.connect(this.ctx.destination);
      this.sfxGain.connect(this.ctx.destination);
      this.applyVolumes();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock() {
    const ctx = this.ensureContext();
    if (ctx) void this.loadHitSounds(ctx);
  }

  // --- Vuruş sesleri (MP3): yalnızca sfx kanalından çalar, sessiz/ses seviyesi ayarlarına bağlıdır ---
  private hitBuffers = new Map<HitCue, AudioBuffer>();
  private hitLoading: Promise<void> | null = null;
  private lastHit: (LastHitSound & { src: AudioBufferSourceNode; gain: GainNode; end: number }) | null = null;
  /** Doğrulama için: çalınan/bastırılan vuruş sesleri */
  public hitLog: Array<{ cue: HitCue; played: boolean; at: number; reason?: string }> = [];

  private loadHitSounds(ctx: AudioContext): Promise<void> {
    this.hitLoading ??= Promise.allSettled(
      HIT_CUES.map(async (cue) => {
        const url = hitSfxUrl(cue);
        if (!url) throw new Error(`ses yok: ${cue}`);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`ses yüklenemedi: ${cue}`);
        this.hitBuffers.set(cue, await ctx.decodeAudioData(await res.arrayBuffer()));
      })
    ).then(() => undefined);
    return this.hitLoading;
  }

  /** Vuruş sesleri hazır mı (test ve yedek davranış için). */
  public hitSoundsReady(cue?: HitCue): boolean {
    return cue ? this.hitBuffers.has(cue) : this.hitBuffers.size === HIT_CUES.length;
  }

  /**
   * Tek bir vuruş sesi çalar. 2× hızda perde korunur, kuyruk kısalır. Yığılma penceresindeki tekrar bastırılır;
   * kritik/kalkan sesi yakın zamanda çalan normal sesin yerini alır. Dosya yüklenemediyse sentez vuruş sesine düşer.
   * Sessizde hiçbir şey çalmaz. Dönüş: ses çalındı mı.
   */
  public playHitCue(cue: HitCue, speed = 1): boolean {
    const log = (played: boolean, reason?: string) => {
      this.hitLog.push({ cue, played, at: typeof performance !== 'undefined' ? performance.now() : 0, reason });
      if (this.hitLog.length > 60) this.hitLog.shift();
      return played;
    };
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return log(false, 'no-audio');
    if (this.settings.muted || this.settings.sfxVolume <= 0) return log(false, 'muted');
    const now = ctx.currentTime;
    if (!shouldPlayHitSound(this.lastHit, now, cue, speed)) return log(false, 'stacked');
    const buf = this.hitBuffers.get(cue);
    if (!buf) {
      void this.loadHitSounds(ctx);
      this.playWeaponHit(cue === 'critical');
      this.lastHit = null;
      return log(true, 'fallback');
    }
    const prev = this.lastHit;
    if (prev && prev.end > now) {
      prev.gain.gain.cancelScheduledValues(now);
      prev.gain.gain.setTargetAtTime(0, now, 0.004);
      try {
        prev.src.stop(now + 0.018);
      } catch {
        /* zaten durdu */
      }
    }
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = buf;
    const length = buf.duration * (speed >= 2 ? 0.72 : 1);
    const fade = Math.min(0.035, length / 3);
    gain.gain.setValueAtTime(0.83, now);
    gain.gain.setValueAtTime(0.83, now + length - fade);
    gain.gain.linearRampToValueAtTime(0, now + length);
    src.connect(gain);
    gain.connect(this.sfxGain);
    src.onended = () => {
      src.disconnect();
      gain.disconnect();
    };
    src.start(now);
    src.stop(now + length);
    this.lastHit = { time: now, priority: cue === 'block' || cue === 'critical', src, gain, end: now + length };
    return log(true);
  }

  public updateSettings(settings: GameSettings) {
    this.settings = { ...settings };
    this.applyVolumes();
  }

  private applyVolumes() {
    if (!this.ctx || !this.musicGain || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const mVol = this.settings.muted ? 0 : this.settings.musicVolume * 0.35;
    const sVol = this.settings.muted ? 0 : this.settings.sfxVolume * 0.7;
    this.musicGain.gain.setTargetAtTime(mVol, now, 0.05);
    this.sfxGain.gain.setTargetAtTime(sVol, now, 0.03);
  }

  public setIntensity(combo: number) {
    this.intensity = Math.min(3, 1 + Math.max(0, combo - 1) * 0.35);
  }

  public setMusicMode(mode: MusicMode) {
    if (this.mode === mode) return;
    this.mode = mode;
    this.step = 0;
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
    if (mode === 'none') return;

    const tempoMs = mode === 'menu' ? 420 : mode === 'battle' ? 240 : 195;
    this.timerId = window.setInterval(() => {
      this.tickMusic();
    }, tempoMs);
  }

  private tickMusic() {
    if (this.settings.muted || this.settings.musicVolume <= 0.01) return;
    if (!this.ctx || this.ctx.state !== 'running' || !this.musicGain) return;

    const now = this.ctx.currentTime;

    if (this.mode === 'menu') {
      // Mystical D Dorian harp arpeggio
      const scale = [293.66, 349.23, 440.0, 523.25, 587.33, 440.0, 349.23, 392.0];
      const freq = scale[this.step % scale.length];
      this.playTone(freq, 'triangle', 0.38, 0.14, this.musicGain, now);
      if (this.step % 4 === 0) {
        this.playTone(146.83, 'sine', 0.9, 0.18, this.musicGain, now);
      }
    } else if (this.mode === 'battle') {
      // Heroic battle pulse
      const bass = [146.83, 146.83, 174.61, 130.81, 146.83, 146.83, 196.0, 164.81];
      const lead = [293.66, 349.23, 440.0, 392.0, 523.25, 440.0, 349.23, 392.0];
      const bFreq = bass[this.step % bass.length];
      this.playTone(bFreq, 'sawtooth', 0.16, 0.11, this.musicGain, now, 650);
      if (this.step % 2 === 0 || this.intensity > 1.5) {
        const lFreq = lead[(this.step + Math.floor(this.intensity)) % lead.length];
        this.playTone(lFreq, 'triangle', 0.2, 0.12 * Math.min(1.4, this.intensity), this.musicGain, now);
      }
      if (this.step % 2 === 0) {
        this.playDrum(now, 0.09);
      }
    } else if (this.mode === 'boss') {
      // Intense dramatic boss ostinato
      const bass = [110.0, 110.0, 116.54, 110.0, 130.81, 116.54, 98.0, 110.0];
      const lead = [220.0, 261.63, 329.63, 311.13, 349.23, 329.63, 261.63, 246.94];
      const bFreq = bass[this.step % bass.length];
      this.playTone(bFreq, 'sawtooth', 0.15, 0.15, this.musicGain, now, 850);
      this.playTone(lead[this.step % lead.length] * (this.intensity > 1.8 ? 2 : 1), 'square', 0.14, 0.07, this.musicGain, now, 1400);
      this.playDrum(now, this.step % 2 === 0 ? 0.15 : 0.08);
    }

    this.step += 1;
  }

  private playTone(
    freq: number,
    type: OscillatorType,
    dur: number,
    vol: number,
    dest: AudioNode,
    startTime: number,
    filterHz?: number
  ) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(vol, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0008, startTime + dur);

    if (filterHz) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(filterHz, startTime);
      osc.connect(filter);
      filter.connect(gain);
    } else {
      osc.connect(gain);
    }

    gain.connect(dest);
    osc.start(startTime);
    osc.stop(startTime + dur + 0.03);
  }

  private playDrum(startTime: number, vol: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(115, startTime);
    osc.frequency.exponentialRampToValueAtTime(38, startTime + 0.11);
    gain.gain.setValueAtTime(vol, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(startTime);
    osc.stop(startTime + 0.13);
  }

  private playNoise(dur: number, vol: number, filterFreq: number, filterType: BiquadFilterType = 'bandpass') {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.settings.muted) return;
    const bufferSize = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start();
  }

  public playGemSelect() {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.settings.muted) return;
    this.playTone(620, 'sine', 0.08, 0.18, this.sfxGain, ctx.currentTime);
  }

  public playGemSwap() {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.settings.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(580, now + 0.1);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playInvalidSwap() {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.settings.muted) return;
    const now = ctx.currentTime;
    this.playTone(210, 'sawtooth', 0.12, 0.12, this.sfxGain, now, 600);
    this.playTone(160, 'sawtooth', 0.14, 0.12, this.sfxGain, now + 0.08, 500);
  }

  public playGemMatch(comboLevel: number, gemType: GemType) {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.settings.muted) return;
    const now = ctx.currentTime;
    // Escalating pentatonic pitch!
    const notes = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];
    const base = notes[Math.min(notes.length - 1, Math.max(0, comboLevel - 1))];

    if (gemType === 'fire') {
      this.playTone(base, 'triangle', 0.18, 0.22, this.sfxGain, now);
      this.playNoise(0.16, 0.18, 420, 'lowpass');
    } else if (gemType === 'frost') {
      this.playTone(base * 1.25, 'sine', 0.22, 0.2, this.sfxGain, now);
      this.playTone(base * 1.5, 'triangle', 0.18, 0.14, this.sfxGain, now + 0.04);
    } else if (gemType === 'nature') {
      this.playTone(base, 'sine', 0.25, 0.22, this.sfxGain, now);
      this.playTone(base * 1.25, 'sine', 0.25, 0.16, this.sfxGain, now + 0.05);
    } else if (gemType === 'lightning') {
      this.playTone(base * 1.3, 'square', 0.11, 0.12, this.sfxGain, now, 2200);
      this.playNoise(0.12, 0.16, 2600, 'highpass');
    } else if (gemType === 'arcane') {
      this.playTone(base, 'triangle', 0.26, 0.2, this.sfxGain, now);
      this.playTone(base * 1.5, 'sine', 0.28, 0.16, this.sfxGain, now + 0.03);
    } else {
      // golden
      this.playTone(base, 'triangle', 0.28, 0.24, this.sfxGain, now);
      this.playTone(base * 1.25, 'triangle', 0.28, 0.2, this.sfxGain, now + 0.05);
      this.playTone(base * 1.5, 'sine', 0.34, 0.22, this.sfxGain, now + 0.1);
    }
  }

  public playWeaponHit(isCrit = false) {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.settings.muted) return;
    const now = ctx.currentTime;
    this.playNoise(isCrit ? 0.22 : 0.12, isCrit ? 0.34 : 0.2, isCrit ? 900 : 1200);
    this.playTone(isCrit ? 140 : 180, 'sawtooth', 0.14, isCrit ? 0.26 : 0.16, this.sfxGain, now, 700);
    if (isCrit) {
      this.playTone(880, 'triangle', 0.18, 0.2, this.sfxGain, now + 0.02);
    }
  }

  /** Yeni yetenekleri mevcut ses ailelerine eşler */
  private normalizeSkillSound(kind: string): string {
    if (kind === 'flame_rain' || kind === 'berserk' || kind === 'shield_bash') return 'fireball';
    if (kind === 'frost_lance' || kind === 'frost_prison' || kind === 'mana_surge')
      return 'ice_storm';
    if (kind === 'thunder_chain' || kind === 'multi_shot' || kind === 'sniper_mark')
      return 'lightning_strike';
    if (
      kind === 'venom_bloom' ||
      kind === 'stone_bulwark' ||
      kind === 'holy_shield' ||
      kind === 'divine_heal'
    )
      return 'natures_blessing';
    if (
      kind === 'shadow_step' ||
      kind === 'chrono_shift' ||
      kind === 'war_cry' ||
      kind === 'chaos_rift' ||
      kind === 'holy_judgement' ||
      kind === 'golden_dragon'
    )
      return 'arcane_explosion';
    return kind;
  }

  public playSkillCast(kindRaw: string) {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.settings.muted) return;
    const now = ctx.currentTime;
    const kind = this.normalizeSkillSound(kindRaw);
    if (kind === 'fireball') {
      this.playNoise(0.38, 0.3, 450, 'lowpass');
      this.playTone(220, 'sawtooth', 0.3, 0.2, this.sfxGain, now, 800);
    } else if (kind === 'ice_storm') {
      this.playNoise(0.32, 0.22, 3200, 'highpass');
      this.playTone(987.77, 'sine', 0.35, 0.2, this.sfxGain, now);
      this.playTone(1318.5, 'sine', 0.35, 0.18, this.sfxGain, now + 0.07);
    } else if (kind === 'lightning_strike') {
      this.playNoise(0.28, 0.35, 2200, 'bandpass');
      this.playTone(740, 'square', 0.14, 0.18, this.sfxGain, now, 2600);
      this.playTone(1120, 'square', 0.14, 0.16, this.sfxGain, now + 0.08, 2800);
    } else if (kind === 'natures_blessing') {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
        this.playTone(f, 'sine', 0.35, 0.18, this.sfxGain!, now + idx * 0.07);
      });
    } else if (kind === 'arcane_explosion') {
      this.playNoise(0.42, 0.28, 700, 'bandpass');
      [330, 495, 660, 990].forEach((f, idx) => {
        this.playTone(f, 'triangle', 0.32, 0.18, this.sfxGain!, now + idx * 0.04);
      });
    } else {
      // Ultimate!
      this.playNoise(0.65, 0.36, 520, 'lowpass');
      [261.63, 329.63, 392.0, 523.25, 659.25, 783.99].forEach((f, idx) => {
        this.playTone(f, 'sawtooth', 0.55, 0.14, this.sfxGain!, now + idx * 0.055, 2400);
      });
    }
  }

  public playBossRoar() {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.settings.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(125, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.75);
    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.82);
    this.playNoise(0.6, 0.25, 340, 'lowpass');
  }

  public playVictory() {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.settings.muted) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      this.playTone(f, 'triangle', 0.42, 0.22, this.sfxGain!, now + i * 0.11);
    });
  }

  public playDefeat() {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.settings.muted) return;
    const now = ctx.currentTime;
    [392.0, 349.23, 311.13, 261.63].forEach((f, i) => {
      this.playTone(f, 'sawtooth', 0.45, 0.14, this.sfxGain!, now + i * 0.16, 900);
    });
  }

  public playLevelUp() {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.settings.muted) return;
    const now = ctx.currentTime;
    [440, 554.37, 659.25, 880, 1108.73].forEach((f, i) => {
      this.playTone(f, 'triangle', 0.45, 0.22, this.sfxGain!, now + i * 0.09);
    });
  }

  public playLootReveal(highRarity = false) {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.settings.muted) return;
    const now = ctx.currentTime;
    const notes = highRarity ? [587.33, 739.99, 880, 1174.66, 1479.98] : [523.25, 659.25, 783.99];
    notes.forEach((f, i) => {
      this.playTone(f, 'sine', 0.35, 0.2, this.sfxGain!, now + i * 0.075);
    });
  }
}

export const SoundEngine = new SoundEngineImpl();
