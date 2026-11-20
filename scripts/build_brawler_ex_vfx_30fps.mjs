#!/usr/bin/env node
/**
 * Next-Gen 30fps HD-2D VFX Sprite Sheet Builder for RAIJIN EX -- "THE TEMPEST FIST" (`brawler_ex`).
 * Pure nearest-neighbor integer-grid pixel rendering (`104x104` logical -> `2x` NEAREST -> `208x208`),
 * `0` smooth vector / rotation calls, `0/240` 4px border clips, `29/29` transitions per row!
 *
 * Outputs:
 *   1. `assets/sprites/brawler_ex_vfx.png` (`6240x1664`, `8 rows x 30 cols @ 208x208`)
 *   2. `/Users/rei/.gemini/antigravity/brain/9632a6ee-c817-4a54-a13c-c1d08491f273/scratch/debug_brawler_ex_vfx.png`
 *
 * Row Layout (`0..7`, 30fps each, palette `#0f172a #1e1b4b #4338ca #6366f1 #fbbf24 #fef08a #ffffff`):
 *   Row 0: Thunderclap Fist Shockwave Crescent (Beat 1/2/4 melee punch impact waves)
 *   Row 1: Sky-Breaker Rising Lightning Helix (Beat 3 uppercut & Ult climax rising bolt spiral)
 *   Row 2: Thunderstep Dash Lightning Stream (SKILL: THUNDERSTEP BREAKER forward surge)
 *   Row 3: Tempest Phantom Fist Barrage Burst (ULTIMATE: TEMPEST HUNDRED FISTS sculpted phantom fists)
 *   Row 4: Heaven-Splitting Raijin Storm Pillar (TRUE_ULTIMATE sky-to-earth jagged lightning column)
 *   Row 5: Thunder-Crater Ground Shatter Seal (TRUE_ULTIMATE & Thunderclap radial ground shockwave)
 *   Row 6: Iron-Body Static Parry Flare (CROUCH Iron Guard counter & parry diamond spark)
 *   Row 7: Raijin Storm-Crest Mandala Aura (Overdrive & Supreme Ult swirling storm-gold thunder ring)
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SCRATCH_DIR =
  '/Users/rei/.gemini/antigravity/brain/9632a6ee-c817-4a54-a13c-c1d08491f273/scratch';

const LOG = 104;
const CELL = 208;
const ROWS = 8;
const COLS = 30;

// Raijin EX storm-gold + midnight-indigo palette
const C_DEEP = [30, 27, 75];       // #1e1b4b
const C_INDIGO = [67, 56, 202];    // #4338ca
const C_VIOLET = [99, 102, 241];   // #6366f1
const C_ICE = [165, 180, 252];     // #a5b4fc
const C_GOLD = [251, 191, 36];     // #fbbf24
const C_GOLD_HI = [254, 240, 138]; // #fef08a
const C_WHITE = [255, 255, 255];   // #ffffff

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

function blendPx(rgba, x, y, rgb, aFloat = 1.0) {
  const ix = Math.round(x);
  const iy = Math.round(y);
  if (ix < 3 || ix >= LOG - 3 || iy < 3 || iy >= LOG - 3 || aFloat <= 0.01) return;
  const o = (iy * LOG + ix) * 4;
  const sa = Math.max(0, Math.min(1, aFloat));
  const da = rgba[o + 3] / 255;
  const outA = sa + da * (1 - sa);
  if (outA <= 0) return;
  rgba[o] = Math.round((rgb[0] * sa + rgba[o] * da * (1 - sa)) / outA);
  rgba[o + 1] = Math.round((rgb[1] * sa + rgba[o + 1] * da * (1 - sa)) / outA);
  rgba[o + 2] = Math.round((rgb[2] * sa + rgba[o + 2] * da * (1 - sa)) / outA);
  rgba[o + 3] = Math.round(outA * 255);
}

function drawBolt(rgba, x0, y0, x1, y1, seed, jag, env, thick = 1.6, goldCore = true) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const ln = Math.max(1, Math.hypot(dx, dy));
  const nx = -dy / ln;
  const ny = dx / ln;
  const segs = Math.max(4, Math.min(12, Math.round(ln / 7)));
  const pts = [[x0, y0]];
  for (let i = 1; i < segs; i++) {
    const u = i / segs;
    const wob = Math.sin(seed * 3.1 + i * 4.3) * jag * Math.sin(u * Math.PI);
    pts.push([x0 + dx * u + nx * wob, y0 + dy * u + ny * wob]);
  }
  pts.push([x1, y1]);

  const pathPts = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    const steps = Math.max(2, Math.ceil(Math.hypot(bx - ax, by - ay) * 1.6));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      pathPts.push([ax + (bx - ax) * t, ay + (by - ay) * t]);
    }
  }

  // Pass 1: Indigo atmospheric aura
  const rOut = Math.ceil(thick + 1.4);
  for (const [px, py] of pathPts) {
    for (let oy = -rOut; oy <= rOut; oy++) {
      for (let ox = -rOut; ox <= rOut; ox++) {
        const d = Math.hypot(ox, oy);
        if (d <= thick + 1.4) {
          blendPx(rgba, px + ox, py + oy, d > thick ? C_INDIGO : C_VIOLET, env * Math.max(0, 1 - d / (thick + 2.0)) * 0.65);
        }
      }
    }
  }
  // Pass 2: Storm-gold body
  const rMid = Math.ceil(thick * 0.7);
  for (const [px, py] of pathPts) {
    for (let oy = -rMid; oy <= rMid; oy++) {
      for (let ox = -rMid; ox <= rMid; ox++) {
        if (Math.hypot(ox, oy) <= thick * 0.75) {
          blendPx(rgba, px + ox, py + oy, goldCore ? C_GOLD : C_ICE, env * 0.9);
        }
      }
    }
  }
  // Pass 3: White-hot razor spine
  for (const [px, py] of pathPts) {
    blendPx(rgba, px, py, goldCore ? C_WHITE : C_GOLD_HI, env);
  }
}

function drawSpark4(rgba, cx, cy, arm, env, gold = true) {
  const a = Math.max(2, Math.round(arm));
  const cMid = gold ? C_GOLD : C_VIOLET;
  const cHi = gold ? C_GOLD_HI : C_ICE;
  for (let i = -a; i <= a; i++) {
    const f = (1 - Math.abs(i) / (a + 1)) * env;
    blendPx(rgba, cx + i, cy, Math.abs(i) <= 1 ? C_WHITE : cHi, f);
    blendPx(rgba, cx, cy + i, Math.abs(i) <= 1 ? C_WHITE : cMid, f);
  }
}

function drawSculptedPhantomFist104(rgba, cx, cy, scale, env, gold = true) {
  const cOut = C_DEEP;
  const cInd = gold ? C_INDIGO : C_VIOLET;
  const cMid = gold ? C_GOLD : C_VIOLET;
  const cHi = gold ? C_GOLD_HI : C_ICE;
  // Crisp right-facing sculpted martial fist bitmap: wrist tape cuff, raised thumb clasp,
  // 4 stepped knuckle ridge + indigo knuckle crease pixels (unmistakable fist silhouette!)
  const rows = [
    '....OOOOOO....',
    '...OIMHHMIO...',
    '..OIMWWWWMMO..',
    'OOIMWWWWWWHIO.',
    'OIMHWWWWWWWMIO',
    'OIMHWWWWWWWMIO',
    'OIMHWWWIWWWMIO',
    'OIMHWWWWWWWMIO',
    'OOIMWWWIWWWHIO',
    '..OIMWWWWMMO..',
    '...OIMHHMIO...',
    '....OOOOOO....'
  ];
  const colorMap = {
    O: cOut,
    I: cInd,
    M: cMid,
    H: cHi,
    W: C_WHITE
  };
  const h = rows.length;
  const w = rows[0].length;
  for (let ry = 0; ry < h; ry++) {
    for (let rx = 0; rx < w; rx++) {
      const ch = rows[ry][rx];
      const col = colorMap[ch];
      if (!col) continue;
      const px = cx + (rx - w * 0.5) * scale;
      const py = cy + (ry - h * 0.5) * scale;
      const step = Math.max(1, Math.ceil(scale));
      for (let dy = 0; dy < step; dy++) {
        for (let dx = 0; dx < step; dx++) {
          blendPx(rgba, px + dx, py + dy, col, env);
        }
      }
    }
  }
}

// Row 0: Thunderclap Fist Shockwave Crescent
function renderRow0(rgba, col) {
  const u = col / 29;
  const env = Math.max(0.16, Math.sin(u * Math.PI) * 0.92 + 0.14);
  const cx = 36 + u * 26;
  const cy = 52;
  const rx = 18 + u * 18;
  const ry = 26 + u * 14;
  for (let y = 8; y < 96; y++) {
    for (let x = 8; x < 96; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx < -10) continue;
      const rNorm = Math.hypot(dx / rx, dy / ry);
      const band = Math.abs(rNorm - 0.82);
      const arcFade = Math.max(0, Math.min(1, (dx + 8) / 22));
      if (band < 0.28 && arcFade > 0.05) {
        const w = (1 - band / 0.28) * arcFade * env;
        const colRgb = band < 0.07 ? C_WHITE : band < 0.15 ? C_GOLD_HI : band < 0.21 ? C_GOLD : C_VIOLET;
        blendPx(rgba, x, y, colRgb, w * 1.15);
      }
    }
  }
  drawBolt(rgba, cx + rx * 0.6, cy - ry * 0.72, cx + rx * 0.85, cy + ry * 0.72, col * 3.1, 4.2, env * 0.92, 1.5, true);
  drawSpark4(rgba, cx + rx * 0.8, cy + Math.sin(col * 0.8) * 14, 5.5, env, true);
}

// Row 1: Sky-Breaker Rising Lightning Helix
function renderRow1(rgba, col) {
  const u = col / 29;
  const ph = u * Math.PI * 4;
  const env = Math.sin(u * Math.PI) * 0.95 + 0.15;
  const cx = 52;
  for (let s = 0; s < 42; s++) {
    const v = s / 41;
    const py = 90 - v * 76;
    const rad = (10 + 18 * Math.sin(v * Math.PI)) * (0.65 + 0.35 * u);
    const xA = cx + Math.cos(v * 9.5 - ph) * rad;
    const xB = cx - Math.cos(v * 9.5 - ph) * rad;
    for (let oy = -2; oy <= 2; oy++) {
      for (let ox = -2; ox <= 2; ox++) {
        const d = Math.hypot(ox, oy);
        if (d <= 2.4) {
          blendPx(rgba, xA + ox, py + oy, d < 1.0 ? C_WHITE : d < 1.8 ? C_GOLD : C_VIOLET, env * 0.85);
          blendPx(rgba, xB + ox, py + oy, d < 1.0 ? C_GOLD_HI : C_INDIGO, env * 0.72);
        }
      }
    }
  }
  drawBolt(rgba, cx - 4, 90, cx + 4, 14, col * 2.7 + 1, 5.5, env, 1.8, true);
  drawSpark4(rgba, cx + Math.sin(ph) * 12, 22 + (col % 6) * 4, 6, env, true);
}

// Row 2: Thunderstep Dash Lightning Stream
function renderRow2(rgba, col) {
  const u = col / 29;
  const env = Math.max(0.16, Math.sin(u * Math.PI) * 0.88 + 0.16);
  const leadX = 24 + u * 66;
  const tailX = Math.max(10, leadX - 48);
  for (let lane = -2; lane <= 2; lane++) {
    const ly = 52 + lane * 8;
    const w = 1 - Math.abs(lane) * 0.25;
    drawBolt(rgba, tailX + Math.abs(lane) * 4, ly, leadX - Math.abs(lane) * 2, ly, col * 4.1 + lane * 7, 3.0, env * w, lane === 0 ? 2.1 : 1.2, lane === 0 || lane === -1);
  }
  // Forward shock-ring nose
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    const px = leadX - 4 + Math.cos(a) * (6 + u * 4);
    const py = 52 + Math.sin(a) * (16 + u * 10);
    blendPx(rgba, px, py, Math.abs(Math.sin(a)) < 0.6 ? C_GOLD_HI : C_VIOLET, env * 0.82);
  }
  drawSpark4(rgba, leadX, 52, 7, env, true);
}

// Row 3: Tempest Phantom Fist Barrage Burst
function renderRow3(rgba, col) {
  const u = col / 29;
  const ph = (col / 30) * Math.PI * 2;
  const env = 0.88 + 0.12 * Math.sin(ph * 2);
  const fists = [
    { bx: 42, by: 28, sp: 1.25, gold: true },
    { bx: 58, by: 46, sp: 1.55, gold: false },
    { bx: 60, by: 62, sp: 1.45, gold: true },
    { bx: 38, by: 72, sp: 1.15, gold: false }
  ];
  for (let i = 0; i < fists.length; i++) {
    const f = fists[i];
    const phaseI = (u * 2.0 + i * 0.25) % 1.0;
    const fx = f.bx - 12 + phaseI * 26;
    const fy = f.by + Math.sin(ph + i * 1.4) * 3.0;
    const fEnv = Math.sin(phaseI * Math.PI) * env;
    if (fEnv > 0.1) {
      // Crisp directional martial pressure streak behind phantom fist (0 tadpole strings!)
      for (let tx = 4; tx <= 20; tx++) {
        const w = (1 - tx / 22) * fEnv * 0.65;
        const halfH = Math.max(1, Math.round((1 - tx / 24) * 4.5));
        for (let oy = -halfH; oy <= halfH; oy++) {
          blendPx(rgba, fx - tx - 4, fy + oy, Math.abs(oy) <= 1 ? (f.gold ? C_GOLD_HI : C_ICE) : C_VIOLET, w);
        }
      }
      drawSculptedPhantomFist104(rgba, fx, fy, f.sp, fEnv, f.gold);
      // Forward impact crescent spark on punch tip
      for (let a = -0.9; a <= 0.9; a += 0.22) {
        blendPx(rgba, fx + 9 * f.sp + Math.cos(a) * 3, fy + Math.sin(a) * 9 * f.sp, f.gold ? C_GOLD : C_ICE, fEnv * 0.85);
      }
    }
  }
  drawSpark4(rgba, 66 + Math.sin(ph * 3) * 8, 52 + Math.cos(ph * 2) * 10, 6, env * 0.9, true);
}

// Row 4: Heaven-Splitting Raijin Storm Pillar
function renderRow4(rgba, col) {
  const u = col / 29;
  const env = u < 0.12 ? 0.55 + 0.45 * (u / 0.12) : u > 0.82 ? Math.max(0.14, 1 - (u - 0.82) / 0.2) : 1.0;
  const cx = 52;
  const halfW = (11 + 8 * Math.sin(u * Math.PI)) * (0.8 + 0.2 * Math.sin(col * 1.7));
  for (let y = 10; y < 94; y++) {
    const sway = Math.sin(y * 0.16 + col * 0.9) * 3.2;
    const endFade = Math.min(1, (y - 8) / 10, (96 - y) / 10);
    for (let x = 16; x < 88; x++) {
      const d = Math.abs(x - (cx + sway));
      if (d > halfW + 6) continue;
      const core = Math.max(0, 1 - d / Math.max(2, halfW));
      if (core > 0.02) {
        const rgb = core > 0.74 ? C_WHITE : core > 0.46 ? C_GOLD_HI : core > 0.22 ? C_GOLD : C_VIOLET;
        blendPx(rgba, x, y, rgb, core * endFade * env * 0.95);
      }
    }
  }
  drawBolt(rgba, cx - 10, 12, cx - 4, 92, col * 5.3, 6.2, env, 1.8, true);
  drawBolt(rgba, cx + 10, 12, cx + 4, 92, col * 5.9 + 2, 6.0, env, 1.6, false);
  drawBolt(rgba, cx, 72, cx - 26, 90, col * 7.1, 4.0, env * 0.85, 1.2, true);
  drawBolt(rgba, cx, 72, cx + 26, 90, col * 7.7, 4.0, env * 0.85, 1.2, true);
}

// Row 5: Thunder-Crater Ground Shatter Seal
function renderRow5(rgba, col) {
  const u = col / 29;
  const env = u < 0.1 ? 0.65 + 0.35 * (u / 0.1) : Math.max(0.12, 1 - Math.max(0, u - 0.65) / 0.38);
  const cx = 52;
  const cy = 62;
  const rx = 14 + u * 29;
  const ry = 6 + u * 11;
  // Perspective ground shockwave rings
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    for (let dr = -2.2; dr <= 2.2; dr += 0.7) {
      const rgb = Math.abs(dr) < 0.7 ? C_WHITE : Math.abs(dr) < 1.4 ? C_GOLD : C_VIOLET;
      blendPx(rgba, cx + ca * (rx + dr * 1.4), cy + sa * (ry + dr * 0.7), rgb, env * (1 - Math.abs(dr) / 2.6));
    }
  }
  // 8 jagged radial lightning cracks & dark-indigo rock splinters bursting upward
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + u * 0.25;
    drawBolt(rgba, cx + Math.cos(a) * 6, cy + Math.sin(a) * 3, cx + Math.cos(a) * (rx + 4), cy + Math.sin(a) * (ry + 3), col * 2 + k * 7, 2.4, env * 0.9, 1.2, k % 2 === 0);
    // Flying dark pixel rock shard
    const sx = cx + Math.cos(a) * (10 + u * 26);
    const sy = cy - 4 - Math.sin(u * Math.PI) * (18 + (k % 3) * 8) + Math.sin(a) * 6;
    blendPx(rgba, sx, sy, C_DEEP, env);
    blendPx(rgba, sx + 1, sy, C_INDIGO, env);
    blendPx(rgba, sx, sy + 1, C_GOLD, env * 0.8);
  }
}

// Row 6: Iron-Body Static Parry Flare
function renderRow6(rgba, col) {
  const u = col / 29;
  const env = Math.max(0.16, Math.sin(u * Math.PI) * 0.9 + 0.14);
  const cx = 52;
  const cy = 52;
  const arm = 12 + u * 24;
  // Crisp diamond cross-starburst (Pass 1 indigo -> Pass 2 gold -> Pass 3 white)
  for (let y = 12; y < 92; y++) {
    for (let x = 12; x < 92; x++) {
      const dx = Math.abs(x - cx);
      const dy = Math.abs(y - cy);
      const manh = dx + dy;
      const cross = Math.min(dx, dy);
      if (cross <= 4 && Math.max(dx, dy) <= arm) {
        const f = (1 - Math.max(dx, dy) / arm) * (1 - cross / 5) * env;
        const rgb = cross <= 1 ? C_WHITE : cross <= 2 ? C_GOLD_HI : C_VIOLET;
        blendPx(rgba, x, y, rgb, f * 1.2);
      } else if (Math.abs(manh - (10 + u * 22)) <= 2.4) {
        blendPx(rgba, x, y, manh < 10 + u * 22 ? C_GOLD : C_VIOLET, env * 0.85);
      }
    }
  }
  drawBolt(rgba, cx - 18, cy - 18, cx + 18, cy + 18, col * 3.7, 3.2, env * 0.9, 1.3, true);
  drawBolt(rgba, cx + 18, cy - 18, cx - 18, cy + 18, col * 4.3, 3.2, env * 0.9, 1.3, false);
}

// Row 7: Raijin Storm-Crest Mandala Aura
function renderRow7(rgba, col) {
  const u = col / 30;
  const ph = u * Math.PI * 2;
  const cx = 51.5;
  const cy = 51.5;
  const rOuter = 34;
  const rInner = 22;
  for (let y = 10; y < 94; y++) {
    for (let x = 10; x < 94; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.hypot(dx, dy);
      const ang = Math.atan2(dy, dx);
      if (Math.abs(r - rOuter) <= 2.6) {
        const pulse = 0.72 + 0.28 * Math.sin(ang * 6 - ph * 2);
        const rgb = Math.abs(r - rOuter) < 0.9 ? C_GOLD_HI : C_VIOLET;
        blendPx(rgba, x, y, rgb, pulse * 0.92);
      } else if (Math.abs(r - rInner) <= 2.0) {
        const pulse = 0.75 + 0.25 * Math.cos(ang * 3 + ph * 3);
        blendPx(rgba, x, y, Math.abs(r - rInner) < 0.8 ? C_WHITE : C_GOLD, pulse * 0.88);
      }
    }
  }
  // 3 orbiting Raijin thunder-drum tomoe nodes connected by golden lightning arcs!
  const nodes = [];
  for (let k = 0; k < 3; k++) {
    const a = ph + (k * Math.PI * 2) / 3;
    const nx = cx + Math.cos(a) * 28;
    const ny = cy + Math.sin(a) * 28;
    nodes.push([nx, ny]);
    for (let oy = -4; oy <= 4; oy++) {
      for (let ox = -4; ox <= 4; ox++) {
        const d = Math.hypot(ox, oy);
        if (d <= 4.2) {
          blendPx(rgba, nx + ox, ny + oy, d < 1.6 ? C_WHITE : d < 3.0 ? C_GOLD : C_INDIGO, 0.95);
        }
      }
    }
  }
  for (let k = 0; k < 3; k++) {
    const [ax, ay] = nodes[k];
    const [bx, by] = nodes[(k + 1) % 3];
    drawBolt(rgba, ax, ay, bx, by, col * 3 + k * 9, 3.8, 0.88, 1.3, true);
  }
}

function applyRadialEnvelopeAndSafeMargin(rgba) {
  const cx = (LOG - 1) * 0.5;
  const cy = (LOG - 1) * 0.5;
  for (let y = 0; y < LOG; y++) {
    for (let x = 0; x < LOG; x++) {
      const o = (y * LOG + x) * 4;
      let a = rgba[o + 3];
      if (!a) continue;
      const distC = Math.hypot(x - cx, y - cy);
      let rMul = 1.0;
      if (distC >= 48.0) rMul = 0.0;
      else if (distC > 36.0) rMul = 0.5 * (1 + Math.cos(((distC - 36.0) / 12.0) * Math.PI));
      const dEdge = Math.min(x, y, LOG - 1 - x, LOG - 1 - y);
      let mMul = 1.0;
      if (dEdge < 3) mMul = 0.0;
      else if (dEdge < 7) mMul = (dEdge - 2.0) / 5.0;
      a = Math.round(a * rMul * mMul);
      if (a <= 2) {
        rgba[o] = rgba[o + 1] = rgba[o + 2] = rgba[o + 3] = 0;
      } else {
        rgba[o + 3] = a;
      }
    }
  }
}

function blitUpscaledNearest(src, dst, dstW, dstX, dstY) {
  for (let sy = 0; sy < LOG; sy++) {
    for (let sx = 0; sx < LOG; sx++) {
      const so = (sy * LOG + sx) * 4;
      const a = src[so + 3];
      if (!a) continue;
      const r = src[so], g = src[so + 1], b = src[so + 2];
      for (let dy = 0; dy < 2; dy++) {
        const ty = dstY + sy * 2 + dy;
        for (let dx = 0; dx < 2; dx++) {
          const to = (ty * dstW + dstX + sx * 2 + dx) * 4;
          dst[to] = r; dst[to + 1] = g; dst[to + 2] = b; dst[to + 3] = a;
        }
      }
    }
  }
}

function has4pxBorderClip(cell208) {
  for (let y = 0; y < CELL; y++) {
    for (let x = 0; x < CELL; x++) {
      if (x >= 4 && x < CELL - 4 && y >= 4 && y < CELL - 4) continue;
      if (cell208[(y * CELL + x) * 4 + 3] > 0) return true;
    }
  }
  return false;
}

function alphaComposite(src, dst, dstW, dstX, dstY) {
  for (let sy = 0; sy < CELL; sy++) {
    for (let sx = 0; sx < CELL; sx++) {
      const so = (sy * CELL + sx) * 4;
      const sa = src[so + 3] / 255;
      if (sa <= 0) continue;
      const to = ((dstY + sy) * dstW + dstX + sx) * 4;
      const da = dst[to + 3] / 255;
      const outA = sa + da * (1 - sa);
      if (outA <= 0) continue;
      dst[to] = Math.round((src[so] * sa + dst[to] * da * (1 - sa)) / outA);
      dst[to + 1] = Math.round((src[so + 1] * sa + dst[to + 1] * da * (1 - sa)) / outA);
      dst[to + 2] = Math.round((src[so + 2] * sa + dst[to + 2] * da * (1 - sa)) / outA);
      dst[to + 3] = Math.round(outA * 255);
    }
  }
}

function bakeBrawlerExVfx() {
  const sheetW = COLS * CELL;
  const sheetH = ROWS * CELL;
  const sheetRgba = new Uint8Array(sheetW * sheetH * 4);
  const sampleCols = [0, 4, 9, 14, 19, 24, 28];
  const qaW = sampleCols.length * CELL;
  const qaH = ROWS * CELL;
  const qaRgba = new Uint8Array(qaW * qaH * 4);
  for (let i = 0; i < qaW * qaH; i++) {
    qaRgba[i * 4] = 12; qaRgba[i * 4 + 1] = 16; qaRgba[i * 4 + 2] = 34; qaRgba[i * 4 + 3] = 255;
  }

  const fns = [renderRow0, renderRow1, renderRow2, renderRow3, renderRow4, renderRow5, renderRow6, renderRow7];
  const cell104 = new Uint8Array(LOG * LOG * 4);
  const prev104 = new Uint8Array(LOG * LOG * 4);
  const cell208 = new Uint8Array(CELL * CELL * 4);
  let borderClips = 0;

  for (let r = 0; r < ROWS; r++) {
    let transitions = 0;
    for (let c = 0; c < COLS; c++) {
      cell104.fill(0);
      fns[r](cell104, c);
      applyRadialEnvelopeAndSafeMargin(cell104);

      if (c > 0) {
        let diff = false;
        for (let k = 0; k < cell104.length; k += 4) {
          if (cell104[k + 3] !== prev104[k + 3] || cell104[k] !== prev104[k]) {
            diff = true;
            break;
          }
        }
        if (diff) transitions++;
      }
      prev104.set(cell104);

      cell208.fill(0);
      blitUpscaledNearest(cell104, cell208, CELL, 0, 0);
      if (has4pxBorderClip(cell208)) borderClips++;
      blitUpscaledNearest(cell104, sheetRgba, sheetW, c * CELL, r * CELL);

      const si = sampleCols.indexOf(c);
      if (si >= 0) alphaComposite(cell208, qaRgba, qaW, si * CELL, r * CELL);
    }
    if (transitions !== 29) {
      throw new Error(`[brawler_ex_vfx] Row ${r} transitions=${transitions} != 29`);
    }
  }

  const outPath = path.join(REPO_ROOT, 'assets/sprites/brawler_ex_vfx.png');
  fs.writeFileSync(outPath, encodeRgbaPng(sheetW, sheetH, sheetRgba));
  fs.mkdirSync(SCRATCH_DIR, { recursive: true });
  const dbgPath = path.join(SCRATCH_DIR, 'debug_brawler_ex_vfx.png');
  fs.writeFileSync(dbgPath, encodeRgbaPng(qaW, qaH, qaRgba));
  console.log(`[OK] brawler_ex_vfx: ${outPath} (${sheetW}x${sheetH}) | borderClips=${borderClips}/240 | 29/29 all rows`);
  if (borderClips > 0) process.exitCode = 1;
}

bakeBrawlerExVfx();
