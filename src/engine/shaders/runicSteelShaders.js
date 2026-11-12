/**
 * Runic Vanguard & Heavenly Earthshatter Shader Suite (`runicSteelShaders.js`)
 * First-party 120Hz 2.5D multi-layer pixel-shader & particle effects for Aethelgard (`warrior` / `Warrior.js`).
 *
 * Powers both:
 *   1. Live 120Hz `ArcaneShaderFX` (`back` + `front` 2.5D depth wraps around Aethelgard & opponents)
 *   2. Offline 30fps `assets/sprites/warrior_vfx.png` (`6240x1040`, 5 rows x 30 cols @ 208x208, 0/150 border clips)
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
} from '../ArcaneShaderFX.js?v=30fps79';

export const RUNIC_CYAN_PALETTE = [
  '#061228',
  '#0c2e59',
  '#0369a1',
  '#0284c7',
  '#0ea5e9',
  '#38bdf8',
  '#bae6fd',
  '#ffffff'
];

export const RUNIC_GOLD_PALETTE = [
  '#1c1306',
  '#451a03',
  '#78350f',
  '#b45309',
  '#d97706',
  '#facc15',
  '#fef08a',
  '#ffffff'
];

const BACK_HALF = (theta) => Math.sin(theta) < 0;
const FRONT_HALF = (theta) => Math.sin(theta) >= 0;

function drawPixelElderRune(pen, cx, cy, r, mainCol, coreCol, alpha = 1) {
  if (alpha <= 0.03 || r <= 0.4) return;
  pen.fillCircle(cx, cy, r + 0.85, '#061228', alpha * 0.92);
  pen.fillCircle(cx, cy, r, mainCol, alpha * 0.96);
  pen.stipple(cx, cy, coreCol, alpha);
  if (r >= 2.0) {
    pen.stipple(cx, cy - 1, PURE_WHITE, alpha * 0.9);
    pen.stipple(cx, cy + 1, PURE_WHITE, alpha * 0.9);
  }
}

function drawElderStarCross(pen, cx, cy, rOuter, rInner, aspectY, rot, colMain, colGold, alpha, pred = null) {
  if (rOuter <= 1.5 || alpha <= 0.03) return;
  const points = 8;
  for (let i = 0; i < points * 2; i++) {
    const a0 = rot + (i * Math.PI) / points;
    const a1 = rot + ((i + 1) * Math.PI) / points;
    const midA = (a0 + a1) * 0.5;
    if (pred && !pred(midA)) continue;
    const r0 = i % 2 === 0 ? rOuter : rInner;
    const r1 = i % 2 === 0 ? rInner : rOuter;
    const x0 = cx + Math.cos(a0) * r0;
    const y0 = cy + Math.sin(a0) * r0 * aspectY;
    const x1 = cx + Math.cos(a1) * r1;
    const y1 = cy + Math.sin(a1) * r1 * aspectY;
    const isCardinal = i % 4 === 0 || i % 4 === 3;
    pen.line(x0, y0, x1, y1, isCardinal ? colGold : colMain, alpha);
    if (i % 2 === 0) {
      pen.stipple(x0, y0, i % 4 === 0 ? PURE_WHITE : colGold, alpha);
    }
  }
}

/**
 * Render Aethelgard's Pointed Runic Broadsword (`drawRunicGreatswordSilhouette`) with its
 * complete ornate pommel jewel, wire-wrapped hilt, swept Valkyrie-steel winged crossguard,
 * and diamond-tapered fuller blade 100% inside the canvas/cell bounds.
 *
 * `tipX, tipY`: Pointed tip of the greatsword blade (`d = 0`).
 * `totalLen`: Total length from pointed tip (`d = 0`) to top of pommel jewel (`d = totalLen`).
 * `angleRad`: Tilt angle from vertical (`0` = vertical point-down, `±0.4887` = `±28°` diagonal phalanx).
 */
export function drawRunicGreatswordSilhouette(
  pen,
  tipX,
  tipY,
  totalLen,
  bladeHalfW,
  angleRad,
  cyan,
  gold,
  alpha = 1,
  isPhantom = false
) {
  if (alpha <= 0.03 || totalLen <= 8 || bladeHalfW <= 0.8) return;
  const ux = Math.sin(angleRad);
  const uy = -Math.cos(angleRad);
  const nx = Math.cos(angleRad);
  const ny = Math.sin(angleRad);

  const bladeLen = totalLen * 0.67;
  const guardD = bladeLen;
  const hiltEndD = totalLen * 0.90;
  const pommelD = totalLen * 0.94;

  // 1. Pointed Diamond-Tip & Broad Double-Edged Runic Fuller Blade (`d = 0 .. bladeLen`)
  const stepD = 0.65;
  for (let d = 0; d <= bladeLen; d += stepD) {
    const bFrac = d / Math.max(1, bladeLen);
    let halfW;
    if (bFrac < 0.28) {
      // Razor-sharp pointed diamond tip at bottom (`d = 0`)
      halfW = bladeHalfW * Math.pow(bFrac / 0.28, 0.78);
    } else if (bFrac < 0.86) {
      // Broad fuller blade body widening slightly toward crossguard
      halfW = bladeHalfW * (0.92 + 0.12 * ((bFrac - 0.28) / 0.58));
    } else {
      // Flared ricasso collar below the crossguard
      halfW = bladeHalfW * 1.14;
    }

    const cx = tipX + ux * d;
    const cy = tipY + uy * d;
    const maxQ = Math.ceil(halfW * 2) * 0.5;

    for (let q = -maxQ; q <= maxQ; q += 0.55) {
      const aq = Math.abs(q);
      if (aq > halfW + 0.25) continue;
      const px = cx + nx * q;
      const py = cy + ny * q;

      // Crisp 1px dark runic-steel selective outline (`Selout`)
      if (aq >= halfW - 0.85 || d < 1.1) {
        pen.stipple(px, py, cyan[0], alpha * 0.96);
        continue;
      }

      // Central Engraved Elder-Rune Fuller Channel
      if (bFrac > 0.16 && bFrac < 0.92 && aq <= Math.max(0.85, bladeHalfW * 0.24)) {
        const isRuneNode = Math.floor(d * 0.42) % 3 === 0;
        const fullerCol = isPhantom
          ? isRuneNode
            ? PURE_WHITE
            : cyan[6]
          : aq < 0.55
            ? PURE_WHITE
            : isRuneNode
              ? gold[6]
              : cyan[5];
        pen.stipple(px, py, fullerCol, alpha);
        continue;
      }

      // Specular bevel highlight on left blade face (`q < 0`) vs deep sapphire steel on right face (`q > 0`)
      const edgeRatio = aq / Math.max(0.5, halfW);
      let bladeCol;
      if (isPhantom) {
        bladeCol = q < 0 ? (edgeRatio > 0.62 ? PURE_WHITE : cyan[6]) : cyan[4];
      } else {
        bladeCol =
          q < 0
            ? edgeRatio > 0.66
              ? PURE_WHITE
              : cyan[6]
            : edgeRatio > 0.68
              ? cyan[5]
              : cyan[3];
      }
      pen.stipple(px, py, bladeCol, alpha * (isPhantom ? 0.88 : 0.98));
    }
  }

  // 2. Wire-Wrapped Royal Hilt (`d = guardD .. hiltEndD`)
  for (let d = guardD; d <= hiltEndD; d += 0.65) {
    const cx = tipX + ux * d;
    const cy = tipY + uy * d;
    const hiltW = isPhantom ? 1.4 : 1.85;
    const isGoldWrap = Math.floor(d * 0.6) % 2 === 0;
    for (let q = -hiltW - 0.6; q <= hiltW + 0.6; q += 0.55) {
      const aq = Math.abs(q);
      if (aq > hiltW + 0.4) continue;
      const col = aq >= hiltW - 0.45 ? cyan[0] : isGoldWrap ? gold[5] : cyan[2];
      pen.stipple(cx + nx * q, cy + ny * q, col, alpha * 0.96);
    }
  }

  // 3. Swept Valkyrie-Steel Winged Crossguard (`d = guardD`)
  const gx = tipX + ux * (guardD + 1.2);
  const gy = tipY + uy * (guardD + 1.2);
  const wingSpan = bladeHalfW * (isPhantom ? 2.15 : 2.65);
  for (const side of [-1, 1]) {
    for (let p = 0; p < 3; p++) {
      const pSpan = wingSpan * (1 - p * 0.2);
      const liftD = (3.8 - p * 1.1) * (isPhantom ? 0.8 : 1.0);
      const wx = gx + nx * side * pSpan + ux * liftD;
      const wy = gy + ny * side * pSpan + uy * liftD;
      const rootX = gx + nx * side * 1.4 - ux * (p * 0.9);
      const rootY = gy + ny * side * 1.4 - uy * (p * 0.9);
      pen.line(rootX, rootY, wx, wy, cyan[0], alpha * 0.95);
      pen.line(
        rootX + ux * 0.8,
        rootY + uy * 0.8,
        wx + ux * 0.6,
        wy + uy * 0.6,
        p === 0 ? PURE_WHITE : p === 1 ? gold[6] : gold[4],
        alpha * 0.98
      );
      pen.stipple(wx, wy, PURE_WHITE, alpha);
    }
  }
  drawPixelElderRune(pen, gx, gy, isPhantom ? 1.8 : 2.5, gold[5], PURE_WHITE, alpha);

  // 4. Complete Ornate Faceted Pommel Jewel at Top (`d = pommelD`, NEVER cut off!)
  const pxPommel = tipX + ux * pommelD;
  const pyPommel = tipY + uy * pommelD;
  const pommelR = isPhantom ? 2.2 : 3.1;
  pen.fillCircle(pxPommel, pyPommel, pommelR + 0.9, cyan[0], alpha * 0.96);
  pen.fillCircle(pxPommel, pyPommel, pommelR, gold[5], alpha * 0.98);
  pen.fillCircle(pxPommel, pyPommel, pommelR * 0.55, cyan[6], alpha);
  pen.stipple(pxPommel, pyPommel, PURE_WHITE, alpha);
  // Pommel crown finial tip at `d = totalLen`
  const finialX = tipX + ux * totalLen;
  const finialY = tipY + uy * totalLen;
  pen.line(pxPommel, pyPommel, finialX, finialY, gold[6], alpha);
  pen.stipple(finialX, finialY, PURE_WHITE, alpha);

  if (!isPhantom) {
    pen.radialGlow(tipX + ux * (bladeLen * 0.45), tipY + uy * (bladeLen * 0.45), bladeHalfW * 2.4, cyan[5], 0.34 * alpha);
  }
}

/**
 * Render Aethelgard's Faceted Octagonal Runic Aegis Kite-Shield (`drawFacetedAegisKiteShield`)
 * with stepped crown brow, Valkyrie side-pinions, gilded octagonal bezel, and central Elder Star-Boss.
 */
