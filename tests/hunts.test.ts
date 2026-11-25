import { beforeEach, describe, expect, it } from 'vitest';
import {
  HUNTS,
  getHunt,
  getHuntRuleLines,
  isHuntUnlocked,
  resolveHuntFireRule,
} from '../src/data/hunts';
import { WORLD_REGIONS } from '../src/data/world';
import { recordHuntVictory } from '../src/state/saveActions';
import {
  createInitialSaveState,
  loadGameState,
  parseSaveString,
  saveGameState,
} from '../src/utils/storage';

const stages = WORLD_REGIONS.flatMap((r) => r.stages);
const frozen = getHunt('frozen_throne');
const ash = getHunt('ash_arena');

describe('hunt definitions', () => {
  it('point at real boss stages with matching boss ids', () => {
    for (const h of HUNTS) {
      const st = stages.find((s) => s.id === h.storyStageId)!;
      expect(st, h.id).toBeTruthy();
      expect(st.enemy.bossId).toBe(h.bossId);
      expect(st.type).toBe('boss');
    }
  });

  it('keep the boss weakness/resistance and phase data of the story boss', () => {
    const queen = stages.find((s) => s.id === frozen.storyStageId)!.enemy;
    expect(queen.weakness).toBe('fire');
    expect(queen.resistance).toBe('frost');
    const dragon = stages.find((s) => s.id === ash.storyStageId)!.enemy;
    expect(dragon.weakness).toBe('frost');
    expect(dragon.resistance).toBe('fire');
  });

  it('first rewards match the design', () => {
    expect(frozen.firstReward).toEqual({ gold: 800, crystals: 10 });
    expect(ash.firstReward).toEqual({ gold: 1200, crystals: 15 });
  });

  it('rule lines use the live attack interval', () => {
    const lines = getHuntRuleLines(ash, 2);
    expect(lines[1].text).toBe('Nefes saldırısı 2 turda bir');
    expect(lines[1].note).toBe('İlk nefes 2 tur sonra');
    expect(getHuntRuleLines(frozen, 2)[0].text).toBe('Ateş eşleşmesi 1 buzu çözer');
    expect(getHuntRuleLines(frozen, 2)[1].note).toContain('%50 canda Buz Bariyeri');
  });
});

describe('hunt unlocking', () => {
  it('is locked on a fresh save', () => {
    const s = createInitialSaveState();
    expect(isHuntUnlocked(s, frozen)).toBe(false);
    expect(isHuntUnlocked(s, ash)).toBe(false);
  });

  it('unlocks from boss victories, independently per boss', () => {
    const s = { ...createInitialSaveState(), bossVictories: ['frost_queen' as const] };
    expect(isHuntUnlocked(s, frozen)).toBe(true);
    expect(isHuntUnlocked(s, ash)).toBe(false);
  });

  it('unlocks from a completed boss stage even if bossVictories is empty (old saves)', () => {
    const s = { ...createInitialSaveState(), completedStages: ['volcano_5'] };
    expect(isHuntUnlocked(s, ash)).toBe(true);
    expect(isHuntUnlocked(s, frozen)).toBe(false);
  });
});

describe('hunt rules', () => {
  it('thaw rule: first fire match thaws one tile, chain matches do not thaw another', () => {
    const first = resolveHuntFireRule(frozen, { usedThisTurn: false }, { fire: 3 }, 3);
    expect(first).toEqual({ usedThisTurn: true, thaw: 1, ulti: 0 });
    const chain = resolveHuntFireRule(frozen, { usedThisTurn: first.usedThisTurn }, { fire: 3 }, 2);
    expect(chain.thaw).toBe(0);
  });

  it('thaw rule: needs a fire match, and is spent even when nothing is frozen', () => {
    expect(resolveHuntFireRule(frozen, { usedThisTurn: false }, { nature: 5 }, 3).usedThisTurn).toBe(false);
    const empty = resolveHuntFireRule(frozen, { usedThisTurn: false }, { fire: 3 }, 0);
    expect(empty).toEqual({ usedThisTurn: true, thaw: 0, ulti: 0 });
  });

  it('ulti rule: +5 once per turn', () => {
    const first = resolveHuntFireRule(ash, { usedThisTurn: false }, { fire: 4 }, 0);
    expect(first.ulti).toBe(5);
    const chain = resolveHuntFireRule(ash, { usedThisTurn: first.usedThisTurn }, { fire: 3 }, 0);
    expect(chain.ulti).toBe(0);
  });

  it('does nothing outside a hunt', () => {
    expect(resolveHuntFireRule(undefined, { usedThisTurn: false }, { fire: 3 }, 2)).toEqual({
      usedThisTurn: false,
      thaw: 0,
      ulti: 0,
    });
  });
});

