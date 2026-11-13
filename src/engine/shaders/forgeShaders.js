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
 *   2. Offline 30fps `assets/sprites/titan_vfx.png` (`6240x1664`, 8 rows x 30 cols @ 208x208, 0/240 border clips)
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
} from '../ArcaneShaderFX.js?v=30fps90';

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
 * keeping the haft (`da` in `[-13*scale, +6.5*scale]`) at the inner grip and the symmetric
 * Double-Faced Mjolnir Anvil Head (`da` in `[+6.5*scale, +22.5*scale]`, `dp` in `[-16.5*scale, +16.5*scale]`)
 * at the outer swing radius — 100% upright and inside the bounding box!
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
  flashHot = false,
  swingDir = 1
) {
  if (alpha <= 0.02 || scale <= 0.15) return;

  const angle = swingAngle !== null ? swingAngle : -1.15 + Math.min(1, p * 1.45) * 1.35;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const dir = swingDir < 0 ? -1 : 1;

  const bound = Math.ceil(25.5 * scale + 3);

  pen.shadeBox(cx - bound, cy - bound, cx + bound, cy + bound, (lx, ly, out) => {
    const dx = lx - cx;
    const dy = ly - cy;
    // `da` runs from grip/pommel (`-da`) outward along the shaft (`cosA, sinA`) to the Mjolnir head (`+da`)!
    // `dp` runs perpendicular (`-sinA, cosA`) across the twin symmetric striking faces!
    const da = (dx * cosA + dy * sinA) / scale;
    const dp = (-dx * sinA + dy * cosA) / scale;
    const adp = Math.abs(dp);
    out.alpha = alpha;

    // 1. Inner Pommel Cap (`da` in `[-13.5, -9.5]`) & Reinforced Runic Haft (`da` in `[-9.5, +6.5]`)
    if (da >= -13.5 && da < 6.5) {
      if (da < -9.5) {
        const uPom = (da + 13.5) / 4.0;
        const pommelW = 2.6 + Math.sin(uPom * Math.PI) * 2.1;
        const crownCurve = -13.5 + (adp / 4.8) ** 2 * 1.2;
        if (adp > pommelW || da < crownCurve) return 0;
        if (adp >= pommelW - 0.95 || da <= crownCurve + 0.95) {
          return COL_OBSIDIAN;
        }
        if (adp + Math.abs(da + 11.5) <= 2.0) {
          out.glowColor = COL_JADE_MID;
          out.glowStrength = 0.42 * alpha;
          return adp < 0.8 ? PURE_WHITE : COL_JADE_PALE;
        }
        return da < -11.5 ? COL_FORGE_GOLD : COL_MAGMA_MID;
      }

      const collarFlare = da > 3.5 ? ((da - 3.5) / 3.0) * 1.6 : 0;
      const haftW = 2.6 + collarFlare;
      if (adp > haftW) return 0;
      if (adp >= haftW - 0.95) {
        return COL_OBSIDIAN;
      }
      const isGripRing = Math.abs(Math.sin(da * 0.95)) > 0.72 || da > 4.6;
      if (isGripRing) {
        out.glowColor = COL_MAGMA_MID;
        out.glowStrength = 0.24 * alpha;
        return adp < 0.9 ? PURE_WHITE : COL_FORGE_GOLD;
      }
      return adp < 0.85 ? COL_MAGMA_BRIGHT : COL_BASALT;
    }

    // 2. Top Crown Finial Spike (`da` in `[22.2, 24.8]`, `adp <= 3.8`)
    if (da > 22.2 && da <= 24.8) {
      const finW = 3.8 * (1 - (da - 22.2) / 2.6);
      if (adp > finW) return 0;
      if (adp >= finW - 0.9 || da >= 24.0) return COL_OBSIDIAN;
      return adp < 0.9 ? PURE_WHITE : COL_FORGE_GOLD;
    }

    // 3. Symmetric Double-Faced Volcanic Mjolnir Head (`da` in `[6.5, 22.5]`, `dp` in `[-16.5, +16.5]`)
    if (da < 6.5 || da > 22.5 || adp > 16.5) return 0;

    // Pinched anvil waist at `adp in [3.5, 8.5]`, flaring symmetrically to huge beveled faces at `adp in [8.5, 16.5]`
    const faceFlare = adp > 8.2 ? ((adp - 8.2) / 8.3) * 1.6 : adp < 3.6 ? (1 - adp / 3.6) * 1.0 : 0;
    const minDa = 7.9 - faceFlare;
    const maxDa = 21.1 + faceFlare;
    const daMid = 14.5;
    const chamfer =
      Math.max(0, adp - 13.8) +
      Math.max(0, da < daMid ? minDa + 2.2 - da : da - (maxDa - 2.2));
    if (da < minDa || da > maxDa || chamfer > 2.5) return 0;

    const distEdge = Math.min(16.5 - adp, da - minDa, maxDa - da, 2.5 - chamfer);
    if (distEdge < 1.05 / Math.max(0.65, scale)) {
      return COL_OBSIDIAN;
    }

    // Symmetric Corner Pyramid Studs on BOTH flared striking cheeks
    const studDp = Math.abs(adp - 12.8);
    const studDa = Math.min(Math.abs(da - 10.2), Math.abs(da - 18.8));
    if (studDp <= 1.5 && studDa <= 1.5) {
      out.glowColor = COL_FORGE_GOLD;
      out.glowStrength = 0.34 * alpha;
      return studDp + studDa < 1.2 ? PURE_WHITE : COL_FORGE_GOLD;
    }

    // Blazing Khazad Emerald-Jade & Molten-Gold Runes on Central Boss & Both Cheeks
    const centerRune = adp * 0.78 + Math.abs(da - daMid) * 0.92;
    const cheekRune = Math.abs(adp - 9.6) * 0.95 + Math.abs(da - daMid) * 1.02;
    if (centerRune <= 5.2 || cheekRune <= 3.8) {
      out.glowColor = COL_JADE_MID;
      out.glowStrength = 0.48 * alpha;
      if (centerRune <= 1.8 || cheekRune <= 1.4) return PURE_WHITE;
      if (centerRune <= 3.4 || cheekRune <= 2.5) return COL_JADE_PALE;
      return COL_JADE_MID;
    }

    // White-Hot / Molten-Gold Twin Striking Faces (`adp >= 14.2`) & Crown Edge
    if (adp >= 14.2 || da >= maxDa - 2.2) {
      out.glowColor = COL_MAGMA_BRIGHT;
      out.glowStrength = 0.44 * alpha;
      if (flashHot || (dp * dir > 0 && adp >= 15.0)) return PURE_WHITE;
      return adp >= 15.0 ? COL_FORGE_GOLD : COL_MAGMA_BRIGHT;
    }

    // Golden Khazad Fretwork & Bevel Framing
    if (distEdge < 2.1 || Math.abs(adp - 5.6) < 0.9 || Math.abs(da - daMid) < 0.85) {
      return da > daMid ? COL_FORGE_GOLD : COL_MAGMA_MID;
    }

    // Heavy Volcanic Basalt-Obsidian Armor Plate
    return dp * dir < 0 ? COL_MAGMA_DEEP : COL_BASALT;
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
        const isHorizBat = Boolean(cfg.horizontalBat);
        const flipSign = cfg.flipAngle || cfg.reverse ? -1 : 1;
        const ecc = isHorizBat ? 0.30 : 0.8;
        const headAng = isHorizBat
          ? -1.45 + 2.02 * smoothStep(0, 0.48, u)
          : flipSign * (-0.98 + 2.22 * smoothStep(0, 0.52, u));

        // Leading Warhammer Tip & Jagged Basalt Impact Shock-Cone (ZERO slash crescents!)
        const tipX = (isHorizBat ? -6 : -2) + Math.cos(headAng) * baseR;
        const tipY = Math.sin(headAng) * baseR * ecc;

        // Jagged Basalt & Jade Impact Shock-Cone spikes radiating ahead of hammer head
        const coneSpikes = cfg.isFinisher ? 5 : 3;
        for (let i = 0; i < coneSpikes; i++) {
          const sAng = (isHorizBat ? 0 : headAng) + (i - (coneSpikes - 1) * 0.5) * (isHorizBat ? 0.18 : 0.26);
          const sLen = (cfg.isFinisher ? 16 : 12) * fade;
          const x1 = tipX + Math.cos(sAng) * sLen;
          const y1 = tipY + Math.sin(sAng) * sLen * (isHorizBat ? 0.45 : 1.0);
          pen.line(tipX, tipY, x1, y1, COL_OBSIDIAN, fade * 0.95);
          pen.line(
            tipX,
            tipY,
            tipX + Math.cos(sAng) * sLen * 0.82,
            tipY + Math.sin(sAng) * sLen * 0.82 * (isHorizBat ? 0.45 : 1.0),
            i % 2 === 0 ? COL_JADE_BRIGHT : COL_FORGE_GOLD,
            fade
          );
        }

        // Flying Red-Hot Hexagonal Forge-Rivets
        for (let i = 0; i < rivets.length; i++) {
          const rv = rivets[i];
          const dist = 10 + rv.spd * u;
          const rx = Math.cos(rv.ang * flipSign) * dist;
          const ry = Math.sin(rv.ang * flipSign) * dist * (isHorizBat ? 0.28 : 0.78) + u * u * (isHorizBat ? 5 : 14);
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
    const soilDark = packHexColor('#362214');
    const soilMid = packHexColor('#5c3d26');
    const soilLight = packHexColor('#8c6240');
    const rockDark = packHexColor('#292524');
    const rockMid = packHexColor('#57534e');
    const rockLight = packHexColor('#a8a29e');
    const dustTan = packHexColor('#d6c2a5');
    const dustBand = [soilDark, soilMid, soilLight, dustTan];

    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({
      rng,
      sparkRamp: [dustTan, rockLight, soilLight, magma[6]],
      floorY: 4
    });

    // Parabolic flying rock boulders & heavy soil clods splashed outward from impact crater
    const debrisChunks = [
      { vx: -62, vy: -52, grav: 132, r: 4.2, isRock: true, back: true },
      { vx: -42, vy: -68, grav: 138, r: 3.6, isRock: false, back: true },
      { vx: 44, vy: -66, grav: 138, r: 3.8, isRock: false, back: true },
      { vx: 64, vy: -50, grav: 132, r: 4.4, isRock: true, back: true },
      { vx: -54, vy: -58, grav: 136, r: 4.6, isRock: false, back: false },
      { vx: -26, vy: -74, grav: 144, r: 5.0, isRock: true, back: false },
      { vx: 28, vy: -72, grav: 144, r: 4.8, isRock: true, back: false },
      { vx: 56, vy: -56, grav: 136, r: 4.5, isRock: false, back: false }
    ];

    function drawDebrisClod(pen, cx, cy, r, ang, isRock, alpha) {
      if (alpha <= 0.02 || r <= 1.0) return;
      const b = Math.ceil(r + 2);
      const ca = Math.cos(ang);
      const sa = Math.sin(ang);
      pen.shadeBox(cx - b, cy - b, cx + b, cy + b, (lx, ly, out) => {
        const dx = lx - cx;
        const dy = ly - cy;
        const ux = dx * ca + dy * sa;
        const uy = -dx * sa + dy * ca;
        const dist = Math.max(Math.abs(ux) * 0.92 + Math.abs(uy) * 0.55, Math.hypot(ux, uy * 1.12));
        if (dist > r) return 0;
        out.alpha = alpha;
        if (dist >= r - 1.05) return COL_OBSIDIAN;
        if (uy < -r * 0.25) return isRock ? rockLight : dustTan;
        if (ux > 0) return isRock ? rockMid : soilLight;
        return isRock ? rockDark : soilDark;
      });
    }

    let t = 0;
    let burstDone = false;

    return {
      step(dt) {
        if (!burstDone) {
          burstDone = true;
          for (let i = 0; i < 28; i++) {
            const rx = rng.between(-44, 44);
            motes.emit(
              'orb',
              rx * 0.5,
              -2,
              rx * 2.7,
              rng.between(-128, -44),
              rng.between(0.28, 0.58),
              i % 3 === 0 ? rockLight : i % 2 === 0 ? dustTan : soilLight,
              1.4,
              135
            );
          }
        }
        t += dt;
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 0.78);
        const pop = smoothStep(0, 0.16, u);
        const fade = 1 - Math.pow(u, 1.55);
        if (fade <= 0.02) return;

        drawTiltedOrbitBand(pen, 0, 2, 56 * pop, 0.20, 2.2, 0.88 * fade, dustBand, BACK_HALF, false);
        for (let i = 0; i < debrisChunks.length; i++) {
          const d = debrisChunks[i];
          if (!d.back) continue;
          const fx = d.vx * u;
          const fy = Math.min(2, -4 + d.vy * u + 0.5 * d.grav * u * u);
          drawDebrisClod(pen, fx, fy, d.r * (1 - 0.2 * u), u * 5.0 + i, d.isRock, fade * 0.95);
        }
      },
      renderFront(pen) {
        const u = clamp01(t / 0.78);
        const pop = smoothStep(0, 0.16, u);
        const fade = 1 - Math.pow(u, 1.55);
        if (fade <= 0.02) return;

        for (let i = 0; i < debrisChunks.length; i++) {
          const d = debrisChunks[i];
          if (d.back) continue;
          const fx = d.vx * u;
          const fy = Math.min(3, -4 + d.vy * u + 0.5 * d.grav * u * u);
          drawDebrisClod(pen, fx, fy, d.r * (1 - 0.2 * u), -u * 4.6 + i, d.isRock, fade * 0.98);
        }

        drawTiltedOrbitBand(pen, 0, 3, 56 * pop, 0.20, 2.4, 0.94 * fade, dustBand, FRONT_HALF, false);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// BAKED 30FPS `titan_vfx.png` 8-ROW SUITE (`6240x1664`, 8 rows x 30 cols @ `208x208`)
// Strictly bounded inside cell margins for `0/240` border clips!
//   Row 0 (`y=0`):    `tectonicMagmaWaveCell`       — Tectonic Magma & Jade-Rune Crescent Wave
//   Row 1 (`y=208`):  `runicIronForgeAnvilCell`     — Heavy Physical Runic Iron & Molten-Brass Forge-Anvil
//   Row 2 (`y=416`):  `tectonicMagmaPillarCell`     — Erupting Magma-Jade Rune Pillar & Caldera Crater
//   Row 3 (`y=624`):  `worldForgeAnvilSealCell`     — 8-Cog World-Forge Sovereign Crucible Seal
//   Row 4 (`y=832`):  `cataclysmCraterNovaCell`     — Molten Hammer Shock-Ring & Tectonic Plate Nova
//   Row 5 (`y=1040`): `worldForgeCrucibleAltarCell` — Native 208x208 Colossal World-Forge Crucible Anvil Altar
//   Row 6 (`y=1248`): `godHammerLightningStrikeCell`— Native 208x208 God-Hammer Lightning-Magma Strike Arc
//   Row 7 (`y=1456`): `continentalSunderGeyserCell` — Native 208x208 Continental Sunder Volcanic Rune Geyser
// ============================================================================

// 6. ROW 0: TECTONIC MAGMA WAVE (`tectonicMagmaWaveCell` / `moltenSlagBoulderCell`)
export const tectonicMagmaWaveCell = {
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
        const crestX = 8;

        // 2.5D Boiling Lava & Jade Slipstream Wake (`[-36, +12] x [-22, +24]`, tapered cleanly to 0 before x=-34)
        pen.shadeBox(-36, -22, crestX + 4, 24, (lx, ly, out) => {
          const tailU = (crestX - lx) / 41;
          if (tailU <= -0.08 || tailU >= 1.0) return 0;
          const clampedTail = clamp01(tailU);
          const tailTaper = Math.pow(1 - clampedTail, 1.15);
          const halfH = tailTaper * 19.5;
          if (halfH <= 0.8) return 0;
          const waveA = Math.sin(clampedTail * 7.5 - ph * 2) * 3.8 * clampedTail;
          const waveB = Math.cos(clampedTail * 7.5 - ph * 2) * 3.8 * clampedTail;
          const dMagma = Math.abs(ly - waveA);
          const dJade = Math.abs(ly - waveB);
          const dy = Math.min(dMagma, dJade);
          if (dy >= halfH) return 0;

          const n = fbmNoise2D(lx * 0.18 + ph * 1.4, ly * 0.2, cfg.seed || 201, 2);
          const heat = ((1 - dy / halfH) * 0.92 + n * 0.22) * tailTaper;
          if (heat <= 0.24) return 0;

          const isJadeVein = dJade < dMagma && clampedTail > 0.14;
          const idx = Math.min(7, Math.max(1, Math.floor(heat * 7.8)));
          out.alpha = clamp01(heat * 1.35);
          if (dy >= halfH - 1.15) return COL_OBSIDIAN;
          out.glowColor = isJadeVein ? jade[5] : magma[5];
          out.glowStrength = 0.28 * tailTaper;
          return isJadeVein ? jade[Math.min(6, idx + 1)] : magma[idx];
        });

        drawTiltedOrbitBand(pen, 2, 16, 26, 0.24, 1.5, 0.88, band4, BACK_HALF, false);

        // Tumbling Basalt-Rivet Debris in the Wake
        for (let i = 0; i < 4; i++) {
          const uRv = (localT * 2 + i * 0.25) % 1;
          const rx = crestX - 6 - uRv * 26;
          const ry = Math.sin(uRv * 6.5 + i * 1.7) * 10;
          drawHexForgeRivet(pen, rx, ry, 2.1 * (1 - uRv * 0.3), i % 2 === 0, 0.95);
        }
      },
      renderFront(pen, localT) {
        const ph = localT * Math.PI * 2;
        const bob = Math.sin(ph) * 2.0;

        // Grounded 3-Crag Volcanic Basalt & Molten Magma Earth-Spire Wave (`[-24, +24] x [-20, +18]`, ZERO slash crescent!)
        const crags = [
          { cx: -12, baseY: 16, h: 20 + bob * 0.6, hw: 7.0, tilt: 0.22 },
          { cx: 1, baseY: 16, h: 28 - bob * 0.8, hw: 8.5, tilt: 0.28 },
          { cx: 14, baseY: 16, h: 33 + bob, hw: 9.2, tilt: 0.34 }
        ];
        for (let ci = 0; ci < crags.length; ci++) {
          const cr = crags[ci];
          pen.shadeBox(cr.cx - 12, cr.baseY - cr.h - 2, cr.cx + 16, cr.baseY + 2, (lx, ly, out) => {
            if (ly > cr.baseY || ly < cr.baseY - cr.h) return 0;
            const v = (cr.baseY - ly) / cr.h; // 0 at floor, 1 at crag tip
            const centerShift = v * cr.h * cr.tilt;
            const dx = lx - (cr.cx + centerShift);
            const w = cr.hw * Math.pow(1 - v, 0.72);
            if (Math.abs(dx) > w) return 0;
            out.alpha = 0.98;
            if (Math.abs(dx) >= w - 1.15 || v > 0.93) return COL_OBSIDIAN;
            if (Math.abs(dx - 0.8) < 1.3 && v > 0.18 && v < 0.82) {
              out.glowColor = COL_MAGMA_BRIGHT;
              out.glowStrength = 0.35;
              return v > 0.55 ? PURE_WHITE : COL_FORGE_GOLD;
            }
            return dx > 0 ? COL_MAGMA_MID : COL_BASALT;
          });
        }

        drawKhazadDiamondRune(pen, 16, 2, 3.4, false, 0.96);
        drawTiltedOrbitBand(pen, 2, 16, 26, 0.24, 1.7, 0.95, band4, FRONT_HALF, true);
        drawStarburstFlare(pen, 18, 4, 7.5, 0.92, [magma[4], magma[6], PURE_WHITE]);
      }
    };
  }
};

export const moltenSlagBoulderCell = tectonicMagmaWaveCell;

// 7. ROW 1: HEAVY PHYSICAL RUNIC IRON FORGE-ANVIL (`runicIronForgeAnvilCell`)
export const runicIronForgeAnvilCell = {
  duration: 1.0,
  loop: true,
  defaults: { palette: FORGE_GOLD_PALETTE, seed: 213 },
  create() {
    const magma = buildColorRamp(FORGE_GOLD_PALETTE, 8);
    const jade = buildColorRamp(FORGE_JADE_PALETTE, 8);
    const band4 = [magma[2], jade[4], magma[6], PURE_WHITE];

    return {
      step() {},
      renderBack(pen, localT) {
        const ph = localT * Math.PI * 2;
        const pulse = 0.95 + 0.05 * Math.sin(ph * 2);

        // 2.5D Molten Crucible Base Ring & Back Gear Aura (`rx <= 28`)
        drawDwarvenCrucibleGearRing(pen, 0, 15, 26 * pulse, 0.28, ph * 0.5, 0.9, BACK_HALF, false);
        drawTiltedOrbitBand(pen, 0, 15, 19 * pulse, 0.28, 1.5, 0.88, band4, BACK_HALF, false);
        pen.radialGlow(0, 2, 24, magma[5], 0.34);
        pen.radialGlow(0, -2, 18, jade[5], 0.28);
      },
      renderFront(pen, localT) {
        const ph = localT * Math.PI * 2;
        const bob = Math.sin(ph) * 1.2;
        const rock = Math.sin(ph) * 0.06;

        // Heavy Physical Runic Iron & Molten-Brass Horned Dwarven Forge-Anvil (`scale = 1.62`, bounded inside `[-33, +34]`)
        drawPixelHornedAnvil(pen, -1, 1 + bob, 1.62, rock, 1.0, Math.sin(ph * 2) > 0.55);

        // Flanking Carved Amber-Gold & Jade Runes on Anvil Heel & Horn
        drawKhazadDiamondRune(pen, -13, -7 + bob, 2.6, false, 0.96);
        drawKhazadDiamondRune(pen, 14, -7 + bob, 2.6, true, 0.96);

        // Rising Red-Hot Hexagonal Forge Sparks off the Tempering Face
        for (let i = 0; i < 4; i++) {
          const uSp = (localT * 2 + i * 0.25) % 1;
          const sx = -10 + i * 7 + Math.sin(ph + i) * 2.5;
          const sy = -14 + bob - uSp * 16;
          drawHexForgeRivet(pen, sx, sy, 1.8 * (1 - uSp * 0.45), i % 2 === 1, 0.94 * (1 - uSp * 0.35));
        }

        // Front 2.5D Crucible Base Ring
        drawDwarvenCrucibleGearRing(pen, 0, 16, 26, 0.28, ph * 0.5, 0.95, FRONT_HALF, false);
        drawTiltedOrbitBand(pen, 0, 16, 19, 0.28, 1.7, 0.96, band4, FRONT_HALF, true);
        drawStarburstFlare(pen, 0, -13 + bob, 8.0, 0.92, [magma[4], jade[5], magma[6], PURE_WHITE]);
      }
    };
  }
};

// Keep `runicBulwarkShieldCell` / `forgeRuneShieldCrestCell` registered for any shield/crest callers
export const runicBulwarkShieldCell = {
  duration: 1.0,
  loop: true,
  defaults: { palette: FORGE_GOLD_PALETTE, seed: 217 },
  create() {
    const magma = buildColorRamp(FORGE_GOLD_PALETTE, 8);
    const jade = buildColorRamp(FORGE_JADE_PALETTE, 8);
    const magmaBand = [magma[2], jade[4], magma[6], PURE_WHITE];
    return {
      step() {},
      renderBack(pen, localT) {
        const ph = localT * Math.PI * 2;
        drawDwarvenCrucibleGearRing(pen, 0, 0, 29, 1.0, ph * 0.25, 0.88, null, false);
        pen.radialGlow(0, 0, 26, magma[4], 0.32);
      },
      renderFront(pen, localT) {
        const ph = localT * Math.PI * 2;
        const scale = 0.95 + 0.05 * Math.sin(ph);
        pen.shadeBox(-28, -26, 28, 26, (lx, ly, out) => {
          const ax = Math.abs(lx);
          const ay = Math.abs(ly);
          const oct = Math.max(ax * 1.06, ay, (ax + ay) * 0.75);
          const maxOct = 22.0 * scale;
          if (oct > maxOct) return 0;
          out.alpha = 0.99;
          if (oct >= maxOct - 1.15) return COL_OBSIDIAN;
          if (oct >= maxOct - 3.8) return oct >= maxOct - 2.3 ? COL_FORGE_GOLD : COL_MAGMA_BRIGHT;
          const diamond = ax + ay;
          if (diamond <= 10.5 * scale) {
            if (diamond >= 9.3 * scale) return COL_OBSIDIAN;
            if (diamond >= 7.8 * scale) return COL_FORGE_GOLD;
            out.glowColor = COL_JADE_MID;
            out.glowStrength = 0.44;
            return diamond <= 2.5 * scale ? PURE_WHITE : diamond <= 5.5 * scale ? COL_JADE_PALE : COL_JADE_MID;
          }
          return COL_BASALT;
        });
        drawTiltedOrbitBand(pen, 0, 0, 30 * scale, 0.38, 1.5, 0.94, magmaBand, FRONT_HALF, true);
      }
    };
  }
};

export const forgeRuneShieldCrestCell = runicBulwarkShieldCell;

// 8. ROW 2: ERUPTING MAGMA-JADE RUNE PILLAR (`tectonicMagmaPillarCell`)
//    - F00..F05: Violent Caldera Eruption upward from curved 2.5D lava-crater base
//    - F06..F21: Towering Faceted Volcanic Basalt + Molten Magma + Emerald-Jade Rune Obelisk Pillar
//    - F22..F29: Explosive Magma-Jade Rune Shatter (`0` border clips!)
export const tectonicMagmaPillarCell = {
  duration: 1.0,
  loop: false,
  defaults: { palette: FORGE_GOLD_PALETTE, seed: 227 },
  create(cfg) {
    const magma = buildColorRamp(FORGE_GOLD_PALETTE, 8);
    const jade = buildColorRamp(FORGE_JADE_PALETTE, 8);
    const band4 = [magma[2], jade[4], magma[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed || 227);

    function drawCalderaLavaPoolBase(pen, cx, cy, rx, ry, alpha) {
      if (alpha <= 0.02 || rx <= 2) return;
      const bx = Math.ceil(rx + 2);
      const by = Math.ceil(ry + 2);
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
        out.glowStrength = 0.36 * alpha;
        if (r < 0.24) return PURE_WHITE;
        if (r < 0.44) return COL_JADE_PALE;
        return r < 0.58 ? COL_FORGE_GOLD : COL_MAGMA_BRIGHT;
      });
    }

    return {
      step() {},
      renderBack(pen, localT) {
        const u = clamp01(localT);
        const baseY = 26;
        if (u <= 0.74) {
          const pop = 0.28 + 0.72 * smoothStep(0, 0.18, u);
          drawCalderaLavaPoolBase(pen, 0, baseY + 2, 27 * pop, 6.8 * pop, 0.96);
          drawDwarvenCrucibleGearRing(pen, 0, baseY, 26 * pop, 0.24, u * 2.6, 0.9, BACK_HALF, false);
          // Flanking angled volcanic basalt-jade fangs behind main rune pillar
          drawVolcanicBasaltJadeSpire(pen, -11, baseY, 36, 5.4, -10, 17, pop, 0.95);
          drawVolcanicBasaltJadeSpire(pen, 11, baseY, 36, 5.4, 10, 31, pop, 0.95);
          pen.radialGlow(0, -4, 24 * pop, magma[5], 0.36);
        } else {
          const uShatter = clamp01((u - 0.74) / 0.26);
          const fade = 1 - 0.78 * smoothStep(0.45, 1.0, uShatter);
          pen.radialGlow(0, -4, 26 * fade, jade[5], 0.38 * fade);
          drawTiltedOrbitBand(pen, 0, 10, 16 + 14 * uShatter, 0.44, 1.5, 0.88 * fade, band4, BACK_HALF, false);
        }
      },
      renderFront(pen, localT) {
        const u = clamp01(localT);
        const baseY = 26;

        if (u <= 0.74) {
          const pop = 0.28 + 0.72 * smoothStep(0, 0.16, u);
          // Central Towering Magma-Jade Rune Obelisk Pillar (`baseY = 26` up to `y = -38`, `height = 64`)
          drawVolcanicBasaltJadeSpire(pen, 0, baseY + 1, 63, 10.5, 0, 53, pop, 0.99);
          // Secondary mid-flank spires
          drawVolcanicBasaltJadeSpire(pen, -7, baseY + 2, 46, 6.4, -5, 71, pop, 0.97);
          drawVolcanicBasaltJadeSpire(pen, 7, baseY + 2, 46, 6.4, 5, 89, pop, 0.97);

          // Glowing Carved Khazad Elder Runes ascending the central Magma-Jade Pillar
          if (pop > 0.45) {
            drawKhazadDiamondRune(pen, 0, baseY - 14 * pop, 3.4, false, 0.98);
            drawKhazadDiamondRune(pen, 0, baseY - 30 * pop, 3.8, true, 0.98);
            drawKhazadDiamondRune(pen, 0, baseY - 46 * pop, 3.0, false, 0.96);
          }

          // Spiraling Magma & Jade Energy Bands wrapping the Rune Pillar
          drawTiltedOrbitBand(pen, 0, baseY - 18 * pop, 15 * pop, 0.28, 1.6, 0.94, band4, FRONT_HALF, true);
          drawTiltedOrbitBand(pen, 0, baseY + 2, 26 * pop, 0.24, 1.8, 0.96, band4, FRONT_HALF, u < 0.35);

          // Volcanic Lightning Arc along the Pillar
          const bolt = buildLightningChain(rng, -14 * pop, baseY - 4, 2, baseY - 52 * pop, 0.18, 3);
          pen.polyline(bolt, COL_JADE_BRIGHT, 0.9);
          drawStarburstFlare(pen, 0, baseY - 52 * pop, 8.5 * pop, 0.94, [magma[4], jade[5], magma[6], PURE_WHITE]);
        } else {
          // Explosive Magma-Jade Rune Pillar Shatter (`F22..F29`)
          const uShatter = clamp01((u - 0.74) / 0.26);
          const fade = 1 - smoothStep(0.5, 1.0, uShatter);
          if (fade <= 0.02) return;

          const numShards = 12;
          for (let i = 0; i < numShards; i++) {
            const ang = (i / numShards) * Math.PI * 2 + 0.25;
            const dist = 8 + uShatter * 22;
            const sx = Math.cos(ang) * dist;
            const sy = -4 + Math.sin(ang) * dist;
            const isJadeShard = i % 2 === 0;
            drawKhazadDiamondRune(pen, sx, sy, 3.8 - uShatter * 1.2, isJadeShard, fade * 0.98);
            pen.line(sx * 0.45, sy * 0.45, sx, sy, isJadeShard ? COL_JADE_BRIGHT : COL_FORGE_GOLD, fade * 0.9);
          }
          drawTiltedOrbitBand(pen, 0, 10, 16 + 14 * uShatter, 0.44, 1.7, 0.94 * fade, band4, FRONT_HALF, uShatter < 0.4);
          drawStarburstFlare(pen, 0, -4, 12 * (1 - uShatter * 0.5), fade * 0.96, [magma[4], jade[5], magma[6], PURE_WHITE]);
        }
      }
    };
  }
};

// 9. ROW 3: WORLD-FORGE SOVEREIGN SEAL (`worldForgeAnvilSealCell`)
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
        drawDwarvenCrucibleGearRing(pen, 0, 2, 30, 0.88, ph * 0.5, 0.94, null, false);
        drawDwarvenCrucibleGearRing(pen, 0, 2, 19.5, 0.88, -ph * 0.5, 0.9, null, true);

        for (let i = 0; i < 8; i++) {
          const a = ph * 0.5 + (i * Math.PI) / 4;
          const x0 = Math.cos(a) * 11;
          const y0 = 2 + Math.sin(a) * 11 * 0.88;
          const x1 = Math.cos(a) * 28;
          const y1 = 2 + Math.sin(a) * 28 * 0.88;
          pen.line(x0, y0, x1, y1, i % 2 === 0 ? COL_JADE_BRIGHT : COL_FORGE_GOLD, 0.88);
        }

        pen.radialGlow(0, 0, 26, magma[5], 0.36);
        pen.radialGlow(0, 0, 18, jade[5], 0.32);
      },
      renderFront(pen, localT) {
        const ph = localT * Math.PI * 2;
        const bob = Math.sin(ph) * 1.4;

        drawPixelHornedAnvil(pen, 0, -2 + bob, 1.34, 0, 1.0, Math.sin(ph * 2) > 0.65);
        drawTiltedOrbitBand(pen, 0, 14, 30, 0.25, 1.6, 0.96, magmaBand, FRONT_HALF, true);
        drawTiltedOrbitBand(pen, 0, 14, 21, 0.25, 1.4, 0.92, jadeBand, FRONT_HALF, false);

        for (let i = 0; i < 4; i++) {
          const a = -ph + (i * Math.PI) / 2;
          drawKhazadDiamondRune(pen, Math.cos(a) * 26, 2 + Math.sin(a) * 26 * 0.88, 2.7, i % 2 === 0, 0.96);
        }

        drawStarburstFlare(pen, 0, -13 + bob, 8.5, 0.94, [magma[4], jade[5], magma[6], PURE_WHITE]);
      }
    };
  }
};

