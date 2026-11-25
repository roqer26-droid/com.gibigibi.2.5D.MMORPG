import { describe, expect, it } from 'vitest';
import {
  FIRST_49_TITLE_IDS,
  TITLES,
  TITLE_COLLECTION_BONUSES,
  accountBonusOf,
  applyBattleReport,
  collectionBonus,
  markTitlesSeen,
  setActiveTitle,
  syncTitles,
  titleProgress,
  type BattleTitleReport,
} from '../src/data/titles';
import { WORLD_REGIONS } from '../src/data/world';
import { generateEquipmentItem } from '../src/data/items';
import { SET_IDS, SET_SLOTS } from '../src/data/sets';
import { computeHeroBuild } from '../src/utils/rpgLogic';
import { SAVE_VERSION, createInitialSaveState, parseSaveString } from '../src/utils/storage';
import type { CompanionId, EquipmentSlot, GameSaveState, HeroClassId } from '../src/types/game';

const ROUTE = WORLD_REGIONS.flatMap((r) => r.stages);
const BOSSES = [...new Set(ROUTE.map((s) => s.enemy.bossId).filter(Boolean))] as string[];
const ALL_HEROES = Object.keys(createInitialSaveState().heroes) as HeroClassId[];
const SLOTS: EquipmentSlot[] = ['helmet', 'chest', 'gloves', 'pants', 'boots', 'weapon', 'offhand', 'necklace', 'ring1', 'ring2'];
const COMPANIONS: CompanionId[] = ['root_sprout', 'ice_fox', 'ember_whelp', 'storm_owl', 'obsidian_tortoise', 'moon_moth'];

const base = (): GameSaveState => createInitialSaveState();
const earnedAfter = (s: GameSaveState) => syncTitles(s).save.titles.earned;
const withStats = (s: GameSaveState, p: Partial<GameSaveState['titles']['stats']>): GameSaveState => ({ ...s, titles: { ...s.titles, stats: { ...s.titles.stats, ...p } } });
const stars = (s: GameSaveState, n: number): GameSaveState => {
  // n aşamayı tamamla ve hepsine iki hedef yıldızı ver (aşama başına 3 yıldız)
  const ids = ROUTE.slice(0, n).map((x) => x.id);
  return { ...s, completedStages: ids, mastery: { ...s.mastery, objectives: Object.fromEntries(ids.map((id) => [id, { o1: true, o2: true }])) } };
};
const report = (p: Partial<BattleTitleReport>): BattleTitleReport => ({
  victory: true, squares: 0, weakHits: 0, companionTriggers: 0, damageTaken: 100, hpRatio: 0.5, ultiKill: false, barrierBroken: false,
  isBoss: false, isElite: false, recommendedLevel: 10, heroLevel: 10, countWin: false, ...p,
});

