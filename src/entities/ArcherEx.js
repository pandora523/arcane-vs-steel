import { Fighter } from './Fighter.js?v=30fps119';
import { PixelForge } from '../engine/PixelForge.js?v=30fps119';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps119';
import {
  SYLVAN_EFFECT_REGISTRY,
  SYLVAN_EMERALD_PALETTE,
  SYLVAN_STARLIGHT_PALETTE
} from '../engine/shaders/sylvanShaders.js?v=30fps119';

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
      maxHp: 3680,
      attackRange: 520,
      moveSpeed: 192,
      autoInterval: 0.88,
      lightColor: 'rgba(16, 185, 129, 1)',
      primaryColor: '#34d399',
      hasTrueUltimate: true,
      trueUltName: 'ARROW OF YGGDRASIL: ASTRAL SUPERNOVA',
      trueUltDuration: 2.88
    });

    this.heroId = 'archer_ex';
    this.secondaryColor = '#fde047';
    this.theme = 'emerald';
    this.deathSfx = 'death_archer';
    this.skillMaxCooldown = 4.00;
    this.skillDuration = 1.06;
    this.autoDuration = BEAT_DURATIONS[0];
    this._postFlurryInterval = 1.24;

    this.skillName = 'STARWOOD CONSTELLATION VOLLEY';
    this.ultName = 'ZEPHYR STARLOCK: TWELVE-STAR RAIN';
    this.ultSub = 'ASTRAL LIGHT-WING VAULT & ZODIAC BARRAGE';
    this.ultDuration = 2.04;

    this.hasTrueUltimate = true;
    this.trueUltName = 'ARROW OF YGGDRASIL: ASTRAL SUPERNOVA';
    this.trueUltSub = 'WORLD-TREE CANOPY & STARLIGHT HORIZON LANCE';
    this.trueUltDuration = 2.88;

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
      const sheet = new Image();
      sheet.src = 'assets/sprites/archer_ex_sheet.png?v=30fps119';
      const vfx = new Image();
      vfx.src = 'assets/sprites/archer_ex_vfx.png?v=30fps119';
      const portrait = new Image();
      portrait.src = 'assets/sprites/archer_ex_portrait.png?v=30fps119';
      assets.archer_ex = {
        sheet,
        vfx,
        portrait,
        cellW: 320,
        cellH: 240,
        anchorX: 112,
        anchorY: 230
      };
    } else if (assets.archer_ex.vfx) {
      const vfxImg = assets.archer_ex.vfx;
      const curSrc = vfxImg._deferredSrc || vfxImg._origSrc || vfxImg.src || '';
      if (typeof curSrc === 'string' && !curSrc.includes('?v=30fps119')) {
        const freshVfxSrc = 'assets/sprites/archer_ex_vfx.png?v=30fps119';
        vfxImg._origSrc = freshVfxSrc;
        if (vfxImg._deferredSrc) {
          vfxImg._deferredSrc = freshVfxSrc;
        } else {
          assets.archer_ex.vfx.src = freshVfxSrc;
        }
      }
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
      prevState === 'AUTO_ATTACK' &&
      newState !== 'AUTO_ATTACK' &&
      newState !== 'JUMP' &&
      newState !== 'DODGE' &&
      newState !== 'ULTIMATE' &&
      newState !== 'TRUE_ULTIMATE'
    ) {
      this.y = this.groundY;
      this.vy = 0;
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
    this.heal(13, 'SYLVAN BREEZE');
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
    if (!isManualPlayer && enemy && !enemy.isDead && (this.state === 'IDLE' || this.state === 'WALK')) {
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
            damage: 24,
            type: 'arrow'
          });
        }
      }
    }

    // Beat 2 (`t >= 0.36s`): Starlight Grace Heal + 3 Direct Horizontal Fan-Spread Wind Arrows
    if (t >= 0.36 && !this.didActionFrame) {
      this.didActionFrame = true;
      this.vx -= this.facing * 58;
      this.heal(22, 'STARLIGHT GRACE');
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
            damage: 32,
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
            damage: 26,
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
    this._overrideFrameIdx = t < 1.80 ? 135 : 136;

    if (t >= this.ultDuration) {
      this.isInvulnerable = false;
      this.unstoppablePoise = false;
      this._overrideFrameIdx = null;
      this.starRainLances = [];
      this.cameraAirLift = 0;
      this.setState('IDLE');
    }
  }

  /**
   * REMADE SUPREME ULTIMATE (`state === 'TRUE_ULTIMATE'`, `4.55s`):
   * `ARROW OF YGGDRASIL: ASTRAL SUPERNOVA`
   * Manifests a luminous pixel-art World-Tree Canopy & Zodiac Target Astrolabe before firing
   * a multi-band Emerald-Gold Starlight Horizon Lance (`tipSliceW = 44`) with drifting pixel
   * leaf-runes & star-glints (`0` blurry radial whiteout)!
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
          foe.stunTimer = Math.max(foe.stunTimer || 0, 1.80);
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
        this.spawnVfxAnim(2, lockX, lockY - 82, 232, 232, 1.72, {
          flipX: false,
          inFront: false
        });
        this.spawnVfxAnim(5, lockX, lockY - 72, 340, 220, 1.72, {
          flipX: false,
          inFront: false
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

    if (t < 1.72) {
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

    // Phase 1 (`0.00..0.18s`): Fast Astral Wing-Unfurl & World-Tree Root Bind (`Row 4 F00..F02`)
    if (t < 0.18) {
      this.y = this.groundY;
      this.cameraAirLift = 0;
      const fIdx = 120 + Math.min(2, Math.floor((t / 0.18) * 3));
      this.trueUltFrameOverride = fIdx;
      this._overrideFrameIdx = fIdx;
      return;
    }

    // Phase 2 (`0.18..1.02s`, `0.84s` fast aerial somersault): Snappy High-Arc Bow-Charge Somersault -> Winged Hover!
    if (t < 1.02) {
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
          maxDuration: 1.56,
          light: 1.28,
          extra: { wingSpan: 34 }
        });
        this.fx.spawn('sylvanBowDrawVortex', this._safeFxX(this.x + this.facing * 26, game), this._safeFxY(this.y - 96), {
          follow: this,
          offsetX: 26,
          offsetY: -96,
          palette: SYLVAN_STARLIGHT_PALETTE,
          maxDuration: 1.56,
          light: 1.26,
          extra: { radius: 28 }
        });
        if (game?.vfx) {
          game.vfx.spawnDamageText(this.x, this.y - 138, 0, false, 'FAR-HORIZON VAULT!', '#fef08a');
        }
      }

      const jumpU = Math.min(1, Math.max(0, (t - 0.18) / 0.84));
      const easeX = 0.5 - 0.5 * Math.cos(Math.PI * jumpU);
      const settleBlend = 0.5 - 0.5 * Math.cos(Math.PI * jumpU);
      const arcPeak = 176 * Math.pow(Math.sin(Math.PI * jumpU), 1.35) * (1 - 0.18 * jumpU);
      const lift = 86 * settleBlend + arcPeak;

      this.x = this._trueUltJumpStartX + (this._trueUltFarEdgeX - this._trueUltJumpStartX) * easeX;
      this.y = this.groundY - lift;
      this.cameraAirLift = lift * 0.72;

      const jumpDir = Math.sign(this._trueUltFarEdgeX - this._trueUltJumpStartX) || -this.facing;
      const targetDir = this._trueUltTargetX >= this._trueUltFarEdgeX ? 1 : -1;
      this.facing = jumpU >= 0.46 ? targetDir : jumpDir;

      // Fast aerial somersault frames `123..134` gliding into airborne hover frames `137..141`
      const flipHoverSeq = [123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 137, 138, 139, 140, 141];
      const seqIdx = Math.min(flipHoverSeq.length - 1, Math.floor(jumpU * flipHoverSeq.length));
      const fIdx = flipHoverSeq[seqIdx];
      this.trueUltFrameOverride = fIdx;
      this._overrideFrameIdx = fIdx;

      if (t >= 0.52 && !this._trueUltCanopyBloomed) {
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

      // Spiraling starlight glints & leaf-runes orbiting & converging on her charging bow during the fast flip
      this._trueUltMoteTimer += dt;
      if (this._trueUltMoteTimer >= 0.045) {
        this._trueUltMoteTimer = 0;
        const blendU = Math.min(1, Math.max(0, (t - 0.18) / 0.84));
        const muzzleX = this.x + this.facing * (12 + 12 * blendU);
        const muzzleY = this.y - (78 + 44 * blendU);
        const spAng = t * 11.5;
        const spRad = 54 * (1 - 0.35 * blendU);
        this.spawnStarGlint(
          muzzleX + Math.cos(spAng) * spRad,
          muzzleY + Math.sin(spAng) * spRad,
          5 + Math.round(blendU * 3),
          blendU > 0.5 ? '#fde047' : '#a7f3d0',
          0.22
        );
        this.pixelLeafRunes.push({
          x: muzzleX - Math.cos(spAng) * spRad,
          y: muzzleY - Math.sin(spAng) * spRad,
          vx: Math.cos(spAng) * 110 - Math.sin(spAng) * 48,
          vy: Math.sin(spAng) * 110 + Math.cos(spAng) * 48,
          phase: spAng,
          isGold: Math.floor(t * 16) % 2 === 0,
          age: 0,
          maxLife: 0.34
        });
      }

      this._afterimageTimer += dt;
      if (this._afterimageTimer >= 0.065 && fIdx <= 134) {
        this._afterimageTimer = 0;
        this.spawnAfterimage(this.x, this.y, this.facing, 4, fIdx - 120, 0.22);
      }
      return;
    }

    // Phase 3 (`1.02s .. 1.72s` -- `0.70s` Crisp Winged Mid-Air Hover Overdraw + World-Tree Canopy + Zodiac Astrolabe!)
    if (t < 1.72) {
      if (this._trueUltStep < 3) {
        this._trueUltStep = 3;
        this.x = this._trueUltFarEdgeX;
        this.facing = this._trueUltTargetX >= this.x ? 1 : -1;
        this.spawnLeafRuneBurst(this.x, this.y - 118, 12, 165, true);
      }

      this.x = this._trueUltFarEdgeX;
      this.facing = this._trueUltTargetX >= this.x ? 1 : -1;
      const hoverT = t - 1.02;
      this.y = this.groundY - 86 + Math.sin(hoverT * 4.5) * 5;
      this.cameraAirLift = (this.groundY - this.y) * 0.72;

      const drawU = Math.min(1, Math.max(0, (t - 1.02) / 0.70));
      const fIdx = 140 + Math.min(4, Math.floor(drawU * 5));
      this.trueUltFrameOverride = fIdx;
      this._overrideFrameIdx = fIdx;

      this._trueUltMoteTimer += dt;
      if (this._trueUltMoteTimer >= 0.06) {
        this._trueUltMoteTimer = 0;
        const muzzleX = this.x + this.facing * 24;
        const muzzleY = this.y - 122;
        const spAng = t * 12.0;
        const spRad = 44 * (1 - 0.55 * drawU);
        this.spawnStarGlint(
          muzzleX + Math.cos(spAng) * spRad,
          muzzleY + Math.sin(spAng) * spRad,
          6 + Math.round(drawU * 4),
          '#fde047',
          0.20
        );
        this.spawnLeafRuneBurst(muzzleX + this.facing * 12, muzzleY, 2, 105, true);
      }
      return;
    }

    // Phase 4 (`t >= 1.72s`): Multi-Band Emerald-Gold Starlight Horizon Lance Release (0 blurry whiteout!)
    if (this._trueUltStep < 4) {
      this._trueUltStep = 4;
      this._trueUltDescStartLift = Math.max(0, this.groundY - this.y);
      this._trueUltBeamTimer = 0.92;

      game?.renderer?.triggerImpactFrame?.(this.x, this.y - 122, 0.08, 'emerald');
      game?.renderer?.triggerShake?.(24, 0.62);
      game?.renderer?.triggerAberration?.(14);
      game?.renderer?.triggerHitStop?.(0.085);

      if (game?.audio) {
        game.audio.play('archer_ult', this.x);
        game.audio.play('solar_beam', this.x);
        game.audio.play('arrow_hit', this._trueUltTargetX);
      }

      this.heal(Math.round(this.maxHp * 0.14), 'WORLD-TREE GRACE');
      this.spawnLeafRuneBurst(this._trueUltTargetX, this.groundY - 110, 18, 225, true);
      this.spawnStarGlint(this._trueUltTargetX, this.groundY - 110, 16, '#ffffff', 0.34);

      const startX = this._safeFxX(this.x + this.facing * 36, game);
      const startY = this._safeFxY(this.y - 122);
      const endX = this._safeFxX(this.facing >= 0 ? ww - 92 : 92, game);
      this.fx.spawn('astralHurricaneLance', startX, startY, {
        flip: false,
        palette: SYLVAN_STARLIGHT_PALETTE,
        light: 1.32,
        extra: {
          dx: (endX - startX) / 3,
          dy: 0,
          width: 9.0
        }
      });

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
          tFoe.takeDamage(700, this, true, 210, -210);
          const impY = (tFoe.groundY || this.groundY) - 96;
          this.spawnVfxAnim(3, tFoe.x, impY, 216, 216, 0.44, {
            flipX: this.facing < 0,
            inFront: true
          });
          this.spawnVfxAnim(4, tFoe.x, impY, 224, 224, 0.42, {
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
        primaryTarget.takeDamage(700, this, true, 210, -210);
      }
      this.releaseRootedTargets();
    }

    const descU = Math.min(1, Math.max(0, (t - 1.72) / (this.trueUltDuration - 1.72)));
    const startLift = this._trueUltDescStartLift ?? 86;
    const remLift =
      descU < 0.36 ? startLift : startLift * Math.cos(((descU - 0.36) / 0.64) * (Math.PI * 0.5));
    this.y = this.groundY - remLift;
    this.cameraAirLift = remLift * 0.72;
    const relIdx = 145 + Math.min(4, Math.floor(descU * 5));
    this.trueUltFrameOverride = relIdx;
    this._overrideFrameIdx = relIdx;

    if (t >= this.trueUltDuration) {
      this.y = this.groundY;
      this.vy = 0;
      this.cameraAirLift = 0;
      this.isInvulnerable = false;
      this.unstoppablePoise = false;
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      this._trueUltBeamTimer = 0;
      this.autoCooldown = Math.max(this.autoCooldown, 0.65);
      this.releaseRootedTargets();
      this.setState('IDLE');
    }
  }

  /**
   * Renders a luminous pixel-art World-Tree Canopy behind Sylvara EX + Zodiac Target Astrolabe over `_trueUltTargetX`!
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

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. 4x4 Bayer-dithered Emerald-Gold World-Tree Floor Sanctuary Halo
    drawBayerSylvanHalo(ctx, tx, gy - 2, 164, 24, '#10b981', 0.17 * fade, 4);
    drawBayerSylvanHalo(ctx, tx, gy - 2, 98, 14, '#fde047', 0.15 * fade, 4);

    // 2. Luminous Row 5 Yggdrasil World-Tree & Sagittarius Constellation Canopy Seal (zero boxy fillRect slabs!)
    const sprites = this.getExSprites();
    const vfxSheet = PixelForge.ensureImage?.(sprites?.vfx) || sprites?.vfx;
    if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      const canopyCol = Math.floor(t * 24) % 30;
      const sx = canopyCol * 208;
      const sy = 5 * 208;
      ctx.save();
      ctx.translate(tx, gy - 152);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = Math.min(0.92, fade * 0.88);
      ctx.drawImage(vfxSheet, sx, sy, 208, 208, -168, -168, 336, 336);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(0.32, fade * 0.28);
      ctx.drawImage(vfxSheet, sx, sy, 208, 208, -168, -168, 336, 336);
      ctx.restore();
    }

    // 8 Twinkling Star-Fruits orbiting the World-Tree Canopy
    for (let k = 0; k < 8; k++) {
      const sx = tx + ((k - 3.5) * 34);
      const sy = gy - 236 - (k % 3) * 18;
      drawStarlightGlint(ctx, sx, sy, 4 + (k % 2) * 2, k % 2 === 0 ? '#fde047' : '#a7f3d0', fade * 0.85);
    }

    // 3. Rotating 12-Node Pixel Zodiac Target Astrolabe over `_trueUltTargetX`!
    const zx = Math.round(this._trueUltTargetX / 2) * 2;
    const zy = Math.round((this.groundY - 96) / 2) * 2;
    drawBayerSylvanHalo(ctx, zx, this.groundY - 2, 136, 20, '#34d399', 0.16 * fade, 4);

    let prevNx = null;
    let prevNy = null;
    let firstNx = null;
    let firstNy = null;
    for (let k = 0; k < 12; k++) {
      const ang = t * 1.8 + (k * Math.PI) / 6;
      const r = k % 2 === 0 ? 86 : 62;
      const nx = zx + Math.cos(ang) * r;
      const ny = zy + Math.sin(ang) * (r * 0.78);
      if (prevNx !== null) {
        drawPixelConstellationThread(ctx, prevNx, prevNy, nx, ny, '#6ee7b7', fade * 0.68);
      } else {
        firstNx = nx;
        firstNy = ny;
      }
      prevNx = nx;
      prevNy = ny;
      drawStarlightGlint(ctx, nx, ny, k % 3 === 0 ? 6 : 4, k % 2 === 0 ? '#fde047' : '#34d399', fade * 0.92);
    }
    if (prevNx !== null && firstNx !== null) {
      drawPixelConstellationThread(ctx, prevNx, prevNy, firstNx, firstNy, '#6ee7b7', fade * 0.68);
    }
    drawStarlightGlint(ctx, zx, zy, 10, '#ffffff', fade * 0.95);

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

    // Drifting Pixel Leaf-Runes & 4-Point Star-Glints!
    for (const l of this.pixelLeafRunes) {
      const fade = 1 - l.age / l.maxLife;
      drawPixelLeafRune(ctx, l.x, l.y, l.phase, l.isGold, fade * 0.94);
    }
    for (const g of this.starlightGlints) {
      const fade = 1 - g.age / g.maxLife;
      drawStarlightGlint(ctx, g.x, g.y, g.arm, g.hex, fade * 0.96);
    }
  }

  draw(ctx, isReflection = false, renderer = null) {
    const sprites = this.getExSprites();
    if (!sprites) return;

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

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();

    const vfxSheet = PixelForge.ensureImage?.(sprites?.vfx) || sprites?.vfx;
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

    // Supreme Ultimate (`0.18s .. 1.72s`): Colossal Drawn Celestial Greatbow (`Row 6`, 168x168 -> 280x280)
    // growing & charging right in her hands during the fast somersault and winged mid-air hover!
    if (this.state === 'TRUE_ULTIMATE' && this.stateTimer >= 0.18 && this.stateTimer < 1.72) {
      const chargeU = Math.min(1, Math.max(0, (this.stateTimer - 0.18) / (1.72 - 0.18)));
      const blendU = Math.min(1, Math.max(0, (this.stateTimer - 0.18) / 0.84));
      const col = Math.min(29, Math.floor(chargeU * 30));
      const sx = col * 208;
      const sy = 6 * 208;
      const bowSize = Math.round((168 + (280 - 168) * Math.min(1, chargeU * 1.08)) / 2) * 2;
      const halfBow = Math.round(bowSize * 0.5);
      const bowX = Math.round(this.x + this.facing * (12 + 12 * blendU));
      const bowY = Math.round(this.y - (78 + 44 * blendU));

      ctx.save();
      ctx.translate(bowX, bowY);
      ctx.scale(this.facing, 1);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = (0.78 + 0.18 * chargeU) * reflScale;
      ctx.drawImage(vfxSheet, sx, sy, 208, 208, -halfBow, -halfBow, bowSize, bowSize);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (0.24 + 0.14 * chargeU) * reflScale;
      ctx.drawImage(vfxSheet, sx, sy, 208, 208, -halfBow, -halfBow, bowSize, bowSize);
      ctx.restore();
    }

    // Supreme Ultimate Phase 4 (`this._trueUltBeamTimer > 0`): Full-Screen Row 7 Supernova Dragon-Arrow Beam (`coreSliceW = 112`, `tipSliceW = 52`)!
    if (this._trueUltBeamTimer > 0) {
      const beamProg = Math.min(1, Math.max(0, 1 - this._trueUltBeamTimer / 0.92));
      const col = Math.min(29, Math.floor(beamProg * 30));
      const sx = col * 208;
      const sy = 7 * 208;
      const env = this._trueUltBeamTimer < 0.22 ? this._trueUltBeamTimer / 0.22 : 1.0;
      const muzzleX = Math.round(this.x + this.facing * 24);
      const beamY = Math.round(this.y - 122);
      const coreSliceX = sx + 44;
      const coreSliceW = 112;
      const tipSliceX = sx + 156;
      const tipSliceW = 52;
      const segCount = 16;

      ctx.save();
      ctx.translate(muzzleX, beamY);
      ctx.scale(this.facing, 1);

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = Math.max(0, Math.min(1, env * 0.98 * reflScale));
      for (let i = 0; i < segCount; i++) {
        const segX = 24 + i * coreSliceW;
        ctx.drawImage(vfxSheet, coreSliceX, sy, coreSliceW, 208, segX, -112, coreSliceW, 224);
      }
      ctx.drawImage(vfxSheet, tipSliceX, sy, tipSliceW, 208, 24 + segCount * coreSliceW, -112, tipSliceW, 224);
      ctx.drawImage(vfxSheet, sx, 6 * 208, 208, 208, -140, -140, 280, 280);

      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.max(0, Math.min(0.36, env * 0.34 * reflScale));
      for (let i = 0; i < segCount; i++) {
        const segX = 24 + i * coreSliceW;
        ctx.drawImage(vfxSheet, coreSliceX, sy, coreSliceW, 208, segX, -112, coreSliceW, 224);
      }
      ctx.drawImage(vfxSheet, tipSliceX, sy, tipSliceW, 208, 24 + segCount * coreSliceW, -112, tipSliceW, 224);
      ctx.drawImage(vfxSheet, sx, 6 * 208, 208, 208, -140, -140, 280, 280);

      ctx.restore();
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
