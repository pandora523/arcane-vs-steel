/**
 * World-Forge Crucible & Runic Anvil Shader Suite (`forgeShaders.js`)
 * First-party 120Hz 2.5D multi-layer pixel-shader & particle effects for Torgar (`titan` / `Titan.js`).
 *
 * Palette Architecture (100% Distinct Dual-Ramp Dwarven World-Forge Contrast):
 *   - Volcanic Basalt-Obsidian (`#140a08`, `#291510`)
 *   - Molten Magma Crimson-Orange (`#b91c1c`, `#ea580c`, `#f97316`, `#fbbf24`)
 *   - Luminous World-Forge Emerald-Jade (`#047857`, `#10b981`, `#34d399`, `#a7f3d0`)
 *
 * Powers both:
 *   1. Live 120Hz `ArcaneShaderFX` (`back` + `front` 2.5D depth wraps around Torgar & opponents)
 *   2. Offline 30fps `assets/sprites/titan_vfx.png` (`6240x1040`, 5 rows x 30 cols @ 208x208)
 */

import {
  PURE_WHITE,
  packHexColor,
  buildColorRamp,
  clamp01,
  smoothStep,
  fbmNoise2D,
  DeterministicRng,
  MotePool,
  buildLightningChain,
  drawTiltedOrbitBand,
  drawStarburstFlare,
  drawMultiLayerCrescentArc
} from '../ArcaneShaderFX.js?v=30fps60';

// Volcanic Basalt-Obsidian + Molten Magma Crimson-Orange -> Forge Gold
export const FORGE_GOLD_PALETTE = [
  '#140a08',
  '#291510',
  '#7f1d1d',
  '#b91c1c',
  '#ea580c',
  '#f97316',
  '#fbbf24',
  '#ffffff'
];

export const FORGE_MAGMA_PALETTE = FORGE_GOLD_PALETTE;

// Deep Obsidian-Slag + Luminous World-Forge Emerald-Jade
export const FORGE_JADE_PALETTE = [
  '#140a08',
  '#064e3b',
  '#047857',
  '#059669',
  '#10b981',
  '#34d399',
  '#a7f3d0',
  '#ffffff'
];

const COL_OBSIDIAN = packHexColor('#140a08');
const COL_BASALT = packHexColor('#291510');
const COL_MAGMA_DEEP = packHexColor('#b91c1c');
const COL_MAGMA_MID = packHexColor('#ea580c');
const COL_MAGMA_BRIGHT = packHexColor('#f97316');
const COL_FORGE_GOLD = packHexColor('#fbbf24');
const COL_JADE_DEEP = packHexColor('#047857');
const COL_JADE_MID = packHexColor('#10b981');
const COL_JADE_BRIGHT = packHexColor('#34d399');
const COL_JADE_PALE = packHexColor('#a7f3d0');

const BACK_HALF = (theta) => Math.sin(theta) < 0;
const FRONT_HALF = (theta) => Math.sin(theta) >= 0;

/**
 * Crisp pixel-art Khazad Diamond Jade Rune with dark basalt `#140a08` selective outline,
 * stepped emerald-jade facets, and glowing white-gold core.
 */
function drawKhazadDiamondRune(pen, cx, cy, r, isJade = true, alpha = 1) {
  if (alpha <= 0.02 || r <= 0.8) return;
  const outerR = r + 1.1;
  const colOuter = isJade ? COL_JADE_DEEP : COL_MAGMA_DEEP;
  const colMid = isJade ? COL_JADE_MID : COL_MAGMA_BRIGHT;
  const colCore = isJade ? COL_JADE_PALE : COL_FORGE_GOLD;

  pen.shadeBox(cx - outerR - 1, cy - outerR - 1, cx + outerR + 1, cy + outerR + 1, (lx, ly, out) => {
    const dx = Math.abs(lx - cx);
    const dy = Math.abs(ly - cy);
    const manhattan = dx + dy * 0.85;
    if (manhattan > outerR) return 0;
    out.alpha = alpha;
    if (manhattan >= r) {
      return COL_OBSIDIAN;
    }
    if (dx < 0.75 || dy < 0.75 || manhattan < r * 0.32) {
      out.glowColor = colMid;
      out.glowStrength = 0.36 * alpha;
      return manhattan < r * 0.22 ? PURE_WHITE : colCore;
    }
    out.glowColor = colOuter;
    out.glowStrength = 0.2 * alpha;
    return manhattan < r * 0.65 ? colMid : colOuter;
  });
}

/**
 * Red-hot hexagonal Dwarven forge-rivet flying through the air with `#140a08` rim.
 */
function drawHexForgeRivet(pen, cx, cy, r, isJade = false, alpha = 1) {
  if (alpha <= 0.02 || r <= 0.6) return;
  const colRim = isJade ? COL_JADE_MID : COL_MAGMA_MID;
  const colHot = isJade ? COL_JADE_PALE : COL_FORGE_GOLD;
  pen.fillCircle(cx, cy, r + 0.9, COL_OBSIDIAN, alpha * 0.95);
  pen.fillCircle(cx, cy, r, colRim, alpha);
  pen.stipple(cx, cy, PURE_WHITE, alpha);
  pen.stipple(cx - 1, cy, colHot, alpha * 0.9);
  pen.stipple(cx + 1, cy, colHot, alpha * 0.9);
  pen.radialGlow(cx, cy, r * 2.2, colRim, 0.28 * alpha);
}

/**
 * Iconic Pixel-Art Horned Dwarven Forge-Anvil (`drawPixelHornedAnvil`).
 * Supports arbitrary rotation `rot` and scale `scale` so it can orbit Torgar,
 * spin as a projectile, or sit as a colossal altar on the arena floor.
 */
function drawPixelHornedAnvil(pen, cx, cy, scale = 1.0, rot = 0, alpha = 1.0, flashHot = false) {
  if (alpha <= 0.02 || scale <= 0.1) return;
  const cosR = Math.cos(rot);
  const sinR = Math.sin(rot);
  const bound = Math.ceil(22 * scale + 3);

  pen.shadeBox(cx - bound, cy - bound, cx + bound, cy + bound, (lx, ly, out) => {
    const dx0 = (lx - cx) / scale;
    const dy0 = (ly - cy) / scale;
    const ux = dx0 * cosR + dy0 * sinR;
    const uy = -dx0 * sinR + dy0 * cosR;

    // Anvil silhouette in canonical space:
    // uy in [-11, -3.5]: Top strike table + pointed horn (+ux up to +18) + rear heel (-ux down to -14)
    // uy in (-3.5, +3.5]: Concave anvil waist (ux in [-6.5, +6.5])
    // uy in (+3.5, +10.5]: Stepped Crucible Pedestal base (ux in [-12.5, +12.5])
    let minX = 1;
    let maxX = -1;
    if (uy >= -11 && uy <= -3.2) {
      const tTop = (uy + 11) / 7.8; // 0 at top face, 1 at under-bevel
      minX = -14.5 + tTop * 4.8;
      maxX = 18.5 - tTop * 8.2;
    } else if (uy > -3.2 && uy <= 3.6) {
      const waistCurve = Math.abs(uy) / 3.6;
      const hw = 6.2 + waistCurve * 2.6;
      minX = -hw;
      maxX = hw;
    } else if (uy > 3.6 && uy <= 10.8) {
      const tBase = (uy - 3.6) / 7.2;
      const hw = 8.8 + tBase * 4.4;
      minX = -hw;
      maxX = hw;
    } else {
      return 0;
    }

    if (ux < minX || ux > maxX) return 0;

    const distEdge = Math.min(ux - minX, maxX - ux, uy - -11, 10.8 - uy);
    out.alpha = alpha;

    // 1px Dark Volcanic Basalt-Obsidian selective outline
    if (distEdge < 1.15 / Math.max(0.55, scale)) {
      return COL_OBSIDIAN;
    }

    // Center Khazad Diamond Emerald-Jade Rune on Anvil Chest
    const runeDist = Math.abs(ux) * 0.95 + Math.abs(uy + 0.2) * 1.15;
    if (runeDist <= 4.8) {
      out.glowColor = COL_JADE_MID;
      out.glowStrength = 0.46 * alpha;
      if (runeDist <= 1.6) return PURE_WHITE;
      if (runeDist <= 3.1) return COL_JADE_PALE;
      return COL_JADE_MID;
    }

    // White-Hot / Molten Magma Top Strike Face (`uy <= -8.4`)
    if (uy <= -8.4) {
      out.glowColor = COL_MAGMA_BRIGHT;
      out.glowStrength = 0.42 * alpha;
      if (flashHot || uy <= -9.6) return PURE_WHITE;
      return ux > 8 ? COL_FORGE_GOLD : COL_MAGMA_BRIGHT;
    }

    // Molten Bronze-Gold & Magma Bevel Trim + Base Rivets
    if (distEdge < 2.3 / Math.max(0.55, scale) || (uy > 7.2 && Math.abs(Math.abs(ux) - 6.5) < 1.4)) {
      out.glowColor = COL_MAGMA_MID;
      out.glowStrength = 0.22 * alpha;
      return uy < 0 ? COL_FORGE_GOLD : COL_MAGMA_MID;
    }

    // Dark Volcanic Basalt-Obsidian Core Plate with subtle magma heat vein
    const vein = Math.abs(ux * 0.35 + uy * 0.45);
    if (vein > 2.2 && vein < 2.85) {
      return COL_MAGMA_DEEP;
    }
    return COL_BASALT;
  });
}

/**
 * 2.5D Interlocking 8-Cog Dwarven Crucible Gear-Ring (`drawDwarvenCrucibleGearRing`).
 * Draws an octagonal/circular Dwarven gear wheel with 8 protruding brass-obsidian gear teeth,
 * molten magma channel, and emerald-jade cog rivets. Supports `anglePred` (`BACK_HALF` / `FRONT_HALF`).
 */
function drawDwarvenCrucibleGearRing(
  pen,
  cx,
  cy,
  rx,
  aspectY,
  rot,
  alpha = 1.0,
  anglePred = null,
  isJadeDominant = false
) {
  if (rx <= 3 || alpha <= 0.02) return;
  const maxR = rx + 5.5;
  const maxY = Math.ceil(maxR * aspectY + 4);
  const cogs = 8;

  pen.shadeBox(cx - maxR - 2, cy - maxY, cx + maxR + 2, cy + maxY, (lx, ly, out) => {
    const dx = lx - cx;
    const dy = (ly - cy) / Math.max(0.18, aspectY);
    const r = Math.hypot(dx, dy);
    if (r < rx * 0.62 || r > rx + 4.6) return 0;

    const screenTheta = Math.atan2(ly - cy, dx);
    if (anglePred && !anglePred(screenTheta)) return 0;

    const wheelTheta = Math.atan2(dy, dx) - rot;
    const cogWave = Math.cos(wheelTheta * cogs);
    const isTooth = cogWave > 0.32;
    const outerRim = isTooth ? rx + 3.8 : rx + 0.6;
    const innerRim = rx * 0.68;

    if (r > outerRim || r < innerRim) return 0;

    const distOuter = outerRim - r;
    const distInner = r - innerRim;
    out.alpha = alpha;

    // 1px Dark Obsidian Gear Outline
    if (distOuter < 1.1 || distInner < 1.0) {
      return COL_OBSIDIAN;
    }

    // Glowing Emerald-Jade / Forge-Gold Cog Tooth Rivet
    if (isTooth && r > rx + 0.4 && r < rx + 2.6 && cogWave > 0.72) {
      out.glowColor = isJadeDominant ? COL_JADE_BRIGHT : COL_FORGE_GOLD;
      out.glowStrength = 0.38 * alpha;
      return cogWave > 0.9 ? PURE_WHITE : isJadeDominant ? COL_JADE_PALE : COL_FORGE_GOLD;
    }

    // Molten Magma / Emerald-Jade Inner Crucible Channel
    const midBand = (outerRim + innerRim) * 0.5;
    if (Math.abs(r - midBand) < 1.35) {
      const col = isJadeDominant ? COL_JADE_MID : COL_MAGMA_BRIGHT;
      out.glowColor = col;
      out.glowStrength = 0.32 * alpha;
      return isJadeDominant ? COL_JADE_BRIGHT : COL_FORGE_GOLD;
    }

    // Dark Basalt & Bronze Gear Plate
    return r > midBand ? (isJadeDominant ? COL_JADE_DEEP : COL_MAGMA_MID) : COL_BASALT;
  });
}

