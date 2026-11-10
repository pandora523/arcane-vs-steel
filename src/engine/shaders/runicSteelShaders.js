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
} from '../ArcaneShaderFX.js?v=30fps53';

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
          const maxR = cfg.isDomain ? 52 : 18;
          const a = rng.between(0, Math.PI * 2);
          const r = rng.between(4, maxR);
          motes.emit(
            rng.chance(0.55) ? 'glint' : 'spark',
            Math.cos(a) * r,
            Math.sin(a) * r * 0.22 - (cfg.isSky ? 22 : 2),
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

        const ringY = cfg.isSky ? -24 : 0;
        const ringR = (16 + u * 10) * pop;
        drawTiltedOrbitBand(pen, 0, ringY, ringR, 0.25, 1.5, 0.86 * env, band4, BACK_HALF, false);
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

        const colH = Math.min(74, Math.max(36, (cfg.heightWorld || 188) / 3)) * (0.7 + 0.3 * (1 - u));
        const baseY = cfg.isSky ? 4 : 0;
        const topY = baseY - colH;
        const halfW = Math.max(2.5, 11 * (1 - u * 0.62));

        pen.shadeBox(-halfW - 2, topY - 2, halfW + 2, baseY + 2, (lx, ly, out) => {
          if (ly < topY || ly > baseY) return 0;
          const ax = Math.abs(lx);
          const hFrac = (baseY - ly) / Math.max(1, colH);
          const localW = halfW * (1 - hFrac * 0.22);
          if (ax > localW) return 0;
          if (ax > localW - 1.1) {
            out.color = cyan[0];
            out.alpha = 0.92 * env;
            return out.color;
          }
          if (ax < 1.8) {
            out.color = PURE_WHITE;
            out.alpha = env;
            out.glowColor = cyan[6];
            out.glowStrength = 0.48 * env;
            return out.color;
          }
          const n = fbmNoise2D(lx * 0.25, ly * 0.16 - t * 14, cfg.seed || 157, 2);
          out.color = ax < localW * 0.52 ? cyan[6] : n > 0.08 ? gold[5] : cyan[4];
          out.alpha = 0.92 * env;
          out.glowColor = cyan[5];
          out.glowStrength = 0.26 * env;
          return out.color;
        });

        const bolt = buildLightningChain(rng, 0, topY, 0, baseY, 0.14, 3);
        pen.polyline(bolt, gold[6], 0.9 * env);
        pen.polyline(bolt, PURE_WHITE, 0.95 * env);

        const ringY = cfg.isSky ? -24 : 0;
        const ringR = (16 + u * 10) * pop;
        drawTiltedOrbitBand(pen, 0, ringY, ringR, 0.25, 1.65, 0.95 * env, band4, FRONT_HALF, u < 0.35);
        for (let i = 0; i < 4; i++) {
          const a = u * 5.2 + (i * Math.PI) / 2;
          if (Math.sin(a) < 0) continue;
          drawPixelElderRune(
            pen,
            Math.cos(a) * ringR,
            ringY + Math.sin(a) * ringR * 0.25,
            2.2,
            i % 2 === 0 ? cyan[6] : gold[5],
            PURE_WHITE,
            env
          );
        }
        drawStarburstFlare(pen, 0, ringY, 9.5 * env, 0.94 * env, [cyan[4], gold[5], cyan[6], PURE_WHITE]);
        motes.render(pen);
      }
    };
  }
};

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
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, cyan[6], gold[5], cyan[4]], floorY: 0 });
    let t = 0;
    let burstDone = false;

    return {
      step(dt) {
        if (!burstDone) {
          burstDone = true;
          for (let i = 0; i < 28; i++) {
            const rx = rng.between(-46, 46);
            motes.emit(
              i % 2 === 0 ? 'glint' : 'spark',
              rx,
              -2,
              rx * 2.6,
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
        const pop = smoothStep(0, 0.18, u);
        const fade = 1 - Math.pow(u, 1.45);
        if (fade <= 0.02) return;

        drawTiltedOrbitBand(pen, 0, 0, 56 * pop, 0.22, 2.0, 0.88 * fade, band4, BACK_HALF, false);
        drawTiltedOrbitBand(pen, 0, 0, 36 * pop, 0.22, 1.6, 0.82 * fade, goldBand4, BACK_HALF, false);
        drawElderStarCross(pen, 0, 0, 48 * pop, 22 * pop, 0.22, u * 2.2, cyan[5], gold[5], 0.82 * fade, BACK_HALF);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.72);
        const pop = smoothStep(0, 0.18, u);
        const fade = 1 - Math.pow(u, 1.45);
        if (fade <= 0.02) return;

        drawMultiLayerCrescentArc(pen, {
          cx: 0,
          cy: -18,
          radius: 36,
          width: 11.5,
          eccentricity: 0.78,
          headAngle: 1.45,
          tailAngle: -1.45,
          fade,
          ramp: cyan,
          seed: cfg.seed || 193,
          t,
          flashHot: u < 0.35
        });
        drawMultiLayerCrescentArc(pen, {
          cx: -2,
          cy: -18,
          radius: 26,
          width: 8.0,
          eccentricity: 0.78,
          headAngle: 1.32,
          tailAngle: -1.32,
          fade: fade * 0.85,
          ramp: gold,
          seed: (cfg.seed || 193) + 29,
          t,
          flashHot: false
        });

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
          const bolt = buildLightningChain(rng, 0, -68, 0, 0, 0.15, 4);
          pen.polyline(bolt, cyan[5], fade * 0.92);
          pen.polyline(
            bolt.map((p) => [p[0] + 1, p[1]]),
            gold[6],
            fade * 0.88
          );
          pen.polyline(bolt, PURE_WHITE, fade * 0.98);
        }
        drawStarburstFlare(pen, 0, -2, 13.5 * fade, fade * 0.96, [cyan[4], gold[5], cyan[6], PURE_WHITE]);
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
    const rng = new DeterministicRng(cfg.seed);

    return {
      step() {},
      renderFront(pen, localT) {
        const u = clamp01(localT);

        // F00..F11 (`u < 0.40`): Descending Heavenly Runeblade + Winged Aegis Shield Crest (inside `[-38, +38]`)
        if (u < 0.4) {
          const fu = u / 0.4;
          const pulse = 0.88 + 0.12 * Math.sin(fu * Math.PI);

          // Winged Sapphire-Gold Aegis Shield Backing
          drawTiltedOrbitBand(pen, 0, 0, 24 * pulse, 0.92, 1.5, 0.92, band4, null, false);
          drawElderStarCross(pen, 0, 0, 22 * pulse, 10 * pulse, 0.92, fu * 1.6, cyan[5], gold[5], 0.88);

          // Central Faceted Runeblade Greatsword pointing down inside `[-34, +34]`
          pen.shadeBox(-13, -35, 13, 35, (lx, ly, out) => {
            if (ly < -33 || ly > 33) return 0;
            // Winged Golden Crossguard at y = -15..-11
            if (ly >= -15 && ly <= -11 && Math.abs(lx) <= 11) {
              out.color = Math.abs(lx) > 9 ? cyan[0] : Math.abs(lx) < 3 ? PURE_WHITE : gold[5];
              out.alpha = 1;
              return out.color;
            }
            // Pommel & hilt above crossguard (`-32..-15`)
            if (ly < -15) {
              const isPommel = ly < -27;
              const maxHiltW = isPommel ? 4.2 : 2.6;
              if (Math.abs(lx) > maxHiltW) return 0;
              out.color = isPommel ? gold[6] : Math.abs(ly) % 4 < 2 ? gold[5] : cyan[2];
              out.alpha = 1;
              return out.color;
            }
            // Broad Tapered Runeblade Greatsword (`-11..+33`)
            const bFrac = (ly + 11) / 44;
            const halfW = (1 - bFrac * 0.62) * 5.6;
            const ax = Math.abs(lx);
            if (ax > halfW) return 0;
            if (ax > halfW - 1.2) {
              out.color = cyan[0];
              out.alpha = 0.98;
              return out.color;
            }
            out.color = ax < 1.6 ? PURE_WHITE : lx < 0 ? cyan[6] : cyan[4];
            out.alpha = 1;
            out.glowColor = cyan[5];
            out.glowStrength = 0.38;
            return out.color;
          });

          const bolt = buildLightningChain(rng, 0, -30, 0, 30, 0.14, 3);
          pen.polyline(bolt, gold[6], 0.9);
          drawStarburstFlare(pen, 0, -13, 8.5, 0.92, [cyan[4], gold[5], cyan[6], PURE_WHITE]);
        } else {
          // F12..F29 (`u >= 0.40`): Impaled Runeblade + Expanding Aegis Greatshield & 8-Rune Crater Seal!
          const iu = clamp01((u - 0.4) / 0.6);
          const pop = 0.74 + 0.26 * smoothStep(0, 0.22, iu);
          const fade = 1 - smoothStep(0.76, 1.0, iu);
          const env = (0.9 + 0.1 * smoothStep(0, 0.14, iu)) * fade;
          if (env <= 0.02) return;

          const baseY = 24;
          drawTiltedOrbitBand(pen, 0, baseY, 31 * pop, 0.23, 1.6, 0.94 * env, band4, null, false);
          drawTiltedOrbitBand(pen, 0, -2, 25 * pop, 0.88, 1.5, 0.88 * env, band4, null, iu < 0.35);

          for (let d = 0; d < 8; d++) {
            const a = iu * 2.8 + (d * Math.PI) / 4;
            drawPixelElderRune(
              pen,
              Math.cos(a) * 31 * pop,
              baseY + Math.sin(a) * 31 * pop * 0.23,
              2.1,
              d % 2 === 0 ? cyan[5] : gold[5],
              PURE_WHITE,
              env
            );
          }

          // Impaled Runeblade Greatsword at center
          pen.line(0, -32, 0, baseY, PURE_WHITE, env);
          pen.line(-2, -28, -2, baseY, cyan[5], env * 0.92);
          pen.line(2, -28, 2, baseY, gold[5], env * 0.92);
          pen.line(-9, -20, 9, -20, gold[5], env);

          // X-Shaped Runic Cross-Cleave inside `[-28, +28]`
          const span = 27 * pop;
          pen.line(-span, -span + 2, span, span + 2, cyan[5], env * 0.92);
          pen.line(-span, span + 2, span, -span + 2, gold[5], env * 0.92);
          pen.line(-span * 0.84, -span * 0.84 + 2, span * 0.84, span * 0.84 + 2, PURE_WHITE, env);
          pen.line(-span * 0.84, span * 0.84 + 2, span * 0.84, -span * 0.84 + 2, PURE_WHITE, env);
          drawStarburstFlare(pen, 0, 2, 11.5 * pop, env * 0.95, [cyan[4], gold[5], cyan[6], PURE_WHITE]);
        }
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
    const rng = new DeterministicRng(cfg.seed);

    return {
      step() {},
      renderFront(pen, localT) {
        const u = clamp01(localT);
        const pop = 0.64 + 0.36 * smoothStep(0, 0.18, u);
        const fade = 1 - smoothStep(0.82, 1.0, u);
        const env = (0.9 + 0.1 * smoothStep(0, 0.12, u)) * fade;
        if (env <= 0.02) return;

        // Strictly inside `[-39, +39]` so top spire tip & bottom orbit band never clip cell edges
        const baseY = 32;
        const topY = baseY - 66 * pop;
        const halfW = 14.5 * (0.86 + 0.14 * Math.sin(u * Math.PI));

        pen.shadeBox(-22, topY - 2, 22, baseY + 2, (lx, ly, out) => {
          if (ly > baseY || ly < topY) return 0;
          const hFrac = (baseY - ly) / Math.max(1, baseY - topY);
          // Faceted crystalline spire taper + twin flanking crystal shards
          const mainMaxW = halfW * (1 - Math.pow(hFrac, 0.88) * 0.78);
          const flankH = hFrac < 0.58 ? (1 - hFrac / 0.58) * (halfW * 0.92) : 0;
          const maxW = Math.max(mainMaxW, flankH);
          const ax = Math.abs(lx);
          if (ax > maxW) return 0;
          if (ax > maxW - 1.3) {
            out.color = cyan[0];
            out.alpha = 0.96 * env;
            return out.color;
          }
          if (ax < 2.4) {
            out.color = PURE_WHITE;
            out.alpha = env;
            out.glowColor = cyan[6];
            out.glowStrength = 0.46;
            return out.color;
          }
          const facet = Math.sin(lx * 0.45 + ly * 0.12);
          out.color = ax < maxW * 0.48 ? cyan[6] : facet > 0.2 ? gold[5] : lx < 0 ? cyan[5] : cyan[3];
          out.alpha = 0.95 * env;
          return out.color;
        });

        const spireChain = buildLightningChain(rng, 0, topY + 2, 0, baseY - 2, 0.14, 4);
        pen.polyline(spireChain, gold[6], 0.92 * env);
        pen.polyline(spireChain, PURE_WHITE, 0.96 * env);
        drawTiltedOrbitBand(pen, 0, baseY, 24 * pop, 0.22, 1.5, 0.92 * env, band4, null, false);
        drawStarburstFlare(pen, 0, topY + 4, 7.5 * pop, 0.9 * env, [cyan[4], gold[5], cyan[6], PURE_WHITE]);
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

export const RUNIC_STEEL_EFFECT_REGISTRY = {
  runicVanguardAura,
  runebladeCrescentSlash,
  tempestCycloneRing,
  blinkTeleportPillar,
  earthshatterJudgmentWave,
  runebladeWaveArcCell,
  aegisRuneCrestCell,
  skyJudgmentBladePillarCell,
  elderRunicSanctuarySealCell,
  omnislashStarburstNovaCell
};

export const RUNIC_STEEL_SHADER_PACK = RUNIC_STEEL_EFFECT_REGISTRY;
export default RUNIC_STEEL_EFFECT_REGISTRY;
