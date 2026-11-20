import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Award, Check, Clock3, Coins, Gem, Gift, ScrollText, Shield, Sparkles, Swords, Trophy } from 'lucide-react';
import { QUESTS_LIST } from '../data/quests';
import { RARITY_META } from '../data/skills';
import { GameSaveState, QuestCategory, QuestDef } from '../types/game';
import { nextDayAt, nextWeekAt, remainingTime } from '../utils/calendar';
import { isQuestClaimed } from '../utils/questProgress';
import { orderQuests, questGroup, type QuestGroup } from '../utils/questOrder';
import { getQuestCurrentValue } from '../utils/rpgLogic';

interface QuestsScreenProps {
  save: GameSaveState;
  onBack: () => void;
  onClaimQuest: (quest: QuestDef) => void;
  onOpenLeague: () => void;
  initialTab?: QuestCategory;
  /** 'quests': ana/yan/günlük/haftalık — 'achievements': başarımlar ve lig görevleri */
  mode?: ScreenMode;
}

export type ScreenMode = 'quests' | 'achievements';

const MODE_TABS: Record<ScreenMode, QuestCategory[]> = {
  quests: ['main', 'side', 'daily', 'weekly'],
  achievements: ['achievement', 'league'],
};

const MODE_COPY: Record<ScreenMode, { heading: string; eyebrow: string; headline: string; blurb: string; noun: string }> = {
  quests: { heading: 'Görev Günlüğü', eyebrow: 'Maceranın İzleri', headline: 'Her zafer bir hikâye yazar.', blurb: 'Görevleri tamamla, ödüllerini topla ve efsaneni güçlendir.', noun: 'Görevler' },
  achievements: { heading: 'Başarımlar', eyebrow: 'Efsanenin Şerefi', headline: 'Her dönüm noktası bir iz bırakır.', blurb: 'Uzun vadeli hedefleri ve lig başarılarını buradan takip et.', noun: 'Başarımlar' },
};

const TABS: { id: QuestCategory; label: string; icon: typeof ScrollText }[] = [
  { id: 'main', label: 'Ana Görevler', icon: ScrollText },
  { id: 'side', label: 'Yan Görevler', icon: Shield },
  { id: 'daily', label: 'Günlük', icon: Sparkles },
  { id: 'weekly', label: 'Haftalık', icon: Clock3 },
  { id: 'league', label: 'Lig Görevleri', icon: Swords },
  { id: 'achievement', label: 'Başarımlar', icon: Award },
];

const CATEGORY_COPY: Record<QuestCategory, { title: string; description: string }> = {
  main: { title: 'Efsanenin Yolculuğu', description: 'Diyarları keşfet, bossları yen ve hikâyeni yaz.' },
  side: { title: 'Macera Devam Ediyor', description: 'Kahramanını geliştirirken yeni ödüller keşfet.' },
  daily: { title: 'Günün Meydan Okumaları', description: 'Her gün yenilenen görevlerle yolculuğuna güç kat.' },
  weekly: { title: 'Haftalık Görevler', description: 'Bir hafta boyunca ilerle, büyük ödülleri topla.' },
  league: { title: 'Arena Meydan Okumaları', description: 'Lig düellolarına katıl ve kalıcı başarılar kazan.' },
  achievement: { title: 'Başarımlar', description: 'Her dönüm noktası, efsanene yeni bir iz bırakır.' },
};

