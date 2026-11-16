#!/usr/bin/env node
/**
 * Newly-Born Neo-Vision 30fps VFX Sprite Sheet Builder for Torgar EX (`titan_ex` / `TitanEx.js`).
 * Powered natively by `src/engine/ArcaneShaderFX.js`.
 *
 * CRITICAL WEAPON INVARIANT: ZERO sword-tip slash crescents anywhere!
 * Every single cell renders blunt Dwarven Warhammer/Maul shockwaves, horned Runic Iron Anvils,
 * Jade-Gold Lava Geysers, 8-Cog Crucible Back-Halos, Stepped Mjolnir Lightning, and 2.5D Magma Craters!
 *
 * Row Contract (`assets/sprites/titan_ex_vfx.png`, 6240x1664 = 8 rows x 30 cols @ 208x208):
 *   - Row 0: Stepped Molten Magma Fissure & Emerald-Jade Tectonic Wave (`forge_wave` & `fissureWaves`)
 *   - Row 1: Glowing Runic Dwarven Anvil Monolith (`TECTONIC FORGE-ANVIL RICOCHET`)
 *   - Row 2: Erupting Jade-Gold Volcanic Lava Geyser Column (Uppercut & 5 Continental Sunder Geysers)
 *   - Row 3: Ignited 8-Cog Crucible Back-Halo & Dwarven Forge-Wheel (`RAGNAROK GRAND-SLAM CRUSHER`)
 *   - Row 4: Blunt Octagonal Maul Concussion Shock-Ring & Molten Slag Burst (0 sword crescents!)
 *   - Row 5: Colossal World-Forge Genesis Anvil Floor Seal (`MJOLNIR GENESIS` lock-on mandala)
 *   - Row 6: Stepped Mjolnir Pixel Lightning & Blunt Hammerhead Stamp
 *   - Row 7: Multi-Layered 2.5D Pixel Magma Crater & Upheaved Basalt Bedrock Slabs
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
  PURE_WHITE,
  packHexColor,
  clamp01,
  smoothStep,
  DeterministicRng,
  buildLightningChain,
  createPixelSurface,
  clearPixelSurface,
  resolveSurfaceToRGBA,
  ShaderPen
} from '../src/engine/ArcaneShaderFX.js?v=30fps115';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SCRATCH_DIR =
  '/Users/rei/.gemini/antigravity/brain/407ee22f-2468-4119-a090-789cbc49325d/scratch';

const C_SEL_IRON = packHexColor('#0d0907');
const C_BASALT_DARK = packHexColor('#241914');
const C_BASALT_MID = packHexColor('#4a3525');
const C_IRON_DARK = packHexColor('#334155');
const C_IRON_LIT = packHexColor('#94a3b8');
const C_MAGMA_DEEP = packHexColor('#9a3412');
const C_MAGMA_ORANGE = packHexColor('#f97316');
const C_GOLD_AMBER = packHexColor('#f59e0b');
const C_GOLD_BRIGHT = packHexColor('#fde047');
const C_JADE_DEEP = packHexColor('#065f46');
const C_JADE_BRIGHT = packHexColor('#10b981');
const C_JADE_PALE = packHexColor('#6ee7b7');
const C_WHITE = PURE_WHITE;

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
        if (rgba[o + 3] < 104) {
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

function drawPixelBox(pen, x0, y0, x1, y1, fillCol, borderCol = C_SEL_IRON, alpha = 1) {
  const lx0 = Math.round(Math.min(x0, x1));
  const lx1 = Math.round(Math.max(x0, x1));
  const ly0 = Math.round(Math.min(y0, y1));
  const ly1 = Math.round(Math.max(y0, y1));
  for (let y = ly0; y <= ly1; y++) {
    for (let x = lx0; x <= lx1; x++) {
      const edge = x === lx0 || x === lx1 || y === ly0 || y === ly1;
      pen.stipple(x, y, edge ? borderCol : fillCol, alpha);
    }
  }
}

function drawForgeStar(pen, cx, cy, arm, colTip, alpha = 1) {
  const rx = Math.round(cx);
  const ry = Math.round(cy);
  const L = Math.max(1, Math.round(arm));
  pen.stipple(rx, ry, C_WHITE, alpha);
  for (let i = 1; i <= L; i++) {
    const c = i === 1 ? C_GOLD_BRIGHT : colTip;
    pen.stipple(rx + i, ry, c, alpha);
    pen.stipple(rx - i, ry, c, alpha);
    pen.stipple(rx, ry + i, c, alpha);
    pen.stipple(rx, ry - i, c, alpha);
  }
}

/** Row 0: Stepped Molten Magma Fissure & Emerald-Jade Tectonic Wave (Blunt marching earth spires!) */
function renderRow0TectonicFissureWave(pen, f) {
  const ph = (f / 30) * Math.PI * 2;
  const baseY = 34;

  // Glowing ground magma seam + emerald shock rim
  drawPixelBox(pen, -38, baseY - 3, 38, baseY + 4, C_MAGMA_ORANGE, C_SEL_IRON, 1.0);
  pen.line(-34, baseY, 34, baseY, C_GOLD_BRIGHT, 1.0);
  pen.line(-30, baseY - 4, 30, baseY - 4, C_JADE_BRIGHT, 0.95);

  // 4 Stepped Blunt Basalt-Magma Spires leaning forward (+X)
  const spires = [
    { cx: -24, w: 7, h: 18 + Math.sin(ph) * 4, jade: false },
    { cx: -8, w: 8, h: 28 + Math.cos(ph) * 5, jade: true },
    { cx: 9, w: 9, h: 38 + Math.sin(ph + 1.1) * 5, jade: false },
    { cx: 25, w: 8, h: 46 + Math.cos(ph + 0.6) * 4, jade: true }
  ];
  for (const sp of spires) {
    const topY = Math.round(baseY - sp.h);
    for (let y = topY; y <= baseY; y++) {
      const frac = clamp01((baseY - y) / Math.max(1, sp.h));
      const shiftX = Math.round(frac * 5);
      const hw = Math.max(2, Math.round(sp.w * (1 - frac * 0.58)));
      for (let dx = -hw; dx <= hw; dx++) {
        const px = sp.cx + shiftX + dx;
        let col;
        if (Math.abs(dx) === hw || y === topY) col = C_SEL_IRON;
        else if (Math.abs(dx) <= 1 && frac < 0.82) col = sp.jade ? C_JADE_BRIGHT : C_GOLD_BRIGHT;
        else if (dx > 0) col = sp.jade ? C_JADE_DEEP : C_MAGMA_ORANGE;
        else col = C_BASALT_MID;
        pen.stipple(px, y, col, 1.0);
      }
    }
  }

  for (let s = 0; s < 5; s++) {
    const sx = -26 + ((f * 4 + s * 13) % 56);
    const sy = baseY - 14 - ((f * 3 + s * 11) % 36);
    drawForgeStar(pen, sx, sy, 2, s % 2 === 0 ? C_JADE_PALE : C_GOLD_BRIGHT, 0.95);
  }
}

