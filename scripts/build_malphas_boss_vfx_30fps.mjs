#!/usr/bin/env node
/**
 * Behemoth Malphas 2.0 — Dedicated 30fps HD-2D Boss Overlay VFX Sheet Builder
 * Output: `assets/sprites/boss_malphas_vfx_30fps.png`
 * Layout: 12 cols x 12 rows @ 256x256 (`3072x3072` RGBA, authored at `128x128` logical -> `2x NEAREST`)
 * Invariants:
 *   - 100% lossless nearest-neighbor pixel art (`2x2` uniform HD-2D blocks, matching Malphas 2.0 `boss_colossus_sheet.png`)
 *   - ZERO border clips (strict >= 4 lpx / >= 8 output px transparent margin on all 144 cells)
 *   - ZERO `ctx.rotate()` / `.ellipse()` / `.arc()` calls — pure `ArcaneShaderFX` integer rasterization
 *
 * Rows (12 frames each, seamless 24-30fps cycles):
 *   Row 0:  RIGHT_WING_FLAP_FULL      — Full articulated 12-frame Abyssal Right Wingbeat (socket pinned at (14, 160) in 256px)
 *   Row 1:  LEFT_WING_EMBER_SURGE     — Synchronized Left-Wing molten ember veins & abyssal wind-shear membrane overlay
 *   Row 2:  GRAB_CLAMP_TALONS_CHAINS  — Foreground Clamping Siege-Claw Talons & Forged Abyssal Chains (drawn OVER grabbed hero)
 *   Row 3:  GRAB_RUNE_VISE_SEAL       — Contracting Violet-Magenta Arcane Rune-Vise Cage & Crush Bursts (drawn OVER grabbed hero)
 *   Row 4:  RUNIC_GROUND_SIGIL        — Isometric 2.5D HD-2D Runic Ground Telegraph Circle & Molten Cracks
 *   Row 5:  LANE_FISSURE_SURGE        — Isometric Road Molten Fissure & Leftward Claw-Rune Surge (replaces `<<<` blocks)
 *   Row 6:  HELLFIRE_TORRENT_JET      — 30fps Roaring Horizontal Open-Jaw Hellfire Torrent Beam (pointing LEFT `-X`)
 *   Row 7:  TRIPLE_TALON_SLASH_WAVE   — 30fps Razor-Sharp 3-Talon Molten Crescent Slash Wave (sweeping LEFT `-X`)
 *   Row 8:  MAGMA_ERUPTION_PLUME      — 30fps Towering Volcanic Caldera Magma Eruption Plume & Shards
 *   Row 9:  PHASE2_BURNING_ECLIPSE    — Phase II/III Burning Abyssal-Solar Eclipse Corona & Swirling Ember Crown
 *   Row 10: PHASE3_ABYSSAL_LIGHTNING  — Phase III Razor-Thin Forked Abyssal Violet-Crimson-White Lightning Arcs
 *   Row 11: HEART_CORE_SHATTER_VORTEX — Exposed Heart-Core Shatter Vortex (strictly rendered ONLY when `isVulnerable`)
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
const OUT_PNG = path.join(REPO_ROOT, 'assets/sprites/boss_malphas_vfx_30fps.png');

const COLS = 12;
const ROWS = 12;
const LOGICAL_SZ = 128;
const SCALE = 2;
const CELL_SZ = LOGICAL_SZ * SCALE; // 256
const SHEET_W = COLS * CELL_SZ; // 3072
const SHEET_H = ROWS * CELL_SZ; // 3072
const SAFE_LPX = 4; // >= 8px transparent safety margin on 256x256 cells

// Neo-Vision EX Malphas Master Ramps
const RAMP_HELLFIRE = buildColorRamp(
  ['#240608', '#7f1d1d', '#b91c1c', '#dc2626', '#ea580c', '#fb923c', '#fde047', '#fffbeb'],
  8
);
const RAMP_SOLAR_GOLD = buildColorRamp(
  ['#2b1404', '#78350f', '#b45309', '#d97706', '#f59e0b', '#fbbf24', '#fef08a', '#ffffff'],
  8
);
const RAMP_VISE_VIOLET = buildColorRamp(
  ['#160728', '#3b0764', '#6b21a8', '#9333ea', '#a855f7', '#d946ef', '#f5d0fe', '#ffffff'],
  8
);
const RAMP_CRIMSON_LIGHTNING = buildColorRamp(
  ['#24051a', '#701a75', '#be185d', '#e11d48', '#f43f5e', '#fb7185', '#fecdd3', '#ffffff'],
  8
);
const RAMP_CORE_SHATTER = buildColorRamp(
  ['#082f49', '#0369a1', '#0ea5e9', '#38bdf8', '#67e8f9', '#fef08a', '#ffffff', '#ffffff'],
  8
);
const RAMP_OBSIDIAN_ARMOR = buildColorRamp(
  ['#0d0f1c', '#181432', '#261e4e', '#3c3072', '#6050a8', '#a298e4', '#e0dcff', '#ffffff'],
  8
);
const RAMP_WING_MEMBRANE = buildColorRamp(
  ['#1a0714', '#380c24', '#6a162c', '#9e1f30', '#cf3038', '#ea580c', '#fbbf24', '#fffbeb'],
  8
);

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
  const crcInput = Buffer.concat([typeBuf, dataBuf]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
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
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
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

function distToSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy || 1e-6;
  const t = clamp01(((px - ax) * dx + (py - ay) * dy) / lenSq);
  const cx = ax + dx * t;
  const cy = ay + dy * t;
  return { d: Math.hypot(px - cx, py - cy), t };
}

function drawQuadPixel(pen, x0, y0, x1, y1, x2, y2, x3, y3, fillFn) {
  const minX = Math.max(SAFE_LPX, Math.floor(Math.min(x0, x1, x2, x3)));
  const maxX = Math.min(LOGICAL_SZ - 1 - SAFE_LPX, Math.ceil(Math.max(x0, x1, x2, x3)));
  const minY = Math.max(SAFE_LPX, Math.floor(Math.min(y0, y1, y2, y3)));
  const maxY = Math.min(LOGICAL_SZ - 1 - SAFE_LPX, Math.ceil(Math.max(y0, y1, y2, y3)));
  const triArea = (ax, ay, bx, by, cx, cy) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const inTri = (px, py, ax, ay, bx, by, cx, cy) => {
    const d1 = triArea(px, py, ax, ay, bx, by);
    const d2 = triArea(px, py, bx, by, cx, cy);
    const d3 = triArea(px, py, cx, cy, ax, ay);
    const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
    const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(hasNeg && hasPos);
  };
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (inTri(x, y, x0, y0, x1, y1, x2, y2) || inTri(x, y, x0, y0, x2, y2, x3, y3)) {
        fillFn(x, y);
      }
    }
  }
}

function drawThickSeg(pen, ax, ay, bx, by, rStart, rEnd, colFn) {
  const maxR = Math.max(rStart, rEnd) + 2;
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

function setPx(pen, x, y, col, alpha = 1, glow = 0) {
  const ix = Math.round(x);
  const iy = Math.round(y);
  if (ix < SAFE_LPX || ix >= LOGICAL_SZ - SAFE_LPX || iy < SAFE_LPX || iy >= LOGICAL_SZ - SAFE_LPX) {
    return;
  }
  pen.writeRawStipple(ix, iy, col, alpha);
  if (glow > 0.02) {
    pen.writeRawGlow(ix, iy, col, glow);
  }
}

function drawStar4(pen, cx, cy, armLen, colOuter, colCore, glow = 0.7) {
  const icx = Math.round(cx);
  const icy = Math.round(cy);
  for (let d = -armLen; d <= armLen; d++) {
    const ad = Math.abs(d);
    const col = ad <= Math.max(1, Math.floor(armLen * 0.35)) ? colCore : colOuter;
    const a = clamp01(1 - ad / (armLen + 1.2));
    setPx(pen, icx + d, icy, col, a, glow * a);
    setPx(pen, icx, icy + d, col, a, glow * a);
  }
  const diag = Math.max(1, Math.floor(armLen * 0.35));
  for (let dy = -diag; dy <= diag; dy++) {
    for (let dx = -diag; dx <= diag; dx++) {
      if (Math.abs(dx) + Math.abs(dy) <= diag + 1) {
        setPx(pen, icx + dx, icy + dy, Math.abs(dx) + Math.abs(dy) <= 1 ? colCore : colOuter, 1, glow);
      }
    }
  }
}

function drawForkedBolt(pen, x0, y0, x1, y1, jitter, seed, ramp, coreThick = 1.0, glow = 0.85, forks = 2) {
  const rng = new DeterministicRng(seed);
  const dist = Math.hypot(x1 - x0, y1 - y0) || 1;
  const jitterFrac = Math.min(0.45, Math.max(0.08, jitter / dist));
  const rawPts = buildLightningChain(rng, x0, y0, x1, y1, jitterFrac, 3);
  const pts = rawPts.map(([x, y]) => ({
    x: Math.max(SAFE_LPX + 1, Math.min(LOGICAL_SZ - SAFE_LPX - 2, x)),
    y: Math.max(SAFE_LPX + 1, Math.min(LOGICAL_SZ - SAFE_LPX - 2, y))
  }));
  // Pass 1: outer electric rim
  for (let i = 0; i < pts.length - 1; i++) {
    drawThickSeg(pen, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, coreThick + 1.2, coreThick + 1.0, (x, y) => {
      setPx(pen, x, y, ramp[3], 0.92, glow * 0.55);
    });
  }
  // Pass 2: bright mid
  for (let i = 0; i < pts.length - 1; i++) {
    drawThickSeg(pen, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, coreThick + 0.35, coreThick + 0.25, (x, y) => {
      setPx(pen, x, y, ramp[5], 1.0, glow * 0.85);
    });
  }
  // Pass 3: razor-white core
  for (let i = 0; i < pts.length - 1; i++) {
    drawThickSeg(pen, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, Math.max(0.65, coreThick * 0.55), Math.max(0.55, coreThick * 0.45), (x, y) => {
      setPx(pen, x, y, ramp[7], 1.0, glow);
    });
  }
  // Acute sub-forks
  for (let b = 0; b < forks; b++) {
    const idx = 2 + Math.floor(rng.nextFloat() * Math.max(1, pts.length - 4));
    const root = pts[idx];
    const dirAng = Math.atan2(y1 - y0, x1 - x0) + (b % 2 === 0 ? 0.52 : -0.52) + (rng.nextFloat() - 0.5) * 0.25;
    const len = 14 + rng.nextFloat() * 16;
    const bx = Math.max(SAFE_LPX + 2, Math.min(LOGICAL_SZ - SAFE_LPX - 3, root.x + Math.cos(dirAng) * len));
    const by = Math.max(SAFE_LPX + 2, Math.min(LOGICAL_SZ - SAFE_LPX - 3, root.y + Math.sin(dirAng) * len));
    const rawFork = buildLightningChain(rng, root.x, root.y, bx, by, 0.22, 2);
    for (let i = 0; i < rawFork.length - 1; i++) {
      drawThickSeg(pen, rawFork[i][0], rawFork[i][1], rawFork[i + 1][0], rawFork[i + 1][1], 1.3, 0.7, (x, y, d) => {
        setPx(pen, x, y, d <= 0.65 ? ramp[7] : ramp[4], 0.95, glow * 0.75);
      });
    }
  }
}

// =========================================================================
// ROW 0: RIGHT_WING_FLAP_FULL (12-frame articulated right bat-dragon wing)
// Exact shoulder socket pinned at (7, 80) in 128-grid = (14, 160) in 256px = (28, 320) in 512px!
// =========================================================================
function renderRow0RightWing(pen, frame) {
  const phase = (frame / COLS) * Math.PI * 2;
  const flap = Math.sin(phase); // -1 (downstroke) .. +1 (upstroke)
  const lag = Math.sin(phase - 0.55); // outer tip whip lag!

  const sx = 8;
  const sy = 80;
  // Elbow & wrist apex
  const ex = 38 + flap * 4;
  const ey = 56 - flap * 12;
  const ax = 68 + lag * 5;
  const ay = 36 - flap * 16 - lag * 5;

  // 4 sweeping wing-finger tips extending right & fanning down
  const tips = [
    { x: 117 - Math.abs(flap) * 3, y: 40 - flap * 16 - lag * 10 },
    { x: 109 - flap * 2, y: 69 - flap * 10 - lag * 8 },
    { x: 88 - flap * 2, y: 92 - flap * 6 - lag * 5 },
    { x: 60 - flap * 1, y: 102 - flap * 4 - lag * 3 },
    { x: 30, y: 96 - flap * 2 }
  ];

  // Fill tattered crimson-garnet leathery membranes with scalloped lower arcs & glowing ember veins
  const drawWebPanel = (p0, p1, p2, p3, panelIdx) => {
    drawQuadPixel(pen, p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y, (x, y) => {
      // Scalloped bat-wing bottom cutout between p2 and p3
      const dx = p2.x - p3.x;
      const dy = p2.y - p3.y;
      const lenSq = dx * dx + dy * dy || 1;
      const u = clamp01(((x - p3.x) * dx + (y - p3.y) * dy) / lenSq);
      const edgeY = p3.y + dy * u - Math.sin(u * Math.PI) * (7.5 + panelIdx * 0.8);
      if (y > edgeY) return;
      const n = fbmNoise2D(x * 0.11 + panelIdx * 2.1, y * 0.11 - phase * 0.35, 3);
      const ridgeDist = Math.abs(Math.sin((u * 3.0 + n * 0.65) * Math.PI));
      const nearFold = y < p1.y + 10 ? 0.15 : 0;
      const emberVein = ridgeDist < 0.08 && n > 0.48 && y > p1.y + 5;
      if (emberVein) {
        const pulse = 0.5 + 0.5 * Math.sin(phase * 2 + x * 0.15 + panelIdx);
        setPx(pen, x, y, pulse > 0.55 ? RAMP_HELLFIRE[6] : RAMP_HELLFIRE[4], 1.0, 0.72);
      } else {
        const shade = clamp01(0.28 + n * 0.42 + (1 - (y - 25) / 85) * 0.22 - nearFold);
        const idx = shade > 0.72 ? 4 : shade > 0.52 ? 3 : shade > 0.34 ? 2 : 1;
        setPx(pen, x, y, RAMP_WING_MEMBRANE[idx], 1.0, 0.08);
      }
    });
  };

  drawWebPanel({ x: sx, y: sy }, { x: ex, y: ey }, tips[3], tips[4], 0);
  drawWebPanel({ x: ex, y: ey }, { x: ax, y: ay }, tips[2], tips[3], 1);
  drawWebPanel({ x: ax, y: ay }, { x: ax + 14, y: ay + 2 }, tips[1], tips[2], 2);
  drawWebPanel({ x: ax, y: ay }, tips[0], tips[1], { x: ax + 6, y: ay + 10 }, 3);

  // Draw skeletal obsidian-indigo finger struts
  const struts = [
    [ax, ay, tips[0].x, tips[0].y, 2.4, 1.0],
    [ax, ay, tips[1].x, tips[1].y, 2.2, 0.9],
    [ax, ay, tips[2].x, tips[2].y, 2.0, 0.9],
    [ex, ey, tips[3].x, tips[3].y, 2.0, 0.9],
    [sx, sy, tips[4].x, tips[4].y, 2.2, 1.0]
  ];
  for (const [x0, y0, x1, y1, r0, r1] of struts) {
    drawThickSeg(pen, x0, y0, x1, y1, r0 + 0.8, r1 + 0.6, (x, y, d, rad) => {
      const col = d > rad - 0.85 ? RAMP_OBSIDIAN_ARMOR[0] : d < rad * 0.45 ? RAMP_OBSIDIAN_ARMOR[4] : RAMP_OBSIDIAN_ARMOR[2];
      setPx(pen, x, y, col, 1.0, 0);
    });
  }

  // Main armored wing-arm leading arch (shoulder -> elbow -> apex -> tip0)
  const armSegs = [
    [sx, sy, ex, ey, 4.4, 3.6],
    [ex, ey, ax, ay, 3.6, 3.2],
    [ax, ay, tips[0].x, tips[0].y, 2.9, 1.1]
  ];
  for (const [x0, y0, x1, y1, r0, r1] of armSegs) {
    drawThickSeg(pen, x0, y0, x1, y1, r0 + 0.9, r1 + 0.7, (x, y, d, rad) => {
      const topRim = y < (y0 + y1) * 0.5 && d > rad * 0.35 && d < rad - 0.75;
      const col =
        d > rad - 0.85
          ? RAMP_OBSIDIAN_ARMOR[0]
          : topRim
            ? RAMP_OBSIDIAN_ARMOR[5]
            : d < rad * 0.45
              ? RAMP_OBSIDIAN_ARMOR[3]
              : RAMP_OBSIDIAN_ARMOR[2];
      setPx(pen, x, y, col, 1.0, 0);
    });
  }

  // Gilded royal-gold wing-spurs at apex & elbow + pinned gold shoulder joint at (8, 80)
  drawThickSeg(pen, ax, ay, ax - 3, ay - 11, 2.2, 0.7, (x, y, d, rad) => {
    setPx(pen, x, y, d > rad - 0.6 ? RAMP_SOLAR_GOLD[2] : RAMP_SOLAR_GOLD[6], 1.0, 0.35);
  });
  drawThickSeg(pen, ax + 5, ay - 1, ax + 11, ay - 9, 1.7, 0.6, (x, y, d, rad) => {
    setPx(pen, x, y, d > rad - 0.6 ? RAMP_SOLAR_GOLD[2] : RAMP_SOLAR_GOLD[5], 1.0, 0.3);
  });
  drawThickSeg(pen, sx - 1, sy, sx + 5, sy - 3, 4.2, 3.2, (x, y, d, rad) => {
    setPx(pen, x, y, d < rad * 0.5 ? RAMP_SOLAR_GOLD[5] : RAMP_OBSIDIAN_ARMOR[1], 1.0, 0.15);
  });
}

// =========================================================================
// ROW 1: LEFT_WING_EMBER_SURGE (Synchronized blazing ember veins + wind-shear)
// Socket pinned at (120, 80) in 128-grid = (240, 160) in 256px
// =========================================================================
function renderRow1LeftWingEmbers(pen, frame) {
  const phase = (frame / COLS) * Math.PI * 2;
  const flap = Math.sin(phase);
  const lag = Math.sin(phase - 0.55);

  const sx = 120;
  const sy = 80;
  const ax = 58 - lag * 5;
  const ay = 38 - flap * 15 - lag * 4;
  const tipX = 14 + Math.abs(flap) * 4;
  const tipY = 44 - flap * 16 - lag * 10;

  // Sweeping luminous molten-crimson & violet-ember wind ribbons trailing off wing arch
  for (let r = 0; r < 4; r++) {
    const tOff = r * 0.24;
    const yShift = r * 14;
    const xEnd = Math.max(SAFE_LPX + 3, tipX + r * 11);
    const yEnd = Math.min(LOGICAL_SZ - SAFE_LPX - 4, tipY + yShift + Math.sin(phase + r) * 6);
    const mx = (sx + xEnd) * 0.5 - 6;
    const my = Math.max(SAFE_LPX + 5, ay + yShift * 0.65 - 6);
    const ramp = r % 2 === 0 ? RAMP_HELLFIRE : RAMP_VISE_VIOLET;
    const segs = 10;
    for (let s = 0; s < segs; s++) {
      const u0 = s / segs;
      const u1 = (s + 1) / segs;
      const qx = (u) => (1 - u) * (1 - u) * sx + 2 * (1 - u) * u * mx + u * u * xEnd;
      const qy = (u) => (1 - u) * (1 - u) * sy + 2 * (1 - u) * u * my + u * u * yEnd;
      const wave = 0.5 + 0.5 * Math.sin(phase * 2 - u0 * 5.0 + tOff * 6.0);
      if (wave < 0.28) continue;
      drawThickSeg(pen, qx(u0), qy(u0), qx(u1), qy(u1), 1.6 * (1 - u0 * 0.5), 1.4 * (1 - u1 * 0.5), (x, y, d) => {
        const col = d < 0.7 ? ramp[6] : ramp[4];
        setPx(pen, x, y, col, clamp01(wave * 0.92), 0.78);
      });
    }
  }

  // Rising drifting ember sparks along wing wake
  const rng = new DeterministicRng(7100 + frame * 17);
  for (let i = 0; i < 16; i++) {
    const u = ((i / 16) + frame / COLS) % 1;
    const px = Math.round(sx - u * 102 + (rng.nextFloat() - 0.5) * 10);
    const py = Math.round(sy - 28 + Math.sin(u * Math.PI * 2 + phase) * 26 + (rng.nextFloat() - 0.5) * 18);
    if (px >= SAFE_LPX + 2 && px < LOGICAL_SZ - SAFE_LPX - 2 && py >= SAFE_LPX + 2 && py < LOGICAL_SZ - SAFE_LPX - 2) {
      drawStar4(pen, px, py, i % 3 === 0 ? 3 : 2, RAMP_HELLFIRE[4], RAMP_HELLFIRE[7], 0.85);
    }
  }
}

// =========================================================================
// ROW 2: GRAB_CLAMP_TALONS_CHAINS (Foreground Clamping Siege-Claw Talons + Chains!)
// Drawn IN FRONT OF the pinned hero during ABYSSAL SIEGE GRAB!
// Frames 0..2: snapping shut; Frames 3..11: rhythmic vise-crush clench pulses!
// =========================================================================
function renderRow2GrabClampTalons(pen, frame) {
  const phase = (frame / COLS) * Math.PI * 2;
  const snapClose = frame < 3 ? frame / 2 : 1.0;
  const squeeze = frame >= 3 ? 0.5 + 0.5 * Math.sin((frame - 3) * (Math.PI * 2 / 3)) : 0;
  const clenchPx = Math.round(snapClose * 10 + squeeze * 5);

  // 1. Taut Criss-Crossing Forged Obsidian & Violet-Runed Abyssal Chains wrapping the pinned hero
  const drawChainArc = (x0, y0, cx, cy, x1, y1, linkCount, glowBoost) => {
    for (let i = 0; i < linkCount; i++) {
      const u = (i + 0.5) / linkCount;
      const lx = (1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * cx + u * u * x1;
      const ly = (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * cy + u * u * y1;
      const uNext = Math.min(1, (i + 1.0) / linkCount);
      const nx = (1 - uNext) * (1 - uNext) * x0 + 2 * (1 - uNext) * uNext * cx + uNext * uNext * x1;
      const ny = (1 - uNext) * (1 - uNext) * y0 + 2 * (1 - uNext) * uNext * cy + uNext * uNext * y1;
      const isVertical = i % 2 === 0;
      const rad = isVertical ? 3.2 : 2.3;
      drawThickSeg(pen, lx, ly, nx, ny, rad, rad, (x, y, d, r) => {
        if (isVertical && d < r * 0.38) return; // hollow chain link eyelet!
        const col =
          d > r - 0.8
            ? RAMP_OBSIDIAN_ARMOR[0]
            : glowBoost > 0.5 && Math.abs(d - r * 0.55) < 0.7
              ? RAMP_VISE_VIOLET[5]
              : d < r * 0.65
                ? RAMP_OBSIDIAN_ARMOR[4]
                : RAMP_OBSIDIAN_ARMOR[2];
        setPx(pen, x, y, col, 1.0, glowBoost * 0.45);
      });
    }
  };

  drawChainArc(20, 34 + clenchPx * 0.3, 64, 54, 110, 42 - clenchPx * 0.2, 11, squeeze);
  drawChainArc(18, 92 - clenchPx * 0.3, 64, 74, 112, 86 + clenchPx * 0.2, 11, squeeze);
  drawChainArc(28, 22, 58, 64, 102, 104, 12, squeeze * 0.8);

  // 2. Three Massive Curved Foreground Obsidian-and-Gold Siege Talons wrapping from RIGHT -> LEFT across hero!
  const talons = [
    { rootX: 112, rootY: 36 - clenchPx * 0.3, midX: 74, midY: 28 + clenchPx * 0.45, tipX: 30 + clenchPx * 0.8, tipY: 44 + clenchPx * 0.75, w: 6.2 },
    { rootX: 116, rootY: 64, midX: 72, midY: 60 + clenchPx * 0.2, tipX: 24 + clenchPx, tipY: 66 + clenchPx * 0.25, w: 7.0 },
    { rootX: 110, rootY: 94 + clenchPx * 0.3, midX: 74, midY: 96 - clenchPx * 0.45, tipX: 32 + clenchPx * 0.8, tipY: 86 - clenchPx * 0.65, w: 6.0 }
  ];

  // Lower opposable thumb talon clamping upward from bottom-left!
  const thumb = {
    rootX: 98, rootY: 108, midX: 60, midY: 106 - clenchPx * 0.5, tipX: 40 + clenchPx * 0.4, tipY: 82 - clenchPx * 0.7, w: 5.4
  };
  const allClaws = [...talons, thumb];

  for (const cl of allClaws) {
    const steps = 14;
    for (let s = 0; s < steps; s++) {
      const u0 = s / steps;
      const u1 = (s + 1) / steps;
      const qx = (u) => (1 - u) * (1 - u) * cl.rootX + 2 * (1 - u) * u * cl.midX + u * u * cl.tipX;
      const qy = (u) => (1 - u) * (1 - u) * cl.rootY + 2 * (1 - u) * u * cl.midY + u * u * cl.tipY;
      const r0 = cl.w * (1 - u0 * 0.82);
      const r1 = cl.w * (1 - u1 * 0.82);
      drawThickSeg(pen, qx(u0), qy(u0), qx(u1), qy(u1), r0, r1, (x, y, d, rad) => {
        const isTip = u0 > 0.68;
        const isGoldBand = Math.abs(u0 - 0.28) < 0.065 || Math.abs(u0 - 0.56) < 0.055;
        let col;
        let gl = 0;
        if (d > rad - 1.0) {
          col = RAMP_OBSIDIAN_ARMOR[0];
        } else if (isGoldBand) {
          col = d < rad * 0.45 ? RAMP_SOLAR_GOLD[6] : RAMP_SOLAR_GOLD[4];
          gl = 0.25;
        } else if (isTip) {
          col = d < rad * 0.45 ? RAMP_HELLFIRE[6] : RAMP_HELLFIRE[3];
          gl = 0.45 + squeeze * 0.35;
        } else {
          col = y < qy(u0) ? RAMP_OBSIDIAN_ARMOR[5] : d < rad * 0.5 ? RAMP_OBSIDIAN_ARMOR[3] : RAMP_OBSIDIAN_ARMOR[1];
        }
        setPx(pen, x, y, col, 1.0, gl);
      });
    }
    // Glowing rune spark on each talon tip during squeeze
    if (squeeze > 0.35) {
      drawStar4(pen, cl.tipX, cl.tipY, 3 + Math.round(squeeze * 2), RAMP_VISE_VIOLET[5], RAMP_VISE_VIOLET[7], 0.9);
    }
  }

  // Arcane violet shackle glow node at right knuckle junction
  drawStar4(pen, 102, 64, 5 + Math.round(squeeze * 3), RAMP_VISE_VIOLET[4], RAMP_VISE_VIOLET[7], 0.85);
}

// =========================================================================
// ROW 3: GRAB_RUNE_VISE_SEAL (Contracting Violet Rune-Vise Cage + Squeeze Flash)
// =========================================================================
function renderRow3GrabRuneVise(pen, frame) {
  const phase = (frame / COLS) * Math.PI * 2;
  // Rhythmic 3-cycle contraction matching vise-crush beats
  const cycle = (frame % 4) / 3; // 0 (wide) -> 1 (crushed tight!)
  const radOuter = 54 - cycle * 15;
  const radInner = 37 - cycle * 11;
  const cx = 64;
  const cy = 64;

  pen.shadeBox(SAFE_LPX, SAFE_LPX, LOGICAL_SZ - 1 - SAFE_LPX, LOGICAL_SZ - 1 - SAFE_LPX, (x, y, out) => {
    const dx = x - cx;
    const dy = y - cy;
    const r = Math.hypot(dx, dy);
    const ang = Math.atan2(dy, dx);

    const dOuter = Math.abs(r - radOuter);
    const dInner = Math.abs(r - radInner);

    // Outer segmented rotating runic vise ring
    if (dOuter <= 2.6) {
      const seg = Math.sin(ang * 8 + phase);
      if (seg > -0.35) {
        out.color = dOuter <= 1.0 ? RAMP_VISE_VIOLET[7] : RAMP_VISE_VIOLET[4];
        out.alpha = 0.95;
        out.glowStrength = 0.82;
        return out.color;
      }
    }
    // Inner octagonal rune ring
    const octR = radInner / Math.cos(((Math.abs((ang + phase * 0.5) % (Math.PI / 4)) - Math.PI / 8)));
    const dOct = Math.abs(r - octR * 0.92);
    if (dOct <= 1.8) {
      out.color = cycle > 0.7 ? RAMP_CRIMSON_LIGHTNING[6] : RAMP_VISE_VIOLET[5];
      out.alpha = 0.92;
      out.glowStrength = 0.78;
      return out.color;
    }
    // Inward clamping arcane chevron teeth at 4 cardinal vise points
    const cardDist = Math.min(Math.abs(dx), Math.abs(dy));
    if (cardDist <= 2.5 && r >= radInner - 8 && r <= radOuter + 4) {
      out.color = cardDist <= 1.0 ? RAMP_VISE_VIOLET[7] : RAMP_CRIMSON_LIGHTNING[4];
      out.alpha = 0.96;
      out.glowStrength = 0.88;
      return out.color;
    }
    return null;
  });

  // 4 inward-clamping lightning vise arcs snapping across the hero on peak squeeze frames
  const viseAngles = [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5];
  for (let i = 0; i < 4; i++) {
    const a = viseAngles[i] + phase * 0.35;
    const x0 = cx + Math.cos(a) * (radOuter + 2);
    const y0 = cy + Math.sin(a) * (radOuter + 2);
    const x1 = cx + Math.cos(a) * (radInner - 6);
    const y1 = cy + Math.sin(a) * (radInner - 6);
    drawStar4(pen, x0, y0, 4, RAMP_VISE_VIOLET[4], RAMP_VISE_VIOLET[7], 0.9);
    if (cycle >= 0.65) {
      drawForkedBolt(pen, x0, y0, x1, y1, 4.0, 9200 + frame * 31 + i * 7, RAMP_VISE_VIOLET, 0.9, 0.9, 1);
    }
  }
}

// =========================================================================
// ROW 4: RUNIC_GROUND_SIGIL (Isometric 2.5D HD-2D Runic Ground Telegraph Circle)
// =========================================================================
function renderRow4RunicGroundSigil(pen, frame) {
  const phase = (frame / COLS) * Math.PI * 2;
  const pulse = 0.5 + 0.5 * Math.sin(phase * 2);
  const cx = 64;
  const cy = 66;
  const rx = 54;
  const ry = 25; // clean 2.5D isometric floor squash

  pen.shadeBox(SAFE_LPX, SAFE_LPX, LOGICAL_SZ - 1 - SAFE_LPX, LOGICAL_SZ - 1 - SAFE_LPX, (x, y, out) => {
    const nx = (x - cx) / rx;
    const ny = (y - cy) / ry;
    const r = Math.hypot(nx, ny);
    const ang = Math.atan2(ny, nx);
    if (r > 1.05) return null;

    // Outer double beveled runic ring
    if (Math.abs(r - 0.94) <= 0.055) {
      const notch = Math.sin(ang * 12 + phase) > -0.25;
      if (notch) {
        out.color = Math.abs(r - 0.94) <= 0.022 ? RAMP_HELLFIRE[6] : RAMP_HELLFIRE[3];
        out.alpha = 0.96;
        out.glowStrength = 0.85;
        return out.color;
      }
    }
    if (Math.abs(r - 0.78) <= 0.032) {
      out.color = RAMP_SOLAR_GOLD[5];
      out.alpha = 0.88;
      out.glowStrength = 0.7;
      return out.color;
    }

    // Inscribed rotating hexagram rune star inside the isometric floor circle
    const a1 = ang + phase * 0.5;
    const hexA = 0.74 / Math.max(0.5, Math.cos(((a1 % (Math.PI * 2 / 3) + Math.PI * 2 / 3) % (Math.PI * 2 / 3)) - Math.PI / 3) * 2);
    const a2 = ang + phase * 0.5 + Math.PI / 3;
    const hexB = 0.74 / Math.max(0.5, Math.cos(((a2 % (Math.PI * 2 / 3) + Math.PI * 2 / 3) % (Math.PI * 2 / 3)) - Math.PI / 3) * 2);
    if (Math.abs(r - hexA) <= 0.035 || Math.abs(r - hexB) <= 0.035) {
      out.color = r < 0.48 ? RAMP_HELLFIRE[6] : RAMP_HELLFIRE[4];
      out.alpha = 0.85;
      out.glowStrength = 0.72;
      return out.color;
    }

    // Radiating glowing molten fissure veins across the floor circle
    const f = fbmNoise2D(nx * 4.5, ny * 4.5 + phase * 0.2, 3);
    const crack = Math.abs(Math.sin(ang * 5.0 + f * 3.8));
    if (r < 0.88 && crack < 0.065) {
      out.color = r < 0.38 ? RAMP_HELLFIRE[7] : RAMP_HELLFIRE[4];
      out.alpha = clamp01((0.9 - r) * 1.15);
      out.glowStrength = 0.82;
      return out.color;
    }

    // Subtle Bayer-dithered incandescent center core pool
    if (r < 0.74) {
      const heat = (1 - r / 0.74) * (0.28 + pulse * 0.16);
      if (((x & 1) === (y & 1)) && heat > 0.14) {
        out.color = r < 0.28 ? RAMP_HELLFIRE[5] : RAMP_HELLFIRE[2];
        out.alpha = clamp01(heat);
        out.glowStrength = 0.45;
        return out.color;
      }
    }
    return null;
  });

  // 6 orbiting cardinal rune nodes along the outer isometric perimeter
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + phase * 0.5;
    const nx = cx + Math.cos(a) * rx * 0.94;
    const ny = cy + Math.sin(a) * ry * 0.94;
    drawStar4(pen, nx, ny, i % 2 === 0 ? 4 : 3, RAMP_SOLAR_GOLD[5], RAMP_HELLFIRE[7], 0.92);
  }
}

// =========================================================================
// ROW 5: LANE_FISSURE_SURGE (Isometric Molten Claw-Fissure & Leftward Runic Surge)
// Replaces crude `<<<` block chevrons in `drawTelegraphRings`!
// =========================================================================
function renderRow5LaneFissureSurge(pen, frame) {
  const scroll = (frame / COLS); // scrolls cleanly LEFTWARD (`-X`)

  // 3 staggered jagged molten claw-rake floor fissures running horizontally across the tile
  const laneYs = [42, 64, 86];
  for (let li = 0; li < 3; li++) {
    const baseY = laneYs[li];
    const laneRng = new DeterministicRng(5100 + li * 97 + (frame % 4) * 13);
    const pts = buildLightningChain(laneRng, SAFE_LPX + 4, baseY, LOGICAL_SZ - SAFE_LPX - 5, baseY, 0.055, 3);
    for (let i = 0; i < pts.length - 1; i++) {
      const u = i / (pts.length - 1);
      const pulse = 0.5 + 0.5 * Math.sin((u + scroll) * Math.PI * 4 + li);
      drawThickSeg(pen, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 2.2, 2.0, (x, y, d) => {
        const col = d < 0.85 ? (pulse > 0.55 ? RAMP_HELLFIRE[7] : RAMP_HELLFIRE[5]) : RAMP_HELLFIRE[2];
        setPx(pen, x, y, col, 0.92, 0.76);
      });
    }
  }

  // Sweeping razor-tapered HD-2D leftward directional runic spearhead glyphs (zero blocky chevrons!)
  for (let k = 0; k < 2; k++) {
    const uPos = ((1.0 - scroll) + k * 0.5) % 1.0;
    const tipX = 16 + uPos * 88;
    const midY = 64;
    const fade = Math.sin(uPos * Math.PI);
    if (fade <= 0.15) continue;

    // Swept dual curved razor wings pointing LEFT (`-X`)
    const drawSweptWing = (dirY) => {
      const p0x = tipX;
      const p0y = midY;
      const p1x = tipX + 14;
      const p1y = midY + dirY * 14;
      const p2x = tipX + 26;
      const p2y = midY + dirY * 22;
      drawThickSeg(pen, p0x, p0y, p1x, p1y, 2.6, 1.8, (x, y, d) => {
        setPx(pen, x, y, d < 0.9 ? RAMP_SOLAR_GOLD[7] : RAMP_HELLFIRE[4], fade, 0.88);
      });
      drawThickSeg(pen, p1x, p1y, p2x, p2y, 1.8, 0.7, (x, y, d) => {
        setPx(pen, x, y, d < 0.8 ? RAMP_HELLFIRE[5] : RAMP_HELLFIRE[3], fade * 0.88, 0.72);
      });
    };
    drawSweptWing(-1);
    drawSweptWing(1);
    // Razor center lance shaft
    drawThickSeg(pen, tipX + 2, midY, tipX + 22, midY, 1.8, 0.6, (x, y, d) => {
      setPx(pen, x, y, d < 0.85 ? RAMP_HELLFIRE[7] : RAMP_SOLAR_GOLD[5], fade, 0.92);
    });
    drawStar4(pen, tipX, midY, 4, RAMP_HELLFIRE[5], RAMP_HELLFIRE[7], 0.95);
  }
}

// =========================================================================
// ROW 6: HELLFIRE_TORRENT_JET (30fps Horizontal Roaring Hellfire Breath Beam)
// Mouth origin at right (`x = 120`), jet roaring LEFT (`x = 8`)!
// =========================================================================
function renderRow6HellfireTorrent(pen, frame) {
  const phase = (frame / COLS) * Math.PI * 2;
  const cy = 64;
  pen.shadeBox(SAFE_LPX, SAFE_LPX, LOGICAL_SZ - 1 - SAFE_LPX, LOGICAL_SZ - 1 - SAFE_LPX, (x, y, out) => {
    const u = clamp01((120 - x) / 112); // 0 at mouth (right), 1 at far left blast
    if (x > 121 || x < 7) return null;
    const spread = 11 + u * 27 + Math.sin(u * 9 - phase * 2) * 3.5;
    const dy = Math.abs(y - cy + Math.sin(u * 12 - phase * 2.5) * 3.2 * u);
    const n = fbmNoise2D(x * 0.085 + frame * 0.48, y * 0.095, 3);
    const edge = (dy / spread) + (n - 0.5) * 0.42;
    const leftTaper = u > 0.84 ? (u - 0.84) / 0.16 : 0;
    const heat = 1.0 - edge - leftTaper * 0.95;
    if (heat <= 0.08) return null;

    let idx;
    if (heat >= 0.78) idx = 7;
    else if (heat >= 0.60) idx = 6;
    else if (heat >= 0.44) idx = 5;
    else if (heat >= 0.30) idx = 4;
    else if (heat >= 0.18) idx = 3;
    else idx = 1;

    out.color = RAMP_HELLFIRE[idx];
    out.alpha = heat > 0.22 ? 1.0 : 0.78;
    out.glowStrength = clamp01(heat * 0.95);
    return out.color;
  });

  // High-speed plasma streaks & sparks blasting leftward inside torrent
  for (let i = 0; i < 6; i++) {
    const u = ((i / 6) + frame / COLS) % 1;
    const sx = 116 - u * 92;
    const sy = cy + Math.sin(i * 2.4 + phase) * (8 + u * 16);
    drawThickSeg(pen, sx, sy, Math.max(8, sx - 16), sy, 1.3, 0.5, (x, y) => {
      setPx(pen, x, y, RAMP_HELLFIRE[7], 0.95, 0.92);
    });
  }
}

// =========================================================================
// ROW 7: TRIPLE_TALON_SLASH_WAVE (30fps Razor-Sharp 3-Talon Molten Crescent)
// Sweeping violently LEFT (`-X`)!
// =========================================================================
function renderRow7TripleTalonSlash(pen, frame) {
  const phase = (frame / COLS) * Math.PI * 2;
  const cx = 86;
  const cy = 64;

  // 3 concentric razor-sharp claw crescent arcs curving around the leading left edge
  const radii = [56, 46, 36];
  for (let tIdx = 0; tIdx < 3; tIdx++) {
    const baseR = radii[tIdx] + Math.sin(phase + tIdx * 1.1) * 2.2;
    const yOff = (tIdx - 1) * 7;
    const segs = 28;
    for (let s = 0; s < segs; s++) {
      const u0 = s / segs;
      const u1 = (s + 1) / segs;
      const a0 = Math.PI * 0.56 + u0 * Math.PI * 0.88;
      const a1 = Math.PI * 0.56 + u1 * Math.PI * 0.88;
      const x0 = cx + Math.cos(a0) * baseR * 1.24;
      const y0 = cy + yOff + Math.sin(a0) * baseR * 0.92;
      const x1 = cx + Math.cos(a1) * baseR * 1.24;
      const y1 = cy + yOff + Math.sin(a1) * baseR * 0.92;
      const taper = Math.sin(u0 * Math.PI);
      const thick = (tIdx === 1 ? 3.8 : 2.9) * Math.pow(taper, 0.65);
      if (thick < 0.55) continue;
      drawThickSeg(pen, x0, y0, x1, y1, thick, thick, (x, y, d, rad) => {
        const ramp = tIdx === 2 ? RAMP_VISE_VIOLET : RAMP_HELLFIRE;
        const col =
          d < rad * 0.38
            ? ramp[7]
            : d < rad * 0.68
              ? ramp[5]
              : ramp[3];
        setPx(pen, x, y, col, clamp01(taper * 1.2), 0.9);
      });
    }
  }

  // Trailing cinder sparks ripped off the talon arcs
  const rng = new DeterministicRng(7700 + frame * 23);
  for (let i = 0; i < 14; i++) {
    const a = Math.PI * 0.62 + rng.nextFloat() * Math.PI * 0.76;
    const r = 34 + rng.nextFloat() * 34;
    const sx = cx + Math.cos(a) * r * 1.18 + 10;
    const sy = cy + Math.sin(a) * r * 0.88;
    if (sx >= SAFE_LPX + 2 && sx < LOGICAL_SZ - SAFE_LPX - 2 && sy >= SAFE_LPX + 2 && sy < LOGICAL_SZ - SAFE_LPX - 2) {
      drawStar4(pen, sx, sy, i % 3 === 0 ? 3 : 2, RAMP_HELLFIRE[5], RAMP_HELLFIRE[7], 0.88);
    }
  }
}

// =========================================================================
// ROW 8: MAGMA_ERUPTION_PLUME (30fps Towering Caldera Magma Eruption Pillar)
// Anchored at base `y = 116`, soaring upward to `y = 10`!
// =========================================================================
function renderRow8MagmaPlume(pen, frame) {
  const phase = (frame / COLS) * Math.PI * 2;
  const cx = 64;
  pen.shadeBox(SAFE_LPX, SAFE_LPX, LOGICAL_SZ - 1 - SAFE_LPX, LOGICAL_SZ - 1 - SAFE_LPX, (x, y, out) => {
    const u = clamp01((118 - y) / 106); // 0 at ground base, 1 at top plume tip
    if (y > 119 || y < 9) return null;
    const baseFlare = u < 0.25 ? (1 - u / 0.25) * 18 : 0;
    const crownFlare = u > 0.72 ? Math.sin(((u - 0.72) / 0.28) * Math.PI) * 10 : 0;
    const halfW = 14 + baseFlare + crownFlare - u * 4 + Math.sin(u * 10 - phase * 2) * 3.0;
    const sway = Math.sin(u * 7 - phase * 2) * 3.5 * u;
    const dx = Math.abs(x - (cx + sway));
    const n = fbmNoise2D(x * 0.095, y * 0.085 + frame * 0.55, 3);
    const edge = (dx / Math.max(4, halfW)) + (n - 0.5) * 0.46;
    const topFade = u > 0.86 ? (u - 0.86) / 0.14 : 0;
    const heat = 1.0 - edge - topFade * 0.92;
    if (heat <= 0.08) return null;

    let idx;
    if (heat >= 0.78) idx = 7;
    else if (heat >= 0.60) idx = 6;
    else if (heat >= 0.44) idx = 5;
    else if (heat >= 0.28) idx = 4;
    else if (heat >= 0.16) idx = 2;
    else idx = 1;
    out.color = RAMP_HELLFIRE[idx];
    out.alpha = heat > 0.2 ? 1.0 : 0.8;
    out.glowStrength = clamp01(heat * 0.92);
    return out.color;
  });

  // Ballistic lava droplets & obsidian sparks erupting outward from base
  for (let i = 0; i < 10; i++) {
    const u = ((i / 10) + frame / COLS) % 1;
    const side = i % 2 === 0 ? -1 : 1;
    const px = cx + side * (14 + u * 34 + (i % 3) * 5);
    const py = 114 - Math.sin(u * Math.PI) * (55 + (i % 4) * 14);
    if (px >= SAFE_LPX + 2 && px < LOGICAL_SZ - SAFE_LPX - 2 && py >= SAFE_LPX + 2 && py < LOGICAL_SZ - SAFE_LPX - 2) {
      drawStar4(pen, px, py, i % 3 === 0 ? 3 : 2, RAMP_HELLFIRE[4], RAMP_HELLFIRE[7], 0.9);
    }
  }
}

// =========================================================================
// ROW 9: PHASE2_BURNING_ECLIPSE (Phase II/III Burning Abyssal-Solar Eclipse Halo)
// =========================================================================
function renderRow9BurningEclipse(pen, frame) {
  const phase = (frame / COLS) * Math.PI * 2;
  const cx = 64;
  const cy = 64;
  const ringR = 39;

  pen.shadeBox(SAFE_LPX, SAFE_LPX, LOGICAL_SZ - 1 - SAFE_LPX, LOGICAL_SZ - 1 - SAFE_LPX, (x, y, out) => {
    const dx = x - cx;
    const dy = y - cy;
    const r = Math.hypot(dx, dy);
    const ang = Math.atan2(dy, dx);
    if (r > 58 || r < 27) return null;

    const flare =
      Math.pow(Math.max(0, Math.sin(ang * 6 + phase)), 2) * 8.5 +
      Math.pow(Math.max(0, Math.cos(ang * 10 - phase * 1.5)), 2) * 4.5;
    const n = fbmNoise2D(Math.cos(ang) * 2.2 + phase * 0.4, Math.sin(ang) * 2.2, 3);
    const outerLimit = ringR + 4 + flare + (n - 0.5) * 6;
    const innerLimit = ringR - 4.5;

    if (r >= innerLimit && r <= outerLimit) {
      const distRing = Math.abs(r - ringR);
      if (distRing <= 2.2) {
        out.color = distRing <= 1.0 ? RAMP_SOLAR_GOLD[7] : RAMP_HELLFIRE[6];
        out.alpha = 1.0;
        out.glowStrength = 0.95;
        return out.color;
      }
      if (r > ringR) {
        const t = clamp01(1 - (r - ringR) / Math.max(2, outerLimit - ringR));
        const idx = t > 0.65 ? 5 : t > 0.38 ? 4 : t > 0.18 ? 3 : 2;
        out.color = RAMP_HELLFIRE[idx];
        out.alpha = clamp01(t * 1.25);
        out.glowStrength = t * 0.85;
        return out.color;
      }
      // Subtle abyssal violet inner eclipse shadow lip
      out.color = RAMP_VISE_VIOLET[3];
      out.alpha = 0.72;
      out.glowStrength = 0.45;
      return out.color;
    }
    return null;
  });

  // 8 crisp diamond-ring solar corona glints orbiting the eclipse rim
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + phase * 0.5;
    const gx = cx + Math.cos(a) * ringR;
    const gy = cy + Math.sin(a) * ringR;
    if (i % 2 === 0) {
      drawStar4(pen, gx, gy, 5, RAMP_SOLAR_GOLD[5], RAMP_SOLAR_GOLD[7], 0.96);
    } else {
      drawStar4(pen, gx, gy, 3, RAMP_VISE_VIOLET[5], RAMP_VISE_VIOLET[7], 0.88);
    }
  }
}

// =========================================================================
// ROW 10: PHASE3_ABYSSAL_LIGHTNING (Phase III Razor Forked Abyssal Arcs)
// =========================================================================
function renderRow10AbyssalLightning(pen, frame) {
  const rng = new DeterministicRng(10400 + frame * 89);
  // 2 dramatic criss-crossing forked abyssal violet-crimson-white lightning bolts per frame
  const startA = { x: 16 + rng.nextFloat() * 24, y: 14 + rng.nextFloat() * 20 };
  const endA = { x: 88 + rng.nextFloat() * 24, y: 92 + rng.nextFloat() * 20 };
  drawForkedBolt(pen, startA.x, startA.y, endA.x, endA.y, 13.5, 10800 + frame * 41, RAMP_VISE_VIOLET, 1.1, 0.95, 3);

  const startB = { x: 96 + rng.nextFloat() * 18, y: 16 + rng.nextFloat() * 22 };
  const endB = { x: 14 + rng.nextFloat() * 22, y: 88 + rng.nextFloat() * 22 };
  drawForkedBolt(pen, startB.x, startB.y, endB.x, endB.y, 11.5, 11200 + frame * 53, RAMP_CRIMSON_LIGHTNING, 0.95, 0.9, 2);

  // Hot intersection discharge spark
  drawStar4(pen, 64 + (rng.nextFloat() - 0.5) * 18, 64 + (rng.nextFloat() - 0.5) * 18, 6, RAMP_VISE_VIOLET[5], RAMP_VISE_VIOLET[7], 1.0);
}

// =========================================================================
// ROW 11: HEART_CORE_SHATTER_VORTEX (Exposed Vulnerable Core Vortex)
// Strictly rendered ONLY when `isVulnerable`!
// =========================================================================
function renderRow11HeartCoreVortex(pen, frame) {
  const phase = (frame / COLS) * Math.PI * 2;
  const pulse = 0.5 + 0.5 * Math.sin(phase * 2);
  const cx = 64;
  const cy = 64;

  // Swirling cyan-gold shattered core vortex arms + fractured crystal core
  pen.shadeBox(SAFE_LPX, SAFE_LPX, LOGICAL_SZ - 1 - SAFE_LPX, LOGICAL_SZ - 1 - SAFE_LPX, (x, y, out) => {
    const dx = x - cx;
    const dy = y - cy;
    const r = Math.hypot(dx, dy);
    const ang = Math.atan2(dy, dx);
    if (r > 54) return null;

    // 4-faceted incandescent vulnerable core diamond
    const diamondR = Math.abs(dx) + Math.abs(dy);
    if (diamondR <= 19 + pulse * 4) {
      const heat = 1 - diamondR / (21 + pulse * 4);
      out.color = heat > 0.6 ? RAMP_CORE_SHATTER[6] : heat > 0.32 ? RAMP_CORE_SHATTER[5] : RAMP_CORE_SHATTER[3];
      out.alpha = 1.0;
      out.glowStrength = 0.98;
      return out.color;
    }

    // 4 spiraling energy fracture arms pulling inward
    const spiral = Math.sin(ang * 4 + r * 0.16 - phase * 2);
    const band = clamp01(1 - r / 54);
    if (spiral > 0.55 && r >= 16) {
      const coreHit = spiral > 0.84;
      out.color = coreHit ? RAMP_CORE_SHATTER[5] : RAMP_CORE_SHATTER[3];
      out.alpha = clamp01(band * 1.2);
      out.glowStrength = band * 0.9;
      return out.color;
    }

    // Outer target shatter ring
    if (Math.abs(r - (42 - pulse * 3)) <= 1.8) {
      if (Math.sin(ang * 8 - phase) > -0.2) {
        out.color = RAMP_CORE_SHATTER[4];
        out.alpha = 0.92;
        out.glowStrength = 0.84;
        return out.color;
      }
    }
    return null;
  });

  // 4 cardinal shatter lightning spikes radiating out of exposed heart core
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + phase * 0.5;
    const x0 = cx + Math.cos(a) * 14;
    const y0 = cy + Math.sin(a) * 14;
    const x1 = cx + Math.cos(a) * 48;
    const y1 = cy + Math.sin(a) * 48;
    drawForkedBolt(pen, x0, y0, x1, y1, 4.5, 12100 + frame * 29 + i * 11, RAMP_CORE_SHATTER, 0.85, 0.92, 1);
  }
  drawStar4(pen, cx, cy, 8 + Math.round(pulse * 3), RAMP_CORE_SHATTER[4], RAMP_CORE_SHATTER[6], 1.0);
}

const ROW_RENDERERS = [
  renderRow0RightWing,
  renderRow1LeftWingEmbers,
  renderRow2GrabClampTalons,
  renderRow3GrabRuneVise,
  renderRow4RunicGroundSigil,
  renderRow5LaneFissureSurge,
  renderRow6HellfireTorrent,
  renderRow7TripleTalonSlash,
  renderRow8MagmaPlume,
  renderRow9BurningEclipse,
  renderRow10AbyssalLightning,
  renderRow11HeartCoreVortex
];

function main() {
  const sheetRgba = Buffer.alloc(SHEET_W * SHEET_H * 4);
  const surface = createPixelSurface(LOGICAL_SZ, LOGICAL_SZ);
  const pen = new ShaderPen(surface);
  const cellRgba = new Uint8ClampedArray(LOGICAL_SZ * LOGICAL_SZ * 4);

  let borderClips = 0;
  let emptyCells = 0;

  for (let row = 0; row < ROWS; row++) {
    const renderFn = ROW_RENDERERS[row];
    for (let col = 0; col < COLS; col++) {
      clearPixelSurface(surface);
      renderFn(pen, col);
      resolveSurfaceToRGBA(surface, cellRgba, 1.05);

      // Enforce hard >= SAFE_LPX transparent safety border and audit cell contents
      let activePx = 0;
      let cellClip = false;
      for (let ly = 0; ly < LOGICAL_SZ; ly++) {
        for (let lx = 0; lx < LOGICAL_SZ; lx++) {
          const idx = (ly * LOGICAL_SZ + lx) * 4;
          if (lx < SAFE_LPX || lx >= LOGICAL_SZ - SAFE_LPX || ly < SAFE_LPX || ly >= LOGICAL_SZ - SAFE_LPX) {
            if (cellRgba[idx + 3] > 28 && (lx < 2 || lx >= LOGICAL_SZ - 2 || ly < 2 || ly >= LOGICAL_SZ - 2)) {
              cellClip = true;
            }
            cellRgba[idx] = 0;
            cellRgba[idx + 1] = 0;
            cellRgba[idx + 2] = 0;
            cellRgba[idx + 3] = 0;
            continue;
          }
          const a = cellRgba[idx + 3];
          if (a < 28) {
            cellRgba[idx] = 0;
            cellRgba[idx + 1] = 0;
            cellRgba[idx + 2] = 0;
            cellRgba[idx + 3] = 0;
          } else {
            activePx++;
          }
        }
      }
      if (cellClip) {
        borderClips++;
        console.warn(`[WARN] Clipped edge detected at cell (${col}, ${row})`);
      }
      if (activePx === 0) {
        emptyCells++;
        console.warn(`[WARN] Empty cell (${col}, ${row})`);
      }

      // 2x nearest-neighbor upscale (`128x128` -> `256x256`) into atlas
      const dstCellX = col * CELL_SZ;
      const dstCellY = row * CELL_SZ;
      for (let ly = 0; ly < LOGICAL_SZ; ly++) {
        for (let lx = 0; lx < LOGICAL_SZ; lx++) {
          const sIdx = (ly * LOGICAL_SZ + lx) * 4;
          const r = cellRgba[sIdx];
          const g = cellRgba[sIdx + 1];
          const b = cellRgba[sIdx + 2];
          const a = cellRgba[sIdx + 3];
          if (a === 0) continue;
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

  if (emptyCells > 0) {
    throw new Error(`Aborted: ${emptyCells} empty VFX cells found!`);
  }
  if (borderClips > 0) {
    throw new Error(`Aborted: ${borderClips} border clips found!`);
  }

  const pngBuf = encodePngRgba(SHEET_W, SHEET_H, sheetRgba);
  fs.writeFileSync(OUT_PNG, pngBuf);
  console.log(
    `[OK] Built ${OUT_PNG}: ${SHEET_W}x${SHEET_H} (${COLS}x${ROWS} @ ${CELL_SZ}x${CELL_SZ}), ${(pngBuf.length / 1024).toFixed(1)} KB, clips=${borderClips}, empty=${emptyCells}`
  );
}

main();
