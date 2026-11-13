/**
 * First-Party HD-2D Sylvan Elven Star-Ranger & Astral Tempest Shader Suite for ArcaneShaderFX.
 * Authored natively for Arcane vs. Steel (`Sylvara` / `archer`).
 *
 * Features:
 *  - Dual-buffer (`albedo` + additive `emissive`) cel-stepped emerald & starlight-gold ramps
 *  - True 2.5D `back` + `front` wraparound cyclones, stealth leaf-cloak domes, and astrolabe seals
 *  - 3D perspective Mach shock-cones, braided wind-dragon helices, and 120Hz razor-leaf & star-mote physics
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
} from '../ArcaneShaderFX.js?v=30fps93';

const TWO_PI = Math.PI * 2;

export const SYLVAN_EMERALD_PALETTE = [
  '#061913',
  '#064e3b',
  '#059669',
  '#10b981',
  '#34d399',
  '#6ee7b7',
  '#fef08a',
  '#ffffff'
];

export const SYLVAN_STARLIGHT_PALETTE = [
  '#071b22',
  '#0f4c5c',
  '#0d9488',
  '#2dd4bf',
  '#6ee7b7',
  '#facc15',
  '#fef9c3',
  '#ffffff'
];

// ============================================================================
// Shared Sylvan Geometry & Pixel-Art Primitives
// ============================================================================

/** Draw a crisp oriented 5-pixel elven razor-leaf in local shader coordinates. */
function drawSylvanLeaf(pen, cx, cy, angle, coreCol, edgeCol, alpha = 1) {
  if (alpha <= 0.03) return;
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  pen.stipple(cx, cy, coreCol, alpha);
  pen.stipple(cx + ca * 1.1, cy + sa * 1.1, coreCol, alpha);
  pen.stipple(cx - ca * 1.1, cy - sa * 1.1, edgeCol, alpha * 0.92);
  pen.stipple(cx - sa * 0.85, cy + ca * 0.85, edgeCol, alpha * 0.85);
  pen.stipple(cx + sa * 0.85, cy - ca * 0.85, edgeCol, alpha * 0.85);
}

/** Draw an 8-point elven star-compass rune on a tilted ground plane (`aspectY`) or flat (`aspectY = 1`). */
function drawElvenStarCompass(pen, cx, cy, rOuter, rInner, aspectY, rot, colMain, colAccent, alpha, pred = null) {
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
    pen.line(x0, y0, x1, y1, i % 4 < 2 ? colMain : colAccent, alpha);
    if (i % 2 === 0) {
      pen.stipple(x0, y0, PURE_WHITE, alpha);
    }
  }
}

