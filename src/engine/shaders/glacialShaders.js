/**
 * Glacia (Cryo-Prismatic Frost-Empress) — Multi-Layer 2.5D Pixel-Shader Pack
 *
 * Designed to stack seamlessly WITH Glacia's 52x52 -> 4x NEAREST (208x208) 4x4 pixel-art
 * `icemage_vfx.png` constructs and multi-pass 4x4 geometric crystal renderers in `IceMage.js`.
 */

import {
  PURE_WHITE,
  clamp01,
  Easing,
  buildColorRamp,
  DeterministicRng,
  MotePool,
  buildLightningChain,
  drawTiltedOrbitBand,
  drawStarburstFlare,
  drawMultiLayerCrescentArc
} from '../ArcaneShaderFX.js?v=30fps52';

const GLACIAL_RAMP = [
  '#061024', // 0: Deep Arctic Midnight
  '#0f2952', // 1: Trench Sapphire
  '#0369a1', // 2: Glacier Cobalt
  '#0284c7', // 3: Borealis Azure
  '#06b6d4', // 4: Cryo Turquoise
  '#38bdf8', // 5: Radiant Sky-Ice
  '#bae6fd', // 6: Crystalline Frost
  '#ffffff'  // 7: Diamond White
];

const AURORA_RAMP = [
  '#081026',
  '#1e1b4b',
  '#312e81',
  '#4338ca',
  '#0284c7',
  '#2dd4bf',
  '#a5f3fc',
  '#ffffff'
];

/** Draw a crisp pixel-art 6-point snowflake / diamond star on `pen`. */
function drawPixelSnowflakeStar(pen, cx, cy, armLen, colOuter, colInner, alpha = 1) {
  if (armLen <= 0.8 || alpha <= 0.04) return;
  const L = Math.round(armLen);
  for (let i = -L; i <= L; i++) {
    const c = Math.abs(i) <= 1 ? PURE_WHITE : Math.abs(i) < L ? colInner : colOuter;
    pen.stipple(cx + i, cy, c, 1);
    pen.stipple(cx, cy + i, c, 1);
  }
  const dL = Math.max(1, Math.round(L * 0.65));
  for (let i = -dL; i <= dL; i++) {
    const c = Math.abs(i) === 0 ? PURE_WHITE : colOuter;
    pen.stipple(cx + i, cy + i, c, 1);
    pen.stipple(cx + i, cy - i, c, 1);
  }
  pen.radialGlow(cx, cy, L + 1.5, colInner, 0.24 * alpha);
}

/**
 * 1. `cryoScepterFocus`
 * Multi-layer pointed frost-crescent wave + 2.5D tilted cryo-focus ring + diamond snowflake glints.
 */
const cryoScepterFocus = {
  duration: 0.44,
  loop: false,
  defaults: { palette: GLACIAL_RAMP },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const rng = new DeterministicRng(cfg.seed || 701);
    const motes = new MotePool({ rng, sparkRamp: [ramp[7], ramp[6], ramp[5], ramp[3]] });
    let spawned = false;

    return {
      step(dt) {
        if (!spawned) {
          spawned = true;
          for (let i = 0; i < 14; i++) {
            const a = rng.between(-0.75, 0.75);
            const spd = rng.between(48, 132);
            motes.emit(
              i % 3 === 0 ? 'glint' : 'spark',
              4 + rng.between(-3, 3),
              rng.between(-5, 5),
              Math.cos(a) * spd,
              Math.sin(a) * spd,
              rng.between(0.18, 0.34),
              ramp[i % 2 === 0 ? 6 : 5],
              1
            );
          }
        }
        motes.step(dt);
      },
      renderBack(pen, t) {
        const p = clamp01(t / 0.44);
        const fade = 1 - Easing.inQuad(p);
        const rx = 11 + Easing.outExpo(p) * 16;
        drawTiltedOrbitBand(
          pen,
          4,
          0,
          rx,
          0.44,
          2.0 * fade + 0.6,
          fade * 0.85,
          [ramp[1], ramp[3], ramp[5], ramp[7]],
          (th) => Math.sin(th) < 0,
          t < 0.08
        );
      },
      renderFront(pen, t) {
        const p = clamp01(t / 0.44);
        const fade = 1 - Easing.inQuad(p);
        const sweep = Easing.outCubic(p);
        const rx = 11 + Easing.outExpo(p) * 16;

        drawMultiLayerCrescentArc(pen, {
          cx: 2,
          cy: 0,
          radius: 15 + sweep * 10,
          width: 6.2 * (1 - p * 0.35),
          eccentricity: 0.78,
          headAngle: -0.85 + sweep * 1.85,
          tailAngle: -1.55 + sweep * 0.65,
          fade,
          ramp,
          seed: cfg.seed || 701,
          t,
          flashHot: p < 0.16
        });

        drawTiltedOrbitBand(
          pen,
          4,
          0,
          rx,
          0.44,
          2.2 * fade + 0.6,
          fade,
          [ramp[2], ramp[4], ramp[6], ramp[7]],
          (th) => Math.sin(th) >= 0,
          t < 0.08
        );

        for (let k = 0; k < 5; k++) {
          const ang = -0.64 + k * 0.32;
          const len = (10 + k * 2.2) * Easing.outCubic(Math.min(1, p * 1.7)) * fade;
          const ex = 6 + Math.cos(ang) * len;
          const ey = Math.sin(ang) * len * 0.72;
          pen.line(4, 0, ex, ey, k === 2 ? PURE_WHITE : ramp[6], 1);
          if (k % 2 === 0 && fade > 0.3) {
            drawPixelSnowflakeStar(pen, ex, ey, 2.2, ramp[5], ramp[7], fade);
          }
        }

        drawStarburstFlare(pen, 5, 0, 8 * fade + 2, fade, ramp);
        motes.render(pen);
      }
    };
  }
};

