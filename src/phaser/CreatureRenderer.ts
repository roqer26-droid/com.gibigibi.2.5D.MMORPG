import { CreatureClassId, HeroProgress, ItemCategory } from '../types/game';
import {
  auraGlowFor,
  drawOffhand,
  drawWeapon,
  EnchantAura,
  gear,
  itemGlow,
} from './HeroRenderer';

/** Bir fantastik yaratığın görsel tarifi — tek parametrik çizici hepsini üretir */
export interface CreatureSpec {
  skin: string;
  p: string;
  s: string;
  accent: string;
  lower: 'legs' | 'hooves' | 'robe' | 'serpent' | 'fish' | 'smoke';
  bulk?: number;
  size?: number;
  hover?: boolean;
  wings?: 'bat' | 'feather' | 'fairy' | 'flame';
  horns?: 'devil' | 'bull' | 'crystal';
  ears?: 'elf' | 'fox' | 'wolf' | 'fin';
  tail?: 'fox' | 'wolf' | 'devil';
  tails?: number;
  face: 'human' | 'muzzle' | 'stone' | 'mask';
  hair?: string;
  crown?: 'halo' | 'turban' | 'crest' | 'hood' | 'tiara' | 'flower';
  fangs?: boolean;
  particles: 'embers' | 'bubbles' | 'leaves' | 'stars' | 'feathers' | 'shards' | 'blood' | 'fog';
  weapon: ItemCategory;
  offhand: ItemCategory;
}

export const CREATURE_SPECS: Record<CreatureClassId, CreatureSpec> = {
  vampire: {
    skin: '#e5e7eb', p: '#4c0519', s: '#be123c', accent: '#fb7185', lower: 'legs',
    wings: 'bat', ears: 'elf', face: 'human', hair: '#0f172a', fangs: true,
    particles: 'blood', weapon: 'sword', offhand: 'cloak',
  },
  werewolf: {
    skin: '#78716c', p: '#44403c', s: '#a8a29e', accent: '#fde047', lower: 'legs', bulk: 1.15,
    ears: 'wolf', tail: 'wolf', face: 'muzzle', fangs: true,
    particles: 'fog', weapon: 'axe', offhand: 'cloak',
  },
  fairy: {
    skin: '#fde2cf', p: '#be185d', s: '#f9a8d4', accent: '#f0abfc', lower: 'robe', bulk: 0.85,
    size: 0.86, hover: true, wings: 'fairy', ears: 'elf', face: 'human', hair: '#fbcfe8',
    crown: 'flower', particles: 'leaves', weapon: 'staff', offhand: 'tome',
  },
  kitsune: {
    skin: '#fde2cf', p: '#9a3412', s: '#fdba74', accent: '#fb923c', lower: 'robe',
    ears: 'fox', tail: 'fox', tails: 9, face: 'mask', hair: '#f8fafc',
    particles: 'stars', weapon: 'dagger', offhand: 'cloak',
  },
  naga: {
    skin: '#86efac', p: '#14532d', s: '#a3e635', accent: '#facc15', lower: 'serpent',
    face: 'human', fangs: true, crown: 'hood',
    particles: 'bubbles', weapon: 'dagger', offhand: 'skull',
  },
  siren: {
    skin: '#a5f3fc', p: '#0e7490', s: '#22d3ee', accent: '#5eead4', lower: 'fish',
    ears: 'fin', face: 'human', hair: '#0d9488', crown: 'tiara',
    particles: 'bubbles', weapon: 'spear', offhand: 'tome',
  },
  minotaur: {
    skin: '#92400e', p: '#451a03', s: '#d6d3d1', accent: '#ef4444', lower: 'hooves', bulk: 1.3,
    size: 1.06, horns: 'bull', tail: 'devil', face: 'muzzle',
    particles: 'fog', weapon: 'axe', offhand: 'shield',
  },
  golem: {
    skin: '#64748b', p: '#334155', s: '#22d3ee', accent: '#67e8f9', lower: 'legs', bulk: 1.3,
    size: 1.06, horns: 'crystal', face: 'stone',
    particles: 'shards', weapon: 'axe', offhand: 'shield',
  },
  phoenix: {
    skin: '#fed7aa', p: '#b91c1c', s: '#fb923c', accent: '#fde047', lower: 'robe', hover: true,
    wings: 'flame', face: 'human', hair: '#f97316', crown: 'crest',
    particles: 'embers', weapon: 'staff', offhand: 'tome',
  },
  djinn: {
    skin: '#60a5fa', p: '#4338ca', s: '#fbbf24', accent: '#a78bfa', lower: 'smoke', bulk: 1.1,
    hover: true, ears: 'elf', face: 'human', crown: 'turban',
    particles: 'stars', weapon: 'staff', offhand: 'tome',
  },
  demon: {
    skin: '#b91c1c', p: '#1c1917', s: '#7f1d1d', accent: '#f97316', lower: 'hooves', bulk: 1.15,
    wings: 'bat', horns: 'devil', tail: 'devil', face: 'human', fangs: true,
    particles: 'embers', weapon: 'scythe', offhand: 'skull',
  },
  seraph: {
    skin: '#fef3c7', p: '#f8fafc', s: '#fde047', accent: '#fbbf24', lower: 'robe',
    wings: 'feather', face: 'human', hair: '#fde68a', crown: 'halo',
    particles: 'feathers', weapon: 'sword', offhand: 'shield',
  },
};

