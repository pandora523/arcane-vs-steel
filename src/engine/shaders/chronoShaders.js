/**
 * Horological Astrolabe & Temporal Sovereign Shader Suite (`chronoShaders.js`)
 * First-party 120Hz 2.5D multi-layer pixel-shader & particle effects for Zephyros (`chronomancer` / `Chronomancer.js`).
 */

import {
  PURE_WHITE,
  buildColorRamp,
  clamp01,
  smoothStep,
  DeterministicRng,
  MotePool,
  buildLightningChain,
  drawTiltedOrbitBand,
  drawStarburstFlare,
  drawMultiLayerCrescentArc
} from '../ArcaneShaderFX.js?v=30fps52';

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

const BACK_HALF = (theta) => Math.sin(theta) < 0;
const FRONT_HALF = (theta) => Math.sin(theta) >= 0;

function drawPixelClockGear(pen, cx, cy, r, rot, mainCol, rimCol, alpha = 1) {
  pen.fillCircle(cx, cy, r + 1.0, '#041b1d', alpha * 0.94);
  pen.fillCircle(cx, cy, r, mainCol, alpha * 0.96);
  for (let i = 0; i < 8; i++) {
    const a = rot + (i * Math.PI) / 4;
    const tx = cx + Math.cos(a) * (r + 1.6);
    const ty = cy + Math.sin(a) * (r + 1.6);
    pen.stipple(tx, ty, rimCol, alpha);
  }
  pen.stipple(cx, cy, PURE_WHITE, alpha);
}

// 1. 2.5D ORBITING ASTROLABE PENDULUM RING (`chronoAstrolabeHalo`)
export const chronoAstrolabeHalo = {
  duration: 1.0,
  loop: true,
  defaults: { palette: CHRONO_TEAL_PALETTE, seed: 31 },
  create(cfg) {
    const teal = buildColorRamp(cfg.palette, 8);
    const brass = buildColorRamp(CHRONO_BRASS_PALETTE, 8);
    const band4 = [brass[2], teal[4], brass[6], PURE_WHITE];
    let phase = 0;

    return {
      step(dt) {
        phase += dt;
      },
      renderBack(pen) {
        drawTiltedOrbitBand(pen, 0, 0, 22, 0.28, 1.5, 0.85, band4, BACK_HALF, false);
        for (let i = 0; i < 3; i++) {
          const a = phase * 2.4 + (i * Math.PI * 2) / 3;
          if (Math.sin(a) >= 0) continue;
          drawPixelClockGear(pen, Math.cos(a) * 22, Math.sin(a) * 22 * 0.28, 2.2, -phase * 4, brass[5], teal[5], 0.9);
        }
      },
      renderFront(pen) {
        drawTiltedOrbitBand(pen, 0, 0, 22, 0.28, 1.6, 0.94, band4, FRONT_HALF, true);
        for (let i = 0; i < 3; i++) {
          const a = phase * 2.4 + (i * Math.PI * 2) / 3;
          if (Math.sin(a) < 0) continue;
          drawPixelClockGear(pen, Math.cos(a) * 22, Math.sin(a) * 22 * 0.28, 2.5, -phase * 4, brass[6], teal[6], 0.96);
        }
      }
    };
  }
};

// 2.MULTI-LAYER HOROLOGICAL PENDULUM CRESCENT (`chronoPendulumSlash`)
export const chronoPendulumSlash = {
  duration: 0.34,
  loop: false,
  defaults: { palette: CHRONO_TEAL_PALETTE, seed: 67, isGold: false },
  create(cfg) {
    const teal = buildColorRamp(cfg.palette, 8);
    const brass = buildColorRamp(CHRONO_BRASS_PALETTE, 8);
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, brass[6], teal[5], teal[4]] });
    let t = 0;
    let burstDone = false;

    return {
      step(dt) {
        if (!burstDone) {
          burstDone = true;
          for (let i = 0; i < 12; i++) {
            const a = rng.between(-Math.PI * 0.55, Math.PI * 0.55);
            const spd = rng.between(38, 128);
            motes.emit(
              i % 2 === 0 ? 'glint' : 'spark',
              Math.cos(a) * 12,
              Math.sin(a) * 12,
              Math.cos(a) * spd,
              Math.sin(a) * spd,
              rng.between(0.16, 0.3),
              i % 2 === 0 ? brass[6] : teal[5],
              1,
              10
            );
          }
        }
        t += dt;
        motes.step(dt);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.34);
        const fade = 1 - u;
        if (fade <= 0.02) return;
        const ramp8 = cfg.isGold ? brass : teal;
        const echoCol = cfg.isGold ? teal[5] : brass[6];

        drawMultiLayerCrescentArc(pen, {
          cx: -2,
          cy: 0,
          radius: 26,
          thickness: 8.5,
          startAngle: -1.2,
          endAngle: 1.2,
          progress: u,
          ramp8,
          echoColor: echoCol,
          alpha: fade,
          seed: cfg.seed || 67
        });
        drawStarburstFlare(pen, 18, 0, 8 * fade, fade * 0.94, [brass[4], teal[5], brass[6], PURE_WHITE]);
        motes.render(pen);
      }
    };
  }
};