/** Her unvan için: şartı tam karşılayan kayıt ve hemen altında kalan kayıt. */
const CASES: Record<string, { yes: (s: GameSaveState) => GameSaveState; no: (s: GameSaveState) => GameSaveState }> = {
  first_step: { yes: (s) => ({ ...s, completedStages: [ROUTE[0].id] }), no: (s) => s },
  adventurer: { yes: (s) => ({ ...s, completedStages: ROUTE.slice(0, 25).map((x) => x.id) }), no: (s) => ({ ...s, completedStages: ROUTE.slice(0, 24).map((x) => x.id) }) },
  wanderer: { yes: (s) => ({ ...s, completedStages: ROUTE.slice(0, 50).map((x) => x.id) }), no: (s) => ({ ...s, completedStages: ROUTE.slice(0, 49).map((x) => x.id) }) },
  veteran_explorer: { yes: (s) => ({ ...s, completedStages: ROUTE.slice(0, 100).map((x) => x.id) }), no: (s) => ({ ...s, completedStages: ROUTE.slice(0, 99).map((x) => x.id) }) },
  realm_conqueror: { yes: (s) => ({ ...s, completedStages: ROUTE.slice(0, 250).map((x) => x.id) }), no: (s) => ({ ...s, completedStages: ROUTE.slice(0, 249).map((x) => x.id) }) },
  world_conqueror: { yes: (s) => ({ ...s, completedStages: ROUTE.map((x) => x.id) }), no: (s) => ({ ...s, completedStages: ROUTE.slice(0, 499).map((x) => x.id) }) },
  star_hunter: { yes: (s) => stars(s, 34), no: (s) => stars(s, 33) },
  star_keeper: { yes: (s) => stars(s, 167), no: (s) => stars(s, 166) },
  star_lord: { yes: (s) => stars(s, 334), no: (s) => stars(s, 333) },
  flawless_explorer: { yes: (s) => stars(s, 500), no: (s) => stars(s, 499) },
  monster_hunter: { yes: (s) => ({ ...s, stats: { ...s.stats, enemiesDefeated: 100 } }), no: (s) => ({ ...s, stats: { ...s.stats, enemiesDefeated: 99 } }) },
  invincible: { yes: (s) => ({ ...s, stats: { ...s.stats, enemiesDefeated: 500 } }), no: (s) => ({ ...s, stats: { ...s.stats, enemiesDefeated: 499 } }) },
  war_lord: { yes: (s) => ({ ...s, stats: { ...s.stats, enemiesDefeated: 2500 } }), no: (s) => ({ ...s, stats: { ...s.stats, enemiesDefeated: 2499 } }) },
  combo_master: { yes: (s) => ({ ...s, stats: { ...s.stats, highestCombo: 5 } }), no: (s) => ({ ...s, stats: { ...s.stats, highestCombo: 4 } }) },
  combo_legend: { yes: (s) => ({ ...s, stats: { ...s.stats, highestCombo: 8 } }), no: (s) => ({ ...s, stats: { ...s.stats, highestCombo: 7 } }) },
  square_master: { yes: (s) => withStats(s, { squares: 500 }), no: (s) => withStats(s, { squares: 499 }) },
  element_lord: { yes: (s) => withStats(s, { weakHits: 1000 }), no: (s) => withStats(s, { weakHits: 999 }) },
  back_from_death: { yes: (s) => applyBattleReport(s, report({ hpRatio: 0.05 })), no: (s) => applyBattleReport(s, report({ hpRatio: 0.06 })) },
  flawless_victory: {
    yes: (s) => applyBattleReport(s, report({ isBoss: true, damageTaken: 0, recommendedLevel: 20, heroLevel: 20 })),
    no: (s) => applyBattleReport(s, report({ isBoss: true, damageTaken: 1, recommendedLevel: 20, heroLevel: 20 })),
  },
  final_blow: { yes: (s) => applyBattleReport(s, report({ isBoss: true, ultiKill: true })), no: (s) => applyBattleReport(s, report({ isBoss: true, ultiKill: false })) },
  forest_guardian: { yes: (s) => ({ ...s, bossVictories: ['forest_guardian'] as GameSaveState['bossVictories'] }), no: (s) => s },
  ice_breaker: {
    yes: (s) => applyBattleReport(s, report({ isBoss: true, bossId: 'frost_queen', barrierBroken: true })),
    no: (s) => applyBattleReport(s, report({ isBoss: true, bossId: 'frost_queen', barrierBroken: false })),
  },
  dragon_slayer: { yes: (s) => ({ ...s, bossVictories: ['infernal_dragon'] as GameSaveState['bossVictories'] }), no: (s) => s },
  titan_slayer: { yes: (s) => ({ ...s, bossVictories: ['crystal_titan'] as GameSaveState['bossVictories'] }), no: (s) => s },
  abyss_ruler: { yes: (s) => ({ ...s, bossVictories: ['abyssal_king'] as GameSaveState['bossVictories'] }), no: (s) => s },
  boss_hunter: { yes: (s) => ({ ...s, bossVictories: BOSSES.slice(0, 25) as GameSaveState['bossVictories'] }), no: (s) => ({ ...s, bossVictories: BOSSES.slice(0, 24) as GameSaveState['bossVictories'] }) },
  boss_nightmare: { yes: (s) => ({ ...s, bossVictories: BOSSES.slice(0, 50) as GameSaveState['bossVictories'] }), no: (s) => ({ ...s, bossVictories: BOSSES.slice(0, 49) as GameSaveState['bossVictories'] }) },
  master_warrior: { yes: (s) => ({ ...s, heroes: { ...s.heroes, mage: { ...s.heroes.mage, level: 50 } } }), no: (s) => ({ ...s, heroes: { ...s.heroes, mage: { ...s.heroes.mage, level: 49 } } }) },
  hero_collector: { yes: (s) => ({ ...s, heroUnlocks: ALL_HEROES.slice(0, 10) }), no: (s) => ({ ...s, heroUnlocks: ALL_HEROES.slice(0, 9) }) },
  army_of_legends: { yes: (s) => ({ ...s, heroUnlocks: ALL_HEROES.slice(0, 22) }), no: (s) => ({ ...s, heroUnlocks: ALL_HEROES.slice(0, 21) }) },
  first_awakening: { yes: (s) => ({ ...s, heroes: { ...s.heroes, ranger: { ...s.heroes.ranger, awakening: 1 } } }), no: (s) => s },
  divine_hero: { yes: (s) => ({ ...s, heroes: { ...s.heroes, ranger: { ...s.heroes.ranger, awakening: 5 } } }), no: (s) => ({ ...s, heroes: { ...s.heroes, ranger: { ...s.heroes.ranger, awakening: 4 } } }) },
  awakened_legends: {
    yes: (s) => ({ ...s, heroes: Object.fromEntries(Object.entries(s.heroes).map(([k, h], i) => [k, i < 5 ? { ...h, awakening: 5 } : h])) as GameSaveState['heroes'] }),
    no: (s) => ({ ...s, heroes: Object.fromEntries(Object.entries(s.heroes).map(([k, h], i) => [k, i < 4 ? { ...h, awakening: 5 } : h])) as GameSaveState['heroes'] }),
  },
  master_smith: { yes: (s) => ({ ...s, stats: { ...s.stats, itemsUpgraded: 100 } }), no: (s) => ({ ...s, stats: { ...s.stats, itemsUpgraded: 99 } }) },
  perfect_gear: {
    yes: (s) => ({ ...s, heroes: { ...s.heroes, warrior: { ...s.heroes.warrior, equipped: Object.fromEntries(SLOTS.map((sl) => [sl, generateEquipmentItem({ level: 50, rarity: 'mythic', slot: sl })])) } } }),
    no: (s) => ({ ...s, heroes: { ...s.heroes, warrior: { ...s.heroes.warrior, equipped: Object.fromEntries(SLOTS.map((sl, i) => [sl, generateEquipmentItem({ level: 50, rarity: i === 0 ? 'legendary' : 'mythic', slot: sl })])) } } }),
  },
  set_master: {
    yes: (s) => ({ ...s, heroes: { ...s.heroes, warrior: { ...s.heroes.warrior, equipped: Object.fromEntries(SET_SLOTS.map((sl) => [sl, { ...generateEquipmentItem({ level: 30, rarity: 'epic', slot: sl }), setId: SET_IDS[0] }])) } } }),
    no: (s) => ({ ...s, heroes: { ...s.heroes, warrior: { ...s.heroes.warrior, equipped: Object.fromEntries(SET_SLOTS.slice(0, 3).map((sl) => [sl, { ...generateEquipmentItem({ level: 30, rarity: 'epic', slot: sl }), setId: SET_IDS[0] }])) } } }),
  },
  fashion_legend: { yes: (s) => ({ ...s, heroUnlocks: ALL_HEROES.slice(0, 22) }), no: (s) => ({ ...s, heroUnlocks: ALL_HEROES.slice(0, 2) }) },
  loyal_friend: { yes: (s) => ({ ...s, companions: { ...s.companions, unlocked: COMPANIONS.slice(0, 1) } }), no: (s) => ({ ...s, companions: { ...s.companions, unlocked: [] } }) },
  companion_collector: { yes: (s) => ({ ...s, companions: { ...s.companions, unlocked: COMPANIONS } }), no: (s) => ({ ...s, companions: { ...s.companions, unlocked: COMPANIONS.slice(0, 5) } }) },
  friend_of_nature: { yes: (s) => withStats(s, { companionTriggers: 250 }), no: (s) => withStats(s, { companionTriggers: 249 }) },
  spirit_guardian: { yes: (s) => withStats(s, { companionTriggers: 1000 }), no: (s) => withStats(s, { companionTriggers: 999 }) },
  dungeon_explorer: { yes: (s) => ({ ...s, dungeons: { roots_vault: { ...s.dungeons.roots_vault, completions: 1 } } }), no: (s) => s },
  dungeon_conqueror: { yes: (s) => ({ ...s, dungeons: { roots_vault: { ...s.dungeons.roots_vault, completions: 25 } } }), no: (s) => ({ ...s, dungeons: { roots_vault: { ...s.dungeons.roots_vault, completions: 24 } } }) },
  dungeon_ruler: { yes: (s) => ({ ...s, dungeons: { roots_vault: { ...s.dungeons.roots_vault, completions: 100 } } }), no: (s) => ({ ...s, dungeons: { roots_vault: { ...s.dungeons.roots_vault, completions: 99 } } }) },
  arena_hunter: {
    yes: (s) => ({ ...s, huntRecords: { frozen_throne: { ...s.huntRecords.frozen_throne, wins: 30 }, ash_arena: { ...s.huntRecords.ash_arena, wins: 20 } } }),
    no: (s) => ({ ...s, huntRecords: { frozen_throne: { ...s.huntRecords.frozen_throne, wins: 30 }, ash_arena: { ...s.huntRecords.ash_arena, wins: 19 } } }),
  },
  tower_climber: { yes: (s) => ({ ...s, tower: { ...s.tower, highest: 25 } }), no: (s) => ({ ...s, tower: { ...s.tower, highest: 24 } }) },
  tower_keeper: { yes: (s) => ({ ...s, tower: { ...s.tower, highest: 50 } }), no: (s) => ({ ...s, tower: { ...s.tower, highest: 49 } }) },
  tower_legend: { yes: (s) => ({ ...s, tower: { ...s.tower, highest: 75 } }), no: (s) => ({ ...s, tower: { ...s.tower, highest: 74 } }) },
  tower_conqueror: { yes: (s) => ({ ...s, tower: { ...s.tower, highest: 100 } }), no: (s) => ({ ...s, tower: { ...s.tower, highest: 99 } }) },
  lord_of_infinity: {
    yes: (s) => ({ ...s, titles: { ...s.titles, earned: [...FIRST_49_TITLE_IDS] } }),
    no: (s) => ({ ...s, titles: { ...s.titles, earned: FIRST_49_TITLE_IDS.slice(0, 48) } }),
  },
};

