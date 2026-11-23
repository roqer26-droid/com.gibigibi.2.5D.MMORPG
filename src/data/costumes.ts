import type { HeroClassId } from '../types/game';

/**
 * Kostümler: tamamen kozmetik alternatif görünümler. Veri tabanlıdır: yeni bir kostüm eklemek için
 *   1) `src/art/costumes/<kimlik>.webp` (şeffaf, tam boy) dosyasını koyun, 2) `src/art/costumes/meta.json` içine `{aspect, footFrac}` ekleyin,
 *   3) aşağıdaki listeye bir satır ekleyin. Kimlik = dosya adı (uzantısız) = çizim anahtarı.
 * Bir şampiyonun birden fazla kostümü olabilir; kayıt `HeroProgress.costumeId` içinde şampiyon kimliğiyle saklanır.
 * Güç, yetenek, ekipman ve hasar hesapları kostümden etkilenmez.
 */
export interface CostumeDef {
  id: string;
  heroId: HeroClassId;
  name: string;
}

export const DEFAULT_COSTUME_NAME = 'Varsayılan Görünüm';

export const COSTUMES: readonly CostumeDef[] = [
  { id: 'warrior_koz_muhafizi', heroId: 'warrior', name: 'Köz Muhafızı' },
  { id: 'mage_ay_kristali', heroId: 'mage', name: 'Ay Kristali' },
  { id: 'ranger_sonbahar_avcisi', heroId: 'ranger', name: 'Sonbahar Avcısı' },
  { id: 'paladin_gumus_safak', heroId: 'paladin', name: 'Gümüş Şafak' },
  { id: 'necromancer_mezar_ayazi', heroId: 'necromancer', name: 'Mezar Ayazı' },
  { id: 'assassin_kizil_golge', heroId: 'assassin', name: 'Kızıl Gölge' },
  { id: 'stormcaller_kara_bulut', heroId: 'stormcaller', name: 'Kara Bulut' },
  { id: 'dragonheart_safir_ejder', heroId: 'dragonheart', name: 'Safir Ejder' },
  { id: 'vampire_kizil_kadife', heroId: 'vampire', name: 'Kızıl Kadife' },
  { id: 'werewolf_ay_pencesi', heroId: 'werewolf', name: 'Ay Pençesi' },
  { id: 'fairy_ciy_bahcesi', heroId: 'fairy', name: 'Çiy Bahçesi' },
  { id: 'kitsune_sonbahar_ruhu', heroId: 'kitsune', name: 'Sonbahar Ruhu' },
  { id: 'naga_zumrut_taht', heroId: 'naga', name: 'Zümrüt Taht' },
  { id: 'siren_ay_gelgiti', heroId: 'siren', name: 'Ay Gelgiti' },
  { id: 'minotaur_bronz_labirent', heroId: 'minotaur', name: 'Bronz Labirent' },
  { id: 'golem_ametist_cekirdek', heroId: 'golem', name: 'Ametist Çekirdek' },
  { id: 'phoenix_gunes_taci', heroId: 'phoenix', name: 'Güneş Tacı' },
  { id: 'djinn_kum_sarayi', heroId: 'djinn', name: 'Kum Sarayı' },
  { id: 'demon_obsidyen_yemini', heroId: 'demon', name: 'Obsidyen Yemini' },
  { id: 'seraph_gece_mabedi', heroId: 'seraph', name: 'Gece Mabedi' },
  { id: 'bigfoot_kiragi_gezgini', heroId: 'bigfoot', name: 'Kırağı Gezgini' },
  { id: 'night_screecher_firtina_cigligi', heroId: 'night_screecher', name: 'Fırtına Çığlığı' },
  // v1.58.0: ikinci set (11 şampiyon için ek kostüm; önceki kostümler ve kayıtlı seçimler korunur)
  { id: 'warrior_kutup_celigi', heroId: 'warrior', name: 'Kutup Çeliği' },
  { id: 'paladin_zumrut_yemini', heroId: 'paladin', name: 'Zümrüt Yemini' },
  { id: 'ranger_gece_izcisi', heroId: 'ranger', name: 'Gece İzcisi' },
  { id: 'mage_kor_akademisi', heroId: 'mage', name: 'Kor Akademisi' },
  { id: 'werewolf_kanli_ay', heroId: 'werewolf', name: 'Kanlı Ay' },
  { id: 'vampire_buz_soylusu', heroId: 'vampire', name: 'Buz Soylusu' },
  { id: 'bigfoot_yosun_bekcisi', heroId: 'bigfoot', name: 'Mürdüm Geçidi' },
  { id: 'night_screecher_bakir_tutulma', heroId: 'night_screecher', name: 'Bakır Tutulma' },
  { id: 'assassin_mor_sis', heroId: 'assassin', name: 'Yeşil Pençe' },
  { id: 'necromancer_zehirli_lahit', heroId: 'necromancer', name: 'Zehirli Lahit' },
  { id: 'stormcaller_mercan_firtinasi', heroId: 'stormcaller', name: 'Kehribar Yıldırımı' },
  // v1.59.0: üçüncü paket (kalan 11 şampiyon için ek kostüm; önceki kostümler ve kayıtlı seçimler korunur)
  { id: 'dragonheart_kor_pulu', heroId: 'dragonheart', name: 'Firuze Pul' },
  { id: 'fairy_yildiz_tozu', heroId: 'fairy', name: 'Yıldız Tozu' },
  { id: 'kitsune_ay_tilsimi', heroId: 'kitsune', name: 'Ay Tılsımı' },
  { id: 'naga_yakut_tahti', heroId: 'naga', name: 'Yakut Tahtı' },
  { id: 'siren_mercan_ezgisi', heroId: 'siren', name: 'Mercan Ezgisi' },
  { id: 'minotaur_buz_labirenti', heroId: 'minotaur', name: 'Buz Labirenti' },
  { id: 'golem_zumrut_cekirdek', heroId: 'golem', name: 'Zümrüt Çekirdek' },
  { id: 'phoenix_kutup_ankasi', heroId: 'phoenix', name: 'Kutup Ankası' },
  { id: 'djinn_gece_sarayi', heroId: 'djinn', name: 'Kızıl Ferman' },
  { id: 'demon_soluk_alev', heroId: 'demon', name: 'Soluk Alev' },
  { id: 'seraph_gunes_mabedi', heroId: 'seraph', name: 'Gece Yaprağı' },
];

const BY_ID = new Map(COSTUMES.map((c) => [c.id, c]));

export const costumeById = (id: string | null | undefined): CostumeDef | null => (id ? BY_ID.get(id) ?? null : null);

/** Bir şampiyonun tüm kostümleri (tek kayıt: aynı şampiyon hangi listede görünürse görünsün buradan okunur). */
export const costumesForHero = (heroId: string): CostumeDef[] => COSTUMES.filter((c) => c.heroId === heroId);

/** Kimlik varsa ve bu şampiyona aitse geçerlidir. */
export const isValidCostume = (heroId: string, costumeId: string | null | undefined): boolean => !!costumeId && BY_ID.get(costumeId)?.heroId === heroId;

/**
 * Açılma kuralı: projede ayrı bir kostüm açma sistemi yok; ilk sette kostüm, şampiyon açıldığında kullanıma açılır.
 * (İleride kostüme özel kural gerekirse yalnızca bu fonksiyon değişir.)
 */
export const isCostumeUnlocked = (heroUnlocks: readonly string[], costume: CostumeDef): boolean => heroUnlocks.includes(costume.heroId);
