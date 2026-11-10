/**
 * World-Forge Crucible & Runic Anvil Shader Suite (`forgeShaders.js`)
 * First-party 120Hz 2.5D multi-layer pixel-shader & particle effects for Torgar (`titan` / `Titan.js`).
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

export const FORGE_GOLD_PALETTE = [
  '#180f0a',
  '#451a03',
  '#7c2d12',
  '#b45309',
  '#d97706',
  '#f59e0b',
  '#fde047',
  '#ffffff'
];

export const FORGE_JADE_PALETTE = [
  '#041b15',
  '#064e3b',
  '#047857',
  '#059669',
  '#10b981',
  '#34d399',
  '#a7f3d0',
  '#ffffff'
];

const BACK_HALF = (theta) => Math.sin(theta) < 0;
const FRONT_HALF = (theta) => Math.sin(theta) >= 0;

function drawPixelAnvilRune(pen, cx, cy, r, mainCol, coreCol, alpha = 1) {
  pen.fillCircle(cx, cy, r + 0.8, '#180f0a', alpha * 0.92);
  pen.fillCircle(cx, cy, r, mainCol, alpha * 0.96);
  pen.stipple(cx, cy, coreCol, alpha);
}

// 1. 2.5D ORBITING FORGE MAGMA MANTLE (`forgeMagmaMantle`)
export const forgeMagmaMantle = {
  duration: 1.0,
  loop: true,
  defaults: { palette: FORGE_GOLD_PALETTE, seed: 41 },
  create(cfg) {
    const gold = buildColorRamp(cfg.palette, 8);
    const jade = buildColorRamp(FORGE_JADE_PALETTE, 8);
    const band4 = [gold[2], jade[4], gold[6], PURE_WHITE];
    let phase = 0;

    return {
      step(dt) {
        phase += dt;
      },
      renderBack(pen) {
        drawTiltedOrbitBand(pen, 0, 0, 24, 0.28, 1.6, 0.86, band4, BACK_HALF, false);
        for (let i = 0; i < 4; i++) {
          const a = phase * 2.2 + (i * Math.PI) / 2;
          if (Math.sin(a) >= 0) continue;
          drawPixelAnvilRune(pen, Math.cos(a) * 24, Math.sin(a) * 24 * 0.28, 2.0, i % 2 === 0 ? gold[5] : jade[5], PURE_WHITE, 0.9);
        }
      },
      renderFront(pen) {
        drawTiltedOrbitBand(pen, 0, 0, 24, 0.28, 1.7, 0.94, band4, FRONT_HALF, true);
        for (let i = 0; i < 4; i++) {
          const a = phase * 2.2 + (i * Math.PI) / 2;
          if (Math.sin(a) < 0) continue;
          drawPixelAnvilRune(pen, Math.cos(a) * 24, Math.sin(a) * 24 * 0.28, 2.3, i % 2 === 0 ? gold[6] : jade[5], PURE_WHITE, 0.96);
        }
      }
    };
  }
};

// 2. MULTI-LAYER WORLD-BREAKER ANVIL CLEAVE (`worldBreakerAnvilCleave`)
export const worldBreakerAnvilCleave = {
  duration: 0.36,
  loop: false,
  defaults: { palette: FORGE_GOLD_PALETTE, seed: 73 },
  create(cfg) {
    const gold = buildColorRamp(cfg.palette, 8);
    const jade = buildColorRamp(FORGE_JADE_PALETTE, 8);
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, gold[6], jade[5], gold[4]] });
    let t = 0;
    let burstDone = false;

    return {
      step(dt) {
        if (!burstDone) {
          burstDone = true;
          for (let i = 0; i < 14; i++) {
            const a = rng.between(-Math.PI * 0.65, Math.PI * 0.65);
            const spd = rng.between(42, 138);
            motes.emit(
              i % 3 === 0 ? 'glint' : 'spark',
              Math.cos(a) * 14,
              Math.sin(a) * 14,
              Math.cos(a) * spd,
              Math.sin(a) * spd,
              rng.between(0.16, 0.32),
              i % 3 === 0 ? jade[5] : gold[6],
              1.1,
              14
            );
          }
        }
        t += dt;
        motes.step(dt);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.36);
        const fade = 1 - u;
        if (fade <= 0.02) return;

        drawMultiLayerCrescentArc(pen, {
          cx: -2,
          cy: 0,
          radius: 30,
          thickness: 9.5,
          startAngle: -1.35,
          endAngle: 1.35,
          progress: u,
          ramp8: gold,
          echoColor: jade[5],
          alpha: fade,
          seed: cfg.seed || 73
        });
        drawStarburstFlare(pen, 22, 4, 9 * fade, fade * 0.95, [gold[4], jade[5], gold[6], PURE_WHITE]);
        motes.render(pen);
      }
    };
  }
};

// 3. TECTONIC CRATER SHOCKWAVE (`tectonicCraterShockwave`)
export const tectonicCraterShockwave = {
  duration: 0.46,
  loop: false,
  defaults: { palette: FORGE_GOLD_PALETTE, seed: 113 },
  create(cfg) {
    const gold = buildColorRamp(cfg.palette, 8);
    const jade = buildColorRamp(FORGE_JADE_PALETTE, 8);
    const band4 = [gold[2], jade[4], gold[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, gold[6], jade[5], gold[4]], floorY: 0 });
    let t = 0;
    let burstDone = false;

    return {
      step(dt) {
        if (!burstDone) {
          burstDone = true;
          for (let i = 0; i < 16; i++) {
            const rx = rng.between(-28, 28);
            motes.emit(
              i % 2 === 0 ? 'spark' : 'glint',
              rx,
              0,
              rx * 2.2,
              rng.between(-95, -35),
              rng.between(0.18, 0.38),
              i % 2 === 0 ? gold[6] : jade[5],
              1.1,
              95
            );
          }
        }
        t += dt;
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 0.46);
        const pop = smoothStep(0, 0.22, u);
        const fade = 1 - u * u;
        if (fade <= 0.02) return;
        drawTiltedOrbitBand(pen, 0, 0, 38 * pop, 0.22, 1.9, 0.92 * fade, band4, null, true);
        drawTiltedOrbitBand(pen, 0, 0, 24 * pop, 0.22, 1.5, 0.84 * fade, band4, null, false);
        motes.render(pen);
      }
    };
  }
};

// 4. RAGNAROK WORLD-FORGE WAVE (`ragnarokWorldForgeWave`)
export const ragnarokWorldForgeWave = {
  duration: 0.64,
  loop: false,
  defaults: { palette: FORGE_GOLD_PALETTE, seed: 181 },
  create(cfg) {
    const gold = buildColorRamp(cfg.palette, 8);
    const jade = buildColorRamp(FORGE_JADE_PALETTE, 8);
    const band4 = [gold[2], jade[4], gold[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, gold[6], jade[5], gold[4]], floorY: 0 });
    let t = 0;
    let burstDone = false;

    return {
      step(dt) {
        if (!burstDone) {
          burstDone = true;
          for (let i = 0; i < 22; i++) {
            const rx = rng.between(-42, 42);
            motes.emit(
              i % 2 === 0 ? 'glint' : 'spark',
              rx,
              0,
              rx * 2.6,
              rng.between(-120, -45),
              rng.between(0.24, 0.48),
              i % 2 === 0 ? gold[6] : jade[5],
              1.2,
              110
            );
          }
        }
        t += dt;
        motes.step(dt);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.64);
        const pop = smoothStep(0, 0.2, u);
        const fade = 1 - Math.pow(u, 1.5);
        if (fade <= 0.02) return;

        drawMultiLayerCrescentArc(pen, {
          cx: 0,
          cy: -14,
          radius: 36,
          thickness: 10.5,
          startAngle: -1.45,
          endAngle: 1.45,
          progress: u,
          ramp8: gold,
          echoColor: jade[5],
          alpha: fade,
          seed: cfg.seed || 181
        });
        drawTiltedOrbitBand(pen, 0, 0, 52 * pop, 0.22, 2.2, 0.96 * fade, band4, null, true);
        drawTiltedOrbitBand(pen, 0, 0, 34 * pop, 0.22, 1.7, 0.88 * fade, band4, null, false);
        if (u < 0.65) {
          const bolt = buildLightningChain(rng, 0, -58, 0, 0, 0.16, 3);
          pen.polyline(bolt, jade[5], fade * 0.92);
          pen.polyline(bolt, PURE_WHITE, fade * 0.96);
        }
        motes.render(pen);
      }
    };
  }
};

export const FORGE_EFFECT_REGISTRY = {
  forgeMagmaMantle,
  worldBreakerAnvilCleave,
  tectonicCraterShockwave,
  ragnarokWorldForgeWave
};

export const FORGE_SHADER_PACK = FORGE_EFFECT_REGISTRY;
export default FORGE_EFFECT_REGISTRY;
