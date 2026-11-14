#!/usr/bin/env node
/**
 * First-Party ArcaneShaderFX Stage Overlay Pixel-VFX Sheet Builder (`adv_stage_vfx.png`).
 *
 * Crafts 10 biome-matched rows x 16 seamless loop frames @ 128x128 (`2048x1280` RGBA)
 * using the exact same `ArcaneShaderFX.js` pixel-surface, 4x4 Bayer ordered stipple
 * dithering, `fbmNoise2D` plasma turbulence, `buildLightningChain`, and cel-stepped
 * character shader color ramps used across all 11 champions' `*_vfx.png` sheets!
 *
 * Rendered on a `64x64` logical pixel grid and upscaled `2x NEAREST` to `128x128`
 * (`0/160` border clips within a strict `2px` logical / `4px` output safety margin).
 *
 * Rows:
 *   Row 0: SOLAR_BRAZIER_FLAME      — Zone I Golden Cathedral Braziers & Solar Prominences
 *   Row 1: ASTRAL_CYAN_FLAME        — Zone I Astral Cyan Braziers & Glacial Frost Flames
 *   Row 2: STARWOOD_SPIRIT_PLUME    — Zone II Bioluminescent Spirit Flames, Crystals & Lanterns
 *   Row 3: WATERFALL_CASCADE_FOAM   — Zone II Cascading Pixel Waterfalls & Plunge-Pool Spray
 *   Row 4: BONEGATE_SOUL_PYRE       — Zone III Necrotic Violet Crypt Braziers & Soul Wisps
 *   Row 5: ARCANE_STORM_LIGHTNING   — Zone I/III/IV Jagged Pixel Lightning Arcs (`buildLightningChain`)
 *   Row 6: BLACKPIT_HELLFIRE_ROAR   — Zone IV Obsidian Hellfire Cauldrons & Volcano Vents
 *   Row 7: ASTRAL_SYLVAN_WIND_WISP  — Zone I/II Pixel Wind-Gust Ribbons & Fluttering Spores
 *   Row 8: OSSUARY_CRYPT_MIST_COIL  — Zone III Drifting Necropolis Soul-Mist & Ghost Sparks
 *   Row 9: MOLTEN_FISSURE_SURGE     — Zone IV Causeway Lava-Crack Bubbling Surge & Rune Embers
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
const DEBUG_DIR =
  '/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/7821d65d-384a-4e26-8167-f32a84e377d8/scratch';

const COLS = 16;
const ROWS = 10;
const LOGICAL_SZ = 64;
const SCALE = 2;
const CELL_SZ = LOGICAL_SZ * SCALE; // 128
const SHEET_W = COLS * CELL_SZ; // 2048
const SHEET_H = ROWS * CELL_SZ; // 1280

// Character-matched 8-step cel-shaded color ramps (same hex families as solar/glacial/sylvan/abyssal/storm/forge shaders!)
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
const RAMP_WATERFALL = buildColorRamp(
  ['#083344', '#155e75', '#0891b2', '#06b6d4', '#22d3ee', '#67e8f9', '#cffafe', '#ffffff'],
  8
);
const RAMP_NECROTIC = buildColorRamp(
  ['#1e0936', '#4c1d95', '#6d28d9', '#9333ea', '#a855f7', '#d946ef', '#f5d0fe', '#ffffff'],
  8
);
const RAMP_LIGHTNING = buildColorRamp(
  ['#1e1b4b', '#312e81', '#4f46e5', '#818cf8', '#38bdf8', '#7dd3fc', '#e0f2fe', '#ffffff'],
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

/** Organic circular-elliptical safety margin on `64x64` (`0` square corners, `0` border clips within `3px`!). */
function enforceOrganicMargin64(rgba, w = 64, h = 64) {
  const cx = (w - 1) * 0.5;
  const cy = (h - 1) * 0.5;
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
      const r = Math.hypot(x - cx, y - cy);
      if (r >= 28.5) {
        rgba[o] = 0;
        rgba[o + 1] = 0;
        rgba[o + 2] = 0;
        rgba[o + 3] = 0;
      } else if (r > 23.5 && rgba[o + 3] > 0) {
        const k = (28.5 - r) / 5.0;
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
    pen.stipple(x - 1, y, haloCol, 0.9);
    pen.stipple(x + 1, y, haloCol, 0.9);
    pen.stipple(x, y - 1, haloCol, 0.9);
    pen.stipple(x, y + 1, haloCol, 0.9);
  }
}

/**
 * Shared character-shader multi-tongue brazier/pyre/cauldron flame generator (`Rows 0, 1, 2, 4, 6`).
 * Base of flame sits around `ly = +16` (`y_64 = 48`), curling upward to `ly = -22` (`y_64 = 10`).
 */
