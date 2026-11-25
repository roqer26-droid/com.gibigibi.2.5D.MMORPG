import manifest from '../art/companions-anim/companion-anim-manifest.json';
import type { CompanionId } from '../types/game';

/**
 * Yoldaş animasyonları: yoldaş başına tek sprite atlası (4 sütun × 3 satır).
 * 1. satır bekleme / nefes (sürekli döngü), 2. satır saldırı / özel yetenek, 3. satır savunma.
 * Sheet'ler `scripts/companion-sheets.py` ile hazırlanır (taşan efektler kendi karesine taşınır, kareler yeniden ortalanmaz;
 * karakter her karede hücre içindeki yerinde kalır). Yeni yoldaş: sheet'i betikle işle; manifest kaydı ve WebP dosyası yeterli.
 */
const URLS = import.meta.glob('../art/companions-anim/*.webp', { eager: true, import: 'default', query: '?url' }) as Record<string, string>;

export type CompanionAnimAction = 'idle' | 'attack' | 'defend';

/** Süreler (1× ms). Savaş sahnesi hız çarpanıyla ölçekler (2×'te yarıya iner). */
export const COMPANION_ANIM_TIMING: Readonly<Record<CompanionAnimAction, number>> = { idle: 3500, attack: 600, defend: 800 };

const ROW: Readonly<Record<CompanionAnimAction, number>> = { idle: 0, attack: 1, defend: 2 };
/** Bekleme: nefes ileri-geri (0→3→0) akar; hareketler satırı bir kez baştan sona oynatır. */
const SEQUENCE: Readonly<Record<CompanionAnimAction, readonly number[]>> = { idle: [0, 1, 2, 3, 2, 1], attack: [0, 1, 2, 3], defend: [0, 1, 2, 3] };
/** Bir adımın son bu kadarında sonraki kareye yumuşak geçiş yapılır (kare atlaması yerine). */
const BLEND: Readonly<Record<CompanionAnimAction, number>> = { idle: 0.45, attack: 0.25, defend: 0.3 };

export interface CompanionAnimSpec {
  id: string;
  url: string;
  columns: number;
  rows: number;
  frameWidth: number;
  frameHeight: number;
  /** Karakterin asıl hücresi (sağdaki taşma boşluğu hariç) */
  cellSize: number;
  /** Ayak noktası (kare pikselinde): yerleşim buna göre yapılır, kareler arasında sabit */
  originX: number;
  originY: number;
}

interface ManifestEntry {
  columns: number;
  rows: number;
  frameWidth: number;
  frameHeight: number;
  cellSize: number;
  originX: number;
  originY: number;
}

const SPECS: Record<string, CompanionAnimSpec> = {};
for (const [id, e] of Object.entries(manifest.companions as Record<string, ManifestEntry>)) {
  const url = URLS[`../art/companions-anim/${id}.webp`];
  if (url) SPECS[id] = { id, url, ...e };
}

/** Yoldaşın animasyon atlası; yoksa null (statik görsel kullanılır). */
export function companionAnimSpec(id: CompanionId | string | null | undefined): CompanionAnimSpec | null {
  return (id && SPECS[id]) || null;
}

export const allCompanionAnimSpecs = (): CompanionAnimSpec[] => Object.values(SPECS);

export interface CompanionPose {
  /** Gösterilen kare (atlas sırası: satır × sütun) ve üstüne karışan sonraki kare */
  frame: number;
  next: number;
  /** Sonraki karenin opaklığı (0–1) */
  mix: number;
  /** Hareket bitti (bekleme hiç bitmez) */
  done: boolean;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/** `elapsedMs` (1× ölçeğinde, hareket başından) için poz. Bekleme döngüdür; hareketler süre dolunca `done` döner. */
export function companionPose(action: CompanionAnimAction, elapsedMs: number, columns = 4): CompanionPose {
  const seq = SEQUENCE[action];
  const dur = COMPANION_ANIM_TIMING[action];
  const base = ROW[action] * columns;
  const done = action !== 'idle' && elapsedMs >= dur;
  let t = action === 'idle' ? ((elapsedMs % dur) + dur) % dur : Math.min(Math.max(0, elapsedMs), dur - 1e-6);
  if (done) t = dur - 1e-6;
  const step = dur / seq.length;
  const i = Math.min(seq.length - 1, Math.floor(t / step));
  const within = (t - i * step) / step;
  const isLast = i === seq.length - 1;
  const nextIdx = isLast ? (action === 'idle' ? seq[0] : seq[i]) : seq[i + 1];
  const b = BLEND[action];
  const mix = within <= 1 - b || nextIdx === seq[i] ? 0 : smooth((within - (1 - b)) / b);
  return { frame: base + seq[i], next: base + nextIdx, mix, done };
}
