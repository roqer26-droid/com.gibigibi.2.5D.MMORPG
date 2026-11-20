import React from 'react';
import { Hammer, Coins, Sparkles, ShieldCheck, Trash2, ArrowUpRight, ArrowDownRight, X } from 'lucide-react';
import { categoryLabel } from '../data/items';
import { RARITY_META, SLOT_LABELS } from '../data/skills';
import { diffSetsOnEquip, getSet, type EquippedMap } from '../data/sets';
import { EquipmentItem, StatBlock } from '../types/game';
import {
  getDismantleYield,
  getEffectiveItemStats,
  getItemPowerScore,
} from '../utils/rpgLogic';
import { ItemArtSvg } from './ItemCard';
import { ItemSetSection, SetDiffList } from './SetUi';

interface ItemTooltipPanelProps {
  item: EquipmentItem;
  equippedInSlot?: EquipmentItem;
  /** Kahramanın şu an kuşandığı tüm ekipman (set sayımı ve karşılaştırma için) */
  heroEquipped?: EquippedMap;
  isEquipped: boolean;
  heroLevel: number;
  onEquip?: () => void;
  onUnequip?: () => void;
  /** Geliştirme ekranını bu eşya seçili olarak açar (geliştirmenin kendisi ayrı ekranda yapılır) */
  onOpenUpgrade: () => void;
  onDismantle?: () => void;
  onSell?: () => void;
  onClose?: () => void;
}

const STAT_LABELS: { key: keyof StatBlock; label: string; suffix?: string }[] = [
  { key: 'attack', label: 'Saldırı' },
  { key: 'health', label: 'Can' },
  { key: 'defense', label: 'Savunma' },
  { key: 'mana', label: 'Mana' },
  { key: 'critChance', label: 'Kritik Şans', suffix: '%' },
  { key: 'critDamage', label: 'Kritik Hasar', suffix: '%' },
  { key: 'dodge', label: 'Sıyrılma', suffix: '%' },
  { key: 'elementalDamage', label: 'Elemental Hasar', suffix: '%' },
];