/** Draw a 3D perspective supersonic Mach shock-ring perpendicular to unit vector `(ux, uy)`. */
function drawOrientedMachRing(pen, cx, cy, ux, uy, radius, squash, thickness, colCore, colEdge, alpha, halfPred = null) {
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

/** Render a crescent wind-wave arc centered at `(cx, cy)` oriented toward `aimAngle`. */
function renderCrescentGaleWave(pen, cx, cy, aimAngle, radius, spanAngle, maxThick, age, ramp) {
  if (radius <= 1.5 || maxThick <= 0.3) return;
  const steps = ramp.length;
  const halfSpan = spanAngle * 0.5;
  const bound = radius + maxThick + 3;
  const cosA = Math.cos(aimAngle);
  const sinA = Math.sin(aimAngle);

  pen.shadeBox(cx - bound, cy - bound, cx + bound, cy + bound, (px, py, out) => {
    const dx = px - cx;
    const dy = py - cy;
    // Transform into aim-aligned space where +X is `aimAngle`
    const lx = dx * cosA + dy * sinA;
    const ly = (-dx * sinA + dy * cosA) * 0.84;
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

    out.alpha = clamp01((1 - age * 0.85) * Math.min(1, tipTaper * 1.8));
    if (across < 0.24 && age < 0.42) {
      out.glowStrength = 0.3 * (1 - age);
      out.glowColor = ramp[steps - 2];
      return PURE_WHITE;
    }
    const idx = clampRange(
      Math.round((1 - across) * (steps - 1) - age * 1.9 + tipTaper * 0.6),
      1,
      steps - 1
    );
    out.glowStrength = 0.16 * (1 - across) * (1 - age);
    out.glowColor = ramp[Math.min(steps - 1, idx + 1)];
    return ramp[idx];
  });
}

// ============================================================================
// 1. SYLVAN BOW-DRAW WIND VORTEX (`sylvanBowDrawVortex`)
// ============================================================================
export const sylvanBowDrawVortex = {
  duration: 0.44,
  loop: false,
  defaults: {
    palette: SYLVAN_EMERALD_PALETTE,
    radius: 22,
    seed: 17
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
        const dur = cfg.duration || 0.44;
        if (t < dur * 0.86) {
          while (emitAcc >= 0.028) {
            emitAcc -= 0.028;
            const a = rng.between(0, TWO_PI);
            const dist = (cfg.radius || 22) * rng.between(0.65, 1.18);
            const life = rng.between(0.11, 0.19);
            const spd = dist / life;
            // Tangential swirl + radial pull into nocked arrow tip `(0, 0)`
            const tx = -Math.sin(a) * 34;
            const ty = Math.cos(a) * 34;
            motes.emit(
              'streak',
              Math.cos(a) * dist,
              Math.sin(a) * dist,
              -Math.cos(a) * spd + tx,
              -Math.sin(a) * spd + ty,
              life,
              rng.chance(0.42) ? ramp[6] : ramp[4]
            );
          }
        }
        motes.step(dt);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.44);
        const fade = u > 0.84 ? (1 - u) / 0.16 : Math.min(1, u / 0.14);
        if (fade <= 0.03) return;

        // Tightening emerald-gold focus ring imploding onto bowstring nock
        const ringR = mixScalar(cfg.radius || 22, 3.2, Easing.inQuad(u));
        pen.strokeRing(0, 0, ringR, 1.2, u > 0.65 ? ramp[6] : ramp[4], 0.78 * fade);
        pen.glowRing(0, 0, ringR, 3.5, ramp[3], 0.25 * fade);

        // 3 logarithmic spiral wind-filaments curling into `(0, 0)`
        for (let arm = 0; arm < 3; arm++) {
          const baseA = (arm * TWO_PI) / 3 - t * 11.5;
          let px = 0;
          let py = 0;
          for (let s = 0; s <= 10; s++) {
            const k = s / 10;
            const r = (2 + k * (cfg.radius || 22) * (1 - u * 0.55));
            const a = baseA + k * 2.1;
            const nx = Math.cos(a) * r;
            const ny = Math.sin(a) * r;
            if (s > 0) {
              pen.line(px, py, nx, ny, k < 0.35 ? ramp[6] : ramp[4], (1 - k * 0.65) * 0.82 * fade);
            }
            px = nx;
            py = ny;
          }
        }

        // Growing starlight broadhead glint at `(0, 0)`
        const starR = (3.5 + 7.5 * u) * fade;
        drawStarburstFlare(pen, 0, 0, starR, (0.55 + 0.45 * u) * fade, ramp);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 2. SONIC BOW-RELEASE WAVE (`sonicBowReleaseWave`)
// ============================================================================
export const sonicBowReleaseWave = {
  duration: 0.42,
  loop: false,
  defaults: {
    palette: SYLVAN_EMERALD_PALETTE,
    aimAngle: 0,
    radius: 24,
    twin: false,
    seed: 23
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, ramp[6], ramp[5], ramp[3]] });
    const aim = cfg.aimAngle ?? 0;
    const ux = Math.cos(aim);
    const uy = Math.sin(aim);

    let t = 0;
    let emitted = false;

    const leaves = Array.from({ length: 6 }, (_, i) => ({
      ang: aim + rng.between(-0.68, 0.68),
      spd: rng.between(85, 195),
      spin: rng.between(-14, 14),
      rot0: (i * Math.PI) / 3,
      life: rng.between(0.24, 0.4)
    }));

    return {
      step(dt) {
        t += dt;
        if (!emitted) {
          emitted = true;
          const count = cfg.twin ? 20 : 14;
          for (let i = 0; i < count; i++) {
            const a = aim + rng.between(-0.78, 0.78);
            const sp = rng.between(115, 290);
            motes.emit(
              i % 3 === 0 ? 'streak' : 'spark',
              ux * 3,
              uy * 3,
              Math.cos(a) * sp,
              Math.sin(a) * sp,
              rng.between(0.14, 0.32),
              rng.chance(0.45) ? ramp[6] : ramp[4],
              1,
              65
            );
          }
        }
        motes.step(dt);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.42);
        const fade = 1 - u * u;
        if (fade <= 0.03) return;

        // 1. Expanding Supersonic Crescent Gale Arc
        const arcR = 8 + (cfg.radius || 24) * Easing.outExpo(clamp01(t / 0.28));
        const thick = Math.max(0.8, (cfg.twin ? 8.5 : 6.8) * (1 - smoothStep(0.12, 0.42, t)));
        renderCrescentGaleWave(pen, ux * 4, uy * 4, aim, arcR, 2.05, thick, u, ramp);

        if (cfg.twin && u > 0.06) {
          const u2 = clamp01((t - 0.03) / 0.36);
          const arcR2 = 6 + (cfg.radius || 24) * 0.78 * Easing.outExpo(u2);
          renderCrescentGaleWave(pen, -ux * 2, -uy * 2, aim, arcR2, 1.75, thick * 0.68, u2, ramp);
        }

        // 2. Twin 3D Perspective Supersonic Mach Shock-Rings peeling downrange
        const ring1U = clamp01(t / 0.32);
        if (ring1U < 1) {
          const d1 = 4 + 16 * Easing.outCubic(ring1U);
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
          const d2 = 10 + 24 * Easing.outCubic(ring2U);
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

        // 3. Muzzle Starburst Flare + Razor-Leaves spraying in the slipstream
        if (t < 0.16) {
          const fk = 1 - t / 0.16;
          drawStarburstFlare(pen, ux * 2, uy * 2, 16 * fk, 0.92 * fk, ramp);
        }

        for (let i = 0; i < leaves.length; i++) {
          const lf = leaves[i];
          if (t >= lf.life) continue;
          const lu = t / lf.life;
          const dist = lf.spd * t * (1 - 0.32 * lu);
          drawSylvanLeaf(
            pen,
            Math.cos(lf.ang) * dist,
            Math.sin(lf.ang) * dist,
            lf.rot0 + lf.spin * t,
            ramp[6],
            ramp[4],
            1 - lu
          );
        }

        pen.radialGlow(ux * 8, uy * 8, 22 * fade, ramp[4], 0.42 * fade);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 3. SYLVAN LEAF-CLOAK STEALTH DOME (`sylvanLeafCloakDome`) — 2.5D Back + Front
// ============================================================================
export const sylvanLeafCloakDome = {
  duration: 1.1,
  loop: true,
  defaults: {
    palette: SYLVAN_EMERALD_PALETTE,
    radius: 36,
    radiusY: 46,
    seed: 29
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const rx = cfg.radius ?? 36;
    const ry = cfg.radiusY ?? 46;
    let totalT = 0;

    const leafOrbits = Array.from({ length: 10 }, (_, i) => ({
      phase0: (i / 10) * TWO_PI,
      lat: 0.16 + ((i * 7) % 9) * 0.085,
      speed: 3.4 + (i % 3) * 0.65,
      gold: i % 3 === 0
    }));

    const renderCloakPass = (pen, loopT, isFront) => {
      const deploy = Easing.outCubic(clamp01(totalT / 0.12));
      const curRx = rx * deploy;
      const curRy = ry * deploy;
      if (curRx < 3) return;

      const rot = totalT * 2.6;
      const pred = (ang) => (Math.sin(ang) >= 0) === isFront;

      // 1. Ground Elven 8-Point Star-Compass & Wind Perimeter Band
      drawTiltedOrbitBand(
        pen,
        0,
        0,
        curRx,
        0.2,
        1.6,
        isFront ? 0.88 : 0.56,
        [ramp[1], ramp[2], ramp[4], ramp[6]],
        pred,
        totalT < 0.09
      );
      drawElvenStarCompass(
        pen,
        0,
        0,
        curRx * 0.92,
        curRx * 0.54,
        0.2,
        rot * 0.55,
        ramp[4],
        ramp[6],
        isFront ? 0.78 : 0.46,
        pred
      );

      // 2. Helical Wind-Veil Ribbons wrapping behind (`back`) and over (`front`) Sylvara
      for (let band = 0; band < 4; band++) {
        const bandOff = (band * TWO_PI) / 4;
        for (let s = 0; s <= 26; s++) {
          const hFrac = s / 26;
          const ringR = curRx * Math.cos(hFrac * Math.PI * 0.46);
          const y = -hFrac * curRy;
          const a = rot * 1.45 + bandOff - hFrac * 3.1;
          const sinA = Math.sin(a);
          if ((sinA >= 0) !== isFront) continue;
          const x = Math.cos(a) * ringR;
          const yPersp = y + sinA * ringR * 0.14;
          const col = hFrac > 0.65 ? ramp[6] : sinA > 0.45 ? ramp[5] : ramp[3];
          pen.stipple(x, yPersp, col, (isFront ? 0.82 : 0.5) * (1 - hFrac * 0.25));
          if (s % 4 === 0 && isFront) {
            pen.radialGlow(x, yPersp, 5, ramp[3], 0.14);
          }
        }
      }

      // 3. Soft FBM Emerald Rim Mist on the Front Pass (keeps Sylvara's face/bow 100% crisp inside!)
      if (isFront) {
        const nx = Math.ceil(curRx);
        const ny = Math.ceil(curRy);
        for (let y = -ny; y <= 0; y++) {
          for (let x = -nx; x <= nx; x++) {
            const ux = x / curRx;
            const uy = y / curRy;
            const d = Math.hypot(ux, uy);
            if (d > 1 || d < 0.82) continue;
            const rim = (d - 0.82) / 0.18;
            const n = fbmNoise2D(x * 0.12 - totalT * 2.5, y * 0.12 + totalT * 1.8, cfg.seed);
            if (n + rim * 0.55 < 0.22) continue;
            pen.blend(x, y, rim > 0.72 ? ramp[5] : ramp[3], 0.34 * rim);
          }
        }
      }

      // 4. Orbiting Sylvan Razor-Leaves in true 2.5D depth
      for (let i = 0; i < leafOrbits.length; i++) {
        const ob = leafOrbits[i];
        const a = ob.phase0 + totalT * ob.speed;
        const sinA = Math.sin(a);
        if ((sinA >= 0) !== isFront) continue;
        const hFrac = (ob.lat + totalT * 0.42) % 0.92;
        const ringR = curRx * Math.cos(hFrac * Math.PI * 0.45);
        const lx = Math.cos(a) * ringR;
        const ly = -hFrac * curRy + sinA * ringR * 0.15;
        drawSylvanLeaf(
          pen,
          lx,
          ly,
          a + Math.PI * 0.35,
          ob.gold ? ramp[6] : ramp[5],
          ramp[3],
          isFront ? 0.95 : 0.6
        );
      }
    };

    return {
      step(dt) {
        totalT += dt;
      },
      renderBack(pen, loopT) {
        renderCloakPass(pen, loopT, false);
      },
      renderFront(pen, loopT) {
        renderCloakPass(pen, loopT, true);
      }
    };
  }
};

// ============================================================================
// 4. ZEPHYR VAULT & GALE-STRIDE SLIPSTREAM (`zephyrVaultSlipstream`)
// ============================================================================
export const zephyrVaultSlipstream = {
  duration: 0.9,
  loop: true,
  defaults: {
    palette: SYLVAN_EMERALD_PALETTE,
    length: 26,
    tilt: -0.15,
    seed: 31
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, ramp[6], ramp[5], ramp[3]] });
    let totalT = 0;
    let emitAcc = 0;

    return {
      step(dt) {
        totalT += dt;
        emitAcc += dt;
        while (emitAcc >= 0.026) {
          emitAcc -= 0.026;
          const oy = rng.between(-10, 10);
          motes.emit(
            rng.chance(0.4) ? 'glint' : 'streak',
            rng.between(-6, 2),
            oy,
            -rng.between(75, 165),
            rng.between(-18, 22),
            rng.between(0.14, 0.28),
            rng.chance(0.42) ? ramp[6] : ramp[4]
          );
        }
        motes.step(dt);
      },
      renderBack(pen) {
        const len = cfg.length ?? 26;
        const tiltSin = Math.sin(cfg.tilt ?? -0.15);
        // Twin counter-braiding aerodynamic emerald & starlight-gold wind ribbons streaming rearward (`-X`)
        for (let strand = 0; strand < 2; strand++) {
          const phaseOff = strand * Math.PI;
          let prevX = 0;
          let prevY = 0;
          for (let i = 0; i <= 18; i++) {
            const u = i / 18;
            const x = -u * len;
            const wave = Math.sin(u * 6.5 - totalT * 18 + phaseOff) * (2.5 + u * 4.5);
            const y = u * len * tiltSin + wave + (strand === 0 ? -2 : 2);
            if (i > 0) {
              const col = strand === 0 ? (u < 0.35 ? PURE_WHITE : ramp[5]) : u < 0.35 ? ramp[6] : ramp[3];
              pen.line(prevX, prevY, x, y, col, (1 - u * 0.78) * 0.92);
            }
            if (i % 5 === 2) {
              drawSylvanLeaf(
                pen,
                x,
                y,
                -totalT * 10 + i,
                strand === 0 ? ramp[6] : ramp[5],
                ramp[3],
                (1 - u) * 0.9
              );
            }
            prevX = x;
            prevY = y;
          }
        }
        pen.radialGlow(-6, 0, 12, ramp[4], 0.34);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 5. ZEPHYR GROUND UPDRAFT BURST (`zephyrGroundBurst`) — 2.5D Launch/Land Ring
// ============================================================================
export const zephyrGroundBurst = {
  duration: 0.4,
  loop: false,
  defaults: {
    palette: SYLVAN_EMERALD_PALETTE,
    radius: 26,
    seed: 37
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
          for (let i = 0; i < 14; i++) {
            const a = -Math.PI * 0.5 + rng.between(-1.15, 1.15);
            const sp = rng.between(65, 175);
            motes.emit(
              i % 3 === 0 ? 'glint' : 'spark',
              rng.between(-8, 8),
              -2,
              Math.cos(a) * sp,
              Math.sin(a) * sp,
              rng.between(0.16, 0.34),
              rng.chance(0.45) ? ramp[6] : ramp[4],
              1,
              95
            );
          }
        }
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 0.4);
        const fade = 1 - u;
        if (fade <= 0.04) return;
        const rx = 7 + (cfg.radius || 26) * Easing.outExpo(u);
        drawTiltedOrbitBand(
          pen,
          0,
          0,
          rx,
          0.22,
          1.7,
          0.85 * fade,
          [ramp[1], ramp[2], ramp[4], ramp[6]],
          (ang) => Math.sin(ang) < 0,
          u < 0.18
        );
      },
      renderFront(pen) {
        const u = clamp01(t / 0.4);
        const fade = 1 - u;
        if (fade <= 0.04) return;
        const rx = 7 + (cfg.radius || 26) * Easing.outExpo(u);
        drawTiltedOrbitBand(
          pen,
          0,
          0,
          rx,
          0.22,
          1.8,
          0.95 * fade,
          [ramp[1], ramp[3], ramp[5], PURE_WHITE],
          (ang) => Math.sin(ang) >= 0,
          u < 0.18
        );
        // Rising wind-whirl column
        for (let i = 0; i < 3; i++) {
          const h = (u * 26 + i * 7) % 28;
          const wr = (1 - h / 30) * rx * 0.52;
          const a = t * 18 + i * 2.1;
          drawSylvanLeaf(pen, Math.cos(a) * wr, -h, a, ramp[6], ramp[4], fade * 0.9);
        }
        pen.radialGlow(0, -4, 16 * fade, ramp[4], 0.38 * fade);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 6. ASTRAL LIGHT-WING PLUME (`astralWingPlume`) — Ultimate Back-Layer Wings
// ============================================================================
export const astralWingPlume = {
  duration: 1.5,
  loop: false,
  defaults: {
    palette: SYLVAN_STARLIGHT_PALETTE,
    wingSpan: 28,
    seed: 41
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, ramp[6], ramp[4], ramp[3]] });
    let t = 0;
    let emitAcc = 0;

    // 6 radiant elven light-pinions fanning backward (`-X`) and upward (`-Y`) behind Sylvara's shoulders
    const pinions = [
      { ang: -2.42, len: 1.05, width: 3.1 },
      { ang: -2.68, len: 0.94, width: 2.8 },
      { ang: -2.95, len: 0.82, width: 2.5 },
      { ang: 2.98, len: 0.72, width: 2.2 },
      { ang: 2.72, len: 0.62, width: 2.0 },
      { ang: -2.15, len: 0.78, width: 2.3 }
    ];

    return {
      step(dt) {
        t += dt;
        emitAcc += dt;
        if (t < 1.25) {
          while (emitAcc >= 0.035) {
            emitAcc -= 0.035;
            const p = rng.pick(pinions);
            const r = (cfg.wingSpan || 28) * p.len * rng.between(0.45, 1.0);
            motes.emit(
              rng.chance(0.55) ? 'glint' : 'orb',
              Math.cos(p.ang) * r,
              Math.sin(p.ang) * r,
              rng.between(-32, -8),
              rng.between(-28, 18),
              rng.between(0.2, 0.42),
              rng.chance(0.5) ? ramp[6] : ramp[4],
              0.7,
              -20
            );
          }
        }
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 1.5);
        const unfurl = Easing.outBack(clamp01(t / 0.22), 1.5);
        const fade = u > 0.82 ? (1 - u) / 0.18 : 1;
        if (fade <= 0.03) return;

        const span = (cfg.wingSpan || 28) * unfurl;
        const flap = Math.sin(t * 9.5) * 0.08;

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
            const halfW = p.width * Math.sin(Math.pow(v, 0.65) * Math.PI) * fade;
            const cx = ux * d;
            const cy = uy * d;
            for (let q = -halfW; q <= halfW; q += 0.6) {
              const edgeFrac = Math.abs(q) / Math.max(0.35, halfW);
              const shimmer = fbmNoise2D(d * 0.22 - t * 6, pIdx * 3.1 + q, cfg.seed);
              const val = (1 - v * 0.45) - edgeFrac * 0.55 + shimmer * 0.18;
              const col =
                val > 0.72
                  ? PURE_WHITE
                  : val > 0.48
                    ? ramp[6]
                    : val > 0.25
                      ? ramp[4]
                      : ramp[3];
              pen.stipple(cx + nx * q, cy + ny * q, col, fade * (0.95 - v * 0.2));
            }
          }
          // Pinion tip star-glint
          pen.stipple(ux * pLen, uy * pLen, PURE_WHITE, fade);
          pen.radialGlow(ux * pLen * 0.65, uy * pLen * 0.65, 8, ramp[4], 0.24 * fade);
        }

        drawStarburstFlare(pen, 0, -2, 11 * fade, 0.78 * fade, ramp);
        pen.radialGlow(-6, -6, 20 * fade, ramp[5], 0.4 * fade);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 7. STARFALL CELESTIAL LOCK (`starfallCelestialLock`) — Elven Astrolabe Seal
// ============================================================================
export const starfallCelestialLock = {
  duration: 0.95,
  loop: false,
  defaults: {
    palette: SYLVAN_STARLIGHT_PALETTE,
    radius: 34,
    beaconH: 58,
    seed: 47
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    let t = 0;

    const renderSeal = (pen, isFront) => {
      const u = clamp01(t / 0.95);
      const fade = u > 0.78 ? (1 - u) / 0.22 : 1;
      if (fade <= 0.03) return;

      const snap = Easing.outBack(clamp01(t / 0.2), 1.6);
      const r = (cfg.radius || 34) * snap;
      const rot = t * 2.4;
      const pred = (ang) => (Math.sin(ang) >= 0) === isFront;

      // Outer & inner 2.5D astrolabe rings + inscribed 8-point elven star-compass
      drawTiltedOrbitBand(
        pen,
        0,
        0,
        r,
        0.22,
        1.7,
        (isFront ? 0.92 : 0.58) * fade,
        [ramp[1], ramp[3], ramp[4], ramp[6]],
        pred,
        t < 0.12
      );
      drawTiltedOrbitBand(
        pen,
        0,
        0,
        r * 0.62,
        0.22,
        1.2,
        (isFront ? 0.82 : 0.48) * fade,
        [ramp[2], ramp[4], ramp[5], PURE_WHITE],
        pred,
        false
      );
      drawElvenStarCompass(
        pen,
        0,
        0,
        r * 0.95,
        r * 0.46,
        0.22,
        rot,
        ramp[6],
        ramp[4],
        (isFront ? 0.9 : 0.55) * fade,
        pred
      );

      // 4 Rising Starlight Threads framing the target + Overhead Crescent-Star Crest (`front` pass)
      for (let k = 0; k < 4; k++) {
        const ka = rot + (k * Math.PI) / 2;
        if ((Math.sin(ka) >= 0) !== isFront) continue;
        const tx = Math.cos(ka) * r * 0.78;
        const ty = Math.sin(ka) * r * 0.17;
        const pillarH = (cfg.beaconH || 58) * clamp01(t / 0.24) * fade;
        pen.line(tx, ty, tx, ty - pillarH, k % 2 === 0 ? ramp[6] : ramp[4], 0.65 * fade);
        pen.stipple(tx, ty - pillarH, PURE_WHITE, fade);
      }

      if (isFront) {
        const crestY = -(cfg.beaconH || 58) * clamp01(snap);
        drawStarburstFlare(pen, 0, crestY, 12 * fade, 0.85 * fade, ramp);
        pen.strokeRing(0, crestY, 7 * snap, 1.2, ramp[6], 0.8 * fade);
        pen.radialGlow(0, -6, 22 * fade, ramp[4], 0.28 * fade);
      }
    };

    return {
      step(dt) {
        t += dt;
      },
      renderBack(pen) {
        renderSeal(pen, false);
      },
      renderFront(pen) {
        renderSeal(pen, true);
      }
    };
  }
};

// ============================================================================
// 8. EMERALD TEMPEST CYCLONE (`emeraldTempestCyclone`) — True 2.5D Tornado
// ============================================================================
export const emeraldTempestCyclone = {
  duration: 1.35,
  loop: false,
  defaults: {
    palette: SYLVAN_EMERALD_PALETTE,
    baseRadius: 11,
    topRadius: 34,
    height: 88,
    isUltimate: false,
    seed: 53
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, ramp[6], ramp[5], ramp[3]], floorY: 0 });

    let t = 0;
    let emitAcc = 0;

    const leaves = Array.from({ length: 14 }, (_, i) => ({
      h0: i / 14,
      ang0: (i * 2.39996) % TWO_PI,
      spd: 11 + (i % 4) * 2.2,
      gold: i % 3 === 0
    }));

    const renderFunnelPass = (pen, isFront) => {
      const dur = cfg.duration || 1.35;
      const u = clamp01(t / dur);
      const grow = Easing.outCubic(clamp01(t / 0.18));
      const fade = u > 0.8 ? (1 - u) / 0.2 : 1;
      if (fade <= 0.03 || grow <= 0.04) return;

      const totalH = (cfg.height || 88) * grow;
      const rBase = (cfg.baseRadius || 11) * grow;
      const rTop = (cfg.topRadius || 34) * grow;
      const pred = (ang) => (Math.sin(ang) >= 0) === isFront;

      // 1. Ground Dust-Devil Vortex Ring (`back` + `front`)
      drawTiltedOrbitBand(
        pen,
        0,
        0,
        rBase * 2.1,
        0.22,
        1.9,
        (isFront ? 0.94 : 0.62) * fade,
        [ramp[1], ramp[3], ramp[5], ramp[6]],
        pred,
        t < 0.14
      );

      // 2. S-Curving Conical Wind-Rings & FBM Cyclone Wall (`back` behind enemy, `front` over enemy!)
      const bandStep = 2;
      for (let h = 0; h <= totalH; h += bandStep) {
        const hf = h / Math.max(1, totalH);
        const coneR = mixScalar(rBase, rTop, Math.pow(hf, 0.86));
        const swayX = Math.sin(t * 11 - hf * 4.6) * (1.5 + Math.sin(hf * Math.PI) * 5.5);
        const yCenter = -h;
        const spin = t * 18 - hf * 9.5;

        // Sample arc segments around the current cone slice
        const segs = Math.max(10, Math.round(coneR * 0.9));
        for (let s = 0; s < segs; s++) {
          const a = spin + (s / segs) * TWO_PI;
          const sinA = Math.sin(a);
          if ((sinA >= 0) !== isFront) continue;

          const turb = fbmNoise2D(Math.cos(a) * 1.8 + t * 4, hf * 5 - t * 6, cfg.seed);
          if (turb < -0.22 && (h & 2) === 0) continue;

          const px = swayX + Math.cos(a) * coneR;
          const py = yCenter + sinA * coneR * 0.16;
          const isGoldBand = ((s + Math.floor(hf * 9)) % 7) === 0;
          const col = isGoldBand
            ? ramp[6]
            : turb > 0.32
              ? ramp[5]
              : isFront
                ? ramp[4]
                : ramp[2];
          const alpha = (isFront ? 0.76 : 0.52) * fade * (1 - Math.abs(hf - 0.5) * 0.25);
          pen.stipple(px, py, col, alpha);
        }

        // Luminous inner wind-eye spine on the `back` pass so trapped fighters stay silhouetted & crisp
        if (!isFront && (h & 3) === 0) {
          pen.radialGlow(swayX, yCenter, coneR * 0.85 + 4, ramp[3], 0.14 * fade);
        }
      }

      // 3. Double-Helix Starlight-Gold & Mint Wind Ribbons Corkscrewing Up the Cone
      for (let rib = 0; rib < 2; rib++) {
        const ribOff = rib * Math.PI;
        let prevVis = false;
        let px0 = 0;
        let py0 = 0;
        for (let s = 0; s <= 36; s++) {
          const hf = s / 36;
          const coneR = mixScalar(rBase, rTop, Math.pow(hf, 0.86)) * 1.08;
          const swayX = Math.sin(t * 11 - hf * 4.6) * (1.5 + Math.sin(hf * Math.PI) * 5.5);
          const a = -t * 16 + hf * 11.5 + ribOff;
          const sinA = Math.sin(a);
          const vis = (sinA >= 0) === isFront;
          const x = swayX + Math.cos(a) * coneR;
          const y = -hf * totalH + sinA * coneR * 0.16;
          if (vis && prevVis) {
            pen.line(
              px0,
              py0,
              x,
              y,
              rib === 0 ? (sinA > 0.5 ? PURE_WHITE : ramp[6]) : ramp[5],
              (isFront ? 0.94 : 0.6) * fade
            );
          }
          prevVis = vis;
          px0 = x;
          py0 = y;
        }
      }

      // 4. Orbiting Sylvan Razor-Leaves spiraling upward
      for (let i = 0; i < leaves.length; i++) {
        const lf = leaves[i];
        const hf = (lf.h0 + t * 0.85) % 1;
        const a = lf.ang0 + t * lf.spd;
        const sinA = Math.sin(a);
        if ((sinA >= 0) !== isFront) continue;
        const coneR = mixScalar(rBase, rTop, Math.pow(hf, 0.86)) * 1.16;
        const swayX = Math.sin(t * 11 - hf * 4.6) * (1.5 + Math.sin(hf * Math.PI) * 5.5);
        drawSylvanLeaf(
          pen,
          swayX + Math.cos(a) * coneR,
          -hf * totalH + sinA * coneR * 0.16,
          a + 0.6,
          lf.gold ? ramp[6] : ramp[5],
          ramp[3],
          (isFront ? 0.95 : 0.62) * fade
        );
      }

      // 5. Ultimate Crackling Gale-Lightning Arcs on the Front Pass
      if (isFront && cfg.isUltimate && fade > 0.25) {
        const slot = Math.floor(t * 24);
        const boltRng = new DeterministicRng(cfg.seed * 37 + slot);
        for (let b = 0; b < 2; b++) {
          const h0 = boltRng.between(0.08, 0.42) * totalH;
          const h1 = boltRng.between(0.58, 0.96) * totalH;
          const x0 = boltRng.between(-rBase, rBase);
          const x1 = boltRng.between(-rTop * 0.8, rTop * 0.8);
          const pts = buildLightningChain(boltRng, x0, -h0, x1, -h1, 0.26, 3);
          pen.polyline(pts, b === 0 ? PURE_WHITE : ramp[6], 0.88 * fade);
        }
      }

      if (isFront) {
        motes.render(pen);
      }
    };

    return {
      step(dt) {
        t += dt;
        emitAcc += dt;
        if (t < 1.08) {
          while (emitAcc >= 0.03) {
            emitAcc -= 0.03;
            const a = rng.between(-Math.PI, 0);
            const sp = rng.between(55, 145);
            motes.emit(
              rng.chance(0.35) ? 'glint' : 'spark',
              rng.between(-10, 10),
              -rng.between(2, 24),
              Math.cos(a) * sp * 0.55,
              -rng.between(65, 155),
              rng.between(0.18, 0.38),
              rng.chance(0.45) ? ramp[6] : ramp[4],
              1,
              25
            );
          }
        }
        motes.step(dt);
      },
      renderBack(pen) {
        renderFunnelPass(pen, false);
      },
      renderFront(pen) {
        renderFunnelPass(pen, true);
      }
    };
  }
};

