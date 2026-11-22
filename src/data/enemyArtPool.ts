/**
 * Ortak NORMAL düşman görsel havuzu.
 *
 * Aşamaya özel çizimi olmayan NORMAL aşamalar (elit/boss/hazine karşılaşmaları hariç) bu havuzdan bir görsel alır.
 * Havuzun tamamı bu dosyadaki tek veri tanımıdır: yeni bir havuz görseli eklemek için
 *   1) `src/art/enemies/<anahtar>.webp` dosyasını koyun, 2) `meta.json` içine `{aspect, footFrac}` ekleyin (yüklemeyle aynı hat),
 *   3) aşağıdaki `NORMAL_ENEMY_POOL` listesine bir satır ekleyin.
 * Diğer her şey (yerleşim, parlama, nefes/süzülme, atama) otomatiktir. Listeye SONA eklemek mevcut atamaları değiştirmez
 * yalnızca temasına uyan aşamalardaki seçimi etkiler; atamaların tamamen sabit kalması gerekiyorsa mevcut sıra korunmalıdır.
 */
import type { EnemyArtLayout } from './enemyArt';
import type { AttackProfile } from '../game/attackAnimation';

export interface PoolEntry {
  /** Dosya adı (uzantısız) ve çizim anahtarı */
  key: string;
  /** Paket adı = görsel etiketi */
  label: string;
  /** Uygun temalar */
  themes: readonly string[];
  /** Savaş yerleşimi (havada duranlarda `float` + `bob`) */
  layout: EnemyArtLayout;
  /** Saldırı animasyonu (çizime göre: pençe/ısırık/kıskaç/yumruk/büyü/silah) */
  attack: AttackProfile;
}

const FLOAT = { float: 0.04, bob: 0.012 } as const;

export const NORMAL_ENEMY_POOL: readonly PoolEntry[] = [
  { key: 'obsidyen_kopegi', label: 'Obsidyen Köpeği', themes: ['volcano', 'rock', 'ember'], layout: { height: 0.5, maxWidth: 0.94, glow: '#fb923c', breathSec: 3.0 }, attack: { type: 'melee_unarmed', style: 'bite' } },
  { key: 'yosun_tirtir', label: 'Yosun Tırtılı', themes: ['forest', 'swamp'], layout: { height: 0.4, maxWidth: 0.96, glow: '#4ade80', breathSec: 3.2 }, attack: { type: 'melee_unarmed', style: 'bite' } },
  { key: 'kiragi_kirpi', label: 'Kırağı Kirpisi', themes: ['ice', 'mountain'], layout: { height: 0.58, maxWidth: 0.9, glow: '#7dd3fc', breathSec: 3.2 }, attack: { type: 'melee_unarmed', style: 'claw' } },
  { key: 'pasli_maden_orumcegi', label: 'Paslı Maden Örümceği', themes: ['mine', 'ruin'], layout: { height: 0.5, maxWidth: 0.96, glow: '#f59e0b', breathSec: 2.8 }, attack: { type: 'melee_unarmed', style: 'bite' } },
  { key: 'sis_guvesi', label: 'Sis Güvesi', themes: ['mist', 'dream', 'swamp'], layout: { height: 0.52, maxWidth: 0.96, glow: '#c4b5fd', breathSec: 3.4, ...FLOAT }, attack: { type: 'spell' } },
  { key: 'kum_kertenkele', label: 'Kum Kertenkelesi', themes: ['desert', 'sandstone'], layout: { height: 0.38, maxWidth: 0.96, glow: '#fbbf24', breathSec: 2.8 }, attack: { type: 'melee_unarmed', style: 'bite' } },
  { key: 'kaya_yengeci', label: 'Kaya Yengeci', themes: ['coast', 'cave'], layout: { height: 0.46, maxWidth: 0.96, glow: '#38bdf8', breathSec: 3.2 }, attack: { type: 'melee_unarmed', style: 'pincer' } },
  { key: 'golge_kuzgunu', label: 'Gölge Kuzgunu', themes: ['night', 'dark', 'ruin'], layout: { height: 0.56, maxWidth: 0.96, glow: '#a855f7', breathSec: 3.0, ...FLOAT }, attack: { type: 'melee_unarmed', style: 'claw' } },
  { key: 'kristal_kobold', label: 'Kristal Kobold', themes: ['crystal', 'cave', 'magicforest'], layout: { height: 0.68, maxWidth: 0.82, glow: '#2dd4bf', breathSec: 2.8 }, attack: { type: 'melee_weapon', trail: 'wide' } },
  { key: 'kor_mantari', label: 'Kor Mantarı', themes: ['volcano', 'ember', 'cave'], layout: { height: 0.64, maxWidth: 0.9, glow: '#f97316', breathSec: 3.4 }, attack: { type: 'melee_unarmed', style: 'fist' } },
];

