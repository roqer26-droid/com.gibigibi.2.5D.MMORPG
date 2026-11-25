import { ArrowLeft, Check, ChevronLeft, ChevronRight, Crown, Lock, Shield, Skull, Sparkles, Swords, Heart } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  TOWER_CONFIG,
  TOWER_RULES,
  bracketOf,
  canEnterFloor,
  floorKind,
  isTowerUnlocked,
  nextSpecialReward,
  towerCurrentFloor,
  towerFirstClearRewards,
  towerFloorStage,
  towerRuleFor,
  towerUnlockText,
  type TowerFloorKind,
} from '../data/tower';
import { HERO_CLASSES } from '../data/classes';
import { RARITY_META } from '../data/skills';
import { MATERIAL_IDS, MATERIAL_META } from '../data/awakening';
import { computeHeroBuild } from '../utils/rpgLogic';
import type { GameSaveState } from '../types/game';
import { BossPortrait } from './BossPortrait';
import { MaterialIcon } from './MaterialIcon';

interface TowerScreenProps {
  save: GameSaveState;
  /** Açılışta odaklanılacak kat (savaştan dönüşte oynanan kat); yoksa ulaşılabilen en yüksek kat */
  focusFloor?: number | null;
  onBack: () => void;
  onEnterFloor: (floor: number) => void;
}

