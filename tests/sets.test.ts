import { beforeEach, describe, expect, it } from 'vitest';
import { getHunt, resolveHuntFireRule } from '../src/data/hunts';
import { generateEquipmentItem } from '../src/data/items';
import {
  EQUIPMENT_SETS,
  SET_DROP_CHANCE,
  SET_SLOTS,
  applySetIdentity,
  computeSetEffects,
  countEquippedSets,
  describeEffect,
  diffSetsOnEquip,
  freshSetFlags,
  getEquippedSetProgress,
  getSet,
  pickCooldownTarget,
  resolveSetFirstMatch,
  rollSetDrop,
  setForRegion,
  type SetSlot,
} from '../src/data/sets';
import type { EquipmentItem, EquipmentSetId, EquipmentSlot } from '../src/types/game';
import { computeHeroBuild } from '../src/utils/rpgLogic';
import { createInitialSaveState, loadGameState, parseSaveString, saveGameState } from '../src/utils/storage';

const piece = (setId: EquipmentSetId, slot: SetSlot): EquipmentItem =>
  applySetIdentity(generateEquipmentItem({ level: 10, rarity: 'rare', slot, forcedElement: getSet(setId).element }), getSet(setId));

type Equipped = Partial<Record<EquipmentSlot, EquipmentItem>>;
const wear = (setId: EquipmentSetId, n: number, base: Equipped = {}): Equipped => {
  const eq: Equipped = { ...base };
  SET_SLOTS.slice(0, n).forEach((slot) => (eq[slot] = piece(setId, slot)));
  return eq;
};

describe('set data (easily tunable)', () => {
  it('has the three sets with the agreed bonus values', () => {
    expect(EQUIPMENT_SETS.map((s) => s.id)).toEqual(['ember', 'glacier', 'life']);
    expect(getSet('ember').bonuses.map((b) => b.effect)).toEqual([
      { kind: 'fire_damage_pct', value: 10 },
      { kind: 'first_fire_ulti', value: 5 },
    ]);
    expect(getSet('glacier').bonuses.map((b) => b.effect)).toEqual([
      { kind: 'frost_mana_pct', value: 10 },
      { kind: 'first_square_shield', pctOfMaxHp: 5, capPctOfMaxHp: 15 },
    ]);
    expect(getSet('life').bonuses.map((b) => b.effect)).toEqual([
      { kind: 'nature_heal_pct', value: 10 },
      { kind: 'first_nature_cooldown', turns: 1 },
    ]);
    for (const s of EQUIPMENT_SETS) expect(s.bonuses.map((b) => b.pieces)).toEqual([2, 4]);
  });

  it('descriptions are generated from the data', () => {
    expect(describeEffect({ kind: 'fire_damage_pct', value: 10 })).toBe('Ateş taşlarının verdiği hasar +%10');
    expect(describeEffect({ kind: 'frost_mana_pct', value: 10 })).toBe('Buz taşlarından kazanılan mana +%10');
    expect(describeEffect({ kind: 'nature_heal_pct', value: 10 })).toBe('Doğa taşlarından gelen iyileştirme +%10');
    expect(describeEffect({ kind: 'first_fire_ulti', value: 5 })).toContain('+5 ulti');
    expect(describeEffect({ kind: 'first_fire_ulti', value: 8 })).toContain('+8 ulti');
  });

  it('the four set slots are helmet, chest, gloves and boots; sets map to their regions', () => {
    expect([...SET_SLOTS]).toEqual(['helmet', 'chest', 'gloves', 'boots']);
    expect(setForRegion('volcano')?.id).toBe('ember');
    expect(setForRegion('mountains')?.id).toBe('glacier');
    expect(setForRegion('forest')?.id).toBe('life');
    expect(setForRegion('ruins')).toBeUndefined();
  });
});

