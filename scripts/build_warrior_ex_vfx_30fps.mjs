#!/usr/bin/env node
/**
 * Newly-Born Neo-Vision 30fps VFX Sprite Sheet Builder for Aethelgard EX (`warrior_ex` / `WarriorEx.js`).
 * Powered natively by `src/engine/ArcaneShaderFX.js`.
 *
 * Row Contract (`assets/sprites/warrior_ex_vfx.png`, 6240x1664 = 8 rows x 30 cols @ 208x208):
 *   - Row 0: Sovereign Dawn-Breaker Crescent Wave (`blade_wave`, sapphire-cyan & sun-gold + 4-pt star glints)
 *   - Row 1: Consecrated Runic Sword-Seal & Winged Paladin Parry Crest (`DAWN-BREAKER TRINITY RUSH` seal)
 *   - Row 2: Sovereign Sky-Pillar Greatsword Eruption (marching sword-pillars & Sky-Pillar Uppercut)
 *   - Row 3: 5-Point Celestial Pentagram Star-Sanctuary Sigil (`CELESTIAL PENTAGRAM OMNISLASH` floor lock)
 *   - Row 4: Asymmetric Neo-Vision 4-Point Astral Starburst & Faceted Diamond Shards (0 chevron bars!)
 *   - Row 5: Stained-Glass Runic Cathedral Rose-Window Sanctuary Crest (`CATHEDRAL OF SEVEN SWORDS`)
 *   - Row 6: Towering Runic Monolith Greatsword of Light (Pentagram Plunge & 7 Celestial Greatswords)
 *   - Row 7: Luminous Seraphim Dawn-Feather & Twinkling 4-Point Star-Glints
 *
 * Invariants:
 *   - 100% 2x2 integer pixel blocks (authored on 104x104 logical grid -> 2x NEAREST)
 *   - Pure binary alpha (0 or 255), strict >= 4px (3px logical = 6px output) transparent margin (0/240 clips)
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
} from '../src/engine/ArcaneShaderFX.js?v=30fps115';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SCRATCH_DIR =
  '/Users/rei/.gemini/antigravity/brain/407ee22f-2468-4119-a090-789cbc49325d/scratch';

// Locked Sovereign Exvius Palette (matches `warrior_ex_sheet.png` 1:1)
const C_SEL_DARK = packHexColor('#080d1a');
const C_SEL_MID = packHexColor('#121c36');
const C_SAPPH_DEEP = packHexColor('#102e72');
const C_CYAN_DEEP = packHexColor('#0284c7');
const C_CYAN_BRIGHT = packHexColor('#38bdf8');
const C_CYAN_PALE = packHexColor('#bae6fd');
const C_GOLD_DEEP = packHexColor('#92400e');
const C_GOLD_MID = packHexColor('#d97706');
const C_GOLD_BRIGHT = packHexColor('#facc15');
const C_GOLD_PALE = packHexColor('#fef08a');
const C_ROSE_GLASS = packHexColor('#e11d48');
const C_ROSE_PALE = packHexColor('#fda4af');
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
        if (rgba[o + 3] < 104) {
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

/** Crisp 4-point pixel star-glint with Selout tips and pure white core. */
function drawStarGlint(pen, cx, cy, armH, armV, coreCol, tipCol, alpha = 1) {
  if (alpha <= 0.05 || (armH < 1 && armV < 1)) return;
  const rx = Math.round(cx);
  const ry = Math.round(cy);
  const lh = Math.max(1, Math.round(armH));
  const lv = Math.max(1, Math.round(armV));

  for (let i = -lh - 1; i <= lh + 1; i++) {
    if (Math.abs(i) === lh + 1) pen.stipple(rx + i, ry, C_SEL_DARK, alpha * 0.9);
  }
  for (let j = -lv - 1; j <= lv + 1; j++) {
    if (Math.abs(j) === lv + 1) pen.stipple(rx, ry + j, C_SEL_DARK, alpha * 0.9);
  }
  if (lh >= 3 && lv >= 3) {
    pen.stipple(rx + 1, ry + 1, tipCol, alpha * 0.9);
    pen.stipple(rx - 1, ry - 1, tipCol, alpha * 0.9);
    pen.stipple(rx + 1, ry - 1, tipCol, alpha * 0.9);
    pen.stipple(rx - 1, ry + 1, tipCol, alpha * 0.9);
  }
  for (let i = 1; i <= lh; i++) {
    const col = i <= Math.ceil(lh * 0.45) ? coreCol : tipCol;
    const a = alpha * (1 - (i - 1) / (lh + 1.4));
    pen.stipple(rx + i, ry, col, a);
    pen.stipple(rx - i, ry, col, a);
  }
  for (let j = 1; j <= lv; j++) {
    const col = j <= Math.ceil(lv * 0.45) ? coreCol : tipCol;
    const a = alpha * (1 - (j - 1) / (lv + 1.4));
    pen.stipple(rx, ry + j, col, a);
    pen.stipple(rx, ry - j, col, a);
  }
  pen.stipple(rx, ry, C_WHITE, alpha);
}

