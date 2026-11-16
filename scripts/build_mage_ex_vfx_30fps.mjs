#!/usr/bin/env node
/**
 * IGNIS SOL EX (`mage_ex` / `FireMageEx.js`) — Newly Born Next-Gen 30fps VFX Sprite Sheet Builder (`?v=30fps115`).
 *
 * Outputs:
 *   1. `assets/sprites/mage_ex_vfx.png` (6240x1664, 8 rows x 30 cols @ 208x208)
 *   2. Untracked QA contact sheet in scratch dir (`debug_mage_ex_vfx.png`)
 *
 * Invariants:
 *   - 100% `2x2` integer pixel blocks (authored/resolved at `104x104` logical -> upscaled `2x NEAREST` to `208x208`)
 *   - Smooth radial/elliptical distance falloff + soft `enforceSafeCellMargin104` (`0` binary square borders, `0` flat box cuts, `0/240` border clips)
 *   - `29/29` active transitions per row across all 8 rows
 *   - 0 melee slash crescents! Row 4 is a pure 30fps Golden Solar Rune Magic Circle & Starburst Invocation,
 *     supporting `SOLAR TRINITY CATACLYSM`, `BLACK-SUN ECLIPSE SINGULARITY`, & `CATACLYSM: GRAND HELIOS APOCALYPSE`!
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
} from '../src/engine/ArcaneShaderFX.js?v=30fps115';

import {
  SOLAR_CORONA_PALETTE,
  ECLIPSE_ABYSS_PALETTE,
  SOLAR_EFFECT_REGISTRY
} from '../src/engine/shaders/solarShaders.js?v=30fps115';

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
 * Pure High-Sorcery Row 4: 30fps Rotating Golden Solar Astrolabe Magic Circle & 8-Point Starburst Seal!
 * Zero melee slash crescents!
 */
