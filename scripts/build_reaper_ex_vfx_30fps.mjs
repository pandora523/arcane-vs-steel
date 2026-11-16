#!/usr/bin/env node
/**
 * Next-Gen 30fps VFX Sprite Sheet Builder for Malakor EX (`reaper_ex` / `ReaperEx.js`).
 * Powered natively by `src/engine/ArcaneShaderFX.js` + `src/engine/shaders/abyssalShaders.js`
 * enhanced with crisp FFBE / Last Cloudia tattered crimson-violet serrated scythe-waves
 * and razor X-Scissor hit-scars.
 *
 * Row Contract (8 rows x 30 cols @ 208x208 = 6240x1664):
 *   - Row 0: Spinning Twin-Crescent Phantom Soul-Scythe Wave & Returning Soul-Disc
 *   - Row 1: Homing Crimson-Violet Soul-Leech Wisp & Ferryman Soul Fragment
 *   - Row 2: Ground-Erupting Ossuary Guillotine Bone-Obelisk Spire
 *   - Row 3: Towering Hooded Thanatos Death-God Stand Sovereign Avatar
 *   - Row 4: Razor FFBE Tattered Crimson-Violet X-Scissor Soul-Slash Scar
 *   - Row 5: Twin Obsidian Cathedral Gates of Oblivion
 *   - Row 6: Six-Scythe Death-Clock Execution Altar Bind Seal
 *   - Row 7: Colossal Memento Mori Reality-Split Cross-Guillotine Crescent
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
  DeterministicRng,
  createPixelSurface,
  clearPixelSurface,
  resolveSurfaceToRGBA,
  ShaderPen,
  instantiateShaderEffect
} from '../src/engine/ArcaneShaderFX.js';

import {
  ABYSSAL_VIOLET_PALETTE,
  BLOOD_MOON_CRIMSON_PALETTE,
  ABYSSAL_EFFECT_REGISTRY
} from '../src/engine/shaders/abyssalShaders.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SCRATCH_DIR =
  '/Users/rei/.gemini/antigravity/brain/5416474b-0e5f-4471-85c8-b7a88055e218/scratch';

const C_SEL_DARK = packHexColor('#080614');
const C_ABYSS_DEEP = packHexColor('#3b0764');
const C_ORCHID = packHexColor('#c084fc');
const C_ORCHID_LIT = packHexColor('#e879f9');
const C_CRIMSON = packHexColor('#f43f5e');
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
        if (rgba[o + 3] < 96) {
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

function drawRazorSoulScar(pen, x0, y0, x1, y1, maxHalfW, bevelCol, accentCol, alpha = 1) {
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
      } else if (aq >= hw * 0.44) {
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
    aStart = -1.45,
    aEnd = 1.45,
    maxWidth = 17,
    teethCount = 7,
    toothDepth = 0.48,
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
      else if (v > 0.58) col = C_CRIMSON;
      else if (v > 0.30) col = C_ORCHID;
      else {
        col = C_ABYSS_DEEP;
        pixAlpha = alpha * 0.82;
      }
      pen.stipple(px, py, col, pixAlpha);
    }
  }
}

function renderRow0SoulScytheWave(pen, f) {
  const ph = (f / 30) * Math.PI * 2;
  const pulse = Math.sin(ph);
  const rng = new DeterministicRng(501 + f * 19);

  for (let k = 0; k < 5; k++) {
    const wy = -24 + k * 12 + Math.sin(ph + k * 1.4) * 1.5;
    const xStart = -34 + ((f * 3 + k * 9) % 18);
    const xEnd = 10 + (k % 2) * 5;
    pen.line(xStart, wy, xEnd, wy, k % 2 === 0 ? C_CRIMSON : C_ORCHID, 0.9);
    pen.line(xStart + 4, wy - 1, xEnd, wy - 1, C_SEL_DARK, 0.85);
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
    alpha: 1.0,
    phase: f * 0.35
  });

  drawTatteredReaperCrescent(pen, {
    cx: -11,
    cy: 0,
    rx: 23,
    ry: 28,
    rotRad: -Math.sin(ph) * 0.18,
    aStart: -0.96,
    aEnd: 0.96,
    maxWidth: 8,
    teethCount: 5,
    toothDepth: 0.40,
    alpha: 0.95,
    phase: -f * 0.32
  });

  for (let s = 0; s < 6; s++) {
    const sx = rng.between(-32, 24);
    const sy = rng.between(-32, 32);
    pen.stipple(sx, sy, s % 2 === 0 ? C_CRIMSON : C_ORCHID_LIT, 0.95);
    pen.stipple(sx - 1, sy, C_SEL_DARK, 0.85);
  }
}

function renderRow4RazorXScissorScar(pen, f) {
  const u = f / 29;
  const snapA = u < 0.08 ? u / 0.08 : 1.0;
  const fadeA = clamp01(1.18 - u * 1.24);
  const snapB = u < 0.13 ? 0 : u < 0.23 ? (u - 0.13) / 0.10 : 1.0;
  const fadeB = u < 0.13 ? 0 : clamp01(1.24 - (u - 0.13) * 1.30);
  const rng = new DeterministicRng(709 + f * 17);

  if (fadeA > 0.04) {
    const L1 = 41 * snapA;
    const ang1 = -0.48;
    drawRazorSoulScar(
      pen,
      -Math.cos(ang1) * L1,
      -Math.sin(ang1) * L1,
      Math.cos(ang1) * L1,
      Math.sin(ang1) * L1,
      3.2 * fadeA,
      C_CRIMSON,
      C_ABYSS_DEEP,
      fadeA
    );
  }
  if (fadeB > 0.04) {
    const L2 = 38 * snapB;
    const ang2 = 0.64;
    drawRazorSoulScar(
      pen,
      -Math.cos(ang2) * L2,
      -Math.sin(ang2) * L2,
      Math.cos(ang2) * L2,
      Math.sin(ang2) * L2,
      2.9 * fadeB,
      C_ORCHID_LIT,
      C_CRIMSON,
      fadeB
    );
  }

  const sparkFade = Math.max(fadeA, fadeB);
  if (sparkFade > 0.12) {
    pen.stipple(0, 0, C_WHITE, sparkFade);
    for (let i = 0; i < 10; i++) {
      const a = (i % 2 === 0 ? -0.48 : 0.64) + (i < 5 ? 0 : Math.PI) + rng.between(-0.28, 0.28);
      const dist = (8 + u * 34) * rng.between(0.7, 1.05);
      const sx = Math.cos(a) * dist;
      const sy = Math.sin(a) * dist;
      if (Math.abs(sx) < 44 && Math.abs(sy) < 44) {
        pen.line(sx, sy, sx - Math.cos(a) * 4, sy - Math.sin(a) * 4, i % 2 === 0 ? C_CRIMSON : C_ORCHID_LIT, sparkFade);
        pen.stipple(sx, sy, C_SOUL_WHITE, sparkFade);
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
    dbgRgba[i * 4] = 14;
    dbgRgba[i * 4 + 1] = 8;
    dbgRgba[i * 4 + 2] = 24;
    dbgRgba[i * 4 + 3] = 255;
  }

  const shaderRowSpecs = {
    1: { def: ABYSSAL_EFFECT_REGISTRY.abyssalSkullWispCell, cfg: { x: 52, y: 52, palette: ABYSSAL_VIOLET_PALETTE, seed: 513 } },
    2: { def: ABYSSAL_EFFECT_REGISTRY.necroticBoneSpireCell, cfg: { x: 52, y: 52, palette: BLOOD_MOON_CRIMSON_PALETTE, seed: 523 } },
    3: { def: ABYSSAL_EFFECT_REGISTRY.thanatosPentagramSealCell, cfg: { x: 52, y: 52, palette: ABYSSAL_VIOLET_PALETTE, seed: 533 } },
    5: { def: ABYSSAL_EFFECT_REGISTRY.necropolisObsidianGatesCell, cfg: { x: 52, y: 52, palette: ABYSSAL_VIOLET_PALETTE, seed: 563 } },
    6: { def: ABYSSAL_EFFECT_REGISTRY.graveChainAltarBindCell, cfg: { x: 52, y: 52, palette: BLOOD_MOON_CRIMSON_PALETTE, seed: 577 } },
    7: { def: ABYSSAL_EFFECT_REGISTRY.mementoMoriGuillotineCell, cfg: { x: 52, y: 52, palette: BLOOD_MOON_CRIMSON_PALETTE, seed: 593 } }
  };

  const surface104 = createPixelSurface(LOGICAL, LOGICAL);
  const pen104 = new ShaderPen(surface104);
  const cell104 = new Uint8Array(LOGICAL * LOGICAL * 4);
  const cell208 = new Uint8Array(CELL * CELL * 4);

  let borderClips = 0;

  for (let r = 0; r < ROWS; r++) {
    const shaderSpec = shaderRowSpecs[r] || null;
    const inst = shaderSpec ? instantiateShaderEffect(shaderSpec.def, shaderSpec.cfg) : null;
    const dt = 1.0 / COLS;

    for (let c = 0; c < COLS; c++) {
      clearPixelSurface(surface104);
      if (r === 0) {
        pen104.configure(52, 52, false, 0, 1, 1);
        renderRow0SoulScytheWave(pen104, c);
      } else if (r === 4) {
        pen104.configure(52, 52, false, 0, 1, 1);
        renderRow4RazorXScissorScar(pen104, c);
      } else if (inst) {
        pen104.configure(0, 0, false, 0, 1, 1);
        inst.render(pen104, 'back');
        inst.render(pen104, 'front');
        inst.step(dt);
      }

      resolveSurfaceToRGBA(surface104, cell104, 1.08);
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
