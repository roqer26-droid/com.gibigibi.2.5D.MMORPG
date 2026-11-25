import { awakenTierDef } from '../data/awakening';

/**
 * Kahraman Uyanışı aurası: görselin arkasında (ve kademe V'te önünde birkaç ışık zerresi) hafif, animasyonlu ışıma.
 * Kostümden bağımsızdır; kahraman görselinin kapsayıcısına yerleşir. Tıklamayı engellemez.
 */
export function AwakeningAura({ tier, size, layer = 'back' }: { tier: number; size: number; layer?: 'back' | 'front' }) {
  const def = awakenTierDef(tier);
  if (!def) return null;
  const strength = 0.22 + tier * 0.09; // kademe arttıkça belirginleşir
  if (layer === 'front') {
    if (tier < 5) return null;
    // İlahi: 6 hafif yükselen ışık zerresi
    return (
      <div className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden="true" data-testid="awakening-motes">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className="awk-mote absolute rounded-full"
            style={{
              left: `${22 + i * 11}%`,
              bottom: `${12 + (i % 3) * 8}%`,
              width: Math.max(3, size * 0.022),
              height: Math.max(3, size * 0.022),
              background: i % 2 ? def.glow : '#fffbeb',
              boxShadow: `0 0 ${Math.round(size * 0.04)}px ${def.glow}`,
              animationDelay: `${i * 0.52}s`,
            }}
          />
        ))}
      </div>
    );
  }
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true" data-testid="awakening-aura" data-tier={tier}>
      <div
        className="awk-glow absolute inset-[6%] rounded-full blur-xl"
        style={{
          background: `radial-gradient(circle at 50% 58%, ${def.color}${Math.round(strength * 255).toString(16).padStart(2, '0')} 0%, ${def.glow}22 45%, transparent 70%)`,
          ['--awk-lo' as string]: String(0.5 + tier * 0.04),
          ['--awk-hi' as string]: String(0.8 + tier * 0.04),
        }}
      />
      {tier >= 3 && (
        <div
          className="awk-ring absolute rounded-[50%] border"
          style={{ left: `calc(50% - ${size * 0.31}px)`, top: `calc(88% - ${size * 0.07}px)`, width: size * 0.62, height: size * 0.14, borderColor: `${def.glow}${tier >= 5 ? 'aa' : '66'}`, boxShadow: `0 0 ${Math.round(size * 0.05)}px ${def.color}55` }}
        />
      )}
    </div>
  );
}
