import { describe, expect, it } from 'vitest';
import {
  findMatches,
  findPossibleMoves,
  hasLocalMatchAt,
  type MatchGrid,
} from '../src/game/match3';
import type { GemType } from '../src/types/game';

const CODE: Record<string, GemType> = {
  F: 'fire',
  I: 'frost',
  N: 'nature',
  L: 'lightning',
  A: 'arcane',
  G: 'golden',
};

/** '.' = boş hücre, harfler = taş türü */
function grid(rows: string[]): MatchGrid {
  return rows.map((row) =>
    [...row].map((ch) =>
      ch === '.' ? null : { type: CODE[ch], special: 'none' as const, frozen: 0 }
    )
  );
}

// Eşleşmesiz 6x6 desen (her 3 hücrede tür değişir, satırlar kaydırılmış)
const BASE = ['FFIINN', 'IINNLL', 'NNLLAA', 'LLAAGG', 'AAGGFF', 'GGFFII'];

describe('findMatches', () => {
  it('finds nothing on a board without runs', () => {
    expect(findMatches(grid(BASE)).matchedSet.size).toBe(0);
  });

  it('finds a horizontal run of 3 and spawns no special', () => {
    const g = grid(['FFFINL', ...BASE.slice(1)]);
    const { matchedSet, spawns } = findMatches(g);
    expect([...matchedSet].sort()).toEqual(['0,0', '0,1', '0,2']);
    expect(spawns.size).toBe(0);
  });

  it('spawns a vertical line gem for a horizontal run of 4', () => {
    const g = grid(['FFFFNL', 'IINNLL', 'NNLLAA', 'LLAAGG', 'AAGGFF', 'GGFFII']);
    const { matchedSet, spawns } = findMatches(g);
    expect(matchedSet.size).toBe(4);
    expect(spawns.get('0,1')?.special).toBe('line_v');
  });

  it('spawns a horizontal line gem for a vertical run of 4', () => {
    const g = grid(['FINLAG', 'FNLAGI', 'FLAGIN', 'FAGINL', 'IGINLA', 'GINLAG']);
    const { spawns } = findMatches(g);
    expect(spawns.get('1,0')?.special).toBe('line_h');
  });

  it('spawns a prismatic gem for a run of 5', () => {
    const g = grid(['FFFFFI', 'IINNLL', 'NNLLAA', 'LLAAGG', 'AAGGFF', 'GGFFII']);
    const { matchedSet, spawns } = findMatches(g);
    expect(matchedSet.size).toBe(5);
    expect(spawns.get('0,2')?.special).toBe('prismatic');
  });

  it('spawns a nova gem on an L/T intersection', () => {
    // T şekli: yatay (0,0-2) + dikey (0,1)-(2,1) kesişimi (0,1)
    const t = grid(['FFFNLA', 'IFNLAG', 'NFLAGI', 'LAGIFN', 'AGINLF', 'GINLAF']);
    const { spawns, matchedSet } = findMatches(t);
    expect(matchedSet.has('0,1')).toBe(true);
    expect(spawns.get('0,1')?.special).toBe('nova');
  });

  it('ignores empty cells', () => {
    const g = grid(['FF.FFF', ...BASE.slice(1)]);
    const { matchedSet } = findMatches(g);
    expect([...matchedSet].sort()).toEqual(['0,3', '0,4', '0,5']);
  });
});

describe('hasLocalMatchAt', () => {
  it('detects horizontal and vertical triples through a cell', () => {
    const g = grid(['FFFINL', ...BASE.slice(1)]);
    expect(hasLocalMatchAt(g, 0, 1)).toBe(true);
    expect(hasLocalMatchAt(g, 0, 4)).toBe(false);
  });
});

