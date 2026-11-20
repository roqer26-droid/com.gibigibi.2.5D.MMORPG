import { computeSetEffects, countEquippedSets, diffEquipped, isSetSlot, SET_IDS, type EquippedMap, type SetDiff, type SetEffects } from '../data/sets';
import type { EquipmentItem, EquipmentSetId, EquipmentSlot, HeroClassId, HeroProgress, StatBlock } from '../types/game';
import { computeHeroBuild, getItemPowerScore } from '../utils/rpgLogic';

/**
 * "En İyilerini Kuşan" planlayıcısı (saf mantık).
 *
 * Yöntem: toplam puan = Σ eşya temel puanı + set bonus puanı. Eşya puanı oyunun mevcut güç puanıdır
 * (`getItemPowerScore`: özellik ağırlıkları + nadirlik, geliştirme seviyesi dahil). Set bonusları aşağıdaki
 * AYARLANABİLİR değerlerle puanlanır.
 *
 * Neden kesin sonuç? Puan toplanabilir olduğu için, aynı yuvada aynı "set kimliğine" (set yok / Köz / Buzul / Yaşam)
 * sahip adaylardan en iyisi her zaman daha iyidir. Böylece her set yuvası için en fazla 4 aday kalır ve 4 yuvada
 * ≤256 kombinasyon denenir; diğer yuvalar bağımsızca seçilir. Maliyet envanter boyunca doğrusaldır.
 */

export interface EquipScoring {
  /** Eşya temel puanı çarpanı */
  itemWeight: number;
  /** Set bonus birim değerleri (kahraman seviye 1 için puan) */
  unitValue: {
    fireDamagePct: number; // ateş taşı hasarı, her % için
    frostManaPct: number; // buz taşından mana, her % için
    natureHealPct: number; // doğa taşından iyileştirme, her % için
    firstFireUlti: number; // turun ilk ateş eşleşmesi, her ulti puanı için
    squareShieldPct: number; // turun ilk karesi kalkanı, max canın her %'si için
    natureCooldownTurn: number; // turun ilk doğa eşleşmesi, azaltılan her tur için
  };
  /**
   * "Turun ilk eşleşmesi" bonuslarının gerçekleşme olasılığı varsayımı (0-1).
   * Koşullu bonus her turda tetiklenmez: kare nadir bir eşleşmedir, ateş/doğa eşleşmesi sık ama garanti değildir.
   */
  uptime: { firstFire: number; firstSquare: number; firstNature: number };
  /** Bonus puanlarının kahraman seviyesiyle büyümesi: çarpan = 1 + (seviye-1) × levelScale (eşya güçleri de seviyeyle büyür) */
  levelScale: number;
}

export const DEFAULT_EQUIP_SCORING: EquipScoring = {
  itemWeight: 1,
  unitValue: {
    fireDamagePct: 6,
    frostManaPct: 3,
    natureHealPct: 3,
    firstFireUlti: 8,
    squareShieldPct: 8,
    natureCooldownTurn: 30,
  },
  uptime: { firstFire: 0.7, firstSquare: 0.25, firstNature: 0.6 },
  levelScale: 0.06,
};

/** Toplam set etkilerinin puan karşılığı. */
export function scoreSetEffects(effects: SetEffects, heroLevel: number, cfg: EquipScoring = DEFAULT_EQUIP_SCORING): number {
  const u = cfg.unitValue;
  const up = cfg.uptime;
  const raw =
    effects.fireDmgPct * u.fireDamagePct +
    effects.frostManaPct * u.frostManaPct +
    effects.natureHealPct * u.natureHealPct +
    effects.firstFireUlti * u.firstFireUlti * up.firstFire +
    effects.squareShieldPct * u.squareShieldPct * up.firstSquare +
    effects.natureCooldownReduce * u.natureCooldownTurn * up.firstNature;
  return raw * (1 + Math.max(0, heroLevel - 1) * cfg.levelScale);
}

