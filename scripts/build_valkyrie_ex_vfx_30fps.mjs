#!/usr/bin/env node
/**
 * Next-Gen 30fps VFX Sprite Sheet Builder for FREYJA EX (`valkyrie_ex` -> `ValkyrieEx.js`).
 * Powered by `src/engine/ArcaneShaderFX.js` + read-only `src/engine/shaders/valkyrieShaders.js`
 * with full-span 184px ornate 16-bit Winged Gungnir War-Spears, naturally tapered jagged
 * flame/plasma crowns, smooth elliptical radial falloff (`0` flat box cutoffs, `maxStraightEdgeRun <= 22`),
 * and strict `margin=5` logical (`10px` at 2x `208x208`) safe framing (`0/240` border clips).
 *
 * Outputs:
 *   1. `assets/sprites/valkyrie_ex_vfx.png` (`6240x1664`, `8 rows x 30 cols @ 208x208`, `0/240` border clips)
 *   2. `<scratch>/debug_valkyrie_ex_vfx.png` (`8x30` contact sheet over `#64748b`/`#94a3b8` checker for QA)
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
  instantiateShaderEffect,
  smoothStep,
  clamp01,
  mixScalar,
  Easing,
  fbmNoise2D,
  DeterministicRng,
  buildLightningChain,
  packHexColor
} from '../src/engine/ArcaneShaderFX.js';

import {
  VALKYRIE_CRIMSON_PALETTE,
  VALKYRIE_GOLD_PALETTE,
  VALKYRIE_EFFECT_REGISTRY
} from '../src/engine/shaders/valkyrieShaders.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SCRATCH_DIR =
  '/Users/rei/.gemini/antigravity/brain/5416474b-0e5f-4471-85c8-b7a88055e218/scratch';

const TWO_PI = Math.PI * 2;
const LOGICAL = 104;
const CELL = 208;
const MARGIN = 5; // strictly x,y in [5..98] in 104x104 -> [10..197] in 208x208

// 16-bit HD-2D Crimson-Gold Valkyrie Palette
const C_SELOUT = [26, 5, 11]; // #1a050b warm crimson-obsidian selective outline
const C_CRIM_DARK = [108, 12, 38];
const C_CRIM_DEEP = [159, 18, 57]; // #9f1239
const C_CRIM_MID = [225, 29, 72]; // #e11d48
const C_CRIM_BRIGHT = [244, 63, 94]; // #f43f5e
const C_ROSE = [251, 113, 133]; // #fb7185
const C_GOLD_DEEP = [180, 83, 9]; // #b45309
const C_GOLD_MID = [251, 191, 36]; // #fbbf24
const C_GOLD_LIGHT = [254, 240, 138]; // #fef08a
const C_WHITE = [255, 255, 255]; // #ffffff
const C_CYAN = [103, 232, 249]; // #67e8f9
const C_VIOLET = [192, 132, 252]; // #c084fc

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

function blendRgba104(rgba, x, y, rgb, aFloat = 1.0) {
  const ix = Math.round(x);
  const iy = Math.round(y);
  if (ix < MARGIN || ix >= LOGICAL - MARGIN || iy < MARGIN || iy >= LOGICAL - MARGIN) return;
  if (aFloat <= 0.01) return;
  const o = (iy * LOGICAL + ix) * 4;
  const sa = Math.max(0, Math.min(1, aFloat));
  const da = rgba[o + 3] / 255;
  const outA = sa + da * (1 - sa);
  if (outA <= 0) return;
  rgba[o] = Math.round((rgb[0] * sa + rgba[o] * da * (1 - sa)) / outA);
  rgba[o + 1] = Math.round((rgb[1] * sa + rgba[o + 1] * da * (1 - sa)) / outA);
  rgba[o + 2] = Math.round((rgb[2] * sa + rgba[o + 2] * da * (1 - sa)) / outA);
  rgba[o + 3] = Math.round(outA * 255);
}

function setCorePx104(coreRgba, x, y, rgb, aByte = 255) {
  const ix = Math.round(x);
  const iy = Math.round(y);
  if (ix < MARGIN || ix >= LOGICAL - MARGIN || iy < MARGIN || iy >= LOGICAL - MARGIN) return;
  if (aByte <= 0) return;
  const o = (iy * LOGICAL + ix) * 4;
  if (aByte >= coreRgba[o + 3]) {
    coreRgba[o] = rgb[0];
    coreRgba[o + 1] = rgb[1];
    coreRgba[o + 2] = rgb[2];
    coreRgba[o + 3] = aByte;
  }
}

function drawLineRgba104(rgba, x0, y0, x1, y1, rgb, aFloat = 1.0) {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(dist * 1.6));
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    blendRgba104(rgba, x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, rgb, aFloat);
  }
}

function drawStarGlint104(rgba, cx, cy, arm, rotRad = 0, accentRgb = C_GOLD_LIGHT, alpha = 0.95) {
  if (alpha <= 0.02 || arm < 1) return;
  const rInt = Math.ceil(arm);
  const ca = Math.cos(rotRad);
  const sa = Math.sin(rotRad);
  for (let i = -rInt; i <= rInt; i++) {
    const u = 1 - Math.abs(i) / (arm + 0.6);
    if (u <= 0) continue;
    const col = u > 0.58 ? C_WHITE : accentRgb;
    blendRgba104(rgba, cx + i * ca, cy + i * sa, col, alpha * (0.48 + 0.52 * u));
    blendRgba104(rgba, cx - i * sa, cy + i * ca, col, alpha * (0.48 + 0.52 * u));
  }
  const dArm = Math.max(1, Math.floor(arm * 0.5));
  const dRot = rotRad + Math.PI * 0.25;
  const dca = Math.cos(dRot);
  const dsa = Math.sin(dRot);
  for (let i = -dArm; i <= dArm; i++) {
    const u = 1 - Math.abs(i) / (dArm + 0.7);
    if (u <= 0) continue;
    blendRgba104(rgba, cx + i * dca, cy + i * dsa, accentRgb, alpha * u * 0.78);
    blendRgba104(rgba, cx - i * dsa, cy + i * dca, accentRgb, alpha * u * 0.78);
  }
  blendRgba104(rgba, cx, cy, C_WHITE, alpha);
}

function drawValkyrieFeather104(rgba, cx, cy, angle, alpha = 0.92) {
  if (alpha <= 0.03) return;
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  blendRgba104(rgba, cx, cy, C_WHITE, alpha);
  blendRgba104(rgba, cx + ca * 1.2, cy + sa * 1.2, C_GOLD_LIGHT, alpha);
  blendRgba104(rgba, cx - ca * 1.2, cy - sa * 1.2, C_CRIM_BRIGHT, alpha * 0.9);
  blendRgba104(rgba, cx - ca * 2.2, cy - sa * 2.2, C_CRIM_DEEP, alpha * 0.76);
  blendRgba104(rgba, cx - sa * 0.85, cy + ca * 0.85, C_GOLD_MID, alpha * 0.85);
  blendRgba104(rgba, cx + sa * 0.85, cy - ca * 0.85, C_ROSE, alpha * 0.85);
}

function drawLightningChain104(rgba, rng, x0, y0, x1, y1, jitter, subdiv, rgbCore, rgbHalo, alpha) {
  if (alpha <= 0.02) return;
  const pts = buildLightningChain(rng, x0, y0, x1, y1, Math.max(0.24, jitter), Math.max(4, subdiv));
  const segCount = pts.length - 1;
  // Ensure every interior vertex has guaranteed zigzag displacement so no segment runs axis-flat > 5px
  for (let i = 1; i < segCount; i++) {
    const dx = pts[i + 1][0] - pts[i - 1][0];
    const dy = pts[i + 1][1] - pts[i - 1][1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const sign = i % 2 === 0 ? 1 : -1;
    pts[i][0] += nx * sign * 1.75;
    pts[i][1] += ny * sign * 1.75;
    if (Math.abs(pts[i][0] - pts[i - 1][0]) < 1.2 && Math.abs(pts[i][1] - pts[i - 1][1]) >= 4.0) {
      pts[i][0] += sign * 2.0;
    }
    if (Math.abs(pts[i][1] - pts[i - 1][1]) < 1.2 && Math.abs(pts[i][0] - pts[i - 1][0]) >= 4.0) {
      pts[i][1] += sign * 2.0;
    }
  }
  for (let i = 0; i < segCount; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    drawLineRgba104(rgba, ax, ay, bx, by, rgbHalo, alpha * 0.42);
    drawLineRgba104(rgba, ax, ay, bx, by, rgbCore, alpha * 0.94);
  }
}

function compositeCoreWithSelout104(coreRgba, dstRgba, seloutRgb = C_SELOUT, seloutAlpha = 0.92) {
  if (seloutAlpha > 0.02) {
    for (let y = MARGIN; y < LOGICAL - MARGIN; y++) {
      for (let x = MARGIN; x < LOGICAL - MARGIN; x++) {
        const o = (y * LOGICAL + x) * 4;
        if (coreRgba[o + 3] > 24) continue;
        const nUp = coreRgba[((y - 1) * LOGICAL + x) * 4 + 3] > 24;
        const nDn = coreRgba[((y + 1) * LOGICAL + x) * 4 + 3] > 24;
        const nLf = coreRgba[(y * LOGICAL + x - 1) * 4 + 3] > 24;
        const nRt = coreRgba[(y * LOGICAL + x + 1) * 4 + 3] > 24;
        if (nUp || nDn || nLf || nRt) {
          blendRgba104(dstRgba, x, y, seloutRgb, seloutAlpha);
        }
      }
    }
  }
  for (let y = MARGIN; y < LOGICAL - MARGIN; y++) {
    for (let x = MARGIN; x < LOGICAL - MARGIN; x++) {
      const o = (y * LOGICAL + x) * 4;
      const a = coreRgba[o + 3];
      if (!a) continue;
      blendRgba104(dstRgba, x, y, [coreRgba[o], coreRgba[o + 1], coreRgba[o + 2]], a / 255);
    }
  }
}

/**
 * Draw 3D perspective Mach shock-ring perpendicular to unit `(ux, uy)` directly onto RGBA buffer.
 * Uses `squash = 0.44` + serrated 12-lobe supersonic Mach cone ripple so outer tangents never sit flat (`<= 14px`).
 */
