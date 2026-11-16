/**
 * Next-Gen FFBE Neo-Vision / Last Cloudia / Octopath Pixel-Pure FX & Particle Runtime (`exNextGenFX`)
 *
 * Exclusively serves the 11 Wide-Canvas (`320x240`) `*_ex` Champions while leaving all 11 Legacy
 * Champions and Legacy `src/engine/shaders/*Shaders.js` 100% untouched (`0` diff).
 *
 * Strict HD-2D Pixel Invariants:
 * - ZERO `ctx.rotate`, ZERO `.ellipse()`, ZERO `.arc()`, ZERO blurry radial gradient `glow*` blobs.
 * - ZERO sequential nested-square chevron loops (`fillRect(outer)` + `fillRect(inner)` in one loop);
 *   every multi-tone ray, lightning bolt, or starburst renders in separate full-geometry passes
 *   (Pass 1: dark Selout / outer tone -> Pass 2: mid accent -> Pass 3: `#ffffff` core).
 * - `4x4` Bayer ordered stipple dithering (`alpha <= 0.22`) for crisp, non-washed-out pixel light pools.
 */

const BAYER_4X4 = [
  0 / 16, 8 / 16, 2 / 16, 10 / 16,
  12 / 16, 4 / 16, 14 / 16, 6 / 16,
  3 / 16, 11 / 16, 1 / 16, 9 / 16,
  15 / 16, 7 / 16, 13 / 16, 5 / 16
];

export const EX_HERO_PALETTES = {
  warrior_ex: {
    primary: '#38bdf8',
    accent: '#facc15',
    core: '#ffffff',
    shadow: '#082f49',
    ambientShapes: ['star4', 'diamond', 'feather'],
    hitShapes: ['star4', 'diamond', 'bolt']
  },
  mage_ex: {
    primary: '#fb923c',
    accent: '#fde047',
    core: '#ffffff',
    shadow: '#431407',
    ambientShapes: ['ember', 'rune', 'star4'],
    hitShapes: ['ember', 'star4', 'ring']
  },
  priestess_ex: {
    primary: '#fde047',
    accent: '#f9a8d4',
    core: '#ffffff',
    shadow: '#422006',
    ambientShapes: ['feather', 'star4', 'rune'],
    hitShapes: ['star4', 'feather', 'ring']
  },
  chronomancer_ex: {
    primary: '#2dd4bf',
    accent: '#facc15',
    core: '#ffffff',
    shadow: '#042f2e',
    ambientShapes: ['rune', 'diamond', 'star4'],
    hitShapes: ['diamond', 'rune', 'bolt']
  },
  valkyrie_ex: {
    primary: '#f43f5e',
    accent: '#fbbf24',
    core: '#ffffff',
    shadow: '#4c0519',
    ambientShapes: ['feather', 'bolt', 'star4'],
    hitShapes: ['bolt', 'feather', 'star4']
  },
  ronin_ex: {
    primary: '#38bdf8',
    accent: '#818cf8',
    core: '#fde047',
    shadow: '#1e1b4b',
    ambientShapes: ['bolt', 'feather', 'star4'],
    hitShapes: ['bolt', 'star4', 'diamond']
  },
  archer_ex: {
    primary: '#34d399',
    accent: '#fde047',
    core: '#ffffff',
    shadow: '#022c22',
    ambientShapes: ['feather', 'star4', 'rune'],
    hitShapes: ['star4', 'feather', 'diamond']
  },
  reaper_ex: {
    primary: '#d946ef',
    accent: '#f43f5e',
    core: '#fdf4ff',
    shadow: '#2e1065',
    ambientShapes: ['ember', 'rune', 'diamond'],
    hitShapes: ['ember', 'diamond', 'bolt']
  },
  titan_ex: {
    primary: '#f59e0b',
    accent: '#10b981',
    core: '#fef08a',
    shadow: '#451a03',
    ambientShapes: ['ember', 'diamond', 'rune'],
    hitShapes: ['diamond', 'ember', 'ring']
  },
  icemage_ex: {
    primary: '#67e8f9',
    accent: '#e879f9',
    core: '#ffffff',
    shadow: '#083344',
    ambientShapes: ['diamond', 'star4', 'rune'],
    hitShapes: ['diamond', 'star4', 'ring']
  },
  android_ex: {
    primary: '#22d3ee',
    accent: '#ec4899',
    core: '#ffffff',
    shadow: '#083344',
    ambientShapes: ['rune', 'bolt', 'diamond'],
    hitShapes: ['bolt', 'diamond', 'star4']
  }
};