// ============================================================================
// 9. STARFALL RAIN BARRAGE (`starfallRainBarrage`) — Diagonal Celestial Comets
// ============================================================================
export const starfallRainBarrage = {
  duration: 1.05,
  loop: false,
  defaults: {
    palette: SYLVAN_STARLIGHT_PALETTE,
    spread: 44,
    count: 7,
    seed: 61
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, ramp[6], ramp[4], ramp[3]], floorY: 0 });

    const count = cfg.count || 7;
    const spread = cfg.spread || 44;
    const arrows = Array.from({ length: count }, (_, i) => {
      const lane = count > 1 ? (i / (count - 1)) * 2 - 1 : 0;
      const landX = lane * spread + rng.between(-4, 4);
      const startAt = i * 0.065;
      return {
        landX,
        startX: landX - 28,
        startY: -138 - (i % 3) * 14,
        startAt,
        flightDur: 0.16,
        impacted: false
      };
    });

    let t = 0;

    return {
      step(dt) {
        t += dt;
        for (let i = 0; i < arrows.length; i++) {
          const ar = arrows[i];
          if (!ar.impacted && t >= ar.startAt + ar.flightDur) {
            ar.impacted = true;
            for (let k = 0; k < 8; k++) {
              const a = -Math.PI * 0.5 + rng.between(-1.1, 1.1);
              const sp = rng.between(75, 195);
              motes.emit(
                k % 3 === 0 ? 'glint' : 'spark',
                ar.landX,
                -1,
                Math.cos(a) * sp,
                Math.sin(a) * sp,
                rng.between(0.16, 0.34),
                k % 2 === 0 ? ramp[6] : ramp[4],
                1,
                210
              );
            }
          }
        }
        motes.step(dt);
      },
      renderFront(pen) {
        for (let i = 0; i < arrows.length; i++) {
          const ar = arrows[i];
          const localT = t - ar.startAt;
          if (localT < 0) continue;

          if (localT <= ar.flightDur) {
            // Descending diagonal celestial comet-arrow + Mach halo
            const u = localT / ar.flightDur;
            const hx = mixScalar(ar.startX, ar.landX, u);
            const hy = mixScalar(ar.startY, 0, u);
            const dx = ar.landX - ar.startX;
            const dy = -ar.startY;
            const len = Math.hypot(dx, dy) || 1;
            const ux = dx / len;
            const uy = dy / len;

            const tailLen = 26;
            const tx = hx - ux * tailLen;
            const ty = hy - uy * tailLen;
            pen.line(tx, ty, hx, hy, ramp[4], 0.85);
            pen.line(hx - ux * 14, hy - uy * 14, hx, hy, ramp[6], 0.95);
            pen.line(hx - ux * 6, hy - uy * 6, hx, hy, PURE_WHITE, 1.0);
            drawOrientedMachRing(pen, hx - ux * 7, hy - uy * 7, ux, uy, 4.5, 0.35, 1.2, ramp[6], ramp[4], 0.85);
            drawStarburstFlare(pen, hx, hy, 6.5, 0.9, ramp);
          } else {
            // Upright Star-Sigil Ring & Helical Wind Spire Eruption at `(ar.landX, 0)`
            const impAge = localT - ar.flightDur;
            if (impAge < 0.38) {
              const iu = impAge / 0.38;
              const fade = 1 - iu;
              const rx = 4 + 16 * Easing.outExpo(iu);
              drawTiltedOrbitBand(
                pen,
                ar.landX,
                0,
                rx,
                0.22,
                1.4,
                0.9 * fade,
                [ramp[2], ramp[4], ramp[6], PURE_WHITE],
                null,
                iu < 0.22
              );
              const spireH = (26 + (i % 2) * 8) * Easing.outCubic(Math.min(1, iu * 2.4)) * fade;
              pen.line(ar.landX, 0, ar.landX, -spireH, iu < 0.25 ? PURE_WHITE : ramp[5], 0.9 * fade);
              pen.line(ar.landX - 1, 0, ar.landX - 1, -spireH * 0.75, ramp[4], 0.65 * fade);
              if (iu < 0.35) {
                drawStarburstFlare(pen, ar.landX, -2, 11 * (1 - iu / 0.35), 0.9 * fade, ramp);
              }
              pen.radialGlow(ar.landX, -6, 14 * fade, ramp[4], 0.35 * fade);
            }
          }
        }
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 10. ASTRAL HURRICANE LANCE (`astralHurricaneLance`) — Ultimate Dragon-Wind Beam
// ============================================================================
export const astralHurricaneLance = {
  duration: 0.76,
  loop: false,
  defaults: {
    palette: SYLVAN_EMERALD_PALETTE,
    dx: 165,
    dy: 0,
    width: 7.5,
    seed: 71
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, ramp[6], ramp[5], ramp[3]] });
    const beamLevels = [PURE_WHITE, ramp[6], ramp[5], ramp[4], ramp[3], ramp[2]];

    let t = 0;
    let emitAcc = 0;

    return {
      step(dt) {
        t += dt;
        emitAcc += dt;
        const dx = cfg.dx ?? 165;
        const dy = cfg.dy ?? 0;
        const dist = Math.max(12, Math.hypot(dx, dy));
        const ux = dx / dist;
        const uy = dy / dist;
        const nx = -uy;
        const ny = ux;

        if (t < 0.58) {
          while (emitAcc >= 0.022) {
            emitAcc -= 0.022;
            const d = rng.between(6, dist);
            const off = rng.between(-8, 8);
            const sp = rng.between(80, 195);
            motes.emit(
              rng.chance(0.35) ? 'glint' : 'streak',
              ux * d + nx * off,
              uy * d + ny * off,
              ux * sp + nx * rng.between(-28, 28),
              uy * sp + ny * rng.between(-28, 28),
              rng.between(0.12, 0.26),
              rng.chance(0.48) ? ramp[6] : ramp[4]
            );
          }
        }
        motes.step(dt);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.76);
        const fade = u < 0.09 ? u / 0.09 : u > 0.68 ? (1 - u) / 0.32 : 1;
        if (fade <= 0.03) return;

        const dx = cfg.dx ?? 165;
        const dy = cfg.dy ?? 0;
        const totalDist = Math.max(12, Math.hypot(dx, dy));
        const ux = dx / totalDist;
        const uy = dy / totalDist;
        const nx = -uy;
        const ny = ux;

        // Progressive supersonic head surge across the arena in the first 0.16s
        const headDist = totalDist * Easing.outExpo(clamp01(t / 0.16));
        const baseW = (cfg.width ?? 7.5) * fade;

        // 1. Tapered Astral Wind-Dragon Energy Lance Body + Triple Coiling Helices
        for (let d = 0; d <= headDist; d += 0.75) {
          const along = d / Math.max(1, headDist);
          const bx = ux * d;
          const by = uy * d;
          const taper = Math.sin(Math.pow(along, 0.72) * Math.PI * 0.94) * 0.85 + 0.25;
          const pulse = 1 + 0.14 * Math.sin(d * 0.22 - t * 34);
          const w = baseW * taper * pulse;

          for (let qOff = -w * 1.18; qOff <= w * 1.18; qOff += 0.65) {
            const q = Math.abs(qOff) / Math.max(0.45, w);
            const px = bx + nx * qOff;
            const py = by + ny * qOff;
            const lv = q < 0.24 ? 0 : q < 0.44 ? 1 : q < 0.65 ? 2 : q < 0.84 ? 3 : q < 1.0 ? 4 : 5;
            pen.stipple(px, py, beamLevels[lv], lv === 5 ? clamp01((1.2 - q) / 0.22) * fade : fade);
          }

          // Triple dragon-scale wind helices wrapping OVER the core lance
          for (let hIdx = 0; hIdx < 3; hIdx++) {
            const ang = d * 0.17 - t * 28 + (hIdx * TWO_PI) / 3;
            if (Math.cos(ang) > -0.15) {
              const off = Math.sin(ang) * w * 1.12;
              const col = hIdx === 0 ? PURE_WHITE : hIdx === 1 ? ramp[6] : ramp[4];
              pen.stipple(bx + nx * off, by + ny * off, col, fade);
            }
          }

          if ((Math.round(d) & 11) === 0) {
            pen.radialGlow(bx, by, w * 2.1 + 5, ramp[3], 0.22 * fade);
          }
        }

        // 2. 5 Cascading 3D Supersonic Mach Shock-Rings pulsing down the beam shaft
        for (let rIdx = 0; rIdx < 5; rIdx++) {
          const ringFrac = ((rIdx / 5) + t * 1.65) % 1;
          const rd = ringFrac * headDist * 0.92 + 6;
          if (rd > headDist) continue;
          const rr = (8 + 8 * Math.sin(ringFrac * Math.PI)) * fade;
          drawOrientedMachRing(
            pen,
            ux * rd,
            uy * rd,
            ux,
            uy,
            rr,
            0.32,
            1.6,
            rIdx % 2 === 0 ? ramp[6] : ramp[5],
            ramp[3],
            fade * (1 - ringFrac * 0.35)
          );
        }

        // 3. Bow Muzzle Starburst at `(0, 0)` + Piercing Head Flare at `(ux * headDist, uy * headDist)`
        drawStarburstFlare(pen, 0, 0, 18 * fade, 0.92 * fade, ramp);
        pen.radialGlow(0, 0, 22, ramp[5], 0.55 * fade);

        const hx = ux * headDist;
        const hy = uy * headDist;
        drawStarburstFlare(pen, hx, hy, 22 * fade, 0.95 * fade, ramp);
        pen.radialGlow(hx, hy, 28, ramp[6], 0.6 * fade);

        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 11. SYLVAN ARROW IMPACT BURST (`sylvanArrowImpactBurst`)
// ============================================================================
export const sylvanArrowImpactBurst = {
  duration: 0.38,
  loop: false,
  defaults: {
    palette: SYLVAN_EMERALD_PALETTE,
    aimAngle: 0,
    isCrit: false,
    seed: 79
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, ramp[6], ramp[4], ramp[3]] });
    const aim = cfg.aimAngle ?? 0;
    const ux = Math.cos(aim);
    const uy = Math.sin(aim);

    let t = 0;
    let emitted = false;

    const leaves = Array.from({ length: cfg.isCrit ? 8 : 5 }, (_, i) => ({
      ang: rng.between(0, TWO_PI),
      spd: rng.between(70, 165),
      rot0: i * 1.1,
      spin: rng.between(-15, 15),
      life: rng.between(0.2, 0.36)
    }));

    return {
      step(dt) {
        t += dt;
        if (!emitted) {
          emitted = true;
          const n = cfg.isCrit ? 22 : 14;
          for (let i = 0; i < n; i++) {
            const a = aim + rng.between(-1.35, 1.35);
            const sp = rng.between(95, 250);
            motes.emit(
              i % 3 === 0 ? 'glint' : 'spark',
              0,
              0,
              Math.cos(a) * sp,
              Math.sin(a) * sp,
              rng.between(0.14, 0.32),
              rng.chance(0.5) ? ramp[6] : ramp[4],
              1,
              145
            );
          }
        }
        motes.step(dt);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.38);
        const fade = 1 - u;
        if (fade <= 0.03) return;

        // Piercing supersonic cross-streak through the target
        if (u < 0.45) {
          const ku = 1 - u / 0.45;
          const streakL = (cfg.isCrit ? 26 : 19) * ku;
          pen.line(-ux * streakL * 0.65, -uy * streakL * 0.65, ux * streakL, uy * streakL, PURE_WHITE, ku);
          pen.line(
            -ux * streakL * 0.45 - uy * 1.2,
            -uy * streakL * 0.45 + ux * 1.2,
            ux * streakL * 0.85 - uy * 1.2,
            uy * streakL * 0.85 + ux * 1.2,
            ramp[5],
            ku * 0.85
          );
        }

        // Expanding Mach ring + Elven starburst
        const rRing = 4 + (cfg.isCrit ? 24 : 17) * Easing.outExpo(u);
        pen.strokeRing(0, 0, rRing, Math.max(1, 2.0 * fade), u < 0.25 ? PURE_WHITE : ramp[5], 0.92 * fade);
        if (u < 0.58) {
          const fk = 1 - u / 0.58;
          drawStarburstFlare(pen, 0, 0, (cfg.isCrit ? 22 : 16) * fk, 0.95 * fk, ramp);
        }

        // Crackling emerald-gold wind-lightning arcs on impact
        const boltRng = new DeterministicRng(cfg.seed * 23 + Math.floor(t * 30));
        const boltCount = cfg.isCrit ? 3 : 2;
        for (let i = 0; i < boltCount; i++) {
          const a = (i / boltCount) * TWO_PI + boltRng.between(-0.4, 0.4);
          const len = (9 + 11 * fade) * boltRng.between(0.75, 1.15);
          const pts = buildLightningChain(boltRng, 0, 0, Math.cos(a) * len, Math.sin(a) * len, 0.32, 2);
          pen.polyline(pts, i === 0 ? PURE_WHITE : ramp[6], 0.85 * fade);
        }

        for (let i = 0; i < leaves.length; i++) {
          const lf = leaves[i];
          if (t >= lf.life) continue;
          const lu = t / lf.life;
          const d = lf.spd * t * (1 - 0.3 * lu);
          drawSylvanLeaf(
            pen,
            Math.cos(lf.ang) * d,
            Math.sin(lf.ang) * d,
            lf.rot0 + lf.spin * t,
            i % 2 === 0 ? ramp[6] : ramp[5],
            ramp[3],
            1 - lu
          );
        }

        pen.radialGlow(0, 0, (cfg.isCrit ? 24 : 18) * fade, ramp[4], 0.48 * fade);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 12. BAKED VFX SHEET SHADERS (`sylvanSupersonicArrowLoop`, `sylvanStarfallSkyCell`, `roaringWindDragonHead`)
//     Used by `scripts/build_archer_vfx_30fps.mjs` to bake `assets/sprites/archer_vfx.png` at 104x104 -> 208x208!
// ============================================================================
export const sylvanSupersonicArrowLoop = {
  duration: 0.5,
  loop: true,
  defaults: {
    palette: SYLVAN_EMERALD_PALETTE,
    length: 68,
    seed: 83
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    return {
      renderFront(pen, loopT) {
        const phase = (loopT / 0.5) * TWO_PI;
        const halfL = (cfg.length || 68) * 0.5;
        const xTail = -halfL + 4;
        const xTip = halfL;

        // 1. Back half of twin 3D Mach shock-rings
        for (let rIdx = 0; rIdx < 2; rIdx++) {
          const ur = ((loopT / 0.5) * 2 + rIdx * 0.5) % 1;
          const rx = mixScalar(xTip - 14, xTail + 8, ur);
          const rad = 7 + Math.sin(ur * Math.PI) * 9.5;
          drawOrientedMachRing(pen, rx, 0, 1, 0, rad, 0.3, 1.5, ramp[6], ramp[3], 0.85, (a) => Math.cos(a) < 0);
        }

        // 2. Back half of double-helix emerald-gold slipstream ribbon
        for (let rib = 0; rib < 2; rib++) {
          const rOff = rib * Math.PI;
          for (let x = xTail; x <= xTip - 10; x++) {
            const u = (x - xTail) / Math.max(1, xTip - 10 - xTail);
            const amp = 3.2 + (1 - u) * 6.5;
            const ang = x * 0.2 - phase * 2 + rOff;
            if (Math.cos(ang) < 0) {
              pen.stipple(x, Math.sin(ang) * amp, rib === 0 ? ramp[2] : ramp[3], 0.82);
            }
          }
        }

        // 3. 4-Vane Spinning Elven Feather Fletching (`xTail .. xTail + 15`)
        for (let k = 0; k < 4; k++) {
          const va = phase + (k * Math.PI) * 0.5;
          const vaneY = Math.sin(va) * 7.5;
          for (let dx = 0; dx <= 15; dx++) {
            const frac = dx / 15;
            const vy = vaneY * (1 - frac * 0.58);
            const col = Math.cos(va) >= 0 ? (k % 2 === 0 ? ramp[6] : ramp[5]) : ramp[3];
            pen.line(xTail + dx - 2, vy * 0.65, xTail + dx, vy, col, 0.94);
          }
        }

        // 4. Luminous Starlight-Gold & Emerald Arrow Shaft
        pen.line(xTail + 2, -1, xTip - 10, -1, ramp[2], 0.95);
        pen.line(xTail + 2, 0, xTip - 6, 0, PURE_WHITE, 1.0);
        pen.line(xTail + 2, 1, xTip - 10, 1, ramp[6], 0.98);
        pen.line(xTail + 2, 2, xTip - 12, 2, ramp[4], 0.9);

        // 5. Spinning Diamond-Barbed Elven Broadhead (`xTip - 18 .. xTip`)
        const barbSpan = Math.max(3.5, 8.5 * (0.58 + 0.42 * Math.abs(Math.sin(phase))));
        for (let x = xTip - 18; x <= xTip; x++) {
          const prog = (x - (xTip - 18)) / 18;
          const w = (1 - prog) * barbSpan;
          for (let dy = -Math.ceil(w); dy <= Math.ceil(w); dy++) {
            if (Math.abs(dy) > w + 0.3) continue;
            if (prog < 0.25 && Math.abs(dy) < w * 0.52) continue;
            const edge = Math.abs(dy) / Math.max(0.5, w);
            const col = edge > 0.78 ? PURE_WHITE : edge > 0.48 ? ramp[6] : ramp[4];
            pen.pixel(x, dy, col);
          }
        }

        // 6. Front half of twin 3D Mach shock-rings + front double-helix ribbons
        for (let rIdx = 0; rIdx < 2; rIdx++) {
          const ur = ((loopT / 0.5) * 2 + rIdx * 0.5) % 1;
          const rx = mixScalar(xTip - 14, xTail + 8, ur);
          const rad = 7 + Math.sin(ur * Math.PI) * 9.5;
          drawOrientedMachRing(pen, rx, 0, 1, 0, rad, 0.3, 1.6, ramp[6], ramp[4], 0.95, (a) => Math.cos(a) >= 0);
        }
        for (let rib = 0; rib < 2; rib++) {
          const rOff = rib * Math.PI;
          for (let x = xTail; x <= xTip - 10; x++) {
            const u = (x - xTail) / Math.max(1, xTip - 10 - xTail);
            const amp = 3.2 + (1 - u) * 6.5;
            const ang = x * 0.2 - phase * 2 + rOff;
            if (Math.cos(ang) >= 0) {
              const ry = Math.sin(ang) * amp;
              pen.stipple(x, ry, rib === 0 ? PURE_WHITE : ramp[6], 0.95);
              pen.stipple(x, ry + (ry >= 0 ? 1 : -1), ramp[5], 0.8);
            }
          }
        }

        drawStarburstFlare(pen, xTip - 3, 0, 7.5, 0.9, ramp);
        pen.radialGlow(xTip - 8, 0, 16, ramp[4], 0.45);
        pen.radialGlow(0, 0, 18, ramp[3], 0.28);
      }
    };
  }
};

export const sylvanStarfallSkyCell = {
  duration: 1.0,
  loop: false,
  defaults: {
    palette: SYLVAN_STARLIGHT_PALETTE,
    seed: 89
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const arrowInst = sylvanSupersonicArrowLoop.create({ palette: cfg.palette, length: 62 });
    return {
      renderFront(pen, t) {
        // Matches VFXManager Row 1 contract:
        // F00..F11 (`t < 0.40`): Horizontal `+X` Starfall Comet-Arrow flight (rotated by VFXManager)
        // F12..F29 (`t >= 0.40`): Upright Ground Runic Star-Sigil & Helical Wind Geyser Eruption (`y = +34` floor)
        if (t < 0.395) {
          const loopT = ((t / 0.4) * 0.5) % 0.5;
          arrowInst.renderFront(pen, loopT);
          return;
        }
        const u = clamp01((t - 0.4) / 0.6);
        const fade = u > 0.72 ? (1 - u) / 0.28 : 1;
        const floorY = 34;
        const rx = 8 + 26 * Easing.outExpo(Math.min(1, u * 1.4));

        drawTiltedOrbitBand(
          pen,
          0,
          floorY,
          rx,
          0.22,
          1.8,
          0.95 * fade,
          [ramp[1], ramp[3], ramp[5], PURE_WHITE],
          null,
          u < 0.2
        );
        drawElvenStarCompass(pen, 0, floorY, rx * 0.92, rx * 0.48, 0.22, u * 4.2, ramp[6], ramp[4], 0.88 * fade);

        // Upright Helical Wind & Starlight Geyser Spire (`floorY` up to `-34`)
        const geyserH = 68 * Easing.outCubic(Math.min(1, u * 2.2));
        const halfW = Math.max(1.2, 7.5 * (1 - u * 0.72));
        for (let h = 0; h <= geyserH; h++) {
          const hf = h / Math.max(1, geyserH);
          const w = halfW * (1 - hf * 0.55);
          for (let dx = -Math.ceil(w); dx <= Math.ceil(w); dx++) {
            const q = Math.abs(dx) / Math.max(0.5, w);
            if (q > 1) continue;
            const col = q < 0.32 ? PURE_WHITE : q < 0.65 ? ramp[6] : ramp[4];
            pen.stipple(dx, floorY - h, col, fade * (1 - hf * 0.25));
          }
          // Twin helical ribbons coiling up the geyser
          for (let rIdx = 0; rIdx < 2; rIdx++) {
            const a = h * 0.18 - u * 18 + rIdx * Math.PI;
            if (Math.cos(a) > -0.2) {
              pen.stipple(
                Math.sin(a) * (w + 4.5),
                floorY - h,
                rIdx === 0 ? PURE_WHITE : ramp[5],
                fade * 0.9
              );
            }
          }
        }
        if (u < 0.38) {
          drawStarburstFlare(pen, 0, floorY - 4, 18 * (1 - u / 0.38), 0.95 * fade, ramp);
        }
        pen.radialGlow(0, floorY - geyserH * 0.45, 24 * fade, ramp[4], 0.44 * fade);
      }
    };
  }
};

export const roaringWindDragonHead = {
  duration: 1.0,
  loop: true,
  defaults: {
    palette: SYLVAN_EMERALD_PALETTE,
    seed: 97
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    return {
      renderFront(pen, loopT) {
        const phase = loopT * TWO_PI;
        const jawOpen = 6.5 + 3.2 * Math.sin(phase * 2);

        // 1. S-Curved Serpentine Dragon Neck & Billowing Emerald Wind-Mane (`x = -42 .. 4`)
        for (let x = -42; x <= 4; x++) {
          const u = (x + 42) / 46;
          // Graceful S-arch rising toward the cranium
          const spineY = Math.sin(u * Math.PI * 1.15 - 0.5) * -7.5 + Math.sin(u * 4.2 - phase * 2) * (2.5 * (1 - u));
          const neckHalf = mixScalar(6.5, 14.5, Math.pow(u, 0.75));
          for (let dy = -Math.ceil(neckHalf); dy <= Math.ceil(neckHalf); dy++) {
            const q = Math.abs(dy) / neckHalf;
            if (q > 1) continue;
            const belly = dy > neckHalf * 0.45;
            const ridge = dy < -neckHalf * 0.62;
            const scaleWave = Math.sin(x * 0.62 + dy * 0.52) > 0.2;
            const col = belly
              ? ramp[6]
              : ridge
                ? ramp[5]
                : q < 0.28
                  ? ramp[5]
                  : scaleWave
                    ? ramp[4]
                    : ramp[2];
            pen.stipple(x, spineY + dy, col, 0.96);
          }
          // Flowing wind-mane plumes sweeping back off the neck crest
          if (x % 5 === 0) {
            const maneLen = 9 + (1 - u) * 7;
            const my = spineY - neckHalf;
            pen.line(x, my, x - maneLen, my - 6 - Math.sin(phase * 2 + x * 0.3) * 2.5, ramp[6], 0.92);
            pen.line(x + 1, my + 1, x - maneLen * 0.75, my - 4, ramp[4], 0.85);
          }
        }

        // 2. Sweeping Branched Starlight-Gold Dragon Antlers (`x = -26 .. 8, y = -16 .. -37`)
        pen.line(5, -15, -18, -33, ramp[6], 1.0);
        pen.line(4, -14, -17, -31, PURE_WHITE, 0.95);
        pen.line(3, -13, -15, -29, ramp[5], 0.9);
        // Antler tines
        pen.line(-2, -20, -6, -34, ramp[6], 0.95);
        pen.line(-9, -26, -15, -37, PURE_WHITE, 0.95);
        pen.line(-12, -28, -28, -35, ramp[6], 0.92);
        // Cheek & brow swept horns
        pen.line(2, -8, -16, -16, ramp[5], 0.92);
        pen.line(-1, 6, -15, 15, ramp[6], 0.9);

        // 3. Sculpted Cranium, Arched Brow Ridge, Nasal Horn & Upper Snout (`x = -2 .. 40`)
        for (let x = -2; x <= 40; x++) {
          const u = (x + 2) / 42;
          const browBump = Math.exp(-Math.pow((u - 0.24) / 0.16, 2)) * 7.5;
          const noseHorn = u > 0.82 ? Math.sin(((u - 0.82) / 0.18) * Math.PI) * 5.5 : 0;
          const topY = -12.5 * (1 - u * 0.45) - browBump - noseHorn;
          const mouthRoofY = -2.0 - jawOpen * 0.38 * Math.pow(u, 0.85);
          for (let y = Math.floor(topY); y <= Math.ceil(mouthRoofY); y++) {
            const isCrest = y <= topY + 2.1;
            const isLip = y >= mouthRoofY - 1.4;
            const col = isCrest ? ramp[6] : isLip ? PURE_WHITE : y < topY + 5 ? ramp[5] : ramp[3];
            pen.pixel(x, y, col);
          }
        }
        // Flowing golden whisker tendril from upper snout
        for (let s = 0; s <= 16; s++) {
          const su = s / 16;
          const wx = 32 - su * 28;
          const wy = -6 - su * 12 + Math.sin(su * 5 - phase * 2) * 2.5;
          pen.stipple(wx, wy, su < 0.4 ? PURE_WHITE : ramp[6], 1 - su * 0.45);
        }

        // Sharp upper dragon fangs
        pen.line(35, -3 - jawOpen * 0.3, 33, 3 - jawOpen * 0.2, PURE_WHITE, 1.0);
        pen.line(34, -3 - jawOpen * 0.3, 33, 2 - jawOpen * 0.2, ramp[6], 1.0);
        pen.line(26, -3 - jawOpen * 0.2, 25, 2 - jawOpen * 0.15, PURE_WHITE, 0.95);
        pen.line(18, -2, 17, 2, ramp[6], 0.9);

        // 4. Articulated Roaring Lower Jaw & Beard Spikes (`x = 0 .. 35`)
        for (let x = 0; x <= 35; x++) {
          const u = x / 35;
          const jawTop = 2.5 + jawOpen * Math.pow(u, 0.88);
          const jawThick = mixScalar(9.0, 3.2, u);
          const jawBot = jawTop + jawThick;
          for (let y = Math.floor(jawTop); y <= Math.ceil(jawBot); y++) {
            const col = y >= jawBot - 1.6 ? ramp[6] : y <= jawTop + 1.3 ? PURE_WHITE : ramp[3];
            pen.pixel(x, y, col);
          }
        }
        // Lower fangs
        pen.line(31, 2 + jawOpen * 0.85, 30, -3 + jawOpen * 0.85, PURE_WHITE, 1.0);
        pen.line(22, 2 + jawOpen * 0.6, 21, -2 + jawOpen * 0.6, ramp[6], 0.95);

        // 5. Blazing Spiraling Tempest Breath Orb & Beam Jet inside Open Jaws
        const breathY = 1 + jawOpen * 0.26;
        pen.fillCircle(14, breathY, 6.2, ramp[4], 0.92);
        pen.fillCircle(19, breathY, 4.8, ramp[6], 0.98);
        pen.fillCircle(22, breathY, 3.4, PURE_WHITE, 1.0);
        // Breath jet streaming out past fangs (`x = 22 .. 44`)
        for (let bx = 22; bx <= 44; bx++) {
          const bu = (bx - 22) / 22;
          const bw = (1 - bu * 0.65) * 3.2;
          for (let dy = -Math.ceil(bw); dy <= Math.ceil(bw); dy++) {
            if (Math.abs(dy) > bw) continue;
            pen.stipple(bx, breathY + dy, Math.abs(dy) < 1.1 ? PURE_WHITE : ramp[5], 1 - bu * 0.35);
          }
        }
        drawStarburstFlare(pen, 28, breathY, 10.5, 0.92, ramp);

        // 6. Fierce Slit Dragon Eye + Starlight Trail (`x = 8..16, y = -12..-8`)
        pen.line(8, -10, 16, -9, PURE_WHITE, 1.0);
        pen.line(9, -11, 15, -10, ramp[6], 1.0);
        pen.line(8, -10, 1, -14, ramp[5], 0.85);
        pen.radialGlow(12, -10, 9, PURE_WHITE, 0.6);
        pen.radialGlow(22, breathY, 26, ramp[4], 0.52);
      }
    };
  }
};

// ============================================================================
// 13. SYLVARA V3 8-ROW BAKED VFX SUITE (`archer_vfx.png`, 6240x1664, 0/240 clips)
//     Row 0: Piercing Emerald Wind-Arrow (`sylvanSupersonicArrowLoop`)
//     Row 1: Homing Starfall Seeker Arrow (`starfallSeekerArrowCell`)
//     Row 2: Verdant Bramble-Star Snare Sigil (`verdantBrambleSnareCell`)
//     Row 3: Tempest Wind-Dragon Vortex (`tempestWindDragonVortexCell`)
//     Row 4: Emerald Star-Cross Impact Burst (`emeraldStarCrossBurstCell`)
//     Row 5: Yggdrasil World-Tree & Sagittarius Constellation Canopy Seal (`yggdrasilConstellationSealCell`)
//     Row 6: Colossal Drawn Golden-Emerald Celestial Greatbow Muzzle (`colossalCelestialGreatbowCell`)
//     Row 7: World-Piercing Supernova Dragon-Arrow Beam Segment (`supernovaDragonBeamSegmentCell`)
// ============================================================================

export const starfallSeekerArrowCell = {
  duration: 1.0,
  loop: true,
  defaults: {
    palette: SYLVAN_STARLIGHT_PALETTE,
    seed: 109
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const emRamp = buildColorRamp(SYLVAN_EMERALD_PALETTE, 8);
    return {
      renderFront(pen, loopT) {
        const phase = loopT * TWO_PI;

        // 1. Back half of twin orbiting Sagittarius astrolabe seeker rings
        drawOrientedMachRing(pen, -4, 0, 1, 0, 12.5, 0.34, 1.5, ramp[5], emRamp[4], 0.86, (a) => Math.cos(a) < 0);
        drawOrientedMachRing(pen, 10, 0, 1, 0, 8.5, 0.32, 1.3, ramp[6], ramp[3], 0.82, (a) => Math.cos(a) < 0);

        // 2. Spiraling Starlight-Gold & Mint Comet Wake (`x = -36 .. 14`)
        for (let rib = 0; rib < 2; rib++) {
          const rOff = rib * Math.PI;
          for (let x = -36; x <= 14; x++) {
            const u = (x + 36) / 50;
            const amp = (1 - u * 0.62) * 7.5;
            const ang = x * 0.22 - phase * 3 + rOff;
            const sy = Math.sin(ang) * amp;
            const col = rib === 0 ? (Math.cos(ang) >= 0 ? ramp[6] : ramp[5]) : emRamp[5];
            pen.stipple(x, sy, col, 0.45 + 0.5 * u);
          }
        }

        // 3. Swept Crescent Astral Wing-Vanes (`x = -12 .. 12`)
        for (const sign of [-1, 1]) {
          for (let s = 0; s <= 18; s++) {
            const su = s / 18;
            const wx = 12 - su * 25;
            const wy = sign * (2.5 + Math.pow(su, 0.78) * 15.5 + Math.sin(phase * 2) * 1.4);
            pen.line(wx, wy * 0.55, wx - 3, wy, su < 0.45 ? PURE_WHITE : ramp[5], 0.94);
            pen.stipple(wx - 4, wy + sign * 1.1, emRamp[5], 0.85);
          }
        }

        // 4. Blazing Starlight-Gold & Emerald Seeker Shaft + Crescent Broadhead (`x = -30 .. 35`)
        pen.line(-30, -1, 24, -1, emRamp[4], 0.94);
        pen.line(-30, 0, 34, 0, PURE_WHITE, 1.0);
        pen.line(-30, 1, 24, 1, ramp[5], 0.96);

        // Diamond-Crescent Astral Seeker Head (`x = 16 .. 36`)
        for (let x = 16; x <= 36; x++) {
          const u = (x - 16) / 20;
          const w = (1 - u) * 8.8;
          for (let dy = -Math.ceil(w); dy <= Math.ceil(w); dy++) {
            if (Math.abs(dy) > w + 0.25) continue;
            if (u < 0.28 && Math.abs(dy) < w * 0.48) continue;
            const edge = Math.abs(dy) / Math.max(0.5, w);
            pen.pixel(x, dy, edge > 0.72 ? PURE_WHITE : edge > 0.4 ? ramp[6] : emRamp[5]);
          }
        }

        // 5. Front half of seeker lock-rings & tip starburst
        drawOrientedMachRing(pen, -4, 0, 1, 0, 12.5, 0.34, 1.6, PURE_WHITE, ramp[5], 0.94, (a) => Math.cos(a) >= 0);
        drawOrientedMachRing(pen, 10, 0, 1, 0, 8.5, 0.32, 1.4, PURE_WHITE, emRamp[5], 0.92, (a) => Math.cos(a) >= 0);
        drawStarburstFlare(pen, 31, 0, 9.5, 0.95, ramp);
        pen.radialGlow(20, 0, 20, ramp[5], 0.46);
        pen.radialGlow(-4, 0, 18, emRamp[4], 0.32);
      }
    };
  }
};

export const verdantBrambleSnareCell = {
  duration: 1.0,
  loop: true,
  defaults: {
    palette: SYLVAN_EMERALD_PALETTE,
    seed: 127
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const goldRamp = buildColorRamp(SYLVAN_STARLIGHT_PALETTE, 8);
    return {
      renderFront(pen, loopT) {
        const phase = loopT * TWO_PI;
        const pulse = 0.92 + 0.08 * Math.sin(phase * 2);
        const rOuter = 35 * pulse;
        const rInner = 21 * pulse;

        // 1. Deep Verdant Forest Glow & Concentric Root-Sigil Rings
        pen.radialGlow(0, 0, 34, ramp[3], 0.36);
        pen.strokeRing(0, 0, rOuter, 2.0, ramp[4], 0.92);
        pen.strokeRing(0, 0, rOuter - 2.2, 1.2, goldRamp[5], 0.88);
        pen.strokeRing(0, 0, rInner, 1.6, ramp[5], 0.9);

        // 2. Coiling Thorny Emerald Bramble Vines Weaving Around the Snare Perimeter
        const vineSteps = 72;
        for (let v = 0; v < 2; v++) {
          const vOff = v * Math.PI;
          let prevX = 0;
          let prevY = 0;
          for (let i = 0; i <= vineSteps; i++) {
            const a = (i / vineSteps) * TWO_PI;
            const wave = Math.sin(a * 6 + phase + vOff) * 3.6;
            const rr = rOuter - 3.5 + wave;
            const vx = Math.cos(a) * rr;
            const vy = Math.sin(a) * rr;
            if (i > 0) {
              pen.line(prevX, prevY, vx, vy, v === 0 ? ramp[5] : ramp[3], 0.94);
            }
            // Sharp golden-emerald bramble thorns jutting inward & outward
            if (i % 6 === 0) {
              const dir = i % 12 === 0 ? 1 : -1;
              const tx = Math.cos(a + 0.14) * (rr + dir * 4.8);
              const ty = Math.sin(a + 0.14) * (rr + dir * 4.8);
              pen.line(vx, vy, tx, ty, dir > 0 ? goldRamp[5] : ramp[6], 0.95);
              pen.stipple(tx, ty, PURE_WHITE, 0.9);
            }
            prevX = vx;
            prevY = vy;
          }
        }

        // 3. Counter-Rotating 8-Point Bramble-Star Octagram & Root Claws
        drawElvenStarCompass(pen, 0, 0, rOuter * 0.94, rInner * 0.62, 1.0, phase * 0.5, goldRamp[5], ramp[5], 0.94);
        drawElvenStarCompass(pen, 0, 0, rInner * 0.96, 8.5, 1.0, -phase * 0.5 + Math.PI / 8, PURE_WHITE, ramp[4], 0.9);

        // 4. Blooming Golden-Emerald Sylvan Core Flower
        for (let k = 0; k < 8; k++) {
          const ka = -phase + (k * TWO_PI) / 8;
          drawSylvanLeaf(
            pen,
            Math.cos(ka) * 10.5,
            Math.sin(ka) * 10.5,
            ka,
            k % 2 === 0 ? goldRamp[6] : ramp[6],
            ramp[4],
            0.95
          );
        }
        drawStarburstFlare(pen, 0, 0, 10.5, 0.95, goldRamp);
        pen.radialGlow(0, 0, 16, ramp[5], 0.48);
      }
    };
  }
};

export const tempestWindDragonVortexCell = {
  duration: 1.0,
  loop: true,
  defaults: {
    palette: SYLVAN_EMERALD_PALETTE,
    seed: 137
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const dragonHead = roaringWindDragonHead.create({ palette: cfg.palette, seed: cfg.seed });
    return {
      renderFront(pen, loopT) {
        const phase = loopT * TWO_PI;

        // 1. Back half of Swirling Razor-Leaf Cyclone Rings Coiling Around the Wind-Dragon
        for (let rIdx = 0; rIdx < 3; rIdx++) {
          const rx = -22 + rIdx * 18;
          const rad = 28 - rIdx * 3.5 + Math.sin(phase * 2 + rIdx) * 2.0;
          drawOrientedMachRing(pen, rx, 0, 1, 0, rad, 0.36, 1.8, ramp[6], ramp[3], 0.85, (a) => Math.cos(a) < 0);
        }

        // 2. Sculpted Roaring Astral Wind-Dragon Head & Serpentine Neck (`+X`)
        dragonHead.renderFront(pen, loopT);

        // 3. Front half of Cyclone Vortex Rings + Orbiting Sylvan Razor-Leaves
        for (let rIdx = 0; rIdx < 3; rIdx++) {
          const rx = -22 + rIdx * 18;
          const rad = 28 - rIdx * 3.5 + Math.sin(phase * 2 + rIdx) * 2.0;
          drawOrientedMachRing(pen, rx, 0, 1, 0, rad, 0.36, 1.9, PURE_WHITE, ramp[5], 0.94, (a) => Math.cos(a) >= 0);
        }
        for (let i = 0; i < 6; i++) {
          const la = phase * 2 + (i * TWO_PI) / 6;
          const lx = -18 + ((i * 11 + loopT * 44) % 52);
          const ly = Math.sin(la) * 24;
          if (Math.cos(la) >= -0.2) {
            drawSylvanLeaf(pen, lx, ly, la + 0.6, ramp[6], ramp[4], 0.92);
          }
        }
      }
    };
  }
};

export const emeraldStarCrossBurstCell = {
  duration: 1.0,
  loop: false,
  defaults: {
    palette: SYLVAN_EMERALD_PALETTE,
    seed: 149
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const goldRamp = buildColorRamp(SYLVAN_STARLIGHT_PALETTE, 8);
    return {
      renderFront(pen, t) {
        const u = clamp01(t / 1.0);
        const expand = Easing.outExpo(Math.min(1, u * 1.55));
        const fade = u < 0.22 ? 1.0 : clamp01(1 - (u - 0.22) / 0.78);
        if (fade <= 0.02) return;

        // 1. Expanding Supersonic Emerald & Starlight-Gold Shockwave Rings
        const rMain = 7 + 31 * expand;
        pen.strokeRing(0, 0, rMain, Math.max(1.0, 2.6 * fade), u < 0.22 ? PURE_WHITE : ramp[5], 0.95 * fade);
        pen.strokeRing(0, 0, rMain * 0.68, Math.max(1.0, 1.8 * fade), goldRamp[5], 0.88 * fade);

        // 2. 8-Point Emerald & Gold Star-Cross Detonation Lances
        const mainLance = (12 + 27 * expand) * (0.45 + 0.55 * fade);
        const diagLance = mainLance * 0.76;
        for (let k = 0; k < 8; k++) {
          const isCard = k % 2 === 0;
          const ang = (k * Math.PI) / 4 + u * 0.18;
          const ca = Math.cos(ang);
          const sa = Math.sin(ang);
          const nx = -sa;
          const ny = ca;
          const reach = isCard ? mainLance : diagLance;
          const halfW = (isCard ? 4.2 : 2.8) * fade;

          const steps = Math.max(8, Math.ceil(reach));
          for (let s = 0; s <= steps; s++) {
            const su = s / steps;
            const w = halfW * (1 - su);
            const bx = ca * (su * reach);
            const by = sa * (su * reach);
            for (let d = -Math.ceil(w); d <= Math.ceil(w); d++) {
              if (Math.abs(d) > w + 0.25) continue;
              const col = Math.abs(d) < 0.75 ? PURE_WHITE : isCard ? ramp[5] : goldRamp[5];
              pen.stipple(bx + nx * d, by + ny * d, col, fade * (1 - su * 0.22));
            }
          }
        }

        // 3. Scattering Sylvan Razor-Leaves & Star-Sparks
        for (let i = 0; i < 8; i++) {
          const la = (i * TWO_PI) / 8 + 0.39 + u * 0.9;
          const dist = (6 + 29 * expand) * (0.82 + (i % 2) * 0.16);
          drawSylvanLeaf(
            pen,
            Math.cos(la) * dist,
            Math.sin(la) * dist,
            la * 2,
            i % 2 === 0 ? goldRamp[6] : ramp[6],
            ramp[4],
            fade * 0.92
          );
        }

        if (u < 0.55) {
          drawStarburstFlare(pen, 0, 0, 20 * (1 - u / 0.55), 0.98 * fade, ramp);
        }
        pen.radialGlow(0, 0, 28 * fade, ramp[4], 0.52 * fade);
      }
    };
  }
};

export const yggdrasilConstellationSealCell = {
  duration: 1.0,
  loop: true,
  defaults: {
    palette: SYLVAN_EMERALD_PALETTE,
    seed: 163
  },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const starRamp = buildColorRamp(SYLVAN_STARLIGHT_PALETTE, 8);
    return {
      renderFront(pen, loopT) {
        const phase = loopT * TWO_PI;
        const rWheel = 38.5;

        // 1. Outer Rotating Sagittarius Constellation Astrolabe Wheel
        pen.radialGlow(0, 0, 38, ramp[3], 0.36);
        pen.strokeRing(0, 0, rWheel, 2.0, starRamp[5], 0.95);
        pen.strokeRing(0, 0, rWheel - 4.5, 1.2, ramp[5], 0.88);
        drawElvenStarCompass(pen, 0, 0, rWheel - 1.5, 24.5, 1.0, phase * 0.5, starRamp[5], ramp[4], 0.84);

        // 12 Zodiac Star Nodes around the Canopy Rim
        for (let k = 0; k < 12; k++) {
          const a = phase + (k * TWO_PI) / 12;
          const sx = Math.cos(a) * (rWheel - 2.2);
          const sy = Math.sin(a) * (rWheel - 2.2);
          pen.fillCircle(sx, sy, k % 3 === 0 ? 2.1 : 1.4, k % 3 === 0 ? PURE_WHITE : starRamp[6], 0.96);
        }

        // 2. Sacred Yggdrasil World-Tree Roots, Carved Golden Trunk, & Lush Emerald Star-Canopy
        // Intertwined roots (`y = 14 .. 31`)
        for (const sign of [-1, 1]) {
          pen.line(sign * 2, 13, sign * 12, 26, starRamp[5], 0.94);
          pen.line(sign * 4, 16, sign * 20, 23, ramp[5], 0.9);
          pen.line(0, 15, sign * 6, 29, starRamp[6], 0.92);
        }
        // Golden-Emerald World-Tree Trunk (`y = -8 .. 16`)
        for (let y = -8; y <= 16; y++) {
          const u = (y + 8) / 24;
          const halfT = 2.4 + Math.pow(Math.abs(u - 0.45), 1.4) * 3.8;
          for (let dx = -Math.ceil(halfT); dx <= Math.ceil(halfT); dx++) {
            if (Math.abs(dx) > halfT) continue;
            const col = Math.abs(dx) < 1.1 ? PURE_WHITE : Math.abs(dx) < 2.2 ? starRamp[5] : ramp[4];
            pen.pixel(dx, y, col);
          }
        }
        // Spreading Yggdrasil Boughs & Luminous Emerald-Starlight Canopy (`y = -31 .. -4`)
        const boughs = [
          [0, -6, -18, -18],
          [0, -6, 18, -18],
          [0, -10, -11, -26],
          [0, -10, 11, -26],
          [0, -12, 0, -29]
        ];
        for (const [x0, y0, x1, y1] of boughs) {
          pen.line(x0, y0, x1, y1, starRamp[6], 0.95);
          pen.fillCircle(x1, y1, 7.5, ramp[3], 0.68);
          pen.strokeRing(x1, y1, 7.5, 1.3, ramp[5], 0.88);
          const shimmer = 0.7 + 0.3 * Math.sin(phase * 2 + x1 * 0.2);
          pen.fillCircle(x1, y1, 2.4, PURE_WHITE, shimmer);
        }

        // 3. Glowing Sagittarius Constellation Bow-and-Arrow Sigil Inscribed Over the Heart of Yggdrasil
        const bowRot = Math.sin(phase) * 0.08;
        const cb = Math.cos(bowRot);
        const sb = Math.sin(bowRot);
        const rPt = (lx, ly) => [lx * cb - ly * sb, lx * sb + ly * cb];
        const [bx0, by0] = rPt(-4, -18);
        const [bxm, bym] = rPt(12, 0);
        const [bx1, by1] = rPt(-4, 18);
        const [ax0, ay0] = rPt(-18, 0);
        const [ax1, ay1] = rPt(22, 0);
        pen.line(bx0, by0, bxm, bym, PURE_WHITE, 0.95);
        pen.line(bxm, bym, bx1, by1, PURE_WHITE, 0.95);
        pen.line(bx0, by0, ax0, ay0, starRamp[5], 0.9);
        pen.line(bx1, by1, ax0, ay0, starRamp[5], 0.9);
        pen.line(ax0, ay0, ax1, ay1, PURE_WHITE, 1.0);
        drawStarburstFlare(pen, ax1, ay1, 7.5, 0.95, starRamp);
        pen.radialGlow(0, -6, 22, ramp[5], 0.42);
      }
    };
  }
};

export const colossalCelestialGreatbowCell = {
  duration: 1.0,
  loop: true,
  defaults: {
    palette: SYLVAN_STARLIGHT_PALETTE,
    seed: 179
  },
  create(cfg) {
    const goldRamp = buildColorRamp(cfg.palette, 8);
    const emRamp = buildColorRamp(SYLVAN_EMERALD_PALETTE, 8);
    return {
      renderFront(pen, loopT) {
        const phase = loopT * TWO_PI;
        const tension = 0.88 + 0.12 * Math.sin(phase * 2);
        const riserX = 8;
        const nockX = -32 - tension * 3;
        const tipX = 39;

        // 1. Converging Emerald-Gold Astral Wind-Streams Into the Riser Core
        for (let i = 0; i < 6; i++) {
          const a = phase * 2 + (i * TWO_PI) / 6;
          const u = ((loopT * 2 + i / 6) % 1);
          const dist = (1 - u) * 34;
          const sx = riserX + Math.cos(a) * dist * 0.75;
          const sy = Math.sin(a) * dist;
          pen.line(sx, sy, mixScalar(sx, riserX + 4, 0.42), sy * 0.58, i % 2 === 0 ? goldRamp[5] : emRamp[5], 0.85 * u);
        }

        // 2. Colossal Curved Golden-Emerald Yggdrasil Greatbow Limbs (`y = -38 .. +38`, facing `+X`)
        let upperTip = [riserX - 18, -37];
        let lowerTip = [riserX - 18, 37];
        for (const sign of [-1, 1]) {
          let prevX = riserX;
          let prevY = 0;
          const steps = 26;
          for (let s = 1; s <= steps; s++) {
            const u = s / steps;
            const ly = sign * u * 37.5;
            const recurve = u > 0.76 ? Math.pow((u - 0.76) / 0.24, 2) * 5.5 : 0;
            const lx = riserX - Math.pow(u, 1.42) * (24 * tension) + recurve;
            const limbW = mixScalar(4.4, 1.5, u);

            for (let dx = -Math.ceil(limbW); dx <= Math.ceil(limbW + 1.5); dx++) {
              if (dx < -limbW || dx > limbW + 1.4) continue;
              // Outer `+X` bladed edge = gleaming starlight-emerald bow-blade; spine = royal gold!
              const col =
                dx > limbW * 0.55
                  ? PURE_WHITE
                  : dx > 0
                    ? goldRamp[5]
                    : dx > -limbW * 0.55
                      ? emRamp[5]
                      : emRamp[2];
              pen.pixel(lx + dx, ly, col);
            }
            pen.line(prevX, prevY, lx, ly, goldRamp[6], 0.98);
            prevX = lx;
            prevY = ly;
          }
          if (sign < 0) upperTip = [prevX, prevY];
          else lowerTip = [prevX, prevY];
          drawStarburstFlare(pen, prevX, prevY, 6.5, 0.9, emRamp);
        }

        // 3. Taut Blazing Emerald-Starlight Bowstring Pulled to `nockX`
        pen.line(upperTip[0], upperTip[1], nockX, 0, emRamp[5], 0.96);
        pen.line(lowerTip[0], lowerTip[1], nockX, 0, emRamp[5], 0.96);
        pen.line(upperTip[0] + 1, upperTip[1], nockX + 1, 0, PURE_WHITE, 0.95);
        pen.line(lowerTip[0] + 1, lowerTip[1], nockX + 1, 0, PURE_WHITE, 0.95);

        // 4. Nocked Colossal Supernova Dragon-Arrow (`nockX` -> `tipX`)
        // Swept golden-emerald fletching at `nockX`
        for (const sign of [-1, 1]) {
          pen.line(nockX, 0, nockX - 5, sign * 7, goldRamp[5], 0.95);
          pen.line(nockX + 4, 0, nockX - 2, sign * 6, PURE_WHITE, 0.95);
        }
        // Blazing multi-band arrow shaft
        pen.line(nockX, -2, tipX - 12, -2, emRamp[4], 0.92);
        pen.line(nockX, -1, tipX - 8, -1, goldRamp[5], 0.98);
        pen.line(nockX, 0, tipX, 0, PURE_WHITE, 1.0);
        pen.line(nockX, 1, tipX - 8, 1, emRamp[5], 0.98);
        pen.line(nockX, 2, tipX - 12, 2, goldRamp[4], 0.92);

        // Supernova Dragon Broadhead (`tipX - 15 .. tipX`)
        for (let x = tipX - 15; x <= tipX; x++) {
          const u = (x - (tipX - 15)) / 15;
          const w = (1 - u) * 9.5;
          for (let dy = -Math.ceil(w); dy <= Math.ceil(w); dy++) {
            if (Math.abs(dy) > w + 0.2) continue;
            if (u < 0.25 && Math.abs(dy) < w * 0.48) continue;
            const edge = Math.abs(dy) / Math.max(0.5, w);
            pen.pixel(x, dy, edge > 0.72 ? PURE_WHITE : edge > 0.38 ? goldRamp[5] : emRamp[5]);
          }
        }

        // 5. Riser Yggdrasil Core Singularity & Broadhead Flare
        drawOrientedMachRing(pen, riserX + 3, 0, 1, 0, 13.5, 0.32, 1.6, PURE_WHITE, goldRamp[5], 0.94);
        drawStarburstFlare(pen, riserX + 3, 0, 11.5, 0.95, goldRamp);
        drawStarburstFlare(pen, tipX - 3, 0, 9.5, 0.95, emRamp);
        pen.radialGlow(riserX + 4, 0, 24, emRamp[4], 0.48);
        pen.radialGlow(tipX - 6, 0, 18, goldRamp[5], 0.44);
      }
    };
  }
};

export const supernovaDragonBeamSegmentCell = {
  duration: 1.0,
  loop: true,
  defaults: {
    palette: SYLVAN_EMERALD_PALETTE,
    seed: 193
  },
  create(cfg) {
    const emRamp = buildColorRamp(cfg.palette, 8);
    const goldRamp = buildColorRamp(SYLVAN_STARLIGHT_PALETTE, 8);
    return {
      renderFront(pen, loopT) {
        const phase = loopT * TWO_PI;
        const x0 = -42;
        const x1 = 42;

        // 1. Back Half of Spiraling Emerald-Gold Dragon-Scale Helices & Mach Shock-Rings
        for (let rIdx = 0; rIdx < 2; rIdx++) {
          const ur = (loopT * 2 + rIdx * 0.5) % 1;
          const rx = mixScalar(x0 + 8, x1 - 8, ur);
          const rad = 18 + Math.sin(ur * Math.PI) * 5;
          drawOrientedMachRing(pen, rx, 0, 1, 0, rad, 0.3, 1.6, goldRamp[5], emRamp[3], 0.86, (a) => Math.cos(a) < 0);
        }
        for (let h = 0; h < 2; h++) {
          const hOff = h * Math.PI;
          for (let x = x0; x <= x1; x++) {
            const u = (x - x0) / (x1 - x0);
            const endEnv = Math.sin(u * Math.PI) * 0.35 + 0.65;
            const ang = u * TWO_PI * 2 - phase * 2 + hOff;
            if (Math.cos(ang) < 0) {
              const hy = Math.sin(ang) * 20 * endEnv;
              pen.line(x, hy - 1.5, x, hy + 1.5, h === 0 ? emRamp[3] : goldRamp[4], 0.86);
            }
          }
        }

        // 2. Horizontal Supernova Arrow-Beam Core Wave (`x = -42 .. +42`)
        for (let x = x0; x <= x1; x++) {
          const u = (x - x0) / (x1 - x0);
          // Smooth edge taper near cell boundaries so 0/240 border clips while tiling seamlessly
          const edgeEnv = smoothStep(0.0, 0.14, u) * smoothStep(1.0, 0.86, u);
          const wave = 1 + 0.16 * Math.sin(u * TWO_PI * 3 - phase * 3);
          const halfH = (3.5 + 8.5 * edgeEnv) * wave;
          for (let dy = -Math.ceil(halfH); dy <= Math.ceil(halfH); dy++) {
            const q = Math.abs(dy) / Math.max(0.5, halfH);
            if (q > 1) continue;
            const col =
              q < 0.28
                ? PURE_WHITE
                : q < 0.54
                  ? goldRamp[6]
                  : q < 0.78
                    ? emRamp[5]
                    : emRamp[3];
            pen.stipple(x, dy, col, 0.45 + 0.55 * edgeEnv);
          }
        }

        // 3. Front Half of Braided Dragon-Arrow Helices + Forward Chevron Surge Waves
        for (let h = 0; h < 2; h++) {
          const hOff = h * Math.PI;
          for (let x = x0; x <= x1; x++) {
            const u = (x - x0) / (x1 - x0);
            const edgeEnv = smoothStep(0.0, 0.12, u) * smoothStep(1.0, 0.88, u);
            const ang = u * TWO_PI * 2 - phase * 2 + hOff;
            if (Math.cos(ang) >= 0) {
              const hy = Math.sin(ang) * (6 + 15 * edgeEnv);
              pen.pixel(x, hy, PURE_WHITE);
              pen.stipple(x, hy + 1.3, h === 0 ? goldRamp[5] : emRamp[5], 0.95);
              pen.stipple(x, hy - 1.3, emRamp[4], 0.9);
            }
          }
        }

        // Forward `+X` arrowhead surge chevrons racing down the beam
        for (let c = 0; c < 3; c++) {
          const cu = (loopT * 2 + c / 3) % 1;
          const cx = mixScalar(x0 + 10, x1 - 10, cu);
          const cAlpha = Math.sin(cu * Math.PI) * 0.95;
          pen.line(cx, 0, cx - 9, -12, PURE_WHITE, cAlpha);
          pen.line(cx, 0, cx - 9, 12, PURE_WHITE, cAlpha);
          pen.line(cx - 2, 0, cx - 11, -12, goldRamp[5], cAlpha * 0.9);
          pen.line(cx - 2, 0, cx - 11, 12, emRamp[5], cAlpha * 0.9);
        }

        for (let rIdx = 0; rIdx < 2; rIdx++) {
          const ur = (loopT * 2 + rIdx * 0.5) % 1;
          const rx = mixScalar(x0 + 8, x1 - 8, ur);
          const rad = 18 + Math.sin(ur * Math.PI) * 5;
          drawOrientedMachRing(pen, rx, 0, 1, 0, rad, 0.3, 1.7, PURE_WHITE, goldRamp[5], 0.94, (a) => Math.cos(a) >= 0);
        }

        pen.radialGlow(0, 0, 28, emRamp[4], 0.44);
      }
    };
  }
};

// ============================================================================
// 14. SYLVARA V4 ULTIMATE & SUPREME ULTIMATE REWORK SHADERS
//     - `yggdrasilRootPrison`: 2.5D Elder-Wood Yggdrasil Thorn-Root Cage rooting enemies in place
//     - `yggdrasilLockReticle`: 180° Azimuth Sagittarius Target Lock Reticle
//     - `starlockHomingArrow`: Radial 180°-Arc Lock-On Sightline & Supersonic Seeker Arrow
// ============================================================================

export const yggdrasilRootPrison = {
  duration: 3.1,
  loop: false,
  defaults: {
    palette: SYLVAN_EMERALD_PALETTE,
    radius: 26,
    height: 44,
    seed: 211
  },
  create(cfg) {
    const emRamp = buildColorRamp(cfg.palette, 8);
    const goldRamp = buildColorRamp(SYLVAN_STARLIGHT_PALETTE, 8);
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, goldRamp[6], emRamp[5], emRamp[3]], floorY: 2 });
    const dur = cfg.duration || 3.1;
    let t = 0;
    let emitAcc = 0;
    let burstEmitted = false;

    const rootSpecs = Array.from({ length: 6 }, (_, i) => ({
      baseAng: (i / 6) * TWO_PI + 0.28,
      twist: (i % 2 === 0 ? 1 : -1) * 1.35,
      hScale: 0.84 + (i % 3) * 0.08,
      leanIn: 0.34 + (i % 2) * 0.12
    }));

    const renderPass = (pen, isFront) => {
      const u = clamp01(t / dur);
      const erupt = Easing.outBack(clamp01(t / 0.24), 1.35);
      const shatterU = t > dur - 0.26 ? clamp01((t - (dur - 0.26)) / 0.26) : 0;
      const fade = 1 - shatterU;
      if (fade <= 0.03) return;

      const rad = (cfg.radius || 26) * (1 + shatterU * 0.38);
      const maxH = (cfg.height || 44) * erupt;
      const pred = (ang) => (Math.sin(ang) >= 0) === isFront;

      // 1. Ground Elder-Wood Root Seal & Tilted Thorn-Shackle Rings
      drawTiltedOrbitBand(
        pen,
        0,
        0,
        rad,
        0.24,
        1.8,
        (isFront ? 0.92 : 0.62) * fade,
        [emRamp[1], emRamp[3], emRamp[5], goldRamp[5]],
        pred,
        t < 0.14
      );
      drawElvenStarCompass(
        pen,
        0,
        0,
        rad * 0.94,
        rad * 0.52,
        0.24,
        t * 0.85,
        goldRamp[5],
        emRamp[5],
        (isFront ? 0.86 : 0.52) * fade,
        pred
      );

      // Waist & shin binding rings locking the target's legs
      for (let b = 0; b < 2; b++) {
        const by = -maxH * (b === 0 ? 0.34 : 0.68);
        const br = rad * (b === 0 ? 0.72 : 0.56);
        drawTiltedOrbitBand(
          pen,
          0,
          by,
          br,
          0.22,
          1.4,
          (isFront ? 0.9 : 0.55) * fade,
          [emRamp[2], emRamp[4], goldRamp[5], PURE_WHITE],
          pred,
          false
        );
      }

      // 2. Six Gnarled Golden-Bark & Bioluminescent Emerald Yggdrasil Thorn-Roots
      for (let rIdx = 0; rIdx < rootSpecs.length; rIdx++) {
        const rs = rootSpecs[rIdx];
        const steps = 20;
        let prevX = 0;
        let prevY = 0;
        let prevVis = false;
        const rHeight = maxH * rs.hScale;

        for (let s = 0; s <= steps; s++) {
          const v = s / steps;
          const ang = rs.baseAng + rs.twist * v + Math.sin(t * 4.5 + rIdx) * 0.05 * v;
          const sinA = Math.sin(ang);
          const vis = (sinA >= 0) === isFront;
          const localR = rad * (1 - rs.leanIn * Math.sin(v * Math.PI * 0.82)) + shatterU * 10 * v;
          const rx = Math.cos(ang) * localR;
          const ry = -v * rHeight + sinA * localR * 0.18;

          if (s > 0 && vis && prevVis) {
            const thick = mixScalar(2.6, 0.7, v) * fade;
            const sapPulse = 0.5 + 0.5 * Math.sin(v * 9 - t * 11 + rIdx);
            const coreCol = v > 0.86 ? PURE_WHITE : sapPulse > 0.72 ? goldRamp[5] : emRamp[5];
            const barkCol = emRamp[2];
            if (thick >= 1.5) {
              pen.line(prevX - 1, prevY, rx - 1, ry, barkCol, (isFront ? 0.92 : 0.6) * fade);
              pen.line(prevX + 1, prevY, rx + 1, ry, goldRamp[4], (isFront ? 0.88 : 0.55) * fade);
            }
            pen.line(prevX, prevY, rx, ry, coreCol, (isFront ? 0.96 : 0.68) * fade);

            // Jutting emerald-gold bramble thorns along each root
            if (s % 5 === 2 && v < 0.88) {
              const outSign = s % 2 === 0 ? 1 : -1;
              const tx = rx + Math.cos(ang) * outSign * 3.8;
              const ty = ry - 2.6;
              pen.line(rx, ry, tx, ty, goldRamp[6], 0.9 * fade);
              pen.stipple(tx, ty, PURE_WHITE, 0.85 * fade);
            }
          }
          if (s === steps && vis) {
            drawSylvanLeaf(pen, rx, ry, ang - Math.PI * 0.5, goldRamp[6], emRamp[4], 0.94 * fade);
          }
          prevX = rx;
          prevY = ry;
          prevVis = vis;
        }
      }

      if (isFront) {
        pen.radialGlow(0, -10, 22 * fade, emRamp[4], 0.34 * fade);
        motes.render(pen);
      }
    };

    return {
      step(dt) {
        t += dt;
        emitAcc += dt;
        if (!burstEmitted) {
          burstEmitted = true;
          for (let i = 0; i < 14; i++) {
            const a = -Math.PI * 0.5 + rng.between(-1.05, 1.05);
            const sp = rng.between(55, 150);
            motes.emit(
              i % 3 === 0 ? 'glint' : 'spark',
              rng.between(-12, 12),
              -2,
              Math.cos(a) * sp,
              Math.sin(a) * sp,
              rng.between(0.18, 0.36),
              rng.chance(0.5) ? goldRamp[5] : emRamp[4],
              1,
              85
            );
          }
        }
        if (t < dur - 0.25 && emitAcc >= 0.08) {
          emitAcc -= 0.08;
          motes.emit(
            'glint',
            rng.between(-18, 18),
            rng.between(-32, -4),
            rng.between(-12, 12),
            rng.between(-34, -14),
            0.28,
            rng.chance(0.45) ? goldRamp[6] : emRamp[5]
          );
        }
        motes.step(dt);
      },
      renderBack(pen) {
        renderPass(pen, false);
      },
      renderFront(pen) {
        renderPass(pen, true);
      }
    };
  }
};