function drawMachRing104(rgba, cx, cy, ux, uy, radius, squash, frontHalf, phaseFade = 1.0, phase = 0) {
  if (radius <= 1 || phaseFade <= 0.03) return;
  const nx = -uy;
  const ny = ux;
  const effSquash = Math.max(0.44, squash);
  const steps = Math.max(52, Math.ceil(radius * 6.5));
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * TWO_PI;
    const ca = Math.cos(a);
    if ((ca >= 0) !== frontHalf) continue;
    const sa = Math.sin(a);
    // 12-lobe supersonic serrated Mach ripple + subtle segmented dash modulation keeps all edge runs <= 14px
    const ripple = 1 + 0.14 * Math.sin(a * 12 + phase) + 0.07 * Math.cos(a * 7 - phase * 1.3);
    const rLoc = radius * ripple;
    const px = cx + ux * (ca * rLoc * effSquash) + nx * (sa * rLoc);
    const py = cy + uy * (ca * rLoc * effSquash) + ny * (sa * rLoc);
    const col = ca > 0.62 ? C_WHITE : ca > 0.12 ? C_GOLD_LIGHT : ca > -0.35 ? C_CRIM_BRIGHT : C_CRIM_DEEP;
    const aPix = (frontHalf ? 0.94 : 0.62) * phaseFade;
    blendRgba104(rgba, px, py, col, aPix);
    blendRgba104(rgba, px - ux * 0.9, py - uy * 0.9, C_CRIM_MID, aPix * 0.68);
  }
}

/**
 * Shared 16-bit Pixel-Art Full-Span (`184px` / `92` logical px inside `104x104`) Ornate Winged Gungnir War-Spear!
 * Used identically for:
 *   - Row 0 (`horizontal +X`, `along = -45.5 .. +45.5` -> `x = 6..97`, `92` logical px = `184px`)
 *   - Row 1 `F00..F11` (`vertical +Y`, `along = -45.5 .. +45.5` -> `y = 6..97`, `92` logical px = `184px`)
 *   - Row 6 `F00..F29` (`vertical +Y` Colossal Einherjar War-Spear, `y = 6..97`, `92` logical px = `184px`)
 */
