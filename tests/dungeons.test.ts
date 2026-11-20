import { beforeEach, describe, expect, it } from 'vitest';
import {
  DUNGEONS,
  RELICS,
  RELIC_IDS,
  applyRelicsToBuild,
  chooseDungeonRelic,
  completeDungeonBattle,
  computeRelicEffects,
  describeRelicEffect,
  drawRelicOffer,
  dungeonBattleStage,
  dungeonStartHp,
  dungeonUnlockText,
  endDungeonRun,
  freshRelicFlags,
  getDungeon,
  isDungeonUnlocked,
  pctSuffix,
  relicStartShield,
  resolveRelicMatch,
  sanitizeDungeonSaves,
  startDungeonRun,
} from '../src/data/dungeons';
import { WORLD_REGIONS } from '../src/data/world';
import type { GameSaveState, RelicId } from '../src/types/game';
import { computeHeroBuild } from '../src/utils/rpgLogic';
import { createInitialSaveState, loadGameState, parseSaveString, saveGameState } from '../src/utils/storage';

const def = getDungeon('roots_vault');
const forestIds = WORLD_REGIONS[0].stages.map((s) => s.id);
const unlockedSave = (): GameSaveState => ({ ...createInitialSaveState(), completedStages: [...forestIds], gold: 100, crystals: 5 });
const maxHp = (s: GameSaveState) => computeHeroBuild(s.heroes[s.activeHeroClass]).stats.health;
const seq = (...vals: number[]) => { let i = 0; return () => vals[i++ % vals.length]; };

function win(save: GameSaveState, hp: number, turns = 5) {
  return completeDungeonBattle(save, 'roots_vault', { heroHp: hp, turns }, { rand: seq(0, 0), now: 1000 });
}

describe('dungeon data', () => {
  it('Köklerin Mahzeni uses the existing Goblin, Elit Dikenli Ağaç and Orman Muhafızı enemies in order', () => {
    expect(def.name).toBe('Köklerin Mahzeni');
    const enemies = def.battles.map((_, i) => dungeonBattleStage(def, i).enemy);
    expect(enemies.map((e) => e.name)).toEqual(['Goblin Yağmacısı', 'Elit Dikenli Ağaç', 'Kadim Orman Muhafızı']);
    expect(enemies[2].isBoss).toBe(true);
    expect(enemies[2].bossId).toBe('forest_guardian');
  });

  it('the dungeon\'s own hp / attack multipliers are applied on top of the game data', () => {
    const base = WORLD_REGIONS[0].stages.find((s) => s.id === 'forest_4')!.enemy;
    const custom = { ...def, battles: def.battles.map((b, i) => (i === 1 ? { ...b, hpMult: 2, attackMult: 1.5 } : b)) };
    const e = dungeonBattleStage(custom, 1).enemy;
    expect(e.maxHp).toBe(Math.round(base.maxHp * 2));
    expect(e.attack).toBe(Math.round(base.attack * 1.5));
  });

  it('every relic effect text states the full value (and keeps Turkish suffixes right)', () => {
    const t = Object.fromEntries(RELICS.map((r) => [r.id, describeRelicEffect(r.effect)]));
    expect(t.healing_essence).toBe('Doğa taşlarından gelen iyileştirme +%20');
    expect(t.ulti_spark).toContain('+4 ulti enerjisi');
    expect(t.square_bulwark).toBe('Her savaşta oluşan ilk 2×2 kare, maksimum canın %8’i kadar kalkan verir');
    expect(t.ember_echo).toBe('Ateş taşlarının hasarı +%12');
    expect(t.frost_flow).toBe('Buz taşlarından kazanılan mana +%15');
    expect(t.ready_guardian).toBe('Her savaşın başında maksimum canın %10’u kadar kalkan');
    expect(pctSuffix(20)).toBe('si');
    expect(RELICS).toHaveLength(6);
  });

  it('reward is tuned against the existing forest boss rewards (above 450/28 and the 500/30 quest)', () => {
    expect(def.reward.gold).toBeGreaterThan(500);
    expect(def.reward.crystals).toBeGreaterThan(30);
  });
});

