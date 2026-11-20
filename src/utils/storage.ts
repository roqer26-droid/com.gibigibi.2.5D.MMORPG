import { HERO_CLASS_LIST } from '../data/classes';
import { createStarterEquipment, createStarterInventory } from '../data/items';
import { createDungeonSaves, sanitizeDungeonSaves } from '../data/dungeons';
import { emptyMastery, sanitizeMastery } from '../data/mastery';
import { createHuntRecords, HUNT_IDS } from '../data/hunts';
import { isSetSlot, SET_IDS } from '../data/sets';
import { createLeagueSave } from '../data/league';
import { GameSaveState, HeroClassId, HeroProgress, HuntId, HuntRecord } from '../types/game';
import { dayKey } from './calendar';
import { createQuestPeriods, refreshProgressPeriods } from './questProgress';

/** Başlangıçta açık olan sınıflar (yeni 4 sınıf altın/kristal ile açılır) */
const DEFAULT_UNLOCKS: HeroClassId[] = ['warrior', 'mage', 'ranger', 'paladin'];

const SAVE_STORAGE_KEY = 'legendary_gems_efsanevi_taslar_save_v1';
/** Bozuk kayıt ya da sürüm yükseltmesi öncesi ham verinin saklandığı anahtarlar */
const CORRUPT_BACKUP_KEY = `${SAVE_STORAGE_KEY}_corrupt_backup`;
const PRE_MIGRATION_BACKUP_KEY = `${SAVE_STORAGE_KEY}_pre_migration_backup`;

/** Güncel kayıt şeması sürümü. Şema değişince artır ve MIGRATIONS'a adım ekle. */
export const SAVE_VERSION = 9;

type RawSave = Record<string, unknown>;

/**
 * Sürüm adımları: anahtar = kaynak sürüm, değer = bir sonraki sürüme dönüştürücü.
 * Eksik alanlar zaten `createInitialSaveState` ile birleştirilerek tamamlanır;
 * burası yalnızca alan yeniden adlandırma/dönüştürme gibi birleştirmeyle çözülemeyen işler içindir.
 */
const MIGRATIONS: Record<number, (raw: RawSave) => RawSave> = {
  // v3 -> v4: kayıt artık yüklemede doğrulanıyor (sanitizeSave); veri biçimi aynı.
  3: (raw) => raw,
  // v4 -> v5: av kayıtları (huntRecords) eklendi; eksik alan varsayılanlarla birleştirilir.
  // Av açılışı bossVictories/completedStages'tan türetildiği için eski boss zaferleri geçerlidir.
  4: (raw) => raw,
  // v5 -> v6: eşyalara isteğe bağlı `setId` eklendi. Set bilgisi olmayan eski eşyalar normal ekipman olarak yüklenir.
  5: (raw) => raw,
  // v6 -> v7: zindan durumu (`dungeons`) eklendi; eksikse varsayılanlarla birleştirilir.
  6: (raw) => raw,
  // v8: zindan denemesine kahraman/seviye ve kayıtlı düşman değerleri eklendi (eksikler sanitizeDungeonSaves'te tamamlanır)
  7: (raw) => raw,
  // v8 -> v9: aşama ustalığı (`mastery`) eklendi. Tamamlanmış aşamalar zafer yıldızını zaten taşır; hedefler boş başlar.
  8: (raw) => raw,
};

function readVersion(raw: RawSave): number {
  const v = Number(raw.version);
  return Number.isFinite(v) && v >= 1 ? Math.floor(v) : 1;
}

function runMigrations(raw: RawSave): RawSave {
  let current = raw;
  for (let v = readVersion(raw); v < SAVE_VERSION; v++) {
    const step = MIGRATIONS[v];
    if (step) current = step(current);
  }
  return { ...current, version: SAVE_VERSION };
}

const finiteOr = (value: unknown, fallback: number, min = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, n) : fallback;
};

const stringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? Array.from(new Set(value.filter((x): x is string => typeof x === 'string')))
    : [];

/** Geçersiz set kimliğini ya da set yuvası olmayan eşyadaki set kimliğini temizler (eşya normal ekipman olur). */
function sanitizeItemSet<T extends { setId?: unknown; slot?: unknown }>(item: T, slotKey?: string): T {
  if (item.setId === undefined) return item;
  const slot = slotKey ?? String(item.slot);
  const valid = typeof item.setId === 'string' && (SET_IDS as string[]).includes(item.setId) && isSetSlot(slot);
  if (valid) return item;
  const { setId: _drop, ...rest } = item;
  void _drop;
  return rest as T;
}

