import type {
  ElementType,
  EquipmentItem,
  EquipmentSetId,
  EquipmentSlot,
  GemType,
  RegionId,
} from '../types/game';

/**
 * Ekipman setleri: tüm sayılar bu dosyadaki set verisindedir (denge ayarı için tek yer).
 * Bonuslar aynı setten KUŞANILMIŞ parça sayısına göre açılır: 2 parça ve 4 parça (4 parçada ikisi birlikte).
 */

/** Set parçası olabilen yuvalar: kask, göğüslük, eldiven, çizme. */
export const SET_SLOTS = ['helmet', 'chest', 'gloves', 'boots'] as const;
export type SetSlot = (typeof SET_SLOTS)[number];

/** Set bölgesinde düşmesi kesinleşen uygun ekipmanın set parçası olma ihtimali (başlangıç değeri). */
export const SET_DROP_CHANCE = 0.2;

export type SetEffect =
  | { kind: 'fire_damage_pct'; value: number } // ateş taşı hasarı +%
  | { kind: 'frost_mana_pct'; value: number } // buz taşından mana +%
  | { kind: 'nature_heal_pct'; value: number } // doğa taşından iyileştirme +%
  | { kind: 'first_fire_ulti'; value: number } // turun ilk ateş eşleşmesi: +ulti
  | { kind: 'first_square_shield'; pctOfMaxHp: number; capPctOfMaxHp: number } // turun ilk karesi: kalkan
  | { kind: 'first_nature_cooldown'; turns: number }; // turun ilk doğa eşleşmesi: bekleme -tur

export interface SetBonus {
  /** Gereken kuşanılmış parça sayısı */
  pieces: 2 | 4;
  effect: SetEffect;
}

export interface EquipmentSetDef {
  id: EquipmentSetId;
  name: string;
  /** Rozetlerde kısa ad */
  shortName: string;
  element: ElementType;
  /** Parçalarının düştüğü bölge */
  regionId: RegionId;
  regionName: string;
  icon: 'flame' | 'crystal' | 'leaf';
  color: string;
  secondary: string;
  glow: string;
  pieceNames: Record<SetSlot, string>;
  bonuses: [SetBonus, SetBonus];
}

export const EQUIPMENT_SETS: EquipmentSetDef[] = [
  {
    id: 'ember',
    name: 'Köz Seti',
    shortName: 'Köz',
    element: 'fire',
    regionId: 'volcano',
    regionName: 'Volkanik Topraklar',
    icon: 'flame',
    color: '#9a3412',
    secondary: '#fdba74',
    glow: '#fb923c',
    pieceNames: { helmet: 'Köz Miğferi', chest: 'Köz Göğüslüğü', gloves: 'Köz Eldivenleri', boots: 'Köz Çizmeleri' },
    bonuses: [
      { pieces: 2, effect: { kind: 'fire_damage_pct', value: 10 } },
      { pieces: 4, effect: { kind: 'first_fire_ulti', value: 5 } },
    ],
  },
  {
    id: 'glacier',
    name: 'Buzul Seti',
    shortName: 'Buzul',
    element: 'frost',
    regionId: 'mountains',
    regionName: 'Donmuş Dağlar',
    icon: 'crystal',
    color: '#0e7490',
    secondary: '#bae6fd',
    glow: '#38bdf8',
    pieceNames: { helmet: 'Buzul Miğferi', chest: 'Buzul Göğüslüğü', gloves: 'Buzul Eldivenleri', boots: 'Buzul Çizmeleri' },
    bonuses: [
      { pieces: 2, effect: { kind: 'frost_mana_pct', value: 10 } },
      { pieces: 4, effect: { kind: 'first_square_shield', pctOfMaxHp: 5, capPctOfMaxHp: 15 } },
    ],
  },
  {
    id: 'life',
    name: 'Yaşam Seti',
    shortName: 'Yaşam',
    element: 'nature',
    regionId: 'forest',
    regionName: 'Büyülü Orman',
    icon: 'leaf',
    color: '#166534',
    secondary: '#bbf7d0',
    glow: '#4ade80',
    pieceNames: { helmet: 'Yaşam Miğferi', chest: 'Yaşam Göğüslüğü', gloves: 'Yaşam Eldivenleri', boots: 'Yaşam Çizmeleri' },
    bonuses: [
      { pieces: 2, effect: { kind: 'nature_heal_pct', value: 10 } },
      { pieces: 4, effect: { kind: 'first_nature_cooldown', turns: 1 } },
    ],
  },
];

