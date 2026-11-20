#!/usr/bin/env node
/**
 * First-Party ArcaneShaderFX Stage & Monument Overlay Pixel-VFX Sheet Builder (`adv_stage_vfx.png`).
 *
 * Crafts 12 biome-matched rows x 16 seamless loop frames @ 128x128 (`2048x1536` RGBA)
 * using `ArcaneShaderFX.js` (`createPixelSurface`, 4x4 Bayer ordered stipple dithering,
 * `fbmNoise2D` plasma turbulence, `buildLightningChain`, and crisp cel-stepped ramps).
 *
 * Rendered on a `64x64` logical pixel grid and upscaled `2x NEAREST` to `128x128`
 * (`100.0%` `2x2` crisp pixel blocks, `0/192` border clips within `3px` logical / `6px` output margin).
 *
 * Rows:
 *   Row 0:  SOLAR_BRAZIER_FLAME        — Zone I Tapered 4-Tone Golden Solar Braziers (`lip = 0.844`)
 *   Row 1:  ASTRAL_CYAN_FLAME          — Zone I Tapered 4-Tone Astral Cyan Braziers (`lip = 0.844`)
 *   Row 2:  STARWOOD_SPIRIT_PLUME      — Zone II Tapered 4-Tone Starwood Spirit-Fire Bowls (`lip = 0.844`)
 *   Row 3:  WATERFALL_CASCADE_FOAM     — Zone II Lush Multi-Strand Silver-Aqua Water Ribbons & Spray
 *   Row 4:  BONEGATE_SOUL_PYRE         — Zone III Tapered 4-Tone Necrotic Violet Soul-Pyres (`lip = 0.844`)
 *   Row 5:  CORONA_LIGHTNING_ARC       — Zone I/III/IV Razor-Thin Forked Celestial Gold/Cyan Pixel Arcs
 *   Row 6:  BLACKPIT_HELLFIRE_ROAR     — Zone IV Tapered 4-Tone Obsidian Hellfire Roar (`lip = 0.844`)
 *   Row 7:  PLUNGE_MIST_WISP           — Zone I/II Airy Drifting Pixel Spray & Soft Mist Curls
 *   Row 8:  OSSUARY_CRYPT_MIST_COIL    — Zone III Airy Coiling Necropolis Soul-Mist & Ghost Sparks
 *   Row 9:  MOLTEN_FISSURE_SURGE       — Zone IV Sharp 4-Tone Molten Fissure Surge & Lava Spatter
 *   Row 10: SOLAR_ASTRAL_DUAL_FLAME    — Zone I Tall Dual-Tone Braziers (Solar Gold Core + Cyan Mantle)
 *   Row 11: CRYSTAL_LANTERN_PRISM_AURA — Closed Hanging Glass Lanterns, Root Crystals & Shrine Relic Cores
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
  buildColorRamp,
  fbmNoise2D,
  buildLightningChain,
  DeterministicRng,
  clamp01
} from '../src/engine/ArcaneShaderFX.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const OUT_PNG = path.join(REPO_ROOT, 'assets/sprites/adv_stage_vfx.png');

const COLS = 16;
const ROWS = 12;
const LOGICAL_SZ = 64;
const SCALE = 2;
const CELL_SZ = LOGICAL_SZ * SCALE; // 128
const SHEET_W = COLS * CELL_SZ; // 2048
const SHEET_H = ROWS * CELL_SZ; // 1536

const RAMP_SOLAR = buildColorRamp(
  ['#2a0e04', '#7c2d12', '#c2410c', '#ea580c', '#f59e0b', '#facc15', '#fef08a', '#ffffff'],
  8
);
const RAMP_ASTRAL_CYAN = buildColorRamp(
  ['#082038', '#0c4a6e', '#0369a1', '#0284c7', '#0ea5e9', '#38bdf8', '#bae6fd', '#ffffff'],
  8
);
const RAMP_STARWOOD = buildColorRamp(
  ['#042f2e', '#065f46', '#0d9488', '#14b8a6', '#2dd4bf', '#6ee7b7', '#ccfbf1', '#ffffff'],
  8
);
// Refined silver-white / misty-aqua Starwood waterfall ramp matching `adv_vista_pano.png`
const RAMP_WATERFALL = buildColorRamp(
  ['#0e3c4c', '#1c6378', '#2e90a6', '#56bacc', '#8be0ed', '#c4f1f8', '#e6fbfe', '#ffffff'],
  8
);
const RAMP_MIST = buildColorRamp(
  ['#0b3d4a', '#166573', '#2ca3b0', '#5eead4', '#99f6e4', '#cffafe', '#ecfeff', '#ffffff'],
  8
);
const RAMP_NECROTIC = buildColorRamp(
  ['#1e0936', '#4c1d95', '#6d28d9', '#9333ea', '#a855f7', '#d946ef', '#f5d0fe', '#ffffff'],
  8
);
// Razor-thin celestial gold / electric-cyan lightning accents
const RAMP_LIGHTNING_CYAN = buildColorRamp(
  ['#0c2a54', '#1d4ed8', '#0284c7', '#38bdf8', '#7dd3fc', '#bae6fd', '#e0f2fe', '#ffffff'],
  8
);
const RAMP_LIGHTNING_GOLD = buildColorRamp(
  ['#451a03', '#92400e', '#d97706', '#f59e0b', '#fbbf24', '#fde047', '#fef9c3', '#ffffff'],
  8
);
const RAMP_HELLFIRE = buildColorRamp(
  ['#2b0606', '#7f1d1d', '#b91c1c', '#dc2626', '#ea580c', '#fb923c', '#fde047', '#fffbeb'],
  8
);
const RAMP_MAGMA = buildColorRamp(
  ['#1f0808', '#5c1111', '#991b1b', '#dc2626', '#f97316', '#facc15', '#fef08a', '#ffffff'],
  8
);

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
  const compressed = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    makePngChunk('IHDR', ihdr),
    makePngChunk('IDAT', compressed),
    makePngChunk('IEND', Buffer.alloc(0))
  ]);
}

/** Seamless 16-frame periodic 2D FBM noise (`u` in `[0, 1)` loops smoothly at `u = 1 -> 0`!). */
function seamlessFlowNoise(x, y, u, scrollY, seed) {
  const uA = u;
  const uB = (u + 0.5) % 1;
  const wA = 0.5 - 0.5 * Math.cos(uA * Math.PI * 2);
  const wB = 1 - wA;
  const nA = fbmNoise2D(x + Math.sin(u * Math.PI * 2) * 0.55, y + uA * scrollY, seed, 2);
  const nB = fbmNoise2D(x + Math.cos(u * Math.PI * 2) * 0.55, y + (uB - 0.5) * scrollY, seed + 97, 2);
  return nA * wA + nB * wB;
}

