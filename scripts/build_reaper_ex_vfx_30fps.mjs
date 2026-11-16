#!/usr/bin/env node
/**
 * Newly-Born Neo-Vision 30fps VFX Sprite Sheet Builder for Malakor EX (`reaper_ex` / `ReaperEx.js`).
 * Powered natively by `src/engine/ArcaneShaderFX.js`.
 *
 * Row Contract (`assets/sprites/reaper_ex_vfx.png`, 6240x1664 = 8 rows x 30 cols @ 208x208):
 *   - Row 0: Tattered Crimson-Violet Phantom Soul-Scythe Crescent (`phantom_scythe` & Soul-Disc)
 *   - Row 1: Glowing Crimson-Violet Soul-Lantern Effigy & Rising Soul-Flame (`ABYSSAL SOUL-GUILLOTINE`)
 *   - Row 2: Towering Ossuary Bone-Obelisk Scythe Guillotine Spire
 *   - Row 3: Towering Skeletal Thanatos Sovereign Stand Avatar (`LEGION OF THANATOS` & `MEMENTO MORI`)
 *   - Row 4: Asymmetric Neo-Vision Abyssal Soul-Starburst & Bone Shards (0 chevron bars!)
 *   - Row 5: Gothic Cathedral Gate of Oblivion (`MEMENTO MORI: CATHEDRAL OF OBLIVION`)
 *   - Row 6: Pixel-Dithered Blood-Moon Eclipse Seal (`LEGION OF THANATOS` overhead eclipse)
 *   - Row 7: Colossal Violet-Crimson Scythe Guillotine Execution Crescent (6-Pillar Guillotine)
 *
 * Invariants:
 *   - 100% 2x2 integer pixel blocks (104x104 logical -> 2x NEAREST)
 *   - Pure binary alpha (0 or 255), 0/240 4px border clips, 0 Unicode emojis
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
} from '../src/engine/ArcaneShaderFX.js?v=30fps115';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SCRATCH_DIR =
  '/Users/rei/.gemini/antigravity/brain/407ee22f-2468-4119-a090-789cbc49325d/scratch';

const C_SEL_DARK = packHexColor('#070410');
const C_OBSIDIAN = packHexColor('#1a0b2e');
const C_ABYSS_VIOLET = packHexColor('#581c87');
const C_ORCHID = packHexColor('#c084fc');
const C_ORCHID_LIT = packHexColor('#e879f9');
const C_CRIMSON_DEEP = packHexColor('#9f1239');
const C_CRIMSON = packHexColor('#f43f5e');
const C_CRIMSON_PALE = packHexColor('#fda4af');
const C_BONE_DARK = packHexColor('#94a3b8');
const C_BONE_LIT = packHexColor('#e2e8f0');
const C_SOUL_WHITE = packHexColor('#fdf4ff');
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

function drawPixelBox(pen, x0, y0, x1, y1, fillCol, borderCol = C_SEL_DARK, alpha = 1) {
  const lx0 = Math.round(Math.min(x0, x1));
  const lx1 = Math.round(Math.max(x0, x1));
  const ly0 = Math.round(Math.min(y0, y1));
  const ly1 = Math.round(Math.max(y0, y1));
  for (let y = ly0; y <= ly1; y++) {
    for (let x = lx0; x <= lx1; x++) {
      const edge = x === lx0 || x === lx1 || y === ly0 || y === ly1;
      pen.stipple(x, y, edge ? borderCol : fillCol, alpha);
    }
  }
}

function drawSoulStar(pen, cx, cy, armH, armV, tipCol, alpha = 1) {
  const rx = Math.round(cx);
  const ry = Math.round(cy);
  const lh = Math.max(1, Math.round(armH));
  const lv = Math.max(1, Math.round(armV));
  for (let i = 1; i <= lh; i++) {
    pen.stipple(rx + i, ry, i === 1 ? C_SOUL_WHITE : tipCol, alpha);
    pen.stipple(rx - i, ry, i === 1 ? C_SOUL_WHITE : tipCol, alpha);
  }
  for (let j = 1; j <= lv; j++) {
    pen.stipple(rx, ry + j, j === 1 ? C_SOUL_WHITE : tipCol, alpha);
    pen.stipple(rx, ry - j, j === 1 ? C_SOUL_WHITE : tipCol, alpha);
  }
  pen.stipple(rx, ry, C_WHITE, alpha);
}

function drawTaperedSoulRay(pen, x0, y0, x1, y1, maxHalfW, bevelCol, accentCol, alpha = 1) {
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
      pen.stipple(bx + nx * q, by + ny * q, C_SOUL_WHITE, alpha);
    }
  }
}

function drawTatteredReaperCrescent(pen, opts) {
  const {
    cx = 0,
    cy = 0,
    rx = 34,
    ry = 38,
    rotRad = 0,
    aStart = -1.42,
    aEnd = 1.42,
    maxWidth = 17,
    teethCount = 7,
    toothDepth = 0.48,
    crimsonDominant = false,
    alpha = 1,
    phase = 0
  } = opts;
  if (alpha <= 0.04 || maxWidth <= 0.6) return;

  const cosR = Math.cos(rotRad);
  const sinR = Math.sin(rotRad);
  const spanA = aEnd - aStart;
  const steps = Math.max(96, Math.ceil(Math.abs(spanA) * Math.max(rx, ry) * 2.6));
  for (let i = 0; i <= steps; i++) {
    const s = i / steps;
    const ang = aStart + spanA * s;
    const cA = Math.cos(ang);
    const sA = Math.sin(ang);
    const belly = s < 0.72 ? Math.pow(s / 0.72, 1.32) : Math.pow(Math.max(0, (1 - s) / 0.28), 0.56);
    const toothArg = s * teethCount + phase * 0.4;
    const saw = toothArg - Math.floor(toothArg);
    const ripNotch = s > 0.08 && s < 0.90 ? Math.pow(saw, 1.45) * toothDepth : 0;
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
      if (v > 0.92 || s > 0.96 || (v < 0.08 && s > 0.24)) col = C_SEL_DARK;
      else if (v > 0.80) col = C_SOUL_WHITE;
      else if (v > 0.56) col = crimsonDominant ? C_CRIMSON : C_ORCHID_LIT;
      else if (v > 0.28) col = crimsonDominant ? C_ORCHID : C_CRIMSON;
      else {
        col = C_ABYSS_VIOLET;
        pixAlpha = alpha * 0.84;
      }
      pen.stipple(px, py, col, pixAlpha);
    }
  }
}

/** Row 0: Tattered Crimson-Violet Phantom Scythe Wave (`phantom_scythe` & Soul-Disc) */
function renderRow0SoulScytheWave(pen, f) {
  const ph = (f / 30) * Math.PI * 2;
  const pulse = Math.sin(ph);

  for (let k = 0; k < 5; k++) {
    const wy = -24 + k * 12 + Math.sin(ph + k * 1.4) * 1.5;
    const xStart = -34 + ((f * 3 + k * 9) % 18);
    const xEnd = 10 + (k % 2) * 5;
    pen.line(xStart + 3, wy + 1, xEnd, wy + 1, C_SEL_DARK, 0.88);
    pen.line(xStart, wy, xEnd, wy, k % 2 === 0 ? C_CRIMSON : C_ORCHID_LIT, 0.94);
  }

  drawTatteredReaperCrescent(pen, {
    cx: -6 + pulse * 1.2,
    cy: 0,
    rx: 35,
    ry: 40,
    rotRad: Math.sin(ph) * 0.12,
    aStart: -1.36,
    aEnd: 1.36,
    maxWidth: 17 + pulse * 1.2,
    teethCount: 7,
    toothDepth: 0.48,
    crimsonDominant: true,
    alpha: 1.0,
    phase: f * 0.35
  });

  drawTatteredReaperCrescent(pen, {
    cx: -11,
    cy: 0,
    rx: 23,
    ry: 28,
    rotRad: -Math.sin(ph) * 0.16,
    aStart: -0.96,
    aEnd: 0.96,
    maxWidth: 8,
    teethCount: 5,
    toothDepth: 0.40,
    crimsonDominant: false,
    alpha: 0.95,
    phase: -f * 0.32
  });

  drawSoulStar(pen, 28 + pulse, 0, 5, 7, C_CRIMSON, 1.0);
}

