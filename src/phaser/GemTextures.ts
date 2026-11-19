import Phaser from 'phaser';
import { GemType, SpecialGemKind } from '../types/game';

const TEX_SIZE = 128;

function drawGemPolygon(
  ctx: CanvasRenderingContext2D,
  type: GemType,
  cx: number,
  cy: number,
  r: number
) {
  ctx.beginPath();
  if (type === 'fire') {
    // Faceted Flame Diamond / Shield Cut
    ctx.moveTo(cx, cy - r * 1.02);
    ctx.lineTo(cx + r * 0.85, cy - r * 0.25);
    ctx.lineTo(cx + r * 0.62, cy + r * 0.72);
    ctx.lineTo(cx, cy + r * 1.0);
    ctx.lineTo(cx - r * 0.62, cy + r * 0.72);
    ctx.lineTo(cx - r * 0.85, cy - r * 0.25);
    ctx.closePath();
  } else if (type === 'frost') {
    // Sharp Hexagonal Crystal
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const x = cx + Math.cos(angle) * r * 0.96;
      const y = cy + Math.sin(angle) * r * 0.96;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  } else if (type === 'nature') {
    // Organic Emerald Tear / Leaf Gem
    ctx.moveTo(cx, cy - r * 1.02);
    ctx.bezierCurveTo(cx + r * 0.95, cy - r * 0.35, cx + r * 1.0, cy + r * 0.68, cx, cy + r * 0.96);
    ctx.bezierCurveTo(cx - r * 1.0, cy + r * 0.68, cx - r * 0.95, cy - r * 0.35, cx, cy - r * 1.02);
    ctx.closePath();
  } else if (type === 'lightning') {
    // Sharp Octagonal Prism
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI / 4) * i - Math.PI / 8;
      const rad = i % 2 === 0 ? r * 0.98 : r * 0.86;
      const x = cx + Math.cos(angle) * rad;
      const y = cy + Math.sin(angle) * rad;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  } else if (type === 'arcane') {
    // Mystic Rounded Orb / Star-Cut Sphere
    ctx.arc(cx, cy, r * 0.88, 0, Math.PI * 2);
    ctx.closePath();
  } else {
    // Golden Crowned Sun-Star Gem
    const points = 10;
    for (let i = 0; i < points; i++) {
      const angle = (Math.PI / 5) * i - Math.PI / 2;
      const rad = i % 2 === 0 ? r * 1.02 : r * 0.72;
      const x = cx + Math.cos(angle) * rad;
      const y = cy + Math.sin(angle) * rad;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }
}

function drawInnerEmblem(ctx: CanvasRenderingContext2D, type: GemType, cx: number, cy: number, r: number) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.fillStyle = 'rgba(255,255,255,0.32)';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (type === 'fire') {
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 0.44);
    ctx.quadraticCurveTo(cx + r * 0.36, cy, cx + r * 0.16, cy + r * 0.36);
    ctx.quadraticCurveTo(cx, cy + r * 0.5, cx - r * 0.18, cy + r * 0.36);
    ctx.quadraticCurveTo(cx - r * 0.34, cy + r * 0.05, cx, cy - r * 0.44);
    ctx.fill();
    ctx.stroke();
  } else if (type === 'frost') {
    for (let i = 0; i < 3; i++) {
      const a = (Math.PI / 3) * i;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r * 0.42, cy + Math.sin(a) * r * 0.42);
      ctx.lineTo(cx - Math.cos(a) * r * 0.42, cy - Math.sin(a) * r * 0.42);
      ctx.stroke();
    }
  } else if (type === 'nature') {
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 0.38);
    ctx.quadraticCurveTo(cx + r * 0.36, cy, cx, cy + r * 0.42);
    ctx.quadraticCurveTo(cx - r * 0.36, cy, cx, cy - r * 0.38);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 0.28);
    ctx.lineTo(cx, cy + r * 0.42);
    ctx.stroke();
  } else if (type === 'lightning') {
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.12, cy - r * 0.44);
    ctx.lineTo(cx - r * 0.22, cy + r * 0.04);
    ctx.lineTo(cx + r * 0.04, cy + r * 0.04);
    ctx.lineTo(cx - r * 0.12, cy + r * 0.46);
    ctx.lineTo(cx + r * 0.24, cy - r * 0.04);
    ctx.lineTo(cx - r * 0.02, cy - r * 0.04);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (type === 'arcane') {
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 0.44);
    ctx.lineTo(cx + r * 0.32, cy + r * 0.22);
    ctx.lineTo(cx - r * 0.32, cy + r * 0.22);
    ctx.closePath();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

