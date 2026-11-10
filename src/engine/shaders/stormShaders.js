/**
 * Storm-Blade Iaido & Raijin Thunder Shader Suite (`stormShaders.js`)
 * First-party 120Hz 2.5D pixel-shader & particle effects for Kaze-Maru (`ronin` / `Ronin.js`).
 *
 * Powers both:
 *   1. Live 120Hz `ArcaneShaderFX` (`back` + `front` 2.5D depth wraps around Kaze-Maru & opponents)
 *   2. Offline 30fps `assets/sprites/ronin_vfx.png` (`6240x1040`, 5 rows x 30 cols @ 208x208)
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
  drawStarburstFlare
} from '../ArcaneShaderFX.js?v=30fps46';

export const STORM_CYAN_PALETTE = [
  '#080c24',
  '#1e1b4b',
  '#3730a3',
  '#4f46e5',
  '#06b6d4',
  '#22d3ee',
  '#67e8f9',
  '#ffffff'
];

export const RAIJIN_VIOLET_BRASS_PALETTE = [
  '#130926',
  '#3b0764',
  '#6d28d9',
  '#8b5cf6',
  '#a78bfa',
  '#eab308',
  '#fef08a',
  '#ffffff'
];

const BACK_HALF = (theta) => Math.sin(theta) < 0;
const FRONT_HALF = (theta) => Math.sin(theta) >= 0;

function drawTaikoDrumNode(pen, cx, cy, r, brassCol, innerCol, alpha = 1) {
  pen.fillCircle(cx, cy, r + 0.9, '#130926', alpha * 0.92);
  pen.fillCircle(cx, cy, r, brassCol, alpha * 0.96);
  pen.fillCircle(cx, cy, Math.max(1.1, r * 0.55), innerCol, alpha);
  pen.stipple(cx, cy, PURE_WHITE, alpha);
}

// ============================================================================
// 1. IAIDO KOIGUCHI SAYA GLINT (`iaidoSayaGlint`)
// ============================================================================
export const iaidoSayaGlint = {
  duration: 0.28,
  loop: false,
  defaults: { palette: STORM_CYAN_PALETTE, seed: 19, isSheath: false },
  create(cfg) {
    const storm = buildColorRamp(cfg.palette, 8);
    const raijin = buildColorRamp(RAIJIN_VIOLET_BRASS_PALETTE, 8);
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, raijin[6], storm[6], storm[5]] });
    let t = 0;
    let burstDone = false;

    return {
      step(dt) {
        if (!burstDone) {
          burstDone = true;
          for (let i = 0; i < 12; i++) {
            const a = rng.between(0, Math.PI * 2);
            const spd = rng.between(36, 118);
            motes.emit(
              i % 2 === 0 ? 'glint' : 'streak',
              0,
              0,
              Math.cos(a) * spd,
              Math.sin(a) * spd,
              rng.between(0.12, 0.24),
              i % 3 === 0 ? raijin[5] : storm[5],
              1,
              0
            );
          }
        }
        t += dt;
        motes.step(dt);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.28);
        const env = Math.sin(u * Math.PI);
        if (env <= 0.02) return;
        const r = (cfg.isSheath ? 16 : 12) * (0.45 + 0.55 * smoothStep(0, 0.4, u));
        // Long horizontal & vertical katana star-cross glint
        pen.line(-r * 1.45, 0, r * 1.45, 0, storm[6], env * 0.92);
        pen.line(0, -r * 1.1, 0, r * 1.1, raijin[6], env * 0.92);
        pen.line(-r * 0.9, 0, r * 0.9, 0, PURE_WHITE, env);
        drawStarburstFlare(pen, 0, 0, r * 0.72, env * 0.95, [storm[3], storm[5], raijin[6], PURE_WHITE]);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 2. SERENE MIND IAIDO COUNTER WARD (`sereneMindParryWard`)
// ============================================================================
export const sereneMindParryWard = {
  duration: 0.62,
  loop: false,
  defaults: { palette: STORM_CYAN_PALETTE, seed: 31 },
  create(cfg) {
    const storm = buildColorRamp(cfg.palette, 8);
    const raijin = buildColorRamp(RAIJIN_VIOLET_BRASS_PALETTE, 8);
    const band4 = [storm[2], storm[5], raijin[4], PURE_WHITE];
    let t = 0;

    return {
      step(dt) {
        t += dt;
      },
      renderBack(pen) {
        const u = clamp01(t / 0.62);
        const env = smoothStep(0, 0.14, u) * (1 - smoothStep(0.75, 1.0, u));
        if (env <= 0.02) return;
        drawTiltedOrbitBand(pen, 0, 0, 28, 0.23, 1.4, 0.85 * env, band4, BACK_HALF, false);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.62);
        const env = smoothStep(0, 0.14, u) * (1 - smoothStep(0.75, 1.0, u));
        if (env <= 0.02) return;
        drawTiltedOrbitBand(pen, 0, 0, 28, 0.23, 1.5, 0.94 * env, band4, FRONT_HALF, true);
        for (let d = 0; d < 4; d++) {
          const a = u * 5.2 + (d * Math.PI) / 2;
          if (Math.sin(a) < 0) continue;
          drawTaikoDrumNode(
            pen,
            Math.cos(a) * 28,
            Math.sin(a) * 28 * 0.23,
            2.4,
            raijin[5],
            PURE_WHITE,
            env
          );
        }
      }
    };
  }
};

// ============================================================================
// 3. JUDGMENT-CUT LIGHTNING SLASH BEAM (`judgmentSlashBeam`)
// ============================================================================
export const judgmentSlashBeam = {
  duration: 0.48,
  loop: false,
  defaults: { palette: STORM_CYAN_PALETTE, seed: 47, dx: 90, dy: -30, detonated: false },
  create(cfg) {
    const storm = buildColorRamp(cfg.palette, 8);
    const raijin = buildColorRamp(RAIJIN_VIOLET_BRASS_PALETTE, 8);
    const rng = new DeterministicRng(cfg.seed);
    let t = 0;

    return {
      step(dt) {
        t += dt;
      },
      renderFront(pen) {
        const dur = cfg.customDuration || 0.48;
        const u = clamp01(t / dur);
        const fade = 1 - u;
        if (fade <= 0.02) return;

        const ex = (cfg.dx || 90) / 3;
        const ey = (cfg.dy || 0) / 3;
        const isDet = Boolean(cfg.detonated);
        const outerCol = isDet ? raijin[3] : storm[3];
        const midCol = isDet ? raijin[6] : storm[5];

        pen.line(0, -1, ex, ey - 1, outerCol, fade * 0.78);
        pen.line(0, 1, ex, ey + 1, midCol, fade * 0.86);
        pen.line(0, 0, ex, ey, PURE_WHITE, fade * 0.98);

        const chain = buildLightningChain(rng, 0, 0, ex, ey, isDet ? 0.13 : 0.08, 3);
        pen.polyline(chain, isDet ? raijin[4] : storm[6], fade * 0.88);

        const mx = ex * 0.5;
        const my = ey * 0.5;
        const glR = (isDet ? 8.5 : 6.0) * fade;
        pen.line(mx - glR, my, mx + glR, my, midCol, fade * 0.94);
        pen.line(mx, my - glR, mx, my + glR, PURE_WHITE, fade * 0.94);
      }
    };
  }
};

// ============================================================================
// 4. 2.5D RAIJIN TAIKO SHOCKWAVE RING (`raijinTaikoShockwave`)
// ============================================================================
export const raijinTaikoShockwave = {
  duration: 0.36,
  loop: false,
  defaults: { palette: STORM_CYAN_PALETTE, seed: 61, maxRWorld: 120, colorType: 'cyan', isGround: false },
  create(cfg) {
    const storm = buildColorRamp(cfg.palette, 8);
    const raijin = buildColorRamp(RAIJIN_VIOLET_BRASS_PALETTE, 8);
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, raijin[6], storm[6], raijin[4]] });
    let t = 0;
    let burstDone = false;

    return {
      step(dt) {
        if (!burstDone) {
          burstDone = true;
          for (let i = 0; i < 14; i++) {
            const a = rng.between(0, Math.PI * 2);
            const spd = rng.between(40, 138);
            motes.emit(
              i % 2 === 0 ? 'spark' : 'glint',
              0,
              0,
              Math.cos(a) * spd,
              Math.sin(a) * spd * (cfg.isGround ? 0.35 : 0.9),
              rng.between(0.14, 0.28),
              cfg.colorType === 'gold' ? raijin[6] : cfg.colorType === 'purple' ? raijin[4] : storm[5],
              1,
              cfg.isGround ? 25 : 40
            );
          }
        }
        t += dt;
        motes.step(dt);
      },
      renderBack(pen) {
        if (!cfg.isGround) return;
        const u = clamp01(t / 0.36);
        const fade = 1 - u;
        if (fade <= 0.02) return;
        const maxR = Math.min(76, Math.max(20, (cfg.maxRWorld || 120) / 3));
        const r = maxR * (0.25 + 0.75 * smoothStep(0, 0.75, u));
        const band =
          cfg.colorType === 'gold'
            ? [raijin[2], raijin[5], raijin[6], PURE_WHITE]
            : cfg.colorType === 'purple'
              ? [raijin[1], raijin[3], raijin[4], PURE_WHITE]
              : [storm[2], storm[4], storm[6], PURE_WHITE];
        drawTiltedOrbitBand(pen, 0, 0, r, 0.24, 1.4, fade * 0.86, band, BACK_HALF, false);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.36);
        const fade = 1 - u;
        if (fade <= 0.02) return;
        const maxR = Math.min(76, Math.max(20, (cfg.maxRWorld || 120) / 3));
        const r = maxR * (0.25 + 0.75 * smoothStep(0, 0.75, u));
        const tilt = cfg.isGround ? 0.24 : 0.88;
        const band =
          cfg.colorType === 'gold'
            ? [raijin[2], raijin[5], raijin[6], PURE_WHITE]
            : cfg.colorType === 'purple'
              ? [raijin[1], raijin[3], raijin[4], PURE_WHITE]
              : [storm[2], storm[4], storm[6], PURE_WHITE];
        const pred = cfg.isGround ? FRONT_HALF : () => true;
        drawTiltedOrbitBand(pen, 0, 0, r, tilt, 1.5, fade * 0.94, band, pred, u < 0.25);

        for (let d = 0; d < 8; d++) {
          const a = -u * 3.0 + (d * Math.PI) / 4;
          if (cfg.isGround && Math.sin(a) < 0) continue;
          drawTaikoDrumNode(
            pen,
            Math.cos(a) * r,
            Math.sin(a) * r * tilt,
            2.1,
            raijin[5],
            PURE_WHITE,
            fade
          );
        }
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 5. SKY-SPLITTING RAIJIN THUNDERBOLT (`raijinSkyThunderbolt`)
// ============================================================================
export const raijinSkyThunderbolt = {
  duration: 0.36,
  loop: false,
  defaults: { palette: STORM_CYAN_PALETTE, seed: 73, spanWorldY: 270, colorType: 'cyan' },
  create(cfg) {
    const storm = buildColorRamp(cfg.palette, 8);
    const raijin = buildColorRamp(RAIJIN_VIOLET_BRASS_PALETTE, 8);
    const rng = new DeterministicRng(cfg.seed);
    let t = 0;

    return {
      step(dt) {
        t += dt;
      },
      renderFront(pen) {
        const u = clamp01(t / 0.36);
        const fade = 1 - u;
        if (fade <= 0.02) return;
        const topY = -Math.min(108, Math.max(48, (cfg.spanWorldY || 270) / 3));
        const mainCol =
          cfg.colorType === 'gold' ? raijin[6] : cfg.colorType === 'purple' ? raijin[4] : storm[6];
        const subCol =
          cfg.colorType === 'gold' ? raijin[5] : cfg.colorType === 'purple' ? raijin[3] : storm[4];

        const spine = buildLightningChain(rng, 0, topY, 0, 0, 0.14, 4);
        pen.polyline(spine, subCol, fade * 0.85);
        pen.polyline(
          spine.map((p) => [p[0] + 1, p[1]]),
          mainCol,
          fade * 0.92
        );
        pen.polyline(spine, PURE_WHITE, fade);

        // Two branching forks
        const midA = spine[Math.floor(spine.length * 0.38)] || [0, topY * 0.6];
        const midB = spine[Math.floor(spine.length * 0.68)] || [0, topY * 0.3];
        pen.line(midA[0], midA[1], midA[0] - 10, midA[1] + 11, mainCol, fade * 0.82);
        pen.line(midB[0], midB[1], midB[0] + 10, midB[1] + 11, mainCol, fade * 0.82);
        drawStarburstFlare(pen, 0, -1, 11 * fade, fade * 0.94, [subCol, mainCol, raijin[6], PURE_WHITE]);
      }
    };
  }
};

// ============================================================================
// 6. SUPERSONIC SPEAR-DIVE MACH-CONE (`shunpoSpearMachCone`)
// ============================================================================
export const shunpoSpearMachCone = {
  duration: 1.2,
  loop: true,
  defaults: { palette: STORM_CYAN_PALETTE, seed: 89, pitchAngle: 0, isHeavenSplit: false },
  create(cfg) {
    const storm = buildColorRamp(cfg.palette, 8);
    const raijin = buildColorRamp(RAIJIN_VIOLET_BRASS_PALETTE, 8);
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, raijin[6], storm[6], raijin[4]] });
    let phase = 0;
    let acc = 0;

    return {
      step(dt) {
        phase += dt;
        acc += dt * 56;
        const ang = cfg.pitchAngle || 0;
        const ux = Math.cos(ang);
        const uy = Math.sin(ang);
        while (acc >= 1) {
          acc -= 1;
          motes.emit(
            rng.chance(0.5) ? 'streak' : 'glint',
            ux * 14 + rng.between(-3, 3),
            uy * 14 + rng.between(-4, 4),
            -ux * rng.between(65, 145),
            -uy * rng.between(65, 145) + rng.between(-16, 16),
            rng.between(0.12, 0.24),
            cfg.isHeavenSplit && rng.chance(0.45) ? raijin[6] : storm[5],
            1,
            0
          );
        }
        motes.step(dt);
      },
      renderFront(pen) {
        const ang = cfg.pitchAngle || 0;
        const ux = Math.cos(ang);
        const uy = Math.sin(ang);
        const nx = -uy;
        const ny = ux;
        const tipX = ux * 22;
        const tipY = uy * 22;
        const spreadK = cfg.isHeavenSplit ? 0.46 : 0.36;

        // V-Shaped Supersonic Shockwings sweeping back from katana spear-tip
        for (const side of [-1, 1]) {
          const backX = tipX - ux * 38 + nx * side * 38 * spreadK;
          const backY = tipY - uy * 38 + ny * side * 38 * spreadK;
          pen.line(tipX, tipY, backX, backY, cfg.isHeavenSplit ? raijin[6] : storm[5], 0.9);
          pen.line(
            tipX,
            tipY,
            tipX - ux * 24 + nx * side * 24 * spreadK * 0.75,
            tipY - uy * 24 + ny * side * 24 * spreadK * 0.75,
            PURE_WHITE,
            0.96
          );
        }

        // Spiraling Dual-Helix Lightning Contrail
        let prevX = tipX;
        let prevY = tipY;
        for (let s = 1; s <= 10; s++) {
          const d = s * 3.8;
          const wv = Math.sin(s * 0.85 - phase * 28) * (3.2 + s * 0.25);
          const hx = tipX - ux * d + nx * wv;
          const hy = tipY - uy * d + ny * wv;
          pen.line(prevX, prevY, hx, hy, s % 2 === 0 ? storm[6] : raijin[4], 0.84 - s * 0.05);
          prevX = hx;
          prevY = hy;
        }
        drawStarburstFlare(pen, tipX, tipY, 7.5, 0.94, [storm[4], storm[6], raijin[6], PURE_WHITE]);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 7. 2.5D SUSANOO STORM-GOD DOMAIN (`susanooStormDomain`)
// ============================================================================
export const susanooStormDomain = {
  duration: 1.75,
  loop: false,
  defaults: { palette: STORM_CYAN_PALETTE, seed: 107 },
  create(cfg) {
    const storm = buildColorRamp(cfg.palette, 8);
    const raijin = buildColorRamp(RAIJIN_VIOLET_BRASS_PALETTE, 8);
    const band4 = [storm[2], storm[5], raijin[4], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, raijin[6], storm[6], raijin[4]], floorY: 0 });
    let t = 0;
    let acc = 0;

    return {
      step(dt) {
        t += dt;
        acc += dt * 44;
        while (acc >= 1 && t < 1.55) {
          acc -= 1;
          const a = rng.between(0, Math.PI * 2);
          const r = rng.between(8, 56);
          motes.emit(
            rng.chance(0.5) ? 'glint' : 'spark',
            Math.cos(a) * r,
            Math.sin(a) * r * 0.22 - 2,
            rng.between(-14, 14),
            rng.between(-78, -24),
            rng.between(0.22, 0.44),
            rng.chance(0.35) ? raijin[6] : rng.chance(0.5) ? raijin[4] : storm[5],
            1.1,
            -12
          );
        }
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 1.75);
        const pop = smoothStep(0, 0.14, u);
        const fade = 1 - smoothStep(0.84, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;

        drawTiltedOrbitBand(pen, 0, 0, 56 * pop, 0.22, 1.6, 0.88 * env, band4, BACK_HALF, false);
        drawTiltedOrbitBand(pen, 0, 0, 34 * pop, 0.22, 1.2, 0.8 * env, band4, BACK_HALF, false);

        for (let d = 0; d < 8; d++) {
          const a = -u * 5.0 + (d * Math.PI) / 4;
          if (Math.sin(a) >= 0) continue;
          drawTaikoDrumNode(
            pen,
            Math.cos(a) * 56 * pop,
            Math.sin(a) * 56 * pop * 0.22,
            2.6,
            raijin[5],
            PURE_WHITE,
            env
          );
        }
      },
      renderFront(pen) {
        const u = clamp01(t / 1.75);
        const pop = smoothStep(0, 0.14, u);
        const fade = 1 - smoothStep(0.84, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;

        drawTiltedOrbitBand(pen, 0, 0, 56 * pop, 0.22, 1.8, 0.96 * env, band4, FRONT_HALF, true);
        drawTiltedOrbitBand(pen, 0, 0, 34 * pop, 0.22, 1.3, 0.86 * env, band4, FRONT_HALF, false);

        for (let d = 0; d < 8; d++) {
          const a = -u * 5.0 + (d * Math.PI) / 4;
          if (Math.sin(a) < 0) continue;
          drawTaikoDrumNode(
            pen,
            Math.cos(a) * 56 * pop,
            Math.sin(a) * 56 * pop * 0.22,
            2.8,
            raijin[5],
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
// BAKED 30FPS `ronin_vfx.png` 5-ROW CELLS (`104x104` logical -> `208x208` crisp 2x)
//   Row 0 (`y=0`):   Electric Thunder-Katana Crescent Wave (`storm_wave` & Row 0 anims)
//   Row 1 (`y=208`): Raijin Sky-Odachi (`F00..F11`) & Cross-Slash Raijin Crater (`F12..F29`)
//   Row 2 (`y=416`): Coiling Raijin Lightning Dragon-Pillar (`crystalSpikes` & Row 2 `F18..F29`)
//   Row 3 (`y=624`): 8-Drum Raijin Tomoe Storm-God Halo Crest (`castAuras` & Row 3 anims)
//   Row 4 (`y=832`): Thousand-Blade Judgment Slash Ring (`slashes` `isRoninSlash`)
// ============================================================================

export const stormKatanaWaveCell = {
  duration: 1.0,
  loop: true,
  defaults: { palette: STORM_CYAN_PALETTE, seed: 401 },
  create(cfg) {
    const storm = buildColorRamp(cfg.palette, 8);
    const raijin = buildColorRamp(RAIJIN_VIOLET_BRASS_PALETTE, 8);
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, storm[6], raijin[4], raijin[6]] });
    let acc = 0;

    return {
      step(dt) {
        acc += dt * 44;
        while (acc >= 1) {
          acc -= 1;
          motes.emit(
            'streak',
            rng.between(-6, 18),
            rng.between(-24, 24),
            rng.between(-85, -28),
            rng.between(-12, 12),
            0.22,
            rng.chance(0.4) ? raijin[4] : storm[5],
            1,
            0
          );
        }
        motes.step(dt);
      },
      renderFront(pen, localT) {
        const ph = localT * Math.PI * 2;
        // Razor-sharp sweeping crescent storm blade facing `+X`
        pen.shadeBox(-24, -38, 36, 38, (lx, ly, out) => {
          const ny = ly / 34;
          if (Math.abs(ny) > 1) return 0;
          const curveX = 24 * (1 - ny * ny) - 4;
          const thickness = (1 - ny * ny) * 11.5 + 1.2;
          const dx = lx - curveX;
          if (dx > 2.2 || dx < -thickness) return 0;
          if (dx > 0.6 || dx < -thickness + 1.6) {
            out.color = storm[0];
            out.alpha = 0.96;
            return out.color;
          }
          if (dx > -2.4) {
            out.color = PURE_WHITE;
            out.alpha = 1;
            out.glowColor = storm[6];
            out.glowStrength = 0.52;
            return out.color;
          }
          const n = fbm2D(lx * 0.18 - ph, ly * 0.18, 2);
          out.color = dx > -5.5 ? storm[6] : n > 0.05 ? storm[5] : raijin[4];
          out.alpha = 0.95;
          out.glowColor = storm[5];
          out.glowStrength = 0.3;
          return out.color;
        });

        const arcPts = [];
        for (let k = -4; k <= 4; k++) {
          const ny = k / 4;
          arcPts.push([
            24 * (1 - ny * ny) - 6 + Math.sin(ph * 2 + k) * 2.2,
            ny * 31
          ]);
        }
        pen.polyline(arcPts, raijin[6], 0.88);
        motes.render(pen);
      }
    };
  }
};

export const raijinSkyOdachiCell = {
  duration: 1.0,
  loop: false,
  defaults: { palette: STORM_CYAN_PALETTE, seed: 413 },
  create(cfg) {
    const storm = buildColorRamp(cfg.palette, 8);
    const raijin = buildColorRamp(RAIJIN_VIOLET_BRASS_PALETTE, 8);
    const band4 = [storm[2], storm[5], raijin[4], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);

    return {
      step() {},
      renderFront(pen, localT) {
        const u = clamp01(localT);
        // F00..F11 (`u < 0.40`): Descending Colossal Raijin Sky-Odachi!
        if (u < 0.4) {
          const fu = u / 0.4;
          pen.shadeBox(-12, -40, 12, 38, (lx, ly, out) => {
            if (ly < -36 || ly > 36) return 0;
            // Tsuba handguard at y = -16
            if (ly >= -18 && ly <= -14 && Math.abs(lx) <= 9) {
              out.color = Math.abs(lx) > 7 ? storm[0] : raijin[5];
              out.alpha = 1;
              return out.color;
            }
            // Hilt above tsuba
            if (ly < -18) {
              if (Math.abs(lx) > 2.6) return 0;
              out.color = Math.abs(ly) % 4 < 2 ? raijin[5] : storm[2];
              out.alpha = 1;
              return out.color;
            }
            // Tapered Odachi blade pointing down to y = +36
            const bFrac = (ly + 14) / 50;
            const halfW = (1 - bFrac * 0.65) * 4.8;
            if (Math.abs(lx) > halfW) return 0;
            if (Math.abs(lx) > halfW - 1.2) {
              out.color = storm[0];
              out.alpha = 0.98;
              return out.color;
            }
            out.color = Math.abs(lx) < 1.5 ? PURE_WHITE : lx < 0 ? storm[6] : raijin[4];
            out.alpha = 1;
            out.glowColor = storm[5];
            out.glowStrength = 0.4;
            return out.color;
          });
          const bolt = buildLightningChain(rng, 0, -34, 0, 34, 0.15 + 0.04 * Math.sin(fu * 12), 3);
          pen.polyline(bolt, raijin[6], 0.9);
        } else {
          // F12..F29 (`u >= 0.40`): Impaled Odachi + X-Shaped Judgment Cross-Slash & 8-Drum Raijin Crater!
          const iu = clamp01((u - 0.4) / 0.6);
          const pop = 0.72 + 0.28 * smoothStep(0, 0.2, iu);
          const fade = 1 - smoothStep(0.76, 1.0, iu);
          const env = (0.9 + 0.1 * smoothStep(0, 0.15, iu)) * fade;
          if (env <= 0.02) return;

          const baseY = 30;
          drawTiltedOrbitBand(pen, 0, baseY, 34 * pop, 0.24, 1.6, 0.94 * env, band4, () => true, false);
          for (let d = 0; d < 8; d++) {
            const a = iu * 3 + (d * Math.PI) / 4;
            drawTaikoDrumNode(
              pen,
              Math.cos(a) * 34 * pop,
              baseY + Math.sin(a) * 34 * pop * 0.24,
              2.2,
              raijin[5],
              PURE_WHITE,
              env
            );
          }

          // Impaled Odachi blade at center
          pen.line(0, -34, 0, baseY, PURE_WHITE, env);
          pen.line(-1.5, -30, -1.5, baseY, storm[5], env * 0.92);
          pen.line(1.5, -30, 1.5, baseY, raijin[4], env * 0.92);
          pen.line(-8, -22, 8, -22, raijin[5], env);

          // X-Shaped Judgment Cross-Slash across the cell!
          const span = 32 * pop;
          pen.line(-span, -span + 4, span, span + 4, storm[5], env * 0.92);
          pen.line(-span, span + 4, span, -span + 4, raijin[4], env * 0.92);
          pen.line(-span * 0.86, -span * 0.86 + 4, span * 0.86, span * 0.86 + 4, PURE_WHITE, env);
          pen.line(-span * 0.86, span * 0.86 + 4, span * 0.86, -span * 0.86 + 4, PURE_WHITE, env);
          drawStarburstFlare(pen, 0, 4, 15 * pop, env * 0.95, [storm[4], storm[6], raijin[6], PURE_WHITE]);
        }
      }
    };
  }
};

export const raijinDragonPillarCell = {
  duration: 1.0,
  loop: false,
  defaults: { palette: STORM_CYAN_PALETTE, seed: 421 },
  create(cfg) {
    const storm = buildColorRamp(cfg.palette, 8);
    const raijin = buildColorRamp(RAIJIN_VIOLET_BRASS_PALETTE, 8);
    const band4 = [storm[2], storm[5], raijin[4], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);

    return {
      step() {},
      renderFront(pen, localT) {
        const u = clamp01(localT);
        const pop = 0.62 + 0.38 * smoothStep(0, 0.18, u);
        const fade = 1 - smoothStep(0.82, 1.0, u);
        const env = (0.9 + 0.1 * smoothStep(0, 0.12, u)) * fade;
        if (env <= 0.02) return;

        const baseY = 40;
        const topY = baseY - 78 * pop;
        const halfW = 14 * (0.85 + 0.15 * Math.sin(u * Math.PI));

        pen.shadeBox(-24, topY - 4, 24, baseY + 4, (lx, ly, out) => {
          if (ly > baseY || ly < topY) return 0;
          const hFrac = (baseY - ly) / Math.max(1, baseY - topY);
          const coilShift = Math.sin(hFrac * 8.5 - u * 12) * 3.5;
          const ax = Math.abs(lx - coilShift * 0.45);
          const maxW = halfW * (1 - hFrac * 0.28);
          if (ax > maxW) return 0;
          if (ax > maxW - 1.5) {
            out.color = storm[0];
            out.alpha = 0.96 * env;
            return out.color;
          }
          if (ax < 3.0) {
            out.color = PURE_WHITE;
            out.alpha = env;
            out.glowColor = storm[6];
            out.glowStrength = 0.48;
            return out.color;
          }
          out.color = ax < maxW * 0.56 ? storm[6] : lx < 0 ? storm[4] : raijin[3];
          out.alpha = 0.94 * env;
          return out.color;
        });

        const dragonChain = buildLightningChain(rng, 0, topY, 0, baseY, 0.16, 4);
        pen.polyline(dragonChain, raijin[6], 0.92 * env);
        drawTiltedOrbitBand(pen, 0, baseY, 26 * pop, 0.22, 1.5, 0.92 * env, band4, () => true, false);
      }
    };
  }
};

export const raijinTaikoCrestCell = {
  duration: 1.0,
  loop: true,
  defaults: { palette: STORM_CYAN_PALETTE, seed: 433 },
  create(cfg) {
    const storm = buildColorRamp(cfg.palette, 8);
    const raijin = buildColorRamp(RAIJIN_VIOLET_BRASS_PALETTE, 8);
    const band4 = [storm[2], storm[5], raijin[4], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);

    return {
      step() {},
      renderFront(pen, localT) {
        const ph = localT * Math.PI * 2;
        drawTiltedOrbitBand(pen, 0, 0, 36, 1.0, 1.7, 0.94, band4, () => true, false);
        drawTiltedOrbitBand(pen, 0, 0, 23, 1.0, 1.3, 0.86, band4, () => true, false);

        // 8 Orbiting Raijin Tomoe Taiko Drums connected by crackling lightning arcs
        for (let d = 0; d < 8; d++) {
          const a = ph + (d * Math.PI) / 4;
          const dx = Math.cos(a) * 36;
          const dy = Math.sin(a) * 36;
          if (d % 2 === 0) {
            const na = ph + ((d + 1) * Math.PI) / 4;
            const arc = buildLightningChain(rng, dx, dy, Math.cos(na) * 36, Math.sin(na) * 36, 0.12, 2);
            pen.polyline(arc, storm[6], 0.86);
          }
          drawTaikoDrumNode(pen, dx, dy, 4.2, raijin[5], raijin[6], 0.98);
        }
        drawStarburstFlare(pen, 0, 0, 16, 0.9, [raijin[3], storm[5], raijin[6], PURE_WHITE]);
      }
    };
  }
};

export const thousandBladeSlashCell = {
  duration: 1.0,
  loop: false,
  defaults: { palette: STORM_CYAN_PALETTE, seed: 443 },
  create(cfg) {
    const storm = buildColorRamp(cfg.palette, 8);
    const raijin = buildColorRamp(RAIJIN_VIOLET_BRASS_PALETTE, 8);

    return {
      step() {},
      renderFront(pen, localT) {
        const u = clamp01(localT);
        const pop = 0.55 + 0.45 * smoothStep(0, 0.22, u);
        const fade = 1 - smoothStep(0.7, 1.0, u);
        const env = (0.9 + 0.1 * smoothStep(0, 0.14, u)) * fade;
        if (env <= 0.02) return;

        // Sweeping storm crescent + 5 crisscrossing judgment cuts
        const r = 34 * pop;
        for (let k = 0; k < 5; k++) {
          const a = u * 2.4 + (k * Math.PI) / 5;
          const x0 = Math.cos(a) * r;
          const y0 = Math.sin(a) * r;
          pen.line(-x0, -y0, x0, y0, k % 2 === 0 ? storm[5] : raijin[4], 0.9 * env);
          pen.line(-x0 * 0.82, -y0 * 0.82, x0 * 0.82, y0 * 0.82, PURE_WHITE, 0.96 * env);
        }
        drawTiltedOrbitBand(
          pen,
          0,
          0,
          r,
          0.92,
          1.6,
          0.92 * env,
          [storm[2], storm[5], raijin[5], PURE_WHITE],
          () => true,
          u < 0.25
        );
      }
    };
  }
};

export const STORM_EFFECT_REGISTRY = {
  iaidoSayaGlint,
  sereneMindParryWard,
  judgmentSlashBeam,
  raijinTaikoShockwave,
  raijinSkyThunderbolt,
  shunpoSpearMachCone,
  susanooStormDomain,
  stormKatanaWaveCell,
  raijinSkyOdachiCell,
  raijinDragonPillarCell,
  raijinTaikoCrestCell,
  thousandBladeSlashCell
};