/** Row 1: Glowing Crimson-Violet Soul-Lantern Effigy & Rising Soul-Flame (`ABYSSAL SOUL-GUILLOTINE`) */
function renderRow1SoulLanternEffigy(pen, f) {
  const ph = (f / 30) * Math.PI * 2;
  const sway = Math.round(Math.sin(ph) * 2);
  const bob = Math.round(Math.cos(ph) * 2);

  // Rising Tapered Soul-Flame Plume above the Lantern Spire
  for (let y = -36; y <= -14; y++) {
    const t = clamp01((-14 - y) / 22);
    const waveX = sway + Math.round(Math.sin(ph * 2 + t * 5) * 2.5);
    const hw = Math.max(1, Math.round((1 - t) * 7));
    for (let dx = -hw; dx <= hw; dx++) {
      const col = Math.abs(dx) === hw ? C_SEL_DARK : Math.abs(dx) <= 1 ? C_SOUL_WHITE : dx < 0 ? C_CRIMSON : C_ORCHID_LIT;
      pen.stipple(waveX + dx, y + bob, col, 1.0);
    }
  }

  // Wrought-Iron Gothic Soul-Lantern Cage + Pulsing Crimson-Violet Soul Core
  pen.line(sway, -22 + bob, sway, -15 + bob, C_BONE_LIT, 1.0);
  drawPixelBox(pen, sway - 12, -15 + bob, sway + 12, -10 + bob, C_OBSIDIAN, C_SEL_DARK, 1.0);
  drawPixelBox(pen, sway - 10, 14 + bob, sway + 10, 19 + bob, C_OBSIDIAN, C_SEL_DARK, 1.0);

  // Inner Glowing Soul Heart
  for (let y = -9; y <= 13; y++) {
    const ny = y / 11;
    const hw = Math.max(2, Math.round(8 * Math.sqrt(Math.max(0, 1 - ny * ny * 0.65))));
    for (let dx = -hw; dx <= hw; dx++) {
      const r = Math.hypot(dx / 8, ny);
      const col = r < 0.36 ? C_WHITE : r < 0.68 ? C_CRIMSON : C_ORCHID_LIT;
      pen.stipple(sway + dx, y + bob, col, 1.0);
    }
  }

  // Lantern Iron Ribs
  for (const rxOff of [-10, 0, 10]) {
    pen.line(sway + rxOff, -10 + bob, sway + rxOff, 14 + bob, C_SEL_DARK, 1.0);
  }
  // Trailing Chain Links below Lantern
  for (let c = 0; c < 4; c++) {
    const cy = 21 + c * 4 + bob;
    drawPixelBox(pen, sway - 2 + (c % 2), cy, sway + 2 + (c % 2), cy + 3, C_BONE_DARK, C_SEL_DARK, 0.95);
  }
  drawSoulStar(pen, sway - 16, -4 + bob, 3, 4, C_ORCHID_LIT, 0.92);
  drawSoulStar(pen, sway + 16, 4 + bob, 3, 4, C_CRIMSON, 0.92);
}