/** Row 1: Glowing Runic Dwarven Anvil Monolith (`TECTONIC FORGE-ANVIL RICOCHET`) */
function renderRow1RunicAnvilMonolith(pen, f) {
  const ph = (f / 30) * Math.PI * 2;
  const bob = Math.round(Math.sin(ph) * 2);

  // Emerald-Gold Foreshortened Rune Ring under the Anvil Base
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2 + ph;
    const rx = Math.cos(a) * 34;
    const ry = 26 + Math.sin(a) * 8;
    pen.stipple(rx, ry + 1, C_SEL_IRON, 0.92);
    pen.stipple(rx, ry, i % 3 === 0 ? C_JADE_BRIGHT : C_GOLD_BRIGHT, 0.96);
  }

  // Stepped Dwarven Pedestal Foot
  drawPixelBox(pen, -24, 16 + bob, 24, 26 + bob, C_IRON_DARK, C_SEL_IRON, 1.0);
  drawPixelBox(pen, -20, 18 + bob, 20, 22 + bob, C_BASALT_MID, C_IRON_DARK, 1.0);

  // Heavy Anvil Waist with Glowing Khazad Jade-Gold Rune Core
  drawPixelBox(pen, -14, 2 + bob, 14, 17 + bob, C_IRON_DARK, C_SEL_IRON, 1.0);
  drawPixelBox(pen, -7, 5 + bob, 7, 14 + bob, C_JADE_DEEP, C_GOLD_AMBER, 1.0);
  drawForgeStar(pen, 0, 9 + bob, 4, C_JADE_PALE, 1.0);

  // Broad Flat Top Striking Face + Symmetric Dwarven Horned Beaks (strictly blunt/industrial!)
  drawPixelBox(pen, -28, -12 + bob, 28, 3 + bob, C_IRON_DARK, C_SEL_IRON, 1.0);
  pen.line(-26, -10 + bob, 26, -10 + bob, C_IRON_LIT, 1.0);
  pen.line(-24, -8 + bob, 24, -8 + bob, C_GOLD_BRIGHT, 1.0);

  // Left & Right Squared-Tapered Anvil Horns
  for (const side of [-1, 1]) {
    for (let dx = 28; dx <= 38; dx++) {
      const t = (dx - 28) / 10;
      const yTop = Math.round(-11 + t * 3) + bob;
      const yBot = Math.round(1 - t * 6) + bob;
      for (let y = yTop; y <= yBot; y++) {
        const edge = y === yTop || y === yBot || dx === 38;
        pen.stipple(side * dx, y, edge ? C_SEL_IRON : y === yTop + 1 ? C_GOLD_AMBER : C_IRON_DARK, 1.0);
      }
    }
  }

  // Molten Crown Heat Sparks above Anvil Face
  for (let k = 0; k < 4; k++) {
    const sx = -18 + k * 12 + Math.round(Math.sin(ph + k) * 3);
    const sy = -18 - ((f * 2 + k * 7) % 16) + bob;
    drawForgeStar(pen, sx, sy, 2, k % 2 === 0 ? C_GOLD_BRIGHT : C_JADE_BRIGHT, 0.95);
  }
}

