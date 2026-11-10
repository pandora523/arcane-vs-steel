#!/usr/bin/env node
/**
 * First-Party 30fps VFX Sprite Sheet Builder for Seraphina (`priestess`).
 * Powered natively by `src/engine/ArcaneShaderFX.js` + `src/engine/shaders/seraphicShaders.js`.
 *
 * Outputs:
 *   1. `assets/sprites/priestess_vfx.png` (6240x1664, 8 rows x 30 cols @ 208x208, 0/240 border clips)
 *   2. `<artifactDir>/debug_priestess_30fps_vfx.png` (8x30 contact sheet for visual verification)
 *   3. `<artifactDir>/debug_seraphina_ult_208_closeup.png` (208x208 closeup + welded Lux beam preview)
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
  SERAPHIC_GOLD_PALETTE,
  SERAPHIC_EFFECT_REGISTRY
} from '../src/engine/shaders/seraphicShaders.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const ARTIFACT_DIR =
  '/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/3a4b2cf8-05c2-45a3-bb65-af6f5b5a1088';

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
    dbgRgba[i * 4] = 14;
    dbgRgba[i * 4 + 1] = 16;
    dbgRgba[i * 4 + 2] = 28;
    dbgRgba[i * 4 + 3] = 255;
  }

  const rowSpecs = [
    {
      name: 'Row 0: Sacred Star-Cross Chakram Orb (F00..F29)',
      windowSec: 1.0,
      layers: [
        {
          def: SERAPHIC_EFFECT_REGISTRY.sacredStarOrbCell,
          warmup: 0,
          cfg: { x: 52, y: 52, palette: SERAPHIC_GOLD_PALETTE }
        }
      ]
    },
    {
      name: 'Row 1: Descending Holy Valkyrie Spear (F00..F11) & Cathedral Star Geyser (F12..F29)',
      windowSec: 1.0,
      layers: [
        {
          def: SERAPHIC_EFFECT_REGISTRY.holyValkyrieSpearCell,
          warmup: 0,
          cfg: { x: 52, y: 52, palette: SERAPHIC_GOLD_PALETTE }
        }
      ]
    },
    {
      name: 'Row 2: 7-Spire Gothic Stained-Glass Cathedral Sanctum Pillar (F00..F29)',
      windowSec: 1.0,
      layers: [
        {
          def: SERAPHIC_EFFECT_REGISTRY.cathedralLightPillarCell,
          warmup: 0.02,
          cfg: { x: 52, y: 52, palette: SERAPHIC_GOLD_PALETTE }
        }
      ]
    },
    {
      name: 'Row 3: Grand Stained-Glass Cathedral Rose Window Mandala (F00..F29)',
      windowSec: 1.0,
      layers: [
        {
          def: SERAPHIC_EFFECT_REGISTRY.stainedGlassRoseMandalaCell,
          warmup: 0,
          cfg: { x: 52, y: 52, palette: SERAPHIC_GOLD_PALETTE }
        }
      ]
    },
    {
      name: 'Row 4: Sacred Star-Cross Crescent Slash & Feather Shatter (F00..F29)',
      windowSec: 1.0,
      layers: [
        {
          def: SERAPHIC_EFFECT_REGISTRY.sacredStarCrescentCell,
          warmup: 0.02,
          cfg: { x: 52, y: 52, palette: SERAPHIC_GOLD_PALETTE }
        }
      ]
    },
    {
      name: 'Row 5: Final Grace Prismatic Sunburst Scepter Charge Core (F00..F29)',
      windowSec: 1.0,
      layers: [
        {
          def: SERAPHIC_EFFECT_REGISTRY.finalGraceChargeSphereCell,
          warmup: 0,
          cfg: { x: 52, y: 52, palette: SERAPHIC_GOLD_PALETTE }
        }
      ]
    },
    {
      name: 'Row 6: Final Grace Prismatic Focusing Cannon Muzzle (F00..F29)',
      windowSec: 1.0,
      layers: [
        {
          def: SERAPHIC_EFFECT_REGISTRY.finalGraceMuzzlePrismCell,
          warmup: 0.02,
          cfg: { x: 52, y: 52, palette: SERAPHIC_GOLD_PALETTE }
        }
      ]
    },
    {
      name: 'Row 7: Final Grace Straight Horizontal Pixel-Art Beam Segment (F00..F29)',
      windowSec: 1.0,
      layers: [
        {
          def: SERAPHIC_EFFECT_REGISTRY.finalGraceHorizonBeamCell,
          warmup: 0.02,
          cfg: { x: 52, y: 52, palette: SERAPHIC_GOLD_PALETTE }
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
      for (const inst of instances) {
        inst.render(pen, 'back');
      }
      for (const inst of instances) {
        inst.render(pen, 'front');
      }
      resolveSurfaceToRGBA(surface, cellRgba, 1.1);
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
          dbgRgba[o] = isEdge ? 68 : 20;
          dbgRgba[o + 1] = isEdge ? 58 : 26;
          dbgRgba[o + 2] = isEdge ? 26 : 36;
          dbgRgba[o + 3] = 255;
        }
      }
      alphaCompositeOnto(cellRgba, LOGICAL, LOGICAL, dbgRgba, dbgW, dx, dy);

      for (const inst of instances) {
        inst.step(dt);
      }
    }
    console.log(`[priestess-vfx] Baked ${spec.name} (30 frames)`);
  }

  const outVfxPath = path.join(REPO_ROOT, 'assets', 'sprites', 'priestess_vfx.png');
  fs.writeFileSync(outVfxPath, encodeRgbaPng(sheetW, sheetH, sheetRgba));
  console.log(`[priestess-vfx] Wrote ${outVfxPath} (${sheetW}x${sheetH}), borderClips=${borderClips}/${ROWS * COLS}`);

  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const outDbgPath = path.join(ARTIFACT_DIR, 'debug_priestess_30fps_vfx.png');
  fs.writeFileSync(outDbgPath, encodeRgbaPng(dbgW, dbgH, dbgRgba));
  console.log(`[priestess-vfx] Wrote contact sheet -> ${outDbgPath}`);

  // Also bake a 1:1 208x208 closeup + welded horizontal Lux beam preview (`debug_seraphina_ult_208_closeup.png`)
  const closeW = 1140;
  const closeH = 720;
  const closeRgba = new Uint8Array(closeW * closeH * 4);
  for (let i = 0; i < closeW * closeH; i++) {
    closeRgba[i * 4] = 12;
    closeRgba[i * 4 + 1] = 15;
    closeRgba[i * 4 + 2] = 28;
    closeRgba[i * 4 + 3] = 255;
  }
  const extractCell208 = (r, c) => {
    const out = new Uint8Array(CELL * CELL * 4);
    for (let yy = 0; yy < CELL; yy++) {
      const srcOff = ((r * CELL + yy) * sheetW + c * CELL) * 4;
      out.set(sheetRgba.subarray(srcOff, srcOff + CELL * 4), yy * CELL * 4);
    }
    return out;
  };
  // Top strip: Row 5 F04, F14; Row 6 F08; Row 7 F08, F16
  const sampleSpecs = [
    [5, 4],
    [5, 14],
    [6, 8],
    [7, 8],
    [7, 16]
  ];
  sampleSpecs.forEach(([r, c], idx) => {
    const cellBuf = extractCell208(r, c);
    alphaCompositeOnto(cellBuf, CELL, CELL, closeRgba, closeW, 20 + idx * 222, 24);
  });
  // Bottom strip: Welded Full-Stage Horizontal Final Grace Beam (`Row 6` F10 Muzzle + 6x synchronized `Row 7` F10 Beam Segments at 148px step!)
  const muzzleBuf = extractCell208(6, 10);
  const segBuf = extractCell208(7, 10);
  for (let seg = 0; seg < 6; seg++) {
    alphaCompositeOnto(segBuf, CELL, CELL, closeRgba, closeW, 110 + seg * 148, 360);
  }
  alphaCompositeOnto(muzzleBuf, CELL, CELL, closeRgba, closeW, 28, 360);

  const outClosePath = path.join(ARTIFACT_DIR, 'debug_seraphina_ult_208_closeup.png');
  fs.writeFileSync(outClosePath, encodeRgbaPng(closeW, closeH, closeRgba));
  console.log(`[priestess-vfx] Wrote closeup welded beam preview -> ${outClosePath}`);
}

bakeVfxSheet();

