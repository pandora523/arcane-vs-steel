#!/usr/bin/env node
/**
 * Endless Crusade — Dedicated 30fps HD-2D VFX & Relic HUD Icon Atlas Builder
 * Output: `assets/sprites/endless_crusade_vfx.png`
 * Layout: 12 cols x 8 rows @ 128x128 (`1536x1024` lossless RGBA PNG)
 *         Authored at `64x64` logical pixels -> exact `2x` nearest-neighbor upscale.
 *
 * Mandatory Invariants:
 *   - 100% lossless nearest-neighbor pixel art, ZERO external APIs, ZERO npm dependencies
 *   - ZERO `ctx.rotate()` / `ctx.ellipse()` / `ctx.arc()`, ZERO Unicode emojis
 *   - Strict >= 2 logical px (>= 4 output px) transparent inner safety margin on all 96 cells
 *   - Crisp `#0d0f1c` dark selout outlines on coins, shards, boss gate, and HUD/Relic icons
 *
 * 8-Row Atlas Specification (12 cols x 8 rows @ 128x128):
 *   Row 0: GOLD_COIN_SPIN       (12f) — Sovereign Gold Coin 360-deg spin with stamped crown crest & glint sweep
 *   Row 1: ASTRAL_SHARD_SPIN    (12f) — Faceted diamond-crystal Astral Shard rotation with prismatic facets & star motes
 *   Row 2: TAP_SMITE_SKYBOLT    (12f) — Arcane Tap-Smite telegraph (f0-1), piercing sky-bolt (f2-5), ground burst (f6-11)
 *   Row 3: CRIT_STARBURST       (12f) — Crisp 8-point pixel Crit Starburst + expanding diamond shockwave ring
 *   Row 4: GOLD_FEVER_BURST     (12f) — Radiant Gold Fever Overdrive Burst: golden sunburst, crown flares & diamond sparks
 *   Row 5: COMPANION_AURA_RING  (12f) — 2.5D isometric oval floor rings (0..3 Summon, 4..7 Heal, 8..11 Attack Buff)
 *   Row 6: BOSS_GATE_PORTAL     (12f) — Gothic crowned obsidian Boss Gate arch with swirling crimson-gold vortex & runes
 *   Row 7: HUD_ICONS            (12 static icons) — Coin, Shard, Blade, Tap Sigil, Magnet, Crit, Haste, Aegis, Banner, Crown, Siphon, Chest
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

import {
  createPixelSurface,
  clearPixelSurface,
  resolveSurfaceToRGBA,
  ShaderPen,
  buildColorRamp,
  fbmNoise2D,
  buildLightningChain,
  DeterministicRng,
  clamp01
} from '../src/engine/ArcaneShaderFX.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const OUT_PNG = path.join(REPO_ROOT, 'assets/sprites/endless_crusade_vfx.png');

const COLS = 12;
const ROWS = 8;
const LOGICAL_SZ = 64;
const SCALE = 2;
const CELL_SZ = LOGICAL_SZ * SCALE; // 128
const SHEET_W = COLS * CELL_SZ; // 1536
const SHEET_H = ROWS * CELL_SZ; // 1024
const SAFE_LPX = 2; // >= 4 output px transparent inner safety margin on every cell
const SAFE_OUT_PX = SAFE_LPX * SCALE; // 4

// =========================================================================
// MASTER NEO-VISION EX COLOR RAMPS
// =========================================================================
const RAMP_GOLD = buildColorRamp(
  ['#0d0f1c', '#451a03', '#92400e', '#b45309', '#d97706', '#facc15', '#fef08a', '#ffffff'],
  8
);
const COL_SELOUT = RAMP_GOLD[0]; // #0d0f1c dark selout outline

const RAMP_ASTRAL = buildColorRamp(
  ['#0d0f1c', '#2e1065', '#4c1d95', '#7c3aed', '#a855f7', '#38bdf8', '#bae6fd', '#ffffff'],
  8
);
const RAMP_CYAN_BOLT = buildColorRamp(
  ['#082f49', '#0369a1', '#0284c7', '#38bdf8', '#7dd3fc', '#bae6fd', '#fef08a', '#ffffff'],
  8
);
const RAMP_CRIT = buildColorRamp(
  ['#450a0a', '#991b1b', '#ef4444', '#f97316', '#fb923c', '#facc15', '#fef08a', '#ffffff'],
  8
);
const RAMP_EMERALD = buildColorRamp(
  ['#052e16', '#065f46', '#059669', '#10b981', '#34d399', '#6ee7b7', '#d1fae5', '#ffffff'],
  8
);
const RAMP_CRIMSON = buildColorRamp(
  ['#1f0510', '#500724', '#881337', '#be123c', '#e11d48', '#fb7185', '#fecdd3', '#ffffff'],
  8
);
const RAMP_OBSIDIAN = buildColorRamp(
  ['#0d0f1c', '#17192d', '#242742', '#373c61', '#525987', '#7b84b8', '#b8c0e6', '#eef2ff'],
  8
);
const RAMP_STEEL = buildColorRamp(
  ['#0d0f1c', '#1e293b', '#334155', '#64748b', '#94a3b8', '#cbd5e1', '#f1f5f9', '#ffffff'],
  8
);
const RAMP_TEAL_WIND = buildColorRamp(
  ['#042f2e', '#0f766e', '#14b8a6', '#2dd4bf', '#38bdf8', '#bae6fd', '#fef08a', '#ffffff'],
  8
);
const RAMP_LEATHER = buildColorRamp(
  ['#0d0f1c', '#29150e', '#4a2518', '#6b3624', '#8c4b32', '#b36b4c', '#d99b7c', '#fef08a'],
  8
);

// =========================================================================
// LOSSLESS PNG ENCODER (BUILT-IN node:zlib + CRC32)
// =========================================================================
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
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

function encodePngRgba(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowOff = y * (stride + 1);
    raw[rowOff] = 0;
    rgba.copy(raw, rowOff + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 6; // RGBA color type
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    makePngChunk('IHDR', ihdr),
    makePngChunk('IDAT', idat),
    makePngChunk('IEND', Buffer.alloc(0))
  ]);
}

// =========================================================================
// PURE INTEGER PIXEL RASTERIZATION HELPERS (ZERO canvas rotate/ellipse/arc)
// =========================================================================
function inSafe(ix, iy, pad = SAFE_LPX) {
  return ix >= pad && ix < LOGICAL_SZ - pad && iy >= pad && iy < LOGICAL_SZ - pad;
}

function setPx(pen, x, y, col, alpha = 1, glow = 0) {
  const ix = Math.round(x);
  const iy = Math.round(y);
  if (!inSafe(ix, iy, SAFE_LPX)) return;
  if (col) {
    pen.writeRawStipple(ix, iy, col, alpha);
  }
  if (glow > 0.02 && col) {
    pen.writeRawGlow(ix, iy, col, glow);
  }
}

function distToSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy || 1e-6;
  const t = clamp01(((px - ax) * dx + (py - ay) * dy) / lenSq);
  const cx = ax + dx * t;
  const cy = ay + dy * t;
  return { d: Math.hypot(px - cx, py - cy), t };
}

function drawThickSeg(pen, ax, ay, bx, by, rStart, rEnd, colFn) {
  const maxR = Math.max(rStart, rEnd) + 1.5;
  const minX = Math.max(SAFE_LPX, Math.floor(Math.min(ax, bx) - maxR));
  const maxX = Math.min(LOGICAL_SZ - 1 - SAFE_LPX, Math.ceil(Math.max(ax, bx) + maxR));
  const minY = Math.max(SAFE_LPX, Math.floor(Math.min(ay, by) - maxR));
  const maxY = Math.min(LOGICAL_SZ - 1 - SAFE_LPX, Math.ceil(Math.max(ay, by) + maxR));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const { d, t } = distToSeg(x, y, ax, ay, bx, by);
      const rad = rStart + (rEnd - rStart) * t;
      if (d <= rad) {
        colFn(x, y, d, rad, t);
      }
    }
  }
}

function drawLinePx(pen, x0, y0, x1, y1, col, alpha = 1, glow = 0) {
  let ix0 = Math.round(x0);
  let iy0 = Math.round(y0);
  const ix1 = Math.round(x1);
  const iy1 = Math.round(y1);
  const dx = Math.abs(ix1 - ix0);
  const dy = -Math.abs(iy1 - iy0);
  const sx = ix0 < ix1 ? 1 : -1;
  const sy = iy0 < iy1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    setPx(pen, ix0, iy0, col, alpha, glow);
    if (ix0 === ix1 && iy0 === iy1) break;
    const e2 = err * 2;
    if (e2 >= dy) {
      err += dy;
      ix0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      iy0 += sy;
    }
  }
}

function pointInPoly(px, py, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0];
    const yi = pts[i][1];
    const xj = pts[j][0];
    const yj = pts[j][1];
    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function fillPolygon(pen, pts, fillFn) {
  let minX = LOGICAL_SZ;
  let maxX = 0;
  let minY = LOGICAL_SZ;
  let maxY = 0;
  for (const [px, py] of pts) {
    if (px < minX) minX = px;
    if (px > maxX) maxX = px;
    if (py < minY) minY = py;
    if (py > maxY) maxY = py;
  }
  const ix0 = Math.max(SAFE_LPX, Math.floor(minX));
  const ix1 = Math.min(LOGICAL_SZ - 1 - SAFE_LPX, Math.ceil(maxX));
  const iy0 = Math.max(SAFE_LPX, Math.floor(minY));
  const iy1 = Math.min(LOGICAL_SZ - 1 - SAFE_LPX, Math.ceil(maxY));
  for (let y = iy0; y <= iy1; y++) {
    for (let x = ix0; x <= ix1; x++) {
      if (pointInPoly(x + 0.01, y + 0.01, pts)) {
        fillFn(x, y);
      }
    }
  }
}

function fillOvalPx(pen, cx, cy, rx, ry, fillFn) {
  const ix0 = Math.max(SAFE_LPX, Math.floor(cx - rx - 1));
  const ix1 = Math.min(LOGICAL_SZ - 1 - SAFE_LPX, Math.ceil(cx + rx + 1));
  const iy0 = Math.max(SAFE_LPX, Math.floor(cy - ry - 1));
  const iy1 = Math.min(LOGICAL_SZ - 1 - SAFE_LPX, Math.ceil(cy + ry + 1));
  for (let y = iy0; y <= iy1; y++) {
    for (let x = ix0; x <= ix1; x++) {
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      const r2 = nx * nx + ny * ny;
      if (r2 <= 1.0) {
        fillFn(x, y, nx, ny, Math.sqrt(r2));
      }
    }
  }
}

function drawStar4(pen, cx, cy, armLen, colOuter, colCore, glow = 0.14) {
  const icx = Math.round(cx);
  const icy = Math.round(cy);
  for (let d = -armLen; d <= armLen; d++) {
    const ad = Math.abs(d);
    const col = ad <= Math.max(1, Math.floor(armLen * 0.38)) ? colCore : colOuter;
    const a = clamp01(1 - ad / (armLen + 1.25));
    setPx(pen, icx + d, icy, col, a, glow * a);
    setPx(pen, icx, icy + d, col, a, glow * a);
  }
  const diag = Math.max(1, Math.floor(armLen * 0.34));
  for (let dy = -diag; dy <= diag; dy++) {
    for (let dx = -diag; dx <= diag; dx++) {
      const m = Math.abs(dx) + Math.abs(dy);
      if (m <= diag + 1) {
        setPx(pen, icx + dx, icy + dy, m <= 1 ? colCore : colOuter, 1.0, glow);
      }
    }
  }
}

function drawDiamond(pen, cx, cy, rad, colOuter, colCore, glow = 0.1) {
  const icx = Math.round(cx);
  const icy = Math.round(cy);
  const rInt = Math.ceil(rad);
  for (let dy = -rInt; dy <= rInt; dy++) {
    for (let dx = -rInt; dx <= rInt; dx++) {
      const m = Math.abs(dx) + Math.abs(dy);
      if (m <= rad) {
        const col = m <= rad * 0.45 ? colCore : colOuter;
        setPx(pen, icx + dx, icy + dy, col, 1.0, glow * (1 - m / (rad + 1)));
      }
    }
  }
}

function drawPlusCross(pen, cx, cy, arm, colOuter, colCore, glow = 0.12) {
  const icx = Math.round(cx);
  const icy = Math.round(cy);
  for (let d = -arm; d <= arm; d++) {
    const col = Math.abs(d) <= Math.max(0, arm - 1) ? colCore : colOuter;
    setPx(pen, icx + d, icy, col, 1.0, glow);
    setPx(pen, icx, icy + d, col, 1.0, glow);
  }
}

function drawForkedBolt(pen, x0, y0, x1, y1, jitter, seed, ramp, coreThick = 1.0, glow = 0.16, forks = 2) {
  const rng = new DeterministicRng(seed);
  const dist = Math.hypot(x1 - x0, y1 - y0) || 1;
  const jitterFrac = Math.min(0.42, Math.max(0.08, jitter / dist));
  const rawPts = buildLightningChain(rng, x0, y0, x1, y1, jitterFrac, 3);
  const clampSafe = (v) => Math.max(SAFE_LPX + 2, Math.min(LOGICAL_SZ - SAFE_LPX - 3, v));
  const pts = rawPts.map(([x, y]) => ({ x: clampSafe(x), y: clampSafe(y) }));

  // Pass 1: Deep saturated electric rim so bolts pop over both dark & bright stages
  for (let i = 0; i < pts.length - 1; i++) {
    drawThickSeg(pen, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, coreThick + 1.45, coreThick + 1.15, (x, y) => {
      setPx(pen, x, y, ramp[2], 0.95, glow * 0.4);
    });
  }
  // Pass 2: Bright mid-voltage body
  for (let i = 0; i < pts.length - 1; i++) {
    drawThickSeg(pen, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, coreThick + 0.6, coreThick + 0.45, (x, y) => {
      setPx(pen, x, y, ramp[4], 1.0, glow * 0.7);
    });
  }
  // Pass 3: Razor white-gold core
  for (let i = 0; i < pts.length - 1; i++) {
    drawThickSeg(
      pen,
      pts[i].x,
      pts[i].y,
      pts[i + 1].x,
      pts[i + 1].y,
      Math.max(0.55, coreThick * 0.52),
      Math.max(0.45, coreThick * 0.42),
      (x, y) => {
        setPx(pen, x, y, ramp[7], 1.0, glow);
      }
    );
  }

  for (let b = 0; b < forks; b++) {
    const idx = 2 + Math.floor(rng.nextFloat() * Math.max(1, pts.length - 4));
    const root = pts[idx];
    const dirAng = Math.atan2(y1 - y0, x1 - x0) + (b % 2 === 0 ? 0.58 : -0.58) + (rng.nextFloat() - 0.5) * 0.24;
    const len = 9 + rng.nextFloat() * 12;
    const bx = clampSafe(root.x + Math.cos(dirAng) * len);
    const by = clampSafe(root.y + Math.sin(dirAng) * len);
    const rawFork = buildLightningChain(rng, root.x, root.y, bx, by, 0.24, 2);
    for (let i = 0; i < rawFork.length - 1; i++) {
      const fx0 = clampSafe(rawFork[i][0]);
      const fy0 = clampSafe(rawFork[i][1]);
      const fx1 = clampSafe(rawFork[i + 1][0]);
      const fy1 = clampSafe(rawFork[i + 1][1]);
      drawThickSeg(pen, fx0, fy0, fx1, fy1, 1.25, 0.55, (x, y, d) => {
        setPx(pen, x, y, d <= 0.5 ? ramp[7] : d <= 0.9 ? ramp[4] : ramp[2], 0.96, glow * 0.6);
      });
    }
  }
}

/**
 * Crisp 4-connected `#0d0f1c` dark selout outline pass over current opaque `albedo` pixels.
 * Strictly respects `SAFE_LPX` so outlines never clip cell edges.
 */
