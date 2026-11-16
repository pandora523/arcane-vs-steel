#!/usr/bin/env node
/**
 * Next-Gen 30fps 8-Row VFX Sprite Sheet Builder for LYRA EX (`icemage_ex` -> `IceMageEx.js`).
 * Powered natively by `src/engine/ArcaneShaderFX.js` + read-only `src/engine/shaders/glacialShaders.js`
 * (`GLACIAL_CRYO_PALETTE` & `BOREALIS_PRISM_PALETTE`) with radial/elliptical distance taper
 * and soft margin alpha (`0` R2/R6 flat box cuts, `0/240` border clips).
 *
 * Outputs:
 *   1. `assets/sprites/icemage_ex_vfx.png` (6240x1664, 8 rows x 30 cols @ 208x208, 0/240 border clips)
 *   2. `<scratch>/debug_icemage_ex_vfx.png` (8x30 contact sheet for visual verification)
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
  instantiateShaderEffect,
  smoothStep
} from '../src/engine/ArcaneShaderFX.js';

import {
  GLACIAL_CRYO_PALETTE,
  BOREALIS_PRISM_PALETTE,
  GLACIAL_EFFECT_REGISTRY
} from '../src/engine/shaders/glacialShaders.js';

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

/**
 * Smooth radial / elliptical distance taper eliminating R2/R6 monolith shadeBox edges and square halo corners!
 */
function applyRowSoftEnvelope104(rgba, row, w = 104, h = 104) {
  for (let y = 0; y < h; y++) {
    const dy = y - 52;
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      const a = rgba[o + 3];
      if (!a) continue;
      const dx = x - 52;
      let env = 1.0;
      if (row === 2 || row === 4 || row === 6) {
        // Faceted Glacier Monolith, Coronation Ice-Sword & Zero-Kelvin Diamond Monolith: elliptical taper!
        const rEllip = Math.hypot(dx * 1.12, dy * 0.98);
        env = smoothStep(43, 29, rEllip) * smoothStep(42, 28, Math.abs(dy));
      } else if (row === 0) {
        const rEllip = Math.hypot(dx * 0.92, dy * 1.15);
        env = smoothStep(46, 33, rEllip);
      } else if (row === 3) {
        const r = Math.hypot(dx, dy);
        env = smoothStep(35, 24, r);
      } else {
        // Row 1 Chakram, Row 5 Aurora Sovereign Mandala, Row 7 Diamond Starburst
        const r = Math.hypot(dx, dy);
        env = smoothStep(42, 29, r);
      }
      const outA = Math.round(a * env);
      if (outA <= 2) {
        rgba[o] = 0;
        rgba[o + 1] = 0;
        rgba[o + 2] = 0;
        rgba[o + 3] = 0;
      } else {
        rgba[o + 3] = outA;
      }
    }
  }
}

