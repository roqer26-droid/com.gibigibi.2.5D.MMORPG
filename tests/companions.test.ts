import { describe, expect, it } from 'vitest';
import {
  COMPANIONS,
  applyEliteParts,
  bossRequirementMet,
  companionStatus,
  creditChestParts,
  reconcileCompanionParts,
  setActiveCompanion,
  unlockCompanion,
} from '../src/data/companions';
import { claimMasteryChest } from '../src/data/mastery';
import { WORLD_REGIONS } from '../src/data/world';
import { emberTrigger, foxArm, foxDisarm, foxResolve, mothTrigger, owlTrigger, sproutTrigger, tortoiseTrigger } from '../src/game/companionEffects';
import type { CompanionId, GameSaveState } from '../src/types/game';
import { createInitialSaveState, parseSaveString } from '../src/utils/storage';

const fresh = (): GameSaveState => createInitialSaveState();
const stageOf = (id: string) => WORLD_REGIONS.flatMap((r) => r.stages).find((s) => s.id === id)!;
const elite = (region: string) => WORLD_REGIONS.find((r) => r.id === region)!.stages.find((s) => s.type === 'elite')!;
const withParts = (s: GameSaveState, id: CompanionId, n: number): GameSaveState => ({ ...s, companions: { ...s.companions, parts: { ...s.companions.parts, [id]: n } } });

describe('companion data', () => {
  it('has the six companions with the specified costs, regions and boss modes (first three unchanged)', () => {
    expect(COMPANIONS.map((c) => [c.id, c.partsNeeded, c.regionId, c.boss.mode, c.boss.arenaLabel])).toEqual([
      ['root_sprout', 24, 'forest', 'dungeon', 'Köklerin Mahzeni'],
      ['ice_fox', 32, 'mountains', 'hunt', 'Donmuş Taht'],
      ['ember_whelp', 40, 'volcano', 'hunt', 'Kül Arenası'],
      ['storm_owl', 48, 'sky', 'story', 'Gök Kalesi'],
      ['obsidian_tortoise', 56, 'abyss', 'story', 'Karanlık Uçurum'],
      ['moon_moth', 64, 'moonlit', 'story', 'Ay Işığı Vadisi'],
    ]);
    for (const c of COMPANIONS.slice(0, 3)) expect([c.eliteParts, c.chestParts[1], c.chestParts[2]]).toEqual([2, 4, 6]);
    for (const c of COMPANIONS.slice(3)) expect([c.eliteParts, c.chestParts[1], c.chestParts[2]]).toEqual([3, 6, 9]);
    expect(COMPANIONS.slice(3).map((c) => c.partName)).toEqual(['Fırtına Tüyü', 'Obsidyen Parçası', 'Ay Tozu']);
  });

  it('story boss requirements point to real boss stages (stage id, boss id, name) in the companion region', () => {
    const expected: Record<string, [string, string, string]> = {
      storm_owl: ['sky_8', 'sky_tyrant', 'Gök Tiranı Zephyros'],
      obsidian_tortoise: ['abyss_5', 'abyssal_king', 'Uçurum Kralı Malakor'],
      moon_moth: ['moonlit_8', 'moonlight_matron', 'Ay Matronu Selene'],
    };
    for (const c of COMPANIONS.slice(3)) {
      const b = c.boss;
      if (b.mode !== 'story') throw new Error(c.id);
      const st = stageOf(b.stageId);
      expect([b.stageId, b.bossId, b.bossName]).toEqual(expected[c.id]);
      expect(st.type).toBe('boss');
      expect(st.regionId).toBe(c.regionId);
      expect(st.enemy.bossId).toBe(b.bossId);
      expect(st.enemy.name).toBe(b.bossName);
      expect(WORLD_REGIONS.find((r) => r.id === c.regionId)!.name).toBe(c.regionName);
      // bölgede parça veren elit savaş var
      expect(WORLD_REGIONS.find((r) => r.id === c.regionId)!.stages.some((s) => s.type === 'elite')).toBe(true);
    }
  });
});