function drawFacetedAegisKiteShield(pen, cx, cy, scale, cyan, gold, alpha = 1) {
  if (alpha <= 0.03 || scale <= 0.2) return;
  const topY = -20 * scale;
  const botY = 23 * scale;
  const maxHalfW = 18.5 * scale;

  // Swept Valkyrie-Steel Upper Shoulder Pinions flanking the Kite-Shield
  for (const side of [-1, 1]) {
    for (let p = 0; p < 3; p++) {
      const sx0 = cx + side * (13 - p * 1.5) * scale;
      const sy0 = cy + (-9 + p * 3.5) * scale;
      const sx1 = cx + side * (25 - p * 2.4) * scale;
      const sy1 = cy + (-18 + p * 3.2) * scale;
      pen.line(sx0, sy0, sx1, sy1, cyan[0], alpha * 0.95);
      pen.line(sx0, sy0 - 0.8, sx1, sy1 - 0.8, p === 0 ? PURE_WHITE : gold[6], alpha * 0.98);
      pen.stipple(sx1, sy1, PURE_WHITE, alpha);
    }
  }

  // Scanline-rasterized Faceted Octagonal Kite-Shield Plate (zero vertical pole boxes)
  for (let dy = Math.floor(topY); dy <= Math.ceil(botY); dy++) {
    const v = (dy - topY) / Math.max(1, botY - topY); // 0 at top crown, 1 at bottom kite point
    let halfW;
    if (v < 0.14) {
      // Stepped octagonal top brow
      halfW = maxHalfW * (0.58 + (v / 0.14) * 0.42);
    } else if (v < 0.46) {
      // Broad upper kite-shield shoulders
      halfW = maxHalfW * (1.0 - (v - 0.14) * 0.12);
    } else {
      // Polygonal kite taper to a sharp bottom point at `v = 1`
      const kv = (v - 0.46) / 0.54;
      halfW = maxHalfW * 0.96 * Math.pow(Math.max(0, 1 - kv), 0.82);
    }

    const py = cy + dy;
    const limX = Math.ceil(halfW);
    for (let dx = -limX; dx <= limX; dx++) {
      const adx = Math.abs(dx);
      if (adx > halfW + 0.25) continue;
      const px = cx + dx;
      const distEdge = Math.min(halfW - adx, dy - topY, botY - dy);

      // 1px Dark Runic-Steel Selective Outline (`Selout`)
      if (distEdge < 1.15) {
        pen.stipple(px, py, cyan[0], alpha * 0.98);
        continue;
      }

      // Gilded Royal Bevel Frame & Inner Octagonal Trim
      if (distEdge < 3.4) {
        const isInnerLine = distEdge >= 2.55;
        const rimCol = isInnerLine ? cyan[0] : distEdge < 2.0 && (dx < 0 || dy < 0) ? gold[6] : gold[4];
        pen.stipple(px, py, rimCol, alpha * 0.98);
        continue;
      }

      // Raised Central Golden-Sapphire Chevron & Cross Ribs
      const inVertRib = adx <= 1.35 * scale;
      const inHorizRib = Math.abs(dy + 2 * scale) <= 1.25 * scale;
      const inChevron = Math.abs(adx - Math.abs(dy + 2 * scale) * 0.85) <= 1.2 * scale && dy > -2 * scale;
      if (inVertRib || inHorizRib || inChevron) {
        const ribCol = adx < 0.6 * scale || Math.abs(dy + 2 * scale) < 0.6 * scale ? PURE_WHITE : gold[5];
        pen.stipple(px, py, ribCol, alpha);
        continue;
      }

      // Quad-Faceted Sapphire Armor Plates
      const facetCol =
        dx < 0 && dy < -2 * scale
          ? cyan[5]
          : dx < 0 || dy < -2 * scale
            ? cyan[4]
            : cyan[2];
      pen.stipple(px, py, facetCol, alpha * 0.96);
    }
  }

  // Central Faceted Sapphire-Gold Aegis Boss & 4 Corner Rivets
  drawElderStarCross(pen, cx, cy - 2 * scale, 11 * scale, 4.8 * scale, 1.0, 0, cyan[6], gold[6], alpha);
  drawPixelElderRune(pen, cx, cy - 2 * scale, 3.6 * scale, gold[5], PURE_WHITE, alpha);
  for (const [rx, ry] of [
    [-12, -11],
    [12, -11],
    [-11, 5],
    [11, 5]
  ]) {
    drawPixelElderRune(pen, cx + rx * scale, cy + ry * scale, 1.6 * scale, cyan[6], PURE_WHITE, alpha);
  }
}


