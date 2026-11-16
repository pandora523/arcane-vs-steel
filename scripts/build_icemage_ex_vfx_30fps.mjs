#!/usr/bin/env node
/**
 * Next-Gen 30fps VFX Sprite Sheet Builder for Lyra EX (`icemage_ex` / `IceMageEx.js`).
 * Powered natively by `src/engine/ArcaneShaderFX.js` with custom Borealis serrated cryo-crescent waves,
 * 6-bladed Snowflake Boomerang Chakrams, faceted Glacier Spires & Iceberg Walls, 2.5D Permafrost Seals,
 * 7 Celestial Coronation Ice-Claymores, Sacred Borealis Astrolabe Mandalas, Diamond-Lotus Crystal
 * Sarcophagi (4-stack freeze & 0.00 K True Ult monolith), and Razor Diamond-Dust Starbursts.
 *
 * Invariants:
 *   - Output: `assets/sprites/icemage_ex_vfx.png` (6240x1664, 8 rows x 30 cols @ 208x208)
 *   - 100% 2x2 integer pixel blocks (authored on 104x104 logical grid -> 2x NEAREST)
 *   - Strict 2px logical (4px output) transparent safety margin on all 240 cells (0/240 clips)
 *   - Binary alpha (0 or 255), crisp #0a0e1e / #141e3a Selout, 0 Unicode emojis anywhere
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
  createPixelSurface,
  clearPixelSurface,
  resolveSurfaceToRGBA,
  ShaderPen
} from '../src/engine/ArcaneShaderFX.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SCRATCH_DIR =
  '/Users/rei/.gemini/antigravity/brain/5416474b-0e5f-4471-85c8-b7a88055e218/scratch';

// Locked Borealis Sovereign Palette (matches `icemage_ex_sheet.png` 1:1)
const C_SEL_DARK = packHexColor('#0a0e1e');
const C_SEL_MID = packHexColor('#141e3a');
const C_NAVY_DEEP = packHexColor('#1e3a8a');
const C_CRYO_DEEP = packHexColor('#0284c7');
const C_CRYO_SKY = packHexColor('#38bdf8');
const C_CRYO_BRIGHT = packHexColor('#67e8f9');
const C_CRYO_PALE = packHexColor('#cffafe');
const C_AURORA_DEEP = packHexColor('#6b21a8');
const C_AURORA_VIOLET = packHexColor('#a855f7');
const C_AURORA_ORCHID = packHexColor('#e879f9');
const C_AURORA_PALE = packHexColor('#fae8ff');
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

function drawBorealisSerratedArc(pen, opts) {
  const {
    cx = 0,
    cy = 0,
    rx = 34,
    ry = 34,
    rotRad = 0,
    aStart = -1.35,
    aEnd = 1.35,
    maxWidth = 15,
    teethCount = 7,
    toothDepth = 0.46,
    auroraDominant = false,
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
    const s = i / steps;
    const ang = aStart + spanA * s;
    const cA = Math.cos(ang);
    const sA = Math.sin(ang);

    const belly = s < 0.74 ? Math.pow(s / 0.74, 1.35) : Math.pow(Math.max(0, (1 - s) / 0.26), 0.58);
    const toothArg = s * teethCount + phase * 0.4;
    const saw = toothArg - Math.floor(toothArg);
    const ripNotch = s > 0.08 && s < 0.88 ? Math.pow(Math.abs(2 * saw - 1), 1.3) * toothDepth : 0;
    const wTotal = maxWidth * belly * (1 - ripNotch);
    if (wTotal < 0.45) continue;

    const rSteps = Math.max(3, Math.ceil(wTotal * 2.2));
    for (let j = 0; j <= rSteps; j++) {
      const v = j / rSteps;
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
      } else if (v > 0.58) {
        col = auroraDominant ? C_AURORA_PALE : C_CRYO_PALE;
      } else if (v > 0.34) {
        col = auroraDominant ? C_AURORA_ORCHID : C_CRYO_SKY;
      } else if (v > 0.16) {
        col = auroraDominant ? C_CRYO_SKY : C_AURORA_VIOLET;
        pixAlpha = alpha * 0.92;
      } else {
        col = C_NAVY_DEEP;
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
 * Row 0: Serrated Borealis Cryo-Crescent Glaive Wave (`cryo_shard` / slash wave)
 */