function applyDarkSelout(surface, outlineColor = COL_SELOUT, pad = SAFE_LPX) {
  const w = surface.width;
  const h = surface.height;
  const alb = surface.albedo;
  const emi = surface.emissive;
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if ((alb[i] >>> 24) > 0) mask[i] = 1;
  }
  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1]
  ];
  for (let y = pad; y < h - pad; y++) {
    for (let x = pad; x < w - pad; x++) {
      const idx = y * w + x;
      if (mask[idx]) continue;
      let touches = false;
      for (const [dx, dy] of dirs) {
        if (mask[(y + dy) * w + (x + dx)]) {
          touches = true;
          break;
        }
      }
      if (touches) {
        alb[idx] = outlineColor >>> 0;
        emi[idx] = 0;
        if (x < surface.dirtyMinX) surface.dirtyMinX = x;
        if (x > surface.dirtyMaxX) surface.dirtyMaxX = x;
        if (y < surface.dirtyMinY) surface.dirtyMinY = y;
        if (y > surface.dirtyMaxY) surface.dirtyMaxY = y;
      }
    }
  }
}

// Shared royal crown mask in normalized coin face coords `(u, v)` in `[-1..1]`
function isInCoinCrown(u, v) {
  if (v >= 0.16 && v <= 0.34 && Math.abs(u) <= 0.44) return true;
  if (v >= -0.34 && v <= 0.18) {
    const halfW = 0.04 + ((v + 0.34) / 0.52) * 0.18;
    if (Math.abs(u) <= halfW) return true;
  }
  if (v >= -0.22 && v <= 0.18) {
    const t = (v + 0.22) / 0.4;
    const centerL = -0.44 + t * 0.14;
    const halfWL = 0.045 + t * 0.105;
    if (Math.abs(u - centerL) <= halfWL) return true;
    const centerR = 0.44 - t * 0.14;
    if (Math.abs(u - centerR) <= halfWL) return true;
  }
  if (Math.hypot(u, v + 0.38) <= 0.078) return true;
  if (Math.hypot(u + 0.46, v + 0.24) <= 0.072) return true;
  if (Math.hypot(u - 0.46, v + 0.24) <= 0.072) return true;
  return false;
}

// =========================================================================
// ROW 0: GOLD_COIN_SPIN (12f seamless 360-deg rotation)
// =========================================================================
function renderRow0GoldCoinSpin(pen, surface, frame) {
  const theta = (frame / COLS) * Math.PI * 2;
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  const cx = 31.5;
  const cy = 31.5;
  const R = 20.5;
  const halfThick = 2.7;

  const frontSign = cosT >= 0 ? 1 : -1;
  const xFront = cx + frontSign * halfThick * sinT;
  const xBack = cx - frontSign * halfThick * sinT;
  const absCos = Math.abs(cosT);
  const faceRx = absCos * R;

  // 1. Cylindrical coin body + milled golden reeding edge
  const yMin = Math.ceil(cy - R);
  const yMax = Math.floor(cy + R);
  for (let y = yMin; y <= yMax; y++) {
    const dy = y - cy;
    const spanY = Math.sqrt(Math.max(0, R * R - dy * dy));
    const dxCap = spanY * absCos;
    const xLeft = Math.floor(Math.min(xFront, xBack) - dxCap);
    const xRight = Math.ceil(Math.max(xFront, xBack) + dxCap);
    const vNorm = dy / R;
    const reedStripe = (y & 1) === 0 ? 1 : 0;

    for (let x = xLeft; x <= xRight; x++) {
      const edgeU = xRight > xLeft ? (x - xLeft) / (xRight - xLeft) : 0.5;
      const topLight = -vNorm * 0.62 + (0.5 - Math.abs(edgeU - 0.36)) * 0.65;
      const sheen = topLight + (reedStripe ? 0.14 : -0.12);
      let idx;
      if (sheen > 0.56) idx = 6; // #fef08a
      else if (sheen > 0.26) idx = 5; // #facc15
      else if (sheen > -0.08) idx = 4; // #d97706
      else idx = 2; // #92400e
      setPx(pen, x, y, RAMP_GOLD[idx], 1.0, 0);
    }
  }

  // 2. Front-facing coin cap with beveled rim, stamped crown crest & sleek glint sweep
  if (faceRx >= 1.6) {
    const sweepPhase = (frame % 6) / 6;
    const sweepCenter = -1.1 + sweepPhase * 2.2;
    const minX = Math.max(SAFE_LPX + 1, Math.floor(xFront - faceRx));
    const maxX = Math.min(LOGICAL_SZ - SAFE_LPX - 2, Math.ceil(xFront + faceRx));

    for (let y = yMin; y <= yMax; y++) {
      const v = (y - cy) / R;
      for (let x = minX; x <= maxX; x++) {
        const u = (x - xFront) / faceRx;
        const r = Math.hypot(u, v);
        if (r > 1.0) continue;

        const light = -u * 0.58 - v * 0.72;
        let idx = 5;

        if (r >= 0.79) {
          if (light > 0.42) idx = 6;
          else if (light > -0.05) idx = 5;
          else if (light > -0.45) idx = 4;
          else idx = 2;
        } else if (r >= 0.71) {
          idx = light > 0.15 ? 2 : light > -0.25 ? 4 : 6;
        } else {
          const wellTone = light * 0.55 + 0.25;
          idx = wellTone > 0.48 ? 5 : wellTone > -0.05 ? 4 : 2;

          if (faceRx > 9.5 && Math.abs(r - 0.62) < 0.055) {
            const ang = Math.atan2(v, u);
            if (Math.cos(ang * 12) > 0.76) {
              idx = light > 0 ? 6 : 5;
            }
          }

          // Embossed Royal Crown Crest
          const inCrown = isInCoinCrown(u, v);
          const inShadow = !inCrown && isInCoinCrown(u - 0.06, v - 0.07);
          if (inShadow) {
            idx = 2;
          } else if (inCrown) {
            const topEdge = !isInCoinCrown(u - 0.07, v - 0.07);
            const botEdge = !isInCoinCrown(u + 0.06, v + 0.06);
            const isBandJewel = v >= 0.20 && v <= 0.30 && (Math.abs(u) < 0.07 || Math.abs(Math.abs(u) - 0.26) < 0.06);
            if (isBandJewel) idx = 7;
            else if (topEdge) idx = 6;
            else if (botEdge) idx = 4;
            else idx = 5;
          }
        }

        // Sleek diagonal specular glint sweep (cleanly confined inside inner well & rim edge)
        const diag = u * 0.68 + v * 0.73;
        const dSweep = Math.abs(diag - sweepCenter);
        if (dSweep < 0.065 && r < 0.88) {
          idx = 7;
        } else if (dSweep < 0.16 && r < 0.92 && idx < 6) {
          idx = 6;
        }

        setPx(pen, x, y, RAMP_GOLD[idx], 1.0, 0);
      }
    }
  }

  applyDarkSelout(surface, COL_SELOUT, SAFE_LPX);

  if (frame === 0 || frame === 6) {
    drawStar4(pen, cx - 12, cy - 13, 4, RAMP_GOLD[5], RAMP_GOLD[7], 0.18);
  } else if (frame === 1 || frame === 7) {
    drawStar4(pen, cx - 8, cy - 16, 3, RAMP_GOLD[5], RAMP_GOLD[7], 0.15);
  } else if (frame === 3 || frame === 9) {
    drawStar4(pen, cx, cy - 14, 4, RAMP_GOLD[5], RAMP_GOLD[7], 0.22);
  } else if (frame === 5 || frame === 11) {
    drawStar4(pen, cx + 11, cy + 12, 3, RAMP_GOLD[4], RAMP_GOLD[7], 0.14);
  }
}

