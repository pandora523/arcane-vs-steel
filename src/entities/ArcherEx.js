import { Fighter } from './Fighter.js?v=30fps136';
import { PixelForge } from '../engine/PixelForge.js?v=30fps136';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps136';
import {
  SYLVAN_EFFECT_REGISTRY,
  SYLVAN_EMERALD_PALETTE,
  SYLVAN_STARLIGHT_PALETTE
} from '../engine/shaders/sylvanShaders.js?v=30fps136';

const AUTO_SLICES_EX = [
  [60, 8], // Beat 1 (V0, 0.36s): Supersonic Astral Starlight Arrow + Constellation Glint -> snaps at F03 (63)
  [68, 7], // Beat 2 (V1, 0.35s): Rising Twin-Star 2-Arrow Volley -> snaps at F09 (69)
  [75, 8], // Beat 3 (V2, 0.38s): Rapid 2-Arrow Emerald Streak + Zodiac Starfall Arrow -> snaps at F17/F18 (77/78)
  [83, 7]  // Beat 4 (V3, 0.48s): -48px Airborne Dragon-Piercer Backstep-Hop 3-Arrow Volley -> snaps at F25 (85)
];

const BEAT_DURATIONS = [0.36, 0.35, 0.38, 0.48];
const INTRA_COMBO_LINK = 0.015;

// 4x4 Ordered Bayer Stipple Matrix for crisp pixel-pure emerald-gold floor halos (alpha <= 0.18, zero radial blur!)
const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5]
];

function drawBayerSylvanHalo(ctx, cx, cy, rx, ry, hexColor, alpha = 0.16, step = 4) {
  if (alpha <= 0.01 || rx < 4 || ry < 2) return;
  const clampedAlpha = Math.min(0.18, Math.max(0, alpha));
  const gx = Math.round(cx / 2) * 2;
  const gy = Math.round(cy / 2) * 2;
  const irx = Math.round(rx / step) * step;
  const iry = Math.max(step, Math.round(ry / step) * step);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = hexColor;
  ctx.globalAlpha = clampedAlpha;

  for (let dy = -iry; dy <= iry; dy += step) {
    const ny = dy / Math.max(1, iry);
    for (let dx = -irx; dx <= irx; dx += step) {
      const nx = dx / Math.max(1, irx);
      const d2 = nx * nx + ny * ny;
      if (d2 > 1.0) continue;
      const falloff = 1.0 - d2;
      const bx = ((dx / step) & 3 + 4) & 3;
      const by = ((dy / step) & 3 + 4) & 3;
      if (falloff * 16.0 > BAYER_4X4[by][bx]) {
        ctx.fillRect(gx + dx, gy + dy, step, step);
      }
    }
  }
  ctx.restore();
}

function drawPixelLeafRune(ctx, x, y, phase = 0, isGold = false, alpha = 0.94) {
  if (alpha <= 0.02) return;
  const px = Math.round(x / 2) * 2;
  const py = Math.round(y / 2) * 2;
  const sway = Math.sin(phase) >= 0 ? 2 : -2;
  ctx.save();
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.fillStyle = '#064e3b';
  ctx.fillRect(px - 4, py - 2, 10, 6);
  ctx.fillStyle = isGold ? '#fde047' : '#34d399';
  ctx.fillRect(px - 2, py, 6, 2);
  ctx.fillRect(px, py - 2, 4, 2);
  ctx.fillStyle = '#a7f3d0';
  ctx.fillRect(px + sway, py, 2, 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(px + 2, py - 2, 2, 2);
  ctx.restore();
}

function drawStarlightGlint(ctx, x, y, arm = 6, accentHex = '#fde047', alpha = 0.96) {
  if (alpha <= 0.02) return;
  const px = Math.round(x / 2) * 2;
  const py = Math.round(y / 2) * 2;
  const L = Math.max(4, Math.round(arm / 2) * 2);
  ctx.save();
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.fillStyle = accentHex;
  ctx.fillRect(px - L, py, L * 2 + 2, 2);
  ctx.fillRect(px, py - L, 2, L * 2 + 2);
  ctx.fillStyle = '#ffffff';
  const half = Math.max(2, Math.round((L * 0.5) / 2) * 2);
  ctx.fillRect(px - half, py, half * 2 + 2, 2);
  ctx.fillRect(px, py - half, 2, half * 2 + 2);
  ctx.restore();
}

function drawPixelConstellationThread(ctx, x0, y0, x1, y1, hex = '#a7f3d0', alpha = 0.78) {
  if (alpha <= 0.02) return;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) return;
  const steps = Math.max(3, Math.min(28, Math.round(dist / 8)));
  ctx.save();
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.fillStyle = hex;
  for (let i = 0; i <= steps; i++) {
    if (i % 2 === 1) continue;
    const u = i / steps;
    const sx = Math.round((x0 + dx * u) / 2) * 2;
    const sy = Math.round((y0 + dy * u) / 2) * 2;
    ctx.fillRect(sx, sy, 2, 2);
  }
  ctx.restore();
}

/**
 * SYLVARA EX (`archer_ex`) - Newly Born `520px` Yggdrasil Star-Huntress.
 * Next-Gen Wide-Canvas (`320x240`, `anchorX=112, anchorY=230`) Pure Long-Range Astral Marksman.
 * Wields the luminous Yggdrasil Astral Recurve Greatbow + 6-Pinion Astral Light-Wings, loosing
 * Starwood Constellation Volleys, Zephyr Starlock: Twelve-Star Rain, and
 * Arrow of Yggdrasil: Astral Supernova (`0` melee scars, `0` blurry whiteout!).
 * Coexists 100% independently alongside classic Sylvara (`archer`).
 */
export class ArcherEx extends Fighter {
  constructor(x, groundY, facing = 1) {
    const opts = typeof x === 'object' && x !== null ? x : { x, groundY, facing };
    super({
      ...opts,
      name: opts.name || 'Sylvara EX',
      maxHp: 3840,
      attackRange: 520,
      moveSpeed: 192,
      autoInterval: 0.88,
      lightColor: 'rgba(16, 185, 129, 1)',
      primaryColor: '#34d399',
      hasTrueUltimate: true,
      trueUltName: 'ARROW OF YGGDRASIL: ASTRAL SUPERNOVA',
      trueUltDuration: 3.04
    });

    this.heroId = 'archer_ex';
    this.secondaryColor = '#fde047';
    this.theme = 'emerald';
    this.deathSfx = 'death_archer';
    this.skillMaxCooldown = 4.00;
    this.skillDuration = 1.06;
    this.autoDuration = BEAT_DURATIONS[0];
    this._postFlurryInterval = 1.18;

    this.skillName = 'STARWOOD CONSTELLATION VOLLEY';
    this.ultName = 'ZEPHYR STARLOCK: TWELVE-STAR RAIN';
    this.ultSub = 'ASTRAL LIGHT-WING VAULT & ZODIAC BARRAGE';
    this.ultDuration = 2.04;

    this.hasTrueUltimate = true;
    this.trueUltName = 'ARROW OF YGGDRASIL: ASTRAL SUPERNOVA';
    this.trueUltSub = 'WORLD-TREE CANOPY & STARLIGHT HORIZON LANCE';
    this.trueUltDuration = 3.04;

    this.windPhase = 0;
    this.shotCombo = 0;
    this.stepTimer = 0;
    this.dodgeMaxCooldown = 2.85;
    this.dashMaxCooldown = 3.15;
    this.wallFlipCooldown = 0;
    this.crouchCooldown = 0;
    this.vaultCooldown = 0;
    this.crouchDuration = 0.96;
    this.isCrouching = false;
    this.isFlipVault = false;
    this.flipStartX = this.x;
    this.flipTargetX = this.x;
    this.flipAngle = 0;

    // 4-Beat Pure `520px` Marksman Combo State
    this.comboStep = 0;
    this._autoVariant = 0;
    this._comboPersistTimer = 0;
    this._queuedNextBeat = false;
    this._intraLinkTimer = 0;
    this._beatHitMask = 0;
    this._beatStartX = this.x;
    this._beatTargetX = this.x;
    this._bootsPlanted = false;
    this._overrideFrameIdx = null;

    this.activeVfxAnims = [];
    this.constellationSeekers = [];
    this.starRainLances = [];
    this.pixelLeafRunes = [];
    this.starlightGlints = [];
    this.ambientLeafAccum = 0;

    this._ultPhase = 0;
    this._ultLancesFired = 0;
    this._ultShotMask = 0;
    this._ultChargeDir = this.facing;
    this._ultPivotX = this.x;
    this._ultStartX = this.x;
    this._ultLandX = this.x;
    this._ultTargetX = this.x + this.facing * 360;
    this._ultChargeSparkTimer = 0;

    this._trueUltStep = 0;
    this._trueUltBeamTimer = 0;
    this._trueUltMoteTimer = 0;
    this._trueUltCanopyBloomed = false;
    this._trueUltDescStartLift = 82;
    this._trueUltTargetX = this.x + this.facing * 320;
    this._trueUltJumpStartX = this.x;
    this._trueUltFarEdgeX = 108;
    this._trueUltRootedTargets = [];
    this._isTransformedArrow = false;
    this._rematerializeFlash = 0;
    this._arrowStartX = this.x;
    this._arrowEndX = this.x;
    this._trueUltPierced = false;
    this.brambleSnareZones = [];

    this.fx = new ArcaneShaderFX(SYLVAN_EFFECT_REGISTRY, {
      pixelScale: 3,
      viewW: 720,
      viewH: 460,
      topRatio: 0.72
    });

    if (typeof Image !== 'undefined') {
      this.getExSprites();
      PixelForge.ensureHeroLoaded?.('archer_ex');
    }

    this.afterimages = [];
    this._afterimageTimer = 0;
    this._drewBowVortex = false;
    this._skillLockSpawned = false;
    this._deathBurstTriggered = false;
    this._arrowStarParticles = [];
  }

  getAiStyleProfile() {
    return {
      comboGoal: 4,
      sweetMin: 350,
      sweetMax: 455,
      counterCrouchBias: 0.50,
      midLeapMin: 0,
      midLeapMax: 0,
      midLeapChance: 0,
      postStyle: 'marksman'
    };
  }

  isHackAndSlashMelee() {
    return false;
  }

  getExSprites() {
    if (typeof Image === 'undefined') return null;
    const assets = PixelForge.initAssets?.();
    if (!assets) return null;
    if (!assets.archer_ex) {
      const mkImg = (src) => {
        const img = new Image();
        img._origSrc = src;
        img.src = src;
        return img;
      };
      assets.archer_ex = {
        sheet: mkImg('assets/sprites/archer_ex_sheet.png?v=30fps136'),
        vfx: mkImg('assets/sprites/archer_ex_vfx.png?v=30fps136'),
        portrait: mkImg('assets/sprites/archer_ex_portrait.png?v=30fps136'),
        cellW: 320,
        cellH: 240,
        anchorX: 112,
        anchorY: 230
      };
    } else {
      PixelForge.ensureHeroLoaded?.('archer_ex');
    }
    return assets.archer_ex;
  }

  _safeFxX(xv, game) {
    const g = game || this.game;
    const ww = g?.renderer ? g.renderer.worldWidth : 1200;
    return Math.max(48, Math.min(ww - 48, xv));
  }

  _safeFxY(yv) {
    return Math.max(48, Math.min(this.groundY + 24, yv));
  }

  _clampArenaX(xv, game, margin = 84) {
    const g = game || this.game;
    const advBounds =
      g?.adventure?.active && typeof g.adventure.getActiveStageBounds === 'function'
        ? g.adventure.getActiveStageBounds()
        : null;
    const minX =
      g?.adventure?.lockActive && Number.isFinite(g.adventure.lockMinX)
        ? g.adventure.lockMinX
        : advBounds
          ? advBounds.minX + 44
          : margin;
    const ww = g?.renderer ? g.renderer.worldWidth : 1200;
    const rawMaxX =
      g?.adventure?.lockActive && Number.isFinite(g.adventure.lockMaxX)
        ? g.adventure.lockMaxX
        : advBounds
          ? advBounds.maxX - 44
          : ww - margin;
    const bossAlive = Boolean(
      g?.adventure?.bossEntity &&
        !g.adventure.bossEntity.isDead &&
        g.adventure.bossEntity.isColossalBoss
    );
    const maxX = bossAlive
      ? Math.min(rawMaxX, (g.adventure.bossEntity.anchorX || 9335) - 96)
      : rawMaxX;
    return Math.max(minX, Math.min(maxX, xv));
  }

  getEnemyTargets(enemy, game) {
    if (game?.getEnemiesOf) {
      const list = game.getEnemiesOf(this).filter((f) => f && !f.isDead && !f.isBenched);
      if (list.length > 0) return list;
    }
    return enemy && !enemy.isDead ? [enemy] : [];
  }

  setState(newState) {
    const prevState = this.state;
    if (
      (prevState === 'AUTO_ATTACK' ||
        prevState === 'ULTIMATE' ||
        prevState === 'TRUE_ULTIMATE') &&
      newState !== 'AUTO_ATTACK' &&
      newState !== 'JUMP' &&
      newState !== 'DODGE' &&
      newState !== 'ULTIMATE' &&
      newState !== 'TRUE_ULTIMATE'
    ) {
      this.y = this.groundY;
      this.vy = 0;
      this.cameraAirLift = 0;
    }

    super.setState(newState);

    this.didSecondaryAction = false;
    this._skillLockSpawned = false;
    this.constellationSeekers = [];

    if (newState !== 'CROUCH') {
      this.isDeflecting = false;
      this.fx?.stopByKey('sylvanLeafCloakDome');
    }
    if (
      newState !== 'DASH' &&
      newState !== 'JUMP' &&
      newState !== 'DODGE' &&
      newState !== 'ULTIMATE' &&
      newState !== 'TRUE_ULTIMATE'
    ) {
      this.fx?.stopByKey('zephyrVaultSlipstream');
    }
    if (newState !== 'ULTIMATE' && newState !== 'TRUE_ULTIMATE') {
      this.fx?.stopByKey('astralWingPlume');
      this.cameraAirLift = 0;
      if (newState !== 'AUTO_ATTACK') {
        this._overrideFrameIdx = null;
      }
    }
    if (newState === 'SKILL') {
      this.vx = 0;
      this.vy = 0;
      this.skillCooldown = Math.max(this.skillCooldown || 0, this.skillMaxCooldown);
    }
    if (newState === 'ULTIMATE') {
      this._ultPhase = 0;
      this._ultLancesFired = 0;
      this._ultShotMask = 0;
      this._ultChargeDir = this.facing;
      this._ultPivotX = this.x;
      this._ultStartX = this.x;
      this._ultLandX = this.x;
      this._ultChargeSparkTimer = 0;
      this.starRainLances = [];
      this.isFlipVault = false;
      this._overrideFrameIdx = 122;
    } else {
      this._ultChargeSparkTimer = 0;
      this.starRainLances = [];
    }
    if (newState === 'TRUE_ULTIMATE') {
      this._trueUltStep = 0;
      this._trueUltBeamTimer = 0;
      this._trueUltMoteTimer = 0;
      this._trueUltCanopyBloomed = false;
      this._trueUltDescStartLift = 82;
      this._trueUltTargetX = this.x + this.facing * 320;
      this._trueUltJumpStartX = this.x;
      this._trueUltFarEdgeX = 108;
      this._trueUltRootedTargets = [];
      this._isTransformedArrow = false;
      this._rematerializeFlash = 0;
      this._arrowStartX = this.x;
      this._arrowEndX = this.x;
      this._trueUltPierced = false;
      this._phaseThroughEnemy = false;
      this._arrowStarParticles = [];
      this.isFlipVault = false;
      this.trueUltFrameOverride = 120;
      this._overrideFrameIdx = 120;
    } else {
      this.releaseRootedTargets();
      this._trueUltStep = 0;
      this._trueUltBeamTimer = 0;
      this._trueUltMoteTimer = 0;
      this._trueUltCanopyBloomed = false;
      this._trueUltDescStartLift = 82;
      this._isTransformedArrow = false;
      this._rematerializeFlash = 0;
      this._trueUltPierced = false;
      this._phaseThroughEnemy = false;
      if (newState !== 'AUTO_ATTACK') {
        this.trueUltFrameOverride = null;
      }
    }
    if (newState === 'AUTO_ATTACK') {
      this._autoVariant = (((this.comboStep || 0) % 4) + 4) % 4;
      this._beginComboBeat(this._autoVariant, this.game);
    }
    if (newState === 'DEATH') {
      this.fx?.clear();
      this.constellationSeekers = [];
      this.starRainLances = [];
      this._arrowStarParticles = [];
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
    }
    this._drewBowVortex = false;
    this._afterimageTimer = 0;
  }

