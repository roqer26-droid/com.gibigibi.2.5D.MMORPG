import { describe, expect, it } from 'vitest';
import { HERO_CLASSES } from '../src/data/classes';
import { applyHeroUnlocks, heroConditionMet } from '../src/data/heroUnlocks';
import { IMAGE_HERO_CLASSES, IMAGE_HERO_SKILLS, IMAGE_HERO_TUNING as T } from '../src/data/imageHeroes';
import { CLASS_SKILLS, getSkillLoadout } from '../src/data/skills';
import { WORLD_REGIONS } from '../src/data/world';
import {
  bigfootStartShield,
  bigfootSkillShield,
  bigfootUltShield,
  bloodBond,
  clawStrike,
  delayEnemyAction,
  huntChargeOnSquares,
  nightEcho,
  vampireSlashHeal,
  vampireUltHeal,
  werewolfUltBonus,
} from '../src/game/heroKits';
import type { EnemyAction } from '../src/game/enemyIntent';
import { createInitialSaveState, parseSaveString } from '../src/utils/storage';

const ids = WORLD_REGIONS.flatMap((r) => r.stages.map((s) => s.id));
const forest = WORLD_REGIONS.find((r) => r.id === 'forest')!.stages.map((s) => s.id);

describe('image heroes data', () => {
  it('has the four heroes with the specified kit texts and values', () => {
    expect(['werewolf', 'vampire', 'bigfoot', 'night_screecher'].map((id) => HERO_CLASSES[id as 'werewolf'].name)).toEqual(['Kurt Adam', 'Vampir', 'Kocaayak', 'Gecenin Çığırtkanı']);
    expect(HERO_CLASSES.werewolf.passiveName).toBe('Av İçgüdüsü');
    expect(HERO_CLASSES.vampire.passiveName).toBe('Kan Bağı');
    expect(HERO_CLASSES.bigfoot.passiveName).toBe('Sağlam Duruş');
    expect(HERO_CLASSES.night_screecher.passiveName).toBe('Gece Yankısı');
    expect(IMAGE_HERO_SKILLS.werewolf[0].name).toBe('Pençe Darbesi');
    expect(IMAGE_HERO_SKILLS.vampire[0].name).toBe('Yakut Kesik');
    expect(IMAGE_HERO_SKILLS.bigfoot[0].name).toBe('Kaya Siperi');
    expect(IMAGE_HERO_SKILLS.night_screecher[0].name).toBe('Yankı Dalgası');
    expect(HERO_CLASSES.werewolf.ultimateSkill.name).toBe('Dolunay Hücumu');
    expect(HERO_CLASSES.vampire.ultimateSkill.name).toBe('Kızıl Düello');
    expect(HERO_CLASSES.bigfoot.ultimateSkill.name).toBe('Orman Sarsıntısı');
    expect(HERO_CLASSES.night_screecher.ultimateSkill.name).toBe('Hilal Çığlığı');
    expect(HERO_CLASSES.werewolf.passiveDesc).toContain('3 yük');
    expect(HERO_CLASSES.vampire.passiveDesc).toContain('%8');
    expect(HERO_CLASSES.vampire.passiveDesc).toContain('%4');
    expect(HERO_CLASSES.bigfoot.passiveDesc).toContain('%8');
    expect(IMAGE_HERO_SKILLS.werewolf[0].description).toContain('%140');
    expect(IMAGE_HERO_SKILLS.werewolf[0].description).toContain('%190');
    expect(HERO_CLASSES.werewolf.ultimateSkill.description).toContain('%220');
    expect(HERO_CLASSES.werewolf.ultimateSkill.description).toContain('%25');
    expect(IMAGE_HERO_SKILLS.vampire[0].description).toMatch(/%120.*%20.*%8/);
    expect(HERO_CLASSES.vampire.ultimateSkill.description).toMatch(/%240.*%30.*%15/);
    expect(IMAGE_HERO_SKILLS.bigfoot[0].description).toContain('%12');
    expect(HERO_CLASSES.bigfoot.ultimateSkill.description).toMatch(/%180.*%15/);
    expect(IMAGE_HERO_SKILLS.night_screecher[0].description).toMatch(/%100.*1 tur/);
    expect(HERO_CLASSES.night_screecher.ultimateSkill.description).toMatch(/%190.*1 tur/);
  });

  it('skills are wired into the class skill pool and available from level 5; powerMultiplier matches the tuning', () => {
    for (const id of ['werewolf', 'vampire', 'bigfoot', 'night_screecher'] as const) {
      expect(CLASS_SKILLS[id]).toEqual(IMAGE_HERO_SKILLS[id]);
      expect(getSkillLoadout(id, 4).some((s) => s.id === IMAGE_HERO_SKILLS[id][0].id)).toBe(false);
      expect(getSkillLoadout(id, 5).some((s) => s.id === IMAGE_HERO_SKILLS[id][0].id)).toBe(true);
      expect(HERO_CLASSES[id].skillTree.filter((n) => n.branch !== 'common').length).toBe(12); // + 8 ortak Ustalık pasifi
      expect(HERO_CLASSES[id].skillTree.length).toBe(20);
      expect(HERO_CLASSES[id].unlockCondition?.text).toBeTruthy();
      expect(HERO_CLASSES[id].unlockCost).toBeUndefined();
    }
    expect(IMAGE_HERO_SKILLS.werewolf[0].powerMultiplier).toBe(T.werewolf.clawMult);
    expect(IMAGE_HERO_CLASSES.night_screecher.ultimateSkill.powerMultiplier).toBe(T.night_screecher.ultMult);
  });

  it('new heroes appear in fresh and old saves without touching existing selection or equipment', () => {
    const base = createInitialSaveState();
    expect(Object.keys(base.heroes)).toHaveLength(22);
    const old = { ...base, heroes: Object.fromEntries(Object.entries(base.heroes).filter(([k]) => k !== 'bigfoot' && k !== 'night_screecher')), activeHeroClass: 'mage' };
    const loaded = parseSaveString(JSON.stringify(old))!;
    expect(loaded.activeHeroClass).toBe('mage');
    expect(loaded.heroes.bigfoot.level).toBe(1);
    expect(loaded.heroes.mage.equipped).toEqual(base.heroes.mage.equipped);
  });
});

