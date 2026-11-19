import { EnemyDef, GemType, LeagueSave, StageDef } from '../types/game';
import { weekKey } from '../utils/calendar';

export interface LeagueTier {
  id: string;
  name: string;
  minPoints: number;
  color: string;
  reward: { gold: number; crystals: number };
}

export interface LeagueOpponent {
  id: string;
  name: string;
  title: string;
  difficulty: string;
  color: string;
  archetype: EnemyDef['visualArchetype'];
  weakness: GemType;
  hpFactor: number;
  attackFactor: number;
  winPoints: number;
  lossPoints: number;
}

export const LEAGUE_TIERS: LeagueTier[] = [
  { id: 'bronze', name: 'Bronz', minPoints: 0, color: '#d79669', reward: { gold: 300, crystals: 20 } },
  { id: 'silver', name: 'Gümüş', minPoints: 200, color: '#bcd4ea', reward: { gold: 800, crystals: 50 } },
  { id: 'gold', name: 'Altın', minPoints: 450, color: '#f8c85f', reward: { gold: 1800, crystals: 100 } },
  { id: 'platinum', name: 'Platin', minPoints: 750, color: '#6edbd3', reward: { gold: 3500, crystals: 180 } },
  { id: 'diamond', name: 'Elmas', minPoints: 1100, color: '#82b9ff', reward: { gold: 6500, crystals: 320 } },
  { id: 'legend', name: 'Efsane', minPoints: 1600, color: '#db9aff', reward: { gold: 12000, crystals: 600 } },
];

export const LEAGUE_OPPONENTS: LeagueOpponent[] = [
  {
    id: 'gorr', name: 'Gorr', title: 'Arena Çaylağı', difficulty: 'Kolay', color: '#79d49e',
    archetype: 'goblin', weakness: 'fire', hpFactor: 1, attackFactor: 0.9, winPoints: 30, lossPoints: 8,
  },
  {
    id: 'varg', name: 'Varg', title: 'Gölge Avcısı', difficulty: 'Orta', color: '#7dbcf3',
    archetype: 'wolf', weakness: 'lightning', hpFactor: 1.25, attackFactor: 1.05, winPoints: 45, lossPoints: 15,
  },
  {
    id: 'kael', name: 'Kara Kael', title: 'Kristal Muhafızı', difficulty: 'Zor', color: '#d49bf5',
    archetype: 'stone_sentinel', weakness: 'arcane', hpFactor: 1.55, attackFactor: 1.2, winPoints: 65, lossPoints: 22,
  },
];

export function tierFor(points: number): LeagueTier {
  return [...LEAGUE_TIERS].reverse().find((tier) => points >= tier.minPoints) ?? LEAGUE_TIERS[0];
}

export function nextTier(points: number): LeagueTier | undefined {
  return LEAGUE_TIERS.find((tier) => tier.minPoints > points);
}

export function createLeagueSave(now = Date.now()): LeagueSave {
  return {
    seasonKey: weekKey(now), points: 0, peakPoints: 0, seasonBattles: 0, wins: 0, losses: 0, streak: 0,
    totalBattles: 0, totalWins: 0, bestStreak: 0, highestPoints: 0,
    claimedTiers: [], pendingRewards: [], history: [],
  };
}

export const BENCHMARK_RIVALS = [
  { id: 'nyra', name: 'Nyra', title: 'Arena şampiyonu', points: 1900 },
  { id: 'orion', name: 'Orion', title: 'Göğün kılıcı', points: 1500 },
  { id: 'mira', name: 'Mira', title: 'Kristal büyücü', points: 1200 },
  { id: 'thorin', name: 'Thorin', title: 'Demir muhafız', points: 900 },
  { id: 'luna', name: 'Luna', title: 'Ay avcısı', points: 700 },
  { id: 'raven', name: 'Raven', title: 'Gölge savaşçısı', points: 500 },
  { id: 'arven', name: 'Arven', title: 'Orman korucusu', points: 300 },
  { id: 'nora', name: 'Nora', title: 'Arena adayı', points: 150 },
  { id: 'borin', name: 'Borin', title: 'Çaylak savaşçı', points: 50 },
];