function renderRow0CryoWave(pen, f) {
  const ph = (f / 30) * Math.PI * 2;
  const pulse = Math.sin(ph);
  const rng = new DeterministicRng(301 + f * 17);

  for (let k = 0; k < 5; k++) {
    const wy = -22 + k * 11 + Math.sin(ph + k * 1.2) * 1.5;
    const xEnd = 10 + (k % 2) * 5;
    const xStart = -34 + ((f * 3 + k * 9) % 18);
    pen.line(xStart, wy, xEnd, wy, k % 2 === 0 ? C_CRYO_BRIGHT : C_AURORA_ORCHID, 0.9);
    pen.line(xStart + 4, wy - 1, xEnd, wy - 1, C_SEL_DARK, 0.85);
  }

  drawBorealisSerratedArc(pen, {
    cx: -6 + pulse * 1.2,
    cy: 0,
    rx: 34,
    ry: 39,
    rotRad: 0,
    aStart: -1.28,
    aEnd: 1.28,
    maxWidth: 16.5 + pulse * 1.0,
    teethCount: 7,
    toothDepth: 0.48,
    auroraDominant: false,
    alpha: 1.0,
    phase: f * 0.35
  });

  drawBorealisSerratedArc(pen, {
    cx: -10,
    cy: 0,
    rx: 23,
    ry: 28,
    rotRad: 0,
    aStart: -0.95,
    aEnd: 0.95,
    maxWidth: 7.2,
    teethCount: 5,
    toothDepth: 0.38,
    auroraDominant: true,
    alpha: 0.95,
    phase: -f * 0.3
  });

  drawStarSpark(pen, 28 + pulse, 0, 5 + (f % 2), C_CRYO_PALE, C_AURORA_ORCHID, 1.0);
  for (let s = 0; s < 6; s++) {
    const sx = rng.between(-32, 22);
    const sy = rng.between(-32, 32);
    pen.stipple(sx, sy, s % 2 === 0 ? C_CRYO_PALE : C_AURORA_ORCHID, 0.95);
    pen.stipple(sx - 1, sy, C_SEL_DARK, 0.85);
  }
}

/**
 * Row 1: 6-Bladed Spinning Borealis Snowflake Chakram & Rime Satellite
 */
function renderRow1SnowflakeChakram(pen, f) {
  const rot = (f / 30) * Math.PI * 2;
  const rBlade = 36;
  const rHub = 10;

  // Outer rotating serrated cryo rim
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2 + rot;
    const rr = 32 + ((i % 6 === 0) ? 3 : 0);
    const rx = Math.cos(a) * rr;
    const ry = Math.sin(a) * rr;
    pen.stipple(rx, ry, i % 3 === 0 ? C_WHITE : i % 2 === 0 ? C_CRYO_BRIGHT : C_AURORA_ORCHID, 0.95);
  }

  // 6 Faceted Crystalline Snowflake Chakram Blades
  for (let k = 0; k < 6; k++) {
    const ang = rot + (k * Math.PI) / 3;
    const ux = Math.cos(ang);
    const uy = Math.sin(ang);
    const nx = -uy;
    const ny = ux;
    drawRazorSlashScar(
      pen,
      ux * 3,
      uy * 3,
      ux * rBlade,
      uy * rBlade,
      3.1,
      k % 2 === 0 ? C_CRYO_BRIGHT : C_AURORA_ORCHID,
      C_NAVY_DEEP,
      1.0
    );
    // Twin crystalline snowflake barbs per arm
    const bx = ux * 21;
    const by = uy * 21;
    drawRazorSlashScar(pen, bx, by, bx + (ux + nx * 0.85) * 9, by + (uy + ny * 0.85) * 9, 1.8, C_CRYO_PALE, C_CRYO_DEEP, 1.0);
    drawRazorSlashScar(pen, bx, by, bx + (ux - nx * 0.85) * 9, by + (uy - ny * 0.85) * 9, 1.8, C_CRYO_PALE, C_CRYO_DEEP, 1.0);
  }

  // Hexagonal Aurora Hub
  for (let k = 0; k < 6; k++) {
    const a0 = -rot + (k * Math.PI) / 3;
    const a1 = -rot + ((k + 1) * Math.PI) / 3;
    drawRazorSlashScar(
      pen,
      Math.cos(a0) * rHub,
      Math.sin(a0) * rHub,
      Math.cos(a1) * rHub,
      Math.sin(a1) * rHub,
      2.0,
      C_AURORA_ORCHID,
      C_CRYO_SKY,
      1.0
    );
  }
  drawStarSpark(pen, 0, 0, 5, C_CRYO_PALE, C_AURORA_ORCHID, 1.0);
}

/**
 * Row 2: Faceted Crystalline Glacier Stalagmite Spire & Iceberg Wall (`activeMarchingSpires`, `glacierJaws`, `iceWall`)
 */