export const POOL_BY_KEY: Readonly<Record<string, PoolEntry>> = Object.fromEntries(NORMAL_ENEMY_POOL.map((p) => [p.key, p]));

/** Bölge → temalar. Listede olmayan (ileride eklenecek) bölgeler `themesForRegion` içindeki anahtar kelimelerle eşlenir. */
export const REGION_THEMES: Readonly<Record<string, readonly string[]>> = {
  forest: ['forest', 'magicforest'], mountains: ['ice', 'mountain', 'rock'], volcano: ['volcano', 'rock', 'ember'], ruins: ['ruin', 'dark', 'mine'],
  abyss: ['dark', 'night', 'cave'], sky: ['mist', 'mountain'], ocean: ['coast', 'cave'], desert: ['desert', 'sandstone'], swamp: ['swamp', 'forest', 'mist'],
  moonlit: ['night', 'magicforest', 'mist'], crystal_caves: ['crystal', 'cave'], ashen: ['ember', 'volcano', 'rock'], astral: ['rock', 'crystal', 'night'],
  spirit: ['dark', 'mist', 'night'], chaos: ['dark', 'ember'], star_gate: ['crystal', 'night'], time_rift: ['ruin', 'crystal'], blood_moon: ['night', 'dark'],
  iron_inferno: ['volcano', 'ember', 'mine'], eternal_winter: ['ice', 'mountain'], dreamscape: ['dream', 'mist', 'night', 'magicforest'], light_shadow: ['night', 'crystal', 'dark'],
  dragon_roost: ['volcano', 'rock', 'cave'], gods_court: ['ruin', 'crystal'], rebirth: ['magicforest', 'mist'], cosmic_storm: ['night', 'crystal'],
  immortality: ['dark', 'ruin'], eternity: ['crystal', 'night'],
  glass_forest: ['crystal', 'magicforest', 'forest'], silent_shore: ['coast', 'mist'], copper_mines: ['mine', 'cave'], mist_aqueduct: ['mist', 'ruin'],
  thorn_citadel: ['forest', 'ruin'], amber_dunes: ['desert', 'sandstone'], sunken_archive: ['coast', 'ruin', 'cave'], salt_bastion: ['coast', 'desert', 'ruin'],
  obsidian_harbor: ['coast', 'volcano', 'rock'], black_tide: ['coast', 'dark', 'night'], echo_terrace: ['mountain', 'ruin', 'cave'],
  mercury_foundry: ['mine', 'ruin', 'ember'], cinder_garden: ['ember', 'volcano'], prism_labyrinth: ['crystal', 'cave'], iron_orbit: ['mine', 'night'],
  aurora_vault: ['ice', 'crystal'], dream_marsh: ['dream', 'swamp', 'mist'], mirror_court: ['crystal', 'ruin'], midnight_observatory: ['night', 'dark'],
  hollow_sun: ['ember', 'desert'], comet_bridge: ['ice', 'night', 'mountain'], rune_necropolis: ['ruin', 'dark', 'night'], shattered_sky: ['mountain', 'crystal'],
  zero_threshold: ['dark', 'night'], dawn_core: ['ember', 'volcano'],
};

