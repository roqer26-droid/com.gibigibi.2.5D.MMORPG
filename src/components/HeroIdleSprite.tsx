import { useEffect, useRef, useState } from 'react';
import { IDLE_SHEET_URL, idleFrameAt, idleSheetKey, idleSpec } from '../data/heroIdle';
import type { HeroProgress } from '../types/game';
import { HeroPaperdoll } from './HeroPaperdoll';
import { AwakeningAura } from './AwakeningAura';

/**
 * Seçili kahramanın (mevcut kostümüyle) bekleme animasyonu: savaştaki bekleme sheet'iyle aynı kare sırası ve hız.
 * Sheet'i olmayan görünümde canlı kahraman önizlemesine (HeroPaperdoll) düşer. Uyanış aurası her iki durumda da gösterilir.
 */
export function HeroIdleSprite({ hero, size }: { hero: HeroProgress; size: number }) {
  const key = idleSheetKey(hero.classId, hero.costumeId);
  const url = key ? IDLE_SHEET_URL[key] : undefined;
  const spec = idleSpec(key);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDims(null);
    if (!url) return;
    let alive = true;
    const img = new Image();
    img.onload = () => alive && setDims({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = url;
    return () => {
      alive = false;
    };
  }, [url]);

  useEffect(() => {
    if (!dims || !ref.current) return;
    const el = ref.current;
    const fw = dims.w / spec.columns;
    const fh = dims.h / spec.rows;
    const scale = size / fh;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const place = (f: number) => {
      el.style.backgroundPosition = `${-(f % spec.columns) * fw * scale}px ${-Math.floor(f / spec.columns) * fh * scale}px`;
    };
    if (reduce) {
      place(spec.sequence[0] ?? 0);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    let last = -1;
    const tick = (now: number) => {
      const f = idleFrameAt((now - t0) / 1000, spec);
      if (f !== last) {
        last = f;
        place(f);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [dims, spec, size]);

  if (!url) return <HeroPaperdoll hero={hero} size={size} />;
  const tier = hero.awakening ?? 0;
  const fw = dims ? dims.w / spec.columns : 1;
  const fh = dims ? dims.h / spec.rows : 1;
  const scale = size / fh;
  const w = dims ? fw * scale : size;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: Math.max(size, w), height: size }} data-awakening={tier} data-testid="hero-idle-sprite">
      {tier > 0 && <AwakeningAura tier={tier} size={size} />}
      <div
        ref={ref}
        role="img"
        aria-label="Kahraman"
        className="relative drop-shadow-[0_12px_20px_rgba(0,0,0,0.7)]"
        style={{
          width: w,
          height: size,
          backgroundImage: dims ? `url(${url})` : undefined,
          backgroundRepeat: 'no-repeat',
          backgroundSize: dims ? `${dims.w * scale}px ${dims.h * scale}px` : undefined,
        }}
      />
      {tier >= 5 && <AwakeningAura tier={tier} size={size} layer="front" />}
    </div>
  );
}
