/**
 * Ortak Ustalık pasiflerinin savaş çarpanları (saf; BattleScene mevcut hesapların üzerine uygular).
 * Yuzdeler yapıdan (`build.passives`) gelir; nihai yuvarlama çağıran tarafta mevcut hasar/kaynak hesabıyla yapılır.
 */

/** Kare Ustalığı: bir taş türünün hasarı, o türden karede eşleşen taşların payı kadar artar (her taş en fazla bir kez). */
export function squareDamageMult(pct: number, squareTiles: number, totalTiles: number): number {
  if (!(pct > 0) || !(squareTiles > 0) || !(totalTiles > 0)) return 1;
  return 1 + (pct / 100) * Math.min(1, squareTiles / totalTiles);
}

/** Zincir Gücü: hamlenin 2. ve sonraki zincir adımları (kombo sayacı 2+). */
export function chainDamageMult(pct: number, comboStep: number): number {
  return pct > 0 && comboStep >= 2 ? 1 + pct / 100 : 1;
}

/** Mana Akışı / Ulti Odağı: taş eşleşmesinden gelen kaynak (sınır çağıranda uygulanır). */
export function gainMult(pct: number): number {
  return pct > 0 ? 1 + pct / 100 : 1;
}

/** Sağlam Bariyer: oluşturulan kalkan (taş kalkanı üst sınırı çağıranda uygulanır). */
export function boostedShield(amount: number, pct: number): number {
  return pct > 0 && amount > 0 ? Math.round(amount * (1 + pct / 100)) : amount;
}

/** Son Direniş eşiği: can bu oran ya da altındayken. */
export const LAST_STAND_HP = 0.35;

/** Alınan düşman hasarı çarpanı: Ağır Darbe Savunması (planlanan ağır saldırı) × Son Direniş (can ≤ %35). */
export function incomingDamageMult(opts: { heavy: boolean; hpRatio: number; heavyGuardPct: number; lastStandPct: number }): number {
  let m = 1;
  if (opts.heavy && opts.heavyGuardPct > 0) m *= 1 - opts.heavyGuardPct / 100;
  if (opts.hpRatio <= LAST_STAND_HP && opts.lastStandPct > 0) m *= 1 - opts.lastStandPct / 100;
  return m;
}
