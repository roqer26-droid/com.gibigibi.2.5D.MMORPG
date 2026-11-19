import { HERO_CLASSES } from '../data/classes';
import { getHunt, isHuntUnlocked } from '../data/hunts';
import type {
  EquipmentItem,
  EquipmentSlot,
  GameSaveState,
  HeroClassId,
  HuntId,
} from '../types/game';
import { recordQuestActivity } from '../utils/questProgress';
import { getDismantleYield, getEnhanceCost, getItemPowerScore } from '../utils/rpgLogic';

/**
 * Kayıt durumu üzerindeki saf işlemler. Hiçbiri ses/toast gibi yan etki üretmez;
 * bunun yerine sonuçta `toast` ve `sound` isteği döner, UI katmanı uygular.
 */
export type SoundCue =
  | 'gemSelect'
  | 'gemSwap'
  | 'levelUp'
  | 'lootReveal'
  | 'lootRevealBig'
  | 'matchArcane';

export interface ActionResult {
  save: GameSaveState;
  toast?: string;
  sound?: SoundCue;
}

const unchanged = (save: GameSaveState, toast?: string): ActionResult => ({ save, toast });

export const MAX_UPGRADE_LEVEL = 10;

export const EQUIP_SLOT_ORDER: EquipmentSlot[] = [
  'weapon',
  'offhand',
  'helmet',
  'chest',
  'gloves',
  'pants',
  'boots',
  'necklace',
  'ring1',
  'ring2',
];

export function selectHero(save: GameSaveState, classId: HeroClassId): ActionResult {
  if (!save.heroUnlocks.includes(classId)) return unchanged(save);
  return {
    save: { ...save, activeHeroClass: classId },
    toast: `${HERO_CLASSES[classId].name} aktif kahraman seçildi!`,
  };
}

export function unlockHero(save: GameSaveState, classId: HeroClassId): ActionResult {
  const cost = HERO_CLASSES[classId].unlockCost;
  if (!cost || save.heroUnlocks.includes(classId)) return unchanged(save);
  if (save.gold < cost.gold || save.crystals < cost.crystals) {
    return unchanged(save, 'Yetersiz Altın veya Kristal! Savaş kazanarak kaynak topla.');
  }
  const cls = HERO_CLASSES[classId];
  return {
    save: {
      ...save,
      gold: save.gold - cost.gold,
      crystals: save.crystals - cost.crystals,
      heroUnlocks: [...save.heroUnlocks, classId],
      activeHeroClass: classId,
    },
    sound: 'lootRevealBig',
    toast: `${cls.name} — ${cls.title} kadroya katıldı!`,
  };
}

export function equipItem(
  save: GameSaveState,
  item: EquipmentItem,
  explicitSlot?: EquipmentSlot
): ActionResult {
  const hero = save.heroes[save.activeHeroClass];
  if (hero.level < item.levelReq) {
    return unchanged(save, `${item.name} için ${item.levelReq}. seviye gerekli.`);
  }

  let targetSlot = explicitSlot ?? item.slot;
  if (!explicitSlot && (item.slot === 'ring1' || item.slot === 'ring2')) {
    targetSlot = hero.equipped.ring1 && !hero.equipped.ring2 ? 'ring2' : 'ring1';
  }

  const previous = hero.equipped[targetSlot];
  const inventory = save.inventory.filter((i) => i.id !== item.id);
  if (previous) inventory.push(previous);

  return {
    save: {
      ...save,
      inventory,
      heroes: {
        ...save.heroes,
        [save.activeHeroClass]: {
          ...hero,
          equipped: { ...hero.equipped, [targetSlot]: { ...item, slot: targetSlot } },
        },
      },
    },
    sound: 'gemSelect',
    toast: `${item.name} kuşanıldı!`,
  };
}

export function unequipSlot(save: GameSaveState, slot: EquipmentSlot): ActionResult {
  const hero = save.heroes[save.activeHeroClass];
  const eq = hero.equipped[slot];
  if (!eq) return unchanged(save);
  const equipped = { ...hero.equipped };
  delete equipped[slot];
  return {
    save: {
      ...save,
      inventory: [...save.inventory, eq],
      heroes: { ...save.heroes, [save.activeHeroClass]: { ...hero, equipped } },
    },
  };
}

