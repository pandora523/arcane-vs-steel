/**
 * Abyssal Oblivion & Soul-Sever Reaper Shader Suite (`abyssalShaders.js`)
 * First-party 120Hz 2.5D pixel-shader & particle effects for Malakor v5 (`reaper` / `Reaper.js`).
 *
 * Powers both:
 *   1. Live 120Hz `ArcaneShaderFX` (`back` + `front` 2.5D depth wraps around Malakor & opponents,
 *      with strict padded `shadeBox` envelopes -> 0 squared-box edge artifacts)
 *   2. Offline 30fps `assets/sprites/reaper_vfx.png` (`6240x1664`, 8 rows x 30 cols @ 208x208, 0/240 border clips)
 */

import {
  PURE_WHITE,
  clamp01,
  mixScalar,
  smoothStep,
  packHexColor,
  buildColorRamp,
  fbmNoise2D,
  DeterministicRng,
  MotePool,
  buildLightningChain,
  drawTiltedOrbitBand,
  drawStarburstFlare,
  drawMultiLayerCrescentArc
} from '../ArcaneShaderFX.js?v=30fps85';

export const ABYSSAL_VIOLET_PALETTE = [
  '#080412',
  '#2b1059',
  '#581c87',
  '#7e22ce',
  '#9333ea',
  '#c084fc',
  '#e879f9',
  '#ffffff'
];

export const BLOOD_MOON_CRIMSON_PALETTE = [
  '#0e0309',
  '#4c0519',
  '#881337',
  '#be123c',
  '#e11d48',
  '#f43f5e',
  '#fda4af',
  '#ffffff'
];

export const NECROPOLIS_BONE_PALETTE = [
  '#0b0614',
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
  pen.fillCircle(cx, cy, r + 0.9, '#080412', alpha * 0.92);
  pen.fillCircle(cx, cy, r, mainCol, alpha * 0.96);
  pen.rect(cx - r * 0.5, cy + r * 0.32, r, r * 0.52, mainCol, alpha * 0.92);
  pen.stipple(cx - r * 0.38, cy - r * 0.08, eyeCol, alpha);
  pen.stipple(cx + r * 0.38, cy - r * 0.08, eyeCol, alpha);
  pen.stipple(cx, cy - r * 0.45, PURE_WHITE, alpha * 0.92);
}

/** Draw a 5-pointed Thanatos Pentagram Star on a tilted (`aspectY`) plane, with optional 2.5D half filter. */
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

  const wx = cx - ux * 5;
  const wy = cy - uy * 5;
  pen.fillCircle(wx, wy, 4.2, '#080412', alpha * 0.95);
  drawPixelSkullOrb(pen, cx - ux * 2, cy - uy * 2, 3.4, boneRamp[5], glowCol, alpha);

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

/** Draw an articulated curved Reaper Scythe Blade at `(cx, cy)` pointing along `shaftAngle` with `hookSign`. */
function drawAstralGreatScythe(pen, cx, cy, shaftAngle, scale, hookSign, abyss, blood, bone, alpha = 1) {
  if (alpha <= 0.03 || scale <= 0.1) return;
  const DARK = '#080412';
  const ux = Math.cos(shaftAngle);
  const uy = Math.sin(shaftAngle);
  const nx = -uy * hookSign;
  const ny = ux * hookSign;

  const botX = cx - ux * 22 * scale;
  const botY = cy - uy * 22 * scale;
  const topX = cx + ux * 18 * scale;
  const topY = cy + uy * 18 * scale;

  pen.line(botX - nx * 1.1, botY - ny * 1.1, topX - nx * 1.1, topY - ny * 1.1, DARK, 0.96 * alpha);
  pen.line(botX + nx * 1.1, botY + ny * 1.1, topX + nx * 1.1, topY + ny * 1.1, DARK, 0.96 * alpha);
  pen.line(botX, botY, topX, topY, bone[4], 0.98 * alpha);

  const steps = 16;
  for (let s = 0; s <= steps; s++) {
    const su = s / steps;
    const bAng = shaftAngle - hookSign * (0.24 + su * 1.88);
    const bRad = (3.5 + Math.sin(su * Math.PI * 0.88) * 23.5) * scale;
    const bx = topX + Math.cos(bAng) * bRad;
    const by = topY + Math.sin(bAng) * bRad;
    const thick = (1 - su * 0.64) * 3.2 * scale + 0.65;

    pen.fillCircle(bx, by, thick + 0.85, DARK, 0.96 * alpha);
    pen.fillCircle(bx, by, thick, su < 0.25 ? bone[5] : abyss[2], 0.96 * alpha);

    const inX = bx - Math.cos(bAng - hookSign * 1.2) * (thick * 0.55);
    const inY = by - Math.sin(bAng - hookSign * 1.2) * (thick * 0.55);
    pen.fillCircle(
      inX,
      inY,
      thick * 0.58,
      su > 0.78 ? PURE_WHITE : s % 2 === 0 ? blood[5] : abyss[6],
      0.98 * alpha
    );
  }
}

/**
 * Shared HD-2D Renderer: Towering Hooded Spectral Death-God Stand ("Thanatos Avatar")
 * Features:
 *   - Twin scissoring X-crossed Astral Great-Scythes behind shoulders
 *   - Crimson-lined Obsidian Death-Cowl Hood + Sweeping Bone-Silver Antler Horns & Diadem
 *   - Stark White Skull Visage with blazing Crimson-Magenta eye sockets
 *   - Sculpted Ivory Ribcage Upper-Torso + Blazing Sternum Soul-Core Gem fading smoothly at waist!
 *   - Strictly padded `shadeBox` bounds (`>= 6px` margin) -> ZERO rectangular box edges!
 */
function drawThanatosStandAvatar(pen, cx, cy, scale, progress, env, abyss, blood, bone) {
  if (env <= 0.02 || scale <= 0.08) return;
  const DARK = '#080412';

  const snapU = smoothStep(0.08, 0.58, progress);
  const scissorDeg = 54 - snapU * 34 + Math.sin(progress * Math.PI * 4) * 2.8;
  const scissorRad = (scissorDeg * Math.PI) / 180;

  pen.radialGlow(cx, cy - 2 * scale, 26 * scale * env, abyss[5], 0.30 * env);

  // 1. Twin Scissoring Astral Great-Scythes Behind the Stand's Shoulders
  for (const side of [-1, 1]) {
    const ang = -Math.PI * 0.5 + side * scissorRad;
    drawAstralGreatScythe(pen, cx + side * 9.5 * scale, cy + 3 * scale, ang, scale * 1.04, side, abyss, blood, bone, env);
  }

  // 2. Broad Spiked Shoulder Mantle + Sculpted Ivory Ribcage V-Taper Shroud (fades smoothly to alpha=0!)
  const torsoTopY = cy + 2 * scale;
  const torsoBotY = cy + 30 * scale;
  const torsoHalfW = 26.5 * scale;
  pen.shadeBox(
    cx - torsoHalfW - 6,
    torsoTopY - 4,
    cx + torsoHalfW + 6,
    torsoBotY + 6,
    (lx, ly, out) => {
      if (ly < torsoTopY || ly > torsoBotY) return 0;
      const uY = clamp01((ly - torsoTopY) / Math.max(1, torsoBotY - torsoTopY));
      const dx = lx - cx;
      const adx = Math.abs(dx);
      const tatter = Math.sin(dx * 0.55 + progress * Math.PI * 4) * 2.6 * scale * uY;
      // Broad gothic spiked shoulders tapering into a narrow wraith waist + flaring spectral tatters
      const shoulderFlare = uY < 0.28 ? Math.sin((uY / 0.28) * Math.PI) * 0.16 : 0;
      const curHalfW = torsoHalfW * (0.92 + shoulderFlare - uY * 0.48);
      if (adx > curHalfW || ly > torsoBotY - Math.max(0, tatter)) return 0;

      // Smooth spectral fade toward waist so Stand never has a flat bottom cut
      const waistFade = 1 - smoothStep(0.62, 0.98, uY);
      if (waistFade <= 0.02) return 0;

      // Sternum Blazing Soul-Core Gem
      const gemDist = Math.hypot(dx / (4.2 * scale), (ly - (torsoTopY + 7.5 * scale)) / (5.8 * scale));
      if (gemDist <= 1.0) {
        out.color = gemDist < 0.38 ? PURE_WHITE : gemDist < 0.72 ? blood[5] : abyss[6];
        out.alpha = env * waistFade;
        out.glowColor = blood[5];
        out.glowStrength = 0.42 * env * waistFade;
        return out.color;
      }

      if (adx >= curHalfW - 1.15 * scale) {
        out.color = DARK;
        out.alpha = 0.95 * env * waistFade;
        return out.color;
      }

      // Sculpted Ivory Ribs curving across the chest (`uY < 0.65`)
      const ribWave = Math.sin((ly - torsoTopY) / (1.65 * scale) - Math.pow(adx / torsoHalfW, 1.4) * 2.2);
      if (uY < 0.66 && adx > 3.2 * scale && adx < curHalfW - 2.4 * scale && ribWave > 0.18) {
        out.color = ribWave > 0.68 ? bone[6] : bone[5];
        out.alpha = 0.96 * env * waistFade;
        return out.color;
      }

      // Crimson-lined pauldrons / collar trim
      const isCrimsonTrim = uY < 0.16 && adx > 4.5 * scale && adx < 12.5 * scale;
      out.color = isCrimsonTrim ? blood[4] : abyss[1];
      out.alpha = 0.92 * env * waistFade;
      return out.color;
    }
  );

  // 3. Swept-Back Bone-Silver Antler Horns (`±27 * scale`)
  const skullCy = cy - 9.5 * scale;
  for (const side of [-1, 1]) {
    const hRootX = cx + side * 9.5 * scale;
    const hRootY = skullCy - 6.5 * scale;
    for (let h = 0; h <= 11; h++) {
      const hu = h / 11;
      const hx = hRootX + side * (Math.sin(hu * Math.PI * 0.74) * 16.5 * scale - Math.pow(hu, 2.3) * 4.0 * scale);
      const hy = hRootY - hu * 12.5 * scale + Math.sin(hu * Math.PI) * 2.6 * scale;
      const hr = (1 - hu * 0.72) * 3.3 * scale + 0.65;
      pen.fillCircle(hx, hy, hr + 0.85, DARK, 0.96 * env);
      pen.fillCircle(hx, hy, hr, hu > 0.84 ? blood[5] : h % 2 === 0 ? bone[6] : bone[4], 0.98 * env);
    }
  }

  // 4. Crimson-Lined Obsidian Death-Cowl Hood & Stark White Skull Visage
  const hoodRx = 14.5 * scale;
  const hoodRy = 14.0 * scale;
  pen.shadeBox(
    cx - hoodRx - 6,
    skullCy - hoodRy - 6,
    cx + hoodRx + 6,
    skullCy + 13.5 * scale + 6,
    (lx, ly, out) => {
      const dx = lx - cx;
      const adx = Math.abs(dx);
      const dy = ly - skullCy;
      if (dy < -hoodRy || dy > 12.5 * scale) return 0;

      let hoodW = 0;
      if (dy < 0) {
        const uTop = clamp01(-dy / hoodRy);
        hoodW = Math.pow(Math.max(0, 1 - Math.pow(uTop, 1.5)), 0.65) * hoodRx;
      } else {
        hoodW = hoodRx * (1 - (dy / (13.5 * scale)) * 0.22);
      }
      if (adx > hoodW) return 0;

      if (adx >= hoodW - 1.15 * scale || dy <= -hoodRy + 1.2 * scale) {
        out.color = DARK;
        out.alpha = 0.98 * env;
        return out.color;
      }

      // Inner Skull Cavity inside Hood
      const skullW = dy < 3.5 * scale ? 9.2 * scale : 6.8 * scale * (1 - clamp01((dy - 3.5 * scale) / (9.5 * scale)) * 0.28);
      if (dy >= -7.5 * scale && dy <= 10.8 * scale && adx <= skullW + 1.3 * scale) {
        // Crimson Hood Rim framing the Skull
        if (adx > skullW) {
          out.color = blood[5];
          out.alpha = 0.98 * env;
          return out.color;
        }
        // Nasal Void
        if (dy >= 0.5 * scale && dy <= 4.2 * scale && adx <= 1.8 * scale) {
          out.color = DARK;
          out.alpha = 0.98 * env;
          return out.color;
        }
        // Carved Fang Teeth
        if (dy >= 5.8 * scale && dy <= 8.2 * scale) {
          const gap = Math.abs(((adx / scale) % 2.1) - 1.05) < 0.38 || Math.abs(dy - 7.0 * scale) < 0.45 * scale;
          out.color = gap ? DARK : PURE_WHITE;
          out.alpha = 0.98 * env;
          return out.color;
        }
        // Sculpted Stark White Skull Bone
        const lit = 1 - adx / Math.max(1, skullW) * 0.55;
        out.color = lit > 0.72 ? PURE_WHITE : lit > 0.48 ? bone[6] : bone[4];
        out.alpha = 0.98 * env;
        return out.color;
      }

      // Silver-Bone Crown Diadem on Brow (`dy in [-10..-5.5]`)
      if (dy >= -10.2 * scale && dy <= -5.8 * scale && adx <= 8.5 * scale) {
        const crownSpike = Math.abs(adx - 4.2 * scale) < 1.2 * scale || adx < 1.4 * scale;
        if (crownSpike || dy > -7.6 * scale) {
          out.color = adx < 1.0 * scale ? blood[5] : bone[6];
          out.alpha = 0.98 * env;
          return out.color;
        }
      }

      out.color = dx < 0 ? abyss[2] : abyss[1];
      out.alpha = 0.96 * env;
      return out.color;
    }
  );

  // 5. Blazing Crimson-Magenta Eye Sockets + Soulfire Trails
  for (const side of [-1, 1]) {
    const ex = cx + side * 4.4 * scale;
    const ey = skullCy - 1.2 * scale;
    pen.fillCircle(ex, ey, 2.8 * scale, DARK, 0.98 * env);
    pen.fillCircle(ex, ey, 1.9 * scale, blood[5], 0.98 * env);
    pen.fillCircle(ex, ey, 1.1 * scale, PURE_WHITE, 1.0 * env);
    for (let w = 1; w <= 4; w++) {
      const wu = w / 4;
      pen.fillCircle(
        ex + side * (1.8 + wu * 5.2) * scale,
        ey - wu * 4.5 * scale + Math.sin(progress * Math.PI * 6 + w) * 0.9 * scale,
        (1 - wu * 0.55) * 1.3 * scale,
        w <= 2 ? blood[5] : abyss[6],
        (1 - wu * 0.35) * env
      );
    }
  }
}

