import { Fighter } from './Fighter.js?v=30fps95';
import { PixelForge } from '../engine/PixelForge.js?v=30fps95';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps95';
import {
  SYLVAN_EFFECT_REGISTRY,
  SYLVAN_EMERALD_PALETTE,
  SYLVAN_STARLIGHT_PALETTE
} from '../engine/shaders/sylvanShaders.js?v=30fps95';

const AUTO_SLICES_4 = [
  [60, 8],
  [68, 7],
  [75, 8],
  [83, 7]
];

/**
 * Sylvara (`archer`) — Elven Tempest Bowmaster & Astral Star-Ranger.
 * Powered natively by `ArcaneShaderFX` (dual-buffer 120Hz HD-2D shader & particle engine)
 * + `assets/sprites/archer_sheet.png` & `assets/sprites/archer_vfx.png`.
 */
export class Archer extends Fighter {
  constructor(x, groundY, facing = 1) {
    const opts = typeof x === 'object' && x !== null ? x : { x, groundY, facing };
    super({
      ...opts,
      name: opts.name || 'Sylvara',
      maxHp: 3620,
      attackRange: 520,
      moveSpeed: 184,
      autoInterval: 0.92,
      lightColor: 'rgba(16, 185, 129, 1)',
      primaryColor: '#10b981'
    });
    this.heroId = 'archer';
    this.theme = 'emerald';
    this.deathSfx = 'death_archer';
    this.skillMaxCooldown = 4.05;
    this.autoDuration = 0.82;
    this.ultName = 'ZEPHYR VAULT: 180° STARLOCK BARRAGE';
    this.ultDuration = 2.04;
    this.skillName = 'VERDANT SNARE & SEEKERS';
    this.hasTrueUltimate = true;
    this.trueUltName = 'ARROW OF YGGDRASIL: SUPERNOVA PIERCE';
    this.trueUltDuration = 4.55;
    this.windPhase = 0;
    this.shotCombo = 0;
    this.comboStep = 0;
    this._autoVariant = 0;
    this.stepTimer = 0;
    this.dodgeMaxCooldown = 2.88;
    this.dashMaxCooldown = 3.20;
    this.wallFlipCooldown = 0;
    this.crouchCooldown = 0;
    this.crouchDuration = 0.96;
    this.isCrouching = false;
    this.isFlipVault = false;
    this.flipStartX = this.x;
    this.flipTargetX = this.x;
    this.flipAngle = 0;

    this.activeVfxAnims = [];
    this._ultPhase = 0;
    this._ultShotMask = 0;
    this._ultChargeDir = this.facing;
    this._ultStartX = this.x;
    this._ultPivotX = this.x + this.facing * 200;
    this._trueUltStep = 0;
    this._trueUltBeamTimer = 0;
    this._trueUltMoteTimer = 0;
    this._trueUltTargetX = this.x + this.facing * 320;
    this._trueUltJumpStartX = this.x;
    this._trueUltFarEdgeX = 108;
    this._trueUltRootedTargets = [];
    this.brambleSnareZones = [];

    // Native 120Hz dual-buffer HD-2D Sylvan shader & particle runtime (`back` + `front` 2.5D layers)
    // Expanded viewport (`720x460` @ `pixelScale=3` -> `2160x1380` world coverage) for cross-stage Yggdrasil & 180° sky vaults
    this.fx = new ArcaneShaderFX(SYLVAN_EFFECT_REGISTRY, {
      pixelScale: 3,
      viewW: 720,
      viewH: 460,
      topRatio: 0.72
    });

    if (typeof Image !== 'undefined') {
      const archerAssets = PixelForge.initAssets()?.archer;
      if (archerAssets?.vfx?.src && !archerAssets.vfx.src.includes('v=30fps87')) {
        archerAssets.vfx.src = 'assets/sprites/archer_vfx.png?v=30fps95';
      }
    }

    this.afterimages = [];
    this._afterimageTimer = 0;
    this._drewBowVortex = false;
    this._skillLockSpawned = false;
    this._deathBurstTriggered = false;
  }

  getEnemyTargets(enemy, game) {
    if (game?.getEnemiesOf) {
      const list = game.getEnemiesOf(this).filter((f) => f && !f.isDead && !f.isBenched);
      if (list.length > 0) return list;
    }
    return enemy && !enemy.isDead ? [enemy] : [];
  }

