import { drawExBayerHalo } from './exNextGenFX.js?v=30fps199';

/**
 * Behemoth Malphas 2.0 — Dedicated HD-2D Boss Shader & 30fps Overlay Atlas Renderer
 *
 * Renders layered additive boss auras, volumetric crimson/violet caldera furnace glow,
 * Phase I -> II -> III visual escalation, dramatic phase-shift shockwaves, HD-2D runic
 * ground telegraphs & molten fissure corridors, synchronized 30fps wing/attack overlays,
 * and foreground Clamping Siege-Claw Talons + Abyssal Chains + Contracting Violet Rune-Vise
 * drawn IN FRONT OF the pinned hero during `ABYSSAL SIEGE GRAB`.
 *
 * Strict Engine Invariants:
 *   - ZERO `ctx.rotate()`, ZERO `ctx.ellipse()`, ZERO `ctx.arc()` calls!
 *   - 100% balanced `ctx.save()` / `ctx.restore()` on every path.
 *   - Strictly pixel-snapped integer `drawImage` / `fillRect` geometry (`imageSmoothingEnabled = false`).
 *   - Restrained additive bloom (`alpha <= 0.24`) so Malphas's 2x2 pixel-art armor & ribs stay razor-sharp.
 */

export const MALPHAS_VFX_CELL = 256;
export const MALPHAS_VFX_COLS = 12;
export const MALPHAS_VFX_ROWS = 12;

export const MALPHAS_VFX_ROW = {
  RIGHT_WING_FLAP: 0,
  LEFT_WING_EMBERS: 1,
  GRAB_CLAMP_TALONS: 2,
  GRAB_RUNE_VISE: 3,
  RUNIC_GROUND_SIGIL: 4,
  LANE_FISSURE_SURGE: 5,
  HELLFIRE_TORRENT: 6,
  TRIPLE_TALON_SLASH: 7,
  MAGMA_PLUME: 8,
  BURNING_ECLIPSE: 9,
  ABYSSAL_LIGHTNING: 10,
  HEART_CORE_VORTEX: 11
};

function isVfxReady(img) {
  return Boolean(img && img.complete && img.naturalWidth >= MALPHAS_VFX_CELL * MALPHAS_VFX_COLS);
}

export function blitMalphasVfxCell(ctx, vfxImg, col, row, dx, dy, dw, dh) {
  if (
    !ctx ||
    !isVfxReady(vfxImg) ||
    !Number.isFinite(dx) ||
    !Number.isFinite(dy) ||
    !Number.isFinite(dw) ||
    !Number.isFinite(dh)
  ) {
    return;
  }
  const c = ((col % MALPHAS_VFX_COLS) + MALPHAS_VFX_COLS) % MALPHAS_VFX_COLS;
  const r = Math.max(0, Math.min(MALPHAS_VFX_ROWS - 1, row | 0));
  ctx.drawImage(
    vfxImg,
    c * MALPHAS_VFX_CELL,
    r * MALPHAS_VFX_CELL,
    MALPHAS_VFX_CELL,
    MALPHAS_VFX_CELL,
    Math.round(dx),
    Math.round(dy),
    Math.max(1, Math.round(dw)),
    Math.max(1, Math.round(dh))
  );
}

function snap2(v) {
  return Math.round(v * 0.5) * 2;
}

/**
 * Draws a razor-thin stepped-pixel forked lightning arc (`0` rotate/arc/ellipse).
 */
function drawPixelLightningBolt(ctx, x0, y0, x1, y1, seed, outerCol, midCol, coreCol) {
  const segs = 7;
  const ptsX = new Float32Array(segs + 1);
  const ptsY = new Float32Array(segs + 1);
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    const jit =
      i === 0 || i === segs
        ? 0
        : Math.sin(seed * 17.3 + i * 4.7) * 16 + Math.cos(seed * 9.1 - i * 3.1) * 9;
    ptsX[i] = x0 + dx * u + nx * jit;
    ptsY[i] = y0 + dy * u + ny * jit;
  }

  const drawPass = (thick, color) => {
    ctx.fillStyle = color;
    const half = Math.floor(thick * 0.5);
    for (let i = 0; i < segs; i++) {
      const ax = ptsX[i];
      const ay = ptsY[i];
      const bx = ptsX[i + 1];
      const by = ptsY[i + 1];
      const steps = Math.max(2, Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay)) / 3));
      for (let s = 0; s <= steps; s++) {
        const u = s / steps;
        const px = snap2(ax + (bx - ax) * u);
        const py = snap2(ay + (by - ay) * u);
        ctx.fillRect(px - half, py - half, thick, thick);
      }
    }
  };

  drawPass(6, outerCol);
  drawPass(4, midCol);
  drawPass(2, coreCol);
}