describe('wearing 0-4 pieces', () => {
  it.each([
    [0, false, false],
    [1, false, false],
    [2, true, false],
    [3, true, false],
    [4, true, true],
  ])('%i pieces of one set: 2pc=%s 4pc=%s', (n, two, four) => {
    const eff = computeSetEffects(wear('ember', n));
    expect(eff.fireDmgPct).toBe(two ? 10 : 0);
    expect(eff.firstFireUlti).toBe(four ? 5 : 0);
  });

  it('4 pieces run both bonuses together (all three sets)', () => {
    const glacier = computeSetEffects(wear('glacier', 4));
    expect(glacier.frostManaPct).toBe(10);
    expect(glacier.squareShieldPct).toBe(5);
    expect(glacier.squareShieldCapPct).toBe(15);
    const life = computeSetEffects(wear('life', 4));
    expect(life.natureHealPct).toBe(10);
    expect(life.natureCooldownReduce).toBe(1);
  });

  it('removing a piece drops the 4-piece bonus, removing another drops the 2-piece bonus', () => {
    const eq = wear('ember', 4);
    delete eq.boots;
    expect(computeSetEffects(eq)).toMatchObject({ fireDmgPct: 10, firstFireUlti: 0 });
    delete eq.gloves;
    expect(computeSetEffects(eq)).toMatchObject({ fireDmgPct: 10, firstFireUlti: 0 }); // 2 parça hâlâ var
    delete eq.chest;
    expect(computeSetEffects(eq).fireDmgPct).toBe(0);
  });

  it('different sets worn together keep their own counts and bonuses', () => {
    // 2 Köz + 2 Buzul: yuvalar paylaşılır (kask+göğüslük Köz, eldiven+çizme Buzul)
    const eq: Equipped = {
      helmet: piece('ember', 'helmet'),
      chest: piece('ember', 'chest'),
      gloves: piece('glacier', 'gloves'),
      boots: piece('glacier', 'boots'),
    };
    expect(countEquippedSets(eq)).toEqual({ ember: 2, glacier: 2 });
    expect(computeSetEffects(eq)).toMatchObject({ fireDmgPct: 10, frostManaPct: 10, firstFireUlti: 0, squareShieldPct: 0 });
    // 3 + 1: yalnızca 3 parçalı setin 2 parça bonusu
    const mixed: Equipped = { ...wear('life', 3), boots: piece('ember', 'boots') };
    expect(computeSetEffects(mixed)).toMatchObject({ natureHealPct: 10, natureCooldownReduce: 0, fireDmgPct: 0 });
  });

  it('only worn set slots count: a set id outside the four slots, or in the inventory, never counts', () => {
    const weapon = { ...piece('ember', 'helmet'), slot: 'weapon' as const };
    expect(countEquippedSets({ weapon })).toEqual({});
    expect(getEquippedSetProgress({})).toEqual([]);
  });

  it('an item belongs to exactly one set', () => {
    const it = piece('glacier', 'chest');
    expect(it.setId).toBe('glacier');
    expect(Object.keys(countEquippedSets({ chest: it }))).toEqual(['glacier']);
  });

  it('progress rows report counts and which bonuses are active', () => {
    const rows = getEquippedSetProgress(wear('glacier', 3));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ count: 3, twoActive: true, fourActive: false });
  });
});

describe('character stats integration (computeHeroBuild)', () => {
  const heroWith = (equipped: Equipped) => ({ ...createInitialSaveState().heroes.warrior, equipped });
  const base = computeHeroBuild(heroWith({}));

  it('2 Köz pieces add +10% fire damage on top of the existing passive', () => {
    const b = computeHeroBuild(heroWith(wear('ember', 2)));
    expect(b.passives.fireDmgPct - base.passives.fireDmgPct).toBe(10);
    expect(b.setEffects.firstFireUlti).toBe(0);
  });

  it('2 Buzul pieces add +10% mana from ice gems; 2 Yaşam pieces add heal-only +10%', () => {
    expect(computeHeroBuild(heroWith(wear('glacier', 2))).passives.frostManaPct - base.passives.frostManaPct).toBe(10);
    const life = computeHeroBuild(heroWith(wear('life', 2)));
    expect(life.passives.natureHealOnlyPct).toBe(10);
    expect(life.passives.natureHealPct).toBe(base.passives.natureHealPct); // kalkanı etkileyen genel pasife eklenmez
  });

  it('4 pieces expose the first-match effects; changing equipment recalculates', () => {
    const four = computeHeroBuild(heroWith(wear('ember', 4)));
    expect(four.setEffects.firstFireUlti).toBe(5);
    expect(four.sets.find((s) => s.def.id === 'ember')?.count).toBe(4);
    const eq = wear('ember', 4);
    delete eq.helmet;
    expect(computeHeroBuild(heroWith(eq)).setEffects.firstFireUlti).toBe(0);
  });

  it('set pieces keep normal item stats (rarity/level/upgrade rules)', () => {
    const plain = generateEquipmentItem({ level: 10, rarity: 'rare', slot: 'helmet', preferredClass: 'warrior' });
    const setPiece = applySetIdentity(
      generateEquipmentItem({ level: 10, rarity: 'rare', slot: 'helmet', preferredClass: 'warrior', forcedElement: 'fire' }),
      getSet('ember')
    );
    expect(Object.keys(setPiece.stats).sort()).toEqual(Object.keys(plain.stats).sort());
    expect(setPiece.rarity).toBe('rare');
    expect(setPiece.levelReq).toBe(10);
    expect(setPiece.upgradeLevel).toBe(0);
  });
});