describe('earning parts', () => {
  it('every elite victory of the region gives 2 parts, replays included; other types/regions give none', () => {
    let s = fresh();
    const e = elite('forest');
    s = applyEliteParts(s, e, 't1').save;
    s = applyEliteParts(s, e, 't2').save; // tekrar oynanan elit
    expect(s.companions.parts.root_sprout).toBe(4);
    expect(applyEliteParts(fresh(), elite('mountains'), 'x').save.companions.parts).toMatchObject({ ice_fox: 2, root_sprout: 0 });
    expect(applyEliteParts(fresh(), elite('volcano'), 'x').save.companions.parts.ember_whelp).toBe(2);
    const normal = WORLD_REGIONS[0].stages.find((st) => st.type === 'normal')!;
    expect(applyEliteParts(fresh(), normal, 'n').gain).toBeNull();
    expect(applyEliteParts(fresh(), elite('ruins'), 'r').gain).toBeNull();
  });

  it('processing the same battle result twice gives parts only once', () => {
    const e = elite('forest');
    const once = applyEliteParts(fresh(), e, 'same');
    expect(once.gain?.parts).toBe(2);
    const twice = applyEliteParts(once.save, e, 'same');
    expect(twice.gain).toBeNull();
    expect(twice.save.companions.parts.root_sprout).toBe(2);
  });

  it('2nd and 3rd mastery chests give 4 and 6 extra parts, each chest once, in the same update', () => {
    const region = WORLD_REGIONS.find((r) => r.id === 'forest')!;
    const full = { ...fresh(), completedStages: region.stages.map((s) => s.id), mastery: { objectives: Object.fromEntries(region.stages.map((s) => [s.id, { o1: true, o2: true }])), chests: [] } } as GameSaveState;
    const c0 = claimMasteryChest(full, 'forest', 0);
    expect(c0.save.companions.parts.root_sprout).toBe(0);
    const c1 = claimMasteryChest(c0.save, 'forest', 1);
    expect(c1.save.companions.parts.root_sprout).toBe(4);
    expect(c1.save.mastery.chests).toContain('forest:1');
    expect(c1.toast).toContain('+4 Kök Parçası');
    const c2 = claimMasteryChest(c1.save, 'forest', 2);
    expect(c2.save.companions.parts.root_sprout).toBe(10);
    // aynı sandık ikinci kez alınamaz, parça da tekrar verilmez
    expect(claimMasteryChest(c2.save, 'forest', 2).save).toBe(c2.save);
    expect(creditChestParts(c2.save, 'forest', 2).gain).toBeNull();
  });

  it('old saves: chests already claimed credit their new parts exactly once on load', () => {
    const base = fresh();
    const raw = { ...base, version: 9, companions: undefined, mastery: { objectives: {}, chests: ['forest:0', 'forest:1', 'mountains:2', 'volcano:1', 'volcano:2'] } };
    const loaded = parseSaveString(JSON.stringify(raw))!;
    expect(loaded.companions.parts).toEqual({ root_sprout: 4, ice_fox: 6, ember_whelp: 10, storm_owl: 0, obsidian_tortoise: 0, moon_moth: 0 });
    // yeniden kaydedip yüklemek payı ikinci kez vermez
    const again = parseSaveString(JSON.stringify(loaded))!;
    expect(again.companions.parts).toEqual({ root_sprout: 4, ice_fox: 6, ember_whelp: 10, storm_owl: 0, obsidian_tortoise: 0, moon_moth: 0 });
    expect(reconcileCompanionParts(again)).toEqual(again);
  });
});

