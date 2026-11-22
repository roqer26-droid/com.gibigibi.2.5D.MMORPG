import React, { useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { HERO_CLASSES } from '../data/classes';
import { DEFAULT_COSTUME_NAME, costumesForHero } from '../data/costumes';
import type { HeroProgress } from '../types/game';
import { HeroPaperdoll } from './HeroPaperdoll';

interface CostumeDrawerProps {
  hero: HeroProgress;
  unlocked: boolean;
  /** Önizlenen kostüm (null = varsayılan görünüm) */
  preview: string | null;
  onPreview: (costumeId: string | null) => void;
  /** Kullan: null = varsayılan görünüme dön */
  onApply: (costumeId: string | null) => void;
  onClose: () => void;
}

/**
 * Kostümler alt çekmecesi (mobil): Varsayılan Görünüm + şampiyonun kostümleri. Karta dokununca önizleme değişir,
 * Kullan ile seçim kaydedilir; takılı olan "Kullanılıyor" etiketi taşır. Tamamen kozmetiktir.
 */
export const CostumeDrawer: React.FC<CostumeDrawerProps> = ({ hero, unlocked, preview, onPreview, onApply, onClose }) => {
  const cls = HERO_CLASSES[hero.classId];
  const options: { id: string | null; name: string }[] = [
    { id: null, name: DEFAULT_COSTUME_NAME },
    ...costumesForHero(hero.classId).map((c) => ({ id: c.id, name: c.name })),
  ];
  const applied = hero.costumeId ?? null;
  const dirty = preview !== applied;

  useEffect(() => {
    // Esc yalnızca çekmeceyi kapatır (arkadaki kahraman detayı açık kalır): yakalama aşamasında yayılım durdurulur
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70]" data-testid="costume-drawer" role="dialog" aria-modal="true" aria-label="Kostümler">
      <button type="button" aria-label="Kapat" onClick={onClose} className="absolute inset-0 bg-black/55" />
      <div
        className="costume-sheet absolute inset-x-0 bottom-0 mx-auto flex max-h-[62dvh] w-full max-w-xl flex-col rounded-t-2xl border border-b-0 border-fuchsia-400/30 bg-[#0b0f1c] shadow-[0_-12px_40px_rgba(0,0,0,0.6)]"
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-slate-600" />
        <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-fuchsia-300/80">Kostümler</p>
            <h3 className="truncate font-display text-base font-bold text-white">{cls.name}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-600 bg-slate-900/90 text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
          <div className="grid grid-cols-2 gap-2.5">
            {options.map((o) => {
              const isApplied = applied === o.id;
              const isPreview = preview === o.id;
              return (
                <button
                  key={o.id ?? 'default'}
                  type="button"
                  onClick={() => onPreview(o.id)}
                  data-testid={`costume-card-${o.id ?? 'default'}`}
                  aria-pressed={isPreview}
                  className={`relative flex flex-col items-center rounded-xl border-2 p-2 text-center transition active:scale-[0.98] ${
                    isPreview ? 'border-fuchsia-400 bg-fuchsia-950/30' : 'border-slate-800 bg-slate-900/50'
                  }`}
                >
                  <HeroPaperdoll hero={{ ...hero, costumeId: o.id ?? undefined }} size={92} staticRender />
                  <span className="mt-1 w-full truncate text-xs font-bold text-white">{o.name}</span>
                  {isApplied && (
                    <span
                      className="mt-1 flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-950/60 px-2 py-0.5 text-[10px] font-extrabold text-emerald-300"
                      data-testid={`costume-in-use-${o.id ?? 'default'}`}
                    >
                      <Check className="h-3 w-3" />
                      Kullanılıyor
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[10px] leading-snug text-slate-400">Kostümler yalnızca görünümü değiştirir; güç, yetenek ve ekipman aynı kalır.</p>
        </div>

        <div className="flex gap-2 border-t border-slate-800 px-4 py-3">
          {applied !== null && preview !== null && (
            <button
              type="button"
              onClick={() => {
                onPreview(null);
                onApply(null);
              }}
              data-testid="costume-reset"
              className="rounded-xl border border-slate-600 bg-slate-900 px-3 py-2.5 text-xs font-bold text-slate-200"
            >
              Varsayılana dön
            </button>
          )}
          <button
            type="button"
            disabled={!unlocked || !dirty}
            onClick={() => onApply(preview)}
            data-testid="costume-use"
            className="gold-btn flex-1 rounded-xl px-4 py-2.5 text-sm font-extrabold text-slate-950 disabled:opacity-50"
          >
            {!unlocked ? 'Kahramanı açınca kullanılır' : dirty ? 'Kullan' : 'Kullanılıyor'}
          </button>
        </div>
      </div>
    </div>
  );
};
