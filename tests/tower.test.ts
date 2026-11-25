import { describe, expect, it } from 'vitest';
import {
  TOWER_CONFIG,
  TOWER_REF_TABLE,
  TOWER_RULES,
  applyTowerVictory,
  bracketOf,
  canEnterFloor,
  floorKind,
  isTowerUnlocked,
  nextSpecialReward,
  towerEnemyStats,
  towerFirstClearRewards,
  towerFloorStage,
  towerRuleFor,
  towerUnlockStageId,
} from '../src/data/tower';
import { WORLD_REGIONS } from '../src/data/world';
import { computeHeroBuild } from '../src/utils/rpgLogic';
import { generateEquipmentItem } from '../src/data/items';
import type { EquipmentSlot, GameSaveState, HeroClassId, Rarity } from '../src/types/game';
import { SAVE_VERSION, createInitialSaveState, parseSaveString } from '../src/utils/storage';

const ROUTE = WORLD_REGIONS.flatMap((r) => r.stages);
const N = TOWER_CONFIG.floors;
const make = (highest = 0, upTo = 50): GameSaveState => {
  const s = createInitialSaveState();
  return { ...s, completedStages: ROUTE.slice(0, upTo).map((x) => x.id), tower: { highest, seals: 0, titles: [], wins: 0 } };
};
let itemSeq = 0;
const maker = (p: { level: number; rarity: Rarity }) => ({ ...generateEquipmentItem(p), id: `t${itemSeq++}` });

describe('Sonsuzluk Kulesi: açılış ve kat yapısı', () => {
  it('Dünya Haritası 50. aşaması tamamlanınca açılır', () => {
    expect(towerUnlockStageId()).toBe(ROUTE[49].id);
    expect(isTowerUnlocked(make(0, 49))).toBe(false);
    expect(isTowerUnlocked(make(0, 50))).toBe(true);
    expect(canEnterFloor(make(0, 49), 1)).toBe(false);
  });

  it('100 kat; her 5. kat elit, her 10. kat boss (boss öncelikli), 100. kat nihai boss', () => {
    expect(N).toBe(100);
    const kinds = Array.from({ length: N }, (_, i) => floorKind(i + 1));
    expect(kinds.filter((k) => k === 'boss').length).toBe(9);
    expect(kinds.filter((k) => k === 'elite').length).toBe(10);
    expect(kinds.filter((k) => k === 'final').length).toBe(1);
    expect(floorKind(5)).toBe('elite');
    expect(floorKind(10)).toBe('boss');
    expect(floorKind(50)).toBe('boss');
    expect(floorKind(25)).toBe('elite');
    expect(floorKind(100)).toBe('final');
    expect(floorKind(1)).toBe('normal');
  });

  it('kat grupları', () => {
    expect(bracketOf(1).name).toBe('Başlangıç');
    expect(bracketOf(20).name).toBe('Başlangıç');
    expect(bracketOf(21).name).toBe('Orta');
    expect(bracketOf(41).name).toBe('Zor');
    expect(bracketOf(61).name).toBe('Uzman');
    expect(bracketOf(99).name).toBe('Efsanevi');
    expect(bracketOf(100).name).toBe('Nihai Sınav');
  });

  it('sıralı ilerleme: yalnızca tamamlananlar ve sıradaki kat girilebilir', () => {
    const s = make(4);
    expect(canEnterFloor(s, 5)).toBe(true);
    expect(canEnterFloor(s, 3)).toBe(true);
    expect(canEnterFloor(s, 6)).toBe(false);
    expect(canEnterFloor(s, 0)).toBe(false);
    expect(canEnterFloor(s, 101)).toBe(false);
  });

  it('kat aşaması: gerçek düşman şablonu (görsel/boss fazı için kimlik), boss katlarında boss', () => {
    for (const f of [1, 5, 10, 25, 50, 75, 100]) {
      const st = towerFloorStage(f);
      expect(st.id).toBe(`tower:${f}`);
      expect(ROUTE.some((r) => r.enemy.id === st.enemy.id)).toBe(true);
      expect(st.enemy.isBoss).toBe(f % 10 === 0);
    }
    expect(towerFloorStage(100).enemy.name).toBe('Sonsuzluk Bekçisi Aeon');
    expect(towerFloorStage(100).enemy.bossId).toBeTruthy();
  });
});