/** Row 2: Towering Ossuary Bone-Obelisk Scythe Guillotine Spire */
function renderRow2BoneObeliskSpire(pen, f) {
  const u = f / 29;
  const erupt = u < 0.14 ? smoothStep(0, 0.14, u) : 1.0;
  const fade = u > 0.74 ? 1 - (u - 0.74) / 0.26 : 1.0;

  const baseY = 34;
  const spireH = Math.round(70 * erupt);
  const topY = baseY - spireH;

  // Grave-Earth Crimson-Violet Rupture Ring
  for (let i = 0; i < 56; i++) {
    const a = (i / 56) * Math.PI * 2 + u * 2;
    const rx = Math.cos(a) * 26 * erupt;
    const ry = baseY + Math.sin(a) * 6 * erupt;
    pen.stipple(rx, ry + 1, C_SEL_DARK, fade);
    pen.stipple(rx, ry, i % 2 === 0 ? C_CRIMSON : C_ORCHID, fade);
  }

  // Sculpted Bone-Ribbed Obsidian Obelisk Column + Scythe Finial Crown
  for (let y = topY; y <= baseY; y++) {
    const hFrac = clamp01((baseY - y) / Math.max(1, spireH));
    const taper = hFrac > 0.78 ? (1 - hFrac) / 0.22 : 1.0 - hFrac * 0.28;
    const rib = Math.abs(((y - topY) % 8) - 4) <= 1 && hFrac < 0.72 ? 3 : 0;
    const hw = Math.max(1, Math.round(11 * taper + rib));
    for (let x = -hw; x <= hw; x++) {
      const ax = Math.abs(x);
      let col;
      if (ax === hw) col = C_SEL_DARK;
      else if (rib > 0 && ax >= hw - 3) col = C_BONE_LIT;
      else if (ax <= 1 && hFrac < 0.85) col = (y + f) % 4 < 2 ? C_CRIMSON : C_SOUL_WHITE;
      else col = x < 0 ? C_ABYSS_VIOLET : C_OBSIDIAN;
      pen.stipple(x, y, col, fade);
    }
  }

  // Curved Scythe-Blade Crown atop Obelisk
  if (erupt > 0.5 && fade > 0.15) {
    drawTatteredReaperCrescent(pen, {
      cx: 4,
      cy: topY + 14,
      rx: 22 * erupt,
      ry: 14 * erupt,
      rotRad: -0.45,
      aStart: -1.3,
      aEnd: 1.1,
      maxWidth: 6.5 * fade,
      teethCount: 4,
      toothDepth: 0.35,
      crimsonDominant: true,
      alpha: fade,
      phase: u * 2
    });
  }
}

