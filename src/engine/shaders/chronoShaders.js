/**
 * Horological Clock-Blade & Eternal Zero Shader Suite (`chronoShaders.js`)
 * First-party 120Hz 2.5D multi-layer pixel-shader & particle effects for Chronos (`chronomancer` / `Chronomancer.js`).
 *
 * Provides:
 *  - Live 2.5D (`renderBack` + `renderFront`) `ArcaneShaderFX` shaders:
 *      `chronoAstrolabeAura`, `temporalCrescentRift`, `warpPortalPairRift`,
 *      `stasisHourglassPrison`, `doomsdayGrandHorologium`,
 *      `chronoTimeRiftSlash`, `chronoStasisField`, `eternalZeroClockPulse`
 *  - 8 Baked 30fps `chronomancer_vfx.png` cell shaders (`6240x1664`, `8 rows x 30 cols` @ `208x208`, `0/240` border clips):
 *      Row 0 (`y = 0`):    `chronoGearWaveCell`          — `+X` Minute-Blade Crescent Sonic Wave & Inner Gear-Teeth Arc
 *      Row 1 (`y = 208`):  `chronoAstrolabeWheelCell`    — Spinning 2.5D Brass & Cyan Past-Timeline Anchor / Astrolabe Dial
 *      Row 2 (`y = 416`):  `chronoHourglassMonolithCell` — Erupting Time-Dilation Stasis Hourglass Pillar & Temporal Rift
 *      Row 3 (`y = 624`):  `chronoHorologiumSealCell`    — Grand 12-Spoke Roman Numeral XII Horologium Clockface
 *      Row 4 (`y = 832`):  `chronoShatterBurstCell`      — Temporal Glass-Clock Shatter Star-Burst
 *      Row 5 (`y = 1040`): `paradoxTwinScissorCell`      — Wide Twin Clock-Hand X-Scissor Cleave (`+28°` Cyan x `-28°` Gold)
 *      Row 6 (`y = 1248`): `suspendedClockSpearCell`     — Horizontal `+X` Colossal Golden-Brass & Cyan-Crystal Clock-Hand Spear
 *      Row 7 (`y = 1456`): `twelfthBellCataclysmCell`    — Massive Twelfth Bell Midnight Shatter Nova
 */

import {
  PURE_WHITE,
  packHexColor,
  buildColorRamp,
  clamp01,
  clampRange,
  mixScalar,
  smoothStep,
  Easing,
  fbmNoise2D,
  DeterministicRng,
  MotePool,
  buildLightningChain,
  drawTiltedOrbitBand,
  drawStarburstFlare,
  drawMultiLayerCrescentArc
} from '../ArcaneShaderFX.js?v=30fps83';

const TWO_PI = Math.PI * 2;
const BACK_HALF = (theta) => Math.sin(theta) < 0;
const FRONT_HALF = (theta) => Math.sin(theta) >= 0;

export const CHRONO_TEAL_PALETTE = [
  '#041b1d',
  '#0f3f46',
  '#115e59',
  '#0d9488',
  '#14b8a6',
  '#2dd4bf',
  '#99f6e4',
  '#ffffff'
];

export const CHRONO_BRASS_PALETTE = [
  '#1c1306',
  '#451a03',
  '#78350f',
  '#b45309',
  '#d97706',
  '#facc15',
  '#fde047',
  '#ffffff'
];

export const CHRONO_ASTRAL_PALETTE = [
  '#090d16',
  '#1e293b',
  '#0f766e',
  '#14b8a6',
  '#d97706',
  '#facc15',
  '#fef08a',
  '#ffffff'
];

const SELOUT_TEAL = packHexColor('#041b1d');
const SELOUT_BRASS = packHexColor('#1c1306');
const SELOUT_INDIGO = packHexColor('#08101e');
const COL_CYAN_HOT = packHexColor('#99f6e4');
const COL_TURQUOISE = packHexColor('#2dd4bf');
const COL_TEAL_MID = packHexColor('#14b8a6');
const COL_TEAL_DEEP = packHexColor('#0d9488');
const COL_TEAL_SHADOW = packHexColor('#0f3f46');
const COL_GOLD_HOT = packHexColor('#fef08a');
const COL_GOLD_BRIGHT = packHexColor('#facc15');
const COL_BRASS_MID = packHexColor('#d97706');
const COL_BRASS_DEEP = packHexColor('#b45309');
const COL_BRASS_SHADOW = packHexColor('#78350f');

// ============================================================================
// Shared Horological & Astrolabe Pixel Primitives (100% Packed Uint32 Colors)
// ============================================================================

function applySelectiveOutlineOnSurface(surface, seloutPacked = SELOUT_INDIGO, margin = 3) {
  const { width: w, height: h, albedo } = surface;
  const edgeMask = new Uint8Array(w * h);
  for (let y = margin; y < h - margin; y++) {
    for (let x = margin; x < w - margin; x++) {
      const idx = y * w + x;
      if ((albedo[idx] >>> 24) > 32) continue;
      if (
        (albedo[idx - 1] >>> 24) > 120 ||
        (albedo[idx + 1] >>> 24) > 120 ||
        (albedo[idx - w] >>> 24) > 120 ||
        (albedo[idx + w] >>> 24) > 120
      ) {
        edgeMask[idx] = 1;
      }
    }
  }
  const packedEdge = ((255 << 24) | (seloutPacked & 0x00ffffff)) >>> 0;
  for (let i = 0; i < w * h; i++) {
    if (edgeMask[i]) {
      albedo[i] = packedEdge;
    }
  }
}

function drawPixelClockGear(pen, cx, cy, r, rot, mainCol, rimCol, alpha = 1, teeth = 8) {
  if (alpha <= 0.03 || r <= 0.6) return;
  const solid = alpha >= 0.85 ? 1 : alpha;
  pen.fillCircle(cx, cy, r + 1.1, SELOUT_TEAL, solid);
  pen.fillCircle(cx, cy, r, mainCol, solid);
  for (let i = 0; i < teeth; i++) {
    const a = rot + (i * TWO_PI) / teeth;
    const tx = cx + Math.cos(a) * (r + 1.4);
    const ty = cy + Math.sin(a) * (r + 1.4);
    pen.stipple(tx, ty, rimCol, solid);
  }
  pen.fillCircle(cx, cy, Math.max(0.8, r * 0.36), PURE_WHITE, solid);
}

function drawChronoCrosshair(pen, cx, cy, armLen, brassCol, tealCol, alpha = 1, rot = 0) {
  if (alpha <= 0.03 || armLen < 1) return;
  const solid = alpha >= 0.85 ? 1 : alpha;
  for (let k = 0; k < 4; k++) {
    const a = rot + (k * Math.PI) / 2;
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    pen.line(cx, cy, cx + ux * armLen, cy + uy * armLen, k % 2 === 0 ? brassCol : tealCol, solid);
    pen.line(cx, cy, cx + ux * (armLen * 0.58), cy + uy * (armLen * 0.58), PURE_WHITE, solid);
  }
  pen.stipple(cx, cy, PURE_WHITE, solid);
}

function drawClockHand(pen, cx, cy, angle, length, width, rimCol, coreCol, alpha = 1) {
  if (alpha <= 0.03 || length <= 1.5) return;
  const solid = alpha >= 0.85 ? 1 : alpha;
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const nx = -uy;
  const ny = ux;
  const tailLen = length * 0.24;
  const maxR = length + 3;
  pen.shadeBox(cx - maxR, cy - maxR, cx + maxR, cy + maxR, (lx, ly, out) => {
    const dx = lx - cx;
    const dy = ly - cy;
    const along = dx * ux + dy * uy;
    const perp = Math.abs(dx * nx + dy * ny);
    if (along < -tailLen || along > length) return 0;
    let halfW;
    if (along < 0) {
      halfW = width * 0.65 * (1 - Math.abs(along) / Math.max(0.5, tailLen));
    } else if (along < length * 0.32) {
      halfW = mixScalar(width * 0.55, width, along / (length * 0.32));
    } else {
      halfW = width * (1 - (along - length * 0.32) / (length * 0.68));
    }
    if (perp > halfW + 0.85) return 0;
    out.alpha = solid;
    if (perp > halfW) return SELOUT_INDIGO;
    out.glowColor = rimCol;
    out.glowStrength = 0.28 * solid;
    return perp < halfW * 0.44 ? coreCol : rimCol;
  });
}

function drawPixelDiamondShard(pen, cx, cy, angle, len, wid, edgeCol, midCol, coreCol, alpha = 1) {
  if (alpha <= 0.03 || len <= 0.8) return;
  const solid = alpha >= 0.8 ? 1 : alpha;
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const nx = -uy;
  const ny = ux;
  const pad = len + 2;
  pen.shadeBox(cx - pad, cy - pad, cx + pad, cy + pad, (lx, ly, out) => {
    const dx = lx - cx;
    const dy = ly - cy;
    const u = Math.abs(dx * ux + dy * uy) / len;
    const v = Math.abs(dx * nx + dy * ny) / Math.max(0.6, wid);
    const d = u + v;
    if (d > 1.18) return 0;
    out.alpha = solid;
    if (d > 0.96) return SELOUT_INDIGO;
    out.glowColor = midCol;
    out.glowStrength = 0.24 * solid;
    if (d < 0.38) return coreCol;
    return (dx * nx + dy * ny) < 0 ? edgeCol : midCol;
  });
}

