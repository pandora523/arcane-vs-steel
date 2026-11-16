#!/usr/bin/env node
/**
 * Newly-Born Next-Gen 30fps VFX Sprite Sheet Builder for CHRONOS EX (`chronomancer_ex` -> `ChronomancerEx.js`).
 * Powered by `src/engine/ArcaneShaderFX.js` + `src/engine/shaders/chronoShaders.js` +
 * bespoke Neo-Vision horological prism, pendulum, cathedral bell, and 3-timeline pixel-art overlays!
 *
 * Outputs:
 *   1. `assets/sprites/chronomancer_ex_vfx.png` (`6240x1664`, `8 rows x 30 cols @ 208x208`, `2x2` integer blocks, `0/240` border clips)
 *   2. `<scratch>/debug_chronomancer_ex_vfx.png` (`8x7` sample contact sheet for visual QA)
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
  '/Users/rei/.gemini/antigravity/brain/3134f27a-cc2a-4935-88e2-e05d540e5f89/scratch';

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
  if (ix < 4 || ix >= 100 || iy < 4 || iy >= 100) return;
  const o = (iy * 104 + ix) * 4;
  rgba[o] = r;
  rgba[o + 1] = g;
  rgba[o + 2] = b;
  rgba[o + 3] = a;
}

function drawStar4Px104(rgba, cx, cy, arm, r, g, b) {
  const L = Math.max(1, Math.round(arm));
  for (let i = -L; i <= L; i++) {
    putPx104(rgba, cx + i, cy, Math.abs(i) <= 1 ? 255 : r, Math.abs(i) <= 1 ? 255 : g, Math.abs(i) <= 1 ? 255 : b);
    putPx104(rgba, cx, cy + i, Math.abs(i) <= 1 ? 255 : r, Math.abs(i) <= 1 ? 255 : g, Math.abs(i) <= 1 ? 255 : b);
  }
  putPx104(rgba, cx, cy, 255, 255, 255);
}

/**
 * Adds bespoke Newly-Born Neo-Vision horological pixel accents across all 8 rows:
 * - Row 0: Serrated Minute-Glaive turquoise-brass gear teeth
 * - Row 1: Ruby-violet jewel bearings & swinging escapement anchor ticks
 * - Row 2: Diamond Temporal Prism frame & golden hourglass sand stream
 * - Row 3: 3-Timeline (Amber Past / Turquoise Present / Crimson-Violet Future) sector jewels
 * - Row 4: Asymmetric 4-point Temporal Glass Starburst & prism shards (0 chevrons!)
 * - Row 5: Twin-Blade + Future-Clone Pincer X-Slice (Turquoise x Amber-Gold x Crimson-Violet)
 * - Row 6: Cathedral Clock-Spear finial & Roman tick glints
 * - Row 7: Tolling Golden Twelfth Bell silhouette & prismatic shatter facets
 */