// 10. ROW 4: MOLTEN HAMMER SHOCK-RING (`cataclysmCraterNovaCell`)
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
        const maxU = r;
        const maxV = r * 0.72 - ux * 0.18;
        if (Math.abs(ux) > maxU || Math.abs(uy) > maxV) return 0;
        const distEdge = Math.min(maxU - Math.abs(ux), maxV - Math.abs(uy));
        out.alpha = alpha;
        if (distEdge < 1.1) return COL_OBSIDIAN;
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

        drawTiltedOrbitBand(pen, 0, 0, 30 * pop, 0.84, 1.6, 0.88 * env, band4, BACK_HALF, false);

        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4 + u * 0.35;
          const spikeLen = (i % 2 === 0 ? 33 : 29) * pop;
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

        const plateDist = 7 + 17.5 * smoothStep(0, 0.78, u);
        const plateR = 5.4 * (1 - 0.22 * u);
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4 + 0.39;
          const px = Math.cos(a) * plateDist;
          const py = Math.sin(a) * plateDist * 0.92;
          drawTectonicBasaltPlate(pen, px, py, plateR, a + u * 1.2, i % 2 === 1, env * 0.98);
        }

        drawTiltedOrbitBand(pen, 0, 0, 30 * pop, 0.84, 1.7, 0.95 * env, band4, FRONT_HALF, u < 0.3);
        drawKhazadDiamondRune(pen, 0, 0, 6.0 * env, true, env * 0.98);
        drawStarburstFlare(pen, 0, 0, 12.0 * env, 0.96 * env, [magma[4], jade[5], magma[6], PURE_WHITE]);
      }
    };
  }
};

