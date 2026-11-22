/**
 * Ortak saldırı animasyonları (kahraman ve düşman): saf veri/karar katmanı.
 * Çizim ve zamanlama BattleScene içindedir; burası "hangi animasyon tipi, hangi iz/temas biçimi, ne zaman oynasın" kararını verir.
 *
 * Tipler: silahlı yakın dövüş (kavisli savurma izi), silahsız yakın dövüş (temas efekti), büyü (el ışığı + küçük atış),
 * menzilli silah (geri çekilme + ok/atış izi). Tek parça PNG'ler için hareket yalnızca küçük konum/dönüş değişimidir.
 */

export type AttackAnimType = 'melee_weapon' | 'melee_unarmed' | 'spell' | 'ranged';
/** Silah izi genişliği: kılıç/hançer/mızrak ince, balta/tırpan/çekiç geniş */
export type TrailKind = 'thin' | 'wide';
/** Silahsız temas efekti: insansılarda yumruk, yaratıklarda pençe/ısırık/kıskaç */
export type UnarmedStyle = 'fist' | 'claw' | 'bite' | 'pincer';

export interface AttackProfile {
  type: AttackAnimType;
  trail?: TrailKind;
  style?: UnarmedStyle;
}

/** 1× hızda süreler (ms). `total`: eylemin toplam süresi (geri dönüş dahil), `contact`: temas/atış varış anı. */
export const ATTACK_TIMING: Record<AttackAnimType, { total: number; contact: number }> = {
  melee_weapon: { total: 280, contact: 110 },
  melee_unarmed: { total: 240, contact: 90 },
  spell: { total: 360, contact: 240 },
  ranged: { total: 340, contact: 200 },
};

/** Tip bilgisi eksikse: kısa hamle + temas efekti. */
export const DEFAULT_ATTACK_PROFILE: AttackProfile = { type: 'melee_unarmed', style: 'fist' };

const weapon = (trail: TrailKind): AttackProfile => ({ type: 'melee_weapon', trail });
const unarmed = (style: UnarmedStyle): AttackProfile => ({ type: 'melee_unarmed', style });
const SPELL: AttackProfile = { type: 'spell' };
const RANGED: AttackProfile = { type: 'ranged' };

/** Kahramanın çizimine göre varsayılan saldırı biçimi (çizimdeki silaha/duruşa uyar). */
export const HERO_ATTACK_PROFILE: Readonly<Record<string, AttackProfile>> = {
  warrior: weapon('thin'),
  paladin: weapon('wide'),
  ranger: RANGED,
  mage: SPELL,
  necromancer: SPELL,
  assassin: weapon('thin'),
  stormcaller: SPELL,
  dragonheart: weapon('thin'),
  werewolf: unarmed('claw'),
  vampire: weapon('thin'),
  bigfoot: unarmed('fist'),
  night_screecher: unarmed('claw'),
  fairy: SPELL,
  kitsune: SPELL,
  naga: weapon('thin'),
  siren: SPELL,
  minotaur: weapon('wide'),
  golem: unarmed('fist'),
  phoenix: SPELL,
  djinn: SPELL,
  demon: weapon('wide'),
  seraph: weapon('thin'),
};

const WIDE_WEAPONS = new Set(['axe', 'scythe', 'hammer', 'mace']);

/**
 * Kahramanın temel (taş eşleşmesi) saldırısı. Tipi çizim belirler (çizimde olmayan bir silahla animasyon oynamaz);
 * kuşanılan silahın türü yalnızca yakın dövüş izinin genişliğini seçer (balta/tırpan geniş, kılıç/hançer/mızrak ince).
 */
export function heroAttackProfile(classId: string, weaponCategory?: string | null): AttackProfile {
  const base = HERO_ATTACK_PROFILE[classId] ?? DEFAULT_ATTACK_PROFILE;
  if (base.type === 'melee_weapon' && weaponCategory) {
    return { type: 'melee_weapon', trail: WIDE_WEAPONS.has(weaponCategory) ? 'wide' : 'thin' };
  }
  return base;
}

/** Yeteneğin saldırı tipini belirleyen etkiler. */
const SPELL_EFFECTS = new Set([
  'fireball', 'ice_storm', 'lightning_strike', 'arcane_explosion', 'flame_rain', 'frost_lance', 'thunder_chain', 'venom_bloom',
  'holy_judgement', 'chaos_rift', 'static_field', 'dragon_breath', 'golden_dragon', 'soul_drain', 'echo_wave', 'overcharge',
  'frost_prison', 'chrono_shift',
]);
const RANGED_EFFECTS = new Set(['multi_shot', 'sniper_mark']);

export interface SkillAnimInput {
  /** Yeteneğin kendi animasyon tipi (varsa her şeyden önceliklidir) */
  anim?: AttackAnimType;
  effectType: string;
  fx?: { visual?: string };
}

/**
 * Yeteneğin animasyon tipi: açık `anim` > etki türü (büyü/menzilli/pençe/kesik) > yaratık efektinin görseli > kahramanın temel tipi.
 * Örnek: kılıçlı bir kahraman Ateş Topu atınca büyü animasyonu çıkar.
 */
