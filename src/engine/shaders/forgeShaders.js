/**
 * World-Forge Crucible & Runic Anvil Shader Suite (`forgeShaders.js`)
 * First-party 120Hz 2.5D multi-layer pixel-shader & particle effects for Torgar (`titan` / `Titan.js`).
 *
 * Powers both:
 *   1. Live 120Hz `ArcaneShaderFX` (`back` + `front` 2.5D depth wraps around Torgar & opponents)
 *   2. Offline 30fps `assets/sprites/titan_vfx.png` (`6240x1040`, 5 rows x 30 cols @ 208x208)
 */

import {
  PURE_WHITE,
  buildColorRamp,
  clamp01,
  smoothStep,
  fbmNoise2D,
  DeterministicRng,
  MotePool,
  buildLightningChain,
  drawTiltedOrbitBand,
  drawStarburstFlare,
  drawMultiLayerCrescentArc
} from '../ArcaneShaderFX.js?v=30fps53';

export const FORGE_GOLD_PALETTE = [
  '#180f0a',
  '#451a03',
  '#7c2d12',
  '#b45309',
  '#d97706',
  '#f59e0b',
  '#fde047',
  '#ffffff'
];

export const FORGE_JADE_PALETTE = [
  '#041b15',
  '#064e3b',
  '#047857',
  '#059669',
  '#10b981',
  '#34d399',
  '#a7f3d0',
  '#ffffff'
];

const BACK_HALF = (theta) => Math.sin(theta) < 0;
const FRONT_HALF = (theta) => Math.sin(theta) >= 0;

function drawPixelAnvilRune(pen, cx, cy, r, mainCol, coreCol, alpha = 1) {
  if (alpha <= 0.02 || r <= 0.4) return;
  pen.fillCircle(cx, cy, r + 0.8, '#180f0a', alpha * 0.92);
  pen.fillCircle(cx, cy, r, mainCol, alpha * 0.96);
  pen.line(cx - r * 0.85, cy - r * 0.45, cx + r * 0.85, cy - r * 0.45, coreCol, alpha);
  pen.line(cx, cy - r * 0.85, cx, cy + r * 0.85, coreCol, alpha);
  pen.stipple(cx, cy, PURE_WHITE, alpha);
  pen.radialGlow(cx, cy, r * 2.1, mainCol, 0.28 * alpha);
}

function drawForgeStarCross(pen, cx, cy, rOuter, rInner, aspectY, rot, colMain, colCore, alpha = 1, pred = null) {
  if (rOuter <= 1.2 || alpha <= 0.02) return;
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
    pen.line(x0, y0, x1, y1, i % 4 === 0 ? colCore : colMain, alpha);
    if (i % 2 === 0) {
      pen.stipple(x0, y0, i % 4 === 0 ? PURE_WHITE : colCore, alpha);
    }
  }
}

