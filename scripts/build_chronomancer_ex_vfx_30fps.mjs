#!/usr/bin/env node
/**
 * Next-Gen 30fps HD-2D Horological Shader VFX Sprite Sheet Builder for
 * CHRONOS EX (`chronomancer_ex` -> `ChronomancerEx.js`).
 * Powered by `src/engine/ArcaneShaderFX.js` + read-only `src/engine/shaders/chronoShaders.js` (`CHRONO_EFFECT_REGISTRY`).
 *
 * Key Fix vs Squared Cut-Offs:
 *   - `0` binary alpha thresholding (`enforceSafeMarginAndBinaryAlpha104` deleted!).
 *   - Smooth circular radial distance envelope (`r <= 36 -> 1.0`, cosine fade to `0.0` by `r = 48.5`)
 *     + soft `enforceSafeCellMargin104` across all 8 rows (`R0..R7`) so every Roman astrolabe,
 *     escapement wheel, hourglass, clock-spear, and twelfth-bell burst glows with `0` flat rectangular edges
 *     and `0/240` border clips!
 *
 * Outputs:
 *   1. `assets/sprites/chronomancer_ex_vfx.png` (`6240x1664`, `8 rows x 30 cols @ 208x208`, `0/240` border clips)
 *   2. `/Users/rei/.gemini/antigravity/brain/5416474b-0e5f-4471-85c8-b7a88055e218/scratch/debug_chronomancer_ex_vfx.png`
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

function blendPx104(rgba, x, y, r, g, b, aFloat = 1.0) {
  const ix = Math.round(x);
  const iy = Math.round(y);
  if (ix < 4 || ix >= 100 || iy < 4 || iy >= 100 || aFloat <= 0.01) return;
  const o = (iy * 104 + ix) * 4;
  const sa = Math.max(0, Math.min(1, aFloat));
  const da = rgba[o + 3] / 255;
  const outA = sa + da * (1 - sa);
  if (outA <= 0) return;
  rgba[o] = Math.round((r * sa + rgba[o] * da * (1 - sa)) / outA);
  rgba[o + 1] = Math.round((g * sa + rgba[o + 1] * da * (1 - sa)) / outA);
  rgba[o + 2] = Math.round((b * sa + rgba[o + 2] * da * (1 - sa)) / outA);
  rgba[o + 3] = Math.round(outA * 255);
}

function drawStar4Px104(rgba, cx, cy, arm, r, g, b, alpha = 0.92) {
  const L = Math.max(1, Math.round(arm));
  for (let i = -L; i <= L; i++) {
    const fall = (1 - Math.abs(i) / (L + 1.5)) * alpha;
    const isCore = Math.abs(i) <= 1;
    blendPx104(rgba, cx + i, cy, isCore ? 255 : r, isCore ? 255 : g, isCore ? 255 : b, fall);
    blendPx104(rgba, cx, cy + i, isCore ? 255 : r, isCore ? 255 : g, isCore ? 255 : b, fall);
  }
  blendPx104(rgba, cx, cy, 255, 255, 255, alpha);
}

/**
 * Circular inner horological jewel & clock-tick accents strictly inside `r <= 34`
 * (zero square boxes, zero rectangular bell blocks!).
 */