// 3. 2.5D STASIS HOURGLASS MATRIX SEAL (`stasisHourglassMatrix`)
export const stasisHourglassMatrix = {
  duration: 0.9,
  loop: false,
  defaults: { palette: CHRONO_TEAL_PALETTE, seed: 109 },
  create(cfg) {
    const teal = buildColorRamp(cfg.palette, 8);
    const brass = buildColorRamp(CHRONO_BRASS_PALETTE, 8);
    const band4 = [brass[2], teal[4], brass[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, brass[6], teal[5], teal[3]], floorY: 0 });
    let t = 0;
    let acc = 0;

    return {
      step(dt) {
        t += dt;
        acc += dt * 36;
        while (acc >= 1 && t < 0.78) {
          acc -= 1;
          const a = rng.between(0, Math.PI * 2);
          const r = rng.between(6, 30);
          motes.emit(
            'glint',
            Math.cos(a) * r,
            Math.sin(a) * r * 0.24,
            rng.between(-10, 10),
            rng.between(-68, -22),
            rng.between(0.18, 0.36),
            rng.chance(0.5) ? brass[6] : teal[5],
            1,
            -12
          );
        }
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 0.9);
        const pop = smoothStep(0, 0.16, u);
        const fade = 1 - smoothStep(0.76, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;
        drawTiltedOrbitBand(pen, 0, 0, 34 * pop, 0.24, 1.7, 0.9 * env, band4, BACK_HALF, false);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.9);
        const pop = smoothStep(0, 0.16, u);
        const fade = 1 - smoothStep(0.76, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;
        drawTiltedOrbitBand(pen, 0, 0, 34 * pop, 0.24, 1.8, 0.96 * env, band4, FRONT_HALF, true);
        for (let i = 0; i < 4; i++) {
          const a = u * 5.0 + (i * Math.PI) / 2;
          if (Math.sin(a) < 0) continue;
          drawPixelClockGear(pen, Math.cos(a) * 34 * pop, Math.sin(a) * 34 * pop * 0.24, 2.4, -u * 8, brass[6], teal[5], env);
        }
        motes.render(pen);
      }
    };
  }
};

// 4. 2.5D DOOMSDAY MIDNIGHT ASTRAL DOMAIN (`doomsdayAstralDomain`)
export const doomsdayAstralDomain = {
  duration: 1.56,
  loop: false,
  defaults: { palette: CHRONO_TEAL_PALETTE, seed: 173 },
  create(cfg) {
    const teal = buildColorRamp(cfg.palette, 8);
    const brass = buildColorRamp(CHRONO_BRASS_PALETTE, 8);
    const band4 = [brass[2], teal[4], brass[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, brass[6], teal[5], teal[4]], floorY: 0 });
    let t = 0;
    let acc = 0;

    return {
      step(dt) {
        t += dt;
        acc += dt * 46;
        while (acc >= 1 && t < 1.38) {
          acc -= 1;
          const a = rng.between(0, Math.PI * 2);
          const r = rng.between(10, 56);
          motes.emit(
            rng.chance(0.5) ? 'glint' : 'spark',
            Math.cos(a) * r,
            Math.sin(a) * r * 0.24 - 2,
            rng.between(-14, 14),
            rng.between(-82, -26),
            rng.between(0.22, 0.44),
            rng.chance(0.5) ? brass[6] : teal[5],
            1.1,
            -14
          );
        }
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 1.56);
        const pop = smoothStep(0, 0.16, u);
        const fade = 1 - smoothStep(0.82, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;
        drawTiltedOrbitBand(pen, 0, 0, 58 * pop, 0.24, 1.8, 0.9 * env, band4, BACK_HALF, false);
        drawTiltedOrbitBand(pen, 0, 0, 40 * pop, 0.24, 1.4, 0.84 * env, band4, BACK_HALF, false);
      },
      renderFront(pen) {
        const u = clamp01(t / 1.56);
        const pop = smoothStep(0, 0.16, u);
        const fade = 1 - smoothStep(0.82, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;
        const rx = 58 * pop;
        const ry = rx * 0.24;
        drawTiltedOrbitBand(pen, 0, 0, rx, 0.24, 1.9, 0.96 * env, band4, FRONT_HALF, true);
        drawTiltedOrbitBand(pen, 0, 0, 40 * pop, 0.24, 1.5, 0.88 * env, band4, FRONT_HALF, false);

        for (let i = 0; i < 6; i++) {
          const a = u * 3.8 + (i * Math.PI) / 3;
          if (Math.sin(a) < 0) continue;
          drawPixelClockGear(pen, Math.cos(a) * rx, Math.sin(a) * ry, 2.8, -u * 10, brass[6], teal[5], env);
        }
        if (u > 0.52 && u < 0.92) {
          const bolt = buildLightningChain(rng, 0, -68, 0, 0, 0.14, 3);
          pen.polyline(bolt, brass[6], env * 0.92);
          pen.polyline(bolt, PURE_WHITE, env * 0.96);
        }
        motes.render(pen);
      }
    };
  }
};

export const CHRONO_EFFECT_REGISTRY = {
  chronoAstrolabeHalo,
  chronoPendulumSlash,
  stasisHourglassMatrix,
  doomsdayAstralDomain
};
