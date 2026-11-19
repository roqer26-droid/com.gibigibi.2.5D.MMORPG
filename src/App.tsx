import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react';
import { SoundEngine } from './audio/SoundEngine';
import { BattleView } from './components/BattleView';
import { LevelUpModal, LootRevealModal } from './components/CelebrationModals';
import { EquipmentInventoryScreen } from './components/EquipmentInventoryScreen';
import { HeroesScreen } from './components/HeroesScreen';
import { MainMenu } from './components/MainMenu';
import { LeagueScreen } from './components/LeagueScreen';
import { QuestsScreen } from './components/QuestsScreen';
import { SettingsModal } from './components/SettingsModal';
import { SkillTreeScreen } from './components/SkillTreeScreen';
import { WorldMapScreen } from './components/WorldMapScreen';
import { HERO_CLASSES } from './data/classes';
import { generateEquipmentItem } from './data/items';
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
} from './types/game';
import {
  applyXpToHero,
  getDismantleYield,
  getEnhanceCost,
  getItemPowerScore,
  getQuestCurrentValue,
} from './utils/rpgLogic';
import { isQuestClaimed, markQuestClaimed, recordQuestActivity, refreshProgressPeriods } from './utils/questProgress';
import { loadGameState, resetGameState, saveGameState } from './utils/storage';

