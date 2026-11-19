import type { GemType, SpecialGemKind } from '../types/game';

/** Tahta mantığının ihtiyaç duyduğu minimum taş bilgisi (Phaser'dan bağımsız). */
export interface MatchCell {
  type: GemType;
  special: SpecialGemKind;
  frozen: number;
}

export type MatchGrid = (MatchCell | null | undefined)[][];

export interface CellPos {
  row: number;
  col: number;
}

export interface SpawnInfo {
  type: GemType;
  special: SpecialGemKind;
}

export interface MatchResult {
  matchedSet: Set<string>;
  spawns: Map<string, SpawnInfo>;
}

export interface Move {
  a: CellPos;
  b: CellPos;
}

export const cellKey = (row: number, col: number): string => `${row},${col}`;

const typeAt = (grid: MatchGrid, r: number, c: number): GemType | undefined =>
  grid[r]?.[c]?.type;

/** Tahtadaki 3+ eşleşmeleri ve oluşacak özel taşları (4'lü, 5'li, L/T) hesaplar. */
export function findMatches(grid: MatchGrid): MatchResult {
  const size = grid.length;
  const horizRuns: { row: number; cols: number[]; type: GemType }[] = [];
  const vertRuns: { col: number; rows: number[]; type: GemType }[] = [];

  for (let r = 0; r < size; r++) {
    let c = 0;
    while (c < size) {
      const t = typeAt(grid, r, c);
      if (!t) {
        c++;
        continue;
      }
      let end = c + 1;
      while (end < size && typeAt(grid, r, end) === t) end++;
      if (end - c >= 3) {
        const cols: number[] = [];
        for (let k = c; k < end; k++) cols.push(k);
        horizRuns.push({ row: r, cols, type: t });
      }
      c = end;
    }
  }

  for (let c = 0; c < size; c++) {
    let r = 0;
    while (r < size) {
      const t = typeAt(grid, r, c);
      if (!t) {
        r++;
        continue;
      }
      let end = r + 1;
      while (end < size && typeAt(grid, end, c) === t) end++;
      if (end - r >= 3) {
        const rows: number[] = [];
        for (let k = r; k < end; k++) rows.push(k);
        vertRuns.push({ col: c, rows, type: t });
      }
      r = end;
    }
  }

  const matchedSet = new Set<string>();
  const spawns = new Map<string, SpawnInfo>();

  const vertCells = new Set<string>();
  vertRuns.forEach((vr) => vr.rows.forEach((r) => vertCells.add(cellKey(r, vr.col))));

  // L ve T kesişimleri -> Nova bombası
  horizRuns.forEach((hr) => {
    hr.cols.forEach((c) => {
      const k = cellKey(hr.row, c);
      matchedSet.add(k);
      if (vertCells.has(k)) spawns.set(k, { type: hr.type, special: 'nova' });
    });
    if (hr.cols.length >= 5) {
      const mid = cellKey(hr.row, hr.cols[Math.floor(hr.cols.length / 2)]);
      spawns.set(mid, { type: hr.type, special: 'prismatic' });
    } else if (hr.cols.length === 4) {
      const mid = cellKey(hr.row, hr.cols[1]);
      if (!spawns.has(mid)) spawns.set(mid, { type: hr.type, special: 'line_v' });
    }
  });

  vertRuns.forEach((vr) => {
    vr.rows.forEach((r) => matchedSet.add(cellKey(r, vr.col)));
    if (vr.rows.length >= 5) {
      const mid = cellKey(vr.rows[Math.floor(vr.rows.length / 2)], vr.col);
      spawns.set(mid, { type: vr.type, special: 'prismatic' });
    } else if (vr.rows.length === 4) {
      const mid = cellKey(vr.rows[1], vr.col);
      if (!spawns.has(mid)) spawns.set(mid, { type: vr.type, special: 'line_h' });
    }
  });

  return { matchedSet, spawns };
}

/** (r,c) hücresinden geçen yatay/dikey 3'lü var mı? */
export function hasLocalMatchAt(grid: MatchGrid, r: number, c: number): boolean {
  const size = grid.length;
  const t = typeAt(grid, r, c);
  if (!t) return false;
  let h = 1;
  for (let k = c - 1; k >= 0 && typeAt(grid, r, k) === t; k--) h++;
  for (let k = c + 1; k < size && typeAt(grid, r, k) === t; k++) h++;
  if (h >= 3) return true;

  let v = 1;
  for (let k = r - 1; k >= 0 && typeAt(grid, k, c) === t; k--) v++;
  for (let k = r + 1; k < size && typeAt(grid, k, c) === t; k++) v++;
  return v >= 3;
}

/** Oynanabilir tüm hamleleri döndürür. Tahtayı değiştirmez. */
export function findPossibleMoves(grid: MatchGrid): Move[] {
  const size = grid.length;
  const work: MatchGrid = grid.map((row) => [...row]);
  const moves: Move[] = [];

  const testSwap = (r1: number, c1: number, r2: number, c2: number): boolean => {
    const t1 = work[r1][c1];
    const t2 = work[r2][c2];
    if (!t1 || !t2) return false;
    if (t1.frozen > 0 || t2.frozen > 0) return false;
    if (t1.special === 'prismatic' || t2.special === 'prismatic') return true;
    if (t1.special !== 'none' && t2.special !== 'none') return true;

    work[r1][c1] = t2;
    work[r2][c2] = t1;
    const ok = hasLocalMatchAt(work, r1, c1) || hasLocalMatchAt(work, r2, c2);
    work[r1][c1] = t1;
    work[r2][c2] = t2;
    return ok;
  };

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (c + 1 < size && testSwap(r, c, r, c + 1)) {
        moves.push({ a: { row: r, col: c }, b: { row: r, col: c + 1 } });
      }
      if (r + 1 < size && testSwap(r, c, r + 1, c)) {
        moves.push({ a: { row: r, col: c }, b: { row: r + 1, col: c } });
      }
    }
  }
  return moves;
}