export const SET_IDS: EquipmentSetId[] = EQUIPMENT_SETS.map((s) => s.id);

export function getSet(id: EquipmentSetId): EquipmentSetDef {
  return EQUIPMENT_SETS.find((s) => s.id === id)!;
}

export function setForRegion(regionId: RegionId): EquipmentSetDef | undefined {
  return EQUIPMENT_SETS.find((s) => s.regionId === regionId);
}

export function isSetSlot(slot: string): slot is SetSlot {
  return (SET_SLOTS as readonly string[]).includes(slot);
}

/** Bonus açıklaması (metin, değerlerden üretilir: veriyi değiştirince metin de güncellenir). */
export function describeEffect(effect: SetEffect): string {
  switch (effect.kind) {
    case 'fire_damage_pct':
      return `Ateş taşlarının verdiği hasar +%${effect.value}`;
    case 'frost_mana_pct':
      return `Buz taşlarından kazanılan mana +%${effect.value}`;
    case 'nature_heal_pct':
      return `Doğa taşlarından gelen iyileştirme +%${effect.value}`;
    case 'first_fire_ulti':
      return `Her oyuncu turunun ilk ateş eşleşmesi +${effect.value} ulti enerjisi verir`;
    case 'first_square_shield':
      return `Her oyuncu turunun ilk 2×2 kare eşleşmesi maksimum canın %${effect.pctOfMaxHp}’i kadar kalkan verir (bu bonustan en fazla %${effect.capPctOfMaxHp})`;
    case 'first_nature_cooldown':
      return `Her oyuncu turunun ilk doğa eşleşmesi, bekleme süresi en yüksek yeteneğin süresini ${effect.turns} tur azaltır`;
  }
}

// ---------------------------------------------------------------------------
// Sayım ve bonus hesabı (kuşanılmış ekipmandan)
// ---------------------------------------------------------------------------

export type EquippedMap = Partial<Record<EquipmentSlot, EquipmentItem>>;

