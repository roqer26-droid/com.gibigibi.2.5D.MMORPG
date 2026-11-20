import type { ElementType, GemType } from '../types/game';

/** Savaş motorundaki mevcut sabitler (BattleScene.dealHeroAttackToEnemy ile aynı değerler). */
export const WEAKNESS_BASE_MULT = 1.45;
export const RESISTANCE_MULT = 0.72;

/** Kendi faz mantığı olan bosslarda zayıflık sabittir; diğer (genel) bosslar ve Uçurum Kralı faz değişince zayıflığı değiştirir. */
const FIXED_WEAKNESS_BOSSES = new Set(['forest_guardian', 'frost_queen', 'infernal_dragon', 'crystal_titan']);

export interface WeaknessInfoInput {
  weakness: GemType;
  /** Düşmanın direnç elementi (gem olmayan elementler yok sayılır) */
  resistance?: GemType | ElementType;
  /** Kahramanın "zayıflık sömürü" pasifi: ek hasar yüzdesi */
  weaknessBonusPct: number;
  isBoss: boolean;
  bossId?: string;
  /** Element adlarını gösterim metnine çevirir */
  nameOf: (gem: GemType) => string;
}

export interface WeaknessInfo {
  gem: GemType;
  title: string;
  /** Mevcut savaş kurallarına göre etkiler */
  lines: string[];
}

const GEMS: GemType[] = ['fire', 'frost', 'nature', 'lightning', 'arcane', 'golden'];

/** Zayıflık göstergesine dokununca okunacak açıklama (hasar çarpanları savaş kurallarından gelir). */
export function describeWeakness(i: WeaknessInfoInput): WeaknessInfo {
  const bonus = Math.round((WEAKNESS_BASE_MULT - 1) * 100 + i.weaknessBonusPct);
  const name = i.nameOf(i.weakness);
  const lines = [
    `${name} ile vurulan düşman %${bonus} fazla hasar alır.`,
    'Aynı elementteki yetenekler de zayıflık hasarından yararlanır.',
    'Altın taşlar her düşmana zayıflık hasarı verir.',
  ];
  const res = GEMS.find((g) => g === i.resistance);
  if (res) {
    lines.push(`Direnç: ${i.nameOf(res)} hasarı %${Math.round((1 - RESISTANCE_MULT) * 100)} azalır.`);
  }
  if (i.isBoss && !FIXED_WEAKNESS_BOSSES.has(i.bossId ?? '')) {
    lines.push('Boss faz değiştirince zayıflık değişir; gösterge anında güncellenir.');
  }
  return { gem: i.weakness, title: name, lines };
}
