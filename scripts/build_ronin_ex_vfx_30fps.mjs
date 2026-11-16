#!/usr/bin/env node
/**
 * Newly-Born Next-Gen 30fps Pixel-Art VFX Sheet Builder for KAZE-MARU EX (ronin_ex).
 * Zero external npm dependencies (pure Node zlib PNG encoder).
 *
 * Output: assets/sprites/ronin_ex_vfx.png (6240x1664, 30 cols x 8 rows, 208x208 cells)
 * Logical grid: 104x104 per cell -> upscaled 2x NEAREST -> 208x208 (100% 2x2 pixel blocks,
 * strict binary alpha 0 or 255, strict 3px logical / 6px output border margin -> 0/240 clips).
 *
 * Row Layout:
 *   Row 0: Piercing 'ronin_slash' Raijin Crescent Vacuum Wave (0 orbs!)
 *   Row 1: Narukami Crimson-Gold Torii Thunder-Gate & Saya Detonation Burst
 *   Row 2: Takemikazuchi Swirling Crescent Storm-Pillar & Forked Lightning
 *   Row 3: 8-Drum Takemikazuchi Mitsudomoe Thunder Ring & Storm Shockwave
 *   Row 4: 4-Band Serrated Battojutsu Katana Arc & Electric Sakura Wake
 *   Row 5: Indigo-Gold Raijin Storm-God War-Mask & 5-Drum Taiko Halo
 *   Row 6: Crimson-Moon Shogunate Torii Sanctuary Emblem
 *   Row 7: Amakakeru Horizon Severance Fault-Line & Sakura-Thunder Judgement
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const COLS = 30;
const ROWS = 8;
const LOG = 104;
const CELL = 208;
const MARGIN = 3; // 6px transparent margin in 208x208 -> 0/240 border clips!

const OUT_PATH = path.join(REPO_ROOT, 'assets', 'sprites', 'ronin_ex_vfx.png');
const QA_PATH =
  '/Users/rei/.gemini/antigravity/brain/3134f27a-cc2a-4935-88e2-e05d540e5f89/scratch/debug_ronin_ex_vfx_30fps.png';

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
  goldDeep: [180, 83, 9, 255],
  goldMid: [245, 158, 11, 255],
  goldBright: [250, 204, 21, 255],
  goldLight: [253, 224, 71, 255],
  crimsonDeep: [136, 19, 55, 255],
  crimsonMid: [225, 29, 72, 255],
  crimsonBright: [251, 113, 133, 255],
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
  if (ix < MARGIN + 1 || ix >= LOG - MARGIN - 1 || iy < MARGIN + 1 || iy >= LOG - MARGIN - 1) return;
  const idx = (iy * LOG + ix) * 4;
  buf[idx] = rgba[0];
  buf[idx + 1] = rgba[1];
  buf[idx + 2] = rgba[2];
  buf[idx + 3] = 255;
}

function drawRect(buf, x0, y0, w, h, rgba) {
  const sx = Math.round(x0);
  const sy = Math.round(y0);
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      setPx(buf, sx + dx, sy + dy, rgba);
    }
  }
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

// Strict 2-pass line helper so outer pixels never overwrite core pixels
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

function drawStar4(buf, cx, cy, arm, colTip, colCore = PAL.white) {
  const L = Math.max(1, Math.round(arm));
  for (let i = -L; i <= L; i++) {
    setPx(buf, cx + i, cy, Math.abs(i) <= 1 ? colCore : colTip);
    setPx(buf, cx, cy + i, Math.abs(i) <= 1 ? colCore : colTip);
  }
  if (L >= 3) {
    setPx(buf, cx - 1, cy - 1, colTip);
    setPx(buf, cx + 1, cy - 1, colTip);
    setPx(buf, cx - 1, cy + 1, colTip);
    setPx(buf, cx + 1, cy + 1, colTip);
  }
  setPx(buf, cx, cy, PAL.white);
}

function drawSakuraPetal(buf, cx, cy, phase, electrified = false) {
  const main = electrified ? PAL.cyanIce : PAL.sakuraPale;
  const rim = electrified ? PAL.sakuraPink : PAL.crimsonBright;
  const mode = Math.abs(phase) % 2;
  setPx(buf, cx, cy, main);
  if (mode === 0) {
    setPx(buf, cx + 1, cy, rim);
    setPx(buf, cx, cy - 1, rim);
    setPx(buf, cx - 1, cy + 1, main);
  } else {
    setPx(buf, cx - 1, cy, rim);
    setPx(buf, cx + 1, cy + 1, main);
    setPx(buf, cx, cy + 1, rim);
  }
}

// Multi-pass lightning chain (Pass 1 all outer, Pass 2 all core -- zero chevrons!)
function drawLightningZig(buf, x0, y0, x1, y1, jagAmp, segs, colMain, colCore, seed = 0) {
  const pts = [[x0, y0]];
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  for (let s = 1; s <= segs; s++) {
    const u = s / segs;
    const zig = s === segs ? 0 : Math.sin(s * 2.7 + seed) * jagAmp;
    pts.push([x0 + dx * u + nx * zig, y0 + dy * u + ny * zig]);
  }
  for (let s = 0; s < pts.length - 1; s++) {
    drawLine(buf, pts[s][0], pts[s][1], pts[s + 1][0], pts[s + 1][1], colMain, 0.85);
  }
  for (let s = 0; s < pts.length - 1; s++) {
    drawLine(buf, pts[s][0], pts[s][1], pts[s + 1][0], pts[s + 1][1], colCore, 0);
  }
}

function drawToriiSilhouette(buf, cx, baseY, scale, colPillar, colTrim, colHi) {
  const h = Math.round(34 * scale);
  const pOff = Math.round(13 * scale);
  const pW = Math.max(2, Math.round(3 * scale));
  const kasagiW = Math.round(38 * scale);
  const nukiW = Math.round(30 * scale);
  const topY = baseY - h;

  // Two vertical pillars
  drawRect(buf, cx - pOff - Math.floor(pW / 2), topY + 4, pW, h - 4, colPillar);
  drawRect(buf, cx + pOff - Math.floor(pW / 2), topY + 4, pW, h - 4, colPillar);
  // Plinth bases
  drawRect(buf, cx - pOff - Math.floor(pW / 2) - 1, baseY - 3, pW + 2, 3, colTrim);
  drawRect(buf, cx + pOff - Math.floor(pW / 2) - 1, baseY - 3, pW + 2, 3, colTrim);
  // Lower crossbeam (Nuki)
  drawRect(buf, cx - Math.floor(nukiW / 2), topY + Math.round(9 * scale), nukiW, Math.max(2, Math.round(2.5 * scale)), colPillar);
  // Upper curved lintel (Kasagi)
  for (let dx = -Math.floor(kasagiW / 2); dx <= Math.floor(kasagiW / 2); dx++) {
    const lift = Math.abs(dx) > kasagiW * 0.34 ? -1 : 0;
    drawRect(buf, cx + dx, topY + lift, 1, Math.max(2, Math.round(3 * scale)), colPillar);
    setPx(buf, cx + dx, topY + lift, colHi);
  }
  // Center tablet (Gakuzuka)
  drawRect(buf, cx - 1, topY + 2, 3, Math.max(3, Math.round(7 * scale)), colTrim);
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

// Row 0: Piercing 'ronin_slash' Raijin Crescent Vacuum Wave (strictly crescent blade, 0 orbs!)
function renderRow0(f) {
  const buf = makeBuf();
  const ph = (f / COLS) * Math.PI * 2;
  const cx = 34;
  const cy = 52;
  const rOut = 43;
  const rInBase = 21;

  for (let y = 8; y < 96; y++) {
    const dy = (y - cy) * 0.90;
    for (let x = 14; x < 96; x++) {
      const dx = x - cx;
      const r = Math.hypot(dx, dy);
      if (r > rOut || r < 12) continue;
      const ang = Math.atan2(dy, dx);
      if (Math.abs(ang) > 1.22) continue;
      const u = (ang + 1.22) / 2.44;
      const env = Math.sin(u * Math.PI) ** 0.52;
      const saw = Math.abs((((u * 10 + f * 0.25) % 1) * 2) - 1) * 4.8;
      const rIn = rInBase + (rOut - rInBase) * (1 - env) + saw;
      if (r < rIn) continue;
      const v = (r - rIn) / Math.max(1.5, rOut - rIn);
      let col = PAL.indigoDeep;
      if (v > 0.78) col = PAL.white;
      else if (v > 0.54) col = PAL.cyanIce;
      else if (v > 0.32) col = PAL.cyanBright;
      else if (v > 0.16) col = PAL.indigoBright;
      else if (saw > 2.4) col = PAL.goldLight;
      setPx(buf, x, y, col);
    }
  }
  for (let k = -2; k <= 2; k++) {
    const wy = cy + k * 11 + Math.sin(ph + k) * 2;
    const len = 18 + ((f + k * 7 + 30) % 5) * 3;
    drawLightningZig(
      buf,
      54 - Math.abs(k) * 3,
      wy,
      54 - Math.abs(k) * 3 - len,
      wy,
      2.4,
      4,
      PAL.cyanBright,
      PAL.goldLight,
      ph + k
    );
  }
  drawStar4(buf, 76, 52 + Math.round(Math.sin(ph) * 3), 4, PAL.goldLight);
  drawSakuraPetal(buf, 42 - (f % 9), 34 + (f % 5), f, true);
  drawSakuraPetal(buf, 44 - ((f + 4) % 10), 69 - (f % 5), f + 1, true);
  applySelout104(buf);
  return buf;
}

// Row 1: Narukami Crimson-Gold Torii Thunder-Gate & Saya Detonation Burst
function renderRow1(f) {
  const buf = makeBuf();
  const u = f / (COLS - 1);
  const gateAlpha = u < 0.78;
  if (gateAlpha) {
    const scale = u < 0.18 ? 0.82 + (u / 0.18) * 0.26 : 1.08;
    drawToriiSilhouette(buf, 52, 84, scale, PAL.crimsonMid, PAL.goldBright, PAL.goldLight);
  }
  const reach = u < 0.22 ? 18 + (u / 0.22) * 24 : 42 * (1 - (u - 0.22) * 0.58);
  if (reach > 5) {
    // 2-pass X-cross lightning threads
    drawLine(buf, 52 - reach, 52 - reach * 0.78, 52 + reach, 52 + reach * 0.78, PAL.indigoBright, 1.3);
    drawLine(buf, 52 - reach, 52 + reach * 0.78, 52 + reach, 52 - reach * 0.78, PAL.cyanBright, 1.3);
    if (u < 0.72) {
      drawLine(buf, 52 - reach * 0.88, 52 - reach * 0.69, 52 + reach * 0.88, 52 + reach * 0.69, PAL.white, 0.5);
      drawLine(buf, 52 - reach * 0.88, 52 + reach * 0.69, 52 + reach * 0.88, 52 - reach * 0.69, PAL.goldLight, 0.5);
    }
    drawStar4(buf, 52, 52, Math.max(2, Math.round((1 - u * 0.7) * 8)), PAL.goldBright);
  }
  drawLightningZig(buf, 52, 12, 52, 86, 3.6, 6, PAL.cyanBright, PAL.white, f * 0.9);
  applySelout104(buf);
  return buf;
}

// Row 2: Takemikazuchi Swirling Crescent Storm-Pillar & Forked Lightning
function renderRow2(f) {
  const buf = makeBuf();
  const u = f / (COLS - 1);
  const ph = u * Math.PI * 2;
  const hFrac = u < 0.16 ? u / 0.16 : Math.max(0.22, 1 - (u - 0.16) * 0.78);
  const wHalf = Math.max(2.5, (1 - u * 0.62) * 15);
  const baseY = 94;
  const topY = Math.max(9, Math.round(baseY - 82 * hFrac));

  for (let y = topY; y <= baseY; y++) {
    const pyU = (baseY - y) / Math.max(1, baseY - topY);
    const spiral = Math.sin(pyU * 11 - ph * 2) * 3.2;
    const hw = Math.max(1.8, wHalf * (1 - pyU * 0.36));
    for (let dx = -Math.ceil(hw + 3); dx <= Math.ceil(hw + 3); dx++) {
      const ad = Math.abs(dx - spiral * 0.55);
      if (ad > hw) continue;
      let col = PAL.indigoDeep;
      if (ad < hw * 0.26) col = PAL.white;
      else if (ad < hw * 0.52) col = PAL.cyanIce;
      else if (ad < hw * 0.76) col = PAL.cyanBright;
      else col = (y + f) % 4 === 0 ? PAL.goldLight : PAL.indigoBright;
      setPx(buf, 52 + dx, y, col);
    }
  }
  // Helical crescent blades wrapping the storm column
  for (let band = 0; band < 3; band++) {
    const by = baseY - Math.round(((band * 0.32 + u * 0.9) % 1) * (baseY - topY));
    if (by > topY + 4 && by < baseY - 4) {
      drawLine(buf, 52 - wHalf - 3, by + 3, 52 + wHalf + 3, by - 3, PAL.cyanBright, 1.0);
      drawLine(buf, 52 - wHalf - 1, by + 2, 52 + wHalf + 1, by - 2, PAL.white, 0);
    }
  }
  drawLightningZig(buf, 52, topY + 2, 52, baseY - 2, 4.4, 7, PAL.goldBright, PAL.white, f * 0.85);
  drawLine(buf, 52 - wHalf * 1.6, baseY, 52 + wHalf * 1.6, baseY, PAL.cyanBright, 1);
  applySelout104(buf);
  return buf;
}

// Row 3: 8-Drum Takemikazuchi Mitsudomoe Thunder Ring & Storm Shockwave
function renderRow3(f) {
  const buf = makeBuf();
  const u = f / (COLS - 1);
  const ph = (f / COLS) * Math.PI * 2;
  const rx = 16 + u * 27;
  const ry = 7 + u * 11;
  const band = Math.max(1.3, (1 - u * 0.70) * 4.8);
  for (let y = 20; y < 86; y++) {
    for (let x = 8; x < 96; x++) {
      const nx = (x - 52) / rx;
      const ny = (y - 54) / ry;
      const d = Math.hypot(nx, ny);
      const diff = Math.abs(d - 1.0) * rx;
      if (diff <= band) {
        let col = PAL.indigoMid;
        if (diff < band * 0.28) col = PAL.white;
        else if (diff < band * 0.58) col = PAL.cyanBright;
        else if ((x + y + f) % 4 === 0) col = PAL.goldLight;
        setPx(buf, x, y, col);
      }
    }
  }
  // 8 orbiting Taiko Thunder Drums around the storm ring
  for (let d = 0; d < 8; d++) {
    const a = ph + (d * Math.PI) / 4;
    const dx = 52 + Math.cos(a) * Math.min(41, rx * 0.94);
    const dy = 54 + Math.sin(a) * Math.min(20, ry * 0.94);
    drawDisc(buf, dx, dy, 2.8, PAL.goldMid);
    drawDisc(buf, dx, dy, 1.5, d % 2 === 0 ? PAL.white : PAL.goldLight);
  }
  applySelout104(buf);
  return buf;
}

// Row 4: 4-Band Serrated Battojutsu Katana Arc & Electric Sakura Wake
function renderRow4(f) {
  const buf = makeBuf();
  const u = f / (COLS - 1);
  const cx = 35;
  const cy = 52;
  const rOut = 43;
  const fade = Math.max(0.18, 1 - u * 0.80);

  for (let y = 8; y < 96; y++) {
    const dy = y - cy;
    for (let x = 10; x < 96; x++) {
      const dx = x - cx;
      const r = Math.hypot(dx, dy);
      if (r > rOut || r < 14) continue;
      const ang = Math.atan2(dy, dx);
      const a0 = -1.24 + u * 0.42;
      const a1 = 1.24 - u * 0.14;
      if (ang < a0 || ang > a1) continue;
      const au = (ang - a0) / Math.max(0.1, a1 - a0);
      const env = Math.sin(au * Math.PI) ** 0.54;
      const saw = Math.abs((((au * 9) % 1) * 2) - 1) * 5.0 * fade;
      const rIn = 18 + (rOut - 18) * (1 - env * fade) + saw;
      if (r < rIn) continue;
      const v = (r - rIn) / Math.max(1.5, rOut - rIn);
      let col = PAL.indigoDeep;
      if (v > 0.78) col = PAL.white;
      else if (v > 0.52) col = PAL.cyanBright;
      else if (v > 0.26) col = PAL.indigoBright;
      else col = PAL.goldLight;
      setPx(buf, x, y, col);
    }
  }
  for (let p = 0; p < 4; p++) {
    const px = 42 + p * 9 - Math.round(u * 12);
    const py = 28 + p * 15 + ((f + p * 3) % 5);
    drawSakuraPetal(buf, px, py, f + p, p % 2 === 0);
  }
  applySelout104(buf);
  return buf;
}

// Row 5: Indigo-Gold Raijin Storm-God War-Mask & 8-Drum Taiko Halo (ULTIMATE)
function renderRow5(f) {
  const buf = makeBuf();
  const ph = (f / COLS) * Math.PI * 2;
  const cx = 52;
  const cy = 54;

  // Outer 8-Drum Thunder Ring
  const rRing = 37;
  for (let i = 0; i < 96; i++) {
    if (i % 6 === 0) continue;
    const a = (i / 96) * Math.PI * 2 + ph;
    setPx(buf, cx + Math.cos(a) * rRing, cy + Math.sin(a) * rRing, i % 2 === 0 ? PAL.indigoBright : PAL.cyanBright);
  }
  for (let k = 0; k < 8; k++) {
    const a = ph + (k * Math.PI) / 4;
    const dx = cx + Math.cos(a) * rRing;
    const dy = cy + Math.sin(a) * rRing;
    drawDisc(buf, dx, dy, 3.8, PAL.indigoDeep);
    drawDisc(buf, dx, dy, 2.6, PAL.goldBright);
    setPx(buf, dx, dy, PAL.white);
  }

  // Fierce Pixel-Art Horned Indigo-Gold Raijin War-Mask in center
  drawDisc(buf, cx, cy + 2, 16, PAL.indigoDeep);
  drawDisc(buf, cx, cy + 2, 13, PAL.indigoMid);
  // Sweeping Golden Oni Horns
  for (const side of [-1, 1]) {
    drawLine(buf, cx + side * 8, cy - 8, cx + side * 20, cy - 22, PAL.goldMid, 2.0);
    drawLine(buf, cx + side * 9, cy - 9, cx + side * 20, cy - 22, PAL.goldLight, 0.9);
    // Fierce angled glowing Storm-God eyes
    drawLine(buf, cx + side * 3, cy, cx + side * 10, cy - 3, PAL.cyanBright, 1.4);
    drawLine(buf, cx + side * 4, cy, cx + side * 9, cy - 2, PAL.white, 0.6);
    // Tusk fangs
    drawLine(buf, cx + side * 7, cy + 10, cx + side * 9, cy + 4, PAL.goldLight, 1.0);
  }
  // Brow crest jewel
  drawStar4(buf, cx, cy - 6, 3 + (f % 2), PAL.goldBright);
  // Jaw snarl bar
  drawLine(buf, cx - 6, cy + 9, cx + 6, cy + 9, PAL.goldMid, 1.0);

  applySelout104(buf);
  return buf;
}

// Row 6: Crimson-Moon Shogunate Torii Sanctuary Emblem (TRUE_ULTIMATE)
function renderRow6(f) {
  const buf = makeBuf();
  const ph = (f / COLS) * Math.PI * 2;
  const cx = 52;
  const cy = 48;

  // Monumental Blood-Crimson Full Moon with dithered inner glow
  drawDisc(buf, cx, cy, 31, PAL.crimsonDeep);
  drawDisc(buf, cx, cy, 28, PAL.crimsonMid);
  drawDisc(buf, cx, cy - 2, 22, PAL.crimsonBright);
  drawDisc(buf, cx, cy - 4, 14, PAL.sakuraPale);
  // Crisp moon rim highlight
  for (let i = 0; i < 84; i++) {
    const a = (i / 84) * Math.PI * 2;
    setPx(buf, cx + Math.cos(a) * 31, cy + Math.sin(a) * 31, i % 3 === 0 ? PAL.goldLight : PAL.crimsonBright);
  }

  // Sacred Shogunate Torii Gate standing before the Crimson Moon
  drawToriiSilhouette(buf, cx, 88, 1.24, PAL.indigoDeep, PAL.goldBright, PAL.goldLight);

  // Drifting Sakura Blossoms & Electric Star Glints
  for (let p = 0; p < 6; p++) {
    const ang = ph + p * 1.04;
    const px = cx + Math.cos(ang) * 35;
    const py = cy + 6 + Math.sin(ang * 1.5) * 26;
    drawSakuraPetal(buf, px, py, f + p, p % 2 === 0);
  }
  drawStar4(buf, cx, cy - 16, 4, PAL.goldLight);
  applySelout104(buf);
  return buf;
}

// Row 7: Amakakeru Horizon Severance Fault-Line & Sakura-Thunder Judgement
function renderRow7(f) {
  const buf = makeBuf();
  const u = f / (COLS - 1);
  const ph = u * Math.PI * 2;
  const span = 42 * Math.min(1, u * 3.4);
  const wRift = Math.max(1.0, (1 - u * 0.72) * 5.8);

  // Horizon Severance Fault-Line (2-pass outer -> core)
  drawLine(buf, 52 - span, 52 + span * 0.22, 52 + span, 52 - span * 0.22, PAL.indigoMid, wRift + 1.2);
  drawLine(buf, 52 - span * 0.96, 52 + span * 0.21, 52 + span * 0.96, 52 - span * 0.21, PAL.cyanBright, wRift * 0.62);
  if (u < 0.82) {
    drawLine(buf, 52 - span * 0.92, 52 + span * 0.20, 52 + span * 0.92, 52 - span * 0.20, PAL.white, Math.max(0.5, wRift * 0.30));
  }
  drawLightningZig(buf, 52, 10, 52, 92, 4.5, 7, PAL.goldBright, PAL.white, ph);
  drawStar4(buf, 52, 52, Math.max(3, Math.round((1 - u * 0.65) * 9)), PAL.cyanIce);

  for (let p = 0; p < 8; p++) {
    const ang = ph * 1.2 + p * 0.78;
    const rad = 10 + u * 28 + (p % 3) * 3;
    const px = 52 + Math.cos(ang) * rad;
    const py = 52 + Math.sin(ang) * (rad * 0.68);
    drawSakuraPetal(buf, px, py, f + p, p % 2 === 0);
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
  console.log('=== Building Newly-Born KAZE-MARU EX 30fps VFX Sheet (6240x1664) ===');
  const W = COLS * CELL;
  const H = ROWS * CELL;
  const sheetRgba = new Uint8Array(W * H * 4);

  const rowFns = [renderRow0, renderRow1, renderRow2, renderRow3, renderRow4, renderRow5, renderRow6, renderRow7];
  const sampleCols = [0, 3, 7, 12, 17, 22, 27];
  const qaW = sampleCols.length * CELL;
  const qaH = ROWS * CELL;
  const qaRgba = new Uint8Array(qaW * qaH * 4);
  for (let i = 0; i < qaW * qaH; i++) {
    qaRgba[i * 4] = 14;
    qaRgba[i * 4 + 1] = 18;
    qaRgba[i * 4 + 2] = 34;
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
