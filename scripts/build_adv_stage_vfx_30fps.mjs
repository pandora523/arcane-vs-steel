#!/usr/bin/env node
/**
 * First-Party ArcaneShaderFX Stage & Monument Overlay Pixel-VFX Sheet Builder (`adv_stage_vfx.png`).
 *
 * Crafts 12 biome-matched rows x 16 seamless loop frames @ 128x128 (`2048x1536` RGBA)
 * using `ArcaneShaderFX.js` (`createPixelSurface`, 4x4 Bayer ordered stipple dithering,
 * `fbmNoise2D` plasma turbulence, `buildLightningChain`, and cel-stepped 8-color ramps).
 *
 * Rendered on a `64x64` logical pixel grid and upscaled `2x NEAREST` to `128x128`
 * (`100.0%` `2x2` chunky pixel blocks, `0/192` border clips within `3px` logical / `6px` output margin).
 *
 * Rows:
 *   Row 0:  SOLAR_BRAZIER_FLAME        — Zone I Wide-Basin Golden Solar Cathedral Braziers (`lip = 0.844`)
 *   Row 1:  ASTRAL_CYAN_FLAME          — Zone I Wide-Basin Astral Cyan Cathedral Braziers (`lip = 0.844`)
 *   Row 2:  STARWOOD_SPIRIT_PLUME      — Zone II Wide-Basin Open Pedestal Spirit-Fire Bowls (`lip = 0.844`)
 *   Row 3:  WATERFALL_CASCADE_FOAM     — Zone II Cascading Cliff Waterfall Chutes & Plunge-Pool Spray
 *   Row 4:  BONEGATE_SOUL_PYRE         — Zone III Wide-Basin Necrotic Violet Crypt Soul-Pyres (`lip = 0.844`)
 *   Row 5:  ARCANE_STORM_LIGHTNING     — Zone I/III/IV Jagged Pixel Lightning Arcs (`buildLightningChain`)
 *   Row 6:  BLACKPIT_HELLFIRE_ROAR     — Zone IV Wide-Cauldron Obsidian Hellfire Roar (`lip = 0.844`)
 *   Row 7:  ASTRAL_SYLVAN_WIND_WISP    — Zone I/II Pixel Wind-Gust Ribbons & Moonwell Basin Wisps
 *   Row 8:  OSSUARY_CRYPT_MIST_COIL    — Zone III Coiling Necropolis Soul-Mist & Ghost Sparks
 *   Row 9:  MOLTEN_FISSURE_SURGE       — Zone IV Road Lava-Vein Bubbling Surge & Volcano Magma Pools
 *   Row 10: SOLAR_ASTRAL_DUAL_FLAME    — Zone I Tall Dual-Tone Braziers (Blazing Gold Core + Cyan Mantle!)
 *   Row 11: CRYSTAL_LANTERN_PRISM_AURA — Closed Hanging Glass Lanterns, Root Crystals & Shrine Relic Cores!
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

/**
 * Super-elliptical (`L^4`) organic safety margin on `64x64`:
 * Preserves wide brazier flame bases at `(±20, +22)` without circular corner clipping,
 * while strictly guaranteeing `0` pixels within `3px` (`6px` @ `128x128`) of any cell border!
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
      } else if (d4 > 0.88 && rgba[o + 3] > 0) {
        const k = (1.0 - d4) / 0.12;
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
 * Wide-Basin Character-Shader Multi-Tongue Brazier / Pyre / Cauldron Flame (`Rows 0, 1, 2, 4, 6`).
 * Bowl lip sits at `ly = +22` (`y_64 = 54` -> `y_128 = 108` -> `0.844` of `128px` cell height!),
 * spanning `baseWidth = 18.2..20.2` (`~62%` of cell width) with 3 roaring flame tongues (`central + left + right`)
 * and a curved glowing ember-bed meniscus hugging the wide stone/iron rim!
 */
