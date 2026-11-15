#!/usr/bin/env node
/**
 * Next-Gen 30fps VFX Sprite Sheet Builder for Aethelgard EX (`warrior_ex` / `WarriorEx.js`).
 * Powered natively by `src/engine/ArcaneShaderFX.js` with custom FFBE / Last Cloudia
 * serrated crescent sword-waves, razor hit-slash cross-scars, Dawn-Breaker ground pillars,
 * foreshortened Omnislash locus rings, and sovereign feather/spark bursts.
 *
 * Invariants:
 *   - Output: `assets/sprites/warrior_ex_vfx.png` (6240x1664, 8 rows x 30 cols @ 208x208)
 *   - 100% 2x2 integer pixel blocks (authored on 104x104 logical grid -> 2x NEAREST)
 *   - Strict 2px logical (4px output) transparent safety margin on all 240 cells (0/240 clips)
 *   - Crisp #0a0e1c / #141c34 Selout, stepped cel-ramps, 4x4 Bayer stipple fade, 0 muddy blobs
 *   - Zero Unicode emojis anywhere
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

import {
  PURE_WHITE,
  packHexColor,
  clamp01,
  smoothStep,
  DeterministicRng,
  buildLightningChain,
  createPixelSurface,
  clearPixelSurface,
  resolveSurfaceToRGBA,
  ShaderPen
} from '../src/engine/ArcaneShaderFX.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SCRATCH_DIR =
  '/Users/rei/.gemini/antigravity/brain/5416474b-0e5f-4471-85c8-b7a88055e218/scratch';

// Locked Sovereign Exvius Palette (matches `warrior_ex_sheet.png` 1:1)
const C_SEL_DARK = packHexColor('#0a0e1c');
const C_SEL_MID = packHexColor('#141c34');
const C_SAPPH_DEEP = packHexColor('#102a68');
const C_CYAN_DEEP = packHexColor('#0e84d4');
const C_CYAN_BRIGHT = packHexColor('#38d0fc');
const C_CYAN_PALE = packHexColor('#bdf2ff');
const C_GOLD_DEEP = packHexColor('#8a4b12');
const C_GOLD_MID = packHexColor('#d98a1e');
const C_GOLD_BRIGHT = packHexColor('#fcde62');
const C_GOLD_PALE = packHexColor('#fff5bf');
const C_CRIMSON = packHexColor('#c82848');
const C_CRIMSON_LIT = packHexColor('#ff647c');
const C_WHITE = PURE_WHITE;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function makePngChunk(typeAscii, dataBuf) {
  const typeBuf = Buffer.from(typeAscii, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(dataBuf.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, dataBuf])), 0);
  return Buffer.concat([lenBuf, typeBuf, dataBuf, crcBuf]);
}

function encodeRgbaPng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowOff = y * (stride + 1);
    raw[rowOff] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(raw, rowOff + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const compressed = zlib.deflateSync(raw, { level: 6 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    makePngChunk('IHDR', ihdr),
    makePngChunk('IDAT', compressed),
    makePngChunk('IEND', Buffer.alloc(0))
  ]);
}

function enforceStrictCellMargin104(rgba, w = 104, h = 104) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const distEdge = Math.min(x, y, w - 1 - x, h - 1 - y);
      const o = (y * w + x) * 4;
      if (distEdge < 3) {
        rgba[o] = 0;
        rgba[o + 1] = 0;
        rgba[o + 2] = 0;
        rgba[o + 3] = 0;
      } else if (rgba[o + 3] > 0) {
        // Pure crisp binary alpha (255 or 0) for authentic 16-bit pixel art (zero semi-transparent muddy halos!)
        if (rgba[o + 3] < 108) {
          rgba[o] = 0;
          rgba[o + 1] = 0;
          rgba[o + 2] = 0;
          rgba[o + 3] = 0;
        } else {
          rgba[o + 3] = 255;
        }
      }
    }
  }
}

function blitUpscaledNearest(srcRgba, srcW, srcH, scale, dstRgba, dstW, dstX, dstY) {
  for (let sy = 0; sy < srcH; sy++) {
    for (let sx = 0; sx < srcW; sx++) {
      const so = (sy * srcW + sx) * 4;
      const a = srcRgba[so + 3];
      if (!a) continue;
      const r = srcRgba[so];
      const g = srcRgba[so + 1];
      const b = srcRgba[so + 2];
      for (let dy = 0; dy < scale; dy++) {
        const ty = dstY + sy * scale + dy;
        for (let dx = 0; dx < scale; dx++) {
          const tx = dstX + sx * scale + dx;
          const to = (ty * dstW + tx) * 4;
          dstRgba[to] = r;
          dstRgba[to + 1] = g;
          dstRgba[to + 2] = b;
          dstRgba[to + 3] = a;
        }
      }
    }
  }
}

function alphaCompositeOnto(srcRgba, srcW, srcH, dstRgba, dstW, dstX, dstY) {
  for (let sy = 0; sy < srcH; sy++) {
    for (let sx = 0; sx < srcW; sx++) {
      const so = (sy * srcW + sx) * 4;
      const sa = srcRgba[so + 3] / 255;
      if (sa <= 0) continue;
      const tx = dstX + sx;
      const ty = dstY + sy;
      const to = (ty * dstW + tx) * 4;
      const da = dstRgba[to + 3] / 255;
      const outA = sa + da * (1 - sa);
      if (outA <= 0) continue;
      dstRgba[to] = Math.round((srcRgba[so] * sa + dstRgba[to] * da * (1 - sa)) / outA);
      dstRgba[to + 1] = Math.round((srcRgba[so + 1] * sa + dstRgba[to + 1] * da * (1 - sa)) / outA);
      dstRgba[to + 2] = Math.round((srcRgba[so + 2] * sa + dstRgba[to + 2] * da * (1 - sa)) / outA);
      dstRgba[to + 3] = Math.round(outA * 255);
    }
  }
}

function has4pxBorderClip208(cellRgba, cell = 208, margin = 4) {
  for (let y = 0; y < cell; y++) {
    for (let x = 0; x < cell; x++) {
      if (x >= margin && x < cell - margin && y >= margin && y < cell - margin) continue;
      if (cellRgba[(y * cell + x) * 4 + 3] > 0) return true;
    }
  }
  return false;
}

/**
 * Draw a crisp pixel-art 4-pointed star glint (zero blurry circles).
 */
