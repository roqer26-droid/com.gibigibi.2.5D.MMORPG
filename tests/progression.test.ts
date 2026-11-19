import assert from 'node:assert/strict';
import { LEAGUE_OPPONENTS, createLeagueSave, createLeagueStage, leagueRank, recordLeagueResult, settleLeagueSeason, tierFor } from '../src/data/league';
import { QUESTS_LIST } from '../src/data/quests';
import { TOTAL_REGIONS, TOTAL_STAGES, WORLD_REGIONS } from '../src/data/world';
import { dayKey, weekKey } from '../src/utils/calendar';
import { createQuestPeriods, isQuestClaimed, markQuestClaimed, recordQuestActivity, refreshProgressPeriods } from '../src/utils/questProgress';
import { getQuestCurrentValue } from '../src/utils/rpgLogic';
import { createInitialSaveState, loadGameState } from '../src/utils/storage';

const monday = Date.parse('2026-05-04T10:00:00Z');
const tuesday = Date.parse('2026-05-05T10:00:00Z');
const nextMonday = Date.parse('2026-05-11T00:01:00Z');
assert.equal(TOTAL_STAGES, 250);
assert.equal(TOTAL_REGIONS, 28);
const allStages = WORLD_REGIONS.flatMap((r) => r.stages);
assert.equal(allStages.length, 250);
assert.equal(new Set(allStages.map((s) => s.id)).size, 250, 'stage ids must be unique');
assert.equal(new Set(allStages.map((s) => s.enemy.id)).size, 250, 'enemy ids must be unique');
assert.equal(allStages.filter((s) => s.type === 'boss').length, 34);
assert.equal(allStages[allStages.length - 1].id, 'eternity_10');
assert.equal(allStages[0].recommendedLevel, 1);
// İlk 120 aşama (2. seçenek) aynen korunmalı: bölge sırası ve aşama kimlikleri değişmemeli.
const legacyRegionIds = ['forest', 'mountains', 'volcano', 'ruins', 'abyss', 'sky', 'ocean', 'desert', 'swamp', 'moonlit', 'crystal_caves', 'ashen', 'astral', 'spirit', 'chaos'];
const legacyStageIds = legacyRegionIds.flatMap((id) => Array.from({ length: 8 }, (_, i) => `${id}_${i + 1}`));
assert.deepEqual(allStages.slice(0, 120).map((s) => s.id), legacyStageIds, 'existing 120 stages must stay untouched');
assert.deepEqual(allStages.slice(0, 120).map((s) => s.recommendedLevel), [1, 2, 3, 4, 5, 6, 7, 8, 6, 7, 8, 9, 10, 11, 12, 13, 11, 12, 13, 15, 16, 17, 18, 19, 17, 18, 19, 20, 22, 23, 24, 25, 23, 25, 26, 28, 30, 31, 32, 33, 33, 33, 34, 34, 34, 35, 35, 35, 35, 35, 36, 36, 36, 37, 37, 37, 37, 37, 38, 38, 38, 39, 39, 39, 39, 39, 40, 40, 40, 41, 41, 41, 41, 41, 42, 42, 42, 43, 43, 43, 43, 43, 44, 44, 44, 45, 45, 45, 45, 45, 46, 46, 46, 47, 47, 47, 47, 47, 48, 48, 48, 49, 49, 49, 49, 49, 50, 50, 50, 51, 51, 51, 51, 51, 52, 52, 52, 53, 53, 53], 'legacy level curve untouched');
assert.deepEqual(allStages.slice(0, 12).map((s) => s.enemy.maxHp), [380, 560, 740, 1050, 1850, 2097, 2169, 4880, 1450, 1850, 2150, 2700], 'legacy enemy stats untouched');
// Eklenen 130 aşama kendi içinde kesintisiz zorlaşmalı.
const endgameStages = allStages.slice(120);
assert.equal(endgameStages.length, 130);
assert.ok(endgameStages.every((s, i) => i === 0 || endgameStages[i - 1].recommendedLevel <= s.recommendedLevel), 'endgame difficulty must not regress');
assert.equal(endgameStages[0].recommendedLevel, 54);
assert.equal(endgameStages[endgameStages.length - 1].recommendedLevel, 93);
assert.equal(endgameStages.filter((s) => s.type === 'boss').length, 13);
assert.ok(endgameStages.every((s) => s.enemy.level === s.recommendedLevel));
const firstEndgame = endgameStages[0];
const finalBoss = endgameStages[endgameStages.length - 1];
assert.equal(firstEndgame.type, 'normal');
assert.equal(finalBoss.type, 'boss');
assert.equal(finalBoss.enemy.bossId, 'eternity_emperor');
assert.ok(firstEndgame.enemy.maxHp > 55_000 && firstEndgame.enemy.maxHp < 85_000, `first endgame hp ${firstEndgame.enemy.maxHp}`);
assert.ok(finalBoss.enemy.maxHp > 250_000 && finalBoss.enemy.maxHp < 450_000, `final boss hp ${finalBoss.enemy.maxHp}`);
assert.ok(finalBoss.enemy.attack > firstEndgame.enemy.attack);
assert.ok(finalBoss.rewards.gold > 10_000 && finalBoss.rewards.crystals > 100);
assert.equal(finalBoss.rewards.guaranteedRarity, 'mythic');
assert.equal(endgameStages.filter((s) => s.type === 'treasure').length, 26);
assert.ok(allStages.filter((s) => s.id.startsWith('star_gate') || s.id.startsWith('eternity')).every((s) => s.enemy.maxHp > 0 && s.enemy.attack > 0 && s.rewards.gold > 0));

