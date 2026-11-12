import { Fighter } from './Fighter.js?v=30fps79';
import { PixelForge } from '../engine/PixelForge.js?v=30fps79';
import { PixelFont } from '../engine/PixelFont.js?v=30fps79';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps79';
import {
  CHRONO_EFFECT_REGISTRY,
  CHRONO_TEAL_PALETTE,
  CHRONO_BRASS_PALETTE
} from '../engine/shaders/chronoShaders.js?v=30fps79';

const ROMAN_CLOCK_HOURS = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];

/**
 * Chronos (`chronomancer`) — Martial Clock-Blade & Temporal Paradox Clone Sovereign.
 * Powered natively by `ArcaneShaderFX` (dual-buffer 120Hz HD-2D 2.5D shader & particle engine)
 * + `assets/sprites/chronomancer_sheet.png` & `assets/sprites/chronomancer_vfx.png` (8 rows x 30 cols @ 208x208).
 *
 * Signature Kit:
 *  - 3-Stage Horological Blade & Clone Auto-Attack:
 *      1. MINUTE-BLADE WAVE (`Row 2` close cleave + piercing `Row 0` Crescent Sonic Wave)
 *      2. FUTURE PHANTOM PINCER (Cyan Future-Clone behind enemy + `Row 5` Twin Clock-Hand X-Scissor)
 *      3. XII CHIME SCISSOR (Guaranteed Crit `Row 5` + `Row 4` Shatter, `1.15s` Chrono Slow & `+8 Mana`)
 *  - Skill: CHRONO-SCHISM: PARADOX ASSAULT & REWIND (`Row 1` Past-Timeline Anchor -> Warp X-Scissor + `3.8s` Stasis Field -> Instant Rewind & Heal)
 *  - Overdrive (`ULTIMATE`): TRI-TIMELINE CONVERGENCE (`Row 3` Grand Horologium + Gold Past-Clone & Cyan Future-Clone 3-Beat Cross-Slash)
 *  - Supreme Ultimate (`TRUE_ULTIMATE`): ETERNAL ZERO: TWELFTH BELL (`4.55s` True Time-Stop, Grand XII Astral Clockwork Dome,
 *      6-Angle Paradox Clone & `Row 6` Giant Clock-Spear Barrage in Stopped Time -> Single Instant `395` Crit Midnight Shatter!)
 */
export class Chronomancer extends Fighter {
  constructor(x, groundY, facing = 1) {
    const opts = typeof x === 'object' && x !== null ? x : { x, groundY, facing };
    super({
      ...opts,
      name: opts.name || 'Chronos',
      maxHp: 3730,
      attackRange: 260,
      moveSpeed: 218,
      autoInterval: 0.88,
      lightColor: 'rgba(45, 212, 191, 1)',
      primaryColor: '#2dd4bf',
      hasTrueUltimate: true,
      trueUltName: 'ETERNAL ZERO: TWELFTH BELL',
      trueUltDuration: 4.55
    });
    this.heroId = 'chronomancer';
    this.theme = 'chrono';
    this.deathSfx = 'death_chrono';

    this.autoDuration = 0.88;
    this.skillMaxCooldown = 4.58;
    this.skillDuration = 1.08;
    this.skillTriggerRange = 435;
    this.skillName = 'CHRONO-SCHISM REWIND';

    this.ultName = 'TRI-TIMELINE CONVERGENCE';
    this.ultDuration = 1.68;

    this.hasTrueUltimate = true;
    this.trueUltName = 'ETERNAL ZERO: TWELFTH BELL';
    this.trueUltDuration = 4.55;

    this.comboStep = 0;
    this._currentAutoStage = 0;
    this.stepDustTimer = 0;
    this.chronoPhase = 0;

    // Temporal Afterimage / Paradox Clone & Horological Field State
    this.phantomClones = [];
    this.temporalEchoes = [];
    this.rewindRibbons = [];
    this.activeVfxAnims = [];

    // Skill: Past-Timeline Anchor & Time-Dilation Stasis Field
    this.anchorActive = false;
    this.anchorX = this.x;
    this.anchorY = this.groundY;
    this.anchorHp = this.maxHp;
    this._skillStage = 0;
    this.stasisField = null;

    // Overdrive (`ULTIMATE`): Tri-Timeline Convergence
    this._ultStage = 0;
    this._ultTargetX = this.x;
    this.triHorologium = null;

    // Supreme Ultimate (`TRUE_ULTIMATE`): Eternal Zero: Twelfth Bell
    this._trueUltInit = false;
    this._trueUltStage = 0;
    this._trueUltTickStage = 0;
    this._trueUltBarrageCount = 0;
    this._eternalStartFacing = this.facing;
    this.eternalTargetX = this.x;
    this.eternalTargetY = this.groundY;
    this.eternalZeroDome = null;
    this.suspendedClockSpears = [];
    this.shatterClockShards = [];
    this._frozenEnemiesRef = [];

    // Native 120Hz dual-buffer HD-2D Horological Shader & Particle Runtime (`back` + `front` 2.5D layers)
    this.fx = new ArcaneShaderFX(CHRONO_EFFECT_REGISTRY, {
      pixelScale: 3,
      viewW: 540,
      viewH: 320
    });

    if (typeof Image !== 'undefined') {
      const chronoAssets = PixelForge.initAssets()?.chronomancer;
      if (chronoAssets?.vfx?.src && !chronoAssets.vfx.src.includes('v=30fps62')) {
        chronoAssets.vfx.src = 'assets/sprites/chronomancer_vfx.png?v=30fps79';
      }
    }

    this.dodgeMaxCooldown = 3.05;
    this.dashMaxCooldown = 2.95;
    this.isChronoWarp = false;
    this.didChronoWarp = false;
    this.warpOriginX = this.x;
    this.warpTargetX = this.x;
    this.warpPortalTimer = 0;
    this.wallFlipCooldown = 0;
    this.crouchCooldown = 0;
    this.crouchDuration = 0.92;
    this.isCrouching = false;
    this.isFlipVault = false;
    this.flipStartX = this.x;
    this.flipTargetX = this.x;
    this.flipAngle = 0;
    this._deathBurstTriggered = false;
  }

  setState(newState) {
    const prevState = this.state;
    super.setState(newState);

    if (newState === 'AUTO_ATTACK') {
      this._currentAutoStage = this.comboStep % 3;
    }

    if (newState === 'SKILL') {
      this._skillStage = 0;
    } else if (prevState === 'SKILL' && this.anchorActive) {
      this.anchorActive = false;
    }

    if (newState === 'ULTIMATE') {
      this._ultStage = 0;
      this.isInvulnerable = true;
    } else if (prevState === 'ULTIMATE') {
      this.triHorologium = null;
      if (newState !== 'TRUE_ULTIMATE') {
        this.isInvulnerable = false;
        this.y = this.groundY;
      }
    }

    if (newState === 'TRUE_ULTIMATE') {
      // Preserve `this.fx` across ULTIMATE / TRUE_ULTIMATE!
      this._trueUltInit = false;
      this._trueUltStage = 0;
      this._trueUltTickStage = 0;
      this._trueUltBarrageCount = 0;
      this.isInvulnerable = true;
      this.unstoppablePoise = true;
    } else if (prevState === 'TRUE_ULTIMATE') {
      this._releaseAllTimeStoppedEnemies();
      this._trueUltInit = false;
      this.trueUltFrameOverride = null;
      this.unstoppablePoise = false;
      this.isInvulnerable = false;
      this.eternalZeroDome = null;
      this.suspendedClockSpears = [];
      this.y = this.groundY;
    }

    if (newState === 'DEATH') {
      this._releaseAllTimeStoppedEnemies();
      this.fx?.clear();
      this.anchorActive = false;
      this.stasisField = null;
      this.triHorologium = null;
      this.eternalZeroDome = null;
      this.suspendedClockSpears = [];
      this.trueUltFrameOverride = null;
      this.unstoppablePoise = false;
    }
  }

  _releaseAllTimeStoppedEnemies() {
    if (!this._frozenEnemiesRef || this._frozenEnemiesRef.length === 0) return;
    for (const foe of this._frozenEnemiesRef) {
      if (!foe) continue;
      foe.chronoTimeStopTimer = 0;
      foe._timeStopLockX = null;
      foe._timeStopLockY = null;
      foe.chronoTimeStopFrame = null;
    }
    this._frozenEnemiesRef = [];
  }

  clampArenaX(x, game, margin = 115) {
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    return Math.max(margin, Math.min(ww - margin, x));
  }

  getActiveEnemies(enemy, game) {
    const list = game?.getEnemiesOf ? game.getEnemiesOf(this) : enemy ? [enemy] : [];
    return list.filter((f) => f && !f.isDead && !f.isBenched);
  }

  ensureAstrolabeAura() {
    if (!this.fx || this.isDead) return;
    if (!this.fx.active.some((s) => s.key === 'chronoAstrolabeAura')) {
      this.fx.spawn('chronoAstrolabeAura', this.x, this.y - 102, {
        follow: this,
        offsetX: 0,
        offsetY: -102,
        flip: this.facing < 0,
        palette: CHRONO_TEAL_PALETTE,
        light: 1.18
      });
    }
  }

  spawnVfxAnim(row, x, y, w = 208, h = 208, maxLife = 0.36, opts = {}) {
    this.activeVfxAnims.push({
      row,
      x,
      y,
      vx: opts.vx || 0,
      vy: opts.vy || 0,
      w,
      h,
      age: 0,
      maxLife,
      flipX: Boolean(opts.flipX),
      angleRad: opts.angleRad || 0,
      startFrame: opts.startFrame || 0,
      endFrame: opts.endFrame !== undefined ? opts.endFrame : 29,
      glowColor: opts.glowColor || 'teal',
      followOwner: Boolean(opts.followOwner),
      offsetX: opts.offsetX || 0,
      offsetY: opts.offsetY || 0,
      inFront: opts.inFront !== undefined ? Boolean(opts.inFront) : true
    });
  }

  /**
   * Manifests a crisp HD-2D Temporal Paradox Clone (`variant`: `'future'` Cyan `#2dd4bf` or `'past'` Gold `#facc15`).
   * Rendered strictly with un-rotated `208x208` character sprite cells (`ZERO ctx.rotate`!).
   */
  spawnPhantomClone(x, y, facing, variant = 'future', opts = {}) {
    if (this.phantomClones.length >= 14) {
      this.phantomClones.shift();
    }
    const clone = {
      x: Math.round(x),
      y: Math.round(y),
      facing: facing >= 0 ? 1 : -1,
      variant: variant === 'past' ? 'past' : 'future',
      frameIdx: opts.frameIdx !== undefined ? opts.frameIdx : null,
      startFrame: opts.startFrame !== undefined ? opts.startFrame : 68,
      endFrame: opts.endFrame !== undefined ? opts.endFrame : 78,
      age: 0,
      maxLife: opts.maxLife || 0.42,
      holdUntilTimeStopEnd: Boolean(opts.holdUntilTimeStopEnd),
      romanTag: opts.romanTag || null,
      inFront: Boolean(opts.inFront)
    };
    this.phantomClones.push(clone);

    this.fx?.burst(clone.x, clone.y - 92, {
      count: 9,
      speedMin: 36,
      speedMax: 125,
      lifeMin: 0.14,
      lifeMax: 0.28,
      gravity: -18,
      colors:
        clone.variant === 'past'
          ? ['#ffffff', '#fef08a', '#facc15', '#d97706']
          : ['#ffffff', '#99f6e4', '#2dd4bf', '#14b8a6']
    });
    return clone;
  }

  spawnTemporalEcho(frameIdx) {
    if (this.temporalEchoes.length > 5) this.temporalEchoes.shift();
    this.temporalEchoes.push({
      x: this.x,
      y: this.y,
      facing: this.facing,
      frameIdx,
      life: 0,
      maxLife: 0.52
    });
  }

  spawnRewindRibbons(fromX, fromY) {
    for (let i = 0; i < 6; i++) {
      this.rewindRibbons.push({
        startX: fromX + (Math.random() - 0.5) * 38,
        startY: fromY + (Math.random() - 0.5) * 38,
        arcHeight: (i % 2 === 0 ? -1 : 1) * (36 + Math.random() * 44),
        life: -i * 0.03,
        maxLife: 0.44 + Math.random() * 0.1,
        sparkTimer: 0
      });
    }
  }

  onProjectileTrail(p) {
    if (!this.fx || p.type !== 'clock_gear') return;
    if ((p.ringTimer || 0) >= 0.045) {
      p.ringTimer = 0;
      this.fx.burst(p.x - Math.sign(p.vx || 1) * 14, p.y, {
        count: 3,
        speedMin: 26,
        speedMax: 78,
        lifeMin: 0.14,
        lifeMax: 0.26,
        gravity: -14,
        spread: 1.0,
        angle: Math.atan2(-(p.vy || 0), -(p.vx || 1)),
        colors: ['#ffffff', '#99f6e4', '#2dd4bf', '#facc15']
      });
    }
  }

