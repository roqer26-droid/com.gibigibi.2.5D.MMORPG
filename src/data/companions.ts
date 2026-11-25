import type { GameSaveState, HeroClassId, RegionId, StageDef } from '../types/game';
import type { CompanionId, CompanionSave } from '../types/game';

/**
 * Yoldaşlar: parça + boss zaferi ile kalıcı açılır, her kahraman için tek aktif yoldaş seçilir.
 * Tüm sayılar ilk denge değerleridir ve burada ayarlanır.
 */

export type BossRequirement =
  | { mode: 'dungeon'; dungeonId: 'roots_vault'; modeLabel: string; arenaLabel: string; bossName: string; bossAcc: string; bossId: string }
  | { mode: 'hunt'; huntId: 'frozen_throne' | 'ash_arena'; modeLabel: string; arenaLabel: string; bossName: string; bossAcc: string; bossId: string }
  /** Dünya Haritası hikâye bossu: aşama kimliği tamamlanmış aşamalar listesinde olmalı (tekrar gerekmez) */
  | { mode: 'story'; stageId: string; modeLabel: string; arenaLabel: string; bossName: string; bossAcc: string; bossId: string };

export interface CompanionDef {
  id: CompanionId;
  name: string;
  partName: string;
  /** Açmak için gereken parça sayısı */
  partsNeeded: number;
  /** Parçaların geldiği bölge */
  regionId: RegionId;
  regionName: string;
  /** Bölgenin her elit savaş zaferinde (tekrarlar dahil) verilen parça */
  eliteParts: number;
  /** Bölge ustalık sandığı başına ek parça (anahtar = sandık sırası: 1 = ikinci sandık, 2 = üçüncü sandık) */
  chestParts: Record<number, number>;
  boss: BossRequirement;
  effectTitle: string;
  effectText: string;
}

/** Savaş etkisi sabitleri (savaş motoru bunları kullanır) */
export const COMPANION_EFFECTS = {
  /** Kök Filizi: can oranı bu eşiğin altındayken (eşleşmenin iyileştirmesinden önce kontrol edilir) */
  sproutHpThreshold: 0.4,
  /** Kök Filizi: ek iyileştirme (maksimum canın oranı) */
  sproutHealPct: 0.1,
  /** Buz Tilkisi: ağır saldırının hasarından karşılanan oran */
  foxAbsorbPct: 0.35,
  /** Köz Ejderciği: yanma süresi (tur) ve tur başına hasar (kahramanın saldırı değerinin oranı) */
  emberBurnTurns: 2,
  emberBurnAtkPct: 0.15,
  /** Fırtına Baykuşu: savaşın ilk üçlü zincirinde (kaskadın 3. adımı) kahramanın saldırı değerinin bu oranı kadar yıldırım hasarı */
  owlChainStep: 3,
  owlAtkPct: 0.5,
  /** Obsidyen Kaplumbağası: can bu oranın altına ilk düştüğünde maksimum canın bu oranı kadar kalkan */
  tortoiseHpThreshold: 0.3,
  tortoiseShieldPct: 0.12,
  /** Ay Güvesi: ilk arcane 2×2 kare eşleşmesinde en yüksek ulti enerjisinin bu oranı */
  mothUltiPct: 0.15,
} as const;