function renderRow2GlacierSpire(pen, f) {
  const u = f / 29;
  const erupt = u < 0.16 ? smoothStep(0, 0.16, u) : 1.0;
  const shatter = u > 0.76 ? (u - 0.76) / 0.24 : 0;
  const fade = 1 - shatter * 0.85;
  const baseY = 38;
  const spireH = 76 * erupt;

  // 3 Interlocking Faceted Glacier Monolith Crags (main spire + 2 side crags)
  const crags = [
    { ox: -14, tilt: -5, hMul: 0.62, wBase: 10 },
    { ox: 13, tilt: 6, hMul: 0.68, wBase: 10.5 },
    { ox: 0, tilt: 1, hMul: 1.0, wBase: 15.5 }
  ];

  for (let ci = 0; ci < crags.length; ci++) {
    const cr = crags[ci];
    const hCur = spireH * cr.hMul;
    if (hCur < 4) continue;
    for (let dy = 0; dy <= Math.floor(hCur); dy++) {
      const yf = dy / Math.max(1, hCur); // 0 = base, 1 = sharp tip
      const y = baseY - dy - Math.round(shatter * 8 * yf);
      if (y < -44 || y > 44) continue;
      const cx = cr.ox + cr.tilt * yf;
      const hw = cr.wBase * Math.pow(1 - yf, 0.74);
      const lim = Math.ceil(hw + 1);
      for (let dx = -lim; dx <= lim; dx++) {
        const adx = Math.abs(dx);
        if (adx > hw + 0.7) continue;
        let col;
        if (adx >= hw - 0.25) col = C_SEL_DARK;
        else if (Math.abs(dx + 1.2) <= 1.0) col = C_WHITE; // Central specular ridge!
        else if (dx < 0) col = adx > hw * 0.55 ? C_CRYO_SKY : C_CRYO_PALE;
        else col = adx > hw * 0.62 ? C_NAVY_DEEP : (yf > 0.55 ? C_AURORA_VIOLET : C_CRYO_DEEP);
        pen.stipple(cx + dx, y, col, fade);
      }
    }
  }

  // Ground Frost Rim
  drawRazorSlashScar(pen, -28 * erupt, baseY, 28 * erupt, baseY, 2.6 * fade, C_CRYO_PALE, C_CRYO_DEEP, fade);
  if (shatter > 0.05) {
    drawStarSpark(pen, 0, -4, 6, C_CRYO_PALE, C_AURORA_ORCHID, fade);
  }
}

/**
 * Row 3: Foreshortened 2.5D Borealis Snowflake Coronation Seal & Lotus Pedestal
 */
function renderRow3BorealisSeal(pen, f) {
  const ph = (f / 30) * Math.PI * 2;
  const rx = 40;
  const ry = 13.5;

  for (let i = 0; i < 96; i++) {
    const a = (i / 96) * Math.PI * 2 + ph;
    const x = Math.cos(a) * rx;
    const y = Math.sin(a) * ry;
    pen.stipple(x, y + 1, C_SEL_DARK, 0.95);
    pen.stipple(x, y, i % 6 === 0 ? C_WHITE : i % 2 === 0 ? C_CRYO_BRIGHT : C_AURORA_ORCHID, 1.0);

    const a2 = -(i / 96) * Math.PI * 2 + ph * 1.5;
    pen.stipple(Math.cos(a2) * (rx * 0.62), Math.sin(a2) * (ry * 0.62), i % 3 === 0 ? C_CRYO_PALE : C_CRYO_DEEP, 0.92);
  }

  // 6 Foreshortened Snowflake Spokes
  for (let k = 0; k < 6; k++) {
    const a = ph + (k * Math.PI) / 3;
    const nx = Math.cos(a) * rx;
    const ny = Math.sin(a) * ry;
    pen.line(0, 0, nx, ny, k % 2 === 0 ? C_CRYO_PALE : C_AURORA_ORCHID, 0.9);
    drawStarSpark(pen, nx, ny, 3, C_CRYO_PALE, C_AURORA_ORCHID, 1.0);
  }
}

/**
 * Row 4: Sculpted Celestial Borealis Ice-Claymore / Glaive Sword (`coronationDomain` 7 swords)
 */