// ============================================================================
// 11. ROW 5 (NATIVE 208x208): COLOSSAL WORLD-FORGE CRUCIBLE ANVIL ALTAR (`worldForgeCrucibleAltarCell`)
//     - Giant glowing Runic World-Forge Crucible Anvil Altar (`208x208` centered at `(104, 104)`)
//     - Stepped obsidian-brass furnace pedestal + roaring amber-jade forge flames + interlocking crucible gears!
// ============================================================================
export const worldForgeCrucibleAltarCell = {
  duration: 1.0,
  loop: true,
  defaults: { palette: FORGE_GOLD_PALETTE, seed: 307 },
  create(cfg) {
    const magma = buildColorRamp(FORGE_GOLD_PALETTE, 8);
    const jade = buildColorRamp(FORGE_JADE_PALETTE, 8);
    const magmaBand = [magma[2], magma[4], magma[6], PURE_WHITE];
    const jadeBand = [jade[2], jade[4], jade[6], PURE_WHITE];

    return {
      step() {},
      renderBack(pen, localT) {
        const ph = localT * Math.PI * 2;
        const pulse = 0.96 + 0.04 * Math.sin(ph * 2);

        // 1. Back 2.5D Interlocking World-Forge Crucible Gear Mandala at Altar Base (`y = 48`)
        drawDwarvenCrucibleGearRing(pen, 0, 48, 66 * pulse, 0.24, ph * 0.5, 0.94, BACK_HALF, false);
        drawDwarvenCrucibleGearRing(pen, 0, 48, 46 * pulse, 0.24, -ph * 0.5, 0.9, BACK_HALF, true);

        // Vertical Crucible Escapement Wheel behind the Anvil Chest
        drawDwarvenCrucibleGearRing(pen, 0, 4, 44 * pulse, 0.88, -ph * 0.5, 0.86, null, true);

        // 2. Roaring Stepped Amber-Gold & Emerald-Jade Forge Flames rising around the Crucible (`[-72, +72] x [-88, +48]`)
        pen.shadeBox(-72, -88, 72, 48, (lx, ly, out) => {
          const botCurve = 38 + Math.sqrt(Math.max(0, 1 - (lx / 64) ** 2)) * 8.5;
          if (ly > botCurve) return 0;
          const hFrac = clamp01((48 - ly) / 130);
          if (hFrac >= 0.98) return 0;
          const botFade = clamp01((botCurve - ly) / 6.5);
          const tongue = Math.sin(lx * 0.19 + ph * 2) * 0.13 + Math.cos(lx * 0.31 - ph) * 0.09;
          const topTipTaper = hFrac > 0.62 ? Math.max(0, 1 - ((hFrac - 0.62) / 0.36) ** 1.35) : 1.0;
          const maxW = (62 * (1 - hFrac * 0.42) + Math.sin(hFrac * 9 - ph * 2) * 6) * (0.35 + 0.65 * topTipTaper);
          const ax = Math.abs(lx);
          if (ax > maxW) return 0;

          const n = fbmNoise2D(lx * 0.09, ly * 0.09 + localT * 3.0, cfg.seed || 307, 3);
          const heat = ((1 - ax / Math.max(1, maxW)) * 0.92 + n * 0.34 + tongue) * topTipTaper * (0.35 + 0.65 * botFade);
          if (heat <= 0.30) return 0;

          const isJadeFlame = Math.sin(lx * 0.16 + hFrac * 6 - ph) > 0.18;
          const idx = Math.min(7, Math.max(3, Math.floor(heat * 8.2)));
          out.alpha = clamp01((heat - 0.24) * 1.9) * botFade;
          if (heat <= 0.36) return COL_OBSIDIAN;
          out.glowColor = isJadeFlame ? jade[5] : magma[5];
          out.glowStrength = 0.34 * topTipTaper * botFade;
          return isJadeFlame ? jade[Math.min(6, idx)] : magma[idx];
        });

        pen.radialGlow(0, 6, 56, magma[5], 0.38);
        pen.radialGlow(0, -12, 44, jade[5], 0.34);
      },
      renderFront(pen, localT) {
        const ph = localT * Math.PI * 2;
        const bob = Math.sin(ph) * 1.5;

        // 1. Stepped Obsidian & Molten-Brass Crucible Furnace Altar Pedestal (`y in [+28, +58]`, `x in [-56, +56]`)
        pen.shadeBox(-58, 26, 58, 60, (lx, ly, out) => {
          const dy = ly - 26;
          const stepW = dy < 10 ? 40 : dy < 22 ? 48 : 55;
          const ax = Math.abs(lx);
          // Curved 2.5D bottom altar apron so it sits naturally on any floor
          const botCurve = 53 + Math.round(Math.sqrt(Math.max(0, 1 - (lx / 56) ** 2)) * 5);
          if (ax > stepW || ly > botCurve) return 0;

          out.alpha = 0.99;
          if (ax >= stepW - 1.5 || ly >= botCurve - 1.5 || Math.abs(dy - 10) < 1.1 || Math.abs(dy - 22) < 1.1) {
            return COL_OBSIDIAN;
          }
          // Glowing Crucible Furnace Vent Slots (`dy in [13, 19]`)
          if (dy >= 13 && dy <= 19 && Math.abs((ax % 14) - 6) < 3.4 && ax < 40) {
            const isJadeVent = Math.floor(ax / 14) % 2 === 1;
            out.glowColor = isJadeVent ? COL_JADE_BRIGHT : COL_MAGMA_BRIGHT;
            out.glowStrength = 0.42;
            return dy >= 15 && dy <= 17 ? PURE_WHITE : isJadeVent ? COL_JADE_PALE : COL_FORGE_GOLD;
          }
          if (ax >= stepW - 3.6 || dy < 3) {
            return COL_FORGE_GOLD;
          }
          return dy % 6 < 2 ? COL_MAGMA_DEEP : COL_BASALT;
        });

        // 2. Colossal Horned World-Forge Crucible Anvil (`scale = 3.15`, `x in [-48, +60]`, `y in [-38, +32]`)
        drawPixelHornedAnvil(pen, -3, -2 + bob, 3.15, 0, 1.0, Math.sin(ph * 2) > 0.45);

        // 3. Carved Elder Khazad flanking runes on the Colossal Anvil Shoulders & Pedestal
        drawKhazadDiamondRune(pen, -24, -18 + bob, 5.2, false, 0.98);
        drawKhazadDiamondRune(pen, 26, -18 + bob, 5.2, true, 0.98);
        drawKhazadDiamondRune(pen, 0, 40, 6.2, true, 0.98);

        // 4. Orbiting Forge Sparks & Hexagonal Rivets rising around the Crucible Altar
        for (let i = 0; i < 6; i++) {
          const uSp = (localT * 2 + i / 6) % 1;
          const ang = ph + (i * Math.PI) / 3;
          const sx = Math.cos(ang) * (36 + uSp * 18);
          const sy = 14 - uSp * 58;
          drawHexForgeRivet(pen, sx, sy, 2.6 * (1 - uSp * 0.4), i % 2 === 0, 0.95 * (1 - uSp * 0.3));
        }

        // 5. Front 2.5D Crucible Gear & Flame Orbit Bands wrapping the Altar Base (`max x <= 74, max y <= 68`)
        drawDwarvenCrucibleGearRing(pen, 0, 50, 66, 0.24, ph * 0.5, 0.97, FRONT_HALF, false);
        drawTiltedOrbitBand(pen, 0, 50, 56, 0.24, 2.4, 0.98, magmaBand, FRONT_HALF, true);
        drawTiltedOrbitBand(pen, 0, 50, 42, 0.24, 2.0, 0.95, jadeBand, FRONT_HALF, false);

        drawStarburstFlare(pen, 0, -32 + bob, 16, 0.95, [magma[4], jade[5], magma[6], PURE_WHITE]);
      }
    };
  }
};

