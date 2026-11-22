import { describe, expect, it } from 'vitest';
import { ENEMY_ART_BY_ID, ENEMY_ART_LAYOUT, ENEMY_ART_META, enemyArtKey, enemyPoolLabel, poolArtAssignments } from '../src/data/enemyArt';
import { NORMAL_ENEMY_POOL, REGION_THEMES, assignPoolArt, stableHash, themesForRegion } from '../src/data/enemyArtPool';
import { WORLD_REGIONS } from '../src/data/world';

const POOL_KEYS = NORMAL_ENEMY_POOL.map((p) => p.key);
const stages = WORLD_REGIONS.flatMap((r) => r.stages);
const byType = (t: string) => stages.filter((s) => s.type === t);
const customKey = (id: string) => ENEMY_ART_BY_ID[id] ?? null;

describe('v1.43.0: ortak normal düşman görsel havuzu', () => {
  it('10 havuz görseli: veri tek yerde, meta + yerleşim hazır; yalnızca Sis Güvesi ve Gölge Kuzgunu süzülür', () => {
    expect(NORMAL_ENEMY_POOL).toHaveLength(10);
    expect(NORMAL_ENEMY_POOL.map((p) => p.label)).toEqual(['Obsidyen Köpeği', 'Yosun Tırtılı', 'Kırağı Kirpisi', 'Paslı Maden Örümceği', 'Sis Güvesi', 'Kum Kertenkelesi', 'Kaya Yengeci', 'Gölge Kuzgunu', 'Kristal Kobold', 'Kor Mantarı']);
    for (const p of NORMAL_ENEMY_POOL) {
      expect(ENEMY_ART_META[p.key].aspect, p.key).toBeGreaterThan(0.5);
      expect(ENEMY_ART_LAYOUT[p.key], p.key).toBe(p.layout);
      expect(p.layout.height).toBeLessThanOrEqual(0.76);
      expect((p.layout.bob ?? 0) > 0, p.key).toBe(p.key === 'sis_guvesi' || p.key === 'golge_kuzgunu');
    }
  });

  it('çizimi eksik her normal aşama havuzdan bir görsel alır; özel çizimliler kendi görselini korur', () => {
    const normals = byType('normal');
    const pooled = normals.filter((s) => !ENEMY_ART_BY_ID[s.enemy.id]);
    expect(pooled.length).toBe(77);
    for (const s of pooled) {
      expect(POOL_KEYS, s.id).toContain(enemyArtKey(s.enemy.id));
      expect(enemyPoolLabel(s.enemy.id), s.id).toBeTruthy();
    }
    for (const s of normals.filter((x) => ENEMY_ART_BY_ID[x.enemy.id])) {
      expect(enemyArtKey(s.enemy.id), s.id).toBe(ENEMY_ART_BY_ID[s.enemy.id]);
      expect(enemyPoolLabel(s.enemy.id)).toBeNull();
    }
  });

  it('elit, boss ve hazine karşılaşmaları havuzu KULLANMAZ (özel çizimleri korunur, yoksa vektör)', () => {
    for (const t of ['elite', 'boss', 'treasure']) {
      for (const s of byType(t)) {
        const k = enemyArtKey(s.enemy.id);
        expect(POOL_KEYS, s.id).not.toContain(k);
        expect(k, s.id).toBe(ENEMY_ART_BY_ID[s.enemy.id] ?? null);
      }
    }
  });

  it('atama sabittir: tekrar hesaplama, yeniden açılış ve yeni bölge eklenmesi hiçbir atamayı değiştirmez', () => {
    const a = assignPoolArt(WORLD_REGIONS, customKey);
    const b = assignPoolArt(WORLD_REGIONS, customKey);
    expect(b).toEqual(a);
    expect(poolArtAssignments()).toEqual(a);
    // Bölge sırası/ek bölge: her bölge bağımsız hesaplanır
    const reversed = assignPoolArt([...WORLD_REGIONS].reverse(), customKey);
    expect(reversed).toEqual(a);
    const extra = { id: 'yeni_bolge', stages: [{ id: 'yeni_bolge_1', type: 'normal', stageNumber: 1, enemy: { id: 'yeni_bolge_1_enemy' } }] };
    const withExtra = assignPoolArt([...WORLD_REGIONS, extra], customKey);
    for (const [id, key] of Object.entries(a)) expect(withExtra[id], id).toBe(key);
    // Sabit hash: değer asla değişmemeli (kayıtlı atamalar bunun üzerine kurulu)
    expect(stableHash('forest_2')).toBe(stableHash('forest_2'));
    expect([stableHash(''), stableHash('forest_2')]).toEqual([0x811c9dc5, 3061990349]);
  });

  it('bölge temasına uyan görseller seçilir; art arda gelen normal aşamalarda aynı görsel tekrarlanmaz', () => {
    const a = poolArtAssignments();
    for (const r of WORLD_REGIONS) {
      const themes = themesForRegion(r.id);
      const themed = new Set(NORMAL_ENEMY_POOL.filter((p) => p.themes.some((t) => themes.includes(t))).map((p) => p.key));
      let prev: string | null = null;
      for (const s of r.stages.filter((x) => x.type === 'normal').sort((x, y) => x.stageNumber - y.stageNumber)) {
        const k = enemyArtKey(s.enemy.id)!;
        if (a[s.enemy.id] && themed.size > 1) expect(themed.has(k), `${s.id}→${k}`).toBe(true);
        if (prev && a[s.enemy.id]) expect(k, `${s.id} önceki ile aynı`).not.toBe(prev);
        prev = k;
      }
    }
    // Örnek temalar
    expect(REGION_THEMES.iron_inferno).toContain('volcano');
    for (const n of [1, 2, 4, 6]) expect(['obsidyen_kopegi', 'pasli_maden_orumcegi', 'kor_mantari']).toContain(enemyArtKey(`iron_inferno_${n}_enemy`));
    expect(enemyArtKey('eternal_winter_2_enemy')).toBe('kiragi_kirpi');
  });
  it('özel çizimsiz örnek yeni aşama otomatik eşleşir; özel çizim verilirse ona öncelik verilir; temasız bölge tüm havuzu kullanır', () => {
    const mk = (r: string, n: number, type = 'normal') => ({ id: `${r}_${n}`, type, stageNumber: n, enemy: { id: `${r}_${n}_enemy` } });
    const sand = { id: 'sand_reach', stages: [mk('sand_reach', 1), mk('sand_reach', 2), mk('sand_reach', 3, 'elite'), mk('sand_reach', 4)] };
    expect(themesForRegion('sand_reach')).toEqual(['desert']);
    const auto = assignPoolArt([sand], () => null);
    expect(Object.keys(auto).sort()).toEqual(['sand_reach_1_enemy', 'sand_reach_2_enemy', 'sand_reach_4_enemy']); // elit eşleşmez
    expect(auto.sand_reach_1_enemy).toBe('kum_kertenkele'); // tek temalı aday
    expect(auto.sand_reach_2_enemy).not.toBe(auto.sand_reach_1_enemy); // seçenek varsa tekrar yok
    // özel çizim önceliklidir ve havuz ataması yapılmaz
    const withCustom = assignPoolArt([sand], (id) => (id === 'sand_reach_1_enemy' ? 'ozel_cizim' : null));
    expect(withCustom.sand_reach_1_enemy).toBeUndefined();
    // temasız/tanınmayan bölge: tüm havuzdan, deterministik
    const odd = { id: 'qqq', stages: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => mk('qqq', n)) };
    expect(themesForRegion('qqq')).toEqual([]);
    const r1 = assignPoolArt([odd], () => null);
    expect(assignPoolArt([odd], () => null)).toEqual(r1);
    expect(new Set(Object.values(r1)).size).toBeGreaterThan(3);
    for (const k of Object.values(r1)) expect(POOL_KEYS).toContain(k);
  });
});