/** Row 2: Erupting Jade-Gold Volcanic Lava Geyser Column (Uppercut & 5 Continental Sunder Geysers) */
function renderRow2LavaGeyserColumn(pen, f) {
  const u = f / 29;
  const erupt = u < 0.14 ? smoothStep(0, 0.14, u) : 1.0;
  const fade = u > 0.72 ? 1 - (u - 0.72) / 0.28 : 1.0;
  const ph = u * Math.PI * 4;

  const baseY = 38;
  const geyserH = 78 * erupt;

  // Cracked Basalt Lip at Base
  drawPixelBox(pen, -26 * erupt, baseY - 5, 26 * erupt, baseY + 2, C_BASALT_DARK, C_SEL_IRON, fade);
  pen.line(-22 * erupt, baseY - 3, 22 * erupt, baseY - 3, C_JADE_BRIGHT, fade);

  // Roaring Multi-Band Jade-Gold Magma Geyser Column
  if (fade > 0.05 && geyserH > 4) {
    const topY = Math.max(-43, Math.round(baseY - geyserH));
    for (let y = topY; y <= baseY - 2; y++) {
      const hFrac = clamp01((baseY - y) / Math.max(1, geyserH));
      const boil = Math.sin(hFrac * 10 - ph) * 2.5 + Math.cos(hFrac * 17 + ph) * 1.4;
      const crownFlare = hFrac > 0.74 ? 1.18 - (hFrac - 0.74) * 2.6 : 1.0 - hFrac * 0.12;
      const hw = Math.max(2, (13 * erupt * Math.max(0.2, crownFlare) + boil * 0.5) * (0.65 + 0.35 * fade));
      const lim = Math.ceil(hw + 1);
      for (let x = -lim; x <= lim; x++) {
        const ax = Math.abs(x);
        if (ax > hw + 0.6) continue;
        let col;
        if (ax >= hw - 0.4) col = C_SEL_IRON;
        else if (ax >= hw * 0.72) col = (y + f) % 4 < 2 ? C_MAGMA_DEEP : C_JADE_DEEP;
        else if (ax >= hw * 0.46) col = x < 0 ? C_MAGMA_ORANGE : C_JADE_BRIGHT;
        else if (ax >= hw * 0.22) col = C_GOLD_BRIGHT;
        else col = C_WHITE;
        pen.stipple(x, y, col, fade);
      }
    }
  }

  // Erupting Lava Slag Droplets
  for (let k = 0; k < 6; k++) {
    const side = k % 2 === 0 ? -1 : 1;
    const arcU = ((u * 1.4 + k * 0.15) % 1);
    const sx = side * (8 + arcU * 24);
    const sy = baseY - geyserH * 0.75 + (arcU * arcU - arcU * 0.6) * 44;
    if (Math.abs(sx) < 42 && sy > -42 && sy < 40) {
      drawPixelBox(pen, sx - 2, sy - 2, sx + 2, sy + 2, k % 2 === 0 ? C_GOLD_BRIGHT : C_JADE_BRIGHT, C_SEL_IRON, fade);
    }
  }
}

