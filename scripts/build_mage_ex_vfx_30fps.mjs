#!/usr/bin/env node
/**
 * IGNIS SOL EX (`mage_ex` / `FireMageEx.js`) — Newly Born Next-Gen 30fps VFX Sprite Sheet Builder (`?v=30fps124`).
 *
 * Outputs:
 *   1. `assets/sprites/mage_ex_vfx.png` (6240x1664, 8 rows x 30 cols @ 208x208)
 *   2. Untracked QA contact sheet in scratch dir (`debug_mage_ex_vfx.png`)
 *   3. Untracked full-res `208x208` closeup audit strip (`debug_mage_ex_ult_rows567.png`)
 *
 * Invariants:
 *   - Rows 0..4: `104x104` logical -> upscaled `2x NEAREST` to `208x208` (`enforceSafeCellMargin104`)
 *   - Row 4: Seamless 30-frame continuous rotating Golden Solar Astrolabe Magic Circle (`expand = 1.0, dissipate = 0`)
 *   - Rows 5..7 (`native208: true`): 100% full-scale native `208x208` `SOLAR_EFFECT_REGISTRY` fidelity
 *     (`astralSkyBreachPortalCell`, `astralMeteorColossusCell`, `astralCataclysmWakeCell`) with circular
 *     radial margin `enforceCircularCellMargin208` (`0` square/box walls, `0/240` `4px` border clips)
 *   - `29/29` active transitions per row across all 8 rows
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
} from '../src/engine/ArcaneShaderFX.js?v=30fps124';

import {
  SOLAR_CORONA_PALETTE,
  ECLIPSE_ABYSS_PALETTE,
  SOLAR_EFFECT_REGISTRY
} from '../src/engine/shaders/solarShaders.js?v=30fps124';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SCRATCH_DIR =
  process.env.SCRATCH_DIR ||
  '/Users/rei/.gemini/antigravity/brain/5416474b-0e5f-4471-85c8-b7a88055e218/scratch';

const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5]
];

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

function putPx104(rgba, x, y, r, g, b, a = 255) {
  if (x < 3 || y < 3 || x >= 101 || y >= 101) return;
  const o = (y * 104 + x) * 4;
  rgba[o] = r;
  rgba[o + 1] = g;
  rgba[o + 2] = b;
  rgba[o + 3] = a;
}

function putOut104(rgba, x, y, r, g, b) {
  if (x < 3 || y < 3 || x >= 101 || y >= 101) return;
  const o = (y * 104 + x) * 4;
  if (rgba[o + 3] === 0) {
    rgba[o] = r;
    rgba[o + 1] = g;
    rgba[o + 2] = b;
    rgba[o + 3] = 255;
  }
}

function drawStarGlint104(rgba, cx, cy, arm, coreR = 255, coreG = 255, coreB = 255, rayR = 254, rayG = 240, rayB = 138) {
  const icx = Math.round(cx);
  const icy = Math.round(cy);
  for (let d = -arm - 1; d <= arm + 1; d++) {
    putOut104(rgba, icx + d, icy, 24, 8, 10);
    putOut104(rgba, icx, icy + d, 24, 8, 10);
  }
  for (let d = -arm; d <= arm; d++) {
    putPx104(rgba, icx + d, icy, rayR, rayG, rayB, 255);
    putPx104(rgba, icx, icy + d, rayR, rayG, rayB, 255);
  }
  putPx104(rgba, icx - 1, icy - 1, 251, 146, 60, 255);
  putPx104(rgba, icx + 1, icy - 1, 251, 146, 60, 255);
  putPx104(rgba, icx - 1, icy + 1, 251, 146, 60, 255);
  putPx104(rgba, icx + 1, icy + 1, 251, 146, 60, 255);
  putPx104(rgba, icx, icy, coreR, coreG, coreB, 255);
}

/**
 * Pure High-Sorcery Row 4: Seamless 30fps Continuous Rotating Golden Solar Astrolabe Magic Circle & 8-Point Starburst Seal!
 * Zero melee slash crescents, zero fade-out blink (`expand = 1.0`, `dissipate = 0`).
 */
