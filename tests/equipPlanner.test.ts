import { describe, expect, it } from 'vitest';
import { getSet, SET_SLOTS, type SetSlot } from '../src/data/sets';
import {
  DEFAULT_EQUIP_SCORING,
  DISPLAY_SLOT_ORDER,
  planBestEquipment,
  scoreSetEffects,
  type EquipScoring,
} from '../src/game/equipPlanner';
import { applyEquipPlan, autoEquipBest, enhanceItem } from '../src/state/saveActions';
import type { EquipmentItem, EquipmentSetId, EquipmentSlot, GameSaveState, HeroProgress } from '../src/types/game';
import { computeHeroBuild, getItemPowerScore } from '../src/utils/rpgLogic';
import { createInitialSaveState } from '../src/utils/storage';

let n = 0;
/** Güç puanı = health × 0.45 (common nadirlik, başka özellik yok): puanı doğrudan health ile ayarlıyoruz. */
function item(slot: EquipmentSlot, health: number, opts: { setId?: EquipmentSetId; levelReq?: number; id?: string; upgrade?: number } = {}): EquipmentItem {
  const set = opts.setId ? getSet(opts.setId) : null;
  return {
    id: opts.id ?? `t${++n}`,
    name: set ? set.pieceNames[slot as SetSlot] : `Eşya ${n}`,
    description: '',
    slot,
    category: slot === 'weapon' ? 'sword' : slot === 'offhand' ? 'shield' : slot.startsWith('ring') || slot === 'necklace' ? 'accessory' : 'heavy_armor',
    rarity: 'common',
    levelReq: opts.levelReq ?? 1,
    upgradeLevel: opts.upgrade ?? 0,
    element: 'physical',
    stats: { health },
    sellValue: 1,
    visual: { primaryColor: '#000', secondaryColor: '#000', glowColor: '#000', variant: 'iron' },
    ...(opts.setId ? { setId: opts.setId } : {}),
  };
}
const score = (i: EquipmentItem) => getItemPowerScore(i);

function heroWith(equipped: Partial<Record<EquipmentSlot, EquipmentItem>> = {}, level = 1): HeroProgress {
  return { ...createInitialSaveState().heroes.warrior, level, equipped };
}
const saveWith = (hero: HeroProgress, inventory: EquipmentItem[]): GameSaveState => {
  const s = createInitialSaveState();
  return { ...s, heroes: { ...s.heroes, warrior: hero }, inventory };
};
const ids = (e: Partial<Record<EquipmentSlot, EquipmentItem>>) => Object.values(e).filter(Boolean).map((i) => i!.id);
const noSets: EquipScoring = { ...DEFAULT_EQUIP_SCORING, unitValue: { fireDamagePct: 0, frostManaPct: 0, natureHealPct: 0, firstFireUlti: 0, squareShieldPct: 0, natureCooldownTurn: 0 } };

