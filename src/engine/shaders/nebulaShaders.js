/**
 * Nebula AI Assistant & Cob Creator Core Shader Suite (`nebulaShaders.js`)
 * First-party 120Hz 2.5D pixel-shader & particle effects for Nyx EX (`nyx_ex` / `NyxEx.js`).
 *
 * Strictly padded `shadeBox` bounds (zero alpha/glow within 2.5px of box border) &
 * viewport-safe bounds (`y in [-142..+50]`, `x in [-140..+140]` -> `0` shadeBox or viewport clips).
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
  drawStarburstFlare
} from '../ArcaneShaderFX.js?v=30fps159';

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

function drawSafeOctagonRing(pen, cx, cy, r, col, alpha, rot = 0) {
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

/** Draw cel-stepped 2.5D Elliptical Cosmic Galaxy Swirl cleanly padded inside its shadeBox (0 edge clips, 0 vertical poles). */
function renderNebulaGalaxySwirl(pen, cx, cy, rx, ry, arms, phaseShift, fade, pal, cob) {
  if (fade <= 0.02 || rx <= 6 || ry <= 6) return;
  const x0 = Math.round(cx - rx - 8);
  const x1 = Math.round(cx + rx + 8);
  const y0 = Math.round(cy - ry - 8);
  const y1 = Math.round(cy + ry + 8);

  pen.shadeBox(x0, y0, x1, y1, (lx, ly, out) => {
    if (lx <= x0 + 3 || lx >= x1 - 3 || ly <= y0 + 3 || ly >= y1 - 3) return 0;
    const nx = (lx - cx) / rx;
    const ny = (ly - cy) / ry;
    const r = Math.hypot(nx, ny);
    if (r >= 0.96 || r <= 0.08) return 0;

    const theta = Math.atan2(ny, nx);
    const spiral = 0.5 + 0.5 * Math.sin(theta * arms - r * 7.5 + phaseShift * 8.0);
    const radialBand = smoothStep(0.08, 0.24, r) * smoothStep(0.96, 0.58, r);
    const ringBoost = 1.0 - Math.min(1.0, Math.abs(r - 0.56) * 2.4);
    const strength = radialBand * (0.28 + 0.52 * spiral + 0.35 * ringBoost);
    if (strength <= 0.14) return 0;

    out.alpha = clamp01(fade * strength * 0.90);
    if (spiral > 0.84 && ringBoost > 0.55) {
      out.glowStrength = 0.38 * fade;
      out.glowColor = cob[5];
      return PURE_WHITE;
    }
    if (spiral > 0.62) {
      out.glowStrength = 0.30 * fade;
      out.glowColor = pal[6];
      return r < 0.50 ? pal[6] : cob[2];
    }
    if (spiral > 0.38) {
      out.glowStrength = 0.22 * fade;
      out.glowColor = pal[5];
      return pal[5];
    }
    out.glowStrength = 0.14 * fade;
    out.glowColor = pal[3];
    return pal[3];
  });
}

