import type { ActiveSkillDef, HeroClassDef, ImageHeroClassId } from '../types/game';
import { CREATURE_CLASSES, buildTree, type Pick } from './creatureClasses';

/**
 * Görsel tabanlı dört kahraman: Kurt Adam, Vampir, Kocaayak, Gecenin Çığırtkanı.
 * Tüm denge değerleri burada toplanır ve tek yerden ayarlanır (yüzdeler oran olarak yazılır: 0,40 = %40).
 * Kurt Adam ve Vampir önceki yaratık kimliklerini korur (eski kayıtlar, ekipman ve yetenek ağacı yatırımları bozulmaz).
 */
export const IMAGE_HERO_TUNING = {
  werewolf: {
    /** Av İçgüdüsü: her oyuncu turunun ilk 2×2 karesi verir; en fazla */
    chargePerSquare: 1,
    maxCharges: 3,
    /** Pençe Darbesi: saldırı değeri çarpanı; 1 Av yükü varsa harcanır ve çarpan yükselir */
    clawMult: 1.4,
    clawChargedMult: 1.9,
    chargesSpentBySkill: 1,
    /** Dolunay Hücumu: çarpan + harcanan her Av yükü başına ek (saldırı değerinin oranı) */
    ultMult: 2.2,
    ultBonusPerCharge: 0.25,
    skill: { mana: 26, cooldown: 2 },
  },
  vampire: {
    /** Kan Bağı: her oyuncu turunda düşmana verilen ilk doğrudan hasarın oranı; üst sınır = maksimum canın oranı */
    bondHealPct: 0.08,
    bondCapPct: 0.04,
    /** Yakut Kesik */
    slashMult: 1.2,
    slashHealPct: 0.2,
    slashCapPct: 0.08,
    /** Kızıl Düello */
    ultMult: 2.4,
    ultHealPct: 0.3,
    ultCapPct: 0.15,
    skill: { mana: 30, cooldown: 3 },
  },
  bigfoot: {
    /** Sağlam Duruş: savaş başında maksimum canın oranı kadar kalkan */
    startShieldPct: 0.08,
    /** Kaya Siperi */
    skillShieldPct: 0.12,
    /** Orman Sarsıntısı */
    ultMult: 1.8,
    ultShieldPct: 0.15,
    skill: { mana: 32, cooldown: 4 },
  },
  night_screecher: {
    /** Gece Yankısı: savaştaki ilk üç adımlık zincir */
    chainSteps: 3,
    chainUlti: 8,
    /** Yankı Dalgası */
    skillMult: 1.0,
    /** Hilal Çığlığı */
    ultMult: 1.9,
    /** Düşman eylemini geciktirme: tek seferde ve aynı eylem için yetenekler toplamında en fazla */
    delayTurns: 1,
    maxDelayPerAction: 1,
    skill: { mana: 34, cooldown: 3 },
  },
} as const;

const T = IMAGE_HERO_TUNING;
const pct = (v: number) => `%${Math.round(v * 100)}`;

const ult = (id: ImageHeroClassId, name: string, description: string, mult: number, element: ActiveSkillDef['element'], icon: string): ActiveSkillDef => ({
  id: `ult_${id}`,
  name,
  description,
  manaCost: 0,
  ultiCost: 100,
  cooldown: 0,
  element,
  iconKey: icon,
  powerMultiplier: mult,
  effectType: 'ultimate',
});

const skill = (
  id: string,
  classId: ImageHeroClassId,
  name: string,
  description: string,
  cfg: { mana: number; cooldown: number },
  mult: number,
  element: ActiveSkillDef['element'],
  icon: string,
  effectType: ActiveSkillDef['effectType']
): ActiveSkillDef => ({
  id,
  name,
  description,
  manaCost: cfg.mana,
  cooldown: cfg.cooldown,
  element,
  iconKey: icon,
  powerMultiplier: mult,
  effectType,
  levelReq: 5,
  classes: [classId],
  kind: 'class',
});

