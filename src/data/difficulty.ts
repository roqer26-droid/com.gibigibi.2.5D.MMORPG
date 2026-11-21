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

/**
 * v1.20.0 — Geç oyun zorluğu. Tam efsanevi setli kahraman (seviye/eşya üst sınırı 50) hamle başına yaklaşık şu kadar hasar verir
 * (`npm run sim:gear` ile ölçüldü). Düşman canı tabanı bu hasara, tür başına hedef hamle sayısıyla bağlanır; böylece iyi ekipmanlı
 * kahraman da savaşı birkaç hamlede bitiremez. Düşük seviyelerde etkisi yoktur (8 → 16 arası kademeli geçiş).
 */
const LEGENDARY_DPM: [number, number][] = [
  [8, 3500], [12, 5000], [16, 6000], [20, 7500], [25, 10000], [30, 13500], [36, 15000], [50, 17000], [999, 17500],
];
const LATE_TARGET_MOVES: Record<StageType, number> = { normal: 7, treasure: 8, elite: 10, boss: 14 };

function interp(table: [number, number][], x: number): number {
  if (x <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    if (x <= table[i][0]) {
      const [x0, y0] = table[i - 1];
      const [x1, y1] = table[i];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return table[table.length - 1][1];
}

const smooth = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

/** Geç oyun can tabanı (8. seviyenin altında 0). */
export function lateGameHpFloor(type: StageType, level: number): number {
  const blend = smooth((level - 8) / 8);
  return Math.round((interp(LEGENDARY_DPM, Math.max(1, level)) * LATE_TARGET_MOVES[type] * blend) / 10) * 10;
}

/** Geç oyunda düşman saldırı çarpanı: iyi savunmalı kahraman da hasar alsın. */
export function lateGameAttackMultiplier(level: number): number {
  return 1 + LATE_ATTACK_BOOST * smooth((level - 10) / 30);
}
const LATE_ATTACK_BOOST = 2.2;

/**
 * Düşman vuruşunun taban hasarı (v1.20.0). Savunma çok yükselince hasar neredeyse sıfıra iniyordu
 * (seviye 36 efsanevi sette vuruş başına ~%0,8 can); artık seviye 10'dan itibaren her vuruş kahramanın en yüksek canının
 * en az bir yüzdesini götürür (boss %14, diğerleri %9; seviye 30'da tam etki). Ağır saldırı / öfke çarpanı tabana da yansır.
 * Düşük seviyelerde etkisi yoktur.
 */
export const MIN_HIT_PCT = { boss: 0.14, normal: 0.09 };

export function enemyHitDamage(p: {
  rawAtk: number;
  enemyAttack: number;
  defense: number;
  enemyLevel: number;
  isBoss: boolean;
  heroMaxHp: number;
}): number {
  const mitigated = Math.round(p.rawAtk * (100 / (100 + p.defense * 1.45)));
  const factor = p.enemyAttack > 0 ? p.rawAtk / p.enemyAttack : 1;
  const pct = (p.isBoss ? MIN_HIT_PCT.boss : MIN_HIT_PCT.normal) * smooth((p.enemyLevel - 10) / 20);
  return Math.max(8, mitigated, Math.round(p.heroMaxHp * pct * factor));
}

export function tuneStage(stage: StageDef): StageDef {
  const level = stage.recommendedLevel;
  const floor = Math.max(minEnemyHp(stage.type, level), lateGameHpFloor(stage.type, level));
  const maxHp = Math.max(stage.enemy.maxHp, floor);
  const attack = Math.round(stage.enemy.attack * attackMultiplier(stage.type, level) * lateGameAttackMultiplier(level));
  if (maxHp === stage.enemy.maxHp && attack === stage.enemy.attack) return stage;
  return { ...stage, enemy: { ...stage.enemy, maxHp, attack } };
}