describe('unlock conditions (old saves included)', () => {
  const base = () => createInitialSaveState();
  const without = (s: ReturnType<typeof base>) => ({ ...s, heroUnlocks: s.heroUnlocks.filter((h) => !['werewolf', 'vampire', 'bigfoot', 'night_screecher'].includes(h)) });

  it('Kurt Adam: whole Büyülü Orman cleared; one stage short is not enough', () => {
    const s = without(base());
    expect(heroConditionMet({ ...s, completedStages: forest.slice(0, -1) }, 'werewolf')).toBe(false);
    expect(heroConditionMet({ ...s, completedStages: forest }, 'werewolf')).toBe(true);
  });
  it('Vampir: last boss of Karanlık Uçurum (abyss_8), not the earlier abyss boss', () => {
    const s = without(base());
    expect(heroConditionMet({ ...s, completedStages: ['abyss_5', 'abyss_7'] }, 'vampire')).toBe(false);
    expect(heroConditionMet({ ...s, completedStages: ['abyss_8'] }, 'vampire')).toBe(true);
  });
  it('Kocaayak: final battle of Köklerin Mahzeni (dungeon completion record)', () => {
    const s = without(base());
    expect(heroConditionMet(s, 'bigfoot')).toBe(false);
    expect(heroConditionMet({ ...s, dungeons: { ...s.dungeons, roots_vault: { ...s.dungeons.roots_vault, completions: 1 } } }, 'bigfoot')).toBe(true);
    expect(heroConditionMet({ ...s, completedStages: forest, bossVictories: ['forest_guardian'] }, 'bigfoot')).toBe(false); // hikâye zaferi sayılmaz
  });
  it('Gecenin Çığırtkanı: 100th stage in world order (or a later one in old saves)', () => {
    const s = without(base());
    expect(heroConditionMet({ ...s, completedStages: ids.slice(0, 99) }, 'night_screecher')).toBe(false);
    expect(heroConditionMet({ ...s, completedStages: ids.slice(0, 100) }, 'night_screecher')).toBe(true);
    expect(heroConditionMet({ ...s, completedStages: [ids[300]] }, 'night_screecher')).toBe(true);
  });
  it('applyHeroUnlocks unlocks only what is earned, once, and keeps the active hero', () => {
    const s = { ...without(base()), activeHeroClass: 'ranger' as const, completedStages: ids.slice(0, 100) };
    const r = applyHeroUnlocks(s);
    expect(r.newlyUnlocked.sort()).toEqual(['night_screecher', 'vampire', 'werewolf'].sort());
    expect(r.save.activeHeroClass).toBe('ranger');
    expect(r.save.heroUnlocks).not.toContain('bigfoot');
    expect(applyHeroUnlocks(r.save).newlyUnlocked).toEqual([]);
    expect(applyHeroUnlocks(r.save).save).toBe(r.save);
    // eski kayıttan yükleme
    const reloaded = applyHeroUnlocks(parseSaveString(JSON.stringify({ ...s, version: 10 }))!);
    expect(reloaded.save.heroUnlocks).toEqual(expect.arrayContaining(['werewolf', 'vampire', 'night_screecher']));
  });
});