// =========================================================================
// ROW 1: ASTRAL_SHARD_SPIN (12f seamless faceted crystal rotation + motes)
// =========================================================================
function renderRow1AstralShardSpin(pen, surface, frame) {
  const phase = (frame / COLS) * Math.PI * 2;
  const cx = 31.5;
  const cy = 31.5 + Math.sin(phase) * 1.1;
  const tilt = 0.16;
  const cosTilt = Math.cos(tilt);
  const sinTilt = Math.sin(tilt);

  const project = (vx, vy, vz) => {
    const ry = vy * cosTilt - vz * sinTilt;
    const rz = vy * sinTilt + vz * cosTilt;
    return [cx + vx, cy + ry, rz];
  };

  // Bold jewel-proportioned double-terminated 4-sided diamond crystal
  const topA = [0, -21.5, 0];
  const botA = [0, 21.5, 0];
  const upperRing = [];
  const lowerRing = [];
  for (let k = 0; k < 4; k++) {
    const a = phase + k * (Math.PI * 0.5) + Math.PI * 0.125;
    upperRing.push([Math.cos(a) * 15.2, -5.8, Math.sin(a) * 15.2]);
    lowerRing.push([Math.cos(a) * 14.0, 5.8, Math.sin(a) * 14.0]);
  }

  const lx = -0.58;
  const ly = -0.48;
  const lz = 0.658;

  const faces = [];
  const addFace = (verts3d, zone, facetIdx) => {
    const p0 = verts3d[0];
    const p1 = verts3d[1];
    const p2 = verts3d[2];
    const ux = p1[0] - p0[0];
    const uy = p1[1] - p0[1];
    const uz = p1[2] - p0[2];
    const vx = p2[0] - p0[0];
    const vy = p2[1] - p0[1];
    const vz = p2[2] - p0[2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const nLen = Math.hypot(nx, ny, nz) || 1;
    nx /= nLen;
    ny /= nLen;
    nz /= nLen;
    const rny = ny * cosTilt - nz * sinTilt;
    const rnz = ny * sinTilt + nz * cosTilt;
    if (rnz <= -0.02) return;
    const pts2d = verts3d.map(([x, y, z]) => project(x, y, z));
    const avgZ = pts2d.reduce((acc, p) => acc + p[2], 0) / pts2d.length;
    faces.push({ pts2d, nx, ny: rny, nz: rnz, avgZ, zone, facetIdx });
  };

  for (let k = 0; k < 4; k++) {
    const kn = (k + 1) % 4;
    addFace([topA, upperRing[kn], upperRing[k]], 'top', k);
    addFace([upperRing[k], upperRing[kn], lowerRing[kn], lowerRing[k]], 'mid', k);
    addFace([lowerRing[k], lowerRing[kn], botA], 'bot', k);
  }

  faces.sort((a, b) => a.avgZ - b.avgZ);

  // Pure saturated prismatic crystal shading (ZERO washout glow on facets!)
  for (const f of faces) {
    const ndotl = f.nx * lx + f.ny * ly + f.nz * lz;
    const isCyanFace = f.nx < 0.12;
    fillPolygon(pen, f.pts2d, (x, y) => {
      const vGrad = clamp01(1 - (y - (cy - 21.5)) / 43);
      let idx;
      if (f.zone === 'top') {
        if (isCyanFace) {
          idx = ndotl > 0.65 && vGrad > 0.72 ? 7 : ndotl > 0.35 ? 6 : 5;
        } else {
          idx = ndotl > 0.4 ? 5 : 4;
        }
      } else if (f.zone === 'mid') {
        if (isCyanFace) {
          idx = ndotl > 0.55 ? 6 : 5;
        } else {
          idx = ndotl > 0.18 ? 4 : 3;
        }
      } else {
        // Lower pyramid shifts richly into royal astral violet-indigo
        if (isCyanFace) {
          idx = ndotl > 0.35 ? 5 : 4;
        } else {
          idx = ndotl > 0.05 ? 3 : 2;
        }
      }
      setPx(pen, x, y, RAMP_ASTRAL[idx], 1.0, 0);
    });

    // Crisp 1px prismatic facet ridges
    for (let i = 0; i < f.pts2d.length; i++) {
      const a = f.pts2d[i];
      const b = f.pts2d[(i + 1) % f.pts2d.length];
      const edgeCol = f.zone === 'top' && ndotl > 0.3 ? RAMP_ASTRAL[7] : isCyanFace ? RAMP_ASTRAL[6] : RAMP_ASTRAL[4];
      drawLinePx(pen, a[0], a[1], b[0], b[1], edgeCol, 1.0, 0);
    }
  }

  applyDarkSelout(surface, COL_SELOUT, SAFE_LPX);

  // Luminous crisp specular star at upper-left crystal facet glint
  const glintPulse = 0.5 + 0.5 * Math.sin(phase * 2);
  drawStar4(pen, cx - 3, cy - 6, glintPulse > 0.5 ? 3 : 2, RAMP_ASTRAL[6], RAMP_ASTRAL[7], 0.15);

  // 4 floating prismatic star motes orbiting the shard cleanly inside safe bounds
  for (let i = 0; i < 4; i++) {
    const a = phase + i * (Math.PI * 0.5) + 0.4;
    const mx = cx + Math.cos(a) * 21.5;
    const my = cy + Math.sin(a) * 9.5 - Math.cos(a * 2 + i) * 8.0;
    if (i % 2 === 0) {
      drawStar4(pen, mx, my, 2 + ((frame + i) % 2), RAMP_ASTRAL[5], RAMP_ASTRAL[7], 0.16);
    } else {
      drawDiamond(pen, mx, my, 1.8, RAMP_ASTRAL[4], RAMP_ASTRAL[6], 0.14);
    }
  }
}

// =========================================================================
// ROW 2: TAP_SMITE_SKYBOLT (12f: f0-1 telegraph, f2-5 piercing bolt, f6-11 burst)
// =========================================================================
function renderRow2TapSmiteSkybolt(pen, _surface, frame) {
  const cx = 31.5;
  const gy = 50.5;
  const topY = 4;

  const drawGroundIsoRing = (rx, ry, outerCol, midCol, coreCol, alpha = 1, brokenPhase = -1) => {
    pen.shadeBox(SAFE_LPX, SAFE_LPX, LOGICAL_SZ - 1 - SAFE_LPX, LOGICAL_SZ - 1 - SAFE_LPX, (x, y, out) => {
      const nx = (x - cx) / rx;
      const ny = (y - gy) / ry;
      const r = Math.hypot(nx, ny);
      const d = Math.abs(r - 0.9);
      if (d > 0.16) return null;
      const ang = Math.atan2(ny, nx);
      if (brokenPhase >= 0 && Math.sin(ang * 6 + brokenPhase) < 0.05) return null;
      out.color = d <= 0.045 ? coreCol : d <= 0.1 ? midCol : outerCol;
      out.alpha = alpha;
      out.glowStrength = d <= 0.045 ? 0.14 : 0.05;
      return out.color;
    });
  };

  if (frame <= 1) {
    // f0-f1: Celestial glyph telegraph + ground target rune + lock beam
    const haloY = 11;
    const haloR = frame === 0 ? 5.8 : 8.2;

    pen.shadeBox(SAFE_LPX, SAFE_LPX, LOGICAL_SZ - 1 - SAFE_LPX, 24, (x, y, out) => {
      const dx = x - cx;
      const dy = y - haloY;
      const r = Math.hypot(dx, dy);
      const d = Math.abs(r - haloR);
      if (d <= 1.65) {
        out.color = d <= 0.55 ? RAMP_CYAN_BOLT[7] : d <= 1.05 ? RAMP_CYAN_BOLT[3] : RAMP_CYAN_BOLT[1];
        out.alpha = 0.96;
        out.glowStrength = 0.1;
        return out.color;
      }
      return null;
    });
    drawStar4(pen, cx, haloY, frame === 0 ? 6 : 9, RAMP_GOLD[4], RAMP_GOLD[7], 0.16);

    // Saturated cyan-gold celestial targeting shaft
    for (let y = haloY + 2; y <= gy; y++) {
      const halfW = frame === 0 ? 1 : 2;
      for (let dx = -halfW; dx <= halfW; dx++) {
        const ad = Math.abs(dx);
        const col = ad === 0 ? RAMP_CYAN_BOLT[7] : ad === 1 ? RAMP_CYAN_BOLT[3] : RAMP_CYAN_BOLT[1];
        setPx(pen, cx + dx, y, col, ad <= 1 ? 0.92 : 0.65, 0.08);
      }
    }

    drawGroundIsoRing(
      frame === 0 ? 16 : 21,
      frame === 0 ? 6.5 : 8.0,
      RAMP_CYAN_BOLT[1],
      RAMP_CYAN_BOLT[3],
      RAMP_GOLD[6],
      0.96
    );
    drawLinePx(pen, cx - 10, gy, cx + 10, gy, RAMP_GOLD[5], 0.9, 0.08);
    drawLinePx(pen, cx, gy - 4, cx, gy + 4, RAMP_GOLD[5], 0.9, 0.08);
    if (frame === 1) {
      drawForkedBolt(pen, cx, haloY + 3, cx, gy - 1, 3.8, 2011, RAMP_CYAN_BOLT, 0.75, 0.14, 1);
    }
    return;
  }

  if (frame >= 2 && frame <= 5) {
    // f2-f5: Blinding cyan-gold forked lightning bolt piercing top-to-bottom within safe margins
    const strikeIdx = frame - 2; // 0..3
    const colHalfW = strikeIdx === 0 ? 6.0 : strikeIdx === 1 ? 4.8 : strikeIdx === 2 ? 3.5 : 2.3;

    // Saturated cyan-blue & gold energy column jacket around blazing white core
    pen.shadeBox(SAFE_LPX, topY, LOGICAL_SZ - 1 - SAFE_LPX, gy + 2, (x, y, out) => {
      const jitter = Math.sin(y * 0.4 + frame * 2.2) * (1.3 + strikeIdx * 0.6);
      const dx = Math.abs(x - (cx + jitter));
      const n = fbmNoise2D(x * 0.24, y * 0.22 + frame * 1.4, 21, 2);
      const effW = colHalfW + n * 1.5;
      if (dx > effW) return null;
      const q = 1 - dx / Math.max(0.8, effW);
      if (q > 0.72) out.color = RAMP_CYAN_BOLT[7]; // white-hot center
      else if (q > 0.50) out.color = RAMP_GOLD[5]; // blazing gold inner jacket
      else if (q > 0.28) out.color = RAMP_CYAN_BOLT[3]; // vivid electric cyan
      else out.color = RAMP_CYAN_BOLT[1]; // deep arcane blue outer edge
      out.alpha = q > 0.15 ? 1.0 : 0.82;
      out.glowStrength = q > 0.65 ? 0.18 : 0.06;
      return out.color;
    });

    // Primary jagged forked cyan-blue & golden lightning veins piercing top-to-bottom
    drawForkedBolt(
      pen,
      cx - 2,
      topY + 1,
      cx + 1,
      gy,
      6.0 + strikeIdx * 1.3,
      2200 + frame * 37,
      RAMP_CYAN_BOLT,
      1.1 - strikeIdx * 0.1,
      0.16,
      3
    );
    drawForkedBolt(
      pen,
      cx + 3,
      topY + 2,
      cx - 3,
      gy - 1,
      6.8,
      2350 + frame * 41,
      RAMP_GOLD,
      0.85 - strikeIdx * 0.08,
      0.14,
      2
    );

    // Sky crown flare at top + golden-cyan ground shatter shockwave
    drawStar4(pen, cx, topY + 3, 7 - strikeIdx, RAMP_CYAN_BOLT[2], RAMP_GOLD[7], 0.18);
    drawGroundIsoRing(
      18 + strikeIdx * 2.8,
      7.2 + strikeIdx * 0.9,
      RAMP_GOLD[2],
      RAMP_GOLD[5],
      RAMP_GOLD[7],
      1.0
    );

    // Explosive diamond ground impact + fanning jagged shatter spikes
    drawDiamond(pen, cx, gy, 9.0 - strikeIdx * 1.0, RAMP_GOLD[4], RAMP_CYAN_BOLT[7], 0.18);
    for (let s = 0; s < 6; s++) {
      const ang = -Math.PI * 0.08 - (s / 5) * Math.PI * 0.84;
      const len = 12 + (s % 2) * 5 + strikeIdx * 2.2;
      const ex = cx + Math.cos(ang) * len;
      const ey = gy + Math.sin(ang) * len * 0.85;
      drawThickSeg(pen, cx, gy, ex, ey, 1.8, 0.5, (x, y, d) => {
        const col =
          d < 0.55
            ? RAMP_CYAN_BOLT[7]
            : d < 1.05
              ? s % 2 === 0
                ? RAMP_GOLD[5]
                : RAMP_CYAN_BOLT[3]
              : s % 2 === 0
                ? RAMP_GOLD[2]
                : RAMP_CYAN_BOLT[1];
        setPx(pen, x, y, col, 1.0, 0.1);
      });
    }
    return;
  }

  // f6-f11: Jagged fanning electric-gold ground burst & rising sparks
  const u = (frame - 6) / 5; // 0.0 -> 1.0
  const fade = clamp01(1 - u * 0.65);

  drawGroundIsoRing(
    22 + u * 5.0,
    8.2 + u * 1.5,
    RAMP_GOLD[2],
    RAMP_GOLD[4],
    RAMP_GOLD[6],
    fade * 0.95,
    frame * 0.85
  );

  // Residual upper lightning snap on f6-f7
  if (frame <= 7) {
    drawForkedBolt(pen, cx - 2, 8 + (frame - 6) * 5, cx + 3, 33, 5.2, 2600 + frame * 53, RAMP_CYAN_BOLT, 0.7, 0.14, 1);
  }

  // Fanning jagged electric-gold radial shatter bolts erupting outward from ground (f6..f9)
  if (frame <= 9) {
    const burstFade = clamp01(1 - (frame - 6) / 4.2);
    const fanTargets = [
      [-23, -10],
      [-17, -21],
      [-7, -29],
      [7, -28],
      [18, -20],
      [23, -9]
    ];
    for (let i = 0; i < fanTargets.length; i++) {
      const [ox, oy] = fanTargets[i];
      const spread = 0.78 + u * 0.25;
      const sx = cx + ox * 0.18;
      const sy = gy - 1;
      const tx = Math.max(SAFE_LPX + 3, Math.min(LOGICAL_SZ - SAFE_LPX - 4, cx + ox * spread));
      const ty = Math.max(SAFE_LPX + 5, gy + oy * (0.95 - u * 0.22));
      drawForkedBolt(
        pen,
        sx,
        sy,
        tx,
        ty,
        3.2,
        2800 + frame * 31 + i * 17,
        i % 2 === 0 ? RAMP_GOLD : RAMP_CYAN_BOLT,
        0.65 * burstFade + 0.3,
        0.12 * burstFade,
        0
      );
    }
    // Electric-gold impact flash diamond shrinking at ground center
    drawDiamond(pen, cx, gy - 1, 6.5 * burstFade + 1.5, RAMP_GOLD[4], RAMP_GOLD[7], 0.15);
  }

  // Rising golden & cyan electric sparks / star motes
  const rng = new DeterministicRng(2950 + frame * 19);
  const sparkCount = 14 - Math.floor(u * 4);
  for (let i = 0; i < sparkCount; i++) {
    const seedAng = ((i + 0.5) / sparkCount) * Math.PI - Math.PI;
    const spreadX = Math.cos(seedAng) * (9 + u * 16.5 + (i % 3) * 2.5);
    const liftY = 7 + (i % 5) * 4.5 + u * (25 + (i % 4) * 3.8);
    const px = cx + spreadX + (rng.nextFloat() - 0.5) * 3;
    const py = gy - liftY;
    if (inSafe(Math.round(px), Math.round(py), SAFE_LPX + 2)) {
      const isGold = i % 2 === 0;
      const colOuter = isGold ? RAMP_GOLD[4] : RAMP_CYAN_BOLT[2];
      const colCore = isGold ? RAMP_GOLD[6] : RAMP_CYAN_BOLT[5];
      if (i % 3 === 0) {
        drawStar4(pen, px, py, frame <= 9 ? 3 : 2, colOuter, colCore, 0.14 * fade);
      } else {
        drawDiamond(pen, px, py, 1.7, colOuter, colCore, 0.12 * fade);
      }
    }
  }
}

// =========================================================================
// ROW 3: CRIT_STARBURST (12f: 8-point starburst + expanding diamond shockwave)
// =========================================================================
function renderRow3CritStarburst(pen, _surface, frame) {
  const cx = 31.5;
  const cy = 31.5;
  const t = frame / (COLS - 1);

  // Expanding diamond shockwave ring (`|dx| + |dy| = ringR <= 26.5`)
  const ringR = frame === 0 ? 7.0 : frame === 1 ? 10.5 : Math.min(26.5, 13.5 + (frame - 2) * 1.45);
  const ringThick = frame <= 3 ? 2.5 : Math.max(1.2, 2.4 - (frame - 3) * 0.15);
  const ringFade = frame <= 6 ? 1.0 : clamp01(1 - (frame - 6) / 6.2);

  // Bold 8-point starburst rays piercing PROUDLY past the shockwave ring!
  const rCard = frame === 0 ? 18 : frame === 1 ? 24 : 27;
  const rDiag = frame === 0 ? 12 : frame === 1 ? 17 : 21;
  const rInner = frame <= 3 ? 0 : Math.min(18, (frame - 3) * 2.25);
  const rayFade = frame <= 4 ? 1.0 : clamp01(1 - (frame - 4) / 8.2);
  const coreRad = frame <= 2 ? 7.0 - frame * 0.5 : Math.max(0, 5.5 - (frame - 2) * 1.4);

  pen.shadeBox(SAFE_LPX, SAFE_LPX, LOGICAL_SZ - 1 - SAFE_LPX, LOGICAL_SZ - 1 - SAFE_LPX, (x, y, out) => {
    const dx = x - cx;
    const dy = y - cy;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    const r = Math.hypot(dx, dy);
    const diamondR = adx + ady;

    let bestHeat = 0;
    let bestAlpha = 0;

    // 1. Expanding diamond shockwave ring (#ffffff -> #fef08a -> #fb923c -> #ef4444)
    const dRing = Math.abs(diamondR - ringR);
    if (dRing <= ringThick && ringFade > 0.08) {
      const cornerFactor = Math.abs(adx - ady) / Math.max(1, diamondR);
      const breakOk = frame < 8 || cornerFactor > (frame - 7) * 0.15;
      if (breakOk) {
        const q = 1 - dRing / ringThick;
        const ringHeat = clamp01(q * (0.95 - t * 0.55) + (frame <= 1 ? 0.22 : 0));
        if (ringHeat > bestHeat) {
          bestHeat = ringHeat;
          bestAlpha = clamp01(ringFade * (0.55 + q * 0.55));
        }
      }
    }

    // 2. Crisp 8-point tapered needle starburst rays (4 cardinal + 4 diagonal)
    if (rayFade > 0.08 && r >= rInner && r <= rCard) {
      const dCard = Math.min(adx, ady);
      const maxCardW = (frame <= 3 ? 4.4 : 3.4) * clamp01(1 - r / (rCard + 0.6));
      if (dCard <= maxCardW && maxCardW >= 0.45) {
        const q = 1 - dCard / Math.max(0.5, maxCardW);
        const h = clamp01(q * 0.72 + (1 - r / rCard) * 0.35 - t * 0.32);
        if (h > bestHeat) {
          bestHeat = h;
          bestAlpha = clamp01(rayFade * (0.6 + q * 0.5));
        }
      }

      if (r <= rDiag) {
        const dDiag = Math.min(Math.abs(dx - dy), Math.abs(dx + dy)) * 0.7071;
        const maxDiagW = (frame <= 3 ? 3.3 : 2.6) * clamp01(1 - r / (rDiag + 0.6));
        if (dDiag <= maxDiagW && maxDiagW >= 0.4) {
          const q = 1 - dDiag / Math.max(0.5, maxDiagW);
          const h = clamp01(q * 0.68 + (1 - r / rDiag) * 0.30 - t * 0.34);
          if (h > bestHeat) {
            bestHeat = h;
            bestAlpha = clamp01(rayFade * (0.55 + q * 0.5));
          }
        }
      }
    }

    // 3. Blazing central diamond flash core (f0..f4)
    if (coreRad > 0.5 && diamondR <= coreRad) {
      const q = 1 - diamondR / coreRad;
      const h = clamp01(0.58 + q * 0.48);
      if (h > bestHeat) {
        bestHeat = h;
        bestAlpha = 1.0;
      }
    }

    if (bestHeat <= 0.04 || bestAlpha <= 0.05) return null;
    // Strict rich saturated ramp: #ffffff -> #fef08a -> #fb923c -> #ef4444 -> #991b1b
    let idx;
    if (bestHeat >= 0.86) idx = 7; // #ffffff
    else if (bestHeat >= 0.66) idx = 6; // #fef08a
    else if (bestHeat >= 0.45) idx = 4; // #fb923c
    else if (bestHeat >= 0.24) idx = 2; // #ef4444
    else idx = 1; // #991b1b deep crimson edge

    out.color = RAMP_CRIT[idx];
    out.alpha = bestAlpha;
    out.glowStrength = idx >= 6 ? 0.14 : 0.04;
    return out.color;
  });

  // Crisp fiery crit sparks flying out along all 8 radial vectors (f3..f11)
  if (frame >= 3) {
    const uSpark = (frame - 3) / 8;
    for (let i = 0; i < 8; i++) {
      const a = i * (Math.PI * 0.25);
      const dist = Math.min(25.5, 11 + uSpark * 15 + (i % 2) * 1.5);
      const sx = cx + Math.cos(a) * dist;
      const sy = cy + Math.sin(a) * dist;
      const colOuter = i % 2 === 0 ? RAMP_CRIT[2] : RAMP_CRIT[4];
      const colCore = frame <= 7 ? RAMP_CRIT[7] : RAMP_CRIT[6];
      if (frame <= 9) {
        drawStar4(pen, sx, sy, i % 2 === 0 ? 3 : 2, colOuter, colCore, 0.12);
      } else {
        drawDiamond(pen, sx, sy, 1.8, colOuter, colCore, 0.1);
      }
    }
  }
}

// =========================================================================
// ROW 4: GOLD_FEVER_BURST (12f seamless overdrive sunburst, crown flares, sparks)
// =========================================================================
function renderRow4GoldFeverBurst(pen, _surface, frame) {
  const phase = (frame / COLS) * Math.PI * 2;
  const cx = 31.5;
  const cy = 31.5;
  const pulse = 0.5 + 0.5 * Math.sin(phase * 2);

  pen.shadeBox(SAFE_LPX, SAFE_LPX, LOGICAL_SZ - 1 - SAFE_LPX, LOGICAL_SZ - 1 - SAFE_LPX, (x, y, out) => {
    const dx = x - cx;
    const dy = y - cy;
    const r = Math.hypot(dx, dy);
    if (r > 27.5) return null;
    const ang = Math.atan2(dy, dx);

    // 1. Pulsing royal golden diamond core
    const diamondR = Math.abs(dx) + Math.abs(dy);
    const coreLim = 7.6 + pulse * 1.6;
    if (diamondR <= coreLim) {
      const q = 1 - diamondR / coreLim;
      out.color = q > 0.65 ? RAMP_GOLD[7] : q > 0.35 ? RAMP_GOLD[6] : RAMP_GOLD[5];
      out.alpha = 1.0;
      out.glowStrength = 0.14;
      return out.color;
    }

    // 2. Molten Crown Flares: 6 royal amber-gold flame petals licking off a burnished halo
    const crownWave = Math.pow(Math.max(0, Math.cos(ang * 6 - phase)), 1.7);
    const crownOuter = 13.5 + crownWave * 6.8 + pulse * 1.0;
    if (r >= 9.0 && r <= crownOuter) {
      if (Math.abs(r - 12.2) <= 1.25) {
        out.color = RAMP_GOLD[7];
        out.alpha = 1.0;
        out.glowStrength = 0.14;
        return out.color;
      }
      const q = clamp01(1 - (r - 11.0) / Math.max(2.5, crownOuter - 11.0));
      const heat = clamp01(q * 0.68 + crownWave * 0.32);
      if (heat > 0.78) out.color = RAMP_GOLD[6];
      else if (heat > 0.56) out.color = RAMP_GOLD[5];
      else if (heat > 0.36) out.color = RAMP_GOLD[4];
      else if (heat > 0.18) out.color = RAMP_CRIT[3];
      else out.color = RAMP_GOLD[2];
      out.alpha = clamp01(heat * 1.25);
      out.glowStrength = 0.06;
      return out.color;
    }

    // 3. Swirling 12-Ray Golden Pixel Sunburst radiating outward with rich burnished depth
    const swirlA = ang - r * 0.044 + phase;
    const primaryBeam = Math.pow(Math.max(0, Math.cos(swirlA * 6)), 3.0);
    const secondaryBeam = Math.pow(Math.max(0, Math.sin(swirlA * 6)), 3.8) * 0.75;
    const beam = Math.max(primaryBeam, secondaryBeam);
    const maxR = primaryBeam > secondaryBeam ? 27.0 : 23.0;
    const rFactor = clamp01(1 - (r - 9.5) / Math.max(1, maxR - 9.5));
    const energy = beam * rFactor;
    if (energy > 0.14) {
      let col;
      if (energy > 0.74) col = RAMP_GOLD[6];
      else if (energy > 0.52) col = RAMP_GOLD[5];
      else if (energy > 0.34) col = RAMP_GOLD[4];
      else col = RAMP_GOLD[2];
      out.color = col;
      out.alpha = clamp01(energy * 1.35);
      out.glowStrength = 0.06;
      return out.color;
    }

    return null;
  });

  // 4. Cascading Golden Diamond Sparks swirling outward in a seamless 12f loop
  for (let i = 0; i < 14; i++) {
    const u = ((i / 14) + frame / COLS) % 1;
    const baseA = (i / 14) * Math.PI * 2 + phase * 0.5;
    const dist = 8.5 + u * 18.0;
    const sx = cx + Math.cos(baseA) * dist;
    const sy = cy + Math.sin(baseA) * dist + u * u * 3.2;
    if (!inSafe(Math.round(sx), Math.round(sy), SAFE_LPX + 2)) continue;
    if (i % 3 === 0) {
      drawStar4(pen, sx, sy, u < 0.65 ? 3 : 2, RAMP_GOLD[4], RAMP_GOLD[7], 0.14);
    } else {
      drawDiamond(pen, sx, sy, u < 0.5 ? 2.2 : 1.5, RAMP_GOLD[4], RAMP_GOLD[6], 0.12);
    }
  }
}

// =========================================================================
// ROW 5: COMPANION_AURA_RING (12f = three 4f isometric 2.5D oval floor loops)
//   Cols 0..3:  Golden-Cyan Summon Rune Ring
//   Cols 4..7:  Emerald-Radiant Seraphic Heal Ring
//   Cols 8..11: Solar-Crimson Attack Buff Ring
// =========================================================================
function renderRow5CompanionAuraRing(pen, _surface, col) {
  const kind = Math.floor(col / 4); // 0 = Summon, 1 = Heal, 2 = Buff
  const subFrame = col % 4;
  const subPhase = (subFrame / 4) * Math.PI * 2;
  const cx = 31.5;
  const cy = 38.5;
  const rx = 25.0;
  const ry = 10.8;

  if (kind === 0) {
    // Cols 0..3: Golden-Cyan Summon Rune Ring (4f loop)
    pen.shadeBox(SAFE_LPX, 20, LOGICAL_SZ - 1 - SAFE_LPX, LOGICAL_SZ - 1 - SAFE_LPX, (x, y, out) => {
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      const r = Math.hypot(nx, ny);
      if (r > 1.08) return null;
      const ang = Math.atan2(ny, nx);

      // Outer segmented sovereign gold rune track
      const dOuter = Math.abs(r - 0.94);
      if (dOuter <= 0.095) {
        const seg = Math.sin(ang * 8 + subPhase);
        if (seg > -0.35) {
          out.color = dOuter <= 0.03 ? RAMP_GOLD[6] : seg > 0.4 ? RAMP_GOLD[5] : RAMP_GOLD[4];
          out.alpha = 0.98;
          out.glowStrength = 0.08;
          return out.color;
        }
      }
      // Inner cyan arcane conduit ring
      const dInner = Math.abs(r - 0.71);
      if (dInner <= 0.072) {
        out.color = dInner <= 0.024 ? RAMP_CYAN_BOLT[6] : dInner <= 0.048 ? RAMP_CYAN_BOLT[3] : RAMP_CYAN_BOLT[2];
        out.alpha = 0.95;
        out.glowStrength = 0.08;
        return out.color;
      }
      // Inscribed rotating isometric square + diamond 8-point summon seal
      const ca = Math.cos(subPhase * 0.5);
      const sa = Math.sin(subPhase * 0.5);
      const rx1 = nx * ca - ny * sa;
      const ry1 = nx * sa + ny * ca;
      const sqD = Math.max(Math.abs(rx1), Math.abs(ry1));
      const diaD = (Math.abs(rx1) + Math.abs(ry1)) * 0.7071;
      if (Math.abs(sqD - 0.5) <= 0.052 || Math.abs(diaD - 0.5) <= 0.052) {
        out.color = r < 0.55 ? RAMP_GOLD[5] : RAMP_CYAN_BOLT[3];
        out.alpha = 0.9;
        out.glowStrength = 0.08;
        return out.color;
      }
      if (r < 0.65 && ((x + y) & 1) === 0 && r > 0.18) {
        out.color = RAMP_CYAN_BOLT[2];
        out.alpha = 0.35 * (1 - r / 0.65);
        out.glowStrength = 0.04;
        return out.color;
      }
      return null;
    });

    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + subPhase;
      const bx = cx + Math.cos(a) * rx * 0.92;
      const by = cy + Math.sin(a) * ry * 0.92;
      const lift = 10 + ((subFrame + i) % 4) * 4.5;
      drawLinePx(pen, bx, by, bx, by - lift, i % 2 === 0 ? RAMP_CYAN_BOLT[3] : RAMP_GOLD[4], 0.85, 0.08);
      drawStar4(pen, bx, by - lift, i % 2 === 0 ? 3 : 2, RAMP_CYAN_BOLT[2], RAMP_GOLD[7], 0.14);
    }
    return;
  }

  if (kind === 1) {
    // Cols 4..7: Emerald-Radiant Seraphic Heal Ring (4f loop)
    pen.shadeBox(SAFE_LPX, 20, LOGICAL_SZ - 1 - SAFE_LPX, LOGICAL_SZ - 1 - SAFE_LPX, (x, y, out) => {
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      const r = Math.hypot(nx, ny);
      if (r > 1.08) return null;
      const ang = Math.atan2(ny, nx);

      // Lush undulating emerald seraphic petal ring
      const petalR = 0.9 + Math.sin(ang * 6 - subPhase) * 0.065;
      const dOuter = Math.abs(r - petalR);
      if (dOuter <= 0.095) {
        out.color = dOuter <= 0.028 ? RAMP_EMERALD[6] : dOuter <= 0.06 ? RAMP_EMERALD[4] : RAMP_EMERALD[2];
        out.alpha = 0.98;
        out.glowStrength = 0.08;
        return out.color;
      }
      // Inner radiant sovereign gold blessing circle
      const dInner = Math.abs(r - 0.64);
      if (dInner <= 0.068) {
        out.color = dInner <= 0.024 ? RAMP_GOLD[7] : RAMP_GOLD[5];
        out.alpha = 0.94;
        out.glowStrength = 0.08;
        return out.color;
      }
      // Seraphic floor blossom cross
      if (r < 0.62 && (Math.abs(nx) < 0.09 || Math.abs(ny) < 0.13)) {
        out.color = r < 0.25 ? RAMP_EMERALD[6] : RAMP_EMERALD[3];
        out.alpha = 0.88;
        out.glowStrength = 0.06;
        return out.color;
      }
      if (r < 0.82 && (x & 1) === (y & 1)) {
        out.color = RAMP_EMERALD[2];
        out.alpha = clamp01((0.82 - r) * 0.45);
        out.glowStrength = 0.04;
        return out.color;
      }
      return null;
    });

    // 4 rising crisp emerald-radiant `+` healing crosses & golden motes
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 - subPhase + 0.35;
      const u = ((subFrame + i) % 4) / 4;
      const px = cx + Math.cos(a) * rx * 0.78;
      const py = cy + Math.sin(a) * ry * 0.78 - 6 - u * 18;
      if (i % 2 === 0) {
        drawPlusCross(pen, px, py, 2, RAMP_EMERALD[3], RAMP_EMERALD[6], 0.14);
      } else {
        drawStar4(pen, px, py, 2, RAMP_GOLD[4], RAMP_GOLD[7], 0.14);
      }
    }
    return;
  }

  // Cols 8..11: Solar-Crimson Attack Buff Ring (4f loop)
  pen.shadeBox(SAFE_LPX, 20, LOGICAL_SZ - 1 - SAFE_LPX, LOGICAL_SZ - 1 - SAFE_LPX, (x, y, out) => {
    const nx = (x - cx) / rx;
    const ny = (y - cy) / ry;
    const r = Math.hypot(nx, ny);
    if (r > 1.1) return null;
    const ang = Math.atan2(ny, nx);

    // Fierce 8-toothed solar-crimson war ring
    const tooth = Math.pow(Math.max(0, Math.cos(ang * 8 + subPhase)), 2.2) * 0.14;
    const outerTarget = 0.88 + tooth;
    const dOuter = Math.abs(r - outerTarget);
    if (dOuter <= 0.095) {
      out.color = dOuter <= 0.028 ? RAMP_CRIT[6] : tooth > 0.07 ? RAMP_CRIT[4] : dOuter <= 0.058 ? RAMP_CRIT[2] : RAMP_CRIT[1];
      out.alpha = 0.98;
      out.glowStrength = 0.08;
      return out.color;
    }
    // Inner blazing golden-orange war-ring
    const dInner = Math.abs(r - 0.62);
    if (dInner <= 0.062) {
      out.color = dInner <= 0.022 ? RAMP_GOLD[6] : RAMP_CRIT[4];
      out.alpha = 0.94;
      out.glowStrength = 0.08;
      return out.color;
    }
    // Counter-rotating 3-point crimson war triangle
    const aRot = ang - subPhase * 0.5;
    const triSect = (((aRot % (Math.PI * 2 / 3)) + Math.PI * 2 / 3) % (Math.PI * 2 / 3)) - Math.PI / 3;
    const triR = 0.42 / Math.max(0.5, Math.cos(triSect));
    if (Math.abs(r - triR * 0.72) <= 0.055 && r < 0.62) {
      out.color = RAMP_CRIT[2];
      out.alpha = 0.9;
      out.glowStrength = 0.06;
      return out.color;
    }
    return null;
  });

  // 6 blazing upward solar-crimson power streaks & sparks
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + subPhase;
    const u = ((subFrame + i * 2) % 4) / 4;
    const bx = cx + Math.cos(a) * rx * 0.85;
    const by = cy + Math.sin(a) * ry * 0.85 - u * 12;
    const topY = Math.max(SAFE_LPX + 3, by - 9);
    drawThickSeg(pen, bx, by, bx, topY, 1.25, 0.4, (x, y, d) => {
      setPx(pen, x, y, d < 0.48 ? RAMP_CRIT[6] : i % 2 === 0 ? RAMP_CRIT[4] : RAMP_CRIT[2], 0.95, 0.1);
    });
    drawDiamond(pen, bx, topY, 1.6, RAMP_CRIT[2], RAMP_GOLD[6], 0.12);
  }
}