// ============================================================================
// 1. LIVE 2.5D ABYSSAL WRAITH MANTLE & SHADOW STEP (`abyssalWraithMantle`)
// ============================================================================
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
          drawThanatosStandAvatar(pen, 0, -24, (rx / 28) * 0.72, u, 0.84, abyss, blood, bone);
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
// 3. LIVE 2.5D SKELETAL CHAIN TETHER & SOUL-SEVER LINK (`skeletalChainTetherBeam`)
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
        const ex = clamp01(Math.abs(cfg.dx || 160) / 210) * Math.sign(cfg.dx || 160) * 68;
        const ey = Math.max(-62, Math.min(62, (cfg.dy || 0) / 3));
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

        const ex = Math.max(-66, Math.min(66, (cfg.dx || 160) / 3));
        const ey = Math.max(-62, Math.min(62, (cfg.dy || 0) / 3));
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

        const ex = Math.max(-66, Math.min(66, (cfg.dx || 160) / 3));
        const ey = Math.max(-62, Math.min(62, (cfg.dy || 0) / 3));
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
        const rx = Math.min(62, cfg.radius || 26);
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

        const rx = Math.min(62, cfg.radius || 26) * pop;
        drawTiltedOrbitBand(pen, 0, 0, rx, 0.24, 1.8, 0.9 * env, band4, BACK_HALF, false);
        drawTiltedOrbitBand(pen, 0, 0, rx * 0.65, 0.24, 1.3, 0.82 * env, band4, BACK_HALF, false);
        drawThanatosPentagram(pen, 0, 0, rx * 0.82, 0.24, u * 3.2, blood[5], abyss[5], env * 0.88, BACK_HALF);
      },
      renderFront(pen) {
        const dur = cfg.customDuration || 0.92;
        const u = clamp01(t / dur);
        const pop = smoothStep(0, 0.16, u);
        const fade = 1 - smoothStep(0.76, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;

        const rx = Math.min(62, cfg.radius || 26) * pop;
        drawTiltedOrbitBand(pen, 0, 0, rx, 0.24, 1.9, 0.96 * env, band4, FRONT_HALF, u < 0.22);
        drawTiltedOrbitBand(pen, 0, 0, rx * 0.65, 0.24, 1.4, 0.88 * env, band4, FRONT_HALF, false);
        drawThanatosPentagram(pen, 0, 0, rx * 0.82, 0.24, u * 3.2, blood[5], abyss[5], env * 0.94, FRONT_HALF);

        for (let k = 0; k < 5; k++) {
          const a = u * 3.2 + (k * Math.PI * 2) / 5;
          if (Math.sin(a) < 0) continue;
          drawPixelSkullOrb(pen, Math.cos(a) * rx, Math.sin(a) * rx * 0.24, 2.2, bone[6], blood[5], env);
        }
        motes.render(pen);
      }
    };
  }
};

/**
 * Shared HD-2D renderer: Ground-Erupting Abyssal Guillotine Obelisk & Bone-Crystal Fangs
 * anchored at `baseY` with curved 2.5D ossuary crater base (`>= 6px` padded `shadeBox` margin!).
 */
function drawGroundBoneCrystalEruption(pen, cx, baseY, scale, progress, env, abyss, blood, bone) {
  if (env <= 0.02) return;
  const DARK = '#080412';
  const pop = smoothStep(0, 0.18, progress);
  const halfW = 27.5 * scale * (0.78 + 0.22 * pop);
  const maxH = 52.0 * scale * pop;
  if (halfW <= 2 || maxH <= 2) return;

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

  const fangs = [
    { bOff: -0.74, lean: -0.84, hFrac: 0.54, w: 5.0 * scale, isCrystal: true },
    { bOff: -0.44, lean: -0.54, hFrac: 0.76, w: 5.6 * scale, isCrystal: false },
    { bOff: -0.18, lean: -0.22, hFrac: 0.90, w: 6.2 * scale, isCrystal: true },
    { bOff: 0.0, lean: 0.0, hFrac: 1.0, w: 8.8 * scale, isCrystal: false, isGuillotine: true },
    { bOff: 0.18, lean: 0.22, hFrac: 0.90, w: 6.2 * scale, isCrystal: true },
    { bOff: 0.44, lean: 0.54, hFrac: 0.76, w: 5.6 * scale, isCrystal: false },
    { bOff: 0.74, lean: 0.84, hFrac: 0.54, w: 5.0 * scale, isCrystal: true }
  ];

  pen.shadeBox(
    cx - halfW - 6,
    baseY - maxH - 6,
    cx + halfW + 6,
    baseY + 5.5 * scale + 6,
    (lx, ly, out) => {
      const dx = lx - cx;
      const adx = Math.abs(dx);
      if (adx > halfW) return 0;

      const normX = dx / Math.max(1e-3, halfW);
      const botCurve = baseY + Math.sqrt(Math.max(0, 1 - normX * normX)) * 4.0 * scale;
      if (ly > botCurve) return 0;

      const craterTop = baseY - (2.6 + Math.cos(normX * Math.PI * 3) * 1.3) * scale * pop;
      if (ly >= craterTop) {
        if (ly >= botCurve - 1.15 * scale || adx >= halfW - 1.15 * scale) {
          out.color = DARK;
          out.alpha = 0.98 * env;
          return out.color;
        }
        const rimGlow = Math.abs(ly - (craterTop + 1.3 * scale)) < 1.0 * scale;
        out.color = rimGlow ? (Math.floor(Math.abs(dx)) % 3 === 0 ? PURE_WHITE : blood[5]) : abyss[2];
        out.alpha = 0.96 * env;
        if (rimGlow) {
          out.glowColor = blood[5];
          out.glowStrength = 0.36 * env;
        }
        return out.color;
      }

      for (let i = 0; i < fangs.length; i++) {
        const fg = fangs[i];
        const fh = maxH * fg.hFrac;
        const fy = botCurve - ly;
        if (fy < 0 || fy > fh) continue;
        const uH = clamp01(fy / Math.max(1, fh));
        const fangCx =
          cx +
          (fg.bOff * (1 - uH * 0.35) + fg.lean * uH * 0.65) * halfW +
          Math.sin(uH * Math.PI) * (fg.lean * 2.2 * scale);
        const serration =
          uH > 0.18 && uH < 0.85 && Math.sin(uH * Math.PI * 5) > 0.55 ? 1.1 * scale : 0;
        const fangHalfW = Math.max(0.65, fg.w * (1 - Math.pow(uH, fg.isGuillotine ? 0.85 : 1.22)) + serration);
        const fdx = lx - fangCx;
        const afdx = Math.abs(fdx);
        if (afdx > fangHalfW) continue;

        if (afdx >= fangHalfW - 0.95 || uH >= 0.95) {
          out.color = DARK;
          out.alpha = 0.98 * env;
          return out.color;
        }

        if (fg.isGuillotine) {
          const isRune = afdx < 1.0 * scale && Math.floor(fy) % 4 !== 0 && uH < 0.86;
          if (isRune) {
            out.color = afdx < 0.45 * scale ? PURE_WHITE : blood[5];
            out.alpha = env;
            out.glowColor = blood[5];
            out.glowStrength = 0.42 * env;
            return out.color;
          }
          out.color = fdx < -fangHalfW * 0.45 ? PURE_WHITE : fdx < 0 ? bone[5] : abyss[2];
          out.alpha = 0.98 * env;
          return out.color;
        }

        if (fg.isCrystal) {
          const facet = fdx / Math.max(0.5, fangHalfW);
          out.color =
            Math.abs(facet) < 0.26 ? PURE_WHITE : facet < 0 ? abyss[6] : uH > 0.55 ? blood[5] : abyss[4];
          out.alpha = 0.98 * env;
          out.glowColor = blood[5];
          out.glowStrength = 0.38 * env;
          return out.color;
        } else {
          const vein = afdx < 0.75 * scale && (Math.floor(fy) + i) % 4 !== 0;
          out.color = vein ? blood[5] : fdx < 0 ? bone[6] : bone[4];
          out.alpha = 0.98 * env;
          return out.color;
        }
      }
      return 0;
    }
  );
}

