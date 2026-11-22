import { describe, expect, it } from 'vitest';
import { POTION_DROP, addPotions, emptyPotions, potionXp, rollPotionDrop, sanitizePotions, usePotion } from '../src/data/potions';
import { createInitialSaveState, sanitizeSave } from '../src/utils/storage';
import { generateEquipmentItem } from '../src/data/items';
import { planBestEquipment } from '../src/game/equipPlanner';
import { applyEquipPlan } from '../src/state/saveActions';
import { WORLD_REGIONS } from '../src/data/world';

const stages = WORLD_REGIONS.flatMap((r) => r.stages);
const sample = (type: string, boss: boolean) => stages.find((s) => s.type === type && s.enemy.isBoss === boss)!;
const seeded = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);

describe('seviye iksirleri', () => {
  it('büyük iksir yalnızca boss zaferlerinde düşer; küçük sık, orta belli ihtimalle', () => {
    const rng = seeded(7);
    const counts = { normal: emptyPotions(), boss: emptyPotions() };
    for (let i = 0; i < 4000; i++) {
      counts.normal = addPotions(counts.normal, rollPotionDrop(sample('normal', false), rng));
      counts.boss = addPotions(counts.boss, rollPotionDrop(sample('boss', true), rng));
    }
    expect(counts.normal.large).toBe(0);
    expect(counts.boss.large / 4000).toBeGreaterThan(POTION_DROP.largeBossChance - 0.05);
    expect(counts.boss.large / 4000).toBeLessThan(POTION_DROP.largeBossChance + 0.05);
    expect(counts.normal.small).toBeGreaterThan(counts.normal.medium * 3);
    expect(counts.normal.medium / 4000).toBeGreaterThan(0.12);
    expect(counts.normal.medium / 4000).toBeLessThan(0.25);
  });
  it('kullanım: XP verir, iksir harcanır, seviye 50 ve boş stokta reddedilir', () => {
    const s = createInitialSaveState();
    expect(usePotion(s, 'small').ok).toBe(false);
    s.potions = { small: 2, medium: 1, large: 1 };
    const r = usePotion(s, 'large');
    expect(r.ok).toBe(true);
    expect(r.save.potions.large).toBe(0);
    expect(r.save.heroes[s.activeHeroClass].level).toBeGreaterThan(1);
    expect(potionXp('large', 10)).toBeGreaterThan(potionXp('medium', 10));
    expect(potionXp('medium', 10)).toBeGreaterThan(potionXp('small', 10));
    const max = createInitialSaveState();
    max.potions = { small: 1, medium: 0, large: 0 };
    max.heroes[max.activeHeroClass].level = 50;
    const m = usePotion(max, 'small');
    expect(m.ok).toBe(false);
    expect(m.save.potions.small).toBe(1);
  });
  it('eski kayıt (iksirsiz) boş stokla yüklenir; bozuk değerler temizlenir', () => {
    const old: any = JSON.parse(JSON.stringify(createInitialSaveState()));
    delete old.potions;
    old.version = 11;
    expect(sanitizeSave(old)!.potions).toEqual(emptyPotions());
    expect(sanitizePotions({ small: -3, medium: 'x', large: 2.9 })).toEqual({ small: 0, medium: 0, large: 2 });
  });
});

describe('En İyilerini Kuşan: yüzük takası', () => {
  it('Yüzük 2’deki eşya Yüzük 1’e taşınan planlar uygulanır', () => {
    for (let t = 0; t < 40; t++) {
      const s: any = createInitialSaveState();
      s.activeHeroClass = 'werewolf';
      const h = s.heroes.werewolf;
      h.level = 14;
      const ring = (lv: number) => ({ ...generateEquipmentItem({ level: 1, rarity: 'epic', slot: 'ring1', preferredClass: 'werewolf' }), upgradeLevel: lv });
      const weak = ring(0), mid = ring(5), strong = ring(10);
      h.equipped = { ...h.equipped, ring1: { ...weak, slot: 'ring1' }, ring2: { ...strong, slot: 'ring2' } };
      s.inventory = [mid];
      const plan = planBestEquipment(h, s.inventory);
      const r = applyEquipPlan(s, plan);
      expect(plan.unchanged).toBe(false);
      {
        expect(r.toast).toBe('Önerilen ekipmanlar kuşanıldı!');
        const ids = Object.values(r.save.heroes.werewolf.equipped).map((i: any) => i.id);
        expect(new Set(ids).size).toBe(ids.length);
      }
    }
  });
});
