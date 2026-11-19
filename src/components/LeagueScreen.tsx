import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Award, Check, ChevronRight, Clock3, Coins, Gem, Gift, ScrollText, Shield, Sparkles, Swords, Trophy } from 'lucide-react';
import arenaArtwork from '../../public/images/league-arena.jpg?inline';
import gorrArtwork from '../../public/images/league-gorr.jpg?inline';
import vargArtwork from '../../public/images/league-varg.jpg?inline';
import kaelArtwork from '../../public/images/league-kael.jpg?inline';
import { HERO_CLASSES } from '../data/classes';
import { BENCHMARK_RIVALS, createLeagueStage, LEAGUE_OPPONENTS, LEAGUE_TIERS, leagueRank, nextTier, tierFor, type LeagueOpponent } from '../data/league';
import { GEM_INFO } from '../data/skills';
import { GameSaveState } from '../types/game';
import { nextWeekAt, remainingTime } from '../utils/calendar';

interface LeagueScreenProps {
  save: GameSaveState;
  onBack: () => void;
  onOpenQuests: () => void;
  onStartOpponent: (opponent: LeagueOpponent) => void;
  onClaimTier: (tierId: string) => void;
  onClaimPending: (rewardId: string) => void;
}

const OPPONENT_ART: Record<string, string> = { gorr: gorrArtwork, varg: vargArtwork, kael: kaelArtwork };

