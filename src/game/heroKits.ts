import { IMAGE_HERO_TUNING as T } from '../data/imageHeroes';

/**
 * Yeni kahramanların savaş mantığı (saf işlevler; savaş sahnesi bunları çağırır, sayılar `imageHeroes.ts` içindedir).
 */

/** Kurt Adam — Av İçgüdüsü: her oyuncu turunun ilk 2×2 karesi 1 Av yükü verir (en fazla 3). */
export function huntChargeOnSquares(
  charges: number,
  squaresThisStep: number,
  squareGivenThisTurn: boolean
): { charges: number; given: boolean; turnFlag: boolean } {
  if (squaresThisStep <= 0 || squareGivenThisTurn) return { charges, given: false, turnFlag: squareGivenThisTurn };
  const next = Math.min(T.werewolf.maxCharges, charges + T.werewolf.chargePerSquare);
  return { charges: next, given: next > charges, turnFlag: true };
}

/** Kurt Adam — Pençe Darbesi: 1 Av yükü varsa harcanır ve çarpan yükselir. */
export function clawStrike(charges: number): { mult: number; charges: number; charged: boolean } {
  const spend = T.werewolf.chargesSpentBySkill;
  if (charges >= spend) return { mult: T.werewolf.clawChargedMult, charges: charges - spend, charged: true };
  return { mult: T.werewolf.clawMult, charges, charged: false };
}

/** Kurt Adam — Dolunay Hücumu: tüm Av yükleri harcanır, yük başına saldırı değerinin oranı kadar ek hasar. */
export function werewolfUltBonus(charges: number, attack: number): { bonus: number; charges: number } {
  return { bonus: Math.round(attack * T.werewolf.ultBonusPerCharge * charges), charges: 0 };
}

/** Can yenileme: verilen hasarın oranı, maksimum canın oranıyla sınırlı. */
export function cappedHeal(dealt: number, healPct: number, capPct: number, maxHp: number): number {
  return Math.max(0, Math.min(Math.round(dealt * healPct), Math.round(maxHp * capPct)));
}

/** Vampir — Kan Bağı: her oyuncu turunda ilk doğrudan hasar için bir kez. */
export function bloodBond(dealt: number, maxHp: number, usedThisTurn: boolean): { heal: number; used: boolean } {
  if (usedThisTurn || dealt <= 0) return { heal: 0, used: usedThisTurn };
  return { heal: cappedHeal(dealt, T.vampire.bondHealPct, T.vampire.bondCapPct, maxHp), used: true };
}

export const vampireSlashHeal = (dealt: number, maxHp: number) => cappedHeal(dealt, T.vampire.slashHealPct, T.vampire.slashCapPct, maxHp);
export const vampireUltHeal = (dealt: number, maxHp: number) => cappedHeal(dealt, T.vampire.ultHealPct, T.vampire.ultCapPct, maxHp);

/** Kocaayak — Sağlam Duruş / Kaya Siperi / Orman Sarsıntısı kalkanları (maksimum canın oranı). */
export const bigfootStartShield = (maxHp: number) => Math.round(maxHp * T.bigfoot.startShieldPct);
export const bigfootSkillShield = (maxHp: number) => Math.round(maxHp * T.bigfoot.skillShieldPct);
export const bigfootUltShield = (maxHp: number) => Math.round(maxHp * T.bigfoot.ultShieldPct);

/** Gecenin Çığırtkanı — Gece Yankısı: savaştaki ilk üç adımlık zincir +8 ulti. */
export function nightEcho(stepsThisMove: number, swapMove: boolean, alreadyUsed: boolean): { ulti: number; used: boolean } {
  if (alreadyUsed || !swapMove || stepsThisMove < T.night_screecher.chainSteps) return { ulti: 0, used: alreadyUsed };
  return { ulti: T.night_screecher.chainUlti, used: true };
}

/**
 * Düşman eylemini geciktirme: aynı eylem (plan nesnesi) bu kahramanın yetenekleriyle toplamda en fazla
 * `maxDelayPerAction` tur geciktirilebilir. Yeni eylem planlanınca (yeni nesne) hak yenilenir.
 */
export function delayEnemyAction<P extends object>(
  plan: P,
  delayedTurnsByPlan: WeakMap<P, number>,
  counter: number
): { counter: number; delayed: number } {
  const already = delayedTurnsByPlan.get(plan) ?? 0;
  const add = Math.max(0, Math.min(T.night_screecher.delayTurns, T.night_screecher.maxDelayPerAction - already));
  if (add > 0) delayedTurnsByPlan.set(plan, already + add);
  return { counter: counter + add, delayed: add };
}
