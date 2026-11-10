/**
 * Horological Astrolabe & Temporal Sovereign Shader Suite (`chronoShaders.js`)
 * First-party 120Hz 2.5D multi-layer pixel-shader & particle effects for Zephyros (`chronomancer` / `Chronomancer.js`).
 *
 * Provides:
 *  - Live 2.5D (`renderBack` + `renderFront`) shaders:
 *      `chronoAstrolabeAura`, `temporalCrescentRift`, `warpPortalPairRift`,
 *      `stasisHourglassPrison`, `doomsdayGrandHorologium`
 *  - 5 Baked 30fps `chronomancer_vfx.png` cell shaders (strictly within `[-44, +44]` for 0/150 border clips):
 *      Row 0: `chronoBoltCell`
 *      Row 1: `astrolabeGearWheelCell`
 *      Row 2: `stasisHourglassMonolithCell`
 *      Row 3: `horologiumClockFaceCell`
 *      Row 4: `timeShatterNovaCell`
 */

import {
  PURE_WHITE,
  buildColorRamp,
  clamp01,
  clampRange,
  smoothStep,
  Easing,
  fbmNoise2D,
  DeterministicRng,
  MotePool,
  buildLightningChain,
  drawTiltedOrbitBand,
  drawStarburstFlare,
  drawMultiLayerCrescentArc
} from '../ArcaneShaderFX.js?v=30fps57';

const TWO_PI = Math.PI * 2;
const BACK_HALF = (theta) => Math.sin(theta) < 0;
const FRONT_HALF = (theta) => Math.sin(theta) >= 0;

export const CHRONO_TEAL_PALETTE = [
  '#041b1d',
  '#0f3f46',
  '#115e59',
  '#0d9488',
  '#14b8a6',
  '#2dd4bf',
  '#99f6e4',
  '#ffffff'
];

export const CHRONO_BRASS_PALETTE = [
  '#1c1306',
  '#451a03',
  '#78350f',
  '#b45309',
  '#d97706',
  '#f59e0b',
  '#fde047',
  '#ffffff'
];

export const CHRONO_ASTRAL_PALETTE = [
  '#090d16',
  '#1e293b',
  '#0f766e',
  '#14b8a6',
  '#d97706',
  '#facc15',
  '#fef08a',
  '#ffffff'
];

// ============================================================================
// Shared Horological & Astrolabe Pixel Primitives
// ============================================================================

function drawPixelClockGear(pen, cx, cy, r, rot, mainCol, rimCol, alpha = 1, teeth = 8) {
  if (alpha <= 0.03 || r <= 0.6) return;
  pen.fillCircle(cx, cy, r + 1.0, '#041b1d', alpha * 0.94);
  pen.fillCircle(cx, cy, r, mainCol, alpha * 0.96);
  for (let i = 0; i < teeth; i++) {
    const a = rot + (i * TWO_PI) / teeth;
    const tx = cx + Math.cos(a) * (r + 1.5);
    const ty = cy + Math.sin(a) * (r + 1.5);
    pen.stipple(tx, ty, rimCol, alpha);
  }
  pen.stipple(cx, cy, PURE_WHITE, alpha);
}

function drawChronoCrosshair(pen, cx, cy, armLen, brassCol, tealCol, alpha = 1, rot = 0) {
  if (alpha <= 0.03 || armLen < 1) return;
  for (let k = 0; k < 4; k++) {
    const a = rot + (k * Math.PI) / 2;
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    pen.line(cx, cy, cx + ux * armLen, cy + uy * armLen, k % 2 === 0 ? brassCol : tealCol, alpha * 0.92);
    pen.line(cx, cy, cx + ux * (armLen * 0.6), cy + uy * (armLen * 0.6), PURE_WHITE, alpha);
  }
  pen.stipple(cx, cy, PURE_WHITE, alpha);
}

function drawClockHand(pen, cx, cy, angle, length, rimCol, coreCol, alpha = 1) {
  if (alpha <= 0.03 || length <= 1) return;
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const nx = -uy;
  const ny = ux;
  const tipX = cx + ux * length;
  const tipY = cy + uy * length;
  const tailX = cx - ux * (length * 0.22);
  const tailY = cy - uy * (length * 0.22);
  pen.line(tailX + nx * 0.9, tailY + ny * 0.9, tipX, tipY, rimCol, alpha * 0.92);
  pen.line(tailX - nx * 0.9, tailY - ny * 0.9, tipX, tipY, rimCol, alpha * 0.92);
  pen.line(cx, cy, tipX, tipY, coreCol, alpha);
  pen.stipple(tipX, tipY, PURE_WHITE, alpha);
}

