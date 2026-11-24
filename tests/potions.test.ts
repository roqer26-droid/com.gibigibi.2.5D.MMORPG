import { SKILL_POINTS_PER_LEVEL } from '../src/data/passiveTree';
import { describe, expect, it } from 'vitest';
import { POTION_DROP, POTION_META, addPotions, emptyPotions, potionXp, previewPotion, rollPotionDrop, sanitizePotions, usePotion } from '../src/data/potions';
import { xpRequiredForLevel } from '../src/utils/rpgLogic';
import { createInitialSaveState, sanitizeSave } from '../src/utils/storage';
import { generateEquipmentItem } from '../src/data/items';
import { planBestEquipment } from '../src/game/equipPlanner';
import { applyEquipPlan } from '../src/state/saveActions';
import { WORLD_REGIONS } from '../src/data/world';

const stages = WORLD_REGIONS.flatMap((r) => r.stages);
const sample = (type: string, boss: boolean) => stages.find((s) => s.type === type && s.enemy.isBoss === boss)!;
const seeded = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);

describe('seviye iksirleri (sabit XP)', () => {
  const N = 20000;
  const run = (type: string, boss: boolean, seed: number) => {
    const rng = seeded(seed);
    const st = sample(type, boss);
    const hist = { small: [0, 0, 0], medium: 0, large: 0 };
    for (let i = 0; i < N; i++) {
      const d = rollPotionDrop(st, rng);
      hist.small[d.small]++;
      hist.medium += d.medium;
      hist.large += d.large;
    }
    return hist;
  };
  it('sabit XP değerleri', () => {
    expect(POTION_META.small.xp).toBe(2000);
    expect(POTION_META.medium.xp).toBe(5000);
    expect(POTION_META.large.xp).toBe(20000);
    for (const size of ['small', 'medium', 'large'] as const) expect(potionXp(size)).toBe(POTION_META[size].xp);
  });
  it('küçük iksir: tek %70 kontrolü; 1 ve 2 adet gelen tüm başarılı düşmeler bu %70 içinde', () => {
    for (const [type, boss] of [['normal', false], ['elite', false], ['treasure', false], ['boss', true]] as const) {
      const h = run(type, boss, 11);
      const drop = (h.small[1] + h.small[2]) / N;
      expect(drop, type).toBeGreaterThan(0.68);
      expect(drop, type).toBeLessThan(0.72);
      // 2 adet: toplam düşmenin %30'u (≈ %21 mutlak) — ayrı bir ikinci %70 kontrolü yok
      expect(h.small[2] / (h.small[1] + h.small[2]), type).toBeGreaterThan(0.27);
      expect(h.small[2] / (h.small[1] + h.small[2]), type).toBeLessThan(0.33);
      expect(h.small[2] / N, type).toBeLessThan(0.24);
    }
    expect(POTION_DROP.smallChance).toBe(0.7);
  });
  it('orta iksir oranları korunur (normal %18, elit/hazine %30, boss %45)', () => {
    const exp: [string, boolean, number][] = [['normal', false, 0.18], ['elite', false, 0.3], ['treasure', false, 0.3], ['boss', true, 0.45]];
    for (const [type, boss, rate] of exp) {
      const r = run(type, boss, 5).medium / N;
      expect(r, type).toBeGreaterThan(rate - 0.02);
      expect(r, type).toBeLessThan(rate + 0.02);
    }
  });
  it('büyük iksir yalnızca boss zaferinde %25', () => {
    for (const [type, boss] of [['normal', false], ['elite', false], ['treasure', false]] as const) expect(run(type, boss, 3).large, type).toBe(0);
    const r = run('boss', true, 3).large / N;
    expect(r).toBeGreaterThan(0.23);
    expect(r).toBeLessThan(0.27);
  });
  it('sabit XP farklı seviyelerde aynı; önizleme ile uygulama aynı sonucu verir', () => {
    for (const lvl of [1, 5, 14, 30, 49]) {
      for (const size of ['small', 'medium', 'large'] as const) {
        const s = createInitialSaveState();
        s.potions = { small: 1, medium: 1, large: 1 };
        const h = s.heroes[s.activeHeroClass];
        h.level = lvl;
        h.xp = 0;
        const pv = previewPotion(h, size);
        const r = usePotion(s, size);
        const after = r.save.heroes[s.activeHeroClass];
        expect(pv.xp).toBe(POTION_META[size].xp);
        expect(after.level).toBe(pv.toLevel);
        const total = (lv: number, xp: number) => { let t = xp; for (let l = 1; l < lv; l++) t += xpRequiredForLevel(l); return t; };
        if (after.level < 50) expect(total(after.level, after.xp) - total(lvl, 0)).toBe(POTION_META[size].xp);
      }
    }
  });
  it('tek kullanımda birden fazla seviye atlanır', () => {
    const s = createInitialSaveState();
    s.potions = { small: 0, medium: 0, large: 1 };
    const h = s.heroes[s.activeHeroClass];
    h.level = 1;
    h.xp = 0;
    const pv = previewPotion(h, 'large');
    expect(pv.toLevel).toBeGreaterThan(pv.fromLevel + 2);
    const r = usePotion(s, 'large');
    expect(r.ok).toBe(true);
    expect(r.levelsGained).toBe(pv.toLevel - 1);
    expect(r.save.heroes[s.activeHeroClass].level).toBe(pv.toLevel);
    expect(r.save.heroes[s.activeHeroClass].skillPoints).toBe(h.skillPoints + (pv.toLevel - 1) * SKILL_POINTS_PER_LEVEL);
    expect(r.save.potions.large).toBe(0);
  });
  it('seviye 50: iksir tüketilmez, önizleme engelli; boş stok reddedilir', () => {
    const max = createInitialSaveState();
    max.potions = { small: 1, medium: 2, large: 3 };
    max.heroes[max.activeHeroClass].level = 50;
    for (const size of ['small', 'medium', 'large'] as const) {
      expect(previewPotion(max.heroes[max.activeHeroClass], size).blocked).toBe(true);
      const m = usePotion(max, size);
      expect(m.ok).toBe(false);
      expect(m.save.potions).toEqual({ small: 1, medium: 2, large: 3 });
    }
    const s = createInitialSaveState();
    expect(usePotion(s, 'small').ok).toBe(false);
  });
  it('eski kayıt (iksirsiz) boş stokla yüklenir; mevcut stok korunur; bozuk değerler temizlenir', () => {
    const old: any = JSON.parse(JSON.stringify(createInitialSaveState()));
    delete old.potions;
    old.version = 11;
    expect(sanitizeSave(old)!.potions).toEqual(emptyPotions());
    const withStock: any = JSON.parse(JSON.stringify(createInitialSaveState()));
    withStock.potions = { small: 7, medium: 3, large: 1 };
    expect(sanitizeSave(withStock)!.potions).toEqual({ small: 7, medium: 3, large: 1 });
    expect(sanitizePotions({ small: -3, medium: 'x', large: 2.9 })).toEqual({ small: 0, medium: 0, large: 2 });
  });
  it('addPotions adetleri toplar (zafer ekranı ve stok aynı sayıyı kullanır)', () => {
    expect(addPotions({ small: 1, medium: 0, large: 0 }, { small: 2, medium: 1, large: 0 })).toEqual({ small: 3, medium: 1, large: 0 });
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

describe('ekipman geliştirme bildirimi', () => {
  it('başarılı yükseltmede alt bildirim yok; yetersiz kaynakta uyarı korunur', async () => {
    const { enhanceItem: upgradeItem } = await import('../src/state/saveActions');
    const s: any = createInitialSaveState();
    s.gold = 1e6; s.crystals = 1e6;
    const it = Object.values<any>(s.heroes[s.activeHeroClass].equipped)[0];
    const r = upgradeItem(s, it.id, true, it.slot);
    expect(r.save.heroes[s.activeHeroClass].equipped[it.slot].upgradeLevel).toBe(it.upgradeLevel + 1);
    expect(r.toast).toBeUndefined();
    const poor: any = createInitialSaveState(); poor.gold = 0; poor.crystals = 0;
    const it2 = Object.values<any>(poor.heroes[poor.activeHeroClass].equipped)[0];
    expect(upgradeItem(poor, it2.id, true, it2.slot).toast).toMatch(/yeterli/);
  });
});
