import { describe, expect, it } from 'vitest';
import { readdirSync } from 'fs';
import manifest from '../src/art/heroes-idle/idle-manifest.json';
import { IDLE_DURATION_MS, IDLE_FPS, IDLE_FRAME_COUNT, IDLE_ORIGIN, IDLE_SEQUENCE, IDLE_SHEET_URL, idleFrameAt, idleReference, idleSheetKey, idleSpec } from '../src/data/heroIdle';
import { isValidCostume } from '../src/data/costumes';

describe('v1.62.0: çizilmiş bekleme (idle) animasyonları', () => {
  it('manifest: 12 FPS, 54 kare dizisi = 4,5 sn; tekrarlar pozun kalma süresini belirler', () => {
    expect(IDLE_FPS).toBe(12);
    expect(IDLE_SEQUENCE).toHaveLength(54);
    expect(IDLE_DURATION_MS).toBe(4500);
    expect(IDLE_SEQUENCE.length / IDLE_FPS).toBeCloseTo(4.5, 6);
    expect(IDLE_FRAME_COUNT).toBe(8);
    expect(IDLE_ORIGIN).toEqual({ x: 0.5, y: 0.96875 });
    const holds = manifest.frameHolds as number[];
    expect(holds.reduce((a, b) => a + b, 0)).toBe(54);
    for (let f = 0; f < 8; f++) expect(IDLE_SEQUENCE.filter((x) => x === f).length, `kare ${f}`).toBe(holds[f]);
    // dizi pozları sırayla ve kesintisiz gösterir (0..7)
    expect([...new Set(IDLE_SEQUENCE)]).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('kare seçimi: 12 FPS, 4,5 sn sonunda başa sarar; tekrarlar kadar ekranda kalır', () => {
    expect(idleFrameAt(0)).toBe(0);
    expect(idleFrameAt(7 / 12)).toBe(0); // ilk poz 8 kare tutulur (0–7)
    expect(idleFrameAt(8 / 12)).toBe(1);
    expect(idleFrameAt(13 / 12)).toBe(2);
    expect(idleFrameAt(53 / 12)).toBe(7);
    expect(idleFrameAt(4.5)).toBe(0); // döngü başa döner
    expect(idleFrameAt(4.5 + 8 / 12)).toBe(1);
    expect(idleFrameAt(-1)).toBe(0);
    // her pozun toplam kalma süresi = holds / 12 sn
    const counts = new Array(8).fill(0);
    for (let i = 0; i < 54; i++) counts[idleFrameAt(i / 12 + 1e-6)]++;
    expect(counts).toEqual(manifest.frameHolds);
  });

  it('57 sheet: kahraman/kostüm eşlemesi manifestle aynı; dosya mevcut; geçersiz kostüm ve sheet olmayan kahraman statik çizime düşer', () => {
    expect(manifest.textures).toHaveLength(57);
    const files = readdirSync('src/art/heroes-idle').filter((f) => f.endsWith('.webp')).map((f) => f.replace('.webp', '')).sort();
    const keys: string[] = [];
    for (const t of manifest.textures) {
      const key = (t as { key?: string }).key ?? (t.costume === 'default' ? t.hero : `${t.hero}_${t.costume}`);
      keys.push(key);
      if (t.costume !== 'default') expect(isValidCostume(t.hero, key), key).toBe(true);
      expect(IDLE_SHEET_URL[key], key).toBeTruthy();
      expect(idleSheetKey(t.hero, t.costume === 'default' ? null : key), key).toBe(key);
      const ref = idleReference(key)!;
      expect(ref.top).toBeGreaterThan(0.05);
      expect(ref.bottom).toBeGreaterThan(0.7); // havada duran kahramanların ayağı kare tabanından yukarıda olabilir
      expect(ref.bottom).toBeLessThanOrEqual(1);
    }
    expect(files).toEqual(keys.sort());
    expect(idleSheetKey('warrior')).toBe('warrior');
    expect(idleSheetKey('warrior', 'mage_ay_kristali')).toBe('warrior'); // başka şampiyonun kostümü → varsayılan sheet
    expect(idleSheetKey('golem')).toBeNull(); // sheet'i olmayan kahraman
    expect(idleSheetKey('golem', 'fairy_yildiz_tozu')).toBeNull();
  });

  it('16 pozlu sheet: kendi ızgarası, hızı ve dizisiyle oynar; diğerleri 4×2 varsayılanında kalır', () => {
    const sixteen = (manifest.textures as Array<{ hero: string; costume: string; key?: string; frameCount?: number; frameSequence?: number[]; frameHolds?: number[]; columns?: number; rows?: number; frameRate?: number }>).filter((t) => t.frameCount === 16);
    expect(sixteen).toHaveLength(17);
    for (const t of sixteen) {
      const key = t.key ?? (t.costume === 'default' ? t.hero : `${t.hero}_${t.costume}`);
      const sp = idleSpec(key);
      expect(sp.columns, key).toBe(4);
      expect(sp.rows, key).toBe(4);
      expect(sp.fps, key).toBe(t.frameRate);
      expect(sp.sequence, key).toEqual(t.frameSequence);
      expect([...new Set(sp.sequence)], key).toEqual(Array.from({ length: 16 }, (_, i) => i));
      expect(sp.sequence.length / sp.fps * 1000, key).toBeCloseTo(t.frameSequence!.length / 12 * 1000, 3);
      for (let f = 0; f < 16; f++) expect(sp.sequence.filter((x) => x === f).length, `${key} kare ${f}`).toBe(t.frameHolds![f]);
      // kare seçimi sheet'in kendi dizisini izler ve döngü başa sarar
      expect(idleFrameAt(0, sp)).toBe(sp.sequence[0]);
      expect(idleFrameAt(sp.sequence.length / sp.fps, sp)).toBe(sp.sequence[0]);
      expect(idleFrameAt(sp.sequence.length / sp.fps - 1e-3, sp)).toBe(sp.sequence[sp.sequence.length - 1]);
    }
    // 4 kahramanın varsayılan görünümü 8 pozlu kalır; Anka/Cin/Serafim varsayılanları 16 pozludur
    for (const k of ['night_screecher', 'assassin', 'fairy', 'siren', 'golem']) expect(idleSpec(k).frameCount, k).toBe(8);
    for (const k of ['phoenix', 'djinn', 'seraph', 'phoenix_gunes_taci', 'djinn_gece_sarayi', 'seraph_gunes_mabedi']) expect(idleSpec(k).frameCount, k).toBe(16);
    expect(idleSpec('assassin_mor_sis').frameCount).toBe(16);
    expect(idleSpec('olmayan').frameCount).toBe(8);
  });

  it('12 pozlu sheet (4×3): dört kahramanın üç görünümü kendi dizisiyle oynar', () => {
    const twelve = (manifest.textures as Array<{ hero: string; costume: string; key?: string; frameCount?: number; frameSequence?: number[]; columns?: number; rows?: number; frameRate?: number }>).filter((t) => t.frameCount === 12);
    expect(twelve).toHaveLength(12);
    expect([...new Set(twelve.map((t) => t.hero))].sort()).toEqual(['kitsune', 'paladin', 'stormcaller', 'warrior']);
    for (const t of twelve) {
      const key = t.key ?? (t.costume === 'default' ? t.hero : `${t.hero}_${t.costume}`);
      const sp = idleSpec(key);
      expect([sp.columns, sp.rows], key).toEqual([4, 3]);
      expect(sp.fps, key).toBe(t.frameRate);
      expect(sp.sequence, key).toEqual(t.frameSequence);
      expect([...new Set(sp.sequence)], key).toEqual(Array.from({ length: 12 }, (_, i) => i));
    }
    expect(idleSpec('stormcaller_mercan_firtinasi').frameCount).toBe(12);
  });
});