/**
 * Super-elliptical (`L^4`) organic safety margin on `64x64`:
 * Preserves wide brazier flame bases & tall waterfall ribbons cleanly while strictly
 * guaranteeing `0` pixels within `3px` (`6px` @ `128x128`) of any cell border!
 */
function enforceOrganicMargin64(rgba, w = 64, h = 64) {
  const cx = (w - 1) * 0.5;
  const cy = (h - 1) * 0.5;
  const halfSpan = 28.5;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      if (x < 3 || y < 3 || x >= w - 3 || y >= h - 3) {
        rgba[o] = 0;
        rgba[o + 1] = 0;
        rgba[o + 2] = 0;
        rgba[o + 3] = 0;
        continue;
      }
      const nx = Math.abs(x - cx) / halfSpan;
      const ny = Math.abs(y - cy) / halfSpan;
      const d4 = Math.pow(nx * nx * nx * nx + ny * ny * ny * ny, 0.25);
      if (d4 >= 1.0) {
        rgba[o] = 0;
        rgba[o + 1] = 0;
        rgba[o + 2] = 0;
        rgba[o + 3] = 0;
      } else if (d4 > 0.89 && rgba[o + 3] > 0) {
        const k = (1.0 - d4) / 0.11;
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
          const doff = (ty * dstW + tx) * 4;
          dstRgba[doff] = r;
          dstRgba[doff + 1] = g;
          dstRgba[doff + 2] = b;
          dstRgba[doff + 3] = a;
        }
      }
    }
  }
}

function drawPixelPlusSpark(pen, x, y, coreCol, haloCol, big = false) {
  pen.pixel(x, y, coreCol);
  if (big) {
    pen.stipple(x - 1, y, haloCol, 0.88);
    pen.stipple(x + 1, y, haloCol, 0.88);
    pen.stipple(x, y - 1, haloCol, 0.88);
    pen.stipple(x, y + 1, haloCol, 0.88);
  }
}

/**
 * Helper: Evaluates one smooth, tapered S-curved HD-2D flame tongue field (`0..1`).
 */
function evalFlameTongue(lx, ly, lipLy, baseX, baseW, height, swayPhase, swayAmp, bendInward = 0) {
  const hFrac = (lipLy - ly) / height;
  if (hFrac < -0.10 || hFrac > 1.02) return 0;
  const hClamped = Math.max(0, hFrac);
  const centerX =
    baseX * (1 - hClamped * bendInward) +
    Math.sin(swayPhase + hClamped * 4.5) * swayAmp * Math.pow(hClamped, 1.15) +
    Math.cos(swayPhase * 2 - hClamped * 5.2) * (swayAmp * 0.28) * hClamped;
  const taper =
    hFrac < 0
      ? Math.sqrt(Math.max(0, 1 - Math.pow(hFrac / 0.10, 2)))
      : Math.pow(Math.max(0, 1 - hFrac), 0.72);
  const halfW = Math.max(0.75, baseW * taper);
  const dx = Math.abs(lx - centerX);
  if (dx > halfW + 1.5) return 0;
  const rad = clamp01(1 - dx / halfW);
  return rad * (1 - hClamped * 0.36);
}

/**
 * Crisp 4-Tone Tapered HD-2D Brazier / Pyre / Cauldron Flame (`Rows 0, 1, 2, 4, 6`).
 * Bowl lip remains strictly locked at `ly = +22` (`y_64 = 54` -> `y_128 = 108` -> `0.84375`).
 * Uses 3 continuous S-curved tapered flame tongues unified over a glowing ember meniscus
 * (zero detached bottom blobs, crisp 4-tone cel silhouette!).
 */