describe('unlock rules: parts and the right-mode boss win together', () => {
  const dungeonWon = (s: GameSaveState): GameSaveState => ({ ...s, dungeons: { ...s.dungeons, roots_vault: { ...s.dungeons.roots_vault, completions: 1 } } });
  const huntWon = (s: GameSaveState, id: 'frozen_throne' | 'ash_arena'): GameSaveState => ({ ...s, huntRecords: { ...s.huntRecords, [id]: { bestTurns: 9, wins: 1, firstRewardClaimed: true } } });

  it('parts without the boss, and the boss without parts, do not unlock', () => {
    const partsOnly = withParts(fresh(), 'root_sprout', 24);
    expect(companionStatus(partsOnly, 'root_sprout')).toMatchObject({ partsOk: true, bossOk: false, canUnlock: false });
    expect(unlockCompanion(partsOnly, 'root_sprout').ok).toBe(false);
    const bossOnly = dungeonWon(withParts(fresh(), 'root_sprout', 23));
    expect(companionStatus(bossOnly, 'root_sprout')).toMatchObject({ partsOk: false, bossOk: true, canUnlock: false });
    const r = unlockCompanion(bossOnly, 'root_sprout');
    expect(r.ok).toBe(false);
    expect(r.save).toBe(bossOnly);
  });

  it('story / wrong-mode victories do not satisfy the dungeon or hunt condition', () => {
    const story = { ...fresh(), bossVictories: ['forest_guardian', 'frost_queen', 'infernal_dragon'] as GameSaveState['bossVictories'], completedStages: ['forest_5', 'mountains_5', 'volcano_5'] };
    for (const c of COMPANIONS) expect(bossRequirementMet(story, c)).toBe(false);
    const ash = huntWon(fresh(), 'ash_arena');
    expect(bossRequirementMet(ash, COMPANIONS[1])).toBe(false); // Kül Arenası, Buz Tilkisi için sayılmaz
    expect(bossRequirementMet(ash, COMPANIONS[2])).toBe(true);
    expect(bossRequirementMet(huntWon(fresh(), 'frozen_throne'), COMPANIONS[1])).toBe(true);
    expect(bossRequirementMet(dungeonWon(fresh()), COMPANIONS[0])).toBe(true);
  });

  it('both satisfied: unlock deducts exactly the parts and opens permanently', () => {
    const ready = huntWon(withParts(fresh(), 'ember_whelp', 43), 'ash_arena');
    expect(companionStatus(ready, 'ember_whelp').canUnlock).toBe(true);
    const r = unlockCompanion(ready, 'ember_whelp');
    expect(r.ok).toBe(true);
    expect(r.save.companions.parts.ember_whelp).toBe(3);
    expect(r.save.companions.unlocked).toEqual(['ember_whelp']);
    expect(unlockCompanion(r.save, 'ember_whelp').ok).toBe(false); // ikinci kez parça düşmez
    const loaded = parseSaveString(JSON.stringify(r.save))!;
    expect(loaded.companions.unlocked).toEqual(['ember_whelp']);
  });

  it('one active companion per hero; only unlocked ones can be selected', () => {
    let s = huntWon(withParts(fresh(), 'ice_fox', 32), 'frozen_throne');
    expect(setActiveCompanion(s, 'warrior', 'ice_fox').ok).toBe(false);
    s = unlockCompanion(s, 'ice_fox').save;
    s = setActiveCompanion(s, 'warrior', 'ice_fox').save;
    s = setActiveCompanion(s, 'mage', 'ice_fox').save;
    expect(s.companions.active).toEqual({ warrior: 'ice_fox', mage: 'ice_fox' });
    s = setActiveCompanion(s, 'warrior', null).save;
    expect(s.companions.active).toEqual({ mage: 'ice_fox' });
  });
});

describe('battle effects (once per battle)', () => {
  it('Kök Filizi: threshold checked first, only below 40%, only once', () => {
    expect(sproutTrigger('ready', 400, 1000, 3)).toEqual({ state: 'ready', heal: 0 }); // tam %40: eşiğin altında değil
    expect(sproutTrigger('ready', 700, 1000, 3).heal).toBe(0);
    expect(sproutTrigger('ready', 399, 1000, 0).heal).toBe(0); // nature eşleşmesi yok
    const hit = sproutTrigger('ready', 399, 1000, 3);
    expect(hit).toEqual({ state: 'used', heal: 100 });
    expect(sproutTrigger('used', 100, 1000, 3).heal).toBe(0);
  });

  it('Buz Tilkisi: arms only while a heavy attack is prepared, absorbs 35% once, delays/dodges do not spend it', () => {
    expect(foxArm('ready', 'attack', 3)).toBe('ready');
    expect(foxArm('ready', 'heavy', 0)).toBe('ready');
    expect(foxArm('ready', 'heavy', 3)).toBe('armed');
    expect(foxResolve('ready', 'heavy', 1000)).toEqual({ state: 'ready', dmg: 1000, absorbed: 0 });
    expect(foxResolve('armed', 'heavy', 1000)).toEqual({ state: 'used', dmg: 650, absorbed: 350 });
    expect(foxResolve('used', 'heavy', 1000).absorbed).toBe(0);
    expect(foxResolve('armed', 'attack', 1000).state).toBe('ready');
    expect(foxDisarm('armed')).toBe('ready');
    expect(foxDisarm('used')).toBe('used');
  });

  it('Köz Ejderciği: first 2×2 square only; 2 turns of 15% attack burn', () => {
    expect(emberTrigger('ready', 0, 200).burn).toBeNull();
    const r = emberTrigger('ready', 1, 200);
    expect(r).toEqual({ state: 'used', burn: { turns: 2, perTurn: 30 } });
    expect(emberTrigger('used', 2, 200).burn).toBeNull();
  });
});

