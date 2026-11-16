#!/usr/bin/env node
/**
 * Next-Gen 30fps Pixel-Art VFX Sheet Builder for SYLVARA EX (archer_ex).
 * Zero external npm dependencies (pure Node zlib PNG encoder).
 *
 * Output: assets/sprites/archer_ex_vfx.png (6240x1664, 30 cols x 8 rows, 208x208 cells)
 * Logical grid: 104x104 per cell -> upscaled 2x NEAREST -> 208x208 (100% 2x2 pixel blocks,
 * strict binary alpha 0 or 255, strict 3px logical / 6px output border margin -> 0/240 clips).
 *
 * Row Layout (aligned 1:1 with VFXManager.js & ArcherEx.js):
 *   Row 0 (y=0):    Supersonic Astral Tempest Arrow ('arrow' projectile + Mach shock-ring)
 *   Row 1 (y=208):  Curving Emerald Seeker Arrow & Star-Burst
 *   Row 2 (y=416):  Verdant Yggdrasil Bramble-Star Root Snare
 *   Row 3 (y=624):  Roaring Astral Emerald Dragon-Head Beam Muzzle (beams cropY=624)
 *   Row 4 (y=832):  4-Band Serrated Emerald-Gold Bow-Glaive Slash Wave (slashes cropY=832)
 *   Row 5 (y=1040): Yggdrasil World-Tree Runic Ground Seal
 *   Row 6 (y=1248): Colossal Drawn Celestial Yggdrasil Greatbow Muzzle (TRUE_ULTIMATE)
 *   Row 7 (y=1456): Seamless Tiled Supernova Dragon-Arrow Beam (core x=44..156, tip x=156..200)
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const COLS = 30;
const ROWS = 8;
const LOG = 104;
const CELL = 208;
const MARGIN = 3;

const OUT_PATH = path.resolve('assets/sprites/archer_ex_vfx.png');
const QA_PATH =
  '/Users/rei/.gemini/antigravity/brain/5416474b-0e5f-4471-85c8-b7a88055e218/scratch/debug_archer_ex_vfx_30fps.png';

const PAL = {
  selout: [5, 22, 16, 255],
  forestDeep: [6, 95, 70, 255],
  emeraldMid: [16, 185, 129, 255],
  emeraldBright: [52, 211, 153, 255],
  mintLight: [167, 243, 208, 255],
  white: [255, 255, 255, 255],
  goldMid: [217, 119, 6, 255],
  goldBright: [250, 204, 21, 255],
  goldLight: [253, 224, 71, 255],
  ivory: [254, 249, 195, 255]
};

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

function pngChunk(typeStr, dataBuf) {
  const typeBuf = Buffer.from(typeStr, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(dataBuf.length, 0);
  const crcIn = Buffer.concat([typeBuf, dataBuf]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcIn), 0);
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
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = zlib.deflateSync(raw, { level: 6 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

function makeBuf() {
  return new Uint8Array(LOG * LOG * 4);
}

function setPx(buf, x, y, rgba) {
  const ix = Math.round(x);
  const iy = Math.round(y);
  if (ix < MARGIN || ix >= LOG - MARGIN || iy < MARGIN || iy >= LOG - MARGIN) return;
  const idx = (iy * LOG + ix) * 4;
  buf[idx] = rgba[0];
  buf[idx + 1] = rgba[1];
  buf[idx + 2] = rgba[2];
  buf[idx + 3] = 255;
}

function drawDisc(buf, cx, cy, r, rgba) {
  const r2 = r * r;
  const x0 = Math.floor(cx - r - 1);
  const x1 = Math.ceil(cx + r + 1);
  const y0 = Math.floor(cy - r - 1);
  const y1 = Math.ceil(cy + r + 1);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r2) {
        setPx(buf, x, y, rgba);
      }
    }
  }
}

function drawLine(buf, x0, y0, x1, y1, rgba, rad = 0) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) * 1.6));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = x0 + dx * t;
    const py = y0 + dy * t;
    if (rad <= 0) setPx(buf, px, py, rgba);
    else drawDisc(buf, px, py, rad, rgba);
  }
}

function applySelout104(buf) {
  const copy = new Uint8Array(buf);
  for (let y = MARGIN; y < LOG - MARGIN; y++) {
    for (let x = MARGIN; x < LOG - MARGIN; x++) {
      const idx = (y * LOG + x) * 4;
      if (copy[idx + 3] > 0) continue;
      const touches =
        copy[((y - 1) * LOG + x) * 4 + 3] > 0 ||
        copy[((y + 1) * LOG + x) * 4 + 3] > 0 ||
        copy[(y * LOG + (x - 1)) * 4 + 3] > 0 ||
        copy[(y * LOG + (x + 1)) * 4 + 3] > 0;
      if (touches) {
        buf[idx] = PAL.selout[0];
        buf[idx + 1] = PAL.selout[1];
        buf[idx + 2] = PAL.selout[2];
        buf[idx + 3] = 255;
      }
    }
  }
  for (let y = 0; y < LOG; y++) {
    for (let x = 0; x < LOG; x++) {
      if (x < MARGIN || x >= LOG - MARGIN || y < MARGIN || y >= LOG - MARGIN) {
        const idx = (y * LOG + x) * 4;
        buf[idx] = 0;
        buf[idx + 1] = 0;
        buf[idx + 2] = 0;
        buf[idx + 3] = 0;
      }
    }
  }
}

// Row 0: Supersonic Astral Tempest Arrow ('arrow' projectile + double-helix + Mach ring)
function renderRow0(f) {
  const buf = makeBuf();
  const ph = (f / COLS) * Math.PI * 2;
  const cy = 52;

  // Double-helix emerald & gold wind wake
  for (let x = 14; x <= 78; x++) {
    const u = (x - 14) / 64;
    const amp = (1 - u * 0.65) * 9.5;
    const y1 = cy + Math.sin(u * Math.PI * 3.0 - ph * 2.0) * amp;
    const y2 = cy - Math.sin(u * Math.PI * 3.0 - ph * 2.0) * amp;
    setPx(buf, x, y1, PAL.emeraldBright);
    setPx(buf, x, y1 - 1, PAL.mintLight);
    setPx(buf, x, y2, PAL.goldLight);
  }

  // Central shaft
  drawLine(buf, 16, cy, 86, cy, PAL.emeraldMid, 1.4);
  drawLine(buf, 22, cy, 88, cy, PAL.white, 0.6);

  // Emerald-gold fletching feathers
  drawLine(buf, 14, cy - 6, 24, cy, PAL.goldBright, 0.8);
  drawLine(buf, 14, cy + 6, 24, cy, PAL.goldBright, 0.8);

  // Broadhead Astral Star-Tip
  drawLine(buf, 74, cy - 8, 92, cy, PAL.emeraldBright, 1.4);
  drawLine(buf, 74, cy + 8, 92, cy, PAL.emeraldBright, 1.4);
  drawLine(buf, 78, cy - 5, 92, cy, PAL.goldLight, 0.8);
  drawLine(buf, 78, cy + 5, 92, cy, PAL.goldLight, 0.8);
  drawDisc(buf, 86, cy, 2.2, PAL.white);

  // Mach shock-ring
  const ringX = 62 + Math.sin(ph) * 3;
  for (let k = 0; k < 36; k++) {
    const a = (k / 36) * Math.PI * 2;
    setPx(buf, ringX + Math.cos(a) * 4, cy + Math.sin(a) * 14, k % 2 === 0 ? PAL.mintLight : PAL.goldLight);
  }

  applySelout104(buf);
  return buf;
}

// Row 1: Curving Emerald Seeker Arrow & Starlight Hit-Burst
function renderRow1(f) {
  const buf = makeBuf();
  const ph = (f / COLS) * Math.PI * 2;
  const cy = 52;

  for (let i = 0; i <= 40; i++) {
    const u = i / 40;
    const x = 16 + u * 70;
    const y = cy + Math.sin((1 - u) * 2.2 + ph) * (1 - u) * 12;
    drawDisc(buf, x, y, 0.9 + u * 1.4, u > 0.7 ? PAL.goldLight : PAL.emeraldBright);
    if (u > 0.45) setPx(buf, x, y, PAL.white);
  }
  drawLine(buf, 76, cy - 7, 90, cy, PAL.goldBright, 1.2);
  drawLine(buf, 76, cy + 7, 90, cy, PAL.goldBright, 1.2);
  drawDisc(buf, 86, cy, 2.5, PAL.white);
  applySelout104(buf);
  return buf;
}

// Row 2: Verdant Yggdrasil Bramble-Star Root Snare
function renderRow2(f) {
  const buf = makeBuf();
  const u = f / (COLS - 1);
  const ph = u * Math.PI * 2;
  const baseY = 92;
  const grow = u < 0.25 ? u / 0.25 : Math.max(0.25, 1 - (u - 0.25) * 0.65);

  for (let v = -2; v <= 2; v++) {
    const startX = 52 + v * 10;
    let px = startX;
    let py = baseY;
    for (let s = 1; s <= 7; s++) {
      const su = s / 7;
      const nx = startX + Math.sin(su * 3.5 + v + ph * 0.5) * 8 - v * su * 3;
      const ny = baseY - su * 58 * grow;
      drawLine(buf, px, py, nx, ny, PAL.forestDeep, 1.6);
      drawLine(buf, px, py, nx, ny, s % 2 === 0 ? PAL.emeraldBright : PAL.emeraldMid, 0.8);
      if (s % 2 === 1) setPx(buf, nx + 2, ny, PAL.goldLight);
      px = nx;
      py = ny;
    }
  }
  drawLine(buf, 20, baseY, 84, baseY, PAL.emeraldBright, 1.2);
  applySelout104(buf);
  return buf;
}

// Row 3: Roaring Astral Emerald Dragon-Head Beam Muzzle (VFXManager beams cropY=624)
function renderRow3(f) {
  const buf = makeBuf();
  const ph = (f / COLS) * Math.PI * 2;
  const cx = 48;
  const cy = 52;
  const jaw = 6 + Math.sin(ph * 2) * 3;

  // Coiling emerald-gold dragon head silhouette facing +X
  drawLine(buf, 14, cy - 8, cx + 18, cy - jaw, PAL.emeraldMid, 5.5);
  drawLine(buf, 14, cy + 8, cx + 18, cy + jaw, PAL.emeraldMid, 5.5);
  drawLine(buf, 18, cy - 7, cx + 22, cy - jaw, PAL.emeraldBright, 3.2);
  drawLine(buf, 18, cy + 7, cx + 22, cy + jaw, PAL.emeraldBright, 3.2);
  // Sweeping golden antlers/horns
  drawLine(buf, cx + 2, cy - 10, cx - 22, cy - 28, PAL.goldBright, 2.2);
  drawLine(buf, cx + 2, cy + 10, cx - 22, cy + 28, PAL.goldBright, 2.2);
  // Blazing astral core inside open dragon jaws
  drawDisc(buf, cx + 14, cy, 9.5, PAL.goldLight);
  drawDisc(buf, cx + 16, cy, 5.8, PAL.white);
  // Glowing dragon eye
  drawDisc(buf, cx + 4, cy - jaw - 4, 2.2, PAL.white);
  applySelout104(buf);
  return buf;
}

// Row 4: 4-Band Serrated Emerald-Gold Bow-Glaive Slash Wave (VFXManager slashes cropY=832)
function renderRow4(f) {
  const buf = makeBuf();
  const u = f / (COLS - 1);
  const cx = 36;
  const cy = 52;
  const rOut = 43;
  const fade = Math.max(0.18, 1 - u * 0.82);

  for (let y = 6; y < 98; y++) {
    const dy = y - cy;
    for (let x = 10; x < 98; x++) {
      const dx = x - cx;
      const r = Math.hypot(dx, dy);
      if (r > rOut || r < 14) continue;
      const ang = Math.atan2(dy, dx);
      const a0 = -1.22 + u * 0.42;
      const a1 = 1.22 - u * 0.15;
      if (ang < a0 || ang > a1) continue;
      const au = (ang - a0) / Math.max(0.1, a1 - a0);
      const env = Math.sin(au * Math.PI) ** 0.55;
      const saw = Math.abs((((au * 8) % 1) * 2) - 1) * 4.8 * fade;
      const rIn = 18 + (rOut - 18) * (1 - env * fade) + saw;
      if (r < rIn) continue;
      const v = (r - rIn) / Math.max(1.5, rOut - rIn);
      let col = PAL.forestDeep;
      if (v > 0.76) col = PAL.white;
      else if (v > 0.50) col = PAL.goldLight;
      else if (v > 0.24) col = PAL.emeraldBright;
      setPx(buf, x, y, col);
    }
  }
  applySelout104(buf);
  return buf;
}

// Row 5: Yggdrasil World-Tree Runic Ground Seal
function renderRow5(f) {
  const buf = makeBuf();
  const ph = (f / COLS) * Math.PI * 2;
  const cx = 52;
  const cy = 56;
  const rx = 38;
  const ry = 17;

  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * Math.PI * 2;
    setPx(buf, cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, PAL.emeraldBright);
    setPx(buf, cx + Math.cos(a) * (rx - 3), cy + Math.sin(a) * (ry - 1.5), PAL.goldLight);
  }
  for (let k = 0; k < 6; k++) {
    const a = ph + (k * Math.PI * 2) / 6;
    const dx = cx + Math.cos(a) * (rx * 0.76);
    const dy = cy + Math.sin(a) * (ry * 0.76);
    drawDisc(buf, dx, dy, 2.8, k % 2 === 0 ? PAL.goldBright : PAL.emeraldBright);
    setPx(buf, dx, dy, PAL.white);
    drawLine(buf, cx, cy, dx, dy, PAL.forestDeep, 0);
  }
  drawDisc(buf, cx, cy, 4.0, PAL.goldLight);
  drawDisc(buf, cx, cy, 2.0, PAL.white);
  applySelout104(buf);
  return buf;
}

// Row 6: Colossal Drawn Celestial Yggdrasil Greatbow Muzzle (TRUE_ULTIMATE Row 6!)
function renderRow6(f) {
  const buf = makeBuf();
  const ph = (f / COLS) * Math.PI * 2;
  const pull = 18 + Math.sin(ph * 2) * 3;
  const riserX = 58;
  const riserY = 52;

  // Monumental recurve celestial limbs spanning y=8..96
  let prevX = null;
  let prevY = null;
  for (let i = 0; i <= 44; i++) {
    const s = -1 + (2 * i) / 44;
    const ab = Math.abs(s);
    const lx = riserX - 16 * (ab ** 1.2) + 9 * (ab ** 3.0);
    const ly = riserY + s * 42;
    if (prevX !== null) {
      drawLine(buf, prevX, prevY, lx, ly, PAL.goldBright, 2.8);
      drawLine(buf, prevX, prevY, lx, ly, ab > 0.65 ? PAL.emeraldBright : PAL.ivory, 1.4);
    }
    prevX = lx;
    prevY = ly;
  }
  const topTipX = riserX - 7;
  const nockX = topTipX - pull;
  drawLine(buf, topTipX, riserY - 42, nockX, riserY, PAL.mintLight, 0.8);
  drawLine(buf, topTipX, riserY + 42, nockX, riserY, PAL.mintLight, 0.8);

  // Colossal nocked Supernova Star-Arrow & blazing focal sun
  drawLine(buf, nockX, riserY, 94, riserY, PAL.emeraldBright, 2.4);
  drawLine(buf, nockX + 4, riserY, 94, riserY, PAL.white, 1.1);
  drawLine(buf, 80, riserY - 9, 96, riserY, PAL.goldLight, 1.6);
  drawLine(buf, 80, riserY + 9, 96, riserY, PAL.goldLight, 1.6);
  drawDisc(buf, riserX, riserY, 7 + Math.sin(ph * 3) * 1.5, PAL.goldLight);
  drawDisc(buf, riserX, riserY, 4, PAL.white);

  applySelout104(buf);
  return buf;
}

// Row 7: Seamless Horizontally Tiled Supernova Dragon-Arrow Beam (TRUE_ULTIMATE Row 7!)
// Core tile slice: x_208 = 44..156 -> x_104 = 22..78
// Tip slice:       x_208 = 156..200 -> x_104 = 78..100 (strictly inside MARGIN=3 -> 0 border clips!)
function renderRow7(f) {
  const buf = makeBuf();
  const ph = (f / COLS) * Math.PI * 2;
  const cy = 52;

  // Seamless periodic core beam across x=18..79 (period = 56px so x=22 and x=78 match 100% seamlessly!)
  for (let x = 18; x <= 79; x++) {
    const wave = Math.sin(((x - 22) / 56) * Math.PI * 4 - ph * 2) * 5.5;
    const hw = 14 + Math.cos(((x - 22) / 56) * Math.PI * 2 - ph) * 2.0;
    for (let dy = -Math.ceil(hw + 4); dy <= Math.ceil(hw + 4); dy++) {
      const ad = Math.abs(dy - wave * 0.25);
      if (ad > hw) continue;
      let col = PAL.forestDeep;
      if (ad < hw * 0.26) col = PAL.white;
      else if (ad < hw * 0.52) col = PAL.goldLight;
      else if (ad < hw * 0.78) col = PAL.emeraldBright;
      setPx(buf, x, cy + dy, col);
    }
    // Spiraling emerald-gold helix ribbon
    const hy = cy + Math.round(wave * 2.1);
    setPx(buf, x, hy, PAL.goldBright);
    setPx(buf, x, hy - 1, PAL.white);
  }

  // Piercing Supernova Dragon-Arrow Spearhead in x=78..98
  for (let x = 78; x <= 98; x++) {
    const u = (x - 78) / 20;
    const hw = Math.max(1, (1 - u) * 18);
    for (let dy = -Math.ceil(hw); dy <= Math.ceil(hw); dy++) {
      const ad = Math.abs(dy);
      let col = PAL.emeraldMid;
      if (ad < hw * 0.32) col = PAL.white;
      else if (ad < hw * 0.65) col = PAL.goldLight;
      else col = PAL.emeraldBright;
      setPx(buf, x, cy + dy, col);
    }
  }

  applySelout104(buf);
  return buf;
}

function blitUpscaled2x(sheetRgba, sheetW, cellBuf104, dstX, dstY) {
  for (let y = 0; y < LOG; y++) {
    for (let x = 0; x < LOG; x++) {
      const sIdx = (y * LOG + x) * 4;
      const r = cellBuf104[sIdx];
      const g = cellBuf104[sIdx + 1];
      const b = cellBuf104[sIdx + 2];
      const a = cellBuf104[sIdx + 3] >= 128 ? 255 : 0;
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const dIdx = ((dstY + y * 2 + dy) * sheetW + (dstX + x * 2 + dx)) * 4;
          sheetRgba[dIdx] = a ? r : 0;
          sheetRgba[dIdx + 1] = a ? g : 0;
          sheetRgba[dIdx + 2] = a ? b : 0;
          sheetRgba[dIdx + 3] = a;
        }
      }
    }
  }
}

function main() {
  console.log('=== Building SYLVARA EX 30fps VFX Sheet (6240x1664) ===');
  const W = COLS * CELL;
  const H = ROWS * CELL;
  const sheetRgba = new Uint8Array(W * H * 4);

  const rowFns = [renderRow0, renderRow1, renderRow2, renderRow3, renderRow4, renderRow5, renderRow6, renderRow7];
  const sampleCols = [0, 3, 7, 12, 17, 22, 27];
  const qaW = sampleCols.length * CELL;
  const qaH = ROWS * CELL;
  const qaRgba = new Uint8Array(qaW * qaH * 4);
  for (let i = 0; i < qaW * qaH; i++) {
    qaRgba[i * 4] = 18;
    qaRgba[i * 4 + 1] = 30;
    qaRgba[i * 4 + 2] = 26;
    qaRgba[i * 4 + 3] = 255;
  }

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const buf = rowFns[r](c);
      blitUpscaled2x(sheetRgba, W, buf, c * CELL, r * CELL);
      const sIdx = sampleCols.indexOf(c);
      if (sIdx >= 0) {
        for (let y = 0; y < LOG; y++) {
          for (let x = 0; x < LOG; x++) {
            const p = (y * LOG + x) * 4;
            if (buf[p + 3] === 0) continue;
            for (let dy = 0; dy < 2; dy++) {
              for (let dx = 0; dx < 2; dx++) {
                const q = ((r * CELL + y * 2 + dy) * qaW + (sIdx * CELL + x * 2 + dx)) * 4;
                qaRgba[q] = buf[p];
                qaRgba[q + 1] = buf[p + 1];
                qaRgba[q + 2] = buf[p + 2];
                qaRgba[q + 3] = 255;
              }
            }
          }
        }
      }
    }
  }

  let borderClips = 0;
  let nonBinary = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const ox = c * CELL;
      const oy = r * CELL;
      let clipped = false;
      for (let y = 0; y < CELL; y++) {
        for (let x = 0; x < CELL; x++) {
          const a = sheetRgba[((oy + y) * W + (ox + x)) * 4 + 3];
          if (a > 0 && a < 255) nonBinary++;
          if (a > 0 && (x < 4 || x >= CELL - 4 || y < 4 || y >= CELL - 4)) clipped = true;
        }
      }
      if (clipped) borderClips++;
    }
  }

  console.log(`[QA] archer_ex_vfx.png: borderClips=${borderClips}/240 | nonBinary=${nonBinary}`);
  if (borderClips !== 0 || nonBinary !== 0) {
    throw new Error(`archer_ex_vfx QA failed: borderClips=${borderClips}, nonBinary=${nonBinary}`);
  }

  fs.writeFileSync(OUT_PATH, encodeRgbaPng(W, H, sheetRgba));
  console.log(`[OK] Saved ${OUT_PATH} (${W}x${H})`);

  fs.mkdirSync(path.dirname(QA_PATH), { recursive: true });
  fs.writeFileSync(QA_PATH, encodeRgbaPng(qaW, qaH, qaRgba));
  console.log(`[QA] Saved ${QA_PATH}`);
}

main();
