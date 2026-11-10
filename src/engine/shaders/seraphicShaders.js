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
} from '../ArcaneShaderFX.js?v=30fps46';

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

        const colH = 104 * pop;
        const colR = 16 * scale;
        pen.shadeBox(-colR - 3, -colH, colR + 3, 2, (px, py, out) => {
          const dx = Math.abs(px);
          const hFrac = clamp01(-py / Math.max(1, colH));
          const spireTaper = hFrac > 0.78 ? 1 - (hFrac - 0.78) / 0.22 : 1;
          const localR = colR * spireTaper;
          if (dx > localR) return 0;
          const edge = dx / Math.max(0.5, localR);
          const n = fbmNoise2D(px * 0.18, py * 0.09 + u * 8, 2);
          out.alpha = clamp01((1 - edge * 0.65) * 0.76 * env);
          if (edge < 0.34) {
            out.glowStrength = 0.34 * env;
            out.glowColor = gold[6];
            return PURE_WHITE;
          }
          const useSapphire = Math.sin(px * 0.65) > 0.35 && n > 0.45;
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

        const colH = 104 * pop;
        const colR = 16 * scale;
        for (let s = 0; s < 2; s++) {
          const ramp = s === 0 ? gold : stained;
          for (let i = 0; i < 28; i++) {
            const f = i / 27;
            const a = s * Math.PI + u * 14 - f * 5.8;
            const sinA = Math.sin(a);
            if (sinA < 0) continue;
            const px = Math.cos(a) * (colR + 4) * (1 - f * 0.25);
            const py = -f * colH + sinA * 3;
            pen.stipple(px, py, s === 0 ? ramp[6] : ramp[3], 0.92 * env);
            if (i % 3 === 0) pen.stipple(px, py - 1, PURE_WHITE, 0.88 * env);
          }
        }
        const bolt = buildLightningChain(rng, 0, 0, 0, -colH * 0.95, 0.14 * scale, 3);
        pen.polyline(bolt, gold[6], 0.82 * env);
        drawSacredCross(pen, 0, -colH * 0.55, 11 * scale * env, stained[3], gold[6], 0.92 * env, u * 2.5);
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

/** Row 1: `F00..F11` Descending Heaven's Valkyrie Light-Spear -> `F12..F29` Upright Cathedral Star-Sigil & Holy Geyser! */
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
          const tipY = 33;
          const tailY = -38;
          pen.radialGlow(0, 10, 22, gold[5], 0.34);

          for (let s = 0; s < 2; s++) {
            const col = s === 0 ? gold[6] : stained[3];
            for (let i = 0; i < 24; i++) {
              const f = i / 23;
              const sy = tailY + f * (tipY - tailY - 10);
              const sx = Math.sin(spin + s * Math.PI + f * 6.5) * (9 * (1 - f * 0.45));
              pen.stipple(sx, sy, col, 0.9);
            }
          }

          for (const side of [-1, 1]) {
            pen.line(0, 10, side * 16, -4, gold[5], 0.96);
            pen.line(0, 8, side * 13, -2, gold[6], 0.98);
            pen.line(side * 4, 6, side * 10, -8, stained[3], 0.9);
            pen.stipple(side * 16, -4, PURE_WHITE, 0.95);
          }

          pen.line(-1, tailY, -1, tipY - 4, gold[5], 0.95);
          pen.line(1, tailY, 1, tipY - 4, gold[5], 0.95);
          pen.line(0, tailY + 4, 0, tipY, PURE_WHITE, 1.0);
          pen.line(-5, 18, 0, tipY, gold[6], 0.98);
          pen.line(5, 18, 0, tipY, gold[6], 0.98);
          return;
        }

        const impU = clamp01((progress - 0.40) / 0.60);
        const pop = 0.58 + 0.42 * smoothStep(0, 0.16, impU);
        const fade = 1 - smoothStep(0.56, 1.0, impU);
        const env = pop * fade;
        const gy = 32;

        pen.radialGlow(0, gy - 18, 28 * env, gold[5], 0.38 * env);
        drawTiltedOrbitBand(pen, 0, gy, 34 * pop, 0.24, 1.6, 0.95 * env, goldRamp4, null, impU < 0.08);
        drawTiltedOrbitBand(pen, 0, gy, 22 * pop, 0.24, 1.4, 0.88 * env, graceRamp4, null, false);

        const geyserH = 66 * pop;
        pen.shadeBox(-10, gy - geyserH, 10, gy, (px, py, out) => {
          const dx = Math.abs(px);
          const hFrac = clamp01((gy - py) / Math.max(1, geyserH));
          const w = 9 * (1 - hFrac * 0.65);
          if (dx > w) return 0;
          const edge = dx / Math.max(0.5, w);
          out.alpha = (1 - edge * 0.7) * env;
          out.glowStrength = 0.28 * env;
          out.glowColor = gold[6];
          return edge < 0.35 ? PURE_WHITE : gold[5];
        });
        drawSacredCross(pen, 0, gy - geyserH * 0.58, 12 * env, stained[3], gold[6], 0.94 * env, 0);
      }
    };
  }
};