describe('unlocking', () => {
  it('is locked until every Büyülü Orman stage is completed, and states the condition', () => {
    const fresh = createInitialSaveState();
    expect(isDungeonUnlocked(fresh, def)).toBe(false);
    expect(dungeonUnlockText(fresh, def)).toBe('Büyülü Orman bölgesini tamamla (0/8 aşama)');
    const partial = { ...fresh, completedStages: forestIds.slice(0, 7) };
    expect(isDungeonUnlocked(partial, def)).toBe(false);
    expect(dungeonUnlockText(partial, def)).toContain('(7/8 aşama)');
    expect(isDungeonUnlocked({ ...fresh, completedStages: forestIds }, def)).toBe(true);
  });

  it('refuses to start while locked', () => {
    const r = startDungeonRun(createInitialSaveState(), 'roots_vault');
    expect(r.ok).toBe(false);
    expect(r.toast).toContain('Büyülü Orman');
  });
});

describe('run flow', () => {
  it('starts at full hp on battle 1, one run at a time', () => {
    const s = unlockedSave();
    const r = startDungeonRun(s, 'roots_vault', 5);
    const run = r.save.dungeons.roots_vault.active!;
    expect(run).toMatchObject({ battle: 0, phase: 'battle', hp: maxHp(s), relics: [], offer: null });
    expect(r.save.dungeons.roots_vault.attempts).toBe(1);
    expect(startDungeonRun(r.save, 'roots_vault').ok).toBe(false);
  });

  it('carries remaining hp, heals 20% of max after each of the first two wins and never above max', () => {
    let s = startDungeonRun(unlockedSave(), 'roots_vault').save;
    const max = maxHp(s);
    const heal = Math.round(max * 0.2);
    let r = win(s, Math.round(max * 0.4));
    expect(r.save.dungeons.roots_vault.active!.hp).toBe(Math.round(max * 0.4) + heal);
    expect(r.healed).toBe(heal);
    s = chooseDungeonRelic(r.save, 'roots_vault', r.save.dungeons.roots_vault.active!.offer![0]).save;
    r = win(s, Math.round(max * 0.7));
    expect(r.save.dungeons.roots_vault.active!.hp).toBe(Math.min(max, Math.round(max * 0.7) + heal));
    // üst sınır
    const full = startDungeonRun(unlockedSave(), 'roots_vault').save;
    expect(win(full, max).save.dungeons.roots_vault.active!.hp).toBe(max);
    expect(win(full, max).healed).toBe(0);
  });

  it('clamps an out-of-range reported hp into 1..max', () => {
    const s = startDungeonRun(unlockedSave(), 'roots_vault').save;
    expect(win(s, 99999).save.dungeons.roots_vault.active!.hp).toBe(maxHp(s));
    expect(win(s, -5).save.dungeons.roots_vault.active!.hp).toBeGreaterThanOrEqual(1);
  });

  it('offers two different powers; a taken power is never offered again in the second choice', () => {
    for (let t = 0; t < 40; t++) {
      let s = startDungeonRun(unlockedSave(), 'roots_vault').save;
      const max = maxHp(s);
      let r = completeDungeonBattle(s, 'roots_vault', { heroHp: max, turns: 4 });
      const offer1 = r.save.dungeons.roots_vault.active!.offer!;
      expect(offer1).toHaveLength(2);
      expect(new Set(offer1).size).toBe(2);
      s = chooseDungeonRelic(r.save, 'roots_vault', offer1[0]).save;
      r = completeDungeonBattle(s, 'roots_vault', { heroHp: max, turns: 4 });
      const offer2 = r.save.dungeons.roots_vault.active!.offer!;
      expect(offer2).toHaveLength(2);
      expect(new Set(offer2).size).toBe(2);
      expect(offer2).not.toContain(offer1[0]);
    }
  });

  it('choosing applies at once and saves choice + progress together (next battle, power owned, offer cleared)', () => {
    let s = startDungeonRun(unlockedSave(), 'roots_vault').save;
    s = win(s, maxHp(s)).save;
    const offer = s.dungeons.roots_vault.active!.offer!;
    const r = chooseDungeonRelic(s, 'roots_vault', offer[1]);
    expect(r.ok).toBe(true);
    expect(r.save.dungeons.roots_vault.active).toMatchObject({ battle: 1, phase: 'battle', relics: [offer[1]], offer: null });
  });

  it('only a currently offered power can be chosen, and only during the choice phase', () => {
    let s = startDungeonRun(unlockedSave(), 'roots_vault').save;
    expect(chooseDungeonRelic(s, 'roots_vault', 'ember_echo').ok).toBe(false); // savaşta seçim yok
    s = win(s, maxHp(s), 3).save;
    const notOffered = RELIC_IDS.find((r) => !s.dungeons.roots_vault.active!.offer!.includes(r))!;
    expect(chooseDungeonRelic(s, 'roots_vault', notOffered).ok).toBe(false);
    const taken = chooseDungeonRelic(s, 'roots_vault', s.dungeons.roots_vault.active!.offer![0]);
    expect(chooseDungeonRelic(taken.save, 'roots_vault', s.dungeons.roots_vault.active!.offer![0]).ok).toBe(false);
  });

  it('a duplicate victory report for an already-recorded battle changes nothing', () => {
    let s = startDungeonRun(unlockedSave(), 'roots_vault').save;
    s = win(s, 100).save;
    const again = win(s, 100);
    expect(again.ok).toBe(false);
    expect(again.save).toBe(s);
  });

  function fullRun(relicPicks: number[] = [0, 0]): { save: GameSaveState; picked: RelicId[] } {
    let s = startDungeonRun(unlockedSave(), 'roots_vault').save;
    const max = maxHp(s);
    const picked: RelicId[] = [];
    for (let i = 0; i < 2; i++) {
      s = completeDungeonBattle(s, 'roots_vault', { heroHp: Math.round(max * 0.6), turns: 6 + i }, { rand: seq(0.1, 0.9) }).save;
      const id = s.dungeons.roots_vault.active!.offer![relicPicks[i]];
      picked.push(id);
      s = chooseDungeonRelic(s, 'roots_vault', id).save;
    }
    return { save: s, picked };
  }

  it('the boss victory pays the reward and records completion in the SAME save update', () => {
    const { save: s, picked } = fullRun();
    const goldBefore = s.gold, crystalsBefore = s.crystals;
    const r = completeDungeonBattle(s, 'roots_vault', { heroHp: 500, turns: 9 }, { now: 4242 });
    expect(r.completed).toBe(true);
    expect(r.save.gold).toBe(goldBefore + def.reward.gold);
    expect(r.save.crystals).toBe(crystalsBefore + def.reward.crystals);
    const d = r.save.dungeons.roots_vault;
    expect(d.active).toBeNull();
    expect(d.completions).toBe(1);
    expect(d.last).toMatchObject({ reward: def.reward, relics: picked, completedAt: 4242 });
    expect(d.last!.results).toHaveLength(3);
  });

  it('the reward is given once per attempt: replaying the boss report or reopening the result pays nothing again', () => {
    const { save: s } = fullRun();
    const done = completeDungeonBattle(s, 'roots_vault', { heroHp: 500, turns: 9 });
    const again = completeDungeonBattle(done.save, 'roots_vault', { heroHp: 500, turns: 9 });
    expect(again.ok).toBe(false);
    expect(again.save.gold).toBe(done.save.gold);
    expect(again.save.dungeons.roots_vault.completions).toBe(1);
    // sonuç verisi kayıtta kalır (ekran tekrar açılabilir), ama ödüllendirme yolu yok
    expect(again.save.dungeons.roots_vault.last).toEqual(done.save.dungeons.roots_vault.last);
  });

  it('a new attempt can be started after completing and gets its own reward once', () => {
    const { save: s } = fullRun();
    const done = completeDungeonBattle(s, 'roots_vault', { heroHp: 500, turns: 9 }, { now: 1 });
    const next = startDungeonRun(done.save, 'roots_vault', 2);
    expect(next.ok).toBe(true);
    expect(next.save.dungeons.roots_vault.active!.runId).not.toBe(done.save.dungeons.roots_vault.last!.runId);
    expect(next.save.dungeons.roots_vault.attempts).toBe(2);
    expect(next.save.dungeons.roots_vault.last).toEqual(done.save.dungeons.roots_vault.last); // eski sonuç silinmez
  });

  it('defeat or abandoning ends the attempt: powers are gone, nothing is paid, progress is not kept', () => {
    const { save: s } = fullRun();
    const ended = endDungeonRun(s, 'roots_vault');
    expect(ended.save.dungeons.roots_vault.active).toBeNull();
    expect(ended.save.gold).toBe(s.gold);
    expect(ended.save.dungeons.roots_vault.completions).toBe(0);
    expect(endDungeonRun(ended.save, 'roots_vault').ok).toBe(false);
  });

  it('battle start hp is the saved hp, capped by the current max hp (equipment may change)', () => {
    let s = startDungeonRun(unlockedSave(), 'roots_vault').save;
    s = win(s, 300).save;
    const run = s.dungeons.roots_vault.active!;
    expect(dungeonStartHp(s, run)).toBe(Math.min(run.hp, maxHp(s)));
    expect(dungeonStartHp(s, { ...run, hp: 10_000_000 })).toBe(maxHp(s));
    expect(dungeonStartHp(s, { ...run, hp: 0 })).toBe(1);
  });
});