/**
 * 2. `cryoPrismMachCone`
 * Directional crystalline Mach-cone shockwave ring & pointed frost-crescent wave on shard/prism fire.
 */
const cryoPrismMachCone = {
  duration: 0.36,
  loop: false,
  defaults: { palette: GLACIAL_RAMP, aimAngle: 0, empowered: false },
  create(cfg) {
    const ramp = buildColorRamp(cfg.empowered ? AURORA_RAMP : cfg.palette, 8);
    const rng = new DeterministicRng(cfg.seed || 705);
    const motes = new MotePool({ rng, sparkRamp: [ramp[7], ramp[6], ramp[5], ramp[3]] });
    const aim = cfg.aimAngle ?? 0;
    let spawned = false;

    return {
      step(dt) {
        if (!spawned) {
          spawned = true;
          for (let i = 0; i < 12; i++) {
            const a = aim + rng.between(-0.55, 0.55);
            const spd = rng.between(55, 145);
            motes.emit(
              i % 2 === 0 ? 'glint' : 'spark',
              0,
              0,
              Math.cos(a) * spd,
              Math.sin(a) * spd,
              rng.between(0.15, 0.3),
              ramp[i % 2 === 0 ? 6 : 5],
              1,
              20
            );
          }
        }
        motes.step(dt);
      },
      renderFront(pen, t) {
        const p = clamp01(t / 0.36);
        const fade = 1 - Easing.inQuad(p);
        const sweep = Easing.outCubic(p);

        drawMultiLayerCrescentArc(pen, {
          cx: Math.cos(aim) * (4 + sweep * 8),
          cy: Math.sin(aim) * (4 + sweep * 8),
          radius: 13 + sweep * 11,
          width: 5.6 * (1 - p * 0.4),
          eccentricity: 0.72,
          headAngle: aim + 0.85,
          tailAngle: aim - 0.85,
          fade,
          ramp,
          seed: cfg.seed || 705,
          t,
          flashHot: p < 0.18
        });

        drawStarburstFlare(pen, 0, 0, 8 * fade + 2, fade, ramp);
        motes.render(pen);
      }
    };
  }
};

/**
 * 3. `refractedBorealisBeam`
 * Multi-layer coaxial Borealis refraction beam + helical frost-lightning + prism starbursts.
 */
