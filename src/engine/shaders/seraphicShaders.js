/**
 * First-Party HD-2D Celestial Gold, Emerald Grace & Stained-Glass Seraphic Shader Suite for ArcaneShaderFX.
 * Authored natively for Arcane vs. Steel (`Seraphina` / `priestess`).
 *
 * Features:
 *  - Dual-buffer (`albedo` + additive `emissive`) cel-stepped Celestial Gold, Emerald Grace & Stained-Glass Sapphire ramps
 *  - True 2.5D `back` + `front` wraparound Sanctuary Cathedral Mandalas, Ophanim Chakram Wheels, Benediction Rose Wards & Sanctum Pillars
 *  - 120Hz ivory-gold Archangel feather physics, sacred star-cross bursts, and double-helix healing ribbons
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
} from '../ArcaneShaderFX.js?v=30fps66';

const TWO_PI = Math.PI * 2;
const BACK_HALF = (theta) => Math.sin(theta) < 0;
const FRONT_HALF = (theta) => Math.sin(theta) >= 0;

export const SERAPHIC_GOLD_PALETTE = [
  '#171005',
  '#452708',
  '#a16207',
  '#ca8a04',
  '#eab308',
  '#facc15',
  '#fef08a',
  '#ffffff'
];

export const SERAPHIC_GRACE_PALETTE = [
  '#062116',
  '#065f46',
  '#059669',
  '#10b981',
  '#34d399',
  '#fde047',
  '#fef9c3',
  '#ffffff'
];

export const SERAPHIC_STAINED_PALETTE = [
  '#0f172a',
  '#1e3a8a',
  '#0284c7',
  '#38bdf8',
  '#f43f5e',
  '#facc15',
  '#fef08a',
  '#ffffff'
];

// ============================================================================
// Shared Seraphic & Gothic Cathedral Primitives
// ============================================================================

/** Draw an oriented ivory-gold Archangel wing-feather at `(cx, cy)`. */
function drawSeraphicFeather(pen, cx, cy, angle, goldCol, tipCol, alpha = 1) {
  if (alpha <= 0.03) return;
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  const nx = -sa;
  const ny = ca;
  for (let i = -3; i <= 3; i++) {
    const px = cx + ca * i;
    const py = cy + sa * i;
    pen.stipple(px, py, i >= 1 ? PURE_WHITE : tipCol, alpha);
    if (Math.abs(i) <= 2) {
      pen.stipple(px + nx * 0.9, py + ny * 0.9, goldCol, alpha * 0.85);
      pen.stipple(px - nx * 0.9, py - ny * 0.9, goldCol, alpha * 0.85);
    }
  }
}

/** Draw a crisp Gothic sacred Latin / Star-Cross glyph centered at `(cx, cy)`. */
function drawSacredCross(pen, cx, cy, armLen, outerCol, coreCol, alpha = 1, rot = 0) {
  if (alpha <= 0.03 || armLen < 1) return;
  const ca = Math.cos(rot);
  const sa = Math.sin(rot);
  for (let k = 0; k < 4; k++) {
    const a = rot + (k * Math.PI) / 2;
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    const len = k === 1 ? armLen * 1.18 : armLen;
    pen.line(cx, cy, cx + ux * len, cy + uy * len, outerCol, alpha * 0.92);
    pen.line(cx, cy, cx + ux * (len * 0.68), cy + uy * (len * 0.68), coreCol, alpha);
  }
  const dLen = armLen * 0.48;
  pen.line(cx - (ca - sa) * dLen, cy - (sa + ca) * dLen, cx + (ca - sa) * dLen, cy + (sa + ca) * dLen, coreCol, alpha * 0.78);
  pen.line(cx - (ca + sa) * dLen, cy - (sa - ca) * dLen, cx + (ca + sa) * dLen, cy + (sa - ca) * dLen, coreCol, alpha * 0.78);
  pen.stipple(cx, cy, PURE_WHITE, alpha);
}

/** Draw a 3D perspective supersonic Mach shock-ring perpendicular to `(ux, uy)`. */
function drawSeraphicMachRing(pen, cx, cy, ux, uy, radius, squash, colCore, colEdge, alpha) {
  if (radius <= 0.8 || alpha <= 0.03) return;
  const nx = -uy;
  const ny = ux;
  const steps = Math.max(24, Math.ceil(radius * 4.4));
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * TWO_PI;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const px = cx + ux * (ca * radius * squash) + nx * (sa * radius);
    const py = cy + uy * (ca * radius * squash) + ny * (sa * radius);
    const frontness = (ca + 1) * 0.5;
    const col = frontness > 0.7 ? PURE_WHITE : frontness > 0.36 ? colCore : colEdge;
    pen.stipple(px, py, col, alpha * (0.55 + 0.45 * frontness));
  }
}

/** Render a cel-stepped Celestial Gold + Sapphire crescent light wave oriented toward `aimAngle`. */
function renderSeraphicCrescentArc(pen, cx, cy, aimAngle, radius, spanAngle, maxThick, age, ramp, sapphireCol) {
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
    const ly = (-dx * sinA + dy * cosA) * 0.85;
    const dist = Math.hypot(lx, ly);
    if (dist > radius + 0.6 || dist < radius - maxThick - 1.2) return 0;

    const ang = Math.atan2(ly, lx);
    const absAng = Math.abs(ang);
    if (absAng > halfSpan) return 0;

    const tipTaper = Math.cos((absAng / halfSpan) * Math.PI * 0.5);
    const localW = maxThick * Math.pow(Math.max(0, tipTaper), 0.72);
    if (localW < 0.35) return 0;

    const outerDist = radius - dist;
    if (outerDist < -0.4 || outerDist > localW) return 0;
    const across = clamp01(outerDist / localW);

    out.alpha = clamp01((1 - age * 0.82) * Math.min(1, tipTaper * 1.85));
    if (across < 0.24 && age < 0.48) {
      out.glowStrength = 0.34 * (1 - age);
      out.glowColor = ramp[steps - 2];
      return PURE_WHITE;
    }
    if (across > 0.78 && sapphireCol) {
      out.glowStrength = 0.16 * (1 - age);
      out.glowColor = sapphireCol;
      return sapphireCol;
    }
    const idx = clampRange(
      Math.round((1 - across) * (steps - 1) - age * 1.8 + tipTaper * 0.6),
      1,
      steps - 1
    );
    out.glowStrength = 0.2 * (1 - across) * (1 - age);
    out.glowColor = ramp[Math.min(steps - 1, idx + 1)];
    return ramp[idx];
  });
}