export const yggdrasilLockReticle = {
  duration: 1.48,
  loop: false,
  defaults: {
    palette: SYLVAN_STARLIGHT_PALETTE,
    radius: 19,
    chargeDir: 1,
    seed: 223
  },
  create(cfg) {
    const starRamp = buildColorRamp(cfg.palette, 8);
    const emRamp = buildColorRamp(SYLVAN_EMERALD_PALETTE, 8);
    const dur = cfg.duration || 1.48;
    const lockDegs = [22, 46, 70, 90, 110, 134, 158];
    let t = 0;

    return {
      step(dt) {
        t += dt;
      },
      renderFront(pen) {
        const u = clamp01(t / dur);
        const snap = Easing.outBack(clamp01(t / 0.14), 1.6);
        const fade = u > 0.84 ? (1 - u) / 0.16 : 1;
        if (fade <= 0.03) return;

        const r = (cfg.radius || 19) * (1.32 - 0.32 * snap);
        const rot = t * 3.2;

        // 1. Concentric Sagittarius Lock-On Crosshair Rings
        pen.strokeRing(0, 0, r, 1.4, starRamp[5], 0.92 * fade);
        pen.strokeRing(0, 0, r * 0.56, 1.1, emRamp[5], 0.86 * fade);

        for (let k = 0; k < 4; k++) {
          const a = rot + (k * Math.PI) / 2;
          const ca = Math.cos(a);
          const sa = Math.sin(a);
          pen.line(ca * (r * 0.36), sa * (r * 0.36), ca * (r + 4.5), sa * (r + 4.5), PURE_WHITE, 0.94 * fade);
        }

        // 2. Upper 180° Semicircular Starlock Azimuth Gauge (`7` radial lock-on nodes!)
        const arcR = r + 7.5;
        const dir = cfg.chargeDir >= 0 ? 1 : -1;
        for (let s = 0; s < 24; s++) {
          const th0 = (s / 24) * Math.PI;
          const th1 = ((s + 1) / 24) * Math.PI;
          const x0 = -dir * Math.cos(th0) * arcR;
          const y0 = -Math.sin(th0) * arcR;
          const x1 = -dir * Math.cos(th1) * arcR;
          const y1 = -Math.sin(th1) * arcR;
          pen.line(x0, y0, x1, y1, s / 24 <= u * 1.15 ? starRamp[5] : emRamp[3], 0.82 * fade);
        }

        for (let i = 0; i < lockDegs.length; i++) {
          const th = (lockDegs[i] * Math.PI) / 180;
          const nx = -dir * Math.cos(th) * arcR;
          const ny = -Math.sin(th) * arcR;
          const lit = u >= (i / lockDegs.length) * 0.82;
          pen.fillCircle(nx, ny, lit ? 1.8 : 1.1, lit ? PURE_WHITE : emRamp[4], 0.95 * fade);
        }

        drawStarburstFlare(pen, 0, 0, 6.5 * fade, 0.88 * fade, starRamp);
        pen.radialGlow(0, 0, 15 * fade, emRamp[4], 0.32 * fade);
      }
    };
  }
};