describe('Unvan verisi', () => {
  it('50 benzersiz unvan; her biri ad, açıklama, nadirlik, kategori, sembol ve şart içerir', () => {
    expect(TITLES.length).toBe(50);
    expect(new Set(TITLES.map((t) => t.id)).size).toBe(50);
    for (const t of TITLES) {
      expect(t.name && t.description && t.rarity && t.category && t.icon && t.condition.kind).toBeTruthy();
      expect(t.condition.target).toBeGreaterThan(0);
    }
    expect(Object.keys(CASES).sort()).toEqual(TITLES.map((t) => t.id).sort());
  });
});

describe('50 unvanın şartları', () => {
  for (const t of TITLES) {
    it(`${t.name}: şart sağlanınca açılır, hemen altında açılmaz`, () => {
      const c = CASES[t.id];
      expect(earnedAfter(c.yes(base()))).toContain(t.id);
      expect(earnedAfter(c.no(base()))).not.toContain(t.id);
    });
  }
});

describe('Unvan kazanma kuralları', () => {
  it('kazanılan unvan tekrar verilmez; yeni unvan görülmemişlere eklenir', () => {
    const a = syncTitles({ ...base(), completedStages: [ROUTE[0].id] });
    expect(a.newly).toEqual(['first_step']);
    expect(a.save.titles.unseen).toEqual(['first_step']);
    const b = syncTitles(a.save);
    expect(b.newly).toEqual([]);
    expect(b.save.titles.earned.filter((x) => x === 'first_step').length).toBe(1);
    expect(markTitlesSeen(b.save).titles.unseen).toEqual([]);
  });

  it('aynı güncellemede birden fazla unvan açılır', () => {
    const s = { ...base(), completedStages: ROUTE.slice(0, 50).map((x) => x.id), stats: { ...base().stats, highestCombo: 8 } };
    const r = syncTitles(s);
    expect(r.newly).toEqual(expect.arrayContaining(['first_step', 'adventurer', 'wanderer', 'combo_master', 'combo_legend']));
  });

  it('Sonsuzluğun Efendisi aynı geçişte açılan unvanları da sayar', () => {
    const s = { ...base(), titles: { ...base().titles, earned: FIRST_49_TITLE_IDS.filter((id) => id !== 'first_step') }, completedStages: [ROUTE[0].id] };
    const r = syncTitles(s);
    expect(r.newly).toEqual(['first_step', 'lord_of_infinity']);
  });

  it('savaş raporu: sayaçlar bir kez artar; yenilgide zafer şartları sayılmaz ama kare/zayıflık/yoldaş sayılır', () => {
    let s = applyBattleReport(base(), report({ victory: false, squares: 3, weakHits: 5, companionTriggers: 2, hpRatio: 0.01, isBoss: true, ultiKill: true, damageTaken: 0, countWin: true }));
    expect(s.titles.stats).toMatchObject({ squares: 3, weakHits: 5, companionTriggers: 2, comebackWins: 0, flawlessWins: 0, ultiBossKills: 0 });
    expect(s.stats.enemiesDefeated).toBe(0);
    s = applyBattleReport(s, report({ squares: 1, countWin: true }));
    expect(s.titles.stats.squares).toBe(4);
    expect(s.stats.enemiesDefeated).toBe(1);
    // Dünya Haritası zaferi kendi akışında sayılır (countWin false)
    expect(applyBattleReport(s, report({ countWin: false })).stats.enemiesDefeated).toBe(1);
  });

  it('Kusursuz Zafer: yalnızca elit/boss ve önerilen seviyeye uygun savaş', () => {
    const f = (p: Partial<BattleTitleReport>) => applyBattleReport(base(), report({ damageTaken: 0, ...p })).titles.stats.flawlessWins;
    expect(f({ isElite: true, recommendedLevel: 18, heroLevel: 20 })).toBe(1);
    expect(f({ isElite: true, recommendedLevel: 16, heroLevel: 20 })).toBe(0);
    expect(f({ recommendedLevel: 20, heroLevel: 20 })).toBe(0);
  });
});

