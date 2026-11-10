/**
 * Solar Archmage & Black-Sun Eclipse Shader Suite (`solarShaders.js`)
 * First-party 120Hz 2.5D pixel-shader & particle effects for Ignis Sol (`mage` / `FireMage.js`).
 *
 * Powers both:
 *   1. Live 120Hz `ArcaneShaderFX` (`back` + `front` 2.5D depth wraps around Ignis Sol & opponents)
 *   2. Offline 30fps `assets/sprites/mage_vfx.png` (`6240x1040`, 5 rows x 30 cols @ 208x208)
 */

import {
  PURE_WHITE,
  packHexColor,
  buildColorRamp,
  clamp01,
  smoothStep,
  fbmNoise2D as fbm2D,
  DeterministicRng,
  MotePool,
  buildLightningChain,
  drawTiltedOrbitBand,
  drawStarburstFlare
} from '../ArcaneShaderFX.js?v=30fps46';

export const SOLAR_CORONA_PALETTE = [
  '#18080a',
  '#450a0a',
  '#991b1b',
  '#dc2626',
  '#ea580c',
  '#fb923c',
  '#facc15',
  '#fef08a'
];

export const ECLIPSE_ABYSS_PALETTE = [
  '#07040a',
  '#1f0612',
  '#4c0519',
  '#881337',
  '#dc2626',
  '#fb923c',
  '#fde047',
  '#ffffff'
];

const BACK_HALF = (theta) => Math.sin(theta) < 0;
const FRONT_HALF = (theta) => Math.sin(theta) >= 0;

function drawHeliosStar(pen, cx, cy, r, coreCol, flareCol, alpha = 1, rot = 0) {
  for (let k = 0; k < 8; k++) {
    const a = rot + (k * Math.PI) / 4;
    const len = k % 2 === 0 ? r : r * 0.62;
    pen.line(
      cx,
      cy,
      cx + Math.cos(a) * len,
      cy + Math.sin(a) * len,
      k % 2 === 0 ? coreCol : flareCol,
      alpha * (k % 2 === 0 ? 0.95 : 0.78)
    );
  }
  pen.fillCircle(cx, cy, Math.max(1.3, r * 0.24), PURE_WHITE, alpha);
  pen.radialGlow(cx, cy, r * 0.85, flareCol, 0.34 * alpha);
}

