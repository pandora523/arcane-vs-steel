/**
 * Seamless HD-2D 2.5D Adventure World Map Renderer (`AdventureMapRenderer`)
 *
 * Replaces stitched 1v1 duel-stage PNGs with a 100% continuous, infinite-bleed
 * 3D-space walkable causeway (`X: -∞..+∞`, walkable 3D depth `Z/Y: 442..680`) featuring:
 *  - ZERO rectangular background image stamps, ZERO stitch seams, ZERO exposed edges
 *  - Smooth 640px `smoothstep` + pixel-clustered biome transitions across 4 realms:
 *      0. Grand Eclipse Causeway (`0..1200`)
 *      1. Whispering Starwood Crossing (`1200..2400`)
 *      2. Sunken Bone-Bridge Necropolis (`2400..3600`)
 *      3. Caldera Throne of the Black Pit (`3600..4800`)
 *    plus seamless `Laywaste of Inferno` molten transformation (`infernoAlpha: 0..1`)
 *  - True 2.5D perspective-foreshortened stone road courses, upper balustrade & landmarks,
 *    and foreground cliff coping descending infinitely into misty abyssal chasms.
 *  - ZERO `ctx.rotate(...)` calls.
 */

export const ADVENTURE_ROAD_TOP_Y = 436;
export const ADVENTURE_ROAD_BOT_Y = 686;

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

    // Colossal Celestial Eclipse / Astral Moon (`0.92` follow = `0.08x` sky parallax)
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
    if (moonGlow) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.42;
      ctx.drawImage(moonGlow, moonX - 220, moonY - 220, 440, 440);
      ctx.restore();
    }
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
    // 2. SEAMLESS PARALLAX MOUNTAINS (`0.18x`) & MIDGROUND ARCHITECTURE (`0.36x`)
    // =========================================================================
    const farCol = AdventureMapRenderer.blendColor('farMtn', camWeights, infernoAlpha, [0, 0, 0]);
    const midCol = AdventureMapRenderer.blendColor('midRuin', camWeights, infernoAlpha, [0, 0, 0]);

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

    // 2B. Midground Realm Silhouettes (Cathedral Spires / Starwood Canopies / Bone Ribs / Black Pit Bastions)
    const midAnchor = camX * 0.64;
    const midSlotW = 192;
    const firstMidSlot = Math.floor((viewLeft - midAnchor) / midSlotW) - 1;
    const lastMidSlot = Math.ceil((viewRight - midAnchor) / midSlotW) + 1;
    ctx.fillStyle = rgbStr(midCol);
    for (let slot = firstMidSlot; slot <= lastMidSlot; slot++) {
      const sx = Math.round((midAnchor + slot * midSlotW) / 4) * 4;
      const sampleWorldX = camX + (sx - camX) * 1.1;
      const bIdx = AdventureMapRenderer.pickClusteredBiomeIndex(sampleWorldX, 77);
      const hVar = Math.round((hash2D(slot, 19) * 56) / 4) * 4;

      if (bIdx === 0) {
        // Distant Gothic Viaduct Arch & Twin Cathedral Spires
        const baseH = 148 + hVar;
        ctx.fillRect(sx + 16, 392 - baseH, 36, baseH + 44);
        ctx.fillRect(sx + 24, 392 - baseH - 28, 20, 28);
        ctx.fillRect(sx + 30, 392 - baseH - 48, 8, 20);
        ctx.fillRect(sx + 52, 296, 140, 28);
      } else if (bIdx === 1) {
        // Colossal Starwood Canopy & Trunk Silhouette
        const trunkH = 160 + hVar;
        ctx.fillRect(sx + 56, 396 - trunkH, 28, trunkH + 40);
        ctx.fillRect(sx + 12, 396 - trunkH - 36, 116, 48);
        ctx.fillRect(sx + 28, 396 - trunkH - 60, 84, 28);
      } else if (bIdx === 2) {
        // Giant Fossilized Necropolis Rib-Arch & Tilted Obelisk
        const obH = 144 + hVar;
        ctx.fillRect(sx + 28, 396 - obH, 24, obH + 40);
        ctx.fillRect(sx + 32, 396 - obH - 20, 16, 20);
        ctx.fillRect(sx + 92, 284, 16, 148);
        ctx.fillRect(sx + 76, 268, 36, 20);
      } else {
        // Black Pit Obsidian Fortress Keep & Glowing Caldera Vent
        const keepH = 162 + hVar;
        ctx.fillRect(sx + 18, 396 - keepH, 68, keepH + 40);
        ctx.fillRect(sx + 14, 396 - keepH - 12, 16, 16);
        ctx.fillRect(sx + 44, 396 - keepH - 12, 16, 16);
        ctx.fillRect(sx + 74, 396 - keepH - 12, 16, 16);
        if (infernoAlpha > 0.2 || bIdx === 3) {
          ctx.fillStyle = infernoAlpha > 0.5 ? '#fb923c' : '#dc2626';
          ctx.fillRect(sx + 48, 396 - keepH + 28, 8, keepH - 16);
          ctx.fillStyle = rgbStr(midCol);
        }
      }
    }

    // Soft Horizon Canyon Mist Veil separating distant vistas from the walkable 3D road
    const mistGrad = ctx.createLinearGradient(0, 250, 0, ADVENTURE_ROAD_TOP_Y + 12);
    mistGrad.addColorStop(0, rgbaStr(mistCol, 0));
    mistGrad.addColorStop(0.68, rgbaStr(mistCol, 0.16 + infernoAlpha * 0.10));
    mistGrad.addColorStop(1, rgbaStr(skyMidCol, 0.42));
    ctx.fillStyle = mistGrad;
    ctx.fillRect(viewLeft, 250, viewW, ADVENTURE_ROAD_TOP_Y - 238);

    // =========================================================================
    // 3. UPPER RETAINING WALL, PARAPET BALUSTRADE & ROADSIDE LANDMARKS (`y: 356..436`)
    // =========================================================================
    const wallBrickW = 48;
    const firstBrickCol = Math.floor(viewLeft / wallBrickW) - 1;
    const lastBrickCol = Math.ceil(viewRight / wallBrickW) + 1;
    const parapetTopY = 368;
    const parapetH = ADVENTURE_ROAD_TOP_Y - parapetTopY; // 68px tall carved stone retaining wall

    for (let bc = firstBrickCol; bc <= lastBrickCol; bc++) {
      const bx = bc * wallBrickW;
      const bIdx = AdventureMapRenderer.pickClusteredBiomeIndex(bx + 24, 105);
      const wDark = AdventureMapRenderer.sampleBiomeColor(bIdx, 'wallDark', infernoAlpha);
      const wMid = AdventureMapRenderer.sampleBiomeColor(bIdx, 'wallMid', infernoAlpha);
      const wLit = AdventureMapRenderer.sampleBiomeColor(bIdx, 'wallLight', infernoAlpha);
      const trim = AdventureMapRenderer.sampleBiomeColor(bIdx, 'trimCol', infernoAlpha);

      // Base mortar & recessed masonry courses
      ctx.fillStyle = '#070a12';
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

      // Organic moss / ash / molten trim accents along the upper coping
      if (bIdx === 1 && hash2D(bc, 211) > 0.35 && infernoAlpha < 0.6) {
        ctx.fillStyle = '#10b981';
        ctx.fillRect(bx + 8, parapetTopY + 6, 16, 6);
        ctx.fillRect(bx + 12, parapetTopY + 12, 8, 6);
      } else if (infernoAlpha > 0.35 && hash2D(bc, 213) > 0.45) {
        ctx.fillStyle = '#fb923c';
        ctx.fillRect(bx + 10, parapetTopY + 36, 14, 3);
      }
    }

    // =========================================================================
    // 4. DEEP 2.5D PERSPECTIVE WALKABLE FLAGSTONE CAUSEWAY (`y: 436..686`, `250px` 3D Z-SPACE!)
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
        const bIdx = AdventureMapRenderer.pickClusteredBiomeIndex(centerWorldX, 300 + r * 7);
        const hVal = hash2D(tc, r * 13 + 5);

        // Dark 2px mortar joint bed
        ctx.fillStyle = infernoAlpha > 0.45 && hVal > 0.62 ? '#ea580c' : '#080b14';
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
          // Gold / Jade / Amethyst / Hellfire top & bottom runner border trim
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

          // Crisp 2px top-left stone bevel highlight (skip far shadow strip right under parapet)
          if (r >= 1) {
            ctx.fillStyle = bevelCol;
            ctx.fillRect(tx + 3, cy + 2, tw - 6, 2);
          }

          // Biome-specific pixel-clustered surface details (Starwood moss, Necropolis bone-ash, Black Pit / Inferno magma veins)
          if (hVal > 0.76) {
            const detCol = AdventureMapRenderer.sampleBiomeColor(
              bIdx,
              hVal > 0.89 ? 'detailB' : 'detailA',
              infernoAlpha
            );
            ctx.fillStyle = detCol;
            ctx.fillRect(tx + 8, cy + Math.floor(ch * 0.5), 10, 3);
            if (bIdx === 1 && infernoAlpha < 0.5) {
              ctx.fillRect(tx + 12, cy + Math.floor(ch * 0.5) - 2, 6, 2);
            }
          }
        }
      }
    }

    // Continuous Ambient Contact Shadow cast by the Upper Parapet onto the top of the 3D Road (`y: 436..452`)
    ctx.fillStyle = 'rgba(4, 6, 14, 0.46)';
    ctx.fillRect(viewLeft, ADVENTURE_ROAD_TOP_Y, viewW, 10);
    ctx.fillStyle = 'rgba(4, 6, 14, 0.22)';
    ctx.fillRect(viewLeft, ADVENTURE_ROAD_TOP_Y + 10, viewW, 8);

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
    // 5. UPPER ROADSIDE PILLARS, TREES, OBELISKS & LIVE BRAZIER POOLS (`every 256px`)
    // =========================================================================
    const propSpacing = 256;
    const firstProp = Math.floor(viewLeft / propSpacing) - 1;
    const lastProp = Math.ceil(viewRight / propSpacing) + 1;

    for (let p = firstProp; p <= lastProp; p++) {
      const px = p * propSpacing + 128;
      const bIdx = AdventureMapRenderer.pickClusteredBiomeIndex(px, 509);
      const baseY = ADVENTURE_ROAD_TOP_Y + 2; // Planted cleanly along the upper edge of the 3D road
      const flick = 0.78 + 0.22 * Math.sin(t * 7.2 + p * 1.9);

      // Grounded plinth shadow on upper road edge
      ctx.fillStyle = 'rgba(3, 5, 12, 0.52)';
      ctx.fillRect(px - 30, baseY - 2, 60, 10);

      if (bIdx === 1 && infernoAlpha < 0.65) {
        // WHISPERING STARWOOD: Gnarled Ancient Starwood Pillar-Tree + Glowing Jade Stone Lantern
        ctx.fillStyle = '#091416';
        ctx.fillRect(px - 22, baseY - 156, 44, 158);
        ctx.fillStyle = '#1e3a34';
        ctx.fillRect(px - 18, baseY - 152, 36, 150);
        ctx.fillStyle = '#2d544b';
        ctx.fillRect(px - 12, baseY - 148, 14, 144);
        // Lush stepped pixel canopy leaves
        ctx.fillStyle = '#064e3b';
        ctx.fillRect(px - 56, baseY - 196, 112, 52);
        ctx.fillStyle = '#059669';
        ctx.fillRect(px - 48, baseY - 190, 96, 36);
        ctx.fillStyle = '#34d399';
        ctx.fillRect(px - 36, baseY - 184, 52, 16);

        // Roadside Jade Lantern
        const lx = px + 44;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(lx - 10, baseY - 46, 20, 46);
        ctx.fillStyle = '#334155';
        ctx.fillRect(lx - 14, baseY - 52, 28, 8);
        ctx.fillStyle = '#34d399';
        ctx.fillRect(lx - 6, baseY - 42, 12, 14);
        ctx.fillStyle = '#ecfdf5';
        ctx.fillRect(lx - 3, baseY - 39, 6, 8);

        if (renderer.glowEmerald) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 0.24 * flick;
          ctx.drawImage(renderer.glowEmerald, lx - 56, baseY - 88, 112, 96);
          ctx.globalAlpha = 0.16 * flick;
          ctx.drawImage(renderer.glowEmerald, lx - 72, baseY - 16, 144, 48);
          ctx.restore();
        }
      } else if (bIdx === 2 && infernoAlpha < 0.65) {
        // SUNKEN BONE-BRIDGE: Runic Necropolis Obelisk & Soul-Fire Torch
        ctx.fillStyle = '#090612';
        ctx.fillRect(px - 20, baseY - 148, 40, 150);
        ctx.fillStyle = '#271c3c';
        ctx.fillRect(px - 16, baseY - 142, 32, 140);
        ctx.fillStyle = '#4c3a69';
        ctx.fillRect(px - 12, baseY - 138, 10, 132);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(px - 14, baseY - 26, 28, 8);
        // Glowing Amethyst Rune Core + Soul Flame
        const fh = Math.round(16 + 5 * flick);
        ctx.fillStyle = '#a855f7';
        ctx.fillRect(px - 8, baseY - 148 - fh, 16, fh);
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(px - 4, baseY - 104, 8, 36);
        ctx.fillStyle = '#fdf4ff';
        ctx.fillRect(px - 4, baseY - 148 - Math.round(fh * 0.55), 8, Math.round(fh * 0.55));

        if (renderer.glowViolet) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 0.26 * flick;
          ctx.drawImage(renderer.glowViolet, px - 64, baseY - 196, 128, 128);
          ctx.globalAlpha = 0.17 * flick;
          ctx.drawImage(renderer.glowViolet, px - 78, baseY - 18, 156, 52);
          ctx.restore();
        }
      } else {
        // ECLIPSE CAUSEWAY / BLACK PIT / INFERNO: Stepped Obsidian Buttress & Roaring Brazier
        const isHell = bIdx === 3 || infernoAlpha >= 0.5;
        ctx.fillStyle = '#070911';
        ctx.fillRect(px - 22, baseY - 144, 44, 146);
        ctx.fillStyle = isHell ? '#2b1619' : '#1e293b';
        ctx.fillRect(px - 18, baseY - 140, 36, 138);
        ctx.fillStyle = isHell ? '#4c2429' : '#334155';
        ctx.fillRect(px - 12, baseY - 136, 12, 132);
        ctx.fillStyle = isHell ? '#d97706' : '#d4af37';
        ctx.fillRect(px - 24, baseY - 118, 48, 5);
        ctx.fillRect(px - 24, baseY - 22, 48, 4);

        // Forged Brazier Bowl + Pixel Flame
        const bx = px;
        const by = baseY - 146;
        ctx.fillStyle = '#090d16';
        ctx.fillRect(bx - 16, by, 32, 10);
        const fh = Math.round(18 + 6 * flick);
        ctx.fillStyle = isHell ? '#ef4444' : '#fb923c';
        ctx.fillRect(bx - 10, by - fh, 20, fh);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(bx - 6, by - Math.round(fh * 0.65), 12, Math.round(fh * 0.65));
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(bx - 3, by - 6, 6, 6);

        const glowTex = isHell ? renderer.glowCrimson || renderer.glowOrange : renderer.glowOrange;
        if (glowTex) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 0.28 * flick;
          ctx.drawImage(glowTex, bx - 68, by - 76, 136, 136);
          ctx.globalAlpha = 0.18 * flick;
          ctx.drawImage(glowTex, bx - 84, baseY - 18, 168, 54);
          ctx.restore();
        }
      }
    }

    // =========================================================================
    // 6. FOREGROUND CLIFFSIDE CURB & INFINITE ABYSSAL ESCARPMENT (`y: 686..viewBot`)
    // =========================================================================
    const curbY = ADVENTURE_ROAD_BOT_Y;
    const cliffH = Math.max(120, viewBot - curbY + 40);
    const cliffDark = AdventureMapRenderer.blendColor('cliffDark', camWeights, infernoAlpha, [0, 0, 0]);
    const cliffMid = AdventureMapRenderer.blendColor('cliffMid', camWeights, infernoAlpha, [0, 0, 0]);
    const abyssGlow = AdventureMapRenderer.blendColor('abyssGlow', camWeights, infernoAlpha, [0, 0, 0]);

    // Continuous deep cliff rock & abyssal chasm gradient all the way past the bottom of the screen!
    const cliffGrad = ctx.createLinearGradient(0, curbY, 0, curbY + Math.min(560, cliffH));
    cliffGrad.addColorStop(0, rgbStr(cliffMid));
    cliffGrad.addColorStop(0.32, rgbStr(cliffDark));
    cliffGrad.addColorStop(1, '#04060d');
    ctx.fillStyle = cliffGrad;
    ctx.fillRect(viewLeft, curbY, viewW, cliffH);

    // Carved Foreground Stone Coping Blocks (`56px` wide) + Stepped Cliff Strata
    const curbBlockW = 56;
    const firstCurb = Math.floor(viewLeft / curbBlockW) - 1;
    const lastCurb = Math.ceil(viewRight / curbBlockW) + 1;
    for (let cb = firstCurb; cb <= lastCurb; cb++) {
      const cx = cb * curbBlockW;
      const bIdx = AdventureMapRenderer.pickClusteredBiomeIndex(cx + 28, 701);
      const cBase = AdventureMapRenderer.sampleBiomeColor(bIdx, 'curbBase', infernoAlpha);
      const cLit = AdventureMapRenderer.sampleBiomeColor(bIdx, 'curbLit', infernoAlpha);
      const cCliff = AdventureMapRenderer.sampleBiomeColor(bIdx, 'cliffMid', infernoAlpha);

      // 3D Coping Block Lip (`y: 686..712`)
      ctx.fillStyle = '#05070e';
      ctx.fillRect(cx, curbY, curbBlockW, 28);
      ctx.fillStyle = cBase;
      ctx.fillRect(cx + 2, curbY + 2, curbBlockW - 3, 22);
      ctx.fillStyle = cLit;
      ctx.fillRect(cx + 3, curbY + 2, curbBlockW - 6, 4);

      // Vertical Cliff Buttress Ribbing descending into the chasm
      const ribH = 84 + Math.round(hash2D(cb, 811) * 96);
      ctx.fillStyle = cCliff;
      ctx.fillRect(cx + 8, curbY + 28, curbBlockW - 18, ribH);

      // Glowing Magma Veins in Black Pit / Inferno OR Hanging Vines in Starwood
      if ((bIdx === 3 || infernoAlpha > 0.35) && hash2D(cb, 823) > 0.45) {
        ctx.fillStyle = infernoAlpha > 0.6 ? '#fde047' : '#ea580c';
        ctx.fillRect(cx + 24, curbY + 30, 4, ribH - 12);
      } else if (bIdx === 1 && infernoAlpha < 0.5 && hash2D(cb, 829) > 0.4) {
        ctx.fillStyle = '#059669';
        ctx.fillRect(cx + 18, curbY + 24, 8, 34);
        ctx.fillStyle = '#34d399';
        ctx.fillRect(cx + 20, curbY + 24, 4, 22);
      }
    }

    // Soft Abyssal Chasm Updraft Mist / Molten Glow far below the cliff curb (`y: 740..viewBot`)
    const abyssGrad = ctx.createLinearGradient(0, curbY + 42, 0, curbY + 280);
    abyssGrad.addColorStop(0, 'rgba(0,0,0,0)');
    abyssGrad.addColorStop(0.55, rgbaStr(abyssGlow, infernoAlpha > 0.4 ? 0.24 : 0.13));
    abyssGrad.addColorStop(1, 'rgba(4,6,13,0)');
    ctx.fillStyle = abyssGrad;
    ctx.fillRect(viewLeft, curbY + 42, viewW, 260);

    ctx.restore();
  }
}