  onProjectileHit(p, hitTarget, isCrit, game) {
    if (!this.fx) return false;
    const hx = hitTarget ? hitTarget.x : p.x;
    const hy = hitTarget ? hitTarget.y - 96 : p.y;
    const hitAngle = Math.atan2(p.vy || 0, p.vx || 1);
    this.fx.spawn('temporalCrescentRift', hx, hy, {
      flip: (p.vx || 1) < 0,
      palette: isCrit ? CHRONO_BRASS_PALETTE : CHRONO_TEAL_PALETTE,
      light: isCrit ? 1.34 : 1.2,
      extra: {
        aimAngle: hitAngle,
        isGold: isCrit,
        radius: isCrit ? 28 : 23,
        width: isCrit ? 11 : 8.5
      }
    });
    this.spawnVfxAnim(4, hx, hy, isCrit ? 200 : 172, isCrit ? 200 : 172, 0.28, {
      flipX: (p.vx || 1) < 0,
      glowColor: isCrit ? 'gold' : 'teal',
      inFront: true
    });
    this.fx.burst(hx, hy, {
      count: isCrit ? 16 : 11,
      speedMin: 52,
      speedMax: isCrit ? 205 : 160,
      lifeMin: 0.16,
      lifeMax: 0.34,
      gravity: 64,
      colors: ['#ffffff', '#fde047', '#2dd4bf', '#14b8a6']
    });
    game?.vfx?.spawnGlyphBurst?.(hx, hy, 5, 'chrono');
    return true;
  }

  takeDamage(amount, attacker, isCrit = false, knockX = 95, knockY = 0) {
    super.takeDamage(amount, attacker, isCrit, knockX, knockY);
    if (this.isDead && !this._deathBurstTriggered) {
      this._deathBurstTriggered = true;
      this._releaseAllTimeStoppedEnemies();
      this.fx?.stopByKey('chronoAstrolabeAura');
      this.fx?.spawn('warpPortalPairRift', this.x, this.groundY - 78, {
        palette: CHRONO_BRASS_PALETTE,
        light: 1.24,
        extra: { isArrival: true }
      });
      this.spawnVfxAnim(7, this.x, this.groundY - 82, 224, 224, 0.42, {
        glowColor: 'gold',
        inFront: true
      });
    }
  }

  // ============================================================================
  // AGILE CLOCK-BLADE & CLONE SKIRMISHER MOBILITY (`JUMP`, `CROUCH`, `DASH`, `DODGE`)
  // ============================================================================

  startJump(enemy, game, customDir = null) {
    this.dodgeCooldown = this.dodgeMaxCooldown * (0.86 + Math.random() * 0.26);
    this.setState('JUMP');
    this.isInvulnerable = true;
    this.isChronoWarp = false;
    this.isFlipVault = true;
    this.flipStartX = this.x;
    this.flipAngle = 0;
    this.wallFlipCooldown = 2.8;

    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    let dir = customDir !== null ? customDir : this.facing;
    if (this.x < 190) dir = 1;
    else if (this.x > ww - 190) dir = -1;

    if (enemy && !enemy.isDead) {
      const dist = Math.abs(enemy.x - this.x);
      if (dist < 210) {
        // Vault cleanly over/past close pressure onto the open Clock-Blade flank (`175px` sweet-spot)
        const crossSign = this.x < enemy.x ? 1 : -1;
        let target = enemy.x + crossSign * 175;
        if (target < 140 || target > ww - 140) {
          target = enemy.x - crossSign * 185;
        }
        this.flipTargetX = this.clampArenaX(target, game, 130);
      } else {
        // Agile aerial advance into mid-close Clock-Blade range (`165px`)
        const toEnemy = Math.sign(enemy.x - this.x) || this.facing;
        this.flipTargetX = this.clampArenaX(enemy.x - toEnemy * 165, game, 130);
      }
      this.dashDir = Math.sign(this.flipTargetX - this.flipStartX) || dir;
    } else {
      this.flipTargetX = this.clampArenaX(this.x + dir * 250, game, 130);
      this.dashDir = dir;
    }

    this.dashDuration = 0.58;
    this.vx = 0;
    this.vy = 0;
    this.spawnTemporalEcho(PixelForge.getFrameIndex(this, this.walkPhase));
    this.fx?.spawn('warpPortalPairRift', this.x, this.y - 88, {
      flip: this.facing < 0,
      palette: CHRONO_TEAL_PALETTE,
      light: 1.2,
      extra: { isArrival: false }
    });
    if (game?.audio) game.audio.play('time_rewind', this.x);
    game?.vfx?.spawnShockwave?.(this.x, this.groundY, 92, '#2dd4bf', 0.3, true);
    game?.vfx?.spawnGlyphBurst?.(this.x, this.y - 64, 6, 'chrono');
    game?.vfx?.spawnDamageText?.(this.x, this.y - 134, 0, false, 'TIME-GLIDE VAULT!', '#2dd4bf');
  }

  startCrouch(_enemy, game) {
    this.crouchCooldown = 3.1;
    this.crouchDuration = 0.9;
    this.setState('CROUCH');
    this.isCrouching = true;
    this.isDeflecting = true;
    this.vx = 0;
    this.fx?.spawn('warpPortalPairRift', this.x + this.facing * 36, this.y - 90, {
      follow: this,
      offsetX: 36,
      offsetY: -90,
      flip: this.facing < 0,
      palette: CHRONO_BRASS_PALETTE,
      light: 1.24,
      extra: { isArrival: true }
    });
    this.spawnVfxAnim(1, this.x + this.facing * 34, this.y - 88, 148, 148, 0.36, {
      followOwner: true,
      offsetX: 34,
      offsetY: -88,
      glowColor: 'gold',
      inFront: true
    });
    game?.vfx?.spawnShockwave?.(this.x, this.groundY - 2, 68, '#2dd4bf', 0.24, true);
    game?.vfx?.spawnDamageText?.(this.x, this.y - 124, 0, false, 'ESCAPEMENT PARRY!', '#facc15');
  }

  onStartDash(enemy, game, dir) {
    this.dashDuration = 0.38;
    this.isDeflecting = true;
    this.isChronoWarp = false;
    this.isFlipVault = false;
    this.flipAngle = 0;

    const advanceDir = enemy && !enemy.isDead ? Math.sign(enemy.x - this.x) || dir : dir;
    this.dashDir = advanceDir;
    this.facing = advanceDir;
    this.vx = advanceDir * 455;
    this.spawnTemporalEcho(PixelForge.getFrameIndex(this, this.walkPhase));
    this.fx?.spawn('temporalCrescentRift', this.x, this.y - 94, {
      follow: this,
      offsetX: 16,
      offsetY: -94,
      flip: advanceDir < 0,
      palette: CHRONO_TEAL_PALETTE,
      light: 1.22,
      extra: { isGold: false, radius: 25, width: 9 }
    });
    if (game?.audio) game.audio.play('time_rewind', this.x);
    game?.vfx?.spawnGlyphBurst?.(this.x, this.y - 88, 6, 'chrono');
    game?.vfx?.spawnDamageText?.(this.x, this.y - 142, 0, false, 'CHRONO BLADE SURGE!', '#2dd4bf');
  }

  onStartDodge(enemy, game, dir) {
    // Check if an enemy projectile is approaching: counter-parry with Escapement Crouch!
    const incomingProj =
      game?.vfx?.projectiles?.some(
        (p) =>
          p.owner !== this &&
          Math.abs(p.x - this.x) < 215 &&
          Math.sign(p.vx) === Math.sign(this.x - p.x)
      ) || false;

    if (incomingProj && this.crouchCooldown <= 0) {
      this.startCrouch(enemy, game);
      return;
    }

    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const dist = enemy ? Math.abs(enemy.x - this.x) : 999;
    const nearWall = this.x < 245 || this.x > ww - 245;

    this.isDeflecting = false;
    this.isFlipVault = false;
    this.flipAngle = 0;
    this.spawnTemporalEcho(PixelForge.getFrameIndex(this, this.walkPhase));
    if (game?.audio) game.audio.play('time_rewind', this.x);

    // Signature Skirmisher Flank Warp: warps through close pressure to enemy's opposite 170px flank!
    if (enemy && !enemy.isDead && (dist < 195 || nearWall)) {
      this.isChronoWarp = true;
      this.didChronoWarp = false;
      this.dashDuration = 0.38;
      this.warpPortalTimer = 0.48;
      this.warpOriginX = this.x;
      this.vx = 0;

      const crossSign = this.x < enemy.x ? 1 : -1;
      let targetX = enemy.x + crossSign * 172;
      if (targetX < 135 || targetX > ww - 135) {
        targetX = enemy.x - crossSign * 185;
      }
      this.warpTargetX = this.clampArenaX(targetX, game, 125);
      this.dashDir = Math.sign(this.warpTargetX - this.warpOriginX) || 1;

      this.fx?.spawn('warpPortalPairRift', this.warpOriginX, this.groundY - 94, {
        flip: this.facing < 0,
        palette: CHRONO_TEAL_PALETTE,
        light: 1.28,
        extra: { isArrival: false }
      });
      this.spawnPhantomClone(this.warpOriginX, this.groundY, this.facing, 'past', {
        frameIdx: 184,
        maxLife: 0.34
      });

      game?.vfx?.spawnShockwave?.(this.x, this.groundY, 112, '#2dd4bf', 0.3, true);
      game?.vfx?.spawnDamageText?.(this.x, this.y - 156, 0, false, 'PARADOX SLIP!', '#facc15');

      if (dist < 175) {
        enemy.takeDamage(16, this, false, 80, -35);
      }
      return;
    }

    this.isChronoWarp = false;
    this.dashDuration = 0.36;
    const smartDir = this.x < 220 ? 1 : this.x > ww - 220 ? -1 : dir;
    this.dashDir = smartDir;
    this.vx = smartDir * 370;
    game?.vfx?.spawnGlyphBurst?.(this.x, this.y - 88, 6, 'chrono');
  }

  updateDashOrDodge(dt, enemy, game) {
    const t = this.stateTimer;

    // Row 8 (`JUMP` — Time-Glide Aerial Vault & Apex Minute-Blade Crescent Wave)
    if ((this.state === 'JUMP' || this.state === 'DODGE') && this.isFlipVault) {
      const u = Math.min(1, t / this.dashDuration);
      const airU = Math.max(0, Math.min(1, (u - 0.1) / 0.76));
      const horizU =
        airU < 0.35
          ? (airU / 0.35) * 0.44
          : airU < 0.7
            ? 0.44 + ((airU - 0.35) / 0.35) * 0.28
            : 0.72 + ((airU - 0.7) / 0.3) * 0.28;
      this.x = this.flipStartX + (this.flipTargetX - this.flipStartX) * horizU;

      let liftFrac = 0;
      if (airU > 0 && airU < 1) {
        if (airU < 0.28) {
          liftFrac = 1 - Math.pow(1 - airU / 0.28, 2.2);
        } else if (airU <= 0.68) {
          liftFrac = 1.0 - Math.sin(((airU - 0.28) / 0.4) * Math.PI) * 0.06;
        } else {
          liftFrac = 1 - Math.pow((airU - 0.68) / 0.32, 1.85);
        }
      }
      this.y = this.groundY - liftFrac * 84;
      this.flipAngle = 0;

      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }

      if (u >= 0.48 && !this.didActionFrame && enemy && !enemy.isDead) {
        this.didActionFrame = true;
        if (game?.audio) game.audio.play('clock_gear', this.x);
        const sx = this.x + this.facing * 42;
        const sy = this.y - 104;
        const dx = enemy.x - sx;
        const dy = enemy.y - 96 - sy;
        const td = Math.hypot(dx, dy) || 1;
        game?.vfx?.spawnProjectile?.({
          x: sx,
          y: sy,
          vx: (dx / td) * 675,
          vy: (dy / td) * 675,
          radius: 19,
          color: '#2dd4bf',
          coreColor: '#facc15',
          owner: this,
          damage: 46,
          pierce: true,
          type: 'clock_gear'
        });
        this.fx?.spawn('temporalCrescentRift', sx, sy, {
          flip: this.facing < 0,
          palette: CHRONO_BRASS_PALETTE,
          light: 1.24,
          extra: { aimAngle: Math.atan2(dy, Math.abs(dx)), isGold: true, radius: 26, width: 10 }
        });
        this.spawnVfxAnim(0, sx, sy, 176, 176, 0.24, {
          flipX: this.facing < 0,
          glowColor: 'teal',
          inFront: true
        });
      }

      if (t >= this.dashDuration) {
        this.y = this.groundY;
        this.vy = 0;
        this.isFlipVault = false;
        this.isInvulnerable = false;
        game?.vfx?.spawnShockwave?.(this.x, this.groundY, 74, '#2dd4bf', 0.24, true);
        this.setState('IDLE');
      }
      return;
    }

