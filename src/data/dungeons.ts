import { WORLD_REGIONS } from './world';
import type {
  DungeonId,
  DungeonResult,
  DungeonRun,
  DungeonSave,
  GameSaveState,
  GemType,
  RegionId,
  RelicId,
  StageDef,
} from '../types/game';
import { computeHeroBuild, type ComputedHeroBuild } from '../utils/rpgLogic';

/**
 * Seçimli Zindanlar. Tüm sayılar (savaş sırası, can/hasar çarpanları, iyileşme, güç havuzu ve değerleri, ödül)
 * bu dosyadaki zindan verisindedir.
 */

// ---------------------------------------------------------------------------
// Geçici güçler
// ---------------------------------------------------------------------------

export type RelicEffect =
  | { kind: 'nature_heal_pct'; value: number } // doğa taşından iyileştirme +%
  | { kind: 'first_match_ulti'; value: number } // turun ilk taş eşleşmesi: +ulti
  | { kind: 'first_square_shield_pct'; value: number } // savaşın ilk karesi: max canın %'si kalkan
  | { kind: 'fire_damage_pct'; value: number } // ateş taşı hasarı +%
  | { kind: 'frost_mana_pct'; value: number } // buz taşından mana +%
  | { kind: 'start_shield_pct'; value: number }; // savaş başında max canın %'si kalkan

export interface RelicDef {
  id: RelicId;
  name: string;
  icon: 'leaf' | 'spark' | 'square' | 'flame' | 'snowflake' | 'shield';
  effect: RelicEffect;
}

export const RELICS: RelicDef[] = [
  { id: 'healing_essence', name: 'Şifalı Öz', icon: 'leaf', effect: { kind: 'nature_heal_pct', value: 20 } },
  { id: 'ulti_spark', name: 'Ulti Kıvılcımı', icon: 'spark', effect: { kind: 'first_match_ulti', value: 4 } },
  { id: 'square_bulwark', name: 'Kare Siper', icon: 'square', effect: { kind: 'first_square_shield_pct', value: 8 } },
  { id: 'ember_echo', name: 'Köz Yankısı', icon: 'flame', effect: { kind: 'fire_damage_pct', value: 12 } },
  { id: 'frost_flow', name: 'Buz Akışı', icon: 'snowflake', effect: { kind: 'frost_mana_pct', value: 15 } },
  { id: 'ready_guardian', name: 'Hazır Muhafız', icon: 'shield', effect: { kind: 'start_shield_pct', value: 10 } },
];

export const RELIC_IDS: RelicId[] = RELICS.map((r) => r.id);

export function getRelic(id: RelicId): RelicDef {
  return RELICS.find((r) => r.id === id)!;
}

/** Türkçe "yüzde N" + iyelik eki: %8’i, %10’u, %20’si ... */
export function pctSuffix(n: number): string {
  const units: Record<number, string> = { 0: '', 1: 'i', 2: 'si', 3: 'ü', 4: 'ü', 5: 'i', 6: 'sı', 7: 'si', 8: 'i', 9: 'u' };
  const tens: Record<number, string> = { 1: 'u', 2: 'si', 3: 'u', 4: 'ı', 5: 'si', 6: 'ı', 7: 'i', 8: 'i', 9: 'ı' };
  const v = Math.abs(Math.round(n));
  if (v === 100) return 'ü';
  const u = v % 10;
  return u !== 0 ? units[u] : tens[Math.floor(v / 10) % 10] ?? 'i';
}

/** Güç açıklaması (tam etki değeri); değerlerden üretilir. */
export function describeRelicEffect(e: RelicEffect): string {
  switch (e.kind) {
    case 'nature_heal_pct':
      return `Doğa taşlarından gelen iyileştirme +%${e.value}`;
    case 'first_match_ulti':
      return `Her oyuncu turunun ilk taş eşleşmesi +${e.value} ulti enerjisi verir`;
    case 'first_square_shield_pct':
      return `Her savaşta oluşan ilk 2×2 kare, maksimum canın %${e.value}’${pctSuffix(e.value)} kadar kalkan verir`;
    case 'fire_damage_pct':
      return `Ateş taşlarının hasarı +%${e.value}`;
    case 'frost_mana_pct':
      return `Buz taşlarından kazanılan mana +%${e.value}`;
    case 'start_shield_pct':
      return `Her savaşın başında maksimum canın %${e.value}’${pctSuffix(e.value)} kadar kalkan`;
  }
}

