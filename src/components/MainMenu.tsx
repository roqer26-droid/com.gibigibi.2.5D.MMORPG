import React, { useMemo } from 'react';
import {
  Play,
  Users,
  Shield,
  GitBranch,
  Map,
  ScrollText,
  Settings,
  Coins,
  Gem,
  Sparkles,
  Crown,
  Trophy,
  Award,
  type LucideIcon,
} from 'lucide-react';
import { HERO_CLASSES, HERO_CLASS_LIST } from '../data/classes';
import { QUESTS_LIST } from '../data/quests';
import { getFullSkillCodex } from '../data/skills';
import { tierFor } from '../data/league';
import { TOTAL_STAGES, WORLD_REGIONS } from '../data/world';
import { GameSaveState, StageDef } from '../types/game';
import { computeEnchantAura } from '../phaser/HeroRenderer';
import { computeHeroBuild, getQuestCurrentValue, xpRequiredForLevel } from '../utils/rpgLogic';
import { isQuestClaimed } from '../utils/questProgress';
import { HeroPaperdoll } from './HeroPaperdoll';

export type MenuDest =
  | 'heroes'
  | 'equipment'
  | 'skills'
  | 'world'
  | 'quests'
  | 'achievements'
  | 'league';

const QUEST_CATEGORIES = ['main', 'side', 'daily', 'weekly'];

interface MenuTile {
  id: MenuDest;
  label: string;
  sub: string;
  Icon: LucideIcon;
  border: string;
  iconWrap: string;
  badge?: { text: string; cls: string };
  wide?: boolean;
}

interface MainMenuProps {
  save: GameSaveState;
  isExistingSave: boolean;
  onPlayNextStage: (stage: StageDef) => void;
  onNavigate: (dest: MenuDest) => void;
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

  const claimable = useMemo(() => {
    let quests = 0;
    let achievements = 0;
    for (const q of QUESTS_LIST) {
      if (isQuestClaimed(q, save) || getQuestCurrentValue(q, save) < q.targetCount) continue;
      if (QUEST_CATEGORIES.includes(q.category)) quests += 1;
      else achievements += 1;
    }
    return { quests, achievements };
  }, [save]);

  const unlockedSpells = getFullSkillCodex(save.activeHeroClass).filter(
    (sk) => (sk.levelReq ?? 1) <= hero.level
  ).length;

  const tiles: MenuTile[] = [
    {
      id: 'world',
      label: 'Dünya Haritası',
      sub: `${save.completedStages.length}/${TOTAL_STAGES} aşama`,
      Icon: Map,
      border: 'border-emerald-500/35',
      iconWrap: 'bg-emerald-500/15 text-emerald-300',
    },
    {
      id: 'heroes',
      label: 'Kahramanlar',
      sub: `${save.heroUnlocks.length}/${HERO_CLASS_LIST.length} sınıf açık`,
      Icon: Users,
      border: 'border-rose-500/35',
      iconWrap: 'bg-rose-500/15 text-rose-300',
    },
    {
      id: 'equipment',
      label: 'Ekipman',
      sub: `${save.inventory.length} eşya çantada`,
      Icon: Shield,
      border: 'border-amber-500/35',
      iconWrap: 'bg-amber-500/15 text-amber-300',
    },
    {
      id: 'skills',
      label: 'Yetenekler',
      sub: `${unlockedSpells} büyü açık`,
      Icon: GitBranch,
      border: 'border-purple-500/35',
      iconWrap: 'bg-purple-500/15 text-purple-300',
      badge: hero.skillPoints > 0 ? { text: `${hero.skillPoints} puan`, cls: 'bg-amber-400 text-slate-950' } : undefined,
    },
    {
      id: 'quests',
      label: 'Görevler',
      sub: 'Ana, yan, günlük, haftalık',
      Icon: ScrollText,
      border: 'border-yellow-500/35',
      iconWrap: 'bg-yellow-500/15 text-yellow-300',
      badge: claimable.quests > 0 ? { text: `${claimable.quests} ödül`, cls: 'bg-rose-500 text-white' } : undefined,
    },
    {
      id: 'achievements',
      label: 'Başarımlar',
      sub: 'Başarımlar ve lig görevleri',
      Icon: Award,
      border: 'border-orange-500/35',
      iconWrap: 'bg-orange-500/15 text-orange-300',
      badge: claimable.achievements > 0 ? { text: `${claimable.achievements} ödül`, cls: 'bg-rose-500 text-white' } : undefined,
    },
    {
      id: 'league',
      label: 'Rekabet Ligi',
      sub: `${tierFor(save.league.points).name} Ligi · ${save.league.points.toLocaleString('tr-TR')} LP`,
      Icon: Trophy,
      border: 'border-amber-400/45',
      iconWrap: 'bg-amber-400/15 text-amber-300',
      badge: save.league.pendingRewards.length > 0 ? { text: `${save.league.pendingRewards.length} ödül`, cls: 'bg-rose-500 text-white' } : undefined,
      wide: true,
    },
  ];

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
          <div className="fantasy-panel flex flex-col items-center rounded-3xl p-4 text-center sm:p-5 lg:col-span-5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-[11px] font-bold text-amber-300">
              <Crown className="h-3.5 w-3.5" />
              {cls.name} • Seviye {hero.level}
            </div>

            <div className="my-2">
              <HeroPaperdoll hero={hero} size={typeof window !== "undefined" && window.innerHeight < 900 ? 120 : 190} />
            </div>

            <h1 className="font-display text-xl font-black text-white sm:text-2xl">{cls.title}</h1>
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
              className="gold-btn mt-3 flex w-full sm:mt-5 items-center justify-center gap-2.5 rounded-2xl px-6 py-4 text-base font-black text-slate-950 transition hover:scale-[1.01]"
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
            <div className="hidden text-center sm:block lg:text-left">
              <h2 className="font-display text-xl font-black tracking-tight text-white sm:text-3xl">
                Efsanevi Taşları Eşleştir,{' '}
                <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent">
                  Diyarı Kurtar!
                </span>
              </h2>
              <p className="mt-1.5 hidden text-xs leading-relaxed text-slate-300 sm:block sm:text-sm">
                Element taşlarını birleştirerek yıkıcı saldırılar yap, ekipman topla, yetenek
                ağacında ustalaş ve destansı Boss’ları alt et.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {tiles.map(({ id, label, sub, Icon, border, iconWrap, badge, wide }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onNavigate(id)}
                  className={`fantasy-card group relative flex min-h-16 items-center gap-3 rounded-2xl border p-3 text-left transition hover:border-amber-400 ${border} ${wide ? 'col-span-2 sm:col-span-3' : ''}`}
                >
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition group-hover:scale-105 ${iconWrap}`}>
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-sm font-bold text-white">{label}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-slate-400">{sub}</span>
                  </span>
                  {badge && (
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${badge.cls}`}>
                      {badge.text}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <p className="pb-2 text-center text-[10px] font-semibold tracking-wide text-slate-500">
              Sürüm v{__APP_VERSION__}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