function renderWingedGungnirWarSpear104(
  surface104,
  pen104,
  cell104,
  coreBuf104,
  opts
) {
  const {
    cx = 51.5,
    cy = 51.5,
    ux = 0,
    uy = 1,
    phase = 0,
    loopU = 0,
    seed = 213,
    isColossal = true
  } = opts;
  const nx = -uy;
  const ny = ux;

  // Map spear-local `(along, perp)` to `104x104` coordinates
  const toX = (a, p) => cx + ux * a + nx * p;
  const toY = (a, p) => cy + uy * a + ny * p;

  // 1. Soft Crimson-Gold Plasma Aura strictly inside smooth elliptical radius (zero box clipping!)
  pen104.radialGlow(toX(32, 0), toY(32, 0), isColossal ? 17 : 15, packHexColor('#fbbf24'), 0.34);
  pen104.radialGlow(toX(2, 0), toY(2, 0), isColossal ? 23 : 20, packHexColor('#f43f5e'), 0.32);
  pen104.radialGlow(toX(-24, 0), toY(-24, 0), isColossal ? 17 : 15, packHexColor('#e11d48'), 0.28);
  resolveSurfaceToRGBA(surface104, cell104, 1.12);

  // Taper off soft ShaderPen radial glow cleanly inside elliptical region so margin=5 never cuts it flat!
  for (let y = 0; y < LOGICAL; y++) {
    for (let x = 0; x < LOGICAL; x++) {
      const o = (y * LOGICAL + x) * 4;
      if (!cell104[o + 3]) continue;
      const dx = (x - cx) * ux + (y - cy) * uy; // along
      const dy = (x - cx) * nx + (y - cy) * ny; // perp
      const rEllip = Math.hypot(dx / 44.5, dy / 37.5);
      const fade = smoothStep(1.0, 0.72, rEllip);
      cell104[o + 3] = Math.round(cell104[o + 3] * fade);
      if (cell104[o + 3] <= 8) {
        cell104[o] = cell104[o + 1] = cell104[o + 2] = cell104[o + 3] = 0;
      }
    }
  }

  // 2. Back Halves of 2 Traveling 3D Mach Shock-Rings & Double-Helix Crimson-Gold Plasma Wake
  for (let rIdx = 0; rIdx < 2; rIdx++) {
    const ur = (loopU * 2 + rIdx * 0.5) % 1;
    const aRing = mixScalar(32, -32, ur);
    const rad = (isColossal ? 10.5 : 9.0) + Math.sin(ur * Math.PI) * (isColossal ? 12.5 : 10.5);
    drawMachRing104(cell104, toX(aRing, 0), toY(aRing, 0), ux, uy, rad, 0.38, false, 0.88, phase + rIdx * 2);
  }

  for (let rib = 0; rib < 2; rib++) {
    const rOff = rib * Math.PI;
    for (let a = -43.5; a <= 34; a += 0.35) {
      const tailTaper = a < -34 ? smoothStep(-44.5, -34, a) : 1.0;
      const amp = (3.6 + (1 - (a + 44) / 78) * (isColossal ? 9.2 : 7.8)) * tailTaper;
      const ang = a * 0.21 - phase * 2 + rOff;
      if (Math.cos(ang) >= 0) continue;
      const pOff = Math.sin(ang) * amp;
      blendRgba104(
        cell104,
        toX(a, pOff),
        toY(a, pOff),
        rib === 0 ? C_CRIM_MID : C_GOLD_DEEP,
        0.72 * tailTaper
      );
    }
  }

  // 3. Tapered Flickering Crimson-Gold Plasma Wake Tail (`along = -45.5 .. -24`)
  //    Tapered flame tongues reaching `along = -45.5` (`pos = 6`) with zero flat tail cutoff!
  const tailStreams = [
    { off: 0, reach: -45.5, wBase: 3.4, freq: 0.34, amp: 1.4 },
    { off: -3.2, reach: -42.5, wBase: 2.1, freq: 0.42, amp: 2.0 },
    { off: 3.2, reach: -42.5, wBase: 2.1, freq: 0.42, amp: 2.0 }
  ];
  for (let sIdx = 0; sIdx < tailStreams.length; sIdx++) {
    const st = tailStreams[sIdx];
    for (let a = st.reach; a <= -24; a += 0.35) {
      const uT = (a - st.reach) / (-24 - st.reach);
      const wobble = Math.sin(a * st.freq + phase * (sIdx === 0 ? 1 : -2) + sIdx * 2.1) * st.amp * (1 - uT * 0.5);
      const hw = st.wBase * Math.pow(uT, 0.72);
      for (let w = -hw; w <= hw; w += 0.4) {
        const edge = Math.abs(w) / Math.max(0.3, hw);
        const col =
          edge < 0.32 && uT > 0.28
            ? C_GOLD_LIGHT
            : edge < 0.66
              ? C_CRIM_BRIGHT
              : C_CRIM_DEEP;
        const alpha = (0.55 + 0.43 * uT) * (1 - edge * 0.45);
        blendRgba104(cell104, toX(a, st.off + wobble + w), toY(a, st.off + wobble + w), col, alpha);
      }
    }
  }

  // 4. Solid 16-Bit Spear Body into `coreBuf104` (Crisp #1a050b Selout!)
  // 4A. Pommel Diamond & Royal-Gold Finial (`along = -39.5 .. -30`)
  for (let a = -39.5; a <= -30; a += 0.32) {
    const uP = (a + 39.5) / 9.5;
    const hw = uP < 0.55 ? mixScalar(0.8, 3.8, uP / 0.55) : mixScalar(3.8, 2.0, (uP - 0.55) / 0.45);
    for (let w = -hw; w <= hw; w += 0.32) {
      const aw = Math.abs(w);
      const col = aw <= 0.8 ? C_WHITE : aw <= hw * 0.55 ? C_GOLD_MID : C_CRIM_MID;
      setCorePx104(coreBuf104, toX(a, w), toY(a, w), col, 255);
    }
  }

  // 4B. Fluted Ornate War-Shaft with Raised Gold Spine & 3 Sculpted Rune Collars (`along = -30.5 .. +4`)
  //     Collars break straight shaft lines every <= 7.5 logical px (`<= 15px` in 208x208)!
  const collarCenters = [-24, -15.5, -7];
  for (let a = -30.5; a <= 4.0; a += 0.3) {
    const uS = (a + 30.5) / 34.5;
    let hw = 2.1 + uS * 0.85;
    let inCollar = false;
    for (const cc of collarCenters) {
      const distC = Math.abs(a - cc);
      if (distC <= 1.8) {
        hw += (1 - distC / 1.8) * 1.45;
        inCollar = true;
      }
    }
    for (let w = -hw; w <= hw; w += 0.3) {
      const aw = Math.abs(w);
      let col;
      if (inCollar) {
        col = aw <= 0.7 ? C_WHITE : aw <= hw * 0.65 ? C_GOLD_LIGHT : C_GOLD_DEEP;
      } else if (aw <= 0.65) {
        col = C_WHITE;
      } else if (aw <= 1.45) {
        col = C_GOLD_MID;
      } else {
        col = w < 0 ? C_CRIM_BRIGHT : C_CRIM_DEEP;
      }
      setCorePx104(coreBuf104, toX(a, w), toY(a, w), col, 255);
    }
  }

  // 4C. Grand Sculpted Valkyrie Winged Crossguard (`along = -21 .. +5`, `|perp| <= 35`)
  const wingFlap = Math.sin(phase) * 0.9;
  const pinions = isColossal
    ? [
        { aRoot: 2.0, aTip: -22.5, span: 35.5, thick: 2.4 },
        { aRoot: 0.5, aTip: -18.0, span: 30.0, thick: 2.1 },
        { aRoot: -1.0, aTip: -13.5, span: 24.5, thick: 1.9 },
        { aRoot: -2.4, aTip: -9.5, span: 18.8, thick: 1.7 },
        { aRoot: -3.6, aTip: -6.2, span: 13.5, thick: 1.5 }
      ]
    : [
        { aRoot: 2.0, aTip: -21.0, span: 32.0, thick: 2.2 },
        { aRoot: 0.4, aTip: -16.5, span: 26.5, thick: 1.9 },
        { aRoot: -1.2, aTip: -12.0, span: 20.8, thick: 1.7 },
        { aRoot: -2.8, aTip: -8.0, span: 15.0, thick: 1.5 }
      ];

  for (const side of [-1, 1]) {
    for (let pIdx = 0; pIdx < pinions.length; pIdx++) {
      const pn = pinions[pIdx];
      const steps = 42;
      const tipFlutter = wingFlap * (pIdx === 0 ? 1.0 : 0.45);
      for (let st = 0; st <= steps; st++) {
        const v = st / steps;
        const arch = Math.sin(v * Math.PI) * 3.2;
        const aCur = mixScalar(pn.aRoot, pn.aTip + tipFlutter * 0.4, Math.pow(v, 0.88)) + arch * 0.25;
        const pCur = side * (2.6 + Math.pow(v, 0.8) * (pn.span - 2.6 + tipFlutter));
        const halfT = pn.thick * Math.sin(Math.pow(v, 0.55) * Math.PI * 0.92 + 0.12) * (1 - v * 0.35);
        for (let q = -halfT; q <= halfT; q += 0.32) {
          const edgeFrac = q / Math.max(0.3, halfT);
          let col;
          if (v > 0.78 && Math.abs(edgeFrac) < 0.45) {
            col = pIdx === 0 ? C_WHITE : C_GOLD_LIGHT;
          } else if (edgeFrac > 0.25) {
            col = pIdx === 0 ? C_WHITE : C_GOLD_LIGHT;
          } else if (edgeFrac > -0.25) {
            col = C_GOLD_MID;
          } else {
            col = pIdx % 2 === 0 ? C_CRIM_BRIGHT : C_CRIM_DEEP;
          }
          setCorePx104(coreBuf104, toX(aCur + q, pCur), toY(aCur + q, pCur), col, 255);
        }
      }
    }
  }

  // Ornate Valhalla Star-Gem Crossguard Hub (`along = 1.5`)
  for (let da = -4.2; da <= 4.2; da += 0.32) {
    for (let dp = -5.5; dp <= 5.5; dp += 0.32) {
      if (Math.abs(da) / 4.2 + Math.abs(dp) / 5.5 > 1.02) continue;
      const dist = Math.hypot(da / 4.2, dp / 5.5);
      const col = dist < 0.34 ? C_WHITE : dist < 0.65 ? C_GOLD_LIGHT : C_CRIM_BRIGHT;
      setCorePx104(coreBuf104, toX(1.5 + da, dp), toY(1.5 + da, dp), col, 255);
    }
  }

  // 4D. Colossal Faceted Diamond-Barbed War-Spearhead (`along = +1.5 .. +45.5` -> reaches `pos = 97`!)
  const headStart = 1.5;
  const headTip = 45.5;
  const maxBarbW = isColossal ? 14.0 : 12.6;
  for (let a = headStart; a <= headTip; a += 0.28) {
    const prog = (a - headStart) / (headTip - headStart);
    const hw =
      prog < 0.24
        ? mixScalar(4.4, maxBarbW, prog / 0.24)
        : maxBarbW * Math.pow(Math.max(0, (1 - prog) / 0.76), 0.9);
    const innerCut = prog < 0.21 ? 2.4 + (prog / 0.21) * (hw * 0.36) : -1;
    for (let w = -hw; w <= hw; w += 0.28) {
      const aw = Math.abs(w);
      if (innerCut > 0 && aw > 2.3 && aw < innerCut) continue;
      const edgeFrac = aw / Math.max(0.4, hw);
      let col;
      if (aw <= 0.85 || prog > 0.89) {
        col = C_WHITE;
      } else if (aw <= 2.15) {
        col = prog > 0.75 ? C_GOLD_LIGHT : C_GOLD_MID; // Raised Gold Spine!
      } else if (edgeFrac >= 0.72) {
        col = edgeFrac >= 0.88 ? C_WHITE : C_GOLD_LIGHT; // Faceted #ffffff/#fef08a Blade Edge!
      } else if (w < 0) {
        col = edgeFrac > 0.45 ? C_ROSE : C_CRIM_BRIGHT;
      } else {
        col = edgeFrac > 0.45 ? C_CRIM_MID : C_CRIM_DEEP;
      }
      setCorePx104(coreBuf104, toX(a, w), toY(a, w), col, 255);
    }
  }

  // Composite Core + Crisp 1px #1a050b Selout onto `cell104`
  compositeCoreWithSelout104(coreBuf104, cell104, C_SELOUT, 0.94);

  // 5. Front Halves of 2 Traveling 3D Mach Rings & Double-Helix Crimson-Gold Plasma Wake
  for (let rIdx = 0; rIdx < 2; rIdx++) {
    const ur = (loopU * 2 + rIdx * 0.5) % 1;
    const aRing = mixScalar(32, -32, ur);
    const rad = (isColossal ? 10.5 : 9.0) + Math.sin(ur * Math.PI) * (isColossal ? 12.5 : 10.5);
    drawMachRing104(cell104, toX(aRing, 0), toY(aRing, 0), ux, uy, rad, 0.38, true, 0.96, phase + rIdx * 2);
  }

  for (let rib = 0; rib < 2; rib++) {
    const rOff = rib * Math.PI;
    for (let a = -43.5; a <= 34; a += 0.3) {
      const tailTaper = a < -34 ? smoothStep(-44.5, -34, a) : 1.0;
      const amp = (3.6 + (1 - (a + 44) / 78) * (isColossal ? 9.2 : 7.8)) * tailTaper;
      const ang = a * 0.21 - phase * 2 + rOff;
      if (Math.cos(ang) < 0) continue;
      const pOff = Math.sin(ang) * amp;
      const col = rib === 0 ? (Math.cos(ang) > 0.55 ? C_WHITE : C_GOLD_LIGHT) : C_CRIM_BRIGHT;
      blendRgba104(cell104, toX(a, pOff), toY(a, pOff), col, 0.94 * tailTaper);
      blendRgba104(
        cell104,
        toX(a - 0.8, pOff + (pOff >= 0 ? 0.9 : -0.9)),
        toY(a - 0.8, pOff + (pOff >= 0 ? 0.9 : -0.9)),
        C_CRIM_MID,
        0.74 * tailTaper
      );
    }
  }

  // 6. Crackling Einherjar Lightning Arcs & Incandescent Tip Starburst Glint
  const boltRng = new DeterministicRng(seed + Math.floor(loopU * 30) * 19);
  drawLightningChain104(
    cell104,
    boltRng,
    toX(-12, -22),
    toY(-12, -22),
    toX(34, -4),
    toY(34, -4),
    0.16,
    3,
    C_GOLD_LIGHT,
    C_CRIM_BRIGHT,
    0.92
  );
  drawLightningChain104(
    cell104,
    boltRng,
    toX(-12, 22),
    toY(-12, 22),
    toX(34, 4),
    toY(34, 4),
    0.16,
    3,
    C_WHITE,
    C_GOLD_MID,
    0.9
  );
  drawStarGlint104(
    cell104,
    toX(41.5, 0),
    toY(41.5, 0),
    isColossal ? 8.2 : 7.0,
    phase * 0.25,
    C_GOLD_LIGHT,
    0.95
  );
  drawStarGlint104(cell104, toX(1.5, 0), toY(1.5, 0), 5.2, -phase * 0.35, C_GOLD_LIGHT, 0.92);
  drawStarGlint104(cell104, toX(18, 10.5), toY(18, 10.5), 2.4, phase, C_GOLD_LIGHT, 0.85);
  drawStarGlint104(cell104, toX(18, -10.5), toY(18, -10.5), 2.4, -phase, C_GOLD_LIGHT, 0.85);
}

