#!/usr/bin/env node
/**
 * Newly-Born Next-Gen 30fps VFX Sprite Sheet Builder for VEX-09 EX (`android_ex` / `AndroidEx.js`).
 * Powered natively by `src/engine/ArcaneShaderFX.js` with Neo-Vision Singularity Valkyrie pixel art:
 *   Row 0: Muramasa-09 HF-Plasma Odachi Crescent & Cyber-Disc Chakram
 *   Row 1: Diamond/Hex Cyber-Matrix Aegis Prism & Deflect Flash
 *   Row 2: Singularity EMP Odachi Cross-Cut Plasma Spire
 *   Row 3: Valkyrie Pixel HUD Target-Matrix Reticle (0 ellipses!)
 *   Row 4: Asymmetric 4-Point Cyber-Prism Hit-Starburst & Hex Sparks (0 chevrons!)
 *   Row 5: Stratified Orbital Relay Gate & Hex-Matrix Floor Lock Seal
 *   Row 6: Articulated Autonomous Cyber Fin-Funnel Wing-Drone Node
 *   Row 7: Seamless Vertical `PROJECT GUNG-09` Orbital Singularity Buster Column
 *
 * Invariants:
 *   - Output: `assets/sprites/android_ex_vfx.png` (6240x1664, 8 rows x 30 cols @ 208x208)
 *   - 100% 2x2 integer pixel blocks (authored on 104x104 logical grid -> 2x NEAREST)
 *   - Strict 3px logical (6px output) transparent safety margin on all 240 cells (0/240 clips)
 *   - Binary alpha (0 or 255), crisp #0a0c1c / #161a34 Selout, 0 Unicode emojis anywhere
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
  '/Users/rei/.gemini/antigravity/brain/3134f27a-cc2a-4935-88e2-e05d540e5f89/scratch';

// Locked Singularity Valkyrie Palette (matches `android_ex_sheet.png` 1:1)
const C_SEL_DARK = packHexColor('#0a0c1c');
const C_GUNMETAL = packHexColor('#384060');
const C_TITANIUM = packHexColor('#d6e0f6');
const C_CYAN_DEEP = packHexColor('#0891b2');
const C_CYAN_NEON = packHexColor('#22d3ee');
const C_CYAN_CREST = packHexColor('#67e8f9');
const C_PLUM_DEEP = packHexColor('#311042');
const C_MAG_HOT = packHexColor('#ec4899');
const C_MAG_PINK = packHexColor('#f9a8d4');
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

function drawHollowHex(pen, cx, cy, r, col, alpha = 1) {
  for (let k = 0; k < 6; k++) {
    const a0 = (k * Math.PI) / 3;
    const a1 = ((k + 1) * Math.PI) / 3;
    pen.line(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r, cx + Math.cos(a1) * r, cy + Math.sin(a1) * r, col, alpha);
  }
}

// Strict 2-pass tapered plasma lance (Pass 1 outer bevels, Pass 2 white core -- 0 chevrons!)
function drawTwoPassPlasmaLance(pen, x0, y0, x1, y1, maxHalfW, bevelCol, accentCol, alpha = 1) {
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
      } else if (aq >= hw * 0.42) {
        pen.stipple(px, py, q > 0 ? bevelCol : accentCol, alpha);
      }
    }
  }
  for (let i = 1; i < steps; i++) {
    const s = i / steps;
    const env = Math.sin(s * Math.PI);
    const hw = maxHalfW * 0.42 * env;
    const bx = x0 + ux * (s * len);
    const by = y0 + uy * (s * len);
    for (let q = -hw; q <= hw; q += 0.45) {
      pen.stipple(bx + nx * q, by + ny * q, C_WHITE, alpha);
    }
  }
}

function drawPlasmaSerratedArc(pen, opts) {
  const {
    cx = 0,
    cy = 0,
    rx = 34,
    ry = 34,
    rotRad = 0,
    aStart = -1.35,
    aEnd = 1.35,
    maxWidth = 15,
    teethCount = 8,
    toothDepth = 0.46,
    magentaDominant = false,
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
    const ripNotch = s > 0.08 && s < 0.88 ? Math.pow(saw, 1.5) * toothDepth : 0;
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
      } else if (v > 0.56) {
        col = magentaDominant ? C_MAG_PINK : C_CYAN_CREST;
      } else if (v > 0.30) {
        col = magentaDominant ? C_MAG_HOT : C_CYAN_NEON;
      } else {
        col = magentaDominant ? C_PLUM_DEEP : C_MAG_HOT;
        pixAlpha = alpha * 0.88;
      }
      pen.stipple(px, py, col, pixAlpha);
    }
  }
}

// Row 0: Muramasa-09 HF-Plasma Odachi Wave & Spinning Cyber-Disc Chakram
function renderRow0PlasmaWave(pen, f) {
  const ph = (f / 30) * Math.PI * 2;
  const pulse = Math.sin(ph);
  const rng = new DeterministicRng(501 + f * 17);

  for (let k = 0; k < 5; k++) {
    const wy = -22 + k * 11;
    const xEnd = 10 + (k % 2) * 5;
    const xStart = -34 + ((f * 4 + k * 9) % 18);
    pen.line(xStart, wy, xEnd, wy, k % 2 === 0 ? C_CYAN_NEON : C_MAG_HOT, 0.9);
    pen.line(xStart + 3, wy - 1, xEnd, wy - 1, C_SEL_DARK, 0.85);
  }

  drawPlasmaSerratedArc(pen, {
    cx: -6 + pulse * 1.2,
    cy: 0,
    rx: 34,
    ry: 39,
    rotRad: 0,
    aStart: -1.28,
    aEnd: 1.28,
    maxWidth: 16.5 + pulse,
    teethCount: 8,
    toothDepth: 0.48,
    magentaDominant: false,
    alpha: 1.0,
    phase: f * 0.35
  });

  drawPlasmaSerratedArc(pen, {
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
    magentaDominant: true,
    alpha: 0.95,
    phase: -f * 0.3
  });

  drawStarSpark(pen, 28 + pulse, 0, 5 + (f % 2), C_CYAN_CREST, C_MAG_HOT, 1.0);
  for (let s = 0; s < 5; s++) {
    const sx = rng.between(-30, 20);
    const sy = rng.between(-28, 28);
    drawHollowHex(pen, sx, sy, 3, s % 2 === 0 ? C_CYAN_CREST : C_MAG_HOT, 0.9);
  }
}

// Row 1: Diamond/Hex Cyber-Matrix Aegis Shield & Deflect Prism
function renderRow1HexAegis(pen, f) {
  const u = f / 29;
  const pop = u < 0.16 ? smoothStep(0, 0.16, u) : 1.0;
  const fade = u > 0.74 ? 1 - (u - 0.74) / 0.26 : 1.0;
  const rHex = 32 * pop;

  for (let k = 0; k < 6; k++) {
    const a0 = (k * Math.PI) / 3 + u * 0.8;
    const a1 = ((k + 1) * Math.PI) / 3 + u * 0.8;
    drawTwoPassPlasmaLance(
      pen,
      Math.cos(a0) * rHex,
      Math.sin(a0) * rHex,
      Math.cos(a1) * rHex,
      Math.sin(a1) * rHex,
      2.5 * fade,
      k % 2 === 0 ? C_CYAN_NEON : C_MAG_HOT,
      C_PLUM_DEEP,
      fade
    );
    drawTwoPassPlasmaLance(
      pen,
      Math.cos(a0) * (rHex * 0.56),
      Math.sin(a0) * (rHex * 0.56),
      Math.cos(a1) * (rHex * 0.56),
      Math.sin(a1) * (rHex * 0.56),
      1.8 * fade,
      C_MAG_HOT,
      C_CYAN_DEEP,
      fade
    );
  }
  drawStarSpark(pen, 0, 0, Math.round(7 * fade), C_CYAN_CREST, C_MAG_HOT, fade);
}

// Row 2: Singularity EMP Odachi Cross-Cut Plasma Spire
function renderRow2SingularityPillar(pen, f) {
  const u = f / 29;
  const erupt = u < 0.16 ? smoothStep(0, 0.16, u) : 1.0;
  const fade = u > 0.70 ? 1 - (u - 0.70) / 0.30 : 1.0;
  const baseY = 36;
  const pillarH = 74 * erupt;
  const halfW = (13.0 - u * 4.5) * erupt;

  if (halfW >= 1.2 && fade > 0.05) {
    const topY = baseY - pillarH;
    for (let y = Math.floor(topY); y <= baseY; y++) {
      const hFrac = clamp01((baseY - y) / Math.max(1, pillarH));
      const scanNotch = (y + f * 2) % 5 === 0 ? 0.80 : 1.0;
      const w = halfW * (1 - hFrac * 0.24) * scanNotch;
      const iw = Math.ceil(w + 1);
      for (let x = -iw; x <= iw; x++) {
        const ax = Math.abs(x);
        if (ax > w + 0.8) continue;
        let col;
        if (ax >= w - 0.2) col = C_SEL_DARK;
        else if (ax >= w * 0.65) col = x < 0 ? C_CYAN_NEON : C_MAG_HOT;
        else if (ax >= w * 0.32) col = C_CYAN_CREST;
        else col = C_WHITE;
        pen.stipple(x, y, col, fade);
      }
    }
  }
  // EMP Odachi Cross-Cut X-beams at spire core
  drawTwoPassPlasmaLance(pen, -28 * erupt, baseY - 12, 28 * erupt, baseY - 38, 2.2 * fade, C_CYAN_NEON, C_MAG_HOT, fade);
  drawTwoPassPlasmaLance(pen, -28 * erupt, baseY - 38, 28 * erupt, baseY - 12, 2.2 * fade, C_MAG_HOT, C_CYAN_NEON, fade);
  drawTwoPassPlasmaLance(pen, -30 * erupt, baseY, 30 * erupt, baseY, 2.6 * fade, C_CYAN_CREST, C_MAG_HOT, fade);
}

// Row 3: Valkyrie Pixel HUD Target-Matrix Reticle (Octagonal/Square Telemetry HUD, 0 ellipses!)
function renderRow3HoloReticle(pen, f) {
  const ph = (f / 30) * Math.PI * 2;
  const rOct = 35;

  // Segmented Octagonal Pixel HUD Ring
  for (let k = 0; k < 8; k++) {
    const a0 = ph * 0.5 + (k * Math.PI) / 4;
    const a1 = ph * 0.5 + ((k + 1) * Math.PI) / 4;
    const mx0 = Math.cos(a0) * rOct;
    const my0 = Math.sin(a0) * rOct;
    const mx1 = Math.cos(a1) * rOct;
    const my1 = Math.sin(a1) * rOct;
    pen.line(mx0, my0, mx0 + (mx1 - mx0) * 0.72, my0 + (my1 - my0) * 0.72, k % 2 === 0 ? C_CYAN_NEON : C_MAG_HOT, 1.0);
  }

  // 4 Crisp Corner Lock Brackets + Rangefinder Telemetry Bars
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const bx = sx * 25;
      const by = sy * 25;
      pen.line(bx, by, bx - sx * 10, by, C_CYAN_CREST, 1.0);
      pen.line(bx, by, bx, by - sy * 10, C_CYAN_CREST, 1.0);
      pen.line(bx - sx * 1, by - sy * 1, bx - sx * 7, by - sy * 1, C_WHITE, 1.0);
    }
    // Side telemetry tick bars
    for (let t = -2; t <= 2; t++) {
      const barW = (Math.abs(t + f) % 3) + 2;
      pen.line(sx * 31, t * 5, sx * (31 - barW), t * 5, t === 0 ? C_WHITE : C_MAG_HOT, 0.95);
    }
  }
  // Central Diamond Crosshair
  drawHollowHex(pen, 0, 0, 9, C_CYAN_NEON, 0.95);
  drawStarSpark(pen, 0, 0, 5 + (f % 2), C_MAG_HOT, C_CYAN_NEON, 1.0);
}

// Row 4: Asymmetric 4-Point Cyber-Prism Hit-Starburst & Hex Sparks (0 fat chevron bars!)
function renderRow4CyberHitScar(pen, f) {
  const u = f / 29;
  const fade = clamp01(1.18 - u * 1.22);
  const snap = u < 0.10 ? u / 0.10 : 1.0;
  const rng = new DeterministicRng(609 + f * 13);

  if (fade > 0.04) {
    // Asymmetric long/short optical prism needles (2-pass -> crisp white core!)
    const L1 = 38 * snap * (1 - u * 0.35);
    const L2 = 25 * snap * (1 - u * 0.35);
    drawTwoPassPlasmaLance(pen, -L1, -L1 * 0.28, L1, L1 * 0.28, 2.4 * fade, C_CYAN_NEON, C_PLUM_DEEP, fade);
    drawTwoPassPlasmaLance(pen, L2 * 0.28, -L2, -L2 * 0.28, L2, 2.1 * fade, C_MAG_HOT, C_CYAN_DEEP, fade);
    drawStarSpark(pen, 0, 0, Math.max(2, Math.round(8 * fade)), C_CYAN_CREST, C_MAG_HOT, fade);

    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3 + u * 0.9 + rng.between(-0.15, 0.15);
      const dist = 10 + u * 28;
      const sx = Math.cos(a) * dist;
      const sy = Math.sin(a) * dist;
      if (Math.abs(sx) < 39 && Math.abs(sy) < 39) {
        drawHollowHex(pen, sx, sy, 3, i % 2 === 0 ? C_CYAN_NEON : C_MAG_HOT, fade);
        pen.stipple(sx, sy, C_WHITE, fade);
      }
    }
  }
}

// Row 5: Stratified Orbital Relay Gate & Hex-Matrix Floor Lock Seal
function renderRow5OrbitalHexSeal(pen, f) {
  const ph = (f / 30) * Math.PI * 2;
  const rx = 41;
  const ry = 14;

  for (let k = 0; k < 6; k++) {
    const a0 = ph + (k * Math.PI) / 3;
    const a1 = ph + ((k + 1) * Math.PI) / 3;
    drawTwoPassPlasmaLance(
      pen,
      Math.cos(a0) * rx,
      Math.sin(a0) * ry,
      Math.cos(a1) * rx,
      Math.sin(a1) * ry,
      2.2,
      k % 2 === 0 ? C_CYAN_NEON : C_MAG_HOT,
      C_PLUM_DEEP,
      1.0
    );
    drawTwoPassPlasmaLance(
      pen,
      Math.cos(-a0) * (rx * 0.62),
      Math.sin(-a0) * (ry * 0.62),
      Math.cos(-a1) * (rx * 0.62),
      Math.sin(-a1) * (ry * 0.62),
      1.6,
      C_MAG_HOT,
      C_CYAN_DEEP,
      0.95
    );
  }
  drawStarSpark(pen, 0, 0, 5, C_MAG_HOT, C_CYAN_NEON, 1.0);
}

// Row 6: Articulated Autonomous Cyber Fin-Funnel Wing-Drone Node
function renderRow6FinFunnelNode(pen, f) {
  const ph = (f / 30) * Math.PI * 2;
  const bob = Math.sin(ph) * 2.0;

  for (const side of [-1, 1]) {
    drawTwoPassPlasmaLance(pen, side * 4, bob - 2, side * 27, bob - 19, 3.4, C_TITANIUM, C_GUNMETAL, 1.0);
    drawTwoPassPlasmaLance(pen, side * 4, bob + 3, side * 23, bob + 17, 2.8, C_CYAN_NEON, C_MAG_HOT, 1.0);
  }
  drawHollowHex(pen, 0, bob, 8, C_CYAN_CREST, 1.0);
  for (let dy = -5; dy <= 5; dy++) {
    for (let dx = -5; dx <= 5; dx++) {
      const d = Math.hypot(dx, dy);
      if (d <= 5.4) {
        const col = d > 4.4 ? C_SEL_DARK : d > 2.8 ? C_MAG_HOT : d > 1.4 ? C_CYAN_CREST : C_WHITE;
        pen.stipple(dx, bob + dy, col, 1.0);
      }
    }
  }
  drawStarSpark(pen, 0, bob, 5 + (f % 2), C_CYAN_CREST, C_MAG_HOT, 1.0);
}

// Row 7: Seamless Vertical `PROJECT GUNG-09` Orbital Singularity Buster Column
function renderRow7OrbitalBusterColumn(pen, f) {
  const ph = (f / 30) * Math.PI * 2;
  const halfW = 24;

  // Vertical Buster Core (`y = -42..+42`) with exact 24-logical-px (48px) 3-ring period across `[-36..+36]`!
  for (let y = -42; y <= 42; y++) {
    const edgeTaper = Math.abs(y) > 36 ? Math.max(0.25, 1 - (Math.abs(y) - 36) / 7) : 1.0;
    const wave = Math.sin(((y + 36) / 24) * Math.PI * 2 - ph * 2);
    const w = (halfW + wave * 2.2) * edgeTaper;
    const lim = Math.ceil(w + 1);
    for (let x = -lim; x <= lim; x++) {
      const ax = Math.abs(x);
      if (ax > w + 0.7) continue;
      let col;
      if (ax >= w - 0.25) col = C_SEL_DARK;
      else if (ax >= w * 0.74) col = (y + f * 2) % 6 < 3 ? C_MAG_HOT : C_PLUM_DEEP;
      else if (ax >= w * 0.48) col = C_CYAN_NEON;
      else if (ax >= w * 0.24) col = C_CYAN_CREST;
      else col = C_WHITE;
      pen.stipple(x, y, col, 1.0);
    }
  }

  // 3 Helical Hex-Plasma Compression Rings spaced every 24 logical px (`-24, 0, +24`) inside `[-36..+36]`!
  for (const ry of [-24, 0, 24]) {
    for (let i = 0; i < 56; i++) {
      const a = (i / 56) * Math.PI * 2 + ph * 2;
      const rx = Math.cos(a) * 33;
      const py = ry + Math.sin(a) * 4.5;
      if (Math.abs(py) <= 42) {
        pen.stipple(rx, py + 1, C_SEL_DARK, 0.95);
        pen.stipple(rx, py, i % 2 === 0 ? C_WHITE : C_MAG_HOT, 1.0);
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

  const sampleCols = [0, 3, 7, 12, 17, 22, 27];
  const qaW = sampleCols.length * CELL;
  const qaH = ROWS * CELL;
  const qaRgba = new Uint8Array(qaW * qaH * 4);
  for (let i = 0; i < qaW * qaH; i++) {
    qaRgba[i * 4] = 8;
    qaRgba[i * 4 + 1] = 12;
    qaRgba[i * 4 + 2] = 26;
    qaRgba[i * 4 + 3] = 255;
  }

  const surface104 = createPixelSurface(LOGICAL, LOGICAL);
  const pen104 = new ShaderPen(surface104);
  const cell104 = new Uint8Array(LOGICAL * LOGICAL * 4);
  const cell208 = new Uint8Array(CELL * CELL * 4);

  const rowFns = [
    renderRow0PlasmaWave,
    renderRow1HexAegis,
    renderRow2SingularityPillar,
    renderRow3HoloReticle,
    renderRow4CyberHitScar,
    renderRow5OrbitalHexSeal,
    renderRow6FinFunnelNode,
    renderRow7OrbitalBusterColumn
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
      const sIdx = sampleCols.indexOf(c);
      if (sIdx >= 0) {
        blitUpscaledNearest(cell104, LOGICAL, LOGICAL, 2, qaRgba, qaW, sIdx * CELL, r * CELL);
      }
    }
  }

  const outSheetPath = path.join(REPO_ROOT, 'assets', 'sprites', 'android_ex_vfx.png');
  fs.mkdirSync(path.dirname(outSheetPath), { recursive: true });
  fs.writeFileSync(outSheetPath, encodeRgbaPng(sheetW, sheetH, sheetRgba));

  fs.mkdirSync(SCRATCH_DIR, { recursive: true });
  const outDbgPath = path.join(SCRATCH_DIR, 'debug_android_ex_vfx_30fps.png');
  fs.writeFileSync(outDbgPath, encodeRgbaPng(qaW, qaH, qaRgba));

  console.log(
    `[build_android_ex_vfx_30fps] Wrote ${outSheetPath} (${sheetW}x${sheetH}) and ${outDbgPath} (${qaW}x${qaH}) | borderClips=${borderClips}/240`
  );
  if (borderClips > 0) {
    process.exitCode = 1;
  }
}

bakeVfxSheet();
