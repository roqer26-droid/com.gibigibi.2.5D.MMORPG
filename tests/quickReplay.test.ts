import { describe, expect, it } from 'vitest';
import { WORLD_REGIONS, TOTAL_STAGES } from '../src/data/world';
import { applyStageMastery, getStageObjectives, objectiveText } from '../src/data/mastery';
import { createTransitionGate, nextRouteStage, routePosition, victoryStarStatus } from '../src/game/quickReplay';
import { createInitialSaveState as createDefaultSave } from '../src/utils/storage';
import type { GameSaveState } from '../src/types/game';

const ROUTE = WORLD_REGIONS.flatMap((r) => r.stages);
const saveWith = (completed: string[], objectives: Record<string, { o1: boolean; o2: boolean }> = {}): GameSaveState => {
  const s = createDefaultSave();
  return { ...s, completedStages: completed, mastery: { ...s.mastery, objectives } };
};
const upTo = (stageId: string) => ROUTE.slice(0, ROUTE.findIndex((s) => s.id === stageId) + 1).map((s) => s.id);

describe('Hızlı Tekrar: sıradaki aşama (gerçek rota sırası + açılma kuralı)', () => {
  it('rota 500 aşama; bölge içinde bir sonraki aşama', () => {
    expect(TOTAL_STAGES).toBe(500);
    const s = ROUTE[0];
    const n = nextRouteStage(saveWith(upTo(s.id)), s.id);
    expect(n).toMatchObject({ kind: 'next', unlocked: true });
    expect(n.kind === 'next' && n.stage.id).toBe(ROUTE[1].id);
  });

  it('bölge sonundaki bosstan sonra sıradaki bölgenin ilk aşaması (kimlik sayısına değil rotaya göre)', () => {
    for (let i = 0; i < WORLD_REGIONS.length - 1; i++) {
      const last = WORLD_REGIONS[i].stages[WORLD_REGIONS[i].stages.length - 1];
      const n = nextRouteStage(saveWith(upTo(last.id)), last.id);
      expect(n.kind === 'next' && n.stage.id, last.id).toBe(WORLD_REGIONS[i + 1].stages[0].id);
      expect(n.kind === 'next' && n.unlocked, last.id).toBe(true);
    }
    // örnek: dağlar bölgesinin ilk aşaması, ormanın bossundan sonra gelir
    const forestBoss = WORLD_REGIONS[0].stages[WORLD_REGIONS[0].stages.length - 1];
    expect(forestBoss.enemy.isBoss).toBe(true);
  });

  it('sıradaki aşama mevcut kurallara göre kilitliyse pasif (tutarsız kayıt)', () => {
    const s = ROUTE[10];
    const n = nextRouteStage(saveWith([]), s.id);
    expect(n).toMatchObject({ kind: 'next', unlocked: false });
  });

  it('eski kayıt: boss zaferi (bossVictories) sıradaki bölgeyi açar', () => {
    const boss = ROUTE.find((st, i) => st.enemy.bossId && i > 0 && ROUTE[i + 1])!;
    const save = { ...saveWith([]), bossVictories: [boss.enemy.bossId!] };
    expect(nextRouteStage(save, boss.id)).toMatchObject({ kind: 'next', unlocked: true });
  });

  it('500. aşama rotanın sonu: "Haritaya Dön"', () => {
    const last = ROUTE[ROUTE.length - 1];
    expect(routePosition(last.id)).toEqual({ index: 500, total: 500 });
    expect(nextRouteStage(saveWith(upTo(last.id)), last.id)).toEqual({ kind: 'end' });
  });
});

describe('Ustalık hedefleri: zafer kaydından sonraki yıldız durumu', () => {
  const stage = ROUTE[3];
  const [h1, h2] = getStageObjectives(stage.id).map(objectiveText);

  it('iki hedef eksik: ikisi de gösterilir; bu savaştaki zafer yıldızı eksik görünmez', () => {
    const after = applyStageMastery(saveWith(upTo(ROUTE[2].id)), stage, [false, false]).save;
    const st = victoryStarStatus(after, stage.id);
    expect(st).toMatchObject({ count: 1, complete: false });
    expect(st.stars).toEqual([true, false, false]);
    expect(st.missing).toEqual([h1, h2]);
  });

  it('bir hedef eksik; bu savaşta kazanılan hedef eksik listesinde yok', () => {
    const after = applyStageMastery(saveWith(upTo(ROUTE[2].id)), stage, [true, false]).save;
    const st = victoryStarStatus(after, stage.id);
    expect(st.count).toBe(2);
    expect(st.missing).toEqual([h2]);
  });

  it('tekrar oynayınca yalnızca eksik yıldız kazanılır; önceki yıldızlar kalır; üç yıldızda tamam', () => {
    const first = applyStageMastery(saveWith(upTo(ROUTE[2].id)), stage, [true, false]);
    expect(first.outcome.earned).toEqual({ victory: true, o1: true, o2: false });
    const replay = applyStageMastery(first.save, stage, [false, true]);
    expect(replay.outcome.earned).toEqual({ victory: false, o1: false, o2: true });
    const st = victoryStarStatus(replay.save, stage.id);
    expect(st).toMatchObject({ count: 3, complete: true, missing: [] });
    // üçüncü tekrar: yeni yıldız yok, durum değişmez
    const again = applyStageMastery(replay.save, stage, [true, true]);
    expect(again.outcome.earned).toEqual({ victory: false, o1: false, o2: false });
    expect(victoryStarStatus(again.save, stage.id).count).toBe(3);
  });

  it('eski kayıt (ustalık kaydı olmadan tamamlanmış aşama): zafer yıldızı var, iki hedef eksik', () => {
    const legacy = saveWith(upTo(stage.id));
    const st = victoryStarStatus(legacy, stage.id);
    expect(st).toMatchObject({ count: 1, stars: [true, false, false], missing: [h1, h2] });
  });
});

describe('geçiş kilidi', () => {
  it('kayıt tamamlanmadan açılmaz; ilk dokunuş kilitler; yeni savaşta sıfırlanır', () => {
    const g = createTransitionGate();
    expect(g.take(false)).toBe(false);
    expect(g.take(true)).toBe(true);
    expect(g.take(true)).toBe(false); // çift dokunma
    g.reset();
    expect(g.take(true)).toBe(true);
  });
});
