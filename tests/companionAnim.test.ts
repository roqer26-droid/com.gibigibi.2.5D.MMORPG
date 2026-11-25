import { describe, expect, it } from 'vitest';
import { COMPANIONS } from '../src/data/companions';
import { COMPANION_ANIM_TIMING, allCompanionAnimSpecs, companionAnimSpec, companionPose } from '../src/data/companionAnim';
import manifest from '../src/art/companions-anim/companion-anim-manifest.json';

describe('companion animation sheets', () => {
  it('every companion has a 4×3 sheet; frames fit the sheet; foot point inside the cell', () => {
    for (const c of COMPANIONS) {
      const s = companionAnimSpec(c.id)!;
      expect(s, c.id).not.toBeNull();
      expect([s.columns, s.rows]).toEqual([4, 3]);
      expect(s.frameHeight).toBe(s.cellSize);
      expect(s.frameWidth).toBeGreaterThanOrEqual(s.cellSize);
      expect(s.originX).toBeLessThan(s.cellSize);
      expect(s.originY).toBeLessThanOrEqual(s.cellSize);
      expect(s.originY).toBeGreaterThan(s.cellSize * 0.7);
      expect(s.url).toBeTruthy();
    }
    expect(allCompanionAnimSpecs()).toHaveLength(COMPANIONS.length);
    expect(companionAnimSpec('unknown')).toBeNull();
    // taşan efektler: Kök Filizi ve Köz Ejderciği saldırı karesi (2. satır 3. kare) geri taşındı
    const m = manifest.companions as Record<string, { movedOverflow: { row: number; toCol: number }[] }>;
    expect(m.root_sprout.movedOverflow).toEqual([expect.objectContaining({ row: 1, toCol: 2 })]);
    expect(m.ember_whelp.movedOverflow).toEqual([expect.objectContaining({ row: 1, toCol: 2 })]);
  });

  it('timings: idle 3.5 s loop, attack 600 ms, defend 800 ms', () => {
    expect(COMPANION_ANIM_TIMING).toEqual({ idle: 3500, attack: 600, defend: 800 });
  });

  it('idle loops on row 1 (frames 0–3), wraps after 3.5 s', () => {
    const frames = new Set<number>();
    for (let t = 0; t < 3500; t += 50) {
      const p = companionPose('idle', t);
      expect(p.done).toBe(false);
      expect(p.frame).toBeLessThan(4);
      expect(p.next).toBeLessThan(4);
      expect(p.mix).toBeGreaterThanOrEqual(0);
      expect(p.mix).toBeLessThanOrEqual(1);
      frames.add(p.frame);
    }
    expect([...frames].sort()).toEqual([0, 1, 2, 3]);
    expect(companionPose('idle', 3500 + 120)).toEqual(companionPose('idle', 120));
  });

  it('attack plays row 2 once in 600 ms; defend plays row 3 once in 800 ms; then done', () => {
    expect(companionPose('attack', 0).frame).toBe(4);
    expect(companionPose('attack', 599).frame).toBe(7);
    expect(companionPose('attack', 599).done).toBe(false);
    expect(companionPose('attack', 600).done).toBe(true);
    expect(companionPose('defend', 0).frame).toBe(8);
    expect(companionPose('defend', 799).frame).toBe(11);
    expect(companionPose('defend', 800).done).toBe(true);
    // her karede bir kez geçiş: sıra 4,5,6,7
    const seen: number[] = [];
    for (let t = 0; t < 600; t += 10) { const f = companionPose('attack', t).frame; if (seen[seen.length - 1] !== f) seen.push(f); }
    expect(seen).toEqual([4, 5, 6, 7]);
  });
});
