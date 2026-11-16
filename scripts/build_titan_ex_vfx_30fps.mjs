#!/usr/bin/env node
/**
 * Next-Gen 30fps VFX Sprite Sheet Builder for Torgar EX (`titan_ex` / `TitanEx.js`).
 * Powered natively by `src/engine/ArcaneShaderFX.js` + `src/engine/shaders/forgeShaders.js`.
 *
 * CRITICAL WEAPON INVARIANT: ZERO sword-tip slash crescents anywhere!
 * Every row renders heavy blunt Dwarven Warhammer shockwaves, horned iron anvils,
 * tectonic magma-jade pillars, 8-cog Crucible seals, and shattered bedrock craters!
 *
 * Row Contract (8 rows x 30 cols @ 208x208 = 6240x1664):
 *   - Row 0: Traveling Tectonic Magma-Jade Earth-Spire Wave (`fissureWaves` & `forge_wave`)
 *   - Row 1: Horned Khazad Runic Iron Forge-Anvil Construct & Cannonball
 *   - Row 2: Erupting Magma-Jade Volcanic Rune Obelisk Pillar
 *   - Row 3: 8-Cog Sovereign World-Forge Crucible Mandala Seal
 *   - Row 4: Blunt Molten Hammer Star-Crater Concussion Shock-Ring Nova
 *   - Row 5: Colossal World-Forge Crucible Anvil Target Seal
 *   - Row 6: God-Hammer Mjolnir Lightning-Magma Concussion Strike
 *   - Row 7: Continental Sunder 2.5D Soil, Dirt & Shattered Bedrock Crater Splash
 *
 * Invariants:
 *   - 100% 2x2 integer pixel blocks (104x104 logical -> 2x NEAREST)
 *   - Pure binary alpha (0 or 255), 0/240 4px border clips, 0 Unicode emojis
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

function enforceStrictCellMargin104(rgba, w = 104, h = 104) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const distEdge = Math.min(x, y, w - 1 - x, h - 1 - y);
      const o = (y * w + x) * 4;
      if (distEdge < 3) {
        rgba[o] = 0;
        rgba[o + 1] = 0;
        rgba[o + 2] = 0;
        rgba[o + 3] = 0;
      } else if (rgba[o + 3] > 0) {
        if (rgba[o + 3] < 96) {
          rgba[o] = 0;
          rgba[o + 1] = 0;
          rgba[o + 2] = 0;
          rgba[o + 3] = 0;
        } else {
          rgba[o + 3] = 255;
        }
      }
    }
  }
}

function downsample2xTo104Binary(src208, dst104) {
  dst104.fill(0);
  for (let y = 0; y < 104; y++) {
    for (let x = 0; x < 104; x++) {
      let bestA = 0;
      let bestR = 0;
      let bestG = 0;
      let bestB = 0;
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const so = ((y * 2 + dy) * 208 + (x * 2 + dx)) * 4;
          const a = src208[so + 3];
          if (a > bestA) {
            bestA = a;
            bestR = src208[so];
            bestG = src208[so + 1];
            bestB = src208[so + 2];
          }
        }
      }
      const to = (y * 104 + x) * 4;
      dst104[to] = bestR;
      dst104[to + 1] = bestG;
      dst104[to + 2] = bestB;
      dst104[to + 3] = bestA;
    }
  }
  enforceStrictCellMargin104(dst104, 104, 104);
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
    { native208: false, def: FORGE_EFFECT_REGISTRY.tectonicMagmaWaveCell, cfg: { x: 52, y: 52, palette: FORGE_GOLD_PALETTE, seed: 201 } },
    { native208: false, def: FORGE_EFFECT_REGISTRY.runicIronForgeAnvilCell, cfg: { x: 52, y: 52, palette: FORGE_GOLD_PALETTE, seed: 213 } },
    { native208: false, def: FORGE_EFFECT_REGISTRY.tectonicMagmaPillarCell, cfg: { x: 52, y: 52, palette: FORGE_GOLD_PALETTE, seed: 227 } },
    { native208: false, def: FORGE_EFFECT_REGISTRY.worldForgeAnvilSealCell, cfg: { x: 52, y: 52, palette: FORGE_GOLD_PALETTE, seed: 239 } },
    { native208: false, def: FORGE_EFFECT_REGISTRY.cataclysmCraterNovaCell, cfg: { x: 52, y: 52, palette: FORGE_GOLD_PALETTE, jadePalette: FORGE_JADE_PALETTE, seed: 251 } },
    { native208: true, def: FORGE_EFFECT_REGISTRY.worldForgeCrucibleAltarCell, cfg: { x: 104, y: 104, palette: FORGE_GOLD_PALETTE, seed: 307 } },
    { native208: true, def: FORGE_EFFECT_REGISTRY.godHammerLightningStrikeCell, cfg: { x: 104, y: 104, palette: FORGE_GOLD_PALETTE, seed: 331 } },
    { native208: true, def: FORGE_EFFECT_REGISTRY.continentalSunderGeyserCell, cfg: { x: 104, y: 104, palette: FORGE_GOLD_PALETTE, seed: 359 } }
  ];

  const surface104 = createPixelSurface(LOGICAL, LOGICAL);
  const pen104 = new ShaderPen(surface104);
  const cell104 = new Uint8Array(LOGICAL * LOGICAL * 4);

  const surface208 = createPixelSurface(CELL, CELL);
  const pen208 = new ShaderPen(surface208);
  const raw208 = new Uint8Array(CELL * CELL * 4);
  const cell208 = new Uint8Array(CELL * CELL * 4);

  let borderClips = 0;

  for (let r = 0; r < ROWS; r++) {
    const spec = rowSpecs[r];
    const inst = instantiateShaderEffect(spec.def, spec.cfg);
    const dt = 1.0 / COLS;

    for (let c = 0; c < COLS; c++) {
      if (spec.native208) {
        clearPixelSurface(surface208);
        inst.render(pen208, 'back');
        inst.render(pen208, 'front');
        resolveSurfaceToRGBA(surface208, raw208, 1.12);
        // Quantize to 104x104 -> 2x NEAREST so Rows 5..7 also obey 100% 2x2 integer pixel blocks & binary alpha!
        downsample2xTo104Binary(raw208, cell104);
      } else {
        clearPixelSurface(surface104);
        inst.render(pen104, 'back');
        inst.render(pen104, 'front');
        resolveSurfaceToRGBA(surface104, cell104, 1.12);
        enforceStrictCellMargin104(cell104, LOGICAL, LOGICAL);
      }
      inst.step(dt);

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
          dbgRgba[o] = isEdge ? 76 : 24;
          dbgRgba[o + 1] = isEdge ? 48 : 16;
          dbgRgba[o + 2] = isEdge ? 22 : 12;
          dbgRgba[o + 3] = 255;
        }
      }
      alphaCompositeOnto(cell104, LOGICAL, LOGICAL, dbgRgba, dbgW, dx, dy);
    }
  }

  if (borderClips !== 0) {
    throw new Error(`[titan_ex_vfx] Expected 0/240 border clips, got ${borderClips}/240`);
  }

  const outPath = path.join(REPO_ROOT, 'assets', 'sprites', 'titan_ex_vfx.png');
  fs.writeFileSync(outPath, encodeRgbaPng(sheetW, sheetH, sheetRgba));
  console.log(`[titan_ex_vfx] Wrote ${outPath} (${sheetW}x${sheetH}, borderClips=${borderClips}/240)`);

  fs.mkdirSync(SCRATCH_DIR, { recursive: true });
  const dbgPath = path.join(SCRATCH_DIR, 'debug_titan_ex_vfx_contact.png');
  fs.writeFileSync(dbgPath, encodeRgbaPng(dbgW, dbgH, dbgRgba));
  console.log(`[titan_ex_vfx] Wrote contact sheet -> ${dbgPath}`);
}

bakeVfxSheet();
