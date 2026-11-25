/**
 * Sonsuzluk Kulesi — veri odaklı kat sistemi.
 *
 * Kat sayısı, açılış şartı, zorluk eğrileri, kat türleri, özel kurallar ve ödüller bu dosyadaki tablolardan türetilir; kule
 * 200 / 500 / 1000 kata çıkarılırken yalnızca `TOWER_CONFIG.floors` ve gerekirse referans tablosu uzatılır (tablo dışında son
 * değer + yavaş büyüme kullanılır, son kat her zaman "nihai sınav" bossudur).
 *
 * Zorluk yalnızca kat numarasına bağlıdır (oyuncunun kahramanına göre ölçeklenmez). Referans: Dünya Haritası güç tabanı
 * (`referenceDamagePerMove`, `typeDamageFactor`) + bu kata ulaşması beklenen kahramanın gelişimi (seviye, ekipman nadirliği /
 * geliştirme, uyanış). Kahraman yapıları `computeHeroBuild` ile ölçüldü (Savaşçı + Büyücü ortalaması; bkz. tests/tower.test.ts).
 */
import { WORLD_REGIONS } from './world';
import { referenceDamagePerMove, typeDamageFactor } from './stageHpScaling';
import { addMaterials, emptyMaterials } from './awakening';
import { addPotions, emptyPotions } from './potions';
import { generateEquipmentItem } from './items';
import { applyXpToHero } from '../utils/rpgLogic';
import type { EquipmentItem, GameSaveState, HeroClassId, Rarity, StageDef, StageType } from '../types/game';

export const TOWER_CONFIG = {
  /** Toplam kat (ilk sürüm 100) */
  floors: 100,
  /** Açılış: Dünya Haritası'nın bu sıradaki aşaması tamamlanmalı */
  unlockStageOrder: 50,
  /** Kat sayfası boyutu (arayüz) */
  pageSize: 10,
  /** Elit / boss aralıkları (boss önceliklidir) */
  eliteEvery: 5,
  bossEvery: 10,
  /** Özel kurallar bu kattan SONRA başlar */
  rulesAfter: 20,
} as const;

export type TowerFloorKind = 'normal' | 'elite' | 'boss' | 'final';

export const TOWER_TITLE_CONQUEROR = 'Kule Fatihi';

// ---------------------------------------------------------------------------
// Kat türü ve gruplar
// ---------------------------------------------------------------------------

export function floorKind(floor: number, total: number = TOWER_CONFIG.floors): TowerFloorKind {
  if (floor === total) return 'final';
  if (floor % TOWER_CONFIG.bossEvery === 0) return 'boss';
  if (floor % TOWER_CONFIG.eliteEvery === 0) return 'elite';
  return 'normal';
}

const KIND_STAGE_TYPE: Record<TowerFloorKind, StageType> = { normal: 'normal', elite: 'elite', boss: 'boss', final: 'boss' };

export interface TowerBracket {
  from: number;
  to: number;
  name: string;
  color: string;
}

/** Kat grupları (yüzde olarak tanımlı; 100 katta 1–20, 21–40 … 100). Kule büyürse aynı oranlar korunur. */
export function towerBrackets(total: number = TOWER_CONFIG.floors): TowerBracket[] {
  const at = (p: number) => Math.round(total * p);
  return [
    { from: 1, to: at(0.2), name: 'Başlangıç', color: '#34d399' },
    { from: at(0.2) + 1, to: at(0.4), name: 'Orta', color: '#38bdf8' },
    { from: at(0.4) + 1, to: at(0.6), name: 'Zor', color: '#a78bfa' },
    { from: at(0.6) + 1, to: at(0.8), name: 'Uzman', color: '#f472b6' },
    { from: at(0.8) + 1, to: total - 1, name: 'Efsanevi', color: '#f59e0b' },
    { from: total, to: total, name: 'Nihai Sınav', color: '#ef4444' },
  ];
}

export const bracketOf = (floor: number, total: number = TOWER_CONFIG.floors): TowerBracket =>
  towerBrackets(total).find((b) => floor >= b.from && floor <= b.to) ?? towerBrackets(total)[towerBrackets(total).length - 1];