export const COMPANIONS: CompanionDef[] = [
  {
    id: 'root_sprout',
    name: 'Kök Filizi',
    partName: 'Kök Parçası',
    partsNeeded: 24,
    regionId: 'forest',
    regionName: 'Büyülü Orman',
    eliteParts: 2,
    chestParts: { 1: 4, 2: 6 },
    boss: {
      mode: 'dungeon',
      dungeonId: 'roots_vault',
      modeLabel: 'Seçimli Zindanlar',
      arenaLabel: 'Köklerin Mahzeni',
      bossName: 'Kadim Orman Muhafızı',
      bossAcc: 'Kadim Orman Muhafızı’nı',
      bossId: 'forest_guardian',
    },
    effectTitle: 'Filizin Şifası',
    effectText: 'Canın %40’ın altındayken yaptığın ilk doğa eşleşmesi, maksimum canının %10’u kadar ek iyileştirme verir.',
  },
  {
    id: 'ice_fox',
    name: 'Buz Tilkisi',
    partName: 'Buz Parçası',
    partsNeeded: 32,
    regionId: 'mountains',
    regionName: 'Donmuş Dağlar',
    eliteParts: 2,
    chestParts: { 1: 4, 2: 6 },
    boss: {
      mode: 'hunt',
      huntId: 'frozen_throne',
      modeLabel: 'Boss Avları',
      arenaLabel: 'Donmuş Taht',
      bossName: 'Buz Kraliçesi',
      bossAcc: 'Buz Kraliçesi’ni',
      bossId: 'frost_queen',
    },
    effectTitle: 'Buz Kalkanı',
    effectText: 'Düşman ağır saldırı hazırlarken yaptığın ilk buz eşleşmesi Tilki’yi hazırlar. O ağır saldırı gerçekleştiğinde hasarın %35’ini karşılar.',
  },
  {
    id: 'ember_whelp',
    name: 'Köz Ejderciği',
    partName: 'Köz Parçası',
    partsNeeded: 40,
    regionId: 'volcano',
    regionName: 'Volkanik Topraklar',
    eliteParts: 2,
    chestParts: { 1: 4, 2: 6 },
    boss: {
      mode: 'hunt',
      huntId: 'ash_arena',
      modeLabel: 'Boss Avları',
      arenaLabel: 'Kül Arenası',
      bossName: 'Cehennem Ejderhası',
      bossAcc: 'Cehennem Ejderhası’nı',
      bossId: 'infernal_dragon',
    },
    effectTitle: 'Köz Nefesi',
    effectText: 'İlk 2×2 kare eşleşmesi düşmana iki turluk yanma uygular. Her turdaki yanma, saldırı değerinin %15’i kadar hasar verir.',
  },
  {
    id: 'storm_owl',
    name: 'Fırtına Baykuşu',
    partName: 'Fırtına Tüyü',
    partsNeeded: 48,
    regionId: 'sky',
    regionName: 'Gök Kalesi',
    eliteParts: 3,
    chestParts: { 1: 6, 2: 9 },
    boss: {
      mode: 'story',
      stageId: 'sky_8',
      modeLabel: 'Dünya Haritası',
      arenaLabel: 'Gök Kalesi',
      bossName: 'Gök Tiranı Zephyros',
      bossAcc: 'Gök Tiranı Zephyros’u',
      bossId: 'sky_tyrant',
    },
    effectTitle: 'Fırtına Pençesi',
    effectText: 'Savaşta ilk üçlü zincir oluştuğunda bir kez düşmana saldırı değerinin %50’si kadar ek yıldırım hasarı verir.',
  },
  {
    id: 'obsidian_tortoise',
    name: 'Obsidyen Kaplumbağası',
    partName: 'Obsidyen Parçası',
    partsNeeded: 56,
    regionId: 'abyss',
    regionName: 'Karanlık Uçurum',
    eliteParts: 3,
    chestParts: { 1: 6, 2: 9 },
    boss: {
      mode: 'story',
      stageId: 'abyss_5',
      modeLabel: 'Dünya Haritası',
      arenaLabel: 'Karanlık Uçurum',
      bossName: 'Uçurum Kralı Malakor',
      bossAcc: 'Uçurum Kralı Malakor’u',
      bossId: 'abyssal_king',
    },
    effectTitle: 'Obsidyen Kabuk',
    effectText: 'Canın ilk kez %30’un altına düştüğünde maksimum canının %12’si kadar kalkan oluşturur.',
  },
  {
    id: 'moon_moth',
    name: 'Ay Güvesi',
    partName: 'Ay Tozu',
    partsNeeded: 64,
    regionId: 'moonlit',
    regionName: 'Ay Işığı Vadisi',
    eliteParts: 3,
    chestParts: { 1: 6, 2: 9 },
    boss: {
      mode: 'story',
      stageId: 'moonlit_8',
      modeLabel: 'Dünya Haritası',
      arenaLabel: 'Ay Işığı Vadisi',
      bossName: 'Ay Matronu Selene',
      bossAcc: 'Ay Matronu Selene’yi',
      bossId: 'moonlight_matron',
    },
    effectTitle: 'Ay Işıltısı',
    effectText: 'Savaşta ilk arcane 2×2 kare eşleşmesinde bir kez en yüksek ulti enerjinin %15’i kadar enerji kazandırır.',
  },
];