/** Faceted pixel diamond crystal shard. */
function drawDiamondShard(pen, cx, cy, halfW, halfH, rimCol, coreCol, alpha = 1) {
  if (alpha <= 0.06 || halfW < 1 || halfH < 1) return;
  const hw = Math.round(halfW);
  const hh = Math.round(halfH);
  for (let dy = -hh - 1; dy <= hh + 1; dy++) {
    const span = Math.round((1 - Math.abs(dy) / (hh + 1.1)) * (hw + 1));
    for (let dx = -span; dx <= span; dx++) {
      const edge = Math.abs(dx) === span || Math.abs(dy) >= hh;
      if (edge) pen.stipple(cx + dx, cy + dy, C_SEL_DARK, alpha * 0.92);
      else if (Math.abs(dx) <= Math.max(0, span - 2) && Math.abs(dy) <= Math.max(0, hh - 2)) {
        pen.stipple(cx + dx, cy + dy, dx <= 0 && dy <= 0 ? C_WHITE : coreCol, alpha);
      } else {
        pen.stipple(cx + dx, cy + dy, rimCol, alpha);
      }
    }
  }
}

/** Multi-pass tapered astral needle (Pass 1 Selout -> Pass 2 Bevel -> Pass 3 White Core, zero chevrons). */
function drawTaperedAstralRay(pen, x0, y0, x1, y1, maxHalfW, bevelCol, accentCol, alpha = 1) {
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
    const hw = maxHalfW * Math.pow(Math.sin(s * Math.PI), 0.72);
    const bx = x0 + ux * (s * len);
    const by = y0 + uy * (s * len);
    const span = Math.ceil(hw + 1.0);
    for (let q = -span; q <= span; q += 0.5) {
      if (Math.abs(q) <= hw + 0.85 && Math.abs(q) >= hw - 0.2) {
        pen.stipple(bx + nx * q, by + ny * q, C_SEL_DARK, alpha * 0.95);
      }
    }
  }
  for (let i = 0; i <= steps; i++) {
    const s = i / steps;
    const hw = maxHalfW * Math.pow(Math.sin(s * Math.PI), 0.72);
    const bx = x0 + ux * (s * len);
    const by = y0 + uy * (s * len);
    const span = Math.ceil(hw);
    for (let q = -span; q <= span; q += 0.5) {
      if (Math.abs(q) < hw - 0.1) {
        pen.stipple(bx + nx * q, by + ny * q, q >= 0 ? bevelCol : accentCol, alpha);
      }
    }
  }
  for (let i = 1; i < steps; i++) {
    const s = i / steps;
    const hw = maxHalfW * 0.38 * Math.sin(s * Math.PI);
    const bx = x0 + ux * (s * len);
    const by = y0 + uy * (s * len);
    for (let q = -hw; q <= hw; q += 0.5) {
      pen.stipple(bx + nx * q, by + ny * q, C_WHITE, alpha);
    }
  }
}