export function getExHeroPalette(heroId, fallbackPrimary = '#38bdf8') {
  if (heroId && EX_HERO_PALETTES[heroId]) {
    return EX_HERO_PALETTES[heroId];
  }
  return {
    primary: fallbackPrimary || '#38bdf8',
    accent: '#facc15',
    core: '#ffffff',
    shadow: '#082f49',
    ambientShapes: ['star4', 'diamond', 'ember'],
    hitShapes: ['star4', 'diamond', 'ring']
  };
}

const _bayerHaloCache = new Map();
const MAX_BAYER_HALO_CACHE = 32;

export function releaseExHaloCache() {
  for (const entry of _bayerHaloCache.values()) {
    if (entry) {
      entry.width = 0;
      entry.height = 0;
    }
  }
  _bayerHaloCache.clear();
}

function snap2(v) {
  return Math.round(v * 0.5) * 2;
}

function getOrBakeBayerHaloSprite(qRx, qRy, colorHex, coreHex) {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    return null;
  }
  const key = `${qRx}x${qRy}:${colorHex}:${coreHex}`;
  const cached = _bayerHaloCache.get(key);
  if (cached && cached.width > 0) {
    return cached;
  }

  const px = 2;
  const w = qRx * 2 + 4;
  const h = qRy * 2 + 4;
  const cvs = document.createElement('canvas');
  cvs.width = w;
  cvs.height = h;
  const bctx = cvs.getContext('2d');
  if (!bctx) {
    cvs.width = 0;
    cvs.height = 0;
    return null;
  }
  bctx.imageSmoothingEnabled = false;

  const cx = w * 0.5;
  const cy = h * 0.5;
  const invRx = 1 / Math.max(2, qRx);
  const invRy = 1 / Math.max(2, qRy);

  // Pass 1: Outer & mid Bayer-dithered primary tone pixels
  bctx.fillStyle = colorHex;
  for (let py = 0; py < h; py += px) {
    const ny = (py + 1 - cy) * invRy;
    const ny2 = ny * ny;
    if (ny2 >= 1) continue;
    const rowIdx = ((py >> 1) & 3) * 4;
    for (let pxX = 0; pxX < w; pxX += px) {
      const nx = (pxX + 1 - cx) * invRx;
      const d2 = nx * nx + ny2;
      if (d2 >= 1) continue;
      const falloff = 1 - Math.sqrt(d2);
      const thresh = BAYER_4X4[rowIdx + ((pxX >> 1) & 3)];
      if (falloff * 1.12 > thresh) {
        bctx.fillRect(pxX, py, px, px);
      }
    }
  }

  // Pass 2: Inner Bayer-dithered core highlight pixels
  bctx.fillStyle = coreHex || '#ffffff';
  for (let py = 0; py < h; py += px) {
    const ny = (py + 1 - cy) * invRy;
    const ny2 = ny * ny;
    if (ny2 >= 0.32) continue;
    const rowIdx = ((py >> 1) & 3) * 4;
    for (let pxX = 0; pxX < w; pxX += px) {
      const nx = (pxX + 1 - cx) * invRx;
      const d2 = nx * nx + ny2;
      if (d2 >= 0.32) continue;
      const innerFalloff = (0.32 - d2) / 0.32;
      const thresh = BAYER_4X4[rowIdx + ((pxX >> 1) & 3)];
      if (innerFalloff * 0.92 > thresh) {
        bctx.fillRect(pxX, py, px, px);
      }
    }
  }

  if (_bayerHaloCache.size >= MAX_BAYER_HALO_CACHE) {
    const oldestKey = _bayerHaloCache.keys().next().value;
    const oldCvs = _bayerHaloCache.get(oldestKey);
    if (oldCvs) {
      oldCvs.width = 0;
      oldCvs.height = 0;
    }
    _bayerHaloCache.delete(oldestKey);
  }
  _bayerHaloCache.set(key, cvs);
  return cvs;
}

/**
 * Subtle (`alpha <= 0.22`) `4x4` Bayer-stippled pixel-art rim/floor light pool
 * replacing blurry `renderer.glow*` radial gradient blobs on EX champions.
 */
