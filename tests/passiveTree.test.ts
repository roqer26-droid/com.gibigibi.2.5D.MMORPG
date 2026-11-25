import { describe, expect, it } from 'vitest';
import { HERO_CLASS_LIST, HERO_CLASSES } from '../src/data/classes';
import {
  COMMON_PASSIVES,
  PASSIVE_MAX_RANK,
  SKILL_POINTS_PER_LEVEL,
  legacyRankToNew,
  migrateHeroPassives,
  nodeProgressText,
  skillPointBudget,
} from '../src/data/passiveTree';
import { boostedShield, chainDamageMult, gainMult, incomingDamageMult, squareDamageMult } from '../src/game/passiveCombat';
import { squareCellKeys } from '../src/game/match3';
import { upgradeSkillNode } from '../src/state/saveActions';
import { computeHeroBuild } from '../src/utils/rpgLogic';
import { SAVE_VERSION, createInitialSaveState, parseSaveString } from '../src/utils/storage';
import type { HeroProgress, StatBlock } from '../src/types/game';

const PASSIVE_FIELD: Record<string, string> = {
  fire_dmg: 'fireDmgPct', frost_mana: 'frostManaPct', nature_heal: 'natureHealPct', lightning_crit: 'lightningCritPct',
  arcane_ulti: 'arcaneUltiPct', shield_start: 'startShield', combo_boost: 'comboBoostPct', lifesteal: 'lifestealPct',
  boss_dmg: 'bossDmgPct', skill_power: 'skillPowerPct', golden_luck: 'goldenLuckPct', start_mana: 'startManaPct',
  start_ulti: 'startUltiPct', thorns: 'thornsPct', weakness_exploit: 'weaknessBonusPct', summon_power: 'summonPowerPct',
  bleed_power: 'bleedPowerPct', dodge_counter: 'dodgeCounterPct', storm_overload: 'stormOverloadPct', dragon_scale: 'dragonScalePct',
  square_dmg: 'squareDmgPct', chain_dmg: 'chainDmgPct', mana_flow: 'manaFlowPct', ulti_focus: 'ultiFocusPct',
  last_stand: 'lastStandPct', shield_boost: 'shieldBoostPct', heavy_guard: 'heavyGuardPct', elite_dmg: 'eliteDmgPct',
};
const bare = (classId: string, ranks: Record<string, number> = {}): HeroProgress =>
  ({ classId, level: 1, xp: 0, skillPoints: 0, skillRanks: ranks, equipped: {} }) as HeroProgress;
const diff = (classId: string, ranks: Record<string, number>) => {
  const a = computeHeroBuild(bare(classId));
  const b = computeHeroBuild(bare(classId, ranks));
  return { a, b };
};