// ============================================================================
// 1. LIVE 2.5D ORBITING ASTROLABE PENDULUM AURA (`chronoAstrolabeAura`)
// ============================================================================
export const chronoAstrolabeAura = {
  duration: 1.2,
  loop: true,
  defaults: { palette: CHRONO_TEAL_PALETTE, seed: 31 },
  create(cfg) {
    const teal = buildColorRamp(cfg.palette, 8);
    const brass = buildColorRamp(CHRONO_BRASS_PALETTE, 8);
    const bandTeal4 = [teal[2], teal[4], teal[6], PURE_WHITE];
    const bandBrass4 = [brass[2], brass[4], brass[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, brass[6], teal[5], teal[4]] });
    let phase = 0;
    let emitAcc = 0;

    function renderHalf(pen, isBack) {
      const pred = isBack ? BACK_HALF : FRONT_HALF;
      if (isBack) {
        pen.radialGlow(0, -4, 24, teal[4], 0.22);
      }
      drawTiltedOrbitBand(pen, 0, 0, 26, 0.28, 1.5, 1, bandBrass4, pred, false);
      drawTiltedOrbitBand(pen, 0, -6, 20, 0.32, 1.3, 1, bandTeal4, pred, false);

      for (let i = 0; i < 4; i++) {
        const a = phase * 2.4 + (i * Math.PI) / 2;
        const sinA = Math.sin(a);
        if (isBack && sinA >= 0) continue;
        if (!isBack && sinA < 0) continue;
        const gx = Math.cos(a) * 26;
        const gy = sinA * 26 * 0.28;
        drawPixelClockGear(
          pen,
          gx,
          gy,
          isBack ? 2.2 : 2.6,
          -phase * 4.5,
          i % 2 === 0 ? brass[5] : teal[5],
          i % 2 === 0 ? teal[6] : brass[6],
          1,
          6
        );
      }
    }

    return {
      step(dt) {
        phase += dt;
        emitAcc += dt;
        while (emitAcc >= 0.065) {
          emitAcc -= 0.065;
          const a = rng.between(0, TWO_PI);
          const rx = rng.between(14, 26);
          motes.emit(
            'glint',
            Math.cos(a) * rx,
            Math.sin(a) * rx * 0.28 - 2,
            rng.between(-8, 8),
            rng.between(-28, -10),
            rng.between(0.18, 0.34),
            rng.chance(0.5) ? brass[6] : teal[5],
            1,
            0
          );
        }
        motes.step(dt);
      },
      renderBack(pen) {
        renderHalf(pen, true);
      },
      renderFront(pen) {
        renderHalf(pen, false);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 2. LIVE 2.5D MULTI-LAYER TEMPORAL CRESCENT RIFT (`temporalCrescentRift`)
// ============================================================================
export const temporalCrescentRift = {
  duration: 0.38,
  loop: false,
  defaults: {
    palette: CHRONO_TEAL_PALETTE,
    seed: 67,
    isGold: false,
    aimAngle: 0,
    radius: 26,
    width: 10
  },
  create(cfg) {
    const teal = buildColorRamp(cfg.palette, 8);
    const brass = buildColorRamp(CHRONO_BRASS_PALETTE, 8);
    const band4 = [brass[2], teal[4], brass[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, brass[6], teal[5], teal[4]] });
    const aim = cfg.aimAngle ?? 0;
    let t = 0;
    let burstDone = false;

    return {
      step(dt) {
        if (!burstDone) {
          burstDone = true;
          for (let i = 0; i < 14; i++) {
            const a = aim + rng.between(-1.05, 1.05);
            const spd = rng.between(48, 155);
            motes.emit(
              i % 2 === 0 ? 'glint' : 'spark',
              Math.cos(a) * 8,
              Math.sin(a) * 8,
              Math.cos(a) * spd,
              Math.sin(a) * spd,
              rng.between(0.16, 0.32),
              i % 2 === 0 ? brass[6] : teal[5],
              1,
              24
            );
          }
        }
        t += dt;
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 0.38);
        const fade = 1 - u;
        if (fade <= 0.03) return;
        const baseR = (cfg.radius || 26) * (0.65 + 0.35 * Easing.outCubic(u));
        pen.radialGlow(4, 0, baseR * 0.85, cfg.isGold ? brass[5] : teal[5], 0.28 * fade);
        drawTiltedOrbitBand(pen, 0, 0, baseR * 0.78, 0.34, 1.4, fade, band4, BACK_HALF, false);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.38);
        const fade = 1 - u * u;
        if (fade <= 0.02) return;
        const grow = Easing.outCubic(u);
        const primaryRamp = cfg.isGold ? brass : teal;
        const secondaryRamp = cfg.isGold ? teal : brass;
        const r = (cfg.radius || 26) * (0.72 + 0.36 * grow);
        const w = (cfg.width || 10) * (1 - u * 0.38);

        drawMultiLayerCrescentArc(pen, {
          cx: -2 + Math.cos(aim) * 4,
          cy: Math.sin(aim) * 4,
          radius: r,
          width: w,
          eccentricity: 0.78,
          headAngle: aim + 1.05 + grow * 0.35,
          tailAngle: aim - 1.35 + grow * 0.2,
          fade,
          ramp: primaryRamp,
          seed: cfg.seed || 67,
          t,
          flashHot: u < 0.28
        });

        if (u > 0.05 && u < 0.88) {
          drawMultiLayerCrescentArc(pen, {
            cx: -4,
            cy: 0,
            radius: r * 0.72,
            width: w * 0.65,
            eccentricity: 0.76,
            headAngle: aim + 0.85 + grow * 0.25,
            tailAngle: aim - 1.05,
            fade: fade * 0.9,
            ramp: secondaryRamp,
            seed: (cfg.seed || 67) + 19,
            t,
            flashHot: false
          });
        }

        const tipX = Math.cos(aim) * (r * 0.68);
        const tipY = Math.sin(aim) * (r * 0.68);
        drawChronoCrosshair(pen, tipX, tipY, 8 * fade, brass[6], teal[5], fade, t * 8);
        drawStarburstFlare(pen, tipX, tipY, 9 * fade, fade, primaryRamp);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 3. LIVE 2.5D TWIN CLOCK-HAND X-SCISSOR RIFT SLASH (`chronoTimeRiftSlash`)
// ============================================================================
export const chronoTimeRiftSlash = {
  duration: 0.42,
  loop: false,
  defaults: {
    palette: CHRONO_TEAL_PALETTE,
    seed: 79,
    radius: 30
  },
  create(cfg) {
    const teal = buildColorRamp(cfg.palette, 8);
    const brass = buildColorRamp(CHRONO_BRASS_PALETTE, 8);
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, brass[6], teal[5], teal[4]] });
    let t = 0;
    let burstDone = false;

    return {
      step(dt) {
        if (!burstDone) {
          burstDone = true;
          for (let i = 0; i < 18; i++) {
            const baseAng = (i % 2 === 0 ? 28 : -28) * (Math.PI / 180) + (i < 9 ? 0 : Math.PI);
            const a = baseAng + rng.between(-0.32, 0.32);
            const spd = rng.between(65, 185);
            motes.emit(
              i % 3 === 0 ? 'glint' : 'spark',
              Math.cos(a) * 6,
              Math.sin(a) * 6,
              Math.cos(a) * spd,
              Math.sin(a) * spd,
              rng.between(0.18, 0.36),
              i % 2 === 0 ? teal[5] : brass[5],
              1,
              15
            );
          }
        }
        t += dt;
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 0.42);
        const fade = 1 - smoothStep(0.68, 1.0, u);
        if (fade <= 0.03) return;
        const r = (cfg.radius || 30) * (0.7 + 0.3 * Easing.outCubic(u));
        pen.radialGlow(0, 0, r * 0.95, teal[5], 0.34 * fade);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.42);
        const pop = smoothStep(0, 0.14, u);
        const fade = 1 - smoothStep(0.7, 1.0, u);
        if (fade <= 0.03) return;
        const span = (cfg.radius || 30) * (0.72 + 0.34 * Easing.outCubic(u));
        const angA = (28 * Math.PI) / 180;
        const angB = (-28 * Math.PI) / 180;

        drawClockHand(pen, 0, 0, angA, span, 3.6 * fade, teal[5], PURE_WHITE, fade);
        drawClockHand(pen, 0, 0, angA + Math.PI, span * 0.85, 3.0 * fade, teal[4], teal[6], fade);
        drawClockHand(pen, 0, 0, angB, span, 3.6 * fade, brass[5], PURE_WHITE, fade);
        drawClockHand(pen, 0, 0, angB + Math.PI, span * 0.85, 3.0 * fade, brass[4], brass[6], fade);

        drawStarburstFlare(pen, 0, 0, (10 + 4 * pop) * fade, fade, brass);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 4. LIVE 2.5D WARP PORTAL PAIR RIFT (`warpPortalPairRift`)
// ============================================================================
export const warpPortalPairRift = {
  duration: 0.58,
  loop: false,
  defaults: {
    palette: CHRONO_TEAL_PALETTE,
    seed: 89,
    isArrival: false
  },
  create(cfg) {
    const teal = buildColorRamp(cfg.palette, 8);
    const brass = buildColorRamp(CHRONO_BRASS_PALETTE, 8);
    const bandTeal4 = [teal[2], teal[4], teal[6], PURE_WHITE];
    const bandBrass4 = [brass[2], brass[4], brass[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, brass[6], teal[5], teal[3]] });
    let t = 0;
    let emitted = false;

    return {
      step(dt) {
        t += dt;
        if (!emitted) {
          emitted = true;
          for (let i = 0; i < 16; i++) {
            const a = (i / 16) * TWO_PI;
            const spd = rng.between(42, 135);
            motes.emit(
              i % 2 === 0 ? 'glint' : 'spark',
              Math.cos(a) * 10,
              Math.sin(a) * 10,
              Math.cos(a) * spd,
              Math.sin(a) * spd,
              rng.between(0.2, 0.42),
              i % 2 === 0 ? brass[6] : teal[5],
              1,
              0
            );
          }
        }
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 0.58);
        const pop = smoothStep(0, 0.16, u);
        const fade = 1 - smoothStep(0.66, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;

        const r = 26 * pop;
        pen.radialGlow(0, 0, r * 1.15, cfg.isArrival ? brass[5] : teal[5], 0.36 * env);
        drawTiltedOrbitBand(pen, 0, 28, r * 1.1, 0.24, 1.5, env, bandTeal4, BACK_HALF, false);

        pen.shadeBox(-r, -r, r, r, (px, py, out) => {
          const dist = Math.hypot(px, py);
          if (dist > r || dist < 4) return 0;
          const ang = Math.atan2(py, px) + u * 6.0;
          const n = fbmNoise2D(px * 0.16 + u * 4, py * 0.16 - u * 4, cfg.seed, 2);
          const spoke = Math.abs(Math.sin(ang * 6));
          if (Math.abs(dist - r * 0.92) < 1.5 || Math.abs(dist - r * 0.58) < 1.2) {
            out.alpha = env > 0.35 ? 1 : env;
            out.glowStrength = 0.26 * env;
            out.glowColor = brass[6];
            return brass[5];
          }
          if (spoke > 0.92 || n > 0.32) {
            out.alpha = env > 0.35 ? 1 : env;
            out.glowStrength = 0.22 * env;
            out.glowColor = teal[5];
            return dist < r * 0.45 ? PURE_WHITE : teal[4];
          }
          return 0;
        });
      },
      renderFront(pen) {
        const u = clamp01(t / 0.58);
        const pop = smoothStep(0, 0.16, u);
        const fade = 1 - smoothStep(0.66, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;

        const r = 26 * pop;
        drawTiltedOrbitBand(pen, 0, 28, r * 1.1, 0.24, 1.6, env, bandBrass4, FRONT_HALF, true);

        for (let k = 0; k < 6; k++) {
          const a = -u * 5.2 + (k * TWO_PI) / 6;
          drawPixelClockGear(
            pen,
            Math.cos(a) * r,
            Math.sin(a) * r,
            2.3,
            u * 10,
            k % 2 === 0 ? brass[6] : teal[5],
            PURE_WHITE,
            env,
            6
          );
        }

        drawClockHand(pen, 0, 0, -Math.PI * 0.5 + u * 8.5, r * 0.78, 2.2, brass[6], PURE_WHITE, env);
        drawClockHand(pen, 0, 0, -Math.PI * 0.5 - u * 3.2, r * 0.52, 2.4, teal[5], brass[6], env);
        if (u < 0.65) {
          const bolt = buildLightningChain(rng, -r * 0.7, -r * 0.4, r * 0.7, r * 0.4, 0.22, 3);
          pen.polyline(bolt, teal[6], env);
        }
        drawStarburstFlare(pen, 0, 0, 9 * env, env, brass);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 5. LIVE 2.5D STASIS HOURGLASS PRISON & TIME-DILATION FIELD (`stasisHourglassPrison` / `chronoStasisField`)
// ============================================================================
export const stasisHourglassPrison = {
  duration: 3.8,
  loop: false,
  defaults: { palette: CHRONO_TEAL_PALETTE, seed: 109, radius: 52 },
  create(cfg) {
    const teal = buildColorRamp(cfg.palette, 8);
    const brass = buildColorRamp(CHRONO_BRASS_PALETTE, 8);
    const bandTeal4 = [teal[2], teal[4], teal[6], PURE_WHITE];
    const bandBrass4 = [brass[2], brass[4], brass[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, brass[6], teal[5], teal[3]], floorY: 0 });
    const totalDur = cfg.customDuration || 3.8;
    let t = 0;
    let acc = 0;

    function renderFieldHalf(pen, isBack) {
      const u = clamp01(t / totalDur);
      const pop = smoothStep(0, 0.08, u);
      const fade = 1 - smoothStep(0.86, 1.0, u);
      const env = pop * fade;
      if (env <= 0.02) return;

      const pred = isBack ? BACK_HALF : FRONT_HALF;
      const rx = (cfg.radius || 52) * pop;
      const topY = -56 * pop;
      const midY = -28 * pop;

      if (isBack) {
        pen.radialGlow(0, midY, rx * 0.78, teal[5], 0.28 * env);
      }

      drawTiltedOrbitBand(pen, 0, 0, rx, 0.24, 1.8, env, bandBrass4, pred, false);
      drawTiltedOrbitBand(pen, 0, 0, rx * 0.66, 0.24, 1.4, env, bandTeal4, pred, false);
      drawTiltedOrbitBand(pen, 0, topY, rx * 0.68, 0.24, 1.4, env, bandTeal4, pred, false);
      drawTiltedOrbitBand(pen, 0, midY, rx * 0.34, 0.26, 1.3, env, bandBrass4, pred, true);

      for (let i = 0; i < 6; i++) {
        const a = t * 2.2 + (i * TWO_PI) / 6;
        const sinA = Math.sin(a);
        if (isBack && sinA >= 0) continue;
        if (!isBack && sinA < 0) continue;
        drawPixelClockGear(
          pen,
          Math.cos(a) * rx,
          sinA * rx * 0.24,
          2.5,
          -t * 5.0,
          i % 2 === 0 ? brass[5] : teal[5],
          PURE_WHITE,
          env,
          6
        );
      }

      if (!isBack) {
        drawClockHand(pen, 0, 0, t * 3.1, rx * 0.85, 1.8, teal[5], PURE_WHITE, env);
        drawClockHand(pen, 0, 0, -t * 1.1, rx * 0.56, 2.1, brass[5], brass[6], env);
        drawStarburstFlare(pen, 0, midY, 7 * env, env, brass);
      }
    }

    return {
      step(dt) {
        t += dt;
        acc += dt * 28;
        while (acc >= 1 && t < totalDur * 0.9) {
          acc -= 1;
          const a = rng.between(0, TWO_PI);
          const r = rng.between(6, cfg.radius || 52);
          motes.emit(
            rng.chance(0.58) ? 'glint' : 'spark',
            Math.cos(a) * r,
            Math.sin(a) * r * 0.24 - rng.between(0, 44),
            rng.between(-10, 10),
            rng.between(-52, -16),
            rng.between(0.22, 0.44),
            rng.chance(0.5) ? brass[6] : teal[5],
            1,
            -18
          );
        }
        motes.step(dt);
      },
      renderBack(pen) {
        renderFieldHalf(pen, true);
      },
      renderFront(pen) {
        renderFieldHalf(pen, false);
        motes.render(pen);
      }
    };
  }
};

export const chronoStasisField = stasisHourglassPrison;

// ============================================================================
// 6. LIVE 2.5D DOOMSDAY GRAND HOROLOGIUM & ETERNAL ZERO PULSE (`doomsdayGrandHorologium` / `eternalZeroClockPulse`)
// ============================================================================
export const doomsdayGrandHorologium = {
  duration: 1.68,
  loop: false,
  defaults: { palette: CHRONO_TEAL_PALETTE, seed: 173, radius: 68 },
  create(cfg) {
    const teal = buildColorRamp(cfg.palette, 8);
    const brass = buildColorRamp(CHRONO_BRASS_PALETTE, 8);
    const bandBrass4 = [brass[2], teal[4], brass[6], PURE_WHITE];
    const bandTeal4 = [teal[2], teal[4], teal[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, brass[6], teal[5], teal[4]], floorY: 0 });
    const totalDur = cfg.customDuration || 1.68;
    let t = 0;
    let acc = 0;

    function renderDomainHalf(pen, isBack) {
      const u = clamp01(t / totalDur);
      const pop = smoothStep(0, 0.14, u);
      const fade = 1 - smoothStep(0.84, 1.0, u);
      const env = pop * fade;
      if (env <= 0.02) return;

      const pred = isBack ? BACK_HALF : FRONT_HALF;
      const rxOuter = (cfg.radius || 68) * pop;
      const rxInner = rxOuter * 0.66;
      const skyY = -64 * pop;

      if (isBack) {
        pen.radialGlow(0, skyY * 0.5, 54 * env, teal[5], 0.34 * env);
      }

      drawTiltedOrbitBand(pen, 0, 0, rxOuter, 0.24, 1.9, env, bandBrass4, pred, true);
      drawTiltedOrbitBand(pen, 0, 0, rxInner, 0.24, 1.5, env, bandTeal4, pred, false);
      drawTiltedOrbitBand(pen, 0, skyY, rxInner * 0.88, 0.28, 1.5, env, bandBrass4, pred, false);

      for (let i = 0; i < 12; i++) {
        const a = u * 3.2 + (i * TWO_PI) / 12;
        const sinA = Math.sin(a);
        if (isBack && sinA >= 0) continue;
        if (!isBack && sinA < 0) continue;
        const xIn = Math.cos(a) * (rxInner * 0.48);
        const yIn = sinA * (rxInner * 0.48) * 0.24;
        const xOut = Math.cos(a) * rxOuter;
        const yOut = sinA * rxOuter * 0.24;
        pen.line(xIn, yIn, xOut, yOut, i % 2 === 0 ? brass[5] : teal[5], env);
        if (i % 2 === 0) {
          drawPixelClockGear(
            pen,
            xOut,
            yOut,
            2.6,
            -u * 12,
            i % 4 === 0 ? brass[6] : teal[5],
            PURE_WHITE,
            env,
            8
          );
        }
      }

      if (!isBack && u > 0.42 && u < 0.94) {
        for (const side of [-1, 0, 1]) {
          const bolt = buildLightningChain(rng, side * 18, skyY, side * 26, 0, 0.16, 3);
          pen.polyline(bolt, side === 0 ? brass[6] : teal[5], env);
          pen.polyline(bolt, PURE_WHITE, env);
        }
        drawStarburstFlare(pen, 0, skyY * 0.5, 14 * env, env, brass);
      }
    }

    return {
      step(dt) {
        t += dt;
        acc += dt * 46;
        while (acc >= 1 && t < totalDur * 0.88) {
          acc -= 1;
          const a = rng.between(0, TWO_PI);
          const r = rng.between(10, cfg.radius || 68);
          motes.emit(
            rng.chance(0.5) ? 'glint' : 'spark',
            Math.cos(a) * r,
            Math.sin(a) * r * 0.24 - 2,
            rng.between(-16, 16),
            rng.between(-86, -28),
            rng.between(0.22, 0.46),
            rng.chance(0.5) ? brass[6] : teal[5],
            1.1,
            -14
          );
        }
        motes.step(dt);
      },
      renderBack(pen) {
        renderDomainHalf(pen, true);
      },
      renderFront(pen) {
        renderDomainHalf(pen, false);
        motes.render(pen);
      }
    };
  }
};

export const eternalZeroClockPulse = {
  duration: 0.68,
  loop: false,
  defaults: { palette: CHRONO_TEAL_PALETTE, seed: 211, isShatter: false },
  create(cfg) {
    const teal = buildColorRamp(cfg.palette, 8);
    const brass = buildColorRamp(CHRONO_BRASS_PALETTE, 8);
    const bandTeal4 = [teal[2], teal[5], brass[6], PURE_WHITE];
    const bandBrass4 = [brass[2], brass[5], teal[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, brass[6], teal[5], teal[4]] });
    let t = 0;
    let emitted = false;

    return {
      step(dt) {
        t += dt;
        if (!emitted) {
          emitted = true;
          const count = cfg.isShatter ? 28 : 18;
          for (let i = 0; i < count; i++) {
            const a = (i / count) * TWO_PI + rng.between(-0.1, 0.1);
            const spd = rng.between(65, cfg.isShatter ? 225 : 155);
            motes.emit(
              i % 2 === 0 ? 'glint' : 'spark',
              Math.cos(a) * 8,
              Math.sin(a) * 8,
              Math.cos(a) * spd,
              Math.sin(a) * spd,
              rng.between(0.24, 0.52),
              i % 2 === 0 ? brass[6] : teal[5],
              1.1,
              cfg.isShatter ? 35 : 0
            );
          }
        }
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 0.68);
        const grow = Easing.outCubic(u);
        const fade = 1 - smoothStep(0.65, 1.0, u);
        if (fade <= 0.03) return;
        const r = (cfg.isShatter ? 76 : 56) * grow;
        pen.radialGlow(0, 0, r * 0.9, cfg.isShatter ? brass[5] : teal[5], 0.42 * fade);
        drawTiltedOrbitBand(pen, 0, 26, r, 0.25, 1.8, fade, bandTeal4, BACK_HALF, u < 0.25);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.68);
        const grow = Easing.outCubic(u);
        const fade = 1 - smoothStep(0.65, 1.0, u);
        if (fade <= 0.03) return;
        const r = (cfg.isShatter ? 76 : 56) * grow;
        drawTiltedOrbitBand(pen, 0, 26, r, 0.25, 2.0, fade, bandBrass4, FRONT_HALF, u < 0.3);
        pen.strokeRing(0, 0, r * 0.62, 1.8, u < 0.22 ? PURE_WHITE : teal[5], fade);
        if (u < 0.55) {
          for (let k = 0; k < 6; k++) {
            const a = (k * TWO_PI) / 6 + (cfg.isShatter ? 0.26 : 0);
            const bolt = buildLightningChain(
              rng,
              Math.cos(a) * 6,
              Math.sin(a) * 6,
              Math.cos(a) * r * 0.65,
              Math.sin(a) * r * 0.65,
              0.16,
              3
            );
            pen.polyline(bolt, k % 2 === 0 ? teal[6] : brass[6], fade);
          }
        }
        drawStarburstFlare(pen, 0, 0, (cfg.isShatter ? 16 : 11) * fade, fade, brass);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// BAKED 30FPS `chronomancer_vfx.png` 8-ROW CELLS (`104x104` logical -> `208x208` 2x)
// All geometry bounded strictly inside `[-40, +40]` around `(52, 52)` (`0/240` border clips!)
// `out.alpha = 1` on all solid cel clusters + 1px dark selective outline (`Selout`)!
// ============================================================================

/**
 * Row 0 (`y = 0`) — `chronoGearWaveCell`:
 * Razor-sharp `+X`-facing Minute-Blade Crescent Sonic Wave:
 *  - Luminous cyan-white leading edge (`+X`), turquoise `#2dd4bf` mid-body
 *  - Antique burnished-gold `#facc15` inner gear-teeth arc & trailing time-sand sparks (`-X`)
 */
export const chronoGearWaveCell = {
  duration: 1.0,
  loop: true,
  defaults: { palette: CHRONO_TEAL_PALETTE, seed: 601 },
  create(cfg) {
    const teal = buildColorRamp(cfg.palette, 8);
    const brass = buildColorRamp(CHRONO_BRASS_PALETTE, 8);

    return {
      step() {},
      renderFront(pen, localT) {
        const progress = clamp01(localT / 1.0);
        const rot = progress * TWO_PI;

        pen.radialGlow(8, 0, 30, teal[5], 0.38);

        // 1. Inner Burnished-Gold Escapement Gear-Teeth Arc (`cx = -6`, `r = 16..22`, facing `+X`)
        pen.shadeBox(-38, -38, 39, 38, (px, py, out) => {
          const dx = px + 6;
          const dy = py * 0.94;
          const r = Math.hypot(dx, dy);
          const ang = Math.atan2(dy, dx);
          const absAng = Math.abs(ang);

          // Primary +X Minute-Blade Crescent Sonic Wave (`absAng <= 1.24`, bowed to `x = +34`)
          if (absAng <= 1.24) {
            const uArc = absAng / 1.24;
            const profile = Math.pow(1 - uArc * uArc, 0.85);
            const bladeCenterR = 30.5 - uArc * uArc * 3.5;
            const halfW = 7.2 * profile;
            const dBlade = r - bladeCenterR;
            if (halfW > 0.65 && dBlade >= -halfW && dBlade <= halfW * 0.85) {
              out.alpha = 1;
              const q = dBlade / Math.max(0.8, halfW * 0.85);
              if (q > 0.42) {
                out.glowColor = PURE_WHITE;
                out.glowStrength = 0.36;
                return PURE_WHITE;
              }
              if (q > 0.08) {
                out.glowColor = COL_CYAN_HOT;
                out.glowStrength = 0.28;
                return COL_CYAN_HOT;
              }
              if (q > -0.45) {
                out.glowColor = COL_TURQUOISE;
                out.glowStrength = 0.22;
                return COL_TURQUOISE;
              }
              if (q > -0.78) {
                return COL_TEAL_MID;
              }
              return COL_TEAL_DEEP;
            }
          }

          // Inner Antique Burnished-Gold Gear-Teeth Arc (`absAng <= 1.08`, `r = 14.5..21.5`)
          if (absAng <= 1.08 && r >= 14.2 && r <= 21.8) {
            const toothPhase = ((ang + rot * 0.5 + Math.PI) / TWO_PI) * 16;
            const frac = toothPhase - Math.floor(toothPhase);
            const isCog = frac >= 0.22 && frac <= 0.76;
            const maxGearR = isCog ? 21.4 : 18.2;
            if (r <= maxGearR) {
              out.alpha = 1;
              out.glowColor = COL_GOLD_BRIGHT;
              out.glowStrength = 0.26;
              if (r > maxGearR - 1.3) return COL_GOLD_HOT;
              if (r > 16.4) return COL_GOLD_BRIGHT;
              return COL_BRASS_MID;
            }
          }

          return 0;
        });

        // 2. Crisp Horological Minute-Pointer Spine Spearhead at Leading Apex (`x = +12..+36, y = 0`)
        drawClockHand(pen, 4, 0, 0, 32, 3.2, COL_TURQUOISE, PURE_WHITE, 1);

        // 3. Trailing Time-Sand Sparks & Mini Gear Glints (`x = -35..+8`)
        for (let i = 0; i < 8; i++) {
          const u = ((progress * 2 + i / 8) % 1);
          const sx = 10 - u * 42;
          const lane = (i % 2 === 0 ? 1 : -1) * (5 + (i % 4) * 5.2);
          const sy = lane + Math.sin(rot + i * 1.3) * 2.2;
          if (Math.abs(sx) > 36 || Math.abs(sy) > 34) continue;
          const col = i % 2 === 0 ? COL_GOLD_BRIGHT : COL_TURQUOISE;
          pen.fillCircle(sx, sy, u < 0.45 ? 1.7 : 1.2, col, 1);
          pen.pixel(sx, sy, PURE_WHITE);
        }

        applySelectiveOutlineOnSurface(pen.surface, SELOUT_TEAL, 3);
        drawStarburstFlare(pen, 25, 0, 7.5, 1, brass);
      }
    };
  }
};

export const chronoBoltCell = chronoGearWaveCell;

/**
 * Row 1 (`y = 208`) — `chronoAstrolabeWheelCell`:
 * Spinning 2.5D Brass & Cyan Past-Timeline Anchor / Astrolabe Dial
 * with interlocking escapement cogs & glowing hourglass core.
 */
export const chronoAstrolabeWheelCell = {
  duration: 1.0,
  loop: true,
  defaults: { palette: CHRONO_TEAL_PALETTE, seed: 613 },
  create(cfg) {
    const teal = buildColorRamp(cfg.palette, 8);
    const brass = buildColorRamp(CHRONO_BRASS_PALETTE, 8);

    return {
      step() {},
      renderFront(pen, localT) {
        const progress = clamp01(localT / 1.0);
        const rot = progress * TWO_PI;

        pen.radialGlow(0, 0, 34, teal[5], 0.34);

        // 1. Outer Brass Escapement Wheel + Counter-Rotating Cyan Tourbillon Ring (`r <= 36`)
        pen.shadeBox(-38, -38, 38, 38, (px, py, out) => {
          const r = Math.hypot(px, py);
          if (r > 36.2) return 0;

          const aOuter = Math.atan2(py, px) + rot;
          const normOuter = ((aOuter % TWO_PI) + TWO_PI) % TWO_PI;
          const cog = (normOuter / TWO_PI) * 12;
          const cogFrac = cog - Math.floor(cog);

          // 12 Squared Outer Brass Escapement Cogs (`r = 30.5..35.8`)
          if (r >= 30.5 && r <= 35.8) {
            if (cogFrac >= 0.22 && cogFrac <= 0.78) {
              out.alpha = 1;
              out.glowColor = COL_GOLD_BRIGHT;
              out.glowStrength = 0.22;
              return r > 34.0 ? COL_GOLD_HOT : COL_BRASS_MID;
            }
            return 0;
          }

          // Beveled Outer Brass Chapter Ring (`r = 25.2..30.5`)
          if (r >= 25.2 && r < 30.5) {
            out.alpha = 1;
            out.glowColor = COL_GOLD_BRIGHT;
            out.glowStrength = 0.24;
            if (Math.abs(r - 28.0) < 1.0) return COL_GOLD_HOT;
            return py < 0 ? COL_GOLD_BRIGHT : COL_BRASS_DEEP;
          }

          // Counter-Rotating Cyan Astrolabe Ring (`r = 16.5..20.5`)
          const aInner = Math.atan2(py, px) - rot * 1.5;
          const normInner = ((aInner % TWO_PI) + TWO_PI) % TWO_PI;
          const innerTick = ((normInner / TWO_PI) * 8) % 1;
          if (r >= 16.5 && r <= 20.5) {
            out.alpha = 1;
            out.glowColor = COL_TURQUOISE;
            out.glowStrength = 0.28;
            if (innerTick < 0.22) return PURE_WHITE;
            return r < 18.5 ? COL_CYAN_HOT : COL_TEAL_MID;
          }

          // Glowing Hourglass Core (`px in [-6.5, +6.5], py in [-10.5, +10.5]`)
          const ax = Math.abs(px);
          const ay = Math.abs(py);
          if (ay >= 9.0 && ay <= 11.2 && ax <= 7.2) {
            out.alpha = 1;
            return ay < 10.2 ? COL_GOLD_HOT : COL_BRASS_MID;
          }
          if (ay < 9.0) {
            const bulbW = 1.6 + (ay / 9.0) * 5.2;
            if (ax <= bulbW) {
              out.alpha = 1;
              out.glowColor = ax > bulbW - 1.2 ? COL_TURQUOISE : COL_GOLD_HOT;
              out.glowStrength = 0.34;
              if (ax > bulbW - 1.2) return COL_CYAN_HOT;
              if (ax < 1.1 || ay > 4.2) return ax < 0.9 ? PURE_WHITE : COL_GOLD_BRIGHT;
              return COL_TEAL_DEEP;
            }
          }

          return 0;
        });

        // 2. 4 Interlocking Satellite Escapement Cogs at Cardinal/Diagonal Spokes
        for (let i = 0; i < 4; i++) {
          const a = rot + (i * Math.PI) / 2;
          const gx = Math.cos(a) * 22.5;
          const gy = Math.sin(a) * 22.5;
          drawPixelClockGear(
            pen,
            gx,
            gy,
            3.4,
            -rot * 3,
            i % 2 === 0 ? COL_GOLD_BRIGHT : COL_TURQUOISE,
            PURE_WHITE,
            1,
            6
          );
        }

        applySelectiveOutlineOnSurface(pen.surface, SELOUT_TEAL, 3);
        drawStarburstFlare(pen, 0, 0, 6.0, 1, brass);
      }
    };
  }
};

export const astrolabeGearWheelCell = chronoAstrolabeWheelCell;

/**
 * Row 2 (`y = 416`) — `chronoHourglassMonolithCell`:
 * Erupting Time-Dilation Stasis Hourglass Pillar & Temporal Rift:
 *  - `F00..F06` (`u < 0.23`): Eruption from temporal ground rift
 *  - `F07..F21` (`0.23..0.73`): Swirling anti-gravity golden sand + cyan stasis rings
 *  - `F22..F29` (`u >= 0.73`): Crystalline temporal shatter into shards
 */
export const chronoHourglassMonolithCell = {
  duration: 1.0,
  loop: false,
  defaults: { palette: CHRONO_TEAL_PALETTE, seed: 623 },
  create(cfg) {
    const teal = buildColorRamp(cfg.palette, 8);
    const brass = buildColorRamp(CHRONO_BRASS_PALETTE, 8);
    const bandTeal4 = [teal[2], teal[5], teal[6], PURE_WHITE];
    const bandBrass4 = [brass[2], brass[5], brass[6], PURE_WHITE];

    return {
      step() {},
      renderFront(pen, localT) {
        const u = clamp01(localT / 1.0);

        // Phase 3 (`F22..F29`, `u >= 0.73`): Full-Scale Hourglass Crystalline Shatter Burst!
        if (u >= 0.73) {
          const su = clamp01((u - 0.73) / 0.27);
          const grow = Easing.outCubic(su);
          const alive = su < 0.95;
          if (!alive) return;

          pen.radialGlow(0, 0, 36 * (1 - su * 0.42), su < 0.25 ? brass[6] : teal[5], 0.44 * (1 - su * 0.85));
          pen.strokeRing(0, 0, 18 + grow * 18, Math.max(1.1, 2.4 * (1 - su * 0.65)), su < 0.35 ? PURE_WHITE : COL_TURQUOISE, 1);
          if (su < 0.75) {
            pen.strokeRing(0, 0, 12 + grow * 17, 1.5, COL_GOLD_BRIGHT, 1);
          }

          // Top & Bottom Fractured Brass Pedestal Halves Flying Apart (`py = +-22 -> +-34`)
          const capFly = 22 + grow * 11;
          for (const signY of [-1, 1]) {
            for (const signX of [-1, 1]) {
              const cxCap = signX * (6 + grow * 12);
              const cyCap = signY * capFly;
              if (Math.abs(cxCap) <= 34 && Math.abs(cyCap) <= 35 && su < 0.82) {
                drawPixelDiamondShard(
                  pen,
                  cxCap,
                  cyCap,
                  signX * 0.35,
                  5.2 * (1 - su * 0.45),
                  2.6 * (1 - su * 0.4),
                  COL_GOLD_HOT,
                  COL_GOLD_BRIGHT,
                  PURE_WHITE,
                  1
                );
              }
            }
          }

          for (let i = 0; i < 12; i++) {
            const a = (i / 12) * TWO_PI + 0.24;
            const dist = (12 + (i % 3) * 3) + grow * (16 + (i % 2) * 5);
            const sx = Math.cos(a) * dist * 0.92;
            const sy = Math.sin(a) * dist;
            if (Math.abs(sx) > 35 || Math.abs(sy) > 35) continue;
            const shardLen = (5.8 - su * 2.8) * (i % 2 === 0 ? 1.15 : 0.9);
            if (shardLen > 1.0) {
              drawPixelDiamondShard(
                pen,
                sx,
                sy,
                a,
                shardLen,
                shardLen * 0.52,
                i % 3 === 0 ? COL_GOLD_HOT : COL_CYAN_HOT,
                i % 3 === 0 ? COL_GOLD_BRIGHT : COL_TURQUOISE,
                PURE_WHITE,
                1
              );
            }
          }
          applySelectiveOutlineOnSurface(pen.surface, SELOUT_TEAL, 3);
          if (su < 0.72) {
            drawStarburstFlare(pen, 0, 0, 13 * (1 - su * 0.85), 1, brass);
          }
          return;
        }

        // Phase 1 (`F00..F06`, `u < 0.23`): Eruption + Phase 2 (`F07..F21`): Anti-Gravity Sand & Stasis Rings
        const erupt = Easing.outBack(clamp01(u / 0.22), 1.25);
        const hScale = clampRange(erupt, 0.28, 1.04);
        const topCapY = -33 * hScale;
        const botCapY = 33;
        const waistY = (topCapY + botCapY) * 0.5;
        const halfH = (botCapY - topCapY) * 0.5;
        const swirl = u * TWO_PI * 3;

        pen.radialGlow(0, waistY, 32, teal[5], 0.36);

        // Temporal Rift Floor Seal (`y = +33`)
        drawTiltedOrbitBand(pen, 0, 33, 29 * Math.min(1, erupt), 0.22, 1.6, 1, bandBrass4, null, u < 0.12);

        // Ornate Brass & Crystal Hourglass Pillar
        pen.shadeBox(-30, -38, 30, 38, (px, py, out) => {
          if (py < topCapY - 3 || py > botCapY + 3) return 0;
          const ax = Math.abs(px);
          const relY = py - waistY;
          const ay = Math.abs(relY);

          // Top & Bottom Stepped Brass Pedestal Capitals
          if (ay >= halfH - 4.2 && ay <= halfH + 1.5 && ax <= 23) {
            out.alpha = 1;
            out.glowColor = COL_GOLD_BRIGHT;
            out.glowStrength = 0.22;
            if (ay > halfH + 0.3) return COL_BRASS_DEEP;
            return px < 0 || ay < halfH - 2.2 ? COL_GOLD_HOT : COL_GOLD_BRIGHT;
          }

          // Twin Outer Vertical Brass Frame Columns (`ax in [19.2..21.6]`)
          if (ay < halfH - 4.0 && ax >= 19.2 && ax <= 21.6) {
            out.alpha = 1;
            return px < 0 ? COL_GOLD_BRIGHT : COL_BRASS_MID;
          }

          // Hourglass Crystal Bulb Profile
          if (ay < halfH - 4.0) {
            const hFrac = ay / Math.max(1, halfH - 4.0);
            const bulbR = 3.2 + 14.8 * Math.pow(hFrac, 0.8);
            if (ax > bulbR) return 0;

            out.alpha = 1;
            // Crystalline Cyan Rim
            if (ax >= bulbR - 1.6) {
              out.glowColor = COL_TURQUOISE;
              out.glowStrength = 0.28;
              return px < 0 ? PURE_WHITE : COL_TURQUOISE;
            }

            // Anti-Gravity Rising Golden Sand Stream up the center (`ax <= 1.8`)
            if (ax <= 1.8) {
              out.glowColor = COL_GOLD_HOT;
              out.glowStrength = 0.36;
              return ax < 0.9 ? PURE_WHITE : COL_GOLD_BRIGHT;
            }

            // Swirling Anti-Gravity Sand Helices & Accumulating Upper Sand Crown
            const sandFill = clamp01((u - 0.08) / 0.65);
            if (relY < -2 && relY <= topCapY + 5 + sandFill * 14) {
              out.glowColor = COL_GOLD_BRIGHT;
              out.glowStrength = 0.28;
              return relY > topCapY + 3 + sandFill * 14 ? PURE_WHITE : COL_GOLD_BRIGHT;
            }
            if (relY > 2 && relY >= botCapY - 5 - (1 - sandFill * 0.65) * 14 + ax * 0.28) {
              out.glowColor = COL_GOLD_BRIGHT;
              out.glowStrength = 0.26;
              return COL_BRASS_MID;
            }

            // Interior Crystalline Teal Stasis Core
            const n = fbmNoise2D(px * 0.22, py * 0.22 + u * 8, 41, 2);
            return n > 0.05 ? COL_TEAL_DEEP : COL_TEAL_SHADOW;
          }
          return 0;
        });

        // Orbiting Cyan Stasis Rings & Rising Anti-Gravity Golden Sand Motes (`F07..F21`)
        drawTiltedOrbitBand(pen, 0, waistY, 26, 0.26, 1.5, 1, bandTeal4, FRONT_HALF, false);
        drawTiltedOrbitBand(pen, 0, waistY - 11 * hScale, 22, 0.24, 1.3, 1, bandBrass4, FRONT_HALF, false);

        for (let m = 0; m < 8; m++) {
          const mu = ((u * 2.4 + m / 8) % 1);
          const ma = swirl + (m * TWO_PI) / 8;
          const mx = Math.cos(ma) * (14 + (m % 3) * 4);
          const my = 28 - mu * 56;
          if (Math.abs(mx) <= 34 && Math.abs(my) <= 35) {
            pen.fillCircle(mx, my, 1.4, m % 2 === 0 ? COL_GOLD_HOT : COL_CYAN_HOT, 1);
          }
        }

        applySelectiveOutlineOnSurface(pen.surface, SELOUT_TEAL, 3);
        drawStarburstFlare(pen, 0, waistY, 7.5, 1, brass);
      }
    };
  }
};

export const stasisHourglassMonolithCell = chronoHourglassMonolithCell;

/**
 * Row 3 (`y = 624`) — `chronoHorologiumSealCell`:
 * Grand 12-Spoke Roman Numeral XII Horologium Clockface
 * with counter-rotating Minute & Hour hands.
 */
export const chronoHorologiumSealCell = {
  duration: 1.0,
  loop: true,
  defaults: { palette: CHRONO_TEAL_PALETTE, seed: 633 },
  create(cfg) {
    const teal = buildColorRamp(cfg.palette, 8);
    const brass = buildColorRamp(CHRONO_BRASS_PALETTE, 8);

    return {
      step() {},
      renderFront(pen, localT) {
        const progress = clamp01(localT / 1.0);
        const rot = progress * TWO_PI;

        pen.radialGlow(0, 0, 36, teal[5], 0.36);

        // 1. Grand 12-Spoke Roman Numeral XII Horologium Dial (`r <= 37.5`)
        pen.shadeBox(-39, -39, 39, 39, (px, py, out) => {
          const r = Math.hypot(px, py);
          if (r > 37.5) return 0;

          const a = Math.atan2(py, px) + Math.PI * 0.5;
          const normA = ((a % TWO_PI) + TWO_PI) % TWO_PI;
          const sectorF = (normA / TWO_PI) * 12;
          const sector = Math.floor(sectorF);
          const frac = sectorF - sector;
          const distSpoke = Math.min(frac, 1 - frac);

          out.alpha = 1;

          // Outer Crown Finial at 12 O'Clock (`XII`: `py < -33, |px| <= 4.5`)
          if (py < -33.0 && Math.abs(px) <= 4.5 && r <= 37.5) {
            out.glowColor = COL_GOLD_HOT;
            out.glowStrength = 0.34;
            return Math.abs(px) < 1.8 ? PURE_WHITE : COL_GOLD_BRIGHT;
          }
          if (r > 35.8) return 0;

          // Concentric Brass & Cyan Bezel Rings
          if (r >= 33.4 && r <= 35.8) {
            out.glowColor = COL_GOLD_BRIGHT;
            out.glowStrength = 0.24;
            return r > 34.6 ? COL_GOLD_HOT : COL_BRASS_MID;
          }
          if (Math.abs(r - 25.8) <= 1.25) {
            out.glowColor = COL_TURQUOISE;
            out.glowStrength = 0.26;
            return COL_TURQUOISE;
          }
          if (Math.abs(r - 13.5) <= 1.2) {
            return COL_GOLD_BRIGHT;
          }

          // Roman Numeral Chapter Ring (`r = 26.8..33.3`) with 12 Hour Plates!
          if (r > 26.8 && r < 33.4) {
            const isCardinal = sector === 0 || sector === 3 || sector === 6 || sector === 9;
            if (distSpoke < (isCardinal ? 0.18 : 0.11) && r >= 28.0 && r <= 32.2) {
              out.glowColor = sector === 0 ? COL_GOLD_HOT : PURE_WHITE;
              out.glowStrength = 0.32;
              return sector === 0 ? COL_GOLD_HOT : PURE_WHITE;
            }
            return sector % 2 === 0 ? COL_TEAL_SHADOW : packHexColor('#0b1628');
          }

          // 12 Radial Brass & Teal Spokes (`distSpoke < 0.065`)
          if (r >= 6.0 && r <= 25.8 && distSpoke < 0.065) {
            return sector % 2 === 0 ? COL_GOLD_BRIGHT : COL_TURQUOISE;
          }

          // Stained-Astral Midnight Interior Panes (`r < 25.8`)
          if (r < 25.8) {
            return r < 13.5
              ? sector % 2 === 0
                ? COL_TEAL_DEEP
                : COL_TEAL_SHADOW
              : sector % 2 === 0
                ? packHexColor('#0c2d36')
                : packHexColor('#102038');
          }

          return 0;
        });

        // 2. Counter-Rotating Minute Hand (Cyan-White) & Hour Hand (Burnished Gold)
        const minuteAngle = -Math.PI * 0.5 + rot;
        const hourAngle = -Math.PI * 0.5 - rot;
        drawClockHand(pen, 0, 0, hourAngle, 20, 3.0, COL_GOLD_BRIGHT, COL_GOLD_HOT, 1);
        drawClockHand(pen, 0, 0, minuteAngle, 29, 2.5, COL_TURQUOISE, PURE_WHITE, 1);

        applySelectiveOutlineOnSurface(pen.surface, SELOUT_INDIGO, 3);
        drawStarburstFlare(pen, 0, 0, 6.8, 1, brass);
      }
    };
  }
};

export const horologiumClockFaceCell = chronoHorologiumSealCell;

/**
 * Row 4 (`y = 832`) — `chronoShatterBurstCell`:
 * Temporal Glass-Clock Shatter Star-Burst
 * (exploding cyan crystal clock-shards & golden gear teeth).
 */
export const chronoShatterBurstCell = {
  duration: 1.0,
  loop: false,
  defaults: { palette: CHRONO_TEAL_PALETTE, seed: 647 },
  create(cfg) {
    const teal = buildColorRamp(cfg.palette, 8);
    const brass = buildColorRamp(CHRONO_BRASS_PALETTE, 8);

    return {
      step() {},
      renderFront(pen, localT) {
        const u = clamp01(localT / 1.0);
        if (u >= 0.96) return;
        const grow = Easing.outCubic(u);
        const shrink = 1 - smoothStep(0.62, 0.96, u);

        pen.radialGlow(0, 0, 34 * shrink, teal[5], 0.42 * shrink);

        // 1. Expanding Pixel Shock-Ring (`r = 8..35`)
        const ringR = 8 + grow * 26;
        if (u < 0.78) {
          pen.strokeRing(0, 0, ringR, Math.max(1.1, 2.6 * (1 - u)), u < 0.25 ? PURE_WHITE : COL_TURQUOISE, 1);
        }

        // 2. 10 Exploding Cyan Crystal Clock-Shards
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * TWO_PI + 0.15;
          const speedBias = i % 2 === 0 ? 1.0 : 0.76;
          const r = (5 + grow * 27) * speedBias;
          const sx = Math.cos(a) * r;
          const sy = Math.sin(a) * r;
          const shardLen = (7.2 - u * 4.5) * (i % 2 === 0 ? 1.1 : 0.85);
          if (shardLen > 1.1 && Math.hypot(sx, sy) + shardLen < 38.5) {
            drawPixelDiamondShard(
              pen,
              sx,
              sy,
              a,
              shardLen,
              shardLen * 0.48,
              COL_CYAN_HOT,
              COL_TURQUOISE,
              PURE_WHITE,
              1
            );
          }
        }

        // 3. 6 Flying Golden Escapement Gear Teeth / Micro-Cogs
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * TWO_PI + 0.48 - u * 1.4;
          const r = 6 + grow * 23;
          const gx = Math.cos(a) * r;
          const gy = Math.sin(a) * r;
          const gr = 2.8 * shrink;
          if (gr > 0.9 && Math.hypot(gx, gy) < 35) {
            drawPixelClockGear(pen, gx, gy, gr, u * 10 * (k % 2 === 0 ? 1 : -1), COL_GOLD_BRIGHT, COL_GOLD_HOT, 1, 6);
          }
        }

        // 4. Central 8-Point Horological Star-Burst Core (`F00..F18`)
        if (u < 0.68) {
          const coreScale = 1 - u / 0.68;
          drawChronoCrosshair(pen, 0, 0, 18 * coreScale, COL_GOLD_HOT, COL_CYAN_HOT, 1, 0);
          drawChronoCrosshair(pen, 0, 0, 12 * coreScale, COL_TURQUOISE, COL_GOLD_BRIGHT, 1, Math.PI * 0.25);
        }

        applySelectiveOutlineOnSurface(pen.surface, SELOUT_INDIGO, 3);
        if (shrink > 0.15) {
          drawStarburstFlare(pen, 0, 0, 12 * shrink, 1, brass);
        }
      }
    };
  }
};

export const timeShatterNovaCell = chronoShatterBurstCell;

/**
 * Row 5 (`y = 1040`) — `paradoxTwinScissorCell`:
 * Wide, dramatic Twin Clock-Hand X-Scissor Cleave:
 *  - `+28°` cyan-white Minute slash intersecting `-28°` burnished-gold Hour slash
 *  - Central 4-point horological starflare & scissor-snap spark burst!
 */
export const paradoxTwinScissorCell = {
  duration: 1.0,
  loop: false,
  defaults: { palette: CHRONO_TEAL_PALETTE, seed: 659 },
  create(cfg) {
    const teal = buildColorRamp(cfg.palette, 8);
    const brass = buildColorRamp(CHRONO_BRASS_PALETTE, 8);

    return {
      step() {},
      renderFront(pen, localT) {
        const u = clamp01(localT / 1.0);
        if (u >= 0.96) return;

        // Scissor-snap kinematics: jaws close rapidly toward +-28° (`F00..F06`), lock & blaze (`F07..F19`), taper clean (`F20..F28`)
        const snap = Easing.outCubic(clamp01(u / 0.22));
        const taper = 1 - smoothStep(0.64, 0.96, u);
        const halfAngle = mixScalar(44, 28, snap) * (Math.PI / 180);
        const span = (26 + 13 * Easing.outBack(clamp01(u / 0.25), 1.15)) * (0.86 + 0.14 * taper);
        const bladeW = 5.6 * taper;

        pen.radialGlow(0, 0, 34 * taper, teal[5], 0.4 * taper);

        const cA = Math.cos(halfAngle);
        const sA = Math.sin(halfAngle);
        const cB = Math.cos(-halfAngle);
        const sB = Math.sin(-halfAngle);

        // Render Twin Intersecting Clock-Hand Scissor Blades inside `[-39, +39]`
        pen.shadeBox(-40, -36, 40, 36, (px, py, out) => {
          if (Math.abs(px) > 39 || Math.abs(py) > 34) return 0;

          // Blade A (`+28°` Luminous Cyan-White Minute Slash, slightly bowed outward)
          const alongA = px * cA + py * sA;
          const perpA = -px * sA + py * cA;
          const uA = alongA / Math.max(1, span);
          if (Math.abs(uA) <= 1.0) {
            const profA = Math.pow(1 - uA * uA, 0.72);
            const bowA = 2.6 * (1 - uA * uA);
            const dA = Math.abs(perpA - bowA);
            const hwA = bladeW * profA;
            if (hwA > 0.55 && dA <= hwA) {
              out.alpha = 1;
              const qA = 1 - dA / hwA;
              out.glowColor = COL_CYAN_HOT;
              out.glowStrength = 0.34 * qA;
              if (qA > 0.62) return PURE_WHITE;
              if (qA > 0.32) return COL_CYAN_HOT;
              return perpA > bowA ? COL_TURQUOISE : COL_TEAL_DEEP;
            }
          }

          // Blade B (`-28°` Burnished-Gold Hour Slash, slightly bowed opposite)
          const alongB = px * cB + py * sB;
          const perpB = -px * sB + py * cB;
          const uB = alongB / Math.max(1, span);
          if (Math.abs(uB) <= 1.0) {
            const profB = Math.pow(1 - uB * uB, 0.72);
            const bowB = -2.6 * (1 - uB * uB);
            const dB = Math.abs(perpB - bowB);
            const hwB = bladeW * profB;
            if (hwB > 0.55 && dB <= hwB) {
              out.alpha = 1;
              const qB = 1 - dB / hwB;
              out.glowColor = COL_GOLD_HOT;
              out.glowStrength = 0.34 * qB;
              if (qB > 0.62) return PURE_WHITE;
              if (qB > 0.32) return COL_GOLD_HOT;
              return perpB < bowB ? COL_GOLD_BRIGHT : COL_BRASS_MID;
            }
          }

          return 0;
        });

        // Escapement Pivot Ring at Intersection + Scissor-Snap Sparks
        if (taper > 0.25) {
          pen.strokeRing(0, 0, 8.5 * snap, 1.5, u < 0.3 ? PURE_WHITE : COL_GOLD_BRIGHT, 1);
          for (let i = 0; i < 8; i++) {
            const isCyan = i % 2 === 0;
            const baseA = (isCyan ? halfAngle : -halfAngle) + (i < 4 ? 0 : Math.PI);
            const dist = (10 + u * 24) * (0.75 + (i % 3) * 0.12);
            const sx = Math.cos(baseA + 0.18 * (isCyan ? 1 : -1)) * dist;
            const sy = Math.sin(baseA + 0.18 * (isCyan ? 1 : -1)) * dist;
            if (Math.abs(sx) <= 37 && Math.abs(sy) <= 32) {
              pen.fillCircle(sx, sy, 1.5, isCyan ? COL_TURQUOISE : COL_GOLD_BRIGHT, 1);
              pen.pixel(sx, sy, PURE_WHITE);
            }
          }
        }

        // Crisp 4-Point Central Horological Starflare!
        const starLen = (15 + 5 * Math.sin(clamp01(u / 0.5) * Math.PI)) * taper;
        if (starLen > 2.5) {
          drawChronoCrosshair(pen, 0, 0, starLen, COL_GOLD_HOT, COL_CYAN_HOT, 1, 0);
          pen.fillCircle(0, 0, Math.max(1.8, 3.6 * taper), PURE_WHITE, 1);
        }

        applySelectiveOutlineOnSurface(pen.surface, SELOUT_INDIGO, 3);
        if (taper > 0.15) {
          drawStarburstFlare(pen, 0, 0, 11 * taper, 1, brass);
        }
      }
    };
  }
};

/**
 * Row 6 (`y = 1248`) — `suspendedClockSpearCell`:
 * Unmistakable horizontal (`+X` pointing) Colossal Golden-Brass & Cyan-Crystal Giant Clock-Hand Spear:
 *  - `x = 12..92` in `104x104` logical space (`lx = -40..+40` -> `160px` long in `208x208`!)
 *  - Ornate circular brass escapement hilt on the left (`lx = -39..-17`)
 *  - Razor-tapered diamond clock-hand spearhead pointing `+X` on the right (`lx = -16..+40`)
 *    with pulsing cyan-white energy core & golden Roman tick marks!
 */
export const suspendedClockSpearCell = {
  duration: 1.0,
  loop: true,
  defaults: { palette: CHRONO_TEAL_PALETTE, seed: 673 },
  create(cfg) {
    const teal = buildColorRamp(cfg.palette, 8);
    const brass = buildColorRamp(CHRONO_BRASS_PALETTE, 8);

    return {
      step() {},
      renderFront(pen, localT) {
        const progress = clamp01(localT / 1.0);
        const rot = progress * TWO_PI;
        const pulseX = -14 + ((progress * 2) % 1) * 52;

        // Luminous horological aura along the spear core & tip
        pen.radialGlow(-25, 0, 16, brass[5], 0.32);
        pen.radialGlow(14, 0, 24, teal[5], 0.36);

        pen.shadeBox(-41, -22, 41, 22, (px, py, out) => {
          const ay = Math.abs(py);

          // A. Left Pommel Finial (`px = -40..-34`)
          if (px >= -40 && px < -33.5) {
            const pMax = 3.6 * (1 - Math.abs(px + 36.8) / 3.6);
            if (ay <= pMax) {
              out.alpha = 1;
              out.glowColor = COL_GOLD_BRIGHT;
              out.glowStrength = 0.24;
              return ay < 1.2 ? COL_GOLD_HOT : py < 0 ? COL_GOLD_BRIGHT : COL_BRASS_DEEP;
            }
          }

          // B. Ornate Circular Brass Escapement Hilt Ring (`cx = -25.5, cy = 0, r = 9.2`)
          const hdx = px + 25.5;
          const hdy = py;
          const hr = Math.hypot(hdx, hdy);
          if (hr <= 10.6) {
            const ha = Math.atan2(hdy, hdx) + rot;
            const normHa = ((ha % TWO_PI) + TWO_PI) % TWO_PI;
            const cogF = ((normHa / TWO_PI) * 8) % 1;
            const outerHiltR = cogF >= 0.22 && cogF <= 0.78 ? 10.4 : 8.8;

            if (hr >= 6.0 && hr <= outerHiltR) {
              out.alpha = 1;
              out.glowColor = COL_GOLD_BRIGHT;
              out.glowStrength = 0.26;
              return hr > 8.6 ? COL_GOLD_HOT : py < 0 ? COL_GOLD_BRIGHT : COL_BRASS_MID;
            }
            // Spinning Interior Escapement Cross-Spokes & Cyan Jewel Hub
            const spokeF = ((normHa / TWO_PI) * 4) % 1;
            if (hr < 2.6) {
              out.alpha = 1;
              out.glowColor = PURE_WHITE;
              out.glowStrength = 0.38;
              return hr < 1.4 ? PURE_WHITE : COL_CYAN_HOT;
            }
            if (hr < 6.0 && (spokeF < 0.16 || spokeF > 0.84)) {
              out.alpha = 1;
              return COL_GOLD_BRIGHT;
            }
          }

          // C. Swept Horological Crescent Cross-Guard Wings (`px = -17..-10, ay <= 13.5`)
          if (px >= -17.5 && px <= -10.0) {
            const gU = (px + 17.5) / 7.5;
            const wingOuter = 13.5 * Math.sin(gU * Math.PI * 0.85 + 0.2);
            const wingInner = Math.max(0, 5.2 * (1 - gU));
            if (ay >= wingInner && ay <= wingOuter) {
              out.alpha = 1;
              out.glowColor = COL_GOLD_HOT;
              out.glowStrength = 0.26;
              if (ay > wingOuter - 1.6) return COL_GOLD_HOT;
              return py < 0 ? COL_GOLD_BRIGHT : COL_BRASS_MID;
            }
          }

          // D. Colossal Razor-Tapered Diamond Clock-Hand Spearhead (`px = -13..+40`, pointing `+X`)
          if (px >= -13.0 && px <= 40.0) {
            let maxHalfW;
            if (px < -1.0) {
              // Neck widening into diamond clock-hand shoulder (`px = -13..-1`: `3.8 -> 9.4`)
              const uNeck = (px + 13.0) / 12.0;
              maxHalfW = mixScalar(3.8, 9.4, uNeck);
            } else {
              // Long razor-tapered spearhead from shoulder (`px = -1`: `9.4`) to needle point (`px = +40`: `0.5`)
              const uTip = (px + 1.0) / 41.0;
              maxHalfW = 9.4 * Math.pow(1 - uTip, 0.88) + 0.45 * (1 - uTip);
            }

            // Ornate rear barb cutout notch at `px = -3..+1`
            if (px >= -4.5 && px <= -1.5 && ay > 6.8 && ay < 8.4) {
              return 0;
            }

            if (ay <= maxHalfW) {
              out.alpha = 1;

              // Open Horological Diamond Aperture (`px = -7..+1, ay = 1.8..4.0`)
              if (px >= -7.5 && px <= 0.5) {
                const dAp = Math.abs(px + 3.5) / 4.0 + Math.abs(ay - 3.0) / 1.5;
                if (dAp < 0.85) {
                  out.glowColor = COL_TURQUOISE;
                  out.glowStrength = 0.34;
                  return COL_CYAN_HOT;
                }
              }

              // Pulsing Cyan-White Energy Core along center spine (`ay <= 1.7`)
              const coreHalf = Math.min(1.75, maxHalfW * 0.42);
              if (ay <= coreHalf || px > 35.5) {
                const nearPulse = Math.abs(px - pulseX) < 7.5;
                out.glowColor = PURE_WHITE;
                out.glowStrength = nearPulse ? 0.48 : 0.36;
                return ay < 0.9 || nearPulse || px > 34.0 ? PURE_WHITE : COL_CYAN_HOT;
              }

              // Roman Tick Marks Engraved Along the Clock-Spear Spine!
              const tickRel = (px + 10) % 8.0;
              const isRomanTick =
                px >= -9 &&
                px <= 28 &&
                tickRel >= 0 &&
                tickRel <= 1.35 &&
                ay >= coreHalf + 0.4 &&
                ay <= Math.min(maxHalfW - 0.9, coreHalf + 3.2);
              if (isRomanTick) {
                out.glowColor = COL_GOLD_HOT;
                out.glowStrength = 0.32;
                return PURE_WHITE;
              }

              // Cyan-Crystal Inner Bevel (`ay <= maxHalfW * 0.62`) + Golden-Brass Outer Razor Edge!
              if (ay <= maxHalfW * 0.62) {
                out.glowColor = COL_TURQUOISE;
                out.glowStrength = 0.24;
                return py < 0 ? COL_TURQUOISE : COL_TEAL_DEEP;
              }

              out.glowColor = COL_GOLD_BRIGHT;
              out.glowStrength = 0.22;
              if (ay >= maxHalfW - 1.25) {
                return py <= 0 ? COL_GOLD_HOT : COL_GOLD_BRIGHT;
              }
              return py < 0 ? COL_GOLD_BRIGHT : COL_BRASS_MID;
            }
          }

          return 0;
        });

        // 1px Dark Selective Outline (`Selout`) around the entire 160px Giant Clock-Hand Spear!
        applySelectiveOutlineOnSurface(pen.surface, SELOUT_INDIGO, 2);

        // Tip Star-Glint at `lx = +38, ly = 0` (stays strictly inside `<= +40`!)
        pen.pixel(39, 0, PURE_WHITE);
        pen.pixel(38, -1, COL_CYAN_HOT);
        pen.pixel(38, 1, COL_CYAN_HOT);
      }
    };
  }
};

/**
 * Row 7 (`y = 1456`) — `twelfthBellCataclysmCell`:
 * Massive Twelfth Bell Midnight Shatter Nova —
 * fracturing XII clock-ring exploding into sharp turquoise-cyan glass shards,
 * golden escapement sparks, and white shock-rings!
 */
export const twelfthBellCataclysmCell = {
  duration: 1.0,
  loop: false,
  defaults: { palette: CHRONO_TEAL_PALETTE, seed: 691 },
  create(cfg) {
    const teal = buildColorRamp(cfg.palette, 8);
    const brass = buildColorRamp(CHRONO_BRASS_PALETTE, 8);

    return {
      step() {},
      renderFront(pen, localT) {
        const u = clamp01(localT / 1.0);
        if (u >= 0.97) return;

        const grow = Easing.outCubic(u);
        const shrink = 1 - smoothStep(0.68, 0.97, u);

        pen.radialGlow(0, 0, 38 * shrink, u < 0.22 ? brass[6] : teal[5], 0.46 * shrink);

        // 1. Twin Expanding Pure-White & Cyan-Gold Shock-Rings (`r <= 37.5`)
        const outerShockR = 9 + grow * 28.5;
        const innerShockR = 5 + Easing.outCubic(clamp01((u - 0.08) / 0.92)) * 24;
        if (u < 0.84) {
          pen.strokeRing(0, 0, outerShockR, Math.max(1.2, 2.8 * (1 - u * 0.7)), u < 0.3 ? PURE_WHITE : COL_CYAN_HOT, 1);
        }
        if (u > 0.08 && u < 0.88) {
          pen.strokeRing(0, 0, innerShockR, Math.max(1.0, 2.0 * (1 - u * 0.65)), COL_GOLD_BRIGHT, 1);
        }

        // 2. Fracturing XII Clock-Ring Exploding into 12 Sharp Stained-Glass Wedge Shards!
        for (let s = 0; s < 12; s++) {
          const baseAng = -Math.PI * 0.5 + (s / 12) * TWO_PI;
          const spinDrift = (s % 2 === 0 ? 1 : -1) * u * 0.35;
          const rShard = 11 + grow * (21 + (s % 3) * 2.2);
          const sx = Math.cos(baseAng + spinDrift * 0.25) * rShard;
          const sy = Math.sin(baseAng + spinDrift * 0.25) * rShard;
          const shardLen = (6.8 - u * 3.8) * (s === 0 || s % 3 === 0 ? 1.18 : 0.92);
          if (shardLen > 1.1 && Math.hypot(sx, sy) + shardLen < 39.2) {
            const isGoldSector = s === 0 || s === 3 || s === 6 || s === 9;
            drawPixelDiamondShard(
              pen,
              sx,
              sy,
              baseAng + spinDrift,
              shardLen,
              shardLen * 0.54,
              isGoldSector ? COL_GOLD_HOT : COL_CYAN_HOT,
              isGoldSector ? COL_GOLD_BRIGHT : COL_TURQUOISE,
              PURE_WHITE,
              1
            );
          }
        }

        // 3. 8 Flying Golden Escapement Cogs & Sparks
        for (let g = 0; g < 8; g++) {
          const ga = (g / 8) * TWO_PI + 0.26 - u * 0.9;
          const grDist = 7 + grow * 25;
          const gx = Math.cos(ga) * grDist;
          const gy = Math.sin(ga) * grDist;
          const cogR = 2.6 * shrink;
          if (cogR > 0.9 && Math.hypot(gx, gy) < 35.5) {
            drawPixelClockGear(
              pen,
              gx,
              gy,
              cogR,
              u * 12 * (g % 2 === 0 ? 1 : -1),
              g % 2 === 0 ? COL_GOLD_BRIGHT : COL_TURQUOISE,
              PURE_WHITE,
              1,
              6
            );
          }
        }

        // 4. Midnight XII Hands & Central Cataclysmic Star-Cross (`F00..F19`)
        if (u < 0.66) {
          const k = 1 - u / 0.66;
          drawClockHand(pen, 0, -2, -Math.PI * 0.5, 24 * k, 3.0 * k, COL_GOLD_HOT, PURE_WHITE, 1);
          drawChronoCrosshair(pen, 0, 0, 22 * k, COL_GOLD_HOT, COL_CYAN_HOT, 1, 0);
          drawChronoCrosshair(pen, 0, 0, 15 * k, COL_TURQUOISE, COL_GOLD_BRIGHT, 1, Math.PI * 0.25);
          pen.fillCircle(0, 0, Math.max(2.0, 5.5 * k), PURE_WHITE, 1);
        }

        applySelectiveOutlineOnSurface(pen.surface, SELOUT_INDIGO, 3);
        if (shrink > 0.12) {
          drawStarburstFlare(pen, 0, 0, 14 * shrink, 1, brass);
        }
      }
    };
  }
};

export const CHRONO_EFFECT_REGISTRY = {
  // Live 120Hz 2.5D `ArcaneShaderFX` Effects
  chronoAstrolabeAura,
  temporalCrescentRift,
  chronoTimeRiftSlash,
  warpPortalPairRift,
  stasisHourglassPrison,
  chronoStasisField,
  doomsdayGrandHorologium,
  eternalZeroClockPulse,

  // Backward-compatible Live Aliases
  chronoAstrolabeHalo: chronoAstrolabeAura,
  chronoPendulumSlash: temporalCrescentRift,
  stasisHourglassMatrix: stasisHourglassPrison,
  doomsdayAstralDomain: doomsdayGrandHorologium,

  // 8 Baked 30fps `chronomancer_vfx.png` Cell Shaders (`Rows 0..7`)
  chronoGearWaveCell,
  chronoAstrolabeWheelCell,
  chronoHourglassMonolithCell,
  chronoHorologiumSealCell,
  chronoShatterBurstCell,
  paradoxTwinScissorCell,
  suspendedClockSpearCell,
  twelfthBellCataclysmCell,

  // Backward-compatible Cell Aliases
  chronoBoltCell,
  astrolabeGearWheelCell,
  stasisHourglassMonolithCell,
  horologiumClockFaceCell,
  timeShatterNovaCell
};