function enforceSafeCellMargin104(rgba, w = 104, h = 104) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const distEdge = Math.min(x, y, w - 1 - x, h - 1 - y);
      const o = (y * w + x) * 4;
      if (distEdge < 2) {
        rgba[o] = 0;
        rgba[o + 1] = 0;
        rgba[o + 2] = 0;
        rgba[o + 3] = 0;
      } else if (distEdge < 8 && rgba[o + 3] > 0) {
        const k = (distEdge - 1.5) / 6.5;
        rgba[o + 3] = Math.round(rgba[o + 3] * k);
        if (rgba[o + 3] <= 2) {
          rgba[o] = 0;
          rgba[o + 1] = 0;
          rgba[o + 2] = 0;
          rgba[o + 3] = 0;
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

function bakeIceMageExVfxSheet() {
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

  const rowSpecs = [
    {
      name: 'Row 0: Faceted Borealis Cryo-Lance Comet (F00..F29)',
      windowSec: 1.0,
      warmup: 0.1,
      def: GLACIAL_EFFECT_REGISTRY.cryoShardBoltCell,
      cfg: { x: 52, y: 52, palette: GLACIAL_CRYO_PALETTE }
    },
    {
      name: 'Row 1: Spinning 6-Bladed Borealis Snowflake Chakram Halo (F00..F29)',
      windowSec: 1.0,
      warmup: 0,
      def: GLACIAL_EFFECT_REGISTRY.hexCryoPrismMirrorCell,
      cfg: { x: 52, y: 52, palette: BOREALIS_PRISM_PALETTE }
    },
    {
      name: 'Row 2: Erupting Refractive Borealis Glacier Prism Monolith (F00..F29)',
      windowSec: 1.0,
      warmup: 0,
      def: GLACIAL_EFFECT_REGISTRY.facetedGlacierMonolithCell,
      cfg: { x: 52, y: 52, palette: GLACIAL_CRYO_PALETTE }
    },
    {
      name: 'Row 3: Stained-Glass Borealis Rose Permafrost Lotus Crest (F00..F29)',
      windowSec: 1.0,
      warmup: 0,
      def: GLACIAL_EFFECT_REGISTRY.borealisRoseMandalaCell,
      cfg: { x: 52, y: 52, palette: BOREALIS_PRISM_PALETTE }
    },
    {
      name: 'Row 4: Giant Celestial Coronation Ice-Claymore (F00..F29)',
      windowSec: 1.0,
      warmup: 0,
      def: GLACIAL_EFFECT_REGISTRY.celestialIceSwordCell,
      cfg: { x: 52, y: 52, palette: GLACIAL_CRYO_PALETTE }
    },
    {
      name: 'Row 5: Aurora Borealis Sovereign Snowflake Mandala (F00..F29)',
      windowSec: 1.0,
      warmup: 0,
      def: GLACIAL_EFFECT_REGISTRY.auroraSovereignMandalaCell,
      cfg: { x: 52, y: 52, palette: BOREALIS_PRISM_PALETTE }
    },
    {
      name: 'Row 6: Zero-Kelvin Refractive Diamond-Coffin Monolith (F00..F29)',
      windowSec: 1.0,
      warmup: 0,
      def: GLACIAL_EFFECT_REGISTRY.diamondCoffinMonolithCell,
      cfg: { x: 52, y: 52, palette: GLACIAL_CRYO_PALETTE }
    },
    {
      name: 'Row 7: Diamond Dust Borealis Starburst Shatter (F00..F29)',
      windowSec: 1.0,
      warmup: 0,
      def: GLACIAL_EFFECT_REGISTRY.diamondDustStarburstCell,
      cfg: { x: 52, y: 52, palette: BOREALIS_PRISM_PALETTE }
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
      resolveSurfaceToRGBA(surface104, cell104, 1.18);
      applyRowSoftEnvelope104(cell104, r, LOGICAL, LOGICAL);
      enforceSafeCellMargin104(cell104, LOGICAL, LOGICAL);

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
          dbgRgba[o] = isEdge ? 26 : 11;
          dbgRgba[o + 1] = isEdge ? 68 : 18;
          dbgRgba[o + 2] = isEdge ? 98 : 34;
          dbgRgba[o + 3] = 255;
        }
      }
      alphaCompositeOnto(cell104, LOGICAL, LOGICAL, dbgRgba, dbgW, dx, dy);

      inst.step(dt);
    }
    console.log(`[icemage_ex_vfx] Baked ${spec.name} (30 frames)`);
  }

  const outVfxPath = path.join(REPO_ROOT, 'assets', 'sprites', 'icemage_ex_vfx.png');
  fs.writeFileSync(outVfxPath, encodeRgbaPng(sheetW, sheetH, sheetRgba));

  fs.mkdirSync(SCRATCH_DIR, { recursive: true });
  const outDbgPath = path.join(SCRATCH_DIR, 'debug_icemage_ex_vfx.png');
  fs.writeFileSync(outDbgPath, encodeRgbaPng(dbgW, dbgH, dbgRgba));

  console.log(
    `[icemage_ex_vfx] Wrote ${outVfxPath} (${sheetW}x${sheetH}) & ${outDbgPath} | borderClips=${borderClips}/240`
  );
  if (borderClips > 0) process.exitCode = 1;
}

bakeIceMageExVfxSheet();
