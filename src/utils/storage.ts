import { HERO_CLASS_LIST } from '../data/classes';
import { createStarterEquipment, createStarterInventory } from '../data/items';
import { createLeagueSave } from '../data/league';
import { GameSaveState, HeroClassId, HeroProgress } from '../types/game';
import { dayKey } from './calendar';
import { createQuestPeriods, refreshProgressPeriods } from './questProgress';

/** Başlangıçta açık olan sınıflar (yeni 4 sınıf altın/kristal ile açılır) */
const DEFAULT_UNLOCKS: HeroClassId[] = ['warrior', 'mage', 'ranger', 'paladin'];

const SAVE_STORAGE_KEY = 'legendary_gems_efsanevi_taslar_save_v1';

function makeStarterHero(classId: HeroClassId): HeroProgress {
  return {
    classId,
    level: 1,
    xp: 0,
    skillPoints: 1, // Start with 1 Skill Point so players can experience the Skill Tree immediately!
    skillRanks: {},
    equipped: createStarterEquipment(classId),
  };
}

export function createInitialSaveState(): GameSaveState {
  const heroes = {} as Record<HeroClassId, HeroProgress>;
  HERO_CLASS_LIST.forEach((c) => {
    heroes[c.id] = makeStarterHero(c.id);
  });

  return {
    version: 3,
    activeHeroClass: 'warrior',
    heroes,
    heroUnlocks: [...DEFAULT_UNLOCKS],
    inventory: createStarterInventory(),
    gold: 250,
    crystals: 20,
    completedStages: [],
    bossVictories: [],
    questProgress: {},
    claimedQuests: [],
    questPeriods: createQuestPeriods(),
    league: createLeagueSave(),
    stats: {
      totalMatches: 0,
      totalGemsMatched: {
        fire: 0,
        frost: 0,
        nature: 0,
        lightning: 0,
        arcane: 0,
        golden: 0,
      },
      highestCombo: 0,
      enemiesDefeated: 0,
      bossesDefeated: 0,
      skillsCast: 0,
      itemsUpgraded: 0,
    },
    settings: {
      musicVolume: 0.38,
      sfxVolume: 0.65,
      muted: false,
      screenShake: true,
      highParticles: true,
    },
    lastSavedAt: Date.now(),
  };
}

export function loadGameState(): { save: GameSaveState; isExistingSave: boolean } {
  try {
    const raw = localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) {
      return { save: createInitialSaveState(), isExistingSave: false };
    }
    const parsed = JSON.parse(raw) as GameSaveState;
    if (!parsed || !parsed.heroes || !parsed.activeHeroClass) {
      return { save: createInitialSaveState(), isExistingSave: false };
    }
    // Ensure defaults for any newly added keys
    const fresh = createInitialSaveState();

    // Eski kayıtlarda olmayan yeni sınıfları otomatik oluştur (geriye dönük uyumluluk)
    const heroes = { ...fresh.heroes, ...(parsed.heroes ?? {}) } as Record<
      HeroClassId,
      HeroProgress
    >;
    HERO_CLASS_LIST.forEach((c) => {
      if (!heroes[c.id]) heroes[c.id] = makeStarterHero(c.id);
    });

    const heroUnlocks =
      parsed.heroUnlocks && parsed.heroUnlocks.length > 0
        ? parsed.heroUnlocks
        : [...DEFAULT_UNLOCKS];

    // Aktif kahraman kilitliyse ilk açık sınıfa dön
    const activeHeroClass = heroUnlocks.includes(parsed.activeHeroClass)
      ? parsed.activeHeroClass
      : heroUnlocks[0];

    const questPeriods = parsed.questPeriods ?? fresh.questPeriods;
    // Old daily quests used lifetime counters. Preserve today's visible progress once on migration.
    if (!parsed.questPeriods && parsed.lastSavedAt && dayKey(parsed.lastSavedAt) === dayKey()) {
      questPeriods.daily = {
        ...questPeriods.daily,
        claimed: (parsed.claimedQuests ?? []).filter((id) => id.startsWith('daily_')),
        counters: {
          ...questPeriods.daily.counters,
          gems: { ...questPeriods.daily.counters.gems, ...(parsed.stats?.totalGemsMatched ?? {}) },
          matches: parsed.stats?.totalMatches ?? 0,
          highestCombo: parsed.stats?.highestCombo ?? 0,
          wins: parsed.stats?.enemiesDefeated ?? 0,
          bossWins: parsed.stats?.bossesDefeated ?? 0,
          skillsCast: parsed.stats?.skillsCast ?? 0,
          itemsUpgraded: parsed.stats?.itemsUpgraded ?? 0,
        },
      };
    }

    const migrated: GameSaveState = {
        ...fresh,
        ...parsed,
        version: 3,
        heroes,
        heroUnlocks,
        activeHeroClass,
        questPeriods,
        league: { ...fresh.league, ...(parsed.league ?? {}) },
        settings: { ...fresh.settings, ...(parsed.settings ?? {}) },
        stats: {
          ...fresh.stats,
          ...(parsed.stats ?? {}),
          totalGemsMatched: {
            ...fresh.stats.totalGemsMatched,
            ...(parsed.stats?.totalGemsMatched ?? {}),
          },
        },
    };
    return {
      save: refreshProgressPeriods(migrated),
      isExistingSave: true,
    };
  } catch {
    return { save: createInitialSaveState(), isExistingSave: false };
  }
}

export function saveGameState(state: GameSaveState): boolean {
  try {
    const payload: GameSaveState = {
      ...state,
      lastSavedAt: Date.now(),
    };
    localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function resetGameState(): GameSaveState {
  try {
    localStorage.removeItem(SAVE_STORAGE_KEY);
  } catch {
    // ignore
  }
  const fresh = createInitialSaveState();
  saveGameState(fresh);
  return fresh;
}