/** Row 3: Towering Skeletal Thanatos Sovereign Stand Avatar (`LEGION OF THANATOS`) */
function renderRow3ThanatosSovereignStand(pen, f) {
  const ph = (f / 30) * Math.PI * 2;
  const bob = Math.round(Math.sin(ph) * 2);
  const wingLift = Math.round(Math.cos(ph) * 3);

  // Swept Twin Spectral Scythe-Pinion Wings behind Thanatos
  for (const side of [-1, 1]) {
    drawTaperedSoulRay(pen, side * 8, -8 + bob, side * 38, -28 + wingLift, 4.2, C_ABYSS_VIOLET, C_CRIMSON_DEEP, 0.96);
    drawTaperedSoulRay(pen, side * 10, 0 + bob, side * 35, -12 + wingLift, 3.4, C_ORCHID, C_ABYSS_VIOLET, 0.96);
    drawTaperedSoulRay(pen, side * 8, 8 + bob, side * 28, 4 + wingLift, 2.8, C_CRIMSON, C_OBSIDIAN, 0.92);
  }

  // Tattered Abyssal Mantle Torso + Sculpted Bone Ribcage
  for (let y = -14; y <= 32; y++) {
    const t = (y + 14) / 46;
    const ragged = Math.sin(t * 14 + ph) * 2;
    const hw = Math.round((t < 0.45 ? 15 - t * 6 : 12 + (t - 0.45) * 14) + ragged * 0.5);
    for (let x = -hw; x <= hw; x++) {
      if (y > 24 && Math.abs(x * 3 + y) % 5 === 0) continue; // tattered hem!
      const ax = Math.abs(x);
      let col;
      if (ax === hw) col = C_SEL_DARK;
      else if (y >= -6 && y <= 10 && ax >= 2 && ax <= 9 && (y + 16) % 4 <= 1) {
        col = ax <= 5 ? C_BONE_LIT : C_BONE_DARK; // skeletal ribcage!
      } else if (ax <= 2 && y >= -6 && y <= 14) {
        col = C_CRIMSON; // glowing soul-furnace spine!
      } else {
        col = x < 0 ? C_OBSIDIAN : C_ABYSS_VIOLET;
      }
      pen.stipple(x, y + bob, col, 1.0);
    }
  }

  // Hooded Obsidian Cowl + Horned Crown + Skull Visage + Blazing Crimson Eyes
  drawPixelBox(pen, -10, -30 + bob, 10, -14 + bob, C_OBSIDIAN, C_SEL_DARK, 1.0);
  drawPixelBox(pen, -6, -26 + bob, 6, -16 + bob, C_BONE_LIT, C_SEL_DARK, 1.0);
  // Twin Sovereign Death-Horns
  drawTaperedSoulRay(pen, -8, -26 + bob, -18, -38 + bob, 2.2, C_ORCHID_LIT, C_CRIMSON, 1.0);
  drawTaperedSoulRay(pen, 8, -26 + bob, 18, -38 + bob, 2.2, C_ORCHID_LIT, C_CRIMSON, 1.0);
  // Glowing Crimson Eyes
  pen.stipple(-3, -22 + bob, C_CRIMSON, 1.0);
  pen.stipple(-2, -22 + bob, C_WHITE, 1.0);
  pen.stipple(3, -22 + bob, C_CRIMSON, 1.0);
  pen.stipple(2, -22 + bob, C_WHITE, 1.0);
}