function renderBrazierFlameCell(pen, u, ramp, opts) {
  const {
    seed,
    baseWidth = 11.5,
    flameHeight = 33,
    swayAmp = 3.2,
    tongueFreq = 0.28,
    sparkCount = 6,
    wispOrbit = false
  } = opts;

  const ang = u * Math.PI * 2;
  pen.configure(32, 32, false, 0, 1, 1);

  pen.shadeBox(-26, -26, 26, 24, (lx, ly, out) => {
    // Vertical flame coordinate `hFrac`: 0 at bowl lip (`ly = 17`), 1 at tip (`ly = 17 - flameHeight`)
    const hFrac = (17 - ly) / flameHeight;
    if (hFrac < -0.14 || hFrac > 1.06) return 0;

    // Multi-tongue lateral sway + upward scrolling FBM boil
    const sway =
      Math.sin(ang + hFrac * 4.2) * swayAmp * Math.pow(Math.max(0, hFrac), 1.15) +
      Math.cos(ang * 2 - hFrac * 5.8) * (swayAmp * 0.36) * Math.max(0, hFrac);
    const n1 = seamlessFlowNoise(lx * 0.16, ly * 0.15, u, 5.2, seed);
    const n2 = seamlessFlowNoise(lx * 0.31 + 7.1, ly * 0.27, u, 8.4, seed + 41);

    // Tapered 3-lobe flame silhouette
    const bowlTaper = hFrac < 0 ? Math.max(0, 1 + hFrac / 0.14) : Math.pow(Math.max(0, 1 - hFrac), 0.62);
    const sideLobes = 1 + 0.24 * Math.cos((lx - sway) * tongueFreq * Math.PI + ang);
    const halfW = Math.max(0.8, baseWidth * bowlTaper * sideLobes + n1 * 2.8);
    const dist = Math.abs(lx - sway);
    if (dist > halfW + 2.2) return 0;

    // Core heat intensity with crisp cel-quantized steps + Bayer 4x4 stipple outer aura
    const radial = 1 - dist / Math.max(0.9, halfW);
    const heat = radial * (1 - Math.max(0, hFrac) * 0.48) + n1 * 0.24 + n2 * 0.16;
    if (heat <= 0.05) return 0;

    const idx = Math.max(0, Math.min(7, Math.floor(clamp01(heat * 1.18) * 7.99)));
    out.color = ramp[idx];
    out.alpha = heat < 0.28 ? clamp01((heat - 0.04) / 0.24) : 1.0;
    out.glowColor = ramp[Math.min(7, idx + 1)];
    out.glowStrength = heat > 0.55 ? 0.32 : 0.12;
    return out.color;
  });

  // Rising detached pixel embers / bioluminescent fireflies (`2x2` logical = `4x4` screen pixels)
  for (let s = 0; s < sparkCount; s++) {
    const life = (u + s / sparkCount) % 1;
    const riseY = 14 - life * 37;
    const spreadX = wispOrbit
      ? Math.sin(ang + s * 1.9 + life * 5.2) * (10 + (s % 3) * 3)
      : (((s * 17) % 9) - 4) * 2.1 * (1 - life * 0.35) + Math.sin(ang * 2 + s * 1.7) * 2.6;
    const px = Math.round(spreadX);
    const py = Math.round(riseY);
    if (Math.hypot(px, py) > 23) continue;
    const fade = Math.sin(life * Math.PI);
    if (fade < 0.22) continue;
    const core = life < 0.35 ? ramp[7] : life < 0.7 ? ramp[6] : ramp[4];
    const wake = ramp[3];
    drawPixelPlusSpark(pen, px, py, core, ramp[5], fade > 0.62 && s % 2 === 0);
    if (py + 2 < 22) {
      pen.stipple(px, py + 2, wake, fade * 0.75);
    }
  }
}

