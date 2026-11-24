import type { SkillTreeNode, StatBlock } from '../types/game';

/**
 * Pasif yetenek ağacı kuralları (tüm kahramanlar için aynı):
 * - Her pasifin en yüksek seviyesi 10'dur; her yükseltme 1 yetenek puanı ister.
 * - Kahramanın kendi ağacındaki pasifler eskiden tam seviyede (3/3 ya da 2/2) verdikleri toplam bonusu artık 10/10'da verir;
 *   her seviye bunun onda birini ekler. Ara değerler yuvarlanmaz (yuvarlama nihai yapı/savaş hesabındadır).
 * - Ortak "Ustalık" pasifleri her kahramanda aynı değerlerle bulunur; puanlar her kahramanın kendi kaydındadır.
 */
export const PASSIVE_MAX_RANK = 10;
/** Seviye başına kazanılan yetenek puanı (eski: 1). */
export const SKILL_POINTS_PER_LEVEL = 3;
/** Bir kahramanın bu seviyeye kadar kazandığı toplam yetenek puanı (1. seviyede 1 puan). */
export const skillPointBudget = (level: number): number => 1 + SKILL_POINTS_PER_LEVEL * Math.max(0, Math.floor(level) - 1);

export type PassiveType = NonNullable<SkillTreeNode['passiveEffect']>['type'];
type StatKey = keyof StatBlock;

/** Eski (10 seviye öncesi) düğüm değerleri: geçiş ve 10/10 = eski tam seviye testleri için saklanır. */
export interface LegacyNodeValues {
  maxRank: number;
  statPerRank?: Partial<StatBlock>;
  valuePerRank?: number;
}

/** Bir değeri seviyeye göre ölçekler: 10/10'da tam toplam (bölme son adımda yapılır, ara yuvarlama yok). */
export const scaledValue = (atMax: number, rank: number, maxRank = PASSIVE_MAX_RANK): number =>
  rank <= 0 ? 0 : rank >= maxRank ? atMax : (atMax * rank) / maxRank;

/** Kahraman ağacındaki eski düğümü 10 seviyeye taşır (eski tam seviye toplamı = 10/10). */
export function scaleLegacyNode(n: SkillTreeNode): SkillTreeNode {
  if (n.legacy) return n; // zaten ölçeklenmiş
  const m = n.maxRank;
  const statAtMax = n.statPerRank
    ? (Object.fromEntries(Object.entries(n.statPerRank).map(([k, v]) => [k, (v ?? 0) * m])) as Partial<StatBlock>)
    : undefined;
  const scaled: SkillTreeNode = {
    ...n,
    maxRank: PASSIVE_MAX_RANK,
    legacy: { maxRank: m, statPerRank: n.statPerRank, valuePerRank: n.passiveEffect?.valuePerRank },
    statAtMax,
    statPerRank: statAtMax
      ? (Object.fromEntries(Object.entries(statAtMax).map(([k, v]) => [k, (v ?? 0) / PASSIVE_MAX_RANK])) as Partial<StatBlock>)
      : undefined,
    passiveEffect: n.passiveEffect
      ? {
          type: n.passiveEffect.type,
          valueAtMax: n.passiveEffect.valuePerRank * m,
          valuePerRank: (n.passiveEffect.valuePerRank * m) / PASSIVE_MAX_RANK,
        }
      : undefined,
  };
  return { ...scaled, description: describeNode(scaled) };
}

// ---------------------------------------------------------------------------------------------------------------
// Etki tanımları (etiket, birim, kategori)
// ---------------------------------------------------------------------------------------------------------------

export type PassiveCategory = 'damage' | 'defense' | 'resource';
export const CATEGORY_TITLE: Record<PassiveCategory, string> = { damage: 'Hasar', defense: 'Savunma', resource: 'Kaynaklar' };

interface EffectMeta {
  label: string;
  pct: boolean;
  cat: PassiveCategory;
  /** Kart üzerindeki tam açıklama (10/10 için) */
  long?: string;
}