const GEM_PALETTES: Record<
  GemType,
  { glow: string; light: string; mid: string; dark: string; rim: string }
> = {
  fire: {
    glow: 'rgba(249, 115, 22, 0.72)',
    light: '#fed7aa',
    mid: '#ef4444',
    dark: '#7f1d1d',
    rim: '#fb923c',
  },
  frost: {
    glow: 'rgba(56, 189, 248, 0.72)',
    light: '#e0f2fe',
    mid: '#0ea5e9',
    dark: '#0c4a6e',
    rim: '#7dd3fc',
  },
  nature: {
    glow: 'rgba(34, 197, 94, 0.72)',
    light: '#dcfce7',
    mid: '#22c55e',
    dark: '#14532d',
    rim: '#86efac',
  },
  lightning: {
    glow: 'rgba(250, 204, 21, 0.75)',
    light: '#fef9c3',
    mid: '#eab308',
    dark: '#713f12',
    rim: '#fde047',
  },
  arcane: {
    glow: 'rgba(168, 85, 247, 0.75)',
    light: '#f3e8ff',
    mid: '#9333ea',
    dark: '#3b0764',
    rim: '#d8b4fe',
  },
  golden: {
    glow: 'rgba(251, 191, 36, 0.9)',
    light: '#fffbeb',
    mid: '#f59e0b',
    dark: '#78350f',
    rim: '#fde68a',
  },
};