/** Row 3: Ignited 8-Cog Crucible Back-Halo & Dwarven Forge-Wheel (`RAGNAROK GRAND-SLAM CRUSHER`) */
function renderRow3CrucibleBackHalo(pen, f) {
  const ph = (f / 30) * Math.PI * 2;
  const R = 33;
  const innerR = 23;

  // 8 Squared-Off Dwarven Gear Teeth rotating cleanly via integer rasterization
  for (let k = 0; k < 8; k++) {
    const a = ph + (k * Math.PI) / 4;
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    const nx = -uy;
    const ny = ux;
    for (let d = R - 2; d <= R + 7; d += 0.6) {
      for (let q = -4; q <= 4; q += 0.6) {
        const px = ux * d + nx * q;
        const py = uy * d + ny * q;
        const edge = d >= R + 6 || Math.abs(q) >= 3.4;
        pen.stipple(px, py, edge ? C_SEL_IRON : k % 2 === 0 ? C_GOLD_AMBER : C_JADE_BRIGHT, 1.0);
      }
    }
  }

  // Heavy Iron-Gold Crucible Ring + 4 Crossed Maul Spokes
  for (let y = -R - 2; y <= R + 2; y++) {
    for (let x = -R - 2; x <= R + 2; x++) {
      const r = Math.hypot(x, y);
      if (r >= innerR - 1 && r <= R + 1) {
        if (r <= innerR + 0.4 || r >= R - 0.4) pen.stipple(x, y, C_SEL_IRON, 1.0);
        else if (Math.abs(r - (innerR + R) * 0.5) <= 1.2) pen.stipple(x, y, C_GOLD_BRIGHT, 1.0);
        else pen.stipple(x, y, r > (innerR + R) * 0.5 ? C_MAGMA_ORANGE : C_JADE_DEEP, 1.0);
      }
    }
  }

  for (let s = 0; s < 4; s++) {
    const a = -ph * 0.5 + (s * Math.PI) / 2;
    const x1 = Math.cos(a) * innerR;
    const y1 = Math.sin(a) * innerR;
    pen.line(-x1, -y1, x1, y1, C_GOLD_AMBER, 0.95);
    drawForgeStar(pen, Math.cos(a) * ((innerR + R) * 0.5), Math.sin(a) * ((innerR + R) * 0.5), 2, C_WHITE, 1.0);
  }
  drawPixelBox(pen, -6, -6, 6, 6, C_GOLD_BRIGHT, C_SEL_IRON, 1.0);
  drawForgeStar(pen, 0, 0, 4, C_JADE_PALE, 1.0);
}