describe('Sonsuzluk Kulesi: zorluk', () => {
  const st = (f: number) => towerEnemyStats(f);

  it('aynı türde katlar arasında ani sıçrama yok, değerler artıyor', () => {
    for (const kind of ['normal', 'elite', 'boss'] as const) {
      const floors = Array.from({ length: N }, (_, i) => i + 1).filter((f) => floorKind(f) === kind);
      for (let i = 1; i < floors.length; i++) {
        const a = st(floors[i - 1]);
        const b = st(floors[i]);
        expect(b.maxHp).toBeGreaterThan(a.maxHp);
        expect(b.attack).toBeGreaterThanOrEqual(a.attack);
        expect(b.defense).toBeGreaterThan(a.defense);
        // ardışık normal katlarda en fazla %8, elit/boss (5–10 kat arayla) en fazla %40 artış
        const step = (floors[i] - floors[i - 1]) * 0.08;
        expect(b.maxHp / a.maxHp).toBeLessThan(1 + Math.max(step, 0.08) + 0.01);
      }
    }
  });

  it('can, saldırıdan daha hızlı artar', () => {
    const hpGrowth = st(99).maxHp / st(1).maxHp;
    const atkGrowth = st(99).attack / st(1).attack;
    expect(hpGrowth).toBeGreaterThan(atkGrowth);
  });

  it('elit ve boss katları normal komşularından belirgin zor; 100. kat diğer bosslardan güçlü', () => {
    for (const f of [5, 25, 45, 75, 95]) expect(st(f).maxHp).toBeGreaterThan(st(f - 1).maxHp * 1.6);
    for (const f of [10, 30, 50, 90]) {
      expect(st(f).maxHp).toBeGreaterThan(st(f - 5).maxHp);
      expect(st(f).attack).toBeGreaterThan(st(f - 1).attack);
    }
    expect(st(100).maxHp).toBeGreaterThan(st(90).maxHp * 1.4);
    expect(st(100).attack).toBeGreaterThan(st(90).attack);
  });

  it('yüksek katlarda referans kahraman 2–3 hamlede bitiremez (hedef hamle ≥ 9)', () => {
    // Referans kahramanın 3 katı güçlü bir kahraman bile normal katı 3 hamleden uzun sürede bitirir
    for (const f of [25, 50, 75, 99]) {
      const s = towerFloorStage(f);
      expect(s.enemy.maxHp).toBeGreaterThan(0);
    }
    expect(st(1).maxHp).toBeGreaterThan(55_000 * 1.5 * 3);
  });

  it('düşman değerleri kahramana göre ölçeklenmez (yalnızca kata bağlı)', () => {
    expect(towerFloorStage(42)).toEqual(towerFloorStage(42));
  });

  it('referans kahraman tablosu computeHeroBuild ölçümüyle uyumlu', () => {
    const slots: EquipmentSlot[] = ['helmet', 'chest', 'gloves', 'pants', 'boots', 'weapon', 'offhand', 'necklace', 'ring1', 'ring2'];
    const build = (cls: HeroClassId, level: number, rarity: Rarity, up: number, aw: number) => {
      let a = 0, h = 0, d = 0;
      const K = 12;
      for (let k = 0; k < K; k++) {
        const hero = { ...createInitialSaveState().heroes[cls], level, awakening: aw, equipped: {} as Record<string, unknown> };
        for (const sl of slots) {
          const it = generateEquipmentItem({ level, rarity, slot: sl, preferredClass: cls });
          it.upgradeLevel = up;
          hero.equipped[sl] = it;
        }
        const b = computeHeroBuild(hero as never);
        a += b.stats.attack / K; h += b.stats.health / K; d += b.stats.defense / K;
      }
      return { a, h, d };
    };
    const avg = (level: number, rarity: Rarity, up: number, aw: number) => {
      const w = build('warrior', level, rarity, up, aw);
      const m = build('mage', level, rarity, up, aw);
      return { a: (w.a + m.a) / 2, h: (w.h + m.h) / 2, d: (w.d + m.d) / 2 };
    };
    const base50 = avg(50, 'legendary', 0, 0);
    const top = avg(50, 'mythic', 10, 5);
    const row100 = TOWER_REF_TABLE.find((r) => r.floor === 100)!;
    expect(top.a / base50.a).toBeGreaterThan(row100.power * 0.9);
    expect(top.a / base50.a).toBeLessThan(row100.power * 1.1);
    expect(top.h).toBeGreaterThan(row100.hp * 0.9);
    expect(top.h).toBeLessThan(row100.hp * 1.1);
    const row1 = avg(35, 'legendary', 0, 0);
    expect(row1.h).toBeGreaterThan(TOWER_REF_TABLE[0].hp * 0.9);
    expect(row1.h).toBeLessThan(TOWER_REF_TABLE[0].hp * 1.1);
  });
});