// ============================================================================
// 5. LIVE 2.5D DEATH AVATAR CATHEDRAL & THANATOS STAND (`deathAvatarCathedral`)
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
        acc += dt * 50;
        while (acc >= 1 && t < 1.42) {
          acc -= 1;
          const a = rng.between(0, Math.PI * 2);
          const r = rng.between(10, 56);
          motes.emit(
            rng.chance(0.48) ? 'glint' : 'spark',
            Math.cos(a) * r,
            Math.sin(a) * r * 0.24 - 2,
            rng.between(-16, 16),
            rng.between(-82, -26),
            rng.between(0.22, 0.44),
            rng.chance(0.5) ? blood[5] : abyss[5],
            1.1,
            -12
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

        // 1. Eclipsed Blood-Moon safely inside [-74..+74] (`moonY = -48, moonR <= 18`) -> 0 viewport/box clips!
        const moonY = -48;
        const moonR = 17.5 * pop;
        pen.shadeBox(-moonR - 7, moonY - moonR - 7, moonR + 7, moonY + moonR + 7, (lx, ly, out) => {
          const d = Math.hypot(lx, ly - moonY);
          if (d > moonR + 2.8) return 0;
          if (d >= moonR - 2.4) {
            const rimFade = 1 - smoothStep(moonR + 0.6, moonR + 2.8, d);
            const ang = Math.atan2(ly - moonY, lx);
            const flare = Math.sin(ang * 8 + u * 14) * 0.5 + 0.5;
            out.color = d < moonR - 0.8 ? PURE_WHITE : flare > 0.5 ? blood[5] : abyss[5];
            out.alpha = env * 0.95 * rimFade;
            out.glowColor = blood[5];
            out.glowStrength = 0.44 * env * rimFade;
            return out.color;
          }
          out.color = abyss[0];
          out.alpha = env * 0.96;
          return out.color;
        });

        // 2. Ground-Erupting Abyssal Guillotine Obelisk & Bone-Crystal Fangs
        drawGroundBoneCrystalEruption(pen, 0, 2, 1.04 * pop, u, env, abyss, blood, bone);

        // 3. Towering Hooded Thanatos Stand Avatar crowning the Altar (`sovY = -34`)
        const sovY = -34 + (1 - pop) * 10;
        drawThanatosStandAvatar(pen, 0, sovY, 0.96 * pop, u, env, abyss, blood, bone);

        // 4. Back half of the 2.5D Execution Floor Seal
        const rx = 56 * pop;
        drawTiltedOrbitBand(pen, 0, 0, rx, 0.24, 1.8, 0.92 * env, band4, BACK_HALF, false);
        drawThanatosPentagram(pen, 0, 0, rx * 0.8, 0.24, u * 4.2 - Math.PI * 0.5, blood[5], abyss[5], env * 0.9, BACK_HALF);
      },
      renderFront(pen) {
        const u = clamp01(t / 1.56);
        const pop = smoothStep(0, 0.16, u);
        const fade = 1 - smoothStep(0.84, 1.0, u);
        const env = pop * fade;
        if (env <= 0.02) return;

        const rx = 56 * pop;
        const ry = rx * 0.24;
        drawTiltedOrbitBand(pen, 0, 0, rx, 0.24, 2.0, 0.96 * env, band4, FRONT_HALF, true);
        const rot = u * 4.2 - Math.PI * 0.5;
        drawThanatosPentagram(pen, 0, 0, rx * 0.8, 0.24, rot, blood[5], PURE_WHITE, env * 0.94, FRONT_HALF);

        for (let k = 0; k < 5; k++) {
          const a = rot + (k * Math.PI * 2) / 5;
          if (Math.sin(a) < 0) continue;
          drawPixelSkullOrb(pen, Math.cos(a) * rx, Math.sin(a) * ry, 2.5, bone[6], blood[5], env);
        }
        motes.render(pen);
      }
    };
  }
};

export const necropolisBoneyardDomain = deathAvatarCathedral;

