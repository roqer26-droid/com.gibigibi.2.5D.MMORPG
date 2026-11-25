import { useRef, useState } from 'react';
import { ArrowLeft, Check, Coins, Crown, Lock, Skull, Sparkles } from 'lucide-react';
import { HERO_CLASSES } from '../data/classes';
import { AWAKEN_LEVEL_REQ, AWAKEN_TIERS, awakenBonuses, awakenStatus, awakenTierDef, type AwakenBonuses } from '../data/awakening';
import type { GameSaveState, HeroClassId } from '../types/game';
import { HeroIdleSprite } from './HeroIdleSprite';
import { MaterialIcon } from './MaterialIcon';

interface Props {
  save: GameSaveState;
  heroId: HeroClassId;
  onBack: () => void;
  /** Uyanışı gerçekleştir (dokunulduğu andaki kademe ile; çift dokunmada ikinci istek reddedilir) */
  onAwaken: (heroId: HeroClassId, expectedTier: number) => { ok: boolean; tier?: number };
}

const BONUS_ROWS: { key: keyof AwakenBonuses; label: string }[] = [
  { key: 'hpPct', label: 'Maksimum can' },
  { key: 'atkPct', label: 'Saldırı' },
  { key: 'defPct', label: 'Savunma' },
  { key: 'manaPct', label: 'Mana kazanımı' },
  { key: 'ultiPct', label: 'Ulti kazanımı' },
];

