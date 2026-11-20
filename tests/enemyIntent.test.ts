import { describe, expect, it } from 'vitest';
import {
  HEAVY_CHANCE,
  HEAVY_POWER,
  describeIntent,
  phaseNoticeText,
  planEnemyAction,
} from '../src/game/enemyIntent';

const normal = { isBoss: false };
const boss = (bossId: string) => ({ isBoss: true, bossId });

describe('planEnemyAction (existing attack probabilities)', () => {
  it('regular enemies always plan a normal attack', () => {
    for (const r of [0, 0.1, 0.44, 0.9]) {
      expect(planEnemyAction(normal, () => r)).toEqual({ kind: 'attack', power: 1 });
    }
  });

  it('bosses plan a heavy attack below the 45% threshold and a normal one at or above it', () => {
    expect(planEnemyAction(boss('forest_lord'), () => HEAVY_CHANCE - 0.001)).toEqual({ kind: 'heavy', power: HEAVY_POWER });
    expect(planEnemyAction(boss('forest_lord'), () => HEAVY_CHANCE)).toEqual({ kind: 'attack', power: 1 });
  });

  it('the heavy variant follows the boss', () => {
    expect(planEnemyAction(boss('frost_queen'), () => 0).kind).toBe('freeze_tiles');
    expect(planEnemyAction(boss('shadow_demon'), () => 0).kind).toBe('drain');
    expect(planEnemyAction(boss('infernal_dragon'), () => 0).kind).toBe('breath');
    expect(planEnemyAction(boss('anything_else'), () => 0).kind).toBe('heavy');
  });

  it('boss heavy attacks happen roughly 45% of the time', () => {
    let heavy = 0;
    for (let i = 0; i < 4000; i++) if (planEnemyAction(boss('frost_queen')).kind !== 'attack') heavy++;
    expect(heavy / 4000).toBeGreaterThan(0.4);
    expect(heavy / 4000).toBeLessThan(0.5);
  });

  it('a plan is a plain value: describing it repeatedly never changes it', () => {
    const plan = planEnemyAction(boss('frost_queen'), () => 0.2);
    const a = describeIntent({ action: plan, turnsLeft: 2, frozenTurns: 0, staggerTurns: 0 });
    const b = describeIntent({ action: plan, turnsLeft: 2, frozenTurns: 0, staggerTurns: 0 });
    expect(a).toEqual(b);
    expect(plan.kind).toBe('freeze_tiles');
  });
});

describe('describeIntent', () => {
  const heavy = { kind: 'heavy' as const, power: 1.25 };
  it('shows the action and the turns left', () => {
    expect(describeIntent({ action: heavy, turnsLeft: 2, frozenTurns: 0, staggerTurns: 0 })).toMatchObject({
      text: 'Ağır saldırı · 2 tur sonra',
      icon: 'heavy',
      urgent: false,
      turns: 2,
    });
    expect(describeIntent({ action: { kind: 'freeze_tiles', power: 1.25 }, turnsLeft: 1, frozenTurns: 0, staggerTurns: 0 })).toMatchObject({
      text: 'Taş dondurma · 1 tur sonra',
      urgent: true,
    });
    expect(describeIntent({ action: { kind: 'attack', power: 1 }, turnsLeft: 0, frozenTurns: 0, staggerTurns: 0 }).text).toBe('Saldırı · Şimdi');
  });

  it('a frozen enemy shows the freeze instead of an action', () => {
    expect(describeIntent({ action: heavy, turnsLeft: 1, frozenTurns: 1, staggerTurns: 0 })).toMatchObject({
      text: 'Donmuş · 1 tur',
      icon: 'frozen',
      status: 'frozen',
      urgent: false,
    });
  });

  it('a staggered enemy shows the stagger; freeze takes priority', () => {
    expect(describeIntent({ action: heavy, turnsLeft: 1, frozenTurns: 0, staggerTurns: 2 }).text).toBe('Sersem · 2 tur');
    expect(describeIntent({ action: heavy, turnsLeft: 1, frozenTurns: 3, staggerTurns: 2 }).text).toBe('Donmuş · 3 tur');
  });

  it('attack speed changes (enrage) show up immediately through turnsLeft', () => {
    const before = describeIntent({ action: heavy, turnsLeft: 2, frozenTurns: 0, staggerTurns: 0 });
    const after = describeIntent({ action: heavy, turnsLeft: 1, frozenTurns: 0, staggerTurns: 0 });
    expect(before.text).not.toBe(after.text);
    expect(after.urgent).toBe(true);
  });
});

describe('phaseNoticeText', () => {
  it('names the phase of known bosses', () => {
    expect(phaseNoticeText({ bossId: 'frost_queen', phase: 2 })).toBe('Faz 2 · Buz Bariyeri');
    expect(phaseNoticeText({ bossId: 'infernal_dragon', phase: 2 })).toBe('Faz 2 · Kanatlı Öfke');
    expect(phaseNoticeText({ bossId: 'abyssal_king', phase: 3 })).toBe('Faz 3 · Kıyamet Öfkesi');
  });
  it('falls back to the new weakness for generic bosses and reports enrage only', () => {
    expect(phaseNoticeText({ bossId: 'forest_lord', phase: 2, newWeaknessName: 'Mavi' })).toBe('Faz 2 · Yeni zayıflık: Mavi');
    expect(phaseNoticeText({ bossId: 'forest_guardian', phase: 1, enragedOnly: true })).toBe('Öfke · Saldırı hızı arttı');
  });
});
