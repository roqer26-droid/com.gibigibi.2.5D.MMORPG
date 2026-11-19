import { useEffect, useRef } from 'react';
import { drawEnemyToCanvas } from '../phaser/CharacterRenderer';
import type { EnemyDef } from '../types/game';

interface BossPortraitProps {
  enemy: EnemyDef;
  /** CSS piksel boyutu (kare) */
  size: number;
  className?: string;
  dimmed?: boolean;
}

/** Boss'un oyundaki geometrik çizimini canvas üzerinde gösterir. */
export function BossPortrait({ enemy, size, className, dimmed = false }: BossPortraitProps) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const px = Math.round(size * dpr);
    canvas.width = px;
    canvas.height = px;
    drawEnemyToCanvas(ctx, px, px, enemy);
  }, [enemy, size]);

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={enemy.name}
      className={className}
      style={{ width: size, height: size, filter: dimmed ? 'grayscale(1) brightness(0.45)' : undefined }}
    />
  );
}