// =========================================================================
// ROW 6: BOSS_GATE_PORTAL (12f seamless gothic obsidian arch + crimson-gold vortex)
// =========================================================================
function renderRow6BossGatePortal(pen, surface, frame) {
  const phase = (frame / COLS) * Math.PI * 2;
  const cx = 31.5;
  const pulse = 0.5 + 0.5 * Math.sin(phase * 2);

  const getApertureHalfW = (y) => {
    if (y > 54 || y < 17) return -1;
    if (y >= 34) return 13.8;
    const t = (34 - y) / 17;
    return 13.8 * Math.pow(Math.max(0, 1 - t * t), 0.72);
  };

  // 1. Swirling Crimson-Gold Portal Vortex inside the Gothic Arch Aperture
  pen.shadeBox(16, 17, 47, 54, (x, y, out) => {
    const innerW = getApertureHalfW(y);
    if (innerW <= 0.4) return null;
    const adx = Math.abs(x - cx);
    if (adx > innerW) return null;

    const nx = (x - cx) / 14.0;
    const ny = (y - 37.5) / 17.5;
    const r = Math.hypot(nx, ny);
    const ang = Math.atan2(ny, nx);

    const n = fbmNoise2D(
      nx * 2.8 + Math.cos(phase) * 0.55,
      ny * 2.8 + Math.sin(phase) * 0.55,
      61,
      2
    );
    const spiral = Math.sin(ang * 3 + r * 4.6 - phase * 2 + n * 1.4);
    const edgeRim = innerW - adx;

    if (r < 0.24 + pulse * 0.05) {
      const q = 1 - r / (0.26 + pulse * 0.05);
      out.color = q > 0.6 ? RAMP_GOLD[7] : q > 0.25 ? RAMP_GOLD[6] : RAMP_CRIT[4];
      out.alpha = 1.0;
      out.glowStrength = 0.16;
      return out.color;
    }

    if (edgeRim < 1.35) {
      out.color = spiral > 0 ? RAMP_GOLD[5] : RAMP_CRIMSON[4];
      out.alpha = 1.0;
      out.glowStrength = 0.1;
      return out.color;
    }

    const heat = clamp01(1 - r * 0.72 + spiral * 0.36 + n * 0.16);
    let col;
    if (heat > 0.88) col = RAMP_GOLD[6];
    else if (heat > 0.72) col = RAMP_GOLD[5];
    else if (heat > 0.56) col = RAMP_CRIT[4];
    else if (heat > 0.38) col = RAMP_CRIMSON[4];
    else if (heat > 0.22) col = RAMP_CRIMSON[2];
    else col = RAMP_CRIMSON[0];

    out.color = col;
    out.alpha = 1.0;
    out.glowStrength = heat > 0.72 ? 0.12 : 0.04;
    return out.color;
  });

  // 2. Gothic Dark-Obsidian Stone Arch Frame & Burnished Gold Trim
  for (let y = 12; y <= 57; y++) {
    const innerW = getApertureHalfW(y);
    let outerW;
    if (y >= 54) {
      outerW = y === 57 ? 23.0 : y >= 55 ? 21.5 : 20.0;
    } else if (y >= 34) {
      outerW = 19.8;
    } else {
      const t = (34 - y) / 22;
      outerW = 19.8 * Math.pow(Math.max(0, 1 - t * t), 0.72);
    }

    const x0 = Math.max(SAFE_LPX + 2, Math.floor(cx - outerW));
    const x1 = Math.min(LOGICAL_SZ - SAFE_LPX - 3, Math.ceil(cx + outerW));
    for (let x = x0; x <= x1; x++) {
      const adx = Math.abs(x - cx);
      if (y <= 53 && innerW > 0 && adx <= innerW) continue;

      const nearInner = y <= 53 && innerW > 0 && adx <= innerW + 1.45;
      const nearOuter = adx >= outerW - 1.35 || y === 54 || y === 57;
      const isLeftSide = x < cx;

      if (nearInner || (nearOuter && (y <= 54 || y === 55))) {
        const goldLit = (isLeftSide && nearOuter) || (!isLeftSide && nearInner) || y < 22;
        setPx(pen, x, y, goldLit ? RAMP_GOLD[6] : RAMP_GOLD[4], 1.0, 0);
      } else {
        const mortarH = y % 6 === 0 && y >= 22 && y <= 52;
        const shade = isLeftSide ? (adx > outerW - 3.5 ? 4 : 3) : adx < innerW + 3.2 ? 3 : 2;
        const colIdx = mortarH ? 1 : shade;
        setPx(pen, x, y, RAMP_OBSIDIAN[colIdx], 1.0, 0);
      }
    }
  }

  // 3. Carved Glowing Runes on Left & Right Obsidian Arch Pillars (12f wave pulse)
  const runeYs = [27, 35, 43, 50];
  for (let i = 0; i < runeYs.length; i++) {
    const ry = runeYs[i];
    const wave = 0.5 + 0.5 * Math.sin(phase - i * 0.9);
    const col = wave > 0.6 ? RAMP_GOLD[6] : wave > 0.3 ? RAMP_GOLD[5] : RAMP_CRIMSON[4];
    const gl = 0.08 + wave * 0.1;
    for (const side of [-1, 1]) {
      const rx = cx + side * 16.8;
      setPx(pen, rx, ry - 1, col, 1.0, gl);
      setPx(pen, rx, ry, RAMP_GOLD[7], 1.0, gl);
      setPx(pen, rx, ry + 1, col, 1.0, gl);
      setPx(pen, rx - side, ry, col, 1.0, gl * 0.7);
    }
  }

  // 4. Horned Obsidian-Gold Sovereign Crown Crest crowning the Arch Apex (`y = 5..15`)
  for (const side of [-1, 1]) {
    const h0x = cx + side * 7.5;
    const h0y = 14.5;
    const h1x = cx + side * 13.5;
    const h1y = 11.0;
    const h2x = cx + side * 15.8;
    const h2y = 5.5;
    drawThickSeg(pen, h0x, h0y, h1x, h1y, 2.3, 1.6, (x, y, d) => {
      setPx(pen, x, y, d < 0.9 ? RAMP_OBSIDIAN[5] : RAMP_OBSIDIAN[2], 1.0, 0);
    });
    drawThickSeg(pen, h1x, h1y, h2x, h2y, 1.55, 0.55, (x, y, d) => {
      setPx(pen, x, y, d < 0.7 ? RAMP_GOLD[6] : RAMP_OBSIDIAN[4], 1.0, 0);
    });
  }
  fillPolygon(
    pen,
    [
      [cx - 7, 15],
      [cx - 8, 9],
      [cx - 3.5, 11.5],
      [cx, 5.5],
      [cx + 3.5, 11.5],
      [cx + 8, 9],
      [cx + 7, 15]
    ],
    (x, y) => {
      const col = y <= 9 ? RAMP_GOLD[6] : x < cx ? RAMP_GOLD[5] : RAMP_GOLD[4];
      setPx(pen, x, y, col, 1.0, 0);
    }
  );
  drawDiamond(pen, cx, 12.2, 2.1, RAMP_CRIMSON[4], pulse > 0.5 ? RAMP_GOLD[7] : RAMP_CRIMSON[6], 0.16);

  applyDarkSelout(surface, COL_SELOUT, SAFE_LPX);

  // 5. Floating crimson-gold portal sparks spiraling out seamlessly
  for (let i = 0; i < 6; i++) {
    const u = ((i / 6) + frame / COLS) % 1;
    const side = i % 2 === 0 ? -1 : 1;
    const sx = cx + side * (7 + Math.sin(u * Math.PI * 2 + i) * 7);
    const sy = 51 - u * 30;
    drawStar4(pen, sx, sy, i % 3 === 0 ? 2 : 1, RAMP_CRIMSON[4], RAMP_GOLD[6], 0.14 * Math.sin(u * Math.PI));
  }
}

