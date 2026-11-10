#!/usr/bin/env node
/**
 * First-Party 30fps VFX Sprite Sheet Builder for Ignis Sol (`mage` / `FireMage.js`).
 * Powered natively by `src/engine/ArcaneShaderFX.js` + `src/engine/shaders/solarShaders.js`.
 *
 * Outputs:
 *   1. `assets/sprites/mage_vfx.png` (6240x1040, 5 rows x 30 cols @ 208x208, 0/150 border clips)
 *   2. `<artifactDir>/debug_mage_30fps_vfx.png` (5x30 contact sheet for visual verification)
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
} from '../src/engine/ArcaneShaderFX.js?v=30fps60';

import {
  SOLAR_CORONA_PALETTE,
  ECLIPSE_ABYSS_PALETTE,
  SOLAR_EFFECT_REGISTRY
} from '../src/engine/shaders/solarShaders.js?v=30fps60';

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

/**
 * 100% Circular Radial Margin for native `208x208` Supreme Ultimate cells (`Rows 5, 6, 7`)
 * — NEVER carves a square/rectangular alpha box!
 */
function enforceCircularCellMargin208(rgba, w = 208, h = 208) {
  const cx = (w - 1) * 0.5;
  const cy = (h - 1) * 0.5;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      if (x < 2 || y < 2 || x >= w - 2 || y >= h - 2) {
        rgba[o] = 0;
        rgba[o + 1] = 0;
        rgba[o + 2] = 0;
        rgba[o + 3] = 0;
        continue;
      }
      const r = Math.hypot(x - cx, y - cy);
      if (r >= 100) {
        rgba[o] = 0;
        rgba[o + 1] = 0;
        rgba[o + 2] = 0;
        rgba[o + 3] = 0;
      } else if (r > 92 && rgba[o + 3] > 0) {
        const k = (100 - r) / 8;
        rgba[o + 3] = Math.round(rgba[o + 3] * k);
      }
    }
  }
}

