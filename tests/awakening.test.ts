import { describe, expect, it } from 'vitest';
import {
  AWAKEN_DROPS,
  AWAKEN_TIERS,
  awakenBonuses,
  awakenStatus,
  bossForStageOrder,
  canAwakenNow,
  performAwakening,
  rollAwakenDrop,

  stageAtOrder,
} from '../src/data/awakening';
import { WORLD_REGIONS } from '../src/data/world';
import { HERO_CLASSES } from '../src/data/classes';
import { computeHeroBuild } from '../src/utils/rpgLogic';
import { generateEquipmentItem } from '../src/data/items';
import type { GameSaveState, HeroClassId } from '../src/types/game';
import { SAVE_VERSION, createInitialSaveState, parseSaveString } from '../src/utils/storage';

const ROUTE = WORLD_REGIONS.flatMap((r) => r.stages);
const rich = (tier = 0, heroId: HeroClassId = 'warrior', upTo = 500): GameSaveState => {
  const s = createInitialSaveState();
  return {
    ...s,
    gold: 10_000_000,
    materials: { awakenShard: 5000, soulCrystal: 5000, divineEssence: 5000 },
    completedStages: ROUTE.slice(0, upTo).map((st) => st.id),
    heroUnlocks: Object.keys(s.heroes) as HeroClassId[],
    heroes: { ...s.heroes, [heroId]: { ...s.heroes[heroId], level: 50, awakening: tier } },
  };
};

describe('uyanış kademeleri ve maliyetleri', () => {
  it('5 tiers with the specified TOTAL bonuses, costs and stage thresholds', () => {
    expect(AWAKEN_TIERS.map((t) => [t.name, t.bonuses.hpPct, t.bonuses.atkPct, t.bonuses.defPct, t.bonuses.manaPct, t.bonuses.ultiPct])).toEqual([
      ['Uyanmış', 3, 2, 2, 0, 0],
      ['Yükselmiş', 6, 4, 4, 3, 0],
      ['Aşkın', 10, 7, 6, 5, 3],
      ['Efsanevi', 15, 10, 9, 7, 5],
      ['İlahi', 20, 15, 12, 10, 8],
    ]);
    expect(AWAKEN_TIERS.map((t) => [t.cost.awakenShard, t.cost.soulCrystal, t.cost.divineEssence, t.cost.gold, t.stageOrder])).toEqual([
      [25, 0, 0, 25000, 50],
      [50, 5, 0, 75000, 100],
      [100, 15, 0, 150000, 200],
      [175, 30, 5, 300000, 350],
      [250, 50, 15, 500000, 500],
    ]);
  });

  it('boss requirement = real world-map boss at / before each threshold', () => {
    const got = AWAKEN_TIERS.map((t) => bossForStageOrder(t.stageOrder));
    expect(got.map((b) => b.stageId)).toEqual(['sky_8', 'ashen_8', 'dragon_roost_10', 'black_tide_10', 'dawn_core_10']);
    for (const b of got) {
      const st = ROUTE.find((s) => s.id === b.stageId)!;
      expect(st.enemy.isBoss).toBe(true);
      expect(st.enemy.bossId).toBe(b.bossId);
      expect(b.order).toBeLessThanOrEqual(AWAKEN_TIERS.find((t) => bossForStageOrder(t.stageOrder).stageId === b.stageId)!.stageOrder);
    }
    expect(stageAtOrder(500).id).toBe('dawn_core_10');
  });

  it('every tier: exact deductions, sequential, keeps level/equipment/costume/skill points', () => {
    let s = rich(0);
    const hero0 = { ...s.heroes.warrior, skillPoints: 7, costumeId: undefined, equipped: { weapon: generateEquipmentItem({ level: 50, rarity: 'legendary', slot: 'weapon' }) } };
    s = { ...s, heroes: { ...s.heroes, warrior: hero0 } };
    for (const t of AWAKEN_TIERS) {
      const before = s;
      const r = performAwakening(s, 'warrior', t.tier - 1);
      expect(r.ok, t.name).toBe(true);
      expect(r.save.heroes.warrior.awakening).toBe(t.tier);
      expect(before.gold - r.save.gold).toBe(t.cost.gold);
      expect(before.materials.awakenShard - r.save.materials.awakenShard).toBe(t.cost.awakenShard);
      expect(before.materials.soulCrystal - r.save.materials.soulCrystal).toBe(t.cost.soulCrystal);
      expect(before.materials.divineEssence - r.save.materials.divineEssence).toBe(t.cost.divineEssence);
      const h = r.save.heroes.warrior;
      expect([h.level, h.skillPoints, h.equipped.weapon?.id, h.xp]).toEqual([hero0.level, hero0.skillPoints, hero0.equipped.weapon!.id, hero0.xp]);
      // diğer kahramanlar etkilenmez
      expect(r.save.heroes.mage.awakening ?? 0).toBe(0);
      s = r.save;
    }
    const st = awakenStatus(s, 'warrior');
    expect(st.maxed).toBe(true);
    expect(performAwakening(s, 'warrior', 5).ok).toBe(false);
  });

  it('blocked: missing materials / gold / stage+boss / level 50 / skipped tier / quick double tap', () => {
    const base = rich(0);
    const noShard = { ...base, materials: { ...base.materials, awakenShard: 24 } };
    expect(performAwakening(noShard, 'warrior', 0)).toMatchObject({ ok: false, toast: '1 Uyanış Parçası eksik' });
    expect(performAwakening(noShard, 'warrior', 0).save).toBe(noShard);
    const noGold = { ...base, gold: 24999 };
    expect(performAwakening(noGold, 'warrior', 0).ok).toBe(false);
    const early = rich(0, 'warrior', 47); // sky_8 (48) ve 50. aşama yok
    const ste = awakenStatus(early, 'warrior');
    expect(ste.stageOk).toBe(false);
    expect(ste.boss!.ok).toBe(false);
    expect(ste.blockers).toEqual(expect.arrayContaining(['50. aşamayı tamamla', 'Gök Tiranı Zephyros yenilmeli']));
    expect(performAwakening(early, 'warrior', 0).ok).toBe(false);
    const lvl49 = { ...base, heroes: { ...base.heroes, warrior: { ...base.heroes.warrior, level: 49 } } };
    expect(awakenStatus(lvl49, 'warrior').levelOk).toBe(false);
    expect(performAwakening(lvl49, 'warrior', 0)).toMatchObject({ ok: false, toast: 'Seviye 50 gerekli' });
    // kademe atlanamaz: tier 0 iken 1'den büyük beklenen kademe reddedilir
    expect(performAwakening(base, 'warrior', 2).ok).toBe(false);
    // çift dokunma: ikinci istek aynı beklenen kademeyle gelir → reddedilir (malzeme yetse de kademe II açılmaz)
    const first = performAwakening(base, 'warrior', 0);
    const second = performAwakening(first.save, 'warrior', 0);
    expect(second.ok).toBe(false);
    expect(second.save.heroes.warrior.awakening).toBe(1);
    expect(second.save.gold).toBe(first.save.gold);
  });

  it('card notification only when awakening is possible', () => {
    expect(canAwakenNow(rich(0), 'warrior')).toBe(true);
    expect(canAwakenNow(rich(0), 'mage')).toBe(false); // seviye 1
    expect(canAwakenNow(rich(5), 'warrior')).toBe(false);
  });
});