function renderBrazierFlameCell(pen, u, ramp, opts) {
  const {
    seed,
    baseWidth = 17.0,
    flameHeight = 45,
    swayAmp = 3.2,
    sparkCount = 7,
    wispOrbit = false
  } = opts;

  const ang = u * Math.PI * 2;
  const lipLy = 22;
  pen.configure(32, 32, false, 0, 1, 1);

  const mainW = baseWidth * 0.64;
  const sideW = baseWidth * 0.42;
  const sideOff = baseWidth * 0.48;

  pen.shadeBox(-27, -27, 27, 26, (lx, ly, out) => {
    if (ly < lipLy - flameHeight - 3 || ly > lipLy + 4) return 0;

    const n1 = seamlessFlowNoise(lx * 0.16, ly * 0.14, u, 6.0, seed);
    const n2 = seamlessFlowNoise(lx * 0.30 + 5.7, ly * 0.26, u, 9.0, seed + 43);

    // 3 unified continuous tapered flame tongues (central main crest + 2 inward-curving flanking licks)
    const tCenter = evalFlameTongue(lx, ly, lipLy, 0, mainW, flameHeight, ang, swayAmp, 0);
    const tLeft = evalFlameTongue(
      lx,
      ly,
      lipLy,
      -sideOff,
      sideW,
      flameHeight * 0.64 + Math.sin(ang + 1.1) * 3.2,
      ang + 1.4,
      swayAmp * 0.72,
      0.38
    );
    const tRight = evalFlameTongue(
      lx,
      ly,
      lipLy,
      sideOff,
      sideW,
      flameHeight * 0.60 + Math.cos(ang + 0.6) * 3.0,
      ang + 3.2,
      swayAmp * 0.72,
      0.38
    );

    // Smooth curved ember-bed meniscus uniting all 3 tongues cleanly across the bowl lip
    const dyBowl = (ly - (lipLy - 1.5)) / 4.2;
    const dxBowl = lx / (baseWidth * 0.94);
    const bowlBed = Math.max(0, 1 - (dxBowl * dxBowl + dyBowl * dyBowl)) * 0.86;

    const baseField = Math.max(tCenter, tLeft * 0.92, tRight * 0.92, bowlBed);
    if (baseField <= 0.04) return 0;

    const hFrac = clamp01((lipLy - ly) / flameHeight);
    const heat = baseField + n1 * (0.18 + hFrac * 0.14) + n2 * 0.10 - hFrac * 0.12;
    if (heat <= 0.14) return 0;

    // Crisp 4-tone cel-stepped flame palette (`dark rim -> mid -> bright -> hot sculpted heart`)
    let idx;
    if (heat >= 0.84 && hFrac < 0.56) {
      idx = 7;
    } else if (heat >= 0.62) {
      idx = 5;
    } else if (heat >= 0.36) {
      idx = 3;
    } else {
      idx = 1;
    }
    out.color = ramp[idx];
    out.alpha = heat < 0.24 ? clamp01((heat - 0.14) / 0.10) : 1.0;
    out.glowColor = ramp[Math.min(7, idx + 1)];
    out.glowStrength = heat >= 0.62 ? 0.26 : 0.08;
    return out.color;
  });

  // Tapered rising pixel embers cleanly detached above the tongues
  for (let s = 0; s < sparkCount; s++) {
    const life = (u + s / sparkCount) % 1;
    const riseY = 16 - life * 41;
    const spreadX = wispOrbit
      ? Math.sin(ang + s * 1.9 + life * 4.8) * (11 + (s % 3) * 3.0)
      : (((s * 17) % 9) - 4) * 2.5 * (1 - life * 0.35) + Math.sin(ang * 2 + s * 1.7) * 2.4;
    const px = Math.round(spreadX);
    const py = Math.round(riseY);
    if (Math.abs(px) > 25 || Math.abs(py) > 25) continue;
    const fade = Math.sin(life * Math.PI);
    if (fade < 0.26) continue;
    const core = life < 0.38 ? ramp[7] : life < 0.72 ? ramp[5] : ramp[3];
    drawPixelPlusSpark(pen, px, py, core, ramp[4], fade > 0.68 && s % 2 === 0);
  }
}

/**
 * Row 10: Crisp 4-Tone Dual-Tone Solar-Core + Astral-Cyan-Mantle Cathedral Brazier Flame!
 */
function renderDualSolarAstralFlameCell(pen, u) {
  const ang = u * Math.PI * 2;
  const lipLy = 22;
  const baseWidth = 17.4;
  const flameHeight = 46;
  const swayAmp = 3.1;
  pen.configure(32, 32, false, 0, 1, 1);

  const mainW = baseWidth * 0.64;
  const sideW = baseWidth * 0.42;
  const sideOff = baseWidth * 0.48;

  pen.shadeBox(-27, -27, 27, 26, (lx, ly, out) => {
    if (ly < lipLy - flameHeight - 3 || ly > lipLy + 4) return 0;

    const n1 = seamlessFlowNoise(lx * 0.16, ly * 0.14, u, 6.0, 1013);
    const n2 = seamlessFlowNoise(lx * 0.30 + 5.3, ly * 0.26, u, 8.8, 1061);

    const tCenter = evalFlameTongue(lx, ly, lipLy, 0, mainW, flameHeight, ang, swayAmp, 0);
    const tLeft = evalFlameTongue(
      lx,
      ly,
      lipLy,
      -sideOff,
      sideW,
      flameHeight * 0.64 + Math.sin(ang + 1.0) * 3.0,
      ang + 1.3,
      swayAmp * 0.72,
      0.38
    );
    const tRight = evalFlameTongue(
      lx,
      ly,
      lipLy,
      sideOff,
      sideW,
      flameHeight * 0.60 + Math.cos(ang + 0.7) * 3.0,
      ang + 3.1,
      swayAmp * 0.72,
      0.38
    );
    const dyBowl = (ly - (lipLy - 1.5)) / 4.2;
    const dxBowl = lx / (baseWidth * 0.94);
    const bowlBed = Math.max(0, 1 - (dxBowl * dxBowl + dyBowl * dyBowl)) * 0.86;

    const baseField = Math.max(tCenter, tLeft * 0.92, tRight * 0.92, bowlBed);
    if (baseField <= 0.04) return 0;

    const hFrac = clamp01((lipLy - ly) / flameHeight);
    const heat = baseField + n1 * (0.18 + hFrac * 0.14) + n2 * 0.10 - hFrac * 0.12;
    if (heat <= 0.14) return 0;

    // Outer 2 cel tiers burn Astral Cyan; inner 2 cel tiers blaze Solar Gold!
    let ramp = RAMP_ASTRAL_CYAN;
    let idx = 1;
    if (heat >= 0.82 && hFrac < 0.58) {
      ramp = RAMP_SOLAR;
      idx = 7;
    } else if (heat >= 0.58 && hFrac < 0.74) {
      ramp = RAMP_SOLAR;
      idx = 5;
    } else if (heat >= 0.36) {
      ramp = RAMP_ASTRAL_CYAN;
      idx = 4;
    } else {
      ramp = RAMP_ASTRAL_CYAN;
      idx = 1;
    }
    out.color = ramp[idx];
    out.alpha = heat < 0.24 ? clamp01((heat - 0.14) / 0.10) : 1.0;
    out.glowColor = ramp[Math.min(7, idx + 1)];
    out.glowStrength = heat >= 0.58 ? 0.28 : 0.10;
    return out.color;
  });

  for (let s = 0; s < 7; s++) {
    const life = (u + s / 7) % 1;
    const px = Math.round((((s * 17) % 9) - 4) * 2.5 * (1 - life * 0.34) + Math.sin(ang * 2 + s * 1.6) * 2.4);
    const py = Math.round(16 - life * 41);
    if (Math.abs(px) > 25 || Math.abs(py) > 25) continue;
    const fade = Math.sin(life * Math.PI);
    if (fade < 0.26) continue;
    const ramp = s % 2 === 0 ? RAMP_ASTRAL_CYAN : RAMP_SOLAR;
    drawPixelPlusSpark(pen, px, py, ramp[7], ramp[5], fade > 0.68);
  }
}

