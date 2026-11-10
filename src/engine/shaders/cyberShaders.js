/**
 * First-Party HD-2D Cybernetic & Plasma Shader Effects for ArcaneShaderFX.
 * Authored natively for Arcane vs. Steel (`VEX-09` & future sci-fi/arcane champions).
 */

import {
  PURE_WHITE,
  clamp01,
  clampRange,
  mixScalar,
  smoothStep,
  Easing,
  packHexColor,
  buildColorRamp,
  hashFloat,
  fbmNoise2D,
  DeterministicRng,
  buildLightningChain,
  drawTiltedOrbitBand,
  drawStarburstFlare,
  MotePool
} from '../ArcaneShaderFX.js?v=30fps57';

const TWO_PI = Math.PI * 2;

export const CYBER_NEON_PALETTE = [
  '#090b1c',
  '#162256',
  '#0068e6',
  '#00d8ff',
  '#5ef6ff',
  '#ff2e93',
  '#ffb3ec',
  '#ffffff'
];

export const CYBER_MAGENTA_PALETTE = [
  '#14081e',
  '#38114e',
  '#8c1874',
  '#e01e84',
  '#ff2e93',
  '#ff7ac4',
  '#ffe0f5',
  '#ffffff'
];

// ============================================================================
// Shared Elliptical Plasma Arc Shader Helper (for single & crossed slashes)
// ============================================================================
function evalArcPoint(arc, radius, theta) {
  const lx = Math.cos(theta) * radius;
  const ly = Math.sin(theta) * radius * arc.squashY;
  const c = Math.cos(arc.tilt);
  const s = Math.sin(arc.tilt);
  return [arc.cx + lx * c - ly * s, arc.cy + lx * s + ly * c];
}

function renderEllipticalSmear(pen, arc, tailTheta, sweepSpan, maxThickness, coolingAge, flashWhite = false) {
  if (Math.abs(sweepSpan) < 0.02 || maxThickness < 0.3) return;
  const ramp = arc.ramp;
  const steps = ramp.length;
  const dir = Math.sign(sweepSpan);
  const absSpan = Math.abs(sweepSpan);
  const cosT = Math.cos(arc.tilt);
  const sinT = Math.sin(arc.tilt);
  const bound = arc.radius + 3;

  pen.shadeBox(arc.cx - bound, arc.cy - bound, arc.cx + bound, arc.cy + bound, (px, py, out) => {
    const dx = px - arc.cx;
    const dy = py - arc.cy;
    const rx = dx * cosT + dy * sinT;
    const ry = (-dx * sinT + dy * cosT) / arc.squashY;
    const dist = Math.hypot(rx, ry);
    if (dist > arc.radius + 0.55 || dist < arc.radius - maxThickness - 1.2) return 0;

    let angDelta = (dir * (Math.atan2(ry, rx) - tailTheta)) % TWO_PI;
    if (angDelta < 0) angDelta += TWO_PI;
    if (angDelta > absSpan) return 0;

    // Thickest near leading 80% of the blade sweep, tapering to a needle tip at the trailing tail
    const along = angDelta / absSpan;
    const localWidth = maxThickness * Math.pow(Math.sin(Math.PI * Math.pow(along, 2.15)), 0.58);
    if (localWidth < 0.34) return 0;

    const across = (arc.radius - dist) / localWidth;
    if (across < 0 || across > 1) return 0;

    out.alpha = Math.min(1, along / 0.38);
    if (flashWhite && across < 0.65) {
      out.glowStrength = 0.28;
      out.glowColor = ramp[steps - 2];
      return PURE_WHITE;
    }

    // Rim burns pure white during initial frames, cooling inward and along the tail
    const stepFromHot =
      across < 0.22 && coolingAge < 0.48
        ? 0
        : Math.round(across * (steps - 1) * 0.76 + coolingAge * 2.35 - along * 0.82 + 0.38);
    const idx = steps - 1 - clampRange(stepFromHot, 0, steps - 1);
    return ramp[idx];
  });

  // Soft additive plasma aura riding the active leading half of the arc
  for (let u = 0.15; u <= 1.0; u += 0.22) {
    const [gx, gy] = evalArcPoint(arc, arc.radius - maxThickness * 0.38, tailTheta + dir * absSpan * u);
    pen.radialGlow(gx, gy, 5 + maxThickness * 0.9, ramp[Math.max(0, steps - 3)], 0.24 * (1 - coolingAge) * u);
  }
}

function advanceArcStroke(pen, stroke, t, flashWhite = false) {
  const localT = t - stroke.startAt;
  if (localT < 0) return;
  const totalSpan = stroke.endAng - stroke.startAng;
  const headProg = Easing.outExpo(clamp01(localT / stroke.sweepDur));
  const tailProg = smoothStep(stroke.sweepDur + stroke.holdDur, stroke.sweepDur + stroke.holdDur + stroke.trailDur, localT);
  const age = clamp01(localT / (stroke.sweepDur + stroke.holdDur + stroke.trailDur));

  if (tailProg < 1) {
    renderEllipticalSmear(
      pen,
      stroke,
      stroke.startAng + totalSpan * tailProg,
      totalSpan * (headProg - tailProg),
      stroke.width * (1 - tailProg * 0.54),
      age,
      flashWhite
    );
  }

  // Faint stippled blade path lingering where the main smear has already passed
  const traceAlpha = 0.68 * (1 - clamp01((localT - stroke.sweepDur - stroke.holdDur) / (stroke.trailDur + 0.18)));
  if (tailProg > 0.03 && traceAlpha > 0.02) {
    const stepK = Math.max(0.015, 0.65 / (Math.abs(totalSpan) * stroke.radius));
    for (let k = 0; k <= tailProg; k += stepK) {
      const [tx, ty] = evalArcPoint(stroke, stroke.radius - 0.5, stroke.startAng + totalSpan * k);
      pen.stipple(tx, ty, stroke.ramp[2], traceAlpha * (0.38 + 0.62 * k));
    }
  }
}

