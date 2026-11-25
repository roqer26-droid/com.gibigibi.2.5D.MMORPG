import { useEffect, useRef } from 'react';
import { companionAnimSpec, companionPose } from '../data/companionAnim';
import { COMPANION_IMAGES } from '../data/companionArt';
import type { CompanionId } from '../types/game';

interface Props {
  id: CompanionId;
  /** Kutu kenarı (CSS px); karakterin asıl hücresi bu kareye sığdırılır */
  size: number;
  alt: string;
  className?: string;
}

/**
 * Yoldaşın bekleme / nefes animasyonu (savaşla aynı poz hesabı: 3,5 sn döngü, kareler arası yumuşak geçiş).
 * Atlası olmayan yoldaşta statik görsel gösterilir. "Hareketi azalt" tercihinde ilk karede durur.
 */
export function CompanionIdleSprite({ id, size, alt, className = '' }: Props) {
  const spec = companionAnimSpec(id);
  const baseRef = useRef<HTMLDivElement>(null);
  const blendRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!spec) return;
    const scale = size / spec.cellSize;
    const place = (el: HTMLDivElement | null, frame: number, alpha: number) => {
      if (!el) return;
      const col = frame % spec.columns;
      const row = Math.floor(frame / spec.columns);
      el.style.backgroundPosition = `${-col * spec.frameWidth * scale}px ${-row * spec.frameHeight * scale}px`;
      el.style.opacity = String(alpha);
    };
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      place(baseRef.current, 0, 1);
      place(blendRef.current, 0, 0);
      return;
    }
    // Kartlar aynı anda aynı pozda olmasın diye yoldaşa göre sabit bir başlangıç kayması
    const offset = (id.length * 397) % 3500;
    const t0 = performance.now() - offset;
    let raf = 0;
    const tick = (now: number) => {
      const p = companionPose('idle', now - t0, spec.columns);
      place(baseRef.current, p.frame, 1);
      place(blendRef.current, p.next, p.mix);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [spec, size, id]);

  if (!spec) {
    return <img src={COMPANION_IMAGES[id]} alt={alt} width={size} height={size} draggable={false} className={className} style={{ width: size, height: size }} />;
  }
  const scale = size / spec.cellSize;
  const layer = {
    position: 'absolute' as const,
    inset: 0,
    backgroundImage: `url(${spec.url})`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: `${spec.frameWidth * spec.columns * scale}px ${spec.frameHeight * spec.rows * scale}px`,
    backgroundPosition: '0px 0px',
  };
  return (
    <div role="img" aria-label={alt} data-testid={`companion-anim-${id}`} className={`relative shrink-0 overflow-hidden ${className}`} style={{ width: size, height: size }}>
      <div ref={baseRef} style={layer} />
      <div ref={blendRef} style={{ ...layer, opacity: 0 }} />
    </div>
  );
}
