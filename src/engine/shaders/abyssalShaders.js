/**
 * Abyssal Necropolis & Blood-Moon Reaper Shader Suite (`abyssalShaders.js`)
 * First-party 120Hz 2.5D pixel-shader & particle effects for Malakor (`reaper` / `Reaper.js`).
 *
 * Powers both:
 *   1. Live 120Hz `ArcaneShaderFX` (`back` + `front` 2.5D depth wraps around Malakor & opponents)
 *   2. Offline 30fps `assets/sprites/reaper_vfx.png` (`6240x1664`, 8 rows x 30 cols @ 208x208, 0/240 border clips)
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
} from '../ArcaneShaderFX.js?v=30fps64';

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
/**
 * Shared HD-2D renderer: Colossal Floating 3D Horned Lich Skull & Scissoring X-Crossed Twin Great-Scythes Guillotine.
 * Zero upright cone, zero bottom ring — features scissoring twin obsidian-and-magenta great-scythes
 * sweeping from wide open (±55°) to a lethal X-cross guillotine snap (±18°), swept-back curved ram/demon horns (±30px),
 * detailed 2.5D cranium (rx=16, ry=18) with deep void nasal cavity, blazing magenta-white eye sockets with trailing soul-fire,
 * and an articulated lower mandible jaw that opens in a demonic roar as the scythes scissor shut.
 */
