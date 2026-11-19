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
