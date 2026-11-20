import { COMPANION_EFFECTS as FX } from '../data/companions';

/**
 * Yoldaş savaş etkileri (saf mantık). Her yoldaş savaş başına en fazla bir kez destek verir; savaş sahnesi her yeni savaşta
 * durumu 'ready' ile başlatır (Seçimli Zindanlar'da her karşılaşma yeni savaştır, hak yenilenir).
 */
export type CompanionState = 'ready' | 'armed' | 'used';

/** Kök Filizi: can eşiğin altındaysa (eşleşmenin iyileştirmesi uygulanmadan ÖNCE kontrol edilir) ek iyileştirme verir. */
export function sproutTrigger(
  state: CompanionState,
  hp: number,
  maxHp: number,
  natureCount: number
): { state: CompanionState; heal: number } {
  if (state !== 'ready' || natureCount <= 0 || maxHp <= 0 || hp / maxHp >= FX.sproutHpThreshold) return { state, heal: 0 };
  return { state: 'used', heal: Math.round(maxHp * FX.sproutHealPct) };
}

/** Buz Tilkisi: düşman ağır saldırı hazırlarken (plan 'attack' dışı) yapılan ilk buz eşleşmesi Tilki'yi hazırlar. */
export function foxArm(state: CompanionState, plannedKind: string, frostCount: number): CompanionState {
  return state === 'ready' && frostCount > 0 && plannedKind !== 'attack' ? 'armed' : state;
}

/** Hazırlanan ağır saldırı gerçekleşti: hasarın bir kısmı karşılanır. Normal saldırı gerçekleşirse Tilki hazır haline döner. */
export function foxResolve(
  state: CompanionState,
  actionKind: string,
  dmg: number
): { state: CompanionState; dmg: number; absorbed: number } {
  if (state !== 'armed') return { state, dmg, absorbed: 0 };
  if (actionKind === 'attack') return { state: 'ready', dmg, absorbed: 0 };
  const absorbed = Math.round(dmg * FX.foxAbsorbPct);
  return { state: 'used', dmg: dmg - absorbed, absorbed };
}

/** Saldırı iptal oldu (sıyrılma) ya da plan değişti: ağır saldırı gerçekleşmediği için hak harcanmaz. */
export const foxDisarm = (state: CompanionState): CompanionState => (state === 'armed' ? 'ready' : state);

/** Köz Ejderciği: savaşın ilk 2×2 kare eşleşmesi düşmana yanma uygular. */
export function emberTrigger(
  state: CompanionState,
  squares: number,
  attack: number
): { state: CompanionState; burn: { turns: number; perTurn: number } | null } {
  if (state !== 'ready' || squares <= 0) return { state, burn: null };
  return { state: 'used', burn: { turns: FX.emberBurnTurns, perTurn: Math.max(1, Math.round(attack * FX.emberBurnAtkPct)) } };
}