function downsample2xTo104(src208, dst104) {
  for (let y = 0; y < 104; y++) {
    for (let x = 0; x < 104; x++) {
      const o = (y * 104 + x) * 4;
      const so = (y * 2 * 208 + x * 2) * 4;
      dst104[o] = src208[so];
      dst104[o + 1] = src208[so + 1];
      dst104[o + 2] = src208[so + 2];
      dst104[o + 3] = src208[so + 3];
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
  const sheetW = COLS * CELL;
  const sheetH = ROWS * CELL;
  const sheetRgba = new Uint8Array(sheetW * sheetH * 4);

  const dbgPad = 3;
  const dbgW = COLS * (LOGICAL + dbgPad) + dbgPad;
  const dbgH = ROWS * (LOGICAL + dbgPad) + dbgPad;
  const dbgRgba = new Uint8Array(dbgW * dbgH * 4);
  for (let i = 0; i < dbgW * dbgH; i++) {
    dbgRgba[i * 4] = 16;
    dbgRgba[i * 4 + 1] = 10;
    dbgRgba[i * 4 + 2] = 14;
    dbgRgba[i * 4 + 3] = 255;
  }

  // Full-resolution `1:1` (`208x208`) audit strip for Rows 5, 6, 7 across 8 key frames (`F00, F04, ..., F28`)
  // Row-pair A on dark cosmos (`#0c0814`), Row 6 also shown on mid-slate (`#2c3347`) to catch any subtle box halo!
  const closeupCols = [0, 4, 8, 12, 16, 20, 24, 28];
  const cuPad = 6;
  const cuRows = 4; // [Row 5 dark, Row 6 dark, Row 6 mid-slate edge test, Row 7 dark]
  const cuW = closeupCols.length * (CELL + cuPad) + cuPad;
  const cuH = cuRows * (CELL + cuPad) + cuPad;
  const cuRgba = new Uint8Array(cuW * cuH * 4);
  for (let i = 0; i < cuW * cuH; i++) {
    cuRgba[i * 4] = 10;
    cuRgba[i * 4 + 1] = 8;
    cuRgba[i * 4 + 2] = 18;
    cuRgba[i * 4 + 3] = 255;
  }

  const rowSpecs = [
    {
      name: 'Row 0: Blazing Helios Solar Fireball Orb (F00..F29)',
      windowSec: 1.0,
      layers: [
        {
          def: SOLAR_EFFECT_REGISTRY.solarFireballOrbCell,
          warmup: 0.1,
          cfg: { x: 52, y: 52, palette: SOLAR_CORONA_PALETTE }
        }
      ]
    },
    {
      name: 'Row 1: Molten Hellfire Solar Pillar (F00..F29)',
      windowSec: 1.0,
      layers: [
        {
          def: SOLAR_EFFECT_REGISTRY.hellfireMagmaPillarCell,
          warmup: 0,
          cfg: { x: 52, y: 52, palette: SOLAR_CORONA_PALETTE }
        }
      ]
    },
    {
      name: 'Row 2: Black-Sun Solar Eclipse Supernova Sphere (F00..F29)',
      windowSec: 1.0,
      layers: [
        {
          def: SOLAR_EFFECT_REGISTRY.blackSunEclipseSphereCell,
          warmup: 0,
          cfg: { x: 52, y: 52, palette: ECLIPSE_ABYSS_PALETTE }
        }
      ]
    },
    {
      name: 'Row 3: Craggy 3D-Rotating Cataclysm Solar Meteor (F00..F29)',
      windowSec: 1.0,
      layers: [
        {
          def: SOLAR_EFFECT_REGISTRY.cataclysmSolarMeteorCell,
          warmup: 0.1,
          cfg: { x: 52, y: 52, palette: SOLAR_CORONA_PALETTE }
        }
      ]
    },
    {
      name: 'Row 4: Helios Sun-Crest Seal & Blazing Solar Slash (F00..F29)',
      windowSec: 1.0,
      layers: [
        {
          def: SOLAR_EFFECT_REGISTRY.heliosSunCrestSlashCell,
          warmup: 0,
          cfg: { x: 52, y: 52, palette: SOLAR_CORONA_PALETTE }
        }
      ]
    },
    {
      name: 'Row 5: Native 208x208 Dimensional Heavensfall Sky Breach Portal (F00..F29)',
      windowSec: 1.0,
      native208: true,
      layers: [
        {
          def: SOLAR_EFFECT_REGISTRY.astralSkyBreachPortalCell,
          warmup: 0.1,
          cfg: { x: 104, y: 104, palette: ECLIPSE_ABYSS_PALETTE }
        }
      ]
    },
    {
      name: 'Row 6: Native 208x208 Colossal FF14 Limit Break III Voronoi Star-Meteor (F00..F29)',
      windowSec: 1.0,
      native208: true,
      layers: [
        {
          def: SOLAR_EFFECT_REGISTRY.astralMeteorColossusCell,
          warmup: 0.1,
          cfg: { x: 104, y: 104, palette: SOLAR_CORONA_PALETTE }
        }
      ]
    },
    {
      name: 'Row 7: Native 208x208 Enclosed Diagonal Comet Wake Plume & Mach Ring (F00..F29)',
      windowSec: 1.0,
      native208: true,
      layers: [
        {
          def: SOLAR_EFFECT_REGISTRY.astralCataclysmWakeCell,
          warmup: 0.1,
          cfg: { x: 104, y: 104, palette: SOLAR_CORONA_PALETTE }
        }
      ]
    }
  ];

  const surface104 = createPixelSurface(LOGICAL, LOGICAL);
  const pen104 = new ShaderPen(surface104);
  const cellRgba104 = new Uint8Array(LOGICAL * LOGICAL * 4);

  const surface208 = createPixelSurface(CELL, CELL);
  const pen208 = new ShaderPen(surface208);
  const cellRgba208 = new Uint8Array(CELL * CELL * 4);

  let borderClips = 0;

  for (let r = 0; r < ROWS; r++) {
    const spec = rowSpecs[r];
    const dt = spec.windowSec / COLS;
    const is208 = Boolean(spec.native208);
    const surf = is208 ? surface208 : surface104;
    const pen = is208 ? pen208 : pen104;
    const cellRgba = is208 ? cellRgba208 : cellRgba104;
    const dim = is208 ? CELL : LOGICAL;

    const instances = spec.layers.map((l) => {
      const inst = instantiateShaderEffect(l.def, l.cfg);
      if (l.warmup > 0) inst.step(l.warmup);
      return inst;
    });

    for (let c = 0; c < COLS; c++) {
      clearPixelSurface(surf);
      for (const inst of instances) inst.render(pen, 'back');
      for (const inst of instances) inst.render(pen, 'front');
      resolveSurfaceToRGBA(surf, cellRgba, 1.12);

      if (is208) {
        enforceCircularCellMargin208(cellRgba, CELL, CELL);
      } else {
        enforceSafeCellMargin104(cellRgba, LOGICAL, LOGICAL);
      }

      for (let i = 0; i < dim; i++) {
        if (
          cellRgba[(0 * dim + i) * 4 + 3] > 0 ||
          cellRgba[((dim - 1) * dim + i) * 4 + 3] > 0 ||
          cellRgba[(i * dim + 0) * 4 + 3] > 0 ||
          cellRgba[(i * dim + (dim - 1)) * 4 + 3] > 0
        ) {
          borderClips++;
          break;
        }
      }

      if (is208) {
        blitUpscaledNearest(cellRgba208, CELL, CELL, 1, sheetRgba, sheetW, c * CELL, r * CELL);
        downsample2xTo104(cellRgba208, cellRgba104);
      } else {
        blitUpscaledNearest(cellRgba104, LOGICAL, LOGICAL, 2, sheetRgba, sheetW, c * CELL, r * CELL);
      }

      const dx = dbgPad + c * (LOGICAL + dbgPad);
      const dy = dbgPad + r * (LOGICAL + dbgPad);
      for (let yy = 0; yy < LOGICAL; yy++) {
        for (let xx = 0; xx < LOGICAL; xx++) {
          const isEdge = xx === 0 || yy === 0 || xx === LOGICAL - 1 || yy === LOGICAL - 1;
          const o = ((dy + yy) * dbgW + (dx + xx)) * 4;
          dbgRgba[o] = isEdge ? 76 : 22;
          dbgRgba[o + 1] = isEdge ? 36 : 12;
          dbgRgba[o + 2] = isEdge ? 20 : 16;
          dbgRgba[o + 3] = 255;
        }
      }
      alphaCompositeOnto(cellRgba104, LOGICAL, LOGICAL, dbgRgba, dbgW, dx, dy);

      const cuIdx = closeupCols.indexOf(c);
      if (is208 && cuIdx >= 0) {
        const targets =
          r === 5
            ? [{ row: 0, bg: [14, 10, 24] }]
            : r === 6
              ? [
                  { row: 1, bg: [14, 10, 24] },
                  { row: 2, bg: [46, 52, 72] }
                ]
              : [{ row: 3, bg: [14, 10, 24] }];

        for (const t of targets) {
          const cx = cuPad + cuIdx * (CELL + cuPad);
          const cy = cuPad + t.row * (CELL + cuPad);
          for (let yy = 0; yy < CELL; yy++) {
            for (let xx = 0; xx < CELL; xx++) {
              const isEdge = xx === 0 || yy === 0 || xx === CELL - 1 || yy === CELL - 1;
              const o = ((cy + yy) * cuW + (cx + xx)) * 4;
              cuRgba[o] = isEdge ? 82 : t.bg[0];
              cuRgba[o + 1] = isEdge ? 44 : t.bg[1];
              cuRgba[o + 2] = isEdge ? 28 : t.bg[2];
              cuRgba[o + 3] = 255;
            }
          }
          alphaCompositeOnto(cellRgba208, CELL, CELL, cuRgba, cuW, cx, cy);
        }
      }

      for (const inst of instances) inst.step(dt);
    }
    console.log(`[mage-vfx] Baked ${spec.name} (30 frames)`);
  }

  const outVfxPath = path.join(REPO_ROOT, 'assets', 'sprites', 'mage_vfx.png');
  fs.writeFileSync(outVfxPath, encodeRgbaPng(sheetW, sheetH, sheetRgba));
  console.log(`[mage-vfx] Wrote ${outVfxPath} (${sheetW}x${sheetH}), borderClips=${borderClips}/240`);
  if (borderClips !== 0) {
    throw new Error(`Expected 0 borderClips on mage_vfx.png, got ${borderClips}`);
  }

  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const outDbgPath = path.join(ARTIFACT_DIR, 'debug_mage_30fps_vfx.png');
  fs.writeFileSync(outDbgPath, encodeRgbaPng(dbgW, dbgH, dbgRgba));
  console.log(`[mage-vfx] Wrote contact sheet -> ${outDbgPath}`);

  const outCuPath = path.join(ARTIFACT_DIR, 'debug_sol_meteor_208_closeup.png');
  fs.writeFileSync(outCuPath, encodeRgbaPng(cuW, cuH, cuRgba));
  console.log(`[mage-vfx] Wrote 208x208 closeup audit -> ${outCuPath}`);
}

bakeVfxSheet();