describe('Aktif unvan', () => {
  it('kilitli unvan seçilemez; seçim ve kaldırma; yeniden yüklemede korunur', () => {
    const s0 = syncTitles({ ...base(), completedStages: [ROUTE[0].id] }).save;
    expect(setActiveTitle(s0, 'war_lord').ok).toBe(false);
    const a = setActiveTitle(s0, 'first_step');
    expect(a.ok).toBe(true);
    const re = parseSaveString(JSON.stringify(a.save))!;
    expect(re.titles.active).toBe('first_step');
    // kahraman ve kostüm değişimi aktif unvanı etkilemez (hesap geneli)
    const changed = { ...re, activeHeroClass: 'mage' as HeroClassId, heroes: { ...re.heroes, warrior: { ...re.heroes.warrior, costumeId: 'warrior_koz_muhafizi' } } };
    expect(parseSaveString(JSON.stringify(changed))!.titles.active).toBe('first_step');
    expect(setActiveTitle(a.save, null).save.titles.active).toBeNull();
  });

  it('aktif unvan savaş özelliklerini değiştirmez', () => {
    const s = syncTitles({ ...base(), completedStages: [ROUTE[0].id] }).save;
    const h = s.heroes.warrior;
    const b1 = computeHeroBuild(h, accountBonusOf(s));
    const b2 = computeHeroBuild(h, accountBonusOf(setActiveTitle(s, 'first_step').save));
    expect(b2.stats).toEqual(b1.stats);
  });
});

