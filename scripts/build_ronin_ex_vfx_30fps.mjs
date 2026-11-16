#!/usr/bin/env node
/**
 * Next-Gen 30fps Pixel-Art VFX Sheet Builder for KAZE-MARU EX (ronin_ex).
 * Zero external npm dependencies (pure Node zlib PNG encoder, matching build_warrior_ex_vfx_30fps.mjs).
 *
 * Output: assets/sprites/ronin_ex_vfx.png (6240x1664, 30 cols x 8 rows, 208x208 cells)
 * Logical grid: 104x104 per cell -> upscaled 2x NEAREST -> 208x208 (100% 2x2 pixel blocks,
 * strict binary alpha 0 or 255, strict 3px logical / 6px output border margin -> 0/240 clips).
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const COLS = 30;
const ROWS = 8;
const LOG = 104;
const CELL = 208;
const MARGIN = 3; // 6px transparent margin in 208x208 -> 0/240 border clips!

const OUT_PATH = path.resolve('assets/sprites/ronin_ex_vfx.png');
const QA_PATH =
  '/Users/rei/.gemini/antigravity/brain/5416474b-0e5f-4471-85c8-b7a88055e218/scratch/debug_ronin_ex_vfx_30fps.png';

const PAL = {
  selout: [9, 8, 26, 255],
  indigoDeep: [30, 27, 75, 255],
  indigoMid: [67, 56, 202, 255],
  indigoBright: [99, 102, 241, 255],
  violetRim: [129, 140, 248, 255],
  cyanDeep: [2, 132, 199, 255],
  cyanBright: [56, 189, 248, 255],
  cyanIce: [186, 230, 253, 255],
  white: [255, 255, 255, 255],
  goldMid: [245, 158, 11, 255],
  goldBright: [250, 204, 21, 255],
  goldLight: [253, 224, 71, 255],
  sakuraPink: [244, 114, 182, 255],
  sakuraPale: [251, 207, 232, 255]
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

function drawLightningZig(buf, x0, y0, x1, y1, jagAmp, segs, colMain, colCore, seed = 0) {
  let px = x0;
  let py = y0;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  for (let s = 1; s <= segs; s++) {
    const u = s / segs;
    const zig = s === segs ? 0 : Math.sin(s * 2.7 + seed) * jagAmp;
    const qx = x0 + dx * u + nx * zig;
    const qy = y0 + dy * u + ny * zig;
    drawLine(buf, px, py, qx, qy, PAL.selout, 1.4);
    drawLine(buf, px, py, qx, qy, colMain, 0.8);
    drawLine(buf, px, py, qx, qy, colCore, 0);
    px = qx;
    py = qy;
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

// Row 0: Piercing 'ronin_slash' Raijin Crescent Vacuum Wave
function renderRow0(f) {
  const buf = makeBuf();
  const ph = (f / COLS) * Math.PI * 2;
  const cx = 36;
  const cy = 52;
  const rOut = 41;
  const rInBase = 21;

  for (let y = 8; y < 96; y++) {
    const dy = (y - cy) * 0.92;
    for (let x = 14; x < 96; x++) {
      const dx = x - cx;
      const r = Math.hypot(dx, dy);
      if (r > rOut || r < 12) continue;
      const ang = Math.atan2(dy, dx);
      if (Math.abs(ang) > 1.18) continue;
      const u = (ang + 1.18) / 2.36;
      const env = Math.sin(u * Math.PI) ** 0.55;
      const saw = Math.abs((((u * 9 + f * 0.25) % 1) * 2) - 1) * 4.5;
      const rIn = rInBase + (rOut - rInBase) * (1 - env) + saw;
      if (r < rIn) continue;
      const v = (r - rIn) / Math.max(1.5, rOut - rIn);
      let col = PAL.indigoDeep;
      if (v > 0.78) col = PAL.white;
      else if (v > 0.50) col = PAL.cyanBright;
      else if (v > 0.24) col = PAL.indigoBright;
      else if (saw > 2.4) col = PAL.goldLight;
      setPx(buf, x, y, col);
    }
  }
  for (let k = -2; k <= 2; k++) {
    const wy = cy + k * 11 + Math.sin(ph + k) * 2;
    const len = 18 + ((f + k * 7 + 30) % 5) * 3;
    drawLightningZig(
      buf,
      52 - Math.abs(k) * 3,
      wy,
      52 - Math.abs(k) * 3 - len,
      wy,
      2.6,
      4,
      PAL.cyanBright,
      PAL.goldLight,
      ph + k
    );
  }
  applySelout104(buf);
  return buf;
}

// Row 1: Zantetsuken X-Cross Lightning Scar Detonation
function renderRow1(f) {
  const buf = makeBuf();
  const u = f / (COLS - 1);
  const reach = u < 0.25 ? 16 + (u / 0.25) * 28 : 44 * (1 - (u - 0.25) * 0.55);
  const thick = Math.max(0.6, (1 - u * 0.78) * 3.4);
  if (reach > 5) {
    drawLine(buf, 52 - reach, 52 - reach * 0.82, 52 + reach, 52 + reach * 0.82, PAL.indigoBright, thick + 1.0);
    drawLine(buf, 52 - reach, 52 + reach * 0.82, 52 + reach, 52 - reach * 0.82, PAL.indigoBright, thick + 1.0);
    drawLine(buf, 52 - reach * 0.92, 52 - reach * 0.75, 52 + reach * 0.92, 52 + reach * 0.75, PAL.cyanBright, thick * 0.65);
    drawLine(buf, 52 - reach * 0.92, 52 + reach * 0.75, 52 + reach * 0.92, 52 - reach * 0.75, PAL.cyanBright, thick * 0.65);
    if (u < 0.65) {
      drawLine(buf, 52 - reach * 0.78, 52 - reach * 0.64, 52 + reach * 0.78, 52 + reach * 0.64, PAL.white, Math.max(0, thick * 0.35));
      drawLine(buf, 52 - reach * 0.78, 52 + reach * 0.64, 52 + reach * 0.78, 52 - reach * 0.64, PAL.goldLight, Math.max(0, thick * 0.35));
    }
    drawDisc(buf, 52, 52, Math.max(1.5, (1 - u) * 7.5), u < 0.35 ? PAL.white : PAL.goldBright);
  }
  for (let i = 0; i < 4; i++) {
    const ang = (i * Math.PI) / 2 + 0.38 + u * 0.5;
    const r0 = 8 + u * 18;
    const r1 = Math.min(44, r0 + 14 * (1 - u * 0.5));
    if (r1 > r0 + 2) {
      drawLightningZig(
        buf,
        52 + Math.cos(ang) * r0,
        52 + Math.sin(ang) * r0,
        52 + Math.cos(ang) * r1,
        52 + Math.sin(ang) * r1,
        2.5,
        3,
        PAL.cyanBright,
        PAL.goldLight,
        f + i
      );
    }
  }
  applySelout104(buf);
  return buf;
}

// Row 2: Raijin Thunder-Spire / Susanoo Lightning Pillar
function renderRow2(f) {
  const buf = makeBuf();
  const u = f / (COLS - 1);
  const hFrac = u < 0.2 ? u / 0.2 : Math.max(0.18, 1 - (u - 0.2) * 0.85);
  const wHalf = Math.max(2, (1 - u * 0.68) * 13);
  const baseY = 96;
  const topY = Math.max(8, Math.round(baseY - 84 * hFrac));

  for (let y = topY; y <= baseY; y++) {
    const pyU = (baseY - y) / Math.max(1, baseY - topY);
    const jag = Math.sin(pyU * 14 + f * 0.9) * 2.2;
    const hw = Math.max(1.5, wHalf * (1 - pyU * 0.55));
    for (let dx = -Math.ceil(hw + 2); dx <= Math.ceil(hw + 2); dx++) {
      const ad = Math.abs(dx - jag * 0.5);
      if (ad > hw) continue;
      let col = PAL.indigoDeep;
      if (ad < hw * 0.28) col = PAL.white;
      else if (ad < hw * 0.56) col = PAL.cyanBright;
      else if (ad < hw * 0.82) col = PAL.indigoBright;
      setPx(buf, 52 + dx, y, col);
    }
  }
  drawLightningZig(buf, 52, topY + 2, 52, baseY - 2, 4.2, 7, PAL.goldBright, PAL.white, f * 0.8);
  drawLine(buf, 52 - wHalf * 1.5, baseY, 52 + wHalf * 1.5, baseY, PAL.cyanBright, 1);
  applySelout104(buf);
  return buf;
}

// Row 3: 2.5D Perspective Raijin Storm Locus Shock-Ring
function renderRow3(f) {
  const buf = makeBuf();
  const u = f / (COLS - 1);
  const rx = 12 + u * 33;
  const ry = 5 + u * 12;
  const band = Math.max(1.4, (1 - u * 0.72) * 5.2);
  for (let y = 18; y < 86; y++) {
    for (let x = 6; x < 98; x++) {
      const nx = (x - 52) / rx;
      const ny = (y - 56) / ry;
      const d = Math.hypot(nx, ny);
      const diff = Math.abs(d - 1.0) * rx;
      if (diff <= band) {
        let col = PAL.indigoMid;
        if (diff < band * 0.30) col = PAL.white;
        else if (diff < band * 0.62) col = PAL.cyanBright;
        else if ((x + y + f) % 5 === 0) col = PAL.goldLight;
        setPx(buf, x, y, col);
      }
    }
  }
  applySelout104(buf);
  return buf;
}

// Row 4: 4-Band Serrated Raijin Katana Slash Wave
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
      const a0 = -1.25 + u * 0.45;
      const a1 = 1.25 - u * 0.15;
      if (ang < a0 || ang > a1) continue;
      const au = (ang - a0) / Math.max(0.1, a1 - a0);
      const env = Math.sin(au * Math.PI) ** 0.55;
      const saw = Math.abs((((au * 8) % 1) * 2) - 1) * 5.0 * fade;
      const rIn = 18 + (rOut - 18) * (1 - env * fade) + saw;
      if (r < rIn) continue;
      const v = (r - rIn) / Math.max(1.5, rOut - rIn);
      let col = PAL.indigoDeep;
      if (v > 0.76) col = PAL.white;
      else if (v > 0.50) col = PAL.cyanBright;
      else if (v > 0.24) col = PAL.indigoBright;
      else col = PAL.goldLight;
      setPx(buf, x, y, col);
    }
  }
  applySelout104(buf);
  return buf;
}

// Row 5: 5-Drum Raijin Mitsudomoe Ground Thunder Seal
function renderRow5(f) {
  const buf = makeBuf();
  const ph = (f / COLS) * Math.PI * 2;
  const cx = 52;
  const cy = 56;
  const rx = 38;
  const ry = 17;

  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * Math.PI * 2;
    setPx(buf, cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, PAL.indigoBright);
    setPx(buf, cx + Math.cos(a) * (rx - 2), cy + Math.sin(a) * (ry - 1), PAL.cyanBright);
  }
  for (let k = 0; k < 5; k++) {
    const a = ph + (k * Math.PI * 2) / 5;
    const dx = cx + Math.cos(a) * (rx * 0.78);
    const dy = cy + Math.sin(a) * (ry * 0.78);
    drawDisc(buf, dx, dy, 3.6, PAL.goldBright);
    drawDisc(buf, dx, dy, 1.8, PAL.white);
    const aNext = ph + (((k + 2) % 5) * Math.PI * 2) / 5;
    drawLine(buf, dx, dy, cx + Math.cos(aNext) * (rx * 0.78), cy + Math.sin(aNext) * (ry * 0.78), PAL.indigoMid, 0);
  }
  applySelout104(buf);
  return buf;
}

// Row 6: Towering Susanoo Storm-God Blade Column
function renderRow6(f) {
  const buf = makeBuf();
  const ph = (f / COLS) * Math.PI * 2;
  const u = f / (COLS - 1);
  const hw = Math.max(3, (1 - u * 0.55) * 17);

  for (let y = 6; y <= 96; y++) {
    const v = (y - 6) / 90;
    const curve = Math.sin(v * Math.PI) * 4;
    const curHw = hw * (0.4 + 0.6 * Math.sin(v * Math.PI * 0.9 + 0.1));
    for (let dx = -Math.ceil(curHw); dx <= Math.ceil(curHw); dx++) {
      const ad = Math.abs(dx - curve * 0.4);
      if (ad > curHw) continue;
      let col = PAL.indigoDeep;
      if (ad < curHw * 0.25) col = PAL.white;
      else if (ad < curHw * 0.52) col = PAL.cyanBright;
      else if (ad < curHw * 0.78) col = PAL.indigoBright;
      else if ((y + f) % 4 === 0) col = PAL.goldBright;
      setPx(buf, 52 + dx, y, col);
    }
  }
  drawLightningZig(buf, 46, 10, 58, 94, 5.0, 8, PAL.goldLight, PAL.white, ph);
  applySelout104(buf);
  return buf;
}

// Row 7: Amakakeru Dimensional Realm-Cleave Rift & Sakura-Storm Burst
function renderRow7(f) {
  const buf = makeBuf();
  const u = f / (COLS - 1);
  const ph = u * Math.PI * 2;
  const span = 42 * Math.min(1, u * 3.2);
  const wRift = Math.max(1.0, (1 - u * 0.75) * 6.5);

  drawLine(buf, 52 - span, 52 + span * 0.58, 52 + span, 52 - span * 0.58, PAL.indigoDeep, wRift + 1.4);
  drawLine(buf, 52 - span * 0.95, 52 + span * 0.55, 52 + span * 0.95, 52 - span * 0.55, PAL.cyanBright, wRift * 0.68);
  if (u < 0.75) {
    drawLine(buf, 52 - span * 0.88, 52 + span * 0.51, 52 + span * 0.88, 52 - span * 0.51, PAL.white, Math.max(0.5, wRift * 0.35));
  }

  for (let p = 0; p < 7; p++) {
    const ang = ph * 1.2 + p * 0.92;
    const rad = 10 + u * 28 + (p % 3) * 4;
    const px = 52 + Math.cos(ang) * rad;
    const py = 52 + Math.sin(ang) * (rad * 0.68);
    const pCol = p % 2 === 0 ? PAL.sakuraPink : PAL.goldLight;
    setPx(buf, px, py, pCol);
    setPx(buf, px + 1, py, p % 2 === 0 ? PAL.sakuraPale : PAL.white);
    setPx(buf, px, py + 1, pCol);
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
  console.log('=== Building KAZE-MARU EX 30fps VFX Sheet (6240x1664) ===');
  const W = COLS * CELL;
  const H = ROWS * CELL;
  const sheetRgba = new Uint8Array(W * H * 4);

  const rowFns = [renderRow0, renderRow1, renderRow2, renderRow3, renderRow4, renderRow5, renderRow6, renderRow7];
  const sampleCols = [0, 3, 7, 12, 17, 22, 27];
  const qaW = sampleCols.length * CELL;
  const qaH = ROWS * CELL;
  const qaRgba = new Uint8Array(qaW * qaH * 4);
  for (let i = 0; i < qaW * qaH; i++) {
    qaRgba[i * 4] = 24;
    qaRgba[i * 4 + 1] = 28;
    qaRgba[i * 4 + 2] = 44;
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

  console.log(`[QA] ronin_ex_vfx.png: borderClips=${borderClips}/240 | nonBinary=${nonBinary}`);
  if (borderClips !== 0 || nonBinary !== 0) {
    throw new Error(`ronin_ex_vfx QA failed: borderClips=${borderClips}, nonBinary=${nonBinary}`);
  }

  fs.writeFileSync(OUT_PATH, encodeRgbaPng(W, H, sheetRgba));
  console.log(`[OK] Saved ${OUT_PATH} (${W}x${H})`);

  fs.mkdirSync(path.dirname(QA_PATH), { recursive: true });
  fs.writeFileSync(QA_PATH, encodeRgbaPng(qaW, qaH, qaRgba));
  console.log(`[QA] Saved ${QA_PATH}`);
}

main();
