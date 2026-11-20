import React from 'react';
import { getSet } from '../data/sets';
import { RARITY_META } from '../data/skills';
import { EquipmentItem } from '../types/game';
import { getItemPowerScore } from '../utils/rpgLogic';
import { SetIcon } from './SetUi';

export const ItemArtSvg: React.FC<{ item: EquipmentItem; size?: number }> = ({ item, size = 40 }) => {
  const { primaryColor, secondaryColor, glowColor } = item.visual;
  const { slot, category } = item;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.75)]"
    >
      <defs>
        <radialGradient id={`g_${item.id}`} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor={secondaryColor} />
          <stop offset="65%" stopColor={primaryColor} />
          <stop offset="100%" stopColor="#0f172a" />
        </radialGradient>
      </defs>

      {slot === 'weapon' && category === 'sword' && (
        <g>
          <path d="M48 10 L54 10 L54 16 L24 46 L18 40 Z" fill={`url(#g_${item.id})`} stroke={glowColor} strokeWidth="2" />
          <path d="M14 34 L30 50 L26 53 L11 38 Z" fill="#d97706" stroke="#fde68a" strokeWidth="1.5" />
          <path d="M19 45 L10 54 L14 58 L23 49 Z" fill="#78350f" />
        </g>
      )}

      {slot === 'weapon' && category === 'axe' && (
        <g>
          <rect x="29" y="10" width="6" height="44" rx="2" fill="#78350f" stroke="#d97706" strokeWidth="1.5" />
          <path d="M34 14 C50 10, 56 28, 34 34 Z" fill={`url(#g_${item.id})`} stroke={glowColor} strokeWidth="2" />
          <path d="M30 16 C18 14, 14 28, 30 32 Z" fill={`url(#g_${item.id})`} stroke={glowColor} strokeWidth="1.5" />
        </g>
      )}

      {slot === 'weapon' && category === 'staff' && (
        <g>
          <line x1="16" y1="54" x2="44" y2="18" stroke="#78350f" strokeWidth="5" strokeLinecap="round" />
          <circle cx="46" cy="16" r="10" fill={`url(#g_${item.id})`} stroke={glowColor} strokeWidth="2.5" />
          <circle cx="46" cy="16" r="4" fill="#ffffff" opacity="0.85" />
        </g>
      )}

      {slot === 'weapon' && category === 'bow' && (
        <g>
          <path d="M22 10 C48 16, 48 48, 22 54" fill="none" stroke={primaryColor} strokeWidth="5" strokeLinecap="round" />
          <line x1="22" y1="11" x2="22" y2="53" stroke={glowColor} strokeWidth="1.5" />
          <line x1="14" y1="32" x2="52" y2="32" stroke={secondaryColor} strokeWidth="2.5" />
          <polygon points="52,32 45,28 45,36" fill={glowColor} />
        </g>
      )}

      {slot === 'weapon' && category === 'dagger' && (
        <g>
          <path d="M20 44 L40 12 L46 16 L28 48 Z" fill={`url(#g_${item.id})`} stroke={glowColor} strokeWidth="2" />
          <path d="M16 40 L26 46 L22 52 L13 46 Z" fill="#3f3f46" stroke={glowColor} strokeWidth="1.4" />
          <path d="M42 10 L50 6 L48 14 Z" fill={secondaryColor} />
        </g>
      )}

      {slot === 'weapon' && category === 'scythe' && (
        <g>
          <line x1="16" y1="56" x2="42" y2="14" stroke="#3f2a1d" strokeWidth="4.5" strokeLinecap="round" />
          <path
            d="M42 14 C28 4, 10 10, 8 26 C16 16, 30 14, 40 20 Z"
            fill={`url(#g_${item.id})`}
            stroke={glowColor}
            strokeWidth="2.2"
          />
          <circle cx="9" cy="27" r="3" fill={glowColor} opacity="0.9" />
        </g>
      )}

      {slot === 'weapon' && category === 'spear' && (
        <g>
          <line x1="14" y1="54" x2="46" y2="14" stroke="#78350f" strokeWidth="4" strokeLinecap="round" />
          <path d="M46 8 L54 16 L44 24 L40 16 Z" fill={`url(#g_${item.id})`} stroke={glowColor} strokeWidth="2" />
          <path d="M38 20 L30 24 L34 30" fill="none" stroke={glowColor} strokeWidth="1.8" />
        </g>
      )}

      {slot === 'offhand' && category === 'skull' && (
        <g>
          <path
            d="M16 30 C16 16, 48 16, 48 30 L48 40 L40 40 L40 50 L24 50 L24 40 L16 40 Z"
            fill={`url(#g_${item.id})`}
            stroke={glowColor}
            strokeWidth="2.2"
          />
          <circle cx="25" cy="30" r="5" fill="#0b0b12" />
          <circle cx="39" cy="30" r="5" fill="#0b0b12" />
          <circle cx="25" cy="30" r="2.2" fill={glowColor} />
          <circle cx="39" cy="30" r="2.2" fill={glowColor} />
          <path d="M30 38 L34 38 L32 43 Z" fill="#0b0b12" />
        </g>
      )}

      {slot === 'offhand' && category === 'cloak' && (
        <g>
          <path
            d="M32 8 C46 12, 54 30, 50 54 L32 48 L14 54 C10 30, 18 12, 32 8 Z"
            fill={`url(#g_${item.id})`}
            stroke={glowColor}
            strokeWidth="2.2"
          />
          <circle cx="32" cy="14" r="4.5" fill={secondaryColor} stroke={glowColor} strokeWidth="1.4" />
          <path d="M22 26 C28 34, 36 34, 42 26" fill="none" stroke={glowColor} strokeWidth="1.4" opacity="0.7" />
        </g>
      )}

      {slot === 'offhand' && category === 'shield' && (
        <path
          d="M14 14 L50 14 L48 36 L32 54 L16 36 Z"
          fill={`url(#g_${item.id})`}
          stroke={glowColor}
          strokeWidth="2.5"
        />
      )}

      {slot === 'offhand' && category === 'tome' && (
        <g>
          <rect x="14" y="12" width="36" height="42" rx="4" fill={`url(#g_${item.id})`} stroke={glowColor} strokeWidth="2.5" />
          <line x1="20" y1="12" x2="20" y2="54" stroke={secondaryColor} strokeWidth="2" />
          <circle cx="35" cy="33" r="7" fill={glowColor} />
        </g>
      )}

      {slot === 'offhand' && category === 'quiver' && (
        <g>
          <rect x="22" y="20" width="18" height="32" rx="4" transform="rotate(-18 31 36)" fill={`url(#g_${item.id})`} stroke={glowColor} strokeWidth="2" />
          <line x1="22" y1="10" x2="28" y2="24" stroke={secondaryColor} strokeWidth="2.5" />
          <line x1="30" y1="8" x2="34" y2="23" stroke={glowColor} strokeWidth="2.5" />
        </g>
      )}

      {slot === 'helmet' && (
        <g>
          <path d="M16 36 C16 14, 48 14, 48 36 L48 48 L36 48 L36 38 L28 38 L28 48 L16 48 Z" fill={`url(#g_${item.id})`} stroke={glowColor} strokeWidth="2.2" />
          <path d="M28 16 Q32 6 40 12" fill="none" stroke={glowColor} strokeWidth="3" strokeLinecap="round" />
        </g>
      )}

      {slot === 'chest' && (
        <path
          d="M12 18 L24 12 L32 18 L40 12 L52 18 L46 32 L44 52 L20 52 L18 32 Z"
          fill={`url(#g_${item.id})`}
          stroke={glowColor}
          strokeWidth="2.2"
        />
      )}

      {slot === 'gloves' && (
        <g>
          <rect x="14" y="22" width="14" height="24" rx="5" fill={`url(#g_${item.id})`} stroke={glowColor} strokeWidth="2" />
          <rect x="34" y="18" width="16" height="28" rx="5" fill={`url(#g_${item.id})`} stroke={glowColor} strokeWidth="2" />
        </g>
      )}

      {slot === 'pants' && (
        <path
          d="M18 14 L46 14 L48 52 L35 52 L32 30 L29 52 L16 52 Z"
          fill={`url(#g_${item.id})`}
          stroke={glowColor}
          strokeWidth="2.2"
        />
      )}

      {slot === 'boots' && (
        <g>
          <path d="M14 18 L26 18 L26 42 L34 44 L34 50 L14 50 Z" fill={`url(#g_${item.id})`} stroke={glowColor} strokeWidth="2" />
          <path d="M36 18 L48 18 L48 42 L56 44 L56 50 L36 50 Z" fill={`url(#g_${item.id})`} stroke={glowColor} strokeWidth="2" />
        </g>
      )}

      {slot === 'necklace' && (
        <g>
          <path d="M18 16 C18 42, 46 42, 46 16" fill="none" stroke={secondaryColor} strokeWidth="3" />
          <polygon points="32,34 40,44 32,54 24,44" fill={`url(#g_${item.id})`} stroke={glowColor} strokeWidth="2" />
        </g>
      )}

      {(slot === 'ring1' || slot === 'ring2') && (
        <g>
          <circle cx="32" cy="36" r="14" fill="none" stroke={secondaryColor} strokeWidth="6" />
          <polygon points="32,14 39,22 32,29 25,22" fill={`url(#g_${item.id})`} stroke={glowColor} strokeWidth="2" />
        </g>
      )}
    </svg>
  );
};