describe('Koleksiyon bonusları', () => {
  it('eşikler ve 50 unvanlık toplam', () => {
    expect(collectionBonus(4)).toEqual({ hpPct: 0, atkPct: 0, defPct: 0, manaPct: 0 });
    expect(collectionBonus(5)).toEqual({ hpPct: 1, atkPct: 0, defPct: 0, manaPct: 0 });
    expect(collectionBonus(35)).toEqual({ hpPct: 2, atkPct: 2, defPct: 2, manaPct: 1 });
    expect(collectionBonus(50)).toEqual({ hpPct: 4, atkPct: 4, defPct: 3, manaPct: 1 });
    expect(collectionBonus(70)).toEqual(collectionBonus(50));
    expect(TITLE_COLLECTION_BONUSES.map((t) => t.count)).toEqual([5, 10, 15, 20, 25, 30, 35, 40, 45, 50]);
  });

  it('bonus kahraman özelliklerine ve güç puanına yansır', () => {
    const s = base();
    const h = { ...s.heroes.warrior, level: 30 };
    const plain = computeHeroBuild(h);
    const boosted = computeHeroBuild(h, collectionBonus(50));
    expect(boosted.stats.health).toBe(Math.round(plain.stats.health * 1.04));
    expect(boosted.stats.attack).toBe(Math.round(plain.stats.attack * 1.04));
    expect(boosted.stats.defense).toBe(Math.round(plain.stats.defense * 1.03));
    expect(boosted.passives.manaFlowPct).toBe(plain.passives.manaFlowPct + 1);
    expect(boosted.powerRating).toBeGreaterThan(plain.powerRating);
  });
});