describe('pasifler 10 seviye: eski tam seviye = yeni 10/10 (22 kahraman, 264 eski pasif)', () => {
  it('her kahraman ağacı: 12 kendi pasifi (ölçekli) + 8 ortak Ustalık pasifi, hepsi en fazla 10 seviye', () => {
    expect(HERO_CLASS_LIST).toHaveLength(22);
    for (const c of HERO_CLASS_LIST) {
      expect(c.skillTree.filter((n) => n.legacy)).toHaveLength(12);
      expect(c.skillTree.filter((n) => n.branch === 'common').map((n) => n.id)).toEqual(COMMON_PASSIVES.map((n) => n.id));
      expect(c.skillTree.every((n) => n.maxRank === PASSIVE_MAX_RANK)).toBe(true);
    }
  });

  it('eski pasifin tam seviye toplamı (değer × eski en yüksek seviye) yeni 10/10 ile birebir aynı', () => {
    let checked = 0;
    for (const c of HERO_CLASS_LIST) {
      for (const n of c.skillTree.filter((x) => x.legacy)) {
        const L = n.legacy!;
        const { a, b } = diff(c.id, { [n.id]: 10 });
        for (const [k, v] of Object.entries(L.statPerRank ?? {})) {
          const oldTotal = (v ?? 0) * L.maxRank;
          const got = b.stats[k as keyof StatBlock] - a.stats[k as keyof StatBlock];
          expect(Number(got.toFixed(4)), `${n.id} ${k}`).toBe(Number(oldTotal.toFixed(4)));
        }
        if (n.passiveEffect) {
          const f = PASSIVE_FIELD[n.passiveEffect.type];
          const oldTotal = L.valuePerRank! * L.maxRank;
          const got = (b.passives as unknown as Record<string, number>)[f] - (a.passives as unknown as Record<string, number>)[f];
          expect(got, `${n.id} ${n.passiveEffect.type}`).toBe(oldTotal); // tam eşitlik (ara yuvarlama yok)
        }
        checked++;
      }
    }
    expect(checked).toBe(264);
  });

  it('örnekler: Savaşçı Alev Kılıcı eski 3×%15 = %45 → 10/10 %45, seviye başı %4,5; Zırh Ustalığı 3×75 can = 225', () => {
    const fire = HERO_CLASSES.warrior.skillTree.find((n) => n.id === 'war_off_2')!;
    expect(fire.legacy).toMatchObject({ maxRank: 3, valuePerRank: 15 });
    expect(fire.passiveEffect).toMatchObject({ valueAtMax: 45, valuePerRank: 4.5 });
    expect(nodeProgressText(fire, 3)).toMatchObject({ level: '3/10', current: 'Şu an +%13,5 ateş taşı hasarı', next: 'Sonraki +%18 ateş taşı hasarı' });
    expect(nodeProgressText(fire, 10).next).toBeNull();
    const armor = HERO_CLASSES.warrior.skillTree.find((n) => n.id === 'war_def_1')!;
    expect(armor.statAtMax).toEqual({ health: 225, defense: 18 });
    // 2'lik eski pasif: Ejderha Katili 2×%15 boss hasarı = %30 → 10/10 %30
    const slayer = HERO_CLASSES.warrior.skillTree.find((n) => n.id === 'war_mag_3')!;
    expect(slayer.passiveEffect).toMatchObject({ valueAtMax: 30, valuePerRank: 3 });
  });

  it('ara değerler yuvarlanmaz (yalnızca nihai istatistik): 3/10 ateş = %13,5, 1/10 boss = %3', () => {
    const { a, b } = diff('warrior', { war_off_2: 3, war_mag_3: 1 });
    expect(b.passives.fireDmgPct - a.passives.fireDmgPct).toBe(13.5);
    expect(b.passives.bossDmgPct - a.passives.bossDmgPct).toBe(3);
    // 3/10 Zırh Ustalığı: 67,5 can → nihai yapıda tek kez yuvarlanır (68), savunma 5,4 → 5
    const { a: a2, b: b2 } = diff('warrior', { war_def_1: 3 });
    expect(b2.stats.health - a2.stats.health).toBe(Math.round(a2.stats.health + 67.5) - a2.stats.health);
    expect(Number.isInteger(b2.stats.health)).toBe(true);
  });

  it('ortak Ustalık pasifleri her kahramanda aynı değerlerde (10/10 toplamları)', () => {
    const expected = { cm_square: 12, cm_chain: 10, cm_mana: 10, cm_ulti: 10, cm_last_stand: 12, cm_barrier: 12, cm_heavy_guard: 10, cm_elite: 8 };
    for (const c of HERO_CLASS_LIST) {
      for (const [id, v] of Object.entries(expected)) {
        const n = c.skillTree.find((x) => x.id === id)!;
        expect(n.passiveEffect!.valueAtMax, `${c.id} ${id}`).toBe(v);
        const { a, b } = diff(c.id, { [id]: 10 });
        const f = PASSIVE_FIELD[n.passiveEffect!.type];
        expect((b.passives as unknown as Record<string, number>)[f] - (a.passives as unknown as Record<string, number>)[f]).toBe(v);
      }
    }
    expect(nodeProgressText(COMMON_PASSIVES[0], 3)).toMatchObject({ current: 'Şu an +%3,6 kare hasarı', next: 'Sonraki +%4,8 kare hasarı' });
  });
});

describe('puan kuralları', () => {
  it('her yükseltme 1 puan; 10/10\'dan sonra puan harcanmaz; iki kahramanın puanları bağımsız', () => {
    let save = createInitialSaveState();
    save = { ...save, activeHeroClass: 'warrior', heroes: { ...save.heroes, warrior: { ...save.heroes.warrior, skillPoints: 12 }, mage: { ...save.heroes.mage, skillPoints: 5, skillRanks: { cm_chain: 2 } } } };
    for (let i = 0; i < 12; i++) save = upgradeSkillNode(save, 'cm_square').save;
    expect(save.heroes.warrior.skillRanks.cm_square).toBe(10);
    expect(save.heroes.warrior.skillPoints).toBe(2); // 11. ve 12. deneme puan harcamadı
    expect(save.heroes.mage.skillRanks).toEqual({ cm_chain: 2 });
    expect(save.heroes.mage.skillPoints).toBe(5);
    save = { ...save, activeHeroClass: 'mage' };
    save = upgradeSkillNode(save, 'cm_square').save;
    expect(save.heroes.mage.skillRanks.cm_square).toBe(1);
    expect(save.heroes.warrior.skillRanks.cm_square).toBe(10);
  });

  it('puan kazanımı: seviye başına 3 (1. seviyede 1); 50. seviyede 148 puan — tüm pasifleri doldurmaya yetmez (200)', () => {
    expect(SKILL_POINTS_PER_LEVEL).toBe(3);
    expect(skillPointBudget(1)).toBe(1);
    expect(skillPointBudget(50)).toBe(148);
    expect(HERO_CLASSES.warrior.skillTree.length * PASSIVE_MAX_RANK).toBe(200);
  });
});

