import { describe, expect, it } from 'vitest';
import { HERO_CLASS_LIST } from '../src/data/classes';
import { generateEquipmentItem } from '../src/data/items';
import {
  autoEquipBest,
  dismantleCommonItems,
  dismantleItem,
  enhanceItem,
  equipItem,
  resetSkills,
  selectHero,
  sellItem,
  unequipSlot,
  unlockHero,
  upgradeSkillNode,
} from '../src/state/saveActions';
import { createInitialSaveState } from '../src/utils/storage';
import type { EquipmentItem, GameSaveState, HeroClassId } from '../src/types/game';

const fresh = (): GameSaveState => createInitialSaveState();

function withItem(save: GameSaveState, patch: Partial<EquipmentItem> = {}): { save: GameSaveState; item: EquipmentItem } {
  const base = save.inventory[0] ?? generateEquipmentItem(1, 'common');
  const item: EquipmentItem = { ...base, id: `test_${Math.random()}`, ...patch };
  return { save: { ...save, inventory: [...save.inventory, item] }, item };
}

describe('hero actions', () => {
  it('refuses to select a locked hero', () => {
    const s = fresh();
    const locked = HERO_CLASS_LIST.find((c) => !s.heroUnlocks.includes(c.id))!.id;
    expect(selectHero(s, locked).save).toBe(s);
  });

  it('selects an unlocked hero', () => {
    const s = fresh();
    const r = selectHero(s, 'mage');
    expect(r.save.activeHeroClass).toBe('mage');
  });

  it('does not unlock without funds and does not mutate', () => {
    const s = { ...fresh(), gold: 0, crystals: 0 };
    const locked = HERO_CLASS_LIST.find((c) => c.unlockCost && !s.heroUnlocks.includes(c.id))!.id;
    const r = unlockHero(s, locked);
    expect(r.save).toBe(s);
    expect(r.toast).toBeTruthy();
  });

  it('unlocks, charges the cost and activates the hero', () => {
    const locked = HERO_CLASS_LIST.find((c) => c.unlockCost)!;
    const s = { ...fresh(), gold: 10_000_000, crystals: 100_000 };
    const r = unlockHero(s, locked.id as HeroClassId);
    expect(r.save.heroUnlocks).toContain(locked.id);
    expect(r.save.gold).toBe(s.gold - locked.unlockCost!.gold);
    expect(r.save.crystals).toBe(s.crystals - locked.unlockCost!.crystals);
    expect(r.save.activeHeroClass).toBe(locked.id);
  });
});