export const ItemTooltipPanel: React.FC<ItemTooltipPanelProps> = ({
  item,
  equippedInSlot,
  heroEquipped = {},
  isEquipped,
  heroLevel,
  onEquip,
  onUnequip,
  onOpenUpgrade,
  onDismantle,
  onSell,
  onClose,
}) => {
  const meta = RARITY_META[item.rarity];
  const stats = getEffectiveItemStats(item);
  const eqStats = equippedInSlot && !isEquipped ? getEffectiveItemStats(equippedInSlot) : null;
  const dismantleYield = getDismantleYield(item);
  const maxed = item.upgradeLevel >= 10;
  const levelTooHigh = heroLevel < item.levelReq;
  const itemSet = item.setId ? getSet(item.setId) : null;
  // Kuşanılırsa set parça sayıları ve bonuslar nasıl değişir (set parçası olmayan eşya da set parçasını çıkarabilir)
  const setDiffs = !isEquipped ? diffSetsOnEquip(heroEquipped, item.slot, item) : [];

  return (
    <div
      className={`fantasy-panel relative flex max-h-[inherit] min-h-0 flex-col overflow-hidden rounded-2xl border-2 ${meta.borderClass}`}
      data-testid="item-detail"
    >
      <div className="min-h-0 flex-1 overflow-y-auto p-4" data-testid="item-detail-scroll">
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Kapat"
          data-testid="detail-close"
          className="absolute right-2 top-2 z-10 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800/90 text-slate-300 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border-2 ${meta.borderClass} ${meta.bgClass}`}>
          <ItemArtSvg item={item} size={50} />
        </div>
        <div className="min-w-0 flex-1 pr-6">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`text-xs font-bold uppercase tracking-wider ${meta.textClass}`}>
              {meta.label}
            </span>
            <span className="text-xs text-slate-400">• {SLOT_LABELS[item.slot]}</span>
            <span className="text-xs text-slate-400">• {categoryLabel(item.category)}</span>
          </div>
          <h3 className={`mt-0.5 font-display text-base font-bold leading-snug ${meta.textClass}`}>
            {item.name} {item.upgradeLevel > 0 ? `+${item.upgradeLevel}` : ''}
          </h3>
          <div className="mt-1 flex items-center gap-3 text-xs">
            <span className={levelTooHigh ? 'font-bold text-rose-400' : 'text-slate-300'}>
              Gereken Seviye: {item.levelReq} {levelTooHigh ? '(Yetersiz)' : ''}
            </span>
            <span className="font-semibold text-amber-300">Güç: {getItemPowerScore(item)}</span>
          </div>
        </div>
      </div>

      {/* Stats + Live Comparison */}
      <div className="mt-3 space-y-1.5 rounded-xl bg-slate-950/60 p-3 border border-slate-800">
        {STAT_LABELS.map(({ key, label, suffix }) => {
          const val = stats[key] ?? 0;
          const eqVal = eqStats ? eqStats[key] ?? 0 : 0;
          if (val === 0 && eqVal === 0) return null;
          const diff = eqStats ? Number((val - eqVal).toFixed(1)) : 0;
          return (
            <div key={key} className="flex items-center justify-between text-xs">
              <span className="text-slate-300">{label}</span>
              <div className="flex items-center gap-2 font-semibold">
                <span className="text-white">
                  +{val}
                  {suffix ?? ''}
                </span>
                {eqStats && diff !== 0 && (
                  <span
                    className={`inline-flex items-center text-[11px] font-bold ${
                      diff > 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {diff > 0 ? (
                      <>
                        <ArrowUpRight className="h-3 w-3" />+{diff}
                      </>
                    ) : (
                      <>
                        <ArrowDownRight className="h-3 w-3" />
                        {diff}
                      </>
                    )}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {item.specialBonus && (
          <div className="mt-2 flex items-center gap-1.5 border-t border-slate-800 pt-2 text-xs font-medium text-amber-300">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span>{item.specialBonus}</span>
          </div>
        )}
      </div>

      {itemSet && <ItemSetSection set={itemSet} equipped={heroEquipped} isEquipped={isEquipped} />}
      <SetDiffList diffs={setDiffs} />

      {equippedInSlot && !isEquipped && (
        <div className="mt-2 rounded-lg bg-slate-900/70 px-3 py-1.5 text-[11px] text-slate-400">
          Kuşanılı Eşya: <span className={RARITY_META[equippedInSlot.rarity].textClass}>{equippedInSlot.name}</span> (Güç {getItemPowerScore(equippedInSlot)})
        </div>
      )}

      <p className="mt-2 text-[11px] leading-relaxed text-slate-400">{item.description}</p>

      {/* İkincil eylemler (kaydırılan alanda): parçala / sat */}
      {!isEquipped && (onDismantle || onSell) && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {onDismantle && (
            <button
              type="button"
              onClick={onDismantle}
              className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-purple-500/35 bg-purple-950/50 px-2.5 py-2 text-[12px] font-semibold text-purple-200 hover:bg-purple-900/60"
            >
              <Trash2 className="h-3.5 w-3.5 text-purple-400" />
              Parçala (+{dismantleYield.crystals} Kristal)
            </button>
          )}
          {onSell && (
            <button
              type="button"
              onClick={onSell}
              className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-amber-500/35 bg-amber-950/40 px-2.5 py-2 text-[12px] font-semibold text-amber-200 hover:bg-amber-900/50"
            >
              <Coins className="h-3.5 w-3.5 text-amber-400" />
              Sat (+{item.sellValue} Altın)
            </button>
          )}
        </div>
      )}
      </div>

      {/* Sabit eylem alanı: içerik bunun üzerinde kaydırılır; alt güvenli alan hesaba katılır */}
      <div
        className="grid shrink-0 grid-cols-2 gap-2 border-t border-slate-700/70 bg-[#0a0f1e] px-4 pt-3"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))' }}
        data-testid="item-detail-actions"
      >
        {!isEquipped && onEquip ? (
          <button
            type="button"
            disabled={levelTooHigh}
            onClick={onEquip}
            data-testid="detail-equip"
            className="gold-btn flex min-h-[52px] items-center justify-center gap-2 rounded-xl px-3 text-[15px] font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span className="truncate">{levelTooHigh ? `Seviye ${item.levelReq}` : 'Kuşan'}</span>
          </button>
        ) : isEquipped && onUnequip ? (
          <button
            type="button"
            onClick={onUnequip}
            data-testid="detail-unequip"
            className="flex min-h-[52px] items-center justify-center rounded-xl border border-slate-600 bg-slate-800 px-3 text-[14px] font-bold text-slate-100 hover:bg-slate-700"
          >
            Çıkar
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onOpenUpgrade}
          data-testid="detail-upgrade"
          className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl border-2 border-sky-400/60 bg-sky-950/70 px-3 text-[15px] font-bold text-sky-100 hover:bg-sky-900/70"
        >
          <Hammer className="h-4 w-4 shrink-0 text-sky-300" />
          <span className="truncate">{maxed ? 'Maksimum +10' : `Geliştir +${item.upgradeLevel + 1}`}</span>
        </button>
      </div>
    </div>
  );
};
