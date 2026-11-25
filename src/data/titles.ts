/**
 * Unvan Sistemi — merkezi veri dosyası.
 *
 * Her unvan: kimlik, ad, açıklama, nadirlik, kategori, sembol ve şart (tür + hedef). Şartlar `TITLE_CONDITIONS` kayıt
 * defterindeki değerlendiricilerle kayıttan okunur; yeni unvan eklemek için listeye bir satır, yeni bir şart türü için
 * kayıt defterine bir fonksiyon eklemek yeterlidir. Değerlendiricisi olmayan (henüz oyunda bulunmayan özellik) şart türü
 * hiçbir zaman açılmaz; özellik eklenip değerlendirici yazılınca kendiliğinden etkinleşir.
 *
 * Unvanlar kozmetiktir; aktif unvan savaş özelliklerini değiştirmez. Kazanılan unvan SAYISINA bağlı küçük kalıcı
 * koleksiyon bonusları (`TITLE_COLLECTION_BONUSES`) sabit eşiklerle tanımlıdır; yeni unvanlar eşikleri değiştirmez.
 */
import { WORLD_REGIONS } from './world';
import { stageStars, totalMastery } from './mastery';
import { COSTUMES, isCostumeUnlocked } from './costumes';
import { getAllSetProgress } from './sets';
import { AWAKEN_LEVEL_REQ, AWAKEN_MAX_TIER } from './awakening';
import type { BossId, GameSaveState } from '../types/game';

export type TitleRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
export type TitleCategory = 'exploration' | 'combat' | 'boss' | 'hero' | 'companion' | 'dungeon';
/** Sembol anahtarı (arayüzde lucide simgesine eşlenir) */
export type TitleIcon = 'compass' | 'map' | 'star' | 'sword' | 'zap' | 'grid' | 'flame' | 'heart' | 'shield' | 'crown' | 'snowflake' | 'dragon' | 'skull' | 'user' | 'users' | 'sparkles' | 'hammer' | 'shirt' | 'paw' | 'castle' | 'tower' | 'infinity';

export const TITLE_RARITIES: Record<TitleRarity, { name: string; color: string; glow: string; rank: number }> = {
  common: { name: 'Sıradan', color: '#e2e8f0', glow: '#94a3b8', rank: 0 },
  rare: { name: 'Nadir', color: '#60a5fa', glow: '#3b82f6', rank: 1 },
  epic: { name: 'Epik', color: '#c084fc', glow: '#a855f7', rank: 2 },
  legendary: { name: 'Efsanevi', color: '#fb923c', glow: '#f97316', rank: 3 },
  mythic: { name: 'Mitik', color: '#fbbf24', glow: '#ef4444', rank: 4 },
};
export const TITLE_RARITY_IDS: TitleRarity[] = ['common', 'rare', 'epic', 'legendary', 'mythic'];

export const TITLE_CATEGORIES: Record<TitleCategory, { name: string; icon: TitleIcon }> = {
  combat: { name: 'Savaş', icon: 'sword' },
  exploration: { name: 'Keşif', icon: 'compass' },
  boss: { name: 'Boss', icon: 'crown' },
  hero: { name: 'Kahraman', icon: 'user' },
  companion: { name: 'Yoldaş', icon: 'paw' },
  dungeon: { name: 'Zindan & Kule', icon: 'tower' },
};
export const TITLE_CATEGORY_IDS: TitleCategory[] = ['combat', 'exploration', 'boss', 'hero', 'companion', 'dungeon'];

/** Şart türleri. `param`: türe özel ek bilgi (ör. boss kimliği). */
export type TitleConditionKind =
  | 'stage_order' | 'mastery_stars' | 'all_three_stars'
  | 'wins' | 'best_combo' | 'squares' | 'weak_hits' | 'comeback_wins' | 'flawless_wins' | 'ulti_boss_kills'
  | 'boss_defeated' | 'frost_barrier_win' | 'distinct_bosses'
  | 'hero_max_level' | 'heroes_unlocked' | 'awakened_heroes' | 'max_awakened_heroes' | 'upgrades' | 'all_mythic_slots' | 'set_max_bonus' | 'costumes'
  | 'companions' | 'companion_triggers'
  | 'dungeon_clears' | 'hunt_wins' | 'tower_floor'
  | 'titles_earned';