export function enhanceItem(
  save: GameSaveState,
  itemId: string,
  isEquipped: boolean,
  slot?: EquipmentSlot
): ActionResult {
  const hero = save.heroes[save.activeHeroClass];
  const target =
    isEquipped && slot ? hero.equipped[slot] : save.inventory.find((i) => i.id === itemId);
  if (!target || target.upgradeLevel >= MAX_UPGRADE_LEVEL) return unchanged(save);

  const cost = getEnhanceCost(target);
  if (save.gold < cost.gold || save.crystals < cost.crystals) {
    return unchanged(save, 'Yükseltme için yeterli Altın veya Kristal yok.');
  }

  const upgraded: EquipmentItem = { ...target, upgradeLevel: target.upgradeLevel + 1 };
  const base: GameSaveState = {
    ...save,
    gold: save.gold - cost.gold,
    crystals: save.crystals - cost.crystals,
    stats: { ...save.stats, itemsUpgraded: save.stats.itemsUpgraded + 1 },
  };

  const next =
    isEquipped && slot
      ? {
          ...base,
          heroes: {
            ...base.heroes,
            [save.activeHeroClass]: { ...hero, equipped: { ...hero.equipped, [slot]: upgraded } },
          },
        }
      : { ...base, inventory: base.inventory.map((i) => (i.id === itemId ? upgraded : i)) };

  return {
    save: recordQuestActivity(next, { upgrade: true }),
    sound: 'levelUp',
    toast: `${upgraded.name} +${upgraded.upgradeLevel} seviyesine yükseltildi!`,
  };
}

export function dismantleItem(save: GameSaveState, itemId: string): ActionResult {
  const item = save.inventory.find((i) => i.id === itemId);
  if (!item) return unchanged(save);
  const y = getDismantleYield(item);
  return {
    save: {
      ...save,
      gold: save.gold + y.gold,
      crystals: save.crystals + y.crystals,
      inventory: save.inventory.filter((i) => i.id !== itemId),
    },
    sound: 'gemSwap',
    toast: `Parçalandı: +${y.crystals} Kristal, +${y.gold} Altın`,
  };
}

export function sellItem(save: GameSaveState, itemId: string): ActionResult {
  const item = save.inventory.find((i) => i.id === itemId);
  if (!item) return unchanged(save);
  return {
    save: {
      ...save,
      gold: save.gold + item.sellValue,
      inventory: save.inventory.filter((i) => i.id !== itemId),
    },
    sound: 'gemSelect',
    toast: `Satıldı: +${item.sellValue} Altın`,
  };
}

export function autoEquipBest(save: GameSaveState): ActionResult {
  const hero = save.heroes[save.activeHeroClass];
  let pool = [...save.inventory];
  const equipped = { ...hero.equipped };

  EQUIP_SLOT_ORDER.forEach((slot) => {
    const current = equipped[slot];
    const currentScore = current ? getItemPowerScore(current) : -1;
    const isRing = slot === 'ring1' || slot === 'ring2';

    const best = pool
      .filter((item) => {
        if (item.levelReq > hero.level) return false;
        return isRing ? item.slot === 'ring1' || item.slot === 'ring2' : item.slot === slot;
      })
      .sort((a, b) => getItemPowerScore(b) - getItemPowerScore(a))[0];

    if (best && getItemPowerScore(best) > currentScore) {
      pool = pool.filter((i) => i.id !== best.id);
      if (current) pool.push(current);
      equipped[slot] = { ...best, slot };
    }
  });

  return {
    save: {
      ...save,
      inventory: pool,
      heroes: { ...save.heroes, [save.activeHeroClass]: { ...hero, equipped } },
    },
    sound: 'lootReveal',
    toast: 'En güçlü ekipmanlar otomatik kuşanıldı!',
  };
}