export function LeagueScreen({ save, onBack, onOpenQuests, onStartOpponent, onClaimTier, onClaimPending }: LeagueScreenProps) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const league = save.league;
  const hero = save.heroes[save.activeHeroClass];
  const heroClass = HERO_CLASSES[save.activeHeroClass];
  const tier = tierFor(league.points);
  const upcoming = nextTier(league.points);
  const progress = upcoming
    ? Math.min(100, Math.max(0, ((league.points - tier.minPoints) / (upcoming.minPoints - tier.minPoints)) * 100))
    : 100;
  const rank = leagueRank(league.points);
  const ranking = useMemo(() => {
    const bots = BENCHMARK_RIVALS.map((rival) => ({ ...rival, isPlayer: false }));
    return [...bots, { id: 'player', name: heroClass.name, title: 'Senin kahramanın', points: league.points, isPlayer: true }]
      .sort((a, b) => b.points - a.points || Number(a.isPlayer) - Number(b.isPlayer));
  }, [heroClass.name, league.points]);

  return (
    <div className="flex h-full flex-col bg-[#080b14] text-slate-100">
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/20 bg-slate-950/95 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} className="flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs font-bold text-slate-200 transition hover:border-amber-400/50">
            <ArrowLeft className="h-4 w-4" /> Geri
          </button>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300/70">Efsanevi Taşlar</p>
            <h1 className="font-display text-lg font-bold text-amber-100">Rekabet Ligi</h1>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs font-bold">
          <span className="inline-flex items-center gap-1.5 text-amber-300"><Coins className="h-4 w-4" />{save.gold.toLocaleString('tr-TR')}</span>
          <span className="inline-flex items-center gap-1.5 text-sky-300"><Gem className="h-4 w-4" />{save.crystals.toLocaleString('tr-TR')}</span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1380px] px-4 pb-12 pt-5 sm:px-6">
          <section
            className="league-hero relative isolate overflow-hidden rounded-2xl border border-[#b99555]/35"
            style={{ backgroundImage: `linear-gradient(90deg, rgba(7,11,25,.99) 0%, rgba(8,12,25,.87) 30%, rgba(8,12,25,.28) 72%), linear-gradient(0deg, rgba(6,9,20,.65), transparent 60%), url(${arenaArtwork})` }}
          >
            <div className="relative z-10 max-w-xl px-5 py-7 sm:px-9 sm:py-10">
              <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-amber-300">
                <span className="h-px w-8 bg-amber-400" /> Şampiyonlar Arenası
              </div>
              <h2 className="mt-3 font-display text-3xl font-bold leading-tight text-[#fff0c8] sm:text-4xl">Rekabet Ligi</h2>
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-300">Taşlarını eşleştir, arena muhafızlarını yen ve ligde yüksel.</p>
              <div className="mt-6 max-w-sm border-t border-white/10 pt-4">
                <div className="flex items-end justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="league-emblem flex h-12 w-12 items-center justify-center rounded-xl border" style={{ color: tier.color, borderColor: `${tier.color}66` }}><Trophy className="h-6 w-6" /></div>
                    <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Mevcut Kademe</p><p className="font-display text-lg font-bold" style={{ color: tier.color }}>{tier.name} Ligi</p></div>
                  </div>
                  <div className="text-right"><p className="font-display text-xl font-bold text-[#fff2cd]">{league.points.toLocaleString('tr-TR')} <span className="text-xs text-amber-300">LP</span></p><p className="text-[10px] text-slate-400">{rank}. sıra</p></div>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-700/80"><div className="h-full rounded-full bg-gradient-to-r from-amber-700 via-amber-400 to-yellow-200 transition-all duration-700" style={{ width: `${progress}%` }} /></div>
                <p className="mt-2 text-[11px] text-slate-400">{upcoming ? `${upcoming.name} için ${Math.max(0, upcoming.minPoints - league.points).toLocaleString('tr-TR')} puan daha` : 'En yüksek kademeye ulaştın.'}</p>
              </div>
            </div>
            <div className="absolute bottom-4 right-4 hidden items-center gap-2 rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-slate-300 backdrop-blur sm:flex">
              <Clock3 className="h-4 w-4 text-amber-300" /> Sezon sonu: <strong className="text-amber-100">{remainingTime(nextWeekAt(now), now)}</strong>
            </div>
          </section>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] leading-relaxed text-slate-400">
            <span>Çevrimdışı lig · Rakipler yapay zekâdır, puanlar bu cihazda saklanır.</span>
            <span>Pazartesi 00.00 UTC’de yeni sezon · {remainingTime(nextWeekAt(now), now)} kaldı</span>
          </div>

          {league.pendingRewards.length > 0 && (
            <section className="league-pending mt-5 rounded-xl border border-amber-400/35 p-4 sm:p-5">
              <div className="mb-3 flex items-center gap-2"><Gift className="h-4 w-4 text-amber-300" /><h3 className="font-display text-sm font-bold text-amber-100">Bekleyen Lig Ödüllerin</h3></div>
              <div className="space-y-2">
                {league.pendingRewards.map((reward) => (
                  <div key={reward.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-950/40 p-3">
                    <div><p className="text-xs font-bold text-white">{reward.title}</p><p className="mt-1 text-[11px] text-slate-400">{reward.description}</p></div>
                    <div className="flex items-center gap-3 text-xs font-bold"><span className="text-amber-300">{reward.gold.toLocaleString('tr-TR')} Altın</span><span className="text-sky-300">{reward.crystals} Kristal</span><button type="button" onClick={() => onClaimPending(reward.id)} className="gold-btn min-h-10 rounded-lg px-4 text-xs font-bold text-slate-950">Ödülü Al</button></div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="mt-8 grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_350px]">
            <main className="min-w-0">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div><p className="section-kicker">ARENAYA HAZIR MISIN?</p><h3 className="mt-1 font-display text-xl font-bold text-[#fff0c8]">Rakibini Seç</h3><p className="mt-1 text-xs text-slate-400">Zorluk arttıkça kazanacağın puan da artar.</p></div>
                <span className="text-xs text-slate-400">{heroClass.name} · Seviye {hero.level}</span>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {LEAGUE_OPPONENTS.map((opponent) => {
                  const stage = createLeagueStage(opponent, hero.level);
                  const weakness = GEM_INFO[opponent.weakness];
                  return (
                    <article key={opponent.id} className="league-opponent group relative flex flex-col overflow-hidden rounded-xl border border-slate-700/80 transition duration-300 hover:-translate-y-1 hover:border-amber-400/45">
                      <div className="relative h-40 overflow-hidden">
                        <img src={OPPONENT_ART[opponent.id]} alt="" className="absolute inset-0 h-full w-full object-cover object-[center_38%] transition-transform duration-500 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#141a2a] via-[#111929]/10 to-[#080e1c]/55" />
                        <div className="absolute inset-x-4 top-4 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-widest"><span style={{ color: opponent.color }}>{opponent.difficulty}</span><span className="text-slate-200/75">Yapay zekâ</span></div>
                      </div>
                      <div className="relative -mt-1 flex flex-1 flex-col px-4 pb-4">
                        <h4 className="font-display text-base font-bold text-slate-100">{opponent.name}</h4>
                        <p className="mt-0.5 text-[11px] text-slate-400">{opponent.title}</p>
                        <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-[11px]"><span className="text-slate-400">Zayıflık: <strong style={{ color: weakness.colorHex }}>{weakness.name.split(' ')[0]}</strong></span><span className="font-bold text-emerald-300">+{opponent.winPoints} LP</span></div>
                        <p className="mt-2 text-[10px] text-slate-500">Mağlubiyet -{opponent.lossPoints} LP · Zafer {stage.rewards.gold} altın</p>
                        <button type="button" onClick={() => onStartOpponent(opponent)} aria-label={`${opponent.name} ile lig düellosuna gir`} className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 text-xs font-bold text-amber-100 transition hover:bg-amber-400/20"><Swords className="h-4 w-4" /> Meydan Oku <ChevronRight className="h-3.5 w-3.5" /></button>
                      </div>
                    </article>
                  );
                })}
              </div>

              <section className="mt-8">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="section-kicker">YÜKSEL VE KAZAN</p><h3 className="mt-1 font-display text-xl font-bold text-[#fff0c8]">Kademe Ödülleri</h3><p className="mt-1 text-xs text-slate-400">Bu sezon ulaştığın her kademenin ödülünü bir kez al.</p></div><Award className="hidden h-7 w-7 text-amber-400/45 sm:block" /></div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {LEAGUE_TIERS.map((entry) => {
                    const claimed = league.claimedTiers.includes(entry.id);
                    const reached = league.seasonBattles > 0 && league.peakPoints >= entry.minPoints;
                    return (
                      <div key={entry.id} className="league-reward rounded-xl border border-slate-700/65 p-3.5">
                        <div className="flex items-center justify-between"><span className="font-display text-sm font-bold" style={{ color: entry.color }}>{entry.name}</span><Shield className="h-4 w-4" style={{ color: entry.color }} /></div>
                        <p className="mt-1 text-[10px] text-slate-500">{entry.minPoints.toLocaleString('tr-TR')} LP</p>
                        <p className="mt-3 text-[11px] font-semibold text-amber-200">{entry.reward.gold.toLocaleString('tr-TR')} Altın <span className="text-slate-600">/</span> <span className="text-sky-300">{entry.reward.crystals} Kristal</span></p>
                        <button type="button" disabled={claimed || !reached} onClick={() => onClaimTier(entry.id)} className={`mt-3 flex min-h-9 w-full items-center justify-center gap-1 rounded-lg text-[11px] font-bold transition ${claimed ? 'bg-emerald-400/10 text-emerald-300' : reached ? 'gold-btn text-slate-950' : 'cursor-not-allowed bg-slate-800/70 text-slate-500'}`}>
                          {claimed ? <><Check className="h-3.5 w-3.5" /> Alındı</> : reached ? 'Ödülü Al' : entry.minPoints === 0 && league.seasonBattles === 0 ? 'İlk düellonu tamamla' : 'Henüz açılmadı'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            </main>

            <aside className="space-y-5">
              <section className="league-side rounded-xl border border-slate-700/60 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-2"><div><p className="section-kicker">BU HAFTANIN TABLOSU</p><h3 className="mt-1 font-display text-lg font-bold text-[#fff0c8]">Lig Sıralaması</h3></div><Trophy className="h-5 w-5 text-amber-400/70" /></div>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-400">Referans rakip puanları sabittir; sıralama çevrimiçi oyuncuları göstermez.</p>
                <div className="mt-4 space-y-1">
                  {ranking.map((row, index) => (
                    <div key={row.id} className={`flex items-center gap-3 rounded-lg px-2.5 py-2.5 ${row.isPlayer ? 'border border-amber-400/25 bg-amber-400/10' : 'border border-transparent'}`}>
                      <span className={`w-5 text-center text-xs font-bold tabular-nums ${index < 3 ? 'text-amber-300' : 'text-slate-500'}`}>{index + 1}</span>
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${row.isPlayer ? 'bg-amber-300/20 text-amber-200' : 'bg-slate-800 text-slate-300'}`}>{row.name.slice(0, 1).toLocaleUpperCase('tr-TR')}</span>
                      <span className="min-w-0 flex-1"><span className={`block truncate text-xs font-bold ${row.isPlayer ? 'text-amber-100' : 'text-slate-200'}`}>{row.isPlayer ? `${row.name} (Sen)` : row.name}</span><span className="block truncate text-[10px] text-slate-500">{row.isPlayer ? 'Senin kahramanın' : 'Yapay zekâ referansı'}</span></span>
                      <span className="shrink-0 text-xs font-bold tabular-nums text-slate-300">{row.points.toLocaleString('tr-TR')} <span className="text-[9px] text-slate-500">LP</span></span>
                    </div>
                  ))}
                </div>
              </section>

              <button type="button" onClick={onOpenQuests} className="league-link group flex min-h-20 w-full items-center gap-3 rounded-xl border border-amber-400/25 p-4 text-left transition hover:border-amber-400/55">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300"><ScrollText className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-amber-100">Lig Görevleri</span><span className="mt-0.5 block text-[11px] text-slate-400">Düello yap, görev ödüllerini kazan.</span></span>
                <ArrowRight className="h-4 w-4 text-amber-300 transition group-hover:translate-x-1" />
              </button>

              <section className="league-side rounded-xl border border-slate-700/60 p-4 sm:p-5">
                <div className="flex items-center justify-between"><h3 className="font-display text-sm font-bold text-amber-100">Son Düellolar</h3><span className="text-[10px] text-slate-500">{league.wins}G / {league.losses}M</span></div>
                {league.history.length === 0 ? <p className="py-6 text-center text-xs leading-relaxed text-slate-500">Henüz düello yapmadın.<br />İlk rakibini seçerek arenaya gir.</p> : (
                  <div className="mt-3 divide-y divide-white/5">{league.history.map((match, index) => <div key={`${match.playedAt}-${index}`} className="flex items-center justify-between py-2.5 text-xs"><span className="text-slate-300">{match.opponentName} <span className="text-slate-500">· {match.forfeited ? 'Pes edildi' : match.victory ? 'Zafer' : 'Mağlubiyet'}</span></span><span className={`font-bold ${match.pointsChange > 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{match.pointsChange > 0 ? '+' : ''}{match.pointsChange} LP</span></div>)}</div>
                )}
                {league.streak > 1 && <p className="mt-3 text-[11px] font-bold text-amber-300"><Sparkles className="mr-1 inline h-3.5 w-3.5" />{league.streak} galibiyetlik seri</p>}
              </section>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}