function drawSerratedCrescentArc(pen, opts) {
  const {
    cx = 0,
    cy = 0,
    rx = 34,
    ry = 38,
    rotRad = 0,
    aStart = -1.32,
    aEnd = 1.32,
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

  const steps = Math.max(92, Math.ceil(Math.abs(spanA) * Math.max(rx, ry) * 2.6));
  for (let i = 0; i <= steps; i++) {
    const s = i / steps;
    const ang = aStart + spanA * s;
    const cA = Math.cos(ang);
    const sA = Math.sin(ang);
    const belly = s < 0.74 ? Math.pow(s / 0.74, 1.32) : Math.pow(Math.max(0, (1 - s) / 0.26), 0.56);
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
      if (v > 0.92 || s > 0.96 || (v < 0.08 && s > 0.25)) col = C_SEL_DARK;
      else if (v > 0.80) col = C_WHITE;
      else if (v > 0.60) col = goldDominant ? C_GOLD_BRIGHT : C_CYAN_BRIGHT;
      else if (v > 0.36) col = goldDominant ? C_GOLD_PALE : C_GOLD_BRIGHT;
      else if (v > 0.18) {
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
// 8 NEO-VISION ROW RENDERERS (f = 0..29 on 104x104 surface centered at 52,52)
// ============================================================================

/** Row 0: Sovereign Dawn-Breaker Crescent Wave (`blade_wave`) */
function renderRow0SwordWave(pen, f) {
  const ph = (f / 30) * Math.PI * 2;
  const pulse = Math.sin(ph);

  for (let k = 0; k < 5; k++) {
    const wy = -24 + k * 12 + Math.sin(ph + k * 1.3) * 1.5;
    const xEnd = 8 + (k % 2) * 5;
    const xStart = -35 + ((f * 3 + k * 9) % 16);
    pen.line(xStart + 2, wy + 1, xEnd, wy + 1, C_SEL_DARK, 0.88);
    pen.line(xStart, wy, xEnd, wy, k % 2 === 0 ? C_CYAN_BRIGHT : C_GOLD_BRIGHT, 0.94);
  }

  drawSerratedCrescentArc(pen, {
    cx: -5 + pulse * 1.1,
    cy: 0,
    rx: 34,
    ry: 39,
    rotRad: 0,
    aStart: -1.28,
    aEnd: 1.28,
    maxWidth: 16.5 + pulse * 1.1,
    teethCount: 6,
    toothDepth: 0.45,
    goldDominant: false,
    alpha: 1.0,
    phase: f * 0.35
  });

  drawSerratedCrescentArc(pen, {
    cx: -10,
    cy: 0,
    rx: 22,
    ry: 27,
    rotRad: 0,
    aStart: -0.92,
    aEnd: 0.92,
    maxWidth: 7.2,
    teethCount: 4,
    toothDepth: 0.36,
    goldDominant: true,
    alpha: 0.96,
    phase: -f * 0.3
  });

  drawStarGlint(pen, 28 + pulse, 0, 6, 8, C_GOLD_PALE, C_CYAN_BRIGHT, 1.0);
  drawStarGlint(pen, -22, -16 + Math.cos(ph) * 2, 3, 3, C_GOLD_BRIGHT, C_CYAN_BRIGHT, 0.92);
  drawStarGlint(pen, -20, 17 - Math.sin(ph) * 2, 3, 3, C_CYAN_PALE, C_GOLD_BRIGHT, 0.92);
}

/** Row 1: Consecrated Runic Sword-Seal & Winged Paladin Crest (`SKILL` & `CROUCH`) */
function renderRow1RunicSwordSeal(pen, f) {
  const u = f / 29;
  const pop = u < 0.16 ? smoothStep(0, 0.16, u) : 1.0;
  const fade = u > 0.76 ? 1 - (u - 0.76) / 0.24 : 1.0;
  const rot = u * Math.PI * 1.5;

  // Foreshortened octagonal Runic Sword-Seal ring at base
  const rx = 36 * pop;
  const ry = 11 * pop;
  const sealY = 20;
  for (let k = 0; k < 8; k++) {
    const a0 = rot + (k * Math.PI) / 4;
    const a1 = rot + ((k + 1) * Math.PI) / 4;
    const x0 = Math.cos(a0) * rx;
    const y0 = sealY + Math.sin(a0) * ry;
    const x1 = Math.cos(a1) * rx;
    const y1 = sealY + Math.sin(a1) * ry;
    pen.line(x0, y0 + 1, x1, y1 + 1, C_SEL_DARK, fade * 0.92);
    pen.line(x0, y0, x1, y1, k % 2 === 0 ? C_GOLD_BRIGHT : C_CYAN_BRIGHT, fade);
    drawStarGlint(pen, x0, y0, 2, 2, C_WHITE, C_GOLD_BRIGHT, fade * 0.9);
  }

  // Swept Twin Paladin Wings + Central Vertical Sword-Rune Sigil
  for (const side of [-1, 1]) {
    for (let p = 0; p < 3; p++) {
      drawTaperedAstralRay(
        pen,
        side * (5 + p * 2) * pop,
        (4 + p * 4) * pop,
        side * (33 - p * 5) * pop,
        (-16 + p * 6) * pop,
        2.1 - p * 0.25,
        p % 2 === 0 ? C_GOLD_BRIGHT : C_CYAN_BRIGHT,
        C_SAPPH_DEEP,
        fade
      );
    }
  }
  drawTaperedAstralRay(pen, 0, -32 * pop, 0, 24 * pop, 3.0, C_GOLD_PALE, C_CYAN_BRIGHT, fade);
  drawTaperedAstralRay(pen, -14 * pop, -8 * pop, 14 * pop, -8 * pop, 2.2, C_GOLD_BRIGHT, C_GOLD_DEEP, fade);
  drawDiamondShard(pen, 0, -8 * pop, 4, 5, C_CYAN_BRIGHT, C_GOLD_PALE, fade);
}

/** Row 2: Sovereign Sky-Pillar Sword Eruption (`DAWN-BREAKER TRINITY RUSH` pillars) */
function renderRow2DawnSwordPillar(pen, f) {
  const u = f / 29;
  const erupt = u < 0.14 ? smoothStep(0, 0.14, u) : 1.0;
  const fade = u > 0.68 ? 1 - (u - 0.68) / 0.32 : 1.0;
  const rng = new DeterministicRng(211 + f * 23);

  const baseY = 36;
  const pillarH = 76 * erupt;
  const halfW = (11.5 - u * 4.2) * erupt;

  // 2.5D Ground Sanctuary Shock-Ring
  const ringRx = (16 + 20 * smoothStep(0, 0.62, u)) * erupt;
  const ringRy = ringRx * 0.24;
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2 + u * 2.4;
    const rx = Math.cos(a) * ringRx;
    const ry = baseY + Math.sin(a) * ringRy;
    pen.stipple(rx, ry + 1, C_SEL_DARK, fade * 0.95);
    pen.stipple(rx, ry, i % 4 === 0 ? C_WHITE : i % 2 === 0 ? C_GOLD_BRIGHT : C_CYAN_BRIGHT, fade);
  }

  // Sculpted Sword-Tipped Dawn Pillar
  if (halfW >= 1.2 && fade > 0.05) {
    const topY = baseY - pillarH;
    for (let y = Math.floor(topY); y <= baseY; y++) {
      const hFrac = clamp01((baseY - y) / Math.max(1, pillarH));
      const swordPoint = hFrac > 0.76 ? (1 - hFrac) / 0.24 : 1.0 - hFrac * 0.14;
      const w = halfW * swordPoint;
      const iw = Math.ceil(w + 1);
      for (let x = -iw; x <= iw; x++) {
        const ax = Math.abs(x);
        if (ax > w + 0.8) continue;
        let col;
        if (ax >= w - 0.25) col = C_SEL_DARK;
        else if (ax >= w * 0.66) col = x < 0 ? C_CYAN_DEEP : C_GOLD_MID;
        else if (ax >= w * 0.34) col = x < 0 ? C_CYAN_BRIGHT : C_GOLD_BRIGHT;
        else col = C_WHITE;
        pen.stipple(x, y, col, fade);
      }
    }
  }

  // Crossguard flare + rising star-glints + stepped lightning
  const guardY = baseY - pillarH * 0.32;
  if (erupt > 0.4 && fade > 0.15) {
    drawTaperedAstralRay(pen, -18 * erupt, guardY, 18 * erupt, guardY, 2.2 * fade, C_GOLD_BRIGHT, C_CYAN_BRIGHT, fade);
    const chain = buildLightningChain(rng, 0, baseY - pillarH * 0.9, 0, baseY, 0.16, 4);
    pen.polyline(chain, C_GOLD_PALE, fade * 0.95);
    for (let s = 0; s < 4; s++) {
      const sx = ((s % 2 === 0 ? -1 : 1) * (10 + s * 4));
      const sy = baseY - ((f * 3 + s * 14) % 58);
      drawStarGlint(pen, sx, sy, 3, 4, C_GOLD_PALE, C_CYAN_BRIGHT, fade);
    }
  }
}

/** Row 3: 5-Point Celestial Pentagram Star-Sanctuary Floor Sigil (`CELESTIAL PENTAGRAM OMNISLASH`) */
function renderRow3PentagramSanctuary(pen, f) {
  const u = f / 29;
  const ph = u * Math.PI * 2;
  const rx = 40;
  const ry = 15;

  // Outer Sanctuary Ring
  for (let i = 0; i < 104; i++) {
    const a = (i / 104) * Math.PI * 2 + ph * 0.5;
    const x = Math.cos(a) * rx;
    const y = Math.sin(a) * ry;
    pen.stipple(x, y + 1, C_SEL_DARK, 0.95);
    pen.stipple(x, y, i % 6 === 0 ? C_WHITE : i % 2 === 0 ? C_GOLD_BRIGHT : C_CYAN_BRIGHT, 1.0);
  }

  // 5-Point Star-Sanctuary Pentagram Chords ({5/2} star polygon: 0->2->4->1->3->0)
  const verts = [];
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI * 0.5 + ph * 0.5 + (k * Math.PI * 2) / 5;
    verts.push([Math.cos(a) * (rx * 0.92), Math.sin(a) * (ry * 0.92)]);
  }
  const starOrder = [0, 2, 4, 1, 3, 0];
  for (let s = 0; s < 5; s++) {
    const [x0, y0] = verts[starOrder[s]];
    const [x1, y1] = verts[starOrder[s + 1]];
    pen.line(x0, y0 + 1, x1, y1 + 1, C_SEL_DARK, 0.92);
    pen.line(x0, y0, x1, y1, s % 2 === 0 ? C_GOLD_BRIGHT : C_CYAN_BRIGHT, 0.98);
  }

  // 5 Glowing Vertex Star-Glints + Central Runic Core
  for (let k = 0; k < 5; k++) {
    const [vx, vy] = verts[k];
    drawStarGlint(pen, vx, vy, 3, 4, C_GOLD_PALE, C_CYAN_BRIGHT, 1.0);
  }
  drawDiamondShard(pen, 0, 0, 5, 3, C_GOLD_BRIGHT, C_CYAN_PALE, 0.95);
}

/** Row 4: Asymmetric Neo-Vision 4-Point Astral Starburst & Faceted Shards (0 chevron bars!) */
function renderRow4AstralStarburst(pen, f) {
  const u = f / 29;
  const pop = u < 0.10 ? u / 0.10 : 1.0;
  const fade = clamp01(1.16 - u * 1.24);
  const rng = new DeterministicRng(409 + f * 13);

  if (fade <= 0.04) return;

  // Asymmetric 4-ray Neo-Vision starburst (tall vertical/tilted primary + crisp cross-ray + minor diagonal glints)
  const mainLen = 38 * pop * (0.75 + 0.25 * fade);
  const crossLen = 28 * pop * (0.75 + 0.25 * fade);
  drawTaperedAstralRay(pen, -mainLen * 0.28, mainLen * 0.96, mainLen * 0.28, -mainLen * 0.96, 3.0 * fade, C_GOLD_BRIGHT, C_CYAN_DEEP, fade);
  drawTaperedAstralRay(pen, -crossLen * 0.96, -crossLen * 0.22, crossLen * 0.96, crossLen * 0.22, 2.5 * fade, C_CYAN_BRIGHT, C_GOLD_MID, fade);

  const diagLen = 19 * pop * fade;
  drawTaperedAstralRay(pen, -diagLen, diagLen, diagLen, -diagLen, 1.7 * fade, C_GOLD_PALE, C_CYAN_BRIGHT, fade * 0.9);

  drawStarGlint(pen, 0, 0, Math.max(2, Math.round(7 * fade)), Math.max(2, Math.round(9 * fade)), C_WHITE, C_GOLD_BRIGHT, fade);

  // Outward flying faceted diamond shards & star-sparks
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + 0.22 + rng.between(-0.14, 0.14);
    const dist = (9 + u * 31) * rng.between(0.78, 1.04);
    const sx = Math.cos(a) * dist;
    const sy = Math.sin(a) * dist;
    if (Math.abs(sx) < 42 && Math.abs(sy) < 42) {
      if (i % 2 === 0) {
        drawDiamondShard(pen, sx, sy, 2, 3, C_CYAN_BRIGHT, C_GOLD_PALE, fade);
      } else {
        drawStarGlint(pen, sx, sy, 2, 2, C_GOLD_BRIGHT, C_CYAN_BRIGHT, fade);
      }
    }
  }
}

/** Row 5: Stained-Glass Runic Cathedral Rose-Window Crest (`CATHEDRAL OF SEVEN SWORDS`) */
function renderRow5StainedGlassRose(pen, f) {
  const u = f / 29;
  const ph = u * Math.PI * 2;
  const fade = u < 0.12 ? smoothStep(0, 0.12, u) : u > 0.82 ? 1 - (u - 0.82) / 0.18 : 1.0;
  const R = 37;

  // Stained-glass 8-petal gothic rose window with dark lead cames (`C_SEL_DARK`)
  for (let y = -R - 2; y <= R + 2; y++) {
    for (let x = -R - 2; x <= R + 2; x++) {
      const r = Math.hypot(x, y);
      if (r > R + 1.2) continue;
      if (r >= R - 1.2) {
        pen.stipple(x, y, r >= R ? C_SEL_DARK : C_GOLD_BRIGHT, fade);
        continue;
      }
      if (Math.abs(r - R * 0.62) <= 0.9 || Math.abs(r - R * 0.30) <= 0.8) {
        pen.stipple(x, y, C_GOLD_MID, fade);
        continue;
      }
      const ang = Math.atan2(y, x) + ph * 0.25;
      const sec = Math.floor(((ang + Math.PI * 4) / (Math.PI / 4))) % 8;
      const localA = Math.abs((((ang + Math.PI * 4) % (Math.PI / 4)) - Math.PI / 8));
      if (localA > Math.PI / 8 - 0.065) {
        pen.stipple(x, y, C_SEL_DARK, fade * 0.95);
      } else if (r < R * 0.28) {
        pen.stipple(x, y, r < R * 0.12 ? C_WHITE : C_GOLD_PALE, fade);
      } else {
        const glassCol =
          sec % 4 === 0
            ? C_CYAN_BRIGHT
            : sec % 4 === 1
              ? C_GOLD_BRIGHT
              : sec % 4 === 2
                ? C_SAPPH_DEEP
                : C_ROSE_GLASS;
        // Checker stipple so cathedral glass lets stage breathe cleanly!
        if (((x + y) & 1) === 0 || r > R * 0.82) {
          pen.stipple(x, y, r > R * 0.82 && sec % 2 === 1 ? C_ROSE_PALE : glassCol, fade * 0.92);
        }
      }
    }
  }
  drawStarGlint(pen, 0, 0, 7, 7, C_WHITE, C_GOLD_BRIGHT, fade);
}

/** Row 6: Towering Runic Monolith Greatsword of Light (Pentagram Plunge & 7 Celestial Swords) */
function renderRow6MonolithGreatsword(pen, f) {
  const u = f / 29;
  const drop = u < 0.18 ? smoothStep(0, 0.18, u) : 1.0;
  const fade = u > 0.78 ? 1 - (u - 0.78) / 0.22 : 1.0;

  const tipY = -34 + 72 * drop; // locks point-down at +38
  const guardY = tipY - 54;
  const pomY = guardY - 14;

  // Sculpted Celestial Monolith Greatsword Blade
  for (let y = Math.floor(guardY); y <= Math.ceil(tipY); y++) {
    if (y < -44 || y > 44) continue;
    const bf = clamp01((tipY - y) / 54);
    const hw = bf < 0.22 ? (bf / 0.22) * 6.4 : 6.4 * (0.92 + 0.12 * bf);
    const lim = Math.ceil(hw + 1);
    for (let x = -lim; x <= lim; x++) {
      const ax = Math.abs(x);
      if (ax > hw + 0.6) continue;
      let col;
      if (ax >= hw - 0.35) col = C_SEL_DARK;
      else if (ax <= 1.2 && bf > 0.16) {
        col = Math.floor((y + f) * 0.5) % 3 === 0 ? C_GOLD_BRIGHT : C_CYAN_BRIGHT;
      } else if (ax >= hw * 0.62) {
        col = x < 0 ? C_CYAN_PALE : C_GOLD_PALE;
      } else {
        col = C_WHITE;
      }
      pen.stipple(x, y, col, fade);
    }
  }

  // Winged Sun-Gold Crossguard + Sapphire Gem + Hilt + Pommel
  if (guardY >= -42 && guardY <= 38) {
    drawTaperedAstralRay(pen, -19, guardY - 4, 0, guardY + 1, 2.8, C_GOLD_BRIGHT, C_GOLD_DEEP, fade);
    drawTaperedAstralRay(pen, 19, guardY - 4, 0, guardY + 1, 2.8, C_GOLD_BRIGHT, C_GOLD_DEEP, fade);
    drawDiamondShard(pen, 0, guardY, 3, 3, C_CYAN_BRIGHT, C_WHITE, fade);
  }
  if (pomY >= -44 && guardY <= 38) {
    const yTop = Math.max(-43, Math.floor(pomY));
    const yBot = Math.max(-43, Math.floor(guardY - 2));
    pen.line(-1, yTop, -1, yBot, C_SEL_DARK, fade);
    pen.line(1, yTop, 1, yBot, C_SEL_DARK, fade);
    pen.line(0, yTop, 0, yBot, C_GOLD_BRIGHT, fade);
    drawDiamondShard(pen, 0, yTop, 3, 3, C_GOLD_BRIGHT, C_GOLD_PALE, fade);
  }

  // Ground consecration shockbar & star-glints once planted
  if (drop >= 0.94) {
    drawTaperedAstralRay(pen, -28, 38, 28, 38, 2.4 * fade, C_GOLD_BRIGHT, C_CYAN_BRIGHT, fade);
    drawStarGlint(pen, 0, 37, 6, 4, C_WHITE, C_GOLD_BRIGHT, fade);
  }
}

/** Row 7: Luminous Seraphim Dawn-Feather & Twinkling 4-Point Star-Glints */
function renderRow7SovereignFeather(pen, f) {
  const ph = (f / 30) * Math.PI * 2;
  const sway = Math.sin(ph) * 4.5;
  const tilt = 0.52 + Math.cos(ph) * 0.18;
  const ux = Math.cos(tilt);
  const uy = Math.sin(tilt);
  const nx = -uy;
  const ny = ux;

  const L = 22;
  for (let d = -L; d <= L; d += 0.55) {
    const s = (d + L) / (2 * L);
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
      else if (aq < 0.65) col = C_GOLD_BRIGHT;
      else if (s > 0.72) col = C_CYAN_PALE;
      else col = q < 0 ? C_WHITE : C_CYAN_BRIGHT;
      pen.stipple(bx + nx * q, by + ny * q, col, 1.0);
    }
  }

  drawStarGlint(pen, -18, -14 + Math.cos(ph) * 3, 4, 4, C_GOLD_PALE, C_CYAN_BRIGHT, 1.0);
  drawStarGlint(pen, 19, 12 - Math.sin(ph) * 3, 3, 3, C_CYAN_PALE, C_GOLD_BRIGHT, 1.0);
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
    renderRow1RunicSwordSeal,
    renderRow2DawnSwordPillar,
    renderRow3PentagramSanctuary,
    renderRow4AstralStarburst,
    renderRow5StainedGlassRose,
    renderRow6MonolithGreatsword,
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
      if (has4pxBorderClip208(cell208, CELL, 4)) borderClips++;

      blitUpscaledNearest(cell104, LOGICAL, LOGICAL, 2, sheetRgba, sheetW, c * CELL, r * CELL);

      const dx = dbgPad + c * (LOGICAL + dbgPad);
      const dy = dbgPad + r * (LOGICAL + dbgPad);
      for (let yy = 0; yy < LOGICAL; yy++) {
        for (let xx = 0; xx < LOGICAL; xx++) {
          const isEdge = xx === 0 || yy === 0 || xx === LOGICAL - 1 || yy === LOGICAL - 1;
          const o = ((dy + yy) * dbgW + (dx + xx)) * 4;
          dbgRgba[o] = isEdge ? 42 : 12;
          dbgRgba[o + 1] = isEdge ? 68 : 18;
          dbgRgba[o + 2] = isEdge ? 108 : 34;
          dbgRgba[o + 3] = 255;
        }
      }
      alphaCompositeOnto(cell104, LOGICAL, LOGICAL, dbgRgba, dbgW, dx, dy);
    }
  }

  if (borderClips !== 0) {
    throw new Error(`[warrior_ex_vfx] Expected 0/240 border clips, got ${borderClips}/240`);
  }

  const outPath = path.join(REPO_ROOT, 'assets', 'sprites', 'warrior_ex_vfx.png');
  fs.writeFileSync(outPath, encodeRgbaPng(sheetW, sheetH, sheetRgba));
  console.log(`[warrior_ex_vfx] Wrote ${outPath} (${sheetW}x${sheetH}, borderClips=${borderClips}/240)`);

  fs.mkdirSync(SCRATCH_DIR, { recursive: true });
  const dbgPath = path.join(SCRATCH_DIR, 'debug_warrior_ex_vfx_contact.png');
  fs.writeFileSync(dbgPath, encodeRgbaPng(dbgW, dbgH, dbgRgba));
  console.log(`[warrior_ex_vfx] Wrote contact sheet -> ${dbgPath}`);
}

bakeVfxSheet();