export function createGemTextures(scene: Phaser.Scene) {
  const types: GemType[] = ['fire', 'frost', 'nature', 'lightning', 'arcane', 'golden'];
  const cx = TEX_SIZE / 2;
  const cy = TEX_SIZE / 2;
  const r = TEX_SIZE * 0.37;

  for (const type of types) {
    const key = `gem_${type}`;
    if (scene.textures.exists(key)) continue;

    const canvasTex = scene.textures.createCanvas(key, TEX_SIZE, TEX_SIZE);
    if (!canvasTex) continue;
    const ctx = canvasTex.getContext();
    const pal = GEM_PALETTES[type];

    // Outer ambient glow
    ctx.save();
    ctx.shadowColor = pal.glow;
    ctx.shadowBlur = 18;
    drawGemPolygon(ctx, type, cx, cy, r);
    const grad = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.3, r * 0.1, cx, cy, r * 1.05);
    grad.addColorStop(0, pal.light);
    grad.addColorStop(0.32, pal.mid);
    grad.addColorStop(1, pal.dark);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();

    // Rim bevel highlight
    ctx.save();
    drawGemPolygon(ctx, type, cx, cy, r);
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = pal.rim;
    ctx.stroke();
    ctx.restore();

    // Inner faceted polygon highlight
    ctx.save();
    drawGemPolygon(ctx, type, cx, cy, r * 0.68);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // Glossy specular shine at top-left
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.22, cy - r * 0.36, r * 0.34, r * 0.16, -0.45, 0, Math.PI * 2);
    const shineGrad = ctx.createLinearGradient(cx, cy - r * 0.6, cx, cy - r * 0.1);
    shineGrad.addColorStop(0, 'rgba(255,255,255,0.78)');
    shineGrad.addColorStop(1, 'rgba(255,255,255,0.0)');
    ctx.fillStyle = shineGrad;
    ctx.fill();
    ctx.restore();

    // Inner emblem rune
    drawInnerEmblem(ctx, type, cx, cy, r);

    canvasTex.refresh();
  }

  // Special Gem Overlays
  const specials: SpecialGemKind[] = ['line_h', 'line_v', 'nova', 'prismatic'];
  for (const sp of specials) {
    const key = `special_${sp}`;
    if (scene.textures.exists(key)) continue;
    const tex = scene.textures.createCanvas(key, TEX_SIZE, TEX_SIZE);
    if (!tex) continue;
    const ctx = tex.getContext();

    if (sp === 'line_h' || sp === 'line_v') {
      ctx.save();
      ctx.translate(cx, cy);
      if (sp === 'line_v') ctx.rotate(Math.PI / 2);
      // Glowing arrow beams left & right
      ctx.strokeStyle = '#ffffff';
      ctx.shadowColor = '#fde047';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-50, 0);
      ctx.lineTo(50, 0);
      ctx.stroke();

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.moveTo(-56, 0);
      ctx.lineTo(-38, -10);
      ctx.lineTo(-38, 10);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(56, 0);
      ctx.lineTo(38, -10);
      ctx.lineTo(38, 10);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else if (sp === 'nova') {
      ctx.save();
      ctx.strokeStyle = '#fde047';
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 16;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy, 46, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI / 4) * i;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * 34, cy + Math.sin(a) * 34);
        ctx.lineTo(cx + Math.cos(a) * 54, cy + Math.sin(a) * 54);
        ctx.stroke();
      }
      ctx.restore();
    } else if (sp === 'prismatic') {
      ctx.save();
      const rainbow = ctx.createConicGradient(0, cx, cy);
      rainbow.addColorStop(0, '#ef4444');
      rainbow.addColorStop(0.2, '#facc15');
      rainbow.addColorStop(0.4, '#22c55e');
      rainbow.addColorStop(0.6, '#38bdf8');
      rainbow.addColorStop(0.8, '#a855f7');
      rainbow.addColorStop(1, '#ef4444');

      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = (Math.PI / 8) * i;
        const rad = i % 2 === 0 ? 52 : 24;
        const px = cx + Math.cos(a) * rad;
        const py = cy + Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = rainbow;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, 16, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.restore();
    }
    tex.refresh();
  }

  // Frozen ice overlay texture
  if (!scene.textures.exists('gem_frozen')) {
    const tex = scene.textures.createCanvas('gem_frozen', TEX_SIZE, TEX_SIZE);
    if (tex) {
      const ctx = tex.getContext();
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.92)';
      ctx.fillStyle = 'rgba(125, 211, 252, 0.34)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(10, 10, TEX_SIZE - 20, TEX_SIZE - 20, 18);
      ctx.fill();
      ctx.stroke();
      // Ice cracks
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(16, 26);
      ctx.lineTo(44, 42);
      ctx.lineTo(32, 74);
      ctx.moveTo(TEX_SIZE - 18, 30);
      ctx.lineTo(80, 56);
      ctx.lineTo(96, 98);
      ctx.stroke();
      tex.refresh();
    }
  }

  // Particle orb texture
  if (!scene.textures.exists('particle_orb')) {
    const tex = scene.textures.createCanvas('particle_orb', 32, 32);
    if (tex) {
      const ctx = tex.getContext();
      const g = ctx.createRadialGradient(16, 16, 1, 16, 16, 15);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.4, 'rgba(255,255,255,0.75)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 32, 32);
      tex.refresh();
    }
  }

  // Particle star spark texture
  if (!scene.textures.exists('particle_star')) {
    const tex = scene.textures.createCanvas('particle_star', 32, 32);
    if (tex) {
      const ctx = tex.getContext();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(16, 1);
      ctx.lineTo(20, 12);
      ctx.lineTo(31, 16);
      ctx.lineTo(20, 20);
      ctx.lineTo(16, 31);
      ctx.lineTo(12, 20);
      ctx.lineTo(1, 16);
      ctx.lineTo(12, 12);
      ctx.closePath();
      ctx.fill();
      tex.refresh();
    }
  }
}