function drawSolarAstrolabeMagicCircle104(rgba, cx, cy, frameIdx, totalFrames) {
  const phase = frameIdx / totalFrames;
  const rot = phase * Math.PI * 2;
  const expand = 1.0;
  const rOuter = 40 * expand;
  const rInner = 27 * expand;
  const dissipate = 0;

  // Soft golden-crimson solar emissive halo + Bayer-stippled corona aura (0 square borders!)
  for (let py = 5; py < 99; py++) {
    for (let px = 5; px < 99; px++) {
      const dx = px - cx;
      const dy = py - cy;
      const d = Math.hypot(dx, dy);
      if (d > rOuter + 5) continue;
      const haloK = Math.max(0, 1 - d / (rOuter + 5));
      const haloA = Math.round(135 * haloK * haloK * (1 - 0.75 * dissipate));
      if (haloA > 4) {
        const o = (py * 104 + px) * 4;
        rgba[o] = 239;
        rgba[o + 1] = Math.round(68 + 110 * haloK);
        rgba[o + 2] = Math.round(24 + 40 * haloK);
        rgba[o + 3] = Math.max(rgba[o + 3], haloA);
      }
      if (d > rOuter - 2 || d < 6) continue;
      const bayer = BAYER4[py & 3][px & 3] / 16.0;
      const wave = 0.5 + 0.5 * Math.sin(Math.atan2(dy, dx) * 8 + rot * 2);
      if (bayer < 0.28 * (1 - dissipate) * wave) {
        putPx104(rgba, px, py, 249, 115, 22, Math.round(230 * (1 - 0.5 * dissipate)));
      }
    }
  }

  // Concentric Solar Rune Rings
  for (const [rad, isOuter] of [
    [rOuter, true],
    [rInner, false]
  ]) {
    const steps = 112;
    for (let i = 0; i < steps; i++) {
      const ang = (i / steps) * Math.PI * 2 + (isOuter ? rot : -rot);
      const px = Math.round(cx + Math.cos(ang) * rad);
      const py = Math.round(cy + Math.sin(ang) * rad);
      if (dissipate > 0 && BAYER4[py & 3][px & 3] / 16.0 < dissipate) continue;
      putOut104(rgba, px + 1, py, 24, 8, 10);
      putOut104(rgba, px - 1, py, 24, 8, 10);
      putOut104(rgba, px, py + 1, 24, 8, 10);
      putOut104(rgba, px, py - 1, 24, 8, 10);
      if (i % 7 === 0) {
        putPx104(rgba, px, py, 255, 255, 255, 255);
      } else if (isOuter) {
        putPx104(rgba, px, py, 254, 240, 138, 255);
      } else {
        putPx104(rgba, px, py, 251, 146, 60, 255);
      }
    }
  }

  // Inscribed 8-Point Octagram Star Lines
  const pts = [];
  for (let k = 0; k < 8; k++) {
    const a = rot + (k * Math.PI) / 4;
    pts.push([cx + Math.cos(a) * (rOuter - 2), cy + Math.sin(a) * (rOuter - 2)]);
  }
  for (let k = 0; k < 8; k++) {
    const [x0, y0] = pts[k];
    const [x1, y1] = pts[(k + 3) % 8];
    const segs = 44;
    for (let s = 0; s <= segs; s++) {
      const t = s / segs;
      const px = Math.round(x0 + (x1 - x0) * t);
      const py = Math.round(y0 + (y1 - y0) * t);
      if (dissipate > 0 && BAYER4[py & 3][px & 3] / 16.0 < dissipate + 0.1) continue;
      putOut104(rgba, px + 1, py, 24, 8, 10);
      putOut104(rgba, px, py + 1, 24, 8, 10);
      if (s % 3 === 0) putPx104(rgba, px, py, 254, 240, 138, 255);
      else putPx104(rgba, px, py, 251, 146, 60, 255);
    }
  }

  // Central blazing miniature sun + 4 cardinal star-glints
  if (dissipate < 0.65) {
    drawStarGlint104(rgba, cx, cy, 6);
    for (let k = 0; k < 4; k++) {
      const ga = rot + (k * Math.PI) / 2;
      drawStarGlint104(rgba, cx + Math.cos(ga) * rOuter, cy + Math.sin(ga) * rOuter, 3);
    }
  }
}

function smoothstep01(t) {
  const c = t < 0 ? 0 : t > 1 ? 1 : t;
  return c * c * (3 - 2 * c);
}

