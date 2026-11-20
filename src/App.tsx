import { lazy, Suspense, useCallback, useEffect, useRef, useState, type SetStateAction } from 'react';
import { SoundEngine } from './audio/SoundEngine';
import type { EquipPlan } from './game/equipPlanner';
import { exitNativeApp, onNativeBack } from './native';
import { findStageById } from './data/world';
import { LevelUpModal, LootRevealModal } from './components/CelebrationModals';
import { EquipmentInventoryScreen, type EquipSelection } from './components/EquipmentInventoryScreen';
import { UpgradeScreen } from './components/UpgradeScreen';
import { HeroesScreen } from './components/HeroesScreen';
import { MainMenu } from './components/MainMenu';
import { QuestsScreen } from './components/QuestsScreen';
import { SettingsModal } from './components/SettingsModal';
import { SkillTreeScreen } from './components/SkillTreeScreen';
import type { WorldNav, WorldView } from './components/WorldMapScreen';
import { HERO_CLASSES } from './data/classes';
import type { HuntDef } from './data/hunts';
import { chooseDungeonRelic, completeDungeonBattle, dungeonBattleStage, dungeonStartHp, endDungeonRun, getDungeon, startDungeonRun } from './data/dungeons';
import type { DungeonId, RelicId } from './types/game';
import { generateEquipmentItem } from './data/items';
import { rollSetDrop } from './data/sets';
import { createLeagueStage, LEAGUE_TIERS, recordLeagueResult, type LeagueOpponent } from './data/league';
import { QUESTS_LIST } from './data/quests';
import { computeEnchantAura, ENCHANT_TIERS } from './phaser/HeroRenderer';
import { RARITY_META } from './data/skills';
import {
  EquipmentItem,
  EquipmentSlot,
  BattleRewardSummary,
  GameSaveState,
  GameSettings,
  GemType,
  HeroClassId,
  QuestDef,
  QuestCategory,
  Rarity,
  StageDef,
  HuntId,
} from './types/game';
import {
  applyXpToHero,
  getQuestCurrentValue,
} from './utils/rpgLogic';
import { isQuestClaimed, markQuestClaimed, recordQuestActivity, refreshProgressPeriods } from './utils/questProgress';
import {
  applyEquipPlan,
  dismantleCommonItems,
  dismantleItem,
  enhanceItem,
  equipItem,
  resetSkills,
  selectHero,
  sellItem,
  unequipSlot,
  unlockHero,
  upgradeSkillNode,
  recordHuntVictory,
  type ActionResult,
  type SoundCue,
} from './state/saveActions';
import { exportSaveString, importSaveString, loadGameState, resetGameState, saveGameState } from './utils/storage';

type AppRoute = 'menu' | 'battle' | 'heroes' | 'equipment' | 'skills' | 'world' | 'quests' | 'achievements' | 'league' | 'hunts' | 'dungeons' | 'upgrade';

// Ağır modüller (Phaser + savaş sahnesi, lig görselleri) yalnızca ihtiyaç olunca yüklenir.
const BattleView = lazy(() =>
  import('./components/BattleView').then((m) => ({ default: m.BattleView }))
);
const WorldMapScreen = lazy(() =>
  import('./components/WorldMapScreen').then((m) => ({ default: m.WorldMapScreen }))
);
const HuntsScreen = lazy(() =>
  import('./components/HuntsScreen').then((m) => ({ default: m.HuntsScreen }))
);
const DungeonScreen = lazy(() =>
  import('./components/DungeonScreen').then((m) => ({ default: m.DungeonScreen }))
);
const LeagueScreen = lazy(() =>
  import('./components/LeagueScreen').then((m) => ({ default: m.LeagueScreen }))
);

function RouteLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#090b15] text-sm font-bold text-amber-300">
      Yükleniyor…
    </div>
  );
}

const SOUND_CUES: Record<SoundCue, () => void> = {
  gemSelect: () => SoundEngine.playGemSelect(),
  gemSwap: () => SoundEngine.playGemSwap(),
  levelUp: () => SoundEngine.playLevelUp(),
  lootReveal: () => SoundEngine.playLootReveal(false),
  lootRevealBig: () => SoundEngine.playLootReveal(true),
  matchArcane: () => SoundEngine.playGemMatch(2, 'arcane'),
};