function addNextGenChronoAccents104(rgba, row, col) {
  const u = col / 29;
  const ph = (col / 30) * Math.PI * 2;

  if (row === 0) {
    const fade = u < 0.84 ? 1 : (1 - u) / 0.16;
    if (fade <= 0.15) return;
    const cx = 42 + u * 16;
    const cy = 52;
    const rBase = 24 + Math.sin(u * Math.PI) * 8;
    for (let i = 0; i <= 44; i++) {
      const t = i / 44;
      const ang = ((-64 + 128 * t) * Math.PI) / 180;
      const saw = Math.abs(((t * 9 + u * 3) % 1) * 2 - 1) * 4.6 * Math.sin(t * Math.PI);
      const rr = rBase + saw;
      const px = cx + Math.cos(ang) * rr;
      const py = cy + Math.sin(ang) * rr;
      putPx104(rgba, px, py, 255, 255, 255);
      putPx104(rgba, px - 1, py, 45, 212, 191);
      if (i % 4 === 0) {
        putPx104(rgba, cx + Math.cos(ang) * (rBase - 3), cy + Math.sin(ang) * (rBase - 3), 250, 204, 21);
      }
    }
  } else if (row === 1) {
    // 4 ruby-violet & turquoise jewel bearings rotating on the escapement wheel
    for (let k = 0; k < 4; k++) {
      const a = ph + (k * Math.PI) / 2;
      const jx = 52 + Math.cos(a) * 24;
      const jy = 52 + Math.sin(a) * 24;
      if (k % 2 === 0) drawStar4Px104(rgba, jx, jy, 2, 45, 212, 191);
      else drawStar4Px104(rgba, jx, jy, 2, 232, 121, 249);
    }
  } else if (row === 2) {
    // Faceted Turquoise-Gold Temporal Prism diamond frame around the Hourglass
    const rP = 33;
    for (let i = 0; i <= 26; i++) {
      const f = i / 26;
      const cR = i % 2 === 0 ? 45 : 250;
      const cG = i % 2 === 0 ? 212 : 204;
      const cB = i % 2 === 0 ? 191 : 21;
      putPx104(rgba, 52 + f * rP, 52 - (1 - f) * rP, cR, cG, cB);
      putPx104(rgba, 52 + (1 - f) * rP, 52 + f * rP, cR, cG, cB);
      putPx104(rgba, 52 - f * rP, 52 + (1 - f) * rP, cR, cG, cB);
      putPx104(rgba, 52 - (1 - f) * rP, 52 - f * rP, cR, cG, cB);
    }
    drawStar4Px104(rgba, 52, 52, 4, 253, 224, 71);
  } else if (row === 3) {
    // 3-Timeline Trinity Crown Jewels (Amber-Gold XII, Turquoise IV, Crimson-Violet VIII)
    const triCols = [
      [250, 204, 21],
      [45, 212, 191],
      [232, 121, 249]
    ];
    for (let k = 0; k < 3; k++) {
      const a = -Math.PI * 0.5 + ph + (k * Math.PI * 2) / 3;
      const tx = 52 + Math.cos(a) * 35;
      const ty = 52 + Math.sin(a) * 35;
      drawStar4Px104(rgba, tx, ty, 3, triCols[k][0], triCols[k][1], triCols[k][2]);
    }
  } else if (row === 4 && col <= 23) {
    // Crisp asymmetric 4-needle anime horological starburst (2-pass, 0 chevrons!)
    const k = 1 - col / 24;
    const spanLong = Math.round(32 * k);
    const spanShort = Math.round(20 * k);
    for (let d = -spanLong; d <= spanLong; d++) {
      putPx104(rgba, 52 + d, 52 + Math.round(d * 0.28), 45, 212, 191);
    }
    for (let d = -spanShort; d <= spanShort; d++) {
      putPx104(rgba, 52 - Math.round(d * 0.28), 52 + d, 250, 204, 21);
    }
    const coreSpan = Math.round(12 * k);
    for (let d = -coreSpan; d <= coreSpan; d++) {
      putPx104(rgba, 52 + d, 52 + Math.round(d * 0.28), 255, 255, 255);
      putPx104(rgba, 52 - Math.round(d * 0.28), 52 + d, 255, 255, 255);
    }
  } else if (row === 5 && col <= 25) {
    // Crimson-Violet & Gold Future/Past counter-diagonal intersecting the Turquoise Minute-Glaive
    const k = Math.sin(Math.min(1, (col + 1) / 26) * Math.PI);
    const span = Math.round(33 * Math.max(0.25, k));
    for (let d = -span; d <= span; d++) {
      putPx104(rgba, 52 + d, 52 + Math.round(d * 0.56) + 1, 192, 38, 211);
      putPx104(rgba, 52 + d, 52 + Math.round(d * 0.56) - 1, 250, 204, 21);
    }
    for (let d = -span; d <= span; d++) {
      if (Math.abs(d) < 14) {
        putPx104(rgba, 52 + d, 52 + Math.round(d * 0.56), 255, 255, 255);
      }
    }
  } else if (row === 7 && col <= 20) {
    // Golden Cathedral Bell silhouette & resonance crown at impact center
    const fade = 1 - col / 21;
    const swing = Math.round(Math.sin(col * 0.9) * 3 * fade);
    for (let by = -12; by <= 6; by++) {
      const bw = by < -6 ? 4 : by < 2 ? 7 : 10;
      for (let bx = -bw; bx <= bw; bx++) {
        const isHi = bx < -bw + 3 || by === 6;
        putPx104(rgba, 52 + bx + swing, 46 + by, isHi ? 254 : 234, isHi ? 240 : 179, isHi ? 138 : 8);
      }
    }
    drawStar4Px104(rgba, 52 + swing, 55, Math.max(2, Math.round(5 * fade)), 45, 212, 191);
  }
}

function enforceSafeMarginAndBinaryAlpha104(rgba, w = 104, h = 104) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const distEdge = Math.min(x, y, w - 1 - x, h - 1 - y);
      const o = (y * w + x) * 4;
      let a = rgba[o + 3];
      if (distEdge < 3) {
        a = 0;
      } else if (distEdge < 7 && a > 0) {
        a = Math.round(a * ((distEdge - 2.0) / 5.0));
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
      name: 'Row 1: Spinning 2.5D Brass, Turquoise & Violet Escapement Pendulum Wheel',
      windowSec: 1.0,
      def: CHRONO_EFFECT_REGISTRY.chronoAstrolabeWheelCell,
      cfg: { x: 52, y: 52, palette: CHRONO_BRASS_PALETTE, seed: 713 }
    },
    {
      name: 'Row 2: Paradox Hourglass Temporal Prism Monolith',
      windowSec: 1.0,
      def: CHRONO_EFFECT_REGISTRY.chronoHourglassMonolithCell,
      cfg: { x: 52, y: 52, palette: CHRONO_TEAL_PALETTE, seed: 723 }
    },
    {
      name: 'Row 3: Grand XII Astronomic Clockface & 3-Timeline Trinity Crown',
      windowSec: 1.0,
      def: CHRONO_EFFECT_REGISTRY.chronoHorologiumSealCell,
      cfg: { x: 52, y: 52, palette: CHRONO_TEAL_PALETTE, seed: 733 }
    },
    {
      name: 'Row 4: Asymmetric Temporal Glass Starburst & Prism Shards',
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
      name: 'Row 6: Colossal Astronomic Clock-Hand Spear Crest',
      windowSec: 1.0,
      def: CHRONO_EFFECT_REGISTRY.suspendedClockSpearCell,
      cfg: { x: 52, y: 52, palette: CHRONO_TEAL_PALETTE, seed: 773 }
    },
    {
      name: 'Row 7: Cathedral of the Twelfth Bell Golden Resonance & Time Shatter Nova',
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

      const sIdx = sampleCols.indexOf(c);
      if (sIdx >= 0) {
        blitUpscaledNearest(cell104, LOGICAL, LOGICAL, 2, qaRgba, qaW, sIdx * CELL, r * CELL);
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