/**
 * Row 11: Centered Radial Faceted Prism Pulse, Cross-Glints & Orbiting Fairy Motes (`0` fire tongue!).
 */
function renderCrystalLanternPrismCell(pen, u) {
  const ang = u * Math.PI * 2;
  pen.configure(32, 32, false, 0, 1, 1);

  const pulse = 0.82 + 0.18 * Math.sin(ang);
  pen.shadeBox(-25, -25, 25, 25, (lx, ly, out) => {
    const nx = lx / (16.5 * pulse);
    const ny = ly / (18.5 * pulse);
    const diamond = Math.abs(nx) * 0.72 + Math.abs(ny) * 0.72;
    const euclid = Math.hypot(nx, ny);
    const d = diamond * 0.58 + euclid * 0.42;
    if (d > 1.12) return 0;

    const rayX = Math.max(0, 1 - Math.abs(ly) / 2.2) * Math.max(0, 1 - Math.abs(lx) / (21 * pulse));
    const rayY = Math.max(0, 1 - Math.abs(lx) / 2.2) * Math.max(0, 1 - Math.abs(ly) / (23 * pulse));
    const ray = Math.max(rayX, rayY) * (0.68 + 0.32 * Math.cos(ang * 2));
    const n = seamlessFlowNoise(lx * 0.22, ly * 0.22, u, 3.2, 1187);

    const energy = Math.max(ray, (1 - d) * 0.92 + n * 0.18);
    if (energy <= 0.12) return 0;

    const idx = Math.max(1, Math.min(7, Math.floor(clamp01(energy * 1.18) * 7.99)));
    const ramp = lx + ly + Math.sin(ang) * 4 > 0 ? RAMP_STARWOOD : RAMP_ASTRAL_CYAN;
    out.color = ramp[idx];
    out.alpha = energy < 0.38 ? clamp01((energy - 0.12) / 0.26) : 0.92;
    out.glowColor = ramp[Math.min(7, idx + 1)];
    out.glowStrength = energy > 0.62 ? 0.28 : 0.10;
    return out.color;
  });

  for (let m = 0; m < 5; m++) {
    const theta = ang + (m / 5) * Math.PI * 2;
    const rx = 12 + (m % 2) * 5;
    const ry = 14 + ((m + 1) % 2) * 4;
    const mx = Math.round(Math.cos(theta) * rx);
    const my = Math.round(Math.sin(theta) * ry);
    if (Math.abs(mx) <= 24 && Math.abs(my) <= 24) {
      const tw = 0.5 + 0.5 * Math.sin(ang * 2 + m * 1.4);
      drawPixelPlusSpark(
        pen,
        mx,
        my,
        RAMP_STARWOOD[7],
        m % 2 === 0 ? RAMP_STARWOOD[5] : RAMP_ASTRAL_CYAN[5],
        tw > 0.55
      );
    }
  }
}

/**
 * Row 3 (`WATERFALL_CASCADE_FOAM`):
 * Lush, organic, multi-strand HD-2D cascading silver-white/aqua water ribbons with
 * silky translucent water-veil, tapered cliff-lip entry, staggered falling foam highlights,
 * and fluffy billowing plunge spray (`0` blocky cyan bars, `0` skinny sticks, `0` hard box borders!).
 */