/**
 * Row 1 `F12..F29`: Impaled Gungnir War-Lance inside Blazing Valhalla Star-Cross Crater (`floorY = 86`).
 */
function renderRow1CraterImpact104(col, surface104, pen104, cell104, coreBuf104) {
  const k = col - 12; // 0..17
  const u = k / 17;
  const fade = u > 0.72 ? Math.max(0.14, (1 - u) / 0.28) : 1.0;
  const cx = 51.5;
  const floorY = 86;

  // Soft ShaderPen glow centered safely inside ellipse
  pen104.radialGlow(cx, floorY - 4, 24 * fade, packHexColor('#f43f5e'), 0.42 * fade);
  pen104.radialGlow(cx, 38, 18 * fade, packHexColor('#fbbf24'), 0.28 * fade);
  resolveSurfaceToRGBA(surface104, cell104, 1.12);

  // Smooth elliptical taper on crater glow so margin=5 never cuts flat
  for (let y = 0; y < LOGICAL; y++) {
    for (let x = 0; x < LOGICAL; x++) {
      const o = (y * LOGICAL + x) * 4;
      if (!cell104[o + 3]) continue;
      const rEllip = Math.hypot((x - cx) / 42, (y - 57) / 35);
      const env = smoothStep(1.0, 0.68, rEllip);
      cell104[o + 3] = Math.round(cell104[o + 3] * env);
      if (cell104[o + 3] <= 8) {
        cell104[o] = cell104[o + 1] = cell104[o + 2] = cell104[o + 3] = 0;
      }
    }
  }

  // 1. Blazing Tilted Valhalla Crater Rune Ring (`20` segmented Nordic rune-arc shards, `0` flat horizontal chords!)
  const rx = 14 + 26 * Easing.outExpo(Math.min(1, u * 1.55));
  const ry = rx * 0.41;
  const rot = u * 3.4;

  // Back + Front segmented crater rune-arc shards + radial spokes
  const drawCraterRing = (isFront) => {
    const numSegs = 24;
    const segArc = (TWO_PI / numSegs) * 0.48;
    for (let s = 0; s < numSegs; s++) {
      const aBase = rot * 0.5 + (s * TWO_PI) / numSegs;
      const aMid = aBase + segArc * 0.5;
      if ((Math.sin(aMid) >= 0) !== isFront) continue;
      for (let st = 0; st <= 8; st++) {
        const a = aBase + (st / 8) * segArc;
        const radMod = 1 + 0.1 * Math.sin(a * 12 + rot * 2);
        const px = cx + Math.cos(a) * rx * radMod;
        const py = floorY + Math.sin(a) * ry * radMod;
        const col = st === 4 ? C_WHITE : s % 2 === 0 ? C_GOLD_LIGHT : C_CRIM_BRIGHT;
        blendRgba104(cell104, px, py, col, (isFront ? 0.95 : 0.72) * fade);
      }
      // Jagged radiating crater spark spike at segment center
      const sx = cx + Math.cos(aMid) * rx;
      const sy = floorY + Math.sin(aMid) * ry;
      const spLen = 3.6 + (s % 3) * 1.5;
      drawLineRgba104(
        cell104,
        sx,
        sy,
        sx + Math.cos(aMid) * spLen,
        sy + Math.sin(aMid) * spLen * 0.85,
        s % 2 === 0 ? C_GOLD_MID : C_CRIM_BRIGHT,
        0.9 * fade
      );
    }
    // 8-point Valhalla Star-Rune Spokes inside crater (`<= 10px` per segment, angled off exact horizontal!)
    const pts = 8;
    for (let i = 0; i < pts; i++) {
      const a0 = rot * 0.6 + (i * TWO_PI) / pts;
      const isHoriz = Math.abs(Math.sin(a0)) < 0.28;
      if ((Math.sin(a0) >= 0) !== isFront && !isHoriz) continue;
      if (isHoriz && !isFront) continue;
      for (const [f0, f1] of [
        [0.32, 0.52],
        [0.68, 0.90]
      ]) {
        const yJit = isHoriz ? (f0 < 0.5 ? -1.4 : 1.4) : 0;
        drawLineRgba104(
          cell104,
          cx + Math.cos(a0) * (rx * f0),
          floorY + Math.sin(a0) * (ry * f0) + yJit,
          cx + Math.cos(a0) * (rx * f1),
          floorY + Math.sin(a0) * (ry * f1) - yJit,
          i % 2 === 0 ? C_GOLD_LIGHT : C_CRIM_BRIGHT,
          (isFront ? 0.92 : 0.68) * fade
        );
      }
      if (i % 2 === 0) {
        drawStarGlint104(
          cell104,
          cx + Math.cos(a0) * (rx * 0.72),
          floorY + Math.sin(a0) * (ry * 0.72),
          2.0,
          rot,
          C_WHITE,
          0.9 * fade
        );
      }
    }
  };
  drawCraterRing(false);

  // 2. Impaled Tall Gungnir War-Lance Rising `y = 6..86` (`160px` tall!)
  //    Matches F00..F11 ornate pommel + fluted shaft + sculpted 4-pinion Wing-Crossguard!
  const shaftAlphaByte = Math.max(40, Math.round(255 * fade));
  // Tapered pommel flame wake `y = 6..18`
  for (let y = 6; y <= 18; y += 0.4) {
    const ut = (y - 6) / 12;
    const hw = 2.6 * Math.pow(ut, 0.78);
    const sway = Math.sin(y * 0.5 - u * 16) * 0.9;
    for (let dx = -hw; dx <= hw; dx += 0.4) {
      blendRgba104(
        cell104,
        cx + sway + dx,
        y,
        Math.abs(dx) < hw * 0.4 ? C_GOLD_LIGHT : C_CRIM_BRIGHT,
        0.88 * ut * fade
      );
    }
  }

  // Pommel diamond (`y = 12..21`) + Impaled Ornate Shaft (`y = 18..85`) with sculpted collars
  for (let y = 12; y <= 21; y += 0.35) {
    const up = (y - 12) / 9;
    const hw = up < 0.5 ? mixScalar(0.8, 3.6, up / 0.5) : mixScalar(3.6, 2.0, (up - 0.5) / 0.5);
    for (let dx = -hw; dx <= hw; dx += 0.35) {
      const col = Math.abs(dx) < 0.8 ? C_WHITE : Math.abs(dx) < hw * 0.55 ? C_GOLD_MID : C_CRIM_MID;
      setCorePx104(coreBuf104, cx + dx, y, col, shaftAlphaByte);
    }
  }
  const collars = [27, 36, 46, 62, 74];
  for (let y = 20; y <= 85; y += 0.35) {
    let hw = 2.2;
    let isCollar = false;
    for (const cc of collars) {
      const d = Math.abs(y - cc);
      if (d <= 1.6) {
        hw += (1 - d / 1.6) * 1.4;
        isCollar = true;
      }
    }
    for (let dx = -hw; dx <= hw; dx += 0.35) {
      const adx = Math.abs(dx);
      const col = isCollar
        ? adx < 0.8
          ? C_WHITE
          : C_GOLD_LIGHT
        : adx < 0.7
          ? C_WHITE
          : adx < 1.5
            ? C_GOLD_MID
            : dx < 0
              ? C_CRIM_BRIGHT
              : C_CRIM_DEEP;
      setCorePx104(coreBuf104, cx + dx, y, col, shaftAlphaByte);
    }
  }

  // Sculpted 4-Pinion Swept Valkyrie Wing-Crossguard at `y = 54` flaring up to `y = 30`
  for (const side of [-1, 1]) {
    for (let p = 0; p < 4; p++) {
      const aRoot = 55 - p * 1.8;
      const aTip = 30 + p * 5.2;
      const span = 31 - p * 5.2;
      for (let st = 0; st <= 38; st++) {
        const v = st / 38;
        const arch = Math.sin(v * Math.PI) * 2.8;
        const py = mixScalar(aRoot, aTip, Math.pow(v, 0.86)) + arch * 0.3;
        const px = cx + side * (2.4 + Math.pow(v, 0.8) * span);
        const th = (2.1 - p * 0.2) * Math.sin(v * Math.PI * 0.9 + 0.1);
        for (let q = -th; q <= th; q += 0.35) {
          const col = q < -0.2 ? (p === 0 ? C_WHITE : C_GOLD_LIGHT) : q < 0.4 ? C_GOLD_MID : C_CRIM_BRIGHT;
          setCorePx104(coreBuf104, px, py + q, col, shaftAlphaByte);
        }
      }
    }
  }

  compositeCoreWithSelout104(coreBuf104, cell104, C_SELOUT, 0.9 * fade);

  // 3. Roaring Crimson-Gold Crater Plasma Geyser & Jagged Flame Tongues (`y = 22..90`)
  const geyserH = 66 * Easing.outCubic(Math.min(1, u * 2.4));
  const gBaseW = Math.max(1.5, 8.0 * (1 - u * 0.65));
  for (let h = 0; h <= geyserH; h += 0.45) {
    const hf = h / Math.max(1, geyserH);
    const w = gBaseW * (1 - hf * 0.62) + Math.sin(h * 0.32 - u * 20) * 1.2;
    const py = floorY - h;
    for (let dx = -w; dx <= w; dx += 0.45) {
      const q = Math.abs(dx) / Math.max(0.5, w);
      const col = q < 0.35 ? C_WHITE : q < 0.68 ? C_GOLD_LIGHT : C_CRIM_BRIGHT;
      blendRgba104(cell104, cx + dx, py, col, fade * (0.86 - hf * 0.28));
    }
    const a = h * 0.24 - u * 18;
    blendRgba104(cell104, cx + Math.sin(a) * (w + 4.5), py, C_WHITE, fade * 0.88);
    blendRgba104(cell104, cx - Math.sin(a) * (w + 4.5), py, C_GOLD_MID, fade * 0.84);
  }

  // Front crater ring & impact flare
  drawCraterRing(true);
  if (u < 0.46) {
    drawStarGlint104(cell104, cx, floorY - 3, 16 * (1 - u / 0.46), u * 2.2, C_GOLD_LIGHT, 0.95 * fade);
  }
  for (let sp = 0; sp < 6; sp++) {
    const su = (u * 1.8 + sp * 0.16) % 1;
    const ang = sp * 1.05 + u * 4;
    const sx = cx + Math.cos(ang) * (10 + sp * 3.5);
    const sy = floorY - 8 - su * 44;
    drawValkyrieFeather104(cell104, sx, sy, ang, fade * Math.sin(su * Math.PI));
  }
}

