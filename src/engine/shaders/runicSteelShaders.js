/**
 * Runic Vanguard & Heavenly Earthshatter Shader Suite (`runicSteelShaders.js`)
 * First-party 120Hz 2.5D multi-layer pixel-shader & particle effects for Aethelgard (`warrior` / `Warrior.js`).
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
  pen.fillCircle(cx, cy, r + 0.8, '#061228', alpha * 0.92);
  pen.fillCircle(cx, cy, r, mainCol, alpha * 0.96);
  pen.stipple(cx, cy, coreCol, alpha);
}

// 1. 2.5D RUNIC VANGUARD AURA (`runicVanguardAura`)
export const runicVanguardAura = {
  duration: 1.0,
  loop: true,
  defaults: { palette: RUNIC_CYAN_PALETTE, seed: 47 },
  create(cfg) {
    const cyan = buildColorRamp(cfg.palette, 8);
    const gold = buildColorRamp(RUNIC_GOLD_PALETTE, 8);
    const band4 = [cyan[2], cyan[5], gold[6], PURE_WHITE];
    let phase = 0;

    return {
      step(dt) {
        phase += dt;
      },
      renderBack(pen) {
        drawTiltedOrbitBand(pen, 0, 0, 22, 0.26, 1.5, 0.84, band4, BACK_HALF, false);
        for (let i = 0; i < 4; i++) {
          const a = phase * 2.5 + (i * Math.PI) / 2;
          if (Math.sin(a) >= 0) continue;
          drawPixelElderRune(pen, Math.cos(a) * 22, Math.sin(a) * 22 * 0.26, 1.9, i % 2 === 0 ? cyan[5] : gold[5], PURE_WHITE, 0.88);
        }
      },
      renderFront(pen) {
        drawTiltedOrbitBand(pen, 0, 0, 22, 0.26, 1.6, 0.94, band4, FRONT_HALF, true);
        for (let i = 0; i < 4; i++) {
          const a = phase * 2.5 + (i * Math.PI) / 2;
          if (Math.sin(a) < 0) continue;
          drawPixelElderRune(pen, Math.cos(a) * 22, Math.sin(a) * 22 * 0.26, 2.2, i % 2 === 0 ? cyan[6] : gold[6], PURE_WHITE, 0.96);
        }
      }
    };
  }
};

// 2. MULTI-LAYER RUNEBLADE CRESCENT SLASH (`runebladeCrescentSlash`)
export const runebladeCrescentSlash = {
  duration: 0.34,
  loop: false,
  defaults: { palette: RUNIC_CYAN_PALETTE, seed: 83 },
  create(cfg) {
    const cyan = buildColorRamp(cfg.palette, 8);
    const gold = buildColorRamp(RUNIC_GOLD_PALETTE, 8);
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, cyan[6], gold[5], cyan[4]] });
    let t = 0;
    let burstDone = false;

    return {
      step(dt) {
        if (!burstDone) {
          burstDone = true;
          for (let i = 0; i < 14; i++) {
            const a = rng.between(-Math.PI * 0.6, Math.PI * 0.6);
            const spd = rng.between(44, 136);
            motes.emit(
              i % 2 === 0 ? 'glint' : 'spark',
              Math.cos(a) * 14,
              Math.sin(a) * 14,
              Math.cos(a) * spd,
              Math.sin(a) * spd,
              rng.between(0.16, 0.3),
              i % 3 === 0 ? gold[5] : cyan[5],
              1.05,
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

        drawMultiLayerCrescentArc(pen, {
          cx: -2,
          cy: 0,
          radius: 28,
          thickness: 9.0,
          startAngle: -1.3,
          endAngle: 1.3,
          progress: u,
          ramp8: cyan,
          echoColor: gold[5],
          alpha: fade,
          seed: cfg.seed || 83
        });
        drawStarburstFlare(pen, 20, 0, 8 * fade, fade * 0.94, [cyan[4], gold[5], cyan[6], PURE_WHITE]);
        motes.render(pen);
      }
    };
  }
};

// 3. 2.5D TEMPEST CYCLONE RING (`tempestCycloneRing`)
export const tempestCycloneRing = {
  duration: 0.56,
  loop: false,
  defaults: { palette: RUNIC_CYAN_PALETTE, seed: 127 },
  create(cfg) {
    const cyan = buildColorRamp(cfg.palette, 8);
    const gold = buildColorRamp(RUNIC_GOLD_PALETTE, 8);
    const band4 = [cyan[2], cyan[5], gold[5], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, cyan[6], gold[5], cyan[4]] });
    let t = 0;
    let acc = 0;

    return {
      step(dt) {
        t += dt;
        acc += dt * 42;
        while (acc >= 1 && t < 0.48) {
          acc -= 1;
          const a = rng.between(0, Math.PI * 2);
          motes.emit(
            'glint',
            Math.cos(a) * 32,
            Math.sin(a) * 8,
            -Math.sin(a) * 95,
            rng.between(-45, 15),
            rng.between(0.16, 0.3),
            rng.chance(0.35) ? gold[5] : cyan[5],
            1.0,
            0
          );
        }
        motes.step(dt);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.56);
        const env = Math.sin(u * Math.PI);
        if (env <= 0.02) return;
        drawTiltedOrbitBand(pen, 0, 4, 34, 0.24, 1.9, 0.94 * env, band4, null, true);
        drawTiltedOrbitBand(pen, 0, -6, 26, 0.22, 1.6, 0.86 * env, band4, null, false);
        motes.render(pen);
      }
    };
  }
};

// 4. EARTHSHATTER JUDGMENT WAVE (`earthshatterJudgmentWave`)
export const earthshatterJudgmentWave = {
  duration: 0.68,
  loop: false,
  defaults: { palette: RUNIC_CYAN_PALETTE, seed: 193 },
  create(cfg) {
    const cyan = buildColorRamp(cfg.palette, 8);
    const gold = buildColorRamp(RUNIC_GOLD_PALETTE, 8);
    const band4 = [cyan[2], cyan[5], gold[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, cyan[6], gold[5], cyan[4]], floorY: 0 });
    let t = 0;
    let burstDone = false;

    return {
      step(dt) {
        if (!burstDone) {
          burstDone = true;
          for (let i = 0; i < 24; i++) {
            const rx = rng.between(-44, 44);
            motes.emit(
              i % 2 === 0 ? 'glint' : 'spark',
              rx,
              0,
              rx * 2.5,
              rng.between(-125, -45),
              rng.between(0.24, 0.48),
              i % 3 === 0 ? gold[5] : cyan[5],
              1.2,
              105
            );
          }
        }
        t += dt;
        motes.step(dt);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.68);
        const pop = smoothStep(0, 0.2, u);
        const fade = 1 - Math.pow(u, 1.5);
        if (fade <= 0.02) return;

        drawMultiLayerCrescentArc(pen, {
          cx: 0,
          cy: -16,
          radius: 36,
          thickness: 10.5,
          startAngle: -1.45,
          endAngle: 1.45,
          progress: u,
          ramp8: cyan,
          echoColor: gold[5],
          alpha: fade,
          seed: cfg.seed || 193
        });
        drawTiltedOrbitBand(pen, 0, 0, 54 * pop, 0.22, 2.2, 0.96 * fade, band4, null, true);
        drawTiltedOrbitBand(pen, 0, 0, 36 * pop, 0.22, 1.7, 0.88 * fade, band4, null, false);
        if (u < 0.65) {
          const bolt = buildLightningChain(rng, 0, -64, 0, 0, 0.16, 3);
          pen.polyline(bolt, cyan[5], fade * 0.92);
          pen.polyline(bolt, PURE_WHITE, fade * 0.96);
        }
        motes.render(pen);
      }
    };
  }
};

export const RUNIC_STEEL_EFFECT_REGISTRY = {
  runicVanguardAura,
  runebladeCrescentSlash,
  tempestCycloneRing,
  earthshatterJudgmentWave
};

export const RUNIC_STEEL_SHADER_PACK = RUNIC_STEEL_EFFECT_REGISTRY;
export default RUNIC_STEEL_EFFECT_REGISTRY;