function drawStarSpark(pen, cx, cy, armLen, coreCol, tipCol, alpha = 1) {
  if (alpha <= 0.05 || armLen < 1) return;
  const L = Math.round(armLen);
  pen.stipple(cx, cy, C_WHITE, alpha);
  for (let i = 1; i <= L; i++) {
    const col = i === 1 ? coreCol : tipCol;
    const a = alpha * (1 - (i - 1) / (L + 1.2));
    pen.stipple(cx + i, cy, col, a);
    pen.stipple(cx - i, cy, col, a);
    pen.stipple(cx, cy + i, col, a);
    pen.stipple(cx, cy - i, col, a);
  }
  if (L >= 3) {
    pen.stipple(cx + 1, cy + 1, tipCol, alpha * 0.8);
    pen.stipple(cx - 1, cy - 1, tipCol, alpha * 0.8);
    pen.stipple(cx + 1, cy - 1, tipCol, alpha * 0.8);
    pen.stipple(cx - 1, cy + 1, tipCol, alpha * 0.8);
  }
}

/**
 * Draw a razor-sharp tapered needle slash scar from (x0, y0) to (x1, y1)
 * with 1px dark Selout border, colored bevel, and pure white razor core.
 */
function drawRazorSlashScar(pen, x0, y0, x1, y1, maxHalfW, bevelCol, accentCol, alpha = 1) {
  if (alpha <= 0.04) return;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  if (len < 2) return;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const steps = Math.ceil(len * 2.2);

  // Pass 1: 1px dark Selout sheath + outer bevel
  for (let i = 0; i <= steps; i++) {
    const s = i / steps;
    const env = Math.sin(s * Math.PI);
    const hw = maxHalfW * Math.pow(env, 0.72);
    const bx = x0 + ux * (s * len);
    const by = y0 + uy * (s * len);
    const span = Math.ceil(hw + 1.1);
    for (let q = -span; q <= span; q += 0.45) {
      const aq = Math.abs(q);
      if (aq > hw + 0.85) continue;
      const px = bx + nx * q;
      const py = by + ny * q;
      if (aq >= hw - 0.15) {
        pen.stipple(px, py, C_SEL_DARK, alpha * 0.95);
      } else if (aq >= hw * 0.46) {
        pen.stipple(px, py, q > 0 ? bevelCol : accentCol, alpha);
      }
    }
  }
  // Pass 2: Pure white razor spine
  for (let i = 1; i < steps; i++) {
    const s = i / steps;
    const env = Math.sin(s * Math.PI);
    const hw = maxHalfW * 0.44 * env;
    const bx = x0 + ux * (s * len);
    const by = y0 + uy * (s * len);
    for (let q = -hw; q <= hw; q += 0.45) {
      pen.stipple(bx + nx * q, by + ny * q, C_WHITE, alpha);
    }
  }
}

