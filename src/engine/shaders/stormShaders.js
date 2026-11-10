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
  drawStarburstFlare,
  drawMultiLayerCrescentArc
} from '../ArcaneShaderFX.js?v=30fps62';

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

/**
 * Render a rotating 3-Comma Raijin Mitsudomoe Thunder-Drum Halo (`drawMitsudomoeDrumHalo`).
 */
function drawMitsudomoeDrumHalo(pen, cx, cy, r, rot, storm, raijin, alpha = 1) {
  if (alpha <= 0.03 || r <= 4) return;
  const band4 = [storm[2], storm[5], raijin[4], PURE_WHITE];
  drawTiltedOrbitBand(pen, cx, cy, r, 1.0, 1.55, 0.92 * alpha, band4, () => true, false);
  drawTiltedOrbitBand(pen, cx, cy, r * 0.64, 1.0, 1.15, 0.82 * alpha, [raijin[1], raijin[4], raijin[5], PURE_WHITE], () => true, false);

  // 3 Swirling Raijin Tomoe Commas (`Mitsudomoe`) inside the inner drum ring
  const commaOrbitR = r * 0.36;
  for (let k = 0; k < 3; k++) {
    const baseA = rot + (k * Math.PI * 2) / 3;
    const headX = cx + Math.cos(baseA) * commaOrbitR;
    const headY = cy + Math.sin(baseA) * commaOrbitR;
    const headR = Math.max(2.0, r * 0.125);
    pen.fillCircle(headX, headY, headR + 0.8, storm[0], alpha * 0.94);
    pen.fillCircle(headX, headY, headR, k % 2 === 0 ? raijin[5] : storm[5], alpha * 0.98);
    pen.stipple(headX, headY, PURE_WHITE, alpha);

    // Curved tapering Tomoe comma tail swirling behind the head
    for (let s = 1; s <= 9; s++) {
      const su = s / 9;
      const tailA = baseA - su * 1.35;
      const tailR = commaOrbitR * (1 + su * 0.42);
      const tx = cx + Math.cos(tailA) * tailR;
      const ty = cy + Math.sin(tailA) * tailR;
      const tr = headR * (1 - su * 0.78);
      pen.fillCircle(tx, ty, tr + 0.5, storm[0], alpha * 0.88);
      pen.fillCircle(tx, ty, tr, su < 0.5 ? raijin[6] : raijin[4], alpha * 0.94);
    }
  }

  // 8 Orbiting Raijin Taiko Drum Nodes around the outer ring
  for (let d = 0; d < 8; d++) {
    const a = -rot * 0.75 + (d * Math.PI) / 4;
    drawTaikoDrumNode(
      pen,
      cx + Math.cos(a) * r,
      cy + Math.sin(a) * r,
      2.3,
      d % 2 === 0 ? raijin[5] : storm[5],
      d % 2 === 0 ? raijin[6] : PURE_WHITE,
      alpha
    );
  }
}

/**
 * Render a curved Japanese Inazuma Odachi / Katana (`drawDiagonalInazumaOdachi`)
 * slicing at a diagonal angle `angleRad` (e.g. `±38°`), with its complete diamond-wrapped
 * tsuka hilt, brass tsuba handguard, curved sori blade, hamon temper line, and kissaki tip
 * 100% inside the cell bounds.
 */
