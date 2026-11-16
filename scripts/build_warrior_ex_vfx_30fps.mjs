#!/usr/bin/env node
/**
 * Next-Gen 30fps HD-2D Luminescent VFX Sprite Sheet Builder for Aethelgard EX (`warrior_ex` / `WarriorEx.js`).
 * Powered by `src/engine/ArcaneShaderFX.js` + read-only `src/engine/shaders/runicSteelShaders.js`.
 *
 * Row Contract (`assets/sprites/warrior_ex_vfx.png`, 6240x1664 = 8 rows x 30 cols @ 208x208):
 *   - Row 0: Sovereign Dawn-Breaker Runeblade Crescent Wave (`blade_wave` cyan-gold projectile)
 *   - Row 1: Sky-Strike Runeblade Flight (F00..F11) & Consecrated Aegis Crest (F12..F29) (`spawnSkyStrike('runeblade')` & Skill seal)
 *   - Row 2: Sovereign Sky-Judgment Dawn-Blade Spire Pillar (`DAWN-BREAKER TRINITY RUSH` sword-pillars)
 *   - Row 3: Celestial Pentagram & Elder Runic Sanctuary Seal (`CELESTIAL PENTAGRAM OMNISLASH` floor lock)
 *   - Row 4: Omnislash Cross-Cleave & Astral Starburst Nova
 *   - Row 5: Native 208x208 Celestial Justice Consecrated Rose-Sanctuary Great-Slash
 *   - Row 6: Native 208x208 Consecrated Cathedral Light-Column & Monolith Greatsword Seal
 *   - Row 7: Native 208x208 30fps Fluttering Seraphim Dawn-Feather
 *
 * Invariants:
 *   - Smooth radial/elliptical alpha falloff + soft `enforceSafeCellMargin` (0 binary box walls, 0 flat cuts, 0/240 border clips)
 *   - 30/30 animated frames per row (29/29 transitions), zero Unicode emojis
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
  RUNIC_CYAN_PALETTE,
  RUNIC_GOLD_PALETTE,
  RUNIC_STEEL_EFFECT_REGISTRY
} from '../src/engine/shaders/runicSteelShaders.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SCRATCH_DIR =
  '/Users/rei/.gemini/antigravity/brain/5416474b-0e5f-4471-85c8-b7a88055e218/scratch';

const C_GOLD = packHexColor('#facc15');
const C_GOLD_PALE = packHexColor('#fef08a');
const C_CYAN = packHexColor('#38bdf8');
const C_ROSE = packHexColor('#fb7185');

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
  const inner = env?.inner ?? 0.68;

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

function drawSovereignStarAccent(pen, cx, cy, arm, colMain, colTip, alpha = 0.9) {
  pen.configure(cx, cy, true, 0, 1, 1);
  pen.pixel(0, 0, PURE_WHITE, alpha);
  for (let i = 1; i <= arm; i++) {
    const c = i <= 1 ? colMain : colTip;
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
      if (a > 0) {
        if (x < margin || x >= 208 - margin || y < margin || y >= 208 - margin) clipped = true;
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
    dbgRgba[i * 4] = 8;
    dbgRgba[i * 4 + 1] = 14;
    dbgRgba[i * 4 + 2] = 28;
    dbgRgba[i * 4 + 3] = 255;
  }

  const rowSpecs = [
    {
      name: 'Row 0: Sovereign Dawn-Breaker Crescent Wave',
      windowSec: 1.0,
      native208: false,
      exposure: 1.18,
      env: { cx: 51.5, cy: 51.5, rx: 43.5, ry: 43.5, inner: 0.68 },
      layers: [
        { def: RUNIC_STEEL_EFFECT_REGISTRY.runebladeWaveArcCell, warmup: 0, cfg: { x: 52, y: 52, palette: RUNIC_CYAN_PALETTE, seed: 701 } },
        { def: RUNIC_STEEL_EFFECT_REGISTRY.runebladeWaveArcCell, warmup: 0.03, cfg: { x: 49, y: 52, palette: RUNIC_GOLD_PALETTE, seed: 709 } }
      ],
      accent(pen, c) {
        const ph = (c / 30) * Math.PI * 2;
        drawSovereignStarAccent(pen, 74 + Math.cos(ph) * 2, 52 + Math.sin(ph) * 3, 4, C_GOLD_PALE, C_CYAN, 0.9);
      }
    },
    {
      name: 'Row 1: Sky-Strike Runeblade Flight (F00..F11) & Consecrated Aegis Crest (F12..F29)',
      windowSec: 1.0,
      native208: false,
      exposure: 1.18,
      env: { cx: 51.5, cy: 51.5, rx: 28.5, ry: 27.0, inner: 0.62 },
      layers: [
        { def: RUNIC_STEEL_EFFECT_REGISTRY.aegisRuneCrestCell, warmup: 0, cfg: { x: 52, y: 52, palette: RUNIC_GOLD_PALETTE, seed: 719 } },
        { def: RUNIC_STEEL_EFFECT_REGISTRY.aegisRuneCrestCell, warmup: 0, cfg: { x: 52, y: 52, palette: RUNIC_CYAN_PALETTE, seed: 727 } }
      ],
      accent(pen, c) {
        const ph = (c / 30) * Math.PI * 2;
        drawSovereignStarAccent(pen, 52 + Math.cos(ph) * 14, 52 + Math.sin(ph) * 10, 3, C_GOLD, C_CYAN, 0.78);
      }
    },
    {
      name: 'Row 2: Sovereign Sky-Judgment Dawn-Blade Spire Pillar',
      windowSec: 1.0,
      native208: false,
      exposure: 1.2,
      env: { cx: 51.5, cy: 51.5, rx: 36.0, ry: 43.0, inner: 0.62 },
      layers: [
        { def: RUNIC_STEEL_EFFECT_REGISTRY.skyJudgmentBladePillarCell, warmup: 0, cfg: { x: 52, y: 52, palette: RUNIC_CYAN_PALETTE, seed: 733 } },
        { def: RUNIC_STEEL_EFFECT_REGISTRY.skyJudgmentBladePillarCell, warmup: 0.02, cfg: { x: 52, y: 52, palette: RUNIC_GOLD_PALETTE, seed: 739 } }
      ],
      accent(pen, c) {
        const ph = (c / 30) * Math.PI * 2;
        drawSovereignStarAccent(pen, 52 + Math.sin(ph) * 8, 38 + Math.cos(ph) * 6, 3, C_GOLD_PALE, C_CYAN, 0.85);
      }
    },
    {
      name: 'Row 3: Celestial Pentagram & Elder Runic Sanctuary Seal',
      windowSec: 1.0,
      native208: false,
      exposure: 1.2,
      env: { cx: 51.5, cy: 51.5, rx: 31.2, ry: 31.2, inner: 0.66 },
      layers: [
        { def: RUNIC_STEEL_EFFECT_REGISTRY.elderRunicSanctuarySealCell, warmup: 0, cfg: { x: 52, y: 52, palette: RUNIC_GOLD_PALETTE, seed: 743 } },
        { def: RUNIC_STEEL_EFFECT_REGISTRY.elderRunicSanctuarySealCell, warmup: 0.12, cfg: { x: 52, y: 52, palette: RUNIC_CYAN_PALETTE, seed: 751 } }
      ],
      accent(pen, c) {
        const ph = (c / 30) * Math.PI * 2;
        pen.configure(52, 52, true, 0, 1, 1);
        const verts = [];
        for (let k = 0; k < 5; k++) {
          const a = -Math.PI * 0.5 + ph * 0.5 + (k * Math.PI * 2) / 5;
          verts.push([Math.cos(a) * 24, Math.sin(a) * 24]);
        }
        const order = [0, 2, 4, 1, 3, 0];
        for (let s = 0; s < 5; s++) {
          pen.line(verts[order[s]][0], verts[order[s]][1], verts[order[s + 1]][0], verts[order[s + 1]][1], s % 2 === 0 ? C_GOLD : C_CYAN, 0.72);
        }
      }
    },
    {
      name: 'Row 4: Omnislash Cross-Cleave & Astral Starburst Nova',
      windowSec: 1.0,
      native208: false,
      exposure: 1.2,
      env: { cx: 51.5, cy: 51.5, rx: 42.5, ry: 42.5, inner: 0.64 },
      layers: [
        { def: RUNIC_STEEL_EFFECT_REGISTRY.omnislashStarburstNovaCell, warmup: 0, cfg: { x: 52, y: 52, palette: RUNIC_CYAN_PALETTE, seed: 757 } },
        { def: RUNIC_STEEL_EFFECT_REGISTRY.omnislashStarburstNovaCell, warmup: 0.02, cfg: { x: 52, y: 52, palette: RUNIC_GOLD_PALETTE, seed: 761 } }
      ],
      accent(pen, c) {
        drawSovereignStarAccent(pen, 52, 52, 4 + (c % 2), C_GOLD_PALE, C_CYAN, 0.82);
      }
    },
    {
      name: 'Row 5: Native 208x208 Celestial Justice Rose-Sanctuary Great-Slash',
      windowSec: 1.0,
      native208: true,
      exposure: 1.18,
      env: { cx: 103.5, cy: 103.5, rx: 88.0, ry: 88.0, inner: 0.68 },
      layers: [
        { def: RUNIC_STEEL_EFFECT_REGISTRY.celestialJusticeGreatSlashCell, warmup: 0, cfg: { x: 104, y: 104, palette: RUNIC_GOLD_PALETTE, seed: 769 } },
        { def: RUNIC_STEEL_EFFECT_REGISTRY.celestialJusticeGreatSlashCell, warmup: 0.02, cfg: { x: 104, y: 104, palette: RUNIC_CYAN_PALETTE, seed: 773 } }
      ],
      accent(pen, c) {
        const ph = (c / 30) * Math.PI * 2;
        drawSovereignStarAccent(pen, 104 + Math.cos(ph) * 22, 104 + Math.sin(ph) * 22, 6, C_GOLD_PALE, C_ROSE, 0.78);
      }
    },
    {
      name: 'Row 6: Native 208x208 Consecrated Cathedral Light-Column & Sword Seal',
      windowSec: 1.0,
      native208: true,
      exposure: 1.18,
      env: { cx: 103.5, cy: 102.5, rx: 68.0, ry: 74.0, inner: 0.58 },
      layers: [
        { def: RUNIC_STEEL_EFFECT_REGISTRY.celestialJusticeCathedralPillarCell, warmup: 0, cfg: { x: 104, y: 104, palette: RUNIC_CYAN_PALETTE, seed: 787 } },
        { def: RUNIC_STEEL_EFFECT_REGISTRY.celestialJusticeCathedralPillarCell, warmup: 0.02, cfg: { x: 104, y: 104, palette: RUNIC_GOLD_PALETTE, seed: 797 } }
      ],
      accent(pen, c) {
        const ph = (c / 30) * Math.PI * 2;
        drawSovereignStarAccent(pen, 104 + Math.sin(ph) * 16, 86 + Math.cos(ph) * 14, 5, C_GOLD_PALE, C_CYAN, 0.84);
      }
    },
    {
      name: 'Row 7: Native 208x208 30fps Fluttering Seraphim Dawn-Feather',
      windowSec: 1.0,
      native208: true,
      exposure: 1.18,
      env: { cx: 103.5, cy: 103.5, rx: 84.0, ry: 84.0, inner: 0.68 },
      layers: [
        { def: RUNIC_STEEL_EFFECT_REGISTRY.celestialSeraphimFeatherCell, warmup: 0, cfg: { x: 104, y: 104, palette: RUNIC_GOLD_PALETTE, seed: 809 } },
        { def: RUNIC_STEEL_EFFECT_REGISTRY.celestialSeraphimFeatherCell, warmup: 0.03, cfg: { x: 104, y: 104, palette: RUNIC_CYAN_PALETTE, seed: 811 } }
      ],
      accent(pen, c) {
        const ph = (c / 30) * Math.PI * 2;
        drawSovereignStarAccent(pen, 84 + Math.cos(ph) * 10, 88 + Math.sin(ph) * 8, 4, C_GOLD_PALE, C_CYAN, 0.85);
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
          dbgRgba[o] = isEdge ? 42 : 12;
          dbgRgba[o + 1] = isEdge ? 68 : 18;
          dbgRgba[o + 2] = isEdge ? 108 : 34;
          dbgRgba[o + 3] = 255;
        }
      }
      alphaCompositeOnto(cell104, LOGICAL, LOGICAL, dbgRgba, dbgW, dx, dy);

      for (const inst of instances) inst.step(dt);
    }

    if (transitions !== 29) {
      throw new Error(`[warrior_ex_vfx] Row ${r} expected 29/29 transitions, got ${transitions}`);
    }
  }

  if (borderClips !== 0 || worstEdgeRun >= 28) {
    throw new Error(`[warrior_ex_vfx] QA failed: borderClips=${borderClips}/240, worstEdgeRun=${worstEdgeRun}px`);
  }

  const outPath = path.join(REPO_ROOT, 'assets', 'sprites', 'warrior_ex_vfx.png');
  fs.writeFileSync(outPath, encodeRgbaPng(sheetW, sheetH, sheetRgba));
  fs.mkdirSync(SCRATCH_DIR, { recursive: true });
  const dbgPath = path.join(SCRATCH_DIR, 'debug_warrior_ex_vfx.png');
  fs.writeFileSync(dbgPath, encodeRgbaPng(dbgW, dbgH, dbgRgba));
  console.log(`[warrior_ex_vfx] Wrote ${outPath} (${sheetW}x${sheetH}, borderClips=0/240, maxEdgeRun=${worstEdgeRun}px) & ${dbgPath}`);
}

bakeVfxSheet();