export function drawExBayerHalo(
  ctx,
  x,
  y,
  rx = 56,
  ry = 14,
  colorHex = '#38bdf8',
  coreHex = '#ffffff',
  alpha = 0.18
) {
  if (!ctx) return;
  const clampedAlpha = Math.min(0.22, Math.max(0, alpha));
  if (clampedAlpha <= 0.01) return;

  const qRx = Math.max(6, Math.round(rx / 4) * 4);
  const qRy = Math.max(4, Math.round(ry / 2) * 2);
  const sx = snap2(x);
  const sy = snap2(y);

  const sprite = ctx.drawImage ? getOrBakeBayerHaloSprite(qRx, qRy, colorHex, coreHex) : null;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = clampedAlpha;

  if (sprite) {
    ctx.drawImage(sprite, Math.round(sx - sprite.width * 0.5), Math.round(sy - sprite.height * 0.5));
    ctx.restore();
    return;
  }

  if (!ctx.fillRect) {
    ctx.restore();
    return;
  }

  // Headless / mock-canvas direct `2x2` Bayer stipple fallback (2 separate passes)
  const px = 2;
  const invRx = 1 / qRx;
  const invRy = 1 / qRy;
  ctx.fillStyle = colorHex;
  for (let dy = -qRy; dy <= qRy; dy += px) {
    const ny = dy * invRy;
    const ny2 = ny * ny;
    if (ny2 >= 1) continue;
    const rowIdx = (((sy + dy) >> 1) & 3) * 4;
    for (let dx = -qRx; dx <= qRx; dx += px) {
      const nx = dx * invRx;
      const d2 = nx * nx + ny2;
      if (d2 >= 1) continue;
      const falloff = 1 - Math.sqrt(d2);
      if (falloff * 1.12 > BAYER_4X4[rowIdx + (((sx + dx) >> 1) & 3)]) {
        ctx.fillRect(sx + dx, sy + dy, px, px);
      }
    }
  }
  ctx.fillStyle = coreHex || '#ffffff';
  for (let dy = -qRy; dy <= qRy; dy += px) {
    const ny = dy * invRy;
    const ny2 = ny * ny;
    if (ny2 >= 0.30) continue;
    const rowIdx = (((sy + dy) >> 1) & 3) * 4;
    for (let dx = -qRx; dx <= qRx; dx += px) {
      const nx = dx * invRx;
      const d2 = nx * nx + ny2;
      if (d2 >= 0.30) continue;
      if (((0.30 - d2) / 0.30) * 0.9 > BAYER_4X4[rowIdx + (((sx + dx) >> 1) & 3)]) {
        ctx.fillRect(sx + dx, sy + dy, px, px);
      }
    }
  }
  ctx.restore();
}

// 6 asymmetric anime starburst ray directions `[ux, uy, lengthScale]`
const STARBURST_RAYS = [
  [0.94, -0.34, 1.18],
  [-0.94, 0.34, 1.12],
  [0.28, -0.96, 0.92],
  [-0.28, 0.96, 0.88],
  [0.72, 0.69, 0.68],
  [-0.74, -0.67, 0.74]
];

/**
 * Crisp asymmetric 4-frame anime pixel hit-starburst (`0` overlapping-square `>>>>>>>` chevrons!).
 * Uses 3 strict full-starburst passes (Pass 1 outer primary -> Pass 2 mid accent -> Pass 3 white core/tips)
 * so outer pixels NEVER overwrite inner pixels of adjacent steps!
 */