/** Kahraman Uyanışı ekranı (kahraman detayından açılır). */
export function AwakeningScreen({ save, heroId, onBack, onAwaken }: Props) {
  const hero = save.heroes[heroId];
  const cls = HERO_CLASSES[heroId];
  const st = awakenStatus(save, heroId);
  const cur = awakenTierDef(st.tier);
  const nextB = st.next ? st.next.bonuses : null;
  const curB = awakenBonuses(st.tier);
  const [ceremony, setCeremony] = useState<number | null>(null);
  const busy = useRef(false);

  const awaken = () => {
    if (busy.current || !st.canAwaken) return;
    busy.current = true;
    const res = onAwaken(heroId, st.tier);
    if (res.ok && res.tier) {
      setCeremony(res.tier);
      window.setTimeout(() => {
        setCeremony(null);
        busy.current = false;
      }, 2100);
    } else busy.current = false;
  };

  const ceremonyDef = ceremony ? awakenTierDef(ceremony) : null;

  return (
    <div className="flex h-full flex-col bg-[#070b17]" data-testid="awakening-screen">
      <header className="flex shrink-0 items-center gap-3 border-b border-amber-500/40 bg-[#050810] px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Geri"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-600 bg-slate-900 text-slate-100 hover:border-amber-400/50"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300/80">Kahraman Uyanışı</p>
          <h1 className="truncate font-display text-[20px] font-bold leading-tight text-[#fff3d0]">{cls.name}</h1>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="mx-auto max-w-xl space-y-3">
          {/* Kahraman */}
          <section
            className="relative flex flex-col items-center overflow-hidden rounded-2xl border p-3"
            style={{ borderColor: `${cur?.color ?? cls.themeColor}55`, background: `radial-gradient(circle at 50% 45%, ${(cur?.color ?? cls.themeColor)}22, rgba(10,12,24,0.96) 70%)` }}
          >
            <HeroIdleSprite hero={hero} size={170} />
            <div className="mt-1 flex items-center gap-2">
              <span className="font-display text-[18px] font-bold text-white">{cls.title}</span>
              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[11px] font-bold text-amber-300">Sv.{hero.level}</span>
            </div>
            <p className="mt-0.5 text-[13px] font-extrabold" style={{ color: cur?.color ?? '#94a3b8' }} data-testid="awakening-current">
              {cur ? `Kademe ${cur.roman} — ${cur.name}` : 'Uyanmamış'}
            </p>
            {/* 5 kademe simgesi */}
            <div className="mt-2 flex items-center gap-2" data-testid="awakening-tiers">
              {AWAKEN_TIERS.map((t) => {
                const got = st.tier >= t.tier;
                const isNext = st.tier + 1 === t.tier;
                return (
                  <div
                    key={t.tier}
                    title={`Kademe ${t.roman} — ${t.name}`}
                    data-got={got ? '1' : '0'}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border-2 font-display text-[12px] font-black ${isNext ? 'animate-pulse' : ''}`}
                    style={{
                      borderColor: got || isNext ? t.color : '#334155',
                      background: got ? `radial-gradient(circle, ${t.glow}, ${t.color})` : 'rgba(15,23,42,0.85)',
                      color: got ? '#0f172a' : isNext ? t.color : '#64748b',
                      boxShadow: got ? `0 0 10px ${t.color}88` : undefined,
                    }}
                  >
                    {t.roman}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Özellikler */}
          <section className="grid grid-cols-2 gap-2" data-testid="awakening-bonuses">
            <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-2.5">
              <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">Mevcut</p>
              <p className="text-[12px] font-bold" style={{ color: cur?.color ?? '#94a3b8' }}>{cur ? cur.name : 'Bonus yok'}</p>
              <ul className="mt-1 space-y-0.5 text-[12px]">
                {BONUS_ROWS.map((r) => (
                  <li key={r.key} className="flex justify-between gap-1 text-slate-300">
                    <span className="min-w-0">{r.label}</span>
                    <span className="font-bold text-slate-100">+%{curB[r.key]}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border p-2.5" style={{ borderColor: `${st.next?.color ?? '#334155'}88`, background: 'rgba(2,6,23,0.75)' }}>
              <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">Sonraki</p>
              {st.next && nextB ? (
                <>
                  <p className="text-[12px] font-bold" style={{ color: st.next.color }}>Kademe {st.next.roman} — {st.next.name}</p>
                  <ul className="mt-1 space-y-0.5 text-[12px]">
                    {BONUS_ROWS.map((r) => (
                      <li key={r.key} className="flex justify-between gap-1 text-slate-300">
                        <span className="min-w-0">{r.label}</span>
                        <span className={`font-bold ${nextB[r.key] > curB[r.key] ? 'text-emerald-300' : 'text-slate-100'}`}>+%{nextB[r.key]}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="mt-1 text-[12px] font-bold text-amber-200">Tüm kademeler açıldı</p>
              )}
            </div>
          </section>
          <p className="px-1 text-[10.5px] leading-snug text-slate-500">Değerler kademenin toplam bonusudur. Mana ve ulti kazanımı taş eşleşmelerine uygulanır.</p>

          {/* Gereksinimler */}
          {st.next && (
            <section className="rounded-2xl border border-slate-700 bg-slate-950/70 p-3" data-testid="awakening-requirements">
              <p className="text-[12px] font-extrabold text-amber-300">Gerekenler</p>
              <ul className="mt-1.5 space-y-1">
                <li className={`flex items-center justify-between text-[12px] ${st.levelOk ? 'text-emerald-300' : 'text-slate-300'}`} data-testid="req-level" data-ok={st.levelOk ? '1' : '0'}>
                  <span className="flex items-center gap-1.5">
                    {st.levelOk ? <Check className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />} Seviye {AWAKEN_LEVEL_REQ}
                  </span>
                  <span className="font-bold">Sv.{hero.level}</span>
                </li>
                {st.materials.map((m) => (
                  <li key={m.key} className="flex items-center justify-between gap-2 text-[12px]" data-testid={`req-${m.key}`} data-ok={m.ok ? '1' : '0'}>
                    <span className="flex min-w-0 items-center gap-1.5 text-slate-200">
                      {m.key === 'gold' ? <Coins className="h-4 w-4 shrink-0 text-amber-300" /> : <MaterialIcon id={m.key} size={16} />}
                      <span className="truncate">{m.label}</span>
                    </span>
                    <span className={`shrink-0 font-extrabold ${m.ok ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {m.have.toLocaleString('tr-TR')} / {m.need.toLocaleString('tr-TR')}
                    </span>
                  </li>
                ))}
              </ul>
              {st.boss && (
                <div className="mt-2 rounded-xl border border-slate-800 bg-slate-900/70 p-2" data-testid="req-boss" data-ok={st.boss.ok && st.stageOk ? '1' : '0'}>
                  <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">Yenilmesi gereken boss</p>
                  <p className={`mt-0.5 flex items-start gap-1.5 text-[12px] font-semibold ${st.boss.ok ? 'text-emerald-300' : 'text-slate-300'}`}>
                    <Skull className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      {st.boss.bossName} · {st.boss.regionName} ({st.boss.order}. aşama){st.boss.ok ? ' ✓' : ''}
                    </span>
                  </p>
                  <p className={`mt-0.5 flex items-center gap-1.5 text-[12px] ${st.stageOk ? 'text-emerald-300' : 'text-slate-400'}`}>
                    {st.stageOk ? <Check className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />} {st.next.stageOrder}. aşamanın tamamlanması
                  </p>
                </div>
              )}
            </section>
          )}

          {/* Düğme */}
          {st.maxed ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-amber-300/70 bg-gradient-to-r from-amber-500/25 via-amber-200/15 to-amber-500/25 py-3 text-[14px] font-black text-amber-100" data-testid="awakening-max">
              <Crown className="h-4 w-4" /> Maksimum Uyanış
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={awaken}
                disabled={!st.canAwaken || ceremony !== null}
                data-testid="awaken-btn"
                className="gold-btn flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl px-4 text-[15px] font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-45 disabled:grayscale"
              >
                <Sparkles className="h-5 w-5" /> Uyanışı Gerçekleştir
              </button>
              {!st.canAwaken && (
                <p className="text-center text-[11.5px] font-semibold text-slate-400" data-testid="awaken-blocker">
                  {!st.levelOk ? `Uyanış seviye ${AWAKEN_LEVEL_REQ}'de açılır — şimdilik inceleyebilirsin.` : st.blockers[0]}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Uyanış töreni (~2 sn): enerji toplanır, ışık halkası, kademe adı */}
      {ceremonyDef && (
        <div className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center bg-black/55" data-testid="awakening-ceremony" aria-live="polite">
          <div className="relative h-64 w-64">
            {Array.from({ length: 10 }, (_, i) => {
              const a = (i / 10) * Math.PI * 2;
              return (
                <span
                  key={i}
                  className="awk-gather absolute left-1/2 top-1/2 -ml-1.5 -mt-1.5 h-3 w-3 rounded-full"
                  style={{
                    background: i % 2 ? ceremonyDef.glow : ceremonyDef.color,
                    boxShadow: `0 0 12px ${ceremonyDef.glow}`,
                    ['--dx' as string]: `${Math.cos(a) * 120}px`,
                    ['--dy' as string]: `${Math.sin(a) * 120}px`,
                    animationDelay: `${(i % 5) * 0.06}s`,
                  }}
                />
              );
            })}
            <span
              className="awk-burst absolute left-1/2 top-1/2 h-44 w-44 rounded-full border-4"
              style={{ borderColor: ceremonyDef.glow, boxShadow: `0 0 30px ${ceremonyDef.color}, inset 0 0 24px ${ceremonyDef.color}` }}
            />
            <div className="awk-title absolute inset-x-[-40px] bottom-[-34px] text-center">
              <p className="font-display text-[13px] font-bold uppercase tracking-[0.2em] text-amber-200">Kademe {ceremonyDef.roman}</p>
              <p className="font-display text-[28px] font-black" style={{ color: ceremonyDef.color, textShadow: `0 0 18px ${ceremonyDef.glow}` }}>
                {ceremonyDef.name}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