/** Kuşanılmış ekipmandaki set parçası sayıları. Yalnızca set yuvalarındaki, geçerli set kimlikli eşyalar sayılır. */
export function countEquippedSets(equipped: EquippedMap): Partial<Record<EquipmentSetId, number>> {
  const counts: Partial<Record<EquipmentSetId, number>> = {};
  for (const slot of SET_SLOTS) {
    const id = equipped[slot]?.setId;
    if (id && SET_IDS.includes(id)) counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}

export interface SetProgress {
  def: EquipmentSetDef;
  /** Kuşanılmış parça sayısı (0-4) */
  count: number;
  twoActive: boolean;
  fourActive: boolean;
}

export function progressFor(def: EquipmentSetDef, count: number): SetProgress {
  return { def, count, twoActive: count >= 2, fourActive: count >= 4 };
}

/** Tüm setlerin durumu (parçası olmayanlar dahil), set veri sırasıyla. */
export function getAllSetProgress(equipped: EquippedMap): SetProgress[] {
  const counts = countEquippedSets(equipped);
  return EQUIPMENT_SETS.map((def) => progressFor(def, counts[def.id] ?? 0));
}

/** Yalnızca en az bir parçası kuşanılmış setler. */
export function getEquippedSetProgress(equipped: EquippedMap): SetProgress[] {
  return getAllSetProgress(equipped).filter((p) => p.count > 0);
}

/** Savaşta/karakter özelliklerinde kullanılan toplam set etkileri. */
export interface SetEffects {
  fireDmgPct: number;
  frostManaPct: number;
  natureHealPct: number;
  firstFireUlti: number;
  squareShieldPct: number;
  squareShieldCapPct: number;
  natureCooldownReduce: number;
}

export function emptySetEffects(): SetEffects {
  return {
    fireDmgPct: 0,
    frostManaPct: 0,
    natureHealPct: 0,
    firstFireUlti: 0,
    squareShieldPct: 0,
    squareShieldCapPct: 0,
    natureCooldownReduce: 0,
  };
}

function addEffect(out: SetEffects, e: SetEffect) {
  switch (e.kind) {
    case 'fire_damage_pct':
      out.fireDmgPct += e.value;
      break;
    case 'frost_mana_pct':
      out.frostManaPct += e.value;
      break;
    case 'nature_heal_pct':
      out.natureHealPct += e.value;
      break;
    case 'first_fire_ulti':
      out.firstFireUlti += e.value;
      break;
    case 'first_square_shield':
      out.squareShieldPct += e.pctOfMaxHp;
      out.squareShieldCapPct = Math.max(out.squareShieldCapPct, e.capPctOfMaxHp);
      break;
    case 'first_nature_cooldown':
      out.natureCooldownReduce += e.turns;
      break;
  }
}

/** Kuşanılmış parça sayılarına göre açılan tüm bonusların toplamı (4 parçada 2 ve 4 parça bonusu birlikte). */
export function computeSetEffects(equipped: EquippedMap): SetEffects {
  const out = emptySetEffects();
  for (const p of getAllSetProgress(equipped)) {
    for (const b of p.def.bonuses) {
      if (p.count >= b.pieces) addEffect(out, b.effect);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Ekipman değişiminde set farkı (karşılaştırma)
// ---------------------------------------------------------------------------

export interface SetDiff {
  def: EquipmentSetDef;
  before: number;
  after: number;
  /** Kazanılacak bonuslar (2 / 4 parça) */
  gained: (2 | 4)[];
  /** Kaybedilecek bonuslar */
  lost: (2 | 4)[];
}

/**
 * `incoming` eşyası `slot` yuvasına kuşanılırsa (null: yuva boşaltılırsa) set parça sayıları ve
 * bonuslar nasıl değişir? Yalnızca sayısı değişen setler döner.
 */
export function diffSetsOnEquip(equipped: EquippedMap, slot: EquipmentSlot, incoming: EquipmentItem | null): SetDiff[] {
  const before = countEquippedSets(equipped);
  const next: EquippedMap = { ...equipped };
  if (incoming) next[slot] = { ...incoming, slot };
  else delete next[slot];
  const after = countEquippedSets(next);
  const out: SetDiff[] = [];
  for (const def of EQUIPMENT_SETS) {
    const b = before[def.id] ?? 0;
    const a = after[def.id] ?? 0;
    if (a === b) continue;
    const gained: (2 | 4)[] = [];
    const lost: (2 | 4)[] = [];
    for (const bonus of def.bonuses) {
      if (a >= bonus.pieces && b < bonus.pieces) gained.push(bonus.pieces);
      if (a < bonus.pieces && b >= bonus.pieces) lost.push(bonus.pieces);
    }
    out.push({ def, before: b, after: a, gained, lost });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Düşme: set bölgesinde uygun eşyanın set parçası olması
// ---------------------------------------------------------------------------

/** Eşyayı set parçası yapar: ad, set kimliği ve set renkleri. Temel özellikler `item`dan gelir. */
export function applySetIdentity(item: EquipmentItem, set: EquipmentSetDef): EquipmentItem {
  const slot = item.slot as SetSlot;
  return {
    ...item,
    setId: set.id,
    name: set.pieceNames[slot],
    description: `${set.name} parçası. 2 ve 4 parça kuşanınca set bonusları açılır.`,
    visual: { ...item.visual, primaryColor: set.color, secondaryColor: set.secondary, glowColor: set.glow },
  };
}

/**
 * Düşmesi kesinleşen eşya set bölgesinden geliyorsa ve yuvası uygunsa `chance` olasılıkla set parçasına çevrilir.
 * Eşyanın düşüp düşmeyeceği (mevcut düşme ihtimali) bu fonksiyondan ÖNCE belirlenir; burada değişmez.
 * `make`: aynı seviye/nadirlikte, verilen yuva ve elementte yeni eşya üretir (mevcut üretim kuralları).
 */
export function rollSetDrop(
  item: EquipmentItem,
  regionId: RegionId,
  make: (opts: { slot: EquipmentSlot; element: ElementType }) => EquipmentItem,
  rand: () => number = Math.random,
  chance: number = SET_DROP_CHANCE
): EquipmentItem {
  const set = setForRegion(regionId);
  if (!set || !isSetSlot(item.slot)) return item;
  if (rand() >= chance) return item;
  return applySetIdentity(make({ slot: item.slot, element: set.element }), set);
}

// ---------------------------------------------------------------------------
// Turun ilk eşleşmesi bonusları (gerçek oyuncu turuna bağlı kullanım bilgisi)
// ---------------------------------------------------------------------------

export interface SetTurnFlags {
  fireUlti: boolean;
  squareShield: boolean;
  natureCooldown: boolean;
}

export const freshSetFlags = (): SetTurnFlags => ({ fireUlti: false, squareShield: false, natureCooldown: false });

/** Bekleme süresi en yüksek (>0) normal yetenek; eşitlikte `order` sırası. Hiçbiri beklemede değilse null. */
export function pickCooldownTarget(cooldowns: Record<string, number>, order: string[]): string | null {
  let best: string | null = null;
  let bestCd = 0;
  const ids = [...order, ...Object.keys(cooldowns).filter((id) => !order.includes(id))];
  for (const id of ids) {
    const cd = cooldowns[id] ?? 0;
    if (cd > bestCd) {
      best = id;
      bestCd = cd;
    }
  }
  return best;
}

export interface SetMatchInput {
  effects: SetEffects;
  flags: SetTurnFlags;
  /** Bu eşleşme adımında patlayan taşlar */
  counts: Partial<Record<GemType, number>>;
  /** Bu adımda oluşan 2×2 kare sayısı */
  squareCount: number;
  heroMaxHp: number;
  heroShield: number;
  /** Buzul bonusunun şu an oluşturduğu birikmiş kalkan */
  shieldPool: number;
  cooldowns: Record<string, number>;
  skillOrder: string[];
}

export interface SetMatchResult {
  flags: SetTurnFlags;
  ulti: number;
  /** Hero kalkanına eklenecek miktar */
  shield: number;
  shieldPool: number;
  /** Süresi 1 tur (ya da `cooldownReduce`) azaltılacak yetenek */
  cooldownTarget: string | null;
  cooldownReduce: number;
}

/**
 * Bir eşleşme adımında set "ilk eşleşme" bonuslarını çözer. Her bonus oyuncu turunda yalnızca bir kez
 * tetiklenir (zincir eşleşmeleri ve aynı adımda birden fazla kare tekrar tetiklemez).
 */
export function resolveSetFirstMatch(i: SetMatchInput): SetMatchResult {
  const flags = { ...i.flags };
  let ulti = 0;
  let shield = 0;
  let pool = Math.min(i.shieldPool, i.heroShield); // kalkan hasarla azaldıkça bonus havuzu da azalır
  let cooldownTarget: string | null = null;
  let cooldownReduce = 0;

  if (i.effects.firstFireUlti > 0 && !flags.fireUlti && (i.counts.fire ?? 0) > 0) {
    flags.fireUlti = true;
    ulti = i.effects.firstFireUlti;
  }

  if (i.effects.squareShieldPct > 0 && !flags.squareShield && i.squareCount > 0) {
    flags.squareShield = true;
    const raw = Math.round((i.heroMaxHp * i.effects.squareShieldPct) / 100);
    const cap = Math.round((i.heroMaxHp * i.effects.squareShieldCapPct) / 100);
    shield = Math.max(0, Math.min(raw, cap - pool));
    pool += shield;
  }

  if (i.effects.natureCooldownReduce > 0 && !flags.natureCooldown && (i.counts.nature ?? 0) > 0) {
    flags.natureCooldown = true;
    cooldownTarget = pickCooldownTarget(i.cooldowns, i.skillOrder);
    cooldownReduce = cooldownTarget ? i.effects.natureCooldownReduce : 0;
  }

  return { flags, ulti, shield, shieldPool: pool, cooldownTarget, cooldownReduce };
}