/**
 * Draws an octagonal stepped-pixel expanding shockwave ring (`0` rotate/arc/ellipse).
 */
function drawSteppedShockRing(ctx, cx, cy, rx, ry, thickness, color, alpha = 0.8) {
  if (rx <= 4 || ry <= 4 || alpha <= 0.02) return;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.fillStyle = color;
  const steps = 28;
  const th = Math.max(2, snap2(thickness));
  const half = Math.floor(th * 0.5);
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const px = snap2(cx + Math.cos(a) * rx);
    const py = snap2(cy + Math.sin(a) * ry);
    ctx.fillRect(px - half, py - half, th, th);
  }
  ctx.restore();
}

/**
 * 1. Layered Boss Backdrop Aura, Volumetric Furnace Glow, Phase I -> II -> III Visual Escalation
 *    & Dramatic Phase-Shift Shockwave (drawn inside `ArchfiendBoss.draw` behind the rig).
 */
export function drawMalphasBackdropAura(ctx, boss, t, coords, renderer, vfxImg) {
  if (!ctx || !boss) return;
  const { anchorBaseX, torsoX, torsoY, skullX, skullY, torsoSize, isRoaring, isVulnerable } = coords;
  const phase = boss.bossPhase || 1;
  const deathFade = boss.isDead
    ? Math.max(0, 1 - Math.max(0, (boss.deathTimer || 0) - 1.1) * 0.95)
    : 1;
  if (deathFade <= 0.02) return;

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // A. Volumetric caldera crimson / abyssal violet lightmap backdrop (restrained additive bloom)
  const furnacePulse = 0.5 + 0.5 * Math.sin(t * (phase >= 3 ? 6.4 : phase >= 2 ? 4.4 : 2.8));
  if (renderer && typeof renderer.getGlowForColor === 'function') {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const primaryCol = phase >= 3 ? '#c084fc' : phase >= 2 ? '#ef4444' : '#ea580c';
    const secCol = phase >= 3 ? '#f43f5e' : '#f59e0b';
    const baseGlowA = (phase >= 3 ? 0.21 : phase >= 2 ? 0.17 : 0.12) + furnacePulse * 0.04;
    ctx.globalAlpha = Math.min(0.24, baseGlowA * deathFade);
    const g1 = renderer.getGlowForColor(primaryCol);
    if (g1) {
      ctx.drawImage(g1, Math.round(torsoX - 110), Math.round(torsoY - 40), 680, 520);
    }
    ctx.globalAlpha = Math.min(0.18, (0.09 + furnacePulse * 0.05 + (isRoaring ? 0.05 : 0)) * deathFade);
    const g2 = renderer.getGlowForColor(secCol);
    if (g2) {
      ctx.drawImage(g2, Math.round(torsoX + 10), Math.round(torsoY + 95), 420, 340);
    }
    ctx.restore();
  }

  // B. Crisp Bayer-dithered pixel caldera halo tucked cleanly behind Malphas's furnace & crown
  drawExBayerHalo(
    ctx,
    torsoX + 205,
    torsoY + 250,
    phase >= 3 ? 196 : phase >= 2 ? 172 : 148,
    phase >= 3 ? 124 : 104,
    phase >= 3 ? '#9333ea' : '#dc2626',
    phase >= 3 ? '#f43f5e' : '#fb923c',
    (0.11 + furnacePulse * 0.05) * deathFade
  );

  // C. Phase II & Phase III Rotating Burning Abyssal-Solar Eclipse Halo behind Malphas's skull/horns!
  if (!boss.isDead && phase >= 2 && isVfxReady(vfxImg)) {
    const eclipseFrame = Math.floor(t * (phase >= 3 ? 24 : 16)) % MALPHAS_VFX_COLS;
    const ecSz = phase >= 3 ? 372 : 318;
    const ecCx = skullX + 206;
    const ecCy = skullY + 94 + Math.round(Math.sin(t * 2.8) * 4);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = phase >= 3 ? 0.78 : 0.62;
    blitMalphasVfxCell(
      ctx,
      vfxImg,
      eclipseFrame,
      MALPHAS_VFX_ROW.BURNING_ECLIPSE,
      ecCx - ecSz * 0.5,
      ecCy - ecSz * 0.5,
      ecSz,
      ecSz
    );
    ctx.restore();
  }

  // D. Phase III Overdrive: Crackling Abyssal Lightning Arcs behind wings & parapet!
  if (!boss.isDead && phase >= 3) {
    const boltFrame = Math.floor(t * 24) % MALPHAS_VFX_COLS;
    if (isVfxReady(vfxImg)) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.72;
      blitMalphasVfxCell(
        ctx,
        vfxImg,
        boltFrame,
        MALPHAS_VFX_ROW.ABYSSAL_LIGHTNING,
        torsoX - 150,
        torsoY - 35,
        320,
        320
      );
      blitMalphasVfxCell(
        ctx,
        vfxImg,
        (boltFrame + 5) % MALPHAS_VFX_COLS,
        MALPHAS_VFX_ROW.ABYSSAL_LIGHTNING,
        torsoX + 250,
        torsoY - 20,
        300,
        300
      );
      ctx.restore();
    }
    // Crisp razor-thin pixel lightning discharge snapping periodically from crown/pauldrons
    const boltTick = Math.floor(t * 10);
    if (boltTick % 3 === 0) {
      drawPixelLightningBolt(
        ctx,
        skullX + 204,
        skullY + 46,
        torsoX - 90 + (boltTick % 5) * 18,
        torsoY + 210,
        boltTick,
        '#6b21a8',
        '#d946ef',
        '#ffffff'
      );
    }
  }

  // E. Dramatic Phase-Shift Shockwave Burst (`boss._phaseShiftFlashTimer`: 1.15s -> 0)
  const shiftTimer = boss._phaseShiftFlashTimer || 0;
  if (!boss.isDead && shiftTimer > 0) {
    const u = Math.max(0, Math.min(1, 1 - shiftTimer / 1.15));
    const fade = Math.max(0, 1 - u);
    const cx = Math.round(torsoX + 205);
    const cy = Math.round(torsoY + 225);
    const r1 = 80 + u * 520;
    const r2 = 40 + u * 380;
    drawSteppedShockRing(
      ctx,
      cx,
      cy,
      r1,
      r1 * 0.56,
      10 * fade + 2,
      phase >= 3 ? '#d946ef' : '#ef4444',
      fade * 0.85
    );
    drawSteppedShockRing(
      ctx,
      cx,
      cy,
      r2,
      r2 * 0.56,
      6 * fade + 2,
      '#fef08a',
      fade * 0.92
    );
    if (u < 0.55) {
      drawPixelLightningBolt(
        ctx,
        cx - 120,
        torsoY - 120,
        cx - 80,
        640,
        Math.floor(t * 30),
        '#7e22ce',
        '#f43f5e',
        '#ffffff'
      );
      drawPixelLightningBolt(
        ctx,
        cx + 120,
        torsoY - 110,
        cx + 90,
        640,
        Math.floor(t * 30) + 17,
        '#b91c1c',
        '#fb923c',
        '#fef08a'
      );
    }
  }

  // F. Subtle caldera parapet underglow tucked cleanly inside rim mouth
  ctx.fillStyle = isVulnerable
    ? 'rgba(56, 189, 248, 0.20)'
    : isRoaring
      ? 'rgba(251, 146, 60, 0.24)'
      : phase >= 3
        ? 'rgba(192, 132, 252, 0.20)'
        : 'rgba(239, 68, 68, 0.16)';
  ctx.fillRect(anchorBaseX + 98, 594, torsoSize - 196, 34);

  ctx.restore();
}