export interface TitleDef {
  id: string;
  name: string;
  description: string;
  rarity: TitleRarity;
  category: TitleCategory;
  icon: TitleIcon;
  condition: { kind: TitleConditionKind; target: number; param?: string };
  /** İlerleme satırı etiketi (ör. "En iyi kombo") */
  progressLabel?: string;
}

const T = (
  id: string, name: string, description: string, rarity: TitleRarity, category: TitleCategory, icon: TitleIcon,
  kind: TitleConditionKind, target: number, param?: string, progressLabel?: string
): TitleDef => ({ id, name, description, rarity, category, icon, condition: { kind, target, param }, progressLabel });

/** İlk sürümün 50 unvanı (sıra = kimlik sırası; yeni unvanlar sona eklenir). */
export const TITLES: readonly TitleDef[] = [
  // Keşif
  T('first_step', 'İlk Adım', '1. aşamayı tamamla.', 'common', 'exploration', 'compass', 'stage_order', 1),
  T('adventurer', 'Maceracı', '25. aşamayı tamamla.', 'common', 'exploration', 'compass', 'stage_order', 25),
  T('wanderer', 'Gezgin', '50. aşamayı tamamla.', 'rare', 'exploration', 'map', 'stage_order', 50),
  T('veteran_explorer', 'Kıdemli Kaşif', '100. aşamayı tamamla.', 'rare', 'exploration', 'map', 'stage_order', 100),
  T('realm_conqueror', 'Diyarların Fatihi', '250. aşamayı tamamla.', 'epic', 'exploration', 'map', 'stage_order', 250),
  T('world_conqueror', 'Dünya Fatihi', '500. aşamayı tamamla.', 'legendary', 'exploration', 'map', 'stage_order', 500),
  T('star_hunter', 'Yıldız Avcısı', '100 ustalık yıldızı kazan.', 'rare', 'exploration', 'star', 'mastery_stars', 100, undefined, 'Yıldız'),
  T('star_keeper', 'Yıldız Muhafızı', '500 ustalık yıldızı kazan.', 'epic', 'exploration', 'star', 'mastery_stars', 500, undefined, 'Yıldız'),
  T('star_lord', 'Yıldızların Efendisi', '1000 ustalık yıldızı kazan.', 'legendary', 'exploration', 'star', 'mastery_stars', 1000, undefined, 'Yıldız'),
  T('flawless_explorer', 'Kusursuz Kaşif', 'Mevcut 500 aşamanın tamamını üç yıldızla bitir.', 'mythic', 'exploration', 'star', 'all_three_stars', 500, undefined, '3 yıldızlı aşama'),
  // Savaş
  T('monster_hunter', 'Canavar Avcısı', '100 savaş kazan.', 'common', 'combat', 'sword', 'wins', 100, undefined, 'Zafer'),
  T('invincible', 'Yenilmez Savaşçı', '500 savaş kazan.', 'rare', 'combat', 'sword', 'wins', 500, undefined, 'Zafer'),
  T('war_lord', 'Savaşın Efendisi', '2500 savaş kazan.', 'epic', 'combat', 'sword', 'wins', 2500, undefined, 'Zafer'),
  T('combo_master', 'Kombo Ustası', 'Tek hamlede 5 zincir oluştur.', 'epic', 'combat', 'zap', 'best_combo', 5, undefined, 'En iyi kombo'),
  T('combo_legend', 'Kombo Efsanesi', 'Tek hamlede 8 zincir oluştur.', 'legendary', 'combat', 'zap', 'best_combo', 8, undefined, 'En iyi kombo'),
  T('square_master', 'Kare Ustası', 'Toplam 500 adet 2×2 kare eşleşmesi oluştur.', 'rare', 'combat', 'grid', 'squares', 500, undefined, 'Kare'),
  T('element_lord', 'Element Efendisi', 'Düşman zayıflığından toplam 1000 kez faydalan.', 'rare', 'combat', 'flame', 'weak_hits', 1000, undefined, 'Zayıflık isabeti'),
  T('back_from_death', 'Ölümden Dönen', 'Canın %5 veya altındayken bir savaş kazan.', 'epic', 'combat', 'heart', 'comeback_wins', 1),
  T('flawless_victory', 'Kusursuz Zafer', 'Önerilen seviyene uygun bir elit veya boss savaşını hasar almadan kazan.', 'epic', 'combat', 'shield', 'flawless_wins', 1),
  T('final_blow', 'Son Darbe', 'Tek bir ulti kullanımıyla bir bossu yen.', 'rare', 'combat', 'zap', 'ulti_boss_kills', 1),
  // Boss
  T('forest_guardian', 'Orman Muhafızı', 'Kadim Orman Muhafızı’nı yen.', 'common', 'boss', 'crown', 'boss_defeated', 1, 'forest_guardian'),
  T('ice_breaker', 'Buz Kıran', 'Buz Kraliçesi’nin bariyerini kır ve savaşı kazan.', 'rare', 'boss', 'snowflake', 'frost_barrier_win', 1),
  T('dragon_slayer', 'Ejderha Avcısı', 'Cehennem Ejderhası’nı yen.', 'rare', 'boss', 'dragon', 'boss_defeated', 1, 'infernal_dragon'),
  T('titan_slayer', 'Titan Katili', 'Kristal Titan’ı yen.', 'rare', 'boss', 'crown', 'boss_defeated', 1, 'crystal_titan'),
  T('abyss_ruler', 'Uçurumun Hükümdarı', 'Uçurum Kralı Malakor’u yen.', 'epic', 'boss', 'skull', 'boss_defeated', 1, 'abyssal_king'),
  T('boss_hunter', 'Boss Avcısı', '25 farklı bossu yen.', 'epic', 'boss', 'skull', 'distinct_bosses', 25, undefined, 'Farklı boss'),
  T('boss_nightmare', 'Bossların Kabusu', '50 farklı bossu yen.', 'legendary', 'boss', 'skull', 'distinct_bosses', 50, undefined, 'Farklı boss'),
  // Kahraman ve ekipman
  T('master_warrior', 'Usta Savaşçı', 'Bir kahramanı maksimum seviyeye ulaştır.', 'rare', 'hero', 'user', 'hero_max_level', AWAKEN_LEVEL_REQ, undefined, 'En yüksek seviye'),
  T('hero_collector', 'Kahraman Koleksiyoncusu', '10 farklı kahraman aç.', 'rare', 'hero', 'users', 'heroes_unlocked', 10, undefined, 'Kahraman'),
  T('army_of_legends', 'Efsaneler Ordusu', '22 farklı kahraman aç.', 'legendary', 'hero', 'users', 'heroes_unlocked', 22, undefined, 'Kahraman'),
  T('first_awakening', 'İlk Uyanış', 'Bir kahramanın ilk uyanışını gerçekleştir.', 'rare', 'hero', 'sparkles', 'awakened_heroes', 1),
  T('divine_hero', 'İlahi Kahraman', 'Bir kahramanı maksimum uyanış kademesine ulaştır.', 'legendary', 'hero', 'sparkles', 'max_awakened_heroes', 1, undefined, 'Kademe V kahraman'),
  T('awakened_legends', 'Uyanmış Efsaneler', '5 farklı kahramanı maksimum uyanışa ulaştır.', 'mythic', 'hero', 'sparkles', 'max_awakened_heroes', 5, undefined, 'Kademe V kahraman'),
  T('master_smith', 'Demirci Ustası', '100 ekipman geliştirmesi gerçekleştir.', 'rare', 'hero', 'hammer', 'upgrades', 100, undefined, 'Geliştirme'),
  T('perfect_gear', 'Kusursuz Donanım', 'Bir kahramanın bütün ekipman yuvalarını mitik kalitede ekipmanla doldur.', 'legendary', 'hero', 'shield', 'all_mythic_slots', 10, undefined, 'Mitik yuva'),
  T('set_master', 'Set Ustası', 'Bir ekipman setinin maksimum parça bonusunu etkinleştir.', 'epic', 'hero', 'shield', 'set_max_bonus', 4, undefined, 'Set parçası'),
  T('fashion_legend', 'Moda Efsanesi', '20 farklı kostüm aç.', 'epic', 'hero', 'shirt', 'costumes', 20, undefined, 'Kostüm'),
  // Yoldaş
  T('loyal_friend', 'Sadık Dost', 'İlk yoldaşını aç.', 'common', 'companion', 'paw', 'companions', 1),
  T('companion_collector', 'Yoldaş Koleksiyoncusu', '6 farklı yoldaş aç.', 'epic', 'companion', 'paw', 'companions', 6, undefined, 'Yoldaş'),
  T('friend_of_nature', 'Doğanın Dostu', 'Yoldaş yeteneklerini toplam 250 kez tetikle.', 'rare', 'companion', 'paw', 'companion_triggers', 250, undefined, 'Tetikleme'),
  T('spirit_guardian', 'Ruhların Muhafızı', 'Yoldaş yeteneklerini toplam 1000 kez tetikle.', 'epic', 'companion', 'paw', 'companion_triggers', 1000, undefined, 'Tetikleme'),
  // Zindan ve kule
  T('dungeon_explorer', 'Zindan Kaşifi', 'Bir Seçimli Zindan tamamla.', 'common', 'dungeon', 'castle', 'dungeon_clears', 1),
  T('dungeon_conqueror', 'Zindan Fatihi', '25 Seçimli Zindan tamamla.', 'rare', 'dungeon', 'castle', 'dungeon_clears', 25, undefined, 'Zindan'),
  T('dungeon_ruler', 'Zindan Hükümdarı', '100 Seçimli Zindan tamamla.', 'epic', 'dungeon', 'castle', 'dungeon_clears', 100, undefined, 'Zindan'),
  T('arena_hunter', 'Arena Avcısı', '50 Boss Avı kazan.', 'epic', 'dungeon', 'crown', 'hunt_wins', 50, undefined, 'Av zaferi'),
  T('tower_climber', 'Kule Tırmanıcısı', 'Sonsuzluk Kulesi’nin 25. katını tamamla.', 'rare', 'dungeon', 'tower', 'tower_floor', 25, undefined, 'Kat'),
  T('tower_keeper', 'Kule Muhafızı', 'Sonsuzluk Kulesi’nin 50. katını tamamla.', 'epic', 'dungeon', 'tower', 'tower_floor', 50, undefined, 'Kat'),
  T('tower_legend', 'Kule Efsanesi', 'Sonsuzluk Kulesi’nin 75. katını tamamla.', 'legendary', 'dungeon', 'tower', 'tower_floor', 75, undefined, 'Kat'),
  T('tower_conqueror', 'Kule Fatihi', 'Sonsuzluk Kulesi’nin 100. katını tamamla.', 'legendary', 'dungeon', 'tower', 'tower_floor', 100, undefined, 'Kat'),
  T('lord_of_infinity', 'Sonsuzluğun Efendisi', 'İlk 49 unvanın tamamını kazan.', 'mythic', 'dungeon', 'infinity', 'titles_earned', 49, undefined, 'Unvan'),
];

