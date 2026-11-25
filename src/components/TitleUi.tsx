import { useEffect } from 'react';
import {
  Castle, Compass, Crown, Flame, Grid2x2, Hammer, Heart, Infinity as InfinityIcon, Map, PawPrint, Shield, Shirt, Skull,
  Snowflake, Sparkles, Star, Sword, TowerControl, User, Users, Zap, Bird, type LucideIcon,
} from 'lucide-react';
import { TITLE_RARITIES, titleById, type TitleDef, type TitleIcon as TitleIconKey } from '../data/titles';

const ICONS: Record<TitleIconKey, LucideIcon> = {
  compass: Compass, map: Map, star: Star, sword: Sword, zap: Zap, grid: Grid2x2, flame: Flame, heart: Heart, shield: Shield,
  crown: Crown, snowflake: Snowflake, dragon: Bird, skull: Skull, user: User, users: Users, sparkles: Sparkles, hammer: Hammer,
  shirt: Shirt, paw: PawPrint, castle: Castle, tower: TowerControl, infinity: InfinityIcon,
};

/** Unvan sembolü: nadirlik renginde çerçeveli küçük rozet. */
export function TitleSymbol({ def, size = 36, dim = false }: { def: TitleDef; size?: number; dim?: boolean }) {
  const Icon = ICONS[def.icon];
  const r = TITLE_RARITIES[def.rarity];
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-xl border"
      style={{
        width: size,
        height: size,
        borderColor: dim ? '#334155' : `${r.color}99`,
        background: dim ? '#0f172a' : `radial-gradient(circle at 50% 35%, ${r.glow}55, #0b1020 75%)`,
        boxShadow: dim || def.rarity === 'common' ? undefined : `0 0 ${def.rarity === 'mythic' ? 12 : 7}px ${r.glow}66`,
      }}
      aria-hidden="true"
    >
      <Icon style={{ width: size * 0.55, height: size * 0.55, color: dim ? '#475569' : r.color }} />
    </span>
  );
}

/** Unvan adı (nadirlik rengi; mitikte hafif animasyonlu parıltı). */
export function TitleName({ id, className = '' }: { id: string | null | undefined; className?: string }) {
  const def = titleById(id);
  if (!def) return null;
  return (
    <span className={`${def.rarity === 'mythic' ? 'title-mythic' : ''} ${className}`} style={def.rarity === 'mythic' ? undefined : { color: TITLE_RARITIES[def.rarity].color }} data-testid="active-title-name">
      {def.name}
    </span>
  );
}

/**
 * "Unvan Kazanıldı!" bildirimi: üstte ~2 sn, tıklamayı engellemez (savaş akışı kesilmez). Kuyruktaki unvanlar sırayla gelir;
 * efsanevi ve mitikte daha uzun ve parlayan.
 */
export function TitleToast({ queue, onDone }: { queue: string[]; onDone: () => void }) {
  const def = titleById(queue[0]);
  const grand = !!def && (def.rarity === 'legendary' || def.rarity === 'mythic');
  useEffect(() => {
    if (!queue.length) return;
    if (!def) {
      onDone();
      return;
    }
    const t = window.setTimeout(onDone, grand ? 2600 : 2200);
    return () => window.clearTimeout(t);
  }, [queue, def, grand, onDone]);
  if (!def) return null;
  const r = TITLE_RARITIES[def.rarity];
  return (
    <div
      key={`${def.id}-${queue.length}`}
      role="status"
      data-testid="title-toast"
      data-title={def.id}
      className={`pointer-events-none fixed left-1/2 top-3 z-[120] flex w-[min(320px,calc(100vw-24px))] items-center gap-3 rounded-2xl border-2 bg-[#0b0f1d]/95 px-3 py-2.5 ${grand ? 'title-toast-grand' : 'title-toast'}`}
      style={{ borderColor: r.color, ['--tg' as string]: `${r.glow}aa`, boxShadow: `0 0 18px ${r.glow}55` }}
    >
      <TitleSymbol def={def} size={grand ? 44 : 38} />
      <div className="min-w-0">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-200">Unvan Kazanıldı!</p>
        <p className={`truncate font-display text-[17px] font-black leading-tight ${def.rarity === 'mythic' ? 'title-mythic' : ''}`} style={def.rarity === 'mythic' ? undefined : { color: r.color }}>
          {def.name}
        </p>
        <p className="text-[10px] font-bold" style={{ color: r.color }}>{r.name}</p>
      </div>
    </div>
  );
}