export function drawExHitStarburst(
  ctx,
  x,
  y,
  progress = 0,
  primaryHex = '#38bdf8',
  accentHex = '#facc15'
) {
  if (!ctx?.fillRect) return;
  const u = Math.max(0, Math.min(1, progress));
  if (u >= 1) return;

  const frame = Math.min(3, Math.floor(u * 4));
  const cx = snap2(x);
  const cy = snap2(y);
  const fade = frame === 0 ? 1.0 : frame === 1 ? 0.94 : frame === 2 ? 0.78 : 0.54;

  // Frame 0: compact flash cross; Frame 1: full asymmetric spike extension;
  // Frame 2: inner core opens up (hollowed ring-burst); Frame 3: detached pixel tip glints
  const maxSpan = frame === 0 ? 20 : frame === 1 ? 36 : frame === 2 ? 44 : 50;
  const innerSkip = frame === 0 ? 0 : frame === 1 ? 4 : frame === 2 ? 16 : 30;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = fade;

  // PASS 1: Dark `#050814` Selout + outer `primaryHex` pixel steps across all 6 rays
  ctx.fillStyle = '#050814';
  for (let r = 0; r < STARBURST_RAYS.length; r++) {
    const [ux, uy, scale] = STARBURST_RAYS[r];
    const rayLen = Math.round(maxSpan * scale);
    for (let d = innerSkip; d <= rayLen; d += 4) {
      const px = snap2(cx + ux * d);
      const py = snap2(cy + uy * d);
      ctx.fillRect(px - 2, py - 2, 6, 6);
    }
  }

  ctx.fillStyle = primaryHex;
  for (let r = 0; r < STARBURST_RAYS.length; r++) {
    const [ux, uy, scale] = STARBURST_RAYS[r];
    const rayLen = Math.round(maxSpan * scale);
    for (let d = innerSkip; d <= rayLen; d += 2) {
      const px = snap2(cx + ux * d);
      const py = snap2(cy + uy * d);
      const sz = d < rayLen * 0.55 && frame <= 1 ? 4 : 2;
      const off = sz === 4 ? -1 : 0;
      ctx.fillRect(px + off, py + off, sz, sz);
    }
  }

  // PASS 2: Inner `accentHex` crest steps across all 6 rays
  ctx.fillStyle = accentHex;
  for (let r = 0; r < STARBURST_RAYS.length; r++) {
    const [ux, uy, scale] = STARBURST_RAYS[r];
    const rayLen = Math.round(maxSpan * scale * 0.78);
    for (let d = innerSkip; d <= rayLen; d += 2) {
      const px = snap2(cx + ux * d);
      const py = snap2(cy + uy * d);
      ctx.fillRect(px, py, 2, 2);
    }
  }

  // PASS 3: Pure `#ffffff` central flash diamond (frames 0..1) + crisp tip glints (frames 1..3)
  ctx.fillStyle = '#ffffff';
  if (frame <= 1) {
    const coreR = frame === 0 ? 6 : 4;
    ctx.fillRect(cx - coreR, cy - 1, coreR * 2 + 2, 4);
    ctx.fillRect(cx - 1, cy - coreR, 4, coreR * 2 + 2);
    ctx.fillRect(cx - 2, cy - 2, 6, 6);
  }
  for (let r = 0; r < STARBURST_RAYS.length; r++) {
    const [ux, uy, scale] = STARBURST_RAYS[r];
    const tipDist = Math.round(maxSpan * scale);
    const tx = snap2(cx + ux * tipDist);
    const ty = snap2(cy + uy * tipDist);
    ctx.fillRect(tx, ty, 2, 2);
  }

  ctx.restore();
}

function drawStar4Particle(ctx, px, py, sz, color, accent, core) {
  const arm = Math.max(4, snap2(sz * 2));
  ctx.fillStyle = '#050814';
  ctx.fillRect(px - arm - 2, py - 2, arm * 2 + 6, 6);
  ctx.fillRect(px - 2, py - arm - 2, 6, arm * 2 + 6);

  ctx.fillStyle = color;
  ctx.fillRect(px - arm, py, arm * 2 + 2, 2);
  ctx.fillRect(px, py - arm, 2, arm * 2 + 2);

  const mid = Math.max(2, arm - 2);
  ctx.fillStyle = accent;
  ctx.fillRect(px - mid, py, mid * 2 + 2, 2);
  ctx.fillRect(px, py - mid, 2, mid * 2 + 2);

  ctx.fillStyle = core;
  ctx.fillRect(px - 2, py - 2, 6, 6);
}

function drawDiamondParticle(ctx, px, py, sz, color, accent, core) {
  const r = sz >= 4 ? 4 : 2;
  ctx.fillStyle = '#050814';
  ctx.fillRect(px - r - 2, py - 2, r * 2 + 6, 6);
  ctx.fillRect(px - 2, py - r - 2, 6, r * 2 + 6);

  ctx.fillStyle = color;
  ctx.fillRect(px - r, py, r * 2 + 2, 2);
  ctx.fillRect(px, py - r, 2, r * 2 + 2);
  if (r >= 4) {
    ctx.fillRect(px - 2, py - 2, 6, 6);
  }

  ctx.fillStyle = accent;
  ctx.fillRect(px - 2, py, 4, 2);
  ctx.fillRect(px, py - 2, 2, 4);

  ctx.fillStyle = core;
  ctx.fillRect(px, py - 2, 2, 2);
}

