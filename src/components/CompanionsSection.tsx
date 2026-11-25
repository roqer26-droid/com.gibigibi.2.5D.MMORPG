import { Check, Lock } from 'lucide-react';
import { COMPANIONS, companionStatus } from '../data/companions';
import { CompanionIdleSprite } from './CompanionIdleSprite';
import { HERO_CLASSES } from '../data/classes';
import type { CompanionId, GameSaveState } from '../types/game';

interface CompanionsSectionProps {
  save: GameSaveState;
  onUnlock: (id: CompanionId) => void;
  /** null = yoldaşsız */
  onSetActive: (id: CompanionId | null) => void;
}

/** Kahramanlar ekranındaki "Yoldaşlar" bölümü: görsel, savaş etkisi, parça ilerlemesi, boss şartı, açma ve seçim. */
export function CompanionsSection({ save, onUnlock, onSetActive }: CompanionsSectionProps) {
  const heroName = HERO_CLASSES[save.activeHeroClass].name;
  const activeId = save.companions.active[save.activeHeroClass];
  return (
    <section data-testid="companions" aria-label="Yoldaşlar" className="lg:col-span-12">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[12px] text-slate-400">{heroName} için tek aktif yoldaş seçilebilir. Her yoldaş savaş başına en fazla bir kez destek verir.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {COMPANIONS.map((c) => {
          const st = companionStatus(save, c.id);
          const isActive = activeId === c.id;
          const shown = st.unlocked ? c.partsNeeded : Math.min(st.parts, c.partsNeeded);
          return (
            <article
              key={c.id}
              data-testid={`companion-${c.id}`}
              data-state={st.unlocked ? (isActive ? 'active' : 'unlocked') : st.canUnlock ? 'ready' : 'locked'}
              className={`rounded-2xl border-2 p-3 ${isActive ? 'border-emerald-400/70 bg-emerald-950/20' : st.canUnlock ? 'border-amber-300 bg-amber-950/20' : 'border-slate-700 bg-slate-950/60'}`}
            >
              <div className="flex items-center gap-3">
                <CompanionIdleSprite id={c.id} size={72} alt={c.name} className={st.unlocked ? '' : 'opacity-70 grayscale-[0.4]'} />
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-[17px] font-bold text-white">{c.name}</h3>
                  <p className="text-[11px] font-semibold text-slate-400">{c.partName} · {c.regionName}</p>
                </div>
              </div>
              <p className="mt-2 text-[12px] leading-snug text-slate-300">
                <strong className="text-amber-200">{c.effectTitle}:</strong> {c.effectText}
              </p>

              {st.unlocked ? (
                <p className="mt-2 text-[12px] font-bold text-emerald-300">Kalıcı olarak açıldı</p>
              ) : (
                <>
                  <div className="mt-2" data-testid={`parts-${c.id}`}>
                    <div className="flex items-center justify-between text-[12px] font-bold">
                      <span className="text-slate-300">{c.partName}</span>
                      <span className={st.partsOk ? 'text-emerald-300' : 'text-slate-200'}>
                        {st.parts}/{c.partsNeeded} parça
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-800">
                      <div className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-300" style={{ width: `${(shown / c.partsNeeded) * 100}%` }} />
                    </div>
                  </div>
                  <p className="mt-1.5 text-[11px] leading-snug text-slate-400" data-testid={`earn-${c.id}`}>
                    Kazanım: {c.regionName} elit zaferleri +{c.eliteParts} (tekrarlar dahil) · ustalık sandıkları +{c.chestParts[1]} / +{c.chestParts[2]} (tek sefer)
                  </p>
                  <p
                    className={`mt-2 flex items-start gap-1.5 text-[12px] font-semibold ${st.bossOk ? 'text-emerald-300' : 'text-slate-400'}`}
                    data-testid={`boss-${c.id}`}
                    data-ok={st.bossOk ? '1' : '0'}
                  >
                    {st.bossOk ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                    <span>
                      {c.boss.modeLabel} · {c.boss.arenaLabel}: {c.boss.bossAcc} yen{st.bossOk ? ' ✓' : ''}
                    </span>
                  </p>
                </>
              )}

              {st.unlocked ? (
                <button
                  type="button"
                  onClick={() => onSetActive(isActive ? null : c.id)}
                  data-testid={`select-${c.id}`}
                  className={`mt-3 min-h-[48px] w-full rounded-xl text-sm font-extrabold ${isActive ? 'border border-emerald-500/50 bg-emerald-950/50 text-emerald-300' : 'gold-btn text-slate-950'}`}
                >
                  {isActive ? 'Aktif · Kaldır' : `${heroName} İçin Seç`}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!st.canUnlock}
                  onClick={() => onUnlock(c.id)}
                  data-testid={`unlock-${c.id}`}
                  className="gold-btn mt-3 min-h-[48px] w-full rounded-xl text-sm font-extrabold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Yoldaşı Aç
                </button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