const KEYWORD_THEMES: ReadonlyArray<[RegExp, string]> = [
  [/fire|ash|ember|cinder|magma|lava|inferno|flame|sun|dawn/, 'ember'], [/volcan|obsidian|basalt/, 'volcano'], [/ice|frost|snow|winter|glacier|aurora|polar/, 'ice'],
  [/mount|peak|cliff|ridge|terrace/, 'mountain'], [/sand|dune|desert|amber/, 'desert'], [/sea|shore|tide|harbor|harbour|coast|ocean|reef|salt/, 'coast'],
  [/mine|forge|foundry|iron|copper|steel|orbit/, 'mine'], [/crystal|glass|prism|mirror|gem/, 'crystal'], [/night|moon|dark|shadow|midnight|void|abyss/, 'night'],
  [/swamp|marsh|bog|fen/, 'swamp'], [/mist|fog|haze|cloud/, 'mist'], [/dream|sleep|slumber/, 'dream'], [/forest|wood|grove|thorn|jungle/, 'forest'],
  [/cave|grotto|cavern|vault|tunnel/, 'cave'], [/ruin|tomb|crypt|necropolis|archive|temple|citadel|court/, 'ruin'], [/rock|stone|crag/, 'rock'],
];

/** Bölgenin temaları: açık tanım varsa o; yoksa kimlikteki anahtar kelimeler; hiçbiri yoksa boş (havuzun tamamı adaydır). */
export function themesForRegion(regionId: string): readonly string[] {
  const known = REGION_THEMES[regionId];
  if (known) return known;
  const out = new Set<string>();
  for (const [re, theme] of KEYWORD_THEMES) if (re.test(regionId)) out.add(theme);
  return [...out];
}

/** FNV-1a: aşama kimliğinden sabit (oturumdan ve yürütmeden bağımsız) 32 bit sayı. */
export function stableHash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Atama için gereken en küçük aşama/bölge şekli. */
export interface PoolStageLike { id: string; type: string; stageNumber: number; enemy: { id: string } }
export interface PoolRegionLike { id: string; stages: readonly PoolStageLike[] }

/**
 * Seçim kuralı (yalnızca aşama kimliği + aynı bölgenin önceki NORMAL aşaması belirler; başka bölge eklenmesi hiçbir atamayı değiştirmez):
 *  1) adaylar: temasına uyan havuz görselleri (uyan yoksa havuzun tamamı); 2) `stableHash(aşama kimliği) % aday sayısı`;
 *  3) bölgedeki bir önceki normal aşamayla aynı görsel çıkarsa aynı adaylar içinde sıradakine geç; tek aday kalıyorsa ve o da aynıysa
 *     havuzun tamamından (önceki hariç) aynı hash ile seç.
 * `customKey`: aşamanın özel çizimi (varsa havuz kullanılmaz ve bu çizim "önceki" karşılaştırmasına girer).
 */
export function assignPoolArt(
  regions: readonly PoolRegionLike[],
  customKey: (enemyId: string) => string | null,
  pool: readonly PoolEntry[] = NORMAL_ENEMY_POOL,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const region of regions) {
    const themes = themesForRegion(region.id);
    const themed = pool.filter((p) => p.themes.some((t) => themes.includes(t)));
    const candidates = themed.length ? themed : pool;
    let prev: string | null = null;
    const ordered = [...region.stages].filter((s) => s.type === 'normal').sort((a, b) => a.stageNumber - b.stageNumber);
    for (const st of ordered) {
      const custom = customKey(st.enemy.id);
      if (custom) { prev = custom; continue; }
      if (!pool.length) { prev = null; continue; }
      const h = stableHash(st.id);
      let pick = candidates[h % candidates.length];
      if (prev && pick.key === prev) {
        let chosen: PoolEntry | undefined;
        for (let i = 1; i < candidates.length; i++) {
          const c = candidates[(h + i) % candidates.length];
          if (c.key !== prev) { chosen = c; break; }
        }
        if (!chosen) {
          const rest = pool.filter((p) => p.key !== prev);
          if (rest.length) chosen = rest[h % rest.length];
        }
        if (chosen) pick = chosen;
      }
      result[st.enemy.id] = pick.key;
      prev = pick.key;
    }
  }
  return result;
}
