import type React from 'react';
import type { RegionId } from '../types/game';

/** 24 şeffaf bölge görseli (dosya adı = bölge kimliği). */
const IMAGES = import.meta.glob('../art/regions/*.webp', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>;

const IMAGE_BY_REGION: Partial<Record<RegionId, string>> = {};
for (const [path, url] of Object.entries(IMAGES)) {
  const id = path.split('/').pop()!.replace(/\.webp$/, '') as RegionId;
  IMAGE_BY_REGION[id] = url;
}

/** İlk dört bölge: görsel dosyası yok, aynı geometrik stilde SVG olarak çizilir. */
const SVG_REGIONS = new Set<RegionId>(['forest', 'mountains', 'volcano', 'ruins']);

export function hasRegionArt(id: RegionId): boolean {
  return SVG_REGIONS.has(id) || !!IMAGE_BY_REGION[id];
}

function ForestArt() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="rf-crown" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4ade80" />
          <stop offset="1" stopColor="#15803d" />
        </linearGradient>
        <linearGradient id="rf-trunk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#14532d" />
          <stop offset="1" stopColor="#0f3d24" />
        </linearGradient>
      </defs>
      <path d="M36 62 L30 90 L72 90 L64 62 Z" fill="url(#rf-trunk)" stroke="#22c55e" strokeWidth="2" strokeLinejoin="round" />
      <g fill="url(#rf-crown)" stroke="#86efac" strokeWidth="2">
        <circle cx="50" cy="24" r="17" />
        <circle cx="32" cy="42" r="17" />
        <circle cx="68" cy="42" r="17" />
        <circle cx="50" cy="50" r="19" />
      </g>
      <circle cx="42" cy="58" r="3.4" fill="#bbf7d0" />
      <circle cx="58" cy="58" r="3.4" fill="#bbf7d0" />
      <circle cx="50" cy="73" r="5.5" fill="#4ade80" />
    </svg>
  );
}

function MountainsArt() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="rm-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7dd3fc" />
          <stop offset="1" stopColor="#0369a1" />
        </linearGradient>
      </defs>
      <polygon points="6,88 28,50 50,88" fill="url(#rm-body)" stroke="#bae6fd" strokeWidth="2" strokeLinejoin="round" />
      <polygon points="52,88 76,56 96,88" fill="url(#rm-body)" stroke="#bae6fd" strokeWidth="2" strokeLinejoin="round" />
      <polygon points="22,88 50,16 80,88" fill="url(#rm-body)" stroke="#e0f2fe" strokeWidth="2.4" strokeLinejoin="round" />
      <polygon points="50,16 41,36 48,32 53,40 58,31 61,36" fill="#f0f9ff" />
      <polygon points="28,50 23,60 28,57 32,62" fill="#f0f9ff" />
      <polygon points="50,88 58,56 66,88" fill="#0ea5e9" opacity="0.5" />
    </svg>
  );
}

function VolcanoArt() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="rv-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b91c1c" />
          <stop offset="1" stopColor="#450a0a" />
        </linearGradient>
      </defs>
      <polygon points="46,10 54,22 46,26" fill="#fb923c" />
      <polygon points="64,16 69,25 63,28" fill="#fdba74" />
      <polygon points="10,90 40,42 60,42 92,90" fill="url(#rv-body)" stroke="#f97316" strokeWidth="2.4" strokeLinejoin="round" />
      <polygon points="38,44 62,44 56,36 44,36" fill="#f97316" opacity="0.9" />
      <polyline points="50,44 46,58 54,66 44,80 50,90" fill="none" stroke="#fb923c" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="64,56 70,66 66,74" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function RuinsArt() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="rr-stone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a855f7" />
          <stop offset="1" stopColor="#581c87" />
        </linearGradient>
      </defs>
      <rect x="8" y="78" width="84" height="12" rx="2" fill="url(#rr-stone)" stroke="#d8b4fe" strokeWidth="2" />
      <rect x="14" y="30" width="20" height="50" fill="url(#rr-stone)" stroke="#d8b4fe" strokeWidth="2" />
      <rect x="66" y="30" width="20" height="50" fill="url(#rr-stone)" stroke="#d8b4fe" strokeWidth="2" />
      <path d="M10 30 L50 10 L90 30 L90 40 L10 40 Z" fill="url(#rr-stone)" stroke="#e9d5ff" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M34 80 L34 52 Q50 34 66 52 L66 80 Z" fill="#2e1065" stroke="#c084fc" strokeWidth="2" />
      <polygon points="50,18 56,26 50,34 44,26" fill="#f3e8ff" opacity="0.9" />
    </svg>
  );
}

const SVG_ART: Partial<Record<RegionId, () => React.ReactElement>> = {
  forest: ForestArt,
  mountains: MountainsArt,
  volcano: VolcanoArt,
  ruins: RuinsArt,
};

interface RegionIconProps {
  id: RegionId;
  /** CSS piksel boyutu (kare kutu) */
  size: number;
  /** Kilitli bölgeler için soluk görünüm */
  dimmed?: boolean;
  /** Bölge vurgu rengi (hafif parlama) */
  glow?: string;
  className?: string;
}

export function RegionIcon({ id, size, dimmed = false, glow, className }: RegionIconProps) {
  const Svg = SVG_ART[id];
  const src = IMAGE_BY_REGION[id];
  const style: React.CSSProperties = {
    width: size,
    height: size,
    filter: dimmed
      ? 'grayscale(0.85) brightness(0.62)'
      : glow
        ? `drop-shadow(0 0 8px ${glow}66)`
        : undefined,
  };
  return (
    <span className={className} style={{ ...style, display: 'inline-block' }} data-region-art={id}>
      {Svg ? <Svg /> : src ? <img src={src} alt="" draggable={false} className="h-full w-full object-contain" /> : null}
    </span>
  );
}