function drawHornedLichSkullGuillotine(pen, cx, cy, scale, progress, env, abyss, blood, bone) {
  if (env <= 0.02) return;
  const DARK_OUTLINE = '#090314';

  // Scissor progression: sweeps from wide open (±55° = 0.96 rad) to lethal X-cross guillotine snap (±18° = 0.314 rad)
  const snapU = smoothStep(0.06, 0.56, progress);
  const scissorDeg = 55 - snapU * 37 + Math.sin(progress * Math.PI * 4) * 2.5;
  const scissorRad = (scissorDeg * Math.PI) / 180;
  const jawOpen = (1.2 + snapU * 5.8) * scale;

  pen.radialGlow(cx, cy - 2 * scale, 28 * scale * env, abyss[5], 0.32 * env);

  // -------------------------------------------------------------------------
  // 1. Twin Colossal Scissoring X-Crossed Great-Scythes (Behind the Skull)
  // -------------------------------------------------------------------------
  const pivotX = cx;
  const pivotY = cy + 2 * scale;
  for (const side of [-1, 1]) {
    // Scythe shaft axis tilted by side * scissorRad from vertical
    const ang = -Math.PI * 0.5 + side * scissorRad;
    const ux = Math.cos(ang);
    const uy = Math.sin(ang);
    const nx = -uy * side; // points outward away from center
    const ny = ux * side;

    // Crossed lower haft handle -> upper scythe blade collar
    const haftBotX = pivotX - ux * 24 * scale;
    const haftBotY = pivotY - uy * 24 * scale;
    const collarX = pivotX + ux * 20 * scale;
    const collarY = pivotY + uy * 20 * scale;

    // Obsidian haft with dark selout & glowing soul-runes
    pen.line(haftBotX - nx * 1.1, haftBotY - ny * 1.1, collarX - nx * 1.1, collarY - ny * 1.1, DARK_OUTLINE, 0.95 * env);
    pen.line(haftBotX + nx * 1.1, haftBotY + ny * 1.1, collarX + nx * 1.1, collarY + ny * 1.1, DARK_OUTLINE, 0.95 * env);
    pen.line(haftBotX, haftBotY, collarX, collarY, bone[3], 0.96 * env);
    for (let r = 0; r < 5; r++) {
      const ru = (r + 0.5) / 5;
      const rx = haftBotX + (collarX - haftBotX) * ru;
      const ry = haftBotY + (collarY - haftBotY) * ru;
      pen.stipple(rx, ry, r % 2 === 0 ? abyss[6] : blood[5], 0.96 * env);
    }
    // Pommel spike at bottom of crossed haft
    pen.fillCircle(haftBotX, haftBotY, 2.0 * scale, DARK_OUTLINE, 0.95 * env);
    pen.fillCircle(haftBotX, haftBotY, 1.3 * scale, blood[5], 0.96 * env);

    // Colossal curved crescent guillotine blade hooking inward & across from collar
    const bladeSteps = 16;
    for (let s = 0; s <= bladeSteps; s++) {
      const su = s / bladeSteps;
      // Curve sweeps outward slightly then hooks sharply inward & downward like a guillotine crescent
      const bAng = ang - side * (0.28 + su * 1.85);
      const bRad = (4 + Math.sin(su * Math.PI * 0.88) * 24) * scale;
      const bx = collarX + Math.cos(bAng) * bRad;
      const by = collarY + Math.sin(bAng) * bRad;
      const thick = (1 - su * 0.62) * 3.4 * scale + 0.7;

      // Outer obsidian spine + dark selout
      pen.fillCircle(bx, by, thick + 0.9, DARK_OUTLINE, 0.96 * env);
      pen.fillCircle(bx, by, thick, su < 0.25 ? bone[4] : abyss[2], 0.96 * env);

      // Inner razor-sharp magenta/crimson bevel edge
      const inX = bx - Math.cos(bAng - side * 1.2) * (thick * 0.55);
      const inY = by - Math.sin(bAng - side * 1.2) * (thick * 0.55);
      pen.fillCircle(
        inX,
        inY,
        thick * 0.58,
        su < 0.75 ? (s % 2 === 0 ? abyss[6] : blood[5]) : PURE_WHITE,
        0.98 * env
      );
      if (s % 3 === 0 && su < 0.85) {
        pen.stipple(bx, by, PURE_WHITE, 0.96 * env);
      }
    }
  }

  // Guillotine X-snap spark flare above skull when blades cross
  if (snapU > 0.65) {
    drawStarburstFlare(pen, cx, cy - 22 * scale, 9 * scale * env, 0.92 * env, [
      abyss[4],
      blood[5],
      abyss[6],
      PURE_WHITE
    ]);
  }

  // -------------------------------------------------------------------------
  // 2. Swept-Back Curved Obsidian Ram / Demon Horns (reaching ±30px)
  // -------------------------------------------------------------------------
  for (const side of [-1, 1]) {
    const hRootX = cx + side * 10.5 * scale;
    const hRootY = cy - 9.5 * scale;
    const hornSegs = 12;
    for (let h = 0; h <= hornSegs; h++) {
      const hu = h / hornSegs;
      // Curves wide out to ±29*scale, sweeps high to -24*scale, then hooks inward at tip
      const hx =
        hRootX +
        side * (Math.sin(hu * Math.PI * 0.72) * 18.5 * scale - Math.pow(hu, 2.4) * 4.5 * scale);
      const hy = hRootY - hu * 14.5 * scale + Math.sin(hu * Math.PI) * 3.2 * scale;
      const hr = (1 - hu * 0.72) * 3.8 * scale + 0.7;

      pen.fillCircle(hx, hy, hr + 0.85, DARK_OUTLINE, 0.96 * env);
      pen.fillCircle(
        hx,
        hy,
        hr,
        hu > 0.82 ? blood[5] : h % 2 === 0 ? bone[3] : abyss[1],
        0.98 * env
      );
      if (h % 2 === 0 && hu < 0.75) {
        pen.stipple(hx - side * 0.6, hy - 0.6, bone[5], 0.92 * env);
      }
    }
  }

  // -------------------------------------------------------------------------
  // 3. Detailed 2.5D Pixel-Art Horned Abyssal Lich Skull Cranium (rx=16, ry=18)
  // -------------------------------------------------------------------------
  const skullCy = cy - 3.5 * scale;
  const craniumRx = 15.5 * scale;
  const craniumRy = 14.5 * scale;

  // Roaring Demonic Mouth Void between Upper Maxilla and Lower Mandible Jaw
  const mouthTopY = skullCy + 8.0 * scale;
  const jawCy = mouthTopY + jawOpen;
  pen.shadeBox(cx - 10 * scale, mouthTopY - 1, cx + 10 * scale, jawCy + 6 * scale, (lx, ly, out) => {
    const dx = Math.abs(lx - cx);
    const maxJawW = 9.2 * scale * (1 - clamp01((ly - mouthTopY) / (11 * scale)) * 0.32);
    if (dx > maxJawW) return 0;

    // Inside open roaring mouth cavity
    if (ly >= mouthTopY && ly <= jawCy + 1.2 * scale) {
      if (dx > maxJawW - 1.2 * scale) {
        out.color = DARK_OUTLINE;
        out.alpha = 0.96 * env;
        return out.color;
      }
      const coreDist = Math.hypot(dx / (6 * scale), (ly - (mouthTopY + jawOpen * 0.5)) / Math.max(1, jawOpen * 0.7));
      out.color = coreDist < 0.48 ? PURE_WHITE : coreDist < 0.82 ? abyss[6] : blood[4];
      out.alpha = 0.96 * env;
      out.glowColor = blood[5];
      out.glowStrength = 0.42 * env;
      return out.color;
    }

    // Articulated U-shaped Lower Mandible Jawbone
    if (ly > jawCy + 1.2 * scale) {
      const chinCurve = Math.sqrt(Math.max(0, 1 - Math.pow(dx / Math.max(1, maxJawW), 2))) * 4.5 * scale;
      if (ly > jawCy + 1.2 * scale + chinCurve) return 0;
      if (dx > maxJawW - 1.2 * scale || ly > jawCy + chinCurve) {
        out.color = DARK_OUTLINE;
        out.alpha = 0.98 * env;
        return out.color;
      }
      out.color = dx < 3.5 * scale ? bone[6] : bone[4];
      out.alpha = 0.98 * env;
      return out.color;
    }
    return 0;
  });

  // Upper Cranium Dome + Flared Zygomatic Cheekbones + Upper Maxilla
  pen.shadeBox(
    cx - craniumRx - 2,
    skullCy - craniumRy - 2,
    cx + craniumRx + 2,
    mouthTopY + 2,
    (lx, ly, out) => {
      const dx = lx - cx;
      const adx = Math.abs(dx);
      const dy = ly - skullCy;

      // Sculpted skull silhouette width at vertical offset dy
      let halfW = 0;
      if (dy < -1.5 * scale) {
        // Rounded upper cranium dome
        const uY = clamp01(-dy / craniumRy);
        if (uY > 1) return 0;
        halfW = Math.sqrt(1 - uY * uY) * craniumRx;
      } else if (dy <= 4.5 * scale) {
        // Flared zygomatic cheekbones
        const cheekU = (dy + 1.5 * scale) / (6.0 * scale);
        halfW = (14.2 + Math.sin(cheekU * Math.PI) * 1.8 - cheekU * 2.4) * scale;
      } else if (dy <= 8.2 * scale) {
        // Upper maxilla jaw & teeth row
        halfW = 9.5 * scale;
      } else {
        return 0;
      }

      if (adx > halfW) return 0;

      // Crisp 1px dark selective outline around skull silhouette & temple sutures
      const topDist = craniumRy + dy;
      if (adx > halfW - 1.3 * scale || topDist < 1.3 * scale) {
        out.color = DARK_OUTLINE;
        out.alpha = 0.98 * env;
        return out.color;
      }

      // Deep Void Nasal Cavity (inverted Gothic triangle at center)
      if (dy >= 0.2 * scale && dy <= 4.8 * scale) {
        const nasalW = ((dy - 0.2 * scale) / (4.6 * scale)) * 2.8 * scale + 0.4 * scale;
        if (adx <= nasalW && adx > 0.35 * scale) {
          out.color = DARK_OUTLINE;
          out.alpha = 0.98 * env;
          return out.color;
        }
      }

      // Upper Maxilla Teeth Row (individual carved fangs separated by dark gaps)
      if (dy >= 5.6 * scale) {
        const toothSlot = Math.floor((adx / scale + 0.5) / 2.2);
        const inGap = Math.abs((adx / scale) - toothSlot * 2.2) < 0.42 || dy < 6.2 * scale;
        out.color = inGap ? DARK_OUTLINE : bone[6];
        out.alpha = 0.98 * env;
        return out.color;
      }

      // Glowing Forehead Lich Crown Rune
      if (dy >= -10.5 * scale && dy <= -3.5 * scale) {
        const inRuneV = adx < 1.2 * scale;
        const inRuneH = Math.abs(dy + 7.2 * scale) < 1.1 * scale && adx < 4.5 * scale;
        if (inRuneV || inRuneH) {
          out.color = adx < 0.6 * scale ? PURE_WHITE : abyss[6];
          out.alpha = env;
          out.glowColor = blood[5];
          out.glowStrength = 0.45 * env;
          return out.color;
        }
      }

      // 2.5D Cel-Shaded Bone Lighting across Cranium & Cheekbones
      const light = (1 - adx / halfW) * 0.65 + (1 - (dy + craniumRy) / (craniumRy * 1.7)) * 0.45;
      out.color =
        light > 0.74
          ? PURE_WHITE
          : light > 0.56
            ? bone[6]
            : light > 0.38
              ? bone[5]
              : bone[3];
      out.alpha = 0.98 * env;
      return out.color;
    }
  );

  // Lower Mandible Fangs pointing upward
  for (let t = -2; t <= 2; t++) {
    const tx = cx + t * 3.2 * scale;
    pen.line(tx, jawCy + 1.2 * scale, tx, jawCy - 0.8 * scale, bone[6], 0.98 * env);
  }

  // -------------------------------------------------------------------------
  // 4. Blazing Magenta-White Eye Sockets with Trailing Soul-Fire
  // -------------------------------------------------------------------------
  for (const side of [-1, 1]) {
    const ex = cx + side * 6.0 * scale;
    const ey = skullCy - 1.2 * scale;
    pen.fillCircle(ex, ey, 3.8 * scale, DARK_OUTLINE, 0.98 * env);
    pen.fillCircle(ex, ey, 2.6 * scale, blood[5], 0.98 * env);
    pen.fillCircle(ex, ey, 1.7 * scale, abyss[6], 1.0 * env);
    pen.fillCircle(ex - side * 0.4 * scale, ey - 0.3 * scale, 1.0 * scale, PURE_WHITE, 1.0 * env);

    // Trailing soul-fire wisps streaming from outer eye corners
    for (let w = 1; w <= 5; w++) {
      const wu = w / 5;
      const wx = ex + side * (2.2 + wu * 6.5) * scale;
      const wy = ey - wu * 5.8 * scale + Math.sin(progress * Math.PI * 6 + w) * 1.2 * scale;
      pen.fillCircle(wx, wy, (1 - wu * 0.55) * 1.6 * scale, w <= 2 ? PURE_WHITE : w <= 4 ? abyss[6] : blood[5], (1 - wu * 0.3) * env);
    }
  }
}

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
        const u = (phase % 0.85) / 0.85;
        if (!cfg.isSubmerged) {
          drawHornedLichSkullGuillotine(pen, 0, -24, (rx / 28) * 0.78, u, 0.88, abyss, blood, bone);
        }
      },
      renderFront(pen) {
        motes.render(pen);
      }
    };
  }
};

