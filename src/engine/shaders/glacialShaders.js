/**
 * Winter Empress & Absolute Zero Borealis Shader Suite (`glacialShaders.js`)
 * First-party 120Hz 2.5D pixel-shader & particle effects for Lyra (`icemage` / `IceMage.js`).
 *
 * Powers both:
 *   1. Live 120Hz `ArcaneShaderFX` (`back` + `front` 2.5D depth wraps around Lyra, Glacier Jaws,
 *      Coronation Ice-Swords & Absolute Zero Entombment — 0 shadeBox / viewport border clips!)
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
} from '../ArcaneShaderFX.js?v=30fps72';

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
  if (r <= 0.8 || alpha <= 0.02) return;
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
  pen.radialGlow(cx, cy, r * 0.82, mainCol, 0.28 * alpha);
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
        acc += dt * 44;
        while (acc >= 1 && t < 0.26) {
          acc -= 1;
          const a = rng.between(0, Math.PI * 2);
          const dist = rng.between(8, 15);
          motes.emit(
            'glint',
            Math.cos(a) * dist,
            Math.sin(a) * dist,
            -Math.cos(a) * 36,
            -Math.sin(a) * 36,
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
        const r = 5 + 5.5 * smoothStep(0, 0.7, u);
        drawTiltedOrbitBand(
          pen,
          0,
          0,
          r * 1.25,
          0.45,
          1.1,
          0.84 * env,
          [cryo[2], cryo[4], borealis[5], PURE_WHITE],
          () => true,
          false
        );
        drawSnowflakeStar(pen, 0, 0, r * 1.35, cryo[5], borealis[5], env, u * 4.2);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 2. CRYO-LANCE MACH-CONE (`cryoPrismMachCone`)
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
          for (let i = 0; i < (cfg.empowered ? 14 : 10); i++) {
            const a = base + rng.between(-0.52, 0.52);
            const spd = rng.between(44, 120);
            motes.emit(
              i % 3 === 0 ? 'glint' : 'streak',
              0,
              0,
              Math.cos(a) * spd,
              Math.sin(a) * spd,
              rng.between(0.14, 0.24),
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
        const reach = (cfg.empowered ? 24 : 19) * smoothStep(0, 0.55, u);

        for (let k = 0; k < 2; k++) {
          const d = (k + 0.5) * reach * 0.55;
          const rx = ca * d;
          const ry = sa * d;
          const rr = (cfg.empowered ? 12 : 9.5) * (1 - k * 0.22) * (0.45 + 0.55 * u);
          for (let s = 0; s < 18; s++) {
            const th = (s / 18) * Math.PI * 2 + u * 3.5;
            const lx = Math.cos(th) * rr * 0.35;
            const ly = Math.sin(th) * rr;
            const px = rx + lx * ca - ly * sa;
            const py = ry + lx * sa + ly * ca;
            pen.stipple(px, py, s % 3 === 0 ? PURE_WHITE : k === 0 ? cryo[5] : borealis[5], fade * 0.9);
          }
        }
        drawSnowflakeStar(
          pen,
          0,
          0,
          (cfg.empowered ? 11.5 : 9) * fade,
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
// 3. 2.5D PERMAFROST MIRROR RINK SIGIL (`permafrostSnowflakeSigil`)
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
        acc += dt * 12;
        const rx = Math.min(62, Math.max(24, (cfg.radiusWorld || 155) / 3));
        while (acc >= 1) {
          acc -= 1;
          const a = rng.between(0, Math.PI * 2);
          const r = rng.between(4, rx * 0.85);
          motes.emit(
            'glint',
            Math.cos(a) * r,
            Math.sin(a) * r * 0.21 - 1,
            rng.between(-5, 5),
            rng.between(-20, -8),
            rng.between(0.24, 0.44),
            rng.chance(0.4) ? borealis[5] : cryo[5],
            1,
            0
          );
        }
        motes.step(dt);
      },
      renderBack(pen) {
        const rx = Math.min(62, Math.max(24, (cfg.radiusWorld || 155) / 3));
        drawTiltedOrbitBand(pen, 0, 0, rx, 0.21, 1.3, 0.8, band4, BACK_HALF, false);
        drawTiltedOrbitBand(pen, 0, 0, rx * 0.58, 0.21, 1.0, 0.7, band4, BACK_HALF, false);
      },
      renderFront(pen) {
        const rx = Math.min(62, Math.max(24, (cfg.radiusWorld || 155) / 3));
        drawTiltedOrbitBand(pen, 0, 0, rx, 0.21, 1.4, 0.88, band4, FRONT_HALF, false);
        drawTiltedOrbitBand(pen, 0, 0, rx * 0.58, 0.21, 1.1, 0.76, band4, FRONT_HALF, false);

        for (let k = 0; k < 6; k++) {
          const a = phase * 0.8 + (k * Math.PI) / 3;
          if (Math.sin(a) < 0) continue;
          pen.line(
            Math.cos(a) * rx * 0.3,
            Math.sin(a) * rx * 0.3 * 0.21,
            Math.cos(a) * rx,
            Math.sin(a) * rx * 0.21,
            k % 2 === 0 ? cryo[5] : borealis[5],
            0.8
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
        acc += dt * 36;
        while (acc >= 1) {
          acc -= 1;
          motes.emit(
            rng.chance(0.45) ? 'glint' : 'streak',
            rng.between(-8, 4),
            rng.between(-12, 4),
            rng.between(-75, -26),
            rng.between(-14, 10),
            rng.between(0.14, 0.28),
            rng.chance(0.4) ? borealis[5] : cryo[5],
            1,
            0
          );
        }
        motes.step(dt);
      },
      renderBack(pen) {
        pen.radialGlow(-3, -4, 10, cryo[4], 0.22);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 5. REFRACTED BOREALIS LIGHT-CHORD (`refractedBorealisBeam`)
// ============================================================================
export const refractedBorealisBeam = {
  duration: 0.4,
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
        const u = clamp01(t / 0.4);
        const fade = 1 - u;
        if (fade <= 0.02) return;
        const ex = (cfg.dx || 90) / 3;
        const ey = (cfg.dy || 0) / 3;
        const mainCol = cfg.magenta ? borealis[5] : cryo[5];
        const subCol = cfg.magenta ? cryo[5] : borealis[5];

        pen.line(0, 0, ex, ey, mainCol, fade * 0.85);
        pen.line(0, -1, ex, ey - 1, PURE_WHITE, fade * 0.94);
        pen.line(0, 1, ex, ey + 1, mainCol, fade * 0.72);

        const helix = buildLightningChain(rng, 0, 0, ex, ey, 0.06, 3);
        pen.polyline(helix, subCol, fade * 0.8);

        drawSnowflakeStar(pen, 0, 0, 6 * fade, mainCol, subCol, fade, u * 4);
        drawSnowflakeStar(pen, ex, ey, 7 * fade, PURE_WHITE, mainCol, fade, -u * 4);
      }
    };
  }
};

// ============================================================================
// 6. 2.5D HOARFROST SHATTER NOVA (`absoluteZeroShatterBurst`)
// ============================================================================
export const absoluteZeroShatterBurst = {
  duration: 0.44,
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
          const cnt = cfg.isLarge ? 20 : 12;
          for (let i = 0; i < cnt; i++) {
            const a = rng.between(0, Math.PI * 2);
            const spd = rng.between(42, cfg.isLarge ? 145 : 112);
            motes.emit(
              i % 2 === 0 ? 'glint' : 'spark',
              0,
              0,
              Math.cos(a) * spd,
              Math.sin(a) * spd,
              rng.between(0.16, 0.32),
              i % 2 === 0 ? cryo[5] : borealis[5],
              cfg.isLarge ? 1.2 : 1.0,
              40
            );
          }
        }
        t += dt;
        motes.step(dt);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.44);
        const fade = 1 - u;
        if (fade <= 0.02) return;
        const maxR = cfg.isLarge ? 32 : 20;
        const r = maxR * smoothStep(0, 0.65, u);
        drawTiltedOrbitBand(pen, 0, 0, r, 0.85, 1.4, fade * 0.9, band4, () => true, u < 0.24);
        drawSnowflakeStar(pen, 0, 0, maxR * 0.92 * fade, cryo[5], borealis[5], fade, u * 2.8);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 7. 2.5D BLIZZARD JAWS VORTEX (`blizzardJawsVortex`)
//    Powers `SKILL` ("GLACIAL JAWS: TWIN ICEBERG CRUSH") — swirling sub-zero
//    snow-squall pulling enemies between the two flanking Glacier Icebergs!
// ============================================================================
export const blizzardJawsVortex = {
  duration: 0.78,
  loop: false,
  defaults: { palette: GLACIAL_CRYO_PALETTE, seed: 113 },
  create(cfg) {
    const cryo = buildColorRamp(cfg.palette, 8);
    const borealis = buildColorRamp(BOREALIS_PRISM_PALETTE, 8);
    const band4 = [cryo[2], cryo[5], borealis[5], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, cryo[6], borealis[5], cryo[4]], floorY: 0 });
    let t = 0;
    let acc = 0;

    return {
      step(dt) {
        t += dt;
        acc += dt * 42;
        while (acc >= 1 && t < 0.56) {
          acc -= 1;
          const a = rng.between(0, Math.PI * 2);
          const rad = rng.between(26, 52);
          motes.emit(
            rng.chance(0.5) ? 'glint' : 'streak',
            Math.cos(a) * rad,
            -26 + Math.sin(a) * 18,
            -Math.cos(a) * 78,
            -Math.sin(a) * 32,
            0.22,
            rng.chance(0.4) ? borealis[5] : cryo[5],
            1.05,
            0
          );
        }
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 0.78);
        const env = smoothStep(0, 0.14, u) * (1 - smoothStep(0.75, 1.0, u));
        if (env <= 0.02) return;
        const shrink = 1 - 0.52 * smoothStep(0.18, 0.72, u);
        drawTiltedOrbitBand(pen, 0, -2, 54 * shrink, 0.22, 1.5, 0.86 * env, band4, BACK_HALF, false);
        drawTiltedOrbitBand(pen, 0, -28, 42 * shrink, 0.24, 1.2, 0.78 * env, band4, BACK_HALF, false);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.78);
        const env = smoothStep(0, 0.14, u) * (1 - smoothStep(0.75, 1.0, u));
        if (env <= 0.02) return;
        const shrink = 1 - 0.52 * smoothStep(0.18, 0.72, u);
        drawTiltedOrbitBand(pen, 0, -2, 54 * shrink, 0.22, 1.6, 0.94 * env, band4, FRONT_HALF, u > 0.62);
        drawTiltedOrbitBand(pen, 0, -28, 42 * shrink, 0.24, 1.3, 0.85 * env, band4, FRONT_HALF, false);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 8. 2.5D CORONATION SWORD FLOOR IMPALEMENT (`coronationSwordImpact`)
//    Crisp icy shock-ring & vertical frost-geyser when a Celestial Ice-Sword
//    impales into the arena floor during `ULTIMATE`!
// ============================================================================
export const coronationSwordImpact = {
  duration: 0.42,
  loop: false,
  defaults: { palette: GLACIAL_CRYO_PALETTE, seed: 127, isCenter: false },
  create(cfg) {
    const cryo = buildColorRamp(cfg.palette, 8);
    const borealis = buildColorRamp(BOREALIS_PRISM_PALETTE, 8);
    const band4 = [cryo[2], cryo[5], borealis[5], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, cryo[6], borealis[5], cryo[4]], floorY: 0 });
    let t = 0;
    let burstDone = false;

    return {
      step(dt) {
        if (!burstDone) {
          burstDone = true;
          const n = cfg.isCenter ? 18 : 10;
          for (let i = 0; i < n; i++) {
            const vx = rng.between(-52, 52);
            const vy = rng.between(-135, -45);
            motes.emit(
              i % 2 === 0 ? 'glint' : 'streak',
              rng.between(-5, 5),
              -2,
              vx,
              vy,
              rng.between(0.18, 0.34),
              i % 3 === 0 ? PURE_WHITE : i % 2 === 0 ? cryo[5] : borealis[5],
              1.1,
              140
            );
          }
        }
        t += dt;
        motes.step(dt);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.42);
        const fade = 1 - u;
        if (fade <= 0.02) return;
        const rx = (cfg.isCenter ? 46 : 26) * smoothStep(0, 0.48, u);
        drawTiltedOrbitBand(pen, 0, -1, rx, 0.22, 1.5, 0.94 * fade, band4, () => true, u < 0.25);
        const plumeH = (cfg.isCenter ? 38 : 24) * (1 - u * 0.55);
        pen.line(0, 0, 0, -plumeH, PURE_WHITE, fade * 0.95);
        pen.line(-2, 0, -1, -plumeH * 0.78, cryo[5], fade * 0.8);
        pen.line(2, 0, 1, -plumeH * 0.78, borealis[5], fade * 0.8);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 9. 2.5D WINTER CORONATION PALACE DOMAIN (`borealisCathedralDomain`)
// ============================================================================
export const borealisCathedralDomain = {
  duration: 1.55,
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
        acc += dt * 32;
        while (acc >= 1 && t < 1.32) {
          acc -= 1;
          motes.emit(
            rng.chance(0.5) ? 'glint' : 'spark',
            rng.between(-64, 64),
            rng.between(-96, -10),
            rng.between(-16, 16),
            rng.between(14, 42),
            rng.between(0.22, 0.42),
            rng.chance(0.45) ? borealis[5] : cryo[5],
            1.05,
            16
          );
        }
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 1.55);
        const pop = smoothStep(0, 0.14, u);
        const fade = 1 - smoothStep(0.82, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;

        for (let i = -8; i <= 8; i++) {
          const rx = i * 8;
          const wave = Math.sin(u * 8.5 + i * 0.55) * 5;
          const yTop = -112 + wave;
          const yBot = -58 + wave;
          const col = i % 3 === 0 ? borealis[5] : i % 2 === 0 ? cryo[5] : cryo[4];
          pen.line(rx, yTop, rx, yBot, col, 0.54 * env);
          if (i % 2 === 0) {
            pen.line(rx, yTop + 5, rx, yTop + 20, PURE_WHITE, 0.64 * env);
          }
        }

        drawTiltedOrbitBand(pen, 0, -2, 72 * pop, 0.21, 1.6, 0.88 * env, band4, BACK_HALF, false);
        drawTiltedOrbitBand(pen, 0, -2, 44 * pop, 0.21, 1.2, 0.8 * env, band4, BACK_HALF, false);
      },
      renderFront(pen) {
        const u = clamp01(t / 1.55);
        const pop = smoothStep(0, 0.14, u);
        const fade = 1 - smoothStep(0.82, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;

        drawTiltedOrbitBand(pen, 0, -2, 72 * pop, 0.21, 1.8, 0.95 * env, band4, FRONT_HALF, true);
        drawTiltedOrbitBand(pen, 0, -2, 44 * pop, 0.21, 1.3, 0.86 * env, band4, FRONT_HALF, false);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 10. 2.5D ABSOLUTE ZERO SANCTUARY RINGS (`absoluteZeroAuroraVeil`)
//     Powers `TRUE_ULTIMATE` Acts I–III around the Entombed Diamond Monolith!
//     (Strictly bounded inside viewport so 0/4 borders ever clip!)
// ============================================================================
export const absoluteZeroAuroraVeil = {
  duration: 3.35,
  loop: false,
  defaults: { palette: GLACIAL_CRYO_PALETTE, seed: 149, customDuration: 3.35 },
  create(cfg) {
    const dur = cfg.customDuration || 3.35;
    const cryo = buildColorRamp(cfg.palette, 8);
    const borealis = buildColorRamp(BOREALIS_PRISM_PALETTE, 8);
    const band4 = [cryo[2], cryo[5], borealis[5], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, cryo[6], borealis[5], cryo[4]], floorY: 0 });
    let t = 0;
    let acc = 0;

    return {
      step(dt) {
        t += dt;
        acc += dt * 36;
        while (acc >= 1 && t < dur - 0.18) {
          acc -= 1;
          motes.emit(
            rng.chance(0.55) ? 'glint' : 'spark',
            rng.between(-76, 76),
            rng.between(-105, -8),
            rng.between(-18, 18),
            rng.between(10, 34),
            rng.between(0.24, 0.44),
            rng.chance(0.38) ? borealis[5] : rng.chance(0.5) ? PURE_WHITE : cryo[5],
            1.1,
            8
          );
        }
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / dur);
        const pop = smoothStep(0, 0.1, u);
        const fade = 1 - smoothStep(0.9, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;

        drawTiltedOrbitBand(pen, 0, -2, 82 * pop, 0.2, 1.7, 0.88 * env, band4, BACK_HALF, false);
        drawTiltedOrbitBand(pen, 0, -2, 52 * pop, 0.2, 1.3, 0.82 * env, band4, BACK_HALF, false);
      },
      renderFront(pen) {
        const u = clamp01(t / dur);
        const pop = smoothStep(0, 0.1, u);
        const fade = 1 - smoothStep(0.9, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;

        drawTiltedOrbitBand(pen, 0, -2, 82 * pop, 0.2, 1.9, 0.96 * env, band4, FRONT_HALF, true);
        drawTiltedOrbitBand(pen, 0, -2, 52 * pop, 0.2, 1.4, 0.88 * env, band4, FRONT_HALF, false);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 11. 2.5D DIAMOND DUST CATACLYSM NOVA (`diamondDustCataclysmNova`)
//     Triggered at `t = 3.30s` when Lyra taps her Frost-Lance Scepter!
// ============================================================================
export const diamondDustCataclysmNova = {
  duration: 0.88,
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
          for (let i = 0; i < 32; i++) {
            const a = (i / 32) * Math.PI * 2 + rng.between(-0.08, 0.08);
            const spd = rng.between(58, 175);
            motes.emit(
              i % 3 === 0 ? 'streak' : 'glint',
              0,
              0,
              Math.cos(a) * spd,
              Math.sin(a) * spd * 0.72,
              rng.between(0.24, 0.48),
              i % 3 === 0 ? PURE_WHITE : i % 2 === 0 ? cryo[5] : borealis[5],
              1.25,
              24
            );
          }
        }
        t += dt;
        motes.step(dt);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.88);
        const fade = 1 - smoothStep(0.35, 1.0, u);
        if (fade <= 0.02) return;
        const r = 56 * smoothStep(0, 0.45, u);
        drawTiltedOrbitBand(pen, 0, 0, r, 0.65, 1.9, 0.95 * fade, band4, () => true, u < 0.24);
        drawTiltedOrbitBand(pen, 0, 0, r * 0.6, 0.65, 1.3, 0.86 * fade, band4, () => true, false);
        drawStarburstFlare(pen, 0, 0, 38 * fade, 0.95 * fade, [cryo[3], cryo[5], borealis[5], PURE_WHITE]);
        drawSnowflakeStar(pen, 0, 0, 42 * fade, PURE_WHITE, borealis[5], 0.92 * fade, u * 3.2);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// BAKED 30FPS `icemage_vfx.png` 8-ROW CELLS (`104x104` logical -> `208x208` crisp 2x)
//   Row 0 (`y=0`):    Faceted Borealis Cryo-Lance Comet (`cryoShardBoltCell`)
//   Row 1 (`y=208`):  Spinning 6-Bladed Snowflake Chakram Halo (`hexCryoPrismMirrorCell`)
//   Row 2 (`y=416`):  Erupting Jagged Glacier Iceberg Wall (`facetedGlacierMonolithCell`)
//   Row 3 (`y=624`):  Stained-Glass Winter Palace Crest (`borealisRoseMandalaCell`)
//   Row 4 (`y=832`):  Giant Celestial Coronation Ice-Claymore (`celestialIceSwordCell`)
//   Row 5 (`y=1040`): Celestial Aurora Astrolabe & Winter Moon (`auroraSovereignMandalaCell`)
//   Row 6 (`y=1248`): Absolute Zero Diamond-Lotus Prison (`diamondCoffinMonolithCell`)
//   Row 7 (`y=1456`): Cataclysmic 8-Point Ice-Glass Starburst (`diamondDustStarburstCell`)
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
        acc += dt * 40;
        while (acc >= 1) {
          acc -= 1;
          motes.emit(
            'glint',
            rng.between(-8, 12),
            rng.between(-7, 7),
            rng.between(-70, -24),
            rng.between(-10, 10),
            0.22,
            rng.chance(0.45) ? borealis[5] : cryo[5],
            1,
            0
          );
        }
        motes.step(dt);
      },
      renderFront(pen, localT) {
        const ph = localT * Math.PI * 2;
        const tipX = 29;
        const tailX = -32;

        // Faceted Diamond-Spearhead Cryo-Lance pointing `+X`
        pen.shadeBox(tailX - 5, -20, tipX + 5, 20, (lx, ly, out) => {
          const u = (lx - tailX) / (tipX - tailX);
          if (u < 0 || u > 1) return 0;
          const halfH = u < 0.66 ? (u / 0.66) * 12.0 : ((1 - u) / 0.34) * 12.0;
          const ay = Math.abs(ly);
          if (ay > halfH) return 0;

          if (ay > halfH - 1.6) {
            out.color = cryo[0];
            out.alpha = 0.98;
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
          const shimmer = Math.sin(u * 12 - ph * 2) > 0.22;
          out.color = upperFacet ? (shimmer ? cryo[6] : cryo[5]) : shimmer ? borealis[5] : cryo[3];
          out.alpha = 0.96;
          out.glowColor = upperFacet ? cryo[5] : borealis[5];
          out.glowStrength = 0.25;
          return out.color;
        });

        drawSnowflakeStar(pen, 7, 0, 11, cryo[6], borealis[5], 0.92, ph);
        motes.render(pen);
      }
    };
  }
};

// ROW 1 (`y = 208`): SPINNING 6-BLADED SNOWFLAKE CHAKRAM / PRISM HALO
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
        drawTiltedOrbitBand(pen, 0, 0, 32, 0.36, 1.3, 0.82, band4, BACK_HALF, false);

        // 6-Bladed Beveled Crystalline Snowflake Chakram
        pen.shadeBox(-36, -36, 36, 36, (lx, ly, out) => {
          const r = Math.hypot(lx, ly);
          if (r > 31) return 0;
          const ang = Math.atan2(ly, lx) + ph;
          const sectorAng = ((ang % (Math.PI / 3)) + Math.PI / 3) % (Math.PI / 3) - Math.PI / 6;
          // Star-blade outer contour: 6 swept razor points + inner ring
          const bladeReach = 15 + Math.pow(Math.max(0, Math.cos(sectorAng * 3)), 1.35) * 15.5;
          if (r > bladeReach) return 0;
          if (r > 7.5 && r < 11.2 && Math.abs(sectorAng) > 0.16) return 0; // open crystalline cutout slots!

          if (r > bladeReach - 1.7) {
            out.color = cryo[0];
            out.alpha = 0.98;
            return out.color;
          }
          if (r < 6.0) {
            out.color = r < 3.2 ? PURE_WHITE : borealis[5];
            out.alpha = 1;
            out.glowColor = borealis[5];
            out.glowStrength = 0.48;
            return out.color;
          }
          if (Math.abs(sectorAng) < 0.07) {
            out.color = PURE_WHITE;
            out.alpha = 0.98;
            out.glowColor = cryo[5];
            out.glowStrength = 0.35;
            return out.color;
          }
          const secIdx = Math.floor(((ang + Math.PI * 4) / (Math.PI / 3))) % 6;
          out.color =
            sectorAng < 0
              ? secIdx % 2 === 0
                ? cryo[6]
                : borealis[6]
              : secIdx % 2 === 0
                ? cryo[3]
                : borealis[4];
          out.alpha = 0.95;
          out.glowColor = secIdx % 2 === 0 ? cryo[5] : borealis[5];
          out.glowStrength = 0.25;
          return out.color;
        });
      },
      renderFront(pen, localT) {
        const ph = localT * Math.PI * 2;
        drawTiltedOrbitBand(pen, 0, 0, 32, 0.36, 1.4, 0.92, band4, FRONT_HALF, true);
        drawSnowflakeStar(pen, 0, 0, 14, PURE_WHITE, borealis[5], 0.9, -ph);
      }
    };
  }
};

// ROW 2 (`y = 416`): ERUPTING JAGGED GLACIER ICEBERG WALL (`F00..F21`) & SHATTER (`F22..F29`)
export const facetedGlacierMonolithCell = {
  duration: 1.0,
  loop: false,
  defaults: { palette: GLACIAL_CRYO_PALETTE, seed: 323 },
  create(cfg) {
    const cryo = buildColorRamp(cfg.palette, 8);
    const borealis = buildColorRamp(BOREALIS_PRISM_PALETTE, 8);
    const band4 = [cryo[1], cryo[3], cryo[5], PURE_WHITE];
    const spires = [
      { ox: -17, tilt: -0.22, hScale: 0.58, wScale: 0.45 },
      { ox: 17, tilt: 0.22, hScale: 0.6, wScale: 0.45 },
      { ox: -9.5, tilt: -0.11, hScale: 0.8, wScale: 0.6 },
      { ox: 9.5, tilt: 0.11, hScale: 0.82, wScale: 0.6 },
      { ox: 0, tilt: 0.0, hScale: 1.0, wScale: 0.76 }
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

            pen.shadeBox(-42, topY - 4, 42, baseY + 8, (lx, ly, out) => {
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
                out.color = hFrac > 0.62 ? PURE_WHITE : cryo[6];
                out.alpha = 0.98;
                out.glowColor = cryo[5];
                out.glowStrength = 0.3;
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
                    ? sIdx === 4
                      ? borealis[4]
                      : cryo[3]
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

// ROW 3 (`y = 624`): STAINED-GLASS WINTER PALACE SOVEREIGN CREST
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
      renderBack(pen, localT) {
        const ph = localT * Math.PI * 2;
        pen.shadeBox(-38, -38, 38, 38, (lx, ly, out) => {
          const r = Math.hypot(lx, ly);
          if (r > 33) return 0;
          const ang = Math.atan2(ly, lx) - ph * 0.5;
          const lotus = Math.abs(Math.cos(ang * 3));
          const maxR = 21 + lotus * 11.5;
          if (r > maxR) return 0;
          if (r > maxR - 1.5) {
            out.color = cryo[0];
            out.alpha = 0.92;
            return out.color;
          }
          const sec = Math.floor(((ang + Math.PI * 4) / (Math.PI * 2)) * 12) % 12;
          out.color = sec % 3 === 0 ? borealis[3] : sec % 2 === 0 ? cryo[2] : cryo[4];
          out.alpha = 0.72;
          return out.color;
        });
      },
      renderFront(pen, localT) {
        const ph = localT * Math.PI * 2;
        drawTiltedOrbitBand(pen, 0, 0, 36, 1.0, 1.5, 0.92, band4, () => true, false);
        for (let k = 0; k < 12; k++) {
          const a = ph * 0.5 + (k * Math.PI) / 6;
          const rOut = k % 2 === 0 ? 38 : 30;
          const col = k % 3 === 0 ? borealis[5] : k % 2 === 0 ? cryo[6] : cryo[4];
          pen.line(0, 0, Math.cos(a) * rOut, Math.sin(a) * rOut, col, 0.92);
          if (k % 2 === 0) {
            pen.fillCircle(Math.cos(a) * 38, Math.sin(a) * 38, 2.2, PURE_WHITE, 0.96);
          }
        }
        drawSnowflakeStar(pen, 0, 0, 22, PURE_WHITE, borealis[5], 0.95, -ph);
      }
    };
  }
};

// ROW 4 (`y = 832`): GIANT CELESTIAL CORONATION ICE-CLAYMORE / ICICLE LANCE (pointing `+Y` down!)
//   Powers Lyra's Overdrive Ultimate ("WINTER CORONATION: SEVEN CELESTIAL ICE-SWORDS")!
export const celestialIceSwordCell = {
  duration: 1.0,
  loop: true,
  defaults: { palette: GLACIAL_CRYO_PALETTE, seed: 347 },
  create(cfg) {
    const cryo = buildColorRamp(cfg.palette, 8);
    const borealis = buildColorRamp(BOREALIS_PRISM_PALETTE, 8);

    return {
      step() {},
      renderFront(pen, localT) {
        const ph = localT * Math.PI * 2;
        const pomY = -41;
        const guardY = -20;
        const tipY = 43;

        // 1. Pommel Crown Star & Outlined Hilt
        pen.shadeBox(-28, pomY - 5, 28, tipY + 4, (lx, ly, out) => {
          // Hilt & Pommel (`pomY .. guardY`)
          if (ly >= pomY - 3 && ly < guardY - 2) {
            const dyPom = ly - pomY;
            const dPom = Math.abs(lx) / 4.8 + Math.abs(dyPom) / 4.8;
            if (dPom <= 1.0) {
              out.color = dPom > 0.72 ? cryo[0] : dPom < 0.34 ? PURE_WHITE : borealis[5];
              out.alpha = 0.98;
              return out.color;
            }
            if (Math.abs(lx) <= 2.6 && ly >= pomY + 2) {
              out.color = Math.abs(lx) > 1.3 ? cryo[0] : cryo[6];
              out.alpha = 0.98;
              return out.color;
            }
            return 0;
          }

          // Swept Crystalline Winged Snowflake Cross-Guard (`ly` near `guardY`)
          const wingY = guardY - Math.abs(lx) * 0.22;
          if (Math.abs(lx) <= 23 && Math.abs(ly - wingY) <= 4.4 * (1 - Math.abs(lx) / 28)) {
            const edge = Math.abs(ly - wingY) > 2.7 * (1 - Math.abs(lx) / 28) || Math.abs(lx) > 21.2;
            out.color = edge ? cryo[0] : Math.abs(ly - wingY) < 1.1 ? PURE_WHITE : lx < 0 ? cryo[5] : borealis[5];
            out.alpha = 0.98;
            if (!edge) {
              out.glowColor = cryo[5];
              out.glowStrength = 0.3;
            }
            return out.color;
          }

          // Beveled Faceted Crystal Greatsword Blade (`guardY .. tipY`)
          if (ly >= guardY - 1 && ly <= tipY) {
            const v = (ly - guardY) / (tipY - guardY); // 0 at guard, 1 at tip
            // Regal broad-shouldered crystal claymore taper with ricasso flare at v = 0.16
            let halfW;
            if (v < 0.16) {
              halfW = 7.5 + (v / 0.16) * 3.8;
            } else if (v < 0.68) {
              halfW = 11.3 - ((v - 0.16) / 0.52) * 3.2;
            } else {
              halfW = Math.max(0.6, (1 - (v - 0.68) / 0.32) * 8.1);
            }
            const ax = Math.abs(lx);
            if (ax > halfW) return 0;

            if (ax > halfW - 1.55 || v > 0.97) {
              out.color = cryo[0];
              out.alpha = 0.99;
              return out.color;
            }
            // Blazing white diamond fuller spine
            if (ax < 1.5) {
              out.color = PURE_WHITE;
              out.alpha = 1;
              out.glowColor = cryo[5];
              out.glowStrength = 0.42;
              return out.color;
            }
            // Travelling Borealis light-band along the crystal bevels
            const shimmer = Math.sin(v * 11 - ph * 2) > 0.32;
            const innerBevel = ax < halfW * 0.52;
            if (lx < 0) {
              out.color = innerBevel ? (shimmer ? PURE_WHITE : cryo[6]) : cryo[4];
            } else {
              out.color = innerBevel ? (shimmer ? borealis[6] : borealis[5]) : cryo[2];
            }
            out.alpha = 0.96;
            out.glowColor = lx < 0 ? cryo[5] : borealis[5];
            out.glowStrength = 0.22;
            return out.color;
          }
          return 0;
        });

        // Guard center jewel glint
        drawSnowflakeStar(pen, 0, guardY, 7.5, PURE_WHITE, borealis[5], 0.94, ph);
      }
    };
  }
};

// Preserve alias for compatibility
export const hoarfrostShatterNovaCell = celestialIceSwordCell;

// ============================================================================
// ROW 5 (`y = 1040`): CELESTIAL AURORA ASTROLABE & WINTER MOON MANDALA
// ============================================================================
export const auroraSovereignMandalaCell = {
  duration: 1.0,
  loop: true,
  defaults: { palette: GLACIAL_CRYO_PALETTE, seed: 359 },
  create(cfg) {
    const cryo = buildColorRamp(cfg.palette, 8);
    const borealis = buildColorRamp(BOREALIS_PRISM_PALETTE, 8);
    const sapphireBand = [cryo[1], cryo[3], cryo[5], PURE_WHITE];
    const prismBand = [borealis[2], cryo[4], borealis[5], PURE_WHITE];

    return {
      step() {},
      renderBack(pen, localT) {
        const ph = localT * Math.PI * 2;
        pen.shadeBox(-34, -34, 34, 34, (lx, ly, out) => {
          const r = Math.hypot(lx, ly);
          if (r > 30) return 0;
          const ang = Math.atan2(ly, lx) + ph * 0.5;
          const petal = Math.abs(Math.cos(ang * 6));
          const maxR = 19 + petal * 9.5;
          if (r > maxR) return 0;
          if (r > maxR - 1.5) {
            out.color = cryo[0];
            out.alpha = 0.95;
            return out.color;
          }
          if (r < 8.5) {
            out.color = r < 4.5 ? PURE_WHITE : cryo[6];
            out.alpha = 0.96;
            out.glowColor = cryo[5];
            out.glowStrength = 0.42;
            return out.color;
          }
          const sec = Math.floor(((ang + Math.PI * 4) / (Math.PI * 2)) * 12) % 12;
          out.color = sec % 3 === 0 ? borealis[4] : sec % 2 === 0 ? cryo[3] : cryo[5];
          out.alpha = 0.86;
          out.glowColor = sec % 3 === 0 ? borealis[5] : cryo[5];
          out.glowStrength = 0.3;
          return out.color;
        });
      },
      renderFront(pen, localT) {
        const ph = localT * Math.PI * 2;
        drawTiltedOrbitBand(pen, 0, 0, 40, 1.0, 1.7, 0.95, sapphireBand, () => true, false);
        drawTiltedOrbitBand(pen, 0, 0, 31, 1.0, 1.3, 0.9, prismBand, () => true, false);

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

        for (let k = 0; k < 12; k++) {
          const a = ph * 0.5 + (k * Math.PI) / 6;
          const isMajor = k % 2 === 0;
          const rTip = isMajor ? 42 : 36;
          const col = isMajor ? PURE_WHITE : k % 3 === 0 ? borealis[5] : cryo[5];
          const tx = Math.cos(a) * rTip;
          const ty = Math.sin(a) * rTip;
          pen.line(0, 0, tx, ty, col, 0.95);

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
// ROW 6 (`y = 1248`): ABSOLUTE ZERO TRANSLUCENT DIAMOND-LOTUS MONOLITH
//   Encases Frozen Enemies in Both 4-Stack Deep-Freeze & `TRUE_ULTIMATE`!
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
      buildLightningChain(rng, -19, -25, 18, 19, 0.16, 3),
      buildLightningChain(rng, 17, -28, -16, 22, 0.16, 3),
      buildLightningChain(rng, -4, -36, 4, 34, 0.12, 3)
    ];

    return {
      step() {},
      renderFront(pen, localT) {
        const u = clamp01(localT);
        const grow = smoothStep(0, 0.17, u);
        const crackAmt = smoothStep(0.74, 0.98, u);
        const baseY = 40;
        const coffinH = 81 * (0.38 + 0.62 * grow);
        const topY = baseY - coffinH;
        const midY = (baseY + topY) * 0.5;
        const maxHalfW = 26 * (0.7 + 0.3 * grow);

        drawTiltedOrbitBand(pen, 0, baseY - 2, 35 * grow, 0.2, 1.5, 0.9, baseBand, BACK_HALF, false);

        for (const side of [-1, 1]) {
          const spOx = side * 24 * grow;
          const spTop = baseY - 35 * grow;
          pen.shadeBox(spOx - 10, spTop - 4, spOx + 10, baseY + 5, (lx, ly, out) => {
            if (ly < spTop || ly > baseY + 2) return 0;
            const hf = (baseY - ly) / Math.max(1, baseY - spTop);
            const hw = (1 - hf * 0.85) * 7.0;
            const dx = lx - (spOx + (baseY - ly) * side * 0.09);
            const ax = Math.abs(dx);
            if (ax > hw) return 0;
            if (ax > hw - 1.35) {
              out.color = cryo[0];
              out.alpha = 0.96;
              return out.color;
            }
            out.color = dx * side < 0 ? cryo[5] : borealis[3];
            out.alpha = 0.92;
            return out.color;
          });
        }

        pen.shadeBox(-34, topY - 4, 34, baseY + 6, (lx, ly, out) => {
          if (ly < topY || ly > baseY + 2) return 0;
          const vNorm = (ly - topY) / Math.max(1, coffinH);
          let profile = 1.0;
          if (vNorm < 0.22) {
            profile = 0.12 + (vNorm / 0.22) * 0.88;
          } else if (vNorm > 0.82) {
            profile = Math.max(0.28, 1.0 - ((vNorm - 0.82) / 0.18) * 0.62);
          }
          const halfW = maxHalfW * profile;
          const ax = Math.abs(lx);
          if (ax > halfW) return 0;

          const innerRidgeW = halfW * 0.52;
          const isOuterBorder = ax > halfW - 1.5 || vNorm < 0.03 || vNorm > 0.97;
          const isGirdleSeam = Math.abs(vNorm - 0.22) < 0.016 || Math.abs(vNorm - 0.82) < 0.016;
          if (isOuterBorder) {
            out.color = cryo[0];
            out.alpha = 0.98;
            return out.color;
          }

          const isSpine = ax < 1.15;
          const isBevelSeam = Math.abs(ax - innerRidgeW) < 0.9;
          if (isSpine || isBevelSeam || isGirdleSeam) {
            out.color = isSpine || crackAmt > 0.3 ? PURE_WHITE : cryo[6];
            out.alpha = 0.94;
            out.glowColor = cryo[5];
            out.glowStrength = 0.35 + crackAmt * 0.35;
            return out.color;
          }

          const diagBand = Math.sin(lx * 0.22 + ly * 0.18 - u * Math.PI * 4);
          const isWindow = ax < innerRidgeW && vNorm > 0.22 && vNorm < 0.82;

          if (isWindow) {
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

        drawSnowflakeStar(pen, 0, topY + 3, 8.5 * grow, PURE_WHITE, cryo[5], 0.92, u * Math.PI * 2);
        drawTiltedOrbitBand(pen, 0, baseY - 2, 35 * grow, 0.2, 1.6, 0.96, baseBand, FRONT_HALF, true);

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
// ROW 7 (`y = 1456`): CATACLYSMIC 8-POINT ICE-GLASS CROSS-NOVA & SHATTER SHARDS
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

    const shards = Array.from({ length: 18 }, (_, i) => {
      const ang = (i / 18) * Math.PI * 2 + rng.between(-0.09, 0.09);
      return {
        ang,
        maxDist: rng.between(22, 40),
        len: rng.between(5.4, 8.4),
        wid: rng.between(2.8, 4.4),
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
        r1: rng.between(24, 42),
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

        // 1. Expanding Prismatic Shockwave Rings
        const ringR = 10 + 31 * expand;
        drawTiltedOrbitBand(pen, 0, 0, ringR, 1.0, 1.8, 0.95 * fade, prismBand, () => true, u < 0.24);

        // 2. Massive 8-Pointed Crystalline Cross-Lance Starburst (`F00..F20`)
        const crossFade = 1 - smoothStep(0.12, 0.72, u);
        if (crossFade > 0.02) {
          const armL = (20 + 21 * smoothStep(0, 0.28, u)) * crossFade;
          for (let k = 0; k < 8; k++) {
            const a = (k * Math.PI) / 4;
            const reach = k % 2 === 0 ? armL : armL * 0.74;
            const ex = Math.cos(a) * reach;
            const ey = Math.sin(a) * reach;
            pen.line(0, 0, ex, ey, k % 2 === 0 ? PURE_WHITE : borealis[5], crossFade * 0.96);
            if (k % 2 === 0) {
              const nx = -Math.sin(a);
              const ny = Math.cos(a);
              pen.line(nx, ny, ex * 0.68 + nx, ey * 0.68 + ny, cryo[5], crossFade * 0.86);
              pen.line(-nx, -ny, ex * 0.68 - nx, ey * 0.68 - ny, borealis[5], crossFade * 0.86);
            }
          }
          drawStarburstFlare(pen, 0, 0, armL * 0.9, 0.96 * crossFade, [
            cryo[2],
            cryo[5],
            borealis[5],
            PURE_WHITE
          ]);
        }

        // 3. 18 Radially Exploding Faceted Ice-Glass Shards
        for (let i = 0; i < shards.length; i++) {
          const sh = shards[i];
          const dist = 4 + sh.maxDist * expand;
          const sx = Math.cos(sh.ang) * dist;
          const sy = Math.sin(sh.ang) * dist;
          const rot = sh.spin0 + u * sh.spinVel;
          const ca = Math.cos(rot);
          const sa = Math.sin(rot);
          const scale = 1 - smoothStep(0.55, 1.0, u) * 0.5;
          const L = sh.len * scale;
          const W = sh.wid * scale;
          if (L < 1.2) continue;

          const bound = Math.ceil(Math.max(L, W)) + 3;
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

        // 4. Sparkling Diamond Dust Aurora Motes
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
  blizzardJawsVortex,
  coronationSwordImpact,
  borealisCathedralDomain,
  absoluteZeroAuroraVeil,
  diamondDustCataclysmNova,
  cryoShardBoltCell,
  hexCryoPrismMirrorCell,
  facetedGlacierMonolithCell,
  borealisRoseMandalaCell,
  celestialIceSwordCell,
  hoarfrostShatterNovaCell,
  auroraSovereignMandalaCell,
  diamondCoffinMonolithCell,
  diamondDustStarburstCell
};