export function App() {
  // Kayıt yalnızca ilk açılışta okunur (20 kahramanlı kayıt her karede ayrıştırılmasın)
  const [initial] = useState(loadGameState);
  const [save, setSaveState] = useState<GameSaveState>(initial.save);
  const saveRef = useRef(save);
  // Phaser may emit several match and victory events before React renders again.
  const setSave = useCallback((update: SetStateAction<GameSaveState>) => {
    const next = typeof update === 'function' ? update(saveRef.current) : update;
    if (next !== saveRef.current) {
      saveRef.current = next;
      setSaveState(next);
    }
  }, []);
  const [isExistingSave] = useState<boolean>(initial.isExistingSave);
  const [route, setRoute] = useState<AppRoute>('menu');
  const [questTab, setQuestTab] = useState<QuestCategory>('main');
  const [questBack, setQuestBack] = useState<'menu' | 'league'>('menu');
  const [activeStage, setActiveStage] = useState<StageDef | null>(null);
  const [activeHunt, setActiveHunt] = useState<HuntDef | null>(null);
  const [selectedHuntId, setSelectedHuntId] = useState<HuntId | null>(null);
  // Seçimli Zindan: açık savaşın sabit parametreleri (kayıttaki deneme savaş sonunda değişse de savaş ekranı sabit kalır)
  const [dungeonBattle, setDungeonBattle] = useState<{ id: DungeonId; battleNo: number; total: number; relics: RelicId[]; startHp: number } | null>(null);
  const [dungeonJustCompleted, setDungeonJustCompleted] = useState(false);
  // Ekipman Geliştir: nereden açıldı (geri dönüş) ve açılışta seçili eşya; ekipman ekranındaki seçim geri dönüşte korunur
  const [upgradeOrigin, setUpgradeOrigin] = useState<'menu' | 'equipment'>('menu');
  const [upgradeInitialId, setUpgradeInitialId] = useState<string | null>(null);
  const equipSelRef = useRef<EquipSelection | null>(null);
  // Dünya Haritası gezinti durumu: harita/aşama görünümü + seçili bölge + kaydırma konumu.
  // Aşama ekranından ve savaştan dönünce korunur; ana menüden girişte sıfırlanır.
  const [worldView, setWorldView] = useState<WorldView>('map');
  const worldNavRef = useRef<WorldNav | null>(null);
  const resetWorldNav = () => {
    worldNavRef.current = null;
    setWorldView('map');
  };
  const [activeLeagueOpponent, setActiveLeagueOpponent] = useState<LeagueOpponent | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const [levelUpPopup, setLevelUpPopup] = useState<{
    newLevel: number;
    levelsGained: number;
  } | null>(null);
  const [lootPopup, setLootPopup] = useState<{ item: EquipmentItem; title: string } | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const pushToast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => {
      setToastMsg((cur) => (cur === msg ? null : cur));
    }, 2600);
  }, []);

  // Android geri tuşu: savaşta duraklat, menü dışında menüye dön, menüde çık
  const backRef = useRef<() => void>(() => {});
  backRef.current = () => {
    if (showSettings) return setShowSettings(false);
    if (route === 'battle') {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      return;
    }
    if (route === 'dungeons') return setRoute('menu');
    if (route === 'quests' || route === 'achievements') return setRoute(questBack);
    if (route === 'upgrade') return setRoute(upgradeOrigin);
    if (route === 'hunts') {
      if (selectedHuntId) return setSelectedHuntId(null);
      return setRoute('menu');
    }
    if (route === 'world' && worldView === 'stages') return setWorldView('map');
    if (route !== 'menu') return setRoute('menu');
    exitNativeApp();
  };
  useEffect(() => onNativeBack(() => backRef.current()), []);

  // Auto-save whenever state updates
  useEffect(() => {
    saveGameState(save);
    SoundEngine.updateSettings(save.settings);
  }, [save]);

  useEffect(() => {
    const refresh = () => setSave((current) => refreshProgressPeriods(current));
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [setSave]);

  // Unlock Web Audio on first user interaction & play ambient menu music
  useEffect(() => {
    const unlock = () => {
      SoundEngine.unlock();
      SoundEngine.updateSettings(save.settings);
      if (route !== 'battle') {
        SoundEngine.setMusicMode('menu');
      }
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  /** Saf kayıt işlemini uygular; toast ve ses isteğini UI katmanında yürütür. */
  const runAction = useCallback(
    (action: (current: GameSaveState) => ActionResult) => {
      const result = action(saveRef.current);
      setSave(result.save);
      if (result.sound) SOUND_CUES[result.sound]();
      if (result.toast) pushToast(result.toast);
      return result;
    },
    [setSave, pushToast]
  );

  const handleSelectHero = (classId: HeroClassId) => runAction((s) => selectHero(s, classId));
  const handleUnlockHero = (classId: HeroClassId) => runAction((s) => unlockHero(s, classId));
  const handleEquipItem = useCallback(
    (item: EquipmentItem, slot?: EquipmentSlot) => runAction((s) => equipItem(s, item, slot)),
    [runAction]
  );
  const handleUnequipSlot = (slot: EquipmentSlot) => runAction((s) => unequipSlot(s, slot));
  const handleDismantleItem = (itemId: string) => runAction((s) => dismantleItem(s, itemId));
  const handleSellItem = (itemId: string) => runAction((s) => sellItem(s, itemId));
  const handleApplyEquipPlan = (plan: EquipPlan) => runAction((s) => applyEquipPlan(s, plan));
  const handleDismantleLowRarity = () => runAction(dismantleCommonItems);
  const handleUpgradeSkillNode = (nodeId: string) => runAction((s) => upgradeSkillNode(s, nodeId));
  const handleResetSkills = () => runAction(resetSkills);

  const handleEnhanceItem = (itemId: string, isEquipped: boolean, slot?: EquipmentSlot) => {
    const before = saveRef.current;
    const result = runAction((s) => enhanceItem(s, itemId, isEquipped, slot));
    if (result.save === before) return;
    // Aura kademesi atladıysa kahramanın üzerindeki parlama güçlenir
    const beforeTier = computeEnchantAura(before.heroes[before.activeHeroClass]).tier;
    const afterTier = computeEnchantAura(result.save.heroes[result.save.activeHeroClass]).tier;
    if (afterTier > beforeTier) {
      window.setTimeout(() => {
        SoundEngine.playLootReveal(true);
        pushToast(`✨ BÜYÜ AURASI YÜKSELDİ: ${ENCHANT_TIERS[afterTier].name}! Kahramanın artık daha çok parlıyor.`);
      }, 700);
    }
  };

  const handleMatchStats = useCallback(
    (gemsMatched: Partial<Record<GemType, number>>, combo: number, skillUsed: boolean) => {
      setSave((prev) => {
        const nextGems = { ...prev.stats.totalGemsMatched };
        let matchHappened = false;
        (Object.keys(gemsMatched) as GemType[]).forEach((g) => {
          const val = gemsMatched[g] ?? 0;
          if (val > 0) {
            nextGems[g] = (nextGems[g] ?? 0) + val;
            matchHappened = true;
          }
        });
        return recordQuestActivity({
          ...prev,
          stats: {
            ...prev.stats,
            totalMatches: prev.stats.totalMatches + (matchHappened ? 1 : 0),
            totalGemsMatched: nextGems,
            highestCombo: Math.max(prev.stats.highestCombo, combo),
            skillsCast: prev.stats.skillsCast + (skillUsed ? 1 : 0),
          },
        }, { gems: gemsMatched, match: matchHappened, combo, skill: skillUsed });
      });
    },
    [setSave]
  );

  const rollStageRarity = (stage: StageDef): Rarity => {
    if (stage.rewards.guaranteedRarity) return stage.rewards.guaranteedRarity;
    const r = Math.random();
    if (stage.recommendedLevel >= 42) {
      if (r < 0.2) return 'mythic';
      if (r < 0.62) return 'legendary';
      return 'epic';
    }
    if (stage.recommendedLevel >= 30) {
      if (r < 0.1) return 'mythic';
      if (r < 0.44) return 'legendary';
      if (r < 0.8) return 'epic';
      return 'rare';
    }
    if (stage.recommendedLevel >= 22) {
      if (r < 0.08) return 'mythic';
      if (r < 0.35) return 'legendary';
      if (r < 0.7) return 'epic';
      return 'rare';
    }
    if (stage.recommendedLevel >= 12) {
      if (r < 0.14) return 'legendary';
      if (r < 0.45) return 'epic';
      if (r < 0.78) return 'rare';
      return 'uncommon';
    }
    if (stage.recommendedLevel >= 5) {
      if (r < 0.15) return 'epic';
      if (r < 0.48) return 'rare';
      if (r < 0.8) return 'uncommon';
      return 'common';
    }
    if (r < 0.18) return 'rare';
    if (r < 0.58) return 'uncommon';
    return 'common';
  };

  const handleLeagueResult = (victory: boolean, forfeited = false): BattleRewardSummary => {
    const current = refreshProgressPeriods(saveRef.current);
    const hero = current.heroes[current.activeHeroClass];
    const opponent = activeLeagueOpponent;
    const stage = activeStage;
    if (!opponent || !stage) {
      return { xpGained: 0, goldGained: 0, crystalsGained: 0, droppedItem: null, leveledUp: false, newLevel: hero.level };
    }

    const leagueResult = recordLeagueResult(current.league, opponent, victory, forfeited);
    const xpGained = victory ? stage.rewards.xp : 0;
    const goldGained = victory ? stage.rewards.gold : 0;
    const crystalsGained = victory ? stage.rewards.crystals : 0;
    const xpResult = applyXpToHero(hero, xpGained);
    const droppedItem = victory && Math.random() < stage.rewards.dropChance
      ? generateEquipmentItem({
          level: hero.level,
          rarity: rollStageRarity(stage),
          preferredClass: current.activeHeroClass,
        })
      : null;

    const next: GameSaveState = {
      ...current,
      league: leagueResult.league,
      gold: current.gold + goldGained,
      crystals: current.crystals + crystalsGained,
      inventory: droppedItem ? [...current.inventory, droppedItem] : current.inventory,
      heroes: { ...current.heroes, [current.activeHeroClass]: xpResult.updatedHero },
      stats: {
        ...current.stats,
        enemiesDefeated: current.stats.enemiesDefeated + (victory ? 1 : 0),
      },
    };
    setSave(recordQuestActivity(next, {
      win: victory,
      leagueBattle: !forfeited,
      leagueWin: victory,
    }));

    if (xpResult.leveledUp) {
      window.setTimeout(() => {
        SoundEngine.playLevelUp();
        setLevelUpPopup({ newLevel: xpResult.newLevel, levelsGained: xpResult.levelsGained });
      }, 550);
    }
    return {
      xpGained, goldGained, crystalsGained, droppedItem,
      leveledUp: xpResult.leveledUp, newLevel: xpResult.newLevel,
      leaguePointsChange: leagueResult.pointsChange, leaguePoints: leagueResult.league.points,
    };
  };

  const handleCompleteVictory = useCallback(
    (stage: StageDef): BattleRewardSummary => {
      if (activeLeagueOpponent) return handleLeagueResult(true);
      const xpGained = stage.rewards.xp;
      const goldGained = stage.rewards.gold;
      const crystalsGained = stage.rewards.crystals;

      const didDrop =
        Boolean(stage.rewards.guaranteedRarity) || Math.random() <= stage.rewards.dropChance;

      let droppedItem: EquipmentItem | null = null;
      if (didDrop) {
        // Kahraman seviye sınırı (50) üzerindeki aşamalardan düşen eşyalar
        // da kuşanılabilir olsun diye eşya gereksinimi bu sınırda tutulur.
        const dropParams = {
          level: Math.max(1, Math.min(stage.recommendedLevel, 50)),
          rarity: rollStageRarity(stage),
          preferredClass: Math.random() < 0.65 ? save.activeHeroClass : undefined,
        };
        const rolled = generateEquipmentItem(dropParams);
        // Köz / Buzul / Yaşam bölgelerinde uygun yuvadaki eşya %20 ihtimalle set parçası olur
        droppedItem = rollSetDrop(rolled, stage.regionId, ({ slot, element }) =>
          generateEquipmentItem({ ...dropParams, slot, forcedElement: element })
        );
      }

      let leveledUp = false;
      let levelsGained = 0;
      let newLevel = save.heroes[save.activeHeroClass].level;

      setSave((prev) => {
        const hero = prev.heroes[prev.activeHeroClass];
        const xpRes = applyXpToHero(hero, xpGained);
        leveledUp = xpRes.leveledUp;
        levelsGained = xpRes.levelsGained;
        newLevel = xpRes.newLevel;

        const completedStages = prev.completedStages.includes(stage.id)
          ? prev.completedStages
          : [...prev.completedStages, stage.id];

        const bossVictories =
          stage.enemy.bossId && !prev.bossVictories.includes(stage.enemy.bossId)
            ? [...prev.bossVictories, stage.enemy.bossId]
            : prev.bossVictories;

        return recordQuestActivity({
          ...prev,
          gold: prev.gold + goldGained,
          crystals: prev.crystals + crystalsGained,
          completedStages,
          bossVictories,
          inventory: droppedItem ? [...prev.inventory, droppedItem] : prev.inventory,
          heroes: {
            ...prev.heroes,
            [prev.activeHeroClass]: xpRes.updatedHero,
          },
          stats: {
            ...prev.stats,
            enemiesDefeated: prev.stats.enemiesDefeated + 1,
            bossesDefeated: prev.stats.bossesDefeated + (stage.enemy.isBoss ? 1 : 0),
          },
        }, { win: true, bossWin: stage.enemy.isBoss });
      });

      if (droppedItem) {
        SoundEngine.playLootReveal(RARITY_META[droppedItem.rarity].rank >= 4);
      }
      if (leveledUp) {
        window.setTimeout(() => {
          SoundEngine.playLevelUp();
          setLevelUpPopup({ newLevel, levelsGained });
        }, 550);
      }

      return { xpGained, goldGained, crystalsGained, droppedItem, leveledUp, newLevel };
    },
    [save.activeHeroClass, save.heroes, activeLeagueOpponent, activeStage, setSave]
  );

  const handleClaimQuest = (quest: QuestDef) => {
    const current = refreshProgressPeriods(saveRef.current);
    const realQuest = QUESTS_LIST.find((candidate) => candidate.id === quest.id);
    if (!realQuest || isQuestClaimed(realQuest, current) || getQuestCurrentValue(realQuest, current) < realQuest.targetCount) return;
    const rewardItem = realQuest.rewards.itemRarity
      ? generateEquipmentItem({
          level: current.heroes[current.activeHeroClass].level,
          rarity: realQuest.rewards.itemRarity,
          preferredClass: current.activeHeroClass,
        })
      : null;

    let lvPop: { newLevel: number; levelsGained: number } | null = null;

    setSave((prev) => {
      const refreshed = refreshProgressPeriods(prev);
      if (isQuestClaimed(realQuest, refreshed) || getQuestCurrentValue(realQuest, refreshed) < realQuest.targetCount) return refreshed;
      const hero = refreshed.heroes[refreshed.activeHeroClass];
      const xpRes = applyXpToHero(hero, realQuest.rewards.xp);
      if (xpRes.leveledUp) {
        lvPop = { newLevel: xpRes.newLevel, levelsGained: xpRes.levelsGained };
      }

      return markQuestClaimed(realQuest, {
        ...refreshed,
        gold: refreshed.gold + realQuest.rewards.gold,
        crystals: refreshed.crystals + realQuest.rewards.crystals,
        inventory: rewardItem ? [...refreshed.inventory, rewardItem] : refreshed.inventory,
        heroes: {
          ...refreshed.heroes,
          [refreshed.activeHeroClass]: xpRes.updatedHero,
        },
      });
    });

    SoundEngine.playLootReveal(Boolean(realQuest.rewards.itemRarity));
    if (rewardItem) {
      setLootPopup({ item: rewardItem, title: `Görev Ödülü: ${realQuest.title}` });
    }
    if (lvPop) {
      SoundEngine.playLevelUp();
      setLevelUpPopup(lvPop);
    }
    pushToast(`${realQuest.title} ödülleri alındı!`);
  };

  const handleStartStage = (stage: StageDef) => {
    SoundEngine.unlock();
    setDungeonBattle(null);
    setActiveLeagueOpponent(null);
    setActiveHunt(null);
    setActiveStage(stage);
    setRoute('battle');
  };

  const handleStartHunt = (hunt: HuntDef) => {
    const found = findStageById(hunt.storyStageId);
    if (!found) return;
    SoundEngine.unlock();
    setDungeonBattle(null);
    setActiveLeagueOpponent(null);
    setActiveHunt(hunt);
    setActiveStage(found.stage);
    setRoute('battle');
  };

  /** Av zaferini kayda işler (rekor + ilk zafer ödülü tek güncellemede). */
  const handleHuntVictory = (hunt: HuntDef, turns: number) => {
    const outcome = recordHuntVictory(saveRef.current, hunt.id, turns);
    if (outcome.recorded) setSave(outcome.save);
    return outcome;
  };

  /** Kayıttaki zindan denemesinin sıradaki savaşını açar. */
  const enterDungeonBattle = (id: DungeonId) => {
    const cur = saveRef.current;
    const run = cur.dungeons[id].active;
    if (!run || run.phase !== 'battle') return;
    if (run.heroClass && run.heroClass !== cur.activeHeroClass) {
      pushToast(`Bu deneme ${HERO_CLASSES[run.heroClass].name} ile başladı; o kahramanla devam et ya da zindanı bırak.`);
      return;
    }
    const def = getDungeon(id);
    SoundEngine.unlock();
    setActiveLeagueOpponent(null);
    setActiveHunt(null);
    setDungeonJustCompleted(false);
    setDungeonBattle({ id, battleNo: run.battle + 1, total: def.battles.length, relics: [...run.relics], startHp: dungeonStartHp(cur, run) });
    setActiveStage(dungeonBattleStage(def, run.battle, run));
    setRoute('battle');
  };

  const handleDungeonStart = (id: DungeonId) => {
    const res = startDungeonRun(saveRef.current, id);
    if (!res.ok) return res.toast && pushToast(res.toast);
    setSave(res.save);
    enterDungeonBattle(id);
  };

  const handleDungeonChoose = (id: DungeonId, relic: RelicId) => {
    const res = chooseDungeonRelic(saveRef.current, id, relic);
    if (!res.ok) return res.toast && pushToast(res.toast);
    setSave(res.save); // seçim + ilerleme tek güncellemede kaydedilir, sonra savaş açılır
    enterDungeonBattle(id);
  };

  const handleDungeonAbandon = (id: DungeonId) => {
    const res = endDungeonRun(saveRef.current, id);
    if (res.ok) setSave(res.save);
    pushToast('Zindan denemesi bırakıldı.');
  };

  const handleDungeonBattleEnd = (victory: boolean, turns: number, heroHp: number) => {
    const info = dungeonBattle;
    if (!info) return { completed: false, healed: 0 };
    if (!victory) {
      const res = endDungeonRun(saveRef.current, info.id);
      if (res.ok) setSave(res.save);
      return { completed: false, healed: 0 };
    }
    const res = completeDungeonBattle(saveRef.current, info.id, { heroHp, turns });
    if (res.ok) {
      setSave(res.save);
      if (res.completed) setDungeonJustCompleted(true);
    }
    return { completed: res.completed, healed: res.healed };
  };

  const handleStartLeague = (opponent: LeagueOpponent) => {
    const current = refreshProgressPeriods(saveRef.current);
    setSave(current);
    SoundEngine.unlock();
    setDungeonBattle(null);
    setActiveHunt(null);
    setActiveLeagueOpponent(opponent);
    setActiveStage(createLeagueStage(opponent, current.heroes[current.activeHeroClass].level));
    setRoute('battle');
  };

  const handleClaimTier = (tierId: string) => {
    const current = refreshProgressPeriods(saveRef.current);
    const tier = LEAGUE_TIERS.find((entry) => entry.id === tierId);
    if (!tier || current.league.seasonBattles < 1 || current.league.peakPoints < tier.minPoints || current.league.claimedTiers.includes(tier.id)) return;
    setSave({
      ...current,
      gold: current.gold + tier.reward.gold,
      crystals: current.crystals + tier.reward.crystals,
      league: { ...current.league, claimedTiers: [...current.league.claimedTiers, tier.id] },
    });
    SoundEngine.playLootReveal(true);
    pushToast(`${tier.name} kademe ödülü alındı!`);
  };

  const handleClaimSeasonReward = (rewardId: string) => {
    const current = refreshProgressPeriods(saveRef.current);
    const reward = current.league.pendingRewards.find((entry) => entry.id === rewardId);
    if (!reward) return;
    setSave({
      ...current,
      gold: current.gold + reward.gold,
      crystals: current.crystals + reward.crystals,
      league: { ...current.league, pendingRewards: current.league.pendingRewards.filter((entry) => entry.id !== rewardId) },
    });
    SoundEngine.playLootReveal(true);
    pushToast(`${reward.title} alındı!`);
  };

  const handleUpdateSettings = (next: GameSettings) => {
    setSave((prev) => ({ ...prev, settings: next }));
    SoundEngine.updateSettings(next);
  };

  const handleManualSave = () => {
    saveGameState(save);
    pushToast('Oyun başarıyla kaydedildi!');
  };

  const handleImportSave = (text: string): boolean => {
    const imported = importSaveString(text);
    if (!imported) return false;
    setSave(imported);
    setActiveStage(null);
    setActiveLeagueOpponent(null);
    setRoute('menu');
    pushToast('Kayıt yüklendi!');
    return true;
  };

  const handleResetProgress = () => {
    const fresh = resetGameState();
    setSave(fresh);
    setActiveStage(null);
    setActiveLeagueOpponent(null);
    setRoute('menu');
    pushToast('Oyun ilerlemesi sıfırlandı.');
  };

  const activeHero = save.heroes[save.activeHeroClass];

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#080b14] text-slate-100">
      {route === 'menu' && (
        <MainMenu
          save={save}
          isExistingSave={isExistingSave}
          onPlayNextStage={(stage) => {
            resetWorldNav();
            handleStartStage(stage);
          }}
          onNavigate={(dest) => {
            if (dest === 'world') resetWorldNav();
            if (dest === 'equipment') equipSelRef.current = null;
            if (dest === 'upgrade') { setUpgradeOrigin('menu'); setUpgradeInitialId(null); }
            if (dest === 'hunts') setSelectedHuntId(null);
            if (dest === 'dungeons') setDungeonJustCompleted(false);
            if (dest === 'quests') { setQuestTab('main'); setQuestBack('menu'); }
            if (dest === 'achievements') { setQuestTab('achievement'); setQuestBack('menu'); }
            setRoute(dest);
          }}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      {route === 'heroes' && (
        <HeroesScreen
          save={save}
          onBack={() => setRoute('menu')}
          onSelectHero={handleSelectHero}
          onUnlockHero={handleUnlockHero}
          onOpenSkillTree={() => setRoute('skills')}
        />
      )}

      {route === 'equipment' && (
        <EquipmentInventoryScreen
          save={save}
          onBack={() => setRoute('menu')}
          onEquipItem={handleEquipItem}
          onUnequipSlot={handleUnequipSlot}
          initialSelection={equipSelRef.current}
          onSelectionChange={(sel) => { equipSelRef.current = sel; }}
          onOpenUpgrade={(sel) => {
            equipSelRef.current = sel;
            setUpgradeOrigin('equipment');
            setUpgradeInitialId(sel.id);
            setRoute('upgrade');
          }}
          onDismantleItem={handleDismantleItem}
          onSellItem={handleSellItem}
          onApplyEquipPlan={handleApplyEquipPlan}
          onDismantleLowRarity={handleDismantleLowRarity}
        />
      )}

      {route === 'upgrade' && (
        <UpgradeScreen
          save={save}
          initialItemId={upgradeInitialId}
          onEnhance={handleEnhanceItem}
          onBack={(selected) => {
            if (upgradeOrigin === 'equipment' && selected) equipSelRef.current = selected;
            setRoute(upgradeOrigin);
          }}
        />
      )}

      {route === 'skills' && (
        <SkillTreeScreen
          save={save}
          onBack={() => setRoute('menu')}
          onUpgradeSkillNode={handleUpgradeSkillNode}
          onResetSkills={handleResetSkills}
        />
      )}

      {route === 'world' && (
        <Suspense fallback={<RouteLoading />}>
          <WorldMapScreen
            save={save}
            onBack={() => setRoute('menu')}
            onStartStage={handleStartStage}
            view={worldView}
            onViewChange={setWorldView}
            nav={worldNavRef}
          />
        </Suspense>
      )}

      {(route === 'quests' || route === 'achievements') && (
        <QuestsScreen
          key={route}
          mode={route}
          save={save}
          onBack={() => setRoute(questBack)}
          onClaimQuest={handleClaimQuest}
          onOpenLeague={() => setRoute('league')}
          initialTab={questTab}
        />
      )}

      <Suspense fallback={<RouteLoading />}>
      {route === 'league' && (
        <LeagueScreen
          save={save}
          onBack={() => setRoute('menu')}
          onOpenQuests={() => { setQuestTab('league'); setQuestBack('league'); setRoute('achievements'); }}
          onStartOpponent={handleStartLeague}
          onClaimTier={handleClaimTier}
          onClaimPending={handleClaimSeasonReward}
        />
      )}

      {route === 'hunts' && (
        <HuntsScreen
          save={save}
          selectedId={selectedHuntId}
          onSelect={setSelectedHuntId}
          onBack={() => setRoute('menu')}
          onStart={handleStartHunt}
        />
      )}

      {route === 'dungeons' && (
        <DungeonScreen
          save={save}
          dungeonId="roots_vault"
          justCompleted={dungeonJustCompleted}
          onBack={() => { setDungeonJustCompleted(false); setRoute('menu'); }}
          onStart={() => handleDungeonStart('roots_vault')}
          onEnterBattle={() => enterDungeonBattle('roots_vault')}
          onChoose={(relic) => handleDungeonChoose('roots_vault', relic)}
          onAbandon={() => handleDungeonAbandon('roots_vault')}
        />
      )}

      {route === 'battle' && activeStage && (
        <BattleView
          dungeon={dungeonBattle ?? undefined}
          onDungeonBattleEnd={handleDungeonBattleEnd}
          hunt={activeHunt ?? undefined}
          onHuntVictory={handleHuntVictory}
          save={save}
          stage={activeStage}
          onMatchStats={handleMatchStats}
          onCompleteVictory={handleCompleteVictory}
          isLeague={!!activeLeagueOpponent}
          onLeagueDefeat={activeLeagueOpponent ? () => handleLeagueResult(false) : undefined}
          onLeagueForfeit={activeLeagueOpponent ? () => { handleLeagueResult(false, true); } : undefined}
          onExitToMap={() => {
            if (dungeonBattle) { setRoute('dungeons'); return; }
            if (activeHunt) { setSelectedHuntId(null); setRoute('hunts'); return; }
            setRoute(activeLeagueOpponent ? 'league' : 'world');
          }}
          onNextStage={handleStartStage}
          onEquipItem={(itm) => handleEquipItem(itm)}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}
      </Suspense>

      {/* Modals */}
      {showSettings && (
        <SettingsModal
          settings={save.settings}
          onUpdateSettings={handleUpdateSettings}
          onManualSave={handleManualSave}
          onResetProgress={handleResetProgress}
          onExportSave={() => exportSaveString(saveRef.current)}
          onImportSave={handleImportSave}
          onClose={() => setShowSettings(false)}
        />
      )}

      {lootPopup && (
        <LootRevealModal
          item={lootPopup.item}
          title={lootPopup.title}
          heroLevel={activeHero.level}
          onEquipNow={() => {
            handleEquipItem(lootPopup.item);
            setLootPopup(null);
          }}
          onClose={() => setLootPopup(null)}
        />
      )}

      {levelUpPopup && (
        <LevelUpModal
          newLevel={levelUpPopup.newLevel}
          levelsGained={levelUpPopup.levelsGained}
          onClose={() => setLevelUpPopup(null)}
        />
      )}

      {/* Floating Notification Toast */}
      {toastMsg && (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-[60] -translate-x-1/2 animate-pop-scale rounded-full border border-amber-400/60 bg-slate-950/95 px-5 py-2 text-xs font-bold text-amber-200 shadow-[0_8px_24px_rgba(0,0,0,0.75)]">
          ✨ {toastMsg}
        </div>
      )}
    </div>
  );
}

export default App;
