import manifest from '../art/heroes-idle/idle-manifest.json';
import meta from '../art/heroes-idle/meta.json';
import { isValidCostume } from './costumes';

/**
 * Çizilmiş bekleme (idle) animasyonları: kahraman/kostüm başına 4×2 ızgarada 8 poz içeren tek bir WebP.
 * `frameSequence` 12 FPS hızında oynatılır (4,5 sn'lik döngü; tekrarlar pozun ekranda kalma süresidir).
 * Bu sheet'lerde eski esnetme (nefes) animasyonu uygulanmaz. Anahtar: sınıf kimliği (varsayılan görünüm) ya da kostüm kimliği.
 * Not: sheet'ler dosya boyutu için 0,75 ölçeğinde saklanır; kare boyutu doku boyutundan hesaplanır.
 */
const URLS = import.meta.glob('../art/heroes-idle/*.webp', { eager: true, import: 'default', query: '?url' }) as Record<string, string>;

export const IDLE_COLUMNS: number = manifest.columns;
export const IDLE_ROWS: number = manifest.rows;
export const IDLE_FRAME_COUNT: number = manifest.frameCount;
export const IDLE_FPS: number = manifest.frameRate;
export const IDLE_SEQUENCE: readonly number[] = manifest.frameSequence;
export const IDLE_DURATION_MS: number = manifest.durationMs;
/** Ayak noktası (kare içinde normalleştirilmiş): çizim bu noktadan zemin çizgisine oturur. */
export const IDLE_ORIGIN: { x: number; y: number } = manifest.origin;

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

/** Saniye cinsinden döngü zamanından gösterilecek kare (0–7). */
export function idleFrameAt(seconds: number): number {
  const n = IDLE_SEQUENCE.length;
  const i = Math.floor(Math.max(0, seconds) * IDLE_FPS + 1e-9) % n;
  return IDLE_SEQUENCE[i];
}