describe('new companions (v1.92.0)', () => {
  const won = (s: GameSaveState, ...ids: string[]): GameSaveState => ({ ...s, completedStages: [...s.completedStages, ...ids] });

  it('elite wins in sky / abyss / moonlit give +3 of the region part; other types give none', () => {
    expect(applyEliteParts(fresh(), elite('sky'), 'a').gain).toEqual({ companionId: 'storm_owl', parts: 3, partName: 'Fırtına Tüyü' });
    expect(applyEliteParts(fresh(), elite('abyss'), 'b').save.companions.parts.obsidian_tortoise).toBe(3);
    expect(applyEliteParts(fresh(), elite('moonlit'), 'c').save.companions.parts.moon_moth).toBe(3);
    expect(applyEliteParts(fresh(), stageOf('sky_8'), 'd').gain).toBeNull();
    const twice = applyEliteParts(applyEliteParts(fresh(), elite('sky'), 'e').save, elite('sky'), 'e');
    expect(twice.gain).toBeNull();
  });

  it('2nd and 3rd mastery chests give +6 / +9 once each; old saves with claimed chests are credited once on load', () => {
    const c1 = creditChestParts(fresh(), 'moonlit', 1);
    expect(c1.gain?.parts).toBe(6);
    const c2 = creditChestParts(c1.save, 'moonlit', 2);
    expect(c2.save.companions.parts.moon_moth).toBe(15);
    expect(creditChestParts(c2.save, 'moonlit', 2).gain).toBeNull();
    const base = fresh();
    const raw = { ...base, companions: { ...base.companions, parts: { root_sprout: 7, ice_fox: 1, ember_whelp: 0 }, unlocked: ['root_sprout'], active: { warrior: 'root_sprout' } }, mastery: { objectives: {}, chests: ['sky:1', 'sky:2', 'abyss:1'] } };
    const loaded = parseSaveString(JSON.stringify(raw))!;
    expect(loaded.companions.parts).toEqual({ root_sprout: 7, ice_fox: 1, ember_whelp: 0, storm_owl: 15, obsidian_tortoise: 6, moon_moth: 0 });
    expect(loaded.companions.unlocked).toEqual(['root_sprout']);
    expect(loaded.companions.active).toEqual({ warrior: 'root_sprout' });
    const again = parseSaveString(JSON.stringify(loaded))!;
    expect(again.companions.parts).toEqual(loaded.companions.parts);
  });

  it('unlock needs the parts AND the story boss stage; hunts/dungeons do not count; deducts exactly the parts', () => {
    const owl = COMPANIONS.find((c) => c.id === 'storm_owl')!;
    expect(bossRequirementMet(fresh(), owl)).toBe(false);
    expect(bossRequirementMet(won(fresh(), 'sky_7', 'abyss_5'), owl)).toBe(false);
    expect(bossRequirementMet(won(fresh(), 'sky_8'), owl)).toBe(true);
    expect(companionStatus(withParts(fresh(), 'storm_owl', 48), 'storm_owl').canUnlock).toBe(false);
    expect(companionStatus(won(withParts(fresh(), 'storm_owl', 47), 'sky_8'), 'storm_owl').canUnlock).toBe(false);
    const r = unlockCompanion(won(withParts(fresh(), 'obsidian_tortoise', 60), 'abyss_5'), 'obsidian_tortoise');
    expect(r.ok).toBe(true);
    expect(r.save.companions.parts.obsidian_tortoise).toBe(4);
    const m = unlockCompanion(won(withParts(fresh(), 'moon_moth', 64), 'moonlit_8'), 'moon_moth');
    expect(m.ok && m.save.companions.unlocked).toEqual(['moon_moth']);
    expect(setActiveCompanion(m.save, 'mage', 'moon_moth').save.companions.active.mage).toBe('moon_moth');
    const locked = unlockCompanion(withParts(fresh(), 'moon_moth', 64), 'moon_moth');
    expect(locked.ok).toBe(false);
    expect(locked.toast).toContain('Ay Matronu Selene');
  });

  it('Fırtına Baykuşu: first chain step 3 only, 50% of attack, once', () => {
    expect(owlTrigger('ready', 2, 1000)).toEqual({ state: 'ready', dmg: 0 });
    const r = owlTrigger('ready', 3, 1001);
    expect(r).toEqual({ state: 'used', dmg: 501 });
    expect(owlTrigger(r.state, 4, 1000).dmg).toBe(0);
  });

  it('Obsidyen Kaplumbağası: first drop below 30% gives a 12% max-HP shield once; not at exactly 30% or when dead', () => {
    expect(tortoiseTrigger('ready', 300, 1000).shield).toBe(0);
    expect(tortoiseTrigger('ready', 0, 1000).shield).toBe(0);
    const r = tortoiseTrigger('ready', 299, 1000);
    expect(r).toEqual({ state: 'used', shield: 120 });
    expect(tortoiseTrigger(r.state, 100, 1000).shield).toBe(0);
  });

  it('Ay Güvesi: first arcane 2×2 only, 15% of max ulti, once', () => {
    expect(mothTrigger('ready', 0, 100)).toEqual({ state: 'ready', ulti: 0 });
    const r = mothTrigger('ready', 1, 100);
    expect(r).toEqual({ state: 'used', ulti: 15 });
    expect(mothTrigger(r.state, 2, 100).ulti).toBe(0);
  });
});