export const COMPANION_IDS: CompanionId[] = COMPANIONS.map((c) => c.id);

export function getCompanion(id: CompanionId): CompanionDef {
  return COMPANIONS.find((c) => c.id === id)!;
}

// ---------------------------------------------------------------------------
// Kayıt
// ---------------------------------------------------------------------------

export const emptyCompanionSave = (): CompanionSave => ({
  parts: { root_sprout: 0, ice_fox: 0, ember_whelp: 0, storm_owl: 0, obsidian_tortoise: 0, moon_moth: 0 },
  unlocked: [],
  active: {},
  creditedChests: [],
  processed: [],
});

const PROCESSED_LIMIT = 40;

export function sanitizeCompanions(value: unknown, validHeroes: string[]): CompanionSave {
  const out = emptyCompanionSave();
  if (!value || typeof value !== 'object') return out;
  const v = value as Partial<CompanionSave>;
  for (const id of COMPANION_IDS) {
    const n = Number(v.parts?.[id]);
    out.parts[id] = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }
  out.unlocked = COMPANION_IDS.filter((id) => Array.isArray(v.unlocked) && v.unlocked.includes(id));
  if (v.active && typeof v.active === 'object') {
    for (const [hero, id] of Object.entries(v.active)) {
      if (validHeroes.includes(hero) && out.unlocked.includes(id as CompanionId)) out.active[hero as HeroClassId] = id as CompanionId;
    }
  }
  const keys = new Set(COMPANIONS.flatMap((c) => Object.keys(c.chestParts).map((t) => `${c.regionId}:${t}`)));
  out.creditedChests = Array.isArray(v.creditedChests) ? Array.from(new Set(v.creditedChests.filter((k): k is string => typeof k === 'string' && keys.has(k)))) : [];
  out.processed = Array.isArray(v.processed) ? v.processed.filter((k): k is string => typeof k === 'string').slice(-PROCESSED_LIMIT) : [];
  return out;
}

// ---------------------------------------------------------------------------
// Parça kazanma
// ---------------------------------------------------------------------------

export function companionForRegion(regionId: RegionId): CompanionDef | undefined {
  return COMPANIONS.find((c) => c.regionId === regionId);
}

export interface PartsGain {
  companionId: CompanionId;
  parts: number;
  partName: string;
}

/**
 * Hikâye elit zaferi: ilgili bölgenin yoldaşına parça verir (tekrar oynamalar dahil). `token` savaş sonucunu tanımlar;
 * aynı sonuç ikinci kez işlenirse parça verilmez.
 */
export function applyEliteParts(
  save: GameSaveState,
  stage: Pick<StageDef, 'type' | 'regionId'>,
  token?: string
): { save: GameSaveState; gain: PartsGain | null } {
  if (token && save.companions.processed.includes(token)) return { save, gain: null };
  const processed = token ? [...save.companions.processed, token].slice(-PROCESSED_LIMIT) : save.companions.processed;
  const def = stage.type === 'elite' ? companionForRegion(stage.regionId) : undefined;
  if (!def) {
    return { save: token ? { ...save, companions: { ...save.companions, processed } } : save, gain: null };
  }
  return {
    save: {
      ...save,
      companions: {
        ...save.companions,
        parts: { ...save.companions.parts, [def.id]: save.companions.parts[def.id] + def.eliteParts },
        processed,
      },
    },
    gain: { companionId: def.id, parts: def.eliteParts, partName: def.partName },
  };
}

/** Ustalık sandığı alındığında (ya da eski kayıtta zaten alınmışsa bir kez) yoldaş parça payı. */
export function creditChestParts(save: GameSaveState, regionId: RegionId, tier: number): { save: GameSaveState; gain: PartsGain | null } {
  const def = companionForRegion(regionId);
  const parts = def?.chestParts[tier];
  const key = `${regionId}:${tier}`;
  if (!def || !parts || save.companions.creditedChests.includes(key)) return { save, gain: null };
  return {
    save: {
      ...save,
      companions: {
        ...save.companions,
        parts: { ...save.companions.parts, [def.id]: save.companions.parts[def.id] + parts },
        creditedChests: [...save.companions.creditedChests, key],
      },
    },
    gain: { companionId: def.id, parts, partName: def.partName },
  };
}

