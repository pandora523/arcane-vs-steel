/**
 * Cryo-Prism Winter Empress & Borealis Shader Suite (`glacialShaders.js`)
 * First-party 120Hz 2.5D pixel-shader & particle effects for Lyra (`icemage` / `IceMage.js`).
 *
 * Powers both:
 *   1. Live 120Hz `ArcaneShaderFX` (`back` + `front` 2.5D depth wraps around Lyra, Cryo-Prisms & opponents)
 *   2. Offline 30fps `assets/sprites/icemage_vfx.png` (`6240x1664`, 8 rows x 30 cols @ 208x208, 0/240 clips)
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
} from '../ArcaneShaderFX.js?v=30fps66';

export const GLACIAL_CRYO_PALETTE = [
  '#061224',
  '#0c2948',
  '#1d4ed8',
  '#0284c7',
  '#38bdf8',
  '#67e8f9',
  '#bae6fd',
  '#ffffff'
];

export const BOREALIS_PRISM_PALETTE = [
  '#140928',
  '#311068',
  '#5b21b6',
  '#8b5cf6',
  '#c084fc',
  '#e879f9',
  '#a5f3fc',
  '#ffffff'
];

const BACK_HALF = (theta) => Math.sin(theta) < 0;
const FRONT_HALF = (theta) => Math.sin(theta) >= 0;

function drawSnowflakeStar(pen, cx, cy, r, mainCol, accentCol, alpha = 1, rot = 0) {
  for (let k = 0; k < 6; k++) {
    const a = rot + (k * Math.PI) / 3;
    const ex = cx + Math.cos(a) * r;
    const ey = cy + Math.sin(a) * r;
    pen.line(cx, cy, ex, ey, k % 2 === 0 ? mainCol : accentCol, alpha * 0.94);
    if (r >= 5) {
      const bx = cx + Math.cos(a) * r * 0.62;
      const by = cy + Math.sin(a) * r * 0.62;
      for (const s of [-0.55, 0.55]) {
        pen.line(
          bx,
          by,
          bx + Math.cos(a + s) * r * 0.32,
          by + Math.sin(a + s) * r * 0.32,
          accentCol,
          alpha * 0.8
        );
      }
    }
  }
  pen.fillCircle(cx, cy, Math.max(1.2, r * 0.2), PURE_WHITE, alpha);
  pen.radialGlow(cx, cy, r * 0.85, mainCol, 0.32 * alpha);
}

// ============================================================================
// 1. FROST SCEPTER FOCUS (`cryoScepterFocus`)
// ============================================================================
export const cryoScepterFocus = {
  duration: 0.32,
  loop: false,
  defaults: { palette: GLACIAL_CRYO_PALETTE, seed: 17 },
  create(cfg) {
    const cryo = buildColorRamp(cfg.palette, 8);
    const borealis = buildColorRamp(BOREALIS_PRISM_PALETTE, 8);
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, cryo[6], cryo[4], borealis[5]] });
    let t = 0;
    let acc = 0;

    return {
      step(dt) {
        t += dt;
        acc += dt * 52;
        while (acc >= 1 && t < 0.26) {
          acc -= 1;
          const a = rng.between(0, Math.PI * 2);
          const dist = rng.between(9, 16);
          motes.emit(
            'glint',
            Math.cos(a) * dist,
            Math.sin(a) * dist,
            -Math.cos(a) * 38,
            -Math.sin(a) * 38,
            0.18,
            rng.chance(0.4) ? borealis[5] : cryo[5],
            1,
            0
          );
        }
        motes.step(dt);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.32);
        const env = Math.sin(u * Math.PI);
        if (env <= 0.02) return;
        const r = 5 + 6 * smoothStep(0, 0.7, u);
        drawTiltedOrbitBand(
          pen,
          0,
          0,
          r * 1.3,
          0.45,
          1.1,
          0.86 * env,
          [cryo[2], cryo[4], borealis[5], PURE_WHITE],
          () => true,
          false
        );
        drawSnowflakeStar(pen, 0, 0, r * 1.4, cryo[5], borealis[5], env, u * 4.2);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 2. CRYO-SHARD PRISM MACH-CONE (`cryoPrismMachCone`)
// ============================================================================
export const cryoPrismMachCone = {
  duration: 0.3,
  loop: false,
  defaults: { palette: GLACIAL_CRYO_PALETTE, seed: 31, aimAngle: 0, empowered: false },
  create(cfg) {
    const cryo = buildColorRamp(cfg.palette, 8);
    const borealis = buildColorRamp(BOREALIS_PRISM_PALETTE, 8);
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, cryo[6], borealis[5], cryo[4]] });
    let t = 0;
    let burstDone = false;

    return {
      step(dt) {
        if (!burstDone) {
          burstDone = true;
          const base = cfg.aimAngle || 0;
          for (let i = 0; i < (cfg.empowered ? 18 : 12); i++) {
            const a = base + rng.between(-0.55, 0.55);
            const spd = rng.between(45, 132);
            motes.emit(
              i % 3 === 0 ? 'glint' : 'streak',
              0,
              0,
              Math.cos(a) * spd,
              Math.sin(a) * spd,
              rng.between(0.14, 0.26),
              i % 2 === 0 ? cryo[5] : borealis[5],
              1,
              0
            );
          }
        }
        t += dt;
        motes.step(dt);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.3);
        const fade = 1 - u;
        if (fade <= 0.02) return;
        const aim = cfg.aimAngle || 0;
        const ca = Math.cos(aim);
        const sa = Math.sin(aim);
        const reach = (cfg.empowered ? 25 : 20) * smoothStep(0, 0.55, u);

        for (let k = 0; k < 2; k++) {
          const d = (k + 0.5) * reach * 0.55;
          const rx = ca * d;
          const ry = sa * d;
          const rr = (cfg.empowered ? 12.5 : 10) * (1 - k * 0.22) * (0.45 + 0.55 * u);
          for (let s = 0; s < 18; s++) {
            const th = (s / 18) * Math.PI * 2 + u * 3.5;
            const lx = Math.cos(th) * rr * 0.35;
            const ly = Math.sin(th) * rr;
            const px = rx + lx * ca - ly * sa;
            const py = ry + lx * sa + ly * ca;
            pen.stipple(px, py, s % 3 === 0 ? PURE_WHITE : k === 0 ? cryo[5] : borealis[5], fade * 0.92);
          }
        }
        drawSnowflakeStar(
          pen,
          0,
          0,
          (cfg.empowered ? 12 : 9.5) * fade,
          cryo[5],
          borealis[5],
          fade,
          u * 3
        );
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 3. 2.5D PERMAFROST SNOWFLAKE RINK SIGIL (`permafrostSnowflakeSigil`)
// ============================================================================
export const permafrostSnowflakeSigil = {
  duration: 1.6,
  loop: true,
  defaults: { palette: GLACIAL_CRYO_PALETTE, seed: 43, radiusWorld: 155 },
  create(cfg) {
    const cryo = buildColorRamp(cfg.palette, 8);
    const borealis = buildColorRamp(BOREALIS_PRISM_PALETTE, 8);
    const band4 = [cryo[2], cryo[4], borealis[5], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, cryo[6], borealis[5], cryo[4]] });
    let phase = 0;
    let acc = 0;

    return {
      step(dt) {
        phase += dt;
        acc += dt * 18;
        const rx = Math.min(68, Math.max(24, (cfg.radiusWorld || 155) / 3));
        while (acc >= 1) {
          acc -= 1;
          const a = rng.between(0, Math.PI * 2);
          const r = rng.between(4, rx * 0.88);
          motes.emit(
            'glint',
            Math.cos(a) * r,
            Math.sin(a) * r * 0.22 - 1,
            rng.between(-6, 6),
            rng.between(-24, -9),
            rng.between(0.28, 0.52),
            rng.chance(0.4) ? borealis[5] : cryo[5],
            1,
            0
          );
        }
        motes.step(dt);
      },
      renderBack(pen) {
        const rx = Math.min(68, Math.max(24, (cfg.radiusWorld || 155) / 3));
        drawTiltedOrbitBand(pen, 0, 0, rx, 0.21, 1.3, 0.82, band4, BACK_HALF, false);
        drawTiltedOrbitBand(pen, 0, 0, rx * 0.58, 0.21, 1.0, 0.72, band4, BACK_HALF, false);
      },
      renderFront(pen) {
        const rx = Math.min(68, Math.max(24, (cfg.radiusWorld || 155) / 3));
        drawTiltedOrbitBand(pen, 0, 0, rx, 0.21, 1.4, 0.9, band4, FRONT_HALF, false);
        drawTiltedOrbitBand(pen, 0, 0, rx * 0.58, 0.21, 1.1, 0.78, band4, FRONT_HALF, false);

        for (let k = 0; k < 6; k++) {
          const a = phase * 0.8 + (k * Math.PI) / 3;
          if (Math.sin(a) < 0) continue;
          pen.line(
            Math.cos(a) * rx * 0.3,
            Math.sin(a) * rx * 0.3 * 0.21,
            Math.cos(a) * rx,
            Math.sin(a) * rx * 0.21,
            k % 2 === 0 ? cryo[5] : borealis[5],
            0.82
          );
        }
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 4. FIGURE-SKATE BLADE RIBBON SLIPSTREAM (`glacialSkateRibbon`)
// ============================================================================
export const glacialSkateRibbon = {
  duration: 0.9,
  loop: true,
  defaults: { palette: GLACIAL_CRYO_PALETTE, seed: 59 },
  create(cfg) {
    const cryo = buildColorRamp(cfg.palette, 8);
    const borealis = buildColorRamp(BOREALIS_PRISM_PALETTE, 8);
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, cryo[6], borealis[5], cryo[4]] });
    let acc = 0;

    return {
      step(dt) {
        acc += dt * 48;
        while (acc >= 1) {
          acc -= 1;
          motes.emit(
            rng.chance(0.45) ? 'glint' : 'streak',
            rng.between(-8, 4),
            rng.between(-14, 6),
            rng.between(-85, -30),
            rng.between(-18, 12),
            rng.between(0.16, 0.32),
            rng.chance(0.4) ? borealis[5] : cryo[5],
            1,
            0
          );
        }
        motes.step(dt);
      },
      renderBack(pen) {
        pen.radialGlow(-3, -4, 12, cryo[4], 0.26);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 5. REFRACTED BOREALIS PRISM LASER BEAM (`refractedBorealisBeam`)
// ============================================================================
export const refractedBorealisBeam = {
  duration: 0.42,
  loop: false,
  defaults: { palette: GLACIAL_CRYO_PALETTE, seed: 73, dx: 90, dy: 0, magenta: false },
  create(cfg) {
    const cryo = buildColorRamp(cfg.palette, 8);
    const borealis = buildColorRamp(BOREALIS_PRISM_PALETTE, 8);
    const rng = new DeterministicRng(cfg.seed);
    let t = 0;

    return {
      step(dt) {
        t += dt;
      },
      renderFront(pen) {
        const u = clamp01(t / 0.42);
        const fade = 1 - u;
        if (fade <= 0.02) return;
        const ex = (cfg.dx || 90) / 3;
        const ey = (cfg.dy || 0) / 3;
        const mainCol = cfg.magenta ? borealis[5] : cryo[5];
        const subCol = cfg.magenta ? cryo[5] : borealis[5];

        pen.line(0, 0, ex, ey, mainCol, fade * 0.85);
        pen.line(0, -1, ex, ey - 1, PURE_WHITE, fade * 0.95);
        pen.line(0, 1, ex, ey + 1, mainCol, fade * 0.72);

        const helix = buildLightningChain(rng, 0, 0, ex, ey, 0.07, 3);
        pen.polyline(helix, subCol, fade * 0.82);

        drawSnowflakeStar(pen, 0, 0, 6.5 * fade, mainCol, subCol, fade, u * 4);
        drawSnowflakeStar(pen, ex, ey, 7.5 * fade, PURE_WHITE, mainCol, fade, -u * 4);
      }
    };
  }
};

// ============================================================================
// 6. 2.5D ABSOLUTE ZERO HOARFROST SHATTER NOVA (`absoluteZeroShatterBurst`)
// ============================================================================
export const absoluteZeroShatterBurst = {
  duration: 0.46,
  loop: false,
  defaults: { palette: GLACIAL_CRYO_PALETTE, seed: 89, isLarge: false },
  create(cfg) {
    const cryo = buildColorRamp(cfg.palette, 8);
    const borealis = buildColorRamp(BOREALIS_PRISM_PALETTE, 8);
    const band4 = [cryo[2], cryo[4], borealis[5], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, cryo[6], borealis[5], cryo[4]] });
    let t = 0;
    let burstDone = false;

    return {
      step(dt) {
        if (!burstDone) {
          burstDone = true;
          const cnt = cfg.isLarge ? 26 : 16;
          for (let i = 0; i < cnt; i++) {
            const a = rng.between(0, Math.PI * 2);
            const spd = rng.between(48, cfg.isLarge ? 175 : 132);
            motes.emit(
              i % 2 === 0 ? 'glint' : 'spark',
              0,
              0,
              Math.cos(a) * spd,
              Math.sin(a) * spd,
              rng.between(0.18, 0.38),
              i % 2 === 0 ? cryo[5] : borealis[5],
              cfg.isLarge ? 1.3 : 1.0,
              45
            );
          }
        }
        t += dt;
        motes.step(dt);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.46);
        const fade = 1 - u;
        if (fade <= 0.02) return;
        const maxR = cfg.isLarge ? 36 : 22;
        const r = maxR * smoothStep(0, 0.65, u);
        drawTiltedOrbitBand(pen, 0, 0, r, 0.85, 1.5, fade * 0.92, band4, () => true, u < 0.25);
        drawSnowflakeStar(pen, 0, 0, maxR * 0.95 * fade, cryo[5], borealis[5], fade, u * 2.8);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 7. 2.5D BOREALIS CATHEDRAL AURORA CURTAIN & CROWN (`borealisCathedralDomain`)
// ============================================================================
export const borealisCathedralDomain = {
  duration: 1.5,
  loop: false,
  defaults: { palette: GLACIAL_CRYO_PALETTE, seed: 103 },
  create(cfg) {
    const cryo = buildColorRamp(cfg.palette, 8);
    const borealis = buildColorRamp(BOREALIS_PRISM_PALETTE, 8);
    const band4 = [cryo[2], cryo[4], borealis[5], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, cryo[6], borealis[5], cryo[4]], floorY: 0 });
    let t = 0;
    let acc = 0;

    return {
      step(dt) {
        t += dt;
        acc += dt * 48;
        while (acc >= 1 && t < 1.3) {
          acc -= 1;
          motes.emit(
            rng.chance(0.5) ? 'glint' : 'spark',
            rng.between(-72, 72),
            rng.between(-110, -8),
            rng.between(-20, 20),
            rng.between(18, 56),
            rng.between(0.24, 0.46),
            rng.chance(0.45) ? borealis[5] : cryo[5],
            1.1,
            18
          );
        }
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 1.5);
        const pop = smoothStep(0, 0.14, u);
        const fade = 1 - smoothStep(0.82, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;

        for (let i = -9; i <= 9; i++) {
          const rx = i * 8;
          const wave = Math.sin(u * 9 + i * 0.55) * 6;
          const yTop = -126 + wave;
          const yBot = -68 + wave;
          const col = i % 3 === 0 ? borealis[5] : i % 2 === 0 ? cryo[5] : cryo[4];
          pen.line(rx, yTop, rx, yBot, col, 0.58 * env);
          if (i % 2 === 0) {
            pen.line(rx, yTop + 6, rx, yTop + 24, PURE_WHITE, 0.68 * env);
          }
        }

        drawTiltedOrbitBand(pen, 0, 0, 76 * pop, 0.21, 1.7, 0.88 * env, band4, BACK_HALF, false);
        drawTiltedOrbitBand(pen, 0, 0, 48 * pop, 0.21, 1.3, 0.82 * env, band4, BACK_HALF, false);
      },
      renderFront(pen) {
        const u = clamp01(t / 1.5);
        const pop = smoothStep(0, 0.14, u);
        const fade = 1 - smoothStep(0.82, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;

        drawTiltedOrbitBand(pen, 0, 0, 76 * pop, 0.21, 1.9, 0.96 * env, band4, FRONT_HALF, true);
        drawTiltedOrbitBand(pen, 0, 0, 48 * pop, 0.21, 1.4, 0.88 * env, band4, FRONT_HALF, false);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 8. 2.5D ABSOLUTE ZERO AURORA BOREALIS & DIAMOND DUST DOMAIN (`absoluteZeroAuroraVeil`)
//    Powers `TRUE_ULTIMATE` ("ABSOLUTE ZERO: DIAMOND DUST ETERNITY") Phases 1 & 2!
// ============================================================================
export const absoluteZeroAuroraVeil = {
  duration: 3.4,
  loop: false,
  defaults: { palette: GLACIAL_CRYO_PALETTE, seed: 149, customDuration: 3.4 },
  create(cfg) {
    const dur = cfg.customDuration || 3.4;
    const cryo = buildColorRamp(cfg.palette, 8);
    const borealis = buildColorRamp(BOREALIS_PRISM_PALETTE, 8);
    const band4 = [cryo[2], cryo[4], borealis[4], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, cryo[6], borealis[5], cryo[4]], floorY: 0 });
    let t = 0;
    let acc = 0;

    return {
      step(dt) {
        t += dt;
        acc += dt * 62;
        while (acc >= 1 && t < dur - 0.2) {
          acc -= 1;
          motes.emit(
            rng.chance(0.55) ? 'glint' : 'spark',
            rng.between(-96, 96),
            rng.between(-138, -6),
            rng.between(-34, 34),
            rng.between(14, 48),
            rng.between(0.28, 0.54),
            rng.chance(0.38) ? borealis[4] : rng.chance(0.5) ? PURE_WHITE : cryo[5],
            1.15,
            12
          );
        }
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / dur);
        const pop = smoothStep(0, 0.1, u);
        const fade = 1 - smoothStep(0.88, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;

        // Sweeping undulating Aurora Borealis sky curtains across the arena
        for (let i = -13; i <= 13; i++) {
          const rx = i * 7;
          const wave = Math.sin(t * 4.4 + i * 0.45) * 8 + Math.cos(t * 2.3 - i * 0.3) * 4;
          const yTop = -142 + wave;
          const yBot = -62 + wave * 0.7;
          const col = i % 4 === 0 ? borealis[4] : i % 2 === 0 ? cryo[5] : cryo[3];
          pen.line(rx, yTop, rx, yBot, col, 0.56 * env);
          if (i % 3 === 0) {
            pen.line(rx, yTop + 5, rx, yTop + 26, PURE_WHITE, 0.7 * env);
          }
        }

        drawTiltedOrbitBand(pen, 0, 0, 92 * pop, 0.21, 1.8, 0.88 * env, band4, BACK_HALF, false);
        drawTiltedOrbitBand(pen, 0, 0, 58 * pop, 0.21, 1.4, 0.82 * env, band4, BACK_HALF, false);
      },
      renderFront(pen) {
        const u = clamp01(t / dur);
        const pop = smoothStep(0, 0.1, u);
        const fade = 1 - smoothStep(0.88, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;

        drawTiltedOrbitBand(pen, 0, 0, 92 * pop, 0.21, 2.0, 0.96 * env, band4, FRONT_HALF, true);
        drawTiltedOrbitBand(pen, 0, 0, 58 * pop, 0.21, 1.5, 0.88 * env, band4, FRONT_HALF, false);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 9. 2.5D DIAMOND DUST CATACLYSM NOVA (`diamondDustCataclysmNova`)
//    Triggered at `t = 3.20s` when Lyra taps her Frost-Scepter!
// ============================================================================
export const diamondDustCataclysmNova = {
  duration: 0.9,
  loop: false,
  defaults: { palette: GLACIAL_CRYO_PALETTE, seed: 181 },
  create(cfg) {
    const cryo = buildColorRamp(cfg.palette, 8);
    const borealis = buildColorRamp(BOREALIS_PRISM_PALETTE, 8);
    const band4 = [cryo[2], cryo[5], borealis[5], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, cryo[6], borealis[5], cryo[4]] });
    let t = 0;
    let burstDone = false;

    return {
      step(dt) {
        if (!burstDone) {
          burstDone = true;
          for (let i = 0; i < 42; i++) {
            const a = (i / 42) * Math.PI * 2 + rng.between(-0.08, 0.08);
            const spd = rng.between(68, 245);
            motes.emit(
              i % 3 === 0 ? 'streak' : 'glint',
              0,
              0,
              Math.cos(a) * spd,
              Math.sin(a) * spd * 0.85,
              rng.between(0.32, 0.72),
              i % 3 === 0 ? PURE_WHITE : i % 2 === 0 ? cryo[5] : borealis[4],
              1.4,
              32
            );
          }
        }
        t += dt;
        motes.step(dt);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.9);
        const fade = 1 - smoothStep(0.35, 1.0, u);
        if (fade <= 0.02) return;
        const r = 68 * smoothStep(0, 0.45, u);
        drawTiltedOrbitBand(pen, 0, 0, r, 0.72, 2.0, 0.96 * fade, band4, () => true, u < 0.22);
        drawTiltedOrbitBand(pen, 0, 0, r * 0.62, 0.72, 1.4, 0.88 * fade, band4, () => true, false);
        drawStarburstFlare(pen, 0, 0, 44 * fade, 0.95 * fade, [cryo[3], cryo[5], borealis[5], PURE_WHITE]);
        drawSnowflakeStar(pen, 0, 0, 48 * fade, PURE_WHITE, borealis[4], 0.92 * fade, u * 3.2);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// BAKED 30FPS `icemage_vfx.png` 8-ROW CELLS (`104x104` logical -> `208x208` crisp 2x)
//   Row 0 (`y=0`):    Cryo-Shard Comet (`cryoShardBoltCell`)
//   Row 1 (`y=208`):  Floating Hexagonal Cryo-Prism Mirror (`hexCryoPrismMirrorCell`)
//   Row 2 (`y=416`):  Erupting Jagged Glacier Spire (`facetedGlacierMonolithCell`)
//   Row 3 (`y=624`):  Borealis Aurora Crown Seal (`borealisRoseMandalaCell`)
//   Row 4 (`y=832`):  Hoarfrost Starburst Nova (`hoarfrostShatterNovaCell`)
//   Row 5 (`y=1040`): Aurora Borealis Sovereign Snowflake Mandala (`auroraSovereignMandalaCell`)
//   Row 6 (`y=1248`): Absolute Zero Crystalline Diamond-Coffin Monolith (`diamondCoffinMonolithCell`)
//   Row 7 (`y=1456`): Diamond Dust Prismatic Starburst Shatter (`diamondDustStarburstCell`)
// ============================================================================

export const cryoShardBoltCell = {
  duration: 1.0,
  loop: true,
  defaults: { palette: GLACIAL_CRYO_PALETTE, seed: 301 },
  create(cfg) {
    const cryo = buildColorRamp(cfg.palette, 8);
    const borealis = buildColorRamp(BOREALIS_PRISM_PALETTE, 8);
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, cryo[6], borealis[5], cryo[4]] });
    let acc = 0;

    return {
      step(dt) {
        acc += dt * 44;
        while (acc >= 1) {
          acc -= 1;
          motes.emit(
            'glint',
            rng.between(-8, 12),
            rng.between(-7, 7),
            rng.between(-75, -24),
            rng.between(-12, 12),
            0.24,
            rng.chance(0.45) ? borealis[5] : cryo[5],
            1,
            0
          );
        }
        motes.step(dt);
      },
      renderFront(pen, localT) {
        const ph = localT * Math.PI * 2;
        const tipX = 28;
        const tailX = -32;

        // Faceted Diamond-Hexagon Cryo Lance pointing `+X`
        pen.shadeBox(tailX - 4, -18, tipX + 4, 18, (lx, ly, out) => {
          const u = (lx - tailX) / (tipX - tailX);
          if (u < 0 || u > 1) return 0;
          const halfH = u < 0.68 ? (u / 0.68) * 11.5 : ((1 - u) / 0.32) * 11.5;
          const ay = Math.abs(ly);
          if (ay > halfH) return 0;

          if (ay > halfH - 1.6) {
            out.color = cryo[0];
            out.alpha = 0.96;
            return out.color;
          }
          if (ay < 2.2) {
            out.color = PURE_WHITE;
            out.alpha = 1;
            out.glowColor = cryo[5];
            out.glowStrength = 0.45;
            return out.color;
          }
          const upperFacet = ly < 0;
          const shimmer = Math.sin(u * 12 - ph * 2) > 0.25;
          out.color = upperFacet ? (shimmer ? cryo[6] : cryo[5]) : shimmer ? borealis[5] : cryo[3];
          out.alpha = 0.96;
          out.glowColor = upperFacet ? cryo[5] : borealis[5];
          out.glowStrength = 0.25;
          return out.color;
        });

        drawSnowflakeStar(pen, 8, 0, 11, cryo[6], borealis[5], 0.9, ph);
        motes.render(pen);
      }
    };
  }
};

export const hexCryoPrismMirrorCell = {
  duration: 1.0,
  loop: true,
  defaults: { palette: GLACIAL_CRYO_PALETTE, seed: 311 },
  create(cfg) {
    const cryo = buildColorRamp(cfg.palette, 8);
    const borealis = buildColorRamp(BOREALIS_PRISM_PALETTE, 8);
    const band4 = [cryo[2], cryo[4], borealis[5], PURE_WHITE];

    return {
      step() {},
      renderBack(pen, localT) {
        const ph = localT * Math.PI * 2;
        drawTiltedOrbitBand(pen, 0, 0, 31, 0.38, 1.4, 0.85, band4, BACK_HALF, false);

        const R = 23;
        pen.shadeBox(-26, -26, 26, 26, (lx, ly, out) => {
          const rx = lx * Math.cos(ph * 0.5) - ly * Math.sin(ph * 0.5);
          const ry = lx * Math.sin(ph * 0.5) + ly * Math.cos(ph * 0.5);
          const ax = Math.abs(rx);
          const ay = Math.abs(ry);
          const hexD = Math.max(ax * 0.866025 + ay * 0.5, ay);
          if (hexD > R) return 0;
          if (hexD > R - 1.8) {
            out.color = cryo[0];
            out.alpha = 0.98;
            return out.color;
          }
          if (hexD < 5.5) {
            out.color = PURE_WHITE;
            out.alpha = 1;
            out.glowColor = cryo[5];
            out.glowStrength = 0.5;
            return out.color;
          }
          const sector = Math.floor(((Math.atan2(ry, rx) + Math.PI) / (Math.PI * 2)) * 6) % 6;
          out.color =
            sector === 0 || sector === 1
              ? cryo[6]
              : sector === 2 || sector === 5
                ? cryo[4]
                : borealis[5];
          out.alpha = 0.94;
          out.glowColor = sector === 3 ? borealis[5] : cryo[5];
          out.glowStrength = 0.28;
          return out.color;
        });
      },
      renderFront(pen, localT) {
        const ph = localT * Math.PI * 2;
        drawTiltedOrbitBand(pen, 0, 0, 31, 0.38, 1.5, 0.94, band4, FRONT_HALF, true);
        drawSnowflakeStar(pen, 0, 0, 18, PURE_WHITE, borealis[5], 0.9, -ph);
      }
    };
  }
};

export const facetedGlacierMonolithCell = {
  duration: 1.0,
  loop: false,
  defaults: { palette: GLACIAL_CRYO_PALETTE, seed: 323 },
  create(cfg) {
    const cryo = buildColorRamp(cfg.palette, 8);
    const borealis = buildColorRamp(BOREALIS_PRISM_PALETTE, 8);
    const band4 = [cryo[1], cryo[3], cryo[5], PURE_WHITE];
    const spires = [
      { ox: -16, tilt: -0.22, hScale: 0.56, wScale: 0.42 },
      { ox: 16, tilt: 0.22, hScale: 0.58, wScale: 0.42 },
      { ox: -9, tilt: -0.11, hScale: 0.78, wScale: 0.58 },
      { ox: 9, tilt: 0.11, hScale: 0.80, wScale: 0.58 },
      { ox: 0, tilt: 0.0, hScale: 1.0, wScale: 0.74 }
    ];

    return {
      step() {},
      renderFront(pen, localT) {
        const u = clamp01(localT);
        const baseY = 38;

        if (u < 0.734) {
          const growU = clamp01(u / 0.734);
          const pop = 0.52 + 0.48 * smoothStep(0, 0.22, growU);
          drawTiltedOrbitBand(pen, 0, baseY - 2, 32 * pop, 0.22, 1.5, 0.92, band4, BACK_HALF, false);

          for (let sIdx = 0; sIdx < spires.length; sIdx++) {
            const sp = spires[sIdx];
            const spH = 74 * pop * sp.hScale;
            const topY = baseY - spH;
            const maxHalfW = 18 * pop * sp.wScale;

            pen.shadeBox(-38, topY - 2, 38, baseY + 6, (lx, ly, out) => {
              if (ly < topY) return 0;
              const hFrac = Math.max(0, (baseY - ly) / Math.max(1, spH));
              const centerX = sp.ox + (ly - baseY) * sp.tilt;
              const dx = lx - centerX;
              const profile = hFrac < 0.58 ? 0.72 + (hFrac / 0.58) * 0.28 : Math.max(0.06, 1 - (hFrac - 0.58) / 0.42);
              const halfW = maxHalfW * profile;
              const ax = Math.abs(dx);
              if (ax > halfW) return 0;
              const botCurve = baseY + Math.sqrt(Math.max(0, 1 - Math.pow(ax / Math.max(1, halfW), 2))) * 4.2;
              if (ly > botCurve) return 0;

              if (ax > halfW - 1.5 || ly > botCurve - 1.5 || Math.abs(ax - halfW * 0.46) < 0.75) {
                out.color = cryo[0];
                out.alpha = 0.98;
                return out.color;
              }
              if (ax < 1.35) {
                out.color = hFrac > 0.65 ? PURE_WHITE : cryo[6];
                out.alpha = 0.98;
                out.glowColor = cryo[5];
                out.glowStrength = 0.28;
                return out.color;
              }
              const glint = ((Math.floor(lx + ly * 0.7) % 9) + 9) % 9 === 0;
              if (glint && dx < 0) {
                out.color = PURE_WHITE;
                out.alpha = 0.96;
                return out.color;
              }
              out.color =
                dx < 0
                  ? ax < halfW * 0.46
                    ? cryo[5]
                    : cryo[4]
                  : ax < halfW * 0.46
                    ? cryo[3]
                    : cryo[1];
              out.alpha = 0.96;
              return out.color;
            });
          }

          drawTiltedOrbitBand(pen, 0, baseY - 2, 32 * pop, 0.22, 1.6, 0.96, band4, FRONT_HALF, true);
        } else {
          const shU = clamp01((u - 0.734) / 0.266);
          const fade = 1 - smoothStep(0.55, 1.0, shU);
          if (fade <= 0.02) return;

          for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2 + 0.25;
            const dist = 8 + shU * 28;
            const sx = Math.cos(a) * dist;
            const sy = 4 + Math.sin(a) * dist * 0.85;
            const sr = (1 - shU * 0.5) * (i % 2 === 0 ? 5.5 : 4.0);
            pen.fillCircle(sx, sy, sr + 1, cryo[0], fade * 0.9);
            pen.fillCircle(sx, sy, sr, i % 3 === 0 ? borealis[5] : cryo[4], fade * 0.96);
            pen.stipple(sx, sy, PURE_WHITE, fade);
          }
          drawSnowflakeStar(pen, 0, 2, 34 * (1 - shU * 0.35), PURE_WHITE, cryo[5], fade, shU * 2);
        }
      }
    };
  }
};

export const borealisRoseMandalaCell = {
  duration: 1.0,
  loop: true,
  defaults: { palette: GLACIAL_CRYO_PALETTE, seed: 331 },
  create(cfg) {
    const cryo = buildColorRamp(cfg.palette, 8);
    const borealis = buildColorRamp(BOREALIS_PRISM_PALETTE, 8);
    const band4 = [cryo[2], cryo[4], borealis[5], PURE_WHITE];

    return {
      step() {},
      renderFront(pen, localT) {
        const ph = localT * Math.PI * 2;
        drawTiltedOrbitBand(pen, 0, 0, 38, 1.0, 1.6, 0.92, band4, () => true, false);
        drawTiltedOrbitBand(pen, 0, 0, 24, 1.0, 1.3, 0.88, band4, () => true, false);

        for (let k = 0; k < 12; k++) {
          const a = ph * 0.5 + (k * Math.PI) / 6;
          const rOut = k % 2 === 0 ? 38 : 31;
          const col = k % 3 === 0 ? borealis[5] : k % 2 === 0 ? cryo[6] : cryo[4];
          pen.line(0, 0, Math.cos(a) * rOut, Math.sin(a) * rOut, col, 0.9);
          const nx = Math.cos(a) * 38;
          const ny = Math.sin(a) * 38;
          if (k % 2 === 0) {
            pen.fillCircle(nx, ny, 2.2, PURE_WHITE, 0.95);
          }
        }
        drawSnowflakeStar(pen, 0, 0, 22, PURE_WHITE, borealis[5], 0.95, -ph);
      }
    };
  }
};

export const hoarfrostShatterNovaCell = {
  duration: 1.0,
  loop: false,
  defaults: { palette: GLACIAL_CRYO_PALETTE, seed: 347 },
  create(cfg) {
    const cryo = buildColorRamp(cfg.palette, 8);
    const borealis = buildColorRamp(BOREALIS_PRISM_PALETTE, 8);
    const band4 = [cryo[2], cryo[4], borealis[5], PURE_WHITE];

    return {
      step() {},
      renderFront(pen, localT) {
        const u = clamp01(localT);
        const pop = 0.45 + 0.55 * smoothStep(0, 0.25, u);
        const fade = 1 - smoothStep(0.68, 1.0, u);
        const env = (0.88 + 0.12 * smoothStep(0, 0.15, u)) * fade;
        if (env <= 0.02) return;

        const r = 38 * pop;
        drawTiltedOrbitBand(pen, 0, 0, r, 1.0, 1.7, 0.94 * env, band4, () => true, u < 0.25);
        drawTiltedOrbitBand(pen, 0, 0, r * 0.62, 1.0, 1.2, 0.85 * env, band4, () => true, false);
        drawSnowflakeStar(pen, 0, 0, r * 1.02, PURE_WHITE, borealis[5], 0.95 * env, u * 2.2);
        drawStarburstFlare(pen, 0, 0, r * 0.72, 0.88 * env, [cryo[3], cryo[5], borealis[5], PURE_WHITE]);
      }
    };
  }
};

// ============================================================================
// ROW 5 (`y = 1040`): AURORA BOREALIS SOVEREIGN SNOWFLAKE MANDALA
//   Grand 12-Point Sapphire-Cyan Crystalline Seal (`auroraSovereignMandalaCell`)
// ============================================================================
export const auroraSovereignMandalaCell = {
  duration: 1.0,
  loop: true,
  defaults: { palette: GLACIAL_CRYO_PALETTE, seed: 359 },
  create(cfg) {
    const cryo = buildColorRamp(cfg.palette, 8);
    const borealis = buildColorRamp(BOREALIS_PRISM_PALETTE, 8);
    const sapphireBand = [cryo[1], cryo[2], cryo[5], PURE_WHITE];
    const prismBand = [borealis[2], cryo[4], borealis[5], PURE_WHITE];

    return {
      step() {},
      renderBack(pen, localT) {
        const ph = localT * Math.PI * 2;
        // Stained-glass Borealis sapphire-cyan inner rose mandala
        pen.shadeBox(-26, -26, 26, 26, (lx, ly, out) => {
          const r = Math.hypot(lx, ly);
          if (r > 24) return 0;
          const ang = Math.atan2(ly, lx) + ph * 0.5;
          const petal = Math.abs(Math.cos(ang * 6));
          if (r > 17 + petal * 6.5) return 0;
          if (r > 15.5 + petal * 6.5) {
            out.color = cryo[0];
            out.alpha = 0.94;
            return out.color;
          }
          const sec = Math.floor(((ang + Math.PI * 4) / (Math.PI * 2)) * 12) % 12;
          out.color = sec % 3 === 0 ? borealis[3] : sec % 2 === 0 ? cryo[2] : cryo[4];
          out.alpha = 0.82;
          out.glowColor = sec % 3 === 0 ? borealis[5] : cryo[5];
          out.glowStrength = 0.3;
          return out.color;
        });
      },
      renderFront(pen, localT) {
        const ph = localT * Math.PI * 2;
        // Outer & mid concentric Sovereign Mandala circles
        drawTiltedOrbitBand(pen, 0, 0, 40, 1.0, 1.7, 0.95, sapphireBand, () => true, false);
        drawTiltedOrbitBand(pen, 0, 0, 31, 1.0, 1.3, 0.9, prismBand, () => true, false);

        // Interlocking 6-point sapphire-silver hexagram chords
        for (let tri = 0; tri < 2; tri++) {
          const baseRot = (tri === 0 ? ph : -ph) * 0.5 + tri * (Math.PI / 6);
          for (let k = 0; k < 3; k++) {
            const a0 = baseRot + (k * Math.PI * 2) / 3;
            const a1 = baseRot + (((k + 1) % 3) * Math.PI * 2) / 3;
            pen.line(
              Math.cos(a0) * 31,
              Math.sin(a0) * 31,
              Math.cos(a1) * 31,
              Math.sin(a1) * 31,
              tri === 0 ? cryo[6] : borealis[5],
              0.88
            );
          }
        }

        // Grand 12-Point Sapphire-Cyan Crystalline Snowflake Lances & Crown Finials
        for (let k = 0; k < 12; k++) {
          const a = ph * 0.5 + (k * Math.PI) / 6;
          const isMajor = k % 2 === 0;
          const rTip = isMajor ? 42 : 36;
          const col = isMajor ? PURE_WHITE : k % 3 === 0 ? borealis[5] : cryo[5];
          const tx = Math.cos(a) * rTip;
          const ty = Math.sin(a) * rTip;
          pen.line(0, 0, tx, ty, col, 0.95);

          // Herringbone snowflake barbs on all 12 points
          const bx = Math.cos(a) * (isMajor ? 27 : 22);
          const by = Math.sin(a) * (isMajor ? 27 : 22);
          for (const s of [-0.52, 0.52]) {
            pen.line(
              bx,
              by,
              bx + Math.cos(a + s) * 6.5,
              by + Math.sin(a + s) * 6.5,
              isMajor ? cryo[5] : borealis[4],
              0.86
            );
          }

          pen.fillCircle(tx, ty, isMajor ? 2.4 : 1.7, cryo[0], 0.95);
          pen.fillCircle(tx, ty, isMajor ? 1.6 : 1.1, isMajor ? PURE_WHITE : cryo[6], 1.0);
        }

        drawSnowflakeStar(pen, 0, 0, 17, PURE_WHITE, cryo[5], 0.98, -ph);
      }
    };
  }
};

// ============================================================================
// ROW 6 (`y = 1248`): ABSOLUTE ZERO CRYSTALLINE DIAMOND-COFFIN MONOLITH
//   Towering Translucent Faceted Diamond-Ice Prison Encasing the Frozen Target!
//   - `F00..F05`: Rapid upward flash-freeze crystallization
//   - `F06..F23`: Shimmering translucent hexagonal diamond-coffin prison
//   - `F24..F29`: Blazing cyan-white fracture fault-lines erupting before shatter!
// ============================================================================
export const diamondCoffinMonolithCell = {
  duration: 1.0,
  loop: false,
  defaults: { palette: GLACIAL_CRYO_PALETTE, seed: 373 },
  create(cfg) {
    const cryo = buildColorRamp(cfg.palette, 8);
    const borealis = buildColorRamp(BOREALIS_PRISM_PALETTE, 8);
    const baseBand = [cryo[1], cryo[3], cryo[5], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const crackChains = [
      buildLightningChain(rng, -18, -24, 17, 18, 0.16, 3),
      buildLightningChain(rng, 16, -28, -15, 22, 0.16, 3),
      buildLightningChain(rng, -4, -36, 4, 34, 0.12, 3)
    ];

    return {
      step() {},
      renderFront(pen, localT) {
        const u = clamp01(localT);
        const grow = smoothStep(0, 0.17, u);
        const crackAmt = smoothStep(0.78, 0.98, u);
        const baseY = 40;
        const coffinH = 81 * (0.38 + 0.62 * grow);
        const topY = baseY - coffinH;
        const midY = (baseY + topY) * 0.5;
        const maxHalfW = 26 * (0.7 + 0.3 * grow);

        // Basal permafrost crown ring behind coffin
        drawTiltedOrbitBand(pen, 0, baseY - 2, 35 * grow, 0.2, 1.5, 0.9, baseBand, BACK_HALF, false);

        // Flanking basal crystal Buttress Spires (left & right of the Diamond Coffin)
        for (const side of [-1, 1]) {
          const spOx = side * 24 * grow;
          const spTop = baseY - 34 * grow;
          pen.shadeBox(spOx - 8, spTop - 2, spOx + 8, baseY + 3, (lx, ly, out) => {
            if (ly < spTop || ly > baseY + 2) return 0;
            const hf = (baseY - ly) / Math.max(1, baseY - spTop);
            const hw = (1 - hf * 0.85) * 6.8;
            const dx = lx - (spOx + (baseY - ly) * side * 0.08);
            const ax = Math.abs(dx);
            if (ax > hw) return 0;
            if (ax > hw - 1.3) {
              out.color = cryo[0];
              out.alpha = 0.95;
              return out.color;
            }
            out.color = dx * side < 0 ? cryo[5] : cryo[2];
            out.alpha = 0.9;
            return out.color;
          });
        }

        // Towering Translucent Faceted Elongated-Hexagon Diamond-Coffin Prison
        pen.shadeBox(-30, topY - 2, 30, baseY + 4, (lx, ly, out) => {
          if (ly < topY || ly > baseY + 2) return 0;
          const vNorm = (ly - topY) / Math.max(1, coffinH); // 0 at apex, 1 at base
          let profile = 1.0;
          if (vNorm < 0.22) {
            profile = 0.12 + (vNorm / 0.22) * 0.88;
          } else if (vNorm > 0.82) {
            profile = Math.max(0.28, 1.0 - ((vNorm - 0.82) / 0.18) * 0.62);
          }
          const halfW = maxHalfW * profile;
          const ax = Math.abs(lx);
          if (ax > halfW) return 0;

          // 1. Crisp 1.5px dark obsidian-sapphire outer crystal silhouette & crown/pavilion girdle seams
          const innerRidgeW = halfW * 0.52;
          const isOuterBorder = ax > halfW - 1.5 || vNorm < 0.03 || vNorm > 0.97;
          const isGirdleSeam = Math.abs(vNorm - 0.22) < 0.016 || Math.abs(vNorm - 0.82) < 0.016;
          if (isOuterBorder) {
            out.color = cryo[0];
            out.alpha = 0.98;
            return out.color;
          }

          // 2. Crisp specular white/cyan geometric facet ridges (central spine + side bevels + girdle)
          const isSpine = ax < 1.15;
          const isBevelSeam = Math.abs(ax - innerRidgeW) < 0.9;
          if (isSpine || isBevelSeam || isGirdleSeam) {
            out.color = isSpine || crackAmt > 0.3 ? PURE_WHITE : cryo[6];
            out.alpha = 0.94;
            out.glowColor = cryo[5];
            out.glowStrength = 0.35 + crackAmt * 0.35;
            return out.color;
          }

          // 3. Diagonal Borealis specular shimmer sweeping down the diamond facets
          const diagBand = Math.sin(lx * 0.22 + ly * 0.18 - u * Math.PI * 4);
          const isWindow = ax < innerRidgeW && vNorm > 0.22 && vNorm < 0.82;

          if (isWindow) {
            // Translucent central stasis window so the frozen target remains visible inside the crystal!
            if (diagBand > 0.72) {
              out.color = PURE_WHITE;
              out.alpha = 0.82;
              out.glowColor = cryo[5];
              out.glowStrength = 0.28;
              return out.color;
            }
            const checker = ((Math.floor(lx) + Math.floor(ly)) & 1) === 0;
            out.color = lx < 0 ? (diagBand > 0.1 ? cryo[5] : cryo[4]) : diagBand > 0.2 ? borealis[4] : cryo[3];
            out.alpha = checker ? 0.56 : 0.36;
            return out.color;
          }

          // Outer solid beveled sapphire-cyan-amethyst crystal walls
          if (lx < 0) {
            out.color = vNorm < 0.22 ? cryo[6] : diagBand > 0.35 ? cryo[5] : cryo[3];
          } else {
            out.color = vNorm < 0.22 ? borealis[5] : diagBand > 0.35 ? borealis[3] : cryo[2];
          }
          out.alpha = 0.88;
          out.glowColor = lx < 0 ? cryo[4] : borealis[4];
          out.glowStrength = 0.2;
          return out.color;
        });

        // Apex crown diamond star & basal front ring
        drawSnowflakeStar(pen, 0, topY + 3, 8.5 * grow, PURE_WHITE, cryo[5], 0.92, u * Math.PI * 2);
        drawTiltedOrbitBand(pen, 0, baseY - 2, 35 * grow, 0.2, 1.6, 0.96, baseBand, FRONT_HALF, true);

        // Pre-shatter glowing fracture fault-lines (`F24..F29`)
        if (crackAmt > 0.02) {
          for (let i = 0; i < crackChains.length; i++) {
            pen.polyline(crackChains[i], i % 2 === 0 ? PURE_WHITE : borealis[5], crackAmt * 0.96);
          }
          drawStarburstFlare(pen, 0, midY, 22 * crackAmt, crackAmt * 0.9, [
            cryo[4],
            cryo[6],
            borealis[5],
            PURE_WHITE
          ]);
        }
      }
    };
  }
};

// ============================================================================
// ROW 7 (`y = 1456`): DIAMOND DUST PRISMATIC STARBURST SHATTER
//   Screen-Bursting Cyan-Sapphire-Violet Crystal Explosion (`diamondDustStarburstCell`)
// ============================================================================
export const diamondDustStarburstCell = {
  duration: 1.0,
  loop: false,
  defaults: { palette: GLACIAL_CRYO_PALETTE, seed: 389 },
  create(cfg) {
    const cryo = buildColorRamp(cfg.palette, 8);
    const borealis = buildColorRamp(BOREALIS_PRISM_PALETTE, 8);
    const prismBand = [cryo[2], cryo[5], borealis[5], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);

    const shards = Array.from({ length: 16 }, (_, i) => {
      const ang = (i / 16) * Math.PI * 2 + rng.between(-0.1, 0.1);
      return {
        ang,
        maxDist: rng.between(24, 41),
        len: rng.between(4.8, 7.6),
        wid: rng.between(2.4, 3.8),
        spin0: rng.between(0, Math.PI * 2),
        spinVel: rng.sign() * rng.between(3.5, 7.2),
        isViolet: i % 3 === 0
      };
    });

    const dust = Array.from({ length: 24 }, (_, i) => {
      const ang = (i / 24) * Math.PI * 2 + 0.13;
      return {
        ang,
        r0: rng.between(4, 14),
        r1: rng.between(26, 43),
        colIdx: i % 3
      };
    });

    return {
      step() {},
      renderFront(pen, localT) {
        const u = clamp01(localT);
        const expand = 1 - Math.pow(1 - clamp01(u / 0.82), 2.4);
        const fade = 1 - smoothStep(0.68, 1.0, u);
        if (fade <= 0.02) return;

        // 1. Expanding Prismatic Shockwave Rings (Cyan + Sapphire + Borealis Violet)
        const ringR = 10 + 32 * expand;
        drawTiltedOrbitBand(pen, 0, 0, ringR, 1.0, 1.8, 0.95 * fade, prismBand, () => true, u < 0.22);
        if (u > 0.08) {
          drawTiltedOrbitBand(
            pen,
            0,
            0,
            ringR * 0.66,
            1.0,
            1.3,
            0.85 * fade,
            [borealis[2], borealis[4], cryo[5], PURE_WHITE],
            () => true,
            false
          );
        }

        // 2. Central Prismatic Starburst Singularity Flash (`F00..F16`)
        const flashFade = 1 - smoothStep(0.05, 0.58, u);
        if (flashFade > 0.02) {
          const flareR = (18 + 24 * smoothStep(0, 0.25, u)) * flashFade;
          drawStarburstFlare(pen, 0, 0, flareR, 0.96 * flashFade, [
            cryo[2],
            cryo[5],
            borealis[5],
            PURE_WHITE
          ]);
          drawSnowflakeStar(pen, 0, 0, flareR * 0.95, PURE_WHITE, borealis[5], 0.95 * flashFade, u * 3.0);
        }

        // 3. 16 Radially Exploding Faceted Diamond-Ice Crystal Shards
        for (let i = 0; i < shards.length; i++) {
          const sh = shards[i];
          const dist = 4 + sh.maxDist * expand;
          const sx = Math.cos(sh.ang) * dist;
          const sy = Math.sin(sh.ang) * dist;
          const rot = sh.spin0 + u * sh.spinVel;
          const ca = Math.cos(rot);
          const sa = Math.sin(rot);
          const scale = (1 - smoothStep(0.55, 1.0, u) * 0.55);
          const L = sh.len * scale;
          const W = sh.wid * scale;
          if (L < 1.2) continue;

          const bound = Math.ceil(Math.max(L, W)) + 2;
          pen.shadeBox(sx - bound, sy - bound, sx + bound, sy + bound, (lx, ly, out) => {
            const dx = lx - sx;
            const dy = ly - sy;
            const ru = dx * ca + dy * sa;
            const rv = -dx * sa + dy * ca;
            const d = Math.abs(ru) / L + Math.abs(rv) / W;
            if (d > 1.0) return 0;
            if (d > 0.74) {
              out.color = cryo[0];
              out.alpha = 0.96 * fade;
              return out.color;
            }
            if (d < 0.28) {
              out.color = PURE_WHITE;
              out.alpha = fade;
              out.glowColor = sh.isViolet ? borealis[5] : cryo[5];
              out.glowStrength = 0.4 * fade;
              return out.color;
            }
            out.color = sh.isViolet
              ? rv < 0
                ? borealis[5]
                : borealis[3]
              : rv < 0
                ? cryo[6]
                : cryo[3];
            out.alpha = 0.94 * fade;
            return out.color;
          });
        }

        // 4. Sparkling Diamond Dust Aurora Motes (`F06..F29`)
        for (let i = 0; i < dust.length; i++) {
          const dm = dust[i];
          const dr = dm.r0 + (dm.r1 - dm.r0) * smoothStep(0.05, 0.95, u);
          const dx = Math.cos(dm.ang + u * 0.45) * dr;
          const dy = Math.sin(dm.ang + u * 0.45) * dr;
          const twinkle = 0.55 + 0.45 * Math.sin(u * 22 + i * 1.7);
          const col = dm.colIdx === 0 ? PURE_WHITE : dm.colIdx === 1 ? cryo[5] : borealis[5];
          pen.stipple(dx, dy, col, fade * twinkle);
          if (i % 4 === 0 && fade * twinkle > 0.5) {
            pen.line(dx - 2, dy, dx + 2, dy, PURE_WHITE, fade * 0.85);
            pen.line(dx, dy - 2, dx, dy + 2, col, fade * 0.85);
          }
        }
      }
    };
  }
};

export const GLACIAL_EFFECT_REGISTRY = {
  cryoScepterFocus,
  cryoPrismMachCone,
  permafrostSnowflakeSigil,
  glacialSkateRibbon,
  refractedBorealisBeam,
  absoluteZeroShatterBurst,
  borealisCathedralDomain,
  absoluteZeroAuroraVeil,
  diamondDustCataclysmNova,
  cryoShardBoltCell,
  hexCryoPrismMirrorCell,
  facetedGlacierMonolithCell,
  borealisRoseMandalaCell,
  hoarfrostShatterNovaCell,
  auroraSovereignMandalaCell,
  diamondCoffinMonolithCell,
  diamondDustStarburstCell
};