/** Row 2: 30-frame 7-Spire Gothic Stained-Glass Cathedral Sanctum Pillar (`F00..F05` erupt, `F06..F21` active, `F22..F29` dissolve). */
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

    return {
      step() {},
      renderFront(pen, localT) {
        const progress = clamp01(localT / 1.0);
        const gy = 38;
        const pop = 0.34 + 0.66 * smoothStep(0, 0.18, progress);
        const fade = 1 - smoothStep(0.74, 1.0, progress);
        const env = pop * fade;
        if (env <= 0.02) return;

        pen.radialGlow(0, gy - 40 * pop, 34 * env, gold[5], 0.36 * env);

        const spireDefs = [
          { dx: 0, w: 7.5, h: 76, col: gold[6] },
          { dx: -9, w: 5.5, h: 64, col: stained[3] },
          { dx: 9, w: 5.5, h: 64, col: stained[3] },
          { dx: -17, w: 4.5, h: 50, col: grace[4] },
          { dx: 17, w: 4.5, h: 50, col: grace[4] },
          { dx: -24, w: 3.5, h: 36, col: stained[4] },
          { dx: 24, w: 3.5, h: 36, col: stained[4] }
        ];

        for (const sp of spireDefs) {
          const sh = sp.h * pop;
          const sx = sp.dx;
          if (progress > 0.74) {
            for (let m = 0; m < 8; m++) {
              const mu = m / 7;
              const my = gy - mu * sh - (progress - 0.74) * 28;
              pen.stipple(sx + Math.sin(m * 2.1 + progress * 18) * 2.5, my, m % 2 === 0 ? gold[6] : sp.col, env * 0.92);
            }
            continue;
          }
          pen.shadeBox(sx - sp.w, gy - sh, sx + sp.w, gy, (px, py, out) => {
            const dx = Math.abs(px - sx);
            const hFrac = clamp01((gy - py) / Math.max(1, sh));
            const archW = hFrac > 0.74 ? sp.w * (1 - (hFrac - 0.74) / 0.26) : sp.w;
            if (dx > archW) return 0;
            const edge = dx / Math.max(0.5, archW);
            out.alpha = (0.94 - hFrac * 0.1) * env;
            if (edge > 0.74) {
              out.glowStrength = 0.26 * env;
              out.glowColor = gold[5];
              return gold[5];
            }
            if (edge < 0.28) {
              out.glowStrength = 0.34 * env;
              out.glowColor = gold[6];
              return PURE_WHITE;
            }
            out.glowStrength = 0.22 * env;
            out.glowColor = sp.col;
            return sp.col;
          });
          drawSacredCross(pen, sx, gy - sh - 2, 3.2 * env, gold[5], PURE_WHITE, 0.92 * env, 0);
        }

        drawTiltedOrbitBand(pen, 0, gy, 32 * pop, 0.22, 1.5, 0.94 * env, goldRamp4, null, false);
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
  sacredStarOrbCell,
  holyValkyrieSpearCell,
  cathedralLightPillarCell,
  stainedGlassRoseMandalaCell,
  sacredStarCrescentCell
};