describe('findPossibleMoves', () => {
  it('finds the swap that completes a triple', () => {
    // F F . F  -> (0,2) ile (1,2) takası yatay 3'lü yapar
    const g = grid(['FFNFIL', 'INFLAG', 'NLGIFA', 'LAIGNF', 'AGNFLI', 'GILANF']);
    const moves = findPossibleMoves(g);
    expect(
      moves.some(
        (m) => m.a.row === 0 && m.a.col === 2 && m.b.row === 1 && m.b.col === 2
      )
    ).toBe(true);
  });

  it('does not mutate the input grid', () => {
    const g = grid(BASE);
    const snapshot = JSON.stringify(g);
    findPossibleMoves(g);
    expect(JSON.stringify(g)).toBe(snapshot);
  });

  it('ignores frozen tiles', () => {
    const g = grid(['FFNFIL', 'INFLAG', 'NLGIFA', 'LAIGNF', 'AGNFLI', 'GILANF']);
    g[1][2]!.frozen = 2;
    const moves = findPossibleMoves(g);
    expect(moves.some((m) => m.b.row === 1 && m.b.col === 2 && m.a.row === 0 && m.a.col === 2)).toBe(
      false
    );
  });

  it('treats prismatic gems as always playable', () => {
    const g = grid(BASE);
    g[2][2]!.special = 'prismatic';
    expect(findPossibleMoves(g).length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 2×2 kare eşleşmeleri
// ---------------------------------------------------------------------------
import { createStartingBoard, findSquares } from '../src/game/match3';

/** BASE tahtasının üstüne (satır, sütun, harf) yazar. */
function withCells(rows: string[], cells: [number, number, string][]): MatchGrid {
  const g = grid(rows);
  for (const [r, c, ch] of cells) g[r][c] = { type: CODE[ch], special: 'none', frozen: 0 };
  return g;
}
const sq = (r: number, c: number, ch = 'F'): [number, number, string][] => [
  [r, c, ch],
  [r, c + 1, ch],
  [r + 1, c, ch],
  [r + 1, c + 1, ch],
];

/** Ateş/arkan içermeyen, eşleşmesiz temiz zemin: kare testleri başka taşlarla karışmasın. */
const CLEAN: string[] = [...Array(6)].map((_, r) =>
  [...Array(6)].map((_, c) => ['I', 'N', 'L', 'G'][(r + 2 * c) % 4]).join('')
);

describe('2×2 square matches', () => {
  it('a plain square is a valid match of exactly four cells', () => {
    const g = withCells(CLEAN, sq(2, 2));
    const m = findMatches(g);
    expect(m.squares).toEqual([{ row: 2, col: 2, type: 'fire' }]);
    expect([...m.matchedSet].sort()).toEqual(['2,2', '2,3', '3,2', '3,3']);
    expect(m.spawns.size).toBe(0);
  });

  it('an L of three is not a match, three plus a diagonal-only fourth is not a square', () => {
    const l = withCells(CLEAN, [[2, 2, 'F'], [2, 3, 'F'], [3, 2, 'F']]);
    expect(findMatches(l).matchedSet.size).toBe(0);
    const diag = withCells(CLEAN, [[2, 2, 'F'], [2, 3, 'F'], [3, 3, 'F'], [3, 2, 'A']]);
    expect(findMatches(diag).squares).toHaveLength(0);
  });

  it('squares of different types are all found', () => {
    const g = withCells(CLEAN, [...sq(0, 0, 'F'), ...sq(3, 3, 'A')]);
    const types = findSquares(g).map((s) => s.type).sort();
    expect(types).toEqual(['arcane', 'fire']);
  });

  it('two overlapping squares (2×3 block) count every tile once', () => {
    const g = withCells(CLEAN, [...sq(2, 1), [2, 3, 'F'], [3, 3, 'F']]);
    const m = findMatches(g);
    expect(m.squares).toHaveLength(2);
    expect(m.matchedSet.size).toBe(6);
  });

  it('two squares sharing a single corner tile count that tile once', () => {
    const g = withCells(CLEAN, [...sq(1, 1), ...sq(2, 2)]);
    const m = findMatches(g);
    expect(m.squares).toHaveLength(2);
    expect(m.matchedSet.size).toBe(7); // 4 + 4 - 1 ortak taş
  });

  it('a square crossing a horizontal line shares its tiles with the line (counted once)', () => {
    const g = withCells(CLEAN, [...sq(2, 2), [2, 4, 'F']]);
    const m = findMatches(g);
    expect(m.squares).toHaveLength(1);
    // satır 2'de F F F (cols 2-4) çizgisi + kare: 5 farklı taş
    expect(m.matchedSet.size).toBe(5);
    expect(m.matchedSet.has('2,4')).toBe(true);
  });

  it('a square crossing a vertical line of four keeps the line gem spawn and counts shared tiles once', () => {
    const g = withCells(CLEAN, [...sq(1, 2), [3, 2, 'F'], [4, 2, 'F']]);
    const m = findMatches(g);
    expect(m.squares).toHaveLength(1);
    expect(m.matchedSet.size).toBe(6); // sütun 2: rows 1-4 (4) + kare dışı 2 taş (1,3),(2,3)
    expect([...m.spawns.values()].some((s) => s.special === 'line_h')).toBe(true);
  });

  it('frozen and special tiles still take part in squares (existing interactions)', () => {
    const g = withCells(CLEAN, sq(2, 2));
    g[2][2]!.frozen = 2;
    g[3][3]!.special = 'line_h';
    const m = findMatches(g);
    expect(m.matchedSet.size).toBe(4);
    expect(m.matchedSet.has('2,2')).toBe(true);
    expect(m.matchedSet.has('3,3')).toBe(true);
  });

  it('hasLocalMatchAt sees a square through any of its four tiles', () => {
    const g = withCells(CLEAN, sq(2, 2));
    for (const [r, c] of [[2, 2], [2, 3], [3, 2], [3, 3]]) expect(hasLocalMatchAt(g, r, c)).toBe(true);
    expect(hasLocalMatchAt(g, 0, 0)).toBe(false);
  });

  it('a swap that completes a square is a playable move', () => {
    // F F / F X  ve X'in altında F: (3,3) ile (4,3) takası kareyi tamamlar
    const g = withCells(CLEAN, [[2, 2, 'F'], [2, 3, 'F'], [3, 2, 'F'], [3, 3, 'N'], [4, 3, 'F']]);
    expect(findMatches(g).matchedSet.size).toBe(0);
    const moves = findPossibleMoves(g);
    expect(moves.some((m) => m.a.row === 3 && m.a.col === 3 && m.b.row === 4 && m.b.col === 3)).toBe(true);
    // takas sonrası gerçekten yalnızca kare oluşuyor (çizgi yok)
    const t = g.map((row) => [...row]);
    [t[3][3], t[4][3]] = [t[4][3], t[3][3]];
    const after = findMatches(t);
    expect(after.squares).toHaveLength(1);
    expect([...after.matchedSet].sort()).toEqual(['2,2', '2,3', '3,2', '3,3']);
  });

  it('a board whose only move builds a square still counts as playable', () => {
    // Her hücre çevresinden farklı; tek hamle kareyi tamamlıyor
    const g = withCells(CLEAN, [[2, 2, 'F'], [2, 3, 'F'], [3, 2, 'F'], [3, 3, 'N'], [4, 3, 'F']]);
    expect(findPossibleMoves(g).length).toBeGreaterThan(0);
  });

  it('a swap that builds no match and no square is not a move', () => {
    const g = grid(BASE);
    const moves = findPossibleMoves(g);
    for (const m of moves) {
      const t = g.map((row) => [...row]);
      [t[m.a.row][m.a.col], t[m.b.row][m.b.col]] = [t[m.b.row][m.b.col], t[m.a.row][m.a.col]];
      expect(findMatches(t).matchedSet.size, JSON.stringify(m)).toBeGreaterThan(0);
    }
  });
});

describe('square chain reactions', () => {
  /** Eşleşenleri temizler, taşları düşürür, boşlukları eşleşme üretmeyen dolgu ile doldurur. */
  function resolve(start: MatchGrid) {
    const size = start.length;
    const g = start.map((row) => [...row]);
    const steps: { size: number; squares: number; types: string[] }[] = [];
    const fill: GemType[] = ['frost', 'nature', 'lightning', 'golden'];
    for (let step = 0; step < 10; step++) {
      const m = findMatches(g);
      if (m.matchedSet.size === 0) break;
      steps.push({ size: m.matchedSet.size, squares: m.squares.length, types: m.squares.map((s) => s.type) });
      m.matchedSet.forEach((k) => {
        const [r, c] = k.split(',').map(Number);
        g[r][c] = null;
      });
      for (let c = 0; c < size; c++) {
        const col = [];
        for (let r = size - 1; r >= 0; r--) if (g[r][c]) col.push(g[r][c]);
        for (let r = size - 1; r >= 0; r--) {
          g[r][c] = col[size - 1 - r] ?? { type: fill[(r + 2 * c + step) % 4], special: 'none', frozen: 0 };
        }
      }
    }
    return steps;
  }

  it('a square formed by falling tiles is detected and joins the chain', () => {
    // Zemin: F ve A içermeyen, eşleşmesiz desen
    const base: string[] = [];
    const pat = ['I', 'N', 'L', 'G'];
    for (let r = 0; r < 6; r++) base.push([...Array(6)].map((_, c) => pat[(r + 2 * c) % 4]).join(''));
    // F'ler A satırının iki yanında; A satırı (4. satır) temizlenince F'ler 2×2 kare olur
    const g = withCells(base, [
      [3, 1, 'F'], [3, 2, 'F'],
      [4, 0, 'A'], [4, 1, 'A'], [4, 2, 'A'],
      [5, 1, 'F'], [5, 2, 'F'],
    ]);
    expect(findMatches(g).squares).toHaveLength(0);
    const steps = resolve(g);
    expect(steps[0]).toMatchObject({ size: 3, squares: 0 });
    const squareStep = steps.findIndex((s) => s.types.includes('fire'));
    expect(squareStep).toBeGreaterThanOrEqual(1); // zincirin sonraki adımında
  });
});

describe('starting board', () => {
  const ALPHABET: GemType[] = ['fire', 'frost', 'nature', 'lightning', 'arcane'];
  const randomGem = (): GemType =>
    Math.random() < 0.045 ? 'golden' : ALPHABET[Math.floor(Math.random() * ALPHABET.length)];

  it('never starts with a ready line or square and always has a move (500 boards)', () => {
    for (let i = 0; i < 500; i++) {
      const types = createStartingBoard(8, randomGem, ALPHABET);
      const g: MatchGrid = types.map((row) => row.map((type) => ({ type, special: 'none' as const, frozen: 0 })));
      const m = findMatches(g);
      expect(m.matchedSet.size, `board ${i}`).toBe(0);
      expect(m.squares).toHaveLength(0);
      expect(findPossibleMoves(g).length, `board ${i}`).toBeGreaterThan(0);
    }
  });

  it('avoids squares even with a tiny alphabet that makes them likely', () => {
    const three: GemType[] = ['fire', 'frost', 'nature'];
    const pick = (): GemType => three[Math.floor(Math.random() * 3)];
    for (let i = 0; i < 200; i++) {
      const types = createStartingBoard(8, pick, three);
      const g: MatchGrid = types.map((row) => row.map((type) => ({ type, special: 'none' as const, frozen: 0 })));
      expect(findSquares(g)).toHaveLength(0);
    }
  });
});
