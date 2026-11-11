/**
 * First-Party HD-2D Crimson-Gold Valkyrie & Valhalla Gungnir Shader Suite for ArcaneShaderFX.
 * Authored natively for Arcane vs. Steel (`Freyja` / `valkyrie`).
 *
 * Features:
 *  - Dual-buffer (`albedo` + additive `emissive`) cel-stepped crimson-ruby & Valhalla-gold ramps
 *  - True 2.5D `back` + `front` wraparound Dragonfire Obelisk pillars, Valhalla Star-Cross seals, and Gungnir halos
 *  - 6-pinion feathered Crimson-Gold Valkyrie Light-Wings, 3D Mach shock-rings, and 120Hz feather/lightning physics
 *  - Single-slot arena-wide Bezier Gungnir Light-Javelin volley rasterizer (`gungnirBezierVolley`)
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
  buildLightningChain,
  drawTiltedOrbitBand,
  drawStarburstFlare,
  MotePool
} from '../ArcaneShaderFX.js?v=30fps64';

const TWO_PI = Math.PI * 2;

export const VALKYRIE_CRIMSON_PALETTE = [
  '#1a050b',
  '#4c0519',
  '#9f1239',
  '#e11d48',
  '#f43f5e',
  '#fb7185',
  '#fde047',
  '#ffffff'
];

export const VALKYRIE_GOLD_PALETTE = [
  '#1c0a05',
  '#78350f',
  '#b45309',
  '#e11d48',
  '#f59e0b',
  '#fbbf24',
  '#fef08a',
  '#ffffff'
];

// ============================================================================
// Shared Valkyrie & Norse Geometry Primitives
// ============================================================================

/** Draw a crisp oriented 6-pixel golden-crimson Valkyrie wing-feather in local shader coordinates. */
function drawValkyrieFeather(pen, cx, cy, angle, quillCol, vaneCol, alpha = 1) {
  if (alpha <= 0.03) return;
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  pen.stipple(cx, cy, PURE_WHITE, alpha);
  pen.stipple(cx + ca * 1.25, cy + sa * 1.25, quillCol, alpha);
  pen.stipple(cx - ca * 1.25, cy - sa * 1.25, vaneCol, alpha * 0.92);
  pen.stipple(cx - ca * 2.2, cy - sa * 2.2, vaneCol, alpha * 0.78);
  pen.stipple(cx - sa * 0.9 - ca * 0.3, cy + ca * 0.9 - sa * 0.3, quillCol, alpha * 0.88);
  pen.stipple(cx + sa * 0.9 - ca * 0.3, cy - ca * 0.9 - sa * 0.3, vaneCol, alpha * 0.88);
}

/** Draw an 8-point Norse Valhalla Star-Cross & rune diamond on a foreshortened (`aspectY`) or flat (`1`) plane. */
function drawValhallaStarCross(
  pen,
  cx,
  cy,
  rOuter,
  rInner,
  aspectY,
  rot,
  colMain,
  colGold,
  alpha,
  pred = null
) {
  if (rOuter <= 1.5 || alpha <= 0.03) return;
  const points = 8;
  for (let i = 0; i < points * 2; i++) {
    const a0 = rot + (i * Math.PI) / points;
    const a1 = rot + ((i + 1) * Math.PI) / points;
    const midA = (a0 + a1) * 0.5;
    if (pred && !pred(midA)) continue;
    const r0 = i % 2 === 0 ? rOuter : rInner;
    const r1 = i % 2 === 0 ? rInner : rOuter;
    const x0 = cx + Math.cos(a0) * r0;
    const y0 = cy + Math.sin(a0) * r0 * aspectY;
    const x1 = cx + Math.cos(a1) * r1;
    const y1 = cy + Math.sin(a1) * r1 * aspectY;
    const isCardinal = i % 4 === 0 || i % 4 === 3;
    pen.line(x0, y0, x1, y1, isCardinal ? colGold : colMain, alpha);
    if (i % 2 === 0) {
      pen.stipple(x0, y0, i % 4 === 0 ? PURE_WHITE : colGold, alpha);
    }
  }
}

/** Draw a 3D perspective supersonic Mach shock-ring perpendicular to unit vector `(ux, uy)`. */
function drawOrientedMachRing(
  pen,
  cx,
  cy,
  ux,
  uy,
  radius,
  squash,
  thickness,
  colCore,
  colEdge,
  alpha,
  halfPred = null
) {
  if (radius <= 0.8 || alpha <= 0.03) return;
  const nx = -uy;
  const ny = ux;
  const steps = Math.max(24, Math.ceil(radius * 4.5));
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * TWO_PI;
    if (halfPred && !halfPred(a)) continue;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const px = cx + ux * (ca * radius * squash) + nx * (sa * radius);
    const py = cy + uy * (ca * radius * squash) + ny * (sa * radius);
    const frontness = (ca + 1) * 0.5;
    const col = frontness > 0.68 ? PURE_WHITE : frontness > 0.35 ? colCore : colEdge;
    pen.stipple(px, py, col, alpha * (0.55 + 0.45 * frontness));
    if (thickness > 1.2) {
      pen.stipple(px - ux * 0.75, py - uy * 0.75, colEdge, alpha * 0.65);
    }
  }
}

/** Render a razor-sharp cel-stepped crimson-gold crescent spear wave oriented toward `aimAngle`. */
function renderDragonfireCrescentArc(pen, cx, cy, aimAngle, radius, spanAngle, maxThick, age, ramp) {
  if (radius <= 1.5 || maxThick <= 0.3) return;
  const steps = ramp.length;
  const halfSpan = spanAngle * 0.5;
  const bound = radius + maxThick + 3;
  const cosA = Math.cos(aimAngle);
  const sinA = Math.sin(aimAngle);

  pen.shadeBox(cx - bound, cy - bound, cx + bound, cy + bound, (px, py, out) => {
    const dx = px - cx;
    const dy = py - cy;
    const lx = dx * cosA + dy * sinA;
    const ly = (-dx * sinA + dy * cosA) * 0.84;
    const dist = Math.hypot(lx, ly);
    if (dist > radius + 0.6 || dist < radius - maxThick - 1.2) return 0;

    const ang = Math.atan2(ly, lx);
    const absAng = Math.abs(ang);
    if (absAng > halfSpan) return 0;

    const tipTaper = Math.cos((absAng / halfSpan) * Math.PI * 0.5);
    const localW = maxThick * Math.pow(Math.max(0, tipTaper), 0.7);
    if (localW < 0.35) return 0;

    const outerDist = radius - dist;
    if (outerDist < -0.4 || outerDist > localW) return 0;
    const across = clamp01(outerDist / localW);

    out.alpha = clamp01((1 - age * 0.84) * Math.min(1, tipTaper * 1.85));
    if (across < 0.24 && age < 0.44) {
      out.glowStrength = 0.32 * (1 - age);
      out.glowColor = ramp[steps - 2];
      return PURE_WHITE;
    }
    const idx = clampRange(
      Math.round((1 - across) * (steps - 1) - age * 1.85 + tipTaper * 0.6),
      1,
      steps - 1
    );
    out.glowStrength = 0.18 * (1 - across) * (1 - age);
    out.glowColor = ramp[Math.min(steps - 1, idx + 1)];
    return ramp[idx];
  });
}

/** Draw a crisp winged Gungnir Light-Javelin centered at `(cx, cy)` pointing along unit `(ux, uy)`. */
function drawPixelGungnirSpear(pen, cx, cy, ux, uy, halfLen, ramp, alpha = 1, isUlt = false) {
  if (alpha <= 0.04) return;
  const nx = -uy;
  const ny = ux;
  const tailX = cx - ux * halfLen;
  const tailY = cy - uy * halfLen;
  const tipX = cx + ux * halfLen;
  const tipY = cy + uy * halfLen;

  // Crimson-gold shaft + incandescent white core
  pen.line(tailX, tailY, tipX - ux * 2, tipY - uy * 2, ramp[4], alpha * 0.92);
  pen.line(
    tailX + nx * 0.8,
    tailY + ny * 0.8,
    tipX - ux * 4 + nx * 0.8,
    tipY - uy * 4 + ny * 0.8,
    ramp[6],
    alpha * 0.9
  );
  pen.line(
    tailX - nx * 0.8,
    tailY - ny * 0.8,
    tipX - ux * 4 - nx * 0.8,
    tipY - uy * 4 - ny * 0.8,
    ramp[3],
    alpha * 0.88
  );
  pen.line(tailX + ux * 2, tailY + uy * 2, tipX, tipY, PURE_WHITE, alpha);

  // Swept Valkyrie Wing-Crossguard behind the spearhead
  const guardDist = halfLen * 0.22;
  const gx = cx + ux * guardDist;
  const gy = cy + uy * guardDist;
  const wingW = isUlt ? 5.2 : 4.2;
  for (const s of [-1, 1]) {
    const wx = gx - ux * 3.5 + nx * s * wingW;
    const wy = gy - uy * 3.5 + ny * s * wingW;
    pen.line(gx + ux * 1.5, gy + uy * 1.5, wx, wy, ramp[6], alpha);
    pen.line(gx - ux * 1.2, gy - uy * 1.2, wx - ux * 1.5, wy - uy * 1.5, ramp[4], alpha * 0.92);
    pen.stipple(wx, wy, PURE_WHITE, alpha);
  }

  // Faceted Diamond Gungnir Spearhead
  const headBase = cx + ux * (halfLen * 0.34);
  const headBaseY = cy + uy * (halfLen * 0.34);
  const barbW = isUlt ? 3.0 : 2.3;
  pen.line(headBase + nx * barbW, headBaseY + ny * barbW, tipX, tipY, ramp[6], alpha);
  pen.line(headBase - nx * barbW, headBaseY - ny * barbW, tipX, tipY, ramp[6], alpha);
  pen.stipple(tipX, tipY, PURE_WHITE, alpha);
  pen.radialGlow(tipX - ux * 2, tipY - uy * 2, isUlt ? 8.5 : 6.5, ramp[5], 0.36 * alpha);
}

