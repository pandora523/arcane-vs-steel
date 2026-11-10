/**
 * Abyssal Necropolis & Blood-Moon Reaper Shader Suite (`abyssalShaders.js`)
 * First-party 120Hz 2.5D pixel-shader & particle effects for Malakor (`reaper` / `Reaper.js`).
 *
 * Powers both:
 *   1. Live 120Hz `ArcaneShaderFX` (`back` + `front` 2.5D depth wraps around Malakor & opponents)
 *   2. Offline 30fps `assets/sprites/reaper_vfx.png` (`6240x1040`, 5 rows x 30 cols @ 208x208)
 */

import {
  PURE_WHITE,
  buildColorRamp,
  clamp01,
  smoothStep,
  fbmNoise2D as fbm2D,
  DeterministicRng,
  MotePool,
  buildLightningChain,
  drawTiltedOrbitBand,
  drawStarburstFlare,
  drawMultiLayerCrescentArc
} from '../ArcaneShaderFX.js?v=30fps52';

export const ABYSSAL_VIOLET_PALETTE = [
  '#090314',
  '#2e1065',
  '#581c87',
  '#7e22ce',
  '#9333ea',
  '#c084fc',
  '#e879f9',
  '#ffffff'
];

export const BLOOD_MOON_CRIMSON_PALETTE = [
  '#0f0309',
  '#4c0519',
  '#881337',
  '#be123c',
  '#e11d48',
  '#f43f5e',
  '#fda4af',
  '#ffffff'
];

export const NECROPOLIS_BONE_PALETTE = [
  '#0c0616',
  '#1e293b',
  '#475569',
  '#64748b',
  '#94a3b8',
  '#cbd5e1',
  '#f1f5f9',
  '#ffffff'
];

const BACK_HALF = (theta) => Math.sin(theta) < 0;
const FRONT_HALF = (theta) => Math.sin(theta) >= 0;

function drawPixelSkullOrb(pen, cx, cy, r, mainCol, eyeCol, alpha = 1) {
  pen.fillCircle(cx, cy, r + 0.9, '#090314', alpha * 0.92);
  pen.fillCircle(cx, cy, r, mainCol, alpha * 0.96);
  // Jawline & twin glowing eye sockets
  pen.rect(cx - r * 0.5, cy + r * 0.35, r, r * 0.55, mainCol, alpha * 0.92);
  pen.stipple(cx - r * 0.38, cy - r * 0.1, eyeCol, alpha);
  pen.stipple(cx + r * 0.38, cy - r * 0.1, eyeCol, alpha);
  pen.stipple(cx, cy - r * 0.45, PURE_WHITE, alpha * 0.9);
}