const BY_ID = new Map(TITLES.map((t) => [t.id, t]));
export const titleById = (id: string | null | undefined): TitleDef | null => (id ? BY_ID.get(id) ?? null : null);
/** "Sonsuzluğun Efendisi" için sayılan unvanlar: ilk 49 (sabit; yeni unvanlar bu listeye girmez) */
export const FIRST_49_TITLE_IDS: readonly string[] = TITLES.slice(0, 49).map((t) => t.id);

// ---------------------------------------------------------------------------
// Kayıt
// ---------------------------------------------------------------------------

/** Unvan sayaçları (eski kayıtlarda tutulmamış istatistikler; 0'dan başlar, tahminle doldurulmaz). */
export interface TitleStats {
  squares: number;
  weakHits: number;
  companionTriggers: number;
  comebackWins: number;
  flawlessWins: number;
  ultiBossKills: number;
  frostBarrierWins: number;
}

export interface TitleSave {
  /** Kazanılan unvan kimlikleri (kazanılma sırasıyla) */
  earned: string[];
  /** Aktif unvan (yoksa null) */
  active: string | null;
  /** Henüz görülmemiş yeni unvanlar (menü bildirimi) */
  unseen: string[];
  stats: TitleStats;
}

export const emptyTitleStats = (): TitleStats => ({ squares: 0, weakHits: 0, companionTriggers: 0, comebackWins: 0, flawlessWins: 0, ultiBossKills: 0, frostBarrierWins: 0 });
export const emptyTitleSave = (): TitleSave => ({ earned: [], active: null, unseen: [], stats: emptyTitleStats() });