export const wraithShadowMantle = abyssalWraithMantle;

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

/**
 * Shared HD-2D renderer: Ground-Erupting Jagged Necrotic Bone & Soul-Crystal Fangs
 * anchored at `baseY` (default `34` in 104x104 cell space) with a curved 2.5D ossuary crater base:
 *   `botCurve = baseY + Math.sqrt(Math.max(0, 1 - (dx/halfW)^2)) * 4.2` (never a flat horizontal cut!)
 * so when spawned on `this.groundY`, jagged bone ribs and violet/magenta soul-crystals burst
 * directly out of the arena floor!
 */
function drawGroundBoneCrystalEruption(pen, cx, baseY, scale, progress, env, abyss, blood, bone) {
  if (env <= 0.02) return;
  const DARK_OUTLINE = '#090314';
  const pop = smoothStep(0, 0.18, progress);
  const halfW = 28.5 * scale * (0.78 + 0.22 * pop);
  const maxH = 48.0 * scale * pop;
  if (halfW <= 2 || maxH <= 2) return;

  // 2.5D Ossuary Crater Floor Ring at baseY
  drawTiltedOrbitBand(
    pen,
    cx,
    baseY,
    halfW * 0.96,
    0.16,
    1.6,
    0.92 * env,
    [abyss[1], abyss[5], blood[5], PURE_WHITE],
    null,
    progress < 0.28
  );

  // 7 Ground-Erupting Jagged Bone Ribs & Faceted Violet/Magenta Soul-Crystal Fangs
  // Rising from baseY=34 all the way into the crowning Horned Lich Skull & Twin Great-Scythes!
  const fangs = [
    { bOff: -0.74, lean: -0.88, hFrac: 0.56, w: 5.2 * scale, isCrystal: true },
    { bOff: -0.46, lean: -0.58, hFrac: 0.78, w: 5.8 * scale, isCrystal: false },
    { bOff: -0.20, lean: -0.26, hFrac: 0.92, w: 6.4 * scale, isCrystal: true },
    { bOff: 0.0, lean: 0.0, hFrac: 1.0, w: 8.2 * scale, isCrystal: false },
    { bOff: 0.20, lean: 0.26, hFrac: 0.92, w: 6.4 * scale, isCrystal: true },
    { bOff: 0.46, lean: 0.58, hFrac: 0.78, w: 5.8 * scale, isCrystal: false },
    { bOff: 0.74, lean: 0.88, hFrac: 0.56, w: 5.2 * scale, isCrystal: true }
  ];

  pen.shadeBox(
    cx - halfW - 2,
    baseY - maxH - 2,
    cx + halfW + 2,
    baseY + 5.0 * scale,
    (lx, ly, out) => {
      const dx = lx - cx;
      const adx = Math.abs(dx);
      if (adx > halfW) return 0;

      // Curved 2.5D ossuary crater base — NEVER a flat horizontal cut!
      const normX = dx / Math.max(1e-3, halfW);
      const botCurve = baseY + Math.sqrt(Math.max(0, 1 - normX * normX)) * 4.2 * scale;
      if (ly > botCurve) return 0;

      // Ossuary crater base rim & jagged bone-rubble collar right at the ground line
      const craterTop = baseY - (2.8 + Math.cos(normX * Math.PI * 3) * 1.4) * scale * pop;
      if (ly >= craterTop) {
        if (ly >= botCurve - 1.2 * scale || adx >= halfW - 1.2 * scale) {
          out.color = DARK_OUTLINE;
          out.alpha = 0.98 * env;
          return out.color;
        }
        const rimGlow = Math.abs(ly - (craterTop + 1.4 * scale)) < 1.1 * scale;
        out.color = rimGlow ? (Math.floor(Math.abs(dx)) % 3 === 0 ? PURE_WHITE : blood[5]) : abyss[2];
        out.alpha = 0.96 * env;
        if (rimGlow) {
          out.glowColor = blood[5];
          out.glowStrength = 0.38 * env;
        }
        return out.color;
      }

      // Evaluate the 5 erupting Necrotic Bone & Soul-Crystal Fangs above the crater base
      for (let i = 0; i < fangs.length; i++) {
        const fg = fangs[i];
        const fh = maxH * fg.hFrac;
        const fy = botCurve - ly; // distance above curved base
        if (fy < 0 || fy > fh) continue;
        const uH = clamp01(fy / Math.max(1, fh));
        const fangCx =
          cx +
          (fg.bOff * (1 - uH * 0.35) + fg.lean * uH * 0.65) * halfW +
          Math.sin(uH * Math.PI) * (fg.lean * 2.4 * scale);
        // Jagged rib/crystal serrations along the fang profile
        const serration =
          uH > 0.18 && uH < 0.85 && Math.sin(uH * Math.PI * 5) > 0.55 ? 1.15 * scale : 0;
        const fangHalfW = Math.max(0.65, fg.w * (1 - Math.pow(uH, 1.22)) + serration);
        const fdx = lx - fangCx;
        const afdx = Math.abs(fdx);
        if (afdx > fangHalfW) continue;

        if (afdx >= fangHalfW - 0.95 || uH >= 0.94) {
          out.color = DARK_OUTLINE;
          out.alpha = 0.98 * env;
          return out.color;
        }

        if (fg.isCrystal) {
          // Faceted Violet/Magenta Soul-Crystal Fang with white-hot core & crimson bevels
          const facet = fdx / Math.max(0.5, fangHalfW);
          out.color =
            Math.abs(facet) < 0.26
              ? PURE_WHITE
              : facet < 0
                ? abyss[6]
                : uH > 0.55
                  ? blood[5]
                  : abyss[4];
          out.alpha = 0.98 * env;
          out.glowColor = blood[5];
          out.glowStrength = 0.42 * env;
          return out.color;
        } else {
          // Sculpted Necrotic Bone Rib-Fang with carved magenta soul-vein
          const vein = afdx < 0.75 * scale && ((Math.floor(fy) + i) % 4 !== 0);
          out.color = vein
            ? blood[5]
            : fdx < 0
              ? bone[6]
              : bone[4];
          out.alpha = 0.98 * env;
          return out.color;
        }
      }
      return 0;
    }
  );
}

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

        // 2. Ground-Erupting Jagged Necrotic Bone & Soul-Crystal Fangs anchored on the arena floor
        //    with a curved 2.5D ossuary crater base (`botCurve = baseY + sqrt(1 - (dx/halfW)^2) * 4.2`)
        drawGroundBoneCrystalEruption(pen, 0, 2, 1.18 * pop, u, env, abyss, blood, bone);

        // 3. Colossal Floating 3D Horned Lich Skull & Scissoring X-Crossed Twin Great-Scythes Guillotine
        //    crowning the bone-and-crystal eruption!
        const sovY = -44 + (1 - pop) * 14;
        drawHornedLichSkullGuillotine(pen, 0, sovY, 1.05 * pop, u, env, abyss, blood, bone);

        // 4. Back half of the 2.5D Blood-Moon Pentagram Execution Floor Seal
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

