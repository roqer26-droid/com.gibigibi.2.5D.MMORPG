import {
  ElementType,
  EquipmentItem,
  EquipmentSlot,
  EquipmentVisual,
  GemType,
  HeroClassId,
  ItemCategory,
  Rarity,
} from '../types/game';
import { HERO_CLASSES } from './classes';
import { RARITY_META } from './skills';

/** Her sınıfın imza ikinci el eşyası */
export const CLASS_OFFHAND: Partial<Record<HeroClassId, ItemCategory>> = {
  warrior: 'shield',
  paladin: 'shield',
  mage: 'tome',
  ranger: 'quiver',
  necromancer: 'skull',
  assassin: 'cloak',
  stormcaller: 'tome',
  dragonheart: 'shield',
};

let itemUidCounter = 1000;
export function nextItemId(prefix = 'itm'): string {
  itemUidCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${itemUidCounter}_${Math.floor(Math.random() * 999)}`;
}

const ELEMENT_VISUALS: Record<
  ElementType,
  {
    primary: string;
    secondary: string;
    glow: string;
    variant: EquipmentVisual['variant'];
    prefixTr: string;
    gem?: GemType;
  }
> = {
  fire: {
    primary: '#dc2626',
    secondary: '#f97316',
    glow: '#fb923c',
    variant: 'flame',
    prefixTr: 'Cehennem Alevi',
    gem: 'fire',
  },
  frost: {
    primary: '#0284c7',
    secondary: '#7dd3fc',
    glow: '#38bdf8',
    variant: 'frost',
    prefixTr: 'Buzul Fırtınası',
    gem: 'frost',
  },
  nature: {
    primary: '#15803d',
    secondary: '#4ade80',
    glow: '#22c55e',
    variant: 'oak',
    prefixTr: 'Kadim Orman',
    gem: 'nature',
  },
  lightning: {
    primary: '#ca8a04',
    secondary: '#fef08a',
    glow: '#facc15',
    variant: 'royal',
    prefixTr: 'Yıldırım Çağı',
    gem: 'lightning',
  },
  arcane: {
    primary: '#7e22ce',
    secondary: '#d8b4fe',
    glow: '#a855f7',
    variant: 'arcane',
    prefixTr: 'Arkan Yıldız',
    gem: 'arcane',
  },
  holy: {
    primary: '#d97706',
    secondary: '#fef3c7',
    glow: '#fbbf24',
    variant: 'royal',
    prefixTr: 'Kutsal Işık',
    gem: 'golden',
  },
  physical: {
    primary: '#64748b',
    secondary: '#cbd5e1',
    glow: '#94a3b8',
    variant: 'iron',
    prefixTr: 'Çelik Dövme',
  },
};

const SLOT_NOUNS: Record<EquipmentSlot, Record<string, string>> = {
  helmet: {
    heavy_armor: 'Savaş Miğferi',
    light_armor: 'Avcı Başlığı',
    magic_armor: 'Büyücü Tacı',
  },
  chest: {
    heavy_armor: 'Plaka Zırhı',
    light_armor: 'Deri Yeleği',
    magic_armor: 'Arkan Cübbesi',
  },
  gloves: {
    heavy_armor: 'Demir Eldiveni',
    light_armor: 'Nişancı Eldiveni',
    magic_armor: 'İpek Manşeti',
  },
  pants: {
    heavy_armor: 'Zırh Dizliği',
    light_armor: 'Orman Pantolonu',
    magic_armor: 'Yıldız Eteği',
  },
  boots: {
    heavy_armor: 'Ağır Çizmesi',
    light_armor: 'Rüzgar Çizmesi',
    magic_armor: 'Süzülüş Çizmesi',
  },
  weapon: {
    sword: 'Uzun Kılıcı',
    axe: 'Savaş Baltası',
    staff: 'Kadim Asası',
    bow: 'Büyük Yayı',
    dagger: 'Gölge Hançeri',
    scythe: 'Ölüm Tırpanı',
    spear: 'Fırtına Mızrağı',
  },
  offhand: {
    shield: 'Kule Kalkanı',
    tome: 'Büyü Kitabı',
    quiver: 'Yıldırım Sadağı',
    skull: 'Ruh Kafatası',
    cloak: 'Gölge Pelerini',
  },
  necklace: {
    accessory: 'Tılsım Kolyesi',
  },
  ring1: {
    accessory: 'Güç Yüzüğü',
  },
  ring2: {
    accessory: 'Efsunlu Yüzüğü',
  },
};

const RARITY_PREFIX: Record<Rarity, string> = {
  common: 'Basit',
  uncommon: 'Güçlendirilmiş',
  rare: 'Parlak',
  epic: 'Destansı',
  legendary: 'Efsanevi',
  mythic: 'Mitik',
};

export function generateEquipmentItem(params: {
  level: number;
  rarity: Rarity;
  slot?: EquipmentSlot;
  preferredClass?: HeroClassId;
  forcedElement?: ElementType;
  customName?: string;
  /** Silah türünü sabitle (isimli eşyalarda isimle uyuşması için) */
  category?: ItemCategory;
}): EquipmentItem {
  const allSlots: EquipmentSlot[] = [
    'helmet',
    'chest',
    'gloves',
    'pants',
    'boots',
    'weapon',
    'offhand',
    'necklace',
    'ring1',
    'ring2',
  ];
  const slot = params.slot ?? allSlots[Math.floor(Math.random() * allSlots.length)];

  const elements: ElementType[] = ['fire', 'frost', 'nature', 'lightning', 'arcane', 'holy', 'physical'];
  const element =
    params.forcedElement ??
    (params.rarity === 'common'
      ? 'physical'
      : elements[Math.floor(Math.random() * (elements.length - 1))]);

  const clsDef = params.preferredClass ? HERO_CLASSES[params.preferredClass] : null;

  let category: ItemCategory = 'heavy_armor';
  if (slot === 'weapon') {
    if (params.category) {
      category = params.category;
    } else if (clsDef) {
      const weaps = clsDef.preferredWeapons;
      // İsimli (başlangıç) silahlar sınıfın imza silah türünü alır; ganimetler rastgeledir
      category = params.customName ? weaps[0] : weaps[Math.floor(Math.random() * weaps.length)];
    } else {
      const weaps: ItemCategory[] = ['sword', 'axe', 'staff', 'bow', 'dagger', 'scythe', 'spear'];
      category = weaps[Math.floor(Math.random() * weaps.length)];
    }
  } else if (slot === 'offhand') {
    if (clsDef) {
      category = clsDef.offhandCategory ?? CLASS_OFFHAND[clsDef.id] ?? 'shield';
    } else {
      const offs: ItemCategory[] = ['shield', 'tome', 'quiver', 'skull', 'cloak'];
      category = offs[Math.floor(Math.random() * offs.length)];
    }
  } else if (slot === 'necklace' || slot === 'ring1' || slot === 'ring2') {
    category = 'accessory';
  } else {
    if (clsDef) {
      category = clsDef.preferredArmor;
    } else {
      const armors: ItemCategory[] = ['heavy_armor', 'light_armor', 'magic_armor'];
      category = armors[Math.floor(Math.random() * armors.length)];
    }
  }

  const rarityMult = RARITY_META[params.rarity].multiplier;
  const lvlScale = 1 + (params.level - 1) * 0.24;
  const power = rarityMult * lvlScale;

  const stats: EquipmentItem['stats'] = {};
  if (slot === 'weapon') {
    stats.attack = Math.round((14 + Math.random() * 6) * power);
    stats.critChance = Number((1.5 + RARITY_META[params.rarity].rank * 1.1).toFixed(1));
    if (category === 'staff') {
      stats.mana = Math.round(10 * power);
      stats.elementalDamage = Math.round(6 + RARITY_META[params.rarity].rank * 3.5);
    } else if (category === 'bow') {
      stats.critDamage = Math.round(8 + RARITY_META[params.rarity].rank * 5);
    } else if (category === 'dagger') {
      stats.attack = Math.round(stats.attack * 0.82);
      stats.critChance = Number((4 + RARITY_META[params.rarity].rank * 1.8).toFixed(1));
      stats.critDamage = Math.round(14 + RARITY_META[params.rarity].rank * 7);
      stats.dodge = Number((1 + RARITY_META[params.rarity].rank * 0.7).toFixed(1));
    } else if (category === 'scythe') {
      stats.attack = Math.round(stats.attack * 1.18);
      stats.critDamage = Math.round(10 + RARITY_META[params.rarity].rank * 5);
      stats.elementalDamage = Math.round(5 + RARITY_META[params.rarity].rank * 3);
      stats.mana = Math.round(8 * power);
    } else if (category === 'spear') {
      stats.attack = Math.round(stats.attack * 1.05);
      stats.elementalDamage = Math.round(7 + RARITY_META[params.rarity].rank * 3.8);
      stats.defense = Math.round(4 * power);
      stats.critChance = Number((2 + RARITY_META[params.rarity].rank * 1.2).toFixed(1));
    } else {
      stats.health = Math.round(25 * power);
    }
  } else if (slot === 'offhand') {
    if (category === 'shield') {
      stats.defense = Math.round(9 * power);
      stats.health = Math.round(55 * power);
    } else if (category === 'tome') {
      stats.mana = Math.round(16 * power);
      stats.elementalDamage = Math.round(8 + RARITY_META[params.rarity].rank * 4);
      stats.attack = Math.round(6 * power);
    } else if (category === 'skull') {
      stats.mana = Math.round(18 * power);
      stats.elementalDamage = Math.round(9 + RARITY_META[params.rarity].rank * 4.5);
      stats.attack = Math.round(7 * power);
      stats.critChance = Number((1.5 + RARITY_META[params.rarity].rank * 0.9).toFixed(1));
    } else if (category === 'cloak') {
      stats.dodge = Number((3 + RARITY_META[params.rarity].rank * 1.6).toFixed(1));
      stats.critChance = Number((2.5 + RARITY_META[params.rarity].rank * 1.3).toFixed(1));
      stats.attack = Math.round(7 * power);
      stats.health = Math.round(28 * power);
    } else {
      stats.attack = Math.round(8 * power);
      stats.critChance = Number((2 + RARITY_META[params.rarity].rank * 1.2).toFixed(1));
      stats.dodge = Number((1.5 + RARITY_META[params.rarity].rank * 0.9).toFixed(1));
    }
  } else if (slot === 'chest' || slot === 'helmet' || slot === 'pants') {
    const slotWeight = slot === 'chest' ? 1.35 : slot === 'pants' ? 1.05 : 0.95;
    stats.health = Math.round(52 * power * slotWeight);
    stats.defense = Math.round(7 * power * slotWeight);
    if (category === 'magic_armor') {
      stats.mana = Math.round(9 * power);
      stats.elementalDamage = Math.round(3 + RARITY_META[params.rarity].rank * 2);
    } else if (category === 'light_armor') {
      stats.dodge = Number((1 + RARITY_META[params.rarity].rank * 0.8).toFixed(1));
      stats.critChance = Number((0.8 + RARITY_META[params.rarity].rank * 0.6).toFixed(1));
    }
  } else if (slot === 'gloves' || slot === 'boots') {
    stats.health = Math.round(34 * power);
    stats.defense = Math.round(4.5 * power);
    if (slot === 'gloves') {
      stats.attack = Math.round(5.5 * power);
      stats.critDamage = Math.round(4 + RARITY_META[params.rarity].rank * 3);
    } else {
      stats.dodge = Number((1.4 + RARITY_META[params.rarity].rank * 1.1).toFixed(1));
    }
  } else {
    // necklace, ring1, ring2
    stats.attack = Math.round(7 * power);
    stats.elementalDamage = Math.round(4 + RARITY_META[params.rarity].rank * 3.2);
    stats.critChance = Number((1.2 + RARITY_META[params.rarity].rank * 1.0).toFixed(1));
    stats.mana = Math.round(7 * power);
  }

  const elVis = ELEMENT_VISUALS[element];
  const nounMap = SLOT_NOUNS[slot];
  const noun = nounMap[category] ?? Object.values(nounMap)[0];
  const prefix =
    params.rarity === 'common'
      ? RARITY_PREFIX[params.rarity]
      : params.rarity === 'mythic'
        ? `Mitik ${elVis.prefixTr}`
        : `${RARITY_PREFIX[params.rarity]} ${elVis.prefixTr}`;

  const name = params.customName ?? `${prefix} ${noun}`;

  let specialBonus: string | undefined;
  let specialEffect: EquipmentItem['specialEffect'];
  if (RARITY_META[params.rarity].rank >= 3) {
    const bonusVal = Math.round(4 + RARITY_META[params.rarity].rank * 3.5);
    if (elVis.gem) {
      specialEffect = { type: 'gem_bonus', gem: elVis.gem, value: bonusVal };
      const gemLabel =
        elVis.gem === 'fire'
          ? 'Ateş'
          : elVis.gem === 'frost'
            ? 'Buz'
            : elVis.gem === 'nature'
              ? 'Doğa'
              : elVis.gem === 'lightning'
                ? 'Yıldırım'
                : elVis.gem === 'arcane'
                  ? 'Arkan'
                  : 'Altın';
      specialBonus = `${gemLabel} taşlarının etkisini +%${bonusVal} artırır`;
    } else {
      specialEffect = { type: 'combo_dmg', value: bonusVal };
      specialBonus = `Kombo hasarını +%${bonusVal} artırır`;
    }
  }
  if (params.rarity === 'mythic' || params.rarity === 'legendary') {
    if (Math.random() > 0.5) {
      const bossVal = params.rarity === 'mythic' ? 22 : 14;
      specialEffect = { type: 'boss_slayer', value: bossVal };
      specialBonus = `Bosslara karşı tüm hasarı +%${bossVal} artırır`;
    }
  }

  const visualVariant: EquipmentVisual['variant'] =
    params.rarity === 'mythic'
      ? 'mythic'
      : params.rarity === 'legendary'
        ? 'royal'
        : elVis.variant;

  const visual: EquipmentVisual = {
    primaryColor: params.rarity === 'mythic' ? '#f43f5e' : elVis.primary,
    secondaryColor: params.rarity === 'legendary' ? '#fde047' : elVis.secondary,
    glowColor: params.rarity === 'mythic' ? '#fb7185' : params.rarity === 'legendary' ? '#f59e0b' : elVis.glow,
    variant: visualVariant,
  };

  return {
    id: nextItemId(),
    name,
    description: `${RARITY_META[params.rarity].label} seviye ${categoryLabel(category)}. Kahramanın görünümünü ve savaş gücünü değiştirir.`,
    slot,
    category,
    rarity: params.rarity,
    levelReq: Math.max(1, params.level),
    upgradeLevel: 0,
    element,
    stats,
    specialBonus,
    specialEffect,
    sellValue: Math.round(18 * power),
    visual,
  };
}

export function categoryLabel(cat: ItemCategory): string {
  const map: Record<ItemCategory, string> = {
    sword: 'Kılıç',
    axe: 'Balta',
    staff: 'Büyü Asası',
    bow: 'Yay',
    dagger: 'Hançer',
    scythe: 'Tırpan',
    spear: 'Mızrak',
    shield: 'Kalkan',
    tome: 'Büyü Kitabı',
    quiver: 'Ok Sadağı',
    skull: 'Ruh Kafatası',
    cloak: 'Pelerin',
    heavy_armor: 'Ağır Zırh',
    light_armor: 'Hafif Zırh',
    magic_armor: 'Büyü Zırhı',
    accessory: 'Aksesuar',
  };
  return map[cat];
}

export function createStarterEquipment(classId: HeroClassId): Partial<Record<EquipmentSlot, EquipmentItem>> {
  // Yaratık sınıfları: veri güdümlü başlangıç seti
  const starter = HERO_CLASSES[classId]?.starterGear;
  if (starter) {
    const mk = (slot: EquipmentSlot, rarity: Rarity, customName?: string) =>
      generateEquipmentItem({
        level: 1,
        rarity,
        slot,
        preferredClass: classId,
        forcedElement: starter.element,
        customName,
      });
    return {
      weapon: mk('weapon', 'uncommon', starter.weapon),
      offhand: mk('offhand', 'common', starter.offhand),
      chest: mk('chest', 'common', starter.chest),
      helmet: mk('helmet', 'common', starter.helmet),
      boots: mk('boots', 'common'),
    };
  }
  if (classId === 'warrior') {
    return {
      weapon: generateEquipmentItem({
        level: 1,
        rarity: 'uncommon',
        slot: 'weapon',
        preferredClass: 'warrior',
        forcedElement: 'fire',
        customName: 'Acemi Alev Kılıcı',
      }),
      offhand: generateEquipmentItem({
        level: 1,
        rarity: 'common',
        slot: 'offhand',
        preferredClass: 'warrior',
        forcedElement: 'physical',
        customName: 'Demir Koruma Kalkanı',
      }),
      chest: generateEquipmentItem({
        level: 1,
        rarity: 'common',
        slot: 'chest',
        preferredClass: 'warrior',
        forcedElement: 'physical',
        customName: 'Asker Plaka Zırhı',
      }),
      helmet: generateEquipmentItem({
        level: 1,
        rarity: 'common',
        slot: 'helmet',
        preferredClass: 'warrior',
        forcedElement: 'physical',
        customName: 'Demir Vizör Miğfer',
      }),
      boots: generateEquipmentItem({
        level: 1,
        rarity: 'common',
        slot: 'boots',
        preferredClass: 'warrior',
        forcedElement: 'physical',
      }),
    };
  }
  if (classId === 'mage') {
    return {
      weapon: generateEquipmentItem({
        level: 1,
        rarity: 'uncommon',
        slot: 'weapon',
        preferredClass: 'mage',
        forcedElement: 'arcane',
        customName: 'Çırak Arkan Asası',
      }),
      offhand: generateEquipmentItem({
        level: 1,
        rarity: 'common',
        slot: 'offhand',
        preferredClass: 'mage',
        forcedElement: 'frost',
        customName: 'Buzul Rün Kitabı',
      }),
      chest: generateEquipmentItem({
        level: 1,
        rarity: 'common',
        slot: 'chest',
        preferredClass: 'mage',
        forcedElement: 'arcane',
        customName: 'Yıldız Dokuma Cübbe',
      }),
      helmet: generateEquipmentItem({
        level: 1,
        rarity: 'common',
        slot: 'helmet',
        preferredClass: 'mage',
        forcedElement: 'arcane',
        customName: 'Bilge Şapkası',
      }),
      boots: generateEquipmentItem({
        level: 1,
        rarity: 'common',
        slot: 'boots',
        preferredClass: 'mage',
        forcedElement: 'frost',
      }),
    };
  }
  if (classId === 'ranger') {
    return {
      weapon: generateEquipmentItem({
        level: 1,
        rarity: 'uncommon',
        slot: 'weapon',
        preferredClass: 'ranger',
        forcedElement: 'lightning',
        customName: 'Hızlı Rüzgar Yayı',
      }),
      offhand: generateEquipmentItem({
        level: 1,
        rarity: 'common',
        slot: 'offhand',
        preferredClass: 'ranger',
        forcedElement: 'nature',
        customName: 'Orman Ok Sadağı',
      }),
      chest: generateEquipmentItem({
        level: 1,
        rarity: 'common',
        slot: 'chest',
        preferredClass: 'ranger',
        forcedElement: 'nature',
        customName: 'İzci Deri Yeleği',
      }),
      helmet: generateEquipmentItem({
        level: 1,
        rarity: 'common',
        slot: 'helmet',
        preferredClass: 'ranger',
        forcedElement: 'nature',
        customName: 'Korucu Başlığı',
      }),
      boots: generateEquipmentItem({
        level: 1,
        rarity: 'common',
        slot: 'boots',
        preferredClass: 'ranger',
        forcedElement: 'lightning',
      }),
    };
  }
  if (classId === 'necromancer') {
    return {
      weapon: generateEquipmentItem({
        level: 1,
        rarity: 'uncommon',
        slot: 'weapon',
        preferredClass: 'necromancer',
        forcedElement: 'arcane',
        customName: 'Çırak Ölüm Tırpanı',
      }),
      offhand: generateEquipmentItem({
        level: 1,
        rarity: 'common',
        slot: 'offhand',
        preferredClass: 'necromancer',
        forcedElement: 'arcane',
        customName: 'Çatlak Ruh Kafatası',
      }),
      chest: generateEquipmentItem({
        level: 1,
        rarity: 'common',
        slot: 'chest',
        preferredClass: 'necromancer',
        forcedElement: 'arcane',
        customName: 'Kemik Dokuma Cübbe',
      }),
      helmet: generateEquipmentItem({
        level: 1,
        rarity: 'common',
        slot: 'helmet',
        preferredClass: 'necromancer',
        forcedElement: 'arcane',
        customName: 'Kuru Kafa Kukuletası',
      }),
      boots: generateEquipmentItem({
        level: 1,
        rarity: 'common',
        slot: 'boots',
        preferredClass: 'necromancer',
        forcedElement: 'nature',
      }),
    };
  }
  if (classId === 'assassin') {
    return {
      weapon: generateEquipmentItem({
        level: 1,
        rarity: 'uncommon',
        slot: 'weapon',
        preferredClass: 'assassin',
        forcedElement: 'physical',
        customName: 'Sessiz Gölge Hançeri',
      }),
      offhand: generateEquipmentItem({
        level: 1,
        rarity: 'common',
        slot: 'offhand',
        preferredClass: 'assassin',
        forcedElement: 'arcane',
        customName: 'Yırtık Gölge Pelerini',
      }),
      chest: generateEquipmentItem({
        level: 1,
        rarity: 'common',
        slot: 'chest',
        preferredClass: 'assassin',
        forcedElement: 'physical',
        customName: 'Gece Deri Yeleği',
      }),
      helmet: generateEquipmentItem({
        level: 1,
        rarity: 'common',
        slot: 'helmet',
        preferredClass: 'assassin',
        forcedElement: 'physical',
        customName: 'Suikastçı Maskesi',
      }),
      boots: generateEquipmentItem({
        level: 1,
        rarity: 'common',
        slot: 'boots',
        preferredClass: 'assassin',
        forcedElement: 'lightning',
      }),
    };
  }
  if (classId === 'stormcaller') {
    return {
      weapon: generateEquipmentItem({
        level: 1,
        rarity: 'uncommon',
        slot: 'weapon',
        preferredClass: 'stormcaller',
        forcedElement: 'lightning',
        customName: 'Yıldırım Mızrağı',
      }),
      offhand: generateEquipmentItem({
        level: 1,
        rarity: 'common',
        slot: 'offhand',
        preferredClass: 'stormcaller',
        forcedElement: 'lightning',
        customName: 'Fırtına Rün Kitabı',
      }),
      chest: generateEquipmentItem({
        level: 1,
        rarity: 'common',
        slot: 'chest',
        preferredClass: 'stormcaller',
        forcedElement: 'frost',
        customName: 'Gök Dokuma Cübbe',
      }),
      helmet: generateEquipmentItem({
        level: 1,
        rarity: 'common',
        slot: 'helmet',
        preferredClass: 'stormcaller',
        forcedElement: 'lightning',
        customName: 'Şimşek Tacı',
      }),
      boots: generateEquipmentItem({
        level: 1,
        rarity: 'common',
        slot: 'boots',
        preferredClass: 'stormcaller',
        forcedElement: 'lightning',
      }),
    };
  }
  if (classId === 'dragonheart') {
    return {
      weapon: generateEquipmentItem({
        level: 1,
        rarity: 'uncommon',
        slot: 'weapon',
        preferredClass: 'dragonheart',
        forcedElement: 'fire',
        customName: 'Ejder Dişi Kılıcı',
      }),
      offhand: generateEquipmentItem({
        level: 1,
        rarity: 'common',
        slot: 'offhand',
        preferredClass: 'dragonheart',
        forcedElement: 'fire',
        customName: 'Ejder Pulu Kalkanı',
      }),
      chest: generateEquipmentItem({
        level: 1,
        rarity: 'common',
        slot: 'chest',
        preferredClass: 'dragonheart',
        forcedElement: 'fire',
        customName: 'Ejder Pulu Zırhı',
      }),
      helmet: generateEquipmentItem({
        level: 1,
        rarity: 'common',
        slot: 'helmet',
        preferredClass: 'dragonheart',
        forcedElement: 'fire',
        customName: 'Boynuzlu Ejder Miğferi',
      }),
      boots: generateEquipmentItem({
        level: 1,
        rarity: 'common',
        slot: 'boots',
        preferredClass: 'dragonheart',
        forcedElement: 'fire',
      }),
    };
  }
  // paladin
  return {
    weapon: generateEquipmentItem({
      level: 1,
      rarity: 'uncommon',
      slot: 'weapon',
      preferredClass: 'paladin',
      forcedElement: 'holy',
      customName: 'Şafak Işığı Kılıcı',
    }),
    offhand: generateEquipmentItem({
      level: 1,
      rarity: 'uncommon',
      slot: 'offhand',
      preferredClass: 'paladin',
      forcedElement: 'holy',
      customName: 'Kutsal Güneş Kalkanı',
    }),
    chest: generateEquipmentItem({
      level: 1,
      rarity: 'common',
      slot: 'chest',
      preferredClass: 'paladin',
      forcedElement: 'holy',
      customName: 'Tapınak Zırhı',
    }),
    helmet: generateEquipmentItem({
      level: 1,
      rarity: 'common',
      slot: 'helmet',
      preferredClass: 'paladin',
      forcedElement: 'holy',
      customName: 'Işık Muhafız Miğferi',
    }),
    boots: generateEquipmentItem({
      level: 1,
      rarity: 'common',
      slot: 'boots',
      preferredClass: 'paladin',
      forcedElement: 'holy',
    }),
  };
}

export function createStarterInventory(): EquipmentItem[] {
  return [
    generateEquipmentItem({
      level: 1,
      rarity: 'rare',
      slot: 'weapon',
      preferredClass: 'warrior',
      forcedElement: 'fire',
      customName: 'Kızıl Kor Savaş Baltası',
      category: 'axe',
    }),
    generateEquipmentItem({
      level: 1,
      rarity: 'rare',
      slot: 'necklace',
      forcedElement: 'arcane',
      customName: 'Kader Yıldızı Kolyesi',
    }),
    generateEquipmentItem({
      level: 1,
      rarity: 'uncommon',
      slot: 'ring1',
      forcedElement: 'nature',
      customName: 'Zümrüt Yaşam Yüzüğü',
    }),
    generateEquipmentItem({
      level: 1,
      rarity: 'uncommon',
      slot: 'gloves',
      preferredClass: 'warrior',
      forcedElement: 'lightning',
    }),
  ];
}