export function sanitizeTitles(value: unknown): TitleSave {
  const v = (value && typeof value === 'object' ? value : {}) as Partial<Record<keyof TitleSave, unknown>>;
  const ids = (x: unknown) => (Array.isArray(x) ? [...new Set(x.filter((i): i is string => typeof i === 'string' && BY_ID.has(i)))] : []);
  const earned = ids(v.earned);
  const st = (v.stats && typeof v.stats === 'object' ? v.stats : {}) as Partial<Record<keyof TitleStats, unknown>>;
  const n = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) && x > 0 ? Math.min(1e9, Math.floor(x)) : 0);
  const stats = emptyTitleStats();
  (Object.keys(stats) as (keyof TitleStats)[]).forEach((k) => (stats[k] = n(st[k])));
  const active = typeof v.active === 'string' && earned.includes(v.active) ? v.active : null;
  return { earned, active, unseen: ids(v.unseen).filter((i) => earned.includes(i)), stats };
}

// ---------------------------------------------------------------------------
// Şart değerlendiricileri (kayıt defteri)
// ---------------------------------------------------------------------------

const ROUTE_IDS = WORLD_REGIONS.flatMap((r) => r.stages.map((s) => s.id));
const SLOT_COUNT = 10;

type Evaluator = (save: GameSaveState, def: TitleDef) => number;