function renderBrazierFlameCell(pen, u, ramp, opts) {
  const {
    seed,
    baseWidth = 19.0,
    flameHeight = 46,
    swayAmp = 3.4,
    tongueFreq = 0.21,
    sparkCount = 8,
    wispOrbit = false
  } = opts;

  const ang = u * Math.PI * 2;
  const lipLy = 22; // y_64 = 32 + 22 = 54 -> y_128 = 108 (108 / 128 = 0.84375)
  pen.configure(32, 32, false, 0, 1, 1);

  pen.shadeBox(-28, -28, 28, 27, (lx, ly, out) => {
    const hFrac = (lipLy - ly) / flameHeight;
    if (hFrac < -0.10 || hFrac > 1.04) return 0;

    const sway =
      Math.sin(ang + hFrac * 4.4) * swayAmp * Math.pow(Math.max(0, hFrac), 1.08) +
      Math.cos(ang * 2 - hFrac * 5.6) * (swayAmp * 0.35) * Math.max(0, hFrac);
    const n1 = seamlessFlowNoise(lx * 0.14, ly * 0.14, u, 5.8, seed);
    const n2 = seamlessFlowNoise(lx * 0.28 + 7.1, ly * 0.25, u, 8.8, seed + 41);

    // Wide basin meniscus at `hFrac <= 0.18` so the fire fills the entire stone/iron bowl lip!
    let bowlTaper;
    if (hFrac < 0) {
      // Curved bowl-lip underside cradle (`hFrac in [-0.10, 0]`)
      bowlTaper = Math.sqrt(Math.max(0, 1 - Math.pow(hFrac / 0.10, 2)));
    } else {
      bowlTaper = Math.pow(Math.max(0, 1 - hFrac), 0.54);
    }

    // 3 distinct roaring flame tongues (wide central crest + twin flanking tongues)
    const sideLobes =
      1 +
      0.22 * Math.cos((lx - sway) * tongueFreq * Math.PI + Math.sin(ang) * 0.7) +
      0.10 * Math.sin((lx + sway * 0.5) * 0.38 - ang);
    const halfW = Math.max(1.0, baseWidth * bowlTaper * sideLobes + n1 * 3.1);
    const dist = Math.abs(lx - sway * Math.min(1, Math.max(0, hFrac * 1.25)));
    if (dist > halfW + 2.2) return 0;

    const radial = 1 - dist / Math.max(1.0, halfW);
    const rimBoost = hFrac >= -0.05 && hFrac <= 0.18 ? 0.18 * (1 - Math.abs(hFrac - 0.06) / 0.14) : 0;
    const heat = radial * (1 - Math.max(0, hFrac) * 0.44) + rimBoost + n1 * 0.24 + n2 * 0.16;
    if (heat <= 0.05) return 0;

    const idx = Math.max(0, Math.min(7, Math.floor(clamp01(heat * 1.20) * 7.99)));
    out.color = ramp[idx];
    out.alpha = heat < 0.26 ? clamp01((heat - 0.04) / 0.22) : 1.0;
    out.glowColor = ramp[Math.min(7, idx + 1)];
    out.glowStrength = heat > 0.54 ? 0.32 : 0.12;
    return out.color;
  });

  // Wide rising pixel embers across the full basin width
  for (let s = 0; s < sparkCount; s++) {
    const life = (u + s / sparkCount) % 1;
    const riseY = 19 - life * 43;
    const spreadX = wispOrbit
      ? Math.sin(ang + s * 1.9 + life * 5.2) * (13 + (s % 3) * 3.5)
      : (((s * 17) % 11) - 5) * 2.7 * (1 - life * 0.30) + Math.sin(ang * 2 + s * 1.7) * 2.8;
    const px = Math.round(spreadX);
    const py = Math.round(riseY);
    if (Math.abs(px) > 25 || Math.abs(py) > 25) continue;
    const fade = Math.sin(life * Math.PI);
    if (fade < 0.22) continue;
    const core = life < 0.35 ? ramp[7] : life < 0.7 ? ramp[6] : ramp[4];
    const wake = ramp[3];
    drawPixelPlusSpark(pen, px, py, core, ramp[5], fade > 0.60 && s % 2 === 0);
    if (py + 2 < 25) {
      pen.stipple(px, py + 2, wake, fade * 0.75);
    }
  }
}

/**
 * Row 10: Dedicated Dual-Tone Solar-Core + Astral-Cyan-Mantle Wide Cathedral Brazier Flame!
 * Matches Zone I's tall inner-right Cathedral braziers (`x = 349, 742, 3888.5`) which have a
 * blazing golden solar heart wrapped inside a sacred astral-cyan outer corona!
 */
