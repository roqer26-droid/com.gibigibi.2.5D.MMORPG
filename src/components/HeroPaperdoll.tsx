import React, { useEffect, useRef } from 'react';
import { HeroProgress } from '../types/game';
import { computeEnchantAura, drawHeroToCanvas } from '../phaser/HeroRenderer';
import { hasHeroArt, heroArtKey, heroArtReady, heroImage } from '../data/heroArt';
import { AwakeningAura } from './AwakeningAura';

interface HeroPaperdollProps {
  hero: HeroProgress;
  size?: number;
  className?: string;
  /** Animasyonu kapat (küçük liste görselleri için performans) */
  staticRender?: boolean;
  /** Aura kademesinin yazısını görselin altında göster (kahraman kartlarında kapalı: aura adı güç satırında yazar) */
  showAuraLabel?: boolean;
}

/**
 * Canlı kahraman önizlemesi.
 * Ekipman yükseltme seviyesi arttıkça karakterin etrafındaki büyü aurası
 * kademeli olarak güçlenir: parıltı → rune halkası → ışık sütunu → dönen
 * zerreler → altın hale. Tüm katmanlar requestAnimationFrame ile nefes alır.
 */
export const HeroPaperdoll: React.FC<HeroPaperdollProps> = ({
  hero,
  size = 220,
  className = '',
  staticRender = false,
  showAuraLabel = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const heroRef = useRef<HeroProgress>(hero);
  heroRef.current = hero;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = (time: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawHeroToCanvas(ctx, size, size, heroRef.current, 'idle', time);
    };

    if (staticRender) {
      render(0.6);
      // Görsel henüz yüklenmediyse (kartlar ilk açılışta) yüklenince yeniden çiz; aksi halde kart boş kalırdı
      let alive = true;
      const id = heroRef.current.classId;
      if (hasHeroArt(id) && !heroImage(heroArtKey(id, heroRef.current.costumeId))) {
        void heroArtReady(id, heroRef.current.costumeId).then(() => {
          if (alive) render(0.6);
        });
      }
      return () => {
        alive = false;
      };
    }

    const start = performance.now();
    // ~30 FPS: vektör çizimi her karede taze, pil/CPU dostu
    let last = 0;
    const loop = (now: number) => {
      if (now - last >= 32) {
        last = now;
        render((now - start) / 1000);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [size, staticRender, hero.equipped, hero.classId, hero.level, hero.costumeId]);

  const aura = computeEnchantAura(hero);
  const awakening = hero.awakening ?? 0;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} data-awakening={awakening}>
      {/* Kahraman Uyanışı aurası: tüm görünümlerde (kostümlerde de) otomatik */}
      {awakening > 0 && <AwakeningAura tier={awakening} size={size} />}
      {/* Aura kademesi yüksekse ekstra CSS parıltısı */}
      {aura.tier >= 2 && (
        <div
          className="pointer-events-none absolute inset-0 animate-pulse-glow rounded-full blur-2xl"
          style={{
            background: `radial-gradient(circle at 50% 55%, ${aura.color}${
              aura.tier >= 4 ? '55' : '33'
            } 0%, rgba(0,0,0,0) 68%)`,
          }}
        />
      )}
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="relative drop-shadow-[0_12px_20px_rgba(0,0,0,0.7)]"
      />
      {awakening >= 5 && <AwakeningAura tier={awakening} size={size} layer="front" />}
      {showAuraLabel && aura.tier > 0 && (
        <span
          className="pointer-events-none absolute -bottom-1 rounded-full border px-2 py-0.5 text-[9px] font-extrabold tracking-wide backdrop-blur-sm"
          style={{
            color: aura.color,
            borderColor: `${aura.color}66`,
            background: 'rgba(8,11,20,0.78)',
          }}
        >
          ✦ {aura.tierName}
        </span>
      )}
    </div>
  );
};
