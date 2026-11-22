import { describe, expect, it } from 'vitest';
import { readdirSync } from 'fs';
import { COSTUMES, DEFAULT_COSTUME_NAME, costumeById, costumesForHero, isCostumeUnlocked, isValidCostume } from '../src/data/costumes';
import { HERO_ART_LAYOUT, HERO_ART_META, HERO_ART_URL, hasHeroArt, heroArtKey } from '../src/data/heroArt';
import { HERO_CLASS_LIST } from '../src/data/classes';
import { heroArtSize } from '../src/phaser/HeroRenderer';
import { setHeroCostume } from '../src/state/saveActions';
import { computeHeroBuild } from '../src/utils/rpgLogic';
import { createInitialSaveState, parseSaveString, sanitizeSave } from '../src/utils/storage';

const EXPECTED: [string, string, string][] = [
  ['warrior', 'Köz Muhafızı', 'warrior_koz_muhafizi'], ['mage', 'Ay Kristali', 'mage_ay_kristali'], ['ranger', 'Sonbahar Avcısı', 'ranger_sonbahar_avcisi'],
  ['paladin', 'Gümüş Şafak', 'paladin_gumus_safak'], ['necromancer', 'Mezar Ayazı', 'necromancer_mezar_ayazi'], ['assassin', 'Kızıl Gölge', 'assassin_kizil_golge'],
  ['stormcaller', 'Kara Bulut', 'stormcaller_kara_bulut'], ['dragonheart', 'Safir Ejder', 'dragonheart_safir_ejder'], ['vampire', 'Kızıl Kadife', 'vampire_kizil_kadife'],
  ['werewolf', 'Ay Pençesi', 'werewolf_ay_pencesi'], ['fairy', 'Çiy Bahçesi', 'fairy_ciy_bahcesi'], ['kitsune', 'Sonbahar Ruhu', 'kitsune_sonbahar_ruhu'],
  ['naga', 'Zümrüt Taht', 'naga_zumrut_taht'], ['siren', 'Ay Gelgiti', 'siren_ay_gelgiti'], ['minotaur', 'Bronz Labirent', 'minotaur_bronz_labirent'],
  ['golem', 'Ametist Çekirdek', 'golem_ametist_cekirdek'], ['phoenix', 'Güneş Tacı', 'phoenix_gunes_taci'], ['djinn', 'Kum Sarayı', 'djinn_kum_sarayi'],
  ['demon', 'Obsidyen Yemini', 'demon_obsidyen_yemini'], ['seraph', 'Gece Mabedi', 'seraph_gece_mabedi'], ['bigfoot', 'Kırağı Gezgini', 'bigfoot_kiragi_gezgini'],
  ['night_screecher', 'Fırtına Çığlığı', 'night_screecher_firtina_cigligi'],
];