describe('powers: effects tied to the battle systems', () => {
  const hero = () => createInitialSaveState().heroes.warrior;
  const base = computeHeroBuild(hero());

  it('Şifalı Öz +20% heal only, Köz Yankısı +12% fire, Buz Akışı +15% frost mana (on top of existing passives)', () => {
    const b = applyRelicsToBuild(base, ['healing_essence', 'ember_echo', 'frost_flow']);
    expect(b.passives.natureHealOnlyPct - base.passives.natureHealOnlyPct).toBe(20);
    expect(b.passives.natureHealPct).toBe(base.passives.natureHealPct); // kalkana uygulanmaz
    expect(b.passives.fireDmgPct - base.passives.fireDmgPct).toBe(12);
    expect(b.passives.frostManaPct - base.passives.frostManaPct).toBe(15);
    expect(b.stats).toEqual(base.stats);
  });

  it('stacks with set bonuses instead of replacing them', () => {
    const withSet = { ...base, passives: { ...base.passives, fireDmgPct: base.passives.fireDmgPct + 10 } };
    expect(applyRelicsToBuild(withSet, ['ember_echo']).passives.fireDmgPct).toBe(base.passives.fireDmgPct + 22);
  });

  it('aggregates effects and ignores duplicates', () => {
    expect(computeRelicEffects(['ulti_spark', 'ulti_spark', 'ready_guardian'])).toMatchObject({ firstMatchUlti: 4, startShieldPct: 10 });
  });

  it('Hazır Muhafız: 10% of max hp as battle-start shield', () => {
    expect(relicStartShield(computeRelicEffects(['ready_guardian']), 1000)).toBe(100);
    expect(relicStartShield(computeRelicEffects([]), 1000)).toBe(0);
  });

  it('Ulti Kıvılcımı: +4 ulti on the first match of a player turn; chain matches do not repeat it', () => {
    const effects = computeRelicEffects(['ulti_spark']);
    const first = resolveRelicMatch({ effects, flags: freshRelicFlags(), counts: { nature: 3 }, squareCount: 0, heroMaxHp: 1000 });
    expect(first.ulti).toBe(4);
    const chain = resolveRelicMatch({ effects, flags: first.flags, counts: { fire: 3 }, squareCount: 0, heroMaxHp: 1000 });
    expect(chain.ulti).toBe(0);
    // yeni tur: yalnızca tur bayrağı sıfırlanır
    const nextTurn = resolveRelicMatch({ effects, flags: { ...chain.flags, turnMatchUsed: false }, counts: { fire: 3 }, squareCount: 0, heroMaxHp: 1000 });
    expect(nextTurn.ulti).toBe(4);
    // eşleşme yoksa bayrak harcanmaz
    expect(resolveRelicMatch({ effects, flags: freshRelicFlags(), counts: {}, squareCount: 0, heroMaxHp: 1000 }).flags.turnMatchUsed).toBe(false);
  });

  it('Kare Siper: 8% max hp shield for the FIRST square of the battle only (not per turn)', () => {
    const effects = computeRelicEffects(['square_bulwark']);
    const a = resolveRelicMatch({ effects, flags: freshRelicFlags(), counts: { fire: 4 }, squareCount: 2, heroMaxHp: 1000 });
    expect(a.shield).toBe(80);
    const turnReset = { ...a.flags, turnMatchUsed: false };
    expect(resolveRelicMatch({ effects, flags: turnReset, counts: { fire: 4 }, squareCount: 1, heroMaxHp: 1000 }).shield).toBe(0);
    expect(resolveRelicMatch({ effects, flags: freshRelicFlags(), counts: { fire: 3 }, squareCount: 0, heroMaxHp: 1000 }).shield).toBe(0);
  });

  it('draws never exceed the remaining pool', () => {
    expect(drawRelicOffer(def, RELIC_IDS.slice(0, 5))).toHaveLength(1);
    expect(drawRelicOffer(def, RELIC_IDS)).toHaveLength(0);
  });
});

