import { describe, expect, it } from 'vitest';
import { orderQuests, questGroup } from '../src/utils/questOrder';

describe('quest ordering', () => {
  const q = [
    { id: 'a', c: false, v: 1, t: 5 },
    { id: 'b', c: true, v: 5, t: 5 },
    { id: 'c', c: false, v: 5, t: 5 },
    { id: 'd', c: false, v: 0, t: 3 },
    { id: 'e', c: false, v: 9, t: 9 },
    { id: 'f', c: true, v: 2, t: 2 },
  ];
  const grp = (x: (typeof q)[number]) => questGroup(x.c, x.v, x.t);
  it('ready → active → claimed, keeping the original order inside each group', () => {
    const g = orderQuests(q, grp);
    expect(g.map((x) => x.group)).toEqual(['ready', 'active', 'claimed']);
    expect(g.map((x) => x.items.map((i) => i.id))).toEqual([['c', 'e'], ['a', 'd'], ['b', 'f']]);
  });
  it('claiming moves a quest to the end group; completing moves it to the top; empty groups vanish', () => {
    const claimed = q.map((x) => (x.id === 'c' ? { ...x, c: true } : x));
    expect(orderQuests(claimed, grp).map((x) => x.items.map((i) => i.id))).toEqual([['e'], ['a', 'd'], ['b', 'c', 'f']]);
    const done = q.map((x) => (x.id === 'd' ? { ...x, v: 3 } : x));
    expect(orderQuests(done, grp)[0].items.map((i) => i.id)).toEqual(['c', 'd', 'e']);
    expect(orderQuests([q[1]], grp).map((x) => x.group)).toEqual(['claimed']);
  });
});