// ============================================================================
// 1. PLASMA CRESCENT SLASH (`plasmaCrescentSlash`)
// ============================================================================
export const plasmaCrescentSlash = {
  duration: 0.72,
  loop: false,
  defaults: {
    palette: CYBER_NEON_PALETTE,
    sparks: ['#ffffff', '#7df9ff', '#00f0ff', '#ff2e93'],
    radius: 38,
    seed: 5
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const sparkCols = (cfg.sparks || ['#ffffff', '#00f0ff']).map(packHexColor);
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: sparkCols, floorY: 0 });

    const primary = {
      cx: 6,
      cy: -26,
      radius: cfg.radius,
      squashY: 0.6,
      tilt: -0.38,
      startAng: -2.55,
      endAng: 0.95,
      width: 12,
      startAt: 0,
      sweepDur: 0.06,
      holdDur: 0.06,
      trailDur: 0.24,
      ramp
    };
    const echo = {
      ...primary,
      radius: cfg.radius * 0.78,
      width: 4.5,
      startAng: -2.2,
      endAng: 0.8,
      startAt: 0.018,
      holdDur: 0.03,
      trailDur: 0.2,
      ramp: ramp.slice(0, 7)
    };

    const [tipX, tipY] = evalArcPoint(primary, primary.radius - 3.5, primary.endAng);
    const [tipX2, tipY2] = evalArcPoint(primary, primary.radius - 3.5, primary.endAng + 0.06);
    const tangAng = Math.atan2(tipY2 - tipY, tipX2 - tipX);

    let t = 0;
    let burstDone = false;

    return {
      step(dt) {
        t += dt;
        if (!burstDone && t >= primary.sweepDur) {
          burstDone = true;
          for (let i = 0; i < 12; i++) {
            const ang = tangAng + rng.between(-0.52, 0.52);
            const spd = rng.between(145, 360);
            motes.emit(
              'spark',
              tipX,
              tipY,
              Math.cos(ang) * spd,
              Math.sin(ang) * spd,
              rng.between(0.14, 0.36),
              rng.pick(sparkCols)
            );
          }
          for (let i = 0; i < 14; i++) {
            const a = primary.startAng + (primary.endAng - primary.startAng) * rng.between(0.32, 1.0);
            const [mx, my] = evalArcPoint(primary, primary.radius, a);
            const outAng = Math.atan2(my - primary.cy, mx - primary.cx);
            const spd = rng.between(32, 95);
            motes.emit(
              'orb',
              mx,
              my,
              Math.cos(outAng) * spd,
              Math.sin(outAng) * spd - 12,
              rng.between(0.22, 0.48),
              rng.chance(0.5) ? ramp[4] : ramp[5],
              0.75,
              120
            );
          }
        }
        motes.step(dt);
      },
      renderFront(pen) {
        advanceArcStroke(pen, echo, t, false);
        advanceArcStroke(pen, primary, t, t < 0.035);

        // Tip glint star when the crescent finishes whipping round
        const glintAge = t - primary.sweepDur * 0.75;
        if (glintAge > 0 && glintAge < 0.2) {
          const gk = Easing.outBack(clamp01(glintAge / 0.05)) * (1 - glintAge / 0.2);
          drawStarburstFlare(pen, tipX, tipY, 9 * gk, 0.9 * gk, ramp);
        }
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 2. TWIN CROSS SLASH (`twinCrossSlash`)
// ============================================================================
function makeLinearCutArc(cx, cy, slashAngle, halfChord, opts) {
  const radius = 58;
  const squashY = 0.56;
  const rMid = radius - (opts.width || 10) * 0.45;
  const tilt = slashAngle - Math.PI * 0.5;
  const halfSpan = Math.asin(clampRange(halfChord / (rMid * squashY), -0.85, 0.85));
  return {
    cx: cx - Math.cos(tilt) * rMid,
    cy: cy - Math.sin(tilt) * rMid,
    radius,
    squashY,
    tilt,
    startAng: -halfSpan,
    endAng: halfSpan,
    ...opts
  };
}

export const twinCrossSlash = {
  duration: 0.78,
  loop: false,
  defaults: {
    palette: CYBER_MAGENTA_PALETTE,
    sparks: ['#ffffff', '#7df9ff', '#00f0ff', '#ff2e93'],
    seed: 9
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const sparkCols = (cfg.sparks || ['#ffffff', '#ff2e93', '#00f0ff']).map(packHexColor);
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: sparkCols, floorY: 0 });

    const crossX = 34;
    const crossY = -23;
    const secondStart = 0.11;
    const closeAt = secondStart + 0.025;

    const cutDown = makeLinearCutArc(crossX, crossY, 0.72, 22, {
      width: 9.5,
      startAt: 0,
      sweepDur: 0.06,
      holdDur: 0.09,
      trailDur: 0.24,
      ramp
    });
    const cutUp = makeLinearCutArc(crossX, crossY, 2.42, 22, {
      width: 10.0,
      startAt: secondStart,
      sweepDur: 0.06,
      holdDur: 0.08,
      trailDur: 0.26,
      ramp
    });

    let t = 0;
    let firstBurst = false;
    let crossBurst = false;

    return {
      step(dt) {
        t += dt;
        if (!firstBurst && t >= cutDown.sweepDur) {
          firstBurst = true;
          const [ex, ey] = evalArcPoint(cutDown, cutDown.radius - 2, cutDown.endAng);
          for (let i = 0; i < 8; i++) {
            const a = 0.72 + rng.between(-0.45, 0.45);
            const sp = rng.between(120, 280);
            motes.emit('spark', ex, ey, Math.cos(a) * sp, Math.sin(a) * sp, rng.between(0.14, 0.3), rng.pick(sparkCols));
          }
        }
        if (!crossBurst && t >= closeAt) {
          crossBurst = true;
          for (let i = 0; i < 20; i++) {
            const a = rng.between(-Math.PI, Math.PI);
            const sp = rng.between(130, 340);
            motes.emit(
              'spark',
              crossX,
              crossY,
              Math.cos(a) * sp,
              Math.sin(a) * sp - 35,
              rng.between(0.15, 0.38),
              rng.pick(sparkCols)
            );
          }
          for (let i = 0; i < 6; i++) {
            motes.emit(
              'glint',
              crossX + rng.between(-14, 14),
              crossY + rng.between(-12, 12),
              0,
              -8,
              rng.between(0.2, 0.38),
              rng.chance(0.5) ? ramp[5] : PURE_WHITE
            );
          }
        }
        motes.step(dt);
      },
      renderFront(pen) {
        const bothHot = t >= closeAt && t < closeAt + 0.065;
        advanceArcStroke(pen, cutDown, t, bothHot);
        advanceArcStroke(pen, cutUp, t, bothHot);

        const q = t - closeAt;
        if (q >= 0 && q < 0.26) {
          const k = 1 - q / 0.26;
          drawStarburstFlare(pen, crossX, crossY, 22 * Math.pow(k, 1.25), k, ramp);
          pen.strokeRing(crossX, crossY, 5 + 24 * Easing.outCubic(1 - k), Math.max(1, 2.2 * k), bothHot ? PURE_WHITE : ramp[5], k);
          pen.radialGlow(crossX, crossY, 34, ramp[4], 0.42 * k);
        }
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 3. EMP OVERLOAD DOME (`empOverloadDome`)
// ============================================================================
export const empOverloadDome = {
  duration: 1.75,
  loop: false,
  defaults: {
    palette: CYBER_NEON_PALETTE,
    fringe: '#ff2e93',
    radius: 48,
    seed: 33
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const fringeCol = packHexColor(cfg.fringe || '#ff2e93');
    const maxR = cfg.radius;
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, ramp[6], ramp[4], fringeCol], floorY: 0 });

    const POP_AT = 0.42;
    const SWELL_DUR = 0.30;
    const STROBE_AT = 1.22;
    const SHATTER_AT = 1.54;

    let t = 0;
    let popped = false;
    let shattered = false;
    let starBolts = [];
    let lastStarSlot = -1;

    const currentRadius = () => {
      if (t < POP_AT) return 0;
      const grow = Easing.outExpo(clamp01((t - POP_AT) / SWELL_DUR));
      const creep = 1 + 0.04 * clamp01((t - POP_AT - SWELL_DUR) / 0.75);
      return maxR * (0.14 + 0.86 * grow) * creep;
    };

    const isCutoutFrame = () => {
      if (t <= STROBE_AT || t >= SHATTER_AT) return false;
      const failProg = (t - STROBE_AT) / (SHATTER_AT - STROBE_AT);
      return hashFloat(cfg.seed, Math.floor(t * 30), 91) < 0.18 + 0.52 * failProg;
    };

    const renderDomePass = (pen, isFront) => {
      const r = currentRadius();
      if (r <= 1.5 || t >= SHATTER_AT || isCutoutFrame()) return;

      const age = t - POP_AT;
      const slot = Math.floor(t * 30);
      const scanScroll = age * 38;
      const floorAspect = 0.17;

      // Ground perimeter ring (`back` draws far half, `front` draws near half)
      drawTiltedOrbitBand(
        pen,
        0,
        0,
        r,
        floorAspect,
        1.7,
        isFront ? 0.92 : 0.62,
        [ramp[1], ramp[3], ramp[4], PURE_WHITE],
        (ang) => (Math.sin(ang) >= 0) === isFront,
        age < 0.1
      );

      if (!isFront) return;

      // Horizontal RGB tear offsets on random scanline rows
      const rowShifts = new Map();
      const tearCount = 2 + (t > STROBE_AT ? 4 : 0);
      for (let i = 0; i < tearCount; i++) {
        const ty = -Math.floor(hashFloat(cfg.seed, slot, i, 1) * r);
        const dir = hashFloat(cfg.seed, slot, i, 2) < 0.5 ? -1 : 1;
        const mag = 2 + Math.floor(hashFloat(cfg.seed, slot, i, 3) * 4);
        rowShifts.set(ty, dir * mag);
      }

      const rCeil = Math.ceil(r);
      for (let y = -rCeil; y < 0; y++) {
        const shift = rowShifts.get(y) || 0;
        for (let x = -rCeil; x <= rCeil; x++) {
          const sx = x - shift;
          const dNorm = Math.hypot(sx + 0.5, y + 0.5) / r;
          if (dNorm > 1) {
            if (dNorm < 1 + 1.45 / r && ((x + y) & 1) === 0) {
              pen.pixel(x, y, fringeCol);
            }
            continue;
          }
          const rimFactor = Math.pow(dNorm, 6);
          const scanLine = ((((y - scanScroll) % 4) + 4) % 4) < 1;
          const wideBand = ((((y - scanScroll * 0.48) % 20) + 20) % 20) < 3.5;

          if (dNorm > 0.962) {
            pen.pixel(x, y, shift ? PURE_WHITE : -y > r * 0.52 && sx < 0 ? PURE_WHITE : ramp[7]);
          } else if (dNorm > 0.925) {
            pen.pixel(x, y, ramp[4]);
          } else if (shift) {
            pen.pixel(x, y, Math.abs(sx) > r * 0.78 ? fringeCol : x & 1 ? ramp[7] : ramp[4]);
          } else {
            const col = scanLine && wideBand ? ramp[7] : scanLine ? ramp[4] : wideBand ? ramp[3] : ramp[2];
            const alpha = 0.06 + 0.44 * rimFactor + (scanLine ? 0.15 + 0.22 * rimFactor : 0) + (wideBand ? 0.14 : 0);
            pen.blend(x, y, col, alpha);
          }
        }
        if (shift) {
          pen.radialGlow(0, y, 6, fringeCol, 0.16);
        }
      }

      // Rim bloom beads + digital corruption blocks
      for (let a = 0.18; a < Math.PI - 0.15; a += 0.38) {
        pen.radialGlow(Math.cos(a) * r, -Math.sin(a) * r, 8, ramp[3], 0.14);
      }
      for (let i = 0; i < 3; i++) {
        const p = hashFloat(cfg.seed, slot, i, 7);
        if (p > 0.48) continue;
        const ang = hashFloat(cfg.seed, slot, i, 8) * Math.PI;
        const dist = hashFloat(cfg.seed, slot, i, 9) * r * 0.82;
        pen.rect(
          Math.round(Math.cos(ang) * dist),
          Math.round(-Math.sin(ang) * dist),
          2 + Math.floor(p * 7),
          1 + Math.floor(p * 3),
          p < 0.2 ? PURE_WHITE : fringeCol
        );
      }
    };

    return {
      step(dt) {
        t += dt;
        // Pre-pop converging streaks
        if (t < POP_AT - 0.05 && rng.chance(0.65)) {
          const a = rng.between(-Math.PI, 0);
          const dist = rng.between(16, 38);
          const life = rng.between(0.12, 0.2);
          const spd = dist / life;
          motes.emit(
            'streak',
            Math.cos(a) * dist,
            -6 + Math.sin(a) * dist * 0.7,
            -Math.cos(a) * spd,
            -Math.sin(a) * spd * 0.7,
            life,
            rng.chance(0.5) ? ramp[4] : fringeCol
          );
        }

        // Initial discharge star-bolts right at POP_AT
        const popAge = t - POP_AT;
        const slot = Math.floor(t * 30);
        if (popAge >= 0 && popAge < 0.26 && slot !== lastStarSlot) {
          lastStarSlot = slot;
          const scale = popAge < 0.05 ? Easing.outBack(popAge / 0.05, 2) : 1 - (popAge - 0.05) / 0.22;
          starBolts = [];
          for (let i = 0; i < 7; i++) {
            const ang = -Math.PI + (i / 6) * Math.PI + rng.between(-0.14, 0.14);
            const len = rng.between(20, 36) * Math.max(0.2, scale);
            starBolts.push(
              buildLightningChain(rng, 0, -7, Math.cos(ang) * len, Math.min(-1, -7 + Math.sin(ang) * len), 0.3, 3)
            );
          }
        } else if (popAge >= 0.26) {
          starBolts.length = 0;
        }

        if (!popped && t >= POP_AT) {
          popped = true;
          for (let i = 0; i < 22; i++) {
            const a = rng.between(-Math.PI, 0);
            const sp = rng.between(70, 210);
            motes.emit('spark', 0, -7, Math.cos(a) * sp, Math.sin(a) * sp, rng.between(0.22, 0.48), rng.pick([PURE_WHITE, ramp[4], fringeCol]));
          }
        }

        if (!shattered && t >= SHATTER_AT) {
          shattered = true;
          const r = maxR * 0.95;
          for (let i = 0; i < 24; i++) {
            const a = rng.between(-Math.PI, 0);
            motes.emit(
              'spark',
              Math.cos(a) * r * rng.between(0.5, 1.0),
              Math.sin(a) * r * rng.between(0.5, 1.0),
              rng.between(-45, 45),
              rng.between(-25, 35),
              rng.between(0.16, 0.32),
              i % 2 === 0 ? ramp[4] : fringeCol
            );
          }
        }

        motes.step(dt);
      },
      renderBack(pen) {
        renderDomePass(pen, false);
      },
      renderFront(pen) {
        // Pre-pop pulsing puck
        if (t < POP_AT) {
          const k = t / POP_AT;
          const r = 1.2 + 3.0 * k * k;
          const blink = Math.sin(TWO_PI * (2 * t + 9 * t * t)) > 0;
          pen.fillCircle(0, -7, r + 1, ramp[3]);
          pen.fillCircle(0, -7, r, blink ? PURE_WHITE : ramp[5]);
          pen.radialGlow(0, -7, 10 + 14 * k, ramp[3], 0.45 + 0.4 * k);
        }

        renderDomePass(pen, true);

        // Pop flash & discharge bolts
        const popAge = t - POP_AT;
        if (popAge >= 0 && popAge < 0.14) {
          const fk = 1 - popAge / 0.14;
          drawStarburstFlare(pen, 0, -10, 26 * fk, 0.95 * fk, ramp);
          pen.radialGlow(0, -12, 38, ramp[4], 0.65 * fk);
        }
        for (let i = 0; i < starBolts.length; i++) {
          pen.polyline(starBolts[i], i % 2 === 0 ? PURE_WHITE : fringeCol, 0.92);
          const mid = starBolts[i][(starBolts[i].length / 2) | 0];
          if (mid) pen.radialGlow(mid[0], mid[1], 7, ramp[4], 0.3);
        }

        // Crawling surface lightning while dome is active
        if (t >= POP_AT + 0.1 && t < SHATTER_AT + 0.14) {
          const slot = Math.floor(t * 24);
          const boltRng = new DeterministicRng(cfg.seed * 41 + slot);
          const r = Math.max(14, currentRadius() * 0.88);
          for (let i = 0; i < 3; i++) {
            const a0 = boltRng.between(-Math.PI + 0.2, -0.2);
            const a1 = clampRange(a0 + boltRng.sign() * boltRng.between(0.35, 0.75), -Math.PI + 0.1, -0.1);
            const pts = buildLightningChain(
              boltRng,
              Math.cos(a0) * r,
              Math.sin(a0) * r,
              Math.cos(a1) * r,
              Math.sin(a1) * r,
              0.32,
              3
            );
            pen.polyline(pts, i === 0 ? PURE_WHITE : ramp[4], 0.85);
          }
        }

        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 4. SUPERNOVA PLASMA EXPLOSION (`supernovaExplosion`)
// ============================================================================
export const supernovaExplosion = {
  duration: 1.55,
  loop: false,
  defaults: {
    palette: CYBER_MAGENTA_PALETTE,
    seed: 14
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const cyanAccent = packHexColor('#00e5ff');
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, ramp[6], ramp[4], cyanAccent] });

    const SHELL_LIFE = 0.54;
    for (let i = 0; i < 42; i++) {
      const a = rng.between(0, TWO_PI);
      const sp = rng.between(125, 330);
      motes.emit(
        'orb',
        Math.cos(a) * 3,
        Math.sin(a) * 3,
        Math.cos(a) * sp,
        Math.sin(a) * sp,
        rng.between(0.2, 0.44),
        rng.pick([PURE_WHITE, ramp[6], ramp[4], cyanAccent]),
        rng.between(0.8, 1.3),
        40
      );
    }

    let t = 0;
    const shellRadius = (time) => 5 + 31 * Easing.outCubic(clamp01(time / SHELL_LIFE));

    const drawShockPlane = (pen, isBack) => {
      const u = (t - 0.02) / 0.48;
      if (u <= 0 || u >= 1) return;
      drawTiltedOrbitBand(
        pen,
        0,
        3,
        12 + 82 * Easing.outCubic(u),
        0.27,
        Math.max(1, 3.8 * (1 - u)),
        1.1 - u,
        [ramp[1], ramp[3], cyanAccent, PURE_WHITE],
        (ang) => (Math.sin(ang) < 0) === isBack,
        u < 0.16
      );
    };

    return {
      step(dt) {
        t += dt;
        if (t > 0.1 && t < 0.82 && rng.chance(26 * dt)) {
          const a = rng.between(0, TWO_PI);
          const r = shellRadius(t);
          motes.emit(
            'glint',
            Math.cos(a) * r,
            Math.sin(a) * r,
            Math.cos(a) * 20,
            Math.sin(a) * 20,
            rng.between(0.24, 0.5),
            rng.chance(0.5) ? cyanAccent : ramp[6]
          );
        }
        motes.step(dt);
      },
      renderBack(pen) {
        drawShockPlane(pen, true);
      },
      renderFront(pen) {
        if (t < SHELL_LIFE) {
          const u = t / SHELL_LIFE;
          const r = shellRadius(t);
          const hollow = smoothStep(0.34, 1.0, u);
          const boilStep = Math.floor(t * 22);

          pen.shadeBox(-r - 4, -r - 4, r + 4, r + 4, (x, y, out) => {
            const d = Math.hypot(x, y);
            const ang = Math.atan2(y, x);
            const wobble = 1 + 0.09 * fbmNoise2D(Math.cos(ang) * 2.2 + boilStep * 0.3, Math.sin(ang) * 2.2, cfg.seed);
            const edge = r * wobble;
            if (d > edge) return 0;
            const v = d / edge;
            if (v < hollow * 0.9) return 0;

            const turb = fbmNoise2D(x * 0.14 + boilStep * 0.25, y * 0.14, cfg.seed + 7);
            const bandVal = v + turb * 0.14;
            const filament = Math.abs(Math.sin(ang * 5 + d * 0.3 - t * 14 + turb * 2.2)) < 0.11;
            out.glowStrength = 0.24 * (1 - u);
            if (v > 0.9) return ramp[2];
            if (filament && v > 0.28) return u < 0.5 ? PURE_WHITE : cyanAccent;
            return bandVal < 0.32 - u * 0.24
              ? PURE_WHITE
              : bandVal < 0.52
                ? ramp[6]
                : bandVal < 0.72
                  ? ramp[4]
                  : cyanAccent;
          });
          pen.radialGlow(0, 0, r * 1.55 + 6, ramp[4], 0.58 * (1 - u));
        }

        if (t < 0.24) {
          const fk = 1 - t / 0.24;
          drawStarburstFlare(pen, 0, 0, 46 * Math.pow(fk, 1.25), fk, ramp);
        }

        const ring1 = t / 0.42;
        if (ring1 < 1) {
          const rr = 8 + 80 * Easing.outCubic(ring1);
          pen.strokeRing(0, 0, rr, Math.max(1, 2.8 * (1 - ring1)), ring1 < 0.25 ? PURE_WHITE : ramp[5], 1.1 - ring1);
          pen.glowRing(0, 0, rr, 5, cyanAccent, 0.34 * (1 - ring1));
        }

        const chargeLeft = 1 - smoothStep(0.14, 0.85, t);
        if (chargeLeft > 0.02) {
          const boltRng = new DeterministicRng(cfg.seed * 53 + Math.floor(t * 20));
          const count = 2 + Math.round(4 * chargeLeft);
          for (let i = 0; i < count; i++) {
            const a = boltRng.between(0, TWO_PI);
            const len = boltRng.between(24, 54) * (0.45 + 0.55 * chargeLeft);
            const pts = buildLightningChain(boltRng, 0, 0, Math.cos(a) * len, Math.sin(a) * len, 0.3, 3);
            pen.polyline(pts, i % 2 === 0 ? PURE_WHITE : cyanAccent, 0.85 * chargeLeft);
          }
        }

        drawShockPlane(pen, false);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 5. SINGULARITY REACTOR CORE (`singularityReactor`)
// ============================================================================
export const singularityReactor = {
  duration: 1.95,
  loop: false,
  defaults: {
    palette: CYBER_NEON_PALETTE,
    sparks: ['#ffffff', '#8cf8ff', '#00e5ff', '#ff2e93'],
    radius: 40,
    coreY: -32,
    seed: 19
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const sparkCols = (cfg.sparks || ['#ffffff', '#00e5ff', '#ff2e93']).map(packHexColor);
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: sparkCols, floorY: 0 });

    const cy = cfg.coreY ?? -32;
    const CHARGE_END = 0.42;
    const BURST_AT = 0.46;
    const HOLD_END = 1.42;

    const activeArcs = [];
    let t = 0;
    let burstDone = false;
    let nextArcAt = 0.08;

    const strokeHexagon = (pen, cx, hcY, rad, rot, col, glowCol, glowAmt) => {
      let prevX = 0;
      let prevY = 0;
      for (let i = 0; i <= 6; i++) {
        const a = rot + (i * TWO_PI) / 6;
        const x = cx + Math.cos(a) * rad;
        const y = hcY + Math.sin(a) * rad;
        if (i > 0) pen.line(prevX, prevY, x, y, col, 0.95);
        if (i < 6) {
          pen.pixel(x, y, PURE_WHITE);
          if (glowAmt > 0) pen.radialGlow(x, y, 5, glowCol, glowAmt);
        }
        prevX = x;
        prevY = y;
      }
    };

    const floorRadius = () =>
      Math.min(
        cfg.radius * 0.98,
        t < BURST_AT
          ? 10 + cfg.radius * 0.48 * Easing.outCubic(clamp01(t / CHARGE_END))
          : 14 + cfg.radius * 0.82 * Easing.outExpo(clamp01((t - BURST_AT) / 0.36))
      );

    return {
      step(dt) {
        t += dt;
        if (t < CHARGE_END && rng.chance(0.75)) {
          const a = rng.between(0, TWO_PI);
          const dist = rng.between(18, cfg.radius * 0.94);
          const life = rng.between(0.12, 0.22);
          const spd = dist / life;
          motes.emit(
            'streak',
            Math.cos(a) * dist,
            cy + Math.sin(a) * dist * 0.85,
            -Math.cos(a) * spd,
            -Math.sin(a) * spd * 0.85,
            life,
            rng.chance(0.45) ? ramp[5] : ramp[3]
          );
        }

        if (!burstDone && t >= BURST_AT) {
          burstDone = true;
          for (let i = 0; i < 32; i++) {
            const a = rng.between(0, TWO_PI);
            const sp = rng.between(75, 185);
            motes.emit('spark', 0, cy, Math.cos(a) * sp, Math.sin(a) * sp - 18, rng.between(0.2, 0.46), rng.pick(sparkCols));
          }
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * TWO_PI + rng.between(-0.16, 0.16);
            const len = cfg.radius * rng.between(0.68, 0.9);
            activeArcs.push({
              born: t,
              life: rng.between(0.14, 0.26),
              pts: buildLightningChain(rng, 0, cy, Math.cos(a) * len, Math.min(-2, cy + Math.sin(a) * len), 0.3, 3),
              hot: i % 2 === 0
            });
          }
        }

        if (t >= BURST_AT && t < HOLD_END && t >= nextArcAt) {
          nextArcAt = t + rng.between(0.05, 0.1);
          const r = cfg.radius * rng.between(0.52, 0.85);
          const a0 = rng.between(0, TWO_PI);
          const a1 = a0 + rng.sign() * rng.between(0.45, 0.95);
          activeArcs.push({
            born: t,
            life: rng.between(0.08, 0.16),
            pts: buildLightningChain(
              rng,
              Math.cos(a0) * r,
              Math.min(-2, cy + Math.sin(a0) * r * 0.82),
              Math.cos(a1) * r,
              Math.min(-2, cy + Math.sin(a1) * r * 0.82),
              0.28,
              3
            ),
            hot: rng.chance(0.5)
          });
        }

        for (let i = activeArcs.length - 1; i >= 0; i--) {
          if (t - activeArcs[i].born >= activeArcs[i].life) activeArcs.splice(i, 1);
        }
        motes.step(dt);
      },
      renderBack(pen) {
        const fade = 1 - smoothStep(HOLD_END, 1.88, t);
        if (fade <= 0.02) return;
        drawTiltedOrbitBand(
          pen,
          0,
          0,
          floorRadius(),
          0.18,
          2,
          0.85 * fade,
          [ramp[1], ramp[2], ramp[3], ramp[6]],
          (ang) => Math.sin(ang) < 0,
          t >= BURST_AT && t < BURST_AT + 0.14
        );
      },
      renderFront(pen) {
        const fade = 1 - smoothStep(HOLD_END, 1.88, t);
        if (fade > 0.02) {
          drawTiltedOrbitBand(
            pen,
            0,
            0,
            floorRadius(),
            0.18,
            2,
            0.95 * fade,
            [ramp[1], ramp[3], ramp[5], PURE_WHITE],
            (ang) => Math.sin(ang) >= 0,
            t >= BURST_AT && t < BURST_AT + 0.14
          );

          const scale =
            t < BURST_AT
              ? 0.45 + 0.55 * Easing.outBack(clamp01(t / CHARGE_END))
              : 1.0 - 0.25 * smoothStep(HOLD_END, 1.88, t);
          const outerR = cfg.radius * 0.72 * scale * fade;
          const innerR = cfg.radius * 0.44 * scale * fade;
          if (outerR > 3) {
            strokeHexagon(pen, 0, cy, outerR, t * 2.4, ramp[3], ramp[3], 0.22 * fade);
            strokeHexagon(pen, 0, cy, innerR, -t * 3.6 + 0.5, ramp[5], ramp[5], 0.24 * fade);
          }

          const isFlash = t >= BURST_AT && t < BURST_AT + 0.08;
          const coreR = isFlash ? 10.5 : (5.0 + 1.5 * Math.sin(t * 22)) * fade;
          if (coreR > 0.8) {
            pen.fillCircle(0, cy, coreR + 2.2, isFlash ? ramp[6] : ramp[2]);
            pen.fillCircle(0, cy, coreR + 0.9, isFlash ? PURE_WHITE : ramp[5]);
            pen.fillCircle(0, cy, coreR * 0.62, PURE_WHITE);
            pen.radialGlow(0, cy, 22 * fade, ramp[3], 0.48 * fade);
            pen.radialGlow(0, cy, 12 * fade, ramp[5], 0.4 * fade);
          }

          if (t >= BURST_AT && t < BURST_AT + 0.24) {
            const fk = 1 - (t - BURST_AT) / 0.24;
            drawStarburstFlare(pen, 0, cy, 22 * fk, 0.8 * fk, ramp);
          }
        }

        for (let i = 0; i < activeArcs.length; i++) {
          const a = activeArcs[i];
          const u = clamp01(1 - (t - a.born) / a.life);
          const col = u > 0.65 ? PURE_WHITE : a.hot ? ramp[5] : ramp[3];
          pen.polyline(a.pts, col, u);
          const mid = a.pts[(a.pts.length / 2) | 0];
          if (mid) pen.radialGlow(mid[0], mid[1], 7, a.hot ? ramp[5] : ramp[3], 0.3 * u);
        }

        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 6. AEGIS HEXAGONAL DOME (`aegisHexDome`) — 3D Geodesic Back + Front Barrier
// ============================================================================
const SQRT3 = Math.sqrt(3);
const DOME_TILT_SIN = 0.12;
const DOME_TILT_COS = Math.sqrt(1 - DOME_TILT_SIN * DOME_TILT_SIN);
const HEX_MESH_CACHE = new Map();

function axialHexId(gx, gy) {
  const fq = (SQRT3 / 3) * gx - gy / 3;
  const fr = (2 / 3) * gy;
  const fs = -fq - fr;
  let q = Math.round(fq);
  let r = Math.round(fr);
  const s = Math.round(fs);
  const dq = Math.abs(q - fq);
  const dr = Math.abs(r - fr);
  const ds = Math.abs(s - fs);
  if (dq > dr && dq > ds) q = -r - s;
  else if (dr > ds) r = -q - s;
  return q * 1024 + r;
}

function buildHexDomeMesh(rx, ry) {
  const cacheKey = `${rx}:${ry}`;
  if (HEX_MESH_CACHE.has(cacheKey)) return HEX_MESH_CACHE.get(cacheKey);
  const frontPts = [];
  const backPts = [];
  const nx = Math.ceil(rx) + 1;
  const ny = Math.ceil(ry) + 1;
  const stride = nx * 2 + 1;
  const cellMaps = [new Map(), new Map()];

  for (let y = -ny; y <= Math.ceil(ry * DOME_TILT_SIN) + 1; y++) {
    for (let x = -nx; x <= nx; x++) {
      const ux = (x + 0.5) / rx;
      const uy = -(y + 0.5) / ry;
      const r2 = ux * ux + uy * uy;
      if (r2 > 1) continue;
      const uz = Math.sqrt(1 - r2);

      for (let sideIdx = 0; sideIdx < 2; sideIdx++) {
        const zSign = sideIdx === 0 ? 1 : -1;
        const rotY = uy * DOME_TILT_COS + zSign * uz * DOME_TILT_SIN;
        const rotZ = -uy * DOME_TILT_SIN + zSign * uz * DOME_TILT_COS;
        if (rotY < 0) continue;
        const lon = Math.atan2(ux, rotZ);
        const lat = Math.asin(Math.min(1, rotY));
        const cellId = axialHexId(lon * 5.6, lat * 6.15);
        const pt = { x, y, rotY, lat, cellId, rim: 1 - uz, isSeam: false };
        (sideIdx === 0 ? frontPts : backPts).push(pt);
        cellMaps[sideIdx].set((y + ny) * stride + (x + nx), cellId);
      }
    }
  }

  [frontPts, backPts].forEach((arr, idx) => {
    const map = cellMaps[idx];
    const lookup = (px, py) => map.get((py + ny) * stride + (px + nx));
    for (let i = 0; i < arr.length; i++) {
      const p = arr[i];
      const rightId = lookup(p.x + 1, p.y);
      const downId = lookup(p.x, p.y + 1);
      p.isSeam = (rightId !== undefined && rightId !== p.cellId) || (downId !== undefined && downId !== p.cellId);
    }
  });

  const mesh = { frontPts, backPts };
  HEX_MESH_CACHE.set(cacheKey, mesh);
  return mesh;
}

export const aegisHexDome = {
  duration: 1.2,
  loop: true,
  defaults: {
    palette: CYBER_NEON_PALETTE,
    radius: 42,
    radiusY: 56,
    seed: 5
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const rx = cfg.radius ?? 42;
    const ry = cfg.radiusY ?? Math.round(rx * 1.32);
    const mesh = buildHexDomeMesh(rx, ry);
    let totalTime = 0;

    const renderHemisphere = (pen, loopT, isFront) => {
      const deploy = clamp01(totalTime / 0.08);
      const phase = (loopT / 1.2) % 1;
      const scanLat = phase * 1.65;
      const pts = isFront ? mesh.frontPts : mesh.backPts;

      drawTiltedOrbitBand(
        pen,
        0,
        0,
        rx * deploy,
        DOME_TILT_SIN,
        1.6,
        isFront ? 0.9 : 0.55,
        [ramp[1], ramp[2], ramp[3], PURE_WHITE],
        (ang) => (Math.sin(ang) >= 0) === isFront,
        totalTime < 0.09
      );

      for (let i = 0; i < pts.length; i++) {
        const pt = pts[i];
        if (pt.rotY > deploy * 1.05) continue;
        const onScan = Math.abs(pt.lat - scanLat) < 0.07;
        const rimPow = Math.pow(pt.rim, 2.4);
        if (pt.isSeam) {
          const col = onScan ? ramp[5] : rimPow > 0.45 ? ramp[4] : isFront ? ramp[3] : ramp[2];
          const alpha = (isFront ? 0.44 : 0.22) + rimPow * 0.45 + (onScan ? 0.42 : 0);
          pen.blend(pt.x, pt.y, col, Math.min(0.95, alpha));
        } else if (rimPow > 0.54 || onScan) {
          const col = onScan ? ramp[4] : ramp[3];
          const alpha = (isFront ? 0.14 : 0.06) + rimPow * 0.26 + (onScan ? 0.12 : 0);
          pen.blend(pt.x, pt.y, col, Math.min(0.56, alpha));
        }
      }

      if (isFront) {
        for (let a = 0.2; a < Math.PI - 0.15; a += 0.45) {
          pen.radialGlow(Math.cos(a) * rx, -Math.sin(a) * ry, 7, ramp[3], 0.16);
        }
        pen.radialGlow(0, -ry * 0.5, 22, ramp[3], 0.14 + 0.06 * Math.sin(phase * TWO_PI));
      }
    };

    return {
      step(dt) {
        totalTime += dt;
      },
      renderBack(pen, loopT) {
        renderHemisphere(pen, loopT, false);
      },
      renderFront(pen, loopT) {
        renderHemisphere(pen, loopT, true);
      }
    };
  }
};

// ============================================================================
// 7. WING-PYLON THRUSTER (`wingPylonThruster`) — Tankless Shock-Diamond Plume
// ============================================================================
export const wingPylonThruster = {
  duration: 1.0,
  loop: true,
  defaults: {
    palette: CYBER_NEON_PALETTE,
    length: 19,
    tilt: -0.62,
    frontOnly: false,
    seed: 30
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, ramp[6], ramp[4], ramp[5]] });
    let emitAcc = 0;

    const dirX = Math.sin(cfg.tilt ?? -0.62);
    const dirY = Math.cos(cfg.tilt ?? -0.62);
    const normX = dirY;
    const normY = -dirX;
    const pylonGap = 2.5;

    const renderJetPlumes = (pen, loopT) => {
      const phase = loopT;
      for (const side of [-1, 1]) {
        const ox = side * pylonGap;
        const oy = side * -1.2;
        const plumeLen = (cfg.length ?? 19) * (0.9 + 0.1 * Math.sin(TWO_PI * 7 * phase + side));
        const steps = Math.ceil(plumeLen * 2);

        for (let i = 0; i <= steps; i++) {
          const v = i / steps;
          const d = v * plumeLen;
          const halfW = mixScalar(2.8, 0.35, v) + 0.95 * Math.sin(v * Math.PI);
          const cx = ox + dirX * d;
          const cy = oy + dirY * d;

          for (let qOff = -halfW; qOff <= halfW; qOff += 0.55) {
            const q = Math.abs(qOff) / Math.max(0.4, halfW);
            const turb = fbmNoise2D(qOff * 0.6 + side * 4, v * 4.2 - phase * 16, cfg.seed + (side > 0 ? 11 : 0));
            const heat = (1 - v) * 1.15 - q * 0.85 + turb * 0.22;
            if (heat < -0.04) continue;
            const col =
              heat > 0.82
                ? PURE_WHITE
                : heat > 0.6
                  ? ramp[4]
                  : heat > 0.38
                    ? ramp[3]
                    : heat > 0.16
                      ? ramp[5]
                      : ramp[2];
            pen.pixel(cx + normX * qOff, cy + normY * qOff, col);
          }
        }

        // 3 Mach shock-diamonds pulsing along each plasma plume
        for (let k = 0; k < 3; k++) {
          const d = 3.5 + k * 5.1 + Math.sin(TWO_PI * 5 * phase + k) * 0.5;
          if (d > plumeLen * 0.82) break;
          const sx = ox + dirX * d;
          const sy = oy + dirY * d;
          pen.pixel(sx, sy, PURE_WHITE);
          pen.pixel(sx + normX, sy + normY, ramp[4]);
          pen.pixel(sx - normX, sy - normY, ramp[4]);
          pen.radialGlow(sx, sy, 5, k === 0 ? ramp[4] : ramp[5], 0.36);
        }
        pen.radialGlow(ox, oy, 7, PURE_WHITE, 0.42);
      }
      motes.render(pen);
    };

    return {
      step(dt) {
        emitAcc += dt;
        while (emitAcc >= 0.028) {
          emitAcc -= 0.028;
          const side = rng.sign();
          const dist = (cfg.length ?? 19) * rng.between(0.35, 0.85);
          const spd = rng.between(65, 145);
          motes.emit(
            'spark',
            side * pylonGap + dirX * dist,
            dirY * dist,
            dirX * spd + rng.between(-20, 20),
            dirY * spd + rng.between(-16, 20),
            rng.between(0.12, 0.26),
            rng.chance(0.5) ? ramp[4] : ramp[5],
            1,
            40
          );
        }
        motes.step(dt);
      },
      renderBack(pen, loopT) {
        if (!cfg.frontOnly) renderJetPlumes(pen, loopT);
      },
      renderFront(pen, loopT) {
        if (cfg.frontOnly) renderJetPlumes(pen, loopT);
      }
    };
  }
};

// ============================================================================
// 8. HOLO-TARGET RETICLE (`holoTargetReticle`)
// ============================================================================
export const holoTargetReticle = {
  duration: 0.68,
  loop: false,
  defaults: {
    palette: CYBER_NEON_PALETTE,
    boxW: 22,
    boxH: 62,
    seed: 9
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const drawCorner = (pen, x, y, sx, sy, len, col, alpha) => {
      pen.line(x, y, x + sx * len, y, col, alpha);
      pen.line(x, y, x, y + sy * len, col, alpha);
      pen.stipple(x, y, PURE_WHITE, alpha);
    };

    return {
      renderBack(pen, t) {
        const u = clamp01(t / 0.68);
        const fade = u > 0.78 ? (1 - u) / 0.22 : 1;
        if (fade <= 0.02) return;
        const rx = (cfg.boxW + 4) * Easing.outBack(clamp01(t / 0.16));
        const ry = Math.max(2, rx * 0.2);
        for (let i = 0; i < 32; i++) {
          const a = (i / 32) * TWO_PI;
          if (Math.sin(a) >= 0) continue;
          pen.stipple(Math.cos(a) * rx, Math.sin(a) * ry, i % 2 === 0 ? ramp[3] : ramp[2], 0.75 * fade);
        }
      },
      renderFront(pen, t) {
        const u = clamp01(t / 0.68);
        const fade = u > 0.78 ? (1 - u) / 0.22 : 1;
        if (fade <= 0.02) return;

        const snap = Easing.outBack(clamp01(t / 0.18), 1.8);
        const spread = (1 - snap) * 12;
        const x0 = -cfg.boxW - spread;
        const x1 = cfg.boxW + spread;
        const y0 = -cfg.boxH - spread * 0.6;
        const y1 = -2 + spread * 0.3;
        const isFlash = t >= 0.16 && t <= 0.24;
        const col = isFlash ? PURE_WHITE : ramp[4];

        drawCorner(pen, x0, y0, 1, 1, 7, col, fade);
        drawCorner(pen, x1, y0, -1, 1, 7, col, fade);
        drawCorner(pen, x0, y1, 1, -1, 7, col, fade);
        drawCorner(pen, x1, y1, -1, -1, 7, col, fade);

        const rx = (cfg.boxW + 4) * clamp01(snap);
        const ry = Math.max(2, rx * 0.2);
        for (let i = 0; i < 32; i++) {
          const a = (i / 32) * TWO_PI;
          if (Math.sin(a) < 0) continue;
          pen.stipple(Math.cos(a) * rx, Math.sin(a) * ry, col, 0.9 * fade);
        }

        if (t >= 0.08 && t <= 0.54) {
          const scanU = smoothStep(0, 1, (t - 0.08) / 0.46);
          const sy = Math.round(mixScalar(y0 + 2, y1 - 2, scanU));
          pen.line(x0 + 2, sy, x1 - 2, sy, PURE_WHITE, 0.92 * fade);
          pen.line(x0 + 3, sy - 1, x1 - 3, sy - 1, ramp[3], 0.55 * fade);
          pen.line(x0 + 4, sy - 2, x1 - 4, sy - 2, ramp[5], 0.34 * fade);
          pen.radialGlow(0, sy, 14, ramp[3], 0.28 * fade);
        }

        const cy = -Math.round(cfg.boxH * 0.52);
        const dr = isFlash ? 6 : 4.5;
        pen.line(0, cy - dr, dr, cy, ramp[5], 0.9 * fade);
        pen.line(dr, cy, 0, cy + dr, ramp[5], 0.9 * fade);
        pen.line(0, cy + dr, -dr, cy, ramp[5], 0.9 * fade);
        pen.line(-dr, cy, 0, cy - dr, ramp[5], 0.9 * fade);
        pen.pixel(0, cy, PURE_WHITE);
        pen.radialGlow(0, cy, 10, ramp[5], 0.32 * fade);
      }
    };
  }
};

// ============================================================================
// 9. ORBITAL HELIX BEAM (`orbitalHelixBeam`) — Hand-to-Target Vector Beam
// ============================================================================
export const orbitalHelixBeam = {
  duration: 0.32,
  loop: false,
  defaults: {
    palette: CYBER_NEON_PALETTE,
    dx: 72,
    dy: 4,
    width: 4.5,
    seed: 10
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const beamLevels = [PURE_WHITE, ramp[6], ramp[4], ramp[3], ramp[5], ramp[2]];

    return {
      renderFront(pen, t) {
        const u = clamp01(t / 0.32);
        const fade = u < 0.12 ? u / 0.12 : u > 0.72 ? (1 - u) / 0.28 : 1;
        if (fade <= 0.03) return;

        const dx = cfg.dx ?? 72;
        const dy = cfg.dy ?? 4;
        const dist = Math.max(8, Math.hypot(dx, dy));
        const ux = dx / dist;
        const uy = dy / dist;
        const nx = -uy;
        const ny = ux;
        const baseW = (cfg.width ?? 4.5) * fade;

        for (let d = 0; d <= dist; d += 0.6) {
          const bx = ux * d;
          const by = uy * d;
          const w = baseW * (1 + 0.14 * Math.sin(d * 0.32 - u * TWO_PI * 4));
          const waveBoost = (((d * 0.03 - u * 3) % 1) + 1) % 1 < 0.12 ? 1 : 0;

          for (let qOff = -w * 1.25; qOff <= w * 1.25; qOff += 0.55) {
            const q = Math.abs(qOff) / Math.max(0.4, w);
            const px = bx + nx * qOff;
            const py = by + ny * qOff;
            let lv = q < 0.24 ? 0 : q < 0.45 ? 1 : q < 0.68 ? 2 : q < 0.88 ? 3 : q < 1.02 ? 4 : 5;
            lv = Math.max(0, lv - waveBoost);
            pen.stipple(px, py, beamLevels[lv], lv === 5 ? clamp01((1.25 - q) / 0.25) * fade : fade);
          }

          // Counter-twisting double-helix plasma strands
          for (let s = 0; s < 2; s++) {
            const ang = d * 0.2 - u * TWO_PI * 4 + s * Math.PI;
            if (Math.cos(ang) > -0.1) {
              const off = Math.sin(ang) * w * 1.05;
              pen.stipple(bx + nx * off, by + ny * off, Math.cos(ang) > 0.5 ? PURE_WHITE : ramp[5], fade);
            }
          }
          if ((Math.round(d) & 7) === 0) {
            pen.radialGlow(bx, by, w * 2.2 + 4, ramp[3], 0.22 * fade);
          }
        }

        // Firing hand muzzle flare at (0, 0)
        pen.fillCircle(0, 0, 3.8 * fade, ramp[4]);
        pen.fillCircle(0, 0, 2.2 * fade, PURE_WHITE);
        pen.radialGlow(0, 0, 16, ramp[4], 0.55 * fade);

        // Target core impact shockwave & starburst at (dx, dy)
        const rImp = 4 + 14 * Easing.outCubic(u);
        pen.strokeRing(dx, dy, rImp, Math.max(1, 2 * (1 - u)), u < 0.3 ? PURE_WHITE : ramp[5], 0.95 * fade);
        pen.fillCircle(dx, dy, 4.5 * fade, ramp[5]);
        pen.fillCircle(dx, dy, 2.5 * fade, PURE_WHITE);
        drawStarburstFlare(pen, dx, dy, 16 * fade, 0.72 * fade, ramp);
        pen.radialGlow(dx, dy, 24, ramp[5], 0.6 * fade);
      }
    };
  }
};

// ============================================================================
// 10. RGB GLITCH TEAR (`rgbGlitchTear`) — Transparent Digital Corruption
// ============================================================================
export const rgbGlitchTear = {
  duration: 0.46,
  loop: false,
  defaults: {
    palette: CYBER_MAGENTA_PALETTE,
    seed: 7
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const cyanCol = packHexColor('#00e5ff');

    return {
      renderFront(pen, t) {
        const u = clamp01(t / 0.46);
        const fade = 1 - u * u;
        if (fade <= 0.04) return;

        const slot = Math.floor(t * 24);
        const barCount = 4 + Math.floor((1 - u) * 4);
        for (let i = 0; i < barCount; i++) {
          const y = -8 - Math.floor(hashFloat(cfg.seed, slot, i, 1) * 46);
          const w = 8 + Math.floor(hashFloat(cfg.seed, slot, i, 2) * 18);
          const x = Math.round((hashFloat(cfg.seed, slot, i, 3) - 0.5) * 26);
          const h = hashFloat(cfg.seed, slot, i, 4) < 0.35 ? 2 : 1;
          const isMag = hashFloat(cfg.seed, slot, i, 5) < 0.5;
          const col = hashFloat(cfg.seed, slot, i, 6) < 0.2 ? PURE_WHITE : isMag ? ramp[4] : cyanCol;
          for (let dy = 0; dy < h; dy++) {
            pen.line(x - w * 0.5, y + dy, x + w * 0.5, y + dy, col, 0.84 * fade);
          }
          const split = isMag ? 2 : -2;
          pen.line(x - w * 0.4 + split, y, x + w * 0.4 + split, y, isMag ? cyanCol : ramp[4], 0.52 * fade);
        }

        for (let i = 0; i < 6; i++) {
          if (hashFloat(cfg.seed, slot, i, 10) > fade) continue;
          const bx = Math.round((hashFloat(cfg.seed, slot, i, 11) - 0.5) * 32);
          const by = -6 - Math.floor(hashFloat(cfg.seed, slot, i, 12) * 48);
          pen.rect(
            bx,
            by,
            2 + Math.floor(hashFloat(cfg.seed, slot, i, 13) * 3),
            1 + Math.floor(hashFloat(cfg.seed, slot, i, 14) * 2),
            i % 2 === 0 ? cyanCol : ramp[4]
          );
        }

        const boltRng = new DeterministicRng(cfg.seed * 31 + slot);
        for (let i = 0; i < 2; i++) {
          const x0 = boltRng.between(-12, 12);
          const y0 = boltRng.between(-46, -14);
          const x1 = x0 + boltRng.between(-14, 14);
          const y1 = y0 + boltRng.between(-12, 12);
          const pts = buildLightningChain(boltRng, x0, y0, x1, y1, 0.35, 2);
          pen.polyline(pts, i === 0 ? PURE_WHITE : cyanCol, 0.85 * fade);
          pen.radialGlow((x0 + x1) * 0.5, (y0 + y1) * 0.5, 8, i === 0 ? cyanCol : ramp[4], 0.3 * fade);
        }
      }
    };
  }
};

// ============================================================================
// 11. CYBER IMPACT SPARK & HOLO-PHASE BURST (`cyberImpactSpark`)
// ============================================================================
export const cyberImpactSpark = {
  duration: 0.36,
  loop: false,
  defaults: {
    palette: CYBER_NEON_PALETTE,
    phaseMode: false,
    seed: 13
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, ramp[4], ramp[3], ramp[5]] });
    let t = 0;
    let emitted = false;

    return {
      step(dt) {
        t += dt;
        if (!emitted) {
          emitted = true;
          const count = cfg.phaseMode ? 12 : 18;
          for (let i = 0; i < count; i++) {
            const a = cfg.phaseMode ? -Math.PI * 0.5 + rng.between(-1.1, 1.1) : rng.between(0, TWO_PI);
            const sp = rng.between(75, 210);
            motes.emit(
              'spark',
              0,
              cfg.phaseMode ? -14 : 0,
              Math.cos(a) * sp,
              Math.sin(a) * sp,
              rng.between(0.14, 0.3),
              rng.chance(0.5) ? ramp[4] : ramp[5],
              1,
              cfg.phaseMode ? 120 : 180
            );
          }
        }
        motes.step(dt);
      },
      renderBack(pen) {
        if (!cfg.phaseMode) return;
        const u = clamp01(t / 0.36);
        const fade = 1 - u;
        if (fade <= 0.04) return;
        drawTiltedOrbitBand(
          pen,
          0,
          0,
          8 + 18 * Easing.outCubic(u),
          0.2,
          1.6,
          0.85 * fade,
          [ramp[1], ramp[2], ramp[3], PURE_WHITE],
          (ang) => Math.sin(ang) < 0,
          u < 0.2
        );
      },
      renderFront(pen) {
        const u = clamp01(t / 0.36);
        const fade = 1 - u;
        if (fade <= 0.03) return;

        if (cfg.phaseMode) {
          drawTiltedOrbitBand(
            pen,
            0,
            0,
            8 + 18 * Easing.outCubic(u),
            0.2,
            1.6,
            0.9 * fade,
            [ramp[1], ramp[3], ramp[5], PURE_WHITE],
            (ang) => Math.sin(ang) >= 0,
            u < 0.2
          );
          const halfW = Math.max(0.8, 5.5 * (1 - Easing.inQuad(u)));
          for (let y = -50; y <= 0; y++) {
            const ky = 1 - Math.abs(y + 25) / 28;
            if (ky <= 0) continue;
            pen.line(-halfW * ky, y, halfW * ky, y, y % 3 === 0 ? PURE_WHITE : ramp[4], 0.74 * fade * ky);
          }
          pen.radialGlow(0, -24, 18, ramp[3], 0.42 * fade);
          motes.render(pen);
          return;
        }

        if (u < 0.55) {
          const fk = 1 - u / 0.55;
          drawStarburstFlare(pen, 0, 0, 18 * fk, 0.9 * fk, ramp);
          pen.fillCircle(0, 0, 3.2 * fk + 0.8, ramp[4]);
          pen.fillCircle(0, 0, 1.8 * fk + 0.5, PURE_WHITE);
        }

        const boltRng = new DeterministicRng(cfg.seed * 19 + Math.floor(t * 30));
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * TWO_PI + boltRng.between(-0.4, 0.4);
          const len = (8 + 10 * (1 - u)) * boltRng.between(0.7, 1.15);
          const pts = buildLightningChain(boltRng, 0, 0, Math.cos(a) * len, Math.sin(a) * len, 0.36, 2);
          pen.polyline(pts, i === 0 ? PURE_WHITE : ramp[5], 0.85 * fade);
        }
        pen.radialGlow(0, 0, 18 * fade, ramp[3], 0.45 * fade);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 12. CHAKRAM VORTEX DISC (`chakramVortexDisc`) — High-RPM Plasma Saw Disc
// ============================================================================
export const chakramVortexDisc = {
  duration: 0.5,
  loop: true,
  defaults: {
    palette: CYBER_NEON_PALETTE,
    radius: 15,
    blades: 8,
    seed: 11
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, ramp[4], ramp[5]] });
    let emitAcc = 0;

    return {
      step(dt) {
        emitAcc += dt;
        while (emitAcc >= 0.025) {
          emitAcc -= 0.025;
          const oy = rng.between(-cfg.radius * 0.75, cfg.radius * 0.75);
          motes.emit(
            'streak',
            -cfg.radius * 0.4,
            oy,
            -rng.between(90, 175),
            rng.between(-12, 12),
            rng.between(0.08, 0.18),
            rng.chance(0.45) ? ramp[5] : ramp[4]
          );
        }
        motes.step(dt);
      },
      renderFront(pen, loopT) {
        const spin = (loopT / 0.5) * TWO_PI * 2;
        const R = cfg.radius ?? 15;
        const blades = cfg.blades ?? 8;

        pen.shadeBox(-R - 4, -R - 4, R + 4, R + 4, (x, y, out) => {
          const d = Math.hypot(x, y);
          if (d > R + 2.5) return 0;
          const ang = Math.atan2(y, x);
          // Curved spiral saw-blade teeth
          const spiral = Math.sin(ang * blades - spin - d * 0.34);
          const outerTooth = R - 2.2 + spiral * 2.4;
          if (d > outerTooth) return 0;

          if (d < 3.0) {
            return PURE_WHITE;
          }
          if (d < 5.2) {
            return ramp[4];
          }
          if (d > outerTooth - 1.3) {
            out.glowStrength = 0.25;
            out.glowColor = ramp[4];
            return spiral > 0.3 ? PURE_WHITE : ramp[5];
          }
          const swirl = Math.sin(ang * (blades * 0.5) - spin * 1.5 + d * 0.45);
          return swirl > 0.35 ? PURE_WHITE : swirl > -0.2 ? ramp[4] : ramp[3];
        });

        pen.radialGlow(0, 0, R * 1.35, ramp[3], 0.48);
        pen.radialGlow(-4, 0, R * 0.9, ramp[5], 0.25);
        motes.render(pen);
      }
    };
  }
};

export const CYBER_EFFECT_REGISTRY = {
  plasmaCrescentSlash,
  twinCrossSlash,
  empOverloadDome,
  supernovaExplosion,
  singularityReactor,
  aegisHexDome,
  wingPylonThruster,
  holoTargetReticle,
  orbitalHelixBeam,
  rgbGlitchTear,
  cyberImpactSpark,
  chakramVortexDisc
};
