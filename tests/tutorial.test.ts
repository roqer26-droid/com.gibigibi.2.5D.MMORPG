import { describe, expect, it } from 'vitest';
import { findMatches, findPossibleMoves, type MatchGrid } from '../src/game/match3';
import {
  buildTutorial,
  manaMove,
  markTutorialDone,
  sanitizeTutorials,
  shouldShowTutorial,
  tutorialNumber,
  tutorialsForExistingProgress,
  type TutorialMove,
} from '../src/game/tutorial';
import { HERO_CLASSES } from '../src/data/classes';
import { getSkillLoadout } from '../src/data/skills';
import { WORLD_REGIONS } from '../src/data/world';
import type { HeroClassId } from '../src/types/game';
import { createInitialSaveState, parseSaveString } from '../src/utils/storage';

const toGrid = (m: TutorialMove): MatchGrid => m.board.map((row) => row.map((c) => ({ type: c.type, special: c.special, frozen: 0 })));
const swap = (g: MatchGrid, a: [number, number], b: [number, number]): MatchGrid => {
  const t = g.map((r) => [...r]);
  [t[a[0]][a[1]], t[b[0]][b[1]]] = [t[b[0]][b[1]], t[a[0]][a[1]]];
  return t;
};
const forest = WORLD_REGIONS[0].stages;
const ctxFor = (id: HeroClassId, level = 4) => {
  const cls = HERO_CLASSES[id];
  const stage = forest[4];
  return { heroName: cls.name, classId: id, loadout: getSkillLoadout(id, level), ulti: cls.ultimateSkill, enemy: stage.enemy };
};
const allMoves = (id: HeroClassId): TutorialMove[] => {
  const out: TutorialMove[] = [];
  for (let n = 1; n <= 5; n++) for (const st of buildTutorial(n, ctxFor(id))!.steps) if (st.kind === 'move') out.push(st.move);
  for (let i = 0; i < 6; i++) out.push(manaMove(i));
  return out;
};

describe('öğretici tahtaları', () => {
  it('every prepared board starts with no match / square, and the guided swap is a real move', () => {
    for (const id of Object.keys(HERO_CLASSES) as HeroClassId[]) {
      for (const m of allMoves(id)) {
        const g = toGrid(m);
        const before = findMatches(g);
        expect(before.matchedSet.size, JSON.stringify(m.from)).toBe(0);
        const prismatic = g[m.from[0]][m.from[1]]!.special === 'prismatic' || g[m.to[0]][m.to[1]]!.special === 'prismatic';
        if (!prismatic) {
          expect(findMatches(swap(g, m.from, m.to)).matchedSet.size).toBeGreaterThan(0);
          expect(findPossibleMoves(g).some((mv) => (mv.a.row === m.from[0] && mv.a.col === m.from[1] && mv.b.row === m.to[0] && mv.b.col === m.to[1]) || (mv.b.row === m.from[0] && mv.b.col === m.from[1] && mv.a.row === m.to[0] && mv.a.col === m.to[1]))).toBe(true);
        }
        // tahtada hamle kalır (kilitlenme yok)
        expect(findPossibleMoves(g).length).toBeGreaterThan(0);
      }
    }
  });

  it('stage 3: square, 4-in-row (line special), 5-in-row (prismatic) and a deterministic cascade', () => {
    const steps = buildTutorial(3, ctxFor('warrior'))!.steps.filter((s) => s.kind === 'move').map((s) => (s as { move: TutorialMove }).move);
    const [sq, four, trig, five, , casc] = steps;
    expect(findMatches(swap(toGrid(sq), sq.from, sq.to)).squares).toHaveLength(1);
    expect([...findMatches(swap(toGrid(four), four.from, four.to)).spawns.values()].map((s) => s.special)).toContain('line_v');
    expect([...findMatches(swap(toGrid(five), five.from, five.to)).spawns.values()].map((s) => s.special)).toContain('prismatic');
    const tg = swap(toGrid(trig), trig.from, trig.to);
    expect(findMatches(tg).matchedSet.has('6,3')).toBe(true);
    expect(tg[6][3]!.special).toBe('line_v');
    // zincir: ilk eşleşme silinip sütunlar düşünce satır 7'de yeni eşleşme
    const g = swap(toGrid(casc), casc.from, casc.to);
    const first = findMatches(g);
    expect([...first.matchedSet].sort()).toEqual(['7,2', '7,3', '7,4']);
    const after = g.map((r) => [...r]);
    for (const c of [2, 3, 4]) {
      for (let r = 7; r > 0; r--) after[r][c] = after[r - 1][c];
      after[0][c] = null;
    }
    expect(findMatches(after).matchedSet.has('7,1')).toBe(true);
  });
});