    // Paradox Slip Flank Warp
    if (this.isChronoWarp) {
      if (t >= 0.12 && !this.didChronoWarp) {
        this.didChronoWarp = true;
        this.x = this.warpTargetX;
        if (enemy && !enemy.isDead) {
          this.facing = enemy.x >= this.x ? 1 : -1;
        }
        this.fx?.spawn('warpPortalPairRift', this.x, this.groundY - 94, {
          flip: this.facing < 0,
          palette: CHRONO_BRASS_PALETTE,
          light: 1.3,
          extra: { isArrival: true }
        });
        this.spawnVfxAnim(4, this.x, this.groundY - 94, 188, 188, 0.28, {
          flipX: this.facing < 0,
          glowColor: 'gold',
          inFront: true
        });
        game?.vfx?.spawnShockwave?.(this.x, this.groundY, 108, '#facc15', 0.28, true);
      }
      if (t >= this.dashDuration) {
        this.isChronoWarp = false;
        this.isDeflecting = false;
        this.isInvulnerable = false;
        this.setState('IDLE');
      }
      return;
    }

    // Row 6 (`DASH` — Chrono Blade Surge with close Clock-Blade cross-cut on contact!)
    const speed = this.state === 'DASH' ? 455 : 350;
    this.x += this.dashDir * speed * dt;

    if (
      this.state === 'DASH' &&
      !this.didActionFrame &&
      enemy &&
      !enemy.isDead &&
      Math.abs(enemy.x - this.x) <= 146
    ) {
      this.didActionFrame = true;
      enemy.takeDamage(48, this, false, 95, -50);
      if (game?.audio) game.audio.play('slash', enemy.x);
      this.fx?.spawn('chronoTimeRiftSlash', enemy.x, enemy.y - 94, {
        flip: this.facing < 0,
        light: 1.28,
        extra: { radius: 28 }
      });
      this.spawnVfxAnim(5, enemy.x, enemy.y - 94, 212, 212, 0.28, {
        flipX: this.facing < 0,
        glowColor: 'teal',
        inFront: true
      });
    }