const heroes = (s: GameSaveState) => Object.values(s.heroes);
const stats = (s: GameSaveState): TitleStats => s.titles?.stats ?? emptyTitleStats();

export const TITLE_CONDITIONS: Partial<Record<TitleConditionKind, Evaluator>> = {
  // Hedef: rotadaki o sıradaki aşama tamamlandı mı (1/0)
  stage_order: (s, d) => (s.completedStages.includes(ROUTE_IDS[d.condition.target - 1]) ? d.condition.target : Math.min(d.condition.target - 1, completedOnRoute(s))),
  mastery_stars: (s) => totalMastery(s).stars,
  all_three_stars: (s) => threeStarStages(s),
  wins: (s) => s.stats.enemiesDefeated,
  best_combo: (s) => s.stats.highestCombo,
  squares: (s) => stats(s).squares,
  weak_hits: (s) => stats(s).weakHits,
  comeback_wins: (s) => stats(s).comebackWins,
  flawless_wins: (s) => stats(s).flawlessWins,
  ulti_boss_kills: (s) => stats(s).ultiBossKills,
  boss_defeated: (s, d) => (s.bossVictories.includes(d.condition.param as BossId) ? 1 : 0),
  frost_barrier_win: (s) => stats(s).frostBarrierWins,
  distinct_bosses: (s) => new Set(s.bossVictories).size,
  hero_max_level: (s) => Math.max(...heroes(s).map((h) => h.level)),
  heroes_unlocked: (s) => new Set(s.heroUnlocks).size,
  awakened_heroes: (s) => heroes(s).filter((h) => (h.awakening ?? 0) >= 1).length,
  max_awakened_heroes: (s) => heroes(s).filter((h) => (h.awakening ?? 0) >= AWAKEN_MAX_TIER).length,
  upgrades: (s) => s.stats.itemsUpgraded,
  all_mythic_slots: (s) => Math.max(0, ...heroes(s).map((h) => Object.values(h.equipped ?? {}).filter((it) => it && it.rarity === 'mythic').length)),
  set_max_bonus: (s) => Math.max(0, ...heroes(s).flatMap((h) => getAllSetProgress(h.equipped).map((p) => p.count))),
  costumes: (s) => COSTUMES.filter((c) => isCostumeUnlocked(s.heroUnlocks, c)).length,
  companions: (s) => s.companions?.unlocked?.length ?? 0,
  companion_triggers: (s) => stats(s).companionTriggers,
  dungeon_clears: (s) => Object.values(s.dungeons ?? {}).reduce((n, d) => n + (d?.completions ?? 0), 0),
  hunt_wins: (s) => Object.values(s.huntRecords ?? {}).reduce((n, r) => n + (r?.wins ?? 0), 0),
  tower_floor: (s) => s.tower?.highest ?? 0,
  titles_earned: (s) => FIRST_49_TITLE_IDS.filter((id) => s.titles?.earned?.includes(id)).length,
};

