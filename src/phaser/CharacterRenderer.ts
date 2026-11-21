import Phaser from 'phaser';
import { ENEMY_ART_GROUND, ENEMY_ART_LAYOUT, ENEMY_ART_META, enemyArtKey, enemyImage, type EnemyArtKey } from '../data/enemyArt';
import {
  EnemyDef,
  EquipmentSlot,
  HeroProgress,
} from '../types/game';
import { RARITY_META } from '../data/skills';
import { drawHeroToCanvas as drawHeroScene, HERO_TEX_SIZE } from './HeroRenderer';

export function drawHeroToCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  hero: HeroProgress,
  pose: 'idle' | 'attack' = 'idle'
) {
  ctx.clearRect(0, 0, w, h);
  const cx = w * 0.46;
  const cy = h * 0.56;
  const scale = Math.min(w, h) / 220;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  const eq = hero.equipped;
  const getCol = (slot: EquipmentSlot, fallback1: string, fallback2: string, glow = '#94a3b8') => {
    const itm = eq[slot];
    if (!itm) return { p: fallback1, s: fallback2, g: glow, rar: 'common' as const, has: false, cat: '' };
    return {
      p: itm.visual.primaryColor,
      s: itm.visual.secondaryColor,
      g: itm.visual.glowColor,
      rar: itm.rarity,
      has: true,
      cat: itm.category,
    };
  };

  const clsDefaults: Record<string, { p: string; s: string; skin: string }> = {
    warrior: { p: '#991b1b', s: '#cbd5e1', skin: '#f1c29b' },
    mage: { p: '#6b21a8', s: '#c4b5fd', skin: '#fde2cf' },
    ranger: { p: '#166534', s: '#fde047', skin: '#eab38f' },
    paladin: { p: '#b45309', s: '#fef3c7', skin: '#f5ccb0' },
  };
  const def = clsDefaults[hero.classId] ?? { p: '#334155', s: '#94a3b8', skin: '#e8c39e' };

  const helm = getCol('helmet', def.p, def.s);
  const chest = getCol('chest', def.p, def.s);
  const gloves = getCol('gloves', '#475569', '#94a3b8');
  const pants = getCol('pants', '#1e293b', '#475569');
  const boots = getCol('boots', '#334155', '#64748b');
  const weapon = getCol('weapon', '#94a3b8', '#e2e8f0', '#fbbf24');
  const offhand = getCol('offhand', '#475569', '#cbd5e1', '#38bdf8');
  const neck = eq.necklace;
  const ring1 = eq.ring1;
  const ring2 = eq.ring2;

  // Accessory / Legendary Aura behind hero
  const auraColor =
    neck?.visual.glowColor ||
    ring1?.visual.glowColor ||
    ring2?.visual.glowColor ||
    (chest.has ? RARITY_META[chest.rar].color : null);

  if (auraColor) {
    ctx.save();
    const auraGrad = ctx.createRadialGradient(0, -10, 12, 0, -10, 92);
    auraGrad.addColorStop(0, `${auraColor}44`);
    auraGrad.addColorStop(0.6, `${auraColor}18`);
    auraGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(0, -10, 92, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Flowing Hero Cape
  ctx.save();
  ctx.fillStyle = chest.p;
  ctx.beginPath();
  ctx.moveTo(-18, -32);
  ctx.quadraticCurveTo(-58, 10, -48, 56);
  ctx.lineTo(14, 52);
  ctx.quadraticCurveTo(22, 6, 16, -32);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = chest.s;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Ground shadow
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 74, 42, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Legs / Pants
  ctx.save();
  ctx.fillStyle = pants.p;
  ctx.strokeStyle = pants.s;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-20, 18, 16, 36, 5);
  ctx.roundRect(4, 18, 16, 36, 5);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Boots
  ctx.save();
  ctx.fillStyle = boots.p;
  ctx.strokeStyle = boots.s;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-23, 46, 20, 22, 6);
  ctx.roundRect(3, 46, 22, 22, 6);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Torso / Chest Armor
  ctx.save();
  const chestGrad = ctx.createLinearGradient(-24, -36, 24, 24);
  chestGrad.addColorStop(0, chest.s);
  chestGrad.addColorStop(0.35, chest.p);
  chestGrad.addColorStop(1, '#0f172a');
  ctx.fillStyle = chestGrad;
  ctx.strokeStyle = chest.s;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-26, -34);
  ctx.lineTo(26, -34);
  ctx.lineTo(20, 22);
  ctx.lineTo(-20, 22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Chest crest / necklace gem
  ctx.fillStyle = neck ? neck.visual.glowColor : chest.s;
  ctx.shadowColor = neck ? neck.visual.glowColor : chest.s;
  ctx.shadowBlur = neck ? 10 : 0;
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.lineTo(8, -14);
  ctx.lineTo(0, -4);
  ctx.lineTo(-8, -14);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Shoulder Pauldrons (Heavy/Royal armor looks bulkier!)
  ctx.save();
  ctx.fillStyle = chest.p;
  ctx.strokeStyle = chest.s;
  ctx.lineWidth = 2.5;
  const pauldronR = chest.cat === 'heavy_armor' || hero.classId === 'warrior' || hero.classId === 'paladin' ? 16 : 12;
  ctx.beginPath();
  ctx.arc(-26, -28, pauldronR, Math.PI * 0.75, Math.PI * 2.1);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(26, -28, pauldronR, Math.PI * 0.9, Math.PI * 2.25);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Back/Left Arm + Offhand (Shield / Tome / Quiver)
  ctx.save();
  ctx.fillStyle = gloves.p;
  ctx.strokeStyle = gloves.s;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-36, -16, 14, 28, 6);
  ctx.fill();
  ctx.stroke();

  if (offhand.has || hero.classId === 'warrior' || hero.classId === 'paladin') {
    const offCat = offhand.cat || (hero.classId === 'mage' ? 'tome' : hero.classId === 'ranger' ? 'quiver' : 'shield');
    if (offCat === 'tome') {
      // Floating Magic Grimoire
      ctx.save();
      ctx.translate(-44, 0);
      ctx.rotate(-0.15);
      ctx.fillStyle = offhand.p;
      ctx.strokeStyle = offhand.g;
      ctx.shadowColor = offhand.g;
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-14, -18, 28, 34, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = offhand.s;
      ctx.beginPath();
      ctx.arc(0, -1, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (offCat === 'quiver') {
      // Quiver with arrows over shoulder
      ctx.save();
      ctx.translate(-34, -18);
      ctx.rotate(-0.4);
      ctx.fillStyle = offhand.p;
      ctx.strokeStyle = offhand.s;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-7, -22, 14, 38, 4);
      ctx.fill();
      ctx.stroke();
      // Arrow fletchings
      ctx.strokeStyle = offhand.g;
      ctx.beginPath();
      ctx.moveTo(-3, -28);
      ctx.lineTo(-3, -20);
      ctx.moveTo(3, -30);
      ctx.lineTo(3, -20);
      ctx.stroke();
      ctx.restore();
    } else {
      // Hero Shield!
      ctx.save();
      ctx.translate(-36, 4);
      ctx.shadowColor = offhand.g;
      ctx.shadowBlur = offhand.has ? 10 : 4;
      const shGrad = ctx.createLinearGradient(-18, -22, 18, 26);
      shGrad.addColorStop(0, offhand.s);
      shGrad.addColorStop(0.5, offhand.p);
      shGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = shGrad;
      ctx.strokeStyle = offhand.s;
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
      ctx.fillStyle = offhand.g;
      ctx.beginPath();
      ctx.arc(0, -2, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();

  // Head & Face
  ctx.save();
  ctx.fillStyle = def.skin;
  ctx.beginPath();
  ctx.arc(0, -54, 21, 0, Math.PI * 2);
  ctx.fill();

  // Glowing hero eyes
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(5, -54, 4, 3, 0, 0, Math.PI * 2);
  ctx.ellipse(15, -54, 3.5, 2.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = hero.classId === 'mage' ? '#c084fc' : hero.classId === 'paladin' ? '#fbbf24' : '#38bdf8';
  ctx.beginPath();
  ctx.arc(6, -54, 2, 0, Math.PI * 2);
  ctx.arc(15, -54, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Helmet / Hat / Hood (changes dramatically if helmet equipped!)
  ctx.save();
  if (helm.has) {
    ctx.fillStyle = helm.p;
    ctx.strokeStyle = helm.s;
    ctx.lineWidth = 2.5;
    if (helm.cat === 'magic_armor' || hero.classId === 'mage') {
      // Pointed Archmage Wizard Hat / Crown
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
      // Sleek Hood with visor
      ctx.beginPath();
      ctx.arc(0, -56, 24, Math.PI * 0.85, Math.PI * 2.15);
      ctx.lineTo(18, -58);
      ctx.lineTo(-18, -50);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      // Heavy Knight Great Helm with Plume / Horns!
      ctx.beginPath();
      ctx.arc(0, -56, 24, Math.PI, Math.PI * 2);
      ctx.lineTo(24, -44);
      ctx.lineTo(8, -44);
      ctx.lineTo(8, -52);
      ctx.lineTo(-24, -44);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Crest plume
      ctx.fillStyle = helm.g;
      ctx.beginPath();
      ctx.moveTo(-6, -80);
      ctx.quadraticCurveTo(-18, -98, -2, -96);
      ctx.quadraticCurveTo(10, -90, 4, -78);
      ctx.fill();
    }
  } else {
    // Stylized hair if no helmet
    ctx.fillStyle = hero.classId === 'mage' ? '#e2e8f0' : hero.classId === 'paladin' ? '#fde047' : '#334155';
    ctx.beginPath();
    ctx.arc(-2, -59, 22, Math.PI * 0.9, Math.PI * 2.1);
    ctx.fill();
  }
  ctx.restore();

  // Main Right Arm + Weapon (Sword, Axe, Staff, or Bow!)
  ctx.save();
  ctx.translate(28, -10);
  ctx.rotate(pose === 'attack' ? 0.55 : -0.18);

  // Gauntlet/Glove
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

  ctx.shadowColor = weapon.g;
  ctx.shadowBlur = weapon.has ? 14 : 4;

  if (wCat === 'staff') {
    // Arcane Staff with floating glowing orb!
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(2, 34);
    ctx.lineTo(2, -56);
    ctx.stroke();
    ctx.fillStyle = weapon.p;
    ctx.strokeStyle = weapon.s;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(2, -64, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = weapon.g;
    ctx.beginPath();
    ctx.arc(2, -64, 6, 0, Math.PI * 2);
    ctx.fill();
  } else if (wCat === 'bow') {
    // Curved Fantasy Bow with glowing string!
    ctx.strokeStyle = weapon.p;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(-8, -6, 44, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.stroke();
    ctx.strokeStyle = weapon.g;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-2, -48);
    ctx.lineTo(-2, 36);
    ctx.stroke();
    // Glowing arrow nocked
    ctx.strokeStyle = weapon.s;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-4, -6);
    ctx.lineTo(44, -6);
    ctx.stroke();
  } else if (wCat === 'axe') {
    // Heavy Battleaxe!
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(2, 26);
    ctx.lineTo(2, -60);
    ctx.stroke();
    const axeGrad = ctx.createLinearGradient(0, -64, 34, -28);
    axeGrad.addColorStop(0, weapon.s);
    axeGrad.addColorStop(1, weapon.p);
    ctx.fillStyle = axeGrad;
    ctx.strokeStyle = weapon.g;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(2, -56);
    ctx.quadraticCurveTo(36, -68, 32, -32);
    ctx.quadraticCurveTo(18, -28, 2, -36);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    // Radiant Knight / Warrior Sword!
    ctx.fillStyle = '#d97706';
    ctx.fillRect(-10, -8, 24, 7);
    const bladeGrad = ctx.createLinearGradient(-4, -76, 8, -8);
    bladeGrad.addColorStop(0, weapon.s);
    bladeGrad.addColorStop(0.5, weapon.p);
    bladeGrad.addColorStop(1, '#ffffff');
    ctx.fillStyle = bladeGrad;
    ctx.strokeStyle = weapon.g;
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

  ctx.restore();
  ctx.restore();
}

export function drawEnemyToCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  enemy: EnemyDef
) {
  ctx.clearRect(0, 0, w, h);
  // Düşmana özel şeffaf çizim (yüklendiyse); yoksa/yüklenmediyse arketip çizimi yedek olarak çalışır
  const artKey = enemyArtKey(enemy.id);
  const artImg = artKey ? enemyImage(artKey) : null;
  if (artKey && artImg) {
    drawEnemyArt(ctx, artImg, artKey, w, h);
    return;
  }
  const cx = w * 0.5;
  const cy = h * 0.56;
  const scale = (enemy.isBoss ? 1.15 : 0.92) * (Math.min(w, h) / 240);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  // Ground shadow
  ctx.fillStyle = 'rgba(0,0,0,0.48)';
  ctx.beginPath();
  ctx.ellipse(0, 76, enemy.isBoss ? 68 : 44, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  const arch = enemy.visualArchetype;

  if (arch === 'infernal_dragon') {
    // Huge Fearsome Infernal Dragon!
    ctx.shadowColor = '#f97316';
    ctx.shadowBlur = 22;
    // Wings
    ctx.fillStyle = '#7f1d1d';
    ctx.strokeStyle = '#fb923c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-12, -20);
    ctx.lineTo(-92, -82);
    ctx.lineTo(-76, -12);
    ctx.lineTo(-28, 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(12, -20);
    ctx.lineTo(92, -82);
    ctx.lineTo(76, -12);
    ctx.lineTo(28, 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Armored Dragon Body
    const dg = ctx.createRadialGradient(0, 0, 10, 0, 0, 62);
    dg.addColorStop(0, '#ef4444');
    dg.addColorStop(0.6, '#991b1b');
    dg.addColorStop(1, '#290a0a');
    ctx.fillStyle = dg;
    ctx.beginPath();
    ctx.ellipse(0, 14, 44, 52, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Chest molten scales
    ctx.fillStyle = '#fb923c';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.ellipse(0, -10 + i * 16, 20 - i * 2, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Dragon Head & Horns
    ctx.fillStyle = '#b91c1c';
    ctx.beginPath();
    ctx.moveTo(-26, -34);
    ctx.lineTo(0, -70);
    ctx.lineTo(26, -34);
    ctx.lineTo(14, -12);
    ctx.lineTo(-14, -12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Curved Horns
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.moveTo(-16, -54);
    ctx.lineTo(-42, -92);
    ctx.lineTo(-8, -62);
    ctx.moveTo(16, -54);
    ctx.lineTo(42, -92);
    ctx.lineTo(8, -62);
    ctx.fill();

    // Blazing Eyes
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.ellipse(-10, -40, 6, 3.5, 0.25, 0, Math.PI * 2);
    ctx.ellipse(10, -40, 6, 3.5, -0.25, 0, Math.PI * 2);
    ctx.fill();
  } else if (arch === 'frost_queen') {
    // Majestic Frost Queen with Ice Crown & Cape
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 22;
    // Ice Shard Halo
    ctx.fillStyle = '#7dd3fc';
    for (let i = -3; i <= 3; i++) {
      ctx.save();
      ctx.rotate(i * 0.28);
      ctx.beginPath();
      ctx.moveTo(-6, -42);
      ctx.lineTo(0, -96);
      ctx.lineTo(6, -42);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    // Ice Gown
    const fg = ctx.createLinearGradient(0, -34, 0, 72);
    fg.addColorStop(0, '#bae6fd');
    fg.addColorStop(0.5, '#0284c7');
    fg.addColorStop(1, '#082f49');
    ctx.fillStyle = fg;
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-22, -30);
    ctx.lineTo(22, -30);
    ctx.lineTo(46, 70);
    ctx.lineTo(-46, 70);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Head & Crown
    ctx.fillStyle = '#e0f2fe';
    ctx.beginPath();
    ctx.arc(0, -48, 19, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    ctx.arc(-7, -48, 3, 0, Math.PI * 2);
    ctx.arc(7, -48, 3, 0, Math.PI * 2);
    ctx.fill();

    // Frost Scepter
    ctx.strokeStyle = '#bae6fd';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-36, 56);
    ctx.lineTo(-44, -56);
    ctx.stroke();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(-44, -64, 12, 0, Math.PI * 2);
    ctx.fill();
  } else if (arch === 'forest_guardian' || arch === 'treant') {
    // Ancient Forest Guardian / Treant
    const isBoss = arch === 'forest_guardian';
    ctx.shadowColor = '#22c55e';
    ctx.shadowBlur = isBoss ? 22 : 10;
    ctx.fillStyle = '#5c3a21';
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 3;
    // Trunk & Roots
    ctx.beginPath();
    ctx.moveTo(-34, -40);
    ctx.lineTo(34, -40);
    ctx.lineTo(44, 66);
    ctx.lineTo(14, 52);
    ctx.lineTo(0, 68);
    ctx.lineTo(-14, 52);
    ctx.lineTo(-44, 66);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Massive Leafy Canopy Crown
    ctx.fillStyle = isBoss ? '#15803d' : '#166534';
    for (const [ox, oy, rad] of [
      [-32, -52, 26],
      [32, -52, 26],
      [0, -68, 32],
    ]) {
      ctx.beginPath();
      ctx.arc(ox, oy, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    // Glowing Forest Eyes & Core
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.arc(-12, -26, 6, 0, Math.PI * 2);
    ctx.arc(12, -26, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 8, isBoss ? 14 : 9, 0, Math.PI * 2);
    ctx.fill();
  } else if (arch === 'crystal_titan' || arch === 'ice_golem' || arch === 'stone_sentinel') {
    // Giant Armored Golem / Crystal Titan
    const col =
      arch === 'crystal_titan'
        ? { main: '#7e22ce', rim: '#e879f9', eye: '#fef08a' }
        : arch === 'ice_golem'
          ? { main: '#0369a1', rim: '#7dd3fc', eye: '#e0f2fe' }
          : { main: '#475569', rim: '#a855f7', eye: '#f43f5e' };

    ctx.shadowColor = col.rim;
    ctx.shadowBlur = 18;
    ctx.fillStyle = col.main;
    ctx.strokeStyle = col.rim;
    ctx.lineWidth = 3;

    // Massive Shoulders & Chest
    ctx.beginPath();
    ctx.moveTo(-54, -36);
    ctx.lineTo(0, -66);
    ctx.lineTo(54, -36);
    ctx.lineTo(36, 48);
    ctx.lineTo(-36, 48);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Giant Fists
    ctx.beginPath();
    ctx.roundRect(-72, -16, 26, 44, 6);
    ctx.roundRect(46, -16, 26, 44, 6);
    ctx.fill();
    ctx.stroke();

    // Glowing Crystal Core & Eye Slit
    ctx.fillStyle = col.eye;
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(14, 6);
    ctx.lineTo(0, 26);
    ctx.lineTo(-14, 6);
    ctx.closePath();
    ctx.fill();

    ctx.fillRect(-16, -42, 32, 8);
  } else if (arch === 'shadow_demon' || arch === 'abyssal_king' || arch === 'void_stalker') {
    const isKing = arch === 'abyssal_king';
    ctx.shadowColor = isKing ? '#f43f5e' : '#a855f7';
    ctx.shadowBlur = isKing ? 28 : 16;

    // Dark Void Wings / Cloak
    ctx.fillStyle = isKing ? '#3b0764' : '#1e1b4b';
    ctx.strokeStyle = isKing ? '#fb7185' : '#c084fc';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -48);
    ctx.lineTo(-78, -68);
    ctx.lineTo(-54, 48);
    ctx.lineTo(0, 68);
    ctx.lineTo(54, 48);
    ctx.lineTo(78, -68);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Armored Torso
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.moveTo(-30, -32);
    ctx.lineTo(30, -32);
    ctx.lineTo(20, 44);
    ctx.lineTo(-20, 44);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Crown / Horns
    ctx.fillStyle = isKing ? '#fbbf24' : '#c084fc';
    ctx.beginPath();
    ctx.moveTo(-22, -52);
    ctx.lineTo(-34, -92);
    ctx.lineTo(-8, -64);
    ctx.lineTo(0, -96);
    ctx.lineTo(8, -64);
    ctx.lineTo(34, -92);
    ctx.lineTo(22, -52);
    ctx.closePath();
    ctx.fill();

    // Glowing Demon Eyes
    ctx.fillStyle = isKing ? '#f43f5e' : '#e879f9';
    ctx.beginPath();
    ctx.ellipse(-10, -44, 7, 3.5, 0.3, 0, Math.PI * 2);
    ctx.ellipse(10, -44, 7, 3.5, -0.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (arch === 'fire_elemental' || arch === 'salamander') {
    ctx.shadowColor = '#f97316';
    ctx.shadowBlur = 18;
    const fg = ctx.createRadialGradient(0, 0, 8, 0, 0, 56);
    fg.addColorStop(0, '#fef08a');
    fg.addColorStop(0.5, '#f97316');
    fg.addColorStop(1, '#991b1b');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.moveTo(0, -76);
    ctx.quadraticCurveTo(54, -18, 32, 54);
    ctx.lineTo(0, 40);
    ctx.lineTo(-32, 54);
    ctx.quadraticCurveTo(-54, -18, 0, -76);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-11, -18, 5, 0, Math.PI * 2);
    ctx.arc(11, -18, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (arch === 'celestial') {
    // Kanatlı göksel varlık (Gök Tiranı, Ay Matronu, Astral Yutucu)
    ctx.shadowColor = '#c4b5fd';
    ctx.shadowBlur = 26;
    // Işık kanatları
    ctx.fillStyle = 'rgba(196,181,253,0.85)';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    for (const dir of [-1, 1]) {
      for (let f = 0; f < 3; f++) {
        ctx.beginPath();
        ctx.moveTo(dir * 14, -18 + f * 12);
        ctx.quadraticCurveTo(dir * (72 + f * 12), -58 + f * 26, dir * (46 + f * 8), 26 + f * 8);
        ctx.quadraticCurveTo(dir * 34, 6, dir * 14, -6 + f * 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
    // Zırhlı gövde
    const cg = ctx.createLinearGradient(0, -56, 0, 66);
    cg.addColorStop(0, '#f5f3ff');
    cg.addColorStop(0.45, '#a78bfa');
    cg.addColorStop(1, '#312e81');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.moveTo(-26, -44);
    ctx.lineTo(26, -44);
    ctx.lineTo(38, 40);
    ctx.lineTo(0, 66);
    ctx.lineTo(-38, 40);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Baş & hale
    ctx.fillStyle = '#ede9fe';
    ctx.beginPath();
    ctx.arc(0, -58, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, -80, 26, 8, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-6, -58, 3.4, 0, Math.PI * 2);
    ctx.arc(6, -58, 3.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (arch === 'leviathan') {
    // Deniz canavarı / Hidra: çok başlı yılan gövde
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 22;
    // Kıvrımlı gövde
    const lg = ctx.createLinearGradient(-60, -40, 60, 70);
    lg.addColorStop(0, '#0e7490');
    lg.addColorStop(0.5, '#155e75');
    lg.addColorStop(1, '#082f49');
    ctx.fillStyle = lg;
    ctx.strokeStyle = '#67e8f9';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-46, 62);
    ctx.quadraticCurveTo(-62, 6, -18, -12);
    ctx.quadraticCurveTo(28, -30, 44, 12);
    ctx.quadraticCurveTo(54, 50, 20, 64);
    ctx.quadraticCurveTo(-8, 72, -46, 62);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Yüzgeçler
    ctx.fillStyle = 'rgba(103,232,249,0.75)';
    for (const [ox, oy, sx] of [
      [-40, -18, -1],
      [40, -14, 1],
      [0, -46, 1],
    ]) {
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox + 26 * sx, oy - 30);
      ctx.lineTo(ox + 6 * sx, oy + 6);
      ctx.closePath();
      ctx.fill();
    }
    // Üç yılan başı
    for (const [hx, hy, rot] of [
      [-26, -34, -0.35],
      [0, -52, 0],
      [26, -34, 0.35],
    ]) {
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(rot);
      ctx.fillStyle = '#0891b2';
      ctx.beginPath();
      ctx.moveTo(-13, 8);
      ctx.lineTo(0, -24);
      ctx.lineTo(13, 8);
      ctx.lineTo(0, 16);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#a5f3fc';
      ctx.stroke();
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(-5, -6, 3, 0, Math.PI * 2);
      ctx.arc(5, -6, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else if (arch === 'pharaoh') {
    // Firavun / Rün İmparatoru: başlıklı, asalı hükümdar
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 24;
    // Uzun kaftan
    const pg = ctx.createLinearGradient(0, -50, 0, 72);
    pg.addColorStop(0, '#fcd34d');
    pg.addColorStop(0.5, '#b45309');
    pg.addColorStop(1, '#1c1917');
    ctx.fillStyle = pg;
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-24, -38);
    ctx.lineTo(24, -38);
    ctx.lineTo(48, 70);
    ctx.lineTo(-48, 70);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Göğüs kolyesi
    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    ctx.moveTo(-22, -34);
    ctx.quadraticCurveTo(0, -8, 22, -34);
    ctx.quadraticCurveTo(0, -22, -22, -34);
    ctx.fill();
    // Nemes başlığı
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(-30, -44);
    ctx.lineTo(30, -44);
    ctx.lineTo(24, -78);
    ctx.quadraticCurveTo(0, -96, -24, -78);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#1e293b';
    for (let i = -2; i <= 2; i++) {
      ctx.fillRect(i * 11 - 2.5, -76, 5, 32);
    }
    // Yüz
    ctx.fillStyle = '#d6b98c';
    ctx.beginPath();
    ctx.roundRect(-13, -62, 26, 24, 8);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-9, -54, 7, 3.5);
    ctx.fillRect(2, -54, 7, 3.5);
    // Asa & kamçı
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-38, 54);
    ctx.lineTo(-32, -30);
    ctx.moveTo(38, 54);
    ctx.lineTo(32, -26);
    ctx.lineTo(48, -40);
    ctx.stroke();
  } else if (arch === 'reaper') {
    // Azrail / Kaos İmparatoru: pelerinli, tırpanlı ölüm
    ctx.shadowColor = '#f43f5e';
    ctx.shadowBlur = 28;
    // Yırtık pelerin
    const rg = ctx.createLinearGradient(0, -60, 0, 74);
    rg.addColorStop(0, '#312e81');
    rg.addColorStop(0.55, '#0f0a1e');
    rg.addColorStop(1, '#000000');
    ctx.fillStyle = rg;
    ctx.strokeStyle = '#fb7185';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, -74);
    ctx.quadraticCurveTo(-52, -48, -46, 40);
    ctx.lineTo(-30, 30);
    ctx.lineTo(-22, 56);
    ctx.lineTo(-6, 34);
    ctx.lineTo(0, 62);
    ctx.lineTo(8, 34);
    ctx.lineTo(24, 56);
    ctx.lineTo(32, 30);
    ctx.lineTo(46, 40);
    ctx.quadraticCurveTo(52, -48, 0, -74);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Boşluk baş & göz alevleri
    ctx.fillStyle = '#09090b';
    ctx.beginPath();
    ctx.ellipse(0, -46, 17, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.ellipse(-6, -48, 4.4, 2.6, -0.3, 0, Math.PI * 2);
    ctx.ellipse(6, -48, 4.4, 2.6, 0.3, 0, Math.PI * 2);
    ctx.fill();
    // Tırpan
    ctx.strokeStyle = '#a8a29e';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(34, 64);
    ctx.lineTo(52, -66);
    ctx.stroke();
    const blade = ctx.createLinearGradient(10, -84, 56, -56);
    blade.addColorStop(0, '#f8fafc');
    blade.addColorStop(1, '#fb7185');
    ctx.fillStyle = blade;
    ctx.beginPath();
    ctx.moveTo(52, -66);
    ctx.quadraticCurveTo(16, -84, 2, -52);
    ctx.quadraticCurveTo(24, -66, 48, -58);
    ctx.closePath();
    ctx.fill();
    // Ruh alevleri
    ctx.fillStyle = 'rgba(94,234,212,0.75)';
    for (const [sx, sy, sr] of [
      [-40, -12, 6],
      [42, -4, 5],
      [-24, 26, 4],
    ]) {
      ctx.beginPath();
      ctx.moveTo(sx, sy - sr * 2);
      ctx.quadraticCurveTo(sx + sr, sy, sx, sy + sr);
      ctx.quadraticCurveTo(sx - sr, sy, sx, sy - sr * 2);
      ctx.fill();
    }
  } else if (arch === 'warlord') {
    // Savaş Lordu: boynuzlu taçlı dev zırhlı savaşçı
    ctx.shadowColor = '#f97316';
    ctx.shadowBlur = 22;
    const wg = ctx.createLinearGradient(-52, -60, 52, 70);
    wg.addColorStop(0, '#7f1d1d');
    wg.addColorStop(0.45, '#450a0a');
    wg.addColorStop(1, '#111827');
    ctx.fillStyle = wg;
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    // Dev omuzluklar
    ctx.beginPath();
    ctx.arc(-40, -22, 22, 0, Math.PI * 2);
    ctx.arc(40, -22, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Gövde
    ctx.beginPath();
    ctx.moveTo(-30, -34);
    ctx.lineTo(30, -34);
    ctx.lineTo(40, 44);
    ctx.lineTo(16, 68);
    ctx.lineTo(-16, 68);
    ctx.lineTo(-40, 44);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Göğüs alevi
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(12, 4);
    ctx.lineTo(0, 26);
    ctx.lineTo(-12, 4);
    ctx.closePath();
    ctx.fill();
    // Miğfer + boynuzlu taç
    ctx.fillStyle = '#1f2937';
    ctx.beginPath();
    ctx.roundRect(-19, -70, 38, 34, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(-18, -62);
    ctx.lineTo(-44, -96);
    ctx.lineTo(-22, -70);
    ctx.lineTo(0, -104);
    ctx.lineTo(22, -70);
    ctx.lineTo(44, -96);
    ctx.lineTo(18, -62);
    ctx.closePath();
    ctx.fill();
    // Parlayan gözler
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-12, -58, 9, 4);
    ctx.fillRect(3, -58, 9, 4);
    // Dev kılıç
    ctx.strokeStyle = '#a8a29e';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(44, 40);
    ctx.lineTo(64, -58);
    ctx.stroke();
    const sword = ctx.createLinearGradient(50, -84, 82, -20);
    sword.addColorStop(0, '#e2e8f0');
    sword.addColorStop(1, '#f97316');
    ctx.fillStyle = sword;
    ctx.beginPath();
    ctx.moveTo(64, -58);
    ctx.lineTo(76, -84);
    ctx.lineTo(84, -40);
    ctx.lineTo(70, -22);
    ctx.closePath();
    ctx.fill();
  } else {
    // Goblin / Wolf / Yeti stylized creature
    const col =
      arch === 'goblin'
        ? '#16a34a'
        : arch === 'yeti'
          ? '#bae6fd'
          : '#475569';
    ctx.fillStyle = col;
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 12, 34, 42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Head + Pointed Ears
    ctx.beginPath();
    ctx.arc(0, -34, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-20, -44);
    ctx.lineTo(-42, -62);
    ctx.lineTo(-16, -26);
    ctx.moveTo(20, -44);
    ctx.lineTo(42, -62);
    ctx.lineTo(16, -26);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(-9, -36, 4.5, 0, Math.PI * 2);
    ctx.arc(9, -36, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/** Ekipman yükseltme seviyelerinden benzersiz anahtar — aura değişince doku yenilenir */
function heroAuraKey(hero: HeroProgress): string {
  const ups = Object.values(hero.equipped)
    .filter(Boolean)
    .map((i) => (i as { upgradeLevel: number }).upgradeLevel)
    .join('-');
  return ups || 'none';
}

/**
 * Yeni nesil kahraman dokusu — HeroRenderer üzerinden çizilir.
 * 8 sınıfın özgün modeli + ekipman + kademeli büyü aurası dahil.
 * `time` sabitlenerek aura en parlak anında "donmuş" halde pişirilir;
 * savaş sahnesinde ayrıca canlı, nabız gibi atan bir aura katmanı çizilir.
 */
export function createHeroPhaserTexture(
  scene: Phaser.Scene,
  hero: HeroProgress,
  pose: 'idle' | 'attack',
  /** true: çizim yerine eski vektör çizimi (Rhogar'ın Ejder Formu) */
  procedural = false
): string {
  const key = `hero_tex_${hero.classId}_${pose}_${heroAuraKey(hero)}${procedural ? '_form' : ''}`;
  if (scene.textures.exists(key)) {
    scene.textures.remove(key);
  }
  const tex = scene.textures.createCanvas(key, HERO_TEX_SIZE, HERO_TEX_SIZE);
  if (tex) {
    // Sınıf renkli parlama savaş sahnesinde canlı çizilir; dokuya gömülmez
    drawHeroScene(tex.getContext(), HERO_TEX_SIZE, HERO_TEX_SIZE, hero, pose, 0.6, procedural, true);
    tex.refresh();
  }
  return key;
}

/** Sola dönük çizimi ayak/kök çizgisi zemin çizgisine oturacak şekilde, oranı koruyarak çizer. */
function drawEnemyArt(ctx: CanvasRenderingContext2D, img: HTMLImageElement, key: EnemyArtKey, w: number, h: number) {
  const L = ENEMY_ART_LAYOUT[key];
  const m = ENEMY_ART_META[key];
  const aspect = img.naturalWidth / img.naturalHeight;
  let dh = L.height * h;
  let dw = dh * aspect;
  if (dw > L.maxWidth * w) {
    dw = L.maxWidth * w;
    dh = dw / aspect;
  }
  const ground = ENEMY_ART_GROUND * h;
  ctx.fillStyle = 'rgba(0,0,0,0.42)';
  ctx.beginPath();
  ctx.ellipse(w / 2, ground + h * 0.012, Math.min(dw * 0.4, w * 0.36), h * 0.04, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = h * 0.03;
  ctx.drawImage(img, w / 2 - dw / 2, ground - dh * m.footFrac, dw, dh);
  ctx.restore();
}

export function createEnemyPhaserTexture(scene: Phaser.Scene, enemy: EnemyDef): string {
  const key = `enemy_tex_${enemy.id}`;
  if (scene.textures.exists(key)) {
    scene.textures.remove(key);
  }
  const size = enemy.isBoss ? 300 : 240;
  const tex = scene.textures.createCanvas(key, size, size);
  if (tex) {
    drawEnemyToCanvas(tex.getContext(), size, size, enemy);
    tex.refresh();
  }
  return key;
}
