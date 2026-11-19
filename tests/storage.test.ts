import { beforeEach, describe, expect, it } from 'vitest';
import {
  SAVE_VERSION,
  createInitialSaveState,
  exportSaveString,
  importSaveString,
  loadGameState,
  parseSaveString,
  saveGameState,
} from '../src/utils/storage';

const KEY = 'legendary_gems_efsanevi_taslar_save_v1';
let store: Map<string, string>;

beforeEach(() => {
  store = new Map();
  (globalThis as unknown as { localStorage: unknown }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
});

describe('save storage', () => {
  it('starts fresh when nothing is stored', () => {
    const r = loadGameState();
    expect(r.isExistingSave).toBe(false);
    expect(r.save.version).toBe(SAVE_VERSION);
  });

  it('round-trips a save', () => {
    const s = { ...createInitialSaveState(), gold: 4242 };
    expect(saveGameState(s)).toBe(true);
    const r = loadGameState();
    expect(r.isExistingSave).toBe(true);
    expect(r.save.gold).toBe(4242);
  });

  it('backs up a corrupt save instead of silently losing it', () => {
    store.set(KEY, '{not json');
    const r = loadGameState();
    expect(r.isExistingSave).toBe(false);
    expect(store.get(`${KEY}_corrupt_backup`)).toBe('{not json');
  });

  it('backs up and upgrades an older schema version', () => {
    const old = { ...createInitialSaveState(), version: 3, gold: 555 };
    store.set(KEY, JSON.stringify(old));
    const r = loadGameState();
    expect(r.save.version).toBe(SAVE_VERSION);
    expect(r.save.gold).toBe(555);
    expect(store.has(`${KEY}_pre_migration_backup`)).toBe(true);
  });

  it('rejects saves written by a newer game version', () => {
    const future = { ...createInitialSaveState(), version: SAVE_VERSION + 1 };
    expect(parseSaveString(JSON.stringify(future))).toBeNull();
  });

  it('sanitizes NaN, negative and wrongly typed values', () => {
    const bad = {
      ...createInitialSaveState(),
      gold: -50,
      crystals: 'abc',
      completedStages: ['forest_1', 'forest_1', 42],
      inventory: [null, { id: 5 }],
    };
    const s = parseSaveString(JSON.stringify(bad))!;
    expect(s.gold).toBe(0);
    expect(s.crystals).toBe(0);
    expect(s.completedStages).toEqual(['forest_1']);
    expect(s.inventory).toEqual([]);
  });

  it('falls back to an unlocked hero when the active one is locked', () => {
    const bad = { ...createInitialSaveState(), activeHeroClass: 'seraph' };
    const s = parseSaveString(JSON.stringify(bad))!;
    expect(s.heroUnlocks).toContain(s.activeHeroClass);
  });

  it('exports and imports a save', () => {
    const s = { ...createInitialSaveState(), gold: 9001 };
    const text = exportSaveString(s);
    const imported = importSaveString(text);
    expect(imported?.gold).toBe(9001);
    expect(loadGameState().save.gold).toBe(9001);
  });

  it('refuses to import garbage and leaves the stored save untouched', () => {
    saveGameState({ ...createInitialSaveState(), gold: 1 });
    expect(importSaveString('hello')).toBeNull();
    expect(importSaveString('{"a":1}')).toBeNull();
    expect(loadGameState().save.gold).toBe(1);
  });
});
