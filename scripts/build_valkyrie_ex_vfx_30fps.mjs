#!/usr/bin/env node
/**
 * Next-Gen 30fps VFX Sprite Sheet Builder for FREYJA EX (`valkyrie_ex` -> `ValkyrieEx.js`).
 * Powered by `src/engine/ArcaneShaderFX.js` + `src/engine/shaders/valkyrieShaders.js` +
 * bespoke Next-Gen serrated crimson-gold pixel-art accents and strict binary alpha (`0` or `255`).
 *
 * Outputs:
 *   1. `assets/sprites/valkyrie_ex_vfx.png` (`6240x1664`, `8 rows x 30 cols @ 208x208`, `2x2` integer blocks, `0/240` border clips)
 *   2. `<scratch>/debug_valkyrie_ex_vfx.png` (`8x30` contact sheet for visual QA)
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
  instantiateShaderEffect
} from '../src/engine/ArcaneShaderFX.js';

import {
  VALKYRIE_CRIMSON_PALETTE,
  VALKYRIE_EFFECT_REGISTRY
} from '../src/engine/shaders/valkyrieShaders.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SCRATCH_DIR =
  '/Users/rei/.gemini/antigravity/brain/5416474b-0e5f-4471-85c8-b7a88055e218/scratch';

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

function putPx104(rgba, x, y, r, g, b, a = 255) {
  const ix = Math.round(x);
  const iy = Math.round(y);
  if (ix < 3 || ix >= 101 || iy < 3 || iy >= 101) return;
  const o = (iy * 104 + ix) * 4;
  rgba[o] = r;
  rgba[o + 1] = g;
  rgba[o + 2] = b;
  rgba[o + 3] = a;
}

/**
 * Adds bespoke Next-Gen serrated crimson-gold Valkyrie accents to Row 0 (`dragon_lance` wave)
 * and Row 4 (Valhalla Dragonfire Crescent Hit-Scar).
 */
function addNextGenValkyrieAccents104(rgba, row, col) {
  const u = col / 29;
  if (row === 0) {
    // Blazing serrated Gungnir Mach-head & crimson-gold Valkyrie feather trails
    const tipX = 76 + Math.sin(u * Math.PI * 2) * 3;
    const cy = 52;
    for (let i = 0; i < 36; i++) {
      const t = i / 35;
      const x = tipX - t * 44;
      const spread = 1.5 + Math.pow(t, 0.8) * 12.5;
      const saw = Math.abs(((t * 7 + u * 4) % 1) * 2 - 1) * 2.5 * t;
      putPx104(rgba, x, cy - spread - saw, 254, 240, 138);
      putPx104(rgba, x, cy + spread + saw, 254, 240, 138);
      putPx104(rgba, x - 1, cy - spread - saw + 1, 251, 113, 133);
      putPx104(rgba, x - 1, cy + spread + saw - 1, 251, 113, 133);
      if (t < 0.55) {
        putPx104(rgba, x, cy, 255, 255, 255);
      }
    }
  } else if (row === 4 && col <= 22) {
    // Next-Gen crimson-gold serrated Valkyrie hit-scar cross
    const k = 1 - col / 23;
    const span = Math.round(28 * k);
    for (let d = -span; d <= span; d++) {
      const core = Math.abs(d) <= Math.round(9 * k);
      putPx104(
        rgba,
        52 + d,
        52 - Math.round(d * 0.48),
        core ? 255 : 254,
        core ? 255 : 240,
        core ? 255 : 138
      );
      putPx104(
        rgba,
        52 + Math.round(d * 0.42),
        52 + d,
        core ? 255 : 251,
        core ? 240 : 113,
        core ? 138 : 133
      );
    }
  }
}