// ============================================================================
// 1. 2.5D ORBITING FORGE MAGMA MANTLE (`forgeMagmaMantle`)
// ============================================================================
export const forgeMagmaMantle = {
  duration: 2.4,
  loop: true,
  defaults: {
    palette: FORGE_GOLD_PALETTE,
    seed: 41,
    fortified: false
  },
  create(cfg) {
    const gold = buildColorRamp(cfg.palette, 8);
    const jade = buildColorRamp(FORGE_JADE_PALETTE, 8);
    const goldBand = [gold[2], gold[4], gold[6], PURE_WHITE];
    const jadeBand = [jade[2], jade[4], jade[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, gold[6], jade[5], gold[4]] });
    let phase = 0;
    let emitAcc = 0;

    function drawHalf(pen, isFront) {
      const fortified = Boolean(cfg.fortified);
      const rx = fortified ? 24 : 20;
      const aspectY = 0.28;
      const pred = isFront ? FRONT_HALF : BACK_HALF;

      drawTiltedOrbitBand(
        pen,
        0,
        0,
        rx,
        aspectY,
        fortified ? 1.7 : 1.3,
        isFront ? (fortified ? 0.92 : 0.68) : fortified ? 0.78 : 0.52,
        goldBand,
        pred,
        isFront && fortified
      );

      if (fortified) {
        drawTiltedOrbitBand(
          pen,
          0,
          -6,
          rx * 0.78,
          aspectY,
          1.3,
          isFront ? 0.86 : 0.68,
          jadeBand,
          pred,
          false
        );
      }

      const count = fortified ? 4 : 3;
      for (let i = 0; i < count; i++) {
        const a = phase * 2.3 + (i / count) * Math.PI * 2;
        const sinA = Math.sin(a);
        if ((sinA >= 0) !== isFront) continue;
        const ox = Math.cos(a) * rx;
        const oy = sinA * rx * aspectY;
        const isJade = i % 2 === 1;
        drawPixelAnvilRune(
          pen,
          ox,
          oy,
          fortified ? 2.6 : 2.1,
          isJade ? jade[5] : gold[5],
          isJade ? jade[6] : gold[6],
          isFront ? 0.96 : 0.86
        );
      }
    }

    return {
      step(dt) {
        phase += dt;
        emitAcc += dt * (cfg.fortified ? 26 : 12);
        while (emitAcc >= 1) {
          emitAcc -= 1;
          const a = rng.between(0, Math.PI * 2);
          const rx = cfg.fortified ? 22 : 18;
          motes.emit(
            rng.chance(0.35) ? 'glint' : 'spark',
            Math.cos(a) * rx,
            Math.sin(a) * rx * 0.28,
            rng.between(-12, 12),
            rng.between(-28, -8),
            rng.between(0.16, 0.3),
            rng.chance(0.45) ? jade[5] : gold[6],
            1,
            -16
          );
        }
        motes.step(dt);
      },
      renderBack(pen) {
        drawHalf(pen, false);
      },
      renderFront(pen) {
        drawHalf(pen, true);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 2. MULTI-LAYER WORLD-BREAKER ANVIL CLEAVE (`worldBreakerAnvilCleave`)
// ============================================================================
export const worldBreakerAnvilCleave = {
  duration: 0.38,
  loop: false,
  defaults: {
    palette: FORGE_GOLD_PALETTE,
    seed: 73,
    radius: 30,
    width: 11.5,
    isFinisher: false
  },
  create(cfg) {
    const gold = buildColorRamp(cfg.palette, 8);
    const jade = buildColorRamp(FORGE_JADE_PALETTE, 8);
    const band4 = [gold[2], jade[4], gold[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, gold[6], jade[5], gold[4]] });
    let t = 0;
    let burstDone = false;

    return {
      step(dt) {
        if (!burstDone) {
          burstDone = true;
          const cnt = cfg.isFinisher ? 20 : 14;
          for (let i = 0; i < cnt; i++) {
            const a = rng.between(-Math.PI * 0.62, Math.PI * 0.62);
            const spd = rng.between(48, 148);
            motes.emit(
              i % 3 === 0 ? 'glint' : 'spark',
              Math.cos(a) * 12,
              Math.sin(a) * 12,
              Math.cos(a) * spd,
              Math.sin(a) * spd,
              rng.between(0.16, 0.32),
              i % 3 === 0 ? jade[5] : gold[6],
              1.1,
              28
            );
          }
        }
        t += dt;
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 0.38);
        const fade = 1 - u;
        if (fade <= 0.02) return;
        const rad = (cfg.radius || 30) * (0.72 + 0.28 * smoothStep(0, 0.35, u));
        drawTiltedOrbitBand(pen, 2, 4, rad * 0.82, 0.34, 1.4, 0.78 * fade, band4, BACK_HALF, false);
        pen.radialGlow(10, 0, rad * 0.75, gold[4], 0.28 * fade);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.38);
        const fade = 1 - u * u;
        if (fade <= 0.02) return;

        const baseR = cfg.radius || 30;
        const baseW = cfg.width || 11.5;
        const headAng = -0.95 + 2.15 * smoothStep(0, 0.55, u);
        const tailAng = -1.65 + 0.55 * u;

        drawMultiLayerCrescentArc(pen, {
          cx: -2,
          cy: 0,
          radius: baseR,
          width: baseW,
          eccentricity: 0.78,
          headAngle: headAng,
          tailAngle: tailAng,
          fade,
          ramp: gold,
          seed: cfg.seed || 73,
          t: u,
          flashHot: u < 0.32
        });

        if (cfg.isFinisher) {
          drawMultiLayerCrescentArc(pen, {
            cx: -4,
            cy: 2,
            radius: baseR * 0.76,
            width: baseW * 0.65,
            eccentricity: 0.78,
            headAngle: headAng - 0.12,
            tailAngle: tailAng + 0.15,
            fade: fade * 0.88,
            ramp: jade,
            seed: (cfg.seed || 73) + 19,
            t: u,
            flashHot: false
          });
        }

        const tipX = -2 + Math.cos(headAng) * baseR;
        const tipY = Math.sin(headAng) * baseR * 0.78;
        drawStarburstFlare(pen, tipX, tipY, 10.5 * fade, fade * 0.96, [gold[4], jade[5], gold[6], PURE_WHITE]);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 3. TECTONIC CRATER SHOCKWAVE (`tectonicCraterShockwave`)
// ============================================================================
export const tectonicCraterShockwave = {
  duration: 0.48,
  loop: false,
  defaults: {
    palette: FORGE_GOLD_PALETTE,
    seed: 113,
    maxRx: 36
  },
  create(cfg) {
    const gold = buildColorRamp(cfg.palette, 8);
    const jade = buildColorRamp(FORGE_JADE_PALETTE, 8);
    const goldBand = [gold[2], jade[4], gold[6], PURE_WHITE];
    const jadeBand = [jade[2], jade[4], jade[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, gold[6], jade[5], gold[4]], floorY: 0 });
    const crackLeft = buildLightningChain(rng, 0, 0, -26, 2, 0.14, 3);
    const crackRight = buildLightningChain(rng, 0, 0, 28, -1, 0.14, 3);
    let t = 0;
    let burstDone = false;

    return {
      step(dt) {
        if (!burstDone) {
          burstDone = true;
          for (let i = 0; i < 18; i++) {
            const rx = rng.between(-26, 26);
            motes.emit(
              i % 3 === 0 ? 'glint' : 'spark',
              rx,
              -1,
              rx * 2.3,
              rng.between(-98, -36),
              rng.between(0.18, 0.38),
              i % 2 === 0 ? gold[6] : jade[5],
              1.1,
              96
            );
          }
        }
        t += dt;
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 0.48);
        const pop = smoothStep(0, 0.22, u);
        const fade = 1 - u * u;
        if (fade <= 0.02) return;
        const maxR = Math.min(48, Math.max(24, cfg.maxRx ? cfg.maxRx / 3 : 36));

        drawTiltedOrbitBand(pen, 0, 0, maxR * pop, 0.22, 1.8, 0.9 * fade, goldBand, BACK_HALF, false);
        drawTiltedOrbitBand(pen, 0, 0, maxR * 0.64 * pop, 0.22, 1.4, 0.82 * fade, jadeBand, BACK_HALF, false);
        drawForgeStarCross(pen, 0, 0, maxR * 0.86 * pop, maxR * 0.42 * pop, 0.22, u * 2.4, gold[5], jade[5], 0.78 * fade, BACK_HALF);

        pen.polyline(crackLeft, gold[5], 0.88 * fade);
        pen.polyline(crackRight, jade[5], 0.88 * fade);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.48);
        const pop = smoothStep(0, 0.22, u);
        const fade = 1 - u * u;
        if (fade <= 0.02) return;
        const maxR = Math.min(48, Math.max(24, cfg.maxRx ? cfg.maxRx / 3 : 36));

        drawTiltedOrbitBand(pen, 0, 0, maxR * pop, 0.22, 2.0, 0.96 * fade, goldBand, FRONT_HALF, u < 0.24);
        drawTiltedOrbitBand(pen, 0, 0, maxR * 0.64 * pop, 0.22, 1.5, 0.88 * fade, jadeBand, FRONT_HALF, false);
        drawForgeStarCross(pen, 0, 0, maxR * 0.86 * pop, maxR * 0.42 * pop, 0.22, u * 2.4, gold[6], jade[6], 0.9 * fade, FRONT_HALF);

        if (u < 0.42) {
          drawStarburstFlare(pen, 0, -3, 12 * (1 - u / 0.42), fade * 0.95, [gold[4], jade[5], gold[6], PURE_WHITE]);
        }
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 4. RAGNAROK WORLD-FORGE WAVE (`ragnarokWorldForgeWave`)
// ============================================================================
export const ragnarokWorldForgeWave = {
  duration: 0.68,
  loop: false,
  defaults: {
    palette: FORGE_GOLD_PALETTE,
    seed: 181
  },
  create(cfg) {
    const gold = buildColorRamp(cfg.palette, 8);
    const jade = buildColorRamp(FORGE_JADE_PALETTE, 8);
    const goldBand = [gold[2], jade[4], gold[6], PURE_WHITE];
    const jadeBand = [jade[2], jade[4], jade[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({ rng, sparkRamp: [PURE_WHITE, gold[6], jade[5], gold[4]], floorY: 0 });
    let t = 0;
    let burstDone = false;

    return {
      step(dt) {
        if (!burstDone) {
          burstDone = true;
          for (let i = 0; i < 24; i++) {
            const rx = rng.between(-42, 42);
            motes.emit(
              i % 3 === 0 ? 'glint' : 'spark',
              rx,
              -2,
              rx * 2.5,
              rng.between(-125, -48),
              rng.between(0.24, 0.48),
              i % 2 === 0 ? gold[6] : jade[5],
              1.2,
              108
            );
          }
        }
        t += dt;
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 0.68);
        const pop = smoothStep(0, 0.18, u);
        const fade = 1 - Math.pow(u, 1.5);
        if (fade <= 0.02) return;

        drawTiltedOrbitBand(pen, 0, 0, 52 * pop, 0.22, 2.0, 0.9 * fade, goldBand, BACK_HALF, false);
        drawTiltedOrbitBand(pen, 0, 0, 34 * pop, 0.22, 1.6, 0.85 * fade, jadeBand, BACK_HALF, false);
        drawForgeStarCross(pen, 0, 0, 48 * pop, 24 * pop, 0.22, u * 3.2, gold[5], jade[5], 0.84 * fade, BACK_HALF);

        // Erupting molten crucible geyser spine (back glow)
        const colH = 68 * pop;
        pen.radialGlow(0, -colH * 0.45, 22 * fade, gold[5], 0.42 * fade);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.68);
        const pop = smoothStep(0, 0.18, u);
        const fade = 1 - Math.pow(u, 1.5);
        if (fade <= 0.02) return;

        drawMultiLayerCrescentArc(pen, {
          cx: 0,
          cy: -16,
          radius: 36 * pop,
          width: 11.5,
          eccentricity: 0.76,
          headAngle: -1.1 + 2.25 * smoothStep(0, 0.55, u),
          tailAngle: -1.65 + 0.45 * u,
          fade,
          ramp: gold,
          seed: cfg.seed || 181,
          t: u,
          flashHot: u < 0.35
        });

        drawTiltedOrbitBand(pen, 0, 0, 52 * pop, 0.22, 2.2, 0.96 * fade, goldBand, FRONT_HALF, true);
        drawTiltedOrbitBand(pen, 0, 0, 34 * pop, 0.22, 1.7, 0.9 * fade, jadeBand, FRONT_HALF, false);
        drawForgeStarCross(pen, 0, 0, 48 * pop, 24 * pop, 0.22, u * 3.2, gold[6], jade[6], 0.92 * fade, FRONT_HALF);

        if (u < 0.68) {
          const bolt1 = buildLightningChain(rng, -6, -64, -2, 0, 0.16, 3);
          const bolt2 = buildLightningChain(rng, 6, -58, 3, 0, 0.16, 3);
          pen.polyline(bolt1, jade[5], fade * 0.92);
          pen.polyline(bolt1, PURE_WHITE, fade * 0.96);
          pen.polyline(bolt2, gold[6], fade * 0.9);
        }

        drawStarburstFlare(pen, 0, -8, 14 * fade, fade * 0.96, [gold[4], jade[5], gold[6], PURE_WHITE]);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// BAKED 30FPS `titan_vfx.png` 5-ROW CELLS (`104x104` logical -> `208x208` crisp 2x)
// Strictly bounded within `[-40, +40]` (`< [-44, +44]`) for 0/150 border clips!
//   Row 0 (`y=0`):   `moltenSlagBoulderCell`   — Molten Slag & Anvil Boulder Projectile
//   Row 1 (`y=208`): `forgeRuneShieldCrestCell` — Runic Forge Shield Crest & Magma Aegis
//   Row 2 (`y=416`): `tectonicMagmaPillarCell`  — Tectonic Basalt-Jade & Magma Pillar
//   Row 3 (`y=624`): `worldForgeAnvilSealCell`  — World-Forge Runic Anvil & Crucible Seal
//   Row 4 (`y=832`): `cataclysmCraterNovaCell`  — Cataclysm Crater Nova & World-Breaker Cleave
// ============================================================================

// 5. ROW 0: MOLTEN SLAG BOULDER CELL (`moltenSlagBoulderCell`)
export const moltenSlagBoulderCell = {
  duration: 1.0,
  loop: true,
  defaults: { palette: FORGE_GOLD_PALETTE, seed: 201 },
  create(cfg) {
    const gold = buildColorRamp(cfg.palette, 8);
    const jade = buildColorRamp(FORGE_JADE_PALETTE, 8);
    const band4 = [gold[2], jade[4], gold[6], PURE_WHITE];

    return {
      step() {},
      renderBack(pen, localT) {
        const ph = localT * Math.PI * 2;
        const headX = 6;
        drawTiltedOrbitBand(pen, headX, 0, 21, 0.38, 1.3, 0.86, band4, BACK_HALF, false);

        // Supersonic molten slag wake streaming left (`-X`, strictly inside `[-36, +24]`)
        pen.shadeBox(-36, -18, headX + 4, 18, (lx, ly, out) => {
          const tailU = clamp01((headX - lx) / 40);
          const halfH = (1 - tailU) * 12 + 1.5;
          const wave = Math.sin(tailU * 8 - ph * 3) * 1.8 * tailU;
          const dy = Math.abs(ly - wave);
          if (dy >= halfH) return 0;
          const n = fbmNoise2D(lx * 0.18 + ph * 1.6, ly * 0.22, cfg.seed, 2);
          const heat = (1 - dy / halfH) * (1 - tailU * 0.72) + n * 0.22;
          if (heat <= 0.24) return 0;
          const isJade = n > 0.22 && tailU > 0.25;
          const idx = Math.min(7, Math.max(1, Math.floor(heat * 7.6)));
          out.color = isJade ? jade[Math.min(6, idx)] : gold[idx];
          out.alpha = clamp01(heat * 1.25);
          out.glowColor = isJade ? jade[5] : gold[5];
          out.glowStrength = 0.26 * (1 - tailU);
          return out.color;
        });
      },
      renderFront(pen, localT) {
        const ph = localT * Math.PI * 2;
        const headX = 6;

        // Craggy Obsidian-Bronze & Molten-Gold Slag Boulder with Emerald-Jade Forge Veins
        pen.shadeBox(headX - 18, -18, headX + 18, 18, (lx, ly, out) => {
          const dx = lx - headX;
          const d = Math.hypot(dx, ly);
          const crag = fbmNoise2D(dx * 0.24 + Math.cos(ph), ly * 0.24 + Math.sin(ph), cfg.seed + 11, 2) * 3.2;
          const rockR = 13.5 + crag;
          if (d > rockR) return 0;

          const vein = Math.abs(fbmNoise2D(dx * 0.3 - ph * 0.5, ly * 0.3, cfg.seed + 29, 2));
          if (d < 4.2 || vein < 0.13) {
            out.color = d < 2.8 ? PURE_WHITE : vein < 0.07 ? jade[6] : gold[6];
            out.alpha = 1;
            out.glowColor = gold[5];
            out.glowStrength = 0.45;
          } else if (vein < 0.25) {
            out.color = gold[5];
            out.alpha = 0.98;
          } else {
            out.color = d > rockR - 2.2 ? gold[3] : gold[0];
            out.alpha = 0.98;
          }
          return out.color;
        });

        drawTiltedOrbitBand(pen, headX, 0, 21, 0.38, 1.4, 0.94, band4, FRONT_HALF, true);

        // Bow-shock crescent ahead of boulder (`+X`, max `x = 6 + 17 = 23 <= 38`)
        for (let i = -10; i <= 10; i++) {
          const f = i / 10;
          const ang = f * 1.1;
          const env = Math.cos(f * Math.PI * 0.5);
          const bx = headX + Math.cos(ang) * 17;
          const by = Math.sin(ang) * 17;
          pen.fillCircle(bx, by, 1.2 * env + 0.4, Math.abs(i) < 4 ? PURE_WHITE : gold[6], 0.92);
        }

        drawStarburstFlare(pen, headX + 3, 0, 8.5, 0.92, [gold[4], jade[5], gold[6], PURE_WHITE]);
      }
    };
  }
};

// 6. ROW 1: FORGE RUNE SHIELD CREST CELL (`forgeRuneShieldCrestCell`)
export const forgeRuneShieldCrestCell = {
  duration: 1.0,
  loop: true,
  defaults: { palette: FORGE_GOLD_PALETTE, seed: 213 },
  create(cfg) {
    const gold = buildColorRamp(cfg.palette, 8);
    const jade = buildColorRamp(FORGE_JADE_PALETTE, 8);
    const goldBand = [gold[2], jade[4], gold[6], PURE_WHITE];

    return {
      step() {},
      renderBack(pen, localT) {
        const ph = localT * Math.PI * 2;
        const pulse = 0.92 + 0.08 * Math.sin(ph);
        drawTiltedOrbitBand(pen, 0, 0, 31 * pulse, 0.36, 1.5, 0.88, goldBand, BACK_HALF, false);
        drawForgeStarCross(pen, 0, 0, 32 * pulse, 18 * pulse, 1.0, ph * 0.25, gold[4], jade[5], 0.82);
        pen.radialGlow(0, 0, 28, gold[4], 0.36);
      },
      renderFront(pen, localT) {
        const ph = localT * Math.PI * 2;
        const pulse = 0.92 + 0.08 * Math.sin(ph);

        // Sculpted Octagonal World-Forge Runic Shield Aegis (`[-24, +24] x [-26, +26]`)
        pen.shadeBox(-25, -27, 25, 27, (lx, ly, out) => {
          const ax = Math.abs(lx);
          const ay = Math.abs(ly);
          const oct = Math.max(ax * 1.08, ay, (ax + ay) * 0.76);
          const maxOct = 23.5 * pulse;
          if (oct > maxOct) return 0;

          // Bevelled Molten-Gold Rim (`maxOct - 3.2 <= oct <= maxOct`)
          if (oct >= maxOct - 3.2) {
            out.color = oct >= maxOct - 1.3 ? gold[6] : gold[4];
            out.alpha = 0.98;
            out.glowColor = gold[5];
            out.glowStrength = 0.28;
            return out.color;
          }

          // Inner Emerald-Jade & White-Gold Anvil Crest Silhouette
          const isAnvilTop = ly >= -9 && ly <= -2 && ax <= 12 - (ly + 9) * 0.35;
          const isAnvilWaist = ly > -2 && ly <= 5 && ax <= 5.5;
          const isAnvilBase = ly > 5 && ly <= 11 && ax <= 10.5;
          if (isAnvilTop || isAnvilWaist || isAnvilBase) {
            const coreDist = Math.hypot(lx, ly + 2);
            out.color = coreDist < 3.8 ? PURE_WHITE : ax < 3.2 ? jade[6] : jade[4];
            out.alpha = 1.0;
            out.glowColor = jade[5];
            out.glowStrength = 0.44;
            return out.color;
          }

          // Dark Obsidian-Bronze Shield Plate with subtle forge grain
          const grain = fbmNoise2D(lx * 0.25, ly * 0.25, cfg.seed, 2);
          out.color = grain > 0.2 ? gold[2] : gold[1];
          out.alpha = 0.95;
          return out.color;
        });

        drawTiltedOrbitBand(pen, 0, 0, 31 * pulse, 0.36, 1.6, 0.96, goldBand, FRONT_HALF, true);

        // 4 Orbiting Cardinal Runic Rivets (`r = 22`)
        for (let i = 0; i < 4; i++) {
          const a = ph + (i * Math.PI) / 2;
          const rx = Math.cos(a) * 22;
          const ry = Math.sin(a) * 22;
          drawPixelAnvilRune(pen, rx, ry, 2.2, i % 2 === 0 ? gold[6] : jade[5], PURE_WHITE, 0.95);
        }

        drawStarburstFlare(pen, 0, -4, 9.5, 0.94, [gold[4], jade[5], gold[6], PURE_WHITE]);
      }
    };
  }
};

// 7. ROW 2: TECTONIC MAGMA PILLAR CELL (`tectonicMagmaPillarCell`)
export const tectonicMagmaPillarCell = {
  duration: 1.0,
  loop: false,
  defaults: { palette: FORGE_GOLD_PALETTE, seed: 227 },
  create(cfg) {
    const gold = buildColorRamp(cfg.palette, 8);
    const jade = buildColorRamp(FORGE_JADE_PALETTE, 8);
    const band4 = [gold[2], jade[4], gold[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);

    return {
      step() {},
      renderBack(pen, localT) {
        const u = clamp01(localT);
        const pop = 0.42 + 0.58 * smoothStep(0, 0.16, u);
        const fade = 1 - smoothStep(0.76, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;
        const baseY = 31;
        drawTiltedOrbitBand(pen, 0, baseY, 27 * pop, 0.2, 1.5, 0.9 * env, band4, BACK_HALF, false);
      },
      renderFront(pen, localT) {
        const u = clamp01(localT);
        const pop = 0.42 + 0.58 * smoothStep(0, 0.16, u);
        const fade = 1 - smoothStep(0.76, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;

        const baseY = 31;
        const topY = baseY - 64 * pop;
        const halfW = 16.5 * (1 - 0.16 * smoothStep(0.68, 1.0, u));

        // Erupting Volcanic Basalt-Jade & Molten Magma Monolith Column (`[-24, +24] x [-35, +33]`)
        pen.shadeBox(-halfW - 6, topY - 4, halfW + 6, baseY + 3, (lx, ly, out) => {
          if (ly > baseY + 1 || ly < topY - 2) return 0;
          const hFrac = clamp01((baseY - ly) / Math.max(1, baseY - topY));
          const taper = 1 - hFrac * 0.3;
          const swirl = Math.sin(hFrac * 9 - u * 15) * 2.1;
          const n = fbmNoise2D(lx * 0.16, ly * 0.14 + u * 7, cfg.seed, 2);
          const effW = halfW * taper + n * 2.8;
          const d = Math.abs(lx - swirl * 0.4);
          if (d > effW) return 0;

          const coreRatio = 1 - d / Math.max(1, effW);
          const jadeVein = Math.abs(Math.sin(hFrac * 12 + lx * 0.25 - u * 10)) < 0.22;
          if (coreRatio > 0.74) {
            out.color = PURE_WHITE;
            out.alpha = env;
          } else if (coreRatio > 0.5) {
            out.color = jadeVein ? jade[6] : gold[6];
            out.alpha = 0.96 * env;
          } else if (coreRatio > 0.26) {
            out.color = jadeVein ? jade[4] : gold[5];
            out.alpha = 0.92 * env;
          } else {
            out.color = gold[1];
            out.alpha = 0.9 * env;
          }
          out.glowColor = jadeVein ? jade[5] : gold[5];
          out.glowStrength = 0.34 * coreRatio * env;
          return out.color;
        });

        drawTiltedOrbitBand(pen, 0, baseY, 27 * pop, 0.2, 1.7, 0.96 * env, band4, FRONT_HALF, true);

        const bolt = buildLightningChain(rng, 0, baseY - 2, 0, topY + 4, 0.14, 3);
        pen.polyline(bolt, jade[5], 0.88 * env);
        drawStarburstFlare(pen, 0, topY + 6, 9.5 * env, 0.92 * env, [gold[4], jade[5], gold[6], PURE_WHITE]);
      }
    };
  }
};

// 8. ROW 3: WORLD-FORGE ANVIL SEAL CELL (`worldForgeAnvilSealCell`)
export const worldForgeAnvilSealCell = {
  duration: 1.0,
  loop: true,
  defaults: { palette: FORGE_GOLD_PALETTE, seed: 239 },
  create(cfg) {
    const gold = buildColorRamp(cfg.palette, 8);
    const jade = buildColorRamp(FORGE_JADE_PALETTE, 8);
    const goldBand = [gold[2], jade[4], gold[6], PURE_WHITE];
    const jadeBand = [jade[2], jade[4], jade[6], PURE_WHITE];

    return {
      step() {},
      renderBack(pen, localT) {
        const ph = localT * Math.PI * 2;
        const baseY = 18;
        drawTiltedOrbitBand(pen, 0, baseY, 33, 0.24, 1.5, 0.88, goldBand, BACK_HALF, false);
        drawTiltedOrbitBand(pen, 0, baseY, 22, 0.24, 1.2, 0.82, jadeBand, BACK_HALF, false);
        drawForgeStarCross(pen, 0, baseY, 31, 16, 0.24, ph * 0.5, gold[5], jade[5], 0.8, BACK_HALF);
        pen.radialGlow(0, 0, 26, gold[5], 0.38);
      },
      renderFront(pen, localT) {
        const ph = localT * Math.PI * 2;
        const bob = Math.sin(ph) * 1.5;
        const baseY = 18;

        // Heavy Sculpted HD-2D Runic World-Forge Anvil (`x in [-27, +29], y in [-18, +20]`)
        pen.shadeBox(-28, -20 + bob, 30, 20 + bob, (lx, ly, out) => {
          const yRel = ly - bob;
          let halfW = -1;
          let centerShift = 0;

          if (yRel >= -16 && yRel <= -5) {
            // Anvil Strike Face + Forward Horn (`+X`) + Rear Heel (`-X`)
            const uTop = (yRel + 16) / 11;
            halfW = 24 - uTop * 5;
            centerShift = 1.5;
          } else if (yRel > -5 && yRel <= 6) {
            // Heavy Tapered Anvil Waist
            const uWaist = (yRel + 5) / 11;
            halfW = 11.5 + Math.abs(uWaist - 0.5) * 5;
          } else if (yRel > 6 && yRel <= 17) {
            // Stepped Crucible Pedestal Base
            const uBase = (yRel - 6) / 11;
            halfW = 16 + uBase * 5.5;
          }

          if (halfW < 0) return 0;
          const dx = lx - centerShift;
          if (Math.abs(dx) > halfW) return 0;

          // Glowing Emerald-Jade & White-Gold World-Forge Rune on Anvil Chest (`yRel in [-6, +6]`)
          const runeDist = Math.abs(dx) + Math.abs(yRel);
          if (runeDist <= 6.5) {
            out.color = runeDist <= 2.4 ? PURE_WHITE : runeDist <= 4.5 ? jade[6] : jade[4];
            out.alpha = 1.0;
            out.glowColor = jade[5];
            out.glowStrength = 0.48;
            return out.color;
          }

          // White-Hot Molten Top Strike Table (`yRel <= -13`) & Golden Bevel Trim
          if (yRel <= -13.2) {
            out.color = yRel <= -14.6 ? PURE_WHITE : gold[6];
            out.alpha = 1.0;
            out.glowColor = gold[6];
            out.glowStrength = 0.42;
            return out.color;
          }

          const isEdge = Math.abs(dx) >= halfW - 1.8 || Math.abs(yRel - 17) <= 1.5;
          out.color = isEdge ? gold[5] : yRel < 0 ? gold[2] : gold[0];
          out.alpha = 0.98;
          return out.color;
        });

        drawTiltedOrbitBand(pen, 0, baseY, 33, 0.24, 1.6, 0.96, goldBand, FRONT_HALF, true);
        drawTiltedOrbitBand(pen, 0, baseY, 22, 0.24, 1.3, 0.88, jadeBand, FRONT_HALF, false);
        drawForgeStarCross(pen, 0, baseY, 31, 16, 0.24, ph * 0.5, gold[6], jade[6], 0.92, FRONT_HALF);

        drawStarburstFlare(pen, 0, -14 + bob, 9.5, 0.94, [gold[4], jade[5], gold[6], PURE_WHITE]);
      }
    };
  }
};

// 9. ROW 4: CATACLYSM CRATER NOVA CELL (`cataclysmCraterNovaCell`)
export const cataclysmCraterNovaCell = {
  duration: 1.0,
  loop: false,
  defaults: { palette: FORGE_GOLD_PALETTE, seed: 251 },
  create(cfg) {
    const gold = buildColorRamp(cfg.palette, 8);
    const jade = buildColorRamp(FORGE_JADE_PALETTE, 8);
    const band4 = [gold[2], jade[4], gold[6], PURE_WHITE];

    return {
      step() {},
      renderBack(pen, localT) {
        const u = clamp01(localT);
        const pop = 0.42 + 0.58 * smoothStep(0, 0.2, u);
        const fade = 1 - smoothStep(0.72, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;

        drawTiltedOrbitBand(pen, -2, 0, 29 * pop, 0.85, 1.5, 0.85 * env, band4, BACK_HALF, false);
        drawForgeStarCross(pen, -2, 0, 26 * pop, 13 * pop, 0.85, u * 3.0, gold[5], jade[5], 0.84 * env);
      },
      renderFront(pen, localT) {
        const u = clamp01(localT);
        const pop = 0.42 + 0.58 * smoothStep(0, 0.2, u);
        const fade = 1 - smoothStep(0.72, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;

        drawTiltedOrbitBand(pen, -2, 0, 29 * pop, 0.85, 1.6, 0.94 * env, band4, FRONT_HALF, u < 0.3);

        drawMultiLayerCrescentArc(pen, {
          cx: -3,
          cy: 0,
          radius: 25 * pop,
          width: 8.5,
          eccentricity: 0.82,
          headAngle: 1.25,
          tailAngle: -1.25,
          fade: env,
          ramp: gold,
          seed: cfg.seed || 251,
          t: u,
          flashHot: u < 0.35
        });

        drawStarburstFlare(pen, 18 * pop, 0, 10.5 * env, 0.95 * env, [gold[4], jade[5], gold[6], PURE_WHITE]);
      }
    };
  }
};

export const FORGE_EFFECT_REGISTRY = {
  forgeMagmaMantle,
  worldBreakerAnvilCleave,
  tectonicCraterShockwave,
  ragnarokWorldForgeWave,
  moltenSlagBoulderCell,
  forgeRuneShieldCrestCell,
  tectonicMagmaPillarCell,
  worldForgeAnvilSealCell,
  cataclysmCraterNovaCell
};

export const FORGE_SHADER_PACK = FORGE_EFFECT_REGISTRY;
export default FORGE_EFFECT_REGISTRY;