// ---------------------------------------------------------------------------
// Zorluk: referans kahraman (bu kata ulaşan oyuncu)
// ---------------------------------------------------------------------------

/**
 * Kat → bu kata ulaşması beklenen kahraman. `power`: aynı seviyede tam efsanevi +0 sete göre saldırı oranı (hamle başına hasar
 * bununla orantılı alınır). `hp` / `def`: o kahramanın ortalama en yüksek canı / savunması. Ölçüm (computeHeroBuild, 2 sınıf ort.):
 *   1. kat: Sv.35 efsanevi +0 · 20: Sv.45 efsanevi +0 · 40: Sv.50 efsanevi +3 · 60: Sv.50 mitik +3, Uyanış II ·
 *   80: Sv.50 mitik +7, Uyanış III · 99: Sv.50 mitik +10, Uyanış IV · 100: Sv.50 mitik +10, Uyanış V.
 */
export const TOWER_REF_TABLE: ReadonlyArray<{ floor: number; level: number; power: number; hp: number; def: number }> = [
  { floor: 1, level: 35, power: 1.0, hp: 10460, def: 1210 },
  { floor: 20, level: 45, power: 1.0, hp: 13120, def: 1520 },
  { floor: 40, level: 50, power: 1.32, hp: 19140, def: 2290 },
  { floor: 60, level: 50, power: 1.82, hp: 26790, def: 3220 },
  { floor: 80, level: 50, power: 2.52, hp: 37340, def: 4490 },
  { floor: 99, level: 50, power: 3.09, hp: 46520, def: 5540 },
  { floor: 100, level: 50, power: 3.23, hp: 48540, def: 5700 },
];

/** Hedef ortalama hamle (referans kahraman, iyi oyuncu): katla birlikte yavaşça artar. Yüksek katlarda 2–3 hamlelik savaş olmaz. */
export const TOWER_TARGET_MOVES: Record<TowerFloorKind, readonly [number, number]> = {
  normal: [9, 14],
  elite: [18, 24],
  boss: [22, 30],
  final: [40, 40],
};

/** 1. kattaki düşman vuruşunun (savunma sonrası) referans kahramanın canına oranı → son katta; elit/boss belirgin daha sert. */
export const TOWER_HIT_PCT: readonly [number, number] = [0.095, 0.12];
/** Saldırının referans hasar büyümesine bağlılığı (üs < 1 → candan yavaş) */
export const TOWER_ATTACK_EXP = 0.85;
export const TOWER_KIND_ATTACK: Record<TowerFloorKind, number> = { normal: 1, elite: 1.15, boss: 1.2, final: 1.4 };
export const TOWER_KIND_DEFENSE: Record<TowerFloorKind, number> = { normal: 1, elite: 1.2, boss: 1.4, final: 1.8 };

function refAt(floor: number) {
  const t = TOWER_REF_TABLE;
  if (floor <= t[0].floor) return { ...t[0] };
  for (let i = 1; i < t.length; i++) {
    if (floor <= t[i].floor) {
      const a = t[i - 1];
      const b = t[i];
      const k = (floor - a.floor) / (b.floor - a.floor);
      const lerp = (x: number, y: number) => x + (y - x) * k;
      return { floor, level: lerp(a.level, b.level), power: lerp(a.power, b.power), hp: lerp(a.hp, b.hp), def: lerp(a.def, b.def) };
    }
  }
  // Tablo dışı (genişletilmiş kule): son değerden kat başına %0,8 büyüme
  const last = t[t.length - 1];
  const g = Math.pow(1.008, floor - last.floor);
  return { floor, level: last.level, power: last.power * g, hp: last.hp * g, def: last.def * g };
}

/** Referans kahramanın bu kattaki hamle başına ortalama hasarı. */
export const towerRefDamagePerMove = (floor: number): number => {
  const r = refAt(floor);
  return referenceDamagePerMove(r.level) * r.power;
};

const progress01 = (floor: number, total: number) => (total > 1 ? Math.min(1, Math.max(0, (floor - 1) / (total - 1))) : 1);

