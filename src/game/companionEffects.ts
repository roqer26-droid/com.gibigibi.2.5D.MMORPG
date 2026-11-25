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

/** Fırtına Baykuşu: savaşın ilk üçlü zinciri (kaskadın 3. adımı) bir kez yıldırım hasarı verir. */
export function owlTrigger(state: CompanionState, comboStep: number, attack: number): { state: CompanionState; dmg: number } {
  if (state !== 'ready' || comboStep < FX.owlChainStep) return { state, dmg: 0 };
  return { state: 'used', dmg: Math.max(1, Math.round(attack * FX.owlAtkPct)) };
}

/** Obsidyen Kaplumbağası: hasar sonrası can eşiğin altına ilk düştüğünde (kahraman hayattayken) bir kez kalkan. */
export function tortoiseTrigger(state: CompanionState, hp: number, maxHp: number): { state: CompanionState; shield: number } {
  if (state !== 'ready' || hp <= 0 || maxHp <= 0 || hp / maxHp >= FX.tortoiseHpThreshold) return { state, shield: 0 };
  return { state: 'used', shield: Math.round(maxHp * FX.tortoiseShieldPct) };
}

/** Ay Güvesi: savaşın ilk arcane 2×2 kare eşleşmesi bir kez ulti enerjisi kazandırır. */
export function mothTrigger(state: CompanionState, arcaneSquares: number, maxUlti: number): { state: CompanionState; ulti: number } {
  if (state !== 'ready' || arcaneSquares <= 0) return { state, ulti: 0 };
  return { state: 'used', ulti: Math.round(maxUlti * FX.mothUltiPct) };
}
