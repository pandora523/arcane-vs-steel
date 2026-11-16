#!/usr/bin/env node
/**
 * Next-Gen 30fps HD-2D Shader VFX Sprite Sheet Builder for KAZE-MARU EX (`ronin_ex` -> `RoninEx.js`).
 * Powered by `src/engine/ArcaneShaderFX.js` + read-only `src/engine/shaders/stormShaders.js` (`STORM_EFFECT_REGISTRY`).
 *
 * Outputs:
 *   1. `assets/sprites/ronin_ex_vfx.png` (`6240x1664`, `8 rows x 30 cols @ 208x208`, soft radial alpha, `0/240` border clips)
 *   2. `/Users/rei/.gemini/antigravity/brain/5416474b-0e5f-4471-85c8-b7a88055e218/scratch/debug_ronin_ex_vfx.png`
 *
 * Row Layout (`0..7`, 30fps each):
 *   Row 0: Piercing `ronin_slash` HD-2D Storm-Katana Crescent Wave (`stormKatanaWaveCell`, 0 orbs)
 *   Row 1: Zantetsuken Raijin Flash-Sever Crossed Odachi & Saya-Click Detonation (`raijinSkyOdachiCell`)
 *   Row 2: High-Voltage Raijin Sky-Lightning Judgment Pillar (`raijinDragonPillarCell`)
 *   Row 3: Susanoo 8-Drum Mitsudomoe Thunder-Crest & Storm Shockwave (`raijinTaikoCrestCell`)
 *   Row 4: Susanoo Sixfold Omnidirectional Storm-Blade Slash Ring (`thousandBladeSlashCell`)
 *   Row 5: Indigo-Cyan Raijin Thunder-Drum Eye Seal (`raijinThunderDrumEyeSealCell`)
 *   Row 6: Shogunate Blood-Moon Raijin Thunder-Drum Eye Sanctuary & Electric Sakura
 *   Row 7: Surgical Razor-Thin `1.5px` Anime Iaido Dimensional Rift Hairline (`wRift <= 0.9` logical px, micro-lightning & sakura/ember glints)
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
  STORM_CYAN_PALETTE,
  RAIJIN_VIOLET_BRASS_PALETTE,
  STORM_EFFECT_REGISTRY
} from '../src/engine/shaders/stormShaders.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SCRATCH_DIR =
  '/Users/rei/.gemini/antigravity/brain/5416474b-0e5f-4471-85c8-b7a88055e218/scratch';

const SHOGUNATE_BLOOD_MOON_PALETTE = [
  '#16071c',
  '#4c0519',
  '#881337',
  '#be123c',
  '#f43f5e',
  '#fb7185',
  '#fde047',
  '#ffffff'
];

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
  if (ix < 3 || ix >= 101 || iy < 3 || iy >= 101 || aFloat <= 0.01) return;
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

function drawSakuraGlint104(rgba, cx, cy, phase, alpha, crimson = false) {
  const mr = crimson ? 251 : 186;
  const mg = crimson ? 207 : 230;
  const mb = crimson ? 232 : 253;
  const rr = crimson ? 244 : 56;
  const rg = crimson ? 63 : 189;
  const rb = crimson ? 94 : 248;
  blendPx104(rgba, cx, cy, 255, 255, 255, alpha);
  if ((phase & 1) === 0) {
    blendPx104(rgba, cx + 1, cy, rr, rg, rb, alpha * 0.85);
    blendPx104(rgba, cx, cy - 1, mr, mg, mb, alpha * 0.85);
    blendPx104(rgba, cx - 1, cy + 1, mr, mg, mb, alpha * 0.72);
  } else {
    blendPx104(rgba, cx - 1, cy, rr, rg, rb, alpha * 0.85);
    blendPx104(rgba, cx + 1, cy + 1, mr, mg, mb, alpha * 0.85);
    blendPx104(rgba, cx, cy + 1, rr, rg, rb, alpha * 0.72);
  }
}

/**
 * Adds Blood-Moon eclipse halo & swirling electric sakura petals around Row 6's
 * Raijin Thunder-Drum Eye Seal (100% free of any gate/pillar geometry).
 */