const refractedBorealisBeam = {
  duration: 0.44,
  loop: false,
  defaults: { palette: GLACIAL_RAMP, dx: 76, dy: 0, magenta: false },
  create(cfg) {
    const ramp = buildColorRamp(cfg.magenta ? AURORA_RAMP : cfg.palette, 8);
    const rng = new DeterministicRng(cfg.seed || 709);
    const motes = new MotePool({ rng, sparkRamp: [ramp[7], ramp[6], ramp[5], ramp[3]] });
    const dx = Math.round((cfg.dx ?? 76) / 3);
    const dy = Math.round((cfg.dy ?? 0) / 3);
    let boltA = [];
    let boltB = [];
    let timer = 0;

    return {
      step(dt) {
        timer -= dt;
        if (timer <= 0) {
          timer = 0.025;
          boltA = buildLightningChain(rng, 0, 0, dx, dy, 0.12, 3);
          boltB = buildLightningChain(rng, 0, 0, dx, dy, 0.18, 3);
        }
        if (rng.chance(0.4)) {
          const u = rng.nextFloat();
          motes.emit(
            'glint',
            dx * u + rng.between(-2, 2),
            dy * u + rng.between(-2, 2),
            rng.between(-24, 24),
            rng.between(-32, 16),
            rng.between(0.14, 0.26),
            ramp[u > 0.5 ? 6 : 5],
            1
          );
        }
        motes.step(dt);
      },
      renderFront(pen, t) {
        const p = clamp01(t / 0.44);
        const fade = 1 - Easing.inQuad(p);
        const dist = Math.max(1, Math.hypot(dx, dy));
        const nx = -dy / dist;
        const ny = dx / dist;

        const steps = Math.max(6, Math.ceil(dist * 0.65));
        for (let s = 0; s <= steps; s++) {
          const u = s / steps;
          const bx = dx * u;
          const by = dy * u;
          const wave = Math.sin(u * 12 - t * 26) * 2.6 * fade;
          pen.stipple(bx + nx * wave, by + ny * wave, ramp[5], 1);
          pen.stipple(bx - nx * wave, by - ny * wave, ramp[4], 1);
        }

        pen.line(nx * 1.0, ny * 1.0, dx + nx * 1.0, dy + ny * 1.0, ramp[5], 1);
        pen.line(-nx * 1.0, -ny * 1.0, dx - nx * 1.0, dy - ny * 1.0, ramp[3], 1);
        pen.line(0, 0, dx, dy, PURE_WHITE, 1);

        pen.polyline(boltB, ramp[5], 1, 0.26 * fade, ramp[5]);
        pen.polyline(boltA, PURE_WHITE, 1, 0.34 * fade, ramp[6]);

        drawStarburstFlare(pen, 0, 0, 7 * fade + 1.5, fade, ramp);
        drawStarburstFlare(pen, dx, dy, 8 * fade + 1.5, fade, ramp);
        motes.render(pen);
      }
    };
  }
};

/**
 * 4. `permafrostSnowflakeSigil`
 * 2.5D crystalline permafrost aura ring + rising snowflake motes (stacked under `IceMage.drawPermafrostZones`).
 */
const permafrostSnowflakeSigil = {
  duration: 1.2,
  loop: false,
  defaults: { palette: GLACIAL_RAMP, radiusWorld: 155 },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const rng = new DeterministicRng(cfg.seed || 719);
    const motes = new MotePool({ rng, sparkRamp: [ramp[7], ramp[6], ramp[5], ramp[4]] });
    const rxBase = Math.max(24, Math.min(72, Math.round((cfg.radiusWorld ?? 155) / 3.4)));

    return {
      step(dt) {
        if (rng.chance(0.45)) {
          const a = rng.between(0, Math.PI * 2);
          const r = rng.between(6, rxBase);
          motes.emit(
            rng.chance(0.6) ? 'glint' : 'orb',
            Math.cos(a) * r,
            Math.sin(a) * r * 0.24,
            rng.between(-10, 10),
            rng.between(-38, -14),
            rng.between(0.22, 0.42),
            ramp[rng.intBetween(4, 7)],
            1.0,
            -16
          );
        }
        motes.step(dt);
      },
      renderBack(pen, t) {
        const p = clamp01(t / 1.2);
        const env = p < 0.15 ? Easing.outCubic(p / 0.15) : 1 - Easing.inQuad((p - 0.15) / 0.85);
        const rx = rxBase * (0.82 + 0.18 * Easing.outCubic(Math.min(1, p * 2.4)));

        drawTiltedOrbitBand(
          pen,
          0,
          0,
          rx,
          0.22,
          2.2,
          env * 0.85,
          [ramp[1], ramp[3], ramp[5], ramp[7]],
          (th) => Math.sin(th) < 0,
          p < 0.08
        );
      },
      renderFront(pen, t) {
        const p = clamp01(t / 1.2);
        const env = p < 0.15 ? Easing.outCubic(p / 0.15) : 1 - Easing.inQuad((p - 0.15) / 0.85);
        const rx = rxBase * (0.82 + 0.18 * Easing.outCubic(Math.min(1, p * 2.4)));

        drawTiltedOrbitBand(
          pen,
          0,
          0,
          rx,
          0.22,
          2.4,
          env,
          [ramp[2], ramp[4], ramp[6], ramp[7]],
          (th) => Math.sin(th) >= 0,
          p < 0.08
        );
        motes.render(pen);
      }
    };
  }
};