describe('Eski kayıt uyumu', () => {
  it('v17 kaydı yüklenir; kesin doğrulanabilen unvanlar açılır, tutulmamış sayaçlar tahmin edilmez', () => {
    const old = {
      ...base(),
      version: 17,
      completedStages: ROUTE.slice(0, 60).map((x) => x.id),
      bossVictories: ['forest_guardian', 'frost_queen'],
      stats: { ...base().stats, enemiesDefeated: 120, highestCombo: 6 },
    } as Record<string, unknown>;
    delete old.titles;
    const loaded = parseSaveString(JSON.stringify(old))!;
    expect(loaded.version).toBe(SAVE_VERSION);
    expect(loaded.titles.stats).toEqual({ squares: 0, weakHits: 0, companionTriggers: 0, comebackWins: 0, flawlessWins: 0, ultiBossKills: 0, frostBarrierWins: 0 });
    const earned = syncTitles(loaded).save.titles.earned;
    expect(earned).toEqual(expect.arrayContaining(['first_step', 'adventurer', 'wanderer', 'monster_hunter', 'combo_master', 'forest_guardian']));
    // Buz Kraliçesi yenilmiş ama bariyer kırma kaydı yok → Buz Kıran açılmaz
    expect(earned).not.toContain('ice_breaker');
    expect(earned).not.toContain('back_from_death');
  });

  it('bozuk unvan kaydı temizlenir; kazanılmamış aktif unvan düşer', () => {
    const bad = { ...base(), titles: { earned: ['first_step', 'yok', 5], active: 'war_lord', unseen: ['yok'], stats: { squares: -4, weakHits: 'x' } } };
    const s = parseSaveString(JSON.stringify(bad))!;
    expect(s.titles.earned).toEqual(['first_step']);
    expect(s.titles.active).toBeNull();
    expect(s.titles.unseen).toEqual([]);
    expect(s.titles.stats.squares).toBe(0);
  });

  it('ilerleme gösterimi (ör. En iyi kombo 4/5)', () => {
    const s = { ...base(), stats: { ...base().stats, highestCombo: 4 } };
    const p = titleProgress(s, TITLES.find((t) => t.id === 'combo_master')!);
    expect(p).toEqual({ current: 4, target: 5, done: false, unavailable: false });
  });
});