/** Eski kayıt: zaten alınmış sandıkların yeni parça payını (kayıt başına bir kez) tanır. */
export function reconcileCompanionParts(save: GameSaveState): GameSaveState {
  let cur = save;
  for (const c of COMPANIONS) {
    for (const tier of Object.keys(c.chestParts).map(Number)) {
      if (cur.mastery.chests.includes(`${c.regionId}:${tier}`)) cur = creditChestParts(cur, c.regionId, tier).save;
    }
  }
  return cur;
}

// ---------------------------------------------------------------------------
// Açma ve seçim
// ---------------------------------------------------------------------------

/** Boss şartı: yalnızca doğru modun kaydı sayılır (hikâye boss zaferi av ya da zindan şartını karşılamaz; hikâye şartı ise aşamanın tamamlanmasıdır). */
export function bossRequirementMet(save: GameSaveState, def: CompanionDef): boolean {
  const b = def.boss;
  if (b.mode === 'dungeon') return (save.dungeons[b.dungeonId]?.completions ?? 0) > 0;
  if (b.mode === 'story') return save.completedStages.includes(b.stageId);
  const rec = save.huntRecords[b.huntId];
  return !!rec && (rec.wins > 0 || rec.bestTurns !== null);
}

export interface CompanionStatus {
  def: CompanionDef;
  parts: number;
  partsOk: boolean;
  bossOk: boolean;
  unlocked: boolean;
  canUnlock: boolean;
}

export function companionStatus(save: GameSaveState, id: CompanionId): CompanionStatus {
  const def = getCompanion(id);
  const parts = save.companions.parts[id];
  const partsOk = parts >= def.partsNeeded;
  const bossOk = bossRequirementMet(save, def);
  const unlocked = save.companions.unlocked.includes(id);
  return { def, parts, partsOk, bossOk, unlocked, canUnlock: !unlocked && partsOk && bossOk };
}

export interface CompanionActionResult {
  save: GameSaveState;
  ok: boolean;
  toast?: string;
}

/** Yoldaşı kalıcı açar: gereken parçaları düşer. Şartlar eksikse hiçbir şey değişmez. */
export function unlockCompanion(save: GameSaveState, id: CompanionId): CompanionActionResult {
  const st = companionStatus(save, id);
  if (st.unlocked) return { save, ok: false, toast: 'Yoldaş zaten açık.' };
  if (!st.partsOk) return { save, ok: false, toast: `${st.def.partsNeeded - st.parts} ${st.def.partName} daha gerekli.` };
  if (!st.bossOk) return { save, ok: false, toast: `${st.def.boss.modeLabel} · ${st.def.boss.arenaLabel}: ${st.def.boss.bossAcc} yen.` };
  return {
    save: {
      ...save,
      companions: {
        ...save.companions,
        parts: { ...save.companions.parts, [id]: save.companions.parts[id] - st.def.partsNeeded },
        unlocked: [...save.companions.unlocked, id],
      },
    },
    ok: true,
    toast: `${st.def.name} yoldaşın oldu!`,
  };
}

/** Her kahraman için tek aktif yoldaş (null = yoldaşsız). Yalnızca açık yoldaşlar seçilebilir. */
export function setActiveCompanion(save: GameSaveState, heroId: HeroClassId, id: CompanionId | null): CompanionActionResult {
  const active = { ...save.companions.active };
  if (id === null) delete active[heroId];
  else if (save.companions.unlocked.includes(id)) active[heroId] = id;
  else return { save, ok: false, toast: 'Bu yoldaş henüz açılmadı.' };
  return { save: { ...save, companions: { ...save.companions, active } }, ok: true };
}

export function activeCompanionFor(save: GameSaveState, heroId: HeroClassId): CompanionId | undefined {
  const id = save.companions.active[heroId];
  return id && save.companions.unlocked.includes(id) ? id : undefined;
}

