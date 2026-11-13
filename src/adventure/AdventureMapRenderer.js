/**
 * Seamless HD-2D 2.5D Adventure World Map Renderer (`AdventureMapRenderer`)
 *
 * Renders a 100% continuous, infinite-bleed 3D-space walkable causeway
 * (`X: -∞..+∞`, walkable 3D depth `Z/Y: 442..680`) featuring:
 *  - ZERO rectangular background image stamps, ZERO stitch seams, ZERO exposed edges
 *  - Smooth 640px `smoothstep` + pixel-clustered biome transitions across 4 realms:
 *      0. Grand Eclipse Causeway (`0..1200`)
 *      1. Whispering Starwood Crossing (`1200..2400`)
 *      2. Sunken Bone-Bridge Necropolis (`2400..3600`)
 *      3. Caldera Throne of the Black Pit (`3600..4800`)
 *    plus seamless `Laywaste of Inferno` molten transformation (`infernoAlpha: 0..1`)
 *  - Upgraded `0.42x` parallax architectural skyline + 12 Monumental `1.0x` World-Space
 *    16-bit Pixel-Art Realm Buildings, Ancient Artifacts & Left-Side Shattered Caldera Boss Chasm
 *  - Enriched 2.5D perspective-foreshortened stone causeway with inlaid medallions, cracked
 *    flagstones, Starwood moss/leaves, Necropolis skull/rib inlays, Black Pit magma seams,
 *    and low weathered foreground cliff plinths (`<= 20px` above `y = 686`).
 *  - Pure integer `Math.round` pixel-art clusters with `#0d0f1c` 1px Selout outlines,
 *    subtle additive bloom (`alpha <= 0.18`), and zero canvas rotation calls.
 */

export const ADVENTURE_ROAD_TOP_Y = 436;
export const ADVENTURE_ROAD_BOT_Y = 686;

const SELOUT = '#0d0f1c';
const CALDERA_CHASM_MIN_X = 3650;
const CALDERA_CHASM_MAX_X = 3935;

// Deterministic Curated Registry of Grand 16-bit Realm Buildings, Ancient Artifacts & Boss Chasm
export const ADVENTURE_LANDMARKS = [
  // Zone I (0..1200 — Eclipse Cathedral Outskirts)
  { id: 'eclipse_gatehouse', zone: 0, x: 210, halfW: 148, height: 274, isArtifact: false },
  { id: 'astral_orrery', zone: 0, x: 585, halfW: 106, height: 236, isArtifact: true },
  { id: 'reliquary_chapel', zone: 0, x: 965, halfW: 134, height: 248, isArtifact: false },

  // Zone II (1200..2400 — Cursed Starwood Crossing)
  { id: 'elven_moonwell', zone: 1, x: 1410, halfW: 150, height: 268, isArtifact: false },
  { id: 'yggdrasil_waygate', zone: 1, x: 1805, halfW: 114, height: 250, isArtifact: true },
  { id: 'starwood_scriptorium', zone: 1, x: 2195, halfW: 128, height: 260, isArtifact: false },

  // Zone III (2400..3600 — Sunken Bone-Bridge Necropolis)
  { id: 'ossuary_mausoleum', zone: 2, x: 2610, halfW: 145, height: 264, isArtifact: false },
  { id: 'soul_reliquary_spire', zone: 2, x: 3005, halfW: 112, height: 258, isArtifact: true },
  { id: 'bone_gate_bastion', zone: 2, x: 3405, halfW: 154, height: 282, isArtifact: false },

  // Zone IV (3600..4800 — Throne of the Black Pit)
  { id: 'caldera_boss_chasm', zone: 3, x: 3792, halfW: 146, height: 214, isChasm: true },
  { id: 'demon_forge_citadel', zone: 3, x: 4165, halfW: 154, height: 284, isArtifact: false },
  { id: 'hellfire_crucible_monoliths', zone: 3, x: 4565, halfW: 140, height: 270, isArtifact: true }
];

// Precomputed 10-course 2.5D perspective floor table (`436 .. 686` = `250px` of 3D walkable depth).
// Far courses near the upper parapet are narrower (`16px`); near foreground courses are wider (`34px`).
const ROAD_COURSES = (() => {
  const heights = [16, 18, 20, 22, 24, 26, 28, 30, 32, 34]; // sum = 250
  const list = [];
  let curY = ADVENTURE_ROAD_TOP_Y;
  for (let i = 0; i < heights.length; i++) {
    const h = heights[i];
    list.push({
      row: i,
      y: curY,
      h,
      t: i / (heights.length - 1),
      tileW: Math.round((56 + i * 8) / 4) * 4
    });
    curY += h;
  }
  return list;
})();

const BIOME_PALETTES = [
  // 0: Grand Eclipse Causeway (Obsidian-Slate, Imperial Gold & Solar Brazier Amber)
  {
    skyTop: [6, 9, 24],
    skyMid: [20, 29, 56],
    skyHorizon: [64, 38, 26],
    farMtn: [14, 20, 38],
    midRuin: [22, 31, 52],
    midRuinLit: [38, 52, 82],
    mistRgb: [251, 146, 60],
    wallDark: [18, 25, 41],
    wallMid: [32, 43, 66],
    wallLight: [56, 72, 102],
    trimCol: [212, 175, 55],
    roadShadow: [15, 21, 35],
    roadBase: [30, 41, 61],
    roadMid: [43, 57, 82],
    roadLit: [64, 82, 112],
    runnerDark: [48, 33, 18],
    runnerMid: [92, 62, 24],
    runnerTrim: [234, 179, 8],
    detailA: [251, 146, 60],
    detailB: [253, 224, 71],
    curbBase: [26, 36, 56],
    curbLit: [71, 90, 122],
    cliffDark: [9, 13, 24],
    cliffMid: [18, 25, 42],
    abyssGlow: [56, 189, 248]
  },
  // 1: Whispering Starwood Crossing (Elven Moss-Stone, Bioluminescent Jade & Starlight Cyan)
  {
    skyTop: [4, 15, 24],
    skyMid: [11, 43, 46],
    skyHorizon: [20, 82, 74],
    farMtn: [8, 29, 33],
    midRuin: [14, 46, 48],
    midRuinLit: [26, 74, 72],
    mistRgb: [52, 211, 153],
    wallDark: [16, 34, 34],
    wallMid: [29, 58, 55],
    wallLight: [54, 96, 88],
    trimCol: [52, 211, 153],
    roadShadow: [13, 28, 29],
    roadBase: [26, 50, 49],
    roadMid: [38, 70, 66],
    roadLit: [60, 102, 94],
    runnerDark: [14, 48, 46],
    runnerMid: [20, 83, 76],
    runnerTrim: [110, 231, 183],
    detailA: [16, 185, 129],
    detailB: [125, 211, 252],
    curbBase: [22, 46, 44],
    curbLit: [62, 108, 96],
    cliffDark: [6, 18, 20],
    cliffMid: [14, 35, 36],
    abyssGlow: [52, 211, 153]
  },
  // 2: Sunken Bone-Bridge Necropolis (Crypt Amethyst, Ashen Bone & Soul-Rose)
  {
    skyTop: [9, 5, 20],
    skyMid: [30, 16, 54],
    skyHorizon: [64, 22, 74],
    farMtn: [18, 10, 34],
    midRuin: [31, 18, 54],
    midRuinLit: [52, 32, 86],
    mistRgb: [192, 132, 252],
    wallDark: [21, 15, 34],
    wallMid: [39, 28, 60],
    wallLight: [68, 51, 98],
    trimCol: [192, 132, 252],
    roadShadow: [16, 12, 27],
    roadBase: [31, 24, 48],
    roadMid: [46, 36, 69],
    roadLit: [72, 58, 102],
    runnerDark: [38, 16, 48],
    runnerMid: [70, 26, 84],
    runnerTrim: [232, 121, 249],
    detailA: [203, 213, 225],
    detailB: [244, 63, 94],
    curbBase: [28, 21, 44],
    curbLit: [78, 62, 110],
    cliffDark: [10, 7, 19],
    cliffMid: [22, 15, 38],
    abyssGlow: [168, 85, 247]
  },
  // 3: Caldera Throne of the Black Pit (Charred Basalt, Crimson Hellfire & Forged Brass)
  {
    skyTop: [12, 4, 7],
    skyMid: [44, 10, 15],
    skyHorizon: [98, 26, 14],
    farMtn: [24, 8, 12],
    midRuin: [40, 14, 18],
    midRuinLit: [68, 24, 29],
    mistRgb: [239, 68, 68],
    wallDark: [20, 11, 14],
    wallMid: [38, 21, 25],
    wallLight: [68, 36, 41],
    trimCol: [245, 158, 11],
    roadShadow: [14, 9, 12],
    roadBase: [28, 18, 22],
    roadMid: [44, 27, 32],
    roadLit: [68, 41, 47],
    runnerDark: [56, 14, 18],
    runnerMid: [108, 24, 26],
    runnerTrim: [251, 146, 60],
    detailA: [239, 68, 68],
    detailB: [253, 224, 71],
    curbBase: [24, 15, 18],
    curbLit: [72, 42, 46],
    cliffDark: [11, 5, 7],
    cliffMid: [26, 12, 15],
    abyssGlow: [239, 68, 68]
  }
];