/** Row 3: Cascading Pixel Waterfall Threads & Churning Plunge-Pool Foam (`Zone II`). */
function renderWaterfallCascadeCell(pen, u) {
  const ang = u * Math.PI * 2;
  pen.configure(32, 32, false, 0, 1, 1);

  pen.shadeBox(-24, -24, 24, 24, (lx, ly, out) => {
    // Vertical cascade column (`lx: -11..+11`, `ly: -21..+16`) + wide foaming plunge crest (`ly: +9..+20`)
    const inPlunge = ly >= 8 && ly <= 20;
    const colHalfW = inPlunge ? 17 * (1 - Math.abs(ly - 14) / 7.5) : 10.5 * (1 - Math.max(0, -16 - ly) / 8);
    if (Math.abs(lx) > colHalfW + 2.5 || ly < -22 || ly > 21) return 0;

    // Downward scrolling water threads (`-u * 9.0` moves downward!)
    const threadNoise = seamlessFlowNoise(lx * 0.42, ly * 0.14, (1 - u) % 1, 9.0, 311);
    const foamBoil = seamlessFlowNoise(lx * 0.24, ly * 0.28, u, 5.0, 359);
    const vertFade = ly < -15 ? (ly + 22) / 7 : ly > 16 ? (21 - ly) / 5 : 1;
    const horizFade = clamp01(1 - Math.abs(lx) / Math.max(1, colHalfW));

    let intensity = horizFade * vertFade * (0.52 + threadNoise * 0.38 + (inPlunge ? 0.34 + foamBoil * 0.24 : 0));
    // Crisp vertical water-streak ribs
    const rib = Math.cos(lx * 1.15 + Math.sin(ang + ly * 0.18) * 0.8);
    if (!inPlunge && rib > 0.45) intensity += 0.24 * vertFade;

    if (intensity <= 0.10) return 0;
    const idx = Math.max(0, Math.min(7, Math.floor(clamp01(intensity) * 7.99)));
    out.color = RAMP_WATERFALL[idx];
    out.alpha = intensity < 0.34 ? clamp01((intensity - 0.10) / 0.24) : 0.92;
    out.glowColor = RAMP_WATERFALL[Math.min(7, idx + 1)];
    out.glowStrength = inPlunge && intensity > 0.62 ? 0.26 : 0.10;
    return out.color;
  });

  // Bouncing plunge-pool spray droplets
  for (let d = 0; d < 7; d++) {
    const life = (u + d / 7) % 1;
    const dir = d % 2 === 0 ? 1 : -1;
    const dx = Math.round(dir * (4 + (d % 3) * 3.2 + life * 6));
    const dy = Math.round(14 - Math.sin(life * Math.PI) * (6 + (d % 3) * 2.5));
    if (Math.hypot(dx, dy) < 23 && Math.sin(life * Math.PI) > 0.3) {
      pen.stipple(dx, dy, d % 2 === 0 ? RAMP_WATERFALL[7] : RAMP_WATERFALL[5], 0.9);
    }
  }
}

/** Row 5: Jagged Pixel-Art Lightning Arcs (`ArcaneShaderFX.buildLightningChain` — Kaze-Maru / Chronos style!). */
function renderArcaneLightningCell(pen, frameIdx) {
  pen.configure(32, 32, false, 0, 1, 1);
  const rng = new DeterministicRng(9001 + frameIdx * 137);

  // Duty-cycled intense storm-arc bursts + crackling residual static sparks across all 16 frames
  const sub = frameIdx % 8;
  const isMajorBolt = sub <= 4;
  const fade = isMajorBolt ? [1.0, 0.92, 0.78, 0.56, 0.38][sub] : 0.32;

  const xTop = rng.between(-8, 8);
  const xBot = rng.between(-9, 9);
  const mainChain = buildLightningChain(rng, xTop, -20, xBot, 20, 0.26, 3);

  // Outer electric halo + crisp bright core polyline
  for (let i = 1; i < mainChain.length; i++) {
    const [x0, y0] = mainChain[i - 1];
    const [x1, y1] = mainChain[i];
    pen.line(x0 - 1, y0, x1 - 1, y1, RAMP_LIGHTNING[3], fade * 0.65);
    pen.line(x0 + 1, y0, x1 + 1, y1, RAMP_LIGHTNING[4], fade * 0.65);
    pen.line(x0, y0, x1, y1, isMajorBolt ? RAMP_LIGHTNING[7] : RAMP_LIGHTNING[5], fade);
  }

  // Secondary branching fork
  const midPt = mainChain[Math.floor(mainChain.length * 0.45)] || [0, 0];
  const forkX = Math.max(-20, Math.min(20, midPt[0] + (frameIdx % 2 === 0 ? 11 : -11)));
  const forkY = Math.min(20, midPt[1] + 11);
  const forkChain = buildLightningChain(rng, midPt[0], midPt[1], forkX, forkY, 0.22, 2);
  pen.polyline(forkChain, RAMP_LIGHTNING[6], fade * 0.85);

  // Pixel cross-glints at arc vertices
  drawPixelPlusSpark(pen, Math.round(midPt[0]), Math.round(midPt[1]), RAMP_LIGHTNING[7], RAMP_LIGHTNING[5], isMajorBolt);
}

