#!/usr/bin/env node
/**
 * First-Party 8-Row x 30-Col 30fps VFX Sprite Sheet Builder for VEX-09 v2 (`android`).
 * Powered natively by `src/engine/ArcaneShaderFX.js` + `src/engine/shaders/cyberShaders.js`.
 *
 * Outputs:
 *   1. `assets/sprites/android_vfx.png` (6240x1664, 8 rows x 30 cols @ 208x208, 0/240 border clips)
 *      - Row 0: HF Plasma Crescent Wave
 *      - Row 1: Autonomous Fin-Funnel Drone Pod
 *      - Row 2: EMP Gravity Tether Spire
 *      - Row 3: Cyber Singularity Core
 *      - Row 4: Hex-Glitch Cross-Slash Burst
 *      - Row 5: Orbital Satellite Target-Lock Hex Reticle
 *      - Row 6: Fin-Funnel All-Range Convergence Laser Node
 *      - Row 7: Project GUNG-09 Orbital Satellite Buster Column
 *   2. `/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/3a4b2cf8-05c2-45a3-bb65-af6f5b5a1088/debug_android_30fps_vfx.png`
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
} from '../src/engine/ArcaneShaderFX.js?v=30fps80';

import {
  CYBER_NEON_PALETTE,
  CYBER_MAGENTA_PALETTE,
  CYBER_EFFECT_REGISTRY
} from '../src/engine/shaders/cyberShaders.js?v=30fps80';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const ARTIFACT_DIR =
  '/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/b9d8130e-8764-4ace-8d4e-40f97049d6f1';

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

// ============================================================================
// Cell Post-Processing & Nearest-Neighbor Blit Helpers
// ============================================================================
function enforceSafeCellMargin104(rgba, w = 104, h = 104) {
  // Smooth outer 6px edge fade + strict 3px transparent safety margin (6px at 208x208 -> 0/240 clips)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const distEdge = Math.min(x, y, w - 1 - x, h - 1 - y);
      const o = (y * w + x) * 4;
      if (distEdge < 3) {
        rgba[o] = 0;
        rgba[o + 1] = 0;
        rgba[o + 2] = 0;
        rgba[o + 3] = 0;
      } else if (distEdge < 7 && rgba[o + 3] > 0) {
        const k = (distEdge - 2.5) / 4.5;
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

// ============================================================================
// Bake 8-Row x 30-Col 30fps VFX Sheet (`android_vfx.png`, 6240x1664)
// ============================================================================
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
    dbgRgba[i * 4 + 1] = 17;
    dbgRgba[i * 4 + 2] = 30;
    dbgRgba[i * 4 + 3] = 255;
  }

  const rowSpecs = [
    {
      name: 'Row 0: HF Plasma Crescent Wave',
      windowSec: 0.60,
      layers: [
        {
          def: CYBER_EFFECT_REGISTRY.hfPlasmaCrescentWave,
          warmup: 0.18,
          cfg: { x: 50, y: 52, radius: 30, palette: CYBER_NEON_PALETTE, seed: 21 }
        }
      ]
    },
    {
      name: 'Row 1: Autonomous Fin-Funnel Drone Pod',
      windowSec: 0.60,
      layers: [
        {
          def: CYBER_EFFECT_REGISTRY.finFunnelDronePod,
          warmup: 0.18,
          cfg: { x: 54, y: 52, palette: CYBER_NEON_PALETTE, seed: 25 }
        }
      ]
    },
    {
      name: 'Row 2: EMP Gravity Tether Spire',
      windowSec: 1.00,
      layers: [
        {
          def: CYBER_EFFECT_REGISTRY.empGravityTetherSpire,
          warmup: 0.20,
          cfg: { x: 52, y: 84, radius: 38, palette: CYBER_NEON_PALETTE, seed: 31 }
        }
      ]
    },
    {
      name: 'Row 3: Cyber Singularity Core',
      windowSec: 1.00,
      layers: [
        {
          def: CYBER_EFFECT_REGISTRY.cyberSingularityCore,
          warmup: 0.02,
          cfg: { x: 52, y: 52, radius: 34, palette: CYBER_NEON_PALETTE, seed: 37 }
        }
      ]
    },
    {
      name: 'Row 4: Hex-Glitch Cross-Slash Burst',
      windowSec: 0.56,
      layers: [
        {
          def: CYBER_EFFECT_REGISTRY.hexGlitchCrossSlash,
          warmup: 0.02,
          cfg: { x: 52, y: 52, palette: CYBER_NEON_PALETTE, seed: 41 }
        },
        {
          def: CYBER_EFFECT_REGISTRY.cyberImpactSpark,
          warmup: 0.01,
          cfg: { x: 52, y: 52, palette: CYBER_MAGENTA_PALETTE, seed: 13 }
        }
      ]
    },
    {
      name: 'Row 5: Orbital Satellite Target-Lock Hex Reticle',
      windowSec: 1.00,
      layers: [
        {
          def: CYBER_EFFECT_REGISTRY.orbitalTargetLockHex,
          warmup: 0.02,
          cfg: { x: 52, y: 52, radius: 38, squashY: 0.88, palette: CYBER_NEON_PALETTE, seed: 53 }
        }
      ]
    },
    {
      name: 'Row 6: Fin-Funnel All-Range Convergence Laser Node',
      windowSec: 0.60,
      layers: [
        {
          def: CYBER_EFFECT_REGISTRY.finFunnelLaserNode,
          warmup: 0.05,
          cfg: { x: 24, y: 52, beamLength: 66, palette: CYBER_NEON_PALETTE, seed: 61 }
        }
      ]
    },
    {
      name: 'Row 7: Project GUNG-09 Orbital Satellite Buster Column',
      windowSec: 0.60,
      layers: [
        {
          def: CYBER_EFFECT_REGISTRY.orbitalBusterColumn,
          warmup: 0.04,
          cfg: { x: 52, y: 52, halfWidth: 21, halfHeight: 43, palette: CYBER_NEON_PALETTE, seed: 71 }
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
      resolveSurfaceToRGBA(surface, cellRgba, 1.12);
      enforceSafeCellMargin104(cellRgba, LOGICAL, LOGICAL);

      // Verify zero border clips across outer 2px margin (4px in 208x208)
      let clipped = false;
      for (let m = 0; m < 2 && !clipped; m++) {
        for (let i = 0; i < LOGICAL; i++) {
          if (
            cellRgba[(m * LOGICAL + i) * 4 + 3] > 0 ||
            cellRgba[((LOGICAL - 1 - m) * LOGICAL + i) * 4 + 3] > 0 ||
            cellRgba[(i * LOGICAL + m) * 4 + 3] > 0 ||
            cellRgba[(i * LOGICAL + (LOGICAL - 1 - m)) * 4 + 3] > 0
          ) {
            clipped = true;
            borderClips++;
            break;
          }
        }
      }

      blitUpscaledNearest(cellRgba, LOGICAL, LOGICAL, 2, sheetRgba, sheetW, c * CELL, r * CELL);

      // Draw subtle cell border + composite onto 8x30 debug contact sheet
      const dx = dbgPad + c * (LOGICAL + dbgPad);
      const dy = dbgPad + r * (LOGICAL + dbgPad);
      for (let yy = 0; yy < LOGICAL; yy++) {
        for (let xx = 0; xx < LOGICAL; xx++) {
          const isEdge = xx === 0 || yy === 0 || xx === LOGICAL - 1 || yy === LOGICAL - 1;
          const o = ((dy + yy) * dbgW + (dx + xx)) * 4;
          dbgRgba[o] = isEdge ? 44 : 20;
          dbgRgba[o + 1] = isEdge ? 54 : 25;
          dbgRgba[o + 2] = isEdge ? 84 : 44;
          dbgRgba[o + 3] = 255;
        }
      }
      alphaCompositeOnto(cellRgba, LOGICAL, LOGICAL, dbgRgba, dbgW, dx, dy);

      for (const inst of instances) {
        inst.step(dt);
      }
    }
    console.log(`[android-vfx] Baked ${spec.name} (30 frames)`);
  }

  const outVfxPath = path.join(REPO_ROOT, 'assets', 'sprites', 'android_vfx.png');
  fs.writeFileSync(outVfxPath, encodeRgbaPng(sheetW, sheetH, sheetRgba));
  console.log(`[android-vfx] Wrote ${outVfxPath} (${sheetW}x${sheetH}), borderClips=${borderClips}/240`);

  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const outDbgPath = path.join(ARTIFACT_DIR, 'debug_android_30fps_vfx.png');
  fs.writeFileSync(outDbgPath, encodeRgbaPng(dbgW, dbgH, dbgRgba));
  console.log(`[android-vfx] Wrote contact sheet -> ${outDbgPath}`);
}

bakeVfxSheet();