/** Row 4: Asymmetric Neo-Vision Abyssal Soul-Starburst (0 chevron bars!) */
function renderRow4AbyssalStarburst(pen, f) {
  const u = f / 29;
  const pop = u < 0.10 ? u / 0.10 : 1.0;
  const fade = clamp01(1.16 - u * 1.24);
  const rng = new DeterministicRng(709 + f * 17);
  if (fade <= 0.04) return;

  const mainLen = 38 * pop * (0.75 + 0.25 * fade);
  const crossLen = 27 * pop * (0.75 + 0.25 * fade);
  drawTaperedSoulRay(pen, -mainLen * 0.34, mainLen * 0.94, mainLen * 0.34, -mainLen * 0.94, 3.1 * fade, C_CRIMSON, C_ABYSS_VIOLET, fade);
  drawTaperedSoulRay(pen, -crossLen * 0.94, -crossLen * 0.28, crossLen * 0.94, crossLen * 0.28, 2.5 * fade, C_ORCHID_LIT, C_CRIMSON_DEEP, fade);
  drawSoulStar(pen, 0, 0, Math.max(2, Math.round(6 * fade)), Math.max(2, Math.round(8 * fade)), C_CRIMSON, fade);

  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + 0.3 + rng.between(-0.15, 0.15);
    const dist = (8 + u * 32) * rng.between(0.75, 1.04);
    const sx = Math.cos(a) * dist;
    const sy = Math.sin(a) * dist;
    if (Math.abs(sx) < 42 && Math.abs(sy) < 42) {
      drawSoulStar(pen, sx, sy, 2, 3, i % 2 === 0 ? C_CRIMSON : C_ORCHID_LIT, fade);
    }
  }
}