    if (t >= this.dashDuration) {
      this.isDeflecting = false;
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  updateCrouch(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.crouchDuration || 0.9;
    this.vx *= Math.pow(0.001, dt);
    this.isCrouching = t < dur * 0.8;
    this.isDeflecting = this.isCrouching;

    if (t >= 0.34 && !this.didActionFrame) {
      this.didActionFrame = true;
      this.vx += this.facing * 75;
      if (game?.audio) game.audio.play('clock_gear', this.x);

      const spawnX = this.x + this.facing * 52;
      const spawnY = this.y - 92;
      game?.vfx?.spawnProjectile?.({
        x: spawnX,
        y: spawnY,
        vx: this.facing * 680,
        vy: 0,
        radius: 20,
        color: '#2dd4bf',
        coreColor: '#facc15',
        owner: this,
        damage: 54,
        pierce: true,
        type: 'clock_gear'
      });
      this.fx?.spawn('temporalCrescentRift', spawnX, spawnY, {
        flip: this.facing < 0,
        palette: CHRONO_BRASS_PALETTE,
        light: 1.26,
        extra: { aimAngle: 0, isGold: true, radius: 26, width: 10 }
      });
      this.spawnVfxAnim(0, spawnX, spawnY, 184, 184, 0.24, {
        flipX: this.facing < 0,
        glowColor: 'gold',
        inFront: true
      });
    }

    if (t >= dur) {
      this.isCrouching = false;
      this.isDeflecting = false;
      this.setState('IDLE');
    }
  }

  // ============================================================================
  // MAIN FRAME UPDATE: CLONES, STASIS DILATION FIELD & CHRONO SLOW ENFORCEMENT
  // ============================================================================

  update(dt, enemy, game) {
    this.chronoPhase += dt * 2.8;
    this.wallFlipCooldown = Math.max(0, this.wallFlipCooldown - dt);
    this.crouchCooldown = Math.max(0, this.crouchCooldown - dt);
    this.warpPortalTimer = Math.max(0, this.warpPortalTimer - dt);

    if (this.fx) {
      if (!this.isDead) {
        this.ensureAstrolabeAura();
      } else {
        this.fx.stopByKey('chronoAstrolabeAura');
      }
      this.fx.update(dt);
    }

    // 1. Advance Active 30fps `chronomancer_vfx.png` Cell Animations
    for (let i = this.activeVfxAnims.length - 1; i >= 0; i--) {
      const v = this.activeVfxAnims[i];
      v.age += dt;
      if (v.followOwner) {
        v.x = this.x + v.offsetX * this.facing;
        v.y = this.y + v.offsetY;
      } else {
        v.x += v.vx * dt;
        v.y += v.vy * dt;
      }
      if (v.age >= v.maxLife) {
        this.activeVfxAnims.splice(i, 1);
      }
    }

    // 2. Advance Temporal Paradox Clones (`this.phantomClones`)
    const inTimeStopPhase =
      this.state === 'TRUE_ULTIMATE' && this.stateTimer >= 1.15 && this.stateTimer < 3.5;
    for (let i = this.phantomClones.length - 1; i >= 0; i--) {
      const c = this.phantomClones[i];
      if (c.holdUntilTimeStopEnd && inTimeStopPhase) {
        c.age = Math.min(c.age + dt, c.maxLife * 0.25);
        continue;
      }
      c.age += dt;
      if (c.age >= c.maxLife) {
        this.phantomClones.splice(i, 1);
      }
    }

    // 3. Advance Temporal Echoes & Rewind Streams
    for (let i = this.temporalEchoes.length - 1; i >= 0; i--) {
      const ec = this.temporalEchoes[i];
      ec.life += dt;
      if (ec.life >= ec.maxLife) this.temporalEchoes.splice(i, 1);
    }

    for (let i = this.rewindRibbons.length - 1; i >= 0; i--) {
      const rr = this.rewindRibbons[i];
      rr.life += dt;
      if (rr.life >= 0 && this.fx) {
        rr.sparkTimer = (rr.sparkTimer || 0) + dt;
        if (rr.sparkTimer >= 0.045) {
          rr.sparkTimer = 0;
          const u = Math.min(1, rr.life / rr.maxLife);
          const rx = rr.startX + (this.x - rr.startX) * u;
          const ry =
            rr.startY + (this.y - 98 - rr.startY) * u + Math.sin(u * Math.PI) * rr.arcHeight;
          this.fx.burst(rx, ry, {
            count: 2,
            speedMin: 18,
            speedMax: 54,
            lifeMin: 0.14,
            lifeMax: 0.24,
            gravity: -16,
            colors: ['#ffffff', '#fde047', '#2dd4bf']
          });
        }
      }
      if (rr.life >= rr.maxLife) this.rewindRibbons.splice(i, 1);
    }

    // 4. Advance Midnight Glass-Clock Shards (`TRUE_ULTIMATE` Phase 4)
    for (let i = this.shatterClockShards.length - 1; i >= 0; i--) {
      const sh = this.shatterClockShards[i];
      sh.age += dt;
      sh.vy += 180 * dt;
      sh.x += sh.vx * dt;
      sh.y += sh.vy * dt;
      if (sh.age >= sh.maxLife) {
        this.shatterClockShards.splice(i, 1);
      }
    }

    // 5. Advance `3.8s` Time-Dilation Stasis Hourglass Field (`Row 2` + `chronoStasisField`):
    //    Slows enemies inside by `45%` & accelerates Chronos!
    const foes = this.getActiveEnemies(enemy, game);
    let chronosAccelerated = false;
    if (this.stasisField) {
      this.stasisField.life += dt;
      if (Math.abs(this.x - this.stasisField.x) <= this.stasisField.radius + 75) {
        chronosAccelerated = true;
      }
      if (this.stasisField.life >= this.stasisField.maxLife) {
        this.stasisField = null;
      }
    }

    if (chronosAccelerated && !this.isDead && this.state !== 'TRUE_ULTIMATE') {
      this.autoCooldown = Math.max(0, this.autoCooldown - dt * 0.35);
      this.skillCooldown = Math.max(0, this.skillCooldown - dt * 0.28);
      if (this.state === 'WALK') {
        this.x += this.facing * this.moveSpeed * 0.22 * dt;
      }
    }

    // Apply `45%` Temporal Slow to enemies afflicted by `chronoSlowTimer` or standing inside `this.stasisField`
    for (const foe of foes) {
      if (foe.chronoSlowTimer > 0) {
        foe.chronoSlowTimer = Math.max(0, foe.chronoSlowTimer - dt);
      }
      const inField =
        Boolean(this.stasisField) &&
        Math.abs(foe.x - this.stasisField.x) <= this.stasisField.radius;
      if ((foe.chronoSlowTimer > 0 || inField) && !(foe.chronoTimeStopTimer > 0)) {
        if (Number.isFinite(foe._chronoLastX)) {
          const stepDx = foe.x - foe._chronoLastX;
          if (Math.abs(stepDx) > 0.01 && Math.abs(stepDx) < 85) {
            foe.x = foe._chronoLastX + stepDx * 0.55;
          }
        }
        foe.vx *= Math.pow(0.06, dt);
      }
      foe._chronoLastX = foe.x;
    }

    // 6. Advance Tri-Timeline Horologium (`ULTIMATE`)
    if (this.triHorologium) {
      this.triHorologium.life += dt;
      if (this.triHorologium.life >= this.triHorologium.maxLife) {
        this.triHorologium = null;
      }
    }

    // 7. Agile Clock-Blade Skirmisher Corner-Vault & Projectile-Parry AI
    if (
      enemy &&
      !enemy.isDead &&
      (this.state === 'IDLE' || this.state === 'WALK') &&
      (this.finisherGauge || 0) < (this.maxFinisherGauge || 100)
    ) {
      const dist = Math.abs(enemy.x - this.x);
      const ww = game?.renderer ? game.renderer.worldWidth : 1200;
      const pinnedLeft = this.x < 195 && enemy.x > this.x;
      const pinnedRight = this.x > ww - 195 && enemy.x < this.x;

      if (
        (pinnedLeft || pinnedRight) &&
        dist < 220 &&
        this.dodgeCooldown <= 0 &&
        this.wallFlipCooldown <= 0
      ) {
        this.startJump(enemy, game);
        return;
      }
    }

    if (!this.isDead && this.state === 'WALK') {
      this.stepDustTimer += dt;
      if (this.stepDustTimer >= 0.3) {
        this.stepDustTimer = 0;
        if (game?.audio) game.audio.play('footstep_steel', this.x);
      }
    }

    super.update(dt, enemy, game);

    // Keep `_chronoLastX` synced post-super update for accurate 45% slow tracking
    for (const foe of foes) {
      if (foe && !Number.isFinite(foe._chronoLastX)) {
        foe._chronoLastX = foe.x;
      }
    }
  }

  // ============================================================================
  // 3-STAGE HOROLOGICAL BLADE & CLONE AUTO-ATTACK (`updateAutoAttack`)
  // ============================================================================

  updateAutoAttack(_dt, enemy, game) {
    const t = this.stateTimer;
    const stage = this._currentAutoStage ?? 0;

    if (t < 0.26) {
      this.torsoAngle = -this.facing * 0.14 * (t / 0.26);
      return;
    }

    if (!this.didActionFrame && t >= 0.26) {
      this.didActionFrame = true;
      this.comboStep = (this.comboStep + 1) % 3;
      this.torsoVel = this.facing * 10;

      const foes = this.getActiveEnemies(enemy, game);
      const primary = enemy && !enemy.isDead ? enemy : foes[0] || null;

      // ----------------------------------------------------------------------
      // STAGE 1 (`stage === 0` — `MINUTE-BLADE WAVE`):
      // Steps forward (`vx = facing * 135`) sweeping Minute Glaive (`Row 2`),
      // cleaving enemies within `155px` (`22 dmg`) AND launching a fast piercing
      // `Row 0` Minute-Blade Crescent Wave (`speed = 650`, `damage = 30`, `pierce = true`)!
      // ----------------------------------------------------------------------
      if (stage === 0) {
        this.vx = this.facing * 135;
        if (game?.audio) game.audio.play('clock_gear', this.x);

        const slashX = this.x + this.facing * 62;
        const slashY = this.y - 102;

        this.fx?.spawn('temporalCrescentRift', slashX, slashY, {
          flip: this.facing < 0,
          palette: CHRONO_TEAL_PALETTE,
          light: 1.24,
          extra: { aimAngle: 0, isGold: false, radius: 28, width: 10 }
        });
        this.spawnVfxAnim(0, slashX + this.facing * 14, slashY, 184, 184, 0.24, {
          vx: this.facing * 180,
          flipX: this.facing < 0,
          glowColor: 'teal',
          inFront: true
        });

        // Close Minute-Glaive Cleave (`155px`, `50 dmg` primary / `40` splash)
        for (const foe of foes) {
          const dxFoe = foe.x - this.x;
          if (Math.abs(dxFoe) <= 155 && dxFoe * this.facing >= -28) {
            foe.takeDamage(foe === primary ? 50 : 40, this, false, 78, -25);
            this.spawnVfxAnim(4, foe.x, foe.y - 96, 176, 176, 0.26, {
              flipX: this.facing < 0,
              glowColor: 'teal',
              inFront: true
            });
          }
        }

        // Fast Piercing `Row 0` Minute-Blade Crescent Sonic Wave (`speed = 650`, `damage = 62`, `pierce = true`)
        const targetY = primary ? primary.y - 102 : slashY;
        const dx = primary ? primary.x - slashX : this.facing * 520;
        const dy = (primary && Math.abs(dx) > 95 ? targetY - slashY : 0);
        const d = Math.hypot(dx, dy) || 1;
        const speed = 650;
        const dirSign = primary ? Math.sign(dx) || this.facing : this.facing;

        game?.vfx?.spawnProjectile?.({
          x: slashX,
          y: slashY,
          vx: primary && Math.abs(dx) > 95 ? (dx / d) * speed : dirSign * speed,
          vy: primary && Math.abs(dx) > 95 ? (dy / d) * speed : 0,
          radius: 20,
          color: '#2dd4bf',
          coreColor: '#facc15',
          owner: this,
          damage: 62,
          pierce: true,
          type: 'clock_gear'
        });
        game?.vfx?.spawnGlyphBurst?.(slashX, slashY, 5, 'chrono');
      }

      // ----------------------------------------------------------------------
      // STAGE 2 (`stage === 1` — `FUTURE PHANTOM PINCER`):
      // Chronos slashes from the front while manifesting a luminous Cyan Future-Self
      // Phantom Clone directly BEHIND the enemy (`enemy.x + facing * 78`, facing `-this.facing`,
      // playing `Row 2 F08..F18` over `0.42s`!), executing a Pincer Cross-Slash (`82 dmg`,
      // `'PARADOX PINCER!'`, stamping `Row 5` `paradoxTwinScissorCell` on the enemy)!
      // ----------------------------------------------------------------------
      else if (stage === 1) {
        this.vx = this.facing * 95;
        if (game?.audio) {
          game.audio.play('time_rewind', this.x);
          game.audio.play('slash', primary ? primary.x : this.x);
        }

        const strikeX = primary ? primary.x : this.clampArenaX(this.x + this.facing * 185, game, 110);
        const strikeY = primary ? primary.groundY : this.groundY;
        const cloneX = this.clampArenaX(strikeX + this.facing * 78, game, 88);

        // Manifest Luminous Cyan Future-Self Phantom Clone behind the enemy (`Row 2 F08..F18` = `68..78` over `0.42s`)!
        this.spawnPhantomClone(cloneX, strikeY, -this.facing, 'future', {
          startFrame: 68,
          endFrame: 78,
          maxLife: 0.42,
          inFront: false
        });

        this.fx?.spawn('warpPortalPairRift', cloneX, strikeY - 94, {
          flip: this.facing > 0,
          palette: CHRONO_TEAL_PALETTE,
          light: 1.26,
          extra: { isArrival: true }
        });
        this.fx?.spawn('chronoTimeRiftSlash', strikeX, strikeY - 96, {
          flip: this.facing < 0,
          palette: CHRONO_TEAL_PALETTE,
          light: 1.32,
          extra: { radius: 32 }
        });

        // Stamp `Row 5` `paradoxTwinScissorCell` directly on the enemy!
        this.spawnVfxAnim(5, strikeX, strikeY - 96, 232, 232, 0.34, {
          flipX: this.facing < 0,
          glowColor: 'teal',
          inFront: true
        });

        game?.vfx?.spawnDamageText?.(
          strikeX,
          strikeY - 154,
          0,
          false,
          'PARADOX PINCER!',
          '#2dd4bf'
        );
        game?.vfx?.spawnGlyphBurst?.(strikeX, strikeY - 96, 7, 'chrono');
        game?.renderer?.triggerShake?.(8, 0.14);

        for (const foe of foes) {
          if (Math.abs(foe.x - strikeX) <= 135 || Math.abs(foe.x - this.x) <= 275) {
            foe.takeDamage(foe === primary ? 82 : 64, this, false, 35, -35);
          }
        }
      }

      // ----------------------------------------------------------------------
      // STAGE 3 (`stage === 2` — `XII CHIME SCISSOR`):
      // Chronos lunges slightly & snaps both Clock-Blades together (`Row 5` `paradoxTwinScissorCell`
      // + `Row 4` `chronoShatterBurstCell` on target), dealing a Guaranteed Crit (`104 dmg`,
      // `'XII CHIME!'`), applying `enemy.chronoSlowTimer = 1.15`, and refunding `+7 Mana`!
      // ----------------------------------------------------------------------
      else {
        this.vx = this.facing * 155;
        if (game?.audio) {
          game.audio.play('chrono_hit', primary ? primary.x : this.x);
          game.audio.play('clock_gear', this.x);
        }

        const snapX =
          primary && Math.abs(primary.x - this.x) <= 305
            ? primary.x
            : this.clampArenaX(this.x + this.facing * 175, game, 110);
        const snapY = (primary ? primary.y : this.groundY) - 96;

        this.fx?.spawn('chronoTimeRiftSlash', snapX, snapY, {
          flip: this.facing < 0,
          palette: CHRONO_BRASS_PALETTE,
          light: 1.38,
          extra: { radius: 35 }
        });
        this.spawnVfxAnim(5, snapX, snapY, 252, 252, 0.38, {
          flipX: this.facing < 0,
          glowColor: 'gold',
          inFront: true
        });
        this.spawnVfxAnim(4, snapX, snapY, 216, 216, 0.34, {
          flipX: this.facing < 0,
          glowColor: 'teal',
          inFront: true
        });

        this.gainMana(7);
        game?.vfx?.spawnDamageText?.(snapX, snapY - 64, 0, true, 'XII CHIME!', '#fde047');
        game?.vfx?.spawnGlyphBurst?.(snapX, snapY, 8, 'chrono');
        game?.renderer?.triggerShake?.(11, 0.18);

        for (const foe of foes) {
          if (Math.abs(foe.x - snapX) <= 135 || Math.abs(foe.x - this.x) <= 295) {
            foe.chronoSlowTimer = Math.max(foe.chronoSlowTimer || 0, 1.15);
            foe.takeDamage(foe === primary ? 104 : 80, this, true, 115, -75);
          }
        }
      }
    }

    if (t >= (this.autoDuration || 0.88)) {
      this.setState('IDLE');
    }
  }

  // ============================================================================
  // SKILL — `CHRONO-SCHISM: PARADOX ASSAULT & REWIND` (`1.08s`, `5.2s` CD)
  // ============================================================================

  updateSkill(_dt, enemy, game) {
    const t = this.stateTimer;
    this.vx *= 0.82;

    const foes = this.getActiveEnemies(enemy, game);
    const primary = enemy && !enemy.isDead ? enemy : foes[0] || null;

    // `t = 0.00s`: Plant spinning `Row 1` Past-Timeline Anchor at `this.anchorX = this.x`
    if (this._skillStage === 0) {
      this._skillStage = 1;
      this.isDeflecting = true;
      this.anchorX = this.x;
      this.anchorY = this.groundY;
      this.anchorHp = this.hp;
      this.anchorActive = true;

      if (game?.audio) game.audio.play('time_rewind', this.x);
      this.fx?.spawn('warpPortalPairRift', this.anchorX, this.groundY - 88, {
        flip: this.facing < 0,
        palette: CHRONO_BRASS_PALETTE,
        light: 1.28,
        extra: { isArrival: false }
      });
      game?.vfx?.spawnShockwave?.(this.anchorX, this.groundY - 2, 96, '#facc15', 0.28, true);
      game?.vfx?.spawnDamageText?.(
        this.anchorX,
        this.y - 148,
        0,
        false,
        'PAST ANCHOR!',
        '#facc15'
      );
    }

    // `t = 0.24s`: Warp in front of enemy (`clamp(enemy.x - facing * 82)`), carve Twin Clock-Blade
    // X-Scissor Rift (`Row 5`, `76 Crit` in `175px` AOE) & open `3.8s` Stasis Hourglass Field (`Row 2` + `chronoStasisField`)!
    if (t >= 0.24 && this._skillStage === 1) {
      this._skillStage = 2;
      this.spawnTemporalEcho(PixelForge.getFrameIndex(this, this.walkPhase));

      const targetX = primary ? primary.x : this.clampArenaX(this.x + this.facing * 230, game, 120);
      const approachFacing = primary ? Math.sign(primary.x - this.x) || this.facing : this.facing;
      const warpX = this.clampArenaX(targetX - approachFacing * 82, game, 105);

      this.x = warpX;
      this.facing = targetX >= this.x ? 1 : -1;
      this.vx = 0;

      if (game?.audio) {
        game.audio.play('hourglass_trap', targetX);
        game.audio.play('chrono_hit', targetX);
      }

      // Twin Clock-Blade X-Scissor Rift (`Row 5`) + Shatter Spark (`Row 4`)
      this.fx?.spawn('chronoTimeRiftSlash', targetX, this.groundY - 96, {
        flip: this.facing < 0,
        palette: CHRONO_TEAL_PALETTE,
        light: 1.38,
        extra: { radius: 36 }
      });
      this.spawnVfxAnim(5, targetX, this.groundY - 96, 260, 260, 0.38, {
        flipX: this.facing < 0,
        glowColor: 'teal',
        inFront: true
      });
      this.spawnVfxAnim(4, targetX, this.groundY - 96, 212, 212, 0.32, {
        glowColor: 'gold',
        inFront: true
      });

      // Open `3.8s` Time-Dilation Stasis Hourglass Field (`Row 2` + `chronoStasisField`)
      this.stasisField = {
        x: targetX,
        y: this.groundY,
        radius: 165,
        life: 0,
        maxLife: 3.8
      };
      this.fx?.spawn('chronoStasisField', targetX, this.groundY, {
        useGroundY: true,
        palette: CHRONO_TEAL_PALETTE,
        light: 1.32,
        maxDuration: 3.8,
        extra: { customDuration: 3.8, radius: 56 }
      });

      game?.vfx?.spawnShockwave?.(targetX, this.groundY - 2, 165, '#2dd4bf', 0.36, true);
      game?.vfx?.spawnGlyphBurst?.(targetX, this.groundY - 96, 9, 'chrono');
      game?.vfx?.spawnDamageText?.(
        targetX,
        this.groundY - 166,
        0,
        true,
        'STASIS RIFT!',
        '#2dd4bf'
      );
      game?.renderer?.triggerShake?.(12, 0.2);

      for (const foe of foes) {
        if (Math.abs(foe.x - targetX) <= 175 || Math.abs(foe.x - this.x) <= 175) {
          foe.chronoSlowTimer = Math.max(foe.chronoSlowTimer || 0, 1.6);
          foe.takeDamage(foe === primary ? 105 : 72, this, true, 45, -65);
        }
      }
    }

    // `t = 0.76s`: `CHRONO REWIND!` — Leave a Golden Past-Clone slashing at the rift (`54 dmg` echo hit)
    // while Chronos rewinds instantaneously back to `this.anchorX` & heals!
    if (t >= 0.76 && this._skillStage === 2) {
      this._skillStage = 3;
      this.isDeflecting = false;

      const riftCloneX = this.x;
      const riftCloneFacing = this.facing;
      const echoTargetX = primary
        ? primary.x
        : this.stasisField
          ? this.stasisField.x
          : riftCloneX + riftCloneFacing * 82;

      // Golden Past-Clone remains at the rift executing an echo slash!
      this.spawnPhantomClone(riftCloneX, this.groundY, riftCloneFacing, 'past', {
        startFrame: 68,
        endFrame: 82,
        maxLife: 0.48,
        inFront: false
      });
      this.spawnVfxAnim(5, echoTargetX, this.groundY - 94, 216, 216, 0.32, {
        flipX: riftCloneFacing < 0,
        glowColor: 'gold',
        inFront: true
      });
      this.fx?.spawn('chronoTimeRiftSlash', echoTargetX, this.groundY - 94, {
        flip: riftCloneFacing < 0,
        palette: CHRONO_BRASS_PALETTE,
        light: 1.3,
        extra: { radius: 30 }
      });

      for (const foe of foes) {
        if (Math.abs(foe.x - echoTargetX) <= 165 || Math.abs(foe.x - riftCloneX) <= 175) {
          foe.takeDamage(foe === primary ? 54 : 38, this, false, 70, -45);
        }
      }

      // Instantaneous Temporal Rewind back to `this.anchorX`!
      this.x = this.anchorX;
      this.y = this.groundY;
      this.vx = 0;
      this.anchorActive = false;
      if (primary) {
        this.facing = primary.x >= this.x ? 1 : -1;
      }

      if (game?.audio) game.audio.play('time_rewind', this.x);
      this.spawnRewindRibbons(riftCloneX, this.groundY - 92);
      this.fx?.spawn('warpPortalPairRift', this.x, this.groundY - 92, {
        flip: this.facing < 0,
        palette: CHRONO_BRASS_PALETTE,
        light: 1.34,
        extra: { isArrival: true }
      });

      const rewindHeal = Math.max(32, Math.min(88, Math.round(Math.max(0, this.anchorHp - this.hp) * 0.40)));
      this.heal(rewindHeal, 'CHRONO REWIND');
    }

    if (t >= (this.skillDuration || 1.08)) {
      this.isDeflecting = false;
      this.anchorActive = false;
      this.setState('IDLE');
    }
  }

  // ============================================================================
  // OVERDRIVE (`ULTIMATE`) — `TRI-TIMELINE CONVERGENCE` (`1.68s`)
  // ============================================================================

  updateUltimate(_dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.ultDuration || 1.68;
    this.vx = 0;
    this.vy = 0;
    this.isInvulnerable = true;

    // Smooth 28px levitation inside the spinning 2.5D Grand Horologium (`Row 3`)
    let liftFrac = 0;
    if (t < 0.25) {
      liftFrac = 1 - Math.pow(1 - t / 0.25, 2.0);
    } else if (t <= 1.36) {
      liftFrac = 1.0;
    } else {
      liftFrac = Math.max(0, 1 - (t - 1.36) / Math.max(0.08, dur - 1.36));
    }
    this.y = this.groundY - Math.round(28 * liftFrac);

    const foes = this.getActiveEnemies(enemy, game);
    const primary = enemy && !enemy.isDead ? enemy : foes[0] || null;
    if (primary) {
      this._ultTargetX = primary.x;
      this.facing = primary.x >= this.x ? 1 : -1;
    }
    const targetX = this.clampArenaX(
      this._ultTargetX || this.x + this.facing * 200,
      game,
      125
    );

    // `t = 0.04s`: Open Grand Horologium (`Row 3` + `doomsdayGrandHorologium`) & summon flanking Past + Future Clones!
    if (t >= 0.04 && this._ultStage === 0) {
      this._ultStage = 1;
      if (game?.audio) game.audio.play('chrono_ult', targetX);
      game?.renderer?.triggerShake?.(13, 0.24);

      this.triHorologium = {
        x: targetX,
        y: this.groundY - 168,
        life: 0,
        maxLife: 1.56
      };

      this.fx?.spawn('doomsdayGrandHorologium', targetX, this.groundY, {
        useGroundY: true,
        palette: CHRONO_TEAL_PALETTE,
        light: 1.38,
        maxDuration: 1.62,
        extra: { customDuration: 1.62, radius: 72 }
      });

      const leftCloneX = this.clampArenaX(targetX - 95, game, 85);
      const rightCloneX = this.clampArenaX(targetX + 95, game, 85);
      this.spawnPhantomClone(leftCloneX, this.groundY, 1, 'past', {
        startFrame: 60,
        endFrame: 88,
        maxLife: 1.32
      });
      this.spawnPhantomClone(rightCloneX, this.groundY, -1, 'future', {
        startFrame: 60,
        endFrame: 88,
        maxLife: 1.32
      });

      game?.vfx?.spawnDamageText?.(
        targetX,
        this.groundY - 228,
        0,
        true,
        'TRI-TIMELINE CONVERGENCE!',
        '#2dd4bf'
      );
    }

    // Keep enemy pinned inside the Tri-Timeline Cross-Zone
    if (primary && !primary.hasPoise && t < 1.32) {
      primary.vx *= 0.2;
    }

    // Beat 1 (`t = 0.45s`): Synchronized Tri-Timeline Slash I!
    if (t >= 0.45 && this._ultStage === 1) {
      this._ultStage = 2;
      if (game?.audio) game.audio.play('slash', targetX);
      game?.renderer?.triggerShake?.(12, 0.2);

      this.fx?.spawn('chronoTimeRiftSlash', targetX, this.groundY - 96, {
        palette: CHRONO_TEAL_PALETTE,
        light: 1.34,
        extra: { radius: 34 }
      });
      this.spawnVfxAnim(5, targetX, this.groundY - 96, 240, 240, 0.32, {
        flipX: false,
        glowColor: 'teal',
        inFront: true
      });
      game?.vfx?.spawnGlyphBurst?.(targetX, this.groundY - 96, 7, 'chrono');

      for (const foe of foes) {
        if (Math.abs(foe.x - targetX) <= 175) {
          foe.takeDamage(foe === primary ? 78 : 54, this, true, -18, -35);
        }
      }
    }

    // Beat 2 (`t = 0.86s`): Synchronized Tri-Timeline Slash II!
    if (t >= 0.86 && this._ultStage === 2) {
      this._ultStage = 3;
      if (game?.audio) game.audio.play('clock_gear', targetX);
      game?.renderer?.triggerShake?.(14, 0.22);

      this.fx?.spawn('chronoTimeRiftSlash', targetX, this.groundY - 98, {
        flip: true,
        palette: CHRONO_BRASS_PALETTE,
        light: 1.38,
        extra: { radius: 36 }
      });
      this.spawnVfxAnim(5, targetX, this.groundY - 98, 256, 256, 0.34, {
        flipX: true,
        glowColor: 'gold',
        inFront: true
      });
      this.spawnVfxAnim(4, targetX, this.groundY - 98, 208, 208, 0.3, {
        glowColor: 'teal',
        inFront: true
      });

      for (const foe of foes) {
        if (Math.abs(foe.x - targetX) <= 180) {
          foe.takeDamage(foe === primary ? 84 : 58, this, true, 18, -45);
        }
      }
    }

    // Beat 3 (`t = 1.28s`): Culminating `Row 7` Twelfth-Chime Shatter Nova!
    if (t >= 1.28 && this._ultStage === 3) {
      this._ultStage = 4;
      if (game?.audio) game.audio.play('chrono_hit', targetX);
      game?.renderer?.triggerShake?.(22, 0.42);
      game?.renderer?.triggerAberration?.(9);
      game?.renderer?.triggerHitStop?.(0.08);

      this.fx?.spawn('eternalZeroClockPulse', targetX, this.groundY - 98, {
        palette: CHRONO_BRASS_PALETTE,
        light: 1.44,
        extra: { isShatter: true }
      });
      this.spawnVfxAnim(7, targetX, this.groundY - 98, 296, 296, 0.44, {
        glowColor: 'gold',
        inFront: true
      });
      this.spawnVfxAnim(5, targetX, this.groundY - 98, 264, 264, 0.36, {
        glowColor: 'teal',
        inFront: true
      });

      this.heal(38, 'TRI-TIMELINE');
      game?.vfx?.spawnDamageText?.(
        targetX,
        this.groundY - 240,
        0,
        true,
        'CONVERGENCE SHATTER!',
        '#fde047'
      );
      game?.vfx?.spawnGlyphBurst?.(targetX, this.groundY - 98, 12, 'chrono');

      for (const foe of foes) {
        if (Math.abs(foe.x - targetX) <= 210) {
          foe.takeDamage(foe === primary ? 140 : 98, this, true, 165, -185);
        }
      }
    }

    if (t >= dur) {
      this.y = this.groundY;
      this.isInvulnerable = false;
      this.triHorologium = null;
      this.setState('IDLE');
    }
  }

  // ============================================================================
  // SUPREME ULTIMATE (`TRUE_ULTIMATE`) — `"ETERNAL ZERO: TWELFTH BELL"` (`4.55s`)
  // ============================================================================

  updateTrueUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.trueUltDuration || 4.55;
    this.isInvulnerable = true;
    this.unstoppablePoise = true;
    this.vx = 0;
    this.vy = 0;

    const foes = this.getActiveEnemies(enemy, game);
    const primary = enemy && !enemy.isDead ? enemy : foes[0] || null;

    // Subtle localized temporal dim (NEVER calls `setStageTransformation` — zero stage replacement!)
    if (game?.renderer && t < 4.15) {
      const dimTarget = t < 3.5 ? 0.52 : Math.max(0, 0.52 * (1 - (t - 3.5) / 0.65));
      game.renderer.ultDim = Math.max(game.renderer.ultDim || 0, dimTarget);
    }

    // Initialize Phase 1 (`t = 0.00s`): Ascent & Grand XII Astral Clockwork Dome
    if (!this._trueUltInit) {
      this._trueUltInit = true;
      this._trueUltStage = 0;
      this._trueUltTickStage = 0;
      this._trueUltBarrageCount = 0;
      this.suspendedClockSpears = [];
      this.shatterClockShards = [];
      this._frozenEnemiesRef = [];

      this._eternalStartFacing = primary
        ? primary.x >= this.x
          ? 1
          : -1
        : this.facing;
      this.facing = this._eternalStartFacing;

      this.eternalTargetX = primary
        ? primary.x
        : this.clampArenaX(this.x + this.facing * 240, game, 150);
      this.eternalTargetY = primary ? primary.y : this.groundY;

      const domeX = this.clampArenaX(
        this.x * 0.42 + this.eternalTargetX * 0.58,
        game,
        255
      );
      this.eternalZeroDome = {
        x: domeX,
        y: this.groundY - 206,
        radius: 214,
        phase: 0,
        minuteHandDeg: -90,
        hourHandDeg: 180,
        timeStopped: false,
        shattered: false,
        alpha: 1
      };

      if (game?.audio) game.audio.play('chrono_ult', domeX);
      game?.renderer?.triggerShake?.(14, 0.26);

      this.fx?.spawn('doomsdayGrandHorologium', domeX, this.groundY, {
        useGroundY: true,
        palette: CHRONO_TEAL_PALETTE,
        light: 1.42,
        maxDuration: 3.6,
        extra: { customDuration: 3.6, radius: 84 }
      });
      this.fx?.spawn('eternalZeroClockPulse', this.x, this.y - 98, {
        palette: CHRONO_BRASS_PALETTE,
        light: 1.35,
        extra: { isShatter: false }
      });
      game?.vfx?.spawnDamageText?.(
        domeX,
        this.groundY - 392,
        0,
        true,
        '★ THE TWELFTH BELL TOLLS... ★',
        '#fde047'
      );
    }

    if (this.eternalZeroDome) {
      this.eternalZeroDome.phase += dt;
    }

    // =========================================================================
    // PHASE 1 (`0.00s .. 1.15s`): ASCENT & THE TWELFTH BELL TOLLS (`IX -> X -> XI -> XII`)
    // =========================================================================
    if (t < 1.15) {
      const u1 = clamp01Local(t / 1.15);
      const lift = Math.round(54 * (1 - Math.pow(1 - u1, 2.2)));
      this.y = this.groundY - lift;
      this.trueUltFrameOverride = 120 + Math.min(11, Math.floor(u1 * 12));

      if (primary) {
        this.eternalTargetX = primary.x;
        this.eternalTargetY = primary.y;
        this.facing = primary.x >= this.x ? 1 : -1;
      }

      if (this.eternalZeroDome) {
        // Hour hand ticks discreetly `IX (180 deg) -> X (-150 deg) -> XI (-120 deg) -> XII (-90 deg)`
        // while Minute hand sweeps rapidly full revolutions into `-90 deg` (`XII` Midnight)!
        const dome = this.eternalZeroDome;
        dome.minuteHandDeg = -90 + u1 * 720;
        if (t < 0.36) {
          dome.hourHandDeg = 180; // IX
        } else if (t < 0.72) {
          dome.hourHandDeg = -150; // X
        } else if (t < 1.04) {
          dome.hourHandDeg = -120; // XI
        } else {
          dome.hourHandDeg = -90; // XII
        }

        if (t >= 0.24 && this._trueUltTickStage === 0) {
          this._trueUltTickStage = 1;
          if (game?.audio) game.audio.play('clock_gear', dome.x);
          game?.vfx?.spawnDamageText?.(dome.x - 130, dome.y - 24, 0, false, 'IX...', '#2dd4bf');
        } else if (t >= 0.56 && this._trueUltTickStage === 1) {
          this._trueUltTickStage = 2;
          if (game?.audio) game.audio.play('clock_gear', dome.x);
          game?.vfx?.spawnDamageText?.(dome.x - 76, dome.y - 102, 0, false, 'X...', '#99f6e4');
        } else if (t >= 0.86 && this._trueUltTickStage === 2) {
          this._trueUltTickStage = 3;
          if (game?.audio) game.audio.play('clock_gear', dome.x);
          game?.vfx?.spawnDamageText?.(dome.x - 18, dome.y - 154, 0, true, 'XI...', '#fde047');
        }
      }
      return;
    }

    // =========================================================================
    // PHASE 2 (`t = 1.15s`): `"★ TIME STOP — ETERNAL ZERO! ★"`
    // Genuine mid-air / mid-animation Time-Stop Lock on all active enemies!
    // =========================================================================
    if (this._trueUltStage === 0) {
      this._trueUltStage = 1;
      if (primary) {
        this.eternalTargetX = primary.x;
        this.eternalTargetY = primary.y;
      }

      if (this.eternalZeroDome) {
        this.eternalZeroDome.minuteHandDeg = -90;
        this.eternalZeroDome.hourHandDeg = -90;
        this.eternalZeroDome.timeStopped = true;
      }

      // Freeze every active enemy on their exact pixel coordinate & animation frame!
      this._frozenEnemiesRef = [...foes];
      for (const foe of foes) {
        foe.chronoTimeStopTimer = 2.42;
        foe._timeStopLockX = foe.x;
        foe._timeStopLockY = foe.y;
        foe.chronoTimeStopFrame = PixelForge.getFrameIndex(foe, foe.walkPhase || 0);
        foe.vx = 0;
        foe.vy = 0;
      }

      if (game?.audio) {
        game.audio.play('time_stop', this.eternalTargetX);
      }
      game?.renderer?.triggerImpactFrame?.(
        this.eternalTargetX,
        this.eternalTargetY - 95,
        0.13,
        'chrono'
      );
      game?.renderer?.triggerShake?.(16, 0.28);
      game?.renderer?.triggerAberration?.(9);

      this.fx?.spawn('eternalZeroClockPulse', this.eternalTargetX, this.eternalTargetY - 94, {
        palette: CHRONO_TEAL_PALETTE,
        light: 1.45,
        extra: { isShatter: false }
      });
      game?.vfx?.spawnShockwave?.(
        this.eternalTargetX,
        this.eternalTargetY - 94,
        220,
        '#2dd4bf',
        0.38,
        false,
        true
      );
      game?.vfx?.spawnDamageText?.(
        this.eternalTargetX,
        this.eternalTargetY - 196,
        0,
        true,
        '★ TIME STOP — ETERNAL ZERO! ★',
        '#2dd4bf'
      );
    }

    // =========================================================================
    // PHASE 3 (`1.15s .. 3.49s`): 6-ANGLE PARADOX CLONE & SUSPENDED GIANT CLOCK-SPEAR
    // BARRAGE IN STOPPED TIME! (ZERO HP damage ticks until `t = 3.50s`!)
    // =========================================================================
    if (t < 3.5) {
      // Keep frozen enemies locked in Stopped Time
      for (const foe of this._frozenEnemiesRef) {
        if (foe && !foe.isDead) {
          foe.chronoTimeStopTimer = Math.max(foe.chronoTimeStopTimer || 0, 3.53 - t);
        }
      }

      const tx = this.eternalTargetX;
      const ty = this.eternalTargetY;
      const aimCenterY = ty - 92;

      const barrageSchedule = [
        { time: 1.32, numeral: 'II', ox: 168, oy: -148, variant: 'future', pose: 253 },
        { time: 1.66, numeral: 'X', ox: -168, oy: -148, variant: 'past', pose: 255 },
        { time: 2.0, numeral: 'IV', ox: 196, oy: -54, variant: 'future', pose: 72 },
        { time: 2.34, numeral: 'VIII', ox: -196, oy: -54, variant: 'past', pose: 76 },
        { time: 2.68, numeral: 'VI', ox: 132, oy: 0, variant: 'future', pose: 194 },
        { time: 3.02, numeral: 'XII', ox: -132, oy: -192, variant: 'past', pose: 134 }
      ];

      while (
        this._trueUltBarrageCount < barrageSchedule.length &&
        t >= barrageSchedule[this._trueUltBarrageCount].time
      ) {
        const slot = barrageSchedule[this._trueUltBarrageCount];
        this._trueUltBarrageCount++;

        const warpX = this.clampArenaX(tx + slot.ox, game, 86);
        const warpY = Math.min(this.groundY, Math.max(this.groundY - 235, ty + slot.oy));
        const faceDir = tx >= warpX ? 1 : -1;

        this.x = warpX;
        this.y = warpY;
        this.facing = faceDir;
        this.trueUltFrameOverride = slot.pose;

        if (game?.audio) game.audio.play('clock_gear', warpX);
        game?.renderer?.triggerShake?.(7, 0.12);

        this.fx?.spawn('warpPortalPairRift', warpX, warpY - 90, {
          flip: faceDir < 0,
          palette: slot.variant === 'past' ? CHRONO_BRASS_PALETTE : CHRONO_TEAL_PALETTE,
          light: 1.32,
          extra: { isArrival: true }
        });

        // Frozen Paradox Clone remains poised at this clock sector until Time Resumes!
        this.spawnPhantomClone(warpX, warpY, faceDir, slot.variant, {
          frameIdx: slot.pose,
          maxLife: 0.56,
          holdUntilTimeStopEnd: true,
          romanTag: slot.numeral
        });

        // Lock a Colossal `Row 6` Giant Clock-Hand Spear aimed dead-center at `(tx, aimCenterY)`!
        const spearOriginX = warpX + faceDir * 44;
        const spearOriginY = warpY - 94;
        const aimAngle = Math.atan2(aimCenterY - spearOriginY, tx - spearOriginX);
        this.suspendedClockSpears.push({
          x: spearOriginX,
          y: spearOriginY,
          originX: spearOriginX,
          originY: spearOriginY,
          targetX: tx,
          targetY: aimCenterY,
          angle: aimAngle,
          numeral: slot.numeral,
          variant: slot.variant,
          spawnTime: t,
          launched: false,
          launchProgress: 0
        });

        game?.vfx?.spawnGlyphBurst?.(spearOriginX, spearOriginY, 5, 'chrono');
      }

      // `3.22s .. 3.49s`: Chronos teleports out to Sovereign Vantage holding `Row 4 F16..F18` (`136..138`)
      // just before snapping his fingers to resume time!
      if (t >= 3.22 && this._trueUltStage === 1) {
        this._trueUltStage = 2;
        const vantageX = this.clampArenaX(
          tx - this._eternalStartFacing * 208,
          game,
          96
        );
        this.x = vantageX;
        this.y = this.groundY - 34;
        this.facing = tx >= this.x ? 1 : -1;
        this.trueUltFrameOverride = 136;

        if (game?.audio) game.audio.play('time_rewind', this.x);
        this.fx?.spawn('warpPortalPairRift', this.x, this.y - 92, {
          flip: this.facing < 0,
          palette: CHRONO_BRASS_PALETTE,
          light: 1.36,
          extra: { isArrival: true }
        });
        game?.vfx?.spawnDamageText?.(
          this.x,
          this.y - 166,
          0,
          true,
          'ZERO HOUR... SNAP!',
          '#fde047'
        );
      } else if (t >= 3.22) {
        const subU = clamp01Local((t - 3.22) / 0.27);
        this.trueUltFrameOverride = 136 + Math.min(2, Math.floor(subU * 3));
      }

      return;
    }

    // =========================================================================
    // PHASE 4 (`t = 3.50s`): `"★ TIME RESUMES — TWELFTH BELL! ★"`
    // SINGLE INSTANT CATACLYSMIC SHATTER (`395` Crit Damage + `25%` MaxHP Rewind Heal)!
    // =========================================================================
    if (this._trueUltStage < 3) {
      this._trueUltStage = 3;
      const tx = this.eternalTargetX;
      const ty = this.eternalTargetY;
      const impactY = ty - 94;

      // 1. Release Enemy Time-Stop Lock!
      this._releaseAllTimeStoppedEnemies();

      // 2. Launch all 6 Suspended Giant Clock-Spears piercing straight through `(tx, impactY)`!
      for (const sp of this.suspendedClockSpears) {
        sp.launched = true;
        sp.launchProgress = 0;
      }

      // 3. Shatter the Grand XII Astral Clockwork Dome into 36 Pixel Glass-Clock Shards!
      if (this.eternalZeroDome) {
        const dome = this.eternalZeroDome;
        dome.shattered = true;
        for (let i = 0; i < 36; i++) {
          const ang = (i / 36) * Math.PI * 2 + (i % 2) * 0.08;
          const rStart = 42 + (i % 4) * 44;
          const spd = 165 + (i % 5) * 62;
          this.shatterClockShards.push({
            x: dome.x + Math.cos(ang) * rStart,
            y: dome.y + Math.sin(ang) * rStart * 0.85,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd - 65,
            size: i % 3 === 0 ? 12 : 9,
            isGold: i % 3 === 0,
            age: 0,
            maxLife: 0.72 + (i % 4) * 0.08
          });
        }
      }

      // 4. Colossal `Row 7` `twelfthBellCataclysmCell` + `Row 5` Cross-Slash + `chrono` Anime Impact Frame!
      if (game?.audio) {
        game.audio.play('time_shatter', tx);
      }
      game?.renderer?.triggerImpactFrame?.(tx, impactY, 0.18, 'chrono');
      game?.renderer?.triggerShake?.(28, 0.58);
      game?.renderer?.triggerAberration?.(14);
      game?.renderer?.triggerHitStop?.(0.11);

      this.fx?.spawn('eternalZeroClockPulse', tx, impactY, {
        palette: CHRONO_BRASS_PALETTE,
        light: 1.52,
        extra: { isShatter: true }
      });
      this.fx?.spawn('chronoTimeRiftSlash', tx, impactY, {
        palette: CHRONO_TEAL_PALETTE,
        light: 1.45,
        extra: { radius: 44 }
      });

      this.spawnVfxAnim(7, tx, impactY, 384, 384, 0.56, {
        glowColor: 'gold',
        inFront: true
      });
      this.spawnVfxAnim(7, tx, impactY, 264, 264, 0.42, {
        flipX: true,
        glowColor: 'teal',
        inFront: true
      });
      this.spawnVfxAnim(5, tx, impactY, 312, 312, 0.4, {
        glowColor: 'gold',
        inFront: true
      });

      game?.vfx?.spawnShockwave?.(tx, this.groundY - 4, 265, '#fde047', 0.46, true);
      game?.vfx?.spawnShockwave?.(tx, impactY, 240, '#2dd4bf', 0.42, false, true);
      game?.vfx?.spawnBurst?.(tx, impactY, 32, '#2dd4bf', 340, { upBias: 110, size: 7 });
      game?.vfx?.spawnBurst?.(tx, impactY, 26, '#fde047', 310, { upBias: 95, size: 6 });
      game?.vfx?.spawnGlyphBurst?.(tx, impactY, 16, 'chrono');

      // 5. Heal Chronos `12%` of `maxHp` via Temporal Rewind!
      const rewindUltHeal = Math.round(this.maxHp * 0.12);
      this.heal(rewindUltHeal, 'TEMPORAL REWIND');
      this.spawnRewindRibbons(tx, impactY);

      // 6. ONE SINGLE SIMULTANEOUS CATACLYSMIC BURST (`680` Crit Damage)!
      game?.vfx?.spawnDamageText?.(
        tx,
        impactY - 122,
        0,
        true,
        '★ TWELFTH BELL — TIME SHATTER! ★',
        '#fde047'
      );

      const postFreezeFoes = this.getActiveEnemies(enemy, game);
      for (const foe of postFreezeFoes) {
        foe.takeDamage(680, this, true, 245, -215);
      }
    }

    // Advance Piercing Spear Streaks (`3.50s .. 3.78s`) & Smooth Descent (`3.50s .. 4.55s`)
    const postU = clamp01Local((t - 3.5) / Math.max(0.1, dur - 3.5));
    this.y = this.groundY - Math.round(34 * Math.max(0, 1 - postU * 1.45));
    this.trueUltFrameOverride = 139 + Math.min(10, Math.floor(postU * 11));

    for (let i = this.suspendedClockSpears.length - 1; i >= 0; i--) {
      const sp = this.suspendedClockSpears[i];
      sp.launchProgress += dt / 0.24;
      const lu = Math.min(1.35, sp.launchProgress);
      const dx = sp.targetX - sp.originX;
      const dy = sp.targetY - sp.originY;
      sp.x = sp.originX + dx * (lu * 1.38);
      sp.y = sp.originY + dy * (lu * 1.38);
      if (sp.launchProgress >= 1.15) {
        this.suspendedClockSpears.splice(i, 1);
      }
    }

    if (this.eternalZeroDome) {
      this.eternalZeroDome.alpha = Math.max(0, 1 - postU * 2.4);
    }

    if (t >= dur) {
      this._releaseAllTimeStoppedEnemies();
      this._trueUltInit = false;
      this.trueUltFrameOverride = null;
      this.isInvulnerable = false;
      this.unstoppablePoise = false;
      this.eternalZeroDome = null;
      this.suspendedClockSpears = [];
      this.y = this.groundY;
      this.setState('IDLE');
    }
  }