const STAT_META: Record<StatKey, EffectMeta> = {
  health: { label: 'can', pct: false, cat: 'defense' },
  attack: { label: 'saldırı', pct: false, cat: 'damage' },
  defense: { label: 'savunma', pct: false, cat: 'defense' },
  critChance: { label: 'kritik şansı', pct: true, cat: 'damage' },
  critDamage: { label: 'kritik hasarı', pct: true, cat: 'damage' },
  mana: { label: 'mana', pct: false, cat: 'resource' },
  dodge: { label: 'sıyrılma', pct: true, cat: 'defense' },
  elementalDamage: { label: 'element hasarı', pct: true, cat: 'damage' },
};

export const PASSIVE_META: Record<PassiveType, EffectMeta> = {
  fire_dmg: { label: 'ateş taşı hasarı', pct: true, cat: 'damage' },
  frost_mana: { label: 'buz taşı manası', pct: true, cat: 'resource' },
  nature_heal: { label: 'doğa iyileştirme ve kalkanı', pct: true, cat: 'resource' },
  lightning_crit: { label: 'yıldırım taşı hasarı', pct: true, cat: 'damage' },
  arcane_ulti: { label: 'arkan taşı ulti enerjisi', pct: true, cat: 'resource' },
  shield_start: { label: 'başlangıç kalkanı', pct: false, cat: 'defense' },
  combo_boost: { label: 'kombo adımı hasar çarpanı', pct: true, cat: 'damage' },
  lifesteal: { label: 'can çalma', pct: true, cat: 'defense' },
  boss_dmg: { label: 'boss hasarı', pct: true, cat: 'damage' },
  skill_power: { label: 'yetenek hasarı', pct: true, cat: 'damage' },
  golden_luck: { label: 'altın taşı şansı', pct: true, cat: 'resource' },
  start_mana: { label: 'başlangıç manası', pct: true, cat: 'resource' },
  start_ulti: { label: 'başlangıç ulti enerjisi', pct: true, cat: 'resource' },
  thorns: { label: 'diken yansıtma', pct: true, cat: 'defense' },
  weakness_exploit: { label: 'zayıflık hasarı', pct: true, cat: 'damage' },
  summon_power: { label: 'çağrı hasarı', pct: true, cat: 'damage' },
  bleed_power: { label: 'kanama hasarı', pct: true, cat: 'damage' },
  dodge_counter: { label: 'sıyrılınca karşı saldırı', pct: true, cat: 'defense' },
  storm_overload: { label: 'fırtına aşırı yükü', pct: true, cat: 'damage' },
  dragon_scale: { label: 'ejder formu hasarı', pct: true, cat: 'damage' },
  square_dmg: { label: 'kare hasarı', pct: true, cat: 'damage', long: '2×2 karede eşleşen taşların hasarı' },
  chain_dmg: { label: 'zincir hasarı', pct: true, cat: 'damage', long: 'Hamlenin 2. ve sonraki zincir adımlarındaki hasar' },
  mana_flow: { label: 'taş manası', pct: true, cat: 'resource', long: 'Taş eşleşmelerinden kazanılan mana' },
  ulti_focus: { label: 'taş ulti enerjisi', pct: true, cat: 'resource', long: 'Taş eşleşmelerinden kazanılan ulti enerjisi' },
  last_stand: { label: 'hasar azaltma', pct: true, cat: 'defense', long: 'Canın %35 ya da altındayken aldığın hasar azalır' },
  shield_boost: { label: 'kalkan', pct: true, cat: 'defense', long: 'Oluşturulan kalkan miktarı' },
  heavy_guard: { label: 'ağır saldırı hasarı azaltma', pct: true, cat: 'defense', long: 'Düşmanın planlanan ağır saldırısından alınan hasar azalır' },
  elite_dmg: { label: 'elit hasarı', pct: true, cat: 'damage', long: 'Elit düşmanlara verilen hasar' },
};