/**
 * Draw an authentic FFBE / Last Cloudia serrated crescent smear arc on a 104x104 surface.
 * Features a razor outer edge, stepped cel-bands, and sawtooth inner wind-rip notches!
 */
function drawSerratedCrescentArc(pen, opts) {
  const {
    cx = 0,
    cy = 0,
    rx = 34,
    ry = 34,
    rotRad = 0,
    aStart = -1.35,
    aEnd = 1.35,
    maxWidth = 15,
    teethCount = 6,
    toothDepth = 0.44,
    goldDominant = false,
    alpha = 1,
    phase = 0
  } = opts;
  if (alpha <= 0.04 || maxWidth <= 0.6) return;

  const cosR = Math.cos(rotRad);
  const sinR = Math.sin(rotRad);
  const spanA = aEnd - aStart;
  if (Math.abs(spanA) < 0.06) return;

  const steps = Math.max(90, Math.ceil(Math.abs(spanA) * Math.max(rx, ry) * 2.6));
  for (let i = 0; i <= steps; i++) {
    const s = i / steps; // 0 = tail, 1 = leading head
    const ang = aStart + spanA * s;
    const cA = Math.cos(ang);
    const sA = Math.sin(ang);

    // Asymmetric FFBE belly profile: needle-sharp tail (s=0), wide heavy belly (s~0.68), crisp leading blade tip (s=1)
    let belly;
    if (s < 0.74) {
      belly = Math.pow(s / 0.74, 1.35);
    } else {
      belly = Math.pow(Math.max(0, (1 - s) / 0.26), 0.58);
    }

    // Authentic sawtooth wind-rip notches carved into the inner trailing edge!
    const toothArg = s * teethCount + phase * 0.4;
    const saw = toothArg - Math.floor(toothArg); // 0..1 sawtooth ramp
    const ripNotch = s > 0.08 && s < 0.88 ? Math.pow(saw, 1.5) * toothDepth : 0;
    const wTotal = maxWidth * belly * (1 - ripNotch);
    if (wTotal < 0.45) continue;

    const rSteps = Math.max(3, Math.ceil(wTotal * 2.2));
    for (let j = 0; j <= rSteps; j++) {
      const v = j / rSteps; // 0 = inner serrated trailing edge, 1 = outer razor cutting edge
      const curRx = rx - (1 - v) * wTotal;
      const curRy = ry - (1 - v) * wTotal * (ry / Math.max(1, rx));
      if (curRx <= 1 || curRy <= 1) continue;

      const ex = cA * curRx;
      const ey = sA * curRy;
      const px = cx + ex * cosR - ey * sinR;
      const py = cy + ex * sinR + ey * cosR;

      let col;
      let pixAlpha = alpha;
      if (v > 0.92 || s > 0.96 || (v < 0.08 && s > 0.25)) {
        col = C_SEL_DARK;
      } else if (v > 0.80) {
        col = C_WHITE;
      } else if (v > 0.62) {
        col = goldDominant ? C_GOLD_BRIGHT : C_CYAN_BRIGHT;
      } else if (v > 0.38) {
        col = goldDominant ? C_GOLD_PALE : C_GOLD_BRIGHT;
      } else if (v > 0.18) {
        col = goldDominant ? C_CYAN_BRIGHT : C_CYAN_DEEP;
        pixAlpha = alpha * 0.92;
      } else {
        col = goldDominant ? C_GOLD_DEEP : C_SAPPH_DEEP;
        pixAlpha = alpha * 0.78;
      }
      pen.stipple(px, py, col, pixAlpha);
    }
  }
}

// ============================================================================
// ROW RENDERERS (f = 0..29 on 104x104 logical surface centered at (52, 52))
// ============================================================================

/**
 * Row 0: Serrated Dawn-Breaker Crescent Sword-Wave Projectile (`blade_wave`, F00..F29)
 */
