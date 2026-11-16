#!/usr/bin/env node
/**
 * Next-Gen 30fps 8-Row VFX Sprite Sheet Builder for SYLVARA EX (`archer_ex` -> `ArcherEx.js`).
 * Powered natively by `src/engine/ArcaneShaderFX.js` + read-only `src/engine/shaders/sylvanShaders.js`
 * with row-aware radial/vertical distance falloff and soft margin alpha (`0` flat box cuts, `0/240` border clips).
 *
 * Outputs:
 *   1. `assets/sprites/archer_ex_vfx.png` (6240x1664, 8 rows x 30 cols @ 208x208, 0/240 border clips)
 *   2. `<scratch>/debug_archer_ex_vfx.png` (8x30 contact sheet for visual verification)
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
  packHexColor
} from '../src/engine/ArcaneShaderFX.js';

import {
  SYLVAN_EMERALD_PALETTE,
  SYLVAN_STARLIGHT_PALETTE,
  SYLVAN_EFFECT_REGISTRY
} from '../src/engine/shaders/sylvanShaders.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SCRATCH_DIR =
  '/Users/rei/.gemini/antigravity/brain/5416474b-0e5f-4471-85c8-b7a88055e218/scratch';

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

/**
 * Eliminates internal shadeBox square walls while preserving Row 7's horizontal
 * 3-wave tiling slice (`x_208 = 44..156`, `coreSliceW = 112`) and non-overlapping tip (`156..208`).
 */
function applyRowSoftEnvelope104(rgba, row, w = 104, h = 104) {
  for (let y = 0; y < h; y++) {
    const dy = y - 52;
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      const a = rgba[o + 3];
      if (!a) continue;
      const dx = x - 52;
      let env = 1.0;
      if (row === 7) {
        // Row 7 Supernova Beam tiles horizontally across x_104 = 22..78; taper vertically + far left/right margins only!
        env = smoothStep(44, 30, Math.abs(dy));
        if (x < 16) env *= smoothStep(3, 16, x);
        if (x > 92) env *= smoothStep(101, 92, x);
      } else if (row === 0) {
        // Horizontal arrow bolts: elliptical envelope
        const rEllip = Math.hypot(dx * 0.92, dy * 1.18);
        env = smoothStep(47, 35, rEllip);
      } else if (row === 1) {
        // Tall descending starfall comet-arrows & upright ground wind geysers
        env = smoothStep(47, 37, Math.hypot(dx * 1.08, (y - 50) * 0.96));
      } else if (row === 2) {
        const r = Math.hypot(dx, dy);
        env = smoothStep(33, 22, r);
      } else if (row === 4) {
        const r = Math.hypot(dx, dy);
        env = smoothStep(35, 24, r);
      } else if (row === 5) {
        const r = Math.hypot(dx, dy);
        env = smoothStep(37, 25, r);
      } else {
        // Row 3 Wind-Dragon Vortex & Row 6 Celestial Greatbow: radial distance falloff!
        const r = Math.hypot(dx, dy);
        env = smoothStep(44, 31, r);
      }
      const outA = Math.round(a * env);
      if (outA <= 2) {
        rgba[o] = 0;
        rgba[o + 1] = 0;
        rgba[o + 2] = 0;
        rgba[o + 3] = 0;
      } else {
        rgba[o + 3] = outA;
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
      } else if (distEdge < 8 && rgba[o + 3] > 0) {
        const k = (distEdge - 1.5) / 6.5;
        rgba[o + 3] = Math.round(rgba[o + 3] * k);
        if (rgba[o + 3] <= 2) {
          rgba[o] = 0;
          rgba[o + 1] = 0;
          rgba[o + 2] = 0;
          rgba[o + 3] = 0;
        }
      }
    }
  }
}

