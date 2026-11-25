import { describe, expect, it } from 'vitest';
import {
  HUNT_DIFFICULTIES,
  HUNT_POWER_DPM,
  defaultDifficulty,
  huntBattleStage,
  huntBossStats,
  huntDamagePerMove,
  huntRewardPreview,
  isDifficultyUnlocked,
  rollHuntRepeatReward,
} from '../src/data/huntScaling';
import { findStageById } from '../src/data/world';
import { getHunt } from '../src/data/hunts';
import { recordHuntVictory } from '../src/state/saveActions';
import { generateEquipmentItem } from '../src/data/items';
import { computeHeroBuild } from '../src/utils/rpgLogic';
import { SAVE_VERSION, createInitialSaveState, parseSaveString } from '../src/utils/storage';
import type { EquipmentSlot, GameSaveState, HeroProgress, Rarity } from '../src/types/game';

const slots: EquipmentSlot[] = ['helmet', 'chest', 'gloves', 'pants', 'boots', 'weapon', 'offhand', 'necklace', 'ring1', 'ring2'];
const geared = (level: number, rarity: Rarity, up = 0): HeroProgress => {
  const h = { ...createInitialSaveState().heroes.warrior, level, equipped: {} as HeroProgress['equipped'] };
  for (const sl of slots) {
    const it = generateEquipmentItem({ level, rarity, slot: sl, preferredClass: 'warrior' });
    it.upgradeLevel = up;
    (h.equipped as Record<string, unknown>)[sl] = it;
  }
  return h;
};
const unlocked = (): GameSaveState => ({ ...createInitialSaveState(), bossVictories: ['frost_queen', 'infernal_dragon'] });
const fixed = { gold: 1000, crystals: 10, item: null, essence: 0 };

describe('Boss Avı ölçekleme', () => {
  it('güç → hasar tablosu artan ve sürekli', () => {
    for (let i = 1; i < HUNT_POWER_DPM.length; i++) expect(HUNT_POWER_DPM[i][1]).toBeGreaterThan(HUNT_POWER_DPM[i - 1][1]);
    expect(huntDamagePerMove(71000)).toBeCloseTo(426000, -2);
    expect(huntDamagePerMove(142000)).toBeCloseTo(852000, -2);
    expect(huntDamagePerMove(1000)).toBeGreaterThan(0);
  });

  it('boss canı ve saldırısı kahraman gücüyle artar; her kademe bir öncekinden zor', () => {
    const weak = geared(20, 'rare');
    const strong = geared(50, 'mythic', 10);
    for (const id of ['frozen_throne', 'ash_arena'] as const) {
      const a = huntBossStats(id, 'normal', weak);
      const b = huntBossStats(id, 'normal', strong);
      expect(b.maxHp).toBeGreaterThan(a.maxHp * 5);
      expect(b.attack).toBeGreaterThan(a.attack);
      const n = huntBossStats(id, 'normal', strong), h = huntBossStats(id, 'hard', strong), x = huntBossStats(id, 'nightmare', strong);
      expect(h.maxHp).toBeGreaterThan(n.maxHp);
      expect(x.maxHp).toBeGreaterThan(h.maxHp);
      expect(x.attack).toBeGreaterThan(h.attack);
      expect(h.attack).toBeGreaterThan(n.attack);
    }
  });

  it('hamle hedefi: ölçülen hasarla Normal ~24, Kâbus ~44 hamle', () => {
    const hero = geared(50, 'legendary', 5);
    const dpm = huntDamagePerMove(computeHeroBuild(hero).powerRating);
    const n = huntBossStats('ash_arena', 'normal', hero).maxHp / dpm;
    const x = huntBossStats('ash_arena', 'nightmare', hero).maxHp / dpm;
    expect(n).toBeGreaterThan(20);
    expect(x).toBeGreaterThan(40);
  });

  it('av aşaması hikâye bossunun kimliğini, zayıflığını ve faz verisini korur; can hikâyedekinin altına inmez', () => {
    for (const id of ['frozen_throne', 'ash_arena'] as const) {
      const base = findStageById(getHunt(id).storyStageId)!.stage;
      const st = huntBattleStage(id, 'normal', createInitialSaveState().heroes.warrior);
      expect(st.id).toBe(base.id);
      expect(st.enemy.bossId).toBe(base.enemy.bossId);
      expect(st.enemy.weakness).toBe(base.enemy.weakness);
      expect(st.enemy.maxHp).toBeGreaterThanOrEqual(base.enemy.maxHp);
    }
  });
});