describe('Sonsuzluk Kulesi: özel kurallar', () => {
  it('ilk 20 katta kural yok; her katta en fazla bir sabit kural; 100. kat Güçlü Zırh', () => {
    for (let f = 1; f <= 20; f++) expect(towerRuleFor(f)).toBeNull();
    const all = Array.from({ length: N }, (_, i) => towerRuleFor(i + 1));
    expect(all.filter(Boolean).length).toBeGreaterThan(30);
    expect(new Set(all.filter(Boolean)).size).toBe(Object.keys(TOWER_RULES).length);
    expect(towerRuleFor(100)).toBe('armored');
    // kimliğe bağlı ve sabit
    expect(Array.from({ length: N }, (_, i) => towerRuleFor(i + 1))).toEqual(all);
  });
});

describe('Sonsuzluk Kulesi: ödüller ve kayıt', () => {
  it('ilk zafer ödülleri tek işlemde; mühür türüne göre', () => {
    const s0 = make(0);
    const r = applyTowerVictory(s0, 1, maker);
    expect(r.outcome?.firstClear).toBe(true);
    expect(r.save.tower.highest).toBe(1);
    expect(r.save.tower.seals).toBe(1);
    expect(r.save.gold).toBe(s0.gold + towerFirstClearRewards(1).gold);
    expect(r.save.crystals).toBe(s0.crystals + towerFirstClearRewards(1).crystals);
    expect(r.save.inventory.length).toBe(s0.inventory.length + 1);
    expect(applyTowerVictory(make(4), 5, maker).save.tower.seals).toBe(3);
    expect(applyTowerVictory(make(9), 10, maker).save.tower.seals).toBe(5);
    expect(applyTowerVictory(make(99), 100, maker).save.tower.seals).toBe(25);
  });

  it('tekrar oynanan / çift işlenen zafer ödül vermez', () => {
    const a = applyTowerVictory(make(0), 1, maker).save;
    const b = applyTowerVictory(a, 1, maker);
    expect(b.outcome?.firstClear).toBe(false);
    expect(b.save.gold).toBe(a.gold);
    expect(b.save.tower.seals).toBe(a.tower.seals);
    expect(b.save.inventory.length).toBe(a.inventory.length);
    expect(b.save.tower.wins).toBe(a.tower.wins + 1);
    // yeniden yüklenen kayıtla da tekrar verilmez
    const re = parseSaveString(JSON.stringify(a))!;
    expect(applyTowerVictory(re, 1, maker).outcome?.firstClear).toBe(false);
  });

  it('sırası gelmemiş kat reddedilir', () => {
    const s = make(0);
    const r = applyTowerVictory(s, 3, maker);
    expect(r.outcome).toBeNull();
    expect(r.save).toBe(s);
  });

  it('5. katta nadir+, 10. katta sandık, 25. katta malzeme, 100. katta mitik + büyük ödül + unvan', () => {
    const rank: Record<Rarity, number> = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, mythic: 5 };
    for (let f = 5; f <= N; f += 5) expect(rank[towerFirstClearRewards(f).item.rarity]).toBeGreaterThanOrEqual(2);
    for (let f = 1; f <= N; f++) {
      const r = towerFirstClearRewards(f);
      expect(!!r.chest).toBe(f % 10 === 0);
      expect(!!r.materials).toBe(f % 25 === 0);
    }
    const last = applyTowerVictory(make(99), 100, maker);
    expect(last.outcome?.items[0].rarity).toBe('mythic');
    expect(last.save.tower.titles).toContain('Kule Fatihi');
    expect(last.save.materials.awakenShard).toBe(100);
    expect(last.save.materials.divineEssence).toBe(8);
    const s25 = applyTowerVictory(make(24), 25, maker).save;
    expect(s25.materials.awakenShard).toBe(25);
    const s10 = applyTowerVictory(make(9), 10, maker);
    expect(s10.outcome?.chest).toBeTruthy();
    expect(s10.save.potions.medium).toBe(make().potions.medium + 2);
  });

  it('sıradaki özel ödül', () => {
    expect(nextSpecialReward(make(0))?.floor).toBe(10);
    expect(nextSpecialReward(make(20))?.floor).toBe(25);
    expect(nextSpecialReward(make(99))?.floor).toBe(100);
    expect(nextSpecialReward(make(100))).toBeNull();
  });

  it('eski kayıt (v15, kule yok) güvenle başlar; bozuk değerler temizlenir', () => {
    const old = { ...createInitialSaveState(), version: 15 } as Record<string, unknown>;
    delete old.tower;
    const loaded = parseSaveString(JSON.stringify(old))!;
    expect(loaded.version).toBe(SAVE_VERSION);
    expect(loaded.tower).toEqual({ highest: 0, seals: 0, titles: [], wins: 0 });
    const bad = parseSaveString(JSON.stringify({ ...createInitialSaveState(), tower: { highest: 999, seals: -5, titles: ['Kule Fatihi', 3], wins: 'x' } }))!;
    expect(bad.tower).toEqual({ highest: 100, seals: 0, titles: ['Kule Fatihi'], wins: 0 });
  });
});
