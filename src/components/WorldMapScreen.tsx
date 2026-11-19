import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Crown,
  Gem,
  Lock,
  Skull,
  Swords,
  Coins,
  ShieldAlert,
} from 'lucide-react';
import { GEM_INFO, RARITY_META } from '../data/skills';
import { WORLD_REGIONS } from '../data/world';
import { GameSaveState, RegionId, StageDef } from '../types/game';

interface WorldMapScreenProps {
  save: GameSaveState;
  onBack: () => void;
  onStartStage: (stage: StageDef) => void;
}

export const WorldMapScreen: React.FC<WorldMapScreenProps> = ({ save, onBack, onStartStage }) => {
  const allStages = useMemo(() => WORLD_REGIONS.flatMap((r) => r.stages), []);

  // Determine furthest unlocked stage
  const isStageUnlocked = (stageId: string): boolean => {
    const idx = allStages.findIndex((s) => s.id === stageId);
    if (idx <= 0) return true;
    return save.completedStages.includes(allStages[idx - 1].id);
  };

  // Default to latest unlocked uncompleted stage
  const defaultStage = useMemo(() => {
    const next = allStages.find((s) => !save.completedStages.includes(s.id) && isStageUnlocked(s.id));
    return next ?? allStages[allStages.length - 1];
  }, [allStages, save.completedStages]);

  const [selectedRegion, setSelectedRegion] = useState<RegionId>(defaultStage.regionId);
  const [selectedStage, setSelectedStage] = useState<StageDef>(defaultStage);

  const activeRegion = WORLD_REGIONS.find((r) => r.id === selectedRegion) ?? WORLD_REGIONS[0];
  const hero = save.heroes[save.activeHeroClass];
  const unlocked = isStageUnlocked(selectedStage.id);
  const completed = save.completedStages.includes(selectedStage.id);

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
          <div className="min-w-[190px]">
            <h1 className="font-display text-lg font-bold text-amber-300">Dünya Haritası</h1>
            <p className="text-[11px] text-slate-400">
              {WORLD_REGIONS.length} Efsanevi Bölge • {allStages.length} Aşama
            </p>
            <div className="mt-1 h-1.5 w-40 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-300"
                style={{
                  width: `${(save.completedStages.length / Math.max(1, allStages.length)) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-slate-900 px-3 py-1.5 text-xs font-bold text-amber-200">
          Kahraman Sv.{hero.level}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-3 sm:p-5">
        <div className="mx-auto max-w-6xl space-y-5">
          {/* Hızlı ilerleme çubuğu */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2">
            <span className="text-xs text-slate-400">
              {WORLD_REGIONS.length} Bölge sırayla açılır — tamamladığın aşamaları tekrar
              oynayarak seviye ve ganimet kasabilirsin.
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedRegion(defaultStage.regionId);
                setSelectedStage(defaultStage);
              }}
              className="shrink-0 rounded-xl border border-amber-400/50 bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-500/25"
            >
              Sıradaki Aşamaya Git →
            </button>
          </div>

          {/* Region Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {WORLD_REGIONS.map((reg, idx) => {
              const firstUnlocked = isStageUnlocked(reg.stages[0].id);
              const clearedCount = reg.stages.filter((s) =>
                save.completedStages.includes(s.id)
              ).length;
              const active = selectedRegion === reg.id;

              return (
                <button
                  key={reg.id}
                  type="button"
                  onClick={() => {
                    setSelectedRegion(reg.id);
                    const target =
                      reg.stages.find((s) => !save.completedStages.includes(s.id)) ??
                      reg.stages[reg.stages.length - 1];
                    setSelectedStage(target);
                  }}
                  className={`flex min-w-[165px] flex-col rounded-2xl border-2 p-3 text-left transition ${
                    active
                      ? 'border-amber-400 bg-slate-900 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                      : 'border-slate-800 bg-slate-950/80 hover:border-slate-600'
                  } ${!firstUnlocked ? 'opacity-65' : ''}`}
                >
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className="text-amber-300">Bölge {idx + 1}</span>
                    <span className="text-slate-400">{reg.levelRange}</span>
                  </div>
                  <div className="mt-1 font-display text-sm font-bold text-white">{reg.name}</div>
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      {clearedCount}/{reg.stages.length} Tamamlandı
                    </span>
                    {!firstUnlocked && <Lock className="h-3.5 w-3.5 text-slate-500" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Connected Map Path + Stage Details */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* Connected Progression Path */}
            <div
              className={`fantasy-panel relative overflow-hidden rounded-2xl bg-gradient-to-br ${activeRegion.bgGradient} p-5 lg:col-span-7`}
            >
              <div className="mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  {activeRegion.subtitle}
                </span>
                <h2 className="font-display text-2xl font-extrabold text-white">
                  {activeRegion.name}
                </h2>
                <p className="mt-1 text-xs text-slate-300">{activeRegion.description}</p>
              </div>

              {/* Connected Nodes */}
              <div className="relative flex flex-col gap-3.5 py-2">
                {activeRegion.stages.map((st, idx) => {
                  const stUnlocked = isStageUnlocked(st.id);
                  const stDone = save.completedStages.includes(st.id);
                  const isSel = selectedStage.id === st.id;

                  const typeTag =
                    st.type === 'boss'
                      ? { label: 'BÖLGE BOSSU', cls: 'bg-rose-500/25 text-rose-300 border-rose-500/40' }
                      : st.type === 'elite'
                        ? { label: 'ELİT', cls: 'bg-purple-500/25 text-purple-300 border-purple-500/40' }
                        : st.type === 'treasure'
                          ? { label: 'HAZİNE', cls: 'bg-amber-500/25 text-amber-300 border-amber-500/40' }
                          : { label: 'NORMAL', cls: 'bg-slate-700/60 text-slate-300 border-slate-600' };

                  return (
                    <div key={st.id} className="relative flex items-center gap-3">
                      {idx < activeRegion.stages.length - 1 && (
                        <div className="absolute left-6 top-12 h-6 w-0.5 bg-amber-500/45" />
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedStage(st)}
                        className={`flex w-full items-center gap-3.5 rounded-2xl border-2 p-3 text-left transition ${
                          isSel
                            ? 'border-amber-300 bg-slate-950/90 shadow-[0_0_20px_rgba(251,191,36,0.28)]'
                            : stUnlocked
                              ? 'border-slate-700/80 bg-slate-950/65 hover:border-amber-500/50'
                              : 'border-slate-800/60 bg-slate-950/45 opacity-60'
                        }`}
                      >
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 ${
                            stDone
                              ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                              : !stUnlocked
                                ? 'border-slate-700 bg-slate-900 text-slate-500'
                                : st.type === 'boss'
                                  ? 'border-rose-500 bg-rose-500/25 text-rose-300'
                                  : st.type === 'treasure'
                                    ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                                    : 'border-sky-400 bg-sky-500/20 text-sky-300'
                          }`}
                        >
                          {stDone ? (
                            <Check className="h-6 w-6" />
                          ) : !stUnlocked ? (
                            <Lock className="h-5 w-5" />
                          ) : st.type === 'boss' ? (
                            <Crown className="h-6 w-6" />
                          ) : st.type === 'treasure' ? (
                            <Gem className="h-6 w-6" />
                          ) : st.type === 'elite' ? (
                            <Skull className="h-6 w-6" />
                          ) : (
                            <Swords className="h-5 w-5" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${typeTag.cls}`}>
                              {typeTag.label}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-400">
                              Önerilen Sv.{st.recommendedLevel}
                            </span>
                          </div>
                          <div className="mt-0.5 truncate font-display text-sm sm:text-base font-bold text-white">
                            {st.name}
                          </div>
                          <div className="text-xs text-slate-400">
                            Düşman: {st.enemy.name} ({st.enemy.maxHp.toLocaleString('tr-TR')} Can)
                          </div>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Stage Detail Card */}
            <div className="fantasy-panel flex flex-col justify-between rounded-2xl p-5 lg:col-span-5">
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-0.5 text-[11px] font-bold text-amber-300">
                    Aşama {selectedStage.stageNumber} / {activeRegion.stages.length}
                  </span>
                  {completed && (
                    <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                      Tamamlandı ✓
                    </span>
                  )}
                </div>

                <h3 className="mt-2 font-display text-xl font-extrabold text-white">
                  {selectedStage.name}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">
                  {selectedStage.description}
                </p>

                {/* Enemy Info Box */}
                <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/75 p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm font-bold text-rose-300">
                      {selectedStage.enemy.name}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      Sv.{selectedStage.enemy.level}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-slate-900 p-2">
                      <div className="text-[10px] text-slate-400">Can</div>
                      <div className="font-bold text-rose-400">
                        {selectedStage.enemy.maxHp.toLocaleString('tr-TR')}
                      </div>
                    </div>
                    <div className="rounded-lg bg-slate-900 p-2">
                      <div className="text-[10px] text-slate-400">Saldırı</div>
                      <div className="font-bold text-orange-300">{selectedStage.enemy.attack}</div>
                    </div>
                    <div className="rounded-lg bg-slate-900 p-2">
                      <div className="text-[10px] text-slate-400">Savunma</div>
                      <div className="font-bold text-slate-200">{selectedStage.enemy.defense}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs">
                    <span className="text-slate-400">Element Zayıflığı:</span>
                    <span
                      className={`rounded border px-2 py-0.5 font-bold ${
                        GEM_INFO[selectedStage.enemy.weakness].badgeBg
                      }`}
                    >
                      {GEM_INFO[selectedStage.enemy.weakness].name} (+%45 Hasar)
                    </span>
                  </div>

                  {selectedStage.enemy.abilities.length > 0 && (
                    <div className="text-xs text-slate-300">
                      <span className="flex items-center gap-1 font-bold text-amber-300">
                        <ShieldAlert className="h-3.5 w-3.5" /> Özel Yetenekler:
                      </span>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {selectedStage.enemy.abilities.map((ab) => (
                          <span
                            key={ab}
                            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-0.5 text-[11px]"
                          >
                            {ab}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Stage Rewards */}
                <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-950/20 p-3.5">
                  <div className="text-xs font-bold text-amber-300">Zafer Ödülleri</div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-semibold">
                    <span className="text-purple-300">+{selectedStage.rewards.xp} TP</span>
                    <span className="flex items-center gap-1 text-amber-300">
                      <Coins className="h-3.5 w-3.5" />+{selectedStage.rewards.gold} Altın
                    </span>
                    <span className="flex items-center gap-1 text-sky-300">
                      <Gem className="h-3.5 w-3.5" />+{selectedStage.rewards.crystals} Kristal
                    </span>
                  </div>
                  {selectedStage.rewards.guaranteedRarity && (
                    <p className="mt-1.5 text-xs font-bold">
                      Garanti Ganimet:{' '}
                      <span className={RARITY_META[selectedStage.rewards.guaranteedRarity].textClass}>
                        {RARITY_META[selectedStage.rewards.guaranteedRarity].label} Ekipman!
                      </span>
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                disabled={!unlocked}
                onClick={() => onStartStage(selectedStage)}
                className="gold-btn mt-5 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-base font-extrabold text-slate-950 disabled:opacity-45 disabled:cursor-not-allowed"
              >
                {unlocked ? (
                  <>
                    <Swords className="h-5 w-5" />
                    {selectedStage.type === 'boss' ? 'BOSS SAVAŞINA GİR!' : 'SAVAŞA BAŞLA!'}
                  </>
                ) : (
                  <>
                    <Lock className="h-5 w-5" />
                    Önceki Aşamayı Tamamla
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