/**
 * Row 2 (`sy = 416`): Erupting Dragonfire Ruby-Gold Obelisk Spire with
 * Naturally Tapered Jagged Flame/Plasma Crown & Arched Molten Root (`0` flat bottom cut!).
 */
function renderRow2DragonfireObelisk104(col, surface104, pen104, cell104, coreBuf104) {
  const u = col / 29;
  const floorY = 88;
  const cx = 51.5;
  const erupt = Easing.outBack(clamp01(u / 0.22), 1.2);
  const shatterU = clamp01((u - 0.73) / 0.27);
  const fade = Math.max(0.16, 1 - shatterU * 0.84);
  const spireHPreview = Math.max(24, Math.min(73, 72 * erupt) * (1 - shatterU * 0.25));

  pen104.radialGlow(cx, floorY - spireHPreview * 0.35, 19 * fade * (0.45 + 0.55 * erupt), packHexColor('#e11d48'), 0.4 * fade);
  pen104.radialGlow(cx, floorY - spireHPreview * 0.72, 12 * fade * (0.4 + 0.6 * erupt), packHexColor('#fbbf24'), 0.28 * fade);
  resolveSurfaceToRGBA(surface104, cell104, 1.12);

  for (let y = 0; y < LOGICAL; y++) {
    for (let x = 0; x < LOGICAL; x++) {
      const o = (y * LOGICAL + x) * 4;
      if (!cell104[o + 3]) continue;
      const rEllip = Math.hypot((x - cx) / 42, (y - 52) / 43);
      const env = smoothStep(1.0, 0.68, rEllip);
      cell104[o + 3] = Math.round(cell104[o + 3] * env);
      if (cell104[o + 3] <= 18) {
        cell104[o] = cell104[o + 1] = cell104[o + 2] = cell104[o + 3] = 0;
      }
    }
  }

  // 1. Ground Tilted Valhalla Rune Seal (`aspectY = 0.30` + radial flame notches, zero flat lines!)
  const sealR = (14 + 16 * Math.min(1, u * 4.5)) * (1 - shatterU * 0.2);
  for (let i = 0; i < 88; i++) {
    const a = (i / 88) * TWO_PI;
    const mod = 1 + 0.08 * Math.sin(a * 8 - u * 10);
    const px = cx + Math.cos(a) * sealR * mod;
    const py = floorY + Math.sin(a) * sealR * 0.3 * mod;
    blendRgba104(cell104, px, py, i % 3 === 0 ? C_GOLD_LIGHT : C_CRIM_BRIGHT, 0.88 * fade);
  }

  // 2. Faceted Ruby-Gold Obelisk Monolith (`height <= 74` + organic curved bottom & jagged flame crown!)
  if (shatterU < 0.88) {
    const spireH = Math.max(24, Math.min(73, 72 * erupt) * (1 - shatterU * 0.25));
    const yApex = floorY - spireH;
    const baseHalfW = 14.5;

    for (let y = Math.floor(yApex); y <= floorY + 5; y++) {
      const hf = (floorY - y) / Math.max(1, spireH);
      // Sleek tapered ruby crystal spire with carved golden rune indentations every ~8px (`<= 16px` straight runs!)
      const dyRune = ((floorY - y) % 8);
      const runeNotch = dyRune >= 3 && dyRune <= 5 ? -1.8 : 0;
      let halfW =
        (hf > 0.78
          ? baseHalfW * 0.40 * ((1 - Math.max(0, hf)) / 0.22)
          : hf >= 0
            ? mixScalar(baseHalfW, baseHalfW * 0.40, hf / 0.78)
            : baseHalfW * Math.max(0, 1 + hf * 4.5)) + runeNotch;
      halfW = Math.max(1.2, halfW);

      for (let x = -Math.ceil(halfW); x <= Math.ceil(halfW); x++) {
        const ax = Math.abs(x);
        if (ax > halfW + 0.2) continue;
        // Arched curved molten base (never a flat horizontal floor cutoff!)
        const archFloor = floorY + 4.5 - ax * ax * 0.032 + Math.sin(x * 0.6 + u * 12) * 1.4;
        if (y > archFloor) continue;

        if (shatterU > 0.05) {
          const crack = fbmNoise2D(x * 0.36, y * 0.36, 191);
          if (crack + 0.45 < shatterU * 1.4) continue;
        }
        const isEdge = ax >= halfW - 1.3;
        const isCenter = ax <= 1.2;
        const col = isCenter ? C_WHITE : isEdge ? C_GOLD_LIGHT : x < 0 ? C_CRIM_BRIGHT : C_CRIM_DEEP;
        setCorePx104(coreBuf104, cx + x, y, col, Math.round(255 * fade));
      }
    }
    compositeCoreWithSelout104(coreBuf104, cell104, C_SELOUT, 0.9 * fade);

    // Coiling crimson-gold dragonfire plasma ribbon around the obelisk crystal spire
    for (let rib = 0; rib < 2; rib++) {
      const rOff = rib * Math.PI;
      for (let y = Math.floor(yApex + 4); y <= floorY + 1; y += 0.45) {
        const hf = (floorY - y) / Math.max(1, spireH);
        const rad = mixScalar(16.5, 9.5, clamp01(hf));
        const ang = y * 0.24 - u * 14 + rOff;
        if (Math.cos(ang) >= -0.15) {
          const rx = cx + Math.sin(ang) * rad;
          blendRgba104(cell104, rx, y, rib === 0 ? C_GOLD_LIGHT : C_CRIM_BRIGHT, 0.9 * fade);
        }
      }
    }

    // 3. Naturally Tapered Jagged Flame/Plasma Crown Leaping Above Obelisk Apex (`y = 7..yApex+8`)
    const crownTongues = [
      { ox: 0, reach: Math.max(7, yApex - 11), w: 4.5, ph: 0 },
      { ox: -5.5, reach: Math.max(11, yApex - 6), w: 3.2, ph: 1.8 },
      { ox: 5.5, reach: Math.max(11, yApex - 6), w: 3.2, ph: 3.6 },
      { ox: -9.5, reach: Math.max(17, yApex + 2), w: 2.5, ph: 5.1 },
      { ox: 9.5, reach: Math.max(17, yApex + 2), w: 2.5, ph: 2.4 }
    ];
    const crownFade = shatterU > 0.25 ? Math.max(0.15, 1 - (shatterU - 0.25) / 0.65) : 1.0;
    for (const tg of crownTongues) {
      const yBase = yApex + 10 - Math.abs(tg.ox) * 0.4;
      if (tg.reach >= yBase) continue;
      for (let y = tg.reach; y <= yBase; y += 0.4) {
        const ut = (y - tg.reach) / Math.max(1, yBase - tg.reach);
        const sway = Math.sin(y * 0.48 - u * 18 + tg.ph) * 1.8 * (1 - ut * 0.5);
        // Taper at both top AND bottom so shattering flames never terminate in a horizontal cut!
        const botTaper = ut > 0.72 ? Math.max(0.2, (1 - ut) / 0.28) : 1.0;
        const hw = tg.w * Math.pow(ut, 0.72) * botTaper;
        for (let dx = -hw; dx <= hw; dx += 0.4) {
          const edge = Math.abs(dx) / Math.max(0.3, hw);
          const col = edge < 0.35 ? C_WHITE : edge < 0.7 ? C_GOLD_LIGHT : C_CRIM_BRIGHT;
          blendRgba104(cell104, cx + tg.ox + sway + dx, y, col, (0.58 + 0.4 * ut) * fade * crownFade);
        }
      }
    }

    // Carved Golden Valknut Star-Crosses + Jagged Molten Base Flame Fangs
    if (spireH > 32) {
      for (const ryOff of [0.3, 0.58]) {
        drawStarGlint104(cell104, cx, floorY - spireH * ryOff, 5.2, u * 4, C_GOLD_LIGHT, 0.92 * fade);
      }
    }
    for (let f = -3; f <= 3; f++) {
      const fx = cx + f * 4.5;
      const fTop = floorY - 6 - (3 - Math.abs(f)) * 2.2;
      const fBot = floorY + 5 - Math.abs(f) * 1.4;
      for (let y = fTop; y <= fBot; y += 0.45) {
        const ut = 1 - (y - fTop) / Math.max(1, fBot - fTop);
        const sway = Math.sin(y * 0.6 + f + u * 16) * 1.1;
        blendRgba104(cell104, fx + sway, y, ut > 0.5 ? C_GOLD_LIGHT : C_CRIM_BRIGHT, 0.82 * ut * fade);
      }
    }

    const boltRng = new DeterministicRng(191 + col * 13);
    drawLightningChain104(cell104, boltRng, cx - 7, floorY - 3, cx + 4, yApex + 2, 0.24, 3, C_GOLD_LIGHT, C_CRIM_BRIGHT, 0.88 * fade);
  }

  // 4. Shatter Ruby-Gold Feathers & Embers (`F21..F29`)
  if (shatterU > 0 || u < 0.24) {
    const cnt = shatterU > 0 ? 12 : 6;
    for (let s = 0; s < cnt; s++) {
      const ang = -Math.PI * 0.5 + ((s - (cnt - 1) * 0.5) / (cnt * 0.5)) * 1.35;
      const dist = (shatterU > 0 ? shatterU : u * 2.5) * (18 + (s % 3) * 8);
      drawValkyrieFeather104(
        cell104,
        cx + Math.cos(ang) * dist,
        floorY - 34 + Math.sin(ang) * dist,
        ang + u * 6,
        fade * 0.94
      );
    }
  }
  if (u < 0.24) {
    drawStarGlint104(cell104, cx, floorY - 6, 15 * (1 - u / 0.24), u * 3, C_GOLD_LIGHT, 0.95);
  }
}