  // ============================================================================
  // BESPOKE HD-2D PIXEL-ART RENDERING (`drawForegroundOverlay` + `drawUltimateForeground`)
  // ============================================================================

  drawBloomedVfxCell(
    ctx,
    vfxSheet,
    row,
    col,
    x,
    y,
    w = 208,
    h = 208,
    alpha = 1.0,
    flipX = false,
    renderer = null,
    glowColor = 'teal',
    angleRad = 0
  ) {
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth || alpha <= 0.01) return;
    const cell = 208;
    const sx = Math.max(0, Math.min(29, Math.floor(col))) * cell;
    const sy = Math.max(0, Math.min(7, Math.floor(row))) * cell;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(x), Math.round(y));
    if (angleRad !== 0) {
      ctx.rotate(angleRad);
    } else if (flipX) {
      ctx.scale(-1, 1);
    }

    const glowSprite =
      glowColor === 'gold'
        ? renderer?.glowGold || renderer?.glowTeal
        : glowColor === 'white'
          ? renderer?.glowWhite || renderer?.glowTeal
          : renderer?.glowTeal || renderer?.glowGold;
    if (glowSprite) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, alpha * 0.4);
      const gw = Math.round(w * 1.14);
      const gh = Math.round(h * 1.14);
      ctx.drawImage(glowSprite, -gw * 0.5, -gh * 0.5, gw, gh);
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.drawImage(vfxSheet, sx, sy, cell, cell, -w * 0.5, -h * 0.5, w, h);

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, alpha * 0.44);
    ctx.drawImage(vfxSheet, sx, sy, cell, cell, -w * 0.5, -h * 0.5, w, h);

    ctx.restore();
  }

  /**
   * Draws the Pixel-Stepped Grand XII Astral Clockwork Dome (`TRUE_ULTIMATE` Phases 1..3):
   * - Translucent midnight-indigo temporal veil (never replaces the stage!)
   * - Counter-rotating 3px-stepped Brass & Cyan pixel gear rings (ZERO smooth vector `ctx.arc`!)
   * - 12 Glowing Roman Numeral Hour Plates (`I .. XII` via `PixelFont.drawCentered`)
   * - Ticking Giant Pixel-Stepped Brass Hour & Cyan-White Minute Hands!
   */
  drawEternalZeroClockDome(ctx, vfxSheet, renderer = null) {
    const dome = this.eternalZeroDome;
    if (!dome || dome.alpha <= 0.02) return;

    const px = 3;
    const snap = (v) => Math.round(v / px) * px;
    const cx = snap(dome.x);
    const cy = snap(dome.y);
    const R = dome.radius;
    const fade = dome.alpha;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    if (!dome.shattered) {
      // 1. Translucent Pixel-Stepped Midnight-Indigo Astral Clockface Backdrop (preserves real arena underneath!)
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = dome.timeStopped ? 'rgba(4, 15, 28, 0.52)' : 'rgba(6, 14, 28, 0.42)';
      for (let dy = -R; dy <= R; dy += px * 2) {
        const span = Math.sqrt(Math.max(0, R * R - dy * dy));
        const x0 = snap(cx - span);
        const x1 = snap(cx + span);
        if (x1 > x0) {
          ctx.fillRect(x0, snap(cy + dy), x1 - x0, px * 2);
        }
      }

      // 2. Spinning `Row 3` `chronoHorologiumSealCell` at the Heart of the Dome
      if (vfxSheet?.complete) {
        const col = dome.timeStopped ? 0 : Math.floor(dome.phase * 24) % 30;
        this.drawBloomedVfxCell(
          ctx,
          vfxSheet,
          3,
          col,
          cx,
          cy,
          376,
          376,
          fade * 0.72,
          false,
          renderer,
          dome.timeStopped ? 'teal' : 'gold'
        );
      }

      // 3. Pixel-Stepped Counter-Rotating Outer Brass Escapement Ring & Inner Cyan Chapter Ring
      const rotStep = dome.timeStopped ? 0 : dome.phase * 0.75;
      const ringSteps = 96;
      for (let i = 0; i < ringSteps; i++) {
        const a = (i / ringSteps) * Math.PI * 2 + rotStep;
        const isCog = i % 4 < 2;
        const rOut = R + (isCog ? 6 : 0);
        const rx = snap(cx + Math.cos(a) * rOut);
        const ry = snap(cy + Math.sin(a) * rOut);
        ctx.fillStyle = '#050814';
        ctx.fillRect(rx - px, ry - px, px * 3, px * 3);
        ctx.fillStyle = isCog ? '#fde047' : '#d97706';
        ctx.fillRect(rx, ry, px, px);

        const aIn = (i / ringSteps) * Math.PI * 2 - rotStep * 1.4;
        const rxIn = snap(cx + Math.cos(aIn) * (R - 54));
        const ryIn = snap(cy + Math.sin(aIn) * (R - 54));
        ctx.fillStyle = i % 3 === 0 ? '#ffffff' : '#2dd4bf';
        ctx.fillRect(rxIn, ryIn, px, px);
      }

      // 4. 12 Glowing Roman Numeral Hour Plates (`XII, I .. XI`) via `PixelFont.drawCentered`!
      for (let h = 0; h < 12; h++) {
        const ang = -Math.PI * 0.5 + (h / 12) * Math.PI * 2;
        const nx = snap(cx + Math.cos(ang) * (R - 26));
        const ny = snap(cy + Math.sin(ang) * (R - 26));
        const isMidnight = h === 0;
        const isCardinal = h % 3 === 0;
        const mainCol = isMidnight
          ? '#fde047'
          : dome.timeStopped
            ? '#99f6e4'
            : isCardinal
              ? '#facc15'
              : '#2dd4bf';
        PixelFont.drawCentered(
          ctx,
          ROMAN_CLOCK_HOURS[h],
          nx,
          ny,
          isMidnight ? 3 : 2,
          mainCol,
          '#ffffff',
          true
        );
      }

      // 5. Giant Pixel-Stepped Brass Hour Hand & Cyan-White Minute Hand Ticking to `XII`!
      const drawSteppedClockHand = (deg, len, mainHex, rimHex) => {
        const rad = (deg * Math.PI) / 180;
        const ux = Math.cos(rad);
        const uy = Math.sin(rad);
        ctx.fillStyle = '#050814';
        for (let s = -18; s <= len; s += px) {
          const hx = snap(cx + ux * s);
          const hy = snap(cy + uy * s);
          ctx.fillRect(hx - px, hy - px, px * 3, px * 3);
        }
        for (let s = -15; s <= len; s += px) {
          const hx = snap(cx + ux * s);
          const hy = snap(cy + uy * s);
          ctx.fillStyle = s > len - 18 ? '#ffffff' : s % (px * 3) === 0 ? rimHex : mainHex;
          ctx.fillRect(hx, hy, px, px);
        }
      };

      drawSteppedClockHand(dome.hourHandDeg, R - 78, '#facc15', '#fef08a');
      drawSteppedClockHand(dome.minuteHandDeg, R - 38, '#2dd4bf', '#ffffff');

      // Central Horological Pivot Jewel
      ctx.fillStyle = '#050814';
      ctx.fillRect(cx - px * 2, cy - px * 2, px * 5, px * 5);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(cx - px, cy - px, px * 3, px * 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx, cy, px, px);
    }

    ctx.restore();
  }

  /**
   * Renders Chronos's Temporal Paradox Clones (`this.phantomClones`) using un-rotated `208x208`
   * `chronomancer_sheet.png` cells + crisp Cyan (`#2dd4bf`) or Gold (`#facc15`) silhouette bloom!
   */
  drawPhantomClonesPass(ctx, sprites, vfxSheet, renderer, inFrontPass = false) {
    if (!this.phantomClones.length || !sprites?.sheet?.complete) return;

    for (const c of this.phantomClones) {
      if (Boolean(c.inFront) !== inFrontPass) continue;
      const u = clamp01Local(c.age / Math.max(0.05, c.maxLife));
      const alpha = c.holdUntilTimeStopEnd && this.state === 'TRUE_ULTIMATE' && this.stateTimer < 3.5
        ? 0.94
        : u < 0.12
          ? u / 0.12
          : Math.max(0, 1 - (u - 0.12) / 0.88);
      if (alpha <= 0.02) continue;

      const frameIdx =
        c.frameIdx !== null && c.frameIdx !== undefined
          ? c.frameIdx
          : c.startFrame + Math.min(
              Math.max(0, c.endFrame - c.startFrame),
              Math.floor(u * (c.endFrame - c.startFrame + 1))
            );

      const isPast = c.variant === 'past';
      const tintMain = isPast ? '#facc15' : '#2dd4bf';
      const tintRim = isPast ? '#fef08a' : '#99f6e4';

      // Spinning Astrolabe Seal (`Row 1`) beneath/behind the Paradox Clone
      if (vfxSheet?.complete) {
        const gearCol = Math.floor(this.chronoPhase * 12) % 30;
        this.drawBloomedVfxCell(
          ctx,
          vfxSheet,
          1,
          gearCol,
          c.x,
          c.y - 88,
          112,
          112,
          alpha * 0.68,
          c.facing < 0,
          renderer,
          isPast ? 'gold' : 'teal'
        );
      }

      // ZERO `ctx.rotate` on character sprites — strictly integer-snapped `translate` + horizontal `scale`!
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(Math.round(c.x), Math.round(c.y + 4));
      ctx.scale(c.facing, 1);

      // Pass 1: Crisp Handcrafted Pixel Armor & Clock-Blades
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = alpha * 0.78;
      PixelForge.drawAfterimageFrame(ctx, sprites, frameIdx, 208, 208);

      // Pass 2: Luminous Cyan (Future) or Burnished Gold (Past) Temporal Aura Tint
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha * 0.52;
      PixelForge.drawSilhouetteFrame(ctx, sprites, frameIdx, 208, 208, tintMain);

      ctx.translate(-2, 0);
      ctx.globalAlpha = alpha * 0.26;
      PixelForge.drawSilhouetteFrame(ctx, sprites, frameIdx, 208, 208, tintRim);

      ctx.restore();
    }
  }

  /**
   * 2.5D Background & Mid-Ground Pass (rendered behind fighters)
   */
  drawForegroundOverlay(ctx, renderer = null) {
    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    const sprites = typeof Image !== 'undefined' ? PixelForge.initAssets()?.chronomancer : null;
    const vfxSheet = sprites?.vfx;

    // 1. Grand XII Astral Clockwork Dome (`TRUE_ULTIMATE`) behind fighters while keeping the real stage visible!
    if (this.eternalZeroDome) {
      this.drawEternalZeroClockDome(ctx, vfxSheet, renderer);
    }

    // 2. Live 120Hz `ArcaneShaderFX` "back" layer
    this.fx?.renderLayer(ctx, 'back', arenaCenterX, this.groundY, 0.96);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 3. Overdrive (`ULTIMATE`) Grand Horologium (`Row 3` `chronoHorologiumSealCell`)
    if (this.triHorologium && vfxSheet?.complete) {
      const th = this.triHorologium;
      const pop = Math.min(1, th.life / 0.2);
      const fade = Math.min(1, (th.maxLife - th.life) * 3.2);
      const size = Math.round(332 * (0.8 + 0.2 * pop));
      const col = Math.floor(th.life * 24) % 30;
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        3,
        col,
        th.x,
        th.y,
        size,
        size,
        fade * 0.92,
        false,
        renderer,
        'teal'
      );
    }

    // 4. Skill: Planted Spinning `Row 1` Past-Timeline Anchor & Pixel-Stepped Golden Tether!
    if (this.anchorActive && vfxSheet?.complete) {
      const col = Math.floor(this.chronoPhase * 14) % 30;
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        1,
        col,
        this.anchorX,
        this.anchorY - 76,
        164,
        164,
        0.95,
        false,
        renderer,
        'gold'
      );

      // Pixel-stepped cut golden temporal tether from Anchor to Chronos
      const px = 3;
      const snap = (v) => Math.round(v / px) * px;
      const ax = snap(this.anchorX);
      const ay = snap(this.anchorY - 78);
      const bx = snap(this.x);
      const by = snap(this.y - 88);
      const dist = Math.hypot(bx - ax, by - ay);
      if (dist > 28) {
        const ux = (bx - ax) / dist;
        const uy = (by - ay) / dist;
        for (let d = 18; d < dist - 18; d += 21) {
          for (let s = 0; s < 12 && d + s < dist - 18; s += px) {
            const tx = snap(ax + ux * (d + s));
            const ty = snap(ay + uy * (d + s));
            ctx.fillStyle = '#050814';
            ctx.fillRect(tx - px, ty - px, px * 3, px * 3);
            ctx.fillStyle = s === 0 ? '#ffffff' : '#facc15';
            ctx.fillRect(tx, ty, px, px);
          }
        }
      }
    }

    // 5. Skill: `3.8s` Time-Dilation Stasis Hourglass Field (`Row 2` `chronoHourglassMonolithCell`)
    if (this.stasisField && vfxSheet?.complete) {
      const sf = this.stasisField;
      const u = sf.life / sf.maxLife;
      let col;
      if (sf.life < 0.24) {
        col = Math.min(6, Math.floor((sf.life / 0.24) * 7));
      } else if (sf.life < sf.maxLife - 0.28) {
        col = 7 + (Math.floor((sf.life - 0.24) * 18) % 15);
      } else {
        const su = (sf.life - (sf.maxLife - 0.28)) / 0.28;
        col = 22 + Math.min(7, Math.floor(su * 8));
      }
      const fade = u > 0.9 ? Math.max(0, (1 - u) / 0.1) : 1;
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        2,
        col,
        sf.x,
        sf.y - 102,
        224,
        224,
        fade * 0.9,
        false,
        renderer,
        'teal'
      );
    }

    // 6. Departure & Arrival Wormhole Portals (`Row 3`)
    if ((this.warpPortalTimer > 0 || this.isChronoWarp) && vfxSheet?.complete) {
      const fade = Math.min(1, Math.max(0.15, this.warpPortalTimer / 0.22));
      const col = Math.floor(this.chronoPhase * 12) % 30;
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        3,
        col,
        this.warpOriginX,
        this.groundY - 94,
        160,
        160,
        fade * 0.86,
        false,
        renderer,
        'teal'
      );
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        3,
        col,
        this.warpTargetX,
        this.groundY - 94,
        172,
        172,
        fade * 0.9,
        true,
        renderer,
        'gold'
      );
    }

    // 7. Temporal Echoes & Mid-Ground Paradox Clones (`this.phantomClones`)
    if (this.temporalEchoes.length > 0 && sprites?.sheet?.complete) {
      for (const ec of this.temporalEchoes) {
        const fade = Math.max(0, 1 - ec.life / ec.maxLife);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(Math.round(ec.x / 4) * 4, Math.round((ec.y + 4) / 4) * 4);
        ctx.scale(ec.facing, 1);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade * 0.42;
        PixelForge.drawAfterimageFrame(ctx, sprites, ec.frameIdx, 208, 208);
        ctx.restore();
      }
    }

    this.drawPhantomClonesPass(ctx, sprites, vfxSheet, renderer, false);

    // 8. Signature Floating Twin Escapement Shoulder Cogs (`Row 1` `chronoAstrolabeWheelCell`)
    if (!this.isDead && vfxSheet?.complete) {
      const col = Math.floor(this.chronoPhase * 10) % 30;
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        1,
        col,
        this.x - this.facing * 42,
        this.y - 128 + Math.round(Math.sin(this.chronoPhase * 1.3) * 3) * 2,
        68,
        68,
        0.9,
        false,
        renderer,
        'teal'
      );
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        1,
        (col + 15) % 30,
        this.x + this.facing * 36,
        this.y - 146 + Math.round(Math.cos(this.chronoPhase * 1.3) * 3) * 2,
        58,
        58,
        0.9,
        true,
        renderer,
        'gold'
      );
    }

    // 9. Background `chronomancer_vfx.png` cell animations
    if (this.activeVfxAnims.length > 0 && vfxSheet?.complete) {
      for (const v of this.activeVfxAnims) {
        if (v.inFront) continue;
        const u = clamp01Local(v.age / v.maxLife);
        const span = Math.max(1, v.endFrame - v.startFrame + 1);
        const col = Math.min(29, v.startFrame + Math.floor(u * span));
        const fade = u < 0.12 ? u / 0.12 : u > 0.78 ? (1 - u) / 0.22 : 1.0;
        this.drawBloomedVfxCell(
          ctx,
          vfxSheet,
          v.row,
          col,
          v.x,
          v.y,
          v.w,
          v.h,
          fade * 0.9,
          v.flipX,
          renderer,
          v.glowColor,
          v.angleRad || 0
        );
      }
    }

    ctx.restore();
  }

  /**
   * 2.5D Foreground & Ultimate Pass (rendered in front of fighters)
   */
  drawUltimateForeground(ctx, renderer = null) {
    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    const sprites = typeof Image !== 'undefined' ? PixelForge.initAssets()?.chronomancer : null;
    const vfxSheet = sprites?.vfx;

    // 1. Foreground Paradox Clones (if any flagged `inFront`)
    this.drawPhantomClonesPass(ctx, sprites, vfxSheet, renderer, true);

    // 2. Live 120Hz `ArcaneShaderFX` "front" layer
    this.fx?.renderLayer(ctx, 'front', arenaCenterX, this.groundY, 0.98);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 3. Frozen Enemy Horological Stasis Lock Brackets (`TRUE_ULTIMATE` Phases 2..3)
    if (this._frozenEnemiesRef && this._frozenEnemiesRef.length > 0) {
      const px = 3;
      const snap = (v) => Math.round(v / px) * px;
      for (const foe of this._frozenEnemiesRef) {
        if (!foe || foe.isDead || !(foe.chronoTimeStopTimer > 0)) continue;
        const fx = snap(foe.x);
        const fy = snap(foe.y - 94);
        const r = 46;
        const arm = 15;
        for (const sx of [-1, 1]) {
          for (const sy of [-1, 1]) {
            const cx = fx + sx * r;
            const cy = fy + sy * r;
            const hx = sx < 0 ? cx : cx - arm;
            const vy = sy < 0 ? cy : cy - arm;
            ctx.fillStyle = '#050814';
            ctx.fillRect(hx - px, cy - px, arm + px * 3, px * 3);
            ctx.fillRect(cx - px, vy - px, px * 3, arm + px * 3);
            ctx.fillStyle = '#2dd4bf';
            ctx.fillRect(hx, cy, arm + px, px);
            ctx.fillRect(cx, vy, px, arm + px);
            ctx.fillStyle = '#fde047';
            ctx.fillRect(cx, cy, px, px);
          }
        }
      }
    }

    // 4. `TRUE_ULTIMATE` Phase 3 & 4: 6 Colossal Suspended Giant Clock-Hand Spears (`Row 6` `suspendedClockSpearCell`)!
    //    `ctx.rotate(sp.angle)` is applied ONLY to the `Row 6` VFX spear cell — NEVER to character sprites!
    if (this.suspendedClockSpears.length > 0 && vfxSheet?.complete) {
      const px = 3;
      const snap = (v) => Math.round(v / px) * px;

      for (let i = 0; i < this.suspendedClockSpears.length; i++) {
        const sp = this.suspendedClockSpears[i];
        const age = Math.max(0, (this.stateTimer || 0) - sp.spawnTime);
        const pop = Math.min(1, age / 0.12);
        const tremor = sp.launched
          ? 0
          : Math.round(Math.sin((this.stateTimer || 0) * 58 + i * 1.7) * 2);

        // Pixel-Stepped Sightline from Suspended Clock-Spear to Frozen Target before Shatter
        if (!sp.launched) {
          const dx = sp.targetX - sp.x;
          const dy = sp.targetY - sp.y;
          const dist = Math.hypot(dx, dy) || 1;
          const ux = dx / dist;
          const uy = dy / dist;
          for (let d = 54; d < dist - 24; d += 24) {
            for (let s = 0; s < 12 && d + s < dist - 24; s += px) {
              const lx = snap(sp.x + ux * (d + s));
              const ly = snap(sp.y + uy * (d + s));
              ctx.fillStyle = '#050814';
              ctx.fillRect(lx - px, ly - px, px * 3, px * 3);
              ctx.fillStyle = sp.variant === 'past' ? '#fde047' : '#2dd4bf';
              ctx.fillRect(lx, ly, px, px);
            }
          }
        }

        const spearCol = Math.floor(((this.stateTimer || 0) * 30 + i * 5)) % 30;
        const spearW = Math.round(244 * (0.75 + 0.25 * pop));
        const spearH = Math.round(224 * (0.75 + 0.25 * pop));
        const fade = sp.launched ? Math.max(0, 1 - sp.launchProgress * 0.75) : 1.0;

        this.drawBloomedVfxCell(
          ctx,
          vfxSheet,
          6,
          spearCol,
          sp.x + tremor,
          sp.y,
          spearW,
          spearH,
          fade,
          false,
          renderer,
          sp.variant === 'past' ? 'gold' : 'teal',
          sp.angle
        );

        // Crisp Roman Numeral Sector Badge (`II`, `X`, `IV`, `VIII`, `VI`, `XII`) above Spear Escapement Hilt!
        if (!sp.launched && sp.numeral) {
          const badgeX = snap(sp.x - Math.cos(sp.angle) * 52);
          const badgeY = snap(sp.y - Math.sin(sp.angle) * 52 - 22);
          PixelFont.drawCentered(
            ctx,
            sp.numeral,
            badgeX,
            badgeY,
            2,
            sp.variant === 'past' ? '#fde047' : '#99f6e4',
            '#ffffff',
            true
          );
        }
      }
    }

    // 5. `TRUE_ULTIMATE` Phase 4: 36 Exploding Pixel Glass-Clock Shards!
    if (this.shatterClockShards.length > 0) {
      const px = 3;
      const snap = (v) => Math.round(v / px) * px;
      for (const sh of this.shatterClockShards) {
        const u = clamp01Local(sh.age / sh.maxLife);
        if (u >= 1) continue;
        const sx = snap(sh.x);
        const sy = snap(sh.y);
        const s = u > 0.65 ? px : px * 2;
        ctx.globalAlpha = 1 - u * 0.85;
        ctx.fillStyle = '#050814';
        ctx.fillRect(sx - s, sy - s, s * 3, s * 3);
        ctx.fillStyle = sh.isGold ? '#facc15' : '#2dd4bf';
        ctx.fillRect(sx - px, sy, s + px, px);
        ctx.fillRect(sx, sy - px, px, s + px);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx, sy, px, px);
      }
      ctx.globalAlpha = 1;
    }

    // 6. Foreground 30fps `chronomancer_vfx.png` cell bursts (`Row 0`, `Row 4`, `Row 5`, `Row 7`)
    if (this.activeVfxAnims.length > 0 && vfxSheet?.complete) {
      for (const v of this.activeVfxAnims) {
        if (!v.inFront) continue;
        const u = clamp01Local(v.age / v.maxLife);
        const span = Math.max(1, v.endFrame - v.startFrame + 1);
        const col = Math.min(29, v.startFrame + Math.floor(u * span));
        const fade = u < 0.1 ? u / 0.1 : u > 0.78 ? (1 - u) / 0.22 : 1.0;
        this.drawBloomedVfxCell(
          ctx,
          vfxSheet,
          v.row,
          col,
          v.x,
          v.y,
          v.w,
          v.h,
          fade * 0.96,
          v.flipX,
          renderer,
          v.glowColor,
          v.angleRad || 0
        );
      }
    }

    ctx.restore();
  }

  draw(ctx, isReflection = false, renderer = null) {
    const sprites = typeof Image !== 'undefined' ? PixelForge.initAssets()?.chronomancer : null;
    if (!sprites) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const w = 208;
    const h = 208;
    const frameIdx = PixelForge.getFrameIndex(this, this.walkPhase);
    const groundPlantOffset = 4;

    if (
      !isReflection &&
      !this.isDead &&
      (this.state === 'DODGE' || this.state === 'JUMP' || this.state === 'DASH')
    ) {
      const trailSign = this.dashDir || this.facing;
      for (let g = 2; g >= 1; g--) {
        ctx.save();
        ctx.globalAlpha = g === 2 ? 0.16 : 0.28;
        ctx.translate(
          Math.round(this.x - trailSign * g * 22),
          Math.round(this.y + groundPlantOffset + (this.isFlipVault ? g * 4 : 0))
        );
        ctx.scale(this.facing, 1);
        PixelForge.drawAfterimageFrame(ctx, sprites, Math.max(0, frameIdx - g), w, h);
        ctx.restore();
      }
    }

    // ZERO `ctx.rotate` on character sprites!
    ctx.translate(Math.round(this.x), Math.round(this.y + groundPlantOffset));
    ctx.scale(this.facing, 1);

    PixelForge.drawSheetFrame(ctx, sprites, this, w, h, this.walkPhase, isReflection, renderer);

    if (this.hitFlash > 0 && !isReflection) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5;
      PixelForge.drawGhostFrame(ctx, sprites, frameIdx, w, h);
    }

    ctx.restore();
  }
}

function clamp01Local(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
