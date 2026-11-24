import { describe, expect, it } from 'vitest';
import { WORLD_REGIONS } from '../src/data/world';
import { WORLD_HP_BONUS_TABLE, typeDamageFactor, WORLD_TARGET_MOVES, applyWorldHpBonus, referenceDamagePerMove, worldBattleStage, worldEnemyMaxHp, worldHpBonusPct, worldPowerFloorHp, worldStageOrder } from '../src/data/stageHpScaling';
import { HUNTS } from '../src/data/hunts';
import { findStageById } from '../src/data/world';
import { boardBossPhase, barrierDamage } from '../src/game/boardBossPhase';

const ROUTE = WORLD_REGIONS.flatMap((r) => r.stages);

describe('Dünya Haritası düşman canı artışı', () => {
  it('tek ayar tablosu ve doğrusal yüzdeler: 1→%0, 10→%10, 11→%10, 20→%20, 21→%20, 49→%49, 50+→%50', () => {
    expect(WORLD_HP_BONUS_TABLE).toHaveLength(3);
    expect(worldHpBonusPct(1)).toBe(0);
    expect(worldHpBonusPct(5)).toBeCloseTo(40 / 9);
    expect(worldHpBonusPct(10)).toBe(10);
    expect(worldHpBonusPct(11)).toBe(10);
    expect(worldHpBonusPct(15)).toBeCloseTo(10 + 40 / 9);
    expect(worldHpBonusPct(20)).toBe(20);
    expect(worldHpBonusPct(21)).toBe(20);
    expect(worldHpBonusPct(49)).toBeCloseTo(20 + (30 * 28) / 29);
    expect(worldHpBonusPct(50)).toBe(50);
    expect(worldHpBonusPct(51)).toBe(50);
    expect(worldHpBonusPct(500)).toBe(50);
    for (let i = 1; i < 500; i++) expect(worldHpBonusPct(i + 1)).toBeGreaterThanOrEqual(worldHpBonusPct(i));
  });

  it('sıra haritanın gerçek sırası (bölge değişince devam eder) ve yuvarlama en sonda (50. aşama: 10.000 → 15.000)', () => {
    expect(worldStageOrder(ROUTE[0].id)).toBe(1);
    const r2first = WORLD_REGIONS[1].stages[0];
    expect(worldStageOrder(r2first.id)).toBe(WORLD_REGIONS[0].stages.length + 1);
    expect(applyWorldHpBonus(50, 10000)).toBe(15000);
    expect(applyWorldHpBonus(1, 380)).toBe(380);
    expect(applyWorldHpBonus(5, 1000)).toBe(Math.round(1000 * (1 + 40 / 9 / 100)));
    expect(worldEnemyMaxHp(ROUTE[4].id, 10_000_000)).toBe(applyWorldHpBonus(5, 10_000_000));
    expect(worldEnemyMaxHp('bilinmeyen', 1000)).toBe(1000);
  });

  it('yalnızca can değişir (saldırı, sıklık, savunma, ödüller aynı); tekrar uygulamada katlanmaz', () => {
    for (const st of ROUTE) {
      const w = worldBattleStage(st);
      expect(w.enemy.maxHp, st.id).toBe(worldEnemyMaxHp(st.id, st.enemy.maxHp));
      expect(w.enemy.attack).toBe(st.enemy.attack);
      expect(w.enemy.attackInterval).toBe(st.enemy.attackInterval);
      expect(w.enemy.defense).toBe(st.enemy.defense);
      expect(w.rewards).toEqual(st.rewards);
      expect(worldBattleStage(w)).toEqual(w); // "Tekrar Oyna" / yeniden başlatma: bir kez
      expect(worldBattleStage(worldBattleStage(w)).enemy.maxHp).toBe(w.enemy.maxHp);
    }
    // veri tablosu değişmedi
    expect(ROUTE[49].enemy.maxHp).toBe(findStageById(ROUTE[49].id)!.stage.enemy.maxHp);
  });

  it('Boss Avı temel aşama verisini kullanır (artış yok); boss fazı yeni en yüksek can üzerinden (%50 bariyer)', () => {
    for (const h of HUNTS) {
      const base = findStageById(h.storyStageId)!.stage;
      expect(base.enemy.maxHp).toBe(ROUTE.find((s) => s.id === h.storyStageId)!.enemy.maxHp);
    }
    const queen = ROUTE.find((s) => s.enemy.bossId === 'frost_queen')!;
    const w = worldBattleStage(queen);
    expect(w.enemy.maxHp).toBeGreaterThan(queen.enemy.maxHp);
    const phase = boardBossPhase(w.enemy);
    // tam candan ölümcül vuruş: can tam olarak yeni en yüksek canın yarısında durur
    const dealt = barrierDamage(phase, 1, undefined, w.enemy.maxHp, w.enemy.maxHp, w.enemy.maxHp * 3);
    expect(w.enemy.maxHp - dealt).toBe(Math.ceil(w.enemy.maxHp * 0.5));
  });

  it('güç tabanı: tek hedef tablosu (normal 10, hazine 10, elit 20, boss 25), 1. aşamadan itibaren; can hiç düşmez', () => {
    expect(WORLD_TARGET_MOVES).toEqual({ normal: 10, treasure: 10, elite: 20, boss: 25 });
    expect(referenceDamagePerMove(1)).toBeCloseTo(950);
    expect(referenceDamagePerMove(16)).toBeCloseTo(15400, -2);
    expect(referenceDamagePerMove(36)).toBeGreaterThan(55000);
    expect(referenceDamagePerMove(36)).toBeLessThan(62000);
    for (let l = 1; l < 200; l++) expect(referenceDamagePerMove(l + 1)).toBeGreaterThan(referenceDamagePerMove(l));
    for (const [i, st] of ROUTE.entries()) {
      const hp = worldBattleStage(st).enemy.maxHp;
      expect(hp).toBe(Math.max(applyWorldHpBonus(i + 1, st.enemy.maxHp), worldPowerFloorHp(st.type, st.recommendedLevel)));
      expect(hp).toBeGreaterThanOrEqual(applyWorldHpBonus(i + 1, st.enemy.maxHp));
      // referans hasarla en az hedef hamle
      expect(hp / (referenceDamagePerMove(st.recommendedLevel) * typeDamageFactor(st.type, st.recommendedLevel))).toBeGreaterThanOrEqual(WORLD_TARGET_MOVES[st.type] * 0.995) // yüzlere yuvarlama payı;
    }
    expect(worldBattleStage(ROUTE[0]).enemy.maxHp).toBe(9500);
  });
});
