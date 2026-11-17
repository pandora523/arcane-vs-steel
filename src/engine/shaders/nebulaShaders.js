/**
 * Nebula AI Assistant & Cob Creator Core Shader Suite (`nebulaShaders.js`)
 * First-party 120Hz 2.5D pixel-shader & particle effects for Nyx EX (`nyx_ex` / `NyxEx.js`).
 *
 * Strictly padded `shadeBox` bounds & viewport-safe radii (`0` shadeBox clips, `0` viewport clips).
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
  drawStarburstFlare
} from '../ArcaneShaderFX.js?v=30fps126';

export const NEBULA_CYBER_PALETTE = [
  '#0f1029', // 0: Deep cosmic hoodie navy
  '#3b1f6e', // 1: Royal cosmic indigo
  '#7c3aed', // 2: Amethyst violet
  '#a855f7', // 3: Luminous purple
  '#c084fc', // 4: Pastel lilac glow
  '#d946ef', // 5: Cosmic magenta
  '#22d3ee', // 6: Electric cyan
  '#ffffff'  // 7: Pure white starlight
];

export const NEBULA_COB_PALETTE = [
  '#0f1029', // 0: Space dark
  '#0e7490', // 1: Deep cyber cyan
  '#22d3ee', // 2: Electric cyan
  '#a5f3fc', // 3: Pale cyan core
  '#d946ef', // 4: Cosmic magenta
  '#fde047', // 5: Creator gold spark
  '#f5d0fe', // 6: Nebula prism tint
  '#ffffff'  // 7: Pure white core
];

const ALL_ANGLES = () => true;
const BACK_HALF = (th) => Math.sin(th) < 0;
const FRONT_HALF = (th) => Math.sin(th) >= 0;

function drawNebulaStar4(pen, cx, cy, arm, mainCol, accentCol = PURE_WHITE, alpha = 1) {
  if (arm <= 0.6 || alpha <= 0.02) return;
  pen.line(cx - arm, cy, cx + arm, cy, mainCol, alpha);
  pen.line(cx, cy - arm, cx, cy + arm, mainCol, alpha);
  if (arm >= 4) {
    const d = arm * 0.48;
    pen.line(cx - d, cy - d, cx + d, cy + d, accentCol, alpha * 0.8);
    pen.line(cx - d, cy + d, cx + d, cy - d, accentCol, alpha * 0.8);
  }
  pen.fillCircle(cx, cy, Math.max(1.1, arm * 0.22), PURE_WHITE, alpha);
}

function drawSafeHexOctagon(pen, cx, cy, r, col, alpha, rot = 0) {
  if (r <= 2 || alpha <= 0.02) return;
  const pts = [];
  for (let i = 0; i < 8; i++) {
    const a = rot + (i * Math.PI) / 4;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  for (let i = 0; i < 8; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % 8];
    pen.line(a[0], a[1], b[0], b[1], col, alpha);
  }
}

// ============================================================================
// 1. HOLO-PROMPT BURST (`nebulaPromptBurst`) — Basic Attack & Blink Sparks
// ============================================================================
export const nebulaPromptBurst = {
  duration: 0.34,
  loop: false,
  defaults: { palette: NEBULA_CYBER_PALETTE, seed: 29, radius: 28 },
  create(cfg) {
    const pal = buildColorRamp(cfg.palette, 8);
    const cob = buildColorRamp(NEBULA_COB_PALETTE, 8);
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, pal[6], pal[5], cob[5]] });
    let t = 0;
    let burst = false;

    return {
      step(dt) {
        if (!burst) {
          burst = true;
          for (let i = 0; i < 14; i++) {
            const a = (i / 14) * Math.PI * 2 + rng.between(-0.15, 0.15);
            const spd = rng.between(36, 98);
            motes.emit(
              i % 2 === 0 ? 'glint' : 'streak',
              0,
              0,
              Math.cos(a) * spd,
              Math.sin(a) * spd,
              rng.between(0.16, 0.28),
              i % 3 === 0 ? pal[6] : i % 3 === 1 ? pal[5] : cob[5],
              1,
              0
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
        const r = Math.min(26, (cfg.radius || 28) * (0.45 + 0.55 * smoothStep(0, 0.5, u)));
        drawSafeHexOctagon(pen, 0, 0, r * 0.72, pal[6], fade * 0.9, u * 1.4);
        drawNebulaStar4(pen, 0, 0, r * 0.65, pal[5], pal[6], fade);
        pen.radialGlow(0, 0, r * 0.78, pal[4], 0.24 * fade);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 2. COB CREATOR HOLO-CREST SEAL (`cobCreatorCrestSeal`) — Skill Finisher
// ============================================================================
export const cobCreatorCrestSeal = {
  duration: 0.92,
  loop: false,
  defaults: { palette: NEBULA_COB_PALETTE, seed: 47 },
  create(cfg) {
    const pal = buildColorRamp(cfg.palette, 8);
    const neb = buildColorRamp(NEBULA_CYBER_PALETTE, 8);
    const band4 = [pal[2], pal[4], pal[5], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, pal[3], pal[4], pal[5]] });
    let t = 0;
    let acc = 0;

    return {
      step(dt) {
        t += dt;
        acc += dt * 36;
        while (acc >= 1 && t < 0.74) {
          acc -= 1;
          const a = rng.between(0, Math.PI * 2);
          const dist = rng.between(12, 34);
          motes.emit(
            'glint',
            Math.cos(a) * dist,
            Math.sin(a) * dist * 0.45,
            rng.between(-18, 18),
            rng.between(-52, -16),
            0.26,
            rng.chance(0.5) ? pal[2] : pal[4],
            1,
            0
          );
        }
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 0.92);
        const env = Math.sin(u * Math.PI);
        if (env <= 0.02) return;
        const rx = 44 * smoothStep(0, 0.22, u);
        drawTiltedOrbitBand(pen, 0, 0, rx, 0.34, 2.2, 0.85 * env, band4, BACK_HALF, u < 0.18);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.92);
        const env = Math.sin(u * Math.PI);
        if (env <= 0.02) return;
        const rx = 44 * smoothStep(0, 0.22, u);
        drawTiltedOrbitBand(pen, 0, 0, rx, 0.34, 2.2, 0.9 * env, band4, FRONT_HALF, u < 0.18);
        const crestR = 26 * smoothStep(0, 0.25, u);
        drawSafeHexOctagon(pen, 0, -28, crestR, pal[2], env * 0.92, u * 1.1);
        drawSafeHexOctagon(pen, 0, -28, crestR * 0.78, pal[4], env * 0.88, -u * 1.1);
        drawNebulaStar4(pen, 0, -28, 12 * env, pal[5], pal[2], env);
        pen.radialGlow(0, -18, 36 * env, neb[4], 0.22 * env);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 3. ORBITAL HOLO-MATRIX (`nebulaOrbitalMatrix`) — Overdrive Ultimate
// ============================================================================
export const nebulaOrbitalMatrix = {
  duration: 1.56,
  loop: false,
  defaults: { palette: NEBULA_CYBER_PALETTE, seed: 83 },
  create(cfg) {
    const pal = buildColorRamp(cfg.palette, 8);
    const cob = buildColorRamp(NEBULA_COB_PALETTE, 8);
    const band4 = [pal[6], pal[5], cob[5], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, pal[6], pal[5], cob[5]] });
    let t = 0;
    let acc = 0;

    return {
      step(dt) {
        t += dt;
        acc += dt * 42;
        while (acc >= 1 && t < 1.32) {
          acc -= 1;
          const a = rng.between(0, Math.PI * 2);
          const dist = rng.between(18, 46);
          motes.emit(
            'glint',
            Math.cos(a) * dist,
            -26 + Math.sin(a) * dist * 0.55,
            -Math.cos(a) * 28,
            -Math.sin(a) * 16,
            0.28,
            rng.chance(0.5) ? pal[6] : pal[5],
            1,
            0
          );
        }
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 1.56);
        const env = Math.sin(u * Math.PI);
        if (env <= 0.02) return;
        const r = 52 * smoothStep(0, 0.24, u);
        drawTiltedOrbitBand(pen, 0, 0, r, 0.34, 2.5, 0.88 * env, band4, BACK_HALF, false);
        drawSafeHexOctagon(pen, 0, -26, r * 0.72, pal[3], env * 0.72, u * 1.8);
      },
      renderFront(pen) {
        const u = clamp01(t / 1.56);
        const env = Math.sin(u * Math.PI);
        if (env <= 0.02) return;
        const r = 52 * smoothStep(0, 0.24, u);
        drawTiltedOrbitBand(pen, 0, 0, r, 0.34, 2.5, 0.92 * env, band4, FRONT_HALF, false);
        // 6 converging prism star nodes
        for (let k = 0; k < 6; k++) {
          const ang = u * Math.PI * 2 + (k * Math.PI) / 3;
          const nx = Math.cos(ang) * 44;
          const ny = -28 + Math.sin(ang) * 26;
          drawNebulaStar4(pen, nx, ny, 7.5 * env, k % 2 === 0 ? pal[6] : pal[5], cob[5], env);
          if (u > 0.38 && u < 0.86) {
            const chain = buildLightningChain(rng, nx, ny, 0, -22, 0.14, 2);
            for (let j = 0; j < chain.length - 1; j++) {
              pen.line(chain[j][0], chain[j][1], chain[j + 1][0], chain[j + 1][1], pal[6], env * 0.85);
            }
          }
        }
        drawStarburstFlare(pen, 0, -24, 15 * env, 8, pal[6], pal[5], env);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 4. COB GENESIS SANCTUARY CORE (`cobGenesisSanctuaryCore`) — Supreme True Ult
// ============================================================================
export const cobGenesisSanctuaryCore = {
  duration: 3.60,
  loop: false,
  defaults: { palette: NEBULA_COB_PALETTE, seed: 109 },
  create(cfg) {
    const cob = buildColorRamp(cfg.palette, 8);
    const neb = buildColorRamp(NEBULA_CYBER_PALETTE, 8);
    const band4 = [cob[2], cob[4], cob[5], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, cob[2], cob[4], cob[5]] });
    let t = 0;
    let acc = 0;

    return {
      step(dt) {
        t += dt;
        acc += dt * 46;
        while (acc >= 1 && t < 3.2) {
          acc -= 1;
          const a = rng.between(0, Math.PI * 2);
          const dist = rng.between(18, 56);
          motes.emit(
            'glint',
            Math.cos(a) * dist,
            -30 + Math.sin(a) * dist * 0.45,
            -Math.cos(a) * 22,
            rng.between(-36, -10),
            0.34,
            rng.chance(0.4) ? cob[2] : rng.chance(0.5) ? cob[4] : cob[5],
            1,
            0
          );
        }
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 3.60);
        const env = Math.sin(u * Math.PI);
        if (env <= 0.02) return;
        const rFloor = 58 * smoothStep(0, 0.16, u);
        drawTiltedOrbitBand(pen, 0, 0, rFloor, 0.30, 2.8, 0.88 * env, band4, BACK_HALF, false);
        drawSafeHexOctagon(pen, 0, -34, 46 * env, neb[3], env * 0.78, u * 1.6);
        pen.radialGlow(0, -28, 48 * env, neb[2], 0.22 * env);
      },
      renderFront(pen) {
        const u = clamp01(t / 3.60);
        const env = Math.sin(u * Math.PI);
        if (env <= 0.02) return;
        const rFloor = 58 * smoothStep(0, 0.16, u);
        drawTiltedOrbitBand(pen, 0, 0, rFloor, 0.30, 2.8, 0.94 * env, band4, FRONT_HALF, u > 0.62 && u < 0.78);
        drawSafeHexOctagon(pen, 0, -34, 40 * env, cob[2], env * 0.92, -u * 2.0);
        drawSafeHexOctagon(pen, 0, -34, 30 * env, cob[4], env * 0.90, u * 2.4);
        drawNebulaStar4(pen, 0, -34, 22 * env, cob[5], cob[2], env);
        // Constellation starlight arcs inside safe padded radius (<= 56px from center)
        for (let k = 0; k < 8; k++) {
          const ang = u * Math.PI * 2 + (k * Math.PI) / 4;
          const sx = Math.cos(ang) * 48 * env;
          const sy = -34 + Math.sin(ang) * 28 * env;
          drawNebulaStar4(pen, sx, sy, 5.5 * env, k % 2 === 0 ? cob[2] : cob[4], cob[5], env);
        }
        motes.render(pen);
      }
    };
  }
};

export const NEBULA_EFFECT_REGISTRY = {
  nebulaPromptBurst,
  cobCreatorCrestSeal,
  nebulaOrbitalMatrix,
  cobGenesisSanctuaryCore
};