function drawEmberParticle(ctx, px, py, u, color, accent, core) {
  ctx.fillStyle = '#050814';
  ctx.fillRect(px - 2, py - 4, 6, 10);

  ctx.fillStyle = color;
  ctx.fillRect(px, py - 4, 2, 8);
  if (u < 0.65) {
    ctx.fillRect(px - 2, py - 2, 6, 4);
  }

  ctx.fillStyle = accent;
  ctx.fillRect(px, py - 2, 2, 4);

  if (u < 0.55) {
    ctx.fillStyle = core;
    ctx.fillRect(px, py, 2, 2);
  }
  if (u > 0.25 && u < 0.85) {
    ctx.fillStyle = accent;
    ctx.fillRect(px, py + 6, 2, 2);
  }
}

function drawFeatherParticle(ctx, px, py, dir, color, accent, core) {
  const s = dir >= 0 ? 2 : -2;
  // Pass 1: Dark Selout silhouette
  ctx.fillStyle = '#050814';
  ctx.fillRect(px - 2, py - 2, 6, 6);
  ctx.fillRect(px + s - 2, py - 4, 6, 6);
  ctx.fillRect(px - s - 2, py, 6, 6);

  // Pass 2: Stepped vane body
  ctx.fillStyle = color;
  ctx.fillRect(px - s, py + 2, 4, 2);
  ctx.fillRect(px, py, 4, 2);
  ctx.fillRect(px + s, py - 2, 4, 2);

  // Pass 3: Quill highlight
  ctx.fillStyle = accent;
  ctx.fillRect(px, py, 2, 2);
  ctx.fillStyle = core;
  ctx.fillRect(px + s, py - 2, 2, 2);
}

function drawRuneParticle(ctx, px, py, sz, color, accent, core) {
  const half = sz >= 4 ? 4 : 3;
  const span = half * 2;
  ctx.fillStyle = '#050814';
  ctx.fillRect(px - half - 2, py - half - 2, span + 4, span + 4);

  // Hollow pixel sigil frame
  ctx.fillStyle = color;
  ctx.fillRect(px - half, py - half, span, 2);
  ctx.fillRect(px - half, py + half - 2, span, 2);
  ctx.fillRect(px - half, py - half, 2, span);
  ctx.fillRect(px + half - 2, py - half, 2, span);

  // Cardinal rune pips + center spark
  ctx.fillStyle = accent;
  ctx.fillRect(px - 1, py - half - 2, 2, 2);
  ctx.fillRect(px - 1, py + half, 2, 2);
  ctx.fillStyle = core;
  ctx.fillRect(px - 1, py - 1, 2, 2);
}

function drawBoltParticle(ctx, px, py, seed, color, core) {
  const flip = (seed & 1) === 0 ? 1 : -1;
  const pts = [
    [px - flip * 4, py - 6],
    [px - flip * 2, py - 4],
    [px, py - 2],
    [px + flip * 2, py - 2],
    [px, py],
    [px - flip * 2, py + 2],
    [px, py + 4],
    [px + flip * 2, py + 6]
  ];

  // Pass 1: All outer lightning segments (zero single-loop overwrite!)
  ctx.fillStyle = '#050814';
  for (let i = 0; i < pts.length; i++) {
    ctx.fillRect(pts[i][0] - 2, pts[i][1] - 2, 6, 6);
  }
  ctx.fillStyle = color;
  for (let i = 0; i < pts.length; i++) {
    ctx.fillRect(pts[i][0] - 1, pts[i][1] - 1, 4, 4);
  }

  // Pass 2: Crisp 2x2 white core spine
  ctx.fillStyle = core;
  for (let i = 0; i < pts.length; i++) {
    ctx.fillRect(pts[i][0], pts[i][1], 2, 2);
  }
}

