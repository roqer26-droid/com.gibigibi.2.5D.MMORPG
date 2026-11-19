import {
  ActiveSkillDef,
  EquipmentSlot,
  GemType,
  HeroClassId,
  Rarity,
} from '../types/game';
import type { CoreHeroClassId } from '../types/game';
import { HERO_CLASSES } from './classes';
import { CREATURE_SKILLS } from './creatureClasses';

export const GEM_INFO: Record<
  GemType,
  {
    name: string;
    shortEffect: string;
    description: string;
    colorHex: string;
    glowHex: string;
    badgeBg: string;
  }
> = {
  fire: {
    name: 'Kırmızı Alev Taşı',
    shortEffect: 'Fiziksel/Ateş Hasarı & Öfke',
    description:
      'Güçlü fiziksel ve ateş hasarı verir, alev patlamaları yaratır ve Saldırı gücünü artırır.',
    colorHex: '#ef4444',
    glowHex: '#fb923c',
    badgeBg: 'bg-red-500/20 text-red-300 border-red-500/40',
  },
  frost: {
    name: 'Mavi Buz Taşı',
    shortEffect: 'Mana & Düşman Yavaşlatma',
    description:
      'Mana üretir, büyü yeteneklerini doldurur ve düşmanın saldırısını yavaşlatabilir.',
    colorHex: '#38bdf8',
    glowHex: '#7dd3fc',
    badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  },
  nature: {
    name: 'Yeşil Doğa Taşı',
    shortEffect: 'Can Yenileme & Kalkan',
    description:
      'Kahramanın sağlığını yeniler, yaşam enerjisi yayar ve koruyucu kalkan oluşturur.',
    colorHex: '#22c55e',
    glowHex: '#86efac',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  lightning: {
    name: 'Sarı Yıldırım Taşı',
    shortEffect: 'Hızlı Hasar & Kombo Enerjisi',
    description:
      'Hızlı yıldırım hasarı vurur, kombo çarpanını güçlendirir ve zincir saldırı şansı sağlar.',
    colorHex: '#facc15',
    glowHex: '#fef08a',
    badgeBg: 'bg-yellow-500/20 text-yellow-200 border-yellow-500/40',
  },
  arcane: {
    name: 'Mor Arkan Taşı',
    shortEffect: 'Ulti Şarjı & Büyü Hasarı',
    description:
      'Ulti yeteneğini hızla şarj eder, zırh delen büyü hasarı verir ve özel etkiler tetikler.',
    colorHex: '#a855f7',
    glowHex: '#d8b4fe',
    badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  },
  golden: {
    name: 'Altın Efsanevi Taş',
    shortEffect: 'Tüm Kaynaklar & Mega Bonus',
    description:
      'Nadir özel taş! Yüksek hasar, Mana, Kalkan, Altın ve ekstra Ulti enerjisi kazandırır.',
    colorHex: '#f59e0b',
    glowHex: '#fde047',
    badgeBg: 'bg-amber-500/25 text-amber-200 border-amber-400/60',
  },
};

export const RARITY_META: Record<
  Rarity,
  {
    label: string;
    color: string;
    textClass: string;
    borderClass: string;
    bgClass: string;
    multiplier: number;
    rank: number;
  }
> = {
  common: {
    label: 'Sıradan',
    color: '#94a3b8',
    textClass: 'text-slate-300',
    borderClass: 'rarity-common',
    bgClass: 'bg-slate-800/70',
    multiplier: 1.0,
    rank: 1,
  },
  uncommon: {
    label: 'Sıra Dışı',
    color: '#22c55e',
    textClass: 'text-emerald-400',
    borderClass: 'rarity-uncommon',
    bgClass: 'bg-emerald-950/40',
    multiplier: 1.3,
    rank: 2,
  },
  rare: {
    label: 'Nadir',
    color: '#3b82f6',
    textClass: 'text-blue-400',
    borderClass: 'rarity-rare',
    bgClass: 'bg-blue-950/45',
    multiplier: 1.7,
    rank: 3,
  },
  epic: {
    label: 'Destansı',
    color: '#a855f7',
    textClass: 'text-purple-400',
    borderClass: 'rarity-epic',
    bgClass: 'bg-purple-950/50',
    multiplier: 2.25,
    rank: 4,
  },
  legendary: {
    label: 'Efsanevi',
    color: '#f59e0b',
    textClass: 'text-amber-400',
    borderClass: 'rarity-legendary',
    bgClass: 'bg-amber-950/45',
    multiplier: 3.1,
    rank: 5,
  },
  mythic: {
    label: 'Mitik',
    color: '#f43f5e',
    textClass: 'text-rose-400',
    borderClass: 'rarity-mythic',
    bgClass: 'bg-rose-950/50',
    multiplier: 4.3,
    rank: 6,
  },
};

export const SLOT_LABELS: Record<EquipmentSlot, string> = {
  helmet: 'Miğfer',
  chest: 'Göğüs Zırhı',
  gloves: 'Eldiven',
  pants: 'Pantolon',
  boots: 'Çizme',
  weapon: 'Ana Silah',
  offhand: 'İkinci El',
  necklace: 'Kolye',
  ring1: 'Yüzük 1',
  ring2: 'Yüzük 2',
};

/* ------------------------------------------------------------------ */
/*  ELEMENTAL SKILLS — Tüm sınıflar kullanır, seviye ile açılır        */
/* ------------------------------------------------------------------ */
export const ACTIVE_SKILLS: ActiveSkillDef[] = [
  {
    id: 'fireball',
    name: 'Ateş Topu',
    description: 'Düşmana devasa bir alev topu fırlatarak %210 Ateş hasarı verir ve 2 tur yakar.',
    manaCost: 28,
    cooldown: 2,
    element: 'fire',
    iconKey: 'flame',
    powerMultiplier: 2.1,
    effectType: 'fireball',
    levelReq: 1,
    kind: 'elemental',
  },
  {
    id: 'natures_blessing',
    name: 'Doğanın Lütfu',
    description: 'Maksimum canın %28’ini iyileştirir ve güçlü bir Doğa Kalkanı oluşturur.',
    manaCost: 26,
    cooldown: 3,
    element: 'nature',
    iconKey: 'leaf',
    powerMultiplier: 0.28,
    effectType: 'natures_blessing',
    levelReq: 1,
    kind: 'elemental',
  },
  {
    id: 'ice_storm',
    name: 'Buz Fırtınası',
    description: 'Düşmanı dondurarak saldırısını 2 tur geciktirir ve %165 Buz hasarı verir.',
    manaCost: 34,
    cooldown: 3,
    element: 'frost',
    iconKey: 'snowflake',
    powerMultiplier: 1.65,
    effectType: 'ice_storm',
    levelReq: 2,
    kind: 'elemental',
  },
  {
    id: 'lightning_strike',
    name: 'Yıldırım Darbesi',
    description:
      'Gökten yıldırım indirir (%185 Hasar) ve tahtada 4 rastgele taşı patlatarak zincir kombo başlatır.',
    manaCost: 32,
    cooldown: 2,
    element: 'lightning',
    iconKey: 'zap',
    powerMultiplier: 1.85,
    effectType: 'lightning_strike',
    levelReq: 3,
    kind: 'elemental',
  },
  {
    id: 'arcane_explosion',
    name: 'Arkan Patlama',
    description:
      'Zırhın %60’ını delen Arkan patlama (%245 Hasar) yaratır ve 3 taşı Altın/Arkan yapar.',
    manaCost: 44,
    cooldown: 3,
    element: 'arcane',
    iconKey: 'sparkles',
    powerMultiplier: 2.45,
    effectType: 'arcane_explosion',
    levelReq: 5,
    kind: 'elemental',
  },
  {
    id: 'flame_rain',
    name: 'Alev Yağmuru',
    description:
      'Gökyüzünden 5 alev topu yağdırır (%220 Hasar) ve düşmanı 3 tur boyunca yakar.',
    manaCost: 40,
    cooldown: 3,
    element: 'fire',
    iconKey: 'flame',
    powerMultiplier: 2.2,
    effectType: 'flame_rain',
    levelReq: 7,
    kind: 'elemental',
  },
  {
    id: 'frost_lance',
    name: 'Buz Mızrağı',
    description:
      'Zırhı tamamen delen dev buz mızrağı (%190 Hasar) fırlatır ve 1 tur dondurur.',
    manaCost: 30,
    cooldown: 2,
    element: 'frost',
    iconKey: 'snowflake',
    powerMultiplier: 1.9,
    effectType: 'frost_lance',
    levelReq: 9,
    kind: 'elemental',
  },
  {
    id: 'stone_bulwark',
    name: 'Taş Siperi',
    description:
      'Maksimum canın %30’u kadar kaya kalkanı oluşturur ve tahtadaki 3 taşı Doğa taşına çevirir.',
    manaCost: 36,
    cooldown: 3,
    element: 'nature',
    iconKey: 'shield',
    powerMultiplier: 0.3,
    effectType: 'stone_bulwark',
    levelReq: 11,
    kind: 'elemental',
  },
  {
    id: 'thunder_chain',
    name: 'Zincir Yıldırım',
    description:
      'Düşmana zincirleme yıldırım (%230 Hasar) vurur, tahtada rastgele bir satır ve sütunu yok eder.',
    manaCost: 48,
    cooldown: 3,
    element: 'lightning',
    iconKey: 'zap',
    powerMultiplier: 2.3,
    effectType: 'thunder_chain',
    levelReq: 13,
    kind: 'elemental',
  },
  {
    id: 'venom_bloom',
    name: 'Zehir Çiçeği',
    description:
      'Düşmana zehirli sporlar saçarak %140 hasar verir ve 4 tur boyunca zehirler (tur başına Saldırı %80 hasar).',
    manaCost: 38,
    cooldown: 3,
    element: 'nature',
    iconKey: 'leaf',
    powerMultiplier: 1.4,
    effectType: 'venom_bloom',
    levelReq: 15,
    kind: 'elemental',
  },
  {
    id: 'holy_judgement',
    name: 'Kutsal Yargı',
    description:
      'Düşmanın direncini tamamen yok sayan kutsal ışık (%260 Hasar) indirir ve canın %10’unu yeniler.',
    manaCost: 50,
    cooldown: 4,
    element: 'holy',
    iconKey: 'sparkles',
    powerMultiplier: 2.6,
    effectType: 'holy_judgement',
    levelReq: 18,
    kind: 'elemental',
  },
  {
    id: 'shadow_step',
    name: 'Gölge Adımı',
    description:
      'Gölgeye karışıp düşmanın arkasına geçerek %120 hasar verir. TUR HARCANMAZ — hemen tekrar eşleştirebilirsin!',
    manaCost: 34,
    cooldown: 4,
    element: 'arcane',
    iconKey: 'sparkles',
    powerMultiplier: 1.2,
    effectType: 'shadow_step',
    levelReq: 21,
    grantsExtraTurn: true,
    kind: 'elemental',
  },
  {
    id: 'golden_dragon',
    name: 'Altın Ejderha',
    description:
      'Altın bir ejderha çağırır (%340 Hasar), 30 Mana ve %20 Can kadar kalkan kazandırır.',
    manaCost: 90,
    cooldown: 6,
    element: 'holy',
    iconKey: 'flame',
    powerMultiplier: 3.4,
    effectType: 'golden_dragon',
    levelReq: 24,
    kind: 'elemental',
  },
  {
    id: 'chrono_shift',
    name: 'Zaman Kayması',
    description:
      'Zamanı büker: düşmanı 2 tur dondurur, 6 taşı patlatır ve TUR HARCANMAZ.',
    manaCost: 60,
    cooldown: 5,
    element: 'arcane',
    iconKey: 'sparkles',
    powerMultiplier: 1.0,
    effectType: 'chrono_shift',
    levelReq: 28,
    grantsExtraTurn: true,
    kind: 'elemental',
  },
  {
    id: 'war_cry',
    name: 'Savaş Narası',
    description:
      'Tüm yetenek bekleme sürelerini sıfırlar, +5 Öfke biriktirir ve %200 hasar verir. TUR HARCANMAZ.',
    manaCost: 70,
    cooldown: 6,
    element: 'physical',
    iconKey: 'shield',
    powerMultiplier: 2.0,
    effectType: 'war_cry',
    levelReq: 32,
    grantsExtraTurn: true,
    kind: 'elemental',
  },
  {
    id: 'chaos_rift',
    name: 'Kaos Yırtığı',
    description:
      'Gerçekliği yırtarak zırh delen %400 hasar verir ve 6 taşı Altın/Arkan taşa dönüştürür.',
    manaCost: 110,
    cooldown: 7,
    element: 'arcane',
    iconKey: 'sparkles',
    powerMultiplier: 4.0,
    effectType: 'chaos_rift',
    levelReq: 36,
    kind: 'elemental',
  },
];

/* ------------------------------------------------------------------ */
/*  CLASS SKILLS — Sınıfa özgü imza yetenekleri                        */
/* ------------------------------------------------------------------ */
const CORE_CLASS_SKILLS: Record<CoreHeroClassId, ActiveSkillDef[]> = {
  warrior: [
    {
      id: 'shield_bash',
      name: 'Kalkan Çarpması',
      description:
        'Kalkanla düşmanı sersemleterek %150 hasar verir ve düşmanın saldırı sayacını 1 tur geri atar.',
      manaCost: 24,
      cooldown: 3,
      element: 'physical',
      iconKey: 'shield',
      powerMultiplier: 1.5,
      effectType: 'shield_bash',
      levelReq: 10,
      classes: ['warrior'],
      kind: 'class',
    },
    {
      id: 'berserk',
      name: 'Çılgınlık',
      description:
        'Kana susamışlık! %280 hasar verir, +4 Öfke biriktirir ama maksimum canın %8’ini kaybettirir.',
      manaCost: 40,
      cooldown: 5,
      element: 'fire',
      iconKey: 'flame',
      powerMultiplier: 2.8,
      effectType: 'berserk',
      levelReq: 20,
      classes: ['warrior'],
      kind: 'class',
    },
  ],
  mage: [
    {
      id: 'mana_surge',
      name: 'Mana Akışı',
      description:
        'Mana havuzunun %60’ını anında geri doldurur ve %130 Arkan hasar verir.',
      manaCost: 10,
      cooldown: 4,
      element: 'frost',
      iconKey: 'snowflake',
      powerMultiplier: 1.3,
      effectType: 'mana_surge',
      levelReq: 10,
      classes: ['mage'],
      kind: 'class',
    },
    {
      id: 'frost_prison',
      name: 'Buz Zindanı',
      description:
        'Düşmanı 3 tur buz zindanına hapseder, %180 hasar verir ve 5 taşı Buz taşına çevirir.',
      manaCost: 55,
      cooldown: 5,
      element: 'frost',
      iconKey: 'snowflake',
      powerMultiplier: 1.8,
      effectType: 'frost_prison',
      levelReq: 20,
      classes: ['mage'],
      kind: 'class',
    },
  ],
  ranger: [
    {
      id: 'multi_shot',
      name: 'Çoklu Atış',
      description:
        'Aynı anda 3 ok fırlatır; her ok %85 hasar verir ve kritik vurma şansı yüksektir.',
      manaCost: 26,
      cooldown: 3,
      element: 'lightning',
      iconKey: 'zap',
      powerMultiplier: 0.85,
      effectType: 'multi_shot',
      levelReq: 10,
      classes: ['ranger'],
      kind: 'class',
    },
    {
      id: 'sniper_mark',
      name: 'Nişancı İzi',
      description:
        'Düşmanı işaretler: %300 hasar verir ve 2 tur boyunca tüm saldırıların GARANTİ kritik olur.',
      manaCost: 45,
      cooldown: 5,
      element: 'lightning',
      iconKey: 'zap',
      powerMultiplier: 3.0,
      effectType: 'sniper_mark',
      levelReq: 20,
      classes: ['ranger'],
      kind: 'class',
    },
  ],
  paladin: [
    {
      id: 'holy_shield',
      name: 'Kutsal Kalkan',
      description:
        'Maksimum canın %28’i kadar kutsal kalkan oluşturur ve %12 Can yeniler.',
      manaCost: 30,
      cooldown: 3,
      element: 'holy',
      iconKey: 'shield',
      powerMultiplier: 0.28,
      effectType: 'holy_shield',
      levelReq: 10,
      classes: ['paladin'],
      kind: 'class',
    },
    {
      id: 'divine_heal',
      name: 'İlahi Şifa',
      description:
        'Maksimum canın %45’ini yeniler, %30 kalkan verir ve 25 Ulti enerjisi kazandırır.',
      manaCost: 60,
      cooldown: 6,
      element: 'holy',
      iconKey: 'leaf',
      powerMultiplier: 0.45,
      effectType: 'divine_heal',
      levelReq: 20,
      classes: ['paladin'],
      kind: 'class',
    },
  ],

  necromancer: [
    {
      id: 'soul_drain',
      name: 'Ruh Emişi',
      description:
        'Düşmanın ruhunu emerek %175 hasar verir ve verilen hasarın %60’ını Can olarak çalar.',
      manaCost: 32,
      cooldown: 3,
      element: 'arcane',
      iconKey: 'sparkles',
      powerMultiplier: 1.75,
      effectType: 'soul_drain',
      levelReq: 10,
      classes: ['necromancer'],
      kind: 'class',
    },
    {
      id: 'raise_dead',
      name: 'Ölüleri Kaldır',
      description:
        '3 tur boyunca her tur saldıran bir İskelet Ordusu çağırır (%90 hasar) ve 3 taşı Arkan yapar.',
      manaCost: 52,
      cooldown: 5,
      element: 'arcane',
      iconKey: 'sparkles',
      powerMultiplier: 0.9,
      effectType: 'raise_dead',
      levelReq: 20,
      classes: ['necromancer'],
      kind: 'class',
    },
  ],

  assassin: [
    {
      id: 'backstab',
      name: 'Sırt Bıçaklaması',
      description:
        'Gölgeden saldırarak GARANTİ kritik %240 hasar verir ve düşmanı 2 tur kanatır.',
      manaCost: 28,
      cooldown: 2,
      element: 'physical',
      iconKey: 'swords',
      powerMultiplier: 2.4,
      effectType: 'backstab',
      levelReq: 10,
      classes: ['assassin'],
      kind: 'class',
    },
    {
      id: 'smoke_bomb',
      name: 'Duman Bombası',
      description:
        'Dumana karışır: 2 tur +%45 Sıyrılma, %110 hasar ve TUR HARCANMAZ. 3 taşı Yıldırım yapar.',
      manaCost: 36,
      cooldown: 4,
      element: 'arcane',
      iconKey: 'sparkles',
      powerMultiplier: 1.1,
      effectType: 'smoke_bomb',
      levelReq: 20,
      classes: ['assassin'],
      grantsExtraTurn: true,
      kind: 'class',
    },
  ],

  stormcaller: [
    {
      id: 'overcharge',
      name: 'Aşırı Yük',
      description:
        'Biriktirdiğin Manayı yıldırıma çevirir: %220 hasar + mevcut mananın %40’ı kadar ek hasar.',
      manaCost: 30,
      cooldown: 3,
      element: 'lightning',
      iconKey: 'zap',
      powerMultiplier: 2.2,
      effectType: 'overcharge',
      levelReq: 10,
      classes: ['stormcaller'],
      kind: 'class',
    },
    {
      id: 'static_field',
      name: 'Statik Alan',
      description:
        'Düşmanı elektrik alanına hapseder: %160 hasar, 1 tur SERSEMLETME ve tahtada rastgele bir satırı yok eder.',
      manaCost: 55,
      cooldown: 5,
      element: 'lightning',
      iconKey: 'zap',
      powerMultiplier: 1.6,
      effectType: 'static_field',
      levelReq: 20,
      classes: ['stormcaller'],
      kind: 'class',
    },
  ],

  dragonheart: [
    {
      id: 'dragon_breath',
      name: 'Ejderha Nefesi',
      description:
        'Konik alev püskürtür: %230 Ateş hasarı ve 3 tur yakma. Ejder Formu’ndayken hasar iki katına çıkar.',
      manaCost: 34,
      cooldown: 3,
      element: 'fire',
      iconKey: 'flame',
      powerMultiplier: 2.3,
      effectType: 'dragon_breath',
      levelReq: 10,
      classes: ['dragonheart'],
      kind: 'class',
    },
    {
      id: 'dragon_form',
      name: 'Ejder Formu',
      description:
        '3 tur boyunca ejderhaya dönüşür: tüm hasar +%60, %25 Can kadar kalkan ve tahtada 3 taş Alev olur.',
      manaCost: 70,
      cooldown: 7,
      element: 'fire',
      iconKey: 'flame',
      powerMultiplier: 1.5,
      effectType: 'dragon_form',
      levelReq: 20,
      classes: ['dragonheart'],
      kind: 'class',
    },
  ],
};

/** Tüm sınıfların imza yetenekleri (çekirdek + yaratıklar) */
export const CLASS_SKILLS = { ...CORE_CLASS_SKILLS, ...CREATURE_SKILLS } as Record<
  HeroClassId,
  ActiveSkillDef[]
>;

/** Savaşta kullanılabilir yetenek listesi (sınıf + seviyeye göre açılanlar) */
export function getSkillLoadout(classId: HeroClassId, heroLevel: number): ActiveSkillDef[] {
  const classSkills = CLASS_SKILLS[classId] ?? [];
  const pool = [...classSkills, ...ACTIVE_SKILLS]
    .filter((s) => (s.levelReq ?? 1) <= heroLevel)
    .sort((a, b) => (a.levelReq ?? 1) - (b.levelReq ?? 1));
  return pool;
}

/** Yetenek ekranı için tüm kilitli/açık yetenek listesi */
export function getFullSkillCodex(classId: HeroClassId): ActiveSkillDef[] {
  return [...(CLASS_SKILLS[classId] ?? []), ...ACTIVE_SKILLS].sort(
    (a, b) => (a.levelReq ?? 1) - (b.levelReq ?? 1)
  );
}

export function getUltimateFor(classId: HeroClassId): ActiveSkillDef {
  return HERO_CLASSES[classId].ultimateSkill;
}

export const SKILL_ICON_LABELS: Record<string, string> = {
  flame: '🔥',
  snowflake: '❄️',
  zap: '⚡',
  leaf: '🌿',
  sparkles: '✨',
  shield: '🛡️',
  swords: '⚔️',
};