describe('equipment planner: basics', () => {
  it('picks the strongest item per slot from bag and worn gear', () => {
    const worn = { weapon: item('weapon', 100), chest: item('chest', 100) };
    const bag = [item('weapon', 300, { id: 'w-big' }), item('chest', 50), item('helmet', 80, { id: 'h1' })];
    const plan = planBestEquipment(heroWith(worn), bag);
    expect(plan.proposed.weapon?.id).toBe('w-big');
    expect(plan.proposed.chest?.id).toBe(worn.chest.id); // mevcut daha iyi: korunur
    expect(plan.proposed.helmet?.id).toBe('h1');
    expect(plan.changes.map((c) => c.slot)).toEqual(['helmet', 'weapon']);
    expect(plan.unchanged).toBe(false);
  });

  it('the current combination is a candidate: when it is already best the plan is unchanged', () => {
    const worn = { weapon: item('weapon', 500), chest: item('chest', 500), helmet: item('helmet', 500) };
    const plan = planBestEquipment(heroWith(worn), [item('weapon', 100), item('chest', 50)]);
    expect(plan.unchanged).toBe(true);
    expect(plan.changes).toEqual([]);
    expect(plan.proposedScore).toBe(plan.currentScore);
  });

  it('equal scores keep the worn item (no pointless swap)', () => {
    const worn = { weapon: item('weapon', 200, { id: 'worn' }) };
    const plan = planBestEquipment(heroWith(worn), [item('weapon', 200, { id: 'twin' })]);
    expect(plan.unchanged).toBe(true);
    expect(plan.proposed.weapon?.id).toBe('worn');
  });

  it('respects the hero level but keeps an already worn item that is above it', () => {
    const plan = planBestEquipment(heroWith({}, 5), [item('weapon', 999, { id: 'too-high', levelReq: 20 }), item('weapon', 50, { id: 'ok', levelReq: 5 })]);
    expect(plan.proposed.weapon?.id).toBe('ok');
    const worn = { weapon: item('weapon', 40, { id: 'worn-high', levelReq: 30 }) };
    const keep = planBestEquipment(heroWith(worn, 5), [item('weapon', 30, { id: 'lower' })]);
    expect(keep.proposed.weapon?.id).toBe('worn-high');
  });

  it('never picks one item for two slots (rings), and takes the best two distinct rings', () => {
    const bag = [item('ring1', 100, { id: 'a' }), item('ring2', 300, { id: 'b' }), item('ring1', 200, { id: 'c' }), item('ring2', 50, { id: 'd' })];
    const worn = { ring1: item('ring1', 10, { id: 'worn' }) };
    const plan = planBestEquipment(heroWith(worn), bag);
    expect(plan.proposed.ring1?.id).toBe('b');
    expect(plan.proposed.ring2?.id).toBe('c');
    expect(new Set(ids(plan.proposed)).size).toBe(ids(plan.proposed).length);
    // tek yüzük varsa ikinci yuva boş kalır, aynı yüzük iki kez seçilmez
    const single = planBestEquipment(heroWith({}), [item('ring1', 100, { id: 'only' })]);
    expect(single.proposed.ring1?.id).toBe('only');
    expect(single.proposed.ring2).toBeUndefined();
  });

  it('every proposed item is unique across all slots (random stress)', () => {
    for (let t = 0; t < 50; t++) {
      const bag: EquipmentItem[] = [];
      for (let i = 0; i < 80; i++) {
        const slot = DISPLAY_SLOT_ORDER[Math.floor(Math.random() * 10)];
        const sid = (['ember', 'glacier', 'life', undefined] as const)[Math.floor(Math.random() * 4)];
        bag.push(item(slot, Math.round(Math.random() * 400), { setId: (SET_SLOTS as readonly string[]).includes(slot) ? sid : undefined }));
      }
      const plan = planBestEquipment(heroWith({ weapon: item('weapon', 5) }, 20), bag);
      const all = ids(plan.proposed);
      expect(new Set(all).size).toBe(all.length);
      for (const [slot, it] of Object.entries(plan.proposed)) {
        if (slot === 'ring1' || slot === 'ring2') expect(['ring1', 'ring2']).toContain(it!.slot);
        else expect(it!.slot).toBe(slot);
      }
    }
  });

  it('uses effective stats: an upgraded item can beat a stronger-looking base item', () => {
    const upgraded = item('weapon', 200, { id: 'up', upgrade: 6 }); // +6 => 1.84x
    const base = item('weapon', 300, { id: 'base' });
    expect(score(upgraded)).toBeGreaterThan(score(base));
    expect(planBestEquipment(heroWith({}), [base, upgraded]).proposed.weapon?.id).toBe('up');
  });
});