function has4pxBorderClip208(rgba208, cell = 208, margin = 4) {
  for (let y = 0; y < cell; y++) {
    for (let x = 0; x < cell; x++) {
      if (x >= margin && x < cell - margin && y >= margin && y < cell - margin) continue;
      if (rgba208[(y * cell + x) * 4 + 3] > 0) return true;
    }
  }
  return false;
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

function blendRgba104(rgba, x, y, rgb, aFloat = 1.0, minA = 0) {
  const ix = Math.round(x);
  const iy = Math.round(y);
  if (ix < 3 || ix >= 101 || iy < 3 || iy >= 101 || aFloat <= 0.008) return;
  const o = (iy * 104 + ix) * 4;
  const sa = Math.max(0, Math.min(1, aFloat));
  const da = rgba[o + 3] / 255;
  const outA = sa + da * (1 - sa);
  if (outA <= 0) return;
  const finalA = Math.max(minA, Math.round(outA * 255));
  rgba[o] = Math.round((rgb[0] * sa + rgba[o] * da * (1 - sa)) / outA);
  rgba[o + 1] = Math.round((rgb[1] * sa + rgba[o + 1] * da * (1 - sa)) / outA);
  rgba[o + 2] = Math.round((rgb[2] * sa + rgba[o + 2] * da * (1 - sa)) / outA);
  rgba[o + 3] = finalA;
}

function setCoreMaskPx104(coreRgba, x, y, rgb, aByte = 255) {
  const ix = Math.round(x);
  const iy = Math.round(y);
  if (ix < 3 || ix >= 101 || iy < 3 || iy >= 101 || aByte <= 0) return;
  const o = (iy * 104 + ix) * 4;
  if (aByte >= coreRgba[o + 3]) {
    coreRgba[o] = rgb[0];
    coreRgba[o + 1] = rgb[1];
    coreRgba[o + 2] = rgb[2];
    coreRgba[o + 3] = aByte;
  }
}

function drawLine104(rgba, x0, y0, x1, y1, rgb, aFloat = 1.0) {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(dist * 1.5));
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    blendRgba104(rgba, x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, rgb, aFloat);
  }
}

function drawStarGlint104(rgba, cx, cy, arm, rotRad = 0, accentRgb = [254, 240, 138], alpha = 1.0) {
  if (alpha <= 0.02 || arm < 1) return;
  const white = [255, 255, 255];
  const rInt = Math.ceil(arm);
  for (let i = -rInt; i <= rInt; i++) {
    const u = 1 - Math.abs(i) / (arm + 0.5);
    if (u <= 0) continue;
    const c = u > 0.58 ? white : accentRgb;
    const ca = Math.cos(rotRad);
    const sa = Math.sin(rotRad);
    blendRgba104(rgba, cx + i * ca, cy + i * sa, c, alpha * (0.45 + 0.55 * u));
    blendRgba104(rgba, cx - i * sa, cy + i * ca, c, alpha * (0.45 + 0.55 * u));
  }
  const dArm = Math.max(1, Math.floor(arm * 0.52));
  const diagRot = rotRad + Math.PI * 0.25;
  for (let i = -dArm; i <= dArm; i++) {
    const u = 1 - Math.abs(i) / (dArm + 0.6);
    if (u <= 0) continue;
    const ca = Math.cos(diagRot);
    const sa = Math.sin(diagRot);
    blendRgba104(rgba, cx + i * ca, cy + i * sa, accentRgb, alpha * u * 0.78);
    blendRgba104(rgba, cx - i * sa, cy + i * ca, accentRgb, alpha * u * 0.78);
  }
  blendRgba104(rgba, cx, cy, white, alpha);
}

function compositeCoreWithSelout104(coreRgba, dstRgba, seloutRgb = [5, 46, 22], seloutAlpha = 0.96) {
  // 1px 4-neighbor dark emerald Selout rim around solid core silhouette
  if (seloutAlpha > 0.02) {
    for (let y = 3; y < 101; y++) {
      for (let x = 3; x < 101; x++) {
        const o = (y * 104 + x) * 4;
        if (coreRgba[o + 3] > 24) continue;
        const nUp = coreRgba[((y - 1) * 104 + x) * 4 + 3] > 24;
        const nDn = coreRgba[((y + 1) * 104 + x) * 4 + 3] > 24;
        const nLf = coreRgba[(y * 104 + x - 1) * 4 + 3] > 24;
        const nRt = coreRgba[(y * 104 + x + 1) * 4 + 3] > 24;
        if (nUp || nDn || nLf || nRt) {
          blendRgba104(dstRgba, x, y, seloutRgb, seloutAlpha);
        }
      }
    }
  }
  for (let y = 3; y < 101; y++) {
    for (let x = 3; x < 101; x++) {
      const o = (y * 104 + x) * 4;
      const a = coreRgba[o + 3];
      if (!a) continue;
      blendRgba104(dstRgba, x, y, [coreRgba[o], coreRgba[o + 1], coreRgba[o + 2]], a / 255);
    }
  }
}

/**
 * Row 1 (`y = 208`) dedicated 30-frame builder:
 *  - `c = 0..11`: Descending Starfall Comet-Arrow (`ux = +0.184, uy = +0.983`, tail `(43, 14)` -> tip `(58, 83)`)
 *  - `c = 12..29`: 18-Frame Upright Ground Runic Star-Sigil & Helical Emerald-Gold Wind Geyser Eruption (`(52, 84)`)
 */
