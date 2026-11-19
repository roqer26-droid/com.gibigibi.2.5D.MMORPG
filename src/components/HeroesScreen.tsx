import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Swords,
  GitBranch,
  Lock,
  Coins,
  Gem,
  Flame,
  X,
  Maximize2,
} from 'lucide-react';
import { HERO_CLASSES, HERO_CLASS_LIST } from '../data/classes';
import { GameSaveState, HeroClassId } from '../types/game';
import { computeEnchantAura } from '../phaser/HeroRenderer';
import { computeHeroBuild, xpRequiredForLevel } from '../utils/rpgLogic';
import { HeroPaperdoll } from './HeroPaperdoll';

interface HeroesScreenProps {
  save: GameSaveState;
  onBack: () => void;
  onSelectHero: (classId: HeroClassId) => void;
  onUnlockHero: (classId: HeroClassId) => void;
  onOpenSkillTree: () => void;
}

export const HeroesScreen: React.FC<HeroesScreenProps> = ({
  save,
  onBack,
  onSelectHero,
  onUnlockHero,
  onOpenSkillTree,
}) => {
  const [inspectId, setInspectId] = useState<HeroClassId>(save.activeHeroClass);
  /** Kart tıklanınca açılan tam ekran kahraman görünümü (tekrar basınca kapanır) */
  const [expandedId, setExpandedId] = useState<HeroClassId | null>(null);

  const toggleExpand = (classId: HeroClassId) => {
    setInspectId(classId);
    setExpandedId((cur) => (cur === classId ? null : classId));
  };

  useEffect(() => {
    if (!expandedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpandedId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expandedId]);

  /** Tek parça detay görünümü: yan panelde ve açılır ekranda aynı içerik kullanılır */
  const HeroDetail: React.FC<{ id: HeroClassId; inModal?: boolean }> = ({ id, inModal }) => {
    const hero = save.heroes[id];
    const cls = HERO_CLASSES[id];
    const build = computeHeroBuild(hero);
    const aura = computeEnchantAura(hero);
    const xpNeeded = xpRequiredForLevel(hero.level);
    const isActive = save.activeHeroClass === id;
    const isUnlocked = save.heroUnlocks.includes(id);
    const canAfford =
      !cls.unlockCost ||
      (save.gold >= cls.unlockCost.gold && save.crystals >= cls.unlockCost.crystals);

    const chooseHero = () => {
      if (!isUnlocked) return;
      onSelectHero(id);
      if (inModal) setExpandedId(null);
    };

    return (
      <div
        className={`fantasy-panel flex flex-col rounded-2xl ${inModal ? 'border-2 p-4 sm:p-6' : 'p-5'}`}
        style={inModal ? { borderColor: `${cls.themeColor}66` } : undefined}
      >
        <div className={`flex flex-col items-center gap-5 ${inModal ? '' : 'sm:flex-row'}`}>
          <div
            className="relative flex flex-col items-center rounded-2xl border p-3"
            style={{
              borderColor: `${cls.themeColor}55`,
              background: `radial-gradient(circle at center, ${cls.themeColor}22, rgba(10,12,24,0.95))`,
            }}
          >
            {inModal ? (
              <>
                <button
                  type="button"
                  onClick={() => setExpandedId(null)}
                  aria-label="Kapatmak için kahramana dokun"
                  className="rounded-2xl transition active:scale-95"
                  title="Kapatmak için kahramana tekrar dokun"
                >
                  <HeroPaperdoll hero={hero} size={200} />
                </button>
                <span className="mt-1 rounded-full border border-slate-700 bg-slate-900/80 px-2.5 py-0.5 text-[10px] font-semibold text-slate-400">
                  Kapatmak için kahramana tekrar dokun ✕
                </span>
              </>
            ) : (
              <HeroPaperdoll hero={hero} size={230} />
            )}
          </div>

          <div className={`min-w-0 flex-1 ${inModal ? 'text-center sm:text-left' : 'text-center sm:text-left'}`}>
            <div className={`flex flex-wrap items-center justify-center gap-2 ${inModal ? 'sm:justify-start' : 'sm:justify-start'}`}>
              <span
                className="rounded-full border px-2.5 py-0.5 text-[11px] font-bold"
                style={{
                  borderColor: `${cls.themeColor}77`,
                  background: `${cls.themeColor}1a`,
                  color: cls.themeColor,
                }}
              >
                {cls.name} Sınıfı
              </span>
              {aura.tier > 0 && (
                <span
                  className="rounded-full border px-2.5 py-0.5 text-[11px] font-bold"
                  style={{
                    borderColor: `${aura.color}77`,
                    background: `${aura.color}18`,
                    color: aura.color,
                  }}
                >
                  ✦ {aura.tierName}
                </span>
              )}
              {!isUnlocked && (
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-600 bg-slate-900 px-2.5 py-0.5 text-[11px] font-bold text-slate-300">
                  <Lock className="h-3 w-3" /> Kilitli
                </span>
              )}
            </div>

            <h2 className="mt-1.5 font-display text-2xl font-extrabold text-white">{cls.title}</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">{cls.roleDesc}</p>

            {/* Büyü Aurası */}
            <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/70 p-2.5">
              <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] font-bold">
                <span className="flex items-center gap-1 text-amber-300">
                  <Flame className="h-3.5 w-3.5" />
                  Büyü Aurası: {aura.tierName}
                </span>
                <span className="text-slate-400">
                  {aura.enchantedCount} eşya geliştirildi • toplam +{aura.total}
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max(4, aura.intensity * 100)}%`,
                    background: `linear-gradient(90deg, #7dd3fc, ${aura.color})`,
                    boxShadow: aura.tier >= 3 ? `0 0 12px ${aura.color}` : 'none',
                  }}
                />
              </div>
              <p className="mt-1 text-[10px] text-slate-400">{aura.tierDesc}</p>
            </div>

            {/* Seviye & TP */}
            <div className="mt-3">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-amber-300">Seviye {hero.level}</span>
                <span className="text-slate-400">
                  {hero.xp} / {xpNeeded} TP
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-300"
                  style={{ width: `${Math.min(100, (hero.xp / xpNeeded) * 100)}%` }}
                />
              </div>
            </div>

            {/* Özet istatistikler */}
            <div className={`mt-4 grid gap-2 text-center ${inModal ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-4'}`}>
              <div className="rounded-xl bg-slate-900/80 p-2">
                <div className="text-[10px] text-slate-400">Can</div>
                <div className="text-sm font-bold text-emerald-400">
                  {build.stats.health.toLocaleString('tr-TR')}
                </div>
              </div>
              <div className="rounded-xl bg-slate-900/80 p-2">
                <div className="text-[10px] text-slate-400">Saldırı</div>
                <div className="text-sm font-bold text-rose-400">{build.stats.attack}</div>
              </div>
              <div className="rounded-xl bg-slate-900/80 p-2">
                <div className="text-[10px] text-slate-400">Savunma</div>
                <div className="text-sm font-bold text-amber-300">{build.stats.defense}</div>
              </div>
              <div className="rounded-xl bg-slate-900/80 p-2">
                <div className="text-[10px] text-slate-400">Kritik</div>
                <div className="text-sm font-bold text-yellow-300">%{build.stats.critChance}</div>
              </div>
              {inModal && (
                <>
                  <div className="rounded-xl bg-slate-900/80 p-2">
                    <div className="text-[10px] text-slate-400">Kritik Hasar</div>
                    <div className="text-sm font-bold text-orange-300">%{build.stats.critDamage}</div>
                  </div>
                  <div className="rounded-xl bg-slate-900/80 p-2">
                    <div className="text-[10px] text-slate-400">Mana</div>
                    <div className="text-sm font-bold text-sky-400">{build.stats.mana}</div>
                  </div>
                  <div className="rounded-xl bg-slate-900/80 p-2">
                    <div className="text-[10px] text-slate-400">Sıyrılma</div>
                    <div className="text-sm font-bold text-cyan-300">%{build.stats.dodge}</div>
                  </div>
                  <div className="rounded-xl bg-slate-900/80 p-2">
                    <div className="text-[10px] text-slate-400">Elemental</div>
                    <div className="text-sm font-bold text-purple-300">
                      +%{build.stats.elementalDamage}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Pasif + Ulti */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-sky-500/30 bg-sky-950/30 p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-sky-300">
              <Sparkles className="h-4 w-4" />
              Sınıf Pasifi: {cls.passiveName}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">{cls.passiveDesc}</p>
          </div>
          <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
              <Swords className="h-4 w-4" />
              Ulti: {cls.ultimateSkill.name}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">
              {cls.ultimateSkill.description}
            </p>
          </div>
        </div>

        {/* Eylemler */}
        <div className={`mt-5 flex flex-wrap items-center gap-3 ${inModal ? '' : ''}`}>
          {!isUnlocked ? (
            <button
              type="button"
              disabled={!canAfford}
              onClick={() => {
                onUnlockHero(id);
                if (inModal && canAfford) setExpandedId(null);
              }}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-4 py-3 text-sm font-extrabold transition ${
                canAfford
                  ? 'gold-btn text-slate-950'
                  : 'cursor-not-allowed border border-slate-700 bg-slate-900 text-slate-500'
              }`}
            >
              <span className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Kahramanı Aç
              </span>
              {cls.unlockCost && (
                <span className="text-[11px] font-bold opacity-90">
                  {cls.unlockCost.gold.toLocaleString('tr-TR')} Altın +{' '}
                  {cls.unlockCost.crystals.toLocaleString('tr-TR')} Kristal
                </span>
              )}
              {cls.unlockCost && !canAfford && (
                <span className="text-[10px] font-semibold text-rose-300">
                  Eksik:{' '}
                  {Math.max(0, cls.unlockCost.gold - save.gold).toLocaleString('tr-TR')} Altın
                  {' • '}
                  {Math.max(0, cls.unlockCost.crystals - save.crystals).toLocaleString('tr-TR')}{' '}
                  Kristal
                </span>
              )}
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={isActive}
                onClick={chooseHero}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-extrabold transition ${
                  isActive
                    ? 'cursor-default border border-emerald-500/40 bg-emerald-950/50 text-emerald-300'
                    : 'gold-btn text-slate-950'
                }`}
              >
                {isActive ? 'Şu An Seçili Kahraman' : `${cls.name} Olarak Seç`}
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectHero(id);
                  onOpenSkillTree();
                }}
                className="flex items-center gap-2 rounded-xl border border-purple-400/50 bg-purple-950/50 px-4 py-3 text-sm font-bold text-purple-200 hover:bg-purple-900/60"
              >
                <GitBranch className="h-4 w-4" />
                Yetenek Ağacı ({hero.skillPoints} Puan)
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col bg-[#080b14]">
      <header className="flex items-center justify-between border-b border-amber-500/20 bg-slate-950/90 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-200 hover:border-amber-400/50"
          >
            <ArrowLeft className="h-4 w-4" />
            Geri
          </button>
          <div>
            <h1 className="font-display text-lg font-bold text-amber-300">Kahraman Sınıfları</h1>
            <p className="text-[11px] text-slate-400">
              {HERO_CLASS_LIST.length} kahraman • {save.heroUnlocks.length} açık • karta dokunup
              detayları incele
            </p>
          </div>
        </div>
        <div className="hidden items-center gap-2 text-xs font-bold sm:flex">
          <span className="flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-950/35 px-2.5 py-1 text-amber-300">
            <Coins className="h-3.5 w-3.5" />
            {save.gold.toLocaleString('tr-TR')}
          </span>
          <span className="flex items-center gap-1 rounded-lg border border-sky-500/30 bg-sky-950/35 px-2.5 py-1 text-sky-300">
            <Gem className="h-3.5 w-3.5" />
            {save.crystals.toLocaleString('tr-TR')}
          </span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Sınıf kartları — dokununca açılır */}
          <div className="grid grid-cols-2 gap-2.5 lg:col-span-5">
            {HERO_CLASS_LIST.map((c) => {
              const prog = save.heroes[c.id];
              const cBuild = computeHeroBuild(prog);
              const cAura = computeEnchantAura(prog);
              const selected = inspectId === c.id;
              const active = save.activeHeroClass === c.id;
              const locked = !save.heroUnlocks.includes(c.id);
              const open = expandedId === c.id;

              return (
                <button
                  key={c.id}
                  type="button"
                  aria-expanded={open}
                  onClick={() => toggleExpand(c.id)}
                  className={`fantasy-card relative overflow-hidden rounded-2xl border-2 p-2.5 text-left transition ${
                    selected || open
                      ? 'border-amber-400 bg-amber-950/25 shadow-[0_0_20px_rgba(245,158,11,0.22)]'
                      : 'border-slate-800 hover:border-slate-600'
                  } ${locked ? 'opacity-80' : ''}`}
                >
                  <span className="absolute inset-x-0 top-0 h-1" style={{ background: c.themeColor }} />

                  <div className="flex flex-col items-center gap-1.5 text-center sm:flex-row sm:gap-2.5 sm:text-left">
                    <div className="relative shrink-0">
                      <HeroPaperdoll hero={prog} size={64} staticRender={!selected && !open} />
                      {locked && (
                        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-950/70">
                          <Lock className="h-5 w-5 text-slate-300" />
                        </span>
                      )}
                    </div>
                    <div className="w-full min-w-0 sm:flex-1">
                      <div className="flex items-center justify-center gap-1.5 sm:justify-start">
                        <span className="truncate font-display text-sm font-bold text-white">
                          {c.name}
                        </span>
                        {!locked && (
                          <span className="shrink-0 rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold text-amber-300">
                            Sv.{prog.level}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-[10px] text-slate-400">{c.title}</p>
                      {locked && c.unlockCost ? (
                        <p className="mt-0.5 flex items-center justify-center gap-1.5 text-[10px] font-bold text-amber-300 sm:justify-start">
                          <Coins className="h-3 w-3" />
                          {c.unlockCost.gold.toLocaleString('tr-TR')}
                          <Gem className="ml-1 h-3 w-3 text-sky-300" />
                          {c.unlockCost.crystals}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-[10px] font-semibold text-amber-200/80">
                          Güç {cBuild.powerRating.toLocaleString('tr-TR')}
                          {cAura.tier > 0 && (
                            <span style={{ color: cAura.color }}> • ✦ {cAura.tierName}</span>
                          )}
                        </p>
                      )}
                      <div className="mt-1 flex items-center justify-center gap-1.5 sm:justify-start">
                        {active && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">
                            <CheckCircle2 className="h-2.5 w-2.5" /> Aktif
                          </span>
                        )}
                        <span className="hidden items-center gap-1 rounded-full bg-slate-800/80 px-1.5 py-0.5 text-[9px] font-bold text-slate-400 sm:inline-flex">
                          <Maximize2 className="h-2.5 w-2.5" />
                          Detay için dokun
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Masaüstü yan paneli */}
          <div className="hidden lg:col-span-7 lg:block">
            <HeroDetail id={inspectId} />
          </div>
        </div>
      </div>

      {/* KAHRAMAN DETAY — tam ekran açılır görünüm (mobilde rahat seçim için) */}
      {expandedId && (
        <div
          className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/75 p-2 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`${HERO_CLASSES[expandedId].name} kahraman detayı`}
        >
          <button
            type="button"
            aria-label="Kahraman detayını kapat"
            onClick={() => setExpandedId(null)}
            className="absolute inset-0 h-full w-full cursor-default"
          >
            <span className="sr-only">Kapat</span>
          </button>
          <div className="animate-pop-scale relative z-10 flex max-h-[calc(100dvh-1rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-amber-400/25 bg-[#0b0f1c]/95 sm:max-h-[92dvh]">
            <div className="flex items-center justify-between gap-3 px-3 pb-2 pt-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300/80">
                  Kahraman Detayı
                </p>
                <h3 className="truncate font-display text-lg font-bold text-white">
                  {HERO_CLASSES[expandedId].title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setExpandedId(null)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-600 bg-slate-900/90 text-slate-200 hover:border-amber-400/60 hover:text-white"
                aria-label="Kapat (Esc)"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto pb-4">
              <HeroDetail id={expandedId} inModal />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
