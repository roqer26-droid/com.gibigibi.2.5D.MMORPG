import React, { useEffect, useMemo, useRef, useState } from 'react';
import Phaser from 'phaser';
import {
  Flame,
  Snowflake,
  Zap,
  Leaf,
  Sparkles,
  Crown,
  Pause,
  Shield,
  RotateCcw,
  Map,
  Coins,
  Gem,
  ShieldCheck,
  BookOpen,
  Lock,
  X,
  Swords,
  Sword,
  Axe,
  Droplets,
  Grid2x2,
  Hourglass,
  Star,
  Home,
} from 'lucide-react';
import { SoundEngine } from '../audio/SoundEngine';
import { HERO_CLASSES } from '../data/classes';
import { ARENA_IMAGES } from '../data/huntArt';
import { barrierIntent, boardBossPhase } from '../game/boardBossPhase';
import { describeIntent, type IntentIcon } from '../game/enemyIntent';
import { createTransitionGate, nextRouteStage, victoryStarStatus } from '../game/quickReplay';
import { nextMissingStage, regionOfStage, regionRouteSummary } from '../game/masteryRoute';
import { describeWeakness } from '../game/weaknessInfo';
import { GemIcon } from './GemIcon';
import type { HuntDef } from '../data/hunts';
import type { HuntOutcome } from '../state/saveActions';
import { applyRelicsToBuild, getRelic } from '../data/dungeons';
import type { RelicId } from '../types/game';
import { GEM_INFO, RARITY_META, getFullSkillCodex, getSkillLoadout } from '../data/skills';
import { BattleScene, BattleSceneInitData } from '../phaser/BattleScene';
import {
  BattleCombatSnapshot,
  BattleRewardSummary,
  EquipmentItem,
  GameSaveState,
  GemType,
  StageDef,
} from '../types/game';
import { getNextStageAfter } from '../data/world';
import { getStageObjectives, objectiveText, stageStars } from '../data/mastery';
import { effectiveSpeed } from '../data/battleSpeed';
import { activeCompanionFor, getCompanion } from '../data/companions';
import { COMPANION_IMAGES } from '../data/companionArt';
import { computeHeroBuild } from '../utils/rpgLogic';
import { ItemArtSvg } from './ItemCard';
import { BattleTutorial } from './BattleTutorial';
import { buildTutorial } from '../game/tutorial';

const INTENT_ICONS: Record<IntentIcon, { Icon: typeof Sword; cls: string }> = {
  attack: { Icon: Sword, cls: 'text-rose-300' },
  heavy: { Icon: Axe, cls: 'text-orange-300' },
  freeze_tiles: { Icon: Grid2x2, cls: 'text-sky-300' },
  drain: { Icon: Droplets, cls: 'text-fuchsia-300' },
  breath: { Icon: Flame, cls: 'text-orange-400' },
  frozen: { Icon: Snowflake, cls: 'text-sky-200' },
  stagger: { Icon: Hourglass, cls: 'text-slate-300' },
  shield: { Icon: Shield, cls: 'text-emerald-300' },
};

interface BattleViewProps {
  save: GameSaveState;
  stage: StageDef;
  onMatchStats: (gemsMatched: Partial<Record<GemType, number>>, combo: number, skillUsed: boolean) => void;
  /** Savaş hızı tercihi (yalnızca açıkken değişir) */
  onSetBattleSpeed?: (speed: 1 | 2) => void;
  onCompleteVictory: (stage: StageDef, masteryDone?: [boolean, boolean], battleToken?: string) => BattleRewardSummary;
  isLeague?: boolean;
  onLeagueDefeat?: () => BattleRewardSummary;
  onLeagueForfeit?: () => void;
  /** Boss Avı modu: av tanımı ve zafer kaydı */
  hunt?: HuntDef;
  onHuntVictory?: (hunt: HuntDef, turns: number) => HuntOutcome;
  /** Zindan modu: savaş numarası, kalıcı güçler ve başlangıç canı; sonuç App'te kayda işlenir */
  dungeon?: { battleNo: number; total: number; relics: RelicId[]; startHp: number };
  onDungeonBattleEnd?: (victory: boolean, turns: number, heroHp: number) => { completed: boolean; healed: number };
  onExitToMap: () => void;
  /** Savaş sonu ekranından doğrudan ana menüye dön */
  onExitToMenu?: () => void;
  onNextStage: (stage: StageDef) => void;
  /** Ustalık Rotası üzerinden girilen Dünya Haritası savaşı: zafer ekranında Tekrar Oyna / Sıradaki Eksik Aşama / Bölgeye Dön */
  masteryRoute?: boolean;
  onStartRouteStage?: (stage: StageDef) => void;
  onBackToRegion?: (stageId: string) => void;
  /** İlk 5 aşamanın öğreticisi: gösterilecekse numarası (1–5); tamamlanınca / atlanınca kayda yazılır */
  tutorialNumber?: number;
  onTutorialDone?: (n: number) => void;
  onEquipItem: (item: EquipmentItem) => void;
  onOpenSettings: () => void;
}