function renderWaterfallCascadeCell(pen, u) {
  const ang = u * Math.PI * 2;
  pen.configure(32, 32, false, 0, 1, 1);

  // 4 organic staggered water ribbons spanning generously across the cell with seamless periodic downward flow
  const strands = [
    { cx: -11.5, halfW: 3.4, cycles: 2, phase: 0.10, amp: 1.0, topY: -22, botY: 20, fan: -0.16 },
    { cx: -3.8, halfW: 4.6, cycles: 1, phase: 0.44, amp: 1.1, topY: -25, botY: 22, fan: -0.05 },
    { cx: 3.6, halfW: 4.4, cycles: 2, phase: 0.72, amp: 1.05, topY: -24, botY: 21, fan: 0.06 },
    { cx: 11.4, halfW: 3.2, cycles: 1, phase: 0.28, amp: 0.95, topY: -21, botY: 19, fan: 0.16 }
  ];

  pen.shadeBox(-27, -26, 27, 26, (lx, ly, out) => {
    if (ly < -25 || ly > 24) return 0;

    const fallNoise = seamlessFlowNoise(lx * 0.24, ly * 0.10, (1 - u) % 1, 8.0, 317);
    const fineSprayNoise = seamlessFlowNoise(lx * 0.40 + 4.1, ly * 0.30, u, 5.0, 389);

    // 1. Evaluate multi-strand organic cascading silver-aqua ribbons
    let bestEnergy = 0;
    let bestHighlight = 0;
    for (let s = 0; s < strands.length; s++) {
      const st = strands[s];
      if (ly < st.topY - 1 || ly > st.botY + 3) continue;
      const frac = clamp01((ly - st.topY) / Math.max(1, st.botY - st.topY));
      const topEnv = smoothTaper(frac, 0.0, 0.18);
      const botEnv = 1 - smoothTaper(frac, 0.80, 1.0);
      const vEnv = topEnv * botEnv;
      if (vEnv <= 0.02) continue;

      const ribbonCx =
        st.cx +
        frac * st.fan * 11 +
        Math.sin(ly * 0.14 - ang + st.phase * Math.PI * 2) * st.amp +
        (fallNoise - 0.5) * 1.5;
      const curHalfW = st.halfW * (0.78 + frac * 0.44) * (0.86 + 0.22 * topEnv);
      const dx = Math.abs(lx - ribbonCx);
      if (dx > curHalfW + 2.2) continue;

      const rad = clamp01(1 - dx / Math.max(0.8, curHalfW));
      const scrollPhase = (frac * 1.55 - u * st.cycles + st.phase + 4) % 1;
      const crest = Math.pow(0.5 + 0.5 * Math.cos(scrollPhase * Math.PI * 2), 2.4);
      const microStreak = Math.pow(
        0.5 + 0.5 * Math.cos((frac * 2.8 - u * 2 + st.phase * 1.7 + 4) * Math.PI * 2),
        2.2
      );

      const strandBody = rad * vEnv * (0.58 + 0.34 * crest + 0.18 * fallNoise);
      const strandHi = Math.pow(rad, 1.25) * vEnv * (crest * 0.82 + microStreak * 0.36);
      if (strandBody > bestEnergy) bestEnergy = strandBody;
      if (strandHi > bestHighlight) bestHighlight = strandHi;
    }

    // Silky continuous translucent aqua-silver water-sheet softly uniting the falling strands
    const sheetFrac = clamp01((ly + 24) / 45);
    const sheetV = smoothTaper(sheetFrac, 0.0, 0.20) * (1 - smoothTaper(sheetFrac, 0.84, 1.0));
    const sheetHalfW = 11.5 + sheetFrac * 5.2;
    const sheetDx = Math.abs(lx - Math.sin(ly * 0.10 - ang) * 1.1);
    const sheetVeil =
      sheetDx < sheetHalfW
        ? Math.pow(1 - sheetDx / sheetHalfW, 0.95) * sheetV * (0.44 + 0.26 * fallNoise)
        : 0;
    if (sheetVeil > bestEnergy) bestEnergy = sheetVeil;

    // 2. Soft billowing silver-aqua plunge-pool mist puffs at bottom (`ly = 10..24`, zero flat bar!)
    let foamCurl = 0;
    if (ly >= 10 && ly <= 24) {
      const puffs = [
        [-13.5 + Math.sin(ang) * 1.8, 17.8, 9.2, 4.8],
        [-4.0 + Math.cos(ang + 0.9) * 1.8, 19.0, 10.6, 5.4],
        [5.2 + Math.sin(ang + 2.1) * 1.8, 18.6, 10.0, 5.2],
        [13.6 + Math.cos(ang + 3.0) * 1.6, 17.6, 8.6, 4.4]
      ];
      for (let p = 0; p < puffs.length; p++) {
        const [px, py, rx, ry] = puffs[p];
        const d = Math.hypot((lx - px) / rx, (ly - py) / ry);
        if (d < 1.15) {
          const val = clamp01(1 - d) * (0.64 + 0.42 * fineSprayNoise);
          if (val > foamCurl) foamCurl = val;
        }
      }
    }

    const total = Math.max(bestEnergy, foamCurl * 0.92);
    if (total <= 0.16) return 0;

    // Luminous pale-aqua & silver-white highlights (skip muddy dark-teal outlines so it stays silky!)
    const toneVal = clamp01(total * 0.68 + bestHighlight * 0.64 + foamCurl * 0.30);
    let idx;
    if (toneVal >= 0.76) idx = 7;
    else if (toneVal >= 0.56) idx = 6;
    else if (toneVal >= 0.36) idx = 5;
    else idx = 3;

    out.color = RAMP_WATERFALL[idx];
    out.alpha =
      total < 0.44
        ? clamp01((total - 0.16) / 0.28) * 0.80
        : Math.min(0.92, 0.68 + bestHighlight * 0.26);
    out.glowColor = RAMP_WATERFALL[Math.min(7, idx + 1)];
    out.glowStrength = idx >= 6 ? 0.22 : 0.08;
    return out.color;
  });

  // Staggered falling silver spray streaks & leaping plunge micro-droplets
  for (let d = 0; d < 10; d++) {
    const life = (u + d / 10) % 1;
    if (d < 4) {
      // Delicate falling shimmer droplets detached near the ribbon flanks
      const sx = Math.round(((d % 2 === 0 ? -1 : 1) * (5 + (d % 3) * 3.5)) + Math.sin(ang + d * 1.9) * 1.4);
      const sy = Math.round(-18 + life * 36);
      const fade = Math.sin(life * Math.PI);
      if (fade > 0.25 && Math.abs(sx) < 24 && Math.abs(sy) < 24) {
        pen.stipple(sx, sy, RAMP_WATERFALL[7], fade * 0.9);
        if (sy - 1 > -24) pen.stipple(sx, sy - 1, RAMP_WATERFALL[5], fade * 0.55);
      }
    } else {
      // Airy arcing plunge-pool spray flecks
      const k = d - 4;
      const dir = k % 2 === 0 ? 1 : -1;
      const arc = Math.sin(life * Math.PI);
      const dx = Math.round(dir * (4 + (k % 3) * 3.2 + life * 9.5));
      const dy = Math.round(18 - arc * (6.5 + (k % 3) * 2.2));
      if (arc > 0.25 && Math.abs(dx) < 25 && Math.abs(dy) < 24) {
        pen.stipple(dx, dy, k % 2 === 0 ? RAMP_WATERFALL[7] : RAMP_WATERFALL[5], arc * 0.88);
      }
    }
  }
}