export function towerTargetMoves(floor: number, total: number = TOWER_CONFIG.floors): number {
  const [a, b] = TOWER_TARGET_MOVES[floorKind(floor, total)];
  return a + (b - a) * progress01(floor, total);
}

/**
 * Gerçek savaş ölçümüyle düzeltme (v1.98.0; Savaşçı + Büyücü, referans yapılar, iyi oyuncu politikası). Normal katlarda ölçülen
 * hamle başına hasar modelle uyuştu (1. kat ~90 B ≈ beklenen 91 B; 49. kat ~198 B ≈ 207 B; 99. kat ~427 B ≈ 415 B). Boss
 * savaşlarında ise yüksek ekipmanla hasar beklenenden fazla çıktı (50. kat bossu 14–19 hamle, 100. kat ortalama ~20 hamle).
 * Bu yüzden boss canı katla artan bir çarpanla, nihai boss ayrıca düzeltilir. Düzeltme sonrası ölçüm: 10. kat 24/27,
 * 50. kat 20/34, 100. kat 17–47 (ort. ~32) hamle; erken bosslar (30. kat 31–38 hamle) için çarpan 1,1'e indirildi.
 */
export const TOWER_BOSS_HP_ADJUST: ReadonlyArray<readonly [number, number]> = [[10, 1], [30, 1.1], [50, 1.5], [99, 1.5]];
export const TOWER_FINAL_HP_ADJUST = 1.8;

export function towerHpAdjust(floor: number, total: number = TOWER_CONFIG.floors): number {
  const kind = floorKind(floor, total);
  if (kind === 'final') return TOWER_FINAL_HP_ADJUST;
  if (kind !== 'boss') return 1;
  const t = TOWER_BOSS_HP_ADJUST;
  const x = (floor / total) * 100;
  if (x <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++) if (x <= t[i][0]) return t[i - 1][1] + ((t[i][1] - t[i - 1][1]) * (x - t[i - 1][0])) / (t[i][0] - t[i - 1][0]);
  return t[t.length - 1][1];
}

export interface TowerEnemyStats {
  maxHp: number;
  attack: number;
  defense: number;
  level: number;
}

/** Kat düşmanının değerleri: can, saldırı, savunma ayrı eğrilerden. */
export function towerEnemyStats(floor: number, total: number = TOWER_CONFIG.floors): TowerEnemyStats {
  const kind = floorKind(floor, total);
  const r = refAt(floor);
  const level = Math.round(r.level);
  const maxHp = Math.round((towerRefDamagePerMove(floor) * typeDamageFactor(KIND_STAGE_TYPE[kind], level) * towerTargetMoves(floor, total) * towerHpAdjust(floor, total)) / 100) * 100;
  const hitPct = (TOWER_HIT_PCT[0] + (TOWER_HIT_PCT[1] - TOWER_HIT_PCT[0]) * progress01(floor, total)) * TOWER_KIND_ATTACK[kind];
  // Saldırı: 1. katta vuruş referans kahramanın canının ~%9,5'i (savunma sonrası); sonra referans hasarın 0,85 üssüyle büyür
  // (can, hasar × artan hedef hamleyle büyüdüğü için her zaman saldırıdan hızlı artar). Yüksek savunmalı kahramanda vuruş
  // Dünya Haritası'nın can yüzdesi tabanına (normal %9, boss %14) iner; zayıf savunmalı kahraman daha çok hasar alır.
  const r1 = refAt(1);
  const growth = Math.pow(towerRefDamagePerMove(floor) / towerRefDamagePerMove(1), TOWER_ATTACK_EXP);
  const attack = Math.round(hitPct * r1.hp * ((100 + r1.def * 1.45) / 100) * growth);
  const defense = Math.round((30 + 1.2 * floor) * TOWER_KIND_DEFENSE[kind]);
  return { maxHp, attack, defense, level };
}

// ---------------------------------------------------------------------------
// Özel savaş kuralları
// ---------------------------------------------------------------------------

export type TowerRuleId = 'frozen_ground' | 'mana_drought' | 'heal_curse' | 'armored' | 'combo_blessing' | 'element_mastery';