/**
 * 2. Blazing Furnace/Throat Breathing Glow, Synchronized Left-Wing Ember Shimmer,
 *    & Rich Phase-Scaled Ash/Ember Particle Aura inside the Boss Rig.
 */
export function drawMalphasBodyAuraOverlays(ctx, boss, t, coords, vfxImg) {
  if (!ctx || !boss || boss.isDead) return;
  const {
    torsoX,
    torsoY,
    skullX,
    skullY,
    jawDropPx,
    wingLX,
    wingLY,
    wingLSize,
    isRoaring,
    isVulnerable
  } = coords;
  const phase = boss.bossPhase || 1;

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // A. Left-Wing synchronized ember-vein wind-shear shimmer overlay (`Row 1` of boss VFX atlas)
  if (isVfxReady(vfxImg) && (phase >= 2 || isRoaring || boss.state === 'SKILL' || boss.state === 'ULTIMATE')) {
    const wingFrame = Math.floor((boss.wingPhase || 0) * 3) % MALPHAS_VFX_COLS;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = phase >= 3 ? 0.56 : isRoaring ? 0.48 : 0.34;
    blitMalphasVfxCell(
      ctx,
      vfxImg,
      wingFrame,
      MALPHAS_VFX_ROW.LEFT_WING_EMBERS,
      wingLX,
      wingLY,
      wingLSize,
      wingLSize
    );
    ctx.restore();
  }

  // B. Breathing Incandescent Ribcage Furnace & Open-Throat Glow (Bayer pixel pool, zero blur washout)
  const breath = 0.5 + 0.5 * Math.sin(t * (phase >= 3 ? 7.0 : 3.8));
  const heartX = Math.round(torsoX + 197);
  const heartY = Math.round(torsoY + 256);
  drawExBayerHalo(
    ctx,
    heartX,
    heartY,
    62 + Math.round(breath * 14),
    72 + Math.round(breath * 14),
    isVulnerable ? '#38bdf8' : phase >= 3 ? '#f43f5e' : '#ea580c',
    isVulnerable ? '#fef08a' : '#fde047',
    isVulnerable ? 0.26 : 0.14 + breath * 0.08
  );

  // Blazing open-jaw furnace throat glow scaling smoothly with jawDropPx!
  const jawRatio = Math.max(0, Math.min(1, boss.jawOpen || 0));
  if (jawRatio > 0.25 || isRoaring) {
    const throatX = Math.round(skullX + 174);
    const throatY = Math.round(skullY + 148 + jawDropPx * 0.35);
    drawExBayerHalo(
      ctx,
      throatX,
      throatY,
      26 + Math.round(jawRatio * 24),
      20 + Math.round(jawRatio * 18),
      '#ea580c',
      '#fef08a',
      Math.min(0.28, 0.10 + jawRatio * 0.18)
    );
  }

  // C. Rising stepped-pixel Sovereign Hellfire Embers & Volcanic Ash Flakes
  const emberCount = phase >= 3 ? 12 : phase >= 2 ? 9 : 7;
  const tick = Math.floor(t * 22);
  for (let i = 0; i < emberCount; i++) {
    const ph = (t * (1.25 + (i % 3) * 0.28) + i * 0.137) % 1.0;
    const sway = Math.sin(ph * Math.PI * 2 + i * 1.9) * 18;
    const ex = snap2(torsoX + 64 + ((i * 59 + tick) % 330) + sway);
    const ey = snap2(torsoY + 360 - ph * 290);
    const isViolet = phase >= 3 && i % 3 === 0;
    const isAsh = i % 4 === 3;
    if (isAsh) {
      ctx.fillStyle = '#4c1d95';
      ctx.fillRect(ex, ey, 4, 2);
      ctx.fillStyle = '#0d0f1c';
      ctx.fillRect(ex + 2, ey + 2, 2, 2);
    } else {
      ctx.fillStyle = isViolet ? '#f5d0fe' : i % 2 === 0 ? '#fef08a' : '#fb923c';
      ctx.fillRect(ex, ey, 4, 4);
      ctx.fillStyle = isViolet ? '#a855f7' : '#ef4444';
      ctx.fillRect(ex, ey + 4, 4, 2);
    }
  }

  ctx.restore();
}

