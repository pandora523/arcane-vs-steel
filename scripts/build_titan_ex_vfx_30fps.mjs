#!/usr/bin/env node
/**
 * Next-Gen 30fps HD-2D Luminescent VFX Sprite Sheet Builder for Torgar EX (`titan_ex` / `TitanEx.js`).
 * Powered by `src/engine/ArcaneShaderFX.js` + read-only `src/engine/shaders/forgeShaders.js`.
 *
 * CRITICAL WEAPON INVARIANT: ZERO sword-tip slash crescents anywhere!
 * Row Contract (`assets/sprites/titan_ex_vfx.png`, 6240x1664 = 8 rows x 30 cols @ 208x208):
 *   - Row 0: Tectonic Jade-Gold Magma Fissure Wave (`forge_wave` & `fissureWaves`)
 *   - Row 1: Horned Runic Dwarven Forge-Anvil (F00..F11 sky drop + F12..F29 molten anvil monolith; matches `spawnSkyStrike('runic_anvil')` & `TitanEx` ricochet)
 *   - Row 2: Erupting Jade-Gold Volcanic Magma Rune Pillar
 *   - Row 3: World-Forge Sovereign Crucible Back-Halo & Rune Seal
 *   - Row 4: Blunt Maul Cataclysm Crater Concussion Nova (0 sword crescents!)
 *   - Row 5: Native 208x208 Colossal World-Forge Crucible Anvil Altar
 *   - Row 6: Native 208x208 God-Hammer Mjolnir Lightning-Magma Strike
 *   - Row 7: Native 208x208 Continental Sunder Volcanic Rune Geyser
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

import {
  PURE_WHITE,
  packHexColor,
  smoothStep,
  createPixelSurface,
  clearPixelSurface,
  resolveSurfaceToRGBA,
  ShaderPen,
  instantiateShaderEffect
} from '../src/engine/ArcaneShaderFX.js';

import {
  FORGE_GOLD_PALETTE,
  FORGE_JADE_PALETTE,
  FORGE_EFFECT_REGISTRY
} from '../src/engine/shaders/forgeShaders.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SCRATCH_DIR =
  '/Users/rei/.gemini/antigravity/brain/5416474b-0e5f-4471-85c8-b7a88055e218/scratch';

const C_GOLD_BRIGHT = packHexColor('#fde047');
const C_MAGMA = packHexColor('#f97316');
const C_JADE = packHexColor('#10b981');
const C_JADE_PALE = packHexColor('#6ee7b7');

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

function applyEllipticalEnvelope(rgba, w, h, env, minMargin) {
  const cx = env?.cx ?? (w - 1) * 0.5;
  const cy = env?.cy ?? (h - 1) * 0.5;
  const rx = env?.rx ?? w * 0.43;
  const ry = env?.ry ?? h * 0.43;
  const inner = env?.inner ?? 0.66;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      const a0 = rgba[o + 3];
      if (!a0) continue;
      const distEdge = Math.min(x, y, w - 1 - x, h - 1 - y);
      const rNorm = Math.hypot((x - cx) / rx, (y - cy) / ry);
      if (distEdge < minMargin || rNorm >= 1.0) {
        rgba[o] = 0;
        rgba[o + 1] = 0;
        rgba[o + 2] = 0;
        rgba[o + 3] = 0;
        continue;
      }
      let k = 1.0;
      if (rNorm > inner) {
        k *= 1.0 - smoothStep(inner, 1.0, rNorm);
      }
      const softBand = minMargin + (w >= 200 ? 12 : 6);
      if (distEdge < softBand) {
        k *= smoothStep(minMargin - 0.5, softBand, distEdge);
      }
      const a1 = Math.round(a0 * k);
      if (a1 < 10) {
        rgba[o] = 0;
        rgba[o + 1] = 0;
        rgba[o + 2] = 0;
        rgba[o + 3] = 0;
      } else {
        rgba[o + 3] = a1;
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

function downsample2xTo104(src208, dst104) {
  dst104.fill(0);
  for (let y = 0; y < 104; y++) {
    for (let x = 0; x < 104; x++) {
      const so = (y * 2 * 208 + x * 2) * 4;
      const to = (y * 104 + x) * 4;
      dst104[to] = src208[so];
      dst104[to + 1] = src208[so + 1];
      dst104[to + 2] = src208[so + 2];
      dst104[to + 3] = src208[so + 3];
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

function drawForgeEmberStar(pen, cx, cy, arm, colMain, colTip, alpha = 0.9) {
  pen.configure(cx, cy, true, 0, 1, 1);
  pen.pixel(0, 0, PURE_WHITE, alpha);
  for (let i = 1; i <= arm; i++) {
    const c = i === 1 ? colMain : colTip;
    const a = alpha * (1 - (i - 1) / (arm + 1));
    pen.pixel(i, 0, c, a);
    pen.pixel(-i, 0, c, a);
    pen.pixel(0, i, c, a);
    pen.pixel(0, -i, c, a);
  }
}

function auditCell208(cell208, margin = 4) {
  let clipped = false;
  let minX = 208;
  let maxX = -1;
  let minY = 208;
  let maxY = -1;
  for (let y = 0; y < 208; y++) {
    for (let x = 0; x < 208; x++) {
      const a = cell208[(y * 208 + x) * 4 + 3];
      if (a > 0 && (x < margin || x >= 208 - margin || y < margin || y >= 208 - margin)) {
        clipped = true;
      }
      if (a > 16) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  let maxEdgeRun = 0;
  if (maxX >= minX && maxY >= minY) {
    let topRun = 0;
    let botRun = 0;
    let leftRun = 0;
    let rightRun = 0;
    for (let x = minX; x <= maxX; x++) {
      if (cell208[(minY * 208 + x) * 4 + 3] > 16) topRun++;
      if (cell208[(maxY * 208 + x) * 4 + 3] > 16) botRun++;
    }
    for (let y = minY; y <= maxY; y++) {
      if (cell208[(y * 208 + minX) * 4 + 3] > 16) leftRun++;
      if (cell208[(y * 208 + maxX) * 4 + 3] > 16) rightRun++;
    }
    maxEdgeRun = Math.max(topRun, botRun, leftRun, rightRun);
  }
  return { clipped, maxEdgeRun };
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
    dbgRgba[i * 4 + 1] = 12;
    dbgRgba[i * 4 + 2] = 10;
    dbgRgba[i * 4 + 3] = 255;
  }

  const rowSpecs = [
    {
      name: 'Row 0: Tectonic Jade-Gold Magma Fissure Wave',
      windowSec: 1.0,
      native208: false,
      exposure: 1.18,
      env: { cx: 51.5, cy: 50.0, rx: 41.0, ry: 38.0, inner: 0.64 },
      layers: [
        { def: FORGE_EFFECT_REGISTRY.tectonicMagmaWaveCell, warmup: 0, cfg: { x: 52, y: 50, palette: FORGE_GOLD_PALETTE, seed: 301 } },
        { def: FORGE_EFFECT_REGISTRY.tectonicMagmaWaveCell, warmup: 0.04, cfg: { x: 50, y: 50, palette: FORGE_JADE_PALETTE, seed: 307 } }
      ],
      accent(pen, c) {
        const ph = (c / 30) * Math.PI * 2;
        drawForgeEmberStar(pen, 62 + Math.cos(ph) * 8, 44 + Math.sin(ph) * 6, 3, C_GOLD_BRIGHT, C_JADE, 0.86);
      }
    },
    {
      name: 'Row 1: Horned Runic Dwarven Forge-Anvil (F00..F11 drop + F12..F29 molten monolith)',
      windowSec: 1.0,
      native208: false,
      exposure: 1.18,
      env: { cx: 51.5, cy: 50.5, rx: 40.5, ry: 39.5, inner: 0.64 },
      layers: [
        { def: FORGE_EFFECT_REGISTRY.runicIronForgeAnvilCell, warmup: 0, cfg: { x: 52, y: 50, palette: FORGE_GOLD_PALETTE, seed: 313 } }
      ],
      accent(pen, c) {
        const ph = (c / 30) * Math.PI * 2;
        drawForgeEmberStar(pen, 52 + Math.cos(ph) * 14, 48 + Math.sin(ph) * 8, 3, C_JADE_PALE, C_GOLD_BRIGHT, 0.82);
      }
    },
    {
      name: 'Row 2: Erupting Jade-Gold Volcanic Magma Rune Pillar',
      windowSec: 1.0,
      native208: false,
      exposure: 1.2,
      env: { cx: 51.5, cy: 48.0, rx: 28.0, ry: 22.0, inner: 0.56 },
      layers: [
        { def: FORGE_EFFECT_REGISTRY.tectonicMagmaPillarCell, warmup: 0, cfg: { x: 52, y: 49, palette: FORGE_GOLD_PALETTE, seed: 331 } },
        { def: FORGE_EFFECT_REGISTRY.tectonicMagmaPillarCell, warmup: 0.03, cfg: { x: 52, y: 49, palette: FORGE_JADE_PALETTE, seed: 337 } }
      ],
      accent(pen, c) {
        const ph = (c / 30) * Math.PI * 2;
        drawForgeEmberStar(pen, 52 + Math.sin(ph) * 7, 38 + Math.cos(ph) * 5, 3, C_GOLD_BRIGHT, C_JADE, 0.85);
      }
    },
    {
      name: 'Row 3: World-Forge Sovereign Crucible Back-Halo & Rune Seal',
      windowSec: 1.0,
      native208: false,
      exposure: 1.2,
      env: { cx: 51.5, cy: 51.5, rx: 30.5, ry: 30.5, inner: 0.62 },
      layers: [
        { def: FORGE_EFFECT_REGISTRY.worldForgeAnvilSealCell, warmup: 0, cfg: { x: 52, y: 52, palette: FORGE_GOLD_PALETTE, seed: 349 } },
        { def: FORGE_EFFECT_REGISTRY.worldForgeAnvilSealCell, warmup: 0.14, cfg: { x: 52, y: 52, palette: FORGE_JADE_PALETTE, seed: 353 } }
      ],
      accent(pen, c) {
        const ph = (c / 30) * Math.PI * 2;
        drawForgeEmberStar(pen, 52 + Math.cos(ph) * 16, 52 + Math.sin(ph) * 16, 3, C_JADE_PALE, C_MAGMA, 0.82);
      }
    },
    {
      name: 'Row 4: Blunt Maul Cataclysm Crater Concussion Nova',
      windowSec: 1.0,
      native208: false,
      exposure: 1.2,
      env: { cx: 51.5, cy: 51.5, rx: 28.5, ry: 24.5, inner: 0.58 },
      layers: [
        {
          def: FORGE_EFFECT_REGISTRY.cataclysmCraterNovaCell,
          warmup: 0,
          cfg: { x: 52, y: 52, palette: FORGE_GOLD_PALETTE, jadePalette: FORGE_JADE_PALETTE, seed: 359 }
        }
      ],
      accent(pen, c) {
        drawForgeEmberStar(pen, 52, 52, 4 + (c % 2), C_GOLD_BRIGHT, C_JADE, 0.85);
      }
    },
    {
      name: 'Row 5: Native 208x208 Colossal World-Forge Crucible Anvil Altar',
      windowSec: 1.0,
      native208: true,
      exposure: 1.18,
      env: { cx: 103.5, cy: 103.5, rx: 56.0, ry: 55.0, inner: 0.58 },
      layers: [
        { def: FORGE_EFFECT_REGISTRY.worldForgeCrucibleAltarCell, warmup: 0, cfg: { x: 104, y: 104, palette: FORGE_GOLD_PALETTE, seed: 367 } },
        { def: FORGE_EFFECT_REGISTRY.worldForgeCrucibleAltarCell, warmup: 0.08, cfg: { x: 104, y: 104, palette: FORGE_JADE_PALETTE, seed: 373 } }
      ],
      accent(pen, c) {
        const ph = (c / 30) * Math.PI * 2;
        drawForgeEmberStar(pen, 104 + Math.cos(ph) * 28, 104 + Math.sin(ph) * 28, 5, C_JADE_PALE, C_GOLD_BRIGHT, 0.84);
      }
    },
    {
      name: 'Row 6: Native 208x208 God-Hammer Mjolnir Lightning-Magma Strike',
      windowSec: 1.0,
      native208: true,
      exposure: 1.18,
      env: { cx: 103.5, cy: 101.0, rx: 60.0, ry: 57.0, inner: 0.56 },
      layers: [
        { def: FORGE_EFFECT_REGISTRY.godHammerLightningStrikeCell, warmup: 0, cfg: { x: 104, y: 104, palette: FORGE_GOLD_PALETTE, seed: 379 } },
        { def: FORGE_EFFECT_REGISTRY.godHammerLightningStrikeCell, warmup: 0.02, cfg: { x: 104, y: 104, palette: FORGE_JADE_PALETTE, seed: 383 } }
      ],
      accent(pen, c) {
        const ph = (c / 30) * Math.PI * 2;
        drawForgeEmberStar(pen, 104 + Math.sin(ph) * 14, 118 + Math.cos(ph) * 10, 5, C_GOLD_BRIGHT, C_JADE, 0.85);
      }
    },
    {
      name: 'Row 7: Native 208x208 Continental Sunder Volcanic Rune Geyser',
      windowSec: 1.0,
      native208: true,
      exposure: 1.18,
      env: { cx: 103.5, cy: 120.0, rx: 64.0, ry: 44.0, inner: 0.54 },
      layers: [
        { def: FORGE_EFFECT_REGISTRY.continentalSunderGeyserCell, warmup: 0, cfg: { x: 104, y: 102, palette: FORGE_GOLD_PALETTE, seed: 389 } },
        { def: FORGE_EFFECT_REGISTRY.continentalSunderGeyserCell, warmup: 0.03, cfg: { x: 104, y: 102, palette: FORGE_JADE_PALETTE, seed: 397 } }
      ],
      accent(pen, c) {
        const ph = (c / 30) * Math.PI * 2;
        drawForgeEmberStar(pen, 104 + Math.cos(ph) * 18, 86 + Math.sin(ph) * 12, 5, C_JADE_PALE, C_MAGMA, 0.85);
      }
    }
  ];

  const surface104 = createPixelSurface(LOGICAL, LOGICAL);
  const pen104 = new ShaderPen(surface104);
  const cell104 = new Uint8Array(LOGICAL * LOGICAL * 4);

  const surface208 = createPixelSurface(CELL, CELL);
  const pen208 = new ShaderPen(surface208);
  const cell208 = new Uint8Array(CELL * CELL * 4);

  let borderClips = 0;
  let worstEdgeRun = 0;

  for (let r = 0; r < ROWS; r++) {
    const spec = rowSpecs[r];
    const dt = spec.windowSec / COLS;
    const instances = spec.layers.map((l) => {
      const inst = instantiateShaderEffect(l.def, l.cfg);
      if (l.warmup > 0) inst.step(l.warmup);
      return inst;
    });

    let prevCell = null;
    let transitions = 0;

    for (let c = 0; c < COLS; c++) {
      if (spec.native208) {
        clearPixelSurface(surface208);
        for (const inst of instances) inst.render(pen208, 'back');
        for (const inst of instances) inst.render(pen208, 'front');
        spec.accent?.(pen208, c);
        resolveSurfaceToRGBA(surface208, cell208, spec.exposure);
        applyEllipticalEnvelope(cell208, CELL, CELL, spec.env, 5);
        downsample2xTo104(cell208, cell104);
      } else {
        clearPixelSurface(surface104);
        for (const inst of instances) inst.render(pen104, 'back');
        for (const inst of instances) inst.render(pen104, 'front');
        spec.accent?.(pen104, c);
        resolveSurfaceToRGBA(surface104, cell104, spec.exposure);
        cell208.fill(0);
        blitUpscaledNearest(cell104, LOGICAL, LOGICAL, 2, cell208, CELL, 0, 0);
        applyEllipticalEnvelope(cell208, CELL, CELL, {
          cx: spec.env.cx * 2 + 0.5,
          cy: spec.env.cy * 2 + 0.5,
          rx: spec.env.rx * 2,
          ry: spec.env.ry * 2,
          inner: spec.env.inner
        }, 5);
        downsample2xTo104(cell208, cell104);
      }

      const { clipped, maxEdgeRun } = auditCell208(cell208, 4);
      if (clipped) borderClips++;
      if (maxEdgeRun > worstEdgeRun) worstEdgeRun = maxEdgeRun;

      if (prevCell) {
        let diff = false;
        for (let i = 0; i < cell208.length; i++) {
          if (cell208[i] !== prevCell[i]) {
            diff = true;
            break;
          }
        }
        if (diff) transitions++;
      }
      prevCell = cell208.slice();

      for (let sy = 0; sy < CELL; sy++) {
        const srcOff = sy * CELL * 4;
        const dstOff = ((r * CELL + sy) * sheetW + c * CELL) * 4;
        sheetRgba.set(cell208.subarray(srcOff, srcOff + CELL * 4), dstOff);
      }

      const dx = dbgPad + c * (LOGICAL + dbgPad);
      const dy = dbgPad + r * (LOGICAL + dbgPad);
      for (let yy = 0; yy < LOGICAL; yy++) {
        for (let xx = 0; xx < LOGICAL; xx++) {
          const isEdge = xx === 0 || yy === 0 || xx === LOGICAL - 1 || yy === LOGICAL - 1;
          const o = ((dy + yy) * dbgW + (dx + xx)) * 4;
          dbgRgba[o] = isEdge ? 76 : 24;
          dbgRgba[o + 1] = isEdge ? 48 : 16;
          dbgRgba[o + 2] = isEdge ? 22 : 12;
          dbgRgba[o + 3] = 255;
        }
      }
      alphaCompositeOnto(cell104, LOGICAL, LOGICAL, dbgRgba, dbgW, dx, dy);

      for (const inst of instances) inst.step(dt);
    }

    if (transitions !== 29) {
      throw new Error(`[titan_ex_vfx] Row ${r} expected 29/29 transitions, got ${transitions}`);
    }
  }

  if (borderClips !== 0 || worstEdgeRun >= 28) {
    throw new Error(`[titan_ex_vfx] QA failed: borderClips=${borderClips}/240, worstEdgeRun=${worstEdgeRun}px`);
  }

  const outPath = path.join(REPO_ROOT, 'assets', 'sprites', 'titan_ex_vfx.png');
  fs.writeFileSync(outPath, encodeRgbaPng(sheetW, sheetH, sheetRgba));
  fs.mkdirSync(SCRATCH_DIR, { recursive: true });
  const dbgPath = path.join(SCRATCH_DIR, 'debug_titan_ex_vfx.png');
  fs.writeFileSync(dbgPath, encodeRgbaPng(dbgW, dbgH, dbgRgba));
  console.log(`[titan_ex_vfx] Wrote ${outPath} (${sheetW}x${sheetH}, borderClips=0/240, maxEdgeRun=${worstEdgeRun}px) & ${dbgPath}`);
}

bakeVfxSheet();