export const starlockHomingArrow = {
  duration: 0.34,
  loop: false,
  defaults: {
    palette: SYLVAN_STARLIGHT_PALETTE,
    dx: 48,
    dy: 48,
    seed: 239
  },
  create(cfg) {
    const starRamp = buildColorRamp(cfg.palette, 8);
    const emRamp = buildColorRamp(SYLVAN_EMERALD_PALETTE, 8);
    const dx = cfg.dx ?? 48;
    const dy = cfg.dy ?? 48;
    const totalDist = Math.max(4, Math.hypot(dx, dy));
    const ux = dx / totalDist;
    const uy = dy / totalDist;
    const nx = -uy;
    const ny = ux;
    const dur = cfg.duration || 0.34;
    let t = 0;

    return {
      step(dt) {
        t += dt;
      },
      renderFront(pen) {
        const u = clamp01(t / dur);
        const fade = u > 0.72 ? (1 - u) / 0.28 : 1;
        if (fade <= 0.03) return;

        // 1. Instantaneous Emerald-Gold Lock-On Laser Sightline (`0.00..0.16s`)
        if (u < 0.48) {
          const sightA = (1 - u / 0.48) * 0.82;
          pen.line(0, 0, dx, dy, u < 0.18 ? PURE_WHITE : emRamp[5], sightA);
        }

        // 2. Supersonic Homing Starlock Arrow Streaking Radially Inward (`u = 0.0 .. 0.68`)
        const flightU = clamp01(u / 0.62);
        const headD = totalDist * Easing.outCubic(flightU);
        const tailD = Math.max(0, headD - Math.min(26, totalDist * 0.55));
        const hx = ux * headD;
        const hy = uy * headD;
        const tx = ux * tailD;
        const ty = uy * tailD;

        if (flightU < 0.98) {
          pen.line(tx + nx * 1.1, ty + ny * 1.1, hx, hy, emRamp[5], 0.92 * fade);
          pen.line(tx - nx * 1.1, ty - ny * 1.1, hx, hy, starRamp[5], 0.92 * fade);
          pen.line(tx, ty, hx, hy, PURE_WHITE, 1.0 * fade);

          // Crescent Starlock Broadhead Vanes
          pen.line(hx, hy, hx - ux * 5.5 + nx * 3.4, hy - uy * 5.5 + ny * 3.4, starRamp[6], 0.96 * fade);
          pen.line(hx, hy, hx - ux * 5.5 - nx * 3.4, hy - uy * 5.5 - ny * 3.4, starRamp[6], 0.96 * fade);
          drawOrientedMachRing(
            pen,
            ux * Math.max(3, headD - 6),
            uy * Math.max(3, headD - 6),
            ux,
            uy,
            7.5,
            0.34,
            1.4,
            PURE_WHITE,
            emRamp[5],
            0.88 * fade
          );
        }

        // 3. Muzzle Flash & Locked-Target Detonation Starburst
        if (u < 0.24) {
          drawStarburstFlare(pen, 0, 0, 9.5 * (1 - u / 0.24), 0.9, starRamp);
        }
        if (u >= 0.52) {
          const impU = (u - 0.52) / 0.48;
          const impFade = 1 - impU;
          pen.strokeRing(dx, dy, 4 + 14 * Easing.outExpo(impU), 1.5, starRamp[5], 0.92 * impFade);
          drawStarburstFlare(pen, dx, dy, 12.5 * impFade, 0.95 * impFade, emRamp);
          pen.radialGlow(dx, dy, 16 * impFade, starRamp[5], 0.42 * impFade);
        }
      }
    };
  }
};

export const SYLVAN_EFFECT_REGISTRY = {
  sylvanBowDrawVortex,
  sonicBowReleaseWave,
  sylvanLeafCloakDome,
  zephyrVaultSlipstream,
  zephyrGroundBurst,
  astralWingPlume,
  starfallCelestialLock,
  emeraldTempestCyclone,
  starfallRainBarrage,
  astralHurricaneLance,
  sylvanArrowImpactBurst,
  sylvanSupersonicArrowLoop,
  sylvanStarfallSkyCell,
  roaringWindDragonHead,
  starfallSeekerArrowCell,
  verdantBrambleSnareCell,
  tempestWindDragonVortexCell,
  emeraldStarCrossBurstCell,
  yggdrasilConstellationSealCell,
  colossalCelestialGreatbowCell,
  supernovaDragonBeamSegmentCell,
  yggdrasilRootPrison,
  yggdrasilLockReticle,
  starlockHomingArrow
};