/**
 * Faceted Volcanic Basalt-and-Jade Crystal/Rock Spire (`drawVolcanicBasaltJadeSpire`).
 * Renders a jagged obelisk erupting from `(baseX, baseY)` with:
 *   - Curved 2.5D elliptical volcanic rubble-crater rim (`botLimit`) and jagged root boulders so it NEVER cuts off flat horizontally
 *   - Crisp 1px `#140a08` obsidian outline (`Selout`) wrapping around tip, sides, and curved base
 *   - Dark `#291510` basalt rock facets, crimson-orange-gold magma veins, and luminous Emerald-Jade crystal cap
 */
function drawVolcanicBasaltJadeSpire(pen, baseX, baseY, height, baseW, tiltX = 0, seed = 17, p = 1, alpha = 1) {
  const h = height * clamp01(p);
  if (h <= 3 || baseW <= 1.2 || alpha <= 0.02) return;

  const minX = Math.min(baseX, baseX + tiltX) - baseW - 4;
  const maxX = Math.max(baseX, baseX + tiltX) + baseW + 4;
  const topY = baseY - h - 2;
  const maxBotY = baseY + 9;

  pen.shadeBox(minX, topY, maxX, maxBotY, (lx, ly, out) => {
    const dy = ly - baseY;
    if (dy < -h) return 0;

    const hFrac = dy < 0 ? clamp01(-dy / Math.max(1, h)) : 0;
    const spineX = baseX + tiltX * hFrac;

    // Faceted obelisk profile: flared root boulders at base, stepped angular shoulders, sharp crystal point at top
    const crag = Math.sin(hFrac * 11 + seed) * 0.9 * (1 - hFrac);
    const rootFlare = dy >= -2.5 ? 1 + Math.min(1, (dy + 2.5) / 5.5) * 0.26 : 1;
    const profile = hFrac < 0.72 ? (1 - hFrac * 0.42) * rootFlare : (1 - hFrac) / 0.28;
    const effW = Math.max(0.85, baseW * profile + crag);
    const dx = lx - spineX;
    const adx = Math.abs(dx);
    if (adx > effW) return 0;

    // Curved 2.5D elliptical volcanic rubble-crater rim so the base NEVER looks horizontally cut off
    const botLimit = Math.round(Math.sqrt(Math.max(0, 1 - (dx / Math.max(1, effW)) ** 2)) * 5.5 + 2.5);
    if (dy > botLimit) return 0;

    out.alpha = alpha;

    // 1px Dark Obsidian Selective Outline wrapping tip, sides, and curved 2.5D elliptical base
    if (adx >= effW - 1.05 || hFrac > 0.95 || dy >= botLimit - 1.05) {
      return COL_OBSIDIAN;
    }

    // Jagged Obsidian-and-Magma Root Boulders wrapping around the curved 2.5D base
    if (dy >= botLimit - 3.6 || dy >= -0.5) {
      const boulderCell = Math.sin(dx * 0.95 + seed * 1.7) + Math.cos(dy * 1.15 - seed * 0.8);
      if (boulderCell > 0.82) {
        out.glowColor = COL_MAGMA_BRIGHT;
        out.glowStrength = 0.34 * alpha;
        return boulderCell > 1.32 ? COL_FORGE_GOLD : COL_MAGMA_BRIGHT;
      }
      if (Math.abs(boulderCell) < 0.24) return COL_OBSIDIAN;
      return boulderCell > 0 ? COL_MAGMA_DEEP : COL_BASALT;
    }

    // Luminous Emerald-Jade Crystal Obelisk Cap (`hFrac >= 0.58`) & Central Jade Facet Ridge
    const isJadeCap = hFrac >= 0.62 || (hFrac >= 0.36 && adx <= effW * 0.34);
    if (isJadeCap) {
      out.glowColor = COL_JADE_MID;
      out.glowStrength = 0.38 * alpha;
      if (adx < 1.0 && hFrac > 0.72) return PURE_WHITE;
      if (dx < 0) return hFrac > 0.76 ? COL_JADE_PALE : COL_JADE_BRIGHT;
      return hFrac > 0.76 ? COL_JADE_BRIGHT : COL_JADE_DEEP;
    }

    // Branching Molten Magma Lava Veins across Lower Basalt Monolith
    const veinWave = Math.abs(Math.sin(hFrac * 14 + dx * 0.42 + seed * 0.7));
    if (veinWave < 0.24 || (hFrac < 0.18 && adx < effW * 0.55)) {
      out.glowColor = COL_MAGMA_BRIGHT;
      out.glowStrength = 0.34 * alpha;
      return veinWave < 0.1 ? COL_FORGE_GOLD : COL_MAGMA_BRIGHT;
    }

    // Dark Volcanic Basalt-Obsidian Rock Facets
    return dx < 0 ? COL_MAGMA_DEEP : COL_BASALT;
  });
}

const GOD_MAUL_MAGMA_RAMP = buildColorRamp(FORGE_GOLD_PALETTE, 8);
const GOD_MAUL_JADE_RAMP = buildColorRamp(FORGE_JADE_PALETTE, 8);

/**
 * Colossal Pixel-Art Dwarven God-Maul (`drawColossalDwarvenWarhammer`).
 * Renders the Colossal Khazad God-Maul in rotated `(da, dp)` local coordinates
 * swinging along a dynamic diagonal arc (`angle` sweeping from `-66°` windup down to `+11°` impact),
 * with a roaring multi-layer crescent swing trail (`drawMultiLayerCrescentArc`),
 * keeping the haft (`dp` in `[-20*scale, -8*scale]`) and horned-ram pommel cap (`dp` in `[-24*scale, -20*scale]`)
 * 100% inside the bounding box so it NEVER cuts off flat at the top!
 */
function drawColossalDwarvenWarhammer(
  pen,
  cx,
  cy,
  scale = 1.0,
  p = 0.5,
  seed = 17,
  swingAngle = null,
  alpha = 1.0,
  flashHot = false
) {
  if (alpha <= 0.02 || scale <= 0.15) return;

  const angle = swingAngle !== null ? swingAngle : -1.15 + Math.min(1, p * 1.45) * 1.35;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);

  // Roaring Multi-Layer Crescent Swing Trail behind the swinging God-Maul head
  drawMultiLayerCrescentArc(pen, {
    cx,
    cy,
    radius: 17.5 * scale,
    width: 7.2 * scale,
    eccentricity: 0.84,
    headAngle: angle + 0.22,
    tailAngle: angle - 1.18,
    fade: alpha * 0.94,
    ramp: GOD_MAUL_MAGMA_RAMP,
    seed,
    t: clamp01(p),
    flashHot
  });
  drawMultiLayerCrescentArc(pen, {
    cx,
    cy,
    radius: 13.5 * scale,
    width: 5.0 * scale,
    eccentricity: 0.84,
    headAngle: angle + 0.12,
    tailAngle: angle - 0.92,
    fade: alpha * 0.88,
    ramp: GOD_MAUL_JADE_RAMP,
    seed: seed + 19,
    t: clamp01(p),
    flashHot: false
  });

  const bound = Math.ceil(25.5 * scale + 3);

  pen.shadeBox(cx - bound, cy - bound, cx + bound, cy + bound, (lx, ly, out) => {
    const dx = lx - cx;
    const dy = ly - cy;
    const da = (dx * cosA + dy * sinA) / scale;
    const dp = (-dx * sinA + dy * cosA) / scale;
    const ada = Math.abs(da);
    out.alpha = alpha;

    // 1. Ornate Horned-Ram Pommel Cap (`dp` in `[-24, -20]`) & Runic Haft (`dp` in `[-20, -8]`)
    // Kept 100% inside the rotated bounding box so the handle is NEVER cut off!
    if (dp >= -24.0 && dp < -8.0) {
      if (dp < -20.0) {
        // Ornate Horned-Ram Pommel Crown (`dp` in `[-24, -20]`)
        const uPom = (dp + 24.0) / 4.0;
        const pommelW = 2.8 + Math.sin(uPom * Math.PI) * 2.4;
        const crownCurve = -24.0 + (ada / 5.2) ** 2 * 1.4;
        if (ada > pommelW || dp < crownCurve) return 0;
        if (ada >= pommelW - 0.95 || dp <= crownCurve + 0.95) {
          return COL_OBSIDIAN;
        }
        if (ada + Math.abs(dp + 22.0) <= 2.1) {
          out.glowColor = COL_JADE_MID;
          out.glowStrength = 0.42 * alpha;
          return ada < 0.8 ? PURE_WHITE : COL_JADE_PALE;
        }
        return dp < -22.0 ? COL_FORGE_GOLD : COL_MAGMA_MID;
      }

      // Reinforced Dwarven Runic Haft (`dp` in `[-20, -8]`) with flared socket collar (`dp > -11`)
      const collarFlare = dp > -11.0 ? ((dp + 11.0) / 3.0) * 1.6 : 0;
      const haftW = 2.7 + collarFlare;
      if (ada > haftW) return 0;
      if (ada >= haftW - 0.95) {
        return COL_OBSIDIAN;
      }
      const isGripRing = Math.abs(Math.sin(dp * 0.95)) > 0.72 || dp > -9.8;
      if (isGripRing) {
        out.glowColor = COL_MAGMA_MID;
        out.glowStrength = 0.24 * alpha;
        return ada < 0.9 ? PURE_WHITE : COL_FORGE_GOLD;
      }
      return ada < 0.85 ? COL_MAGMA_BRIGHT : COL_BASALT;
    }

    // 2. Rotated Double-Faced Beveled Volcanic Anvil Head (`da` in `[-18, +18]`, `dp` in `[-8, +10]`)
    if (dp < -8.0 || dp > 10.0 || ada > 18.0) return 0;

    // Pinched anvil waist at `ada in [3.5, 9.5]`, flaring to huge beveled striking faces at `ada in [9.5, 18.0]`
    const faceFlare = ada > 9.0 ? ((ada - 9.0) / 9.0) * 1.6 : ada < 3.8 ? (1 - ada / 3.8) * 1.1 : 0;
    const minDp = -6.6 - faceFlare;
    const maxDp = 8.4 + faceFlare;
    const chamfer = Math.max(0, ada - 15.2) + Math.max(0, dp < 0 ? -dp - (Math.abs(minDp) - 2.4) : dp - (maxDp - 2.4));
    if (dp < minDp || dp > maxDp || chamfer > 2.6) return 0;

    const distEdge = Math.min(18.0 - ada, dp - minDp, maxDp - dp, 2.6 - chamfer);
    // 1px Dark Basalt-Obsidian Selective Outline
    if (distEdge < 1.05 / Math.max(0.65, scale)) {
      return COL_OBSIDIAN;
    }

    // Corner Pyramid Studs on the flared striking cheeks
    const studDa = Math.abs(ada - 14.2);
    const studDp = Math.min(Math.abs(dp + 4.4), Math.abs(dp - 5.6));
    if (studDa <= 1.6 && studDp <= 1.6) {
      out.glowColor = COL_FORGE_GOLD;
      out.glowStrength = 0.34 * alpha;
      return studDa + studDp < 1.2 ? PURE_WHITE : COL_FORGE_GOLD;
    }

    // Blazing Khazad Emerald-Jade & Molten-Gold Runes on Anvil Cheeks & Central Boss
    const centerRune = ada * 0.78 + Math.abs(dp - 0.8) * 0.95;
    const cheekRune = Math.abs(ada - 10.2) * 0.95 + Math.abs(dp - 0.8) * 1.05;
    if (centerRune <= 5.4 || cheekRune <= 4.0) {
      out.glowColor = COL_JADE_MID;
      out.glowStrength = 0.48 * alpha;
      if (centerRune <= 1.8 || cheekRune <= 1.4) return PURE_WHITE;
      if (centerRune <= 3.5 || cheekRune <= 2.6) return COL_JADE_PALE;
      return COL_JADE_MID;
    }

    // White-Hot / Molten-Gold Bottom & Left/Right Striking Faces
    if (dp >= maxDp - 2.6 || ada >= 15.6) {
      out.glowColor = COL_MAGMA_BRIGHT;
      out.glowStrength = 0.44 * alpha;
      if (flashHot || dp >= maxDp - 1.4) return PURE_WHITE;
      return ada >= 16.4 ? COL_FORGE_GOLD : COL_MAGMA_BRIGHT;
    }

    // Golden Khazad Fretwork & Bevel Framing
    if (distEdge < 2.2 || Math.abs(ada - 6.0) < 0.95 || Math.abs(dp - 0.8) < 0.85) {
      return dp < 0.8 ? COL_FORGE_GOLD : COL_MAGMA_MID;
    }

    // Heavy Volcanic Basalt-Obsidian Armor Plate
    return dp < 0.8 ? COL_MAGMA_DEEP : COL_BASALT;
  });
}