function renderDualSolarAstralFlameCell(pen, u) {
  const ang = u * Math.PI * 2;
  const lipLy = 22;
  const baseWidth = 19.2;
  const flameHeight = 46;
  const swayAmp = 3.3;
  pen.configure(32, 32, false, 0, 1, 1);

  pen.shadeBox(-28, -28, 28, 27, (lx, ly, out) => {
    const hFrac = (lipLy - ly) / flameHeight;
    if (hFrac < -0.10 || hFrac > 1.04) return 0;

    const sway =
      Math.sin(ang + hFrac * 4.3) * swayAmp * Math.pow(Math.max(0, hFrac), 1.08) +
      Math.cos(ang * 2 - hFrac * 5.5) * (swayAmp * 0.34) * Math.max(0, hFrac);
    const n1 = seamlessFlowNoise(lx * 0.14, ly * 0.14, u, 5.8, 1013);
    const n2 = seamlessFlowNoise(lx * 0.28 + 5.3, ly * 0.25, u, 8.6, 1061);

    const bowlTaper =
      hFrac < 0
        ? Math.sqrt(Math.max(0, 1 - Math.pow(hFrac / 0.10, 2)))
        : Math.pow(Math.max(0, 1 - hFrac), 0.54);
    const sideLobes = 1 + 0.22 * Math.cos((lx - sway) * 0.21 * Math.PI + Math.sin(ang) * 0.7);
    const halfW = Math.max(1.0, baseWidth * bowlTaper * sideLobes + n1 * 3.0);
    const dist = Math.abs(lx - sway * Math.min(1, Math.max(0, hFrac * 1.25)));
    if (dist > halfW + 2.2) return 0;

    const radial = 1 - dist / Math.max(1.0, halfW);
    const heat = radial * (1 - Math.max(0, hFrac) * 0.43) + n1 * 0.24 + n2 * 0.15;
    if (heat <= 0.05) return 0;

    // Outer flame mantle (`heat < 0.50`) burns Astral Cyan; inner furnace core (`heat >= 0.50`) blazes Solar Gold!
    const useSolarCore = heat >= 0.50 && hFrac < 0.78;
    const ramp = useSolarCore ? RAMP_SOLAR : RAMP_ASTRAL_CYAN;
    const idx = Math.max(0, Math.min(7, Math.floor(clamp01(heat * 1.22) * 7.99)));
    out.color = ramp[idx];
    out.alpha = heat < 0.26 ? clamp01((heat - 0.04) / 0.22) : 1.0;
    out.glowColor = ramp[Math.min(7, idx + 1)];
    out.glowStrength = heat > 0.54 ? 0.32 : 0.14;
    return out.color;
  });

  for (let s = 0; s < 8; s++) {
    const life = (u + s / 8) % 1;
    const px = Math.round((((s * 17) % 11) - 5) * 2.6 * (1 - life * 0.3) + Math.sin(ang * 2 + s * 1.6) * 2.6);
    const py = Math.round(19 - life * 43);
    if (Math.abs(px) > 25 || Math.abs(py) > 25) continue;
    const fade = Math.sin(life * Math.PI);
    if (fade < 0.24) continue;
    const ramp = s % 2 === 0 ? RAMP_ASTRAL_CYAN : RAMP_SOLAR;
    drawPixelPlusSpark(pen, px, py, ramp[7], ramp[5], fade > 0.62);
  }
}

