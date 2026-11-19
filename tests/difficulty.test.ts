import { describe, expect, it } from 'vitest';
import {
  GEM_SHIELD_CAP_RATIO,
  attackMultiplier,
  capGemShield,
  damagePerMove,
  minEnemyHp,
  targetMoves,
  tuneStage,
} from '../src/data/difficulty';
import { WORLD_REGIONS } from '../src/data/world';

const stages = WORLD_REGIONS.flatMap((r) => r.stages);

describe('difficulty tuning', () => {
  it('first stage takes more than a couple of hits', () => {
    const first = stages[0];
    // başlangıç kahramanı hamle başına ~damagePerMove(1) vurur
    expect(first.enemy.maxHp / damagePerMove(1)).toBeGreaterThanOrEqual(7);
  });

  it('every stage respects its HP floor', () => {
    for (const s of stages) {
      expect(s.enemy.maxHp, s.id).toBeGreaterThanOrEqual(minEnemyHp(s.type, s.recommendedLevel));
    }
  });

  it('boss and elite targets are longer than normal fights at the same level', () => {
    for (const lvl of [1, 10, 30]) {
      expect(targetMoves('boss', lvl)).toBeGreaterThan(targetMoves('elite', lvl));
      expect(targetMoves('elite', lvl)).toBeGreaterThan(targetMoves('normal', lvl));
    }
  });

  it('attack boost fades with level and never drops below 1', () => {
    expect(attackMultiplier('normal', 1)).toBeGreaterThan(attackMultiplier('normal', 20));
    expect(attackMultiplier('normal', 20)).toBeGreaterThan(attackMultiplier('normal', 90));
    expect(attackMultiplier('boss', 90)).toBeGreaterThanOrEqual(1);
  });

  it('endgame stages are left (almost) untouched', () => {
    const late = stages.find((s) => s.recommendedLevel >= 60)!;
    expect(tuneStage(late).enemy.maxHp).toBe(late.enemy.maxHp);
    expect(attackMultiplier(late.type, late.recommendedLevel)).toBeLessThan(1.05);
  });

  it('tuneStage is idempotent on the HP floor and does not mutate input', () => {
    const raw = { ...stages[0], enemy: { ...stages[0].enemy, maxHp: 10, attack: 10 } };
    const out = tuneStage(raw);
    expect(raw.enemy.maxHp).toBe(10);
    expect(out.enemy.maxHp).toBe(minEnemyHp(raw.type, raw.recommendedLevel));
  });

  it('gem shield is capped by max HP', () => {
    expect(capGemShield(10_000, 1000)).toBe(Math.round(1000 * GEM_SHIELD_CAP_RATIO));
    expect(capGemShield(50, 1000)).toBe(50);
  });
});