describe('öğretici içerikleri', () => {
  it('stage 4 is built from the selected hero’s real skills and ultimate', () => {
    for (const id of ['warrior', 'mage', 'ranger', 'paladin'] as HeroClassId[]) {
      const ctx = ctxFor(id);
      const plan = buildTutorial(4, ctx)!;
      const text = JSON.stringify(plan.steps);
      for (const sk of ctx.loadout) expect(text).toContain(sk.name);
      expect(text).toContain(ctx.ulti.name);
      const skill = plan.steps.find((s) => s.kind === 'skill') as { skillId: string } | undefined;
      expect(ctx.loadout.map((s) => s.id)).toContain(skill!.skillId);
      expect(plan.steps[plan.doneAt].kind).toBe('ulti');
    }
  });

  it('stage 5 names the real weakness and a defensive option for the hero', () => {
    const plan = buildTutorial(5, ctxFor('warrior'))!;
    const w = forest[4].enemy.weakness;
    expect(JSON.stringify(plan.steps)).toContain('%45');
    if (['fire', 'frost', 'nature', 'lightning', 'arcane'].includes(w)) expect(plan.steps.some((s) => s.kind === 'move')).toBe(true);
    expect(plan.steps[plan.steps.length - 1].kind).toBe('victory');
  });
});

describe('öğretici kaydı', () => {
  it('stage numbers, show-once, mark done, sanitize', () => {
    expect(forest.slice(0, 5).map((s) => tutorialNumber(s.id))).toEqual([1, 2, 3, 4, 5]);
    expect(tutorialNumber('forest_6')).toBe(0);
    const s = { tutorials: { done: [1, 3] } };
    expect(shouldShowTutorial(s, 'forest_1')).toBe(false);
    expect(shouldShowTutorial(s, 'forest_2')).toBe(true);
    expect(shouldShowTutorial(s, 'forest_6')).toBe(false);
    expect(markTutorialDone(s.tutorials, 2)).toEqual({ done: [1, 2, 3] });
    expect(sanitizeTutorials({ done: [5, 5, 9, 'x', 2] })).toEqual({ done: [2, 5] });
  });

  it('new save shows all 5; existing saves never force tutorials of stages already passed', () => {
    const fresh = createInitialSaveState();
    expect(fresh.tutorials.done).toEqual([]);
    const loaded = parseSaveString(JSON.stringify(fresh))!;
    expect(loaded.tutorials.done).toEqual([]);
    const old = { ...fresh, version: 13, tutorials: undefined, completedStages: ['forest_1', 'forest_2', 'forest_3'] };
    const migrated = parseSaveString(JSON.stringify(old))!;
    expect(migrated.tutorials.done).toEqual([1, 2, 3]);
    expect(tutorialsForExistingProgress(['forest_5'])).toEqual({ done: [5] });
    // yeniden göster: boşaltılmış liste geçişten sonra korunur (tekrar doldurulmaz)
    const reset = parseSaveString(JSON.stringify({ ...migrated, tutorials: { done: [] } }))!;
    expect(reset.tutorials.done).toEqual([]);
  });
});