export const itemScore = (item: EquipmentItem, cfg: EquipScoring = DEFAULT_EQUIP_SCORING): number =>
  getItemPowerScore(item) * cfg.itemWeight;

/** Eşleşme yuvası sırası (ekipman ekranındaki görünüm sırası): sol sütun sonra sağ sütun. */
export const DISPLAY_SLOT_ORDER: EquipmentSlot[] = [
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

const SET_SLOT_LIST: EquipmentSlot[] = DISPLAY_SLOT_ORDER.filter(isSetSlot);
const SINGLE_SLOTS: EquipmentSlot[] = DISPLAY_SLOT_ORDER.filter((s) => !isSetSlot(s) && s !== 'ring1' && s !== 'ring2');
const isRingItem = (i: EquipmentItem) => i.slot === 'ring1' || i.slot === 'ring2';

export interface EquipChange {
  slot: EquipmentSlot;
  from?: EquipmentItem;
  to?: EquipmentItem;
}

export interface EquipPlan {
  classId: HeroClassId;
  current: EquippedMap;
  proposed: EquippedMap;
  /** Değişecek yuvalar (görünüm sırasıyla) */
  changes: EquipChange[];
  /** Mevcut kombinasyon zaten en yüksek puanlı */
  unchanged: boolean;
  currentScore: number;
  proposedScore: number;
  statsBefore: StatBlock;
  statsAfter: StatBlock;
  powerBefore: number;
  powerAfter: number;
  /** Kuşanma sonrası set parça sayısı ve bonus değişimleri */
  setDiffs: SetDiff[];
}

const slotKey = (i: EquipmentItem | undefined) => i?.id ?? '';

function groupKey(item: EquipmentItem, slot: EquipmentSlot): EquipmentSetId | 'none' {
  return isSetSlot(slot) && item.setId && SET_IDS.includes(item.setId) ? item.setId : 'none';
}

/** Skor eşitliğinde kuşanılmış eşya tercih edilir (gereksiz değişimi önler). */
function better(a: EquipmentItem, b: EquipmentItem, equippedIds: Set<string>, cfg: EquipScoring): boolean {
  const sa = itemScore(a, cfg);
  const sb = itemScore(b, cfg);
  if (sa !== sb) return sa > sb;
  return equippedIds.has(a.id) && !equippedIds.has(b.id);
}

function totalScore(choice: EquippedMap, level: number, cfg: EquipScoring): number {
  let t = 0;
  for (const item of Object.values(choice)) if (item) t += itemScore(item, cfg);
  return t + scoreSetEffects(computeSetEffects(choice), level, cfg);
}

/**
 * Kahraman için en iyi ekipman kombinasyonunu bulur. Aday havuzu: kuşanılmış + çantadaki ve kahramanın seviyesinin
 * izin verdiği eşyalar (zaten kuşanılmış eşya seviye kısıtından bağımsız aday kalır). Bir eşya iki yuvaya seçilmez.
 */
export function planBestEquipment(hero: HeroProgress, inventory: EquipmentItem[], cfg: EquipScoring = DEFAULT_EQUIP_SCORING): EquipPlan {
  const current: EquippedMap = hero.equipped;
  const equippedIds = new Set(Object.values(current).filter(Boolean).map((i) => i!.id));

  // Adayları yuvalara dağıt (tek geçiş, O(n))
  const bySlot = new Map<EquipmentSlot, EquipmentItem[]>();
  const push = (slot: EquipmentSlot, item: EquipmentItem) => {
    const list = bySlot.get(slot);
    if (list) list.push(item);
    else bySlot.set(slot, [item]);
  };
  const seen = new Set<string>();
  const consider = (item: EquipmentItem, wornSlot?: EquipmentSlot) => {
    if (seen.has(item.id)) return; // aynı eşya iki kez aday olmaz
    if (!wornSlot && item.levelReq > hero.level) return;
    seen.add(item.id);
    if (isRingItem(item)) push('ring1', item);
    else push(wornSlot && !isRingItem(item) ? wornSlot : item.slot, item);
  };
  for (const [slot, item] of Object.entries(current) as [EquipmentSlot, EquipmentItem | undefined][]) {
    if (item) consider(item, slot);
  }
  for (const item of inventory) consider(item);

  const proposedBase: EquippedMap = {};

  // Set dışı tekil yuvalar: en iyi eşya
  for (const slot of SINGLE_SLOTS) {
    const list = bySlot.get(slot);
    if (!list?.length) continue;
    let best = list[0];
    for (const it of list) if (better(it, best, equippedIds, cfg)) best = it;
    proposedBase[slot] = { ...best, slot };
  }

  // Yüzükler: en iyi iki FARKLI eşya
  const rings = [...(bySlot.get('ring1') ?? [])].sort((a, b) =>
    better(a, b, equippedIds, cfg) ? -1 : better(b, a, equippedIds, cfg) ? 1 : 0
  );
  if (rings[0]) proposedBase.ring1 = { ...rings[0], slot: 'ring1' };
  if (rings[1]) proposedBase.ring2 = { ...rings[1], slot: 'ring2' };

  // Set yuvaları: her yuva için her set kimliğinin (ve "set yok"un) en iyi adayı; tüm kombinasyonlar denenir
  const options: { slot: EquipmentSlot; items: EquipmentItem[] }[] = [];
  for (const slot of SET_SLOT_LIST) {
    const groups = new Map<string, EquipmentItem>();
    for (const it of bySlot.get(slot) ?? []) {
      const key = groupKey(it, slot);
      const g = groups.get(key);
      if (!g || better(it, g, equippedIds, cfg)) groups.set(key, it);
    }
    if (groups.size) options.push({ slot, items: [...groups.values()] });
  }

  let bestChoice: EquippedMap = { ...proposedBase };
  let bestScore = -Infinity;
  let bestKept = -1;
  const rec = (idx: number, acc: EquippedMap) => {
    if (idx === options.length) {
      const score = totalScore(acc, hero.level, cfg);
      const kept = Object.entries(acc).filter(([slot, it]) => it && current[slot as EquipmentSlot]?.id === it.id).length;
      if (score > bestScore + 1e-9 || (Math.abs(score - bestScore) <= 1e-9 && kept > bestKept)) {
        bestScore = score;
        bestKept = kept;
        bestChoice = { ...acc };
      }
      return;
    }
    const { slot, items } = options[idx];
    for (const it of items) rec(idx + 1, { ...acc, [slot]: { ...it, slot } });
  };
  rec(0, { ...proposedBase });

  // Mevcut kombinasyon da aday: daha iyi değilse (eşitse) mevcut korunur
  const currentScore = totalScore(current, hero.level, cfg);
  const useCurrent = bestScore <= currentScore + 1e-9;
  const proposed: EquippedMap = useCurrent ? { ...current } : bestChoice;

  const changes: EquipChange[] = [];
  for (const slot of DISPLAY_SLOT_ORDER) {
    const from = current[slot];
    const to = proposed[slot];
    if (slotKey(from) !== slotKey(to)) changes.push({ slot, from, to });
  }
  const unchanged = changes.length === 0;
  const before = computeHeroBuild({ ...hero, equipped: current });
  const after = computeHeroBuild({ ...hero, equipped: proposed });

  return {
    classId: hero.classId,
    current,
    proposed,
    changes,
    unchanged,
    currentScore,
    proposedScore: unchanged ? currentScore : totalScore(proposed, hero.level, cfg),
    statsBefore: before.stats,
    statsAfter: after.stats,
    powerBefore: before.powerRating,
    powerAfter: after.powerRating,
    setDiffs: diffEquipped(current, proposed),
  };
}

export { countEquippedSets };
