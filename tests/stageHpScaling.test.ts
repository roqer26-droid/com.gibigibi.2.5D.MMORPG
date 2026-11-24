import { describe, expect, it } from 'vitest';
import { WORLD_REGIONS } from '../src/data/world';
import { WORLD_HP_BONUS_TABLE, worldBattleStage, worldEnemyMaxHp, worldHpBonusPct, worldStageOrder } from '../src/data/stageHpScaling';
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
    expect(worldEnemyMaxHp(ROUTE[49].id, 10000)).toBe(15000);
    expect(worldEnemyMaxHp(ROUTE[0].id, 380)).toBe(380);
    expect(worldEnemyMaxHp(ROUTE[4].id, 1000)).toBe(Math.round(1000 * (1 + 40 / 9 / 100)));
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
});