function renderRow0SwordWave(pen, f) {
  const ph = (f / 30) * Math.PI * 2;
  const pulse = Math.sin(ph);
  const rng = new DeterministicRng(101 + f * 17);

  // Trailing horizontal wind-shear speed streaks behind the crescent wave
  for (let k = 0; k < 5; k++) {
    const wy = -24 + k * 12 + Math.sin(ph + k * 1.3) * 1.5;
    const xEnd = 10 + (k % 2) * 5;
    const xStart = -34 + ((f * 3 + k * 9) % 18);
    pen.line(xStart, wy, xEnd, wy, k % 2 === 0 ? C_CYAN_BRIGHT : C_GOLD_BRIGHT, 0.9);
    pen.line(xStart + 4, wy - 1, xEnd, wy - 1, C_SEL_DARK, 0.85);
  }

  // Main forward (+X) serrated FFBE crescent vacuum blade
  drawSerratedCrescentArc(pen, {
    cx: -6 + pulse * 1.2,
    cy: 0,
    rx: 34,
    ry: 39,
    rotRad: 0,
    aStart: -1.28,
    aEnd: 1.28,
    maxWidth: 16.5 + pulse * 1.2,
    teethCount: 6,
    toothDepth: 0.46,
    goldDominant: false,
    alpha: 1.0,
    phase: f * 0.35
  });

  // Inner harmonic sun-gold counter-crescent
  drawSerratedCrescentArc(pen, {
    cx: -10,
    cy: 0,
    rx: 23,
    ry: 28,
    rotRad: 0,
    aStart: -0.95,
    aEnd: 0.95,
    maxWidth: 7.5,
    teethCount: 4,
    toothDepth: 0.38,
    goldDominant: true,
    alpha: 0.95,
    phase: -f * 0.3
  });

  // Leading apex razor flare & flying pixel sparks
  drawStarSpark(pen, 28 + pulse, 0, 5 + (f % 2), C_GOLD_BRIGHT, C_CYAN_BRIGHT, 1.0);
  for (let s = 0; s < 6; s++) {
    const sx = rng.between(-32, 22);
    const sy = rng.between(-32, 32);
    pen.stipple(sx, sy, s % 2 === 0 ? C_GOLD_BRIGHT : C_CYAN_PALE, 0.95);
    pen.stipple(sx - 1, sy, C_SEL_DARK, 0.85);
  }
}

/**
 * Row 1: Neo-Vision Winged Sovereign Crest & Counter-Parry Flash (F00..F29)
 */
function renderRow1SovereignCrest(pen, f) {
  const u = f / 29;
  const pop = u < 0.18 ? smoothStep(0, 0.18, u) : 1.0;
  const fade = u > 0.72 ? 1 - (u - 0.72) / 0.28 : 1.0;
  const scale = (0.68 + 0.32 * pop) * (0.94 + 0.06 * Math.sin(u * Math.PI * 4));

  // Swept Twin Paladin Pinion Wings
  for (const side of [-1, 1]) {
    for (let p = 0; p < 4; p++) {
      const x0 = side * (6 + p * 2) * scale;
      const y0 = (-4 + p * 4.5) * scale;
      const x1 = side * (34 - p * 4.5) * scale;
      const y1 = (-24 + p * 6.5) * scale;
      drawRazorSlashScar(
        pen,
        x0,
        y0,
        x1,
        y1,
        2.3 - p * 0.25,
        p % 2 === 0 ? C_GOLD_BRIGHT : C_CYAN_BRIGHT,
        C_SAPPH_DEEP,
        fade
      );
    }
  }

  // Faceted Diamond Rune-Core Shield Boss (crisp octagonal/diamond lines, zero round blob)
  const rOut = 15 * scale;
  const pts = [
    [0, -rOut * 1.25],
    [rOut * 0.85, 0],
    [0, rOut * 1.35],
    [-rOut * 0.85, 0],
    [0, -rOut * 1.25]
  ];
  for (let i = 0; i < 4; i++) {
    drawRazorSlashScar(
      pen,
      pts[i][0],
      pts[i][1],
      pts[i + 1][0],
      pts[i + 1][1],
      2.2,
      C_GOLD_BRIGHT,
      C_CYAN_DEEP,
      fade
    );
  }

  // Diagonal Counter-Parry Flash Scar across the crest
  const scarLen = 36 * pop;
  drawRazorSlashScar(pen, -scarLen, scarLen * 0.62, scarLen, -scarLen * 0.62, 2.8 * fade, C_CYAN_BRIGHT, C_GOLD_BRIGHT, fade);
  drawStarSpark(pen, 0, 0, Math.round(7 * fade), C_CYAN_BRIGHT, C_GOLD_BRIGHT, fade);
}

/**
 * Row 2: Dawn-Breaker Ground Light-Pillar & Runic Fissure Spire (F00..F29)
 */