/** Row 7: Sweeping Astral/Sylvan Pixel Wind-Wisp Ribbon & Fluttering Spores (`Zones I & II`). */
function renderWindWispCell(pen, u) {
  const ang = u * Math.PI * 2;
  pen.configure(32, 32, false, 0, 1, 1);

  pen.shadeBox(-25, -16, 25, 16, (lx, ly, out) => {
    const waveY = Math.sin((lx * 0.14) - ang) * 4.5 + Math.cos((lx * 0.08) + ang) * 2.0;
    const distY = Math.abs(ly - waveY);
    const envX = clamp01(1 - Math.abs(lx) / 23.5);
    // Travelling wind-gust packet along `+X`
    const gust = 0.55 + 0.45 * Math.cos((lx / 24) * Math.PI - ang);
    const halfThick = 2.6 * envX * gust;
    if (distY > halfThick + 1.4) return 0;

    const core = (1 - distY / Math.max(0.7, halfThick)) * envX * gust;
    if (core <= 0.12) return 0;
    const idx = Math.max(2, Math.min(7, Math.floor(clamp01(core * 1.25) * 7.99)));
    out.color = lx + Math.sin(ang) * 6 > 0 ? RAMP_STARWOOD[idx] : RAMP_ASTRAL_CYAN[idx];
    out.alpha = core < 0.42 ? clamp01((core - 0.12) / 0.30) : 0.88;
    out.glowColor = out.color;
    out.glowStrength = 0.14;
    return out.color;
  });

  // 4 tumbling pixel leaf/spore glints riding the slipstream
  for (let p = 0; p < 4; p++) {
    const ph = (u + p * 0.25) % 1;
    const px = Math.round(-20 + ph * 40);
    const py = Math.round(Math.sin(ph * Math.PI * 2 + p) * 6 + (p % 2 === 0 ? -4 : 4));
    const fade = Math.sin(ph * Math.PI);
    if (fade > 0.25 && Math.hypot(px, py) < 23) {
      pen.stipple(px, py, RAMP_STARWOOD[7], fade);
      pen.stipple(px - 1, py, p % 2 === 0 ? RAMP_STARWOOD[5] : RAMP_ASTRAL_CYAN[5], fade * 0.8);
    }
  }
}

/** Row 8: Ossuary Spectral Mist-Coil & Rising Ghost Sparks (`Zone III`). */
function renderCryptMistCell(pen, u) {
  const ang = u * Math.PI * 2;
  pen.configure(32, 32, false, 0, 1, 1);

  pen.shadeBox(-25, -18, 25, 18, (lx, ly, out) => {
    const coilY = 3 + Math.sin(lx * 0.16 - ang) * 3.8;
    const n = seamlessFlowNoise(lx * 0.14, ly * 0.22, u, 3.6, 811);
    const envX = clamp01(1 - Math.abs(lx) / 23.0);
    const distY = Math.abs(ly - coilY + n * 3.2);
    const thick = 5.4 * envX;
    if (distY > thick) return 0;

    const density = (1 - distY / Math.max(0.8, thick)) * envX * (0.68 + n * 0.38);
    if (density <= 0.12) return 0;
    const idx = Math.max(1, Math.min(6, Math.floor(clamp01(density * 1.1) * 6.99)));
    out.color = RAMP_NECROTIC[idx];
    out.alpha = clamp01((density - 0.10) / 0.42) * 0.85;
    out.glowColor = RAMP_NECROTIC[Math.min(7, idx + 1)];
    out.glowStrength = 0.14;
    return out.color;
  });

  for (let w = 0; w < 5; w++) {
    const life = (u + w * 0.2) % 1;
    const wx = Math.round(((w - 2) * 6) + Math.sin(ang + w * 1.7) * 3);
    const wy = Math.round(8 - life * 22);
    if (Math.hypot(wx, wy) < 23 && Math.sin(life * Math.PI) > 0.3) {
      drawPixelPlusSpark(pen, wx, wy, RAMP_NECROTIC[7], RAMP_NECROTIC[5], w % 2 === 0);
    }
  }
}

