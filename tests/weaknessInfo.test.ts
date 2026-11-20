import { describe, expect, it } from 'vitest';
import { RESISTANCE_MULT, WEAKNESS_BASE_MULT, describeWeakness } from '../src/game/weaknessInfo';
import { GEM_INFO } from '../src/data/skills';
import { WORLD_REGIONS } from '../src/data/world';

const nameOf = (g: keyof typeof GEM_INFO) => GEM_INFO[g].name;
const base = { weakness: 'fire' as const, weaknessBonusPct: 0, isBoss: false, nameOf };

describe('weakness description', () => {
  it('states the real damage bonus from the combat rules (1.45x = +45%)', () => {
    expect(WEAKNESS_BASE_MULT).toBe(1.45);
    const d = describeWeakness(base);
    expect(d.title).toBe('Kırmızı Alev Taşı');
    expect(d.lines[0]).toContain('%45 fazla hasar');
  });

  it('adds the hero weakness-exploit passive to the percentage', () => {
    expect(describeWeakness({ ...base, weaknessBonusPct: 15 }).lines[0]).toContain('%60 fazla hasar');
  });

  it('mentions the golden gem rule and shows resistance only for gem elements', () => {
    const d = describeWeakness({ ...base, resistance: 'frost' });
    expect(d.lines.some((l) => l.includes('Altın taşlar'))).toBe(true);
    expect(RESISTANCE_MULT).toBe(0.72);
    expect(d.lines.some((l) => l.includes('Direnç') && l.includes('%28'))).toBe(true);
    expect(describeWeakness({ ...base, resistance: 'holy' }).lines.some((l) => l.includes('Direnç'))).toBe(false);
    expect(describeWeakness({ ...base, resistance: 'physical' }).lines.some((l) => l.includes('Direnç'))).toBe(false);
  });

  it('warns about weakness changes only for bosses that really change weakness between phases', () => {
    const warn = (bossId: string) => describeWeakness({ ...base, isBoss: true, bossId }).lines.some((l) => l.includes('faz değiştirince'));
    expect(warn('frost_queen')).toBe(false);
    expect(warn('infernal_dragon')).toBe(false);
    expect(warn('abyssal_king')).toBe(true);
    expect(warn('forest_lord')).toBe(true);
    expect(describeWeakness(base).lines.some((l) => l.includes('faz değiştirince'))).toBe(false);
  });

  it('works for every enemy in the campaign (weakness is always a gem)', () => {
    for (const r of WORLD_REGIONS) for (const s of r.stages) {
      const d = describeWeakness({ ...base, weakness: s.enemy.weakness, resistance: s.enemy.resistance, isBoss: s.enemy.isBoss, bossId: s.enemy.bossId });
      expect(d.title.length, s.id).toBeGreaterThan(0);
      expect(d.lines.length).toBeGreaterThanOrEqual(3);
    }
  });
});