export interface TowerRuleDef {
  id: TowerRuleId;
  name: string;
  text: string;
  /** Oyuncu için zorlaştırıcı mı (arayüz rengi) */
  hard: boolean;
}

export const TOWER_RULES: Record<TowerRuleId, TowerRuleDef> = {
  frozen_ground: { id: 'frozen_ground', name: 'Donmuş Zemin', text: 'Savaş başında iki rastgele taş donmuş olur.', hard: true },
  mana_drought: { id: 'mana_drought', name: 'Mana Kıtlığı', text: 'Taş eşleşmelerinden kazanılan mana %15 azalır.', hard: true },
  heal_curse: { id: 'heal_curse', name: 'Şifa Laneti', text: 'Kahramanın aldığı iyileştirme %15 azalır.', hard: true },
  armored: { id: 'armored', name: 'Güçlü Zırh', text: 'Düşman savaş başında en yüksek canının %10’u kadar kalkan kazanır.', hard: true },
  combo_blessing: { id: 'combo_blessing', name: 'Kombo Bereketi', text: '3 ve üzeri zincirlerde kahramanın hasarı %10 artar.', hard: false },
  element_mastery: { id: 'element_mastery', name: 'Element Ustalığı', text: 'Düşmanın element zayıflığından alınan hasar bonusu +%25 artar (%45 → %70).', hard: false },
};

export const TOWER_RULE_IDS = Object.keys(TOWER_RULES) as TowerRuleId[];

/** Kurallar savaş motorunda bu değerlerle uygulanır. */
export const TOWER_RULE_VALUES = {
  frozenTiles: 2,
  manaGainMult: 0.85,
  healMult: 0.85,
  enemyShieldPct: 0.1,
  comboMinChain: 3,
  comboDamageMult: 1.1,
  weaknessBonusAdd: 0.25,
} as const;

/** Kat kimliğinden türetilen sabit karma (aynı kat her zaman aynı kurala sahiptir). */
function floorHash(floor: number): number {
  let h = (floor * 2654435761) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519) >>> 0;
  h ^= h >>> 13;
  return h >>> 0;
}

/** Katın özel kuralı (en fazla bir). İlk 20 katta yok; son katta her zaman Güçlü Zırh; diğer katların ~%60'ında kural var. */
export function towerRuleFor(floor: number, total: number = TOWER_CONFIG.floors): TowerRuleId | null {
  if (floor <= TOWER_CONFIG.rulesAfter) return null;
  if (floor === total) return 'armored';
  const h = floorHash(floor);
  if (h % 10 >= 6) return null;
  return TOWER_RULE_IDS[(h >>> 8) % TOWER_RULE_IDS.length];
}

// ---------------------------------------------------------------------------
// Düşman şablonları (Dünya Haritası düşmanları: görsel, zayıflık, boss fazları)
// ---------------------------------------------------------------------------

const ROUTE: StageDef[] = WORLD_REGIONS.flatMap((r) => r.stages);
const POOL: Record<'normal' | 'elite' | 'boss', StageDef[]> = {
  normal: ROUTE.filter((s) => s.type === 'normal'),
  elite: ROUTE.filter((s) => s.type === 'elite'),
  boss: ROUTE.filter((s) => s.type === 'boss'),
};

export const TOWER_FINAL_BOSS = { name: 'Sonsuzluk Bekçisi Aeon', title: 'Kulenin Efendisi' };

/** Katın düşman şablonu: kat türünün havuzunda kulede ilerledikçe Dünya Haritası'nda da ilerleyen bir seçim. */
export function towerTemplate(floor: number, total: number = TOWER_CONFIG.floors): StageDef {
  const kind = floorKind(floor, total);
  if (kind === 'final') return POOL.boss[POOL.boss.length - 1];
  const pool = POOL[kind];
  // Aynı türden kaçıncı kat (0 tabanlı) ve o türün kuledeki toplam sayısı
  const count = (k: TowerFloorKind) => Array.from({ length: total }, (_, i) => i + 1).filter((f) => floorKind(f, total) === k);
  const floorsOfKind = count(kind);
  const idx = floorsOfKind.indexOf(floor);
  const n = floorsOfKind.length;
  // Havuzun 10. % … sonuna yayılır (ilk aşamaların zayıf görünümlü düşmanları kulede kullanılmaz)
  const start = Math.floor(pool.length * 0.1);
  const span = pool.length - 1 - start - (kind === 'boss' ? 1 : 0);
  const pick = start + Math.round((span * idx) / Math.max(1, n - 1));
  return pool[Math.max(0, Math.min(pool.length - 1, pick))];
}