// ============================================================================
// 6. LIVE 2.5D MEMENTO MORI: TWIN GATES OF OBLIVION (`mementoMoriNecropolisGates`)
// ============================================================================
function drawNecropolisGates25D(pen, cx, baseY, scale, openU, progress, env, abyss, blood, bone, rng) {
  if (env <= 0.02) return;
  const DARK = '#080412';
  const halfW = 31.0 * scale;
  const pillarOff = 22.8 * scale;
  const pillarHalfW = 4.6 * scale;
  const apertureHalfW = pillarOff - pillarHalfW;
  const archSpringY = baseY - 40.0 * scale;
  const archApexY = baseY - 59.5 * scale;

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

  // Swirling Underworld Soul-Mist Vortex inside the Gothic Portal Aperture (padded shadeBox!)
  const mistAlpha = (0.35 + 0.65 * openU) * env;
  pen.shadeBox(
    cx - apertureHalfW - 6,
    archApexY - 4,
    cx + apertureHalfW + 6,
    baseY + 6,
    (lx, ly, out) => {
      const dx = lx - cx;
      const adx = Math.abs(dx);
      if (adx > apertureHalfW || ly > baseY) return 0;

      let roofY = archSpringY;
      if (ly < archSpringY) {
        const archU = 1 - adx / Math.max(1, apertureHalfW);
        roofY = archSpringY - Math.pow(clamp01(archU), 0.78) * (archSpringY - (archApexY + 5.0 * scale));
        if (ly < roofY) return 0;
      }

      const n1 = fbmNoise2D(lx * 0.13, ly * 0.13 - progress * 5.2, 607, 2);
      const swirlAngle = Math.atan2((ly - (baseY - 24 * scale)) * 0.85, dx);
      const vortexR = Math.hypot(dx / Math.max(1, apertureHalfW), (ly - (baseY - 24 * scale)) / (26 * scale));
      const spiral = Math.sin(swirlAngle * 3 - vortexR * 5.5 + progress * Math.PI * 6) * 0.5 + 0.5;
      const intensity = clamp01((1 - vortexR * 0.68) * 0.72 + n1 * 0.34 + spiral * 0.28 * openU);

      out.color =
        intensity > 0.82 && openU > 0.2
          ? PURE_WHITE
          : intensity > 0.64
            ? spiral > 0.52
              ? abyss[6]
              : blood[5]
            : intensity > 0.44
              ? abyss[4]
              : abyss[1];
      out.alpha = mistAlpha * 0.95;
      if (intensity > 0.6) {
        out.glowColor = spiral > 0.5 ? abyss[5] : blood[5];
        out.glowStrength = 0.34 * mistAlpha;
      }
      return out.color;
    }
  );

  // Twin Wrought-Iron & Bone Barred Portal Doors Swinging Open in 2.5D Perspective
  const leafClosedW = apertureHalfW - 0.4 * scale;
  const leafProjW = leafClosedW * (1 - openU * 0.72);
  const perspTilt = openU * 4.2 * scale;

  for (const side of [-1, 1]) {
    const hingeX = cx + side * apertureHalfW;
    const freeX = hingeX - side * leafProjW;
    const xMin = Math.min(hingeX, freeX);
    const xMax = Math.max(hingeX, freeX);
    const spanX = Math.max(1.2, xMax - xMin);

    pen.shadeBox(
      xMin - 6,
      archSpringY - 14 * scale - 6,
      xMax + 6,
      baseY + 6,
      (lx, ly, out) => {
        if (lx < xMin || lx > xMax) return 0;
        const leafU = clamp01(Math.abs(lx - hingeX) / spanX);
        const topDoorY = archSpringY - Math.pow(leafU, 0.85) * 9.0 * scale - leafU * perspTilt;
        const botDoorY = baseY - 1.5 * scale - leafU * perspTilt * 0.55;
        if (ly < topDoorY || ly > botDoorY) return 0;

        const onOuterEdge =
          Math.abs(lx - freeX) <= 1.2 * scale ||
          Math.abs(ly - topDoorY) <= 1.3 * scale ||
          Math.abs(ly - botDoorY) <= 1.3 * scale;
        const midBeam1 = Math.abs(ly - (botDoorY - 13 * scale)) <= 1.2 * scale;
        const midBeam2 = Math.abs(ly - (botDoorY - 27 * scale)) <= 1.2 * scale;
        const barPhase = (leafU * 3.5) % 1;
        const onBar = barPhase > 0.34 && barPhase < 0.68;

        if (!onOuterEdge && !midBeam1 && !midBeam2 && !onBar) return 0;

        if (Math.abs(lx - freeX) <= 0.85 * scale || Math.abs(ly - topDoorY) <= 0.85 * scale) {
          out.color = DARK;
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

    const claspY = baseY - 20 * scale - perspTilt * 0.8;
    drawPixelSkullOrb(pen, freeX, claspY, 2.1 * scale, bone[6], blood[5], env * 0.96);
  }

  // Twin Fluted Obsidian-and-Bone Gothic Pillars + Pointed Archway
  pen.shadeBox(
    cx - halfW - 6,
    archApexY - 6 * scale - 6,
    cx + halfW + 6,
    baseY + 5 * scale + 6,
    (lx, ly, out) => {
      const dx = lx - cx;
      const adx = Math.abs(dx);
      if (adx > halfW) return 0;

      const normX = dx / Math.max(1e-3, halfW);
      const botCurve = baseY + Math.sqrt(Math.max(0, 1 - normX * normX)) * 3.6 * scale;
      if (ly > botCurve) return 0;

      if (ly >= baseY - 3.0 * scale) {
        if (ly >= botCurve - 1.1 * scale || adx >= halfW - 1.1 * scale) {
          out.color = DARK;
          out.alpha = 0.98 * env;
          return out.color;
        }
        const isStepRune = Math.abs(ly - (baseY - 1.3 * scale)) < 0.85 * scale && Math.floor(adx) % 4 !== 0;
        out.color = isStepRune ? abyss[6] : bone[3];
        out.alpha = 0.98 * env;
        return out.color;
      }

      const pDist = Math.abs(adx - pillarOff);
      const pinnacleTopY = archSpringY - 13.5 * scale;
      if (ly >= pinnacleTopY && pDist <= pillarHalfW + 0.8 * scale) {
        let curPW = pillarHalfW;
        if (ly < archSpringY) {
          const pinU = clamp01((archSpringY - ly) / (13.5 * scale));
          curPW = pillarHalfW * (1 - pinU * 0.85);
        }
        if (pDist <= curPW) {
          if (pDist >= curPW - 1.05 * scale || ly <= pinnacleTopY + 1.1 * scale) {
            out.color = DARK;
            out.alpha = 0.98 * env;
            return out.color;
          }
          const isCapital =
            Math.abs(ly - archSpringY) <= 2.2 * scale || Math.abs(ly - (baseY - 5.2 * scale)) <= 1.9 * scale;
          const isRuneSlot =
            ly > archSpringY + 4 * scale &&
            ly < baseY - 8 * scale &&
            pDist < 1.1 * scale &&
            Math.floor(Math.abs(ly)) % 5 !== 0;
          if (isRuneSlot) {
            out.color = pDist < 0.55 * scale ? PURE_WHITE : blood[5];
            out.alpha = env;
            out.glowColor = blood[5];
            out.glowStrength = 0.4 * env;
            return out.color;
          }
          out.color = isCapital ? bone[5] : adx < pillarOff ? bone[4] : abyss[1];
          out.alpha = 0.98 * env;
          return out.color;
        }
      }

      if (ly <= archSpringY + 2.0 * scale && adx <= pillarOff + pillarHalfW * 0.6) {
        const archSpan = pillarOff + pillarHalfW * 0.4;
        const archU = clamp01(1 - adx / Math.max(1, archSpan));
        const outerArchY = archSpringY - Math.pow(archU, 0.78) * (archSpringY - archApexY);
        const innerArchY = outerArchY + 5.8 * scale;
        if (ly >= outerArchY && ly <= innerArchY) {
          if (ly <= outerArchY + 1.05 * scale || ly >= innerArchY - 1.05 * scale) {
            out.color = DARK;
            out.alpha = 0.98 * env;
            return out.color;
          }
          const archMid = Math.abs(ly - (outerArchY + 2.9 * scale)) < 0.95 * scale;
          out.color = archMid ? (Math.floor(adx) % 3 === 0 ? blood[5] : abyss[6]) : bone[4];
          out.alpha = 0.98 * env;
          return out.color;
        }
      }
      return 0;
    }
  );

  for (const side of [-1, 1]) {
    drawPixelSkullOrb(pen, cx + side * pillarOff, archSpringY - 0.5 * scale, 2.9 * scale, bone[6], blood[5], env);
  }
  const keyY = archApexY + 3.0 * scale;
  drawPixelSkullOrb(pen, cx, keyY, 4.1 * scale, bone[6], PURE_WHITE, env);
  pen.line(cx - 3.2 * scale, keyY - 2 * scale, cx - 8.8 * scale, keyY - 6.0 * scale, bone[5], 0.96 * env);
  pen.line(cx + 3.2 * scale, keyY - 2 * scale, cx + 8.8 * scale, keyY - 6.0 * scale, bone[5], 0.96 * env);

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
        acc += dt * 46;
        const dur = cfg.customDuration || 3.6;
        while (acc >= 1 && t < dur - 0.25) {
          acc -= 1;
          const a = rng.between(0, Math.PI * 2);
          const r = rng.between(8, 58);
          motes.emit(
            rng.chance(0.5) ? 'glint' : 'spark',
            Math.cos(a) * r,
            Math.sin(a) * r * 0.24 - 2,
            rng.between(-18, 18),
            rng.between(-84, -26),
            rng.between(0.24, 0.46),
            rng.chance(0.5) ? blood[5] : abyss[6],
            1.1,
            -12
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

        drawNecropolisGates25D(pen, 0, 2, 1.08 * pop, openU, u, env, abyss, blood, bone, rng);

        const rx = 58 * pop;
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

        const rx = 58 * pop;
        drawTiltedOrbitBand(pen, 0, 0, rx, 0.24, 2.0, 0.96 * env, band4, FRONT_HALF, u > 0.3);
        drawThanatosPentagram(pen, 0, 0, rx * 0.84, 0.24, u * 4.8, blood[5], PURE_WHITE, env * 0.95, FRONT_HALF);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// BAKED 30FPS `reaper_vfx.png` 8-ROW CELLS (`104x104` logical -> `208x208` crisp 2x)
// Every single row has a distinct silhouette (ZERO enclosing circles around slashes!)
// and stays strictly within `[-38, +38]` (`0/240` border clips, `0` box edges).
// ============================================================================

/**
 * Row 0 (`sy = 0`): Razor Asymmetric Crescent Scythe-Wave & Spinning Eclipse Reaper Blade (`F00..F29` loop).
 * Zero outer circle — pure sweeping serrated crescent scythe blades + crimson-magenta plasma wake!
 */
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
        const DARK = '#080412';

        // Forward-sweeping asymmetric Crescent Scythe Plasma Wave
        drawMultiLayerCrescentArc(pen, {
          cx: -3,
          cy: 0,
          radius: 30,
          width: 11.5,
          eccentricity: 0.78,
          headAngle: 1.28 + Math.sin(ph) * 0.14,
          tailAngle: -1.42 + Math.cos(ph) * 0.14,
          fade: 0.96,
          ramp: blood,
          seed: cfg.seed || 501,
          t: localT,
          flashHot: true
        });

        // Twin Spinning Curved Bone-and-Crimson Scythe Blades (3-fold / 2-fold razor vortex, NO circle ring!)
        for (let b = 0; b < 2; b++) {
          const baseA = ph + b * Math.PI;
          for (let s = 0; s <= 18; s++) {
            const u = s / 18;
            const r = 4 + u * 28.5;
            const curveA = baseA + Math.pow(u, 1.15) * 1.65;
            const bx = Math.cos(curveA) * r;
            const by = Math.sin(curveA) * r * 0.88;
            const bladeR = (1 - u * 0.62) * 3.8 + 0.75;
            pen.fillCircle(bx, by, bladeR + 0.85, DARK, 0.96);
            pen.fillCircle(bx, by, bladeR, u > 0.78 ? PURE_WHITE : b === 0 ? blood[5] : abyss[6], 0.98);
            if (s % 2 === 0 && u < 0.85) {
              pen.stipple(bx - Math.sin(curveA) * 1.1, by + Math.cos(curveA) * 1.1, bone[6], 0.95);
            }
          }
        }

        drawPixelSkullOrb(pen, 0, 0, 5.4, bone[6], blood[5], 1.0);
        drawStarburstFlare(pen, 6, 0, 11.5, 0.92, [blood[4], abyss[5], blood[6], PURE_WHITE]);
      }
    };
  }
};

/**
 * Row 1 (`sy = 208`): Captive Severed Soul Effigy & Tormented Spirit Core (`F00..F29` loop).
 * Powers Malakor's signature `SOUL SEVER` captive spirit effigy AND homing Soul-Fragment wisps!
 */
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
        const bobY = Math.sin(ph) * 2.4;

        // Rising Tapered Soul-Flame Spirit Silhouette (padded shadeBox -> 0 box edges!)
        pen.shadeBox(-34, -38, 34, 38, (lx, ly, out) => {
          const dy = ly - bobY;
          if (dy < -30 || dy > 28) return 0;
          // Flame tapers to wispy point at top (dy=-30) and spectral tail at bottom (dy=+28)
          const uY = (dy + 30) / 58;
          const sway = Math.sin(uY * Math.PI * 2.5 - ph) * 3.2 * (1 - Math.sin(uY * Math.PI) * 0.5);
          const dx = lx - sway;
          const maxRx = 21.5 * Math.sin(clamp01(uY) * Math.PI);
          if (maxRx <= 0.8 || Math.abs(dx) > maxRx) return 0;

          const d = Math.hypot(dx / Math.max(2, maxRx), (dy + 1) / 26);
          const n = fbmNoise2D(lx * 0.16, ly * 0.16 + localT * 6, cfg.seed, 2);
          if (d + n * 0.24 > 0.90) return 0;

          const edgeFade = 1 - smoothStep(0.68, 0.92, d + n * 0.16);
          out.color = d < 0.36 ? PURE_WHITE : d < 0.60 ? blood[5] : d < 0.78 ? abyss[5] : abyss[2];
          out.alpha = 0.95 * edgeFade;
          out.glowColor = d < 0.55 ? blood[5] : abyss[5];
          out.glowStrength = 0.36 * edgeFade;
          return out.color;
        });

        // Broken Spectral Shackle Chains & Captive Skull-Heart Core
        pen.line(-18, bobY + 10, -7, bobY + 3, bone[5], 0.94);
        pen.line(18, bobY + 10, 7, bobY + 3, bone[5], 0.94);
        pen.line(-15, bobY - 12, -6, bobY - 4, blood[5], 0.92);
        pen.line(15, bobY - 12, 6, bobY - 4, blood[5], 0.92);

        drawPixelSkullOrb(pen, 0, bobY - 2, 8.2, bone[6], blood[5], 1.0);
        const arc = buildLightningChain(rng, -15, bobY + 9, 15, bobY - 11, 0.14, 3);
        pen.polyline(arc, PURE_WHITE, 0.9);
        drawStarburstFlare(pen, 0, bobY + 6, 10.5, 0.94, [blood[4], abyss[5], blood[6], PURE_WHITE]);
      }
    };
  }
};

