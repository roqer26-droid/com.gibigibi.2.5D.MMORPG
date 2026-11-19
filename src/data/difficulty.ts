import type { StageDef, StageType } from '../types/game';

/**
 * Zorluk ayarı. Ham aşama verileri (world.ts) olduğu gibi kalır; bu katman iki şeyi düzeltir:
 *  1) Erken aşamalarda düşman canı, "tecrübesiz oyuncu kaç hamlede bitirir" hedefinin altına düşmesin.
 *  2) Erken düşmanların saldırısı, kahramanı gerçekten zorlayacak kadar güçlü olsun.
 * Sayılar `npm run sim` (scripts/simulate-battle.ts) ile ölçülerek ayarlandı.
 */

/** Seviyesine uygun başlangıç ekipmanlı, becerisiz kahramanın hamle başına yaklaşık hasarı. */
export function damagePerMove(level: number): number {
  return 105 * Math.pow(Math.max(1, level), 0.6);
}

/** Orta beceride bir oyuncunun (beceri kullanmadan) aşamayı bitirmesi hedeflenen hamle sayısı. */
const BASE_TARGET_MOVES: Record<StageType, number> = {
  normal: 10,
  treasure: 11,
  elite: 12.5,
  boss: 17,
};

export function targetMoves(type: StageType, level: number): number {
  return BASE_TARGET_MOVES[type] + 0.35 * Math.max(1, level);
}

/** Düşman canının altına inmeyeceği taban değer. Yüksek seviyelerde ham veri zaten bunun üstündedir. */
export function minEnemyHp(type: StageType, level: number): number {
  return Math.round((damagePerMove(level) * targetMoves(type, level)) / 10) * 10;
}

/** Düşman saldırısı çarpanı; seviye yükseldikçe 1'e iner. */
const ATTACK_BOOST: Record<StageType, number> = {
  normal: 6,
  treasure: 6,
  elite: 5,
  boss: 2.2,
};

export function attackMultiplier(type: StageType, level: number): number {
  return 1 + ATTACK_BOOST[type] * Math.exp(-(Math.max(1, level) - 1) / 14);
}

/**
 * Taşlardan (doğa/altın) kazanılan kalkanın kahramanın maksimum canına oranla üst sınırı.
 * Sınır olmadan kalkan savaş boyunca birikiyor ve düşman saldırıları hiç can götürmüyordu.
 */
export const GEM_SHIELD_CAP_RATIO = 0.3;

export function capGemShield(shield: number, heroMaxHp: number): number {
  return Math.min(shield, Math.round(heroMaxHp * GEM_SHIELD_CAP_RATIO));
}

export function tuneStage(stage: StageDef): StageDef {
  const level = stage.recommendedLevel;
  const floor = minEnemyHp(stage.type, level);
  const maxHp = Math.max(stage.enemy.maxHp, floor);
  const attack = Math.round(stage.enemy.attack * attackMultiplier(stage.type, level));
  if (maxHp === stage.enemy.maxHp && attack === stage.enemy.attack) return stage;
  return { ...stage, enemy: { ...stage.enemy, maxHp, attack } };
}