/**
 * 5. `glacialSkateRibbon`
 * Multi-layer figure-skating slipstream arc + ground frost wake + snowflake glints.
 */
const glacialSkateRibbon = {
  duration: 0.48,
  loop: true,
  defaults: { palette: GLACIAL_RAMP },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const rng = new DeterministicRng(cfg.seed || 727);
    const motes = new MotePool({ rng, sparkRamp: [ramp[7], ramp[6], ramp[5], ramp[3]] });

    return {
      step(dt) {
        if (rng.chance(0.65)) {
          motes.emit(
            rng.chance(0.55) ? 'glint' : 'spark',
            rng.between(-24, 10),
            rng.between(-22, 2),
            rng.between(-75, -20),
            rng.between(-28, 14),
            rng.between(0.16, 0.3),
            ramp[rng.intBetween(4, 7)],
            1,
            18
          );
        }
        motes.step(dt);
      },
      renderBack(pen, t) {
        const p = clamp01(t / 0.48);
        const span = 26 + Math.sin(p * Math.PI) * 10;

        for (let i = 0; i < 3; i++) {
          const yOff = -24 + i * 10;
          const wave = Math.sin(t * 22 + i * 1.6) * 2.2;
          const x0 = -span - i * 4;
          const x1 = 6 - i * 3;
          pen.line(x0, yOff + wave, x1, yOff - wave * 0.5, i === 1 ? PURE_WHITE : ramp[5], 1);
          pen.line(x0, yOff + wave + 1, x1, yOff - wave * 0.5 + 1, ramp[3], 1);
        }
      },
      renderFront(pen, t) {
        const p = clamp01(t / 0.48);
        drawMultiLayerCrescentArc(pen, {
          cx: -4,
          cy: -14,
          radius: 16 + Math.sin(p * Math.PI) * 6,
          width: 5.2,
          eccentricity: 0.38,
          headAngle: 0.6 + p * 1.2,
          tailAngle: -0.6 + p * 0.6,
          fade: 0.92,
          ramp,
          seed: cfg.seed || 727,
          t,
          flashHot: false
        });
        motes.render(pen);
      }
    };
  }
};

/**
 * 6. `borealisCathedralDomain`
 * Ultimate — Absolute Zero Borealis Cathedral (`ULTIMATE`)
 * Multi-layer 7-prism lightning convergence, 2.5D coaxial frost-cathedral rings,
 * and radial diamond-frost shatter spears (stacked with `IceMage.drawBorealisCathedral`).
 */
