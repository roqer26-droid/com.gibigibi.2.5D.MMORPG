import { CoreHeroClassId, CreatureClassId, EquipmentSlot, HeroClassId, HeroProgress, ItemCategory } from '../types/game';
import { CREATURE_SPECS, drawCreature } from './CreatureRenderer';
import { HERO_ART_LAYOUT, HERO_ART_META, HERO_BREATH, hasHeroArt, heroImage } from '../data/heroArt';
import { HERO_CLASSES } from '../data/classes';

/* ================================================================== */
/*  BÜYÜ AURASI — Ekipman + seviyesi arttıkça karakter parlamaya başlar */
/* ================================================================== */

export interface EnchantAura {
  /** Kuşanılı tüm eşyaların toplam + seviyesi (0-100) */
  total: number;
  /** En yüksek tekil eşya + seviyesi */
  best: number;
  /** Kaç eşyada geliştirme var */
  enchantedCount: number;
  /** 0 = aurasız, 5 = efsanevi nüve */
  tier: number;
  tierName: string;
  tierDesc: string;
  color: string;
  colorNum: number;
  /** 0..1 — aura yoğunluğu */
  intensity: number;
  /** Etrafta dönen ışık zerrelerinin sayısı */
  motes: number;
}

interface TierDef {
  min: number;
  name: string;
  desc: string;
  color: string;
  colorNum: number;
}

export const ENCHANT_TIERS: TierDef[] = [
  { min: 0, name: 'Aurasız', desc: 'Ekipmanlarını geliştirerek parıltı kazan.', color: '#64748b', colorNum: 0x64748b },
  { min: 6, name: 'Hafif Parıltı', desc: 'Zırhında ince bir ışık kıvılcımı dolaşıyor.', color: '#7dd3fc', colorNum: 0x7dd3fc },
  { min: 16, name: 'Yumuşak Işıltı', desc: 'Ayaklarının altında büyü halkası belirdi.', color: '#38bdf8', colorNum: 0x38bdf8 },
  { min: 30, name: 'Parlayan Aura', desc: 'Gökyüzünden inen bir ışık sütunu seni sarıyor.', color: '#c084fc', colorNum: 0xc084fc },
  { min: 50, name: 'Alevlenen Hale', desc: 'Etrafında dönen büyü zerreleri alev alıyor.', color: '#f59e0b', colorNum: 0xf59e0b },
  { min: 72, name: 'Efsanevi Nüve', desc: 'Tam güç! Başının üzerinde altın bir hale yanıyor.', color: '#fde047', colorNum: 0xfde047 },
];

export function computeEnchantAura(hero: HeroProgress): EnchantAura {
  let total = 0;
  let best = 0;
  let enchantedCount = 0;

  Object.values(hero.equipped).forEach((itm) => {
    if (!itm) return;
    total += itm.upgradeLevel;
    best = Math.max(best, itm.upgradeLevel);
    if (itm.upgradeLevel > 0) enchantedCount += 1;
  });

  let tier = 0;
  for (let i = ENCHANT_TIERS.length - 1; i >= 0; i--) {
    if (total >= ENCHANT_TIERS[i].min) {
      tier = i;
      break;
    }
  }
  const def = ENCHANT_TIERS[tier];

  return {
    total,
    best,
    enchantedCount,
    tier,
    tierName: def.name,
    tierDesc: def.desc,
    color: def.color,
    colorNum: def.colorNum,
    intensity: Math.min(1, total / ENCHANT_TIERS[ENCHANT_TIERS.length - 1].min),
    motes: tier >= 4 ? 4 + tier * 3 : 0,
  };
}

/** Tek bir eşyanın yaydığı parlaklık (yükseltme seviyesiyle artar) */
export function itemGlow(upgradeLevel: number, base = 6): number {
  return base + upgradeLevel * 3.4;
}

/* ================================================================== */
/*  EKİPMAN RENKLERİ                                                    */
/* ================================================================== */

export interface GearColor {
  p: string;
  s: string;
  g: string;
  cat: string;
  has: boolean;
  up: number;
}

const CLASS_DEFAULTS: Record<
  CoreHeroClassId,
  { p: string; s: string; skin: string; accent: string; robe: boolean }
> = {
  warrior: { p: '#991b1b', s: '#cbd5e1', skin: '#f1c29b', accent: '#ef4444', robe: false },
  mage: { p: '#6b21a8', s: '#c4b5fd', skin: '#fde2cf', accent: '#a855f7', robe: true },
  ranger: { p: '#166534', s: '#fde047', skin: '#eab38f', accent: '#22c55e', robe: false },
  paladin: { p: '#b45309', s: '#fef3c7', skin: '#f5ccb0', accent: '#fbbf24', robe: false },
  necromancer: { p: '#3b0764', s: '#86efac', skin: '#cbd5e1', accent: '#4ade80', robe: true },
  assassin: { p: '#1e1b4b', s: '#d946ef', skin: '#e2c9d6', accent: '#d946ef', robe: true },
  stormcaller: { p: '#0e7490', s: '#67e8f9', skin: '#f1c29b', accent: '#22d3ee', robe: true },
  dragonheart: { p: '#7f1d1d', s: '#fb923c', skin: '#eab38f', accent: '#f97316', robe: false },
};

export function gear(hero: HeroProgress, slot: EquipmentSlot, fP: string, fS: string, fG: string): GearColor {
  const itm = hero.equipped[slot];
  if (!itm) return { p: fP, s: fS, g: fG, cat: '', has: false, up: 0 };
  return {
    p: itm.visual.primaryColor,
    s: itm.visual.secondaryColor,
    g: itm.visual.glowColor,
    cat: itm.category,
    has: true,
    up: itm.upgradeLevel,
  };
}

/* ================================================================== */
/*  SİLAH & İKİNCİ EL ÇİZİMLERİ (tüm sınıflar ortak kullanır)           */
/* ================================================================== */

