/**
 * Abyssal Necropolis & Blood-Moon Reaper Shader Suite (`abyssalShaders.js`)
 * First-party 120Hz 2.5D pixel-shader & particle effects for Malakor (`reaper` / `Reaper.js`).
 *
 * Powers both:
 *   1. Live 120Hz `ArcaneShaderFX` (`back` + `front` 2.5D depth wraps around Malakor & opponents)
 *   2. Offline 30fps `assets/sprites/reaper_vfx.png` (`6240x1040`, 5 rows x 30 cols @ 208x208, 0/150 border clips)
 */

import {
  PURE_WHITE,
  clamp01,
  clampRange,
  mixScalar,
  smoothStep,
  Easing,
  buildColorRamp,
  fbmNoise2D,
  DeterministicRng,
  MotePool,
  buildLightningChain,
  drawTiltedOrbitBand,
  drawStarburstFlare,
  drawMultiLayerCrescentArc
} from '../ArcaneShaderFX.js?v=30fps53';

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

/** Draw a crisp cel-shaded pixel skull orb with jawline, twin glowing eye sockets, and brow highlight. */
function drawPixelSkullOrb(pen, cx, cy, r, mainCol, eyeCol, alpha = 1) {
  if (alpha <= 0.03 || r <= 0.5) return;
  pen.fillCircle(cx, cy, r + 0.9, '#090314', alpha * 0.92);
  pen.fillCircle(cx, cy, r, mainCol, alpha * 0.96);
  pen.rect(cx - r * 0.5, cy + r * 0.32, r, r * 0.52, mainCol, alpha * 0.92);
  pen.stipple(cx - r * 0.38, cy - r * 0.08, eyeCol, alpha);
  pen.stipple(cx + r * 0.38, cy - r * 0.08, eyeCol, alpha);
  pen.stipple(cx, cy - r * 0.45, PURE_WHITE, alpha * 0.92);
}

/** Draw a 5-pointed Thanatos Pentagram Star on a tilted (`aspectY`) or flat (`1.0`) plane, with optional 2.5D half filter. */
function drawThanatosPentagram(
  pen,
  cx,
  cy,
  rx,
  aspectY,
  rot,
  colMain,
  colSub,
  alpha = 1,
  halfPred = null
) {
  if (rx <= 1.5 || alpha <= 0.03) return;
  const ry = rx * aspectY;
  for (let i = 0; i < 5; i++) {
    const a0 = rot + (i * 4 * Math.PI) / 5;
    const a1 = rot + ((i + 1) * 4 * Math.PI) / 5;
    const x0 = cx + Math.cos(a0) * rx;
    const y0 = cy + Math.sin(a0) * ry;
    const x1 = cx + Math.cos(a1) * rx;
    const y1 = cy + Math.sin(a1) * ry;
    const mx = (x0 + x1) * 0.5;
    const my = (y0 + y1) * 0.5;

    if (!halfPred || halfPred(Math.atan2(y0 - cy, x0 - cx))) {
      pen.line(x0, y0, mx, my, i % 2 === 0 ? colMain : colSub, alpha * 0.94);
    }
    if (!halfPred || halfPred(Math.atan2(y1 - cy, x1 - cx))) {
      pen.line(mx, my, x1, y1, i % 2 === 0 ? PURE_WHITE : colMain, alpha * 0.94);
    }
  }
}

/** Draw an articulated 4-finger skeletal bone-gauntlet claw oriented along `aimAngle`. */
function drawSkeletalBoneClawHead(pen, cx, cy, aimAngle, grip, boneRamp, glowCol, alpha = 1) {
  if (alpha <= 0.03) return;
  const ux = Math.cos(aimAngle);
  const uy = Math.sin(aimAngle);
  const nx = -uy;
  const ny = ux;
  const spread = 1 - grip * 0.55;

  // Wrist shackle & skull hub
  const wx = cx - ux * 5;
  const wy = cy - uy * 5;
  pen.fillCircle(wx, wy, 4.2, '#090314', alpha * 0.95);
  drawPixelSkullOrb(pen, cx - ux * 2, cy - uy * 2, 3.4, boneRamp[5], glowCol, alpha);

  // 4 articulated bone phalanges curving inward
  const offsets = [-0.66, -0.24, 0.24, 0.66];
  for (let f = 0; f < 4; f++) {
    const a0 = aimAngle + offsets[f] * spread;
    const j1x = cx + Math.cos(a0) * 8.5;
    const j1y = cy + Math.sin(a0) * 8.5;
    const a1 = a0 - Math.sign(offsets[f]) * (0.42 + grip * 0.48);
    const tipX = j1x + Math.cos(a1) * 7.5;
    const tipY = j1y + Math.sin(a1) * 7.5;

    pen.line(cx, cy, j1x, j1y, boneRamp[5], alpha * 0.96);
    pen.line(cx + nx * 0.5, cy + ny * 0.5, j1x + nx * 0.5, j1y + ny * 0.5, PURE_WHITE, alpha * 0.9);
    pen.fillCircle(j1x, j1y, 1.4, boneRamp[6], alpha);
    pen.line(j1x, j1y, tipX, tipY, boneRamp[6], alpha * 0.96);
    pen.fillCircle(tipX, tipY, 1.3, glowCol, alpha);
  }
}