  queueNextComboBeat() {
    this._queuedNextBeat = true;
  }

  /**
   * Initializes one beat (`0..3`) of Sylvara EX's pure `520px` Star-Huntress combo:
   * - Maintains `350..455px` marksman kiting (`-26px` retreat when `dist < 225`)!
   * - Executes her signature **`-48px` airborne Dragon-Piercer backstep-hop on `V3`**!
   */
  _beginComboBeat(beatIdx, game) {
    const v = ((beatIdx % 4) + 4) % 4;
    this._autoVariant = v;
    this.comboStep = (v + 1) % 4;
    this.autoDuration = BEAT_DURATIONS[v];
    this.stateTimer = 0;
    this._intraLinkTimer = 0;
    this._beatHitMask = 0;
    this.didActionFrame = false;
    this._queuedNextBeat = false;
    this._bootsPlanted = false;
    this._drewBowVortex = false;
    this._comboPersistTimer = 0.74;
    this.y = this.groundY;
    this.vy = 0;

    const startFrame = AUTO_SLICES_EX[v][0];
    this.trueUltFrameOverride = startFrame;
    this._overrideFrameIdx = startFrame;

    const enemy = this._currentEnemy || null;
    if (enemy && !enemy.isDead && !enemy.isDummyFocal) {
      this.facing = enemy.x >= this.x ? 1 : -1;
    }

    this._beatStartX = this.x;
    let desiredX = this.x;
    if (v === 3) {
      // Signature -48px airborne Dragon-Piercer backstep-hop on V3!
      desiredX = this.x - this.facing * 48;
    } else if (enemy && !enemy.isDead) {
      const dist = Math.abs(enemy.x - this.x);
      if (dist < 225) {
        desiredX = this.x - this.facing * 26;
      } else if (dist > 465) {
        desiredX = this.x + this.facing * 12;
      } else {
        desiredX = this.x + this.facing * (v === 2 ? 6 : 4);
      }
    }
    this._beatTargetX = this._clampArenaX(desiredX, game, 84);
  }

  releaseRootedTargets() {
    if (!Array.isArray(this._trueUltRootedTargets) || this._trueUltRootedTargets.length === 0) return;
    for (const entry of this._trueUltRootedTargets) {
      const foe = entry?.foe;
      if (foe) {
        foe.isRooted = false;
      }
    }
    this._trueUltRootedTargets = [];
  }

