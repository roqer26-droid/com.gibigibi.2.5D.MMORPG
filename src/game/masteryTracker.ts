import type { GemType } from '../types/game';
import type { ObjectiveDef } from '../data/mastery';

/**
 * Savaş ustalığı sayaçları (saf mantık, Phaser'dan bağımsız). Savaş motoru gerçek olayları buraya bildirir:
 *  - çözümlenen 2×2 kareler, her çözümleme adımında yok edilen taşlar,
 *  - oyuncu turu başlangıcı / hamle türü (zincir yalnızca taş değiştirme hamlesinde sayılır),
 *  - ağır saldırının iptali ya da kalkanla tam karşılanması, temizlenen donmuş taşlar.
 */
type Base = Exclude<GemType, 'golden'>;
const GEMS: Base[] = ['fire', 'frost', 'nature', 'lightning', 'arcane'];
const zeroGems = (): Record<Base, number> => ({ fire: 0, frost: 0, nature: 0, lightning: 0, arcane: 0 });

export interface MasteryState {
  squares: number;
  /** Taşın en az bir kez eşleştiği oyuncu turu sayısı */
  gemTurns: Record<Base, number>;
  /** İçinde bulunulan turda temizlenen taşlar */
  turnGems: Record<Base, number>;
  /** Taşın bu turda sayılıp sayılmadığı */
  turnTouched: Record<Base, boolean>;
  /** Tek turda temizlenen en çok taş */
  bestBurst: Record<Base, number>;
  /** Bu turdaki taş değiştirme hamlesinin çözümleme adımı */
  stepsThisMove: number;
  bestChain: number;
  /** Tur şu an bir taş değiştirme hamlesi mi (yetenek patlamaları zincir sayılmaz) */
  swapMove: boolean;
  heavyBlocked: number;
  frozenCleared: number;
}

export const createMasteryState = (): MasteryState => ({
  squares: 0,
  gemTurns: zeroGems(),
  turnGems: zeroGems(),
  turnTouched: { fire: false, frost: false, nature: false, lightning: false, arcane: false },
  bestBurst: zeroGems(),
  stepsThisMove: 0,
  bestChain: 0,
  swapMove: false,
  heavyBlocked: 0,
  frozenCleared: 0,
});

/** Yeni oyuncu turu: tur içi sayaçlar sıfırlanır. */
export function startTurn(s: MasteryState): MasteryState {
  return {
    ...s,
    turnGems: zeroGems(),
    turnTouched: { fire: false, frost: false, nature: false, lightning: false, arcane: false },
    stepsThisMove: 0,
    swapMove: false,
  };
}

/** Oyuncu bir taş değiştirme hamlesine başladı (true) ya da yetenek kullandı (false). */
export function setMoveKind(s: MasteryState, swap: boolean): MasteryState {
  return { ...s, swapMove: swap, stepsThisMove: 0 };
}

/** Bir çözümleme adımı: yok edilen taşlar ve çözümlenen kare sayısı. */
export function onResolve(s: MasteryState, counts: Record<GemType, number>, squares: number): MasteryState {
  const next: MasteryState = {
    ...s,
    squares: s.squares + squares,
    gemTurns: { ...s.gemTurns },
    turnGems: { ...s.turnGems },
    turnTouched: { ...s.turnTouched },
    bestBurst: { ...s.bestBurst },
  };
  for (const g of GEMS) {
    const n = counts[g] ?? 0;
    if (n <= 0) continue;
    if (!next.turnTouched[g]) {
      next.turnTouched[g] = true;
      next.gemTurns[g] += 1;
    }
    next.turnGems[g] += n;
    next.bestBurst[g] = Math.max(next.bestBurst[g], next.turnGems[g]);
  }
  if (s.swapMove) {
    next.stepsThisMove = s.stepsThisMove + 1;
    next.bestChain = Math.max(s.bestChain, next.stepsThisMove);
  }
  return next;
}

const HEAVY_KINDS = new Set(['heavy', 'freeze_tiles', 'drain', 'breath']);

/**
 * Düşman eylemi çözüldü. Yalnızca ağır saldırı (planlanan eylem ağır türdeyse) ve gerçekten iptal edildiyse
 * (sıyrılma) ya da kalkan hasarın tamamını karşıladıysa sayılır. Geciktirme (donma/sersemletme) buraya hiç gelmez.
 */
export function onEnemyAction(
  s: MasteryState,
  action: { kind: string },
  result: { cancelled: boolean; hpDamage: number }
): MasteryState {
  if (!HEAVY_KINDS.has(action.kind)) return s;
  if (!result.cancelled && result.hpDamage > 0) return s;
  return { ...s, heavyBlocked: s.heavyBlocked + 1 };
}

export function onFrozenCleared(s: MasteryState, n: number): MasteryState {
  return n > 0 ? { ...s, frozenCleared: s.frozenCleared + n } : s;
}

export interface ObjectiveProgress {
  current: number;
  target: number;
  done: boolean;
}

export function progressOf(s: MasteryState, o: ObjectiveDef): ObjectiveProgress {
  let current = 0;
  switch (o.kind) {
    case 'squares':
      current = s.squares;
      break;
    case 'gem_turns':
      current = s.gemTurns[o.gem!];
      break;
    case 'gem_burst':
      current = s.bestBurst[o.gem!];
      break;
    case 'chain':
      current = s.bestChain;
      break;
    case 'block_heavy':
      current = s.heavyBlocked;
      break;
    case 'clear_frozen':
      current = s.frozenCleared;
      break;
  }
  return { current: Math.min(current, o.count), target: o.count, done: current >= o.count };
}
