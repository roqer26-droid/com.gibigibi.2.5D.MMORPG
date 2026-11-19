import { settleLeagueSeason } from '../data/league';
import { GameSaveState, GemType, QuestCounters, QuestDef, QuestPeriod } from '../types/game';
import { dayKey, weekKey } from './calendar';

export function emptyQuestCounters(): QuestCounters {
  return {
    gems: { fire: 0, frost: 0, nature: 0, lightning: 0, arcane: 0, golden: 0 },
    matches: 0,
    highestCombo: 0,
    wins: 0,
    bossWins: 0,
    skillsCast: 0,
    itemsUpgraded: 0,
    leagueBattles: 0,
    leagueWins: 0,
  };
}

export function createQuestPeriod(key: string): QuestPeriod {
  return { key, counters: emptyQuestCounters(), claimed: [] };
}

export function createQuestPeriods(now = Date.now()): GameSaveState['questPeriods'] {
  return { daily: createQuestPeriod(dayKey(now)), weekly: createQuestPeriod(weekKey(now)) };
}

export function refreshProgressPeriods(save: GameSaveState, now = Date.now()): GameSaveState {
  const currentDay = dayKey(now);
  const currentWeek = weekKey(now);
  const daily = save.questPeriods.daily.key === currentDay
    ? save.questPeriods.daily
    : createQuestPeriod(currentDay);
  const weekly = save.questPeriods.weekly.key === currentWeek
    ? save.questPeriods.weekly
    : createQuestPeriod(currentWeek);
  const league = settleLeagueSeason(save.league, now);
  if (daily === save.questPeriods.daily && weekly === save.questPeriods.weekly && league === save.league) {
    return save;
  }
  return { ...save, league, questPeriods: { daily, weekly } };
}

export interface QuestActivity {
  gems?: Partial<Record<GemType, number>>;
  match?: boolean;
  combo?: number;
  win?: boolean;
  bossWin?: boolean;
  skill?: boolean;
  upgrade?: boolean;
  leagueBattle?: boolean;
  leagueWin?: boolean;
}

function addActivity(period: QuestPeriod, activity: QuestActivity): QuestPeriod {
  const gems = { ...period.counters.gems };
  for (const type of Object.keys(activity.gems ?? {}) as GemType[]) {
    gems[type] += Math.max(0, activity.gems?.[type] ?? 0);
  }
  const previous = period.counters;
  return {
    ...period,
    counters: {
      gems,
      matches: previous.matches + (activity.match ? 1 : 0),
      highestCombo: Math.max(previous.highestCombo, activity.combo ?? 0),
      wins: previous.wins + (activity.win ? 1 : 0),
      bossWins: previous.bossWins + (activity.bossWin ? 1 : 0),
      skillsCast: previous.skillsCast + (activity.skill ? 1 : 0),
      itemsUpgraded: previous.itemsUpgraded + (activity.upgrade ? 1 : 0),
      leagueBattles: previous.leagueBattles + (activity.leagueBattle ? 1 : 0),
      leagueWins: previous.leagueWins + (activity.leagueWin ? 1 : 0),
    },
  };
}

export function recordQuestActivity(save: GameSaveState, activity: QuestActivity, now = Date.now()): GameSaveState {
  const current = refreshProgressPeriods(save, now);
  return {
    ...current,
    questPeriods: {
      daily: addActivity(current.questPeriods.daily, activity),
      weekly: addActivity(current.questPeriods.weekly, activity),
    },
  };
}

export function isQuestClaimed(quest: QuestDef, save: GameSaveState): boolean {
  if (quest.category === 'daily') return save.questPeriods.daily.claimed.includes(quest.id);
  if (quest.category === 'weekly') return save.questPeriods.weekly.claimed.includes(quest.id);
  return save.claimedQuests.includes(quest.id);
}

export function markQuestClaimed(quest: QuestDef, save: GameSaveState): GameSaveState {
  if (quest.category !== 'daily' && quest.category !== 'weekly') {
    return { ...save, claimedQuests: [...save.claimedQuests, quest.id] };
  }
  const category = quest.category;
  const period = save.questPeriods[category];
  return {
    ...save,
    questPeriods: {
      ...save.questPeriods,
      [category]: { ...period, claimed: [...period.claimed, quest.id] },
    },
  };
}

export function periodQuestValue(quest: QuestDef, counters: QuestCounters): number {
  switch (quest.objectiveType) {
    case 'match_gem': return quest.targetGem ? counters.gems[quest.targetGem] : 0;
    case 'make_matches': return counters.matches;
    case 'reach_combo': return counters.highestCombo;
    case 'win_battles': return counters.wins;
    case 'defeat_bosses': return counters.bossWins;
    case 'upgrade_item': return counters.itemsUpgraded;
    case 'use_skills': return counters.skillsCast;
    case 'league_battles': return counters.leagueBattles;
    case 'league_wins': return counters.leagueWins;
    default: return 0;
  }
}