function completedOnRoute(s: GameSaveState): number {
  const set = new Set(s.completedStages);
  let i = 0;
  while (i < ROUTE_IDS.length && set.has(ROUTE_IDS[i])) i++;
  return i;
}

const threeStarStages = (s: GameSaveState): number => ROUTE_IDS.filter((id) => stageStars(s, id).count >= 3).length;

export interface TitleProgress {
  current: number;
  target: number;
  done: boolean;
  /** Şart türü oyunda henüz değerlendirilemiyor */
  unavailable: boolean;
}

/** `cache`: aynı kayıt için tür başına değeri bir kez hesaplar (ör. 500 aşamalık yıldız sayımı). */
export function titleProgress(save: GameSaveState, def: TitleDef, cache?: Map<string, number>): TitleProgress {
  const ev = TITLE_CONDITIONS[def.condition.kind];
  const target = def.condition.target;
  if (!ev) return { current: 0, target, done: false, unavailable: true };
  // stage_order hedefe bağlı; diğerleri tür (+param) başına
  const key = def.condition.kind === 'stage_order' ? `${def.condition.kind}:${target}` : `${def.condition.kind}:${def.condition.param ?? ''}`;
  let value = cache?.get(key);
  if (value === undefined) {
    value = ev(save, def);
    cache?.set(key, value);
  }
  const current = Math.max(0, value);
  return { current: Math.min(current, target), target, done: current >= target, unavailable: false };
}

/**
 * Kaydı unvanlarla eşitler: şartı sağlanan ama kazanılmamış unvanlar eklenir (tek güncelleme). Kazanılmış unvan tekrar
 * verilmez; "Sonsuzluğun Efendisi" aynı geçişte açılan diğer unvanları da sayar. `silent`: bildirim gösterilmeyecek
 * (eski kayıt ilk yükleme) — yine de menü noktası için `unseen`e eklenir.
 */
export function syncTitles(save: GameSaveState): { save: GameSaveState; newly: string[] } {
  const ts = sanitizeTitles(save.titles);
  const earned = new Set(ts.earned);
  const newly: string[] = [];
  // İki geçiş: titles_earned diğer unvanlara bağlı
  for (let pass = 0; pass < 2; pass++) {
    const view: GameSaveState = { ...save, titles: { ...ts, earned: [...earned] } };
    const cache = new Map<string, number>();
    for (const def of TITLES) {
      if (earned.has(def.id)) continue;
      if (def.condition.kind === 'titles_earned') cache.delete('titles_earned:');
      if (titleProgress(view, def, cache).done) {
        earned.add(def.id);
        newly.push(def.id);
      }
    }
  }
  if (newly.length === 0) return { save: save.titles === ts ? save : { ...save, titles: ts }, newly };
  return { save: { ...save, titles: { ...ts, earned: [...ts.earned, ...newly], unseen: [...ts.unseen, ...newly] } }, newly };
}

/** Aktif unvanı seç / kaldır. Kilitli unvan seçilemez. */
export function setActiveTitle(save: GameSaveState, id: string | null): { save: GameSaveState; ok: boolean } {
  const ts = sanitizeTitles(save.titles);
  if (id !== null && !ts.earned.includes(id)) return { save, ok: false };
  return { save: { ...save, titles: { ...ts, active: id } }, ok: true };
}

export const markTitlesSeen = (save: GameSaveState): GameSaveState =>
  save.titles?.unseen?.length ? { ...save, titles: { ...sanitizeTitles(save.titles), unseen: [] } } : save;

// ---------------------------------------------------------------------------
// Savaş sonu istatistikleri
// ---------------------------------------------------------------------------