const fmt = (n: number) => n.toLocaleString('tr-TR');
const short = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(n >= 1e7 ? 1 : 2).replace('.', ',')} Mn` : n >= 1e4 ? `${Math.round(n / 1e3)} B` : fmt(n));

const KIND_LABEL: Record<TowerFloorKind, string> = { normal: 'Normal Kat', elite: 'Elit Kat', boss: 'Boss Katı', final: 'Nihai Sınav' };

/** Kule simgesi (karanlık fantezi; hafif animasyonlu parıltı). */
function TowerArt({ progress }: { progress: number }) {
  const lit = Math.max(0, Math.min(1, progress));
  return (
    <svg viewBox="0 0 120 150" className="h-[132px] w-[106px] shrink-0 drop-shadow-[0_0_18px_rgba(139,92,246,0.45)]" aria-hidden="true">
      <defs>
        <linearGradient id="twBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4c1d95" />
          <stop offset="1" stopColor="#0f0a1f" />
        </linearGradient>
        <linearGradient id="twLit" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#fbbf24" stopOpacity="0.85" />
          <stop offset="1" stopColor="#a78bfa" stopOpacity="0.15" />
        </linearGradient>
        <radialGradient id="twGlow" cx="0.5" cy="0.12" r="0.5">
          <stop offset="0" stopColor="#c4b5fd" stopOpacity="0.9" />
          <stop offset="1" stopColor="#c4b5fd" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="18" r="26" fill="url(#twGlow)" className="awk-glow" style={{ ['--awk-lo' as string]: '0.55', ['--awk-hi' as string]: '1' }} />
      <path d="M60 4 L72 30 L48 30 Z" fill="#7c3aed" stroke="#c4b5fd" strokeWidth="1" />
      <path d="M44 30 H76 L82 146 H38 Z" fill="url(#twBody)" stroke="#8b5cf6" strokeWidth="1.2" />
      {/* Fethedilen katlar alttan yukarı aydınlanır */}
      <clipPath id="twClip"><path d="M44 30 H76 L82 146 H38 Z" /></clipPath>
      <rect x="30" y={146 - 116 * lit} width="60" height={116 * lit} fill="url(#twLit)" clipPath="url(#twClip)" />
      {[44, 62, 80, 98, 116, 134].map((y) => (
        <line key={y} x1="40" x2="80" y1={y} y2={y} stroke="#a78bfa" strokeOpacity="0.35" strokeWidth="1" />
      ))}
      {[52, 88, 124].map((y, i) => (
        <rect key={y} x="56" y={y - 6} width="8" height="10" rx="4" fill={i === 0 ? '#fde68a' : '#c4b5fd'} opacity="0.85" />
      ))}
      <path d="M30 146 H90" stroke="#6d28d9" strokeWidth="3" />
    </svg>
  );
}

function FloorIcon({ kind }: { kind: TowerFloorKind }) {
  if (kind === 'boss' || kind === 'final') return <Crown className="h-3.5 w-3.5 text-amber-300 drop-shadow-[0_0_4px_#ef4444]" />;
  if (kind === 'elite') return <Skull className="h-3.5 w-3.5 text-fuchsia-300" />;
  return null;
}

export function TowerScreen({ save, focusFloor, onBack, onEnterFloor }: TowerScreenProps) {
  const total = TOWER_CONFIG.floors;
  const unlocked = isTowerUnlocked(save);
  const highest = save.tower?.highest ?? 0;
  const current = towerCurrentFloor(save);
  const pageSize = TOWER_CONFIG.pageSize;
  const pages = Math.ceil(total / pageSize);
  const start = focusFloor && focusFloor >= 1 && focusFloor <= current ? focusFloor : current;
  const [selected, setSelected] = useState(start);
  const [page, setPage] = useState(Math.floor((start - 1) / pageSize));
  const enterLock = useRef(false);
  useEffect(() => {
    enterLock.current = false;
  }, [selected]);

  const hero = save.heroes[save.activeHeroClass];
  const power = useMemo(() => computeHeroBuild(hero).powerRating, [hero]);
  const stage = useMemo(() => towerFloorStage(selected, total), [selected, total]);
  const rule = towerRuleFor(selected, total);
  const kind = floorKind(selected, total);
  const bracket = bracketOf(selected, total);
  const rewards = towerFirstClearRewards(selected, total);
  const special = nextSpecialReward(save, total);
  const done = selected <= highest;
  const canEnter = canEnterFloor(save, selected, total);

  const floors = Array.from({ length: pageSize }, (_, i) => page * pageSize + i + 1).filter((f) => f <= total);

  const enter = () => {
    if (!canEnter || enterLock.current) return;
    enterLock.current = true;
    onEnterFloor(selected);
  };

  return (
    <div className="flex h-full flex-col bg-[radial-gradient(ellipse_at_top,#2e1065_0%,#0b0718_45%,#05040b_100%)]" data-testid="tower-screen">
      <header className="flex items-center gap-3 border-b border-violet-500/40 bg-[#07040f]/90 px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Geri"
          className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 text-[14px] font-bold text-slate-100"
        >
          <ArrowLeft className="h-4 w-4" /> Geri
        </button>
        <h1 className="min-w-0 flex-1 truncate font-display text-[21px] font-bold text-violet-200">Sonsuzluk Kulesi</h1>
        <span className="flex shrink-0 items-center gap-1 rounded-full border border-violet-400/50 bg-violet-950/60 px-2.5 py-1 text-[12px] font-extrabold text-violet-100" data-testid="tower-seals" title="Kule Mührü">
          <Sparkles className="h-3.5 w-3.5 text-violet-300" /> {fmt(save.tower?.seals ?? 0)}
        </span>
      </header>

      <div className="flex-1 overflow-y-auto px-3 pb-5 pt-3">
        {/* Kule ve ilerleme */}
        <section className="relative flex items-center gap-3 overflow-hidden rounded-2xl border border-violet-500/40 bg-[#0d0820]/80 p-3">
          <TowerArt progress={highest / total} />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-violet-300/80">Mevcut kat</p>
            <p className="font-display text-[28px] font-black leading-none text-white" data-testid="tower-current">
              {unlocked ? (highest >= total ? total : current) : '—'}
              <span className="text-[14px] font-bold text-slate-400"> / {total}</span>
            </p>
            <p className="mt-1 text-[12px] text-slate-300">
              En yüksek: <strong className="text-amber-300" data-testid="tower-highest">{highest}</strong>
            </p>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full border border-violet-500/40 bg-slate-950" data-testid="tower-progress" aria-label={`${highest}/${total} kat`}>
              <div className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-400 to-amber-300" style={{ width: `${(highest / total) * 100}%` }} />
            </div>
            {special && unlocked && (
              <p className="mt-2 text-[11px] leading-snug text-amber-200" data-testid="tower-next-special">
                Sıradaki özel ödül: <strong>{special.floor}. kat</strong> — {special.label}
              </p>
            )}
            {save.tower?.titles?.length ? (
              <p className="mt-1 text-[11px] font-bold text-amber-300" data-testid="tower-titles">Unvan: {save.tower.titles.join(', ')}</p>
            ) : null}
          </div>
        </section>

        {!unlocked ? (
          <section className="mt-3 flex items-start gap-3 rounded-2xl border border-slate-700 bg-slate-950/80 p-4" data-testid="tower-locked">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
            <div>
              <p className="font-bold text-slate-100">Kule kilitli</p>
              <p className="mt-1 text-[13px] text-slate-300">{towerUnlockText(save)}</p>
            </div>
          </section>
        ) : (
          <>
            {/* Seçili kat */}
            <section className="mt-3 rounded-2xl border bg-slate-950/80 p-3" style={{ borderColor: `${bracket.color}66` }} data-testid="tower-floor-detail" data-floor={selected}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-display text-[20px] font-black text-white">{selected}. Kat</p>
                  <p className="text-[11px] font-bold" style={{ color: bracket.color }}>
                    {bracket.name} · {KIND_LABEL[kind]}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-slate-200" data-testid="tower-hero-power">
                  {HERO_CLASSES[hero.classId].name} · Güç {fmt(power)}
                </span>
              </div>

              <div className="mt-2 flex items-center gap-3">
                <div className={`relative shrink-0 rounded-xl border p-1 ${kind === 'normal' ? 'border-slate-700' : kind === 'elite' ? 'border-fuchsia-400/60' : 'border-amber-400/70 shadow-[0_0_14px_rgba(239,68,68,0.35)]'}`}>
                  <BossPortrait enemy={stage.enemy} size={92} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-extrabold text-slate-100" data-testid="tower-enemy-name">{stage.enemy.name}</p>
                  {stage.enemy.title && <p className="truncate text-[11px] text-slate-400">{stage.enemy.title}</p>}
                  <ul className="mt-1.5 space-y-0.5 text-[12px] font-semibold" data-testid="tower-enemy-stats">
                    <li className="flex items-center gap-1.5 text-rose-300"><Heart className="h-3.5 w-3.5" /> Can <span className="ml-auto text-slate-100" data-testid="tower-enemy-hp">{short(stage.enemy.maxHp)}</span></li>
                    <li className="flex items-center gap-1.5 text-orange-300"><Swords className="h-3.5 w-3.5" /> Saldırı <span className="ml-auto text-slate-100" data-testid="tower-enemy-atk">{short(stage.enemy.attack)}</span></li>
                    <li className="flex items-center gap-1.5 text-sky-300"><Shield className="h-3.5 w-3.5" /> Savunma <span className="ml-auto text-slate-100">{fmt(stage.enemy.defense)}</span></li>
                  </ul>
                </div>
              </div>

              <div
                className={`mt-2.5 rounded-xl border px-3 py-2 text-[12px] ${rule ? (TOWER_RULES[rule].hard ? 'border-rose-400/40 bg-rose-950/25' : 'border-emerald-400/40 bg-emerald-950/25') : 'border-slate-800 bg-slate-900/60'}`}
                data-testid="tower-rule"
                data-rule={rule ?? ''}
              >
                {rule ? (
                  <>
                    <p className={`font-extrabold ${TOWER_RULES[rule].hard ? 'text-rose-200' : 'text-emerald-200'}`}>Özel kural: {TOWER_RULES[rule].name}</p>
                    <p className="mt-0.5 text-slate-300">{TOWER_RULES[rule].text}</p>
                  </>
                ) : (
                  <p className="text-slate-400">Bu katta özel savaş kuralı yok.</p>
                )}
              </div>

              <div className="mt-2.5 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-[12px]" data-testid="tower-reward-preview">
                {done ? (
                  <p className="font-bold text-emerald-300"><Check className="mr-1 inline h-4 w-4" />Tamamlandı — tekrar oynanabilir (antrenman, ödül yok)</p>
                ) : (
                  <>
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-300/80">İlk zafer ödülü</p>
                    <p className="mt-0.5 text-slate-200">
                      {fmt(rewards.gold)} altın · {rewards.crystals} kristal · {fmt(rewards.xp)} TP ·{' '}
                      <span style={{ color: RARITY_META[rewards.item.rarity].color }}>{RARITY_META[rewards.item.rarity].label} ekipman</span> · {rewards.seals} Kule Mührü
                    </p>
                    {rewards.chest && <p className="mt-0.5 font-bold text-amber-200">+ Kule Sandığı</p>}
                    {rewards.materials && (
                      <p className="mt-0.5 flex flex-wrap items-center gap-2 font-bold">
                        {MATERIAL_IDS.filter((id) => rewards.materials![id] > 0).map((id) => (
                          <span key={id} className="inline-flex items-center gap-1" style={{ color: MATERIAL_META[id].color }}>
                            <MaterialIcon id={id} size={13} />+{rewards.materials![id]}
                          </span>
                        ))}
                      </p>
                    )}
                    {rewards.title && <p className="mt-0.5 font-extrabold text-amber-300">+ “{rewards.title}” unvanı</p>}
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={enter}
                disabled={!canEnter}
                data-testid="tower-enter"
                className="gold-btn mt-3 flex min-h-[54px] w-full items-center justify-center gap-2 rounded-xl text-[17px] font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {canEnter ? 'Kata Gir' : <><Lock className="h-4 w-4" /> Önce {selected - 1}. katı tamamla</>}
              </button>
            </section>

            {/* Kat sayfaları */}
            <section className="mt-3 rounded-2xl border border-violet-500/30 bg-[#0d0820]/70 p-3">
              <div className="flex items-center justify-between">
                <button type="button" aria-label="Önceki katlar" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-200 disabled:opacity-30" data-testid="tower-page-prev">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <p className="text-[13px] font-extrabold text-violet-100" data-testid="tower-page-label">
                  {page * pageSize + 1}–{Math.min(total, (page + 1) * pageSize)}. Katlar
                </p>
                <button type="button" aria-label="Sonraki katlar" disabled={page >= pages - 1} onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-200 disabled:opacity-30" data-testid="tower-page-next">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2.5 grid grid-cols-5 gap-1.5" data-testid="tower-floors">
                {floors.map((f) => {
                  const k = floorKind(f, total);
                  const isDone = f <= highest;
                  const isCur = f === current && !isDone;
                  const locked = f > current;
                  const sel = f === selected;
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setSelected(f)}
                      data-testid={`tower-floor-${f}`}
                      data-state={isDone ? 'done' : isCur ? 'current' : 'locked'}
                      data-kind={k}
                      aria-pressed={sel}
                      className={`relative flex h-[52px] flex-col items-center justify-center rounded-xl border text-[13px] font-black transition active:scale-95 ${
                        isCur
                          ? 'border-amber-300 bg-amber-500/20 text-amber-100 shadow-[0_0_14px_rgba(251,191,36,0.55)]'
                          : isDone
                            ? 'border-emerald-500/50 bg-emerald-950/30 text-emerald-100'
                            : k === 'boss' || k === 'final'
                              ? 'border-rose-500/40 bg-rose-950/20 text-slate-400'
                              : k === 'elite'
                                ? 'border-fuchsia-500/40 bg-fuchsia-950/20 text-slate-400'
                                : 'border-slate-800 bg-slate-900/70 text-slate-500'
                      } ${sel ? 'ring-2 ring-violet-300 ring-offset-1 ring-offset-[#0d0820]' : ''}`}
                    >
                      <span>{f}</span>
                      <span className="flex h-3.5 items-center gap-0.5">
                        {isDone ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : locked ? <Lock className="h-3 w-3 text-slate-500" /> : null}
                        <FloorIcon kind={k} />
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[10.5px] leading-snug text-slate-400">
                <Check className="inline h-3 w-3 text-emerald-400" /> tamamlandı · <span className="text-amber-300">altın</span> mevcut kat ·{' '}
                <Skull className="inline h-3 w-3 text-fuchsia-300" /> elit · <Crown className="inline h-3 w-3 text-amber-300" /> boss · <Lock className="inline h-3 w-3" /> kilitli
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