/**
 * Row 2 (`sy = 416`): Ground-Erupting Abyssal Guillotine Obelisk & Bone-Crystal Fangs (`F00..F29` one-shot).
 * Anchored at `baseY = 34` (`this.groundY - Math.round(h * (34 / 104))`).
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
        const pop = 0.76 + 0.24 * smoothStep(0, 0.14, u);
        const fade = 1 - smoothStep(0.84, 1.0, u);
        const env = (0.9 + 0.1 * smoothStep(0, 0.12, u)) * fade;
        if (env <= 0.02) return;

        drawGroundBoneCrystalEruption(pen, 0, 34, pop * 0.96, u, env, abyss, blood, bone);
        drawPixelSkullOrb(pen, 0, -4 * pop, 5.8 * pop, bone[6], blood[5], env);
      }
    };
  }
};

/**
 * Row 3 (`sy = 624`): Towering Hooded Spectral Death-God Stand ("Thanatos Avatar", `F00..F29` loop).
 * Manifests behind Malakor during Combo 3, Overdrive (`ULTIMATE`), and `TRUE_ULTIMATE`!
 */
export const thanatosPentagramSealCell = {
  duration: 1.0,
  loop: true,
  defaults: { palette: ABYSSAL_VIOLET_PALETTE, seed: 533 },
  create(cfg) {
    const abyss = buildColorRamp(cfg.palette, 8);
    const blood = buildColorRamp(BLOOD_MOON_CRIMSON_PALETTE, 8);
    const bone = buildColorRamp(NECROPOLIS_BONE_PALETTE, 8);

    return {
      step() {},
      renderFront(pen, localT) {
        const bobY = Math.sin(localT * Math.PI * 2) * 2.0;
        drawThanatosStandAvatar(pen, 0, -1 + bobY, 1.05, localT, 0.98, abyss, blood, bone);
      }
    };
  }
};

/**
 * Row 4 (`sy = 832`): Asymmetric X-Scissor Crimson-Amethyst Guillotine Rip (`F00..F29` one-shot).
 * Zero outer circle — violent diagonal X-cross scythe slash + dimensional lightning tear!
 */
export const abyssalReapNovaCell = {
  duration: 1.0,
  loop: false,
  defaults: { palette: BLOOD_MOON_CRIMSON_PALETTE, seed: 547 },
  create(cfg) {
    const blood = buildColorRamp(cfg.palette, 8);
    const abyss = buildColorRamp(ABYSSAL_VIOLET_PALETTE, 8);
    const rng = new DeterministicRng(cfg.seed);

    return {
      step() {},
      renderFront(pen, localT) {
        const u = clamp01(localT);
        const pop = 0.64 + 0.36 * smoothStep(0, 0.18, u);
        const fade = 1 - smoothStep(0.72, 1.0, u);
        const env = (0.92 + 0.08 * smoothStep(0, 0.12, u)) * fade;
        if (env <= 0.02) return;

        // Diagonal Slash Arm 1 (\) & Slash Arm 2 (/) forming a razor X-Guillotine Rip!
        const len1 = 33 * pop;
        const len2 = 29 * pop;
        for (let k = -2; k <= 2; k++) {
          const wFade = 1 - Math.abs(k) * 0.32;
          const col1 = k === 0 ? PURE_WHITE : Math.abs(k) === 1 ? blood[5] : abyss[3];
          const col2 = k === 0 ? PURE_WHITE : Math.abs(k) === 1 ? abyss[6] : blood[3];
          pen.line(-len1 + k, -len1 * 0.82, len1 + k, len1 * 0.82, col1, env * wFade);
          pen.line(-len2 + k, len2 * 0.86, len2 + k, -len2 * 0.86, col2, env * wFade * 0.95);
        }

        drawMultiLayerCrescentArc(pen, {
          cx: -2,
          cy: 0,
          radius: 27 * pop,
          width: 10.5,
          eccentricity: 0.78,
          headAngle: 1.15 + u * 0.45,
          tailAngle: -1.68,
          fade: env,
          ramp: blood,
          seed: cfg.seed || 547,
          t: u,
          flashHot: u < 0.38
        });

        const bolt = buildLightningChain(rng, -25 * pop, -20 * pop, 25 * pop, 20 * pop, 0.14, 3);
        pen.polyline(bolt, PURE_WHITE, 0.92 * env);
        drawStarburstFlare(pen, 0, 0, 15 * env, 0.98 * env, [blood[4], abyss[5], blood[6], PURE_WHITE]);
      }
    };
  }
};

/**
 * Row 5 (`sy = 1040`): Twin Cathedral Gates of Oblivion (`F00..F29` portal swing-open).
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
        const pop = 0.84 + 0.16 * smoothStep(0, 0.14, u);
        const openU = smoothStep(0.06, 0.68, u);
        const env = 0.92 + 0.08 * smoothStep(0, 0.12, u);
        drawNecropolisGates25D(pen, 0, 33, pop * 0.96, openU, u, env, abyss, blood, bone, rng);
      }
    };
  }
};

/**
 * Row 6 (`sy = 1248`): Six-Scythe Death-Mark Seal & Grave-Chain Shackle (`F00..F29` loop).
 * Zero outer circle — 6 Astral Execution Scythes & chains converging inward onto the victim's soul!
 */
export const graveChainAltarBindCell = {
  duration: 1.0,
  loop: true,
  defaults: { palette: ABYSSAL_VIOLET_PALETTE, seed: 577 },
  create(cfg) {
    const abyss = buildColorRamp(cfg.palette, 8);
    const blood = buildColorRamp(BLOOD_MOON_CRIMSON_PALETTE, 8);
    const bone = buildColorRamp(NECROPOLIS_BONE_PALETTE, 8);
    const rng = new DeterministicRng(cfg.seed);

    return {
      step() {},
      renderFront(pen, localT) {
        const u = clamp01(localT);
        const ph = u * Math.PI * 2;
        const snapU = smoothStep(0, 0.28, u);
        const DARK = '#080412';

        // 1. Cross-Locked Spectral Grave-Chains pinning the victim from 4 corners (within [-33..+33])
        const chainPairs = [
          [-32, -26, 32, 26],
          [-32, 26, 32, -26]
        ];
        for (let c = 0; c < chainPairs.length; c++) {
          const [x0, y0, x1, y1] = chainPairs[c];
          const links = 14;
          for (let i = 0; i <= links; i++) {
            const lu = i / links;
            const vib = Math.sin(lu * Math.PI * 3 + ph * 2 + c) * (1 - snapU * 0.65) * 1.3;
            const lx = x0 + (x1 - x0) * lu;
            const ly = y0 + (y1 - y0) * lu + vib;
            pen.fillCircle(lx, ly, 2.2, DARK, 0.96);
            pen.fillCircle(lx, ly, 1.45, i % 2 === 0 ? bone[6] : c === 0 ? blood[5] : abyss[6], 0.98);
          }
        }

        // 2. 6 Converging Astral Execution Scythe Tips locking inward around the victim (NO outer circle!)
        for (let k = 0; k < 6; k++) {
          const baseAng = (k * Math.PI) / 3 + Math.sin(ph) * 0.12;
          const dist = 29 - snapU * 7.5 + Math.sin(ph * 2 + k) * 1.4;
          const sx = Math.cos(baseAng) * dist;
          const sy = Math.sin(baseAng) * dist;
          const inwardAng = baseAng + Math.PI;

          // Curved execution scythe fang pointing straight at the victim's heart
          for (let s = 0; s <= 9; s++) {
            const su = s / 9;
            const bA = inwardAng + (k % 2 === 0 ? 1 : -1) * (su * 0.72 - 0.2);
            const bx = sx + Math.cos(bA) * (su * 12.5);
            const by = sy + Math.sin(bA) * (su * 12.5);
            const r = (1 - su * 0.65) * 2.4 + 0.6;
            pen.fillCircle(bx, by, r + 0.75, DARK, 0.96);
            pen.fillCircle(bx, by, r, su > 0.72 ? PURE_WHITE : k % 2 === 0 ? blood[5] : abyss[6], 0.98);
          }
        }

        // 3. Central Crimson Death-Mark Skull Lock & Crackling Void Arc
        const bolt = buildLightningChain(rng, -22, -16, 22, 16, 0.13, 3);
        pen.polyline(bolt, PURE_WHITE, 0.9);
        drawPixelSkullOrb(pen, 0, 0, 7.2, bone[6], blood[5], 1.0);
        pen.line(-5.5, -3.5, -12.5, -11.0, bone[5], 0.96);
        pen.line(5.5, -3.5, 12.5, -11.0, bone[5], 0.96);
        drawStarburstFlare(pen, 0, 0, 12.0, 0.96, [blood[4], abyss[5], blood[6], PURE_WHITE]);
      }
    };
  }
};

/**
 * Row 7 (`sy = 1456`): Memento Mori Oblivion Reality-Split (`F00..F29` one-shot).
 * Colossal diagonal execution scythe crescent + dimensional void tear + crowning Death-God Stand burst (NO outer circle!).
 */