describe('set drops', () => {
  const make = ({ slot, element }: { slot: EquipmentSlot; element: Parameters<typeof generateEquipmentItem>[0]['forcedElement'] }) =>
    generateEquipmentItem({ level: 12, rarity: 'epic', slot, forcedElement: element });
  const dropOf = (slot: EquipmentSlot) => generateEquipmentItem({ level: 12, rarity: 'epic', slot });

  it('starts at 20%', () => {
    expect(SET_DROP_CHANCE).toBe(0.2);
  });

  it('an eligible drop in a set region becomes a set piece below 20% and stays normal at or above it', () => {
    const hit = rollSetDrop(dropOf('chest'), 'volcano', make, () => 0.19);
    expect(hit.setId).toBe('ember');
    expect(hit.slot).toBe('chest');
    expect(hit.name).toBe('Köz Göğüslüğü');
    expect(hit.element).toBe('fire');
    expect(hit.rarity).toBe('epic');
    const miss = rollSetDrop(dropOf('chest'), 'volcano', make, () => 0.2);
    expect(miss.setId).toBeUndefined();
  });

  it('region decides the set: Donmuş Dağlar -> Buzul, Büyülü Orman -> Yaşam, other regions -> none', () => {
    expect(rollSetDrop(dropOf('boots'), 'mountains', make, () => 0).setId).toBe('glacier');
    expect(rollSetDrop(dropOf('gloves'), 'forest', make, () => 0).setId).toBe('life');
    expect(rollSetDrop(dropOf('helmet'), 'ruins', make, () => 0).setId).toBeUndefined();
  });

  it('only helmet, chest, gloves and boots can be set pieces', () => {
    for (const slot of ['pants', 'weapon', 'offhand', 'necklace', 'ring1', 'ring2'] as EquipmentSlot[]) {
      expect(rollSetDrop(dropOf(slot), 'volcano', make, () => 0).setId, slot).toBeUndefined();
    }
  });

  it('over many rolls about 20% of eligible drops are set pieces', () => {
    let hits = 0;
    const N = 5000;
    for (let i = 0; i < N; i++) if (rollSetDrop(dropOf('helmet'), 'volcano', make).setId) hits++;
    expect(hits / N).toBeGreaterThan(0.17);
    expect(hits / N).toBeLessThan(0.23);
  });
});

describe('equipment change diff', () => {
  it('shows bonuses gained and lost when swapping a piece', () => {
    const eq = wear('ember', 1);
    const gain = diffSetsOnEquip(eq, 'chest', piece('ember', 'chest'));
    expect(gain).toHaveLength(1);
    expect(gain[0]).toMatchObject({ before: 1, after: 2, gained: [2], lost: [] });

    const full = wear('ember', 4);
    const lose = diffSetsOnEquip(full, 'boots', generateEquipmentItem({ level: 5, rarity: 'common', slot: 'boots' }));
    expect(lose[0]).toMatchObject({ before: 4, after: 3, gained: [], lost: [4] });
  });

  it('swapping one set piece for another set piece changes both sets; unrelated swaps change nothing', () => {
    const eq = wear('ember', 2);
    const d = diffSetsOnEquip(eq, 'helmet', piece('glacier', 'helmet'));
    expect(d.map((x) => [x.def.id, x.before, x.after, x.lost, x.gained])).toEqual([
      ['ember', 2, 1, [2], []],
      ['glacier', 0, 1, [], []],
    ]);
    expect(diffSetsOnEquip(eq, 'weapon', generateEquipmentItem({ level: 5, rarity: 'common', slot: 'weapon' }))).toEqual([]);
  });

  it('unequipping reports the lost bonuses', () => {
    const eq = wear('life', 2);
    expect(diffSetsOnEquip(eq, 'helmet', null)[0]).toMatchObject({ before: 2, after: 1, lost: [2] });
  });
});