const TAU = Math.PI * 2;

export function drawCreature(
  ctx: CanvasRenderingContext2D,
  hero: HeroProgress,
  pose: 'idle' | 'attack',
  time: number,
  aura: EnchantAura,
  sp: CreatureSpec
) {
  const helm = gear(hero, 'helmet', sp.p, sp.s, sp.accent);
  const chest = gear(hero, 'chest', sp.p, sp.s, sp.accent);
  const gloves = gear(hero, 'gloves', sp.skin, sp.s, sp.accent);
  const pants = gear(hero, 'pants', sp.p, sp.s, sp.accent);
  const boots = gear(hero, 'boots', '#1f2937', sp.s, sp.accent);
  const weapon = gear(hero, 'weapon', sp.p, sp.s, sp.accent);
  const offhand = gear(hero, 'offhand', sp.p, sp.s, sp.accent);
  const B = sp.bulk ?? 1;
  const flap = Math.sin(time * 1.6) * 5;
  const sway = Math.sin(time * 1.5) * 4;

  ctx.save();
  // Boyut (ayak tabanından) ve havada süzülme
  ctx.translate(0, 74);
  ctx.scale(sp.size ?? 1, sp.size ?? 1);
  ctx.translate(0, -74);
  if (sp.hover) ctx.translate(0, -8 + Math.sin(time * 2.2) * 3);

  /* ---------- Kanatlar ---------- */
  if (sp.wings) {
    ctx.save();
    ctx.shadowColor = sp.accent;
    ctx.shadowBlur = 10 + aura.tier * 3;
    for (const dir of [-1, 1]) {
      ctx.save();
      ctx.scale(dir, 1);
      if (sp.wings === 'bat') {
        ctx.fillStyle = sp.p;
        ctx.strokeStyle = sp.accent;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(12, -30);
        ctx.quadraticCurveTo(60 + flap, -82 - flap, 88 + flap, -36);
        ctx.quadraticCurveTo(72, -24, 78 + flap, 4);
        ctx.quadraticCurveTo(56, -8, 54, 22);
        ctx.quadraticCurveTo(34, 0, 12, 10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (sp.wings === 'feather') {
        for (let f = 0; f < 4; f++) {
          ctx.fillStyle = f % 2 ? sp.s : '#ffffff';
          ctx.strokeStyle = sp.accent;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(12, -26 + f * 9);
          ctx.quadraticCurveTo(70 + flap - f * 6, -84 + f * 24 - flap, 92 - f * 12 + flap, -30 + f * 20);
          ctx.quadraticCurveTo(50, -10 + f * 12, 12, -14 + f * 9);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      } else if (sp.wings === 'fairy') {
        ctx.globalAlpha = 0.62;
        ctx.fillStyle = sp.s;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.ellipse(40 + flap * 0.6, -44, 34, 17, -0.6, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(34 + flap * 0.4, -8, 24, 12, 0.5, 0, TAU);
        ctx.fill();
        ctx.stroke();
      } else {
        for (let f = 0; f < 5; f++) {
          ctx.fillStyle = f % 2 ? '#fde047' : sp.s;
          ctx.globalAlpha = 0.85;
          const len = 86 - f * 10 + flap;
          const ang = -1.0 + f * 0.34;
          ctx.beginPath();
          ctx.moveTo(10, -22);
          ctx.quadraticCurveTo(
            Math.cos(ang) * len * 0.6 + 14,
            Math.sin(ang) * len * 0.6 - 34,
            Math.cos(ang) * len,
            Math.sin(ang) * len - 20
          );
          ctx.quadraticCurveTo(Math.cos(ang) * len * 0.5, Math.sin(ang) * len * 0.5 - 4, 10, -8);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.restore();
    }
    ctx.restore();
  }

  /* ---------- Kuyruk(lar) ---------- */
  if (sp.tail) {
    const n = sp.tails ?? 1;
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const spread = n > 1 ? (i / (n - 1) - 0.5) * 1.5 : 0;
      const sw = Math.sin(time * 1.8 + i) * 6;
      const tx = -40 - 34 * Math.cos(spread) + sw * 0.5;
      const ty = 20 - 70 * Math.sin(spread + 0.5) + sw;
      if (sp.tail === 'devil') {
        ctx.strokeStyle = sp.skin;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(-10, 28);
        ctx.quadraticCurveTo(-46, 46, tx, ty);
        ctx.stroke();
        ctx.fillStyle = sp.accent;
        ctx.beginPath();
        ctx.moveTo(tx, ty - 9);
        ctx.lineTo(tx - 9, ty + 3);
        ctx.lineTo(tx + 6, ty + 5);
        ctx.closePath();
        ctx.fill();
      } else {
        const fox = sp.tail === 'fox';
        ctx.strokeStyle = fox ? sp.s : sp.skin;
        ctx.lineWidth = fox ? (n > 1 ? 9 : 13) : 11;
        ctx.beginPath();
        ctx.moveTo(-10, 30);
        ctx.quadraticCurveTo(-44, 40, tx, ty);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(tx, ty, fox ? (n > 1 ? 5 : 7) : 5, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  /* ---------- Alt gövde ---------- */
  ctx.save();
  ctx.lineWidth = 2.2;
  if (sp.lower === 'legs' || sp.lower === 'hooves') {
    const hoof = sp.lower === 'hooves';
    ctx.fillStyle = hoof && !pants.has ? sp.skin : pants.p;
    ctx.strokeStyle = pants.s;
    ctx.beginPath();
    ctx.roundRect(-19 * B, 18, 15 * B, 36, 5);
    ctx.roundRect(4 * B, 18, 15 * B, 36, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = hoof && !boots.has ? '#1c1917' : boots.p;
    ctx.strokeStyle = boots.s;
    ctx.beginPath();
    ctx.roundRect(-22 * B, 48, 19 * B, 20, hoof ? 3 : 6);
    ctx.roundRect(3 * B, 48, 20 * B, 20, hoof ? 3 : 6);
    ctx.fill();
    ctx.stroke();
  } else if (sp.lower === 'robe') {
    const rg = ctx.createLinearGradient(0, 14, 0, 70);
    rg.addColorStop(0, chest.p);
    rg.addColorStop(1, '#0b0f1a');
    ctx.fillStyle = rg;
    ctx.strokeStyle = chest.s;
    ctx.beginPath();
    ctx.moveTo(-19 * B, 16);
    ctx.lineTo(19 * B, 16);
    ctx.lineTo(34 * B, 62);
    ctx.lineTo(18, 70);
    ctx.lineTo(0, 60);
    ctx.lineTo(-18, 70);
    ctx.lineTo(-34 * B, 62);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (sp.lower === 'serpent' || sp.lower === 'fish') {
    const col = pants.has ? pants.p : sp.p;
    ctx.lineCap = 'round';
    ctx.strokeStyle = col;
    ctx.lineWidth = 27;
    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.quadraticCurveTo(-26, 46, 2, 58);
    ctx.stroke();
    ctx.lineWidth = 17;
    ctx.beginPath();
    ctx.moveTo(2, 58);
    ctx.quadraticCurveTo(34, 72, 54 + sway, 54);
    ctx.stroke();
    // Karın pulları
    ctx.strokeStyle = sp.s;
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(-6 + i * 3, 26 + i * 9, 7, Math.PI * 0.1, Math.PI * 0.9);
      ctx.stroke();
    }
    ctx.fillStyle = sp.accent;
    ctx.beginPath();
    if (sp.lower === 'fish') {
      ctx.moveTo(52 + sway, 54);
      ctx.lineTo(76 + sway, 36);
      ctx.lineTo(66 + sway, 54);
      ctx.lineTo(78 + sway, 70);
    } else {
      ctx.moveTo(50 + sway, 48);
      ctx.lineTo(70 + sway, 42);
      ctx.lineTo(56 + sway, 60);
    }
    ctx.closePath();
    ctx.fill();
  } else {
    // Duman (cin)
    const sg = ctx.createLinearGradient(0, 14, 0, 78);
    sg.addColorStop(0, sp.accent);
    sg.addColorStop(1, 'rgba(167,139,250,0)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.moveTo(-20 * B, 16);
    ctx.lineTo(20 * B, 16);
    ctx.quadraticCurveTo(24, 46, 6 + sway, 58);
    ctx.quadraticCurveTo(-6, 66, -2 + sway, 78);
    ctx.quadraticCurveTo(-18, 60, -14, 44);
    ctx.quadraticCurveTo(-24, 30, -20 * B, 16);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  /* ---------- Gövde ---------- */
  ctx.save();
  const cg = ctx.createLinearGradient(-26 * B, -36, 26 * B, 24);
  cg.addColorStop(0, chest.s);
  cg.addColorStop(0.4, chest.p);
  cg.addColorStop(1, '#0b0f1a');
  ctx.fillStyle = cg;
  ctx.strokeStyle = chest.s;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = auraGlowFor(chest);
  ctx.shadowBlur = itemGlow(chest.up, 6);
  ctx.beginPath();
  ctx.moveTo(-24 * B, -34);
  ctx.lineTo(24 * B, -34);
  ctx.lineTo(18 * B, 22);
  ctx.lineTo(-18 * B, 22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Omuzlar
  ctx.fillStyle = chest.p;
  ctx.beginPath();
  ctx.arc(-25 * B, -28, 11 * B, 0, TAU);
  ctx.arc(25 * B, -28, 11 * B, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // Göğüs nüvesi
  ctx.fillStyle = sp.accent;
  ctx.shadowColor = sp.accent;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(7, -7);
  ctx.lineTo(0, 2);
  ctx.lineTo(-7, -7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  /* ---------- Sol kol + ikinci el ---------- */
  ctx.save();
  ctx.fillStyle = gloves.p;
  ctx.strokeStyle = gloves.s;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-22 * B - 13, -18, 13, 28, 6);
  ctx.fill();
  ctx.stroke();
  ctx.translate(0, Math.sin(time * 1.9) * 2.5);
  drawOffhand(ctx, offhand.cat, offhand, sp.offhand);
  ctx.restore();

  /* ---------- Baş ---------- */
  const hr = 19 * Math.min(B, 1.12);
  const hy = -56;
  const crownCol = helm.has ? helm.p : sp.s;
  const crownEdge = helm.has ? helm.s : sp.accent;
  ctx.save();
  ctx.shadowColor = auraGlowFor(helm);
  ctx.shadowBlur = itemGlow(helm.up, 0);
  ctx.lineWidth = 2;

  if (sp.crown === 'hood') {
    ctx.fillStyle = crownCol;
    ctx.strokeStyle = crownEdge;
    ctx.beginPath();
    ctx.moveTo(0, hy - 34);
    ctx.quadraticCurveTo(46, hy - 26, 36, hy + 22);
    ctx.quadraticCurveTo(0, hy + 34, -36, hy + 22);
    ctx.quadraticCurveTo(-46, hy - 26, 0, hy - 34);
    ctx.fill();
    ctx.stroke();
  }

  if (sp.ears) {
    for (const dir of [-1, 1]) {
      ctx.fillStyle = sp.ears === 'fin' ? sp.accent : sp.hair ?? sp.skin;
      ctx.strokeStyle = sp.s;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      if (sp.ears === 'fox' || sp.ears === 'wolf') {
        const eh = sp.ears === 'fox' ? 30 : 22;
        ctx.moveTo(dir * 5, hy - 14);
        ctx.lineTo(dir * 19, hy - 14 - eh);
        ctx.lineTo(dir * 23, hy - 5);
      } else if (sp.ears === 'elf') {
        ctx.moveTo(dir * (hr - 4), hy - 6);
        ctx.lineTo(dir * (hr + 17), hy - 14);
        ctx.lineTo(dir * (hr - 2), hy + 4);
      } else {
        ctx.moveTo(dir * (hr - 4), hy - 8);
        ctx.lineTo(dir * (hr + 16), hy - 18);
        ctx.lineTo(dir * (hr + 11), hy - 4);
        ctx.lineTo(dir * (hr + 17), hy + 8);
        ctx.lineTo(dir * (hr - 3), hy + 5);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  if (sp.horns) {
    ctx.fillStyle = sp.horns === 'crystal' ? sp.accent : '#fde68a';
    ctx.strokeStyle = crownEdge;
    ctx.lineWidth = 1.6;
    if (sp.horns === 'crystal') {
      for (const i of [-1, 0, 1]) {
        ctx.beginPath();
        ctx.moveTo(i * 11 - 5, hy - hr + 3);
        ctx.lineTo(i * 13, hy - hr - 18 - (i === 0 ? 10 : 0));
        ctx.lineTo(i * 11 + 5, hy - hr + 3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else {
      for (const dir of [-1, 1]) {
        ctx.beginPath();
        if (sp.horns === 'devil') {
          ctx.moveTo(dir * 8, hy - hr + 2);
          ctx.quadraticCurveTo(dir * 30, hy - hr - 10, dir * 20, hy - hr - 30);
          ctx.quadraticCurveTo(dir * 18, hy - hr - 10, dir * 15, hy - hr + 6);
        } else {
          ctx.moveTo(dir * (hr - 4), hy - 8);
          ctx.quadraticCurveTo(dir * (hr + 26), hy - 6, dir * (hr + 22), hy - 34);
          ctx.quadraticCurveTo(dir * (hr + 12), hy - 14, dir * (hr - 6), hy + 2);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
  }

  // Kafa
  ctx.fillStyle = sp.skin;
  ctx.beginPath();
  if (sp.face === 'stone') ctx.roundRect(-hr, hy - hr, hr * 2, hr * 2, 6);
  else ctx.arc(0, hy, hr, 0, TAU);
  ctx.fill();
  if (sp.face === 'stone') {
    ctx.strokeStyle = sp.s;
    ctx.stroke();
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-hr + 4, hy + 8);
    ctx.lineTo(-4, hy + 3);
    ctx.lineTo(2, hy + 12);
    ctx.stroke();
  }

  if (sp.hair) {
    ctx.fillStyle = sp.hair;
    ctx.beginPath();
    ctx.arc(0, hy - 3, hr + 1.5, Math.PI * 0.95, Math.PI * 2.05);
    ctx.fill();
  }

  // Yüz
  ctx.shadowColor = sp.accent;
  ctx.shadowBlur = 10;
  if (sp.face === 'muzzle') {
    ctx.shadowBlur = 0;
    ctx.fillStyle = sp.s;
    ctx.beginPath();
    ctx.ellipse(6, hy + 7, 11, 7.5, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#0c0a09';
    ctx.beginPath();
    ctx.arc(13, hy + 4, 2.8, 0, TAU);
    ctx.fill();
    if (sp.fangs) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(4, hy + 11);
      ctx.lineTo(6, hy + 17);
      ctx.lineTo(8, hy + 11);
      ctx.moveTo(10, hy + 11);
      ctx.lineTo(12, hy + 16);
      ctx.lineTo(14, hy + 11);
      ctx.fill();
    }
    ctx.shadowBlur = 10;
    ctx.fillStyle = sp.accent;
    ctx.beginPath();
    ctx.ellipse(-3, hy - 4, 4, 2.3, -0.3, 0, TAU);
    ctx.ellipse(10, hy - 4, 4, 2.3, 0.3, 0, TAU);
    ctx.fill();
  } else if (sp.face === 'stone') {
    ctx.fillStyle = sp.accent;
    ctx.fillRect(-11, hy - 5, 8, 4);
    ctx.fillRect(3, hy - 5, 8, 4);
  } else if (sp.face === 'mask') {
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(2, hy + 1, hr - 3, hr - 5, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-9, hy - 6);
    ctx.lineTo(-2, hy - 3);
    ctx.moveTo(13, hy - 6);
    ctx.lineTo(6, hy - 3);
    ctx.moveTo(-8, hy + 6);
    ctx.lineTo(-3, hy + 9);
    ctx.moveTo(12, hy + 6);
    ctx.lineTo(7, hy + 9);
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(2, hy + 5, 1.8, 0, TAU);
    ctx.fill();
  } else {
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(4, hy, 4, 3, 0, 0, TAU);
    ctx.ellipse(13, hy, 3.4, 2.8, 0, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 8;
    ctx.fillStyle = sp.accent;
    ctx.beginPath();
    ctx.arc(5, hy, 2, 0, TAU);
    ctx.arc(13.5, hy, 1.8, 0, TAU);
    ctx.fill();
    if (sp.fangs) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(4, hy + 9);
      ctx.lineTo(6, hy + 14);
      ctx.lineTo(8, hy + 9);
      ctx.moveTo(10, hy + 9);
      ctx.lineTo(12, hy + 14);
      ctx.lineTo(14, hy + 9);
      ctx.fill();
    }
  }

  // Başlık / taç — miğfer ekipmanının renklerini alır
  ctx.shadowColor = auraGlowFor(helm);
  ctx.shadowBlur = itemGlow(helm.up, 4);
  if (sp.crown === 'halo') {
    ctx.strokeStyle = helm.has ? helm.g : '#fde047';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.ellipse(0, hy - hr - 9, 17, 5, 0, 0, TAU);
    ctx.stroke();
  } else if (sp.crown === 'turban') {
    ctx.fillStyle = crownCol;
    ctx.strokeStyle = crownEdge;
    ctx.beginPath();
    ctx.arc(0, hy - 7, hr + 3, Math.PI * 1.02, Math.PI * 1.98);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = sp.accent;
    ctx.beginPath();
    ctx.arc(0, hy - hr - 1, 4.4, 0, TAU);
    ctx.fill();
  } else if (sp.crown === 'crest') {
    for (const i of [-1, 0, 1]) {
      const top = hy - hr - 28 - (i === 0 ? 10 : 0) + flap * 0.4;
      ctx.fillStyle = i === 0 ? '#fde047' : crownEdge;
      ctx.beginPath();
      ctx.moveTo(i * 8 - 4, hy - hr + 4);
      ctx.quadraticCurveTo(i * 14, top + 6, i * 10 + 2, top);
      ctx.quadraticCurveTo(i * 8 + 8, hy - hr - 8, i * 8 + 4, hy - hr + 4);
      ctx.fill();
    }
  } else if (sp.crown === 'tiara') {
    ctx.strokeStyle = crownEdge;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, hy, hr + 1, Math.PI * 1.2, Math.PI * 1.8);
    ctx.stroke();
    ctx.fillStyle = sp.accent;
    ctx.beginPath();
    ctx.moveTo(0, hy - hr - 9);
    ctx.lineTo(4, hy - hr - 2);
    ctx.lineTo(0, hy - hr + 4);
    ctx.lineTo(-4, hy - hr - 2);
    ctx.closePath();
    ctx.fill();
  } else if (sp.crown === 'flower') {
    ctx.fillStyle = crownCol;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU + time * 0.4;
      ctx.beginPath();
      ctx.arc(-9 + Math.cos(a) * 5, hy - hr + 2 + Math.sin(a) * 5, 3.6, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(-9, hy - hr + 2, 2.6, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  /* ---------- Sağ kol + silah ---------- */
  ctx.save();
  ctx.translate(22 * B + 4, -12);
  ctx.rotate(pose === 'attack' ? 0.58 : -0.18);
  ctx.fillStyle = gloves.p;
  ctx.strokeStyle = gloves.s;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-7, -8, 14, 24, 6);
  ctx.fill();
  ctx.stroke();
  drawWeapon(ctx, weapon.cat || sp.weapon, weapon, pose);
  ctx.restore();

  /* ---------- Atmosfer parçacıkları ---------- */
  const count = 4 + aura.tier;
  const rising = sp.particles === 'embers' || sp.particles === 'bubbles' || sp.particles === 'stars';
  ctx.save();
  for (let i = 0; i < count; i++) {
    const ph = (time * 0.32 + i * 0.37) % 1;
    const px = -62 + ((i * 47) % 124) + Math.sin(time * 1.3 + i) * 6;
    const py = rising ? 66 - ph * 140 : -84 + ph * 150;
    ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.85;
    ctx.fillStyle = sp.accent;
    ctx.strokeStyle = sp.accent;
    ctx.beginPath();
    if (sp.particles === 'bubbles') {
      ctx.lineWidth = 1.4;
      ctx.arc(px, py, 3 + (i % 3), 0, TAU);
      ctx.stroke();
    } else if (sp.particles === 'leaves' || sp.particles === 'feathers') {
      ctx.fillStyle = sp.particles === 'feathers' ? '#ffffff' : '#4ade80';
      ctx.ellipse(px, py, 5.5, 2.2, time + i, 0, TAU);
      ctx.fill();
    } else if (sp.particles === 'stars' || sp.particles === 'shards') {
      ctx.moveTo(px, py - 5);
      ctx.lineTo(px + 3, py);
      ctx.lineTo(px, py + 5);
      ctx.lineTo(px - 3, py);
      ctx.closePath();
      ctx.fill();
    } else if (sp.particles === 'fog') {
      ctx.globalAlpha *= 0.3;
      ctx.fillStyle = '#cbd5e1';
      ctx.arc(px, 60 + (i % 3) * 5, 13, 0, TAU);
      ctx.fill();
    } else {
      if (sp.particles === 'blood') ctx.fillStyle = '#e11d48';
      ctx.arc(px, py, 2.3, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();

  ctx.restore();
}
