#!/usr/bin/env node
/**
 * Next-Gen 30fps VFX Sprite Sheet Builder for CHRONOS EX (`chronomancer_ex` -> `ChronomancerEx.js`).
 * Powered by `src/engine/ArcaneShaderFX.js` + `src/engine/shaders/chronoShaders.js` +
 * bespoke Next-Gen serrated horological pixel-art overlays and strict binary alpha (`0` or `255`).
 *
 * Outputs:
 *   1. `assets/sprites/chronomancer_ex_vfx.png` (`6240x1664`, `8 rows x 30 cols @ 208x208`, `2x2` integer blocks, `0/240` border clips)
 *   2. `<scratch>/debug_chronomancer_ex_vfx.png` (`8x30` contact sheet for visual QA)
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
  CHRONO_BRASS_PALETTE,
  CHRONO_EFFECT_REGISTRY
} from '../src/engine/shaders/chronoShaders.js';

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
 * Adds bespoke Next-Gen serrated pixel accents onto Row 0 (Minute-Glaive Wave),
 * Row 4 (Serrated Horological Hit-Scar), and Row 5 (Twin-Blade Crimson-Cyan X-Scissor).
 */
function addNextGenChronoAccents104(rgba, row, col) {
  const u = col / 29;
  if (row === 0) {
    // Serrated turquoise-brass gear teeth crest along the +X wave front
    const fade = u < 0.82 ? 1 : (1 - u) / 0.18;
    if (fade <= 0.15) return;
    const cx = 42 + u * 16;
    const cy = 52;
    const rBase = 24 + Math.sin(u * Math.PI) * 8;
    for (let i = 0; i <= 44; i++) {
      const t = i / 44;
      const ang = ((-62 + 124 * t) * Math.PI) / 180;
      const saw = Math.abs(((t * 9 + u * 3) % 1) * 2 - 1) * 4.5 * Math.sin(t * Math.PI);
      const rr = rBase + saw;
      const px = cx + Math.cos(ang) * rr;
      const py = cy + Math.sin(ang) * rr;
      putPx104(rgba, px, py, 255, 255, 255);
      putPx104(rgba, px - 1, py, 45, 212, 191);
      if (i % 4 === 0) {
        putPx104(rgba, cx + Math.cos(ang) * (rBase - 3), cy + Math.sin(ang) * (rBase - 3), 250, 204, 21);
      }
    }
  } else if (row === 4 && col <= 22) {
    // Crisp Next-Gen 4-spoke horological impact cross-flash
    const k = 1 - col / 23;
    const span = Math.round(28 * k);
    for (let d = -span; d <= span; d++) {
      const isCore = Math.abs(d) <= Math.round(9 * k);
      putPx104(
        rgba,
        52 + d,
        52 + Math.round(d * 0.36),
        isCore ? 255 : 45,
        isCore ? 255 : 212,
        isCore ? 255 : 191
      );
      putPx104(
        rgba,
        52 + Math.round(d * 0.36),
        52 - d,
        isCore ? 255 : 250,
        isCore ? 255 : 204,
        isCore ? 255 : 21
      );
    }
  } else if (row === 5 && col <= 24) {
    // Crimson-Gold Hour-Blade counter-diagonal accent intersecting the Cyan Minute-Glaive slash!
    const k = Math.sin(Math.min(1, (col + 1) / 25) * Math.PI);
    const span = Math.round(32 * Math.max(0.25, k));
    for (let d = -span; d <= span; d++) {
      const px = 52 + d;
      const py = 52 + Math.round(d * 0.56);
      const core = Math.abs(d) < 11;
      putPx104(rgba, px, py, core ? 255 : 251, core ? 240 : 113, core ? 138 : 133);
      putPx104(rgba, px, py + 1, 190, 18, 60);
    }
  }
}