describe('first-match-of-turn bonuses', () => {
  const effectsFor = (id: EquipmentSetId) => computeSetEffects(wear(id, 4));
  const base = {
    flags: freshSetFlags(),
    counts: {},
    squareCount: 0,
    heroMaxHp: 1000,
    heroShield: 0,
    shieldPool: 0,
    cooldowns: {},
    skillOrder: ['a', 'b', 'c'],
  };

  it('Köz: first fire match gives +5 ulti once per turn (chain matches do not repeat it)', () => {
    const effects = effectsFor('ember');
    const first = resolveSetFirstMatch({ ...base, effects, counts: { fire: 3 } });
    expect(first.ulti).toBe(5);
    const chain = resolveSetFirstMatch({ ...base, effects, flags: first.flags, counts: { fire: 6 } });
    expect(chain.ulti).toBe(0);
    // yeni oyuncu turu: bayraklar sıfırlanır
    expect(resolveSetFirstMatch({ ...base, effects, flags: freshSetFlags(), counts: { fire: 3 } }).ulti).toBe(5);
    // ateş olmayan eşleşme bayrağı harcamaz
    const noFire = resolveSetFirstMatch({ ...base, effects, counts: { nature: 3 } });
    expect(noFire.ulti).toBe(0);
    expect(noFire.flags.fireUlti).toBe(false);
  });

  it('Köz + Kül Arenası: +5 and +5 are both given, total +10, capped by max ulti', () => {
    const effects = effectsFor('ember');
    const hunt = getHunt('ash_arena');
    const counts = { fire: 3 };
    const h = resolveHuntFireRule(hunt, { usedThisTurn: false }, counts, 0);
    const s = resolveSetFirstMatch({ ...base, effects, counts });
    expect(h.ulti + s.ulti).toBe(10);
    const maxUlti = 100;
    const gained = (current: number) => Math.min(maxUlti, current + h.ulti + s.ulti) - current;
    expect(gained(0)).toBe(10);
    expect(gained(95)).toBe(5); // sınırı aşmaz
    expect(gained(100)).toBe(0);
    // aynı turda ikinci ateş eşleşmesi iki bonusu da tekrar vermez
    const h2 = resolveHuntFireRule(hunt, { usedThisTurn: h.usedThisTurn }, counts, 0);
    const s2 = resolveSetFirstMatch({ ...base, effects, flags: s.flags, counts });
    expect(h2.ulti + s2.ulti).toBe(0);
  });

  it('Buzul: first square gives 5% max HP shield; several squares at once count once', () => {
    const effects = effectsFor('glacier');
    const r = resolveSetFirstMatch({ ...base, effects, squareCount: 3, counts: { frost: 12 } });
    expect(r.shield).toBe(50);
    const again = resolveSetFirstMatch({ ...base, effects, flags: r.flags, squareCount: 1, heroShield: 50, shieldPool: r.shieldPool });
    expect(again.shield).toBe(0);
    // kare yoksa tetiklenmez ve bayrak harcanmaz
    const none = resolveSetFirstMatch({ ...base, effects, squareCount: 0 });
    expect(none.shield).toBe(0);
    expect(none.flags.squareShield).toBe(false);
  });

  it('Buzul: accumulated bonus shield never exceeds 15% of max HP', () => {
    const effects = effectsFor('glacier');
    let pool = 0;
    let shield = 0;
    const grants: number[] = [];
    for (let turn = 0; turn < 6; turn++) {
      const r = resolveSetFirstMatch({ ...base, effects, flags: freshSetFlags(), squareCount: 1, heroShield: shield, shieldPool: pool });
      shield += r.shield;
      pool = r.shieldPool;
      grants.push(r.shield);
    }
    expect(grants).toEqual([50, 50, 50, 0, 0, 0]);
    expect(pool).toBe(150);
    // kalkan hasarla azalınca havuz da azalır ve bonus yeniden verilir (üst sınıra kadar)
    const afterHit = resolveSetFirstMatch({ ...base, effects, flags: freshSetFlags(), squareCount: 1, heroShield: 100, shieldPool: 150 });
    expect(afterHit.shieldPool).toBe(150); // 100 + 50
    expect(afterHit.shield).toBe(50);
    // kısmi hak: havuz 120 ise yalnızca 30 verilir
    const partial = resolveSetFirstMatch({ ...base, effects, flags: freshSetFlags(), squareCount: 1, heroShield: 500, shieldPool: 120 });
    expect(partial.shield).toBe(30);
    // başka kaynaktan gelen büyük kalkan, bonus havuzunu şişirmez (havuz kalkanla sınırlı)
    const small = resolveSetFirstMatch({ ...base, effects, flags: freshSetFlags(), squareCount: 1, heroShield: 20, shieldPool: 150 });
    expect(small.shieldPool).toBe(70);
  });

  it('Yaşam: first nature match reduces the highest cooldown by 1 (ties use skill order)', () => {
    const effects = effectsFor('life');
    const r = resolveSetFirstMatch({ ...base, effects, counts: { nature: 3 }, cooldowns: { a: 1, b: 3, c: 2 } });
    expect(r).toMatchObject({ cooldownTarget: 'b', cooldownReduce: 1 });
    const tie = resolveSetFirstMatch({ ...base, effects, counts: { nature: 3 }, cooldowns: { a: 2, b: 2, c: 1 } });
    expect(tie.cooldownTarget).toBe('a');
    // sıra b, a olsa eşitlikte b seçilir
    expect(pickCooldownTarget({ a: 2, b: 2 }, ['b', 'a'])).toBe('b');
    // beklemede yetenek yoksa hedef yok
    const idle = resolveSetFirstMatch({ ...base, effects, counts: { nature: 3 }, cooldowns: { a: 0, b: 0 } });
    expect(idle.cooldownTarget).toBeNull();
    expect(idle.cooldownReduce).toBe(0);
    // zincirde tekrar etmez
    const chain = resolveSetFirstMatch({ ...base, effects, flags: r.flags, counts: { nature: 3 }, cooldowns: { b: 3 } });
    expect(chain.cooldownTarget).toBeNull();
  });

  it('nothing happens without the 4-piece bonus', () => {
    const r = resolveSetFirstMatch({ ...base, effects: computeSetEffects(wear('ember', 2)), counts: { fire: 3, nature: 3 }, squareCount: 2, cooldowns: { a: 2 } });
    expect(r).toMatchObject({ ulti: 0, shield: 0, cooldownTarget: null });
  });
});