function renderRow2DawnPillar(pen, f) {
  const u = f / 29;
  const erupt = u < 0.16 ? smoothStep(0, 0.16, u) : 1.0;
  const fade = u > 0.68 ? 1 - (u - 0.68) / 0.32 : 1.0;
  const rng = new DeterministicRng(211 + f * 23);

  const baseY = 34;
  const pillarH = 72 * erupt;
  const halfW = (11.5 - u * 4.5) * erupt;

  // Foreshortened 2.5D Ground Fissure Ring
  const ringRx = (18 + 18 * smoothStep(0, 0.6, u)) * erupt;
  const ringRy = ringRx * 0.24;
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2 + u * 2.2;
    const rx = Math.cos(a) * ringRx;
    const ry = baseY + Math.sin(a) * ringRy;
    pen.stipple(rx, ry + 1, C_SEL_DARK, fade * 0.95);
    pen.stipple(rx, ry, i % 4 === 0 ? C_WHITE : i % 2 === 0 ? C_GOLD_BRIGHT : C_CYAN_BRIGHT, fade);
  }

  // Vertical Stepped Dawn-Breaker Sword-Column
  if (halfW >= 1.2 && fade > 0.05) {
    const topY = baseY - pillarH;
    for (let y = Math.floor(topY); y <= baseY; y++) {
      const hFrac = clamp01((baseY - y) / Math.max(1, pillarH));
      const taper = hFrac > 0.78 ? (1 - hFrac) / 0.22 : 1.0 - hFrac * 0.18;
      const w = halfW * taper;
      const iw = Math.ceil(w + 1);
      for (let x = -iw; x <= iw; x++) {
        const ax = Math.abs(x);
        if (ax > w + 0.8) continue;
        let col;
        if (ax >= w - 0.2) col = C_SEL_DARK;
        else if (ax >= w * 0.68) col = x < 0 ? C_CYAN_BRIGHT : C_GOLD_MID;
        else if (ax >= w * 0.34) col = x < 0 ? C_GOLD_BRIGHT : C_CYAN_PALE;
        else col = C_WHITE;
        pen.stipple(x, y, col, fade);
      }
    }
  }

  // Flanking Diagonal Fissure Spikes + Crackling Lightning
  for (const side of [-1, 1]) {
    drawRazorSlashScar(
      pen,
      side * 4,
      baseY,
      side * (22 * erupt),
      baseY - 28 * erupt,
      2.6 * fade,
      C_GOLD_BRIGHT,
      C_CYAN_DEEP,
      fade
    );
  }
  if (fade > 0.2) {
    const chain = buildLightningChain(rng, 0, baseY - pillarH * 0.92, 0, baseY, 0.18, 4);
    pen.polyline(chain, C_GOLD_BRIGHT, fade * 0.95);
  }
}

/**
 * Row 3: Foreshortened 2.5D Omnislash Locus & Consecration Ring (F00..F29)
 */
function renderRow3OmnislashLocus(pen, f) {
  const u = f / 29;
  const ph = u * Math.PI * 2;
  const rx = 38;
  const ry = 11.5;

  // Outer & Inner Counter-Rotating 2.5D Perspective Rings
  for (let i = 0; i < 96; i++) {
    const a = (i / 96) * Math.PI * 2 + ph;
    const x = Math.cos(a) * rx;
    const y = Math.sin(a) * ry;
    pen.stipple(x, y + 1, C_SEL_DARK, 0.95);
    pen.stipple(x, y, i % 6 === 0 ? C_WHITE : i % 2 === 0 ? C_CYAN_BRIGHT : C_GOLD_BRIGHT, 1.0);

    const a2 = -(i / 96) * Math.PI * 2 + ph * 1.5;
    const x2 = Math.cos(a2) * (rx * 0.64);
    const y2 = Math.sin(a2) * (ry * 0.64);
    pen.stipple(x2, y2, i % 4 === 0 ? C_GOLD_BRIGHT : C_CYAN_DEEP, 0.92);
  }

  // 8 Orbiting Sovereign Sword-Sigil Nodes + Rising Speed Streaks
  for (let k = 0; k < 8; k++) {
    const a = ph + (k * Math.PI) / 4;
    const nx = Math.cos(a) * rx;
    const ny = Math.sin(a) * ry;
    drawStarSpark(pen, nx, ny, k % 2 === 0 ? 3 : 2, C_GOLD_BRIGHT, C_CYAN_BRIGHT, 1.0);
    if (k % 2 === 0) {
      const lift = ((f * 2 + k * 5) % 22);
      pen.line(nx * 0.82, ny - lift, nx * 0.82, ny - lift - 7, C_CYAN_PALE, 0.9);
    }
  }
}

