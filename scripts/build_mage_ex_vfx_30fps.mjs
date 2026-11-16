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
 *   - Binary alpha (`0` or `255`), `4px` output safety margin (`0/240` border clips)
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

  //Bayer-stippled inner solar corona aura
  for (let py = 6; py < 98; py++) {
    for (let px = 6; px < 98; px++) {
      const dx = px - cx;
      const dy = py - cy;
      const d = Math.hypot(dx, dy);
      if (d > rOuter - 2 || d < 6) continue;
      const bayer = BAYER4[py & 3][px & 3] / 16.0;
      const wave = 0.5 + 0.5 * Math.sin(Math.atan2(dy, dx) * 8 + rot * 2);
      if (bayer < 0.24 * (1 - dissipate) * wave) {
        putPx104(rgba, px, py, 220, 38, 38, 255);
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

function enforceBinaryAndSafeMargin104(rgba, circular = false, frameIdx = 0) {
  const cx = 51.5;
  const cy = 51.5;
  for (let y = 0; y < 104; y++) {
    for (let x = 0; x < 104; x++) {
      const o = (y * 104 + x) * 4;
      const distEdge = Math.min(x, y, 103 - x, 103 - y);
      if (distEdge < 2) {
        rgba[o] = 0;
        rgba[o + 1] = 0;
        rgba[o + 2] = 0;
        rgba[o + 3] = 0;
        continue;
      }
      let a = rgba[o + 3];
      if (circular) {
        const r = Math.hypot(x - cx, y - cy);
        if (r >= 49.5) {
          a = 0;
        } else if (r > 44.0 && a > 0) {
          const bayer = BAYER4[(y + frameIdx) & 3][(x + frameIdx) & 3] / 16.0;
          const k = (49.5 - r) / 5.5;
          if (k * (a / 255.0) < bayer * 0.85 + 0.12) a = 0;
        }
      } else if (distEdge < 6 && a > 0) {
        const bayer = BAYER4[(y + frameIdx) & 3][(x + frameIdx) & 3] / 16.0;
        const k = (distEdge - 1.5) / 4.5;
        if (k * (a / 255.0) < bayer * 0.8 + 0.15) a = 0;
      }
      const bin = a >= 34 ? 255 : 0;
      rgba[o + 3] = bin;
      if (bin === 0) {
        rgba[o] = 0;
        rgba[o + 1] = 0;
        rgba[o + 2] = 0;
      }
    }
  }
}

function downsample208To104(src208, dst104) {
  for (let y = 0; y < 104; y++) {
    for (let x = 0; x < 104; x++) {
      const o = (y * 104 + x) * 4;
      let r = 0;
      let g = 0;
      let b = 0;
      let aMax = 0;
      let cnt = 0;
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const so = ((y * 2 + dy) * 208 + (x * 2 + dx)) * 4;
          const sa = src208[so + 3];
          if (sa > aMax) aMax = sa;
          if (sa >= 28) {
            r += src208[so];
            g += src208[so + 1];
            b += src208[so + 2];
            cnt++;
          }
        }
      }
      if (cnt > 0) {
        dst104[o] = Math.round(r / cnt);
        dst104[o + 1] = Math.round(g / cnt);
        dst104[o + 2] = Math.round(b / cnt);
        dst104[o + 3] = aMax;
      } else {
        dst104[o] = 0;
        dst104[o + 1] = 0;
        dst104[o + 2] = 0;
        dst104[o + 3] = 0;
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
      const sa = srcRgba[so + 3];
      if (!sa) continue;
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
      layers: [{ def: SOLAR_EFFECT_REGISTRY.solarFireballOrbCell, warmup: 0.1, cfg: { x: 52, y: 52, palette: SOLAR_CORONA_PALETTE } }]
    },
    {
      name: 'Row 1: Braided Heliacal Corona Pillar',
      windowSec: 1.0,
      layers: [{ def: SOLAR_EFFECT_REGISTRY.hellfireMagmaPillarCell, warmup: 0, cfg: { x: 52, y: 52, palette: SOLAR_CORONA_PALETTE } }]
    },
    {
      name: 'Row 2: Black-Sun Eclipse Singularity Ring',
      windowSec: 1.0,
      addStarGlints: true,
      layers: [{ def: SOLAR_EFFECT_REGISTRY.blackSunEclipseSphereCell, warmup: 0, cfg: { x: 52, y: 52, palette: ECLIPSE_ABYSS_PALETTE } }]
    },
    {
      name: 'Row 3: Grand Helios Astrolabe & Cataclysm Solar Core',
      windowSec: 1.0,
      layers: [{ def: SOLAR_EFFECT_REGISTRY.cataclysmSolarMeteorCell, warmup: 0.1, cfg: { x: 52, y: 52, palette: SOLAR_CORONA_PALETTE } }]
    },
    {
      name: 'Row 4: Pure 30fps Golden Solar Astrolabe Magic Circle & Octagram Seal',
      windowSec: 1.0,
      pureMagicCircleRow: true,
      layers: []
    },
    {
      name: 'Row 5: Jagged Celestial Heavensfall Sky Breach (2x2 pixel-pure)',
      windowSec: 1.0,
      native208: true,
      circular: true,
      layers: [{ def: SOLAR_EFFECT_REGISTRY.astralSkyBreachPortalCell, warmup: 0.1, cfg: { x: 104, y: 104, palette: ECLIPSE_ABYSS_PALETTE } }]
    },
    {
      name: 'Row 6: Colossal Dreadnought Voronoi Sun-Meteor (2x2 pixel-pure)',
      windowSec: 1.0,
      native208: true,
      circular: true,
      layers: [{ def: SOLAR_EFFECT_REGISTRY.astralMeteorColossusCell, warmup: 0.1, cfg: { x: 104, y: 104, palette: SOLAR_CORONA_PALETTE } }]
    },
    {
      name: 'Row 7: Enclosed Diagonal Solar Comet Wake Plume & Mach Ring (2x2 pixel-pure)',
      windowSec: 1.0,
      native208: true,
      circular: true,
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

    for (let c = 0; c < COLS; c++) {
      cell104.fill(0);
      if (spec.pureMagicCircleRow) {
        drawSolarAstrolabeMagicCircle104(cell104, 52, 52, c, COLS);
      } else if (is208) {
        clearPixelSurface(surf208);
        for (const inst of instances) inst.render(pen208, 'back');
        for (const inst of instances) inst.render(pen208, 'front');
        resolveSurfaceToRGBA(surf208, cell208, 1.14);
        downsample208To104(cell208, cell104);
      } else {
        clearPixelSurface(surf104);
        for (const inst of instances) inst.render(pen104, 'back');
        for (const inst of instances) inst.render(pen104, 'front');
        resolveSurfaceToRGBA(surf104, cell104, 1.14);
      }

      if (spec.addStarGlints) {
        const ga = (c / COLS) * Math.PI * 2;
        drawStarGlint104(cell104, 52 + Math.cos(ga) * 28, 52 + Math.sin(ga) * 28, 2);
        drawStarGlint104(cell104, 52 - Math.cos(ga) * 28, 52 - Math.sin(ga) * 28, 2);
      }

      const sparkAng = (c / COLS) * Math.PI * 2 + r * 0.7;
      const sx = Math.round(52 + Math.cos(sparkAng) * 34);
      const sy = Math.round(52 + Math.sin(sparkAng) * 34);
      putPx104(cell104, sx, sy, 254, 240, 138, 255);

      enforceBinaryAndSafeMargin104(cell104, Boolean(spec.circular), c);

      if (prevCell && !arraysEqual(prevCell, cell104)) {
        transitions++;
      }
      prevCell = new Uint8Array(cell104);

      blitUpscaledNearest(cell104, LOGICAL, LOGICAL, 2, sheetRgba, sheetW, c * CELL, r * CELL);

      const ox = c * CELL;
      const oy = r * CELL;
      let clipped = false;
      for (let i = 0; i < CELL; i++) {
        if (
          sheetRgba[(oy * sheetW + (ox + i)) * 4 + 3] > 0 ||
          sheetRgba[((oy + CELL - 1) * sheetW + (ox + i)) * 4 + 3] > 0 ||
          sheetRgba[((oy + i) * sheetW + ox) * 4 + 3] > 0 ||
          sheetRgba[((oy + i) * sheetW + (ox + CELL - 1)) * 4 + 3] > 0
        ) {
          clipped = true;
          break;
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

    console.log(`[mage_ex_vfx] ${spec.name} -> transitions=${transitions}/29`);
    if (transitions < 29) {
      throw new Error(`Static duplicate frames in ${spec.name}: ${transitions}/29`);
    }
  }

  if (borderClips !== 0) {
    throw new Error(`Border clip violation in mage_ex_vfx.png: ${borderClips}/240`);
  }

  const outVfxPath = path.join(REPO_ROOT, 'assets', 'sprites', 'mage_ex_vfx.png');
  fs.writeFileSync(outVfxPath, encodeRgbaPng(sheetW, sheetH, sheetRgba));
  console.log(`[mage_ex_vfx] Wrote ${outVfxPath} (${sheetW}x${sheetH}), borderClips=${borderClips}/240`);

  fs.mkdirSync(SCRATCH_DIR, { recursive: true });
  const outDbgPath = path.join(SCRATCH_DIR, 'debug_mage_ex_vfx.png');
  fs.writeFileSync(outDbgPath, encodeRgbaPng(dbgW, dbgH, dbgRgba));
  console.log(`[mage_ex_vfx] Wrote QA contact sheet -> ${outDbgPath}`);
}

bakeVfxSheet();