describe('saving and loading set items', () => {
  let store: Map<string, string>;
  beforeEach(() => {
    store = new Map();
    (globalThis as unknown as { localStorage: unknown }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
  });

  it('set items survive a save/load round trip, equipped and in the inventory', () => {
    const s = createInitialSaveState();
    s.heroes.warrior = { ...s.heroes.warrior, equipped: wear('ember', 4) };
    s.inventory = [...s.inventory, piece('life', 'gloves')];
    expect(saveGameState(s)).toBe(true);
    const loaded = loadGameState().save;
    expect(countEquippedSets(loaded.heroes.warrior.equipped)).toEqual({ ember: 4 });
    expect(loaded.inventory.some((i) => i.setId === 'life')).toBe(true);
    expect(computeSetEffects(loaded.heroes.warrior.equipped).firstFireUlti).toBe(5);
  });

  it('old items without set info load as normal equipment', () => {
    const s = createInitialSaveState();
    const raw = JSON.parse(JSON.stringify({ ...s, version: 5 }));
    for (const it of raw.inventory) delete it.setId;
    const loaded = parseSaveString(JSON.stringify(raw))!;
    expect(loaded.inventory.every((i) => i.setId === undefined)).toBe(true);
    expect(loaded.version).toBeGreaterThanOrEqual(6);
    expect(computeSetEffects(loaded.heroes.warrior.equipped)).toEqual(computeSetEffects({}));
  });

  it('broken set ids and set ids on non-set slots are stripped', () => {
    const s = createInitialSaveState();
    const bad = {
      ...s,
      inventory: [
        { ...piece('ember', 'helmet'), setId: 'nonsense' },
        { ...piece('ember', 'helmet'), slot: 'weapon' },
        piece('glacier', 'boots'),
      ],
    };
    const loaded = parseSaveString(JSON.stringify(bad))!;
    expect(loaded.inventory.map((i) => i.setId)).toEqual([undefined, undefined, 'glacier']);
  });
});
