import { describe, expect, it } from 'vitest';
import { ATTACK_TIMING, DEFAULT_ATTACK_PROFILE, HERO_ATTACK_PROFILE, enemyAttackProfile, heroAttackProfile, shouldPlayAttackAnim, skillAttackProfile } from '../src/game/attackAnimation';
import { NORMAL_ENEMY_POOL } from '../src/data/enemyArtPool';
import { enemyArtAttack, poolArtAssignments } from '../src/data/enemyArt';
import { ACTIVE_SKILLS, CLASS_SKILLS } from '../src/data/skills';
import { HERO_CLASSES } from '../src/data/classes';
import { WORLD_REGIONS } from '../src/data/world';

describe('v1.44.0: ortak saldırı animasyonları', () => {
  it('süreler mobil için kısa: yakın dövüş 200–300 ms, büyü/menzilli 250–400 ms (temas toplamdan önce)', () => {
    for (const t of ['melee_weapon', 'melee_unarmed'] as const) {
      expect(ATTACK_TIMING[t].total).toBeGreaterThanOrEqual(200);
      expect(ATTACK_TIMING[t].total).toBeLessThanOrEqual(300);
    }
    for (const t of ['spell', 'ranged'] as const) {
      expect(ATTACK_TIMING[t].total).toBeGreaterThanOrEqual(250);
      expect(ATTACK_TIMING[t].total).toBeLessThanOrEqual(400);
    }
    for (const t of Object.values(ATTACK_TIMING)) expect(t.contact).toBeLessThan(t.total);
  });

  it('kahraman tipi çizimden gelir; kuşanılan silah yalnızca iz genişliğini seçer', () => {
    expect(heroAttackProfile('warrior').type).toBe('melee_weapon');
    expect(heroAttackProfile('mage').type).toBe('spell');
    expect(heroAttackProfile('ranger').type).toBe('ranged');
    expect(heroAttackProfile('werewolf')).toEqual({ type: 'melee_unarmed', style: 'claw' });
    expect(heroAttackProfile('bigfoot').style).toBe('fist');
    // silah türü: kılıç ince, balta geniş; silahsız/büyücü sınıflarda tip değişmez
    expect(heroAttackProfile('warrior', 'sword').trail).toBe('thin');
    expect(heroAttackProfile('warrior', 'axe').trail).toBe('wide');
    expect(heroAttackProfile('paladin').trail).toBe('wide');
    expect(heroAttackProfile('mage', 'axe').type).toBe('spell');
    expect(heroAttackProfile('werewolf', 'sword').type).toBe('melee_unarmed');
    // tip bilgisi eksik sınıf: kısa hamle + temas
    expect(heroAttackProfile('bilinmeyen')).toEqual(DEFAULT_ATTACK_PROFILE);
    // her oyun sınıfının bir profili var
    for (const id of Object.keys(HERO_CLASSES)) expect(HERO_ATTACK_PROFILE[id], id).toBeTruthy();
  });

  it('yetenek kendi tipini belirler: kılıçlı kahraman büyü yapınca büyü; açık anim her şeyi geçer', () => {
    const sword = heroAttackProfile('warrior');
    expect(skillAttackProfile({ effectType: 'fireball' }, sword).type).toBe('spell');
    expect(skillAttackProfile({ effectType: 'multi_shot' }, sword).type).toBe('ranged');
    expect(skillAttackProfile({ effectType: 'claw_strike' }, sword)).toEqual({ type: 'melee_unarmed', style: 'claw' });
    expect(skillAttackProfile({ effectType: 'war_cry' }, sword)).toBe(sword); // tip bilgisi yok → temel tip
    expect(skillAttackProfile({ effectType: 'creature', fx: { visual: 'projectile' } }, sword).type).toBe('spell');
    expect(skillAttackProfile({ effectType: 'creature', fx: { visual: 'self' } }, sword)).toBe(sword);
    expect(skillAttackProfile({ effectType: 'fireball', anim: 'ranged' }, sword).type).toBe('ranged');
    expect(skillAttackProfile({ effectType: 'war_cry', anim: 'melee_unarmed' }, heroAttackProfile('mage'))).toEqual({ type: 'melee_unarmed', style: 'fist' });
    // gerçek yetenek verisi: hepsi geçerli bir tip üretir
    for (const sk of [...ACTIVE_SKILLS, ...Object.values(CLASS_SKILLS).flat()]) {
      expect(['melee_weapon', 'melee_unarmed', 'spell', 'ranged'], sk.id).toContain(skillAttackProfile(sk, sword).type);
    }
  });

  it('düşman tipi: eylem türü > çizime özel tanım > ad > arketip > varsayılan', () => {
    expect(enemyAttackProfile({ name: 'Kaya Muhafızı' }, 'breath').type).toBe('spell');
    expect(enemyAttackProfile({ name: 'Kurt' }, 'drain')).toEqual({ type: 'melee_unarmed', style: 'bite' });
    expect(enemyAttackProfile({ name: 'Kurt' }, 'attack', { type: 'spell' }).type).toBe('spell');
    expect(enemyAttackProfile({ name: 'Buzul Kurdu' }).style).toBe('bite');
    expect(enemyAttackProfile({ name: 'Kaya Yengeci' }).style).toBe('pincer');
    expect(enemyAttackProfile({ name: 'Ağaç Okçusu' }).type).toBe('ranged');
    expect(enemyAttackProfile({ name: 'Yıldız Büyücüsü' }).type).toBe('spell');
    expect(enemyAttackProfile({ name: 'İsimsiz', visualArchetype: 'warlord' })).toEqual({ type: 'melee_weapon', trail: 'wide' });
    expect(enemyAttackProfile({ name: 'İsimsiz' })).toEqual(DEFAULT_ATTACK_PROFILE);
    // tüm düşmanlar geçerli profil alır
    const types = new Set<string>();
    for (const st of WORLD_REGIONS.flatMap((r) => r.stages)) {
      const e = st.enemy;
      types.add(enemyAttackProfile({ name: e.name, visualArchetype: e.visualArchetype, isBoss: e.isBoss }, 'attack', enemyArtAttack(e.id)).type);
    }
    expect([...types].sort()).toEqual(['melee_unarmed', 'melee_weapon', 'ranged', 'spell'].filter((t) => types.has(t)).sort());
    expect(types.size).toBeGreaterThanOrEqual(3);
  });

  it('havuz çizimlerinin saldırı biçimi çizime göre: yengeç kıskaç, güve büyü, kobold geniş silah', () => {
    const by = Object.fromEntries(NORMAL_ENEMY_POOL.map((p) => [p.key, p.attack]));
    expect(by.kaya_yengeci).toEqual({ type: 'melee_unarmed', style: 'pincer' });
    expect(by.sis_guvesi.type).toBe('spell');
    expect(by.kristal_kobold).toEqual({ type: 'melee_weapon', trail: 'wide' });
    expect(by.obsidyen_kopegi.style).toBe('bite');
    for (const [id, key] of Object.entries(poolArtAssignments())) expect(enemyArtAttack(id), id).toBe(NORMAL_ENEMY_POOL.find((p) => p.key === key)!.attack);
    expect(enemyArtAttack('forest_1_enemy')).toBeNull();
  });

  it('aynı eylemin tekrar hasar kayıtları görseli yeniden oynatmaz; sürerken yenisi binmez; yetenek kilidi bastırır', () => {
    const s = { lastActionId: 0, busy: false, skillLock: false };
    expect(shouldPlayAttackAnim(s, 7)).toBe(true);
    expect(shouldPlayAttackAnim({ ...s, lastActionId: 7 }, 7)).toBe(false); // aynı adımın ikinci taş türü
    expect(shouldPlayAttackAnim({ ...s, lastActionId: 7 }, 8)).toBe(true); // yeni kaskad adımı
    expect(shouldPlayAttackAnim({ ...s, busy: true }, 9)).toBe(false);
    expect(shouldPlayAttackAnim({ ...s, skillLock: true }, 9)).toBe(false);
    expect(shouldPlayAttackAnim({ ...s, lastActionId: 7 }, 0)).toBe(true); // kimliksiz bağımsız eylem
  });
});