// =========================================================================
// ROW 7: HUD_ICONS (12 distinct crisp static icons @ 64x64 -> 128x128)
// Bold high-contrast silhouettes readable at 24x24..44x44 UI scale with `#0d0f1c` selout!
// =========================================================================

// Col 0: Sovereign Gold Coin
function renderIcon0GoldCoin(pen, surface) {
  const cx = 31.5;
  const cy = 31.5;
  const R = 22.0;

  fillOvalPx(pen, cx, cy, R, R, (x, y, u, v, r) => {
    const light = -u * 0.62 - v * 0.72;
    let idx;
    if (r >= 0.78) {
      idx = light > 0.42 ? 6 : light > -0.05 ? 5 : light > -0.45 ? 4 : 2;
    } else if (r >= 0.70) {
      idx = light > 0.12 ? 2 : light > -0.25 ? 4 : 6;
    } else {
      idx = light > 0.25 ? 5 : light > -0.25 ? 4 : 2;
      const inCrown = isInCoinCrown(u * 0.96, v * 0.96);
      const inShadow = !inCrown && isInCoinCrown(u * 0.96 - 0.07, v * 0.96 - 0.08);
      if (inShadow) {
        idx = 2;
      } else if (inCrown) {
        const topEdge = !isInCoinCrown(u * 0.96 - 0.08, v * 0.96 - 0.08);
        idx = topEdge ? 7 : 6;
      } else {
        // Subtle specular sheen behind the crown on upper-left well
        const dSlash = Math.abs(u * 0.68 + v * 0.73 + 0.46);
        if (dSlash < 0.11) idx = 6;
      }
    }
    setPx(pen, x, y, RAMP_GOLD[idx], 1.0, 0);
  });

  applyDarkSelout(surface, COL_SELOUT, SAFE_LPX);
  drawStar4(pen, cx - 13, cy - 14, 4, RAMP_GOLD[5], RAMP_GOLD[7], 0.15);
}

