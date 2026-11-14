#!/usr/bin/env node
/**
 * First-Party 30fps VFX Sprite Sheet Builder for Chronos (`chronomancer` / `Chronomancer.js`).
 * Powered natively by `src/engine/ArcaneShaderFX.js` + `src/engine/shaders/chronoShaders.js`.
 *
 * Outputs:
 *   1. `assets/sprites/chronomancer_vfx.png` (6240x1664, 8 rows x 30 cols @ 208x208, 0/240 4px-border clips)
 *   2. `<artifactDir>/debug_chronomancer_30fps_vfx.png` (8x30 contact sheet for visual verification)
 *   3. `<artifactDir>/debug_chronos_ult_208_closeup.png` (1:1 208x208 closeup of Rows 5, 6, 7)
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
  CHRONO_TEAL_PALETTE,
  CHRONO_EFFECT_REGISTRY
} from '../src/engine/shaders/chronoShaders.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const ARTIFACT_DIR =
  '/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/7821d65d-384a-4e26-8167-f32a84e377d8/scratch';

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
        // 2px margin at 104x104 -> strict 4px transparent border margin at 208x208
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

function has4pxBorderClip208(cellRgba, cell = 208, margin = 4) {
  for (let y = 0; y < cell; y++) {
    for (let x = 0; x < cell; x++) {
      if (x >= margin && x < cell - margin && y >= margin && y < cell - margin) continue;
      if (cellRgba[(y * cell + x) * 4 + 3] > 0) {
        return true;
      }
    }
  }
  return false;
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
    dbgRgba[i * 4] = 6;
    dbgRgba[i * 4 + 1] = 15;
    dbgRgba[i * 4 + 2] = 24;
    dbgRgba[i * 4 + 3] = 255;
  }

  // 1:1 208x208 closeup contact sheet for Rows 5, 6, 7 (6 sampled frames per row: F00, F05, F10, F15, F20, F25)
  const sampleCols = [0, 5, 10, 15, 20, 25];
  const closePad = 8;
  const closeW = sampleCols.length * (CELL + closePad) + closePad;
  const closeH = 3 * (CELL + closePad) + closePad;
  const closeRgba = new Uint8Array(closeW * closeH * 4);
  for (let i = 0; i < closeW * closeH; i++) {
    closeRgba[i * 4] = 8;
    closeRgba[i * 4 + 1] = 18;
    closeRgba[i * 4 + 2] = 30;
    closeRgba[i * 4 + 3] = 255;
  }

  const rowSpecs = [
    {
      name: 'Row 0: +X Minute-Blade Crescent Sonic Wave & Gear-Teeth Arc (F00..F29)',
      windowSec: 1.0,
      def: CHRONO_EFFECT_REGISTRY.chronoGearWaveCell,
      cfg: { x: 52, y: 52, palette: CHRONO_TEAL_PALETTE, seed: 601 }
    },
    {
      name: 'Row 1: Spinning 2.5D Brass & Cyan Past-Timeline Anchor / Astrolabe Wheel (F00..F29)',
      windowSec: 1.0,
      def: CHRONO_EFFECT_REGISTRY.chronoAstrolabeWheelCell,
      cfg: { x: 52, y: 52, palette: CHRONO_TEAL_PALETTE, seed: 613 }
    },
    {
      name: 'Row 2: Erupting Time-Dilation Stasis Hourglass Pillar & Temporal Rift (F00..F29)',
      windowSec: 1.0,
      def: CHRONO_EFFECT_REGISTRY.chronoHourglassMonolithCell,
      cfg: { x: 52, y: 52, palette: CHRONO_TEAL_PALETTE, seed: 623 }
    },
    {
      name: 'Row 3: Grand 12-Spoke Roman Numeral XII Horologium Clockface (F00..F29)',
      windowSec: 1.0,
      def: CHRONO_EFFECT_REGISTRY.chronoHorologiumSealCell,
      cfg: { x: 52, y: 52, palette: CHRONO_TEAL_PALETTE, seed: 633 }
    },
    {
      name: 'Row 4: Temporal Glass-Clock Shatter Star-Burst (F00..F29)',
      windowSec: 1.0,
      def: CHRONO_EFFECT_REGISTRY.chronoShatterBurstCell,
      cfg: { x: 52, y: 52, palette: CHRONO_TEAL_PALETTE, seed: 647 }
    },
    {
      name: 'Row 5: Twin Clock-Hand X-Scissor Cleave (+28 deg Cyan x -28 deg Gold) (F00..F29)',
      windowSec: 1.0,
      def: CHRONO_EFFECT_REGISTRY.paradoxTwinScissorCell,
      cfg: { x: 52, y: 52, palette: CHRONO_TEAL_PALETTE, seed: 659 }
    },
    {
      name: 'Row 6: Colossal Horizontal +X Golden-Brass & Cyan-Crystal Clock-Hand Spear (F00..F29)',
      windowSec: 1.0,
      def: CHRONO_EFFECT_REGISTRY.suspendedClockSpearCell,
      cfg: { x: 52, y: 52, palette: CHRONO_TEAL_PALETTE, seed: 673 }
    },
    {
      name: 'Row 7: Massive Twelfth Bell Midnight Shatter Nova (F00..F29)',
      windowSec: 1.0,
      def: CHRONO_EFFECT_REGISTRY.twelfthBellCataclysmCell,
      cfg: { x: 52, y: 52, palette: CHRONO_TEAL_PALETTE, seed: 691 }
    }
  ];

  const surface104 = createPixelSurface(LOGICAL, LOGICAL);
  const pen104 = new ShaderPen(surface104);
  const cell104 = new Uint8Array(LOGICAL * LOGICAL * 4);
  const cell208 = new Uint8Array(CELL * CELL * 4);

  let rawBorderClips = 0;
  let borderClips = 0;

  for (let r = 0; r < ROWS; r++) {
    const spec = rowSpecs[r];
    const dt = spec.windowSec / COLS;
    const inst = instantiateShaderEffect(spec.def, spec.cfg);

    for (let c = 0; c < COLS; c++) {
      clearPixelSurface(surface104);
      inst.render(pen104, 'back');
      inst.render(pen104, 'front');
      resolveSurfaceToRGBA(surface104, cell104, 1.15);

      cell208.fill(0);
      blitUpscaledNearest(cell104, LOGICAL, LOGICAL, 2, cell208, CELL, 0, 0);
      if (has4pxBorderClip208(cell208, CELL, 4)) {
        rawBorderClips++;
      }

      enforceSafeCellMargin104(cell104, LOGICAL, LOGICAL);

      cell208.fill(0);
      blitUpscaledNearest(cell104, LOGICAL, LOGICAL, 2, cell208, CELL, 0, 0);

      if (has4pxBorderClip208(cell208, CELL, 4)) {
        borderClips++;
      }

      blitUpscaledNearest(cell104, LOGICAL, LOGICAL, 2, sheetRgba, sheetW, c * CELL, r * CELL);

      const dx = dbgPad + c * (LOGICAL + dbgPad);
      const dy = dbgPad + r * (LOGICAL + dbgPad);
      alphaCompositeOnto(cell104, LOGICAL, LOGICAL, dbgRgba, dbgW, dx, dy);

      const sIdx = sampleCols.indexOf(c);
      if (sIdx !== -1 && r >= 5) {
        const cx = closePad + sIdx * (CELL + closePad);
        const cy = closePad + (r - 5) * (CELL + closePad);
        alphaCompositeOnto(cell208, CELL, CELL, closeRgba, closeW, cx, cy);
      }

      inst.step(dt);
    }
  }

  const outSheetPath = path.join(REPO_ROOT, 'assets', 'sprites', 'chronomancer_vfx.png');
  fs.writeFileSync(outSheetPath, encodeRgbaPng(sheetW, sheetH, sheetRgba));

  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const outDbgPath = path.join(ARTIFACT_DIR, 'debug_chronomancer_30fps_vfx.png');
  const outClosePath = path.join(ARTIFACT_DIR, 'debug_chronos_ult_208_closeup.png');
  fs.writeFileSync(outDbgPath, encodeRgbaPng(dbgW, dbgH, dbgRgba));
  fs.writeFileSync(outClosePath, encodeRgbaPng(closeW, closeH, closeRgba));

  console.log(
    `[build_chronomancer_vfx_30fps] Wrote ${outSheetPath} (${sheetW}x${sheetH}), ${outDbgPath} (${dbgW}x${dbgH}), ${outClosePath} (${closeW}x${closeH}) | rawBorderClips=${rawBorderClips}/240 | borderClips=${borderClips}/240`
  );
  if (rawBorderClips > 0 || borderClips > 0) {
    process.exitCode = 1;
  }
}

bakeVfxSheet();