export interface NodeEffect {
  key: string;
  label: string;
  pct: boolean;
  atMax: number;
  long?: string;
}

/** Düğümün etkileri (10/10 toplamlarıyla). */
export function nodeEffects(n: SkillTreeNode): NodeEffect[] {
  const out: NodeEffect[] = [];
  const statAtMax = n.statAtMax ?? (n.statPerRank && Object.fromEntries(Object.entries(n.statPerRank).map(([k, v]) => [k, (v ?? 0) * n.maxRank])));
  if (statAtMax) {
    for (const [k, v] of Object.entries(statAtMax)) {
      if (!v) continue;
      const m = STAT_META[k as StatKey];
      out.push({ key: k, label: m.label, pct: m.pct, atMax: v });
    }
  }
  if (n.passiveEffect) {
    const m = PASSIVE_META[n.passiveEffect.type];
    out.push({ key: n.passiveEffect.type, label: m.label, pct: m.pct, atMax: n.passiveEffect.valueAtMax ?? n.passiveEffect.valuePerRank * n.maxRank, long: m.long });
  }
  return out;
}

/** Düğümün kategorisi: pasif etkisi varsa onun, yoksa ilk istatistiğin kategorisi. */
export function nodeCategory(n: SkillTreeNode): PassiveCategory {
  if (n.passiveEffect) return PASSIVE_META[n.passiveEffect.type].cat;
  const first = Object.keys(n.statAtMax ?? n.statPerRank ?? {})[0] as StatKey | undefined;
  return first ? STAT_META[first].cat : 'damage';
}

/** Türkçe sayı: gereksiz sıfır yok, ondalık virgül (en fazla 2 basamak; yalnızca gösterim için). */
export function formatNumber(v: number): string {
  const r = Math.round(v * 100) / 100;
  return r.toLocaleString('tr-TR', { maximumFractionDigits: 2 });
}

/** "+%4,5 kare hasarı" / "+22,5 can" */
export function formatEffect(e: Pick<NodeEffect, 'label' | 'pct'>, value: number): string {
  return `+${e.pct ? '%' : ''}${formatNumber(value)} ${e.label}`;
}

function describeNode(n: SkillTreeNode): string {
  const eff = nodeEffects(n);
  const long = eff.find((e) => e.long);
  const parts = eff.map((e) => formatEffect(e, e.atMax));
  return long ? `${long.long}: ${parts.join(', ')} (10/10).` : `10/10: ${parts.join(', ')}.`;
}