export function skillAttackProfile(skill: SkillAnimInput, base: AttackProfile): AttackProfile {
  if (skill.anim) return skill.anim === base.type ? base : { type: skill.anim, ...(skill.anim === 'melee_unarmed' ? { style: 'fist' as const } : {}), ...(skill.anim === 'melee_weapon' ? { trail: 'thin' as const } : {}) };
  const e = skill.effectType;
  if (SPELL_EFFECTS.has(e)) return SPELL;
  if (RANGED_EFFECTS.has(e)) return RANGED;
  if (e === 'claw_strike') return unarmed('claw');
  if (e === 'shield_bash') return unarmed('fist');
  if (e === 'ruby_slash' || e === 'backstab' || e === 'shadow_step') return weapon('thin');
  if (e === 'creature') {
    const v = skill.fx?.visual;
    if (v === 'projectile' || v === 'beam' || v === 'bolts') return SPELL;
  }
  return base;
}

export interface EnemyAnimInput {
  name?: string;
  visualArchetype?: string;
  isBoss?: boolean;
}

/** Ad anahtar sözcükleri (küçük harf, Türkçe) — yaratığın saldırı biçimini çizime bakarak seçer. */
const NAME_RULES: ReadonlyArray<[RegExp, AttackProfile]> = [
  [/okçu|nişancı|tüfek/, RANGED],
  [/büyücü|rahip|cadı|ruh|hayalet|güve|yıldız|simyacı|kahin|gökbilimci|kâhin|büyü|ateş ruhu|elementali?/, SPELL],
  [/yenge[çc]|akrep|kıskaç|böcek/, unarmed('pincer')],
  [/kurt|kurd|köpek|köpeğ|fenris|yılan|semender|örümcek|timsah|ejder|kertenkele|tırtıl|yarasa|kuzgun|kartal|kirpi|kalamar|leviathan|avcısı/, unarmed('bite')],
  [/pençe|kedi|aslan|panter|grifon|yeti/, unarmed('claw')],
  [/golem|dev\b|mantar|ağaç|ağac|muhafız|titan|kolos|tahta|taş/, unarmed('fist')],
  [/balta|cellat|savaş lordu|lord|şövalye|general|mızrak|kılıç|hançer|nöbetçi|devriye|gladyatör|muhafızı|zırh/, weapon('wide')],
];

const ARCHETYPE_PROFILE: Readonly<Record<string, AttackProfile>> = {
  goblin: weapon('thin'),
  wolf: unarmed('bite'),
  treant: unarmed('fist'),
  yeti: unarmed('fist'),
  ice_golem: unarmed('fist'),
  salamander: unarmed('bite'),
  fire_elemental: SPELL,
  stone_sentinel: weapon('wide'),
  void_stalker: SPELL,
  celestial: SPELL,
  leviathan: unarmed('bite'),
  pharaoh: SPELL,
  reaper: weapon('wide'),
  warlord: weapon('wide'),
};

/** Eylem türüne göre zorlama: nefes/dondurma büyü, can çalma ısırık. */
const ACTION_PROFILE: Readonly<Record<string, AttackProfile>> = {
  breath: SPELL,
  freeze_tiles: SPELL,
  drain: unarmed('bite'),
};

/**
 * Düşman hamlesinin animasyonu: eylem türü (nefes, dondurma, can çalma) > çizime özel tanım (`art`, havuz çizimleri) >
 * ad anahtar sözcükleri > görsel arketip > varsayılan (kısa hamle + temas).
 */
export function enemyAttackProfile(enemy: EnemyAnimInput, actionKind = 'attack', art?: AttackProfile | null): AttackProfile {
  const forced = ACTION_PROFILE[actionKind];
  if (forced) return forced;
  if (art) return art;
  const name = (enemy.name ?? '').toLocaleLowerCase('tr-TR');
  for (const [re, p] of NAME_RULES) if (name && re.test(name)) return p;
  const arch = enemy.visualArchetype ? ARCHETYPE_PROFILE[enemy.visualArchetype] : undefined;
  return arch ?? DEFAULT_ATTACK_PROFILE;
}

/** Aynı saldırı eyleminin tekrar oynatılmasını engelleyen karar durumu. */
export interface AttackGateState {
  /** Son animasyonu oynatılan eylem kimliği (0 = hiç) */
  lastActionId: number;
  /** Bir animasyon şu anda sürüyor (üst üste binmesin) */
  busy: boolean;
  /** Yetenek kendi pozunu/efektini oynuyor: taş eşleşmesi animasyonu bastırılır */
  skillLock: boolean;
}

/**
 * Hasar kaydı geldiğinde animasyon oynatılsın mı? Aynı eylemin (aynı taş eşleşmesi adımı ya da yetenek) ikinci ve sonraki hasar kayıtları
 * görseli tekrar oynatmaz; sürmekte olan animasyonun üstüne yenisi binmez; yetenek kendi efektiyle çift oynatma yapmaz.
 * `actionId = 0` bağımsız bir eylem demektir (kimlik verilmemiş çağrı).
 */
export function shouldPlayAttackAnim(state: AttackGateState, actionId: number): boolean {
  if (state.skillLock) return false;
  if (actionId > 0 && actionId === state.lastActionId) return false;
  if (state.busy) return false;
  return true;
}