/**
 * 3. HD-2D Runic Ground Telegraph Sigils & Molten Fissure Corridors
 *    Replaces flat `fillRect`/`strokeRect` danger boxes and crude `<<<` block chevrons!
 */
export function drawMalphasRunicTelegraphs(ctx, boss, t, vfxImg) {
  if (!ctx || !boss) return;
  const ready = isVfxReady(vfxImg);
  const sigilFrame = Math.floor(t * 20) % MALPHAS_VFX_COLS;
  const laneFrame = Math.floor(t * 24) % MALPHAS_VFX_COLS;

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // A. Upgrade every active point `telegraphRings` (Fist Crush, Hellfire Seal, Cataclysm, Grab Target)
  if (Array.isArray(boss.telegraphRings) && boss.telegraphRings.length > 0) {
    for (let i = 0; i < boss.telegraphRings.length; i++) {
      const ring = boss.telegraphRings[i];
      const prog = Math.max(0, Math.min(1, ring.timer / Math.max(0.05, ring.maxTimer)));
      const rx = Math.round(ring.radius * 1.12);
      const ry = Math.round(ring.radius * 0.48);
      const cx = Math.round(ring.x);
      const cy = Math.round(ring.y);

      // Subtle dark obsidian floor scorch anchor + Bayer core charge pool
      drawExBayerHalo(
        ctx,
        cx,
        cy,
        Math.round(rx * (0.45 + prog * 0.55)),
        Math.round(ry * (0.45 + prog * 0.55)),
        ring.color || '#ef4444',
        '#fef08a',
        0.16 + prog * 0.22
      );

      if (ready) {
        const sw = Math.round(rx * 2.25);
        const sh = Math.round(ry * 2.45);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.58 + prog * 0.36;
        blitMalphasVfxCell(
          ctx,
          vfxImg,
          (sigilFrame + i * 3) % MALPHAS_VFX_COLS,
          MALPHAS_VFX_ROW.RUNIC_GROUND_SIGIL,
          cx - sw * 0.5,
          cy - sh * 0.5,
          sw,
          sh
        );
        ctx.restore();
      }

      // Contracting inner impact countdown ring snapping to outer circle at detonation!
      drawSteppedShockRing(
        ctx,
        cx,
        cy,
        Math.max(10, rx * (1 - prog * 0.85)),
        Math.max(6, ry * (1 - prog * 0.85)),
        prog > 0.78 ? 4 : 2,
        prog > 0.78 ? '#ffffff' : '#fef08a',
        0.85
      );
    }
  }

  // B. Arena-Wide Unavoidable `HELLPIT SOUL-TITHE` Runic Blood-Pact Floor Ritual
  if ((boss.soulTitheWindupTimer || 0) > 0 || (boss.soulTitheFlashTimer || 0) > 0) {
    const isFlash = (boss.soulTitheFlashTimer || 0) > 0;
    const sx0 = Math.round(boss.anchorX - 960);
    const sx1 = Math.round(boss.anchorX - 96);
    const sw = sx1 - sx0;
    const sy0 = 456;
    const sh = 212;
    const pulse = 0.5 + 0.5 * Math.sin(t * 22);

    // Restrained crimson floor mist + beveled gothic altar border rails
    ctx.fillStyle = isFlash
      ? `rgba(244, 63, 94, ${Math.min(0.28, (boss.soulTitheFlashTimer || 0) * 0.58).toFixed(3)})`
      : `rgba(153, 27, 27, ${(0.12 + pulse * 0.08).toFixed(3)})`;
    ctx.fillRect(sx0, sy0, sw, sh);

    // Stepped obsidian-and-gold cathedral ritual border
    ctx.fillStyle = '#0d0f1c';
    ctx.fillRect(sx0 - 2, sy0 - 2, sw + 4, 4);
    ctx.fillRect(sx0 - 2, sy0 + sh - 2, sw + 4, 4);
    ctx.fillStyle = isFlash ? '#fef08a' : '#f43f5e';
    ctx.fillRect(sx0, sy0, sw, 2);
    ctx.fillRect(sx0, sy0 + sh - 2, sw, 2);

    // 3 huge rotating Runic Blood-Pact Sigils stamped across the arena road!
    if (ready) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = isFlash ? 0.88 : 0.45 + pulse * 0.25;
      for (let k = 0; k < 3; k++) {
        const gx = sx0 + Math.round(sw * (0.18 + k * 0.32));
        const gy = sy0 + Math.round(sh * 0.52);
        blitMalphasVfxCell(
          ctx,
          vfxImg,
          (sigilFrame + k * 4) % MALPHAS_VFX_COLS,
          MALPHAS_VFX_ROW.RUNIC_GROUND_SIGIL,
          gx - 150,
          gy - 76,
          300,
          152
        );
      }
      ctx.restore();
    }
  }

  // Helper for HD-2D Molten Fissure / Violet Rune Lane Corridors (replaces flat rects + crude `<<<` blocks!)
  const drawRunicLaneCorridor = (laneGy, bandH, xStart, xEnd, progress, isActive, isViolet) => {
    const yTop = Math.round(laneGy - bandH * 0.5);
    const bandW = xEnd - xStart;
    const pulse = 0.5 + 0.5 * Math.sin(t * 18);

    // 1. Subtle volcanic heat bed + beveled obsidian lane rails
    ctx.fillStyle = isViolet
      ? isActive
        ? 'rgba(147, 51, 234, 0.22)'
        : `rgba(126, 34, 206, ${(0.11 + pulse * 0.06).toFixed(3)})`
      : isActive
        ? 'rgba(220, 38, 38, 0.24)'
        : `rgba(234, 88, 12, ${(0.12 + pulse * 0.06).toFixed(3)})`;
    ctx.fillRect(xStart, yTop, bandW, bandH);

    // Advancing fissure charge wave sweeping right-to-left from Malphas toward the player!
    const fillW = Math.max(12, Math.round(bandW * progress));
    ctx.fillStyle = isViolet
      ? 'rgba(217, 70, 239, 0.24)'
      : 'rgba(251, 146, 60, 0.26)';
    ctx.fillRect(xEnd - fillW, yTop + 4, fillW, bandH - 8);

    // Crisp gothic stepped border rails with gilded corner ticks
    ctx.fillStyle = '#0d0f1c';
    ctx.fillRect(xStart - 2, yTop - 2, bandW + 4, 4);
    ctx.fillRect(xStart - 2, yTop + bandH - 2, bandW + 4, 4);
    const railCol = isActive || progress > 0.8 ? '#fef08a' : isViolet ? '#e879f9' : '#fb923c';
    ctx.fillStyle = railCol;
    ctx.fillRect(xStart, yTop, bandW, 2);
    ctx.fillRect(xStart, yTop + bandH - 2, bandW, 2);
    ctx.fillRect(xStart, yTop, 3, bandH);
    ctx.fillRect(xEnd - 3, yTop, 3, bandH);

    // 2. Tiled HD-2D Molten Claw-Fissures & Razor Swept Leftward Runic Surge (`Row 5`)!
    if (ready) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = isActive ? 0.86 : 0.48 + progress * 0.34;
      const tileW = 200;
      const tileH = Math.round(bandH * 1.18);
      for (let tx = xStart; tx < xEnd - 16; tx += tileW) {
        const drawW = Math.min(tileW, xEnd - tx);
        blitMalphasVfxCell(
          ctx,
          vfxImg,
          (laneFrame + Math.floor((tx - xStart) / tileW) * 2) % MALPHAS_VFX_COLS,
          MALPHAS_VFX_ROW.LANE_FISSURE_SURGE,
          tx,
          Math.round(laneGy - tileH * 0.5),
          drawW,
          tileH
        );
      }
      // Lock-on Runic Ground Sigil at grab target or lane origin!
      const lockX = isViolet ? Math.round(boss.grabTargetX || (xStart + bandW * 0.5)) : xEnd - 96;
      blitMalphasVfxCell(
        ctx,
        vfxImg,
        sigilFrame,
        MALPHAS_VFX_ROW.RUNIC_GROUND_SIGIL,
        lockX - 108,
        Math.round(laneGy - 52),
        216,
        104
      );
      ctx.restore();
    } else {
      // Crisp fallback runic diamonds (zero crude `<<<` blocks)
      ctx.fillStyle = railCol;
      for (let rx = xStart + 72; rx < xEnd - 64; rx += 144) {
        const cy = Math.round(laneGy);
        ctx.fillRect(rx - 6, cy - 2, 12, 4);
        ctx.fillRect(rx - 2, cy - 6, 4, 12);
      }
    }
  };

  // C. `ABYSSAL SIEGE GRAB` (`skillVariant === 2`) Violet Runic Corridor
  if (boss.grabWarnOnly || (boss.grabActive && !boss.grabbedTarget)) {
    const gProg = boss.grabActive ? 1 : Math.max(0, Math.min(1, (boss.stateTimer || 0) / 0.42));
    drawRunicLaneCorridor(
      boss.grabLaneGy,
      100,
      Math.round(boss.anchorX - 905),
      Math.round(boss.anchorX - 95),
      gProg,
      Boolean(boss.grabActive),
      true
    );
  }

  // D. `CLAW SWEEP` (`skillVariant === 1`) Molten Fissure Corridor
  if (boss.rakeWarnOnly || boss.rakeActive) {
    const rProg = boss.rakeActive ? 1 : Math.max(0, Math.min(1, (boss.stateTimer || 0) / 0.48));
    drawRunicLaneCorridor(
      boss.rakeLaneGy,
      108,
      Math.round(boss.anchorX - 935),
      Math.round(boss.anchorX - 95),
      rProg,
      Boolean(boss.rakeActive),
      false
    );
  }

  ctx.restore();
}