/**
 * Row 11: Centered Radial Faceted Prism Pulse, Cross-Glints & Orbiting Fairy Motes (`0` fire tongue!).
 * Purpose-built for closed hanging glass lanterns, solid root crystal clusters, and Astral Stele/Orrery cores!
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

    // 4-pointed crystal star rays along cardinal axes (`lx ~ 0` or `ly ~ 0`)
    const rayX = Math.max(0, 1 - Math.abs(ly) / 2.2) * Math.max(0, 1 - Math.abs(lx) / (21 * pulse));
    const rayY = Math.max(0, 1 - Math.abs(lx) / 2.2) * Math.max(0, 1 - Math.abs(ly) / (23 * pulse));
    const ray = Math.max(rayX, rayY) * (0.68 + 0.32 * Math.cos(ang * 2));
    const n = seamlessFlowNoise(lx * 0.22, ly * 0.22, u, 3.2, 1187);

    const energy = Math.max(ray, (1 - d) * 0.92 + n * 0.18);
    if (energy <= 0.12) return 0;

    const idx = Math.max(1, Math.min(7, Math.floor(clamp01(energy * 1.18) * 7.99)));
    const ramp = (lx + ly + Math.sin(ang) * 4) > 0 ? RAMP_STARWOOD : RAMP_ASTRAL_CYAN;
    out.color = ramp[idx];
    out.alpha = energy < 0.38 ? clamp01((energy - 0.12) / 0.26) : 0.92;
    out.glowColor = ramp[Math.min(7, idx + 1)];
    out.glowStrength = energy > 0.62 ? 0.28 : 0.10;
    return out.color;
  });

  // 5 gently orbiting bioluminescent fairy/prism motes around the crystal/lantern
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

/** Row 3: Cascading Pixel Waterfall Threads & Churning Plunge-Pool Foam (`Zone II`). */
function renderWaterfallCascadeCell(pen, u) {
  const ang = u * Math.PI * 2;
  pen.configure(32, 32, false, 0, 1, 1);

  pen.shadeBox(-26, -26, 26, 26, (lx, ly, out) => {
    const inPlunge = ly >= 10 && ly <= 23;
    const colHalfW = inPlunge ? 20 * (1 - Math.abs(ly - 16.5) / 8.0) : 12.5 * (1 - Math.max(0, -18 - ly) / 8);
    if (Math.abs(lx) > colHalfW + 2.5 || ly < -24 || ly > 24) return 0;

    const threadNoise = seamlessFlowNoise(lx * 0.42, ly * 0.14, (1 - u) % 1, 9.5, 311);
    const foamBoil = seamlessFlowNoise(lx * 0.24, ly * 0.28, u, 5.4, 359);
    const vertFade = ly < -17 ? (ly + 24) / 7 : ly > 19 ? (24 - ly) / 5 : 1;
    const horizFade = clamp01(1 - Math.abs(lx) / Math.max(1, colHalfW));

    let intensity = horizFade * vertFade * (0.54 + threadNoise * 0.38 + (inPlunge ? 0.36 + foamBoil * 0.24 : 0));
    const rib = Math.cos(lx * 1.05 + Math.sin(ang + ly * 0.18) * 0.8);
    if (!inPlunge && rib > 0.42) intensity += 0.26 * vertFade;

    if (intensity <= 0.10) return 0;
    const idx = Math.max(0, Math.min(7, Math.floor(clamp01(intensity) * 7.99)));
    out.color = RAMP_WATERFALL[idx];
    out.alpha = intensity < 0.34 ? clamp01((intensity - 0.10) / 0.24) : 0.94;
    out.glowColor = RAMP_WATERFALL[Math.min(7, idx + 1)];
    out.glowStrength = inPlunge && intensity > 0.62 ? 0.26 : 0.10;
    return out.color;
  });

  for (let d = 0; d < 8; d++) {
    const life = (u + d / 8) % 1;
    const dir = d % 2 === 0 ? 1 : -1;
    const dx = Math.round(dir * (5 + (d % 3) * 3.5 + life * 7));
    const dy = Math.round(16 - Math.sin(life * Math.PI) * (7 + (d % 3) * 2.5));
    if (Math.abs(dx) < 25 && Math.abs(dy) < 25 && Math.sin(life * Math.PI) > 0.3) {
      pen.stipple(dx, dy, d % 2 === 0 ? RAMP_WATERFALL[7] : RAMP_WATERFALL[5], 0.9);
    }
  }
}

/** Row 5: Jagged Pixel-Art Lightning Arcs (`ArcaneShaderFX.buildLightningChain`). */
function renderArcaneLightningCell(pen, frameIdx) {
  pen.configure(32, 32, false, 0, 1, 1);
  const rng = new DeterministicRng(9001 + frameIdx * 137);

  const sub = frameIdx % 8;
  const isMajorBolt = sub <= 4;
  const fade = isMajorBolt ? [1.0, 0.92, 0.78, 0.56, 0.38][sub] : 0.32;

  const xTop = rng.between(-9, 9);
  const xBot = rng.between(-10, 10);
  const mainChain = buildLightningChain(rng, xTop, -22, xBot, 22, 0.26, 3);

  for (let i = 1; i < mainChain.length; i++) {
    const [x0, y0] = mainChain[i - 1];
    const [x1, y1] = mainChain[i];
    pen.line(x0 - 1, y0, x1 - 1, y1, RAMP_LIGHTNING[3], fade * 0.65);
    pen.line(x0 + 1, y0, x1 + 1, y1, RAMP_LIGHTNING[4], fade * 0.65);
    pen.line(x0, y0, x1, y1, isMajorBolt ? RAMP_LIGHTNING[7] : RAMP_LIGHTNING[5], fade);
  }

  const midPt = mainChain[Math.floor(mainChain.length * 0.45)] || [0, 0];
  const forkX = Math.max(-22, Math.min(22, midPt[0] + (frameIdx % 2 === 0 ? 12 : -12)));
  const forkY = Math.min(22, midPt[1] + 12);
  const forkChain = buildLightningChain(rng, midPt[0], midPt[1], forkX, forkY, 0.22, 2);
  pen.polyline(forkChain, RAMP_LIGHTNING[6], fade * 0.85);

  drawPixelPlusSpark(pen, Math.round(midPt[0]), Math.round(midPt[1]), RAMP_LIGHTNING[7], RAMP_LIGHTNING[5], isMajorBolt);
}