describe('uyanış bonusları gerçek yapıya ve güce yansır (birikmez)', () => {
  for (const id of ['warrior', 'mage', 'necromancer', 'seraph'] as HeroClassId[]) {
    it(`${HERO_CLASSES[id].name}: each tier applies its total % once`, () => {
      const s = createInitialSaveState();
      const eq = { weapon: generateEquipmentItem({ level: 50, rarity: 'legendary', slot: 'weapon', preferredClass: id }), chest: generateEquipmentItem({ level: 50, rarity: 'epic', slot: 'chest', preferredClass: id }) };
      const hero = { ...s.heroes[id], level: 50, equipped: eq, costumeId: undefined };
      const b0 = computeHeroBuild({ ...hero, awakening: 0 });
      let prevPower = b0.powerRating;
      for (const t of AWAKEN_TIERS) {
        const b = computeHeroBuild({ ...hero, awakening: t.tier });
        expect(b.stats.health).toBe(Math.round(b0.stats.health * (1 + t.bonuses.hpPct / 100)));
        expect(b.stats.attack).toBe(Math.round(b0.stats.attack * (1 + t.bonuses.atkPct / 100)));
        expect(b.stats.defense).toBe(Math.round(b0.stats.defense * (1 + t.bonuses.defPct / 100)));
        expect(b.passives.manaFlowPct - b0.passives.manaFlowPct).toBeCloseTo(t.bonuses.manaPct);
        expect(b.passives.ultiFocusPct - b0.passives.ultiFocusPct).toBeCloseTo(t.bonuses.ultiPct);
        expect(b.stats.critChance).toBe(b0.stats.critChance);
        expect(b.powerRating).toBeGreaterThan(prevPower);
        prevPower = b.powerRating;
        // aynı kademede iki kez hesaplamak aynı sonucu verir
        expect(computeHeroBuild({ ...hero, awakening: t.tier })).toEqual(b);
      }
    });
  }
  it('bonus table lookups: 0 and out-of-range', () => {
    expect(awakenBonuses(0)).toEqual({ hpPct: 0, atkPct: 0, defPct: 0, manaPct: 0, ultiPct: 0 });
    expect(awakenBonuses(9)).toEqual(AWAKEN_TIERS[4].bonuses);
    expect(awakenBonuses(undefined).hpPct).toBe(0);
  });
});

