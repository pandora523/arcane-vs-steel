import { Fighter } from './Fighter.js?v=30fps68';
import { PixelForge } from '../engine/PixelForge.js?v=30fps68';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps68';
import {
  SYLVAN_EFFECT_REGISTRY,
  SYLVAN_EMERALD_PALETTE,
  SYLVAN_STARLIGHT_PALETTE
} from '../engine/shaders/sylvanShaders.js?v=30fps68';

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
    this.ultName = 'ASTRAL HURRICANE';
    this.skillName = 'VERDANT SNARE & SEEKERS';
    this.hasTrueUltimate = true;
    this.trueUltName = 'ARROW OF YGGDRASIL: SUPERNOVA PIERCE';
    this.trueUltDuration = 4.35;
    this.windPhase = 0;
    this.shotCombo = 0;
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
    this._trueUltStep = 0;
    this._trueUltBeamTimer = 0;
    this._trueUltMoteTimer = 0;
    this._trueUltTargetX = this.x + this.facing * 320;
    this.brambleSnareZones = [];

    // Native 120Hz dual-buffer HD-2D Sylvan shader & particle runtime (`back` + `front` 2.5D layers)
    this.fx = new ArcaneShaderFX(SYLVAN_EFFECT_REGISTRY, { pixelScale: 3, viewW: 440, viewH: 220 });

    if (typeof Image !== 'undefined') {
      const archerAssets = PixelForge.initAssets()?.archer;
      if (archerAssets?.vfx?.src && !archerAssets.vfx.src.includes('v=30fps62')) {
        archerAssets.vfx.src = 'assets/sprites/archer_vfx.png?v=30fps68';
      }
    }

    this.afterimages = [];
    this._afterimageTimer = 0;
    this._drewBowVortex = false;
    this._skillLockSpawned = false;
    this._deathBurstTriggered = false;
  }

  setState(newState) {
    super.setState(newState);
    if (newState !== 'CROUCH') {
      this.isDeflecting = false;
      this.fx?.stopByKey('sylvanLeafCloakDome');
    }
    if (newState !== 'DASH' && newState !== 'JUMP' && newState !== 'DODGE') {
      this.fx?.stopByKey('zephyrVaultSlipstream');
    }
    if (newState !== 'ULTIMATE' && newState !== 'TRUE_ULTIMATE') {
      this.fx?.stopByKey('astralWingPlume');
    }
    if (newState === 'TRUE_ULTIMATE') {
      this._trueUltStep = 0;
      this._trueUltBeamTimer = 0;
      this._trueUltMoteTimer = 0;
      this._trueUltTargetX = this.x + this.facing * 320;
      this.trueUltFrameOverride = 124;
    } else {
      this._trueUltStep = 0;
      this._trueUltBeamTimer = 0;
      this._trueUltMoteTimer = 0;
      this.trueUltFrameOverride = null;
    }
    this._drewBowVortex = false;
    this._skillLockSpawned = false;
    this._afterimageTimer = 0;
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

    this.fx.spawn('zephyrGroundBurst', this.x, this.groundY, {
      palette: SYLVAN_EMERALD_PALETTE,
      light: 1.0,
      extra: { radius: 22 }
    });
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
        if (this._afterimageTimer >= 0.085) {
          this._afterimageTimer = 0;
          this.spawnAfterimage(this.x, this.y, this.facing, 8, Math.min(29, Math.floor(u * 30)), 0.22);
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
        this.fx.spawn('zephyrGroundBurst', this.x, this.groundY, {
          palette: SYLVAN_EMERALD_PALETTE,
          light: 1.0,
          extra: { radius: 22 }
        });
        this.setState('IDLE');
      }
      return;
    }

    // Row 6 (30-frame DASH — Gale Stride): mid-dash snap-shot at F14 (`t >= 0.20`)
    this.x += this.dashDir * 295 * dt;
    this._afterimageTimer += dt;
    if (this._afterimageTimer >= 0.09) {
      this._afterimageTimer = 0;
      const col = Math.min(29, Math.floor((t / Math.max(0.1, this.dashDuration)) * 30));
      this.spawnAfterimage(this.x, this.y, this.facing, 6, col, 0.2);
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

    if (!this.isDead && this.state === 'WALK') {
      this.stepTimer += dt;
      if (this.stepTimer >= 0.34) {
        this.stepTimer = 0;
        this.fx.spawn('zephyrGroundBurst', this.x - this.facing * 14, this.groundY, {
          palette: SYLVAN_EMERALD_PALETTE,
          light: 0.85,
          extra: { radius: 13 }
        });
      }
    }

    if (enemy && !enemy.isDead && (this.state === 'IDLE' || this.state === 'WALK')) {
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

      if (dist < 220) {
        this.x -= this.facing * this.moveSpeed * 0.65 * dt;
      }
    }

    super.update(dt, enemy, game);
  }

  updateAutoAttack(dt, enemy, game) {
    const t = this.stateTimer;
    if (t < 0.48) {
      this.torsoAngle = -this.facing * 0.12 * (t / 0.48);
      if (t >= 0.08 && !this._drewBowVortex) {
        this._drewBowVortex = true;
        const willBeDragonPiercer = this.shotCombo % 3 === 2;
        this.fx.spawn('sylvanBowDrawVortex', this.x + this.facing * 54, this.y - 120, {
          follow: this,
          offsetX: 54,
          offsetY: -120,
          palette: willBeDragonPiercer ? SYLVAN_STARLIGHT_PALETTE : SYLVAN_EMERALD_PALETTE,
          maxDuration: 0.38,
          light: 1.05,
          extra: { radius: willBeDragonPiercer ? 24 : 20 }
        });
      }
    } else if (t < 0.74) {
      // Row 2 Frame F19: High-velocity Tempest Piercer arrow release + 3-stage Ranged Combo + Close-Range Star-Blade Vault Shot
      if (!this.didActionFrame) {
        this.didActionFrame = true;
        const comboStage = this.shotCombo % 3;
        this.shotCombo++;
        this.vx -= this.facing * 50;
        if (game?.audio) game.audio.play('arrow_shoot', this.x);

        // Close-Range < 165px ("Star-Blade Vault Shot"): slash with twin bladed bow limbs + 95px backward slide + point-blank emerald arrow!
        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 165) {
          const ww = game?.renderer ? game.renderer.worldWidth : 1200;
          enemy.takeDamage(46, this, false, 140, -60);
          this.spawnVfxAnim(0, enemy.x, (enemy.groundY || this.groundY) - 96, 196, 196, 0.36, {
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
        const spawnY = this.y - 120;
        const targetY = enemy ? enemy.y - 116 : spawnY;
        const dx = enemy ? enemy.x - spawnX : this.facing * 520;
        const dy = targetY - spawnY;
        const dist = Math.hypot(dx, dy) || 1;
        const speed = 705;
        const shotAng = Math.atan2(dy, dx);
        const isTwinShot = comboStage === 1;
        const isDragonPiercer = comboStage === 2;
        const baseDamage = 118;

        // Stage 0 / Muzzle Flash (`archer_vfx.png` Row 0)
        this.spawnVfxAnim(0, spawnX, spawnY, 188, 188, 0.34, {
          flipX: this.facing < 0,
          inFront: true
        });

        // Stage 2: Charged Dragon-Piercer (`isCrit = true`, `1.30x` damage, `spawnVfxAnim(3, ...)`)
        if (isDragonPiercer) {
          this.spawnVfxAnim(3, this.x + this.facing * 56, this.y - 96, 208, 208, 0.42, {
            flipX: this.facing < 0,
            inFront: true
          });
          if (game?.vfx) {
            game.vfx.spawnDamageText(this.x, this.y - 148, 0, true, 'DRAGON-PIERCER!', '#fde047');
          }
        }

        if (game?.vfx) {
          const isCrit = isDragonPiercer;
          const mainDmg = isDragonPiercer
            ? Math.round(baseDamage * 1.30)
            : isTwinShot
              ? 102
              : baseDamage;

          game.vfx.spawnProjectile({
            x: spawnX,
            y: spawnY,
            vx: (dx / dist) * (isDragonPiercer ? speed * 1.08 : speed),
            vy: (dy / dist) * (isDragonPiercer ? speed * 1.08 : speed) + (isTwinShot ? -16 : 0),
            radius: isDragonPiercer ? 16 : 14,
            color: '#10b981',
            coreColor: '#fef08a',
            owner: this,
            damage: mainDmg,
            isCrit,
            pierce: isDragonPiercer,
            type: 'arrow'
          });

          // Stage 1: Twin Split-Arc Volley (2 arrows angled slightly high/low)
          if (isTwinShot) {
            game.vfx.spawnProjectile({
              x: spawnX - this.facing * 18,
              y: spawnY - 12,
              vx: (dx / dist) * (speed * 0.94),
              vy: (dy / dist) * (speed * 0.94) + 18,
              radius: 13,
              color: '#34d399',
              coreColor: '#fef08a',
              owner: this,
              damage: 82,
              type: 'arrow'
            });
          }
        }

        this.fx.spawn('sonicBowReleaseWave', spawnX, spawnY, {
          flip: false,
          palette: isDragonPiercer || isTwinShot ? SYLVAN_STARLIGHT_PALETTE : SYLVAN_EMERALD_PALETTE,
          light: isDragonPiercer ? 1.3 : isTwinShot ? 1.25 : 1.12,
          extra: {
            aimAngle: shotAng,
            radius: isDragonPiercer ? 30 : isTwinShot ? 28 : 23,
            twin: isTwinShot || isDragonPiercer
          }
        });
      }
    } else if (t >= 0.86) {
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

  updateUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const targetX = Math.max(120, Math.min(ww - 120, enemy ? enemy.x : this.x + this.facing * 380));

    this.y = this.groundY;
    this.vy = 0;

    if (t < 0.04) {
      this.spawnedChannelTornado = false;
    }

    if (t < 0.56) {
      if (!this.spawnedChannelTornado && t >= 0.05) {
        this.spawnedChannelTornado = true;
        if (game?.audio) game.audio.play('zephyr_flip', this.x);

        // 1. Radiant 6-Pinion Astral Light-Wings behind Sylvara's levitating torso (`back` layer)
        this.fx.spawn('astralWingPlume', this.x - this.facing * 16, this.y - 124, {
          follow: this,
          offsetX: -16,
          offsetY: -124,
          flip: this.facing < 0,
          palette: SYLVAN_STARLIGHT_PALETTE,
          maxDuration: 1.38,
          light: 1.2,
          extra: { wingSpan: 30 }
        });

        // 2. Bow-Draw Astral Convergence + Ground Updraft + Target Celestial Astrolabe Lock
        this.fx.spawn('sylvanBowDrawVortex', this.x + this.facing * 52, this.y - 128, {
          follow: this,
          offsetX: 52,
          offsetY: -128,
          palette: SYLVAN_STARLIGHT_PALETTE,
          maxDuration: 0.5,
          light: 1.2,
          extra: { radius: 26 }
        });
        this.fx.spawn('zephyrGroundBurst', this.x, this.groundY, {
          palette: SYLVAN_EMERALD_PALETTE,
          light: 1.1,
          extra: { radius: 32 }
        });
        this.fx.spawn('starfallCelestialLock', targetX, this.groundY, {
          palette: SYLVAN_STARLIGHT_PALETTE,
          light: 1.15,
          extra: { radius: 40, beaconH: 64 }
        });
        this.fx.spawn('emeraldTempestCyclone', this.x + this.facing * 64, this.groundY, {
          vx: this.facing * 95,
          palette: SYLVAN_EMERALD_PALETTE,
          maxDuration: 0.52,
          light: 1.1,
          extra: { baseRadius: 10, topRadius: 26, height: 78, isUltimate: false }
        });
      }
    } else if (!this.didActionFrame) {
      // Row 4 Frame F18 (`t = 0.56s`): Full Astral Light-Wing Dragon-Arrow Release!
      this.didActionFrame = true;
      if (game?.audio) game.audio.play('archer_ult', this.x);

      const startX = this.x + this.facing * 52;
      const startY = this.y - 128;
      const endX =
        this.facing === 1
          ? Math.min(ww - 110, Math.max(targetX + 210, this.x + 560))
          : Math.max(110, Math.min(targetX - 210, this.x - 560));
      const endY = this.groundY - 128;

      if (game?.renderer) {
        game.renderer.triggerShake(26, 0.65);
        game.renderer.triggerAberration(15);
        game.renderer.triggerHitStop(0.09);
      }

      // 1. Native 120Hz `astralHurricaneLance` (Triple Dragon-Wind Helices + 5 Cascading 3D Mach Rings)
      this.fx.spawn('astralHurricaneLance', startX, startY, {
        flip: false,
        palette: SYLVAN_EMERALD_PALETTE,
        light: 1.3,
        extra: {
          dx: (endX - startX) / 3,
          dy: (endY - startY) / 3,
          width: 8.2
        }
      });

      this.fx.spawn('sonicBowReleaseWave', startX, startY, {
        flip: false,
        palette: SYLVAN_STARLIGHT_PALETTE,
        light: 1.25,
        extra: { aimAngle: this.facing === 1 ? 0 : Math.PI, radius: 32, twin: true }
      });

      // 2. Colossal True 2.5D Ultimate Emerald Tempest Cyclone wrapping behind & over the enemy!
      this.fx.spawn('emeraldTempestCyclone', targetX, this.groundY, {
        vx: this.facing * 36,
        palette: SYLVAN_EMERALD_PALETTE,
        light: 1.3,
        extra: {
          baseRadius: 14,
          topRadius: 36,
          height: 90,
          isUltimate: true
        }
      });

      this.fx.spawn('sylvanArrowImpactBurst', targetX, this.groundY - 96, {
        flip: false,
        palette: SYLVAN_STARLIGHT_PALETTE,
        light: 1.3,
        extra: { aimAngle: this.facing === 1 ? 0 : Math.PI, isCrit: true }
      });

      // 3. Preserved Roaring Astral Wind-Dragon Beam & Fissure Decal
      if (game?.vfx) {
        game.vfx.spawnBeam({
          x1: startX,
          y1: startY,
          x2: endX,
          y2: endY,
          width: 56,
          color: '#10b981',
          coreColor: '#fef08a',
          maxLife: 0.78
        });
        game.vfx.spawnTornado({
          x: targetX,
          groundY: this.groundY,
          vx: this.facing * 45,
          radius: 102,
          height: 325,
          color: '#10b981',
          coreColor: '#fef08a',
          maxLife: 1.45,
          isUltimate: true
        });
        game.vfx.spawnDecal(targetX, 175, 'fissure', '#10b981', 6.0);
      }

      if (enemy && !enemy.isDead) {
        enemy.takeDamage(295, this, true, 220, -340);
      }
    } else if (t >= 1.6) {
      this.setState('IDLE');
    }
  }

  /**
   * 3-Overdrive Supreme Ultimate (`state === 'TRUE_ULTIMATE'`, `4.35s`):
   * "ARROW OF YGGDRASIL: SUPERNOVA PIERCE"
   * - Never changes the stage background image.
   * - Phase 1 (`0.00s .. 2.85s`): World-Tree Ascension (up to `64px` above `groundY`), Row 5 Yggdrasil Seal,
   *   and continuous Row 6 Colossal Celestial Greatbow Muzzle charge (`280x280`) with zero damage ticks.
   * - Phase 2 (`t >= 2.85s`): Instantaneous full-screen horizontal Row 7 Supernova Dragon-Arrow Pierce (`365` Crit + `18%` Max HP heal).
   * - Phase 3 (`2.85s .. 4.35s`): Smooth descent back to `groundY` and return to `IDLE`.
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

    const targets = game?.getEnemiesOf ? game.getEnemiesOf(this) : enemy ? [enemy] : [];
    const primaryTarget =
      enemy && !enemy.isDead ? enemy : targets.find((foe) => foe && !foe.isDead && !foe.isBenched) || null;

    if (t < 2.85 && primaryTarget) {
      this._trueUltTargetX = Math.max(110, Math.min(ww - 110, primaryTarget.x));
      if (Math.abs(primaryTarget.x - this.x) > 8) {
        this.facing = primaryTarget.x >= this.x ? 1 : -1;
      }
    }

    // Phase 1 (`0.00s .. 2.85s` — World-Tree Ascension & Constellation Bow Charge)
    if (t < 2.85) {
      const ascU = Math.min(1, t / 1.15);
      this.y = this.groundY - 64 * Math.sin(ascU * (Math.PI * 0.5));
      // Row 4 (`ULTIMATE` bow-draw pose frames `4..13` -> indices `124..133`)
      this.trueUltFrameOverride = 120 + 4 + Math.min(9, Math.floor((t / 2.85) * 10));

      if (t >= 0.04 && this._trueUltStep < 1) {
        this._trueUltStep = 1;
        if (game?.audio) {
          game.audio.play('archer_ult', this.x);
          game.audio.play('arrow_shoot', this.x);
        }
        game?.vfx?.triggerCinematicCutIn?.(this, this.trueUltName, '#34d399');
        if (game?.vfx) {
          game.vfx.spawnDamageText(
            this.x,
            this.y - 164,
            0,
            true,
            '★ ARROW OF YGGDRASIL! ★',
            '#34d399'
          );
        }

        // Spawn `archer_vfx.png` Row 5 (Yggdrasil World-Tree & Constellation Seal) beneath Sylvara & under target enemy
        this.spawnVfxAnim(5, this.x, this.groundY - 72, 340, 220, 2.85, {
          flipX: false,
          inFront: false
        });
        this.spawnVfxAnim(5, this._trueUltTargetX, this.groundY - 72, 340, 220, 2.85, {
          flipX: false,
          inFront: false
        });

        this.fx.spawn('astralWingPlume', this.x - this.facing * 16, this.y - 124, {
          follow: this,
          offsetX: -16,
          offsetY: -124,
          flip: this.facing < 0,
          palette: SYLVAN_STARLIGHT_PALETTE,
          maxDuration: 3.9,
          light: 1.3,
          extra: { wingSpan: 34 }
        });
        this.fx.spawn('sylvanBowDrawVortex', this.x + this.facing * 38, this.y - 96, {
          follow: this,
          offsetX: 38,
          offsetY: -96,
          palette: SYLVAN_STARLIGHT_PALETTE,
          maxDuration: 2.75,
          light: 1.3,
          extra: { radius: 28 }
        });
      }

      // During `0.20s .. 2.80s`: converging emerald/gold star-motes toward the drawn Celestial Greatbow Muzzle (zero damage ticks!)
      if (t >= 0.20 && t <= 2.80) {
        this._trueUltMoteTimer += dt;
        if (this._trueUltMoteTimer >= 0.08) {
          this._trueUltMoteTimer = 0;
          const muzzleX = this.x + this.facing * 38;
          const muzzleY = this.y - 96;
          if (game?.vfx?.spawnParticles) {
            game.vfx.spawnParticles(muzzleX, muzzleY, 4, '#34d399');
          } else if (game?.vfx?.spawnParticle) {
            for (let i = 0; i < 4; i++) {
              const ang = (Math.PI * 2 * i) / 4 + t * 5.0;
              const rad = 76;
              game.vfx.spawnParticle({
                x: muzzleX + Math.cos(ang) * rad,
                y: muzzleY + Math.sin(ang) * rad,
                vx: -Math.cos(ang) * 190,
                vy: -Math.sin(ang) * 190,
                size: 5,
                color: i % 2 === 0 ? '#34d399' : '#fef08a',
                maxLife: 0.36
              });
            }
          }
        }
      }
      return;
    }

    // Phase 2 (`t >= 2.85s`, `_trueUltStep < 2` — Instant Full-Screen Supernova Dragon-Arrow Pierce)
    if (this._trueUltStep < 2) {
      this._trueUltStep = 2;
      this._trueUltBeamTimer = 0.95;

      game?.renderer?.triggerImpactFrame?.(0.11, this.x, this.y - 96, 'emerald');
      if (game?.renderer && game.renderer.impactFrameTimer > 1.0) {
        game.renderer.triggerImpactFrame(this.x, this.y - 96, 0.11, 'emerald');
      }
      game?.renderer?.shake?.(24, 0.65);
      game?.renderer?.triggerShake?.(24, 0.65);
      game?.renderer?.flash?.(0.28, '#ecfdf5');
      game?.renderer?.triggerAberration?.(15);
      game?.renderer?.triggerHitStop?.(0.09);

      if (game?.audio) {
        game.audio.play('archer_ult', this.x);
        game.audio.play('solar_beam', this.x);
        game.audio.play('arrow_hit', this.x);
      }

      // Heal Sylvara for 14% Max HP
      this.heal(Math.round(this.maxHp * 0.14), 'WORLD-TREE GRACE');

      const startX = this.x + this.facing * 42;
      const startY = this.y - 96;
      const endX = this.facing >= 0 ? ww + 120 : -120;
      this.fx.spawn('astralHurricaneLance', startX, startY, {
        flip: false,
        palette: SYLVAN_STARLIGHT_PALETTE,
        light: 1.4,
        extra: {
          dx: (endX - startX) / 3,
          dy: 0,
          width: 9.5
        }
      });

      // Single instantaneous massive burst of 760 Crit damage to all active enemies in front of or near the beam!
      let hitAny = false;
      for (const tFoe of targets) {
        if (tFoe && !tFoe.isDead && !tFoe.isBenched) {
          const relX = (tFoe.x - this.x) * this.facing;
          if (relX >= -110 || Math.abs(tFoe.x - this._trueUltTargetX) <= 260) {
            tFoe.takeDamage(760, this, true, 320, -240);
            hitAny = true;
            this.spawnVfxAnim(3, tFoe.x, (tFoe.groundY || this.groundY) - 96, 236, 236, 0.48, {
              flipX: this.facing < 0,
              inFront: true
            });
            this.fx.spawn('sylvanArrowImpactBurst', tFoe.x, (tFoe.groundY || this.groundY) - 96, {
              flip: false,
              palette: SYLVAN_STARLIGHT_PALETTE,
              light: 1.38,
              extra: { aimAngle: this.facing === 1 ? 0 : Math.PI, isCrit: true }
            });
          }
        }
      }
      if (!hitAny && primaryTarget && !primaryTarget.isDead) {
        primaryTarget.takeDamage(760, this, true, 320, -240);
      }
    }

    // Phase 3 (`2.85s .. 4.35s` — Smooth Descent & Recovery to IDLE)
    const descU = Math.min(1, Math.max(0, (t - 2.85) / (this.trueUltDuration - 2.85)));
    this.y = this.groundY - 64 * Math.cos(descU * (Math.PI * 0.5));
    this.trueUltFrameOverride = 120 + Math.min(29, 18 + Math.floor(descU * 11));

    if (t >= this.trueUltDuration) {
      this.y = this.groundY;
      this.vy = 0;
      this.isInvulnerable = false;
      this.unstoppablePoise = false;
      this.trueUltFrameOverride = null;
      this._trueUltBeamTimer = 0;
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
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha * 0.42));
      ctx.drawImage(vfxSheet, sx, sy, 208, 208, -v.w * 0.5, -v.h * 0.5, v.w, v.h);
      ctx.restore();
    }
    ctx.restore();
  }

  drawForegroundOverlay(ctx, renderer = null) {
    const sprites = PixelForge.initAssets()?.archer;

    // 0. Background 30fps `archer_vfx.png` animations (Row 2 Bramble Snares & Row 5 Yggdrasil World-Tree Seals)
    this.drawBehind(ctx, renderer);

    // 1. Crisp Emerald-Starlight Zephyr Afterimages (`JUMP` Vault & `DASH` Gale Stride)
    if (this.afterimages.length > 0 && sprites?.sheet?.complete) {
      for (const img of this.afterimages) {
        const alpha = Math.max(0, (1 - img.age / img.maxLife) * 0.48);
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
    // Live 120Hz `ArcaneShaderFX` "front" layer (renders crisp foreground wind-arcs, Mach cones & front cyclone walls)
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

    // 1. Foreground 30fps `archer_vfx.png` animations (Row 0 Muzzle/Slash, Row 1 Seekers, Row 3 Dragon-Piercer)
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
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha * 0.45));
      ctx.drawImage(vfxSheet, sx, sy, 208, 208, -v.w * 0.5, -v.h * 0.5, v.w, v.h);
      ctx.restore();
    }

    // 2. Supreme Ultimate Phase 1 (`0.20s .. 2.80s`): Colossal Drawn Golden-Emerald Celestial Greatbow Muzzle (`Row 6`, 280x280)
    if (this.state === 'TRUE_ULTIMATE' && this.stateTimer >= 0.20 && this.stateTimer <= 2.80) {
      const chargeU = Math.min(1, Math.max(0, (this.stateTimer - 0.20) / 2.60));
      const col = Math.min(29, Math.floor(chargeU * 30));
      const sx = col * 208;
      const sy = 6 * 208;
      const bowX = Math.round(this.x + this.facing * 38);
      const bowY = Math.round(this.y - 96);

      ctx.save();
      ctx.translate(bowX, bowY);
      ctx.scale(this.facing, 1);
      ctx.globalAlpha = 0.96;
      ctx.drawImage(vfxSheet, sx, sy, 208, 208, -140, -140, 280, 280);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.48;
      ctx.drawImage(vfxSheet, sx, sy, 208, 208, -140, -140, 280, 280);
      ctx.restore();
    }

    // 3. Supreme Ultimate Phase 2 (`this._trueUltBeamTimer > 0`): Seamless Full-Screen Horizontal Row 7 Supernova Dragon-Arrow Beam!
    if (this._trueUltBeamTimer > 0) {
      const beamProg = Math.min(1, Math.max(0, 1 - this._trueUltBeamTimer / 0.95));
      const col = Math.min(29, Math.floor(beamProg * 30));
      const sx = col * 208;
      const sy = 7 * 208;
      const env = this._trueUltBeamTimer < 0.22 ? this._trueUltBeamTimer / 0.22 : 1.0;
      const muzzleX = Math.round(this.x + this.facing * 38);
      const beamY = Math.round(this.y - 96);
      // Slice the exact 3-wave 112px core (`sx + 44 .. sx + 156`) and tile edge-to-edge (`i * 112`) + non-overlapping 52px tip (`sx + 156 .. sx + 208`)
      // so zero capsule end-caps or overlap seams ever appear!
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
      ctx.globalAlpha = Math.max(0, Math.min(1, env * 0.44));
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