export function QuestsScreen({ save, onBack, onClaimQuest, onOpenLeague, initialTab = 'main', mode = 'quests' }: QuestsScreenProps) {
  const visibleTabs = MODE_TABS[mode].map((id) => TABS.find((t) => t.id === id)!);
  const copy = MODE_COPY[mode];
  const [tab, setTab] = useState<QuestCategory>(MODE_TABS[mode].includes(initialTab) ? initialTab : MODE_TABS[mode][0]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const readyCounts = useMemo(() => {
    const counts = {} as Record<QuestCategory, number>;
    for (const item of TABS) counts[item.id] = 0;
    for (const quest of QUESTS_LIST) {
      if (!isQuestClaimed(quest, save) && getQuestCurrentValue(quest, save) >= quest.targetCount) {
        counts[quest.category]++;
      }
    }
    return counts;
  }, [save]);

  const quests = QUESTS_LIST.filter((quest) => quest.category === tab);
  // Ekranda sıralama: ödülü hazır → devam eden → ödülü alınmış (grup içi sıra korunur); durum her render'da kayıttan okunur
  const groups = orderQuests(quests, (q) =>
    questGroup(isQuestClaimed(q, save), getQuestCurrentValue(q, save), q.targetCount)
  );
  const GROUP_LABEL: Record<QuestGroup, string> = { ready: 'Ödülü hazır', active: 'Devam eden', claimed: 'Ödülü alınmış' };
  const claimedCount = quests.filter((quest) => isQuestClaimed(quest, save)).length;
  const timerText = tab === 'daily'
    ? `${remainingTime(nextDayAt(now), now)} sonra yenilenir`
    : tab === 'weekly'
      ? `${remainingTime(nextWeekAt(now), now)} sonra yenilenir`
      : null;

  return (
    <div className="flex h-full flex-col bg-[#080b14]">
      <header className="z-10 flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/20 bg-slate-950/90 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={onBack} className="flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs font-bold text-slate-200 hover:border-amber-400/50">
            <ArrowLeft className="h-4 w-4" /> Geri
          </button>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300/70">Efsanevi Taşlar</p>
            <h1 className="font-display text-lg font-bold text-amber-100">{copy.heading}</h1>
          </div>
        </div>
        {tab === 'league' && (
          <button type="button" onClick={onOpenLeague} className="flex min-h-10 items-center gap-2 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 text-xs font-bold text-amber-200 transition hover:bg-amber-500/20">
            <Trophy className="h-4 w-4" /> Rekabet Ligi <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-4 sm:px-6 sm:pt-6">
          <div className="quest-intro relative hidden overflow-hidden border-b border-amber-400/20 pb-6 sm:block sm:pb-7">
            <div className="relative z-10 max-w-xl">
              <div className="mb-3 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-amber-400/90">
                <span className="h-px w-8 bg-amber-400/70" /> {copy.eyebrow}
              </div>
              <h2 className="font-display text-2xl font-bold leading-tight text-[#fff3d0] sm:text-3xl">{copy.headline}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{copy.blurb}</p>
            </div>
            <ScrollText aria-hidden="true" className="pointer-events-none absolute right-4 top-0 hidden h-28 w-28 -rotate-12 text-amber-400/[0.07] sm:block" strokeWidth={1} />
          </div>

          <nav aria-label="Kategoriler" className="-mx-4 mt-4 flex gap-1 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            {visibleTabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                aria-pressed={tab === id}
                className={`flex min-h-11 shrink-0 items-center gap-2 rounded-lg border px-3.5 text-xs font-bold transition ${tab === id ? 'border-amber-400/60 bg-amber-400/15 text-amber-200' : 'border-transparent text-slate-400 hover:border-slate-700 hover:text-white'}`}
              >
                <Icon className="h-4 w-4" /> {label}
                {readyCounts[id] > 0 && <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] text-slate-950">{readyCounts[id]}</span>}
              </button>
            ))}
          </nav>

          <div className="mb-4 mt-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-400/70">{copy.noun} · {claimedCount}/{quests.length} ödül alındı</p>
              <h3 className="font-display text-xl font-bold text-slate-100">{CATEGORY_COPY[tab].title}</h3>
              <p className="mt-1 text-xs text-slate-400">{CATEGORY_COPY[tab].description}</p>
            </div>
            {timerText && (
              <div className="flex items-center gap-2 rounded-lg border border-sky-400/20 bg-sky-400/5 px-3 py-2 text-xs font-semibold text-sky-200">
                <Clock3 className="h-4 w-4" /> {timerText}
                <span className="text-[10px] font-normal text-slate-400">(UTC)</span>
              </div>
            )}
          </div>

          <div className="space-y-2.5">
            {groups.map(({ group, items }) => (
              <section key={group} data-testid={`quest-group-${group}`} aria-label={GROUP_LABEL[group]} className="space-y-2.5">
                <h4 className={`pt-2 text-[11px] font-extrabold uppercase tracking-[0.18em] ${group === 'ready' ? 'text-amber-300' : group === 'claimed' ? 'text-emerald-300/70' : 'text-slate-400'}`}>{GROUP_LABEL[group]} · {items.length}</h4>
            {items.map((quest) => {
              const claimed = isQuestClaimed(quest, save);
              const value = Math.min(quest.targetCount, getQuestCurrentValue(quest, save));
              const ready = !claimed && value >= quest.targetCount;
              const percent = Math.min(100, value / quest.targetCount * 100);
              return (
                <article key={quest.id} data-testid={`quest-${quest.id}`} data-state={claimed ? 'claimed' : ready ? 'ready' : 'active'} className={`quest-row rounded-xl border p-4 sm:p-5 ${ready ? 'border-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.25)]' : 'border-slate-700/50'} ${claimed ? 'opacity-70' : ''}`}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className={`hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border sm:flex ${claimed ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300' : ready ? 'border-amber-400/40 bg-amber-400/10 text-amber-300' : 'border-slate-700 bg-slate-900 text-slate-400'}`}>
                      {claimed ? <Check className="h-5 w-5" /> : tab === 'league' ? <Swords className="h-5 w-5" /> : <ScrollText className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-100">{quest.title}</h4>
                        {claimed && <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Ödül alındı</span>}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-400">{quest.description}</p>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                          <div className={`h-full rounded-full transition-all duration-500 ${claimed ? 'bg-emerald-400/70' : 'bg-gradient-to-r from-amber-600 to-amber-300'}`} style={{ width: `${percent}%` }} />
                        </div>
                        <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-300">{value.toLocaleString('tr-TR')} / {quest.targetCount.toLocaleString('tr-TR')}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold">
                        <span className="text-purple-300">+{quest.rewards.xp.toLocaleString('tr-TR')} TP</span>
                        <span className="inline-flex items-center gap-1 text-amber-300"><Coins className="h-3.5 w-3.5" /> {quest.rewards.gold.toLocaleString('tr-TR')}</span>
                        <span className="inline-flex items-center gap-1 text-sky-300"><Gem className="h-3.5 w-3.5" /> {quest.rewards.crystals.toLocaleString('tr-TR')}</span>
                        {quest.rewards.itemRarity && <span className={RARITY_META[quest.rewards.itemRarity].textClass}>{RARITY_META[quest.rewards.itemRarity].label} eşya</span>}
                      </div>
                    </div>
                    {claimed ? (
                      <span className="inline-flex min-h-10 items-center justify-center gap-1.5 text-xs font-bold text-emerald-300 sm:w-28"><Check className="h-4 w-4" /> Tamamlandı</span>
                    ) : ready ? (
                      <button type="button" onClick={() => onClaimQuest(quest)} data-testid={`claim-${quest.id}`} className="gold-btn inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-extrabold text-slate-950 shadow-[0_0_16px_rgba(251,191,36,0.45)] ring-2 ring-amber-200/60 sm:min-h-12 sm:w-36"><Gift className="h-5 w-5" /> Ödülü Al</button>
                    ) : (
                      <span className="inline-flex min-h-10 items-center justify-center text-xs font-semibold text-slate-500 sm:w-28">Devam ediyor</span>
                    )}
                  </div>
                </article>
              );
            })}
              </section>
            ))}
          </div>
          {(tab === 'daily' || tab === 'weekly') && <p className="mt-5 text-xs leading-relaxed text-slate-500">{tab === 'daily' ? 'Günlük görevler her gün 00.00 UTC’de' : 'Haftalık görevler pazartesi 00.00 UTC’de'} yenilenir. Alınmamış dönemlik görev ödülleri yenilenmeden önce toplanmalıdır.</p>}
        </div>
      </div>
    </div>
  );
}