// ============================================================================
// 12. ROW 6 (NATIVE 208x208): GOD-HAMMER LIGHTNING-MAGMA STRIKE ARC (`godHammerLightningStrikeCell`)
//     - Colossal overhead golden-jade God-Hammer Mjolnir cleave, forked forge-lightning & anvil sparks!
// ============================================================================
export const godHammerLightningStrikeCell = {
  duration: 1.0,
  loop: false,
  defaults: { palette: FORGE_GOLD_PALETTE, seed: 331 },
  create(cfg) {
    const magma = buildColorRamp(FORGE_GOLD_PALETTE, 8);
    const jade = buildColorRamp(FORGE_JADE_PALETTE, 8);
    const band4 = [magma[2], jade[4], magma[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed || 331);

    return {
      step() {},
      renderBack(pen, localT) {
        const u = clamp01(localT);
        const fade = 1 - smoothStep(0.76, 1.0, u);
        if (fade <= 0.02) return;
        const pop = smoothStep(0, 0.22, u);

        // Colossal 2.5D Impact Shock-Ring at bottom strike zone (`y = +42`)
        drawTiltedOrbitBand(pen, 4, 42, (34 + 34 * pop), 0.26, 2.2, 0.9 * fade, band4, BACK_HALF, false);
        pen.radialGlow(8, 2, 56 * fade, magma[5], 0.38 * fade);
        pen.radialGlow(14, -8, 42 * fade, jade[5], 0.32 * fade);
      },
      renderFront(pen, localT) {
        const u = clamp01(localT);
        const fade = 1 - smoothStep(0.76, 1.0, u);
        if (fade <= 0.02) return;

        // Overhead God-Hammer Swing Trajectory (`-1.32 rad` high windup -> `+0.26 rad` crushing anvil strike)
        const swingP = smoothStep(0, 0.52, u);
        const hammerAng = -1.32 + swingP * 1.58;

        // Colossal Rune-Engraved God-Hammer Mjolnir (`scale = 1.92`, bounded strictly inside `[-82, +82]`)
        const maulCx = -4 + Math.cos(hammerAng) * 14;
        const maulCy = -6 + Math.sin(hammerAng) * 14;
        drawColossalDwarvenWarhammer(
          pen,
          maulCx,
          maulCy,
          1.92,
          swingP,
          cfg.seed || 331,
          hammerAng,
          fade * 0.99,
          u >= 0.24 && u <= 0.62
        );

        // 3. Forked Lightning-Magma & Emerald-Jade Bolts crackling off the God-Hammer Head
        const tipX = -6 + Math.cos(hammerAng) * 56;
        const tipY = 2 + Math.sin(hammerAng) * 48;
        if (u >= 0.08 && u <= 0.86) {
          const boltGold = buildLightningChain(rng, -38, -58, tipX, tipY, 0.22, 4);
          const boltJade = buildLightningChain(rng, 22, -64, tipX - 6, tipY + 4, 0.22, 4);
          pen.polyline(boltGold, COL_FORGE_GOLD, fade * 0.96);
          pen.polyline(boltGold, PURE_WHITE, fade * 0.88);
          pen.polyline(boltJade, COL_JADE_BRIGHT, fade * 0.95);
          pen.polyline(boltJade, PURE_WHITE, fade * 0.82);
        }

        // 4. Flying Red-Hot Hexagonal Forge-Rivets & Khazad Starburst Impact Flare
        for (let i = 0; i < 8; i++) {
          const a = -0.95 + (i / 7) * 1.95;
          const dist = 16 + u * 54;
          const rx = Math.cos(a) * dist;
          const ry = Math.sin(a) * dist * 0.82 + u * u * 16;
          if (Math.abs(rx) <= 78 && Math.abs(ry) <= 78) {
            drawHexForgeRivet(pen, rx, ry, 2.8 * fade, i % 2 === 1, fade * 0.96);
          }
        }

        drawTiltedOrbitBand(pen, 4, 42, (34 + 34 * swingP), 0.26, 2.5, 0.96 * fade, band4, FRONT_HALF, u > 0.22 && u < 0.6);
        drawKhazadDiamondRune(pen, tipX, tipY, 6.8 * fade, true, fade * 0.98);
        drawStarburstFlare(pen, tipX, tipY, 20 * fade, fade * 0.98, [magma[4], jade[5], magma[6], PURE_WHITE]);
      }
    };
  }
};

// ============================================================================
// 13. ROW 7 (NATIVE 208x208): CONTINENTAL SUNDER SOIL & SHATTERED BEDROCK SPLASH (`continentalSunderGeyserCell`)
//     - Wide 2.5D torn earth crater, billowing soil & dust shock-clouds, overturned flat stone slabs,
//       and 16 parabolic flying granite boulders & soil clods (`x in [-84, +84]`, `y in [-68, +70]`, ZERO spikes!)
// ============================================================================
export const continentalSunderGeyserCell = {
  duration: 1.0,
  loop: false,
  defaults: { palette: FORGE_GOLD_PALETTE, seed: 359 },
  create(cfg) {
    const cOutline = packHexColor('#120d0a');
    const cSoilDark = packHexColor('#362214');
    const cSoilMid = packHexColor('#5c3d26');
    const cSoilLight = packHexColor('#8c6240');
    const cDustTan = packHexColor('#c2a37e');
    const cDustPale = packHexColor('#e6d3b8');
    const cRockDark = packHexColor('#292524');
    const cRockMid = packHexColor('#57534e');
    const cRockLight = packHexColor('#8a847c');
    const cRockRim = packHexColor('#d6d3d1');
    const dustBand = [cSoilDark, cSoilMid, cSoilLight, cDustTan];

    // 16 Parabolic Flying Boulders & Heavy Soil Clods splashing outward & bouncing on the ground
    const splashDebris = [
      { x0: -10, vx: -118, vy: -145, g: 295, r: 7.5, isRock: true, back: true, rot: 1.2 },
      { x0: -6, vx: -86, vy: -178, g: 310, r: 6.4, isRock: false, back: true, rot: -2.1 },
      { x0: -4, vx: -52, vy: -198, g: 325, r: 8.2, isRock: true, back: true, rot: 0.7 },
      { x0: 4, vx: 54, vy: -194, g: 325, r: 7.8, isRock: false, back: true, rot: -1.4 },
      { x0: 7, vx: 88, vy: -174, g: 310, r: 8.4, isRock: true, back: true, rot: 2.3 },
      { x0: 11, vx: 120, vy: -142, g: 295, r: 6.8, isRock: false, back: true, rot: -0.9 },

      { x0: -14, vx: -132, vy: -126, g: 285, r: 8.8, isRock: false, back: false, rot: -1.8 },
      { x0: -9, vx: -104, vy: -162, g: 305, r: 9.6, isRock: true, back: false, rot: 2.6 },
      { x0: -5, vx: -68, vy: -188, g: 320, r: 7.2, isRock: false, back: false, rot: 1.5 },
      { x0: -2, vx: -28, vy: -206, g: 335, r: 6.5, isRock: true, back: false, rot: -2.8 },
      { x0: 2, vx: 30, vy: -204, g: 335, r: 6.8, isRock: false, back: false, rot: 2.1 },
      { x0: 5, vx: 70, vy: -186, g: 320, r: 9.2, isRock: true, back: false, rot: -1.6 },
      { x0: 9, vx: 106, vy: -158, g: 305, r: 7.6, isRock: false, back: false, rot: 1.9 },
      { x0: 14, vx: 134, vy: -124, g: 285, r: 9.0, isRock: true, back: false, rot: -2.4 },
      { x0: -16, vx: -146, vy: -92, g: 265, r: 5.8, isRock: false, back: false, rot: 3.1 },
      { x0: 16, vx: 148, vy: -90, g: 265, r: 6.0, isRock: false, back: false, rot: -3.0 }
    ];

    // Low blocky overturned earth & granite crater mounds (wide & flat-topped, ZERO spikes!)
    const rimMounds = [
      { cx: -52, hw: 14, h: 12, lean: -5, isRock: false },
      { cx: -31, hw: 16, h: 17, lean: -7, isRock: true },
      { cx: -12, hw: 13, h: 13, lean: -3, isRock: false },
      { cx: 13, hw: 13, h: 14, lean: 3, isRock: false },
      { cx: 32, hw: 16, h: 18, lean: 7, isRock: true },
      { cx: 53, hw: 14, h: 12, lean: 5, isRock: false }
    ];

    function sampleChunkPos(d, u, baseY) {
      let x = d.x0 + d.vx * u;
      let y = baseY - 4 + d.vy * u + 0.5 * d.g * u * u;
      const floorY = baseY + 3;
      if (y > floorY) {
        // Single low dirt-clod ground bounce
        const over = y - floorY;
        y = Math.max(floorY - 14, floorY - over * 0.28);
      }
      x = Math.max(-76, Math.min(76, x));
      y = Math.max(-62, Math.min(64, y));
      return { x, y };
    }

    function drawSoilOrBoulder(pen, cx, cy, rad, ang, isRock, alpha) {
      if (alpha <= 0.02 || rad <= 1.2) return;
      const b = Math.ceil(rad + 2.2);
      const ca = Math.cos(ang);
      const sa = Math.sin(ang);
      pen.shadeBox(cx - b, cy - b, cx + b, cy + b, (lx, ly, out) => {
        const dx = lx - cx;
        const dy = ly - cy;
        const ux = dx * ca + dy * sa;
        const uy = -dx * sa + dy * ca;
        // Faceted angular rock polygon vs irregular lumpy soil clod
        const shape = isRock
          ? Math.max(
              Math.abs(ux) * 0.94 + Math.abs(uy) * 0.42,
              Math.abs(uy) * 1.04 + Math.abs(ux) * 0.30,
              Math.abs(ux + uy * 0.6) * 0.82
            )
          : Math.hypot(ux * 0.95, uy * 1.12) + Math.sin(ux * 0.7 + uy * 0.5) * 0.85;
        if (shape > rad) return 0;
        out.alpha = alpha;
        if (shape >= rad - 1.25) return cOutline;
        if (isRock) {
          if (uy < -rad * 0.32 && ux < rad * 0.4) return cRockRim;
          if (uy < 0.1 * rad) return cRockLight;
          return ux > 0 ? cRockMid : cRockDark;
        }
        if (uy < -rad * 0.30) return cDustTan;
        if (uy < 0.15 * rad) return cSoilLight;
        return ux > 0 ? cSoilMid : cSoilDark;
      });
    }

    return {
      step() {},
      renderBack(pen, localT) {
        const u = clamp01(localT);
        const pop = 0.30 + 0.70 * smoothStep(0, 0.14, u);
        const fade = 1 - smoothStep(0.72, 1.0, u);
        if (fade <= 0.02) return;

        const baseY = 52;

        // 1. Wide Shattered Soil & Bedrock Impact Crater Pit (`rx = 68`, `ry = 13`)
        pen.shadeBox(-72, baseY - 15, 72, baseY + 15, (lx, ly, out) => {
          const dx = lx / Math.max(4, 68 * pop);
          const dy = (ly - baseY) / Math.max(2, 13 * pop);
          const r2 = dx * dx + dy * dy;
          if (r2 > 1.0) return 0;
          const r = Math.sqrt(r2);
          out.alpha = fade * 0.98;
          if (r >= 0.88) return cOutline;
          if (r >= 0.70) return dy < 0 ? cSoilMid : cDustTan;
          if (r >= 0.48) return cSoilDark;
          return cRockDark;
        });

        // 2. Wide V-Fanning Billowing Soil Spray & Dust Plume Cloud (`[-80, +80] x [-42, +56]`, ZERO vertical pole!)
        const plumeSpread = 26 + 50 * smoothStep(0, 0.65, u);
        const plumeLift = 48 * Math.sin(Math.min(1, u * 1.25) * Math.PI * 0.78) + 18 * (1 - u);
        pen.shadeBox(-82, baseY - 78, 82, baseY + 8, (lx, ly, out) => {
          const dy = baseY - ly;
          if (dy < -4 || dy > plumeLift + 16) return 0;
          const v = clamp01(dy / Math.max(10, plumeLift + 12));
          // Two outward-arcing soil/dust lobes fanning left & right (hollow V-cup in the upper middle!)
          const lobeCenter = (14 + v * plumeSpread * 0.78);
          const distLobe = Math.abs(Math.abs(lx) - lobeCenter);
          const lobeRadius = (24 * (1 - v * 0.45) + (1 - v) * 14) * pop;
          if (distLobe > lobeRadius) return 0;

          const n = fbmNoise2D(lx * 0.09, ly * 0.10 + u * 3.2, cfg.seed || 359, 3);
          const density = (1 - distLobe / lobeRadius) * 0.86 + n * 0.32 - u * 0.22;
          if (density <= 0.24) return 0;

          out.alpha = fade * clamp01((density - 0.20) * 2.1) * 0.94;
          if (density <= 0.31) return cOutline;
          if (density > 0.76 && dy > 10) return cDustPale;
          if (density > 0.60) return cDustTan;
          if (density > 0.46) return cSoilLight;
          if (density > 0.36) return cSoilMid;
          return cSoilDark;
        });

        // 3. Back-layer Parabolic Flying Rocks & Soil Clods
        for (let i = 0; i < splashDebris.length; i++) {
          const d = splashDebris[i];
          if (!d.back) continue;
          const pos = sampleChunkPos(d, u, baseY);
          drawSoilOrBoulder(pen, pos.x, pos.y, d.r * (1 - 0.18 * u), d.rot + u * 4.2, d.isRock, fade * 0.96);
        }
      },
      renderFront(pen, localT) {
        const u = clamp01(localT);
        const pop = 0.28 + 0.72 * smoothStep(0, 0.12, u);
        const settle = 1 - 0.45 * smoothStep(0.55, 1.0, u);
        const fade = 1 - smoothStep(0.74, 1.0, u);
        if (fade <= 0.02) return;

        const baseY = 52;

        // 1. Low Blocky Overturned Earth Clods & Broken Granite Slabs along Crater Rim (flat/chunky, ZERO spikes!)
        for (let i = 0; i < rimMounds.length; i++) {
          const m = rimMounds[i];
          const mh = m.h * pop * settle;
          const mhw = m.hw * pop;
          const cx = m.cx * (0.75 + 0.25 * pop);
          pen.shadeBox(cx - mhw - 8, baseY - mh - 3, cx + mhw + 8, baseY + 6, (lx, ly, out) => {
            if (ly > baseY + 4 || ly < baseY - mh) return 0;
            const v = clamp01((baseY + 4 - ly) / Math.max(3, mh + 4));
            const shiftX = v * m.lean;
            const dx = lx - (cx + shiftX);
            // Wide trapezoidal/rounded clod top (retains 62% width at top so it reads as a chunky slab/mound, NEVER a spike!)
            const halfW = mhw * (1 - v * 0.38);
            if (Math.abs(dx) > halfW) return 0;
            out.alpha = fade * 0.99;
            if (Math.abs(dx) >= halfW - 1.25 || v >= 0.90) return cOutline;
            if (v >= 0.72) return m.isRock ? cRockLight : cDustTan;
            if (dx * (m.lean >= 0 ? -1 : 1) > 0) return m.isRock ? cRockMid : cSoilLight;
            return m.isRock ? cRockDark : cSoilDark;
          });
        }

        // 2. Front-layer Explosive Fountain of 10 Faceted Boulders & Wet Soil Clods
        for (let i = 0; i < splashDebris.length; i++) {
          const d = splashDebris[i];
          if (d.back) continue;
          const pos = sampleChunkPos(d, u, baseY);
          drawSoilOrBoulder(pen, pos.x, pos.y, d.r * (1 - 0.16 * u), d.rot - u * 4.8, d.isRock, fade * 0.99);
        }

        // 3. Expanding Ground Soil-Dust Shockwave Ring along `baseY + 3`
        drawTiltedOrbitBand(pen, 0, baseY + 3, (34 + 38 * smoothStep(0, 0.7, u)), 0.18, 2.4, 0.94 * fade, dustBand, FRONT_HALF, false);
      }
    };
  }
};

// ============================================================================
// 14. KHAZAD WORLD-FORGE ANCESTOR AVATAR (`khazadForgeAncestorAvatar`)
//     - Towering Spectral Horned Dwarven Forge-God Spirit (`renderBack`: Horned Gold/Obsidian
//       Crown, Blazing Emerald-Jade Eyes, Flowing Molten Beard, & 8-Cog Sovereign Halo;
//       `renderFront`: Unison Colossal God-Maul Overhead Cleave & Khazad Rune Burst!)
// ============================================================================
export const khazadForgeAncestorAvatar = {
  duration: 0.68,
  loop: false,
  defaults: { palette: FORGE_GOLD_PALETTE, seed: 389 },
  create(cfg) {
    const magma = buildColorRamp(FORGE_GOLD_PALETTE, 8);
    const jade = buildColorRamp(FORGE_JADE_PALETTE, 8);
    const band4 = [magma[2], jade[4], magma[6], PURE_WHITE];
    let t = 0;

    return {
      step(dt) {
        t += dt;
      },
      renderBack(pen) {
        const u = clamp01(t / 0.68);
        const pop = smoothStep(0, 0.16, u);
        const fade = 1 - smoothStep(0.62, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;

        // 1. Towering 8-Cog Sovereign Crucible Halo behind the Forge-God Ancestor (`cy = -26`)
        drawDwarvenCrucibleGearRing(pen, -4, -26, 30 * pop, 0.92, u * 2.2, 0.88 * env, null, true);

        // 2. Horned Khazad Forge-God Visage, Ram-Horn Shoulders, Jade Eyes & Braided Magma Beard
        //    Strictly inside `[-38, +30] x [-64, +8]` with >=4px margin inside `shadeBox(-44, -70, 36, 14)`
        pen.shadeBox(-44, -70, 36, 14, (lx, ly, out) => {
          const cx = -4;
          const dx = lx - cx;
          const ax = Math.abs(dx);

          // A. Upward-Sweeping Golden Khazad War-Horns (`ly in [-62, -36]`)
          if (ly >= -62 && ly <= -36) {
            const hu = (-36 - ly) / 26; // 0 at base (-36), 1 at horn tips (-62)
            const hornCenter = 11 + hu * 11 - hu * hu * 4.5;
            const hornHalfW = Math.max(0.9, 4.2 * (1 - hu * 0.72));
            if (Math.abs(ax - hornCenter) <= hornHalfW) {
              out.alpha = env * 0.96;
              if (Math.abs(ax - hornCenter) >= hornHalfW - 0.95) return COL_OBSIDIAN;
              out.glowColor = COL_FORGE_GOLD;
              out.glowStrength = 0.34 * env;
              return hu > 0.65 ? PURE_WHITE : COL_FORGE_GOLD;
            }
          }

          // B. Ornate Bronze-Gold Helm Dome & Cheek Guards (`ly in [-48, -24]`)
          if (ly >= -48 && ly <= -24) {
            const helmU = (ly + 48) / 24;
            const helmW = 13.5 * Math.sqrt(Math.max(0, 1 - Math.pow((helmU - 0.55) / 0.62, 2)));
            if (ax <= helmW) {
              out.alpha = env * 0.97;
              if (ax >= helmW - 1.1 || ly <= -46.8) return COL_OBSIDIAN;
              // Emerald-Jade Brow Crest (`dx ~ 0, ly ~ -39`)
              if (ax + Math.abs(ly + 39) <= 3.4) {
                out.glowColor = COL_JADE_BRIGHT;
                out.glowStrength = 0.45 * env;
                return ax + Math.abs(ly + 39) <= 1.4 ? PURE_WHITE : COL_JADE_PALE;
              }
              // Blazing Emerald-Jade Demi-God Eyes (`ly in [-34, -30], ax in [3.2, 8.2]`)
              if (ly >= -34 && ly <= -30.5 && ax >= 3.0 && ax <= 8.2) {
                out.glowColor = COL_JADE_BRIGHT;
                out.glowStrength = 0.52 * env;
                return ax >= 4.5 && ax <= 6.8 ? PURE_WHITE : COL_JADE_BRIGHT;
              }
              if (ax <= 2.2 || Math.abs(ly + 35.5) <= 1.2) return COL_FORGE_GOLD;
              return COL_BASALT;
            }
          }

          // C. Broad Spectral Ram-Horn Pauldrons & Chest (`ly in [-28, -2]`)
          const shY = (ly + 16) / 15;
          const shW = 29 * Math.sqrt(Math.max(0, 1 - shY * shY));
          const inShoulders = ly >= -30 && ly <= -1 && ax <= shW;

          // D. Flowing 3-Braid Molten Magma Beard (`ly in [-27, +6]`)
          const beardU = clamp01((ly + 27) / 33);
          const beardW = (12.5 * (1 - beardU * 0.65) + Math.sin(beardU * 8) * 1.4) * (1 - smoothStep(0.88, 1.0, beardU));
          const inBeard = ly >= -27 && ly <= 6 && ax <= beardW;

          if (inBeard) {
            out.alpha = env * 0.96;
            if (ax >= beardW - 1.05 || ly >= 4.8) return COL_OBSIDIAN;
            const braid = Math.abs(Math.sin(dx * 0.65 + ly * 0.25));
            out.glowColor = COL_MAGMA_BRIGHT;
            out.glowStrength = 0.36 * env;
            if (Math.abs(ly + 8) <= 1.5 && ax <= 5.5) return COL_FORGE_GOLD;
            return braid > 0.68 ? COL_FORGE_GOLD : braid > 0.34 ? COL_MAGMA_BRIGHT : COL_MAGMA_MID;
          }

          if (inShoulders) {
            const taper = clamp01(( -1 - ly ) / 8);
            out.alpha = env * 0.9 * (0.35 + 0.65 * taper);
            if (ax >= shW - 1.2) return COL_OBSIDIAN;
            // Shoulder Emerald-Jade Runes (`ax ~ 19, ly ~ -17`)
            if (Math.abs(ax - 19) + Math.abs(ly + 17) <= 4.2) {
              out.glowColor = COL_JADE_MID;
              out.glowStrength = 0.42 * env;
              return Math.abs(ax - 19) + Math.abs(ly + 17) <= 1.8 ? PURE_WHITE : COL_JADE_BRIGHT;
            }
            if (ax >= shW - 3.2 || ly <= -26) return COL_FORGE_GOLD;
            return COL_BASALT;
          }

          return 0;
        });

        pen.radialGlow(-4, -28, 34 * env, magma[5], 0.36 * env);
        pen.radialGlow(-4, -34, 22 * env, jade[5], 0.30 * env);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.68);
        const fade = 1 - smoothStep(0.66, 1.0, u);
        if (fade <= 0.02) return;

        const swingP = smoothStep(0.04, 0.48, u);
        const hammerAng = -1.25 + swingP * 1.48;

        drawColossalDwarvenWarhammer(
          pen,
          6 + Math.cos(hammerAng) * 8,
          -18 + Math.sin(hammerAng) * 8,
          1.22,
          swingP,
          cfg.seed || 389,
          hammerAng,
          fade * 0.96,
          u >= 0.2 && u <= 0.52
        );

        drawTiltedOrbitBand(pen, 4, 2, (20 + 18 * swingP), 0.24, 1.8, 0.94 * fade, band4, FRONT_HALF, u < 0.42);
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
  khazadForgeAncestorAvatar,
  tectonicMagmaWaveCell,
  moltenSlagBoulderCell,
  runicIronForgeAnvilCell,
  runicBulwarkShieldCell,
  forgeRuneShieldCrestCell,
  tectonicMagmaPillarCell,
  worldForgeAnvilSealCell,
  cataclysmCraterNovaCell,
  worldForgeCrucibleAltarCell,
  godHammerLightningStrikeCell,
  continentalSunderGeyserCell
};

export const FORGE_SHADER_PACK = FORGE_EFFECT_REGISTRY;
export default FORGE_EFFECT_REGISTRY;