describe('eski kayıt geçişi (v12 → v13, bir kez)', () => {
  it('3\'lük: 1→4, 2→7, 3→10; 2\'lik: 1→5, 2→10', () => {
    expect([0, 1, 2, 3].map((r) => legacyRankToNew(r, 3))).toEqual([0, 4, 7, 10]);
    expect([0, 1, 2].map((r) => legacyRankToNew(r, 2))).toEqual([0, 5, 10]);
  });

  it('kayıttan yüklemede yatırımlar taşınır, harcanmamış puan korunur, eksik bütçe eklenir; ikinci yüklemede tekrar taşınmaz', () => {
    const base = createInitialSaveState();
    const raw = JSON.parse(JSON.stringify(base));
    raw.version = 12;
    raw.heroes.warrior = { ...raw.heroes.warrior, level: 10, skillPoints: 2, skillRanks: { war_off_1: 1, war_off_2: 2, war_off_3: 3, war_mag_3: 1, war_mag_1: 0 } };
    raw.heroes.mage = { ...raw.heroes.mage, level: 20, skillPoints: 5, skillRanks: {} };
    const loaded = parseSaveString(JSON.stringify(raw))!;
    expect(loaded.version).toBe(SAVE_VERSION);
    expect(loaded.heroes.warrior.skillRanks).toEqual({ war_off_1: 4, war_off_2: 7, war_off_3: 10, war_mag_3: 5 });
    // 26 harcanmış + 2 harcanmamış = 28 = 10. seviye bütçesi → ek puan yok, harcanmamış 2 korunur
    expect(loaded.heroes.warrior.skillPoints).toBe(2);
    // 20. seviye, hiç harcamamış: 5 korunur + bütçeye (58) tamamlama
    expect(loaded.heroes.mage.skillPoints).toBe(58);
    // eski tam seviyedeki pasifin bonusu aynı (Kana Susamışlık 3/3 → 10/10)
    expect(computeHeroBuild(loaded.heroes.warrior).passives.lifestealPct).toBe(12);
    // tekrar yükleme (artık v13): değişmez
    const again = parseSaveString(JSON.stringify(loaded))!;
    expect(again.heroes.warrior.skillRanks).toEqual(loaded.heroes.warrior.skillRanks);
    expect(again.heroes.mage.skillPoints).toBe(58);
  });

  it('fazla yatırım geri alınmaz, harcanmamış puandan kesilmez; yeni pasifler 0/10', () => {
    const tree = HERO_CLASSES.warrior.skillTree;
    const all = Object.fromEntries(tree.filter((n) => n.legacy).map((n) => [n.id, n.legacy!.maxRank]));
    const m = migrateHeroPassives(tree, { level: 5, skillPoints: 3, skillRanks: all });
    expect(Object.values(m.skillRanks).every((r) => r === 10)).toBe(true);
    expect(m.skillPoints).toBe(3);
    expect(m.topUp).toBe(0);
    expect(m.skillRanks.cm_square).toBeUndefined();
  });
});

describe('yeni pasiflerin savaş çarpanları', () => {
  it('Kare Ustalığı: örtüşen kareler ve çizgi kesişimi tek kez; tür başına karedeki taş payı', () => {
    const keys = squareCellKeys([{ row: 0, col: 0, type: 'fire' }, { row: 0, col: 1, type: 'fire' }]);
    expect(keys.size).toBe(6); // iki örtüşen kare 8 değil 6 taş
    expect(squareDamageMult(12, 6, 6)).toBeCloseTo(1.12);
    expect(squareDamageMult(12, 4, 8)).toBeCloseTo(1.06); // 8 ateş taşından 4'ü karede
    expect(squareDamageMult(12, 0, 5)).toBe(1);
    expect(squareDamageMult(12, 9, 6)).toBeCloseTo(1.12); // en fazla bir kez
  });
  it('Zincir Gücü yalnızca 2. ve sonraki adımlar; Mana/Ulti çarpanı; Sağlam Bariyer; Ağır Darbe ve Son Direniş', () => {
    expect(chainDamageMult(10, 1)).toBe(1);
    expect(chainDamageMult(10, 2)).toBeCloseTo(1.1);
    expect(gainMult(10)).toBeCloseTo(1.1);
    expect(boostedShield(100, 12)).toBe(112);
    expect(incomingDamageMult({ heavy: true, hpRatio: 0.9, heavyGuardPct: 10, lastStandPct: 12 })).toBeCloseTo(0.9);
    expect(incomingDamageMult({ heavy: false, hpRatio: 0.9, heavyGuardPct: 10, lastStandPct: 12 })).toBe(1);
    expect(incomingDamageMult({ heavy: false, hpRatio: 0.3, heavyGuardPct: 10, lastStandPct: 12 })).toBeCloseTo(0.88);
    expect(incomingDamageMult({ heavy: true, hpRatio: 0.3, heavyGuardPct: 10, lastStandPct: 12 })).toBeCloseTo(0.9 * 0.88);
  });
});