function addCircularChronoAccents104(rgba, row, col) {
  const u = col / 29;
  const ph = (col / 30) * Math.PI * 2;
  const cx = 51.5;
  const cy = 51.5;

  if (row === 0) {
    const fade = u < 0.82 ? 1 : (1 - u) / 0.18;
    if (fade <= 0.1) return;
    const rBase = 21 + Math.sin(u * Math.PI) * 6;
    for (let i = 0; i <= 36; i++) {
      const t = i / 36;
      const ang = ((-58 + 116 * t) * Math.PI) / 180;
      const saw = Math.abs(((t * 8 + u * 3) % 1) * 2 - 1) * 3.2 * Math.sin(t * Math.PI);
      const rr = rBase + saw;
      const px = cx - 4 + u * 10 + Math.cos(ang) * rr;
      const py = cy + Math.sin(ang) * rr;
      if (Math.hypot(px - cx, py - cy) <= 35) {
        blendPx104(rgba, px, py, 255, 255, 255, 0.85 * fade);
        blendPx104(rgba, px - 1, py, 45, 212, 191, 0.72 * fade);
      }
    }
  } else if (row === 1) {
    // 4 rotating escapement jewel bearings at r = 23
    for (let k = 0; k < 4; k++) {
      const a = ph + (k * Math.PI) / 2;
      const jx = cx + Math.cos(a) * 23;
      const jy = cy + Math.sin(a) * 23;
      if (k % 2 === 0) drawStar4Px104(rgba, jx, jy, 2, 45, 212, 191, 0.88);
      else drawStar4Px104(rgba, jx, jy, 2, 250, 204, 21, 0.88);
    }
  } else if (row === 2) {
    // Circular 12-tick Roman chapter ring glints around the Paradox Hourglass (`r = 28`)
    for (let k = 0; k < 12; k++) {
      const a = ph * 0.5 + (k * Math.PI * 2) / 12;
      const tx = cx + Math.cos(a) * 28;
      const ty = cy + Math.sin(a) * 28;
      const isCard = k % 3 === 0;
      blendPx104(rgba, tx, ty, isCard ? 254 : 45, isCard ? 240 : 212, isCard ? 138 : 191, isCard ? 0.92 : 0.68);
    }
    drawStar4Px104(rgba, cx, cy, 3, 253, 224, 71, 0.9);
  } else if (row === 3) {
    // Grand XII Roman Astrolabe: 12 luminous golden-teal dial ticks + 3-Timeline Trinity Crown Jewels inside `r <= 33`
    for (let k = 0; k < 12; k++) {
      const a = -Math.PI * 0.5 + ph + (k * Math.PI * 2) / 12;
      const rIn = k % 3 === 0 ? 27.5 : 29.5;
      for (let rr = rIn; rr <= 32.5; rr += 1.0) {
        blendPx104(
          rgba,
          cx + Math.cos(a) * rr,
          cy + Math.sin(a) * rr,
          k === 0 ? 255 : k % 3 === 0 ? 250 : 94,
          k === 0 ? 255 : k % 3 === 0 ? 204 : 234,
          k === 0 ? 255 : k % 3 === 0 ? 21 : 212,
          0.9
        );
      }
    }
    const triCols = [
      [250, 204, 21],
      [45, 212, 191],
      [232, 121, 249]
    ];
    for (let k = 0; k < 3; k++) {
      const a = -Math.PI * 0.5 + ph + (k * Math.PI * 2) / 3;
      drawStar4Px104(rgba, cx + Math.cos(a) * 32, cy + Math.sin(a) * 32, 3, triCols[k][0], triCols[k][1], triCols[k][2], 0.92);
    }
  } else if (row === 4 && col <= 23) {
    const k = 1 - col / 24;
    const spanLong = Math.round(28 * k);
    const spanShort = Math.round(18 * k);
    for (let d = -spanLong; d <= spanLong; d++) {
      const fall = (1 - Math.abs(d) / (spanLong + 2)) * 0.88;
      blendPx104(rgba, cx + d, cy + Math.round(d * 0.28), 45, 212, 191, fall);
    }
    for (let d = -spanShort; d <= spanShort; d++) {
      const fall = (1 - Math.abs(d) / (spanShort + 2)) * 0.88;
      blendPx104(rgba, cx - Math.round(d * 0.28), cy + d, 250, 204, 21, fall);
    }
    drawStar4Px104(rgba, cx, cy, Math.max(2, Math.round(7 * k)), 255, 255, 255, 0.95 * k);
  } else if (row === 5 && col <= 25) {
    const k = Math.sin(Math.min(1, (col + 1) / 26) * Math.PI);
    const span = Math.round(28 * Math.max(0.25, k));
    for (let d = -span; d <= span; d++) {
      const fall = (1 - Math.abs(d) / (span + 2)) * 0.88;
      blendPx104(rgba, cx + d, cy + Math.round(d * 0.56) + 1, 192, 38, 211, fall);
      blendPx104(rgba, cx + d, cy + Math.round(d * 0.56) - 1, 250, 204, 21, fall);
      if (Math.abs(d) < 12) {
        blendPx104(rgba, cx + d, cy + Math.round(d * 0.56), 255, 255, 255, fall);
      }
    }
  } else if (row === 7 && col <= 24) {
    // Circular 12-Ray Twelfth-Bell Golden Sunburst & Resonance Ring (0 boxy rectangles!)
    const fade = 1 - col / 25;
    const ringR = 12 + (1 - fade) * 20;
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2 + ph * 0.4;
      blendPx104(rgba, cx + Math.cos(a) * ringR, cy + Math.sin(a) * ringR, 254, 240, 138, 0.78 * fade);
    }
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2 + ph * 0.25;
      const rayLen = (k % 3 === 0 ? 24 : 16) * fade;
      for (let rr = 3; rr <= rayLen; rr += 1.0) {
        const f = 1 - rr / (rayLen + 2);
        blendPx104(
          rgba,
          cx + Math.cos(a) * rr,
          cy + Math.sin(a) * rr,
          rr < 7 ? 255 : k % 2 === 0 ? 250 : 45,
          rr < 7 ? 255 : k % 2 === 0 ? 204 : 212,
          rr < 7 ? 255 : k % 2 === 0 ? 21 : 191,
          f * 0.85 * fade
        );
      }
    }
    drawStar4Px104(rgba, cx, cy, Math.max(2, Math.round(6 * fade)), 254, 240, 138, 0.95 * fade);
  }
}