export const BattleView: React.FC<BattleViewProps> = ({
  save,
  stage,
  onMatchStats,
  onCompleteVictory,
  onSetBattleSpeed,
  isLeague = false,
  onLeagueDefeat,
  onLeagueForfeit,
  hunt,
  onHuntVictory,
  dungeon,
  onDungeonBattleEnd,
  onExitToMap,
  onExitToMenu,
  onNextStage,
  masteryRoute = false,
  onStartRouteStage,
  onBackToRegion,
  tutorialNumber = 0,
  onTutorialDone,
  onEquipItem,
  onOpenSettings,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<BattleScene | null>(null);
  const forfeitedRef = useRef(false);

  const hero = save.heroes[save.activeHeroClass];
  const cls = HERO_CLASSES[hero.classId];
  const build = useMemo(() => {
    const b = computeHeroBuild(hero);
    return dungeon ? applyRelicsToBuild(b, dungeon.relics) : b;
  }, [hero, dungeon]);
  /** Sınıf + seviyeye göre açılan yetenek yükü */
  const loadout = useMemo(
    () => getSkillLoadout(save.activeHeroClass, hero.level),
    [save.activeHeroClass, hero.level]
  );
  const codex = useMemo(
    () => getFullSkillCodex(save.activeHeroClass),
    [save.activeHeroClass]
  );

  const [snapshot, setSnapshot] = useState<BattleCombatSnapshot>({
    heroHp: Math.min(build.stats.health, dungeon?.startHp ?? build.stats.health),
    heroMaxHp: build.stats.health,
    heroShield: build.passives.startShield,
    heroMana: Math.round(build.stats.mana * 0.25),
    heroMaxMana: build.stats.mana,
    heroUlti: 0,
    heroMaxUlti: 100,
    heroRageStacks: 0,
    enemyHp: stage.enemy.maxHp,
    enemyMaxHp: stage.enemy.maxHp,
    enemyShield: 0,
    enemyTurnCounter: stage.enemy.attackInterval,
    enemyMaxTurnInterval: stage.enemy.attackInterval,
    enemyFrozenTurns: 0,
    enemyBurnTurns: 0,
    enemyPoisonTurns: 0,
    enemyStaggerTurns: 0,
    enemyBleedTurns: 0,
    heroCritBuffTurns: 0,
    heroDodgeBuffTurns: 0,
    summonTurns: 0,
    dragonFormTurns: 0,
    enemyPhase: 1,
    enemyEnraged: false,
    enemyWeakness: stage.enemy.weakness,
    enemyNextWarning: `Zayıflık: ${GEM_INFO[stage.enemy.weakness].name.split(' ')[0]}`,
    enemyIntent: describeIntent({
      action: { kind: 'attack', power: 1 },
      turnsLeft: stage.enemy.attackInterval,
      frozenTurns: 0,
      staggerTurns: 0,
    }),
    barrierIntent: barrierIntent(boardBossPhase(stage.enemy)),
    comboCount: 0,
    turnPhase: 'player',
    skillCooldowns: {},
    turnNumber: 1,
  });

  // Boss faz değişimi: kısa bildirim niyet alanının yerine geçer, sonra yeni planı gösterir
  const [showBarrier, setShowBarrier] = useState(false);
  const [phaseNotice, setPhaseNotice] = useState<string | null>(null);
  const [showWeak, setShowWeak] = useState(false);
  const lastNoticeSeq = useRef(0);
  useEffect(() => {
    const n = snapshot.phaseNotice;
    if (!n || n.seq === lastNoticeSeq.current) return;
    lastNoticeSeq.current = n.seq;
    setPhaseNotice(n.text);
    const t = window.setTimeout(() => setPhaseNotice(null), 2200);
    return () => window.clearTimeout(t);
  }, [snapshot.phaseNotice]);

  const [paused, setPaused] = useState(false);
  const [masteryOpen, setMasteryOpen] = useState(false);
  const speedUnlocked = save.speed.unlocked;
  // Kilitli 2× düğmesine basılınca açılma koşulu 2 saniye gösterilir
  const [speedHint, setSpeedHint] = useState(false);
  const speedHintTimer = useRef<number | null>(null);
  const showSpeedHint = () => {
    setSpeedHint(true);
    if (speedHintTimer.current) window.clearTimeout(speedHintTimer.current);
    speedHintTimer.current = window.setTimeout(() => setSpeedHint(false), 2000);
  };
  useEffect(() => () => { if (speedHintTimer.current) window.clearTimeout(speedHintTimer.current); }, []);
  const speedPref = effectiveSpeed(save);
  const companionId = useMemo(() => activeCompanionFor(save, save.activeHeroClass), [save.companions, save.activeHeroClass]); // eslint-disable-line react-hooks/exhaustive-deps
  // Ustalık yalnızca hikâye aşamalarında (lig, av ve zindan savaşlarında yok)
  const masteryObjectives = useMemo(
    () => (isLeague || hunt || dungeon ? undefined : getStageObjectives(stage.id)),
    [isLeague, hunt, dungeon, stage.id]
  );
  const [showSkillBook, setShowSkillBook] = useState(false);
  const [confirmForfeit, setConfirmForfeit] = useState(false);
  const [battleKey, setBattleKey] = useState(0);
  // Öğretici planı savaş başında bir kez kurulur (savaş ortasında tamamlandı işaretlense de bu savaşta sürer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tutorialAtStart = useMemo(() => tutorialNumber, [battleKey, stage.id]);
  const tutorialPlan = useMemo(
    () =>
      tutorialAtStart > 0
        ? buildTutorial(tutorialAtStart, {
            heroName: cls.name,
            classId: hero.classId,
            loadout,
            ulti: cls.ultimateSkill,
            enemy: stage.enemy,
          })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [battleKey, tutorialAtStart, stage.id]
  );
  const arenaRef = useRef<HTMLDivElement | null>(null);
  // Hızlı tekrar / sonraki aşama: zafer kaydı tamamlanınca açılır, ilk dokunuş kilitler (çift dokunma tek savaş başlatır)
  const transitionGate = useRef(createTransitionGate());
  const [transitioning, setTransitioning] = useState(false);
  const [outcome, setOutcome] = useState<{
    victory: boolean;
    xpGained?: number;
    goldGained?: number;
    crystalsGained?: number;
    droppedItem?: EquipmentItem | null;
    equippedDrop?: boolean;
    leaguePointsChange?: number;
    leaguePoints?: number;
    turns?: number;
    hunt?: HuntOutcome;
    dungeon?: { completed: boolean; healed: number };
    mastery?: BattleRewardSummary['mastery'];
    companionParts?: BattleRewardSummary['companionParts'];
    potions?: BattleRewardSummary['potions'];
  } | null>(null);
  const isHunt = !!hunt;
  const exitLabel = dungeon ? 'Zindana Dön' : isHunt ? 'Avlara Dön' : isLeague ? 'Lige Dön' : 'Haritaya Dön';

  // Latest callbacks in refs so Phaser never holds stale closures
  const callbacksRef = useRef({ onMatchStats, onCompleteVictory, onLeagueDefeat, onHuntVictory, onDungeonBattleEnd });
  callbacksRef.current = { onMatchStats, onCompleteVictory, onLeagueDefeat, onHuntVictory, onDungeonBattleEnd };

  // Switch music mode
  useEffect(() => {
    SoundEngine.setMusicMode(stage.enemy.isBoss ? 'boss' : 'battle');
    return () => {
      SoundEngine.setMusicMode('menu');
    };
  }, [stage.enemy.isBoss]);

  // Mount Phaser 3 Game instance
  useEffect(() => {
    const parent = mountRef.current;
    if (!parent) return;

    setOutcome(null);
    transitionGate.current.reset();
    setTransitioning(false);
    forfeitedRef.current = false;
    let resolved = false;
    // Savaş sonucu kimliği: aynı sonuç ikinci kez işlenirse yoldaş parçası tekrar verilmez
    const battleToken = `${stage.id}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
    const initData: BattleSceneInitData = {
      hero,
      build,
      stage,
      settings: save.settings,
      onCombatUpdate: (snap) => setSnapshot(snap),
      onMatchStats: (gems, combo, skillUsed) =>
        callbacksRef.current.onMatchStats(gems, combo, skillUsed),
      hunt,
      mastery: masteryObjectives,
      companion: companionId,
      speed: speedPref,
      arenaImage: hunt ? ARENA_IMAGES[hunt.id] : undefined,
      startHeroHp: dungeon?.startHp,
      onBattleEnd: (victory, turns, heroHp) => {
        if (resolved) return;
        resolved = true;
        if (dungeon) {
          const res = callbacksRef.current.onDungeonBattleEnd?.(victory, turns, heroHp);
          setOutcome({ victory, turns, dungeon: res ?? { completed: false, healed: 0 } });
          return;
        }
        if (hunt) {
          if (victory) {
            const huntResult = callbacksRef.current.onHuntVictory?.(hunt, turns);
            setOutcome({ victory: true, turns, hunt: huntResult });
          } else {
            setOutcome({ victory: false, turns });
          }
          return;
        }
        if (victory) {
          const res = callbacksRef.current.onCompleteVictory(stage, masteryObjectives ? battleScene.getMasteryDone() : undefined, battleToken);
          setOutcome({
            victory: true,
            mastery: res.mastery,
            companionParts: res.companionParts,
            potions: res.potions,
            xpGained: res.xpGained,
            goldGained: res.goldGained,
            crystalsGained: res.crystalsGained,
            droppedItem: res.droppedItem,
            leaguePointsChange: res.leaguePointsChange,
            leaguePoints: res.leaguePoints,
          });
        } else {
          const result = callbacksRef.current.onLeagueDefeat?.();
          setOutcome({ victory: false, leaguePointsChange: result?.leaguePointsChange, leaguePoints: result?.leaguePoints });
        }
      },
    };

    const battleScene = new BattleScene(initData);
    sceneRef.current = battleScene;
    if (import.meta.env.VITE_E2E) {
      (window as unknown as { __battleScene?: BattleScene }).__battleScene = battleScene;
      (window as unknown as { __sound?: typeof SoundEngine }).__sound = SoundEngine;
    }

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      width: parent.clientWidth || window.innerWidth,
      height: parent.clientHeight || window.innerHeight,
      backgroundColor: '#080b14',
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [battleScene],
    });

    gameRef.current = game;

    return () => {
      sceneRef.current = null;
      game.destroy(true);
      gameRef.current = null;
    };
  }, [stage.id, hunt?.id, battleKey]);
  // (zindan savaşı: stage.id her savaşta farklıdır; yeniden kurulum aşama kimliğiyle olur)

  // Hız tercihi değişince sahneye bildir (animasyon sürüyorsa çözümleme bitince uygulanır)
  useEffect(() => {
    sceneRef.current?.requestSpeed(speedPref);
  }, [speedPref]);

  // Sync updated audio/shake settings into running scene
  useEffect(() => {
    sceneRef.current?.updateSettings(save.settings);
  }, [save.settings]);

  useEffect(() => {
    const manager = gameRef.current?.scene;
    if (!manager) return;
    if (paused || showSkillBook) manager.pause('BattleScene');
    else if (manager.isPaused('BattleScene')) manager.resume('BattleScene');
  }, [paused, showSkillBook, battleKey]);

  // Keyboard shortcuts (1-5 Active Skills, 6 Ultimate, Escape Pause)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (outcome) return;
      if (e.key === 'Escape' && showBarrier && snapshot.barrierIntent) {
        setShowBarrier(false);
        return;
      }
      if (e.key === 'Escape' && showWeak) {
        setShowWeak(false);
        return;
      }
      if (e.key === 'Escape') {
        if (showSkillBook) {
          setShowSkillBook(false);
          return;
        }
        setPaused((p) => !p);
        return;
      }
      if (paused) return;
      if (e.key.toLowerCase() === 'b') {
        setShowSkillBook((v) => !v);
        return;
      }
      if (showSkillBook) return;
      const digit = Number(e.key);
      if (Number.isInteger(digit) && digit >= 1 && digit <= 9) {
        const sk = loadout[digit - 1];
        if (sk) sceneRef.current?.castSkill(sk.id);
        return;
      }
      if (e.key.toLowerCase() === 'u' || e.key.toLowerCase() === 'r') {
        sceneRef.current?.castSkill(cls.ultimateSkill.id);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [paused, outcome, showSkillBook, showWeak, showBarrier, snapshot.barrierIntent, cls.ultimateSkill.id, loadout]);

  const skillIcon = (key: string) => {
    switch (key) {
      case 'flame':
        return <Flame className="h-4 w-4 text-orange-300" />;
      case 'snowflake':
        return <Snowflake className="h-4 w-4 text-sky-300" />;
      case 'zap':
        return <Zap className="h-4 w-4 text-yellow-300" />;
      case 'leaf':
        return <Leaf className="h-4 w-4 text-emerald-300" />;
      default:
        return <Sparkles className="h-4 w-4 text-purple-300" />;
    }
  };

  const turnLabel =
    snapshot.turnPhase === 'player'
      ? 'SENİN TURUN'
      : snapshot.turnPhase === 'resolving'
        ? 'EŞLEŞME!'
        : snapshot.turnPhase === 'enemy'
          ? 'DÜŞMAN TURU'
          : snapshot.turnPhase === 'victory'
            ? 'ZAFER!'
            : 'YENİLGİ';

  const ultiReady = snapshot.heroUlti >= snapshot.heroMaxUlti && snapshot.turnPhase === 'player';
  const nextStage = getNextStageAfter(stage.id);
  // Dünya Haritası aşama zaferi (lig, av ve zindan kendi zafer akışlarını kullanır)
  const isWorldStage = !isLeague && !hunt && !dungeon;
  const victoryRecorded = !!outcome?.victory && save.completedStages.includes(stage.id);
  const nextChoice = isWorldStage ? nextRouteStage(save, stage.id) : null;
  const starStatus = isWorldStage && outcome?.victory ? victoryStarStatus(save, stage.id) : null;
  // Ustalık Rotası: zafer kaydından sonraki güncel kayıttan (bu savaşta kazanılan yıldızlar dahil)
  const routeRegion = isWorldStage && masteryRoute && outcome?.victory ? regionOfStage(stage.id)?.region ?? null : null;
  const routeNext = routeRegion && victoryRecorded ? nextMissingStage(save, routeRegion, stage.id) : null;
  const routeSummary = routeRegion && victoryRecorded ? regionRouteSummary(save, routeRegion) : null;
  const go = (fn: () => void) => {
    if (!transitionGate.current.take(victoryRecorded)) return;
    setTransitioning(true);
    fn();
  };

  return (
    <div className="game-no-scroll flex h-full w-full flex-col bg-[#080b14] overflow-hidden">
      {tutorialPlan && onTutorialDone && (
        <BattleTutorial
          key={`${battleKey}-${tutorialPlan.number}`}
          plan={tutorialPlan}
          sceneRef={sceneRef}
          arenaRef={arenaRef}
          heroMana={snapshot.heroMana}
          heroUlti={snapshot.heroUlti}
          heroMaxUlti={snapshot.heroMaxUlti}
          outcome={outcome ? (outcome.victory ? 'victory' : 'defeat') : null}
          onDone={() => onTutorialDone(tutorialPlan.number)}
        />
      )}
      {/* TOP COMBAT HUD */}
      <div className="z-20 border-b border-amber-500/25 bg-slate-950/95 px-2.5 py-1 sm:px-4">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 gap-y-[3px]">
          {/* Hero Bars */}
          <div className="row-span-2 min-w-0 max-w-[260px] self-center">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="truncate text-amber-200">
                {cls.title} <span className="text-slate-400">Sv.{hero.level}</span>
              </span>
              {snapshot.heroShield > 0 && (
                <span className="flex items-center gap-0.5 rounded bg-emerald-500/20 px-1.5 text-[10px] text-emerald-300">
                  <Shield className="h-3 w-3" /> {snapshot.heroShield}
                </span>
              )}
            </div>
            {/* HP Bar */}
            <div data-tut="hero-hp" className="relative mt-0.5 h-3.5 w-full overflow-hidden rounded-full bg-slate-800 border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-300"
                style={{ width: `${Math.max(0, (snapshot.heroHp / snapshot.heroMaxHp) * 100)}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-extrabold text-white drop-shadow">
                {snapshot.heroHp} / {snapshot.heroMaxHp}
              </span>
            </div>
            {/* Mana & Ulti Mini Bars */}
            <div className="mt-1 grid grid-cols-2 gap-1.5">
              <div data-tut="hero-mana" className="relative h-2.5 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-sky-600 to-cyan-300 transition-all duration-300"
                  style={{ width: `${(snapshot.heroMana / snapshot.heroMaxMana) * 100}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white">
                  Mana {snapshot.heroMana}/{snapshot.heroMaxMana}
                </span>
              </div>
              <div className="relative h-2.5 overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full transition-all duration-300 ${
                    ultiReady
                      ? 'bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-400 animate-pulse'
                      : 'bg-gradient-to-r from-purple-600 to-fuchsia-400'
                  }`}
                  style={{ width: `${(snapshot.heroUlti / snapshot.heroMaxUlti) * 100}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white">
                  Ulti %{Math.round((snapshot.heroUlti / snapshot.heroMaxUlti) * 100)}
                </span>
              </div>
            </div>
          </div>

          {/* Center Turn / Combo / Pause */}
          <div className="flex shrink-0 items-center justify-center">
            <div className="flex items-center gap-1.5">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold tracking-wide border ${
                  snapshot.turnPhase === 'player'
                    ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-300'
                    : 'border-amber-400/60 bg-amber-500/20 text-amber-300'
                }`}
              >
                {turnLabel}
              </span>
              <button
                type="button"
                onClick={() => setPaused(true)}
                className="rounded-lg border border-slate-700 bg-slate-900 p-1.5 text-slate-300 hover:border-amber-400/50 hover:text-white"
                title="Duraklat (Esc)"
              >
                <Pause className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Enemy / Boss Bars */}
          <div className="min-w-0 max-w-[270px] text-right">
            {dungeon && (
              <div className="mb-0.5 text-[10px] font-extrabold text-emerald-300" data-testid="dungeon-hud">
                Savaş {dungeon.battleNo}/{dungeon.total}
                {dungeon.relics.length > 0 && <span className="text-amber-300"> · {dungeon.relics.length} güç</span>}
              </div>
            )}
            <div className="flex items-center justify-end gap-1.5 text-[11px] font-bold">
              {snapshot.enemyShield > 0 && (
                <span className="flex items-center gap-0.5 rounded bg-sky-500/25 px-1.5 text-[10px] text-sky-200">
                  <Shield className="h-3 w-3" /> {snapshot.enemyShield}
                </span>
              )}
              {stage.enemy.isBoss && <Crown className="h-3.5 w-3.5 text-rose-400 shrink-0" />}
              <span className={`truncate ${stage.enemy.isBoss ? 'text-rose-300' : 'text-slate-100'}`}>
                {stage.enemy.name}
              </span>
            </div>
            <div
              data-tut="enemy-hp"
              className={`relative mt-0.5 h-3 w-full overflow-hidden rounded-full bg-slate-800 border ${
                snapshot.barrierIntent?.active ? 'border-sky-300' : stage.enemy.isBoss ? 'border-rose-500/60' : 'border-slate-700'
              }`}
            >
              <div
                className={`h-full transition-all duration-300 ${
                  snapshot.barrierIntent?.active
                    ? 'bg-gradient-to-r from-blue-700 via-sky-500 to-cyan-300'
                    : stage.enemy.isBoss
                    ? 'bg-gradient-to-r from-rose-700 via-red-500 to-orange-400'
                    : 'bg-gradient-to-r from-rose-600 to-red-400'
                }`}
                style={{ width: `${Math.max(0, (snapshot.enemyHp / snapshot.enemyMaxHp) * 100)}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-extrabold text-white drop-shadow">
                {snapshot.enemyHp.toLocaleString('tr-TR')} /{' '}
                {snapshot.enemyMaxHp.toLocaleString('tr-TR')}
              </span>
            </div>
          </div>

          {/* 2. satır (merkez + düşman sütunları): tur/kombo ve düşman niyeti — HUD'ı uzatmadan geniş alan */}
          <div className="col-span-2 col-start-2 flex min-w-0 items-center justify-between gap-2">
            {snapshot.comboCount >= 2 ? (
              <span className="shrink-0 text-[11px] font-black text-amber-300 animate-pulse">
                KOMBO x{snapshot.comboCount}!
              </span>
            ) : (
              <span className="shrink-0 text-[10px] text-slate-400">Tur {snapshot.turnNumber}</span>
            )}
            {(() => {
              const it = snapshot.enemyIntent;
              const { Icon, cls } = INTENT_ICONS[it.icon];
              const weak = GEM_INFO[snapshot.enemyWeakness];
              return (
                <div
                  className="flex min-w-0 items-center justify-end gap-1.5"
                  data-testid="enemy-intent"
                  data-intent-kind={it.icon}
                  data-intent-turns={it.turns}
                >
                  <button
                    type="button"
                    onClick={() => setShowWeak((v) => !v)}
                    aria-label={`Zayıflık: ${weak.name}. Ayrıntı için dokun`}
                    aria-expanded={showWeak}
                    data-testid="weakness-btn"
                    data-weakness={snapshot.enemyWeakness}
                    className="relative flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full border before:absolute before:-inset-3 before:content-['']"
                    style={{ borderColor: weak.colorHex, background: `${weak.colorHex}33` }}
                  >
                    <GemIcon gem={snapshot.enemyWeakness} size={12} />
                  </button>
                  {snapshot.barrierIntent && (
                    <button
                      type="button"
                      data-testid="barrier-intent"
                      aria-label={snapshot.barrierIntent.description}
                      aria-expanded={showBarrier}
                      onClick={() => {
                        setShowWeak(false);
                        setShowBarrier(v => !v);
                      }}
                      className="relative flex h-[18px] shrink-0 items-center gap-0.5 whitespace-nowrap rounded border border-sky-400/55 bg-sky-950/70 px-1 text-[10px] font-bold text-sky-200 before:absolute before:-inset-y-2 before:inset-x-0 before:content-['']"
                    >
                      <Snowflake className="h-3 w-3" />
                      {snapshot.barrierIntent.text}
                    </button>
                  )}
                  {phaseNotice && !boardBossPhase(stage.enemy) ? (
                    <div
                      className="intent-notice flex h-[18px] min-w-0 items-center gap-1 rounded-md border border-amber-400/60 bg-amber-950/60 px-1.5 text-[11px] font-extrabold text-amber-200"
                      data-testid="phase-notice"
                    >
                      <Crown className="h-3 w-3 shrink-0" />
                      <span className="truncate">{phaseNotice}</span>
                    </div>
                  ) : (
                    <div
                      className={`flex h-[18px] min-w-0 items-center gap-1 rounded-md border px-1.5 text-[11px] font-extrabold ${
                        it.urgent ? 'intent-urgent border-rose-400/70 bg-rose-950/60 text-rose-100' : 'border-slate-700 bg-slate-900/70 text-slate-100'
                      }`}
                      data-testid="intent-text"
                      title={it.text}
                    >
                      <Icon className={`h-3.5 w-3.5 shrink-0 ${cls}`} />
                      <span className="truncate">{it.text}</span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {showBarrier && snapshot.barrierIntent && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowBarrier(false)} aria-hidden="true" />
          <div
            role="dialog"
            aria-label="Buz Bariyeri"
            className="fantasy-panel fixed left-2 right-2 z-50 mx-auto flex max-w-sm items-start gap-3 rounded-2xl border border-sky-400/60 p-3"
            style={{ top: 'calc(62px + env(safe-area-inset-top, 0px))' }}
          >
            <p className="flex-1 text-sm text-sky-100">{snapshot.barrierIntent.description}</p>
            <button type="button" aria-label="Kapat" onClick={() => setShowBarrier(false)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-300">
              <X className="h-5 w-5" />
            </button>
          </div>
        </>
      )}

      {/* Zayıflık açıklaması: ekran sınırlarına sığar, dışına dokunmak kapatır */}
      {showWeak && (() => {
        const w = GEM_INFO[snapshot.enemyWeakness];
        const info = describeWeakness({
          weakness: snapshot.enemyWeakness,
          resistance: stage.enemy.resistance,
          weaknessBonusPct: build.passives.weaknessBonusPct,
          isBoss: stage.enemy.isBoss,
          bossId: stage.enemy.bossId,
          nameOf: (g) => GEM_INFO[g].name,
        });
        return (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowWeak(false)} aria-hidden="true" />
            <div
              role="dialog"
              aria-label="Element zayıflığı"
              data-testid="weakness-popover"
              className="fantasy-panel fixed left-2 right-2 z-50 mx-auto max-h-[calc(100dvh-84px)] max-w-sm overflow-y-auto rounded-2xl border-2 p-3.5"
              style={{ top: 'calc(62px + env(safe-area-inset-top, 0px))', borderColor: `${w.colorHex}99` }}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2"
                  style={{ borderColor: w.colorHex, background: `${w.colorHex}33` }}
                >
                  <GemIcon gem={info.gem} size={22} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-bold uppercase tracking-wider text-slate-400">Düşman zayıflığı</div>
                  <div className="font-display text-[17px] font-bold leading-tight" style={{ color: w.colorHex }} data-testid="weakness-name">
                    {info.title}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWeak(false)}
                  aria-label="Kapat"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <ul className="mt-2.5 space-y-1.5 text-[14px] leading-snug text-slate-200" data-testid="weakness-lines">
                {info.lines.map((l) => (
                  <li key={l} className="rounded-lg bg-slate-950/60 px-2.5 py-1.5">
                    {l}
                  </li>
                ))}
              </ul>
            </div>
          </>
        );
      })()}

      {/* PHASER 3 ARENA + BOARD CANVAS */}
      <div ref={arenaRef} className="relative flex min-h-0 w-full flex-1">
        <div ref={mountRef} className="game-no-scroll relative h-full min-h-0 w-full flex-1 overflow-hidden" />
        {snapshot.kit && (
          <div
            className="pointer-events-none absolute left-1.5 top-[46px] z-10 flex items-center gap-1 rounded-full border border-amber-400/50 bg-slate-950/85 px-2.5 py-1 text-[11px] font-extrabold text-amber-200"
            data-testid="hero-kit-hud"
            data-value={snapshot.kit.value}
          >
            {snapshot.kit.label}
            {Array.from({ length: snapshot.kit.max }, (_, i) => (
              <span key={i} className={`h-2.5 w-2.5 rounded-full border ${i < snapshot.kit!.value ? 'border-amber-300 bg-amber-300' : 'border-slate-600 bg-slate-800'}`} />
            ))}
          </div>
        )}
        {snapshot.companion && (
          <div
            className="pointer-events-none absolute left-1.5 top-1.5 z-10 flex items-center gap-1.5 rounded-full border bg-slate-950/85 py-0.5 pl-0.5 pr-2.5"
            style={{ borderColor: snapshot.companion.state === 'used' ? '#475569' : '#fcd34d99' }}
            data-testid="companion-hud"
            data-state={snapshot.companion.state}
          >
            <img src={COMPANION_IMAGES[snapshot.companion.id]} alt="" width={30} height={30} draggable={false} className={`h-[30px] w-[30px] ${snapshot.companion.state === 'used' ? 'opacity-40 grayscale' : ''}`} />
            <span className="leading-tight">
              <span className="block text-[10px] font-extrabold text-slate-200">{getCompanion(snapshot.companion.id).name}</span>
              <span className={`block text-[10px] font-bold ${snapshot.companion.state === 'used' ? 'text-slate-500' : snapshot.companion.state === 'armed' ? 'text-sky-300' : 'text-emerald-300'}`}>
                {snapshot.companion.state === 'used' ? 'Kullanıldı' : snapshot.companion.state === 'armed' ? 'Saldırıyı Bekliyor' : 'Hazır'}
              </span>
            </span>
          </div>
        )}
        <div className="pointer-events-none absolute right-1.5 top-1.5 z-10 flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5">
              {/* Savaş hızı: 100. aşamadan sonra açılır; son tercih kaydedilir */}
              <button
                type="button"
                aria-disabled={!speedUnlocked}
                onClick={() => (speedUnlocked ? onSetBattleSpeed?.(speedPref === 2 ? 1 : 2) : showSpeedHint())}
                data-testid="speed-button"
                data-speed={speedPref}
                data-applied={snapshot.speed ?? 1}
                data-locked={speedUnlocked ? '0' : '1'}
                aria-label={speedUnlocked ? `Savaş hızı ${speedPref}×, değiştirmek için dokun` : 'Savaş hızı kilitli: 100. aşamayı tamamla'}
                title={speedUnlocked ? 'Savaş hızı' : '100. aşamayı tamamlayınca açılır'}
                className={`pointer-events-auto flex h-12 min-w-[60px] items-center justify-center gap-1 rounded-full border px-4 text-[15px] font-extrabold ${
                  speedUnlocked
                    ? speedPref === 2
                      ? 'border-amber-300 bg-amber-400/25 text-amber-200'
                      : 'border-slate-500 bg-slate-950/85 text-slate-200'
                    : 'border-slate-700 bg-slate-950/70 text-slate-500'
                }`}
              >
                {!speedUnlocked && <Lock className="h-3 w-3" />}
                {speedUnlocked ? `${speedPref}×` : '2×'}
              </button>
              {masteryObjectives && (
                <button
                  type="button"
                  onClick={() => setMasteryOpen((v) => !v)}
                  aria-expanded={masteryOpen}
                  data-testid="mastery-button"
                  className="pointer-events-auto flex h-9 items-center gap-1 rounded-full border border-amber-400/50 bg-slate-950/85 px-3 text-[11px] font-extrabold text-amber-300"
                >
                  <Star className="h-3.5 w-3.5 fill-amber-300" /> Ustalık
                </button>
              )}
            </div>
            {!speedUnlocked && speedHint && (
              <div
                role="status"
                data-testid="speed-hint"
                className="pointer-events-none rounded-lg border border-amber-400/50 bg-slate-950/95 px-2.5 py-1.5 text-[12px] font-bold text-amber-200 shadow-[0_6px_18px_rgba(0,0,0,0.6)]"
              >
                Dünya Haritası 100. seviyede açılır
              </div>
            )}
            {masteryObjectives && masteryOpen && (
              <div
                data-testid="mastery-panel"
                className="pointer-events-auto w-[236px] rounded-xl border border-amber-400/40 bg-slate-950/95 p-2.5 text-left shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
              >
                {(() => {
                  const owned = stageStars(save, stage.id);
                  const have = [owned.o1, owned.o2];
                  return masteryObjectives.map((o, i) => {
                    const pr = snapshot.mastery?.[i];
                    const done = have[i] || !!pr?.done;
                    return (
                      <div key={i} className="flex items-start gap-2 py-1" data-testid={`mastery-obj-${i}`} data-done={done ? '1' : '0'}>
                        <Star className={`mt-0.5 h-4 w-4 shrink-0 ${done ? 'fill-amber-300 text-amber-300' : 'text-slate-500'}`} />
                        <div className="min-w-0 flex-1">
                          <p className={`text-[12px] font-bold leading-snug ${done ? 'text-amber-200' : 'text-slate-200'}`}>{objectiveText(o)}</p>
                          <p className="text-[10px] font-semibold text-slate-400">
                            {have[i] ? 'Daha önce kazanıldı' : pr?.done ? 'Tamamlandı! Zaferde yıldız kazanılır' : `${pr?.current ?? 0}/${o.count}`}
                          </p>
                        </div>
                      </div>
                    );
                  });
                })()}
                <p className="mt-1 border-t border-slate-800 pt-1 text-[10px] text-slate-500">Yıldızlar yalnızca zaferde verilir.</p>
              </div>
            )}
          </div>
      </div>

      {/* AKTİF ETKİ ŞERİDİ + YETENEK BARı */}
      <div className="z-20 border-t border-amber-500/25 bg-slate-950/95 px-2 py-1.5 sm:px-4">
        <div className="mx-auto max-w-5xl">
          {/* Durum etkileri (canlı geri bildirim) */}
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
            {snapshot.heroRageStacks > 0 && (
              <span className="rounded-full border border-rose-500/50 bg-rose-950/60 px-2 py-0.5 text-rose-300">
                🔥 Öfke x{snapshot.heroRageStacks} (+%{snapshot.heroRageStacks * 8} Saldırı)
              </span>
            )}
            {snapshot.heroCritBuffTurns > 0 && (
              <span className="rounded-full border border-yellow-400/60 bg-yellow-950/60 px-2 py-0.5 text-yellow-200 animate-pulse">
                🎯 Garanti Kritik ({snapshot.heroCritBuffTurns} tur)
              </span>
            )}
            {snapshot.enemyFrozenTurns > 0 && (
              <span className="rounded-full border border-sky-400/50 bg-sky-950/60 px-2 py-0.5 text-sky-200">
                ❄️ Donmuş ({snapshot.enemyFrozenTurns})
              </span>
            )}
            {snapshot.enemyStaggerTurns > 0 && (
              <span className="rounded-full border border-slate-400/50 bg-slate-800/70 px-2 py-0.5 text-slate-200">
                💫 Sersem ({snapshot.enemyStaggerTurns})
              </span>
            )}
            {snapshot.enemyBurnTurns > 0 && (
              <span className="rounded-full border border-orange-500/50 bg-orange-950/60 px-2 py-0.5 text-orange-300">
                🔥 Yanma ({snapshot.enemyBurnTurns})
              </span>
            )}
            {snapshot.enemyPoisonTurns > 0 && (
              <span className="rounded-full border border-lime-500/50 bg-lime-950/60 px-2 py-0.5 text-lime-300">
                ☠️ Zehir ({snapshot.enemyPoisonTurns})
              </span>
            )}
            {snapshot.enemyBleedTurns > 0 && (
              <span className="rounded-full border border-rose-500/60 bg-rose-950/60 px-2 py-0.5 text-rose-300">
                🩸 Kanama ({snapshot.enemyBleedTurns})
              </span>
            )}
            {snapshot.summonTurns > 0 && (
              <span className="rounded-full border border-emerald-400/60 bg-emerald-950/60 px-2 py-0.5 text-emerald-300">
                💀 Çağrılan Ordu ({snapshot.summonTurns})
              </span>
            )}
            {snapshot.heroDodgeBuffTurns > 0 && (
              <span className="rounded-full border border-fuchsia-400/60 bg-fuchsia-950/60 px-2 py-0.5 text-fuchsia-200">
                💨 Gölge Sıyrılması +45% ({snapshot.heroDodgeBuffTurns})
              </span>
            )}
            {snapshot.dragonFormTurns > 0 && (
              <span className="animate-pulse rounded-full border border-orange-400/70 bg-orange-950/70 px-2 py-0.5 text-orange-300">
                🐉 DÖNÜŞÜM FORMU +%60 ({snapshot.dragonFormTurns})
              </span>
            )}
            {stage.enemy.isBoss && (
              <span className="rounded-full border border-fuchsia-500/50 bg-fuchsia-950/50 px-2 py-0.5 text-fuchsia-200">
                👑 Faz {snapshot.enemyPhase}
                {snapshot.enemyEnraged ? ' • ÖFKELİ!' : ''}
              </span>
            )}
            <span className="ml-auto hidden rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-400 sm:block">
              Kısayollar: 1-9 yetenek • U Ulti • B yetenek kitabı • Esc duraklat
            </span>
          </div>

          <div className="flex items-stretch gap-2">
            {/* Yetenek şeridi — seviye ile genişler, yatay kaydırılabilir */}
            <div data-tut="skill-bar" className="flex flex-1 items-stretch gap-1.5 overflow-x-auto pb-1">
              {loadout.map((sk, idx) => {
                const cd = snapshot.skillCooldowns[sk.id] ?? 0;
                const canCast =
                  snapshot.turnPhase === 'player' &&
                  cd === 0 &&
                  snapshot.heroMana >= sk.manaCost &&
                  !outcome;
                const isClassSkill = sk.kind === 'class';

                return (
                  <button
                    key={sk.id}
                    type="button"
                    disabled={!canCast}
                    data-tut={`skill-${sk.id}`}
                    onClick={() => sceneRef.current?.castSkill(sk.id)}
                    title={`${sk.name} — ${sk.manaCost} Mana, ${sk.cooldown} tur bekleme\n${sk.description}`}
                    className={`relative flex w-[70px] shrink-0 flex-col items-center justify-center rounded-xl border px-1 py-1.5 text-center transition active:scale-95 ${
                      canCast
                        ? isClassSkill
                          ? 'border-fuchsia-400/60 bg-fuchsia-950/45 shadow-[0_0_12px_rgba(217,70,239,0.22)] hover:border-amber-400'
                          : 'border-sky-400/60 bg-slate-900 shadow-[0_0_12px_rgba(56,189,248,0.2)] hover:border-amber-400 hover:bg-slate-800'
                        : 'border-slate-800 bg-slate-950/80 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    {idx < 9 && (
                      <span className="absolute left-1 top-0.5 text-[9px] font-bold text-slate-500">
                        {idx + 1}
                      </span>
                    )}
                    {cd > 0 && (
                      <span className="absolute right-1 top-0.5 rounded bg-slate-950/90 px-1 text-[9px] font-black text-rose-300">
                        {cd}
                      </span>
                    )}
                    {sk.grantsExtraTurn && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-1.5 text-[8px] font-black text-slate-950 shadow">
                        +TUR
                      </span>
                    )}
                    {skillIcon(sk.iconKey)}
                    <span className="mt-0.5 w-full truncate text-[9px] font-bold text-slate-100">
                      {sk.name}
                    </span>
                    <span
                      className={`text-[9px] font-semibold ${
                        canCast ? 'text-sky-300' : 'text-slate-500'
                      }`}
                    >
                      {sk.manaCost} M
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Ulti + Yetenek Kitabı */}
            <div className="flex w-[76px] shrink-0 flex-col gap-1.5">
              <button
                type="button"
                disabled={!ultiReady || !!outcome}
                data-tut="ulti"
                onClick={() => sceneRef.current?.castSkill(cls.ultimateSkill.id)}
                title={`ULTİ (U tuşu): ${cls.ultimateSkill.name} — ${cls.ultimateSkill.description}`}
                className={`relative flex flex-1 flex-col items-center justify-center rounded-xl border-2 px-1 py-1.5 text-center transition active:scale-95 ${
                  ultiReady
                    ? 'gold-btn border-yellow-200 text-slate-950 animate-pulse-glow'
                    : 'border-purple-900/60 bg-purple-950/30 text-purple-300 opacity-60 cursor-not-allowed'
                }`}
              >
                <Crown className={`h-4 w-4 ${ultiReady ? 'text-slate-950' : 'text-amber-300'}`} />
                <span className="mt-0.5 w-full truncate text-[10px] font-black">ULTİ</span>
                <span className="text-[9px] font-bold">
                  {ultiReady
                    ? 'HAZIR!'
                    : `%${Math.round((snapshot.heroUlti / snapshot.heroMaxUlti) * 100)}`}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setShowSkillBook(true)}
                className="flex items-center justify-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-1 py-1.5 text-[10px] font-bold text-slate-300 hover:border-amber-400/50 hover:text-white"
                title="Yetenek Kitabı (B)"
              >
                <BookOpen className="h-3.5 w-3.5" />
                Kitap
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* YETENEK KİTABI */}
      {showSkillBook && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm">
          <div className="fantasy-panel animate-pop-scale flex max-h-[88vh] w-full max-w-2xl flex-col rounded-2xl border-2 border-amber-500/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-amber-300">
                  {cls.name} Yetenek Kitabı
                </h2>
                <p className="text-[11px] text-slate-400">
                  Seviye {hero.level} • {loadout.length} yetenek açık • Toplam{' '}
                  {codex.length + 1} yetenek
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSkillBook(false)}
                className="rounded-lg bg-slate-800 p-1.5 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 space-y-2 overflow-y-auto pr-1">
              {/* Ulti */}
              <div className="rounded-xl border-2 border-amber-400/60 bg-amber-950/30 p-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm font-black text-amber-300">
                    <Crown className="h-4 w-4" />
                    ULTİ: {cls.ultimateSkill.name}
                  </span>
                  <span className="rounded bg-slate-900 px-2 py-0.5 text-[11px] font-bold text-amber-200">
                    100 Ulti Enerjisi
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-300">{cls.ultimateSkill.description}</p>
              </div>

              {codex.map((sk) => {
                const unlocked = (sk.levelReq ?? 1) <= hero.level;
                return (
                  <div
                    key={sk.id}
                    className={`rounded-xl border p-3 ${
                      unlocked
                        ? sk.kind === 'class'
                          ? 'border-fuchsia-500/40 bg-fuchsia-950/25'
                          : 'border-slate-700 bg-slate-900/70'
                        : 'border-slate-800 bg-slate-950/60 opacity-60'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-sm font-bold text-white">
                        {skillIcon(sk.iconKey)}
                        {sk.name}
                        {sk.kind === 'class' && (
                          <span className="rounded bg-fuchsia-500/25 px-1.5 py-0.5 text-[9px] font-black text-fuchsia-200">
                            SINIF
                          </span>
                        )}
                        {sk.grantsExtraTurn && (
                          <span className="rounded bg-amber-400/90 px-1.5 py-0.5 text-[9px] font-black text-slate-950">
                            +TUR
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-1.5 text-[11px] font-semibold">
                        <span className="text-sky-300">{sk.manaCost} Mana</span>
                        <span className="text-slate-500">• {sk.cooldown} tur bekleme</span>
                        {!unlocked && (
                          <span className="flex items-center gap-1 rounded bg-rose-950/70 px-1.5 py-0.5 text-rose-300">
                            <Lock className="h-3 w-3" />
                            Sv.{sk.levelReq}
                          </span>
                        )}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-300">{sk.description}</p>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowSkillBook(false)}
              className="gold-btn mt-3 w-full rounded-xl py-2.5 text-sm font-extrabold text-slate-950"
            >
              Savaşa Dön
            </button>
          </div>
        </div>
      )}

      {/* PAUSE MODAL */}
      {paused && !outcome && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="fantasy-panel animate-pop-scale w-full max-w-sm rounded-2xl border-2 border-amber-500/40 p-5 text-center">
            <h2 className="font-display text-xl font-bold text-amber-300">Oyun Duraklatıldı</h2>
            <p className="mt-1 text-xs text-slate-400">
              {stage.name} • Zayıflık: {GEM_INFO[snapshot.enemyWeakness].name}
            </p>
            {dungeon && (
              <p className="mt-1 text-[11px] font-bold text-emerald-300">
                Savaş {dungeon.battleNo}/{dungeon.total}
                {dungeon.relics.length > 0 && ` · ${dungeon.relics.map((r) => getRelic(r).name).join(', ')}`}
              </p>
            )}
            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => setPaused(false)}
                className="gold-btn rounded-xl py-2.5 text-sm font-extrabold text-slate-950"
              >
                Savaşa Devam Et
              </button>
              <button
                type="button"
                onClick={() => {
                  setPaused(false);
                  setShowSkillBook(true);
                }}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-fuchsia-500/40 bg-fuchsia-950/40 py-2.5 text-xs font-bold text-fuchsia-200 hover:bg-fuchsia-900/50"
              >
                <BookOpen className="h-4 w-4" />
                Yetenek Kitabı ({loadout.length} açık büyü)
              </button>
              <button
                type="button"
                onClick={onOpenSettings}
                className="rounded-xl border border-slate-700 bg-slate-900 py-2.5 text-xs font-bold text-slate-200 hover:border-amber-400/50"
              >
                Ayarlar ve Taş Rehberi
              </button>
              {!isLeague && <button
                type="button"
                onClick={() => {
                  setPaused(false);
                  setBattleKey((k) => k + 1);
                }}
                className="rounded-xl border border-slate-700 bg-slate-900 py-2.5 text-xs font-bold text-slate-200 hover:border-sky-400/50"
              >
                Savaşı Yeniden Başlat
              </button>}
              {isLeague && confirmForfeit ? (
                <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-3">
                  <p className="mb-2 text-xs text-rose-200">Pes edersen düello mağlubiyet sayılır ve puan kaybedebilirsin.</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => {
                      if (forfeitedRef.current) return;
                      forfeitedRef.current = true;
                      onLeagueForfeit?.();
                      onExitToMap();
                    }} className="flex-1 rounded-lg bg-rose-700 px-2 py-2 text-xs font-bold text-white">Evet, pes et</button>
                    <button type="button" onClick={() => setConfirmForfeit(false)} className="flex-1 rounded-lg bg-slate-800 px-2 py-2 text-xs font-bold text-slate-200">Vazgeç</button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => isLeague ? setConfirmForfeit(true) : onExitToMap()}
                  className="rounded-xl border border-rose-500/40 bg-rose-950/40 py-2.5 text-xs font-bold text-rose-300 hover:bg-rose-900/50"
                >
                  {isLeague ? 'Pes Et ve Lige Dön' : exitLabel}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VICTORY / DEFEAT OVERLAY */}
      {outcome && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div
            className={`fantasy-panel animate-pop-scale max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-3xl border-2 p-6 text-center ${
              outcome.victory
                ? 'border-amber-400 shadow-[0_0_50px_rgba(245,158,11,0.35)]'
                : 'border-rose-500/60'
            }`}
          >
            {dungeon && outcome.dungeon ? (
              outcome.victory ? (
                <>
                  <div className="text-xs font-extrabold uppercase tracking-widest text-emerald-300">
                    {outcome.dungeon.completed ? 'ZİNDAN TAMAMLANDI!' : `SAVAŞ ${dungeon.battleNo}/${dungeon.total} KAZANILDI`}
                  </div>
                  <h2 className="mt-1 font-display text-3xl font-black text-white">ZAFER!</h2>
                  <p className="mt-1 text-xs text-slate-300">{stage.enemy.name} yenildi.</p>
                  {outcome.dungeon.healed > 0 && (
                    <p className="mt-2 text-sm font-bold text-emerald-300">+{outcome.dungeon.healed} can yenilendi</p>
                  )}
                  <button
                    type="button"
                    onClick={onExitToMap}
                    data-testid="dungeon-battle-continue"
                    className="gold-btn mt-5 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl text-base font-black text-slate-950"
                  >
                    {outcome.dungeon.completed ? 'Ödülü Gör' : 'Güç Seç'}
                  </button>
                </>
              ) : (
                <>
                  <h2 className="font-display text-3xl font-black text-rose-400">YENİLGİ</h2>
                  <p className="mt-2 text-xs leading-relaxed text-slate-300">
                    Zindan denemesi sona erdi; geçici güçlerin kayboldu. Yeniden deneyerek baştan başlayabilirsin.
                  </p>
                  <button
                    type="button"
                    onClick={onExitToMap}
                    data-testid="dungeon-battle-continue"
                    className="gold-btn mt-5 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl text-base font-black text-slate-950"
                  >
                    Zindana Dön
                  </button>
                </>
              )
            ) : outcome.victory && hunt ? (
              <>
                <div className="text-xs font-extrabold uppercase tracking-widest" style={{ color: hunt.accent }}>
                  BOSS AVI TAMAMLANDI!
                </div>
                <h2 className="mt-1 font-display text-3xl font-black text-white">ZAFER!</h2>
                <p className="mt-1 text-xs text-slate-300">
                  {hunt.arenaName} · {hunt.bossName}
                </p>
                <div className="mt-4 space-y-2 text-left">
                  <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2.5 text-sm">
                    <span className="text-slate-400">Bu av</span>
                    <strong className="text-white">{outcome.turns} tur</strong>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2.5 text-sm">
                    <span className="text-slate-400">En iyi rekor</span>
                    <strong className={outcome.hunt?.newRecord ? 'text-amber-300' : 'text-white'}>
                      {outcome.hunt?.bestTurns ?? outcome.turns} tur{outcome.hunt?.newRecord ? ' · Yeni rekor!' : ''}
                    </strong>
                  </div>
                  {outcome.hunt?.firstReward && (
                    <div className="rounded-xl border border-amber-400/40 bg-amber-950/25 px-3 py-2.5 text-sm">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300/80">İlk zafer ödülü</div>
                      <div className="mt-1 flex items-center gap-4 font-bold">
                        <span className="inline-flex items-center gap-1 text-amber-300"><Coins className="h-4 w-4" /> +{outcome.hunt.firstReward.gold.toLocaleString('tr-TR')}</span>
                        <span className="inline-flex items-center gap-1 text-sky-300"><Gem className="h-4 w-4" /> +{outcome.hunt.firstReward.crystals}</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-5 flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setBattleKey((k) => k + 1)}
                    className="gold-btn flex min-h-[48px] flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-extrabold text-slate-950"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Tekrar Dene
                  </button>
                  <button
                    type="button"
                    onClick={onExitToMap}
                    className="flex min-h-[48px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 text-xs font-bold text-slate-200"
                  >
                    <Map className="h-4 w-4" />
                    {exitLabel}
                  </button>
                </div>
              </>
            ) : outcome.victory ? (
              <>
                <div className="text-xs font-extrabold uppercase tracking-widest text-amber-300">
                  {isLeague ? 'LİG DÜELLOSU KAZANILDI!' : stage.enemy.isBoss ? 'BOSS MAĞLUP EDİLDİ!' : 'AŞAMA TEMİZLENDİ!'}
                </div>
                <h2 className="mt-1 font-display text-3xl font-black text-white">ZAFER!</h2>
                <p className="mt-1 text-xs text-slate-300">{stage.name} başarıyla tamamlandı.</p>

                {isLeague && outcome.leaguePointsChange !== undefined && (
                  <div className="mt-3 rounded-xl border border-amber-400/35 bg-amber-950/25 px-3 py-2 text-sm font-bold text-amber-200">
                    +{outcome.leaguePointsChange} lig puanı <span className="text-xs font-normal text-slate-300">· Toplam {outcome.leaguePoints}</span>
                  </div>
                )}

                <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl border border-slate-800 bg-slate-950/80 p-3 text-xs font-bold">
                  <div>
                    <span className="text-[10px] text-slate-400">Tecrübe</span>
                    <p className="text-purple-300">+{outcome.xpGained} TP</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Altın</span>
                    <p className="flex items-center justify-center gap-1 text-amber-300">
                      <Coins className="h-3.5 w-3.5" />+{outcome.goldGained}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Kristal</span>
                    <p className="flex items-center justify-center gap-1 text-sky-300">
                      <Gem className="h-3.5 w-3.5" />+{outcome.crystalsGained}
                    </p>
                  </div>
                </div>

                {outcome.potions && (outcome.potions.small + outcome.potions.medium + outcome.potions.large > 0) && (
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-950/25 px-3 py-2 text-xs font-bold" data-testid="potion-gain">
                    <span className="text-emerald-200">Seviye İksiri:</span>
                    {outcome.potions.small > 0 && <span className="text-green-300">+{outcome.potions.small} Küçük</span>}
                    {outcome.potions.medium > 0 && <span className="text-sky-300">+{outcome.potions.medium} Orta</span>}
                    {outcome.potions.large > 0 && <span className="text-amber-300">+{outcome.potions.large} Büyük</span>}
                  </div>
                )}
                {outcome.companionParts && (
                  <div className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-950/25 px-3 py-2 text-sm font-bold text-emerald-200" data-testid="companion-parts-gain">
                    <img src={COMPANION_IMAGES[outcome.companionParts.companionId]} alt="" width={28} height={28} className="h-7 w-7" />
                    +{outcome.companionParts.parts} {outcome.companionParts.partName}
                  </div>
                )}
                {outcome.mastery && (
                  <div className="mt-3 rounded-2xl border border-amber-400/30 bg-slate-950/70 p-3 text-left" data-testid="mastery-result">
                    <div className="flex items-center justify-center gap-1.5">
                      {[outcome.mastery.stars.victory, outcome.mastery.stars.o1, outcome.mastery.stars.o2].map((on, i) => {
                        const isNew = [outcome.mastery!.earned.victory, outcome.mastery!.earned.o1, outcome.mastery!.earned.o2][i];
                        return (
                          <Star
                            key={i}
                            data-testid={`result-star-${i}`}
                            data-state={on ? (isNew ? 'new' : 'had') : 'empty'}
                            className={`h-9 w-9 ${on ? (isNew ? 'fill-amber-300 text-amber-300 drop-shadow-[0_0_10px_rgba(252,211,77,0.9)]' : 'fill-amber-500/70 text-amber-500/70') : 'text-slate-600'}`}
                          />
                        );
                      })}
                    </div>
                    <ul className="mt-2 space-y-1 text-[12px]">
                      <li className="flex items-start gap-1.5">
                        <span className={outcome.mastery.earned.victory ? 'text-amber-300' : 'text-slate-500'}>★</span>
                        <span className="text-slate-300">Aşama zaferi{outcome.mastery.earned.victory ? ' — yeni yıldız!' : ' — kazanılmıştı'}</span>
                      </li>
                      {outcome.mastery.objectives.map((o, i) => {
                        const got = i === 0 ? outcome.mastery!.stars.o1 : outcome.mastery!.stars.o2;
                        const isNew = i === 0 ? outcome.mastery!.earned.o1 : outcome.mastery!.earned.o2;
                        return (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className={got ? 'text-amber-300' : 'text-slate-500'}>{got ? '★' : '☆'}</span>
                            <span className={got ? 'text-slate-200' : 'text-slate-400'}>
                              {objectiveText(o)}
                              {isNew ? ' — yeni yıldız!' : got ? ' — kazanılmıştı' : ''}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                    <p className="mt-2 border-t border-slate-800 pt-2 text-center text-[12px] font-bold text-amber-200" data-testid="mastery-chest-line">
                      {outcome.mastery.toNextChest !== null
                        ? `Bölge ${outcome.mastery.regionStars}/${outcome.mastery.regionMax} ★ · Sıradaki sandığa ${outcome.mastery.toNextChest} yıldız kaldı`
                        : `Bölge ${outcome.mastery.regionStars}/${outcome.mastery.regionMax} ★ · Tüm sandıklar açılabilir`}
                      {outcome.mastery.claimableChests > 0 ? ` · ${outcome.mastery.claimableChests} sandık hazır` : ''}
                    </p>
                  </div>
                )}

                {outcome.droppedItem && (
                  <div
                    className={`mt-4 rounded-2xl border-2 p-3.5 ${
                      RARITY_META[outcome.droppedItem.rarity].borderClass
                    } ${RARITY_META[outcome.droppedItem.rarity].bgClass}`}
                  >
                    <div className="text-[11px] font-bold text-amber-300">
                      🎁 Ganimet Düşürüldü!
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-left">
                      <ItemArtSvg item={outcome.droppedItem} size={46} />
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate font-display text-sm font-bold ${
                            RARITY_META[outcome.droppedItem.rarity].textClass
                          }`}
                        >
                          {outcome.droppedItem.name}
                        </p>
                        <p className="text-[11px] text-slate-300">
                          {RARITY_META[outcome.droppedItem.rarity].label} • Sv.
                          {outcome.droppedItem.levelReq}
                        </p>
                      </div>
                      {!outcome.equippedDrop &&
                        hero.level >= outcome.droppedItem.levelReq && (
                          <button
                            type="button"
                            onClick={() => {
                              onEquipItem(outcome.droppedItem!);
                              setOutcome({ ...outcome, equippedDrop: true });
                            }}
                            className="gold-btn flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-extrabold text-slate-950"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Kuşan
                          </button>
                        )}
                      {outcome.equippedDrop && (
                        <span className="rounded bg-emerald-500/20 px-2 py-1 text-[10px] font-bold text-emerald-300">
                          Kuşanıldı ✓
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {isWorldStage ? (
                  <div
                    className="sticky -bottom-6 -mx-6 mt-4 border-t border-amber-500/25 bg-[#0d1120]/95 px-4 pb-5 pt-3 backdrop-blur-sm"
                    data-testid="victory-actions"
                  >
                    {starStatus && (
                      <div className="mb-2.5 text-left" data-testid="victory-star-status">
                        <div className="flex items-center justify-center gap-1 text-[13px] font-extrabold text-amber-200">
                          {starStatus.stars.map((on, i) => (
                            <Star key={i} className={`h-4 w-4 ${on ? 'fill-amber-300 text-amber-300' : 'text-slate-600'}`} />
                          ))}
                          <span className="ml-1" data-testid="victory-star-count">
                            {starStatus.complete ? '3/3 yıldız · Ustalık tamamlandı' : `${starStatus.count}/3 yıldız`}
                          </span>
                        </div>
                        {starStatus.missing.length > 0 && (
                          <div className="mt-1.5 rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2" data-testid="victory-missing">
                            <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">Eksik ustalık hedefi</p>
                            <ul className="mt-0.5 space-y-0.5">
                              {starStatus.missing.map((m) => (
                                <li key={m} className="flex items-start gap-1.5 break-words text-[12px] leading-snug text-slate-200" data-testid="victory-missing-item">
                                  <span className="text-slate-500">☆</span>
                                  <span className="min-w-0 flex-1">{m}.</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                    {routeRegion ? (
                      <div data-testid="route-actions">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            data-testid="victory-replay"
                            disabled={!victoryRecorded || transitioning}
                            onClick={() => go(() => setBattleKey((k) => k + 1))}
                            className="flex min-w-0 items-center justify-center gap-1.5 rounded-xl border border-amber-400/50 bg-slate-900 px-2 py-3 text-sm font-extrabold text-amber-100 hover:bg-slate-800 disabled:opacity-50"
                          >
                            <RotateCcw className="h-4 w-4 shrink-0" />
                            <span className="truncate">Tekrar Oyna</span>
                          </button>
                          <button
                            type="button"
                            data-testid="route-next"
                            data-next-stage={routeNext?.id ?? ''}
                            disabled={!routeNext || !victoryRecorded || transitioning}
                            onClick={() => {
                              if (routeNext && onStartRouteStage) go(() => onStartRouteStage(routeNext));
                            }}
                            className="gold-btn flex min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 py-3 text-[13px] font-black leading-tight text-slate-950 disabled:cursor-not-allowed disabled:opacity-45 disabled:grayscale"
                          >
                            <Swords className="h-4 w-4 shrink-0" />
                            <span className="min-w-0">Sıradaki Eksik Aşama</span>
                          </button>
                        </div>
                        {routeSummary?.complete ? (
                          <p className="mt-1.5 flex items-center justify-center gap-1.5 rounded-lg border border-amber-300/60 bg-amber-500/15 py-1.5 text-[12px] font-extrabold text-amber-200" data-testid="route-region-complete">
                            <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" /> Bölge Ustalığı Tamamlandı
                          </p>
                        ) : (
                          <p className="mt-1.5 truncate text-center text-[11px] text-slate-400" data-testid="route-next-name">
                            {routeNext
                              ? `Sıradaki: ${routeNext.name} · ${3 - victoryStarStatus(save, routeNext.id).count} eksik yıldız`
                              : 'Bu bölgede eksik ustalık aşaması bulunmuyor'}
                          </p>
                        )}
                        <button
                          type="button"
                          data-testid="route-back-region"
                          onClick={() => go(() => onBackToRegion?.(stage.id))}
                          disabled={transitioning}
                          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800"
                        >
                          <Map className="h-4 w-4" />
                          Bölgeye Dön
                        </button>
                      </div>
                    ) : (<>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        data-testid="victory-replay"
                        disabled={!victoryRecorded || transitioning}
                        onClick={() => go(() => setBattleKey((k) => k + 1))}
                        className="flex min-w-0 items-center justify-center gap-1.5 rounded-xl border border-amber-400/50 bg-slate-900 px-2 py-3 text-sm font-extrabold text-amber-100 hover:bg-slate-800 disabled:opacity-50"
                      >
                        <RotateCcw className="h-4 w-4 shrink-0" />
                        <span className="truncate">Tekrar Oyna</span>
                      </button>
                      {nextChoice?.kind === 'next' ? (
                        <button
                          type="button"
                          data-testid="victory-next"
                          data-next-stage={nextChoice.stage.id}
                          disabled={!nextChoice.unlocked || !victoryRecorded || transitioning}
                          aria-disabled={!nextChoice.unlocked}
                          title={nextChoice.unlocked ? nextChoice.stage.name : `${nextChoice.stage.name} kilitli`}
                          onClick={() => {
                            if (nextChoice.unlocked) go(() => onNextStage(nextChoice.stage));
                          }}
                          className="gold-btn flex min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 py-3 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-45 disabled:grayscale"
                        >
                          <Swords className="h-4 w-4 shrink-0" />
                          <span className="truncate">Sonraki Aşama</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          data-testid="victory-next-map"
                          onClick={onExitToMap}
                          className="gold-btn flex min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 py-3 text-sm font-black text-slate-950"
                        >
                          <Map className="h-4 w-4 shrink-0" />
                          <span className="truncate">Haritaya Dön</span>
                        </button>
                      )}
                    </div>
                    {nextChoice?.kind === 'next' && (
                      <p className="mt-1.5 truncate text-center text-[11px] text-slate-400" data-testid="victory-next-name">
                        {nextChoice.unlocked ? `Sıradaki: ${nextChoice.stage.name}` : `${nextChoice.stage.name} kilitli`}
                      </p>
                    )}
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {nextChoice?.kind === 'next' && (
                        <button
                          type="button"
                          data-testid="victory-map"
                          onClick={onExitToMap}
                          className={`flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800 ${onExitToMenu ? '' : 'col-span-2'}`}
                        >
                          <Map className="h-4 w-4" />
                          {exitLabel}
                        </button>
                      )}
                      {onExitToMenu && (
                        <button
                          type="button"
                          onClick={onExitToMenu}
                          data-testid="battle-exit-menu"
                          className={`flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800 ${nextChoice?.kind === 'next' ? '' : 'col-span-2'}`}
                        >
                          <Home className="h-4 w-4" />
                          Ana Menüye Dön
                        </button>
                      )}
                    </div>
                    </>)}
                  </div>
                ) : (
                <div className="mt-5 flex flex-col gap-2.5">
                  {nextStage && (
                    <button
                      type="button"
                      onClick={() => onNextStage(nextStage)}
                      className="gold-btn flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-black text-slate-950"
                    >
                      <Swords className="h-4 w-4" />
                      Sonraki Aşama: {nextStage.name} →
                    </button>
                  )}
                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => setBattleKey((k) => k + 1)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Tekrar Oyna
                    </button>
                    <button
                      type="button"
                      onClick={onExitToMap}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800"
                    >
                      <Map className="h-4 w-4" />
                      {exitLabel}
                    </button>
                  </div>
                  {onExitToMenu && (
                    <button
                      type="button"
                      onClick={onExitToMenu}
                      data-testid="battle-exit-menu"
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800"
                    >
                      <Home className="h-4 w-4" />
                      Ana Menüye Dön
                    </button>
                  )}
                </div>
                )}
              </>
            ) : (
              <>
                <h2 className="font-display text-3xl font-black text-rose-400">YENİLGİ</h2>
                {isLeague && outcome.leaguePointsChange !== undefined && (
                  <div className="mt-3 rounded-xl border border-rose-400/35 bg-rose-950/25 px-3 py-2 text-sm font-bold text-rose-200">
                    {outcome.leaguePointsChange} lig puanı <span className="text-xs font-normal text-slate-300">· Toplam {outcome.leaguePoints}</span>
                  </div>
                )}
                <p className="mt-2 text-xs leading-relaxed text-slate-300">
                  {stage.enemy.name} bu sefer çok güçlü çıktı! Ekipmanlarını geliştir, Yetenek
                  Ağacından yeni güçler aç ve düşmanın zayıflığı olan{' '}
                  <strong className="text-amber-300">{GEM_INFO[stage.enemy.weakness].name}</strong>{' '}
                  eşleşmelerine odaklan!
                </p>
                <div className="mt-5 flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setBattleKey((k) => k + 1)}
                    className="gold-btn flex flex-1 items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-extrabold text-slate-950"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Tekrar Dene
                  </button>
                  <button
                    type="button"
                    onClick={onExitToMap}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 py-3 text-xs font-bold text-slate-200"
                  >
                    <Map className="h-4 w-4" />
                    {exitLabel}
                  </button>
                </div>
                {onExitToMenu && (
                  <button
                    type="button"
                    onClick={onExitToMenu}
                    data-testid="battle-exit-menu"
                    className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800"
                  >
                    <Home className="h-4 w-4" />
                    Ana Menüye Dön
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