export function leagueRank(points: number): number {
  return BENCHMARK_RIVALS.filter((rival) => rival.points >= points).length + 1;
}

export function createLeagueStage(opponent: LeagueOpponent, heroLevel: number): StageDef {
  const level = Math.max(1, heroLevel);
  const hp = Math.round((420 + 55 * Math.pow(level - 1, 1.6)) * opponent.hpFactor);
  const attack = Math.round((34 + 10 * (level - 1)) * opponent.attackFactor);
  const rewardFactor = opponent.winPoints / 30;
  return {
    id: `league_${opponent.id}`,
    regionId: 'ruins',
    stageNumber: 0,
    name: `Lig Düellosu: ${opponent.name}`,
    description: `${opponent.title} ile yapay zekâya karşı bir lig düellosu.`,
    type: 'normal',
    recommendedLevel: level,
    enemy: {
      id: `league_enemy_${opponent.id}`,
      name: opponent.name,
      title: opponent.title,
      isBoss: false,
      regionId: 'ruins',
      level,
      maxHp: hp,
      attack,
      defense: Math.round((5 + level * 0.8) * opponent.hpFactor),
      attackInterval: 2,
      weakness: opponent.weakness,
      abilities: ['Arena Darbesi'],
      visualArchetype: opponent.archetype,
    },
    rewards: {
      xp: Math.round((65 + level * 24) * rewardFactor),
      gold: Math.round((100 + level * 30) * rewardFactor),
      crystals: Math.round((6 + level * 1.5) * rewardFactor),
      dropChance: 0.25,
    },
  };
}

export function settleLeagueSeason(league: LeagueSave, now = Date.now()): LeagueSave {
  const currentKey = weekKey(now);
  if (league.seasonKey === currentKey) return league;

  const pending = [...league.pendingRewards];
  if (league.seasonBattles > 0) {
    for (const tier of LEAGUE_TIERS) {
      if (league.peakPoints >= tier.minPoints && !league.claimedTiers.includes(tier.id)) {
        pending.push({
          id: `${league.seasonKey}:tier:${tier.id}`,
          title: `${tier.name} kademe ödülü`,
          description: `${league.seasonKey} sezonunda ulaşılan kademe`,
          ...tier.reward,
        });
      }
    }
    const tierIndex = LEAGUE_TIERS.findIndex((tier) => tier.id === tierFor(league.points).id);
    const rank = leagueRank(league.points);
    pending.push({
      id: `${league.seasonKey}:season`,
      title: 'Sezon sonu ödülü',
      description: `${league.seasonKey} sezonu · ${rank}. sıra · ${league.points} puan`,
      gold: 400 + tierIndex * 700 + Math.max(0, 11 - rank) * 100,
      crystals: 25 + tierIndex * 35 + Math.max(0, 11 - rank) * 5,
    });
  }

  return {
    ...league, seasonKey: currentKey, points: 0, peakPoints: 0, seasonBattles: 0, wins: 0, losses: 0,
    streak: 0, claimedTiers: [], history: [], pendingRewards: pending,
  };
}

export function recordLeagueResult(
  league: LeagueSave,
  opponent: LeagueOpponent,
  victory: boolean,
  forfeited = false,
  now = Date.now()
): { league: LeagueSave; pointsChange: number } {
  const points = Math.max(0, league.points + (victory ? opponent.winPoints : -opponent.lossPoints));
  const pointsChange = points - league.points;
  const streak = victory ? league.streak + 1 : 0;
  return {
    pointsChange,
    league: {
      ...league,
      points,
      peakPoints: Math.max(league.peakPoints, points),
      seasonBattles: league.seasonBattles + (forfeited ? 0 : 1),
      wins: league.wins + (victory ? 1 : 0),
      losses: league.losses + (victory ? 0 : 1),
      streak,
      totalBattles: league.totalBattles + (forfeited ? 0 : 1),
      totalWins: league.totalWins + (victory ? 1 : 0),
      bestStreak: Math.max(league.bestStreak, streak),
      highestPoints: Math.max(league.highestPoints, points),
      history: [{ opponentId: opponent.id, opponentName: opponent.name, victory, forfeited, pointsChange, playedAt: now }, ...league.history].slice(0, 8),
    },
  };
}