function addBloodMoonSanctuaryOverlay104(rgba, col) {
  const u = col / 30;
  const ph = u * Math.PI * 2;
  const cx = 51.5;
  const cy = 51.5;

  // Soft crimson-gold Blood-Moon corona ring inside r = 26..37
  for (let y = 10; y < 94; y++) {
    for (let x = 10; x < 94; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.hypot(dx, dy);
      if (r < 24 || r > 39) continue;
      const ring = Math.exp(-((r - 31.5) * (r - 31.5)) / 14.0);
      const wave = 0.72 + 0.28 * Math.sin(Math.atan2(dy, dx) * 5 - ph * 2);
      const a = ring * wave * 0.55;
      if (a > 0.04) {
        const hot = r > 30.2 && r < 32.8;
        blendPx104(
          rgba,
          x,
          y,
          hot ? 253 : 225,
          hot ? 224 : 29,
          hot ? 71 : 72,
          a
        );
      }
    }
  }

  // 8 swirling electric sakura & golden thunder-drum sparks
  for (let k = 0; k < 8; k++) {
    const ang = ph + (k * Math.PI * 2) / 8;
    const rad = 28 + 4.5 * Math.sin(ph * 2 + k * 1.3);
    const sx = cx + Math.cos(ang) * rad;
    const sy = cy + Math.sin(ang) * rad;
    drawSakuraGlint104(rgba, sx, sy, col + k, 0.9, k % 2 === 0);
  }
}

/**
 * Row 7 (`F00..F29`): Surgical Razor-Thin `1.5px` Anime Iaido Dimensional Rift Hairline
 * (`wRift <= 0.85` logical px -> crisp ~1.5px glowing hairline in 208x208, zero fat diagonal bar!),
 * accompanied by delicate 1px micro-lightning sparks and drifting sakura/ember glints.
 */
function renderSurgicalIaidoRiftRow7(rgba, col) {
  rgba.fill(0);
  const u = col / 29;
  const ph = (col / 30) * Math.PI * 2;
  const cx = 51.5;
  const cy = 51.5;

  // Slight -16 deg anime Iaido katana horizon angle
  const theta = (-16 * Math.PI) / 180;
  const ux = Math.cos(theta);
  const uy = Math.sin(theta);
  const nx = -uy;
  const ny = ux;

  // Life envelope: instant surgical draw-flash F00..F04 -> taut singing hairline F05..F21 -> crisp sever fade F22..F29
  const openEnv = u < 0.08 ? 0.55 + 0.45 * (u / 0.08) : 1.0;
  const fadeEnv = u > 0.74 ? Math.max(0.08, 1 - (u - 0.74) / 0.28) : 1.0;
  const env = openEnv * fadeEnv;
  const halfLen = 43.5 * openEnv;
  const wRift = (0.48 + 0.34 * Math.sin(Math.min(1, u * 1.35) * Math.PI)) * fadeEnv; // strictly <= 0.82 logical px!

  for (let y = 6; y < 98; y++) {
    for (let x = 6; x < 98; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const s = dx * ux + dy * uy;
      const d = Math.abs(dx * nx + dy * ny);
      if (Math.abs(s) > halfLen + 2 || d > 3.6) continue;

      const tipFade = Math.max(0, 1 - Math.pow(Math.abs(s) / Math.max(1, halfLen), 3.2));
      if (tipFade <= 0.02) continue;

      // Subtle soft cyan-violet atmospheric whisper (1-2px soft halo, NOT an opaque bar)
      if (d <= 2.8) {
        const glowA = Math.exp(-(d * d) / 1.45) * tipFade * env * 0.42;
        if (glowA > 0.03) {
          blendPx104(rgba, x, y, 56, 189, 248, glowA);
        }
      }

      // Razor-thin `wRift <= 0.82` pure-white surgical katana thread core
      if (d <= wRift + 0.35) {
        const coreA = Math.max(0, 1 - d / (wRift + 0.45)) * tipFade * env;
        if (coreA > 0.05) {
          blendPx104(rgba, x, y, 255, 255, 255, Math.min(1, coreA * 1.25));
        }
      }
    }
  }

  // DelicateSaya-glint 4-point cross-needle sliding along the hairline
  const glintS = -24 + 48 * u;
  const gx = cx + ux * glintS;
  const gy = cy + uy * glintS;
  const glintArm = Math.max(2, Math.round(5 * env));
  for (let i = -glintArm; i <= glintArm; i++) {
    const fall = (1 - Math.abs(i) / (glintArm + 1)) * env;
    blendPx104(rgba, gx + i, gy, 255, 255, 255, fall * 0.92);
    blendPx104(rgba, gx, gy + i, 186, 230, 253, fall * 0.86);
  }

  // Delicate 1px micro-lightning twigs & sakura/ember glints along the surgical thread
  for (let k = 0; k < 6; k++) {
    const seed = k * 1.9 + ph;
    const posS = ((k - 2.5) / 3.0) * 32 + Math.sin(seed) * 3.5;
    const bx = cx + ux * posS;
    const by = cy + uy * posS;
    const side = k % 2 === 0 ? 1 : -1;
    const twigLen = (3.0 + (k % 3) * 1.6) * env;
    for (let step = 1; step <= 4; step++) {
      const f = step / 4;
      const zig = Math.sin(step * 2.4 + seed * 2) * 1.2;
      const lx = bx + nx * side * twigLen * f + ux * zig;
      const ly = by + ny * side * twigLen * f + uy * zig;
      blendPx104(
        rgba,
        lx,
        ly,
        step === 1 ? 255 : k % 3 === 0 ? 253 : 103,
        step === 1 ? 255 : k % 3 === 0 ? 224 : 232,
        step === 1 ? 255 : k % 3 === 0 ? 71 : 249,
        (1 - f * 0.55) * env * 0.85
      );
    }

    const drift = 4.5 + ((col * 2 + k * 5) % 10) * 0.9;
    const px = bx + nx * (-side) * drift + ux * Math.cos(seed) * 2.5;
    const py = by + ny * (-side) * drift + uy * Math.sin(seed) * 2.5;
    if (Math.hypot(px - cx, py - cy) <= 42) {
      drawSakuraGlint104(rgba, px, py, col + k, env * 0.82, k % 2 === 1);
    }
  }
}