// ============================================================================
// 1. LIVE 2.5D ORBITING ASTROLABE PENDULUM AURA (`chronoAstrolabeAura`)
// ============================================================================
export const chronoAstrolabeAura = {
  duration: 1.2,
  loop: true,
  defaults: { palette: CHRONO_TEAL_PALETTE, seed: 31 },
  create(cfg) {
    const teal = buildColorRamp(cfg.palette, 8);
    const brass = buildColorRamp(CHRONO_BRASS_PALETTE, 8);
    const bandTeal4 = [teal[2], teal[4], teal[6], PURE_WHITE];
    const bandBrass4 = [brass[2], brass[4], brass[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, brass[6], teal[5], teal[4]] });
    let phase = 0;
    let emitAcc = 0;

    function renderHalf(pen, isBack) {
      const pred = isBack ? BACK_HALF : FRONT_HALF;
      if (isBack) {
        pen.radialGlow(0, -4, 24, teal[4], 0.22);
      }
      drawTiltedOrbitBand(pen, 0, 0, 26, 0.28, 1.5, isBack ? 0.84 : 0.94, bandBrass4, pred, false);
      drawTiltedOrbitBand(pen, 0, -6, 20, 0.32, 1.3, isBack ? 0.78 : 0.88, bandTeal4, pred, false);

      for (let i = 0; i < 4; i++) {
        const a = phase * 2.4 + (i * Math.PI) / 2;
        const sinA = Math.sin(a);
        if (isBack && sinA >= 0) continue;
        if (!isBack && sinA < 0) continue;
        const gx = Math.cos(a) * 26;
        const gy = sinA * 26 * 0.28;
        drawPixelClockGear(
          pen,
          gx,
          gy,
          isBack ? 2.2 : 2.6,
          -phase * 4.5,
          i % 2 === 0 ? brass[5] : teal[5],
          i % 2 === 0 ? teal[6] : brass[6],
          isBack ? 0.88 : 0.96,
          6
        );
      }
    }

    return {
      step(dt) {
        phase += dt;
        emitAcc += dt;
        while (emitAcc >= 0.065) {
          emitAcc -= 0.065;
          const a = rng.between(0, TWO_PI);
          const rx = rng.between(14, 26);
          motes.emit(
            'glint',
            Math.cos(a) * rx,
            Math.sin(a) * rx * 0.28 - 2,
            rng.between(-8, 8),
            rng.between(-28, -10),
            rng.between(0.18, 0.34),
            rng.chance(0.5) ? brass[6] : teal[5],
            1,
            0
          );
        }
        motes.step(dt);
      },
      renderBack(pen) {
        renderHalf(pen, true);
      },
      renderFront(pen) {
        renderHalf(pen, false);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 2. LIVE 2.5D MULTI-LAYER TEMPORAL CRESCENT RIFT (`temporalCrescentRift`)
// ============================================================================
export const temporalCrescentRift = {
  duration: 0.38,
  loop: false,
  defaults: {
    palette: CHRONO_TEAL_PALETTE,
    seed: 67,
    isGold: false,
    aimAngle: 0,
    radius: 26,
    width: 10
  },
  create(cfg) {
    const teal = buildColorRamp(cfg.palette, 8);
    const brass = buildColorRamp(CHRONO_BRASS_PALETTE, 8);
    const band4 = [brass[2], teal[4], brass[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, brass[6], teal[5], teal[4]] });
    const aim = cfg.aimAngle ?? 0;
    let t = 0;
    let burstDone = false;

    return {
      step(dt) {
        if (!burstDone) {
          burstDone = true;
          for (let i = 0; i < 14; i++) {
            const a = aim + rng.between(-1.05, 1.05);
            const spd = rng.between(48, 155);
            motes.emit(
              i % 2 === 0 ? 'glint' : 'spark',
              Math.cos(a) * 8,
              Math.sin(a) * 8,
              Math.cos(a) * spd,
              Math.sin(a) * spd,
              rng.between(0.16, 0.32),
              i % 2 === 0 ? brass[6] : teal[5],
              1,
              24
            );
          }
        }
        t += dt;
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 0.38);
        const fade = 1 - u;
        if (fade <= 0.03) return;
        const baseR = (cfg.radius || 26) * (0.65 + 0.35 * Easing.outCubic(u));
        pen.radialGlow(4, 0, baseR * 0.85, cfg.isGold ? brass[5] : teal[5], 0.28 * fade);
        drawTiltedOrbitBand(pen, 0, 0, baseR * 0.78, 0.34, 1.4, 0.82 * fade, band4, BACK_HALF, false);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.38);
        const fade = 1 - u * u;
        if (fade <= 0.02) return;
        const grow = Easing.outCubic(u);
        const primaryRamp = cfg.isGold ? brass : teal;
        const secondaryRamp = cfg.isGold ? teal : brass;
        const r = (cfg.radius || 26) * (0.72 + 0.36 * grow);
        const w = (cfg.width || 10) * (1 - u * 0.38);

        drawMultiLayerCrescentArc(pen, {
          cx: -2 + Math.cos(aim) * 4,
          cy: Math.sin(aim) * 4,
          radius: r,
          width: w,
          eccentricity: 0.78,
          headAngle: aim + 1.05 + grow * 0.35,
          tailAngle: aim - 1.35 + grow * 0.2,
          fade,
          ramp: primaryRamp,
          seed: cfg.seed || 67,
          t,
          flashHot: u < 0.28
        });

        if (u > 0.05 && u < 0.88) {
          drawMultiLayerCrescentArc(pen, {
            cx: -4,
            cy: 0,
            radius: r * 0.72,
            width: w * 0.65,
            eccentricity: 0.76,
            headAngle: aim + 0.85 + grow * 0.25,
            tailAngle: aim - 1.05,
            fade: fade * 0.88,
            ramp: secondaryRamp,
            seed: (cfg.seed || 67) + 19,
            t,
            flashHot: false
          });
        }

        const tipX = Math.cos(aim) * (r * 0.68);
        const tipY = Math.sin(aim) * (r * 0.68);
        drawChronoCrosshair(pen, tipX, tipY, 8 * fade, brass[6], teal[5], fade * 0.94, t * 8);
        drawStarburstFlare(pen, tipX, tipY, 9 * fade, fade * 0.92, primaryRamp);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 3. LIVE 2.5D WARP PORTAL PAIR RIFT (`warpPortalPairRift`)
// ============================================================================
export const warpPortalPairRift = {
  duration: 0.58,
  loop: false,
  defaults: {
    palette: CHRONO_TEAL_PALETTE,
    seed: 89,
    isArrival: false
  },
  create(cfg) {
    const teal = buildColorRamp(cfg.palette, 8);
    const brass = buildColorRamp(CHRONO_BRASS_PALETTE, 8);
    const bandTeal4 = [teal[2], teal[4], teal[6], PURE_WHITE];
    const bandBrass4 = [brass[2], brass[4], brass[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, brass[6], teal[5], teal[3]] });
    let t = 0;
    let emitted = false;

    return {
      step(dt) {
        t += dt;
        if (!emitted) {
          emitted = true;
          for (let i = 0; i < 16; i++) {
            const a = (i / 16) * TWO_PI;
            const spd = rng.between(42, 135);
            motes.emit(
              i % 2 === 0 ? 'glint' : 'spark',
              Math.cos(a) * 10,
              Math.sin(a) * 10,
              Math.cos(a) * spd,
              Math.sin(a) * spd,
              rng.between(0.2, 0.42),
              i % 2 === 0 ? brass[6] : teal[5],
              1,
              0
            );
          }
        }
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 0.58);
        const pop = smoothStep(0, 0.16, u);
        const fade = 1 - smoothStep(0.66, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;

        const r = 26 * pop;
        pen.radialGlow(0, 0, r * 1.15, cfg.isArrival ? brass[5] : teal[5], 0.36 * env);
        drawTiltedOrbitBand(pen, 0, 28, r * 1.1, 0.24, 1.5, 0.86 * env, bandTeal4, BACK_HALF, false);

        pen.shadeBox(-r, -r, r, r, (px, py, out) => {
          const dist = Math.hypot(px, py);
          if (dist > r || dist < 4) return 0;
          const ang = Math.atan2(py, px) + u * 6.0;
          const n = fbmNoise2D(px * 0.16 + u * 4, py * 0.16 - u * 4, cfg.seed, 2);
          const spoke = Math.abs(Math.sin(ang * 6));
          if (Math.abs(dist - r * 0.92) < 1.5 || Math.abs(dist - r * 0.58) < 1.2) {
            out.alpha = 0.92 * env;
            out.glowStrength = 0.26 * env;
            out.glowColor = brass[6];
            return brass[5];
          }
          if (spoke > 0.92 || n > 0.32) {
            out.alpha = 0.78 * env;
            out.glowStrength = 0.22 * env;
            out.glowColor = teal[5];
            return dist < r * 0.45 ? PURE_WHITE : teal[4];
          }
          return 0;
        });
      },
      renderFront(pen) {
        const u = clamp01(t / 0.58);
        const pop = smoothStep(0, 0.16, u);
        const fade = 1 - smoothStep(0.66, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;

        const r = 26 * pop;
        drawTiltedOrbitBand(pen, 0, 28, r * 1.1, 0.24, 1.6, 0.94 * env, bandBrass4, FRONT_HALF, true);

        for (let k = 0; k < 6; k++) {
          const a = -u * 5.2 + (k * TWO_PI) / 6;
          drawPixelClockGear(
            pen,
            Math.cos(a) * r,
            Math.sin(a) * r,
            2.3,
            u * 10,
            k % 2 === 0 ? brass[6] : teal[5],
            PURE_WHITE,
            env,
            6
          );
        }

        drawClockHand(pen, 0, 0, -Math.PI * 0.5 + u * 8.5, r * 0.78, brass[6], PURE_WHITE, env);
        drawClockHand(pen, 0, 0, -Math.PI * 0.5 - u * 3.2, r * 0.52, teal[5], brass[6], env);
        if (u < 0.65) {
          const bolt = buildLightningChain(rng, -r * 0.7, -r * 0.4, r * 0.7, r * 0.4, 0.22, 3);
          pen.polyline(bolt, teal[6], env * 0.88);
        }
        drawStarburstFlare(pen, 0, 0, 9 * env, env * 0.92, brass);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 4. LIVE 2.5D STASIS HOURGLASS PRISON MATRIX (`stasisHourglassPrison`)
// ============================================================================
export const stasisHourglassPrison = {
  duration: 1.30,
  loop: false,
  defaults: { palette: CHRONO_TEAL_PALETTE, seed: 109 },
  create(cfg) {
    const teal = buildColorRamp(cfg.palette, 8);
    const brass = buildColorRamp(CHRONO_BRASS_PALETTE, 8);
    const bandTeal4 = [teal[2], teal[4], teal[6], PURE_WHITE];
    const bandBrass4 = [brass[2], brass[4], brass[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, brass[6], teal[5], teal[3]], floorY: 0 });
    let t = 0;
    let acc = 0;

    function renderPrisonHalf(pen, isBack) {
      const u = clamp01(t / 1.30);
      const pop = smoothStep(0, 0.14, u);
      const fade = 1 - smoothStep(0.78, 1.0, u);
      const env = pop * fade;
      if (env <= 0.02) return;

      const pred = isBack ? BACK_HALF : FRONT_HALF;
      const rx = 34 * pop;
      const topY = -62 * pop;
      const midY = -31 * pop;

      if (isBack) {
        pen.radialGlow(0, midY, 32 * env, teal[5], 0.30 * env);
      }

      // Base & Crown 2.5D Astrolabe Containment Seals
      drawTiltedOrbitBand(pen, 0, 0, rx, 0.24, 1.7, (isBack ? 0.88 : 0.96) * env, bandBrass4, pred, false);
      drawTiltedOrbitBand(pen, 0, topY, rx * 0.92, 0.24, 1.6, (isBack ? 0.86 : 0.94) * env, bandTeal4, pred, false);
      drawTiltedOrbitBand(pen, 0, midY, rx * 0.42, 0.26, 1.4, (isBack ? 0.82 : 0.92) * env, bandBrass4, pred, true);

      // Orbiting Escapement Gears on the Base & Crown Rings
      for (let i = 0; i < 4; i++) {
        const a = u * 6.2 + (i * Math.PI) / 2;
        const sinA = Math.sin(a);
        if (isBack && sinA >= 0) continue;
        if (!isBack && sinA < 0) continue;
        drawPixelClockGear(
          pen,
          Math.cos(a) * rx,
          sinA * rx * 0.24,
          2.5,
          -u * 10,
          brass[6],
          teal[5],
          env,
          6
        );
        drawPixelClockGear(
          pen,
          Math.cos(-a) * (rx * 0.92),
          topY + Math.sin(-a) * (rx * 0.92 * 0.24),
          2.2,
          u * 10,
          teal[5],
          brass[6],
          env,
          6
        );
      }

      if (!isBack) {
        // Hourglass Diagonal Convergence Struts & Central Flowing Sand Stream
        for (const side of [-1, 1]) {
          pen.line(side * rx * 0.72, topY, side * 4, midY, brass[5], 0.86 * env);
          pen.line(side * 4, midY, side * rx * 0.72, 0, brass[5], 0.86 * env);
        }
        pen.line(0, topY + 4, 0, -2, brass[6], 0.92 * env);
        pen.line(0, topY + 8, 0, -4, PURE_WHITE, 0.95 * env);
        drawStarburstFlare(pen, 0, midY, 8 * env, 0.92 * env, brass);

        if (u > 0.45 && u < 0.88) {
          const bolt = buildLightningChain(rng, -rx * 0.55, topY * 0.8, rx * 0.55, -6, 0.18, 3);
          pen.polyline(bolt, teal[6], env * 0.9);
          pen.polyline(bolt, PURE_WHITE, env * 0.82);
        }
      }
    }

    return {
      step(dt) {
        t += dt;
        acc += dt * 38;
        while (acc >= 1 && t < 1.12) {
          acc -= 1;
          const a = rng.between(0, TWO_PI);
          const r = rng.between(6, 30);
          motes.emit(
            rng.chance(0.55) ? 'glint' : 'spark',
            Math.cos(a) * r,
            Math.sin(a) * r * 0.24 - rng.between(0, 52),
            rng.between(-12, 12),
            rng.between(-58, -18),
            rng.between(0.18, 0.38),
            rng.chance(0.5) ? brass[6] : teal[5],
            1,
            -14
          );
        }
        motes.step(dt);
      },
      renderBack(pen) {
        renderPrisonHalf(pen, true);
      },
      renderFront(pen) {
        renderPrisonHalf(pen, false);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 5. LIVE 2.5D DOOMSDAY GRAND HOROLOGIUM (`doomsdayGrandHorologium`)
// ============================================================================
export const doomsdayGrandHorologium = {
  duration: 1.56,
  loop: false,
  defaults: { palette: CHRONO_TEAL_PALETTE, seed: 173 },
  create(cfg) {
    const teal = buildColorRamp(cfg.palette, 8);
    const brass = buildColorRamp(CHRONO_BRASS_PALETTE, 8);
    const bandBrass4 = [brass[2], teal[4], brass[6], PURE_WHITE];
    const bandTeal4 = [teal[2], teal[4], teal[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, brass[6], teal[5], teal[4]], floorY: 0 });
    let t = 0;
    let acc = 0;

    function renderDomainHalf(pen, isBack) {
      const u = clamp01(t / 1.56);
      const pop = smoothStep(0, 0.16, u);
      const fade = 1 - smoothStep(0.82, 1.0, u);
      const env = pop * fade;
      if (env <= 0.02) return;

      const pred = isBack ? BACK_HALF : FRONT_HALF;
      const rxOuter = 68 * pop;
      const rxInner = 46 * pop;
      const skyY = -64 * pop;

      if (isBack) {
        pen.radialGlow(0, skyY * 0.5, 52 * env, teal[5], 0.32 * env);
      }

      // Ground Sanctuary Horologium Rings + Sky Astral Clock Ring
      drawTiltedOrbitBand(pen, 0, 0, rxOuter, 0.24, 1.9, (isBack ? 0.88 : 0.96) * env, bandBrass4, pred, true);
      drawTiltedOrbitBand(pen, 0, 0, rxInner, 0.24, 1.5, (isBack ? 0.82 : 0.90) * env, bandTeal4, pred, false);
      drawTiltedOrbitBand(pen, 0, skyY, rxInner * 0.88, 0.28, 1.5, (isBack ? 0.80 : 0.92) * env, bandBrass4, pred, false);

      // 8 Roman Clockwork Spokes & Orbiting Escapement Gears
      for (let i = 0; i < 8; i++) {
        const a = u * 3.6 + (i * TWO_PI) / 8;
        const sinA = Math.sin(a);
        if (isBack && sinA >= 0) continue;
        if (!isBack && sinA < 0) continue;
        const xIn = Math.cos(a) * (rxInner * 0.45);
        const yIn = sinA * (rxInner * 0.45) * 0.24;
        const xOut = Math.cos(a) * rxOuter;
        const yOut = sinA * rxOuter * 0.24;
        pen.line(xIn, yIn, xOut, yOut, i % 2 === 0 ? brass[5] : teal[5], 0.82 * env);
        drawPixelClockGear(
          pen,
          xOut,
          yOut,
          2.8,
          -u * 12,
          i % 2 === 0 ? brass[6] : teal[5],
          i % 2 === 0 ? teal[5] : brass[6],
          env,
          8
        );
      }

      if (!isBack) {
        // Midnight XII Lightning Chains & Starburst Detonation
        if (u > 0.48 && u < 0.94) {
          for (const side of [-1, 0, 1]) {
            const bolt = buildLightningChain(rng, side * 18, skyY, side * 26, 0, 0.16, 3);
            pen.polyline(bolt, side === 0 ? brass[6] : teal[5], env * 0.92);
            pen.polyline(bolt, PURE_WHITE, env * 0.88);
          }
          drawStarburstFlare(pen, 0, skyY * 0.5, 14 * env, env * 0.95, brass);
        }
      }
    }

    return {
      step(dt) {
        t += dt;
        acc += dt * 48;
        while (acc >= 1 && t < 1.38) {
          acc -= 1;
          const a = rng.between(0, TWO_PI);
          const r = rng.between(10, 64);
          motes.emit(
            rng.chance(0.5) ? 'glint' : 'spark',
            Math.cos(a) * r,
            Math.sin(a) * r * 0.24 - 2,
            rng.between(-16, 16),
            rng.between(-86, -28),
            rng.between(0.22, 0.46),
            rng.chance(0.5) ? brass[6] : teal[5],
            1.1,
            -14
          );
        }
        motes.step(dt);
      },
      renderBack(pen) {
        renderDomainHalf(pen, true);
      },
      renderFront(pen) {
        renderDomainHalf(pen, false);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// BAKED 30FPS VFX SPRITE SHEET CELLS (`chronomancer_vfx.png`, 104x104 -> 208x208)
// All coordinates fit strictly inside `[-42, +42]` for 0/150 border clips!
// ============================================================================

/** Row 0: 30-frame Razor-Edged Brass & Teal Clockwork Saw-Gear Bolt (`chronoBoltCell`). */
export const chronoBoltCell = {
  duration: 1.0,
  loop: true,
  defaults: {
    palette: CHRONO_TEAL_PALETTE
  },
  create(cfg) {
    const teal = buildColorRamp(cfg.palette, 8);
    const brass = buildColorRamp(CHRONO_BRASS_PALETTE, 8);

    return {
      step() {},
      renderFront(pen, localT) {
        const progress = clamp01(localT / 1.0);
        const rot = progress * TWO_PI;

        pen.radialGlow(2, 0, 26, teal[5], 0.36);

        // Twin trailing golden-teal chronometer slipstream ribbons (within x: -36..0)
        for (let s = 0; s < 2; s++) {
          const sign = s === 0 ? 1 : -1;
          for (let i = 0; i < 18; i++) {
            const u = i / 17;
            const wx = -4 - u * 31;
            const wy = sign * Math.sin(u * 5.0 - rot * 2) * (6.5 * (1 - u * 0.65));
            pen.stipple(wx, wy, i % 2 === 0 ? brass[6] : teal[5], (1 - u) * 0.9);
          }
        }

        // 12-Tooth Razor-Edged Brass & Teal Saw-Gear Rim (max radius <= 31)
        const teeth = 12;
        const rInner = 13;
        const rRim = 22;
        const rTooth = 29;
        pen.shadeBox(-32, -32, 34, 32, (px, py, out) => {
          const dx = px - 2;
          const dy = py;
          const r = Math.hypot(dx, dy);
          if (r > rTooth + 1 || r < 3) return 0;
          const a = Math.atan2(dy, dx) + rot;
          const normA = ((a % TWO_PI) + TWO_PI) % TWO_PI;
          const toothPhase = (normA / TWO_PI) * teeth;
          const frac = toothPhase - Math.floor(toothPhase);

          // Saw-tooth outer profile
          const sawReach = rRim + (1 - Math.abs(frac * 2 - 1)) * (rTooth - rRim);
          if (r <= sawReach && r >= rRim - 2.5) {
            out.alpha = 0.98;
            out.glowStrength = 0.28;
            out.glowColor = r > rRim + 2 ? teal[6] : brass[6];
            return r > sawReach - 1.4 ? PURE_WHITE : r > rRim + 1.2 ? teal[5] : brass[5];
          }

          if (Math.abs(r - rInner) <= 2.0) {
            out.alpha = 0.96;
            out.glowStrength = 0.24;
            out.glowColor = brass[6];
            return brass[6];
          }
          return 0;
        });

        // 6 Interior Escapement Spokes
        for (let k = 0; k < 6; k++) {
          const a = -rot + (k * TWO_PI) / 6;
          pen.line(2, 0, 2 + Math.cos(a) * rRim, Math.sin(a) * rRim, k % 2 === 0 ? brass[6] : teal[5], 0.95);
        }

        drawChronoCrosshair(pen, 2, 0, 14, brass[6], teal[6], 0.98, rot * 0.5);
        drawStarburstFlare(pen, 2, 0, 9, 0.96, brass);
      }
    };
  }
};

/** Row 1: 30-frame Intricate Interlocking Brass & Teal Astrolabe Gear Wheel (`astrolabeGearWheelCell`). */
export const astrolabeGearWheelCell = {
  duration: 1.0,
  loop: true,
  defaults: {
    palette: CHRONO_TEAL_PALETTE
  },
  create(cfg) {
    const teal = buildColorRamp(cfg.palette, 8);
    const brass = buildColorRamp(CHRONO_BRASS_PALETTE, 8);

    return {
      step() {},
      renderFront(pen, localT) {
        const progress = clamp01(localT / 1.0);
        const rot = progress * TWO_PI;

        pen.radialGlow(0, 0, 30, teal[5], 0.34);

        // Outer Astrolabe Brass Bezel + 12 Squared Escapement Cogs (strictly <= 36)
        pen.shadeBox(-37, -37, 37, 37, (px, py, out) => {
          const r = Math.hypot(px, py);
          if (r > 35.5 || r < 4) return 0;
          const a = Math.atan2(py, px) + rot;
          const normA = ((a % TWO_PI) + TWO_PI) % TWO_PI;
          const cog = (normA / TWO_PI) * 12;
          const cogFrac = cog - Math.floor(cog);

          if (r >= 29.5 && r <= 35.0) {
            if (cogFrac >= 0.22 && cogFrac <= 0.78) {
              out.alpha = 0.98;
              out.glowStrength = 0.24;
              out.glowColor = brass[6];
              return r > 33.5 ? brass[6] : brass[4];
            }
            return 0;
          }

          if (r >= 25.0 && r < 29.5) {
            out.alpha = 0.98;
            out.glowStrength = 0.26;
            out.glowColor = brass[5];
            return Math.abs(r - 27.2) < 0.9 ? brass[6] : brass[3];
          }

          if (Math.abs(r - 17.5) <= 1.8) {
            out.alpha = 0.96;
            out.glowStrength = 0.28;
            out.glowColor = teal[5];
            return Math.abs(r - 17.5) < 0.8 ? PURE_WHITE : teal[5];
          }

          return 0;
        });

        // 8 Counter-Rotating Tourbillon Spokes + Jewel Bearings
        for (let i = 0; i < 8; i++) {
          const a = rot + (i * TWO_PI) / 8;
          const x1 = Math.cos(a) * 26;
          const y1 = Math.sin(a) * 26;
          pen.line(0, 0, x1, y1, i % 2 === 0 ? brass[6] : teal[5], 0.94);
          pen.fillCircle(x1, y1, 2.0, i % 2 === 0 ? teal[5] : brass[6], 0.98);
          pen.stipple(x1, y1, PURE_WHITE, 0.98);
        }

        drawChronoCrosshair(pen, 0, 0, 12, brass[6], teal[5], 0.98, -rot);
        drawStarburstFlare(pen, 0, 0, 8.5, 0.95, teal);
      }
    };
  }
};

/** Row 2: 30-frame Ornate 16-bit Brass & Teal Stasis Hourglass Monolith (`stasisHourglassMonolithCell`). */
export const stasisHourglassMonolithCell = {
  duration: 1.0,
  loop: false,
  defaults: {
    palette: CHRONO_TEAL_PALETTE
  },
  create(cfg) {
    const teal = buildColorRamp(cfg.palette, 8);
    const brass = buildColorRamp(CHRONO_BRASS_PALETTE, 8);
    const band4 = [brass[2], teal[4], brass[6], PURE_WHITE];

    return {
      step() {},
      renderFront(pen, localT) {
        const progress = clamp01(localT / 1.0);
        const pulse = 0.9 + 0.1 * Math.sin(progress * TWO_PI * 2);

        pen.radialGlow(0, 0, 32 * pulse, teal[5], 0.34);

        // Horizontal Waist Orbit Band (rx = 26, strictly inside [-32, +32])
        drawTiltedOrbitBand(pen, 0, 0, 26, 0.25, 1.4, 0.9, band4, null, false);

        // Glass Bulbs + Draining Golden Sand + Ornate Brass Capitals (y in [-35, +35], x in [-25, +25])
        pen.shadeBox(-26, -36, 26, 36, (px, py, out) => {
          const ax = Math.abs(px);
          const ay = Math.abs(py);

          // Top & Bottom Stepped Brass Pedestal Capitals (ay in [30..35])
          if (ay >= 30 && ay <= 35 && ax <= 24) {
            out.alpha = 0.98;
            out.glowStrength = 0.22;
            out.glowColor = brass[5];
            if (ay >= 34 || ax >= 22.5) return '#041b1d';
            return ay < 32 ? brass[6] : brass[4];
          }

          // Twin Outer Vertical Brass Frame Pillars at ax in [20..22.5], ay < 30
          if (ay < 30 && ax >= 19.8 && ax <= 22.2) {
            out.alpha = 0.96;
            out.glowStrength = 0.2;
            out.glowColor = brass[5];
            return ax < 21.0 ? brass[6] : brass[3];
          }

          // Hourglass Bulb Profile (ay in [0..30])
          if (ay < 30) {
            const hFrac = ay / 30;
            const bulbR = 3.2 + (17.5 - 3.2) * Math.pow(hFrac, 0.78);
            if (ax > bulbR) return 0;

            // Crisp Glass Rim & Specular Highlight
            if (ax >= bulbR - 1.5) {
              out.alpha = 0.96;
              out.glowStrength = 0.26;
              out.glowColor = teal[5];
              return px < 0 ? PURE_WHITE : teal[5];
            }

            // Falling Sand Stream down the center axis (ax <= 1.8)
            if (py >= -4 && py <= 29 && ax <= 1.6) {
              out.alpha = 0.98;
              out.glowStrength = 0.34;
              out.glowColor = brass[6];
              return ax < 0.8 ? PURE_WHITE : brass[6];
            }

            // Upper Bulb Draining Sand (`py < 0`)
            const upperSandTop = -28 + progress * 16;
            if (py < -2 && py >= upperSandTop) {
              out.alpha = 0.92;
              out.glowStrength = 0.26;
              out.glowColor = brass[5];
              return py < upperSandTop + 2.0 ? PURE_WHITE : brass[5];
            }

            // Lower Bulb Accumulating Sand Mound (`py > 0`)
            const lowerSandTop = 29 - (0.28 + progress * 0.62) * 22 + ax * 0.35;
            if (py >= lowerSandTop && py <= 29.5) {
              out.alpha = 0.94;
              out.glowStrength = 0.28;
              out.glowColor = brass[6];
              return py < lowerSandTop + 1.8 ? PURE_WHITE : brass[5];
            }

            // Interior Crystalline Teal Stasis Mist
            const n = fbmNoise2D(px * 0.22, py * 0.22 - progress * 6, 41, 2);
            if (n > 0.18) {
              out.alpha = 0.65;
              out.glowStrength = 0.18;
              out.glowColor = teal[4];
              return teal[3];
            }
          }
          return 0;
        });

        drawStarburstFlare(pen, 0, 0, 7.5, 0.95, brass);
      }
    };
  }
};

/** Row 3: 30-frame Grand XII-Hour Horologium Astral Clock Face (`horologiumClockFaceCell`). */
export const horologiumClockFaceCell = {
  duration: 1.0,
  loop: true,
  defaults: {
    palette: CHRONO_TEAL_PALETTE
  },
  create(cfg) {
    const teal = buildColorRamp(cfg.palette, 8);
    const brass = buildColorRamp(CHRONO_BRASS_PALETTE, 8);
    const astral = buildColorRamp(CHRONO_ASTRAL_PALETTE, 8);

    return {
      step() {},
      renderFront(pen, localT) {
        const progress = clamp01(localT / 1.0);
        const rot = progress * TWO_PI;

        pen.radialGlow(0, 0, 34, teal[5], 0.34);

        // 12-Sector Horological Dial (strictly inside [-37, +37])
        pen.shadeBox(-37, -37, 37, 37, (px, py, out) => {
          const r = Math.hypot(px, py);
          if (r > 36 || r < 4) return 0;
          const a = Math.atan2(py, px);
          const normA = ((a % TWO_PI) + TWO_PI) % TWO_PI;
          const sector = Math.floor((normA / TWO_PI) * 12);
          const sectorAng = (normA / TWO_PI) * 12 - sector - 0.5;

          // Concentric Brass & Teal Horological Rings + 12 Radial Hour Spokes
          if (
            Math.abs(r - 34.5) < 1.3 ||
            Math.abs(r - 25.5) < 1.2 ||
            Math.abs(r - 14.5) < 1.1 ||
            Math.abs(sectorAng) > 0.42
          ) {
            out.alpha = 0.96;
            out.glowStrength = 0.24;
            out.glowColor = brass[6];
            return r > 33.2 ? brass[6] : brass[4];
          }

          // Roman Numeral Chapter Ring (r in [26.8..33.0])
          if (r >= 26.8 && r <= 33.0) {
            const isTick = Math.abs(sectorAng) < 0.14 && r >= 28.0 && r <= 31.8;
            out.alpha = isTick ? 0.98 : 0.78;
            out.glowStrength = isTick ? 0.30 : 0.16;
            out.glowColor = isTick ? PURE_WHITE : teal[4];
            return isTick ? PURE_WHITE : sector % 2 === 0 ? teal[2] : astral[1];
          }

          // Astral Stained-Glass Inner Dial Panes
          const paneCols = [teal[4], brass[5], teal[5], astral[4]];
          const col = paneCols[sector % 4];
          out.alpha = 0.82;
          out.glowStrength = 0.18;
          out.glowColor = col;
          return Math.abs(sectorAng) < 0.12 && r > 17 && r < 22 ? PURE_WHITE : col;
        });

        // Sweeping Hour & Minute Hands + Central Escapement Hub
        const minuteAngle = -Math.PI * 0.5 + rot;
        const hourAngle = -Math.PI * 0.5 + rot * 0.25;
        drawClockHand(pen, 0, 0, hourAngle, 18, brass[6], PURE_WHITE, 0.98);
        drawClockHand(pen, 0, 0, minuteAngle, 26, teal[5], PURE_WHITE, 0.98);
        drawStarburstFlare(pen, 0, 0, 7.5, 0.96, brass);
      }
    };
  }
};

/** Row 4: 30-frame Multi-Layer Time-Shatter Crescent & Gear Nova (`timeShatterNovaCell`). */
export const timeShatterNovaCell = {
  duration: 1.0,
  loop: false,
  defaults: {
    palette: CHRONO_TEAL_PALETTE
  },
  create(cfg) {
    const teal = buildColorRamp(cfg.palette, 8);
    const brass = buildColorRamp(CHRONO_BRASS_PALETTE, 8);

    return {
      step() {},
      renderFront(pen, localT) {
        const progress = clamp01(localT / 1.0);
        const grow = Easing.outCubic(progress);
        const fade = 1 - Easing.inQuad(progress);
        if (fade <= 0.02) return;

        // Primary Multi-Layer Teal-White Temporal Crescent (strictly inside [-38, +38])
        drawMultiLayerCrescentArc(pen, {
          cx: -4 + grow * 4,
          cy: 0,
          radius: 13 + grow * 14,
          width: 7.5 * (1 - progress * 0.45),
          eccentricity: 0.85,
          headAngle: 1.15 + grow * 0.35,
          tailAngle: -1.35 + grow * 0.2,
          fade,
          ramp: teal,
          seed: 73,
          t: progress,
          flashHot: progress < 0.35
        });

        // Secondary Inner Brass Escapement Crescent
        if (progress > 0.06 && progress < 0.88) {
          drawMultiLayerCrescentArc(pen, {
            cx: -5,
            cy: 0,
            radius: 9 + grow * 11,
            width: 4.8 * (1 - progress * 0.5),
            eccentricity: 0.82,
            headAngle: 0.95 + grow * 0.25,
            tailAngle: -1.1,
            fade: fade * 0.9,
            ramp: brass,
            seed: 97,
            t: progress,
            flashHot: false
          });
        }

        // Expanding Escapement Gear Shards (max radius <= 32)
        for (let k = -2; k <= 2; k++) {
          const a = k * 0.44;
          const r = 10 + grow * 20;
          drawPixelClockGear(
            pen,
            -2 + Math.cos(a) * r,
            Math.sin(a) * r,
            2.2 * fade,
            progress * 8 * (k % 2 === 0 ? 1 : -1),
            k % 2 === 0 ? brass[6] : teal[5],
            PURE_WHITE,
            fade * 0.92,
            6
          );
        }

        drawChronoCrosshair(pen, 6 + grow * 10, 0, 8.5 * fade, brass[6], teal[5], fade, progress * 3.2);
        drawStarburstFlare(pen, 6 + grow * 10, 0, 10 * fade, fade * 0.94, brass);
      }
    };
  }
};

export const CHRONO_EFFECT_REGISTRY = {
  chronoAstrolabeAura,
  temporalCrescentRift,
  warpPortalPairRift,
  stasisHourglassPrison,
  doomsdayGrandHorologium,
  // Backward-compatible aliases
  chronoAstrolabeHalo: chronoAstrolabeAura,
  chronoPendulumSlash: temporalCrescentRift,
  stasisHourglassMatrix: stasisHourglassPrison,
  doomsdayAstralDomain: doomsdayGrandHorologium,
  // 5 Baked 30fps `chronomancer_vfx.png` Cell Shaders
  chronoBoltCell,
  astrolabeGearWheelCell,
  stasisHourglassMonolithCell,
  horologiumClockFaceCell,
  timeShatterNovaCell
};