export const mementoMoriGuillotineCell = {
  duration: 1.0,
  loop: false,
  defaults: { palette: BLOOD_MOON_CRIMSON_PALETTE, seed: 593 },
  create(cfg) {
    const blood = buildColorRamp(cfg.palette, 8);
    const abyss = buildColorRamp(ABYSSAL_VIOLET_PALETTE, 8);
    const bone = buildColorRamp(NECROPOLIS_BONE_PALETTE, 8);
    const rng = new DeterministicRng(cfg.seed);

    return {
      step() {},
      renderFront(pen, localT) {
        const u = clamp01(localT);
        const pop = 0.70 + 0.30 * smoothStep(0, 0.16, u);
        const fade = 1 - smoothStep(0.78, 1.0, u);
        const env = (0.92 + 0.08 * smoothStep(0, 0.1, u)) * fade;
        if (env <= 0.02) return;
        const DARK = '#080412';

        // 1. Diagonal Dimensional Reality-Split Scar (\ and vertical execution seam, NO enclosing circle!)
        const scarLen = 35 * pop;
        for (let w = -3; w <= 3; w++) {
          const wf = 1 - Math.abs(w) * 0.26;
          const col = w === 0 ? PURE_WHITE : Math.abs(w) === 1 ? blood[5] : abyss[2];
          pen.line(-scarLen * 0.88 + w, -scarLen * 0.92, scarLen * 0.88 + w, scarLen * 0.92, col, env * wf);
        }

        // 2. Colossal Sweeping Crimson-Violet Oblivion Guillotine Crescent
        const headA = 0.96 + u * 0.52;
        const tailA = -2.18;
        drawMultiLayerCrescentArc(pen, {
          cx: -2,
          cy: 0,
          radius: 31 * pop,
          width: 13.0,
          eccentricity: 0.86,
          headAngle: headA,
          tailAngle: tailA,
          fade: env,
          ramp: blood,
          seed: cfg.seed || 593,
          t: u,
          flashHot: u < 0.45
        });

        drawMultiLayerCrescentArc(pen, {
          cx: 1,
          cy: 0,
          radius: 27 * pop,
          width: 10.0,
          eccentricity: 0.86,
          headAngle: -headA + 0.35,
          tailAngle: -tailA + 0.35,
          fade: env * 0.94,
          ramp: abyss,
          seed: (cfg.seed || 593) + 31,
          t: u,
          flashHot: u < 0.40
        });

        // 3. Serrated Obsidian-Bone Dorsal Spine along the Guillotine Crescent
        const spineSteps = 20;
        for (let s = 0; s <= spineSteps; s++) {
          const su = s / spineSteps;
          const ang = mixScalar(tailA + 0.25, headA, su);
          const sr = (32.0 + (s % 3 === 0 ? 1.8 : 0)) * pop;
          const sx = -1 + Math.cos(ang) * sr;
          const sy = Math.sin(ang) * sr * 0.86;
          const thick = (1 - Math.abs(su - 0.55) * 0.7) * 2.3 * pop + 0.7;
          pen.fillCircle(sx, sy, thick + 0.8, DARK, 0.96 * env);
          pen.fillCircle(sx, sy, thick, s % 2 === 0 ? bone[6] : blood[5], 0.98 * env);
        }

        // 4. Vertical & Diagonal Void Lightning + Central Starburst Execution Core
        const vBolt = buildLightningChain(rng, 0, -34 * pop, 0, 34 * pop, 0.12, 4);
        pen.polyline(vBolt, PURE_WHITE, 0.96 * env);
        const xBolt = buildLightningChain(rng, -28 * pop, 24 * pop, 28 * pop, -24 * pop, 0.14, 3);
        pen.polyline(xBolt, abyss[6], 0.92 * env);

        drawPixelSkullOrb(pen, 0, -1, 7.6 * pop, bone[6], blood[5], env);
        drawStarburstFlare(pen, 0, -1, 17 * env, 0.99 * env, [
          blood[4],
          abyss[5],
          blood[6],
          PURE_WHITE
        ]);
      }
    };
  }
};

export const NECRO_SOUL_EMERALD_PALETTE = [
  '#04090c',
  '#064e3b',
  '#047857',
  '#059669',
  '#10b981',
  '#34d399',
  '#a7f3d0',
  '#ffffff'
];