function smoothTaper(x, edge0, edge1) {
  const t = clamp01((x - edge0) / Math.max(0.0001, edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/**
 * Row 5 (`CORONA_LIGHTNING_ARC`):
 * Razor-thin forked celestial gold / electric-cyan pixel arcs:
 * clean 1px logical (`2px` output) blazing core + tight 1px electric rim (`4px` total rim),
 * crisp acute sub-branches, zero chunky blobs, zero dead invisible frames!
 */
function renderArcaneLightningCell(pen, frameIdx) {
  pen.configure(32, 32, false, 0, 1, 1);
  const rng = new DeterministicRng(9413 + frameIdx * 197);

  // Cohesive celestial ice-white core + crisp electric cyan/azure rim across all 16 frames
  // (looks sharp & harmonious across Zone I Eclipse, Zone III Necropolis & Zone IV Caldera!)
  const pulseCycle = [1.0, 0.94, 0.86, 0.96, 0.80, 0.92, 0.88, 0.76];
  const fade = pulseCycle[frameIdx % pulseCycle.length];
  const rimOuter = frameIdx % 2 === 0 ? RAMP_LIGHTNING_CYAN[2] : '#6366f1';
  const rimInner = frameIdx % 2 === 0 ? RAMP_LIGHTNING_CYAN[4] : RAMP_LIGHTNING_CYAN[5];
  const coreCol = frameIdx % 4 === 0 ? '#fefce8' : '#ffffff';

  // Sweep crisp organic endpoints across frames so lightning arcs naturally over crests & spires
  const xTop = rng.between(-11, 11);
  const xBot = rng.between(-11, 11);
  const yTop = -23;
  const yBot = 23;
  const mainChain = buildLightningChain(rng, xTop, yTop, xBot, yBot, 0.24, 3);

  // Pass 1: Tight 1px-logical electric rim (`4px` total rim width @ 2x) flanking the core — ZERO chunky blobs!
  for (let i = 1; i < mainChain.length; i++) {
    const [x0, y0] = mainChain[i - 1];
    const [x1, y1] = mainChain[i];
    pen.line(x0 - 1, y0, x1 - 1, y1, rimOuter, 0.86);
    pen.line(x0 + 1, y0, x1 + 1, y1, rimInner, 0.90);
  }

  // Pass 2: 2 crisp acute forked sub-branches tapering to razor-sharp 1px tips
  const forkIdxA = Math.max(1, Math.min(mainChain.length - 2, Math.floor(mainChain.length * 0.36)));
  const forkPtA = mainChain[forkIdxA];
  const dirA = frameIdx % 2 === 0 ? 1 : -1;
  const forkEndAX = Math.max(-23, Math.min(23, forkPtA[0] + dirA * rng.between(9, 15)));
  const forkEndAY = Math.max(-22, Math.min(22, forkPtA[1] + rng.between(8, 15)));
  const forkChainA = buildLightningChain(rng, forkPtA[0], forkPtA[1], forkEndAX, forkEndAY, 0.22, 2);
  for (let i = 1; i < forkChainA.length; i++) {
    const [x0, y0] = forkChainA[i - 1];
    const [x1, y1] = forkChainA[i];
    const taper = 1 - (i - 1) / Math.max(1, forkChainA.length);
    pen.line(x0 + dirA, y0, x1 + dirA, y1, rimOuter, 0.65 * taper + 0.15);
    pen.line(x0, y0, x1, y1, i === 1 ? coreCol : rimInner, 1.0);
  }

  const forkIdxB = Math.max(1, Math.min(mainChain.length - 2, Math.floor(mainChain.length * 0.64)));
  const forkPtB = mainChain[forkIdxB];
  const dirB = -dirA;
  const forkEndBX = Math.max(-23, Math.min(23, forkPtB[0] + dirB * rng.between(7, 13)));
  const forkEndBY = Math.max(-22, Math.min(22, forkPtB[1] + rng.between(6, 12)));
  const forkChainB = buildLightningChain(rng, forkPtB[0], forkPtB[1], forkEndBX, forkEndBY, 0.20, 2);
  for (let i = 1; i < forkChainB.length; i++) {
    const [x0, y0] = forkChainB[i - 1];
    const [x1, y1] = forkChainB[i];
    pen.line(x0, y0, x1, y1, i === 1 ? coreCol : rimInner, i === 1 ? 1.0 : 0.88);
  }

  // Pass 3: Solid, unbroken razor-thin 1px-logical (`2px` output) blazing core strictly on top!
  for (let i = 1; i < mainChain.length; i++) {
    const [x0, y0] = mainChain[i - 1];
    const [x1, y1] = mainChain[i];
    pen.line(x0, y0, x1, y1, coreCol, 1.0);
  }

  // Crisp 3px pixel diamond node at the primary fork junction (zero circular blob!)
  const jx = Math.round(forkPtA[0]);
  const jy = Math.round(forkPtA[1]);
  if (Math.abs(jx) <= 23 && Math.abs(jy) <= 23) {
    drawPixelPlusSpark(pen, jx, jy, '#ffffff', rimInner, fade > 0.82);
  }
}

/**
 * Row 7 (`PLUNGE_MIST_WISP`):
 * Airy, delicate drifting pixel spray & soft billowing mist curls for waterfall plunge pools,
 * Starwood Moonwells, and gentle Zone I/II breezes (`0` stiff dark worms!).
 */
function renderWindWispCell(pen, u) {
  const ang = u * Math.PI * 2;
  pen.configure(32, 32, false, 0, 1, 1);

  pen.shadeBox(-26, -18, 26, 18, (lx, ly, out) => {
    const envX = Math.pow(clamp01(1 - Math.abs(lx) / 25.0), 0.72);
    const envY = clamp01(1 - Math.abs(ly) / 17.5);
    if (envX <= 0.02 || envY <= 0.02) return 0;

    // 3 overlapping airy billowing mist curls drifting smoothly across the cell
    const nCurl = seamlessFlowNoise(lx * 0.14 - u * 2.0, ly * 0.19, u, 2.6, 719);
    const nFine = seamlessFlowNoise(lx * 0.28 + 3.1, ly * 0.28, (1 - u) % 1, 3.4, 757);

    const curlA = 2.5 + Math.sin(lx * 0.15 - ang) * 3.2;
    const curlB = -3.8 + Math.cos(lx * 0.12 + ang + 1.2) * 3.0;
    const curlC = 6.2 + Math.sin(lx * 0.18 - ang * 2 + 2.4) * 2.2;

    const bandA = Math.max(0, 1 - Math.abs(ly - curlA + (nCurl - 0.5) * 4.0) / 6.2) * envX;
    const bandB = Math.max(0, 1 - Math.abs(ly - curlB + (nFine - 0.5) * 3.4) / 5.4) * envX * 0.90;
    const bandC = Math.max(0, 1 - Math.abs(ly - curlC + (nCurl - 0.5) * 3.0) / 4.8) * envX * 0.82;

    const mist = Math.max(bandA, bandB, bandC) * (0.72 + 0.48 * nCurl) * envY;
    if (mist <= 0.16) return 0;

    // Airy silver-aqua / moonlit mist ramp with crisp feathered Bayer-dithered outer contour
    const tone = clamp01((mist - 0.16) / 0.62);
    const idx = tone >= 0.72 ? 7 : tone >= 0.44 ? 5 : tone >= 0.22 ? 4 : 3;
    out.color = RAMP_MIST[idx];
    out.alpha = tone < 0.34 ? clamp01(tone / 0.34) * 0.68 : 0.68 + (tone - 0.34) * 0.42;
    out.glowColor = RAMP_MIST[Math.min(7, idx + 1)];
    out.glowStrength = tone > 0.55 ? 0.20 : 0.08;
    return out.color;
  });

  // 10 delicate rising pixel spray flecks & shimmering mist droplets
  for (let p = 0; p < 10; p++) {
    const ph = (u + p * 0.1) % 1;
    const px = Math.round(-21 + ph * 42 + Math.sin(ang + p * 1.9) * 2.5);
    const py = Math.round(9 - ph * 18 + Math.sin(ph * Math.PI * 2 + p * 1.4) * 3.5);
    const fade = Math.sin(ph * Math.PI);
    if (fade > 0.24 && Math.abs(px) < 25 && Math.abs(py) < 19) {
      pen.stipple(px, py, p % 3 === 0 ? RAMP_MIST[7] : RAMP_MIST[5], fade * 0.85);
      if (p % 2 === 0 && px - 1 > -25) {
        pen.stipple(px - 1, py, RAMP_MIST[4], fade * 0.52);
      }
    }
  }
}

/** Row 8: Airy Ossuary Spectral Mist-Coil & Rising Ghost Sparks (`Zone III`). */
function renderCryptMistCell(pen, u) {
  const ang = u * Math.PI * 2;
  pen.configure(32, 32, false, 0, 1, 1);

  pen.shadeBox(-26, -19, 26, 19, (lx, ly, out) => {
    const envX = Math.pow(clamp01(1 - Math.abs(lx) / 25.0), 0.74);
    const envY = clamp01(1 - Math.abs(ly) / 18.0);
    if (envX <= 0.02 || envY <= 0.02) return 0;

    const n = seamlessFlowNoise(lx * 0.15, ly * 0.22, u, 3.6, 811);
    const coilA = 2.0 + Math.sin(lx * 0.14 - ang) * 4.0;
    const coilB = -4.5 + Math.cos(lx * 0.11 + ang + 1.6) * 3.4;

    const dA = Math.max(0, 1 - Math.abs(ly - coilA + (n - 0.5) * 4.4) / 6.4) * envX;
    const dB = Math.max(0, 1 - Math.abs(ly - coilB + (n - 0.5) * 3.8) / 5.4) * envX * 0.88;
    const density = Math.max(dA, dB) * (0.72 + n * 0.44) * envY;
    if (density <= 0.16) return 0;

    const tone = clamp01((density - 0.16) / 0.62);
    const idx = tone >= 0.72 ? 6 : tone >= 0.44 ? 4 : tone >= 0.22 ? 3 : 2;
    out.color = RAMP_NECROTIC[idx];
    out.alpha = tone < 0.34 ? clamp01(tone / 0.34) * 0.68 : 0.68 + (tone - 0.34) * 0.40;
    out.glowColor = RAMP_NECROTIC[Math.min(7, idx + 1)];
    out.glowStrength = tone > 0.52 ? 0.18 : 0.08;
    return out.color;
  });

  for (let w = 0; w < 6; w++) {
    const life = (u + w / 6) % 1;
    const wx = Math.round((w - 2.5) * 6.2 + Math.sin(ang + w * 1.7) * 3.0);
    const wy = Math.round(10 - life * 24);
    if (Math.abs(wx) < 25 && Math.abs(wy) < 22 && Math.sin(life * Math.PI) > 0.28) {
      drawPixelPlusSpark(pen, wx, wy, RAMP_NECROTIC[7], RAMP_NECROTIC[5], w % 2 === 0);
    }
  }
}

/**
 * Row 9 (`MOLTEN_FISSURE_SURGE`):
 * Sharp 4-tone tapered molten lava fissure (`crack baseline = ly +4` -> `0.5625` preserved!)
 * with crisp rising magma licks & glowing incandescent spatter sparks.
 */
function renderMoltenFissureCell(pen, u) {
  const ang = u * Math.PI * 2;
  pen.configure(32, 32, false, 0, 1, 1);

  pen.shadeBox(-26, -20, 26, 18, (lx, ly, out) => {
    const crackY = 4 + Math.sin(lx * 0.22) * 1.6;
    const envX = clamp01(1 - Math.abs(lx) / 25.0);
    if (envX <= 0.02) return 0;

    const pulse = 0.70 + 0.30 * Math.sin(ang + lx * 0.20);
    const n = seamlessFlowNoise(lx * 0.22, ly * 0.24, u, 5.4, 953);

    const crackDist = Math.abs(ly - crackY);
    let heat = 0;
    if (crackDist <= 3.6 * envX) {
      heat = (1 - crackDist / Math.max(0.6, 3.6 * envX)) * envX * (0.90 + 0.22 * pulse);
    }

    // 3 crisp tapered magma licks erupting cleanly above the fissure crack
    const l1 = evalFlameTongue(lx, ly, crackY + 1, 0, 6.2, 18 + Math.sin(ang) * 2.5, ang, 2.2, 0);
    const l2 = evalFlameTongue(lx, ly, crackY + 1, -8.5, 4.4, 12.5 + Math.cos(ang + 1.1) * 2.0, ang + 1.8, 1.8, 0.22);
    const l3 = evalFlameTongue(lx, ly, crackY + 1, 8.8, 4.2, 12.0 + Math.sin(ang + 2.4) * 2.0, ang + 3.4, 1.8, 0.22);
    const plume = Math.max(l1, l2 * 0.9, l3 * 0.9) * (0.76 + 0.30 * n) * pulse;
    if (plume > heat) heat = plume;

    if (heat <= 0.14) return 0;
    // Crisp 4-tone molten lava cel ramp
    const idx = heat >= 0.82 ? 7 : heat >= 0.58 ? 5 : heat >= 0.36 ? 3 : 1;
    out.color = RAMP_MAGMA[idx];
    out.alpha = heat < 0.26 ? clamp01((heat - 0.14) / 0.12) : 0.96;
    out.glowColor = RAMP_MAGMA[Math.min(7, idx + 1)];
    out.glowStrength = idx >= 5 ? 0.26 : 0.08;
    return out.color;
  });

  for (let c = 0; c < 7; c++) {
    const life = (u + c / 7) % 1;
    const arc = Math.sin(life * Math.PI);
    const cx = Math.round((c - 3) * 5.4 + Math.cos(ang + c * 2.1) * 2.6);
    const cy = Math.round(4 - arc * (15 + (c % 3) * 3.5));
    if (Math.abs(cx) < 25 && Math.abs(cy) < 23 && arc > 0.26) {
      drawPixelPlusSpark(pen, cx, cy, RAMP_MAGMA[7], RAMP_MAGMA[5], life < 0.48 && c % 2 === 0);
    }
  }
}

function main() {
  const surface = createPixelSurface(LOGICAL_SZ, LOGICAL_SZ);
  const pen = new ShaderPen(surface);
  const cellRgba64 = new Uint8Array(LOGICAL_SZ * LOGICAL_SZ * 4);
  const sheetRgba = new Uint8Array(SHEET_W * SHEET_H * 4);

  let borderClips = 0;
  let emptyCells = 0;

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      clearPixelSurface(surface);
      const u = col / COLS;

      if (row === 0) {
        renderBrazierFlameCell(pen, u, RAMP_SOLAR, {
          seed: 101,
          baseWidth: 17.2,
          flameHeight: 45,
          swayAmp: 3.1,
          sparkCount: 7
        });
      } else if (row === 1) {
        renderBrazierFlameCell(pen, u, RAMP_ASTRAL_CYAN, {
          seed: 211,
          baseWidth: 17.0,
          flameHeight: 44,
          swayAmp: 3.2,
          sparkCount: 7
        });
      } else if (row === 2) {
        renderBrazierFlameCell(pen, u, RAMP_STARWOOD, {
          seed: 307,
          baseWidth: 16.6,
          flameHeight: 43,
          swayAmp: 3.3,
          sparkCount: 7,
          wispOrbit: true
        });
      } else if (row === 3) {
        renderWaterfallCascadeCell(pen, u);
      } else if (row === 4) {
        renderBrazierFlameCell(pen, u, RAMP_NECROTIC, {
          seed: 503,
          baseWidth: 17.4,
          flameHeight: 45,
          swayAmp: 3.3,
          sparkCount: 7,
          wispOrbit: true
        });
      } else if (row === 5) {
        renderArcaneLightningCell(pen, col);
      } else if (row === 6) {
        renderBrazierFlameCell(pen, u, RAMP_HELLFIRE, {
          seed: 709,
          baseWidth: 18.2,
          flameHeight: 46,
          swayAmp: 3.5,
          sparkCount: 8
        });
      } else if (row === 7) {
        renderWindWispCell(pen, u);
      } else if (row === 8) {
        renderCryptMistCell(pen, u);
      } else if (row === 9) {
        renderMoltenFissureCell(pen, u);
      } else if (row === 10) {
        renderDualSolarAstralFlameCell(pen, u);
      } else {
        renderCrystalLanternPrismCell(pen, u);
      }

      resolveSurfaceToRGBA(surface, cellRgba64, 1.12);
      enforceOrganicMargin64(cellRgba64, LOGICAL_SZ, LOGICAL_SZ);

      let nonZero = 0;
      for (let y = 0; y < LOGICAL_SZ; y++) {
        for (let x = 0; x < LOGICAL_SZ; x++) {
          const a = cellRgba64[(y * LOGICAL_SZ + x) * 4 + 3];
          if (a > 0) {
            nonZero++;
            if (x < 2 || y < 2 || x >= LOGICAL_SZ - 2 || y >= LOGICAL_SZ - 2) {
              borderClips++;
            }
          }
        }
      }
      if (nonZero === 0) emptyCells++;

      blitUpscaledNearest(
        cellRgba64,
        LOGICAL_SZ,
        LOGICAL_SZ,
        SCALE,
        sheetRgba,
        SHEET_W,
        col * CELL_SZ,
        row * CELL_SZ
      );
    }
  }

  if (borderClips !== 0 || emptyCells !== 0) {
    throw new Error(`adv_stage_vfx.png audit failed: borderClips=${borderClips}, emptyCells=${emptyCells}`);
  }

  const pngBytes = encodeRgbaPng(SHEET_W, SHEET_H, sheetRgba);
  fs.writeFileSync(OUT_PNG, pngBytes);
  console.log(
    `[OK] Wrote ${OUT_PNG} (${SHEET_W}x${SHEET_H}, ${ROWS}x${COLS} @ ${CELL_SZ}x${CELL_SZ}, ${(pngBytes.length / 1024).toFixed(1)} KB, borderClips=0, emptyCells=0)`
  );

  const dbgArg = process.argv.find((a) => a.startsWith('--debug-out='));
  if (dbgArg) {
    const dbgPath = dbgArg.slice('--debug-out='.length);
    const dbgRgba = new Uint8Array(SHEET_W * SHEET_H * 4);
    for (let y = 0; y < SHEET_H; y++) {
      for (let x = 0; x < SHEET_W; x++) {
        const o = (y * SHEET_W + x) * 4;
        const isGrid = x % CELL_SZ === 0 || y % CELL_SZ === 0;
        dbgRgba[o] = isGrid ? 28 : 9;
        dbgRgba[o + 1] = isGrid ? 36 : 12;
        dbgRgba[o + 2] = isGrid ? 58 : 22;
        dbgRgba[o + 3] = 255;

        const sa = sheetRgba[o + 3] / 255;
        if (sa > 0) {
          dbgRgba[o] = Math.round(sheetRgba[o] * sa + dbgRgba[o] * (1 - sa));
          dbgRgba[o + 1] = Math.round(sheetRgba[o + 1] * sa + dbgRgba[o + 1] * (1 - sa));
          dbgRgba[o + 2] = Math.round(sheetRgba[o + 2] * sa + dbgRgba[o + 2] * (1 - sa));
        }
      }
    }
    fs.mkdirSync(path.dirname(dbgPath), { recursive: true });
    fs.writeFileSync(dbgPath, encodeRgbaPng(SHEET_W, SHEET_H, dbgRgba));
    console.log(`[OK] Wrote debug contact sheet ${dbgPath}`);
  }
}

main();
