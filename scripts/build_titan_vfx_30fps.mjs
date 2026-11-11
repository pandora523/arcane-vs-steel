#!/usr/bin/env node
/**
 * First-Party 30fps VFX Sprite Sheet Builder for Torgar (`titan` / `Titan.js`).
 * Powered natively by `src/engine/ArcaneShaderFX.js` + `src/engine/shaders/forgeShaders.js`.
 *
 * Outputs:
 *   1. `assets/sprites/titan_vfx.png` (6240x1664, 8 rows x 30 cols @ 208x208, 0/240 border clips)
 *   2. `<artifactDir>/debug_titan_30fps_vfx.png` (8x30 contact sheet for visual verification)
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
} from '../src/engine/ArcaneShaderFX.js?v=30fps68';

import {
  FORGE_GOLD_PALETTE,
  FORGE_JADE_PALETTE,
  FORGE_EFFECT_REGISTRY
} from '../src/engine/shaders/forgeShaders.js?v=30fps68';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const ARTIFACT_DIRS = [
  '/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/3a4b2cf8-05c2-45a3-bb65-af6f5b5a1088',
  '/home/antigravity/.gemini/jetski/brain/3a4b2cf8-05c2-45a3-bb65-af6f5b5a1088'
];
const LOCAL_SCRATCH_DIR =
  '/home/antigravity/.gemini/jetski/brain/a815757550227923da36a43fb00c80f0/scratch';

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
        const k = (distEdge - 1.5) / 5.5;
        rgba[o + 3] = Math.round(rgba[o + 3] * k);
      }
    }
  }
}

function enforceSafeCellMargin208(rgba, w = 208, h = 208) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const distEdge = Math.min(x, y, w - 1 - x, h - 1 - y);
      const o = (y * w + x) * 4;
      if (distEdge < 4) {
        rgba[o] = 0;
        rgba[o + 1] = 0;
        rgba[o + 2] = 0;
        rgba[o + 3] = 0;
      } else if (distEdge < 12 && rgba[o + 3] > 0) {
        const k = (distEdge - 3.5) / 8.5;
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
      // Max-alpha / bright-preserving 2x2 downsample for crisp contact-sheet inspection
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
    dbgRgba[i * 4] = 16;
    dbgRgba[i * 4 + 1] = 11;
    dbgRgba[i * 4 + 2] = 9;
    dbgRgba[i * 4 + 3] = 255;
  }

  // 1:1 208x208 closeup contact sheet for Rows 5, 6, 7 (6 sampled frames per row: F00, F05, F10, F15, F20, F25)
  const sampleCols = [0, 5, 10, 15, 20, 25];
  const closePad = 8;
  const closeW = sampleCols.length * (CELL + closePad) + closePad;
  const closeH = 3 * (CELL + closePad) + closePad;
  const closeRgba = new Uint8Array(closeW * closeH * 4);
  for (let i = 0; i < closeW * closeH; i++) {
    closeRgba[i * 4] = 18;
    closeRgba[i * 4 + 1] = 12;
    closeRgba[i * 4 + 2] = 10;
    closeRgba[i * 4 + 3] = 255;
  }

  const rowSpecs = [
    {
      name: 'Row 0: Tectonic Magma Wave (F00..F29)',
      windowSec: 1.0,
      native208: false,
      layers: [
        {
          def: FORGE_EFFECT_REGISTRY.tectonicMagmaWaveCell,
          warmup: 0,
          cfg: { x: 52, y: 52, palette: FORGE_GOLD_PALETTE, seed: 201 }
        }
      ]
    },
    {
      name: 'Row 1: Runic Iron Forge-Anvil (F00..F29)',
      windowSec: 1.0,
      native208: false,
      layers: [
        {
          def: FORGE_EFFECT_REGISTRY.runicIronForgeAnvilCell,
          warmup: 0,
          cfg: { x: 52, y: 52, palette: FORGE_GOLD_PALETTE, seed: 213 }
        }
      ]
    },
    {
      name: 'Row 2: Erupting Magma-Jade Rune Pillar (F00..F29)',
      windowSec: 1.0,
      native208: false,
      layers: [
        {
          def: FORGE_EFFECT_REGISTRY.tectonicMagmaPillarCell,
          warmup: 0,
          cfg: { x: 52, y: 52, palette: FORGE_GOLD_PALETTE, seed: 227 }
        }
      ]
    },
    {
      name: 'Row 3: World-Forge Sovereign Seal (F00..F29)',
      windowSec: 1.0,
      native208: false,
      layers: [
        {
          def: FORGE_EFFECT_REGISTRY.worldForgeAnvilSealCell,
          warmup: 0,
          cfg: { x: 52, y: 52, palette: FORGE_GOLD_PALETTE, seed: 239 }
        }
      ]
    },
    {
      name: 'Row 4: Molten Hammer Shock-Ring (F00..F29)',
      windowSec: 1.0,
      native208: false,
      layers: [
        {
          def: FORGE_EFFECT_REGISTRY.cataclysmCraterNovaCell,
          warmup: 0,
          cfg: { x: 52, y: 52, palette: FORGE_GOLD_PALETTE, jadePalette: FORGE_JADE_PALETTE, seed: 251 }
        }
      ]
    },
    {
      name: 'Row 5: Native 208x208 Colossal World-Forge Crucible Anvil Altar (F00..F29)',
      windowSec: 1.0,
      native208: true,
      layers: [
        {
          def: FORGE_EFFECT_REGISTRY.worldForgeCrucibleAltarCell,
          warmup: 0,
          cfg: { x: 104, y: 104, palette: FORGE_GOLD_PALETTE, seed: 307 }
        }
      ]
    },
    {
      name: 'Row 6: Native 208x208 God-Hammer Lightning-Magma Strike Arc (F00..F29)',
      windowSec: 1.0,
      native208: true,
      layers: [
        {
          def: FORGE_EFFECT_REGISTRY.godHammerLightningStrikeCell,
          warmup: 0,
          cfg: { x: 104, y: 104, palette: FORGE_GOLD_PALETTE, seed: 331 }
        }
      ]
    },
    {
      name: 'Row 7: Native 208x208 Continental Sunder Volcanic Rune Geyser (F00..F29)',
      windowSec: 1.0,
      native208: true,
      layers: [
        {
          def: FORGE_EFFECT_REGISTRY.continentalSunderGeyserCell,
          warmup: 0,
          cfg: { x: 104, y: 104, palette: FORGE_GOLD_PALETTE, seed: 359 }
        }
      ]
    }
  ];

  const surface104 = createPixelSurface(LOGICAL, LOGICAL);
  const pen104 = new ShaderPen(surface104);
  const cell104 = new Uint8Array(LOGICAL * LOGICAL * 4);

  const surface208 = createPixelSurface(CELL, CELL);
  const pen208 = new ShaderPen(surface208);
  const cell208 = new Uint8Array(CELL * CELL * 4);

  let borderClips = 0;

  for (let r = 0; r < ROWS; r++) {
    const spec = rowSpecs[r];
    const dt = spec.windowSec / COLS;
    const instances = spec.layers.map((l) => {
      const inst = instantiateShaderEffect(l.def, l.cfg);
      if (l.warmup > 0) inst.step(l.warmup);
      return inst;
    });
    let activeFrames = 0;

    for (let c = 0; c < COLS; c++) {
      const dx = dbgPad + c * (LOGICAL + dbgPad);
      const dy = dbgPad + r * (LOGICAL + dbgPad);
      for (let yy = 0; yy < LOGICAL; yy++) {
        for (let xx = 0; xx < LOGICAL; xx++) {
          const isEdge = xx === 0 || yy === 0 || xx === LOGICAL - 1 || yy === LOGICAL - 1;
          const o = ((dy + yy) * dbgW + (dx + xx)) * 4;
          dbgRgba[o] = isEdge ? 76 : 22;
          dbgRgba[o + 1] = isEdge ? 42 : 14;
          dbgRgba[o + 2] = isEdge ? 18 : 11;
          dbgRgba[o + 3] = 255;
        }
      }

      if (spec.native208) {
        clearPixelSurface(surface208);
        for (const inst of instances) inst.render(pen208, 'back');
        for (const inst of instances) inst.render(pen208, 'front');
        resolveSurfaceToRGBA(surface208, cell208, 1.12);

        for (let i = 0; i < CELL; i++) {
          if (
            cell208[(0 * CELL + i) * 4 + 3] > 0 ||
            cell208[((CELL - 1) * CELL + i) * 4 + 3] > 0 ||
            cell208[(i * CELL + 0) * 4 + 3] > 0 ||
            cell208[(i * CELL + (CELL - 1)) * 4 + 3] > 0
          ) {
            borderClips++;
            break;
          }
        }

        enforceSafeCellMargin208(cell208, CELL, CELL);

        let hasPixels = false;
        for (let i = 3; i < cell208.length; i += 4) {
          if (cell208[i] > 0) {
            hasPixels = true;
            break;
          }
        }
        if (hasPixels) activeFrames++;

        blitUpscaledNearest(cell208, CELL, CELL, 1, sheetRgba, sheetW, c * CELL, r * CELL);
        downsample2xTo104(cell208, cell104);
        alphaCompositeOnto(cell104, LOGICAL, LOGICAL, dbgRgba, dbgW, dx, dy);

        const sIdx = sampleCols.indexOf(c);
        if (sIdx !== -1 && r >= 5) {
          const cx = closePad + sIdx * (CELL + closePad);
          const cy = closePad + (r - 5) * (CELL + closePad);
          alphaCompositeOnto(cell208, CELL, CELL, closeRgba, closeW, cx, cy);
        }
      } else {
        clearPixelSurface(surface104);
        for (const inst of instances) inst.render(pen104, 'back');
        for (const inst of instances) inst.render(pen104, 'front');
        resolveSurfaceToRGBA(surface104, cell104, 1.12);

        for (let i = 0; i < LOGICAL; i++) {
          if (
            cell104[(0 * LOGICAL + i) * 4 + 3] > 0 ||
            cell104[((LOGICAL - 1) * LOGICAL + i) * 4 + 3] > 0 ||
            cell104[(i * LOGICAL + 0) * 4 + 3] > 0 ||
            cell104[(i * LOGICAL + (LOGICAL - 1)) * 4 + 3] > 0
          ) {
            borderClips++;
            break;
          }
        }

        enforceSafeCellMargin104(cell104, LOGICAL, LOGICAL);

        let hasPixels = false;
        for (let i = 3; i < cell104.length; i += 4) {
          if (cell104[i] > 0) {
            hasPixels = true;
            break;
          }
        }
        if (hasPixels) activeFrames++;

        blitUpscaledNearest(cell104, LOGICAL, LOGICAL, 2, sheetRgba, sheetW, c * CELL, r * CELL);
        alphaCompositeOnto(cell104, LOGICAL, LOGICAL, dbgRgba, dbgW, dx, dy);
      }

      for (const inst of instances) inst.step(dt);
    }

    console.log(`[titan-vfx] Baked ${spec.name} (active=${activeFrames}/${COLS})`);
    if (activeFrames !== COLS) {
      throw new Error(`Expected ${COLS}/${COLS} active frames on row ${r}, got ${activeFrames}`);
    }
  }

  const outVfxPath = path.join(REPO_ROOT, 'assets', 'sprites', 'titan_vfx.png');
  fs.writeFileSync(outVfxPath, encodeRgbaPng(sheetW, sheetH, sheetRgba));
  console.log(`[titan-vfx] Wrote ${outVfxPath} (${sheetW}x${sheetH}), borderClips=${borderClips}/240`);
  if (borderClips !== 0) {
    throw new Error(`Expected 0 borderClips on titan_vfx.png, got ${borderClips}`);
  }

  const dbgPng = encodeRgbaPng(dbgW, dbgH, dbgRgba);
  for (const dir of ARTIFACT_DIRS) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      const outDbgPath = path.join(dir, 'debug_titan_30fps_vfx.png');
      fs.writeFileSync(outDbgPath, dbgPng);
      console.log(`[titan-vfx] Wrote contact sheet -> ${outDbgPath}`);
    } catch {
      // Ignore if secondary artifact directory is inaccessible
    }
  }

  try {
    fs.mkdirSync(LOCAL_SCRATCH_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(LOCAL_SCRATCH_DIR, 'debug_titan_ult_208_closeup.png'),
      encodeRgbaPng(closeW, closeH, closeRgba)
    );
  } catch {
    // Optional scratch closeup
  }
}

bakeVfxSheet();
