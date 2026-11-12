#!/usr/bin/env node
/**
 * First-Party 30fps 8-Row VFX Sprite Sheet Builder for Lyra (`icemage` / `IceMage.js`).
 * Powered natively by `src/engine/ArcaneShaderFX.js` + `src/engine/shaders/glacialShaders.js`.
 *
 * Outputs:
 *   1. `assets/sprites/icemage_vfx.png` (6240x1664, 8 rows x 30 cols @ 208x208, 0/240 border clips)
 *   2. `<artifactDir>/debug_icemage_30fps_vfx.png` (8x30 contact sheet for visual verification)
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
} from '../src/engine/ArcaneShaderFX.js?v=30fps73';

import {
  GLACIAL_CRYO_PALETTE,
  GLACIAL_EFFECT_REGISTRY
} from '../src/engine/shaders/glacialShaders.js?v=30fps73';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const ARTIFACT_DIR =
  '/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/b9d8130e-8764-4ace-8d4e-40f97049d6f1';

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
      } else if (distEdge < 6 && rgba[o + 3] > 0) {
        const k = (distEdge - 1.5) / 4.5;
        rgba[o + 3] = Math.round(rgba[o + 3] * k);
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

function bakeVfxSheet() {
  const ROWS = 8;
  const COLS = 30;
  const LOGICAL = 104;
  const CELL = 208;
  const TOTAL_CELLS = ROWS * COLS;
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
      layers: [
        {
          def: GLACIAL_EFFECT_REGISTRY.cryoShardBoltCell,
          warmup: 0.1,
          cfg: { x: 52, y: 52, palette: GLACIAL_CRYO_PALETTE }
        }
      ]
    },
    {
      name: 'Row 1: Spinning 6-Bladed Snowflake Chakram Halo (F00..F29)',
      windowSec: 1.0,
      layers: [
        {
          def: GLACIAL_EFFECT_REGISTRY.hexCryoPrismMirrorCell,
          warmup: 0,
          cfg: { x: 52, y: 52, palette: GLACIAL_CRYO_PALETTE }
        }
      ]
    },
    {
      name: 'Row 2: Erupting Jagged Glacier Iceberg Wall (F00..F21) & Shatter (F22..F29)',
      windowSec: 1.0,
      layers: [
        {
          def: GLACIAL_EFFECT_REGISTRY.facetedGlacierMonolithCell,
          warmup: 0,
          cfg: { x: 52, y: 52, palette: GLACIAL_CRYO_PALETTE }
        }
      ]
    },
    {
      name: 'Row 3: Stained-Glass Winter Palace Sovereign Crest (F00..F29)',
      windowSec: 1.0,
      layers: [
        {
          def: GLACIAL_EFFECT_REGISTRY.borealisRoseMandalaCell,
          warmup: 0,
          cfg: { x: 52, y: 52, palette: GLACIAL_CRYO_PALETTE }
        }
      ]
    },
    {
      name: 'Row 4: Giant Celestial Coronation Ice-Claymore (F00..F29)',
      windowSec: 1.0,
      layers: [
        {
          def: GLACIAL_EFFECT_REGISTRY.celestialIceSwordCell,
          warmup: 0,
          cfg: { x: 52, y: 52, palette: GLACIAL_CRYO_PALETTE }
        }
      ]
    },
    {
      name: 'Row 5: Aurora Borealis Sovereign Snowflake Mandala (F00..F29)',
      windowSec: 1.0,
      layers: [
        {
          def: GLACIAL_EFFECT_REGISTRY.auroraSovereignMandalaCell,
          warmup: 0,
          cfg: { x: 52, y: 52, palette: GLACIAL_CRYO_PALETTE }
        }
      ]
    },
    {
      name: 'Row 6: Absolute Zero Crystalline Diamond-Coffin Monolith (F00..F29)',
      windowSec: 1.0,
      layers: [
        {
          def: GLACIAL_EFFECT_REGISTRY.diamondCoffinMonolithCell,
          warmup: 0,
          cfg: { x: 52, y: 52, palette: GLACIAL_CRYO_PALETTE }
        }
      ]
    },
    {
      name: 'Row 7: Diamond Dust Prismatic Starburst Shatter (F00..F29)',
      windowSec: 1.0,
      layers: [
        {
          def: GLACIAL_EFFECT_REGISTRY.diamondDustStarburstCell,
          warmup: 0,
          cfg: { x: 52, y: 52, palette: GLACIAL_CRYO_PALETTE }
        }
      ]
    }
  ];

  const surface = createPixelSurface(LOGICAL, LOGICAL);
  const pen = new ShaderPen(surface);
  const cellRgba = new Uint8Array(LOGICAL * LOGICAL * 4);
  let borderClips = 0;

  for (let r = 0; r < ROWS; r++) {
    const spec = rowSpecs[r];
    const dt = spec.windowSec / COLS;
    const instances = spec.layers.map((l) => {
      const inst = instantiateShaderEffect(l.def, l.cfg);
      if (l.warmup > 0) inst.step(l.warmup);
      return inst;
    });

    for (let c = 0; c < COLS; c++) {
      clearPixelSurface(surface);
      for (const inst of instances) inst.render(pen, 'back');
      for (const inst of instances) inst.render(pen, 'front');
      resolveSurfaceToRGBA(surface, cellRgba, 1.12);
      enforceSafeCellMargin104(cellRgba, LOGICAL, LOGICAL);

      for (let i = 0; i < LOGICAL; i++) {
        if (
          cellRgba[(0 * LOGICAL + i) * 4 + 3] > 0 ||
          cellRgba[((LOGICAL - 1) * LOGICAL + i) * 4 + 3] > 0 ||
          cellRgba[(i * LOGICAL + 0) * 4 + 3] > 0 ||
          cellRgba[(i * LOGICAL + (LOGICAL - 1)) * 4 + 3] > 0
        ) {
          borderClips++;
          break;
        }
      }

      blitUpscaledNearest(cellRgba, LOGICAL, LOGICAL, 2, sheetRgba, sheetW, c * CELL, r * CELL);

      const dx = dbgPad + c * (LOGICAL + dbgPad);
      const dy = dbgPad + r * (LOGICAL + dbgPad);
      for (let yy = 0; yy < LOGICAL; yy++) {
        for (let xx = 0; xx < LOGICAL; xx++) {
          const isEdge = xx === 0 || yy === 0 || xx === LOGICAL - 1 || yy === LOGICAL - 1;
          const o = ((dy + yy) * dbgW + (dx + xx)) * 4;
          dbgRgba[o] = isEdge ? 24 : 11;
          dbgRgba[o + 1] = isEdge ? 64 : 18;
          dbgRgba[o + 2] = isEdge ? 92 : 34;
          dbgRgba[o + 3] = 255;
        }
      }
      alphaCompositeOnto(cellRgba, LOGICAL, LOGICAL, dbgRgba, dbgW, dx, dy);

      for (const inst of instances) inst.step(dt);
    }
    console.log(`[icemage-vfx] Baked ${spec.name} (30 frames)`);
  }

  const outVfxPath = path.join(REPO_ROOT, 'assets', 'sprites', 'icemage_vfx.png');
  fs.writeFileSync(outVfxPath, encodeRgbaPng(sheetW, sheetH, sheetRgba));
  console.log(
    `[icemage-vfx] Wrote ${outVfxPath} (${sheetW}x${sheetH}), borderClips=${borderClips}/${TOTAL_CELLS}`
  );
  if (borderClips !== 0) {
    throw new Error(`Expected 0 borderClips on icemage_vfx.png, got ${borderClips}`);
  }

  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const outDbgPath = path.join(ARTIFACT_DIR, 'debug_icemage_30fps_vfx.png');
  fs.writeFileSync(outDbgPath, encodeRgbaPng(dbgW, dbgH, dbgRgba));
  console.log(`[icemage-vfx] Wrote contact sheet -> ${outDbgPath}`);
}

bakeVfxSheet();