/** Row 4: Blunt Octagonal Maul Concussion Shock-Ring & Molten Slag Burst (0 sword crescents!) */
function renderRow4BluntMaulConcussion(pen, f) {
  const u = f / 29;
  const expand = smoothStep(0, 0.45, u);
  const fade = clamp01(1.18 - u * 1.25);
  if (fade <= 0.04) return;

  const R = 10 + 28 * expand;
  const verts = [];
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4 + Math.PI / 8;
    verts.push([Math.cos(a) * R, Math.sin(a) * R]);
  }
  for (let k = 0; k < 8; k++) {
    const [x0, y0] = verts[k];
    const [x1, y1] = verts[(k + 1) % 8];
    pen.line(x0 * 1.06, y0 * 1.06, x1 * 1.06, y1 * 1.06, C_SEL_IRON, fade * 0.95);
    pen.line(x0, y0, x1, y1, k % 2 === 0 ? C_GOLD_BRIGHT : C_JADE_BRIGHT, fade);
    pen.line(x0 * 0.88, y0 * 0.88, x1 * 0.88, y1 * 0.88, C_WHITE, fade * 0.9);
  }

  // Central Blunt Squared Anvil Concussion Stamp
  const plateW = Math.max(3, Math.round(14 * (1 - u * 0.65)));
  const plateH = Math.max(2, Math.round(8 * (1 - u * 0.65)));
  drawPixelBox(pen, -plateW, -plateH, plateW, plateH, C_GOLD_BRIGHT, C_SEL_IRON, fade);
  drawPixelBox(pen, -Math.max(1, plateW - 4), -Math.max(1, plateH - 3), Math.max(1, plateW - 4), Math.max(1, plateH - 3), C_WHITE, C_GOLD_AMBER, fade);

  // Outward flying squared molten slag chunks
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    const dist = 8 + u * 31;
    const sx = Math.cos(a) * dist;
    const sy = Math.sin(a) * dist;
    if (Math.abs(sx) < 42 && Math.abs(sy) < 42) {
      drawPixelBox(pen, sx - 2, sy - 2, sx + 2, sy + 2, k % 2 === 0 ? C_MAGMA_ORANGE : C_JADE_BRIGHT, C_SEL_IRON, fade);
    }
  }
}

/** Row 5: Colossal World-Forge Genesis Anvil Floor Seal */
function renderRow5GenesisAnvilSeal(pen, f) {
  const ph = (f / 30) * Math.PI * 2;
  const rx = 40;
  const ry = 15;

  // Foreshortened Octagonal Dwarven Seal
  const pts = [];
  for (let k = 0; k < 8; k++) {
    const a = ph * 0.4 + (k * Math.PI) / 4;
    pts.push([Math.cos(a) * rx, 12 + Math.sin(a) * ry]);
  }
  for (let k = 0; k < 8; k++) {
    const [x0, y0] = pts[k];
    const [x1, y1] = pts[(k + 1) % 8];
    pen.line(x0, y0 + 1, x1, y1 + 1, C_SEL_IRON, 0.95);
    pen.line(x0, y0, x1, y1, k % 2 === 0 ? C_GOLD_BRIGHT : C_JADE_BRIGHT, 1.0);
    // 8 Molten Spokes into center
    pen.line(x0 * 0.85, 12 + (y0 - 12) * 0.85, 0, 12, C_MAGMA_ORANGE, 0.85);
    // 4 Corner Runic Obelisk Pips
    if (k % 2 === 0) {
      drawPixelBox(pen, x0 - 2, y0 - 12, x0 + 2, y0, C_JADE_BRIGHT, C_SEL_IRON, 0.96);
    }
  }
  drawPixelBox(pen, -12, 6, 12, 18, C_GOLD_AMBER, C_SEL_IRON, 1.0);
  drawForgeStar(pen, 0, 12, 5, C_JADE_PALE, 1.0);
}

/** Row 6: Stepped Mjolnir Pixel Lightning & Blunt Hammerhead Stamp */
function renderRow6MjolnirLightning(pen, f) {
  const u = f / 29;
  const fade = u > 0.72 ? 1 - (u - 0.72) / 0.28 : 1.0;
  const rng = new DeterministicRng(601 + f * 29);
  if (fade <= 0.04) return;

  // Twin Jagged Stepped Mjolnir Sky-Lightning Chains
  const mainBolt = buildLightningChain(rng, 0, -42, 0, 34, 0.22, 4);
  const jadeBolt = buildLightningChain(rng, -6, -40, 4, 34, 0.25, 4);

  for (const [dx, dy] of [[-1, 0], [1, 0], [0, 1]]) {
    const shifted = mainBolt.map(([px, py]) => [px + dx, py + dy]);
    pen.polyline(shifted, C_SEL_IRON, fade * 0.95);
  }
  pen.polyline(jadeBolt, C_JADE_BRIGHT, fade * 0.95);
  pen.polyline(mainBolt, C_GOLD_BRIGHT, fade);
  pen.polyline(mainBolt.map(([px, py]) => [px * 0.6, py]), C_WHITE, fade);

  // Blunt Mjolnir Hammerhead Impact Block at Base
  const slamY = Math.min(28, -24 + Math.round(smoothStep(0, 0.22, u) * 52));
  drawPixelBox(pen, -18, slamY - 8, 18, slamY + 6, C_IRON_DARK, C_SEL_IRON, fade);
  drawPixelBox(pen, -14, slamY - 5, 14, slamY + 3, C_GOLD_AMBER, C_JADE_BRIGHT, fade);
  drawForgeStar(pen, 0, slamY - 1, 5, C_WHITE, fade);
}