export interface RelicEffects {
  natureHealPct: number;
  firstMatchUlti: number;
  squareShieldPct: number;
  fireDmgPct: number;
  frostManaPct: number;
  startShieldPct: number;
}

export function emptyRelicEffects(): RelicEffects {
  return { natureHealPct: 0, firstMatchUlti: 0, squareShieldPct: 0, fireDmgPct: 0, frostManaPct: 0, startShieldPct: 0 };
}

/** Seçilmiş güçlerin toplam etkisi. */
export function computeRelicEffects(relics: RelicId[]): RelicEffects {
  const out = emptyRelicEffects();
  for (const id of new Set(relics)) {
    const e = getRelic(id).effect;
    switch (e.kind) {
      case 'nature_heal_pct':
        out.natureHealPct += e.value;
        break;
      case 'first_match_ulti':
        out.firstMatchUlti += e.value;
        break;
      case 'first_square_shield_pct':
        out.squareShieldPct += e.value;
        break;
      case 'fire_damage_pct':
        out.fireDmgPct += e.value;
        break;
      case 'frost_mana_pct':
        out.frostManaPct += e.value;
        break;
      case 'start_shield_pct':
        out.startShieldPct += e.value;
        break;
    }
  }
  return out;
}

/**
 * Güçleri mevcut karakter özelliklerine bağlar: ateş hasarı, buz manası ve iyileştirme pasifleri artar;
 * ulti/kalkan etkileri savaşta `build.relicEffects` üzerinden uygulanır.
 */
export function applyRelicsToBuild(build: ComputedHeroBuild, relics: RelicId[]): ComputedHeroBuild {
  const fx = computeRelicEffects(relics);
  return {
    ...build,
    passives: {
      ...build.passives,
      fireDmgPct: build.passives.fireDmgPct + fx.fireDmgPct,
      frostManaPct: build.passives.frostManaPct + fx.frostManaPct,
      natureHealOnlyPct: build.passives.natureHealOnlyPct + fx.natureHealPct,
    },
    relicEffects: fx,
  };
}

// ---------------------------------------------------------------------------
// Savaş içi: ilk eşleşme / ilk kare / başlangıç kalkanı
// ---------------------------------------------------------------------------

export interface RelicBattleFlags {
  /** Bu oyuncu turunda "ilk taş eşleşmesi" bonusu kullanıldı mı (her tur sıfırlanır) */
  turnMatchUsed: boolean;
  /** Bu savaşta "ilk kare" kalkanı kullanıldı mı (savaş boyunca) */
  squareUsed: boolean;
}

export const freshRelicFlags = (): RelicBattleFlags => ({ turnMatchUsed: false, squareUsed: false });

export interface RelicMatchResult {
  flags: RelicBattleFlags;
  ulti: number;
  shield: number;
}

/**
 * Bir eşleşme adımında güçleri çözer. Ulti Kıvılcımı turun yalnızca ilk eşleşmesinde (zincirler tekrarlamaz),
 * Kare Siper savaşın yalnızca ilk karesinde çalışır.
 */
export function resolveRelicMatch(i: {
  effects: RelicEffects;
  flags: RelicBattleFlags;
  counts: Partial<Record<GemType, number>>;
  squareCount: number;
  heroMaxHp: number;
}): RelicMatchResult {
  const flags = { ...i.flags };
  let ulti = 0;
  let shield = 0;
  const matched = Object.values(i.counts).reduce((a, b) => a + (b ?? 0), 0) > 0;
  if (i.effects.firstMatchUlti > 0 && !flags.turnMatchUsed && matched) {
    flags.turnMatchUsed = true;
    ulti = i.effects.firstMatchUlti;
  }
  if (i.effects.squareShieldPct > 0 && !flags.squareUsed && i.squareCount > 0) {
    flags.squareUsed = true;
    shield = Math.round((i.heroMaxHp * i.effects.squareShieldPct) / 100);
  }
  return { flags, ulti, shield };
}

/** Savaş başındaki Hazır Muhafız kalkanı (ek olarak mevcut başlangıç kalkanı kuralları geçerlidir). */
export function relicStartShield(effects: RelicEffects, heroMaxHp: number): number {
  return Math.round((heroMaxHp * effects.startShieldPct) / 100);
}