export const IMAGE_HERO_SKILLS: Record<ImageHeroClassId, ActiveSkillDef[]> = {
  werewolf: [
    skill(
      'wolf_claw_strike',
      'werewolf',
      'Pençe Darbesi',
      `Saldırı değerinin ${pct(T.werewolf.clawMult)}’ı kadar hasar verir. ${T.werewolf.chargesSpentBySkill} Av yükü varsa onu harcar ve hasar ${pct(T.werewolf.clawChargedMult)}’a çıkar.`,
      T.werewolf.skill,
      T.werewolf.clawMult,
      'physical',
      'swords',
      'claw_strike'
    ),
  ],
  vampire: [
    skill(
      'vamp_ruby_slash',
      'vampire',
      'Yakut Kesik',
      `Saldırı değerinin ${pct(T.vampire.slashMult)}’si kadar hasar verir ve verilen hasarın ${pct(T.vampire.slashHealPct)}’i kadar can yeniler (en fazla maksimum canın ${pct(T.vampire.slashCapPct)}’i).`,
      T.vampire.skill,
      T.vampire.slashMult,
      'arcane',
      'sparkles',
      'ruby_slash'
    ),
  ],
  bigfoot: [
    skill(
      'bigfoot_rock_bulwark',
      'bigfoot',
      'Kaya Siperi',
      `Maksimum canının ${pct(T.bigfoot.skillShieldPct)}’si kadar kalkan kazanır.`,
      T.bigfoot.skill,
      T.bigfoot.skillShieldPct,
      'nature',
      'shield',
      'rock_bulwark'
    ),
  ],
  night_screecher: [
    skill(
      'screech_echo_wave',
      'night_screecher',
      'Yankı Dalgası',
      `Saldırı değerinin ${pct(T.night_screecher.skillMult)}’ü kadar hasar verir ve sıradaki düşman eylemini ${T.night_screecher.delayTurns} tur geciktirir (aynı eylem toplamda en fazla ${T.night_screecher.maxDelayPerAction} tur).`,
      T.night_screecher.skill,
      T.night_screecher.skillMult,
      'arcane',
      'sparkles',
      'echo_wave'
    ),
  ],
};

const picksBigfoot: Pick[] = [['thorns', 10], ['nature_heal', 18], ['shield_start', 90], ['thorns', 14]];
const picksScreecher: Pick[] = [['arcane_ulti', 18], ['combo_boost', 14], ['arcane_ulti', 22], ['dodge_counter', 16]];

/** Kurt Adam ve Vampir: mevcut yaratık sınıfı (yetenek ağacı, temel özellikler, ekipman) korunur; kit ve açılış şartı yenilenir. */
const werewolfBase = CREATURE_CLASSES.werewolf;
const vampireBase = CREATURE_CLASSES.vampire;