describe('hero kits', () => {
  it('Av yükü: first square each turn only, capped at 3', () => {
    let r = huntChargeOnSquares(0, 1, false);
    expect(r).toMatchObject({ charges: 1, given: true, turnFlag: true });
    r = huntChargeOnSquares(r.charges, 2, r.turnFlag); // aynı turda ikinci kare
    expect(r).toMatchObject({ charges: 1, given: false });
    for (let turn = 0; turn < 6; turn++) r = huntChargeOnSquares(r.charges, 1, false);
    expect(r.charges).toBe(3);
    expect(huntChargeOnSquares(3, 1, false).given).toBe(false);
    expect(huntChargeOnSquares(2, 0, false)).toMatchObject({ charges: 2, given: false, turnFlag: false });
  });
  it('Pençe Darbesi 140% (190% and spends 1 charge when available); Dolunay Hücumu spends all, 25% attack per charge', () => {
    expect(clawStrike(0)).toEqual({ mult: 1.4, charges: 0, charged: false });
    expect(clawStrike(1)).toEqual({ mult: 1.9, charges: 0, charged: true });
    expect(clawStrike(3)).toEqual({ mult: 1.9, charges: 2, charged: true });
    expect(werewolfUltBonus(3, 200)).toEqual({ bonus: 150, charges: 0 });
    expect(werewolfUltBonus(0, 200).bonus).toBe(0);
  });
  it('Vampir heals: Kan Bağı 8% once per turn capped at 4% max HP; Yakut Kesik 20% cap 8%; Kızıl Düello 30% cap 15%', () => {
    expect(bloodBond(500, 1000, false)).toEqual({ heal: 40, used: true });
    expect(bloodBond(5000, 1000, false)).toEqual({ heal: 40, used: true }); // %4 üst sınır
    expect(bloodBond(500, 1000, true)).toEqual({ heal: 0, used: true });
    expect(vampireSlashHeal(300, 1000)).toBe(60);
    expect(vampireSlashHeal(2000, 1000)).toBe(80);
    expect(vampireUltHeal(300, 1000)).toBe(90);
    expect(vampireUltHeal(5000, 1000)).toBe(150);
  });
  it('Kocaayak shields: 8% start, 12% skill, 15% ultimate of max HP', () => {
    expect([bigfootStartShield(1000), bigfootSkillShield(1000), bigfootUltShield(1000)]).toEqual([80, 120, 150]);
  });
  it('Gece Yankısı: only the first 3-step chain of a swap move, +8 ulti', () => {
    expect(nightEcho(2, true, false).ulti).toBe(0);
    expect(nightEcho(3, false, false).ulti).toBe(0); // yetenek patlaması zincir sayılmaz
    expect(nightEcho(3, true, false)).toEqual({ ulti: 8, used: true });
    expect(nightEcho(4, true, true).ulti).toBe(0);
  });
  it('delay: at most 1 turn per enemy action across all skills; a new action renews it', () => {
    const delays = new WeakMap<EnemyAction, number>();
    const plan: EnemyAction = { kind: 'heavy', power: 1.25 };
    let r = delayEnemyAction(plan, delays, 2);
    expect(r).toEqual({ counter: 3, delayed: 1 });
    r = delayEnemyAction(plan, delays, r.counter); // ulti ya da yetenek: aynı eylem, ikinci gecikme yok
    expect(r).toEqual({ counter: 3, delayed: 0 });
    const next: EnemyAction = { kind: 'attack', power: 1 };
    expect(delayEnemyAction(next, delays, 2)).toEqual({ counter: 3, delayed: 1 });
  });
});