/** Row 7: Sweeping Astral/Sylvan Pixel Wind-Wisp Ribbon & Fluttering Spores (`Zones I & II`). */
function renderWindWispCell(pen, u) {
  const ang = u * Math.PI * 2;
  pen.configure(32, 32, false, 0, 1, 1);

  pen.shadeBox(-26, -16, 26, 16, (lx, ly, out) => {
    const waveY = Math.sin(lx * 0.14 - ang) * 4.5 + Math.cos(lx * 0.08 + ang) * 2.0;
    const distY = Math.abs(ly - waveY);
    const envX = clamp01(1 - Math.abs(lx) / 25.0);
    const gust = 0.55 + 0.45 * Math.cos((lx / 25) * Math.PI - ang);
    const halfThick = 3.0 * envX * gust;
    if (distY > halfThick + 1.4) return 0;

    const core = (1 - distY / Math.max(0.7, halfThick)) * envX * gust;
    if (core <= 0.12) return 0;
    const idx = Math.max(2, Math.min(7, Math.floor(clamp01(core * 1.25) * 7.99)));
    out.color = lx + Math.sin(ang) * 6 > 0 ? RAMP_STARWOOD[idx] : RAMP_ASTRAL_CYAN[idx];
    out.alpha = core < 0.42 ? clamp01((core - 0.12) / 0.30) : 0.90;
    out.glowColor = out.color;
    out.glowStrength = 0.14;
    return out.color;
  });

  for (let p = 0; p < 5; p++) {
    const ph = (u + p * 0.2) % 1;
    const px = Math.round(-22 + ph * 44);
    const py = Math.round(Math.sin(ph * Math.PI * 2 + p) * 6 + (p % 2 === 0 ? -4 : 4));
    const fade = Math.sin(ph * Math.PI);
    if (fade > 0.25 && Math.abs(px) < 25 && Math.abs(py) < 24) {
      pen.stipple(px, py, RAMP_STARWOOD[7], fade);
      pen.stipple(px - 1, py, p % 2 === 0 ? RAMP_STARWOOD[5] : RAMP_ASTRAL_CYAN[5], fade * 0.8);
    }
  }
}

/** Row 8: Ossuary Spectral Mist-Coil & Rising Ghost Sparks (`Zone III`). */
function renderCryptMistCell(pen, u) {
  const ang = u * Math.PI * 2;
  pen.configure(32, 32, false, 0, 1, 1);

  pen.shadeBox(-26, -18, 26, 18, (lx, ly, out) => {
    const coilY = 3 + Math.sin(lx * 0.15 - ang) * 3.8;
    const n = seamlessFlowNoise(lx * 0.14, ly * 0.22, u, 3.6, 811);
    const envX = clamp01(1 - Math.abs(lx) / 25.0);
    const distY = Math.abs(ly - coilY + n * 3.2);
    const thick = 5.8 * envX;
    if (distY > thick) return 0;

    const density = (1 - distY / Math.max(0.8, thick)) * envX * (0.68 + n * 0.38);
    if (density <= 0.12) return 0;
    const idx = Math.max(1, Math.min(6, Math.floor(clamp01(density * 1.1) * 6.99)));
    out.color = RAMP_NECROTIC[idx];
    out.alpha = clamp01((density - 0.10) / 0.42) * 0.88;
    out.glowColor = RAMP_NECROTIC[Math.min(7, idx + 1)];
    out.glowStrength = 0.14;
    return out.color;
  });

  for (let w = 0; w < 5; w++) {
    const life = (u + w * 0.2) % 1;
    const wx = Math.round((w - 2) * 6.5 + Math.sin(ang + w * 1.7) * 3);
    const wy = Math.round(8 - life * 22);
    if (Math.abs(wx) < 25 && Math.abs(wy) < 24 && Math.sin(life * Math.PI) > 0.3) {
      drawPixelPlusSpark(pen, wx, wy, RAMP_NECROTIC[7], RAMP_NECROTIC[5], w % 2 === 0);
    }
  }
}