function drawBayerRingParticle(ctx, px, py, u, maxRx, flatGround, color, core) {
  const rx = Math.max(8, snap2(maxRx * (0.28 + 0.72 * (1 - Math.pow(1 - u, 2)))));
  const ry = flatGround ? Math.max(4, snap2(rx * 0.30)) : rx;
  const steps = Math.max(16, Math.min(44, Math.round(rx * 0.75)));

  // Pass 1: Outer Bayer-dithered ring pixels
  ctx.fillStyle = color;
  for (let i = 0; i < steps; i++) {
    const ang = (i / steps) * Math.PI * 2;
    const rxP = snap2(px + Math.cos(ang) * rx);
    const ryP = snap2(py + Math.sin(ang) * ry);
    const bayer = BAYER_4X4[(((ryP >> 1) & 3) * 4) + ((rxP >> 1) & 3)];
    if (1 - u * 0.85 > bayer * 0.85) {
      ctx.fillRect(rxP - 1, ryP - 1, 4, 4);
    }
  }

  // Pass 2: Crisp 2x2 core glints on cardinal/intercardinal nodes
  if (u < 0.72) {
    ctx.fillStyle = core;
    for (let i = 0; i < steps; i += 2) {
      const ang = (i / steps) * Math.PI * 2;
      const rxP = snap2(px + Math.cos(ang) * rx);
      const ryP = snap2(py + Math.sin(ang) * ry);
      ctx.fillRect(rxP, ryP, 2, 2);
    }
  }
}

/**
 * Renders a list of multi-shape pixel particles (`star4`, `diamond`, `ember`, `feather`, `rune`, `bolt`, `ring`)
 * using strictly integer-snapped `fillRect` clusters (`0` `ctx.rotate`, `0` `.ellipse()`, `0` radial blobs).
 */
export function drawExPixelParticles(ctx, list, layerFilter = null) {
  if (!ctx?.fillRect || !Array.isArray(list) || list.length === 0) return;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalCompositeOperation = 'source-over';

  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    if (!p || (layerFilter && p.layer !== layerFilter)) continue;
    const maxLife = p.maxLife > 0 ? p.maxLife : 0.35;
    const u = p.age / maxLife;
    if (u < 0 || u >= 1) continue;

    const fade = u < 0.12 ? u / 0.12 : Math.max(0, 1 - (u - 0.12) / 0.88);
    if (fade <= 0.03) continue;

    ctx.globalAlpha = Math.min(1, fade * (p.alpha ?? 0.94));
    const px = snap2(p.x);
    const py = snap2(p.y);
    const color = p.color || '#38bdf8';
    const accent = p.accent || '#facc15';
    const core = p.core || '#ffffff';
    const sz = p.size || 3;

    switch (p.shape) {
      case 'star4':
        drawStar4Particle(ctx, px, py, sz * (u < 0.5 ? 1.1 : 0.8), color, accent, core);
        break;
      case 'diamond':
        drawDiamondParticle(ctx, px, py, sz, color, accent, core);
        break;
      case 'ember':
        drawEmberParticle(ctx, px, py, u, color, accent, core);
        break;
      case 'feather':
        drawFeatherParticle(ctx, px, py, p.vx >= 0 ? 1 : -1, color, accent, core);
        break;
      case 'rune':
        drawRuneParticle(ctx, px, py, sz, color, accent, core);
        break;
      case 'bolt':
        drawBoltParticle(ctx, px, py, p.seed || i, color, core);
        break;
      case 'ring':
        drawBayerRingParticle(ctx, px, py, u, p.maxRx || 58, p.flatGround !== false, color, core);
        break;
      default:
        drawDiamondParticle(ctx, px, py, sz, color, accent, core);
        break;
    }
  }

  ctx.restore();
}

/**
 * Per-Fighter Zero-Allocation Next-Gen EX Particle & Hit-Starburst System.
 */
export class ExParticleSystem {
  constructor(arg1 = 72, arg2 = 12) {
    if (typeof arg1 === 'string') {
      this.heroId = arg1;
      this.defaultPalette = getExHeroPalette(arg1, typeof arg2 === 'string' ? arg2 : null);
      this.maxParticles = 72;
      this.maxStarbursts = 12;
    } else {
      this.heroId = null;
      this.defaultPalette = null;
      this.maxParticles = typeof arg1 === 'number' && arg1 > 0 ? arg1 : 72;
      this.maxStarbursts = typeof arg2 === 'number' && arg2 > 0 ? arg2 : 12;
    }
    this.particles = [];
    this.starbursts = [];
    this._ambientAcc = 0;
    this._seedCounter = 1;
  }

  clear() {
    this.particles.length = 0;
    this.starbursts.length = 0;
    this._ambientAcc = 0;
  }

