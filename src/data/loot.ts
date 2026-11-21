import type { Rarity, StageDef } from '../types/game';

/**
 * Savaş ganimeti nadirlik tablosu (saf mantık; `r` 0–1 arası rastgele sayıdır).
 * v1.20.0: Efsanevi ve Mitik eşyalar çok daha zor düşer. Tablolar aşamanın önerilen seviyesine göre kademelenir;
 * ağırlıklar yüzdedir. Boss/elit "garanti nadirliği" artık tam garanti değil, taban + küçük yükselme şansıdır.
 */
type Weights = Partial<Record<Rarity, number>>;

const TABLES: { minLevel: number; weights: Weights }[] = [
  { minLevel: 42, weights: { rare: 28, epic: 60, legendary: 10.5, mythic: 1.5 } },
  { minLevel: 30, weights: { rare: 40, epic: 52, legendary: 7.5, mythic: 0.5 } },
  { minLevel: 22, weights: { uncommon: 18, rare: 44, epic: 33, legendary: 5 } },
  { minLevel: 12, weights: { uncommon: 35, rare: 42, epic: 20, legendary: 3 } },
  { minLevel: 5, weights: { common: 35, uncommon: 40, rare: 21, epic: 4 } },
  { minLevel: 0, weights: { common: 65, uncommon: 30, rare: 5 } },
];

const ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

export function rollFromWeights(weights: Weights, r: number): Rarity {
  const total = ORDER.reduce((a, k) => a + (weights[k] ?? 0), 0);
  let acc = 0;
  const x = r * total;
  for (const k of ORDER) {
    acc += weights[k] ?? 0;
    if (weights[k] && x < acc) return k;
  }
  return ORDER.filter((k) => weights[k]).pop() ?? 'common';
}

/** Boss/elit garantisi: bildirilen nadirlikten bir basamak aşağısı taban, bildirilen nadirlik küçük bir şansla düşer. */
export function guaranteedRoll(declared: Rarity, r: number): Rarity {
  if (declared === 'mythic') {
    if (r < 0.03) return 'mythic';
    if (r < 0.18) return 'legendary';
    return 'epic';
  }
  if (declared === 'legendary') return r < 0.12 ? 'legendary' : 'epic';
  return declared;
}

export function rollDropRarity(stage: Pick<StageDef, 'recommendedLevel' | 'rewards'>, r: number): Rarity {
  if (stage.rewards.guaranteedRarity) return guaranteedRoll(stage.rewards.guaranteedRarity, r);
  const table = TABLES.find((t) => stage.recommendedLevel >= t.minLevel) ?? TABLES[TABLES.length - 1];
  return rollFromWeights(table.weights, r);
}
