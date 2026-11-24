import type { BossId, EnemyDef, GemType } from '../types/game';
import { findMatches, findPossibleMoves, hasLocalMatchAt, type CellPos, type MatchGrid } from './match3';

interface BoardPhase {
  threshold: number;
  element: GemType;
  matches: number;
}

const BOARD_PHASES: Partial<Record<BossId, BoardPhase>> = {
  frost_queen: { threshold: 0.5, element: 'frost', matches: 2 },
};

export function boardBossPhase(enemy: Pick<EnemyDef, 'isBoss' | 'bossId'>) {
  return enemy.isBoss && enemy.bossId ? BOARD_PHASES[enemy.bossId] : undefined;
}

export interface BoardBarrier {
  remaining: number;
  lastTurn: number;
}

export function barrierDamage(phase: BoardPhase | undefined, enemyPhase: number,
  active: BoardBarrier | undefined, hp: number, maxHp: number, damage: number): number {
  if (!phase) return damage;
  if (active && active.remaining > 0) return 0;
  if (enemyPhase !== 1) return damage;
  return Math.min(damage, Math.max(0, hp - Math.ceil(maxHp * phase.threshold)));
}

export function crackBarrier(barrier: BoardBarrier, turn: number): BoardBarrier {
  return barrier.remaining > 0 && turn > barrier.lastTurn
    ? { remaining: barrier.remaining - 1, lastTurn: turn }
    : barrier;
}

export function barrierMatch(grid: MatchGrid, keys: ReadonlySet<string>, element: GemType): boolean {
  for (const key of keys) {
    const [r, c] = key.split(',').map(Number);
    if (grid[r]?.[c]?.type === element) return true;
  }
  return false;
}

export function barrierMove(grid: MatchGrid, element: GemType) {
  const work = grid.map(row => [...row]);
  return findPossibleMoves(grid).find(({ a, b }) => {
    const t1 = grid[a.row][a.col]!;
    const t2 = grid[b.row][b.col]!;
    if (t1.type === t2.type || t1.special === 'prismatic' || t2.special === 'prismatic' ||
        (t1.special !== 'none' && t2.special !== 'none')) return false;
    work[a.row][a.col] = t2;
    work[b.row][b.col] = t1;
    const matches = (t2.type === element && hasLocalMatchAt(work, a.row, a.col)) ||
      (t1.type === element && hasLocalMatchAt(work, b.row, b.col));
    work[a.row][a.col] = t1;
    work[b.row][b.col] = t2;
    return matches;
  });
}

/** Adds a playable match by changing up to three ordinary gems, preserving frozen and special tiles. */
export function seedBarrierMove(grid: MatchGrid, element: GemType): CellPos[] {
  if (barrierMove(grid, element) || findMatches(grid).matchedSet.size) return [];
  for (const [dr, dc] of [[0, 1], [1, 0]]) {
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        const gap = { row: row + dr, col: col + dc };
        for (const side of [1, -1]) {
          const positions = [
            { row, col },
            { row: row + dr * 2, col: col + dc * 2 },
            { row: gap.row + dc * side, col: gap.col + dr * side },
          ];
          const cells = [gap, ...positions].map(p => grid[p.row]?.[p.col]);
          if (cells.some(c => !c || c.frozen || c.special !== 'none') || cells[0]?.type === element) continue;
          const work = grid.map(r => [...r]);
          for (const p of positions) work[p.row][p.col] = { ...grid[p.row][p.col]!, type: element };
          if (!findMatches(work).matchedSet.size) {
            return positions.filter(p => grid[p.row][p.col]?.type !== element);
          }
        }
      }
    }
  }
  return [];
}

export function barrierIntent(phase: BoardPhase | undefined, enemyPhase = 1, barrier?: BoardBarrier) {
  if (!phase) return undefined;
  if (barrier && barrier.remaining > 0) {
    return {
      active: true,
      text: `Buz ${phase.matches - barrier.remaining}/${phase.matches}`,
      description: `Buz Bariyeri hasarı durduruyor. Bariyeri kırmak için ${barrier.remaining} ayrı hamlede daha buz eşleştir.`,
    };
  }
  if (enemyPhase === 1) {
    const threshold = Math.round(phase.threshold * 100);
    return { active: false, text: `Bariyer %${threshold}`, description: `%${threshold} canda Buz Bariyeri açılır. İki ayrı hamlede buz eşleştirerek kırabilirsin.` };
  }
  return undefined;
}
