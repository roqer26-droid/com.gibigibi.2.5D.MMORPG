import manifest from '../art/heroes-idle/idle-manifest.json';
import meta from '../art/heroes-idle/meta.json';
import { isValidCostume } from './costumes';

/**
 * Çizilmiş bekleme (idle) animasyonları: kahraman/kostüm başına tek bir WebP (4×2 ya da 4×4 ızgara; 8 ya da 16 poz).
 * Her sheet'in `frameSequence` dizisi kendi `frameRate` değeriyle oynatılır (tekrarlar pozun ekranda kalma süresidir).
 * Bu sheet'lerde eski esnetme (nefes) animasyonu uygulanmaz. Anahtar: sınıf kimliği (varsayılan görünüm) ya da kostüm kimliği.
 * Not: sheet'ler dosya boyutu için 0,75 ölçeğinde saklanır; kare boyutu doku boyutundan hesaplanır.
 */
const URLS = import.meta.glob('../art/heroes-idle/*.webp', { eager: true, import: 'default', query: '?url' }) as Record<string, string>;

/** Bir sheet'in oynatma bilgisi: ızgara, kare sayısı, hız ve kare dizisi (manifestte sheet başına ya da üst düzeyde). */
export interface IdleSpec {
  columns: number;
  rows: number;
  frameCount: number;
  fps: number;
  sequence: readonly number[];
  durationMs: number;
}
export const IDLE_COLUMNS: number = manifest.columns;
export const IDLE_ROWS: number = manifest.rows;
export const IDLE_FRAME_COUNT: number = manifest.frameCount;
export const IDLE_FPS: number = manifest.frameRate;
export const IDLE_SEQUENCE: readonly number[] = manifest.frameSequence;
export const IDLE_DURATION_MS: number = manifest.durationMs;
/** Ayak noktası (kare içinde normalleştirilmiş): çizim bu noktadan zemin çizgisine oturur. */
export const IDLE_ORIGIN: { x: number; y: number } = manifest.origin;

export const IDLE_DEFAULT_SPEC: IdleSpec = {
  columns: IDLE_COLUMNS,
  rows: IDLE_ROWS,
  frameCount: IDLE_FRAME_COUNT,
  fps: IDLE_FPS,
  sequence: IDLE_SEQUENCE,
  durationMs: IDLE_DURATION_MS,
};

interface ManifestEntry {
  hero: string;
  costume: string;
  key?: string;
  columns?: number;
  rows?: number;
  frameCount?: number;
  frameRate?: number;
  frameSequence?: number[];
  durationMs?: number;
}
const SPECS: Record<string, IdleSpec> = {};
for (const t of manifest.textures as ManifestEntry[]) {
  const key = t.key ?? (t.costume === 'default' ? t.hero : `${t.hero}_${t.costume}`);
  SPECS[key] = {
    columns: t.columns ?? IDLE_COLUMNS,
    rows: t.rows ?? IDLE_ROWS,
    frameCount: t.frameCount ?? IDLE_FRAME_COUNT,
    fps: t.frameRate ?? IDLE_FPS,
    sequence: t.frameSequence ?? IDLE_SEQUENCE,
    durationMs: t.durationMs ?? IDLE_DURATION_MS,
  };
}
/** Sheet anahtarına göre oynatma bilgisi (bilinmiyorsa 4×2 varsayılanı). */
export const idleSpec = (key: string | null | undefined): IdleSpec => (key && SPECS[key]) || IDLE_DEFAULT_SPEC;

export const IDLE_SHEET_URL: Record<string, string> = {};
for (const [path, url] of Object.entries(URLS)) IDLE_SHEET_URL[path.split('/').pop()!.replace(/\.webp$/, '')] = url;

/** Kahraman + (isteğe bağlı) kostüm için sheet anahtarı; sheet yoksa null (statik çizim + eski nefes). */
export function idleSheetKey(classId: string, costumeId?: string | null): string | null {
  if (costumeId && isValidCostume(classId, costumeId)) return IDLE_SHEET_URL[costumeId] ? costumeId : null;
  return IDLE_SHEET_URL[classId] ? classId : null;
}

/** 1. karedeki çizimin tepe ve taban noktası (kare yüksekliğine oranla). */
export const idleReference = (key: string): { top: number; bottom: number } | null => {
  const m = (meta as Record<string, { refTop: number; refBottom: number }>)[key];
  return m ? { top: m.refTop, bottom: m.refBottom } : null;
};

/** Saniye cinsinden döngü zamanından gösterilecek kare (sheet'in kendi hızı ve dizisiyle). */
export function idleFrameAt(seconds: number, spec: IdleSpec = IDLE_DEFAULT_SPEC): number {
  const n = spec.sequence.length;
  const i = Math.floor(Math.max(0, seconds) * spec.fps + 1e-9) % n;
  return spec.sequence[i];
}