function drawDiagonalInazumaOdachi(pen, cx, cy, totalLen, angleRad, curveSign, storm, raijin, alpha = 1) {
  if (alpha <= 0.03 || totalLen <= 10) return;
  const ux = Math.sin(angleRad);
  const uy = Math.cos(angleRad); // points downward-diagonal from hilt `(-halfL)` to tip `(+halfL)`
  const nx = Math.cos(angleRad) * curveSign;
  const ny = -Math.sin(angleRad) * curveSign;

  const halfL = totalLen * 0.5;
  const tsubaS = -halfL + totalLen * 0.25;

  // 1. Tsuka-Ito Diamond-Wrapped Katana Hilt (`s = -halfL .. tsubaS`) & Kashira Pommel Cap
  for (let s = -halfL; s <= tsubaS; s += 0.65) {
    const isKashira = s < -halfL + 2.2;
    const bx = cx + ux * s;
    const by = cy + uy * s;
    const hiltW = isKashira ? 2.1 : 1.55;
    const isBrassMenuki = Math.floor((s + halfL) * 0.62) % 2 === 0;
    for (let q = -hiltW - 0.5; q <= hiltW + 0.5; q += 0.55) {
      const aq = Math.abs(q);
      if (aq > hiltW + 0.35) continue;
      const col =
        aq >= hiltW - 0.45
          ? storm[0]
          : isKashira
            ? raijin[6]
            : isBrassMenuki
              ? raijin[5]
              : raijin[2];
      pen.stipple(bx + nx * q, by + ny * q, col, alpha * 0.98);
    }
  }

  // 2. Curved Single-Edged Sori Odachi Blade (`s = tsubaS .. +halfL`) with Kissaki Tip
  const bladeLen = halfL - tsubaS;
  for (let s = tsubaS; s <= halfL; s += 0.6) {
    const bFrac = (s - tsubaS) / Math.max(1, bladeLen); // 0 at habaki collar, 1 at kissaki point
    // Authentic Japanese sori (graceful parabolic katana curvature)
    const soriOffset = Math.sin(bFrac * Math.PI) * 3.4 + bFrac * bFrac * 1.4;
    const halfW =
      bFrac < 0.1
        ? 2.65 // Brass habaki collar
        : bFrac < 0.82
          ? 2.35 * (1 - (bFrac - 0.1) * 0.16)
          : 2.08 * Math.pow(Math.max(0, (1 - bFrac) / 0.18), 0.72); // Razor-sharp geometric kissaki tip

    const bx = cx + ux * s + nx * soriOffset;
    const by = cy + uy * s + ny * soriOffset;

    for (let q = -halfW - 0.6; q <= halfW + 0.6; q += 0.5) {
      const aq = Math.abs(q);
      if (aq > halfW + 0.25) continue;
      const px = bx + nx * q;
      const py = by + ny * q;

      // 1px Dark Storm-Indigo Selective Outline (`Selout`)
      if (aq >= halfW - 0.65 || bFrac > 0.96) {
        pen.stipple(px, py, bFrac > 0.94 ? PURE_WHITE : storm[0], alpha * 0.98);
        continue;
      }

      // Golden-Brass Habaki Blade Collar (`bFrac < 0.09`)
      if (bFrac < 0.09) {
        pen.stipple(px, py, q > 0 ? raijin[6] : raijin[5], alpha);
        continue;
      }

      // Wavy Inazuma Hamon Temper Line & Incandescent Ha Cutting Edge (`q > 0`) vs Mune Spine (`q < 0`)
      const hamonWave = Math.sin(bFrac * 22) * 0.35;
      if (q >= hamonWave) {
        const edgeCol = q > halfW * 0.35 ? PURE_WHITE : storm[6];
        pen.stipple(px, py, edgeCol, alpha);
      } else {
        pen.stipple(px, py, curveSign > 0 ? storm[4] : raijin[4], alpha * 0.96);
      }
    }
  }

  // 3. Ornate Brass & Violet Tsuba Handguard Disk at `s = tsubaS`
  const tx = cx + ux * tsubaS;
  const ty = cy + uy * tsubaS;
  const tsubaSpan = 6.2;
  pen.line(
    tx - nx * tsubaSpan - ux * 0.6,
    ty - ny * tsubaSpan - uy * 0.6,
    tx + nx * tsubaSpan - ux * 0.6,
    ty + ny * tsubaSpan - uy * 0.6,
    storm[0],
    alpha * 0.98
  );
  pen.line(
    tx - nx * tsubaSpan + ux * 0.6,
    ty - ny * tsubaSpan + uy * 0.6,
    tx + nx * tsubaSpan + ux * 0.6,
    ty + ny * tsubaSpan + uy * 0.6,
    storm[0],
    alpha * 0.98
  );
  pen.line(tx - nx * tsubaSpan, ty - ny * tsubaSpan, tx + nx * tsubaSpan, ty + ny * tsubaSpan, raijin[5], alpha);
  pen.line(
    tx - nx * (tsubaSpan * 0.65),
    ty - ny * (tsubaSpan * 0.65),
    tx + nx * (tsubaSpan * 0.65),
    ty + ny * (tsubaSpan * 0.65),
    raijin[6],
    alpha
  );
  pen.stipple(tx, ty, PURE_WHITE, alpha);
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
        const pop = 0.76 + 0.24 * smoothStep(0, 0.18, u);
        const fade = 1 - smoothStep(0.82, 1.0, u);
        const env = (0.9 + 0.1 * Math.sin(u * Math.PI)) * fade;
        if (env <= 0.02) return;

        const rot = u * Math.PI * 2.2;
        const slashAngle = (38 * Math.PI) / 180; // ±38° diagonal crossed twin-odachi cleave

        // 1. Rotating 3-Comma Raijin Tomoe Thunder-Drum Halo (`r = 26 * pop`, strictly inside `[-35, +35]`)
        drawMitsudomoeDrumHalo(pen, 0, 0, 26 * pop, rot, storm, raijin, env * 0.94);

        // 2. Sweeping Diagonal Inazuma Crescent Slash Waves (`drawMultiLayerCrescentArc`)
        drawMultiLayerCrescentArc(pen, {
          cx: -2,
          cy: 1,
          radius: 23 * pop,
          width: 7.2,
          eccentricity: 0.86,
          headAngle: 0.88 + u * 0.35,
          tailAngle: -0.95 + u * 0.35,
          fade: env * 0.92,
          ramp: storm,
          seed: cfg.seed || 413,
          t: u,
          flashHot: u < 0.38
        });
        drawMultiLayerCrescentArc(pen, {
          cx: 2,
          cy: 1,
          radius: 21 * pop,
          width: 6.4,
          eccentricity: 0.86,
          headAngle: Math.PI - 0.88 - u * 0.35,
          tailAngle: Math.PI + 0.95 - u * 0.35,
          fade: env * 0.88,
          ramp: raijin,
          seed: (cfg.seed || 413) + 29,
          t: u,
          flashHot: u < 0.38
        });

        // 3. Diagonal Crossed Inazuma Twin-Odachi Blades slicing at `±38°` (complete hilts & kissaki tips inside cell!)
        const odachiLen = 58 * pop;
        drawDiagonalInazumaOdachi(pen, 0, 0, odachiLen, slashAngle, 1, storm, raijin, env);
        drawDiagonalInazumaOdachi(pen, 0, 0, odachiLen, -slashAngle, -1, storm, raijin, env);

        // 4. Crackling Diagonal Inazuma Lightning Chains & 2.5D Thunder Shock-Ring
        const diagX = 21 * pop;
        const diagY = 25 * pop;
        const boltA = buildLightningChain(rng, -diagX, -diagY, diagX, diagY, 0.14, 3);
        const boltB = buildLightningChain(rng, diagX, -diagY, -diagX, diagY, 0.14, 3);
        pen.polyline(boltA, storm[6], 0.9 * env);
        pen.polyline(boltB, raijin[6], 0.9 * env);

        drawTiltedOrbitBand(pen, 0, 2, 28 * pop, 0.32, 1.5, 0.92 * env, band4, FRONT_HALF, u < 0.35);
        drawStarburstFlare(pen, 0, 1, 11.5 * pop, env * 0.96, [storm[4], storm[6], raijin[6], PURE_WHITE]);
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
    const violetBand4 = [raijin[1], raijin[4], raijin[6], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);

    return {
      step() {},
      renderBack(pen, localT) {
        const p = clamp01(localT);
        const pop = 0.72 + 0.28 * smoothStep(0, 0.18, p);
        const fade = 1 - smoothStep(0.82, 1.0, p);
        const env = (0.9 + 0.1 * smoothStep(0, 0.12, p)) * fade;
        if (env <= 0.02) return;

        const baseY = 28;
        // Back half of the curved 2.5D elliptical storm-cloud vortex at the base
        drawTiltedOrbitBand(pen, 0, baseY, 26 * pop, 0.24, 1.6, 0.9 * env, band4, BACK_HALF, false);
        drawTiltedOrbitBand(pen, 0, baseY, 17 * pop, 0.24, 1.3, 0.84 * env, violetBand4, BACK_HALF, false);
      },
      renderFront(pen, localT) {
        const p = clamp01(localT);
        const pop = 0.72 + 0.28 * smoothStep(0, 0.18, p);
        const fade = 1 - smoothStep(0.82, 1.0, p);
        const env = (0.9 + 0.1 * smoothStep(0, 0.12, p)) * fade;
        if (env <= 0.02) return;

        const baseY = 28;
        const dragonH = 50 * pop; // Top neck at `y = 28 - 50 = -22`, dragon head & horns stay inside `[-35, +35]`

        // 1. Billowing Storm-Cloud Vortex Puffs at the Base (`baseY = 28`)
        for (let k = 0; k < 8; k++) {
          const ca = p * 4.5 + (k * Math.PI) / 4;
          const cx = Math.cos(ca) * 20 * pop;
          const cy = baseY + Math.sin(ca) * 20 * pop * 0.24;
          const cr = (2.8 + (k % 2) * 1.1) * pop;
          pen.fillCircle(cx, cy, cr + 0.8, storm[0], env * 0.92);
          pen.fillCircle(cx, cy, cr, k % 2 === 0 ? raijin[2] : storm[2], env * 0.94);
          pen.stipple(cx, cy - 0.8, k % 2 === 0 ? raijin[5] : storm[5], env * 0.9);
        }

        // 2. Coiling S-Curve Raijin Thunder-Dragon Body (`spineX = Math.sin(dy * 0.09 + p * 8) * 22 * taper`)
        const spinePts = [];
        for (let dy = 0; dy <= dragonH; dy += 0.9) {
          const hFrac = dy / Math.max(1, dragonH);
          const taper = (0.34 + 0.66 * Math.sin(hFrac * Math.PI)) * (1 - hFrac * 0.26);
          const spineX = Math.sin(dy * 0.09 + p * 8) * 22 * taper;
          const sy = baseY - dy;
          spinePts.push([spineX, sy, hFrac, taper]);
        }

        // First pass along S-curve: 1px Dark Storm-Indigo Selective Outline (`Selout`) + Dorsal Fin Spikes
        for (let i = 0; i < spinePts.length; i++) {
          const [sx, sy, hFrac] = spinePts[i];
          const bodyR = (1 - hFrac * 0.36) * 4.6 + 1.8;
          pen.fillCircle(sx, sy, bodyR + 1.0, storm[0], env * 0.96);

          // Golden-Brass & Violet Dorsal Spine Fins protruding along the outer curve of the S-bend
          if (i % 4 === 2 && hFrac > 0.08 && hFrac < 0.92) {
            const nextPt = spinePts[Math.min(spinePts.length - 1, i + 1)];
            const prevPt = spinePts[Math.max(0, i - 1)];
            const dx = nextPt[0] - prevPt[0];
            const dy = nextPt[1] - prevPt[1];
            const len = Math.hypot(dx, dy) || 1;
            const outSign = sx >= 0 ? 1 : -1;
            const nx = (-dy / len) * outSign;
            const ny = (dx / len) * outSign;
            const finLen = bodyR + 3.4;
            const fx = sx + nx * finLen;
            const fy = sy + ny * finLen - 1.2;
            pen.line(sx + nx * (bodyR * 0.5), sy, fx, fy, storm[0], env * 0.96);
            pen.line(sx + nx * (bodyR * 0.5), sy - 0.6, fx, fy, raijin[6], env * 0.98);
            pen.stipple(fx, fy, PURE_WHITE, env);
          }
        }

        // Second pass along S-curve: Segmented Violet-Cyan Dragon Scales, Belly Plates & Incandescent Spine Core
        for (let i = 0; i < spinePts.length; i++) {
          const [sx, sy, hFrac] = spinePts[i];
          const bodyR = (1 - hFrac * 0.36) * 4.6 + 1.8;
          const isBellyBand = i % 3 === 0;
          pen.fillCircle(sx, sy, bodyR, isBellyBand ? raijin[4] : storm[4], env * 0.98);
          pen.fillCircle(sx - 0.6, sy - 0.4, bodyR * 0.68, isBellyBand ? raijin[6] : storm[6], env);
          pen.fillCircle(sx, sy, Math.max(1.1, bodyR * 0.36), PURE_WHITE, env);
        }

        // Two Clawed Raijin Dragon Forelegs grasping outward from the S-coils
        for (const [coilIdx, side] of [
          [Math.floor(spinePts.length * 0.38), -1],
          [Math.floor(spinePts.length * 0.68), 1]
        ]) {
          const pt = spinePts[coilIdx];
          if (!pt) continue;
          const [cx, cy] = pt;
          const elbowX = cx + side * 6.5;
          const elbowY = cy + 1.5;
          const wristX = cx + side * 11.0;
          const wristY = cy - 1.5;
          pen.line(cx, cy, elbowX, elbowY, storm[0], env * 0.98);
          pen.line(elbowX, elbowY, wristX, wristY, storm[5], env * 0.98);
          pen.line(cx, cy - 0.8, elbowX, elbowY - 0.8, raijin[5], env * 0.96);
          // 3 Golden-White Dragon Talons
          for (let c = -1; c <= 1; c++) {
            const tx = wristX + side * 3.4;
            const ty = wristY + c * 2.4 - 0.8;
            pen.line(wristX, wristY, tx, ty, raijin[6], env * 0.98);
            pen.stipple(tx, ty, PURE_WHITE, env);
          }
        }

        // 3. Fierce Horned Dragon Jaws & Whiskers Head at the Top Apex!
        const topPt = spinePts[spinePts.length - 1] || [0, baseY - dragonH];
        const headX = topPt[0];
        const headY = topPt[1] - 1.5;

        // Twin Swept Golden-Brass & Violet Dragon Antler Horns (strictly inside `y >= -35`)
        for (const side of [-1, 1]) {
          const h1x = headX + side * 8.5;
          const h1y = Math.max(-34, headY - 8.5);
          const h2x = headX + side * 5.2;
          const h2y = Math.max(-34, headY - 10.0);
          pen.line(headX + side * 2.5, headY - 2.5, h1x, h1y, storm[0], env * 0.98);
          pen.line(headX + side * 2.0, headY - 3.0, h1x, h1y, raijin[5], env);
          pen.line(headX + side * 1.8, headY - 3.2, h2x, h2y, raijin[6], env);
          pen.stipple(h1x, h1y, PURE_WHITE, env);
          pen.stipple(h2x, h2y, PURE_WHITE, env);
        }

        // Armored Dragon Cranium, Upper Snout & Open Lower Fang-Jaw
        pen.fillCircle(headX, headY, 6.2, storm[0], env * 0.98);
        pen.fillCircle(headX, headY, 5.1, storm[5], env);
        pen.fillCircle(headX, headY - 1.0, 3.6, storm[6], env);
        // Upper Snout extending forward-right (`+X, -Y`) & Lower Fang-Jaw (`+X, +Y`)
        const snoutX = headX + 8.5;
        const snoutY = headY - 2.2;
        const jawX = headX + 7.8;
        const jawY = headY + 3.4;
        pen.line(headX + 1, headY - 2.5, snoutX, snoutY, storm[0], env * 0.98);
        pen.line(headX + 1, headY - 1.5, snoutX, snoutY, storm[6], env);
        pen.line(headX + 1, headY + 2.5, jawX, jawY, storm[0], env * 0.98);
        pen.line(headX + 1, headY + 1.6, jawX, jawY, raijin[4], env);
        // Razor-sharp Pure-White Dragon Fangs & Roaring Lightning Breath Pearl in Jaws
        pen.stipple(snoutX - 1.2, snoutY + 1.4, PURE_WHITE, env);
        pen.stipple(snoutX - 3.2, snoutY + 1.2, PURE_WHITE, env);
        pen.stipple(jawX - 1.2, jawY - 1.4, PURE_WHITE, env);
        pen.fillCircle(headX + 5.6, headY + 0.5, 2.0, PURE_WHITE, env);
        // Blazing Raijin Dragon Eye under Armored Brow
        pen.line(headX - 2.5, headY - 2.2, headX + 1.8, headY - 1.4, raijin[6], env);
        pen.stipple(headX - 0.5, headY - 1.5, PURE_WHITE, env);

        // Flowing Sinuous Lightning Whiskers streaming outward from the Dragon Snout
        for (const side of [-1, 1]) {
          const wPts = [];
          for (let w = 0; w <= 6; w++) {
            const wu = w / 6;
            const wx = headX + side * (3.5 + wu * 11.5);
            const wy = headY + 0.5 + Math.sin(wu * Math.PI * 1.6 + p * 10 + side) * 3.2;
            wPts.push([wx, wy]);
          }
          pen.polyline(wPts, side > 0 ? raijin[6] : storm[6], env * 0.95);
          pen.stipple(wPts[wPts.length - 1][0], wPts[wPts.length - 1][1], PURE_WHITE, env);
        }

        // 4. Crackling S-Curve Lightning Arcs & Front Half of Curved 2.5D Elliptical Storm-Cloud Vortex
        const dragonChain = buildLightningChain(rng, 0, baseY - 2, headX, headY + 2, 0.15, 4);
        pen.polyline(dragonChain, raijin[6], 0.92 * env);
        pen.polyline(dragonChain, PURE_WHITE, 0.9 * env);

        drawTiltedOrbitBand(pen, 0, baseY, 26 * pop, 0.24, 1.75, 0.96 * env, band4, FRONT_HALF, p < 0.35);
        drawTiltedOrbitBand(pen, 0, baseY, 17 * pop, 0.24, 1.35, 0.9 * env, violetBand4, FRONT_HALF, false);
        for (let d = 0; d < 4; d++) {
          const a = p * 3.6 + (d * Math.PI) / 2;
          if (Math.sin(a) < 0) continue;
          drawTaikoDrumNode(
            pen,
            Math.cos(a) * 26 * pop,
            baseY + Math.sin(a) * 26 * pop * 0.24,
            2.1,
            raijin[5],
            PURE_WHITE,
            env
          );
        }

        drawStarburstFlare(pen, headX + 4, headY, 8.5 * pop, 0.94 * env, [storm[4], storm[6], raijin[6], PURE_WHITE]);
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
