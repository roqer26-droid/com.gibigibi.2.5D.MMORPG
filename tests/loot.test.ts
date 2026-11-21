import { describe, expect, it } from 'vitest';
import { guaranteedRoll, rollDropRarity, rollFromWeights } from '../src/data/loot';
import { enemyHitDamage, lateGameHpFloor } from '../src/data/difficulty';
import { QUESTS_LIST } from '../src/data/quests';

const stage = (lvl: number, g?: 'legendary' | 'mythic' | 'epic') => ({ recommendedLevel: lvl, rewards: { xp: 0, gold: 0, crystals: 0, dropChance: 1, guaranteedRarity: g } });
const sample = (lvl: number, n = 20000, g?: 'legendary' | 'mythic' | 'epic') => {
  const c: Record<string, number> = {};
  for (let i = 0; i < n; i++) { const r = rollDropRarity(stage(lvl, g), (i + 0.5) / n); c[r] = (c[r] ?? 0) + 1; }
  return c;
};

describe('v1.20.0 zorluk', () => {
  it('seviye 36 aşamasında efsanevi ≤ %8, mitik ≤ %1', () => {
    const c = sample(36);
    expect((c.legendary ?? 0) / 20000).toBeLessThanOrEqual(0.08);
    expect((c.mythic ?? 0) / 20000).toBeLessThanOrEqual(0.01);
  });
  it('düşük seviyede efsanevi/mitik düşmez', () => {
    const c = sample(6);
    expect(c.legendary ?? 0).toBe(0);
    expect(c.mythic ?? 0).toBe(0);
  });
  it('boss garantisi: efsanevi bildirilen boss çoğunlukla destansı verir', () => {
    expect(guaranteedRoll('legendary', 0.5)).toBe('epic');
    expect(guaranteedRoll('legendary', 0.05)).toBe('legendary');
    expect(guaranteedRoll('mythic', 0.5)).toBe('epic');
    expect(guaranteedRoll('mythic', 0.01)).toBe('mythic');
    expect(guaranteedRoll('rare', 0.5)).toBe('rare');
    const c = sample(30, 10000, 'mythic');
    expect((c.mythic ?? 0) / 10000).toBeLessThan(0.05);
  });
  it('rollFromWeights uç değerlerde geçerli nadirlik döner', () => {
    expect(rollFromWeights({ common: 1, rare: 1 }, 0)).toBe('common');
    expect(rollFromWeights({ common: 1, rare: 1 }, 0.9999)).toBe('rare');
  });
  it('geç oyun can tabanı düşük seviyede yok, yüksek seviyede büyük', () => {
    expect(lateGameHpFloor('boss', 6)).toBe(0);
    expect(lateGameHpFloor('boss', 36)).toBeGreaterThan(150000);
    expect(lateGameHpFloor('normal', 36)).toBeLessThan(lateGameHpFloor('boss', 36));
  });
  it('yüksek savunma vuruşu sıfırlayamaz (taban %), düşük seviyede etkisiz', () => {
    const hi = enemyHitDamage({ rawAtk: 2000, enemyAttack: 2000, defense: 1400, enemyLevel: 36, isBoss: true, heroMaxHp: 12000 });
    expect(hi).toBeGreaterThanOrEqual(Math.round(12000 * 0.14));
    const lo = enemyHitDamage({ rawAtk: 40, enemyAttack: 40, defense: 100, enemyLevel: 3, isBoss: false, heroMaxHp: 500 });
    expect(lo).toBe(Math.max(8, Math.round(40 * (100 / (100 + 145)))));
  });
  it('görevlerde efsanevi/mitik ödül emek ister', () => {
    const q = (id: string) => QUESTS_LIST.find((x) => x.id === id)!;
    expect(q('ach_win_20').rewards.itemRarity).toBe('epic');
    expect(q('ach_win_60').targetCount).toBeGreaterThanOrEqual(500);
    expect(q('main_4_dragon').rewards.itemRarity).toBe('epic');
    expect(q('main_6_abyssal_king').rewards.itemRarity).toBe('legendary');
    for (const x of QUESTS_LIST.filter((y) => y.rewards.itemRarity === 'mythic' && y.objectiveType !== 'defeat_boss')) expect(x.targetCount).toBeGreaterThanOrEqual(22);
  });
});