  spawn(opts = {}) {
    if (this.particles.length >= this.maxParticles) {
      this.particles.shift();
    }
    const pal = this.defaultPalette;
    const seed = (this._seedCounter = (this._seedCounter + 1) & 0x7fff);
    this.particles.push({
      shape: opts.shape || (pal?.shapes?.[0] || 'diamond'),
      x: opts.x || 0,
      y: opts.y || 0,
      vx: opts.vx || 0,
      vy: opts.vy || 0,
      gravity: opts.gravity ?? 0,
      swayAmp: opts.swayAmp || 0,
      swayFreq: opts.swayFreq || 5.0,
      age: 0,
      maxLife: opts.maxLife || 0.36,
      size: opts.size || 3,
      maxRx: opts.maxRx || 58,
      flatGround: opts.flatGround !== false,
      color: opts.color || pal?.primary || '#38bdf8',
      accent: opts.accent || pal?.accent || '#facc15',
      core: opts.core || pal?.core || '#ffffff',
      alpha: opts.alpha ?? 0.94,
      layer: opts.layer === 'back' ? 'back' : 'front',
      seed
    });
  }

  burst(x, y, cfg = {}) {
    const pal = this.defaultPalette;
    const count = cfg.count ?? 6;
    const shapes =
      Array.isArray(cfg.shapes) && cfg.shapes.length > 0
        ? cfg.shapes
        : pal?.shapes || ['star4', 'diamond'];
    const speedMin = cfg.speedMin ?? 42;
    const speedMax = cfg.speedMax ?? 156;
    const upBias = cfg.upBias ?? 38;
    const gravity = cfg.gravity ?? 95;
    const lifeMin = cfg.lifeMin ?? 0.18;
    const lifeMax = cfg.lifeMax ?? 0.38;
    const color = cfg.color || pal?.primary || '#38bdf8';
    const accent = cfg.accent || pal?.accent || '#facc15';
    const core = cfg.core || pal?.core || '#ffffff';
    const layer = cfg.layer || 'front';

    for (let i = 0; i < count; i++) {
      const ang = (i / Math.max(1, count)) * Math.PI * 2 + (Math.random() - 0.5) * 0.55;
      const spd = speedMin + Math.random() * Math.max(4, speedMax - speedMin);
      const shape = shapes[i % shapes.length];
      this.spawn({
        shape,
        x: x + (Math.random() - 0.5) * 14,
        y: y + (Math.random() - 0.5) * 14,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - upBias,
        gravity: shape === 'feather' ? 24 : shape === 'ember' ? -36 : gravity,
        swayAmp: shape === 'feather' ? 26 : shape === 'ember' ? 14 : 0,
        swayFreq: 4.5 + (i % 3) * 1.4,
        maxLife: lifeMin + Math.random() * Math.max(0.04, lifeMax - lifeMin),
        size: i % 3 === 0 ? 4 : 3,
        color: i % 2 === 0 ? color : accent,
        accent: i % 2 === 0 ? accent : color,
        core,
        layer
      });
    }
  }

  spawnRing(x, y, maxRx = 64, color = '#38bdf8', core = '#ffffff', flatGround = true, maxLife = 0.28) {
    this.spawn({
      shape: 'ring',
      x,
      y,
      vx: 0,
      vy: 0,
      gravity: 0,
      maxLife,
      maxRx,
      flatGround,
      color,
      accent: core,
      core,
      alpha: 0.86,
      layer: flatGround ? 'back' : 'front'
    });
  }

  spawnHitStarburst(x, y, primaryHex = '#38bdf8', accentHex = '#facc15', maxLife = 0.16) {
    if (this.starbursts.length >= this.maxStarbursts) {
      this.starbursts.shift();
    }
    this.starbursts.push({
      x,
      y,
      primaryHex,
      accentHex,
      age: 0,
      maxLife: Math.max(0.08, maxLife)
    });
  }

