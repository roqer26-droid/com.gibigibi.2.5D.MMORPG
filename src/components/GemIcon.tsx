import { Crown, Flame, Leaf, Snowflake, Sparkles, Zap, type LucideIcon } from 'lucide-react';
import { GEM_INFO } from '../data/skills';
import type { GemType } from '../types/game';

const ICONS: Record<GemType, LucideIcon> = {
  fire: Flame,
  frost: Snowflake,
  nature: Leaf,
  lightning: Zap,
  arcane: Sparkles,
  golden: Crown,
};

/** Element (taş) simgesi, taşın kendi renginde. */
export function GemIcon({ gem, size = 14, className }: { gem: GemType; size?: number; className?: string }) {
  const Icon = ICONS[gem];
  return <Icon className={className} width={size} height={size} color={GEM_INFO[gem].colorHex} strokeWidth={2.4} aria-hidden="true" />;
}