// ============================================================================
// 1. SUNBURST SCEPTER FOCUS (`scepterStarFocus`)
// ============================================================================
export const scepterStarFocus = {
  duration: 0.40,
  loop: false,
  defaults: {
    palette: SERAPHIC_GOLD_PALETTE,
    radius: 18,
    seed: 31
  },
  create(cfg) {
    const gold = buildColorRamp(cfg.palette, 8);
    const stained = buildColorRamp(SERAPHIC_STAINED_PALETTE, 8);
    const ramp4 = [gold[2], gold[4], gold[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, gold[6], stained[3], gold[4]] });
    let t = 0;
    let emitAcc = 0;

    return {
      step(dt) {
        t += dt;
        emitAcc += dt;
        if (t < 0.32) {
          while (emitAcc >= 0.028) {
            emitAcc -= 0.028;
            const a = rng.between(0, TWO_PI);
            const dist = (cfg.radius || 18) * rng.between(0.7, 1.25);
            const life = rng.between(0.12, 0.20);
            const spd = dist / life;
            motes.emit(
              'streak',
              Math.cos(a) * dist,
              Math.sin(a) * dist,
              -Math.cos(a) * spd,
              -Math.sin(a) * spd,
              life,
              rng.chance(0.4) ? stained[3] : gold[6]
            );
          }
        }
        motes.step(dt);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.40);
        const env = Math.sin(u * Math.PI);
        if (env <= 0.03) return;
        const r = mixScalar(cfg.radius || 18, 4.5, Easing.inQuad(u));
        pen.radialGlow(0, 0, 16 * env, gold[5], 0.36 * env);
        drawTiltedOrbitBand(pen, 0, 0, r * 0.82, 0.44, 1.3, 0.86 * env, ramp4, null, false);
        drawSacredCross(pen, 0, 0, 11 * env, stained[3], gold[6], 0.95 * env, t * 5.5);
        drawStarburstFlare(pen, 0, 0, (4 + 6.5 * u) * env, 0.9 * env, gold);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 2. SCEPTER STARBURST RELEASE CONE (`scepterStarburstCone`)
// ============================================================================
export const scepterStarburstCone = {
  duration: 0.36,
  loop: false,
  defaults: {
    palette: SERAPHIC_GOLD_PALETTE,
    aimAngle: 0,
    isGrace: false,
    seed: 37
  },
  create(cfg) {
    const gold = buildColorRamp(cfg.palette, 8);
    const stained = buildColorRamp(SERAPHIC_STAINED_PALETTE, 8);
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, gold[6], stained[3], gold[4]] });
    const aim = cfg.aimAngle ?? 0;
    const ux = Math.cos(aim);
    const uy = Math.sin(aim);
    let t = 0;
    let emitted = false;

    return {
      step(dt) {
        t += dt;
        if (!emitted) {
          emitted = true;
          const cnt = cfg.isGrace ? 20 : 14;
          for (let i = 0; i < cnt; i++) {
            const a = aim + rng.between(-0.68, 0.68);
            const sp = rng.between(95, 230);
            motes.emit(
              i % 3 === 0 ? 'glint' : 'spark',
              ux * 3,
              uy * 3,
              Math.cos(a) * sp,
              Math.sin(a) * sp,
              rng.between(0.16, 0.32),
              rng.chance(0.45) ? stained[3] : gold[6],
              1,
              45
            );
          }
        }
        motes.step(dt);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.36);
        const fade = 1 - u * u;
        if (fade <= 0.03) return;
        const grow = Easing.outCubic(u);

        pen.radialGlow(ux * 8, uy * 8, 18 * fade, gold[5], 0.4 * fade);
        drawSeraphicMachRing(pen, ux * (6 + grow * 14), uy * (6 + grow * 14), ux, uy, 8 + grow * 11, 0.38, gold[6], stained[3], 0.92 * fade);
        drawSeraphicMachRing(pen, ux * (14 + grow * 24), uy * (14 + grow * 24), ux, uy, 5 + grow * 8, 0.36, gold[5], gold[3], 0.78 * fade);

        renderSeraphicCrescentArc(
          pen,
          ux * (4 + grow * 10),
          uy * (4 + grow * 10),
          aim,
          12 + grow * 16,
          1.68,
          4.8 * (1 - u * 0.45),
          u,
          gold,
          stained[3]
        );
        drawSacredCross(pen, ux * 4, uy * 4, 10 * fade, stained[3], gold[6], fade, aim);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 3. 2.5D BENEDICTION ROSE-GOLD CATHEDRAL WARD (`benedictionRoseWard`)
// ============================================================================
export const benedictionRoseWard = {
  duration: 0.46,
  loop: false,
  defaults: {
    palette: SERAPHIC_GOLD_PALETTE,
    seed: 41
  },
  create(cfg) {
    const gold = buildColorRamp(cfg.palette, 8);
    const stained = buildColorRamp(SERAPHIC_STAINED_PALETTE, 8);
    const grace = buildColorRamp(SERAPHIC_GRACE_PALETTE, 8);
    const graceRamp4 = [grace[1], grace[3], grace[5], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, gold[6], stained[3], grace[4]] });
    let t = 0;
    let accum = 0;

    return {
      step(dt) {
        t += dt;
        accum += dt;
        while (accum >= 0.035) {
          accum -= 0.035;
          const a = rng.between(-1.2, 1.2);
          motes.emit(
            'glint',
            14 + Math.cos(a) * 8,
            -26 + Math.sin(a) * 20,
            rng.between(8, 24),
            rng.between(-34, -12),
            rng.between(0.18, 0.32),
            rng.chance(0.5) ? gold[6] : stained[3],
            1,
            0
          );
        }
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 0.46);
        const env = Math.sin(u * Math.PI);
        if (env <= 0.03) return;
        drawTiltedOrbitBand(pen, 0, 0, 26 * (0.85 + 0.15 * env), 0.25, 1.4, 0.78 * env, graceRamp4, BACK_HALF, false);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.46);
        const env = Math.sin(u * Math.PI);
        if (env <= 0.03) return;
        drawTiltedOrbitBand(pen, 0, 0, 26 * (0.85 + 0.15 * env), 0.25, 1.5, 0.9 * env, graceRamp4, FRONT_HALF, false);

        const shieldCx = 14;
        const shieldCy = -28;
        pen.radialGlow(shieldCx + 4, shieldCy, 20 * env, gold[5], 0.34 * env);

        for (let i = -18; i <= 18; i++) {
          const v = i / 18;
          const arcX = shieldCx + Math.cos(v * 1.32) * 12;
          const arcY = shieldCy + v * 25;
          const facetCol = Math.abs(i) % 5 === 0 ? stained[3] : Math.abs(i) % 3 === 0 ? stained[4] : gold[5];
          pen.stipple(arcX, arcY, facetCol, 0.92 * env);
          pen.stipple(arcX + 1.5, arcY, gold[6], 0.95 * env);
          if (Math.abs(i) <= 12 && i % 2 === 0) {
            pen.stipple(arcX + 2.6, arcY, PURE_WHITE, 0.88 * env);
          }
        }
        drawSacredCross(pen, shieldCx + 11, shieldCy, 8 * env, stained[3], gold[6], 0.95 * env, 0);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 4. 2.5D EMERALD-GOLD GRACE BENEDICTION BLOOM (`graceHealBloom`)
// ============================================================================
export const graceHealBloom = {
  duration: 0.64,
  loop: false,
  defaults: {
    palette: SERAPHIC_GRACE_PALETTE,
    seed: 43
  },
  create(cfg) {
    const grace = buildColorRamp(cfg.palette, 8);
    const gold = buildColorRamp(SERAPHIC_GOLD_PALETTE, 8);
    const graceRamp4 = [grace[1], grace[3], grace[5], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, grace[4], gold[6], grace[3]] });
    let t = 0;
    let emitted = false;

    return {
      step(dt) {
        t += dt;
        if (!emitted) {
          emitted = true;
          for (let i = 0; i < 16; i++) {
            const a = (i / 16) * TWO_PI;
            motes.emit(
              i % 2 === 0 ? 'glint' : 'spark',
              Math.cos(a) * rng.between(8, 22),
              -rng.between(4, 42),
              Math.cos(a) * 18,
              -rng.between(48, 95),
              rng.between(0.32, 0.56),
              i % 2 === 0 ? grace[4] : gold[6],
              1,
              -20
            );
          }
        }
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 0.64);
        const env = Math.sin(u * Math.PI);
        if (env <= 0.03) return;
        drawTiltedOrbitBand(pen, 0, -2, 26 * (0.65 + 0.35 * Easing.outCubic(u)), 0.25, 1.5, 0.9 * env, graceRamp4, BACK_HALF, false);

        for (let s = 0; s < 2; s++) {
          const ramp = s === 0 ? grace : gold;
          for (let i = 0; i < 28; i++) {
            const f = i / 27;
            const a = s * Math.PI + u * 9.5 - f * 5.2;
            const sinA = Math.sin(a);
            if (sinA >= 0) continue;
            const r = 18 * (1 - f * 0.28);
            pen.stipple(Math.cos(a) * r, -4 - f * 62 + sinA * 4, ramp[5], 0.88 * env);
          }
        }
      },
      renderFront(pen) {
        const u = clamp01(t / 0.64);
        const env = Math.sin(u * Math.PI);
        if (env <= 0.03) return;
        drawTiltedOrbitBand(pen, 0, -2, 26 * (0.65 + 0.35 * Easing.outCubic(u)), 0.25, 1.5, 0.92 * env, graceRamp4, FRONT_HALF, false);

        for (let s = 0; s < 2; s++) {
          const ramp = s === 0 ? grace : gold;
          for (let i = 0; i < 28; i++) {
            const f = i / 27;
            const a = s * Math.PI + u * 9.5 - f * 5.2;
            const sinA = Math.sin(a);
            if (sinA < 0) continue;
            const r = 18 * (1 - f * 0.28);
            const px = Math.cos(a) * r;
            const py = -4 - f * 62 + sinA * 4;
            pen.stipple(px, py, ramp[5], 0.92 * env);
            if (i % 4 === 0) pen.stipple(px, py - 1, PURE_WHITE, 0.86 * env);
          }
        }
        pen.radialGlow(0, -34, 20 * env, grace[4], 0.26 * env);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 5. SERAPHIC WING SLIPSTREAM & FEATHER TRAIL (`seraphicSlipstreamTrail`)
// ============================================================================
export const seraphicSlipstreamTrail = {
  duration: 0.8,
  loop: true,
  defaults: {
    palette: SERAPHIC_GOLD_PALETTE,
    seed: 47
  },
  create(cfg) {
    const gold = buildColorRamp(cfg.palette, 8);
    const stained = buildColorRamp(SERAPHIC_STAINED_PALETTE, 8);
    const rng = new DeterministicRng(cfg.seed);
    const feathers = [];
    let t = 0;
    let accum = 0;

    return {
      step(dt) {
        t += dt;
        accum += dt;
        while (accum >= 0.035) {
          accum -= 0.035;
          if (feathers.length >= 28) feathers.shift();
          feathers.push({
            x: rng.between(-20, 6),
            y: rng.between(-22, 16),
            vx: rng.between(-65, -22),
            vy: rng.between(10, 34),
            age: 0,
            maxLife: rng.between(0.26, 0.48),
            rot: rng.between(-0.5, 0.5),
            isFeather: rng.chance(0.55),
            isSapphire: rng.chance(0.3)
          });
        }
        for (let i = feathers.length - 1; i >= 0; i--) {
          const f = feathers[i];
          f.age += dt;
          if (f.age >= f.maxLife) {
            feathers.splice(i, 1);
            continue;
          }
          f.x += f.vx * dt;
          f.y += f.vy * dt;
          f.rot += dt * 2.2;
        }
      },
      renderBack(pen) {
        pen.radialGlow(-6, 0, 22, gold[5], 0.24);
        for (let i = 0; i < feathers.length; i++) {
          const f = feathers[i];
          const fade = 1 - f.age / f.maxLife;
          if (f.isFeather) {
            drawSeraphicFeather(pen, f.x, f.y, f.rot, gold[5], gold[6], fade * 0.9);
          } else {
            pen.stipple(f.x, f.y, f.isSapphire ? stained[3] : gold[6], fade * 0.88);
          }
        }
      }
    };
  }
};

// ============================================================================
// 6. 2.5D GROUNDED SANCTUARY CATHEDRAL FLOOR MANDALA (`sanctuaryCathedralSeal`)
// ============================================================================
export const sanctuaryCathedralSeal = {
  duration: 1.2,
  loop: true,
  defaults: {
    palette: SERAPHIC_GOLD_PALETTE,
    isUltimate: false,
    seed: 53
  },
  create(cfg) {
    const gold = buildColorRamp(cfg.palette, 8);
    const stained = buildColorRamp(SERAPHIC_STAINED_PALETTE, 8);
    const grace = buildColorRamp(SERAPHIC_GRACE_PALETTE, 8);
    const goldRamp4 = [gold[2], gold[4], gold[6], PURE_WHITE];
    const innerRamp4 = cfg.isUltimate
      ? [stained[1], stained[3], stained[6], PURE_WHITE]
      : [grace[1], grace[3], grace[5], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = [];
    let t = 0;
    let accum = 0;

    function renderHalf(pen, isBack) {
      const scale = cfg.isUltimate ? 1.12 : 0.94;
      const pred = isBack ? BACK_HALF : FRONT_HALF;
      const rot = t * 1.65;

      if (isBack) {
        pen.radialGlow(0, 0, 42 * scale, gold[4], 0.24);
      }

      drawTiltedOrbitBand(pen, 0, 0, 52 * scale, 0.25, 1.6, 0.92, goldRamp4, pred, false);
      drawTiltedOrbitBand(pen, 0, 0, 36 * scale, 0.25, 1.4, 0.86, innerRamp4, pred, false);

      for (let k = 0; k < 8; k++) {
        const a = rot + (k * TWO_PI) / 8;
        const sinA = Math.sin(a);
        if (isBack && sinA >= 0) continue;
        if (!isBack && sinA < 0) continue;
        const rIn = 14 * scale;
        const rOut = 51 * scale;
        const x0 = Math.cos(a) * rIn;
        const y0 = sinA * rIn * 0.25;
        const x1 = Math.cos(a) * rOut;
        const y1 = sinA * rOut * 0.25;
        pen.line(x0, y0, x1, y1, k % 2 === 0 ? gold[6] : stained[3], 0.85);
        pen.stipple(x1, y1, PURE_WHITE, 0.95);

        if (k % 2 === 0) {
          const hPil = (10 + 5 * Math.sin(t * 6 + k)) * scale;
          pen.line(x1, y1, x1, y1 - hPil, gold[5], 0.78);
          pen.stipple(x1, y1 - hPil, PURE_WHITE, 0.9);
        }
      }

      for (let i = 0; i < motes.length; i++) {
        const m = motes[i];
        if ((isBack && m.isFront) || (!isBack && !m.isFront)) continue;
        const fade = 1 - m.age / m.maxLife;
        pen.stipple(m.x, m.y, m.col, fade * 0.92);
      }
    }

    return {
      step(dt) {
        t += dt;
        accum += dt;
        while (accum >= 0.04) {
          accum -= 0.04;
          if (motes.length >= 34) motes.shift();
          const a = rng.between(0, TWO_PI);
          const rx = rng.between(18, 50);
          motes.push({
            x: Math.cos(a) * rx,
            y: Math.sin(a) * rx * 0.25,
            vy: -rng.between(24, 56),
            age: 0,
            maxLife: rng.between(0.35, 0.62),
            isFront: Math.sin(a) >= 0,
            col: rng.chance(0.35) ? grace[4] : rng.chance(0.4) ? stained[3] : gold[6]
          });
        }
        for (let i = motes.length - 1; i >= 0; i--) {
          motes[i].age += dt;
          motes[i].y += motes[i].vy * dt;
          if (motes[i].age >= motes[i].maxLife) motes.splice(i, 1);
        }
      },
      renderBack(pen) {
        renderHalf(pen, true);
      },
      renderFront(pen) {
        renderHalf(pen, false);
      }
    };
  }
};

// ============================================================================
// 7. 2.5D OPHANIM STAR-CHAKRAM WHEEL (`ophanimChakramWheel`)
// ============================================================================
export const ophanimChakramWheel = {
  duration: 1.6,
  loop: true,
  defaults: {
    palette: SERAPHIC_GOLD_PALETTE,
    seed: 59
  },
  create(cfg) {
    const gold = buildColorRamp(cfg.palette, 8);
    const stained = buildColorRamp(SERAPHIC_STAINED_PALETTE, 8);
    const goldRamp4 = [gold[2], gold[4], gold[6], PURE_WHITE];
    const stainedRamp4 = [stained[1], stained[3], stained[5], PURE_WHITE];
    let t = 0;

    function renderHalf(pen, isBack) {
      const pred = isBack ? BACK_HALF : FRONT_HALF;
      const rot = t * 2.2;
      if (isBack) {
        pen.radialGlow(0, 0, 44, gold[5], 0.30);
      }
      drawTiltedOrbitBand(pen, 0, 0, 46, 0.56, 1.5, 0.90, goldRamp4, pred, false);
      drawTiltedOrbitBand(pen, 0, 0, 38, 0.42, 1.3, 0.84, stainedRamp4, pred, false);

      // 6 Orbiting Sacred Star-Cross Chakrams depth-sorted behind & in front of Seraphina!
      const orbitR = 46;
      for (let i = 0; i < 6; i++) {
        const a = -rot * 1.15 + (i * TWO_PI) / 6;
        const depthZ = Math.sin(a);
        if (isBack && depthZ >= 0) continue;
        if (!isBack && depthZ < 0) continue;

        const ox = Math.cos(a) * orbitR;
        const oy = depthZ * orbitR * 0.56;
        pen.radialGlow(ox, oy, 8, gold[5], 0.38);
        drawSacredCross(pen, ox, oy, 7.2, i % 2 === 0 ? gold[5] : stained[3], gold[6], 0.96, t * 4 + i);
        drawStarburstFlare(pen, ox, oy, 4.8, 0.88, gold);
      }
    }

    return {
      step(dt) {
        t += dt;
      },
      renderBack(pen) {
        renderHalf(pen, true);
      },
      renderFront(pen) {
        renderHalf(pen, false);
      }
    };
  }
};

// ============================================================================
// 8. 2.5D CATHEDRAL SANCTUM PILLAR OF LIGHT (`cathedralSanctumPillar`)
// ============================================================================
export const cathedralSanctumPillar = {
  duration: 0.82,
  loop: false,
  defaults: {
    palette: SERAPHIC_GOLD_PALETTE,
    scaleWidth: 1.0,
    seed: 61
  },
  create(cfg) {
    const gold = buildColorRamp(cfg.palette, 8);
    const stained = buildColorRamp(SERAPHIC_STAINED_PALETTE, 8);
    const goldRamp4 = [gold[2], gold[4], gold[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, gold[6], stained[3], gold[4]] });
    let t = 0;
    let emitted = false;

    return {
      step(dt) {
        t += dt;
        if (!emitted) {
          emitted = true;
          for (let i = 0; i < 20; i++) {
            motes.emit(
              i % 2 === 0 ? 'glint' : 'spark',
              rng.between(-20, 20),
              -rng.between(2, 24),
              rng.between(-18, 18),
              -rng.between(75, 160),
              rng.between(0.36, 0.72),
              i % 3 === 0 ? stained[3] : gold[6],
              1,
              -20
            );
          }
        }
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 0.82);
        const pop = smoothStep(0, 0.16, u);
        const fade = 1 - smoothStep(0.68, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;
        const scale = cfg.scaleWidth || 1.0;

        drawTiltedOrbitBand(pen, 0, 0, 34 * scale * pop, 0.25, 1.6, 0.94 * env, goldRamp4, BACK_HALF, false);

        const archH = 68 * pop;
        const maxW = 24 * scale * (0.72 + 0.28 * pop);
        const roseCy = -archH * 0.44;
        const roseR = 11.5 * scale * pop;
        const rot = u * TWO_PI * 1.5;

        // 6 Unfurling Golden Feathered Seraphim Wings (3 pairs flanking left & right)
        for (const side of [-1, 1]) {
          for (let w = 0; w < 3; w++) {
            const wy0 = -archH * (0.24 + w * 0.22);
            const spanX = (22 + (2 - w) * 7) * scale * pop;
            const liftY = (14 + (2 - w) * 6) * pop + Math.sin(u * 10 + w) * 2.5;
            for (let f = 0; f < 6; f++) {
              const fu = f / 5;
              const fx0 = side * (maxW * (0.55 - w * 0.12));
              const fy0 = wy0 + f * 2.2;
              const fx1 = side * (maxW * 0.45 + spanX * (0.55 + 0.45 * Math.sin(fu * 1.35)));
              const fy1 = wy0 - liftY * (1 - fu * 0.55) + fu * 7;
              pen.line(fx0, fy0, fx1, fy1, f % 2 === 0 ? gold[5] : stained[3], 0.86 * env);
              drawSeraphicFeather(
                pen,
                fx1,
                fy1,
                side > 0 ? -0.35 + fu * 0.45 : Math.PI + 0.35 - fu * 0.45,
                gold[5],
                f < 2 ? PURE_WHITE : gold[6],
                0.9 * env
              );
            }
          }
        }

        // Pointed Gothic Ogee Lancet Arch + Rotating Rose Window + Curved 2.5D Elliptical Base
        pen.shadeBox(-maxW - 4, -archH - 4, maxW + 4, 9, (px, py, out) => {
          const dx = Math.abs(px);
          if (dx > maxW) return 0;
          const baseCurveY = Math.sqrt(Math.max(0, 1 - Math.pow(dx / Math.max(1, maxW), 2))) * 6.5;
          const dy = baseCurveY - py;
          if (dy < 0 || dy > archH) return 0;
          const absDy = dy;
          const archW = maxW * Math.pow(Math.max(0, 1 - absDy / Math.max(1, archH)), 0.65);
          if (dx > archW) return 0;

          const edge = dx / Math.max(0.5, archW);
          const botEdge = dy / Math.max(1, archH);

          // Rotating Stained-Glass Rose Window Mandala in the heart of the dome
          const rDist = Math.hypot(px, py - roseCy);
          if (rDist <= roseR && roseR > 2) {
            const ra = Math.atan2(py - roseCy, px) + rot;
            const normA = ((ra % TWO_PI) + TWO_PI) % TWO_PI;
            const sector = Math.floor((normA / TWO_PI) * 8);
            const sectorAng = (normA / TWO_PI) * 8 - sector - 0.5;
            if (Math.abs(rDist - roseR) < 1.2 || Math.abs(rDist - roseR * 0.52) < 1.0 || Math.abs(sectorAng) > 0.38) {
              out.alpha = 0.96 * env;
              out.glowStrength = 0.32 * env;
              out.glowColor = gold[6];
              return PURE_WHITE;
            }
            const paneCol = sector % 2 === 0 ? stained[3] : gold[5];
            out.alpha = 0.88 * env;
            out.glowStrength = 0.24 * env;
            out.glowColor = paneCol;
            return paneCol;
          }

          // Pointed Gothic Lancet Tracery Border & Curved 2.5D Base Rim
          if (edge > 0.78 || dy < 2.2) {
            out.alpha = 0.94 * env;
            out.glowStrength = 0.3 * env;
            out.glowColor = gold[6];
            return edge > 0.9 ? gold[4] : PURE_WHITE;
          }

          // Inner Gothic Trefoil Rib Vaulting
          const rib = Math.abs(dx - archW * 0.48);
          if (rib < 1.15) {
            out.alpha = 0.9 * env;
            out.glowStrength = 0.26 * env;
            out.glowColor = gold[6];
            return gold[6];
          }

          const n = fbmNoise2D(px * 0.16, py * 0.12 + u * 6, 2);
          out.alpha = clamp01((0.82 - edge * 0.25) * (0.75 + 0.25 * botEdge) * env);
          const useSapphire = (Math.floor((px + maxW) / 5) + Math.floor(dy / 9)) % 2 === 0 || n > 0.48;
          out.glowStrength = 0.22 * env;
          out.glowColor = useSapphire ? stained[3] : gold[5];
          return useSapphire ? stained[3] : gold[5];
        });
      },
      renderFront(pen) {
        const u = clamp01(t / 0.82);
        const pop = smoothStep(0, 0.16, u);
        const fade = 1 - smoothStep(0.68, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;
        const scale = cfg.scaleWidth || 1.0;

        drawTiltedOrbitBand(pen, 0, 0, 34 * scale * pop, 0.25, 1.6, 0.94 * env, goldRamp4, FRONT_HALF, false);
        drawTiltedOrbitBand(pen, 0, 0, 22 * scale * pop, 0.25, 1.3, 0.88 * env, goldRamp4, FRONT_HALF, false);

        const archH = 68 * pop;
        const roseCy = -archH * 0.44;
        drawSacredCross(pen, 0, roseCy, 8.5 * scale * env, stained[3], PURE_WHITE, 0.95 * env, u * 3.2);

        // Celestial Sunburst Cross Finial crowning the pointed Gothic apex
        const finialY = -archH - 3;
        drawSacredCross(pen, 0, finialY, 10.5 * scale * env, gold[5], PURE_WHITE, 0.98 * env, 0);
        drawStarburstFlare(pen, 0, finialY, 8 * scale * env, 0.94 * env, gold);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 9. 2.5D HEAVEN'S LIGHT-SPEAR TARGET RETICLE (`holySpearReticle`)
// ============================================================================
export const holySpearReticle = {
  duration: 0.52,
  loop: false,
  defaults: {
    palette: SERAPHIC_GOLD_PALETTE,
    seed: 67
  },
  create(cfg) {
    const gold = buildColorRamp(cfg.palette, 8);
    const stained = buildColorRamp(SERAPHIC_STAINED_PALETTE, 8);
    const goldRamp4 = [gold[2], gold[4], gold[6], PURE_WHITE];
    let t = 0;

    return {
      step(dt) {
        t += dt;
      },
      renderBack(pen) {
        const u = clamp01(t / 0.52);
        const env = Math.sin(u * Math.PI);
        if (env <= 0.02) return;
        drawTiltedOrbitBand(pen, 0, 0, 28 * (0.7 + 0.3 * Easing.outCubic(u)), 0.26, 1.5, 0.92 * env, goldRamp4, BACK_HALF, false);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.52);
        const env = Math.sin(u * Math.PI);
        if (env <= 0.02) return;
        drawTiltedOrbitBand(pen, 0, 0, 28 * (0.7 + 0.3 * Easing.outCubic(u)), 0.26, 1.5, 0.92 * env, goldRamp4, FRONT_HALF, false);
        for (const s of [-1, 1]) {
          const lx = s * 20;
          pen.line(lx, 0, lx, -28 * env, stained[3], 0.78 * env);
          pen.stipple(lx, -28 * env, PURE_WHITE, 0.9 * env);
        }
        drawSacredCross(pen, 0, 0, 8 * env, gold[5], gold[6], 0.92 * env, 0);
      }
    };
  }
};

// ============================================================================
// 10. HOLY STAR-CROSS IMPACT BURST (`holyStarImpactBurst`)
// ============================================================================
export const holyStarImpactBurst = {
  duration: 0.36,
  loop: false,
  defaults: {
    palette: SERAPHIC_GOLD_PALETTE,
    isCrit: false,
    seed: 71
  },
  create(cfg) {
    const gold = buildColorRamp(cfg.palette, 8);
    const stained = buildColorRamp(SERAPHIC_STAINED_PALETTE, 8);
    const goldRamp4 = [gold[2], gold[4], gold[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, gold[6], stained[3], gold[4]] });
    let t = 0;
    let emitted = false;

    return {
      step(dt) {
        t += dt;
        if (!emitted) {
          emitted = true;
          const cnt = cfg.isCrit ? 22 : 14;
          for (let i = 0; i < cnt; i++) {
            const a = (i / cnt) * TWO_PI + rng.between(-0.2, 0.2);
            const sp = rng.between(65, cfg.isCrit ? 210 : 165);
            motes.emit(
              i % 3 === 0 ? 'glint' : 'spark',
              0,
              0,
              Math.cos(a) * sp,
              Math.sin(a) * sp,
              rng.between(0.18, 0.34),
              i % 3 === 0 ? stained[3] : gold[6],
              1,
              65
            );
          }
        }
        motes.step(dt);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.36);
        const fade = 1 - Easing.inQuad(u);
        if (fade <= 0.03) return;
        const r = (cfg.isCrit ? 24 : 18) * Easing.outCubic(u);

        pen.radialGlow(0, 0, 20 * fade, gold[5], 0.42 * fade);
        drawTiltedOrbitBand(pen, 0, 0, r, 0.72, 1.5, 0.9 * fade, goldRamp4, null, false);
        drawSacredCross(pen, 0, 0, (10 + r * 0.55) * fade, stained[3], gold[6], 0.96 * fade, u * 1.2);
        drawStarburstFlare(pen, 0, 0, (8 + r * 0.4) * fade, 0.9 * fade, gold);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// BAKED 30FPS VFX SPRITE SHEET CELLS (`priestess_vfx.png`, 104x104 -> 208x208)
// ============================================================================

/** Row 0: 30-frame Sacred Star-Cross Chakram Orb (`holy_light` projectile + beam head + orbiting chakrams). */
export const sacredStarOrbCell = {
  duration: 1.0,
  loop: true,
  defaults: {
    palette: SERAPHIC_GOLD_PALETTE
  },
  create(cfg) {
    const gold = buildColorRamp(cfg.palette, 8);
    const stained = buildColorRamp(SERAPHIC_STAINED_PALETTE, 8);
    const grace = buildColorRamp(SERAPHIC_GRACE_PALETTE, 8);
    return {
      step() {},
      renderFront(pen, localT) {
        const progress = clamp01(localT / 1.0);
        const rot = progress * TWO_PI;

        pen.radialGlow(2, 0, 26, gold[5], 0.36);

        for (let s = 0; s < 2; s++) {
          const sign = s === 0 ? 1 : -1;
          for (let i = 0; i < 20; i++) {
            const u = i / 19;
            const wx = -4 - u * 34;
            const wy = sign * Math.sin(u * 5.2 - rot * 2) * (7 * (1 - u * 0.65));
            pen.stipple(wx, wy, i % 3 === 0 ? stained[3] : gold[5], (1 - u) * 0.9);
          }
        }

        const ringR = 17;
        for (let i = 0; i < 36; i++) {
          const a = (i / 36) * TWO_PI + rot;
          pen.stipple(2 + Math.cos(a) * ringR, Math.sin(a) * ringR, i % 6 === 0 ? PURE_WHITE : i % 3 === 0 ? stained[3] : gold[5], 0.94);
        }

        for (let b = 0; b < 4; b++) {
          const ba = -rot * 2 + (b * TWO_PI) / 4;
          const bx = 2 + Math.cos(ba) * 22;
          const by = Math.sin(ba) * 22;
          pen.stipple(bx, by, b % 2 === 0 ? grace[4] : gold[6], 0.95);
          pen.stipple(bx, by, PURE_WHITE, 0.7);
        }

        drawSacredCross(pen, 2, 0, 18, stained[3], gold[6], 0.98, rot * 0.5);
        drawSacredCross(pen, 2, 0, 13, gold[5], PURE_WHITE, 0.98, rot * 0.5 + Math.PI / 4);
        pen.line(-8, 0, 28, 0, gold[6], 0.98);
        pen.line(-2, 0, 26, 0, PURE_WHITE, 1.0);
      }
    };
  }
};

/** Row 1: `F00..F11` Diagonal Descending Seraphic Caduceus Staff -> `F12..F29` Twin Dove-Wing Halo Burst! */
export const holyValkyrieSpearCell = {
  duration: 1.0,
  loop: false,
  defaults: {
    palette: SERAPHIC_GOLD_PALETTE
  },
  create(cfg) {
    const gold = buildColorRamp(cfg.palette, 8);
    const stained = buildColorRamp(SERAPHIC_STAINED_PALETTE, 8);
    const grace = buildColorRamp(SERAPHIC_GRACE_PALETTE, 8);
    const goldRamp4 = [gold[2], gold[4], gold[6], PURE_WHITE];
    const graceRamp4 = [grace[1], grace[3], grace[5], PURE_WHITE];

    return {
      step() {},
      renderFront(pen, localT) {
        const progress = clamp01(localT / 1.0);
        if (progress < 0.399) {
          const u = progress / 0.399;
          const spin = u * TWO_PI * 2;
          // Diagonal descent vector from top-left (-X, -Y) toward bottom-right (+X, +Y)
          const shift = (u - 0.5) * 8;
          const tailX = -20 + shift * 0.62;
          const tailY = -24 + shift * 0.78;
          const tipX = 16 + shift * 0.62;
          const tipY = 21 + shift * 0.78;
          const dx = tipX - tailX;
          const dy = tipY - tailY;
          const len = Math.hypot(dx, dy);
          const ux = dx / len;
          const uy = dy / len;
          const nx = -uy;
          const ny = ux;

          pen.radialGlow(tipX * 0.4, tipY * 0.4, 24, gold[5], 0.34);

          // Twin counter-spiraling Caduceus serpent-ribbons wrapping the diagonal staff
          for (let s = 0; s < 2; s++) {
            const col = s === 0 ? gold[6] : stained[3];
            for (let i = 0; i < 26; i++) {
              const f = i / 25;
              const along = f * (len - 6);
              const amp = (8.5 - f * 3.5) * Math.sin(spin + s * Math.PI + f * 6.8);
              const sx = tailX + ux * along + nx * amp;
              const sy = tailY + uy * along + ny * amp;
              pen.stipple(sx, sy, col, 0.94);
              if (i % 4 === 0) pen.stipple(sx, sy, PURE_WHITE, 0.88);
            }
          }

          // Twin Dove-Wings unfurled from the Caduceus cross-guard hub
          const hubX = tailX + ux * (len * 0.36);
          const hubY = tailY + uy * (len * 0.36);
          for (const side of [-1, 1]) {
            for (let f = 0; f < 5; f++) {
              const fu = f / 4;
              const wx = hubX + side * (12 + fu * 12) - ux * (fu * 6);
              const wy = hubY - (10 - fu * 9) + side * ny * 3;
              pen.line(hubX, hubY, wx, wy, f % 2 === 0 ? gold[6] : stained[3], 0.94);
              drawSeraphicFeather(
                pen,
                wx,
                wy,
                side > 0 ? -0.45 + fu * 0.35 : Math.PI + 0.45 - fu * 0.35,
                gold[5],
                f < 2 ? PURE_WHITE : gold[6],
                0.92
              );
            }
          }

          // Diagonal Caduceus Staff shaft + Diamond-Cross Spearhead
          pen.line(tailX + nx, tailY + ny, tipX - ux * 4 + nx, tipY - uy * 4 + ny, gold[5], 0.95);
          pen.line(tailX - nx, tailY - ny, tipX - ux * 4 - nx, tipY - uy * 4 - ny, gold[5], 0.95);
          pen.line(tailX, tailY, tipX, tipY, PURE_WHITE, 1.0);
          pen.line(tipX - ux * 10 + nx * 5, tipY - uy * 10 + ny * 5, tipX, tipY, gold[6], 0.98);
          pen.line(tipX - ux * 10 - nx * 5, tipY - uy * 10 - ny * 5, tipX, tipY, gold[6], 0.98);
          drawSacredCross(pen, hubX, hubY, 8.5, stained[3], PURE_WHITE, 0.96, Math.atan2(uy, ux));
          return;
        }

        // F12..F29: Twin Dove-Wing Halo Burst & Diagonal Planted Caduceus Shrine (zero vertical pole!)
        const impU = clamp01((progress - 0.40) / 0.60);
        const pop = 0.62 + 0.38 * smoothStep(0, 0.16, impU);
        const fade = 1 - smoothStep(0.62, 1.0, impU);
        const env = pop * fade;
        if (env <= 0.02) return;
        const gy = 21;
        const haloCy = -3;

        pen.radialGlow(0, haloCy, 28 * env, gold[5], 0.36 * env);

        // Curved 2.5D Elliptical Sanctuary Base Rings
        drawTiltedOrbitBand(pen, 0, gy, 30 * pop, 0.25, 1.6, 0.95 * env, goldRamp4, null, impU < 0.1);
        drawTiltedOrbitBand(pen, 0, gy, 19 * pop, 0.25, 1.3, 0.88 * env, graceRamp4, null, false);

        // Sweeping Twin Dove-Wing Halo Burst (left & right layered feathered wings)
        for (const side of [-1, 1]) {
          for (let tier = 0; tier < 2; tier++) {
            for (let f = 0; f < 6; f++) {
              const fu = f / 5;
              const ang = (tier === 0 ? -0.62 : -0.18) + fu * 0.72;
              const reach = (16 + (1 - Math.abs(fu - 0.35)) * 15 - tier * 4) * pop;
              const x0 = side * 4;
              const y0 = haloCy + tier * 4;
              const x1 = side * (6 + Math.cos(ang) * reach);
              const y1 = y0 + Math.sin(ang) * reach * 0.78 - (1 - fu) * 6 * pop;
              pen.line(x0, y0, x1, y1, f % 2 === 0 ? gold[6] : tier === 0 ? stained[3] : grace[4], 0.9 * env);
              drawSeraphicFeather(
                pen,
                x1,
                y1,
                side > 0 ? ang : Math.PI - ang,
                gold[5],
                f < 2 ? PURE_WHITE : gold[6],
                0.92 * env
              );
            }
          }
        }

        // Revolving Rose-Gold Halo Ring + Diagonal Planted Caduceus Staff
        drawTiltedOrbitBand(pen, 0, haloCy, 15 * pop, 0.88, 1.4, 0.92 * env, goldRamp4, null, false);

        const topX = -9 * pop;
        const topY = -23 * pop;
        const botX = 7 * pop;
        const botY = gy;
        pen.line(topX, topY, botX, botY, gold[5], 0.96 * env);
        pen.line(topX + 1, topY, botX + 1, botY, PURE_WHITE, 0.98 * env);

        for (let s = 0; s < 2; s++) {
          const col = s === 0 ? gold[6] : stained[3];
          for (let i = 0; i < 18; i++) {
            const f = i / 17;
            const lx = topX + (botX - topX) * f;
            const ly = topY + (botY - topY) * f;
            const wave = Math.sin(impU * 14 + s * Math.PI + f * 5.6) * (6.5 * (1 - f * 0.35));
            pen.stipple(lx + wave, ly - wave * 0.35, col, 0.92 * env);
          }
        }

        drawSacredCross(pen, topX, topY, 9.5 * env, stained[3], PURE_WHITE, 0.96 * env, -0.34 + impU * 1.5);
        drawStarburstFlare(pen, 0, haloCy, 9 * env, 0.92 * env, gold);
      }
    };
  }
};

/** Row 2: 30-frame 6-Winged Seraphic Rose-Window Dome & Pointed Gothic Lancet Arch (`F00..F05` erupt, `F06..F21` active, `F22..F29` dissolve). */
export const cathedralLightPillarCell = {
  duration: 1.0,
  loop: false,
  defaults: {
    palette: SERAPHIC_GOLD_PALETTE
  },
  create(cfg) {
    const gold = buildColorRamp(cfg.palette, 8);
    const stained = buildColorRamp(SERAPHIC_STAINED_PALETTE, 8);
    const grace = buildColorRamp(SERAPHIC_GRACE_PALETTE, 8);
    const goldRamp4 = [gold[2], gold[4], gold[6], PURE_WHITE];
    const graceRamp4 = [grace[1], grace[3], grace[5], PURE_WHITE];

    return {
      step() {},
      renderFront(pen, localT) {
        const progress = clamp01(localT / 1.0);
        const baseY = 22;
        const pop = 0.56 + 0.44 * smoothStep(0, 0.18, progress);
        const fade = 1 - smoothStep(0.76, 1.0, progress);
        const env = pop * fade;
        if (env <= 0.02) return;

        const archH = 48 * pop;
        const maxW = 20 * pop;
        const roseCy = baseY - archH * 0.46;
        const roseR = 10.5 * pop;
        const rot = progress * TWO_PI * 1.5;

        pen.radialGlow(0, roseCy, 28 * env, gold[5], 0.34 * env);

        // 1. Back half of curved 2.5D elliptical sanctuary floor rings
        drawTiltedOrbitBand(pen, 0, baseY, 31 * pop, 0.24, 1.5, 0.9 * env, goldRamp4, BACK_HALF, false);
        drawTiltedOrbitBand(pen, 0, baseY, 20 * pop, 0.24, 1.3, 0.84 * env, graceRamp4, BACK_HALF, false);

        // 2. 6 Unfurling Golden Feathered Seraphim Wings (3 pairs flanking left & right)
        for (const side of [-1, 1]) {
          for (let w = 0; w < 3; w++) {
            const wy0 = baseY - archH * (0.28 + w * 0.22);
            const spanX = (14 + (2 - w) * 4.5) * pop;
            const liftY = (8 + (2 - w) * 3.5) * pop + Math.sin(progress * 12 + w) * 1.8;
            for (let f = 0; f < 5; f++) {
              const fu = f / 4;
              const fx0 = side * (maxW * (0.58 - w * 0.12));
              const fy0 = wy0 + f * 1.8;
              const fx1 = side * Math.min(34, maxW * 0.45 + spanX * (0.58 + 0.42 * Math.sin(fu * 1.35)));
              const fy1 = wy0 - liftY * (1 - fu * 0.55) + fu * 5.5;
              pen.line(fx0, fy0, fx1, fy1, f % 2 === 0 ? gold[5] : w === 1 ? grace[4] : stained[3], 0.88 * env);
              drawSeraphicFeather(
                pen,
                fx1,
                fy1,
                side > 0 ? -0.32 + fu * 0.42 : Math.PI + 0.32 - fu * 0.42,
                gold[5],
                f < 2 ? PURE_WHITE : gold[6],
                0.92 * env
              );
            }
          }
        }

        // 3. Pointed Gothic Ogee Lancet Arch + Rotating Stained-Glass Rose Window + Curved 2.5D Base
        pen.shadeBox(-maxW - 3, baseY - archH - 3, maxW + 3, baseY + 8, (px, py, out) => {
          const dx = Math.abs(px);
          if (dx > maxW) return 0;
          const botCurveY = baseY + Math.sqrt(Math.max(0, 1 - Math.pow(dx / Math.max(1, maxW), 2))) * 6.0;
          const dy = botCurveY - py;
          if (dy < 0 || dy > archH) return 0;
          const absDy = dy;
          const archW = maxW * Math.pow(Math.max(0, 1 - absDy / Math.max(1, archH)), 0.65);
          if (dx > archW) return 0;

          const edge = dx / Math.max(0.5, archW);

          // Central Rotating Stained-Glass Rose Window Mandala
          const rDist = Math.hypot(px, py - roseCy);
          if (rDist <= roseR && roseR > 2) {
            const ra = Math.atan2(py - roseCy, px) + rot;
            const normA = ((ra % TWO_PI) + TWO_PI) % TWO_PI;
            const sector = Math.floor((normA / TWO_PI) * 8);
            const sectorAng = (normA / TWO_PI) * 8 - sector - 0.5;
            if (Math.abs(rDist - roseR) < 1.15 || Math.abs(rDist - roseR * 0.52) < 1.0 || Math.abs(sectorAng) > 0.36) {
              out.alpha = 0.96 * env;
              out.glowStrength = 0.32 * env;
              out.glowColor = gold[6];
              return rDist < 2.2 ? PURE_WHITE : gold[6];
            }
            const paneCols = [stained[3], gold[5], grace[4], stained[4]];
            const pCol = paneCols[sector % 4];
            out.alpha = 0.9 * env;
            out.glowStrength = 0.24 * env;
            out.glowColor = pCol;
            return pCol;
          }

          // Pointed Gothic Ogee Arch Frame & Elliptical Base Rim
          if (edge > 0.78 || dy < 2.0) {
            out.alpha = 0.95 * env;
            out.glowStrength = 0.28 * env;
            out.glowColor = gold[6];
            return edge > 0.9 ? gold[4] : gold[6];
          }

          // Gothic Lancet Tracery Ribs
          if (Math.abs(dx - archW * 0.46) < 1.05) {
            out.alpha = 0.92 * env;
            out.glowStrength = 0.26 * env;
            out.glowColor = gold[6];
            return PURE_WHITE;
          }

          const paneIdx = (Math.floor((px + maxW) / 5) + Math.floor(dy / 8)) % 3;
          const col = paneIdx === 0 ? stained[3] : paneIdx === 1 ? gold[5] : grace[4];
          out.alpha = (0.86 - edge * 0.2) * env;
          out.glowStrength = 0.2 * env;
          out.glowColor = col;
          return col;
        });

        // 4. Celestial Sunburst Cross Finial at the pointed Gothic apex + Front 2.5D Sanctuary Rings
        const finialY = baseY - archH - 3;
        drawSacredCross(pen, 0, finialY, 7.5 * env, stained[3], PURE_WHITE, 0.98 * env, 0);
        drawStarburstFlare(pen, 0, finialY, 6.5 * env, 0.94 * env, gold);
        drawSacredCross(pen, 0, roseCy, 6.8 * env, gold[5], PURE_WHITE, 0.96 * env, rot * 0.5);

        drawTiltedOrbitBand(pen, 0, baseY, 31 * pop, 0.24, 1.6, 0.96 * env, goldRamp4, FRONT_HALF, progress < 0.15);
        drawTiltedOrbitBand(pen, 0, baseY, 20 * pop, 0.24, 1.3, 0.88 * env, graceRamp4, FRONT_HALF, false);
      }
    };
  }
};

/** Row 3: 30-frame Stained-Glass Cathedral Rose Window Mandala (`Priestess` SKILL/ULTIMATE halo + cast crest). */
export const stainedGlassRoseMandalaCell = {
  duration: 1.0,
  loop: true,
  defaults: {
    palette: SERAPHIC_GOLD_PALETTE
  },
  create(cfg) {
    const gold = buildColorRamp(cfg.palette, 8);
    const stained = buildColorRamp(SERAPHIC_STAINED_PALETTE, 8);
    const grace = buildColorRamp(SERAPHIC_GRACE_PALETTE, 8);

    return {
      step() {},
      renderFront(pen, localT) {
        const progress = clamp01(localT / 1.0);
        const rot = progress * TWO_PI;

        pen.radialGlow(0, 0, 38, gold[5], 0.34);

        pen.shadeBox(-38, -38, 38, 38, (px, py, out) => {
          const r = Math.hypot(px, py);
          if (r > 36 || r < 5) return 0;
          const a = Math.atan2(py, px) + rot * 0.5;
          const normA = ((a % TWO_PI) + TWO_PI) % TWO_PI;
          const sector = Math.floor((normA / TWO_PI) * 12);
          const sectorAng = (normA / TWO_PI) * 12 - sector - 0.5;

          if (
            Math.abs(r - 35) < 1.3 ||
            Math.abs(r - 25.5) < 1.2 ||
            Math.abs(r - 14.5) < 1.1 ||
            Math.abs(sectorAng) > 0.41
          ) {
            out.alpha = 0.96;
            out.glowStrength = 0.24;
            out.glowColor = gold[6];
            return r > 33.5 ? gold[6] : gold[4];
          }

          const panePalette = [stained[3], gold[5], grace[4], stained[4]];
          const col = panePalette[sector % 4];
          out.alpha = 0.84;
          out.glowStrength = 0.2;
          out.glowColor = col;
          return Math.abs(sectorAng) < 0.14 && r > 17 && r < 23 ? PURE_WHITE : col;
        });

        for (let k = 0; k < 8; k++) {
          const ka = -rot + (k * TWO_PI) / 8;
          drawSacredCross(pen, Math.cos(ka) * 40, Math.sin(ka) * 40, 4.2, gold[5], gold[6], 0.96, ka + Math.PI / 2);
        }
        drawSacredCross(pen, 0, 0, 10, gold[5], PURE_WHITE, 1.0, rot);
      }
    };
  }
};

/** Row 4: 30-frame Radiant Star-Cross Crescent Slash & Feather Shatter (`spawnSlash` row). */
export const sacredStarCrescentCell = {
  duration: 1.0,
  loop: false,
  defaults: {
    palette: SERAPHIC_GOLD_PALETTE
  },
  create(cfg) {
    const gold = buildColorRamp(cfg.palette, 8);
    const stained = buildColorRamp(SERAPHIC_STAINED_PALETTE, 8);

    return {
      step() {},
      renderFront(pen, localT) {
        const progress = clamp01(localT / 1.0);
        const grow = Easing.outCubic(progress);
        const fade = 1 - Easing.inQuad(progress);

        renderSeraphicCrescentArc(
          pen,
          -10 + grow * 10,
          0,
          0,
          20 + grow * 20,
          1.95,
          8.5 * (1 - progress * 0.55),
          progress,
          gold,
          stained[3]
        );
        if (progress > 0.08 && progress < 0.84) {
          renderSeraphicCrescentArc(
            pen,
            -10 + grow * 4,
            0,
            0,
            14 + grow * 15,
            1.55,
            4.2 * (1 - progress * 0.6),
            progress,
            gold,
            stained[4]
          );
        }
        if (fade > 0.15) {
          drawSacredCross(pen, 8 + grow * 16, 0, 9 * fade, stained[3], gold[6], fade, progress * 1.6);
          for (let f = -2; f <= 2; f++) {
            if (f === 0) continue;
            const a = f * 0.34;
            const r = 18 + grow * 22;
            drawSeraphicFeather(
              pen,
              -2 + Math.cos(a) * r,
              Math.sin(a) * r,
              a,
              gold[5],
              gold[6],
              fade * 0.9
            );
          }
        }
      }
    };
  }
};

/**
 * Live 120Hz 2.5D Final Grace Charge Vortex (`TRUE_ULTIMATE` 3.0s charge aura).
 */
export const seraphicFinalGraceCharge = {
  duration: 0.65,
  defaults: {
    palette: SERAPHIC_GOLD_PALETTE
  },
  create(cfg) {
    const dur = 0.65;
    const gold = buildColorRamp(cfg.palette, 8);
    const stained = buildColorRamp(SERAPHIC_STAINED_PALETTE, 8);
    const grace = buildColorRamp(SERAPHIC_GRACE_PALETTE, 8);
    const chargeU = clamp01(cfg.chargeU ?? cfg.extra?.chargeU ?? 0.5);

    return {
      step() {},
      renderBack(pen, localT) {
        const progress = clamp01(localT / dur);
        const env = Math.sin(progress * Math.PI);
        const rOuter = (22 + chargeU * 26) * (1.15 - progress * 0.35);
        pen.radialGlow(0, -18, (26 + chargeU * 28) * env, gold[5], (0.28 + chargeU * 0.24) * env);
        drawTiltedOrbitBand(pen, 0, -18, rOuter, 0.34, 1.5, 0.86 * env, [gold[2], stained[3], gold[5], PURE_WHITE], BACK_HALF, false);
        drawTiltedOrbitBand(pen, 0, -4, rOuter * 0.78, 0.28, 1.3, 0.8 * env, [grace[2], grace[4], gold[6], PURE_WHITE], BACK_HALF, false);
      },
      renderFront(pen, localT) {
        const progress = clamp01(localT / dur);
        const env = Math.sin(progress * Math.PI);
        const rOuter = (22 + chargeU * 26) * (1.15 - progress * 0.35);
        drawTiltedOrbitBand(pen, 0, -18, rOuter, 0.34, 1.6, 0.94 * env, [gold[2], stained[3], gold[5], PURE_WHITE], FRONT_HALF, chargeU > 0.65);
        drawTiltedOrbitBand(pen, 0, -4, rOuter * 0.78, 0.28, 1.4, 0.9 * env, [grace[2], grace[4], gold[6], PURE_WHITE], FRONT_HALF, false);

        // Inward-converging prismatic star motes
        const moteCount = 8;
        for (let i = 0; i < moteCount; i++) {
          const a = (i * TWO_PI) / moteCount + progress * 2.6 + chargeU * TWO_PI;
          const dist = (1 - progress) * (28 + chargeU * 22) + 4;
          const mx = Math.cos(a) * dist;
          const my = -16 + Math.sin(a) * dist * 0.68;
          const mCol = i % 3 === 0 ? stained[3] : i % 3 === 1 ? grace[4] : gold[6];
          drawSacredCross(pen, mx, my, (2.6 + chargeU * 2.0) * env, mCol, PURE_WHITE, 0.95 * env, a);
        }
      }
    };
  }
};

/**
 * Live 120Hz 2.5D Sanctuary Nova Burst (`FINAL GRACE` instant counter-beam target detonation).
 */
export const sanctuaryNovaBurst = {
  duration: 0.56,
  defaults: {
    palette: SERAPHIC_GOLD_PALETTE
  },
  create(cfg) {
    const dur = 0.56;
    const gold = buildColorRamp(cfg.palette, 8);
    const stained = buildColorRamp(SERAPHIC_STAINED_PALETTE, 8);
    const grace = buildColorRamp(SERAPHIC_GRACE_PALETTE, 8);

    return {
      step() {},
      renderBack(pen, localT) {
        const progress = clamp01(localT / dur);
        const grow = Easing.outCubic(progress);
        const fade = progress < 0.25 ? 1.0 : 1 - Easing.inQuad((progress - 0.25) / 0.75);
        if (fade <= 0.02) return;
        pen.radialGlow(0, 0, (24 + grow * 34) * fade, gold[5], 0.42 * fade);
        drawTiltedOrbitBand(
          pen,
          0,
          0,
          14 + grow * 36,
          0.36,
          1.8,
          0.9 * fade,
          [gold[2], stained[4], gold[6], PURE_WHITE],
          BACK_HALF,
          progress < 0.35
        );
      },
      renderFront(pen, localT) {
        const progress = clamp01(localT / dur);
        const grow = Easing.outCubic(progress);
        const fade = progress < 0.25 ? 1.0 : 1 - Easing.inQuad((progress - 0.25) / 0.75);
        if (fade <= 0.02) return;

        drawTiltedOrbitBand(
          pen,
          0,
          0,
          14 + grow * 36,
          0.36,
          2.0,
          0.96 * fade,
          [gold[2], stained[4], gold[6], PURE_WHITE],
          FRONT_HALF,
          progress < 0.35
        );
        drawTiltedOrbitBand(
          pen,
          0,
          0,
          9 + grow * 24,
          0.62,
          1.5,
          0.88 * fade,
          [grace[2], grace[4], stained[3], PURE_WHITE],
          () => true,
          false
        );

        for (let i = 0; i < 8; i++) {
          const a = (i * TWO_PI) / 8 + grow * 0.85;
          const r = 8 + grow * 32;
          const mx = Math.cos(a) * r;
          const my = Math.sin(a) * r * 0.76;
          const col = i % 3 === 0 ? stained[4] : i % 3 === 1 ? grace[4] : gold[6];
          drawSeraphicFeather(pen, mx, my, a, col, PURE_WHITE, 0.92 * fade);
        }

        drawSacredCross(pen, 0, 0, (20 - grow * 6) * fade, gold[5], PURE_WHITE, fade, progress * 0.6);
        drawStarburstFlare(pen, 0, 0, 14 * fade, fade, gold);
      }
    };
  }
};

/**
 * Row 5: 30-frame Final Grace Prismatic Sunburst Scepter Charge Core (`F00..F29`, seamless loop).
 * Safe logical bounds strictly inside `[-44..+44]` (`0` border clips on `104x104 -> 208x208`).
 */
export const finalGraceChargeSphereCell = {
  duration: 1.0,
  loop: true,
  defaults: {
    palette: SERAPHIC_GOLD_PALETTE
  },
  create(cfg) {
    const gold = buildColorRamp(cfg.palette, 8);
    const stained = buildColorRamp(SERAPHIC_STAINED_PALETTE, 8);
    const grace = buildColorRamp(SERAPHIC_GRACE_PALETTE, 8);

    return {
      step() {},
      renderFront(pen, localT) {
        const progress = clamp01(localT / 1.0);
        const rot = progress * TWO_PI;
        const pulse = 0.92 + 0.08 * Math.sin(rot * 2);

        pen.radialGlow(0, 0, 36 * pulse, gold[5], 0.36);

        // 1. Prismatic Stained-Glass Outer Refraction Ring & Inner Solar Core
        const maxR = 35 * pulse;
        pen.shadeBox(-38, -38, 38, 38, (px, py, out) => {
          const r = Math.hypot(px, py);
          if (r > maxR) return 0;

          // Blinding Solar-White & Imperial-Gold Core
          if (r <= 11.5 * pulse) {
            out.alpha = 1.0;
            out.glowStrength = 0.38;
            out.glowColor = gold[6];
            if (r <= 6.2 * pulse) return PURE_WHITE;
            if (r <= 9.2 * pulse) return gold[6];
            return gold[5];
          }

          // Counter-rotating Prismatic Cathedral Lens Ring (`r = 21..27`)
          if (r >= 20.5 * pulse && r <= 27.5 * pulse) {
            const a = Math.atan2(py, px) - rot;
            const normA = ((a % TWO_PI) + TWO_PI) % TWO_PI;
            const seg = Math.floor((normA / TWO_PI) * 12);
            const segFrac = (normA / TWO_PI) * 12 - seg;
            out.alpha = 1.0;
            if (Math.abs(r - 20.8 * pulse) < 1.0 || Math.abs(r - 27.2 * pulse) < 1.0 || segFrac < 0.14) {
              out.glowStrength = 0.24;
              out.glowColor = gold[5];
              return r > 26.2 * pulse ? gold[2] : gold[6];
            }
            const prismCols = [gold[5], stained[4], grace[4], stained[3]];
            const pCol = prismCols[seg % 4];
            out.glowStrength = 0.24;
            out.glowColor = pCol;
            return pCol;
          }

          // Outer thin golden astrolabe ring (`r = 32..35`)
          if (Math.abs(r - 33.2 * pulse) < 1.15) {
            const a2 = Math.atan2(py, px) + rot * 1.5;
            if (Math.sin(a2 * 8) > -0.35) {
              out.alpha = 1.0;
              out.glowStrength = 0.22;
              out.glowColor = gold[6];
              return Math.sin(a2 * 8) > 0.55 ? PURE_WHITE : gold[5];
            }
          }
          return 0;
        });

        // 2. 8 Inward-Spiraling Light Runes Converging into the Scepter Core
        for (let i = 0; i < 8; i++) {
          const u = (((i / 8) - progress) % 1 + 1) % 1;
          const spiralA = (i * TWO_PI) / 8 + (1 - u) * 1.65 + rot * 0.5;
          const sr = 9 + u * 31;
          const sx = Math.cos(spiralA) * sr;
          const sy = Math.sin(spiralA) * sr;
          const env = Math.sin(u * Math.PI);
          const sCol = i % 3 === 0 ? stained[4] : i % 3 === 1 ? stained[3] : grace[4];
          drawSacredCross(pen, sx, sy, 2.4 + (1 - u) * 2.2, sCol, PURE_WHITE, env > 0.25 ? 1.0 : env * 3, spiralA);
        }

        // 3. Crisp Horizontal-Dominant Final Grace Focal Crossflare (`———` + `|`)
        pen.line(-41, -1, 41, -1, gold[5], 1.0);
        pen.line(-41, 1, 41, 1, gold[5], 1.0);
        pen.line(-41, 0, 41, 0, gold[6], 1.0);
        pen.line(-32, 0, 32, 0, PURE_WHITE, 1.0);
        pen.line(-1, -34, -1, 34, gold[5], 1.0);
        pen.line(1, -34, 1, 34, gold[5], 1.0);
        pen.line(0, -34, 0, 34, gold[6], 1.0);
        pen.line(0, -22, 0, 22, PURE_WHITE, 1.0);
        drawStarburstFlare(pen, 0, 0, 12 * pulse, 1.0, gold);
      }
    };
  }
};

/**
 * Shared envelope for Row 6 & Row 7 so Muzzle exit height matches Beam segment height 1-to-1 on every frame `0..29`!
 */
function getFinalGraceBeamHalfH(progress) {
  const expand = progress < 0.1 ? Easing.outCubic(progress / 0.1) : 1.0;
  const collapse = progress > 0.74 ? 1 - Easing.inQuad((progress - 0.74) / 0.26) : 1.0;
  const env = clamp01(expand * collapse);
  const pulse = 1.0 + 0.05 * Math.sin(progress * TWO_PI * 4);
  return { env, halfH: Math.max(2.5, Math.min(26.5, 25.0 * env * pulse)) };
}

/**
 * Row 6: 30-frame Final Grace Prismatic Focusing Cannon Muzzle (`|===>>>`, facing `+X` right).
 * Safe logical bounds strictly inside `[-44..+44]` (`0` border clips on `104x104 -> 208x208`).
 */
export const finalGraceMuzzlePrismCell = {
  duration: 1.0,
  loop: false,
  defaults: {
    palette: SERAPHIC_GOLD_PALETTE
  },
  create(cfg) {
    const gold = buildColorRamp(cfg.palette, 8);
    const stained = buildColorRamp(SERAPHIC_STAINED_PALETTE, 8);
    const grace = buildColorRamp(SERAPHIC_GRACE_PALETTE, 8);

    return {
      step() {},
      renderFront(pen, localT) {
        const progress = clamp01(localT / 1.0);
        const { env, halfH } = getFinalGraceBeamHalfH(progress);
        if (env <= 0.02) return;

        const rot = progress * TWO_PI * 2;
        const lensH1 = Math.min(42, 40 * env);
        const lensH2 = Math.min(35, 33 * env);
        const flowCycles = progress * 6;
        const kFreq = TWO_PI / 74;

        pen.radialGlow(-8, 0, 36 * env, gold[5], 0.36 * env);

        // 1. Twin Vertical 2.5D Stained-Glass Focusing Portals + Seamlessly Welded Rightward Beam Exit (`px = -26 .. +44`)
        pen.shadeBox(-43, -44, 44, 44, (px, py, out) => {
          const ay = Math.abs(py);

          // Back Focusing Portal Ring at x = -25
          const dPortal1 = Math.hypot((px + 25) / 7.5, py / Math.max(2, lensH1));
          if (dPortal1 >= 0.72 && dPortal1 <= 1.04) {
            const ang = Math.atan2(py, (px + 25) * 4.5) + rot;
            const seg = Math.floor((((ang % TWO_PI) + TWO_PI) % TWO_PI) / (TWO_PI / 10));
            out.alpha = 1.0;
            out.glowStrength = 0.28 * env;
            out.glowColor = gold[6];
            if (dPortal1 > 0.94 || dPortal1 < 0.78) return dPortal1 > 0.98 ? gold[1] : gold[6];
            return seg % 3 === 0 ? stained[4] : seg % 3 === 1 ? stained[3] : grace[4];
          }

          // Front Primary Focusing Portal Ring at x = -9
          const dPortal2 = Math.hypot((px + 9) / 6.5, py / Math.max(2, lensH2));
          if (dPortal2 >= 0.68 && dPortal2 <= 1.04) {
            const ang2 = Math.atan2(py, (px + 9) * 4.5) - rot * 1.2;
            const seg2 = Math.floor((((ang2 % TWO_PI) + TWO_PI) % TWO_PI) / (TWO_PI / 8));
            out.alpha = 1.0;
            out.glowStrength = 0.32 * env;
            out.glowColor = PURE_WHITE;
            if (dPortal2 < 0.8) return PURE_WHITE;
            if (dPortal2 > 0.95) return gold[2];
            return seg2 % 2 === 0 ? gold[5] : stained[4];
          }

          // Forward Horizontal Beam Ignition Jet (`px = -26 .. +44`), reaching exact `halfH` by `px >= 2`
          if (px >= -26 && px <= 44) {
            const funnelScale = px < 2 ? 0.56 + 0.44 * ((px + 26) / 28) : 1.0;
            const localHalfH = halfH * funnelScale;
            const phaseX = px + 41; // Aligns phase with Segment 0 stamped +82px (`+41` logical px) to the right!
            const helixY1 = Math.sin(phaseX * kFreq - flowCycles * TWO_PI) * (localHalfH * 0.84);
            const helixY2 = -helixY1;
            const onHelix1 = px >= 0 && Math.abs(py - helixY1) <= 1.8 * env;
            const onHelix2 = px >= 0 && Math.abs(py - helixY2) <= 1.6 * env;

            if (ay <= localHalfH || onHelix1 || onHelix2) {
              out.alpha = 1.0;
              if (onHelix1 && ay > localHalfH * 0.42) {
                out.glowStrength = 0.32 * env;
                out.glowColor = stained[4];
                return Math.abs(py - helixY1) < 0.85 ? PURE_WHITE : stained[4];
              }
              if (onHelix2 && ay > localHalfH * 0.42) {
                out.glowStrength = 0.3 * env;
                out.glowColor = stained[3];
                return Math.abs(py - helixY2) < 0.8 ? PURE_WHITE : stained[3];
              }
              const uY = ay / Math.max(1, localHalfH);
              out.glowStrength = (0.38 - uY * 0.18) * env;
              out.glowColor = gold[6];
              if (uY <= 0.36) return PURE_WHITE;
              if (uY <= 0.58) return gold[6];
              if (uY <= 0.8) {
                const bandPhase = (((phaseX / 74) - flowCycles) % 1 + 1) % 1;
                const bandIdx = Math.floor(bandPhase * 8 + (py > 0 ? 2 : 0)) % 4;
                return bandIdx === 0 ? gold[5] : bandIdx === 1 ? stained[4] : bandIdx === 2 ? grace[4] : stained[3];
              }
              if (uY <= 0.91) return gold[4];
              return gold[1];
            }
          }
          return 0;
        });

        // 2. Swept-Back Seraphic Shock-Feathers & Blinding Muzzle Starflare
        for (const side of [-1, 1]) {
          drawSeraphicFeather(pen, -17, side * (23 * env), side * 0.48, gold[5], PURE_WHITE, 1.0);
          drawSeraphicFeather(pen, -3, side * (28 * env), side * 0.32, stained[4], gold[6], 1.0);
        }
        drawSacredCross(pen, -9, 0, 15 * env, gold[5], PURE_WHITE, 1.0, 0);
      }
    };
  }
};

/**
 * Row 7: 30-frame Straight Horizontal Pixel-Art Final Grace Beam Segment (`———`).
 * Exact `74` logical pixel (`148px` in `208x208`) periodic phase so stamping segments every `148px`
 * welds into ONE 100% seamless, pinhole-free, razor-straight full-stage Final Grace beam (`0/240` clips)!
 */
export const finalGraceHorizonBeamCell = {
  duration: 1.0,
  loop: false,
  defaults: {
    palette: SERAPHIC_GOLD_PALETTE
  },
  create(cfg) {
    const gold = buildColorRamp(cfg.palette, 8);
    const stained = buildColorRamp(SERAPHIC_STAINED_PALETTE, 8);
    const grace = buildColorRamp(SERAPHIC_GRACE_PALETTE, 8);

    return {
      step() {},
      renderFront(pen, localT) {
        const progress = clamp01(localT / 1.0);
        const { env: beamEnv, halfH } = getFinalGraceBeamHalfH(progress);
        if (beamEnv <= 0.02) return;

        const flowCycles = progress * 6;
        const kFreq = TWO_PI / 74; // Exact 74 logical px = 148px screen period!

        // 1. Pinhole-Free Cel-Clustered Straight Horizontal Final Grace Plasma Column (`px = -44 .. +44`)
        pen.shadeBox(-44, -34, 44, 34, (px, py, out) => {
          if (Math.abs(px) > 44) return 0;
          const ay = Math.abs(py);

          // Periodic helical pixel-ribbon wrapping around the horizontal beam
          const helixY1 = Math.sin(px * kFreq - flowCycles * TWO_PI) * (halfH * 0.84);
          const helixY2 = -helixY1;
          const onHelix1 = Math.abs(py - helixY1) <= 1.8 * beamEnv;
          const onHelix2 = Math.abs(py - helixY2) <= 1.6 * beamEnv;

          if (ay > halfH && !onHelix1 && !onHelix2) return 0;

          out.alpha = 1.0;
          if (onHelix1 && ay > halfH * 0.42) {
            out.glowStrength = 0.32 * beamEnv;
            out.glowColor = stained[4];
            return Math.abs(py - helixY1) < 0.85 ? PURE_WHITE : stained[4];
          }
          if (onHelix2 && ay > halfH * 0.42) {
            out.glowStrength = 0.3 * beamEnv;
            out.glowColor = stained[3];
            return Math.abs(py - helixY2) < 0.8 ? PURE_WHITE : stained[3];
          }

          const uY = ay / Math.max(1, halfH);
          out.glowStrength = (0.38 - uY * 0.18) * beamEnv;
          out.glowColor = gold[6];

          // Core 1: Solid Pure Blinding White Sacred Beam Core (`uY <= 0.36`)
          if (uY <= 0.36) return PURE_WHITE;
          // Core 2: Incandescent Ivory-Gold Plasma (`uY <= 0.58`)
          if (uY <= 0.58) return gold[6];
          // Shell 3: Exact-74px-Periodic Prismatic Stained-Glass Energy Bands (`uY <= 0.80`)
          if (uY <= 0.8) {
            const bandPhase = (((px / 74) - flowCycles) % 1 + 1) % 1;
            const bandIdx = Math.floor(bandPhase * 8 + (py > 0 ? 2 : 0)) % 4;
            return bandIdx === 0 ? gold[5] : bandIdx === 1 ? stained[4] : bandIdx === 2 ? grace[4] : stained[3];
          }
          // Shell 4: Imperial Gold Outer Rail (`uY <= 0.91`)
          if (uY <= 0.91) return gold[4];
          // Crisp 1px Dark Selective-Contrast Rim (`uY > 0.91`)
          return gold[1];
        });

        // 2. Periodic Horizontal Pixel Shock-Streaks & Sacred Star Glints (exact 74px period!)
        for (let s = 0; s < 2; s++) {
          const uS = (((s * 0.5 + flowCycles) % 1) + 1) % 1;
          const sx = Math.round(-37 + uS * 74);
          const sy = Math.round((s % 2 === 0 ? 1 : -1) * (halfH + 3.5));
          if (Math.abs(sy) <= 41 && Math.abs(sx) <= 36) {
            const sCol = s % 2 === 0 ? gold[6] : stained[4];
            pen.line(sx - 5, sy, sx + 5, sy, sCol, 1.0);
            pen.line(sx - 3, sy + (s % 2 === 0 ? -1 : 1), sx + 3, sy + (s % 2 === 0 ? -1 : 1), PURE_WHITE, 1.0);
          }
        }
        if (beamEnv > 0.35) {
          const uG = ((flowCycles % 1) + 1) % 1;
          const glintX = Math.round(-32 + uG * 64);
          drawSacredCross(pen, glintX, 0, 5.5 * beamEnv, gold[5], PURE_WHITE, 1.0, 0);
        }
      }
    };
  }
};

export const SERAPHIC_EFFECT_REGISTRY = {
  scepterStarFocus,
  scepterStarburstCone,
  benedictionRoseWard,
  graceHealBloom,
  seraphicSlipstreamTrail,
  sanctuaryCathedralSeal,
  ophanimChakramWheel,
  cathedralSanctumPillar,
  holySpearReticle,
  holyStarImpactBurst,
  seraphicFinalGraceCharge,
  sanctuaryNovaBurst,
  sacredStarOrbCell,
  holyValkyrieSpearCell,
  cathedralLightPillarCell,
  stainedGlassRoseMandalaCell,
  sacredStarCrescentCell,
  finalGraceChargeSphereCell,
  finalGraceMuzzlePrismCell,
  finalGraceHorizonBeamCell
};

