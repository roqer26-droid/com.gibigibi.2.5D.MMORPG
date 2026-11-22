import { HERO_CLASSES } from '../data/classes';
import { costumeById, isCostumeUnlocked } from '../data/costumes';
import { getHunt, isHuntUnlocked } from '../data/hunts';
import type {
  EquipmentItem,
  EquipmentSlot,
  GameSaveState,
  HeroClassId,
  HuntId,
} from '../types/game';
import { planBestEquipment, type EquipPlan } from '../game/equipPlanner';
import { recordQuestActivity } from '../utils/questProgress';
import { getDismantleYield, getEnhanceCost } from '../utils/rpgLogic';

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

export function selectHero(save: GameSaveState, classId: HeroClassId): ActionResult {
  if (!save.heroUnlocks.includes(classId)) return unchanged(save);
  return {
    save: { ...save, activeHeroClass: classId },
    toast: `${HERO_CLASSES[classId].name} aktif kahraman seçildi!`,
  };
}

/**
 * Kostüm giy / varsayılan görünüme dön (`costumeId = null`). Tamamen kozmetik: yalnızca `HeroProgress.costumeId` değişir.
 * Kostüm şampiyon açıldığında kullanıma açılır (`isCostumeUnlocked`); geçersiz kimlik ya da kilitli şampiyon değişiklik yapmaz.
 */
export function setHeroCostume(save: GameSaveState, classId: HeroClassId, costumeId: string | null): ActionResult {
  const hero = save.heroes[classId];
  if (!hero || !save.heroUnlocks.includes(classId)) return unchanged(save);
  if (costumeId === null) {
    if (hero.costumeId === undefined) return unchanged(save);
    const { costumeId: _drop, ...rest } = hero;
    void _drop;
    return { save: { ...save, heroes: { ...save.heroes, [classId]: rest } }, toast: 'Varsayılan görünüme dönüldü.' };
  }
  const costume = costumeById(costumeId);
  if (!costume || costume.heroId !== classId || !isCostumeUnlocked(save.heroUnlocks, costume)) return unchanged(save);
  if (hero.costumeId === costumeId) return unchanged(save);
  return { save: { ...save, heroes: { ...save.heroes, [classId]: { ...hero, costumeId } } }, toast: `${costume.name} kostümü kullanılıyor.` };
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
    // Başarılı yükseltmede alt bildirim gösterilmez (ekranı kalabalıklaştırıyordu); ses ve eşya rozeti geri bildirimdir.
    sound: 'levelUp',
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

/** Satılabilir mi: yalnızca çantadaki, kuşanılmamış ve (varsa) kilitlenmemiş eşyalar. Fiyat her eşyanın kendi `sellValue` değeridir. */
export function isSellable(save: GameSaveState, item: EquipmentItem): boolean {
  if ((item as EquipmentItem & { locked?: boolean }).locked) return false;
  return !Object.values(save.heroes).some((h) => Object.values(h.equipped).some((e) => e?.id === item.id));
}

/** Toplu satış: tüm seçili eşyalar ve altın TEK kayıt güncellemesinde işlenir; çantada olmayan/satılamayan kimlikler yok sayılır (çift çağrı etkisiz). */
export function sellItems(save: GameSaveState, itemIds: string[]): ActionResult {
  const ids = new Set(itemIds);
  const sold = save.inventory.filter((i) => ids.has(i.id) && isSellable(save, i));
  if (sold.length === 0) return unchanged(save, 'Satılacak item seçilmedi.');
  const gold = sold.reduce((sum, i) => sum + i.sellValue, 0);
  const soldIds = new Set(sold.map((i) => i.id));
  return {
    save: { ...save, gold: save.gold + gold, inventory: save.inventory.filter((i) => !soldIds.has(i.id)) },
    sound: 'gemSelect',
    toast: `${sold.length} item satıldı: +${gold.toLocaleString('tr-TR')} Altın`,
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

/**
 * Önerilen ekipman planını TEK kayıt güncellemesiyle uygular: kuşanılan eşyalar çantadan çıkar,
 * yerlerinden çıkan eşyalar çantaya döner. Plan bayatsa (envanter/ekipman değişmişse) hiçbir şey değişmez.
 */
export function applyEquipPlan(save: GameSaveState, plan: EquipPlan): ActionResult {
  const hero = save.heroes[save.activeHeroClass];
  if (save.activeHeroClass !== plan.classId) {
    return unchanged(save, 'Aktif kahraman değişti, öneriyi yeniden hesapla.');
  }
  if (plan.unchanged) return unchanged(save, 'Mevcut ekipmanların önerilen kombinasyonda.');

  const invById = new Map(save.inventory.map((i) => [i.id, i]));
  // Kuşanılmış eşya herhangi bir yuvada olabilir (ör. Yüzük 2'deki yüzük Yüzük 1'e taşınır)
  const wornById = new Map<string, EquipmentItem>();
  for (const w of Object.values(hero.equipped)) if (w) wornById.set(w.id, w);
  const proposedIds = new Set<string>();
  for (const [, item] of Object.entries(plan.proposed) as [EquipmentSlot, EquipmentItem | undefined][]) {
    if (!item) continue;
    const available = wornById.has(item.id) || invById.has(item.id);
    if (!available || proposedIds.has(item.id)) {
      return unchanged(save, 'Ekipman değişti, öneriyi yeniden hesapla.');
    }
    proposedIds.add(item.id);
  }

  // Yeni kuşanılanlar çantadan çıkar; eski kuşanılanlardan artık takılmayanlar çantaya döner
  const inventory = save.inventory.filter((i) => !proposedIds.has(i.id));
  for (const item of Object.values(hero.equipped)) {
    if (item && !proposedIds.has(item.id)) inventory.push(item);
  }
  const equipped: Partial<Record<EquipmentSlot, EquipmentItem>> = {};
  for (const [slot, item] of Object.entries(plan.proposed) as [EquipmentSlot, EquipmentItem | undefined][]) {
    if (!item) continue;
    // Çantadaki/kuşanılmış güncel eşya nesnesini kullan (geliştirme seviyesi vb. güncel kalsın)
    const live = wornById.get(item.id) ?? invById.get(item.id)!;
    equipped[slot] = { ...live, slot };
  }

  return {
    save: {
      ...save,
      inventory,
      heroes: { ...save.heroes, [save.activeHeroClass]: { ...hero, equipped } },
    },
    sound: 'lootReveal',
    toast: 'Önerilen ekipmanlar kuşanıldı!',
  };
}

/** Önizlemesiz hızlı yol: planı hesaplar ve uygular (testler ve geriye uyumluluk için). */
export function autoEquipBest(save: GameSaveState): ActionResult {
  const hero = save.heroes[save.activeHeroClass];
  return applyEquipPlan(save, planBestEquipment(hero, save.inventory));
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