/** Row 7: Multi-Layered 2.5D Pixel Magma Crater & Upheaved Basalt Bedrock Slabs */
function renderRow7MagmaCrater(pen, f) {
  const u = f / 29;
  const erupt = u < 0.12 ? smoothStep(0, 0.12, u) : 1.0;
  const fade = u > 0.78 ? 1 - (u - 0.78) / 0.22 : 1.0;
  const boil = Math.sin(u * Math.PI * 6);

  const cy = 22;
  const rx = 40 * erupt;
  const ry = 12 * erupt;

  // Glowing 2.5D Molten Caldera Pool
  for (let dy = -Math.ceil(ry) - 2; dy <= Math.ceil(ry) + 2; dy++) {
    const ny = dy / Math.max(1, ry);
    if (Math.abs(ny) > 1.15) continue;
    const span = Math.round(rx * Math.sqrt(Math.max(0, 1.15 - ny * ny)));
    for (let dx = -span; dx <= span; dx++) {
      const rNorm = Math.hypot(dx / Math.max(1, rx), ny);
      let col;
      if (rNorm >= 1.02) col = C_SEL_IRON;
      else if (rNorm >= 0.82) col = C_BASALT_DARK;
      else if (rNorm >= 0.58) col = (dx + dy + f) % 3 === 0 ? C_JADE_BRIGHT : C_MAGMA_DEEP;
      else if (rNorm >= 0.30) col = C_MAGMA_ORANGE;
      else col = boil > 0 && Math.abs(dx) < 6 ? C_WHITE : C_GOLD_BRIGHT;
      pen.stipple(dx, cy + dy, col, fade);
    }
  }

  // Jagged Upheaved Basalt Bedrock Slabs around Crater Rim
  const slabs = [
    { x: -32, w: 6, h: 16 },
    { x: -18, w: 5, h: 22 },
    { x: 18, w: 5, h: 22 },
    { x: 32, w: 6, h: 16 }
  ];
  for (const sl of slabs) {
    const sh = Math.round(sl.h * erupt);
    drawPixelBox(pen, sl.x - sl.w, cy - sh, sl.x + sl.w, cy + 2, C_BASALT_MID, C_SEL_IRON, fade);
    pen.line(sl.x - sl.w + 1, cy - sh + 1, sl.x + sl.w - 1, cy - sh + 1, C_GOLD_BRIGHT, fade);
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
    dbgRgba[i * 4] = 18;
    dbgRgba[i * 4 + 1] = 12;
    dbgRgba[i * 4 + 2] = 10;
    dbgRgba[i * 4 + 3] = 255;
  }

  const surface104 = createPixelSurface(LOGICAL, LOGICAL);
  const pen104 = new ShaderPen(surface104);
  const cell104 = new Uint8Array(LOGICAL * LOGICAL * 4);
  const cell208 = new Uint8Array(CELL * CELL * 4);

  const rowFns = [
    renderRow0TectonicFissureWave,
    renderRow1RunicAnvilMonolith,
    renderRow2LavaGeyserColumn,
    renderRow3CrucibleBackHalo,
    renderRow4BluntMaulConcussion,
    renderRow5GenesisAnvilSeal,
    renderRow6MjolnirLightning,
    renderRow7MagmaCrater
  ];

  let borderClips = 0;

  for (let r = 0; r < ROWS; r++) {
    const fn = rowFns[r];
    for (let c = 0; c < COLS; c++) {
      clearPixelSurface(surface104);
      pen104.configure(52, 52, false, 0, 1, 1);
      fn(pen104, c);
      resolveSurfaceToRGBA(surface104, cell104, 1.0);
      enforceStrictCellMargin104(cell104, LOGICAL, LOGICAL);

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
