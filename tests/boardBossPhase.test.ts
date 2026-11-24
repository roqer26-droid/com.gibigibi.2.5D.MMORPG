import { describe, expect, it } from 'vitest';
import { barrierDamage, barrierIntent, barrierMatch, barrierMove, boardBossPhase, crackBarrier, seedBarrierMove } from '../src/game/boardBossPhase';
import { findMatches, type MatchCell, type MatchGrid } from '../src/game/match3';
import type { GemType } from '../src/types/game';

const queenPhase = boardBossPhase({ isBoss: true, bossId: 'frost_queen' });
const gem = (type: GemType): MatchCell => ({ type, frozen: 0, special: 'none' });

describe('Buz Kraliçesi bariyeri', () => {
  it('yalnızca açıkça seçilmiş boss için faz ve erken uyarı üretir', () => {
    expect(queenPhase?.threshold).toBe(0.5);
    expect(barrierIntent(queenPhase)?.text).toBe('Bariyer %50');
    expect(boardBossPhase({ isBoss: true, bossId: 'infernal_dragon' })).toBeUndefined();
    expect(boardBossPhase({ isBoss: true })).toBeUndefined();
    expect(boardBossPhase({ isBoss: false, bossId: 'frost_queen' })).toBeUndefined();
    expect(barrierIntent(undefined)).toBeUndefined();
    expect(barrierDamage(undefined, 1, undefined, 101, 101, 110)).toBe(110);
  });

  it('ölümcül vuruşu yarı canda durdurur ve iki ayrı sonraki turdan sonra hasarı geri açar', () => {
    expect(barrierDamage(queenPhase, 1, undefined, 101, 101, 25)).toBe(25);
    expect(barrierDamage(queenPhase, 1, undefined, 101, 101, 110)).toBe(50);
    const active = { remaining: 2, lastTurn: 3 };
    expect(barrierDamage(queenPhase, 2, active, 51, 101, 110)).toBe(0);
    expect(barrierIntent(queenPhase, 2, active)?.text).toBe('Buz 0/2');
    expect(crackBarrier(active, 3)).toBe(active);
    const cracked = crackBarrier(active, 4);
    expect(barrierIntent(queenPhase, 2, cracked)?.text).toBe('Buz 1/2');
    expect(crackBarrier(cracked, 4)).toBe(cracked);
    expect(barrierDamage(queenPhase, 2, cracked, 51, 101, 26)).toBe(0);
    const broken = crackBarrier(cracked, 5);
    expect(crackBarrier(broken, 6)).toBe(broken);
    expect(barrierIntent(queenPhase, 2, broken)).toBeUndefined();
    expect(barrierDamage(queenPhase, 2, broken, 51, 101, 26)).toBe(26);
  });

  it('gerçek buz karesini tanır ve eşleşme dışındaki özel taş patlamasını saymaz', () => {
    const grid: MatchGrid = [
      [gem('frost'), gem('frost'), gem('fire')],
      [gem('frost'), gem('fire'), gem('frost')],
      [gem('arcane'), gem('nature'), gem('fire')],
    ];
    expect(barrierMove(grid, 'frost')).toBeDefined();
    expect(seedBarrierMove(grid, 'frost')).toEqual([]);
    [grid[1][1], grid[1][2]] = [grid[1][2], grid[1][1]];
    const matches = findMatches(grid);
    expect(matches.squares).toHaveLength(1);
    expect(barrierMatch(grid, matches.matchedSet, 'frost')).toBe(true);
    expect(barrierMatch(grid, new Set(['0,2', '1,2', '2,2']), 'frost')).toBe(false);
  });

  it('buz hamlesi olmayan tahtada kilitli ve özel taşları koruyarak hamle açar', () => {
    const colors: GemType[] = ['fire', 'nature', 'lightning', 'arcane', 'golden'];
    const grid = colors.map((_, r) => colors.map((_, c) => gem(colors[(r + c) % colors.length])));
    grid[0][0].frozen = 2;
    grid[0][1].special = 'prismatic';
    const original = grid.map(row => row.map(cell => ({ ...cell })));
    expect(barrierMove(grid, 'frost')).toBeUndefined();
    const edited = seedBarrierMove(grid, 'frost');
    expect(grid).toEqual(original);
    expect(edited.length).toBeGreaterThan(0);
    expect(edited.length).toBeLessThanOrEqual(3);
    for (const { row, col } of edited) {
      expect(grid[row][col].frozen).toBe(0);
      expect(grid[row][col].special).toBe('none');
      grid[row][col].type = 'frost';
    }
    expect(findMatches(grid).matchedSet.size).toBe(0);
    expect(barrierMove(grid, 'frost')).toBeDefined();
  });
});