export interface BattleTitleReport {
  victory: boolean;
  /** Bu savaşta oluşan 2×2 kareler, zayıflık isabetleri ve yoldaş tetiklemeleri (savaş sonunda bir kez sayılır) */
  squares: number;
  weakHits: number;
  companionTriggers: number;
  /** Kahramanın savaş boyunca aldığı gerçek can hasarı (iyileştirme düşmez) */
  damageTaken: number;
  /** Zafer anında can oranı (0–1) */
  hpRatio: number;
  /** Bossu bitiren eylem ulti miydi */
  ultiKill: boolean;
  /** Buz bariyeri bu savaşta kırıldı mı */
  barrierBroken: boolean;
  isBoss: boolean;
  isElite: boolean;
  bossId?: string;
  /** Aşamanın önerilen seviyesi ve kahramanın seviyesi */
  recommendedLevel: number;
  heroLevel: number;
  /** Dünya Haritası / lig dışı zaferler (genel zafer sayacına burada eklenir) */
  countWin: boolean;
}

/** "Önerilen seviyene uygun": aşamanın önerilen seviyesi kahramanın seviyesinin en fazla 3 altında. */
export const FLAWLESS_LEVEL_MARGIN = 3;

export function applyBattleReport(save: GameSaveState, r: BattleTitleReport): GameSaveState {
  const ts = sanitizeTitles(save.titles);
  const st = { ...ts.stats };
  st.squares += Math.max(0, Math.floor(r.squares));
  st.weakHits += Math.max(0, Math.floor(r.weakHits));
  st.companionTriggers += Math.max(0, Math.floor(r.companionTriggers));
  if (r.victory) {
    if (r.hpRatio > 0 && r.hpRatio <= 0.05) st.comebackWins += 1;
    if ((r.isBoss || r.isElite) && r.damageTaken <= 0 && r.recommendedLevel >= r.heroLevel - FLAWLESS_LEVEL_MARGIN) st.flawlessWins += 1;
    if (r.isBoss && r.ultiKill) st.ultiBossKills += 1;
    if (r.bossId === 'frost_queen' && r.barrierBroken) st.frostBarrierWins += 1;
  }
  return {
    ...save,
    titles: { ...ts, stats: st },
    stats: r.victory && r.countWin ? { ...save.stats, enemiesDefeated: save.stats.enemiesDefeated + 1 } : save.stats,
  };
}

// ---------------------------------------------------------------------------
// Koleksiyon bonusları (kazanılan unvan sayısına göre; sabit eşikler)
// ---------------------------------------------------------------------------

export interface AccountBonus {
  hpPct: number;
  atkPct: number;
  defPct: number;
  manaPct: number;
}

export const TITLE_COLLECTION_BONUSES: ReadonlyArray<{ count: number; bonus: Partial<AccountBonus> }> = [
  { count: 5, bonus: { hpPct: 1 } },
  { count: 10, bonus: { atkPct: 1 } },
  { count: 15, bonus: { defPct: 1 } },
  { count: 20, bonus: { hpPct: 1 } },
  { count: 25, bonus: { atkPct: 1 } },
  { count: 30, bonus: { defPct: 1 } },
  { count: 35, bonus: { manaPct: 1 } },
  { count: 40, bonus: { hpPct: 1 } },
  { count: 45, bonus: { atkPct: 1 } },
  { count: 50, bonus: { hpPct: 1, atkPct: 1, defPct: 1 } },
];

export const emptyAccountBonus = (): AccountBonus => ({ hpPct: 0, atkPct: 0, defPct: 0, manaPct: 0 });

export function collectionBonus(earnedCount: number): AccountBonus {
  const out = emptyAccountBonus();
  for (const t of TITLE_COLLECTION_BONUSES) {
    if (earnedCount < t.count) continue;
    out.hpPct += t.bonus.hpPct ?? 0;
    out.atkPct += t.bonus.atkPct ?? 0;
    out.defPct += t.bonus.defPct ?? 0;
    out.manaPct += t.bonus.manaPct ?? 0;
  }
  return out;
}

/** Kayıttaki hesap bonusu (kahraman yapısı ve savaş gücü hesabına verilir). */
export const accountBonusOf = (save: Pick<GameSaveState, 'titles'>): AccountBonus => collectionBonus(save.titles?.earned?.length ?? 0);

export const nextCollectionThreshold = (earnedCount: number) => TITLE_COLLECTION_BONUSES.find((t) => t.count > earnedCount) ?? null;

export const TITLE_SLOT_COUNT = SLOT_COUNT;