interface ItemCardProps {
  item: EquipmentItem;
  selected?: boolean;
  equippedBadge?: boolean;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  selected,
  equippedBadge,
  onClick,
  draggable,
  onDragStart,
}) => {
  const meta = RARITY_META[item.rarity];
  const power = getItemPowerScore(item);

  return (
    <button
      type="button"
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      className={`group relative flex flex-col items-center justify-between rounded-xl border-2 p-2 transition-all active:scale-95 ${
        meta.borderClass
      } ${meta.bgClass} ${
        selected ? 'ring-2 ring-amber-300 scale-[1.03]' : 'hover:brightness-110'
      }`}
    >
      {/* Top badges */}
      <div className="flex w-full items-center justify-between text-[10px] font-bold">
        <span className="flex items-center gap-1 rounded bg-black/50 px-1.5 py-0.5 text-slate-300">
          {item.setId && <SetIcon set={getSet(item.setId)} size={12} />}
          Sv.{item.levelReq}
        </span>
        {item.upgradeLevel > 0 && (
          <span className="rounded bg-amber-500/90 px-1.5 py-0.5 text-slate-950">
            +{item.upgradeLevel}
          </span>
        )}
      </div>

      {/* Item Art */}
      <div className="my-1.5 flex items-center justify-center transition-transform group-hover:scale-110">
        <ItemArtSvg item={item} size={44} />
      </div>

      {/* Name & Power */}
      <div className="w-full text-center">
        <p className={`truncate text-[11px] font-semibold leading-tight ${meta.textClass}`}>
          {item.name}
        </p>
        <p className="mt-0.5 text-[10px] text-amber-200/80">Güç {power}</p>
      </div>

      {equippedBadge && (
        <span className="absolute -top-2 right-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-extrabold text-slate-950 shadow">
          KUŞANILI
        </span>
      )}
    </button>
  );
};