const borealisCathedralDomain = {
  duration: 1.52,
  loop: false,
  defaults: { palette: GLACIAL_RAMP },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const auroraRamp = buildColorRamp(AURORA_RAMP, 8);
    const rng = new DeterministicRng(cfg.seed || 757);
    const motes = new MotePool({ rng, sparkRamp: [ramp[7], ramp[6], ramp[5], auroraRamp[5]] });
    const archNodes = [];
    for (let k = 0; k < 7; k++) {
      const ang = -Math.PI * 0.92 + (k / 6) * (Math.PI * 0.84);
      archNodes.push([Math.cos(ang) * 64, -42 + Math.sin(ang) * 52]);
    }
    let rays = archNodes.map(() => []);
    let archLinks = [];
    let timer = 0;
    let shatterBurstDone = false;

    return {
      step(dt) {
        timer -= dt;
        if (timer <= 0) {
          timer = 0.03;
          rays = archNodes.map(([nx, ny]) => buildLightningChain(rng, nx, ny, 0, -34, 0.11, 3));
          archLinks = [];
          for (let k = 0; k < archNodes.length - 1; k++) {
            archLinks.push(
              buildLightningChain(
                rng,
                archNodes[k][0],
                archNodes[k][1],
                archNodes[k + 1][0],
                archNodes[k + 1][1],
                0.09,
                2
              )
            );
          }
        }
        if (rng.chance(0.75)) {
          motes.emit(
            rng.chance(0.6) ? 'glint' : 'spark',
            rng.between(-68, 68),
            rng.between(-82, 4),
            rng.between(-38, 38),
            rng.between(-16, 48),
            rng.between(0.22, 0.44),
            rng.chance(0.35) ? auroraRamp[5] : ramp[rng.intBetween(5, 7)],
            1.1,
            22
          );
        }
        motes.step(dt);
      },
      renderBack(pen, t) {
        const p = clamp01(t / 1.52);
        const fade = p < 0.12 ? p / 0.12 : p > 0.78 ? 1 - (p - 0.78) / 0.22 : 1;

        for (let rIdx = 0; rIdx < 2; rIdx++) {
          const rx = (54 + rIdx * 16) * Easing.outCubic(Math.min(1, p * 2.5));
          drawTiltedOrbitBand(
            pen,
            0,
            2,
            rx,
            0.22,
            2.4 - rIdx * 0.4,
            fade * 0.9,
            [ramp[1], ramp[3], ramp[5], ramp[7]],
            (th) => Math.sin(th) < 0,
            t >= 0.94 && t <= 1.08
          );
        }
      },
      renderFront(pen, t) {
        const p = clamp01(t / 1.52);
        const fade = p < 0.12 ? p / 0.12 : p > 0.78 ? 1 - (p - 0.78) / 0.22 : 1;

        for (let rIdx = 0; rIdx < 2; rIdx++) {
          const rx = (54 + rIdx * 16) * Easing.outCubic(Math.min(1, p * 2.5));
          drawTiltedOrbitBand(
            pen,
            0,
            2,
            rx,
            0.22,
            2.6 - rIdx * 0.4,
            fade,
            [ramp[2], ramp[4], ramp[6], ramp[7]],
            (th) => Math.sin(th) >= 0,
            t >= 0.94 && t <= 1.08
          );
        }

        // Phase 1 (`0.08s..1.02s`): 7 Arch Prism Nodes Linked by Aurora Lightning + Converging Rays
        if (t >= 0.08 && t <= 1.02) {
          const rFade = t < 0.92 ? Math.min(1, (t - 0.08) / 0.18) : 1 - (t - 0.92) / 0.1;
          for (let k = 0; k < archLinks.length; k++) {
            pen.polyline(archLinks[k], auroraRamp[5], 1, 0.26 * rFade, ramp[5]);
          }
          for (let k = 0; k < archNodes.length; k++) {
            const [nx, ny] = archNodes[k];
            pen.polyline(rays[k], k % 2 === 0 ? ramp[6] : auroraRamp[6], 1, 0.32 * rFade, ramp[5]);
            drawStarburstFlare(pen, nx, ny, 6.0 * rFade + 1.5, rFade, ramp);
          }
          drawStarburstFlare(pen, 0, -34, 10 * rFade + 2, rFade, ramp);
        }

        // Phase 2 (`0.96s..1.52s`): Absolute-Zero Diamond Shatter Supernova!
        if (t >= 0.96) {
          if (!shatterBurstDone) {
            shatterBurstDone = true;
            for (let i = 0; i < 28; i++) {
              const a = (i / 28) * Math.PI * 2 + rng.between(-0.08, 0.08);
              const spd = rng.between(68, 185);
              motes.emit(
                i % 2 === 0 ? 'spark' : 'glint',
                0,
                -34,
                Math.cos(a) * spd,
                Math.sin(a) * spd,
                rng.between(0.24, 0.48),
                ramp[i % 3 === 0 ? 7 : 5],
                1.2,
                35
              );
            }
          }
          const sp = clamp01((t - 0.96) / 0.56);
          const sFade = 1 - Easing.inQuad(sp);
          const shockR = 14 + Easing.outExpo(sp) * 66;

          drawTiltedOrbitBand(
            pen,
            0,
            -34,
            shockR,
            0.52,
            2.8 * sFade + 0.6,
            sFade,
            [ramp[2], ramp[4], ramp[6], ramp[7]],
            null,
            sp < 0.22
          );
          drawTiltedOrbitBand(
            pen,
            0,
            -34,
            shockR * 0.62,
            0.78,
            2.2 * sFade + 0.5,
            sFade * 0.9,
            [auroraRamp[3], auroraRamp[5], ramp[6], ramp[7]],
            null,
            sp < 0.18
          );

          for (let k = 0; k < 12; k++) {
            const ang = (k / 12) * Math.PI * 2 + sp * 0.25;
            const r0 = shockR * 0.24;
            const r1 = shockR * (0.85 + (k % 2) * 0.22);
            const ex = Math.cos(ang) * r1;
            const ey = -34 + Math.sin(ang) * r1 * 0.72;
            pen.line(
              Math.cos(ang) * r0,
              -34 + Math.sin(ang) * r0 * 0.72,
              ex,
              ey,
              k % 2 === 0 ? PURE_WHITE : ramp[6],
              1
            );
            if (k % 2 === 0 && sFade > 0.25) {
              drawPixelSnowflakeStar(pen, ex, ey, 2.8, ramp[5], ramp[7], sFade);
            }
          }
          drawStarburstFlare(pen, 0, -34, 15 * sFade + 2.5, sFade, ramp);
        }

        motes.render(pen);
      }
    };
  }
};