describe('inventory actions', () => {
  it('sells an item for its sell value', () => {
    const { save, item } = withItem(fresh(), { sellValue: 77 });
    const r = sellItem(save, item.id);
    expect(r.save.gold).toBe(save.gold + 77);
    expect(r.save.inventory.some((i) => i.id === item.id)).toBe(false);
  });

  it('ignores unknown item ids', () => {
    const s = fresh();
    expect(sellItem(s, 'nope').save).toBe(s);
    expect(dismantleItem(s, 'nope').save).toBe(s);
  });

  it('dismantling grants resources', () => {
    const { save, item } = withItem(fresh());
    const r = dismantleItem(save, item.id);
    expect(r.save.gold + r.save.crystals).toBeGreaterThan(save.gold + save.crystals);
  });

  it('dismantleCommonItems keeps non-common items and reports when nothing to do', () => {
    const rare = withItem(fresh(), { rarity: 'rare' });
    const none = dismantleCommonItems({ ...rare.save, inventory: [rare.item] });
    expect(none.save.inventory).toHaveLength(1);
    expect(none.toast).toContain('bulunamadı');

    const common = withItem({ ...rare.save, inventory: [rare.item] }, { rarity: 'common' });
    const done = dismantleCommonItems(common.save);
    expect(done.save.inventory.map((i) => i.rarity)).toEqual(['rare']);
  });

  it('equip moves the item out of the inventory and swaps the previous one back', () => {
    const s0 = fresh();
    const { save, item } = withItem(s0, { slot: 'weapon', levelReq: 1 });
    const prev = save.heroes[save.activeHeroClass].equipped.weapon;
    const r = equipItem(save, item);
    const hero = r.save.heroes[r.save.activeHeroClass];
    expect(hero.equipped.weapon?.id).toBe(item.id);
    expect(r.save.inventory.some((i) => i.id === item.id)).toBe(false);
    if (prev) expect(r.save.inventory.some((i) => i.id === prev.id)).toBe(true);
  });

  it('refuses equipment above the hero level', () => {
    const { save, item } = withItem(fresh(), { levelReq: 99 });
    const r = equipItem(save, item);
    expect(r.save).toBe(save);
    expect(r.toast).toBeTruthy();
  });

  it('unequip returns the item to the inventory', () => {
    const s = fresh();
    const hero = s.heroes[s.activeHeroClass];
    const slot = (Object.keys(hero.equipped) as (keyof typeof hero.equipped)[])[0];
    const eq = hero.equipped[slot]!;
    const r = unequipSlot(s, slot);
    expect(r.save.heroes[s.activeHeroClass].equipped[slot]).toBeUndefined();
    expect(r.save.inventory.some((i) => i.id === eq.id)).toBe(true);
  });

  it('auto-equip never loses items', () => {
    const { save } = withItem(withItem(fresh(), { slot: 'weapon' }).save, { slot: 'helmet' });
    const count = (s: GameSaveState) =>
      s.inventory.length + Object.keys(s.heroes[s.activeHeroClass].equipped).length;
    expect(count(autoEquipBest(save).save)).toBe(count(save));
  });

  it('enhance spends resources, raises the level and counts the stat', () => {
    const { save, item } = withItem({ ...fresh(), gold: 1_000_000, crystals: 100_000 }, { upgradeLevel: 0 });
    const r = enhanceItem(save, item.id, false);
    expect(r.save.inventory.find((i) => i.id === item.id)!.upgradeLevel).toBe(1);
    expect(r.save.gold).toBeLessThan(save.gold);
    expect(r.save.stats.itemsUpgraded).toBe(save.stats.itemsUpgraded + 1);
  });

  it('enhance is refused without funds and at the level cap', () => {
    const poor = withItem({ ...fresh(), gold: 0, crystals: 0 }, { upgradeLevel: 0 });
    expect(enhanceItem(poor.save, poor.item.id, false).save).toBe(poor.save);
    const maxed = withItem({ ...fresh(), gold: 1e9, crystals: 1e9 }, { upgradeLevel: 10 });
    expect(enhanceItem(maxed.save, maxed.item.id, false).save).toBe(maxed.save);
  });
});

describe('skill actions', () => {
  it('spends a point on a root node and refunds on reset', () => {
    const s = fresh();
    const hero = s.heroes[s.activeHeroClass];
    const cls = HERO_CLASS_LIST.find((c) => c.id === hero.classId)!;
    const root = cls.skillTree.find((n) => !n.requires)!;
    const up = upgradeSkillNode(s, root.id);
    const h1 = up.save.heroes[s.activeHeroClass];
    expect(h1.skillPoints).toBe(hero.skillPoints - 1);
    expect(h1.skillRanks[root.id]).toBe(1);
    const back = resetSkills(up.save).save.heroes[s.activeHeroClass];
    expect(back.skillPoints).toBe(hero.skillPoints);
    expect(back.skillRanks).toEqual({});
  });

  it('does nothing without skill points', () => {
    const s = fresh();
    s.heroes[s.activeHeroClass] = { ...s.heroes[s.activeHeroClass], skillPoints: 0 };
    const cls = HERO_CLASS_LIST.find((c) => c.id === s.activeHeroClass)!;
    expect(upgradeSkillNode(s, cls.skillTree[0].id).save).toBe(s);
  });
});
