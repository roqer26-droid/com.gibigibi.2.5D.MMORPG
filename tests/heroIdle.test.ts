import { describe, expect, it } from 'vitest';
import { readdirSync } from 'fs';
import manifest from '../src/art/heroes-idle/idle-manifest.json';
import { IDLE_DURATION_MS, IDLE_FPS, IDLE_FRAME_COUNT, IDLE_ORIGIN, IDLE_SEQUENCE, IDLE_SHEET_URL, idleFrameAt, idleReference, idleSheetKey } from '../src/data/heroIdle';
import { isValidCostume } from '../src/data/costumes';

describe('v1.62.0: çizilmiş bekleme (idle) animasyonları', () => {
  it('manifest: 12 FPS, 54 kare dizisi = 4,5 sn; tekrarlar pozun kalma süresini belirler', () => {
    expect(IDLE_FPS).toBe(12);
    expect(IDLE_SEQUENCE).toHaveLength(54);
    expect(IDLE_DURATION_MS).toBe(4500);
    expect(IDLE_SEQUENCE.length / IDLE_FPS).toBeCloseTo(4.5, 6);
    expect(IDLE_FRAME_COUNT).toBe(8);
    expect(IDLE_ORIGIN).toEqual({ x: 0.5, y: 0.96875 });
    const holds = manifest.frameHolds;
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

  it('24 sheet: kahraman/kostüm eşlemesi manifestle aynı; dosya mevcut; geçersiz kostüm ve sheet olmayan kahraman statik çizime düşer', () => {
    expect(manifest.textures).toHaveLength(24);
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
      expect(ref.bottom).toBeGreaterThan(0.85); // havada duran Gecenin Çığırtkanı'nın ayağı kare tabanından yukarıda
      expect(ref.bottom).toBeLessThanOrEqual(1);
    }
    expect(files).toEqual(keys.sort());
    expect(idleSheetKey('warrior')).toBe('warrior');
    expect(idleSheetKey('warrior', 'mage_ay_kristali')).toBe('warrior'); // başka şampiyonun kostümü → varsayılan sheet
    expect(idleSheetKey('fairy')).toBeNull(); // sheet'i olmayan kahraman
    expect(idleSheetKey('fairy', 'fairy_yildiz_tozu')).toBeNull();
  });
});
