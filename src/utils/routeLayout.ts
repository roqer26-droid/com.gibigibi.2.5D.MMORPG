/**
 * Keşif Rotası yerleşimi (saf hesap, DOM'dan bağımsız): bölgeler aşağıdan yukarıya dizilir,
 * simgeler sağa/sola dağılır, bölge adı simgenin yanında (rotaya bakan iç tarafta) durur.
 */
export const ICON_SIZE = 88;
export const ICON_R = ICON_SIZE / 2;
export const SPACING = 156;
export const PAD_TOP = 64;
export const PAD_BOTTOM = 48;
export const LABEL_GAP = 8;
export const EDGE = 12;
export const LABEL_MAX_WIDTH = 168;
export const LABEL_HALF_HEIGHT = 28;

/** Genişliğe oranla x konumları; 4'lü döngü rotayı kıvrımlı yapar. */
const X_FACTORS = [0.27, 0.71, 0.33, 0.67];

export interface RouteNode {
  index: number;
  x: number;
  y: number;
  /** Simgenin ekrandaki yarısı */
  side: 'left' | 'right';
  /** Etiketin simgeye göre yönü (rota ortasına bakar) */
  labelSide: 'left' | 'right';
  labelWidth: number;
}

export interface RouteLayout {
  width: number;
  height: number;
  nodes: RouteNode[];
  /** i. düğümden i+1. düğüme giden kübik Bézier yolları (SVG `d`) */
  segments: string[];
}

export function computeRouteLayout(count: number, width: number): RouteLayout {
  const height = PAD_TOP + PAD_BOTTOM + ICON_SIZE + Math.max(0, count - 1) * SPACING;
  const nodes: RouteNode[] = [];
  for (let i = 0; i < count; i++) {
    const x = Math.round(width * X_FACTORS[i % X_FACTORS.length]);
    const y = height - PAD_BOTTOM - ICON_R - i * SPACING;
    const side = x < width / 2 ? 'left' : 'right';
    const room = side === 'left' ? width - x - ICON_R - LABEL_GAP - EDGE : x - ICON_R - LABEL_GAP - EDGE;
    nodes.push({
      index: i,
      x,
      y,
      side,
      labelSide: side === 'left' ? 'right' : 'left',
      labelWidth: Math.max(0, Math.min(LABEL_MAX_WIDTH, Math.floor(room))),
    });
  }

  const k = SPACING * 0.4;
  const segments: string[] = [];
  for (let i = 0; i < count - 1; i++) {
    const a = nodes[i];
    const b = nodes[i + 1];
    const y0 = a.y - ICON_R * 0.62;
    const y1 = b.y + ICON_R * 0.62;
    segments.push(`M ${a.x} ${y0} C ${a.x} ${y0 - k}, ${b.x} ${y1 + k}, ${b.x} ${y1}`);
  }
  return { width, height, nodes, segments };
}

export interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export function iconBox(n: RouteNode): Box {
  return { left: n.x - ICON_R, right: n.x + ICON_R, top: n.y - ICON_R, bottom: n.y + ICON_R };
}

/** Etiketin kapladığı alan (simge yanında, dikey ortalı). */
export function labelBox(n: RouteNode): Box {
  const start = n.labelSide === 'right' ? n.x + ICON_R + LABEL_GAP : n.x - ICON_R - LABEL_GAP - n.labelWidth;
  return { left: start, right: start + n.labelWidth, top: n.y - LABEL_HALF_HEIGHT, bottom: n.y + LABEL_HALF_HEIGHT };
}

/** Düğüm + etiketin birlikte kapladığı tıklanabilir alan. */
export function nodeBox(n: RouteNode): Box {
  const i = iconBox(n);
  const l = labelBox(n);
  return {
    left: Math.min(i.left, l.left),
    right: Math.max(i.right, l.right),
    top: Math.min(i.top, l.top),
    bottom: Math.max(i.bottom, l.bottom),
  };
}

export function boxesOverlap(a: Box, b: Box): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

/** Bézier segmentinden örnek noktalar (çakışma testleri için). */
export function sampleSegment(a: RouteNode, b: RouteNode, steps = 48): { x: number; y: number }[] {
  const k = SPACING * 0.4;
  const y0 = a.y - ICON_R * 0.62;
  const y1 = b.y + ICON_R * 0.62;
  const p = [
    { x: a.x, y: y0 },
    { x: a.x, y: y0 - k },
    { x: b.x, y: y1 + k },
    { x: b.x, y: y1 },
  ];
  const out: { x: number; y: number }[] = [];
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const u = 1 - t;
    out.push({
      x: u * u * u * p[0].x + 3 * u * u * t * p[1].x + 3 * u * t * t * p[2].x + t * t * t * p[3].x,
      y: u * u * u * p[0].y + 3 * u * u * t * p[1].y + 3 * u * t * t * p[2].y + t * t * t * p[3].y,
    });
  }
  return out;
}