/**
 * Radial distance envelope (`1.0` inside `r <= 36`, smooth cosine fade to `0.0` at `r = 48.5`)
 * + soft `enforceSafeCellMargin104` so 0 cells have rectangular shader box borders or 4px clips.
 */
function applyRadialEnvelopeAndSafeMargin104(rgba, w = 104, h = 104) {
  const cx = (w - 1) * 0.5;
  const cy = (h - 1) * 0.5;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      let a = rgba[o + 3];
      if (!a) continue;

      const distCenter = Math.hypot(x - cx, y - cy);
      let radialMul = 1.0;
      if (distCenter >= 48.5) {
        radialMul = 0.0;
      } else if (distCenter > 36.0) {
        const u = (distCenter - 36.0) / 12.5;
        radialMul = 0.5 * (1 + Math.cos(u * Math.PI));
      }

      const distEdge = Math.min(x, y, w - 1 - x, h - 1 - y);
      let marginMul = 1.0;
      if (distEdge < 3) {
        marginMul = 0.0;
      } else if (distEdge < 8) {
        marginMul = (distEdge - 2.0) / 6.0;
      }

      a = Math.round(a * radialMul * marginMul);
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

function bakeRoninExVfxSheet() {
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
    qaRgba[i * 4] = 9;
    qaRgba[i * 4 + 1] = 12;
    qaRgba[i * 4 + 2] = 28;
    qaRgba[i * 4 + 3] = 255;
  }

  const rowSpecs = [
    {
      name: 'Row 0: Storm-Katana Crescent Wave',
      windowSec: 1.0,
      warmup: 0.12,
      def: STORM_EFFECT_REGISTRY.stormKatanaWaveCell,
      cfg: { x: 52, y: 52, palette: STORM_CYAN_PALETTE, seed: 501 }
    },
    {
      name: 'Row 1: Zantetsuken Twin-Odachi Flash & Saya Burst',
      windowSec: 1.0,
      warmup: 0,
      def: STORM_EFFECT_REGISTRY.raijinSkyOdachiCell,
      cfg: { x: 52, y: 52, palette: STORM_CYAN_PALETTE, seed: 513 }
    },
    {
      name: 'Row 2: Raijin Sky-Lightning Judgment Pillar',
      windowSec: 1.0,
      warmup: 0,
      def: STORM_EFFECT_REGISTRY.raijinDragonPillarCell,
      cfg: { x: 52, y: 52, palette: STORM_CYAN_PALETTE, seed: 523 }
    },
    {
      name: 'Row 3: Susanoo 8-Drum Mitsudomoe Thunder-Crest',
      windowSec: 1.0,
      warmup: 0,
      def: STORM_EFFECT_REGISTRY.raijinTaikoCrestCell,
      cfg: { x: 52, y: 52, palette: RAIJIN_VIOLET_BRASS_PALETTE, seed: 537 }
    },
    {
      name: 'Row 4: Susanoo Sixfold Storm-Blade Slash Ring',
      windowSec: 1.0,
      warmup: 0,
      def: STORM_EFFECT_REGISTRY.thousandBladeSlashCell,
      cfg: { x: 52, y: 52, palette: STORM_CYAN_PALETTE, seed: 549 }
    },
    {
      name: 'Row 5: Indigo-Cyan Raijin Thunder-Drum Eye Seal',
      windowSec: 1.0,
      warmup: 0,
      def: STORM_EFFECT_REGISTRY.raijinThunderDrumEyeSealCell,
      cfg: { x: 52, y: 52, palette: STORM_CYAN_PALETTE, seed: 563 }
    },
    {
      name: 'Row 6: Blood-Moon Raijin Thunder-Drum Sanctuary',
      windowSec: 1.0,
      warmup: 0,
      def: STORM_EFFECT_REGISTRY.raijinThunderDrumEyeSealCell,
      cfg: { x: 52, y: 52, palette: SHOGUNATE_BLOOD_MOON_PALETTE, seed: 577 }
    },
    {
      name: 'Row 7: Surgical Razor-Thin 1.5px Anime Iaido Dimensional Rift Hairline',
      customRow7: true
    }
  ];

  const surface104 = createPixelSurface(LOGICAL, LOGICAL);
  const pen104 = new ShaderPen(surface104);
  const cell104 = new Uint8Array(LOGICAL * LOGICAL * 4);
  const cell208 = new Uint8Array(CELL * CELL * 4);
  let borderClips = 0;

  for (let r = 0; r < ROWS; r++) {
    const spec = rowSpecs[r];
    let inst = null;
    const dt = (spec.windowSec || 1.0) / COLS;
    if (!spec.customRow7) {
      inst = instantiateShaderEffect(spec.def, spec.cfg);
      let rem = spec.warmup || 0;
      while (rem > 1e-6) {
        const s = Math.min(1 / 120, rem);
        inst.step(s);
        rem -= s;
      }
    }

    for (let c = 0; c < COLS; c++) {
      if (spec.customRow7) {
        renderSurgicalIaidoRiftRow7(cell104, c);
      } else {
        clearPixelSurface(surface104);
        inst.render(pen104, 'back');
        inst.render(pen104, 'front');
        resolveSurfaceToRGBA(surface104, cell104, 1.24);
        if (r === 6) {
          addBloodMoonSanctuaryOverlay104(cell104, c);
        }
        inst.step(dt);
      }

      applyRadialEnvelopeAndSafeMargin104(cell104, LOGICAL, LOGICAL);

      cell208.fill(0);
      blitUpscaledNearest(cell104, LOGICAL, LOGICAL, 2, cell208, CELL, 0, 0);
      if (has4pxBorderClip208(cell208, CELL, 4)) borderClips++;

      blitUpscaledNearest(cell104, LOGICAL, LOGICAL, 2, sheetRgba, sheetW, c * CELL, r * CELL);

      const sIdx = sampleCols.indexOf(c);
      if (sIdx >= 0) {
        alphaCompositeOnto(cell208, CELL, CELL, qaRgba, qaW, sIdx * CELL, r * CELL);
      }
    }
  }

  const outSheetPath = path.join(REPO_ROOT, 'assets', 'sprites', 'ronin_ex_vfx.png');
  fs.writeFileSync(outSheetPath, encodeRgbaPng(sheetW, sheetH, sheetRgba));

  fs.mkdirSync(SCRATCH_DIR, { recursive: true });
  const outDbgPath = path.join(SCRATCH_DIR, 'debug_ronin_ex_vfx.png');
  fs.writeFileSync(outDbgPath, encodeRgbaPng(qaW, qaH, qaRgba));

  console.log(
    `[ronin_ex_vfx] Wrote ${outSheetPath} (${sheetW}x${sheetH}) & ${outDbgPath} | borderClips=${borderClips}/240`
  );
  if (borderClips > 0) process.exitCode = 1;
}

bakeRoninExVfxSheet();