export function drawWeapon(
  ctx: CanvasRenderingContext2D,
  cat: ItemCategory | string,
  c: GearColor,
  pose: 'idle' | 'attack'
) {
  ctx.save();
  ctx.shadowColor = c.g;
  ctx.shadowBlur = itemGlow(c.up, c.has ? 10 : 3);

  if (cat === 'staff') {
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(2, 34);
    ctx.lineTo(2, -56);
    ctx.stroke();
    ctx.fillStyle = c.p;
    ctx.strokeStyle = c.s;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(2, -64, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = c.g;
    ctx.beginPath();
    ctx.arc(2, -64, 5.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (cat === 'bow') {
    ctx.strokeStyle = c.p;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(-8, -6, 44, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.stroke();
    ctx.strokeStyle = c.g;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-2, -48);
    ctx.lineTo(-2, 36);
    ctx.stroke();
    ctx.strokeStyle = c.s;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-4, -6);
    ctx.lineTo(44, -6);
    ctx.stroke();
  } else if (cat === 'axe') {
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(2, 26);
    ctx.lineTo(2, -60);
    ctx.stroke();
    const g = ctx.createLinearGradient(0, -64, 34, -28);
    g.addColorStop(0, c.s);
    g.addColorStop(1, c.p);
    ctx.fillStyle = g;
    ctx.strokeStyle = c.g;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(2, -56);
    ctx.quadraticCurveTo(36, -68, 32, -32);
    ctx.quadraticCurveTo(18, -28, 2, -36);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (cat === 'dagger') {
    // İkiz hançer — suikastçı imzası
    ctx.fillStyle = '#3f3f46';
    ctx.fillRect(-6, -2, 14, 8);
    const g = ctx.createLinearGradient(-4, -44, 8, -4);
    g.addColorStop(0, c.s);
    g.addColorStop(1, c.p);
    ctx.fillStyle = g;
    ctx.strokeStyle = c.g;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-4, -4);
    ctx.lineTo(-2, -40);
    ctx.lineTo(3, -48);
    ctx.lineTo(8, -38);
    ctx.lineTo(8, -4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (cat === 'scythe') {
    ctx.strokeStyle = '#3f2a1d';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-4, 40);
    ctx.lineTo(8, -62);
    ctx.stroke();
    const g = ctx.createLinearGradient(-40, -78, 20, -40);
    g.addColorStop(0, c.s);
    g.addColorStop(1, c.p);
    ctx.fillStyle = g;
    ctx.strokeStyle = c.g;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(8, -62);
    ctx.quadraticCurveTo(-38, -84, -46, -34);
    ctx.quadraticCurveTo(-26, -56, 4, -52);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Ruh alevi
    ctx.fillStyle = c.g;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(-44, -36, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  } else if (cat === 'spear') {
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(2, 42);
    ctx.lineTo(2, -66);
    ctx.stroke();
    const g = ctx.createLinearGradient(-8, -92, 14, -58);
    g.addColorStop(0, c.s);
    g.addColorStop(1, c.p);
    ctx.fillStyle = g;
    ctx.strokeStyle = c.g;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(2, -96);
    ctx.lineTo(12, -64);
    ctx.lineTo(2, -56);
    ctx.lineTo(-8, -64);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Elektrik kıvılcımı
    ctx.strokeStyle = c.g;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(2, -70);
    ctx.lineTo(14, -78);
    ctx.lineTo(8, -84);
    ctx.moveTo(2, -70);
    ctx.lineTo(-10, -80);
    ctx.stroke();
  } else {
    // sword (varsayılan)
    ctx.fillStyle = '#d97706';
    ctx.fillRect(-10, -8, 24, 7);
    const g = ctx.createLinearGradient(-4, -76, 8, -8);
    g.addColorStop(0, c.s);
    g.addColorStop(0.5, c.p);
    g.addColorStop(1, '#ffffff');
    ctx.fillStyle = g;
    ctx.strokeStyle = c.g;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4, -8);
    ctx.lineTo(-5, -64);
    ctx.lineTo(2, -80);
    ctx.lineTo(9, -64);
    ctx.lineTo(8, -8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Saldırı pozunda silah hareket izi
  if (pose === 'attack') {
    ctx.strokeStyle = c.g;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, -40, 42, -Math.PI * 0.72, Math.PI * 0.16);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // +5 ve üzeri geliştirmelerde silahtan kıvılcım çıkar
  if (c.up >= 5) {
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.5 + c.up * 0.05;
    const sparkY = cat === 'scythe' ? -58 : cat === 'spear' ? -78 : -54;
    for (let i = 0; i < Math.min(4, Math.floor(c.up / 2)); i++) {
      ctx.beginPath();
      ctx.arc(4 + i * 5, sparkY - i * 4, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

export function drawOffhand(
  ctx: CanvasRenderingContext2D,
  cat: ItemCategory | string,
  c: GearColor,
  fallbackCat: ItemCategory
) {
  const kind = cat || fallbackCat;
  ctx.save();
  ctx.shadowColor = c.g;
  ctx.shadowBlur = itemGlow(c.up, c.has ? 8 : 2);

  if (kind === 'tome') {
    ctx.translate(-44, 0);
    ctx.rotate(-0.15);
    ctx.fillStyle = c.p;
    ctx.strokeStyle = c.g;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-14, -18, 28, 34, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = c.s;
    ctx.beginPath();
    ctx.arc(0, -1, 6, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'quiver') {
    ctx.translate(-34, -18);
    ctx.rotate(-0.4);
    ctx.fillStyle = c.p;
    ctx.strokeStyle = c.s;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-7, -22, 14, 38, 4);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = c.g;
    ctx.beginPath();
    ctx.moveTo(-3, -28);
    ctx.lineTo(-3, -20);
    ctx.moveTo(3, -30);
    ctx.lineTo(3, -20);
    ctx.stroke();
  } else if (kind === 'skull') {
    // Uçan Ruh Kafatası
    ctx.translate(-46, -6);
    ctx.fillStyle = c.s;
    ctx.strokeStyle = c.g;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, 0, 15, Math.PI, Math.PI * 2);
    ctx.roundRect(-15, -1, 30, 14, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = c.p;
    ctx.beginPath();
    ctx.arc(-5.5, -2, 4.4, 0, Math.PI * 2);
    ctx.arc(5.5, -2, 4.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.g;
    ctx.beginPath();
    ctx.arc(-5.5, -2, 2, 0, Math.PI * 2);
    ctx.arc(5.5, -2, 2, 0, Math.PI * 2);
    ctx.fill();
    // ruh alevi
    ctx.fillStyle = c.g;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.quadraticCurveTo(7, -12, 0, -8);
    ctx.quadraticCurveTo(-7, -12, 0, -22);
    ctx.fill();
    ctx.globalAlpha = 1;
  } else if (kind === 'cloak') {
    // Omuzdan sarkan gölge pelerini
    ctx.translate(-30, -14);
    ctx.fillStyle = c.p;
    ctx.strokeStyle = c.g;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-26, 18, -18, 54);
    ctx.quadraticCurveTo(-4, 44, 6, 56);
    ctx.quadraticCurveTo(10, 22, 0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    // shield
    ctx.translate(-36, 4);
    const g = ctx.createLinearGradient(-18, -22, 18, 26);
    g.addColorStop(0, c.s);
    g.addColorStop(0.5, c.p);
    g.addColorStop(1, '#0f172a');
    ctx.fillStyle = g;
    ctx.strokeStyle = c.s;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-18, -22);
    ctx.lineTo(18, -22);
    ctx.lineTo(16, 8);
    ctx.lineTo(0, 26);
    ctx.lineTo(-16, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = c.g;
    ctx.beginPath();
    ctx.arc(0, -2, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/* ================================================================== */
/*  AURA KATMANLARI — ekipman + seviyesi arttıkça kat kat güçlenir      */
/* ================================================================== */

const hexA = (a: number) => Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0');

/**
 * Çizimli kahramanlar için aura. Merkez gövdenin ortasındadır; ölçekler çizimin boyuna bağlıdır. Kare doku sınırında kesilmesin diye
 * radyal ışık en fazla dokunun yarısı kadar büyür. `front` katmanı çizimin ÖNÜNDE kalır (ön yarı zerreler, ön rune yayı, hafif ışıma);
 * böylece parlama yalnızca arkada gizli kalmaz.
 */
function drawEnchantAuraArt(ctx: CanvasRenderingContext2D, aura: EnchantAura, time: number, geo: AuraGeometry, layer: 'back' | 'front') {
  const t = aura.tier;
  const pulse = 0.72 + 0.28 * Math.sin(time * 2.1);
  const col = aura.color;
  const ground = 74 - geo.float;
  const cy = ground - geo.h * 0.5;
  // Yatay yarıçap: genişliğe göre, dikey: boya göre
  const rx = Math.max(geo.w * 0.5 + 10, 60) + t * 7;
  const ry = geo.h * 0.5 + 8 + t * 5;

  ctx.save();
  if (layer === 'back') {
    // 1) Arkadaki radyal büyü ışığı (gövde ortasında, çizimden taşar)
    const R = Math.min(Math.max(rx, ry) * 1.12, 148);
    const rg = ctx.createRadialGradient(0, cy, R * 0.12, 0, cy, R);
    rg.addColorStop(0, `${col}${hexA((0.2 + 0.08 * t) * pulse)}`);
    rg.addColorStop(0.6, `${col}${hexA(0.08 + 0.03 * t)}`);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(0, cy, R, 0, Math.PI * 2);
    ctx.fill();

    // 3) Gökten inen ışık sütunu (kademe 3+): çizimin tüm boyunu kaplar
    if (t >= 3) {
      const beamW = Math.min(geo.w * 0.5 + t * 6, 110);
      const top = ground - geo.h - 14;
      const bg = ctx.createLinearGradient(0, top, 0, ground + 4);
      bg.addColorStop(0, 'rgba(255,255,255,0)');
      bg.addColorStop(0.4, `${col}${hexA(0.12 * pulse)}`);
      bg.addColorStop(1, `${col}${hexA(0.34 * pulse)}`);
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.moveTo(-beamW * 0.35, top);
      ctx.lineTo(beamW * 0.35, top);
      ctx.lineTo(beamW, ground + 4);
      ctx.lineTo(-beamW, ground + 4);
      ctx.closePath();
      ctx.fill();
    }
  }

  // 2) Yer rune halkası (kademe 2+): arka yarı arkada, ön yarı çizimin önünde
  if (t >= 2) {
    const rrx = Math.min(Math.max(geo.w * 0.5, 52) + t * 6, 138);
    const rry = rrx * 0.29;
    ctx.save();
    ctx.translate(0, ground + 2);
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.setLineDash([9, 7]);
    ctx.lineDashOffset = -time * 14;
    ctx.globalAlpha = (layer === 'front' ? 0.5 : 0.32) + 0.25 * pulse;
    ctx.beginPath();
    if (layer === 'front') ctx.ellipse(0, 0, rrx, rry, 0, 0, Math.PI);
    else ctx.ellipse(0, 0, rrx, rry, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = (layer === 'front' ? 0.55 : 0.35) + 0.25 * pulse;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    if (layer === 'front') ctx.ellipse(0, 0, rrx * 0.72, rry * 0.72, 0, 0, Math.PI);
    else ctx.ellipse(0, 0, rrx * 0.72, rry * 0.72, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 4) Dönen büyü zerreleri (kademe 4+): ön yarı çizimin önünde
  if (aura.motes > 0) {
    for (let i = 0; i < aura.motes; i++) {
      const a = time * 1.35 + (i / aura.motes) * Math.PI * 2;
      const isFront = Math.sin(a) > 0;
      if ((layer === 'front') !== isFront) continue;
      const mx = Math.cos(a) * Math.min(rx, 140);
      const my = cy + Math.sin(a) * Math.min(ry * 0.38, 56);
      const size = 2.2 + 1.1 * Math.sin(time * 3 + i);
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.6 + 0.4 * Math.abs(Math.sin(a));
      ctx.shadowColor = col;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(mx, my, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  if (layer === 'front') {
    // Çizimin üstünde hafif, sınıf rengi ışıma: parlama yalnızca arkada kalmasın
    ctx.globalCompositeOperation = 'lighter';
    const sr = Math.min(Math.max(rx, ry) * 0.9, 130);
    const sg = ctx.createRadialGradient(0, cy, 0, 0, cy, sr);
    sg.addColorStop(0, `${col}${hexA(0.05 * t * pulse)}`);
    sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(0, cy, sr, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }

  // 5) Baş üstü altın hale + yıldız kıvılcımları (kademe 5)
  if (t >= 5 && layer === 'back') {
    const haloY = Math.max(ground - geo.h - 12, -164);
    ctx.save();
    ctx.translate(0, haloY);
    ctx.rotate(Math.sin(time * 0.9) * 0.12);
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 3.4;
    ctx.globalAlpha = 0.7 + 0.3 * pulse;
    ctx.shadowColor = '#fde047';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.ellipse(0, 0, Math.min(30 * geo.k * 0.9, 44), 10, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    for (let i = 0; i < 5; i++) {
      const a = time * 1.8 + (i / 5) * Math.PI * 2;
      const sx = Math.cos(a) * Math.min(rx, 130);
      const sy = cy + Math.sin(a * 1.6) * (geo.h * 0.36);
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.4 + 0.5 * Math.abs(Math.sin(a * 2));
      ctx.beginPath();
      ctx.moveTo(sx, sy - 4);
      ctx.lineTo(sx + 1.6, sy - 1.4);
      ctx.lineTo(sx + 4.4, sy);
      ctx.lineTo(sx + 1.6, sy + 1.4);
      ctx.lineTo(sx, sy + 4);
      ctx.lineTo(sx - 1.6, sy + 1.4);
      ctx.lineTo(sx - 4.4, sy);
      ctx.lineTo(sx - 1.6, sy - 1.4);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawEnchantAura(
  ctx: CanvasRenderingContext2D,
  aura: EnchantAura,
  time: number,
  geo: AuraGeometry | null = null,
  layer: 'back' | 'front' = 'back'
) {
  if (aura.tier <= 0) return;
  if (geo) {
    drawEnchantAuraArt(ctx, aura, time, geo, layer);
    return;
  }
  if (layer === 'front') return;
  const t = aura.tier;
  const pulse = 0.72 + 0.28 * Math.sin(time * 2.1);
  const col = aura.color;

  ctx.save();

  // 1) Arkadaki radyal büyü ışığı
  const glowR = 68 + t * 16;
  const rg = ctx.createRadialGradient(0, -6, 6, 0, -6, glowR);
  rg.addColorStop(0, `${col}${Math.round((0.16 + 0.07 * t) * pulse * 255)
    .toString(16)
    .padStart(2, '0')}`);
  rg.addColorStop(0.55, `${col}${Math.round((0.07 + 0.03 * t) * 255)
    .toString(16)
    .padStart(2, '0')}`);
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.arc(0, -6, glowR, 0, Math.PI * 2);
  ctx.fill();

  // 2) Yer rune halkası (kademe 2+)
  if (t >= 2) {
    ctx.save();
    ctx.translate(0, 74);
    ctx.rotate(time * 0.55);
    ctx.strokeStyle = col;
    ctx.globalAlpha = 0.35 + 0.25 * pulse;
    ctx.lineWidth = 2;
    ctx.setLineDash([9, 7]);
    ctx.beginPath();
    ctx.ellipse(0, 0, 52 + t * 5, 15 + t * 1.4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.5 + 0.3 * pulse;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(0, 0, 38 + t * 4, 11 + t, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 3) Gökten inen ışık sütunu (kademe 3+)
  if (t >= 3) {
    const beamW = 34 + t * 7;
    const bg = ctx.createLinearGradient(0, -160, 0, 78);
    bg.addColorStop(0, 'rgba(255,255,255,0)');
    bg.addColorStop(0.35, `${col}${Math.round(0.1 * pulse * 255)
      .toString(16)
      .padStart(2, '0')}`);
    bg.addColorStop(1, `${col}${Math.round(0.3 * pulse * 255)
      .toString(16)
      .padStart(2, '0')}`);
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(-beamW * 0.35, -160);
    ctx.lineTo(beamW * 0.35, -160);
    ctx.lineTo(beamW, 78);
    ctx.lineTo(-beamW, 78);
    ctx.closePath();
    ctx.fill();
  }

  // 4) Dönen büyü zerreleri (kademe 4+)
  if (aura.motes > 0) {
    for (let i = 0; i < aura.motes; i++) {
      const a = time * 1.35 + (i / aura.motes) * Math.PI * 2;
      const rx = 54 + t * 6;
      const ry = 26 + t * 3;
      const mx = Math.cos(a) * rx;
      const my = -8 + Math.sin(a) * ry;
      const size = 1.8 + 0.9 * Math.sin(time * 3 + i);
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.55 + 0.4 * Math.abs(Math.sin(a));
      ctx.shadowColor = col;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(mx, my, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
  }

  // 5) Baş üstü altın hale + kıvılcımlar (kademe 5)
  if (t >= 5) {
    ctx.save();
    ctx.translate(0, -104);
    ctx.rotate(Math.sin(time * 0.9) * 0.12);
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 3.4;
    ctx.globalAlpha = 0.7 + 0.3 * pulse;
    ctx.shadowColor = '#fde047';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.ellipse(0, 0, 30, 9, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();

    // Yıldız kıvılcımları
    for (let i = 0; i < 5; i++) {
      const a = time * 1.8 + (i / 5) * Math.PI * 2;
      const sx = Math.cos(a) * 70;
      const sy = -30 + Math.sin(a * 1.6) * 52;
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.4 + 0.5 * Math.abs(Math.sin(a * 2));
      ctx.beginPath();
      ctx.moveTo(sx, sy - 4);
      ctx.lineTo(sx + 1.6, sy - 1.4);
      ctx.lineTo(sx + 4.4, sy);
      ctx.lineTo(sx + 1.6, sy + 1.4);
      ctx.lineTo(sx, sy + 4);
      ctx.lineTo(sx - 1.6, sy + 1.4);
      ctx.lineTo(sx - 4.4, sy);
      ctx.lineTo(sx - 1.6, sy - 1.4);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  ctx.restore();
}

/* ================================================================== */
/*  ANA ÇİZİM                                                           */
/* ================================================================== */

/** Sınıf renginde düşük yoğunluklu, nefes alan parlama (çizimin arkasında). */
function drawClassGlow(ctx: CanvasRenderingContext2D, color: string, time: number, centerY: number, radius: number) {
  const pulse = 0.5 + 0.5 * Math.sin((time * Math.PI * 2) / 4);
  const g = ctx.createRadialGradient(0, centerY, radius * 0.1, 0, centerY, radius);
  g.addColorStop(0, `${color}${Math.round((0.16 + 0.07 * pulse) * 255).toString(16).padStart(2, '0')}`);
  g.addColorStop(1, `${color}00`);
  ctx.save();
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Görsel tabanlı kahramanlar: oranlar korunur, ayak çizgisi ortak zemine (y=+74) oturur; Gecenin Çığırtkanı yerden yüksekte
 * süzülür. Saldırı pozunda hafifçe öne eğilir (hasar/ bekleme animasyonları kapsayıcı katmanda aynen çalışır).
 * Silah ve zırh çizimin üzerindedir; ek ekipman katmanı çizilmez.
 */
/** Çizimin kahraman dokusu birimindeki boyutu (en-boy oranı korunur, genişlik sınırı uygulanır). */
export function heroArtSize(id: HeroClassId, aspectOverride?: number): { w: number; h: number } {
  const L = HERO_ART_LAYOUT[id]!;
  const m = HERO_ART_META[id];
  const aspect = aspectOverride ?? m.aspect;
  // Ayak çizgisinden tepeye `above` birim; silah uçları ayak çizgisinin altına uzanıyorsa kırpılmadan çizilir
  let h = L.above / m.footFrac;
  let w = h * aspect;
  if (w > L.maxWidth) {
    w = L.maxWidth;
    h = w / aspect;
  }
  return { w, h };
}

/**
 * Ekipman büyü aurasının yeni çizimlere göre ölçeği: aura eski (≈146 birim boylu) vektör kahramana göre tasarlanmıştı;
 * çizimli kahramanlarda boy/genişlik/havada duruş değerlerinden hesaplanır. Eski çizimli kahramanlar için null.
 */
export interface AuraGeometry {
  /** Tüm şekil ölçeği (çizim boyu / 146) */
  k: number;
  /** Çizimin boyu ve genişliği (doku birimi) */
  h: number;
  w: number;
  /** Yerden yükseklik */
  float: number;
}

export function heroAuraGeometry(classId: HeroClassId): AuraGeometry | null {
  if (!hasHeroArt(classId)) return null;
  const { w, h } = heroArtSize(classId);
  return { k: h / 146, h, w, float: HERO_ART_LAYOUT[classId]!.float };
}

function drawHeroArt(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  id: HeroClassId,
  pose: 'idle' | 'attack',
  time: number,
  noGlow = false
) {
  const L = HERO_ART_LAYOUT[id]!;
  const m = HERO_ART_META[id];
  const { w, h } = heroArtSize(id, img.naturalWidth / img.naturalHeight);
  const ground = 74;
  const bob = L.bob ? Math.sin(time * 2.1) * L.bob : 0;
  if (!noGlow) drawClassGlow(ctx, HERO_CLASSES[id].themeColor, time, ground - L.float - h * 0.5, Math.max(w, h) * 0.62);
  ctx.save();
  ctx.translate(0, ground - L.float + bob);
  if (pose === 'attack') {
    ctx.translate(16, 0);
    ctx.rotate(0.07);
  }
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 10;
  // Ayak çizgisi (görsel boyunun footFrac'i) tam zemin çizgisine oturur
  ctx.drawImage(img, -w / 2, -h * m.footFrac, w, h);
  ctx.restore();
}

/** Phaser dokusu için standart kahraman kare boyutu (aura payı dahil) */
export const HERO_TEX_SIZE = 300;

export function drawHeroToCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  hero: HeroProgress,
  pose: 'idle' | 'attack' = 'idle',
  time = 0,
  /** true: çizim yerine eski vektör çizimi (ör. Rhogar'ın Ejder Formu) */
  proceduralOnly = false,
  /** true: sınıf renkli parlama çizilmez (savaş sahnesi parlamayı canlı çizer) */
  noGlow = false
) {
  ctx.clearRect(0, 0, w, h);
  const cx = w * 0.5;
  const cy = h * 0.58;
  const scale = Math.min(w, h) / HERO_TEX_SIZE;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  const aura = computeEnchantAura(hero);
  const creature = CREATURE_SPECS[hero.classId as CreatureClassId];

  // Zemin gölgesi
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 76, 44, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Aura katmanları (karakterin arkasında); çizimli kahramanlarda çizimin boyuna göre ölçeklenir, ön katman çizimin önüne biner
  const auraGeo = !proceduralOnly ? heroAuraGeometry(hero.classId) : null;
  // noGlow (savaş dokusu): çizimli kahramanlarda aura sahnede canlı çizilir, dokuya gömülmez
  if (!(auraGeo && noGlow)) drawEnchantAura(ctx, aura, time, auraGeo, 'back');

  // NEFES ALMA — 20 kahramanın hepsi: gövde ayak tabanından hafifçe yükselip genişler
  const usesArt = !proceduralOnly && hasHeroArt(hero.classId);
  // Görsel kahramanlar: ~3 sn'lik döngüde gövde en fazla %1,5 esner (ayaklar sabit); diğerleri eski nefesi korur
  const breath = Math.sin(time * 1.9);
  const archBreath = 0.5 + 0.5 * Math.sin((time * Math.PI * 2) / HERO_BREATH.periodSec);
  ctx.save();
  ctx.translate(0, 74);
  if (usesArt) ctx.scale(1 + archBreath * HERO_BREATH.stretch * 0.4, 1 + archBreath * HERO_BREATH.stretch);
  else ctx.scale(1 + breath * 0.012, 1 + breath * 0.024);
  ctx.translate(0, -74);

  const art = !proceduralOnly && hasHeroArt(hero.classId) ? heroImage(hero.classId) : null;
  if (art) {
    drawHeroArt(ctx, art, hero.classId, pose, time, noGlow);
    if (auraGeo && !noGlow) drawEnchantAura(ctx, aura, time, auraGeo, 'front');
  } else if (usesArt) {
    // Çizim henüz yüklenmedi (yalnızca gösterilen kahramanın görseli istenir): eski çizim yanıp sönmesin
  } else if (creature) {
    drawCreature(ctx, hero, pose, time, aura, creature);
  } else {
    switch (hero.classId) {
      case 'necromancer':
        drawNecromancer(ctx, hero, pose, time, aura);
        break;
      case 'assassin':
        drawAssassin(ctx, hero, pose, time, aura);
        break;
      case 'stormcaller':
        drawStormcaller(ctx, hero, pose, time, aura);
        break;
      case 'dragonheart':
        drawDragonheart(ctx, hero, pose, time, aura);
        break;
      default:
        drawClassicHero(ctx, hero, pose, CLASS_DEFAULTS[hero.classId as CoreHeroClassId]);
        break;
    }
  }
  ctx.restore();

  ctx.restore();
}

/* ---------------- Klasik 4 sınıf (Savaşçı/Büyücü/Korucu/Şövalye) ---------------- */

function drawClassicHero(
  ctx: CanvasRenderingContext2D,
  hero: HeroProgress,
  pose: 'idle' | 'attack',
  d: (typeof CLASS_DEFAULTS)[CoreHeroClassId]
) {
  const helm = gear(hero, 'helmet', d.p, d.s, d.accent);
  const chest = gear(hero, 'chest', d.p, d.s, d.accent);
  const gloves = gear(hero, 'gloves', '#475569', '#94a3b8', '#94a3b8');
  const pants = gear(hero, 'pants', '#1e293b', '#475569', '#64748b');
  const boots = gear(hero, 'boots', '#334155', '#64748b', '#94a3b8');
  const weapon = gear(hero, 'weapon', '#94a3b8', '#e2e8f0', '#fbbf24');
  const offhand = gear(hero, 'offhand', '#475569', '#cbd5e1', '#38bdf8');
  const neck = hero.equipped.necklace;

  // Pelerin
  ctx.save();
  ctx.fillStyle = chest.p;
  ctx.strokeStyle = chest.s;
  ctx.lineWidth = 2;
  ctx.shadowColor = auraGlowFor(chest);
  ctx.shadowBlur = itemGlow(chest.up, 0);
  ctx.beginPath();
  ctx.moveTo(-18, -32);
  ctx.quadraticCurveTo(-58, 10, -48, 56);
  ctx.lineTo(14, 52);
  ctx.quadraticCurveTo(22, 6, 16, -32);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Bacaklar & çizmeler
  ctx.save();
  ctx.fillStyle = pants.p;
  ctx.strokeStyle = pants.s;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-20, 18, 16, 36, 5);
  ctx.roundRect(4, 18, 16, 36, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = boots.p;
  ctx.strokeStyle = boots.s;
  ctx.beginPath();
  ctx.roundRect(-23, 46, 20, 22, 6);
  ctx.roundRect(3, 46, 22, 22, 6);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Gövde zırhı
  ctx.save();
  const cg = ctx.createLinearGradient(-24, -36, 24, 24);
  cg.addColorStop(0, chest.s);
  cg.addColorStop(0.35, chest.p);
  cg.addColorStop(1, '#0f172a');
  ctx.fillStyle = cg;
  ctx.strokeStyle = chest.s;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = auraGlowFor(chest);
  ctx.shadowBlur = itemGlow(chest.up, 4);
  ctx.beginPath();
  ctx.moveTo(-26, -34);
  ctx.lineTo(26, -34);
  ctx.lineTo(20, 22);
  ctx.lineTo(-20, 22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = neck ? itemGlow(neck.upgradeLevel, 10) : 0;
  ctx.fillStyle = neck ? neck.visual.glowColor : chest.s;
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.lineTo(8, -14);
  ctx.lineTo(0, -4);
  ctx.lineTo(-8, -14);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Omuzluklar
  ctx.save();
  ctx.fillStyle = chest.p;
  ctx.strokeStyle = chest.s;
  ctx.lineWidth = 2.5;
  const pr = chest.cat === 'heavy_armor' || hero.classId === 'warrior' || hero.classId === 'paladin' ? 16 : 12;
  ctx.beginPath();
  ctx.arc(-26, -28, pr, Math.PI * 0.75, Math.PI * 2.1);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(26, -28, pr, Math.PI * 0.9, Math.PI * 2.25);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Sol kol + ikinci el
  ctx.save();
  ctx.fillStyle = gloves.p;
  ctx.strokeStyle = gloves.s;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-36, -16, 14, 28, 6);
  ctx.fill();
  ctx.stroke();
  const offCat = (offhand.cat ||
    (hero.classId === 'mage' ? 'tome' : hero.classId === 'ranger' ? 'quiver' : 'shield')) as ItemCategory;
  drawOffhand(ctx, offhand.cat, offhand, offCat);
  ctx.restore();

  // Kafa
  ctx.save();
  ctx.fillStyle = d.skin;
  ctx.beginPath();
  ctx.arc(0, -54, 21, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(5, -54, 4, 3, 0, 0, Math.PI * 2);
  ctx.ellipse(15, -54, 3.5, 2.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = d.accent;
  ctx.beginPath();
  ctx.arc(6, -54, 2, 0, Math.PI * 2);
  ctx.arc(15, -54, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Miğfer / şapka
  ctx.save();
  ctx.shadowColor = auraGlowFor(helm);
  ctx.shadowBlur = itemGlow(helm.up, 0);
  if (helm.has) {
    ctx.fillStyle = helm.p;
    ctx.strokeStyle = helm.s;
    ctx.lineWidth = 2.5;
    if (helm.cat === 'magic_armor' || hero.classId === 'mage') {
      ctx.beginPath();
      ctx.moveTo(-28, -62);
      ctx.lineTo(28, -62);
      ctx.lineTo(4, -104);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = helm.g;
      ctx.beginPath();
      ctx.arc(0, -68, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (helm.cat === 'light_armor' || hero.classId === 'ranger') {
      ctx.beginPath();
      ctx.arc(0, -56, 24, Math.PI * 0.85, Math.PI * 2.15);
      ctx.lineTo(18, -58);
      ctx.lineTo(-18, -50);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(0, -56, 24, Math.PI, Math.PI * 2);
      ctx.lineTo(24, -44);
      ctx.lineTo(8, -44);
      ctx.lineTo(8, -52);
      ctx.lineTo(-24, -44);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = helm.g;
      ctx.beginPath();
      ctx.moveTo(-6, -80);
      ctx.quadraticCurveTo(-18, -98, -2, -96);
      ctx.quadraticCurveTo(10, -90, 4, -78);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = hero.classId === 'mage' ? '#e2e8f0' : hero.classId === 'paladin' ? '#fde047' : '#334155';
    ctx.beginPath();
    ctx.arc(-2, -59, 22, Math.PI * 0.9, Math.PI * 2.1);
    ctx.fill();
  }
  ctx.restore();

  // Sağ kol + silah
  ctx.save();
  ctx.translate(28, -10);
  ctx.rotate(pose === 'attack' ? 0.55 : -0.18);
  ctx.fillStyle = gloves.p;
  ctx.strokeStyle = gloves.s;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-7, -8, 15, 24, 6);
  ctx.fill();
  ctx.stroke();
  const wCat =
    weapon.cat ||
    (hero.classId === 'mage' ? 'staff' : hero.classId === 'ranger' ? 'bow' : 'sword');
  drawWeapon(ctx, wCat, weapon, pose);
  ctx.restore();
}

/* ---------------- NEKROMANT ---------------- */

function drawNecromancer(
  ctx: CanvasRenderingContext2D,
  hero: HeroProgress,
  pose: 'idle' | 'attack',
  time: number,
  aura: EnchantAura
) {
  const d = CLASS_DEFAULTS.necromancer;
  const helm = gear(hero, 'helmet', d.p, d.s, d.accent);
  const chest = gear(hero, 'chest', d.p, d.s, d.accent);
  const gloves = gear(hero, 'gloves', '#27272a', '#52525b', '#4ade80');
  const boots = gear(hero, 'boots', '#18181b', '#3f3f46', '#4ade80');
  const weapon = gear(hero, 'weapon', '#4c1d95', '#86efac', '#4ade80');
  const offhand = gear(hero, 'offhand', '#4c1d95', '#e9d5ff', '#4ade80');

  // Ruh alevleri (zemin)
  ctx.save();
  for (let i = 0; i < 3; i++) {
    const fx = -46 + i * 46;
    const fy = 62 + Math.sin(time * 2.4 + i) * 4;
    const fg = ctx.createRadialGradient(fx, fy - 8, 1, fx, fy - 8, 16);
    fg.addColorStop(0, 'rgba(134,239,172,0.95)');
    fg.addColorStop(1, 'rgba(74,222,128,0)');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.moveTo(fx, fy - 26);
    ctx.quadraticCurveTo(fx + 10, fy - 8, fx, fy + 2);
    ctx.quadraticCurveTo(fx - 10, fy - 8, fx, fy - 26);
    ctx.fill();
  }
  ctx.restore();

  // Uzun yırtık cübbe
  ctx.save();
  const rg = ctx.createLinearGradient(0, -40, 0, 72);
  rg.addColorStop(0, chest.s);
  rg.addColorStop(0.4, chest.p);
  rg.addColorStop(1, '#0a0414');
  ctx.fillStyle = rg;
  ctx.strokeStyle = chest.s;
  ctx.lineWidth = 2.4;
  ctx.shadowColor = auraGlowFor(chest);
  ctx.shadowBlur = itemGlow(chest.up, 6);
  ctx.beginPath();
  ctx.moveTo(-20, -38);
  ctx.lineTo(20, -38);
  ctx.lineTo(34, 44);
  ctx.lineTo(24, 66);
  ctx.lineTo(12, 52);
  ctx.lineTo(0, 70);
  ctx.lineTo(-12, 52);
  ctx.lineTo(-24, 66);
  ctx.lineTo(-34, 44);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Çizmeler
  ctx.save();
  ctx.fillStyle = boots.p;
  ctx.strokeStyle = boots.s;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-18, 52, 14, 16, 4);
  ctx.roundRect(4, 52, 15, 16, 4);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Göğüs runu
  ctx.save();
  ctx.fillStyle = d.accent;
  ctx.shadowColor = d.accent;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(0, -12, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#052e16';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(0, -6);
  ctx.moveTo(-5, -12);
  ctx.lineTo(5, -12);
  ctx.stroke();
  ctx.restore();

  // Kukuletalı baş — boş göz çukurları
  ctx.save();
  ctx.fillStyle = helm.has ? helm.p : d.p;
  ctx.strokeStyle = helm.has ? helm.s : d.s;
  ctx.lineWidth = 2.4;
  ctx.shadowColor = auraGlowFor(helm);
  ctx.shadowBlur = itemGlow(helm.up, 4);
  ctx.beginPath();
  ctx.moveTo(-26, -44);
  ctx.quadraticCurveTo(-30, -88, 0, -92);
  ctx.quadraticCurveTo(30, -88, 26, -44);
  ctx.quadraticCurveTo(0, -34, -26, -44);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Karanlık yüz boşluğu
  ctx.fillStyle = '#05070a';
  ctx.beginPath();
  ctx.ellipse(2, -60, 15, 17, 0, 0, Math.PI * 2);
  ctx.fill();
  // Parlayan ruh gözleri
  ctx.fillStyle = d.accent;
  ctx.shadowColor = d.accent;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.ellipse(-4, -62, 3.4, 2.2, -0.25, 0, Math.PI * 2);
  ctx.ellipse(9, -62, 3.4, 2.2, 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Sol kol + ruh kafatası
  ctx.save();
  ctx.fillStyle = gloves.p;
  ctx.strokeStyle = gloves.s;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-34, -22, 13, 28, 6);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.translate(0, Math.sin(time * 1.8) * 3);
  drawOffhand(ctx, offhand.cat, offhand, 'skull');
  ctx.restore();
  ctx.restore();

  // Sağ kol + tırpan
  ctx.save();
  ctx.translate(26, -14);
  ctx.rotate(pose === 'attack' ? 0.6 : -0.12);
  ctx.fillStyle = gloves.p;
  ctx.strokeStyle = gloves.s;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-7, -8, 14, 24, 6);
  ctx.fill();
  ctx.stroke();
  drawWeapon(ctx, weapon.cat || 'scythe', weapon, pose);
  ctx.restore();

  // Etrafta dönen küçük ruhlar
  if (aura.tier >= 1) {
    ctx.save();
    for (let i = 0; i < 2 + aura.tier; i++) {
      const a = time * 1.1 + (i / (2 + aura.tier)) * Math.PI * 2;
      const sx = Math.cos(a) * 62;
      const sy = -18 + Math.sin(a) * 24;
      ctx.fillStyle = 'rgba(134,239,172,0.8)';
      ctx.shadowColor = '#4ade80';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(sx, sy - 7);
      ctx.quadraticCurveTo(sx + 5, sy, sx, sy + 5);
      ctx.quadraticCurveTo(sx - 5, sy, sx, sy - 7);
      ctx.fill();
    }
    ctx.restore();
  }
}

/* ---------------- SUİKASTÇI ---------------- */

function drawAssassin(
  ctx: CanvasRenderingContext2D,
  hero: HeroProgress,
  pose: 'idle' | 'attack',
  time: number,
  aura: EnchantAura
) {
  const d = CLASS_DEFAULTS.assassin;
  const helm = gear(hero, 'helmet', d.p, d.s, d.accent);
  const chest = gear(hero, 'chest', d.p, d.s, d.accent);
  const gloves = gear(hero, 'gloves', '#18181b', '#3f3f46', '#d946ef');
  const pants = gear(hero, 'pants', '#1f2937', '#4b5563', '#a855f7');
  const boots = gear(hero, 'boots', '#111827', '#374151', '#d946ef');
  const weapon = gear(hero, 'weapon', '#3f3f46', '#e4e4e7', '#d946ef');
  const offhand = gear(hero, 'offhand', d.p, d.s, d.accent);

  // Dalgalanan gölge pelerini
  ctx.save();
  const cg = ctx.createLinearGradient(0, -40, 0, 70);
  cg.addColorStop(0, chest.p);
  cg.addColorStop(1, 'rgba(9,9,18,0.92)');
  ctx.fillStyle = cg;
  ctx.strokeStyle = chest.s;
  ctx.lineWidth = 2;
  ctx.shadowColor = auraGlowFor(chest);
  ctx.shadowBlur = itemGlow(chest.up, 6);
  const sway = Math.sin(time * 1.6) * 6;
  ctx.beginPath();
  ctx.moveTo(-16, -34);
  ctx.quadraticCurveTo(-52 + sway, 6, -44 + sway, 58);
  ctx.quadraticCurveTo(-16, 46, 0, 60);
  ctx.quadraticCurveTo(20, 44, 42 - sway, 56);
  ctx.quadraticCurveTo(46 - sway, 4, 16, -34);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Bacaklar + çizmeler (çevik duruş)
  ctx.save();
  ctx.fillStyle = pants.p;
  ctx.strokeStyle = pants.s;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-17, 18, 13, 34, 5);
  ctx.roundRect(5, 18, 13, 34, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = boots.p;
  ctx.strokeStyle = boots.s;
  ctx.beginPath();
  ctx.roundRect(-20, 46, 17, 20, 5);
  ctx.roundRect(4, 46, 18, 20, 5);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // İnce gövde + çapraz hançer kayışları
  ctx.save();
  ctx.fillStyle = chest.p;
  ctx.strokeStyle = chest.s;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-19, -34);
  ctx.lineTo(19, -34);
  ctx.lineTo(15, 20);
  ctx.lineTo(-15, 20);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = chest.s;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-14, -30);
  ctx.lineTo(13, 12);
  ctx.moveTo(14, -30);
  ctx.lineTo(-12, 12);
  ctx.stroke();
  ctx.restore();

  // Kukuleta + yüz maskesi (sadece gözler görünür)
  ctx.save();
  ctx.fillStyle = helm.has ? helm.p : d.p;
  ctx.strokeStyle = helm.has ? helm.s : d.s;
  ctx.lineWidth = 2.3;
  ctx.shadowColor = auraGlowFor(helm);
  ctx.shadowBlur = itemGlow(helm.up, 4);
  ctx.beginPath();
  ctx.moveTo(-24, -42);
  ctx.quadraticCurveTo(-26, -84, 0, -88);
  ctx.quadraticCurveTo(26, -84, 24, -42);
  ctx.quadraticCurveTo(12, -34, 0, -40);
  ctx.quadraticCurveTo(-12, -34, -24, -42);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Maske
  ctx.fillStyle = '#0b0b12';
  ctx.beginPath();
  ctx.roundRect(-14, -68, 28, 24, 9);
  ctx.fill();
  // Parlayan fuchsia gözler
  ctx.fillStyle = d.accent;
  ctx.shadowColor = d.accent;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.moveTo(-11, -60);
  ctx.lineTo(-3, -57);
  ctx.lineTo(-11, -55);
  ctx.closePath();
  ctx.moveTo(11, -60);
  ctx.lineTo(3, -57);
  ctx.lineTo(11, -55);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Sol kol + hançer (ikiz bıçaklar!)
  ctx.save();
  ctx.translate(-24, -8);
  ctx.rotate(pose === 'attack' ? -0.5 : 0.22);
  ctx.fillStyle = gloves.p;
  ctx.strokeStyle = gloves.s;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-7, -6, 13, 22, 5);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.scale(-1, 1);
  drawWeapon(ctx, weapon.cat || 'dagger', weapon, pose);
  ctx.restore();
  ctx.restore();

  // İkinci el: gölge pelerini / hançer
  if ((offhand.cat || 'cloak') === 'cloak') {
    drawOffhand(ctx, offhand.cat, offhand, 'cloak');
  } else {
    ctx.save();
    ctx.translate(-30, 0);
    drawOffhand(ctx, offhand.cat, offhand, 'cloak');
    ctx.restore();
  }

  // Sağ kol + hançer
  ctx.save();
  ctx.translate(25, -10);
  ctx.rotate(pose === 'attack' ? 0.75 : -0.28);
  ctx.fillStyle = gloves.p;
  ctx.strokeStyle = gloves.s;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-6, -6, 13, 22, 5);
  ctx.fill();
  ctx.stroke();
  drawWeapon(ctx, weapon.cat || 'dagger', weapon, pose);
  ctx.restore();

  // Gölge izleri
  if (aura.tier >= 1) {
    ctx.save();
    ctx.globalAlpha = 0.28 + 0.16 * Math.sin(time * 3);
    ctx.strokeStyle = d.accent;
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const ox = -70 + i * 12 + Math.sin(time * 2 + i) * 5;
      ctx.beginPath();
      ctx.moveTo(ox, -30 + i * 8);
      ctx.lineTo(ox + 16, -22 + i * 8);
      ctx.stroke();
    }
    ctx.restore();
  }
}

/* ---------------- FIRTINA ÇAĞIRAN ---------------- */

function drawStormcaller(
  ctx: CanvasRenderingContext2D,
  hero: HeroProgress,
  pose: 'idle' | 'attack',
  time: number,
  aura: EnchantAura
) {
  const d = CLASS_DEFAULTS.stormcaller;
  const helm = gear(hero, 'helmet', d.p, d.s, d.accent);
  const chest = gear(hero, 'chest', d.p, d.s, d.accent);
  const gloves = gear(hero, 'gloves', '#164e63', '#22d3ee', '#67e8f9');
  const boots = gear(hero, 'boots', '#0e7490', '#155e75', '#22d3ee');
  const weapon = gear(hero, 'weapon', '#0e7490', '#67e8f9', '#fde047');
  const offhand = gear(hero, 'offhand', '#155e75', '#a5f3fc', '#22d3ee');

  // Elektrik ark halkası
  ctx.save();
  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 1.8;
  ctx.globalAlpha = 0.35 + 0.3 * Math.abs(Math.sin(time * 4));
  ctx.shadowColor = '#fde047';
  ctx.shadowBlur = 10;
  for (let i = 0; i < 4; i++) {
    const a0 = time * 2.2 + (i * Math.PI) / 2;
    ctx.beginPath();
    for (let s = 0; s <= 6; s++) {
      const a = a0 + (s / 6) * 1.1;
      const rr = 62 + (s % 2 === 0 ? 0 : 7);
      const px = Math.cos(a) * rr;
      const py = -6 + Math.sin(a) * rr * 0.55;
      if (s === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();

  // Cübbe eteği
  ctx.save();
  const rg = ctx.createLinearGradient(0, -36, 0, 70);
  rg.addColorStop(0, chest.s);
  rg.addColorStop(0.45, chest.p);
  rg.addColorStop(1, '#04212a');
  ctx.fillStyle = rg;
  ctx.strokeStyle = chest.s;
  ctx.lineWidth = 2.4;
  ctx.shadowColor = auraGlowFor(chest);
  ctx.shadowBlur = itemGlow(chest.up, 6);
  ctx.beginPath();
  ctx.moveTo(-22, -36);
  ctx.lineTo(22, -36);
  ctx.lineTo(38, 46);
  ctx.lineTo(22, 68);
  ctx.lineTo(0, 56);
  ctx.lineTo(-22, 68);
  ctx.lineTo(-38, 46);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Çizmeler
  ctx.save();
  ctx.fillStyle = boots.p;
  ctx.strokeStyle = boots.s;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-19, 50, 15, 18, 5);
  ctx.roundRect(4, 50, 16, 18, 5);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Tesla bobini omuzluklar
  ctx.save();
  ctx.fillStyle = gloves.p;
  ctx.strokeStyle = '#67e8f9';
  ctx.lineWidth = 2.4;
  ctx.shadowColor = '#22d3ee';
  ctx.shadowBlur = 12;
  for (const sx of [-27, 27]) {
    ctx.beginPath();
    ctx.arc(sx, -30, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // bobin halkaları
    ctx.beginPath();
    ctx.ellipse(sx, -44, 7, 3, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(sx, -50, 4.5, 2.4, 0, 0, Math.PI * 2);
    ctx.stroke();
    // kıvılcım
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(sx, -55, 2.6 + Math.sin(time * 6 + sx) * 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = gloves.p;
  }
  ctx.restore();

  // Göğüs fırtına çekirdeği
  ctx.save();
  ctx.fillStyle = '#fde047';
  ctx.shadowColor = '#facc15';
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.moveTo(0, -26);
  ctx.lineTo(7, -12);
  ctx.lineTo(2, -12);
  ctx.lineTo(5, 2);
  ctx.lineTo(-6, -14);
  ctx.lineTo(-1, -14);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Baş + dikenli saç / taç
  ctx.save();
  ctx.fillStyle = d.skin;
  ctx.beginPath();
  ctx.arc(0, -56, 19, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = helm.has ? helm.p : '#0e7490';
  ctx.strokeStyle = helm.has ? helm.s : '#67e8f9';
  ctx.lineWidth = 2.3;
  ctx.shadowColor = auraGlowFor(helm);
  ctx.shadowBlur = itemGlow(helm.up, 6);
  ctx.beginPath();
  ctx.moveTo(-22, -58);
  ctx.quadraticCurveTo(-24, -86, 0, -90);
  ctx.quadraticCurveTo(24, -86, 22, -58);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Şimşek tacı
  ctx.fillStyle = '#fde047';
  ctx.beginPath();
  ctx.moveTo(-16, -84);
  ctx.lineTo(-11, -100);
  ctx.lineTo(-6, -86);
  ctx.lineTo(0, -104);
  ctx.lineTo(6, -86);
  ctx.lineTo(11, -100);
  ctx.lineTo(16, -84);
  ctx.closePath();
  ctx.fill();
  // Parlayan gözler
  ctx.fillStyle = '#67e8f9';
  ctx.shadowColor = '#22d3ee';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.ellipse(-6, -56, 3.6, 2.4, 0, 0, Math.PI * 2);
  ctx.ellipse(7, -56, 3.6, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Sol kol + büyü kitabı
  ctx.save();
  ctx.fillStyle = gloves.p;
  ctx.strokeStyle = gloves.s;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-35, -20, 13, 27, 6);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.translate(0, Math.sin(time * 2.1) * 3.5);
  drawOffhand(ctx, offhand.cat, offhand, 'tome');
  ctx.restore();
  ctx.restore();

  // Sağ kol + mızrak
  ctx.save();
  ctx.translate(27, -12);
  ctx.rotate(pose === 'attack' ? 0.5 : -0.15);
  ctx.fillStyle = gloves.p;
  ctx.strokeStyle = gloves.s;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-7, -8, 14, 24, 6);
  ctx.fill();
  ctx.stroke();
  drawWeapon(ctx, weapon.cat || 'spear', weapon, pose);
  ctx.restore();

  // Yükselen elektrik kıvılcımları
  if (aura.tier >= 1) {
    ctx.save();
    ctx.strokeStyle = aura.tier >= 3 ? aura.color : '#fde047';
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.75;
    for (let i = 0; i < 2 + aura.tier; i++) {
      const bx = -44 + i * 22;
      const by = 66 - ((time * 42 + i * 30) % 120);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + 4, by - 7);
      ctx.lineTo(bx - 3, by - 12);
      ctx.lineTo(bx + 3, by - 20);
      ctx.stroke();
    }
    ctx.restore();
  }
}

/* ---------------- EJDER KALBİ ---------------- */

function drawDragonheart(
  ctx: CanvasRenderingContext2D,
  hero: HeroProgress,
  pose: 'idle' | 'attack',
  time: number,
  aura: EnchantAura
) {
  const d = CLASS_DEFAULTS.dragonheart;
  const helm = gear(hero, 'helmet', d.p, d.s, d.accent);
  const chest = gear(hero, 'chest', d.p, d.s, d.accent);
  const gloves = gear(hero, 'gloves', '#7f1d1d', '#fb923c', '#fbbf24');
  const pants = gear(hero, 'pants', '#450a0a', '#7f1d1d', '#f97316');
  const boots = gear(hero, 'boots', '#292524', '#57534e', '#f97316');
  const weapon = gear(hero, 'weapon', '#7f1d1d', '#fb923c', '#fbbf24');
  const offhand = gear(hero, 'offhand', '#7f1d1d', '#fdba74', '#f97316');

  // Ejder kanatları
  ctx.save();
  const flap = Math.sin(time * 1.5) * 5;
  ctx.shadowColor = '#f97316';
  ctx.shadowBlur = 12 + aura.tier * 3;
  for (const dir of [-1, 1]) {
    const wg = ctx.createLinearGradient(dir * 20, -40, dir * 96, 20);
    wg.addColorStop(0, '#b91c1c');
    wg.addColorStop(1, '#450a0a');
    ctx.fillStyle = wg;
    ctx.strokeStyle = '#fb923c';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(dir * 14, -30);
    ctx.quadraticCurveTo(dir * (70 + flap), -78 - flap, dir * (94 + flap), -30);
    ctx.quadraticCurveTo(dir * (66), -18, dir * (78 + flap), 12);
    ctx.quadraticCurveTo(dir * 44, -6, dir * 52, 26);
    ctx.quadraticCurveTo(dir * 26, 4, dir * 14, 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Kanat zarı çizgileri
    ctx.strokeStyle = 'rgba(253,186,116,0.55)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(dir * 16, -26);
    ctx.lineTo(dir * (76 + flap), -34);
    ctx.moveTo(dir * 16, -20);
    ctx.lineTo(dir * (60 + flap), 6);
    ctx.stroke();
  }
  ctx.restore();

  // Kuyruk
  ctx.save();
  ctx.strokeStyle = chest.p;
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-14, 34);
  ctx.quadraticCurveTo(-56, 44 + Math.sin(time * 1.8) * 6, -68, 16);
  ctx.stroke();
  ctx.fillStyle = d.accent;
  ctx.beginPath();
  ctx.moveTo(-68, 16);
  ctx.lineTo(-80, 4);
  ctx.lineTo(-62, 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Bacaklar + çizmeler (ağır zırh)
  ctx.save();
  ctx.fillStyle = pants.p;
  ctx.strokeStyle = pants.s;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.roundRect(-21, 18, 17, 36, 5);
  ctx.roundRect(4, 18, 17, 36, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = boots.p;
  ctx.strokeStyle = boots.s;
  ctx.beginPath();
  ctx.roundRect(-24, 46, 21, 22, 6);
  ctx.roundRect(3, 46, 22, 22, 6);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Ejder pullu gövde zırhı
  ctx.save();
  const cg = ctx.createLinearGradient(-26, -36, 26, 26);
  cg.addColorStop(0, chest.s);
  cg.addColorStop(0.4, chest.p);
  cg.addColorStop(1, '#1c0806');
  ctx.fillStyle = cg;
  ctx.strokeStyle = chest.s;
  ctx.lineWidth = 2.6;
  ctx.shadowColor = auraGlowFor(chest);
  ctx.shadowBlur = itemGlow(chest.up, 8);
  ctx.beginPath();
  ctx.moveTo(-28, -34);
  ctx.lineTo(28, -34);
  ctx.lineTo(22, 24);
  ctx.lineTo(-22, 24);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Pul dokusu
  ctx.strokeStyle = 'rgba(253,186,116,0.5)';
  ctx.lineWidth = 1.4;
  for (let row = 0; row < 4; row++) {
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.arc(i * 11, -24 + row * 13, 5.5, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    }
  }
  // Kor çekirdek
  ctx.fillStyle = '#fbbf24';
  ctx.shadowColor = '#f97316';
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(0, -6, 7.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Omuz dikenleri
  ctx.save();
  ctx.fillStyle = gloves.p;
  ctx.strokeStyle = gloves.s;
  ctx.lineWidth = 2.3;
  for (const sx of [-28, 28]) {
    ctx.beginPath();
    ctx.arc(sx, -28, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(sx - 6, -40);
    ctx.lineTo(sx - 1, -56);
    ctx.lineTo(sx + 4, -40);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = gloves.p;
  }
  ctx.restore();

  // Boynuzlu ejder miğferi
  ctx.save();
  ctx.fillStyle = helm.has ? helm.p : d.p;
  ctx.strokeStyle = helm.has ? helm.s : d.s;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = auraGlowFor(helm);
  ctx.shadowBlur = itemGlow(helm.up, 6);
  ctx.beginPath();
  ctx.roundRect(-20, -74, 40, 34, 10);
  ctx.fill();
  ctx.stroke();
  // Boynuzlar
  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  ctx.moveTo(-18, -68);
  ctx.quadraticCurveTo(-40, -86, -30, -100);
  ctx.quadraticCurveTo(-20, -84, -10, -72);
  ctx.closePath();
  ctx.moveTo(18, -68);
  ctx.quadraticCurveTo(40, -86, 30, -100);
  ctx.quadraticCurveTo(20, -84, 10, -72);
  ctx.closePath();
  ctx.fill();
  // Çene dikenleri
  ctx.fillStyle = helm.has ? helm.s : '#fdba74';
  ctx.beginPath();
  ctx.moveTo(-14, -42);
  ctx.lineTo(-8, -32);
  ctx.lineTo(-2, -42);
  ctx.lineTo(4, -32);
  ctx.lineTo(10, -42);
  ctx.closePath();
  ctx.fill();
  // Ateş gözleri
  ctx.fillStyle = '#fef08a';
  ctx.shadowColor = '#f97316';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.ellipse(-7, -58, 4.6, 2.8, -0.2, 0, Math.PI * 2);
  ctx.ellipse(7, -58, 4.6, 2.8, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Sol kol + kalkan
  ctx.save();
  ctx.fillStyle = gloves.p;
  ctx.strokeStyle = gloves.s;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-38, -16, 15, 28, 6);
  ctx.fill();
  ctx.stroke();
  drawOffhand(ctx, offhand.cat, offhand, 'shield');
  ctx.restore();

  // Sağ kol + kılıç/balta
  ctx.save();
  ctx.translate(30, -10);
  ctx.rotate(pose === 'attack' ? 0.62 : -0.2);
  ctx.fillStyle = gloves.p;
  ctx.strokeStyle = gloves.s;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-7, -8, 15, 24, 6);
  ctx.fill();
  ctx.stroke();
  drawWeapon(ctx, weapon.cat || 'sword', weapon, pose);
  ctx.restore();

  // Alev nefesi parçacıkları
  if (aura.tier >= 1) {
    ctx.save();
    for (let i = 0; i < 2 + aura.tier; i++) {
      const fy = 30 - ((time * 34 + i * 26) % 90);
      const fx = 30 + Math.sin(time * 2.4 + i) * 16;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(251,146,60,0.85)' : 'rgba(253,224,71,0.8)';
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(fx, fy, 2.6 + Math.sin(time * 5 + i) * 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

/** Ekipman parıltı rengi (yoksa şeffaf) */
export function auraGlowFor(c: GearColor): string {
  return c.has ? c.g : 'rgba(0,0,0,0)';
}