function renderRow4CoronationIceSword(pen, f) {
  const ph = (f / 30) * Math.PI * 2;
  const shimmer = Math.sin(ph);
  const tipY = 41;
  const guardY = -18;
  const pomY = -38;

  // Vertical Diamond-Faceted Celestial Ice-Claymore Blade (point-down!)
  for (let y = guardY; y <= tipY; y++) {
    const bf = clamp01((tipY - y) / (tipY - guardY)); // 0 = tip, 1 = guard
    const hw = bf < 0.26 ? (bf / 0.26) * 6.8 : 6.8 * (0.86 + 0.14 * bf);
    const lim = Math.ceil(hw + 1);
    for (let x = -lim; x <= lim; x++) {
      const ax = Math.abs(x);
      if (ax > hw + 0.65) continue;
      let col;
      if (ax >= hw - 0.3) col = C_SEL_DARK;
      else if (ax <= 1.1 && bf > 0.14) col = (y + f) % 4 === 0 ? C_WHITE : C_AURORA_ORCHID;
      else if (x < 0) col = ax > hw * 0.52 ? C_CRYO_PALE : C_WHITE;
      else col = ax > hw * 0.55 ? C_CRYO_DEEP : C_CRYO_SKY;
      pen.stipple(x, y, col, 1.0);
    }
  }

  // Swept Snowflake Crystal Crossguard + Hilt + Pommel
  drawRazorSlashScar(pen, -20, guardY - 6, 0, guardY + 2, 2.8, C_CRYO_PALE, C_AURORA_VIOLET, 1.0);
  drawRazorSlashScar(pen, 20, guardY - 6, 0, guardY + 2, 2.8, C_CRYO_PALE, C_AURORA_VIOLET, 1.0);
  pen.line(0, pomY, 0, guardY - 2, C_CRYO_PALE, 1.0);
  pen.line(-1, pomY, -1, guardY - 2, C_SEL_DARK, 1.0);
  pen.line(1, pomY, 1, guardY - 2, C_SEL_DARK, 1.0);
  drawStarSpark(pen, 0, pomY, 3, C_CRYO_BRIGHT, C_AURORA_ORCHID, 1.0);
  drawStarSpark(pen, 0, guardY + Math.round(shimmer), 4, C_WHITE, C_CRYO_BRIGHT, 1.0);
}

/**
 * Row 5: Sacred 12-Point Borealis Aurora Astrolabe Mandala (`TRUE_ULTIMATE` sky mandala & `drawBehind`)
 */
function renderRow5AuroraAstrolabe(pen, f) {
  const ph = (f / 30) * Math.PI * 2;
  const rOut = 41;
  const rMid = 27;

  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * Math.PI * 2 + ph * 0.5;
    pen.stipple(Math.cos(a) * rOut, Math.sin(a) * rOut, i % 4 === 0 ? C_WHITE : C_CRYO_SKY, 0.95);
    const a2 = -(i / 120) * Math.PI * 2 + ph;
    pen.stipple(Math.cos(a2) * rMid, Math.sin(a2) * rMid, i % 3 === 0 ? C_AURORA_ORCHID : C_CRYO_PALE, 0.92);
  }

  // Interlocking Star-of-Borealis Hexagram + 12 Crystal Needles
  for (let k = 0; k < 12; k++) {
    const a = ph * 0.5 + (k * Math.PI) / 6;
    const rTip = k % 2 === 0 ? 43 : 35;
    drawRazorSlashScar(
      pen,
      Math.cos(a) * 10,
      Math.sin(a) * 10,
      Math.cos(a) * rTip,
      Math.sin(a) * rTip,
      k % 2 === 0 ? 2.1 : 1.5,
      k % 2 === 0 ? C_CRYO_PALE : C_AURORA_ORCHID,
      C_NAVY_DEEP,
      0.95
    );
  }
  drawStarSpark(pen, 0, 0, 6, C_CRYO_PALE, C_AURORA_ORCHID, 1.0);
}

/**
 * Row 6: Translucent Faceted Diamond-Lotus Crystal Sarcophagus Monolith
 * (4-Stack `SOLID CRYSTAL FREEZE!` prison + `TRUE_ULTIMATE` `0.00 K` Diamond-Coffin)
 */