// ============================================================================
// 9. PITCH-BLACK UNDERGROUND BURROW INDICATOR (`abyssalShadowBurrowPool`)
// ============================================================================
export const abyssalShadowBurrowPool = {
  duration: 0.34,
  loop: false,
  defaults: {
    palette: ABYSSAL_VIOLET_PALETTE,
    seed: 613,
    radius: 34,
    facing: 1,
    isWarning: false,
    progress: 0.5
  },
  create(cfg) {
    const abyss = buildColorRamp(cfg.palette, 8);
    const blood = buildColorRamp(BLOOD_MOON_CRIMSON_PALETTE, 8);
    const PITCH_BLACK = packHexColor('#020106');
    const INK_VOID = packHexColor('#080312');
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({
      rng,
      sparkRamp: [PITCH_BLACK, abyss[1], abyss[5], blood[5]],
      floorY: 2
    });
    const maxDur = cfg.customDuration || 0.34;
    let t = 0;
    let spawned = false;

    return {
      step(dt) {
        if (!spawned) {
          spawned = true;
          const cnt = cfg.isWarning ? 14 : 9;
          for (let i = 0; i < cnt; i++) {
            const rx = rng.between(-(cfg.radius || 34) * 0.82, (cfg.radius || 34) * 0.82);
            motes.emit(
              i % 3 === 0 ? 'glint' : 'spark',
              rx,
              rng.between(-3, 2),
              rng.between(-14, 14),
              rng.between(-52, -18),
              rng.between(0.16, 0.30),
              i % 2 === 0 ? PITCH_BLACK : cfg.isWarning ? blood[5] : abyss[4],
              1,
              -8
            );
          }
        }
        t += dt;
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / maxDur);
        const env = (1 - smoothStep(0.68, 1.0, u)) * (0.85 + 0.15 * smoothStep(0, 0.15, u));
        if (env <= 0.02) return;

        const rx = (cfg.radius || 34) * (cfg.isWarning ? 1.14 : 1.0);
        const ry = rx * 0.30;

        // Strict elliptical pitch-black void puddle with >= 8px feathered margin (ZERO box edges!)
        pen.shadeBox(-rx - 8, -ry - 8, rx + 8, ry + 8, (lx, ly, out) => {
          const nx = lx / Math.max(1, rx);
          const ny = ly / Math.max(1, ry);
          const d = Math.hypot(nx, ny);
          if (d >= 1.0) return 0;

          const noise = fbmNoise2D(lx * 0.14 + (cfg.progress || 0) * 6.0, ly * 0.32 - t * 5.0, 613, 2);
          const edgeWarp = d + noise * 0.12;
          if (edgeWarp >= 0.96) return 0;

          const rimFade = 1 - smoothStep(0.70, 0.96, edgeWarp);
          if (edgeWarp > 0.78) {
            out.color = cfg.isWarning ? blood[4] : abyss[2];
            out.alpha = 0.88 * env * rimFade;
            return out.color;
          }
          if (edgeWarp > 0.56) {
            out.color = INK_VOID;
            out.alpha = 0.96 * env;
            return out.color;
          }
          out.color = PITCH_BLACK;
          out.alpha = 0.98 * env;
          return out.color;
        });

        // Writhing pitch-black shadow tentacles rising out of the underground pool
        const tendrilCount = cfg.isWarning ? 7 : 5;
        for (let k = 0; k < tendrilCount; k++) {
          const frac = (k / Math.max(1, tendrilCount - 1)) * 2 - 1;
          const baseTx = frac * rx * 0.72;
          const baseTy = Math.sin(frac * 2.2) * ry * 0.35;
          const hMax = (cfg.isWarning ? 16 : 11) * (1 - Math.abs(frac) * 0.35) * env;
          for (let s = 0; s <= 6; s++) {
            const su = s / 6;
            const sway = Math.sin((cfg.progress || 0) * 14 + k * 1.7 + su * 3.1) * (2.6 * su);
            const tx = baseTx + sway;
            const ty = baseTy - su * hMax;
            const tr = (1 - su * 0.72) * 2.4 + 0.5;
            pen.fillCircle(tx, ty, tr + 0.6, PITCH_BLACK, 0.95 * env * (1 - su * 0.35));
            if (cfg.isWarning && s >= 4) {
              pen.stipple(tx, ty, blood[5], 0.85 * env);
            }
          }
        }
      },
      renderFront(pen) {
        const u = clamp01(t / maxDur);
        const env = 1 - smoothStep(0.68, 1.0, u);
        if (env <= 0.02) return;
        const rx = cfg.radius || 34;
        const dir = cfg.facing >= 0 ? 1 : -1;

        // Twin Sinister Predator Eye-Slits peering up from the pitch-black floor shadow!
        const eyeBaseX = dir * 5.5;
        const eyeBaseY = -1.5;
        for (const side of [-1, 1]) {
          const ex = eyeBaseX + side * 4.2;
          const ey = eyeBaseY + (side > 0 ? 0.4 : -0.3);
          pen.line(ex - 2.2, ey, ex + 2.2, ey - 0.6 * dir, PITCH_BLACK, 0.98 * env);
          pen.line(
            ex - 1.6,
            ey,
            ex + 1.6,
            ey - 0.5 * dir,
            cfg.isWarning ? PURE_WHITE : blood[5],
            0.98 * env
          );
          pen.stipple(ex, ey, cfg.isWarning ? blood[5] : PURE_WHITE, env);
        }

        // Pre-Eruption Lock-On Target Ring & Contracting Abyssal Maw Warning!
        if (cfg.isWarning) {
          drawTiltedOrbitBand(
            pen,
            0,
            -1,
            rx * (1.05 - u * 0.22),
            0.28,
            2.0,
            0.94 * env,
            [PITCH_BLACK, blood[3], blood[5], PURE_WHITE],
            FRONT_HALF,
            true
          );
          drawThanatosPentagram(
            pen,
            0,
            -1,
            rx * 0.78,
            0.28,
            -(cfg.progress || 0) * 5.0,
            blood[5],
            abyss[5],
            0.90 * env
          );
        } else {
          drawTiltedOrbitBand(
            pen,
            0,
            0,
            rx * 0.86,
            0.26,
            1.6,
            0.86 * env,
            [PITCH_BLACK, INK_VOID, abyss[3], abyss[5]],
            FRONT_HALF,
            false
          );
        }

        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 10. SURPRISE AMBUSH SHADOW ERUPTION PILLAR (`abyssalShadowEruptionPillar`)
// ============================================================================
export const abyssalShadowEruptionPillar = {
  duration: 0.52,
  loop: false,
  defaults: {
    palette: BLOOD_MOON_CRIMSON_PALETTE,
    seed: 631,
    facing: 1
  },
  create(cfg) {
    const blood = buildColorRamp(cfg.palette, 8);
    const abyss = buildColorRamp(ABYSSAL_VIOLET_PALETTE, 8);
    const bone = buildColorRamp(NECROPOLIS_BONE_PALETTE, 8);
    const PITCH_BLACK = packHexColor('#030108');
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({
      rng,
      sparkRamp: [PURE_WHITE, blood[5], abyss[5], PITCH_BLACK],
      floorY: 2
    });
    let t = 0;
    let burstDone = false;

    return {
      step(dt) {
        if (!burstDone) {
          burstDone = true;
          for (let i = 0; i < 24; i++) {
            const ang = rng.between(-Math.PI * 0.86, -Math.PI * 0.14);
            const spd = rng.between(65, 195);
            motes.emit(
              i % 2 === 0 ? 'streak' : 'glint',
              rng.between(-16, 16),
              rng.between(-6, 0),
              Math.cos(ang) * spd,
              Math.sin(ang) * spd,
              rng.between(0.20, 0.42),
              i % 3 === 0 ? PITCH_BLACK : i % 2 === 0 ? blood[5] : abyss[6],
              1,
              28
            );
          }
        }
        t += dt;
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 0.52);
        const rise = smoothStep(0, 0.22, u);
        const fade = 1 - smoothStep(0.56, 1.0, u);
        const env = rise * fade;
        if (env <= 0.02) return;

        const halfW = 24 * (1 - u * 0.28);
        const topY = -66 * rise;

        // Tapered pitch-black & crimson shadow spindle geyser (fades smoothly to 0 on all sides!)
        pen.shadeBox(-halfW - 8, topY - 8, halfW + 8, 8, (lx, ly, out) => {
          if (ly > 3 || ly < topY) return 0;
          const uY = clamp01(-ly / Math.max(1, -topY));
          const curW = halfW * (1 - Math.pow(uY, 1.35)) * (0.85 + 0.15 * Math.sin(uY * 9 - u * 12));
          const adx = Math.abs(lx);
          if (adx >= curW) return 0;

          const edgeRatio = adx / Math.max(0.5, curW);
          const topFade = 1 - smoothStep(0.78, 1.0, uY);
          const botFade = smoothStep(-3, 0, -ly + 2);
          const aFade = env * topFade * (0.85 + 0.15 * botFade);
          if (aFade <= 0.02) return 0;

          if (edgeRatio < 0.24) {
            out.color = u < 0.26 ? PURE_WHITE : blood[5];
            out.alpha = 0.96 * aFade;
            return out.color;
          }
          if (edgeRatio < 0.56) {
            out.color = PITCH_BLACK;
            out.alpha = 0.96 * aFade;
            return out.color;
          }
          out.color = edgeRatio < 0.80 ? abyss[2] : PITCH_BLACK;
          out.alpha = (1 - smoothStep(0.72, 1.0, edgeRatio)) * 0.92 * aFade;
          return out.color;
        });

        // 6 Jagged Pitch-Black Shadow Jaws erupting outward from groundY
        for (let k = 0; k < 6; k++) {
          const side = k % 2 === 0 ? -1 : 1;
          const rank = Math.floor(k / 2);
          const bx = side * (8 + rank * 9.5);
          const spikeH = (36 - rank * 7) * rise * fade;
          const tipX = bx + side * (5 + rank * 3);
          const tipY = -spikeH;
          pen.line(bx - 1.5, 0, tipX, tipY, PITCH_BLACK, 0.96 * env);
          pen.line(bx + 1.5, 0, tipX, tipY, PITCH_BLACK, 0.96 * env);
          pen.line(bx, 0, tipX, tipY, rank === 0 ? blood[5] : abyss[5], 0.94 * env);
          pen.fillCircle(tipX, tipY, 1.4, bone[6], 0.92 * env);
        }
      },
      renderFront(pen) {
        const u = clamp01(t / 0.52);
        const fade = 1 - smoothStep(0.58, 1.0, u);
        if (fade <= 0.02) return;
        const dir = cfg.facing >= 0 ? 1 : -1;

        drawMultiLayerCrescentArc(pen, {
          cx: dir * 6,
          cy: -28 - u * 14,
          radius: 26 * (0.8 + 0.25 * u),
          width: 9.5,
          eccentricity: 0.84,
          headAngle: dir > 0 ? -1.45 : -1.69,
          tailAngle: dir > 0 ? 1.15 : 1.99,
          fade,
          ramp: blood,
          seed: cfg.seed || 631,
          t: u,
          flashHot: u < 0.32
        });

        const bolt = buildLightningChain(rng, 0, 0, dir * 8, -58 * fade, 0.14, 4);
        pen.polyline(bolt, PURE_WHITE, 0.92 * fade);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 11. DEATH COMPANION RIFT PORTAL (`companionSummonRiftPortal`)
// ============================================================================
export const companionSummonRiftPortal = {
  duration: 0.68,
  loop: false,
  defaults: {
    palette: ABYSSAL_VIOLET_PALETTE,
    seed: 653,
    isHealer: false
  },
  create(cfg) {
    const mainRamp = buildColorRamp(
      cfg.isHealer ? NECRO_SOUL_EMERALD_PALETTE : ABYSSAL_VIOLET_PALETTE,
      8
    );
    const accentRamp = buildColorRamp(
      cfg.isHealer ? ABYSSAL_VIOLET_PALETTE : BLOOD_MOON_CRIMSON_PALETTE,
      8
    );
    const bone = buildColorRamp(NECROPOLIS_BONE_PALETTE, 8);
    const DARK = packHexColor('#04020a');
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({
      rng,
      sparkRamp: [PURE_WHITE, mainRamp[6], mainRamp[4], accentRamp[5]],
      floorY: 2
    });
    let t = 0;
    let emitted = false;

    return {
      step(dt) {
        if (!emitted) {
          emitted = true;
          for (let i = 0; i < 20; i++) {
            const a = rng.between(0, Math.PI * 2);
            const spd = rng.between(32, 115);
            motes.emit(
              i % 2 === 0 ? 'glint' : 'spark',
              Math.cos(a) * 8,
              -26 + Math.sin(a) * 18,
              Math.cos(a) * spd,
              Math.sin(a) * spd - 18,
              rng.between(0.24, 0.48),
              i % 3 === 0 ? accentRamp[5] : mainRamp[5],
              1,
              -10
            );
          }
        }
        t += dt;
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 0.68);
        const openU = smoothStep(0, 0.24, u) * (1 - smoothStep(0.62, 1.0, u));
        if (openU <= 0.02) return;

        const cx = 0;
        const cy = -28;
        const rx = 18 * openU;
        const ry = 32 * (0.75 + 0.25 * openU);

        pen.radialGlow(cx, cy, 26 * openU, mainRamp[5], 0.34 * openU);

        // Diamond-spindle dimensional tear behind the summoned companion (0 box clipping!)
        pen.shadeBox(cx - rx - 7, cy - ry - 7, cx + rx + 7, cy + ry + 7, (lx, ly, out) => {
          const dy = Math.abs(ly - cy) / Math.max(1, ry);
          if (dy >= 1.0) return 0;
          const halfSpan = rx * Math.pow(1 - dy, 0.78);
          const dx = Math.abs(lx - cx);
          if (dx >= halfSpan) return 0;

          const rFrac = dx / Math.max(0.5, halfSpan);
          if (rFrac < 0.28) {
            out.color = u < 0.28 ? PURE_WHITE : DARK;
            out.alpha = 0.96 * openU;
            return out.color;
          }
          if (rFrac < 0.66) {
            out.color = mainRamp[5];
            out.alpha = 0.92 * openU;
            return out.color;
          }
          out.color = accentRamp[4];
          out.alpha = (1 - smoothStep(0.66, 1.0, rFrac)) * 0.88 * openU;
          return out.color;
        });

        drawThanatosPentagram(
          pen,
          0,
          0,
          24 * openU,
          0.28,
          u * 4.5,
          mainRamp[5],
          bone[5],
          0.90 * openU,
          BACK_HALF
        );
      },
      renderFront(pen) {
        const u = clamp01(t / 0.68);
        const openU = smoothStep(0, 0.24, u) * (1 - smoothStep(0.62, 1.0, u));
        if (openU > 0.02) {
          drawThanatosPentagram(
            pen,
            0,
            0,
            24 * openU,
            0.28,
            u * 4.5,
            mainRamp[6],
            accentRamp[5],
            0.92 * openU,
            FRONT_HALF
          );
          drawStarburstFlare(pen, 0, -28, 13 * openU, 0.92 * openU, [
            mainRamp[4],
            accentRamp[5],
            mainRamp[6],
            PURE_WHITE
          ]);
        }
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 12. DEATH-MAGE DARK MAGIC CAST SIGIL & IMPACT (`darkMageVoidCastSigil`, `darkMageHexImpactNova`)
// ============================================================================
export const darkMageVoidCastSigil = {
  duration: 0.42,
  loop: false,
  defaults: {
    palette: ABYSSAL_VIOLET_PALETTE,
    seed: 677,
    isEmpowered: false
  },
  create(cfg) {
    const abyss = buildColorRamp(cfg.palette, 8);
    const blood = buildColorRamp(BLOOD_MOON_CRIMSON_PALETTE, 8);
    const PITCH_BLACK = packHexColor('#030108');
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({
      rng,
      sparkRamp: [PURE_WHITE, abyss[6], blood[5], PITCH_BLACK]
    });
    let t = 0;
    let emitted = false;

    return {
      step(dt) {
        if (!emitted) {
          emitted = true;
          for (let i = 0; i < 12; i++) {
            const a = rng.between(0, Math.PI * 2);
            const r = rng.between(10, 20);
            motes.emit(
              'glint',
              Math.cos(a) * r,
              Math.sin(a) * r,
              -Math.cos(a) * 38,
              -Math.sin(a) * 38,
              rng.between(0.18, 0.34),
              cfg.isEmpowered && i % 2 === 0 ? blood[5] : abyss[5],
              1,
              0
            );
          }
        }
        t += dt;
        motes.step(dt);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.42);
        const env = smoothStep(0, 0.18, u) * (1 - smoothStep(0.65, 1.0, u));
        if (env <= 0.02) return;

        const r = (cfg.isEmpowered ? 15 : 12.5) * (0.82 + 0.24 * Math.sin(u * Math.PI));
        pen.radialGlow(0, 0, r * 1.35, cfg.isEmpowered ? blood[5] : abyss[5], 0.34 * env);
        drawThanatosPentagram(
          pen,
          0,
          0,
          r,
          0.86,
          u * Math.PI * 1.6,
          abyss[6],
          cfg.isEmpowered ? blood[5] : abyss[4],
          0.95 * env
        );
        // Tight pitch-black dark-matter singularity core with hot rim!
        pen.fillCircle(0, 0, r * 0.32, abyss[5], 0.94 * env);
        pen.fillCircle(0, 0, r * 0.21, PITCH_BLACK, 0.96 * env);
        pen.stipple(0, 0, PURE_WHITE, 0.96 * env);
        motes.render(pen);
      }
    };
  }
};

export const darkMageHexImpactNova = {
  duration: 0.40,
  loop: false,
  defaults: {
    palette: ABYSSAL_VIOLET_PALETTE,
    seed: 701,
    isEmpowered: false
  },
  create(cfg) {
    const abyss = buildColorRamp(cfg.palette, 8);
    const blood = buildColorRamp(BLOOD_MOON_CRIMSON_PALETTE, 8);
    const bone = buildColorRamp(NECROPOLIS_BONE_PALETTE, 8);
    const PITCH_BLACK = packHexColor('#030108');
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({
      rng,
      sparkRamp: [PURE_WHITE, abyss[6], blood[5], PITCH_BLACK]
    });
    let t = 0;
    let burstDone = false;

    return {
      step(dt) {
        if (!burstDone) {
          burstDone = true;
          for (let i = 0; i < 18; i++) {
            const a = (i / 18) * Math.PI * 2 + rng.between(-0.15, 0.15);
            const spd = rng.between(55, 165);
            motes.emit(
              i % 2 === 0 ? 'streak' : 'glint',
              0,
              0,
              Math.cos(a) * spd,
              Math.sin(a) * spd,
              rng.between(0.16, 0.34),
              i % 3 === 0 ? PITCH_BLACK : cfg.isEmpowered || i % 2 === 0 ? blood[5] : abyss[6],
              1,
              14
            );
          }
        }
        t += dt;
        motes.step(dt);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.40);
        const pop = 0.65 + 0.45 * smoothStep(0, 0.25, u);
        const fade = 1 - smoothStep(0.55, 1.0, u);
        if (fade <= 0.02) return;

        pen.radialGlow(0, 0, 20 * pop, abyss[5], 0.36 * fade);
        // Tight pitch-black gravitational implosion pin + 6-point hex burst
        pen.fillCircle(0, 0, 6.2 * pop * fade, abyss[5], 0.90 * fade);
        pen.fillCircle(0, 0, 3.8 * pop * fade, PITCH_BLACK, 0.96 * fade);
        drawThanatosPentagram(
          pen,
          0,
          0,
          19 * pop,
          0.92,
          -u * 2.4,
          cfg.isEmpowered ? blood[5] : abyss[6],
          PURE_WHITE,
          0.92 * fade
        );
        drawPixelSkullOrb(pen, 0, -1, 4.4 * fade, bone[6], blood[5], fade);
        drawStarburstFlare(pen, 0, 0, 14 * fade, 0.95 * fade, [
          abyss[4],
          blood[5],
          abyss[6],
          PURE_WHITE
        ]);
        motes.render(pen);
      }
    };
  }
};

// ============================================================================
// 13. SOUL-HEALER NECRO-MEND TETHER & 2.5D HALO (`necroHealerSoulTether`, `necroHealerMendHalo`)
// ============================================================================
export const necroHealerSoulTether = {
  duration: 0.44,
  loop: false,
  defaults: {
    palette: NECRO_SOUL_EMERALD_PALETTE,
    seed: 733,
    dx: 90,
    dy: 0
  },
  create(cfg) {
    const soul = buildColorRamp(cfg.palette, 8);
    const abyss = buildColorRamp(ABYSSAL_VIOLET_PALETTE, 8);
    let t = 0;

    return {
      step(dt) {
        t += dt;
      },
      renderFront(pen) {
        const u = clamp01(t / 0.44);
        const fade = smoothStep(0, 0.14, u) * (1 - smoothStep(0.68, 1.0, u));
        if (fade <= 0.02) return;

        // Convert world pixel delta (dx, dy) into ArcaneShaderFX 3px pen space
        const tx = (cfg.dx || 90) / 3;
        const ty = (cfg.dy || 0) / 3;
        const steps = 18;
        let prevAx = 0;
        let prevAy = 0;
        let prevBx = 0;
        let prevBy = 0;

        for (let i = 0; i <= steps; i++) {
          const s = i / steps;
          const arcLift = -Math.sin(s * Math.PI) * 6.5;
          const wave = Math.sin(s * Math.PI * 3 - u * Math.PI * 5) * 2.6 * Math.sin(s * Math.PI);
          const bx = tx * s;
          const by = ty * s + arcLift;

          const ax = bx;
          const ay = by + wave;
          const cx = bx;
          const cy = by - wave;

          if (i > 0) {
            pen.line(prevAx, prevAy, ax, ay, soul[5], 0.94 * fade);
            pen.line(prevBx, prevBy, cx, cy, abyss[6], 0.82 * fade);
          }
          if (i % 4 === 0) {
            pen.fillCircle(ax, ay, 1.3, PURE_WHITE, 0.94 * fade);
          }
          prevAx = ax;
          prevAy = ay;
          prevBx = cx;
          prevBy = cy;
        }

        // Traveling Luminous Soul-Cross Mote gliding from Soul-Healer -> Death-Mage!
        const orbU = clamp01(u * 1.18);
        const ox = tx * orbU;
        const oy = ty * orbU - Math.sin(orbU * Math.PI) * 6.5;
        pen.radialGlow(ox, oy, 9, soul[5], 0.42 * fade);
        pen.line(ox - 3.5, oy, ox + 3.5, oy, soul[6], 0.98 * fade);
        pen.line(ox, oy - 3.5, ox, oy + 3.5, soul[6], 0.98 * fade);
        pen.fillCircle(ox, oy, 1.6, PURE_WHITE, 0.98 * fade);
      }
    };
  }
};

export const necroHealerMendHalo = {
  duration: 0.56,
  loop: false,
  defaults: {
    palette: NECRO_SOUL_EMERALD_PALETTE,
    seed: 757
  },
  create(cfg) {
    const soul = buildColorRamp(cfg.palette, 8);
    const abyss = buildColorRamp(ABYSSAL_VIOLET_PALETTE, 8);
    const haloRamp = [soul[2], abyss[5], soul[5], PURE_WHITE];
    const rng = new DeterministicRng(cfg.seed);
    const motes = new MotePool({
      rng,
      sparkRamp: [PURE_WHITE, soul[6], soul[5], abyss[6]],
      floorY: 2
    });
    let t = 0;
    let emitted = false;

    return {
      step(dt) {
        if (!emitted) {
          emitted = true;
          for (let i = 0; i < 14; i++) {
            const rx = rng.between(-16, 16);
            motes.emit(
              i % 2 === 0 ? 'glint' : 'spark',
              rx,
              rng.between(-8, 0),
              rng.between(-10, 10),
              rng.between(-64, -26),
              rng.between(0.26, 0.48),
              i % 3 === 0 ? abyss[6] : soul[5],
              1,
              -10
            );
          }
        }
        t += dt;
        motes.step(dt);
      },
      renderBack(pen) {
        const u = clamp01(t / 0.56);
        const fade = smoothStep(0, 0.16, u) * (1 - smoothStep(0.62, 1.0, u));
        if (fade <= 0.02) return;
        const liftY = -8 - u * 24;
        drawTiltedOrbitBand(pen, 0, liftY, 20, 0.28, 2.0, 0.88 * fade, haloRamp, BACK_HALF, false);
      },
      renderFront(pen) {
        const u = clamp01(t / 0.56);
        const fade = smoothStep(0, 0.16, u) * (1 - smoothStep(0.62, 1.0, u));
        if (fade <= 0.02) return;
        const liftY = -8 - u * 24;
        drawTiltedOrbitBand(pen, 0, liftY, 20, 0.28, 2.2, 0.95 * fade, haloRamp, FRONT_HALF, u < 0.25);

        // Floating Pixel Restoration Crosses ascending around the Death-Mage!
        for (let k = -1; k <= 1; k++) {
          const cx = k * 11;
          const cy = -16 - u * 26 - (k === 0 ? 6 : 0);
          pen.line(cx - 2.5, cy, cx + 2.5, cy, soul[5], 0.94 * fade);
          pen.line(cx, cy - 2.5, cx, cy + 2.5, soul[5], 0.94 * fade);
          pen.stipple(cx, cy, PURE_WHITE, 0.98 * fade);
        }
        motes.render(pen);
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
  abyssalShadowBurrowPool,
  abyssalShadowEruptionPillar,
  companionSummonRiftPortal,
  darkMageVoidCastSigil,
  darkMageHexImpactNova,
  necroHealerSoulTether,
  necroHealerMendHalo,
  soulScytheWaveCell,
  abyssalSkullWispCell,
  necroticBoneSpireCell,
  thanatosPentagramSealCell,
  abyssalReapNovaCell,
  necropolisObsidianGatesCell,
  graveChainAltarBindCell,
  mementoMoriGuillotineCell
};