export const IMAGE_HERO_CLASSES: Record<ImageHeroClassId, HeroClassDef> = {
  werewolf: {
    ...werewolfBase,
    title: 'Ay Pençesi Fenris',
    roleDesc: 'Kare eşleşmeleriyle güçlenen saldırgan.',
    passiveName: 'Av İçgüdüsü',
    passiveDesc: `Her oyuncu turunun ilk 2×2 karesi ${T.werewolf.chargePerSquare} Av yükü verir. En fazla ${T.werewolf.maxCharges} yük birikir.`,
    unlockCost: undefined,
    unlockCondition: { text: 'Büyülü Orman bölgesini tamamla' },
    gemAffinity: undefined,
    innatePassives: undefined,
    ultimateSkill: ult(
      'werewolf',
      'Dolunay Hücumu',
      `Saldırı değerinin ${pct(T.werewolf.ultMult)}’si kadar hasar verir. Tüm Av yüklerini harcar ve yük başına saldırı değerinin ${pct(T.werewolf.ultBonusPerCharge)}’i kadar ek hasar verir.`,
      T.werewolf.ultMult,
      'physical',
      'swords'
    ),
  },
  vampire: {
    ...vampireBase,
    title: 'Kan Kontu Vladis',
    roleDesc: 'Can çalarak ayakta kalan düellocu.',
    passiveName: 'Kan Bağı',
    passiveDesc: `Her oyuncu turunda düşmana verilen ilk doğrudan hasarın ${pct(T.vampire.bondHealPct)}’i kadar can yeniler. Yenileme maksimum canın ${pct(T.vampire.bondCapPct)}’ü ile sınırlıdır.`,
    unlockCost: undefined,
    unlockCondition: { text: 'Dünya Haritası’nda Karanlık Uçurum’un son boss’unu yen' },
    gemAffinity: undefined,
    innatePassives: undefined,
    ultimateSkill: ult(
      'vampire',
      'Kızıl Düello',
      `Saldırı değerinin ${pct(T.vampire.ultMult)}’ı kadar hasar verir ve verilen hasarın ${pct(T.vampire.ultHealPct)}’u kadar can yeniler (en fazla maksimum canın ${pct(T.vampire.ultCapPct)}’i).`,
      T.vampire.ultMult,
      'arcane',
      'sparkles'
    ),
  },
  bigfoot: {
    id: 'bigfoot',
    name: 'Kocaayak',
    title: 'Kristalli Orman Devi',
    roleDesc: 'Ağır saldırılara karşı kalkan kuran savunmacı.',
    passiveName: 'Sağlam Duruş',
    passiveDesc: `Savaşın başında maksimum canının ${pct(T.bigfoot.startShieldPct)}’i kadar kalkan kazanır.`,
    preferredWeapons: ['axe', 'sword'],
    preferredArmor: 'heavy_armor',
    offhandCategory: 'shield',
    themeColor: '#c2410c',
    accentColor: '#f59e0b',
    isCreature: true,
    unlockCondition: { text: 'Köklerin Mahzeni’nin son savaşını kazan' },
    // Savunmacı referansı: Şövalye / Kristal Golem (can ve savunma yüksek, saldırı ve kritik düşük)
    baseStats: { health: 780, attack: 54, defense: 34, critChance: 10, critDamage: 165, mana: 95, dodge: 5, elementalDamage: 10 },
    perLevelStats: { health: 80, attack: 8.4, defense: 6.6, mana: 4, critChance: 0.5, elementalDamage: 1.6 },
    starterGear: {
      weapon: 'Kökten Oyma Gürz',
      offhand: 'Meşe Kabuğu Kalkanı',
      chest: 'Yosunlu Post Zırh',
      helmet: 'Dal Boynuzlu Başlık',
      element: 'nature',
    },
    ultimateSkill: ult(
      'bigfoot',
      'Orman Sarsıntısı',
      `Saldırı değerinin ${pct(T.bigfoot.ultMult)}’i kadar hasar verir ve maksimum canının ${pct(T.bigfoot.ultShieldPct)}’i kadar kalkan kazanır.`,
      T.bigfoot.ultMult,
      'nature',
      'shield'
    ),
    skillTree: buildTree(
      'bigf',
      ['Ağır Yumruk', 'Kök Pençe', 'Orman Gücü', 'Devin Gazabı', 'Yosun Şifası', 'Kaya Kalbi', 'Kadim Bilgelik', 'Yeşil Çağrı', 'Kalın Post', 'Sağlam Duruş', 'Taş Omuz', 'Orman Devi'],
      picksBigfoot
    ),
  },
  night_screecher: {
    id: 'night_screecher',
    name: 'Gecenin Çığırtkanı',
    title: 'Hilal Kanatlı Haberci',
    roleDesc: 'Düşman hamlelerini geciktiren kontrol kahramanı.',
    passiveName: 'Gece Yankısı',
    passiveDesc: `Savaşta yaptığın ilk ${T.night_screecher.chainSteps} adımlık zincirleme eşleşme +${T.night_screecher.chainUlti} ulti enerjisi verir.`,
    preferredWeapons: ['staff', 'dagger'],
    preferredArmor: 'light_armor',
    offhandCategory: 'cloak',
    themeColor: '#a78bfa',
    accentColor: '#c4b5fd',
    isCreature: true,
    unlockCondition: { text: 'Dünya Haritası’nın genel sırasındaki 100. aşamayı tamamla' },
    // Kontrol referansı: Büyücü / Cin (mana ve elemental yüksek, can düşük)
    baseStats: { health: 600, attack: 62, defense: 20, critChance: 16, critDamage: 175, mana: 125, dodge: 12, elementalDamage: 20 },
    perLevelStats: { health: 50, attack: 9.8, defense: 3.4, mana: 6, critChance: 0.8, elementalDamage: 2.4 },
    starterGear: {
      weapon: 'Hilal Uçlu Asa',
      offhand: 'Gece Tüyü Pelerin',
      chest: 'Ay Tozu Cübbe',
      helmet: 'Hilal Taçlı Başlık',
      element: 'arcane',
    },
    ultimateSkill: ult(
      'night_screecher',
      'Hilal Çığlığı',
      `Saldırı değerinin ${pct(T.night_screecher.ultMult)}’u kadar hasar verir ve sıradaki düşman eylemini ${T.night_screecher.delayTurns} tur geciktirir.`,
      T.night_screecher.ultMult,
      'arcane',
      'sparkles'
    ),
    skillTree: buildTree(
      'nigh',
      ['Keskin Çığlık', 'Yankı Ustası', 'Gece Avı', 'Hilal Gazabı', 'Ay Işığı', 'Yankı Dalgası', 'Gece Rüzgârı', 'Sessiz Fırtına', 'Tüy Zırh', 'Gölge Süzülüşü', 'Gece Perdesi', 'Hilal Kalkanı'],
      picksScreecher
    ),
  },
};

export const IMAGE_HERO_IDS = Object.keys(IMAGE_HERO_CLASSES) as ImageHeroClassId[];
export const isImageHero = (id: string): id is ImageHeroClassId => (IMAGE_HERO_IDS as string[]).includes(id);