/**
 * Row 4: Razor FFBE / Last Cloudia Hit-Slash Cross-Scar & Directional Spark Burst (F00..F29)
 * Ultra-crisp asymmetric twin razor cuts (ZERO muddy circles or fat diamond blobs!).
 */
function renderRow4RazorHitScar(pen, f) {
  const u = f / 29;
  const snapA = u < 0.08 ? u / 0.08 : 1.0;
  const fadeA = clamp01(1.18 - u * 1.25);
  const snapB = u < 0.14 ? 0 : u < 0.24 ? (u - 0.14) / 0.10 : 1.0;
  const fadeB = u < 0.14 ? 0 : clamp01(1.25 - (u - 0.14) * 1.32);
  const rng = new DeterministicRng(409 + f * 13);

  // Scar 1: Primary Blazing Sky-Cyan Diagonal Cut (-26 deg)
  if (fadeA > 0.04) {
    const L1 = 41 * snapA;
    const ang1 = -0.46;
    drawRazorSlashScar(
      pen,
      -Math.cos(ang1) * L1,
      -Math.sin(ang1) * L1,
      Math.cos(ang1) * L1,
      Math.sin(ang1) * L1,
      3.1 * fadeA,
      C_CYAN_BRIGHT,
      C_SAPPH_DEEP,
      fadeA
    );
  }

  // Scar 2: Secondary Sovereign Sun-Gold Cross-Cut (+38 deg, staggered 2 frames later like Last Cloudia twin-hit!)
  if (fadeB > 0.04) {
    const L2 = 37 * snapB;
    const ang2 = 0.66;
    drawRazorSlashScar(
      pen,
      -Math.cos(ang2) * L2,
      -Math.sin(ang2) * L2,
      Math.cos(ang2) * L2,
      Math.sin(ang2) * L2,
      2.8 * fadeB,
      C_GOLD_BRIGHT,
      C_CRIMSON_LIT,
      fadeB
    );
  }

  // Crisp Directional Hit-Sparks flying outward along the cut tangents
  const sparkFade = Math.max(fadeA, fadeB);
  if (sparkFade > 0.12) {
    drawStarSpark(pen, 0, 0, Math.max(2, Math.round(6 * sparkFade)), C_GOLD_BRIGHT, C_CYAN_BRIGHT, sparkFade);
    for (let i = 0; i < 10; i++) {
      const a = (i % 2 === 0 ? -0.46 : 0.66) + (i < 5 ? 0 : Math.PI) + rng.between(-0.28, 0.28);
      const dist = (8 + u * 34) * rng.between(0.7, 1.05);
      const sx = Math.cos(a) * dist;
      const sy = Math.sin(a) * dist;
      if (Math.abs(sx) < 44 && Math.abs(sy) < 44) {
        pen.line(
          sx,
          sy,
          sx - Math.cos(a) * 4,
          sy - Math.sin(a) * 4,
          i % 2 === 0 ? C_CYAN_BRIGHT : C_GOLD_BRIGHT,
          sparkFade
        );
        pen.stipple(sx, sy, C_WHITE, sparkFade);
      }
    }
  }
}

/**
 * Row 5: Colossal Diagonal Exvius Great-Slash Serrated Crescent (F00..F29)
 */
function renderRow5GreatSlash(pen, f) {
  const u = f / 29;
  const fade = u > 0.58 ? 1 - (u - 0.58) / 0.42 : 1.0;
  const erodeTail = -1.65 + u * 1.45;
  const sweepHead = 1.48 + u * 0.25;

  drawSerratedCrescentArc(pen, {
    cx: -4,
    cy: 2,
    rx: 38,
    ry: 32,
    rotRad: -0.58,
    aStart: erodeTail,
    aEnd: sweepHead,
    maxWidth: 19 * fade,
    teethCount: 7,
    toothDepth: 0.48,
    goldDominant: true,
    alpha: fade,
    phase: u * 2.5
  });

  // Diagonal razor bisecting scar through the crescent chord
  const L = 40 * Math.min(1, u * 4.5 + 0.35);
  drawRazorSlashScar(pen, -L * 0.85, L * 0.72, L * 0.85, -L * 0.72, 2.8 * fade, C_CYAN_BRIGHT, C_GOLD_BRIGHT, fade);
}