/** Row 9: Causeway Molten Fissure Surge & Bubbling Lava Sparks (`Zone IV` & Boss Sanctuary Seal). */
function renderMoltenFissureCell(pen, u) {
  const ang = u * Math.PI * 2;
  pen.configure(32, 32, false, 0, 1, 1);

  pen.shadeBox(-25, -18, 25, 18, (lx, ly, out) => {
    // Foreshortened glowing magma crack (`ly ~ +6`) + rising heat tongues (`ly: -8..+8`)
    const crackY = 6 + Math.sin(lx * 0.22) * 1.8;
    const envX = clamp01(1 - Math.abs(lx) / 23.0);
    const pulse = 0.68 + 0.32 * Math.sin(ang + lx * 0.18);
    const n = seamlessFlowNoise(lx * 0.20, ly * 0.24, u, 5.0, 953);

    const crackDist = Math.abs(ly - crackY);
    let heat = 0;
    if (crackDist <= 3.6 * envX) {
      heat = (1 - crackDist / Math.max(0.7, 3.6 * envX)) * envX * (0.85 + 0.25 * pulse);
    }
    // Upward bubbling flare tongues from the fissure center
    if (ly <= crackY && ly >= crackY - 15 * envX) {
      const flareH = (crackY - ly) / Math.max(1, 15 * envX);
      const flareW = 7.5 * envX * (1 - flareH) * pulse;
      if (Math.abs(lx + Math.sin(ang + flareH * 4) * 2.5) <= flareW + 1.5) {
        const tongueHeat =
          (1 - Math.abs(lx + Math.sin(ang + flareH * 4) * 2.5) / Math.max(0.8, flareW + 1.5)) *
          (1 - flareH) *
          (0.66 + n * 0.34);
        if (tongueHeat > heat) heat = tongueHeat;
      }
    }

    if (heat <= 0.10) return 0;
    const idx = Math.max(0, Math.min(7, Math.floor(clamp01(heat * 1.18) * 7.99)));
    out.color = RAMP_MAGMA[idx];
    out.alpha = heat < 0.32 ? clamp01((heat - 0.10) / 0.22) : 0.96;
    out.glowColor = RAMP_MAGMA[Math.min(7, idx + 1)];
    out.glowStrength = heat > 0.55 ? 0.28 : 0.10;
    return out.color;
  });

  // Popping lava cinders
  for (let c = 0; c < 5; c++) {
    const life = (u + c * 0.2) % 1;
    const cx = Math.round((c - 2) * 5.5 + Math.cos(ang + c * 2.1) * 2.5);
    const cy = Math.round(5 - Math.sin(life * Math.PI) * (13 + (c % 2) * 4));
    if (Math.hypot(cx, cy) < 23 && Math.sin(life * Math.PI) > 0.25) {
      drawPixelPlusSpark(pen, cx, cy, RAMP_MAGMA[7], RAMP_MAGMA[5], life < 0.5);
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
          baseWidth: 11.5,
          flameHeight: 34,
          swayAmp: 3.0,
          sparkCount: 6
        });
      } else if (row === 1) {
        renderBrazierFlameCell(pen, u, RAMP_ASTRAL_CYAN, {
          seed: 211,
          baseWidth: 11.0,
          flameHeight: 33,
          swayAmp: 3.2,
          sparkCount: 6
        });
      } else if (row === 2) {
        renderBrazierFlameCell(pen, u, RAMP_STARWOOD, {
          seed: 307,
          baseWidth: 10.5,
          flameHeight: 32,
          swayAmp: 3.6,
          sparkCount: 7,
          wispOrbit: true
        });
      } else if (row === 3) {
        renderWaterfallCascadeCell(pen, u);
      } else if (row === 4) {
        renderBrazierFlameCell(pen, u, RAMP_NECROTIC, {
          seed: 503,
          baseWidth: 11.2,
          flameHeight: 34,
          swayAmp: 3.4,
          sparkCount: 6,
          wispOrbit: true
        });
      } else if (row === 5) {
        renderArcaneLightningCell(pen, col);
      } else if (row === 6) {
        renderBrazierFlameCell(pen, u, RAMP_HELLFIRE, {
          seed: 709,
          baseWidth: 12.8,
          flameHeight: 35,
          swayAmp: 3.5,
          sparkCount: 8
        });
      } else if (row === 7) {
        renderWindWispCell(pen, u);
      } else if (row === 8) {
        renderCryptMistCell(pen, u);
      } else {
        renderMoltenFissureCell(pen, u);
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

  // Also emit dark-background contact sheet for visual verification via view_file
  if (fs.existsSync(DEBUG_DIR)) {
    const dbgW = SHEET_W;
    const dbgH = SHEET_H;
    const dbgRgba = new Uint8Array(dbgW * dbgH * 4);
    for (let y = 0; y < dbgH; y++) {
      for (let x = 0; x < dbgW; x++) {
        const o = (y * dbgW + x) * 4;
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
    const dbgPath = path.join(DEBUG_DIR, 'debug_adv_stage_vfx_sheet.png');
    fs.writeFileSync(dbgPath, encodeRgbaPng(dbgW, dbgH, dbgRgba));
    console.log(`[OK] Wrote debug contact sheet ${dbgPath}`);
  }
}

main();