describe('Boss Avı kademeleri ve ödülleri', () => {
  it('kademeler sırayla açılır', () => {
    let s = unlocked();
    expect(isDifficultyUnlocked(s, 'frozen_throne', 'hard')).toBe(false);
    expect(recordHuntVictory(s, 'frozen_throne', 20, 'hard', fixed).recorded).toBe(false);
    const r1 = recordHuntVictory(s, 'frozen_throne', 20, 'normal', fixed);
    expect(r1.unlockedDifficulty).toBe('hard');
    s = r1.save;
    expect(isDifficultyUnlocked(s, 'frozen_throne', 'hard')).toBe(true);
    expect(isDifficultyUnlocked(s, 'frozen_throne', 'nightmare')).toBe(false);
    expect(isDifficultyUnlocked(s, 'ash_arena', 'hard')).toBe(false);
    expect(defaultDifficulty(s, 'frozen_throne')).toBe('hard');
    const r2 = recordHuntVictory(s, 'frozen_throne', 30, 'hard', fixed);
    expect(r2.unlockedDifficulty).toBe('nightmare');
    expect(recordHuntVictory(r2.save, 'frozen_throne', 30, 'hard', fixed).unlockedDifficulty).toBeNull();
  });

  it('tekrar ödülü her zaferde verilir; ilk zafer ödülü bir kez', () => {
    const s0 = unlocked();
    const item = generateEquipmentItem({ level: 10, rarity: 'rare' });
    const a = recordHuntVictory(s0, 'ash_arena', 20, 'normal', { gold: 500, crystals: 7, item, essence: 0 });
    expect(a.save.gold).toBe(s0.gold + 1200 + 500);
    expect(a.save.crystals).toBe(s0.crystals + 15 + 7);
    expect(a.save.inventory.length).toBe(s0.inventory.length + 1);
    const b = recordHuntVictory(a.save, 'ash_arena', 22, 'normal', { gold: 500, crystals: 7, item: null, essence: 12 });
    expect(b.firstReward).toBeNull();
    expect(b.save.gold).toBe(a.save.gold + 500);
    expect(b.save.materials.divineEssence).toBe(a.save.materials.divineEssence + 12);
  });

  it('ödül kahraman seviyesi ve kademeyle büyür; İlahi Öz yalnızca Kâbus', () => {
    expect(huntRewardPreview('normal', 50).gold).toBeGreaterThan(huntRewardPreview('normal', 10).gold * 3);
    expect(huntRewardPreview('nightmare', 30).gold).toBeGreaterThan(huntRewardPreview('hard', 30).gold);
    const always = () => 0;
    const hero = { level: 40, classId: 'warrior' as const };
    expect(rollHuntRepeatReward('normal', hero, always).essence).toBe(0);
    expect(rollHuntRepeatReward('hard', hero, always).essence).toBe(0);
    expect(rollHuntRepeatReward('nightmare', hero, always).essence).toBeGreaterThanOrEqual(10);
    const never = () => 0.999;
    const r = rollHuntRepeatReward('nightmare', hero, never);
    expect(r.item).toBeNull();
    expect(r.essence).toBe(0);
    expect(rollHuntRepeatReward('nightmare', hero, always).item?.rarity).toBe(HUNT_DIFFICULTIES.nightmare.itemRarity);
  });

  it('eski kayıt (v16) yüklenir: rekor korunur, kademeler boş (Normal açık)', () => {
    const old = { ...unlocked(), version: 16, huntRecords: { frozen_throne: { bestTurns: 6, wins: 3, firstRewardClaimed: true }, ash_arena: { bestTurns: null, wins: 0, firstRewardClaimed: false } } };
    const s = parseSaveString(JSON.stringify(old))!;
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.huntRecords.frozen_throne.bestTurns).toBe(6);
    expect(s.huntRecords.frozen_throne.wins).toBe(3);
    expect(s.huntRecords.frozen_throne.cleared).toEqual([]);
    expect(s.huntRecords.frozen_throne.best).toEqual({ normal: null, hard: null, nightmare: null });
    expect(isDifficultyUnlocked(s, 'frozen_throne', 'normal')).toBe(true);
    expect(isDifficultyUnlocked(s, 'frozen_throne', 'hard')).toBe(false);
  });
});