/** Av kayıtlarını doğrular: eksik av için boş kayıt, bozuk değerler için güvenli varsayılan. */
export function sanitizeHuntRecords(value: unknown): Record<HuntId, HuntRecord> {
  const out = createHuntRecords();
  if (!value || typeof value !== 'object') return out;
  for (const id of HUNT_IDS) {
    const r = (value as Record<string, unknown>)[id];
    if (!r || typeof r !== 'object') continue;
    const rec = r as Partial<HuntRecord>;
    const best = Number(rec.bestTurns);
    out[id] = {
      bestTurns: rec.bestTurns != null && Number.isFinite(best) && best >= 1 ? Math.floor(best) : null,
      wins: Math.floor(finiteOr(rec.wins, 0)),
      firstRewardClaimed: rec.firstRewardClaimed === true,
    };
  }
  return out;
}

/** Bozulmuş/elle düzenlenmiş değerleri (NaN, negatif, yanlış tip) güvenli değerlere çeker. */
export function sanitizeSave(save: GameSaveState): GameSaveState {
  const heroes = { ...save.heroes };
  (Object.keys(heroes) as HeroClassId[]).forEach((id) => {
    const h = heroes[id];
    heroes[id] = {
      ...h,
      level: Math.max(1, Math.floor(finiteOr(h.level, 1, 1))),
      xp: finiteOr(h.xp, 0),
      skillPoints: Math.floor(finiteOr(h.skillPoints, 0)),
      skillRanks: h.skillRanks && typeof h.skillRanks === 'object' ? h.skillRanks : {},
      equipped:
        h.equipped && typeof h.equipped === 'object'
          ? (Object.fromEntries(
              Object.entries(h.equipped).map(([slot, it]) => [slot, it ? sanitizeItemSet(it, slot) : it])
            ) as typeof h.equipped)
          : {},
    };
  });
  return {
    ...save,
    heroes,
    gold: Math.floor(finiteOr(save.gold, 0)),
    crystals: Math.floor(finiteOr(save.crystals, 0)),
    inventory: Array.isArray(save.inventory)
      ? save.inventory.filter((i) => i && typeof i.id === 'string').map((i) => sanitizeItemSet(i))
      : [],
    completedStages: stringArray(save.completedStages),
    claimedQuests: stringArray(save.claimedQuests),
    bossVictories: stringArray(save.bossVictories) as GameSaveState['bossVictories'],
    huntRecords: sanitizeHuntRecords(save.huntRecords),
    dungeons: sanitizeDungeonSaves(save.dungeons),
    mastery: sanitizeMastery(save.mastery),
  };
}

function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function makeStarterHero(classId: HeroClassId): HeroProgress {
  return {
    classId,
    level: 1,
    xp: 0,
    skillPoints: 1, // Start with 1 Skill Point so players can experience the Skill Tree immediately!
    skillRanks: {},
    equipped: createStarterEquipment(classId),
  };
}

export function createInitialSaveState(): GameSaveState {
  const heroes = {} as Record<HeroClassId, HeroProgress>;
  HERO_CLASS_LIST.forEach((c) => {
    heroes[c.id] = makeStarterHero(c.id);
  });

  return {
    version: SAVE_VERSION,
    activeHeroClass: 'warrior',
    heroes,
    heroUnlocks: [...DEFAULT_UNLOCKS],
    inventory: createStarterInventory(),
    gold: 250,
    crystals: 20,
    completedStages: [],
    bossVictories: [],
    questProgress: {},
    claimedQuests: [],
    questPeriods: createQuestPeriods(),
    league: createLeagueSave(),
    huntRecords: createHuntRecords(),
    dungeons: createDungeonSaves(),
    mastery: emptyMastery(),
    stats: {
      totalMatches: 0,
      totalGemsMatched: {
        fire: 0,
        frost: 0,
        nature: 0,
        lightning: 0,
        arcane: 0,
        golden: 0,
      },
      highestCombo: 0,
      enemiesDefeated: 0,
      bossesDefeated: 0,
      skillsCast: 0,
      itemsUpgraded: 0,
    },
    settings: {
      musicVolume: 0.38,
      sfxVolume: 0.65,
      muted: false,
      screenShake: true,
      highParticles: true,
    },
    lastSavedAt: Date.now(),
  };
}