const INFERNO_PALETTE = {
  skyTop: [18, 5, 4],
  skyMid: [68, 18, 8],
  skyHorizon: [168, 56, 12],
  farMtn: [30, 9, 6],
  midRuin: [52, 16, 10],
  midRuinLit: [86, 28, 16],
  mistRgb: [251, 146, 60],
  wallDark: [22, 10, 8],
  wallMid: [44, 19, 14],
  wallLight: [78, 34, 22],
  trimCol: [253, 224, 71],
  roadShadow: [16, 7, 6],
  roadBase: [32, 15, 12],
  roadMid: [50, 23, 18],
  roadLit: [78, 36, 25],
  runnerDark: [78, 22, 10],
  runnerMid: [146, 44, 14],
  runnerTrim: [254, 240, 138],
  detailA: [251, 146, 60],
  detailB: [254, 240, 138],
  curbBase: [28, 13, 10],
  curbLit: [84, 38, 24],
  cliffDark: [14, 5, 4],
  cliffMid: [34, 12, 9],
  abyssGlow: [251, 146, 60]
};

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function hash2D(ix, iy) {
  let n = (ix * 374761393 + iy * 668265263) | 0;
  n = ((n ^ (n >>> 13)) * 1274126177) | 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function rgbStr(rgb) {
  return `rgb(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0})`;
}

function rgbaStr(rgb, a) {
  return `rgba(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0},${a.toFixed(3)})`;
}

function pxFill(ctx, x, y, w, h, col) {
  const rx = Math.round(x);
  const ry = Math.round(y);
  const rw = Math.round(w);
  const rh = Math.round(h);
  if (rw <= 0 || rh <= 0) return;
  if (col) ctx.fillStyle = col;
  ctx.fillRect(rx, ry, rw, rh);
}

/**
 * Draws a crisp 16-bit cel-shaded masonry block with 1px `#0d0f1c` selective outline (`Selout`),
 * optional top/left highlight bevel, and optional bottom/right shadow bevel.
 */
function seloutBlock(ctx, x, y, w, h, baseCol, litCol = null, darkCol = null) {
  const rx = Math.round(x);
  const ry = Math.round(y);
  const rw = Math.round(w);
  const rh = Math.round(h);
  if (rw <= 2 || rh <= 2) {
    pxFill(ctx, rx, ry, rw, rh, baseCol);
    return;
  }
  ctx.fillStyle = SELOUT;
  ctx.fillRect(rx, ry, rw, rh);
  ctx.fillStyle = baseCol;
  ctx.fillRect(rx + 1, ry + 1, rw - 2, rh - 2);
  if (darkCol && rw > 5 && rh > 5) {
    ctx.fillStyle = darkCol;
    ctx.fillRect(rx + 1, ry + rh - 3, rw - 2, 2);
    ctx.fillRect(rx + rw - 3, ry + 1, 2, rh - 2);
  }
  if (litCol && rw > 4 && rh > 4) {
    ctx.fillStyle = litCol;
    ctx.fillRect(rx + 1, ry + 1, rw - 3, 2);
    ctx.fillRect(rx + 1, ry + 1, 2, Math.max(2, rh - 4));
  }
}

/**
 * Stepped pixel-art pointed Gothic arch with `#0d0f1c` outline & carved stone trim.
 */
function drawPointedArch(ctx, cx, botY, halfW, archH, trimCol, recessCol = SELOUT) {
  const rcx = Math.round(cx);
  const rby = Math.round(botY);
  const rhw = Math.round(halfW);
  const rah = Math.round(archH);
  const springH = Math.round(rah * 0.56);
  const peakH = rah - springH;

  // Outer carved stone trim
  seloutBlock(ctx, rcx - rhw - 4, rby - springH, rhw * 2 + 8, springH, trimCol);
  const steps = Math.max(3, Math.floor(peakH / 4));
  for (let s = 0; s <= steps; s++) {
    const u = s / steps;
    const sy = rby - springH - Math.round(u * peakH);
    const curHw = Math.max(3, Math.round((1 - u * u * 0.88) * (rhw + 4)));
    pxFill(ctx, rcx - curHw - 1, sy - 4, curHw * 2 + 2, 5, SELOUT);
    pxFill(ctx, rcx - curHw, sy - 3, curHw * 2, 4, trimCol);
  }

  // Deep interior recess
  pxFill(ctx, rcx - rhw, rby - springH + 2, rhw * 2, springH - 2, recessCol);
  for (let s = 0; s < steps; s++) {
    const u = s / steps;
    const sy = rby - springH - Math.round(u * (peakH - 4));
    const curHw = Math.max(2, Math.round((1 - u * u * 0.92) * rhw));
    pxFill(ctx, rcx - curHw, sy - 3, curHw * 2, 4, recessCol);
  }
}

/**
 * Stepped pixel-art circular ring (`2px` scanlines) with `#0d0f1c` 1px Selout.
 */
function drawPixelRing(ctx, cx, cy, outerR, thickness, col, hiCol = null) {
  const rcx = Math.round(cx);
  const rcy = Math.round(cy);
  const rOut = Math.round(outerR);
  const rIn = Math.max(0, rOut - Math.round(thickness));
  for (let dy = -rOut - 1; dy <= rOut + 1; dy += 2) {
    const oSq = (rOut + 1) * (rOut + 1) - dy * dy;
    if (oSq < 0) continue;
    const oSpan = Math.round(Math.sqrt(oSq));
    const mSq = rOut * rOut - dy * dy;
    const mSpan = mSq > 0 ? Math.round(Math.sqrt(mSq)) : 0;
    const iSq = rIn * rIn - dy * dy;
    const iSpan = iSq > 0 ? Math.round(Math.sqrt(iSq)) : 0;

    if (iSpan > 1) {
      pxFill(ctx, rcx - oSpan, rcy + dy, oSpan - iSpan + 1, 2, SELOUT);
      pxFill(ctx, rcx + iSpan - 1, rcy + dy, oSpan - iSpan + 1, 2, SELOUT);
      if (mSpan > iSpan) {
        const tone = hiCol && dy < -rOut * 0.25 ? hiCol : col;
        pxFill(ctx, rcx - mSpan, rcy + dy, mSpan - iSpan, 2, tone);
        pxFill(ctx, rcx + iSpan, rcy + dy, mSpan - iSpan, 2, tone);
      }
    } else {
      pxFill(ctx, rcx - oSpan, rcy + dy, oSpan * 2, 2, SELOUT);
      if (mSpan > 0) {
        const tone = hiCol && dy < 0 ? hiCol : col;
        pxFill(ctx, rcx - mSpan, rcy + dy, mSpan * 2, 2, tone);
      }
    }
  }
}

/**
 * Stepped pixel-art solid disc (`2px` scanlines) with `#0d0f1c` 1px Selout.
 */
function drawPixelDisc(ctx, cx, cy, r, col, coreCol = null) {
  const rcx = Math.round(cx);
  const rcy = Math.round(cy);
  const rad = Math.round(r);
  for (let dy = -rad - 1; dy <= rad + 1; dy += 2) {
    const sSq = (rad + 1) * (rad + 1) - dy * dy;
    if (sSq < 0) continue;
    const sSpan = Math.round(Math.sqrt(sSq));
    pxFill(ctx, rcx - sSpan, rcy + dy, sSpan * 2, 2, SELOUT);
    const mSq = rad * rad - dy * dy;
    if (mSq > 0) {
      const mSpan = Math.round(Math.sqrt(mSq));
      pxFill(ctx, rcx - mSpan, rcy + dy, mSpan * 2, 2, col);
    }
  }
  if (coreCol && rad >= 5) {
    const cr = Math.max(2, Math.round(rad * 0.48));
    pxFill(ctx, rcx - cr, rcy - cr, cr * 2, cr * 2, coreCol);
  }
}

/**
 * Strictly capped subtle HD-2D additive bloom (`alpha <= 0.18`).
 */
function drawSubtleGlow(ctx, glowTex, cx, cy, rx, ry, alpha) {
  if (!glowTex || alpha <= 0.004) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.max(0, Math.min(0.18, alpha));
  ctx.drawImage(
    glowTex,
    Math.round(cx - rx),
    Math.round(cy - ry),
    Math.round(rx * 2),
    Math.round(ry * 2)
  );
  ctx.restore();
}

/**
 * Crisp 3-tone animated pixel flame tongue (zero smooth gradients or rotation).
 */
function drawPixelFlame(ctx, cx, baseY, halfW, height, outerCol, midCol, coreCol, swayPx = 0) {
  const rcx = Math.round(cx);
  const rby = Math.round(baseY);
  const rhw = Math.max(3, Math.round(halfW));
  const rh = Math.max(8, Math.round(height));
  const sw = Math.round(swayPx);

  pxFill(ctx, rcx - rhw - 1, rby - Math.round(rh * 0.55), rhw * 2 + 2, Math.round(rh * 0.55), SELOUT);
  pxFill(ctx, rcx - rhw, rby - Math.round(rh * 0.62), rhw * 2, Math.round(rh * 0.62), outerCol);
  pxFill(
    ctx,
    rcx - Math.max(2, rhw - 2) + sw,
    rby - rh,
    Math.max(4, (rhw - 2) * 2),
    Math.round(rh * 0.52),
    outerCol
  );
  pxFill(
    ctx,
    rcx - Math.max(2, rhw - 3),
    rby - Math.round(rh * 0.72),
    Math.max(4, (rhw - 3) * 2),
    Math.round(rh * 0.68),
    midCol
  );
  pxFill(
    ctx,
    rcx - Math.max(1, Math.floor(rhw * 0.42)),
    rby - Math.round(rh * 0.42),
    Math.max(2, Math.floor(rhw * 0.42) * 2),
    Math.round(rh * 0.38),
    coreCol
  );
}

function isNearLandmarkOrChasm(worldX, pad = 34) {
  if (worldX >= CALDERA_CHASM_MIN_X - pad && worldX <= CALDERA_CHASM_MAX_X + pad) {
    return true;
  }
  for (let i = 0; i < ADVENTURE_LANDMARKS.length; i++) {
    const lm = ADVENTURE_LANDMARKS[i];
    if (Math.abs(worldX - lm.x) <= lm.halfW + pad) return true;
  }
  return false;
}

export class AdventureMapRenderer {
  /**
   * Computes smooth continuous 4-realm weights `[w0, w1, w2, w3]` across world `x`
   * with wide `640px` `smoothstep` transitions (`880..1520`, `2080..2720`, `3280..3920`)
   * so there is NEVER a hard seam or abrupt cut anywhere on the map.
   */
  static getBiomeWeights(worldX) {
    const s01 = smoothstep(880, 1520, worldX);
    const s12 = smoothstep(2080, 2720, worldX);
    const s23 = smoothstep(3280, 3920, worldX);
    const w0 = 1 - s01;
    const w1 = s01 * (1 - s12);
    const w2 = s12 * (1 - s23);
    const w3 = s23;
    return [w0, w1, w2, w3];
  }

  /**
   * Picks a single discrete biome index `0..3` for a pixel-art stone/prop cluster at `(worldX, seedY)`
   * using smooth biome probabilities + deterministic spatial dithering so flagstones & flora
   * interlock organically over 640px transition zones instead of cutting along a straight line!
   */
  static pickClusteredBiomeIndex(worldX, seedY = 0) {
    const [w0, w1, w2] = AdventureMapRenderer.getBiomeWeights(worldX);
    const r = hash2D(Math.floor(worldX / 16), seedY);
    if (r < w0) return 0;
    if (r < w0 + w1) return 1;
    if (r < w0 + w1 + w2) return 2;
    return 3;
  }

  static blendColor(key, weights, infernoAlpha = 0, out = [0, 0, 0]) {
    const b0 = BIOME_PALETTES[0][key];
    const b1 = BIOME_PALETTES[1][key];
    const b2 = BIOME_PALETTES[2][key];
    const b3 = BIOME_PALETTES[3][key];
    let r = b0[0] * weights[0] + b1[0] * weights[1] + b2[0] * weights[2] + b3[0] * weights[3];
    let g = b0[1] * weights[0] + b1[1] * weights[1] + b2[1] * weights[2] + b3[1] * weights[3];
    let b = b0[2] * weights[0] + b1[2] * weights[1] + b2[2] * weights[2] + b3[2] * weights[3];
    if (infernoAlpha > 0.001) {
      const inf = INFERNO_PALETTE[key];
      const ia = Math.min(1, infernoAlpha);
      r = r * (1 - ia) + inf[0] * ia;
      g = g * (1 - ia) + inf[1] * ia;
      b = b * (1 - ia) + inf[2] * ia;
    }
    out[0] = Math.round(r);
    out[1] = Math.round(g);
    out[2] = Math.round(b);
    return out;
  }

  static sampleBiomeColor(biomeIdx, key, infernoAlpha = 0) {
    const base = BIOME_PALETTES[biomeIdx][key];
    if (infernoAlpha <= 0.005) return rgbStr(base);
    const inf = INFERNO_PALETTE[key];
    const ia = Math.min(1, infernoAlpha);
    return `rgb(${Math.round(base[0] * (1 - ia) + inf[0] * ia)},${Math.round(base[1] * (1 - ia) + inf[1] * ia)},${Math.round(base[2] * (1 - ia) + inf[2] * ia)})`;
  }

  // ===========================================================================
  // LEFT-SIDE SHATTERED CALDERA BOSS CHASM (`x: 3650..3935, y: 430..686`)
  // ===========================================================================
  static renderCalderaBossChasm(ctx, renderer, t, infernoAlpha) {
    const xL = CALDERA_CHASM_MIN_X;
    const xR = CALDERA_CHASM_MAX_X;
    const chasmW = xR - xL;
    const topY = 432;
    const botY = ADVENTURE_ROAD_BOT_Y;
    const pulse = 0.76 + 0.24 * Math.sin(t * 4.4);

    // 1. Deep Abyssal Pit Throat & Stepped Basalt Chasm Walls (`y: 432..686`)
    pxFill(ctx, xL + 18, topY, chasmW - 36, botY - topY + 28, '#05040a');
    pxFill(ctx, xL + 26, topY + 8, chasmW - 52, 82, '#160a0e');
    pxFill(ctx, xL + 32, topY + 34, chasmW - 64, 62, '#291116');

    // Vertical basalt cliff ribs inside the chasm throat
    for (let col = 0; col < 9; col++) {
      const rx = xL + 34 + col * 26;
      const rh = 68 + Math.round(hash2D(col, 901) * 44);
      seloutBlock(ctx, rx, topY + 6, 20, rh, '#241116', '#451d24', '#12070a');
      if (col % 2 === 1) {
        pxFill(ctx, rx + 8, topY + 18, 4, rh - 20, '#dc2626');
      }
    }

    // 2. Bubbling Pixel-Art Incandescent Magma Pool (`y: 512..686`)
    const magmaTop = 512;
    pxFill(ctx, xL + 24, magmaTop, chasmW - 48, botY - magmaTop + 20, '#7f1d1d');
    pxFill(ctx, xL + 32, magmaTop + 10, chasmW - 64, botY - magmaTop + 8, '#b91c1c');

    // Animated molten currents & dark cooled basalt crust plates
    for (let row = 0; row < 7; row++) {
      const my = magmaTop + 12 + row * 24;
      const drift = Math.round(Math.sin(t * 2.3 + row * 1.4) * 10);
      const bandW = chasmW - 84 - (row % 2) * 18;
      pxFill(ctx, xL + 42 + drift, my, bandW, 12, row % 2 === 0 ? '#ea580c' : '#dc2626');
      pxFill(ctx, xL + 58 - drift, my + 3, Math.round(bandW * 0.62), 6, '#fb923c');
      if (row % 2 === 0) {
        pxFill(ctx, xL + 84 + drift, my + 4, 54, 3, '#fde047');
      }
      // Cooled floating obsidian slag islands
      const crustX = xL + 54 + ((row * 57) % 150);
      seloutBlock(ctx, crustX - drift * 0.5, my + 6, 34, 10, '#1f1014', '#3b1c22');
    }

    // Animated bursting pixel magma bubbles & rising sparks
    for (let b = 0; b < 8; b++) {
      const cyc = (t * (0.9 + (b % 3) * 0.32) + b * 0.37) % 1;
      const bx = xL + 56 + ((b * 43) % (chasmW - 112));
      const by = magmaTop + 24 + ((b * 29) % 132);
      if (cyc < 0.62) {
        const br = 3 + Math.round((cyc / 0.62) * 5);
        drawPixelDisc(ctx, bx, by, br, '#fb923c', '#fef08a');
      } else {
        const rise = Math.round(((cyc - 0.62) / 0.38) * 54);
        pxFill(ctx, bx - 2, by - rise, 4, 4, '#fde047');
        pxFill(ctx, bx + 6, by - Math.round(rise * 0.7), 3, 3, '#fb923c');
      }
    }

    // Subtle magma updraft glow (strictly <= 0.18)
    const glowHot = renderer.glowCrimson || renderer.glowOrange;
    drawSubtleGlow(ctx, glowHot, (xL + xR) * 0.5, 585, 165, 98, 0.17 * pulse);
    drawSubtleGlow(ctx, renderer.glowOrange, 3845, 560, 125, 76, 0.14 * pulse);

    // 3. Heavy Pixel-Stepped Glowing Abyssal Chains Straining into the Pit (`x ~ 3845`)
    const chainAnchors = [
      { ax: xL + 22, ay: 468, tx: 3826, ty: 562 },
      { ax: xL + 26, ay: 632, tx: 3828, ty: 590 },
      { ax: xR - 22, ay: 472, tx: 3864, ty: 558 },
      { ax: xR - 24, ay: 638, tx: 3862, ty: 594 }
    ];
    for (let c = 0; c < chainAnchors.length; c++) {
      const ch = chainAnchors[c];
      const links = 11;
      for (let k = 0; k <= links; k++) {
        const u = k / links;
        const sag = Math.sin(u * Math.PI) * 16;
        const lx = Math.round(ch.ax + (ch.tx - ch.ax) * u);
        const ly = Math.round(ch.ay + (ch.ty - ch.ay) * u + sag);
        seloutBlock(
          ctx,
          lx - 5,
          ly - 4,
          10,
          8,
          k % 2 === 0 ? '#334155' : '#1e293b',
          k > 7 ? '#fb923c' : '#64748b'
        );
        if (k > 6) {
          pxFill(ctx, lx - 2, ly - 1, 4, 2, '#fde047');
        }
      }
    }

    // 4. Sheared Broken Bridge Masonry & Jagged Obsidian Rim Crags (Left & Right Rims)
    for (let r = 0; r < ROAD_COURSES.length; r++) {
      const course = ROAD_COURSES[r];
      const cy = course.y;
      const ch = course.h;
      const jutL = 22 + Math.round(hash2D(r, 933) * 26);
      const jutR = 24 + Math.round(hash2D(r, 947) * 28);
      const stoneBase = infernoAlpha > 0.4 ? '#381914' : '#2d1b20';
      const stoneLit = infernoAlpha > 0.4 ? '#632c20' : '#4e2f37';

      // Left broken causeway ledge + drop-off thickness
      seloutBlock(ctx, xL - 10, cy, jutL + 10, ch, stoneBase, stoneLit, '#160b0e');
      pxFill(ctx, xL + jutL - 4, cy + ch - 2, 6, 12, SELOUT);
      if (r % 2 === 0) {
        pxFill(ctx, xL + jutL - 8, cy + 4, 6, 3, '#fb923c');
      }

      // Right broken causeway ledge (framing Zone IV Boss Arena floor)
      seloutBlock(ctx, xR - jutR, cy, jutR + 12, ch, stoneBase, stoneLit, '#160b0e');
      pxFill(ctx, xR - jutR - 2, cy + ch - 2, 6, 12, SELOUT);
      if (r % 2 === 1) {
        pxFill(ctx, xR - jutR + 3, cy + 4, 6, 3, '#fb923c');
      }
    }

    // Forged iron chain-bollards & jagged obsidian fangs along top and bottom chasm rims
    for (const bx of [xL + 16, xR - 16]) {
      seloutBlock(ctx, bx - 14, 448, 28, 30, '#271519', '#572e35', '#13090b');
      pxFill(ctx, bx - 8, 454, 16, 4, '#f59e0b');
      seloutBlock(ctx, bx - 14, 618, 28, 32, '#271519', '#572e35', '#13090b');
      pxFill(ctx, bx - 8, 624, 16, 4, '#f59e0b');
    }

    // Jagged obsidian teeth along the foreground cliff breach (`y: 668..714`)
    for (let k = 0; k < 7; k++) {
      const fx = xL + 26 + k * 38;
      const fh = 16 + (k % 3) * 6;
      seloutBlock(ctx, fx, botY - fh + 6, 26, fh + 18, '#1b0d11', '#3f1d24', '#0b0507');
      pxFill(ctx, fx + 8, botY - fh + 10, 6, 3, '#ef4444');
    }
  }

  // ===========================================================================
  // 12 GRAND 16-BIT PIXEL-ART REALM BUILDINGS & ANCIENT ARTIFACTS (`baseY = 438`)
  // ===========================================================================
  static renderMonumentalLandmark(ctx, lm, renderer, t, infernoAlpha) {
    const cx = lm.x;
    const baseY = ADVENTURE_ROAD_TOP_Y + 2; // 438
    const flick = 0.78 + 0.22 * Math.sin(t * 6.8 + lm.x * 0.02);
    const bob = Math.round(Math.sin(t * 2.8 + lm.x * 0.01) * 4);
    const sway = Math.round(Math.sin(t * 3.4 + lm.x * 0.03) * 2);

    // Grounded foundation ambient shadow across upper causeway
    if (!lm.isChasm) {
      ctx.fillStyle = 'rgba(3, 5, 12, 0.56)';
      ctx.fillRect(cx - lm.halfW - 8, baseY - 2, lm.halfW * 2 + 16, 14);
      ctx.fillStyle = 'rgba(3, 5, 12, 0.26)';
      ctx.fillRect(cx - lm.halfW + 4, baseY + 12, lm.halfW * 2 - 8, 8);
    }

    switch (lm.id) {
      case 'eclipse_gatehouse': {
        // 1. ECLIPSE SANCTUARY GATEHOUSE & TWIN BELL-TOWERS (`x = 210, w = 296, h = 274`)
        const stDark = infernoAlpha > 0.5 ? '#261412' : '#1b263b';
        const stMid = infernoAlpha > 0.5 ? '#43201b' : '#2d3e5e';
        const stLit = infernoAlpha > 0.5 ? '#6e3529' : '#4a628a';
        const roofCol = infernoAlpha > 0.5 ? '#30110d' : '#162038';
        const roofLit = infernoAlpha > 0.5 ? '#592018' : '#293c66';
        const gold = '#eab308';
        const goldLit = '#fef08a';

        // Central nave facade body
        seloutBlock(ctx, cx - 84, baseY - 196, 168, 196, stMid, stLit, stDark);
        // Pitched central gable pediment
        for (let s = 0; s < 10; s++) {
          const gw = 172 - s * 16;
          seloutBlock(ctx, cx - (gw >> 1), baseY - 196 - s * 4, gw, 5, stLit, gold);
        }
        pxFill(ctx, cx - 3, baseY - 252, 6, 18, gold);
        pxFill(ctx, cx - 9, baseY - 244, 18, 5, goldLit);

        // Twin flanking Bell-Towers (`cx - 112` and `cx + 112`)
        for (const side of [-1, 1]) {
          const tx = cx + side * 110;
          // Stepped Gothic outer buttress
          seloutBlock(ctx, tx + side * 20 - 12, baseY - 142, 24, 142, stDark, stMid);
          seloutBlock(ctx, tx + side * 24 - 10, baseY - 84, 20, 84, stMid, stLit);
          // Main tower shaft
          seloutBlock(ctx, tx - 32, baseY - 224, 64, 224, stMid, stLit, stDark);
          // Ashlar horizontal stringcourses
          pxFill(ctx, tx - 34, baseY - 156, 68, 5, gold);
          pxFill(ctx, tx - 34, baseY - 92, 68, 4, stLit);

          // Open arched belfry alcove + hanging bronze bell
          drawPointedArch(ctx, tx, baseY - 162, 18, 44, stLit, SELOUT);
          const bellShift = side * Math.round(Math.sin(t * 2.6 + side) * 2);
          seloutBlock(ctx, tx - 9 + bellShift, baseY - 190, 18, 16, '#b45309', '#f59e0b', '#78350f');
          seloutBlock(ctx, tx - 12 + bellShift, baseY - 176, 24, 6, '#f59e0b', goldLit);
          pxFill(ctx, tx - 2 + bellShift, baseY - 170, 4, 5, goldLit);

          // Crenelated tower parapet + steep Gothic spire
          for (let m = -2; m <= 2; m++) {
            seloutBlock(ctx, tx + m * 13 - 5, baseY - 232, 10, 10, stLit, gold);
          }
          for (let s = 0; s < 11; s++) {
            const sw = Math.max(6, 56 - s * 5);
            seloutBlock(ctx, tx - (sw >> 1), baseY - 236 - s * 4, sw, 5, roofCol, roofLit);
          }
          pxFill(ctx, tx - 2, baseY - 284, 4, 10, goldLit);

          // Fluttering crimson-and-gold cathedral banner
          pxFill(ctx, tx - 18, baseY - 140, 36, 3, gold);
          seloutBlock(ctx, tx - 13, baseY - 137, 26, 66, '#991b1b', '#dc2626', '#450a0a');
          pxFill(ctx, tx - 9, baseY - 131, 18, 52, '#b91c1c');
          pxFill(ctx, tx - 3, baseY - 125, 6, 38, gold);
          pxFill(ctx, tx - 9, baseY - 112, 18, 5, goldLit);
          // Banner swallowtail fringe with subtle sway
          pxFill(ctx, tx - 12 + sway, baseY - 71, 8, 8, '#991b1b');
          pxFill(ctx, tx + 4 + sway, baseY - 71, 8, 8, '#991b1b');

          // Lit iron wall sconce near tower base
          seloutBlock(ctx, tx - 5, baseY - 48, 10, 14, '#1e293b', '#64748b');
          drawPixelFlame(ctx, tx, baseY - 48, 6, Math.round(14 * flick), '#ea580c', '#fb923c', '#fef08a', sway);
          drawSubtleGlow(ctx, renderer.glowOrange, tx, baseY - 54, 48, 44, 0.15 * flick);
        }

        // Glowing Circular Rose Stained-Glass Window (`cy = baseY - 154`)
        const roseY = baseY - 154;
        drawPixelDisc(ctx, cx, roseY, 28, '#1e1b4b', '#fde047');
        // Stained-glass jewel petals (crimson, amber, cyan) + dark lead mullions
        for (const [dx, dy, pCol] of [
          [-14, 0, '#ef4444'],
          [14, 0, '#ef4444'],
          [0, -14, '#38bdf8'],
          [0, 14, '#38bdf8'],
          [-10, -10, '#f59e0b'],
          [10, -10, '#f59e0b'],
          [-10, 10, '#f59e0b'],
          [10, 10, '#f59e0b']
        ]) {
          pxFill(ctx, cx + dx - 4, roseY + dy - 4, 8, 8, pCol);
        }
        pxFill(ctx, cx - 26, roseY - 1, 52, 2, SELOUT);
        pxFill(ctx, cx - 1, roseY - 26, 2, 52, SELOUT);
        drawPixelRing(ctx, cx, roseY, 30, 5, stLit, gold);
        drawSubtleGlow(ctx, renderer.glowGold, cx, roseY, 64, 64, 0.16 * flick);

        // Grand Vaulted Pointed-Arch Portcullis Doorway (`baseY`)
        drawPointedArch(ctx, cx, baseY, 44, 106, stLit, '#070912');
        drawPointedArch(ctx, cx, baseY, 36, 94, gold, '#060810');
        // Iron portcullis lattice bars + spiked tips
        for (let gx = cx - 28; gx <= cx + 28; gx += 8) {
          pxFill(ctx, gx - 1, baseY - 82, 3, 66, '#334155');
          pxFill(ctx, gx, baseY - 16, 2, 5, '#94a3b8');
        }
        for (let gy = baseY - 72; gy <= baseY - 28; gy += 14) {
          pxFill(ctx, cx - 32, gy, 64, 3, '#475569');
        }
        // Stepped Sanctuary Threshold Plinth
        seloutBlock(ctx, cx - 148, baseY - 12, 296, 14, stLit, '#94a3b8', stDark);
        break;
      }

      case 'astral_orrery': {
        // 2. GRAND ASTRAL ORRERY & SOLAR SUNDIAL MONUMENT (`x = 585, w = 212, h = 236`, Ancient Artifact)
        const mDark = infernoAlpha > 0.5 ? '#2b1612' : '#1e293b';
        const mMid = infernoAlpha > 0.5 ? '#4f2820' : '#475569';
        const mLit = infernoAlpha > 0.5 ? '#7c3f32' : '#94a3b8';
        const brass = '#d97706';
        const brassLit = '#fde047';

        // 3-tier stepped marble & obsidian reliquary plinth
        seloutBlock(ctx, cx - 106, baseY - 16, 212, 18, mMid, mLit, mDark);
        seloutBlock(ctx, cx - 86, baseY - 34, 172, 20, mMid, mLit, mDark);
        seloutBlock(ctx, cx - 54, baseY - 68, 108, 36, mDark, mMid, '#0f172a');
        pxFill(ctx, cx - 46, baseY - 58, 92, 4, brass);

        // Flanking carved runic steles
        for (const side of [-1, 1]) {
          const sx = cx + side * 82;
          seloutBlock(ctx, sx - 15, baseY - 128, 30, 96, mMid, mLit, mDark);
          seloutBlock(ctx, sx - 11, baseY - 142, 22, 16, mLit, brassLit);
          // Pulsing engraved astral runes
          for (let r = 0; r < 4; r++) {
            pxFill(ctx, sx - 4, baseY - 114 + r * 18, 8, 6, r % 2 === 0 ? brassLit : '#38bdf8');
          }
        }

        // Solar Sundial bronze gnomon blade on front plinth
        seloutBlock(ctx, cx - 6, baseY - 88, 12, 26, brass, brassLit, '#78350f');
        pxFill(ctx, cx - 22, baseY - 36, 44, 4, brassLit);

        // Concentric Gilded Astrolabe Rings (`cy = baseY - 160`)
        const oy = baseY - 160;
        // Cradle yoke arms
        seloutBlock(ctx, cx - 8, baseY - 104, 16, 38, brass, brassLit, '#78350f');
        drawPixelRing(ctx, cx, oy, 68, 7, brass, brassLit);
        drawPixelRing(ctx, cx, oy, 46, 5, '#eab308', '#fef9c3');
        // Cardinal astrolabe cross-hairs
        pxFill(ctx, cx - 72, oy - 2, 144, 4, brass);
        pxFill(ctx, cx - 2, oy - 72, 4, 144, brass);

        // Animated pixel star-nodes orbiting along the concentric astrolabe rings
        for (let n = 0; n < 6; n++) {
          const ang = t * (n % 2 === 0 ? 1.15 : -1.65) + n * 1.047;
          const rad = n % 2 === 0 ? 65 : 44;
          const nx = Math.round(cx + Math.cos(ang) * rad);
          const ny = Math.round(oy + Math.sin(ang) * rad);
          drawPixelDisc(ctx, nx, ny, 5, n % 3 === 0 ? '#38bdf8' : brassLit, '#ffffff');
        }

        // Central Levitating Eclipse Sun-Orb
        const orbY = oy + bob;
        drawSubtleGlow(ctx, renderer.glowGold, cx, orbY, 82, 82, 0.17 * flick);
        drawPixelDisc(ctx, cx, orbY, 20, '#f59e0b', '#fef08a');
        drawPixelDisc(ctx, cx + 2, orbY, 13, '#090d1a', '#1e1b4b');
        // Corona pixel rays
        pxFill(ctx, cx - 26, orbY - 2, 6, 4, brassLit);
        pxFill(ctx, cx + 20, orbY - 2, 6, 4, brassLit);
        pxFill(ctx, cx - 2, orbY - 26, 4, 6, brassLit);
        pxFill(ctx, cx - 2, orbY + 20, 4, 6, brassLit);
        break;
      }

      case 'reliquary_chapel': {
        // 3. RUINED RELIQUARY CHAPEL & CLOISTER ARCADE (`x = 965, w = 268, h = 248`)
        const cDark = infernoAlpha > 0.5 ? '#261412' : '#192236';
        const cMid = infernoAlpha > 0.5 ? '#43221d' : '#2c3d59';
        const cLit = infernoAlpha > 0.5 ? '#6d382e' : '#4d658c';
        const gold = '#d4af37';

        // Stepped cloister foundation
        seloutBlock(ctx, cx - 134, baseY - 14, 268, 16, cMid, cLit, cDark);

        // Main Gothic Nave Wall (shattered stepped roofline on right side!)
        seloutBlock(ctx, cx - 122, baseY - 196, 176, 184, cMid, cLit, cDark);
        seloutBlock(ctx, cx + 48, baseY - 138, 68, 126, cMid, cLit, cDark);
        // Jagged broken Gothic masonry steps & exposed nave ribs
        seloutBlock(ctx, cx - 114, baseY - 224, 96, 30, cMid, cLit, cDark);
        seloutBlock(ctx, cx - 92, baseY - 246, 48, 24, cLit, gold, cDark);
        // Shattered flying-buttress ribs arching across top right
        for (let r = 0; r < 6; r++) {
          seloutBlock(ctx, cx - 36 + r * 16, baseY - 232 + r * 12, 18, 10, cLit, '#94a3b8');
        }

        // 3 Tall Pointed Stained-Glass Lancet Alcoves (`cx - 82`, `cx - 18`, `cx + 46` shattered)
        const lancets = [
          { lx: cx - 80, h: 124, intact: true, c1: '#f59e0b', c2: '#38bdf8' },
          { lx: cx - 18, h: 138, intact: true, c1: '#ef4444', c2: '#fde047' },
          { lx: cx + 44, h: 96, intact: false, c1: '#38bdf8', c2: '#f59e0b' }
        ];
        for (const lan of lancets) {
          drawPointedArch(ctx, lan.lx, baseY - 36, 18, lan.h, cLit, '#080b14');
          if (lan.intact) {
            pxFill(ctx, lan.lx - 12, baseY - 38 - lan.h + 28, 24, lan.h - 32, lan.c1);
            pxFill(ctx, lan.lx - 8, baseY - 38 - lan.h + 40, 16, Math.round(lan.h * 0.45), lan.c2);
            pxFill(ctx, lan.lx - 1, baseY - 38 - lan.h + 24, 2, lan.h - 28, SELOUT);
            pxFill(ctx, lan.lx - 13, baseY - 82, 26, 2, SELOUT);
            drawSubtleGlow(ctx, renderer.glowGold, lan.lx, baseY - 92, 42, 58, 0.13 * flick);
          } else {
            // Shattered stained glass shards sticking out of mullions
            pxFill(ctx, lan.lx - 12, baseY - 56, 9, 16, lan.c1);
            pxFill(ctx, lan.lx + 4, baseY - 64, 8, 24, lan.c2);
          }
        }

        // Fallen Paladin / Seraph Stone Statue Bust on Right Cloister Steps
        const sx = cx + 88;
        seloutBlock(ctx, sx - 26, baseY - 40, 52, 28, '#475569', '#94a3b8', '#1e293b');
        // Tilted carved angel head, halo fragment & broken stone wing
        drawPixelDisc(ctx, sx - 6, baseY - 52, 11, '#94a3b8', '#cbd5e1');
        seloutBlock(ctx, sx + 8, baseY - 68, 24, 28, '#64748b', '#cbd5e1', '#334155');
        seloutBlock(ctx, sx + 18, baseY - 78, 18, 16, '#94a3b8', '#e2e8f0');

        // Lit Sanctuary Candle Altar at Chapel Center-Left
        const ax = cx - 48;
        seloutBlock(ctx, ax - 28, baseY - 36, 56, 24, cDark, gold, '#090d16');
        pxFill(ctx, ax - 24, baseY - 32, 48, 6, '#991b1b');
        for (let k = -2; k <= 2; k++) {
          const kx = ax + k * 9;
          const kh = 8 + ((k + 2) % 2) * 4;
          pxFill(ctx, kx - 2, baseY - 36 - kh, 4, kh, '#fef9c3');
          pxFill(ctx, kx - 1, baseY - 40 - kh, 3, 5, '#fde047');
        }
        drawSubtleGlow(ctx, renderer.glowOrange, ax, baseY - 44, 52, 36, 0.15 * flick);
        break;
      }

      case 'elven_moonwell': {
        // 4. ELVEN MOONWELL TEMPLE & SILVER-BOUGH PAVILION (`x = 1410, w = 300, h = 268`)
        const stoneDark = infernoAlpha > 0.55 ? '#2b1914' : '#1b3634';
        const stoneMid = infernoAlpha > 0.55 ? '#4d2b22' : '#36615b';
        const stoneLit = infernoAlpha > 0.55 ? '#7c4738' : '#649e94';
        const roofDark = infernoAlpha > 0.55 ? '#361410' : '#064e3b';
        const roofMid = infernoAlpha > 0.55 ? '#692318' : '#059669';
        const roofLit = infernoAlpha > 0.55 ? '#b45309' : '#34d399';
        const silver = '#cbd5e1';
        const waterMain = infernoAlpha > 0.6 ? '#fb923c' : '#22d3ee';
        const waterCore = infernoAlpha > 0.6 ? '#fef08a' : '#a7f3d0';

        // Gnarled ancient silver-bough backdrop behind pavilion
        seloutBlock(ctx, cx - 128, baseY - 210, 28, 198, '#1e293b', '#475569');
        seloutBlock(ctx, cx + 102, baseY - 204, 26, 192, '#1e293b', '#475569');
        seloutBlock(ctx, cx - 144, baseY - 238, 92, 42, roofDark, roofMid);
        seloutBlock(ctx, cx + 56, baseY - 234, 90, 40, roofDark, roofMid);

        // Pale moonstone temple podium
        seloutBlock(ctx, cx - 132, baseY - 20, 264, 22, stoneMid, stoneLit, stoneDark);

        // Dark sanctuary back-alcove & stepped rockery behind waterfall
        seloutBlock(ctx, cx - 84, baseY - 158, 168, 140, '#0d2122', stoneDark);

        // 4 Carved Moonstone Pillars wrapped in gnarled silver roots & emerald moss
        for (const pxOff of [-104, -52, 52, 104]) {
          const px = cx + pxOff;
          seloutBlock(ctx, px - 11, baseY - 162, 22, 144, stoneMid, silver, stoneDark);
          seloutBlock(ctx, px - 15, baseY - 168, 30, 10, stoneLit, '#f8fafc');
          seloutBlock(ctx, px - 15, baseY - 30, 30, 12, stoneLit, silver);
          if (infernoAlpha < 0.6) {
            pxFill(ctx, px - 9, baseY - 112, 14, 8, '#10b981');
            pxFill(ctx, px - 4, baseY - 68, 12, 10, '#059669');
          }
        }
        // Carved moon-arch lintel spanning center bay
        drawPointedArch(ctx, cx, baseY - 94, 42, 64, stoneLit, '#071517');

        // Sweeping Tier 1 Curved Elven Jade Roof Eaves (`w = 300`)
        for (let s = 0; s < 9; s++) {
          const rw = 300 - s * 20;
          const upTurn = s <= 2 ? (2 - s) * 4 : 0;
          seloutBlock(
            ctx,
            cx - (rw >> 1),
            baseY - 168 - s * 5 - upTurn,
            rw,
            7,
            s % 2 === 0 ? roofMid : roofDark,
            roofLit
          );
        }
        // Upturned silver-gold eave finials
        pxFill(ctx, cx - 152, baseY - 182, 8, 8, '#fde047');
        pxFill(ctx, cx + 144, baseY - 182, 8, 8, '#fde047');

        // Upper Tier 2 Pavilion Lantern Story + Sweeping Jade Roof (`h = 268`)
        seloutBlock(ctx, cx - 58, baseY - 222, 116, 36, stoneMid, silver, stoneDark);
        pxFill(ctx, cx - 26, baseY - 214, 52, 20, waterMain);
        pxFill(ctx, cx - 14, baseY - 210, 28, 12, waterCore);
        for (let s = 0; s < 8; s++) {
          const rw = 176 - s * 18;
          const upTurn = s <= 1 ? (1 - s) * 4 : 0;
          seloutBlock(ctx, cx - (rw >> 1), baseY - 222 - s * 5 - upTurn, rw, 6, roofMid, roofLit);
        }
        // Crescent Moon Pediment Crest (`top = baseY - 274`)
        drawPixelRing(ctx, cx, baseY - 266, 11, 4, '#fef08a', '#ffffff');

        // Luminous Cyan/Emerald Waterfall Cascading into Glowing Moonwell Basin (`y = 436..450`)!
        const wfTop = baseY - 122;
        seloutBlock(ctx, cx - 32, wfTop - 6, 64, 10, stoneDark, stoneLit);
        pxFill(ctx, cx - 24, wfTop, 48, baseY - wfTop + 4, '#0891b2');
        pxFill(ctx, cx - 18, wfTop, 36, baseY - wfTop + 4, waterMain);
        // Animated falling pixel foam streaks
        for (let st = 0; st < 7; st++) {
          const dropY = wfTop + Math.round(((t * 92 + st * 19) % (baseY - wfTop - 8)));
          const dropX = cx - 14 + ((st * 9) % 26);
          pxFill(ctx, dropX, dropY, 4, 12, waterCore);
          pxFill(ctx, dropX + 1, dropY + 2, 2, 6, '#ffffff');
        }

        // Semicircular Carved Moonwell Basin projecting onto upper road edge (`y = 428..452`)
        seloutBlock(ctx, cx - 50, baseY - 10, 100, 22, stoneLit, silver, stoneDark);
        pxFill(ctx, cx - 42, baseY - 6, 84, 14, '#0e7490');
        pxFill(ctx, cx - 36, baseY - 4, 72, 10, waterMain);
        const ripSpan = 14 + Math.round(((t * 1.8) % 1) * 22);
        pxFill(ctx, cx - ripSpan, baseY, ripSpan * 2, 3, waterCore);
        drawSubtleGlow(ctx, renderer.glowEmerald || renderer.glowCyan, cx, baseY - 24, 96, 68, 0.17 * flick);
        break;
      }

      case 'yggdrasil_waygate': {
        // 5. YGGDRASIL WORLD-RUNE WAYGATE & LEVITATING MANA-SPIRE (`x = 1805, w = 228, h = 250`, Artifact)
        const rDark = infernoAlpha > 0.55 ? '#261410' : '#132a28';
        const rMid = infernoAlpha > 0.55 ? '#47251d' : '#254d48';
        const rLit = infernoAlpha > 0.55 ? '#733b2e' : '#4b8278';
        const runeGlow = infernoAlpha > 0.55 ? '#fb923c' : '#34d399';
        const runeHot = infernoAlpha > 0.55 ? '#fef08a' : '#a7f3d0';

        // Ancient root-wrapped stepped megalithic plinth
        seloutBlock(ctx, cx - 114, baseY - 18, 228, 20, rMid, rLit, rDark);
        seloutBlock(ctx, cx - 92, baseY - 34, 184, 18, rMid, rLit, rDark);
        // Intertwined silver world-tree roots across base
        seloutBlock(ctx, cx - 104, baseY - 24, 46, 12, '#64748b', '#cbd5e1');
        seloutBlock(ctx, cx + 58, baseY - 24, 46, 12, '#64748b', '#cbd5e1');

        // Split Megalithic Runestones leaning inward as a mythic portal frame
        for (const side of [-1, 1]) {
          for (let seg = 0; seg < 7; seg++) {
            const lean = side * -seg * 4;
            const sx = cx + side * 68 + lean;
            const sy = baseY - 34 - (seg + 1) * 30;
            const sw = Math.max(24, 44 - seg * 2);
            seloutBlock(ctx, sx - (sw >> 1), sy, sw, 32, rMid, rLit, rDark);
            // Pulsing Elder Runes etched into monolith face
            if (seg >= 1 && seg <= 5) {
              pxFill(ctx, sx - 5, sy + 8, 10, 3, runeGlow);
              pxFill(ctx, sx - 2, sy + 5, 4, 14, runeHot);
              if (seg % 2 === 0) pxFill(ctx, sx - 6, sy + 16, 12, 2, '#fde047');
            }
          }
        }

        // Levitating Crystal Prism Mana-Spire suspended between the monoliths
        const py = baseY - 144 + bob;
        drawSubtleGlow(ctx, renderer.glowCyan || renderer.glowEmerald, cx, py, 76, 92, 0.17 * flick);
        // Stepped diamond crystal prism (`0` rotation — pure stepped scanlines!)
        for (let k = -9; k <= 9; k++) {
          const span = Math.max(2, (10 - Math.abs(k)) * 3);
          const cyLine = py + k * 5;
          pxFill(ctx, cx - span - 1, cyLine, span * 2 + 2, 5, SELOUT);
          pxFill(ctx, cx - span, cyLine, span, 5, '#38bdf8');
          pxFill(ctx, cx, cyLine, span, 5, '#34d399');
          if (Math.abs(k) <= 4) {
            pxFill(ctx, cx - Math.max(2, span - 6), cyLine, Math.max(4, (span - 6) * 2), 5, '#ecfeff');
          }
        }

        // Drifting pixel astral wisps around the Waygate
        for (let w = 0; w < 6; w++) {
          const wa = t * 1.9 + w * 1.05;
          const wx = Math.round(cx + Math.cos(wa) * (38 + (w % 2) * 14));
          const wy = Math.round(py + Math.sin(wa * 1.3) * 44);
          pxFill(ctx, wx - 3, wy - 3, 6, 6, w % 2 === 0 ? '#fde047' : runeHot);
          pxFill(ctx, wx - 1, wy - 1, 2, 2, '#ffffff');
        }
        break;
      }

      case 'starwood_scriptorium': {
        // 6. STARWOOD SCRIPTORIUM & WATCHTOWER RUINS (`x = 2195, w = 256, h = 260`)
        const sDark = infernoAlpha > 0.55 ? '#261411' : '#162e2d';
        const sMid = infernoAlpha > 0.55 ? '#47251f' : '#2a524e';
        const sLit = infernoAlpha > 0.55 ? '#753d32' : '#528e85';
        const leafDark = infernoAlpha > 0.55 ? '#451a03' : '#064e3b';
        const leafMid = infernoAlpha > 0.55 ? '#9a3412' : '#059669';
        const leafLit = infernoAlpha > 0.55 ? '#fb923c' : '#34d399';

        // Foundation plinth + ruined side cloister wall
        seloutBlock(ctx, cx - 128, baseY - 16, 256, 18, sMid, sLit, sDark);
        seloutBlock(ctx, cx - 118, baseY - 128, 72, 114, sMid, sLit, sDark);

        // Main Elven Stone Library Watchtower (`w = 132, h = 236`)
        const tx = cx + 14;
        seloutBlock(ctx, tx - 66, baseY - 224, 132, 210, sMid, sLit, sDark);
        // Weathered broken battlements at tower crown
        seloutBlock(ctx, tx - 70, baseY - 242, 48, 20, sLit, '#a7f3d0', sDark);
        seloutBlock(ctx, tx - 8, baseY - 234, 38, 14, sMid, sLit, sDark);

        // Ancient Elder Tree Branch bursting from upper tower & lush canopy
        seloutBlock(ctx, tx + 34, baseY - 208, 78, 18, '#475569', '#94a3b8', '#1e293b');
        seloutBlock(ctx, tx + 58, baseY - 248, 68, 42, leafDark, leafMid);
        seloutBlock(ctx, tx - 92, baseY - 260, 108, 38, leafDark, leafMid);
        pxFill(ctx, tx - 76, baseY - 254, 64, 14, leafLit);

        // Tall Arched Mullion Library Windows (showing warm arcane scrolls & study crystal)
        for (const wx of [tx - 28, tx + 26]) {
          drawPointedArch(ctx, wx, baseY - 116, 16, 68, sLit, '#0c1926');
          // Lit scroll-shelves inside window
          pxFill(ctx, wx - 11, baseY - 156, 22, 40, '#78350f');
          for (let sh = 0; sh < 3; sh++) {
            pxFill(ctx, wx - 11, baseY - 150 + sh * 12, 22, 3, '#fde047');
            pxFill(ctx, wx - 8, baseY - 146 + sh * 12, 16, 6, '#38bdf8');
          }
          pxFill(ctx, wx - 1, baseY - 168, 2, 52, SELOUT);
          drawSubtleGlow(ctx, renderer.glowCyan, wx, baseY - 142, 38, 46, 0.12 * flick);
        }

        // Scriptorium Archway Entrance + Carved Star Relief
        drawPointedArch(ctx, tx, baseY - 14, 28, 78, sLit, '#071014');
        drawPixelDisc(ctx, tx, baseY - 102, 8, '#fde047', '#ffffff');

        // Hanging Spirit-Lanterns suspended on pixel chains from the elder branches
        for (const [lx, ly] of [
          [cx - 88, baseY - 158],
          [tx + 88, baseY - 168]
        ]) {
          pxFill(ctx, lx - 1, ly - 32, 3, 32, '#64748b');
          seloutBlock(ctx, lx - 10 + sway, ly, 20, 24, '#1e293b', '#94a3b8');
          pxFill(ctx, lx - 6 + sway, ly + 5, 12, 14, '#34d399');
          pxFill(ctx, lx - 3 + sway, ly + 8, 6, 8, '#ecfdf5');
          drawSubtleGlow(ctx, renderer.glowEmerald, lx + sway, ly + 12, 48, 48, 0.16 * flick);
        }
        break;
      }

      case 'ossuary_mausoleum': {
        // 7. NECROPOLIS OSSUARY MAUSOLEUM & GARGOYLE CRYPT (`x = 2610, w = 290, h = 264`)
        const nDark = infernoAlpha > 0.55 ? '#241114' : '#18112b';
        const nMid = infernoAlpha > 0.55 ? '#421e24' : '#2e214d';
        const nLit = infernoAlpha > 0.55 ? '#6e323b' : '#533d82';
        const bone = '#cbd5e1';
        const boneShadow = '#64748b';
        const soulCol = infernoAlpha > 0.55 ? '#fb923c' : '#c084fc';

        // Crypt stepped plinth
        seloutBlock(ctx, cx - 145, baseY - 16, 290, 18, nMid, nLit, nDark);

        // Grim Mausoleum Facade + Classical Triangular Pediment (`h = 264`)
        seloutBlock(ctx, cx - 108, baseY - 196, 216, 182, nMid, nLit, nDark);
        for (let s = 0; s < 12; s++) {
          const pw = 232 - s * 18;
          seloutBlock(ctx, cx - (pw >> 1), baseY - 196 - s * 5, pw, 6, nLit, '#a78bfa', nDark);
        }
        // Horned Skull Tympanum Emblem in pediment
        drawPixelDisc(ctx, cx, baseY - 216, 12, bone, '#f8fafc');
        pxFill(ctx, cx - 6, baseY - 218, 4, 4, '#f43f5e');
        pxFill(ctx, cx + 2, baseY - 218, 4, 4, '#f43f5e');

        // Skull-Inlaid Pilasters (`4 columns` flanking the crypt arch)
        for (const pxOff of [-88, -54, 54, 88]) {
          const px = cx + pxOff;
          seloutBlock(ctx, px - 12, baseY - 190, 24, 174, nDark, nLit);
          for (let sk = 0; sk < 4; sk++) {
            const sky = baseY - 168 + sk * 36;
            seloutBlock(ctx, px - 6, sky, 12, 12, bone, '#ffffff', boneShadow);
            pxFill(ctx, px - 4, sky + 4, 2, 3, SELOUT);
            pxFill(ctx, px + 2, sky + 4, 2, 3, SELOUT);
          }
        }

        // Perched Horned Stone Gargoyles on Outer Plinths (`cx - 124` & `cx + 124`)
        for (const side of [-1, 1]) {
          const gx = cx + side * 124;
          seloutBlock(ctx, gx - 20, baseY - 124, 40, 110, nMid, nLit, nDark);
          // Gargoyle crouched body, bat-wing & horned head
          seloutBlock(ctx, gx - 14, baseY - 158, 28, 34, '#475569', '#94a3b8', '#1e293b');
          seloutBlock(ctx, gx - side * 22, baseY - 178, 18, 38, '#334155', '#64748b');
          seloutBlock(ctx, gx + side * 2 - 8, baseY - 172, 16, 16, '#64748b', '#cbd5e1');
          // Horns & glowing crimson eyes
          pxFill(ctx, gx - 6, baseY - 180, 4, 8, '#cbd5e1');
          pxFill(ctx, gx + 4, baseY - 180, 4, 8, '#cbd5e1');
          pxFill(ctx, gx + side * 3, baseY - 166, 4, 3, '#f43f5e');

          // Violet / Emerald Necrotic Brazier at base of gargoyle plinth
          seloutBlock(ctx, gx - 14, baseY - 46, 28, 12, '#0f172a', '#475569');
          drawPixelFlame(
            ctx,
            gx,
            baseY - 46,
            9,
            Math.round(20 * flick),
            '#7e22ce',
            soulCol,
            '#34d399',
            sway
          );
          drawSubtleGlow(ctx, renderer.glowViolet, gx, baseY - 58, 56, 52, 0.16 * flick);
        }

        // Spiked Iron Crypt Portcullis Archway
        drawPointedArch(ctx, cx, baseY - 14, 38, 118, nLit, '#06040d');
        for (let bx = cx - 28; bx <= cx + 28; bx += 9) {
          pxFill(ctx, bx - 1, baseY - 112, 3, 84, '#334155');
          pxFill(ctx, bx - 2, baseY - 28, 5, 8, '#94a3b8');
        }
        pxFill(ctx, cx - 34, baseY - 86, 68, 4, '#475569');
        pxFill(ctx, cx - 34, baseY - 56, 68, 4, '#475569');
        break;
      }

      case 'soul_reliquary_spire': {
        // 8. CHAINED SOUL-RELIQUARY SPIRE (`x = 3005, w = 224, h = 258`, Ancient Artifact)
        const iDark = '#130e24';
        const iMid = '#2b1f47';
        const iLit = '#58428c';
        const bone = '#cbd5e1';

        // Ritual Ossuary Altar Base
        seloutBlock(ctx, cx - 112, baseY - 18, 224, 20, iMid, iLit, iDark);
        seloutBlock(ctx, cx - 78, baseY - 48, 156, 32, iDark, iLit, '#080510');
        // Row of carved bone skulls along ritual altar frieze
        for (let sx = cx - 60; sx <= cx + 60; sx += 24) {
          seloutBlock(ctx, sx - 6, baseY - 38, 12, 12, bone, '#ffffff', '#64748b');
          pxFill(ctx, sx - 3, baseY - 34, 2, 3, '#f43f5e');
          pxFill(ctx, sx + 1, baseY - 34, 2, 3, '#f43f5e');
        }

        // Outer Wrought-Iron & Bone Reliquary Cage Pillars (`h = 258`)
        for (const side of [-1, 1]) {
          const px = cx + side * 72;
          seloutBlock(ctx, px - 14, baseY - 216, 28, 170, iMid, iLit, iDark);
          // Bone rib bands clasping iron pillar
          for (let b = 0; b < 4; b++) {
            seloutBlock(ctx, px - 17, baseY - 190 + b * 36, 34, 8, bone, '#f8fafc', '#64748b');
          }
          // Spiked iron finial
          seloutBlock(ctx, px - 8, baseY - 242, 16, 28, '#334155', '#94a3b8');
          pxFill(ctx, px - 3, baseY - 256, 6, 16, '#cbd5e1');
        }
        // Upper Gothic Iron Crown Bridge spanning the cage
        seloutBlock(ctx, cx - 86, baseY - 224, 172, 18, iMid, iLit, iDark);
        seloutBlock(ctx, cx - 26, baseY - 252, 52, 30, iLit, bone, iDark);
        pxFill(ctx, cx - 3, baseY - 268, 6, 18, '#f43f5e');

        // Giant Pulsing Crimson/Violet Soul-Heart Crystal suspended in heavy pixel chains!
        const hy = baseY - 142 + bob;
        const anchors = [
          [cx - 62, baseY - 206],
          [cx + 62, baseY - 206],
          [cx - 58, baseY - 56],
          [cx + 58, baseY - 56]
        ];
        for (const [ax, ay] of anchors) {
          for (let k = 0; k <= 7; k++) {
            const u = k / 7;
            const lx = Math.round(ax + (cx - ax) * u);
            const ly = Math.round(ay + (hy - ay) * u);
            seloutBlock(ctx, lx - 4, ly - 3, 8, 6, '#334155', '#94a3b8');
          }
        }

        drawSubtleGlow(ctx, renderer.glowCrimson || renderer.glowViolet, cx, hy, 82, 86, 0.18 * flick);
        for (let k = -8; k <= 8; k++) {
          const span = Math.max(3, (9 - Math.abs(k)) * 3 + (k < 0 ? 4 : 0));
          const sy = hy + k * 4;
          pxFill(ctx, cx - span - 1, sy, span * 2 + 2, 4, SELOUT);
          pxFill(ctx, cx - span, sy, span, 4, '#be123c');
          pxFill(ctx, cx, sy, span, 4, '#9333ea');
          if (Math.abs(k) <= 4) {
            pxFill(ctx, cx - Math.max(2, span - 6), sy, Math.max(4, (span - 6) * 2), 4, '#fda4af');
          }
        }
        pxFill(ctx, cx - 4, hy - 6, 8, 12, '#ffffff');
        break;
      }

      case 'bone_gate_bastion': {
        // 9. ABYSSAL BONE-GATE BASTION (`x = 3405, w = 308, h = 282`)
        const bDark = '#170d1c';
        const bMid = '#311b3b';
        const bLit = '#5c346e';
        const bone = '#cbd5e1';
        const boneDark = '#64748b';

        // Massive Bastion Gatehouse Towers (`cx - 110` & `cx + 110`)
        seloutBlock(ctx, cx - 154, baseY - 18, 308, 20, bMid, bLit, bDark);
        for (const side of [-1, 1]) {
          const tx = cx + side * 108;
          seloutBlock(ctx, tx - 42, baseY - 244, 84, 228, bMid, bLit, bDark);
          // Horned battlements
          seloutBlock(ctx, tx - 46, baseY - 266, 22, 24, bLit, bone, bDark);
          seloutBlock(ctx, tx + 24, baseY - 266, 22, 24, bLit, bone, bDark);
          pxFill(ctx, tx - 44, baseY - 282, 8, 16, bone);
          pxFill(ctx, tx + 36, baseY - 282, 8, 16, bone);

          // Weeping Soul-Torches mounted at two heights
          for (const ty of [baseY - 178, baseY - 88]) {
            seloutBlock(ctx, tx - 8, ty, 16, 18, '#1e293b', '#64748b');
            drawPixelFlame(ctx, tx, ty, 8, Math.round(18 * flick), '#9333ea', '#f43f5e', '#fef08a', sway);
            drawSubtleGlow(ctx, renderer.glowViolet, tx, ty - 10, 48, 48, 0.14 * flick);
          }
        }

        // Colossal Rib-Cage Fortress Archway spanning between the Bastion Towers!
        seloutBlock(ctx, cx - 72, baseY - 228, 144, 212, bDark, bMid);
        drawPointedArch(ctx, cx, baseY - 14, 56, 168, bLit, '#050308');
        // 4 Pairs of Giant Curved Fossilized Titan-Ribs overarching the gate
        for (let r = 0; r < 4; r++) {
          const ry = baseY - 198 + r * 26;
          const rSpan = 64 - r * 5;
          seloutBlock(ctx, cx - rSpan - 8, ry, rSpan, 12, bone, '#ffffff', boneDark);
          seloutBlock(ctx, cx + 8, ry, rSpan, 12, bone, '#ffffff', boneDark);
        }
        // Colossal Horned Skull Keystone above arch
        seloutBlock(ctx, cx - 18, baseY - 224, 36, 32, bone, '#ffffff', boneDark);
        seloutBlock(ctx, cx - 34, baseY - 234, 18, 12, bone, '#f8fafc');
        seloutBlock(ctx, cx + 16, baseY - 234, 18, 12, bone, '#f8fafc');
        pxFill(ctx, cx - 10, baseY - 212, 6, 6, '#ef4444');
        pxFill(ctx, cx + 4, baseY - 212, 6, 6, '#ef4444');

        // Serrated dark-iron portcullis teeth
        for (let gx = cx - 44; gx <= cx + 44; gx += 11) {
          pxFill(ctx, gx - 2, baseY - 154, 4, 88, '#1e293b');
          pxFill(ctx, gx - 3, baseY - 66, 6, 10, '#ef4444');
        }
        break;
      }

      case 'caldera_boss_chasm': {
        // 10. CALDERA BREACH UPPER RIM PYLONS, VOLCANIC THROAT CRAGS & WINCHES (`x = 3792`, behind Boss Pit)
        // Dark jagged caldera crater throat & glowing magma vents behind `y = 436` so Malphas's pit has a dramatic backdrop!
        for (let k = 0; k < 7; k++) {
          const crX = CALDERA_CHASM_MIN_X + 20 + k * 36;
          const crH = 86 + ((k * 29) % 58);
          seloutBlock(ctx, crX, baseY - crH, 40, crH + 4, '#1b0b0e', '#38161c', '#0d0507');
          if (k % 2 === 1) {
            pxFill(ctx, crX + 16, baseY - crH + 22, 5, crH - 26, '#dc2626');
            pxFill(ctx, crX + 17, baseY - crH + 34, 3, Math.round(crH * 0.45), '#fb923c');
          }
        }
        for (const [px, h] of [
          [CALDERA_CHASM_MIN_X - 8, 198],
          [CALDERA_CHASM_MAX_X + 8, 212]
        ]) {
          seloutBlock(ctx, px - 28, baseY - h, 56, h, '#291216', '#54232b', '#14080a');
          seloutBlock(ctx, px - 34, baseY - h - 16, 22, 18, '#451d24', '#fb923c');
          seloutBlock(ctx, px + 12, baseY - h - 12, 22, 14, '#451d24', '#fb923c');
          pxFill(ctx, px - 18, baseY - h + 28, 36, 5, '#f59e0b');
          drawPixelFlame(ctx, px, baseY - h - 16, 10, Math.round(22 * flick), '#dc2626', '#fb923c', '#fef08a', sway);
          drawSubtleGlow(ctx, renderer.glowCrimson || renderer.glowOrange, px, baseY - h - 24, 58, 54, 0.15 * flick);
        }
        break;
      }

      case 'demon_forge_citadel': {
        // 11. BLACK PIT DEMON-FORGE CITADEL (`x = 4165, w = 308, h = 284`)
        const oDark = '#14090c';
        const oMid = '#2b1318';
        const oLit = '#52232c';
        const bronze = '#b45309';
        const bronzeLit = '#f59e0b';

        // Heavy obsidian fortress base
        seloutBlock(ctx, cx - 154, baseY - 18, 308, 20, oMid, bronze, oDark);
        // Main Citadel Keep Wall (`h = 264`)
        seloutBlock(ctx, cx - 142, baseY - 252, 284, 236, oMid, oLit, oDark);

        // Crenelated Basalt Battlements + Horned Bronze Crests (`h = 284`)
        for (let m = -4; m <= 4; m++) {
          seloutBlock(ctx, cx + m * 30 - 11, baseY - 274, 22, 24, oLit, bronzeLit, oDark);
        }
        seloutBlock(ctx, cx - 34, baseY - 266, 68, 36, bronze, bronzeLit, '#451a03');
        // Horned Bronze Demon Crest
        seloutBlock(ctx, cx - 50, baseY - 284, 18, 22, bronzeLit, '#fef08a');
        seloutBlock(ctx, cx + 32, baseY - 284, 18, 22, bronzeLit, '#fef08a');
        pxFill(ctx, cx - 14, baseY - 252, 8, 6, '#fef08a');
        pxFill(ctx, cx + 6, baseY - 252, 8, 6, '#fef08a');

        // Glowing Hellfire Arrow-Slits across upper keep
        for (const sx of [cx - 108, cx, cx + 108]) {
          seloutBlock(ctx, sx - 9, baseY - 206, 18, 52, SELOUT, bronze);
          pxFill(ctx, sx - 4, baseY - 198, 8, 38, '#dc2626');
          pxFill(ctx, sx - 2, baseY - 192, 4, 26, '#fde047');
        }

        // Twin Molten Lava Chutes pouring incandescent magma behind iron grates!
        for (const side of [-1, 1]) {
          const lx = cx + side * 62;
          const chuteTop = baseY - 178;
          seloutBlock(ctx, lx - 24, chuteTop - 10, 48, 14, bronze, bronzeLit, '#451a03');
          pxFill(ctx, lx - 18, chuteTop + 2, 36, baseY - chuteTop - 14, '#7f1d1d');
          pxFill(ctx, lx - 14, chuteTop + 2, 28, baseY - chuteTop - 14, '#ea580c');
          // Animated pouring pixel lava streaks
          for (let st = 0; st < 6; st++) {
            const dropY = chuteTop + 4 + Math.round(((t * 78 + st * 26 + side * 11) % 142));
            pxFill(ctx, lx - 8 + ((st * 7) % 12), dropY, 6, 16, '#fde047');
          }
          // Dark riveted iron grate bars over lava chute
          for (let gy = chuteTop + 22; gy <= baseY - 34; gy += 24) {
            pxFill(ctx, lx - 20, gy, 40, 4, '#18181b');
          }
          // Forged Slag Basin at baseY
          seloutBlock(ctx, lx - 28, baseY - 24, 56, 22, '#1c1917', bronzeLit, '#09090b');
          pxFill(ctx, lx - 20, baseY - 20, 40, 6, '#fb923c');
          pxFill(ctx, lx - 12, baseY - 19, 24, 4, '#fef08a');
          drawSubtleGlow(ctx, renderer.glowOrange, lx, baseY - 42, 64, 68, 0.16 * flick);
        }

        // Central Forged Bronze Siege Gate
        drawPointedArch(ctx, cx, baseY - 14, 30, 108, bronzeLit, '#090406');
        pxFill(ctx, cx - 22, baseY - 96, 44, 82, '#271215');
        pxFill(ctx, cx - 2, baseY - 96, 4, 82, bronzeLit);
        pxFill(ctx, cx - 22, baseY - 58, 44, 5, bronze);
        break;
      }

      case 'hellfire_crucible_monoliths': {
        // 12. SOVEREIGN HELLFIRE CRUCIBLE & THRONE MONOLITHS (`x = 4565, w = 280, h = 270`, Artifact)
        const mDark = '#120709';
        const mMid = '#291015';
        const mLit = '#522029';
        const brass = '#f59e0b';

        // Obsidian ritual dais
        seloutBlock(ctx, cx - 140, baseY - 18, 280, 20, mMid, brass, mDark);
        seloutBlock(ctx, cx - 108, baseY - 36, 216, 20, mMid, mLit, mDark);
        pxFill(ctx, cx - 96, baseY - 26, 192, 3, '#ef4444');

        // Twin Towering Jagged Runic Obsidian Monoliths (`h = 270`)
        for (const side of [-1, 1]) {
          const mx = cx + side * 88;
          for (let seg = 0; seg < 8; seg++) {
            const sw = Math.max(18, 48 - seg * 4);
            const sh = 30;
            const sy = baseY - 36 - (seg + 1) * 29;
            seloutBlock(ctx, mx - (sw >> 1) - side * seg * 2, sy, sw, sh, mMid, mLit, mDark);
            if (seg >= 1 && seg <= 6) {
              const rx = mx - side * seg * 2;
              pxFill(ctx, rx - 5, sy + 8, 10, 4, '#ef4444');
              pxFill(ctx, rx - 2, sy + 4, 4, 16, '#fde047');
            }
          }
        }

        // Chained Molten World-Anvil & Hellfire Crucible Shrine suspended between Monoliths!
        const ay = baseY - 132 + bob;
        for (const [ox, oy] of [
          [cx - 76, baseY - 208],
          [cx + 76, baseY - 208],
          [cx - 68, baseY - 48],
          [cx + 68, baseY - 48]
        ]) {
          for (let k = 0; k <= 6; k++) {
            const u = k / 6;
            seloutBlock(
              ctx,
              Math.round(ox + (cx - ox) * u) - 4,
              Math.round(oy + (ay - oy) * u) - 3,
              8,
              6,
              '#27272a',
              brass
            );
          }
        }

        drawSubtleGlow(ctx, renderer.glowCrimson || renderer.glowOrange, cx, ay - 12, 86, 78, 0.18 * flick);
        // Forged World-Anvil Horn & Crucible Bowl
        seloutBlock(ctx, cx - 32, ay + 6, 64, 18, '#18181b', '#52525b', '#09090b');
        seloutBlock(ctx, cx - 48, ay - 12, 96, 20, '#27272a', brass, '#09090b');
        pxFill(ctx, cx - 38, ay - 8, 76, 5, '#fb923c');
        drawPixelFlame(ctx, cx, ay - 12, 20, Math.round(34 * flick), '#dc2626', '#fb923c', '#fef08a', sway);
        break;
      }

      default:
        break;
    }
  }

  // ===========================================================================
  // MAIN WORLD RENDER ENTRY POINT (`exact signature preserved`)
  // ===========================================================================
  static render(ctx, renderer, _ww) {
    const zoom = Math.max(0.35, renderer.zoom || 1);
    const camX = Number.isFinite(renderer.camX) ? renderer.camX : 600;
    const camY = Number.isFinite(renderer.camY) ? renderer.camY : 445;
    const screenAnchorY =
      renderer.height * (renderer.isMobile ? 0.58 : 0.68);

    // Exact live world-space viewport bounds + generous padding so ZERO edges can ever appear!
    const viewLeft = Math.floor(camX - (renderer.width * 0.5) / zoom - 240);
    const viewRight = Math.ceil(camX + (renderer.width * 0.5) / zoom + 240);
    const viewTop = Math.floor(camY - screenAnchorY / zoom - 260);
    const viewBot = Math.ceil(camY + (renderer.height - screenAnchorY) / zoom + 260);
    const viewW = viewRight - viewLeft;

    const isInfernoPerm = renderer.permanentStageOverride === 'inferno';
    const infernoAlpha = isInfernoPerm
      ? 1.0
      : renderer.trueUltStageOverride === 'inferno'
        ? Math.max(0, Math.min(1, renderer.trueUltStageAlpha || 0))
        : 0;

    const camWeights = AdventureMapRenderer.getBiomeWeights(camX);
    const t = renderer.time || 0;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // =========================================================================
    // 1. INFINITE CELESTIAL SKY & HORIZON GRADIENT (`viewTop .. 350`)
    // =========================================================================
    const skyTopCol = AdventureMapRenderer.blendColor('skyTop', camWeights, infernoAlpha, [0, 0, 0]);
    const skyMidCol = AdventureMapRenderer.blendColor('skyMid', camWeights, infernoAlpha, [0, 0, 0]);
    const skyHorCol = AdventureMapRenderer.blendColor('skyHorizon', camWeights, infernoAlpha, [0, 0, 0]);
    const mistCol = AdventureMapRenderer.blendColor('mistRgb', camWeights, infernoAlpha, [0, 0, 0]);

    const skyGradTop = Math.min(viewTop, -680);
    const skyGrad = ctx.createLinearGradient(0, skyGradTop, 0, ADVENTURE_ROAD_TOP_Y);
    skyGrad.addColorStop(0, rgbStr(skyTopCol));
    skyGrad.addColorStop(0.58, rgbStr(skyMidCol));
    skyGrad.addColorStop(0.92, rgbStr(skyHorCol));
    skyGrad.addColorStop(1.0, rgbStr(skyMidCol));
    ctx.fillStyle = skyGrad;
    ctx.fillRect(viewLeft, viewTop, viewW, Math.max(20, ADVENTURE_ROAD_TOP_Y + 24 - viewTop));

    // Twinkling 16-bit Pixel Starfield (`0.05x` parallax, seamless infinite tiling)
    const starOffsetX = Math.round(camX * 0.95);
    const starTileW = 320;
    const firstStarTile = Math.floor((viewLeft - starOffsetX) / starTileW);
    const lastStarTile = Math.ceil((viewRight - starOffsetX) / starTileW);
    for (let st = firstStarTile; st <= lastStarTile; st++) {
      for (let i = 0; i < 14; i++) {
        const hx = hash2D(st, i * 3 + 1);
        const hy = hash2D(st, i * 3 + 2);
        const sx = Math.round((starOffsetX + st * starTileW + hx * starTileW) / 2) * 2;
        const sy = Math.round((-420 + hy * 640) / 2) * 2;
        if (sy < viewTop || sy > 280) continue;
        const twinkle = 0.45 + 0.55 * Math.sin(t * (2.4 + (i % 4) * 0.7) + st * 1.9 + i);
        ctx.globalAlpha = twinkle * (infernoAlpha > 0.5 ? 0.38 : 0.78);
        ctx.fillStyle = i % 4 === 0 ? rgbaStr(mistCol, 1) : '#f8fafc';
        const sz = i % 5 === 0 ? 4 : 2;
        ctx.fillRect(sx, sy, sz, sz);
      }
    }
    ctx.globalAlpha = 1;

    // Colossal Celestial Eclipse / Astral Moon (`0.08x` sky parallax)
    const moonX = Math.round((camX * 0.92 + 110) / 4) * 4;
    const moonY = 92;
    const moonGlow =
      infernoAlpha > 0.4 || camWeights[3] > 0.45
        ? renderer.glowCrimson || renderer.glowOrange
        : camWeights[1] > 0.45
          ? renderer.glowEmerald || renderer.glowCyan
          : camWeights[2] > 0.45
            ? renderer.glowViolet || renderer.glowCrimson
            : renderer.glowGold || renderer.glowOrange;
    drawSubtleGlow(ctx, moonGlow, moonX, moonY, 220, 220, 0.18);

    // Stepped Pixel-Art Eclipse Ring & Darkened Core Disc
    const moonR = 56;
    for (let py = -moonR; py <= moonR; py += 4) {
      const span = Math.round(Math.sqrt(Math.max(0, moonR * moonR - py * py)) / 4) * 4;
      ctx.fillStyle = infernoAlpha > 0.4 ? '#fde047' : rgbaStr(mistCol, 0.92);
      ctx.fillRect(moonX - span - 4, moonY + py, span * 2 + 8, 4);
      const innerR = moonR - 6;
      if (Math.abs(py) < innerR) {
        const inSpan = Math.round(Math.sqrt(Math.max(0, innerR * innerR - py * py)) / 4) * 4;
        ctx.fillStyle = rgbStr(skyTopCol);
        ctx.fillRect(moonX - inSpan + 4, moonY + py, Math.max(0, inSpan * 2 - 4), 4);
      }
    }

    // =========================================================================
    // 2. SEAMLESS PARALLAX MOUNTAINS (`0.18x`) & UPGRADED ARCHITECTURAL SKYLINE (`0.42x`)
    // =========================================================================
    const farCol = AdventureMapRenderer.blendColor('farMtn', camWeights, infernoAlpha, [0, 0, 0]);
    const midCol = AdventureMapRenderer.blendColor('midRuin', camWeights, infernoAlpha, [0, 0, 0]);
    const midLitCol = AdventureMapRenderer.blendColor('midRuinLit', camWeights, infernoAlpha, [0, 0, 0]);

    // 2A. Far Jagged Mountain / Caldera Range (`16px` pixel-stepped columns)
    const farAnchor = camX * 0.82;
    ctx.fillStyle = rgbStr(farCol);
    const farStep = 16;
    const farStart = Math.floor(viewLeft / farStep) * farStep;
    for (let wx = farStart; wx <= viewRight; wx += farStep) {
      const relX = wx - farAnchor;
      const ridge =
        Math.sin(relX * 0.0042) * 58 +
        Math.cos(relX * 0.0115 + 1.4) * 32 +
        Math.sin(relX * 0.026) * 14;
      const topY = Math.round((215 - ridge) / 4) * 4;
      ctx.fillRect(wx, topY, farStep + 1, ADVENTURE_ROAD_TOP_Y - topY + 12);
    }

    // 2B. Upgraded `0.42x` Parallax Midground Architectural Skyline (`camX * 0.58` anchor)
    const midAnchor = camX * 0.58;
    const midSlotW = 208;
    const firstMidSlot = Math.floor((viewLeft - midAnchor) / midSlotW) - 1;
    const lastMidSlot = Math.ceil((viewRight - midAnchor) / midSlotW) + 1;
    const midBaseStr = rgbStr(midCol);
    const midLitStr = rgbStr(midLitCol);

    for (let slot = firstMidSlot; slot <= lastMidSlot; slot++) {
      const sx = Math.round((midAnchor + slot * midSlotW) / 4) * 4;
      const sampleWorldX = camX + (sx - camX) * 1.15;
      const bIdx = AdventureMapRenderer.pickClusteredBiomeIndex(sampleWorldX, 77);
      const hVar = Math.round((hash2D(slot, 19) * 56) / 4) * 4;

      if (bIdx === 0) {
        // Distant Cathedral Nave, Flying Buttresses, Twin Spires & Aqueduct Arches
        const baseH = 156 + hVar;
        seloutBlock(ctx, sx + 12, 392 - baseH, 48, baseH + 44, midBaseStr, midLitStr);
        seloutBlock(ctx, sx + 22, 392 - baseH - 32, 28, 34, midBaseStr, midLitStr);
        pxFill(ctx, sx + 32, 392 - baseH - 58, 8, 26, midLitStr);
        // Viaduct bridge span + recessed arch cutouts
        seloutBlock(ctx, sx + 60, 284, 148, 96, midBaseStr, midLitStr);
        pxFill(ctx, sx + 78, 316, 36, 64, rgbStr(farCol));
        pxFill(ctx, sx + 138, 316, 36, 64, rgbStr(farCol));
        // Distant lit cathedral lancet slits
        pxFill(ctx, sx + 32, 392 - baseH + 28, 8, 22, '#f59e0b');
      } else if (bIdx === 1) {
        // Colossal Starwood World-Boughs, Pagoda Temple Silhouette & Hanging Roots
        const trunkH = 168 + hVar;
        seloutBlock(ctx, sx + 52, 396 - trunkH, 36, trunkH + 40, midBaseStr, midLitStr);
        seloutBlock(ctx, sx + 4, 396 - trunkH - 38, 132, 48, midBaseStr, midLitStr);
        seloutBlock(ctx, sx + 24, 396 - trunkH - 66, 92, 32, midBaseStr, midLitStr);
        // Distant elven cliff pagoda eave
        seloutBlock(ctx, sx + 132, 268, 68, 112, midBaseStr, midLitStr);
        pxFill(ctx, sx + 122, 264, 88, 8, midLitStr);
        if (infernoAlpha < 0.5) {
          pxFill(ctx, sx + 162, 292, 8, 16, '#34d399');
        }
      } else if (bIdx === 2) {
        // Necropolis Citadel Spires, Tilted Crypt Mausoleums & Giant Rib Viaducts
        const obH = 152 + hVar;
        seloutBlock(ctx, sx + 20, 396 - obH, 36, obH + 40, midBaseStr, midLitStr);
        seloutBlock(ctx, sx + 26, 396 - obH - 26, 24, 26, midBaseStr, midLitStr);
        seloutBlock(ctx, sx + 88, 262, 92, 136, midBaseStr, midLitStr);
        pxFill(ctx, sx + 114, 304, 40, 88, rgbStr(farCol));
        pxFill(ctx, sx + 34, 396 - obH + 24, 8, 20, '#c084fc');
      } else {
        // Black Pit Obsidian Bastions, Horned Demon-Towers & Distant Lavafalls
        const keepH = 168 + hVar;
        seloutBlock(ctx, sx + 14, 396 - keepH, 84, keepH + 40, midBaseStr, midLitStr);
        seloutBlock(ctx, sx + 10, 396 - keepH - 18, 20, 20, midBaseStr, midLitStr);
        seloutBlock(ctx, sx + 82, 396 - keepH - 18, 20, 20, midBaseStr, midLitStr);
        seloutBlock(ctx, sx + 118, 276, 72, 120, midBaseStr, midLitStr);
        ctx.fillStyle = infernoAlpha > 0.5 ? '#fb923c' : '#dc2626';
        ctx.fillRect(sx + 52, 396 - keepH + 26, 8, keepH - 14);
        ctx.fillRect(sx + 150, 302, 6, 84);
      }
    }

    // Soft Horizon Canyon Mist Veil separating distant vistas from the `1.0x` walkable world
    const mistGrad = ctx.createLinearGradient(0, 250, 0, ADVENTURE_ROAD_TOP_Y + 12);
    mistGrad.addColorStop(0, rgbaStr(mistCol, 0));
    mistGrad.addColorStop(0.68, rgbaStr(mistCol, 0.15 + infernoAlpha * 0.08));
    mistGrad.addColorStop(1, rgbaStr(skyMidCol, 0.42));
    ctx.fillStyle = mistGrad;
    ctx.fillRect(viewLeft, 250, viewW, ADVENTURE_ROAD_TOP_Y - 238);

    // =========================================================================
    // 3. UPPER RETAINING WALL & PARAPET BALUSTRADE (`y: 368..436`)
    // =========================================================================
    const wallBrickW = 48;
    const firstBrickCol = Math.floor(viewLeft / wallBrickW) - 1;
    const lastBrickCol = Math.ceil(viewRight / wallBrickW) + 1;
    const parapetTopY = 368;
    const parapetH = ADVENTURE_ROAD_TOP_Y - parapetTopY; // 68px tall carved stone retaining wall

    for (let bc = firstBrickCol; bc <= lastBrickCol; bc++) {
      const bx = bc * wallBrickW;
      // Leave clean abyssal breach across the Shattered Caldera Boss Chasm (`3658..3926`)
      if (bx + wallBrickW > CALDERA_CHASM_MIN_X + 18 && bx < CALDERA_CHASM_MAX_X - 18) {
        continue;
      }

      const bIdx = AdventureMapRenderer.pickClusteredBiomeIndex(bx + 24, 105);
      const wDark = AdventureMapRenderer.sampleBiomeColor(bIdx, 'wallDark', infernoAlpha);
      const wMid = AdventureMapRenderer.sampleBiomeColor(bIdx, 'wallMid', infernoAlpha);
      const wLit = AdventureMapRenderer.sampleBiomeColor(bIdx, 'wallLight', infernoAlpha);
      const trim = AdventureMapRenderer.sampleBiomeColor(bIdx, 'trimCol', infernoAlpha);

      // Base `#0d0f1c` mortar & recessed masonry courses
      ctx.fillStyle = SELOUT;
      ctx.fillRect(bx, parapetTopY - 6, wallBrickW, parapetH + 8);
      ctx.fillStyle = wDark;
      ctx.fillRect(bx + 1, parapetTopY + 10, wallBrickW - 2, parapetH - 12);

      // Two staggered ashlar stone rows
      ctx.fillStyle = wMid;
      ctx.fillRect(bx + 2, parapetTopY + 14, wallBrickW - 4, 22);
      const stag = (bc & 1) * 20;
      ctx.fillRect(bx + 2, parapetTopY + 39, Math.max(8, 24 - stag), 22);
      ctx.fillRect(bx + 28 - stag, parapetTopY + 39, 18 + stag, 22);

      // Upper carved balustrade coping cap + 16-bit highlight bevel
      ctx.fillStyle = wLit;
      ctx.fillRect(bx + 1, parapetTopY - 4, wallBrickW - 2, 12);
      ctx.fillStyle = trim;
      ctx.fillRect(bx + 4, parapetTopY + 9, wallBrickW - 8, 3);

      // Organic moss / skull-niche / molten trim accents along the upper coping
      if (bIdx === 1 && hash2D(bc, 211) > 0.35 && infernoAlpha < 0.6) {
        ctx.fillStyle = '#10b981';
        ctx.fillRect(bx + 8, parapetTopY + 6, 16, 6);
        ctx.fillRect(bx + 12, parapetTopY + 12, 8, 6);
      } else if (bIdx === 2 && hash2D(bc, 219) > 0.58 && infernoAlpha < 0.6) {
        seloutBlock(ctx, bx + 16, parapetTopY + 18, 14, 14, '#cbd5e1', '#ffffff', '#64748b');
        pxFill(ctx, bx + 19, parapetTopY + 23, 2, 3, SELOUT);
        pxFill(ctx, bx + 25, parapetTopY + 23, 2, 3, SELOUT);
      } else if ((bIdx === 3 || infernoAlpha > 0.35) && hash2D(bc, 213) > 0.45) {
        ctx.fillStyle = '#fb923c';
        ctx.fillRect(bx + 10, parapetTopY + 36, 14, 3);
      }
    }

    // =========================================================================
    // 4. DEEP 2.5D PERSPECTIVE WALKABLE FLAGSTONE CAUSEWAY (`y: 436..686`)
    // =========================================================================
    for (let r = 0; r < ROAD_COURSES.length; r++) {
      const course = ROAD_COURSES[r];
      const cy = course.y;
      const ch = course.h;
      const tw = course.tileW;
      const isRunnerCourse = cy >= 532 && cy + ch <= 596;
      const stagger = (r & 1) * (tw >> 1);
      const startTile = Math.floor((viewLeft - stagger) / tw) - 1;
      const endTile = Math.ceil((viewRight - stagger) / tw) + 1;

      for (let tc = startTile; tc <= endTile; tc++) {
        const tx = tc * tw + stagger;
        const centerWorldX = tx + tw * 0.5;
        if (centerWorldX > CALDERA_CHASM_MIN_X + 26 && centerWorldX < CALDERA_CHASM_MAX_X - 26) {
          continue;
        }
        const bIdx = AdventureMapRenderer.pickClusteredBiomeIndex(centerWorldX, 300 + r * 7);
        const hVal = hash2D(tc, r * 13 + 5);

        // Dark 2px `#0d0f1c` mortar joint bed (glowing magma mortar in Zone IV / Inferno!)
        ctx.fillStyle =
          (infernoAlpha > 0.45 || bIdx === 3) && hVal > 0.68 ? '#ea580c' : SELOUT;
        ctx.fillRect(tx, cy, tw, ch);

        if (isRunnerCourse) {
          // Regal Center Causeway Runner Inlay (`y ~ 532..590`)
          const runDark = AdventureMapRenderer.sampleBiomeColor(bIdx, 'runnerDark', infernoAlpha);
          const runMid = AdventureMapRenderer.sampleBiomeColor(bIdx, 'runnerMid', infernoAlpha);
          const runTrim = AdventureMapRenderer.sampleBiomeColor(bIdx, 'runnerTrim', infernoAlpha);
          ctx.fillStyle = runDark;
          ctx.fillRect(tx + 2, cy + 2, tw - 3, ch - 3);
          ctx.fillStyle = runMid;
          ctx.fillRect(tx + 4, cy + 4, tw - 7, ch - 7);
          ctx.fillStyle = runTrim;
          if (r === 4) ctx.fillRect(tx + 1, cy + 1, tw - 2, 3);
          if (r === 5) {
            ctx.fillRect(tx + 1, cy + ch - 4, tw - 2, 3);
            if ((tc & 1) === 0) {
              ctx.fillRect(tx + (tw >> 1) - 6, cy + 6, 12, 4);
            }
          }
        } else {
          // 3-Tone Cel-Clustered Perspective Stone Slab
          const baseKey = r <= 1 ? 'roadShadow' : hVal > 0.58 ? 'roadMid' : 'roadBase';
          const slabCol = AdventureMapRenderer.sampleBiomeColor(bIdx, baseKey, infernoAlpha);
          const bevelCol = AdventureMapRenderer.sampleBiomeColor(bIdx, 'roadLit', infernoAlpha);

          ctx.fillStyle = slabCol;
          ctx.fillRect(tx + 2, cy + 2, tw - 3, ch - 3);

          if (r >= 1) {
            ctx.fillStyle = bevelCol;
            ctx.fillRect(tx + 3, cy + 2, tw - 6, 2);
          }

          // Stepped pixel-art weathered flagstone cracks
          if (hVal < 0.19 && r >= 1) {
            const crX = tx + Math.round(tw * 0.36);
            const crY = cy + Math.round(ch * 0.32);
            pxFill(ctx, crX, crY, 8, 2, SELOUT);
            pxFill(ctx, crX + 6, crY + 2, 7, 2, SELOUT);
            pxFill(ctx, crX + 7, crY + 4, 6, 1, bevelCol);
          }

          // Biome-specific enriched floor inlays (subtle & crisp — never cluttering combat telegraphs)
          if (hVal > 0.74) {
            if (bIdx === 1 && infernoAlpha < 0.5) {
              // Starwood mossy flagstone seams & tiny fallen star-leaves
              pxFill(ctx, tx + 6, cy + 3, 14, 4, '#065f46');
              pxFill(ctx, tx + 9, cy + 4, 9, 3, '#10b981');
              if (hVal > 0.88) {
                pxFill(ctx, tx + tw - 16, cy + Math.floor(ch * 0.55), 5, 3, '#38bdf8');
                pxFill(ctx, tx + tw - 22, cy + Math.floor(ch * 0.65), 4, 2, '#fde047');
              }
            } else if (bIdx === 2 && infernoAlpha < 0.5 && hVal > 0.83) {
              // Necropolis recessed bone-rib & weathered skull flagstone inlays
              pxFill(ctx, tx + 10, cy + 5, 20, Math.max(6, ch - 10), SELOUT);
              pxFill(ctx, tx + 12, cy + 7, 7, 6, '#cbd5e1');
              pxFill(ctx, tx + 21, cy + 7, 6, 2, '#94a3b8');
              pxFill(ctx, tx + 21, cy + 11, 6, 2, '#94a3b8');
            } else if (bIdx === 3 || infernoAlpha >= 0.45) {
              // Black Pit / Inferno glowing magma floor seams
              const mx = tx + 10;
              const my = cy + Math.floor(ch * 0.48);
              pxFill(ctx, mx - 1, my - 1, 18, 5, '#450a0a');
              pxFill(ctx, mx, my, 15, 3, '#ef4444');
              pxFill(ctx, mx + 3, my + 1, 9, 2, '#fde047');
            } else {
              // Eclipse imperial brass corner-rivets & amber dust
              const detCol = AdventureMapRenderer.sampleBiomeColor(
                bIdx,
                hVal > 0.89 ? 'detailB' : 'detailA',
                infernoAlpha
              );
              pxFill(ctx, tx + 8, cy + Math.floor(ch * 0.5), 10, 3, detCol);
            }
          }
        }
      }
    }

    // Inlaid Pixel-Art Stone Causeway Medallions along `y = 561` (`every 320px`)
    const medSpacing = 320;
    const firstMed = Math.floor(viewLeft / medSpacing);
    const lastMed = Math.ceil(viewRight / medSpacing);
    for (let m = firstMed; m <= lastMed; m++) {
      const mx = m * medSpacing + 160;
      if (
        (mx > CALDERA_CHASM_MIN_X - 40 && mx < CALDERA_CHASM_MAX_X + 40) ||
        (mx > 4110 && mx < 4570)
      ) {
        continue;
      }
      const bIdx = AdventureMapRenderer.pickClusteredBiomeIndex(mx, 444);
      const trim = AdventureMapRenderer.sampleBiomeColor(bIdx, 'runnerTrim', infernoAlpha);
      const lit = AdventureMapRenderer.sampleBiomeColor(bIdx, 'roadLit', infernoAlpha);
      const dark = AdventureMapRenderer.sampleBiomeColor(bIdx, 'roadShadow', infernoAlpha);
      const my = 561;

      // Foreshortened stepped octagonal stone & brass/jade/amethyst floor medallion
      seloutBlock(ctx, mx - 28, my - 11, 56, 22, dark, trim);
      seloutBlock(ctx, mx - 20, my - 15, 40, 30, dark, lit);
      pxFill(ctx, mx - 14, my - 9, 28, 18, trim);
      pxFill(ctx, mx - 10, my - 6, 20, 12, dark);
      pxFill(ctx, mx - 4, my - 3, 8, 6, trim);
    }

    // Continuous Ambient Contact Shadow cast by the Upper Parapet onto the top of the 3D Road (`y: 436..454`)
    ctx.fillStyle = 'rgba(4, 6, 14, 0.46)';
    ctx.fillRect(viewLeft, ADVENTURE_ROAD_TOP_Y, viewW, 10);
    ctx.fillStyle = 'rgba(4, 6, 14, 0.22)';
    ctx.fillRect(viewLeft, ADVENTURE_ROAD_TOP_Y + 10, viewW, 8);

    // Zone IV Left-Side Shattered Caldera Boss Chasm (`x = 3650..3935`)
    if (viewRight > CALDERA_CHASM_MIN_X - 40 && viewLeft < CALDERA_CHASM_MAX_X + 40) {
      AdventureMapRenderer.renderCalderaBossChasm(ctx, renderer, t, infernoAlpha);
    }

    // Zone IV Boss Sanctuary Floor Seal etched seamlessly into the 3D Basalt Causeway (`x = 4140..4540`)
    if (viewRight > 4060 && viewLeft < 4620) {
      const sealCx = 4340;
      const sealCy = 560;
      const pulse = 0.55 + 0.25 * Math.sin(t * 3.6);
      ctx.save();
      ctx.strokeStyle = `rgba(239, 68, 68, ${(0.34 * pulse).toFixed(3)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(sealCx, sealCy, 195, 68, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(251, 146, 60, ${(0.28 * pulse).toFixed(3)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(sealCx, sealCy, 132, 46, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // =========================================================================
    // 5A. MONUMENTAL `1.0x` WORLD-SPACE BUILDINGS & ANCIENT REALM ARTIFACTS
    // =========================================================================
    for (let i = 0; i < ADVENTURE_LANDMARKS.length; i++) {
      const lm = ADVENTURE_LANDMARKS[i];
      if (lm.x + lm.halfW + 64 < viewLeft || lm.x - lm.halfW - 64 > viewRight) continue;
      AdventureMapRenderer.renderMonumentalLandmark(ctx, lm, renderer, t, infernoAlpha);
    }

    // =========================================================================
    // 5B. ROADSIDE PILLARS, STARWOOD TREES, OBELISKS & BRAZIERS (framing gaps!)
    // =========================================================================
    const propSpacing = 256;
    const firstProp = Math.floor(viewLeft / propSpacing) - 1;
    const lastProp = Math.ceil(viewRight / propSpacing) + 1;

    for (let p = firstProp; p <= lastProp; p++) {
      const px = p * propSpacing + 128;
      if (isNearLandmarkOrChasm(px, 42)) continue;

      const bIdx = AdventureMapRenderer.pickClusteredBiomeIndex(px, 509);
      const baseY = ADVENTURE_ROAD_TOP_Y + 2;
      const flick = 0.78 + 0.22 * Math.sin(t * 7.2 + p * 1.9);

      ctx.fillStyle = 'rgba(3, 5, 12, 0.52)';
      ctx.fillRect(px - 30, baseY - 2, 60, 10);

      if (bIdx === 1 && infernoAlpha < 0.65) {
        // WHISPERING STARWOOD: Gnarled Ancient Starwood Pillar-Tree + Glowing Jade Stone Lantern
        seloutBlock(ctx, px - 26, baseY - 22, 52, 24, '#1e3a34', '#2d544b', '#091416');
        seloutBlock(ctx, px - 18, baseY - 154, 36, 136, '#1e3a34', '#3b6e62', '#091416');
        pxFill(ctx, px - 6, baseY - 144, 6, 118, '#0f2421');
        // Multi-tiered organic stepped pixel canopy + hanging bioluminescent vines
        seloutBlock(ctx, px - 58, baseY - 178, 116, 30, '#064e3b', '#059669', '#022c22');
        seloutBlock(ctx, px - 46, baseY - 198, 92, 26, '#065f46', '#10b981', '#064e3b');
        seloutBlock(ctx, px - 28, baseY - 212, 56, 18, '#059669', '#34d399', '#064e3b');
        pxFill(ctx, px - 48, baseY - 148, 6, 18, '#10b981');
        pxFill(ctx, px + 40, baseY - 148, 6, 22, '#34d399');

        const lx = px + 44;
        seloutBlock(ctx, lx - 10, baseY - 46, 20, 46, '#1e293b', '#475569', '#0f172a');
        seloutBlock(ctx, lx - 14, baseY - 52, 28, 8, '#334155', '#94a3b8');
        pxFill(ctx, lx - 6, baseY - 42, 12, 14, '#34d399');
        pxFill(ctx, lx - 3, baseY - 39, 6, 8, '#ecfdf5');

        drawSubtleGlow(ctx, renderer.glowEmerald, lx, baseY - 40, 56, 48, 0.17 * flick);
        drawSubtleGlow(ctx, renderer.glowEmerald, lx, baseY + 8, 72, 24, 0.12 * flick);
      } else if (bIdx === 2 && infernoAlpha < 0.65) {
        // SUNKEN BONE-BRIDGE: Runic Necropolis Obelisk & Soul-Fire Torch
        seloutBlock(ctx, px - 20, baseY - 148, 40, 150, '#271c3c', '#4c3a69', '#090612');
        pxFill(ctx, px - 14, baseY - 26, 28, 8, '#cbd5e1');
        const fh = Math.round(16 + 5 * flick);
        drawPixelFlame(ctx, px, baseY - 148, 8, fh, '#7e22ce', '#a855f7', '#fdf4ff');
        pxFill(ctx, px - 4, baseY - 104, 8, 36, '#f43f5e');

        drawSubtleGlow(ctx, renderer.glowViolet, px, baseY - 132, 64, 64, 0.17 * flick);
        drawSubtleGlow(ctx, renderer.glowViolet, px, baseY + 8, 78, 26, 0.12 * flick);
      } else {
        // ECLIPSE CAUSEWAY / BLACK PIT / INFERNO: Stepped Obsidian Buttress & Roaring Brazier
        const isHell = bIdx === 3 || infernoAlpha >= 0.5;
        seloutBlock(
          ctx,
          px - 22,
          baseY - 144,
          44,
          146,
          isHell ? '#2b1619' : '#1e293b',
          isHell ? '#4c2429' : '#334155',
          '#070911'
        );
        ctx.fillStyle = isHell ? '#d97706' : '#d4af37';
        ctx.fillRect(px - 24, baseY - 118, 48, 5);
        ctx.fillRect(px - 24, baseY - 22, 48, 4);

        const bx = px;
        const by = baseY - 146;
        seloutBlock(ctx, bx - 16, by, 32, 10, '#1e293b', '#475569', '#090d16');
        const fh = Math.round(18 + 6 * flick);
        drawPixelFlame(
          ctx,
          bx,
          by,
          10,
          fh,
          isHell ? '#b91c1c' : '#ea580c',
          isHell ? '#ef4444' : '#fb923c',
          '#fef08a'
        );

        const glowTex = isHell ? renderer.glowCrimson || renderer.glowOrange : renderer.glowOrange;
        drawSubtleGlow(ctx, glowTex, bx, by - 10, 68, 68, 0.18 * flick);
        drawSubtleGlow(ctx, glowTex, bx, baseY + 9, 84, 27, 0.13 * flick);
      }
    }

    // =========================================================================
    // 6. FOREGROUND CLIFFSIDE CURB, LOW PLINTHS & ABYSSAL ESCARPMENT (`y: 668..viewBot`)
    // =========================================================================
    const curbY = ADVENTURE_ROAD_BOT_Y;
    const cliffH = Math.max(120, viewBot - curbY + 40);
    const cliffDark = AdventureMapRenderer.blendColor('cliffDark', camWeights, infernoAlpha, [0, 0, 0]);
    const cliffMid = AdventureMapRenderer.blendColor('cliffMid', camWeights, infernoAlpha, [0, 0, 0]);
    const abyssGlow = AdventureMapRenderer.blendColor('abyssGlow', camWeights, infernoAlpha, [0, 0, 0]);

    const cliffGrad = ctx.createLinearGradient(0, curbY, 0, curbY + Math.min(560, cliffH));
    cliffGrad.addColorStop(0, rgbStr(cliffMid));
    cliffGrad.addColorStop(0.32, rgbStr(cliffDark));
    cliffGrad.addColorStop(1, '#04060d');
    ctx.fillStyle = cliffGrad;
    ctx.fillRect(viewLeft, curbY, viewW, cliffH);

    // Carved Foreground Stone Coping Blocks (`56px` wide) + Periodic Low Foreground Plinths (`<= 18px` above `686`)
    const curbBlockW = 56;
    const firstCurb = Math.floor(viewLeft / curbBlockW) - 1;
    const lastCurb = Math.ceil(viewRight / curbBlockW) + 1;
    for (let cb = firstCurb; cb <= lastCurb; cb++) {
      const cx = cb * curbBlockW;
      if (cx + curbBlockW > CALDERA_CHASM_MIN_X + 20 && cx < CALDERA_CHASM_MAX_X - 20) {
        continue;
      }

      const bIdx = AdventureMapRenderer.pickClusteredBiomeIndex(cx + 28, 701);
      const cBase = AdventureMapRenderer.sampleBiomeColor(bIdx, 'curbBase', infernoAlpha);
      const cLit = AdventureMapRenderer.sampleBiomeColor(bIdx, 'curbLit', infernoAlpha);
      const cCliff = AdventureMapRenderer.sampleBiomeColor(bIdx, 'cliffMid', infernoAlpha);
      const cTrim = AdventureMapRenderer.sampleBiomeColor(bIdx, 'trimCol', infernoAlpha);

      // 3D Coping Block Lip (`y: 686..712`)
      ctx.fillStyle = SELOUT;
      ctx.fillRect(cx, curbY, curbBlockW, 28);
      ctx.fillStyle = cBase;
      ctx.fillRect(cx + 2, curbY + 2, curbBlockW - 3, 22);
      ctx.fillStyle = cLit;
      ctx.fillRect(cx + 3, curbY + 2, curbBlockW - 6, 4);

      // Vertical Cliff Buttress Ribbing descending into the chasm
      const ribH = 84 + Math.round(hash2D(cb, 811) * 96);
      ctx.fillStyle = cCliff;
      ctx.fillRect(cx + 8, curbY + 28, curbBlockW - 18, ribH);

      if ((bIdx === 3 || infernoAlpha > 0.35) && hash2D(cb, 823) > 0.45) {
        ctx.fillStyle = infernoAlpha > 0.6 ? '#fde047' : '#ea580c';
        ctx.fillRect(cx + 24, curbY + 30, 4, ribH - 12);
      } else if (bIdx === 1 && infernoAlpha < 0.5 && hash2D(cb, 829) > 0.4) {
        ctx.fillStyle = '#059669';
        ctx.fillRect(cx + 18, curbY + 24, 8, 34);
        ctx.fillStyle = '#34d399';
        ctx.fillRect(cx + 20, curbY + 24, 4, 22);
      }

      // Periodic Low Foreground Cliff Plinths / Broken Gargoyle Bases / Runic Boundary Markers
      // (`height <= 18px` above `686` -> `y: 668..710`, enhancing 2.5D depth without obscuring fighters!)
      if (((cb % 4) + 4) % 4 === 2) {
        const px = cx + 28;
        if (bIdx === 1 && infernoAlpha < 0.55) {
          // Starwood Mossy Runic Boundary Marker (`topY = 668`)
          seloutBlock(ctx, px - 18, curbY - 12, 36, 28, cBase, cLit);
          seloutBlock(ctx, px - 12, curbY - 18, 24, 10, '#1e4640', '#34d399');
          pxFill(ctx, px - 3, curbY - 14, 6, 6, '#a7f3d0');
        } else if (bIdx === 2 && infernoAlpha < 0.55) {
          // Necropolis Broken Gargoyle Claw-Base & Skull Plinth (`topY = 668`)
          seloutBlock(ctx, px - 19, curbY - 14, 38, 30, cBase, cLit);
          seloutBlock(ctx, px - 13, curbY - 18, 12, 6, '#94a3b8', '#e2e8f0');
          seloutBlock(ctx, px + 1, curbY - 18, 12, 6, '#94a3b8', '#e2e8f0');
          pxFill(ctx, px - 5, curbY - 8, 10, 8, '#cbd5e1');
        } else if (bIdx === 3 || infernoAlpha >= 0.5) {
          // Black Pit Forged Obsidian Chain-Bollard (`topY = 668`)
          seloutBlock(ctx, px - 18, curbY - 14, 36, 30, '#271317', '#572831');
          seloutBlock(ctx, px - 10, curbY - 18, 20, 8, '#b45309', '#f59e0b');
          pxFill(ctx, px - 4, curbY - 8, 8, 4, '#fb923c');
        } else {
          // Eclipse Weathered Imperial Stone Plinth (`topY = 668`)
          seloutBlock(ctx, px - 18, curbY - 14, 36, 30, cBase, cLit);
          seloutBlock(ctx, px - 13, curbY - 18, 26, 7, cLit, cTrim);
          pxFill(ctx, px - 8, curbY - 7, 16, 3, cTrim);
        }
      }
    }

    // Soft Abyssal Chasm Updraft Mist / Molten Glow far below the cliff curb (`y: 728..viewBot`)
    const abyssGrad = ctx.createLinearGradient(0, curbY + 42, 0, curbY + 280);
    abyssGrad.addColorStop(0, 'rgba(0,0,0,0)');
    abyssGrad.addColorStop(0.55, rgbaStr(abyssGlow, infernoAlpha > 0.4 ? 0.22 : 0.13));
    abyssGrad.addColorStop(1, 'rgba(4,6,13,0)');
    ctx.fillStyle = abyssGrad;
    ctx.fillRect(viewLeft, curbY + 42, viewW, 260);

    ctx.restore();
  }
}