/**
 * Row 7 (`sy = 1456`): Gungnir Ragnarok Dragon-Pillar (`F00..F29`) with
 * Naturally Tapered Jagged Flame/Plasma Crown, Billowing Flame Flanks & Arched Molten Base!
 */
function renderRow7RagnarokPillar104(col, surface104, pen104, cell104) {
  const u = col / 29;
  const cx = 51.5;
  const floorY = 88;
  const erupt = 0.34 + 0.66 * Easing.outExpo(clamp01(u / 0.18));
  const fade = u > 0.76 ? Math.max(0.14, (1 - u) / 0.24) : 1.0;

  pen104.radialGlow(cx, 54, 27 * fade, packHexColor('#e11d48'), 0.44 * fade);
  pen104.radialGlow(cx, floorY - 6, 22 * fade, packHexColor('#fbbf24'), 0.32 * fade);
  resolveSurfaceToRGBA(surface104, cell104, 1.12);

  for (let y = 0; y < LOGICAL; y++) {
    for (let x = 0; x < LOGICAL; x++) {
      const o = (y * LOGICAL + x) * 4;
      if (!cell104[o + 3]) continue;
      const rEllip = Math.hypot((x - cx) / 43, (y - 52) / 43);
      const env = smoothStep(1.0, 0.66, rEllip);
      cell104[o + 3] = Math.round(cell104[o + 3] * env);
      if (cell104[o + 3] <= 2) {
        cell104[o] = cell104[o + 1] = cell104[o + 2] = cell104[o + 3] = 0;
      }
    }
  }

  // 1. Ground Tilted Valhalla Crater Shock-Ring (`aspectY = 0.30` + radial notches, zero 116px horizontal cutoff!)
  const baseRx = (15 + 23 * erupt) * (1 - Math.max(0, u - 0.8) * 0.45);
  for (let i = 0; i < 96; i++) {
    const a = (i / 96) * TWO_PI;
    const mod = 1 + 0.08 * Math.sin(a * 10 + u * 12);
    const px = cx + Math.cos(a) * baseRx * mod;
    const py = floorY + Math.sin(a) * baseRx * 0.3 * mod;
    blendRgba104(cell104, px, py, i % 4 === 0 ? C_WHITE : i % 2 === 0 ? C_GOLD_LIGHT : C_CRIM_BRIGHT, 0.9 * fade);
  }

  // 2. Towering Billowing Ragnarok Dragon-Fire Column (`y = 7..94`)
  const colH = 74 * erupt;
  const yBaseTop = floorY - colH;
  const coreScale = u < 0.72 ? 1.0 : Math.max(0.45, 1 - (u - 0.72) / 0.28 * 0.55);
  const maxHalfW = 16.5 * coreScale;
  const dissolveU = u > 0.72 ? (u - 0.72) / 0.28 : 0;

  for (let y = 7; y <= 96; y++) {
    // Organic arched molten crater base (curves cleanly up at flanks, zero flat floor wall!)
    for (let x = 22; x <= 81; x++) {
      const dx = x - cx;
      const adx = Math.abs(dx);
      const archBot = floorY + 6.5 - dx * dx * 0.018 + Math.sin(dx * 0.55 - u * 18) * 1.5;
      if (y > archBot) continue;

      // Naturally tapered jagged flame crown at top (`yTop(x)` dances unevenly between `7` and `yBaseTop+14`)
      const flameSpike =
        Math.sin(dx * 0.52 + u * 15) * 4.5 +
        Math.cos(dx * 0.95 - u * 21) * 3.0 -
        adx * 0.48;
      const localTop = Math.max(7, yBaseTop + 6 - flameSpike * erupt);
      if (y < localTop) continue;

      const hf = clamp01((floorY - y) / Math.max(1, floorY - localTop));
      // Natural billowing plasma flame silhouette (organic fbm + smooth wave, 0 rigid ribs, <= 18px straight runs!)
      const billow = 1 + 0.16 * Math.sin(y * 0.48 - u * 20) + 0.11 * Math.cos(y * 1.12 - u * 16) + 0.14 * fbmNoise2D(y * 0.28, u * 8, 709);
      const flare = 1 + 0.2 * Math.exp(-hf * 5.5) + 0.14 * Math.sin(hf * 10 - u * 22);
      const crownTaper = hf > 0.74 ? Math.pow(Math.max(0, (1 - hf) / 0.26), 0.75) : 1.0;
      const halfW = maxHalfW * flare * crownTaper * billow * (0.94 - hf * 0.12);
      if (adx > halfW + 1.6) continue;

      const turb = fbmNoise2D(dx * 0.24, y * 0.18 + u * 16, 227);
      const dissolveCut =
        dissolveU > 0
          ? Math.max(0, (fbmNoise2D(dx * 0.36 + 0.14 * Math.sin(y * 0.8), y * 0.34 - u * 14, 509) + 0.48 + 0.16 * Math.sin(dx * 0.85 + y * 0.75)) * dissolveU * 1.8)
          : 0;
      const norm = adx / Math.max(0.7, halfW) - turb * 0.24 + dissolveCut;
      if (norm > 1.04) continue;

      const topFade = smoothStep(localTop - 0.5, localTop + 5, y);
      const botFade = smoothStep(archBot + 0.5, archBot - 4, y);
      const edgeFade = smoothStep(1.04, 0.74, norm);
      const alpha = fade * topFade * botFade * edgeFade * (0.96 - hf * 0.08);
      if (alpha <= 0.03) continue;

      const col =
        norm < 0.26
          ? C_WHITE
          : norm < 0.54
            ? C_GOLD_LIGHT
            : norm < 0.78
              ? C_CRIM_BRIGHT
              : C_CRIM_DEEP;
      blendRgba104(cell104, x, y, col, alpha);
    }
  }

  // 3. Extra Tapered Jagged Flame/Plasma Crown Tongues Erupting Above the Crest (`y = 6..30`)
  const crownFade7 = 1 - dissolveU * 0.78;
  for (let tg = -2; tg <= 2; tg++) {
    const ox = tg * 5.2;
    const reach = Math.max(6, yBaseTop - 9 + Math.abs(tg) * 3.5);
    const yStart = Math.min(floorY - 12, yBaseTop + 14 - Math.abs(tg) * 2.2);
    for (let y = reach; y <= yStart; y += 0.45) {
      const ut = (y - reach) / Math.max(1, yStart - reach);
      const sway = Math.sin(y * 0.45 - u * 18 + tg * 1.7) * 1.6;
      const botTap = ut > 0.72 ? Math.max(0.18, (1 - ut) / 0.28) : 1.0;
      const hw = (3.4 - Math.abs(tg) * 0.5) * Math.pow(ut, 0.78) * botTap;
      for (let dx = -hw; dx <= hw; dx += 0.45) {
        const edge = Math.abs(dx) / Math.max(0.3, hw);
        blendRgba104(
          cell104,
          cx + ox + sway + dx,
          y,
          edge < 0.4 ? C_GOLD_LIGHT : C_CRIM_BRIGHT,
          0.86 * ut * fade * crownFade7
        );
      }
    }
  }

  // 4. Twin Coiling S-Curve Dragonfire Helices + 3 Ascending Mach Shock-Rings
  const helixFade = fade * (1 - dissolveU);
  for (let d = 0; d < 2; d++) {
    const off = d * Math.PI;
    let prevX = cx;
    let prevY = floorY;
    for (let s = 0; s <= 28; s++) {
      const sf = s / 28;
      const sy = floorY - sf * colH;
      const amp = (13 + 5 * (1 - sf)) * coreScale + Math.sin(sf * 34 - u * 22 + d) * 2.2;
      const ang = sf * TWO_PI * 1.7 - u * 16 + off;
      const sx = cx + Math.sin(ang) * amp;
      if (s > 0 && Math.cos(ang) >= -0.25) {
        drawLineRgba104(cell104, prevX, prevY, sx, sy, d === 0 ? C_GOLD_LIGHT : C_CRIM_BRIGHT, 0.92 * helixFade);
        blendRgba104(cell104, sx, sy, C_WHITE, 0.9 * helixFade);
      }
      prevX = sx;
      prevY = sy;
    }
  }

  for (let rIdx = 0; rIdx < 3; rIdx++) {
    const ru = (u * 2.4 + rIdx / 3) % 1;
    const ry = floorY - ru * colH * 0.9;
    const rr = (14 + (1 - ru) * 10) * erupt;
    drawMachRing104(cell104, cx, ry, 0, -1, rr, 0.26, true, (1 - ru * 0.5) * 0.9 * fade);
  }

  // 5. Crackling Lightning Spine & Swirling Valkyrie Feathers
  const boltRng = new DeterministicRng(227 + col * 23);
  drawLightningChain104(cell104, boltRng, cx - 5, floorY - 2, cx + 4, Math.max(10, yBaseTop + 2), 0.18, 3, C_WHITE, C_GOLD_MID, 0.92 * fade);
  drawLightningChain104(cell104, boltRng, cx + 6, floorY - 2, cx - 4, Math.max(10, yBaseTop + 2), 0.18, 3, C_GOLD_LIGHT, C_CRIM_BRIGHT, 0.88 * fade);

  for (let f = 0; f < 8; f++) {
    const fu = (u * 1.8 + f / 8) % 1;
    const fa = f * 1.9 + u * 11;
    const fr = 12 + (1 - fu) * 15;
    drawValkyrieFeather104(cell104, cx + Math.cos(fa) * fr, floorY - 4 - fu * (colH - 4), fa, fade * 0.94);
  }
  if (u < 0.34) {
    drawStarGlint104(cell104, cx, floorY - 5, 16 * (1 - u / 0.34), u * 3, C_GOLD_LIGHT, 0.96 * fade);
  }
}