// ============================================================================
// 1. 2.5D ORBITING HELIOS SUN-CORES (`heliosOrbitingSuns`)
// ============================================================================
export const heliosOrbitingSuns = {
  duration: 2.4,
  loop: true,
  defaults: {
    palette: SOLAR_CORONA_PALETTE,
    seed: 19,
    primed: false
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, ramp[7], ramp[5], ramp[3]] });
    let phase = 0;
    let emitAcc = 0;

    function drawHalf(pen, isFront) {
      const primed = Boolean(cfg.primed);
      const count = primed ? 3 : 2;
      const rx = primed ? 15.5 : 13.5;
      const ry = 4.6;
      const bandRamp = [ramp[2], ramp[4], ramp[6], PURE_WHITE];
      drawTiltedOrbitBand(
        pen,
        0,
        0,
        rx,
        ry / rx,
        0.9,
        primed ? 0.55 : 0.34,
        bandRamp,
        isFront ? FRONT_HALF : BACK_HALF,
        false
      );

      for (let i = 0; i < count; i++) {
        const a = phase * 2.6 + (i / count) * Math.PI * 2;
        const sinA = Math.sin(a);
        if ((sinA >= 0) !== isFront) continue;
        const ox = Math.cos(a) * rx;
        const oy = sinA * ry;
        pen.fillCircle(ox, oy, primed ? 2.6 : 2.1, ramp[1], 0.9);
        drawHeliosStar(pen, ox, oy, primed ? 4.8 : 3.8, ramp[7], ramp[5], 0.95, phase * 2);
      }
    }

    return {
      step(dt) {
        phase += dt;
        emitAcc += dt * (cfg.primed ? 26 : 14);
        while (emitAcc >= 1) {
          emitAcc -= 1;
          const a = rng.between(0, Math.PI * 2);
          const ox = Math.cos(a) * 14;
          const oy = Math.sin(a) * 4.5;
          motes.emit(
            rng.chance(0.35) ? 'glint' : 'spark',
            ox,
            oy,
            rng.between(-10, 10),
            rng.between(-22, -6),
            rng.between(0.16, 0.3),
            rng.chance(0.5) ? ramp[7] : ramp[5],
            1,
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
// 2. PYROMANTIC PALM & SUN-STAFF FOCUS (`heliosPalmFocus`)
// ============================================================================
export const heliosPalmFocus = {
  duration: 0.38,
  loop: false,
  defaults: {
    palette: SOLAR_CORONA_PALETTE,
    seed: 29
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, ramp[7], ramp[5], ramp[3]] });
    let t = 0;
    let acc = 0;

    return {
      step(dt) {
        t += dt;
        acc += dt * 58;
        while (acc >= 1 && t < 0.32) {
          acc -= 1;
          const a = rng.between(0, Math.PI * 2);
          const dist = rng.between(9, 17);
          motes.emit(
            'spark',
            Math.cos(a) * dist,
            Math.sin(a) * dist,
            -Math.cos(a) * 42,
            -Math.sin(a) * 42,
            0.18,
            rng.chance(0.5) ? ramp[7] : ramp[5],
            1,
            0
          );
        }
        motes.step(dt);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.38);
        const env = Math.sin(u * Math.PI);
        if (env <= 0.02) return;
        const r = 4.5 + 6.5 * smoothStep(0, 0.7, u);
        drawTiltedOrbitBand(
          pen,
          0,
          0,
          r * 1.35,
          0.42,
          1.1,
          0.85 * env,
          [ramp[2], ramp[4], ramp[6], PURE_WHITE],
          () => true,
          false
        );
        drawHeliosStar(pen, 0, 0, r * 1.45, ramp[7], ramp[5], env, u * 5.2);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 3. SOLAR FIREBALL MACH-CONE & CORONA RELEASE (`solarFireballMachCone`)
// ============================================================================
export const solarFireballMachCone = {
  duration: 0.32,
  loop: false,
  defaults: {
    palette: SOLAR_CORONA_PALETTE,
    seed: 41,
    aimAngle: 0,
    isTwin: false
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, ramp[7], ramp[5], ramp[3]] });
    let t = 0;
    let burstDone = false;

    return {
      step(dt) {
        if (!burstDone) {
          burstDone = true;
          const base = cfg.aimAngle || 0;
          const cnt = cfg.isTwin ? 20 : 14;
          for (let i = 0; i < cnt; i++) {
            const a = base + rng.between(-0.62, 0.62);
            const spd = rng.between(48, 138);
            motes.emit(
              i % 3 === 0 ? 'streak' : 'spark',
              0,
              0,
              Math.cos(a) * spd,
              Math.sin(a) * spd,
              rng.between(0.14, 0.28),
              i % 2 === 0 ? ramp[7] : ramp[5],
              1,
              25
            );
          }
        }
        t += dt;
        motes.step(dt);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.32);
        const fade = 1 - u;
        if (fade <= 0.02) return;
        const aim = cfg.aimAngle || 0;
        const ca = Math.cos(aim);
        const sa = Math.sin(aim);
        const reach = (cfg.isTwin ? 26 : 21) * smoothStep(0, 0.55, u);

        // Dual tilted solar Mach shock-rings along shot vector
        for (let k = 0; k < 2; k++) {
          const d = (k + 0.5) * reach * 0.55;
          const rx = ca * d;
          const ry = sa * d;
          const rr = (cfg.isTwin ? 13 : 10.5) * (1 - k * 0.22) * (0.45 + 0.55 * u);
          for (let s = 0; s < 24; s++) {
            const th = (s / 24) * Math.PI * 2 + u * 4;
            const lx = Math.cos(th) * rr * 0.36;
            const ly = Math.sin(th) * rr;
            const px = rx + lx * ca - ly * sa;
            const py = ry + lx * sa + ly * ca;
            pen.stipple(px, py, s % 3 === 0 ? PURE_WHITE : ramp[6 - k], fade * 0.9);
          }
        }

        // Sweeping crimson-gold crescent arc in front of staff
        const arcR = (cfg.isTwin ? 18 : 14) * (0.6 + 0.4 * u);
        for (let i = -12; i <= 12; i++) {
          const frac = i / 12;
          const ang = aim + frac * 0.92;
          const env = Math.cos(frac * Math.PI * 0.5);
          const px = Math.cos(ang) * arcR;
          const py = Math.sin(ang) * arcR;
          pen.fillCircle(px, py, 1.3 * env + 0.5, Math.abs(i) < 5 ? ramp[7] : ramp[5], fade * 0.92);
        }

        drawStarburstFlare(pen, 0, 0, (cfg.isTwin ? 13 : 10) * fade, fade, [
          ramp[3],
          ramp[5],
          ramp[7],
          PURE_WHITE
        ]);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 4. 2.5D HELIOS FLAME-WARD SHIELD & FLOOR ASTROLABE (`solarFlameWard`)
// ============================================================================
export const solarFlameWard = {
  duration: 0.62,
  loop: false,
  defaults: {
    palette: SOLAR_CORONA_PALETTE,
    seed: 53
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const band4 = [ramp[2], ramp[4], ramp[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, ramp[7], ramp[5], ramp[3]], floorY: 0 });
    let t = 0;
    let acc = 0;

    return {
      step(dt) {
        t += dt;
        acc += dt * 42;
        while (acc >= 1 && t < 0.48) {
          acc -= 1;
          const th = rng.between(-1.1, 1.1);
          motes.emit(
            'spark',
            14 + Math.cos(th) * 8,
            -27 + Math.sin(th) * 14,
            rng.between(8, 34),
            rng.between(-32, 12),
            0.22,
            rng.chance(0.5) ? ramp[7] : ramp[5],
            1,
            35
          );
        }
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 0.62);
        const env = smoothStep(0, 0.14, u) * (1 - smoothStep(0.68, 1.0, u));
        if (env <= 0.02) return;
        drawTiltedOrbitBand(pen, 0, -1, 25, 0.24, 1.4, 0.85 * env, band4, BACK_HALF, false);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.62);
        const env = smoothStep(0, 0.14, u) * (1 - smoothStep(0.68, 1.0, u));
        if (env <= 0.02) return;
        drawTiltedOrbitBand(pen, 0, -1, 25, 0.24, 1.5, 0.92 * env, band4, FRONT_HALF, false);

        // Forward curved Helios Flame-Ward Crescent Dome at `(15, -27)`
        const wx = 15;
        const wy = -27;
        for (let i = -16; i <= 16; i++) {
          const f = i / 16;
          const ang = f * 1.28;
          const domeEnv = Math.cos(f * Math.PI * 0.5);
          const px = wx + Math.cos(ang) * 9;
          const py = wy + Math.sin(ang) * 16;
          pen.fillCircle(px, py, 1.8 * domeEnv + 0.6, ramp[2], 0.88 * env);
          pen.fillCircle(px - 0.5, py, 1.1 * domeEnv + 0.4, Math.abs(i) < 6 ? ramp[7] : ramp[5], 0.95 * env);
          if (i % 4 === 0) {
            pen.stipple(px + 1, py, PURE_WHITE, 0.9 * env);
          }
        }
        drawHeliosStar(pen, wx + 7, wy, 7.5 * env, ramp[7], ramp[5], 0.92 * env, u * 4);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 5. 2.5D ARCANE BLINK BLACK-SUN RIFT PORTAL (`arcaneBlinkRift`)
// ============================================================================
export const arcaneBlinkRift = {
  duration: 0.52,
  loop: false,
  defaults: {
    palette: ECLIPSE_ABYSS_PALETTE,
    seed: 61,
    isArrival: false
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const solar = buildColorRamp(SOLAR_CORONA_PALETTE, 8);
    const band4 = [ramp[3], solar[4], solar[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, solar[7], solar[5], ramp[4]], floorY: 0 });
    let t = 0;
    let burstDone = false;

    return {
      step(dt) {
        if (!burstDone) {
          burstDone = true;
          for (let i = 0; i < 20; i++) {
            const a = rng.between(0, Math.PI * 2);
            const spd = rng.between(32, 115);
            motes.emit(
              i % 3 === 0 ? 'glint' : 'spark',
              rng.between(-4, 4),
              -32 + rng.between(-16, 16),
              Math.cos(a) * spd,
              Math.sin(a) * spd - 16,
              rng.between(0.18, 0.38),
              i % 2 === 0 ? solar[7] : solar[5],
              1.1,
              58
            );
          }
        }
        t += dt;
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 0.52);
        const pop = 0.45 + 0.55 * smoothStep(0, 0.18, u);
        const fade = 1 - smoothStep(0.55, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;

        // Vertical Black-Sun Rift Slit behind Ignis Sol
        const cy = -32;
        const rx = 11 * (1 - u * 0.45);
        const ry = 28 * pop;
        pen.shadeBox(-rx - 4, cy - ry - 4, rx + 4, cy + ry + 4, (lx, ly, out) => {
          const nx = lx / Math.max(1, rx);
          const ny = (ly - cy) / Math.max(1, ry);
          const d = Math.hypot(nx, ny);
          if (d > 1.15) return 0;
          const n = fbm2D(lx * 0.22, ly * 0.14 - u * 5, 2);
          if (d < 0.48) {
            out.color = ramp[0];
            out.alpha = 0.94 * env;
            return out.color;
          }
          if (d < 0.78 + n * 0.16) {
            out.color = d < 0.6 ? solar[7] : solar[5];
            out.alpha = 0.92 * env;
            out.glowColor = solar[5];
            out.glowStrength = 0.45 * env;
            return out.color;
          }
          if (d < 1.05) {
            out.color = ramp[3];
            out.alpha = 0.65 * env;
            return out.color;
          }
          return 0;
        });

        drawTiltedOrbitBand(pen, 0, -1, 30 * pop, 0.24, 1.5, 0.88 * env, band4, BACK_HALF, false);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.52);
        const pop = 0.45 + 0.55 * smoothStep(0, 0.18, u);
        const fade = 1 - smoothStep(0.55, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;

        drawTiltedOrbitBand(pen, 0, -1, 30 * pop, 0.24, 1.6, 0.95 * env, band4, FRONT_HALF, true);
        if (u < 0.45) {
          const bolt = buildLightningChain(rng, 0, -64, 0, 0, 0.14, 3);
          pen.polyline(bolt, cfg.isArrival ? PURE_WHITE : solar[6], (1 - u / 0.45) * 0.92);
        }
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 6. PHOENIX SOLAR GLIDE & FLAME-STEP SLIPSTREAM (`solarGlideTrail`)
// ============================================================================
export const solarGlideTrail = {
  duration: 0.9,
  loop: true,
  defaults: {
    palette: SOLAR_CORONA_PALETTE,
    seed: 71
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, ramp[7], ramp[5], ramp[3]] });
    let acc = 0;

    return {
      step(dt) {
        acc += dt * 55;
        while (acc >= 1) {
          acc -= 1;
          motes.emit(
            rng.chance(0.4) ? 'streak' : 'spark',
            rng.between(-8, 4),
            rng.between(-12, 12),
            rng.between(-95, -35),
            rng.between(-16, 18),
            rng.between(0.16, 0.3),
            rng.chance(0.45) ? ramp[7] : ramp[5],
            1,
            15
          );
        }
        motes.step(dt);
      },
      renderBack(pen) {
        pen.radialGlow(-4, 0, 14, ramp[5], 0.28);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 7. CREEPING MOLTEN MAGMA FISSURE (`magmaFissureCrack`)
// ============================================================================
export const magmaFissureCrack = {
  duration: 0.95,
  loop: false,
  defaults: {
    palette: SOLAR_CORONA_PALETTE,
    seed: 83,
    spanX: 110
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, ramp[7], ramp[5], ramp[3]], floorY: 0 });
    const span = Math.max(-180, Math.min(180, (cfg.spanX || 110) / 3));
    const crackPts = buildLightningChain(rng, 0, 0, span, 0, 0.08, 4);
    let t = 0;
    let acc = 0;

    return {
      step(dt) {
        t += dt;
        acc += dt * 36;
        const reach = clamp01(t / 0.18);
        while (acc >= 1 && t < 0.72) {
          acc -= 1;
          const f = rng.between(0, reach);
          motes.emit(
            'spark',
            span * f,
            -1,
            rng.between(-16, 16),
            rng.between(-68, -24),
            rng.between(0.18, 0.34),
            rng.chance(0.5) ? ramp[7] : ramp[5],
            1,
            130
          );
        }
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 0.95);
        const reach = clamp01(t / 0.16);
        const fade = 1 - smoothStep(0.68, 1.0, u);
        if (fade <= 0.02) return;
        const maxIdx = Math.max(1, Math.floor((crackPts.length - 1) * reach));
        for (let i = 1; i <= maxIdx; i++) {
          const [x0, y0] = crackPts[i - 1];
          const [x1, y1] = crackPts[i];
          pen.line(x0, y0 + 1, x1, y1 + 1, ramp[2], 0.9 * fade);
          pen.line(x0, y0, x1, y1, ramp[5], 0.95 * fade);
          if (i % 2 === 0) {
            pen.line(x0, y0, x1, y1, ramp[7], 0.85 * fade);
          }
        }
      },
      renderFront(pen) {
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 8. 2.5D MOLTEN HELLFIRE SOLAR PILLAR (`hellfireSolarPillar`)
// ============================================================================
export const hellfireSolarPillar = {
  duration: 0.88,
  loop: false,
  defaults: {
    palette: SOLAR_CORONA_PALETTE,
    seed: 97,
    scaleWidth: 1.0
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const band4 = [ramp[2], ramp[4], ramp[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, ramp[7], ramp[5], ramp[3]], floorY: 0 });
    let t = 0;
    let acc = 0;

    return {
      step(dt) {
        t += dt;
        acc += dt * 64;
        const sc = cfg.scaleWidth || 1.0;
        while (acc >= 1 && t < 0.68) {
          acc -= 1;
          motes.emit(
            rng.chance(0.3) ? 'orb' : 'spark',
            rng.between(-14 * sc, 14 * sc),
            rng.between(-76, -4),
            rng.between(-28, 28),
            rng.between(-115, -38),
            rng.between(0.2, 0.38),
            rng.chance(0.45) ? ramp[7] : ramp[5],
            1.1,
            85
          );
        }
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 0.88);
        const pop = 0.38 + 0.62 * smoothStep(0, 0.16, u);
        const fade = 1 - smoothStep(0.68, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;
        const sc = cfg.scaleWidth || 1.0;

        drawTiltedOrbitBand(pen, 0, 0, 31 * sc * pop, 0.25, 1.5, 0.88 * env, band4, BACK_HALF, false);

        const colH = 98 * pop;
        const colR = 14 * sc;
        for (let i = 0; i < 26; i++) {
          const f = i / 25;
          const a = u * 13 - f * 5.6;
          if (Math.sin(a) >= 0) continue;
          const px = Math.cos(a) * (colR + 3) * (1 - f * 0.24);
          const py = -f * colH + Math.sin(a) * 3;
          pen.fillCircle(px, py, 1.5, ramp[4], 0.85 * env);
        }
      },
      renderFront(pen) {
        const u = clamp01(t / 0.88);
        const pop = 0.38 + 0.62 * smoothStep(0, 0.16, u);
        const fade = 1 - smoothStep(0.68, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;
        const sc = cfg.scaleWidth || 1.0;

        drawTiltedOrbitBand(pen, 0, 0, 31 * sc * pop, 0.25, 1.7, 0.96 * env, band4, FRONT_HALF, true);

        const colH = 98 * pop;
        const colR = 14 * sc;
        for (let s = 0; s < 2; s++) {
          for (let i = 0; i < 26; i++) {
            const f = i / 25;
            const a = s * Math.PI + u * 13 - f * 5.6;
            const sinA = Math.sin(a);
            if (sinA < 0) continue;
            const px = Math.cos(a) * (colR + 3) * (1 - f * 0.24);
            const py = -f * colH + sinA * 3;
            pen.stipple(px, py, s === 0 ? ramp[7] : ramp[5], 0.94 * env);
            if (i % 3 === 0) pen.stipple(px, py - 1, PURE_WHITE, 0.88 * env);
          }
        }
        const bolt = buildLightningChain(rng, 0, 0, 0, -colH * 0.94, 0.15 * sc, 3);
        pen.polyline(bolt, ramp[7], 0.86 * env);
        drawHeliosStar(pen, 0, -colH * 0.52, 10 * sc * env, ramp[7], ramp[5], 0.9 * env, u * 4);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 9. 2.5D BLACK-SUN ECLIPSE SUPERNOVA DOMAIN (`eclipseSupernovaDomain`)
// ============================================================================
export const eclipseSupernovaDomain = {
  duration: 1.52,
  loop: false,
  defaults: {
    palette: ECLIPSE_ABYSS_PALETTE,
    seed: 109
  },
  create(cfg) {
    const abyss = buildColorRamp(cfg.palette, 8);
    const solar = buildColorRamp(SOLAR_CORONA_PALETTE, 8);
    const band4 = [abyss[3], solar[4], solar[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, solar[7], solar[5], abyss[4]], floorY: 0 });
    let t = 0;
    let acc = 0;

    return {
      step(dt) {
        t += dt;
        acc += dt * 52;
        while (acc >= 1 && t < 1.28) {
          acc -= 1;
          const a = rng.between(0, Math.PI * 2);
          const rx = rng.between(18, 72);
          motes.emit(
            rng.chance(0.35) ? 'glint' : 'spark',
            Math.cos(a) * rx,
            Math.sin(a) * rx * 0.22 - 2,
            -Math.cos(a) * 28,
            rng.between(-75, -22),
            rng.between(0.22, 0.42),
            rng.chance(0.5) ? solar[7] : solar[5],
            1.1,
            24
          );
        }
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 1.52);
        const pop = smoothStep(0, 0.14, u);
        const fade = 1 - smoothStep(0.82, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;

        drawTiltedOrbitBand(pen, 0, 0, 74 * pop, 0.21, 1.8, 0.88 * env, band4, BACK_HALF, false);
        drawTiltedOrbitBand(pen, 0, 0, 46 * pop, 0.21, 1.3, 0.82 * env, band4, BACK_HALF, false);
      },
      renderFront(pen) {
        const u = clamp01(t / 1.52);
        const pop = smoothStep(0, 0.14, u);
        const fade = 1 - smoothStep(0.82, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;

        drawTiltedOrbitBand(pen, 0, 0, 74 * pop, 0.21, 1.9, 0.95 * env, band4, FRONT_HALF, true);
        drawTiltedOrbitBand(pen, 0, 0, 46 * pop, 0.21, 1.4, 0.88 * env, band4, FRONT_HALF, false);

        // 8 rotating Helios cardinal spikes around floor seal
        for (let k = 0; k < 8; k++) {
          const a = u * 3.2 + (k * Math.PI) / 4;
          if (Math.sin(a) < 0) continue;
          const x0 = Math.cos(a) * 44 * pop;
          const y0 = Math.sin(a) * 44 * 0.21 * pop;
          const x1 = Math.cos(a) * 76 * pop;
          const y1 = Math.sin(a) * 76 * 0.21 * pop;
          pen.line(x0, y0, x1, y1, k % 2 === 0 ? solar[7] : solar[5], 0.9 * env);
        }

        // Coronal Solar Bolts during detonation window (`0.34 <= u <= 0.78`)
        if (u >= 0.34 && u <= 0.78) {
          const boltEnv = Math.sin(((u - 0.34) / 0.44) * Math.PI);
          for (const sx of [-18, 18]) {
            const bolt = buildLightningChain(rng, sx, -128, sx * 0.6, 0, 0.14, 3);
            pen.polyline(bolt, sx < 0 ? solar[7] : solar[5], 0.9 * boltEnv);
          }
        }
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 10. SOLAR FIREBALL & METEOR IMPACT BURST (`solarMeteorImpactBurst`)
// ============================================================================
export const solarMeteorImpactBurst = {
  duration: 0.38,
  loop: false,
  defaults: {
    palette: SOLAR_CORONA_PALETTE,
    seed: 121,
    isMeteor: false
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, ramp[7], ramp[5], ramp[3]] });
    let t = 0;
    let burstDone = false;

    return {
      step(dt) {
        if (!burstDone) {
          burstDone = true;
          const cnt = cfg.isMeteor ? 24 : 16;
          for (let i = 0; i < cnt; i++) {
            const a = rng.between(0, Math.PI * 2);
            const spd = rng.between(45, cfg.isMeteor ? 165 : 128);
            motes.emit(
              i % 3 === 0 ? 'glint' : 'spark',
              0,
              0,
              Math.cos(a) * spd,
              Math.sin(a) * spd,
              rng.between(0.16, 0.34),
              i % 2 === 0 ? ramp[7] : ramp[5],
              cfg.isMeteor ? 1.3 : 1.0,
              65
            );
          }
        }
        t += dt;
        motes.step(dt);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.38);
        const fade = 1 - u;
        if (fade <= 0.02) return;
        const maxR = cfg.isMeteor ? 28 : 19;
        const r = maxR * smoothStep(0, 0.65, u);
        drawTiltedOrbitBand(
          pen,
          0,
          0,
          r,
          0.78,
          1.5,
          fade * 0.92,
          [ramp[2], ramp[4], ramp[6], PURE_WHITE],
          () => true,
          u < 0.25
        );
        drawHeliosStar(pen, 0, 0, maxR * 0.95 * fade, ramp[7], ramp[5], fade, u * 3.5);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// BAKED 30FPS `mage_vfx.png` 5-ROW CELLS (`104x104` logical -> `208x208` crisp 2x)
//   Row 0 (`y=0`):   Solar Fireball Orb (`fireball` projectile)
//   Row 1 (`y=208`): Molten Hellfire Solar Pillar (`arcane` `flamePillar`)
//   Row 2 (`y=416`): Black-Sun Eclipse Supernova Sphere (`supernovas` & blink rifts)
//   Row 3 (`y=624`): Craggy Cataclysm Solar Meteor (`isMeteor` projectile & beam head)
//   Row 4 (`y=832`): Helios Sun-Crest Seal & Blazing Solar Slash (`slashes` & cast aura)
// ============================================================================

export const solarFireballOrbCell = {
  duration: 1.0,
  loop: true,
  defaults: { palette: SOLAR_CORONA_PALETTE, seed: 201 },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, ramp[7], ramp[5], ramp[3]] });
    let acc = 0;

    return {
      step(dt) {
        acc += dt * 48;
        while (acc >= 1) {
          acc -= 1;
          motes.emit(
            'spark',
            rng.between(-4, 6),
            rng.between(-8, 8),
            rng.between(-85, -28),
            rng.between(-16, 16),
            0.26,
            rng.chance(0.5) ? ramp[7] : ramp[5],
            1,
            0
          );
        }
        motes.step(dt);
      },
      renderFront(pen, localT) {
        const ph = localT * Math.PI * 2;
        const headX = 11;

        // Supersonic comet wake streaming left (`-X`)
        pen.shadeBox(-42, -22, headX + 20, 22, (lx, ly, out) => {
          if (lx < headX) {
            const tailU = clamp01((headX - lx) / 48);
            const halfH = (1 - tailU) * 13 + 2;
            const wave = Math.sin(tailU * 9 - ph * 3) * 2.2 * tailU;
            const dy = Math.abs(ly - wave);
            if (dy < halfH) {
              const n = fbm2D(lx * 0.16 + ph * 1.8, ly * 0.22, 2);
              const heat = (1 - dy / halfH) * (1 - tailU * 0.72) + n * 0.24;
              if (heat > 0.22) {
                const idx = Math.min(7, Math.max(1, Math.floor(heat * 7.8)));
                out.color = ramp[idx];
                out.alpha = clamp01(heat * 1.25);
                out.glowColor = ramp[5];
                out.glowStrength = 0.28 * (1 - tailU);
                return out.color;
              }
            }
          }
          const d = Math.hypot(lx - headX, ly);
          if (d <= 17) {
            const ang = Math.atan2(ly, lx - headX);
            const prom = Math.sin(ang * 6 + ph * 2) * 2.2 + fbm2D(lx * 0.2, ly * 0.2 - ph, 2) * 2.5;
            const effR = 13.5 + prom;
            if (d <= effR) {
              if (d < 5.5) {
                out.color = PURE_WHITE;
                out.alpha = 1;
              } else if (d < 9.5) {
                out.color = ramp[7];
                out.alpha = 0.98;
              } else if (d < 12.5) {
                out.color = ramp[5];
                out.alpha = 0.94;
              } else {
                out.color = ramp[2];
                out.alpha = 0.9;
              }
              out.glowColor = ramp[6];
              out.glowStrength = 0.42 * (1 - d / 17);
              return out.color;
            }
          }
          return 0;
        });

        drawHeliosStar(pen, headX + 1, 0, 15, ramp[7], ramp[5], 0.9, ph);
        motes.render(pen);
      }
    };
  }
};

export const hellfireMagmaPillarCell = {
  duration: 1.0,
  loop: false,
  defaults: { palette: SOLAR_CORONA_PALETTE, seed: 211 },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const band4 = [ramp[2], ramp[4], ramp[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, ramp[7], ramp[5], ramp[3]], floorY: 42 });
    let acc = 0;

    return {
      step(dt) {
        acc += dt * 52;
        while (acc >= 1) {
          acc -= 1;
          motes.emit(
            'spark',
            rng.between(-16, 16),
            rng.between(-34, 38),
            rng.between(-20, 20),
            rng.between(-65, -20),
            0.28,
            rng.chance(0.5) ? ramp[7] : ramp[5],
            1,
            40
          );
        }
        motes.step(dt);
      },
      renderBack(pen, localT) {
        const u = clamp01(localT);
        const pop = 0.42 + 0.58 * smoothStep(0, 0.16, u);
        const fade = 1 - smoothStep(0.76, 1.0, u);
        const env = (0.86 + 0.14 * smoothStep(0, 0.12, u)) * fade;
        if (env <= 0.02) return;
        const baseY = 41;
        drawTiltedOrbitBand(pen, 0, baseY, 32 * pop, 0.22, 1.6, 0.9 * env, band4, BACK_HALF, false);
      },
      renderFront(pen, localT) {
        const u = clamp01(localT);
        const pop = 0.42 + 0.58 * smoothStep(0, 0.16, u);
        const fade = 1 - smoothStep(0.76, 1.0, u);
        const env = (0.86 + 0.14 * smoothStep(0, 0.12, u)) * fade;
        if (env <= 0.02) return;

        const baseY = 41;
        const topY = baseY - 82 * pop;
        const halfW = 19 * (1 - 0.18 * smoothStep(0.65, 1.0, u));

        pen.shadeBox(-halfW - 8, topY - 6, halfW + 8, baseY + 4, (lx, ly, out) => {
          if (ly > baseY + 2 || ly < topY - 4) return 0;
          const hFrac = clamp01((baseY - ly) / Math.max(1, baseY - topY));
          const taper = 1 - hFrac * 0.28;
          const swirl = Math.sin(hFrac * 10 - u * 16) * 2.6;
          const n = fbm2D(lx * 0.15, ly * 0.12 + u * 8, 2);
          const effW = halfW * taper + n * 3.5;
          const d = Math.abs(lx - swirl * 0.45);
          if (d > effW) return 0;

          const coreRatio = 1 - d / Math.max(1, effW);
          if (coreRatio > 0.72) {
            out.color = PURE_WHITE;
            out.alpha = env;
          } else if (coreRatio > 0.48) {
            out.color = ramp[7];
            out.alpha = 0.96 * env;
          } else if (coreRatio > 0.24) {
            out.color = ramp[5];
            out.alpha = 0.92 * env;
          } else {
            out.color = ramp[2];
            out.alpha = 0.88 * env;
          }
          out.glowColor = ramp[5];
          out.glowStrength = 0.34 * coreRatio * env;
          return out.color;
        });

        drawTiltedOrbitBand(pen, 0, baseY, 32 * pop, 0.22, 1.8, 0.96 * env, band4, FRONT_HALF, true);
        drawHeliosStar(pen, 0, topY + 6, 12 * env, ramp[7], ramp[5], 0.92 * env, u * 5);
        motes.render(pen);
      }
    };
  }
};

export const blackSunEclipseSphereCell = {
  duration: 1.0,
  loop: true,
  defaults: { palette: ECLIPSE_ABYSS_PALETTE, seed: 223 },
  create(cfg) {
    const abyss = buildColorRamp(cfg.palette, 8);
    const solar = buildColorRamp(SOLAR_CORONA_PALETTE, 8);
    const band4 = [abyss[3], solar[4], solar[6], PURE_WHITE];

    return {
      step() {},
      renderBack(pen, localT) {
        const ph = localT * Math.PI * 2;
        drawTiltedOrbitBand(pen, 0, 0, 39, 0.32, 1.8, 0.9, band4, BACK_HALF, false);

        // Blazing Solar Corona + Obsidian Black-Sun Event Horizon Core
        pen.shadeBox(-40, -40, 40, 40, (lx, ly, out) => {
          const r = Math.hypot(lx, ly);
          if (r > 38) return 0;
          const ang = Math.atan2(ly, lx);
          const prom =
            Math.sin(ang * 8 + ph * 2) * 2.8 +
            Math.cos(ang * 5 - ph * 3) * 2.2 +
            fbm2D(lx * 0.14 + Math.cos(ph), ly * 0.14 + Math.sin(ph), 2) * 3.5;

          // Obsidian Void Event Horizon (`r < 17.5`)
          if (r < 17.2) {
            out.color = r < 14 ? abyss[0] : abyss[1];
            out.alpha = 0.98;
            return out.color;
          }
          // Diamond-Ring Photosphere Rim (`17.2 <= r <= 21.5`)
          if (r < 20.8) {
            out.color = r < 18.8 ? PURE_WHITE : solar[7];
            out.alpha = 1.0;
            out.glowColor = solar[6];
            out.glowStrength = 0.55;
            return out.color;
          }
          // Roaring Solar Prominences (`20.8 <= r <= 31 + prom`)
          const outerR = 29 + prom;
          if (r <= outerR) {
            const u = (r - 20.8) / Math.max(1, outerR - 20.8);
            out.color = u < 0.38 ? solar[6] : u < 0.72 ? solar[5] : abyss[3];
            out.alpha = clamp01(1.05 - u * 0.75);
            out.glowColor = solar[5];
            out.glowStrength = 0.34 * (1 - u);
            return out.color;
          }
          return 0;
        });
      },
      renderFront(pen, localT) {
        const ph = localT * Math.PI * 2;
        drawTiltedOrbitBand(pen, 0, 0, 39, 0.32, 1.9, 0.96, band4, FRONT_HALF, true);
        // Diamond-ring jewel flare rotating along the corona rim
        const dx = Math.cos(ph) * 18.5;
        const dy = Math.sin(ph) * 18.5;
        drawHeliosStar(pen, dx, dy, 11, PURE_WHITE, solar[6], 0.96, ph * 2);
      }
    };
  }
};

export const cataclysmSolarMeteorCell = {
  duration: 1.0,
  loop: true,
  defaults: { palette: SOLAR_CORONA_PALETTE, seed: 233 },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, ramp[7], ramp[5], ramp[3]] });
    let acc = 0;

    return {
      step(dt) {
        acc += dt * 44;
        while (acc >= 1) {
          acc -= 1;
          motes.emit(
            'spark',
            rng.between(-10, 10),
            rng.between(-10, 10),
            rng.between(-78, -24),
            rng.between(-22, 22),
            0.24,
            rng.chance(0.5) ? ramp[7] : ramp[5],
            1.1,
            0
          );
        }
        motes.step(dt);
      },
      renderFront(pen, localT) {
        const ph = localT * Math.PI * 2;
        const headX = 10;

        // Craggy Obsidian Meteor + Molten Lava Veins + Bow Shockwave (`+X` heading)
        pen.shadeBox(-42, -28, 40, 28, (lx, ly, out) => {
          if (lx < headX) {
            const tailU = clamp01((headX - lx) / 48);
            const halfH = (1 - tailU) * 17 + 2;
            if (Math.abs(ly) < halfH) {
              const n = fbm2D(lx * 0.15 + ph * 2, ly * 0.18, 2);
              const heat = (1 - Math.abs(ly) / halfH) * (1 - tailU * 0.72) + n * 0.25;
              if (heat > 0.24) {
                out.color = ramp[Math.min(7, Math.max(2, Math.floor(heat * 7.5)))];
                out.alpha = clamp01(heat * 1.2);
                out.glowColor = ramp[5];
                out.glowStrength = 0.28 * (1 - tailU);
                return out.color;
              }
            }
          }

          const d = Math.hypot(lx - headX, ly);
          const crag = fbm2D((lx - headX) * 0.24 + Math.cos(ph), ly * 0.24 + Math.sin(ph), 2) * 4.2;
          const rockR = 15.5 + crag;
          if (d <= rockR) {
            const vein = Math.abs(fbm2D(lx * 0.32 - ph * 0.5, ly * 0.32, 2));
            if (vein < 0.14 || d < 4.8) {
              out.color = d < 3.5 ? PURE_WHITE : ramp[7];
              out.alpha = 1;
              out.glowColor = ramp[6];
              out.glowStrength = 0.48;
            } else if (vein < 0.26) {
              out.color = ramp[5];
              out.alpha = 0.98;
            } else {
              out.color = d > rockR - 2.4 ? ramp[3] : ramp[0];
              out.alpha = 0.98;
            }
            return out.color;
          }
          return 0;
        });

        // White-gold atmospheric entry bow-shock arc ahead of meteor (`+X`)
        for (let i = -12; i <= 12; i++) {
          const f = i / 12;
          const ang = f * 1.15;
          const env = Math.cos(f * Math.PI * 0.5);
          const bx = headX + Math.cos(ang) * 21;
          const by = Math.sin(ang) * 21;
          pen.fillCircle(bx, by, 1.4 * env + 0.5, Math.abs(i) < 5 ? PURE_WHITE : ramp[6], 0.92);
        }
        motes.render(pen);
      }
    };
  }
};

export const heliosSunCrestSlashCell = {
  duration: 1.0,
  loop: false,
  defaults: { palette: SOLAR_CORONA_PALETTE, seed: 241 },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const band4 = [ramp[2], ramp[4], ramp[6], PURE_WHITE];

    return {
      step() {},
      renderFront(pen, localT) {
        const u = clamp01(localT);
        const pop = 0.42 + 0.58 * smoothStep(0, 0.2, u);
        const fade = 1 - smoothStep(0.72, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;

        // 8-Spoke Helios Astrolabe Crest + Sweeping Blazing Crescent Arc (`+X`)
        drawTiltedOrbitBand(pen, -4, 0, 28 * pop, 0.92, 1.4, 0.85 * env, band4, () => true, false);
        drawHeliosStar(pen, -4, 0, 24 * pop, ramp[7], ramp[5], 0.88 * env, u * 3.2);

        const arcR = 33 * pop;
        for (let i = -22; i <= 22; i++) {
          const f = i / 22;
          const ang = f * 1.32;
          const bladeEnv = Math.cos(f * Math.PI * 0.5);
          const px = -2 + Math.cos(ang) * arcR;
          const py = Math.sin(ang) * arcR;
          pen.fillCircle(px, py, 3.2 * bladeEnv + 0.8, ramp[3], 0.88 * env);
          pen.fillCircle(px + 1, py, 2.0 * bladeEnv + 0.5, Math.abs(i) < 9 ? ramp[7] : ramp[5], 0.96 * env);
          if (Math.abs(i) < 7) {
            pen.stipple(px + 2, py, PURE_WHITE, 0.95 * env);
          }
        }
      }
    };
  }
};

export const SOLAR_EFFECT_REGISTRY = {
  heliosOrbitingSuns,
  heliosPalmFocus,
  solarFireballMachCone,
  solarFlameWard,
  arcaneBlinkRift,
  solarGlideTrail,
  magmaFissureCrack,
  hellfireSolarPillar,
  eclipseSupernovaDomain,
  solarMeteorImpactBurst,
  solarFireballOrbCell,
  hellfireMagmaPillarCell,
  blackSunEclipseSphereCell,
  cataclysmSolarMeteorCell,
  heliosSunCrestSlashCell
};