  setState(newState) {
    super.setState(newState);
    if (newState !== 'CROUCH') {
      this.isDeflecting = false;
      this.fx?.stopByKey('sylvanLeafCloakDome');
    }
    if (newState !== 'DASH' && newState !== 'JUMP' && newState !== 'DODGE' && newState !== 'ULTIMATE' && newState !== 'TRUE_ULTIMATE') {
      this.fx?.stopByKey('zephyrVaultSlipstream');
    }
    if (newState !== 'ULTIMATE' && newState !== 'TRUE_ULTIMATE') {
      this.fx?.stopByKey('astralWingPlume');
      this.cameraAirLift = 0;
      this._overrideFrameIdx = null;
    }
    if (newState === 'ULTIMATE') {
      this._ultPhase = 0;
      this._ultShotMask = 0;
      this._ultChargeDir = this.facing;
      this._ultStartX = this.x;
      this._ultPivotX = this.x + this.facing * 200;
      this.isFlipVault = false;
      this._overrideFrameIdx = 120;
    }
    if (newState === 'TRUE_ULTIMATE') {
      this._trueUltStep = 0;
      this._trueUltBeamTimer = 0;
      this._trueUltMoteTimer = 0;
      this._trueUltTargetX = this.x + this.facing * 320;
      this._trueUltJumpStartX = this.x;
      this._trueUltFarEdgeX = 108;
      this._trueUltRootedTargets = [];
      this.isFlipVault = false;
      this.trueUltFrameOverride = 136;
    } else {
      this.releaseRootedTargets();
      this._trueUltStep = 0;
      this._trueUltBeamTimer = 0;
      this._trueUltMoteTimer = 0;
      this.trueUltFrameOverride = null;
    }
    if (newState === 'AUTO_ATTACK') {
      this._autoVariant = (((this.comboStep || 0) % 4) + 4) % 4;
      this.comboStep = (this._autoVariant + 1) % 4;
      this.trueUltFrameOverride = AUTO_SLICES_4[this._autoVariant][0];
    }
    this._drewBowVortex = false;
    this._skillLockSpawned = false;
    this._afterimageTimer = 0;
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

  spawnVfxAnim(row, x, y, w = 208, h = 208, maxLife = 0.55, opts = {}) {
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
    this.afterimages.push({
      x,
      y,
      facing,
      frameIdx: row * 30 + col,
      age: 0,
      maxLife
    });
  }

  takeDamage(amount, attacker, isCrit = false, knockX = 95, knockY = 0) {
    if (this.isDeflecting && !this.isDead) {
      this.fx.spawn('sylvanArrowImpactBurst', this.x + this.facing * 36, this.y - 84, {
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
      this.fx.spawn('zephyrGroundBurst', this.x, this.groundY, {
        palette: SYLVAN_STARLIGHT_PALETTE,
        light: 1.05,
        extra: { radius: 30 }
      });
      this.fx.spawn('sylvanArrowImpactBurst', this.x, this.groundY - 64, {
        flip: false,
        palette: SYLVAN_EMERALD_PALETTE,
        light: 1.0,
        extra: { aimAngle: -Math.PI * 0.5, isCrit: true }
      });
    }
  }

  startJump(enemy, game, customDir = null) {
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

  startCrouch(enemy, game) {
    this.crouchCooldown = 3.2;
    this.crouchDuration = 0.96;
    this.setState('CROUCH');
    this.isCrouching = true;
    this.isDeflecting = true;
    this.vx = 0;

    // 2.5D Swirling Sylvan Leaf-Cloak Stealth Barrier (`back` + `front` wraparound)
    this.fx.spawn('sylvanLeafCloakDome', this.x + this.facing * 4, this.groundY, {
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
      let target = enemy.x + openSideDir * 350;
      if (Math.abs(target - this.x) < 260) {
        const crossDir = this.x < enemy.x ? 1 : -1;
        target = enemy.x + crossDir * 340;
      }
      this.flipTargetX = Math.max(150, Math.min(ww - 150, target));
      this.dashDir = Math.sign(this.flipTargetX - this.flipStartX) || 1;
      if (game?.vfx) {
        game.vfx.spawnDamageText(this.x, this.y - 125, 0, false, 'ZEPHYR VAULT!', '#34d399');
      }
    } else {
      this.dashDuration = 0.60;
      this.flipTargetX = Math.max(150, Math.min(ww - 150, this.x + dir * 340));
      this.dashDir = dir;
      if (game?.vfx) {
        game.vfx.spawnDamageText(this.x, this.y - 120, 0, false, 'ZEPHYR LEAP!', '#34d399');
      }
    }

    this.vx = 0;
    this.vy = 0;
    this.heal(13, 'SYLVAN BREEZE');
    if (game?.audio) game.audio.play('zephyr_flip', this.x);

    this.fx.spawn('zephyrGroundBurst', this.x, this.groundY, {
      palette: SYLVAN_EMERALD_PALETTE,
      light: 1.05,
      extra: { radius: 28 }
    });
    this.fx.spawn('zephyrVaultSlipstream', this.x - this.facing * 14, this.y - 108, {
      follow: this,
      offsetX: -14,
      offsetY: -108,
      flip: this.facing < 0,
      palette: SYLVAN_EMERALD_PALETTE,
      maxDuration: this.dashDuration * 0.88,
      light: 1.05,
      extra: { length: 28, tilt: -0.18 }
    });
  }

  onStartDash(enemy, game, dir) {
    this.isFlipVault = false;
    this.flipAngle = 0;
    this.dashDuration = 0.44;
    this.dashDir = dir || this.facing;
    this.vx = this.dashDir * 380;
    if (game?.audio) game.audio.play('arrow_shoot', this.x);
    if (game?.vfx) {
      game.vfx.spawnDamageText(this.x, this.y - 120, 0, false, 'GALE STRIDE!', '#34d399');
    }

    this.fx.spawn('zephyrVaultSlipstream', this.x - this.facing * 16, this.y - 102, {
      follow: this,
      offsetX: -16,
      offsetY: -102,
      flip: this.facing < 0,
      palette: SYLVAN_STARLIGHT_PALETTE,
      maxDuration: 0.34,
      light: 1.0,
      extra: { length: 24, tilt: -0.08 }
    });
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
        if (this._afterimageTimer >= 0.16) {
          this._afterimageTimer = 0;
          this.spawnAfterimage(this.x, this.y, this.facing, 8, Math.min(29, Math.floor(u * 30)), 0.18);
        }
      }

      // Frame F18 (`u >= 0.58`): Mid-air wind-hover downward (`+24°`) Aerial Counter-Shot!
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
            vx: (dx / td) * 745,
            vy: (dy / td) * 745,
            radius: 13,
            color: '#34d399',
            coreColor: '#fef08a',
            owner: this,
            damage: enemy.hasPoise && enemy.attackRange <= 160 ? 66 : 57,
            type: 'arrow'
          });
        }

        this.fx.spawn('sonicBowReleaseWave', sx, sy, {
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

    // Row 6 (30-frame DASH — Gale Stride): mid-dash snap-shot at F14 (`t >= 0.20`)
    this.x += this.dashDir * 295 * dt;
    this._afterimageTimer += dt;
    if (this._afterimageTimer >= 0.16) {
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
          vx: (dx / d) * 710,
          vy: (dy / d) * 710,
          radius: 13,
          color: '#34d399',
          coreColor: '#fef08a',
          owner: this,
          damage: 44,
          type: 'arrow'
        });
      }

      this.fx.spawn('sonicBowReleaseWave', sx, sy, {
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

    // Frames F05..F17 (`0.16s <= t < 0.57s`): Crouched knee-braced sniper bow wind-focus at `(x + facing * 52, y - 96)`
    if (t >= 0.16 && t < 0.57 && !this._drewBowVortex) {
      this._drewBowVortex = true;
      this.fx.spawn('sylvanBowDrawVortex', this.x + this.facing * 52, this.y - 96, {
        follow: this,
        offsetX: 52,
        offsetY: -96,
        palette: SYLVAN_STARLIGHT_PALETTE,
        maxDuration: 0.39,
        light: 1.1,
        extra: { radius: 20 }
      });
    } else if (t >= 0.57 && !this.didActionFrame) {
      // Frame F18 (`t = 0.576s`): Low-profile knee-braced Sniper Piercer release at `y - 96`!
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
      const speed = 715;
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
          damage: 89,
          type: 'arrow'
        });
      }

      this.fx.spawn('sonicBowReleaseWave', spawnX, spawnY, {
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
    this.windPhase += dt * 3.0;
    this.wallFlipCooldown = Math.max(0, this.wallFlipCooldown - dt);
    this.crouchCooldown = Math.max(0, this.crouchCooldown - dt);
    if (this._trueUltBeamTimer > 0) {
      this._trueUltBeamTimer = Math.max(0, this._trueUltBeamTimer - dt);
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
          const desiredVx = (dx / dist) * 680;
          const desiredVy = (dy / dist) * 680;
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

      if ((pinnedLeft || pinnedRight || dist < 190) && dist < 265 && this.dodgeCooldown <= 0 && this.wallFlipCooldown <= 0) {
        this.wallFlipCooldown = 3.0;
        this.startJump(enemy, game);
        return;
      }

      if (
        dist >= 275 &&
        dist <= this.attackRange &&
        this.autoCooldown <= 0 &&
        this.crouchCooldown <= 0 &&
        this.shotCombo % 2 === 1
      ) {
        this.autoCooldown = this.autoInterval * (0.92 + Math.random() * 0.2);
        this.startCrouch(enemy, game);
        return;
      }

      if (dist < 220 && this.autoCooldown > 0 && this.x > 175 && this.x < ww - 175) {
        this.moveDir = -1;
        this.walkPhase += dt * 0.5;
        this.x -= this.facing * this.moveSpeed * 0.12 * dt;
      }
    }

    super.update(dt, enemy, game);
  }

  updateAutoAttack(_dt, enemy, game) {
    const t = this.stateTimer;
    const mode = (((this._autoVariant || 0) % 4) + 4) % 4;
    const [sliceStart, sliceLen] = AUTO_SLICES_4[mode];
    const u = Math.max(0, Math.min(0.999, t / Math.max(0.01, this.autoDuration)));
    this.trueUltFrameOverride = sliceStart + Math.min(sliceLen - 1, Math.floor(u * sliceLen));

    if (t < 0.40) {
      this.torsoAngle = -this.facing * 0.12 * (t / 0.40);
      if (t >= 0.06 && !this._drewBowVortex) {
        this._drewBowVortex = true;
        const isStarlight = mode === 2 || mode === 3;
        const drawOffY = mode === 1 ? -96 : mode === 2 ? -132 : -114;
        this.fx.spawn('sylvanBowDrawVortex', this.x + this.facing * 54, this.y + drawOffY, {
          follow: this,
          offsetX: 54,
          offsetY: drawOffY,
          palette: isStarlight ? SYLVAN_STARLIGHT_PALETTE : SYLVAN_EMERALD_PALETTE,
          maxDuration: 0.34,
          light: mode === 3 ? 1.18 : 1.06,
          extra: { radius: mode === 3 ? 25 : 20 }
        });
      }
    } else if (t < 0.74) {
      if (!this.didActionFrame) {
        this.didActionFrame = true;
        this.shotCombo++;
        this.vx -= this.facing * (mode === 3 ? 64 : 46);
        if (game?.audio) game.audio.play('arrow_shoot', this.x);

        // Close-Range < 165px ("Star-Blade Vault Shot"): slash with twin bladed bow limbs + 95px backward slide!
        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 165) {
          const ww = game?.renderer ? game.renderer.worldWidth : 1200;
          enemy.takeDamage(46, this, false, 140, -60);
          this.spawnVfxAnim(0, enemy.x, (enemy.groundY || this.groundY) - 96, 176, 176, 0.30, {
            flipX: this.facing < 0,
            inFront: true
          });
          this.x = Math.max(80, Math.min(ww - 80, this.x - this.facing * 95));
          this.vx = -this.facing * 185;
          if (game?.vfx) {
            game.vfx.spawnDamageText(this.x, this.y - 142, 0, false, 'STAR-BLADE VAULT SHOT!', '#34d399');
          }
        }

        const spawnX = this.x + this.facing * 54;
        const spawnY = mode === 1 ? this.y - 96 : mode === 2 ? this.y - 126 : this.y - 112;
        const targetY = enemy ? enemy.y - 102 : this.y - 102;
        const dx = enemy ? enemy.x - spawnX : this.facing * 520;
        const dy = targetY - spawnY;
        const dist = Math.hypot(dx, dy) || 1;
        const shotAng = Math.atan2(dy, dx);

        if (mode === 0) {
          // V0 (60..67 — Verdant Snap-Draw Shot): classic upright elven recurve arrow
          if (game?.vfx) {
            const speed = 715;
            game.vfx.spawnProjectile({
              x: spawnX,
              y: spawnY,
              vx: (dx / dist) * speed,
              vy: (dy / dist) * speed,
              radius: 14,
              color: '#10b981',
              coreColor: '#fef08a',
              owner: this,
              damage: 118,
              isCrit: false,
              pierce: false,
              type: 'arrow'
            });
          }
          this.fx.spawn('sonicBowReleaseWave', spawnX, spawnY, {
            flip: false,
            palette: SYLVAN_EMERALD_PALETTE,
            light: 1.12,
            extra: { aimAngle: shotAng, radius: 23, twin: false }
          });
        } else if (mode === 1) {
          // V1 (68..74 — Sylvan Canted Split-Volley): low coiled kneeling/canted multi-arrow volley
          this.spawnVfxAnim(0, spawnX, spawnY, 172, 172, 0.30, {
            flipX: this.facing < 0,
            inFront: true
          });
          if (game?.vfx) {
            const speed = 695;
            game.vfx.spawnProjectile({
              x: spawnX,
              y: spawnY - 8,
              vx: (dx / dist) * speed,
              vy: (dy / dist) * speed - 18,
              radius: 14,
              color: '#10b981',
              coreColor: '#fef08a',
              owner: this,
              damage: 94,
              type: 'arrow'
            });
            game.vfx.spawnProjectile({
              x: spawnX - this.facing * 18,
              y: spawnY + 8,
              vx: (dx / dist) * (speed * 0.95),
              vy: (dy / dist) * (speed * 0.95) + 18,
              radius: 13,
              color: '#34d399',
              coreColor: '#fef08a',
              owner: this,
              damage: 76,
              type: 'arrow'
            });
          }
          this.fx.spawn('sonicBowReleaseWave', spawnX, spawnY, {
            flip: false,
            palette: SYLVAN_STARLIGHT_PALETTE,
            light: 1.24,
            extra: { aimAngle: shotAng, radius: 27, twin: true }
          });
        } else if (mode === 2) {
          // V2 (75..82 — Starfall Arcing Sky-Shot): elevated skyward bow loosing arcing starfall arrow + guiding shot
          const strikeX = enemy && !enemy.isDead ? enemy.x : spawnX + this.facing * 280;
          this.spawnVfxAnim(
            2,
            strikeX,
            (enemy?.groundY || this.groundY) - 84,
            184,
            184,
            0.36,
            { flipX: false, inFront: false }
          );
          if (game?.vfx) {
            const speed = 705;
            game.vfx.spawnProjectile({
              x: spawnX,
              y: spawnY,
              vx: (dx / dist) * speed,
              vy: (dy / dist) * speed,
              radius: 14,
              color: '#34d399',
              coreColor: '#ffffff',
              owner: this,
              damage: 92,
              type: 'arrow'
            });
            game.vfx.spawnSkyStrike({
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
              damage: 62,
              delay: 0,
              maxLinger: 0.42
            });
            game.vfx.spawnDamageText(this.x, this.y - 148, 0, false, 'STARFALL SKY-SHOT!', '#6ee7b7');
          }
          this.fx.spawn('sonicBowReleaseWave', spawnX, spawnY, {
            flip: false,
            palette: SYLVAN_STARLIGHT_PALETTE,
            light: 1.26,
            extra: { aimAngle: shotAng, radius: 28, twin: true }
          });
        } else {
          // V3 (83..89 — Yggdrasil Dragon-Piercer Draw): deep power-split overdraw -> blazing crit piercer
          this.spawnVfxAnim(3, this.x + this.facing * 56, this.y - 96, 176, 176, 0.36, {
            flipX: this.facing < 0,
            inFront: true
          });
          if (game?.vfx) {
            const speed = 770;
            game.vfx.spawnProjectile({
              x: spawnX,
              y: spawnY,
              vx: (dx / dist) * speed,
              vy: (dy / dist) * speed,
              radius: 16,
              color: '#10b981',
              coreColor: '#fef08a',
              owner: this,
              damage: 154,
              isCrit: true,
              pierce: true,
              type: 'arrow'
            });
            game.vfx.spawnDamageText(this.x, this.y - 148, 0, true, 'DRAGON-PIERCER!', '#fde047');
          }
          this.fx.spawn('sonicBowReleaseWave', spawnX, spawnY, {
            flip: false,
            palette: SYLVAN_STARLIGHT_PALETTE,
            light: 1.32,
            extra: { aimAngle: shotAng, radius: 30, twin: true }
          });
        }
      }
    } else if (t >= this.autoDuration) {
      this.trueUltFrameOverride = null;
      this.setState('IDLE');
    }
  }

  updateSkill(dt, enemy, game) {
    const t = this.stateTimer;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const centerTargetX = Math.max(120, Math.min(ww - 120, enemy ? enemy.x : this.x + this.facing * 320));
    const targetX = enemy ? enemy.x : centerTargetX;
    const groundY = enemy?.groundY || this.groundY;

    if (t < 0.36) {
      if (t >= 0.04 && !this._skillLockSpawned) {
        this._skillLockSpawned = true;
        this.fx.spawn('sylvanBowDrawVortex', this.x + this.facing * 48, this.y - 120, {
          follow: this,
          offsetX: 48,
          offsetY: -120,
          palette: SYLVAN_EMERALD_PALETTE,
          maxDuration: 0.31,
          light: 1.05,
          extra: { radius: 22 }
        });
        this.fx.spawn('starfallCelestialLock', centerTargetX, this.groundY, {
          palette: SYLVAN_STARLIGHT_PALETTE,
          light: 1.1,
          extra: { radius: 34, beaconH: 60 }
        });

        // Plant Verdant Bramble-Star Snare (`archer_vfx.png` Row 2) at `enemy.x, enemy.groundY - 84`
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
        if (enemy && !enemy.isDead) {
          enemy.vx *= 0.25;
        }

        // Fire 2 extra curving emerald seeker arrows (`archer_vfx.png` Row 1)
        const bowX = this.x + this.facing * 48;
        const bowY = this.y - 120;
        const dx = targetX - bowX;
        const dy = (groundY - 96) - bowY;
        const dist = Math.hypot(dx, dy) || 1;
        for (const arcSign of [-1, 1]) {
          this.spawnVfxAnim(1, bowX, bowY + arcSign * 14, 176, 176, 0.52, {
            vx: (dx / dist) * 560,
            vy: (dy / dist) * 560 + arcSign * 135,
            flipX: this.facing < 0,
            inFront: true,
            isSeeker: true
          });
          if (game?.vfx) {
            game.vfx.spawnProjectile({
              x: bowX,
              y: bowY + arcSign * 12,
              vx: (dx / dist) * 650,
              vy: (dy / dist) * 650 + arcSign * 45,
              radius: 12,
              color: '#10b981',
              coreColor: '#fef08a',
              owner: this,
              damage: 38,
              type: 'arrow'
            });
          }
        }
      }
    } else if (t >= 0.36 && !this.didActionFrame) {
      // Row 3 Frame F11 (`t = 0.38s`): Release 3 Direct Fan-Spread Wind Arrows horizontally!
      this.didActionFrame = true;
      this.vx -= this.facing * 65;
      this.heal(22, 'STARLIGHT GRACE');
      if (game?.audio) game.audio.play('arrow_shoot', this.x);

      const bowX = this.x + this.facing * 48;
      const bowY = this.y - 120;
      const fAng = this.facing === 1 ? 0 : Math.PI;

      this.fx.spawn('sonicBowReleaseWave', bowX, bowY, {
        flip: false,
        palette: SYLVAN_EMERALD_PALETTE,
        light: 1.2,
        extra: { aimAngle: fAng, radius: 27, twin: true }
      });

      if (game?.vfx) {
        [-0.16, 0, 0.16].forEach((angOff) => {
          const a = fAng + angOff;
          game.vfx.spawnProjectile({
            x: bowX,
            y: bowY,
            vx: Math.cos(a) * 675,
            vy: Math.sin(a) * 675,
            radius: 12,
            color: '#34d399',
            coreColor: '#fef08a',
            owner: this,
            damage: 62,
            type: 'arrow'
          });
        });
      }
    } else if (t >= 0.76 && !this.didSecondaryAction) {
      // Row 3 Frame F23 (`t = 0.78s`): High-angle (`-32°`) Skyward Starfall Beacon Arrow & Cyclone Rain!
      this.didSecondaryAction = true;
      this.vx -= this.facing * 45;
      if (game?.audio) game.audio.play('arrow_rain', centerTargetX);

      const bowX = this.x + this.facing * 42;
      const bowY = this.y - 134;
      const skyAng = this.facing === 1 ? -0.58 : Math.PI + 0.58;

      this.fx.spawn('sonicBowReleaseWave', bowX, bowY, {
        flip: false,
        palette: SYLVAN_STARLIGHT_PALETTE,
        light: 1.2,
        extra: { aimAngle: skyAng, radius: 26, twin: true }
      });

      // True 2.5D (`back` + `front` wraparound) Emerald Tempest Cyclone + Diagonal Celestial Comet-Arrow Barrage
      this.fx.spawn('emeraldTempestCyclone', centerTargetX, this.groundY, {
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
      this.fx.spawn('starfallRainBarrage', centerTargetX, this.groundY, {
        palette: SYLVAN_STARLIGHT_PALETTE,
        light: 1.2,
        extra: { spread: 44, count: 7 }
      });

      if (game?.vfx) {
        game.vfx.spawnTornado({
          x: centerTargetX,
          groundY: this.groundY,
          vx: this.facing * 38,
          radius: 78,
          height: 265,
          color: '#10b981',
          coreColor: '#fef08a',
          maxLife: 1.10
        });

        for (let i = 0; i < 9; i++) {
          const spread = (i - 4) * 34 + (Math.random() - 0.5) * 14;
          game.vfx.spawnSkyStrike({
            x: centerTargetX + spread - this.facing * 90,
            y: -160 - i * 32,
            groundY: this.groundY,
            vx: this.facing * 240,
            vy: 1280,
            type: 'starfall_arrow',
            color: i % 2 === 0 ? '#10b981' : '#34d399',
            coreColor: '#fef08a',
            owner: this,
            target: enemy,
            damage: 40,
            delay: i * 0.06,
            maxLinger: 0.55
          });
        }
      }
    } else if (t >= 1.05) {
      this.setState('IDLE');
    }
  }

  /**
   * 1-Overdrive Ultimate (`state === 'ULTIMATE'`, `2.04s`):
   * "ZEPHYR VAULT: 180° STARLOCK BARRAGE"
   * - Phase 1 (`0.00s .. 0.32s`): Gale Charge-In rush straight into the enemy + Twin Bow-Blade Vault-Kick (`32` dmg).
   * - Phase 2 (`0.32s .. 1.56s`): 180° semicircular overhead flip-jump (`theta = 0 .. Math.PI`, flipping upside-down
   *   via baked Row 4 somersault frames `123..133` and flipping `facing` 180° at apex) while firing 7 radial
   *   Lock-On Homing Arrows (`22°, 46°, 70°, 90°, 110°, 134°, 158°`) around the 180° arc!
   * - Phase 3 (`1.56s .. 2.04s`): Agile opposite-side touchdown (`134..135`) + Sylvan recovery.
   */
  updateUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;

    // Evasive wind-form during active Gale Charge-In + 180° Somersault (`t < 1.56s`), vulnerable on landing recovery
    this.isInvulnerable = t < 1.56;
    this.unstoppablePoise = true;
    this.hurtTimer = 0;
    this.isFlipVault = false;
    this.isCrouching = false;
    this.vx = 0;
    this.vy = 0;

    const targets = this.getEnemyTargets(enemy, game);
    const primary = enemy && !enemy.isDead ? enemy : targets[0] || null;

    // Phase 1 (`0.00s .. 0.32s`): Explosive Gale Charge-In Rush right into the enemy!
    if (t < 0.32) {
      if (this._ultPhase < 1) {
        this._ultPhase = 1;
        this._ultShotMask = 0;
        this._ultStartX = this.x;
        this._ultChargeDir = primary ? (primary.x >= this.x ? 1 : -1) : this.facing;
        this.facing = this._ultChargeDir;

        if (game?.audio) game.audio.play('zephyr_flip', this.x);
        if (game?.vfx) {
          game.vfx.spawnDamageText(this.x, this.y - 138, 0, false, 'ZEPHYR CHARGE!', '#34d399');
        }
        this.fx.spawn('zephyrGroundBurst', this.x, this.groundY, {
          palette: SYLVAN_EMERALD_PALETTE,
          light: 1.1,
          extra: { radius: 30 }
        });
        this.fx.spawn('zephyrVaultSlipstream', this.x - this.facing * 16, this.y - 104, {
          follow: this,
          offsetX: -16,
          offsetY: -104,
          flip: this.facing < 0,
          palette: SYLVAN_EMERALD_PALETTE,
          maxDuration: 1.55,
          light: 1.1,
          extra: { length: 28, tilt: -0.12 }
        });
        this.fx.spawn('astralWingPlume', this.x - this.facing * 16, this.y - 122, {
          follow: this,
          offsetX: -16,
          offsetY: -122,
          flip: this.facing < 0,
          palette: SYLVAN_STARLIGHT_PALETTE,
          maxDuration: 1.85,
          light: 1.2,
          extra: { wingSpan: 30 }
        });
      }

      const advBounds =
        game?.adventure?.active && typeof game.adventure.getActiveStageBounds === 'function'
          ? game.adventure.getActiveStageBounds()
          : null;
      const u = Math.min(1, Math.max(0, t / 0.32));
      const easeRush = 1 - Math.pow(1 - u, 2.25);
      const rawContactX = primary
        ? primary.x - this._ultChargeDir * 48
        : this._ultStartX + this._ultChargeDir * 240;
      const contactX = advBounds
        ? Math.max(advBounds.minX + 36, Math.min(advBounds.maxX - 36, rawContactX))
        : Math.max(120, Math.min(ww - 120, rawContactX));

      this.x = this._ultStartX + (contactX - this._ultStartX) * easeRush;
      this.y = this.groundY;
      this.cameraAirLift = 0;
      this._overrideFrameIdx = u < 0.55 ? 120 : 121;

      this._afterimageTimer += dt;
      if (this._afterimageTimer >= 0.09) {
        this._afterimageTimer = 0;
        this.spawnAfterimage(this.x, this.y, this.facing, 4, u < 0.55 ? 0 : 1, 0.20);
      }
      return;
    }

    const advBounds =
      game?.adventure?.active && typeof game.adventure.getActiveStageBounds === 'function'
        ? game.adventure.getActiveStageBounds()
        : null;

    // Vault-Kick Contact & 180° Target Lock-On Snap (`t >= 0.32s`)
    if (this._ultPhase < 2) {
      this._ultPhase = 2;
      if (primary && !primary.isDead) {
        // Ensure 180° overhead semicircle (`±192px`) has clean room inside stage/encounter bounds
        if (!primary.isColossalBoss) {
          primary.x = advBounds
            ? Math.max(advBounds.minX + 200, Math.min(advBounds.maxX - 200, primary.x))
            : Math.max(265, Math.min(ww - 265, primary.x));
          primary.vx = 0;
        }
        this._ultPivotX = advBounds
          ? Math.max(advBounds.minX + 200, Math.min(advBounds.maxX - 200, primary.x))
          : primary.x;
        primary.takeDamage(36, this, false, 30, -85);
        this.spawnVfxAnim(0, primary.x, (primary.groundY || this.groundY) - 96, 184, 184, 0.28, {
          flipX: this._ultChargeDir < 0,
          inFront: true
        });
        this.fx.spawn('sylvanArrowImpactBurst', primary.x, (primary.groundY || this.groundY) - 96, {
          flip: false,
          palette: SYLVAN_STARLIGHT_PALETTE,
          light: 1.2,
          extra: { aimAngle: -Math.PI * 0.5, isCrit: true }
        });
      } else {
        this._ultPivotX = advBounds
          ? Math.max(advBounds.minX + 200, Math.min(advBounds.maxX - 200, this.x + this._ultChargeDir * 48))
          : Math.max(265, Math.min(ww - 265, this.x + this._ultChargeDir * 48));
      }

      this.fx.spawn('yggdrasilLockReticle', this._ultPivotX, this.groundY - 98, {
        flip: false,
        palette: SYLVAN_STARLIGHT_PALETTE,
        maxDuration: 1.36,
        light: 1.25,
        extra: { radius: 19, chargeDir: this._ultChargeDir }
      });
      this.fx.spawn('zephyrGroundBurst', this.x, this.groundY, {
        palette: SYLVAN_STARLIGHT_PALETTE,
        light: 1.15,
        extra: { radius: 28 }
      });
      if (game?.audio) {
        game.audio.play('archer_ult', this.x);
        game.audio.play('zephyr_flip', this.x);
      }
      if (game?.vfx) {
        game.vfx.spawnDamageText(this._ultPivotX, this.groundY - 172, 0, true, '180° STARLOCK!', '#fef08a');
      }
      if (game?.renderer) {
        game.renderer.triggerShake(12, 0.24);
      }
      this._overrideFrameIdx = 122;
    }

    // Phase 2 (`0.32s .. 1.56s`): 180° Semicircular Overhead Flip-Jump + 7 Radial Lock-On Homing Arrows!
    if (t < 1.56) {
      const arcU = Math.min(1, Math.max(0, (t - 0.32) / 1.24));
      const theta = arcU * Math.PI; // Sweeps 0 rad -> PI rad (full 180° overhead arc!)
      const arcRadiusX = 192;
      const arcHeightY = 194;

      // Gently keep locked foe centered inside the 180° reticle unless dodging or Colossal Boss
      if (
        primary &&
        !primary.isDead &&
        !primary.isColossalBoss &&
        primary.state !== 'DODGE' &&
        primary.state !== 'JUMP'
      ) {
        primary.x += (this._ultPivotX - primary.x) * Math.min(1, dt * 7);
      }

      const rawArcX = this._ultPivotX - this._ultChargeDir * Math.cos(theta) * arcRadiusX;
      this.x = advBounds
        ? Math.max(advBounds.minX + 24, Math.min(advBounds.maxX - 24, rawArcX))
        : Math.max(84, Math.min(ww - 84, rawArcX));
      this.y = this.groundY - Math.sin(theta) * arcHeightY;
      this.cameraAirLift = Math.sin(theta) * 142;

      // Flip 180° across the overhead zenith so Sylvara lands on the opposite side facing back at her foe!
      this.facing = theta >= Math.PI * 0.5 ? -this._ultChargeDir : this._ultChargeDir;

      // Baked 30fps Row 4 somersault frames (`123..133` -> `-48° .. -186° upside-down apex .. -336°`, zero ctx.rotate!)
      const somCol = 3 + Math.min(10, Math.floor(arcU * 11));
      this._overrideFrameIdx = 120 + somCol;

      this._afterimageTimer += dt;
      if (this._afterimageTimer >= 0.11) {
        this._afterimageTimer = 0;
        this.spawnAfterimage(this.x, this.y, this.facing, 4, somCol, 0.22);
      }

      // 7 Lock-On Homing Arrows spaced evenly around the 180° overhead arc!
      const lockAnglesDeg = [22, 46, 70, 90, 110, 134, 158];
      for (let i = 0; i < lockAnglesDeg.length; i++) {
        const triggerTheta = (lockAnglesDeg[i] * Math.PI) / 180;
        if (theta >= triggerTheta && (this._ultShotMask & (1 << i)) === 0) {
          this._ultShotMask |= 1 << i;

          const tx = primary && !primary.isDead ? primary.x : this._ultPivotX;
          const ty = (primary && !primary.isDead ? primary.y : this.groundY) - 96;
          const bowX = this.x + (tx >= this.x ? 16 : -16);
          const bowY = this.y - 68;
          const dx = tx - bowX;
          const dy = ty - bowY;
          const shotAng = Math.atan2(dy, dx);
          const isZenith = i === 3;
          const isFinisher = i === 6;

          if (game?.audio) {
            game.audio.play('arrow_shoot', this.x);
            if (isZenith || isFinisher) game.audio.play('arrow_hit', tx);
          }

          this.fx.spawn('starlockHomingArrow', bowX, bowY, {
            flip: false,
            palette: isZenith || isFinisher ? SYLVAN_STARLIGHT_PALETTE : SYLVAN_EMERALD_PALETTE,
            light: isZenith || isFinisher ? 1.3 : 1.15,
            extra: {
              dx: dx / 3,
              dy: dy / 3
            }
          });

          this.fx.spawn('sonicBowReleaseWave', bowX, bowY, {
            flip: false,
            palette: isZenith ? SYLVAN_STARLIGHT_PALETTE : SYLVAN_EMERALD_PALETTE,
            light: 1.15,
            extra: { aimAngle: shotAng, radius: isZenith ? 23 : 18, twin: isZenith }
          });

          this.spawnVfxAnim(1, bowX, bowY, 156, 156, 0.22, {
            vx: Math.cos(shotAng) * 860,
            vy: Math.sin(shotAng) * 860,
            flipX: dx < 0,
            inFront: true,
            isSeeker: true
          });

          if (primary && !primary.isDead) {
            const shotDmg = isZenith ? 36 : 27;
            primary.takeDamage(
              shotDmg,
              this,
              isZenith || isFinisher,
              isFinisher ? 140 : 18,
              isFinisher ? -170 : -24
            );
            if (isZenith || isFinisher) {
              this.spawnVfxAnim(4, tx, ty, 184, 184, 0.32, {
                flipX: false,
                inFront: true
              });
              if (game?.renderer) {
                game.renderer.triggerShake(isFinisher ? 18 : 11, 0.25);
              }
            }
          }
        }
      }
      return;
    }

    // Phase 3 (`1.56s .. 2.04s`): Agile Opposite-Side Touchdown & Recovery
    if (this._ultPhase < 3) {
      this._ultPhase = 3;
      this.didActionFrame = true;
      this.y = this.groundY;
      this.vy = 0;
      this.cameraAirLift = 0;
      this.facing = primary && !primary.isDead ? (primary.x >= this.x ? 1 : -1) : -this._ultChargeDir;
      this.autoCooldown = Math.max(this.autoCooldown, 0.52);
      this.fx.spawn('zephyrGroundBurst', this.x, this.groundY, {
        palette: SYLVAN_EMERALD_PALETTE,
        light: 1.1,
        extra: { radius: 28 }
      });
    }

    this.y = this.groundY;
    this.cameraAirLift = 0;
    this._overrideFrameIdx = t < 1.80 ? 134 : 135;

    if (t >= this.ultDuration) {
      this.isInvulnerable = false;
      this.unstoppablePoise = false;
      this._overrideFrameIdx = null;
      this.cameraAirLift = 0;
      this.setState('IDLE');
    }
  }

  /**
   * 3-Overdrive Supreme Ultimate (`state === 'TRUE_ULTIMATE'`, `4.55s`):
   * "ARROW OF YGGDRASIL: SUPERNOVA PIERCE"
   * - Never changes the stage background image.
   * - Phase 1 (`0.00s .. 0.42s`): Kneeling Earth-Root Invocation (`136..137`) erupting 2.5D Elder-Wood Yggdrasil
   *   Thorn-Root Cages (`yggdrasilRootPrison` + Row 2 Snare + Row 5 Seal) beneath all enemies, rooting them completely in place!
   * - Phase 2 (`0.42s .. 1.28s`): High acrobatic flip-jump (`188px` height, frames `123..134`) all the way to the
   *   FARTHEST edge of the stage (`108` or `ww - 108`, `492px–984px` away from the rooted enemy!) and turning across the arena.
   * - Phase 3 (`1.28s .. 3.15s`): Sovereign Yggdrasil Winged Ascension (`64px` lift, frames `138..144`), Colossal Row 6
   *   Celestial Greatbow Charge (`280x280`), and cross-stage emerald-gold Sagittarius aiming sightline onto the rooted foe.
   * - Phase 4 (`t >= 3.15s`): Full-stage horizontal Row 7 Supernova Dragon-Arrow Pierce (`760` Crit + `14%` Max HP heal).
   * - Phase 5 (`3.15s .. 4.55s`): Smooth sovereign descent (`145..149`) back to `groundY` and clean return to `IDLE`.
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

    // Phase 1 (`0.00s .. 0.42s` — Erupt Elder-Wood Yggdrasil Thorn-Roots & Hard-Root All Enemies!)
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

      // Pick the FARTHEST edge of the active stage/zone away from the rooted enemy so the shot crosses the arena cleanly!
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
          '★ YGGDRASIL ROOTS: BIND! ★',
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
          foe.stunTimer = Math.max(foe.stunTimer || 0, 3.20);
          foe.crouchCooldown = Math.max(foe.crouchCooldown || 0, 0.25);
          foe.dodgeCooldown = Math.max(foe.dodgeCooldown || 0, 0.25);
          foe.dashCooldown = Math.max(foe.dashCooldown || 0, 0.25);
        }
        this._trueUltRootedTargets.push({ foe, lockX, lockY });

        // 2.5D Elder-Wood Yggdrasil Thorn-Root Prison (`back` + `front` wraparound) + Bramble Snare + Yggdrasil Seal
        this.fx.spawn('yggdrasilRootPrison', lockX, lockY, {
          flip: false,
          palette: SYLVAN_EMERALD_PALETTE,
          maxDuration: 3.16,
          light: 1.25,
          extra: { radius: 26, height: 45 }
        });
        this.spawnVfxAnim(2, lockX, lockY - 82, 232, 232, 3.12, {
          flipX: false,
          inFront: false
        });
        this.spawnVfxAnim(5, lockX, lockY - 72, 340, 220, 3.12, {
          flipX: false,
          inFront: false
        });
        if (game?.vfx) {
          game.vfx.spawnDamageText(lockX, lockY - 152, 0, false, 'ROOTED!', '#6ee7b7');
        }
      }

      // If solo test without targets, still place Yggdrasil Seal at `_trueUltTargetX`
      if (targets.length === 0) {
        this.fx.spawn('yggdrasilRootPrison', anchorX, this.groundY, {
          flip: false,
          palette: SYLVAN_EMERALD_PALETTE,
          maxDuration: 3.16,
          light: 1.25,
          extra: { radius: 26, height: 45 }
        });
      }
    }

    // Hold all rooted enemies strictly locked in place (`0` damage pre-ticks!) until the `t = 3.15s` Supernova release
    if (t < 3.15) {
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

    if (t < 0.42) {
      this.y = this.groundY;
      this.cameraAirLift = 0;
      this.trueUltFrameOverride = t < 0.22 ? 136 : 137;
      return;
    }

    // Phase 2 (`0.42s .. 1.28s` — Acrobatic Flip-Jump to the FARTHEST Edge of the Stage!)
    if (t < 1.28) {
      if (this._trueUltStep < 2) {
        this._trueUltStep = 2;
        this._trueUltJumpStartX = this.x;
        if (game?.audio) game.audio.play('zephyr_flip', this.x);
        this.fx.spawn('zephyrGroundBurst', this.x, this.groundY, {
          palette: SYLVAN_STARLIGHT_PALETTE,
          light: 1.2,
          extra: { radius: 34 }
        });
        this.fx.spawn('zephyrVaultSlipstream', this.x - this.facing * 16, this.y - 104, {
          follow: this,
          offsetX: -16,
          offsetY: -104,
          flip: this.facing < 0,
          palette: SYLVAN_STARLIGHT_PALETTE,
          maxDuration: 0.88,
          light: 1.15,
          extra: { length: 30, tilt: -0.14 }
        });
        if (game?.vfx) {
          game.vfx.spawnDamageText(this.x, this.y - 138, 0, false, 'FAR-HORIZON VAULT!', '#fef08a');
        }
      }

      const jumpU = Math.min(1, Math.max(0, (t - 0.42) / 0.86));
      const easeX = jumpU < 0.5 ? 2 * jumpU * jumpU : 1 - Math.pow(-2 * jumpU + 2, 2) / 2;
      const lift = Math.sin(jumpU * Math.PI) * 188;

      this.x = this._trueUltJumpStartX + (this._trueUltFarEdgeX - this._trueUltJumpStartX) * easeX;
      this.y = this.groundY - lift;
      this.cameraAirLift = lift * 0.78;

      // Twist mid-flip to face across the entire arena toward the rooted enemy!
      const jumpDir = Math.sign(this._trueUltFarEdgeX - this._trueUltJumpStartX) || -this.facing;
      this.facing =
        jumpU >= 0.52 ? (this._trueUltTargetX >= this._trueUltFarEdgeX ? 1 : -1) : jumpDir;

      const flipCol = 3 + Math.min(11, Math.floor(jumpU * 12)); // Row 4 F03..F14 (`123..134`)
      this.trueUltFrameOverride = 120 + flipCol;

      this._afterimageTimer += dt;
      if (this._afterimageTimer >= 0.10) {
        this._afterimageTimer = 0;
        this.spawnAfterimage(this.x, this.y, this.facing, 4, flipCol, 0.22);
      }
      return;
    }

    // Phase 3 (`1.28s .. 3.15s` — Far-Edge World-Tree Ascension & Colossal Celestial Greatbow Charge!)
    if (t < 3.15) {
      if (this._trueUltStep < 3) {
        this._trueUltStep = 3;
        this.x = this._trueUltFarEdgeX;
        this.facing = this._trueUltTargetX >= this.x ? 1 : -1;

        if (game?.audio) game.audio.play('archer_ult', this.x);
        if (game?.vfx) {
          game.vfx.spawnDamageText(
            this.x,
            this.groundY - 168,
            0,
            true,
            '★ ARROW OF YGGDRASIL! ★',
            '#34d399'
          );
        }

        this.fx.spawn('zephyrGroundBurst', this.x, this.groundY, {
          palette: SYLVAN_EMERALD_PALETTE,
          light: 1.15,
          extra: { radius: 32 }
        });
        this.spawnVfxAnim(5, this.x, this.groundY - 72, 340, 220, 2.15, {
          flipX: false,
          inFront: false
        });
        this.fx.spawn('astralWingPlume', this.x - this.facing * 16, this.y - 124, {
          follow: this,
          offsetX: -16,
          offsetY: -124,
          flip: this.facing < 0,
          palette: SYLVAN_STARLIGHT_PALETTE,
          maxDuration: 3.1,
          light: 1.35,
          extra: { wingSpan: 35 }
        });
        this.fx.spawn('sylvanBowDrawVortex', this.x + this.facing * 38, this.y - 96, {
          follow: this,
          offsetX: 38,
          offsetY: -96,
          palette: SYLVAN_STARLIGHT_PALETTE,
          maxDuration: 1.84,
          light: 1.35,
          extra: { radius: 30 }
        });
      }

      this.x = this._trueUltFarEdgeX;
      this.facing = this._trueUltTargetX >= this.x ? 1 : -1;
      const ascU = Math.min(1, Math.max(0, (t - 1.28) / 0.85));
      const liftY = 64 * Math.sin(ascU * (Math.PI * 0.5));
      this.y = this.groundY - liftY;
      this.cameraAirLift = liftY * 0.5;

      // Row 4 Sovereign Yggdrasil Winged Greatbow Draw frames `18..24` (`138..144`)
      const drawU = Math.min(1, Math.max(0, (t - 1.28) / 1.87));
      this.trueUltFrameOverride = 138 + Math.min(6, Math.floor(drawU * 7));

      // Converging emerald/gold star-motes into the drawn Greatbow Muzzle (zero damage pre-ticks!)
      if (t >= 1.35 && t <= 3.10) {
        this._trueUltMoteTimer += dt;
        if (this._trueUltMoteTimer >= 0.16) {
          this._trueUltMoteTimer = 0;
          const muzzleX = this.x + this.facing * 38;
          const muzzleY = this.y - 96;
          if (game?.vfx?.spawnParticles) {
            game.vfx.spawnParticles(muzzleX, muzzleY, 2, '#34d399');
          } else if (game?.vfx?.spawnParticle) {
            for (let i = 0; i < 2; i++) {
              const ang = Math.PI * i + t * 5.5;
              const rad = 74;
              game.vfx.spawnParticle({
                x: muzzleX + Math.cos(ang) * rad,
                y: muzzleY + Math.sin(ang) * rad,
                vx: -Math.cos(ang) * 195,
                vy: -Math.sin(ang) * 195,
                size: 4.5,
                color: i % 2 === 0 ? '#34d399' : '#fef08a',
                maxLife: 0.34
              });
            }
          }
        }
      }
      return;
    }

    // Phase 4 (`t >= 3.15s`, `_trueUltStep < 4` — Full-Stage Cataclysmic Supernova Dragon-Arrow Pierce!)
    if (this._trueUltStep < 4) {
      this._trueUltStep = 4;
      this._trueUltBeamTimer = 0.96;

      game?.renderer?.triggerImpactFrame?.(0.11, this.x, this.y - 96, 'emerald');
      if (game?.renderer && game.renderer.impactFrameTimer > 1.0) {
        game.renderer.triggerImpactFrame(this.x, this.y - 96, 0.11, 'emerald');
      }
      game?.renderer?.shake?.(26, 0.68);
      game?.renderer?.triggerShake?.(26, 0.68);
      game?.renderer?.flash?.(0.28, '#ecfdf5');
      game?.renderer?.triggerAberration?.(16);
      game?.renderer?.triggerHitStop?.(0.09);

      if (game?.audio) {
        game.audio.play('archer_ult', this.x);
        game.audio.play('solar_beam', this.x);
        game.audio.play('arrow_hit', this._trueUltTargetX);
      }

      // Heal Sylvara for 14% Max HP
      this.heal(Math.round(this.maxHp * 0.14), 'WORLD-TREE GRACE');

      const startX = this.x + this.facing * 42;
      const startY = this.y - 96;
      const endX = this.facing >= 0 ? ww - 76 : 76;
      this.fx.spawn('astralHurricaneLance', startX, startY, {
        flip: false,
        palette: SYLVAN_STARLIGHT_PALETTE,
        light: 1.4,
        extra: {
          dx: (endX - startX) / 3,
          dy: 0,
          width: 9.6
        }
      });
      this.fx.spawn('sonicBowReleaseWave', startX, startY, {
        flip: false,
        palette: SYLVAN_STARLIGHT_PALETTE,
        light: 1.35,
        extra: { aimAngle: this.facing >= 0 ? 0 : Math.PI, radius: 34, twin: true }
      });

      // Shatter root prisons and obliterate all rooted / active enemies across the stage (`700` Crit)!
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
          this.fx.spawn('sylvanArrowImpactBurst', tFoe.x, impY, {
            flip: false,
            palette: SYLVAN_STARLIGHT_PALETTE,
            light: 1.4,
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

    // Phase 5 (`3.15s .. 4.55s` — Sovereign Release Recoil & Smooth Descent to `IDLE`)
    const descU = Math.min(1, Math.max(0, (t - 3.15) / (this.trueUltDuration - 3.15)));
    const remLift = 64 * Math.cos(descU * (Math.PI * 0.5));
    this.y = this.groundY - remLift;
    this.cameraAirLift = remLift * 0.5;
    this.trueUltFrameOverride = 145 + Math.min(4, Math.floor(descU * 5));

    if (t >= this.trueUltDuration) {
      this.y = this.groundY;
      this.vy = 0;
      this.cameraAirLift = 0;
      this.isInvulnerable = false;
      this.unstoppablePoise = false;
      this.trueUltFrameOverride = null;
      this._trueUltBeamTimer = 0;
      this.autoCooldown = Math.max(this.autoCooldown, 0.65);
      this.releaseRootedTargets();
      this.setState('IDLE');
    }
  }

  drawBehind(ctx, _renderer = null) {
    const vfxSheet = PixelForge.initAssets()?.archer?.vfx;
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
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha * 0.94));
      ctx.drawImage(vfxSheet, sx, sy, 208, 208, -v.w * 0.5, -v.h * 0.5, v.w, v.h);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha * 0.20));
      ctx.drawImage(vfxSheet, sx, sy, 208, 208, -v.w * 0.5, -v.h * 0.5, v.w, v.h);
      ctx.restore();
    }
    ctx.restore();
  }

  drawForegroundOverlay(ctx, renderer = null) {
    const sprites = PixelForge.initAssets()?.archer;

    // 0. Background 30fps `archer_vfx.png` animations (Row 2 Bramble Snares & Row 5 Yggdrasil World-Tree Seals)
    this.drawBehind(ctx, renderer);

    // 1. Crisp Emerald-Starlight Zephyr Afterimages (`JUMP` Vault, `DASH` Gale Stride, & 180° Somersaults)
    if (this.afterimages.length > 0 && sprites?.sheet?.complete) {
      for (const img of this.afterimages) {
        const alpha = Math.max(0, (1 - img.age / img.maxLife) * 0.28);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(Math.round(img.x / 4) * 4, Math.round(img.y / 4) * 4);
        ctx.scale(img.facing, 1);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha;
        PixelForge.drawAfterimageFrame(ctx, sprites, img.frameIdx, 208, 208);
        ctx.restore();
      }
    }

    // 2. Live 120Hz `ArcaneShaderFX` "back" layer (renders behind Sylvara & opponent)
    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    this.fx.renderLayer(ctx, 'back', arenaCenterX, this.groundY, 0.96);
  }

  drawUltimateForeground(ctx, renderer = null) {
    // Live 120Hz `ArcaneShaderFX` "front" layer (renders crisp foreground wind-arcs, root cages, reticles & homing arrows)
    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    this.fx.renderLayer(ctx, 'front', arenaCenterX, this.groundY, 0.98);
  }

  draw(ctx, isReflection = false, renderer = null) {
    const sprites = PixelForge.initAssets()?.archer;
    if (!sprites) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const w = 208;
    const h = 208;
    const frameIdx = PixelForge.getFrameIndex(this, this.windPhase);

    const groundPlantOffset = 4;
    ctx.translate(Math.round(this.x), Math.round(this.y + groundPlantOffset));
    ctx.scale(this.facing, 1);

    PixelForge.drawSheetFrame(ctx, sprites, this, w, h, this.windPhase, isReflection, renderer);

    if (this.hitFlash > 0 && !isReflection) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5;
      PixelForge.drawGhostFrame(ctx, sprites, frameIdx, w, h);
    }

    ctx.restore();

    if (isReflection) return;

    const vfxSheet = PixelForge.initAssets()?.archer?.vfx;
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Foreground 30fps `archer_vfx.png` animations (Row 0 Muzzle/Slash, Row 1 Seekers, Row 3 Dragon-Piercer, Row 4 Star-Cross)
    for (const v of this.activeVfxAnims) {
      if (!v.inFront) continue;
      const u = Math.min(1, Math.max(0, v.age / Math.max(0.05, v.maxLife)));
      const span = Math.max(1, (v.endFrame ?? 29) - (v.startFrame ?? 0) + 1);
      const col = Math.min(29, (v.startFrame ?? 0) + Math.floor(u * span));
      const sx = col * 208;
      const sy = v.row * 208;
      const alpha = u < 0.08 ? u / 0.08 : u > 0.78 ? (1 - u) / 0.22 : 1.0;

      ctx.save();
      ctx.translate(Math.round(v.x), Math.round(v.y));
      if (v.flipX) ctx.scale(-1, 1);
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha * 0.96));
      ctx.drawImage(vfxSheet, sx, sy, 208, 208, -v.w * 0.5, -v.h * 0.5, v.w, v.h);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha * 0.20));
      ctx.drawImage(vfxSheet, sx, sy, 208, 208, -v.w * 0.5, -v.h * 0.5, v.w, v.h);
      ctx.restore();
    }

    // 2. Supreme Ultimate Phase 3 (`1.32s .. 3.14s` at the Farthest Stage Edge):
    //    Colossal Drawn Golden-Emerald Celestial Greatbow Muzzle (`Row 6`, 280x280) + Cross-Stage Sagittarius Sightline!
    if (this.state === 'TRUE_ULTIMATE' && this.stateTimer >= 1.32 && this.stateTimer <= 3.14) {
      const chargeU = Math.min(1, Math.max(0, (this.stateTimer - 1.32) / 1.82));
      const col = Math.min(29, Math.floor(chargeU * 30));
      const sx = col * 208;
      const sy = 6 * 208;
      const bowX = Math.round(this.x + this.facing * 38);
      const bowY = Math.round(this.y - 96);

      // Cross-stage emerald-gold Sagittarius lock sightline connecting far-edge Greatbow to the rooted enemy!
      ctx.save();
      const sightAlpha = Math.min(0.82, 0.25 + chargeU * 0.65);
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 3;
      ctx.globalAlpha = sightAlpha * 0.45;
      ctx.beginPath();
      ctx.moveTo(bowX + this.facing * 42, bowY);
      ctx.lineTo(this._trueUltTargetX, this.groundY - 96);
      ctx.stroke();

      ctx.strokeStyle = '#fef9c3';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = sightAlpha * 0.85;
      ctx.beginPath();
      ctx.moveTo(bowX + this.facing * 42, bowY);
      ctx.lineTo(this._trueUltTargetX, this.groundY - 96);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.translate(bowX, bowY);
      ctx.scale(this.facing, 1);
      ctx.globalAlpha = 0.96;
      ctx.drawImage(vfxSheet, sx, sy, 208, 208, -140, -140, 280, 280);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.22;
      ctx.drawImage(vfxSheet, sx, sy, 208, 208, -140, -140, 280, 280);
      ctx.restore();
    }

    // 3. Supreme Ultimate Phase 4 (`this._trueUltBeamTimer > 0`): Seamless Full-Screen Horizontal Row 7 Supernova Dragon-Arrow Beam!
    if (this._trueUltBeamTimer > 0) {
      const beamProg = Math.min(1, Math.max(0, 1 - this._trueUltBeamTimer / 0.96));
      const col = Math.min(29, Math.floor(beamProg * 30));
      const sx = col * 208;
      const sy = 7 * 208;
      const env = this._trueUltBeamTimer < 0.22 ? this._trueUltBeamTimer / 0.22 : 1.0;
      const muzzleX = Math.round(this.x + this.facing * 38);
      const beamY = Math.round(this.y - 96);
      // Slice the exact 3-wave 112px core (`sx + 44 .. sx + 156`) and tile edge-to-edge (`i * 112`) + non-overlapping 52px tip (`sx + 156 .. sx + 208`)
      const coreSliceX = sx + 44;
      const coreSliceW = 112;
      const tipSliceX = sx + 156;
      const tipSliceW = 52;
      const segCount = 12; // 12 * 112 = 1344px (> 1200px full arena width!)

      ctx.save();
      ctx.translate(muzzleX, beamY);
      ctx.scale(this.facing, 1);

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = Math.max(0, Math.min(1, env * 0.98));
      for (let i = 0; i < segCount; i++) {
        const segX = 24 + i * coreSliceW;
        ctx.drawImage(vfxSheet, coreSliceX, sy, coreSliceW, 208, segX, -112, coreSliceW, 224);
      }
      ctx.drawImage(vfxSheet, tipSliceX, sy, tipSliceW, 208, 24 + segCount * coreSliceW, -112, tipSliceW, 224);
      ctx.drawImage(vfxSheet, sx, 6 * 208, 208, 208, -140, -140, 280, 280);

      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.max(0, Math.min(1, env * 0.22));
      for (let i = 0; i < segCount; i++) {
        const segX = 24 + i * coreSliceW;
        ctx.drawImage(vfxSheet, coreSliceX, sy, coreSliceW, 208, segX, -120, coreSliceW, 240);
      }
      ctx.drawImage(vfxSheet, tipSliceX, sy, tipSliceW, 208, 24 + segCount * coreSliceW, -120, tipSliceW, 240);
      ctx.drawImage(vfxSheet, sx, 6 * 208, 208, 208, -140, -140, 280, 280);

      ctx.restore();
    }

    ctx.restore();
  }
}