function enforceSafeMarginAndBinaryAlpha104(rgba, w = 104, h = 104) {
  // First taper near border, then quantize strictly to binary alpha (0 or 255) with 2px logical margin (4px at 208x208)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const distEdge = Math.min(x, y, w - 1 - x, h - 1 - y);
      const o = (y * w + x) * 4;
      let a = rgba[o + 3];
      if (distEdge < 2) {
        a = 0;
      } else if (distEdge < 6 && a > 0) {
        a = Math.round(a * ((distEdge - 1.5) / 4.5));
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

function bakeChronomancerExVfx() {
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
    dbgRgba[i * 4 + 1] = 15;
    dbgRgba[i * 4 + 2] = 26;
    dbgRgba[i * 4 + 3] = 255;
  }

  const rowSpecs = [
    {
      name: 'Row 0: +X Minute-Glaive Serrated Temporal Wave & Escapement Gear-Teeth Arc',
      windowSec: 1.0,
      def: CHRONO_EFFECT_REGISTRY.chronoGearWaveCell,
      cfg: { x: 52, y: 52, palette: CHRONO_TEAL_PALETTE, seed: 701 }
    },
    {
      name: 'Row 1: Spinning 2.5D Brass & Cyan Past-Timeline XII Anchor / Astrolabe Wheel',
      windowSec: 1.0,
      def: CHRONO_EFFECT_REGISTRY.chronoAstrolabeWheelCell,
      cfg: { x: 52, y: 52, palette: CHRONO_BRASS_PALETTE, seed: 713 }
    },
    {
      name: 'Row 2: Erupting Time-Dilation Stasis Hourglass Monolith & Temporal Rift',
      windowSec: 1.0,
      def: CHRONO_EFFECT_REGISTRY.chronoHourglassMonolithCell,
      cfg: { x: 52, y: 52, palette: CHRONO_TEAL_PALETTE, seed: 723 }
    },
    {
      name: 'Row 3: Grand 12-Spoke Roman Numeral XII Horologium Clockface',
      windowSec: 1.0,
      def: CHRONO_EFFECT_REGISTRY.chronoHorologiumSealCell,
      cfg: { x: 52, y: 52, palette: CHRONO_TEAL_PALETTE, seed: 733 }
    },
    {
      name: 'Row 4: Temporal Glass-Clock Shatter Star-Burst & Serrated Hit-Scar',
      windowSec: 1.0,
      def: CHRONO_EFFECT_REGISTRY.chronoShatterBurstCell,
      cfg: { x: 52, y: 52, palette: CHRONO_TEAL_PALETTE, seed: 747 }
    },
    {
      name: 'Row 5: Twin Hands of Fate X-Scissor Cleave (+Cyan Minute x -Crimson/Gold Hour)',
      windowSec: 1.0,
      def: CHRONO_EFFECT_REGISTRY.paradoxTwinScissorCell,
      cfg: { x: 52, y: 52, palette: CHRONO_TEAL_PALETTE, seed: 759 }
    },
    {
      name: 'Row 6: Colossal Horizontal +X Golden-Brass & Cyan-Crystal Clock-Hand Spear',
      windowSec: 1.0,
      def: CHRONO_EFFECT_REGISTRY.suspendedClockSpearCell,
      cfg: { x: 52, y: 52, palette: CHRONO_TEAL_PALETTE, seed: 773 }
    },
    {
      name: 'Row 7: Massive Twelfth Bell Midnight Shatter Nova',
      windowSec: 1.0,
      def: CHRONO_EFFECT_REGISTRY.twelfthBellCataclysmCell,
      cfg: { x: 52, y: 52, palette: CHRONO_TEAL_PALETTE, seed: 791 }
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
      resolveSurfaceToRGBA(surface104, cell104, 1.18);
      addNextGenChronoAccents104(cell104, r, c);
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

  const outSheetPath = path.join(REPO_ROOT, 'assets', 'sprites', 'chronomancer_ex_vfx.png');
  fs.writeFileSync(outSheetPath, encodeRgbaPng(sheetW, sheetH, sheetRgba));

  fs.mkdirSync(SCRATCH_DIR, { recursive: true });
  const outDbgPath = path.join(SCRATCH_DIR, 'debug_chronomancer_ex_vfx.png');
  fs.writeFileSync(outDbgPath, encodeRgbaPng(dbgW, dbgH, dbgRgba));

  console.log(
    `[chronomancer_ex_vfx] Wrote ${outSheetPath} (${sheetW}x${sheetH}) & ${outDbgPath} | borderClips=${borderClips}/240`
  );
  if (borderClips > 0) process.exitCode = 1;
}

bakeChronomancerExVfx();