  emitStateFlourish(fighter, newState) {
    if (!fighter || fighter.isDead) return;
    const pal = getExHeroPalette(fighter.heroId, fighter.primaryColor);
    const gy = fighter.groundY || fighter.y;
    const midY = (fighter.y || gy) - 86;

    if (newState === 'SKILL') {
      this.spawnRing(fighter.x, gy - 2, 68, pal.primary, pal.accent, true, 0.28);
      this.burst(fighter.x + (fighter.facing || 1) * 20, midY, {
        count: 6,
        shapes: pal.ambientShapes,
        speedMin: 48,
        speedMax: 138,
        upBias: 42,
        color: pal.primary,
        accent: pal.accent,
        core: pal.core,
        layer: 'front'
      });
    } else if (newState === 'ULTIMATE') {
      this.spawnRing(fighter.x, gy - 2, 92, pal.accent, pal.core, true, 0.34);
      this.burst(fighter.x, midY - 8, {
        count: 9,
        shapes: ['star4', ...pal.ambientShapes],
        speedMin: 62,
        speedMax: 175,
        upBias: 54,
        color: pal.primary,
        accent: pal.accent,
        core: pal.core,
        layer: 'front'
      });
    } else if (newState === 'TRUE_ULTIMATE') {
      this.spawnRing(fighter.x, gy - 2, 118, pal.primary, pal.core, true, 0.42);
      this.spawnRing(fighter.x, midY, 76, pal.accent, pal.core, false, 0.36);
      this.burst(fighter.x, midY - 12, {
        count: 12,
        shapes: ['star4', 'diamond', ...pal.ambientShapes],
        speedMin: 75,
        speedMax: 210,
        upBias: 64,
        color: pal.primary,
        accent: pal.accent,
        core: pal.core,
        layer: 'front'
      });
    } else if (newState === 'DASH' || newState === 'DODGE' || newState === 'JUMP') {
      this.burst(fighter.x - (fighter.facing || 1) * 18, gy - 24, {
        count: 4,
        shapes: pal.ambientShapes,
        speedMin: 32,
        speedMax: 92,
        upBias: 24,
        color: pal.primary,
        accent: pal.accent,
        core: pal.core,
        layer: 'back'
      });
    }
  }

  emitAmbient(dt, fighter) {
    if (!fighter || fighter.isDead || fighter.isBenched || fighter.isFullyBurrowed) return;
    const isIntense =
      fighter.isBerserk ||
      fighter.state === 'SKILL' ||
      fighter.state === 'ULTIMATE' ||
      fighter.state === 'TRUE_ULTIMATE';
    const interval = isIntense ? 0.075 : 0.16;
    this._ambientAcc += dt;
    if (this._ambientAcc < interval) return;
    this._ambientAcc = 0;

    const pal = getExHeroPalette(fighter.heroId, fighter.primaryColor);
    const shapes = pal.ambientShapes;
    const shape = shapes[this._seedCounter % shapes.length];
    const spreadX = (Math.random() - 0.5) * 58 + (fighter.facing || 1) * 10;
    const baseY = (fighter.y || fighter.groundY) - 24 - Math.random() * 96;

    this.spawn({
      shape,
      x: fighter.x + spreadX,
      y: baseY,
      vx: (Math.random() - 0.5) * 22,
      vy: shape === 'feather' ? 22 + Math.random() * 18 : -32 - Math.random() * 28,
      gravity: shape === 'feather' ? 12 : -8,
      swayAmp: shape === 'feather' ? 24 : 12,
      swayFreq: 3.6 + Math.random() * 2.0,
      maxLife: 0.48 + Math.random() * 0.24,
      size: isIntense && this._seedCounter % 2 === 0 ? 4 : 3,
      color: this._seedCounter % 2 === 0 ? pal.primary : pal.accent,
      accent: pal.accent,
      core: pal.core,
      alpha: isIntense ? 0.92 : 0.78,
      layer: this._seedCounter % 3 === 0 ? 'front' : 'back'
    });
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;
      if (p.age >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }
      const sway = p.swayAmp ? Math.sin(p.age * p.swayFreq + p.seed) * p.swayAmp : 0;
      p.x += (p.vx + sway) * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
    }

    for (let i = this.starbursts.length - 1; i >= 0; i--) {
      const sb = this.starbursts[i];
      sb.age += dt;
      if (sb.age >= sb.maxLife) {
        this.starbursts.splice(i, 1);
      }
    }
  }

  renderBack(ctx) {
    drawExPixelParticles(ctx, this.particles, 'back');
  }

  renderFront(ctx) {
    drawExPixelParticles(ctx, this.particles, 'front');
    if (this.starbursts.length > 0) {
      for (let i = 0; i < this.starbursts.length; i++) {
        const sb = this.starbursts[i];
        drawExHitStarburst(
          ctx,
          sb.x,
          sb.y,
          sb.age / sb.maxLife,
          sb.primaryHex,
          sb.accentHex
        );
      }
    }
  }
}
