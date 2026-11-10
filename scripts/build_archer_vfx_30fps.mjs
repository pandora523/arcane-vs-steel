#!/usr/bin/env node
/**
 * First-Party 30fps 8-Row VFX Sprite Sheet Builder for Sylvara v3 (`archer`).
 * Powered natively by `src/engine/ArcaneShaderFX.js` + `src/engine/shaders/sylvanShaders.js`.
 *
 * Outputs:
 *   1. `assets/sprites/archer_vfx.png` (6240x1664, 8 rows x 30 cols @ 208x208, 0/240 border clips)
 *   2. `<artifactDir>/debug_archer_30fps_vfx.png` (8x30 contact sheet for visual verification)
 *   3. `<artifactDir>/debug_archer_ult_208_closeup.png` (Rows 5..7 208x208 Supreme Ultimate closeup)
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
} from '../src/engine/ArcaneShaderFX.js?v=30fps62';

import {
  SYLVAN_EMERALD_PALETTE,
  SYLVAN_STARLIGHT_PALETTE,
  SYLVAN_EFFECT_REGISTRY
} from '../src/engine/shaders/sylvanShaders.js?v=30fps62';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const ARTIFACT_DIR =
  '/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/3a4b2cf8-05c2-45a3-bb65-af6f5b5a1088';

// ============================================================================
// Self-Contained Pure Node RGBA PNG Encoder (CRC32 + zlib deflate)
// ============================================================================
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
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const compressed = zlib.deflateSync(raw, { level: 6 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    makePngChunk('IHDR', ihdr),
    makePngChunk('IDAT', compressed),
    makePngChunk('IEND', Buffer.alloc(0))
  ]);
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
      } else if (distEdge < 7 && rgba[o + 3] > 0) {
        const k = (distEdge - 1.5) / 5.5;
        rgba[o + 3] = Math.round(rgba[o + 3] * k);
      }
    }
  }
}

function has4pxBorderClip208(rgba208, cell = 208, margin = 4) {
  for (let y = 0; y < cell; y++) {
    for (let x = 0; x < cell; x++) {
      if (x >= margin && x < cell - margin && y >= margin && y < cell - margin) continue;
      if (rgba208[(y * cell + x) * 4 + 3] > 0) return true;
    }
  }
  return false;
}

function blitUpscaledNearest(srcRgba, srcW, srcH, scale, dstRgba, dstW, dstX, dstY) {
  for (let sy = 0; sy < srcH; sy++) {
    for (let sx = 0; sx < srcW; sx++) {
      const so = (sy * srcW + sx) * 4;
      const r = srcRgba[so];
      const g = srcRgba[so + 1];
      const b = srcRgba[so + 2];
      const a = srcRgba[so + 3];
      if (!a) continue;
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
    dbgRgba[i * 4] = 10;
    dbgRgba[i * 4 + 1] = 20;
    dbgRgba[i * 4 + 2] = 22;
    dbgRgba[i * 4 + 3] = 255;
  }

  const sampleCols = [0, 6, 12, 18, 24, 29];
  const closePad = 8;
  const closeW = sampleCols.length * (CELL + closePad) + closePad;
  const closeH = 3 * (CELL + closePad) + closePad;
  const closeRgba = new Uint8Array(closeW * closeH * 4);
  for (let i = 0; i < closeW * closeH; i++) {
    closeRgba[i * 4] = 12;
    closeRgba[i * 4 + 1] = 24;
    closeRgba[i * 4 + 2] = 24;
    closeRgba[i * 4 + 3] = 255;
  }

  const rowSpecs = [
    {
      name: 'Row 0: Piercing Emerald Wind-Arrow (F00..F29)',
      windowSec: 0.50,
      def: SYLVAN_EFFECT_REGISTRY.sylvanSupersonicArrowLoop,
      cfg: { x: 52, y: 52, length: 70, palette: SYLVAN_EMERALD_PALETTE, seed: 83 }
    },
    {
      name: 'Row 1: Homing Starfall Seeker Arrow (F00..F29)',
      windowSec: 1.00,
      def: SYLVAN_EFFECT_REGISTRY.starfallSeekerArrowCell,
      cfg: { x: 52, y: 52, palette: SYLVAN_STARLIGHT_PALETTE, seed: 109 }
    },
    {
      name: 'Row 2: Verdant Bramble-Star Snare Sigil (F00..F29)',
      windowSec: 1.00,
      def: SYLVAN_EFFECT_REGISTRY.verdantBrambleSnareCell,
      cfg: { x: 52, y: 52, palette: SYLVAN_EMERALD_PALETTE, seed: 127 }
    },
    {
      name: 'Row 3: Tempest Wind-Dragon Vortex (F00..F29)',
      windowSec: 1.00,
      def: SYLVAN_EFFECT_REGISTRY.tempestWindDragonVortexCell,
      cfg: { x: 52, y: 55, palette: SYLVAN_EMERALD_PALETTE, seed: 137 }
    },
    {
      name: 'Row 4: Emerald Star-Cross Impact Burst (F00..F29)',
      windowSec: 1.00,
      def: SYLVAN_EFFECT_REGISTRY.emeraldStarCrossBurstCell,
      cfg: { x: 52, y: 52, palette: SYLVAN_EMERALD_PALETTE, seed: 149 }
    },
    {
      name: 'Row 5: Yggdrasil World-Tree & Sagittarius Constellation Canopy Seal (F00..F29)',
      windowSec: 1.00,
      def: SYLVAN_EFFECT_REGISTRY.yggdrasilConstellationSealCell,
      cfg: { x: 52, y: 52, palette: SYLVAN_EMERALD_PALETTE, seed: 163 }
    },
    {
      name: 'Row 6: Colossal Drawn Golden-Emerald Celestial Greatbow Muzzle (F00..F29)',
      windowSec: 1.00,
      def: SYLVAN_EFFECT_REGISTRY.colossalCelestialGreatbowCell,
      cfg: { x: 52, y: 52, palette: SYLVAN_STARLIGHT_PALETTE, seed: 179 }
    },
    {
      name: 'Row 7: World-Piercing Supernova Dragon-Arrow Beam Segment (F00..F29)',
      windowSec: 1.00,
      def: SYLVAN_EFFECT_REGISTRY.supernovaDragonBeamSegmentCell,
      cfg: { x: 52, y: 52, palette: SYLVAN_EMERALD_PALETTE, seed: 193 }
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

    for (let c = 0; c < COLS; c++) {
      clearPixelSurface(surface104);
      inst.render(pen104, 'back');
      inst.render(pen104, 'front');
      resolveSurfaceToRGBA(surface104, cell104, 1.12);
      enforceSafeCellMargin104(cell104, LOGICAL, LOGICAL);

      cell208.fill(0);
      blitUpscaledNearest(cell104, LOGICAL, LOGICAL, 2, cell208, CELL, 0, 0);

      if (has4pxBorderClip208(cell208, CELL, 4)) {
        borderClips++;
      }

      blitUpscaledNearest(cell104, LOGICAL, LOGICAL, 2, sheetRgba, sheetW, c * CELL, r * CELL);

      const dx = dbgPad + c * (LOGICAL + dbgPad);
      const dy = dbgPad + r * (LOGICAL + dbgPad);
      for (let yy = 0; yy < LOGICAL; yy++) {
        for (let xx = 0; xx < LOGICAL; xx++) {
          const isEdge = xx === 0 || yy === 0 || xx === LOGICAL - 1 || yy === LOGICAL - 1;
          const o = ((dy + yy) * dbgW + (dx + xx)) * 4;
          dbgRgba[o] = isEdge ? 28 : 14;
          dbgRgba[o + 1] = isEdge ? 64 : 26;
          dbgRgba[o + 2] = isEdge ? 54 : 28;
          dbgRgba[o + 3] = 255;
        }
      }
      alphaCompositeOnto(cell104, LOGICAL, LOGICAL, dbgRgba, dbgW, dx, dy);

      const sIdx = sampleCols.indexOf(c);
      if (sIdx !== -1 && r >= 5) {
        const cx = closePad + sIdx * (CELL + closePad);
        const cy = closePad + (r - 5) * (CELL + closePad);
        alphaCompositeOnto(cell208, CELL, CELL, closeRgba, closeW, cx, cy);
      }

      inst.step(dt);
    }
    console.log(`[archer-vfx] Baked ${spec.name} (30 frames)`);
  }

  const outVfxPath = path.join(REPO_ROOT, 'assets', 'sprites', 'archer_vfx.png');
  fs.writeFileSync(outVfxPath, encodeRgbaPng(sheetW, sheetH, sheetRgba));

  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const outDbgPath = path.join(ARTIFACT_DIR, 'debug_archer_30fps_vfx.png');
  const outClosePath = path.join(ARTIFACT_DIR, 'debug_archer_ult_208_closeup.png');
  fs.writeFileSync(outDbgPath, encodeRgbaPng(dbgW, dbgH, dbgRgba));
  fs.writeFileSync(outClosePath, encodeRgbaPng(closeW, closeH, closeRgba));

  console.log(
    `[archer-vfx] Wrote ${outVfxPath} (${sheetW}x${sheetH}), ${outDbgPath} (${dbgW}x${dbgH}), ${outClosePath} (${closeW}x${closeH}) | borderClips=${borderClips}/240`
  );
  if (borderClips > 0) {
    process.exitCode = 1;
  }
}

bakeVfxSheet();