// ---------------------------------------------------------------------------
// Zindan verisi
// ---------------------------------------------------------------------------

export interface DungeonBattleDef {
  /** Mevcut oyun verisinden kullanılan düşmanın aşaması */
  stageId: string;
  /** Zindanın kendi can/hasar ayarı: aşamadaki (zorluk ayarlı) değerlerle çarpılır */
  hpMult: number;
  attackMult: number;
}

export interface DungeonDef {
  id: DungeonId;
  name: string;
  subtitle: string;
  description: string;
  /** Bu bölge tamamlanınca (tüm aşamaları) açılır */
  unlockRegionId: RegionId;
  battles: DungeonBattleDef[];
  /** İlk `healAfterBattles` zaferden sonra max canın bu yüzdesi kadar iyileşilir */
  healPctOfMax: number;
  healAfterBattles: number;
  /** Her güç seçiminde sunulan kart sayısı */
  offerSize: number;
  relicPool: RelicId[];
  /**
   * Son boss zaferinde verilen ödül. Referans: Kadim Orman Muhafızı (450 altın / 28 kristal) ve
   * "Ormanın Kalbi" görevi (500 / 30); üç savaşlık seri ve geçici güç yönetimi için yaklaşık 1,7× / 1,4×.
   */
  reward: { gold: number; crystals: number };
}

export const DUNGEONS: DungeonDef[] = [
  {
    id: 'roots_vault',
    name: 'Köklerin Mahzeni',
    subtitle: 'Büyülü Orman zindanı',
    description: 'Ormanın altındaki mahzende üç savaş seni bekliyor. Her zaferden sonra geçici bir güç seç ve boss’a hazırlan.',
    unlockRegionId: 'forest',
    battles: [
      // Denge: `npm run sim:dungeon` (seviye 6, beceri yok, başlangıç ekipmanı): savaşçı/şövalye ≈%90+, korucu ≈%65, büyücü ≈%25
      { stageId: 'forest_1', hpMult: 1.3, attackMult: 1.4 },
      { stageId: 'forest_4', hpMult: 1.4, attackMult: 1.4 },
      { stageId: 'forest_5', hpMult: 1.5, attackMult: 1.3 },
    ],
    healPctOfMax: 20,
    healAfterBattles: 2,
    offerSize: 2,
    relicPool: [...RELIC_IDS],
    reward: { gold: 760, crystals: 40 },
  },
];

export const DUNGEON_IDS: DungeonId[] = DUNGEONS.map((d) => d.id);

export function getDungeon(id: DungeonId): DungeonDef {
  return DUNGEONS.find((d) => d.id === id)!;
}

export const BATTLE_COUNT = (def: DungeonDef) => def.battles.length;

/** Zindan savaşı için aşama: oyundaki düşman + zindanın kendi can/hasar çarpanları. */
export function dungeonBattleStage(def: DungeonDef, index: number): StageDef {
  const b = def.battles[index];
  const stage = WORLD_REGIONS.flatMap((r) => r.stages).find((s) => s.id === b.stageId)!;
  return {
    ...stage,
    id: `dungeon:${def.id}:${index}`,
    enemy: {
      ...stage.enemy,
      maxHp: Math.max(1, Math.round(stage.enemy.maxHp * b.hpMult)),
      attack: Math.max(1, Math.round(stage.enemy.attack * b.attackMult)),
    },
  };
}

/** Büyülü Orman gibi bir bölgenin tüm aşamaları tamamlandı mı? */
export function regionProgress(save: Pick<GameSaveState, 'completedStages'>, regionId: RegionId): { done: number; total: number } {
  const region = WORLD_REGIONS.find((r) => r.id === regionId)!;
  return { done: region.stages.filter((s) => save.completedStages.includes(s.id)).length, total: region.stages.length };
}

export function isDungeonUnlocked(save: Pick<GameSaveState, 'completedStages'>, def: DungeonDef): boolean {
  const p = regionProgress(save, def.unlockRegionId);
  return p.done >= p.total;
}

/** Kilitliyken görünen açılma koşulu. */
export function dungeonUnlockText(save: Pick<GameSaveState, 'completedStages'>, def: DungeonDef): string {
  const region = WORLD_REGIONS.find((r) => r.id === def.unlockRegionId)!;
  const p = regionProgress(save, def.unlockRegionId);
  return `${region.name} bölgesini tamamla (${p.done}/${p.total} aşama)`;
}

