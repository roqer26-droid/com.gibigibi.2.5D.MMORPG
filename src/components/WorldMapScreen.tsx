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
import { GameSaveState, StageDef } from '../types/game';
import { focusRegionIndex, getRegionStatuses, isStageUnlocked } from '../utils/worldProgress';
import { pageOf } from '../utils/mapPages';
import { ExplorationMap } from './ExplorationMap';

/** Harita/aşama ekranı arasında gidip gelirken (ve savaştan dönünce) korunan gezinti durumu. */
export interface WorldNav {
  regionIndex: number;
  scrollTop: number | null;
  stageId: string | null;
}

export type WorldView = 'map' | 'stages';

interface WorldMapScreenProps {
  save: GameSaveState;
  /** Ana menüye dön */
  onBack: () => void;
  onStartStage: (stage: StageDef) => void;
  view: WorldView;
  onViewChange: (view: WorldView) => void;
  nav: React.MutableRefObject<WorldNav | null>;
}

export const WorldMapScreen: React.FC<WorldMapScreenProps> = ({
  save,
  onBack,
  onStartStage,
  view,
  onViewChange,
  nav,
}) => {
  const statuses = useMemo(() => getRegionStatuses(save), [save]);
  const [regionIndex, setRegionIndexState] = useState(
    () => nav.current?.regionIndex ?? focusRegionIndex(statuses)
  );

  const patchNav = (patch: Partial<WorldNav>) => {
    nav.current = { regionIndex, scrollTop: null, stageId: null, ...(nav.current ?? {}), ...patch };
  };
  const selectRegion = (i: number) => {
    const pageChanged = pageOf(i) !== pageOf(regionIndex);
    setRegionIndexState(i);
    patchNav({ regionIndex: i, stageId: null, ...(pageChanged ? { scrollTop: null } : {}) });
  };

  const region = WORLD_REGIONS[regionIndex];

  return (
    <div className="flex h-full flex-col bg-[#070b17]">
      <header className="flex shrink-0 items-center gap-3 border-b border-amber-500/40 bg-[#050810] px-4 py-3">
        <button
          type="button"
          onClick={() => (view === 'stages' ? onViewChange('map') : onBack())}
          aria-label={view === 'stages' ? 'Haritaya dön' : 'Geri'}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-600 bg-slate-900 text-slate-100 hover:border-amber-400/50"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        {view === 'map' ? (
          <h1 className="font-display text-[26px] font-bold text-amber-300">Dünya Haritası</h1>
        ) : (
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-bold uppercase tracking-wider text-amber-300/80">Dünya Haritası</p>
            <h1 className="truncate font-display text-[22px] font-bold leading-tight text-[#fff3d0]">{region.name}</h1>
          </div>
        )}
      </header>

      {view === 'map' ? (
        <ExplorationMap
          save={save}
          selectedIndex={regionIndex}
          onSelect={selectRegion}
          initialScrollTop={nav.current?.scrollTop ?? null}
          onScrollChange={(top) => patchNav({ scrollTop: top })}
          onOpenStages={(i) => {
            if (i !== regionIndex) selectRegion(i);
            onViewChange('stages');
          }}
        />
      ) : (
        <StageScreen
          key={region.id}
          save={save}
          regionIndex={regionIndex}
          initialStageId={nav.current?.stageId ?? null}
          onStageChange={(id) => patchNav({ stageId: id })}
          onStartStage={onStartStage}
        />
      )}
    </div>
  );
};

/** Seçilen bölgenin aşama ekranı (mevcut aşama listesi + aşama detayı). */
const StageScreen: React.FC<{
  save: GameSaveState;
  regionIndex: number;
  initialStageId: string | null;
  onStageChange: (stageId: string) => void;
  onStartStage: (stage: StageDef) => void;
}> = ({ save, regionIndex, initialStageId, onStageChange, onStartStage }) => {
  const activeRegion = WORLD_REGIONS[regionIndex];
  const [selectedStage, setSelectedStageState] = useState<StageDef>(
    () =>
      activeRegion.stages.find((s) => s.id === initialStageId) ??
      activeRegion.stages.find((s) => !save.completedStages.includes(s.id)) ??
      activeRegion.stages[activeRegion.stages.length - 1]
  );
  const setSelectedStage = (st: StageDef) => {
    setSelectedStageState(st);
    onStageChange(st.id);
  };
  const isUnlocked = (stageId: string) => isStageUnlocked(save, stageId);
  const unlocked = isUnlocked(selectedStage.id);
  const completed = save.completedStages.includes(selectedStage.id);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
      <div className="mx-auto max-w-6xl space-y-5">
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
                  const stUnlocked = isUnlocked(st.id);
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
  );
};