/** Kat savaşı için aşama tanımı (kimlik `tower:<kat>`). */
export function towerFloorStage(floor: number, total: number = TOWER_CONFIG.floors): StageDef {
  const kind = floorKind(floor, total);
  const tpl = towerTemplate(floor, total);
  const st = towerEnemyStats(floor, total);
  const r = towerFirstClearRewards(floor, total);
  const final = kind === 'final';
  return {
    ...tpl,
    id: `tower:${floor}`,
    stageNumber: floor,
    name: `${floor}. Kat`,
    description: final ? 'Kulenin zirvesi: nihai sınav.' : `Sonsuzluk Kulesi — ${bracketOf(floor, total).name}`,
    type: KIND_STAGE_TYPE[kind],
    recommendedLevel: st.level,
    enemy: {
      ...tpl.enemy,
      name: final ? TOWER_FINAL_BOSS.name : tpl.enemy.name,
      title: final ? TOWER_FINAL_BOSS.title : tpl.enemy.title,
      level: st.level,
      maxHp: st.maxHp,
      attack: st.attack,
      defense: st.defense,
    },
    rewards: { xp: r.xp, gold: r.gold, crystals: r.crystals, dropChance: 0 },
  };
}

export const isTowerStageId = (id: string) => id.startsWith('tower:');
export const towerFloorOfStage = (id: string): number => (isTowerStageId(id) ? Number(id.slice(6)) || 0 : 0);

// ---------------------------------------------------------------------------
// Ödüller
// ---------------------------------------------------------------------------

export interface TowerMaterialsReward {
  awakenShard: number;
  soulCrystal: number;
  divineEssence: number;
}

export interface TowerChestReward {
  gold: number;
  crystals: number;
  potions: { small: number; medium: number; large: number };
}

export interface TowerFirstClearRewards {
  gold: number;
  crystals: number;
  xp: number;
  seals: number;
  /** Kat ekipmanı (seviye + nadirlik) */
  item: { level: number; rarity: Rarity };
  /** Her 10 katta kule sandığı */
  chest: TowerChestReward | null;
  /** Her 25 katta uyanış malzemesi */
  materials: TowerMaterialsReward | null;
  /** Son kat: mitik ekipman ve unvan */
  title: string | null;
}

export const TOWER_SEALS: Record<TowerFloorKind, number> = { normal: 1, elite: 3, boss: 5, final: 25 };
const KIND_REWARD_MULT: Record<TowerFloorKind, number> = { normal: 1, elite: 1.8, boss: 3, final: 8 };
const KIND_XP_MULT: Record<TowerFloorKind, number> = { normal: 1, elite: 1.5, boss: 2, final: 6 };

/** Her 25 katın uyanış malzemesi (anahtar: kat); son kat "büyük ödül". */
export const TOWER_MATERIAL_REWARDS: Readonly<Record<number, TowerMaterialsReward>> = {
  25: { awakenShard: 25, soulCrystal: 0, divineEssence: 0 },
  50: { awakenShard: 40, soulCrystal: 5, divineEssence: 0 },
  75: { awakenShard: 60, soulCrystal: 10, divineEssence: 2 },
  100: { awakenShard: 100, soulCrystal: 20, divineEssence: 8 },
};

function itemRarity(floor: number, kind: TowerFloorKind, total: number): Rarity {
  if (kind === 'final') return 'mythic';
  const p = floor / total;
  // Her 5 katta (elit/boss) nadir veya üzeri
  if (floor % TOWER_CONFIG.eliteEvery === 0) return p <= 0.2 ? 'rare' : p <= 0.5 ? 'epic' : 'legendary';
  return p <= 0.2 ? 'uncommon' : p <= 0.5 ? 'rare' : 'epic';
}