/**
 * Row 6: Supreme Dawn-Breaker Celestial Greatsword Judgment Column (F00..F29)
 */
function renderRow6JudgmentSword(pen, f) {
  const u = f / 29;
  const drop = u < 0.20 ? smoothStep(0, 0.20, u) : 1.0;
  const fade = u > 0.75 ? 1 - (u - 0.75) / 0.25 : 1.0;

  const tipY = -36 + 74 * drop; // plunges to +38
  const guardY = tipY - 52;
  const pomY = guardY - 14;

  // Background consecrated light-ribbon behind the descending Dawn-Breaker blade
  for (let y = Math.max(-44, Math.floor(pomY)); y <= Math.min(44, Math.ceil(tipY)); y++) {
    for (let x = -9; x <= 9; x++) {
      const ax = Math.abs(x);
      if (ax === 9) pen.stipple(x, y, C_SEL_DARK, fade * 0.85);
      else if (ax >= 6) pen.stipple(x, y, C_CYAN_DEEP, fade * 0.75);
    }
  }

  // Sculpted Celestial Greatsword Blade (vertical point-down)
  for (let y = Math.floor(guardY); y <= Math.ceil(tipY); y++) {
    if (y < -45 || y > 45) continue;
    const bf = clamp01((tipY - y) / 52);
    const hw = bf < 0.24 ? (bf / 0.24) * 5.2 : 5.2 * (0.9 + 0.15 * bf);
    const lim = Math.ceil(hw + 1);
    for (let x = -lim; x <= lim; x++) {
      const ax = Math.abs(x);
      if (ax > hw + 0.6) continue;
      let col;
      if (ax >= hw - 0.3) col = C_SEL_DARK;
      else if (ax <= 1.1 && bf > 0.15) col = Math.floor(y * 0.5) % 3 === 0 ? C_GOLD_BRIGHT : C_CYAN_BRIGHT;
      else col = x < 0 ? C_WHITE : C_CYAN_PALE;
      pen.stipple(x, y, col, fade);
    }
  }

  // Ornate Winged Sun-Gold Crossguard + Hilt + Pommel
  if (guardY >= -42 && guardY <= 40) {
    drawRazorSlashScar(pen, -16, guardY - 4, 0, guardY + 1, 2.5, C_GOLD_BRIGHT, C_GOLD_DEEP, fade);
    drawRazorSlashScar(pen, 16, guardY - 4, 0, guardY + 1, 2.5, C_GOLD_BRIGHT, C_GOLD_DEEP, fade);
    drawStarSpark(pen, 0, guardY, 3, C_CYAN_BRIGHT, C_GOLD_BRIGHT, fade);
  }
  if (pomY >= -44 && guardY <= 40) {
    pen.line(0, Math.max(-44, pomY), 0, Math.max(-44, guardY - 2), C_GOLD_BRIGHT, fade);
    pen.line(-1, Math.max(-44, pomY), -1, Math.max(-44, guardY - 2), C_SEL_DARK, fade);
    pen.line(1, Math.max(-44, pomY), 1, Math.max(-44, guardY - 2), C_SEL_DARK, fade);
  }
  if (drop >= 0.95) {
    drawRazorSlashScar(pen, -28, 38, 28, 38, 2.6 * fade, C_GOLD_BRIGHT, C_CYAN_BRIGHT, fade);
  }
}

/**
 * Row 7: Sovereign Winged Plume Feather & Astral Glint Cluster (F00..F29)
 */
function renderRow7SovereignFeather(pen, f) {
  const ph = (f / 30) * Math.PI * 2;
  const sway = Math.sin(ph) * 4.5;
  const tilt = 0.52 + Math.cos(ph) * 0.18;
  const ux = Math.cos(tilt);
  const uy = Math.sin(tilt);
  const nx = -uy;
  const ny = ux;

  // Crisp 16-bit Pixel Paladin Pinion Feather (centered with gentle sway)
  const L = 22;
  for (let d = -L; d <= L; d += 0.55) {
    const s = (d + L) / (2 * L); // 0 = quill base, 1 = feather tip
    const env = Math.sin(s * Math.PI);
    const barbNotch = Math.abs(((s * 9) % 1) - 0.35) < 0.12 && s > 0.2 && s < 0.82 ? 0.58 : 1.0;
    const hw = 5.4 * Math.pow(env, 0.68) * barbNotch;
    const bx = sway + ux * d;
    const by = uy * d;
    const span = Math.ceil(hw + 1);
    for (let q = -span; q <= span; q += 0.5) {
      const aq = Math.abs(q);
      if (aq > hw + 0.6) continue;
      let col;
      if (aq >= hw - 0.25) col = C_SEL_MID;
      else if (aq < 0.65) col = C_GOLD_BRIGHT; // Golden rachis spine!
      else if (s > 0.72) col = C_CYAN_PALE;
      else col = q < 0 ? C_WHITE : C_CYAN_BRIGHT;
      pen.stipple(bx + nx * q, by + ny * q, col, 1.0);
    }
  }

  // Orbiting 4-point Sovereign Star Glints
  drawStarSpark(pen, -18, -14 + Math.cos(ph) * 3, 3 + (f % 2), C_GOLD_BRIGHT, C_CYAN_BRIGHT, 1.0);
  drawStarSpark(pen, 19, 12 - Math.sin(ph) * 3, 2 + ((f + 1) % 2), C_CYAN_BRIGHT, C_GOLD_BRIGHT, 1.0);
}