// Col 1: Astral Shard Crystal
function renderIcon1AstralShard(pen, surface) {
  const cx = 31.5;
  const top = [cx, 7];
  const bot = [cx, 56];
  const leftU = [14, 25];
  const leftL = [15, 38];
  const rightU = [49, 25];
  const rightL = [48, 38];
  const midU = [30, 27];
  const midL = [33, 37];

  // Crisp saturated jewel facets (zero glow washout!)
  fillPolygon(pen, [top, midU, leftU], (x, y) => {
    setPx(pen, x, y, y < 16 && x > 26 ? RAMP_ASTRAL[7] : RAMP_ASTRAL[6], 1.0, 0);
  });
  fillPolygon(pen, [top, rightU, midU], (x, y) => {
    setPx(pen, x, y, y < 17 ? RAMP_ASTRAL[5] : RAMP_CYAN_BOLT[3], 1.0, 0);
  });
  fillPolygon(pen, [leftU, midU, midL, leftL], (x, y) => {
    setPx(pen, x, y, x < 23 ? RAMP_ASTRAL[6] : RAMP_ASTRAL[5], 1.0, 0);
  });
  fillPolygon(pen, [midU, rightU, rightL, midL], (x, y) => {
    setPx(pen, x, y, x < 40 ? RAMP_ASTRAL[4] : RAMP_ASTRAL[3], 1.0, 0);
  });
  fillPolygon(pen, [leftL, midL, bot], (x, y) => {
    setPx(pen, x, y, y < 44 ? RAMP_ASTRAL[4] : RAMP_ASTRAL[3], 1.0, 0);
  });
  fillPolygon(pen, [midL, rightL, bot], (x, y) => {
    setPx(pen, x, y, y < 44 ? RAMP_ASTRAL[3] : RAMP_ASTRAL[2], 1.0, 0);
  });

  // Crisp specular facet ridge bevels
  drawLinePx(pen, top[0], top[1], midU[0], midU[1], RAMP_ASTRAL[7], 1.0, 0);
  drawLinePx(pen, midU[0], midU[1], midL[0], midL[1], RAMP_ASTRAL[7], 1.0, 0);
  drawLinePx(pen, leftU[0], leftU[1], midU[0], midU[1], RAMP_ASTRAL[7], 1.0, 0);
  drawLinePx(pen, midU[0], midU[1], rightU[0], rightU[1], RAMP_ASTRAL[6], 1.0, 0);
  drawLinePx(pen, leftL[0], leftL[1], midL[0], midL[1], RAMP_ASTRAL[5], 1.0, 0);

  applyDarkSelout(surface, COL_SELOUT, SAFE_LPX);
  drawStar4(pen, 14, 14, 3, RAMP_ASTRAL[5], RAMP_ASTRAL[7], 0.14);
  drawStar4(pen, 50, 44, 3, RAMP_ASTRAL[4], RAMP_ASTRAL[7], 0.14);
}

// Col 2: Sovereign Blade (gilded broadsword)
function renderIcon2SovereignBlade(pen, surface) {
  // Broad two-edged platinum-steel blade with inlaid golden fuller
  fillPolygon(
    pen,
    [
      [21, 35],
      [44, 12],
      [53, 10],
      [51, 19],
      [28, 42]
    ],
    (x, y) => {
      const spine = x + y - 63;
      const tipDist = Math.hypot(x - 53, y - 10);
      if (Math.abs(spine) <= 0.85 && tipDist > 5) {
        setPx(pen, x, y, RAMP_GOLD[5], 1.0, 0);
      } else if (spine < 0) {
        setPx(pen, x, y, spine < -2.6 ? RAMP_STEEL[7] : RAMP_STEEL[6], 1.0, 0);
      } else {
        setPx(pen, x, y, spine > 2.8 ? RAMP_STEEL[4] : RAMP_STEEL[3], 1.0, 0);
      }
    }
  );

  // Leather-wrapped sword grip
  drawThickSeg(pen, 15, 48, 24, 39, 2.5, 2.3, (x, y, d) => {
    const wrap = ((x - y) & 3) === 0;
    setPx(pen, x, y, wrap ? RAMP_LEATHER[5] : d < 1.1 ? RAMP_LEATHER[4] : RAMP_LEATHER[2], 1.0, 0);
  });

  // Ornate gilded gothic crossguard with forward-swept quillion tips
  drawThickSeg(pen, 15, 30, 33, 48, 2.8, 2.8, (x, y, d, _r, t) => {
    const flare = Math.abs(t - 0.5) > 0.36;
    const topLight = x + y < 62;
    const col = flare ? RAMP_GOLD[6] : topLight ? RAMP_GOLD[6] : d < 1.3 ? RAMP_GOLD[5] : RAMP_GOLD[2];
    setPx(pen, x, y, col, 1.0, 0);
  });
  drawThickSeg(pen, 15, 30, 18, 27, 1.8, 0.9, (x, y) => setPx(pen, x, y, RAMP_GOLD[6], 1.0, 0));
  drawThickSeg(pen, 33, 48, 36, 45, 1.8, 0.9, (x, y) => setPx(pen, x, y, RAMP_GOLD[5], 1.0, 0));

  // Crimson ruby set into crossguard center
  drawDiamond(pen, 24, 39, 2.6, RAMP_CRIMSON[4], RAMP_GOLD[7], 0.12);

  // Gilded royal diamond pommel
  drawDiamond(pen, 13, 50, 4.2, RAMP_GOLD[4], RAMP_GOLD[6], 0);
  setPx(pen, 12, 49, RAMP_GOLD[7], 1.0, 0);

  applyDarkSelout(surface, COL_SELOUT, SAFE_LPX);
  drawStar4(pen, 48, 15, 4, RAMP_GOLD[5], RAMP_STEEL[7], 0.16);
}

// Col 3: Arcane Tap Sigil (cyan-gold lightning bolt)
function renderIcon3ArcaneTapSigil(pen, surface) {
  // Bold iconic high-contrast cyan-gold lightning bolt (zero glow washout!)
  const boltPoly = [
    [41, 7],
    [15, 33],
    [30, 33],
    [19, 56],
    [49, 28],
    [34, 28]
  ];
  // First paint rich burnished gold outer sigil shell
  fillPolygon(pen, boltPoly, (x, y) => {
    const col = y < 31 ? RAMP_GOLD[5] : RAMP_GOLD[4];
    setPx(pen, x, y, col, 1.0, 0);
  });

  // Inner vivid electric cyan lightning core inset cleanly inside the gold trim
  const innerCyanPoly = [
    [38, 13],
    [20, 31],
    [34, 31],
    [24, 50],
    [44, 30],
    [30, 30]
  ];
  fillPolygon(pen, innerCyanPoly, (x, y) => {
    const centerX = y < 31 ? 37 - (y - 13) * 0.72 : 38 - (y - 31) * 0.72;
    const d = Math.abs(x - centerX);
    const col = d < 1.5 ? RAMP_CYAN_BOLT[7] : d < 3.4 ? RAMP_CYAN_BOLT[4] : RAMP_CYAN_BOLT[3];
    setPx(pen, x, y, col, 1.0, 0);
  });

  // Crisp upper-left golden catchlight bevel
  drawLinePx(pen, 40, 8, 16, 32, RAMP_GOLD[6], 1.0, 0);
  drawLinePx(pen, 48, 28, 20, 55, RAMP_GOLD[2], 1.0, 0);

  applyDarkSelout(surface, COL_SELOUT, SAFE_LPX);

  drawStar4(pen, 16, 15, 3, RAMP_CYAN_BOLT[3], RAMP_CYAN_BOLT[7], 0.16);
  drawStar4(pen, 49, 45, 3, RAMP_GOLD[4], RAMP_GOLD[7], 0.16);
}

// Col 4: Avarice Magnet (horseshoe rune magnet with golden sparks)
function renderIcon4AvariceMagnet(pen, surface) {
  const cx = 31.5;
  const arcCy = 35.5;
  const outerR = 19.5;
  const innerR = 10.2;

  for (let y = 16; y <= 55; y++) {
    for (let x = 11; x <= 52; x++) {
      const dx = x - cx;
      const adx = Math.abs(dx);
      const dy = y - arcCy;
      let inside = false;
      let edgeFactor = 0;

      if (y < arcCy) {
        if (adx >= innerR && adx <= outerR && y >= 17) {
          inside = true;
          edgeFactor = (adx - innerR) / (outerR - innerR);
        }
      } else {
        const r = Math.hypot(dx, dy);
        if (r >= innerR && r <= outerR) {
          inside = true;
          edgeFactor = (r - innerR) / (outerR - innerR);
        }
      }

      if (!inside) continue;

      if (y <= 25) {
        const tipCol =
          y === 25
            ? RAMP_GOLD[5]
            : edgeFactor < 0.35
              ? RAMP_STEEL[7]
              : edgeFactor < 0.72
                ? RAMP_STEEL[5]
                : RAMP_STEEL[3];
        setPx(pen, x, y, tipCol, 1.0, 0);
      } else {
        const onGoldStripe = Math.abs(edgeFactor - 0.5) < 0.14;
        const col = onGoldStripe
          ? dx < 0
            ? RAMP_GOLD[6]
            : RAMP_GOLD[5]
          : dx < -2
            ? RAMP_CRIMSON[4]
            : dy > 12
              ? RAMP_CRIMSON[2]
              : RAMP_CRIMSON[3];
        setPx(pen, x, y, col, 1.0, 0);
      }
    }
  }

  applyDarkSelout(surface, COL_SELOUT, SAFE_LPX);

  // Rich golden magnetic arc + sparkling golden coin motes pulling into the magnet gap
  drawForkedBolt(pen, 18, 13, 45, 13, 3.0, 7404, RAMP_GOLD, 0.75, 0.14, 0);
  drawStar4(pen, cx, 10, 4, RAMP_GOLD[4], RAMP_GOLD[7], 0.16);
  drawDiamond(pen, 26, 21, 2.0, RAMP_GOLD[4], RAMP_GOLD[6], 0.12);
  drawDiamond(pen, 37, 23, 1.8, RAMP_GOLD[4], RAMP_GOLD[6], 0.12);
}

// Col 5: Executioner Crit (crimson-gold cross-reticle dagger)
function renderIcon5ExecutionerCrit(pen, surface) {
  const cx = 31.5;
  const cy = 31.5;

  // 1. Bold crimson-gold targeting cross-reticle
  pen.shadeBox(SAFE_LPX + 2, SAFE_LPX + 2, LOGICAL_SZ - SAFE_LPX - 3, LOGICAL_SZ - SAFE_LPX - 3, (x, y, out) => {
    const dx = x - cx;
    const dy = y - cy;
    const r = Math.hypot(dx, dy);
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);

    if (Math.abs(r - 17.5) <= 2.2) {
      out.color = Math.abs(r - 17.5) <= 0.75 ? RAMP_GOLD[5] : RAMP_CRIT[2];
      out.alpha = 1.0;
      out.glowStrength = 0;
      return out.color;
    }
    const onCard = (adx <= 1.6 && ady >= 9 && ady <= 23.5) || (ady <= 1.6 && adx >= 9 && adx <= 23.5);
    if (onCard) {
      out.color = Math.min(adx, ady) <= 0.6 ? RAMP_GOLD[6] : RAMP_CRIT[2];
      out.alpha = 1.0;
      out.glowStrength = 0;
      return out.color;
    }
    return null;
  });

  // 2. High-contrast dark-obsidian & gleaming silver assassin dagger slashing through reticle!
  fillPolygon(
    pen,
    [
      [23, 35],
      [44, 14],
      [54, 9],
      [49, 19],
      [28, 40]
    ],
    (x, y) => {
      const spine = x + y - 63;
      if (spine < -1.0) {
        setPx(pen, x, y, RAMP_STEEL[7], 1.0, 0); // razor platinum upper edge
      } else if (spine < 0.8) {
        setPx(pen, x, y, RAMP_STEEL[5], 1.0, 0);
      } else {
        setPx(pen, x, y, RAMP_OBSIDIAN[3], 1.0, 0); // dark obsidian fuller bevel
      }
    }
  );
  // Gilded dagger crossguard & pommel
  drawThickSeg(pen, 18, 32, 31, 45, 2.3, 2.3, (x, y) => {
    setPx(pen, x, y, x + y < 63 ? RAMP_GOLD[6] : RAMP_GOLD[4], 1.0, 0);
  });
  drawThickSeg(pen, 13, 50, 23, 40, 2.3, 2.0, (x, y) => {
    setPx(pen, x, y, RAMP_CRIMSON[3], 1.0, 0);
  });
  drawDiamond(pen, 12, 51, 3.1, RAMP_GOLD[4], RAMP_GOLD[6], 0);

  applyDarkSelout(surface, COL_SELOUT, SAFE_LPX);

  // Sharp golden-crimson crit bullseye spark at center
  drawStar4(pen, cx, cy, 4, RAMP_CRIT[2], RAMP_GOLD[7], 0.16);
}