/**
 * Mandatory Radial Distance Envelope (`distFromCenter = hypot(x - 51.5, y - 51.5)`:
 * `1.0` inside `r <= 36`, smooth cosine fade to `0.0` by `r = 48.5`) + soft `enforceSafeCellMargin104`
 * (`0` binary square borders, `0` flat rectangular edges, `0/240` border clips!).
 */
function enforceSafeCellMargin104(rgba, w = 104, h = 104) {
  const cx = (w - 1) * 0.5; // 51.5
  const cy = (h - 1) * 0.5; // 51.5
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      let a = rgba[o + 3];
      if (!a) continue;

      const distFromCenter = Math.hypot(x - cx, y - cy);
      let radialEnv = 1.0;
      if (distFromCenter >= 48.5) {
        radialEnv = 0.0;
      } else if (distFromCenter > 36.0) {
        const t = (distFromCenter - 36.0) / 12.5;
        radialEnv = 0.5 * (1 + Math.cos(t * Math.PI));
      }

      const distEdge = Math.min(x, y, w - 1 - x, h - 1 - y);
      let marginEnv = 1.0;
      if (distEdge < 3) {
        marginEnv = 0.0;
      } else if (distEdge < 8) {
        marginEnv = (distEdge - 2.0) / 6.0;
      }

      a = Math.round(a * radialEnv * marginEnv);
      if (a <= 2) {
        rgba[o] = 0;
        rgba[o + 1] = 0;
        rgba[o + 2] = 0;
        rgba[o + 3] = 0;
      } else {
        rgba[o + 3] = a;
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

function bakeChronomancerExVfx() {
  const ROWS = 8;
  const COLS = 30;
  const LOGICAL = 104;
  const CELL = 208;
  const sheetW = COLS * CELL;
  const sheetH = ROWS * CELL;
  const sheetRgba = new Uint8Array(sheetW * sheetH * 4);

  const sampleCols = [0, 3, 7, 12, 17, 22, 27];
  const qaW = sampleCols.length * CELL;
  const qaH = ROWS * CELL;
  const qaRgba = new Uint8Array(qaW * qaH * 4);
  for (let i = 0; i < qaW * qaH; i++) {
    qaRgba[i * 4] = 10;
    qaRgba[i * 4 + 1] = 18;
    qaRgba[i * 4 + 2] = 30;
    qaRgba[i * 4 + 3] = 255;
  }

  const rowSpecs = [
    {
      name: 'Row 0: +X Minute-Glaive Serrated Temporal Wave & Escapement Gear-Teeth Arc',
      windowSec: 1.0,
      def: CHRONO_EFFECT_REGISTRY.chronoGearWaveCell,
      cfg: { x: 52, y: 52, palette: CHRONO_TEAL_PALETTE, seed: 701 }
    },
    {
      name: 'Row 1: Spinning 2.5D Brass & Turquoise Escapement Astrolabe Wheel',
      windowSec: 1.0,
      def: CHRONO_EFFECT_REGISTRY.chronoAstrolabeWheelCell,
      cfg: { x: 52, y: 52, palette: CHRONO_BRASS_PALETTE, seed: 713 }
    },
    {
      name: 'Row 2: Paradox Hourglass Temporal Monolith',
      windowSec: 1.0,
      def: CHRONO_EFFECT_REGISTRY.chronoHourglassMonolithCell,
      cfg: { x: 52, y: 52, palette: CHRONO_TEAL_PALETTE, seed: 723 }
    },
    {
      name: 'Row 3: Grand XII Astronomic Roman Astrolabe Clockface & Trinity Crown',
      windowSec: 1.0,
      def: CHRONO_EFFECT_REGISTRY.chronoHorologiumSealCell,
      cfg: { x: 52, y: 52, palette: CHRONO_TEAL_PALETTE, seed: 733 }
    },
    {
      name: 'Row 4: Temporal Glass Starburst & Circular Shock-Ring',
      windowSec: 1.0,
      def: CHRONO_EFFECT_REGISTRY.chronoShatterBurstCell,
      cfg: { x: 52, y: 52, palette: CHRONO_TEAL_PALETTE, seed: 747 }
    },
    {
      name: 'Row 5: Twin Hands of Fate + Paradox Clone Pincer X-Slice',
      windowSec: 1.0,
      def: CHRONO_EFFECT_REGISTRY.paradoxTwinScissorCell,
      cfg: { x: 52, y: 52, palette: CHRONO_TEAL_PALETTE, seed: 759 }
    },
    {
      name: 'Row 6: Luminous Astronomic Clock-Hand Spear Crest',
      windowSec: 1.0,
      def: CHRONO_EFFECT_REGISTRY.suspendedClockSpearCell,
      cfg: { x: 52, y: 52, palette: CHRONO_TEAL_PALETTE, seed: 773 }
    },
    {
      name: 'Row 7: Twelfth-Bell Golden Resonance & Eternal Zero Shatter Nova',
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
      resolveSurfaceToRGBA(surface104, cell104, 1.24);
      addCircularChronoAccents104(cell104, r, c);
      enforceSafeCellMargin104(cell104, LOGICAL, LOGICAL);

      cell208.fill(0);
      blitUpscaledNearest(cell104, LOGICAL, LOGICAL, 2, cell208, CELL, 0, 0);
      if (has4pxBorderClip208(cell208, CELL, 4)) borderClips++;

      blitUpscaledNearest(cell104, LOGICAL, LOGICAL, 2, sheetRgba, sheetW, c * CELL, r * CELL);

      const sIdx = sampleCols.indexOf(c);
      if (sIdx >= 0) {
        alphaCompositeOnto(cell208, CELL, CELL, qaRgba, qaW, sIdx * CELL, r * CELL);
      }

      inst.step(dt);
    }
  }

  const outSheetPath = path.join(REPO_ROOT, 'assets', 'sprites', 'chronomancer_ex_vfx.png');
  fs.writeFileSync(outSheetPath, encodeRgbaPng(sheetW, sheetH, sheetRgba));

  fs.mkdirSync(SCRATCH_DIR, { recursive: true });
  const outDbgPath = path.join(SCRATCH_DIR, 'debug_chronomancer_ex_vfx.png');
  fs.writeFileSync(outDbgPath, encodeRgbaPng(qaW, qaH, qaRgba));

  console.log(
    `[chronomancer_ex_vfx] Wrote ${outSheetPath} (${sheetW}x${sheetH}) & ${outDbgPath} | borderClips=${borderClips}/240`
  );
  if (borderClips > 0) process.exitCode = 1;
}

bakeChronomancerExVfx();