function renderRow1StarfallAndGeyser104(col, surface104, pen104, cell104, coreBuf104) {
  const C_SELOUT = [5, 46, 22]; // #052e16
  const C_EM_DEEP = [5, 150, 105]; // #059669
  const C_EM_MID = [16, 185, 129]; // #10b981
  const C_EM_BRIGHT = [52, 211, 153]; // #34d399
  const C_EM_MINT = [110, 231, 183]; // #6ee7b7
  const C_GOLD_DEEP = [250, 204, 21]; // #facc15
  const C_GOLD_LIGHT = [254, 240, 138]; // #fef08a
  const C_WHITE = [255, 255, 255]; // #ffffff

  clearPixelSurface(surface104);
  coreBuf104.fill(0);

  if (col < 12) {
    // ------------------------------------------------------------------------
    // F00..F11: Descending Starfall Comet-Arrow (`ux = +0.184, uy = +0.983`)
    // ------------------------------------------------------------------------
    const phase = (col / 12) * Math.PI * 2;
    const rawLen = Math.hypot(0.184, 0.983);
    const ux = 0.184 / rawLen;
    const uy = 0.983 / rawLen;
    const nx = -uy;
    const ny = ux;
    const tipX = 58;
    const tipY = 83;

    // Subtle emerald-gold glow aura via ShaderPen
    pen104.radialGlow(51, 48, 22, packHexColor('#10b981'), 0.24);
    pen104.radialGlow(tipX - ux * 6, tipY - uy * 6, 18, packHexColor('#fef08a'), 0.34);
    resolveSurfaceToRGBA(surface104, cell104, 1.10);

    // 1. Back half of Tilted Supersonic Mach Ring + Back half of Twin Counter-Spiraling Comet Ribbons
    const machDist = 54 + Math.sin(phase) * 2.5;
    const machCx = tipX - ux * machDist;
    const machCy = tipY - uy * machDist;
    const machR = 11.5 + Math.cos(phase) * 1.1;
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      if (Math.cos(a) >= 0) continue;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const px = machCx + ux * (ca * machR * 0.32) + nx * (sa * machR);
      const py = machCy + uy * (ca * machR * 0.32) + ny * (sa * machR);
      blendRgba104(cell104, px, py, Math.abs(sa) > 0.65 ? C_EM_MID : C_GOLD_LIGHT, 0.78);
    }

    for (let rib = 0; rib < 2; rib++) {
      const rOff = rib * Math.PI;
      const dirSign = rib === 0 ? 1 : -1;
      for (let d = 12; d <= 72; d += 0.35) {
        const uShaft = (d - 12) / 60;
        const amp = 3.2 + uShaft * 8.2;
        const ang = dirSign * (d * 0.22 - phase) + rOff;
        if (Math.cos(ang) >= 0) continue;
        const offN = Math.sin(ang) * amp;
        const rx = tipX - ux * d + nx * offN;
        const ry = tipY - uy * d + ny * offN;
        const colRgb = rib === 0 ? C_GOLD_LIGHT : C_EM_MID;
        blendRgba104(cell104, rx, ry, colRgb, 0.68 * (1 - uShaft * 0.25));
      }
    }

    // 2. Solid Arrow Body into coreBuf104 (`Selout` `#052e16` will outline this cleanly!)
    // 2A. 3px Core Shaft + Emerald Bevels (`d = 14 .. 70`, tail near `(43, 14)`)
    for (let d = 14; d <= 70; d += 0.35) {
      const cx = tipX - ux * d;
      const cy = tipY - uy * d;
      for (let w = -2.6; w <= 2.6; w += 0.35) {
        let rgb;
        if (Math.abs(w) <= 0.65) rgb = C_WHITE;
        else if (Math.abs(w) <= 1.55) rgb = C_GOLD_LIGHT;
        else if (w < 0) rgb = C_EM_BRIGHT;
        else rgb = C_EM_MID;
        setCoreMaskPx104(coreBuf104, cx + nx * w, cy + ny * w, rgb, 255);
      }
    }

    // 2B. Swept Tail Fletching reaching `(43, 14)`
    for (const side of [-1, 1]) {
      for (let s = 0; s <= 18; s++) {
        const p = s / 18;
        const dBase = 63 + p * 8.5;
        const lat = side * (1.8 + p * 5.2);
        const fx = tipX - ux * dBase + nx * lat;
        const fy = tipY - uy * dBase + ny * lat;
        const rgb = p < 0.45 ? C_GOLD_LIGHT : side < 0 ? C_EM_BRIGHT : C_EM_MID;
        setCoreMaskPx104(coreBuf104, fx, fy, rgb, 255);
        setCoreMaskPx104(coreBuf104, fx - ux * 1.0, fy - uy * 1.0, side < 0 ? C_EM_MINT : C_EM_BRIGHT, 255);
      }
    }
    // Pin crisp tail-tip accent at `(43, 14)`
    setCoreMaskPx104(coreBuf104, 43, 14, C_EM_BRIGHT, 255);

    // 2C. Swept Emerald-Gold Astral Wing-Vanes around `(51, 48)` (`d = 31 .. 39`)
    const wingFlutter = Math.sin(phase) * 0.9;
    for (const side of [-1, 1]) {
      for (let vane = 0; vane < 3; vane++) {
        const dAttach = 31 + vane * 2.6;
        const spanMax = 14.5 - vane * 2.5 + wingFlutter * (vane === 0 ? 1 : 0.4);
        const sweepBack = 15.0 - vane * 2.2;
        const steps = 28;
        for (let i = 0; i <= steps; i++) {
          const p = i / steps;
          const dCur = dAttach + Math.pow(p, 0.92) * sweepBack;
          const lat = side * (2.0 + Math.pow(p, 0.76) * spanMax);
          const wx = tipX - ux * dCur + nx * lat;
          const wy = tipY - uy * dCur + ny * lat;
          const leadRgb = vane === 0 ? (p < 0.55 ? C_WHITE : C_GOLD_LIGHT) : C_EM_MINT;
          const trailRgb = vane === 0 ? C_GOLD_DEEP : side < 0 ? C_EM_BRIGHT : C_EM_MID;
          setCoreMaskPx104(coreBuf104, wx, wy, leadRgb, 255);
          setCoreMaskPx104(coreBuf104, wx - ux * 1.0, wy - uy * 1.0, trailRgb, 255);
          if (p < 0.72) {
            setCoreMaskPx104(coreBuf104, wx - ux * 1.8, wy - uy * 1.8, C_EM_MID, 255);
          }
        }
      }
    }

    // 2D. Sharp Diamond-Crescent Broadhead at `(58, 83)` (`d = 0 .. 19`)
    for (let d = 0; d <= 19; d += 0.32) {
      const cx = tipX - ux * d;
      const cy = tipY - uy * d;
      let hw;
      let innerCut = -1;
      if (d <= 13.5) {
        hw = (d / 13.5) * 8.4;
      } else {
        const bFrac = (d - 13.5) / 5.5;
        hw = 8.4 + bFrac * 1.3;
        innerCut = 1.6 + bFrac * 5.8;
      }
      for (let w = -Math.ceil(hw); w <= Math.ceil(hw); w += 0.35) {
        const aw = Math.abs(w);
        if (aw > hw + 0.15) continue;
        if (innerCut > 0 && aw < innerCut) continue;
        let rgb;
        if (d <= 13.5 && aw <= 1.1) rgb = C_WHITE;
        else if (aw >= hw - 1.35) rgb = d < 9 ? C_WHITE : C_GOLD_LIGHT;
        else if (w < 0) rgb = C_EM_MINT;
        else rgb = C_EM_BRIGHT;
        setCoreMaskPx104(coreBuf104, cx + nx * w, cy + ny * w, rgb, 255);
      }
    }

    // Composite arrow core + 1px #052e16 Selout onto cell104
    compositeCoreWithSelout104(coreBuf104, cell104, C_SELOUT, 0.98);

    // 3. Front half of Twin Counter-Spiraling Comet Ribbons (`cos(ang) >= 0`)
    for (let rib = 0; rib < 2; rib++) {
      const rOff = rib * Math.PI;
      const dirSign = rib === 0 ? 1 : -1;
      for (let d = 12; d <= 72; d += 0.32) {
        const uShaft = (d - 12) / 60;
        const amp = 3.2 + uShaft * 8.2;
        const ang = dirSign * (d * 0.22 - phase) + rOff;
        if (Math.cos(ang) < 0) continue;
        const offN = Math.sin(ang) * amp;
        const rx = tipX - ux * d + nx * offN;
        const ry = tipY - uy * d + ny * offN;
        const frontPeak = Math.cos(ang) > 0.65;
        const colRgb = rib === 0 ? (frontPeak ? C_WHITE : C_GOLD_LIGHT) : frontPeak ? C_EM_MINT : C_EM_BRIGHT;
        const a = (0.78 + 0.20 * Math.cos(ang)) * (1 - uShaft * 0.18);
        blendRgba104(cell104, rx, ry, colRgb, a);
        blendRgba104(cell104, rx - ux * 0.8, ry - uy * 0.8, rib === 0 ? C_GOLD_DEEP : C_EM_MID, a * 0.82);
      }
    }

    // 4. Front half of Tilted Supersonic Mach Ring (`cos(a) >= 0`)
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      if (Math.cos(a) < 0) continue;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const px = machCx + ux * (ca * machR * 0.32) + nx * (sa * machR);
      const py = machCy + uy * (ca * machR * 0.32) + ny * (sa * machR);
      const rgb = ca > 0.65 ? C_WHITE : ca > 0.3 ? C_GOLD_LIGHT : C_EM_BRIGHT;
      blendRgba104(cell104, px, py, rgb, 0.94);
      blendRgba104(cell104, px - ux * 0.85, py - uy * 0.85, C_EM_MID, 0.72);
    }

    // 5. Rotating 4-Point Starflare at Broadhead Tip `(58, 83)` + Trailing Comet Sparks
    const flareArm = 7.2 + Math.sin(phase * 2) * 1.4;
    drawStarGlint104(cell104, tipX, tipY, flareArm, phase * 0.25, C_GOLD_LIGHT, 0.96);

    for (let sp = 0; sp < 4; sp++) {
      const su = ((col / 12) + sp * 0.25) % 1.0;
      const dSp = 54 + su * 21;
      const latSp = Math.sin(sp * 2.1 + phase) * 5.2;
      const sx = tipX - ux * dSp + nx * latSp;
      const sy = tipY - uy * dSp + ny * latSp;
      const sAlpha = Math.sin(su * Math.PI) * 0.92;
      drawStarGlint104(cell104, sx, sy, 2.2, phase * 0.5, sp % 2 === 0 ? C_GOLD_LIGHT : C_EM_MINT, sAlpha);
    }
    return;
  }

  // --------------------------------------------------------------------------
  // F12..F29: 18-Frame Upright Ground Runic Star-Sigil & Helical Wind Geyser
  // Anchored at `(cx = 52, cy = 84)` matching `sy - impSz * 0.81`
  // --------------------------------------------------------------------------
  const k = col - 12; // 0 .. 17
  const u = k / 17; // 0.0 .. 1.0
  const cx = 52;
  const cy = 84;

  const erupt = 0.24 + 0.76 * (1 - Math.pow(1 - Math.min(1, u / 0.28), 3));
  const fade = u <= 0.64 ? 1.0 : Math.max(0.18, 1.0 - ((u - 0.64) / 0.36) * 0.82);
  const ringExpand = 1 - Math.pow(1 - Math.min(1, u * 1.35), 2.4);
  const rx = 12 + 22 * ringExpand; // 12 .. 34
  const ry = 4 + 6 * ringExpand; // 4 .. 10
  const rot = u * 2.8;

  const geyserH = (58 + 8 * Math.sin(Math.min(1, u * 1.5) * Math.PI * 0.5)) * erupt; // peaks at y = 18 (16..24)
  const spireFade = u <= 0.62 ? 1.0 : Math.max(0.06, 1.0 - (u - 0.62) / 0.38);

  // Soft ShaderPen glow under sigil & geyser
  pen104.radialGlow(cx, cy - 2, rx * 0.9, packHexColor('#10b981'), 0.34 * fade);
  pen104.radialGlow(cx, cy - geyserH * 0.45, 22, packHexColor('#fef08a'), 0.32 * spireFade);
  resolveSurfaceToRGBA(surface104, cell104, 1.12);

  // Helper to draw tilted 8-point elven star-compass & rings (`pred` splits back vs front)
  const drawGroundCompass = (isFront) => {
    const ringSteps = 96;
    for (let i = 0; i < ringSteps; i++) {
      const a = (i / ringSteps) * Math.PI * 2;
      if ((Math.sin(a) >= 0) !== isFront) continue;
      const px = cx + Math.cos(a) * rx;
      const py = cy + Math.sin(a) * ry;
      if (fade > 0.38) {
        blendRgba104(cell104, px, py + 1.1, C_SELOUT, 0.78 * fade);
      }
      blendRgba104(cell104, px, py, i % 4 === 0 ? C_GOLD_LIGHT : C_EM_BRIGHT, (isFront ? 0.94 : 0.68) * fade);
      const ix = cx + Math.cos(a) * (rx * 0.68);
      const iy = cy + Math.sin(a) * (ry * 0.68);
      blendRgba104(cell104, ix, iy, isFront ? C_GOLD_LIGHT : C_EM_MID, (isFront ? 0.88 : 0.62) * fade);
    }

    // 8-point foreshortened star-compass
    const points = 8;
    const rOuter = rx * 0.94;
    const rInner = rx * 0.46;
    const aspect = ry / Math.max(1, rx);
    for (let i = 0; i < points * 2; i++) {
      const a0 = rot + (i * Math.PI) / points;
      const a1 = rot + ((i + 1) * Math.PI) / points;
      const midA = (a0 + a1) * 0.5;
      if ((Math.sin(midA) >= 0) !== isFront) continue;
      const r0 = i % 2 === 0 ? rOuter : rInner;
      const r1 = i % 2 === 0 ? rInner : rOuter;
      const x0 = cx + Math.cos(a0) * r0;
      const y0 = cy + Math.sin(a0) * r0 * aspect;
      const x1 = cx + Math.cos(a1) * r1;
      const y1 = cy + Math.sin(a1) * r1 * aspect;
      drawLine104(
        cell104,
        x0,
        y0,
        x1,
        y1,
        i % 4 < 2 ? C_GOLD_LIGHT : C_EM_BRIGHT,
        (isFront ? 0.92 : 0.64) * fade
      );
      if (i % 2 === 0) {
        blendRgba104(cell104, x0, y0, C_WHITE, fade * 0.95);
      }
    }
  };

  // 1. Back half of Ground Runic Star-Compass
  drawGroundCompass(false);

  // 2. Back half of Helical Emerald-Gold Wind Ribbons
  if (spireFade > 0.08 && geyserH > 4) {
    for (let rib = 0; rib < 2; rib++) {
      const rOff = rib * Math.PI;
      for (let h = 0; h <= geyserH + 2; h += 0.35) {
        const hf = h / Math.max(1, geyserH);
        const rad = (9.5 - hf * 4.5) * (0.72 + 0.28 * spireFade);
        const a = h * 0.25 - u * 16.5 + rOff;
        if (Math.cos(a) >= 0) continue;
        const hx = cx + Math.sin(a) * rad;
        const hy = cy - h;
        blendRgba104(cell104, hx, hy, rib === 0 ? C_GOLD_DEEP : C_EM_MID, 0.68 * spireFade);
      }
    }
  }

  // 3. Towering Helical Emerald-Gold Wind-Spire Core (`y = 84` up to `y = 16..24`)
  if (spireFade > 0.08 && geyserH > 2) {
    const baseLift = u > 0.64 ? ((u - 0.64) / 0.36) * 14 : 0;
    for (let h = baseLift; h <= geyserH; h += 0.45) {
      const hf = h / Math.max(1, geyserH);
      const flare = h < 10 ? (1 - h / 10) * 3.8 : 0;
      const tipTaper = hf > 0.74 ? Math.max(0.18, 1 - Math.pow((hf - 0.74) / 0.26, 1.15) * 0.88) : 1.0;
      const halfW = Math.max(0.55, ((6.4 * (1 - hf * 0.55) + flare) * tipTaper * (0.35 + 0.65 * spireFade)));
      const sway = Math.sin(h * 0.16 - u * 14) * (1.2 + hf * 1.1);
      const py = cy - h;
      for (let dx = -Math.ceil(halfW); dx <= Math.ceil(halfW); dx += 0.5) {
        const q = Math.abs(dx) / Math.max(0.45, halfW);
        if (q > 1) continue;
        let rgb;
        if (q < 0.26) rgb = C_WHITE;
        else if (q < 0.54) rgb = C_GOLD_LIGHT;
        else if (q < 0.80) rgb = C_EM_BRIGHT;
        else rgb = C_EM_MID;
        const aByte = Math.round(255 * spireFade * (1 - hf * 0.20));
        setCoreMaskPx104(coreBuf104, cx + sway + dx, py, rgb, aByte);
      }
    }
    compositeCoreWithSelout104(coreBuf104, cell104, C_SELOUT, spireFade > 0.35 ? 0.88 * spireFade : 0);
    // Spire apex star-crown flare
    const apexSway = Math.sin(geyserH * 0.16 - u * 14) * 2.3;
    drawStarGlint104(cell104, cx + apexSway, cy - geyserH, 3.6 * spireFade, u * 1.8, C_GOLD_LIGHT, 0.92 * spireFade);
  }

  // 4. Front half of Helical Emerald-Gold Wind Ribbons
  if (spireFade > 0.08 && geyserH > 4) {
    for (let rib = 0; rib < 2; rib++) {
      const rOff = rib * Math.PI;
      for (let h = 0; h <= geyserH + 3; h += 0.32) {
        const hf = h / Math.max(1, geyserH);
        const rad = (10.2 - hf * 4.6) * (0.72 + 0.28 * spireFade);
        const a = h * 0.25 - u * 16.5 + rOff;
        if (Math.cos(a) < 0) continue;
        const hx = cx + Math.sin(a) * rad;
        const hy = cy - h;
        const hot = Math.cos(a) > 0.65;
        const rgb = rib === 0 ? (hot ? C_WHITE : C_GOLD_LIGHT) : hot ? C_EM_MINT : C_EM_BRIGHT;
        blendRgba104(cell104, hx, hy, rgb, 0.94 * spireFade);
        blendRgba104(cell104, hx, hy + 1, rib === 0 ? C_GOLD_DEEP : C_EM_MID, 0.72 * spireFade);
      }
    }
  }

  // 5. Front half of Ground Runic Star-Compass + Crater Starburst
  drawGroundCompass(true);

  if (u < 0.42) {
    const burstK = 1 - u / 0.42;
    drawStarGlint104(cell104, cx, cy - 2, 13 * burstK + 3, u * 1.2, C_GOLD_LIGHT, 0.96 * burstK);
  }

  // 6. Rising Star-Glints spiraling up around the wind-geyser (stay animated through F29!)
  for (let g = 0; g < 8; g++) {
    const gPhase = (u * 1.12 + g * 0.125) % 1.0;
    const gy = cy - 4 - gPhase * 64; // rises smoothly up into y = 16..24
    const gAng = u * 7.5 + g * ((Math.PI * 2) / 8);
    const gx = cx + Math.cos(gAng) * (6 + (g % 3) * 5.2 + gPhase * 4);
    const gAlpha = Math.sin(gPhase * Math.PI) * fade * 0.96;
    const arm = 2.0 + (g % 2) * 1.2;
    drawStarGlint104(cell104, gx, gy, arm, u * 2 + g, g % 2 === 0 ? C_GOLD_LIGHT : C_EM_MINT, gAlpha);
  }
}