// ============================================================================
// 1. LIVE 2.5D ABYSSAL WRAITH MANTLE & SHADOW POOL (`abyssalWraithMantle`)
// ============================================================================
export const abyssalWraithMantle = {
  duration: 0.85,
  loop: true,
  defaults: {
    palette: ABYSSAL_VIOLET_PALETTE,
    seed: 23,
    radius: 28,
    isSubmerged: false,
    isCrimson: false
  },
  create(cfg) {
    const abyss = buildColorRamp(cfg.palette, 8);
    const blood = buildColorRamp(BLOOD_MOON_CRIMSON_PALETTE, 8);
    const bone = buildColorRamp(NECROPOLIS_BONE_PALETTE, 8);
    const band4 = cfg.isCrimson
      ? [blood[1], blood[4], abyss[5], PURE_WHITE]
      : [abyss[1], abyss[4], blood[5], abyss[6]];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({
      rng,
      sparkRamp: [PURE_WHITE, abyss[6], blood[5], abyss[4]],
      floorY: 0
    });
    let phase = 0;
    let acc = 0;

    return {
      step(dt) {
        phase += dt;
        acc += dt * 42;
        while (acc >= 1) {
          acc -= 1;
          const a = rng.between(0, Math.PI * 2);
          const r = rng.between(4, cfg.radius || 28);
          motes.emit(
            rng.chance(0.48) ? 'glint' : 'spark',
            Math.cos(a) * r,
            Math.sin(a) * r * 0.24 - (cfg.isSubmerged ? 0 : rng.between(4, 28)),
            rng.between(-16, 16),
            rng.between(-68, -24),
            rng.between(0.18, 0.36),
            rng.chance(0.45) ? blood[5] : abyss[5],
            1,
            -12
          );
        }
        motes.step(dt);
      },
      renderBack(pen) {
        const rx = cfg.radius || 28;
        drawTiltedOrbitBand(pen, 0, 0, rx, 0.22, 1.8, 0.9, band4, BACK_HALF, false);
        drawTiltedOrbitBand(pen, 0, 0, rx * 0.66, 0.22, 1.3, 0.82, band4, BACK_HALF, false);

        // FBM-eroded abyssal shadow pool & rising wraith mantle tendrils behind Malakor
        const topH = cfg.isSubmerged ? -12 : -36;
        pen.shadeBox(-rx, topH, rx, 4, (lx, ly, out) => {
          if (ly >= -4) {
            const d = Math.hypot(lx / rx, ly / 5.5);
            if (d > 1) return 0;
            const n = fbmNoise2D(lx * 0.2 + phase * 3.2, ly * 0.35, cfg.seed, 2);
            out.color = d < 0.52 ? abyss[0] : n > 0.06 ? blood[3] : abyss[2];
            out.alpha = 0.92 * (1 - d * 0.35);
            out.glowColor = abyss[4];
            out.glowStrength = 0.22;
            return out.color;
          }
          const hFrac = clamp01(-ly / Math.abs(topH));
          const maxW = rx * 0.68 * (1 - hFrac * 0.55);
          if (Math.abs(lx) > maxW) return 0;
          const n = fbmNoise2D(lx * 0.18, ly * 0.16 + phase * 4.5, cfg.seed + 11, 2);
          if (n + (1 - hFrac) * 0.45 < 0.38) return 0;
          out.color = n > 0.24 ? abyss[4] : abyss[1];
          out.alpha = 0.78 * (1 - hFrac * 0.6);
          return out.color;
        });

        for (let k = 0; k < 4; k++) {
          const a = phase * 3.6 + (k * Math.PI) / 2;
          if (Math.sin(a) >= 0) continue;
          drawPixelSkullOrb(
            pen,
            Math.cos(a) * rx,
            Math.sin(a) * rx * 0.22 - 1,
            2.2,
            bone[5],
            blood[5],
            0.9
          );
        }
      },
      renderFront(pen) {
        const rx = cfg.radius || 28;
        drawTiltedOrbitBand(pen, 0, 0, rx, 0.22, 1.9, 0.95, band4, FRONT_HALF, true);
        drawTiltedOrbitBand(pen, 0, 0, rx * 0.66, 0.22, 1.4, 0.86, band4, FRONT_HALF, false);

        for (let k = 0; k < 4; k++) {
          const a = phase * 3.6 + (k * Math.PI) / 2;
          if (Math.sin(a) < 0) continue;
          drawPixelSkullOrb(
            pen,
            Math.cos(a) * rx,
            Math.sin(a) * rx * 0.22 - 1,
            2.4,
            bone[6],
            blood[5],
            0.96
          );
        }
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 2. LIVE 2.5D SOUL-HARVEST SCYTHE CLEAVE ARC (`soulHarvestScytheArc`)
// ============================================================================
export const soulHarvestScytheArc = {
  duration: 0.36,
  loop: false,
  defaults: {
    palette: ABYSSAL_VIOLET_PALETTE,
    seed: 79,
    radiusWorld: 132,
    isCrimson: false,
    isUppercut: false,
    isCross: false,
    eccentricity: 0.72
  },
  create(cfg) {
    const abyss = buildColorRamp(cfg.palette, 8);
    const blood = buildColorRamp(BLOOD_MOON_CRIMSON_PALETTE, 8);
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({
      rng,
      sparkRamp: [PURE_WHITE, abyss[6], blood[5], abyss[4]]
    });
    let t = 0;
    let burstDone = false;

    return {
      step(dt) {
        if (!burstDone) {
          burstDone = true;
          for (let i = 0; i < 16; i++) {
            const a = rng.between(-Math.PI * 0.7, Math.PI * 0.7);
            const spd = rng.between(45, 145);
            motes.emit(
              i % 2 === 0 ? 'streak' : 'glint',
              Math.cos(a) * 14,
              Math.sin(a) * 14,
              Math.cos(a) * spd,
              Math.sin(a) * spd,
              rng.between(0.14, 0.28),
              cfg.isCrimson || i % 3 === 0 ? blood[5] : abyss[5],
              1,
              12
            );
          }
        }
        t += dt;
        motes.step(dt);
      },
      renderBack(pen) {
        const dur = cfg.customDuration || 0.36;
        const u = clamp01(t / dur);
        const fade = 1 - u;
        if (fade <= 0.02) return;

        const R = Math.min(54, Math.max(22, (cfg.radiusWorld || 132) / 3));
        const band4 = cfg.isCrimson
          ? [blood[2], blood[5], abyss[5], PURE_WHITE]
          : [abyss[2], abyss[5], blood[5], PURE_WHITE];
        drawTiltedOrbitBand(pen, 0, 4, R * 0.78, 0.25, 1.5, fade * 0.85, band4, BACK_HALF, false);

        const bolt = buildLightningChain(rng, -R * 0.45, -R * 0.35, R * 0.65, R * 0.35, 0.14, 3);
        pen.polyline(bolt, cfg.isCrimson ? abyss[5] : blood[5], fade * 0.82);
      },
      renderFront(pen) {
        const dur = cfg.customDuration || 0.36;
        const u = clamp01(t / dur);
        const fade = Math.pow(1 - u, 0.88);
        if (fade <= 0.02) return;

        const R = Math.min(54, Math.max(22, (cfg.radiusWorld || 132) / 3));
        const primaryRamp = cfg.isCrimson ? blood : abyss;
        const secondaryRamp = cfg.isCrimson ? abyss : blood;

        const headA = cfg.isUppercut ? -1.35 + u * 0.35 : 1.25 + u * 0.35;
        const tailA = cfg.isUppercut ? 1.45 : -1.55;

        drawMultiLayerCrescentArc(pen, {
          cx: -4,
          cy: 0,
          radius: R,
          width: 11.5,
          eccentricity: cfg.eccentricity || 0.72,
          headAngle: headA,
          tailAngle: tailA,
          fade,
          ramp: primaryRamp,
          seed: cfg.seed || 79,
          t,
          flashHot: u < 0.36
        });

        if (cfg.isCross) {
          drawMultiLayerCrescentArc(pen, {
            cx: -2,
            cy: 0,
            radius: R * 0.92,
            width: 10.0,
            eccentricity: cfg.eccentricity || 0.72,
            headAngle: -headA,
            tailAngle: -tailA,
            fade: fade * 0.94,
            ramp: secondaryRamp,
            seed: (cfg.seed || 79) + 19,
            t,
            flashHot: u < 0.36
          });
        }

        const tipX = -4 + Math.cos(headA) * R * 0.85;
        const tipY = Math.sin(headA) * R * (cfg.eccentricity || 0.72) * 0.85;
        drawStarburstFlare(pen, tipX, tipY, 10.5 * fade, fade * 0.95, [
          primaryRamp[3],
          primaryRamp[5],
          secondaryRamp[5],
          PURE_WHITE
        ]);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 3. LIVE 2.5D SKELETAL CHAIN TETHER & SOUL SIPHON BEAM (`skeletalChainTetherBeam`)
// ============================================================================
export const skeletalChainTetherBeam = {
  duration: 0.34,
  loop: false,
  defaults: {
    palette: ABYSSAL_VIOLET_PALETTE,
    seed: 41,
    dx: 180,
    dy: 0,
    arcH: 0,
    isCrimson: false,
    showClaw: true,
    isComet: false,
    customDuration: 0.34
  },
  create(cfg) {
    const abyss = buildColorRamp(cfg.palette, 8);
    const blood = buildColorRamp(BLOOD_MOON_CRIMSON_PALETTE, 8);
    const bone = buildColorRamp(NECROPOLIS_BONE_PALETTE, 8);
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({
      rng,
      sparkRamp: [PURE_WHITE, abyss[6], blood[5], bone[6]]
    });
    let t = 0;
    let acc = 0;

    return {
      step(dt) {
        t += dt;
        acc += dt * 36;
        const ex = (cfg.dx || 160) / 3;
        const ey = (cfg.dy || 0) / 3;
        while (acc >= 1) {
          acc -= 1;
          const u = rng.nextFloat();
          motes.emit(
            'glint',
            ex * u,
            ey * u + Math.sin(u * Math.PI) * ((cfg.arcH || 10) / 3),
            rng.between(-18, 18),
            rng.between(-32, 12),
            0.18,
            cfg.isCrimson ? blood[5] : abyss[5],
            1,
            0
          );
        }
        motes.step(dt);
      },
      renderBack(pen) {
        const dur = cfg.customDuration || 0.34;
        const u = clamp01(t / dur);
        const fade = cfg.isComet ? Math.sin(u * Math.PI) : 1 - u * 0.55;
        if (fade <= 0.02) return;

        const ex = (cfg.dx || 160) / 3;
        const ey = (cfg.dy || 0) / 3;
        const arc = (cfg.arcH || 10) / 3;
        const glowCol = cfg.isCrimson ? blood[5] : abyss[5];

        const chain = buildLightningChain(rng, 0, 0, ex, ey, 0.08, 3);
        pen.polyline(chain, cfg.isCrimson ? blood[2] : abyss[2], fade * 0.82);

        if (!cfg.isComet) {
          const links = Math.max(5, Math.min(15, Math.floor(Math.hypot(ex, ey) / 5.5)));
          for (let i = 1; i <= links; i += 2) {
            const lu = i / links;
            const lx = ex * lu;
            const ly = ey * lu + Math.sin(lu * Math.PI) * arc;
            pen.fillCircle(lx, ly, 2.1, abyss[0], fade * 0.94);
            pen.fillCircle(lx, ly, 1.5, glowCol, fade * 0.9);
          }
        }
      },
      renderFront(pen) {
        const dur = cfg.customDuration || 0.34;
        const u = clamp01(t / dur);
        const fade = cfg.isComet ? Math.sin(u * Math.PI) : 1 - u * 0.55;
        if (fade <= 0.02) return;

        const ex = (cfg.dx || 160) / 3;
        const ey = (cfg.dy || 0) / 3;
        const arc = (cfg.arcH || 10) / 3;
        const mainCol = cfg.isCrimson ? blood[5] : abyss[5];
        const subCol = cfg.isCrimson ? abyss[5] : blood[5];

        if (cfg.isComet) {
          const posAt = (s) => [ex * s, ey * s + Math.sin(s * Math.PI) * arc];
          const [hx, hy] = posAt(u);
          let prev = [hx, hy];
          for (let k = 1; k <= 6; k++) {
            const su = Math.max(0, u - k * 0.048);
            const cur = posAt(su);
            pen.line(
              prev[0],
              prev[1],
              cur[0],
              cur[1],
              k <= 2 ? PURE_WHITE : k % 2 === 0 ? mainCol : subCol,
              fade * (1 - k * 0.12)
            );
            prev = cur;
          }
          drawPixelSkullOrb(pen, hx, hy, 3.2, mainCol, PURE_WHITE, fade);
          drawStarburstFlare(pen, hx, hy, 6.5, fade * 0.92, [abyss[3], mainCol, subCol, PURE_WHITE]);
          motes.render(pen);
          return;
        }

        const chain = buildLightningChain(rng, 0, 0, ex, ey, 0.09, 3);
        pen.polyline(chain, mainCol, fade * 0.94);

        const links = Math.max(5, Math.min(15, Math.floor(Math.hypot(ex, ey) / 5.5)));
        for (let i = 0; i <= links; i += 2) {
          const lu = i / links;
          const lx = ex * lu;
          const ly = ey * lu + Math.sin(lu * Math.PI) * arc;
          pen.fillCircle(lx, ly, 2.0, bone[5], fade * 0.96);
          pen.stipple(lx, ly, PURE_WHITE, fade);
        }

        if (cfg.showClaw !== false) {
          const aimAngle = Math.atan2(ey, ex);
          const grip = smoothStep(0.1, 0.45, u);
          drawSkeletalBoneClawHead(pen, ex, ey, aimAngle, grip, bone, mainCol, fade);
          drawStarburstFlare(pen, ex, ey, 8.5 * fade, fade * 0.92, [
            abyss[3],
            mainCol,
            subCol,
            PURE_WHITE
          ]);
        }
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 4. LIVE 2.5D NECROTIC GRAVEYARD SIGIL & PRISON SEAL (`necroticGraveyardSigil`)
// ============================================================================
export const necroticGraveyardSigil = {
  duration: 0.92,
  loop: false,
  defaults: {
    palette: ABYSSAL_VIOLET_PALETTE,
    seed: 67,
    radius: 26,
    isPrison: false,
    isCrimson: false,
    customDuration: 0.92
  },
  create(cfg) {
    const abyss = buildColorRamp(cfg.palette, 8);
    const blood = buildColorRamp(BLOOD_MOON_CRIMSON_PALETTE, 8);
    const bone = buildColorRamp(NECROPOLIS_BONE_PALETTE, 8);
    const band4 = cfg.isCrimson
      ? [blood[2], blood[5], abyss[5], PURE_WHITE]
      : [abyss[2], abyss[5], blood[5], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({
      rng,
      sparkRamp: [PURE_WHITE, abyss[6], blood[5], bone[5]],
      floorY: 0
    });
    let t = 0;
    let acc = 0;

    return {
      step(dt) {
        t += dt;
        acc += dt * 34;
        const rx = cfg.radius || 26;
        while (acc >= 1) {
          acc -= 1;
          const a = rng.between(0, Math.PI * 2);
          const r = rng.between(4, rx);
          motes.emit(
            rng.chance(0.5) ? 'glint' : 'spark',
            Math.cos(a) * r,
            Math.sin(a) * r * 0.24 - 1,
            rng.between(-10, 10),
            rng.between(-58, -18),
            rng.between(0.18, 0.36),
            cfg.isCrimson ? blood[5] : abyss[5],
            1,
            -8
          );
        }
        motes.step(dt);
      },
      renderBack(pen) {
        const dur = cfg.customDuration || 0.92;
        const u = clamp01(t / dur);
        const pop = smoothStep(0, 0.16, u);
        const fade = 1 - smoothStep(0.76, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;

        const rx = (cfg.radius || 26) * pop;
        drawTiltedOrbitBand(pen, 0, 0, rx, 0.24, 1.8, 0.9 * env, band4, BACK_HALF, false);
        drawTiltedOrbitBand(pen, 0, 0, rx * 0.65, 0.24, 1.3, 0.82 * env, band4, BACK_HALF, false);
        drawThanatosPentagram(
          pen,
          0,
          0,
          rx * 0.82,
          0.24,
          u * 3.2,
          blood[5],
          abyss[5],
          env * 0.88,
          BACK_HALF
        );

        if (cfg.isPrison) {
          for (let b = -2; b <= 2; b++) {
            const bx = b * (rx * 0.36);
            const barH = (18 + (b % 2 === 0 ? 8 : 0)) * pop;
            pen.line(bx, -2, bx, -barH, bone[4], env * 0.86);
            pen.stipple(bx, -barH, blood[5], env);
          }
        }
      },
      renderFront(pen) {
        const dur = cfg.customDuration || 0.92;
        const u = clamp01(t / dur);
        const pop = smoothStep(0, 0.16, u);
        const fade = 1 - smoothStep(0.76, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;

        const rx = (cfg.radius || 26) * pop;
        drawTiltedOrbitBand(pen, 0, 0, rx, 0.24, 1.9, 0.96 * env, band4, FRONT_HALF, u < 0.22);
        drawTiltedOrbitBand(pen, 0, 0, rx * 0.65, 0.24, 1.4, 0.88 * env, band4, FRONT_HALF, false);
        drawThanatosPentagram(
          pen,
          0,
          0,
          rx * 0.82,
          0.24,
          u * 3.2,
          blood[5],
          abyss[5],
          env * 0.94,
          FRONT_HALF
        );

        for (let k = 0; k < 5; k++) {
          const a = u * 3.2 + (k * Math.PI * 2) / 5;
          if (Math.sin(a) < 0) continue;
          drawPixelSkullOrb(
            pen,
            Math.cos(a) * rx,
            Math.sin(a) * rx * 0.24,
            2.2,
            bone[6],
            blood[5],
            env
          );
        }
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 5. LIVE 2.5D DEATH AVATAR CATHEDRAL & BLOOD-MOON ECLIPSE (`deathAvatarCathedral`)
// ============================================================================
export const deathAvatarCathedral = {
  duration: 1.56,
  loop: false,
  defaults: { palette: ABYSSAL_VIOLET_PALETTE, seed: 131 },
  create(cfg) {
    const abyss = buildColorRamp(cfg.palette, 8);
    const blood = buildColorRamp(BLOOD_MOON_CRIMSON_PALETTE, 8);
    const bone = buildColorRamp(NECROPOLIS_BONE_PALETTE, 8);
    const band4 = [blood[2], abyss[4], blood[5], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({
      rng,
      sparkRamp: [PURE_WHITE, blood[5], abyss[6], abyss[4]],
      floorY: 0
    });
    let t = 0;
    let acc = 0;

    return {
      step(dt) {
        t += dt;
        acc += dt * 52;
        while (acc >= 1 && t < 1.42) {
          acc -= 1;
          const a = rng.between(0, Math.PI * 2);
          const r = rng.between(10, 62);
          motes.emit(
            rng.chance(0.48) ? 'glint' : 'spark',
            Math.cos(a) * r,
            Math.sin(a) * r * 0.24 - 2,
            rng.between(-16, 16),
            rng.between(-88, -28),
            rng.between(0.22, 0.46),
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
        const fade = 1 - smoothStep(0.84, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;

        // 1. Towering Eclipsed Blood-Moon high in the sky (`cy = -72` -> `-216px` world)
        const moonY = -72;
        const moonR = 29 * pop;
        pen.shadeBox(-moonR - 5, moonY - moonR - 5, moonR + 5, moonY + moonR + 5, (lx, ly, out) => {
          const d = Math.hypot(lx, ly - moonY);
          if (d > moonR + 3.2) return 0;
          if (d >= moonR - 2.6) {
            const ang = Math.atan2(ly - moonY, lx);
            const flare = Math.sin(ang * 8 + u * 14) * 0.5 + 0.5;
            out.color = d < moonR - 0.8 ? PURE_WHITE : flare > 0.5 ? blood[5] : abyss[5];
            out.alpha = env * 0.96;
            out.glowColor = blood[5];
            out.glowStrength = 0.52 * env;
            return out.color;
          }
          out.color = abyss[0];
          out.alpha = env * 0.96;
          return out.color;
        });

        // 2. Gothic Cathedral Rib-Spires & Colossal Hooded Sovereign of Death looming behind the arena
        const sovY = -44 + (1 - pop) * 18;
        pen.shadeBox(-26, sovY - 28, 26, sovY + 34, (lx, ly, out) => {
          const dy = ly - (sovY - 26);
          if (dy < 0 || dy > 60) return 0;
          const v = dy / 60;
          const cloakW = v < 0.28 ? 7 + (v / 0.28) * 15 : 22 * (1 - (v - 0.28) * 0.28);
          const ax = Math.abs(lx);
          if (ax > cloakW) return 0;
          if (ax > cloakW - 1.6) {
            out.color = abyss[0];
            out.alpha = 0.94 * env;
            return out.color;
          }
          if (dy >= 22 && dy <= 42 && ax <= 9 && Math.floor(dy) % 4 < 2) {
            out.color = ax < 2.5 ? blood[5] : bone[5];
            out.alpha = env * 0.96;
            out.glowColor = blood[5];
            out.glowStrength = 0.36 * env;
            return out.color;
          }
          out.color = lx < 0 ? abyss[2] : abyss[1];
          out.alpha = 0.9 * env;
          return out.color;
        });

        drawPixelSkullOrb(pen, 0, sovY - 12, 6.5, bone[6], blood[5], env);
        pen.line(-6, sovY - 15, -14, sovY - 26, bone[5], env);
        pen.line(6, sovY - 15, 14, sovY - 26, bone[5], env);

        // Sweeping Sovereign Execution Great-Scythe behind the fighters
        const swingA = -0.55 + Math.sin(u * Math.PI * 2) * 0.5;
        const sx0 = -28 * Math.cos(swingA);
        const sy0 = sovY - 2 - 28 * Math.sin(swingA);
        const sx1 = 30 * Math.cos(swingA);
        const sy1 = sovY - 2 + 30 * Math.sin(swingA);
        pen.line(sx0, sy0, sx1, sy1, bone[5], env);
        for (let k = 0; k <= 10; k++) {
          const ku = k / 10;
          const ba = swingA + 1.35 + ku * 1.1;
          const bx = sx1 + Math.cos(ba) * (4 + ku * 20);
          const by = sy1 + Math.sin(ba) * (4 + ku * 20);
          pen.fillCircle(bx, by, (1 - ku * 0.5) * 3.0, k % 2 === 0 ? blood[5] : abyss[5], env);
          pen.stipple(bx, by, PURE_WHITE, env);
        }

        // 3. Back half of the 2.5D Blood-Moon Pentagram Execution Floor Seal
        const rx = 58 * pop;
        drawTiltedOrbitBand(pen, 0, 0, rx, 0.24, 1.8, 0.92 * env, band4, BACK_HALF, false);
        drawTiltedOrbitBand(pen, 0, 0, 38 * pop, 0.24, 1.3, 0.84 * env, band4, BACK_HALF, false);
        drawThanatosPentagram(
          pen,
          0,
          0,
          rx * 0.8,
          0.24,
          u * 4.2 - Math.PI * 0.5,
          blood[5],
          abyss[5],
          env * 0.9,
          BACK_HALF
        );
      },
      renderFront(pen) {
        const u = clamp01(t / 1.56);
        const pop = smoothStep(0, 0.16, u);
        const fade = 1 - smoothStep(0.84, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;

        const rx = 58 * pop;
        const ry = rx * 0.24;
        drawTiltedOrbitBand(pen, 0, 0, rx, 0.24, 2.0, 0.96 * env, band4, FRONT_HALF, true);
        drawTiltedOrbitBand(pen, 0, 0, 38 * pop, 0.24, 1.4, 0.88 * env, band4, FRONT_HALF, false);

        const rot = u * 4.2 - Math.PI * 0.5;
        drawThanatosPentagram(pen, 0, 0, rx * 0.8, 0.24, rot, blood[5], PURE_WHITE, env * 0.94, FRONT_HALF);

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
// Strictly bounded within `[-40, +40]` (`[-44, +44]` safe envelope) for 0/150 border clips!
//   Row 0 (`y=0`):   360-Deg Twin-Blade Soul Scythe Wave (`soulScytheWaveCell`)
//   Row 1 (`y=208`): Floating Abyssal Skull Wisp & Soul-Fire Orb (`abyssalSkullWispCell`)
//   Row 2 (`y=416`): Erupting Necrotic Bone Spire & Gothic Tombstone (`necroticBoneSpireCell`)
//   Row 3 (`y=624`): Revolving Thanatos Blood-Moon Pentagram Seal (`thanatosPentagramSealCell`)
//   Row 4 (`y=832`): Abyssal Reap Crescent Slash & Starburst Nova (`abyssalReapNovaCell`)
// ============================================================================

/** Row 0 (`sy = 0`): 360-Deg Twin-Blade Soul Scythe Boomerang & Crescent Wave (`F00..F29` loop). */
export const soulScytheWaveCell = {
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
          29,
          1.0,
          1.6,
          0.9,
          [abyss[2], abyss[5], blood[5], PURE_WHITE],
          null,
          false
        );

        drawMultiLayerCrescentArc(pen, {
          cx: 0,
          cy: 0,
          radius: 25,
          width: 7.5,
          eccentricity: 1.0,
          headAngle: ph,
          tailAngle: ph - 2.35,
          fade: 0.92,
          ramp: abyss,
          seed: cfg.seed || 501,
          t: localT
        });

        // Twin counter-curved Reaper Scythe Blades spinning around a central Skull Hub (r <= 31)
        for (let b = 0; b < 2; b++) {
          const baseA = ph + b * Math.PI;
          for (let s = 0; s <= 16; s++) {
            const u = s / 16;
            const r = 5 + u * 25;
            const curveA = baseA + u * 1.22;
            const bx = Math.cos(curveA) * r;
            const by = Math.sin(curveA) * r;
            const bladeR = (1 - u * 0.55) * 3.6 + 0.9;
            pen.fillCircle(bx, by, bladeR + 0.8, abyss[0], 0.95);
            pen.fillCircle(bx, by, bladeR, b === 0 ? abyss[5] : blood[5], 0.98);
            pen.stipple(bx, by, PURE_WHITE, 0.96);
          }
        }

        drawPixelSkullOrb(pen, 0, 0, 5.8, bone[6], blood[5], 1.0);
        drawStarburstFlare(pen, 0, 0, 12, 0.92, [abyss[4], blood[5], abyss[6], PURE_WHITE]);
      }
    };
  }
};

/** Row 1 (`sy = 208`): Floating Abyssal Skull Wisp & Soul-Fire Shroud (`F00..F29` loop). */
export const abyssalSkullWispCell = {
  duration: 1.0,
  loop: true,
  defaults: { palette: ABYSSAL_VIOLET_PALETTE, seed: 513 },
  create(cfg) {
    const abyss = buildColorRamp(cfg.palette, 8);
    const blood = buildColorRamp(BLOOD_MOON_CRIMSON_PALETTE, 8);
    const bone = buildColorRamp(NECROPOLIS_BONE_PALETTE, 8);
    const rng = new DeterministicRng(cfg.seed);

    return {
      step() {},
      renderFront(pen, localT) {
        const ph = localT * Math.PI * 2;
        const bobY = Math.sin(ph) * 2.5;

        // 1. FBM Soul-Flame Aura Shroud around the Skull Wisp (strictly within [-32, +32])
        pen.shadeBox(-28, -32, 28, 30, (lx, ly, out) => {
          const dy = ly - bobY;
          const rx = 22 * (1 - clamp01((-dy + 12) / 44) * 0.42);
          const d = Math.hypot(lx / Math.max(4, rx), (dy + 4) / 26);
          if (d > 1) return 0;
          const n = fbmNoise2D(lx * 0.16, ly * 0.16 + localT * 6, cfg.seed, 2);
          if (d + n * 0.26 > 0.88) return 0;
          out.color = d < 0.42 ? PURE_WHITE : d < 0.66 ? abyss[5] : blood[4];
          out.alpha = 0.92 * (1 - d * 0.4);
          out.glowColor = blood[5];
          out.glowStrength = 0.34 * (1 - d);
          return out.color;
        });

        // 2. Tilted Soul-Ring & 3 Orbiting Micro-Skulls (r <= 26)
        drawTiltedOrbitBand(
          pen,
          0,
          bobY + 4,
          24,
          0.36,
          1.5,
          0.92,
          [abyss[2], abyss[5], blood[5], PURE_WHITE],
          null,
          false
        );

        for (let k = 0; k < 3; k++) {
          const a = ph + (k * Math.PI * 2) / 3;
          drawPixelSkullOrb(
            pen,
            Math.cos(a) * 24,
            bobY + 4 + Math.sin(a) * 8.5,
            2.6,
            bone[5],
            blood[5],
            0.94
          );
        }

        // 3. Central Horned Abyssal Skull Core & Blazing Eye Sockets
        drawPixelSkullOrb(pen, 0, bobY - 1, 9.2, bone[6], blood[5], 1.0);
        pen.line(-7, bobY - 5, -15, bobY - 16, bone[5], 0.96);
        pen.line(7, bobY - 5, 15, bobY - 16, bone[5], 0.96);

        const arc = buildLightningChain(rng, -16, bobY + 8, 16, bobY - 10, 0.14, 3);
        pen.polyline(arc, blood[5], 0.88);
        drawStarburstFlare(pen, 0, bobY - 1, 11, 0.9, [abyss[4], blood[5], abyss[6], PURE_WHITE]);
      }
    };
  }
};

/** Row 2 (`sy = 416`): Erupting Necrotic Bone Spire & Haunted Gothic Tombstone (`F00..F29` one-shot). */
export const necroticBoneSpireCell = {
  duration: 1.0,
  loop: false,
  defaults: { palette: ABYSSAL_VIOLET_PALETTE, seed: 523 },
  create(cfg) {
    const abyss = buildColorRamp(cfg.palette, 8);
    const blood = buildColorRamp(BLOOD_MOON_CRIMSON_PALETTE, 8);
    const bone = buildColorRamp(NECROPOLIS_BONE_PALETTE, 8);
    const band4 = [abyss[2], abyss[5], blood[5], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);

    return {
      step() {},
      renderFront(pen, localT) {
        const u = clamp01(localT);
        const pop = 0.68 + 0.32 * smoothStep(0, 0.16, u);
        const fade = 1 - smoothStep(0.84, 1.0, u);
        const env = (0.9 + 0.1 * smoothStep(0, 0.12, u)) * fade;
        if (env <= 0.02) return;

        // Strictly inside [-36, +36]
        const baseY = 33;
        const topY = baseY - 65 * pop;
        const halfW = 16;

        // Arched Gothic Tombstone & Carved Necrotic Cross
        pen.shadeBox(-halfW - 4, topY - 3, halfW + 4, baseY + 3, (lx, ly, out) => {
          if (ly > baseY || ly < topY) return 0;
          const archY = topY + 15;
          const maxW =
            ly < archY
              ? Math.sqrt(Math.max(0, 1 - Math.pow((archY - ly) / 15, 2))) * halfW
              : halfW;
          const ax = Math.abs(lx);
          if (ax > maxW) return 0;
          if (ax > maxW - 1.6 || ly < topY + 1.6 || ly > baseY - 1.6) {
            out.color = abyss[0];
            out.alpha = 0.98 * env;
            return out.color;
          }
          const inCrossV = ax < 2.0 && ly > topY + 8 && ly < baseY - 11;
          const inCrossH = Math.abs(ly - (topY + 20)) < 1.8 && ax < 8.5;
          if (inCrossV || inCrossH) {
            out.color = ax < 0.9 ? PURE_WHITE : u > 0.45 ? blood[5] : abyss[5];
            out.alpha = env;
            out.glowColor = blood[5];
            out.glowStrength = 0.46 * env;
            return out.color;
          }
          out.color = lx < 0 ? bone[3] : bone[2];
          out.alpha = 0.96 * env;
          return out.color;
        });

        // Base Soul-Vortex & Grasping Skeletal Bone Spires (r <= 25)
        drawTiltedOrbitBand(pen, 0, baseY - 1, 24 * pop, 0.22, 1.5, 0.94 * env, band4, null, false);
        for (const side of [-1, 1]) {
          const hx = side * 16;
          const hy = baseY - 10 - Math.sin(u * Math.PI * 2 + side) * 3.5;
          pen.line(side * 10, baseY - 1, hx, hy, bone[5], 0.95 * env);
          pen.line(hx, hy, hx - side * 3.5, hy - 5.5, PURE_WHITE, 0.95 * env);
          pen.line(hx, hy, hx + side * 2.5, hy - 6, bone[6], 0.95 * env);
        }

        const bolt = buildLightningChain(rng, -4, baseY - 4, 4, topY + 4, 0.14, 3);
        pen.polyline(bolt, blood[5], 0.86 * env);
        drawPixelSkullOrb(pen, 0, topY + 20, 3.8, bone[6], blood[5], env);
      }
    };
  }
};

/** Row 3 (`sy = 624`): Revolving Thanatos Blood-Moon Pentagram Seal (`F00..F29` loop). */
export const thanatosPentagramSealCell = {
  duration: 1.0,
  loop: true,
  defaults: { palette: ABYSSAL_VIOLET_PALETTE, seed: 533 },
  create(cfg) {
    const abyss = buildColorRamp(cfg.palette, 8);
    const blood = buildColorRamp(BLOOD_MOON_CRIMSON_PALETTE, 8);
    const bone = buildColorRamp(NECROPOLIS_BONE_PALETTE, 8);
    const band4 = [blood[2], abyss[4], blood[5], PURE_WHITE];

    return {
      step() {},
      renderFront(pen, localT) {
        const ph = localT * Math.PI * 2;
        // Strictly inside [-36, +36]
        drawTiltedOrbitBand(pen, 0, 0, 31, 1.0, 1.6, 0.94, band4, null, false);
        drawTiltedOrbitBand(pen, 0, 0, 21, 1.0, 1.2, 0.86, band4, null, false);

        drawThanatosPentagram(pen, 0, 0, 29, 1.0, ph, blood[5], abyss[5], 0.95, null);
        drawThanatosPentagram(pen, 0, 0, 23, 1.0, -ph, PURE_WHITE, blood[5], 0.88, null);

        for (let i = 0; i < 5; i++) {
          const a = ph + (i * Math.PI * 2) / 5;
          drawPixelSkullOrb(
            pen,
            Math.cos(a) * 30,
            Math.sin(a) * 30,
            2.6,
            bone[6],
            blood[5],
            0.96
          );
        }

        drawPixelSkullOrb(pen, 0, 0, 6.2, bone[6], blood[5], 1.0);
        drawStarburstFlare(pen, 0, 0, 12, 0.92, [abyss[4], blood[5], abyss[6], PURE_WHITE]);
      }
    };
  }
};

/** Row 4 (`sy = 832`): Abyssal Reap Crescent Slash & Blood-Moon Nova (`F00..F29` one-shot). */
export const abyssalReapNovaCell = {
  duration: 1.0,
  loop: false,
  defaults: { palette: ABYSSAL_VIOLET_PALETTE, seed: 547 },
  create(cfg) {
    const abyss = buildColorRamp(cfg.palette, 8);
    const blood = buildColorRamp(BLOOD_MOON_CRIMSON_PALETTE, 8);
    const band4 = [blood[2], abyss[4], blood[5], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);

    return {
      step() {},
      renderFront(pen, localT) {
        const u = clamp01(localT);
        const pop = 0.58 + 0.42 * smoothStep(0, 0.2, u);
        const fade = 1 - smoothStep(0.72, 1.0, u);
        const env = (0.9 + 0.1 * smoothStep(0, 0.12, u)) * fade;
        if (env <= 0.02) return;

        // Strictly inside [-36, +36]
        const r = 24 * pop;
        drawTiltedOrbitBand(pen, 0, 0, 28 * pop, 1.0, 1.5, 0.9 * env, band4, null, u < 0.25);

        drawMultiLayerCrescentArc(pen, {
          cx: -2,
          cy: 0,
          radius: r,
          width: 9.0,
          eccentricity: 0.88,
          headAngle: 1.2 + u * 0.45,
          tailAngle: -1.65,
          fade: env,
          ramp: abyss,
          seed: cfg.seed || 547,
          t: u,
          flashHot: u < 0.35
        });

        drawMultiLayerCrescentArc(pen, {
          cx: 0,
          cy: 0,
          radius: r * 0.88,
          width: 7.5,
          eccentricity: 0.88,
          headAngle: -1.1 - u * 0.45,
          tailAngle: 1.55,
          fade: env * 0.92,
          ramp: blood,
          seed: (cfg.seed || 547) + 23,
          t: u,
          flashHot: u < 0.35
        });

        const bolt = buildLightningChain(rng, -22 * pop, -18 * pop, 22 * pop, 18 * pop, 0.14, 3);
        pen.polyline(bolt, PURE_WHITE, 0.9 * env);
        drawStarburstFlare(pen, 4, 0, 13 * env, 0.95 * env, [abyss[4], blood[5], abyss[6], PURE_WHITE]);
      }
    };
  }
};

export const ABYSSAL_EFFECT_REGISTRY = {
  abyssalWraithMantle,
  soulHarvestScytheArc,
  skeletalChainTetherBeam,
  necroticGraveyardSigil,
  deathAvatarCathedral,
  soulScytheWaveCell,
  abyssalSkullWispCell,
  necroticBoneSpireCell,
  thanatosPentagramSealCell,
  abyssalReapNovaCell
};
