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
} from '../ArcaneShaderFX.js?v=30fps59';

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
 * Shared HD-2D renderer: Colossal Multi-Layered Swirling Solar Hellfire & Magma Pillar.
 * - Anchored at `baseY` (`baseY = 36` in 104x104 cell coordinates, `y = 88`), with a curved
 *   2.5D elliptical volcanic caldera base (`botCurve`) and 2.5D `drawTiltedOrbitBand` magma crater ring.
 * - Towering swirling FBM solar hellfire column sculpted into 5 Jagged Roaring Flame-Tongue Peaks
 *   (`topCrown`) so the top looks like roaring pixel-art flames leaping skyward with zero flat box cut.
 * - Double-Helix Spiraling Solar Prominence Ribbons (`helix1`, `helix2` in `#ffffff` and `#fef08a`)
 *   twisting up the fire column, plus rising molten magma chunks with 1px `#220500` obsidian-ash selout.
 */
function drawSwirlingSolarHellfirePillar(pen, baseX, baseY, pop, u, env, ramp, seed = 97, scaleWidth = 1.0) {
  if (env <= 0.02) return;
  const DARK_OUTLINE = '#220500';
  const BRIGHT_GOLD = '#fef08a';
  const sc = scaleWidth || 1.0;

  // Ambient volcanic core glow along the column
  pen.radialGlow(baseX, baseY - 28 * pop, 34 * pop * sc, ramp[5], 0.36 * env);
  pen.radialGlow(baseX, baseY - 2 * pop, 28 * pop * sc, ramp[4], 0.28 * env);

  // -------------------------------------------------------------------------
  // 1. Back-Half of 2.5D Magma Crater Ring & Volcanic Caldera Base (`cy: baseY`)
  // -------------------------------------------------------------------------
  const calderaRx = 26 * pop * sc;
  const calderaRy = 7.5 * pop;
  const calderaAspect = calderaRy / Math.max(1, calderaRx);

  // Scorched obsidian-ash & molten caldera bed
  pen.shadeBox(
    baseX - calderaRx - 3,
    baseY - calderaRy - 3,
    baseX + calderaRx + 3,
    baseY + calderaRy + 5,
    (lx, ly, out) => {
      const dx = (lx - baseX) / Math.max(1, calderaRx + 1.5);
      const dy = (ly - baseY) / Math.max(1, calderaRy + 1.5);
      const d = Math.hypot(dx, dy);
      if (d > 1.0) return 0;
      if (d > 0.84) {
        out.color = DARK_OUTLINE;
        out.alpha = 0.94 * env;
        return out.color;
      }
      const lavaNoise = fbm2D(lx * 0.18 + u * 4, ly * 0.25 - u * 3, seed + 5, 2);
      out.color = d < 0.42 ? PURE_WHITE : d < 0.64 || lavaNoise > 0.62 ? BRIGHT_GOLD : d < 0.76 ? ramp[5] : ramp[2];
      out.alpha = 0.96 * env;
      return out.color;
    }
  );

  // -------------------------------------------------------------------------
  // 2. Towering Swirling FBM Solar Hellfire Column with 5 Jagged Flame-Tongue Peaks
  // -------------------------------------------------------------------------
  const topY = Math.max(-44, baseY - 76 * pop);
  // Keep peak tips below y = -43 in 104x104 so all 5 jagged flame peaks remain razor-sharp with 0 border clips
  const crownBaseY = topY + 10.5;
  const colHalfBound = Math.ceil(25 * pop * sc) + 5;

  pen.shadeBox(
    baseX - colHalfBound,
    Math.max(-45, topY - 2),
    baseX + colHalfBound,
    Math.min(45, baseY + 6),
    (px, py, out) => {
      const lx = px - baseX;
      const ly = py;
      const colHeight = Math.max(1, baseY - crownBaseY);
      const hFrac = clamp01((baseY - ly) / colHeight);

      // Sinusoidal helical spine sway & FBM flame-lick width modulation
      const spineSway =
        Math.sin(hFrac * 7.5 - u * Math.PI * 6) * 2.2 * pop +
        Math.cos(hFrac * 13.0 + u * Math.PI * 4) * 1.2 * pop;
      const fbmEdge = fbm2D(lx * 0.14 + u * 3.2, ly * 0.11 + u * 8.5, seed + 13, 3);

      // Flared volcanic base -> muscular mid-column -> roaring flared upper crown
      const baseFlare = Math.pow(1 - hFrac, 1.8) * 5.2;
      const crownFlare = Math.sin(hFrac * Math.PI * 0.92) * 3.4 + Math.pow(hFrac, 2.2) * 2.4;
      const effW = Math.max(
        4,
        (14.5 + baseFlare + crownFlare + (fbmEdge - 0.5) * 5.2) * pop * sc
      );

      const d = Math.abs(lx - spineSway);
      if (d > effW) return 0;

      // Curved 2.5D elliptical volcanic caldera base (never a flat horizontal bottom cut)
      const botCurve =
        baseY + Math.sqrt(Math.max(0, 1 - Math.min(1, (d / effW) ** 2))) * 4.5;
      if (ly > botCurve) return 0;

      // 5 Jagged Roaring Flame-Tongue Peaks at the crown (never a flat horizontal top cut)
      const topCrown =
        crownBaseY +
        Math.sin(lx * 0.42 + u * 18) * 6.5 +
        Math.cos(lx * 0.24 - u * 14) * 5.0 +
        ((d / effW) ** 2) * 10.0;
      if (ly < topCrown) return 0;

      // 1px #220500 obsidian-ash selective outline around flame peaks, sides, and caldera rim
      const distSide = effW - d;
      const distTop = ly - topCrown;
      const distBot = botCurve - ly;
      if (distSide < 1.35 || distTop < 1.55 || distBot < 1.15) {
        out.color = DARK_OUTLINE;
        out.alpha = 0.96 * env;
        return out.color;
      }

      // Multi-layered upward-scrolling FBM solar hellfire turbulence inside column
      const swirlX = lx * 0.14 + Math.sin(hFrac * 8.0 - u * Math.PI * 6) * 1.8;
      const swirlY = ly * 0.11 + u * 10.5;
      const fbmCore = fbm2D(swirlX, swirlY, seed + 29, 3);
      const ridge = Math.sin(lx * 0.36 + fbmCore * 4.2 - u * Math.PI * 4) * 0.12;
      const coreRatio = d / effW;
      const heat =
        (1 - Math.pow(coreRatio, 1.35)) * 0.66 +
        fbmCore * 0.42 +
        ridge +
        (1 - hFrac) * 0.14;

      if (heat > 0.86 || (coreRatio < 0.24 && distTop > 5.0)) {
        out.color = PURE_WHITE;
      } else if (heat > 0.70) {
        out.color = BRIGHT_GOLD;
      } else if (heat > 0.54) {
        out.color = ramp[5];
      } else if (heat > 0.38) {
        out.color = ramp[4];
      } else if (heat > 0.24) {
        out.color = ramp[2];
      } else {
        out.color = ramp[1];
      }
      out.alpha = 0.98 * env;
      out.glowColor = heat > 0.68 ? BRIGHT_GOLD : ramp[5];
      out.glowStrength = (0.24 + 0.28 * Math.min(1, heat)) * env;
      return out.color;
    }
  );

  // -------------------------------------------------------------------------
  // 3. Double-Helix Spiraling Solar Prominence Ribbons (`helix1`, `helix2`)
  // -------------------------------------------------------------------------
  const helixTopY = Math.max(-38, crownBaseY + 2);
  const helixSpan = Math.max(12, baseY - helixTopY);
  const helixSteps = 26;
  for (let hIdx = 0; hIdx < 2; hIdx++) {
    const phaseOffset = hIdx * Math.PI; // helix1 = 0, helix2 = PI
    let prevHx = 0;
    let prevHy = 0;
    for (let s = 0; s <= helixSteps; s++) {
      const su = s / helixSteps;
      const ly = baseY - 2 - su * helixSpan;
      const angle = su * Math.PI * 4.2 - u * Math.PI * 6 + phaseOffset;
      const sinA = Math.sin(angle);
      const cosA = Math.cos(angle);
      const radiusX = (15.5 * (1 - su * 0.18) + Math.sin(su * Math.PI) * 3.2) * pop * sc;
      const hx = baseX + sinA * radiusX;
      const hy = Math.max(-43, Math.min(43, ly + cosA * 3.0 * pop));

      // Front-facing pass of the double-helix ribbons (cosA > -0.35) gets bold cel-shaded prominence
      if (cosA > -0.35) {
        const thick = (1.75 - su * 0.55) * pop;
        const frontBoost = 0.75 + 0.25 * Math.max(0, cosA);
        pen.fillCircle(hx, hy, thick + 0.85, DARK_OUTLINE, 0.92 * env * frontBoost);
        pen.fillCircle(hx, hy, thick + 0.2, ramp[4], 0.95 * env * frontBoost);
        pen.fillCircle(
          hx,
          hy,
          thick * 0.72,
          hIdx === 0 ? PURE_WHITE : BRIGHT_GOLD,
          0.98 * env * frontBoost
        );
        if (s > 0) {
          pen.line(
            prevHx,
            prevHy,
            hx,
            hy,
            hIdx === 0 ? PURE_WHITE : BRIGHT_GOLD,
            0.96 * env * frontBoost
          );
        }
      }
      prevHx = hx;
      prevHy = hy;
    }
  }

  // -------------------------------------------------------------------------
  // 4. 2.5D Tilted Magma Crater Ring (`drawTiltedOrbitBand` at `cy: baseY`)
  // -------------------------------------------------------------------------
  drawTiltedOrbitBand(pen, {
    cx: baseX,
    cy: baseY,
    radius: calderaRx,
    aspectY: calderaAspect,
    thickness: 2.1 * pop,
    roll: 0,
    spin: u * Math.PI * 4,
    colorA: PURE_WHITE,
    colorB: BRIGHT_GOLD,
    alpha: 0.96 * env,
    frontOnly: null
  });
  drawTiltedOrbitBand(pen, {
    cx: baseX,
    cy: baseY,
    radius: calderaRx * 0.68,
    aspectY: calderaAspect,
    thickness: 1.5 * pop,
    roll: 0,
    spin: -u * Math.PI * 6,
    colorA: BRIGHT_GOLD,
    colorB: ramp[5],
    alpha: 0.94 * env,
    frontOnly: true
  });

  // -------------------------------------------------------------------------
  // 5. Rising Molten Magma Chunks with 1px `#220500` Obsidian-Ash Selective Outlines
  // -------------------------------------------------------------------------
  const numChunks = 8;
  for (let i = 0; i < numChunks; i++) {
    const cu = ((i / numChunks) + u * 1.5) % 1;
    const side = i % 2 === 0 ? 1 : -1;
    const lane = ((i * 7) % 5) - 2;
    const spreadX =
      side * (10 + (i % 3) * 5.2) * pop * sc +
      Math.sin(cu * Math.PI * 3 + i) * 3.0 * pop +
      lane * 1.2;
    const chunkX = Math.max(-43, Math.min(43, baseX + spreadX));
    const chunkY = Math.max(-42, Math.min(41, baseY - 4 - cu * 72 * pop));
    const chunkFade = Math.sin(cu * Math.PI);
    if (chunkFade <= 0.12) continue;

    const rChunk = (1.6 + (i % 3) * 0.55) * pop * Math.min(1, chunkFade * 1.35);
    // 1px #220500 obsidian-ash selective outline
    pen.fillCircle(chunkX, chunkY, rChunk + 0.95, DARK_OUTLINE, 0.96 * env);
    // Molten crimson-orange magma crust
    pen.fillCircle(chunkX, chunkY, rChunk, i % 2 === 0 ? ramp[4] : ramp[3], 0.98 * env);
    // Incandescent gold/white magma core
    pen.fillCircle(chunkX - 0.3 * side, chunkY - 0.3, rChunk * 0.55, BRIGHT_GOLD, 0.98 * env);
    pen.stipple(chunkX, chunkY, PURE_WHITE, 0.95 * env);
  }
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
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, ramp[7], ramp[5], ramp[3]], floorY: 36 });
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
            rng.between(-18 * sc, 18 * sc),
            rng.between(-36, 12),
            rng.between(-24, 24),
            rng.between(-58, -18),
            rng.between(0.18, 0.34),
            rng.chance(0.45) ? ramp[7] : ramp[5],
            1.0,
            -25
          );
        }
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 0.88);
        const pop = 0.64 + 0.36 * smoothStep(0, 0.16, u);
        const fade = 1 - smoothStep(0.74, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;
        const sc = cfg.scaleWidth || 1.0;
        const baseY = pen.w === 104 ? 36 : 2;
        drawSwirlingSolarHellfirePillar(pen, 0, baseY, pop, u, env, ramp, cfg.seed || 97, sc);
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
            rng.between(-14, 14),
            rng.between(-8, 28),
            rng.between(-18, 18),
            rng.between(-36, -12),
            0.22,
            rng.chance(0.5) ? ramp[7] : ramp[5],
            1,
            -18
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

        drawSwirlingSolarHellfirePillar(pen, 0, 36, pop, u, env, ramp, cfg.seed || 211, 1.0);
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
    const band4 = [ramp[2], ramp[4], ramp[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, ramp[7], ramp[5], ramp[3]] });
    let acc = 0;

    return {
      step(dt) {
        acc += dt * 52;
        while (acc >= 1) {
          acc -= 1;
          motes.emit(
            rng.chance(0.35) ? 'glint' : 'spark',
            rng.between(-12, 14),
            rng.between(-14, 14),
            rng.between(-82, -26),
            rng.between(-24, 24),
            0.24,
            rng.chance(0.5) ? ramp[7] : ramp[5],
            1.15,
            0
          );
        }
        motes.step(dt);
      },
      renderBack(pen, localT) {
        const ph = localT * Math.PI * 2;
        drawTiltedOrbitBand(pen, 8, 0, 29, 0.36, 1.5, 0.85, band4, BACK_HALF, false);
        const bx = 8 + Math.cos(ph + Math.PI) * 26;
        const by = Math.sin(ph + Math.PI) * 9.5;
        if (Math.sin(ph + Math.PI) < 0) {
          pen.fillCircle(bx, by, 3.2, ramp[0], 0.98);
          pen.fillCircle(bx, by, 2.0, ramp[5], 0.98);
          pen.pixel(bx, by, ramp[7], 1);
        }
      },
      renderFront(pen, localT) {
        const ph = localT * Math.PI * 2;
        const headX = 8;

        // Craggy 3D-Rotating Obsidian Meteor + Molten Lava Veins + 1px Selout (`+X` heading)
        pen.shadeBox(-41, -34, 40, 34, (lx, ly, out) => {
          const dx = lx - headX;
          const d = Math.hypot(dx, ly);
          const ang = Math.atan2(ly, dx);
          const crag =
            Math.sin(ang * 5 + ph) * 1.8 +
            Math.cos(ang * 7 - ph * 2) * 1.4 +
            fbm2D(dx * 0.22 + Math.cos(ph), ly * 0.22 + Math.sin(ph), 2) * 3.8;
          const rockR = 20.5 + crag;

          if (d <= rockR) {
            // 1px Dark Selective Outline (Selout) on asteroid edge
            if (d >= rockR - 1.45) {
              out.color = ramp[0];
              out.alpha = 0.98;
              return out.color;
            }
            // 3D Spherical coordinates for rotating tectonic magma veins
            const nx = dx / Math.max(1, rockR);
            const ny = ly / Math.max(1, rockR);
            const nz = Math.sqrt(Math.max(0.05, 1 - nx * nx - ny * ny));
            const rotX = nx * Math.cos(ph) + nz * Math.sin(ph);
            const rotZ = -nx * Math.sin(ph) + nz * Math.cos(ph);
            const vein = Math.abs(fbm2D(rotX * 3.4 + 1.7, ny * 3.4 - rotZ * 1.9, 2));

            if (vein < 0.13 || d < 5.5) {
              out.color = d < 3.8 || vein < 0.06 ? PURE_WHITE : ramp[7];
              out.alpha = 1;
              out.glowColor = ramp[6];
              out.glowStrength = 0.52;
            } else if (vein < 0.25) {
              out.color = vein < 0.19 ? ramp[6] : ramp[5];
              out.alpha = 0.98;
              out.glowColor = ramp[5];
              out.glowStrength = 0.28;
            } else if (vein < 0.36) {
              out.color = ramp[3];
              out.alpha = 0.98;
            } else {
              out.color = ny + rotZ * 0.35 < 0 ? ramp[2] : ramp[1];
              out.alpha = 0.98;
            }
            return out.color;
          }

          // Roaring Pixel-Clustered FBM Plasma Wake streaming left (`-X`)
          if (lx < headX + 4) {
            const tailU = clamp01((headX + 4 - lx) / 45);
            const wave = Math.sin(tailU * 8 - ph * 2) * 2.4 * tailU;
            const halfH = (1 - tailU * 0.72) * 22 + 3;
            const absY = Math.abs(ly - wave);
            if (absY < halfH) {
              const n = fbm2D(lx * 0.16 + ph * 2, ly * 0.18, 2);
              const heat = (1 - absY / halfH) * (1 - tailU * 0.68) + n * 0.28;
              if (heat > 0.18) {
                if (heat < 0.27) {
                  // 1px dark selective outline on outer ash/flame clusters
                  out.color = ramp[0];
                  out.alpha = 0.92;
                  return out.color;
                }
                const idx = Math.min(7, Math.max(2, Math.floor(heat * 7.8)));
                out.color = ramp[idx];
                out.alpha = clamp01(heat * 1.25);
                out.glowColor = ramp[5];
                out.glowStrength = 0.3 * (1 - tailU);
                return out.color;
              }
            }
          }
          return 0;
        });

        drawTiltedOrbitBand(pen, headX, 0, 29, 0.36, 1.6, 0.92, band4, FRONT_HALF, true);

        const bx = headX + Math.cos(ph + Math.PI) * 26;
        const by = Math.sin(ph + Math.PI) * 9.5;
        if (Math.sin(ph + Math.PI) >= 0) {
          pen.fillCircle(bx, by, 3.4, ramp[0], 0.98);
          pen.fillCircle(bx, by, 2.2, ramp[5], 0.98);
          pen.pixel(bx, by, PURE_WHITE, 1);
        }

        // White-gold atmospheric entry bow-shock arc ahead of meteor (`+X`)
        for (let i = -14; i <= 14; i++) {
          const f = i / 14;
          const ang = f * 1.18;
          const env = Math.cos(f * Math.PI * 0.5);
          const sx = headX + Math.cos(ang) * 26.5;
          const sy = Math.sin(ang) * 26.5;
          pen.fillCircle(sx, sy, 1.5 * env + 0.5, Math.abs(i) < 5 ? PURE_WHITE : ramp[6], 0.94);
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

// ============================================================================
// ROW 5 (`y=1040`): DIMENSIONAL HEAVENSFALL SKY BREACH PORTAL (`astralSkyBreachPortalCell`)
// ============================================================================
export const astralSkyBreachPortalCell = {
  duration: 1.0,
  loop: true,
  defaults: { palette: ECLIPSE_ABYSS_PALETTE, seed: 251 },
  create(cfg) {
    const abyss = buildColorRamp(cfg.palette, 8);
    const solar = buildColorRamp(SOLAR_CORONA_PALETTE, 8);
    const bandOuter = [solar[1], solar[4], solar[6], PURE_WHITE];
    const bandInner = [abyss[2], solar[5], solar[7], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, solar[7], solar[5], abyss[4]] });
    let acc = 0;

    return {
      step(dt) {
        acc += dt * 42;
        while (acc >= 1) {
          acc -= 1;
          const a = rng.between(0, Math.PI * 2);
          const rx = rng.between(18, 36);
          motes.emit(
            rng.chance(0.4) ? 'glint' : 'spark',
            Math.cos(a) * rx,
            Math.sin(a) * rx * 0.44,
            -Math.cos(a) * 24,
            rng.between(12, 42),
            0.22,
            rng.chance(0.5) ? solar[7] : solar[5],
            1.1,
            18
          );
        }
        motes.step(dt);
      },
      renderBack(pen, localT) {
        const ph = localT * Math.PI * 2;
        drawTiltedOrbitBand(pen, 0, 0, 39, 0.44, 1.9, 0.92, bandOuter, BACK_HALF, false);
        drawTiltedOrbitBand(pen, 0, 0, 29, 0.44, 1.5, 0.88, bandInner, BACK_HALF, false);

        // Dimensional Astral Rift Tear (`rx = 38, ry = 18`) with 1px Selout + Swirling Magma Nebula
        pen.shadeBox(-41, -26, 41, 26, (lx, ly, out) => {
          const ang = Math.atan2(ly, lx);
          const jag =
            Math.sin(ang * 8 + ph * 2) * 0.08 +
            Math.cos(ang * 5 - ph * 3) * 0.06 +
            fbm2D(lx * 0.16 + Math.cos(ph), ly * 0.24 + Math.sin(ph), 2) * 0.12;
          const er = Math.hypot(lx / 37.5, ly / 16.5) + jag;

          if (er > 1.08) return 0;

          // 1px Dark Selective Outline around outer coronal tear
          if (er >= 0.98) {
            out.color = solar[0];
            out.alpha = 0.96;
            return out.color;
          }
          // Blazing Accretion Rim (`0.72 <= er < 0.98`)
          if (er >= 0.72) {
            const u = (er - 0.72) / 0.26;
            out.color = u < 0.32 ? PURE_WHITE : u < 0.62 ? solar[7] : u < 0.84 ? solar[5] : solar[3];
            out.alpha = 0.98;
            out.glowColor = solar[6];
            out.glowStrength = 0.48 * (1 - u);
            return out.color;
          }
          // Abyssal Void Core with swirling crimson-gold vortex filaments (`er < 0.72`)
          const swirl = fbm2D(lx * 0.18 - Math.sin(ph), ly * 0.28 + Math.cos(ph), 2);
          if (er < 0.22 && swirl > 0.08) {
            out.color = solar[6];
            out.alpha = 0.95;
            out.glowColor = solar[5];
            out.glowStrength = 0.35;
          } else if (swirl > 0.22) {
            out.color = abyss[4];
            out.alpha = 0.96;
          } else {
            out.color = er < 0.42 ? abyss[0] : abyss[1];
            out.alpha = 0.98;
          }
          return out.color;
        });
      },
      renderFront(pen, localT) {
        const ph = localT * Math.PI * 2;
        drawTiltedOrbitBand(pen, 0, 0, 39, 0.44, 2.0, 0.96, bandOuter, FRONT_HALF, true);
        drawTiltedOrbitBand(pen, 0, 0, 29, 0.44, 1.6, 0.92, bandInner, FRONT_HALF, false);

        // 8 Rotating Astral Prominence Spikes around the breach
        for (let k = 0; k < 8; k++) {
          const a = ph + (k * Math.PI) / 4;
          const x0 = Math.cos(a) * 26;
          const y0 = Math.sin(a) * 11.5;
          const x1 = Math.cos(a) * 39;
          const y1 = Math.sin(a) * 17.5;
          pen.line(x0, y0, x1, y1, k % 2 === 0 ? PURE_WHITE : solar[6], 0.92);
        }

        // Crackling Pixel Lightning Chains arcing across the dimensional breach
        for (let b = 0; b < 2; b++) {
          const a = ph * 1.5 + b * Math.PI;
          const sx = Math.cos(a) * 32;
          const sy = Math.sin(a) * 13;
          const bolt = buildLightningChain(rng, sx, sy, 0, 0, 0.22, 3);
          pen.polyline(bolt, b === 0 ? PURE_WHITE : solar[7], 0.94);
        }

        drawHeliosStar(pen, 0, 0, 12, PURE_WHITE, solar[6], 0.95, -ph * 2);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// ROW 6 (`y=1248`): COLOSSAL FF14 LIMIT BREAK III ASTEROID CORE (`astralMeteorColossusCell`)
// ============================================================================
export const astralMeteorColossusCell = {
  duration: 1.0,
  loop: true,
  defaults: { palette: SOLAR_CORONA_PALETTE, seed: 263 },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const band4 = [ramp[1], ramp[4], ramp[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, ramp[7], ramp[5], ramp[3]] });
    let acc = 0;

    function drawOrbitingBoulders(pen, ph, isFront) {
      for (let i = 0; i < 6; i++) {
        const a = ph * 2 + (i * Math.PI) / 3;
        const sinA = Math.sin(a);
        if ((sinA >= 0) !== isFront) continue;
        const rx = i % 2 === 0 ? 37.5 : 34.5;
        const ry = i % 2 === 0 ? 15.5 : -14.5;
        const bx = Math.cos(a) * rx;
        const by = sinA * ry;
        const br = i % 2 === 0 ? 3.8 : 3.1;
        // 1px dark selective outline (`ramp[0]`) + molten magma core
        pen.fillCircle(bx, by, br, ramp[0], 0.98);
        pen.fillCircle(bx, by, br - 1.1, ramp[3], 0.98);
        pen.fillCircle(bx - 0.4, by - 0.4, Math.max(1.1, br - 2.0), ramp[6], 1.0);
        pen.pixel(bx - 0.5, by - 0.5, PURE_WHITE, 1.0);
      }
    }

    return {
      step(dt) {
        acc += dt * 64;
        while (acc >= 1) {
          acc -= 1;
          const a = rng.between(0, Math.PI * 2);
          const dist = rng.between(24, 36);
          motes.emit(
            rng.chance(0.4) ? 'glint' : 'spark',
            Math.cos(a) * dist,
            Math.sin(a) * dist,
            rng.between(-32, 32),
            rng.between(-48, -14),
            0.22,
            rng.chance(0.5) ? ramp[7] : ramp[5],
            1.2,
            -12
          );
        }
        motes.step(dt);
      },
      renderBack(pen, localT) {
        const ph = localT * Math.PI * 2;
        drawTiltedOrbitBand(pen, 0, 0, 39, 0.38, 1.8, 0.88, band4, BACK_HALF, false);
        drawOrbitingBoulders(pen, ph, false);
      },
      renderFront(pen, localT) {
        const ph = localT * Math.PI * 2;

        // Colossal 3D-Rotating Tectonic Obsidian & Magma Asteroid (`rockR = 29..34.5`)
        pen.shadeBox(-39, -39, 39, 39, (lx, ly, out) => {
          const d = Math.hypot(lx, ly);
          if (d > 38) return 0;

          const ang = Math.atan2(ly, lx);
          const crag =
            Math.sin(ang * 6 + ph) * 1.9 +
            Math.cos(ang * 9 - ph * 2) * 1.5 +
            Math.sin(ang * 4 - ph) * 1.2 +
            fbm2D(lx * 0.15 + Math.cos(ph), ly * 0.15 + Math.sin(ph), 2) * 3.6;
          const rockR = 29.2 + crag;

          if (d <= rockR) {
            // 1. Crisp 1px Dark Selective Outline (`Selout`, `#18080a`) around the asteroid silhouette
            if (d >= rockR - 1.5) {
              out.color = ramp[0];
              out.alpha = 1.0;
              return out.color;
            }

            // 2. 3D Spherical Projection & Rotation for Tectonic Plates & Lava Fissures
            const nx = lx / Math.max(1, rockR);
            const ny = ly / Math.max(1, rockR);
            const nz = Math.sqrt(Math.max(0.04, 1 - nx * nx - ny * ny));

            // Rotate sphere coordinates around diagonal axis by `ph`
            const cosP = Math.cos(ph);
            const sinP = Math.sin(ph);
            const rx = nx * cosP + nz * sinP;
            const rz = -nx * sinP + nz * cosP;
            const ry = ny * cosP - rz * 0.25 * sinP;

            const tectonic = fbm2D(rx * 2.8 + 3.1, ry * 2.8 + rz * 1.7, 2);
            const fissure = Math.abs(fbm2D(rx * 3.6 - 1.4, ry * 3.6 - rz * 2.2, 2));
            const subCrack = Math.abs(fbm2D(rx * 6.2 + 0.8, ry * 6.2, 2));

            // Incandescent White-Gold & Solar-Orange Magma Rivers (`fissure < 0.22`)
            if (fissure < 0.085 || (d < 8.5 && tectonic > 0.05)) {
              out.color = fissure < 0.045 || d < 4.5 ? PURE_WHITE : ramp[7];
              out.alpha = 1.0;
              out.glowColor = ramp[6];
              out.glowStrength = 0.58;
              return out.color;
            }
            if (fissure < 0.17 || subCrack < 0.07) {
              out.color = fissure < 0.125 ? ramp[6] : ramp[5];
              out.alpha = 1.0;
              out.glowColor = ramp[5];
              out.glowStrength = 0.36;
              return out.color;
            }
            if (fissure < 0.25) {
              out.color = ramp[3];
              out.alpha = 0.98;
              return out.color;
            }

            // Stepped Cel-Clustered Obsidian Armor Plates with Bottom-Right Atmospheric Entry Rim Heating
            const noseHeat = (lx * 0.45 + ly * 0.55) / rockR + tectonic * 0.35;
            if (d >= rockR - 3.6 && noseHeat > 0.18) {
              out.color = noseHeat > 0.42 ? ramp[5] : ramp[3];
              out.alpha = 0.98;
              return out.color;
            }

            // 1px internal plate seam (`Selout` inside tectonic boundaries)
            if (fissure < 0.295) {
              out.color = ramp[0];
              out.alpha = 0.98;
              return out.color;
            }

            // Cel-shaded obsidian basalt plates
            const plateLight = nz * 0.65 - ny * 0.25 + tectonic * 0.45;
            out.color = plateLight > 0.58 ? ramp[2] : plateLight > 0.28 ? ramp[1] : ramp[0];
            out.alpha = 0.99;
            return out.color;
          }

          // 3. Outer Solar Prominence Rim & 4x4 Bayer Stipple Corona (`rockR < d <= rockR + 4.8`)
          const coronaDist = d - rockR;
          if (coronaDist <= 4.6) {
            const coronaU = 1 - coronaDist / 4.6;
            const flk = fbm2D(lx * 0.24 - ph * 2, ly * 0.24 + ph * 2, 2);
            if (coronaU + flk * 0.35 > 0.42) {
              out.color = coronaU > 0.68 ? ramp[6] : coronaU > 0.38 ? ramp[4] : ramp[0];
              out.alpha = clamp01(coronaU * 0.92);
              out.glowColor = ramp[5];
              out.glowStrength = 0.32 * coronaU;
              return out.color;
            }
          }
          return 0;
        });

        // 3 Rotating Volcanic Caldera Vents that flare with Helios stars across the front hemisphere
        for (let v = 0; v < 3; v++) {
          const va = ph + (v * Math.PI * 2) / 3;
          const sinV = Math.sin(va);
          if (sinV > -0.15) {
            const vx = Math.cos(va) * 14.5;
            const vy = (v - 1) * 7.5 + sinV * 4.5;
            drawHeliosStar(pen, vx, vy, 7.5 + sinV * 3.5, PURE_WHITE, ramp[6], 0.92, ph * 2 + v);
          }
        }

        drawTiltedOrbitBand(pen, 0, 0, 39, 0.38, 1.9, 0.95, band4, FRONT_HALF, true);
        drawOrbitingBoulders(pen, ph, true);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// ROW 7 (`y=1456`): ROARING ASTRAL CATACLYSM PLASMA WAKE (`astralCataclysmWakeCell`)
// ============================================================================
export const astralCataclysmWakeCell = {
  duration: 1.0,
  loop: true,
  defaults: { palette: SOLAR_CORONA_PALETTE, seed: 277 },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const band4 = [ramp[2], ramp[4], ramp[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, ramp[7], ramp[5], ramp[3]] });
    let acc = 0;

    return {
      step(dt) {
        acc += dt * 56;
        while (acc >= 1) {
          acc -= 1;
          motes.emit(
            rng.chance(0.4) ? 'streak' : 'spark',
            rng.between(-18, 18),
            rng.between(-10, 26),
            rng.between(-24, 24),
            rng.between(-84, -28),
            0.22,
            rng.chance(0.5) ? ramp[7] : ramp[5],
            1.15,
            -15
          );
        }
        motes.step(dt);
      },
      renderBack(pen, localT) {
        const ph = localT * Math.PI * 2;
        const ringY = -8 + ((localT * 28) % 28);
        drawTiltedOrbitBand(pen, 0, ringY, 34, 0.32, 1.6, 0.86, band4, BACK_HALF, false);
        drawTiltedOrbitBand(pen, 0, -ringY * 0.6, 26, 0.32, 1.4, 0.82, band4, BACK_HALF, false);

        // Multi-tongue roaring FBM solar plasma wake column with 1px `#18080a` Selout
        pen.shadeBox(-36, -39, 36, 39, (lx, ly, out) => {
          const v = clamp01((38 - ly) / 76); // 0 at bottom (+38, meteor side), 1 at top (-38, wake tail)
          const sway = Math.sin(v * 6.5 - ph * 2) * 4.5 * v;
          const halfW = (1 - v * 0.58) * 28 + Math.sin(v * 9 + ph) * 3.2;
          const dx = Math.abs(lx - sway);
          if (dx > halfW) return 0;

          const nx = (lx - sway) / Math.max(1, halfW);
          const tongue =
            Math.cos(nx * Math.PI * 2.5) * 0.22 +
            fbm2D(lx * 0.16 + Math.cos(ph), ly * 0.14 + ph * 2.2, 2) * 0.42;
          const heat = (1 - Math.pow(dx / halfW, 1.45)) * (1 - v * 0.48) + tongue;

          if (heat <= 0.16) return 0;
          // 1px Dark Selective Outline (`ramp[0]`) on outer ash/cinder boundary
          if (heat < 0.26 || dx >= halfW - 1.5) {
            out.color = ramp[0];
            out.alpha = 0.94;
            return out.color;
          }
          if (heat > 0.82) {
            out.color = PURE_WHITE;
            out.alpha = 1.0;
          } else {
            const idx = Math.min(7, Math.max(1, Math.floor(heat * 8.2)));
            out.color = ramp[idx];
            out.alpha = 0.98;
          }
          out.glowColor = ramp[6];
          out.glowStrength = 0.38 * (1 - v * 0.6);
          return out.color;
        });
      },
      renderFront(pen, localT) {
        const ringY = -8 + ((localT * 28) % 28);
        drawTiltedOrbitBand(pen, 0, ringY, 34, 0.32, 1.7, 0.94, band4, FRONT_HALF, true);
        drawTiltedOrbitBand(pen, 0, -ringY * 0.6, 26, 0.32, 1.5, 0.9, band4, FRONT_HALF, false);

        const bolt = buildLightningChain(rng, -12, 28, 12, -28, 0.24, 3);
        pen.polyline(bolt, ramp[7], 0.9);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 11. LIVE 120HZ BLACK MAGE LEY-LINES INVOCATION CIRCLE (`astralBlackMageLeyLines`)
// ============================================================================
export const astralBlackMageLeyLines = {
  duration: 3.25,
  loop: false,
  defaults: {
    palette: SOLAR_CORONA_PALETTE,
    seed: 307
  },
  create(cfg) {
    const solar = buildColorRamp(cfg.palette, 8);
    const abyss = buildColorRamp(ECLIPSE_ABYSS_PALETTE, 8);
    const bandOuter = [solar[1], solar[4], solar[6], PURE_WHITE];
    const bandInner = [abyss[3], solar[5], solar[7], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, solar[7], solar[5], solar[3]], floorY: 0 });
    let t = 0;
    let acc = 0;

    function drawHelixRibbons(pen, u, env, isFront) {
      const turns = 2.5;
      const steps = 28;
      for (let strand = 0; strand < 2; strand++) {
        for (let s = 0; s < steps; s++) {
          const f = s / steps;
          const a = f * Math.PI * 2 * turns - t * 5.2 + strand * Math.PI;
          const sinA = Math.sin(a);
          if ((sinA >= 0) !== isFront) continue;
          const rx = (1 - f * 0.35) * 32 + 8;
          const hx = Math.cos(a) * rx;
          const hy = -4 - f * 86 + sinA * 4.5;
          const r = (1 - f * 0.55) * 2.2 + 0.8;
          pen.fillCircle(hx, hy, r + 0.8, solar[0], 0.88 * env);
          pen.fillCircle(hx, hy, r, s % 3 === 0 ? PURE_WHITE : strand === 0 ? solar[7] : solar[5], 0.96 * env);
        }
      }
    }

    return {
      step(dt) {
        t += dt;
        acc += dt * 54;
        while (acc >= 1 && t < 3.0) {
          acc -= 1;
          const a = rng.between(0, Math.PI * 2);
          const rx = rng.between(16, 66);
          motes.emit(
            rng.chance(0.4) ? 'glint' : 'spark',
            Math.cos(a) * rx,
            Math.sin(a) * rx * 0.22 - 2,
            rng.between(-14, 14),
            rng.between(-78, -26),
            rng.between(0.24, 0.44),
            rng.chance(0.5) ? solar[7] : solar[5],
            1.15,
            -18
          );
        }
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 3.25);
        const pop = smoothStep(0, 0.1, u);
        const fade = 1 - smoothStep(0.88, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;

        drawTiltedOrbitBand(pen, 0, 0, 68 * pop, 0.22, 1.9, 0.9 * env, bandOuter, BACK_HALF, false);
        drawTiltedOrbitBand(pen, 0, 0, 44 * pop, 0.22, 1.5, 0.86 * env, bandInner, BACK_HALF, false);
        drawTiltedOrbitBand(pen, 0, 0, 22 * pop, 0.22, 1.2, 0.82 * env, bandOuter, BACK_HALF, false);
        drawHelixRibbons(pen, u, env, false);
      },
      renderFront(pen) {
        const u = clamp01(t / 3.25);
        const pop = smoothStep(0, 0.1, u);
        const fade = 1 - smoothStep(0.88, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;

        drawTiltedOrbitBand(pen, 0, 0, 68 * pop, 0.22, 2.0, 0.96 * env, bandOuter, FRONT_HALF, true);
        drawTiltedOrbitBand(pen, 0, 0, 44 * pop, 0.22, 1.6, 0.92 * env, bandInner, FRONT_HALF, false);
        drawTiltedOrbitBand(pen, 0, 0, 22 * pop, 0.22, 1.3, 0.88 * env, bandOuter, FRONT_HALF, false);

        // 8 Consecrated Black Mage Ley-Line Rune Pillars around the circle perimeter
        for (let k = 0; k < 8; k++) {
          const a = t * 2.4 + (k * Math.PI) / 4;
          const x0 = Math.cos(a) * 22 * pop;
          const y0 = Math.sin(a) * 22 * 0.22 * pop;
          const x1 = Math.cos(a) * 68 * pop;
          const y1 = Math.sin(a) * 68 * 0.22 * pop;
          pen.line(x0, y0, x1, y1, k % 2 === 0 ? PURE_WHITE : solar[6], 0.9 * env);
          if (Math.sin(a) >= 0) {
            drawHeliosStar(pen, x1, y1 - 3, 5.5 * pop, PURE_WHITE, solar[5], 0.92 * env, t * 4 + k);
          }
        }

        drawHelixRibbons(pen, u, env, true);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 12. LIVE 120HZ METEOR SLIPSTREAM WAKE (`astralMeteorSlipstreamWake`)
// ============================================================================
export const astralMeteorSlipstreamWake = {
  duration: 0.46,
  loop: false,
  defaults: {
    palette: SOLAR_CORONA_PALETTE,
    seed: 317,
    scale: 1.0
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const band4 = [ramp[1], ramp[4], ramp[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, ramp[7], ramp[5], ramp[3]] });
    let t = 0;
    let emitted = false;

    return {
      step(dt) {
        if (!emitted) {
          emitted = true;
          for (let i = 0; i < 18; i++) {
            const a = rng.between(-Math.PI * 0.85, -Math.PI * 0.15);
            const spd = rng.between(48, 155);
            motes.emit(
              i % 3 === 0 ? 'streak' : 'spark',
              rng.between(-18, 18),
              rng.between(-12, 12),
              Math.cos(a) * spd,
              Math.sin(a) * spd,
              rng.between(0.18, 0.38),
              i % 2 === 0 ? ramp[7] : ramp[5],
              1.2,
              -20
            );
          }
        }
        t += dt;
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 0.46);
        const fade = 1 - u;
        if (fade <= 0.02) return;
        const sc = (cfg.scale || 1.0) * (0.75 + 0.55 * smoothStep(0, 0.65, u));
        drawTiltedOrbitBand(pen, 0, 0, 38 * sc, 0.34, 1.8, fade * 0.9, band4, BACK_HALF, false);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.46);
        const fade = 1 - u;
        if (fade <= 0.02) return;
        const sc = (cfg.scale || 1.0) * (0.75 + 0.55 * smoothStep(0, 0.65, u));
        drawTiltedOrbitBand(pen, 0, 0, 38 * sc, 0.34, 1.9, fade * 0.95, band4, FRONT_HALF, u < 0.3);

        // Crackling slipstream plasma bolt
        if (u < 0.65) {
          const bolt = buildLightningChain(rng, -22 * sc, -16 * sc, 22 * sc, 14 * sc, 0.22, 3);
          pen.polyline(bolt, u < 0.25 ? PURE_WHITE : ramp[7], fade * 0.92);
        }
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 13. LIVE 120HZ THERMONUCLEAR CATACLYSM IMPACT DOME (`astralCataclysmImpactDome`)
// ============================================================================
export const astralCataclysmImpactDome = {
  duration: 1.85,
  loop: false,
  defaults: {
    palette: SOLAR_CORONA_PALETTE,
    seed: 331
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const band4 = [ramp[1], ramp[4], ramp[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, ramp[7], ramp[5], ramp[3]], floorY: 0 });
    let t = 0;
    let acc = 0;
    let burstDone = false;

    return {
      step(dt) {
        if (!burstDone) {
          burstDone = true;
          for (let i = 0; i < 42; i++) {
            const a = rng.between(-Math.PI * 0.95, -Math.PI * 0.05);
            const spd = rng.between(65, 220);
            motes.emit(
              i % 3 === 0 ? 'glint' : 'spark',
              rng.between(-32, 32),
              rng.between(-12, 0),
              Math.cos(a) * spd,
              Math.sin(a) * spd,
              rng.between(0.32, 0.72),
              i % 2 === 0 ? ramp[7] : ramp[5],
              1.35,
              95
            );
          }
        }
        t += dt;
        acc += dt * 48;
        while (acc >= 1 && t < 1.35) {
          acc -= 1;
          motes.emit(
            'spark',
            rng.between(-88, 88),
            rng.between(-6, 2),
            rng.between(-28, 28),
            rng.between(-96, -32),
            rng.between(0.24, 0.45),
            rng.chance(0.5) ? ramp[7] : ramp[5],
            1.2,
            -18
          );
        }
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 1.85);
        const pop = smoothStep(0, 0.14, u);
        const fade = 1 - smoothStep(0.68, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;

        const r1 = (45 + 72 * smoothStep(0, 0.55, u)) * pop;
        const r2 = (28 + 48 * smoothStep(0, 0.45, u)) * pop;
        drawTiltedOrbitBand(pen, 0, 0, r1, 0.22, 2.2, 0.92 * env, band4, BACK_HALF, false);
        drawTiltedOrbitBand(pen, 0, 0, r2, 0.22, 1.8, 0.88 * env, band4, BACK_HALF, false);

        // Colossal Pixel-Shader Thermonuclear Magma Hemisphere Dome (`shadeBox` with 1px Selout)
        const domeW = Math.round((38 + 68 * smoothStep(0, 0.38, u)) * pop);
        const domeH = Math.round((34 + 66 * smoothStep(0, 0.38, u)) * pop);
        if (domeW >= 8 && domeH >= 8) {
          pen.shadeBox(-domeW - 4, -domeH - 4, domeW + 4, 8, (lx, ly, out) => {
            if (ly > 4) return 0;
            const nx = lx / domeW;
            const ny = ly / domeH;
            const d = Math.hypot(nx, ny);
            const crag = fbm2D(lx * 0.1 + t * 2.4, ly * 0.1 - t * 3.1, 2) * 0.12;
            const effD = d + crag;
            if (effD > 1.04) return 0;

            // 1px Dark Selective Outline (`ramp[0]`) on outer dome crust
            if (effD >= 0.94) {
              out.color = ramp[0];
              out.alpha = 0.95 * env;
              return out.color;
            }

            // Cellular magma cracks across the expanding explosion dome
            const cell = Math.abs(fbm2D(lx * 0.14 - t * 1.8, ly * 0.14 + t * 2.6, 2));
            const coreHeat = (1 - effD * 0.82) * fade + (cell < 0.14 ? 0.35 : 0);
            if (coreHeat < 0.22) return 0;

            if (coreHeat > 0.78 || effD < 0.36) {
              out.color = PURE_WHITE;
            } else if (coreHeat > 0.58) {
              out.color = ramp[7];
            } else if (coreHeat > 0.42) {
              out.color = ramp[5];
            } else if (coreHeat > 0.28) {
              out.color = ramp[3];
            } else {
              out.color = ramp[1];
            }
            out.alpha = clamp01(env * 0.98);
            out.glowColor = ramp[6];
            out.glowStrength = 0.48 * env;
            return out.color;
          });
        }
      },
      renderFront(pen) {
        const u = clamp01(t / 1.85);
        const pop = smoothStep(0, 0.14, u);
        const fade = 1 - smoothStep(0.68, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;

        const r1 = (45 + 72 * smoothStep(0, 0.55, u)) * pop;
        const r2 = (28 + 48 * smoothStep(0, 0.45, u)) * pop;
        drawTiltedOrbitBand(pen, 0, 0, r1, 0.22, 2.3, 0.96 * env, band4, FRONT_HALF, u < 0.28);
        drawTiltedOrbitBand(pen, 0, 0, r2, 0.22, 1.9, 0.92 * env, band4, FRONT_HALF, false);

        // 6 Ground-to-Sky Jagged Solar Lightning Pillars
        if (u < 0.72) {
          const boltEnv = Math.sin((u / 0.72) * Math.PI);
          for (const bx of [-64, -36, -12, 12, 36, 64]) {
            const bolt = buildLightningChain(rng, bx * pop, -118 * pop, bx * 0.65 * pop, 0, 0.18, 3);
            pen.polyline(bolt, Math.abs(bx) < 20 ? PURE_WHITE : ramp[7], 0.94 * boltEnv);
          }
        }
        motes.render(pen);
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
  astralBlackMageLeyLines,
  astralMeteorSlipstreamWake,
  astralCataclysmImpactDome,
  solarFireballOrbCell,
  hellfireMagmaPillarCell,
  blackSunEclipseSphereCell,
  cataclysmSolarMeteorCell,
  heliosSunCrestSlashCell,
  astralSkyBreachPortalCell,
  astralMeteorColossusCell,
  astralCataclysmWakeCell
};

