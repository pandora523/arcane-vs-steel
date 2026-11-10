import { Fighter } from './Fighter.js?v=30fps57';
import { PixelForge } from '../engine/PixelForge.js?v=30fps57';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps57';
import {
  CHRONO_EFFECT_REGISTRY,
  CHRONO_TEAL_PALETTE,
  CHRONO_BRASS_PALETTE
} from '../engine/shaders/chronoShaders.js?v=30fps57';

/**
 * Zephyros (`chronomancer`) — Grand Horologist & Temporal Sovereign.
 * Powered natively by `ArcaneShaderFX` (dual-buffer 120Hz HD-2D 2.5D shader & particle engine)
 * + `assets/sprites/chronomancer_sheet.png` & `assets/sprites/chronomancer_vfx.png`.
 */
export class Chronomancer extends Fighter {
  constructor(x, groundY, facing = 1) {
    const opts = typeof x === 'object' && x !== null ? x : { x, groundY, facing };
    super({
      ...opts,
      name: opts.name || 'Zephyros',
      maxHp: 1205,
      attackRange: 510,
      moveSpeed: 168,
      autoInterval: 1.09,
      lightColor: 'rgba(45, 212, 191, 1)',
      primaryColor: '#2dd4bf'
    });
    this.heroId = 'chronomancer';
    this.theme = 'chrono';
    this.deathSfx = 'death_chrono';
    this.skillMaxCooldown = 5.15;
    this.skillTriggerRange = 540;
    this.skillName = 'HOURGLASS STASIS';
    this.ultName = 'DOOMSDAY MIDNIGHT';
    this.comboStep = 0;
    this.stepDustTimer = 0;
    this.chronoPhase = 0;

    // 100% Bespoke Chronomancer Visual State (rendered via ArcaneShaderFX 2.5D layers + chronomancer_vfx.png)
    this.stasisHourglass = null;
    this.doomsdayClock = null;
    this.temporalEchoes = [];
    this.rewindRibbons = [];
    this.activeVfxAnims = [];

    // Native 120Hz dual-buffer HD-2D Horological Shader & Particle Runtime (`back` + `front` 2.5D layers)
    this.fx = new ArcaneShaderFX(CHRONO_EFFECT_REGISTRY, {
      pixelScale: 3,
      viewW: 440,
      viewH: 220
    });

    if (typeof Image !== 'undefined') {
      const chronoAssets = PixelForge.initAssets()?.chronomancer;
      if (chronoAssets?.vfx?.src && !chronoAssets.vfx.src.includes('v=30fps53')) {
        chronoAssets.vfx.src = 'assets/sprites/chronomancer_vfx.png?v=30fps57';
      }
    }

    this.didStasisCast = false;
    this.didStasisShatter = false;
    this.ultStage = 0;
    this.dodgeMaxCooldown = 3.12;
    this.dashMaxCooldown = 3.10;
    this.isChronoWarp = false;
    this.didChronoWarp = false;
    this.warpOriginX = this.x;
    this.warpTargetX = this.x;
    this.warpPortalTimer = 0;
    this.wallFlipCooldown = 0;
    this.crouchCooldown = 0;
    this.crouchDuration = 0.96;
    this.isCrouching = false;
    this.isFlipVault = false;
    this.flipStartX = this.x;
    this.flipTargetX = this.x;
    this.flipAngle = 0;
    this._deathBurstTriggered = false;
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
        light: 1.16
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
      startFrame: opts.startFrame || 0,
      endFrame: opts.endFrame !== undefined ? opts.endFrame : 29,
      glowColor: opts.glowColor || 'teal',
      followOwner: Boolean(opts.followOwner),
      offsetX: opts.offsetX || 0,
      offsetY: opts.offsetY || 0,
      inFront: opts.inFront !== undefined ? Boolean(opts.inFront) : true
    });
  }

  onProjectileTrail(p) {
    if (!this.fx || p.type !== 'clock_gear') return;
    if ((p.ringTimer || 0) >= 0.05) {
      p.ringTimer = 0;
      this.fx.burst(p.x - Math.sign(p.vx || 1) * 14, p.y, {
        count: 3,
        speedMin: 24,
        speedMax: 74,
        lifeMin: 0.16,
        lifeMax: 0.28,
        gravity: -16,
        spread: 1.1,
        angle: Math.atan2(-(p.vy || 0), -(p.vx || 1)),
        colors: ['#ffffff', '#99f6e4', '#2dd4bf', '#facc15']
      });
    }
  }

  onProjectileHit(p, _hitTarget, isCrit, game) {
    if (!this.fx) return false;
    const hitAngle = Math.atan2(p.vy || 0, p.vx || 1);
    this.fx.spawn('temporalCrescentRift', p.x, p.y, {
      flip: (p.vx || 1) < 0,
      palette: isCrit ? CHRONO_BRASS_PALETTE : CHRONO_TEAL_PALETTE,
      light: isCrit ? 1.32 : 1.18,
      extra: {
        aimAngle: hitAngle,
        isGold: isCrit,
        radius: isCrit ? 28 : 22,
        width: isCrit ? 11 : 8
      }
    });
    this.spawnVfxAnim(4, p.x, p.y, isCrit ? 196 : 168, isCrit ? 196 : 168, 0.28, {
      flipX: (p.vx || 1) < 0,
      glowColor: isCrit ? 'gold' : 'teal',
      inFront: true
    });
    this.fx.burst(p.x, p.y, {
      count: isCrit ? 18 : 12,
      speedMin: 56,
      speedMax: isCrit ? 215 : 168,
      lifeMin: 0.18,
      lifeMax: 0.38,
      gravity: 72,
      colors: ['#ffffff', '#fde047', '#2dd4bf', '#14b8a6']
    });
    if (game?.vfx) {
      game.vfx.spawnGlyphBurst(p.x, p.y, 5, 'chrono');
    }
    return true;
  }

  takeDamage(amount, attacker, isCrit = false, knockX = 95, knockY = 0) {
    super.takeDamage(amount, attacker, isCrit, knockX, knockY);
    if (this.isDead && !this._deathBurstTriggered) {
      this._deathBurstTriggered = true;
      this.fx?.stopByKey('chronoAstrolabeAura');
      this.fx?.spawn('warpPortalPairRift', this.x, this.groundY - 76, {
        palette: CHRONO_BRASS_PALETTE,
        light: 1.2,
        extra: { isArrival: true }
      });
      this.spawnVfxAnim(4, this.x, this.groundY - 76, 208, 208, 0.38, {
        glowColor: 'gold',
        inFront: true
      });
    }
  }

  startJump(enemy, game, customDir = null) {
    this.dodgeCooldown = this.dodgeMaxCooldown * (0.86 + Math.random() * 0.28);
    this.setState('JUMP');
    this.isInvulnerable = true;
    this.isChronoWarp = false;
    this.isFlipVault = true;
    this.flipStartX = this.x;
    this.flipAngle = 0;
    this.wallFlipCooldown = 3.0;

    const ww = game.renderer ? game.renderer.worldWidth : 1200;
    let dir = customDir !== null ? customDir : -this.facing;
    if (this.x < 180) dir = 1;
    else if (this.x > ww - 180) dir = -1;

    const dist = enemy ? Math.abs(enemy.x - this.x) : 300;
    const retreatX = this.x - this.facing * 260;
    const nearWallOrCornered =
      this.x < 330 ||
      this.x > ww - 330 ||
      retreatX < 190 ||
      retreatX > ww - 190 ||
      dist < 225;

    if (enemy && nearWallOrCornered) {
      this.dashDuration = 0.64;
      const openSideDir = enemy.x < ww * 0.5 ? 1 : -1;
      let target = enemy.x + openSideDir * 350;
      if (Math.abs(target - this.x) < 260) {
        const crossDir = this.x < enemy.x ? 1 : -1;
        target = enemy.x + crossDir * 340;
      }
      this.flipTargetX = Math.max(150, Math.min(ww - 150, target));
      this.dashDir = Math.sign(this.flipTargetX - this.flipStartX) || 1;
      if (game && game.vfx) {
        game.vfx.spawnDamageText(this.x, this.y - 135, 0, false, 'TIME-GLIDE VAULT!', '#2dd4bf');
      }
    } else {
      this.dashDuration = 0.60;
      this.flipTargetX = Math.max(150, Math.min(ww - 150, this.x + dir * 340));
      this.dashDir = dir;
      if (game && game.vfx) {
        game.vfx.spawnDamageText(this.x, this.y - 130, 0, false, 'TIME-GLIDE LEAP!', '#2dd4bf');
      }
    }

    this.vx = 0;
    this.vy = 0;
    this.spawnTemporalEcho(PixelForge.getFrameIndex(this, this.walkPhase));
    this.fx?.spawn('warpPortalPairRift', this.x, this.y - 88, {
      flip: this.facing < 0,
      palette: CHRONO_TEAL_PALETTE,
      light: 1.18,
      extra: { isArrival: false }
    });
    if (game && game.audio) game.audio.play('time_rewind', this.x);
    if (game && game.vfx) {
      game.vfx.spawnShockwave(this.x, this.groundY, 96, '#2dd4bf', 0.32, true);
      game.vfx.spawnGlyphBurst(this.x, this.y - 60, 7, 'chrono');
    }
  }

  startCrouch(enemy, game) {
    this.crouchCooldown = 3.2;
    this.crouchDuration = 0.96;
    this.setState('CROUCH');
    this.isCrouching = true;
    this.isDeflecting = true;
    this.vx = 0;
    this.fx?.spawn('warpPortalPairRift', this.x + this.facing * 36, this.y - 92, {
      follow: this,
      offsetX: 36,
      offsetY: -92,
      flip: this.facing < 0,
      palette: CHRONO_BRASS_PALETTE,
      light: 1.22,
      extra: { isArrival: true }
    });
    if (game && game.vfx) {
      game.vfx.spawnShockwave(this.x, this.groundY - 2, 66, '#2dd4bf', 0.24, true);
      game.vfx.spawnDamageText(this.x, this.y - 122, 0, false, 'ESCAPEMENT SHIELD!', '#facc15');
    }
  }

  /**
   * Rewinds Zephyros's personal timeline to restore lost HP with 2.5D shader bursts & rewind streams
   */
  rewindTimeline(amount, sourceX, sourceY, game, label = 'TIME REWIND') {
    if (this.isDead || amount <= 0) return 0;
    const prevHp = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    const actual = Math.max(1, Math.round(amount));

    if (game && game.vfx) {
      game.vfx.spawnDamageText(this.x, this.y - 146, 0, false, `${label} +${actual}`, '#2dd4bf');
      game.vfx.spawnGlyphBurst(this.x, this.y - 98, 5, 'chrono');
    }

    const fromX = sourceX ?? this.x - this.facing * 110;
    const fromY = sourceY ?? this.y - 98;
    if (this.fx) {
      this.fx.spawn('temporalCrescentRift', this.x, this.y - 98, {
        follow: this,
        offsetX: 0,
        offsetY: -98,
        flip: this.facing < 0,
        palette: CHRONO_BRASS_PALETTE,
        light: 1.22,
        extra: { isGold: true, radius: 24, width: 9 }
      });
      this.fx.burst(fromX, fromY, {
        count: 10,
        speedMin: 45,
        speedMax: 135,
        lifeMin: 0.18,
        lifeMax: 0.36,
        gravity: -28,
        colors: ['#ffffff', '#fde047', '#2dd4bf', '#14b8a6']
      });
    }

    for (let i = 0; i < 5; i++) {
      this.rewindRibbons.push({
        startX: fromX + (Math.random() - 0.5) * 44,
        startY: fromY + (Math.random() - 0.5) * 44,
        arcHeight: (i % 2 === 0 ? -1 : 1) * (40 + Math.random() * 45),
        life: -i * 0.04,
        maxLife: 0.48 + Math.random() * 0.12,
        sparkTimer: 0
      });
    }
    return this.hp - prevHp;
  }

  spawnTemporalEcho(frameIdx) {
    if (this.temporalEchoes.length > 4) this.temporalEchoes.shift();
    this.temporalEchoes.push({
      x: this.x,
      y: this.groundY,
      facing: this.facing,
      frameIdx,
      life: 0,
      maxLife: 0.65
    });
  }

  onStartDash(enemy, game, dir) {
    const ww = game.renderer ? game.renderer.worldWidth : 1200;
    this.dashDuration = 0.38;
    this.isDeflecting = false;
    this.isChronoWarp = false;
    this.isFlipVault = false;
    this.flipAngle = 0;
    const escapeDir = this.x < 240 ? 1 : this.x > ww - 240 ? -1 : dir;
    this.dashDir = escapeDir;
    this.vx = escapeDir * 395;
    this.spawnTemporalEcho(PixelForge.getFrameIndex(this, this.walkPhase));
    this.fx?.spawn('temporalCrescentRift', this.x, this.y - 96, {
      follow: this,
      offsetX: 12,
      offsetY: -96,
      flip: escapeDir < 0,
      palette: CHRONO_TEAL_PALETTE,
      light: 1.18,
      extra: { isGold: false, radius: 24, width: 9 }
    });
    if (game.audio) game.audio.play('time_rewind', this.x);
    game.vfx.spawnGlyphBurst(this.x, this.y - 88, 6, 'chrono');
    game.vfx.spawnDamageText(this.x, this.y - 144, 0, false, 'CHRONO SURGE!', '#2dd4bf');
  }

  onStartDodge(enemy, game, dir) {
    const ww = game.renderer ? game.renderer.worldWidth : 1200;
    const dist = enemy ? Math.abs(enemy.x - this.x) : 999;
    const nearLeft = this.x < 310;
    const nearRight = this.x > ww - 310;
    const pressuredOrCornered = dist < 265 || nearLeft || nearRight;

    this.isDeflecting = false;
    this.isFlipVault = false;
    this.flipAngle = 0;
    this.spawnTemporalEcho(PixelForge.getFrameIndex(this, this.walkPhase));
    if (game.audio) game.audio.play('time_rewind', this.x);

    const isVanguard = enemy && enemy.hasPoise && enemy.attackRange <= 160;
    const isHarvester = enemy && enemy.hasPoise && enemy.attackRange > 160;
    const isGroundedCaster = enemy && !enemy.hasPoise && enemy.moveSpeed <= 122;

    // ★ SIGNATURE CHRONOMANCER GAP-MAKER: "CHRONO PORTAL WARP & STASIS TIME-MINE!"
    if (enemy && pressuredOrCornered) {
      this.isChronoWarp = true;
      this.didChronoWarp = false;
      this.dashDuration = 0.42;
      this.warpPortalTimer = 0.56;
      this.warpOriginX = this.x;
      this.vx = 0;

      const openSideDir = enemy.x < ww * 0.5 ? 1 : -1;
      let targetX = enemy.x + openSideDir * 375;
      if (Math.abs(targetX - this.x) < 250) {
        const crossDir = this.x < enemy.x ? 1 : -1;
        targetX = enemy.x + crossDir * 365;
      }
      this.warpTargetX = Math.max(140, Math.min(ww - 140, targetX));
      this.dashDir = Math.sign(this.warpTargetX - this.warpOriginX) || 1;

      this.fx?.spawn('warpPortalPairRift', this.warpOriginX, this.groundY - 96, {
        flip: this.facing < 0,
        palette: CHRONO_TEAL_PALETTE,
        light: 1.28,
        extra: { isArrival: false }
      });
      this.spawnVfxAnim(4, this.warpOriginX, this.groundY - 96, 184, 184, 0.30, {
        flipX: this.facing < 0,
        glowColor: 'teal',
        inFront: true
      });

      game.vfx.spawnShockwave(this.x, this.y - 96, 118, '#2dd4bf', 0.36, false, true);
      game.vfx.spawnShockwave(this.x, this.groundY, 132, '#facc15', 0.34, true);
      game.vfx.spawnBurst(this.x, this.y - 96, 18, '#2dd4bf', 235);
      game.vfx.spawnGlyphBurst(this.x, this.y - 96, 8, 'chrono');
      game.vfx.spawnDamageText(this.x, this.y - 168, 0, false, 'CHRONO PORTAL WARP!', '#facc15');

      if (!enemy.isDead && dist < 225) {
        const pushDir = Math.sign(enemy.x - this.x) || this.facing;
        enemy.vx = pushDir * 145;
        enemy.takeDamage(16, this, false, 95, -45);
        game.vfx.spawnDamageText(enemy.x, enemy.y - 136, 0, false, 'STASIS MINE!', '#2dd4bf');
      }

      this.rewindTimeline(13, this.x, this.y - 96, game, 'TIME SLIP');
      return;
    }

    this.isChronoWarp = false;
    this.dashDuration = 0.38;
    const smartDir = nearLeft ? 1 : nearRight ? -1 : dir;
    this.dashDir = smartDir;
    this.vx = smartDir * 355;

    this.rewindTimeline(13, this.x, this.y - 96, game, 'TIME SLIP');
    game.vfx.spawnGlyphBurst(this.x, this.y - 88, 7, 'chrono');

    if (enemy && !enemy.isDead) {
      const aimDir = Math.sign(enemy.x - this.x) || this.facing;
      const spawnX = this.x + aimDir * 36;
      const spawnY = this.y - 104;
      const dx = enemy.x - spawnX;
      const dy = (enemy.y - 108) - spawnY;
      const d = Math.hypot(dx, dy) || 1;
      const gearDmg = isVanguard ? 34 : isHarvester ? 36 : isGroundedCaster ? 41 : 44;
      game.vfx.spawnProjectile({
        x: spawnX,
        y: spawnY,
        vx: (dx / d) * 645,
        vy: (dy / d) * 645,
        radius: 19,
        color: '#2dd4bf',
        coreColor: '#facc15',
        owner: this,
        damage: gearDmg,
        type: 'clock_gear'
      });
      this.fx?.spawn('temporalCrescentRift', spawnX, spawnY, {
        flip: aimDir < 0,
        palette: CHRONO_TEAL_PALETTE,
        light: 1.2,
        extra: { aimAngle: Math.atan2(dy, Math.abs(dx)), isGold: false, radius: 24, width: 9 }
      });
    }
  }

  updateDashOrDodge(dt, enemy, game) {
    const t = this.stateTimer;

    // Row 8 (30-frame JUMP — Time-Glide Aerial Vault & apex downward 35-deg Clock-Gear shot, 86px height)
    if ((this.state === 'JUMP' || this.state === 'DODGE') && this.isFlipVault) {
      const u = Math.min(1, t / this.dashDuration);
      const airU = Math.max(0, Math.min(1, (u - 0.10) / 0.76));

      const horizU = airU < 0.35
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

      // Apex downward Clock-Gear volley at Frame F15 (u >= 0.50)
      if (u >= 0.50 && !this.didActionFrame && enemy && !enemy.isDead) {
        this.didActionFrame = true;
        if (game.audio) game.audio.play('clock_gear', this.x);
        const sx = this.x + this.facing * 42;
        const sy = this.y - 108;
        const dx = enemy.x - sx;
        const dy = (enemy.y - 98) - sy;
        const td = Math.hypot(dx, dy) || 1;
        const isVanguard = enemy.hasPoise && enemy.attackRange <= 160;
        const isHarvester = enemy.hasPoise && enemy.attackRange > 160;
        const isGroundedCaster = !enemy.hasPoise && enemy.moveSpeed <= 122;
        const gearDmg = isVanguard ? 34 : isHarvester ? 36 : isGroundedCaster ? 41 : 44;

        game.vfx.spawnProjectile({
          x: sx,
          y: sy,
          vx: (dx / td) * 710,
          vy: (dy / td) * 710,
          radius: 19,
          color: '#2dd4bf',
          coreColor: '#facc15',
          owner: this,
          damage: gearDmg,
          type: 'clock_gear'
        });

        this.fx?.spawn('temporalCrescentRift', sx, sy, {
          flip: this.facing < 0,
          palette: CHRONO_BRASS_PALETTE,
          light: 1.24,
          extra: { aimAngle: Math.atan2(dy, Math.abs(dx)), isGold: true, radius: 26, width: 10 }
        });
        this.spawnVfxAnim(4, sx, sy, 184, 184, 0.28, {
          flipX: this.facing < 0,
          glowColor: 'gold',
          inFront: true
        });

        const shotAng = Math.atan2(dy, dx);
        game.vfx.spawnSlash(sx, sy, 58, shotAng - 0.85, shotAng + 0.85, '#2dd4bf', 0.24);
        game.vfx.spawnShockwave(sx, sy, 64, '#facc15', 0.24, false, false);
        game.vfx.spawnGlyphBurst(sx, sy, 5, 'chrono');
      }

      if (t >= this.dashDuration) {
        this.y = this.groundY;
        this.vy = 0;
        this.isFlipVault = false;
        this.flipAngle = 0;
        this.isInvulnerable = false;
        this.fx?.burst(this.x, this.groundY - 6, {
          count: 10,
          speedMin: 40,
          speedMax: 120,
          gravity: 80,
          colors: ['#ffffff', '#fde047', '#2dd4bf', '#14b8a6']
        });
        game.vfx.spawnShockwave(this.x, this.groundY, 76, '#2dd4bf', 0.26, true);
        this.setState('IDLE');
      }
      return;
    }

    if (this.isChronoWarp) {
      if (t >= 0.13 && !this.didChronoWarp) {
        this.didChronoWarp = true;
        this.x = this.warpTargetX;
        if (enemy) {
          this.facing = enemy.x >= this.x ? 1 : -1;
        }
        this.spawnTemporalEcho(PixelForge.getFrameIndex(this, this.walkPhase));

        // Arrival Dimensional Clockface Rift + Counter Saw-Gear!
        this.fx?.spawn('warpPortalPairRift', this.x, this.groundY - 96, {
          flip: this.facing < 0,
          palette: CHRONO_BRASS_PALETTE,
          light: 1.32,
          extra: { isArrival: true }
        });
        this.spawnVfxAnim(4, this.x, this.groundY - 96, 196, 196, 0.32, {
          flipX: this.facing < 0,
          glowColor: 'gold',
          inFront: true
        });

        game.vfx.spawnShockwave(this.x, this.y - 96, 118, '#facc15', 0.36, false, true);
        game.vfx.spawnShockwave(this.x, this.groundY, 132, '#2dd4bf', 0.34, true);
        game.vfx.spawnBurst(this.x, this.y - 96, 20, '#facc15', 250);
        game.vfx.spawnGlyphBurst(this.x, this.y - 100, 9, 'chrono');

        if (enemy && !enemy.isDead) {
          const isVanguard = enemy.hasPoise && enemy.attackRange <= 160;
          const isHarvester = enemy.hasPoise && enemy.attackRange > 160;
          const isGroundedCaster = !enemy.hasPoise && enemy.moveSpeed <= 122;
          const gearDmg = isVanguard ? 24 : isHarvester ? 26 : isGroundedCaster ? 31 : 34;
          const sx = this.x + this.facing * 44;
          const sy = this.y - 106;
          const dx = enemy.x - sx;
          const dy = (enemy.y - 108) - sy;
          const d = Math.hypot(dx, dy) || 1;
          game.vfx.spawnProjectile({
            x: sx,
            y: sy,
            vx: (dx / d) * 665,
            vy: (dy / d) * 665,
            radius: 19,
            color: '#2dd4bf',
            coreColor: '#facc15',
            owner: this,
            damage: gearDmg,
            type: 'clock_gear'
          });
          this.fx?.spawn('temporalCrescentRift', sx, sy, {
            flip: this.facing < 0,
            palette: CHRONO_TEAL_PALETTE,
            light: 1.22,
            extra: { aimAngle: Math.atan2(dy, Math.abs(dx)), isGold: false, radius: 24, width: 9 }
          });
        }
      }

      if (t >= this.dashDuration) {
        this.isChronoWarp = false;
        this.isDeflecting = false;
        this.isInvulnerable = false;
        this.setState('IDLE');
      }
      return;
    }

    const speed = this.state === 'DASH' ? 380 : 335;
    this.x += this.dashDir * speed * dt;

    if (t >= this.dashDuration) {
      this.isDeflecting = false;
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  updateCrouch(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.crouchDuration || 0.96;
    this.vx *= Math.pow(0.001, dt);
    this.isCrouching = t < dur * 0.80;
    this.isDeflecting = this.isCrouching;

    if (t >= 0.36 && !this.didActionFrame) {
      // Frame F11 (t = 0.36s): High-velocity low Saw-Gear launch from crouched stance!
      this.didActionFrame = true;
      this.comboStep++;
      this.vx -= this.facing * 32;
      if (game.audio) game.audio.play('clock_gear', this.x);

      const spawnX = this.x + this.facing * 52;
      const spawnY = this.y - 92;
      const targetY = enemy ? enemy.y - 98 : spawnY;
      const dx = enemy ? enemy.x - spawnX : this.facing * 510;
      const dy = targetY - spawnY;
      const dist = Math.hypot(dx, dy) || 1;
      const speed = 710;

      const isVanguard = enemy && enemy.hasPoise && enemy.attackRange <= 160;
      const isHarvester = enemy && enemy.hasPoise && enemy.attackRange > 160;
      const isGroundedCaster = enemy && !enemy.hasPoise && enemy.moveSpeed <= 122;
      const crouchGearDmg = isVanguard ? 52 : isHarvester ? 55 : isGroundedCaster ? 58 : 61;

      game.vfx.spawnProjectile({
        x: spawnX,
        y: spawnY,
        vx: (dx / dist) * speed,
        vy: (dy / dist) * speed,
        radius: 20,
        color: '#2dd4bf',
        coreColor: '#facc15',
        owner: this,
        damage: crouchGearDmg,
        type: 'clock_gear'
      });

      this.fx?.spawn('temporalCrescentRift', spawnX, spawnY, {
        flip: this.facing < 0,
        palette: CHRONO_BRASS_PALETTE,
        light: 1.25,
        extra: { aimAngle: Math.atan2(dy, Math.abs(dx)), isGold: true, radius: 26, width: 10 }
      });
      this.spawnVfxAnim(4, spawnX, spawnY, 180, 180, 0.26, {
        flipX: this.facing < 0,
        glowColor: 'gold',
        inFront: true
      });

      const cAng = this.facing === 1 ? 0 : Math.PI;
      game.vfx.spawnSlash(spawnX, spawnY, 60, cAng - 0.9, cAng + 0.9, '#2dd4bf', 0.24);
      game.vfx.spawnShockwave(spawnX, spawnY, 64, '#2dd4bf', 0.26, false, true);
      game.vfx.spawnShockwave(spawnX + this.facing * 14, spawnY, 44, '#facc15', 0.20, false, true);
      game.vfx.spawnGlyphBurst(spawnX, spawnY, 5, 'chrono');
    }

    if (t >= dur) {
      this.isCrouching = false;
      this.isDeflecting = false;
      this.setState('IDLE');
    }
  }

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

    // Advance Active 30fps `chronomancer_vfx.png` Cell Animations
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

    // Advance Temporal Echoes
    for (let i = this.temporalEchoes.length - 1; i >= 0; i--) {
      const ec = this.temporalEchoes[i];
      ec.life += dt;
      if (ec.life >= ec.maxLife) {
        this.temporalEchoes.splice(i, 1);
      }
    }

    // Advance Rewind Streams (emitting 120Hz shader glints along the rewind trajectory)
    for (let i = this.rewindRibbons.length - 1; i >= 0; i--) {
      const rr = this.rewindRibbons[i];
      rr.life += dt;
      if (rr.life >= 0 && this.fx) {
        rr.sparkTimer = (rr.sparkTimer || 0) + dt;
        if (rr.sparkTimer >= 0.045) {
          rr.sparkTimer = 0;
          const u = Math.min(1, rr.life / rr.maxLife);
          const rx = rr.startX + (this.x - rr.startX) * u;
          const ry = rr.startY + (this.y - 98 - rr.startY) * u + Math.sin(u * Math.PI) * rr.arcHeight;
          this.fx.burst(rx, ry, {
            count: 2,
            speedMin: 18,
            speedMax: 52,
            lifeMin: 0.14,
            lifeMax: 0.24,
            gravity: -16,
            colors: ['#ffffff', '#fde047', '#2dd4bf']
          });
        }
      }
      if (rr.life >= rr.maxLife) {
        this.rewindRibbons.splice(i, 1);
      }
    }

    // Advance Active Stasis Hourglass Cage on the enemy
    if (this.stasisHourglass) {
      const hg = this.stasisHourglass;
      hg.life += dt;
      if (hg.target && !hg.target.isDead) {
        hg.x = hg.target.x;
        hg.y = hg.target.groundY;
        if (!hg.target.hasPoise) {
          hg.target.vx *= 0.50;
        }
        hg.tickTimer += dt;
        if (hg.tickTimer >= 0.34) {
          hg.tickTimer = 0;
          const tEnemy = hg.target;
          const isVanguard = tEnemy.hasPoise && tEnemy.attackRange <= 160;
          const isHarvester = tEnemy.hasPoise && tEnemy.attackRange > 160;
          const isGroundedCaster = !tEnemy.hasPoise && tEnemy.moveSpeed <= 122;
          const tickDmg = isVanguard ? 12 : isHarvester ? 13 : isGroundedCaster ? 16 : 17;
          tEnemy.takeDamage(tickDmg, this, false, 12, 0);
          if (game.vfx) {
            game.vfx.spawnGlyphBurst(hg.x, hg.y - 98, 4, 'chrono');
          }
        }
      }
      if (hg.life >= hg.maxLife) {
        this.stasisHourglass = null;
      }
    }

    // Advance Colossal Doomsday Clockface
    if (this.doomsdayClock) {
      this.doomsdayClock.life += dt;
      if (this.doomsdayClock.life >= this.doomsdayClock.maxLife) {
        this.doomsdayClock = null;
      }
    }

    // Proactive Temporal Tactician Corner-Escape, Time-Glide Jump & Escapement Crouch AI!
    if (enemy && !enemy.isDead && (this.state === 'IDLE' || this.state === 'WALK')) {
      const dist = Math.abs(enemy.x - this.x);
      const ww = game.renderer ? game.renderer.worldWidth : 1200;
      const nearWall = this.x < 260 || this.x > ww - 260;
      const pinnedLeft = this.x < 240 && enemy.x > this.x;
      const pinnedRight = this.x > ww - 240 && enemy.x < this.x;
      const incomingProj =
        game.vfx &&
        game.vfx.projectiles.some((p) => p.owner === enemy && Math.abs(p.x - this.x) < 150);

      if ((pinnedLeft || pinnedRight) && dist < 265 && this.dodgeCooldown <= 0 && this.wallFlipCooldown <= 0) {
        this.wallFlipCooldown = 3.0;
        this.startJump(enemy, game);
        return;
      }

      if ((dist < 235 || (nearWall && dist < 305) || incomingProj) && this.dodgeCooldown <= 0) {
        this.startDodge(enemy, game);
        return;
      }

      // Tactical Temporal Calibration Crouch & Low Saw-Gear Shot at ranged distance
      if (
        dist >= 270 &&
        dist <= this.attackRange &&
        this.autoCooldown <= 0 &&
        this.crouchCooldown <= 0 &&
        this.comboStep % 3 === 1
      ) {
        this.autoCooldown = this.autoInterval * (0.92 + Math.random() * 0.2);
        this.startCrouch(enemy, game);
        return;
      }

      if (dist < 245) {
        this.x -= this.facing * this.moveSpeed * 0.72 * dt;
      }
    }

    if (!this.isDead && this.state === 'WALK') {
      this.stepDustTimer += dt;
      if (this.stepDustTimer >= 0.32) {
        this.stepDustTimer = 0;
        if (game.audio) game.audio.play('footstep_steel', this.x);
      }
    }

    super.update(dt, enemy, game);
  }

  updateAutoAttack(dt, enemy, game) {
    const t = this.stateTimer;
    const mode = this.comboStep % 3;

    if (t < 0.28) {
      this.torsoAngle = -this.facing * 0.16 * (t / 0.28);
    } else if (t < 0.62) {
      if (!this.didActionFrame) {
        this.didActionFrame = true;
        this.comboStep++;
        this.torsoVel = this.facing * 9;

        if (game.audio) game.audio.play('clock_gear', this.x);
        const spawnX = this.x + this.facing * 54;
        const spawnY = this.y - 108;
        const targetY = enemy ? enemy.y - 110 : spawnY;
        const dx = enemy ? enemy.x - spawnX : this.facing * 480;
        const dy = targetY - spawnY;
        const dist = Math.hypot(dx, dy) || 1;
        const speed = 665;
        game.vfx.spawnGlyphBurst(spawnX, spawnY, 5, 'chrono');

        if (this.fx) {
          this.fx.spawn('temporalCrescentRift', spawnX, spawnY, {
            flip: this.facing < 0,
            palette: mode === 2 ? CHRONO_BRASS_PALETTE : CHRONO_TEAL_PALETTE,
            light: mode === 2 ? 1.3 : 1.2,
            extra: {
              aimAngle: Math.atan2(dy, Math.abs(dx)),
              isGold: mode === 2,
              radius: mode === 2 ? 30 : 25,
              width: mode === 2 ? 11 : 9
            }
          });
        }
        this.spawnVfxAnim(4, spawnX, spawnY, mode === 2 ? 196 : 172, mode === 2 ? 196 : 172, 0.28, {
          flipX: this.facing < 0,
          glowColor: mode === 2 ? 'gold' : 'teal',
          inFront: true
        });

        const isVanguard = enemy && enemy.hasPoise && enemy.attackRange <= 160;
        const isHarvester = enemy && enemy.hasPoise && enemy.attackRange > 160;
        const isGroundedCaster = enemy && !enemy.hasPoise && enemy.moveSpeed <= 122;
        const primaryDmg = isVanguard
          ? mode === 2 ? 58 : 49
          : isHarvester
            ? mode === 2 ? 61 : 52
            : isGroundedCaster
              ? mode === 2 ? 63 : 54
              : mode === 2 ? 67 : 57;

        // Launch 16-bit HD-2D Razor-Edged Brass Clockwork Saw-Gear (`Row 0` of `chronomancer_vfx.png`)!
        game.vfx.spawnProjectile({
          x: spawnX,
          y: spawnY,
          vx: (dx / dist) * speed,
          vy: (dy / dist) * speed,
          radius: 20,
          color: '#2dd4bf',
          coreColor: '#facc15',
          owner: this,
          damage: primaryDmg,
          type: 'clock_gear'
        });

        // Every 3rd attack ("CHRONO ACCELERATION"): fires a twin escapement gear & shaves 0.40s off his skill cooldown!
        if (mode === 2) {
          this.skillCooldown = Math.max(0, this.skillCooldown - 0.40);
          game.vfx.spawnDamageText(this.x, this.y - 148, 0, false, 'CHRONO HASTE!', '#facc15');
          const twinDmg = isVanguard ? 33 : isHarvester ? 34 : isGroundedCaster ? 35 : 37;
          game.vfx.spawnProjectile({
            x: spawnX - this.facing * 18,
            y: spawnY - 16,
            vx: (dx / dist) * (speed * 0.94),
            vy: (dy / dist) * (speed * 0.94) - 16,
            radius: 17,
            color: '#facc15',
            coreColor: '#2dd4bf',
            owner: this,
            damage: twinDmg,
            type: 'clock_gear'
          });
        }
      }
    } else if (t >= 0.86) {
      this.setState('IDLE');
    }
  }

  updateSkill(dt, enemy, game) {
    // SIGNATURE SKILL: "HOURGLASS STASIS & TEMPORAL REWIND"
    const t = this.stateTimer;

    if (t < 0.10) {
      this.didStasisCast = false;
      this.didStasisShatter = false;
      this.isDeflecting = true;
    } else if (t < 0.46) {
      if (!this.didStasisCast) {
        this.didStasisCast = true;
        if (game.audio) game.audio.play('hourglass_trap', enemy ? enemy.x : this.x);

        const tx = enemy ? enemy.x : this.x + this.facing * 280;
        const ty = enemy ? enemy.groundY : this.groundY;
        const isVanguard = enemy && enemy.hasPoise && enemy.attackRange <= 160;
        const isHarvester = enemy && enemy.hasPoise && enemy.attackRange > 160;
        const isGroundedCaster = enemy && !enemy.hasPoise && enemy.moveSpeed <= 122;

        this.stasisHourglass = {
          x: tx,
          y: ty,
          target: enemy,
          life: 0,
          maxLife: 1.30,
          tickTimer: 0,
          shattered: false
        };

        if (this.fx) {
          this.fx.spawn('stasisHourglassPrison', tx, ty, {
            follow: enemy || null,
            offsetX: 0,
            offsetY: 0,
            useGroundY: true,
            palette: CHRONO_TEAL_PALETTE,
            light: 1.3
          });
          this.fx.spawn('temporalCrescentRift', this.x + this.facing * 48, this.y - 104, {
            flip: this.facing < 0,
            palette: CHRONO_BRASS_PALETTE,
            light: 1.24,
            extra: { isGold: true, radius: 28, width: 10 }
          });
        }

        this.rewindTimeline(28, tx, ty - 98, game, 'CHRONO REWIND');

        if (enemy && !enemy.isDead) {
          if (!enemy.hasPoise) enemy.vx *= 0.25;
          const castDmg = isVanguard ? 35 : isHarvester ? 37 : isGroundedCaster ? 42 : 44;
          enemy.takeDamage(castDmg, this, false, 20, -40);
          game.vfx.spawnDamageText(enemy.x, enemy.y - 156, 0, false, 'TIME LOCK!', '#2dd4bf');
          game.vfx.spawnGlyphBurst(enemy.x, enemy.y - 96, 8, 'chrono');
          game.renderer.triggerShake(10, 0.18);
        }
      }
    } else if (!this.didStasisShatter && t >= 0.68) {
      this.didStasisShatter = true;
      this.isDeflecting = false;
      if (this.stasisHourglass) {
        this.stasisHourglass.shattered = true;
      }
      if (game.audio) game.audio.play('chrono_hit', enemy ? enemy.x : this.x);

      const shX = enemy ? enemy.x : this.stasisHourglass ? this.stasisHourglass.x : this.x + this.facing * 260;
      const shY = (enemy ? enemy.y : this.groundY) - 96;
      this.fx?.spawn('temporalCrescentRift', shX, shY, {
        flip: false,
        palette: CHRONO_BRASS_PALETTE,
        light: 1.36,
        extra: { isGold: true, radius: 34, width: 12 }
      });
      this.spawnVfxAnim(4, shX, shY, 224, 224, 0.36, {
        glowColor: 'gold',
        inFront: true
      });

      if (enemy && !enemy.isDead) {
        const isVanguard = enemy.hasPoise && enemy.attackRange <= 160;
        const isHarvester = enemy.hasPoise && enemy.attackRange > 160;
        const isGroundedCaster = !enemy.hasPoise && enemy.moveSpeed <= 122;
        const shatterDmg = isVanguard ? 46 : isHarvester ? 49 : isGroundedCaster ? 55 : 58;
        enemy.takeDamage(shatterDmg, this, true, 95, -110);
        game.vfx.spawnGlyphBurst(enemy.x, enemy.y - 96, 9, 'chrono');
        game.vfx.spawnBurst(enemy.x, enemy.y - 96, 16, '#2dd4bf', 225, { upBias: 95, size: 6 });
        game.renderer.triggerShake(12, 0.22);
      }
    } else if (t >= 0.92) {
      this.isDeflecting = false;
      this.setState('IDLE');
    }
  }

  updateUltimate(dt, enemy, game) {
    // 100% BESPOKE CHRONOMANCER ULTIMATE: "DOOMSDAY MIDNIGHT — GRAND ASTRAL CLOCKTOWER"
    const t = this.stateTimer;
    const ww = game.renderer ? game.renderer.worldWidth : 1200;
    const centerX = Math.max(
      260,
      Math.min(ww - 260, this.x * 0.65 + (enemy ? enemy.x : ww * 0.5) * 0.35)
    );
    this.vx = 0;
    this.vy = 0;
    this.y = this.groundY;
    this.isDeflecting = t < 1.42;

    if (t < 0.04) {
      this.ultStage = 0;
    }

    const isVanguard = enemy && enemy.hasPoise && enemy.attackRange <= 160;
    const isHarvester = enemy && enemy.hasPoise && enemy.attackRange > 160;
    const isGroundedCaster = enemy && !enemy.hasPoise && enemy.moveSpeed <= 122;

    if (t >= 0.05 && this.ultStage === 0) {
      this.ultStage = 1;
      if (game.audio) game.audio.play('chrono_ult', centerX);
      game.renderer.triggerShake(14, 0.26);

      this.doomsdayClock = {
        x: centerX,
        y: this.groundY - 195,
        life: 0,
        maxLife: 1.52,
        shattered: false
      };

      if (this.fx) {
        this.fx.spawn('doomsdayGrandHorologium', centerX, this.groundY, {
          palette: CHRONO_TEAL_PALETTE,
          light: 1.38
        });
        this.fx.spawn('warpPortalPairRift', this.x, this.y - 104, {
          follow: this,
          offsetX: 0,
          offsetY: -104,
          flip: this.facing < 0,
          palette: CHRONO_BRASS_PALETTE,
          light: 1.28,
          extra: { isArrival: true }
        });
      }

      game.vfx.spawnDamageText(centerX, this.groundY - 365, 0, false, 'TIME STOP — IX... X... XI...', '#2dd4bf');
      if (enemy && !enemy.isDead) {
        if (!enemy.hasPoise) enemy.vx = 0;
        const d1 = isVanguard ? 30 : isHarvester ? 31 : isGroundedCaster ? 34 : 35;
        enemy.takeDamage(d1, this, false, -30, 0);
        game.vfx.spawnGlyphBurst(enemy.x, enemy.y - 96, 8, 'chrono');
      }
      this.rewindTimeline(
        isVanguard ? 22 : isHarvester ? 22 : isGroundedCaster ? 23 : 24,
        centerX,
        this.groundY - 195,
        game,
        'ASTRAL REWIND'
      );
    }

    if (enemy && !enemy.isDead && !enemy.hasPoise && t < 1.02) {
      enemy.vx *= 0.15;
    }

    if (t >= 0.52 && this.ultStage === 1) {
      this.ultStage = 2;
      if (game.audio) game.audio.play('clock_gear', centerX);
      game.renderer.triggerShake(16, 0.28);

      const strikeX = enemy && !enemy.isDead ? enemy.x : centerX;
      const strikeY = (enemy && !enemy.isDead ? enemy.y : this.groundY) - 96;
      this.fx?.spawn('temporalCrescentRift', strikeX, strikeY, {
        palette: CHRONO_TEAL_PALETTE,
        light: 1.32,
        extra: { isGold: false, radius: 32, width: 11 }
      });
      this.spawnVfxAnim(4, strikeX, strikeY, 208, 208, 0.34, {
        glowColor: 'teal',
        inFront: true
      });

      if (enemy && !enemy.isDead) {
        const d2 = isVanguard ? 33 : isHarvester ? 35 : isGroundedCaster ? 37 : 39;
        enemy.takeDamage(d2, this, true, -40, -50);
        game.vfx.spawnGlyphBurst(enemy.x, enemy.y - 96, 10, 'chrono');
      }
    }

    if (t >= 0.98 && this.ultStage === 2) {
      this.ultStage = 3;
      if (this.doomsdayClock) {
        this.doomsdayClock.shattered = true;
      }
      if (game.audio) game.audio.play('chrono_hit', centerX);

      game.renderer.triggerShake(26, 0.52);
      game.renderer.triggerAberration(15);
      game.renderer.triggerHitStop(0.09);

      const cx = this.doomsdayClock ? this.doomsdayClock.x : centerX;
      const cy = this.groundY - 195;
      this.fx?.spawn('temporalCrescentRift', cx, cy, {
        palette: CHRONO_BRASS_PALETTE,
        light: 1.44,
        extra: { isGold: true, radius: 38, width: 13 }
      });
      this.spawnVfxAnim(4, cx, cy, 256, 256, 0.42, {
        glowColor: 'gold',
        inFront: true
      });

      game.vfx.spawnDamageText(cx, this.groundY - 380, 0, true, 'MIDNIGHT XII — SHATTER!', '#facc15');
      game.vfx.spawnGlyphBurst(cx, cy, 14, 'chrono');
      game.vfx.spawnBurst(cx, cy, 26, '#2dd4bf', 320, { upBias: 80, size: 7 });
      game.vfx.spawnBurst(cx, cy, 22, '#facc15', 290, { upBias: 60, size: 6 });

      if (enemy && !enemy.isDead) {
        const d3 = isVanguard ? 99 : isHarvester ? 104 : isGroundedCaster ? 112 : 118;
        enemy.takeDamage(d3, this, true, 175, -220);
        this.spawnVfxAnim(4, enemy.x, enemy.y - 96, 224, 224, 0.38, {
          glowColor: 'gold',
          inFront: true
        });
        this.rewindTimeline(
          isVanguard ? 38 : isHarvester ? 40 : isGroundedCaster ? 39 : 42,
          enemy.x,
          enemy.y - 96,
          game,
          'MIDNIGHT REWIND'
        );
        game.vfx.spawnGlyphBurst(enemy.x, enemy.y - 96, 12, 'chrono');
      }
    }

    if (t >= 1.52) {
      this.isDeflecting = false;
      this.doomsdayClock = null;
      this.setState('IDLE');
    }
  }

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
    glowColor = 'teal'
  ) {
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;
    const cell = 208;
    const sx = Math.max(0, Math.min(29, Math.floor(col))) * cell;
    const sy = Math.max(0, Math.min(4, Math.floor(row))) * cell;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(x), Math.round(y));
    if (flipX) ctx.scale(-1, 1);

    const glowSprite =
      glowColor === 'gold'
        ? renderer?.glowGold || renderer?.glowTeal
        : renderer?.glowTeal || renderer?.glowGold;
    if (glowSprite) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, alpha * 0.4);
      const gw = Math.round(w * 1.16);
      const gh = Math.round(h * 1.16);
      ctx.drawImage(glowSprite, -gw * 0.5, -gh * 0.5, gw, gh);
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.drawImage(vfxSheet, sx, sy, cell, cell, -w * 0.5, -h * 0.5, w, h);

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, alpha * 0.42);
    ctx.drawImage(vfxSheet, sx, sy, cell, cell, -w * 0.5, -h * 0.5, w, h);

    ctx.restore();
  }

  /**
   * 2.5D Background & Mid-Ground Pass (rendered behind fighters)
   */
  drawForegroundOverlay(ctx, renderer = null) {
    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    const sprites = PixelForge.initAssets().chronomancer;
    const vfxSheet = sprites?.vfx;

    // 1. Live 120Hz `ArcaneShaderFX` "back" layer (2.5D Astrolabe Aura, Warp Portals, Stasis Prison & Grand Horologium Back Rings)
    this.fx.renderLayer(ctx, 'back', arenaCenterX, this.groundY, 0.96);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 2. Colossal XII-Hour Doomsday Clock Face (`Row 3` of `chronomancer_vfx.png`: `horologiumClockFaceCell`)
    if (this.doomsdayClock && vfxSheet?.complete) {
      const dc = this.doomsdayClock;
      const pop = Math.min(1, dc.life / 0.22);
      const fade = Math.min(1, (dc.maxLife - dc.life) * 3.0);
      const size = Math.round(336 * (0.78 + 0.22 * pop));
      const col = Math.max(0, Math.min(29, Math.floor((dc.life / dc.maxLife) * 30)));
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        3,
        col,
        dc.x,
        dc.y,
        size,
        size,
        fade * 0.95,
        false,
        renderer,
        dc.shattered ? 'gold' : 'teal'
      );
    }

    // 3. Departure & Arrival Temporal Wormhole Portals (`Row 3` of `chronomancer_vfx.png`: `horologiumClockFaceCell`)
    if ((this.warpPortalTimer > 0 || this.isChronoWarp) && vfxSheet?.complete) {
      const fade = Math.min(1, Math.max(0.15, this.warpPortalTimer / 0.22));
      const col = Math.floor(this.chronoPhase * 10) % 30;
      const portals = [
        { x: this.warpOriginX, y: this.groundY - 96, size: 168, glow: 'teal', flip: false },
        { x: this.warpTargetX, y: this.groundY - 96, size: 184, glow: 'gold', flip: true }
      ];
      for (const p of portals) {
        this.drawBloomedVfxCell(
          ctx,
          vfxSheet,
          3,
          col,
          p.x,
          p.y,
          p.size,
          p.size,
          fade * 0.9,
          p.flip,
          renderer,
          p.glow
        );
      }
    }

    // 4. Frozen Golden-Teal Temporal Echo Silhouettes (`PixelForge.drawAfterimageFrame`)
    if (this.temporalEchoes.length > 0 && sprites?.sheet?.complete) {
      for (const ec of this.temporalEchoes) {
        const fade = Math.max(0, 1 - ec.life / ec.maxLife);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(Math.round(ec.x / 4) * 4, Math.round((ec.y + 4) / 4) * 4);
        ctx.scale(ec.facing, 1);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade * 0.44;
        PixelForge.drawAfterimageFrame(ctx, sprites, ec.frameIdx, 208, 208);
        ctx.restore();
      }
    }

    // 5. 2 Counter-Rotating Astrolabe Escapement Gear Wheels (`Row 1` of `chronomancer_vfx.png`: `astrolabeGearWheelCell`)
    if (!this.isDead && vfxSheet?.complete) {
      const col = Math.floor(this.chronoPhase * 10) % 30;
      const gears = [
        {
          ox: -this.facing * 42,
          oy: -128 + Math.round(Math.sin(this.chronoPhase * 1.2) * 3) * 2,
          size: 72,
          flip: false,
          glow: 'teal'
        },
        {
          ox: this.facing * 36,
          oy: -146 + Math.round(Math.cos(this.chronoPhase * 1.2) * 3) * 2,
          size: 62,
          flip: true,
          glow: 'gold'
        }
      ];
      for (const g of gears) {
        this.drawBloomedVfxCell(
          ctx,
          vfxSheet,
          1,
          col,
          this.x + g.ox,
          this.y + g.oy,
          g.size,
          g.size,
          0.92,
          g.flip,
          renderer,
          g.glow
        );
      }
    }

    // 6. Background 30fps `chronomancer_vfx.png` cell animations
    if (this.activeVfxAnims.length > 0 && vfxSheet?.complete) {
      for (const v of this.activeVfxAnims) {
        if (v.inFront) continue;
        const u = Math.min(1, Math.max(0, v.age / v.maxLife));
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
          v.glowColor
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
    const sprites = PixelForge.initAssets().chronomancer;
    const vfxSheet = sprites?.vfx;

    // 1. Ornate Brass & Teal Stasis Hourglass Monolith (`Row 2` of `chronomancer_vfx.png`: `stasisHourglassMonolithCell`)
    if (this.stasisHourglass && vfxSheet?.complete) {
      const hg = this.stasisHourglass;
      const pop = Math.min(1, hg.life / 0.14);
      const fade = Math.min(1, (hg.maxLife - hg.life) * 3.2);
      const vibrateX = Math.round(Math.sin(hg.life * 28) * 2) * 2;
      const drawW = Math.round((208 * (0.84 + 0.16 * pop)) / 4) * 4;
      const drawH = Math.round((224 * (0.84 + 0.16 * pop)) / 4) * 4;
      const col = Math.max(0, Math.min(29, Math.floor((hg.life / hg.maxLife) * 30)));
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        2,
        col,
        hg.x + vibrateX,
        hg.y - drawH * 0.46,
        drawW,
        drawH,
        fade * 0.96,
        false,
        renderer,
        hg.shattered ? 'gold' : 'teal'
      );
    }

    // 2. Live 120Hz `ArcaneShaderFX` "front" layer (Front Astrolabe Aura, Multi-Layer Temporal Crescent Rifts, Front Stasis Prison & Grand Horologium)
    this.fx.renderLayer(ctx, 'front', arenaCenterX, this.groundY, 0.98);

    // 3. Foreground 30fps `chronomancer_vfx.png` cell bursts (`Row 4`: `timeShatterNovaCell`)
    if (this.activeVfxAnims.length > 0 && vfxSheet?.complete) {
      for (const v of this.activeVfxAnims) {
        if (!v.inFront) continue;
        const u = Math.min(1, Math.max(0, v.age / v.maxLife));
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
          fade * 0.94,
          v.flipX,
          renderer,
          v.glowColor
        );
      }
    }
  }

  draw(ctx, isReflection = false, renderer = null) {
    const sprites = PixelForge.initAssets().chronomancer;
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