function drawSolarAstrolabeMagicCircle104(rgba, cx, cy, frameIdx, totalFrames) {
  const phase = frameIdx / totalFrames;
  const prog = frameIdx / Math.max(1, totalFrames - 1);
  const rot = phase * Math.PI * 2;
  const expand = prog < 0.2 ? 0.65 + (prog / 0.2) * 0.35 : 1.0;
  const rOuter = 40 * expand;
  const rInner = 27 * expand;
  const dissipate = prog > 0.72 ? (prog - 0.72) / 0.28 : 0;

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

function auditStraightWall104(rgba, alphaMin = 20) {
  let minX = 104, maxX = -1, minY = 104, maxY = -1;
  for (let y = 0; y < 104; y++) {
    for (let x = 0; x < 104; x++) {
      if (rgba[(y * 104 + x) * 4 + 3] >= alphaMin) {
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
    if (rgba[(minY * 104 + x) * 4 + 3] >= alphaMin) top++;
    if (rgba[(maxY * 104 + x) * 4 + 3] >= alphaMin) bot++;
  }
  for (let y = minY; y <= maxY; y++) {
    if (rgba[(y * 104 + minX) * 4 + 3] >= alphaMin) left++;
    if (rgba[(y * 104 + maxX) * 4 + 3] >= alphaMin) right++;
  }
  return Math.max(top, bot, left, right);
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
      name: 'Row 4: Pure 30fps Golden Solar Astrolabe Magic Circle & Octagram Seal',
      windowSec: 1.0,
      pureMagicCircleRow: true,
      falloff104: { cx: 52, cy: 52, rx: 46, ry: 46 },
      layers: []
    },
    {
      name: 'Row 5: Jagged Celestial Heavensfall Sky Breach (2x2 pixel-pure, 0 box cut)',
      windowSec: 1.0,
      native208: true,
      falloff208: { cx: 104, cy: 103.5, rx: 74, ry: 25, diamondK: 0.88 },
      layers: [{ def: SOLAR_EFFECT_REGISTRY.astralSkyBreachPortalCell, warmup: 0.1, cfg: { x: 104, y: 104, palette: ECLIPSE_ABYSS_PALETTE } }]
    },
    {
      name: 'Row 6: Colossal Dreadnought Voronoi Sun-Meteor (2x2 pixel-pure, 0 box cut)',
      windowSec: 1.0,
      native208: true,
      falloff208: { cx: 122, cy: 126, rx: 52, ry: 48, diamondK: 0.24 },
      layers: [{ def: SOLAR_EFFECT_REGISTRY.astralMeteorColossusCell, warmup: 0.1, cfg: { x: 104, y: 104, palette: SOLAR_CORONA_PALETTE } }]
    },
    {
      name: 'Row 7: Enclosed Diagonal Solar Comet Wake Plume & Mach Ring (2x2 pixel-pure, 0 box cut)',
      windowSec: 1.0,
      native208: true,
      falloff208: { cx: 110, cy: 116, rx: 44, ry: 52, diamondK: 0.24 },
      layers: [{ def: SOLAR_EFFECT_REGISTRY.astralCataclysmWakeCell, warmup: 0.1, cfg: { x: 104, y: 104, palette: SOLAR_CORONA_PALETTE } }]
    }
  ];

  const surf104 = createPixelSurface(LOGICAL, LOGICAL);
  const pen104 = new ShaderPen(surf104);
  const cell104 = new Uint8Array(LOGICAL * LOGICAL * 4);

  const surf208 = createPixelSurface(CELL, CELL);
  const pen208 = new ShaderPen(CELL ? surf208 : surf104);
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
      if (spec.pureMagicCircleRow) {
        drawSolarAstrolabeMagicCircle104(cell104, 52, 52, c, COLS);
      } else if (is208) {
        clearPixelSurface(surf208);
        for (const inst of instances) inst.render(pen208, 'back');
        for (const inst of instances) inst.render(pen208, 'front');
        resolveSurfaceToRGBA(surf208, cell208, 1.14);
        if (spec.falloff208) {
          applyEllipticalFalloff(
            cell208,
            CELL,
            CELL,
            spec.falloff208.cx,
            spec.falloff208.cy,
            spec.falloff208.rx,
            spec.falloff208.ry,
            0.70,
            phase,
            spec.falloff208.diamondK || 0
          );
        }
        downsample208To104(cell208, cell104);
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

      for (const inst of instances) inst.step(dt);
    }

    console.log(`[mage_ex_vfx] ${spec.name} -> transitions=${transitions}/29 | maxWall104=${rowMaxWall}`);
    if (transitions < 29) {
      throw new Error(`Static duplicate frames in ${spec.name}: ${transitions}/29`);
    }
    if (rowMaxWall > 16) {
      throw new Error(`Flat box cut wall detected in ${spec.name}: maxWall104=${rowMaxWall} (>16)`);
    }
  }

  if (borderClips !== 0) {
    throw new Error(`Border clip violation in mage_ex_vfx.png: ${borderClips}/240`);
  }

  const outVfxPath = path.join(REPO_ROOT, 'assets', 'sprites', 'mage_ex_vfx.png');
  fs.writeFileSync(outVfxPath, encodeRgbaPng(sheetW, sheetH, sheetRgba));
  console.log(`[mage_ex_vfx] Wrote ${outVfxPath} (${sheetW}x${sheetH}), borderClips=${borderClips}/240, maxWall104=${maxWallOverall}`);

  fs.mkdirSync(SCRATCH_DIR, { recursive: true });
  const outDbgPath = path.join(SCRATCH_DIR, 'debug_mage_ex_vfx.png');
  fs.writeFileSync(outDbgPath, encodeRgbaPng(dbgW, dbgH, dbgRgba));
  console.log(`[mage_ex_vfx] Wrote QA contact sheet -> ${outDbgPath}`);
}

bakeVfxSheet();