// ---------------------------------------------------------------------------
// Kayıt: varsayılanlar ve doğrulama
// ---------------------------------------------------------------------------

export const emptyDungeonSave = (): DungeonSave => ({ active: null, attempts: 0, completions: 0, last: null });

export function createDungeonSaves(): Record<DungeonId, DungeonSave> {
  return { roots_vault: emptyDungeonSave() };
}

const finite = (v: unknown, fallback: number, min = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(min, n) : fallback;
};

function sanitizeResults(v: unknown): { turns: number; hpAfter: number }[] {
  if (!Array.isArray(v)) return [];
  return v.slice(0, 10).map((r) => ({ turns: Math.floor(finite((r as { turns?: unknown })?.turns, 1, 1)), hpAfter: Math.floor(finite((r as { hpAfter?: unknown })?.hpAfter, 1, 1)) }));
}

const sanitizeRelics = (v: unknown): RelicId[] =>
  Array.isArray(v) ? Array.from(new Set(v.filter((x): x is RelicId => RELIC_IDS.includes(x as RelicId)))) : [];

/** Bozuk/eski kayıttaki zindan durumunu güvenli hale getirir. */
export function sanitizeDungeonSaves(value: unknown): Record<DungeonId, DungeonSave> {
  const out = createDungeonSaves();
  if (!value || typeof value !== 'object') return out;
  for (const def of DUNGEONS) {
    const raw = (value as Record<string, unknown>)[def.id];
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Partial<DungeonSave>;
    const save: DungeonSave = {
      active: null,
      attempts: Math.floor(finite(r.attempts, 0)),
      completions: Math.floor(finite(r.completions, 0)),
      last: null,
    };
    const a = r.active as Partial<DungeonRun> | null | undefined;
    if (a && typeof a === 'object' && typeof a.runId === 'string') {
      const battle = Math.floor(finite(a.battle, 0));
      const phase = a.phase === 'choice' ? 'choice' : 'battle';
      const offer = sanitizeRelics(a.offer).slice(0, def.offerSize);
      if (battle < def.battles.length && (phase === 'battle' || offer.length === def.offerSize)) {
        save.active = {
          runId: a.runId,
          battle,
          phase,
          hp: Math.floor(finite(a.hp, 1, 1)),
          relics: sanitizeRelics(a.relics),
          offer: phase === 'choice' ? offer : null,
          results: sanitizeResults(a.results),
        };
      }
    }
    const l = r.last as Partial<DungeonResult> | null | undefined;
    if (l && typeof l === 'object' && typeof l.runId === 'string') {
      save.last = {
        runId: l.runId,
        relics: sanitizeRelics(l.relics),
        reward: { gold: Math.floor(finite(l.reward?.gold, 0)), crystals: Math.floor(finite(l.reward?.crystals, 0)) },
        results: sanitizeResults(l.results),
        completedAt: finite(l.completedAt, 0),
      };
    }
    out[def.id] = save;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Deneme akışı (saf durum geçişleri; hepsi tek kayıt güncellemesi döndürür)
// ---------------------------------------------------------------------------

export interface DungeonActionResult {
  save: GameSaveState;
  ok: boolean;
  toast?: string;
}

const refuse = (save: GameSaveState, toast: string): DungeonActionResult => ({ save, ok: false, toast });

const heroMaxHp = (save: GameSaveState): number => computeHeroBuild(save.heroes[save.activeHeroClass]).stats.health;

function withDungeon(save: GameSaveState, id: DungeonId, next: DungeonSave): GameSaveState {
  return { ...save, dungeons: { ...save.dungeons, [id]: next } };
}

/** Yeni deneme: kilit açık ve aktif deneme yoksa. Kahraman tam canla başlar. */
export function startDungeonRun(save: GameSaveState, id: DungeonId, now: number = Date.now()): DungeonActionResult {
  const def = getDungeon(id);
  const d = save.dungeons[id];
  if (!isDungeonUnlocked(save, def)) return refuse(save, dungeonUnlockText(save, def));
  if (d.active) return refuse(save, 'Zaten devam eden bir deneme var.');
  const run: DungeonRun = {
    runId: `${now}-${d.attempts + 1}`,
    battle: 0,
    phase: 'battle',
    hp: heroMaxHp(save),
    relics: [],
    offer: null,
    results: [],
  };
  return { save: withDungeon(save, id, { ...d, active: run, attempts: d.attempts + 1 }), ok: true };
}

/** Savaşa girerken kullanılacak can: kayıtlı can, mevcut maksimum canı aşmaz. */
export function dungeonStartHp(save: GameSaveState, run: DungeonRun): number {
  return Math.max(1, Math.min(Math.floor(run.hp), heroMaxHp(save)));
}

/** Teklif için havuzdan, daha önce alınmamış `offerSize` farklı güç seçer. */
export function drawRelicOffer(def: DungeonDef, owned: RelicId[], rand: () => number = Math.random): RelicId[] {
  const pool = def.relicPool.filter((r) => !owned.includes(r));
  const offer: RelicId[] = [];
  while (offer.length < def.offerSize && pool.length > 0) {
    const idx = Math.min(pool.length - 1, Math.floor(rand() * pool.length));
    offer.push(pool.splice(idx, 1)[0]);
  }
  return offer;
}

/**
 * Savaş zaferi. İlk iki zaferden sonra max canın %20'si iyileştirilir ve iki güç sunulur; boss zaferinde ödül ve
 * tamamlanma durumu AYNI güncellemede yazılır. Savaş zaten işlenmişse (çift çağrı) hiçbir şey değişmez.
 */
export function completeDungeonBattle(
  save: GameSaveState,
  id: DungeonId,
  battle: { heroHp: number; turns: number },
  opts: { rand?: () => number; now?: number } = {}
): DungeonActionResult & { completed: boolean; healed: number } {
  const def = getDungeon(id);
  const d = save.dungeons[id];
  const run = d.active;
  const none = (toast: string) => ({ ...refuse(save, toast), completed: false, healed: 0 });
  if (!run || run.phase !== 'battle') return none('Bu savaş zaten kaydedildi.');

  const max = heroMaxHp(save);
  const hpAfter = Math.max(1, Math.min(Math.floor(battle.heroHp), max));
  const results = [...run.results, { turns: Math.max(1, Math.floor(battle.turns)), hpAfter }];
  const isBoss = run.battle >= def.battles.length - 1;

  if (isBoss) {
    const reward = { ...def.reward };
    const last: DungeonResult = {
      runId: run.runId,
      relics: [...run.relics],
      reward,
      results,
      completedAt: opts.now ?? Date.now(),
    };
    const next: DungeonSave = { ...d, active: null, completions: d.completions + 1, last };
    return {
      save: { ...withDungeon(save, id, next), gold: save.gold + reward.gold, crystals: save.crystals + reward.crystals },
      ok: true,
      completed: true,
      healed: 0,
    };
  }

  const heal = run.battle < def.healAfterBattles ? Math.round((max * def.healPctOfMax) / 100) : 0;
  const hp = Math.min(max, hpAfter + heal);
  const nextRun: DungeonRun = {
    ...run,
    phase: 'choice',
    hp,
    results,
    offer: drawRelicOffer(def, run.relics, opts.rand),
  };
  return { save: withDungeon(save, id, { ...d, active: nextRun }), ok: true, completed: false, healed: hp - hpAfter };
}

/** Güç seçimi: seçilen güç hemen eklenir ve ilerleme (sonraki savaş) aynı güncellemede kaydedilir. */
export function chooseDungeonRelic(save: GameSaveState, id: DungeonId, relic: RelicId): DungeonActionResult {
  const d = save.dungeons[id];
  const run = d.active;
  if (!run || run.phase !== 'choice' || !run.offer) return refuse(save, 'Seçilecek güç yok.');
  if (!run.offer.includes(relic) || run.relics.includes(relic)) return refuse(save, 'Bu güç teklif edilmedi.');
  const nextRun: DungeonRun = { ...run, phase: 'battle', battle: run.battle + 1, relics: [...run.relics, relic], offer: null };
  return { save: withDungeon(save, id, { ...d, active: nextRun }), ok: true };
}

/** Yenilgi ya da terk: deneme biter, geçici güçler sona erer, ödül verilmez. */
export function endDungeonRun(save: GameSaveState, id: DungeonId): DungeonActionResult {
  const d = save.dungeons[id];
  if (!d.active) return refuse(save, 'Aktif deneme yok.');
  return { save: withDungeon(save, id, { ...d, active: null }), ok: true };
}