/**
 * 7. `absoluteZeroShatterBurst`
 * 4-Stack Brittle-Frost Detonation & Impact Burst (`onProjectileHit` / `spawnPixelFrostRing`).
 */
const absoluteZeroShatterBurst = {
  duration: 0.4,
  loop: false,
  defaults: { palette: GLACIAL_RAMP, isLarge: false },
  create(cfg) {
    const ramp = buildColorRamp(cfg.palette, 8);
    const rng = new DeterministicRng(cfg.seed || 769);
    const motes = new MotePool({ rng, sparkRamp: [ramp[7], ramp[6], ramp[5], ramp[3]] });
    const scale = cfg.isLarge ? 1.25 : 0.92;
    let spawned = false;

    return {
      step(dt) {
        if (!spawned) {
          spawned = true;
          const cnt = cfg.isLarge ? 18 : 12;
          for (let i = 0; i < cnt; i++) {
            const a = (i / cnt) * Math.PI * 2 + rng.between(-0.12, 0.12);
            const spd = rng.between(48, 138) * scale;
            motes.emit(
              i % 3 === 0 ? 'glint' : 'spark',
              0,
              0,
              Math.cos(a) * spd,
              Math.sin(a) * spd,
              rng.between(0.16, 0.34),
              ramp[i % 2 === 0 ? 6 : 5],
              1,
              40
            );
          }
        }
        motes.step(dt);
      },
      renderFront(pen, t) {
        const p = clamp01(t / 0.4);
        const fade = 1 - Easing.inQuad(p);
        const rad = (7 + Easing.outExpo(p) * 24) * scale;

        drawTiltedOrbitBand(
          pen,
          0,
          0,
          rad,
          0.62,
          2.2 * fade + 0.5,
          fade,
          [ramp[2], ramp[4], ramp[6], ramp[7]],
          null,
          p < 0.16
        );

        for (let k = 0; k < 8; k++) {
          const ang = (k / 8) * Math.PI * 2 + 0.25;
          const r0 = rad * 0.28;
          const r1 = rad * (0.92 + (k % 2) * 0.22);
          const ex = Math.cos(ang) * r1;
          const ey = Math.sin(ang) * r1 * 0.78;
          pen.line(
            Math.cos(ang) * r0,
            Math.sin(ang) * r0 * 0.78,
            ex,
            ey,
            k % 2 === 0 ? PURE_WHITE : ramp[5],
            1
          );
          if (k % 2 === 0 && fade > 0.3) {
            drawPixelSnowflakeStar(pen, ex, ey, 2.2, ramp[5], ramp[7], fade);
          }
        }
        drawStarburstFlare(pen, 0, 0, 9 * scale * fade + 1.5, fade, ramp);
        motes.render(pen);
      }
    };
  }
};

export const GLACIAL_EFFECT_REGISTRY = {
  cryoScepterFocus,
  cryoPrismMachCone,
  refractedBorealisBeam,
  permafrostSnowflakeSigil,
  glacialSkateRibbon,
  borealisCathedralDomain,
  absoluteZeroShatterBurst
};

export const GLACIAL_SHADER_PACK = GLACIAL_EFFECT_REGISTRY;