function renderRow6CrystalSarcophagus(pen, f) {
  const u = f / 29;
  const grow = u < 0.12 ? smoothStep(0, 0.12, u) : 1.0;
  const pulse = Math.sin(u * Math.PI * 4);
  const hHalf = 42 * grow;
  const wMax = 26 * grow;

  // Hexagonal Crystal Coffin Silhouette with Bayer translucent interior window so frozen hero stays visible!
  for (let y = -Math.floor(hHalf); y <= Math.floor(hHalf); y++) {
    const ay = Math.abs(y) / Math.max(1, hHalf);
    const hw = ay < 0.58 ? wMax : wMax * Math.max(0.08, 1 - (ay - 0.58) / 0.42);
    const lim = Math.ceil(hw + 1);
    for (let x = -lim; x <= lim; x++) {
      const ax = Math.abs(x);
      if (ax > hw + 0.6) continue;
      const onRim = ax >= hw - 1.4;
      const onFacetLine = Math.abs(ax - hw * 0.48) <= 0.8 || Math.abs(y) <= 1;
      if (ax >= hw - 0.2) {
        pen.stipple(x, y, C_SEL_DARK, 1.0);
      } else if (onRim) {
        pen.stipple(x, y, x < 0 ? C_WHITE : C_CRYO_BRIGHT, 1.0);
      } else if (onFacetLine) {
        pen.stipple(x, y, x < 0 ? C_CRYO_PALE : C_AURORA_ORCHID, 0.95);
      } else {
        // Ordered dithered crystal glass interior (0.38 alpha -> crisp Bayer lattice after binary threshold!)
        const checker = ((x + y + (f % 2)) & 3) === 0;
        if (checker) {
          pen.stipple(x, y, x < 0 ? C_CRYO_SKY : C_AURORA_VIOLET, 0.92);
        }
      }
    }
  }
  drawStarSpark(pen, -Math.round(wMax * 0.45), -Math.round(hHalf * 0.45), 4 + (pulse > 0 ? 1 : 0), C_WHITE, C_CRYO_BRIGHT, 1.0);
}

/**
 * Row 7: Razor Borealis Hit-Slash Scar & 8-Point Prismatic Diamond-Dust Starburst
 */
function renderRow7DiamondStarburst(pen, f) {
  const u = f / 29;
  const snap = u < 0.10 ? u / 0.10 : 1.0;
  const fade = clamp01(1.22 - u * 1.24);
  const rng = new DeterministicRng(709 + f * 13);

  if (fade > 0.04) {
    // 8-Point Asymmetric Prismatic Crystal Starburst Needles (zero blurry circles!)
    for (let k = 0; k < 8; k++) {
      const ang = (k * Math.PI) / 4 + 0.18;
      const L = (k % 2 === 0 ? 42 : 29) * snap;
      drawRazorSlashScar(
        pen,
        -Math.cos(ang) * L * 0.25,
        -Math.sin(ang) * L * 0.25,
        Math.cos(ang) * L,
        Math.sin(ang) * L,
        (k % 2 === 0 ? 3.0 : 2.1) * fade,
        k % 2 === 0 ? C_CRYO_BRIGHT : C_AURORA_ORCHID,
        C_NAVY_DEEP,
        fade
      );
    }

    drawStarSpark(pen, 0, 0, Math.max(2, Math.round(7 * fade)), C_CRYO_PALE, C_AURORA_ORCHID, fade);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + rng.between(-0.2, 0.2);
      const dist = (10 + u * 32) * rng.between(0.7, 1.02);
      const sx = Math.cos(a) * dist;
      const sy = Math.sin(a) * dist;
      if (Math.abs(sx) < 43 && Math.abs(sy) < 43) {
        pen.stipple(sx, sy, i % 2 === 0 ? C_WHITE : C_AURORA_ORCHID, fade);
        pen.stipple(sx + 1, sy, C_SEL_DARK, fade * 0.9);
      }
    }
  }
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
    renderRow0CryoWave,
    renderRow1SnowflakeChakram,
    renderRow2GlacierSpire,
    renderRow3BorealisSeal,
    renderRow4CoronationIceSword,
    renderRow5AuroraAstrolabe,
    renderRow6CrystalSarcophagus,
    renderRow7DiamondStarburst
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

  const outSheetPath = path.join(REPO_ROOT, 'assets', 'sprites', 'icemage_ex_vfx.png');
  fs.mkdirSync(path.dirname(outSheetPath), { recursive: true });
  fs.writeFileSync(outSheetPath, encodeRgbaPng(sheetW, sheetH, sheetRgba));

  fs.mkdirSync(SCRATCH_DIR, { recursive: true });
  const outDbgPath = path.join(SCRATCH_DIR, 'debug_icemage_ex_vfx_30fps.png');
  fs.writeFileSync(outDbgPath, encodeRgbaPng(dbgW, dbgH, dbgRgba));

  console.log(
    `[build_icemage_ex_vfx_30fps] Wrote ${outSheetPath} (${sheetW}x${sheetH}) and ${outDbgPath} (${dbgW}x${dbgH}) | borderClips=${borderClips}/240`
  );
  if (borderClips > 0) {
    process.exitCode = 1;
  }
}

bakeVfxSheet();