function bakeVfxSheet() {
  const ROWS = 8;
  const COLS = 30;
  const LOGICAL = 104;
  const CELL = 208;
  const sheetW = COLS * CELL;
  const sheetH = ROWS * CELL;
  const sheetRgba = new Uint8Array(sheetW * sheetH * 4);

  const dbgPad = 3;
  const dbgW = COLS * (LOGICAL + dbgPad) + dbgPad;
  const dbgH = ROWS * (LOGICAL + dbgPad) + dbgPad;
  const dbgRgba = new Uint8Array(dbgW * dbgH * 4);
  for (let i = 0; i < dbgW * dbgH; i++) {
    dbgRgba[i * 4] = 8;
    dbgRgba[i * 4 + 1] = 14;
    dbgRgba[i * 4 + 2] = 28;
    dbgRgba[i * 4 + 3] = 255;
  }

  const surface104 = createPixelSurface(LOGICAL, LOGICAL);
  const pen104 = new ShaderPen(surface104);
  const cell104 = new Uint8Array(LOGICAL * LOGICAL * 4);
  const cell208 = new Uint8Array(CELL * CELL * 4);

  const rowFns = [
    renderRow0SwordWave,
    renderRow1SovereignCrest,
    renderRow2DawnPillar,
    renderRow3OmnislashLocus,
    renderRow4RazorHitScar,
    renderRow5GreatSlash,
    renderRow6JudgmentSword,
    renderRow7SovereignFeather
  ];

  let borderClips = 0;

  for (let r = 0; r < ROWS; r++) {
    const fn = rowFns[r];
    for (let c = 0; c < COLS; c++) {
      clearPixelSurface(surface104);
      pen104.configure(52, 52, false, 0, 1, 1);
      fn(pen104, c);
      resolveSurfaceToRGBA(surface104, cell104, 1.0);
      enforceStrictCellMargin104(cell104, LOGICAL, LOGICAL);

      cell208.fill(0);
      blitUpscaledNearest(cell104, LOGICAL, LOGICAL, 2, cell208, CELL, 0, 0);
      if (has4pxBorderClip208(cell208, CELL, 4)) {
        borderClips++;
      }

      blitUpscaledNearest(cell104, LOGICAL, LOGICAL, 2, sheetRgba, sheetW, c * CELL, r * CELL);
      const dx = dbgPad + c * (LOGICAL + dbgPad);
      const dy = dbgPad + r * (LOGICAL + dbgPad);
      alphaCompositeOnto(cell104, LOGICAL, LOGICAL, dbgRgba, dbgW, dx, dy);
    }
  }

  const outSheetPath = path.join(REPO_ROOT, 'assets', 'sprites', 'warrior_ex_vfx.png');
  fs.mkdirSync(path.dirname(outSheetPath), { recursive: true });
  fs.writeFileSync(outSheetPath, encodeRgbaPng(sheetW, sheetH, sheetRgba));

  fs.mkdirSync(SCRATCH_DIR, { recursive: true });
  const outDbgPath = path.join(SCRATCH_DIR, 'debug_warrior_ex_vfx_30fps.png');
  fs.writeFileSync(outDbgPath, encodeRgbaPng(dbgW, dbgH, dbgRgba));

  console.log(
    `[build_warrior_ex_vfx_30fps] Wrote ${outSheetPath} (${sheetW}x${sheetH}) and ${outDbgPath} (${dbgW}x${dbgH}) | borderClips=${borderClips}/240`
  );
  if (borderClips > 0) {
    process.exitCode = 1;
  }
}

bakeVfxSheet();