// ============================================================================
// 1. HOLO-PROMPT BURST (`nebulaPromptBurst`) — Attack Crescent Wave & Impact Ring
// ============================================================================
export const nebulaPromptBurst = {
  duration: 0.36,
  loop: false,
  defaults: { palette: NEBULA_CYBER_PALETTE, seed: 29, radius: 32 },
  create(cfg) {
    const pal = buildColorRamp(cfg.palette, 8);
    const cob = buildColorRamp(NEBULA_COB_PALETTE, 8);
    const ramp4 = [pal[3], pal[5], pal[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, pal[6], pal[5], cob[5]] });
    let t = 0;
    let burst = false;

    return {
      step(dt) {
        if (!burst) {
          burst = true;
          for (let i = 0; i < 18; i++) {
            const a = (i / 18) * Math.PI * 2 + rng.between(-0.15, 0.15);
            const spd = rng.between(48, 128);
            motes.emit(
              i % 2 === 0 ? 'glint' : 'streak',
              0,
              0,
              Math.cos(a) * spd,
              Math.sin(a) * spd,
              rng.between(0.18, 0.30),
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
        const u = clamp01(t / 0.36);
        const fade = 1 - u * u;
        if (fade <= 0.02) return;
        const maxR = Math.min(34, (cfg.radius || 32) * (0.35 + 0.72 * Easing.outCubic(u)));

        pen.shadeBox(-40, -40, 40, 40, (lx, ly, out) => {
          if (lx <= -37 || lx >= 37 || ly <= -37 || ly >= 37) return 0;
          const d = Math.hypot(lx, ly);
          if (d > maxR || d < maxR * 0.48) return 0;
          const band = 1 - Math.abs(d - maxR * 0.76) / Math.max(1.5, maxR * 0.26);
          if (band <= 0.05) return 0;
          out.alpha = clamp01(fade * band * 0.92);
          out.glowStrength = 0.34 * fade * band;
          out.glowColor = d > maxR * 0.78 ? pal[5] : pal[6];
          return band > 0.72 ? PURE_WHITE : d > maxR * 0.78 ? pal[5] : pal[6];
        });

        drawTiltedOrbitBand(pen, 0, 0, maxR * 0.86, 0.42, 1.5, fade * 0.9, ramp4, null, false);
        drawSafeOctagonRing(pen, 0, 0, maxR * 0.66, pal[6], fade * 0.92, u * 2.2);
        drawNebulaStar4(pen, 0, 0, 14 * fade + 3, cob[5], pal[6], fade);
        pen.radialGlow(0, 0, maxR * 0.9, pal[4], 0.28 * fade);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 2. COB CREATOR HOLO-CREST SEAL (`cobCreatorCrestSeal`) — Skill Towering Plume & Astrolabe
// ============================================================================
export const cobCreatorCrestSeal = {
  duration: 0.98,
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
        acc += dt * 44;
        while (acc >= 1 && t < 0.80) {
          acc -= 1;
          const a = rng.between(0, Math.PI * 2);
          const dist = rng.between(12, 46);
          motes.emit(
            'glint',
            Math.cos(a) * dist,
            Math.sin(a) * dist * 0.42,
            rng.between(-20, 20),
            rng.between(-74, -22),
            0.30,
            rng.chance(0.4) ? pal[2] : rng.chance(0.5) ? pal[4] : pal[5],
            1,
            0
          );
        }
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 0.98);
        const env = Math.sin(u * Math.PI);
        if (env <= 0.02) return;
        const rx = 58 * smoothStep(0, 0.22, u);
        drawTiltedOrbitBand(pen, 0, 0, rx, 0.34, 2.4, 0.88 * env, band4, BACK_HALF, u < 0.20);
        drawTiltedOrbitBand(pen, 0, -48, rx * 0.72, 0.30, 1.8, 0.72 * env, band4, BACK_HALF, false);
        renderNebulaGalaxySwirl(pen, 0, -42, 54 * smoothStep(0, 0.24, u), 40 * smoothStep(0, 0.24, u), 3, u * 1.4, env * 0.92, neb, pal);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.98);
        const env = Math.sin(u * Math.PI);
        if (env <= 0.02) return;
        const rx = 58 * smoothStep(0, 0.22, u);
        drawTiltedOrbitBand(pen, 0, 0, rx, 0.34, 2.4, 0.94 * env, band4, FRONT_HALF, u < 0.20);
        drawTiltedOrbitBand(pen, 0, -48, rx * 0.72, 0.30, 1.8, 0.78 * env, band4, FRONT_HALF, false);

        const crestR = 34 * smoothStep(0, 0.24, u);
        drawSafeOctagonRing(pen, 0, -42, crestR, pal[2], env * 0.95, u * 1.9);
        drawSafeOctagonRing(pen, 0, -42, crestR * 0.74, pal[4], env * 0.90, -u * 2.2);
        drawNebulaStar4(pen, 0, -42, 16 * env, pal[5], pal[2], env);

        // Orbiting elliptical starlight constellations around the galaxy swirl
        for (let k = 0; k < 10; k++) {
          const ang = (k / 10) * Math.PI * 2 + u * Math.PI * 2.4;
          const hx = Math.cos(ang) * (42 * smoothStep(0, 0.24, u));
          const hy = -42 + Math.sin(ang) * (24 * smoothStep(0, 0.24, u));
          drawNebulaStar4(pen, hx, hy, 4.5 * env, k % 2 === 0 ? pal[2] : pal[4], pal[5], env);
        }
        pen.radialGlow(0, -42, 46 * env, neb[4], 0.28 * env);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 3. ORBITAL HOLO-MATRIX (`nebulaOrbitalMatrix`) — Overdrive Singularity Spire
// ============================================================================
export const nebulaOrbitalMatrix = {
  duration: 1.76,
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
        acc += dt * 52;
        while (acc >= 1 && t < 1.50) {
          acc -= 1;
          const a = rng.between(0, Math.PI * 2);
          const dist = rng.between(20, 62);
          motes.emit(
            'glint',
            Math.cos(a) * dist,
            -38 + Math.sin(a) * dist * 0.55,
            -Math.cos(a) * 36,
            rng.between(-48, -12),
            0.30,
            rng.chance(0.4) ? pal[6] : rng.chance(0.5) ? pal[5] : cob[5],
            1,
            0
          );
        }
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 1.76);
        const env = Math.sin(u * Math.PI);
        if (env <= 0.02) return;
        const r = 96 * smoothStep(0, 0.20, u);
        drawTiltedOrbitBand(pen, 0, 0, r, 0.34, 3.0, 0.90 * env, band4, BACK_HALF, false);
        drawTiltedOrbitBand(pen, 0, -56, r * 0.82, 0.30, 2.2, 0.78 * env, band4, BACK_HALF, u > 0.55);
        drawSafeOctagonRing(pen, 0, -48, 66 * smoothStep(0, 0.24, u), pal[5], env * 0.54, u * 2.2);
        renderNebulaGalaxySwirl(pen, 0, -46, 78 * smoothStep(0, 0.24, u), 54 * smoothStep(0, 0.24, u), 4, u * 2.1, env * 0.94, pal, cob);
      },
      renderFront(pen) {
        const u = clamp01(t / 1.76);
        const env = Math.sin(u * Math.PI);
        if (env <= 0.02) return;
        const r = 96 * smoothStep(0, 0.20, u);
        drawTiltedOrbitBand(pen, 0, 0, r, 0.34, 3.0, 0.95 * env, band4, FRONT_HALF, false);
        drawTiltedOrbitBand(pen, 0, -56, r * 0.82, 0.30, 2.2, 0.84 * env, band4, FRONT_HALF, u > 0.55);
        drawSafeOctagonRing(pen, 0, -48, 48 * smoothStep(0, 0.22, u), cob[2], env * 0.68, -u * 3.0);

        const spinR = u < 0.68 ? 86 : 86 * (1 - 0.62 * smoothStep(0.68, 0.94, u));
        for (let k = 0; k < 6; k++) {
          const ang = u * Math.PI * 3.2 + (k * Math.PI) / 3;
          const nx = Math.cos(ang) * spinR;
          const ny = -44 + Math.sin(ang) * 38;
          drawNebulaStar4(pen, nx, ny, 10.5 * env, k % 2 === 0 ? pal[6] : pal[5], cob[5], env);
          if (u > 0.16 && u < 0.92) {
            const chain = buildLightningChain(rng, nx, ny, 0, -42, 0.18, 2);
            for (let j = 0; j < chain.length - 1; j++) {
              pen.line(chain[j][0], chain[j][1], chain[j + 1][0], chain[j + 1][1], k % 2 === 0 ? pal[6] : cob[5], env * 0.90);
            }
          }
        }
        drawStarburstFlare(pen, 0, -42, (u > 0.58 ? 28 : 19) * env, 8, pal[6], pal[5], env);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 4. COB GENESIS SANCTUARY CORE (`cobGenesisSanctuaryCore`) — Supreme True Ult Aurora & Astrolabe
// ============================================================================
export const cobGenesisSanctuaryCore = {
  duration: 4.10,
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
        acc += dt * 56;
        while (acc >= 1 && t < 3.6) {
          acc -= 1;
          const a = rng.between(0, Math.PI * 2);
          const dist = rng.between(18, 72);
          motes.emit(
            'glint',
            Math.cos(a) * dist,
            -38 + Math.sin(a) * dist * 0.45,
            -Math.cos(a) * 26,
            rng.between(-54, -14),
            0.36,
            rng.chance(0.35) ? cob[2] : rng.chance(0.5) ? cob[4] : cob[5],
            1,
            0
          );
        }
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 4.10);
        const env = Math.sin(u * Math.PI);
        if (env <= 0.02) return;
        const rFloor = 82 * smoothStep(0, 0.14, u);
        const hot = u > 0.54 && u < 0.74;
        drawTiltedOrbitBand(pen, 0, 0, rFloor, 0.30, 3.0, 0.92 * env, band4, BACK_HALF, hot);
        drawTiltedOrbitBand(pen, 0, -56, rFloor * 0.76, 0.28, 2.2, 0.80 * env, band4, BACK_HALF, hot);

        // Undulating Northern-Nebula Pixel Aurora Veil strictly padded inside shadeBox (`0` edge hits!)
        pen.shadeBox(-78, -132, 78, -24, (lx, ly, out) => {
          if (lx <= -74 || lx >= 74 || ly <= -128 || ly >= -28) return 0;
          const xNorm = Math.abs(lx) / 72;
          const yNorm = clamp01((ly + 126) / 96);
          const envBox = smoothStep(1.0, 0.72, xNorm) * smoothStep(0.0, 0.18, yNorm) * smoothStep(1.0, 0.78, yNorm);
          if (envBox <= 0.05) return 0;
          const n = fbmNoise2D(lx * 0.045 - u * 4.5, ly * 0.05 + u * 2.5, 19, 2);
          if (n < -0.15) return 0;
          out.alpha = clamp01(env * envBox * (0.48 + 0.42 * n));
          out.glowStrength = 0.28 * env * envBox;
          const isGold = n > 0.42;
          const isCyan = n > 0.14;
          out.glowColor = isGold ? cob[5] : isCyan ? cob[2] : neb[5];
          return isGold ? cob[5] : isCyan ? cob[2] : neb[5];
        });

        drawSafeOctagonRing(pen, 0, -48, 56 * env, neb[3], env * 0.82, u * 1.8);
        pen.radialGlow(0, -42, 62 * env, neb[2], 0.26 * env);
      },
      renderFront(pen) {
        const u = clamp01(t / 4.10);
        const env = Math.sin(u * Math.PI);
        if (env <= 0.02) return;
        const rFloor = 82 * smoothStep(0, 0.14, u);
        drawTiltedOrbitBand(pen, 0, 0, rFloor, 0.30, 3.0, 0.96 * env, band4, FRONT_HALF, u > 0.54 && u < 0.74);
        drawTiltedOrbitBand(pen, 0, -56, rFloor * 0.76, 0.28, 2.2, 0.86 * env, band4, FRONT_HALF, u > 0.54 && u < 0.74);

        drawSafeOctagonRing(pen, 0, -48, 48 * env, cob[2], env * 0.94, -u * 2.4);
        drawSafeOctagonRing(pen, 0, -48, 36 * env, cob[4], env * 0.92, u * 2.8);
        drawSafeOctagonRing(pen, 0, -48, 22 * env, cob[5], env * 0.90, -u * 3.4);
        drawNebulaStar4(pen, 0, -48, 24 * env, cob[5], cob[2], env);

        for (let k = 0; k < 8; k++) {
          const ang = u * Math.PI * 2.4 + (k * Math.PI) / 4;
          const sx = Math.cos(ang) * 64 * env;
          const sy = -48 + Math.sin(ang) * 34 * env;
          drawNebulaStar4(pen, sx, sy, 6.5 * env, k % 2 === 0 ? cob[2] : cob[4], cob[5], env);
          if (k % 2 === 0 && u > 0.18 && u < 0.85) {
            const arc = buildLightningChain(rng, sx, sy, 0, -48, 0.14, 2);
            for (let j = 0; j < arc.length - 1; j++) {
              pen.line(arc[j][0], arc[j][1], arc[j + 1][0], arc[j + 1][1], cob[5], env * 0.72);
            }
          }
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