// Col 6: Tempest Haste (winged cyan-gold boot/feather)
function renderIcon6TempestHaste(pen, surface) {
  // 1. Armored Sovereign Greave / Boot
  fillPolygon(
    pen,
    [
      [14, 24],
      [30, 24],
      [31, 42],
      [15, 42]
    ],
    (x, y) => {
      const col = y <= 27 ? RAMP_GOLD[6] : y === 28 ? RAMP_GOLD[2] : x < 21 ? RAMP_STEEL[6] : x < 26 ? RAMP_STEEL[4] : RAMP_STEEL[2];
      setPx(pen, x, y, col, 1.0, 0);
    }
  );
  fillPolygon(
    pen,
    [
      [14, 40],
      [33, 40],
      [45, 46],
      [45, 52],
      [13, 52]
    ],
    (x, y) => {
      const col =
        y >= 50
          ? RAMP_GOLD[2]
          : y <= 43 && x > 28
            ? RAMP_GOLD[6]
            : x > 37
              ? RAMP_GOLD[5]
              : x < 24
                ? RAMP_STEEL[5]
                : RAMP_STEEL[3];
      setPx(pen, x, y, col, 1.0, 0);
    }
  );

  // 2. Layered Saturated Cyan-Teal & Gold Tempest Wing (zero glow washout!)
  const plumes = [
    [
      [25, 31],
      [42, 12],
      [55, 9],
      [49, 20],
      [30, 35]
    ],
    [
      [27, 34],
      [46, 21],
      [56, 21],
      [48, 29],
      [31, 38]
    ],
    [
      [28, 37],
      [45, 30],
      [53, 32],
      [44, 39],
      [31, 41]
    ]
  ];
  for (let p = 0; p < plumes.length; p++) {
    fillPolygon(pen, plumes[p], (x, y) => {
      const u = clamp01((x - 25) / 30);
      let col;
      if (u > 0.78) col = RAMP_TEAL_WIND[7];
      else if (u > 0.54) col = RAMP_TEAL_WIND[5];
      else if (u > 0.3) col = RAMP_TEAL_WIND[4];
      else if (u > 0.14) col = RAMP_TEAL_WIND[2];
      else col = RAMP_TEAL_WIND[1];
      setPx(pen, x, y, col, 1.0, 0);
    });
  }
  // Golden wing-clasp crest on ankle
  drawDiamond(pen, 26, 35, 4.0, RAMP_GOLD[4], RAMP_GOLD[6], 0);
  setPx(pen, 25, 34, RAMP_GOLD[7], 1.0, 0);

  applyDarkSelout(surface, COL_SELOUT, SAFE_LPX);

  // Crisp cyan-gold speed lines trailing left of boot
  drawThickSeg(pen, 6, 30, 11, 30, 1.1, 0.45, (x, y) => setPx(pen, x, y, RAMP_TEAL_WIND[4], 0.95, 0.1));
  drawThickSeg(pen, 5, 37, 10, 37, 1.1, 0.45, (x, y) => setPx(pen, x, y, RAMP_GOLD[5], 0.95, 0.1));
  drawStar4(pen, 51, 13, 3, RAMP_TEAL_WIND[4], RAMP_TEAL_WIND[7], 0.14);
}

// Col 7: Aegis Vitality (kite shield with crisp faceted golden heart-gem)
function renderIcon7AegisVitality(pen, surface) {
  const cx = 31.5;

  // Noble gothic kite shield silhouette (`y = 9..55`)
  for (let y = 9; y <= 55; y++) {
    let halfW;
    if (y <= 13) {
      const t = (13 - y) / 4;
      halfW = 19.5 - t * 3.5;
    } else if (y <= 30) {
      halfW = 19.5 - ((y - 13) / 17) * 1.5;
    } else {
      const t = (y - 30) / 25;
      halfW = 18.0 * Math.pow(Math.max(0, 1 - t * t), 0.82);
    }
    const x0 = Math.round(cx - halfW);
    const x1 = Math.round(cx + halfW);
    for (let x = x0; x <= x1; x++) {
      const adx = Math.abs(x - cx);
      const isBorder = adx >= halfW - 3.0 || y <= 12.5 || y >= 52;
      if (isBorder) {
        const lit = x < cx || y < 14;
        setPx(pen, x, y, lit ? RAMP_GOLD[6] : RAMP_GOLD[4], 1.0, 0);
      } else {
        const quad = x < cx !== y < 29;
        const col = quad ? (x < cx ? RAMP_EMERALD[3] : RAMP_EMERALD[2]) : x < cx ? RAMP_EMERALD[2] : RAMP_EMERALD[1];
        setPx(pen, x, y, col, 1.0, 0);
      }
    }
  }

  // Unmistakable Iconic Pixel Heart-Gem (bold twin upper lobes + deep top V-cleft + crisp bottom point!)
  const heartMask = (px, py) => {
    const dx = px - cx;
    const adx = Math.abs(dx);
    // Two bold rounded upper lobes centered at `(cx +- 5.0, 25.5)` radius `5.6`
    const inLobeL = Math.hypot(px - (cx - 4.8), py - 25.5) <= 5.5;
    const inLobeR = Math.hypot(px - (cx + 4.8), py - 25.5) <= 5.5;
    // Lower tapered V-triangle from `y = 26` down to sharp point `(cx, 40.5)`
    const inLowerV = py >= 26 && py <= 40.5 && adx <= (40.5 - py) * 0.72;
    // Crisp top cleft notch right on centerline above `y = 24.5`
    if (py < 24.5 && adx < (24.5 - py) * 0.75) return false;
    return inLobeL || inLobeR || inLowerV;
  };

  for (let y = 19; y <= 42; y++) {
    for (let x = 19; x <= 44; x++) {
      if (!heartMask(x, y)) continue;
      // Dark bronze/obsidian inset border around heart gem
      const isEdge =
        !heartMask(x - 1, y) || !heartMask(x + 1, y) || !heartMask(x, y - 1) || !heartMask(x, y + 1);
      let col;
      if (isEdge) {
        col = RAMP_GOLD[1]; // dark burnished gold setting bezel
      } else if (x < cx - 1 && y < 27) {
        col = RAMP_GOLD[7]; // gleaming white-gold facet specular
      } else if (x < cx + 2 && y < 31) {
        col = RAMP_GOLD[6]; // #fef08a
      } else if (y < 35) {
        col = RAMP_GOLD[5]; // #facc15
      } else {
        col = RAMP_GOLD[4]; // rich #d97706 lower heart facet
      }
      setPx(pen, x, y, col, 1.0, 0);
    }
  }

  applyDarkSelout(surface, COL_SELOUT, SAFE_LPX);
  drawStar4(pen, 26, 23, 3, RAMP_GOLD[5], RAMP_GOLD[7], 0.14);
}

// Col 8: Companion Banner (royal crimson-gold war standard)
function renderIcon8CompanionBanner(pen, surface) {
  const cx = 31.5;

  drawThickSeg(pen, cx, 14, cx, 55, 1.7, 1.7, (x, y) => {
    setPx(pen, x, y, x < cx ? RAMP_GOLD[6] : RAMP_GOLD[2], 1.0, 0);
  });
  fillPolygon(
    pen,
    [
      [cx, 6],
      [cx + 4, 13],
      [cx, 15.5],
      [cx - 4, 13]
    ],
    (x, y) => {
      setPx(pen, x, y, x < cx ? RAMP_GOLD[7] : RAMP_GOLD[5], 1.0, 0);
    }
  );
  drawThickSeg(pen, 13, 16.5, 50, 16.5, 1.8, 1.8, (x, y) => {
    setPx(pen, x, y, y < 16.5 ? RAMP_GOLD[6] : RAMP_GOLD[4], 1.0, 0);
  });
  drawDiamond(pen, 12, 16.5, 2.3, RAMP_GOLD[4], RAMP_GOLD[7], 0);
  drawDiamond(pen, 51, 16.5, 2.3, RAMP_GOLD[4], RAMP_GOLD[7], 0);

  for (let y = 18; y <= 50; y++) {
    const wave = Math.sin((y - 18) * 0.22) * 1.3;
    const xL = Math.round(16 + wave);
    const xR = Math.round(47 + wave);
    for (let x = xL; x <= xR; x++) {
      if (y >= 41) {
        const notchHalf = (y - 40) * 1.15;
        if (Math.abs(x - (cx + wave)) < notchHalf) continue;
      }
      const isTrim = x <= xL + 2 || x >= xR - 2 || y === 18 || y >= 48;
      if (isTrim) {
        setPx(pen, x, y, x < cx ? RAMP_GOLD[6] : RAMP_GOLD[4], 1.0, 0);
      } else {
        const fold = Math.sin((x - cx) * 0.45 + (y - 18) * 0.1);
        const col = fold > 0.35 ? RAMP_CRIMSON[4] : fold > -0.35 ? RAMP_CRIMSON[3] : RAMP_CRIMSON[2];
        setPx(pen, x, y, col, 1.0, 0);
      }
    }
  }

  // Sharp golden sovereign star emblem centered on crimson banner
  drawStar4(pen, cx, 30, 7, RAMP_GOLD[5], RAMP_GOLD[7], 0);
  drawDiamond(pen, cx, 30, 3.6, RAMP_GOLD[5], RAMP_GOLD[7], 0);

  applyDarkSelout(surface, COL_SELOUT, SAFE_LPX);
}

// Col 9: Boss Crown (horned obsidian-gold sovereign crown)
function renderIcon9BossCrown(pen, surface) {
  const cx = 31.5;

  // Sweeping obsidian horns behind crown flanks
  for (const side of [-1, 1]) {
    const p0 = [cx + side * 13, 39];
    const p1 = [cx + side * 23, 27];
    const p2 = [cx + side * 19, 11];
    const steps = 14;
    for (let s = 0; s < steps; s++) {
      const u0 = s / steps;
      const u1 = (s + 1) / steps;
      const qx = (u) => (1 - u) * (1 - u) * p0[0] + 2 * (1 - u) * u * p1[0] + u * u * p2[0];
      const qy = (u) => (1 - u) * (1 - u) * p0[1] + 2 * (1 - u) * u * p1[1] + u * u * p2[1];
      drawThickSeg(pen, qx(u0), qy(u0), qx(u1), qy(u1), 4.5 * (1 - u0 * 0.7), 4.5 * (1 - u1 * 0.7), (x, y, d) => {
        const isRing = Math.abs(u0 - 0.38) < 0.08;
        const col = isRing ? RAMP_GOLD[6] : d < 1.3 ? RAMP_OBSIDIAN[5] : RAMP_OBSIDIAN[2];
        setPx(pen, x, y, col, 1.0, 0);
      });
    }
  }

  // Jagged 3-spire burnished gold crown
  fillPolygon(
    pen,
    [
      [14, 48],
      [12, 25],
      [21, 34],
      [cx, 14],
      [42, 34],
      [51, 25],
      [49, 48]
    ],
    (x, y) => {
      const isBand = y >= 40;
      const lit = x < cx - 3 || y < 22;
      let col;
      if (y === 40 || y === 47) col = RAMP_GOLD[2];
      else if (isBand) col = lit ? RAMP_GOLD[6] : x < cx + 5 ? RAMP_GOLD[5] : RAMP_GOLD[2];
      else col = lit ? RAMP_GOLD[6] : x < cx + 4 ? RAMP_GOLD[5] : RAMP_GOLD[4];
      setPx(pen, x, y, col, 1.0, 0);
    }
  );
  drawDiamond(pen, cx, 13, 2.5, RAMP_GOLD[5], RAMP_GOLD[7], 0);
  drawDiamond(pen, 12, 24, 2.0, RAMP_GOLD[5], RAMP_GOLD[7], 0);
  drawDiamond(pen, 51, 24, 2.0, RAMP_GOLD[4], RAMP_GOLD[6], 0);

  // Fiery crimson boss gem + flanking rubies
  drawDiamond(pen, cx, 39, 4.6, RAMP_CRIT[2], RAMP_CRIT[5], 0.12);
  setPx(pen, cx - 1, 38, RAMP_CRIT[7], 1.0, 0.16);
  drawDiamond(pen, 20, 43.5, 2.2, RAMP_CRIMSON[4], RAMP_GOLD[6], 0);
  drawDiamond(pen, 43, 43.5, 2.2, RAMP_CRIMSON[4], RAMP_GOLD[6], 0);

  applyDarkSelout(surface, COL_SELOUT, SAFE_LPX);
}