/** Ham JSON metnini doğrular, sürüm yükseltir ve varsayılanlarla birleştirir. Geçersizse null. */
export function parseSaveString(text: string): GameSaveState | null {
  let parsedRaw: unknown;
  try {
    parsedRaw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!parsedRaw || typeof parsedRaw !== 'object') return null;
  const candidate = parsedRaw as RawSave;
  if (!candidate.heroes || typeof candidate.heroes !== 'object' || !candidate.activeHeroClass) {
    return null;
  }
  // Gelecekteki bir sürümden gelen kayıt eski kodla bozulmasın
  if (readVersion(candidate) > SAVE_VERSION) return null;

  const parsed = runMigrations(candidate) as unknown as GameSaveState;
  const fresh = createInitialSaveState();

  // Eski kayıtlarda olmayan yeni sınıfları otomatik oluştur (geriye dönük uyumluluk)
  const heroes = { ...fresh.heroes, ...(parsed.heroes ?? {}) } as Record<HeroClassId, HeroProgress>;
  HERO_CLASS_LIST.forEach((c) => {
    if (!heroes[c.id]) heroes[c.id] = makeStarterHero(c.id);
  });

  const heroUnlocks =
    Array.isArray(parsed.heroUnlocks) && parsed.heroUnlocks.length > 0
      ? parsed.heroUnlocks.filter((id) => !!heroes[id])
      : [...DEFAULT_UNLOCKS];
  if (heroUnlocks.length === 0) heroUnlocks.push(...DEFAULT_UNLOCKS);

  // Aktif kahraman kilitliyse ilk açık sınıfa dön
  const activeHeroClass = heroUnlocks.includes(parsed.activeHeroClass)
    ? parsed.activeHeroClass
    : heroUnlocks[0];

  const questPeriods = parsed.questPeriods ?? fresh.questPeriods;
  // Eski günlük görevler ömür boyu sayaç kullanıyordu; bugünkü ilerleme bir kez korunur.
  if (!parsed.questPeriods && parsed.lastSavedAt && dayKey(parsed.lastSavedAt) === dayKey()) {
    questPeriods.daily = {
      ...questPeriods.daily,
      claimed: (parsed.claimedQuests ?? []).filter((id) => id.startsWith('daily_')),
      counters: {
        ...questPeriods.daily.counters,
        gems: { ...questPeriods.daily.counters.gems, ...(parsed.stats?.totalGemsMatched ?? {}) },
        matches: parsed.stats?.totalMatches ?? 0,
        highestCombo: parsed.stats?.highestCombo ?? 0,
        wins: parsed.stats?.enemiesDefeated ?? 0,
        bossWins: parsed.stats?.bossesDefeated ?? 0,
        skillsCast: parsed.stats?.skillsCast ?? 0,
        itemsUpgraded: parsed.stats?.itemsUpgraded ?? 0,
      },
    };
  }

  const migrated: GameSaveState = sanitizeSave({
    ...fresh,
    ...parsed,
    version: SAVE_VERSION,
    heroes,
    heroUnlocks,
    activeHeroClass,
    questPeriods,
    league: { ...fresh.league, ...(parsed.league ?? {}) },
    settings: { ...fresh.settings, ...(parsed.settings ?? {}) },
    stats: {
      ...fresh.stats,
      ...(parsed.stats ?? {}),
      totalGemsMatched: {
        ...fresh.stats.totalGemsMatched,
        ...(parsed.stats?.totalGemsMatched ?? {}),
      },
    },
  });
  return refreshProgressPeriods(migrated);
}

export function loadGameState(): { save: GameSaveState; isExistingSave: boolean } {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(SAVE_STORAGE_KEY);
  } catch {
    // localStorage erişilemiyor (gizli mod vb.)
  }
  if (!raw) return { save: createInitialSaveState(), isExistingSave: false };

  try {
    const save = parseSaveString(raw);
    if (save) {
      // Şema yükseldiyse eski ham kaydı bir kez yedekle
      try {
        const rawVersion = readVersion(JSON.parse(raw) as RawSave);
        if (rawVersion < SAVE_VERSION) safeSetItem(PRE_MIGRATION_BACKUP_KEY, raw);
      } catch {
        // yedekleme başarısız olsa da yükleme devam eder
      }
      return { save, isExistingSave: true };
    }
  } catch {
    // aşağıda ele alınır
  }
  // Bozuk kayıt: üzerine yazılmadan önce ham veriyi sakla
  safeSetItem(CORRUPT_BACKUP_KEY, raw);
  return { save: createInitialSaveState(), isExistingSave: false };
}

/** Kaydı panoya/dosyaya aktarılabilir tek satır metne çevirir. */
export function exportSaveString(state: GameSaveState): string {
  return JSON.stringify({ ...state, lastSavedAt: Date.now() });
}

/** Dışarıdan alınan metni doğrular; geçerliyse kaydı yazar ve döndürür. */
export function importSaveString(text: string): GameSaveState | null {
  const save = parseSaveString(text.trim());
  if (!save) return null;
  return saveGameState(save) ? save : null;
}

export function saveGameState(state: GameSaveState): boolean {
  try {
    const payload: GameSaveState = {
      ...state,
      lastSavedAt: Date.now(),
    };
    localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function resetGameState(): GameSaveState {
  try {
    localStorage.removeItem(SAVE_STORAGE_KEY);
  } catch {
    // ignore
  }
  const fresh = createInitialSaveState();
  saveGameState(fresh);
  return fresh;
}
