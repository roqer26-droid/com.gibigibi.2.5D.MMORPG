import { ArrowLeft, Check, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  TITLES,
  TITLE_CATEGORIES,
  TITLE_CATEGORY_IDS,
  TITLE_COLLECTION_BONUSES,
  TITLE_RARITIES,
  TITLE_RARITY_IDS,
  accountBonusOf,
  nextCollectionThreshold,
  titleById,
  titleProgress,
  type TitleCategory,
  type TitleDef,
  type TitleProgress,
} from '../data/titles';
import type { GameSaveState } from '../types/game';
import { TitleSymbol } from './TitleUi';

interface TitlesScreenProps {
  save: GameSaveState;
  onBack: () => void;
  onSetActive: (id: string | null) => void;
  /** Ekran açıldı: yeni unvan bildirim noktası temizlenir */
  onSeen: () => void;
}

type Filter = 'all' | 'earned' | 'locked';
const FILTERS: { id: Filter; name: string }[] = [
  { id: 'all', name: 'Tümü' },
  { id: 'earned', name: 'Kazanılanlar' },
  { id: 'locked', name: 'Kilitli' },
];

const fmt = (n: number) => n.toLocaleString('tr-TR');

function progressText(def: TitleDef, p: TitleProgress): string {
  if (p.unavailable) return 'Bu özellik oyuna eklendiğinde açılır';
  if (p.target <= 1 && !def.progressLabel) return p.done ? 'Tamamlandı' : 'Henüz değil';
  return `${def.progressLabel ?? 'İlerleme'}: ${fmt(p.current)}/${fmt(p.target)}`;
}