type AppRoute = 'menu' | 'battle' | 'heroes' | 'equipment' | 'skills' | 'world' | 'quests' | 'league';

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

  const handleSelectHero = (classId: HeroClassId) => {
    setSave((prev) => {
      if (!prev.heroUnlocks.includes(classId)) return prev;
      return { ...prev, activeHeroClass: classId };
    });
    pushToast(`${HERO_CLASSES[classId].name} aktif kahraman seçildi!`);
  };

  /** Yeni kahramanları Altın + Kristal karşılığında aç */
  const handleUnlockHero = (classId: HeroClassId) => {
    const cls = HERO_CLASSES[classId];
    if (!cls.unlockCost) return;
    if (save.heroUnlocks.includes(classId)) return;
    if (save.gold < cls.unlockCost.gold || save.crystals < cls.unlockCost.crystals) {
      pushToast('Yetersiz Altın veya Kristal! Savaş kazanarak kaynak topla.');
      return;
    }
    setSave((prev) => ({
      ...prev,
      gold: prev.gold - cls.unlockCost!.gold,
      crystals: prev.crystals - cls.unlockCost!.crystals,
      heroUnlocks: [...prev.heroUnlocks, classId],
      activeHeroClass: classId,
    }));
    SoundEngine.playLootReveal(true);
    pushToast(`${cls.name} — ${cls.title} kadroya katıldı!`);
  };

  const handleEquipItem = useCallback(
    (item: EquipmentItem, explicitSlot?: EquipmentSlot) => {
      setSave((prev) => {
        const hero = prev.heroes[prev.activeHeroClass];
        if (hero.level < item.levelReq) return prev;

        let targetSlot = explicitSlot ?? item.slot;
        if (!explicitSlot && (item.slot === 'ring1' || item.slot === 'ring2')) {
          if (hero.equipped.ring1 && !hero.equipped.ring2) targetSlot = 'ring2';
          else targetSlot = 'ring1';
        }

        const itemToEquip = { ...item, slot: targetSlot };
        const previouslyEquipped = hero.equipped[targetSlot];
        const nextInv = prev.inventory.filter((i) => i.id !== item.id);
        if (previouslyEquipped) {
          nextInv.push(previouslyEquipped);
        }

        return {
          ...prev,
          inventory: nextInv,
          heroes: {
            ...prev.heroes,
            [prev.activeHeroClass]: {
              ...hero,
              equipped: {
                ...hero.equipped,
                [targetSlot]: itemToEquip,
              },
            },
          },
        };
      });
      SoundEngine.playGemSelect();
      pushToast(`${item.name} kuşanıldı!`);
    },
    [pushToast]
  );

  const handleUnequipSlot = (slot: EquipmentSlot) => {
    setSave((prev) => {
      const hero = prev.heroes[prev.activeHeroClass];
      const eq = hero.equipped[slot];
      if (!eq) return prev;
      const nextEquipped = { ...hero.equipped };
      delete nextEquipped[slot];
      return {
        ...prev,
        inventory: [...prev.inventory, eq],
        heroes: {
          ...prev.heroes,
          [prev.activeHeroClass]: { ...hero, equipped: nextEquipped },
        },
      };
    });
  };

  const handleEnhanceItem = (itemId: string, isEquipped: boolean, slot?: EquipmentSlot) => {
    setSave((prev) => {
      const hero = prev.heroes[prev.activeHeroClass];
      const target = isEquipped && slot ? hero.equipped[slot] : prev.inventory.find((i) => i.id === itemId);
      if (!target || target.upgradeLevel >= 10) return prev;

      const cost = getEnhanceCost(target);
      if (prev.gold < cost.gold || prev.crystals < cost.crystals) return prev;

      const upgraded: EquipmentItem = { ...target, upgradeLevel: target.upgradeLevel + 1 };
      SoundEngine.playLevelUp();
      pushToast(`${upgraded.name} +${upgraded.upgradeLevel} seviyesine yükseltildi!`);

      // Aura kademesi atladıysa kahramanın üzerindeki parlama güçlenir
      const heroForAura = prev.heroes[prev.activeHeroClass];
      const simulatedHero = isEquipped && slot
        ? { ...heroForAura, equipped: { ...heroForAura.equipped, [slot]: upgraded } }
        : heroForAura;
      const beforeTier = computeEnchantAura(heroForAura).tier;
      const afterTier = computeEnchantAura(simulatedHero).tier;
      if (afterTier > beforeTier) {
        const tierInfo = ENCHANT_TIERS[afterTier];
        window.setTimeout(() => {
          SoundEngine.playLootReveal(true);
          pushToast(`✨ BÜYÜ AURASI YÜKSELDİ: ${tierInfo.name}! Kahramanın artık daha çok parlıyor.`);
        }, 700);
      }

      if (isEquipped && slot) {
        return recordQuestActivity({
          ...prev,
          gold: prev.gold - cost.gold,
          crystals: prev.crystals - cost.crystals,
          stats: { ...prev.stats, itemsUpgraded: prev.stats.itemsUpgraded + 1 },
          heroes: {
            ...prev.heroes,
            [prev.activeHeroClass]: {
              ...hero,
              equipped: { ...hero.equipped, [slot]: upgraded },
            },
          },
        }, { upgrade: true });
      }
      return recordQuestActivity({
        ...prev,
        gold: prev.gold - cost.gold,
        crystals: prev.crystals - cost.crystals,
        stats: { ...prev.stats, itemsUpgraded: prev.stats.itemsUpgraded + 1 },
        inventory: prev.inventory.map((i) => (i.id === itemId ? upgraded : i)),
      }, { upgrade: true });
    });
  };

  const handleDismantleItem = (itemId: string) => {
    setSave((prev) => {
      const item = prev.inventory.find((i) => i.id === itemId);
      if (!item) return prev;
      const y = getDismantleYield(item);
      SoundEngine.playGemSwap();
      pushToast(`Parçalandı: +${y.crystals} Kristal, +${y.gold} Altın`);
      return {
        ...prev,
        gold: prev.gold + y.gold,
        crystals: prev.crystals + y.crystals,
        inventory: prev.inventory.filter((i) => i.id !== itemId),
      };
    });
  };

  const handleSellItem = (itemId: string) => {
    setSave((prev) => {
      const item = prev.inventory.find((i) => i.id === itemId);
      if (!item) return prev;
      SoundEngine.playGemSelect();
      pushToast(`Satıldı: +${item.sellValue} Altın`);
      return {
        ...prev,
        gold: prev.gold + item.sellValue,
        inventory: prev.inventory.filter((i) => i.id !== itemId),
      };
    });
  };

  const handleAutoEquipBest = () => {
    setSave((prev) => {
      const hero = prev.heroes[prev.activeHeroClass];
      let pool = [...prev.inventory];
      const nextEq = { ...hero.equipped };

      const slots: EquipmentSlot[] = [
        'weapon',
        'offhand',
        'helmet',
        'chest',
        'gloves',
        'pants',
        'boots',
        'necklace',
        'ring1',
        'ring2',
      ];

      slots.forEach((slot) => {
        const current = nextEq[slot];
        const currentScore = current ? getItemPowerScore(current) : -1;

        const candidates = pool.filter((item) => {
          if (item.levelReq > hero.level) return false;
          if (slot === 'ring1' || slot === 'ring2') {
            return item.slot === 'ring1' || item.slot === 'ring2';
          }
          return item.slot === slot;
        });

        candidates.sort((a, b) => getItemPowerScore(b) - getItemPowerScore(a));
        const best = candidates[0];
        if (best && getItemPowerScore(best) > currentScore) {
          pool = pool.filter((i) => i.id !== best.id);
          if (current) pool.push(current);
          nextEq[slot] = { ...best, slot };
        }
      });

      SoundEngine.playLootReveal(false);
      pushToast('En güçlü ekipmanlar otomatik kuşanıldı!');
      return {
        ...prev,
        inventory: pool,
        heroes: {
          ...prev.heroes,
          [prev.activeHeroClass]: { ...hero, equipped: nextEq },
        },
      };
    });
  };

  const handleDismantleLowRarity = () => {
    setSave((prev) => {
      const toKeep: EquipmentItem[] = [];
      let totalGold = 0;
      let totalCrystals = 0;
      let count = 0;

      prev.inventory.forEach((item) => {
        if (item.rarity === 'common') {
          const y = getDismantleYield(item);
          totalGold += y.gold;
          totalCrystals += y.crystals;
          count += 1;
        } else {
          toKeep.push(item);
        }
      });

      if (count === 0) {
        pushToast('Parçalanacak Sıradan eşya bulunamadı.');
        return prev;
      }
      SoundEngine.playGemMatch(2, 'arcane');
      pushToast(`${count} Sıradan eşya parçalandı: +${totalCrystals} Kristal!`);
      return {
        ...prev,
        gold: prev.gold + totalGold,
        crystals: prev.crystals + totalCrystals,
        inventory: toKeep,
      };
    });
  };

  const handleUpgradeSkillNode = (nodeId: string) => {
    setSave((prev) => {
      const hero = prev.heroes[prev.activeHeroClass];
      if (hero.skillPoints <= 0) return prev;
      const cls = HERO_CLASSES[hero.classId];
      const node = cls.skillTree.find((n) => n.id === nodeId);
      if (!node) return prev;
      const curRank = hero.skillRanks[nodeId] ?? 0;
      if (curRank >= node.maxRank) return prev;
      if (node.requires && (hero.skillRanks[node.requires] ?? 0) < 1) return prev;

      SoundEngine.playLevelUp();
      return {
        ...prev,
        heroes: {
          ...prev.heroes,
          [prev.activeHeroClass]: {
            ...hero,
            skillPoints: hero.skillPoints - 1,
            skillRanks: { ...hero.skillRanks, [nodeId]: curRank + 1 },
          },
        },
      };
    });
  };

  const handleResetSkills = () => {
    setSave((prev) => {
      const hero = prev.heroes[prev.activeHeroClass];
      const refunded = Object.values(hero.skillRanks).reduce((a, b) => a + b, 0);
      return {
        ...prev,
        heroes: {
          ...prev.heroes,
          [prev.activeHeroClass]: {
            ...hero,
            skillPoints: hero.skillPoints + refunded,
            skillRanks: {},
          },
        },
      };
    });
    pushToast('Yetenek puanları sıfırlandı ve iade edildi!');
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

      const droppedItem = didDrop
        ? generateEquipmentItem({
            // Kahraman seviye sınırı (50) üzerindeki aşamalardan düşen eşyalar
            // da kuşanılabilir olsun diye eşya gereksinimi bu sınırda tutulur.
            level: Math.max(1, Math.min(stage.recommendedLevel, 50)),
            rarity: rollStageRarity(stage),
            preferredClass: Math.random() < 0.65 ? save.activeHeroClass : undefined,
          })
        : null;

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
    setActiveLeagueOpponent(null);
    setActiveStage(stage);
    setRoute('battle');
  };

  const handleStartLeague = (opponent: LeagueOpponent) => {
    const current = refreshProgressPeriods(saveRef.current);
    setSave(current);
    SoundEngine.unlock();
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
          onPlayNextStage={handleStartStage}
          onNavigate={(dest) => {
            if (dest === 'quests') { setQuestTab('main'); setQuestBack('menu'); }
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
          onEnhanceItem={handleEnhanceItem}
          onDismantleItem={handleDismantleItem}
          onSellItem={handleSellItem}
          onAutoEquipBest={handleAutoEquipBest}
          onDismantleLowRarity={handleDismantleLowRarity}
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
        <WorldMapScreen
          save={save}
          onBack={() => setRoute('menu')}
          onStartStage={handleStartStage}
        />
      )}

      {route === 'quests' && (
        <QuestsScreen
          save={save}
          onBack={() => setRoute(questBack)}
          onClaimQuest={handleClaimQuest}
          onOpenLeague={() => setRoute('league')}
          initialTab={questTab}
        />
      )}

      {route === 'league' && (
        <LeagueScreen
          save={save}
          onBack={() => setRoute('menu')}
          onOpenQuests={() => { setQuestTab('league'); setQuestBack('league'); setRoute('quests'); }}
          onStartOpponent={handleStartLeague}
          onClaimTier={handleClaimTier}
          onClaimPending={handleClaimSeasonReward}
        />
      )}

      {route === 'battle' && activeStage && (
        <BattleView
          save={save}
          stage={activeStage}
          onMatchStats={handleMatchStats}
          onCompleteVictory={handleCompleteVictory}
          isLeague={!!activeLeagueOpponent}
          onLeagueDefeat={activeLeagueOpponent ? () => handleLeagueResult(false) : undefined}
          onLeagueForfeit={activeLeagueOpponent ? () => { handleLeagueResult(false, true); } : undefined}
          onExitToMap={() => setRoute(activeLeagueOpponent ? 'league' : 'world')}
          onNextStage={handleStartStage}
          onEquipItem={(itm) => handleEquipItem(itm)}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      {/* Modals */}
      {showSettings && (
        <SettingsModal
          settings={save.settings}
          onUpdateSettings={handleUpdateSettings}
          onManualSave={handleManualSave}
          onResetProgress={handleResetProgress}
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