// ============================================================================
// 1. 2.5D ABYSSAL GRAVE-SUBMERGE SHADOW POOL (`abyssalShadowPool`)
// ============================================================================
export const abyssalShadowPool = {
  duration: 0.9,
  loop: true,
  defaults: { palette: ABYSSAL_VIOLET_PALETTE, seed: 23 },
  create(cfg) {
    const abyss = buildColorRamp(cfg.palette, 8);
    const blood = buildColorRamp(BLOOD_MOON_CRIMSON_PALETTE, 8);
    const band4 = [abyss[1], abyss[4], blood[5], abyss[6]];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, abyss[6], blood[5], abyss[4]], floorY: 0 });
    let phase = 0;
    let acc = 0;

    return {
      step(dt) {
        phase += dt;
        acc += dt * 38;
        while (acc >= 1) {
          acc -= 1;
          const a = rng.between(0, Math.PI * 2);
          const r = rng.between(4, 28);
          motes.emit(
            rng.chance(0.45) ? 'glint' : 'spark',
            Math.cos(a) * r,
            Math.sin(a) * r * 0.22,
            rng.between(-12, 12),
            rng.between(-64, -22),
            rng.between(0.18, 0.36),
            rng.chance(0.42) ? blood[5] : abyss[5],
            1,
            -10
          );
        }
        motes.step(dt);
      },
      renderBack(pen) {
        drawTiltedOrbitBand(pen, 0, 0, 30, 0.22, 1.8, 0.9, band4, BACK_HALF, false);
        pen.shadeBox(-28, -6, 28, 2, (lx, ly, out) => {
          const d = Math.hypot(lx / 26, ly / 5.5);
          if (d > 1) return 0;
          const n = fbm2D(lx * 0.22 + phase * 3, ly * 0.35, 2);
          out.color = d < 0.55 ? abyss[0] : n > 0.08 ? blood[3] : abyss[2];
          out.alpha = 0.92 * (1 - d * 0.35);
          return out.color;
        });
      },
      renderFront(pen) {
        drawTiltedOrbitBand(pen, 0, 0, 30, 0.22, 1.9, 0.95, band4, FRONT_HALF, true);
        for (let k = 0; k < 4; k++) {
          const a = phase * 3.8 + (k * Math.PI) / 2;
          if (Math.sin(a) < 0) continue;
          drawPixelSkullOrb(
            pen,
            Math.cos(a) * 28,
            Math.sin(a) * 28 * 0.22 - 1,
            2.3,
            abyss[5],
            blood[5],
            0.94
          );
        }
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 2. SPECTRAL IRON-CHAIN & BOOMERANG TETHER (`spectralChainTether`)
// ============================================================================
export const spectralChainTether = {
  duration: 0.26,
  loop: false,
  defaults: { palette: ABYSSAL_VIOLET_PALETTE, seed: 41, dx: 180, dy: 0, isCrimson: false },
  create(cfg) {
    const abyss = buildColorRamp(cfg.palette, 8);
    const blood = buildColorRamp(BLOOD_MOON_CRIMSON_PALETTE, 8);
    const bone = buildColorRamp(NECROPOLIS_BONE_PALETTE, 8);
    const rng = new DeterministicRng(cfg.seed);
    let t = 0;

    return {
      step(dt) {
        t += dt;
      },
      renderFront(pen) {
        const dur = cfg.customDuration || 0.26;
        const u = clamp01(t / dur);
        const fade = 1 - u * 0.65;
        if (fade <= 0.02) return;

        const ex = (cfg.dx || 160) / 3;
        const ey = (cfg.dy || 0) / 3;
        const glowCol = cfg.isCrimson ? blood[5] : abyss[5];

        const chain = buildLightningChain(rng, 0, 0, ex, ey, 0.09, 3);
        pen.polyline(chain, cfg.isCrimson ? blood[3] : abyss[3], fade * 0.85);
        pen.polyline(chain, glowCol, fade * 0.94);

        const links = Math.max(5, Math.min(14, Math.floor(Math.hypot(ex, ey) / 6)));
        for (let i = 0; i <= links; i++) {
          const lu = i / links;
          const sag = Math.sin(lu * Math.PI) * 3.5;
          const lx = ex * lu;
          const ly = ey * lu + sag;
          pen.fillCircle(lx, ly, 1.8, i % 2 === 0 ? bone[5] : glowCol, fade * 0.96);
          pen.stipple(lx, ly, PURE_WHITE, fade);
        }
      }
    };
  }
};

// ============================================================================
// 3. HOMING NECROTIC SOUL-SIPHON COMET (`soulSiphonComet`)
// ============================================================================
export const soulSiphonComet = {
  duration: 0.52,
  loop: false,
  defaults: {
    palette: ABYSSAL_VIOLET_PALETTE,
    seed: 59,
    dx: -120,
    dy: 0,
    arcH: -55,
    isCrimson: false
  },
  create(cfg) {
    const abyss = buildColorRamp(cfg.palette, 8);
    const blood = buildColorRamp(BLOOD_MOON_CRIMSON_PALETTE, 8);
    let t = 0;

    return {
      step(dt) {
        t += dt;
      },
      renderFront(pen) {
        const dur = cfg.customDuration || 0.52;
        const u = clamp01(t / dur);
        const env = Math.sin(u * Math.PI);
        if (env <= 0.02) return;

        const tx = (cfg.dx || -120) / 3;
        const ty = (cfg.dy || 0) / 3;
        const arc = (cfg.arcH || -55) / 3;
        const mainCol = cfg.isCrimson ? blood[5] : abyss[5];
        const subCol = cfg.isCrimson ? abyss[5] : blood[5];

        const posAt = (s) => [tx * s, ty * s + Math.sin(s * Math.PI) * arc];
        const [hx, hy] = posAt(u);

        // 6-segment Bayer-stippled comet tail
        let prev = [hx, hy];
        for (let k = 1; k <= 6; k++) {
          const su = Math.max(0, u - k * 0.045);
          const cur = posAt(su);
          pen.line(prev[0], prev[1], cur[0], cur[1], k <= 2 ? PURE_WHITE : k % 2 === 0 ? mainCol : subCol, env * (1 - k * 0.13));
          prev = cur;
        }

        drawPixelSkullOrb(pen, hx, hy, 3.2, mainCol, PURE_WHITE, env);
        drawStarburstFlare(pen, hx, hy, 6.5, env * 0.9, [abyss[3], mainCol, subCol, PURE_WHITE]);
      }
    };
  }
};

// ============================================================================
// 4. INWARD-HOOKING REAPER SCYTHE CLEAVE ARC (`reaperScytheCleaveArc`)
// ============================================================================
export const reaperScytheCleaveArc = {
  duration: 0.34,
  loop: false,
  defaults: { palette: ABYSSAL_VIOLET_PALETTE, seed: 79, radiusWorld: 132, isCrimson: false, isUppercut: false },
  create(cfg) {
    const abyss = buildColorRamp(cfg.palette, 8);
    const blood = buildColorRamp(BLOOD_MOON_CRIMSON_PALETTE, 8);
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, abyss[6], blood[5], abyss[4]] });
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
              i % 2 === 0 ? 'streak' : 'glint',
              Math.cos(a) * 16,
              Math.sin(a) * 16,
              Math.cos(a) * spd,
              Math.sin(a) * spd,
              rng.between(0.14, 0.28),
              cfg.isCrimson || i % 3 === 0 ? blood[5] : abyss[5],
              1,
              15
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

        const R = Math.min(54, Math.max(24, (cfg.radiusWorld || 132) / 3));
        const mainCol = cfg.isCrimson ? blood[5] : abyss[5];
        const rimCol = cfg.isCrimson ? abyss[5] : blood[5];
        const ramp8 = cfg.isCrimson ? blood : abyss;

        drawMultiLayerCrescentArc(pen, {
          cx: -4,
          cy: 0,
          radius: R,
          thickness: 10.5,
          startAngle: cfg.isUppercut ? -1.45 : -1.25,
          endAngle: cfg.isUppercut ? 1.15 : 1.35,
          progress: u,
          ramp8,
          echoColor: rimCol,
          alpha: fade,
          seed: cfg.seed || 79
        });

        const tipY = cfg.isUppercut ? -R * 0.72 : R * 0.55;
        drawStarburstFlare(pen, R * 0.65, tipY, 9.5 * fade, fade * 0.94, [abyss[3], mainCol, rimCol, PURE_WHITE]);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 5. BEZIER X-GUILLOTINE RIBBON SLASH (`guillotineRibbonSlash`)
// ============================================================================
export const guillotineRibbonSlash = {
  duration: 0.44,
  loop: false,
  defaults: {
    palette: ABYSSAL_VIOLET_PALETTE,
    seed: 97,
    cx: 120,
    cy: -60,
    x2: 240,
    y2: 20,
    isCrimson: false
  },
  create(cfg) {
    const abyss = buildColorRamp(cfg.palette, 8);
    const blood = buildColorRamp(BLOOD_MOON_CRIMSON_PALETTE, 8);
    const rng = new DeterministicRng(cfg.seed);
    let t = 0;

    return {
      step(dt) {
        t += dt;
      },
      renderFront(pen) {
        const dur = cfg.customDuration || 0.44;
        const u = clamp01(t / dur);
        const fade = Math.pow(1 - u, 1.25);
        if (fade <= 0.02) return;

        const cx = (cfg.cx || 120) / 3;
        const cy = (cfg.cy || -60) / 3;
        const x2 = (cfg.x2 || 240) / 3;
        const y2 = (cfg.y2 || 20) / 3;
        const mainCol = cfg.isCrimson ? blood[5] : abyss[5];
        const outerCol = cfg.isCrimson ? blood[3] : abyss[3];

        const steps = 28;
        let prevX = 0;
        let prevY = 0;
        for (let s = 1; s <= steps; s++) {
          const su = s / steps;
          const inv = 1 - su;
          const qx = 2 * inv * su * cx + su * su * x2;
          const qy = 2 * inv * su * cy + su * su * y2;
          const taper = Math.sin(su * Math.PI);
          const r = Math.max(1.1, taper * 3.8 * (1.05 - u * 0.35));

          pen.fillCircle(qx, qy, r + 1.0, outerCol, fade * 0.82);
          pen.fillCircle(qx, qy, r, mainCol, fade * 0.94);
          pen.line(prevX, prevY, qx, qy, PURE_WHITE, fade);
          prevX = qx;
          prevY = qy;
        }

        const bolt = buildLightningChain(rng, 0, 0, x2, y2, 0.11, 3);
        pen.polyline(bolt, cfg.isCrimson ? abyss[6] : blood[5], fade * 0.86);
        drawStarburstFlare(pen, cx * 0.5 + x2 * 0.25, cy * 0.5 + y2 * 0.25, 11 * fade, fade * 0.95, [
          outerCol,
          mainCol,
          abyss[6],
          PURE_WHITE
        ]);
      }
    };
  }
};

// ============================================================================
// 6. 2.5D BLOOD-MOON ECLIPSE & PENTAGRAM DOMAIN (`bloodMoonEclipseDomain`)
// ============================================================================
export const bloodMoonEclipseDomain = {
  duration: 1.56,
  loop: false,
  defaults: { palette: ABYSSAL_VIOLET_PALETTE, seed: 131 },
  create(cfg) {
    const abyss = buildColorRamp(cfg.palette, 8);
    const blood = buildColorRamp(BLOOD_MOON_CRIMSON_PALETTE, 8);
    const band4 = [blood[2], abyss[4], blood[5], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, blood[5], abyss[6], abyss[4]], floorY: 0 });
    let t = 0;
    let acc = 0;

    return {
      step(dt) {
        t += dt;
        acc += dt * 48;
        while (acc >= 1 && t < 1.38) {
          acc -= 1;
          const a = rng.between(0, Math.PI * 2);
          const r = rng.between(10, 58);
          motes.emit(
            rng.chance(0.45) ? 'glint' : 'spark',
            Math.cos(a) * r,
            Math.sin(a) * r * 0.24 - 2,
            rng.between(-15, 15),
            rng.between(-84, -26),
            rng.between(0.22, 0.45),
            rng.chance(0.5) ? blood[5] : abyss[5],
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

        // 1. Towering Eclipsed Blood-Moon high in the sky (`cy = -74` -> `-222px` world)
        const moonY = -74;
        const moonR = 31 * pop;
        pen.shadeBox(-moonR - 6, moonY - moonR - 6, moonR + 6, moonY + moonR + 6, (lx, ly, out) => {
          const d = Math.hypot(lx, ly - moonY);
          if (d > moonR + 3.5) return 0;
          // Blazing crimson-violet solar-eclipse corona rim
          if (d >= moonR - 2.8) {
            const ang = Math.atan2(ly - moonY, lx);
            const flare = Math.sin(ang * 8 + u * 14) * 0.5 + 0.5;
            out.color = d < moonR - 0.8 ? PURE_WHITE : flare > 0.5 ? blood[5] : abyss[5];
            out.alpha = env * 0.96;
            out.glowColor = blood[5];
            out.glowStrength = 0.52 * env;
            return out.color;
          }
          // Pitch-black abyssal eclipse core
          out.color = abyss[0];
          out.alpha = env * 0.96;
          return out.color;
        });

        // 2. Back half of the Necrotic Pentagram Execution Floor Seal
        drawTiltedOrbitBand(pen, 0, 0, 56 * pop, 0.24, 1.8, 0.9 * env, band4, BACK_HALF, false);
        drawTiltedOrbitBand(pen, 0, 0, 38 * pop, 0.24, 1.3, 0.82 * env, band4, BACK_HALF, false);
      },
      renderFront(pen) {
        const u = clamp01(t / 1.56);
        const pop = smoothStep(0, 0.16, u);
        const fade = 1 - smoothStep(0.82, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;

        // Front half of the Necrotic Pentagram Execution Floor Seal
        const rx = 56 * pop;
        const ry = rx * 0.24;
        drawTiltedOrbitBand(pen, 0, 0, rx, 0.24, 1.9, 0.96 * env, band4, FRONT_HALF, true);
        drawTiltedOrbitBand(pen, 0, 0, 38 * pop, 0.24, 1.4, 0.88 * env, band4, FRONT_HALF, false);

        // Rotating 5-Pointed Blood-Moon Pentagram Star projected onto the floor ellipse
        const rot = u * 4.2 - Math.PI * 0.5;
        for (let i = 0; i < 5; i++) {
          const a0 = rot + (i * 4 * Math.PI) / 5;
          const a1 = rot + ((i + 1) * 4 * Math.PI) / 5;
          pen.line(
            Math.cos(a0) * rx * 0.78,
            Math.sin(a0) * ry * 0.78,
            Math.cos(a1) * rx * 0.78,
            Math.sin(a1) * ry * 0.78,
            i % 2 === 0 ? blood[5] : PURE_WHITE,
            env * 0.92
          );
        }

        // 5 Orbiting Skull Nodes along the front arc
        for (let k = 0; k < 5; k++) {
          const a = rot + (k * Math.PI * 2) / 5;
          if (Math.sin(a) < 0) continue;
          drawPixelSkullOrb(
            pen,
            Math.cos(a) * rx,
            Math.sin(a) * ry,
            2.6,
            blood[5],
            PURE_WHITE,
            env
          );
        }
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// BAKED 30FPS `reaper_vfx.png` 5-ROW CELLS (`104x104` logical -> `208x208` crisp 2x)
//   Row 0 (`y=0`):   360-Deg Twin-Blade Phantom Scythe Boomerang (`phantomScytheBoomerangCell`)
//   Row 1 (`y=208`): Demonic Skeletal Bone-Gauntlet Claw (`spectralBoneClawCell`)
//   Row 2 (`y=416`): Gothic Necropolis Tombstone & Grasping Hands (`gothicTombstoneMonolithCell`)
//   Row 3 (`y=624`): Colossal Hooded Grim Reaper Sovereign Avatar (`sovereignDeathAvatarCell`)
//   Row 4 (`y=832`): Blood-Moon Pentagram & Scythe Cleave Seal (`bloodMoonPentagramSlashCell`)
// ============================================================================

export const phantomScytheBoomerangCell = {
  duration: 1.0,
  loop: true,
  defaults: { palette: ABYSSAL_VIOLET_PALETTE, seed: 501 },
  create(cfg) {
    const abyss = buildColorRamp(cfg.palette, 8);
    const blood = buildColorRamp(BLOOD_MOON_CRIMSON_PALETTE, 8);
    const bone = buildColorRamp(NECROPOLIS_BONE_PALETTE, 8);

    return {
      step() {},
      renderFront(pen, localT) {
        const ph = localT * Math.PI * 2;
        drawTiltedOrbitBand(
          pen,
          0,
          0,
          34,
          1.0,
          1.6,
          0.9,
          [abyss[2], abyss[5], blood[5], PURE_WHITE],
          () => true,
          false
        );

        // Twin counter-curved Reaper Scythe Blades spinning around a central Skull Hub
        for (let b = 0; b < 2; b++) {
          const baseA = ph + b * Math.PI;
          for (let s = 0; s <= 18; s++) {
            const u = s / 18;
            const r = 6 + u * 30;
            const curveA = baseA + u * 1.25;
            const bx = Math.cos(curveA) * r;
            const by = Math.sin(curveA) * r;
            const bladeR = (1 - u * 0.55) * 4.2 + 1.0;
            pen.fillCircle(bx, by, bladeR + 0.9, abyss[0], 0.95);
            pen.fillCircle(bx, by, bladeR, b === 0 ? abyss[5] : blood[5], 0.98);
            pen.stipple(bx, by, PURE_WHITE, 0.96);
          }
        }

        drawPixelSkullOrb(pen, 0, 0, 6.5, bone[6], blood[5], 1.0);
        drawStarburstFlare(pen, 0, 0, 14, 0.92, [abyss[4], blood[5], abyss[6], PURE_WHITE]);
      }
    };
  }
};

export const spectralBoneClawCell = {
  duration: 1.0,
  loop: false,
  defaults: { palette: ABYSSAL_VIOLET_PALETTE, seed: 513 },
  create(cfg) {
    const abyss = buildColorRamp(cfg.palette, 8);
    const blood = buildColorRamp(BLOOD_MOON_CRIMSON_PALETTE, 8);
    const bone = buildColorRamp(NECROPOLIS_BONE_PALETTE, 8);
    const rng = new DeterministicRng(cfg.seed);

    return {
      step() {},
      renderFront(pen, localT) {
        const u = clamp01(localT);
        // Open lunge (`u < 0.33`), Clamp crush (`0.33..0.66`), Locked drag (`>= 0.66`)
        const grip = u < 0.33 ? smoothStep(0, 0.33, u) * 0.35 : u < 0.66 ? 0.35 + smoothStep(0.33, 0.52, u) * 0.65 : 0.92;
        const spread = 1 - grip * 0.62;

        // Iron-Bone Wrist Shackle at left (`x = -24`)
        pen.fillCircle(-22, 0, 8.5, abyss[0], 0.98);
        pen.fillCircle(-22, 0, 6.8, abyss[4], 0.98);
        drawPixelSkullOrb(pen, -14, 0, 6.2, bone[5], blood[5], 1.0);

        // 4 Articulated Skeletal Bone Fingers curving inward to clamp prey
        const fingerAngles = [-0.68, -0.24, 0.24, 0.68];
        for (let f = 0; f < 4; f++) {
          const a0 = fingerAngles[f] * spread;
          const j1x = -10 + Math.cos(a0) * 18;
          const j1y = Math.sin(a0) * 18;
          const a1 = a0 - Math.sign(fingerAngles[f]) * (0.45 + grip * 0.55);
          const tipX = j1x + Math.cos(a1) * 17;
          const tipY = j1y + Math.sin(a1) * 17;

          pen.line(-10, 0, j1x, j1y, bone[4], 0.98);
          pen.line(-10, -1, j1x, j1y - 1, PURE_WHITE, 0.98);
          pen.fillCircle(j1x, j1y, 2.6, bone[6], 1.0);
          pen.line(j1x, j1y, tipX, tipY, bone[6], 0.98);
          pen.fillCircle(tipX, tipY, 2.0, blood[5], 1.0);
        }

        if (u >= 0.3 && u <= 0.78) {
          const arc = buildLightningChain(rng, -12, -16, 18, 16, 0.16, 3);
          pen.polyline(arc, blood[5], 0.92);
          drawStarburstFlare(pen, 8, 0, 15, 0.95, [abyss[4], blood[5], abyss[6], PURE_WHITE]);
        }
      }
    };
  }
};

export const gothicTombstoneMonolithCell = {
  duration: 1.0,
  loop: false,
  defaults: { palette: ABYSSAL_VIOLET_PALETTE, seed: 523 },
  create(cfg) {
    const abyss = buildColorRamp(cfg.palette, 8);
    const blood = buildColorRamp(BLOOD_MOON_CRIMSON_PALETTE, 8);
    const bone = buildColorRamp(NECROPOLIS_BONE_PALETTE, 8);
    const band4 = [abyss[2], abyss[5], blood[5], PURE_WHITE];

    return {
      step() {},
      renderFront(pen, localT) {
        const u = clamp01(localT);
        const pop = 0.68 + 0.32 * smoothStep(0, 0.16, u);
        const fade = 1 - smoothStep(0.84, 1.0, u);
        const env = (0.9 + 0.1 * smoothStep(0, 0.12, u)) * fade;
        if (env <= 0.02) return;

        const baseY = 40;
        const topY = baseY - 76 * pop;
        const halfW = 19;

        // Arched Gothic Tombstone Slab + Carved Cross & Glowing Necropolis Runes
        pen.shadeBox(-halfW - 4, topY - 4, halfW + 4, baseY + 4, (lx, ly, out) => {
          if (ly > baseY || ly < topY) return 0;
          const archY = topY + 18;
          const maxW =
            ly < archY
              ? Math.sqrt(Math.max(0, 1 - Math.pow((archY - ly) / 18, 2))) * halfW
              : halfW;
          const ax = Math.abs(lx);
          if (ax > maxW) return 0;
          if (ax > maxW - 1.8 || ly < topY + 1.8 || ly > baseY - 1.8) {
            out.color = abyss[0];
            out.alpha = 0.98 * env;
            return out.color;
          }
          // Glowing Gothic Cross & Rune Inscription in center of tombstone
          const inCrossV = ax < 2.2 && ly > topY + 10 && ly < baseY - 14;
          const inCrossH = Math.abs(ly - (topY + 24)) < 2.0 && ax < 9.5;
          if (inCrossV || inCrossH) {
            out.color = ax < 1.0 ? PURE_WHITE : u > 0.45 ? blood[5] : abyss[5];
            out.alpha = env;
            out.glowColor = blood[5];
            out.glowStrength = 0.48 * env;
            return out.color;
          }
          out.color = lx < 0 ? bone[3] : bone[2];
          out.alpha = 0.96 * env;
          return out.color;
        });

        // Lower region (`ly = 12..40` -> `y_104 = 64..92`): Grasping Skeletal Hands & Soul Vortex
        drawTiltedOrbitBand(pen, 0, baseY - 2, 28 * pop, 0.24, 1.6, 0.94 * env, band4, () => true, false);
        for (const side of [-1, 1]) {
          const hx = side * 18;
          const hy = baseY - 12 - Math.sin(u * Math.PI * 2 + side) * 4;
          pen.line(side * 12, baseY - 2, hx, hy, bone[5], 0.95 * env);
          pen.line(hx, hy, hx - side * 4, hy - 6, PURE_WHITE, 0.95 * env);
          pen.line(hx, hy, hx + side * 3, hy - 7, bone[6], 0.95 * env);
        }
        drawPixelSkullOrb(pen, 0, topY + 24, 4.2, bone[6], blood[5], env);
      }
    };
  }
};

export const sovereignDeathAvatarCell = {
  duration: 1.0,
  loop: false,
  defaults: { palette: ABYSSAL_VIOLET_PALETTE, seed: 533 },
  create(cfg) {
    const abyss = buildColorRamp(cfg.palette, 8);
    const blood = buildColorRamp(BLOOD_MOON_CRIMSON_PALETTE, 8);
    const bone = buildColorRamp(NECROPOLIS_BONE_PALETTE, 8);

    return {
      step() {},
      renderFront(pen, localT) {
        const u = clamp01(localT);
        const pop = 0.72 + 0.28 * smoothStep(0, 0.18, u);
        const fade = 1 - smoothStep(0.84, 1.0, u);
        const env = (0.9 + 0.1 * smoothStep(0, 0.12, u)) * fade;
        if (env <= 0.02) return;

        // Towering Hooded Grim Reaper Sovereign Torso, Ribcage, Horned Crown & Sweeping Execution Scythe
        pen.shadeBox(-34, -38, 34, 38, (lx, ly, out) => {
          // Tattered Necropolis Cloak & Hood (`ly = -34..36`)
          if (ly < -34 || ly > 36) return 0;
          const v = (ly + 34) / 70;
          const cloakW = v < 0.28 ? 8 + (v / 0.28) * 16 : 24 * (1 - (v - 0.28) * 0.35);
          const ax = Math.abs(lx);
          if (ax > cloakW) return 0;
          if (ax > cloakW - 1.8) {
            out.color = abyss[0];
            out.alpha = 0.96 * env;
            return out.color;
          }
          // Glowing Skeletal Ribcage at chest (`ly = -6..14`)
          if (ly >= -6 && ly <= 14 && ax <= 10 && Math.abs(ly) % 4 < 2) {
            out.color = ax < 3 ? blood[5] : bone[5];
            out.alpha = env;
            out.glowColor = blood[5];
            out.glowStrength = 0.38 * env;
            return out.color;
          }
          out.color = lx < 0 ? abyss[2] : abyss[1];
          out.alpha = 0.94 * env;
          return out.color;
        });

        // Horned Sovereign Skull Head & Blazing Crimson Eyes
        drawPixelSkullOrb(pen, 0, -20, 7.5, bone[6], blood[5], env);
        pen.line(-7, -23, -15, -34, bone[5], env);
        pen.line(7, -23, 15, -34, bone[5], env);

        // Colossal Executioner Great-Scythe sweeping across the Sovereign
        const swingA = -0.55 + Math.sin(u * Math.PI * 2) * 0.45;
        const sx0 = -28 * Math.cos(swingA);
        const sy0 = -6 - 28 * Math.sin(swingA);
        const sx1 = 30 * Math.cos(swingA);
        const sy1 = -6 + 30 * Math.sin(swingA);
        pen.line(sx0, sy0, sx1, sy1, bone[5], env);
        // Giant Crimson-Violet Crescent Scythe Blade at `(sx1, sy1)`
        for (let k = 0; k <= 12; k++) {
          const ku = k / 12;
          const ba = swingA + 1.35 + ku * 1.15;
          const bx = sx1 + Math.cos(ba) * (4 + ku * 22);
          const by = sy1 + Math.sin(ba) * (4 + ku * 22);
          pen.fillCircle(bx, by, (1 - ku * 0.5) * 3.4, k % 2 === 0 ? blood[5] : abyss[5], env);
          pen.stipple(bx, by, PURE_WHITE, env);
        }
      }
    };
  }
};

export const bloodMoonPentagramSlashCell = {
  duration: 1.0,
  loop: true,
  defaults: { palette: ABYSSAL_VIOLET_PALETTE, seed: 547 },
  create(cfg) {
    const abyss = buildColorRamp(cfg.palette, 8);
    const blood = buildColorRamp(BLOOD_MOON_CRIMSON_PALETTE, 8);
    const bone = buildColorRamp(NECROPOLIS_BONE_PALETTE, 8);
    const band4 = [blood[2], abyss[4], blood[5], PURE_WHITE];

    return {
      step() {},
      renderFront(pen, localT) {
        const ph = localT * Math.PI * 2;
        drawTiltedOrbitBand(pen, 0, 0, 36, 1.0, 1.7, 0.94, band4, () => true, false);
        drawTiltedOrbitBand(pen, 0, 0, 24, 1.0, 1.3, 0.86, band4, () => true, false);

        // Revolving 5-Pointed Blood-Moon Pentagram Star
        for (let i = 0; i < 5; i++) {
          const a0 = ph + (i * 4 * Math.PI) / 5;
          const a1 = ph + ((i + 1) * 4 * Math.PI) / 5;
          pen.line(
            Math.cos(a0) * 34,
            Math.sin(a0) * 34,
            Math.cos(a1) * 34,
            Math.sin(a1) * 34,
            i % 2 === 0 ? blood[5] : abyss[5],
            0.94
          );
          pen.line(
            Math.cos(a0) * 28,
            Math.sin(a0) * 28,
            Math.cos(a1) * 28,
            Math.sin(a1) * 28,
            PURE_WHITE,
            0.9
          );
          drawPixelSkullOrb(pen, Math.cos(a0) * 35, Math.sin(a0) * 35, 3.0, bone[6], blood[5], 0.96);
        }
        drawStarburstFlare(pen, 0, 0, 15, 0.92, [abyss[4], blood[5], abyss[6], PURE_WHITE]);
      }
    };
  }
};

export const ABYSSAL_EFFECT_REGISTRY = {
  abyssalShadowPool,
  spectralChainTether,
  soulSiphonComet,
  reaperScytheCleaveArc,
  guillotineRibbonSlash,
  bloodMoonEclipseDomain,
  phantomScytheBoomerangCell,
  spectralBoneClawCell,
  gothicTombstoneMonolithCell,
  sovereignDeathAvatarCell,
  bloodMoonPentagramSlashCell
};
