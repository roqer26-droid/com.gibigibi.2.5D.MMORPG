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

/** 2×2 kare eşleşmesi; (row, col) karenin sol üst hücresi. */
export interface Square {
  row: number;
  col: number;
  type: GemType;
}

export interface MatchResult {
  /** Yatay, dikey ve kare eşleşmelerinin birleşimi. Bir hücre kaç eşleşmenin parçası olursa olsun tek kez yer alır. */
  matchedSet: Set<string>;
  spawns: Map<string, SpawnInfo>;
  /** Bulunan 2×2 kareler (örtüşenler dahil); görsel vurgu için */
  squares: Square[];
}

export interface Move {
  a: CellPos;
  b: CellPos;
}

export const cellKey = (row: number, col: number): string => `${row},${col}`;

const typeAt = (grid: MatchGrid, r: number, c: number): GemType | undefined =>
  grid[r]?.[c]?.type;

/** Dört hücresi de aynı türde olan tüm 2×2 kareleri (örtüşenler dahil) bulur. */
export function findSquares(grid: MatchGrid): Square[] {
  const size = grid.length;
  const out: Square[] = [];
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const t = typeAt(grid, r, c);
      if (t && typeAt(grid, r, c + 1) === t && typeAt(grid, r + 1, c) === t && typeAt(grid, r + 1, c + 1) === t) {
        out.push({ row: r, col: c, type: t });
      }
    }
  }
  return out;
}

/** Karelerin kapsadığı hücreler (örtüşen kareler ve çizgiyle kesişen taşlar tek kez). */
export function squareCellKeys(squares: readonly Square[]): Set<string> {
  const out = new Set<string>();
  for (const sq of squares) {
    out.add(`${sq.row},${sq.col}`);
    out.add(`${sq.row},${sq.col + 1}`);
    out.add(`${sq.row + 1},${sq.col}`);
    out.add(`${sq.row + 1},${sq.col + 1}`);
  }
  return out;
}

/** (r,c) hücresini içeren bir 2×2 kare var mı? */
function hasSquareAt(grid: MatchGrid, r: number, c: number): boolean {
  const t = typeAt(grid, r, c);
  if (!t) return false;
  for (const tr of [r - 1, r]) {
    for (const tc of [c - 1, c]) {
      if (
        typeAt(grid, tr, tc) === t &&
        typeAt(grid, tr, tc + 1) === t &&
        typeAt(grid, tr + 1, tc) === t &&
        typeAt(grid, tr + 1, tc + 1) === t
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Tahtadaki 3+ çizgi eşleşmelerini, 2×2 kareleri ve oluşacak özel taşları (4'lü, 5'li, L/T) hesaplar.
 * Yatay, dikey ve kare eşleşmeleri aynı akışta toplanır.
 */
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

  // 2×2 kareler: hücreler aynı kümeye girer, kesişen taşlar yine tek kez sayılır
  const squares = findSquares(grid);
  for (const sq of squares) {
    matchedSet.add(cellKey(sq.row, sq.col));
    matchedSet.add(cellKey(sq.row, sq.col + 1));
    matchedSet.add(cellKey(sq.row + 1, sq.col));
    matchedSet.add(cellKey(sq.row + 1, sq.col + 1));
  }

  return { matchedSet, spawns, squares };
}

/** (r,c) hücresinden geçen yatay/dikey 3'lü ya da hücreyi içeren 2×2 kare var mı? */
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
  if (v >= 3) return true;

  return hasSquareAt(grid, r, c);
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

/**
 * Başlangıç tahtası: hazır 3'lü çizgi ya da 2×2 kare içermez ve en az bir oynanabilir hamle bırakır.
 * `randomGem` ağırlıklı seçimi (ör. altın taş şansı) yapar; çakışma çıkarsa `alphabet`ten güvenli tür seçilir.
 */
export function createStartingBoard(
  size: number,
  randomGem: () => GemType,
  alphabet: GemType[],
  maxAttempts = 40
): GemType[][] {
  let last: GemType[][] = [];
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const board: GemType[][] = Array.from({ length: size }, () => Array<GemType>(size));
    const conflicts = (r: number, c: number, t: GemType): boolean =>
      (c >= 2 && board[r][c - 1] === t && board[r][c - 2] === t) ||
      (r >= 2 && board[r - 1][c] === t && board[r - 2][c] === t) ||
      (r >= 1 && c >= 1 && board[r - 1][c] === t && board[r][c - 1] === t && board[r - 1][c - 1] === t);

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        let t = randomGem();
        for (let tries = 0; tries < 20 && conflicts(r, c, t); tries++) t = randomGem();
        if (conflicts(r, c, t)) {
          const safe = alphabet.filter((a) => !conflicts(r, c, a));
          t = safe.length > 0 ? safe[Math.floor(Math.random() * safe.length)] : t;
        }
        board[r][c] = t;
      }
    }
    last = board;
    const asGrid: MatchGrid = board.map((row) => row.map((type) => ({ type, special: 'none' as const, frozen: 0 })));
    if (findMatches(asGrid).matchedSet.size === 0 && findPossibleMoves(asGrid).length > 0) return board;
  }
  return last;
}