// ============================================================================
// 1. 2.5D RUNIC VANGUARD AURA (`runicVanguardAura`)
// ============================================================================
export const runicVanguardAura = {
  duration: 1.0,
  loop: true,
  defaults: { palette: RUNIC_CYAN_PALETTE, seed: 47, radius: 24, isAegis: false },
  create(cfg) {
    const cyan = buildColorRamp(cfg.palette, 8);
    const gold = buildColorRamp(RUNIC_GOLD_PALETTE, 8);
    const band4 = [cyan[2], cyan[5], gold[6], PURE_WHITE];
    const aegisBand4 = [gold[2], cyan[5], gold[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, cyan[6], gold[5], cyan[4]] });
    let phase = 0;
    let acc = 0;

    return {
      step(dt) {
        phase += dt;
        acc += dt * (cfg.isAegis ? 24 : 11);
        const rx = cfg.radius || (cfg.isAegis ? 28 : 24);
        while (acc >= 1) {
          acc -= 1;
          const a = rng.between(0, Math.PI * 2);
          motes.emit(
            rng.chance(0.55) ? 'glint' : 'spark',
            Math.cos(a) * rx * rng.between(0.65, 1.05),
            Math.sin(a) * rx * 0.24,
            rng.between(-8, 8),
            rng.between(-42, -16),
            rng.between(0.18, 0.34),
            rng.chance(0.4) ? gold[5] : cyan[5],
            1.0,
            -12
          );
        }
        motes.step(dt);
      },
      renderBack(pen) {
        const rx = cfg.radius || (cfg.isAegis ? 28 : 24);
        const activeBand = cfg.isAegis ? aegisBand4 : band4;
        drawTiltedOrbitBand(pen, 0, 0, rx, 0.25, 1.5, 0.84, activeBand, BACK_HALF, false);
        if (cfg.isAegis) {
          drawTiltedOrbitBand(pen, 0, -16, rx * 0.78, 0.22, 1.3, 0.78, band4, BACK_HALF, false);
        }
        for (let i = 0; i < 4; i++) {
          const a = phase * 2.6 + (i * Math.PI) / 2;
          if (Math.sin(a) >= 0) continue;
          drawPixelElderRune(
            pen,
            Math.cos(a) * rx,
            Math.sin(a) * rx * 0.25,
            2.0,
            i % 2 === 0 ? cyan[5] : gold[5],
            PURE_WHITE,
            0.88
          );
        }
      },
      renderFront(pen) {
        const rx = cfg.radius || (cfg.isAegis ? 28 : 24);
        const activeBand = cfg.isAegis ? aegisBand4 : band4;
        drawTiltedOrbitBand(pen, 0, 0, rx, 0.25, 1.65, 0.94, activeBand, FRONT_HALF, Boolean(cfg.isAegis));
        if (cfg.isAegis) {
          drawTiltedOrbitBand(pen, 0, -16, rx * 0.78, 0.22, 1.4, 0.88, band4, FRONT_HALF, true);
        }
        for (let i = 0; i < 4; i++) {
          const a = phase * 2.6 + (i * Math.PI) / 2;
          if (Math.sin(a) < 0) continue;
          drawPixelElderRune(
            pen,
            Math.cos(a) * rx,
            Math.sin(a) * rx * 0.25,
            2.3,
            i % 2 === 0 ? cyan[6] : gold[6],
            PURE_WHITE,
            0.96
          );
        }
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 2. MULTI-LAYER RUNEBLADE CRESCENT SLASH & BEAM (`runebladeCrescentSlash`)
// ============================================================================
export const runebladeCrescentSlash = {
  duration: 0.36,
  loop: false,
  defaults: {
    palette: RUNIC_CYAN_PALETTE,
    seed: 83,
    radius: 30,
    width: 11.5,
    eccentricity: 0.76,
    headAngle: 1.25,
    tailAngle: -1.35,
    isGold: false,
    groundWrap: false,
    dx: 0,
    dy: 0
  },
  create(cfg) {
    const cyan = buildColorRamp(cfg.palette, 8);
    const gold = buildColorRamp(RUNIC_GOLD_PALETTE, 8);
    const primaryRamp = cfg.isGold ? gold : cyan;
    const secondaryRamp = cfg.isGold ? cyan : gold;
    const band4 = [cyan[2], cyan[5], gold[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, cyan[6], gold[5], cyan[4]] });
    let t = 0;
    let burstDone = false;

    return {
      step(dt) {
        if (!burstDone) {
          burstDone = true;
          const count = cfg.dx || cfg.dy ? 18 : 14;
          for (let i = 0; i < count; i++) {
            const a = rng.between(-Math.PI * 0.65, Math.PI * 0.65);
            const spd = rng.between(48, 142);
            motes.emit(
              i % 2 === 0 ? 'glint' : 'spark',
              Math.cos(a) * 12,
              Math.sin(a) * 12,
              Math.cos(a) * spd,
              Math.sin(a) * spd,
              rng.between(0.16, 0.32),
              i % 3 === 0 ? gold[5] : cyan[5],
              1.08,
              18
            );
          }
        }
        t += dt;
        motes.step(dt);
      },
      renderBack(pen) {
        if (!cfg.groundWrap) return;
        const dur = cfg.customDuration || 0.36;
        const u = clamp01(t / dur);
        const fade = 1 - u;
        if (fade <= 0.02) return;
        const r = (cfg.radius || 30) * (0.45 + 0.55 * smoothStep(0, 0.65, u));
        drawTiltedOrbitBand(pen, 0, 10, r, 0.24, 1.4, fade * 0.84, band4, BACK_HALF, false);
      },
      renderFront(pen) {
        const dur = cfg.customDuration || 0.36;
        const u = clamp01(t / dur);
        const fade = 1 - u;
        if (fade <= 0.02) return;

        // Optional Omnislash / Judgment linear slash-beam vector (`dx`, `dy` in world pixels)
        if (cfg.dx || cfg.dy) {
          const ex = (cfg.dx || 0) / 3;
          const ey = (cfg.dy || 0) / 3;
          pen.line(0, -1.2, ex, ey - 1.2, cyan[3], fade * 0.84);
          pen.line(0, 1.2, ex, ey + 1.2, gold[5], fade * 0.88);
          pen.line(0, 0, ex, ey, PURE_WHITE, fade * 0.98);
          const chain = buildLightningChain(rng, 0, 0, ex, ey, 0.11, 3);
          pen.polyline(chain, cyan[6], fade * 0.9);
          const mx = ex * 0.5;
          const my = ey * 0.5;
          drawStarburstFlare(pen, mx, my, 9.5 * fade, fade * 0.95, [cyan[4], gold[5], cyan[6], PURE_WHITE]);
        }

        const baseRadius = cfg.radius || 30;
        const baseWidth = cfg.width || 11.5;
        const sweepHead = (cfg.headAngle ?? 1.25) + u * 0.28;
        const sweepTail = (cfg.tailAngle ?? -1.35) + u * 0.55;

        drawMultiLayerCrescentArc(pen, {
          cx: -2,
          cy: 0,
          radius: baseRadius,
          width: baseWidth,
          eccentricity: cfg.eccentricity ?? 0.76,
          headAngle: sweepHead,
          tailAngle: sweepTail,
          fade,
          ramp: primaryRamp,
          seed: cfg.seed || 83,
          t,
          flashHot: u < 0.38
        });

        // Secondary golden-runic inner harmonic crescent echo
        drawMultiLayerCrescentArc(pen, {
          cx: -4,
          cy: 0,
          radius: Math.max(12, baseRadius * 0.74),
          width: Math.max(5, baseWidth * 0.58),
          eccentricity: cfg.eccentricity ?? 0.76,
          headAngle: sweepHead - 0.14,
          tailAngle: sweepTail + 0.25,
          fade: fade * 0.82,
          ramp: secondaryRamp,
          seed: (cfg.seed || 83) + 19,
          t,
          flashHot: false
        });

        if (cfg.groundWrap) {
          const r = baseRadius * (0.45 + 0.55 * smoothStep(0, 0.65, u));
          drawTiltedOrbitBand(pen, 0, 10, r, 0.24, 1.5, fade * 0.92, band4, FRONT_HALF, u < 0.3);
        }

        drawStarburstFlare(
          pen,
          baseRadius * 0.66,
          0,
          9.0 * fade,
          fade * 0.94,
          [cyan[4], gold[5], cyan[6], PURE_WHITE]
        );
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 3. 2.5D TEMPEST CYCLONE RING (`tempestCycloneRing`)
// ============================================================================
export const tempestCycloneRing = {
  duration: 0.62,
  loop: false,
  defaults: { palette: RUNIC_CYAN_PALETTE, seed: 127 },
  create(cfg) {
    const cyan = buildColorRamp(cfg.palette, 8);
    const gold = buildColorRamp(RUNIC_GOLD_PALETTE, 8);
    const bandCyan = [cyan[2], cyan[5], gold[5], PURE_WHITE];
    const bandGold = [gold[2], gold[5], cyan[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, cyan[6], gold[5], cyan[4]] });
    let t = 0;
    let acc = 0;

    return {
      step(dt) {
        t += dt;
        acc += dt * 52;
        while (acc >= 1 && t < 0.54) {
          acc -= 1;
          const a = rng.between(0, Math.PI * 2);
          const r = rng.between(22, 38);
          motes.emit(
            rng.chance(0.55) ? 'glint' : 'streak',
            Math.cos(a) * r,
            Math.sin(a) * r * 0.24 + rng.between(-18, 6),
            -Math.sin(a) * 115,
            rng.between(-52, 12),
            rng.between(0.14, 0.28),
            rng.chance(0.38) ? gold[5] : cyan[5],
            1.0,
            0
          );
        }
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 0.62);
        const env = Math.sin(u * Math.PI);
        if (env <= 0.02) return;

        drawTiltedOrbitBand(pen, 0, 8, 38, 0.24, 1.9, 0.88 * env, bandCyan, BACK_HALF, false);
        drawTiltedOrbitBand(pen, 0, -6, 31, 0.22, 1.6, 0.84 * env, bandGold, BACK_HALF, false);
        drawTiltedOrbitBand(pen, 0, -20, 24, 0.20, 1.4, 0.78 * env, bandCyan, BACK_HALF, false);

        for (let i = 0; i < 6; i++) {
          const a = u * Math.PI * 5.0 + (i * Math.PI) / 3;
          if (Math.sin(a) >= 0) continue;
          drawPixelElderRune(
            pen,
            Math.cos(a) * 38,
            8 + Math.sin(a) * 38 * 0.24,
            2.1,
            i % 2 === 0 ? cyan[5] : gold[5],
            PURE_WHITE,
            env * 0.9
          );
        }
      },
      renderFront(pen) {
        const u = clamp01(t / 0.62);
        const env = Math.sin(u * Math.PI);
        if (env <= 0.02) return;

        drawTiltedOrbitBand(pen, 0, 8, 38, 0.24, 2.1, 0.96 * env, bandCyan, FRONT_HALF, true);
        drawTiltedOrbitBand(pen, 0, -6, 31, 0.22, 1.75, 0.92 * env, bandGold, FRONT_HALF, false);
        drawTiltedOrbitBand(pen, 0, -20, 24, 0.20, 1.5, 0.86 * env, bandCyan, FRONT_HALF, true);

        const spinHead = u * Math.PI * 5.0;
        drawMultiLayerCrescentArc(pen, {
          cx: 0,
          cy: -2,
          radius: 36,
          width: 9.5,
          eccentricity: 0.28,
          headAngle: spinHead,
          tailAngle: spinHead - 2.35,
          fade: env * 0.94,
          ramp: cyan,
          seed: cfg.seed || 127,
          t,
          flashHot: true
        });
        drawMultiLayerCrescentArc(pen, {
          cx: 0,
          cy: -10,
          radius: 29,
          width: 8.0,
          eccentricity: 0.26,
          headAngle: spinHead + Math.PI,
          tailAngle: spinHead + Math.PI - 2.15,
          fade: env * 0.88,
          ramp: gold,
          seed: (cfg.seed || 127) + 31,
          t,
          flashHot: false
        });

        for (let i = 0; i < 6; i++) {
          const a = spinHead + (i * Math.PI) / 3;
          if (Math.sin(a) < 0) continue;
          drawPixelElderRune(
            pen,
            Math.cos(a) * 38,
            8 + Math.sin(a) * 38 * 0.24,
            2.4,
            i % 2 === 0 ? cyan[6] : gold[6],
            PURE_WHITE,
            env * 0.96
          );
        }
        motes.render(pen);
      }
    };
  }
};

/**
 * Render a sharp, multi-faceted HD-2D Glacial Frost-Crystal / Runic Ice Spire (`drawRunicGlacialCrystalSpire`)
 * erupting from `(baseX, baseY)` with a curved 2.5D elliptical frost-crater base (`botCurve`),
 * 1px `#06182c` dark sapphire selective outline, stepped hexagonal crystal facets (`cyan[2..6]`),
 * internal diagonal frost-refraction seams, central prism ridge, and glowing golden Elder-Rune engravings.
 */
export function drawRunicGlacialCrystalSpire(
  pen,
  baseX,
  baseY,
  height,
  baseW,
  tiltX,
  cyan,
  gold,
  env = 1
) {
  if (env <= 0.02 || height <= 3.5 || baseW <= 2.0) return;
  const DARK_SAPPHIRE = packHexColor('#06182c');
  const halfBaseW = baseW * 0.5;
  const topY = baseY - height;
  const botMaxY = baseY + 4.2;
  const isCell = pen.w === 104 && pen.h === 104;

  const yMin = Math.floor(topY - 1);
  const yMax = Math.ceil(botMaxY + 1);

  for (let ly = yMin; ly <= yMax; ly++) {
    let hFrac = 0;
    let spireCx = baseX;
    let halfW = halfBaseW;

    if (ly <= baseY) {
      hFrac = clamp01((baseY - ly) / Math.max(1, height));
      spireCx = baseX + tiltX * hFrac;
      if (hFrac < 0.62) {
        // Faceted hexagonal crystal shaft with subtle stepped shoulder taper
        halfW = halfBaseW * (1.0 - hFrac * 0.28);
      } else {
        // Razor-sharp pyramidal diamond crystal point (`hFrac = 0.62 .. 1.0`)
        const tipU = (hFrac - 0.62) / 0.38;
        halfW = halfBaseW * 0.826 * Math.pow(Math.max(0, 1 - tipU), 0.86);
      }
    } else {
      // Below `baseY`: curved 2.5D elliptical frost-crater base
      hFrac = 0;
      spireCx = baseX;
      halfW = halfBaseW;
    }

    const maxDx = Math.ceil(halfW + 1);
    for (let dx = -maxDx; dx <= maxDx; dx++) {
      const adx = Math.abs(dx);
      if (adx > halfW + 0.25) continue;

      const lx = spireCx + dx;
      const baseDx = lx - baseX;
      const normBaseDx = Math.min(1, (baseDx / Math.max(1, halfBaseW)) ** 2);
      const botCurve = baseY + Math.sqrt(Math.max(0, 1 - normBaseDx)) * 4.2;
      if (ly > botCurve || ly < topY) continue;

      const sx = pen.gridX(lx, ly);
      const sy = pen.gridY(lx, ly);
      if (isCell && (sx < 4 || sx > 99 || sy < 4 || sy > 99)) continue;

      // 1. Crisp 1px `#06182c` dark sapphire selective outline (`Selout`)
      const isOutline =
        adx >= halfW - 0.95 ||
        ly <= topY + 1.15 ||
        ly >= botCurve - 0.95;
      if (isOutline) {
        pen.writeRawStipple(sx, sy, DARK_SAPPHIRE, env * 0.98);
        continue;
      }

      // 2. Central bright white/cyan prism ridge along the crystal spine
      const ridgeW = Math.max(0.72, halfW * 0.16);
      if (adx <= ridgeW) {
        const ridgeCol = hFrac > 0.52 || adx < 0.45 ? PURE_WHITE : cyan[5];
        pen.writeRawStipple(sx, sy, ridgeCol, env);
        pen.writeRawGlow(sx, sy, cyan[5], 0.22 * env);
        continue;
      }

      // 3. Glowing golden Elder-Rune engravings near the lower third (`0.12 <= hFrac <= 0.44`)
      if (hFrac >= 0.12 && hFrac <= 0.44 && adx <= halfW * 0.56) {
        const runeRow = Math.floor((hFrac - 0.12) * 28);
        const isRuneBand =
          (runeRow % 3 === 0 && adx >= ridgeW + 0.5 && adx <= halfW * 0.48) ||
          (runeRow % 3 === 1 && Math.abs(adx - halfW * 0.34) < 0.65);
        if (isRuneBand) {
          const runeCol = runeRow % 6 === 0 ? PURE_WHITE : dx < 0 ? gold[5] : gold[4];
          pen.writeRawStipple(sx, sy, runeCol, env * 0.98);
          pen.writeRawGlow(sx, sy, gold[5], 0.24 * env);
          continue;
        }
      }

      // 4. Internal diagonal frost-refraction seams across the crystal facets
      const seamVal = (((lx * 0.72 + ly * 0.46) % 6.5) + 6.5) % 6.5;
      if (Math.abs(seamVal - 3.25) < 0.55 && hFrac > 0.08 && hFrac < 0.88) {
        const seamCol = dx < 0 ? PURE_WHITE : cyan[5];
        pen.writeRawStipple(sx, sy, seamCol, env * 0.96);
        continue;
      }

      // 5. Basal frost-rime snow glow where the spire erupts out of the ground crater (`hFrac < 0.09`)
      if (hFrac < 0.09 && ly <= baseY + 2.2) {
        const rimeCol = dx < 0 ? cyan[6] : cyan[4];
        pen.writeRawStipple(sx, sy, rimeCol, env * 0.96);
        continue;
      }

      // 6. Stepped left/right polygonal crystal prism facets
      let facetCol;
      if (dx < 0) {
        // Left sunlit glacial facets (`cyan[4]` electric frost highlight & `cyan[6]` bright ice bevel)
        facetCol = adx > halfW * 0.52 ? cyan[4] : hFrac > 0.66 ? PURE_WHITE : cyan[6];
      } else {
        // Right shaded sapphire facets (`cyan[3]` glacial blue mid-facet & `cyan[2]` deep sapphire shadow)
        facetCol = adx < halfW * 0.48 ? cyan[3] : cyan[2];
      }
      pen.writeRawStipple(sx, sy, facetCol, env * 0.97);
    }
  }

  // Specular frost glint at the crystal apex & radial core glow
  const tipX = baseX + tiltX;
  const tipGlintY = Math.max(isCell ? -44 : topY, topY + 1);
  pen.stipple(tipX, tipGlintY, PURE_WHITE, env);
  pen.radialGlow(
    baseX + tiltX * 0.45,
    baseY - height * 0.42,
    Math.max(4, halfBaseW * 1.45),
    cyan[5],
    0.26 * env
  );
}

/**
 * Shared 5-Spire Faceted Glacial Frost-Crystal Monolith Cluster + Curved 2.5D Frost-Rune Crater Base.
 * Used by both `skyJudgmentBladePillarCell` (Row 2 of `warrior_vfx.png`, `baseY = 34`)
 * and `blinkTeleportPillar` (`skyJudgmentPillar`).
 */
function drawGlacialCrystalMonolithCluster(
  pen,
  baseY,
  pop,
  u,
  env,
  cyan,
  gold,
  band4,
  goldBand4,
  rng,
  isBack = false,
  heightScale = 1.0
) {
  if (env <= 0.02) return;
  const craterRx = 28 * pop;
  const innerRx = 18 * pop;
  const aspectY = 0.20;

  if (isBack) {
    drawTiltedOrbitBand(pen, 0, baseY, craterRx, aspectY, 1.65, 0.9 * env, band4, BACK_HALF, false);
    drawTiltedOrbitBand(pen, 0, baseY, innerRx, aspectY, 1.35, 0.84 * env, goldBand4, BACK_HALF, false);
    drawElderStarCross(pen, 0, baseY, 25 * pop, 12 * pop, aspectY, u * 2.4, cyan[5], gold[5], 0.85 * env, BACK_HALF);
    return;
  }

  const hScale = pop * heightScale;
  // 1. Outer flanking Glacial Frost-Crystal Spires (`tilts: -16, +16`, height `32px`)
  drawRunicGlacialCrystalSpire(pen, -14 * pop, baseY, 32 * hScale, 10.0 * pop, -16 * pop, cyan, gold, env * 0.94);
  drawRunicGlacialCrystalSpire(pen, 14 * pop, baseY, 32 * hScale, 10.0 * pop, 16 * pop, cyan, gold, env * 0.94);

  // 2. Inner flanking Glacial Frost-Crystal Spires (`tilts: -8, +8`, height `48px`)
  drawRunicGlacialCrystalSpire(pen, -7 * pop, baseY, 48 * hScale, 13.0 * pop, -8 * pop, cyan, gold, env * 0.97);
  drawRunicGlacialCrystalSpire(pen, 7 * pop, baseY, 48 * hScale, 13.0 * pop, 8 * pop, cyan, gold, env * 0.97);

  // 3. Towering Central Glacial Frost-Crystal Monolith Spire (`tilt: 0`, height `68px`)
  drawRunicGlacialCrystalSpire(pen, 0, baseY, 68 * hScale, 16.5 * pop, 0, cyan, gold, env);

  // 4. Crackling Sapphire-Gold Runic Frost Lightning along the central crystal monolith
  const mainH = 68 * hScale;
  const spireChain = buildLightningChain(rng, 0, baseY - mainH * 0.92, 0, baseY - 2, 0.14, 4);
  pen.polyline(spireChain, gold[6], 0.88 * env);
  pen.polyline(spireChain, PURE_WHITE, 0.95 * env);

  // 5. Erupting Frost-Shard Debris orbiting & rising around the crystal spires
  const DARK_SAPPHIRE = packHexColor('#06182c');
  for (let s = 0; s < 8; s++) {
    const su = (u * 1.65 + s / 8) % 1;
    const side = s % 2 === 0 ? -1 : 1;
    const sx = side * (9 + (s % 4) * 5.2) * pop + Math.sin(u * 8 + s) * 2.0;
    const sy = baseY - 6 - su * (mainH * 0.78);
    if (pen.w === 104 && (sy < -42 || sy > 42 || Math.abs(sx) > 40)) continue;
    pen.fillCircle(sx, sy, 2.1, DARK_SAPPHIRE, env * (1 - su * 0.5));
    pen.fillCircle(sx, sy, 1.3, s % 3 === 0 ? gold[5] : cyan[5], env * (1 - su * 0.45));
    pen.stipple(sx, sy - 0.5, PURE_WHITE, env * (1 - su * 0.45));
  }

  // 6. Front half of the Curved 2.5D Frost-Rune Crater Base at `cy: baseY`
  drawTiltedOrbitBand(pen, 0, baseY, craterRx, aspectY, 1.8, 0.96 * env, band4, FRONT_HALF, u < 0.35);
  drawTiltedOrbitBand(pen, 0, baseY, innerRx, aspectY, 1.4, 0.90 * env, goldBand4, FRONT_HALF, false);
  drawElderStarCross(pen, 0, baseY, 25 * pop, 12 * pop, aspectY, u * 2.4, cyan[5], gold[5], 0.92 * env, FRONT_HALF);

  for (let d = 0; d < 6; d++) {
    const a = u * 3.0 + (d * Math.PI) / 3;
    if (Math.sin(a) < 0) continue;
    drawPixelElderRune(
      pen,
      Math.cos(a) * craterRx,
      baseY + Math.sin(a) * craterRx * aspectY,
      2.1,
      d % 2 === 0 ? cyan[6] : gold[5],
      PURE_WHITE,
      env
    );
  }

  drawStarburstFlare(pen, 0, baseY - 2, 9.5 * pop, 0.95 * env, [cyan[4], gold[5], cyan[6], PURE_WHITE]);
}

// ============================================================================
// 4. 2.5D ELDER-RUNE BLINK TELEPORT PILLAR & DOMAIN (`blinkTeleportPillar`)
// ============================================================================
export const blinkTeleportPillar = {
  duration: 0.42,
  loop: false,
  defaults: {
    palette: RUNIC_CYAN_PALETTE,
    seed: 157,
    heightWorld: 188,
    isSky: false,
    isDomain: false
  },
  create(cfg) {
    const cyan = buildColorRamp(cfg.palette, 8);
    const gold = buildColorRamp(RUNIC_GOLD_PALETTE, 8);
    const band4 = [cyan[2], cyan[5], gold[6], PURE_WHITE];
    const goldBand4 = [gold[2], gold[5], cyan[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, cyan[6], gold[5], cyan[4]], floorY: 0 });
    const totalDur = cfg.customDuration || (cfg.isDomain ? 1.65 : 0.42);
    let t = 0;
    let acc = 0;

    return {
      step(dt) {
        t += dt;
        acc += dt * (cfg.isDomain ? 40 : 54);
        while (acc >= 1 && t < totalDur * 0.86) {
          acc -= 1;
          const maxR = cfg.isDomain ? 52 : 22;
          const a = rng.between(0, Math.PI * 2);
          const r = rng.between(4, maxR);
          motes.emit(
            rng.chance(0.55) ? 'glint' : 'spark',
            Math.cos(a) * r,
            Math.sin(a) * r * 0.22 - 2,
            rng.between(-14, 14),
            rng.between(-95, -28),
            rng.between(0.18, 0.36),
            rng.chance(0.4) ? gold[5] : cyan[5],
            1.05,
            -18
          );
        }
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / totalDur);
        const pop = smoothStep(0, 0.14, u);
        const fade = cfg.isDomain ? 1 - smoothStep(0.82, 1.0, u) : 1 - u;
        const env = pop * fade;
        if (env <= 0.02) return;

        if (cfg.isDomain) {
          drawTiltedOrbitBand(pen, 0, 0, 52 * pop, 0.22, 1.7, 0.88 * env, band4, BACK_HALF, false);
          drawTiltedOrbitBand(pen, 0, 0, 32 * pop, 0.22, 1.3, 0.80 * env, goldBand4, BACK_HALF, false);
          drawElderStarCross(pen, 0, 0, 48 * pop, 24 * pop, 0.22, t * 2.4, cyan[5], gold[5], 0.78 * env, BACK_HALF);
          for (let d = 0; d < 8; d++) {
            const a = -t * 3.2 + (d * Math.PI) / 4;
            if (Math.sin(a) >= 0) continue;
            drawPixelElderRune(
              pen,
              Math.cos(a) * 52 * pop,
              Math.sin(a) * 52 * pop * 0.22,
              2.5,
              d % 2 === 0 ? cyan[5] : gold[5],
              PURE_WHITE,
              env
            );
          }
          return;
        }

        const baseY = pen.w === 104 ? 34 : 1;
        drawGlacialCrystalMonolithCluster(pen, baseY, pop, u, env, cyan, gold, band4, goldBand4, rng, true);
      },
      renderFront(pen) {
        const u = clamp01(t / totalDur);
        const pop = smoothStep(0, 0.14, u);
        const fade = cfg.isDomain ? 1 - smoothStep(0.82, 1.0, u) : 1 - u;
        const env = pop * fade;
        if (env <= 0.02) return;

        if (cfg.isDomain) {
          drawTiltedOrbitBand(pen, 0, 0, 52 * pop, 0.22, 1.9, 0.96 * env, band4, FRONT_HALF, true);
          drawTiltedOrbitBand(pen, 0, 0, 32 * pop, 0.22, 1.4, 0.88 * env, goldBand4, FRONT_HALF, false);
          drawElderStarCross(pen, 0, 0, 48 * pop, 24 * pop, 0.22, t * 2.4, cyan[5], gold[5], 0.86 * env, FRONT_HALF);
          for (let d = 0; d < 8; d++) {
            const a = -t * 3.2 + (d * Math.PI) / 4;
            if (Math.sin(a) < 0) continue;
            drawPixelElderRune(
              pen,
              Math.cos(a) * 52 * pop,
              Math.sin(a) * 52 * pop * 0.22,
              2.8,
              d % 2 === 0 ? cyan[6] : gold[6],
              PURE_WHITE,
              env
            );
          }
          motes.render(pen);
          return;
        }

        const baseY = pen.w === 104 ? 34 : 1;
        const hScale = Math.min(1.15, Math.max(0.75, (cfg.heightWorld || 188) / 188));
        drawGlacialCrystalMonolithCluster(pen, baseY, pop, u, env, cyan, gold, band4, goldBand4, rng, false, hScale);
        motes.render(pen);
      }
    };
  }
};

export const skyJudgmentPillar = blinkTeleportPillar;


// ============================================================================
// 5. 2.5D EARTHSHATTER JUDGMENT WAVE (`earthshatterJudgmentWave`)
// ============================================================================
export const earthshatterJudgmentWave = {
  duration: 0.72,
  loop: false,
  defaults: { palette: RUNIC_CYAN_PALETTE, seed: 193, isUltimate: true },
  create(cfg) {
    const cyan = buildColorRamp(cfg.palette, 8);
    const gold = buildColorRamp(RUNIC_GOLD_PALETTE, 8);
    const band4 = [cyan[2], cyan[5], gold[6], PURE_WHITE];
    const goldBand4 = [gold[2], gold[5], cyan[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, cyan[6], gold[5], cyan[4]], floorY: 2 });
    const DARK_SAPPHIRE = packHexColor('#06182c');
    let t = 0;
    let burstDone = false;

    return {
      step(dt) {
        if (!burstDone) {
          burstDone = true;
          for (let i = 0; i < 28; i++) {
            const rx = rng.between(-44, 62);
            motes.emit(
              i % 2 === 0 ? 'glint' : 'spark',
              rx,
              0,
              rx * 2.2,
              rng.between(-135, -48),
              rng.between(0.24, 0.52),
              i % 3 === 0 ? gold[5] : cyan[5],
              1.22,
              110
            );
          }
        }
        t += dt;
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 0.72);
        const pop = smoothStep(0, 0.16, u);
        const fade = 1 - Math.pow(u, 1.45);
        if (fade <= 0.02) return;

        // Curved 2.5D Frost Shockwaves anchored directly on the ground (`cy: 0`)
        drawTiltedOrbitBand(pen, 0, 0, 56 * pop, 0.22, 2.0, 0.88 * fade, band4, BACK_HALF, false);
        drawTiltedOrbitBand(pen, 0, 0, 36 * pop, 0.22, 1.6, 0.82 * fade, goldBand4, BACK_HALF, false);
        drawElderStarCross(pen, 0, 0, 48 * pop, 22 * pop, 0.22, u * 2.2, cyan[5], gold[5], 0.82 * fade, BACK_HALF);

        // Glowing Frost-Fissure Crack tearing along `y = 0..+8` from `x = -44` to `x = +66`
        const reachU = smoothStep(0, 0.42, u);
        const maxX = -44 + 110 * reachU;
        const fissureChain = buildLightningChain(rng, -44, 3, maxX, 4, 0.08, 4);
        for (let i = 1; i < fissureChain.length; i++) {
          const [x0, y0] = fissureChain[i - 1];
          const [x1, y1] = fissureChain[i];
          const cy0 = Math.max(0, Math.min(8, y0));
          const cy1 = Math.max(0, Math.min(8, y1));
          pen.line(x0, cy0 + 2, x1, cy1 + 2, DARK_SAPPHIRE, 0.96 * fade);
          pen.line(x0, cy0 - 1, x1, cy1 - 1, DARK_SAPPHIRE, 0.94 * fade);
          pen.line(x0, cy0 + 1, x1, cy1 + 1, cyan[4], 0.95 * fade);
          pen.line(x0, cy0, x1, cy1, i % 2 === 0 ? PURE_WHITE : gold[5], 0.98 * fade);
        }
      },
      renderFront(pen) {
        const u = clamp01(t / 0.72);
        const pop = smoothStep(0, 0.16, u);
        const fade = 1 - Math.pow(u, 1.45);
        if (fade <= 0.02) return;

        // Chaining 7-Spire Faceted Glacial Frost-Crystal Wave erupting directly out of `y = 0` (`baseY = 2`)
        // marching forward (`x` from `-44` to `+66` as `u` progresses)
        const spireHeights = cfg.isUltimate !== false
          ? [38, 48, 58, 68, 62, 52, 42]
          : [30, 38, 46, 56, 50, 42, 34];
        const spireWidths = [10.5, 12.0, 14.0, 16.5, 15.0, 13.0, 11.0];

        for (let i = 0; i < 7; i++) {
          const spireX = -44 + i * (110 / 6);
          const delayU = i * 0.052;
          if (u <= delayU) continue;
          const localU = clamp01((u - delayU) / Math.max(0.18, 0.92 - delayU));
          const spirePop = smoothStep(0, 0.22, localU);
          const spireFade = 1 - smoothStep(0.76, 1.0, localU);
          const spireEnv = spirePop * spireFade * fade;
          if (spireEnv <= 0.02) continue;

          const h = spireHeights[i] * spirePop;
          const w = spireWidths[i] * (0.65 + 0.35 * spirePop);
          const tiltX = (-6 + i * 3.8) * spirePop;

          // Secondary basal frost-crystal shard flanking the main spire
          drawRunicGlacialCrystalSpire(
            pen,
            spireX + (i % 2 === 0 ? -5.5 : 5.5),
            3,
            h * 0.52,
            w * 0.65,
            tiltX * 1.25,
            cyan,
            gold,
            spireEnv * 0.92
          );

          // Primary multi-faceted Glacial Frost-Crystal Spire erupting out of `y = 2`
          drawRunicGlacialCrystalSpire(pen, spireX, 2, h, w, tiltX, cyan, gold, spireEnv);
        }

        // Front half of the Curved 2.5D Frost Shockwaves anchored at `cy: 0`
        drawTiltedOrbitBand(pen, 0, 0, 56 * pop, 0.22, 2.2, 0.96 * fade, band4, FRONT_HALF, true);
        drawTiltedOrbitBand(pen, 0, 0, 36 * pop, 0.22, 1.7, 0.90 * fade, goldBand4, FRONT_HALF, false);
        drawElderStarCross(pen, 0, 0, 48 * pop, 22 * pop, 0.22, u * 2.2, cyan[5], gold[5], 0.90 * fade, FRONT_HALF);

        for (let d = 0; d < 8; d++) {
          const a = u * 2.6 + (d * Math.PI) / 4;
          if (Math.sin(a) < 0) continue;
          drawPixelElderRune(
            pen,
            Math.cos(a) * 56 * pop,
            Math.sin(a) * 56 * pop * 0.22,
            2.6,
            d % 2 === 0 ? cyan[6] : gold[5],
            PURE_WHITE,
            fade
          );
        }

        if (u < 0.68) {
          const bolt = buildLightningChain(rng, 11, -64, 11, 2, 0.15, 4);
          pen.polyline(bolt, cyan[5], fade * 0.92);
          pen.polyline(
            bolt.map((p) => [p[0] + 1, p[1]]),
            gold[6],
            fade * 0.88
          );
          pen.polyline(bolt, PURE_WHITE, fade * 0.98);
        }
        drawStarburstFlare(pen, 0, 0, 12.5 * fade, fade * 0.96, [cyan[4], gold[5], cyan[6], PURE_WHITE]);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// BAKED 30FPS `warrior_vfx.png` 5-ROW CELLS (`104x104` logical -> `208x208` 2x)
// Strictly bounded inside `[-42, +42]` around `(52, 52)` so borderClips = 0/150!
//   Row 0 (`y=0`):   `runebladeWaveArcCell`         — Frost-Crescent Runeblade Wave Arc (`blade_wave`)
//   Row 1 (`y=208`): `aegisRuneCrestCell`           — Winged Sapphire-Gold Aegis Shield & Runeblade Crest
//   Row 2 (`y=416`): `skyJudgmentBladePillarCell`   — Glacial Frost-Crystal Spire & Sky-Judgment Pillar
//   Row 3 (`y=624`): `elderRunicSanctuarySealCell`  — 8-Rune Elder Runic Sanctuary Mandala & Vanguard Crest
//   Row 4 (`y=832`): `omnislashStarburstNovaCell`   — Omnislash Cross-Cleave & Starburst Impact Nova
// ============================================================================

export const runebladeWaveArcCell = {
  duration: 1.0,
  loop: true,
  defaults: { palette: RUNIC_CYAN_PALETTE, seed: 501 },
  create(cfg) {
    const cyan = buildColorRamp(cfg.palette, 8);
    const gold = buildColorRamp(RUNIC_GOLD_PALETTE, 8);
    const rng = new DeterministicRng(cfg.seed);

    return {
      step() {},
      renderFront(pen, localT) {
        const ph = localT * Math.PI * 2;

        // Multi-layer Frost-Crescent Runeblade Wave facing `+X`, strictly inside `[-38, +38]`
        drawMultiLayerCrescentArc(pen, {
          cx: -5,
          cy: 0,
          radius: 24,
          width: 9.2,
          eccentricity: 0.92,
          headAngle: 1.22,
          tailAngle: -1.22,
          fade: 0.98,
          ramp: cyan,
          seed: cfg.seed || 501,
          t: localT,
          flashHot: true
        });

        drawMultiLayerCrescentArc(pen, {
          cx: -8,
          cy: 0,
          radius: 17,
          width: 6.2,
          eccentricity: 0.90,
          headAngle: 1.05,
          tailAngle: -1.05,
          fade: 0.88,
          ramp: gold,
          seed: (cfg.seed || 501) + 17,
          t: localT,
          flashHot: false
        });

        const arcPts = [];
        for (let k = -4; k <= 4; k++) {
          const ny = k / 4;
          arcPts.push([
            19 * (1 - ny * ny) - 2 + Math.sin(ph * 2 + k * 1.1) * 1.8,
            ny * 25
          ]);
        }
        pen.polyline(arcPts, gold[6], 0.9);
        pen.polyline(
          arcPts.map((p) => [p[0] + 1, p[1]]),
          PURE_WHITE,
          0.95
        );

        // Deterministic orbiting frost-gold glints inside `[-32, +32]`
        for (let i = 0; i < 6; i++) {
          const uM = (localT * 2 + i / 6) % 1;
          const mx = 16 - uM * 36;
          const my = ((i % 2 === 0 ? 1 : -1) * (6 + (i % 3) * 7)) + Math.sin(ph + i) * 2.5;
          drawPixelElderRune(pen, mx, my, 1.6, i % 2 === 0 ? cyan[5] : gold[5], PURE_WHITE, 1 - uM * 0.7);
        }

        drawStarburstFlare(pen, 19, 0, 7.2, 0.94, [cyan[4], gold[5], cyan[6], PURE_WHITE]);
        void rng;
      }
    };
  }
};

export const aegisRuneCrestCell = {
  duration: 1.0,
  loop: false,
  defaults: { palette: RUNIC_CYAN_PALETTE, seed: 513 },
  create(cfg) {
    const cyan = buildColorRamp(cfg.palette, 8);
    const gold = buildColorRamp(RUNIC_GOLD_PALETTE, 8);
    const band4 = [cyan[2], cyan[5], gold[6], PURE_WHITE];
    const goldBand4 = [gold[2], gold[5], cyan[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);

    return {
      step() {},
      renderFront(pen, localT) {
        const u = clamp01(localT);
        const pop = 0.78 + 0.22 * smoothStep(0, 0.18, u);
        const fade = 1 - smoothStep(0.82, 1.0, u);
        const env = (0.9 + 0.1 * Math.sin(u * Math.PI)) * fade;
        if (env <= 0.02) return;

        // 1. Sapphire-Gold Runic Halo & Elder Star-Cross Backing (strictly inside `[-36, +36]`)
        drawTiltedOrbitBand(pen, 0, 0, 29 * pop, 0.92, 1.5, 0.9 * env, band4, null, false);
        drawElderStarCross(pen, 0, 0, 27 * pop, 12 * pop, 0.92, u * 2.2, cyan[5], gold[5], 0.86 * env);

        // 2. Crossed Diagonal Runic Greatswords (`±38°` X-cross behind the Kite-Shield, 100% inside cell!)
        const crossAngle = (38 * Math.PI) / 180;
        const swordLen = 52 * pop;
        // Sword 1: Tip at bottom-right `(+16, +20)` -> Pommel at top-left `(-16, -21)`
        drawRunicGreatswordSilhouette(
          pen,
          16 * pop,
          20 * pop,
          swordLen,
          3.8 * pop,
          -crossAngle,
          cyan,
          gold,
          env * 0.95,
          false
        );
        // Sword 2: Tip at bottom-left `(-16, +20)` -> Pommel at top-right `(+16, -21)`
        drawRunicGreatswordSilhouette(
          pen,
          -16 * pop,
          20 * pop,
          swordLen,
          3.8 * pop,
          crossAngle,
          cyan,
          gold,
          env * 0.95,
          false
        );

        // 3. Sweeping Aegis Shockwave Crescent Wings during impact pulse (`u >= 0.35`)
        if (u >= 0.32) {
          const wu = clamp01((u - 0.32) / 0.68);
          const wFade = (1 - wu * 0.65) * env;
          drawMultiLayerCrescentArc(pen, {
            cx: -2,
            cy: 0,
            radius: (22 + wu * 8) * pop,
            width: 6.8,
            eccentricity: 0.88,
            headAngle: 0.95,
            tailAngle: -0.95,
            fade: wFade * 0.9,
            ramp: cyan,
            seed: cfg.seed || 513,
            t: u,
            flashHot: wu < 0.35
          });
          drawMultiLayerCrescentArc(pen, {
            cx: 2,
            cy: 0,
            radius: (22 + wu * 8) * pop,
            width: 6.8,
            eccentricity: 0.88,
            headAngle: Math.PI - 0.95,
            tailAngle: Math.PI + 0.95,
            fade: wFade * 0.9,
            ramp: gold,
            seed: (cfg.seed || 513) + 19,
            t: u,
            flashHot: wu < 0.35
          });
        }

        // 4. Central Faceted Octagonal Runic Aegis Kite-Shield Emblem
        drawFacetedAegisKiteShield(pen, 0, 1, 0.92 * pop, cyan, gold, env);

        // 5. Front 2.5D Tilted Aegis Orbit Band & 6 Orbiting Elder Runes
        drawTiltedOrbitBand(pen, 0, 4, 28 * pop, 0.34, 1.5, 0.94 * env, goldBand4, FRONT_HALF, u > 0.3 && u < 0.65);
        for (let d = 0; d < 6; d++) {
          const a = u * 3.2 + (d * Math.PI) / 3;
          drawPixelElderRune(
            pen,
            Math.cos(a) * 29 * pop,
            Math.sin(a) * 29 * pop * 0.92,
            2.1,
            d % 2 === 0 ? cyan[6] : gold[5],
            PURE_WHITE,
            env
          );
        }

        const bolt = buildLightningChain(rng, -18 * pop, -16 * pop, 18 * pop, 16 * pop, 0.12, 3);
        pen.polyline(bolt, gold[6], 0.86 * env);
        drawStarburstFlare(pen, 0, -1, 10.5 * pop, env * 0.95, [cyan[4], gold[5], cyan[6], PURE_WHITE]);
      }
    };
  }
};

export const skyJudgmentBladePillarCell = {
  duration: 1.0,
  loop: false,
  defaults: { palette: RUNIC_CYAN_PALETTE, seed: 523 },
  create(cfg) {
    const cyan = buildColorRamp(cfg.palette, 8);
    const gold = buildColorRamp(RUNIC_GOLD_PALETTE, 8);
    const band4 = [cyan[2], cyan[5], gold[6], PURE_WHITE];
    const goldBand4 = [gold[2], gold[5], cyan[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);

    return {
      step() {},
      renderBack(pen, localT) {
        const u = clamp01(localT);
        const pop = 0.72 + 0.28 * smoothStep(0, 0.18, u);
        const fade = 1 - smoothStep(0.82, 1.0, u);
        const env = (0.9 + 0.1 * smoothStep(0, 0.12, u)) * fade;
        if (env <= 0.02) return;

        const baseY = 34;
        drawGlacialCrystalMonolithCluster(pen, baseY, pop, u, env, cyan, gold, band4, goldBand4, rng, true);
      },
      renderFront(pen, localT) {
        const u = clamp01(localT);
        const pop = 0.72 + 0.28 * smoothStep(0, 0.18, u);
        const fade = 1 - smoothStep(0.82, 1.0, u);
        const env = (0.9 + 0.1 * smoothStep(0, 0.12, u)) * fade;
        if (env <= 0.02) return;

        // 5-Spire Faceted Glacial Frost-Crystal Monolith Cluster (`tilts: -16, -8, 0, +8, +16`,
        // heights up to 68px for the central spire, 48px and 32px for the flanking spires)
        // anchored at `baseY = 34` (`y = 86` in `104x104`), with curved 2.5D frost-rune crater base & frost-shard debris!
        const baseY = 34;
        drawGlacialCrystalMonolithCluster(pen, baseY, pop, u, env, cyan, gold, band4, goldBand4, rng, false, 1.0);
      }
    };
  }
};


export const elderRunicSanctuarySealCell = {
  duration: 1.0,
  loop: true,
  defaults: { palette: RUNIC_CYAN_PALETTE, seed: 533 },
  create(cfg) {
    const cyan = buildColorRamp(cfg.palette, 8);
    const gold = buildColorRamp(RUNIC_GOLD_PALETTE, 8);
    const band4 = [cyan[2], cyan[5], gold[6], PURE_WHITE];
    const goldBand4 = [gold[2], gold[5], cyan[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);

    return {
      step() {},
      renderFront(pen, localT) {
        const ph = localT * Math.PI * 2;

        // Concentric Elder-Rune Sanctuary Mandala rings strictly inside `[-38, +38]`
        drawTiltedOrbitBand(pen, 0, 0, 32, 1.0, 1.6, 0.94, band4, null, false);
        drawTiltedOrbitBand(pen, 0, 0, 20, 1.0, 1.3, 0.88, goldBand4, null, false);

        // Counter-rotating 8-point Elder Star-Crosses
        drawElderStarCross(pen, 0, 0, 31, 14, 1.0, ph * 0.5, cyan[5], gold[5], 0.9);
        drawElderStarCross(pen, 0, 0, 21, 9, 1.0, -ph * 0.5, gold[5], cyan[6], 0.86);

        // 8 Orbiting Elder-Rune Nodes connected by crackling sapphire-gold arcs
        for (let d = 0; d < 8; d++) {
          const a = ph + (d * Math.PI) / 4;
          const dx = Math.cos(a) * 32;
          const dy = Math.sin(a) * 32;
          if (d % 2 === 0) {
            const na = ph + ((d + 1) * Math.PI) / 4;
            const arc = buildLightningChain(rng, dx, dy, Math.cos(na) * 32, Math.sin(na) * 32, 0.1, 2);
            pen.polyline(arc, cyan[6], 0.84);
          }
          drawPixelElderRune(pen, dx, dy, 3.0, d % 2 === 0 ? gold[5] : cyan[5], PURE_WHITE, 0.98);
        }

        drawStarburstFlare(pen, 0, 0, 13, 0.92, [cyan[4], gold[5], cyan[6], PURE_WHITE]);
      }
    };
  }
};

export const omnislashStarburstNovaCell = {
  duration: 1.0,
  loop: false,
  defaults: { palette: RUNIC_CYAN_PALETTE, seed: 547 },
  create(cfg) {
    const cyan = buildColorRamp(cfg.palette, 8);
    const gold = buildColorRamp(RUNIC_GOLD_PALETTE, 8);
    const band4 = [cyan[2], cyan[5], gold[6], PURE_WHITE];

    return {
      step() {},
      renderFront(pen, localT) {
        const u = clamp01(localT);
        const pop = 0.58 + 0.42 * smoothStep(0, 0.22, u);
        const fade = 1 - smoothStep(0.72, 1.0, u);
        const env = (0.9 + 0.1 * smoothStep(0, 0.14, u)) * fade;
        if (env <= 0.02) return;

        // Multi-layer Runeblade Crescent Arc + 4 Crisscrossing Omnislash Cuts inside `[-38, +38]`
        drawMultiLayerCrescentArc(pen, {
          cx: -2,
          cy: 0,
          radius: 24 * pop,
          width: 8.2,
          eccentricity: 0.92,
          headAngle: 1.3 + u * 0.4,
          tailAngle: -1.3 + u * 0.4,
          fade: env,
          ramp: cyan,
          seed: cfg.seed || 547,
          t: u,
          flashHot: u < 0.45
        });

        const r = 30 * pop;
        for (let k = 0; k < 4; k++) {
          const a = u * 2.1 + (k * Math.PI) / 4;
          const x0 = Math.cos(a) * r;
          const y0 = Math.sin(a) * r;
          pen.line(-x0, -y0, x0, y0, k % 2 === 0 ? cyan[5] : gold[5], 0.9 * env);
          pen.line(-x0 * 0.82, -y0 * 0.82, x0 * 0.82, y0 * 0.82, PURE_WHITE, 0.96 * env);
        }

        drawTiltedOrbitBand(pen, 0, 0, 29 * pop, 0.42, 1.5, 0.92 * env, band4, null, u < 0.35);
        drawStarburstFlare(pen, 0, 0, 13 * pop, 0.95 * env, [cyan[4], gold[5], cyan[6], PURE_WHITE]);
      }
    };
  }
};

// ============================================================================
// LIVE 120HZ CONSECRATED CATHEDRAL SKY-RAYS & ELDER-RUNE DOMAIN
// Gives Aethelgard epic arena-wide sacred atmosphere WITHOUT overwriting the stage background!
// ============================================================================
export const celestialCathedralConsecration = {
  duration: 2.45,
  loop: false,
  defaults: {
    palette: RUNIC_CYAN_PALETTE,
    seed: 557,
    spanScale: 1.0
  },
  create(cfg) {
    const cyan = buildColorRamp(cfg.palette, 8);
    const gold = buildColorRamp(RUNIC_GOLD_PALETTE, 8);
    const band4 = [cyan[2], cyan[5], gold[6], PURE_WHITE];
    const goldBand4 = [gold[2], gold[5], cyan[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed || 557);
    const motes = new MotePool(48);
    let emitAcc = 0;

    return {
      step(dt, localT) {
        motes.step(dt);
        if (localT < 2.1) {
          emitAcc += dt * 26;
          while (emitAcc >= 1) {
            emitAcc -= 1;
            const ang = rng.range(0, Math.PI * 2);
            const r = rng.range(8, 56 * (cfg.spanScale || 1));
            motes.spawn({
              x: Math.cos(ang) * r,
              y: Math.sin(ang) * r * 0.28,
              vx: rng.range(-8, 8),
              vy: rng.range(-54, -22),
              life: rng.range(0.45, 0.92),
              gravity: -12,
              drag: 0.95,
              color: rng.chance(0.32) ? gold[6] : rng.chance(0.5) ? PURE_WHITE : cyan[6],
              bright: true
            });
          }
        }
      },
      renderBack(pen, localT) {
        const u = clamp01(localT / 2.45);
        const fade = smoothStep(0, 0.12, u) * (1 - smoothStep(0.82, 1.0, u));
        if (fade <= 0.02) return;
        const sc = cfg.spanScale || 1.0;

        // 5 Pixel-Stepped Diagonal Heavenly Sapphire-White Cathedral Light-Shafts
        const shafts = [-44, -22, 0, 22, 44];
        for (let i = 0; i < shafts.length; i++) {
          const baseX = shafts[i] * sc;
          const topX = baseX * 0.72 - 8;
          const halfW = (i === 2 ? 7.5 : 4.8) * (0.85 + 0.15 * Math.sin(localT * 5.2 + i));
          for (let y = -168; y <= 4; y += 2) {
            const vFrac = (y + 168) / 172;
            const cx = topX + (baseX - topX) * vFrac;
            const vAlpha = fade * (0.18 + 0.54 * vFrac) * (i === 2 ? 0.85 : 0.58);
            const wCur = halfW * (0.62 + 0.48 * vFrac);
            pen.line(cx - wCur, y, cx + wCur, y, cyan[3], vAlpha * 0.55);
            pen.line(cx - wCur * 0.55, y, cx + wCur * 0.55, y, cyan[6], vAlpha * 0.72);
            if (i === 2 || y % 4 === 0) {
              pen.line(cx - wCur * 0.22, y, cx + wCur * 0.22, y, PURE_WHITE, vAlpha * 0.85);
            }
          }
        }

        // Back halves of 2.5D Consecrated Elder-Rune Floor Rings
        drawTiltedOrbitBand(pen, 0, 0, 52 * sc, 0.28, 1.8, 0.9 * fade, band4, BACK_HALF, false);
        drawTiltedOrbitBand(pen, 0, 0, 32 * sc, 0.28, 1.4, 0.86 * fade, goldBand4, BACK_HALF, false);
        drawElderStarCross(pen, 0, 0, 48 * sc, 21 * sc, 0.28, localT * 1.4, cyan[5], gold[5], 0.82 * fade, BACK_HALF);
      },
      renderFront(pen, localT) {
        const u = clamp01(localT / 2.45);
        const fade = smoothStep(0, 0.12, u) * (1 - smoothStep(0.82, 1.0, u));
        if (fade <= 0.02) return;
        const sc = cfg.spanScale || 1.0;

        drawTiltedOrbitBand(pen, 0, 0, 52 * sc, 0.28, 1.8, 0.95 * fade, band4, FRONT_HALF, u < 0.25);
        drawTiltedOrbitBand(pen, 0, 0, 32 * sc, 0.28, 1.4, 0.9 * fade, goldBand4, FRONT_HALF, false);
        drawElderStarCross(pen, 0, 0, 48 * sc, 21 * sc, 0.28, localT * 1.4, cyan[5], gold[5], 0.88 * fade, FRONT_HALF);

        for (let d = 0; d < 8; d++) {
          const a = localT * 1.8 + (d * Math.PI) / 4;
          if (Math.sin(a) < 0) continue;
          drawPixelElderRune(
            pen,
            Math.cos(a) * 52 * sc,
            Math.sin(a) * 52 * sc * 0.28,
            2.2,
            d % 2 === 0 ? gold[5] : cyan[5],
            PURE_WHITE,
            fade * 0.96
          );
        }
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// NATIVE `208x208` 30FPS SUPREME ULTIMATE CELLS (ROWS 5, 6, 7 OF `warrior_vfx.png`)
// Drawn directly at 1:1 `208x208` resolution (`center = (104, 104)`, bounded `r <= 95` -> 0 border clips!)
//   Row 5 (`y=1040`): `celestialJusticeGreatSlashCell`      — Colossal Diagonal (`/`) Celestial Sword-of-Justice Cleave
//   Row 6 (`y=1248`): `celestialJusticeCathedralPillarCell` — Consecrated Cathedral Light-Column & Sword-Cross Seal
//   Row 7 (`y=1456`): `celestialSeraphimFeatherCell`        — 30fps Fluttering White & Ice-Sapphire Seraphim Pinion Feather
// ============================================================================

function applySelectiveOutlineOnSurface(surface, seloutPacked, alphaByte = 242) {
  const { width: w, height: h, albedo } = surface;
  const edgeMask = new Uint8Array(w * h);
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      const idx = y * w + x;
      if ((albedo[idx] >>> 24) > 28) continue;
      if (
        (albedo[idx - 1] >>> 24) > 96 ||
        (albedo[idx + 1] >>> 24) > 96 ||
        (albedo[idx - w] >>> 24) > 96 ||
        (albedo[idx + w] >>> 24) > 96
      ) {
        edgeMask[idx] = 1;
      }
    }
  }
  const packedEdge = (((alphaByte & 255) << 24) | (seloutPacked & 0x00ffffff)) >>> 0;
  for (let i = 0; i < w * h; i++) {
    if (edgeMask[i]) {
      albedo[i] = packedEdge;
    }
  }
}

export const celestialJusticeGreatSlashCell = {
  duration: 1.0,
  loop: false,
  defaults: { palette: RUNIC_CYAN_PALETTE, seed: 569 },
  create(cfg) {
    const cyan = buildColorRamp(cfg.palette, 8);
    const gold = buildColorRamp(RUNIC_GOLD_PALETTE, 8);
    const rng = new DeterministicRng(cfg.seed || 569);
    const seloutPacked = packHexColor('#051329');
    const colPaleIce = packHexColor('#e0f2fe');
    const colSkyIce = packHexColor('#7dd3fc');
    const colBrightSky = packHexColor('#38bdf8');
    const colDeepSapphire = packHexColor('#0284c7');
    const colRoyalGoldLight = packHexColor('#fef08a');

    // Precompute deterministic ice-diamond & wing-feather glint shards bursting off the slash arc
    const shards = Array.from({ length: 18 }, (_, i) => ({
      sPos: -0.78 + (i / 17) * 1.56,
      nVel: (i % 2 === 0 ? 1 : -1) * (10 + (i % 4) * 5.5),
      tVel: ((i % 3) - 1) * 8,
      size: i % 3 === 0 ? 3.2 : 2.2,
      isGold: i % 4 === 1
    }));

    return {
      step() {},
      renderFront(pen, localT) {
        const u = clamp01(localT);
        const pop = 0.58 + 0.42 * smoothStep(0, 0.16, u);
        const fade = 1 - smoothStep(0.74, 1.0, u);
        const env = smoothStep(0, 0.05, u) * fade;
        if (env <= 0.02) return;

        // Sweeping diagonal (`/`) Sword-of-Justice Crescent from `(-70, -68)` to `(+70, +68)`
        // Bowed forward toward `(+0.699, -0.715)` so flipping X (`ctx.scale(-1, 1)`) creates the exact `\` mirror X-slash with ZERO `ctx.rotate`!
        const span = 70 * pop;
        const invDiag = 1 / Math.hypot(0.715, 0.699);
        const tx = 0.715 * invDiag;
        const ty = 0.699 * invDiag;
        const nx = ty;
        const ny = -tx;
        const bowPeak = (23 + 7 * smoothStep(0, 0.45, u)) * pop;
        const maxHalfThick = (17.5 - 5.8 * smoothStep(0.35, 1.0, u)) * pop;

        // 1. Gap-Free Per-Pixel Cel-Shaded Crescent Blade + Feathered Trailing Plume Serrations
        for (let py = -88; py <= 88; py++) {
          for (let px = -88; px <= 88; px++) {
            if (px * px + py * py > 88 * 88) continue;

            const uAlong = px * tx + py * ty;
            const vPerp = px * nx + py * ny;
            const s = uAlong / Math.max(1, span);
            const absS = Math.abs(s);

            // Progressive slash reveal in early frames (`u < 0.22`)
            const sweepGate = clamp01(u * 6.4 - (s + 1) * 0.48);
            if (sweepGate <= 0.02) continue;

            // Main Celestial Sword-of-Justice Crescent
            if (absS <= 1.0) {
              const profile = Math.pow(Math.max(0, 1 - s * s), 1.08);
              const bow = bowPeak * (1 - s * s);
              const wOff = vPerp - bow;
              const fbm = fbmNoise2D(px * 0.08 + u * 2.2, py * 0.08 - u * 1.6, cfg.seed || 569, 3);
              // Wing-plume serrations along the trailing wake edge (`wOff < 0`)
              const plumeWave = Math.sin(s * 26 - u * 9.0) * 0.14 + (fbm - 0.5) * 0.22;
              const trailThick = maxHalfThick * profile * sweepGate * (1.05 + plumeWave);
              const leadThick = maxHalfThick * profile * sweepGate * 0.74;

              if (wOff >= -trailThick && wOff <= leadThick && leadThick > 0.45) {
                const normW = wOff >= 0 ? (wOff / leadThick) * 0.74 : wOff / Math.max(0.6, trailThick);
                let col;
                let aMul = env;
                let glowK = 0;
                if (normW > 0.36) {
                  col = PURE_WHITE;
                  glowK = 0.34;
                } else if (normW > 0.10) {
                  col = colPaleIce;
                  glowK = 0.22;
                } else if (normW > -0.16 && absS < 0.70) {
                  // Engraved Royal-Gold Fuller Harmonic Spine inside the blade crescent!
                  col = normW > -0.03 ? colRoyalGoldLight : gold[5];
                  glowK = 0.26;
                } else if (normW > -0.44) {
                  col = colSkyIce;
                  glowK = 0.14;
                } else if (normW > -0.74) {
                  col = colBrightSky;
                } else {
                  col = colDeepSapphire;
                  aMul *= 0.90;
                }
                pen.blend(px, py, col, aMul);
                if (glowK > 0) {
                  pen.writeRawGlow(pen.gridX(px, py), pen.gridY(px, py), col, glowK * env);
                }
                continue;
              }
            }

            // Secondary Counter-Harmonic Inner Wing-Slash Ribbon
            if (absS < 0.84) {
              const sSub = s / 0.84;
              const subBow = -10.5 * pop * (1 - sSub * sSub);
              const subDist = Math.abs(vPerp - subBow);
              const subHalfT = 3.2 * (1 - sSub * sSub) * sweepGate;
              if (subDist <= subHalfT && subHalfT > 0.45) {
                const subCol = subDist < subHalfT * 0.48 ? PURE_WHITE : Math.abs(Math.sin(s * 14)) > 0.65 ? gold[6] : colBrightSky;
                pen.blend(px, py, subCol, env * 0.94);
                pen.writeRawGlow(pen.gridX(px, py), pen.gridY(px, py), subCol, 0.18 * env);
              }
            }
          }
        }

        // 2. Crisp 1px Midnight-Sapphire Selective Outline around the sculpted pixel crescent!
        applySelectiveOutlineOnSurface(pen.surface, seloutPacked, Math.round(240 * env));

        // 3. Crackling Celestial Lightning Filaments & Engraved Elder Runes along the Crescent Spine
        if (u < 0.80) {
          const arcBolt = buildLightningChain(
            rng,
            -span * 0.52 + nx * bowPeak * 0.65,
            -span * 0.50 + ny * bowPeak * 0.65,
            span * 0.52 + nx * bowPeak * 0.65,
            span * 0.50 + ny * bowPeak * 0.65,
            0.14,
            4
          );
          pen.polyline(arcBolt, cyan[6], env * 0.9);
          pen.polyline(
            arcBolt.map((p) => [p[0] + 1, p[1] - 1]),
            PURE_WHITE,
            env * 0.96
          );
        }

        for (let rIdx = -2; rIdx <= 2; rIdx++) {
          const rs = rIdx * 0.32;
          const rBow = bowPeak * (1 - rs * rs) * 0.88;
          const rx = tx * rs * span + nx * rBow;
          const ry = ty * rs * span + ny * rBow;
          drawPixelElderRune(
            pen,
            rx,
            ry,
            rIdx === 0 ? 3.2 : 2.3,
            rIdx % 2 === 0 ? gold[5] : cyan[5],
            PURE_WHITE,
            env * 0.95
          );
        }

        // 4. Detaching Faceted Ice-Diamond Shards & Travelling Sword-Edge Starburst Glint
        for (const sh of shards) {
          const baseBow = bowPeak * (1 - sh.sPos * sh.sPos);
          const sx = tx * (sh.sPos * span + sh.tVel * u) + nx * (baseBow + sh.nVel * u);
          const sy = ty * (sh.sPos * span + sh.tVel * u) + ny * (baseBow + sh.nVel * u);
          if (sx * sx + sy * sy > 86 * 86) continue;
          const sCol = sh.isGold ? gold[5] : colBrightSky;
          pen.fillCircle(sx, sy, sh.size + 0.8, seloutPacked, env * 0.88);
          pen.fillCircle(sx, sy, sh.size, sCol, env * 0.94);
          pen.stipple(sx, sy, PURE_WHITE, env);
        }

        const glintS = -0.65 + 1.35 * smoothStep(0, 0.58, u);
        const glintBow = bowPeak * (1 - glintS * glintS);
        const gx = tx * glintS * span + nx * (glintBow + 2);
        const gy = ty * glintS * span + ny * (glintBow + 2);
        drawStarburstFlare(pen, gx, gy, 18 * pop, env * 0.98, [cyan[4], gold[5], cyan[6], PURE_WHITE]);
        drawStarburstFlare(pen, nx * bowPeak, ny * bowPeak, 14 * pop, env * 0.92, [cyan[5], gold[6], PURE_WHITE, PURE_WHITE]);
      }
    };
  }
};

export const celestialJusticeCathedralPillarCell = {
  duration: 1.0,
  loop: false,
  defaults: { palette: RUNIC_CYAN_PALETTE, seed: 577 },
  create(cfg) {
    const cyan = buildColorRamp(cfg.palette, 8);
    const gold = buildColorRamp(RUNIC_GOLD_PALETTE, 8);
    const band4 = [cyan[2], cyan[5], gold[6], PURE_WHITE];
    const goldBand4 = [gold[2], gold[5], cyan[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed || 577);
    const seloutPacked = packHexColor('#051329');
    const colPaleIce = packHexColor('#e0f2fe');
    const colSkyIce = packHexColor('#7dd3fc');

    return {
      step() {},
      renderBack(pen, localT) {
        const u = clamp01(localT);
        const pop = 0.72 + 0.28 * smoothStep(0, 0.16, u);
        const fade = 1 - smoothStep(0.78, 1.0, u);
        const env = smoothStep(0, 0.06, u) * fade;
        if (env <= 0.02) return;

        const baseY = 64;
        drawTiltedOrbitBand(pen, 0, baseY, 54 * pop, 0.30, 2.2, 0.92 * env, band4, BACK_HALF, false);
        drawTiltedOrbitBand(pen, 0, -6, 38 * pop, 0.28, 1.8, 0.86 * env, goldBand4, BACK_HALF, false);
      },
      renderFront(pen, localT) {
        const u = clamp01(localT);
        const pop = 0.72 + 0.28 * smoothStep(0, 0.16, u);
        const fade = 1 - smoothStep(0.78, 1.0, u);
        const env = smoothStep(0, 0.06, u) * fade;
        if (env <= 0.02) return;

        const baseY = 64;
        const topY = -74 * pop;
        const colHalfW = (24 - 7 * smoothStep(0.55, 1.0, u)) * pop;

        // 1. Stepped Cel-Shaded Fluted Cathedral Light-Column (`topY .. baseY`)
        for (let y = Math.round(topY); y <= baseY; y++) {
          const v = (y - topY) / Math.max(1, baseY - topY);
          const taper = (0.72 + 0.36 * Math.sin(v * Math.PI * 0.85)) * (v < 0.12 ? v / 0.12 : 1);
          const hw = colHalfW * taper;
          if (hw <= 1) continue;

          for (let x = -Math.ceil(hw); x <= Math.ceil(hw); x++) {
            if (x * x + y * y > 88 * 88) continue;
            const nx = Math.abs(x) / hw;
            const flute = 0.5 + 0.5 * Math.cos(x * 0.42 + u * 8.0);
            const fbm = fbmNoise2D(x * 0.12, y * 0.07 + u * 3.6, cfg.seed || 577, 3);
            const val = (1 - nx) * 0.76 + flute * 0.14 + fbm * 0.16;

            let col;
            let aMul = env * (0.74 + 0.26 * Math.sin(v * Math.PI));
            let glowK = 0;
            if (val > 0.74) {
              col = PURE_WHITE;
              glowK = 0.30;
            } else if (val > 0.56) {
              col = colPaleIce;
              glowK = 0.18;
            } else if (val > 0.40) {
              col = colSkyIce;
            } else if (val > 0.24) {
              col = cyan[5];
            } else {
              col = cyan[2];
              aMul *= 0.78;
            }
            pen.blend(x, y, col, aMul);
            if (glowK > 0) {
              pen.writeRawGlow(pen.gridX(x, y), pen.gridY(x, y), col, glowK * env);
            }
          }
        }

        // 2. Descending Luminous Runic Sword-of-Justice Silhouette inside the Cathedral Beam!
        const swordTipY = baseY - 6;
        drawRunicGreatswordSilhouette(
          pen,
          0,
          swordTipY,
          118 * pop,
          7.2 * pop,
          0,
          cyan,
          gold,
          env * 0.96,
          false
        );

        applySelectiveOutlineOnSurface(pen.surface, seloutPacked, Math.round(224 * env));

        // 3. Front 2.5D Consecrated Elder-Rune Halos & Rising Sanctuary Runes
        drawTiltedOrbitBand(pen, 0, baseY, 54 * pop, 0.30, 2.2, 0.96 * env, band4, FRONT_HALF, u < 0.32);
        drawTiltedOrbitBand(pen, 0, -6, 38 * pop, 0.28, 1.8, 0.92 * env, goldBand4, FRONT_HALF, u < 0.32);
        drawElderStarCross(pen, 0, baseY, 48 * pop, 20 * pop, 0.30, u * 2.6, cyan[5], gold[5], 0.9 * env);

        for (let r = 0; r < 6; r++) {
          const ry = baseY - ((u * 130 + r * 24) % 130);
          const rx = Math.sin(u * 6 + r * 1.3) * 18 * pop;
          drawPixelElderRune(pen, rx, ry, 2.4, r % 2 === 0 ? gold[5] : cyan[6], PURE_WHITE, env * 0.95);
        }

        if (u < 0.72) {
          const bolt = buildLightningChain(rng, -8, topY + 10, 6, baseY - 4, 0.14, 4);
          pen.polyline(bolt, gold[6], env * 0.88);
          pen.polyline(bolt.map((p) => [p[0] + 1, p[1]]), PURE_WHITE, env * 0.95);
        }
        drawStarburstFlare(pen, 0, baseY - 4, 16 * pop, env * 0.96, [cyan[4], gold[5], cyan[6], PURE_WHITE]);
      }
    };
  }
};

export const celestialSeraphimFeatherCell = {
  duration: 1.0,
  loop: true,
  defaults: { palette: RUNIC_CYAN_PALETTE, seed: 587 },
  create() {
    const seloutPacked = packHexColor('#071a36');
    const colQuillGold = packHexColor('#fef08a');
    const colPearlIce = packHexColor('#f0f9ff');
    const colPaleIce = packHexColor('#bae6fd');
    const colSkyIce = packHexColor('#7dd3fc');
    const colBrightSapphire = packHexColor('#38bdf8');
    const colDeepSapphire = packHexColor('#0284c7');
    const flareRamp1 = [colBrightSapphire, colQuillGold, colPearlIce, PURE_WHITE];
    const flareRamp2 = [colBrightSapphire, colSkyIce, PURE_WHITE, PURE_WHITE];

    return {
      step() {},
      renderFront(pen, localT) {
        const ph = localT * Math.PI * 2;

        // Seamless 30-frame 3D floating & gently rocking Seraphim Pinion Feather (`208x208` native cell)
        // Tilt rocks smoothly (`25°..45°`) while `vaneRoll` foreshortens the broad vane in 3D perspective!
        const tilt = 0.62 + 0.22 * Math.sin(ph);
        const cosT = Math.cos(tilt);
        const sinT = Math.sin(tilt);
        const vaneRoll = 0.72 + 0.28 * Math.cos(ph);
        const archSign = 0.82 + 0.28 * Math.sin(ph + 0.7);
        const halfLen = 55; // ~112px feather inside 208x208 -> crisp barb detail + 0 border clips!

        // Evaluate every pixel inside `[-76, +76]` in feather-local coordinates `(s, v)`
        for (let py = -76; py <= 76; py++) {
          for (let px = -76; px <= 76; px++) {
            const uAlong = px * cosT + py * sinT;
            const vRaw = -px * sinT + py * cosT;

            const s = (uAlong + halfLen * 0.84) / (halfLen * 1.84); // -0.13 (calamus stem) .. +1.01 (feather tip)
            if (s < -0.14 || s > 1.01) continue;

            // Graceful S-curved central rachis / quill spine
            const spineCurve = Math.sin(Math.max(0, s) * Math.PI * 0.92) * 6.8 * archSign;
            const v = vRaw - spineCurve;
            const absV = Math.abs(v);

            // A. Bare Ivory-Gold Calamus Quill Stem at base (`s in [-0.13, 0.05]`)
            if (s < 0.05) {
              const stemHalfW = s < -0.09 ? 0.95 : 1.55;
              if (absV <= stemHalfW) {
                const stemCol = absV < 0.8 ? PURE_WHITE : colQuillGold;
                pen.pixel(px, py, stemCol);
                pen.writeRawGlow(pen.gridX(px, py), pen.gridY(px, py), PURE_WHITE, 0.22);
              }
              continue;
            }

            // B. Asymmetric Barbed Feather Vanes (`s in [0.05, 1.0]`)
            // Upper outer vane (`v < 0`) is sleek & aerodynamic; lower inner vane (`v >= 0`) is fuller & notched!
            const tipTaper = Math.pow(Math.max(0, 1 - s), 0.66);
            const baseRamp = smoothStep(0.04, 0.24, s);
            const downyBase = s < 0.20 ? Math.sin(s * 54) * 1.5 * vaneRoll : 0;
            const maxVaneW = (v < 0 ? 14.5 : 21.0) * vaneRoll * baseRamp * tipTaper + downyBase;

            if (absV > maxVaneW + 0.6) continue;

            // Diagonal feather barb coordinate (`~38°` from central rachis toward feather tip)
            const barbCoord = s - (absV / Math.max(4, maxVaneW)) * 0.165;

            // Natural V-shaped feather barb splits along the fuller edges so silhouette reads 100% as a real feather!
            let notchDepth = 0;
            if (v > 0) {
              const d1 = Math.abs(barbCoord - 0.33);
              const d2 = Math.abs(barbCoord - 0.58);
              const d3 = Math.abs(barbCoord - 0.79);
              if (d1 < 0.034) notchDepth = (1 - d1 / 0.034) * 0.44;
              else if (d2 < 0.038) notchDepth = (1 - d2 / 0.038) * 0.50;
              else if (d3 < 0.030) notchDepth = (1 - d3 / 0.030) * 0.38;
            } else {
              const u1 = Math.abs(barbCoord - 0.47);
              const u2 = Math.abs(barbCoord - 0.73);
              if (u1 < 0.030) notchDepth = (1 - u1 / 0.030) * 0.36;
              else if (u2 < 0.028) notchDepth = (1 - u2 / 0.028) * 0.32;
            }

            const effectiveMaxW = maxVaneW * (1 - notchDepth);
            if (absV > effectiveMaxW) continue;

            // Central Rachis Quill Shaft running almost to the tip (`s < 0.90`)
            if (absV <= 1.3 && s < 0.90) {
              const qCol = s < 0.24 && absV > 0.65 ? colQuillGold : PURE_WHITE;
              pen.pixel(px, py, qCol);
              pen.writeRawGlow(pen.gridX(px, py), pen.gridY(px, py), PURE_WHITE, 0.28);
              continue;
            }

            // Delicate diagonal barb texture & luminous Pure-White -> Pearl-Ice -> Sky-Sapphire cel shading!
            const wFrac = absV / Math.max(1, effectiveMaxW); // 0 at quill -> 1 at outer barb tip
            const barbRidge = Math.sin(barbCoord * 105) * 0.055;
            const shade = wFrac + barbRidge - (s < 0.32 ? 0.08 : 0) + (s > 0.72 ? (s - 0.72) * 0.42 : 0);

            let col;
            let glowK = 0;
            if (shade < 0.42) {
              col = PURE_WHITE;
              glowK = 0.24;
            } else if (shade < 0.62) {
              col = colPearlIce;
              glowK = 0.16;
            } else if (shade < 0.78) {
              col = colPaleIce;
            } else if (shade < 0.90) {
              col = colSkyIce;
            } else if (shade < 0.97) {
              col = colBrightSapphire;
            } else {
              col = colDeepSapphire;
            }
            pen.pixel(px, py, col);
            if (glowK > 0) {
              pen.writeRawGlow(pen.gridX(px, py), pen.gridY(px, py), col, glowK);
            }
          }
        }

        // Crisp 1px Midnight-Sapphire Selective Outline around the entire feather & V-notches!
        applySelectiveOutlineOnSurface(pen.surface, seloutPacked, 242);

        // 2 Twinkling Celestial Starlight Glints orbiting gently around the feather
        const g1x = Math.cos(ph) * 26 - 8;
        const g1y = Math.sin(ph) * 18 - 16;
        const g1Pulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(ph * 2));
        drawStarburstFlare(pen, g1x, g1y, 5.4 * g1Pulse, 0.90 * g1Pulse, flareRamp1);

        const g2x = -Math.cos(ph + 1.8) * 24 + 10;
        const g2y = -Math.sin(ph + 1.8) * 16 + 18;
        const g2Pulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.cos(ph * 2 + 1.1));
        drawStarburstFlare(pen, g2x, g2y, 4.6 * g2Pulse, 0.86 * g2Pulse, flareRamp2);
      }
    };
  }
};

export const RUNIC_STEEL_EFFECT_REGISTRY = {
  runicVanguardAura,
  runebladeCrescentSlash,
  tempestCycloneRing,
  blinkTeleportPillar,
  skyJudgmentPillar,
  earthshatterJudgmentWave,
  celestialCathedralConsecration,
  runebladeWaveArcCell,
  aegisRuneCrestCell,
  skyJudgmentBladePillarCell,
  elderRunicSanctuarySealCell,
  omnislashStarburstNovaCell,
  celestialJusticeGreatSlashCell,
  celestialJusticeCathedralPillarCell,
  celestialSeraphimFeatherCell
};

export const RUNIC_STEEL_SHADER_PACK = RUNIC_STEEL_EFFECT_REGISTRY;
export default RUNIC_STEEL_EFFECT_REGISTRY;