function bakeArcherExVfxSheet() {
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
    dbgRgba[i * 4] = 10;
    dbgRgba[i * 4 + 1] = 22;
    dbgRgba[i * 4 + 2] = 20;
    dbgRgba[i * 4 + 3] = 255;
  }

  const rowSpecs = [
    {
      name: 'Row 0: Piercing Emerald-Gold Astral Wind-Arrow (F00..F29)',
      windowSec: 0.50,
      def: SYLVAN_EFFECT_REGISTRY.sylvanSupersonicArrowLoop,
      cfg: { x: 52, y: 52, length: 68, palette: SYLVAN_EMERALD_PALETTE, seed: 183 }
    },
    {
      name: 'Row 1: Descending Starfall Comet-Arrow (F00..F11) & Ground Star-Sigil Wind Geyser (F12..F29)',
      windowSec: 1.00,
      customRow1: true
    },
    {
      name: 'Row 2: Verdant Yggdrasil Root-Star Snare Sigil (F00..F29)',
      windowSec: 1.00,
      def: SYLVAN_EFFECT_REGISTRY.verdantBrambleSnareCell,
      cfg: { x: 52, y: 52, palette: SYLVAN_EMERALD_PALETTE, seed: 229 }
    },
    {
      name: 'Row 3: Tempest Astral Wind-Dragon Vortex (F00..F29)',
      windowSec: 1.00,
      def: SYLVAN_EFFECT_REGISTRY.tempestWindDragonVortexCell,
      cfg: { x: 52, y: 54, palette: SYLVAN_EMERALD_PALETTE, seed: 241 }
    },
    {
      name: 'Row 4: Emerald-Gold Star-Cross Impact Burst (F00..F29)',
      windowSec: 1.00,
      def: SYLVAN_EFFECT_REGISTRY.emeraldStarCrossBurstCell,
      cfg: { x: 52, y: 52, palette: SYLVAN_STARLIGHT_PALETTE, seed: 257 }
    },
    {
      name: 'Row 5: Yggdrasil World-Tree & Sagittarius Constellation Canopy Seal (F00..F29)',
      windowSec: 1.00,
      def: SYLVAN_EFFECT_REGISTRY.yggdrasilConstellationSealCell,
      cfg: { x: 52, y: 52, palette: SYLVAN_EMERALD_PALETTE, seed: 269 }
    },
    {
      name: 'Row 6: Colossal Drawn Golden-Emerald Celestial Greatbow Muzzle (F00..F29)',
      windowSec: 1.00,
      def: SYLVAN_EFFECT_REGISTRY.colossalCelestialGreatbowCell,
      cfg: { x: 52, y: 52, palette: SYLVAN_STARLIGHT_PALETTE, seed: 281 }
    },
    {
      name: 'Row 7: World-Piercing Supernova Dragon-Arrow Beam Segment (F00..F29)',
      windowSec: 1.00,
      def: SYLVAN_EFFECT_REGISTRY.supernovaDragonBeamSegmentCell,
      cfg: { x: 52, y: 52, palette: SYLVAN_EMERALD_PALETTE, seed: 293 }
    }
  ];

  const surface104 = createPixelSurface(LOGICAL, LOGICAL);
  const pen104 = new ShaderPen(surface104);
  const cell104 = new Uint8Array(LOGICAL * LOGICAL * 4);
  const prevCell104 = new Uint8Array(LOGICAL * LOGICAL * 4);
  const coreBuf104 = new Uint8Array(LOGICAL * LOGICAL * 4);
  const cell208 = new Uint8Array(CELL * CELL * 4);
  let borderClips = 0;
  let minTransitions = 29;

  for (let r = 0; r < ROWS; r++) {
    const spec = rowSpecs[r];
    const dt = spec.windowSec / COLS;
    const inst = spec.customRow1 ? null : instantiateShaderEffect(spec.def, spec.cfg);
    let rowTransitions = 0;

    for (let c = 0; c < COLS; c++) {
      if (spec.customRow1) {
        renderRow1StarfallAndGeyser104(c, surface104, pen104, cell104, coreBuf104);
      } else {
        clearPixelSurface(surface104);
        inst.render(pen104, 'back');
        inst.render(pen104, 'front');
        resolveSurfaceToRGBA(surface104, cell104, 1.18);
      }
      applyRowSoftEnvelope104(cell104, r, LOGICAL, LOGICAL);
      enforceSafeCellMargin104(cell104, LOGICAL, LOGICAL);

      if (c > 0) {
        let differs = false;
        for (let i = 0; i < cell104.length; i += 4) {
          if (
            cell104[i] !== prevCell104[i] ||
            cell104[i + 1] !== prevCell104[i + 1] ||
            cell104[i + 2] !== prevCell104[i + 2] ||
            cell104[i + 3] !== prevCell104[i + 3]
          ) {
            differs = true;
            break;
          }
        }
        if (differs) rowTransitions++;
      }
      prevCell104.set(cell104);

      cell208.fill(0);
      blitUpscaledNearest(cell104, LOGICAL, LOGICAL, 2, cell208, CELL, 0, 0);
      if (has4pxBorderClip208(cell208, CELL, 4)) borderClips++;

      blitUpscaledNearest(cell104, LOGICAL, LOGICAL, 2, sheetRgba, sheetW, c * CELL, r * CELL);

      const dx = dbgPad + c * (LOGICAL + dbgPad);
      const dy = dbgPad + r * (LOGICAL + dbgPad);
      for (let yy = 0; yy < LOGICAL; yy++) {
        for (let xx = 0; xx < LOGICAL; xx++) {
          const isEdge = xx === 0 || yy === 0 || xx === LOGICAL - 1 || yy === LOGICAL - 1;
          const o = ((dy + yy) * dbgW + (dx + xx)) * 4;
          dbgRgba[o] = isEdge ? 28 : 14;
          dbgRgba[o + 1] = isEdge ? 68 : 26;
          dbgRgba[o + 2] = isEdge ? 56 : 28;
          dbgRgba[o + 3] = 255;
        }
      }
      alphaCompositeOnto(cell104, LOGICAL, LOGICAL, dbgRgba, dbgW, dx, dy);

      if (inst) inst.step(dt);
    }
    if (rowTransitions < minTransitions) minTransitions = rowTransitions;
    console.log(`[archer_ex_vfx] Baked ${spec.name} (30 frames, transitions=${rowTransitions}/29)`);
  }

  const outVfxPath = path.join(REPO_ROOT, 'assets', 'sprites', 'archer_ex_vfx.png');
  fs.writeFileSync(outVfxPath, encodeRgbaPng(sheetW, sheetH, sheetRgba));

  fs.mkdirSync(SCRATCH_DIR, { recursive: true });
  const outDbgPath = path.join(SCRATCH_DIR, 'debug_archer_ex_vfx.png');
  fs.writeFileSync(outDbgPath, encodeRgbaPng(dbgW, dbgH, dbgRgba));

  console.log(
    `[archer_ex_vfx] Wrote ${outVfxPath} (${sheetW}x${sheetH}) & ${outDbgPath} | borderClips=${borderClips}/240 | minTransitions=${minTransitions}/29`
  );
  if (borderClips > 0 || minTransitions < 29) process.exitCode = 1;
}

bakeArcherExVfxSheet();