/** Row 5: Gothic Cathedral Gate of Oblivion (`MEMENTO MORI: CATHEDRAL OF OBLIVION`) */
function renderRow5GothicOblivionGate(pen, f) {
  const ph = (f / 30) * Math.PI * 2;
  const pulse = 0.5 + 0.5 * Math.sin(ph);

  // Twin Gothic Buttress Pillars + Pointed Lancet Arch
  drawPixelBox(pen, -28, -22, -18, 38, C_OBSIDIAN, C_SEL_DARK, 1.0);
  drawPixelBox(pen, 18, -22, 28, 38, C_OBSIDIAN, C_SEL_DARK, 1.0);
  // Finial Spires
  drawTaperedSoulRay(pen, -23, -22, -23, -38, 3.2, C_BONE_DARK, C_OBSIDIAN, 1.0);
  drawTaperedSoulRay(pen, 23, -22, 23, -38, 3.2, C_BONE_DARK, C_OBSIDIAN, 1.0);
  drawTaperedSoulRay(pen, 0, -30, 0, -42, 3.4, C_CRIMSON, C_ORCHID, 1.0);

  // Pointed Gothic Archway & Glowing Violet-Crimson Portal Interior
  for (let y = -30; y <= 36; y++) {
    const archFrac = y < -4 ? clamp01((y + 30) / 26) : 1.0;
    const innerW = Math.round(17 * Math.pow(archFrac, 0.68));
    for (let x = -innerW - 3; x <= innerW + 3; x++) {
      const ax = Math.abs(x);
      if (ax > innerW) {
        pen.stipple(x, y, ax === innerW + 3 ? C_SEL_DARK : C_BONE_DARK, 1.0);
      } else {
        // Swirling Gothic Stained/Vortex Portal bars
        const bar = ax === 6 || ax === 12;
        if (bar) {
          pen.stipple(x, y, C_SEL_DARK, 1.0);
        } else if (((x + y + Math.floor(f * 0.5)) & 1) === 0) {
          const r = Math.hypot(x / 16, (y - 4) / 28);
          const col = r < 0.35 + pulse * 0.1 ? C_SOUL_WHITE : r < 0.68 ? C_CRIMSON : C_ABYSS_VIOLET;
          pen.stipple(x, y, col, 0.96);
        }
      }
    }
  }
  // Skull Keystone at Arch Apex
  drawPixelBox(pen, -4, -30, 4, -22, C_BONE_LIT, C_SEL_DARK, 1.0);
  pen.stipple(-2, -26, C_CRIMSON, 1.0);
  pen.stipple(2, -26, C_CRIMSON, 1.0);
}

/** Row 6: Pixel-Dithered Blood-Moon Eclipse Seal (`LEGION OF THANATOS` & `MEMENTO MORI`) */
function renderRow6BloodMoonEclipse(pen, f) {
  const ph = (f / 30) * Math.PI * 2;
  const R = 26;

  // Blazing Crimson-Violet Corona Ring + Pitch-Black Lunar Disc
  for (let y = -38; y <= 38; y++) {
    for (let x = -38; x <= 38; x++) {
      const r = Math.hypot(x, y);
      if (r < R - 2) {
        pen.stipple(x, y, r > R - 5 && ((x + y) & 1) === 0 ? C_OBSIDIAN : C_SEL_DARK, 1.0);
      } else if (r <= R + 2.2) {
        pen.stipple(x, y, r <= R ? C_SOUL_WHITE : C_CRIMSON, 1.0);
      } else if (r <= R + 10) {
        const flare = Math.sin(Math.atan2(y, x) * 6 + ph) * 2.5;
        if (r <= R + 6 + flare && ((x ^ y) & 1) === 0) {
          pen.stipple(x, y, r < R + 5 ? C_CRIMSON : C_ORCHID, 0.95);
        }
      }
    }
  }

  // 6 Orbiting Scythe-Fang EclipseSpikes
  for (let k = 0; k < 6; k++) {
    const a = ph * 0.5 + (k * Math.PI) / 3;
    const x0 = Math.cos(a) * (R + 1);
    const y0 = Math.sin(a) * (R + 1);
    const x1 = Math.cos(a + 0.18) * (R + 12);
    const y1 = Math.sin(a + 0.18) * (R + 12);
    drawTaperedSoulRay(pen, x0, y0, x1, y1, 2.2, k % 2 === 0 ? C_CRIMSON : C_ORCHID_LIT, C_ABYSS_VIOLET, 1.0);
  }
}