export function towerFirstClearRewards(floor: number, total: number = TOWER_CONFIG.floors): TowerFirstClearRewards {
  const kind = floorKind(floor, total);
  const m = KIND_REWARD_MULT[kind];
  const level = Math.max(1, Math.min(50, Math.round(refAt(floor).level)));
  const isChest = floor % TOWER_CONFIG.bossEvery === 0;
  return {
    gold: Math.round(((3000 + 250 * floor) * m) / 10) * 10,
    crystals: Math.round((8 + floor * 0.4) * m),
    xp: Math.round((9000 + 800 * floor) * KIND_XP_MULT[kind]),
    seals: TOWER_SEALS[kind],
    item: { level, rarity: itemRarity(floor, kind, total) },
    chest: isChest
      ? { gold: Math.round((5000 + 400 * floor) / 10) * 10, crystals: 20 + floor, potions: { small: 0, medium: 2, large: floor >= total / 2 ? 1 : 0 } }
      : null,
    materials: TOWER_MATERIAL_REWARDS[floor] ?? null,
    title: kind === 'final' ? TOWER_TITLE_CONQUEROR : null,
  };
}

/** Sıradaki "özel" ödül (sandık / malzeme / son kat) — arayüzde gösterilir. */
export function nextSpecialReward(save: Pick<GameSaveState, 'tower'>, total: number = TOWER_CONFIG.floors): { floor: number; label: string } | null {
  for (let f = (save.tower?.highest ?? 0) + 1; f <= total; f++) {
    const r = towerFirstClearRewards(f, total);
    if (r.title) return { floor: f, label: 'Mitik ekipman · Büyük uyanış ödülü · “Kule Fatihi”' };
    if (r.materials) return { floor: f, label: 'Uyanış malzemeleri' + (r.chest ? ' · Kule Sandığı' : '') };
    if (r.chest) return { floor: f, label: 'Kule Sandığı' };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Kayıt ve ilerleme
// ---------------------------------------------------------------------------

export interface TowerSave {
  /** Tamamlanan en yüksek kat (0 = hiç) */
  highest: number;
  /** Kule Mührü (ortak envanter; gelecekteki kule mağazası) */
  seals: number;
  /** Kazanılan unvanlar */
  titles: string[];
  /** Toplam kule zaferi (antrenman dahil) */
  wins: number;
}

export const emptyTowerSave = (): TowerSave => ({ highest: 0, seals: 0, titles: [], wins: 0 });

export function sanitizeTower(value: unknown, total: number = TOWER_CONFIG.floors): TowerSave {
  const v = (value && typeof value === 'object' ? value : {}) as Partial<Record<keyof TowerSave, unknown>>;
  const int = (x: unknown, max: number) => (typeof x === 'number' && Number.isFinite(x) && x > 0 ? Math.min(max, Math.floor(x)) : 0);
  return {
    highest: int(v.highest, total),
    seals: int(v.seals, 9_999_999),
    titles: Array.isArray(v.titles) ? [...new Set(v.titles.filter((t): t is string => typeof t === 'string'))].slice(0, 20) : [],
    wins: int(v.wins, 99_999_999),
  };
}

const ROUTE_IDS = ROUTE.map((s) => s.id);
export const towerUnlockStageId = (): string => ROUTE_IDS[TOWER_CONFIG.unlockStageOrder - 1];

export function isTowerUnlocked(save: Pick<GameSaveState, 'completedStages'>): boolean {
  return save.completedStages.includes(towerUnlockStageId());
}

export function towerUnlockText(save: Pick<GameSaveState, 'completedStages'>): string {
  const done = ROUTE_IDS.slice(0, TOWER_CONFIG.unlockStageOrder).filter((id) => save.completedStages.includes(id)).length;
  return `Dünya Haritası’nın ${TOWER_CONFIG.unlockStageOrder}. aşamasını tamamla (${done}/${TOWER_CONFIG.unlockStageOrder})`;
}

/** Oyuncunun girebileceği en yüksek kat (sıradaki kat; hepsi bittiyse son kat). */
export const towerCurrentFloor = (save: Pick<GameSaveState, 'tower'>, total: number = TOWER_CONFIG.floors): number =>
  Math.min(total, (save.tower?.highest ?? 0) + 1);

export function canEnterFloor(save: Pick<GameSaveState, 'tower' | 'completedStages'>, floor: number, total: number = TOWER_CONFIG.floors): boolean {
  return isTowerUnlocked(save) && Number.isInteger(floor) && floor >= 1 && floor <= total && floor <= (save.tower?.highest ?? 0) + 1;
}

export interface TowerVictoryOutcome {
  floor: number;
  /** İlk zafer mi (ödüller verildi) — değilse antrenman */
  firstClear: boolean;
  gold: number;
  crystals: number;
  xp: number;
  seals: number;
  items: EquipmentItem[];
  chest: TowerChestReward | null;
  materials: TowerMaterialsReward | null;
  title: string | null;
  leveledUp: boolean;
  newLevel: number;
}

export type ItemMaker = (p: { level: number; rarity: Rarity; preferredClass?: HeroClassId }) => EquipmentItem;
const defaultMaker: ItemMaker = (p) => generateEquipmentItem(p);

/**
 * Kat zaferini kayda işler. İlk zafer ödülleri (altın, kristal, deneyim, ekipman, mühür, sandık, malzeme, unvan) ve ilerleme
 * TEK kayıt güncellemesinde yazılır. Kat zaten tamamlanmışsa (antrenman, çift dokunma veya yeniden açılan oyun) hiçbir ödül
 * verilmez, yalnızca zafer sayacı artar. Sırası gelmemiş kat reddedilir (kayıt değişmez).
 */
export function applyTowerVictory(
  save: GameSaveState,
  floor: number,
  makeItem: ItemMaker = defaultMaker,
  total: number = TOWER_CONFIG.floors
): { save: GameSaveState; outcome: TowerVictoryOutcome | null } {
  const tower = sanitizeTower(save.tower, total);
  const hero = save.heroes[save.activeHeroClass];
  if (!canEnterFloor({ ...save, tower }, floor, total)) return { save, outcome: null };
  const empty: TowerVictoryOutcome = {
    floor, firstClear: false, gold: 0, crystals: 0, xp: 0, seals: 0, items: [], chest: null, materials: null, title: null,
    leveledUp: false, newLevel: hero.level,
  };
  if (floor <= tower.highest) {
    return { save: { ...save, tower: { ...tower, wins: tower.wins + 1 } }, outcome: empty };
  }
  const r = towerFirstClearRewards(floor, total);
  const items = [makeItem({ level: r.item.level, rarity: r.item.rarity, preferredClass: save.activeHeroClass })];
  const xpRes = applyXpToHero(hero, r.xp);
  const gold = r.gold + (r.chest?.gold ?? 0);
  const crystals = r.crystals + (r.chest?.crystals ?? 0);
  const titles = r.title && !tower.titles.includes(r.title) ? [...tower.titles, r.title] : tower.titles;
  const next: GameSaveState = {
    ...save,
    gold: save.gold + gold,
    crystals: save.crystals + crystals,
    inventory: [...save.inventory, ...items],
    potions: r.chest ? addPotions(save.potions ?? emptyPotions(), r.chest.potions) : save.potions,
    materials: r.materials ? addMaterials(save.materials ?? emptyMaterials(), r.materials) : save.materials,
    heroes: { ...save.heroes, [save.activeHeroClass]: xpRes.updatedHero },
    tower: { highest: floor, seals: tower.seals + r.seals, titles, wins: tower.wins + 1 },
  };
  return {
    save: next,
    outcome: {
      floor, firstClear: true, gold, crystals, xp: r.xp, seals: r.seals, items, chest: r.chest, materials: r.materials, title: r.title,
      leveledUp: xpRes.leveledUp, newLevel: xpRes.newLevel,
    },
  };
}