describe('equipment planner: set bonuses in the score', () => {
  // Köz parçaları (90 sağlık ≈ 40 puan) vs. normal parçalar
  const emberPieces = (h: number) => SET_SLOTS.map((s) => item(s, h, { setId: 'ember', id: `ember-${s}` }));
  const normals = (h: number) => SET_SLOTS.map((s) => item(s, h, { id: `normal-${s}` }));

  it('prefers a complete 4-piece set when its bonuses outweigh slightly weaker pieces', () => {
    // Normal parçalar 15 sağlık (≈6.75 puan) güçlü: 4 parça farkı ≈27 puan < 4p toplam bonusu (60+28=88)
    const plan = planBestEquipment(heroWith({}), [...emberPieces(200), ...normals(215)]);
    expect(SET_SLOTS.every((s) => plan.proposed[s]?.setId === 'ember')).toBe(true);
    expect(plan.setDiffs[0]).toMatchObject({ before: 0, after: 4, gained: [2, 4] });
  });

  it('with a bigger power gap the optimum is 2 set pieces + 2 stronger normal pieces (4p bonus alone is not worth it)', () => {
    // Normal parçalar 40 sağlık (18 puan) güçlü: 2 ek parça kaybı 36 puan > 4p bonusu 28 puan; 2p bonusu (60) yine değer
    const plan = planBestEquipment(heroWith({}), [...emberPieces(200), ...normals(240)]);
    expect(SET_SLOTS.filter((s) => plan.proposed[s]?.setId === 'ember')).toHaveLength(2);
    expect(plan.setDiffs[0]).toMatchObject({ after: 2, gained: [2] });
  });

  it('prefers strong normal gear when it is much stronger than the set pieces', () => {
    const plan = planBestEquipment(heroWith({}), [...emberPieces(200), ...normals(400)]);
    expect(SET_SLOTS.every((s) => !plan.proposed[s]?.setId)).toBe(true);
  });

  it('with set scoring disabled it ignores sets and only compares base power', () => {
    const plan = planBestEquipment(heroWith({}), [...emberPieces(200), ...normals(240)], noSets);
    expect(SET_SLOTS.every((s) => !plan.proposed[s]?.setId)).toBe(true);
  });

  it('can pick a 2+2 mixed set combination when each 2-piece bonus pays off', () => {
    const glacier = SET_SLOTS.map((s) => item(s, 200, { setId: 'glacier', id: `gl-${s}` }));
    const ember = SET_SLOTS.map((s) => item(s, 200, { setId: 'ember', id: `em-${s}` }));
    // Normal parçalar her yuvada çok güçlü değil: yalnızca kask/göğüslük Köz, eldiven/çizme Buzul güçlü
    const strongNormals = SET_SLOTS.map((s) => item(s, 215, { id: `nn-${s}` }));
    // Köz 2p = 60, Buzul 2p = 30: iki set 2'şer parça → 90 puan; her parça ~7 puan kaybı (4 × 6.75 = 27) < 90
    const bag = [...ember.filter((e) => ['helmet', 'chest'].includes(e.slot)), ...glacier.filter((g) => ['gloves', 'boots'].includes(g.slot)), ...strongNormals];
    const plan = planBestEquipment(heroWith({}), bag);
    expect(plan.proposed.helmet?.setId).toBe('ember');
    expect(plan.proposed.chest?.setId).toBe('ember');
    expect(plan.proposed.gloves?.setId).toBe('glacier');
    expect(plan.proposed.boots?.setId).toBe('glacier');
    expect(plan.setDiffs.map((d) => [d.def.id, d.after])).toEqual([['ember', 2], ['glacier', 2]]);
  });

  it('two sets with equal pieces: two 2-piece bonuses (60+30=90) narrowly beat one 4-piece set (60+28=88) -> 2+2', () => {
    const glacier = SET_SLOTS.map((s) => item(s, 200, { setId: 'glacier', id: `gl-${s}` }));
    const plan = planBestEquipment(heroWith({}), [...emberPieces(200), ...glacier]);
    const counts = (id: string) => SET_SLOTS.filter((s) => plan.proposed[s]?.setId === id).length;
    expect([counts('ember'), counts('glacier')]).toEqual([2, 2]);
  });

  it('scoring is configurable: valuing the Ember 4-piece bonus higher flips the choice to the full Ember set', () => {
    const glacier = SET_SLOTS.map((s) => item(s, 200, { setId: 'glacier', id: `gl-${s}` }));
    const cfg: EquipScoring = { ...DEFAULT_EQUIP_SCORING, unitValue: { ...DEFAULT_EQUIP_SCORING.unitValue, firstFireUlti: 20 } };
    const plan = planBestEquipment(heroWith({}), [...emberPieces(200), ...glacier], cfg);
    expect(SET_SLOTS.every((s) => plan.proposed[s]?.setId === 'ember')).toBe(true);
  });

  it('scoring is configurable: valuing Glacier highly picks the full Glacier set', () => {
    const glacier = SET_SLOTS.map((s) => item(s, 200, { setId: 'glacier', id: `gl-${s}` }));
    const cfg: EquipScoring = { ...DEFAULT_EQUIP_SCORING, unitValue: { ...DEFAULT_EQUIP_SCORING.unitValue, squareShieldPct: 400 } };
    const plan = planBestEquipment(heroWith({}), [...emberPieces(200), ...glacier], cfg);
    expect(SET_SLOTS.every((s) => plan.proposed[s]?.setId === 'glacier')).toBe(true);
  });

  it('bonus values scale with hero level', () => {
    const eff = { fireDmgPct: 10, frostManaPct: 0, natureHealPct: 0, firstFireUlti: 0, squareShieldPct: 0, squareShieldCapPct: 0, natureCooldownReduce: 0 };
    expect(scoreSetEffects(eff, 1)).toBe(60);
    expect(scoreSetEffects(eff, 21)).toBeCloseTo(60 * (1 + 20 * 0.06));
  });

  it('keeps worn set pieces when they are already the best combination (candidate: current)', () => {
    const worn: Partial<Record<EquipmentSlot, EquipmentItem>> = {};
    for (const s of SET_SLOTS) worn[s] = item(s, 200, { setId: 'ember' });
    const plan = planBestEquipment(heroWith(worn), normals(210)); // 4 × 4.5p farkı < bonus
    expect(plan.unchanged).toBe(true);
  });

  it('a lone off-set piece is only used when its own power beats the set bonus loss', () => {
    const worn: Partial<Record<EquipmentSlot, EquipmentItem>> = {};
    for (const s of SET_SLOTS) worn[s] = item(s, 200, { setId: 'ember' });
    // Çok güçlü tek bir normal kask: 4p bonusu kaybetmeye değmez; çok daha güçlüyse değer
    const weak = planBestEquipment(heroWith(worn), [item('helmet', 260)]);
    expect(weak.unchanged).toBe(true);
    const huge = planBestEquipment(heroWith(worn), [item('helmet', 900)]);
    expect(huge.proposed.helmet?.setId).toBeUndefined();
  });
});

