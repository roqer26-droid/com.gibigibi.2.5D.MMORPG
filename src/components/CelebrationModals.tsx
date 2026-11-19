import React from 'react';
import { Sparkles, ShieldCheck, ArrowUpCircle } from 'lucide-react';
import { RARITY_META, SLOT_LABELS } from '../data/skills';
import { EquipmentItem } from '../types/game';
import { getItemPowerScore } from '../utils/rpgLogic';
import { ItemArtSvg } from './ItemCard';

export const LevelUpModal: React.FC<{
  newLevel: number;
  levelsGained: number;
  onClose: () => void;
}> = ({ newLevel, levelsGained, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="fantasy-panel animate-pop-scale w-full max-w-md rounded-3xl border-2 border-amber-400 p-6 text-center shadow-[0_0_50px_rgba(245,158,11,0.45)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20 text-amber-300 ring-2 ring-amber-400">
          <ArrowUpCircle className="h-10 w-10" />
        </div>
        <div className="mt-3 text-xs font-extrabold uppercase tracking-widest text-amber-300">
          Seviye Atladın!
        </div>
        <h2 className="mt-1 font-display text-3xl font-black text-white">
          Seviye {newLevel}
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-slate-300">
          Kahramanın artık daha güçlü! Can, Saldırı, Savunma ve Mana değerlerin arttı.
        </p>
        <div className="mt-4 rounded-xl border border-purple-400/40 bg-purple-950/40 p-3 text-sm font-bold text-purple-200">
          +{levelsGained} Yeni Yetenek Puanı Kazandın!
        </div>
        <button
          type="button"
          onClick={onClose}
          className="gold-btn mt-5 w-full rounded-xl py-3 text-sm font-extrabold text-slate-950"
        >
          Harika! Devam Et
        </button>
      </div>
    </div>
  );
};

export const LootRevealModal: React.FC<{
  item: EquipmentItem;
  title?: string;
  heroLevel: number;
  onEquipNow: () => void;
  onClose: () => void;
}> = ({ item, title = 'Yeni Ganimet Bulundu!', heroLevel, onEquipNow, onClose }) => {
  const meta = RARITY_META[item.rarity];
  const canEquip = heroLevel >= item.levelReq;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div
        className={`fantasy-panel animate-pop-scale w-full max-w-md rounded-3xl border-2 p-6 text-center ${meta.borderClass}`}
      >
        <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-300">
          <Sparkles className="h-3.5 w-3.5" />
          {title}
        </div>

        <div
          className={`mx-auto my-5 flex h-24 w-24 items-center justify-center rounded-2xl border-2 ${meta.borderClass} ${meta.bgClass} animate-pulse-glow`}
        >
          <ItemArtSvg item={item} size={74} />
        </div>

        <span className={`text-xs font-extrabold uppercase tracking-wider ${meta.textClass}`}>
          {meta.label} • {SLOT_LABELS[item.slot]}
        </span>
        <h3 className={`mt-1 font-display text-xl font-black ${meta.textClass}`}>{item.name}</h3>
        <p className="mt-1 text-xs text-slate-300">
          Gereken Seviye: {item.levelReq} • Savaş Gücü: <strong className="text-amber-300">{getItemPowerScore(item)}</strong>
        </p>

        {item.specialBonus && (
          <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-950/30 px-3 py-2 text-xs font-semibold text-amber-200">
            ✨ {item.specialBonus}
          </div>
        )}

        <div className="mt-5 flex gap-2.5">
          {canEquip && (
            <button
              type="button"
              onClick={onEquipNow}
              className="gold-btn flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-extrabold text-slate-950"
            >
              <ShieldCheck className="h-4 w-4" />
              Hemen Kuşan
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-700 bg-slate-900 py-2.5 text-sm font-bold text-slate-200 hover:bg-slate-800"
          >
            Çantaya Koy
          </button>
        </div>
      </div>
    </div>
  );
};