/** Kart metni: "3/10 · Şu an +%4,5 can · Sonraki +%6 can" (10/10'da "Maksimum"). */
export function nodeProgressText(n: SkillTreeNode, rank: number): { level: string; current: string; next: string | null; total: string } {
  const eff = nodeEffects(n);
  const at = (r: number) => eff.map((e) => formatEffect(e, scaledValue(e.atMax, r, n.maxRank))).join(', ');
  return {
    level: `${rank}/${n.maxRank}`,
    current: rank > 0 ? `Şu an ${at(rank)}` : 'Şu an etkisiz',
    next: rank < n.maxRank ? `Sonraki ${at(rank + 1)}` : null,
    total: `${n.maxRank}/${n.maxRank}: ${eff.map((e) => formatEffect(e, e.atMax)).join(', ')}`,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Eski kayıt geçişi (bir kez, kayıt sürümü 12 → 13)
// ---------------------------------------------------------------------------------------------------------------

/** Eski seviyeyi karşılayan en düşük yeni seviye: 3'lük düğümde 1→4, 2→7, 3→10; 2'lik düğümde 1→5, 2→10. */
export function legacyRankToNew(oldRank: number, legacyMaxRank: number): number {
  if (!(oldRank > 0) || !(legacyMaxRank > 0)) return 0;
  if (oldRank >= legacyMaxRank) return PASSIVE_MAX_RANK;
  return Math.min(PASSIVE_MAX_RANK, Math.ceil((oldRank * PASSIVE_MAX_RANK) / legacyMaxRank - 1e-9));
}

/**
 * Bir kahramanın eski yatırımlarını yeni ölçeğe taşır. Harcanmamış puanlardan kesinti yapılmaz. Yeni puan kazanım hızına
 * (seviye başına 3) göre eksik kalan puan bütçesi harcanmamış puan olarak eklenir; fazla yatırım asla geri alınmaz.
 */
export function migrateHeroPassives(
  tree: readonly SkillTreeNode[],
  hero: { level: number; skillPoints: number; skillRanks: Record<string, number> }
): { skillRanks: Record<string, number>; skillPoints: number; topUp: number } {
  const ranks: Record<string, number> = {};
  for (const [id, r] of Object.entries(hero.skillRanks ?? {})) {
    const node = tree.find((n) => n.id === id);
    const legacyMax = node?.legacy?.maxRank;
    if (!node || !legacyMax) {
      if (r > 0) ranks[id] = Math.min(PASSIVE_MAX_RANK, Math.floor(r)); // bilinmeyen kimlik: olduğu gibi (en fazla 10)
      continue;
    }
    const nr = legacyRankToNew(Math.floor(r), legacyMax);
    if (nr > 0) ranks[id] = nr;
  }
  const unspent = Math.max(0, Math.floor(hero.skillPoints ?? 0));
  const spent = Object.values(ranks).reduce((a, b) => a + b, 0);
  const topUp = Math.max(0, skillPointBudget(hero.level) - (spent + unspent));
  return { skillRanks: ranks, skillPoints: unspent + topUp, topUp };
}

// ---------------------------------------------------------------------------------------------------------------
// Ortak Ustalık pasifleri
// ---------------------------------------------------------------------------------------------------------------

const common = (id: string, name: string, type: PassiveType, atMax: number): SkillTreeNode => {
  const node: SkillTreeNode = {
    id,
    name,
    description: '',
    branch: 'common',
    tier: 1,
    maxRank: PASSIVE_MAX_RANK,
    passiveEffect: { type, valueAtMax: atMax, valuePerRank: atMax / PASSIVE_MAX_RANK },
  };
  return { ...node, description: describeNode(node) };
};

/**
 * Ortak Ustalık pasifleri (her kahramanda aynı; değerler 10/10 toplamıdır).
 * Oyunda birebir karşılığı olan iki öneri değiştirildi: "Boss Avcısı" (mevcut boss hasarı pasifiyle aynı) yerine Elit Avcısı,
 * "Yaşam Bağı" (Yaşam seti 2 parça bonusuyla aynı: yalnızca doğa iyileştirmesi) yerine Son Direniş.
 */
export const COMMON_PASSIVES: readonly SkillTreeNode[] = [
  common('cm_square', 'Kare Ustalığı', 'square_dmg', 12),
  common('cm_chain', 'Zincir Gücü', 'chain_dmg', 10),
  common('cm_mana', 'Mana Akışı', 'mana_flow', 10),
  common('cm_ulti', 'Ulti Odağı', 'ulti_focus', 10),
  common('cm_last_stand', 'Son Direniş', 'last_stand', 12),
  common('cm_barrier', 'Sağlam Bariyer', 'shield_boost', 12),
  common('cm_heavy_guard', 'Ağır Darbe Savunması', 'heavy_guard', 10),
  common('cm_elite', 'Elit Avcısı', 'elite_dmg', 8),
];

/** Kahramanın ağacı: kendi (ölçeklenmiş) pasifleri + ortak Ustalık pasifleri. */
export function buildPassiveTree(classTree: readonly SkillTreeNode[]): SkillTreeNode[] {
  return [...classTree.map(scaleLegacyNode), ...COMMON_PASSIVES];
}