describe('equipment planner: plan data and applying it', () => {
  it('preview stats and set bonuses match the values after equipping', () => {
    const inv = [item('weapon', 400, { id: 'W' }), ...SET_SLOTS.map((s) => item(s, 220, { setId: 'glacier', id: `g-${s}` }))];
    const hero = heroWith({ weapon: item('weapon', 50) });
    const plan = planBestEquipment(hero, inv);
    const save = saveWith(hero, inv);
    const res = applyEquipPlan(save, plan);
    const after = res.save.heroes.warrior;
    expect(computeHeroBuild(after).stats).toEqual(plan.statsAfter);
    expect(computeHeroBuild(hero).stats).toEqual(plan.statsBefore);
    expect(computeHeroBuild(after).sets.find((s) => s.def.id === 'glacier')?.count).toBe(plan.setDiffs[0].after);
  });

  it('applies everything in one save update and conserves every item', () => {
    const worn = { weapon: item('weapon', 50), helmet: item('helmet', 50) };
    const inv = [item('weapon', 400), item('helmet', 300), item('ring1', 100), item('ring2', 90), item('ring1', 80)];
    const hero = heroWith(worn);
    const save = saveWith(hero, inv);
    const plan = planBestEquipment(hero, inv);
    const res = applyEquipPlan(save, plan);
    const before = [...ids(worn), ...inv.map((i) => i.id)].sort();
    const afterIds = [...ids(res.save.heroes.warrior.equipped), ...res.save.inventory.map((i) => i.id)].sort();
    expect(afterIds).toEqual(before);
    expect(res.save).not.toBe(save);
    expect(res.save.inventory.some((i) => i.id === worn.weapon.id)).toBe(true); // eski silah çantaya döndü
  });

  it('declining (not applying) leaves the save untouched; unchanged plans change nothing', () => {
    const hero = heroWith({ weapon: item('weapon', 500) });
    const save = saveWith(hero, [item('weapon', 10)]);
    const plan = planBestEquipment(hero, save.inventory);
    expect(plan.unchanged).toBe(true);
    const res = applyEquipPlan(save, plan);
    expect(res.save).toBe(save);
    expect(res.toast).toContain('Mevcut ekipmanların önerilen kombinasyonda');
  });

  it('a stale plan (inventory changed meanwhile) is refused', () => {
    const hero = heroWith({});
    const inv = [item('weapon', 300, { id: 'gone' })];
    const plan = planBestEquipment(hero, inv);
    const res = applyEquipPlan(saveWith(hero, []), plan);
    expect(res.toast).toContain('yeniden hesapla');
    expect(res.save.heroes.warrior.equipped.weapon).toBeUndefined();
  });

  it('autoEquipBest (no preview) applies the same plan', () => {
    const hero = heroWith({});
    const save = saveWith(hero, [item('weapon', 300, { id: 'W' })]);
    expect(autoEquipBest(save).save.heroes.warrior.equipped.weapon?.id).toBe('W');
  });

  it('after an upgrade the planner uses the new item stats', () => {
    const a = item('weapon', 300, { id: 'A' }); // güç 135
    const b = item('weapon', 280, { id: 'B' }); // güç 126 (B zayıf)
    let save = saveWith(heroWith({ weapon: a }), [b]);
    expect(planBestEquipment(save.heroes.warrior, save.inventory).unchanged).toBe(true);
    save = { ...save, gold: 1e6, crystals: 1e5 };
    for (let i = 0; i < 3; i++) save = enhanceItem(save, 'B', false).save; // B +3 => 1.42x
    const plan = planBestEquipment(save.heroes.warrior, save.inventory);
    expect(plan.proposed.weapon?.id).toBe('B');
    expect(plan.proposed.weapon?.upgradeLevel).toBe(3);
  });
});

describe('equipment planner: performance with a huge inventory', () => {
  it('handles 20,000 items quickly (linear scan + at most 256 set combinations)', () => {
    const bag: EquipmentItem[] = [];
    for (let i = 0; i < 20000; i++) {
      const slot = DISPLAY_SLOT_ORDER[i % 10];
      const sid = (['ember', 'glacier', 'life', undefined] as const)[i % 4];
      bag.push(item(slot, (i * 37) % 500, { setId: (SET_SLOTS as readonly string[]).includes(slot) ? sid : undefined }));
    }
    const hero = heroWith({}, 40);
    const t0 = performance.now();
    const plan = planBestEquipment(hero, bag);
    const ms = performance.now() - t0;
    expect(ms).toBeLessThan(300);
    expect(plan.changes.length).toBeGreaterThan(0);
    expect(new Set(ids(plan.proposed)).size).toBe(ids(plan.proposed).length);
  });
});