assert.equal(weekKey(tuesday), '2026-05-04');
assert.equal(tierFor(199).id, 'bronze');
assert.equal(tierFor(200).id, 'silver');
assert.equal(tierFor(1600).id, 'legend');
assert.ok(leagueRank(1800) < leagueRank(100));

const easy = LEAGUE_OPPONENTS[0];
const hard = LEAGUE_OPPONENTS[2];
assert.ok(createLeagueStage(hard, 10).enemy.maxHp > createLeagueStage(easy, 10).enemy.maxHp);
let league = createLeagueSave(monday);
league = recordLeagueResult(league, easy, true, false, monday).league;
assert.equal(league.points, 30);
assert.equal(league.streak, 1);
league = recordLeagueResult(league, hard, false, false, monday).league;
assert.equal(league.points, 8);
assert.equal(league.streak, 0);
league = recordLeagueResult(league, hard, false, true, monday).league;
assert.equal(league.points, 0);
assert.equal(league.totalBattles, 2, 'a forfeit must not complete a quest battle');
assert.equal(league.losses, 2);
const forfeitOnly = recordLeagueResult(createLeagueSave(monday), easy, false, true, monday).league;
assert.equal(settleLeagueSeason(forfeitOnly, nextMonday).pendingRewards.length, 0);

const initial = createInitialSaveState();
let save = { ...initial, league: createLeagueSave(monday), questPeriods: createQuestPeriods(monday) };
save = recordQuestActivity(save, { gems: { fire: 8 }, match: true, combo: 3, leagueBattle: true, leagueWin: true, win: true }, monday);
const fireDaily = QUESTS_LIST.find((q) => q.id === 'daily_fire_gems')!;
const leagueDaily = QUESTS_LIST.find((q) => q.id === 'daily_league_win_1')!;
assert.equal(getQuestCurrentValue(fireDaily, save), 8);
assert.equal(getQuestCurrentValue(leagueDaily, save), 1);
assert.equal(isQuestClaimed(leagueDaily, save), false);
save = markQuestClaimed(leagueDaily, save);
assert.equal(isQuestClaimed(leagueDaily, save), true);
save = refreshProgressPeriods(save, tuesday);
assert.equal(save.questPeriods.daily.key, dayKey(tuesday));
assert.equal(getQuestCurrentValue(fireDaily, save), 0);
assert.equal(isQuestClaimed(leagueDaily, save), false);
assert.equal(save.questPeriods.weekly.counters.gems.fire, 8);

save = { ...save, league: recordLeagueResult(save.league, easy, true, false, tuesday).league };
const closed = refreshProgressPeriods(save, nextMonday);
assert.equal(closed.league.points, 0);
assert.equal(closed.questPeriods.weekly.counters.gems.fire, 0);
assert.equal(closed.league.pendingRewards.length, 2, 'unclaimed tier and season reward must be preserved');
assert.equal(settleLeagueSeason(closed.league, nextMonday).pendingRewards.length, 2, 'season rollover must be idempotent');
assert.equal(closed.gold, initial.gold);
assert.deepEqual(closed.completedStages, initial.completedStages);

const legacy = createInitialSaveState() as unknown as Record<string, unknown>;
delete legacy.questPeriods;
delete legacy.league;
legacy.completedStages = ['forest_1'];
legacy.claimedQuests = ['main_1_first_win', 'daily_nature_gems'];
legacy.gold = 9876;
legacy.stats = { ...initial.stats, totalGemsMatched: { ...initial.stats.totalGemsMatched, fire: 12 } };
const storage = new Map<string, string>();
storage.set('legendary_gems_efsanevi_taslar_save_v1', JSON.stringify(legacy));
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
};
const migrated = loadGameState();
assert.equal(migrated.isExistingSave, true);
assert.equal(migrated.save.gold, 9876);
assert.deepEqual(migrated.save.completedStages, ['forest_1']);
assert.ok(migrated.save.claimedQuests.includes('main_1_first_win'));
assert.equal(migrated.save.questPeriods.daily.counters.gems.fire, 12);
assert.ok(migrated.save.questPeriods.daily.claimed.includes('daily_nature_gems'));
assert.equal(Object.keys(migrated.save.heroes).length, 20);
assert.equal(migrated.save.league.points, 0);

assert.equal(new Set(QUESTS_LIST.map((q) => q.id)).size, QUESTS_LIST.length, 'quest ids must be unique');
const supportedPeriodObjectives = new Set(['match_gem', 'make_matches', 'reach_combo', 'win_battles', 'defeat_bosses', 'upgrade_item', 'use_skills', 'league_battles', 'league_wins']);
assert.ok(QUESTS_LIST.filter((q) => q.category === 'daily' || q.category === 'weekly').every((q) => supportedPeriodObjectives.has(q.objectiveType)));
console.log(`Progression checks passed: ${QUESTS_LIST.length} quests, 20 heroes, league and period migration.`);