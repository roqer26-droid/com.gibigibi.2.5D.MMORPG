import manifest from '../art/heroes-combat/combat-manifest.json';

/**
 * Çizilmiş savaş klipleri (saldırı / hasar alma): kahraman görünümü başına tek seferlik sprite atlası.
 * Kareler idle ile aynı piksel ölçeğinde ve aynı zemin referansındadır (`origin`, 372/384); kare yatayda daha geniştir.
 * Klip bir kez oynar, ardından idle döngüsüne dönülür. Süreler 1× hızdadır; sahne saati hız çarpanıyla ölçeklenir (2×'te tek bir kez yarıya iner).
 * Anahtar: sınıf kimliği (varsayılan görünüm) ya da kostüm kimliği; kaydı olmayan görünüm eski statik poz davranışını kullanır.
 */
const URLS = import.meta.glob('../art/heroes-combat/*.webp', { eager: true, import: 'default', query: '?url' }) as Record<string, string>;

export type CombatAction = 'attack' | 'hurt';

export interface CombatEvent {
  type: 'impact' | 'projectileRelease';
  frame: number;
  atMs: number;
  projectile?: 'arrow' | 'spell';
  suggestedTravelMs?: number;
  /** Mermi çıkış noktası, kaynak kare pikselinde (kare: `sourceFrame` boyutu) */
  originPx?: { x: number; y: number };
}

export interface CombatClip {
  key: string;
  action: CombatAction;
  url: string;
  columns: number;
  rows: number;
  frameCount: number;
  frameDurationsMs: readonly number[];
  durationMs: number;
  events: readonly CombatEvent[];
}

/** Kaynak kare boyutu ve ayak noktası (manifest). */
export const COMBAT_SOURCE_FRAME = { w: manifest.frameWidth as number, h: manifest.frameHeight as number };
export const COMBAT_ORIGIN: { x: number; y: number } = manifest.origin;

interface ManifestAction {
  columns: number;
  rows: number;
  frameCount: number;
  frameDurationsMs: number[];
  durationMs: number;
  events: CombatEvent[];
}
interface ManifestEntry {
  hero: string;
  costume: string;
  key?: string;
  actions: Partial<Record<CombatAction, ManifestAction>>;
}

const CLIPS: Record<string, CombatClip> = {};
for (const t of manifest.textures as unknown as ManifestEntry[]) {
  const key = t.key ?? (t.costume === 'default' ? t.hero : `${t.hero}_${t.costume}`);
  for (const action of ['attack', 'hurt'] as const) {
    const a = t.actions[action];
    const url = URLS[`../art/heroes-combat/${key}_${action}.webp`];
    if (!a || !url) continue;
    CLIPS[`${key}:${action}`] = {
      key,
      action,
      url,
      columns: a.columns,
      rows: a.rows,
      frameCount: a.frameCount,
      frameDurationsMs: a.frameDurationsMs,
      durationMs: a.durationMs,
      events: [...a.events].sort((x, y) => x.atMs - y.atMs),
    };
  }
}

/** Görünüm anahtarı (idle sheet anahtarıyla aynı) ve eylem için klip; yoksa null (eski statik poz). */
export function combatClip(key: string | null | undefined, action: CombatAction): CombatClip | null {
  return (key && CLIPS[`${key}:${action}`]) || null;
}

/** Tüm kayıtlı klipler (önyükleme ve testler için). */
export const allCombatClips = (): CombatClip[] => Object.values(CLIPS);

/** Her karenin başlangıç zamanı (1× ms). */
export function clipFrameStarts(clip: CombatClip): number[] {
  const out: number[] = [];
  let t = 0;
  for (let i = 0; i < clip.frameCount; i++) {
    out.push(t);
    t += clip.frameDurationsMs[i] ?? 0;
  }
  return out;
}

/** Klip zamanından (1× ms) gösterilecek kare; süre bitince son kare. */
export function clipFrameAt(clip: CombatClip, ms: number): number {
  const starts = clipFrameStarts(clip);
  let f = 0;
  for (let i = 0; i < starts.length; i++) if (ms >= starts[i]) f = i;
  return f;
}

/** (from, to] aralığında geçilen olaylar, zaman sırasıyla (kare atlansa da her olay bir kez). İlk çağrıda from = -1 verilir. */
export function clipEventsBetween(clip: CombatClip, fromMs: number, toMs: number): CombatEvent[] {
  return clip.events.filter((e) => e.atMs > fromMs && e.atMs <= toMs);
}

/**
 * Saldırının temas anı (1× ms, klip başlangıcından): yakın dövüşte `impact`, menzilli/büyüde `projectileRelease` + yolculuk süresi.
 * Hasar sayısı, ses ve düşman tepkisi bu ana hizalanır.
 */
export function clipContactMs(clip: CombatClip): number {
  const impact = clip.events.find((e) => e.type === 'impact');
  if (impact) return impact.atMs;
  const rel = clip.events.find((e) => e.type === 'projectileRelease');
  if (rel) return rel.atMs + (rel.suggestedTravelMs ?? 120);
  return Math.round(clip.durationMs / 2);
}