function unlocked() {
  return { ...createInitialSaveState(), bossVictories: ['frost_queen' as const, 'infernal_dragon' as const] };
}

describe('recordHuntVictory', () => {
  it('refuses a locked hunt without touching the save', () => {
    const s = createInitialSaveState();
    const r = recordHuntVictory(s, 'frozen_throne', 9);
    expect(r.recorded).toBe(false);
    expect(r.save).toBe(s);
  });

  it('writes reward, claimed flag, wins and record in one update', () => {
    const s = unlocked();
    const r = recordHuntVictory(s, 'frozen_throne', 12);
    expect(r.recorded).toBe(true);
    expect(r.firstReward).toEqual({ gold: 800, crystals: 10 });
    expect(r.save.gold).toBe(s.gold + 800);
    expect(r.save.crystals).toBe(s.crystals + 10);
    expect(r.save.huntRecords.frozen_throne).toEqual({ bestTurns: 12, wins: 1, firstRewardClaimed: true, best: { normal: 12, hard: null, nightmare: null }, cleared: ['normal'] });
    expect(r.save.huntRecords.ash_arena.wins).toBe(0);
    expect(r.newRecord).toBe(true);
  });

  it('pays the first-win reward only once', () => {
    const a = recordHuntVictory(unlocked(), 'ash_arena', 15);
    const b = recordHuntVictory(a.save, 'ash_arena', 14);
    expect(b.firstReward).toBeNull();
    expect(b.save.gold).toBe(a.save.gold);
    expect(b.save.crystals).toBe(a.save.crystals);
    expect(b.save.huntRecords.ash_arena.wins).toBe(2);
  });

  it('keeps the fewest turns and only improves the record', () => {
    let s = recordHuntVictory(unlocked(), 'frozen_throne', 10).save;
    const worse = recordHuntVictory(s, 'frozen_throne', 14);
    expect(worse.newRecord).toBe(false);
    expect(worse.bestTurns).toBe(10);
    s = worse.save;
    const better = recordHuntVictory(s, 'frozen_throne', 7);
    expect(better.newRecord).toBe(true);
    expect(better.previousBest).toBe(10);
    expect(better.save.huntRecords.frozen_throne.bestTurns).toBe(7);
  });

  it('rejects invalid turn counts', () => {
    const s = unlocked();
    expect(recordHuntVictory(s, 'frozen_throne', 0).recorded).toBe(false);
    expect(recordHuntVictory(s, 'frozen_throne', NaN).recorded).toBe(false);
  });
});

describe('hunt records in the save file', () => {
  let store: Map<string, string>;
  beforeEach(() => {
    store = new Map();
    (globalThis as unknown as { localStorage: unknown }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
  });

  it('a v4 save without huntRecords loads with empty records and its boss victories still unlock hunts', () => {
    const v4 = { ...createInitialSaveState(), version: 4, bossVictories: ['frost_queen'] } as Record<string, unknown>;
    delete v4.huntRecords;
    const s = parseSaveString(JSON.stringify(v4))!;
    expect(s.huntRecords.frozen_throne).toEqual({ bestTurns: null, wins: 0, firstRewardClaimed: false, best: { normal: null, hard: null, nightmare: null }, cleared: [] });
    expect(isHuntUnlocked(s, frozen)).toBe(true);
    expect(isHuntUnlocked(s, ash)).toBe(false);
  });

  it('sanitizes broken hunt records', () => {
    const bad = {
      ...createInitialSaveState(),
      huntRecords: { frozen_throne: { bestTurns: -3, wins: 'x', firstRewardClaimed: 'yes' }, ash_arena: 5 },
    };
    const s = parseSaveString(JSON.stringify(bad))!;
    expect(s.huntRecords.frozen_throne).toEqual({ bestTurns: null, wins: 0, firstRewardClaimed: false, best: { normal: null, hard: null, nightmare: null }, cleared: [] });
    expect(s.huntRecords.ash_arena).toEqual({ bestTurns: null, wins: 0, firstRewardClaimed: false, best: { normal: null, hard: null, nightmare: null }, cleared: [] });
  });

  it('record and claimed flag survive a reload', () => {
    const r = recordHuntVictory(unlocked(), 'ash_arena', 11);
    expect(saveGameState(r.save)).toBe(true);
    const loaded = loadGameState().save;
    expect(loaded.huntRecords.ash_arena).toEqual({ bestTurns: 11, wins: 1, firstRewardClaimed: true, best: { normal: 11, hard: null, nightmare: null }, cleared: ['normal'] });
    // yeniden açılıştan sonra ödül tekrar verilmez
    const again = recordHuntVictory(loaded, 'ash_arena', 9);
    expect(again.firstReward).toBeNull();
    expect(again.save.huntRecords.ash_arena.bestTurns).toBe(9);
  });
});