export function dismantleCommonItems(save: GameSaveState): ActionResult {
  const keep: EquipmentItem[] = [];
  let gold = 0;
  let crystals = 0;
  let count = 0;

  save.inventory.forEach((item) => {
    if (item.rarity === 'common') {
      const y = getDismantleYield(item);
      gold += y.gold;
      crystals += y.crystals;
      count += 1;
    } else {
      keep.push(item);
    }
  });

  if (count === 0) return unchanged(save, 'Parçalanacak Sıradan eşya bulunamadı.');
  return {
    save: { ...save, gold: save.gold + gold, crystals: save.crystals + crystals, inventory: keep },
    sound: 'matchArcane',
    toast: `${count} Sıradan eşya parçalandı: +${crystals} Kristal!`,
  };
}

export function upgradeSkillNode(save: GameSaveState, nodeId: string): ActionResult {
  const hero = save.heroes[save.activeHeroClass];
  if (hero.skillPoints <= 0) return unchanged(save);
  const node = HERO_CLASSES[hero.classId].skillTree.find((n) => n.id === nodeId);
  if (!node) return unchanged(save);
  const rank = hero.skillRanks[nodeId] ?? 0;
  if (rank >= node.maxRank) return unchanged(save);
  if (node.requires && (hero.skillRanks[node.requires] ?? 0) < 1) return unchanged(save);

  return {
    save: {
      ...save,
      heroes: {
        ...save.heroes,
        [save.activeHeroClass]: {
          ...hero,
          skillPoints: hero.skillPoints - 1,
          skillRanks: { ...hero.skillRanks, [nodeId]: rank + 1 },
        },
      },
    },
    sound: 'levelUp',
  };
}

export function resetSkills(save: GameSaveState): ActionResult {
  const hero = save.heroes[save.activeHeroClass];
  const refunded = Object.values(hero.skillRanks).reduce((a, b) => a + b, 0);
  return {
    save: {
      ...save,
      heroes: {
        ...save.heroes,
        [save.activeHeroClass]: { ...hero, skillPoints: hero.skillPoints + refunded, skillRanks: {} },
      },
    },
    toast: 'Yetenek puanları sıfırlandı ve iade edildi!',
  };
}

export interface HuntOutcome {
  save: GameSaveState;
  /** Av açık değilse veya tur sayısı geçersizse false; kayıt değişmez. */
  recorded: boolean;
  /** Bu zaferle verilen ilk zafer ödülü (daha önce verildiyse null) */
  firstReward: { gold: number; crystals: number } | null;
  newRecord: boolean;
  previousBest: number | null;
  bestTurns: number | null;
  wins: number;
}

/**
 * Av zaferini kayda işler: galibiyet sayısı, en az tur rekoru ve ilk zafer ödülü
 * (ödül + "verildi" bilgisi) tek güncellemede yazılır. Ödül yalnızca bir kez verilir.
 */
export function recordHuntVictory(save: GameSaveState, huntId: HuntId, turns: number): HuntOutcome {
  const hunt = getHunt(huntId);
  const rec = save.huntRecords[huntId];
  const t = Math.floor(turns);
  if (!isHuntUnlocked(save, hunt) || !Number.isFinite(t) || t < 1) {
    return {
      save,
      recorded: false,
      firstReward: null,
      newRecord: false,
      previousBest: rec.bestTurns,
      bestTurns: rec.bestTurns,
      wins: rec.wins,
    };
  }

  const newRecord = rec.bestTurns === null || t < rec.bestTurns;
  const grantReward = !rec.firstRewardClaimed;
  const nextRec = {
    bestTurns: newRecord ? t : rec.bestTurns,
    wins: rec.wins + 1,
    firstRewardClaimed: true,
  };
  return {
    save: {
      ...save,
      gold: save.gold + (grantReward ? hunt.firstReward.gold : 0),
      crystals: save.crystals + (grantReward ? hunt.firstReward.crystals : 0),
      huntRecords: { ...save.huntRecords, [huntId]: nextRec },
    },
    recorded: true,
    firstReward: grantReward ? { ...hunt.firstReward } : null,
    newRecord,
    previousBest: rec.bestTurns,
    bestTurns: nextRec.bestTurns,
    wins: nextRec.wins,
  };
}
