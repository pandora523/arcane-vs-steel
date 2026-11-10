import { Fighter } from './Fighter.js?v=30fps41';
import { PixelForge } from '../engine/PixelForge.js?v=30fps53';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps53';
import {
  SYLVAN_EFFECT_REGISTRY,
  SYLVAN_EMERALD_PALETTE,
  SYLVAN_STARLIGHT_PALETTE
} from '../engine/shaders/sylvanShaders.js?v=30fps53';

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
      maxHp: 1335,
      attackRange: 520,
      moveSpeed: 173,
      autoInterval: 1.01,
      lightColor: 'rgba(16, 185, 129, 1)',
      primaryColor: '#10b981'
    });
    this.heroId = 'archer';
    this.theme = 'emerald';
    this.deathSfx = 'death_archer';
    this.skillMaxCooldown = 4.25;
    this.ultName = 'ASTRAL HURRICANE';
    this.skillName = 'STARFALL VOLLEY';
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

    // Native 120Hz dual-buffer HD-2D Sylvan shader & particle runtime (`back` + `front` 2.5D layers)
    this.fx = new ArcaneShaderFX(SYLVAN_EFFECT_REGISTRY, { pixelScale: 3, viewW: 440, viewH: 220 });

    if (typeof Image !== 'undefined') {
      const archerAssets = PixelForge.initAssets()?.archer;
      if (archerAssets?.vfx?.src && !archerAssets.vfx.src.includes('v=30fps45')) {
        archerAssets.vfx.src = 'assets/sprites/archer_vfx.png?v=30fps45';
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
    if (newState !== 'ULTIMATE') {
      this.fx?.stopByKey('astralWingPlume');
    }
    this._drewBowVortex = false;
    this._skillLockSpawned = false;
    this._afterimageTimer = 0;
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

    this.fx.update(dt);

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
        const willBeTwin = (this.shotCombo + 1) % 3 === 0;
        this.fx.spawn('sylvanBowDrawVortex', this.x + this.facing * 54, this.y - 120, {
          follow: this,
          offsetX: 54,
          offsetY: -120,
          palette: willBeTwin ? SYLVAN_STARLIGHT_PALETTE : SYLVAN_EMERALD_PALETTE,
          maxDuration: 0.38,
          light: 1.05,
          extra: { radius: willBeTwin ? 24 : 20 }
        });
      }
    } else if (t < 0.74) {
      // Row 2 Frame F19: High-velocity Tempest Piercer arrow release + 3D Mach shock-cones
      if (!this.didActionFrame) {
        this.didActionFrame = true;
        this.shotCombo++;
        this.vx -= this.facing * 50;
        if (game?.audio) game.audio.play('arrow_shoot', this.x);

        const spawnX = this.x + this.facing * 54;
        const spawnY = this.y - 120;
        const targetY = enemy ? enemy.y - 116 : spawnY;
        const dx = enemy ? enemy.x - spawnX : this.facing * 520;
        const dy = targetY - spawnY;
        const dist = Math.hypot(dx, dy) || 1;
        const speed = 705;
        const shotAng = Math.atan2(dy, dx);
        const isTwinShot = this.shotCombo % 3 === 0;

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
            damage: isTwinShot ? 84 : 96,
            type: 'arrow'
          });

          if (isTwinShot) {
            game.vfx.spawnProjectile({
              x: spawnX - this.facing * 18,
              y: spawnY - 12,
              vx: (dx / dist) * (speed * 0.94),
              vy: (dy / dist) * (speed * 0.94) - 18,
              radius: 13,
              color: '#34d399',
              coreColor: '#fef08a',
              owner: this,
              damage: 64,
              type: 'arrow'
            });
          }
        }

        this.fx.spawn('sonicBowReleaseWave', spawnX, spawnY, {
          flip: false,
          palette: isTwinShot ? SYLVAN_STARLIGHT_PALETTE : SYLVAN_EMERALD_PALETTE,
          light: isTwinShot ? 1.25 : 1.12,
          extra: {
            aimAngle: shotAng,
            radius: isTwinShot ? 28 : 23,
            twin: isTwinShot
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
      }
    } else if (t >= 0.36 && !this.didActionFrame) {
      // Row 3 Frame F11 (`t = 0.38s`): Release 3 Direct Fan-Spread Wind Arrows horizontally!
      this.didActionFrame = true;
      this.vx -= this.facing * 65;
      this.heal(18, 'STARLIGHT GRACE');
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
            damage: 41,
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
            damage: 25,
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
        enemy.takeDamage(238, this, true, 220, -340);
      }
    } else if (t >= 1.6) {
      this.setState('IDLE');
    }
  }

  drawForegroundOverlay(ctx, renderer = null) {
    const sprites = PixelForge.initAssets().archer;

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
    const sprites = PixelForge.initAssets().archer;
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
  }
}
