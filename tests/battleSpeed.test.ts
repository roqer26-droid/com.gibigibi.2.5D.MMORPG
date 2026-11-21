import { describe, expect, it } from 'vitest';
import { SPEED_UNLOCK_STAGE_ID, applySpeedUnlock, effectiveSpeed, setBattleSpeed, speedUnlockReached } from '../src/data/battleSpeed';
import { WORLD_REGIONS } from '../src/data/world';
import { createInitialSaveState, parseSaveString } from '../src/utils/storage';

const ids = WORLD_REGIONS.flatMap((r) => r.stages.map((s) => s.id));

describe('2× battle speed unlock', () => {
  it('is tied to the 100th stage of the world map order, found from the region data', () => {
    expect(SPEED_UNLOCK_STAGE_ID).toBe(ids[99]);
    const region = WORLD_REGIONS.find((r) => r.stages.some((s) => s.id === SPEED_UNLOCK_STAGE_ID))!;
    expect(region.id).toBe(ids[99].replace(/_\d+$/, ''));
  });

  it('stays locked through stage 99 and opens permanently when stage 100 is completed', () => {
    const base = createInitialSaveState();
    expect(speedUnlockReached(ids.slice(0, 99))).toBe(false);
    const at99 = applySpeedUnlock({ ...base, completedStages: ids.slice(0, 99) });
    expect(at99.speed.unlocked).toBe(false);
    expect(effectiveSpeed({ ...at99, settings: { ...at99.settings, battleSpeed: 2 } })).toBe(1); // kilitliyken 2× geçersiz
    expect(setBattleSpeed(at99, 2)).toBe(at99);
    const at100 = applySpeedUnlock({ ...base, completedStages: ids.slice(0, 100) });
    expect(at100.speed).toEqual({ unlocked: true, noticeShown: false });
    // kalıcı: sonradan kayıt değişse de açık kalır
    expect(applySpeedUnlock({ ...at100, completedStages: [] }).speed.unlocked).toBe(true);
  });

  it('old saves with stage 100 or any later stage completed unlock on load; others do not', () => {
    const base = createInitialSaveState();
    const load = (completed: string[], extra: object = {}) => parseSaveString(JSON.stringify({ ...base, version: 10, speed: undefined, completedStages: completed, ...extra }))!;
    expect(load(ids.slice(0, 99)).speed.unlocked).toBe(false);
    expect(load(ids.slice(0, 100)).speed.unlocked).toBe(true);
    expect(load([ids[250]]).speed.unlocked).toBe(true); // 100. aşamadan sonraki tek bir aşama
    expect(load([ids[250]]).speed.noticeShown).toBe(false); // bildirim açılışta gösterilecek
  });

  it('the preference persists across save/load; locked saves cannot load a 2× preference', () => {
    const base = createInitialSaveState();
    const opened = applySpeedUnlock({ ...base, completedStages: ids.slice(0, 100) });
    const chosen = setBattleSpeed(opened, 2);
    expect(effectiveSpeed(chosen)).toBe(2);
    const reloaded = parseSaveString(JSON.stringify(chosen))!;
    expect(reloaded.settings.battleSpeed).toBe(2);
    expect(effectiveSpeed(reloaded)).toBe(2);
    expect(setBattleSpeed(chosen, 1).settings.battleSpeed).toBe(1);
    const tampered = parseSaveString(JSON.stringify({ ...base, settings: { ...base.settings, battleSpeed: 7 } }))!;
    expect(tampered.settings.battleSpeed).toBe(1);
    expect(effectiveSpeed(parseSaveString(JSON.stringify({ ...base, settings: { ...base.settings, battleSpeed: 2 } }))!)).toBe(1);
    expect(base.settings.battleSpeed).toBe(1); // varsayılan 1×
  });
});