// ============================================================================
// 1. GUNGNIR SPEAR-TIP RUNE FOCUS (`gungnirSpearFocus`)
// ============================================================================
export const gungnirSpearFocus = {
  duration: 0.36,
  loop: false,
  defaults: {
    palette: VALKYRIE_CRIMSON_PALETTE,
    radius: 19,
    seed: 13
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, ramp[6], ramp[4], ramp[3]] });
    let t = 0;
    let emitAcc = 0;

    return {
      step(dt) {
        t += dt;
        emitAcc += dt;
        if (t < 0.30) {
          while (emitAcc >= 0.026) {
            emitAcc -= 0.026;
            const a = rng.between(0, TWO_PI);
            const dist = (cfg.radius || 19) * rng.between(0.7, 1.2);
            const life = rng.between(0.1, 0.17);
            const spd = dist / life;
            motes.emit(
              'streak',
              Math.cos(a) * dist,
              Math.sin(a) * dist,
              -Math.cos(a) * spd - Math.sin(a) * 28,
              -Math.sin(a) * spd + Math.cos(a) * 28,
              life,
              rng.chance(0.5) ? ramp[6] : ramp[4]
            );
          }
        }
        motes.step(dt);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.36);
        const fade = u > 0.82 ? (1 - u) / 0.18 : Math.min(1, u / 0.15);
        if (fade <= 0.03) return;

        const r = mixScalar(cfg.radius || 19, 3.0, Easing.inQuad(u));
        drawValhallaStarCross(pen, 0, 0, r, r * 0.46, 1.0, t * 9.5, ramp[4], ramp[6], 0.82 * fade);
        pen.glowRing(0, 0, r * 0.85, 3.2, ramp[4], 0.26 * fade);
        drawStarburstFlare(pen, 0, 0, (4.0 + 7.5 * u) * fade, (0.6 + 0.4 * u) * fade, ramp);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 2. GUNGNIR SPEAR THRUST & JAVELIN MACH-CONE (`gungnirSpearThrustCone`)
// ============================================================================
export const gungnirSpearThrustCone = {
  duration: 0.42,
  loop: false,
  defaults: {
    palette: VALKYRIE_CRIMSON_PALETTE,
    aimAngle: 0,
    radius: 26,
    twin: false,
    seed: 19
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, ramp[6], ramp[5], ramp[3]] });
    const aim = cfg.aimAngle ?? 0;
    const ux = Math.cos(aim);
    const uy = Math.sin(aim);
    const nx = -uy;
    const ny = ux;

    let t = 0;
    let emitted = false;

    const feathers = Array.from({ length: 6 }, (_, i) => ({
      ang: aim + rng.between(-0.62, 0.62),
      spd: rng.between(90, 205),
      spin: rng.between(-12, 12),
      rot0: (i * Math.PI) / 3,
      life: rng.between(0.24, 0.4)
    }));

    return {
      step(dt) {
        t += dt;
        if (!emitted) {
          emitted = true;
          const count = cfg.twin ? 22 : 14;
          for (let i = 0; i < count; i++) {
            const a = aim + rng.between(-0.72, 0.72);
            const sp = rng.between(120, 300);
            motes.emit(
              i % 3 === 0 ? 'streak' : 'spark',
              ux * 3,
              uy * 3,
              Math.cos(a) * sp,
              Math.sin(a) * sp,
              rng.between(0.14, 0.32),
              rng.chance(0.5) ? ramp[6] : ramp[4],
              1,
              55
            );
          }
        }
        motes.step(dt);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.42);
        const fade = 1 - u * u;
        if (fade <= 0.03) return;

        // 1.Piercing Supersonic Gungnir Spear-Needle Streak along `aimAngle`
        if (u < 0.52) {
          const ku = 1 - u / 0.52;
          const needleL = (cfg.twin ? 38 : 28) * Easing.outExpo(Math.min(1, u * 3.2));
          pen.line(-ux * 4, -uy * 4, ux * needleL, uy * needleL, PURE_WHITE, ku);
          pen.line(
            nx * 1.3,
            ny * 1.3,
            ux * needleL * 0.88 + nx * 0.6,
            uy * needleL * 0.88 + ny * 0.6,
            ramp[6],
            ku * 0.92
          );
          pen.line(
            -nx * 1.3,
            -ny * 1.3,
            ux * needleL * 0.88 - nx * 0.6,
            uy * needleL * 0.88 - ny * 0.6,
            ramp[4],
            ku * 0.92
          );

          // V-shaped supersonic Mach vapor cone peeling off the spear tip
          const tipX = ux * needleL;
          const tipY = uy * needleL;
          const coneLen = 18 + 10 * u;
          const coneSpread = 7 + 8 * u;
          pen.line(
            tipX,
            tipY,
            tipX - ux * coneLen + nx * coneSpread,
            tipY - uy * coneLen + ny * coneSpread,
            ramp[6],
            ku * 0.86
          );
          pen.line(
            tipX,
            tipY,
            tipX - ux * coneLen - nx * coneSpread,
            tipY - uy * coneLen - ny * coneSpread,
            ramp[4],
            ku * 0.86
          );
        }

        // 2. Expanding Dragonfire Crescent Wave
        const arcR = 8 + (cfg.radius || 26) * Easing.outExpo(clamp01(t / 0.28));
        const thick = Math.max(0.8, (cfg.twin ? 8.6 : 6.8) * (1 - smoothStep(0.12, 0.42, t)));
        renderDragonfireCrescentArc(pen, ux * 4, uy * 4, aim, arcR, 2.0, thick, u, ramp);

        if (cfg.twin && u > 0.05) {
          const u2 = clamp01((t - 0.03) / 0.36);
          const arcR2 = 6 + (cfg.radius || 26) * 0.78 * Easing.outExpo(u2);
          renderDragonfireCrescentArc(pen, -ux * 2, -uy * 2, aim, arcR2, 1.72, thick * 0.68, u2, ramp);
        }

        // 3. Twin 3D Perspective Supersonic Mach Shock-Rings
        const ring1U = clamp01(t / 0.32);
        if (ring1U < 1) {
          const d1 = 5 + 18 * Easing.outCubic(ring1U);
          const r1 = 5 + 15 * Easing.outExpo(ring1U);
          drawOrientedMachRing(
            pen,
            ux * d1,
            uy * d1,
            ux,
            uy,
            r1,
            0.34,
            1.8,
            ramp[6],
            ramp[4],
            (1 - ring1U) * 0.95
          );
        }

        const ring2U = clamp01((t - 0.04) / 0.32);
        if (t >= 0.04 && ring2U < 1) {
          const d2 = 12 + 25 * Easing.outCubic(ring2U);
          const r2 = 4 + 11 * Easing.outExpo(ring2U);
          drawOrientedMachRing(
            pen,
            ux * d2,
            uy * d2,
            ux,
            uy,
            r2,
            0.34,
            1.4,
            ramp[5],
            ramp[3],
            (1 - ring2U) * 0.88
          );
        }

        // 4. Muzzle Starburst + Shedding Golden-Crimson Valkyrie Feathers
        if (t < 0.17) {
          const fk = 1 - t / 0.17;
          drawStarburstFlare(pen, ux * 3, uy * 3, 17 * fk, 0.94 * fk, ramp);
        }

        for (let i = 0; i < feathers.length; i++) {
          const ft = feathers[i];
          if (t >= ft.life) continue;
          const fu = t / ft.life;
          const dist = ft.spd * t * (1 - 0.32 * fu);
          drawValkyrieFeather(
            pen,
            Math.cos(ft.ang) * dist,
            Math.sin(ft.ang) * dist,
            ft.rot0 + ft.spin * t,
            ramp[6],
            ramp[4],
            1 - fu
          );
        }

        pen.radialGlow(ux * 9, uy * 9, 23 * fade, ramp[4], 0.44 * fade);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 3. VALKYRIE 6-PINION LIGHT-WING PLUME (`valkyrieWingPlume`) — Back Layer
// ============================================================================
export const valkyrieWingPlume = {
  duration: 1.6,
  loop: false,
  defaults: {
    palette: VALKYRIE_CRIMSON_PALETTE,
    wingSpan: 31,
    seed: 29
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, ramp[6], ramp[4], ramp[3]] });
    let t = 0;
    let emitAcc = 0;

    // 6 majestic Valkyrie light-pinions fanning backward (`-X`) and upward (`-Y`) from Freyja's shoulders
    const pinions = [
      { ang: -2.35, len: 1.08, width: 3.3 },
      { ang: -2.62, len: 0.96, width: 3.0 },
      { ang: -2.88, len: 0.84, width: 2.6 },
      { ang: 3.06, len: 0.74, width: 2.3 },
      { ang: 2.78, len: 0.64, width: 2.0 },
      { ang: -2.08, len: 0.8, width: 2.4 }
    ];

    return {
      step(dt) {
        t += dt;
        emitAcc += dt;
        if (t < 1.38) {
          while (emitAcc >= 0.034) {
            emitAcc -= 0.034;
            const p = rng.pick(pinions);
            const r = (cfg.wingSpan || 31) * p.len * rng.between(0.45, 1.0);
            motes.emit(
              rng.chance(0.55) ? 'glint' : 'orb',
              Math.cos(p.ang) * r,
              Math.sin(p.ang) * r,
              rng.between(-36, -8),
              rng.between(-24, 22),
              rng.between(0.2, 0.42),
              rng.chance(0.55) ? ramp[6] : ramp[4],
              0.72,
              -16
            );
          }
        }
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 1.6);
        const unfurl = Easing.outBack(clamp01(t / 0.2), 1.45);
        const fade = u > 0.84 ? (1 - u) / 0.16 : 1;
        if (fade <= 0.03) return;

        const span = (cfg.wingSpan || 31) * unfurl;
        const flap = Math.sin(t * 10.5) * 0.09;

        for (let pIdx = 0; pIdx < pinions.length; pIdx++) {
          const p = pinions[pIdx];
          const a = p.ang + flap * (1 + pIdx * 0.12);
          const ux = Math.cos(a);
          const uy = Math.sin(a);
          const nx = -uy;
          const ny = ux;
          const pLen = span * p.len;
          const steps = Math.ceil(pLen * 1.8);

          for (let s = 0; s <= steps; s++) {
            const v = s / Math.max(1, steps);
            const d = v * pLen;
            const halfW = p.width * Math.sin(Math.pow(v, 0.62) * Math.PI) * fade;
            const cx = ux * d;
            const cy = uy * d;
            for (let q = -halfW; q <= halfW; q += 0.6) {
              const edgeFrac = Math.abs(q) / Math.max(0.35, halfW);
              const shimmer = fbmNoise2D(d * 0.22 - t * 6.5, pIdx * 3.3 + q, cfg.seed);
              const val = (1 - v * 0.42) - edgeFrac * 0.54 + shimmer * 0.18;
              const col =
                val > 0.74
                  ? PURE_WHITE
                  : val > 0.5
                    ? ramp[6]
                    : val > 0.28
                      ? ramp[4]
                      : ramp[2];
              pen.stipple(cx + nx * q, cy + ny * q, col, fade * (0.95 - v * 0.18));
            }
          }
          pen.stipple(ux * pLen, uy * pLen, PURE_WHITE, fade);
          pen.radialGlow(ux * pLen * 0.65, uy * pLen * 0.65, 8.5, ramp[4], 0.25 * fade);
        }

        drawStarburstFlare(pen, 0, -2, 11.5 * fade, 0.8 * fade, ramp);
        pen.radialGlow(-7, -6, 22 * fade, ramp[4], 0.42 * fade);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 4. VALKYRIE WING-SKIM & BACKFLIP SLIPSTREAM (`valkyrieSlipstreamTrail`)
// ============================================================================
export const valkyrieSlipstreamTrail = {
  duration: 0.9,
  loop: true,
  defaults: {
    palette: VALKYRIE_CRIMSON_PALETTE,
    length: 28,
    tilt: -0.1,
    seed: 37
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, ramp[6], ramp[4], ramp[3]] });
    let totalT = 0;
    let emitAcc = 0;

    return {
      step(dt) {
        totalT += dt;
        emitAcc += dt;
        while (emitAcc >= 0.025) {
          emitAcc -= 0.025;
          motes.emit(
            rng.chance(0.45) ? 'glint' : 'streak',
            rng.between(-6, 2),
            rng.between(-11, 11),
            -rng.between(80, 175),
            rng.between(-18, 22),
            rng.between(0.14, 0.28),
            rng.chance(0.5) ? ramp[6] : ramp[4]
          );
        }
        motes.step(dt);
      },
      renderBack(pen) {
        const len = cfg.length ?? 28;
        const tiltSin = Math.sin(cfg.tilt ?? -0.1);
        for (let strand = 0; strand < 2; strand++) {
          const phaseOff = strand * Math.PI;
          let prevX = 0;
          let prevY = 0;
          for (let i = 0; i <= 18; i++) {
            const u = i / 18;
            const x = -u * len;
            const wave = Math.sin(u * 6.8 - totalT * 19 + phaseOff) * (2.6 + u * 4.8);
            const y = u * len * tiltSin + wave + (strand === 0 ? -2.2 : 2.2);
            if (i > 0) {
              const col =
                strand === 0 ? (u < 0.35 ? PURE_WHITE : ramp[6]) : u < 0.35 ? ramp[5] : ramp[3];
              pen.line(prevX, prevY, x, y, col, (1 - u * 0.78) * 0.94);
            }
            if (i % 5 === 2) {
              drawValkyrieFeather(
                pen,
                x,
                y,
                -totalT * 11 + i,
                ramp[6],
                ramp[4],
                (1 - u) * 0.92
              );
            }
            prevX = x;
            prevY = y;
          }
        }
        pen.radialGlow(-7, 0, 13, ramp[4], 0.36);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 5. VALHALLA 2.5D GROUND LAUNCH/LAND BURST (`valhallaGroundBurst`)
// ============================================================================
export const valhallaGroundBurst = {
  duration: 0.42,
  loop: false,
  defaults: {
    palette: VALKYRIE_CRIMSON_PALETTE,
    radius: 28,
    seed: 43
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, ramp[6], ramp[4]], floorY: 0 });
    let t = 0;
    let emitted = false;

    return {
      step(dt) {
        t += dt;
        if (!emitted) {
          emitted = true;
          for (let i = 0; i < 15; i++) {
            const a = -Math.PI * 0.5 + rng.between(-1.18, 1.18);
            const sp = rng.between(70, 185);
            motes.emit(
              i % 3 === 0 ? 'glint' : 'spark',
              rng.between(-9, 9),
              -2,
              Math.cos(a) * sp,
              Math.sin(a) * sp,
              rng.between(0.16, 0.35),
              rng.chance(0.5) ? ramp[6] : ramp[4],
              1,
              95
            );
          }
        }
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 0.42);
        const fade = 1 - u;
        if (fade <= 0.04) return;
        const rx = 7 + (cfg.radius || 28) * Easing.outExpo(u);
        const backPred = (ang) => Math.sin(ang) < 0;
        drawTiltedOrbitBand(
          pen,
          0,
          0,
          rx,
          0.22,
          1.7,
          0.86 * fade,
          [ramp[1], ramp[3], ramp[4], ramp[6]],
          backPred,
          u < 0.18
        );
        drawValhallaStarCross(
          pen,
          0,
          0,
          rx * 0.9,
          rx * 0.46,
          0.22,
          u * 2.2,
          ramp[4],
          ramp[6],
          0.72 * fade,
          backPred
        );
      },
      renderFront(pen) {
        const u = clamp01(t / 0.42);
        const fade = 1 - u;
        if (fade <= 0.04) return;
        const rx = 7 + (cfg.radius || 28) * Easing.outExpo(u);
        const frontPred = (ang) => Math.sin(ang) >= 0;
        drawTiltedOrbitBand(
          pen,
          0,
          0,
          rx,
          0.22,
          1.85,
          0.96 * fade,
          [ramp[1], ramp[3], ramp[6], PURE_WHITE],
          frontPred,
          u < 0.18
        );
        drawValhallaStarCross(
          pen,
          0,
          0,
          rx * 0.9,
          rx * 0.46,
          0.22,
          u * 2.2,
          ramp[4],
          ramp[6],
          0.88 * fade,
          frontPred
        );

        for (let i = 0; i < 4; i++) {
          const h = (u * 28 + i * 7) % 30;
          const wr = (1 - h / 32) * rx * 0.5;
          const a = t * 18 + i * 1.57;
          drawValkyrieFeather(pen, Math.cos(a) * wr, -h, a, ramp[6], ramp[4], fade * 0.92);
        }
        pen.radialGlow(0, -4, 17 * fade, ramp[4], 0.4 * fade);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 6. VALHALLA 2.5D TARGET LOCK RETICLE & SANCTUARY SEAL (`valhallaTargetReticle`)
// ============================================================================
export const valhallaTargetReticle = {
  duration: 0.95,
  loop: false,
  defaults: {
    palette: VALKYRIE_GOLD_PALETTE,
    radius: 34,
    beaconH: 48,
    seed: 53
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    let t = 0;

    const renderSealPass = (pen, isFront) => {
      const dur = cfg.duration || 0.95;
      const u = clamp01(t / dur);
      const deploy = Easing.outCubic(clamp01(t / 0.15));
      const fade = u > 0.78 ? (1 - u) / 0.22 : 1;
      if (fade <= 0.03) return;

      const rx = (cfg.radius || 34) * deploy;
      const rot = t * 3.1;
      const pred = (ang) => (Math.sin(ang) >= 0) === isFront;

      drawTiltedOrbitBand(
        pen,
        0,
        0,
        rx,
        0.22,
        1.7,
        (isFront ? 0.94 : 0.68) * fade,
        [ramp[1], ramp[3], ramp[5], ramp[6]],
        pred,
        t < 0.12
      );
      drawTiltedOrbitBand(
        pen,
        0,
        0,
        rx * 0.62,
        0.22,
        1.2,
        (isFront ? 0.84 : 0.56) * fade,
        [ramp[1], ramp[3], ramp[4], ramp[6]],
        pred,
        false
      );
      drawValhallaStarCross(
        pen,
        0,
        0,
        rx * 0.96,
        rx * 0.48,
        0.22,
        -rot * 0.85,
        ramp[3],
        ramp[6],
        (isFront ? 0.92 : 0.64) * fade,
        pred
      );

      // 4 orbiting golden-crimson rune pillars rising around the Valhalla seal
      const bh = (cfg.beaconH || 48) * fade;
      for (let i = 0; i < 4; i++) {
        const a = rot * 1.15 + (i * TWO_PI) / 4;
        const sinA = Math.sin(a);
        if ((sinA >= 0) !== isFront) continue;
        const bx = Math.cos(a) * rx * 0.88;
        const by = sinA * rx * 0.22 * 0.88;
        pen.line(bx, by, bx, by - bh * 0.42, i % 2 === 0 ? ramp[6] : ramp[4], 0.72 * fade);
        const moteY = by - ((t * 58 + i * 13) % Math.max(8, bh));
        pen.stipple(bx, moteY, PURE_WHITE, 0.95 * fade);
        pen.radialGlow(bx, moteY, 5, ramp[5], 0.22 * fade);
      }

      if (isFront) {
        pen.radialGlow(0, -2, rx * 0.55, ramp[4], 0.26 * fade);
      }
    };

    return {
      step(dt) {
        t += dt;
      },
      renderBack(pen) {
        renderSealPass(pen, false);
      },
      renderFront(pen) {
        renderSealPass(pen, true);
      }
    };
  }
};

// ============================================================================
// 7. VALKYRIE FLOATING GUNGNIR RUNE HALO (`valkyrieHaloArray`) — 2.5D Back + Front
// ============================================================================
export const valkyrieHaloArray = {
  duration: 0.95,
  loop: true,
  defaults: {
    palette: VALKYRIE_CRIMSON_PALETTE,
    rx: 24,
    ry: 13,
    seed: 59
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    let totalT = 0;

    const renderHaloPass = (pen, isFront) => {
      const deploy = Easing.outCubic(clamp01(totalT / 0.14));
      const rx = (cfg.rx || 24) * deploy;
      const ry = (cfg.ry || 13) * deploy;
      if (rx < 3) return;

      const phase = totalT * 4.2;
      const pred = (ang) => (Math.sin(ang) >= 0) === isFront;

      // Tilted golden-crimson halo ring framing Freyja's torso & shoulders
      drawTiltedOrbitBand(
        pen,
        0,
        0,
        rx,
        ry / rx,
        1.3,
        isFront ? 0.84 : 0.62,
        [ramp[1], ramp[3], ramp[4], ramp[6]],
        pred,
        totalT < 0.08
      );

      // 6 orbiting miniature Gungnir rune-spears & star-nodes
      for (let i = 0; i < 6; i++) {
        const a = phase + (i * TWO_PI) / 6;
        const sinA = Math.sin(a);
        if ((sinA >= 0) !== isFront) continue;
        const hx = Math.cos(a) * rx;
        const hy = sinA * ry;
        const alpha = isFront ? 0.94 : 0.68;
        drawStarburstFlare(pen, hx, hy, 4.2, alpha, ramp);
        // Outward-pointing miniature golden spear-rune
        const outX = Math.cos(a);
        const outY = sinA * 0.55;
        const norm = Math.hypot(outX, outY) || 1;
        pen.line(
          hx - (outX / norm) * 2.5,
          hy - (outY / norm) * 2.5,
          hx + (outX / norm) * 4.5,
          hy + (outY / norm) * 4.5,
          i % 2 === 0 ? PURE_WHITE : ramp[6],
          alpha
        );
      }
    };

    return {
      step(dt) {
        totalT += dt;
      },
      renderBack(pen) {
        renderHaloPass(pen, false);
      },
      renderFront(pen) {
        renderHaloPass(pen, true);
      }
    };
  }
};

// ============================================================================
// 8. DRAGONFIRE OBELISK JUDGMENT PILLAR (`dragonfireObeliskPillar`) — 2.5D Back + Front
// ============================================================================
export const dragonfireObeliskPillar = {
  duration: 0.86,
  loop: false,
  defaults: {
    palette: VALKYRIE_CRIMSON_PALETTE,
    baseRadius: 15,
    height: 82,
    isUltimate: false,
    seed: 67
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, ramp[6], ramp[4]], floorY: 0 });
    let t = 0;
    let emitted = false;

    return {
      step(dt) {
        t += dt;
        if (!emitted) {
          emitted = true;
          const cnt = cfg.isUltimate ? 24 : 16;
          for (let i = 0; i < cnt; i++) {
            const a = -Math.PI * 0.5 + rng.between(-0.85, 0.85);
            const sp = rng.between(95, 255);
            motes.emit(
              i % 3 === 0 ? 'glint' : 'spark',
              rng.between(-10, 10),
              -4,
              Math.cos(a) * sp,
              Math.sin(a) * sp,
              rng.between(0.22, 0.48),
              rng.chance(0.55) ? ramp[6] : ramp[4],
              1.1,
              115
            );
          }
        }
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 0.86);
        const fade = u > 0.7 ? (1 - u) / 0.3 : 1;
        if (fade <= 0.03) return;

        const baseR = (cfg.baseRadius || 15) * (cfg.isUltimate ? 1.25 : 1.0);
        const colH = (cfg.height || 82) * Easing.outExpo(Math.min(1, u * 3.4));
        const backPred = (ang) => Math.sin(ang) < 0;

        drawTiltedOrbitBand(
          pen,
          0,
          0,
          baseR * 1.65,
          0.22,
          1.8,
          0.84 * fade,
          [ramp[1], ramp[3], ramp[4], ramp[6]],
          backPred,
          u < 0.16
        );

        // Back half of twin coiling dragonfire helices wrapping behind the enemy
        for (let rib = 0; rib < 2; rib++) {
          const off = rib * Math.PI;
          for (let h = 0; h <= colH; h += 2) {
            const hf = h / Math.max(1, colH);
            const r = baseR * (1 - hf * 0.38);
            const a = h * 0.14 - t * 16 + off;
            if (Math.sin(a) < 0) {
              pen.stipple(Math.cos(a) * r, -h, rib === 0 ? ramp[4] : ramp[6], 0.76 * fade);
            }
          }
        }
      },
      renderFront(pen) {
        const u = clamp01(t / 0.86);
        const fade = u > 0.7 ? (1 - u) / 0.3 : 1;
        if (fade <= 0.03) return;

        const baseR = (cfg.baseRadius || 15) * (cfg.isUltimate ? 1.25 : 1.0);
        const colH = (cfg.height || 82) * Easing.outExpo(Math.min(1, u * 3.4));
        const frontPred = (ang) => Math.sin(ang) >= 0;

        // 1. Front half of Valhalla Star-Cross crater ring
        drawTiltedOrbitBand(
          pen,
          0,
          0,
          baseR * 1.65,
          0.22,
          2.0,
          0.95 * fade,
          [ramp[1], ramp[4], ramp[6], PURE_WHITE],
          frontPred,
          u < 0.18
        );
        drawValhallaStarCross(
          pen,
          0,
          0,
          baseR * 1.55,
          baseR * 0.76,
          0.22,
          t * 3.8,
          ramp[4],
          ramp[6],
          0.9 * fade,
          frontPred
        );

        // 2. Faceted Dragonfire Plasma Spire Core (tapers cleanly as it fades)
        const coreHalfW = Math.max(1.2, baseR * 0.46 * (1 - smoothStep(0.35, 0.86, u) * 0.75));
        for (let h = 0; h <= colH; h++) {
          const hf = h / Math.max(1, colH);
          const w = coreHalfW * (1 - hf * 0.58);
          for (let dx = -Math.ceil(w); dx <= Math.ceil(w); dx++) {
            const q = Math.abs(dx) / Math.max(0.5, w);
            if (q > 1) continue;
            const col = q < 0.34 ? PURE_WHITE : q < 0.68 ? ramp[6] : ramp[4];
            pen.stipple(dx, -h, col, fade * (0.94 - hf * 0.22));
          }
        }

        // 3. Front half of twin coiling dragonfire helices + ascending Mach ring
        for (let rib = 0; rib < 2; rib++) {
          const off = rib * Math.PI;
          let prevX = 0;
          let prevY = 0;
          let hasPrev = false;
          for (let h = 0; h <= colH; h += 2) {
            const hf = h / Math.max(1, colH);
            const r = baseR * (1 - hf * 0.38);
            const a = h * 0.14 - t * 16 + off;
            if (Math.sin(a) >= 0) {
              const rx = Math.cos(a) * r;
              const ry = -h + Math.sin(a) * r * 0.18;
              if (hasPrev) {
                pen.line(prevX, prevY, rx, ry, rib === 0 ? PURE_WHITE : ramp[6], 0.94 * fade);
              }
              prevX = rx;
              prevY = ry;
              hasPrev = true;
            } else {
              hasPrev = false;
            }
          }
        }

        // 4. Crackling Golden-Crimson Valkyrie Lightning Chains up the Obelisk
        if (u < 0.76) {
          const boltRng = new DeterministicRng(cfg.seed * 19 + Math.floor(t * 28));
          const bolts = cfg.isUltimate ? 2 : 1;
          for (let b = 0; b < bolts; b++) {
            const pts = buildLightningChain(
              boltRng,
              boltRng.between(-baseR * 0.6, baseR * 0.6),
              -2,
              boltRng.between(-baseR * 0.4, baseR * 0.4),
              -colH * 0.92,
              0.22,
              3
            );
            pen.polyline(pts, b === 0 ? PURE_WHITE : ramp[6], 0.88 * fade);
          }
        }

        if (u < 0.32) {
          drawStarburstFlare(pen, 0, -6, 20 * (1 - u / 0.32), 0.96 * fade, ramp);
        }
        pen.radialGlow(0, -colH * 0.38, (cfg.isUltimate ? 28 : 22) * fade, ramp[4], 0.46 * fade);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 9. GUNGNIR PIERCE & LIGHTNING IMPACT STARBURST (`gungnirImpactStarburst`)
// ============================================================================
export const gungnirImpactStarburst = {
  duration: 0.38,
  loop: false,
  defaults: {
    palette: VALKYRIE_CRIMSON_PALETTE,
    aimAngle: 0,
    isCrit: false,
    seed: 73
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, ramp[6], ramp[4]] });
    const aim = cfg.aimAngle ?? 0;
    const ux = Math.cos(aim);
    const uy = Math.sin(aim);
    let t = 0;
    let emitted = false;

    const feathers = Array.from({ length: cfg.isCrit ? 6 : 4 }, (_, i) => ({
      ang: rng.between(0, TWO_PI),
      spd: rng.between(55, 145),
      spin: rng.between(-14, 14),
      rot0: i * 1.2,
      life: rng.between(0.2, 0.35)
    }));

    return {
      step(dt) {
        t += dt;
        if (!emitted) {
          emitted = true;
          const cnt = cfg.isCrit ? 18 : 11;
          for (let i = 0; i < cnt; i++) {
            const a = aim + rng.between(-1.35, 1.35);
            const sp = rng.between(85, 240);
            motes.emit(
              i % 3 === 0 ? 'glint' : 'spark',
              0,
              0,
              Math.cos(a) * sp,
              Math.sin(a) * sp,
              rng.between(0.14, 0.3),
              rng.chance(0.55) ? ramp[6] : ramp[4],
              1,
              85
            );
          }
        }
        motes.step(dt);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.38);
        const fade = 1 - u;
        if (fade <= 0.03) return;

        // Piercing Gungnir cross-lance flash
        if (u < 0.46) {
          const ku = 1 - u / 0.46;
          const streakL = (cfg.isCrit ? 27 : 20) * ku;
          pen.line(-ux * streakL * 0.65, -uy * streakL * 0.65, ux * streakL, uy * streakL, PURE_WHITE, ku);
          pen.line(
            -ux * streakL * 0.45 - uy * 1.2,
            -uy * streakL * 0.45 + ux * 1.2,
            ux * streakL * 0.85 - uy * 1.2,
            uy * streakL * 0.85 + ux * 1.2,
            ramp[6],
            ku * 0.88
          );
        }

        const rRing = 4 + (cfg.isCrit ? 24 : 17) * Easing.outExpo(u);
        pen.strokeRing(0, 0, rRing, Math.max(1, 2.0 * fade), u < 0.26 ? PURE_WHITE : ramp[6], 0.92 * fade);
        if (u < 0.58) {
          const fk = 1 - u / 0.58;
          drawStarburstFlare(pen, 0, 0, (cfg.isCrit ? 22 : 16) * fk, 0.96 * fk, ramp);
        }

        const boltRng = new DeterministicRng(cfg.seed * 23 + Math.floor(t * 30));
        const boltCount = cfg.isCrit ? 3 : 2;
        for (let i = 0; i < boltCount; i++) {
          const a = (i / boltCount) * TWO_PI + boltRng.between(-0.4, 0.4);
          const len = (9 + 12 * fade) * boltRng.between(0.75, 1.15);
          const pts = buildLightningChain(boltRng, 0, 0, Math.cos(a) * len, Math.sin(a) * len, 0.32, 2);
          pen.polyline(pts, i === 0 ? PURE_WHITE : ramp[6], 0.88 * fade);
        }

        for (let i = 0; i < feathers.length; i++) {
          const ft = feathers[i];
          if (t >= ft.life) continue;
          const fu = t / ft.life;
          const d = ft.spd * t * (1 - 0.3 * fu);
          drawValkyrieFeather(
            pen,
            Math.cos(ft.ang) * d,
            Math.sin(ft.ang) * d,
            ft.rot0 + ft.spin * t,
            ramp[6],
            ramp[4],
            1 - fu
          );
        }

        pen.radialGlow(0, 0, (cfg.isCrit ? 24 : 18) * fade, ramp[4], 0.48 * fade);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 10. SINGLE-SLOT ARENA-WIDE BEZIER GUNGNIR JAVELIN VOLLEY (`gungnirBezierVolley`)
//     Renders all live curving `activeSkySpears` + 2.5D ground lock rings in 1 shader slot!
// ============================================================================
export const gungnirBezierVolley = {
  duration: 2.0,
  loop: true,
  defaults: {
    palette: VALKYRIE_CRIMSON_PALETTE,
    spears: null,
    getOrigin: null,
    scale: 3
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    let totalT = 0;

    return {
      step(dt) {
        totalT += dt;
      },
      renderBack(pen) {
        const spears = cfg.spears;
        if (!Array.isArray(spears) || spears.length === 0) return;
        const origin = cfg.getOrigin ? cfg.getOrigin() : { x: 600, y: 580 };
        const invScale = 1 / (cfg.scale || 3);

        for (let i = 0; i < spears.length; i++) {
          const sp = spears[i];
          if (!sp.isUlt) continue;
          const tx = (sp.targetX - origin.x) * invScale;
          const ty = -1;
          drawTiltedOrbitBand(
            pen,
            tx,
            ty,
            11,
            0.24,
            1.2,
            0.74,
            [ramp[1], ramp[3], ramp[4], ramp[6]],
            null,
            false
          );
          drawValhallaStarCross(pen, tx, ty, 10, 4.8, 0.24, totalT * 4 + i, ramp[4], ramp[6], 0.72);
        }
      },
      renderFront(pen) {
        const spears = cfg.spears;
        if (!Array.isArray(spears) || spears.length === 0) return;
        const origin = cfg.getOrigin ? cfg.getOrigin() : { x: 600, y: 580 };
        const invScale = 1 / (cfg.scale || 3);

        for (let i = 0; i < spears.length; i++) {
          const sp = spears[i];
          const cx = (sp.x - origin.x) * invScale;
          const cy = (sp.y - origin.y) * invScale;
          const ux = Math.cos(sp.angle);
          const uy = Math.sin(sp.angle);
          const nx = -uy;
          const ny = ux;

          // 1. Dual-braided Crimson-Ruby & Valhalla-Gold Bezier Slipstream Wake
          if (sp.trail && sp.trail.length >= 2) {
            const nPts = sp.trail.length;
            for (let k = 1; k < nPts; k++) {
              const p0 = sp.trail[k - 1];
              const p1 = sp.trail[k];
              const uSeg = k / (nPts - 1);
              const x0 = (p0.x - origin.x) * invScale;
              const y0 = (p0.y - origin.y) * invScale;
              const x1 = (p1.x - origin.x) * invScale;
              const y1 = (p1.y - origin.y) * invScale;

              // Outer crimson-rose dragonfire ribbon + helical golden thread
              const wave0 = Math.sin((k - 1) * 0.85 - totalT * 24 + sp.spiralPhase) * (1.8 * uSeg);
              const wave1 = Math.sin(k * 0.85 - totalT * 24 + sp.spiralPhase) * (1.8 * uSeg);
              pen.line(
                x0 + nx * wave0,
                y0 + ny * wave0,
                x1 + nx * wave1,
                y1 + ny * wave1,
                uSeg > 0.65 ? ramp[6] : ramp[4],
                uSeg * 0.9
              );
              pen.line(
                x0 - nx * wave0,
                y0 - ny * wave0,
                x1 - nx * wave1,
                y1 - ny * wave1,
                uSeg > 0.72 ? PURE_WHITE : ramp[5],
                uSeg * 0.86
              );
              if (uSeg > 0.45) {
                pen.line(x0, y0, x1, y1, uSeg > 0.8 ? PURE_WHITE : ramp[6], uSeg * 0.95);
              }
            }
          }

          // 2. Oriented 3D Mach Ring around the Gungnir Javelin
          drawOrientedMachRing(
            pen,
            cx - ux * 3,
            cy - uy * 3,
            ux,
            uy,
            sp.isUlt ? 5.8 : 4.6,
            0.34,
            1.2,
            ramp[6],
            ramp[4],
            0.85
          );

          // 3. Crisp Winged Gungnir Light-Javelin Body (`albedo` + `emissive` HDR bloom, zero Mixels!)
          drawPixelGungnirSpear(pen, cx, cy, ux, uy, sp.isUlt ? 13.5 : 11.5, ramp, 1.0, sp.isUlt);
        }
      }
    };
  }
};

// ============================================================================
// 11. BAKED VFX SHEET SHADERS (`104x104 -> 208x208` for `valkyrie_vfx.png`)
// ============================================================================

/** Row 0 (`sy = 0`): Horizontal `+X` Wyvern Spiral Gungnir Lance-Wave (`F00..F29` loop). */
export const wyvernSpiralLanceCell = {
  duration: 0.5,
  loop: true,
  defaults: {
    palette: VALKYRIE_CRIMSON_PALETTE,
    length: 72,
    seed: 83
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    return {
      renderFront(pen, loopT) {
        const phase = (loopT / 0.5) * TWO_PI;
        const halfL = (cfg.length || 72) * 0.5;
        const xTail = -halfL + 4;
        const xTip = halfL + 2;

        // 1. Back half of twin 3D Mach shock-rings
        for (let rIdx = 0; rIdx < 2; rIdx++) {
          const ur = ((loopT / 0.5) * 2 + rIdx * 0.5) % 1;
          const rx = mixScalar(xTip - 14, xTail + 8, ur);
          const rad = 8 + Math.sin(ur * Math.PI) * 10.5;
          drawOrientedMachRing(pen, rx, 0, 1, 0, rad, 0.3, 1.5, ramp[6], ramp[3], 0.84, (a) => Math.cos(a) < 0);
        }

        // 2. Back half of double-helix crimson-gold dragonfire ribbon
        for (let rib = 0; rib < 2; rib++) {
          const rOff = rib * Math.PI;
          for (let x = xTail; x <= xTip - 10; x++) {
            const u = (x - xTail) / Math.max(1, xTip - 10 - xTail);
            const amp = 3.5 + (1 - u) * 7.5;
            const ang = x * 0.21 - phase * 2 + rOff;
            if (Math.cos(ang) < 0) {
              pen.stipple(x, Math.sin(ang) * amp, rib === 0 ? ramp[2] : ramp[4], 0.85);
            }
          }
        }

        // 3. Swept Golden-Crimson Valkyrie Wing-Crossguard (`x = +2 .. +16`)
        for (const s of [-1, 1]) {
          for (let p = 0; p < 3; p++) {
            const bx = 14 - p * 3.5;
            const tx = bx - 12 - p * 2.5;
            const ty = s * (13 - p * 2.6);
            pen.line(bx, s * 2, tx, ty, p === 0 ? PURE_WHITE : ramp[6], 0.96);
            pen.line(bx - 1, s * 2, tx - 1, ty - s * 1.2, ramp[4], 0.9);
          }
        }

        // 4. Luminous Gungnir War-Lance Shaft
        pen.line(xTail + 2, -2, xTip - 14, -2, ramp[2], 0.92);
        pen.line(xTail + 2, -1, xTip - 10, -1, ramp[6], 0.98);
        pen.line(xTail + 2, 0, xTip - 4, 0, PURE_WHITE, 1.0);
        pen.line(xTail + 2, 1, xTip - 10, 1, ramp[6], 0.98);
        pen.line(xTail + 2, 2, xTip - 14, 2, ramp[4], 0.92);

        // 5. Faceted Diamond-Barbed Gungnir Spearhead (`xTip - 22 .. xTip`)
        const barbSpan = Math.max(4.5, 9.5 * (0.62 + 0.38 * Math.abs(Math.sin(phase))));
        for (let x = xTip - 22; x <= xTip; x++) {
          const prog = (x - (xTip - 22)) / 22;
          const w = (1 - prog) * barbSpan;
          for (let dy = -Math.ceil(w); dy <= Math.ceil(w); dy++) {
            if (Math.abs(dy) > w + 0.3) continue;
            if (prog < 0.22 && Math.abs(dy) < w * 0.48) continue;
            const edge = Math.abs(dy) / Math.max(0.5, w);
            const col = edge > 0.76 ? PURE_WHITE : edge > 0.46 ? ramp[6] : ramp[4];
            pen.pixel(x, dy, col);
          }
        }

        // 6. Front half of Mach rings & double-helix dragonfire ribbons
        for (let rIdx = 0; rIdx < 2; rIdx++) {
          const ur = ((loopT / 0.5) * 2 + rIdx * 0.5) % 1;
          const rx = mixScalar(xTip - 14, xTail + 8, ur);
          const rad = 8 + Math.sin(ur * Math.PI) * 10.5;
          drawOrientedMachRing(pen, rx, 0, 1, 0, rad, 0.3, 1.6, ramp[6], ramp[4], 0.96, (a) => Math.cos(a) >= 0);
        }
        for (let rib = 0; rib < 2; rib++) {
          const rOff = rib * Math.PI;
          for (let x = xTail; x <= xTip - 10; x++) {
            const u = (x - xTail) / Math.max(1, xTip - 10 - xTail);
            const amp = 3.5 + (1 - u) * 7.5;
            const ang = x * 0.21 - phase * 2 + rOff;
            if (Math.cos(ang) >= 0) {
              const ry = Math.sin(ang) * amp;
              pen.stipple(x, ry, rib === 0 ? PURE_WHITE : ramp[6], 0.96);
              pen.stipple(x, ry + (ry >= 0 ? 1 : -1), ramp[4], 0.82);
            }
          }
        }

        drawStarburstFlare(pen, xTip - 3, 0, 8.5, 0.92, ramp);
        pen.radialGlow(xTip - 9, 0, 17, ramp[4], 0.46);
        pen.radialGlow(0, 0, 19, ramp[3], 0.28);
      }
    };
  }
};

/**
 * Row 1 (`sy = 208`): Split 30-frame Gungnir Sky-Strike Cell (`VFXManager.js:1506`):
 *   - `F00..F11` (`t < 0.40`): Upright point-down Descending Winged Gungnir Sky-Lance
 *   - `F12..F29` (`t >= 0.40`): Impaled Gungnir War-Lance in a blazing Valhalla Rune Crater (`floorY = +35`)
 */
export const gungnirSkyLanceCell = {
  duration: 1.0,
  loop: false,
  defaults: {
    palette: VALKYRIE_CRIMSON_PALETTE,
    seed: 89
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    return {
      renderFront(pen, t) {
        if (t < 0.395) {
          const phase = ((t / 0.4) * TWO_PI * 2) % TWO_PI;
          const yTop = -38;
          const yTip = 37;

          // Descending upright point-down Gungnir Sky-Lance (`+Y` downward)
          for (let rIdx = 0; rIdx < 2; rIdx++) {
            const ur = ((t / 0.4) * 2 + rIdx * 0.5) % 1;
            const ry = mixScalar(yTip - 14, yTop + 8, ur);
            const rad = 7.5 + Math.sin(ur * Math.PI) * 9.5;
            drawOrientedMachRing(pen, 0, ry, 0, 1, rad, 0.28, 1.5, ramp[6], ramp[4], 0.92);
          }

          // Swept Valkyrie Golden Wings flaring upward from the crossguard (`y = +12`)
          for (const s of [-1, 1]) {
            for (let p = 0; p < 3; p++) {
              const by = 14 - p * 3.5;
              const tx = s * (16 - p * 3.0);
              const ty = by - 14 - p * 2.5;
              pen.line(s * 2, by, tx, ty, p === 0 ? PURE_WHITE : ramp[6], 0.96);
              pen.line(s * 2, by - 1, tx - s * 1.2, ty - 1, ramp[4], 0.9);
            }
          }

          // Vertical Shaft + Double-Helix Dragonfire Wake
          pen.line(-2, yTop, -2, yTip - 14, ramp[3], 0.92);
          pen.line(-1, yTop, -1, yTip - 10, ramp[6], 0.98);
          pen.line(0, yTop, 0, yTip, PURE_WHITE, 1.0);
          pen.line(1, yTop, 1, yTip - 10, ramp[6], 0.98);
          pen.line(2, yTop, 2, yTip - 14, ramp[4], 0.92);

          for (let rib = 0; rib < 2; rib++) {
            const rOff = rib * Math.PI;
            for (let y = yTop; y <= yTip - 12; y++) {
              const u = (y - yTop) / Math.max(1, yTip - 12 - yTop);
              const amp = 3.2 + (1 - u) * 7.0;
              const ang = y * 0.22 - phase + rOff;
              pen.stipple(Math.sin(ang) * amp, y, rib === 0 ? PURE_WHITE : ramp[6], 0.9);
            }
          }

          // Downward Diamond Spearhead (`y = +16 .. +37`)
          for (let y = yTip - 21; y <= yTip; y++) {
            const prog = (y - (yTip - 21)) / 21;
            const w = (1 - prog) * 8.5;
            for (let dx = -Math.ceil(w); dx <= Math.ceil(w); dx++) {
              if (Math.abs(dx) > w + 0.3) continue;
              const edge = Math.abs(dx) / Math.max(0.5, w);
              pen.pixel(dx, y, edge > 0.76 ? PURE_WHITE : edge > 0.45 ? ramp[6] : ramp[4]);
            }
          }

          drawStarburstFlare(pen, 0, yTip - 3, 8.5, 0.92, ramp);
          pen.radialGlow(0, yTip - 10, 18, ramp[4], 0.45);
          return;
        }

        // F12..F29: Impaled Gungnir War-Lance inside Blazing Valhalla Star-Cross Crater (`floorY = +35`)
        const u = clamp01((t - 0.4) / 0.6);
        const fade = u > 0.72 ? (1 - u) / 0.28 : 1;
        const floorY = 35;
        const rx = 10 + 27 * Easing.outExpo(Math.min(1, u * 1.55));

        drawTiltedOrbitBand(
          pen,
          0,
          floorY,
          rx,
          0.22,
          2.0,
          0.96 * fade,
          [ramp[1], ramp[4], ramp[6], PURE_WHITE],
          null,
          u < 0.24
        );
        drawValhallaStarCross(pen, 0, floorY, rx * 0.94, rx * 0.48, 0.22, u * 3.8, ramp[4], ramp[6], 0.92 * fade);

        // Roaring crimson-gold crater plasma geyser column (`floorY` up to `-32`)
        const geyserH = 64 * Easing.outCubic(Math.min(1, u * 2.5));
        const gHalfW = Math.max(1.2, 6.8 * (1 - u * 0.68));
        for (let h = 0; h <= geyserH; h++) {
          const hf = h / Math.max(1, geyserH);
          const w = gHalfW * (1 - hf * 0.58);
          for (let dx = -Math.ceil(w); dx <= Math.ceil(w); dx++) {
            const q = Math.abs(dx) / Math.max(0.5, w);
            if (q > 1) continue;
            const col = q < 0.34 ? PURE_WHITE : q < 0.68 ? ramp[6] : ramp[4];
            pen.stipple(dx, floorY - h, col, fade * (0.9 - hf * 0.25));
          }
          const a = h * 0.22 - u * 18;
          pen.stipple(Math.sin(a) * (w + 4.8), floorY - h, PURE_WHITE, fade * 0.9);
          pen.stipple(-Math.sin(a) * (w + 4.8), floorY - h, ramp[6], fade * 0.88);
        }

        // Impaled upright Gungnir shaft + sculpted Valkyrie Wing-Crossguard rising above the crater
        const shaftTop = -35;
        pen.line(-2, shaftTop + 10, -2, floorY, ramp[3], 0.92 * fade);
        pen.line(-1, shaftTop + 6, -1, floorY, ramp[6], 0.96 * fade);
        pen.line(0, shaftTop, 0, floorY, PURE_WHITE, fade);
        pen.line(1, shaftTop + 6, 1, floorY, ramp[6], 0.96 * fade);
        pen.line(2, shaftTop + 10, 2, floorY, ramp[4], 0.92 * fade);
        for (const s of [-1, 1]) {
          for (let p = 0; p < 3; p++) {
            const by = shaftTop + 16 + p * 3;
            const tx = s * (15 - p * 2.8);
            const ty = by - 11 - p * 1.5;
            pen.line(s * 1.5, by, tx, ty, p === 0 ? PURE_WHITE : ramp[6], 0.95 * fade);
            pen.line(s * 1.5, by + 1, tx - s, ty + 1.5, ramp[4], 0.9 * fade);
          }
        }

        if (u < 0.45) {
          drawStarburstFlare(pen, 0, floorY - 3, 20 * (1 - u / 0.45), 0.96 * fade, ramp);
        }
        pen.radialGlow(0, floorY - 20, 26 * fade, ramp[4], 0.48 * fade);
      }
    };
  }
};

/**
 * Row 2 (`sy = 416`): Erupting Dragonfire Ruby-Gold Obelisk Spire (`F00..F29` one-shot).
 * Consumed by `VFXManager.js:1852` (`isValkyrieObelisk`).
 */
export const dragonfireObeliskCell = {
  duration: 1.0,
  loop: false,
  defaults: {
    palette: VALKYRIE_CRIMSON_PALETTE,
    seed: 91
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    return {
      renderFront(pen, t) {
        const u = clamp01(t);
        const floorY = 40;
        const erupt = Easing.outBack(clamp01(u / 0.22), 1.25);
        const shatterU = clamp01((u - 0.73) / 0.27);
        const fade = 1 - shatterU;

        // Ground Valhalla Rune Seal at `floorY`
        const sealR = 26 * Math.min(1, u * 4.5);
        drawTiltedOrbitBand(
          pen,
          0,
          floorY,
          sealR,
          0.2,
          1.7,
          0.92 * fade,
          [ramp[1], ramp[3], ramp[4], ramp[6]],
          null,
          u < 0.14
        );

        if (shatterU < 0.85) {
          // Towering Faceted Ruby-Gold Obelisk Monolith (`floorY` up to `-38`)
          const spireH = Math.min(78, 76 * erupt) * (1 - shatterU * 0.25);
          const yApex = floorY - spireH;
          const baseHalfW = 14.5;

          for (let y = Math.floor(yApex); y <= floorY; y++) {
            const hf = (floorY - y) / Math.max(1, spireH);
            const halfW = hf > 0.78 ? baseHalfW * 0.56 * ((1 - hf) / 0.22) : mixScalar(baseHalfW, baseHalfW * 0.56, hf / 0.78);
            for (let x = -Math.ceil(halfW); x <= Math.ceil(halfW); x++) {
              if (Math.abs(x) > halfW + 0.25) continue;
              // Dissolve cracks during shatter phase
              if (shatterU > 0.05) {
                const crack = fbmNoise2D(x * 0.35, y * 0.35, cfg.seed);
                if (crack + 0.45 < shatterU * 1.45) continue;
              }
              const isEdge = Math.abs(x) >= halfW - 1.2;
              const isCenterRidge = Math.abs(x) <= 1.2;
              const col = isCenterRidge
                ? PURE_WHITE
                : isEdge
                  ? ramp[6]
                  : x < 0
                    ? ramp[4]
                    : ramp[2];
              pen.stipple(x, y, col, fade);
            }
          }

          // Glowing Golden Valknut Diamond Runes carved down the Obelisk spine
          if (spireH > 38) {
            for (const ryOff of [0.28, 0.54]) {
              const ry = floorY - spireH * ryOff;
              drawValhallaStarCross(pen, 0, ry, 6.5, 2.8, 1.0, Math.PI * 0.25, ramp[6], PURE_WHITE, 0.95 * fade);
            }
          }

          // Coiling Dragonfire Ribbon + Crackling Valkyrie Lightning
          const boltRng = new DeterministicRng(cfg.seed + Math.floor(u * 30));
          const pts = buildLightningChain(boltRng, -6, floorY - 4, 4, yApex + 4, 0.24, 3);
          pen.polyline(pts, ramp[6], 0.9 * fade);
        }

        // Shatter Ruby-Gold Crystal Shards & Feathers (`F22..F29`)
        if (shatterU > 0) {
          for (let s = 0; s < 10; s++) {
            const ang = -Math.PI * 0.5 + ((s - 4.5) / 5) * 1.25;
            const dist = shatterU * (16 + (s % 3) * 9);
            const sx = Math.cos(ang) * dist;
            const sy = floorY - 36 + Math.sin(ang) * dist;
            drawValkyrieFeather(pen, sx, sy, ang + shatterU * 5, ramp[6], ramp[4], fade);
          }
        }

        if (u < 0.24) {
          drawStarburstFlare(pen, 0, floorY - 6, 18 * (1 - u / 0.24), 0.95, ramp);
        }
        pen.radialGlow(0, floorY - 34, 25 * fade, ramp[4], 0.45 * fade);
      }
    };
  }
};

/**
 * Row 3 (`sy = 624`, `vfxCell: 3`): Colossal Bahamut / Valhalla Sovereign Winged Dragon Crest (`F00..F29` loop).
 */
export const bahamutAvatarCell = {
  duration: 1.0,
  loop: true,
  defaults: {
    palette: VALKYRIE_CRIMSON_PALETTE,
    seed: 97
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const wingPinions = [
      { ang: 0.46, len: 39, width: 3.4 },
      { ang: 0.18, len: 36, width: 3.1 },
      { ang: -0.1, len: 32, width: 2.8 },
      { ang: -0.38, len: 27, width: 2.5 },
      { ang: -0.66, len: 22, width: 2.2 }
    ];

    return {
      renderFront(pen, loopT) {
        const phase = loopT * TWO_PI;
        const flap = Math.sin(phase) * 0.08;

        // 1. Rotating Outer 8-Point Valhalla Sovereign Runic Halo (`r = 35`)
        pen.strokeRing(0, 3, 34, 1.4, ramp[2], 0.8);
        pen.strokeRing(0, 3, 27, 1.1, ramp[6], 0.72);
        drawValhallaStarCross(pen, 0, 3, 36, 19, 1.0, phase * 0.25, ramp[4], ramp[6], 0.85);

        // 2. Lush Cel-Shaded 10-Pinion Crimson-Gold Sovereign Dragon-Valkyrie Wings (`x = -42 .. +42`)
        for (const side of [-1, 1]) {
          for (let pIdx = 0; pIdx < wingPinions.length; pIdx++) {
            const p = wingPinions[pIdx];
            const baseAng = side > 0 ? -p.ang - flap : Math.PI + p.ang + flap;
            const ux = Math.cos(baseAng);
            const uy = Math.sin(baseAng);
            const nx = -uy;
            const ny = ux;
            const rootX = side * 6;
            const rootY = -2 + pIdx * 2.2;
            const steps = Math.ceil(p.len * 1.6);

            for (let st = 0; st <= steps; st++) {
              const v = st / steps;
              const d = v * p.len;
              const halfW = p.width * Math.sin(Math.pow(v, 0.62) * Math.PI);
              const cx = rootX + ux * d;
              const cy = rootY + uy * d;
              for (let q = -halfW; q <= halfW; q += 0.65) {
                const edgeFrac = Math.abs(q) / Math.max(0.35, halfW);
                const val = (1 - v * 0.38) - edgeFrac * 0.55;
                const col =
                  val > 0.7
                    ? PURE_WHITE
                    : val > 0.44
                      ? ramp[6]
                      : val > 0.22
                        ? ramp[4]
                        : ramp[2];
                pen.stipple(cx + nx * q, cy + ny * q, col, 0.95);
              }
            }
            pen.stipple(rootX + ux * p.len, rootY + uy * p.len, PURE_WHITE, 1.0);
          }
        }

        // 3. Crowned Bahamut Dragon-Valkyrie Helm, Swept Horns & Sovereign Gungnir Crest
        for (const s of [-1, 1]) {
          pen.line(s * 5, -13, s * 20, -32, ramp[6], 1.0);
          pen.line(s * 4, -12, s * 18, -30, PURE_WHITE, 0.96);
          pen.line(s * 6, -11, s * 16, -26, ramp[4], 0.92);
          pen.line(s * 6, -6, s * 15, -16, ramp[6], 0.92);
        }

        // Sculpted Sovereign Dragon-Crest Shield & Central Vertical Gungnir Spear-Spine
        for (let y = -18; y <= 22; y++) {
          const u = (y + 18) / 40;
          const halfW = u < 0.42 ? mixScalar(5.5, 12.0, u / 0.42) : mixScalar(12.0, 1.5, (u - 0.42) / 0.58);
          for (let x = -Math.ceil(halfW); x <= Math.ceil(halfW); x++) {
            if (Math.abs(x) > halfW) continue;
            const isRim = Math.abs(x) >= halfW - 1.4;
            const isSpine = Math.abs(x) <= 1.2;
            const col = isSpine ? PURE_WHITE : isRim ? ramp[6] : ramp[3];
            pen.pixel(x, y, col);
          }
        }
        pen.line(0, -34, 0, 28, PURE_WHITE, 0.96);
        pen.line(-1, -30, -1, 24, ramp[6], 0.92);
        pen.line(1, -30, 1, 24, ramp[6], 0.92);

        // Fierce glowing Dragon-Valkyrie eyes + roaring central starburst
        pen.line(-8, -6, -3, -4, PURE_WHITE, 1.0);
        pen.line(8, -6, 3, -4, PURE_WHITE, 1.0);
        drawStarburstFlare(pen, 0, 4, 12 + Math.sin(phase * 2) * 2, 0.96, ramp);
        pen.radialGlow(0, 0, 30, ramp[4], 0.5);
      }
    };
  }
};

/**
 * Row 4 (`sy = 832`): Valhalla Dragonfire Crescent Slash & 8-Point Starburst (`F00..F29` one-shot).
 */
export const valhallaCrescentSlashCell = {
  duration: 0.42,
  loop: false,
  defaults: {
    palette: VALKYRIE_CRIMSON_PALETTE,
    radius: 34,
    seed: 101
  },
  create(cfg) {
    const stepFn = gungnirSpearThrustCone.create({
      palette: cfg.palette,
      aimAngle: 0,
      radius: cfg.radius || 34,
      twin: true,
      seed: cfg.seed
    });
    let prevT = 0;
    return {
      step(dt) {
        stepFn.step(dt);
        prevT += dt;
      },
      renderFront(pen, t) {
        if (t > prevT) {
          stepFn.step(t - prevT);
          prevT = t;
        }
        stepFn.renderFront(pen);
      }
    };
  }
};

/**
 * Row 5 (`sy = 1040`): Bifrost Einherjar Target Seal (`F00..F29` seamless 30fps loop).
 * Spinning crimson-gold Nordic Valkyrie rune mandala & lock-on crosshairs.
 */
export const bifrostEinherjarSealCell = {
  duration: 1.0,
  loop: true,
  defaults: {
    palette: VALKYRIE_CRIMSON_PALETTE,
    seed: 109
  },
  create(cfg) {
    const crim = buildColorRamp(cfg.palette, 8);
    const gold = buildColorRamp(VALKYRIE_GOLD_PALETTE, 8);

    return {
      step() {},
      renderFront(pen, loopT) {
        const ph = loopT * TWO_PI;
        const pulse = 0.5 + 0.5 * Math.sin(ph * 2);

        // 1. Dark Crimson-Obsidian Selective Outline Rings (`r = 35` & `r = 24`, well inside [-43, +43])
        pen.strokeRing(0, 0, 35.5, 2.4, crim[0], 0.94);
        pen.strokeRing(0, 0, 24.5, 2.0, crim[0], 0.9);

        // 2. Counter-Rotating Bifrost Gold & Crimson Runic Bands
        drawTiltedOrbitBand(
          pen,
          0,
          0,
          35,
          1.0,
          1.75,
          0.96,
          [crim[2], crim[4], gold[6], PURE_WHITE],
          null,
          false
        );
        drawTiltedOrbitBand(
          pen,
          0,
          0,
          24.5,
          1.0,
          1.35,
          0.92,
          [gold[2], crim[5], gold[6], PURE_WHITE],
          null,
          false
        );

        // 3. Spinning 8-Point Valhalla Star-Cross Mandala & Counter-Spinning Inner Valknut Triangles
        drawValhallaStarCross(pen, 0, 0, 33, 15.5, 1.0, ph, crim[4], gold[6], 0.95);
        drawValhallaStarCross(pen, 0, 0, 21, 9.5, 1.0, -ph * 0.5 + Math.PI / 8, gold[5], PURE_WHITE, 0.9);

        for (let tri = 0; tri < 2; tri++) {
          const baseRot = -ph + tri * (Math.PI / 3);
          for (let v = 0; v < 3; v++) {
            const a0 = baseRot + (v * TWO_PI) / 3;
            const a1 = baseRot + ((v + 1) * TWO_PI) / 3;
            pen.line(
              Math.cos(a0) * 16.5,
              Math.sin(a0) * 16.5,
              Math.cos(a1) * 16.5,
              Math.sin(a1) * 16.5,
              tri === 0 ? gold[6] : crim[5],
              0.92
            );
          }
        }

        // 4. 8 Orbiting Elder-Futhark Einherjar Rune Jewels on the Outer Mandala
        for (let rIdx = 0; rIdx < 8; rIdx++) {
          const a = ph + (rIdx * Math.PI) / 4;
          const rx = Math.cos(a) * 30;
          const ry = Math.sin(a) * 30;
          pen.fillCircle(rx, ry, 2.5, crim[0], 0.95);
          pen.fillCircle(rx, ry, 1.6, rIdx % 2 === 0 ? gold[6] : crim[5], 0.98);
          pen.stipple(rx, ry, PURE_WHITE, 1.0);
        }

        // 5. 4 Cardinal Nordic Lock-On Crosshair Brackets & Converging Target Ticks (strictly <= 39px)
        const lockR = 36.5 - pulse * 2.2;
        for (let k = 0; k < 4; k++) {
          const ca = (k * Math.PI) / 2;
          const ux = Math.cos(ca);
          const uy = Math.sin(ca);
          const nx = -uy;
          const ny = ux;

          // Inner lock-on needle pointing straight at target center
          pen.line(ux * 11, uy * 11, ux * (lockR + 2), uy * (lockR + 2), crim[0], 0.94);
          pen.line(ux * 12, uy * 12, ux * (lockR + 1.5), uy * (lockR + 1.5), gold[6], 0.98);
          pen.line(ux * 14, uy * 14, ux * (lockR - 2), uy * (lockR - 2), PURE_WHITE, 0.98);

          // Winged Nordic crosshair bracket arms
          for (const s of [-1, 1]) {
            const bx = ux * lockR + nx * s * 6.5;
            const by = uy * lockR + ny * s * 6.5;
            const tx = ux * (lockR - 4.5) + nx * s * 9.5;
            const ty = uy * (lockR - 4.5) + ny * s * 9.5;
            pen.line(ux * lockR, uy * lockR, bx, by, gold[6], 0.98);
            pen.line(bx, by, tx, ty, crim[5], 0.95);
            pen.stipple(bx, by, PURE_WHITE, 1.0);
          }
        }

        // 6. Central Gungnir Bullseye Core & Orbiting Valkyrie Feathers
        for (let f = 0; f < 4; f++) {
          const fa = -ph + f * (Math.PI * 0.5) + 0.35;
          drawValkyrieFeather(
            pen,
            Math.cos(fa) * 19.5,
            Math.sin(fa) * 19.5,
            fa + Math.PI * 0.5,
            gold[6],
            crim[4],
            0.94
          );
        }

        drawStarburstFlare(pen, 0, 0, 9.5 + pulse * 2.5, 0.96, gold);
        pen.radialGlow(0, 0, 26, crim[4], 0.44);
      }
    };
  }
};

/**
 * Row 6 (`sy = 1248`): Colossal Einherjar Sky-Lance (`F00..F29` seamless 30fps loop).
 * Giant downward-plunging crimson-gold winged Valkyrie javelin with lightning wake.
 */
export const einherjarSkyLanceCell = {
  duration: 1.0,
  loop: true,
  defaults: {
    palette: VALKYRIE_CRIMSON_PALETTE,
    seed: 113
  },
  create(cfg) {
    const crim = buildColorRamp(cfg.palette, 8);
    const gold = buildColorRamp(VALKYRIE_GOLD_PALETTE, 8);

    return {
      step() {},
      renderFront(pen, loopT) {
        const ph = loopT * TWO_PI;
        const yTop = -39;
        const yTip = 39;
        const guardY = -2;

        // 1. Back half of Ascending Supersonic Mach Shock-Rings
        for (let rIdx = 0; rIdx < 2; rIdx++) {
          const ur = (loopT * 2 + rIdx * 0.5) % 1;
          const ry = mixScalar(yTip - 14, yTop + 8, ur);
          const rad = 9.5 + Math.sin(ur * Math.PI) * 11.5;
          drawOrientedMachRing(
            pen,
            0,
            ry,
            0,
            1,
            rad,
            0.26,
            1.6,
            gold[6],
            crim[4],
            0.88,
            (a) => Math.cos(a) < 0
          );
        }

        // 2. Sculpted 6-Pinion Crimson-Gold Valkyrie Wing-Crossguard (`x = -26 .. +26, y = -28 .. +4`)
        for (const side of [-1, 1]) {
          for (let p = 0; p < 4; p++) {
            const rootX = side * 3;
            const rootY = guardY + p * 2.4;
            const tipX = side * (25 - p * 3.6);
            const tipY = guardY - 21 + p * 4.5;
            pen.line(rootX, rootY + 1, tipX, tipY + 1, crim[0], 0.96);
            pen.line(rootX, rootY - 1, tipX, tipY - 1, crim[0], 0.94);
            pen.line(rootX, rootY, tipX, tipY, p === 0 ? PURE_WHITE : gold[6], 0.98);
            pen.line(rootX, rootY + 0.8, tipX - side * 1.5, tipY + 1.2, crim[4], 0.94);
            pen.stipple(tipX, tipY, PURE_WHITE, 1.0);
          }
        }

        // 3. Colossal Gungnir Einherjar War-Shaft (`yTop .. guardY + 12`) with Selout
        pen.line(-3.5, yTop + 4, -3.5, guardY + 12, crim[0], 0.96);
        pen.line(3.5, yTop + 4, 3.5, guardY + 12, crim[0], 0.96);
        pen.line(-2.5, yTop + 2, -2.5, guardY + 12, crim[3], 0.95);
        pen.line(-1.2, yTop + 1, -1.2, guardY + 14, gold[6], 0.98);
        pen.line(0, yTop, 0, yTip, PURE_WHITE, 1.0);
        pen.line(1.2, yTop + 1, 1.2, guardY + 14, gold[6], 0.98);
        pen.line(2.5, yTop + 2, 2.5, guardY + 12, crim[4], 0.95);

        // 4. Giant Faceted Diamond-Barbed Einherjar Spearhead (`y = +6 .. +39`)
        const headStart = 6;
        const maxBarbW = 11.5;
        for (let y = headStart; y <= yTip; y++) {
          const prog = (y - headStart) / (yTip - headStart);
          const halfW =
            prog < 0.24
              ? mixScalar(4.2, maxBarbW, prog / 0.24)
              : maxBarbW * Math.pow(Math.max(0, (1 - prog) / 0.76), 0.82);
          for (let dx = -Math.ceil(halfW) - 1; dx <= Math.ceil(halfW) + 1; dx++) {
            const adx = Math.abs(dx);
            if (adx > halfW + 0.65) continue;
            if (adx >= halfW - 0.35 && prog < 0.92) {
              pen.pixel(dx, y, crim[0]);
              continue;
            }
            if (prog < 0.2 && adx > 2.2 && adx < halfW * 0.56) continue;
            const edge = adx / Math.max(0.5, halfW);
            const col =
              adx <= 1.1 || prog > 0.88
                ? PURE_WHITE
                : edge > 0.68
                  ? gold[6]
                  : dx < 0
                    ? crim[5]
                    : crim[3];
            pen.pixel(dx, y, col);
          }
        }

        // Ornate Golden Valhalla Star-Gem at the Crossguard Heart
        drawValhallaStarCross(pen, 0, guardY + 2, 8.5, 3.8, 1.0, ph, crim[5], gold[6], 0.98);

        // 5. Double-Helix Dragonfire Wake & Crackling Einherjar Lightning Chains (`yTop .. yTip`)
        for (let rib = 0; rib < 2; rib++) {
          const rOff = rib * Math.PI;
          for (let y = yTop + 2; y <= yTip - 10; y++) {
            const u = (y - yTop) / Math.max(1, yTip - 10 - yTop);
            const amp = 4.2 + (1 - u) * 8.5;
            const ang = y * 0.2 - ph * 2 + rOff;
            if (Math.cos(ang) >= -0.2) {
              const rx = Math.sin(ang) * amp;
              pen.stipple(rx, y, rib === 0 ? PURE_WHITE : gold[6], 0.94);
              pen.stipple(rx + (rx >= 0 ? 1 : -1), y, crim[4], 0.84);
            }
          }
        }

        const boltRng = new DeterministicRng((cfg.seed || 113) + Math.floor(loopT * 30) * 17);
        const boltL = buildLightningChain(boltRng, -9, yTop + 4, -2, yTip - 6, 0.16, 3);
        const boltR = buildLightningChain(boltRng, 9, yTop + 4, 2, yTip - 6, 0.16, 3);
        pen.polyline(boltL, gold[6], 0.92);
        pen.polyline(boltR, crim[5], 0.9);

        // 6. Front half of Mach Rings + Incandescent Tip Starburst
        for (let rIdx = 0; rIdx < 2; rIdx++) {
          const ur = (loopT * 2 + rIdx * 0.5) % 1;
          const ry = mixScalar(yTip - 14, yTop + 8, ur);
          const rad = 9.5 + Math.sin(ur * Math.PI) * 11.5;
          drawOrientedMachRing(
            pen,
            0,
            ry,
            0,
            1,
            rad,
            0.26,
            1.6,
            gold[6],
            crim[4],
            0.96,
            (a) => Math.cos(a) >= 0
          );
        }

        drawStarburstFlare(pen, 0, yTip - 2, 10.5, 0.96, gold);
        pen.radialGlow(0, yTip - 9, 20, crim[4], 0.48);
        pen.radialGlow(0, guardY, 22, gold[5], 0.34);
      }
    };
  }
};

/**
 * Row 7 (`sy = 1456`): Gungnir Ragnarok Dragon-Pillar (`F00..F29` cataclysmic column).
 * Towering crimson-gold Valkyrie dragon-fire & feather shockwave column.
 */
export const gungnirRagnarokPillarCell = {
  duration: 1.0,
  loop: false,
  defaults: {
    palette: VALKYRIE_CRIMSON_PALETTE,
    seed: 127
  },
  create(cfg) {
    const crim = buildColorRamp(cfg.palette, 8);
    const gold = buildColorRamp(VALKYRIE_GOLD_PALETTE, 8);

    return {
      step() {},
      renderFront(pen, localT) {
        const u = clamp01(localT);
        const floorY = 37;
        const erupt = Easing.outExpo(clamp01(u / 0.16));
        const fade = u > 0.76 ? (1 - u) / 0.24 : 1.0;
        if (fade <= 0.02) return;

        // 1. Expanding Ground Ragnarok Star-Cross Crater Ring (`floorY = 37`, rx <= 35)
        const baseRx = (12 + 23 * erupt) * (1 - Math.max(0, u - 0.8) * 0.5);
        drawTiltedOrbitBand(
          pen,
          0,
          floorY,
          baseRx,
          0.22,
          2.0,
          0.96 * fade,
          [crim[1], crim[4], gold[6], PURE_WHITE],
          null,
          u < 0.24
        );
        drawValhallaStarCross(
          pen,
          0,
          floorY,
          baseRx * 0.92,
          baseRx * 0.46,
          0.22,
          u * 4.5,
          crim[5],
          gold[6],
          0.92 * fade
        );

        // 2. Towering Ragnarok Dragon-Fire Plasma Column (`y = +37` up to `y = -39`)
        const colH = 76 * erupt;
        const yTop = floorY - colH;
        const coreScale = u < 0.72 ? 1.0 : Math.max(0.25, 1 - (u - 0.72) / 0.28);
        const maxHalfW = 16.5 * coreScale;

        pen.shadeBox(-22, yTop - 1, 22, floorY + 1, (px, py, out) => {
          if (py > floorY || py < yTop) return 0;
          const hf = (floorY - py) / Math.max(1, colH);
          const flare = 1 + 0.24 * Math.exp(-hf * 7) + 0.12 * Math.sin(hf * 9 - u * 22);
          const halfW = maxHalfW * flare * (1 - hf * 0.18);
          const ax = Math.abs(px);
          if (ax > halfW + 0.8) return 0;

          const turb = fbmNoise2D(px * 0.22, py * 0.16 + u * 16, cfg.seed);
          const norm = ax / Math.max(0.6, halfW) - turb * 0.18;
          if (norm > 1.02) return 0;

          out.alpha = fade * (0.98 - hf * 0.1);
          if (ax >= halfW - 0.85 && fade > 0.35) {
            return crim[0];
          }
          if (norm < 0.28) {
            out.glowColor = gold[6];
            out.glowStrength = 0.52 * fade;
            return PURE_WHITE;
          }
          if (norm < 0.56) {
            out.glowColor = gold[5];
            out.glowStrength = 0.36 * fade;
            return gold[6];
          }
          if (norm < 0.8) {
            out.glowColor = crim[4];
            out.glowStrength = 0.24 * fade;
            return crim[5];
          }
          return crim[3];
        });

        // 3. Twin Coiling S-Curve Dragon-Fire Helices & Ascending Mach Shock-Rings
        for (let d = 0; d < 2; d++) {
          const off = d * Math.PI;
          let prevX = 0;
          let prevY = floorY;
          for (let s = 0; s <= 20; s++) {
            const sf = s / 20;
            const sy = floorY - sf * colH;
            const amp = (14 + 5 * (1 - sf)) * coreScale;
            const ang = sf * TWO_PI * 1.65 - u * 16 + off;
            const sx = Math.sin(ang) * amp;
            if (s > 0 && Math.cos(ang) >= -0.25) {
              pen.line(prevX, prevY, sx, sy, d === 0 ? gold[6] : crim[5], 0.94 * fade);
              pen.stipple(sx, sy, PURE_WHITE, 0.95 * fade);
            }
            prevX = sx;
            prevY = sy;
          }
        }

        for (let rIdx = 0; rIdx < 3; rIdx++) {
          const ru = ((u * 2.4 + rIdx / 3) % 1);
          const ry = floorY - ru * colH * 0.92;
          const rr = (15 + (1 - ru) * 11) * erupt;
          drawOrientedMachRing(
            pen,
            0,
            ry,
            0,
            -1,
            rr,
            0.22,
            1.6,
            gold[6],
            crim[4],
            (1 - ru * 0.55) * 0.9 * fade
          );
        }

        // 4. Crackling Valhalla Lightning Spine & Swirling Valkyrie Feathers (strictly inside [-36, +36])
        const boltRng = new DeterministicRng((cfg.seed || 127) + Math.floor(u * 30) * 23);
        const bolt1 = buildLightningChain(boltRng, -5, floorY - 2, 4, yTop + 3, 0.18, 3);
        const bolt2 = buildLightningChain(boltRng, 6, floorY - 2, -4, yTop + 3, 0.18, 3);
        pen.polyline(bolt1, PURE_WHITE, 0.94 * fade);
        pen.polyline(bolt2, gold[6], 0.9 * fade);

        for (let f = 0; f < 8; f++) {
          const fu = ((u * 1.8 + f / 8) % 1);
          const fa = f * 1.9 + u * 11;
          const fr = 12 + (1 - fu) * 16;
          const fx = Math.cos(fa) * fr;
          const fy = floorY - 4 - fu * (colH - 6);
          drawValkyrieFeather(pen, fx, fy, fa, gold[6], crim[4], fade * 0.95);
        }

        if (u < 0.34) {
          drawStarburstFlare(pen, 0, floorY - 5, 19 * (1 - u / 0.34), 0.98 * fade, gold);
        }
        pen.radialGlow(0, floorY - colH * 0.45, 29 * fade, crim[4], 0.46 * fade);
      }
    };
  }
};

export const VALKYRIE_EFFECT_REGISTRY = {
  gungnirSpearFocus,
  gungnirSpearThrustCone,
  valkyrieWingPlume,
  valkyrieSlipstreamTrail,
  valhallaGroundBurst,
  valhallaTargetReticle,
  valkyrieHaloArray,
  dragonfireObeliskPillar,
  gungnirImpactStarburst,
  gungnirBezierVolley,
  wyvernSpiralLanceCell,
  gungnirSkyLanceCell,
  dragonfireObeliskCell,
  bahamutAvatarCell,
  valhallaCrescentSlashCell,
  bifrostEinherjarSealCell,
  einherjarSkyLanceCell,
  gungnirRagnarokPillarCell
};