function applyEllipticalFalloff(rgba, w, h, cx, cy, rx, ry, innerRatio = 0.76, phase = 0, diamondK = 0) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      const a = rgba[o + 3];
      if (!a) continue;
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      const ang = Math.atan2(dy, dx);
      const ripple =
        1 +
        (diamondK > 0 ? 0.08 * Math.sin(ang * 7 + phase * Math.PI * 2) : 0.045 * Math.sin(ang * 5 + phase * Math.PI * 2)) +
        0.03 * Math.cos(ang * 3 - phase * Math.PI * 2);
      const l2 = Math.hypot(dx, dy);
      const l1 = Math.abs(dx) + Math.abs(dy);
      const metric = (1 - diamondK) * l2 + diamondK * l1;
      const nr = metric / ripple;
      if (nr >= 1.0) {
        rgba[o] = 0;
        rgba[o + 1] = 0;
        rgba[o + 2] = 0;
        rgba[o + 3] = 0;
      } else if (nr > innerRatio) {
        const k = smoothstep01((1.0 - nr) / (1.0 - innerRatio));
        const na = Math.round(a * k);
        rgba[o + 3] = na;
        if (na === 0) {
          rgba[o] = 0;
          rgba[o + 1] = 0;
          rgba[o + 2] = 0;
        }
      }
    }
  }
}

function applyPillarOrganicFalloff104(rgba, phase = 0) {
  for (let y = 0; y < 104; y++) {
    for (let x = 0; x < 104; x++) {
      const o = (y * 104 + x) * 4;
      const a = rgba[o + 3];
      if (!a) continue;
      const dx = Math.abs(x - 51.5);
      const archCurve = dx * dx * 0.018;
      const waveTop = Math.sin(x * 0.35 + phase * Math.PI * 2) * 2.5 + archCurve * 0.5;
      const waveBot = Math.cos(x * 0.42 - phase * Math.PI * 2) * 2.0 - archCurve;
      let k = 1.0;
      if (y < 23 + waveTop) {
        k *= smoothstep01((y - (14 + waveTop)) / 9.0);
      } else if (y > 84 + waveBot) {
        k *= smoothstep01((96 + waveBot - y) / 12.0);
      }
      const maxDx = 27.5 + 1.8 * Math.sin(y * 0.28 + phase * Math.PI * 2);
      if (dx > 18.5) {
        k *= smoothstep01((maxDx - dx) / Math.max(1.0, maxDx - 18.5));
      }
      const na = Math.round(a * k);
      rgba[o + 3] = na;
      if (na === 0) {
        rgba[o] = 0;
        rgba[o + 1] = 0;
        rgba[o + 2] = 0;
      }
    }
  }
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
        const k = smoothstep01((distEdge - 1.5) / 5.5);
        const na = Math.round(rgba[o + 3] * k);
        rgba[o + 3] = na;
        if (na === 0) {
          rgba[o] = 0;
          rgba[o + 1] = 0;
          rgba[o + 2] = 0;
        }
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
      if (x < 4 || y < 4 || x >= w - 4 || y >= h - 4) {
        rgba[o] = 0;
        rgba[o + 1] = 0;
        rgba[o + 2] = 0;
        rgba[o + 3] = 0;
        continue;
      }
      const r = Math.hypot(x - cx, y - cy);
      if (r >= 98.5) {
        rgba[o] = 0;
        rgba[o + 1] = 0;
        rgba[o + 2] = 0;
        rgba[o + 3] = 0;
      } else if (r > 90.5 && rgba[o + 3] > 0) {
        const k = smoothstep01((98.5 - r) / 8);
        const na = Math.round(rgba[o + 3] * k);
        rgba[o + 3] = na;
        if (na === 0) {
          rgba[o] = 0;
          rgba[o + 1] = 0;
          rgba[o + 2] = 0;
        }
      }
    }
  }
}