/**
 * 4. High-Frame-Rate 30fps Attack & Exposed Heart-Core Overlays layered seamlessly on Malphas's actions:
 *    - Hellfire Torrent Beam (`Row 6`), 3-Talon Slash Wave (`Row 7`), Magma Plume (`Row 8`),
 *    - Exposed Heart-Core Shatter Vortex (`Row 11`, strictly drawn ONLY when `isVulnerable`!).
 */
export function drawMalphasActionVfxOverlay(ctx, boss, t, kind, rect, vfxImg) {
  if (!ctx || !boss || !isVfxReady(vfxImg) || !rect) return;
  const { x, y, w, h, alpha = 0.72 } = rect;
  const frame = Math.floor(t * 28) % MALPHAS_VFX_COLS;
  let row = -1;
  if (kind === 'hellfire') row = MALPHAS_VFX_ROW.HELLFIRE_TORRENT;
  else if (kind === 'slash') row = MALPHAS_VFX_ROW.TRIPLE_TALON_SLASH;
  else if (kind === 'magma_plume') row = MALPHAS_VFX_ROW.MAGMA_PLUME;
  else if (kind === 'heart_vortex') {
    if (!(boss.vulnerableTimer > 0) || boss.isDead) return; // Strict invariant: NEVER while non-vulnerable!
    row = MALPHAS_VFX_ROW.HEART_CORE_VORTEX;
  }
  if (row < 0) return;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  blitMalphasVfxCell(ctx, vfxImg, frame, row, x, y, w, h);
  ctx.restore();
}

