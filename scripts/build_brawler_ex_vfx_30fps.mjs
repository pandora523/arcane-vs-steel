#!/usr/bin/env node
/**
 * Next-Gen 30fps RAZOR-SHARP 4-Tone HD-2D Pixel VFX Sheet Builder for:
 *   RAIJIN EX -- "THE TEMPEST FIST" (`brawler_ex`)
 *
 * Pure hard-edged quantized pixel art (`104x104` logical -> `2x` NEAREST -> `208x208`),
 * ZERO muddy soft gradients, ZERO smooth vector / rotation calls, `0/240` 4px border clips, `29/29` transitions!
 *
 * Row Layout (`0..7`, 30fps each, crisp high-contrast storm-gold + electric-azure + royal-indigo palette):
 *   Row 0: Razor 4-Band Tapered Golden-White Thunderclap Crescent Arc (Beat 1/2/4 & Impact)
 *   Row 1: Crisp Twin-Helix Sky-Breaker Lightning Vortex (Beat 3 Uppercut & Ult Climax)
 *   Row 2: High-Speed Horizontal Thunderstep Lightning Wind-Streaks (SKILL & Dash)
 *   Row 3: Sculpted Giant Energy Punch-Fists + Motion Cones (ULTIMATE: TEMPEST HUNDRED FISTS)
 *   Row 4: Blinding White-Gold / Electric-Azure Heaven-Splitting Raijin Sky-Bolt Pillar (TRUE_ULTIMATE)
 *   Row 5: Radial Shattered Thunder-Crater Shockwave & Flying Pixel Rock/Lightning Shards
 *   Row 6: Razor 4-Point Golden-Azure Iron-Guard Parry Starburst
 *   Row 7: Spinning Raijin Tomoe Drum Storm-Crest Mandala (3 Golden Tomoe + Crackling Arcs)
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const LOG = 104;
const CELL = 208;
const ROWS = 8;
const COLS = 30;
const SAFE = 3; // >= 6px output margin on 208x208 (`0/240` border clips guaranteed!)

// Crisp 4-tone anime HD-2D storm palette (ZERO muddy brown/gray midtones!)
const C_OUTLINE = [20, 18, 66];    // #141242 deep midnight indigo selout
const C_INDIGO = [58, 52, 204];    // #3a34cc vivid royal storm indigo
const C_AZURE = [56, 189, 248];    // #38bdf8 electric thunder cyan-azure
const C_SKY = [186, 230, 253];     // #bae6fd crackling white-blue spark
const C_AMBER = [245, 158, 11];    // #f59e0b rich golden amber
const C_GOLD = [251, 191, 36];     // #fbbf24 radiant storm gold
const C_GOLD_HI = [254, 240, 138]; // #fef08a blazing pale gold
const C_WHITE = [255, 255, 255];   // #ffffff blinding lightning core

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

// Crisp hard-pixel plotter (snaps alpha to clean Bayer / solid steps — ZERO blurry haze!)
function putPx(rgba, x, y, rgb, alpha = 255) {
  const ix = Math.round(x);
  const iy = Math.round(y);
  if (ix < SAFE || ix >= LOG - SAFE || iy < SAFE || iy >= LOG - SAFE || alpha <= 16) return;
  const o = (iy * LOG + ix) * 4;
  if (alpha >= 240 || rgba[o + 3] === 0) {
    rgba[o] = rgb[0];
    rgba[o + 1] = rgb[1];
    rgba[o + 2] = rgb[2];
    rgba[o + 3] = Math.max(rgba[o + 3], Math.min(255, Math.round(alpha)));
  } else {
    const sa = alpha / 255;
    const da = rgba[o + 3] / 255;
    const outA = sa + da * (1 - sa);
    rgba[o] = Math.round((rgb[0] * sa + rgba[o] * da * (1 - sa)) / outA);
    rgba[o + 1] = Math.round((rgb[1] * sa + rgba[o + 1] * da * (1 - sa)) / outA);
    rgba[o + 2] = Math.round((rgb[2] * sa + rgba[o + 2] * da * (1 - sa)) / outA);
    rgba[o + 3] = Math.round(outA * 255);
  }
}

function drawDisk(rgba, cx, cy, r, rgb, alpha = 255) {
  const ir = Math.ceil(r);
  const r2 = r * r + 0.15;
  for (let dy = -ir; dy <= ir; dy++) {
    for (let dx = -ir; dx <= ir; dx++) {
      if (dx * dx + dy * dy <= r2) putPx(rgba, cx + dx, cy + dy, rgb, alpha);
    }
  }
}

function drawDiamond(rgba, cx, cy, rx, ry, rgb, alpha = 255) {
  const irx = Math.ceil(rx);
  const iry = Math.ceil(ry);
  for (let dy = -iry; dy <= iry; dy++) {
    for (let dx = -irx; dx <= irx; dx++) {
      if (Math.abs(dx) / Math.max(0.5, rx) + Math.abs(dy) / Math.max(0.5, ry) <= 1.05) {
        putPx(rgba, cx + dx, cy + dy, rgb, alpha);
      }
    }
  }
}

function drawStar4(rgba, cx, cy, arm, rgbCore = C_WHITE, rgbRim = C_GOLD) {
  for (let i = -arm; i <= arm; i++) {
    const col = Math.abs(i) <= Math.ceil(arm * 0.45) ? rgbCore : rgbRim;
    putPx(rgba, cx + i, cy, col, 255);
    putPx(rgba, cx, cy + i, col, 255);
  }
  putPx(rgba, cx - 1, cy - 1, rgbRim, 230);
  putPx(rgba, cx + 1, cy - 1, rgbRim, 230);
  putPx(rgba, cx - 1, cy + 1, rgbRim, 230);
  putPx(rgba, cx + 1, cy + 1, rgbRim, 230);
}

function drawCrispBolt(rgba, x0, y0, x1, y1, seed, jag, coreW = 1, rimCol = C_AZURE, coreCol = C_WHITE, midCol = C_GOLD_HI) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const ln = Math.max(1, Math.hypot(dx, dy));
  const nx = -dy / ln;
  const ny = dx / ln;
  const segs = Math.max(4, Math.min(12, Math.round(ln / 6.5)));
  const pts = [[x0, y0]];
  for (let i = 1; i < segs; i++) {
    const u = i / segs;
    const h = Math.sin((seed * 7.3 + i * 19.7) * 12.9898) * 43758.5453;
    const j = ((h - Math.floor(h)) * 2 - 1) * jag * Math.sin(u * Math.PI);
    pts.push([x0 + dx * u + nx * j, y0 + dy * u + ny * j]);
  }
  pts.push([x1, y1]);

  const trace = (rad, col, a) => {
    for (let s = 0; s < pts.length - 1; s++) {
      const [ax, ay] = pts[s];
      const [bx, by] = pts[s + 1];
      const st = Math.max(2, Math.ceil(Math.hypot(bx - ax, by - ay) * 1.6));
      for (let k = 0; k <= st; k++) {
        const t = k / st;
        drawDisk(rgba, ax + (bx - ax) * t, ay + (by - ay) * t, rad, col, a);
      }
    }
  };
  trace(coreW + 1.5, C_INDIGO, 220);
  trace(coreW + 0.8, rimCol, 245);
  trace(Math.max(0.5, coreW * 0.65), midCol, 255);
  trace(Math.max(0.4, coreW * 0.35), coreCol, 255);
}

// ============================================================================
// ROW 0: RAZOR 4-BAND TAPERED GOLDEN-WHITE THUNDERCLAP CRESCENT ARC
// ============================================================================
function renderRow0(rgba, col) {
  const u = col / 29;
  const env = u < 0.14 ? u / 0.14 : Math.max(0, 1 - Math.max(0, u - 0.56) / 0.44);
  if (env <= 0.04) {
    putPx(rgba, 52 + (col % 3), 52, C_GOLD_HI, 180);
    return;
  }
  const cx = 34 + u * 20;
  const cy = 52;
  const rx = 20 + u * 22;
  const ry = 28 + u * 16;
  const maxHalfAng = (1.18 - u * 0.25) * Math.PI * 0.65;
  const maxThick = (10.5 - u * 5.2) * (0.45 + 0.55 * env);

  for (let y = SAFE; y < LOG - SAFE; y++) {
    for (let x = SAFE; x < LOG - SAFE; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const ang = Math.atan2(dy, dx);
      if (Math.abs(ang) > maxHalfAng) continue;
      const tipTaper = Math.cos((ang / maxHalfAng) * (Math.PI * 0.5));
      if (tipTaper <= 0.04) continue;
      const nr = Math.hypot(dx / rx, dy / ry);
      const thickNorm = (maxThick * tipTaper) / ((rx + ry) * 0.5);
      const rIn = 1.0 - thickNorm;
      const rOut = 1.0 + thickNorm * 0.35;
      if (nr < rIn || nr > rOut) continue;
      const v = (nr - rIn) / Math.max(0.01, rOut - rIn);
      // Bayer dither tail fade only on fading end frames
      if (env < 0.55 && ((x + y) & 1) === 1 && v < 0.45) continue;
      let colRgb = C_INDIGO;
      if (v > 0.78) colRgb = C_WHITE;
      else if (v > 0.52) colRgb = C_GOLD_HI;
      else if (v > 0.26) colRgb = C_GOLD;
      else if (v > 0.12) colRgb = C_AZURE;
      putPx(rgba, x, y, colRgb, 255);
    }
  }
  // Crisp forward electric spark-tips & star glint
  drawCrispBolt(rgba, cx + rx * 0.78, cy - ry * 0.52, cx + rx * 0.96, cy + ry * 0.52, col + 3, 5.5, 0.7, C_AZURE, C_WHITE, C_GOLD_HI);
  if (env > 0.35) {
    drawStar4(rgba, cx + rx + 2, cy + Math.round(Math.sin(u * 14) * 6), Math.round(3 + env * 3), C_WHITE, C_GOLD);
  }
}

// ============================================================================
// ROW 1: CRISP TWIN-HELIX SKY-BREAKER RISING LIGHTNING VORTEX
// ============================================================================
function renderRow1(rgba, col) {
  const u = col / 29;
  const env = u < 0.14 ? u / 0.14 : Math.max(0, 1 - Math.max(0, u - 0.62) / 0.38);
  const topY = 8 + Math.round((1 - Math.min(1, u * 2.2)) * 28);
  const botY = 96;
  const cx = 52;
  const rad = (11 + Math.sin(u * Math.PI) * 14) * (0.4 + 0.6 * env);

  // Crisp twin braided golden-white & electric-azure rising helices
  for (let y = topY; y <= botY; y++) {
    const f = (y - topY) / Math.max(1, botY - topY);
    const taper = Math.sin(f * Math.PI);
    const a1 = f * Math.PI * 4.5 - u * Math.PI * 6.0;
    const x1 = cx + Math.cos(a1) * rad * taper;
    const x2 = cx - Math.cos(a1) * rad * taper;
    const w = Math.max(1, 2.2 * taper * env);
    drawDisk(rgba, x1, y, w + 0.9, C_INDIGO, 240);
    drawDisk(rgba, x1, y, w, C_GOLD, 255);
    putPx(rgba, x1, y, C_WHITE, 255);

    drawDisk(rgba, x2, y, w + 0.8, C_OUTLINE, 230);
    drawDisk(rgba, x2, y, w * 0.9, C_AZURE, 255);
    putPx(rgba, x2, y, C_SKY, 255);
  }
  // Razor central ascending bolt
  drawCrispBolt(rgba, cx, botY - 2, cx, topY + 2, col * 3 + 5, 6.2, 1.1 * env + 0.4, C_GOLD, C_WHITE, C_GOLD_HI);
  // Rising diamond spark flakes
  for (let i = 0; i < 6; i++) {
    const py = botY - (((u * 120 + i * 17) % (botY - topY + 12)));
    const px = cx + Math.sin(i * 2.7 + col * 0.7) * (rad + 7);
    drawDiamond(rgba, px, py, 2, 3, i % 2 === 0 ? C_GOLD_HI : C_SKY, 245);
  }
}

// ============================================================================
// ROW 2: SLEEK HIGH-SPEED HORIZONTAL THUNDERSTEP WIND-STREAKS
// ============================================================================
function renderRow2(rgba, col) {
  const u = col / 29;
  const env = u < 0.14 ? u / 0.14 : Math.max(0, 1 - Math.max(0, u - 0.62) / 0.38);
  const headX = 32 + u * 62;
  const lanes = [-20, -10, 0, 10, 20];
  for (let i = 0; i < lanes.length; i++) {
    const ly = 52 + lanes[i] + Math.round(Math.sin(col * 0.8 + i) * 1.5);
    const len = (36 - Math.abs(lanes[i]) * 0.65) * (0.55 + 0.45 * env);
    const x0 = Math.max(SAFE + 2, headX - len);
    const x1 = Math.min(LOG - SAFE - 2, headX - Math.abs(lanes[i]) * 0.35);
    if (x1 <= x0 + 3) continue;
    const isCenter = i === 2;
    for (let x = Math.round(x0); x <= Math.round(x1); x++) {
      const f = (x - x0) / Math.max(1, x1 - x0);
      if (f < 0.25 && ((x + ly) & 1) === 1) continue;
      const halfH = isCenter ? (f > 0.6 ? 2 : 1) : f > 0.55 ? 1 : 0;
      for (let dy = -halfH; dy <= halfH; dy++) {
        const c =
          dy === 0 && f > 0.55
            ? C_WHITE
            : isCenter
              ? f > 0.3
                ? C_GOLD_HI
                : C_GOLD
              : i % 2 === 0
                ? C_AZURE
                : C_INDIGO;
        putPx(rgba, x, ly + dy, c, 255);
      }
    }
  }
  drawCrispBolt(rgba, Math.max(8, headX - 44), 52, Math.min(96, headX), 52, col * 5 + 1, 5.2, 0.9, C_GOLD, C_WHITE, C_GOLD_HI);
  drawStar4(rgba, Math.min(95, headX), 52, Math.round(3 + env * 3), C_WHITE, C_GOLD);
}

// ============================================================================
// ROW 3: SCULPTED GIANT PIXEL ENERGY PUNCH-FISTS + TAPERED MOTION CONES
// ============================================================================
function drawEnergyFist104(rgba, fx, fy, scale, isGold) {
  const cOut = C_OUTLINE;
  const cMid = isGold ? C_AMBER : C_INDIGO;
  const cLit = isGold ? C_GOLD : C_AZURE;
  const cHi = isGold ? C_GOLD_HI : C_SKY;

  // Tapered anime kinetic punch cone trailing behind the fist
  const coneLen = Math.round(28 * scale);
  for (let dx = -coneLen; dx <= 0; dx++) {
    const f = 1 + dx / coneLen; // 0 at tail -> 1 at fist
    const halfH = Math.max(1, Math.round(f * 7.5 * scale));
    if (f < 0.35 && ((Math.round(fx + dx)) & 1) === 1) continue;
    for (let dy = -halfH; dy <= halfH; dy++) {
      const edge = Math.abs(dy) >= halfH - 1;
      const col = edge ? cMid : Math.abs(dy) <= Math.ceil(halfH * 0.35) ? C_WHITE : f > 0.6 ? cHi : cLit;
      putPx(rgba, fx + dx, fy + dy, col, 255);
    }
  }

  // Sculpted blocky pixel fist with 4 distinct knuckle ridges + tucked thumb!
  const s = scale;
  const fillBox = (x0, y0, x1, y1, col) => {
    for (let y = Math.round(fy + y0 * s); y <= Math.round(fy + y1 * s); y++) {
      for (let x = Math.round(fx + x0 * s); x <= Math.round(fx + x1 * s); x++) {
        putPx(rgba, x, y, col, 255);
      }
    }
  };
  // Outer indigo/dark rim
  fillBox(-7, -8, 9, 8, cOut);
  // Main fist body
  fillBox(-6, -7, 7, 7, cMid);
  fillBox(-4, -6, 6, 5, cLit);
  // 4 sculpted knuckle bumps along the leading strike face (+X)
  for (const ky of [-5, -2, 1, 4]) {
    fillBox(5, ky - 1, 9, ky + 1, cHi);
    putPx(rgba, fx + 9 * s, fy + ky * s, C_WHITE, 255);
  }
  // Tucked thumb silhouette on lower-front edge
  fillBox(-2, 5, 5, 8, cLit);
  // Blinding front impact crescent
  for (let dy = -7; dy <= 7; dy++) {
    const cxOff = Math.round((10.5 - (dy * dy) / 22) * s);
    putPx(rgba, fx + cxOff, fy + dy * s, Math.abs(dy) <= 3 ? C_WHITE : cHi, 255);
  }
}

function renderRow3(rgba, col) {
  const u = col / 29;
  const fists = [
    { ox: -4, oy: -22, phase: 0.0, gold: true, sc: 0.92 },
    { ox: 8, oy: 0, phase: 0.33, gold: false, sc: 1.08 },
    { ox: -2, oy: 22, phase: 0.66, gold: true, sc: 0.94 }
  ];
  for (let i = 0; i < fists.length; i++) {
    const f = fists[i];
    const cyc = (u * 2.2 + f.phase) % 1.0;
    const fx = 34 + cyc * 46 + f.ox;
    const fy = 52 + f.oy + Math.sin(col * 0.9 + i * 2) * 2.0;
    drawEnergyFist104(rgba, fx, fy, f.sc, f.gold);
  }
  // Crackling forward lightning arc connecting the flurry
  drawCrispBolt(rgba, 22, 52, 92, 52 + Math.sin(col) * 14, col * 7, 7.0, 0.8, C_AZURE, C_WHITE, C_GOLD_HI);
}

// ============================================================================
// ROW 4: BLINDING WHITE-GOLD / ELECTRIC-AZURE HEAVEN-SPLITTING RAIJIN PILLAR
// ============================================================================
function renderRow4(rgba, col) {
  const u = col / 29;
  const env = u < 0.12 ? u / 0.12 : Math.max(0, 1 - Math.max(0, u - 0.68) / 0.32);
  const cx = 52;
  const halfW = Math.max(3, (17.5 * (0.45 + 0.55 * env)) * (0.9 + 0.12 * Math.sin(col * 1.4)));

  // Crisp 4-band vertical thunder column (ZERO muddy brown fog!)
  for (let y = SAFE + 1; y < LOG - SAFE - 1; y++) {
    const fy = (y - SAFE) / (LOG - SAFE * 2);
    const sway = Math.sin(y * 0.22 + col * 1.1) * 2.2;
    const flare = fy > 0.82 ? 1.0 + ((fy - 0.82) / 0.18) * 0.85 : 1.0;
    const w = halfW * flare;
    const xStart = Math.max(SAFE, Math.round(cx + sway - w));
    const xEnd = Math.min(LOG - SAFE - 1, Math.round(cx + sway + w));
    for (let x = xStart; x <= xEnd; x++) {
      const dist = Math.abs(x - (cx + sway)) / Math.max(1, w);
      if (env < 0.5 && ((x + y) & 1) === 1 && dist > 0.55) continue;
      let rgb = C_INDIGO;
      if (dist < 0.28) rgb = C_WHITE;
      else if (dist < 0.52) rgb = C_GOLD_HI;
      else if (dist < 0.74) rgb = C_GOLD;
      else if (dist < 0.88) rgb = C_AZURE;
      putPx(rgba, x, y, rgb, 255);
    }
  }

  // Twin crackling zig-zag hyper-bolts spiraling around the blinding core + branching ground forks!
  drawCrispBolt(rgba, cx - 4, 6, cx + 2, 95, col * 3 + 1, 9.0, 1.3, C_AZURE, C_WHITE, C_GOLD_HI);
  drawCrispBolt(rgba, cx + 6, 8, cx - 3, 94, col * 5 + 9, 8.5, 0.9, C_GOLD, C_WHITE, C_SKY);
  // Ground impact forks flaring left & right
  drawCrispBolt(rgba, cx, 88, cx - 34, 96, col * 7 + 2, 4.5, 0.8, C_AZURE, C_WHITE, C_GOLD_HI);
  drawCrispBolt(rgba, cx, 88, cx + 34, 96, col * 7 + 5, 4.5, 0.8, C_AZURE, C_WHITE, C_GOLD_HI);
  // Crisp golden spark diamonds shooting upward along column edges
  for (let i = 0; i < 8; i++) {
    const sy = 94 - (((col * 5 + i * 13) % 84));
    const side = i % 2 === 0 ? -1 : 1;
    const sx = cx + side * (halfW + 4 + ((i * 3) % 8));
    drawDiamond(rgba, sx, sy, 2, 3, i % 2 === 0 ? C_WHITE : C_GOLD_HI, 255);
  }
}

// ============================================================================
// ROW 5: RADIAL SHATTERED THUNDER-CRATER SHOCKWAVE & FLYING PIXEL SHARDS
// ============================================================================
function renderRow5(rgba, col) {
  const u = col / 29;
  const env = u < 0.12 ? u / 0.12 : Math.max(0, 1 - Math.max(0, u - 0.62) / 0.38);
  const cx = 52;
  const cy = 62;
  const rx = 14 + u * 34;
  const ry = 6 + u * 15;

  // Crisp double elliptical golden-white & electric-azure shockwave ring
  for (let y = SAFE; y < LOG - SAFE; y++) {
    for (let x = SAFE; x < LOG - SAFE; x++) {
      const r = Math.hypot((x - cx) / rx, (y - cy) / ry);
      if (r >= 0.72 && r <= 1.08) {
        if (env < 0.5 && ((x + y) & 1) === 1) continue;
        const c = r > 0.94 ? C_INDIGO : r > 0.84 ? C_WHITE : r > 0.78 ? C_GOLD_HI : C_AZURE;
        putPx(rgba, x, y, c, 255);
      }
    }
  }
  // 8 jagged radial crater lightning fissures
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + 0.18;
    const x1 = cx + Math.cos(ang) * (rx * 0.96);
    const y1 = cy + Math.sin(ang) * (ry * 0.96);
    drawCrispBolt(rgba, cx, cy, x1, y1, col * 3 + i * 7, 3.2, 0.7, C_AZURE, C_WHITE, C_GOLD_HI);
  }
  // Erupting pixel rock chunks & golden lightning sparks arcing upward!
  for (let i = 0; i < 10; i++) {
    const dir = (i % 2 === 0 ? 1 : -1) * (0.35 + (i % 5) * 0.18);
    const px = cx + dir * (14 + u * 36);
    const py = cy - Math.sin(Math.min(1, u * 1.25) * Math.PI) * (24 + (i % 4) * 11) + (i % 3) * 3;
    drawDiamond(rgba, px, py, i % 3 === 0 ? 3 : 2, 2, i % 2 === 0 ? C_GOLD_HI : C_SKY, 255);
    putPx(rgba, px, py, C_WHITE, 255);
  }
}

// ============================================================================
// ROW 6: RAZOR 4-POINT GOLDEN-AZURE IRON-GUARD PARRY STARBURST
// ============================================================================
function renderRow6(rgba, col) {
  const u = col / 29;
  const env = u < 0.18 ? u / 0.18 : Math.max(0, 1 - Math.max(0, u - 0.52) / 0.48);
  const cx = 52;
  const cy = 52;
  const arm = Math.round((12 + u * 30) * (0.4 + 0.6 * env));

  // Crisp 4-point diamond flare + diagonal cross-sparks
  for (let i = -arm; i <= arm; i++) {
    const f = 1 - Math.abs(i) / Math.max(1, arm);
    const thick = Math.max(0, Math.round(f * 3.2));
    const colRgb = f > 0.65 ? C_WHITE : f > 0.35 ? C_GOLD_HI : C_GOLD;
    for (let d = -thick; d <= thick; d++) {
      putPx(rgba, cx + i, cy + d, Math.abs(d) === thick ? C_AZURE : colRgb, 255);
      putPx(rgba, cx + d, cy + i, Math.abs(d) === thick ? C_AZURE : colRgb, 255);
    }
  }
  const dArm = Math.round(arm * 0.62);
  for (let i = -dArm; i <= dArm; i++) {
    const colRgb = Math.abs(i) < dArm * 0.45 ? C_WHITE : C_GOLD;
    putPx(rgba, cx + i, cy + i, colRgb, 255);
    putPx(rgba, cx + i, cy - i, colRgb, 255);
  }
  drawDiamond(rgba, cx, cy, Math.max(3, Math.round(arm * 0.36)), Math.max(3, Math.round(arm * 0.36)), C_WHITE, 255);
  // 4 crisp orbiting lightning sparks for smooth 30fps shimmer across all 30 frames
  const orbR = 14 + u * 26;
  for (let k = 0; k < 4; k++) {
    const a = u * Math.PI * 3.0 + (k * Math.PI) / 2;
    const sx = cx + Math.cos(a) * orbR;
    const sy = cy + Math.sin(a) * orbR;
    drawDiamond(rgba, sx, sy, 1.5, 1.5, k % 2 === 0 ? C_GOLD_HI : C_SKY, 255);
  }
}

// ============================================================================
// ROW 7: SPINNING RAIJIN TOMOE DRUM STORM-CREST MANDALA (3 CRISP TOMOE)
// ============================================================================
function renderRow7(rgba, col) {
  const u = col / 29;
  const rot = u * Math.PI * 2;
  const cx = 52;
  const cy = 52;
  const rOuter = 38;
  const rInner = 29;

  // Crisp golden-indigo double ring
  for (let y = SAFE; y < LOG - SAFE; y++) {
    for (let x = SAFE; x < LOG - SAFE; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (Math.abs(d - rOuter) <= 2.4) {
        const colRgb = Math.abs(d - rOuter) < 0.9 ? C_GOLD_HI : Math.abs(d - rOuter) < 1.7 ? C_GOLD : C_INDIGO;
        putPx(rgba, x, y, colRgb, 255);
      } else if (Math.abs(d - rInner) <= 1.6) {
        putPx(rgba, x, y, Math.abs(d - rInner) < 0.8 ? C_SKY : C_AZURE, 255);
      }
    }
  }

  // 3 rotating Raijin Tomoe drum crests + crackling lightning links between them!
  const pts = [];
  for (let k = 0; k < 3; k++) {
    const a = rot + (k * Math.PI * 2) / 3;
    const tx = cx + Math.cos(a) * 33.5;
    const ty = cy + Math.sin(a) * 33.5;
    pts.push([tx, ty]);
    // Outer taiko drum disc
    drawDisk(rgba, tx, ty, 6.2, C_OUTLINE, 255);
    drawDisk(rgba, tx, ty, 5.2, C_GOLD, 255);
    drawDisk(rgba, tx, ty, 3.8, C_GOLD_HI, 255);
    // Crisp dark-indigo tomoe comma core
    drawDisk(rgba, tx + Math.cos(a + 1.2) * 1.4, ty + Math.sin(a + 1.2) * 1.4, 1.8, C_OUTLINE, 255);
    putPx(rgba, tx - Math.cos(a) * 1.5, ty - Math.sin(a) * 1.5, C_WHITE, 255);
  }
  for (let k = 0; k < 3; k++) {
    const [x0, y0] = pts[k];
    const [x1, y1] = pts[(k + 1) % 3];
    drawCrispBolt(rgba, x0, y0, x1, y1, col * 5 + k * 11, 4.2, 0.7, C_AZURE, C_WHITE, C_GOLD_HI);
  }
}

function enforceSafeMargin(rgba) {
  for (let y = 0; y < LOG; y++) {
    for (let x = 0; x < LOG; x++) {
      if (x < SAFE || x >= LOG - SAFE || y < SAFE || y >= LOG - SAFE) {
        const o = (y * LOG + x) * 4;
        rgba[o] = 0; rgba[o + 1] = 0; rgba[o + 2] = 0; rgba[o + 3] = 0;
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
  const args = process.argv.slice(2);
  let qaDir = null;
  const qi = args.indexOf('--qa-dir');
  if (qi >= 0 && args[qi + 1]) qaDir = args[qi + 1];

  const sheetW = COLS * CELL;
  const sheetH = ROWS * CELL;
  const sheetRgba = new Uint8Array(sheetW * sheetH * 4);
  const sampleCols = [2, 8, 14, 20, 26];
  const qaW = sampleCols.length * CELL;
  const qaH = ROWS * CELL;
  const qaRgba = qaDir ? new Uint8Array(qaW * qaH * 4) : null;
  if (qaRgba) {
    for (let i = 0; i < qaW * qaH; i++) {
      qaRgba[i * 4] = 12; qaRgba[i * 4 + 1] = 16; qaRgba[i * 4 + 2] = 34; qaRgba[i * 4 + 3] = 255;
    }
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
      enforceSafeMargin(cell104);

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

      if (qaRgba) {
        const si = sampleCols.indexOf(c);
        if (si >= 0) alphaComposite(cell208, qaRgba, qaW, si * CELL, r * CELL);
      }
    }
    if (transitions !== 29) {
      throw new Error(`[brawler_ex_vfx] Row ${r} transitions=${transitions} != 29`);
    }
  }

  const outPath = path.join(REPO_ROOT, 'assets/sprites/brawler_ex_vfx.png');
  fs.writeFileSync(outPath, encodeRgbaPng(sheetW, sheetH, sheetRgba));
  if (qaDir && qaRgba) {
    fs.mkdirSync(qaDir, { recursive: true });
    fs.writeFileSync(path.join(qaDir, 'brawler_vfx_check_v2.png'), encodeRgbaPng(qaW, qaH, qaRgba));
  }
  console.log(`[OK] brawler_ex_vfx: ${outPath} (${sheetW}x${sheetH}) | borderClips=${borderClips}/240 | 29/29 all rows`);
  if (borderClips > 0) process.exitCode = 1;
}

bakeBrawlerExVfx();