export const necropolisBoneyardDomain = deathAvatarCathedral;

// ============================================================================
// BAKED 30FPS `reaper_vfx.png` 5-ROW CELLS (`104x104` logical -> `208x208` crisp 2x)
// Strictly bounded within `[-40, +40]` (`[-44, +44]` safe envelope) for 0/150 border clips!
//   Row 0 (`y=0`):   360-Deg Twin-Blade Soul Scythe Wave (`soulScytheWaveCell`)
//   Row 1 (`y=208`): Floating Abyssal Skull Wisp & Soul-Fire Orb (`abyssalSkullWispCell`)
//   Row 2 (`y=416`): Ground-Erupting Necrotic Bone & Soul-Crystal Fangs + Horned Lich Skull Guillotine (`necroticBoneSpireCell`)
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

/**
 * Row 2 (`sy = 416`): Ground-Erupting Jagged Necrotic Bone & Soul-Crystal Fangs anchored at `baseY = 34`
 * with a curved 2.5D ossuary crater base (`botCurve = baseY + Math.sqrt(Math.max(0, 1 - (dx/halfW)^2)) * 4.2`),
 * crowned by the Colossal Horned Lich Skull & Scissoring X-Crossed Twin Great-Scythes (`F00..F29` one-shot).
 */
export const necroticBoneSpireCell = {
  duration: 1.0,
  loop: false,
  defaults: { palette: ABYSSAL_VIOLET_PALETTE, seed: 523 },
  create(cfg) {
    const abyss = buildColorRamp(cfg.palette, 8);
    const blood = buildColorRamp(BLOOD_MOON_CRIMSON_PALETTE, 8);
    const bone = buildColorRamp(NECROPOLIS_BONE_PALETTE, 8);

    return {
      step() {},
      renderFront(pen, localT) {
        const u = clamp01(localT);
        const pop = 0.74 + 0.26 * smoothStep(0, 0.14, u);
        const fade = 1 - smoothStep(0.84, 1.0, u);
        const env = (0.9 + 0.1 * smoothStep(0, 0.12, u)) * fade;
        if (env <= 0.02) return;

        // 1. Ground-Erupting Jagged Necrotic Bone & Soul-Crystal Fangs anchored at baseY = 34
        //    with curved 2.5D ossuary crater base (never a flat horizontal cut!)
        drawGroundBoneCrystalEruption(pen, 0, 34, pop * 0.96, u, env, abyss, blood, bone);

        // 2. Crowning Colossal Horned Lich Skull & Scissoring X-Crossed Twin Great-Scythes
        const bobY = Math.sin(u * Math.PI * 2) * 1.5;
        drawHornedLichSkullGuillotine(pen, 0, -6 + bobY, pop * 0.78, u, env, abyss, blood, bone);
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

// ============================================================================
// 6. LIVE 2.5D MEMENTO MORI: TWIN GATES OF THE NECROPOLIS (`mementoMoriNecropolisGates`)
// ============================================================================
/**
 * Shared HD-2D renderer: Twin Gothic Obsidian-and-Bone Gates of the Necropolis anchored at `baseY`
 * with a curved 2.5D ossuary threshold (`botCurve = baseY + sqrt(1 - normX^2) * 3.8 * scale`),
 * fluted obsidian pillars, pointed horned-skull archway, swirling violet-crimson underworld soul-mist,
 * and twin barred wrought-iron doors swinging open in 2.5D perspective (`openU` in `0..1`).
 */
function drawNecropolisGates25D(pen, cx, baseY, scale, openU, progress, env, abyss, blood, bone, rng) {
  if (env <= 0.02) return;
  const DARK_OUTLINE = '#090314';
  const halfW = 32.5 * scale;
  const pillarOff = 24.0 * scale;
  const pillarHalfW = 4.8 * scale;
  const apertureHalfW = pillarOff - pillarHalfW; // 19.2 * scale
  const archSpringY = baseY - 43.0 * scale;
  const archApexY = baseY - 64.0 * scale;

  // 1. 2.5D Underworld Threshold Floor Ring at baseY
  drawTiltedOrbitBand(
    pen,
    cx,
    baseY,
    halfW * 0.98,
    0.16,
    1.7,
    0.92 * env,
    [abyss[1], abyss[5], blood[5], PURE_WHITE],
    null,
    openU > 0.25 && progress < 0.45
  );

  // 2. Swirling Violet-Crimson Underworld Soul-Mist Vortex inside the Gothic Portal Aperture
  const mistAlpha = (0.35 + 0.65 * openU) * env;
  pen.shadeBox(
    cx - apertureHalfW - 1,
    archApexY + 3 * scale,
    cx + apertureHalfW + 1,
    baseY + 2 * scale,
    (lx, ly, out) => {
      const dx = lx - cx;
      const adx = Math.abs(dx);
      if (adx > apertureHalfW) return 0;

      // Pointed Gothic arch roof boundary inside aperture
      let roofY = archSpringY;
      if (ly < archSpringY) {
        const archU = 1 - adx / Math.max(1, apertureHalfW);
        roofY = archSpringY - Math.pow(clamp01(archU), 0.78) * (archSpringY - (archApexY + 5.5 * scale));
        if (ly < roofY) return 0;
      }
      if (ly > baseY) return 0;

      const n1 = fbmNoise2D(lx * 0.13, ly * 0.13 - progress * 5.2, 607, 2);
      const swirlAngle = Math.atan2((ly - (baseY - 26 * scale)) * 0.85, dx);
      const vortexR = Math.hypot(dx / Math.max(1, apertureHalfW), (ly - (baseY - 26 * scale)) / (28 * scale));
      const spiral = Math.sin(swirlAngle * 3 - vortexR * 5.5 + progress * Math.PI * 6) * 0.5 + 0.5;
      const intensity = clamp01((1 - vortexR * 0.68) * 0.72 + n1 * 0.34 + spiral * 0.28 * openU);

      if (intensity > 0.82 && openU > 0.2) {
        out.color = PURE_WHITE;
      } else if (intensity > 0.64) {
        out.color = spiral > 0.52 ? abyss[6] : blood[5];
      } else if (intensity > 0.44) {
        out.color = abyss[4];
      } else {
        out.color = abyss[1];
      }
      out.alpha = mistAlpha * 0.95;
      if (intensity > 0.6) {
        out.glowColor = spiral > 0.5 ? abyss[5] : blood[5];
        out.glowStrength = 0.36 * mistAlpha;
      }
      return out.color;
    }
  );

  // Floating spectral wraith micro-skulls rising inside the open portal mist
  if (openU > 0.18) {
    for (let s = 0; s < 3; s++) {
      const su = (progress * 1.6 + s * 0.33) % 1;
      const sx = cx + Math.sin(su * Math.PI * 2 + s * 2.1) * (9.5 * scale * openU);
      const sy = baseY - 6 * scale - su * 38 * scale;
      drawPixelSkullOrb(
        pen,
        sx,
        sy,
        2.3 * scale,
        s % 2 === 0 ? abyss[6] : bone[6],
        PURE_WHITE,
        Math.sin(su * Math.PI) * openU * env
      );
    }
  }

  // 3. Twin Wrought-Iron & Bone Barred Portal Doors Swinging Open in 2.5D Perspective
  const leafClosedW = apertureHalfW - 0.4 * scale;
  const leafProjW = leafClosedW * (1 - openU * 0.72);
  const perspTilt = openU * 4.4 * scale;

  for (const side of [-1, 1]) {
    const hingeX = cx + side * apertureHalfW;
    const freeX = hingeX - side * leafProjW;
    const xMin = Math.min(hingeX, freeX);
    const xMax = Math.max(hingeX, freeX);
    const spanX = Math.max(1.2, xMax - xMin);

    pen.shadeBox(
      xMin - 1,
      archSpringY - 12 * scale,
      xMax + 1,
      baseY + 2 * scale,
      (lx, ly, out) => {
        if (lx < xMin || lx > xMax) return 0;
        const leafU = clamp01(Math.abs(lx - hingeX) / spanX); // 0 at pillar hinge -> 1 at swinging edge
        const topDoorY =
          archSpringY -
          Math.pow(leafU, 0.85) * 9.5 * scale -
          leafU * perspTilt;
        const botDoorY = baseY - 1.5 * scale - leafU * perspTilt * 0.55;
        if (ly < topDoorY || ly > botDoorY) return 0;

        // Outer wrought-iron door frame & crossbeams
        const onOuterEdge =
          Math.abs(lx - freeX) <= 1.2 * scale ||
          Math.abs(ly - topDoorY) <= 1.3 * scale ||
          Math.abs(ly - botDoorY) <= 1.3 * scale;
        const midBeam1 = Math.abs(ly - (botDoorY - 14 * scale)) <= 1.25 * scale;
        const midBeam2 = Math.abs(ly - (botDoorY - 29 * scale)) <= 1.25 * scale;
        // 3 vertical iron-and-bone spear bars per door leaf
        const barPhase = (leafU * 3.5) % 1;
        const onBar = barPhase > 0.34 && barPhase < 0.68;

        if (!onOuterEdge && !midBeam1 && !midBeam2 && !onBar) return 0;

        if (Math.abs(lx - freeX) <= 0.85 * scale || Math.abs(ly - topDoorY) <= 0.85 * scale) {
          out.color = DARK_OUTLINE;
          out.alpha = 0.98 * env;
          return out.color;
        }
        if (midBeam1 || midBeam2) {
          out.color = leafU > 0.78 ? blood[5] : bone[4];
          out.alpha = 0.96 * env;
          return out.color;
        }
        out.color = barPhase < 0.5 ? bone[5] : abyss[1];
        out.alpha = 0.96 * env;
        return out.color;
      }
    );

    // Glowing lock-ring / skull clasp on each swinging door edge
    const claspY = baseY - 21 * scale - perspTilt * 0.8;
    drawPixelSkullOrb(pen, freeX, claspY, 2.2 * scale, bone[6], blood[5], env * 0.96);
  }

  // 4. Twin Fluted Obsidian-and-Bone Gothic Pillars + Curved Ossuary Threshold + Pointed Archway
  pen.shadeBox(
    cx - halfW - 2,
    archApexY - 4 * scale,
    cx + halfW + 2,
    baseY + 4.5 * scale,
    (lx, ly, out) => {
      const dx = lx - cx;
      const adx = Math.abs(dx);
      if (adx > halfW) return 0;

      // Curved 2.5D ossuary stone threshold at baseY (NEVER a flat horizontal cut!)
      const normX = dx / Math.max(1e-3, halfW);
      const botCurve = baseY + Math.sqrt(Math.max(0, 1 - normX * normX)) * 3.8 * scale;
      if (ly > botCurve) return 0;

      if (ly >= baseY - 3.2 * scale) {
        if (ly >= botCurve - 1.1 * scale || adx >= halfW - 1.1 * scale) {
          out.color = DARK_OUTLINE;
          out.alpha = 0.98 * env;
          return out.color;
        }
        const isStepRune = Math.abs(ly - (baseY - 1.4 * scale)) < 0.9 * scale && Math.floor(adx) % 4 !== 0;
        out.color = isStepRune ? abyss[6] : bone[3];
        out.alpha = 0.98 * env;
        return out.color;
      }

      // Twin Fluted Obsidian-Bone Pillars (centered at ±pillarOff)
      const pDist = Math.abs(adx - pillarOff);
      const pinnacleTopY = archSpringY - 14.5 * scale;
      if (ly >= pinnacleTopY && pDist <= pillarHalfW + 0.8 * scale) {
        // Tapered Gothic spire pinnacle above archSpringY
        let curPW = pillarHalfW;
        if (ly < archSpringY) {
          const pinU = clamp01((archSpringY - ly) / (14.5 * scale));
          curPW = pillarHalfW * (1 - pinU * 0.85);
        }
        if (pDist <= curPW) {
          if (pDist >= curPW - 1.05 * scale || ly <= pinnacleTopY + 1.1 * scale) {
            out.color = DARK_OUTLINE;
            out.alpha = 0.98 * env;
            return out.color;
          }
          const isCapital = Math.abs(ly - archSpringY) <= 2.4 * scale || Math.abs(ly - (baseY - 5.5 * scale)) <= 2.0 * scale;
          const isRuneSlot =
            ly > archSpringY + 4 * scale &&
            ly < baseY - 8 * scale &&
            pDist < 1.15 * scale &&
            Math.floor(Math.abs(ly)) % 5 !== 0;
          if (isRuneSlot) {
            out.color = pDist < 0.55 * scale ? PURE_WHITE : blood[5];
            out.alpha = env;
            out.glowColor = blood[5];
            out.glowStrength = 0.42 * env;
            return out.color;
          }
          if (isCapital) {
            out.color = bone[5];
            out.alpha = 0.98 * env;
            return out.color;
          }
          out.color = adx < pillarOff ? bone[4] : abyss[1];
          out.alpha = 0.98 * env;
          return out.color;
        }
      }

      // Pointed Gothic Underworld Archway spanning between the Twin Pillars
      if (ly <= archSpringY + 2.0 * scale && adx <= pillarOff + pillarHalfW * 0.6) {
        const archSpan = pillarOff + pillarHalfW * 0.4;
        const archU = clamp01(1 - adx / Math.max(1, archSpan));
        const outerArchY = archSpringY - Math.pow(archU, 0.78) * (archSpringY - archApexY);
        const innerArchY = outerArchY + 6.2 * scale;
        if (ly >= outerArchY && ly <= innerArchY) {
          if (ly <= outerArchY + 1.1 * scale || ly >= innerArchY - 1.1 * scale) {
            out.color = DARK_OUTLINE;
            out.alpha = 0.98 * env;
            return out.color;
          }
          const archMid = Math.abs(ly - (outerArchY + 3.1 * scale)) < 1.0 * scale;
          out.color = archMid ? (Math.floor(adx) % 3 === 0 ? blood[5] : abyss[6]) : bone[4];
          out.alpha = 0.98 * env;
          return out.color;
        }
      }

      return 0;
    }
  );

  // 5. Pillar Skull Capitals + Horned Sovereign Skull Keystone at the Arch Apex + Lightning Arc
  for (const side of [-1, 1]) {
    drawPixelSkullOrb(
      pen,
      cx + side * pillarOff,
      archSpringY - 0.5 * scale,
      3.1 * scale,
      bone[6],
      blood[5],
      env
    );
  }
  const keyY = archApexY + 3.2 * scale;
  drawPixelSkullOrb(pen, cx, keyY, 4.4 * scale, bone[6], PURE_WHITE, env);
  pen.line(cx - 3.5 * scale, keyY - 2 * scale, cx - 9.5 * scale, keyY - 6.5 * scale, bone[5], 0.96 * env);
  pen.line(cx + 3.5 * scale, keyY - 2 * scale, cx + 9.5 * scale, keyY - 6.5 * scale, bone[5], 0.96 * env);

  if (openU > 0.3 && rng) {
    const bolt = buildLightningChain(
      rng,
      cx - apertureHalfW * 0.85,
      archSpringY + 8 * scale,
      cx + apertureHalfW * 0.85,
      archSpringY + 12 * scale,
      0.14,
      3
    );
    pen.polyline(bolt, openU > 0.7 ? PURE_WHITE : abyss[6], 0.88 * env * openU);
  }
}

export const mementoMoriNecropolisGates = {
  duration: 3.6,
  loop: false,
  defaults: {
    palette: ABYSSAL_VIOLET_PALETTE,
    seed: 173,
    customDuration: 3.6
  },
  create(cfg) {
    const abyss = buildColorRamp(cfg.palette, 8);
    const blood = buildColorRamp(BLOOD_MOON_CRIMSON_PALETTE, 8);
    const bone = buildColorRamp(NECROPOLIS_BONE_PALETTE, 8);
    const band4 = [blood[2], abyss[4], blood[5], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({
      rng,
      sparkRamp: [PURE_WHITE, abyss[6], blood[5], bone[6]],
      floorY: 0
    });
    let t = 0;
    let acc = 0;

    return {
      step(dt) {
        t += dt;
        acc += dt * 48;
        const dur = cfg.customDuration || 3.6;
        while (acc >= 1 && t < dur - 0.25) {
          acc -= 1;
          const a = rng.between(0, Math.PI * 2);
          const r = rng.between(8, 64);
          motes.emit(
            rng.chance(0.5) ? 'glint' : 'spark',
            Math.cos(a) * r,
            Math.sin(a) * r * 0.24 - 2,
            rng.between(-18, 18),
            rng.between(-92, -28),
            rng.between(0.24, 0.48),
            rng.chance(0.5) ? blood[5] : abyss[6],
            1.1,
            -14
          );
        }
        motes.step(dt);
      },
      renderBack(pen) {
        const dur = cfg.customDuration || 3.6;
        const u = clamp01(t / dur);
        const pop = smoothStep(0, 0.14, u);
        const openU = smoothStep(0.08, 0.36, u);
        const fade = 1 - smoothStep(0.86, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;

        // Colossal Twin Obsidian Gates of the Necropolis rising behind the Execution Altar
        drawNecropolisGates25D(pen, 0, 2, 1.24 * pop, openU, u, env, abyss, blood, bone, rng);

        // Back half of the 2.5D Execution Altar Pentagram Floor Seal
        const rx = 62 * pop;
        drawTiltedOrbitBand(pen, 0, 0, rx, 0.24, 1.8, 0.92 * env, band4, BACK_HALF, false);
        drawThanatosPentagram(pen, 0, 0, rx * 0.84, 0.24, u * 4.8, blood[5], abyss[5], env * 0.9, BACK_HALF);
      },
      renderFront(pen) {
        const dur = cfg.customDuration || 3.6;
        const u = clamp01(t / dur);
        const pop = smoothStep(0, 0.14, u);
        const fade = 1 - smoothStep(0.86, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;

        // Front half of the 2.5D Execution Altar Pentagram Floor Seal wrapping in front of the victim's boots
        const rx = 62 * pop;
        drawTiltedOrbitBand(pen, 0, 0, rx, 0.24, 2.0, 0.96 * env, band4, FRONT_HALF, u > 0.3);
        drawThanatosPentagram(pen, 0, 0, rx * 0.84, 0.24, u * 4.8, blood[5], PURE_WHITE, env * 0.95, FRONT_HALF);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// BAKED 30FPS `reaper_vfx.png` Rows 5..7 (`104x104` logical -> `208x208` crisp 2x)
// Strictly bounded within `[-40, +40]` (`[-44, +44]` safe envelope) for 0/240 border clips!
//   Row 5 (`y=1040`): Twin Obsidian Gates of the Necropolis (`necropolisObsidianGatesCell`)
//   Row 6 (`y=1248`): Abyssal Grave-Chain Altar Bind (`graveChainAltarBindCell`)
//   Row 7 (`y=1456`): Memento Mori Death-God Guillotine Crescent (`mementoMoriGuillotineCell`)
// ============================================================================

/**
 * Row 5 (`sy = 1040`): Twin Obsidian Gates of the Necropolis (`F00..F29` portal swing-open).
 * Anchored on `baseY = 33` (`this.groundY - Math.round(h * (33 / 104))`) with curved 2.5D ossuary
 * threshold, fluted obsidian-bone pillars, horned skull archway, and barred underworld iron gates
 * swinging open with swirling violet-crimson soul-mist!
 */
export const necropolisObsidianGatesCell = {
  duration: 1.0,
  loop: false,
  defaults: { palette: ABYSSAL_VIOLET_PALETTE, seed: 563 },
  create(cfg) {
    const abyss = buildColorRamp(cfg.palette, 8);
    const blood = buildColorRamp(BLOOD_MOON_CRIMSON_PALETTE, 8);
    const bone = buildColorRamp(NECROPOLIS_BONE_PALETTE, 8);
    const rng = new DeterministicRng(cfg.seed);

    return {
      step() {},
      renderFront(pen, localT) {
        const u = clamp01(localT);
        const pop = 0.82 + 0.18 * smoothStep(0, 0.14, u);
        const openU = smoothStep(0.06, 0.68, u);
        const env = 0.92 + 0.08 * smoothStep(0, 0.12, u);
        drawNecropolisGates25D(pen, 0, 33, pop * 0.96, openU, u, env, abyss, blood, bone, rng);
      }
    };
  }
};

/**
 * Row 6 (`sy = 1248`): Abyssal Grave-Chain Altar Bind (`F00..F29` cross-locked spectral chains
 * & skull sigil pinning the victim).
 */
export const graveChainAltarBindCell = {
  duration: 1.0,
  loop: true,
  defaults: { palette: ABYSSAL_VIOLET_PALETTE, seed: 577 },
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
        const ph = u * Math.PI * 2;
        const snapU = smoothStep(0, 0.22, u);
        const DARK_OUTLINE = '#090314';

        // 1. Revolving Altar Shackle Rings & Pentagram Seal (strictly inside [-35, +35])
        drawTiltedOrbitBand(pen, 0, 0, 30, 0.88, 1.5, 0.92, band4, null, u < 0.2);
        drawTiltedOrbitBand(pen, 0, 0, 18, 0.88, 1.3, 0.88, band4, null, false);
        drawThanatosPentagram(pen, 0, 0, 27, 0.88, ph * 0.5, blood[5], abyss[6], 0.9, null);

        // 2. 4 Cross-Locked Spectral Iron-and-Bone Grave-Chains pinning the victim
        const chainPairs = [
          [-32, -28, 32, 28],
          [-32, 28, 32, -28],
          [-34, -7, 34, 7],
          [-34, 7, 34, -7]
        ];
        for (let c = 0; c < chainPairs.length; c++) {
          const [x0, y0, x1, y1] = chainPairs[c];
          const reach = 0.45 + 0.55 * snapU;
          const ex = x0 + (x1 - x0) * reach;
          const ey = y0 + (y1 - y0) * reach;
          const links = 13;
          for (let i = 0; i <= links; i++) {
            const lu = i / links;
            const vib = Math.sin(lu * Math.PI * 3 + ph * 2 + c) * (1 - snapU * 0.7) * 1.4;
            const lx = x0 + (ex - x0) * lu;
            const ly = y0 + (ey - y0) * lu + vib;
            pen.fillCircle(lx, ly, 2.3, DARK_OUTLINE, 0.96);
            pen.fillCircle(
              lx,
              ly,
              1.55,
              i % 2 === 0 ? bone[6] : c % 2 === 0 ? abyss[6] : blood[5],
              0.98
            );
            if (i % 3 === 0) {
              pen.stipple(lx, ly, PURE_WHITE, 0.95);
            }
          }
        }

        // 3. 4 Articulated Skeletal Bone-Claws clamping inward onto the victim
        const clawAngles = [0.68, Math.PI - 0.68, -0.68, -Math.PI + 0.68];
        for (let k = 0; k < 4; k++) {
          const ang = clawAngles[k];
          const dist = 21 - snapU * 4.5;
          const cx = -Math.cos(ang) * dist;
          const cy = -Math.sin(ang) * dist;
          drawSkeletalBoneClawHead(
            pen,
            cx,
            cy,
            ang,
            0.35 + 0.65 * snapU,
            bone,
            k % 2 === 0 ? blood[5] : abyss[6],
            0.96
          );
        }

        // 4. Crackling Soul-Chain Lightning + Central Horned Execution Skull Lock Sigil
        const bolt = buildLightningChain(rng, -24, -18, 24, 18, 0.13, 3);
        pen.polyline(bolt, PURE_WHITE, 0.88);
        drawPixelSkullOrb(pen, 0, 0, 7.2, bone[6], blood[5], 1.0);
        pen.line(-5.5, -3.5, -12.5, -11.5, bone[5], 0.96);
        pen.line(5.5, -3.5, 12.5, -11.5, bone[5], 0.96);
        drawStarburstFlare(pen, 0, 0, 11.5, 0.94, [abyss[4], blood[5], abyss[6], PURE_WHITE]);
      }
    };
  }
};

/**
 * Row 7 (`sy = 1456`): Memento Mori Death-God Guillotine Crescent (`F00..F29` colossal
 * crimson-violet execution scythe arc & skull burst).
 */
export const mementoMoriGuillotineCell = {
  duration: 1.0,
  loop: false,
  defaults: { palette: BLOOD_MOON_CRIMSON_PALETTE, seed: 593 },
  create(cfg) {
    const blood = buildColorRamp(cfg.palette, 8);
    const abyss = buildColorRamp(ABYSSAL_VIOLET_PALETTE, 8);
    const bone = buildColorRamp(NECROPOLIS_BONE_PALETTE, 8);
    const band4 = [blood[2], abyss[5], blood[5], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);

    return {
      step() {},
      renderFront(pen, localT) {
        const u = clamp01(localT);
        const pop = 0.68 + 0.32 * smoothStep(0, 0.16, u);
        const fade = 1 - smoothStep(0.78, 1.0, u);
        const env = (0.92 + 0.08 * smoothStep(0, 0.1, u)) * fade;
        if (env <= 0.02) return;
        const DARK_OUTLINE = '#090314';

        // 1. Shockwave Halo & Crossed Execution Rift Lightning (strictly within [-37, +37])
        drawTiltedOrbitBand(pen, 0, 0, 32 * pop, 1.0, 1.8, 0.92 * env, band4, null, u < 0.32);

        // 2. Colossal Overhead Crimson-Violet Guillotine Crescent Cleave Arc
        const headA = 0.92 + u * 0.58;
        const tailA = -2.28;
        drawMultiLayerCrescentArc(pen, {
          cx: -2,
          cy: 0,
          radius: 30 * pop,
          width: 12.5,
          eccentricity: 0.94,
          headAngle: headA,
          tailAngle: tailA,
          fade: env,
          ramp: blood,
          seed: cfg.seed || 593,
          t: u,
          flashHot: u < 0.42
        });

        drawMultiLayerCrescentArc(pen, {
          cx: 1,
          cy: 0,
          radius: 26.5 * pop,
          width: 10.0,
          eccentricity: 0.94,
          headAngle: -headA + 0.3,
          tailAngle: -tailA + 0.3,
          fade: env * 0.94,
          ramp: abyss,
          seed: (cfg.seed || 593) + 31,
          t: u,
          flashHot: u < 0.38
        });

        // 3. Serrated Obsidian-and-Bone Guillotine Dorsal Spine sweeping along the outer crescent
        const spineSteps = 22;
        for (let s = 0; s <= spineSteps; s++) {
          const su = s / spineSteps;
          const ang = mixScalar(tailA + 0.25, headA, su);
          const sr = (31.5 + (s % 3 === 0 ? 1.8 : 0)) * pop;
          const sx = -1 + Math.cos(ang) * sr;
          const sy = Math.sin(ang) * sr * 0.94;
          const thick = (1 - Math.abs(su - 0.55) * 0.7) * 2.4 * pop + 0.7;
          pen.fillCircle(sx, sy, thick + 0.8, DARK_OUTLINE, 0.96 * env);
          pen.fillCircle(sx, sy, thick, s % 2 === 0 ? bone[5] : blood[5], 0.98 * env);
          if (s % 3 === 0) {
            pen.stipple(sx, sy, PURE_WHITE, 0.96 * env);
          }
        }

        // 4. Crowning Horned Death-God Skull & Scissoring Scythe Burst at Guillotine Center
        drawHornedLichSkullGuillotine(pen, 0, 1, 0.72 * pop, u, env * 0.96, abyss, blood, bone);

        // 5. Vertical Execution Rift Slash & White-Hot Starburst Nova
        const vBolt = buildLightningChain(rng, 0, -34 * pop, 0, 34 * pop, 0.12, 4);
        pen.polyline(vBolt, PURE_WHITE, 0.95 * env);
        const xBolt = buildLightningChain(rng, -28 * pop, -26 * pop, 28 * pop, 26 * pop, 0.14, 3);
        pen.polyline(xBolt, abyss[6], 0.9 * env);

        drawStarburstFlare(pen, 0, -2, 16 * env, 0.98 * env, [
          blood[4],
          abyss[5],
          blood[6],
          PURE_WHITE
        ]);
      }
    };
  }
};

export const ABYSSAL_EFFECT_REGISTRY = {
  abyssalWraithMantle,
  wraithShadowMantle,
  soulHarvestScytheArc,
  skeletalChainTetherBeam,
  necroticGraveyardSigil,
  deathAvatarCathedral,
  necropolisBoneyardDomain,
  mementoMoriNecropolisGates,
  soulScytheWaveCell,
  abyssalSkullWispCell,
  necroticBoneSpireCell,
  thanatosPentagramSealCell,
  abyssalReapNovaCell,
  necropolisObsidianGatesCell,
  graveChainAltarBindCell,
  mementoMoriGuillotineCell
};

