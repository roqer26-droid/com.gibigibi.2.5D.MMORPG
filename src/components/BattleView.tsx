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
  AlertTriangle,
  RotateCcw,
  Map,
  Coins,
  Gem,
  ShieldCheck,
  BookOpen,
  Lock,
  X,
  Swords,
} from 'lucide-react';
import { SoundEngine } from '../audio/SoundEngine';
import { HERO_CLASSES } from '../data/classes';
import { ARENA_IMAGES } from '../data/huntArt';
import type { HuntDef } from '../data/hunts';
import type { HuntOutcome } from '../state/saveActions';
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
import { computeHeroBuild } from '../utils/rpgLogic';
import { ItemArtSvg } from './ItemCard';

interface BattleViewProps {
  save: GameSaveState;
  stage: StageDef;
  onMatchStats: (gemsMatched: Partial<Record<GemType, number>>, combo: number, skillUsed: boolean) => void;
  onCompleteVictory: (stage: StageDef) => BattleRewardSummary;
  isLeague?: boolean;
  onLeagueDefeat?: () => BattleRewardSummary;
  onLeagueForfeit?: () => void;
  /** Boss Avı modu: av tanımı ve zafer kaydı */
  hunt?: HuntDef;
  onHuntVictory?: (hunt: HuntDef, turns: number) => HuntOutcome;
  onExitToMap: () => void;
  onNextStage: (stage: StageDef) => void;
  onEquipItem: (item: EquipmentItem) => void;
  onOpenSettings: () => void;
}

export const BattleView: React.FC<BattleViewProps> = ({
  save,
  stage,
  onMatchStats,
  onCompleteVictory,
  isLeague = false,
  onLeagueDefeat,
  onLeagueForfeit,
  hunt,
  onHuntVictory,
  onExitToMap,
  onNextStage,
  onEquipItem,
  onOpenSettings,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<BattleScene | null>(null);
  const forfeitedRef = useRef(false);

  const hero = save.heroes[save.activeHeroClass];
  const cls = HERO_CLASSES[hero.classId];
  const build = useMemo(() => computeHeroBuild(hero), [hero]);
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
    heroHp: build.stats.health,
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
    enemyNextWarning: `${stage.enemy.attackInterval} tur sonra saldıracak`,
    comboCount: 0,
    turnPhase: 'player',
    skillCooldowns: {},
    turnNumber: 1,
  });

  const [paused, setPaused] = useState(false);
  const [showSkillBook, setShowSkillBook] = useState(false);
  const [confirmForfeit, setConfirmForfeit] = useState(false);
  const [battleKey, setBattleKey] = useState(0);
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
  } | null>(null);
  const isHunt = !!hunt;
  const exitLabel = isHunt ? 'Avlara Dön' : isLeague ? 'Lige Dön' : 'Haritaya Dön';

  // Latest callbacks in refs so Phaser never holds stale closures
  const callbacksRef = useRef({ onMatchStats, onCompleteVictory, onLeagueDefeat, onHuntVictory });
  callbacksRef.current = { onMatchStats, onCompleteVictory, onLeagueDefeat, onHuntVictory };

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
    forfeitedRef.current = false;
    let resolved = false;
    const initData: BattleSceneInitData = {
      hero,
      build,
      stage,
      settings: save.settings,
      onCombatUpdate: (snap) => setSnapshot(snap),
      onMatchStats: (gems, combo, skillUsed) =>
        callbacksRef.current.onMatchStats(gems, combo, skillUsed),
      hunt,
      arenaImage: hunt ? ARENA_IMAGES[hunt.id] : undefined,
      onBattleEnd: (victory, turns) => {
        if (resolved) return;
        resolved = true;
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
          const res = callbacksRef.current.onCompleteVictory(stage);
          setOutcome({
            victory: true,
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
    if (import.meta.env.VITE_E2E) (window as unknown as { __battleScene?: BattleScene }).__battleScene = battleScene;

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
  }, [paused, outcome, showSkillBook, cls.ultimateSkill.id, loadout]);

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

  return (
    <div className="game-no-scroll flex h-full w-full flex-col bg-[#080b14] overflow-hidden">
      {/* TOP COMBAT HUD */}
      <div className="z-20 border-b border-amber-500/25 bg-slate-950/95 px-2.5 py-2 sm:px-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
          {/* Hero Bars */}
          <div className="min-w-0 flex-1 max-w-[260px]">
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
            <div className="relative mt-0.5 h-3.5 w-full overflow-hidden rounded-full bg-slate-800 border border-slate-700">
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
              <div className="relative h-2.5 overflow-hidden rounded-full bg-slate-800">
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
          <div className="flex flex-col items-center justify-center shrink-0">
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
            {snapshot.comboCount >= 2 ? (
              <span className="mt-0.5 text-[11px] font-black text-amber-300 animate-pulse">
                KOMBO x{snapshot.comboCount}!
              </span>
            ) : (
              <span className="mt-0.5 text-[10px] text-slate-400">Tur {snapshot.turnNumber}</span>
            )}
          </div>

          {/* Enemy / Boss Bars */}
          <div className="min-w-0 flex-1 max-w-[270px] text-right">
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
              className={`relative mt-0.5 h-3.5 w-full overflow-hidden rounded-full bg-slate-800 border ${
                stage.enemy.isBoss ? 'border-rose-500/60' : 'border-slate-700'
              }`}
            >
              <div
                className={`h-full transition-all duration-300 ${
                  stage.enemy.isBoss
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
            {/* Enemy Attack Warning */}
            <div
              className={`mt-1 flex items-center justify-end gap-1 truncate text-[10px] font-semibold ${
                snapshot.enemyTurnCounter <= 1 && snapshot.enemyFrozenTurns === 0
                  ? 'text-rose-300 animate-pulse'
                  : 'text-slate-300'
              }`}
            >
              {snapshot.enemyTurnCounter <= 1 && snapshot.enemyFrozenTurns === 0 && (
                <AlertTriangle className="h-3 w-3 shrink-0 text-rose-400" />
              )}
              <span className="truncate">{snapshot.enemyNextWarning}</span>
            </div>
          </div>
        </div>
      </div>

      {/* PHASER 3 ARENA + BOARD CANVAS */}
      <div ref={mountRef} className="game-no-scroll relative flex-1 min-h-0 w-full overflow-hidden" />

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
            <div className="flex flex-1 items-stretch gap-1.5 overflow-x-auto pb-1">
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
            {outcome.victory && hunt ? (
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
                </div>
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
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