// Col 10: Soul Siphon (emerald-violet chalice/orb)
function renderIcon10SoulSiphon(pen, surface) {
  const cx = 31.5;

  // Ornate dark-obsidian & gold gothic chalice
  fillPolygon(
    pen,
    [
      [16, 30],
      [47, 30],
      [43, 40],
      [35, 44],
      [28, 44],
      [20, 40]
    ],
    (x, y) => {
      const rim = y <= 32 || Math.abs(x - cx) < 2.2;
      const col = rim ? (x < cx ? RAMP_GOLD[6] : RAMP_GOLD[4]) : x < cx ? RAMP_OBSIDIAN[4] : RAMP_OBSIDIAN[2];
      setPx(pen, x, y, col, 1.0, 0);
    }
  );
  drawThickSeg(pen, cx, 43, cx, 52, 2.6, 2.6, (x, y) => {
    setPx(pen, x, y, x < cx ? RAMP_OBSIDIAN[4] : RAMP_OBSIDIAN[2], 1.0, 0);
  });
  drawDiamond(pen, cx, 47.5, 3.3, RAMP_GOLD[4], RAMP_GOLD[6], 0);
  fillPolygon(
    pen,
    [
      [21, 51],
      [42, 51],
      [46, 55],
      [17, 55]
    ],
    (x, y) => {
      const col = y === 51 || y === 55 ? RAMP_GOLD[5] : x < cx ? RAMP_OBSIDIAN[4] : RAMP_OBSIDIAN[2];
      setPx(pen, x, y, col, 1.0, 0);
    }
  );

  // Hovering Rich Saturated Swirling Emerald-Violet Soul Orb (zero washout!)
  fillOvalPx(pen, cx, 19.5, 10.6, 10.6, (x, y, nx, ny, r) => {
    const ang = Math.atan2(ny, nx);
    const swirl = Math.sin(ang * 2 + r * 4.2);
    let col;
    if (r < 0.28) {
      col = RAMP_EMERALD[6]; // crisp luminous soul core
    } else if (swirl > 0.08) {
      col = r < 0.65 ? RAMP_EMERALD[4] : RAMP_EMERALD[2];
    } else {
      col = r < 0.65 ? RAMP_ASTRAL[4] : RAMP_ASTRAL[2];
    }
    // Specular highlight dot on upper-left of orb
    if (Math.hypot(nx + 0.36, ny + 0.36) < 0.2) {
      col = RAMP_EMERALD[7];
    }
    setPx(pen, x, y, col, 1.0, 0);
  });

  applyDarkSelout(surface, COL_SELOUT, SAFE_LPX);

  drawStar4(pen, 16, 16, 3, RAMP_EMERALD[3], RAMP_EMERALD[7], 0.14);
  drawStar4(pen, 47, 14, 3, RAMP_ASTRAL[4], RAMP_EMERALD[6], 0.14);
  drawDiamond(pen, cx, 6.5, 1.8, RAMP_EMERALD[3], RAMP_EMERALD[7], 0.14);
}

// Col 11: Relic Shop Chest (gothic obsidian-gold treasure chest)
function renderIcon11RelicShopChest(pen, surface) {
  const cx = 31.5;

  // Domed gothic obsidian lid
  for (let y = 16; y <= 31; y++) {
    const t = clamp01((31 - y) / 15);
    const inset = Math.round(t * t * 5);
    const xL = 11 + inset;
    const xR = 52 - inset;
    for (let x = xL; x <= xR; x++) {
      const isStrap = x <= xL + 3 || x >= xR - 3 || Math.abs(x - cx) <= 2.4 || y === 16 || y === 30;
      if (isStrap) {
        const lit = y < 24 || x < cx;
        setPx(pen, x, y, lit ? RAMP_GOLD[6] : RAMP_GOLD[4], 1.0, 0);
      } else {
        const rib = y === 21 || y === 26;
        const col = rib ? RAMP_OBSIDIAN[1] : y < 22 ? RAMP_OBSIDIAN[4] : RAMP_OBSIDIAN[2];
        setPx(pen, x, y, col, 1.0, 0);
      }
    }
  }

  // Radiant golden treasure glow seeping cleanly from lid seam
  for (let y = 31; y <= 33; y++) {
    for (let x = 12; x <= 51; x++) {
      const col = y === 32 ? RAMP_GOLD[7] : RAMP_GOLD[5];
      setPx(pen, x, y, col, 1.0, 0.14);
    }
  }

  // Heavy obsidian-gold chest body
  for (let y = 34; y <= 52; y++) {
    for (let x = 12; x <= 51; x++) {
      const isBand = x <= 16 || x >= 47 || y >= 49 || y === 34;
      if (isBand) {
        const lit = x < cx && y < 49;
        setPx(pen, x, y, lit ? RAMP_GOLD[5] : RAMP_GOLD[4], 1.0, 0);
      } else {
        const plank = x % 7 === 0;
        const col = plank ? RAMP_OBSIDIAN[1] : x < cx ? RAMP_OBSIDIAN[3] : RAMP_OBSIDIAN[2];
        setPx(pen, x, y, col, 1.0, 0);
      }
    }
  }

  // Ornate golden keyhole clasp plate
  fillPolygon(
    pen,
    [
      [cx - 4.5, 29],
      [cx + 4.5, 29],
      [cx + 4.5, 39],
      [cx, 43],
      [cx - 4.5, 39]
    ],
    (x, y) => {
      const isKeyhole = Math.hypot(x - cx, y - 34) <= 1.5 || (Math.abs(x - cx) <= 0.8 && y >= 35 && y <= 38.5);
      if (isKeyhole) {
        setPx(pen, x, y, COL_SELOUT, 1.0, 0);
      } else {
        const lit = x < cx || y < 32;
        setPx(pen, x, y, lit ? RAMP_GOLD[6] : RAMP_GOLD[4], 1.0, 0);
      }
    }
  );

  applyDarkSelout(surface, COL_SELOUT, SAFE_LPX);

  drawStar4(pen, 20, 11, 3, RAMP_GOLD[4], RAMP_GOLD[7], 0.14);
  drawStar4(pen, 45, 10, 3, RAMP_GOLD[4], RAMP_GOLD[7], 0.14);
}

const ICON_RENDERERS = [
  renderIcon0GoldCoin,
  renderIcon1AstralShard,
  renderIcon2SovereignBlade,
  renderIcon3ArcaneTapSigil,
  renderIcon4AvariceMagnet,
  renderIcon5ExecutionerCrit,
  renderIcon6TempestHaste,
  renderIcon7AegisVitality,
  renderIcon8CompanionBanner,
  renderIcon9BossCrown,
  renderIcon10SoulSiphon,
  renderIcon11RelicShopChest
];

function renderRow7HudIcons(pen, surface, col) {
  ICON_RENDERERS[col](pen, surface);
}

const ROW_RENDERERS = [
  renderRow0GoldCoinSpin,
  renderRow1AstralShardSpin,
  renderRow2TapSmiteSkybolt,
  renderRow3CritStarburst,
  renderRow4GoldFeverBurst,
  renderRow5CompanionAuraRing,
  renderRow6BossGatePortal,
  renderRow7HudIcons
];

const ROW_NAMES = [
  'GOLD_COIN_SPIN',
  'ASTRAL_SHARD_SPIN',
  'TAP_SMITE_SKYBOLT',
  'CRIT_STARBURST',
  'GOLD_FEVER_BURST',
  'COMPANION_AURA_RING',
  'BOSS_GATE_PORTAL',
  'HUD_ICONS'
];

// =========================================================================
// MAIN BUILD + BUILT-IN SELF-AUDIT
// =========================================================================
function main() {
  const sheetRgba = Buffer.alloc(SHEET_W * SHEET_H * 4);
  const surface = createPixelSurface(LOGICAL_SZ, LOGICAL_SZ);
  const pen = new ShaderPen(surface);
  const cellRgba = new Uint8ClampedArray(LOGICAL_SZ * LOGICAL_SZ * 4);

  let rawBorderClips = 0;
  let emptyCells = 0;
  let globalMinMarginLpx = LOGICAL_SZ;

  for (let row = 0; row < ROWS; row++) {
    const renderFn = ROW_RENDERERS[row];
    for (let col = 0; col < COLS; col++) {
      clearPixelSurface(surface);
      renderFn(pen, surface, col);
      resolveSurfaceToRGBA(surface, cellRgba, 1.0);

      let activePx = 0;
      let cellClip = false;
      let minX = LOGICAL_SZ;
      let maxX = -1;
      let minY = LOGICAL_SZ;
      let maxY = -1;

      for (let ly = 0; ly < LOGICAL_SZ; ly++) {
        for (let lx = 0; lx < LOGICAL_SZ; lx++) {
          const idx = (ly * LOGICAL_SZ + lx) * 4;
          const a = cellRgba[idx + 3];
          if (a < 24) {
            cellRgba[idx] = 0;
            cellRgba[idx + 1] = 0;
            cellRgba[idx + 2] = 0;
            cellRgba[idx + 3] = 0;
            continue;
          }
          if (lx < SAFE_LPX || lx >= LOGICAL_SZ - SAFE_LPX || ly < SAFE_LPX || ly >= LOGICAL_SZ - SAFE_LPX) {
            cellClip = true;
          }
          if (lx < minX) minX = lx;
          if (lx > maxX) maxX = lx;
          if (ly < minY) minY = ly;
          if (ly > maxY) maxY = ly;
          activePx++;
        }
      }

      if (cellClip) {
        rawBorderClips++;
        console.error(`[FAIL] Border clip at cell (col=${col}, row=${row} ${ROW_NAMES[row]})`);
      }
      if (activePx === 0) {
        emptyCells++;
        console.error(`[FAIL] Empty cell (col=${col}, row=${row} ${ROW_NAMES[row]})`);
      } else {
        const margin = Math.min(minX, LOGICAL_SZ - 1 - maxX, minY, LOGICAL_SZ - 1 - maxY);
        if (margin < globalMinMarginLpx) globalMinMarginLpx = margin;
      }

      // Exact 2x nearest-neighbor upscale (`64x64` -> `128x128`) into atlas
      const dstCellX = col * CELL_SZ;
      const dstCellY = row * CELL_SZ;
      for (let ly = 0; ly < LOGICAL_SZ; ly++) {
        for (let lx = 0; lx < LOGICAL_SZ; lx++) {
          const sIdx = (ly * LOGICAL_SZ + lx) * 4;
          const a = cellRgba[sIdx + 3];
          if (a === 0) continue;
          const r = cellRgba[sIdx];
          const g = cellRgba[sIdx + 1];
          const b = cellRgba[sIdx + 2];
          const ox = dstCellX + lx * SCALE;
          const oy = dstCellY + ly * SCALE;
          for (let sy = 0; sy < SCALE; sy++) {
            const rowOff = ((oy + sy) * SHEET_W + ox) * 4;
            for (let sx = 0; sx < SCALE; sx++) {
              const dIdx = rowOff + sx * 4;
              sheetRgba[dIdx] = r;
              sheetRgba[dIdx + 1] = g;
              sheetRgba[dIdx + 2] = b;
              sheetRgba[dIdx + 3] = a;
            }
          }
        }
      }
    }
  }

  // Final output-space audit directly across all 96 cells of the 1536x1024 RGBA buffer
  let outClips = 0;
  let outEmpty = 0;
  let minOutMargin = CELL_SZ;
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      let count = 0;
      let cellOutClip = false;
      let cMinX = CELL_SZ;
      let cMaxX = -1;
      let cMinY = CELL_SZ;
      let cMaxY = -1;
      for (let cy = 0; cy < CELL_SZ; cy++) {
        const gy = row * CELL_SZ + cy;
        for (let cx = 0; cx < CELL_SZ; cx++) {
          const gx = col * CELL_SZ + cx;
          const a = sheetRgba[(gy * SHEET_W + gx) * 4 + 3];
          if (a === 0) continue;
          count++;
          if (cx < SAFE_OUT_PX || cx >= CELL_SZ - SAFE_OUT_PX || cy < SAFE_OUT_PX || cy >= CELL_SZ - SAFE_OUT_PX) {
            cellOutClip = true;
          }
          if (cx < cMinX) cMinX = cx;
          if (cx > cMaxX) cMaxX = cx;
          if (cy < cMinY) cMinY = cy;
          if (cy > cMaxY) cMaxY = cy;
        }
      }
      if (count === 0) outEmpty++;
      if (cellOutClip) outClips++;
      if (count > 0) {
        const m = Math.min(cMinX, CELL_SZ - 1 - cMaxX, cMinY, CELL_SZ - 1 - cMaxY);
        if (m < minOutMargin) minOutMargin = m;
      }
    }
  }

  const totalCells = COLS * ROWS;
  if (rawBorderClips > 0 || outClips > 0) {
    throw new Error(`Self-audit failed: border clips detected (raw=${rawBorderClips}, out=${outClips}/${totalCells})`);
  }
  if (emptyCells > 0 || outEmpty > 0) {
    throw new Error(`Self-audit failed: empty cells detected (raw=${emptyCells}, out=${outEmpty}/${totalCells})`);
  }
  if (minOutMargin < SAFE_OUT_PX) {
    throw new Error(`Self-audit failed: min output margin ${minOutMargin}px < ${SAFE_OUT_PX}px`);
  }

  const pngBuf = encodePngRgba(SHEET_W, SHEET_H, sheetRgba);
  fs.writeFileSync(OUT_PNG, pngBuf);

  // Verify PNG signature & IHDR dimensions from written file on disk
  const diskBuf = fs.readFileSync(OUT_PNG);
  const pngW = diskBuf.readUInt32BE(16);
  const pngH = diskBuf.readUInt32BE(20);
  const bitDepth = diskBuf[24];
  const colorType = diskBuf[25];
  if (pngW !== SHEET_W || pngH !== SHEET_H || bitDepth !== 8 || colorType !== 6) {
    throw new Error(`PNG IHDR mismatch: ${pngW}x${pngH} depth=${bitDepth} colorType=${colorType}`);
  }

  console.log(
    `[OK] Built & audited ${path.relative(REPO_ROOT, OUT_PNG)}: ${pngW}x${pngH} RGBA (${COLS}x${ROWS}=${totalCells} cells @ ${CELL_SZ}x${CELL_SZ}), ${(diskBuf.length / 1024).toFixed(1)} KB`
  );
  console.log(
    `[AUDIT] borderClips=${outClips}/${totalCells}, emptyCells=${outEmpty}/${totalCells}, minMargin=${minOutMargin}px (>= ${SAFE_OUT_PX}px required, ${globalMinMarginLpx} lpx)`
  );
}

main();