/** Row 7: Colossal Violet-Crimson Scythe Guillotine Execution Crescent */
function renderRow7GuillotineCrescent(pen, f) {
  const u = f / 29;
  const fade = u > 0.72 ? 1 - (u - 0.72) / 0.28 : 1.0;
  if (fade <= 0.04) return;

  // Sweeping Downward Colossal Executioner Scythe Blade
  drawTatteredReaperCrescent(pen, {
    cx: 0,
    cy: -2,
    rx: 39,
    ry: 35,
    rotRad: Math.PI * 0.5 + (u - 0.3) * 0.28,
    aStart: -1.48,
    aEnd: 1.48,
    maxWidth: 19 * fade,
    teethCount: 8,
    toothDepth: 0.46,
    crimsonDominant: true,
    alpha: fade,
    phase: u * 3
  });

  // Vertical Guillotine Pillar Spine
  drawTaperedSoulRay(pen, 0, -40, 0, 40, 3.2 * fade, C_ORCHID_LIT, C_CRIMSON, fade);
  drawSoulStar(pen, 0, 12, Math.max(2, Math.round(8 * fade)), Math.max(2, Math.round(6 * fade)), C_CRIMSON_PALE, fade);
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
    dbgRgba[i * 4] = 14;
    dbgRgba[i * 4 + 1] = 8;
    dbgRgba[i * 4 + 2] = 24;
    dbgRgba[i * 4 + 3] = 255;
  }

  const surface104 = createPixelSurface(LOGICAL, LOGICAL);
  const pen104 = new ShaderPen(surface104);
  const cell104 = new Uint8Array(LOGICAL * LOGICAL * 4);
  const cell208 = new Uint8Array(CELL * CELL * 4);

  const rowFns = [
    renderRow0SoulScytheWave,
    renderRow1SoulLanternEffigy,
    renderRow2BoneObeliskSpire,
    renderRow3ThanatosSovereignStand,
    renderRow4AbyssalStarburst,
    renderRow5GothicOblivionGate,
    renderRow6BloodMoonEclipse,
    renderRow7GuillotineCrescent
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
          dbgRgba[o] = isEdge ? 72 : 24;
          dbgRgba[o + 1] = isEdge ? 24 : 12;
          dbgRgba[o + 2] = isEdge ? 92 : 34;
          dbgRgba[o + 3] = 255;
        }
      }
      alphaCompositeOnto(cell104, LOGICAL, LOGICAL, dbgRgba, dbgW, dx, dy);
    }
  }

  if (borderClips !== 0) {
    throw new Error(`[reaper_ex_vfx] Expected 0/240 border clips, got ${borderClips}/240`);
  }

  const outPath = path.join(REPO_ROOT, 'assets', 'sprites', 'reaper_ex_vfx.png');
  fs.writeFileSync(outPath, encodeRgbaPng(sheetW, sheetH, sheetRgba));
  console.log(`[reaper_ex_vfx] Wrote ${outPath} (${sheetW}x${sheetH}, borderClips=${borderClips}/240)`);

  fs.mkdirSync(SCRATCH_DIR, { recursive: true });
  const dbgPath = path.join(SCRATCH_DIR, 'debug_reaper_ex_vfx_contact.png');
  fs.writeFileSync(dbgPath, encodeRgbaPng(dbgW, dbgH, dbgRgba));
  console.log(`[reaper_ex_vfx] Wrote contact sheet -> ${dbgPath}`);
}

bakeVfxSheet();
