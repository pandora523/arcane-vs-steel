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
} from '../ArcaneShaderFX.js?v=30fps55';

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
/**
 * Shared HD-2D renderer: Soaring Diagonal Solar Phoenix Firebird in Flight.
 * Zero upright cone, zero bottom ring — pure diagonal winged firebird silhouette with flapping wings,
 * sculpted phoenix head + hooked golden beak + 3-plume crown crest facing upper-right (+x, -y),
 * and 3 long sinusoidal tail-plume ribbons trailing toward lower-left (-x, +y).
 */
function drawSoaringSolarPhoenix(pen, cx, cy, scale, progress, env, ramp) {
  if (env <= 0.02) return;
  const DARK_OUTLINE = '#220500';
  // Diagonal flight axis facing upper-right (+x, -y)
  const fx = 0.78;
  const fy = -0.625;
  // Perpendicular wing axis (upper-left is +px,+py; lower-right is -px,-py)
  const px = -0.625;
  const py = -0.78;

  // 2 full wingbeats across the 30-frame cycle
  const flapPhase = progress * Math.PI * 4;
  const flap = Math.sin(flapPhase);
  const bob = -flap * 2.2 * scale;

  const bodyX = cx + 2 * scale + fx * bob * 0.3;
  const bodyY = cy - 2 * scale + bob;

  pen.radialGlow(bodyX, bodyY, 26 * scale * env, ramp[5], 0.34 * env);

  // -------------------------------------------------------------------------
  // 1. 3 Long Flowing Sinusoidal Phoenix Tail-Plume Ribbons (lower-left -x, +y)
  // -------------------------------------------------------------------------
  const tailRootX = bodyX - fx * 8 * scale;
  const tailRootY = bodyY - fy * 8 * scale;
  for (let tIdx = -1; tIdx <= 1; tIdx++) {
    const ribbonLen = (tIdx === 0 ? 25 : 21) * scale;
    const spreadAng = tIdx * 0.26;
    const ca = Math.cos(spreadAng);
    const sa = Math.sin(spreadAng);
    const txDir = (-fx * ca - -fy * sa);
    const tyDir = (-fx * sa + -fy * ca);
    const nxDir = -tyDir;
    const nyDir = txDir;

    let prevX = tailRootX + px * tIdx * 2.5 * scale;
    let prevY = tailRootY + py * tIdx * 2.5 * scale;
    const steps = 14;
    for (let s = 1; s <= steps; s++) {
      const u = s / steps;
      const dist = u * ribbonLen;
      const wave = Math.sin(u * 5.8 - progress * Math.PI * 6 + tIdx * 1.6) * (1.5 + u * 4.2) * scale;
      const curX = tailRootX + px * tIdx * 2.5 * scale + txDir * dist + nxDir * wave;
      const curY = tailRootY + py * tIdx * 2.5 * scale + tyDir * dist + nyDir * wave;
      const thick = (1 - u * 0.65) * (tIdx === 0 ? 2.4 : 1.8) * scale;

      pen.fillCircle(curX, curY, thick + 0.9, DARK_OUTLINE, 0.92 * env);
      pen.line(prevX, prevY, curX, curY, u < 0.35 ? ramp[6] : u < 0.72 ? ramp[4] : ramp[2], 0.96 * env);
      pen.fillCircle(curX, curY, thick, u < 0.3 ? ramp[6] : u < 0.68 ? ramp[4] : ramp[2], 0.95 * env);
      if (tIdx === 0 && u < 0.55) {
        pen.stipple(curX, curY, PURE_WHITE, 0.95 * env);
      }
      prevX = curX;
      prevY = curY;
    }
    // Glowing solar peacock-ocellus near tail tip
    pen.fillCircle(prevX, prevY, 2.2 * scale, ramp[2], 0.94 * env);
    pen.fillCircle(prevX, prevY, 1.3 * scale, ramp[6], 0.98 * env);
    pen.stipple(prevX, prevY, PURE_WHITE, 0.95 * env);
  }

  // -------------------------------------------------------------------------
  // 2. Huge Articulated Left & Right Flame-Feathered Wings (flapping cycle)
  // -------------------------------------------------------------------------
  for (const side of [-1, 1]) {
    // side = 1: upper-left wing (+px, +py); side = -1: lower-right wing (-px, -py)
    const wxDir = px * side;
    const wyDir = py * side;
    const shX = bodyX + wxDir * 3.5 * scale + fx * 1.5 * scale;
    const shY = bodyY + wyDir * 3.5 * scale + fy * 1.5 * scale;

    // Wing flap articulates both the forward sweep and vertical lift of the wing-arm & pinions
    const flapSweep = flap * 0.48;
    const wingSpan = (side === 1 ? 29 : 27) * scale;

    // Wing wrist/elbow joint along leading edge
    const elbowX = shX + (wxDir * 0.52 + fx * (0.28 + flapSweep * 0.35)) * wingSpan;
    const elbowY = shY + (wyDir * 0.52 + fy * (0.28 + flapSweep * 0.35) - flap * 0.22) * wingSpan;
    const tipLeadX = shX + (wxDir * 0.92 + fx * (0.14 + flapSweep * 0.55)) * wingSpan;
    const tipLeadY = shY + (wyDir * 0.92 + fy * (0.14 + flapSweep * 0.55) - flap * 0.38) * wingSpan;

    // Draw 9 layered primary & secondary feather pinions from inner covert to outer primary
    const numFeathers = 9;
    for (let f = numFeathers - 1; f >= 0; f--) {
      const fu = f / (numFeathers - 1); // 0 = outer leading primary, 1 = inner covert
      // Root point along the articulated two-bone wing arm
      const rootX =
        fu < 0.5
          ? elbowX + (tipLeadX - elbowX) * (1 - fu * 2) * 0.65
          : shX + (elbowX - shX) * (1 - (fu - 0.5) * 2);
      const rootY =
        fu < 0.5
          ? elbowY + (tipLeadY - elbowY) * (1 - fu * 2) * 0.65
          : shY + (elbowY - shY) * (1 - (fu - 0.5) * 2);

      // Feather tip fans outward & trails backward toward (-fx, -fy)
      const fLen = (1 - fu * 0.48) * 16.5 * scale;
      const trailMix = 0.22 + fu * 0.68 - flapSweep * 0.25;
      const outMix = 1 - fu * 0.35;
      const dirX = wxDir * outMix - fx * trailMix;
      const dirY = wyDir * outMix - fy * trailMix - flap * 0.28 * (1 - fu * 0.5);
      const dLen = Math.max(0.001, Math.hypot(dirX, dirY));
      const ux = dirX / dLen;
      const uy = dirY / dLen;

      const fTipX = rootX + ux * fLen;
      const fTipY = rootY + uy * fLen;
      const fMidX = (rootX + fTipX) * 0.5 + wxDir * 1.5 * scale;
      const fMidY = (rootY + fTipY) * 0.5 + wyDir * 1.5 * scale;

      // 1) Dark #220500 selout outline along feather pinion
      for (let s = 0; s <= 7; s++) {
        const su = s / 7;
        const qx = (1 - su) * (1 - su) * rootX + 2 * (1 - su) * su * fMidX + su * su * fTipX;
        const qy = (1 - su) * (1 - su) * rootY + 2 * (1 - su) * su * fMidY + su * su * fTipY;
        const r = (1 - su * 0.55) * 2.4 * scale + 0.6;
        pen.fillCircle(qx, qy, r + 0.85, DARK_OUTLINE, 0.94 * env);
      }

      // 2) Layered cel-shaded feather ramp: PURE_WHITE leading edge -> ramp[6] gold -> ramp[4] orange -> ramp[2] crimson
      for (let s = 0; s <= 7; s++) {
        const su = s / 7;
        const qx = (1 - su) * (1 - su) * rootX + 2 * (1 - su) * su * fMidX + su * su * fTipX;
        const qy = (1 - su) * (1 - su) * rootY + 2 * (1 - su) * su * fMidY + su * su * fTipY;
        const r = (1 - su * 0.55) * 2.3 * scale + 0.5;
        const col =
          f === 0 && su < 0.65
            ? PURE_WHITE
            : su < 0.34
              ? ramp[6]
              : su < 0.68
                ? ramp[4]
                : ramp[2];
        pen.fillCircle(qx, qy, r, col, 0.98 * env);
      }
      pen.line(rootX, rootY, fMidX, fMidY, f <= 1 ? PURE_WHITE : ramp[6], 0.98 * env);
      pen.line(fMidX, fMidY, fTipX, fTipY, f === 0 ? ramp[6] : ramp[4], 0.95 * env);
    }

    // Leading-edge white-hot wing bone (shoulder -> elbow -> primary tip)
    pen.line(shX, shY, elbowX, elbowY, PURE_WHITE, 1.0 * env);
    pen.line(elbowX, elbowY, tipLeadX, tipLeadY, PURE_WHITE, 1.0 * env);
    pen.fillCircle(elbowX, elbowY, 2.0 * scale, PURE_WHITE, 1.0 * env);
  }

  // -------------------------------------------------------------------------
  // 3. Sculpted Diagonal Phoenix Torso / Solar Heart (aligned along fx, fy)
  // -------------------------------------------------------------------------
  const torsoR = 11 * scale;
  pen.shadeBox(bodyX - torsoR, bodyY - torsoR, bodyX + torsoR, bodyY + torsoR, (lx, ly, out) => {
    const dx = lx - bodyX;
    const dy = ly - bodyY;
    const along = dx * fx + dy * fy;
    const across = dx * px + dy * py;
    const d = Math.hypot(along / (8.5 * scale), across / (5.2 * scale));
    if (d > 1.0) return 0;
    if (d > 0.82) {
      out.color = DARK_OUTLINE;
      out.alpha = 0.96 * env;
      return out.color;
    }
    out.color = d < 0.36 ? PURE_WHITE : d < 0.62 ? ramp[6] : d < 0.74 ? ramp[4] : ramp[2];
    out.alpha = 0.98 * env;
    out.glowColor = ramp[5];
    out.glowStrength = 0.38 * (1 - d) * env;
    return out.color;
  });

  // -------------------------------------------------------------------------
  // 4. Sculpted Phoenix Head, 3-Plume Crown Crest & Hooked Golden Beak (+x, -y)
  // -------------------------------------------------------------------------
  const headX = bodyX + fx * 10.5 * scale;
  const headY = bodyY + fy * 10.5 * scale;

  // 3-Plume Royal Crown Crest sweeping back from head
  for (let c = 0; c < 3; c++) {
    const cu = c / 2;
    const cLen = (9.5 - c * 1.8) * scale;
    const cAng = Math.atan2(-fy, -fx) - 0.55 - cu * 0.28 + flap * 0.12;
    const cx1 = headX + Math.cos(cAng) * cLen;
    const cy1 = headY + Math.sin(cAng) * cLen;
    pen.line(headX, headY, cx1, cy1, DARK_OUTLINE, 0.92 * env);
    pen.line(headX, headY, cx1, cy1, c === 0 ? PURE_WHITE : c === 1 ? ramp[6] : ramp[4], 0.98 * env);
    pen.fillCircle(cx1, cy1, 1.2 * scale, c === 0 ? ramp[6] : ramp[4], 0.95 * env);
  }

  // Head cranium with dark outline & golden-white plumage
  pen.fillCircle(headX, headY, 4.6 * scale, DARK_OUTLINE, 0.96 * env);
  pen.fillCircle(headX, headY, 3.6 * scale, ramp[4], 0.98 * env);
  pen.fillCircle(headX + fx * 0.6, headY + fy * 0.6, 2.5 * scale, ramp[6], 0.98 * env);

  // Hooked Golden Raptor Beak facing upper-right (+x, -y) with sharp downward hook
  const beakTipX = headX + fx * 6.8 * scale - px * 1.2 * scale;
  const beakTipY = headY + fy * 6.8 * scale - py * 1.2 * scale;
  const hookX = beakTipX - px * 2.4 * scale - fx * 1.2 * scale;
  const hookY = beakTipY - py * 2.4 * scale - fy * 1.2 * scale;
  pen.line(headX + fx * 2 * scale, headY + fy * 2 * scale, beakTipX, beakTipY, DARK_OUTLINE, 0.96 * env);
  pen.line(headX + fx * 2 * scale, headY + fy * 2 * scale, beakTipX, beakTipY, PURE_WHITE, 1.0 * env);
  pen.line(headX + fx * 1.5 * scale - px * 1.2 * scale, headY + fy * 1.5 * scale - py * 1.2 * scale, beakTipX, beakTipY, ramp[6], 0.98 * env);
  pen.line(beakTipX, beakTipY, hookX, hookY, ramp[6], 0.98 * env);
  pen.stipple(beakTipX, beakTipY, PURE_WHITE, 1.0 * env);

  // Blazing Phoenix Eye
  pen.stipple(headX + fx * 1.2 * scale + px * 0.8 * scale, headY + fy * 1.2 * scale + py * 0.8 * scale, PURE_WHITE, 1.0 * env);
}

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
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, ramp[7], ramp[5], ramp[3]], floorY: 20 });
    let t = 0;
    let acc = 0;

    return {
      step(dt) {
        t += dt;
        acc += dt * 48;
        const sc = cfg.scaleWidth || 1.0;
        while (acc >= 1 && t < 0.72) {
          acc -= 1;
          motes.emit(
            rng.chance(0.35) ? 'glint' : 'spark',
            rng.between(-18 * sc, 16 * sc),
            rng.between(-42, -8),
            rng.between(-32, -8),
            rng.between(8, 34),
            rng.between(0.18, 0.34),
            rng.chance(0.45) ? ramp[7] : ramp[5],
            1.0,
            12
          );
        }
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 0.88);
        const pop = 0.58 + 0.42 * smoothStep(0, 0.16, u);
        const fade = 1 - smoothStep(0.72, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;
        const sc = (cfg.scaleWidth || 1.0) * pop;
        const flightShift = (u - 0.5) * 14;
        drawSoaringSolarPhoenix(pen, flightShift * 0.75, -28 - flightShift * 0.6, sc, u, env, ramp);
      },
      renderFront(pen) {
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
//   Row 1 (`y=208`): Soaring Diagonal Solar Phoenix Firebird in Flight (`hellfireMagmaPillarCell`)
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
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, ramp[7], ramp[5], ramp[3]], floorY: 36 });
    let acc = 0;

    return {
      step(dt) {
        acc += dt * 36;
        while (acc >= 1) {
          acc -= 1;
          motes.emit(
            'spark',
            rng.between(-12, 12),
            rng.between(-10, 10),
            rng.between(-28, -8),
            rng.between(8, 26),
            0.22,
            rng.chance(0.5) ? ramp[7] : ramp[5],
            1,
            10
          );
        }
        motes.step(dt);
      },
      renderBack() {},
      renderFront(pen, localT) {
        const u = clamp01(localT);
        const pop = 0.72 + 0.28 * smoothStep(0, 0.14, u);
        const fade = 1 - smoothStep(0.82, 1.0, u);
        const env = (0.9 + 0.1 * smoothStep(0, 0.12, u)) * fade;
        if (env <= 0.02) return;

        drawSoaringSolarPhoenix(pen, 0, 0, pop * 0.96, u, env, ramp);
        motes.render(pen);
      }
    };
  }
};

export const solarPillarEruptionCell = hellfireMagmaPillarCell;

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