function downsample208To104(src208, dst104) {
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

function auditStraightWall(rgba, dim, alphaMin = 20) {
  let minX = dim, maxX = -1, minY = dim, maxY = -1;
  for (let y = 0; y < dim; y++) {
    for (let x = 0; x < dim; x++) {
      if (rgba[(y * dim + x) * 4 + 3] >= alphaMin) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX) return 0;
  let top = 0, bot = 0, left = 0, right = 0;
  for (let x = minX; x <= maxX; x++) {
    if (rgba[(minY * dim + x) * 4 + 3] >= alphaMin) top++;
    if (rgba[(maxY * dim + x) * 4 + 3] >= alphaMin) bot++;
  }
  for (let y = minY; y <= maxY; y++) {
    if (rgba[(y * dim + minX) * 4 + 3] >= alphaMin) left++;
    if (rgba[(y * dim + maxX) * 4 + 3] >= alphaMin) right++;
  }
  return Math.max(top, bot, left, right);
}

function auditStraightWall104(rgba, alphaMin = 20) {
  return auditStraightWall(rgba, 104, alphaMin);
}

function auditOuterBoxWall208(rgba, alphaMin = 16) {
  const cx = 103.5;
  const cy = 103.5;
  let outerViolations = 0;
  for (let y = 0; y < 208; y++) {
    for (let x = 0; x < 208; x++) {
      const a = rgba[(y * 208 + x) * 4 + 3];
      if (a > 0 && (x < 4 || y < 4 || x >= 204 || y >= 204 || Math.hypot(x - cx, y - cy) >= 98.5)) {
        outerViolations++;
      }
    }
  }
  if (outerViolations > 0) {
    throw new Error(`Outer 208 radius violation detected: ${outerViolations} px at border or r >= 98.5`);
  }

  let maxEdgeRun = 0;
  for (const edge of [5, 6, 7, 8, 9, 10, 197, 198, 199, 200, 201, 202]) {
    let runH = 0;
    let runV = 0;
    for (let k = 5; k <= 202; k++) {
      if (rgba[(edge * 208 + k) * 4 + 3] >= alphaMin) {
        runH++;
        if (runH > maxEdgeRun) maxEdgeRun = runH;
      } else {
        runH = 0;
      }
      if (rgba[(k * 208 + edge) * 4 + 3] >= alphaMin) {
        runV++;
        if (runV > maxEdgeRun) maxEdgeRun = runV;
      } else {
        runV = 0;
      }
    }
  }
  return maxEdgeRun;
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
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
    dbgRgba[i * 4] = 18;
    dbgRgba[i * 4 + 1] = 14;
    dbgRgba[i * 4 + 2] = 22;
    dbgRgba[i * 4 + 3] = 255;
  }

  // Full-resolution `208x208` closeup audit strip for Rows 5, 6 (dark #0e0a18 + mid-slate #2e3448), & 7
  const closeupCols = [0, 4, 8, 12, 16, 20, 24, 28];
  const cuPad = 6;
  const cuRows = 4;
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
      name: 'Row 0: Blazing Helios Solar Comet & Star-Glint Muzzle Burst',
      windowSec: 1.0,
      addStarGlints: true,
      falloff104: { cx: 49, cy: 52, rx: 38, ry: 22 },
      layers: [{ def: SOLAR_EFFECT_REGISTRY.solarFireballOrbCell, warmup: 0.1, cfg: { x: 52, y: 52, palette: SOLAR_CORONA_PALETTE } }]
    },
    {
      name: 'Row 1: Braided Heliacal Corona Pillar',
      windowSec: 1.0,
      pillarFalloff: true,
      layers: [{ def: SOLAR_EFFECT_REGISTRY.hellfireMagmaPillarCell, warmup: 0, cfg: { x: 52, y: 52, palette: SOLAR_CORONA_PALETTE } }]
    },
    {
      name: 'Row 2: Black-Sun Eclipse Singularity Ring',
      windowSec: 1.0,
      addStarGlints: true,
      falloff104: { cx: 51.5, cy: 51.5, rx: 43, ry: 36 },
      layers: [{ def: SOLAR_EFFECT_REGISTRY.blackSunEclipseSphereCell, warmup: 0, cfg: { x: 52, y: 52, palette: ECLIPSE_ABYSS_PALETTE } }]
    },
    {
      name: 'Row 3: Grand Helios Astrolabe & Cataclysm Solar Core',
      windowSec: 1.0,
      falloff104: { cx: 50.5, cy: 51.5, rx: 42, ry: 30 },
      layers: [{ def: SOLAR_EFFECT_REGISTRY.cataclysmSolarMeteorCell, warmup: 0.1, cfg: { x: 52, y: 52, palette: SOLAR_CORONA_PALETTE } }]
    },
    {
      name: 'Row 4: Pure 30fps Seamless Golden Solar Astrolabe Magic Circle & Octagram Seal',
      windowSec: 1.0,
      pureMagicCircleRow: true,
      layers: []
    },
    {
      name: 'Row 5: Native 208x208 Dimensional Heavensfall Sky Breach Portal (F00..F29)',
      windowSec: 1.0,
      native208: true,
      layers: [{ def: SOLAR_EFFECT_REGISTRY.astralSkyBreachPortalCell, warmup: 0.1, cfg: { x: 104, y: 104, palette: ECLIPSE_ABYSS_PALETTE } }]
    },
    {
      name: 'Row 6: Native 208x208 Colossal Dreadnought Voronoi Sun-Meteor (F00..F29)',
      windowSec: 1.0,
      native208: true,
      layers: [{ def: SOLAR_EFFECT_REGISTRY.astralMeteorColossusCell, warmup: 0.1, cfg: { x: 104, y: 104, palette: SOLAR_CORONA_PALETTE } }]
    },
    {
      name: 'Row 7: Native 208x208 Voluminous Volcanic Comet Wake & Mach Rings (F00..F29)',
      windowSec: 1.0,
      native208: true,
      layers: [{ def: SOLAR_EFFECT_REGISTRY.astralCataclysmWakeCell, warmup: 0.1, cfg: { x: 104, y: 104, palette: SOLAR_CORONA_PALETTE } }]
    }
  ];

  const surf104 = createPixelSurface(LOGICAL, LOGICAL);
  const pen104 = new ShaderPen(surf104);
  const cell104 = new Uint8Array(LOGICAL * LOGICAL * 4);

  const surf208 = createPixelSurface(CELL, CELL);
  const pen208 = new ShaderPen(surf208);
  const cell208 = new Uint8Array(CELL * CELL * 4);

  let borderClips = 0;
  let maxWallOverall = 0;

  for (let r = 0; r < ROWS; r++) {
    const spec = rowSpecs[r];
    const dt = spec.windowSec / COLS;
    const is208 = Boolean(spec.native208);
    const instances = spec.layers.map((l) => {
      const inst = instantiateShaderEffect(l.def, l.cfg);
      if (l.warmup > 0) inst.step(l.warmup);
      return inst;
    });

    let prevCell = null;
    let transitions = 0;
    let rowMaxWall = 0;

    for (let c = 0; c < COLS; c++) {
      const phase = c / COLS;
      cell104.fill(0);

      if (is208) {
        clearPixelSurface(surf208);
        for (const inst of instances) inst.render(pen208, 'back');
        for (const inst of instances) inst.render(pen208, 'front');
        resolveSurfaceToRGBA(surf208, cell208, 1.12);
        enforceCircularCellMargin208(cell208, CELL, CELL);

        const wall208 = auditOuterBoxWall208(cell208, 16);
        if (wall208 > rowMaxWall) rowMaxWall = wall208;
        if (wall208 > maxWallOverall) maxWallOverall = wall208;

        if (prevCell && !arraysEqual(prevCell, cell208)) {
          transitions++;
        }
        prevCell = new Uint8Array(cell208);

        blitUpscaledNearest(cell208, CELL, CELL, 1, sheetRgba, sheetW, c * CELL, r * CELL);
        downsample208To104(cell208, cell104);
      } else {
        if (spec.pureMagicCircleRow) {
          drawSolarAstrolabeMagicCircle104(cell104, 52, 52, c, COLS);
        } else {
          clearPixelSurface(surf104);
          for (const inst of instances) inst.render(pen104, 'back');
          for (const inst of instances) inst.render(pen104, 'front');
          resolveSurfaceToRGBA(surf104, cell104, 1.14);
        }

        if (spec.falloff104) {
          applyEllipticalFalloff(
            cell104,
            LOGICAL,
            LOGICAL,
            spec.falloff104.cx,
            spec.falloff104.cy,
            spec.falloff104.rx,
            spec.falloff104.ry,
            0.74,
            phase
          );
        }
        if (spec.pillarFalloff) {
          applyPillarOrganicFalloff104(cell104, phase);
        }

        if (spec.addStarGlints) {
          const ga = phase * Math.PI * 2;
          drawStarGlint104(cell104, 52 + Math.cos(ga) * 24, 52 + Math.sin(ga) * 20, 2);
          drawStarGlint104(cell104, 52 - Math.cos(ga) * 24, 52 - Math.sin(ga) * 20, 2);
        }

        const sparkAng = phase * Math.PI * 2 + r * 0.7;
        const sx = Math.round(52 + Math.cos(sparkAng) * 26);
        const sy = Math.round(52 + Math.sin(sparkAng) * 14);
        putPx104(cell104, sx, sy, 254, 240, 138, 220);

        enforceSafeCellMargin104(cell104, LOGICAL, LOGICAL);

        const wall = auditStraightWall104(cell104, 20);
        if (wall > rowMaxWall) rowMaxWall = wall;
        if (wall > maxWallOverall) maxWallOverall = wall;

        if (prevCell && !arraysEqual(prevCell, cell104)) {
          transitions++;
        }
        prevCell = new Uint8Array(cell104);

        blitUpscaledNearest(cell104, LOGICAL, LOGICAL, 2, sheetRgba, sheetW, c * CELL, r * CELL);
      }

      const ox = c * CELL;
      const oy = r * CELL;
      let clipped = false;
      for (let m = 0; m < 4 && !clipped; m++) {
        for (let i = 0; i < CELL; i++) {
          if (
            sheetRgba[((oy + m) * sheetW + (ox + i)) * 4 + 3] > 0 ||
            sheetRgba[((oy + CELL - 1 - m) * sheetW + (ox + i)) * 4 + 3] > 0 ||
            sheetRgba[((oy + i) * sheetW + (ox + m)) * 4 + 3] > 0 ||
            sheetRgba[((oy + i) * sheetW + (ox + CELL - 1 - m)) * 4 + 3] > 0
          ) {
            clipped = true;
            break;
          }
        }
      }
      if (clipped) borderClips++;

      const dx = dbgPad + c * (LOGICAL + dbgPad);
      const dy = dbgPad + r * (LOGICAL + dbgPad);
      for (let yy = 0; yy < LOGICAL; yy++) {
        for (let xx = 0; xx < LOGICAL; xx++) {
          const isEdge = xx === 0 || yy === 0 || xx === LOGICAL - 1 || yy === LOGICAL - 1;
          const o = ((dy + yy) * dbgW + (dx + xx)) * 4;
          dbgRgba[o] = isEdge ? 72 : 28;
          dbgRgba[o + 1] = isEdge ? 38 : 22;
          dbgRgba[o + 2] = isEdge ? 24 : 34;
          dbgRgba[o + 3] = 255;
        }
      }
      alphaCompositeOnto(cell104, LOGICAL, LOGICAL, dbgRgba, dbgW, dx, dy);

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
          alphaCompositeOnto(cell208, CELL, CELL, cuRgba, cuW, cx, cy);
        }
      }

      for (const inst of instances) inst.step(dt);
    }

    const wallCap = is208 ? 24 : 16;
    console.log(
      `[mage_ex_vfx] ${spec.name} -> transitions=${transitions}/29 | maxWall${is208 ? '208' : '104'}=${rowMaxWall}`
    );
    if (transitions < 29) {
      throw new Error(`Static duplicate frames in ${spec.name}: ${transitions}/29`);
    }
    if (rowMaxWall > wallCap) {
      throw new Error(`Flat box cut wall detected in ${spec.name}: maxWall=${rowMaxWall} (>${wallCap})`);
    }
  }

  if (borderClips !== 0) {
    throw new Error(`Border clip violation in mage_ex_vfx.png: ${borderClips}/240`);
  }

  const outVfxPath = path.join(REPO_ROOT, 'assets', 'sprites', 'mage_ex_vfx.png');
  fs.writeFileSync(outVfxPath, encodeRgbaPng(sheetW, sheetH, sheetRgba));
  console.log(`[mage_ex_vfx] Wrote ${outVfxPath} (${sheetW}x${sheetH}), borderClips=${borderClips}/240, maxWall=${maxWallOverall}`);

  fs.mkdirSync(SCRATCH_DIR, { recursive: true });
  const outDbgPath = path.join(SCRATCH_DIR, 'debug_mage_ex_vfx.png');
  fs.writeFileSync(outDbgPath, encodeRgbaPng(dbgW, dbgH, dbgRgba));
  console.log(`[mage_ex_vfx] Wrote QA contact sheet -> ${outDbgPath}`);

  const outCuPath = path.join(SCRATCH_DIR, 'debug_mage_ex_ult_rows567.png');
  fs.writeFileSync(outCuPath, encodeRgbaPng(cuW, cuH, cuRgba));
  console.log(`[mage_ex_vfx] Wrote 208x208 closeup audit -> ${outCuPath}`);
}

bakeVfxSheet();