  spawnLeafRuneBurst(x, y, count = 6, speed = 125, goldMix = true) {
    for (let i = 0; i < count; i++) {
      if (this.pixelLeafRunes.length >= 44) this.pixelLeafRunes.shift();
      const ang = (i / Math.max(1, count)) * Math.PI * 2 + 0.3;
      const spd = speed * (0.5 + (i % 3) * 0.25);
      this.pixelLeafRunes.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 36,
        phase: i * 1.2,
        isGold: goldMix && i % 2 === 0,
        age: 0,
        maxLife: 0.44 + (i % 3) * 0.10
      });
    }
  }

  spawnStarGlint(x, y, arm = 8, hex = '#fde047', maxLife = 0.24) {
    if (this.starlightGlints.length >= 32) this.starlightGlints.shift();
    this.starlightGlints.push({
      x,
      y,
      arm,
      hex,
      age: 0,
      maxLife
    });
  }

  spawnArrowStarParticle(
    x,
    y,
    vx = 0,
    vy = 0,
    maxLife = 0.34,
    kind = 'spark',
    colorHex = '#6ee7b7',
    size = 4,
    glowHex = '#10b981',
    attractX = null,
    attractY = null
  ) {
    if (this._arrowStarParticles.length >= 96) this._arrowStarParticles.shift();
    this._arrowStarParticles.push({
      x,
      y,
      vx,
      vy,
      age: 0,
      maxLife,
      kind,
      colorHex,
      glowHex,
      size,
      phase: this._arrowStarParticles.length * 0.7,
      attractX,
      attractY
    });
  }

  spawnVfxAnim(row, x, y, w = 208, h = 208, maxLife = 0.55, opts = {}) {
    if (this.activeVfxAnims.length >= 26) this.activeVfxAnims.shift();
    this.activeVfxAnims.push({
      row,
      x,
      y,
      w,
      h,
      age: 0,
      maxLife,
      vx: opts.vx || 0,
      vy: opts.vy || 0,
      flipX: opts.flipX !== undefined ? Boolean(opts.flipX) : this.facing < 0,
      followOwner: Boolean(opts.followOwner),
      offsetX: opts.offsetX || 0,
      offsetY: opts.offsetY || 0,
      inFront: opts.inFront !== undefined ? Boolean(opts.inFront) : row !== 2 && row !== 5,
      isSeeker: Boolean(opts.isSeeker),
      startFrame: opts.startFrame || 0,
      endFrame: opts.endFrame !== undefined ? opts.endFrame : 29
    });
  }

  spawnAfterimage(x, y, facing, row = 8, col = 14, maxLife = 0.24) {
    if (this.afterimages.length >= 16) this.afterimages.shift();
    this.afterimages.push({
      x,
      y,
      facing,
      frameIdx: row * 30 + (col % 30),
      age: 0,
      maxLife
    });
  }

  onProjectileTrail(p) {
    if (!p || p.type !== 'arrow') return;
    p._starAcc = (p._starAcc || 0) + 0.016;
    if (p._starAcc >= 0.056) {
      p._starAcc = 0;
      const dir = Math.sign(p.vx || this.facing || 1);
      this.spawnStarGlint(p.x - dir * 14, p.y, 4, p.pierce ? '#fde047' : '#34d399', 0.14);
    }
  }

  onProjectileHit(p, hitTarget, isCrit, game) {
    if (!p) return false;
    const hs = p.pierce || isCrit ? 0.048 : 0.040;
    this._hitStopTimer = Math.max(this._hitStopTimer || 0, hs);
    if (hitTarget && !hitTarget.isDead) {
      if (!hitTarget.isColossalBoss) {
        hitTarget._hitShakeTimer = Math.max(hitTarget._hitShakeTimer || 0, hs + 0.018);
      }
      if (p.pierce || isCrit) {
        game?.renderer?.triggerHitStop?.(hs * 0.55);
      }
    }
    const hx = hitTarget ? hitTarget.x : p.x;
    const hy = hitTarget ? (hitTarget.y || this.groundY) - 92 : p.y;
    const dir = Math.sign(p.vx || this.facing || 1);

    this.spawnLeafRuneBurst(hx, hy, isCrit ? 6 : 4, 135, true);
    this.spawnStarGlint(hx, hy, isCrit ? 10 : 6, isCrit ? '#fde047' : '#34d399', 0.22);
    this.spawnVfxAnim(4, hx, hy, 168, 168, 0.24, {
      flipX: dir < 0,
      inFront: true
    });
    this.fx?.spawn('sylvanArrowImpactBurst', this._safeFxX(hx, game), this._safeFxY(hy), {
      flip: false,
      palette: isCrit || p.pierce ? SYLVAN_STARLIGHT_PALETTE : SYLVAN_EMERALD_PALETTE,
      light: isCrit ? 1.24 : 1.08,
      extra: { aimAngle: dir >= 0 ? 0 : Math.PI, isCrit: Boolean(isCrit || p.pierce) }
    });
    if (game?.audio) {
      game.audio.play('arrow_hit', hx);
    }
    return true;
  }

  takeDamage(amount, attacker, isCrit = false, knockX = 95, knockY = 0) {
    if (this.isDeflecting && !this.isDead) {
      this.fx.spawn('sylvanArrowImpactBurst', this._safeFxX(this.x + this.facing * 36), this._safeFxY(this.y - 84), {
        flip: false,
        palette: SYLVAN_STARLIGHT_PALETTE,
        light: 1.15,
        extra: { aimAngle: this.facing >= 0 ? 0 : Math.PI, isCrit: true }
      });
      if (this.game?.vfx) {
        this.game.vfx.spawnDamageText(this.x, this.y - 168, 0, false, 'LEAF-VEIL PARRY!', '#6ee7b7');
      }
      if (this.game?.audio) {
        this.game.audio.play('reflect', this.x);
      }
    }

    super.takeDamage(amount, attacker, isCrit, knockX, knockY);

    if (this.isDead && !this._deathBurstTriggered) {
      this._deathBurstTriggered = true;
      this.fx.spawn('zephyrGroundBurst', this._safeFxX(this.x), this._safeFxY(this.groundY), {
        palette: SYLVAN_STARLIGHT_PALETTE,
        light: 1.05,
        extra: { radius: 30 }
      });
      this.fx.spawn('sylvanArrowImpactBurst', this._safeFxX(this.x), this._safeFxY(this.groundY - 64), {
        flip: false,
        palette: SYLVAN_EMERALD_PALETTE,
        light: 1.0,
        extra: { aimAngle: -Math.PI * 0.5, isCrit: true }
      });
    }
  }

  startJump(enemy, game, customDir = null) {
    this.vaultCooldown = 2.8;
    this.dodgeCooldown = this.dodgeMaxCooldown * (0.86 + Math.random() * 0.28);
    this.setState('JUMP');
    this.isInvulnerable = true;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    let dir = customDir !== null ? customDir : -this.facing;
    if (this.x < 180) dir = 1;
    else if (this.x > ww - 180) dir = -1;
    this.dashDir = dir;
    this.onStartDodge(enemy, game, dir);
  }

  startCrouch(_enemy, game) {
    this.crouchCooldown = 3.2;
    this.crouchDuration = 0.96;
    this.setState('CROUCH');
    this.isCrouching = true;
    this.isDeflecting = true;
    this.vx = 0;

    this.fx.spawn('sylvanLeafCloakDome', this._safeFxX(this.x + this.facing * 4, game), this._safeFxY(this.groundY), {
      follow: this,
      offsetX: 4,
      offsetY: 0,
      useGroundY: true,
      flip: this.facing < 0,
      palette: SYLVAN_EMERALD_PALETTE,
      maxDuration: 0.64,
      light: 1.05,
      extra: {
        radius: 42,
        radiusY: 58
      }
    });

    if (game?.vfx) {
      game.vfx.spawnDamageText(this.x, this.y - 118, 0, false, 'STEALTH CROUCH!', '#6ee7b7');
    }
    if (game?.audio) {
      game.audio.play('zephyr_flip', this.x);
    }
  }

  onStartDodge(enemy, game, dir) {
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const dist = enemy ? Math.abs(enemy.x - this.x) : 300;
    const retreatX = this.x - this.facing * 260;
    const nearWallOrCornered =
      this.x < 330 ||
      this.x > ww - 330 ||
      retreatX < 190 ||
      retreatX > ww - 190 ||
      dist < 225;

    this.isFlipVault = true;
    this.flipStartX = this.x;
    this.flipAngle = 0;
    this.wallFlipCooldown = 3.0;

    if (enemy && nearWallOrCornered) {
      this.dashDuration = 0.64;
      const openSideDir = enemy.x < ww * 0.5 ? 1 : -1;
      let target = enemy.x + openSideDir * 365;
      if (Math.abs(target - this.x) < 260) {
        const crossDir = this.x < enemy.x ? 1 : -1;
        target = enemy.x + crossDir * 355;
      }
      this.flipTargetX = this._clampArenaX(target, game, 150);
      this.dashDir = Math.sign(this.flipTargetX - this.flipStartX) || 1;
      if (game?.vfx) {
        game.vfx.spawnDamageText(this.x, this.y - 125, 0, false, 'ZEPHYR VAULT!', '#34d399');
      }
    } else {
      this.dashDuration = 0.60;
      this.flipTargetX = this._clampArenaX(this.x + dir * 340, game, 150);
      this.dashDir = dir;
      if (game?.vfx) {
        game.vfx.spawnDamageText(this.x, this.y - 120, 0, false, 'ZEPHYR LEAP!', '#34d399');
      }
    }

    this.vx = 0;
    this.vy = 0;
    this.heal(18, 'SYLVAN BREEZE');
    this.spawnLeafRuneBurst(this.x, this.groundY - 64, 6, 130, true);
    if (game?.audio) game.audio.play('zephyr_flip', this.x);

    this.fx.spawn('zephyrGroundBurst', this._safeFxX(this.x, game), this._safeFxY(this.groundY), {
      palette: SYLVAN_EMERALD_PALETTE,
      light: 1.05,
      extra: { radius: 28 }
    });
  }

  onStartDash(_enemy, game, dir) {
    this.isFlipVault = false;
    this.flipAngle = 0;
    this.dashDuration = 0.44;
    this.dashDir = dir || this.facing;
    this.vx = this.dashDir * 380;
    if (game?.audio) game.audio.play('arrow_shoot', this.x);
    if (game?.vfx) {
      game.vfx.spawnDamageText(this.x, this.y - 120, 0, false, 'GALE STRIDE!', '#34d399');
    }
  }

  updateDashOrDodge(dt, enemy, game) {
    const t = this.stateTimer;

    if ((this.state === 'DODGE' || this.state === 'JUMP') && this.isFlipVault) {
      const u = Math.min(1, t / this.dashDuration);
      const airU = Math.max(0, Math.min(1, (u - 0.10) / 0.76));

      const horizU =
        airU < 0.35
          ? (airU / 0.35) * 0.44
          : airU < 0.70
            ? 0.44 + ((airU - 0.35) / 0.35) * 0.28
            : 0.72 + ((airU - 0.70) / 0.30) * 0.28;
      this.x = this.flipStartX + (this.flipTargetX - this.flipStartX) * horizU;

      let liftFrac = 0;
      if (airU > 0 && airU < 1) {
        if (airU < 0.28) {
          const p = airU / 0.28;
          liftFrac = 1 - Math.pow(1 - p, 2.2);
        } else if (airU <= 0.68) {
          const h = (airU - 0.28) / 0.40;
          liftFrac = 1.0 - Math.sin(h * Math.PI) * 0.06;
        } else {
          const p = (airU - 0.68) / 0.32;
          liftFrac = 1 - Math.pow(p, 1.85);
        }
      }
      this.y = this.groundY - liftFrac * 86;
      this.flipAngle = 0;

      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }

      if (airU > 0.08 && airU < 0.88) {
        this._afterimageTimer += dt;
        if (this._afterimageTimer >= 0.14) {
          this._afterimageTimer = 0;
          this.spawnAfterimage(this.x, this.y, this.facing, 8, Math.min(29, Math.floor(u * 30)), 0.18);
        }
      }

      if (u >= 0.58 && !this.didActionFrame && enemy && !enemy.isDead) {
        this.didActionFrame = true;
        if (game?.audio) game.audio.play('arrow_shoot', this.x);
        const sx = this.x + this.facing * 42;
        const sy = this.y - 112;
        const dx = enemy.x - sx;
        const dy = (enemy.y - 98) - sy;
        const td = Math.hypot(dx, dy) || 1;
        const shotAng = Math.atan2(dy, dx);

        if (game?.vfx) {
          game.vfx.spawnProjectile({
            x: sx,
            y: sy,
            vx: (dx / td) * 775,
            vy: (dy / td) * 775,
            radius: 13,
            color: '#34d399',
            coreColor: '#fef08a',
            owner: this,
            damage: enemy.hasPoise && enemy.attackRange <= 160 ? 66 : 58,
            type: 'arrow'
          });
        }

        this.fx.spawn('sonicBowReleaseWave', this._safeFxX(sx, game), this._safeFxY(sy), {
          flip: false,
          palette: SYLVAN_STARLIGHT_PALETTE,
          light: 1.15,
          extra: { aimAngle: shotAng, radius: 24, twin: false }
        });
      }

      if (t >= this.dashDuration) {
        this.y = this.groundY;
        this.vy = 0;
        this.isFlipVault = false;
        this.flipAngle = 0;
        this.isInvulnerable = false;
        this.setState('IDLE');
      }
      return;
    }

    const distToEnemy = enemy && !enemy.isDead ? (enemy.x - this.x) * this.dashDir : 999;
    if (distToEnemy > 350 || distToEnemy < 0) {
      this.x = this._clampArenaX(this.x + this.dashDir * 295 * dt, game, 84);
    } else {
      this.vx = 0;
    }
    this._afterimageTimer += dt;
    if (this._afterimageTimer >= 0.14) {
      this._afterimageTimer = 0;
      const col = Math.min(29, Math.floor((t / Math.max(0.1, this.dashDuration)) * 30));
      this.spawnAfterimage(this.x, this.y, this.facing, 6, col, 0.18);
    }

    if (t >= 0.20 && !this.didActionFrame && enemy && !enemy.isDead) {
      this.didActionFrame = true;
      if (game?.audio) game.audio.play('arrow_shoot', this.x);
      const sx = this.x + this.facing * 46;
      const sy = this.y - 110;
      const dx = enemy.x - sx;
      const dy = (enemy.y - 106) - sy;
      const d = Math.hypot(dx, dy) || 1;
      const shotAng = Math.atan2(dy, dx);

      if (game?.vfx) {
        game.vfx.spawnProjectile({
          x: sx,
          y: sy,
          vx: (dx / d) * 745,
          vy: (dy / d) * 745,
          radius: 13,
          color: '#34d399',
          coreColor: '#fef08a',
          owner: this,
          damage: 46,
          type: 'arrow'
        });
      }

      this.fx.spawn('sonicBowReleaseWave', this._safeFxX(sx, game), this._safeFxY(sy), {
        flip: false,
        palette: SYLVAN_EMERALD_PALETTE,
        light: 1.1,
        extra: { aimAngle: shotAng, radius: 21, twin: false }
      });
    }

    if (t >= this.dashDuration) {
      this.isFlipVault = false;
      this.flipAngle = 0;
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  updateCrouch(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.crouchDuration || 0.96;
    this.vx *= Math.pow(0.001, dt);
    this.isCrouching = t < dur * 0.82;
    this.isDeflecting = this.isCrouching;

    if (t >= 0.16 && t < 0.57 && !this._drewBowVortex) {
      this._drewBowVortex = true;
      this.fx.spawn('sylvanBowDrawVortex', this._safeFxX(this.x + this.facing * 52, game), this._safeFxY(this.y - 96), {
        follow: this,
        offsetX: 52,
        offsetY: -96,
        palette: SYLVAN_STARLIGHT_PALETTE,
        maxDuration: 0.39,
        light: 1.1,
        extra: { radius: 20 }
      });
    } else if (t >= 0.57 && !this.didActionFrame) {
      this.didActionFrame = true;
      this.shotCombo++;
      this.vx -= this.facing * 38;
      if (game?.audio) game.audio.play('arrow_shoot', this.x);

      const spawnX = this.x + this.facing * 52;
      const spawnY = this.y - 96;
      const targetY = enemy ? enemy.y - 102 : spawnY;
      const dx = enemy ? enemy.x - spawnX : this.facing * 520;
      const dy = targetY - spawnY;
      const dist = Math.hypot(dx, dy) || 1;
      const speed = 765;
      const shotAng = Math.atan2(dy, dx);

      if (game?.vfx) {
        game.vfx.spawnProjectile({
          x: spawnX,
          y: spawnY,
          vx: (dx / dist) * speed,
          vy: (dy / dist) * speed,
          radius: 14,
          color: '#10b981',
          coreColor: '#fef08a',
          owner: this,
          damage: 90,
          type: 'arrow'
        });
      }

      this.fx.spawn('sonicBowReleaseWave', this._safeFxX(spawnX, game), this._safeFxY(spawnY), {
        flip: false,
        palette: SYLVAN_STARLIGHT_PALETTE,
        light: 1.2,
        extra: { aimAngle: shotAng, radius: 27, twin: true }
      });
    }

    if (t >= dur) {
      this.isCrouching = false;
      this.isDeflecting = false;
      this.setState('IDLE');
    }
  }

  update(dt, enemy, game) {
    this.game = game || this.game;
    this._currentEnemy = enemy;
    this.windPhase += dt * 3.0;
    this.wallFlipCooldown = Math.max(0, this.wallFlipCooldown - dt);
    this.crouchCooldown = Math.max(0, this.crouchCooldown - dt);
    this.vaultCooldown = Math.max(0, (this.vaultCooldown || 0) - dt);
    if (this._trueUltBeamTimer > 0) {
      this._trueUltBeamTimer = Math.max(0, this._trueUltBeamTimer - dt);
    }
    if (this._rematerializeFlash > 0) {
      this._rematerializeFlash = Math.max(0, this._rematerializeFlash - dt);
    }
    if (this.state !== 'AUTO_ATTACK' && this._comboPersistTimer > 0) {
      this._comboPersistTimer = Math.max(0, this._comboPersistTimer - dt);
    }

    // Ambient World-Tree pixel leaf-runes drifting softly around Sylvara EX
    if (!this.isDead) {
      this.ambientLeafAccum += dt;
      if (this.ambientLeafAccum >= 0.28) {
        this.ambientLeafAccum = 0;
        if (this.pixelLeafRunes.length < 36) {
          this.pixelLeafRunes.push({
            x: this.x - this.facing * 16 + ((Math.round(this.x) % 3) - 1) * 8,
            y: this.y - 108,
            vx: -this.facing * 14,
            vy: 22,
            phase: this.windPhase * 2.0,
            isGold: Math.random() < 0.42,
            age: 0,
            maxLife: 0.48
          });
        }
      }
    }

    for (let i = this.pixelLeafRunes.length - 1; i >= 0; i--) {
      const l = this.pixelLeafRunes[i];
      l.age += dt;
      l.phase += dt * 7.0;
      l.x += (l.vx + Math.sin(l.phase) * 16) * dt;
      l.y += l.vy * dt;
      l.vy += 65 * dt;
      if (l.age >= l.maxLife) this.pixelLeafRunes.splice(i, 1);
    }
    for (let i = this.starlightGlints.length - 1; i >= 0; i--) {
      this.starlightGlints[i].age += dt;
      if (this.starlightGlints[i].age >= this.starlightGlints[i].maxLife) {
        this.starlightGlints.splice(i, 1);
      }
    }
    for (let i = this._arrowStarParticles.length - 1; i >= 0; i--) {
      const p = this._arrowStarParticles[i];
      p.age += dt;
      if (p.attractX !== null && p.attractY !== null) {
        p.vx += (p.attractX - p.x) * 20 * dt;
        p.vy += (p.attractY - p.y) * 20 * dt;
      } else {
        const damp = 1 - Math.min(0.85, 2.0 * dt);
        p.vx *= damp;
        p.vy *= damp;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.phase += dt * 11;
      if (p.age >= p.maxLife) {
        this._arrowStarParticles.splice(i, 1);
      }
    }

    this.fx.update(dt);

    for (let i = this.activeVfxAnims.length - 1; i >= 0; i--) {
      const v = this.activeVfxAnims[i];
      v.age += dt;
      if (v.followOwner) {
        v.x = this.x + v.offsetX * this.facing;
        v.y = this.y + v.offsetY;
      } else {
        if (v.isSeeker && enemy && !enemy.isDead) {
          const tx = enemy.x;
          const ty = enemy.y - 96;
          const dx = tx - v.x;
          const dy = ty - v.y;
          const dist = Math.hypot(dx, dy) || 1;
          const desiredVx = (dx / dist) * 690;
          const desiredVy = (dy / dist) * 690;
          v.vx += (desiredVx - v.vx) * Math.min(1, dt * 9.0);
          v.vy += (desiredVy - v.vy) * Math.min(1, dt * 9.0);
        }
        v.x += (v.vx || 0) * dt;
        v.y += (v.vy || 0) * dt;
      }
      if (v.age >= v.maxLife) {
        this.activeVfxAnims.splice(i, 1);
      }
    }

    for (let i = this.brambleSnareZones.length - 1; i >= 0; i--) {
      const z = this.brambleSnareZones[i];
      z.age += dt;
      if (enemy && !enemy.isDead && Math.abs(enemy.x - z.x) <= z.radius) {
        enemy.vx *= 0.25;
      }
      if (z.age >= z.maxLife) {
        this.brambleSnareZones.splice(i, 1);
      }
    }

    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      this.afterimages[i].age += dt;
      if (this.afterimages[i].age >= this.afterimages[i].maxLife) {
        this.afterimages.splice(i, 1);
      }
    }

    const isManualPlayer = Boolean(
      (this.isPlayerControlled && !this.adventureAutoPlay) || this.isManualAdventureControl
    );
    if (!this.isBenched && !isManualPlayer && enemy && !enemy.isDead && (this.state === 'IDLE' || this.state === 'WALK')) {
      const ww = game?.renderer ? game.renderer.worldWidth : 1200;
      const dist = Math.abs(enemy.x - this.x);
      const pinnedLeft = this.x < 240 && enemy.x > this.x;
      const pinnedRight = this.x > ww - 240 && enemy.x < this.x;

      if ((pinnedLeft || pinnedRight || dist < 185) && dist < 260 && this.dodgeCooldown <= 0 && this.wallFlipCooldown <= 0) {
        this.wallFlipCooldown = 3.0;
        this.startJump(enemy, game);
        return;
      }

      if (
        dist >= 280 &&
        dist <= this.attackRange &&
        this.autoCooldown <= 0 &&
        this.crouchCooldown <= 0 &&
        this.shotCombo % 3 === 2
      ) {
        this.autoCooldown = this.autoInterval * (0.92 + Math.random() * 0.2);
        this.startCrouch(enemy, game);
        return;
      }
    }

    super.update(dt, enemy, game);
  }

  /**
   * 4-Beat Pure `520px` Yggdrasil Star-Huntress Flow (`[[60,8],[68,7],[75,8],[83,7]]`):
   * - V0 (`F03` `63`): Supersonic Astral Starlight Arrow + 4-point Constellation Glint!
   * - V1 (`F09` `69`): Rising Twin-Star 2-Arrow Volley!
   * - V2 (`F17/F18` `77/78`): Rapid 2-Arrow Emerald Streak + Zodiac Starfall Sky-Arrow!
   * - V3 (`F25` `85`): `-48px` Airborne Dragon-Piercer Backstep-Hop (`42px` lift) 3-Arrow Piercing Volley!
   */
  updateAutoAttack(dt, enemy, game) {
    this._currentEnemy = enemy;
    this._comboPersistTimer = 0.74;

    if (this._intraLinkTimer > 0) {
      this._intraLinkTimer = Math.max(0, this._intraLinkTimer - dt);
      this.vx = 0;
      this.vy = 0;
      this.y = this.groundY;
      if (this._intraLinkTimer <= 0) {
        this._beginComboBeat(this.comboStep, game);
        this._aiComboCount = (this._aiComboCount || 0) + 1;
        this._aiComboChainTimer = 0.92;
      }
      return;
    }

    const v = this._autoVariant;
    const dur = this.autoDuration || BEAT_DURATIONS[v];
    const t = this.stateTimer;
    const [sliceStart, sliceLen] = AUTO_SLICES_EX[v];

    const snapT = v === 0 ? 0.10 : v === 1 ? 0.08 : v === 2 ? 0.09 : 0.16;

    let localStep = 0;
    if (v === 0) {
      if (t < 0.10) localStep = Math.min(2, Math.floor((t / 0.10) * 3));
      else if (t < 0.16) localStep = 3;
      else if (t < 0.26) localStep = 4 + Math.min(1, Math.floor(((t - 0.16) / 0.10) * 2));
      else localStep = 6 + Math.min(1, Math.floor(((t - 0.26) / 0.10) * 2));
    } else if (v === 1) {
      if (t < 0.08) localStep = 0;
      else if (t < 0.14) localStep = 1;
      else if (t < 0.24) localStep = 2 + Math.min(1, Math.floor(((t - 0.14) / 0.10) * 2));
      else localStep = 4 + Math.min(2, Math.floor(((t - 0.24) / 0.11) * 3));
    } else if (v === 2) {
      if (t < 0.09) localStep = Math.min(1, Math.floor((t / 0.09) * 2));
      else if (t < 0.16) localStep = 2;
      else if (t < 0.22) localStep = 3;
      else localStep = 4 + Math.min(3, Math.floor(((t - 0.22) / 0.16) * 4));
    } else {
      if (t < 0.16) localStep = Math.min(1, Math.floor((t / 0.16) * 2));
      else if (t < 0.25) localStep = 2;
      else localStep = 3 + Math.min(3, Math.floor(((t - 0.25) / 0.23) * 4));
    }

    const frameIdx = sliceStart + Math.min(sliceLen - 1, Math.max(0, localStep));
    this.trueUltFrameOverride = frameIdx;
    this._overrideFrameIdx = frameIdx;

    // Marksman Footwork & -48px Airborne Dragon-Piercer Backstep-Hop on Beat 4 (`V3`)
    this.vx = 0;
    if (t < snapT) {
      const moveU = Math.min(1, Math.max(0, t / snapT));
      const eased = 1 - Math.pow(1 - moveU, 2.1);
      this.x = this._beatStartX + (this._beatTargetX - this._beatStartX) * eased;

      if (t >= 0.02 && !this._drewBowVortex) {
        this._drewBowVortex = true;
        const isStar = v >= 2;
        const drawOffY = v === 1 ? -98 : v === 3 ? -120 : -110;
        this.fx.spawn('sylvanBowDrawVortex', this._safeFxX(this.x + this.facing * 54, game), this._safeFxY(this.y + drawOffY), {
          follow: this,
          offsetX: 54,
          offsetY: drawOffY,
          palette: isStar ? SYLVAN_STARLIGHT_PALETTE : SYLVAN_EMERALD_PALETTE,
          maxDuration: 0.16,
          light: v === 3 ? 1.20 : 1.08,
          extra: { radius: v === 3 ? 24 : 19 }
        });
      }
    } else if (!this._bootsPlanted) {
      this._bootsPlanted = true;
      this.x = this._beatTargetX;
      this.vx = 0;
    }

    if (v === 3) {
      const hopEnd = dur * 0.84;
      if (t < hopEnd) {
        const hopU = Math.min(1, Math.max(0, t / hopEnd));
        this.y = this.groundY - Math.sin(hopU * Math.PI) * 42;
        this.vy = 0;
      } else {
        this.y = this.groundY;
        this.vy = 0;
      }
    } else {
      this.y = this.groundY;
      this.vy = 0;
    }

    const spawnX = this.x + this.facing * 58;
    const spawnY = v === 1 ? this.y - 98 : v === 3 ? this.y - 108 : this.y - 106;
    const targetY = enemy && !enemy.isDead ? (enemy.y || this.groundY) - 96 : spawnY;
    const dx = enemy && !enemy.isDead ? enemy.x - spawnX : this.facing * 520;
    const dy = targetY - spawnY;
    const aimDist = Math.hypot(dx, dy) || 1;
    const shotAng = Math.atan2(dy, dx);

    if (v === 0) {
      if ((this._beatHitMask & 1) === 0 && t >= 0.10) {
        this._beatHitMask |= 1;
        this.didActionFrame = true;
        this.shotCombo++;
        this._hitStopTimer = Math.max(this._hitStopTimer || 0, 0.044);
        if (game?.audio) game.audio.play('arrow_shoot', this.x);

        this.spawnStarGlint(spawnX + this.facing * 12, spawnY, 8, '#fde047', 0.20);
        this.spawnLeafRuneBurst(spawnX, spawnY, 3, 105, true);

        if (game?.vfx) {
          const speed = 780;
          game.vfx.spawnProjectile({
            x: spawnX,
            y: spawnY,
            vx: (dx / aimDist) * speed,
            vy: (dy / aimDist) * speed,
            radius: 14,
            color: '#10b981',
            coreColor: '#fef08a',
            owner: this,
            damage: 86,
            isCrit: false,
            pierce: false,
            type: 'arrow'
          });
        }
        this.fx.spawn('sonicBowReleaseWave', this._safeFxX(spawnX, game), this._safeFxY(spawnY), {
          flip: false,
          palette: SYLVAN_EMERALD_PALETTE,
          light: 1.16,
          extra: { aimAngle: shotAng, radius: 24, twin: false }
        });
      }
    } else if (v === 1) {
      if ((this._beatHitMask & 1) === 0 && t >= 0.08) {
        this._beatHitMask |= 1;
        this.didActionFrame = true;
        this.shotCombo++;
        this._hitStopTimer = Math.max(this._hitStopTimer || 0, 0.044);
        if (game?.audio) game.audio.play('arrow_shoot', this.x);

        this.spawnStarGlint(spawnX + this.facing * 10, spawnY, 8, '#34d399', 0.20);

        if (game?.vfx) {
          const speed = 760;
          game.vfx.spawnProjectile({
            x: spawnX,
            y: spawnY - 8,
            vx: (dx / aimDist) * speed,
            vy: (dy / aimDist) * speed - 20,
            radius: 14,
            color: '#10b981',
            coreColor: '#fef08a',
            owner: this,
            damage: 62,
            type: 'arrow'
          });
          game.vfx.spawnProjectile({
            x: spawnX - this.facing * 14,
            y: spawnY + 8,
            vx: (dx / aimDist) * (speed * 0.96),
            vy: (dy / aimDist) * (speed * 0.96) + 18,
            radius: 13,
            color: '#34d399',
            coreColor: '#fef08a',
            owner: this,
            damage: 54,
            type: 'arrow'
          });
        }
        this.fx.spawn('sonicBowReleaseWave', this._safeFxX(spawnX, game), this._safeFxY(spawnY), {
          flip: false,
          palette: SYLVAN_STARLIGHT_PALETTE,
          light: 1.22,
          extra: { aimAngle: shotAng, radius: 27, twin: true }
        });
      }
    } else if (v === 2) {
      if ((this._beatHitMask & 1) === 0 && t >= 0.09) {
        this._beatHitMask |= 1;
        this.didActionFrame = true;
        this.shotCombo++;
        this._hitStopTimer = Math.max(this._hitStopTimer || 0, 0.040);
        if (game?.audio) game.audio.play('arrow_shoot', this.x);
        this.spawnAfterimage(this.x, this.groundY, this.facing, 2, 17, 0.18);

        if (game?.vfx) {
          const speed = 770;
          game.vfx.spawnProjectile({
            x: spawnX,
            y: spawnY - 6,
            vx: (dx / aimDist) * speed,
            vy: (dy / aimDist) * speed,
            radius: 14,
            color: '#34d399',
            coreColor: '#ffffff',
            owner: this,
            damage: 52,
            type: 'arrow'
          });
        }
      }
      if ((this._beatHitMask & 2) === 0 && t >= 0.16) {
        this._beatHitMask |= 2;
        if (game?.audio) game.audio.play('arrow_shoot', this.x);

        const strikeX = enemy && !enemy.isDead ? enemy.x : spawnX + this.facing * 340;
        if (game?.vfx) {
          const speed = 785;
          game.vfx.spawnProjectile({
            x: spawnX,
            y: spawnY + 6,
            vx: (dx / aimDist) * speed,
            vy: (dy / aimDist) * speed,
            radius: 14,
            color: '#10b981',
            coreColor: '#fef08a',
            owner: this,
            damage: 56,
            type: 'arrow'
          });
          game.vfx.spawnSkyStrike?.({
            x: strikeX - this.facing * 42,
            y: -80,
            groundY: enemy?.groundY || this.groundY,
            vx: this.facing * 110,
            vy: 1420,
            type: 'starfall_arrow',
            color: '#34d399',
            coreColor: '#fef08a',
            owner: this,
            target: enemy,
            damage: 48,
            delay: 0,
            maxLinger: 0.42
          });
        }
        this.fx.spawn('sonicBowReleaseWave', this._safeFxX(spawnX, game), this._safeFxY(spawnY), {
          flip: false,
          palette: SYLVAN_STARLIGHT_PALETTE,
          light: 1.24,
          extra: { aimAngle: shotAng, radius: 28, twin: true }
        });
      }
    } else {
      // Beat 4 (`V3`, `F25`): -48px Airborne Dragon-Piercer Backstep-Hop 3-Arrow Volley!
      if ((this._beatHitMask & 1) === 0 && t >= 0.16) {
        this._beatHitMask |= 1;
        this.didActionFrame = true;
        this.shotCombo++;
        this._hitStopTimer = Math.max(this._hitStopTimer || 0, 0.052);
        if (game?.audio) game.audio.play('arrow_shoot', this.x);
        this.spawnAfterimage(this.x, this.y, this.facing, 2, 25, 0.22);
        this.spawnLeafRuneBurst(this.x, this.y - 84, 6, 145, true);
        this.spawnStarGlint(spawnX + this.facing * 12, spawnY, 10, '#fde047', 0.24);

        this.spawnVfxAnim(3, this.x + this.facing * 58, this.y - 96, 184, 184, 0.34, {
          flipX: this.facing < 0,
          inFront: true
        });

        if (game?.vfx) {
          const speed = 820;
          const fanOffsets = [-0.06, 0, 0.06];
          for (let k = 0; k < fanOffsets.length; k++) {
            const ang = shotAng + fanOffsets[k];
            game.vfx.spawnProjectile({
              x: spawnX + (k === 1 ? this.facing * 8 : 0),
              y: spawnY + (k - 1) * 9,
              vx: Math.cos(ang) * speed,
              vy: Math.sin(ang) * speed,
              radius: k === 1 ? 16 : 14,
              color: k === 1 ? '#10b981' : '#34d399',
              coreColor: '#fef08a',
              owner: this,
              damage: k === 1 ? 72 : 54,
              isCrit: true,
              pierce: true,
              type: 'arrow'
            });
          }
          game.vfx.spawnDamageText?.(this.x, this.y - 148, 0, true, 'DRAGON-PIERCER!', '#fde047');
        }

        this.fx.spawn('sonicBowReleaseWave', this._safeFxX(spawnX, game), this._safeFxY(spawnY), {
          flip: false,
          palette: SYLVAN_STARLIGHT_PALETTE,
          light: 1.32,
          extra: { aimAngle: shotAng, radius: 31, twin: true }
        });
      }
    }

    if (t >= dur) {
      this.y = this.groundY;
      this.vy = 0;
      this.vx = 0;

      const isManualPlayer = Boolean(
        (this.isPlayerControlled && !this.adventureAutoPlay) || this.isManualAdventureControl
      );
      const advHoldingAttack = Boolean(
        (game?.isAdventureMode?.() || game?.adventure?.active) &&
          (game?.adventure?.heldAttack ||
            game?.adventure?.uiHeldAttack ||
            game?.adventure?.queuedAction === 'attack')
      );
      const aiWantsChain =
        !isManualPlayer &&
        enemy &&
        !enemy.isDead &&
        !enemy.isInvulnerable &&
        Math.abs(enemy.x - this.x) <= this.attackRange + 35;

      if (v < 3 && (this._queuedNextBeat || advHoldingAttack || aiWantsChain)) {
        if (game?.adventure?.queuedAction === 'attack') {
          game.adventure.queuedAction = null;
        }
        this._intraLinkTimer = INTRA_COMBO_LINK;
        return;
      }

      if (v === 3) {
        this.comboStep = 0;
        this._aiComboReadyFinisher = 0.88;
        this.autoCooldown = isManualPlayer ? 0.05 : this._postFlurryInterval * (0.92 + Math.random() * 0.16);
      } else {
        this.autoCooldown = 0.015;
      }

      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      this.setState('IDLE');
    }
  }

  /**
   * 3-Beat Raining-Arrow & Emerald Tempest Skill (`4.00s CD`, `1.06s`):
   * `STARWOOD CONSTELLATION VOLLEY` — Beat 1: Verdant Bramble-Star Snare + 2 direct fast arrows;
   * Beat 2: Starlight Grace heal + 3 horizontal fan arrows; Beat 3: Skyward `-34 deg` Arrow Rain +
   * Emerald Tempest Cyclone & 10 staggered sky-falling `starfall_arrow` bolts!
   */
  updateSkill(_dt, enemy, game) {
    const t = this.stateTimer;
    const centerTargetX = this._clampArenaX(
      enemy && !enemy.isDead ? enemy.x : this.x + this.facing * 320,
      game,
      120
    );
    const targetX = enemy && !enemy.isDead ? this._clampArenaX(enemy.x, game, 84) : centerTargetX;
    const groundY = enemy?.groundY || this.groundY;

    if (enemy && !enemy.isDead && t < 0.25) {
      this.facing = enemy.x >= this.x ? 1 : -1;
    }

    // Beat 1 (`t >= 0.04s`): Bow-Draw Vortex + Starfall Lock + Row 2 Verdant Bramble-Star Snare + 2 Direct Arrows
    if (t >= 0.04 && !this._skillLockSpawned) {
      this._skillLockSpawned = true;
      const bowX = this.x + this.facing * 48;
      const bowY = this.y - 120;

      this.fx.spawn('sylvanBowDrawVortex', this._safeFxX(bowX, game), this._safeFxY(bowY), {
        follow: this,
        offsetX: 48,
        offsetY: -120,
        palette: SYLVAN_EMERALD_PALETTE,
        maxDuration: 0.31,
        light: 1.05,
        extra: { radius: 22 }
      });
      this.fx.spawn('starfallCelestialLock', this._safeFxX(centerTargetX, game), this._safeFxY(groundY), {
        palette: SYLVAN_STARLIGHT_PALETTE,
        light: 1.1,
        extra: { radius: 34, beaconH: 60 }
      });

      this.spawnVfxAnim(2, targetX, groundY - 84, 220, 220, 1.35, {
        flipX: false,
        inFront: false
      });
      this.brambleSnareZones.push({
        x: targetX,
        groundY,
        radius: 135,
        age: 0,
        maxLife: 1.35
      });
      this.spawnLeafRuneBurst(targetX, groundY - 48, 6, 130, true);
      if (enemy && !enemy.isDead) {
        enemy.vx *= 0.25;
        if (Math.abs(enemy.x - targetX) <= 165) {
          enemy.takeDamage(20, this, false, 12, -24);
        }
      }

      if (game?.audio) game.audio.play('arrow_shoot', bowX);
      this.spawnStarGlint(bowX + this.facing * 8, bowY, 6, '#34d399', 0.18);

      const dx = targetX - bowX;
      const dy = (groundY - 96) - bowY;
      const dist = Math.hypot(dx, dy) || 1;
      if (game?.vfx) {
        for (const arcSign of [-1, 1]) {
          game.vfx.spawnProjectile({
            x: bowX,
            y: bowY + arcSign * 10,
            vx: (dx / dist) * 700,
            vy: (dy / dist) * 700 + arcSign * 28,
            radius: 12,
            color: '#10b981',
            coreColor: '#fef08a',
            owner: this,
            damage: 28,
            type: 'arrow'
          });
        }
      }
    }

    // Beat 2 (`t >= 0.36s`): Starlight Grace Heal + 3 Direct Horizontal Fan-Spread Wind Arrows
    if (t >= 0.36 && !this.didActionFrame) {
      this.didActionFrame = true;
      this.vx -= this.facing * 58;
      this.heal(34, 'STARLIGHT GRACE');
      if (game?.audio) game.audio.play('arrow_shoot', this.x);

      const bowX = this.x + this.facing * 48;
      const bowY = this.y - 120;
      const fAng = this.facing === 1 ? 0 : Math.PI;

      this.fx.spawn('sonicBowReleaseWave', this._safeFxX(bowX, game), this._safeFxY(bowY), {
        flip: false,
        palette: SYLVAN_EMERALD_PALETTE,
        light: 1.2,
        extra: { aimAngle: fAng, radius: 27, twin: true }
      });
      this.spawnStarGlint(bowX + this.facing * 10, bowY, 8, '#fde047', 0.20);

      if (game?.vfx) {
        [-0.15, 0, 0.15].forEach((angOff) => {
          const a = fAng + angOff;
          game.vfx.spawnProjectile({
            x: bowX,
            y: bowY,
            vx: Math.cos(a) * 710,
            vy: Math.sin(a) * 710,
            radius: 12,
            color: '#34d399',
            coreColor: '#fef08a',
            owner: this,
            damage: 36,
            type: 'arrow'
          });
        });
      }
    }

    // Beat 3 (`t >= 0.72s`): Skyward -34 deg Beacon + Emerald Tempest Cyclone + 10 Sky-Falling Starfall Arrows
    if (t >= 0.72 && !this.didSecondaryAction) {
      this.didSecondaryAction = true;
      this.vx -= this.facing * 45;
      if (game?.audio) game.audio.play('arrow_rain', centerTargetX);

      const bowX = this.x + this.facing * 42;
      const bowY = this.y - 134;
      const skyAng = this.facing === 1 ? -0.58 : Math.PI + 0.58;

      this.fx.spawn('sonicBowReleaseWave', this._safeFxX(bowX, game), this._safeFxY(bowY), {
        flip: false,
        palette: SYLVAN_STARLIGHT_PALETTE,
        light: 1.2,
        extra: { aimAngle: skyAng, radius: 26, twin: true }
      });
      game?.vfx?.spawnDamageText?.(centerTargetX, groundY - 196, 0, true, 'STARFALL ARROW RAIN!', '#34d399');

      this.fx.spawn('emeraldTempestCyclone', this._safeFxX(centerTargetX, game), this._safeFxY(groundY), {
        vx: this.facing * 32,
        palette: SYLVAN_EMERALD_PALETTE,
        light: 1.15,
        extra: {
          baseRadius: 11,
          topRadius: 30,
          height: 84,
          isUltimate: false
        }
      });
      this.fx.spawn('starfallRainBarrage', this._safeFxX(centerTargetX, game), this._safeFxY(groundY), {
        palette: SYLVAN_STARLIGHT_PALETTE,
        light: 1.2,
        extra: { spread: 52, count: 9 }
      });

      if (game?.vfx) {
        game.vfx.spawnTornado({
          x: centerTargetX,
          groundY,
          vx: this.facing * 38,
          radius: 78,
          height: 265,
          color: '#10b981',
          coreColor: '#fef08a',
          maxLife: 1.10
        });

        for (let i = 0; i < 10; i++) {
          const spread = (i - 4.5) * 32 + (i % 2 === 0 ? 1 : -1) * 6;
          game.vfx.spawnSkyStrike({
            x: centerTargetX + spread - this.facing * 90,
            y: -160 - i * 32,
            groundY,
            vx: this.facing * 240,
            vy: 1320,
            type: 'starfall_arrow',
            color: i % 2 === 0 ? '#10b981' : '#34d399',
            coreColor: '#fef08a',
            owner: this,
            target: enemy,
            damage: 30,
            delay: i * 0.055,
            maxLinger: 0.55
          });
        }
      }
    }

    if (t >= 1.06) {
      this.setState('IDLE');
    }
  }

  /**
   * REMADE OVERDRIVE (`state === 'ULTIMATE'`, `2.04s`):
   * `ZEPHYR STARLOCK: TWELVE-STAR RAIN`
   * - Phase 1 (`0.00..0.32s`): Explosive Gale Charge-In Rush straight into melee vault range (`contactX = clamp(enemy.x - chargeDir * 48)`)
   *   spawning emerald-gold slipstream afterimages + Twin Bow-Blade Vault-Kick!
   * - Phase 2 (`0.32..1.58s`): Full `180 deg` semicircular overhead backflip/somersault (`theta = 0..Math.PI`, `arcRadiusX = 140`,
   *   `arcHeightY = 188`) right over `pivotX = enemy.x`, playing `Row 4` somersault frames `123..134`, flipping `this.facing = -chargeDir`
   *   at the apex (`theta >= Math.PI * 0.5`), and loosing 9 radial Lock-On Homing Starlight Seeker Arrows!
   * - Phase 3 (`1.58..2.04s`): Agile opposite-side landing (`x = pivotX + chargeDir * arcRadiusX`) facing back toward the enemy!
   */
  updateUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;

    this.isInvulnerable = t < 1.62;
    this.unstoppablePoise = true;
    this.hurtTimer = 0;
    this.isFlipVault = false;
    this.isCrouching = false;
    this.vx = 0;
    this.vy = 0;

    const targets = this.getEnemyTargets(enemy, game);
    const primary = enemy && !enemy.isDead ? enemy : targets[0] || null;
    const advBounds =
      game?.adventure?.active && typeof game.adventure.getActiveStageBounds === 'function'
        ? game.adventure.getActiveStageBounds()
        : null;

    // Advance active Starlight Seeker Lances launched during the 180-deg overhead somersault
    for (let i = this.starRainLances.length - 1; i >= 0; i--) {
      const ln = this.starRainLances[i];
      ln.age += dt;
      const u = Math.min(1, ln.age / ln.fallDur);
      ln.x = ln.x0 + (ln.tx - ln.x0) * u;
      ln.y = ln.y0 + (ln.ty - ln.y0) * u;
      if (u >= 1 && !ln.impacted) {
        ln.impacted = true;
        if (game?.audio && ln.index % 2 === 0) game.audio.play('arrow_hit', ln.tx);
        this.spawnStarGlint(ln.tx, ln.ty, ln.isZenith ? 12 : 7, ln.isZenith ? '#ffffff' : '#fde047', 0.24);
        this.spawnVfxAnim(4, ln.tx, ln.ty, ln.isZenith ? 196 : 152, ln.isZenith ? 196 : 152, 0.28, {
          inFront: true
        });
        if (ln.isZenith || ln.isFinisher) {
          this.spawnLeafRuneBurst(ln.tx, ln.ty, 10, 175, true);
          game?.renderer?.triggerShake?.(ln.isFinisher ? 16 : 12, 0.24);
        }
      }
      if (ln.age >= ln.fallDur + 0.16) {
        this.starRainLances.splice(i, 1);
      }
    }

    // Phase 1 (`0.00..0.32s`): Acrobatic Airborne Bow-Charging Flip-Leap straight into vault-kick contact!
    if (t < 0.32) {
      if (this._ultPhase < 1) {
        this._ultPhase = 1;
        this._ultLancesFired = 0;
        this._ultShotMask = 0;
        this._ultChargeSparkTimer = 0;
        this._ultStartX = this.x;
        this._ultChargeDir = primary ? (primary.x >= this.x ? 1 : -1) : this.facing;
        this.facing = this._ultChargeDir;
        this._ultTargetX = primary ? primary.x : this.x + this._ultChargeDir * 280;

        if (game?.audio) game.audio.play('zephyr_flip', this.x);
        if (game?.vfx) {
          game.vfx.spawnDamageText(this.x, this.y - 138, 0, false, 'GALE VAULT CHARGE!', '#34d399');
        }
        this.fx.spawn('zephyrGroundBurst', this._safeFxX(this.x, game), this._safeFxY(this.groundY), {
          palette: SYLVAN_EMERALD_PALETTE,
          light: 1.15,
          extra: { radius: 30 }
        });
        this.fx.spawn('zephyrVaultSlipstream', this._safeFxX(this.x - this.facing * 16, game), this._safeFxY(this.y - 104), {
          follow: this,
          offsetX: -16,
          offsetY: -104,
          flip: this.facing < 0,
          palette: SYLVAN_EMERALD_PALETTE,
          maxDuration: 1.56,
          light: 1.12,
          extra: { length: 28, tilt: -0.12 }
        });
        this.fx.spawn('astralWingPlume', this._safeFxX(this.x - this.facing * 16, game), this._safeFxY(this.y - 122), {
          follow: this,
          offsetX: -16,
          offsetY: -122,
          flip: this.facing < 0,
          palette: SYLVAN_STARLIGHT_PALETTE,
          maxDuration: 1.85,
          light: 1.24,
          extra: { wingSpan: 32 }
        });
        this.fx.spawn('sylvanBowDrawVortex', this._safeFxX(this.x + this.facing * 20, game), this._safeFxY(this.y - 88), {
          follow: this,
          offsetX: 20,
          offsetY: -88,
          palette: SYLVAN_STARLIGHT_PALETTE,
          maxDuration: 0.34,
          light: 1.22,
          extra: { radius: 24 }
        });
        this.spawnLeafRuneBurst(this.x, this.groundY - 76, 8, 150, true);
      }

      const u = Math.min(1, Math.max(0, t / 0.32));
      const easeRush = 1 - Math.pow(1 - u, 2.25);
      const rawContactX = primary
        ? primary.x - this._ultChargeDir * 48
        : this._ultStartX + this._ultChargeDir * 240;
      const contactX = advBounds
        ? Math.max(advBounds.minX + 36, Math.min(advBounds.maxX - 36, rawContactX))
        : Math.max(110, Math.min(ww - 110, rawContactX));

      this.x = this._ultStartX + (contactX - this._ultStartX) * easeRush;
      this.y = this.groundY - Math.sin(u * Math.PI) * 96;
      this.cameraAirLift = Math.sin(u * Math.PI) * 64;

      const leapCol = 2 + Math.min(4, Math.floor(u * 5));
      this._overrideFrameIdx = 120 + leapCol;

      // Converging starlight glints & leaf-runes drawn into her bow while flipping
      this._ultChargeSparkTimer += dt;
      if (this._ultChargeSparkTimer >= 0.045) {
        this._ultChargeSparkTimer = 0;
        const bowX = this.x + this.facing * 20;
        const bowY = this.y - 88;
        const ang = u * Math.PI * 4.0;
        const rad = 42 * (1 - 0.55 * u);
        this.spawnStarGlint(bowX + Math.cos(ang) * rad, bowY + Math.sin(ang) * rad, 5 + Math.round(u * 3), '#fde047', 0.16);
        this.pixelLeafRunes.push({
          x: bowX - Math.cos(ang) * rad,
          y: bowY - Math.sin(ang) * rad,
          vx: Math.cos(ang) * 145,
          vy: Math.sin(ang) * 145,
          phase: ang,
          isGold: Math.floor(u * 8) % 2 === 0,
          age: 0,
          maxLife: 0.22
        });
      }

      this._afterimageTimer += dt;
      if (this._afterimageTimer >= 0.085) {
        this._afterimageTimer = 0;
        this.spawnAfterimage(this.x, this.y, this.facing, 4, leapCol, 0.22);
      }
      return;
    }

    // Twin Bow-Blade Vault-Kick Contact & 180-deg Target Lock-On Snap (`t >= 0.32s`)
    if (this._ultPhase < 2) {
      this._ultPhase = 2;
      if (primary && !primary.isDead) {
        if (!primary.isColossalBoss) {
          primary.x = advBounds
            ? Math.max(advBounds.minX + 165, Math.min(advBounds.maxX - 165, primary.x))
            : Math.max(220, Math.min(ww - 220, primary.x));
          primary.vx = 0;
        }
        this._ultPivotX = advBounds
          ? Math.max(advBounds.minX + 165, Math.min(advBounds.maxX - 165, primary.x))
          : primary.x;
        this._ultTargetX = this._ultPivotX;
        primary.takeDamage(34, this, false, 28, -82);
        this.spawnVfxAnim(0, primary.x, (primary.groundY || this.groundY) - 96, 184, 184, 0.28, {
          flipX: this._ultChargeDir < 0,
          inFront: true
        });
        this.fx.spawn('sylvanArrowImpactBurst', this._safeFxX(primary.x, game), this._safeFxY((primary.groundY || this.groundY) - 96), {
          flip: false,
          palette: SYLVAN_STARLIGHT_PALETTE,
          light: 1.24,
          extra: { aimAngle: -Math.PI * 0.5, isCrit: true }
        });
      } else {
        this._ultPivotX = advBounds
          ? Math.max(advBounds.minX + 165, Math.min(advBounds.maxX - 165, this.x + this._ultChargeDir * 48))
          : Math.max(220, Math.min(ww - 220, this.x + this._ultChargeDir * 48));
        this._ultTargetX = this._ultPivotX;
      }

      this.fx.spawn('yggdrasilLockReticle', this._safeFxX(this._ultPivotX, game), this._safeFxY(this.groundY - 98), {
        flip: false,
        palette: SYLVAN_STARLIGHT_PALETTE,
        maxDuration: 1.38,
        light: 1.25,
        extra: { radius: 20, chargeDir: this._ultChargeDir }
      });
      this.fx.spawn('zephyrGroundBurst', this._safeFxX(this.x, game), this._safeFxY(this.groundY), {
        palette: SYLVAN_STARLIGHT_PALETTE,
        light: 1.18,
        extra: { radius: 30 }
      });
      if (game?.audio) {
        game.audio.play('archer_ult', this.x);
        game.audio.play('zephyr_flip', this.x);
      }
      if (game?.vfx) {
        game.vfx.spawnDamageText(this._ultPivotX, this.groundY - 196, 0, true, '180 STARLOCK VAULT!', '#fef08a');
      }
      game?.renderer?.triggerShake?.(12, 0.24);
      this._overrideFrameIdx = 123;
    }

    // Phase 2 (`0.32..1.58s`): Full 180-deg Semicircular Overhead Backflip + 9 Radial Homing Starlight Seeker Arrows!
    if (t < 1.58) {
      const arcU = Math.min(1, Math.max(0, (t - 0.32) / 1.26));
      const theta = arcU * Math.PI;
      const arcRadiusX = 140;
      const arcHeightY = 196;

      if (
        primary &&
        !primary.isDead &&
        !primary.isColossalBoss &&
        primary.state !== 'DODGE' &&
        primary.state !== 'JUMP'
      ) {
        primary.x += (this._ultPivotX - primary.x) * Math.min(1, dt * 7);
      }
      this._ultTargetX = primary && !primary.isDead ? primary.x : this._ultPivotX;

      const rawArcX = this._ultPivotX - this._ultChargeDir * Math.cos(theta) * arcRadiusX;
      this.x = advBounds
        ? Math.max(advBounds.minX + 36, Math.min(advBounds.maxX - 36, rawArcX))
        : Math.max(84, Math.min(ww - 84, rawArcX));
      this.y = this.groundY - Math.sin(theta) * arcHeightY;
      this.cameraAirLift = Math.sin(theta) * 148;

      // Flip 180 degrees across the apex (`theta >= Math.PI * 0.5`) so she faces & aims back down at the enemy!
      this.facing = theta >= Math.PI * 0.5 ? -this._ultChargeDir : this._ultChargeDir;

      // Play baked Row 4 acrobatic backflip frames `123..134` (`F03..F14`)
      const somCol = 3 + Math.min(11, Math.floor(arcU * 12));
      this._overrideFrameIdx = 120 + somCol;

      // Keep luminous bow star-sparks swirling during the 9-arrow Starfall somersault
      this._ultChargeSparkTimer += dt;
      if (this._ultChargeSparkTimer >= 0.085) {
        this._ultChargeSparkTimer = 0;
        const bowSparkX = this.x + this.facing * 16;
        const bowSparkY = this.y - 78;
        this.spawnStarGlint(bowSparkX, bowSparkY, 6, '#fde047', 0.16);
      }

      this._afterimageTimer += dt;
      if (this._afterimageTimer >= 0.10) {
        this._afterimageTimer = 0;
        this.spawnAfterimage(this.x, this.y, this.facing, 4, somCol, 0.22);
      }

      // Loose 9 Radial Lock-On Homing Starlight Seeker Arrows evenly spaced around theta!
      const lockAnglesDeg = [18, 36, 54, 72, 90, 108, 126, 144, 162];
      for (let i = 0; i < lockAnglesDeg.length; i++) {
        const triggerTheta = (lockAnglesDeg[i] * Math.PI) / 180;
        if (theta >= triggerTheta && (this._ultShotMask & (1 << i)) === 0) {
          this._ultShotMask |= 1 << i;
          this._ultLancesFired++;

          const tx = primary && !primary.isDead ? primary.x : this._ultPivotX;
          const ty = (primary && !primary.isDead ? primary.y : this.groundY) - 96;
          const bowX = this.x + (tx >= this.x ? 16 : -16);
          const bowY = this.y - 68;
          const dx = tx - bowX;
          const dy = ty - bowY;
          const shotAng = Math.atan2(dy, dx);
          const isZenith = i === 4;
          const isFinisher = i === 8;

          if (game?.audio) {
            game.audio.play('arrow_shoot', this.x);
            if (isZenith || isFinisher) game.audio.play('arrow_hit', tx);
          }

          this.fx.spawn('starlockHomingArrow', this._safeFxX(bowX, game), this._safeFxY(bowY), {
            flip: false,
            palette: isZenith || isFinisher ? SYLVAN_STARLIGHT_PALETTE : SYLVAN_EMERALD_PALETTE,
            light: isZenith || isFinisher ? 1.32 : 1.16,
            extra: {
              dx: dx / 3,
              dy: dy / 3
            }
          });
          this.fx.spawn('sonicBowReleaseWave', this._safeFxX(bowX, game), this._safeFxY(bowY), {
            flip: false,
            palette: isZenith ? SYLVAN_STARLIGHT_PALETTE : SYLVAN_EMERALD_PALETTE,
            light: 1.18,
            extra: { aimAngle: shotAng, radius: isZenith ? 24 : 18, twin: isZenith }
          });

          this.starRainLances.push({
            index: i,
            x0: bowX,
            y0: bowY,
            tx,
            ty,
            x: bowX,
            y: bowY,
            age: 0,
            fallDur: 0.12,
            isZenith,
            isFinisher,
            impacted: false
          });

          for (const foe of targets) {
            if (foe && !foe.isDead && Math.abs(foe.x - tx) <= 210) {
              const shotDmg = isFinisher ? 38 : isZenith ? 32 : 21;
              foe.takeDamage(
                shotDmg,
                this,
                isZenith || isFinisher || i % 3 === 0,
                isFinisher ? 135 : 14,
                isFinisher ? -165 : -22
              );
            }
          }
        }
      }
      return;
    }

    // Phase 3 (`1.58..2.04s`): Agile Opposite-Side Touchdown Facing Back Toward Enemy!
    if (this._ultPhase < 3) {
      this._ultPhase = 3;
      this.didActionFrame = true;
      const landRawX = this._ultPivotX + this._ultChargeDir * 140;
      this.x = advBounds
        ? Math.max(advBounds.minX + 36, Math.min(advBounds.maxX - 36, landRawX))
        : Math.max(84, Math.min(ww - 84, landRawX));
      this.y = this.groundY;
      this.vy = 0;
      this.cameraAirLift = 0;
      this.facing = primary && !primary.isDead ? (primary.x >= this.x ? 1 : -1) : -this._ultChargeDir;
      this.autoCooldown = Math.max(this.autoCooldown, 0.48);
      this.fx.spawn('zephyrGroundBurst', this._safeFxX(this.x, game), this._safeFxY(this.groundY), {
        palette: SYLVAN_EMERALD_PALETTE,
        light: 1.12,
        extra: { radius: 28 }
      });
    }

    this.y = this.groundY;
    this.cameraAirLift = 0;
    const landU = Math.min(1, Math.max(0, (t - 1.58) / Math.max(0.05, this.ultDuration - 1.58)));
    this._overrideFrameIdx = 147 + Math.min(2, Math.floor(landU * 3));

    if (t >= this.ultDuration) {
      this.isInvulnerable = false;
      this.unstoppablePoise = false;
      this._overrideFrameIdx = null;
      this.starRainLances = [];
      this.cameraAirLift = 0;
      this.setState('IDLE');
    }
  }

  _triggerTrueUltArrowPierceImpact(targets, primaryTarget, game) {
    if (this._trueUltPierced) return;
    this._trueUltPierced = true;

    const impX = Number.isFinite(this._trueUltTargetX) ? this._trueUltTargetX : this.x;
    const impYBase = this.groundY - 104;

    game?.renderer?.triggerImpactFrame?.(impX, impYBase, 0.08, 'emerald');
    game?.renderer?.triggerShake?.(24, 0.62);
    game?.renderer?.triggerAberration?.(14);
    game?.renderer?.triggerHitStop?.(0.085);

    if (game?.audio) {
      game.audio.play('arrow_hit', impX);
    }

    this.spawnLeafRuneBurst(impX, impYBase, 18, 225, true);
    this.spawnStarGlint(impX, impYBase, 16, '#ffffff', 0.34);
    for (let k = 0; k < 24; k++) {
      const ang = (k / 24) * Math.PI * 2 + 0.18;
      const spd = 140 + (k % 4) * 75;
      this.spawnArrowStarParticle(
        impX + this.facing * ((k % 3) * 14 - 12),
        impYBase + ((k % 5) - 2) * 10,
        Math.cos(ang) * spd + this.facing * 90,
        Math.sin(ang) * spd * 0.72,
        0.34 + (k % 3) * 0.08,
        k % 3 === 0 ? 'star' : 'spark',
        k % 2 === 0 ? '#fef08a' : '#6ee7b7',
        k % 3 === 0 ? 6 : 4,
        k % 2 === 0 ? '#fde047' : '#10b981'
      );
    }

    const hitSet = new Set();
    const allCandidates = [
      ...this._trueUltRootedTargets.map((e) => e.foe),
      ...targets
    ];
    for (const tFoe of allCandidates) {
      if (tFoe && !tFoe.isDead && !tFoe.isBenched && !hitSet.has(tFoe)) {
        hitSet.add(tFoe);
        tFoe.isRooted = false;
        tFoe.isCrouching = false;
        tFoe.isDeflecting = false;
        tFoe.stunTimer = 0;
        tFoe.takeDamage(720, this, true, 210, -210);
        const impY = (tFoe.groundY || this.groundY) - 96;
        this.spawnVfxAnim(4, tFoe.x, impY, 220, 220, 0.42, {
          flipX: false,
          inFront: true
        });
        this.fx.spawn('sylvanArrowImpactBurst', this._safeFxX(tFoe.x, game), this._safeFxY(impY), {
          flip: false,
          palette: SYLVAN_STARLIGHT_PALETTE,
          light: 1.32,
          extra: { aimAngle: this.facing === 1 ? 0 : Math.PI, isCrit: true }
        });
      }
    }
    if (hitSet.size === 0 && primaryTarget && !primaryTarget.isDead) {
      primaryTarget.isRooted = false;
      primaryTarget.isCrouching = false;
      primaryTarget.isDeflecting = false;
      primaryTarget.stunTimer = 0;
      primaryTarget.takeDamage(720, this, true, 210, -210);
    }
    this.releaseRootedTargets();
  }

  /**
   * REMADE SUPREME ULTIMATE (`state === 'TRUE_ULTIMATE'`, `3.04s`):
   * `ARROW OF YGGDRASIL: ASTRAL SUPERNOVA`
   * Ground coil + target root -> fast aerial backflip somersault (`Row 6` Celestial Greatbow
   * charging in hand) -> winged mid-air hover overdraw (`ASTRAL ARROW METAMORPHOSIS!`) ->
   * Sylvara transforms into the Colossal Glowing Great-Arrow (`312x136`), rockets straight
   * through the enemy (`700` Crit pierce), and re-materializes back into her normal form!
   */
  updateTrueUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;

    this.isInvulnerable = true;
    this.unstoppablePoise = true;
    this.hurtTimer = 0;
    this.isFlipVault = false;
    this.isCrouching = false;
    this.vx = 0;
    this.vy = 0;

    const targets = this.getEnemyTargets(enemy, game);
    const primaryTarget = enemy && !enemy.isDead ? enemy : targets[0] || null;

    if (t >= 0.03 && this._trueUltStep < 1) {
      this._trueUltStep = 1;
      this._trueUltRootedTargets = [];

      const advBounds =
        game?.adventure?.active && typeof game.adventure.getActiveStageBounds === 'function'
          ? game.adventure.getActiveStageBounds()
          : null;
      const stageMinX = advBounds ? advBounds.minX : 0;
      const stageMaxX = advBounds ? advBounds.maxX : ww;

      const anchorX = primaryTarget
        ? primaryTarget.isColossalBoss
          ? primaryTarget.anchorX || primaryTarget.x
          : Math.max(stageMinX + 48, Math.min(stageMaxX - 48, primaryTarget.x))
        : Math.max(stageMinX + 72, Math.min(stageMaxX - 72, this.x + this.facing * 320));
      this._trueUltTargetX = anchorX;

      const leftEdgeX = stageMinX + (advBounds ? 44 : 108);
      const rightEdgeX = stageMaxX - (advBounds ? 44 : 108);
      this._trueUltFarEdgeX =
        Math.abs(anchorX - leftEdgeX) >= Math.abs(rightEdgeX - anchorX) ? leftEdgeX : rightEdgeX;
      this._trueUltJumpStartX = this.x;

      if (Math.abs(anchorX - this.x) > 4) {
        this.facing = anchorX >= this.x ? 1 : -1;
      }

      if (game?.audio) {
        game.audio.play('zephyr_flip', this.x);
        game.audio.play('arrow_shoot', this.x);
      }
      game?.vfx?.triggerCinematicCutIn?.(this, this.trueUltName, '#34d399');
      if (game?.vfx) {
        game.vfx.spawnDamageText(
          this.x,
          this.y - 162,
          0,
          true,
          'WORLD-TREE ASTROLABE: BIND!',
          '#34d399'
        );
      }

      for (const foe of targets) {
        const lockX = foe.isColossalBoss
          ? foe.anchorX || foe.x
          : Math.max(stageMinX + 48, Math.min(stageMaxX - 48, foe.x));
        const lockY = foe.groundY || this.groundY;
        if (!foe.isColossalBoss) {
          if (foe.state !== 'IDLE' && foe.state !== 'TRUE_ULTIMATE') {
            foe.setState('IDLE');
          }
          foe.x = lockX;
          foe.y = lockY;
          foe.vx = 0;
          foe.vy = 0;
          foe.isRooted = true;
          foe.isCrouching = false;
          foe.isDeflecting = false;
          foe.iaidoCounterActive = false;
          foe.stunTimer = Math.max(foe.stunTimer || 0, 1.85);
          foe.crouchCooldown = Math.max(foe.crouchCooldown || 0, 0.25);
          foe.dodgeCooldown = Math.max(foe.dodgeCooldown || 0, 0.25);
          foe.dashCooldown = Math.max(foe.dashCooldown || 0, 0.25);
        }
        this._trueUltRootedTargets.push({ foe, lockX, lockY });

        this.fx.spawn('yggdrasilRootPrison', this._safeFxX(lockX, game), this._safeFxY(lockY), {
          flip: false,
          palette: SYLVAN_EMERALD_PALETTE,
          maxDuration: 1.84,
          light: 1.22,
          extra: { radius: 26, height: 45 }
        });
      }

      if (targets.length === 0) {
        this.fx.spawn('yggdrasilRootPrison', this._safeFxX(anchorX, game), this._safeFxY(this.groundY), {
          flip: false,
          palette: SYLVAN_EMERALD_PALETTE,
          maxDuration: 1.84,
          light: 1.22,
          extra: { radius: 26, height: 45 }
        });
      }
    }

    if (t < 2.06 && !this._trueUltPierced) {
      for (const entry of this._trueUltRootedTargets) {
        const foe = entry.foe;
        if (
          foe &&
          !foe.isDead &&
          !foe.isBenched &&
          !foe.isColossalBoss &&
          foe.state !== 'TRUE_ULTIMATE'
        ) {
          if (foe.state !== 'IDLE') {
            foe.setState('IDLE');
          }
          foe.x = entry.lockX;
          foe.y = entry.lockY;
          foe.vx = 0;
          foe.vy = 0;
          foe.isRooted = true;
          foe.isCrouching = false;
          foe.isDeflecting = false;
          foe.iaidoCounterActive = false;
          foe.stunTimer = Math.max(foe.stunTimer || 0, 0.25);
          foe.crouchCooldown = Math.max(foe.crouchCooldown || 0, 0.25);
          foe.dodgeCooldown = Math.max(foe.dodgeCooldown || 0, 0.25);
          foe.dashCooldown = Math.max(foe.dashCooldown || 0, 0.25);
        }
      }
    }

    // Phase 1 (`0.00..0.16s`): Ground Coil & World-Tree Root Bind (`Row 4 F00..F02`)
    if (t < 0.16) {
      this.y = this.groundY;
      this.cameraAirLift = 0;
      const fIdx = 120 + Math.min(2, Math.floor((t / 0.16) * 3));
      this.trueUltFrameOverride = fIdx;
      this._overrideFrameIdx = fIdx;
      return;
    }

    // Phase 2 (`0.16..0.84s`): Clean Aerial Backflip Somersault (`123..134`) -> Far Edge (`0` circular clutter!)
    if (t < 0.84) {
      if (this._trueUltStep < 2) {
        this._trueUltStep = 2;
        this._trueUltJumpStartX = this.x;
        if (game?.audio) game.audio.play('zephyr_flip', this.x);
        this.fx.spawn('zephyrGroundBurst', this._safeFxX(this.x, game), this._safeFxY(this.groundY), {
          palette: SYLVAN_STARLIGHT_PALETTE,
          light: 1.22,
          extra: { radius: 34 }
        });
        this.fx.spawn('astralWingPlume', this._safeFxX(this.x - this.facing * 16, game), this._safeFxY(this.y - 124), {
          follow: this,
          offsetX: -16,
          offsetY: -124,
          flip: this.facing < 0,
          palette: SYLVAN_STARLIGHT_PALETTE,
          maxDuration: 1.32,
          light: 1.28,
          extra: { wingSpan: 34 }
        });
        if (game?.vfx) {
          game.vfx.spawnDamageText(this.x, this.y - 138, 0, false, 'FAR-HORIZON VAULT!', '#fef08a');
        }
      }

      const jumpU = Math.min(1, Math.max(0, (t - 0.16) / 0.68));
      const easeX = 0.5 - 0.5 * Math.cos(Math.PI * jumpU);
      const settleBlend = 0.5 - 0.5 * Math.cos(Math.PI * jumpU);
      const arcPeak = 176 * Math.pow(Math.sin(Math.PI * jumpU), 1.35) * (1 - 0.18 * jumpU);
      const lift = 84 * settleBlend + arcPeak;

      this.x = this._trueUltJumpStartX + (this._trueUltFarEdgeX - this._trueUltJumpStartX) * easeX;
      this.y = this.groundY - lift;
      this.cameraAirLift = lift * 0.72;

      const jumpDir = Math.sign(this._trueUltFarEdgeX - this._trueUltJumpStartX) || -this.facing;
      const targetDir = this._trueUltTargetX >= this._trueUltFarEdgeX ? 1 : -1;
      this.facing = jumpU >= 0.46 ? targetDir : jumpDir;

      const flipSeqIdx = Math.min(11, Math.floor(jumpU * 12));
      const fIdx = 123 + flipSeqIdx;
      this.trueUltFrameOverride = fIdx;
      this._overrideFrameIdx = fIdx;

      if (t >= 0.48 && !this._trueUltCanopyBloomed) {
        this._trueUltCanopyBloomed = true;
        if (game?.audio) game.audio.play('archer_ult', this.x);
        if (game?.vfx) {
          game.vfx.spawnDamageText(
            this.x,
            this.y - 168,
            0,
            true,
            'YGGDRASIL CANOPY: BLOOM!',
            '#34d399'
          );
        }
        this.spawnLeafRuneBurst(this.x, this.y - 110, 14, 165, true);
      }

      this._trueUltMoteTimer += dt;
      if (this._trueUltMoteTimer >= 0.042) {
        this._trueUltMoteTimer = 0;
        const blendU = jumpU;
        const muzzleX = this.x + this.facing * (12 + 12 * blendU);
        const muzzleY = this.y - (78 + 44 * blendU);
        const spAng = t * 11.5;
        const spRad = 48 * (1 - 0.35 * blendU);
        this.spawnArrowStarParticle(
          muzzleX + Math.cos(spAng) * spRad,
          muzzleY + Math.sin(spAng) * spRad,
          -this.facing * 24,
          -26,
          0.32,
          'star',
          blendU > 0.5 ? '#fde047' : '#a7f3d0',
          5,
          '#10b981'
        );
      }

      this._afterimageTimer += dt;
      if (this._afterimageTimer >= 0.065) {
        this._afterimageTimer = 0;
        this.spawnAfterimage(this.x, this.y, this.facing, 4, fIdx - 120, 0.22);
      }
      return;
    }

    // Phase 3 (`0.84..1.52s`): Clear 10-Frame Winged Bow-Pull Animation (`frames 135..144`) + Converging Starlight!
    if (t < 1.52) {
      if (this._trueUltStep < 3) {
        this._trueUltStep = 3;
        this.x = this._trueUltFarEdgeX;
        this.y = this.groundY - 84;
        this.facing = this._trueUltTargetX >= this.x ? 1 : -1;
        this.spawnLeafRuneBurst(this.x, this.y - 114, 10, 155, true);
        if (game?.vfx) {
          game.vfx.spawnDamageText(
            this.x,
            this.y - 172,
            0,
            true,
            'ASTRAL ARROW METAMORPHOSIS!',
            '#fde047'
          );
        }
      }

      const drawU = Math.min(1, Math.max(0, (t - 0.84) / 0.68));
      const drawLift = 84 + 6 * Math.sin(drawU * Math.PI);
      this.x = this._trueUltFarEdgeX - this.facing * (4 * drawU);
      this.facing = this._trueUltTargetX >= this.x ? 1 : -1;
      this.y = this.groundY - drawLift;
      this.cameraAirLift = drawLift * 0.72;

      const fIdx = 135 + Math.min(9, Math.floor(drawU * 10));
      this.trueUltFrameOverride = fIdx;
      this._overrideFrameIdx = fIdx;

      // Converging emerald-gold starlight & sparkles drawn smoothly into the nocked arrow tip (0 circles blocking her!)
      this._trueUltMoteTimer += dt;
      if (this._trueUltMoteTimer >= 0.026) {
        this._trueUltMoteTimer = 0;
        const tipX = this.x + this.facing * (48 - 14 * drawU);
        const tipY = this.y - 110;
        for (let k = 0; k < 3; k++) {
          const spAng = t * 14.0 + k * 2.094;
          const spRad = (48 + k * 14) * (1 - 0.52 * drawU) + 12;
          const px = tipX + Math.cos(spAng) * spRad;
          const py = tipY + Math.sin(spAng) * (spRad * 0.68);
          this.spawnArrowStarParticle(
            px,
            py,
            (tipX - px) * 3.8,
            (tipY - py) * 3.8,
            0.24,
            k === 0 ? 'star' : 'spark',
            k === 0 ? '#ffffff' : drawU > 0.55 ? '#fef08a' : '#6ee7b7',
            k === 0 ? 5 : 4,
            drawU > 0.55 ? '#fde047' : '#10b981',
            tipX,
            tipY
          );
        }
        if (this.pixelLeafRunes.length < 48) {
          this.pixelLeafRunes.push({
            x: tipX + (Math.cos(t * 9) * 34),
            y: tipY + (Math.sin(t * 11) * 26),
            vx: (tipX - (tipX + Math.cos(t * 9) * 34)) * 2.2,
            vy: -24,
            phase: t * 12,
            isGold: Math.floor(t * 20) % 2 === 0,
            age: 0,
            maxLife: 0.28
          });
        }
      }
      return;
    }

    // Phase 4 (`1.52..2.20s`): SYLVARA BECOMES THE SLENDER RADIANT CELESTIAL GREAT-ARROW & PIERCES ENEMY!
    if (t < 2.20) {
      if (this._trueUltStep < 4) {
        this._trueUltStep = 4;
        this.fx?.stopByKey('astralWingPlume');
        this._isTransformedArrow = true;
        this._phaseThroughEnemy = true;
        this._trueUltBeamTimer = 0.84;
        if (Number.isFinite(this._trueUltFarEdgeX)) {
          this.x = this._trueUltFarEdgeX;
        }
        this._arrowStartX = this.x;
        if (Math.abs(this._trueUltTargetX - this.x) > 4) {
          this.facing = this._trueUltTargetX >= this.x ? 1 : -1;
        }
        const rawEndX = this._trueUltTargetX + this.facing * 175;
        let endX = this._clampArenaX(rawEndX, game, 96);
        if (!primaryTarget?.isColossalBoss) {
          if (this.facing > 0 && endX < this._trueUltTargetX + 48) {
            endX = this._clampArenaX(Math.max(endX, this._trueUltTargetX + 64), game, 44);
          } else if (this.facing < 0 && endX > this._trueUltTargetX - 48) {
            endX = this._clampArenaX(Math.min(endX, this._trueUltTargetX - 64), game, 44);
          }
        }
        this._arrowEndX = endX;
        this._trueUltPierced = false;

        if (game?.audio) {
          game.audio.play('archer_ult', this.x);
          game.audio.play('solar_beam', this.x);
        }
        this.heal(Math.round(this.maxHp * 0.14), 'WORLD-TREE GRACE');
        const launchY = this.groundY - 184;
        this.spawnLeafRuneBurst(this._arrowStartX, launchY, 14, 185, true);
        this.spawnStarGlint(this._arrowStartX, launchY, 14, '#ffffff', 0.28);
        for (let k = 0; k < 20; k++) {
          const ang = ((k / 20) - 0.5) * 1.45;
          const spd = 110 + (k % 5) * 42;
          this.spawnArrowStarParticle(
            this._arrowStartX + this.facing * ((k % 4) * 18 - 18),
            launchY + ((k % 5) - 2) * 8,
            -this.facing * Math.cos(ang) * spd,
            Math.sin(ang) * spd,
            0.34 + (k % 3) * 0.08,
            k % 3 === 0 ? 'star' : 'spark',
            k % 2 === 0 ? '#ffffff' : k % 3 === 1 ? '#fef08a' : '#6ee7b7',
            k % 3 === 0 ? 6 : 4,
            k % 2 === 0 ? '#fde047' : '#10b981'
          );
        }
      }

      const uFly = Math.min(1, Math.max(0, (t - 1.52) / 0.54));
      const easeFly = 1 - Math.pow(1 - uFly, 2.35);
      this.x = t < 2.06 ? this._arrowStartX + (this._arrowEndX - this._arrowStartX) * easeFly : this._arrowEndX;
      this.y = this.groundY - 92;
      this.cameraAirLift = 66;

      // Dense radiant particle shower streaming off the slender Great-Arrow tip, pinions & comet wake!
      this._trueUltMoteTimer += dt;
      if (this._trueUltMoteTimer >= 0.016) {
        this._trueUltMoteTimer = 0;
        const centerY = this.y - 92;
        const wave = Math.sin(t * 32) * 18;
        const tipSpX = this.x + this.facing * 168;
        const pinionSpX = this.x + this.facing * 14;
        const tailSpX = this.x - this.facing * 136;

        // 1. White-gold tip sparklers shedding along flight wake
        this.spawnArrowStarParticle(
          tipSpX,
          centerY + (Math.cos(t * 28) * 6),
          -this.facing * 195,
          wave * 1.5,
          0.46,
          'star',
          '#ffffff',
          6,
          '#fde047'
        );
        // 2. Twin swept light-pinion wingtip sparkles
        for (const side of [-1, 1]) {
          this.spawnArrowStarParticle(
            pinionSpX,
            centerY + side * (20 + Math.sin(t * 24 + side) * 6),
            -this.facing * 165,
            side * 28,
            0.52,
            Math.floor(t * 30) % 2 === 0 ? 'spark' : 'star',
            side > 0 ? '#6ee7b7' : '#fef08a',
            4,
            '#10b981'
          );
        }
        // 3. Shimmering comet tail stardust & golden-emerald embers
        this.spawnArrowStarParticle(
          tailSpX,
          centerY + wave * 0.85,
          -this.facing * 235,
          wave * 1.1,
          0.58,
          'spark',
          '#34d399',
          4,
          '#059669'
        );
        this.spawnArrowStarParticle(
          tailSpX - this.facing * 36,
          centerY - wave * 0.75,
          -this.facing * 210,
          -wave * 0.9,
          0.54,
          'star',
          '#fde047',
          5,
          '#10b981'
        );

        if (this.pixelLeafRunes.length < 64) {
          this.pixelLeafRunes.push({
            x: tailSpX + this.facing * 22,
            y: centerY + wave * 0.9,
            vx: -this.facing * 155,
            vy: wave * 1.2,
            phase: t * 14,
            isGold: Math.floor(t * 30) % 2 === 0,
            age: 0,
            maxLife: 0.36
          });
        }
      }

      if (!this._trueUltPierced && (uFly >= 0.42 || Math.abs(this.x - this._trueUltTargetX) <= 68)) {
        this._triggerTrueUltArrowPierceImpact(targets, primaryTarget, game);
      }
      return;
    }

    // Defensive guard in case a large dt skipped straight past Phase 4
    if (!this._trueUltPierced) {
      this._triggerTrueUltArrowPierceImpact(targets, primaryTarget, game);
    }

    // Phase 5 (`2.20..3.04s`): Re-Materialize Back Into Normal Elven Form & Smoothly Glide Down!
    if (this._trueUltStep < 5) {
      this._trueUltStep = 5;
      this._isTransformedArrow = false;
      this._phaseThroughEnemy = false;
      this._rematerializeFlash = 0.42;
      this.x = this._arrowEndX;
      this.y = this.groundY - 92;
      this.facing = this._trueUltTargetX >= this.x ? 1 : -1;
      const rematY = this.y - 92;
      this.spawnLeafRuneBurst(this.x, rematY, 16, 185, true);
      this.spawnStarGlint(this.x, rematY, 14, '#ffffff', 0.30);
      for (let k = 0; k < 16; k++) {
        const ang = (k / 16) * Math.PI * 2;
        const spd = 95 + (k % 3) * 45;
        this.spawnArrowStarParticle(
          this.x,
          rematY,
          Math.cos(ang) * spd,
          Math.sin(ang) * spd * 0.75 - 18,
          0.38,
          k % 2 === 0 ? 'star' : 'spark',
          k % 2 === 0 ? '#a7f3d0' : '#fef08a',
          k % 2 === 0 ? 5 : 4,
          '#10b981'
        );
      }
      if (game?.audio) game.audio.play('zephyr_flip', this.x);
    }

    const descU = Math.min(1, Math.max(0, (t - 2.20) / (this.trueUltDuration - 2.20)));
    const safeLandX = this._clampArenaX(this._arrowEndX, game, 84);
    this.x = this._arrowEndX + (safeLandX - this._arrowEndX) * descU;
    this.facing = this._trueUltTargetX >= this.x ? 1 : -1;

    let remLift = 0;
    let relIdx = 149;
    if (descU < 0.62) {
      remLift =
        descU < 0.16 ? 92 : 92 * Math.cos(((descU - 0.16) / 0.46) * (Math.PI * 0.5));
      relIdx = descU < 0.35 ? 145 : 146;
    } else {
      remLift = 0;
      const landU = (descU - 0.62) / 0.38;
      relIdx = 147 + Math.min(2, Math.floor(landU * 3));
    }
    this.y = this.groundY - remLift;
    this.cameraAirLift = remLift * 0.72;
    this.trueUltFrameOverride = relIdx;
    this._overrideFrameIdx = relIdx;

    if (t >= this.trueUltDuration) {
      this.y = this.groundY;
      this.vy = 0;
      this.cameraAirLift = 0;
      this.isInvulnerable = false;
      this.unstoppablePoise = false;
      this._phaseThroughEnemy = false;
      this._isTransformedArrow = false;
      this._rematerializeFlash = 0;
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      this._trueUltBeamTimer = 0;
      this.autoCooldown = Math.max(this.autoCooldown, 0.65);
      this.releaseRootedTargets();
      this.setState('IDLE');
    }
  }

  /**
   * Renders clean floor sanctuary glow & floating starlight motes during `TRUE_ULTIMATE` (0 circle/polygon rings!).
   */
  drawWorldTreeAndZodiacAstrolabe(ctx) {
    const inTrueUlt = this.state === 'TRUE_ULTIMATE';
    if (!inTrueUlt && this._trueUltBeamTimer <= 0) return;

    const t = inTrueUlt ? this.stateTimer : 1.82;
    if (t < 0.52) return;

    const fade = inTrueUlt
      ? Math.min(1, (t - 0.52) / 0.28) * Math.min(1, Math.max(0, (this.trueUltDuration - t) / 0.42))
      : Math.min(1, this._trueUltBeamTimer / 0.35);
    if (fade <= 0.02) return;

    const tx = Math.round((this._trueUltFarEdgeX ?? this.x) / 4) * 4;
    const gy = Math.round(this.groundY / 4) * 4;
    const zx = Math.round(this._trueUltTargetX / 2) * 2;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 4x4 Bayer-dithered Emerald-Gold Floor Sanctuary Glow (no rings or circles!)
    drawBayerSylvanHalo(ctx, tx, gy - 2, 148, 20, '#10b981', 0.17 * fade, 4);
    drawBayerSylvanHalo(ctx, tx, gy - 2, 84, 12, '#fde047', 0.15 * fade, 4);
    drawBayerSylvanHalo(ctx, zx, gy - 2, 120, 18, '#34d399', 0.16 * fade, 4);

    // Subtle ascending 4-point starlight motes above Sylvara's perch & target anchor
    for (let k = 0; k < 6; k++) {
      const floatUp = ((t * 48 + k * 24) % 120);
      const sx = tx + (k - 2.5) * 32 + Math.round(Math.sin(t * 4 + k) * 8);
      const sy = gy - 44 - floatUp;
      drawStarlightGlint(ctx, sx, sy, k % 2 === 0 ? 5 : 4, k % 2 === 0 ? '#fde047' : '#a7f3d0', fade * 0.72);
    }

    ctx.restore();
  }

  drawBehind(ctx) {
    this.drawWorldTreeAndZodiacAstrolabe(ctx);

    // Subtle 4x4 Bayer-dithered Huntress Floor Halo beneath Sylvara EX (alpha <= 0.14)
    if (!this.isDead && this.y >= this.groundY - 12) {
      drawBayerSylvanHalo(ctx, this.x, this.groundY - 2, 46, 12, '#34d399', 0.14, 4);
    }

    for (const z of this.brambleSnareZones) {
      const fade = Math.min(1, (z.maxLife - z.age) * 2.0);
      drawBayerSylvanHalo(ctx, z.x, z.groundY - 2, z.radius * 0.88, 18, '#10b981', 0.17 * fade, 4);
    }

    const sprites = this.getExSprites();
    const vfxSheet = PixelForge.ensureImage?.(sprites?.vfx) || sprites?.vfx;
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (const v of this.activeVfxAnims) {
      if (v.inFront) continue;
      const u = Math.min(1, Math.max(0, v.age / Math.max(0.05, v.maxLife)));
      const span = Math.max(1, (v.endFrame ?? 29) - (v.startFrame ?? 0) + 1);
      const col = Math.min(29, (v.startFrame ?? 0) + Math.floor(u * span));
      const sx = col * 208;
      const sy = v.row * 208;
      const alpha = u < 0.10 ? u / 0.10 : u > 0.80 ? (1 - u) / 0.20 : 1.0;

      ctx.save();
      ctx.translate(Math.round(v.x), Math.round(v.y));
      if (v.flipX) ctx.scale(-1, 1);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha * 0.94));
      ctx.drawImage(vfxSheet, sx, sy, 208, 208, -v.w * 0.5, -v.h * 0.5, v.w, v.h);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.max(0, Math.min(0.14, alpha * 0.12));
      ctx.drawImage(vfxSheet, sx, sy, 208, 208, -v.w * 0.5, -v.h * 0.5, v.w, v.h);
      ctx.restore();
    }
    ctx.restore();
  }

  drawForegroundOverlay(ctx, renderer = null) {
    const sprites = this.getExSprites();
    const sheet = PixelForge.ensureImage?.(sprites?.sheet) || sprites?.sheet;

    this.drawBehind(ctx);

    if (this.afterimages.length > 0 && sheet?.complete && sheet.naturalWidth) {
      for (let i = 0; i < this.afterimages.length; i++) {
        const img = this.afterimages[i];
        const alpha = Math.max(0, (1 - img.age / img.maxLife) * 0.44);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(Math.round(img.x / 2) * 2, Math.round((img.y + 4) / 2) * 2);
        ctx.scale(img.facing, 1);
        ctx.globalAlpha = alpha;
        PixelForge.drawSilhouetteFrame(ctx, sprites, img.frameIdx, 208, 208, '#34d399');
        ctx.restore();
      }
    }

    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    if (this.fx && !this.isDead) {
      this.fx.renderLayer(ctx, 'back', arenaCenterX, this.groundY, 0.96);
    }
  }

  drawUltimateForeground(ctx, renderer = null) {
    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    if (this.fx && !this.isDead) {
      this.fx.renderLayer(ctx, 'front', arenaCenterX, this.groundY, 0.98);
    }

    const sprites = this.getExSprites();
    const vfxSheet = PixelForge.ensureImage?.(sprites?.vfx) || sprites?.vfx;
    const hasVfx = Boolean(vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth);

    // Overdrive: ZEPHYR STARLOCK: TWELVE-STAR RAIN (12-Star Zodiac Crown + Raining Lance-Arrows!)
    if (this.state === 'ULTIMATE' && this.stateTimer < 1.65) {
      const crownX = Math.round(this._ultTargetX / 2) * 2;
      const crownY = Math.round((this.groundY - 296) / 2) * 2;
      drawBayerSylvanHalo(ctx, crownX, this.groundY - 2, 148, 20, '#34d399', 0.16, 4);
      for (let k = 0; k < 12; k++) {
        const a = this.stateTimer * 3.0 + (k * Math.PI) / 6;
        const sx = crownX + Math.cos(a) * 124;
        const sy = crownY + Math.sin(a) * 18;
        drawStarlightGlint(ctx, sx, sy, k % 3 === 0 ? 6 : 4, k % 2 === 0 ? '#fde047' : '#34d399', 0.90);
      }
    }
    for (const ln of this.starRainLances) {
      if (ln.impacted) continue;
      if (hasVfx && ln.ty - ln.y0 > Math.abs(ln.tx - ln.x0) * 0.85) {
        const lCol = (Math.floor(ln.age * 36) + ln.index * 2) % 12;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(Math.round(ln.x), Math.round(ln.y));
        ctx.scale(ln.tx < ln.x0 ? -1 : 1, 1);
        ctx.globalAlpha = 0.96;
        const sz = ln.isZenith ? 184 : 144;
        ctx.drawImage(vfxSheet, lCol * 208, 208, 208, 208, Math.round(-sz * 0.56), Math.round(-sz * 0.80), sz, sz);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.26;
        ctx.drawImage(vfxSheet, lCol * 208, 208, 208, 208, Math.round(-sz * 0.56), Math.round(-sz * 0.80), sz, sz);
        ctx.restore();
      }
      drawStarlightGlint(ctx, ln.x, ln.y, ln.isZenith ? 10 : 6, '#fde047', 0.96);
    }

    // Drifting Pixel Leaf-Runes, 4-Point Star-Glints & Additive Celestial Arrow Particles!
    for (const l of this.pixelLeafRunes) {
      const fade = 1 - l.age / l.maxLife;
      drawPixelLeafRune(ctx, l.x, l.y, l.phase, l.isGold, fade * 0.94);
    }
    for (const g of this.starlightGlints) {
      const fade = 1 - g.age / g.maxLife;
      drawStarlightGlint(ctx, g.x, g.y, g.arm, g.hex, fade * 0.96);
    }
    if (this._arrowStarParticles.length > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalCompositeOperation = 'lighter';
      for (const p of this._arrowStarParticles) {
        const u = Math.min(1, Math.max(0, p.age / Math.max(0.05, p.maxLife)));
        const fade = u < 0.14 ? u / 0.14 : (1 - u);
        if (fade <= 0.03) continue;
        const px = Math.round(p.x / 2) * 2;
        const py = Math.round(p.y / 2) * 2;
        const sz = Math.max(2, Math.round((p.size || 4) / 2) * 2);

        // Soft additive pixel halo + incandescent core
        ctx.fillStyle = p.glowHex || '#10b981';
        ctx.globalAlpha = fade * 0.24;
        ctx.fillRect(px - 4, py - 4, sz + 8, sz + 8);

        ctx.fillStyle = p.colorHex || '#6ee7b7';
        ctx.globalAlpha = fade * 0.56;
        ctx.fillRect(px - 2, py - 2, sz + 4, sz + 4);

        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = fade * 0.92;
        ctx.fillRect(px, py, Math.max(2, sz - 2), Math.max(2, sz - 2));

        if (p.kind === 'star') {
          drawStarlightGlint(ctx, px, py, sz, p.colorHex || '#fde047', fade * 0.94);
        }
      }
      ctx.restore();
    }
  }

  drawTransformedGreatArrow(ctx, vfxSheet, isReflection = false) {
    const t = this.state === 'TRUE_ULTIMATE' ? this.stateTimer : 1.85;
    const reflScale = isReflection ? 0.36 : 1.0;
    const hasVfx = Boolean(vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth);

    const startX = Number.isFinite(this._arrowStartX) ? this._arrowStartX : this.x - this.facing * 240;
    const endX = Number.isFinite(this._arrowEndX) ? this._arrowEndX : this.x;
    const flightSpan = endX - startX;
    const dir = Math.abs(flightSpan) > 1 ? Math.sign(flightSpan) : (this.facing >= 0 ? 1 : -1);

    let env = 1.0;
    if (!this._isTransformedArrow) {
      env = Math.min(1, Math.max(0, (this._trueUltBeamTimer || 0) / 0.28));
    } else if (t > 2.06) {
      env = Math.max(0.75, 1.0 - ((t - 2.06) / 0.14) * 0.25);
    }
    if (env <= 0.02) return;

    const arrowX = Math.round(this.x / 2) * 2;
    const arrowY = Math.round((this.y - 92) / 2) * 2;
    const wakeDist = Math.max(0, (this.x - startX) * dir);

    const animCol = Math.floor(t * 36) % 30;
    const sx = animCol * 208;
    const sy7 = 7 * 208;
    const coreSliceX = sx + 44;
    const coreSliceW = 112;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(arrowX, arrowY);
    ctx.scale(dir, 1);

    // 1. Sleek Tapering `'lighter'` Starlight Comet Wake + Twin Intertwining Helix Ribbons (`0` fat slabs!)
    if (wakeDist > 20) {
      if (hasVfx) {
        const wakeCount = Math.min(10, Math.ceil(wakeDist / coreSliceW));
        for (let i = 0; i < wakeCount; i++) {
          const segStartDist = i * coreSliceW;
          const remDist = wakeDist - segStartDist;
          if (remDist <= 2) break;
          const segW = Math.min(coreSliceW, Math.round(remDist / 2) * 2);
          if (segW < 4) break;
          const uSeg = i / Math.max(1, wakeCount);
          const taper = Math.max(0.20, 1.0 - uSeg * 0.80);
          const segH = Math.max(12, Math.round((36 * taper) / 2) * 2);
          const segLeft = -segStartDist - segW;
          const halfH = Math.round(segH * 0.5);
          const srcW = Math.max(4, Math.round((coreSliceW * segW) / coreSliceW));

          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = Math.max(0, Math.min(0.32, (1 - uSeg * 0.65) * 0.30 * env * reflScale));
          ctx.drawImage(vfxSheet, coreSliceX, sy7, srcW, 208, segLeft, -halfH, segW, segH);
        }
      }

      const spineSegs = Math.min(28, Math.max(6, Math.round(wakeDist / 22)));
      for (let s = 0; s < spineSegs; s++) {
        const u0 = s / spineSegs;
        const u1 = (s + 1) / spineSegs;
        const xLeft = -Math.round((wakeDist * u1) / 2) * 2;
        const xRight = -Math.round((wakeDist * u0) / 2) * 2;
        const spanW = Math.max(2, xRight - xLeft);
        const auraHalf = Math.max(2, Math.round((12 * (1 - u0 * 0.85)) / 2) * 2);
        const midHalf = Math.max(2, Math.round((7 * (1 - u0 * 0.88)) / 2) * 2);
        const coreHalf = Math.max(1, Math.round(3 * (1 - u0 * 0.82)));

        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.max(0, Math.min(0.28, (1 - u0 * 0.72) * 0.28 * env * reflScale));
        ctx.fillStyle = '#10b981';
        ctx.fillRect(xLeft, -auraHalf, spanW, auraHalf * 2);

        ctx.globalAlpha = Math.max(0, Math.min(0.46, (1 - u0 * 0.68) * 0.44 * env * reflScale));
        ctx.fillStyle = '#34d399';
        ctx.fillRect(xLeft, -midHalf, spanW, midHalf * 2);

        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = Math.max(0, Math.min(0.92, (1 - u0 * 0.72) * 0.90 * env * reflScale));
        ctx.fillStyle = '#fde047';
        ctx.fillRect(xLeft, -coreHalf, spanW, coreHalf * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(xLeft, -1, spanW, 2);
      }

      // Twin intertwining pixel-stepped starlight wind-helix filaments along comet tail
      const ribbonLen = Math.min(wakeDist, 440);
      ctx.globalCompositeOperation = 'lighter';
      for (let rx = -ribbonLen; rx <= -12; rx += 6) {
        const uWake = Math.abs(rx) / Math.max(1, ribbonLen);
        const amp = 15 * (1 - uWake * 0.65);
        const phase = t * 24 + rx * 0.042;
        const ryA = Math.round((Math.sin(phase) * amp) / 2) * 2;
        const ryB = Math.round((Math.sin(phase + Math.PI) * amp * 0.88) / 2) * 2;
        const rAlpha = Math.max(0.06, (1 - uWake * 0.82) * 0.76 * env * reflScale);

        ctx.globalAlpha = rAlpha * 0.35;
        ctx.fillStyle = '#10b981';
        ctx.fillRect(rx - 2, ryA - 2, 6, 6);
        ctx.fillRect(rx - 2, ryB - 2, 6, 6);

        ctx.globalAlpha = rAlpha;
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(rx, ryA, 4, 2);
        ctx.fillStyle = '#6ee7b7';
        ctx.fillRect(rx, ryB, 4, 2);
      }
    }

    if (!this._isTransformedArrow) {
      ctx.restore();
      return;
    }

    // 2. Soft Smooth `4x4` Bayer Shimmer Corona + Multi-Layer `'lighter'` Bloom Envelope (`372x56` slender profile!)
    const pulseTick = Math.floor(t * 28);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(0.24, 0.22 * env * reflScale);
    for (let gx = -188; gx <= 184; gx += 4) {
      const uNorm = (gx + 188) / 372;
      const envH =
        gx > 40
          ? Math.max(6, Math.round(30 * Math.pow(Math.max(0, 1 - (gx - 40) / 146), 1.25)))
          : Math.max(12, Math.round(14 + 16 * Math.sin(Math.min(1, uNorm / 0.62) * Math.PI * 0.5)));
      for (let gy = -32; gy <= 32; gy += 4) {
        const distNorm = Math.abs(gy) / envH;
        if (distNorm > 1.0) continue;
        const falloff = 1.0 - distNorm;
        const bx = (((gx >> 2) + pulseTick) & 3 + 4) & 3;
        const by = ((gy >> 2) & 3 + 4) & 3;
        if (falloff * 14.0 > BAYER_4X4[by][bx]) {
          ctx.fillStyle = (bx + by) % 2 === 0 ? '#34d399' : '#fef08a';
          ctx.fillRect(gx, gy, 4, 4);
        }
      }
    }

    // Soft additive spine bloom bands around the slender lance
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.22 * env * reflScale;
    ctx.fillStyle = '#059669';
    ctx.fillRect(-178, -14, 344, 28);
    ctx.globalAlpha = 0.34 * env * reflScale;
    ctx.fillStyle = '#34d399';
    ctx.fillRect(-174, -8, 346, 16);
    ctx.globalAlpha = 0.46 * env * reflScale;
    ctx.fillStyle = '#fde047';
    ctx.fillRect(-170, -4, 348, 8);

    // 3. Sleek, Needle-Sharp Luminous Celestial Lance-Arrow Silhouette (0 dark cartoon box outlines!)
    const drawArrowLayer = (passComposite, alphaScale) => {
      ctx.globalCompositeOperation = passComposite;
      ctx.globalAlpha = Math.max(0, Math.min(1, alphaScale * env * reflScale));

      // 3A. Delicate Swept Astral Tail Fletching (`x = -184 .. -108`, slender `16px` reach)
      for (const side of [-1, 1]) {
        for (let fx = -184; fx <= -108; fx += 2) {
          const p = (fx + 184) / 76;
          const outerY = Math.round((16 - p * 12) / 2) * 2;
          const innerY = Math.max(2, outerY - 4);
          const span = Math.max(2, outerY - innerY);
          const topY = side < 0 ? -outerY : innerY;

          ctx.fillStyle = '#34d399';
          ctx.fillRect(fx, topY, 2, span);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(fx, side < 0 ? topY : topY + span - 2, 2, 2);
        }
      }

      // 3B. Razor-Sleek Illuminated Core Shaft (`x = -172 .. +60`, max `10px` height -> `2px` white spine)
      ctx.fillStyle = '#10b981';
      ctx.fillRect(-172, -4, 232, 8);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(-168, -2, 228, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-164, -1, 224, 2);

      // Subtle diamond light nodes along shaft (no clunky vertical blocks)
      for (const nodeX of [-92, -32]) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(nodeX - 4, -2, 8, 4);
        ctx.fillStyle = '#a7f3d0';
        ctx.fillRect(nodeX - 2, -6, 4, 12);
      }

      // 3C. Graceful Swept Elven Light-Pinions (`2` sleek curved pairs, `<= 48px` total wingspan)
      for (const side of [-1, 1]) {
        // Primary front light-pinions (`x = -46 .. +58`, sweeping back sharply at `~14 deg`)
        for (let wx = -46; wx <= 58; wx += 2) {
          const pw = (58 - wx) / 104;
          const outerY = Math.min(24, Math.round((4 + Math.pow(pw, 1.28) * 20) / 2) * 2);
          const bladeSpan = wx > 34 ? 4 : 6;
          const wTop = side < 0 ? -outerY : Math.max(2, outerY - bladeSpan);

          ctx.fillStyle = '#34d399';
          ctx.fillRect(wx, wTop, 2, bladeSpan);
          ctx.fillStyle = '#fde047';
          ctx.fillRect(wx, side < 0 ? wTop + 2 : wTop, 2, Math.max(2, bladeSpan - 2));
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(wx, side < 0 ? wTop : wTop + bladeSpan - 2, 2, 2);
        }
        // Gossamer secondary starlight feather-streaks (`x = -96 .. -26`)
        for (let wx = -96; wx <= -26; wx += 2) {
          const pw = (-26 - wx) / 70;
          const outerY = Math.min(16, Math.round((3 + Math.pow(pw, 1.15) * 13) / 2) * 2);
          const wTop = side < 0 ? -outerY : Math.max(2, outerY - 2);
          ctx.fillStyle = '#a7f3d0';
          ctx.fillRect(wx, wTop, 2, 2);
        }
      }

      // 3D. Elongated `128px` Crystalline Needle-Lance Broadhead (`x = +56 .. +184`, sleek `28px -> 2px` taper)
      for (let hx = 56; hx <= 182; hx += 2) {
        const uh = (hx - 56) / 128;
        const halfH = Math.max(1, Math.round(14 * Math.pow(1 - uh, 1.38)));
        const hollowCut = hx < 80 ? Math.round(((80 - hx) / 24) * 5) : 0;

        if (hollowCut >= 2 && halfH > hollowCut + 2) {
          for (const side of [-1, 1]) {
            const bTop = side < 0 ? -halfH : hollowCut;
            const bSpan = Math.max(2, halfH - hollowCut);
            ctx.fillStyle = '#34d399';
            ctx.fillRect(hx, bTop, 2, bSpan);
            const gSpan = Math.max(2, Math.round(bSpan * 0.65));
            ctx.fillStyle = '#fde047';
            ctx.fillRect(hx, side < 0 ? bTop + (bSpan - gSpan) : bTop, 2, gSpan);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(hx, side < 0 ? bTop : bTop + bSpan - 2, 2, 2);
          }
        } else {
          ctx.fillStyle = '#34d399';
          ctx.fillRect(hx, -halfH, 2, halfH * 2);
          const goldHalf = Math.max(1, Math.round(halfH * 0.68));
          ctx.fillStyle = '#fde047';
          ctx.fillRect(hx, -goldHalf, 2, goldHalf * 2);
          const whiteHalf = Math.max(1, Math.round(halfH * 0.36));
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(hx, -whiteHalf, 2, whiteHalf * 2);
        }
      }
      // Razor incandescent needle tip (`+182 .. +186`)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(182, -1, 4, 2);
    };

    drawArrowLayer('source-over', 0.94);
    drawArrowLayer('lighter', 0.42);

    // 4. Twinkling Starlight Flares at Tip, Heart & Nock!
    drawStarlightGlint(ctx, 180, 0, 14, '#6ee7b7', 0.88 * env * reflScale);
    drawStarlightGlint(ctx, 178, 0, 10, '#fde047', 0.96 * env * reflScale);
    drawStarlightGlint(ctx, 178, 0, 6, '#ffffff', 0.98 * env * reflScale);
    drawStarlightGlint(ctx, 56, 0, 9, '#a7f3d0', 0.90 * env * reflScale);
    drawStarlightGlint(ctx, -168, 0, 6, '#fde047', 0.84 * env * reflScale);

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  draw(ctx, isReflection = false, renderer = null) {
    const sprites = this.getExSprites();
    if (!sprites) return;

    const vfxSheet = PixelForge.ensureImage?.(sprites?.vfx) || sprites?.vfx;

    if (this._isTransformedArrow) {
      // Sylvara's humanoid body has transformed into the Colossal Great-Arrow!
      this.drawTransformedGreatArrow(ctx, vfxSheet, isReflection);
    } else {
      ctx.save();
      ctx.imageSmoothingEnabled = false;

      const w = 208;
      const h = 208;
      const groundPlantOffset = 4;
      ctx.translate(Math.round(this.x), Math.round(this.y + groundPlantOffset));
      ctx.scale(this.facing, 1);

      const animPhase = this.state === 'WALK' ? this.walkPhase : this.windPhase;
      PixelForge.drawSheetFrame(ctx, sprites, this, w, h, animPhase, isReflection, renderer);

      if (this.hitFlash > 0 && !isReflection) {
        const frameIdx = PixelForge.getFrameIndex(this, animPhase);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.5;
        PixelForge.drawGhostFrame(ctx, sprites, frameIdx, w, h);
      }

      if (this._rematerializeFlash > 0 && !isReflection) {
        const frameIdx = PixelForge.getFrameIndex(this, animPhase);
        const flashFrac = Math.min(1, Math.max(0, this._rematerializeFlash / 0.42));
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(0.75, flashFrac * 0.72);
        PixelForge.drawGhostFrame(ctx, sprites, frameIdx, w, h);
        PixelForge.drawSilhouetteFrame(
          ctx,
          sprites,
          frameIdx,
          w,
          h,
          flashFrac > 0.5 ? '#fde047' : '#a7f3d0'
        );
      }

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.restore();

      if (this._trueUltBeamTimer > 0) {
        this.drawTransformedGreatArrow(ctx, vfxSheet, isReflection);
      }
    }

    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;

    const reflScale = isReflection ? 0.38 : 1.0;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    for (const v of this.activeVfxAnims) {
      if (!isReflection && !v.inFront) continue;
      const u = Math.min(1, Math.max(0, v.age / Math.max(0.05, v.maxLife)));
      const span = Math.max(1, (v.endFrame ?? 29) - (v.startFrame ?? 0) + 1);
      const col = Math.min(29, (v.startFrame ?? 0) + Math.floor(u * span));
      const sx = col * 208;
      const sy = v.row * 208;
      const alpha = u < 0.08 ? u / 0.08 : u > 0.78 ? (1 - u) / 0.22 : 1.0;

      ctx.save();
      ctx.translate(Math.round(v.x), Math.round(v.y));
      if (v.flipX) ctx.scale(-1, 1);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha * 0.96 * reflScale));
      ctx.drawImage(vfxSheet, sx, sy, 208, 208, -v.w * 0.5, -v.h * 0.5, v.w, v.h);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.max(0, Math.min(0.28, alpha * 0.24 * reflScale));
      ctx.drawImage(vfxSheet, sx, sy, 208, 208, -v.w * 0.5, -v.h * 0.5, v.w, v.h);
      ctx.restore();
    }

    // Overdrive (`ULTIMATE`): Glowing 156x156 Row 6 Charging Bow-Aura during Flip-Leap (`0.00..0.32s`)
    // & Luminous Bow-Aura during 180-deg Overhead Starfall Vault (`0.32..1.58s`)
    if (this.state === 'ULTIMATE' && this.stateTimer < 1.58) {
      const sy = 6 * 208;
      if (this.stateTimer < 0.32) {
        const leapU = Math.min(1, Math.max(0, this.stateTimer / 0.32));
        const col = Math.min(29, Math.floor(leapU * 30));
        const sx = col * 208;
        const bowX = Math.round(this.x + this.facing * 20);
        const bowY = Math.round(this.y - 88);

        ctx.save();
        ctx.translate(bowX, bowY);
        ctx.scale(this.facing, 1);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.84 * reflScale;
        ctx.drawImage(vfxSheet, sx, sy, 208, 208, -78, -78, 156, 156);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.36 * reflScale;
        ctx.drawImage(vfxSheet, sx, sy, 208, 208, -78, -78, 156, 156);
        ctx.restore();
      } else {
        const vaultU = Math.min(1, Math.max(0, (this.stateTimer - 0.32) / 1.26));
        const col = Math.min(29, Math.floor(vaultU * 30));
        const sx = col * 208;
        const bowX = Math.round(this.x + this.facing * 16);
        const bowY = Math.round(this.y - 78);

        ctx.save();
        ctx.translate(bowX, bowY);
        ctx.scale(this.facing, 1);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.56 * reflScale;
        ctx.drawImage(vfxSheet, sx, sy, 208, 208, -64, -64, 128, 128);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.34 * reflScale;
        ctx.drawImage(vfxSheet, sx, sy, 208, 208, -64, -64, 128, 128);
        ctx.restore();
      }
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