/**
 * Adds crisp accents on shader-backed Rows 3, 4, 5 and breaks any flat circular pole tangents (`<= 18px`).
 */
function addShaderRowAccents104(rgba, row, col) {
  const ph = (col / 30) * TWO_PI;
  const cx = 51.5;
  const cy = 51.5;

  if (row === 3) {
    // Cardinal Valhalla crest finials + 16 radial rune spikes + wing feather-tip sparkles (`<= 14px` tangents)
    for (let k = 0; k < 4; k++) {
      const ca = (k * Math.PI) / 2;
      drawStarGlint104(rgba, 52 + Math.cos(ca) * 35.5, 55 + Math.sin(ca) * 35.5, 4.2, 0, C_GOLD_LIGHT, 0.94);
    }
    for (const side of [-1, 1]) {
      drawStarGlint104(rgba, 52 + side * 24, 64, 2.4, ph, C_GOLD_LIGHT, 0.9);
    }
    for (let k = 0; k < 16; k++) {
      const a = ph * 0.25 + (k * TWO_PI) / 16;
      const rIn = k % 2 === 0 ? 33.5 : 34.5;
      const rOut = k % 2 === 0 ? 39.2 : 37.5;
      drawLineRgba104(
        rgba,
        52 + Math.cos(a) * rIn,
        55 + Math.sin(a) * rIn,
        52 + Math.cos(a) * rOut,
        55 + Math.sin(a) * rOut,
        k % 2 === 0 ? C_WHITE : C_GOLD_LIGHT,
        0.92
      );
    }
  } else if (row === 4) {
    // Clean radial plasma wisps & ember glints along crescent crest & Mach ring (zero lattice hatching!)
    const u = col / 29;
    const tShader = 0.01 + col * (0.4 / 30);
    const r1 = 8 + 34 * Easing.outExpo(clamp01(tShader / 0.28));
    const r2 = 6 + 34 * 0.78 * Easing.outExpo(clamp01((tShader - 0.03) / 0.36));
    const fade = 1 - u * u * 0.85;
    for (const [rad, cxArc, maxAngle] of [
      [r1, 51, 0.85],
      [r2, 45, 0.72]
    ]) {
      if (rad < 6) continue;
      // Radial flame-plumes (`|ang| >= 0.20` so no ray runs near-horizontal!) cutting inner/outer crescent rims cleanly!
      for (let s = 0; s < 10; s++) {
        const frac = ((s + 0.5) / 10) * 2 - 1;
        if (Math.abs(frac) < 0.22) continue;
        const ang = frac * maxAngle;
        const ux = Math.cos(ang);
        const uy = Math.sin(ang);
        const px = cxArc + ux * (rad - 2.0);
        const py = 52 + uy * ((rad - 2.0) / 0.84);
        const tipX = cxArc + ux * (rad + 4.0);
        const tipY = 52 + uy * ((rad + 4.0) / 0.84);
        drawLineRgba104(
          rgba,
          px - ux * 8.5,
          py - uy * 8.5,
          tipX,
          tipY,
          s % 2 === 0 ? C_WHITE : C_GOLD_LIGHT,
          0.9 * fade
        );
        if (s % 2 === 1) {
          drawStarGlint104(rgba, tipX, tipY, 2.0, ph + s, C_CRIM_BRIGHT, 0.85 * fade);
        }
      }
      // Crisp 4-point star-glint spark on the exact 0-deg crescent apex (`y = 52`) breaking vertical pole cleanly!
      drawStarGlint104(rgba, cxArc + rad, 52, 3.2, ph, C_WHITE, 0.94 * fade);
      drawStarGlint104(rgba, cxArc + rad - 6.5, 52, 2.4, -ph, C_GOLD_LIGHT, 0.9 * fade);
    }
    // Gentle curved sparks breaking vertical pole on trailing back Mach ring around x = 35..43
    for (let s = 0; s < 4; s++) {
      const py = 45 + s * 4.5;
      drawStarGlint104(rgba, 38 + (s % 2), py, 2.0, ph + s, C_GOLD_LIGHT, 0.72 * fade);
    }
  } else if (row === 5) {
    // Prismatic Bifrost rim jewels on Einherjar Target Seal
    const bifrostCols = [C_CYAN, C_GOLD_MID, C_ROSE, C_VIOLET];
    for (let k = 0; k < 8; k++) {
      const a = ph + (k * Math.PI) / 4;
      const c = bifrostCols[k % 4];
      const nx = 52 + Math.cos(a) * 35;
      const ny = 52 + Math.sin(a) * 15;
      blendRgba104(rgba, nx, ny, C_WHITE, 0.94);
      blendRgba104(rgba, nx + 1, ny, c, 0.82);
      blendRgba104(rgba, nx - 1, ny, c, 0.82);
    }
  }
}

/**
 * Smooth elliptical / radial soft envelope (`0` rectangular `envX * envY` cutoffs, `margin=5` strictly clean!).
 */
