import React, { useMemo } from 'react';
import {
  Play,
  Users,
  Shield,
  GitBranch,
  Map,
  ScrollText,
  Backpack,
  Settings,
  Coins,
  Gem,
  Sparkles,
  Crown,
  Trophy,
} from 'lucide-react';
import { HERO_CLASSES, HERO_CLASS_LIST } from '../data/classes';
import { QUESTS_LIST } from '../data/quests';
import { getFullSkillCodex } from '../data/skills';
import { tierFor } from '../data/league';
import { TOTAL_REGIONS, TOTAL_STAGES, WORLD_REGIONS } from '../data/world';
import { GameSaveState, StageDef } from '../types/game';
import { computeEnchantAura } from '../phaser/HeroRenderer';
import { computeHeroBuild, getQuestCurrentValue, xpRequiredForLevel } from '../utils/rpgLogic';
import { isQuestClaimed } from '../utils/questProgress';
import { HeroPaperdoll } from './HeroPaperdoll';

interface MainMenuProps {
  save: GameSaveState;
  isExistingSave: boolean;
  onPlayNextStage: (stage: StageDef) => void;
  onNavigate: (dest: 'heroes' | 'equipment' | 'skills' | 'world' | 'quests' | 'league') => void;
  onOpenSettings: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  save,
  isExistingSave,
  onPlayNextStage,
  onNavigate,
  onOpenSettings,
}) => {
  const hero = save.heroes[save.activeHeroClass];
  const cls = HERO_CLASSES[hero.classId];
  const build = useMemo(() => computeHeroBuild(hero), [hero]);
  const aura = useMemo(() => computeEnchantAura(hero), [hero]);
  const xpNeed = xpRequiredForLevel(hero.level);

  const allStages = useMemo(() => WORLD_REGIONS.flatMap((r) => r.stages), []);
  const nextStage = useMemo(() => {
    return (
      allStages.find((st) => !save.completedStages.includes(st.id)) ??
      allStages[allStages.length - 1]
    );
  }, [allStages, save.completedStages]);

  const claimableQuestsCount = useMemo(
    () =>
      QUESTS_LIST.filter(
        (q) => !isQuestClaimed(q, save) && getQuestCurrentValue(q, save) >= q.targetCount
      ).length,
    [save]
  );

  return (
    <div className="relative flex h-full w-full flex-col overflow-y-auto bg-[radial-gradient(ellipse_at_top,#1e1b4b_0%,#0b0e1c_55%,#05070e_100%)]">
      {/* Subtle decorative glow orbs */}
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-purple-600/15 blur-3xl" />

      {/* Top Currency & Status Bar */}
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/20 bg-slate-950/75 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-400/60 bg-gradient-to-br from-amber-500/30 to-rose-500/30 shadow-[0_0_16px_rgba(245,158,11,0.35)]">
            <Sparkles className="h-5 w-5 text-amber-300" />
          </div>
          <div>
            <div className="font-display text-sm sm:text-base font-black tracking-wide text-amber-300">
              LEGENDARY GEMS
            </div>
            <div className="text-[10px] font-semibold tracking-widest text-slate-400">
              EFSANEVİ TAŞLAR • MATCH-3 RPG
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold">
          <div className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-950/40 px-3 py-1.5 text-amber-300">
            <Coins className="h-4 w-4" />
            {save.gold.toLocaleString('tr-TR')}
          </div>
          <div className="flex items-center gap-1.5 rounded-xl border border-sky-500/30 bg-sky-950/40 px-3 py-1.5 text-sky-300">
            <Gem className="h-4 w-4" />
            {save.crystals.toLocaleString('tr-TR')}
          </div>
          <button
            type="button"
            onClick={onOpenSettings}
            className="rounded-xl border border-slate-700 bg-slate-900 p-2 text-slate-300 hover:border-amber-400/50 hover:text-white"
            title="Ayarlar"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center gap-6 p-4 sm:p-6">
        <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
          {/* Left: Hero Showcase + Title */}
          <div className="fantasy-panel flex flex-col items-center rounded-3xl p-5 text-center lg:col-span-5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-[11px] font-bold text-amber-300">
              <Crown className="h-3.5 w-3.5" />
              {cls.name} • Seviye {hero.level}
            </div>

            <div className="my-2">
              <HeroPaperdoll hero={hero} size={typeof window !== "undefined" && window.innerHeight < 720 ? 150 : 190} />
            </div>

            <h1 className="font-display text-2xl font-black text-white">{cls.title}</h1>
            <p className="mt-0.5 text-xs font-bold text-amber-300">
              Savaş Gücü: {build.powerRating.toLocaleString('tr-TR')}
            </p>
            {aura.tier > 0 ? (
              <span
                className="mt-1.5 inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold"
                style={{
                  color: aura.color,
                  borderColor: `${aura.color}77`,
                  background: `${aura.color}18`,
                  boxShadow: `0 0 12px ${aura.color}44`,
                }}
              >
                ✦ Büyü Aurası: {aura.tierName} (+{aura.total})
              </span>
            ) : (
              <span className="mt-1.5 inline-block rounded-full border border-slate-700 bg-slate-900/70 px-2.5 py-0.5 text-[10px] font-semibold text-slate-400">
                Ekipmanlarını geliştirerek aura kazan
              </span>
            )}

            {/* XP Progress */}
            <div className="mt-3 w-full max-w-xs">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Tecrübe (TP)</span>
                <span>
                  {hero.xp} / {xpNeed}
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-300"
                  style={{ width: `${Math.min(100, (hero.xp / xpNeed) * 100)}%` }}
                />
              </div>
            </div>

            {/* Primary Play / Continue Button */}
            <button
              type="button"
              onClick={() => onPlayNextStage(nextStage)}
              className="gold-btn mt-5 flex w-full items-center justify-center gap-2.5 rounded-2xl px-6 py-4 text-base font-black text-slate-950 transition hover:scale-[1.01]"
            >
              <Play className="h-5 w-5 fill-slate-950" />
              {isExistingSave && save.completedStages.length > 0 ? 'OYUNA DEVAM ET' : 'OYNA'}
            </button>
            <p className="mt-2 text-[11px] text-slate-400">
              Sıradaki Aşama: <strong className="text-slate-200">{nextStage.name}</strong>
            </p>
          </div>

          {/* Right: Menu Grid */}
          <div className="flex flex-col gap-4 lg:col-span-7">
            <div className="text-center lg:text-left">
              <h2 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-white">
                Efsanevi Taşları Eşleştir,{' '}
                <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent">
                  Diyarı Kurtar!
                </span>
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-slate-300">
                Element taşlarını birleştirerek yıkıcı saldırılar yap, ekipman topla, yetenek
                ağacında ustalaş ve destansı Boss’ları alt et.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => onNavigate('world')}
                className="fantasy-card group flex flex-col items-start justify-between rounded-2xl border border-emerald-500/35 p-4 text-left transition hover:border-amber-400"
              >
                <div className="rounded-xl bg-emerald-500/15 p-2.5 text-emerald-300 group-hover:scale-110 transition">
                  <Map className="h-6 w-6" />
                </div>
                <div className="mt-3">
                  <div className="font-display text-sm font-bold text-white">Dünya Haritası</div>
                  <div className="mt-0.5 text-[11px] text-slate-400">
                    {save.completedStages.length}/{TOTAL_STAGES} Aşama • {TOTAL_REGIONS} Bölge
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('heroes')}
                className="fantasy-card group flex flex-col items-start justify-between rounded-2xl border border-rose-500/35 p-4 text-left transition hover:border-amber-400"
              >
                <div className="rounded-xl bg-rose-500/15 p-2.5 text-rose-300 group-hover:scale-110 transition">
                  <Users className="h-6 w-6" />
                </div>
                <div className="mt-3">
                  <div className="font-display text-sm font-bold text-white">Kahramanlar</div>
                  <div className="mt-0.5 text-[11px] text-slate-400">
                    {save.heroUnlocks.length}/{HERO_CLASS_LIST.length} Sınıf Açık
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('equipment')}
                className="fantasy-card group flex flex-col items-start justify-between rounded-2xl border border-amber-500/35 p-4 text-left transition hover:border-amber-400"
              >
                <div className="rounded-xl bg-amber-500/15 p-2.5 text-amber-300 group-hover:scale-110 transition">
                  <Shield className="h-6 w-6" />
                </div>
                <div className="mt-3">
                  <div className="font-display text-sm font-bold text-white">Ekipman</div>
                  <div className="mt-0.5 text-[11px] text-slate-400">10 Yuva & Görünüm</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('skills')}
                className="fantasy-card group relative flex flex-col items-start justify-between rounded-2xl border border-purple-500/35 p-4 text-left transition hover:border-amber-400"
              >
                {hero.skillPoints > 0 && (
                  <span className="absolute right-3 top-3 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-slate-950 animate-bounce">
                    {hero.skillPoints} Puan!
                  </span>
                )}
                <div className="rounded-xl bg-purple-500/15 p-2.5 text-purple-300 group-hover:scale-110 transition">
                  <GitBranch className="h-6 w-6" />
                </div>
                <div className="mt-3">
                  <div className="font-display text-sm font-bold text-white">Yetenekler</div>
                  <div className="mt-0.5 text-[11px] text-slate-400">
                    12 Düğüm •{' '}
                    {getFullSkillCodex(save.activeHeroClass).filter(
                      (s) => (s.levelReq ?? 1) <= hero.level
                    ).length}{' '}
                    Büyü Açık
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('equipment')}
                className="fantasy-card group flex flex-col items-start justify-between rounded-2xl border border-sky-500/35 p-4 text-left transition hover:border-amber-400"
              >
                <div className="rounded-xl bg-sky-500/15 p-2.5 text-sky-300 group-hover:scale-110 transition">
                  <Backpack className="h-6 w-6" />
                </div>
                <div className="mt-3">
                  <div className="font-display text-sm font-bold text-white">Envanter</div>
                  <div className="mt-0.5 text-[11px] text-slate-400">
                    {save.inventory.length} Eşya Çantada
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('quests')}
                className="fantasy-card group relative flex flex-col items-start justify-between rounded-2xl border border-yellow-500/35 p-4 text-left transition hover:border-amber-400"
              >
                {claimableQuestsCount > 0 && (
                  <span className="absolute right-3 top-3 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-black text-white animate-pulse">
                    {claimableQuestsCount} Ödül!
                  </span>
                )}
                <div className="rounded-xl bg-yellow-500/15 p-2.5 text-yellow-300 group-hover:scale-110 transition">
                  <ScrollText className="h-6 w-6" />
                </div>
                <div className="mt-3">
                  <div className="font-display text-sm font-bold text-white">Görevler</div>
                  <div className="mt-0.5 text-[11px] text-slate-400">Günlük, Haftalık & Lig</div>
                </div>
              </button>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('league')}
              className="fantasy-card group flex min-h-20 items-center justify-between gap-3 rounded-2xl border border-amber-400/40 px-4 py-3 text-left transition hover:border-amber-300"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300"><Trophy className="h-6 w-6" /></span>
                <span>
                  <span className="block font-display text-sm font-bold text-amber-100">Rekabet Ligi</span>
                  <span className="mt-1 block text-[11px] text-slate-400">{tierFor(save.league.points).name} Ligi · {save.league.points.toLocaleString('tr-TR')} LP · Yapay zekâ rakipleri</span>
                </span>
              </span>
              <span className="shrink-0 text-xs font-bold text-amber-300">{save.league.pendingRewards.length ? `${save.league.pendingRewards.length} ödül` : 'Arenaya Git'} →</span>
            </button>

            {/* Settings wide card */}
            <button
              type="button"
              onClick={onOpenSettings}
              className="fantasy-card flex items-center justify-between rounded-2xl border border-slate-700/70 px-4 py-3 text-left transition hover:border-amber-400/60"
            >
              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5 text-slate-300" />
                <div>
                  <div className="text-sm font-bold text-white">Ayarlar, Kayıt ve Taş Rehberi</div>
                  <div className="text-[11px] text-slate-400">
                    Müzik/Efekt sesleri, otomatik kayıt ve oyun kuralları
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold text-amber-300">Aç →</span>
            </button>

            <p className="pb-2 text-center text-[10px] font-semibold tracking-wide text-slate-500">
              Sürüm v{__APP_VERSION__}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