// ============================================================================
// 1. 2.5D ORBITING FORGE MAGMA MANTLE (`forgeMagmaMantle`)
//    - 2.5D counter-rotating 8-Cog Dwarven Crucible Gear-Ring at Torgar's feet
//    - Floating pixel-art Khazad Diamond Jade Runes & rising volcanic embers
//    - Orbiting mini-anvils when fortified!
// ============================================================================
export const forgeMagmaMantle = {
  duration: 2.4,
  loop: true,
  defaults: {
    palette: FORGE_GOLD_PALETTE,
    seed: 41,
    fortified: false
  },
  create(cfg) {
    const magma = buildColorRamp(cfg.palette, 8);
    const jade = buildColorRamp(FORGE_JADE_PALETTE, 8);
    const magmaBand = [magma[2], magma[4], magma[6], PURE_WHITE];
    const jadeBand = [jade[2], jade[4], jade[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({
      rng,
      sparkRamp: [PURE_WHITE, magma[6], jade[5], magma[4]]
    });
    let phase = 0;
    let emitAcc = 0;

    function drawHalf(pen, isFront) {
      const fortified = Boolean(cfg.fortified);
      const footY = 23; // Torgar's feet relative to his `(0, -78)` torso anchor
      const gearRx = fortified ? 28 : 23;
      const aspectY = 0.28;
      const pred = isFront ? FRONT_HALF : BACK_HALF;

      // 1. 2.5D Counter-Rotating 8-Cog Dwarven Crucible Gear-Ring at Torgar's Feet
      drawDwarvenCrucibleGearRing(
        pen,
        0,
        footY,
        gearRx,
        aspectY,
        phase * 1.35,
        isFront ? (fortified ? 0.95 : 0.78) : fortified ? 0.84 : 0.62,
        pred,
        false
      );

      // Counter-rotating inner Emerald-Jade Crucible Ring at feet
      drawTiltedOrbitBand(
        pen,
        0,
        footY,
        gearRx * 0.68,
        aspectY,
        fortified ? 1.6 : 1.2,
        isFront ? 0.88 : 0.72,
        jadeBand,
        pred,
        isFront && fortified
      );

      // 2. Floating Pixel-Art Khazad Diamond Jade Runes around Torgar's Torso
      const runeCount = fortified ? 5 : 4;
      const runeRx = fortified ? 24 : 20;
      for (let i = 0; i < runeCount; i++) {
        const a = -phase * 2.1 + (i / runeCount) * Math.PI * 2;
        const sinA = Math.sin(a);
        if ((sinA >= 0) !== isFront) continue;
        const ox = Math.cos(a) * runeRx;
        const oy = -2 + sinA * runeRx * 0.3 + Math.sin(phase * 3.4 + i) * 1.8;
        drawKhazadDiamondRune(pen, ox, oy, fortified ? 3.2 : 2.6, i % 2 === 0, isFront ? 0.96 : 0.84);
      }

      // 3. Orbiting Mini Horned Dwarven Anvils + Upper Magma-Jade Aegis Band when Fortified!
      if (fortified) {
        drawTiltedOrbitBand(pen, 0, -6, 22, 0.26, 1.4, isFront ? 0.9 : 0.74, magmaBand, pred, false);
        const anvilCount = 3;
        for (let i = 0; i < anvilCount; i++) {
          const a = phase * 2.6 + (i / anvilCount) * Math.PI * 2;
          const sinA = Math.sin(a);
          if ((sinA >= 0) !== isFront) continue;
          const ax = Math.cos(a) * 25;
          const ay = -5 + sinA * 25 * 0.28;
          drawPixelHornedAnvil(pen, ax, ay, 0.34, Math.sin(phase * 4 + i) * 0.18, isFront ? 0.98 : 0.88, false);
        }
      }
    }

    return {
      step(dt) {
        phase += dt;
        emitAcc += dt * (cfg.fortified ? 28 : 15);
        while (emitAcc >= 1) {
          emitAcc -= 1;
          const a = rng.between(0, Math.PI * 2);
          const rx = cfg.fortified ? 24 : 19;
          const isJade = rng.chance(0.48);
          motes.emit(
            rng.chance(0.38) ? 'glint' : 'spark',
            Math.cos(a) * rx,
            20 + Math.sin(a) * rx * 0.28,
            rng.between(-10, 10),
            rng.between(-34, -12),
            rng.between(0.18, 0.34),
            isJade ? jade[5] : magma[6],
            1.1,
            -18
          );
        }
        motes.step(dt);
      },
      renderBack(pen) {
        drawHalf(pen, false);
      },
      renderFront(pen) {
        drawHalf(pen, true);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 2. MULTI-LAYER WORLD-BREAKER ANVIL CLEAVE (`worldBreakerAnvilCleave`)
//    - 3-layer serrated Volcanic Magma & Emerald-Jade Warhammer Wake (`drawMultiLayerCrescentArc`)
//    - Flying red-hot hexagonal forge-rivets & molten slag droplets with gravity
//    - Jagged basalt impact shock-cone!
// ============================================================================
export const worldBreakerAnvilCleave = {
  duration: 0.42,
  loop: false,
  defaults: {
    palette: FORGE_GOLD_PALETTE,
    seed: 73,
    radius: 32,
    width: 12.5,
    isFinisher: false
  },
  create(cfg) {
    const magma = buildColorRamp(FORGE_GOLD_PALETTE, 8);
    const jade = buildColorRamp(FORGE_JADE_PALETTE, 8);
    const band4 = [magma[2], jade[4], magma[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({
      rng,
      sparkRamp: [PURE_WHITE, magma[6], jade[5], magma[4]],
      floorY: 28
    });

    // Deterministic flying red-hot hexagonal forge-rivets
    const rivets = [];
    const rivetCount = cfg.isFinisher ? 7 : 5;
    for (let i = 0; i < rivetCount; i++) {
      const ang = -0.85 + (i / Math.max(1, rivetCount - 1)) * 1.75;
      const spd = 62 + (i % 3) * 26;
      rivets.push({
        ang,
        spd,
        isJade: i % 2 === 1,
        r: cfg.isFinisher ? 2.2 : 1.8
      });
    }

    let t = 0;
    let burstDone = false;

    return {
      step(dt) {
        if (!burstDone) {
          burstDone = true;
          const cnt = cfg.isFinisher ? 24 : 16;
          for (let i = 0; i < cnt; i++) {
            const a = rng.between(-Math.PI * 0.58, Math.PI * 0.58);
            const spd = rng.between(54, 158);
            // Mix of high-gravity molten slag droplets (`orb` / `spark`) and jade glints
            const kind = i % 4 === 0 ? 'orb' : i % 3 === 0 ? 'glint' : 'spark';
            motes.emit(
              kind,
              Math.cos(a) * 14,
              Math.sin(a) * 12,
              Math.cos(a) * spd,
              Math.sin(a) * spd - 24,
              rng.between(0.18, 0.36),
              i % 2 === 0 ? jade[5] : magma[5],
              kind === 'orb' ? 1.8 : 1.15,
              185
            );
          }
        }
        t += dt;
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 0.42);
        const fade = 1 - u;
        if (fade <= 0.02) return;
        const rad = (cfg.radius || 32) * (0.74 + 0.26 * smoothStep(0, 0.32, u));
        drawTiltedOrbitBand(pen, 2, 4, rad * 0.86, 0.34, 1.5, 0.84 * fade, band4, BACK_HALF, false);
        pen.radialGlow(12, 0, rad * 0.82, magma[4], 0.32 * fade);
        pen.radialGlow(16, -4, rad * 0.58, jade[4], 0.26 * fade);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.42);
        const fade = 1 - u * u;
        if (fade <= 0.02) return;

        const baseR = cfg.radius || 32;
        const baseW = cfg.width || 12.5;
        const flipSign = cfg.flipAngle || cfg.reverse ? -1 : 1;
        const headAng = flipSign * (-0.98 + 2.22 * smoothStep(0, 0.52, u));
        const tailAng = flipSign * (-1.72 + 0.52 * u);

        // Layer A: Volcanic Basalt-Obsidian & Molten Magma Crimson-Orange Primary Cleave
        drawMultiLayerCrescentArc(pen, {
          cx: -2,
          cy: 0,
          radius: baseR,
          width: baseW,
          eccentricity: 0.8,
          headAngle: headAng,
          tailAngle: tailAng,
          fade,
          ramp: magma,
          seed: cfg.seed || 73,
          t: u,
          flashHot: u < 0.34
        });

        // Layer B: Interleaved Luminous World-Forge Emerald-Jade Runic Shear Wake
        drawMultiLayerCrescentArc(pen, {
          cx: -3,
          cy: 1,
          radius: baseR * 0.8,
          width: baseW * (cfg.isFinisher ? 0.78 : 0.62),
          eccentricity: 0.8,
          headAngle: headAng - 0.08 * flipSign,
          tailAngle: tailAng + 0.16 * flipSign,
          fade: fade * 0.94,
          ramp: jade,
          seed: (cfg.seed || 73) + 23,
          t: u,
          flashHot: u < 0.24
        });

        // Leading Warhammer Tip & Jagged Basalt Impact Shock-Cone
        const tipX = -2 + Math.cos(headAng) * baseR;
        const tipY = Math.sin(headAng) * baseR * 0.8;

        // Jagged Basalt & Jade Impact Shock-Cone spikes radiating ahead of hammer head
        const coneSpikes = cfg.isFinisher ? 5 : 3;
        for (let i = 0; i < coneSpikes; i++) {
          const sAng = headAng + (i - (coneSpikes - 1) * 0.5) * 0.26;
          const sLen = (cfg.isFinisher ? 16 : 12) * fade;
          const x1 = tipX + Math.cos(sAng) * sLen;
          const y1 = tipY + Math.sin(sAng) * sLen;
          pen.line(tipX, tipY, x1, y1, COL_OBSIDIAN, fade * 0.95);
          pen.line(
            tipX,
            tipY,
            tipX + Math.cos(sAng) * sLen * 0.82,
            tipY + Math.sin(sAng) * sLen * 0.82,
            i % 2 === 0 ? COL_JADE_BRIGHT : COL_FORGE_GOLD,
            fade
          );
        }

        // Flying Red-Hot Hexagonal Forge-Rivets
        for (let i = 0; i < rivets.length; i++) {
          const rv = rivets[i];
          const dist = 10 + rv.spd * u;
          const rx = Math.cos(rv.ang * flipSign) * dist;
          const ry = Math.sin(rv.ang * flipSign) * dist * 0.78 + u * u * 14;
          drawHexForgeRivet(pen, rx, ry, rv.r * fade, rv.isJade, fade * 0.96);
        }

        drawKhazadDiamondRune(pen, tipX, tipY, 4.2 * fade, cfg.isFinisher, fade * 0.95);
        drawStarburstFlare(pen, tipX, tipY, 11.5 * fade, fade * 0.96, [magma[4], jade[5], magma[6], PURE_WHITE]);
        motes.render(pen);
      }
    };
  }
};

export const forgeHammerArc = worldBreakerAnvilCleave;

// ============================================================================
// 2B. MOLTEN ANVIL SPARKS (`moltenAnvilSparks`)
//     - Radial Molten-Gold & Emerald-Jade Anvil Rivet Burst + 2.5D Spark Ring
// ============================================================================
export const moltenAnvilSparks = {
  duration: 0.38,
  loop: false,
  defaults: {
    palette: FORGE_GOLD_PALETTE,
    seed: 97
  },
  create(cfg) {
    const magma = buildColorRamp(FORGE_GOLD_PALETTE, 8);
    const jade = buildColorRamp(FORGE_JADE_PALETTE, 8);
    const band4 = [magma[2], jade[4], magma[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({
      rng,
      sparkRamp: [PURE_WHITE, magma[6], jade[5], magma[4]],
      floorY: 24
    });
    let t = 0;
    let burstDone = false;

    return {
      step(dt) {
        if (!burstDone) {
          burstDone = true;
          for (let i = 0; i < 20; i++) {
            const a = rng.between(-Math.PI * 0.85, Math.PI * 0.15);
            const spd = rng.between(64, 168);
            motes.emit(
              i % 3 === 0 ? 'orb' : i % 2 === 0 ? 'glint' : 'spark',
              Math.cos(a) * 6,
              Math.sin(a) * 6,
              Math.cos(a) * spd,
              Math.sin(a) * spd - 28,
              rng.between(0.18, 0.34),
              i % 2 === 0 ? jade[5] : magma[6],
              1.35,
              175
            );
          }
        }
        t += dt;
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 0.38);
        const fade = 1 - u * u;
        if (fade <= 0.02) return;
        const r = 14 + 22 * smoothStep(0, 0.65, u);
        drawTiltedOrbitBand(pen, 0, 2, r, 0.32, 1.5, 0.86 * fade, band4, BACK_HALF, false);
        pen.radialGlow(0, -2, r * 0.85, magma[5], 0.36 * fade);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.38);
        const fade = 1 - u * u;
        if (fade <= 0.02) return;
        const r = 14 + 22 * smoothStep(0, 0.65, u);
        drawTiltedOrbitBand(pen, 0, 2, r, 0.32, 1.7, 0.94 * fade, band4, FRONT_HALF, u < 0.28);

        for (let i = 0; i < 6; i++) {
          const ang = -Math.PI * 0.82 + (i / 5) * Math.PI * 0.64;
          const dist = 6 + 28 * u;
          const rx = Math.cos(ang) * dist;
          const ry = Math.sin(ang) * dist * 0.75 + u * u * 16;
          drawHexForgeRivet(pen, rx, ry, 2.1 * fade, i % 2 === 1, fade * 0.96);
        }

        drawKhazadDiamondRune(pen, 0, -4 * (1 - u), 4.4 * fade, true, fade * 0.96);
        drawStarburstFlare(pen, 0, -2, 12 * fade, fade * 0.96, [magma[4], jade[5], magma[6], PURE_WHITE]);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 2C. RUNIC BULWARK DOME (`runicBulwarkDome`)
//     - 2.5D Octagonal Khazad Bulwark Aegis Dome & Orbiting Diamond Runes around Titan
// ============================================================================
export const runicBulwarkDome = {
  duration: 0.52,
  loop: false,
  defaults: {
    palette: FORGE_GOLD_PALETTE,
    seed: 109
  },
  create(cfg) {
    const magma = buildColorRamp(FORGE_GOLD_PALETTE, 8);
    const jade = buildColorRamp(FORGE_JADE_PALETTE, 8);
    const magmaBand = [magma[2], magma[4], magma[6], PURE_WHITE];
    const jadeBand = [jade[2], jade[4], jade[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({
      rng,
      sparkRamp: [PURE_WHITE, magma[6], jade[5], magma[4]]
    });
    let t = 0;
    let burstDone = false;

    function drawBulwarkHalf(pen, u, fade, isFront) {
      const pop = smoothStep(0, 0.22, u);
      const pred = isFront ? FRONT_HALF : BACK_HALF;
      const rx = (24 + 8 * pop);
      drawDwarvenCrucibleGearRing(pen, 0, 18, rx, 0.28, u * 2.4, (isFront ? 0.94 : 0.82) * fade, pred, true);
      drawTiltedOrbitBand(pen, 0, 2, rx * 0.92, 0.34, 1.7, (isFront ? 0.92 : 0.78) * fade, magmaBand, pred, isFront && u < 0.3);
      drawTiltedOrbitBand(pen, 0, -12, rx * 0.74, 0.32, 1.5, (isFront ? 0.9 : 0.76) * fade, jadeBand, pred, false);

      const runeCount = 4;
      for (let i = 0; i < runeCount; i++) {
        const a = u * 3.2 + (i * Math.PI) / 2;
        const sinA = Math.sin(a);
        if ((sinA >= 0) !== isFront) continue;
        const ox = Math.cos(a) * rx * 0.88;
        const oy = -2 + sinA * rx * 0.28;
        drawKhazadDiamondRune(pen, ox, oy, 3.4 * fade, i % 2 === 0, fade * 0.96);
      }
    }

    return {
      step(dt) {
        if (!burstDone) {
          burstDone = true;
          for (let i = 0; i < 16; i++) {
            const a = (i / 16) * Math.PI * 2;
            motes.emit(
              i % 2 === 0 ? 'glint' : 'spark',
              Math.cos(a) * 20,
              Math.sin(a) * 8,
              Math.cos(a) * 24,
              rng.between(-58, -18),
              rng.between(0.2, 0.38),
              i % 2 === 0 ? jade[5] : magma[6],
              1.2,
              -22
            );
          }
        }
        t += dt;
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 0.52);
        const fade = 1 - Math.pow(u, 1.6);
        if (fade <= 0.02) return;
        drawBulwarkHalf(pen, u, fade, false);
        pen.radialGlow(0, -2, 28 * fade, jade[4], 0.34 * fade);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.52);
        const fade = 1 - Math.pow(u, 1.6);
        if (fade <= 0.02) return;
        drawBulwarkHalf(pen, u, fade, true);
        if (u < 0.38) {
          drawStarburstFlare(pen, 0, -6, 11 * fade, fade * 0.92, [magma[4], jade[5], magma[6], PURE_WHITE]);
        }
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 3. TECTONIC CRATER SHOCKWAVE (`tectonicCraterShockwave` / `tectonicCraterSlam`)
//    - Sequential 5-Spire Volcanic Basalt & Jade Obelisk Eruption + Crater Fissure
//    - Rips a glowing magma fissure across the floor and erupts 5 staggered
//      Faceted Basalt-and-Jade Crystal/Rock Spires with curved 2.5D rubble-crater rims,
//      dark obsidian outlines, lava veins, and jade rune caps, plus dual 2.5D shock-rings!
// ============================================================================
export const tectonicCraterShockwave = {
  duration: 0.56,
  loop: false,
  defaults: {
    palette: FORGE_GOLD_PALETTE,
    seed: 113,
    maxRx: 108
  },
  create(cfg) {
    const magma = buildColorRamp(FORGE_GOLD_PALETTE, 8);
    const jade = buildColorRamp(FORGE_JADE_PALETTE, 8);
    const magmaBand = [magma[2], magma[4], magma[6], PURE_WHITE];
    const jadeBand = [jade[2], jade[4], jade[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({
      rng,
      sparkRamp: [PURE_WHITE, magma[6], jade[5], magma[4]],
      floorY: 0
    });
    const crackLeft = buildLightningChain(rng, 0, 1, -34, 3, 0.16, 3);
    const crackRight = buildLightningChain(rng, 0, 1, 36, -1, 0.16, 3);

    // 3 Parabolic Tumbling Horned Dwarven Forge-Anvils launched by the Golf-Drive Uppercut
    const anvilProjectiles = [
      { vx: -26, vy: -54, grav: 112, scale: 0.68, spinSpeed: -5.5, delay: 0.04, back: true },
      { vx: 28, vy: -52, grav: 112, scale: 0.68, spinSpeed: 5.5, delay: 0.06, back: true },
      { vx: 4, vy: -68, grav: 118, scale: 0.92, spinSpeed: 4.2, delay: 0.0, back: false }
    ];

    let t = 0;
    let burstDone = false;

    return {
      step(dt) {
        if (!burstDone) {
          burstDone = true;
          for (let i = 0; i < 22; i++) {
            const rx = rng.between(-30, 30);
            motes.emit(
              i % 3 === 0 ? 'glint' : 'spark',
              rx,
              -2,
              rx * 2.4,
              rng.between(-108, -42),
              rng.between(0.2, 0.42),
              i % 2 === 0 ? magma[6] : jade[5],
              1.15,
              112
            );
          }
        }
        t += dt;
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 0.56);
        const pop = smoothStep(0, 0.2, u);
        const fade = 1 - Math.pow(u, 1.65);
        if (fade <= 0.02) return;
        const maxR = Math.min(48, Math.max(26, cfg.maxRx ? cfg.maxRx / 3 : 36));

        // Dual 2.5D Shock-Rings & Crucible Gear (Back Half)
        drawDwarvenCrucibleGearRing(pen, 0, 0, maxR * 0.92 * pop, 0.24, u * 2.4, 0.88 * fade, BACK_HALF, false);
        drawTiltedOrbitBand(pen, 0, 0, maxR * 0.62 * pop, 0.24, 1.5, 0.86 * fade, jadeBand, BACK_HALF, false);

        // Twin Vertical Interlocking Crucible Gear-Wheels rising from the crater
        drawDwarvenCrucibleGearRing(pen, -14 * pop, -12 * pop, 15 * pop, 0.78, -u * 4.2, 0.82 * fade, null, true);
        drawDwarvenCrucibleGearRing(pen, 14 * pop, -12 * pop, 15 * pop, 0.78, u * 4.2, 0.82 * fade, null, false);

        // Back-layer Parabolic Tumbling Horned Anvils
        for (const ap of anvilProjectiles) {
          if (!ap.back) continue;
          const uAp = clamp01((u - ap.delay) / (1 - ap.delay));
          if (uAp <= 0) continue;
          const ax = ap.vx * uAp;
          const ay = -4 + ap.vy * uAp + 0.5 * ap.grav * uAp * uAp;
          drawPixelHornedAnvil(pen, ax, ay, ap.scale, uAp * ap.spinSpeed, fade * 0.94, uAp < 0.35);
        }

        pen.polyline(crackLeft, COL_MAGMA_BRIGHT, 0.92 * fade);
        pen.polyline(crackRight, COL_JADE_BRIGHT, 0.92 * fade);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.56);
        const pop = smoothStep(0, 0.2, u);
        const fade = 1 - Math.pow(u, 1.65);
        if (fade <= 0.02) return;
        const maxR = Math.min(48, Math.max(26, cfg.maxRx ? cfg.maxRx / 3 : 36));

        // Roaring Upward Golf-Drive Crescent Shockwave Arc
        drawMultiLayerCrescentArc(pen, {
          cx: 2,
          cy: -14 * pop,
          radius: 26 * pop,
          width: 8.5,
          eccentricity: 0.82,
          headAngle: -1.85 + u * 0.55,
          tailAngle: 0.45,
          fade: fade * 0.95,
          ramp: magma,
          seed: cfg.seed || 113,
          t: u,
          flashHot: u < 0.28
        });

        // Front-layer Central Parabolic Horned Dwarven Anvil Cannonball
        for (const ap of anvilProjectiles) {
          if (ap.back) continue;
          const uAp = clamp01((u - ap.delay) / (1 - ap.delay));
          const ax = ap.vx * uAp;
          const ay = -6 + ap.vy * uAp + 0.5 * ap.grav * uAp * uAp;
          drawPixelHornedAnvil(pen, ax, ay, ap.scale, uAp * ap.spinSpeed * 0.35, fade * 0.98, uAp < 0.4);
          drawKhazadDiamondRune(pen, ax, ay - 9 * ap.scale, 2.8 * fade, true, fade * 0.94);
        }

        // Dual 2.5D Shock-Rings (Front Half)
        drawTiltedOrbitBand(pen, 0, 2, maxR * pop, 0.24, 2.0, 0.96 * fade, magmaBand, FRONT_HALF, u < 0.24);
        drawTiltedOrbitBand(pen, 0, 2, maxR * 0.64 * pop, 0.24, 1.6, 0.92 * fade, jadeBand, FRONT_HALF, false);

        if (u < 0.45) {
          drawStarburstFlare(pen, 0, -14, 13 * (1 - u / 0.45), fade * 0.96, [magma[4], jade[5], magma[6], PURE_WHITE]);
        }
        motes.render(pen);
      }
    };
  }
};

export const tectonicCraterSlam = tectonicCraterShockwave;

// ============================================================================
// 4. COLOSSAL SKY ANVIL DROP (`colossalSkyAnvilDrop`)
//    - Materializes a Giant Pixel-Art Horned Dwarven Forge-Anvil & Diagonal Swinging
//      Colossal God-Maul crushing down with a Khazad octagonal floor seal,
//      fanning volcanic basalt-jade fangs, and flying slag shrapnel!
// ============================================================================
export const colossalSkyAnvilDrop = {
  duration: 0.62,
  loop: false,
  defaults: {
    palette: FORGE_GOLD_PALETTE,
    seed: 149
  },
  create(cfg) {
    const magma = buildColorRamp(FORGE_GOLD_PALETTE, 8);
    const jade = buildColorRamp(FORGE_JADE_PALETTE, 8);
    const magmaBand = [magma[2], magma[4], magma[6], PURE_WHITE];
    const jadeBand = [jade[2], jade[4], jade[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({
      rng,
      sparkRamp: [PURE_WHITE, magma[6], jade[5], magma[4]],
      floorY: 0
    });
    let t = 0;
    let impactTriggered = false;

    return {
      step(dt) {
        t += dt;
        if (t >= 0.14 && !impactTriggered) {
          impactTriggered = true;
          for (let i = 0; i < 24; i++) {
            const rx = rng.between(-28, 28);
            motes.emit(
              i % 3 === 0 ? 'orb' : i % 2 === 0 ? 'glint' : 'spark',
              rx * 0.5,
              -8,
              rx * 3.1,
              rng.between(-120, -45),
              rng.between(0.22, 0.44),
              i % 2 === 0 ? jade[5] : magma[6],
              1.35,
              140
            );
          }
        }
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 0.62);
        const fade = 1 - Math.pow(u, 1.55);
        if (fade <= 0.02) return;
        const pop = smoothStep(0.1, 0.32, u);

        // Khazad Octagonal Crucible Gear Seal on Floor (Back Half)
        drawDwarvenCrucibleGearRing(pen, 0, 0, (24 + 18 * pop), 0.24, -u * 2.4, 0.9 * fade, BACK_HALF, true);
        drawTiltedOrbitBand(pen, 0, 0, (16 + 14 * pop), 0.24, 1.6, 0.88 * fade, magmaBand, BACK_HALF, false);

        // Flanking Diagonal Volcanic Basalt-Jade Spires erupting on anvil impact
        if (u >= 0.14) {
          const spirePop = smoothStep(0.14, 0.34, u);
          drawVolcanicBasaltJadeSpire(pen, -18, 0, 28, 5.2, -12, 41, spirePop, fade * 0.94);
          drawVolcanicBasaltJadeSpire(pen, 18, 0, 28, 5.2, 12, 67, spirePop, fade * 0.94);
        }

        pen.radialGlow(0, -18, 28 * fade, jade[4], 0.38 * fade);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.62);
        const fade = 1 - Math.pow(u, 1.55);
        if (fade <= 0.02) return;

        // 1. Plunging Giant Horned Dwarven Forge-Anvil (`u in [0, 0.16]` drops from `-36` to `-11`)
        const anvilDrop = smoothStep(0, 0.16, u);
        const anvilY = -36 + 25 * anvilDrop;
        drawPixelHornedAnvil(pen, 0, anvilY, 1.18, 0, fade * 0.98, u >= 0.14 && u <= 0.32);

        // 2. Diagonal Swinging Colossal God-Maul crashing onto the Anvil Strike Face
        const hammerFade = fade * (1 - smoothStep(0.62, 0.95, u));
        if (hammerFade > 0.04) {
          const swingP = clamp01(u * 1.45);
          const hammerY = -34 + 12 * smoothStep(0.04, 0.24, u);
          drawColossalDwarvenWarhammer(
            pen,
            0,
            hammerY,
            1.05,
            swingP,
            cfg.seed || 149,
            null,
            hammerFade,
            u >= 0.18 && u <= 0.36
          );
        }

        // 3. Diagonal Arcing Emerald-Jade & Molten Magma Lightning Chains
        if (u >= 0.12 && u <= 0.65) {
          const boltJade = buildLightningChain(rng, -26, -38, -2, anvilY - 8, 0.22, 3);
          const boltMagma = buildLightningChain(rng, 26, -38, 2, anvilY - 8, 0.22, 3);
          pen.polyline(boltJade, COL_JADE_BRIGHT, fade * 0.95);
          pen.polyline(boltJade, PURE_WHITE, fade * 0.85);
          pen.polyline(boltMagma, COL_FORGE_GOLD, fade * 0.95);
        }

        // 4. Front 2.5D Khazad Octagonal Floor Seal & Flying Forge Rivets
        const pop = smoothStep(0.1, 0.32, u);
        drawDwarvenCrucibleGearRing(pen, 0, 2, (24 + 18 * pop), 0.24, -u * 2.4, 0.96 * fade, FRONT_HALF, true);
        drawTiltedOrbitBand(pen, 0, 2, (16 + 14 * pop), 0.24, 1.8, 0.94 * fade, jadeBand, FRONT_HALF, u < 0.32);

        if (u >= 0.16) {
          const uImp = clamp01((u - 0.16) / 0.84);
          for (let i = 0; i < 6; i++) {
            const a = -Math.PI * 0.85 + (i / 5) * Math.PI * 0.7;
            const d = 8 + uImp * 36;
            drawHexForgeRivet(
              pen,
              Math.cos(a) * d,
              anvilY - 6 + Math.sin(a) * d * 0.65 + uImp * uImp * 18,
              2.0 * fade,
              i % 2 === 0,
              fade
            );
          }
          drawStarburstFlare(pen, 0, anvilY - 9, 14 * fade, fade * 0.98, [magma[4], jade[5], magma[6], PURE_WHITE]);
        }

        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 5. RAGNAROK WORLD-FORGE WAVE (`ragnarokWorldForgeWave`)
//    - Colossal Ragnarok World-Forge Cataclysmic Eruption & Diagonal Swinging God-Maul:
//      * `renderBack`: Sweeping 2.5D Diagonal Magma-Jade Crescent Shockwaves & Arcing
//        Anvil Firebrands following parabolic trajectories + colossal 2.5D Interlocking
//        Dwarven Crucible Gear-Mandala on the floor (ZERO vertical poles!).
//      * `renderFront`: Colossal Diagonal-Swinging Khazad God-Maul crashing into a
//        central World-Forge Crucible Anvil, triggering 6 fanning diagonal Volcanic
//        Basalt-Jade Spires with curved 2.5D rubble-crater rims and multi-ring lava shockwaves!
// ============================================================================
export const ragnarokWorldForgeWave = {
  duration: 0.78,
  loop: false,
  defaults: {
    palette: FORGE_GOLD_PALETTE,
    seed: 181
  },
  create(cfg) {
    const magma = buildColorRamp(FORGE_GOLD_PALETTE, 8);
    const jade = buildColorRamp(FORGE_JADE_PALETTE, 8);
    const magmaBand = [magma[2], magma[4], magma[6], PURE_WHITE];
    const jadeBand = [jade[2], jade[4], jade[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({
      rng,
      sparkRamp: [PURE_WHITE, magma[6], jade[5], magma[4]],
      floorY: 0
    });

    const cathedralSpires = [
      { x: -34, h: 32, w: 5.8, tilt: -18.0, delay: 0.12, back: true, seed: 19 },
      { x: 34, h: 32, w: 5.8, tilt: 18.0, delay: 0.12, back: true, seed: 29 },
      { x: -24, h: 38, w: 6.4, tilt: -12.0, delay: 0.08, back: false, seed: 43 },
      { x: -11, h: 42, w: 6.8, tilt: -5.5, delay: 0.04, back: false, seed: 59 },
      { x: 11, h: 42, w: 6.8, tilt: 5.5, delay: 0.04, back: false, seed: 73 },
      { x: 24, h: 38, w: 6.4, tilt: 12.0, delay: 0.08, back: false, seed: 89 }
    ];

    // Parabolic Arcing Anvil Firebrands launched outward from the Ragnarok caldera
    const firebrands = [
      { vx: -58, vy: -64, grav: 118, isJade: false, seed: 13 },
      { vx: -36, vy: -76, grav: 124, isJade: true, seed: 27 },
      { vx: -18, vy: -82, grav: 128, isJade: false, seed: 41 },
      { vx: 18, vy: -82, grav: 128, isJade: true, seed: 53 },
      { vx: 36, vy: -76, grav: 124, isJade: false, seed: 67 },
      { vx: 58, vy: -64, grav: 118, isJade: true, seed: 83 }
    ];

    let t = 0;
    let burstDone = false;

    return {
      step(dt) {
        if (!burstDone) {
          burstDone = true;
          for (let i = 0; i < 30; i++) {
            const rx = rng.between(-46, 46);
            motes.emit(
              i % 3 === 0 ? 'orb' : i % 2 === 0 ? 'glint' : 'spark',
              rx,
              -4,
              rx * 2.6,
              rng.between(-138, -52),
              rng.between(0.26, 0.54),
              i % 2 === 0 ? magma[6] : jade[5],
              1.35,
              116
            );
          }
        }
        t += dt;
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 0.78);
        const pop = smoothStep(0, 0.18, u);
        const fade = 1 - Math.pow(u, 1.55);
        if (fade <= 0.02) return;

        // 1. Sweeping 2.5D Diagonal Magma-Jade Crescent Shockwaves (Left & Right Flanks)
        drawMultiLayerCrescentArc(pen, {
          cx: -14 * pop,
          cy: -16 * pop,
          radius: 34 * pop,
          width: 9.5,
          eccentricity: 0.78,
          headAngle: -2.35 - u * 0.45,
          tailAngle: -0.95,
          fade: fade * 0.9,
          ramp: magma,
          seed: (cfg.seed || 181) + 11,
          t: u,
          flashHot: u < 0.28
        });
        drawMultiLayerCrescentArc(pen, {
          cx: 14 * pop,
          cy: -16 * pop,
          radius: 34 * pop,
          width: 9.5,
          eccentricity: 0.78,
          headAngle: -0.79 + u * 0.45,
          tailAngle: -2.19,
          fade: fade * 0.9,
          ramp: jade,
          seed: (cfg.seed || 181) + 29,
          t: u,
          flashHot: u < 0.28
        });

        // 2. Parabolic Arcing Anvil Firebrands & Molten Slag Boulders
        for (let i = 0; i < firebrands.length; i++) {
          const fb = firebrands[i];
          const uFb = clamp01(u * 1.15);
          const fx = fb.vx * uFb;
          const fy = -8 + fb.vy * uFb + 0.5 * fb.grav * uFb * uFb;
          const prevU = Math.max(0, uFb - 0.12);
          const pfx = fb.vx * prevU;
          const pfy = -8 + fb.vy * prevU + 0.5 * fb.grav * prevU * prevU;
          pen.line(pfx, pfy, fx, fy, fb.isJade ? COL_JADE_BRIGHT : COL_MAGMA_BRIGHT, fade * 0.88);
          drawKhazadDiamondRune(pen, fx, fy, 3.2 * fade, fb.isJade, fade * 0.94);
          drawHexForgeRivet(pen, (pfx + fx) * 0.5, (pfy + fy) * 0.5, 1.8 * fade, !fb.isJade, fade * 0.85);
        }

        // 3. Colossal 2.5D Interlocking Dwarven Crucible Gear-Mandala on the Floor (Back Half)
        drawDwarvenCrucibleGearRing(pen, 0, 0, 54 * pop, 0.22, u * 2.2, 0.92 * fade, BACK_HALF, false);
        drawDwarvenCrucibleGearRing(pen, 0, 0, 36 * pop, 0.22, -u * 3.1, 0.88 * fade, BACK_HALF, true);
        drawTiltedOrbitBand(pen, 0, 0, 46 * pop, 0.22, 1.8, 0.9 * fade, magmaBand, BACK_HALF, false);

        // 4. Back-Layer Vertical Interlocking World-Forge Crucible Gears & Left Pincer God-Maul
        drawDwarvenCrucibleGearRing(pen, -22 * pop, -18 * pop, 20 * pop, 0.76, u * 3.8, 0.85 * fade, null, false);
        drawDwarvenCrucibleGearRing(pen, 22 * pop, -18 * pop, 20 * pop, 0.76, -u * 3.8, 0.85 * fade, null, true);

        const leftSwingAngle = -1.22 + smoothStep(0.0, 0.42, u) * 0.92;
        drawColossalDwarvenWarhammer(
          pen,
          -15 * pop,
          -24 + 8 * smoothStep(0, 0.28, u),
          0.96,
          u,
          (cfg.seed || 181) + 7,
          leftSwingAngle,
          fade * 0.94,
          u >= 0.14 && u <= 0.36
        );

        pen.radialGlow(0, -24 * pop, 34 * fade, magma[5], 0.44 * fade);
        pen.radialGlow(0, -14 * pop, 26 * fade, jade[5], 0.36 * fade);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.78);
        const pop = smoothStep(0, 0.18, u);
        const fade = 1 - Math.pow(u, 1.55);
        if (fade <= 0.02) return;

        // 1. Central World-Forge Crucible Horned Anvil Altar at `(0, -9)`
        drawPixelHornedAnvil(pen, 0, -9, 1.48 * pop, 0, fade * 0.99, u >= 0.14 && u <= 0.42);

        // 2. Right Pincer Colossal Diagonal-Swinging Khazad God-Maul crashing onto the World-Anvil
        const rightSwingAngle = 1.18 - smoothStep(0.04, 0.46, u) * 0.96;
        const hammerDrop = smoothStep(0, 0.24, u);
        const hammerY = -28 + 10 * hammerDrop;
        drawColossalDwarvenWarhammer(
          pen,
          14 * pop,
          hammerY,
          1.12,
          u,
          cfg.seed || 181,
          rightSwingAngle,
          fade * 0.99,
          u >= 0.16 && u <= 0.42
        );

        // 3. Orbiting Forged Khazad Diamond Runes around the World-Anvil
        for (let k = 0; k < 4; k++) {
          const ka = u * 4.5 + (k * Math.PI) / 2;
          const kx = Math.cos(ka) * 28 * pop;
          const ky = -12 + Math.sin(ka) * 9 * pop;
          drawKhazadDiamondRune(pen, kx, ky, 3.2 * fade, k % 2 === 0, fade * 0.95);
        }

        // 4. Diagonal Arcing Magma & Emerald-Jade Lightning Bolts across the Caldera
        if (u < 0.74) {
          const bolt1 = buildLightningChain(rng, -34, -38, -4, -14, 0.22, 3);
          const bolt2 = buildLightningChain(rng, 34, -38, 4, -14, 0.22, 3);
          pen.polyline(bolt1, COL_JADE_BRIGHT, fade * 0.96);
          pen.polyline(bolt1, PURE_WHITE, fade * 0.92);
          pen.polyline(bolt2, COL_FORGE_GOLD, fade * 0.96);
          pen.polyline(bolt2, PURE_WHITE, fade * 0.88);
        }

        // 5. Multi-Ring 2.5D Lava & Emerald-Jade Gear Shockwaves (Front Half)
        drawDwarvenCrucibleGearRing(pen, 0, 2, 54 * pop, 0.22, u * 2.2, 0.96 * fade, FRONT_HALF, false);
        drawTiltedOrbitBand(pen, 0, 2, 46 * pop, 0.22, 2.2, 0.96 * fade, magmaBand, FRONT_HALF, u < 0.3);
        drawTiltedOrbitBand(pen, 0, 2, 32 * pop, 0.22, 1.8, 0.92 * fade, jadeBand, FRONT_HALF, false);

        drawStarburstFlare(pen, 0, -18, 16 * fade, fade * 0.98, [magma[4], jade[5], magma[6], PURE_WHITE]);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// BAKED 30FPS `titan_vfx.png` 5-ROW CELLS (`104x104` logical -> `208x208` crisp 2x)
// Strictly bounded within `[-40, +40]` (`< [-42, +42]`) for 0/150 border clips!
//   Row 0 (`y=0`):   `moltenSlagBoulderCell`    — Spinning Flaming Horned Dwarven Forge-Anvil Projectile
//   Row 1 (`y=208`): `runicBulwarkShieldCell`   — Khazad Dwarven Octagonal Ram-Horn & Crossed-Warhammer Diamond Anvil Boss Crest
//   Row 2 (`y=416`): `tectonicMagmaPillarCell`  — 2.5D Erupting Volcanic Caldera, Fanning Diagonal Jade-Magma Fang Crown & Diagonal Swinging God-Maul Arc
//   Row 3 (`y=624`): `worldForgeAnvilSealCell`  — 8-Cog Interlocking Dwarven World-Forge Crucible Gear Mandala & Glowing Horned Anvil
//   Row 4 (`y=832`): `cataclysmCraterNovaCell`  — Tectonic Basalt Plate Split & 8-Spoke Magma-Jade Star-Crater Nova
// ============================================================================

// 6. ROW 0: SPINNING FLAMING HORNED DWARVEN FORGE-ANVIL PROJECTILE (`moltenSlagBoulderCell`)
export const moltenSlagBoulderCell = {
  duration: 1.0,
  loop: true,
  defaults: { palette: FORGE_GOLD_PALETTE, seed: 201 },
  create(cfg) {
    const magma = buildColorRamp(FORGE_GOLD_PALETTE, 8);
    const jade = buildColorRamp(FORGE_JADE_PALETTE, 8);
    const band4 = [magma[2], jade[4], magma[6], PURE_WHITE];

    return {
      step() {},
      renderBack(pen, localT) {
        const ph = localT * Math.PI * 2;
        const headX = 5;

        // Back half of 2.5D Crucible Gear Ring wrapping the spinning anvil
        drawDwarvenCrucibleGearRing(pen, headX, 0, 24, 0.44, -ph * 0.5, 0.9, BACK_HALF, false);

        // Braided Molten Magma Crimson-Orange & Emerald-Jade Spiral Slipstream Wake (`[-38, +14] x [-24, +24]`)
        pen.shadeBox(-38, -24, headX + 8, 24, (lx, ly, out) => {
          const tailU = clamp01((headX - lx) / 42);
          const halfH = (1 - tailU) * 18 + 2.5;
          const spiralA = Math.sin(tailU * 8 - ph * 2) * 4.2 * tailU;
          const spiralB = Math.cos(tailU * 8 - ph * 2) * 4.2 * tailU;
          const dMagma = Math.abs(ly - spiralA);
          const dJade = Math.abs(ly - spiralB);
          const dy = Math.min(dMagma, dJade);
          if (dy >= halfH) return 0;

          const n = fbmNoise2D(lx * 0.18 + ph * 1.5, ly * 0.2, cfg.seed, 2);
          const heat = (1 - dy / halfH) * (1 - tailU * 0.62) + n * 0.24;
          if (heat <= 0.22) return 0;

          const isJadeRibbon = dJade < dMagma && tailU > 0.12;
          const idx = Math.min(7, Math.max(1, Math.floor(heat * 7.8)));
          out.color = isJadeRibbon ? jade[Math.min(6, idx + 1)] : magma[idx];
          out.alpha = clamp01(heat * 1.35);
          out.glowColor = isJadeRibbon ? jade[5] : magma[5];
          out.glowStrength = 0.34 * (1 - tailU);
          return out.color;
        });

        // Trailing Red-Hot Hexagonal Forge-Rivets in the wake
        for (let i = 0; i < 4; i++) {
          const uRv = (localT * 2 + i * 0.25) % 1;
          const rx = headX - 6 - uRv * 28;
          const ry = Math.sin(uRv * 7 + i * 1.8) * 9;
          drawHexForgeRivet(pen, rx, ry, 2.2 * (1 - uRv * 0.35), i % 2 === 0, 0.95);
        }
      },
      renderFront(pen, localT) {
        const ph = localT * Math.PI * 2;
        const headX = 5;

        // Dual Magma & Jade Spiral Flame Ribbons hugging the rotating Anvil
        drawMultiLayerCrescentArc(pen, {
          cx: headX,
          cy: 0,
          radius: 21,
          width: 7.5,
          eccentricity: 0.88,
          headAngle: ph + 1.1,
          tailAngle: ph - 1.4,
          fade: 0.94,
          ramp: magma,
          seed: 201,
          t: localT,
          flashHot: true
        });
        drawMultiLayerCrescentArc(pen, {
          cx: headX,
          cy: 0,
          radius: 20,
          width: 6.5,
          eccentricity: 0.88,
          headAngle: ph + Math.PI + 1.1,
          tailAngle: ph + Math.PI - 1.4,
          fade: 0.92,
          ramp: jade,
          seed: 233,
          t: localT,
          flashHot: false
        });

        // Large, Bold Rotating Pixel-Art Horned Dwarven Forge-Anvil (`scale = 1.45`)!
        drawPixelHornedAnvil(pen, headX, 0, 1.45, ph, 1.0, false);

        // Front half of 2.5D Crucible Orbit Band
        drawTiltedOrbitBand(pen, headX, 0, 25, 0.42, 1.6, 0.96, band4, FRONT_HALF, true);

        // Supersonic Magma-Jade Bow-Shock Crescent ahead of Anvil (`x <= 29 <= 38`)
        for (let i = -12; i <= 12; i++) {
          const f = i / 12;
          const ang = f * 1.18;
          const env = Math.cos(f * Math.PI * 0.5);
          const bx = headX + Math.cos(ang) * 23;
          const by = Math.sin(ang) * 23;
          const col = Math.abs(i) < 4 ? PURE_WHITE : Math.abs(i) % 2 === 0 ? COL_JADE_BRIGHT : COL_FORGE_GOLD;
          pen.fillCircle(bx, by, 1.5 * env + 0.5, col, 0.96);
        }

        drawStarburstFlare(pen, headX + 3, 0, 9.5, 0.94, [magma[4], jade[5], magma[6], PURE_WHITE]);
      }
    };
  }
};

// 7. ROW 1: KHAZAD DWARVEN OCTAGONAL RAM-HORN, CROSSED TWIN-WARHAMMERS & DIAMOND ANVIL BOSS CREST (`runicBulwarkShieldCell` / `forgeRuneShieldCrestCell`)
export const runicBulwarkShieldCell = {
  duration: 1.0,
  loop: true,
  defaults: { palette: FORGE_GOLD_PALETTE, seed: 213 },
  create() {
    const magma = buildColorRamp(FORGE_GOLD_PALETTE, 8);
    const jade = buildColorRamp(FORGE_JADE_PALETTE, 8);
    const magmaBand = [magma[2], jade[4], magma[6], PURE_WHITE];

    function drawCrossedWarhammers(pen, pulse) {
      const len = 29 * pulse;
      for (const signX of [-1, 1]) {
        // Diagonal shaft from bottom-opposite `( -signX * 18, +19 )` to top-corner `( signX * 20, -20 )`
        const x0 = -signX * 18;
        const y0 = 19;
        const x1 = signX * 20;
        const y1 = -20;
        pen.line(x0, y0, x1, y1, COL_OBSIDIAN, 0.98);
        pen.line(x0 + signX, y0, x1 + signX, y1, COL_FORGE_GOLD, 0.96);
        drawHexForgeRivet(pen, x0, y0, 2.2, signX > 0, 0.96);

        // Beveled Pixel Warhammer Head at `(x1, y1)` (`[-34, +34]`)
        const hx = signX * (len * 0.72);
        const hy = -len * 0.72;
        pen.shadeBox(hx - 8, hy - 8, hx + 8, hy + 8, (lx, ly, out) => {
          const dx = lx - hx;
          const dy = ly - hy;
          // Rotate 45 deg aligned with shaft
          const ux = (dx * signX - dy) * 0.7071;
          const uy = (dx * signX + dy) * 0.7071;
          if (Math.abs(ux) > 6.8 || Math.abs(uy) > 4.2) return 0;
          out.alpha = 0.98;
          if (Math.abs(ux) >= 5.7 || Math.abs(uy) >= 3.2) return COL_OBSIDIAN;
          if (Math.abs(ux) + Math.abs(uy) < 2.6) {
            out.glowColor = COL_JADE_MID;
            out.glowStrength = 0.36;
            return COL_JADE_PALE;
          }
          if (Math.abs(ux) >= 4.4) return COL_FORGE_GOLD;
          return COL_MAGMA_MID;
        });
      }
    }

    return {
      step() {},
      renderBack(pen, localT) {
        const ph = localT * Math.PI * 2;
        const pulse = 0.94 + 0.06 * Math.sin(ph);

        drawDwarvenCrucibleGearRing(pen, 0, 0, 31 * pulse, 1.0, ph * 0.25, 0.88, null, false);
        drawCrossedWarhammers(pen, pulse);
        pen.radialGlow(0, 0, 30, magma[4], 0.36);
        pen.radialGlow(0, 0, 22, jade[4], 0.32);
      },
      renderFront(pen, localT) {
        const ph = localT * Math.PI * 2;
        const pulse = 0.94 + 0.06 * Math.sin(ph);
        const scale = pulse;

        // Sculpted Octagonal Khazad Shield + Curved Ram-Horns + Crossed Twin-Warhammers & Khazad Diamond Anvil Boss (`[-30, +30] x [-28, +28]`)
        pen.shadeBox(-30, -28, 30, 28, (lx, ly, out) => {
          const dx = lx;
          const dy = ly;
          const ax = Math.abs(dx);
          const ay = Math.abs(dy);

          // 1. Curved Segmented Dwarven Ram-Horns sweeping outward from top brow (`ly in [-22, -2], ax in [14, 28]`)
          const hornY = -12 + Math.pow((ax - 12) / 14, 1.6) * 11;
          const hornDist = Math.abs(dy - hornY);
          const hornThick = Math.max(0, 4.4 - (ax - 12) * 0.22);
          if (ax >= 12 && ax <= 27.5 && hornDist <= hornThick) {
            out.alpha = 0.98;
            if (hornDist >= hornThick - 1.05 || ax >= 26.5) return COL_OBSIDIAN;
            const seg = Math.floor(ax * 0.65) % 2 === 0;
            return seg ? COL_FORGE_GOLD : COL_MAGMA_MID;
          }

          // 2. Octagonal Khazad Bulwark Shield Plate
          const oct = Math.max(ax * 1.06, ay, (ax + ay) * 0.75);
          const maxOct = 22.5 * scale;
          if (oct > maxOct) return 0;

          out.alpha = 0.99;
          // 1px Dark Basalt-Obsidian Outer Silhouette (`Selout`)
          if (oct >= maxOct - 1.15) {
            return COL_OBSIDIAN;
          }

          // Bevelled Molten Bronze-Gold & Crimson-Orange Rim (`maxOct - 4.0 <= oct < maxOct - 1.15`)
          if (oct >= maxOct - 4.0) {
            out.glowColor = COL_MAGMA_BRIGHT;
            out.glowStrength = 0.26;
            return oct >= maxOct - 2.4 ? COL_FORGE_GOLD : COL_MAGMA_BRIGHT;
          }

          // 3. Central Stepped Khazad Diamond Anvil Boss (`|dx| + |dy| <= 11 * scale`) — ZERO vertical "I" bar!
          const diamond = ax + ay;
          const bossLimit = 11.0 * scale;
          if (diamond <= bossLimit) {
            if (diamond >= bossLimit - 1.2) return COL_OBSIDIAN;
            if (diamond >= bossLimit - 2.8) {
              out.glowColor = COL_MAGMA_BRIGHT;
              out.glowStrength = 0.34;
              return COL_FORGE_GOLD;
            }
            out.glowColor = COL_JADE_MID;
            out.glowStrength = 0.48;
            if (diamond <= 2.6 * scale) return PURE_WHITE;
            if (diamond <= 5.4 * scale) return COL_JADE_PALE;
            if (diamond <= 8.0 * scale) return COL_JADE_BRIGHT;
            return COL_JADE_MID;
          }

          // 4. Diagonal Crossed Twin-Warhammer Silhouettes at `±45°` across Shield Face
          for (const signX of [-1, 1]) {
            const ux = (dx * signX - dy) * 0.7071;
            const uy = (dx * signX + dy) * 0.7071;
            // Diagonal Hammer Head inside upper shield quadrant (`uy` in `[-14.5, -9.5]`, `|ux| <= 5.6`)
            if (uy >= -14.5 * scale && uy <= -9.2 * scale && Math.abs(ux) <= 5.6 * scale) {
              if (
                Math.abs(ux) >= 4.6 * scale ||
                uy <= -13.5 * scale ||
                uy >= -10.1 * scale
              ) {
                return COL_OBSIDIAN;
              }
              out.glowColor = COL_MAGMA_BRIGHT;
              out.glowStrength = 0.32;
              return Math.abs(ux) >= 3.2 * scale ? COL_FORGE_GOLD : COL_MAGMA_BRIGHT;
            }
            // Diagonal Hammer Shaft (`|ux| <= 1.8`, `uy` in `[-10, +13]`)
            if (Math.abs(ux) <= 1.85 * scale && Math.abs(uy) <= 13.5 * scale) {
              if (Math.abs(ux) >= 0.95 * scale) return COL_OBSIDIAN;
              return COL_FORGE_GOLD;
            }
          }

          return COL_BASALT;
        });

        drawTiltedOrbitBand(pen, 0, 0, 32 * pulse, 0.38, 1.6, 0.95, magmaBand, FRONT_HALF, true);

        // 4 Orbiting Cardinal Khazad Diamond Jade Runes (`r = 23`)
        for (let i = 0; i < 4; i++) {
          const a = ph + (i * Math.PI) / 2;
          drawKhazadDiamondRune(pen, Math.cos(a) * 23, Math.sin(a) * 23, 2.8, i % 2 === 0, 0.96);
        }

        drawStarburstFlare(pen, 0, 0, 8.5, 0.92, [magma[4], jade[5], magma[6], PURE_WHITE]);
      }
    };
  }
};

export const forgeRuneShieldCrestCell = runicBulwarkShieldCell;

// 8. ROW 2: 2.5D ERUPTING VOLCANIC CALDERA, FANNING DIAGONAL JADE-MAGMA FANG CROWN & DIAGONAL SWINGING GOD-MAUL ARC (`tectonicMagmaPillarCell`)
//    - Fits 100% inside the cell (`0/150` border clips) with a curved 2.5D elliptical lava-pool base,
//      diagonal erupting crystal/basalt fangs (`tiltX` fanning outward at `-18`, `-9`, `0`, `+9`, `+18`),
//      and a diagonal swinging God-Maul arc (zero vertical poles or flat-bottomed columns!).
export const tectonicMagmaPillarCell = {
  duration: 1.0,
  loop: false,
  defaults: { palette: FORGE_GOLD_PALETTE, seed: 227 },
  create(cfg) {
    const magma = buildColorRamp(FORGE_GOLD_PALETTE, 8);
    const jade = buildColorRamp(FORGE_JADE_PALETTE, 8);
    const band4 = [magma[2], jade[4], magma[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);

    // 5 Fanning Diagonal Jade-Magma Fangs (`tiltX` at `-18`, `-9`, `0`, `+9`, `+18`)
    const fangs = [
      { x: -12, h: 25, w: 4.8, tilt: -18, delay: 0.04, back: true, seed: 13 },
      { x: 12, h: 25, w: 4.8, tilt: 18, delay: 0.04, back: true, seed: 29 },
      { x: -7, h: 30, w: 5.4, tilt: -9, delay: 0.02, back: false, seed: 47 },
      { x: 7, h: 30, w: 5.4, tilt: 9, delay: 0.02, back: false, seed: 61 },
      { x: 0, h: 34, w: 6.2, tilt: 0, delay: 0.0, back: false, seed: 83 }
    ];

    function drawCalderaLavaPoolBase(pen, cx, cy, rx, ry, alpha) {
      if (alpha <= 0.02 || rx <= 2) return;
      const bx = Math.ceil(rx + 3);
      const by = Math.ceil(ry + 3);
      pen.shadeBox(cx - bx, cy - by, cx + bx, cy + by, (lx, ly, out) => {
        const dx = (lx - cx) / rx;
        const dy = (ly - cy) / ry;
        const r2 = dx * dx + dy * dy;
        if (r2 > 1.0) return 0;
        const r = Math.sqrt(r2);
        out.alpha = alpha;
        if (r >= 0.86) return COL_OBSIDIAN;
        if (r >= 0.68) return dy > 0 ? COL_BASALT : COL_MAGMA_DEEP;
        out.glowColor = r < 0.38 ? COL_JADE_MID : COL_MAGMA_BRIGHT;
        out.glowStrength = 0.38 * alpha;
        if (r < 0.24) return PURE_WHITE;
        if (r < 0.44) return COL_JADE_PALE;
        return r < 0.58 ? COL_FORGE_GOLD : COL_MAGMA_BRIGHT;
      });
    }

    return {
      step() {},
      renderBack(pen, localT) {
        const u = clamp01(localT);
        const baseY = 16;
        if (u <= 0.72) {
          const pop = smoothStep(0, 0.14, u);
          drawCalderaLavaPoolBase(pen, 0, baseY + 2, 27 * pop, 7.2 * pop, 0.96);
          drawDwarvenCrucibleGearRing(pen, 0, baseY, 27 * pop, 0.25, u * 2.5, 0.9, BACK_HALF, false);
          // Back-layer Vertical Crucible Gear Wheel + Left Diagonal God-Maul
          drawDwarvenCrucibleGearRing(pen, 0, 2, 20 * pop, 0.85, -u * 3.6, 0.84, null, true);
          const leftAngle = -1.18 + clamp01(u / 0.52) * 0.92;
          drawColossalDwarvenWarhammer(
            pen,
            -8 * pop,
            -4 + 5 * smoothStep(0.04, 0.36, u),
            0.76,
            clamp01(u / 0.68),
            (cfg.seed || 227) + 19,
            leftAngle,
            0.94,
            u >= 0.22 && u <= 0.52
          );
          pen.radialGlow(0, 0, 26 * pop, magma[5], 0.38);
        } else {
          const uShatter = clamp01((u - 0.72) / 0.28);
          const fade = 1 - smoothStep(0.45, 1.0, uShatter);
          pen.radialGlow(0, 0, 30 * fade, jade[5], 0.42 * fade);
          drawTiltedOrbitBand(pen, 0, 4, (16 + 16 * uShatter), 0.52, 1.6, 0.88 * fade, band4, BACK_HALF, false);
        }
      },
      renderFront(pen, localT) {
        const u = clamp01(localT);
        const baseY = 16;

        if (u <= 0.72) {
          // PHASE 1 (`F00..F21`): 2.5D World-Forge Horned Anvil Caldera + Twin Diagonal Pincer God-Maul Strike
          const pop = smoothStep(0, 0.14, u);

          // Central Horned Dwarven Forge-Anvil on the Caldera Altar (`y = 8`)
          drawPixelHornedAnvil(pen, 0, 8, 1.08 * pop, 0, 0.99, u >= 0.24 && u <= 0.58);

          // Right Diagonal Swinging Colossal God-Maul Arc (`scale = 0.84`, kept 100% inside `[-36, +36]`)
          const swingP = clamp01(u / 0.68);
          const rightAngle = 1.15 - clamp01(u / 0.56) * 0.94;
          const maulCx = 7 * pop;
          const maulCy = -2 + 6 * smoothStep(0.06, 0.42, u);
          drawColossalDwarvenWarhammer(
            pen,
            maulCx,
            maulCy,
            0.84,
            swingP,
            cfg.seed || 227,
            rightAngle,
            0.99,
            u >= 0.26 && u <= 0.56
          );

          // Diagonal Arcing Magma-Jade Lightning Bolt from Caldera Rim to Maul Head
          const bolt = buildLightningChain(rng, -22, baseY - 2, maulCx + 4, maulCy + 2, 0.18, 3);
          pen.polyline(bolt, COL_JADE_BRIGHT, 0.92);
          drawTiltedOrbitBand(pen, 0, baseY + 2, 27 * pop, 0.25, 1.8, 0.96, band4, FRONT_HALF, u > 0.28);
          drawStarburstFlare(pen, maulCx + 4, maulCy + 4, 10.0, 0.95, [magma[4], jade[5], magma[6], PURE_WHITE]);
        } else {
          // PHASE 2 (`F22..F29`): Explosive Magma-Jade Caldera Shatter (strictly bounded within `[-36, +36]`)
          const uShatter = clamp01((u - 0.72) / 0.28);
          const fade = 1 - smoothStep(0.5, 1.0, uShatter);
          if (fade <= 0.02) return;

          const numShards = 12;
          for (let i = 0; i < numShards; i++) {
            const ang = (i / numShards) * Math.PI * 2 + 0.25;
            const dist = 8 + uShatter * 24;
            const sx = Math.cos(ang) * dist;
            const sy = Math.sin(ang) * dist;
            const isJadeShard = i % 2 === 0;
            drawKhazadDiamondRune(pen, sx, sy, (4.0 - uShatter * 1.3), isJadeShard, fade * 0.98);
            pen.line(sx * 0.45, sy * 0.45, sx, sy, isJadeShard ? COL_JADE_BRIGHT : COL_FORGE_GOLD, fade * 0.9);
          }

          drawTiltedOrbitBand(pen, 0, 4, (16 + 16 * uShatter), 0.52, 1.8, 0.94 * fade, band4, FRONT_HALF, uShatter < 0.4);
          drawStarburstFlare(pen, 0, 0, 13 * (1 - uShatter * 0.5), fade * 0.96, [magma[4], jade[5], magma[6], PURE_WHITE]);
        }
      }
    };
  }
};

// 9. ROW 3: 8-COG INTERLOCKING DWARVEN WORLD-FORGE CRUCIBLE GEAR MANDALA & GLOWING HORNED ANVIL (`worldForgeAnvilSealCell`)
export const worldForgeAnvilSealCell = {
  duration: 1.0,
  loop: true,
  defaults: { palette: FORGE_GOLD_PALETTE, seed: 239 },
  create() {
    const magma = buildColorRamp(FORGE_GOLD_PALETTE, 8);
    const jade = buildColorRamp(FORGE_JADE_PALETTE, 8);
    const magmaBand = [magma[2], jade[4], magma[6], PURE_WHITE];
    const jadeBand = [jade[2], jade[4], jade[6], PURE_WHITE];

    return {
      step() {},
      renderBack(pen, localT) {
        const ph = localT * Math.PI * 2;
        // 1. Outer Rotating 8-Cog Dwarven World-Forge Crucible Gear Wheel (`r = 32`, strictly inside `[-38, +38]`)
        drawDwarvenCrucibleGearRing(pen, 0, 2, 31, 0.88, ph * 0.5, 0.94, null, false);
        // 2. Counter-Rotating Inner Emerald-Jade Crucible Gear Wheel (`r = 21`)
        drawDwarvenCrucibleGearRing(pen, 0, 2, 20, 0.88, -ph * 0.5, 0.9, null, true);

        // 8 Geometric Khazad Spoke Runes connecting inner and outer gears
        for (let i = 0; i < 8; i++) {
          const a = ph * 0.5 + (i * Math.PI) / 4;
          const x0 = Math.cos(a) * 12;
          const y0 = 2 + Math.sin(a) * 12 * 0.88;
          const x1 = Math.cos(a) * 29;
          const y1 = 2 + Math.sin(a) * 29 * 0.88;
          pen.line(x0, y0, x1, y1, i % 2 === 0 ? COL_JADE_BRIGHT : COL_FORGE_GOLD, 0.88);
        }

        pen.radialGlow(0, 0, 28, magma[5], 0.38);
        pen.radialGlow(0, 0, 20, jade[5], 0.34);
      },
      renderFront(pen, localT) {
        const ph = localT * Math.PI * 2;
        const bob = Math.sin(ph) * 1.6;

        // Central Glowing Horned Dwarven World-Forge Anvil (`drawPixelHornedAnvil`)
        drawPixelHornedAnvil(pen, 0, -2 + bob, 1.38, 0, 1.0, Math.sin(ph * 2) > 0.65);

        // Front 2.5D Tilted Magma & Jade Orbit Bands wrapping the Anvil Base
        drawTiltedOrbitBand(pen, 0, 14, 32, 0.25, 1.6, 0.96, magmaBand, FRONT_HALF, true);
        drawTiltedOrbitBand(pen, 0, 14, 22, 0.25, 1.4, 0.92, jadeBand, FRONT_HALF, false);

        // 4 Orbiting Khazad Diamond Jade Runes around the Crucible Mandala
        for (let i = 0; i < 4; i++) {
          const a = -ph + (i * Math.PI) / 2;
          drawKhazadDiamondRune(pen, Math.cos(a) * 27, 2 + Math.sin(a) * 27 * 0.88, 2.7, i % 2 === 0, 0.96);
        }

        drawStarburstFlare(pen, 0, -14 + bob, 9.5, 0.94, [magma[4], jade[5], magma[6], PURE_WHITE]);
      }
    };
  }
};

// 10. ROW 4: TECTONIC BASALT PLATE SPLIT & 8-SPOKE MAGMA-JADE STAR-CRATER NOVA (`cataclysmCraterNovaCell`)
//     - Jagged obsidian tectonic plates flying outward with an 8-pointed volcanic lava & emerald-jade starburst
export const cataclysmCraterNovaCell = {
  duration: 1.0,
  loop: false,
  defaults: { palette: FORGE_GOLD_PALETTE, seed: 251 },
  create(cfg) {
    const magma = buildColorRamp(FORGE_GOLD_PALETTE, 8);
    const jade = buildColorRamp(FORGE_JADE_PALETTE, 8);
    const band4 = [magma[2], jade[4], magma[6], PURE_WHITE];

    function drawTectonicBasaltPlate(pen, cx, cy, r, ang, isJadeVein, alpha) {
      if (alpha <= 0.02 || r <= 1.2) return;
      const cosA = Math.cos(ang);
      const sinA = Math.sin(ang);
      const b = Math.ceil(r + 2.5);
      pen.shadeBox(cx - b, cy - b, cx + b, cy + b, (lx, ly, out) => {
        const dx = lx - cx;
        const dy = ly - cy;
        const ux = dx * cosA + dy * sinA;
        const uy = -dx * sinA + dy * cosA;
        // Trapezoidal jagged tectonic basalt slab
        const maxU = r;
        const maxV = r * 0.72 - ux * 0.18;
        if (Math.abs(ux) > maxU || Math.abs(uy) > maxV) return 0;
        const distEdge = Math.min(maxU - Math.abs(ux), maxV - Math.abs(uy));
        out.alpha = alpha;
        if (distEdge < 1.1) return COL_OBSIDIAN;
        // Glowing Magma / Jade Fissure Vein across the tectonic slab
        if (Math.abs(ux * 0.4 + uy * 0.8) < 1.15) {
          out.glowColor = isJadeVein ? COL_JADE_MID : COL_MAGMA_BRIGHT;
          out.glowStrength = 0.36 * alpha;
          return isJadeVein ? COL_JADE_PALE : COL_FORGE_GOLD;
        }
        if (distEdge < 2.1) return isJadeVein ? COL_JADE_MID : COL_MAGMA_MID;
        return COL_BASALT;
      });
    }

    return {
      step() {},
      renderBack(pen, localT) {
        const u = clamp01(localT);
        const pop = 0.45 + 0.55 * smoothStep(0, 0.2, u);
        const fade = 1 - smoothStep(0.72, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;

        drawTiltedOrbitBand(pen, 0, 0, 31 * pop, 0.86, 1.6, 0.88 * env, band4, BACK_HALF, false);

        // 8-Spoke Magma-Jade Star-Crater Nova Spikes (`r <= 35`)
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4 + u * 0.35;
          const spikeLen = (i % 2 === 0 ? 34 : 30) * pop;
          const x1 = Math.cos(a) * spikeLen;
          const y1 = Math.sin(a) * spikeLen * 0.92;
          const colOuter = i % 2 === 0 ? COL_MAGMA_BRIGHT : COL_JADE_MID;
          const colCore = i % 2 === 0 ? COL_FORGE_GOLD : COL_JADE_PALE;
          pen.line(0, 0, x1, y1, COL_OBSIDIAN, env * 0.95);
          pen.line(0, 0, x1 * 0.92, y1 * 0.92, colOuter, env * 0.96);
          pen.line(0, 0, x1 * 0.68, y1 * 0.68, colCore, env);
        }
      },
      renderFront(pen, localT) {
        const u = clamp01(localT);
        const pop = 0.45 + 0.55 * smoothStep(0, 0.2, u);
        const fade = 1 - smoothStep(0.72, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;

        // 8 Jagged Obsidian Tectonic Plates Splitting & Flying Outward (`dist` in `[7, 25]`, max extent `<= 35`)
        const plateDist = 7 + 18 * smoothStep(0, 0.78, u);
        const plateR = 5.6 * (1 - 0.22 * u);
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4 + 0.39;
          const px = Math.cos(a) * plateDist;
          const py = Math.sin(a) * plateDist * 0.92;
          drawTectonicBasaltPlate(pen, px, py, plateR, a + u * 1.2, i % 2 === 1, env * 0.98);
        }

        // Dual Magma + Emerald-Jade Warhammer Crescent Shock-Wave
        drawMultiLayerCrescentArc(pen, {
          cx: -2,
          cy: 0,
          radius: 25 * pop,
          width: 9.0,
          eccentricity: 0.85,
          headAngle: 1.3,
          tailAngle: -1.3,
          fade: env,
          ramp: magma,
          seed: cfg.seed || 251,
          t: u,
          flashHot: u < 0.35
        });

        drawMultiLayerCrescentArc(pen, {
          cx: -3,
          cy: 0,
          radius: 19 * pop,
          width: 6.5,
          eccentricity: 0.85,
          headAngle: 1.15,
          tailAngle: -1.15,
          fade: env * 0.92,
          ramp: jade,
          seed: (cfg.seed || 251) + 31,
          t: u,
          flashHot: false
        });

        drawTiltedOrbitBand(pen, 0, 0, 31 * pop, 0.86, 1.7, 0.95 * env, band4, FRONT_HALF, u < 0.3);
        drawKhazadDiamondRune(pen, 0, 0, 6.2 * env, true, env * 0.98);
        drawStarburstFlare(pen, 0, 0, 12.5 * env, 0.96 * env, [magma[4], jade[5], magma[6], PURE_WHITE]);
      }
    };
  }
};

export const FORGE_EFFECT_REGISTRY = {
  forgeMagmaMantle,
  worldBreakerAnvilCleave,
  forgeHammerArc,
  moltenAnvilSparks,
  runicBulwarkDome,
  tectonicCraterShockwave,
  tectonicCraterSlam,
  colossalSkyAnvilDrop,
  ragnarokWorldForgeWave,
  moltenSlagBoulderCell,
  runicBulwarkShieldCell,
  forgeRuneShieldCrestCell,
  tectonicMagmaPillarCell,
  worldForgeAnvilSealCell,
  cataclysmCraterNovaCell
};

export const FORGE_SHADER_PACK = FORGE_EFFECT_REGISTRY;
export default FORGE_EFFECT_REGISTRY;