export function TitlesScreen({ save, onBack, onSetActive, onSeen }: TitlesScreenProps) {
  useEffect(() => {
    onSeen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [cat, setCat] = useState<TitleCategory>('combat');
  const [filter, setFilter] = useState<Filter>('all');
  const earned = useMemo(() => new Set(save.titles?.earned ?? []), [save.titles]);
  const active = titleById(save.titles?.active);
  // İlerlemeler kayıt başına bir kez (500 aşamalık yıldız sayımı tek sefer)
  const progress = useMemo(() => {
    const cache = new Map<string, number>();
    return new Map(TITLES.map((t) => [t.id, titleProgress(save, t, cache)]));
  }, [save]);
  const total = TITLES.length;
  const count = TITLES.filter((t) => earned.has(t.id)).length;
  const pct = Math.round((count / total) * 100);
  const bonus = accountBonusOf(save);
  const next = nextCollectionThreshold(save.titles?.earned?.length ?? 0);
  const near = useMemo(
    () =>
      TITLES.filter((t) => !earned.has(t.id))
        .map((t) => ({ t, p: progress.get(t.id)! }))
        .filter(({ p }) => !p.unavailable && p.target > 1 && p.current > 0)
        .sort((a, b) => b.p.current / b.p.target - a.p.current / a.p.target)
        .slice(0, 3),
    [earned, progress]
  );
  const list = TITLES.filter((t) => t.category === cat).filter((t) => (filter === 'all' ? true : filter === 'earned' ? earned.has(t.id) : !earned.has(t.id)));

  return (
    <div className="flex h-full flex-col bg-[radial-gradient(ellipse_at_top,#2a1a05_0%,#0b0a14_45%,#05060b_100%)]" data-testid="titles-screen">
      <header className="flex items-center gap-3 border-b border-amber-500/40 bg-[#07060c]/90 px-4 py-3">
        <button type="button" onClick={onBack} aria-label="Geri" className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 text-[14px] font-bold text-slate-100">
          <ArrowLeft className="h-4 w-4" /> Geri
        </button>
        <h1 className="min-w-0 flex-1 truncate font-display text-[22px] font-bold text-amber-300">Unvanlar</h1>
        <span className="shrink-0 rounded-full border border-amber-400/50 bg-amber-950/50 px-2.5 py-1 text-[12px] font-extrabold text-amber-100" data-testid="titles-count">
          {count}/{total}
        </span>
      </header>

      <div className="flex-1 overflow-y-auto px-3 pb-6 pt-3" data-testid="titles-scroll">
        {/* Aktif unvan */}
        <section className="rounded-2xl border border-amber-400/40 bg-[#120d06]/80 p-3" data-testid="titles-active">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-300/80">Aktif unvan</p>
          {active ? (
            <div className="mt-1.5 flex items-center gap-3">
              <TitleSymbol def={active} size={44} />
              <div className="min-w-0 flex-1">
                <p className={`font-display text-[17px] font-black leading-tight ${active.rarity === 'mythic' ? 'title-mythic' : ''}`} style={active.rarity === 'mythic' ? undefined : { color: TITLE_RARITIES[active.rarity].color }}>
                  {active.name}
                </p>
                <p className="text-[11px] font-bold" style={{ color: TITLE_RARITIES[active.rarity].color }}>{TITLE_RARITIES[active.rarity].name}</p>
              </div>
              <button type="button" onClick={() => onSetActive(null)} data-testid="title-remove" className="flex min-h-[40px] shrink-0 items-center gap-1 rounded-xl border border-slate-700 bg-slate-900 px-2.5 text-[12px] font-bold text-slate-200">
                <X className="h-3.5 w-3.5" /> Kaldır
              </button>
            </div>
          ) : (
            <p className="mt-1 text-[13px] text-slate-400">Aktif unvan yok. Kazandığın bir unvanı aşağıdan etkinleştirebilirsin.</p>
          )}
        </section>

        {/* Koleksiyon */}
        <section className="mt-3 rounded-2xl border border-slate-700/80 bg-slate-950/70 p-3" data-testid="titles-summary">
          <div className="flex items-baseline justify-between">
            <p className="text-[13px] font-bold text-slate-200">Koleksiyon</p>
            <p className="text-[13px] font-black text-amber-200" data-testid="titles-pct">%{pct}</p>
          </div>
          <div className="mt-1.5 h-2.5 overflow-hidden rounded-full border border-amber-500/30 bg-slate-900">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-200" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-2 grid grid-cols-5 gap-1" data-testid="titles-rarity-counts">
            {TITLE_RARITY_IDS.map((r) => {
              const all = TITLES.filter((t) => t.rarity === r);
              const got = all.filter((t) => earned.has(t.id)).length;
              return (
                <div key={r} className="rounded-lg border border-slate-800 bg-slate-900/70 px-1 py-1 text-center">
                  <div className="truncate text-[9.5px] font-bold" style={{ color: TITLE_RARITIES[r].color }}>{TITLE_RARITIES[r].name}</div>
                  <div className="text-[12px] font-black text-slate-100">{got}/{all.length}</div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-2.5 py-2 text-[12px]" data-testid="titles-bonus">
            <p className="font-bold text-emerald-200">
              Koleksiyon bonusu: can +%{bonus.hpPct} · saldırı +%{bonus.atkPct} · savunma +%{bonus.defPct} · mana +%{bonus.manaPct}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              {next
                ? `${next.count} unvanda: ${Object.entries(next.bonus).map(([k, v]) => `${({ hpPct: 'can', atkPct: 'saldırı', defPct: 'savunma', manaPct: 'mana kazanımı' } as Record<string, string>)[k]} +%${v}`).join(', ')} (${next.count - (save.titles?.earned?.length ?? 0)} unvan kaldı)`
                : `Tüm koleksiyon eşikleri (${TITLE_COLLECTION_BONUSES.length}) açıldı.`}
            </p>
          </div>
        </section>

        {near.length > 0 && (
          <section className="mt-3 rounded-2xl border border-sky-500/30 bg-sky-950/15 p-3" data-testid="titles-near">
            <p className="text-[12px] font-extrabold text-sky-200">Tamamlanmaya yakın</p>
            <ul className="mt-1.5 space-y-1.5">
              {near.map(({ t, p }) => (
                <li key={t.id} className="flex items-center gap-2">
                  <TitleSymbol def={t} size={26} />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2 text-[12px]">
                      <span className="truncate font-bold text-slate-100">{t.name}</span>
                      <span className="shrink-0 text-slate-400">{fmt(p.current)}/{fmt(p.target)}</span>
                    </div>
                    <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-slate-800">
                      <div className="h-full rounded-full bg-sky-400" style={{ width: `${(p.current / p.target) * 100}%` }} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Kategoriler ve filtreler */}
        <div className="mt-3 grid grid-cols-3 gap-1.5" role="tablist" data-testid="titles-categories">
          {TITLE_CATEGORY_IDS.map((c) => {
            const all = TITLES.filter((t) => t.category === c);
            const got = all.filter((t) => earned.has(t.id)).length;
            return (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={cat === c}
                onClick={() => setCat(c)}
                data-testid={`titles-cat-${c}`}
                className={`flex min-h-[40px] flex-col items-center justify-center rounded-xl border px-1 text-[12px] font-extrabold leading-tight ${cat === c ? 'border-amber-400 bg-amber-500/15 text-amber-100' : 'border-slate-700 bg-slate-900/70 text-slate-300'}`}
              >
                <span className="truncate">{TITLE_CATEGORIES[c].name}</span>
                <span className="text-[10px] font-bold text-slate-400">{got}/{all.length}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex gap-1.5" data-testid="titles-filters">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              data-testid={`titles-filter-${f.id}`}
              className={`flex-1 rounded-lg border py-1.5 text-[12px] font-bold ${filter === f.id ? 'border-sky-400 bg-sky-500/15 text-sky-100' : 'border-slate-700 bg-slate-900/70 text-slate-400'}`}
            >
              {f.name}
            </button>
          ))}
        </div>

        <ul className="mt-2.5 space-y-2" data-testid="titles-list">
          {list.length === 0 && <li className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-4 text-center text-[13px] text-slate-400">Bu filtrede unvan yok.</li>}
          {list.map((t) => {
            const p = progress.get(t.id)!;
            const got = earned.has(t.id);
            const isActive = save.titles?.active === t.id;
            const r = TITLE_RARITIES[t.rarity];
            return (
              <li
                key={t.id}
                data-testid={`title-card-${t.id}`}
                data-earned={got ? '1' : '0'}
                className={`rounded-2xl border p-2.5 ${got ? 'bg-slate-950/80' : 'bg-slate-950/50'}`}
                style={{ borderColor: got ? `${r.color}66` : '#1e293b' }}
              >
                <div className="flex items-start gap-2.5">
                  <TitleSymbol def={t} size={38} dim={!got} />
                  <div className={`min-w-0 flex-1 ${got ? '' : 'opacity-75'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className={`min-w-0 truncate text-[14.5px] font-black ${got && t.rarity === 'mythic' ? 'title-mythic' : ''}`} style={got && t.rarity === 'mythic' ? undefined : { color: got ? r.color : '#cbd5e1' }}>
                        {t.name}
                      </p>
                      <span className="shrink-0 text-[10.5px] font-bold" style={{ color: r.color }}>{r.name}</span>
                    </div>
                    <p className="text-[12px] leading-snug text-slate-300">{t.description}</p>
                    {!got && (
                      <>
                        <p className="mt-1 text-[11px] font-semibold text-slate-400" data-testid={`title-progress-${t.id}`}>{progressText(t, p)}</p>
                        {p.target > 1 && !p.unavailable && (
                          <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-slate-800">
                            <div className="h-full rounded-full" style={{ width: `${(p.current / p.target) * 100}%`, background: r.color }} />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
                {got && (
                  <div className="mt-2 flex justify-end">
                    {isActive ? (
                      <span className="flex items-center gap-1 rounded-lg border border-emerald-400/50 bg-emerald-950/40 px-2.5 py-1 text-[12px] font-bold text-emerald-200" data-testid={`title-active-${t.id}`}>
                        <Check className="h-3.5 w-3.5" /> Aktif
                      </span>
                    ) : (
                      <button type="button" onClick={() => onSetActive(t.id)} data-testid={`title-use-${t.id}`} className="rounded-lg border border-amber-400/60 bg-amber-500/15 px-3 py-1 text-[12px] font-extrabold text-amber-100">
                        Etkinleştir
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