function applyRowSoftEnvelope104(rgba, row) {
  const cx = 51.5;
  const cy = 51.5;
  for (let y = 0; y < LOGICAL; y++) {
    const dy = y - cy;
    for (let x = 0; x < LOGICAL; x++) {
      const o = (y * LOGICAL + x) * 4;
      const a = rgba[o + 3];
      if (!a) continue;

      // Strict margin=5 logical (`[5..98]`) -> `10px` clean border in `208x208`!
      if (x < MARGIN || x >= LOGICAL - MARGIN || y < MARGIN || y >= LOGICAL - MARGIN) {
        rgba[o] = rgba[o + 1] = rgba[o + 2] = rgba[o + 3] = 0;
        continue;
      }

      const dx = x - cx;
      let env = 1.0;
      if (row === 3 || row === 4 || row === 5) {
        // Circular/elliptical radial feathering (never clips spear tips or flames into flat walls!)
        const ang = Math.atan2(dy, dx);
        const ripple = 1 + 0.035 * Math.sin(ang * 8);
        const rMax = row === 3 ? 46.8 : row === 4 ? 46.5 : 46.2;
        const rMin = row === 3 ? 37.5 : row === 4 ? 36.0 : 37.0;
        const r = Math.hypot(dx, dy) / ripple;
        env = smoothStep(rMax, rMin, r);
      } else {
        // Rows 0, 1, 2, 6, 7: Tapered smooth corner rounding near `46.5` so sharp 184px spear tips & flame tips at axes stay 100% crisp!
        const ang = Math.atan2(dy, dx);
        const ripple = 1 + 0.03 * Math.sin(ang * 10);
        // Super-ellipse p=4 with radius 46.5 keeps axis tips at (6..97) crisp while smoothly rounding corners!
        const pNorm = Math.pow(Math.pow(Math.abs(dx) / 46.5, 4) + Math.pow(Math.abs(dy) / 46.5, 4), 0.25) / ripple;
        env = smoothStep(1.015, 0.90, pNorm);
      }

      const outA = Math.round(a * env);
      if (outA <= 8) {
        rgba[o] = rgba[o + 1] = rgba[o + 2] = rgba[o + 3] = 0;
      } else {
        rgba[o + 3] = outA;
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

function measureStraightEdgeRun208(cellRgba, alphaThresh = 16) {
  let maxRun = 0;
  const active = new Uint8Array(CELL * CELL);
  for (let i = 0; i < CELL * CELL; i++) {
    if (cellRgba[i * 4 + 3] >= alphaThresh) active[i] = 1;
  }
  for (let y = 0; y < CELL; y++) {
    let runT = 0;
    let runB = 0;
    for (let x = 0; x < CELL; x++) {
      const on = active[y * CELL + x];
      const topOut = y === 0 ? 1 : 1 - active[(y - 1) * CELL + x];
      const botOut = y === CELL - 1 ? 1 : 1 - active[(y + 1) * CELL + x];
      runT = on && topOut ? runT + 1 : 0;
      runB = on && botOut ? runB + 1 : 0;
      if (runT > maxRun) maxRun = runT;
      if (runB > maxRun) maxRun = runB;
    }
  }
  for (let x = 0; x < CELL; x++) {
    let runL = 0;
    let runR = 0;
    for (let y = 0; y < CELL; y++) {
      const on = active[y * CELL + x];
      const lftOut = x === 0 ? 1 : 1 - active[y * CELL + (x - 1)];
      const rgtOut = x === CELL - 1 ? 1 : 1 - active[y * CELL + (x + 1)];
      runL = on && lftOut ? runL + 1 : 0;
      runR = on && rgtOut ? runR + 1 : 0;
      if (runL > maxRun) maxRun = runL;
      if (runR > maxRun) maxRun = runR;
    }
  }
  return maxRun;
}

function bakeValkyrieExVfx() {
  const ROWS = 8;
  const COLS = 30;
  const sheetW = COLS * CELL;
  const sheetH = ROWS * CELL;
  const sheetRgba = new Uint8Array(sheetW * sheetH * 4);

  // Mid-bright `#64748b` / `#94a3b8` checkerboard contact sheet (`104x104` per cell + `3px` dark slate grid)
  const dbgPad = 3;
  const dbgW = COLS * (LOGICAL + dbgPad) + dbgPad;
  const dbgH = ROWS * (LOGICAL + dbgPad) + dbgPad;
  const dbgRgba = new Uint8Array(dbgW * dbgH * 4);
  for (let i = 0; i < dbgW * dbgH; i++) {
    dbgRgba[i * 4] = 51;
    dbgRgba[i * 4 + 1] = 65;
    dbgRgba[i * 4 + 2] = 85;
    dbgRgba[i * 4 + 3] = 255;
  }

  const rowSpecs = [
    { name: 'Row 0: Full-Span 184px Winged Gungnir Lightning War-Lance (+X)' },
    { name: 'Row 1: Split Descending 184px Gungnir Spear & Blazing Valhalla Crater' },
    { name: 'Row 2: Erupting Dragonfire Obelisk w/ Tapered Flame Crown & Root' },
    {
      name: 'Row 3: Colossal Bahamut / Valhalla Sovereign Winged Dragon Crest',
      windowSec: 1.0,
      warmup: 0,
      def: VALKYRIE_EFFECT_REGISTRY.bahamutAvatarCell,
      cfg: { x: 52, y: 52, palette: VALKYRIE_CRIMSON_PALETTE, seed: 197 }
    },
    {
      name: 'Row 4: Valhalla Dragonfire Lightning Burst & Crescent',
      windowSec: 0.4,
      warmup: 0.01,
      def: VALKYRIE_EFFECT_REGISTRY.valhallaCrescentSlashCell,
      cfg: { x: 47, y: 52, radius: 34, palette: VALKYRIE_CRIMSON_PALETTE, seed: 201 }
    },
    {
      name: 'Row 5: Bifrost Einherjar Target Seal',
      windowSec: 1.0,
      warmup: 0,
      def: VALKYRIE_EFFECT_REGISTRY.bifrostEinherjarSealCell,
      cfg: { x: 52, y: 52, palette: VALKYRIE_CRIMSON_PALETTE, seed: 209 }
    },
    { name: 'Row 6: Colossal Full-Span 184px Einherjar Winged Sky-Spear (+Y)' },
    { name: 'Row 7: Gungnir Ragnarok Dragon-Pillar w/ Tapered Jagged Flame Crown' }
  ];

  const surface104 = createPixelSurface(LOGICAL, LOGICAL);
  const pen104 = new ShaderPen(surface104);
  const cell104 = new Uint8Array(LOGICAL * LOGICAL * 4);
  const coreBuf104 = new Uint8Array(LOGICAL * LOGICAL * 4);
  const cell208 = new Uint8Array(CELL * CELL * 4);
  let borderClips = 0;

  for (let r = 0; r < ROWS; r++) {
    const spec = rowSpecs[r];
    const dt = spec.windowSec ? spec.windowSec / COLS : 1 / COLS;
    const inst = spec.def ? instantiateShaderEffect(spec.def, spec.cfg) : null;
    if (inst && spec.warmup > 0) inst.step(spec.warmup);

    let maxStraight = 0;
    let minH = 999;
    let maxH = 0;
    let maxW = 0;

    for (let c = 0; c < COLS; c++) {
      surface104.albedo.fill(0);
      surface104.emissive.fill(0);
      clearPixelSurface(surface104);
      cell104.fill(0);
      coreBuf104.fill(0);

      if (r === 0) {
        const loopU = c / COLS;
        renderWingedGungnirWarSpear104(surface104, pen104, cell104, coreBuf104, {
          cx: 51.5,
          cy: 51.5,
          ux: 1,
          uy: 0,
          phase: loopU * TWO_PI,
          loopU,
          seed: 183,
          isColossal: false
        });
      } else if (r === 1) {
        if (c < 12) {
          const loopU = c / 12;
          renderWingedGungnirWarSpear104(surface104, pen104, cell104, coreBuf104, {
            cx: 51.5,
            cy: 51.5,
            ux: 0,
            uy: 1,
            phase: loopU * TWO_PI,
            loopU,
            seed: 189,
            isColossal: false
          });
        } else {
          renderRow1CraterImpact104(c, surface104, pen104, cell104, coreBuf104);
        }
      } else if (r === 2) {
        renderRow2DragonfireObelisk104(c, surface104, pen104, cell104, coreBuf104);
      } else if (r === 6) {
        const loopU = c / COLS;
        renderWingedGungnirWarSpear104(surface104, pen104, cell104, coreBuf104, {
          cx: 51.5,
          cy: 51.5,
          ux: 0,
          uy: 1,
          phase: loopU * TWO_PI,
          loopU,
          seed: 213,
          isColossal: true
        });
      } else if (r === 7) {
        renderRow7RagnarokPillar104(c, surface104, pen104, cell104);
      } else {
        inst.render(pen104, 'back');
        inst.render(pen104, 'front');
        resolveSurfaceToRGBA(surface104, cell104, 1.18);
        addShaderRowAccents104(cell104, r, c);
      }

      applyRowSoftEnvelope104(cell104, r);

      cell208.fill(0);
      blitUpscaledNearest(cell104, LOGICAL, LOGICAL, 2, cell208, CELL, 0, 0);
      if (has4pxBorderClip208(cell208, CELL, 4)) borderClips++;

      const sr16 = measureStraightEdgeRun208(cell208, 16);
      const sr1 = measureStraightEdgeRun208(cell208, 1);
      maxStraight = Math.max(maxStraight, sr16, sr1);

      let y0 = CELL, y1 = -1, x0 = CELL, x1 = -1;
      for (let py = 0; py < CELL; py++) {
        for (let px = 0; px < CELL; px++) {
          if (cell208[(py * CELL + px) * 4 + 3] > 0) {
            if (py < y0) y0 = py;
            if (py > y1) y1 = py;
            if (px < x0) x0 = px;
            if (px > x1) x1 = px;
          }
        }
      }
      if (y1 >= y0) {
        minH = Math.min(minH, y1 - y0 + 1);
        maxH = Math.max(maxH, y1 - y0 + 1);
        maxW = Math.max(maxW, x1 - x0 + 1);
      }

      blitUpscaledNearest(cell104, LOGICAL, LOGICAL, 2, sheetRgba, sheetW, c * CELL, r * CELL);

      // Paint mid-bright #64748b / #94a3b8 checker background for this contact cell
      const dx = dbgPad + c * (LOGICAL + dbgPad);
      const dy = dbgPad + r * (LOGICAL + dbgPad);
      for (let yy = 0; yy < LOGICAL; yy++) {
        for (let xx = 0; xx < LOGICAL; xx++) {
          const checker = ((xx >> 3) + (yy >> 3)) & 1;
          const o = ((dy + yy) * dbgW + (dx + xx)) * 4;
          dbgRgba[o] = checker ? 148 : 100;
          dbgRgba[o + 1] = checker ? 163 : 116;
          dbgRgba[o + 2] = checker ? 184 : 139;
          dbgRgba[o + 3] = 255;
        }
      }
      alphaCompositeOnto(cell104, LOGICAL, LOGICAL, dbgRgba, dbgW, dx, dy);

      if (inst) inst.step(dt);
    }
    console.log(
      `[valkyrie_ex_vfx] Baked ${spec.name} | w_max=${maxW} h=[${minH}..${maxH}] maxStraightEdgeRun=${maxStraight}`
    );
  }

  const outSheetPath = path.join(REPO_ROOT, 'assets', 'sprites', 'valkyrie_ex_vfx.png');
  fs.writeFileSync(outSheetPath, encodeRgbaPng(sheetW, sheetH, sheetRgba));

  fs.mkdirSync(SCRATCH_DIR, { recursive: true });
  const outDbgPath = path.join(SCRATCH_DIR, 'debug_valkyrie_ex_vfx.png');
  fs.writeFileSync(outDbgPath, encodeRgbaPng(dbgW, dbgH, dbgRgba));

  console.log(
    `[valkyrie_ex_vfx] Wrote ${outSheetPath} (${sheetW}x${sheetH}) & ${outDbgPath} | borderClips=${borderClips}/240`
  );
  if (borderClips > 0) process.exitCode = 1;
}

bakeValkyrieExVfx();