function enforceSafeMarginAndBinaryAlpha104(rgba, w = 104, h = 104) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const distEdge = Math.min(x, y, w - 1 - x, h - 1 - y);
      const o = (y * w + x) * 4;
      let a = rgba[o + 3];
      if (distEdge < 2) {
        a = 0;
      } else if (distEdge < 7 && a > 0) {
        a = Math.round(a * ((distEdge - 1.5) / 5.5));
      }
      if (a >= 84) {
        rgba[o + 3] = 255;
      } else {
        rgba[o] = 0;
        rgba[o + 1] = 0;
        rgba[o + 2] = 0;
        rgba[o + 3] = 0;
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
      if (!srcRgba[so + 3]) continue;
      const tx = dstX + sx;
      const ty = dstY + sy;
      const to = (ty * dstW + tx) * 4;
      dstRgba[to] = srcRgba[so];
      dstRgba[to + 1] = srcRgba[so + 1];
      dstRgba[to + 2] = srcRgba[so + 2];
      dstRgba[to + 3] = 255;
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

function bakeValkyrieExVfx() {
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
    dbgRgba[i * 4] = 20;
    dbgRgba[i * 4 + 1] = 10;
    dbgRgba[i * 4 + 2] = 16;
    dbgRgba[i * 4 + 3] = 255;
  }

  const rowSpecs = [
    {
      name: 'Row 0: Wyvern Spiral Gungnir Crimson-Gold Lance-Wave',
      windowSec: 0.5,
      warmup: 0,
      def: VALKYRIE_EFFECT_REGISTRY.wyvernSpiralLanceCell,
      cfg: { x: 50, y: 52, length: 72, palette: VALKYRIE_CRIMSON_PALETTE, seed: 183 }
    },
    {
      name: 'Row 1: Descending Gungnir Sky-Lance (F00..F11) & Valhalla Rune Crater (F12..F29)',
      windowSec: 1.0,
      warmup: 0,
      def: VALKYRIE_EFFECT_REGISTRY.gungnirSkyLanceCell,
      cfg: { x: 52, y: 52, palette: VALKYRIE_CRIMSON_PALETTE, seed: 189 }
    },
    {
      name: 'Row 2: Erupting Dragonfire Ruby-Gold Obelisk Spire',
      windowSec: 1.0,
      warmup: 0.02,
      def: VALKYRIE_EFFECT_REGISTRY.dragonfireObeliskCell,
      cfg: { x: 52, y: 52, palette: VALKYRIE_CRIMSON_PALETTE, seed: 191 }
    },
    {
      name: 'Row 3: Colossal Bahamut / Valhalla Sovereign Winged Dragon Crest',
      windowSec: 1.0,
      warmup: 0,
      def: VALKYRIE_EFFECT_REGISTRY.bahamutAvatarCell,
      cfg: { x: 52, y: 52, palette: VALKYRIE_CRIMSON_PALETTE, seed: 197 }
    },
    {
      name: 'Row 4: Valhalla Dragonfire Serrated Crescent Slash & Starburst',
      windowSec: 0.4,
      warmup: 0.01,
      def: VALKYRIE_EFFECT_REGISTRY.valhallaCrescentSlashCell,
      cfg: { x: 34, y: 52, radius: 34, palette: VALKYRIE_CRIMSON_PALETTE, seed: 201 }
    },
    {
      name: 'Row 5: Bifrost Einherjar Target Seal',
      windowSec: 1.0,
      warmup: 0,
      def: VALKYRIE_EFFECT_REGISTRY.bifrostEinherjarSealCell,
      cfg: { x: 52, y: 52, palette: VALKYRIE_CRIMSON_PALETTE, seed: 209 }
    },
    {
      name: 'Row 6: Colossal Einherjar Sky-Lance',
      windowSec: 1.0,
      warmup: 0,
      def: VALKYRIE_EFFECT_REGISTRY.einherjarSkyLanceCell,
      cfg: { x: 52, y: 52, palette: VALKYRIE_CRIMSON_PALETTE, seed: 213 }
    },
    {
      name: 'Row 7: Gungnir Ragnarok Dragon-Pillar',
      windowSec: 1.0,
      warmup: 0,
      def: VALKYRIE_EFFECT_REGISTRY.gungnirRagnarokPillarCell,
      cfg: { x: 52, y: 52, palette: VALKYRIE_CRIMSON_PALETTE, seed: 227 }
    }
  ];

  const surface104 = createPixelSurface(LOGICAL, LOGICAL);
  const pen104 = new ShaderPen(surface104);
  const cell104 = new Uint8Array(LOGICAL * LOGICAL * 4);
  const cell208 = new Uint8Array(CELL * CELL * 4);
  let borderClips = 0;

  for (let r = 0; r < ROWS; r++) {
    const spec = rowSpecs[r];
    const dt = spec.windowSec / COLS;
    const inst = instantiateShaderEffect(spec.def, spec.cfg);
    if (spec.warmup > 0) inst.step(spec.warmup);

    for (let c = 0; c < COLS; c++) {
      clearPixelSurface(surface104);
      inst.render(pen104, 'back');
      inst.render(pen104, 'front');
      resolveSurfaceToRGBA(surface104, cell104, 1.15);
      addNextGenValkyrieAccents104(cell104, r, c);
      enforceSafeMarginAndBinaryAlpha104(cell104, LOGICAL, LOGICAL);

      cell208.fill(0);
      blitUpscaledNearest(cell104, LOGICAL, LOGICAL, 2, cell208, CELL, 0, 0);
      if (has4pxBorderClip208(cell208, CELL, 4)) borderClips++;

      blitUpscaledNearest(cell104, LOGICAL, LOGICAL, 2, sheetRgba, sheetW, c * CELL, r * CELL);

      const dx = dbgPad + c * (LOGICAL + dbgPad);
      const dy = dbgPad + r * (LOGICAL + dbgPad);
      alphaCompositeOnto(cell104, LOGICAL, LOGICAL, dbgRgba, dbgW, dx, dy);

      inst.step(dt);
    }
  }

  const outSheetPath = path.join(REPO_ROOT, 'assets', 'sprites', 'valkyrie_ex_vfx.png');
  fs.writeFileSync(outSheetPath, encodeRgbaPng(sheetW, sheetH, sheetRgba));

  fs.mkdirSync(SCRATCH_DIR, { recursive: true });
  const outDbgPath = path.join(SCRATCH_DIR, 'debug_valkyrie_ex_vfx.png');
  fs.writeFileSync(outDbgPath, encodeRgbaPng(dbgW, dbgH, dbgRgba));

  console.log(
    `[valkyrie_ex_vfx] Wrote ${outSheetPath} (${sheetW}x${sheetH}) & ${outDbgPath} | borderClips=${borderClips}/240`
  );
  if (borderClips > 0) process.exitCode = 1;
}

bakeValkyrieExVfx();