/**
 * 5. Foreground `ABYSSAL SIEGE GRAB` Clamping Siege-Claw Talons, Taut Forged Abyssal Chains &
 *    Contracting Violet Rune-Vise drawn **IN FRONT OF** the pinned hero (Step 7 `drawUltimateForeground`)!
 */
export function drawMalphasGrabForegroundOverlay(ctx, boss, t, renderer, vfxImg) {
  if (!ctx || !boss || boss.isDead) return;

  // Also add dramatic foreground Phase III lightning crackle during Cataclysm / Soul-Tithe flash!
  const soulFlash = boss.soulTitheFlashTimer || 0;
  if (soulFlash > 0 && isVfxReady(vfxImg)) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(0.62, soulFlash * 1.15);
    const lf = Math.floor(t * 28) % MALPHAS_VFX_COLS;
    const victim = boss.lastEnemyRef;
    if (victim && !victim.isDead) {
      blitMalphasVfxCell(
        ctx,
        vfxImg,
        lf,
        MALPHAS_VFX_ROW.ABYSSAL_LIGHTNING,
        victim.x - 110,
        (victim.y || 561) - 190,
        220,
        220
      );
    }
    ctx.restore();
  }

  // Primary Foreground Grab Vise Overlay over the pinned hero!
  const victim = boss.grabbedTarget;
  if (!victim || victim.isDead || !boss.grabActive) return;

  const ready = isVfxReady(vfxImg);
  const st = boss.stateTimer || 0;
  const squeezePulse = Math.max(0, Math.min(1, (boss._grabSqueezeFlash || 0) / 0.24));

  // Center the clamping talons & rune-vise directly across the hero's chest (`y - 68`, aligned with `clawWorldY`)
  const vx = Math.round(victim.x + 8);
  const vy = Math.round(victim.y - 68);
  const shakeX = squeezePulse > 0.05 ? Math.round(Math.sin(t * 90) * 5 * squeezePulse) : 0;
  const shakeY = squeezePulse > 0.05 ? Math.round(Math.cos(t * 78) * 3 * squeezePulse) : 0;

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // 1. Taut stepped-pixel Forged Obsidian & Glowing Violet Abyssal Chains anchoring hero to Malphas's siege arm!
  const armAnchorX = Math.round(boss.clawWorldX + 74);
  const armAnchorY = Math.round(boss.clawWorldY + 2);
  const drawTautChain = (ax, ay, bx, by, sag) => {
    const links = 9;
    for (let i = 0; i <= links; i++) {
      const u = i / links;
      const lx = snap2(ax + (bx - ax) * u);
      const ly = snap2(ay + (by - ay) * u + Math.sin(u * Math.PI) * sag);
      ctx.fillStyle = '#0d0f1c';
      ctx.fillRect(lx - 6, ly - 5, 12, 10);
      ctx.fillStyle = squeezePulse > 0.35 && i % 2 === 0 ? '#e879f9' : '#7c3aed';
      ctx.fillRect(lx - 4, ly - 3, 8, 6);
      ctx.fillStyle = i % 2 === 0 ? '#f5d0fe' : '#312e81';
      ctx.fillRect(lx - 2, ly - 1, 4, 2);
    }
  };
  drawTautChain(vx - 20 + shakeX, vy - 26 + shakeY, armAnchorX, armAnchorY - 22, 10);
  drawTautChain(vx - 16 + shakeX, vy + 24 + shakeY, armAnchorX, armAnchorY + 20, -8);

  // 2. Foreground Clamping Siege-Claw Talons & Chains (`Row 2`) wrapping OVER the hero!
  if (ready) {
    // Frames 0..2 snap shut right after grab (`t < 0.78`), frames 3..11 pulse & clench on squeeze beats!
    let clawFrame;
    if (st < 0.78) {
      clawFrame = Math.min(2, Math.floor(Math.max(0, st - 0.62) / 0.055));
    } else if (squeezePulse > 0.3) {
      clawFrame = 5 + (Math.floor(t * 24) % 3); // clenched incandescent vise beat!
    } else {
      clawFrame = 3 + (Math.floor(t * 14) % 9);
    }
    const clampSz = Math.round(212 - squeezePulse * 14);
    blitMalphasVfxCell(
      ctx,
      vfxImg,
      clawFrame,
      MALPHAS_VFX_ROW.GRAB_CLAMP_TALONS,
      vx - clampSz * 0.50 + shakeX,
      vy - clampSz * 0.50 + shakeY,
      clampSz,
      clampSz
    );

    // 3. Contracting Violet Arcane Rune-Vise Rings (`Row 3`) constricting tightly on each squeeze beat!
    const viseFrame =
      squeezePulse > 0.35
        ? 3 + (Math.floor(t * 30) % 4) * 3 // peak-constriction frames 3, 6, 9!
        : Math.floor(t * 18) % MALPHAS_VFX_COLS;
    const viseSz = Math.round(182 - squeezePulse * 30);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.52 + squeezePulse * 0.24;
    blitMalphasVfxCell(
      ctx,
      vfxImg,
      viseFrame,
      MALPHAS_VFX_ROW.GRAB_RUNE_VISE,
      vx - viseSz * 0.5 + shakeX,
      vy - viseSz * 0.5 + shakeY,
      viseSz,
      viseSz
    );
    ctx.restore();
  } else {
    // Crisp stepped-pixel fallback talons & vise brackets if VFX sheet hasn't finished loading
    ctx.fillStyle = '#0d0f1c';
    ctx.fillRect(vx - 38, vy - 26, 76, 10);
    ctx.fillRect(vx - 40, vy + 14, 80, 10);
    ctx.fillStyle = '#c084fc';
    ctx.fillRect(vx - 36, vy - 24, 72, 6);
    ctx.fillRect(vx - 38, vy + 16, 76, 6);
  }

  // 4. Squeeze-beat impact shock ring + violet-white lightning snap right across the vise!
  if (squeezePulse > 0.1) {
    const ringR = Math.round(34 + (1 - squeezePulse) * 74);
    drawSteppedShockRing(ctx, vx, vy, ringR, Math.round(ringR * 0.72), 4, '#f5d0fe', squeezePulse * 0.92);
    drawSteppedShockRing(
      ctx,
      vx,
      vy,
      Math.round(ringR * 0.72),
      Math.round(ringR * 0.54),
      2,
      '#e11d48',
      squeezePulse * 0.85
    );
    drawPixelLightningBolt(
      ctx,
      vx - 52,
      vy - 34,
      vx + 52,
      vy + 34,
      Math.floor(t * 30),
      '#6b21a8',
      '#e879f9',
      '#ffffff'
    );
  }

  // Restrained Bayer violet glow cradling the vise
  drawExBayerHalo(
    ctx,
    vx,
    vy,
    58 + Math.round(squeezePulse * 20),
    54 + Math.round(squeezePulse * 18),
    '#9333ea',
    squeezePulse > 0.4 ? '#ffffff' : '#e879f9',
    0.14 + squeezePulse * 0.14
  );

  ctx.restore();
}