describe('v1.45.0: kostümler', () => {
  it('22 dosya doğru şampiyonla, adla ve kimlikle eşleşir; hepsinin görseli ve ölçüsü vardır', () => {
    expect(COSTUMES).toHaveLength(22);
    for (const [hero, name, file] of EXPECTED) {
      const c = costumeById(file)!;
      expect(c, file).toBeTruthy();
      expect([c.heroId, c.name, c.id]).toEqual([hero, name, file]);
      expect(hasHeroArt(file), file).toBe(true);
      expect(HERO_ART_URL[file]).toBeTruthy();
      expect(HERO_ART_META[file].aspect).toBeGreaterThan(0.4);
      expect(HERO_ART_META[file].footFrac).toBeGreaterThan(0.9);
    }
    // 22 şampiyonun her birinin tam bir kostümü; aynı şampiyon tek kayıttan okunur
    for (const h of HERO_CLASS_LIST) expect(costumesForHero(h.id).map((c) => c.id), h.id).toHaveLength(1);
    // klasördeki dosyalar = tanımlı kostümler (dosya adı kaynak)
    const files = readdirSync('src/art/costumes').filter((f) => f.endsWith('.webp')).map((f) => f.replace('.webp', '')).sort();
    expect(files).toEqual(COSTUMES.map((c) => c.id).sort());
    expect(DEFAULT_COSTUME_NAME).toBe('Varsayılan Görünüm');
  });

  it('çizim anahtarı: geçerli kostüm → kostüm; yok/geçersiz/yabancı şampiyon → varsayılan', () => {
    expect(heroArtKey('warrior', 'warrior_koz_muhafizi')).toBe('warrior_koz_muhafizi');
    expect(heroArtKey('warrior')).toBe('warrior');
    expect(heroArtKey('warrior', null)).toBe('warrior');
    expect(heroArtKey('warrior', 'yok_boyle_bir_kostum')).toBe('warrior');
    expect(heroArtKey('warrior', 'mage_ay_kristali')).toBe('warrior'); // başka şampiyonun kostümü
    expect(isValidCostume('mage', 'mage_ay_kristali')).toBe(true);
    expect(isValidCostume('mage', 'warrior_koz_muhafizi')).toBe(false);
  });

  it('yerleşim sınıfa göre: kostüm değişince boy sınırı ve genişlik sınırı aynı kalır (hiza/HUD değişmez)', () => {
    for (const c of COSTUMES) {
      const L = HERO_ART_LAYOUT[c.heroId as keyof typeof HERO_ART_LAYOUT]!;
      const d = heroArtSize(c.heroId as never, undefined, c.id);
      const base = heroArtSize(c.heroId as never);
      expect(d.w, c.id).toBeLessThanOrEqual(L.maxWidth + 1e-6);
      expect(d.h, c.id).toBeLessThanOrEqual(base.h * 1.25 + 1);
      expect(d.h / d.w).toBeCloseTo(1 / HERO_ART_META[c.id].aspect, 3); // oran korunur
    }
  });

  it('Kostüm giy / varsayılana dön: yalnızca kozmetik, güç hesabı değişmez', () => {
    const s = createInitialSaveState();
    const hero = s.activeHeroClass;
    const costume = costumesForHero(hero)[0];
    const before = computeHeroBuild(s.heroes[hero]);
    const r = setHeroCostume(s, hero, costume.id);
    expect(r.save.heroes[hero].costumeId).toBe(costume.id);
    expect(r.toast).toContain(costume.name);
    expect(computeHeroBuild(r.save.heroes[hero])).toEqual(before);
    expect(r.save.heroes[hero].equipped).toBe(s.heroes[hero].equipped);
    expect(setHeroCostume(r.save, hero, costume.id).save).toBe(r.save); // zaten takılı
    const back = setHeroCostume(r.save, hero, null);
    expect(back.save.heroes[hero].costumeId).toBeUndefined();
    expect('costumeId' in back.save.heroes[hero]).toBe(false);
    expect(setHeroCostume(back.save, hero, null).save).toBe(back.save);
    // geçersiz kimlik, başka şampiyonun kostümü, kilitli şampiyon → değişmez
    expect(setHeroCostume(s, hero, 'yok').save).toBe(s);
    const other = COSTUMES.find((c) => c.heroId !== hero)!;
    expect(setHeroCostume(s, hero, other.id).save).toBe(s);
    const locked = HERO_CLASS_LIST.find((c) => !s.heroUnlocks.includes(c.id))!;
    expect(setHeroCostume(s, locked.id, costumesForHero(locked.id)[0].id).save).toBe(s);
    expect(isCostumeUnlocked(s.heroUnlocks, costumesForHero(locked.id)[0])).toBe(false);
    // şampiyon açılınca kostüm de kullanıma açılır
    const unlocked = { ...s, heroUnlocks: [...s.heroUnlocks, locked.id] };
    expect(isCostumeUnlocked(unlocked.heroUnlocks, costumesForHero(locked.id)[0])).toBe(true);
    expect(setHeroCostume(unlocked, locked.id, costumesForHero(locked.id)[0].id).save.heroes[locked.id].costumeId).toBe(costumesForHero(locked.id)[0].id);
  });

  it('kayıt: tercih şampiyon kimliğiyle saklanır, eski kayıt varsayılanla açılır, geçersiz kimlik varsayılana düşer', () => {
    const s = createInitialSaveState();
    const a = s.activeHeroClass;
    const withC = setHeroCostume(s, a, costumesForHero(a)[0].id).save;
    const round = parseSaveString(JSON.stringify(withC))!;
    expect(round.heroes[a].costumeId).toBe(costumesForHero(a)[0].id);
    for (const h of HERO_CLASS_LIST) if (h.id !== a) expect(round.heroes[h.id].costumeId).toBeUndefined();
    // eski kayıt: alan yok
    const old = JSON.parse(JSON.stringify(s));
    for (const h of Object.values(old.heroes) as { costumeId?: string }[]) delete h.costumeId;
    const loaded = parseSaveString(JSON.stringify(old))!;
    for (const h of HERO_CLASS_LIST) expect(loaded.heroes[h.id].costumeId).toBeUndefined();
    // geçersiz / yabancı / yanlış tip
    for (const bad of ['yok_boyle', 'mage_ay_kristali', 42, '']) {
      const broken = JSON.parse(JSON.stringify(withC));
      broken.heroes[a].costumeId = bad;
      expect(parseSaveString(JSON.stringify(broken))!.heroes[a].costumeId, String(bad)).toBeUndefined();
      expect(sanitizeSave(broken).heroes[a].costumeId).toBeUndefined();
    }
  });
});