describe('saving, loading and recovery', () => {
  let store: Map<string, string>;
  beforeEach(() => {
    store = new Map();
    (globalThis as unknown as { localStorage: unknown }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
  });

  it('closing during the choice screen resumes with the SAME two offered cards', () => {
    let s = startDungeonRun(unlockedSave(), 'roots_vault').save;
    s = win(s, maxHp(s) - 50).save;
    const offer = [...s.dungeons.roots_vault.active!.offer!];
    expect(saveGameState(s)).toBe(true);
    const loaded = loadGameState().save;
    expect(loaded.dungeons.roots_vault.active).toMatchObject({ phase: 'choice', battle: 0 });
    expect(loaded.dungeons.roots_vault.active!.offer).toEqual(offer);
  });

  it('closing mid-battle restarts that battle with the hp and powers it began with', () => {
    let s = startDungeonRun(unlockedSave(), 'roots_vault').save;
    s = win(s, 200).save;
    s = chooseDungeonRelic(s, 'roots_vault', s.dungeons.roots_vault.active!.offer![0]).save;
    const before = s.dungeons.roots_vault.active!;
    saveGameState(s); // savaş başında kaydedildi, savaş ortasında kayıt yok
    const loaded = loadGameState().save.dungeons.roots_vault.active!;
    expect(loaded).toEqual(before);
    expect(loaded.phase).toBe('battle');
    expect(loaded.relics).toHaveLength(1);
  });

  it('completed result and reward flag survive a reload; replaying cannot pay again', () => {
    let s = startDungeonRun(unlockedSave(), 'roots_vault').save;
    for (let i = 0; i < 2; i++) { s = win(s, maxHp(s)).save; s = chooseDungeonRelic(s, 'roots_vault', s.dungeons.roots_vault.active!.offer![0]).save; }
    s = completeDungeonBattle(s, 'roots_vault', { heroHp: 99, turns: 7 }).save;
    saveGameState(s);
    const loaded = loadGameState().save;
    expect(loaded.dungeons.roots_vault.last!.reward).toEqual(def.reward);
    expect(loaded.dungeons.roots_vault.completions).toBe(1);
    const again = completeDungeonBattle(loaded, 'roots_vault', { heroHp: 99, turns: 7 });
    expect(again.save.gold).toBe(loaded.gold);
  });

  it('a v6 save without dungeon data loads with an empty dungeon state', () => {
    const v6 = { ...createInitialSaveState(), version: 6 } as Record<string, unknown>;
    delete v6.dungeons;
    const s = parseSaveString(JSON.stringify(v6))!;
    expect(s.dungeons.roots_vault).toEqual({ active: null, attempts: 0, completions: 0, last: null });
  });

  it('broken dungeon data is sanitized (invalid powers, offers, battle index)', () => {
    const bad = sanitizeDungeonSaves({
      roots_vault: {
        attempts: 'x',
        active: { runId: 'r', battle: 9, phase: 'choice', hp: -4, relics: ['nope', 'ember_echo'], offer: ['ember_echo'], results: 'nope' },
        last: { runId: 5 },
      },
    });
    expect(bad.roots_vault.active).toBeNull(); // geçersiz savaş sırası
    expect(bad.roots_vault.last).toBeNull();
    const ok = sanitizeDungeonSaves({
      roots_vault: { attempts: 2, completions: 1, active: { runId: 'r', battle: 1, phase: 'choice', hp: 50, relics: ['nope', 'ember_echo', 'ember_echo'], offer: ['frost_flow', 'ulti_spark'], results: [{ turns: 4, hpAfter: 30 }] }, last: null },
    });
    expect(ok.roots_vault.active).toMatchObject({ battle: 1, relics: ['ember_echo'], offer: ['frost_flow', 'ulti_spark'] });
    // seçim aşaması ama eksik teklif: kullanılamaz, deneme atılır
    const noOffer = sanitizeDungeonSaves({ roots_vault: { active: { runId: 'r', battle: 0, phase: 'choice', hp: 5, relics: [], offer: ['frost_flow'], results: [] } } });
    expect(noOffer.roots_vault.active).toBeNull();
  });

  it('the dungeon list exposes the one playable dungeon', () => {
    expect(DUNGEONS.map((d) => d.id)).toEqual(['roots_vault']);
  });
});