describe('malzeme düşmesi', () => {
  const st = (id: string) => ROUTE.find((s) => s.id === id)!;
  const order = (id: string) => ROUTE.findIndex((s) => s.id === id) + 1;
  it('thresholds and rates (deterministic rng)', () => {
    const always = () => 0; // her olasılık tutar, en küçük adet
    const never = () => 0.999;
    const boss50 = st('sky_8'); // sıra 48 < 51
    expect(rollAwakenDrop(boss50, order('sky_8'), always)).toEqual({ awakenShard: 0, soulCrystal: 0, divineEssence: 0 });
    expect(rollAwakenDrop(st('ocean_8'), order('ocean_8'), always).awakenShard).toBe(AWAKEN_DROPS.shard.boss[0]);
    expect(rollAwakenDrop(st('ocean_5'), order('ocean_5'), always).awakenShard).toBe(AWAKEN_DROPS.shard.elite[0]);
    expect(rollAwakenDrop(st('ocean_1'), order('ocean_1'), always).awakenShard).toBe(0); // normal
    expect(rollAwakenDrop(st('ocean_8'), order('ocean_8'), always).soulCrystal).toBe(0); // <101
    const b150 = ROUTE.slice(100, 199).find((s) => s.enemy.isBoss)!;
    expect(rollAwakenDrop(b150, order(b150.id), always)).toMatchObject({ soulCrystal: AWAKEN_DROPS.crystal.amount[0], divineEssence: 0 });
    const b300 = ROUTE.slice(200).find((s) => s.enemy.isBoss)!;
    expect(rollAwakenDrop(b300, order(b300.id), always).divineEssence).toBe(AWAKEN_DROPS.essence.amount[0]);
    expect(rollAwakenDrop(b300, order(b300.id), never)).toEqual({ awakenShard: 0, soulCrystal: 0, divineEssence: 0 });

  });
  it('expected first-clear yield roughly reaches each tier threshold (single hero)', () => {
    const exp = { shard: 0, crystal: 0, essence: 0 };
    const at: Record<number, typeof exp> = {};
    const avg = ([a, b]: [number, number]) => (a + b) / 2;
    ROUTE.forEach((s, i) => {
      const o = i + 1;
      if (o >= 51 && s.enemy.isBoss) exp.shard += 0.3 * avg(AWAKEN_DROPS.shard.boss);
      else if (o >= 51 && s.type === 'elite') exp.shard += 0.15 * avg(AWAKEN_DROPS.shard.elite);
      if (o >= 101 && s.enemy.isBoss) exp.crystal += 0.15 * avg(AWAKEN_DROPS.crystal.amount);
      if (o >= 201 && s.enemy.isBoss) exp.essence += 0.05 * avg(AWAKEN_DROPS.essence.amount);
      at[o] = { ...exp };
    });
    let cum = { s: 0, c: 0, e: 0 };
    for (const t of AWAKEN_TIERS) {
      cum = { s: cum.s + t.cost.awakenShard, c: cum.c + t.cost.soulCrystal, e: cum.e + t.cost.divineEssence };
      if (t.tier >= 3) {
        expect(at[t.stageOrder].shard / cum.s).toBeGreaterThan(0.5);
        expect(at[t.stageOrder].shard / cum.s).toBeLessThan(1.6);
      }
    }
    expect(at[500].crystal).toBeGreaterThan(60);
    expect(at[500].essence).toBeGreaterThan(12);
  });
});

describe('kayıt', () => {
  it('old saves: heroes at tier 0, materials 0; values persist and are clamped', () => {
    const s = createInitialSaveState();
    expect(s.materials).toEqual({ awakenShard: 0, soulCrystal: 0, divineEssence: 0 });
    const old = { ...s, version: 14, materials: undefined };
    const loaded = parseSaveString(JSON.stringify(old))!;
    expect(loaded.version).toBe(SAVE_VERSION);
    expect(loaded.materials).toEqual({ awakenShard: 0, soulCrystal: 0, divineEssence: 0 });
    expect(Object.values(loaded.heroes).every((h) => (h.awakening ?? 0) === 0)).toBe(true);
    const w = { ...loaded, materials: { awakenShard: 12, soulCrystal: -3, divineEssence: 2.7 }, heroes: { ...loaded.heroes, warrior: { ...loaded.heroes.warrior, awakening: 9 } } };
    const re = parseSaveString(JSON.stringify(w))!;
    expect(re.materials).toEqual({ awakenShard: 12, soulCrystal: 0, divineEssence: 2 });
    expect(re.heroes.warrior.awakening).toBe(5);
  });
});