/** Row 9: Causeway Molten Fissure Surge & Bubbling Lava Sparks (`Zone IV` & Boss Sanctuary Seal). */
function renderMoltenFissureCell(pen, u) {
  const ang = u * Math.PI * 2;
  pen.configure(32, 32, false, 0, 1, 1);

  pen.shadeBox(-26, -18, 26, 18, (lx, ly, out) => {
    const crackY = 4 + Math.sin(lx * 0.20) * 1.8;
    const envX = clamp01(1 - Math.abs(lx) / 25.0);
    const pulse = 0.68 + 0.32 * Math.sin(ang + lx * 0.18);
    const n = seamlessFlowNoise(lx * 0.20, ly * 0.24, u, 5.0, 953);

    const crackDist = Math.abs(ly - crackY);
    let heat = 0;
    if (crackDist <= 4.2 * envX) {
      heat = (1 - crackDist / Math.max(0.7, 4.2 * envX)) * envX * (0.88 + 0.24 * pulse);
    }
    if (ly <= crackY && ly >= crackY - 16 * envX) {
      const flareH = (crackY - ly) / Math.max(1, 16 * envX);
      const flareW = 9.0 * envX * (1 - flareH) * pulse;
      if (Math.abs(lx + Math.sin(ang + flareH * 4) * 2.5) <= flareW + 1.5) {
        const tongueHeat =
          (1 - Math.abs(lx + Math.sin(ang + flareH * 4) * 2.5) / Math.max(0.8, flareW + 1.5)) *
          (1 - flareH) *
          (0.68 + n * 0.34);
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

  for (let c = 0; c < 6; c++) {
    const life = (u + c / 6) % 1;
    const cx = Math.round((c - 2.5) * 5.8 + Math.cos(ang + c * 2.1) * 2.5);
    const cy = Math.round(4 - Math.sin(life * Math.PI) * (14 + (c % 2) * 4));
    if (Math.abs(cx) < 25 && Math.abs(cy) < 24 && Math.sin(life * Math.PI) > 0.25) {
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
          baseWidth: 19.0,
          flameHeight: 46,
          swayAmp: 3.3,
          sparkCount: 8
        });
      } else if (row === 1) {
        renderBrazierFlameCell(pen, u, RAMP_ASTRAL_CYAN, {
          seed: 211,
          baseWidth: 18.8,
          flameHeight: 45,
          swayAmp: 3.4,
          sparkCount: 8
        });
      } else if (row === 2) {
        renderBrazierFlameCell(pen, u, RAMP_STARWOOD, {
          seed: 307,
          baseWidth: 18.2,
          flameHeight: 44,
          swayAmp: 3.6,
          sparkCount: 8,
          wispOrbit: true
        });
      } else if (row === 3) {
        renderWaterfallCascadeCell(pen, u);
      } else if (row === 4) {
        renderBrazierFlameCell(pen, u, RAMP_NECROTIC, {
          seed: 503,
          baseWidth: 19.2,
          flameHeight: 46,
          swayAmp: 3.5,
          sparkCount: 8,
          wispOrbit: true
        });
      } else if (row === 5) {
        renderArcaneLightningCell(pen, col);
      } else if (row === 6) {
        renderBrazierFlameCell(pen, u, RAMP_HELLFIRE, {
          seed: 709,
          baseWidth: 20.2,
          flameHeight: 47,
          swayAmp: 3.7,
          sparkCount: 9
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

      resolveSurfaceToRGBA(surface, cellRgba64, 1.14);
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
    const dbgPath = path.join(DEBUG_DIR, 'debug_adv_stage_vfx_v108_sheet.png');
    fs.writeFileSync(dbgPath, encodeRgbaPng(dbgW, dbgH, dbgRgba));
    console.log(`[OK] Wrote debug contact sheet ${dbgPath}`);
  }
}

main();
