import { Fighter } from './Fighter.js?v=30fps65';
import { PixelForge } from '../engine/PixelForge.js?v=30fps65';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps65';
import {
  FORGE_EFFECT_REGISTRY,
  FORGE_GOLD_PALETTE,
  FORGE_JADE_PALETTE
} from '../engine/shaders/forgeShaders.js?v=30fps65';

/**
 * Torgar (`titan`) — World-Forge Juggernaut & Runic Anvil Sovereign.
 * Powered natively by `ArcaneShaderFX` (dual-buffer 120Hz HD-2D shader & particle engine)
 * + `assets/sprites/titan_sheet.png` & `assets/sprites/titan_vfx.png`.
 */
export class Titan extends Fighter {
  constructor(x, groundY, facing = 1) {
    const opts = typeof x === 'object' && x !== null ? x : { x, groundY, facing };
    super({
      ...opts,
      name: opts.name || 'Torgar',
      maxHp: 4500,
      moveSpeed: 196,
      attackRange: 198,
      autoInterval: 0.90,
      lightColor: 'rgba(245, 158, 11, 1)',
      primaryColor: '#f59e0b'
    });
    this.heroId = 'titan';
    this.deathSfx = 'death_titan';
    this.skillName = 'ANVIL CANNONBALL';
    this.ultName = 'RAGNAROK FORGE';
    this.hasTrueUltimate = true;
    this.trueUltName = 'GOD-HAMMER MJOLNIR: CONTINENTAL SUNDER';
    this.trueUltDuration = 4.55;
    this._trueUltStep = 0;
    this._trueUltAnvilX = 600;
    this._trueUltGeyserTimer = 0;
    this.theme = 'forge';
    this.hasPoise = true;
    this.unstoppablePoise = false;
    this.skillTriggerRange = 460;
    this.skillMaxCooldown = 4.18;
    this.dashMaxCooldown = 2.65;
    this.autoDuration = 0.86;
    this.skillDuration = 0.94;
    this.ultDuration = 5.0;
    this.crouchDuration = 0.78;
    this.dashDuration = 0.42;
    this.comboStep = 0;
    this.stepDustTimer = 0;

    // Torgar Unique Juggernaut Mechanics:
    // 1. Magma Armor Fortify timer (damage reduction + molten thorn reflection in Fighter.js)
    this.forgeArmorTimer = 0;
    // 2. Physical Runic Anvil (summoned on floor, then smashed horizontally like a cannonball!)
    this.activeAnvil = null;
    // 3. Giant Titan Scale during Ragnarok Ultimate
    this.giantScale = 1.0;
    // 4. Active 30fps `titan_vfx.png` cell animations
    this.activeVfxAnims = [];

    // Native 120Hz dual-buffer HD-2D World-Forge shader & particle runtime (`back` + `front` 2.5D layers)
    this.fx = new ArcaneShaderFX(FORGE_EFFECT_REGISTRY, {
      pixelScale: 3,
      viewW: 440,
      viewH: 220
    });
    this._mantleSlot = null;
    this._ultCastTriggered = false;

    if (typeof Image !== 'undefined') {
      const titanAssets = PixelForge.initAssets()?.titan;
      if (titanAssets?.vfx?.src && !titanAssets.vfx.src.includes('v=30fps53')) {
        titanAssets.vfx.src = 'assets/sprites/titan_vfx.png?v=30fps65';
      }
    }
  }

  setState(newState) {
    super.setState(newState);
    if (newState !== 'ULTIMATE' && newState !== 'TRUE_ULTIMATE') {
      this.giantScale = 1.0;
      this.isInvulnerable = false;
      this._ultCastTriggered = false;
      this._ultWaveStep = 0;
      this.trueUltFrameOverride = null;
    }
    if (newState === 'TRUE_ULTIMATE') {
      this._trueUltStep = 0;
      this._trueUltGeyserTimer = 0;
      this.isInvulnerable = true;
    }
    this.unstoppablePoise =
      newState === 'AUTO_ATTACK' ||
      newState === 'SKILL' ||
      newState === 'CROUCH' ||
      newState === 'ULTIMATE' ||
      newState === 'TRUE_ULTIMATE';
  }

  getEffectiveAttackRange() {
    // Tectonic ground slams ripple 225px across the arena floor
    return this.comboStep === 2 ? 225 : 195;
  }

  spawnVfxAnim(row, x, y, w = 208, h = 208, maxLife = 0.44, opts = {}) {
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
      glowColor: opts.glowColor || 'gold',
      followOwner: Boolean(opts.followOwner),
      offsetX: opts.offsetX || 0,
      offsetY: opts.offsetY || 0,
      inFront: Boolean(opts.inFront)
    });
  }

  spawnSheetBurst(row, x, y, opts = {}) {
    this.spawnVfxAnim(
      row,
      x,
      y,
      opts.w || 208,
      opts.h || 208,
      opts.maxLife || 0.42,
      opts
    );
  }

  ensureForgeMagmaMantle() {
    if (!this.fx) return;
    if (this.isDead || this.state === 'DEATH') {
      this.fx.stopByKey('forgeMagmaMantle');
      this._mantleSlot = null;
      return;
    }
    const isFortified = this.forgeArmorTimer > 0;
    let slot = this.fx.active.find((s) => s.key === 'forgeMagmaMantle');
    if (!slot) {
      slot = this.fx.spawn('forgeMagmaMantle', this.x, this.y - 78, {
        follow: this,
        offsetX: 0,
        offsetY: -78,
        flip: false,
        palette: FORGE_GOLD_PALETTE,
        light: 1.16,
        extra: { fortified: isFortified }
      });
    } else if (slot.inst?.cfg) {
      slot.inst.cfg.fortified = isFortified;
    }
    this._mantleSlot = slot;
  }

  update(dt, enemy, game) {
    if (this.forgeArmorTimer > 0) {
      this.forgeArmorTimer = Math.max(0, this.forgeArmorTimer - dt);
    }

    // 1. Step Active 30fps `titan_vfx.png` Cell Animations
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

    // 2. Maintain 2.5D Orbiting Forge Magma Mantle & Step 120Hz `ArcaneShaderFX`
    this.ensureForgeMagmaMantle();
    if (this.fx) {
      this.fx.update(dt);
    }

    // 3. Update Physical Runic Forge Anvil (sits on floor, then flies horizontally when smashed!)
    if (this.activeAnvil && game) {
      const a = this.activeAnvil;
      a.age += dt;
      if (a.state === 'flying') {
        a.x += a.vx * dt;
        a.rot += a.dir * dt * 11.5;
        a.trailAccum = (a.trailAccum || 0) + dt;
        if (a.trailAccum >= 0.032) {
          a.trailAccum = 0;
          this.fx.burst(a.x - a.dir * 20, a.y - 38, {
            count: 3,
            speedMin: 35,
            speedMax: 110,
            lifeMin: 0.14,
            lifeMax: 0.28,
            gravity: 45,
            angle: a.dir >= 0 ? Math.PI : 0,
            spread: 0.85,
            colors: ['#ffffff', '#fde047', '#f59e0b', '#10b981']
          });
        }
        const targets = game.getEnemiesOf ? game.getEnemiesOf(this) : enemy ? [enemy] : [];
        for (const t of targets) {
          if (t && !t.isDead && !t.isBenched && !a.hitTargets.has(t)) {
            if (Math.abs(t.x - a.x) < 68 && Math.abs(t.y - a.y) < 110) {
              a.hitTargets.add(t);
              t.takeDamage(118, this, true, 340, -165);
              if (game.audio) game.audio.play('thunder_slam', t.x);
              game.renderer.triggerShake(11, 0.22);
              game.renderer.triggerHitStop(0.05);

              this.fx.spawn('tectonicCraterSlam', t.x, this.groundY - 6, {
                flip: a.dir < 0,
                palette: FORGE_GOLD_PALETTE,
                light: 1.28,
                extra: { maxRx: 124 }
              });
              this.spawnSheetBurst(4, t.x, t.y - 68, {
                w: 224,
                h: 224,
                maxLife: 0.40,
                flipX: a.dir < 0,
                glowColor: 'gold',
                inFront: true
              });

              // Check if enemy is slammed into or near the arena wall for WALL CRUSH bonus!
              const ww = game.renderer ? game.renderer.worldWidth : 1200;
              if (t.x <= 185 || t.x >= ww - 185) {
                t.takeDamage(58, this, true, -140, -220);
                game.vfx.spawnDamageText(
                  t.x,
                  t.y - 165,
                  0,
                  true,
                  '★ ANVIL WALL-CRUSH! ★',
                  '#fef08a'
                );
                this.fx.spawn('moltenAnvilSparks', t.x, t.y - 54, {
                  flip: a.dir < 0,
                  palette: FORGE_JADE_PALETTE,
                  light: 1.38
                });
                this.spawnSheetBurst(3, t.x, this.groundY - 64, {
                  w: 220,
                  h: 220,
                  maxLife: 0.44,
                  flipX: a.dir < 0,
                  glowColor: 'emerald',
                  inFront: false
                });
              }
            }
          }
        }
        const ww = game.renderer ? game.renderer.worldWidth : 1200;
        if (a.x < 40 || a.x > ww - 40 || a.age > 1.65) {
          this.fx.spawn('moltenAnvilSparks', a.x, a.y - 38, {
            flip: a.dir < 0,
            palette: FORGE_GOLD_PALETTE,
            light: 1.22
          });
          this.spawnSheetBurst(4, a.x, a.y - 52, {
            w: 208,
            h: 208,
            maxLife: 0.34,
            flipX: a.dir < 0,
            glowColor: 'gold',
            inFront: true
          });
          this.activeAnvil = null;
        }
      } else if (a.state === 'planted') {
        if (enemy && !enemy.isDead && Math.abs(enemy.x - a.x) < 48 && Math.abs(enemy.y - a.y) < 75) {
          const push = enemy.x >= a.x ? 1 : -1;
          enemy.x += push * (48 - Math.abs(enemy.x - a.x));
        }
        if (a.age > 1.5) {
          this.activeAnvil = null;
        }
      }
    }

    if (!this.isDead && this.state === 'WALK') {
      this.stepDustTimer += dt;
      if (this.stepDustTimer >= 0.36) {
        this.stepDustTimer = 0;
        if (game.audio) game.audio.play('footstep_steel', this.x);
        this.fx.burst(this.x - this.facing * 14, this.groundY - 2, {
          count: 5,
          speedMin: 25,
          speedMax: 75,
          gravity: 65,
          colors: ['#fde047', '#f59e0b', '#10b981']
        });
      }
    }

    super.update(dt, enemy, game);
  }

  startDodge(enemy, game) {
    this.dodgeCooldown = this.dodgeMaxCooldown * (0.86 + Math.random() * 0.28);
    const dist = enemy && !enemy.isDead ? Math.abs(enemy.x - this.x) : 999;
    if (dist < 230 || Math.random() < 0.65) {
      this.startCrouch(enemy, game);
    } else {
      this.startJump(enemy, game);
    }
  }

  startCrouch(_enemy, game) {
    this.crouchDuration = 0.82;
    this.setState('CROUCH');
    this.isCrouching = true;
    this.isDeflecting = true;
    this.forgeArmorTimer = 2.3;
    this.heal(40, 'FORGE TEMPER');
    this.vx = 0;
    const frontX = this.x + this.facing * 118;

    this.fx.spawn('runicBulwarkDome', this.x, this.y - 78, {
      follow: this,
      offsetX: 0,
      offsetY: -78,
      flip: this.facing < 0,
      palette: FORGE_GOLD_PALETTE,
      light: 1.2
    });
    this.spawnSheetBurst(1, this.x + this.facing * 26, this.y - 78, {
      w: 212,
      h: 212,
      maxLife: 0.52,
      followOwner: true,
      offsetX: 26,
      offsetY: -78,
      flipX: this.facing < 0,
      glowColor: 'gold',
      inFront: true
    });

    if (game && game.audio) game.audio.play('clang', frontX);
    if (game && game.vfx) {
      game.vfx.spawnDamageText(
        this.x,
        this.y - 148,
        0,
        false,
        'MAGMA ARMOR FORTIFY!',
        '#fbbf24'
      );
    }
  }

  updateCrouch(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.crouchDuration || 0.82;
    this.vx *= Math.pow(0.001, dt);
    this.isDeflecting = t < 0.65;

    // Deflect incoming enemy projectiles with molten anvil clang in front of Torgar
    if (this.isDeflecting && game && game.vfx) {
      for (const proj of game.vfx.projectiles) {
        if (
          proj.owner !== this &&
          (!this.team || !proj.owner?.team || proj.owner.team !== this.team) &&
          Math.abs(proj.x - (this.x + this.facing * 60)) < 115
        ) {
          proj.owner = this;
          proj.vx = -proj.vx * 1.25;
          proj.vy = -Math.abs(proj.vy) * 0.4;
          proj.color = '#f59e0b';
          this.gainMana(12);
          if (game.audio) game.audio.play('clang', proj.x);
          game.vfx.spawnDamageText(this.x, this.y - 156, 0, false, 'ANVIL DEFLECT!', '#fef08a');
          this.spawnSheetBurst(1, proj.x, proj.y, {
            w: 196,
            h: 196,
            maxLife: 0.32,
            flipX: this.facing < 0,
            glowColor: 'gold',
            inFront: true
          });
        }
      }
    }

    // At t = 0.36s: Erupt a Molten Magma Hammer-Slam Nova IN FRONT of Torgar (never on his feet!)
    if (t >= 0.36 && !this.didActionFrame) {
      this.didActionFrame = true;
      const slamX = this.x + this.facing * 124;
      if (game.audio) game.audio.play('thunder_slam', slamX);
      game.renderer.triggerShake(8, 0.18);

      this.fx.spawn('tectonicCraterSlam', slamX, this.groundY - 6, {
        flip: this.facing < 0,
        palette: FORGE_GOLD_PALETTE,
        light: 1.24,
        extra: { maxRx: 112 }
      });
      this.spawnSheetBurst(4, slamX, this.groundY - 68, {
        w: 220,
        h: 220,
        maxLife: 0.38,
        flipX: this.facing < 0,
        glowColor: 'gold',
        inFront: true
      });

      if (enemy && !enemy.isDead && Math.abs(enemy.x - slamX) <= 185) {
        enemy.takeDamage(48, this, false, 235, -165);
        game.vfx.spawnDamageText(enemy.x, enemy.y - 150, 0, false, 'MOLTEN NOVA!', '#fbbf24');
      }
    }

    if (t >= dur) {
      this.isDeflecting = false;
      this.isCrouching = false;
      this.setState('IDLE');
    }
  }

  startJump(enemy, game) {
    this.dashDuration = 0.62;
    this.setState('JUMP');
    this.isInvulnerable = true;
    const ww = game.renderer.worldWidth;
    let dir = this.facing;
    if (enemy && !enemy.isDead) {
      dir = Math.sign(enemy.x - this.x) || this.facing;
    }
    this.dashDir = dir;
    this.isFlipVault = true;
    this.vaultStartX = this.x;
    const targetDist = enemy && !enemy.isDead ? Math.min(220, Math.max(85, Math.abs(enemy.x - this.x) - 115)) : 145;
    this.vaultTargetX = Math.max(85, Math.min(ww - 85, this.x + dir * targetDist));
    this.vx = 0;
    this.vy = 0;

    this.fx.spawn('moltenAnvilSparks', this.x, this.groundY - 12, {
      flip: this.facing < 0,
      palette: FORGE_GOLD_PALETTE,
      light: 1.15
    });

    if (game && game.audio) game.audio.play('dash_whoosh', this.x);
    if (game && game.vfx) {
      game.vfx.spawnDamageText(
        this.x,
        this.y - 144,
        0,
        false,
        'TECTONIC CRUSH LEAP!',
        '#fbbf24'
      );
    }
  }

  onStartDash(_enemy, game, _dir) {
    this.isFlipVault = false;
    this.unstoppablePoise = true;

    this.fx.spawn('runicBulwarkDome', this.x, this.y - 78, {
      follow: this,
      offsetX: 0,
      offsetY: -78,
      flip: this.facing < 0,
      palette: FORGE_GOLD_PALETTE,
      light: 1.16
    });

    if (game && game.audio) game.audio.play('dash_whoosh', this.x);
    if (game && game.vfx) {
      game.vfx.spawnDamageText(
        this.x,
        this.y - 144,
        0,
        false,
        'JUGGERNAUT BULL-RUSH!',
        '#f59e0b'
      );
    }
  }

  updateDashOrDodge(_dt, enemy, game) {
    const t = this.stateTimer;
    const dur = Math.max(0.01, this.dashDuration || 0.44);
    const u = Math.min(1, t / dur);

    if (this.isFlipVault) {
      const easeU = 1 - Math.pow(1 - u, 1.55);
      this.x = this.vaultStartX + (this.vaultTargetX - this.vaultStartX) * easeU;
      const jumpHeight = 58;
      this.y = this.groundY - Math.sin(u * Math.PI) * jumpHeight;
      this.vx = 0;
      this.vy = 0;

      if (u >= 0.82 && !this.didActionFrame) {
        this.didActionFrame = true;
        this.y = this.groundY;
        const slamX = this.x + this.facing * 128;
        if (game.audio) game.audio.play('thunder_slam', slamX);
        game.renderer.triggerShake(10, 0.22);

        this.fx.spawn('tectonicCraterSlam', slamX, this.groundY - 6, {
          flip: this.facing < 0,
          palette: FORGE_JADE_PALETTE,
          light: 1.28,
          extra: { maxRx: 124 }
        });
        this.spawnSheetBurst(4, slamX, this.groundY - 68, {
          w: 224,
          h: 224,
          maxLife: 0.38,
          flipX: this.facing < 0,
          glowColor: 'gold',
          inFront: true
        });

        if (enemy && !enemy.isDead && Math.abs(enemy.x - slamX) <= 215 && enemy.y >= this.groundY - 70) {
          enemy.takeDamage(68, this, true, 165, -210);
          game.vfx.spawnDamageText(enemy.x, enemy.y - 155, 0, true, 'SEISMIC SLAM!', '#fef08a');
        }
      }

      if (t >= dur) {
        this.y = this.groundY;
        this.isFlipVault = false;
        this.isInvulnerable = false;
        this.setState('IDLE');
      }
      return;
    }

    const rushSpeed = 520 * (1 - u * 0.45);
    this.vx = this.dashDir * rushSpeed;
    if (enemy && !enemy.isDead && !this.didActionFrame && Math.abs(enemy.x - this.x) < 115) {
      this.didActionFrame = true;
      enemy.takeDamage(52, this, false, 240, -145);
      if (game.audio) game.audio.play('heavy_cleave', this.x);
      game.renderer.triggerShake(7, 0.16);
      game.vfx.spawnDamageText(enemy.x, enemy.y - 150, 0, false, 'SHOULDER RAM!', '#fbbf24');
      this.fx.spawn('forgeHammerArc', this.x + this.facing * 52, this.y - 82, {
        flip: this.facing < 0,
        palette: FORGE_GOLD_PALETTE,
        light: 1.2,
        extra: { radius: 28, width: 10.5, isFinisher: false }
      });
      this.spawnSheetBurst(1, enemy.x, enemy.y - 78, {
        w: 196,
        h: 196,
        maxLife: 0.34,
        flipX: this.facing < 0,
        glowColor: 'gold',
        inFront: true
      });
    }

    if (t >= dur) {
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  /**
   * AutoAttack (2H Figure-8 Anvil-Breaker Combo):
   *   - Strike 1 (`t = 0.28`): spawns `forgeHammerArc` + `spawnSheetBurst(row 0)` at the impact point
   *   - Strike 2 (`t = 0.66`): spawns `forgeHammerArc` (flipped angle) + `moltenAnvilSparks` + `spawnSheetBurst(row 4)`
   */
  updateAutoAttack(_dt, enemy, game) {
    const t = this.stateTimer;
    const dir = this.facing;
    const impactX = this.x + dir * 124;
    const impactY = this.groundY - 6;

    if (t < 0.26) {
      this.armAngle = -2.35;
    }

    // Strike 1 (`t >= 0.28`): Sweeping 2H Horizontal Anvil-Ram Cleave
    if (t >= 0.28 && !this.didActionFrame) {
      this.didActionFrame = true;
      this.comboStep = (this.comboStep + 1) % 3;
      this.vx = dir * 115;
      this.armVel = 34;

      if (game.audio) game.audio.play('heavy_cleave', impactX);
      game.renderer.triggerShake(7, 0.16);

      this.fx.spawn('forgeHammerArc', this.x + dir * 64, this.y - 84, {
        flip: dir < 0,
        palette: FORGE_GOLD_PALETTE,
        light: 1.24,
        extra: {
          radius: 30,
          width: 11.0,
          flipAngle: false,
          isFinisher: false
        }
      });
      this.spawnSheetBurst(0, impactX, impactY - 56, {
        w: 196,
        h: 196,
        maxLife: 0.34,
        flipX: dir < 0,
        glowColor: 'gold',
        inFront: true
      });

      // Launch planted Runic Anvil if struck by Torgar's maul
      if (
        this.activeAnvil &&
        this.activeAnvil.state === 'planted' &&
        Math.abs(this.activeAnvil.x - impactX) <= 135
      ) {
        this.activeAnvil.state = 'flying';
        this.activeAnvil.dir = dir;
        this.activeAnvil.vx = dir * 940;
        this.activeAnvil.age = 0;
      }

      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= 228) {
        const isCrit = Math.random() < 0.25;
        const dmg = 60 * (isCrit ? 1.35 : 1);
        enemy.takeDamage(dmg, this, isCrit, -65, -115);
        game.vfx.spawnDamageText(enemy.x, enemy.y - 150, 0, false, 'ANVIL CLEAVE!', '#fbbf24');
        this.gainMana(3.6);
      }
    }

    // Strike 2 (`t >= 0.66`): Reverse Backhand Volcanic Horn Hook-Sweep
    if (t >= 0.66 && !this.didSecondaryAction) {
      this.didSecondaryAction = true;
      const isFinisher = this.comboStep === 0;
      this.vx = dir * (isFinisher ? 155 : 125);

      if (game.audio) game.audio.play('thunder_slam', impactX);
      game.renderer.triggerShake(isFinisher ? 10 : 8, 0.18);

      this.fx.spawn('forgeHammerArc', this.x + dir * 68, this.y - 88, {
        flip: dir < 0,
        palette: isFinisher ? FORGE_JADE_PALETTE : FORGE_GOLD_PALETTE,
        light: 1.32,
        extra: {
          radius: 33,
          width: 12.0,
          flipAngle: true,
          isFinisher: true
        }
      });
      this.fx.spawn('moltenAnvilSparks', impactX, impactY - 48, {
        flip: dir < 0,
        palette: isFinisher ? FORGE_JADE_PALETTE : FORGE_GOLD_PALETTE,
        light: 1.28
      });
      this.spawnSheetBurst(4, impactX, impactY - 62, {
        w: 212,
        h: 212,
        maxLife: 0.38,
        flipX: dir < 0,
        glowColor: isFinisher ? 'emerald' : 'gold',
        inFront: true
      });

      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= 245) {
        const isCrit = isFinisher || Math.random() < 0.3;
        const dmg = (isFinisher ? 82 : 60) * (isCrit ? 1.35 : 1);
        enemy.takeDamage(dmg, this, isCrit, isFinisher ? 165 : 95, isFinisher ? -215 : -145);
        if (isFinisher) {
          game.vfx.spawnDamageText(enemy.x, enemy.y - 162, 0, true, 'WORLD-BREAKER SLAM!', '#10b981');
        }
        this.gainMana(3.6);
      }
    }

    if (t >= (this.autoDuration || 0.86)) {
      this.setState('IDLE');
    }
  }

  /**
   * Skill (2H Battering-Ram Golf-Drive Anvil Cannonball Launch):
   *   - Activation (`t = 0.05`): spawns `runicBulwarkDome` + `spawnSheetBurst(row 1)` on Titan
   *   - Upward Golf-Drive Launch (`t = 0.45`): spawns `tectonicCraterSlam` + `spawnSheetBurst(row 3)` at `(impactX, impactY)`
   *     + a traveling diagonal anvil shockwave (`spawnSheetBurst(row 0)` at `impactX + dir * 48`)
   */
  updateSkill(_dt, enemy, game) {
    const t = this.stateTimer;
    const dir = this.facing;

    // Phase 1 (`t >= 0.05`): Activation — Runic Bulwark Dome on Titan + Summon Runic Anvil
    if (t >= 0.05 && !this.didActionFrame) {
      this.didActionFrame = true;
      this.vx = dir * 115;
      const anvilX = Math.max(95, Math.min(game.renderer.worldWidth - 95, this.x + dir * 118));
      this.activeAnvil = {
        x: anvilX,
        y: this.groundY,
        vx: 0,
        dir,
        rot: 0,
        age: 0,
        trailAccum: 0,
        state: 'planted',
        hitTargets: new Set()
      };

      this.fx.spawn('runicBulwarkDome', this.x, this.y - 78, {
        follow: this,
        offsetX: 0,
        offsetY: -78,
        flip: dir < 0,
        palette: FORGE_GOLD_PALETTE,
        light: 1.26
      });
      this.spawnSheetBurst(1, this.x + dir * 22, this.y - 78, {
        w: 204,
        h: 204,
        maxLife: 0.44,
        followOwner: true,
        offsetX: 22,
        offsetY: -78,
        flipX: dir < 0,
        glowColor: 'gold',
        inFront: true
      });

      if (game.audio) game.audio.play('skill_cast', anvilX);
      game.renderer.triggerShake(6, 0.14);
      game.vfx.spawnSpecialCastAura(this, this.skillName, '✦ WORLD-FORGE ANVIL ✦', 'forge', false);
      game.vfx.spawnDamageText(anvilX, this.groundY - 115, 0, false, 'FORGE ANVIL!', '#10b981');

      if (enemy && !enemy.isDead && Math.abs(enemy.x - anvilX) < 130) {
        enemy.takeDamage(70, this, false, 45, -135);
      }
    }

    // Phase 2 (`t >= 0.45`): Upward 2H Battering-Ram Golf-Drive Launch
    if (t >= 0.45 && !this.didSecondaryAction) {
      this.didSecondaryAction = true;
      this.vx = dir * 155;
      const impactX = this.activeAnvil ? this.activeAnvil.x : this.x + dir * 128;
      const impactY = this.groundY - 6;
      if (game.audio) game.audio.play('thunder_slam', impactX);
      game.renderer.triggerShake(11, 0.22);

      this.fx.spawn('tectonicCraterSlam', impactX, impactY, {
        flip: dir < 0,
        palette: FORGE_JADE_PALETTE,
        light: 1.32,
        extra: { maxRx: 124 }
      });
      this.spawnSheetBurst(3, impactX, impactY - 58, {
        w: 216,
        h: 216,
        maxLife: 0.44,
        flipX: dir < 0,
        glowColor: 'emerald',
        inFront: false
      });
      // Traveling diagonal anvil shockwave at `impactX + dir * 48`
      this.spawnSheetBurst(0, impactX + dir * 48, impactY - 52, {
        w: 204,
        h: 204,
        maxLife: 0.42,
        vx: dir * 360,
        vy: -42,
        flipX: dir < 0,
        glowColor: 'gold',
        inFront: true
      });

      game.vfx.spawnDamageText(
        impactX,
        this.y - 156,
        0,
        true,
        '★ CANNONBALL SMASH! ★',
        '#fbbf24'
      );

      if (this.activeAnvil) {
        this.activeAnvil.state = 'flying';
        this.activeAnvil.dir = dir;
        this.activeAnvil.vx = dir * 940;
        this.activeAnvil.age = 0;
      }
      if (enemy && !enemy.isDead && Math.abs(enemy.x - impactX) < 180) {
        enemy.takeDamage(98, this, true, 220, -145);
      }
    }

    if (t >= (this.skillDuration || 0.94)) {
      this.setState('IDLE');
    }
  }

  /**
   * Ultimate (World-Forge Ragnarok):
   *   - Initial Anvil Ignition (`t = 0.08`): spawns `runicBulwarkDome` on Titan
   *   - Cataclysmic Impact (`t = 0.50`): spawns `ragnarokWorldForgeWave` centered at `(impactX, impactY)`
   *     + staggered diagonal caldera eruptions (`spawnSheetBurst(row 2)` and `spawnSheetBurst(row 4)`
   *     offset left/right along the fault line, NOT stacked on the exact same pixel!)
   */
  updateUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.ultDuration || 5.0;
    const dir = this.facing;
    // Grow smoothly to 3.0x colossal World-Forge Juggernaut size across the full 5.0-second Overdrive!
    const grow = Math.min(1, t / 0.28);
    const shrink = t > dur - 0.32 ? Math.max(0, (dur - t) / 0.32) : 1;
    const smoothGrow = grow * grow * (3 - 2 * grow);
    this.giantScale = 1.0 + 2.0 * smoothGrow * shrink;
    this.forgeArmorTimer = Math.max(this.forgeArmorTimer, 0.85);

    // Cycle Row 4 (120..149) smoothly across 3 full World-Breaker slam cycles over the 5.0s Overdrive!
    const cycleStep = Math.min(29, Math.floor(((t * 18) % 30)));
    this.trueUltFrameOverride = 120 + cycleStep;

    if (enemy && !enemy.isDead) {
      this.facing = enemy.x >= this.x ? 1 : -1;
      const dist = Math.abs(enemy.x - this.x);
      if (dist > 175) {
        this.x += this.facing * 240 * dt;
      }
    }
    this.walkPhase += dt * 7.5;
    this.headBob = Math.abs(Math.sin(this.walkPhase)) * 5.5;

    // 1. Initial Anvil Ignition (`t >= 0.06`): spawns colossal `runicBulwarkDome` & ground crater under 3x Titan
    if (t >= 0.06 && !this._ultCastTriggered) {
      this._ultCastTriggered = true;
      this._ultWaveStep = 0;
      if (game?.vfx) {
        game.vfx.spawnSpecialCastAura(this, this.ultName, '★ COLOSSAL WORLD-FORGE RAGNAROK (5S) ★', 'forge', true);
      }
      if (game?.renderer) {
        game.renderer.triggerShake(16, 0.28);
        game.renderer.triggerAberration(6);
      }
      this.fx.spawn('runicBulwarkDome', this.x, this.y - 140, {
        follow: this,
        offsetX: 0,
        offsetY: -140,
        flip: dir < 0,
        palette: FORGE_GOLD_PALETTE,
        light: 1.48,
        maxDuration: 4.8
      });
      this.fx.spawn('tectonicCraterSlam', this.x, this.groundY - 4, {
        flip: dir < 0,
        palette: FORGE_GOLD_PALETTE,
        light: 1.42,
        extra: { maxRx: 175 }
      });
    }

    const triggerCataclysmicFaultEruption = (waveIdx) => {
      const localWave = ((waveIdx - 1) % 3) + 1;
      const stride = 165 + (localWave - 1) * 95;
      const ww = game?.renderer ? game.renderer.worldWidth : 1200;
      const impactX = Math.max(95, Math.min(ww - 95, this.x + this.facing * stride));
      const impactY = this.groundY - 4;
      if (game?.audio) {
        game.audio.play('thunder_slam', impactX);
      }
      game?.renderer?.triggerShake(22 + localWave * 4, 0.36);
      game?.renderer?.triggerAberration(8 + localWave * 2);

      // Central Ragnarok World-Forge Wave at `(impactX, impactY)` + flanking fault waves
      this.fx.spawn('ragnarokWorldForgeWave', impactX, impactY, {
        flip: this.facing < 0,
        palette: waveIdx % 2 === 0 ? FORGE_JADE_PALETTE : FORGE_GOLD_PALETTE,
        light: 1.5,
        extra: { stage: localWave }
      });
      this.fx.spawn('tectonicCraterSlam', impactX, impactY, {
        flip: this.facing < 0,
        palette: FORGE_GOLD_PALETTE,
        light: 1.44,
        extra: { maxRx: 185 }
      });

      // Staggered colossal caldera eruptions offset left/right along the fault line, grounded on `impactY`
      const leftOffset = waveIdx % 2 === 1 ? -88 : 92;
      const rightOffset = waveIdx % 2 === 1 ? 92 : -88;
      this.spawnSheetBurst(2, impactX + this.facing * leftOffset, impactY - 98, {
        w: 320,
        h: 320,
        maxLife: 0.58,
        flipX: this.facing < 0,
        glowColor: 'emerald',
        inFront: false
      });
      this.spawnSheetBurst(4, impactX + this.facing * rightOffset, impactY - 92, {
        w: 336,
        h: 336,
        maxLife: 0.54,
        flipX: this.facing < 0,
        glowColor: 'gold',
        inFront: true
      });

      const targets = game?.getEnemiesOf ? game.getEnemiesOf(this) : enemy ? [enemy] : [];
      for (const target of targets) {
        if (target && !target.isDead && !target.isBenched) {
          target.takeDamage(
            waveIdx >= 5 ? 98 : 74,
            this,
            true,
            waveIdx >= 5 ? 295 : -75,
            waveIdx >= 5 ? -275 : -175
          );
        }
      }
    };

    // 6 Colossal World-Breaker Fault-Line Eruptions across the 5.0-second Overdrive!
    const waveTimes = [0.52, 1.25, 1.98, 2.72, 3.48, 4.24];
    for (let i = 0; i < waveTimes.length; i++) {
      if (t >= waveTimes[i] && (this._ultWaveStep || 0) < i + 1) {
        this._ultWaveStep = i + 1;
        triggerCataclysmicFaultEruption(i + 1);
      }
    }

    if (t >= dur) {
      this._ultWaveStep = 0;
      this.trueUltFrameOverride = null;
      this.giantScale = 1.0;
      this.setState('IDLE');
    }
  }

  /**
   * 3-Overdrive Supreme Ultimate (`state === 'TRUE_ULTIMATE'`, `4.55s`):
   * "GOD-HAMMER MJOLNIR: CONTINENTAL SUNDER"
   * - Never changes the stage background image (`overrideArena` / `setStageTransformation` is NEVER called).
   * - Phase 1 (`0.00s .. 1.20s`): Summons the Colossal World-Forge Crucible Anvil Altar (`Row 5`, `320x320`),
   *   grows Torgar into a `2.45x` World-Forge Avatar beside `this._trueUltAnvilX - this.facing * 95`,
   *   grants `this.forgeArmorTimer = 6.0`, and draws the enemy toward the Crucible Anvil.
   * - Phase 2 (`t >= 1.45s` Strike 1 & `t >= 2.25s` Strike 2): Rhythmic God-Hammer Tempering Strikes
   *   with `Row 6` (`340x340`) slamming onto the Crucible Anvil (zero chip damage ticks).
   * - Phase 3 (`t >= 3.20s`): Torgar leaps (`2.20s .. 3.18s`) and brings the God-Hammer down at `t = 3.20s`
   *   (`Row 4` frame `21..25`), shattering the Crucible Anvil, triggering anime impact frame (`'forge'`),
   *   healing Torgar for `18%` Max HP (`'WORLD-FORGE TEMPER'`), refreshing `this.forgeArmorTimer = 4.5`,
   *   dealing a SINGLE CATACLYSMIC INSTANT BURST of `385` Crit damage (`isCrit = true, knockX = 340, knockY = -290`),
   *   and erupting 7 full-stage `Row 7` Continental Sunder Volcanic Rune Geysers (`240x340`) across the `1200px` arena!
   * - Phase 4 (`3.20s .. 4.55s`): Smoothly eases `this.giantScale` back to `1.0` and returns to `IDLE`.
   */
  updateTrueUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.trueUltDuration || 4.55;
    this.isInvulnerable = true;
    this.vx = 0;
    this.vy = 0;
    this.hasPoise = true;
    this.unstoppablePoise = true;

    if (this._trueUltStep >= 4 && this._trueUltGeyserTimer > 0) {
      this._trueUltGeyserTimer = Math.max(0, this._trueUltGeyserTimer - dt);
    }

    // Phase 1 (`0.00s .. 1.20s` — Summoning the World-Forge Crucible Anvil Altar)
    if (this._trueUltStep < 1) {
      this._trueUltAnvilX = enemy
        ? Math.max(240, Math.min(960, enemy.x))
        : Math.max(240, Math.min(960, this.x + this.facing * 190));
    }

    if (t >= 0.04 && this._trueUltStep < 1) {
      this._trueUltStep = 1;
      this.forgeArmorTimer = 6.0;
      game?.audio?.play?.('ult_cast', this.x);
      game?.audio?.play?.('parry_clang', this._trueUltAnvilX);
      game?.vfx?.triggerCinematicCutIn?.(this, this.trueUltName, '#f97316');
      game?.vfx?.spawnSpecialCastAura?.(
        this,
        this.trueUltName,
        '★ GOD-HAMMER MJOLNIR! ★',
        'forge',
        true
      );
      game?.vfx?.spawnDamageText?.(
        this.x,
        this.y - 180,
        0,
        true,
        '★ GOD-HAMMER MJOLNIR! ★',
        '#f97316'
      );

      this.fx?.spawn('runicBulwarkDome', this.x, this.y - 125, {
        follow: this,
        offsetX: 0,
        offsetY: -125,
        flip: this.facing < 0,
        palette: FORGE_GOLD_PALETTE,
        light: 1.45,
        maxDuration: 4.4
      });
      this.fx?.spawn('tectonicCraterSlam', this._trueUltAnvilX, this.groundY - 4, {
        flip: this.facing < 0,
        palette: FORGE_GOLD_PALETTE,
        light: 1.42,
        extra: { maxRx: 165 }
      });
      this.spawnSheetBurst(5, this._trueUltAnvilX, this.groundY - 110, {
        w: 320,
        h: 320,
        maxLife: 3.16,
        flipX: this.facing < 0,
        glowColor: 'gold',
        inFront: false
      });
    }

    if (t < 3.20 && enemy && !enemy.isDead) {
      enemy.x += (this._trueUltAnvilX - enemy.x) * Math.min(1, dt * 6);
      this.facing = this._trueUltAnvilX >= this.x ? 1 : -1;
    }

    if (t < 1.20) {
      const u = Math.max(0, Math.min(1, t / 0.65));
      const ease = u * u * (3 - 2 * u);
      this.giantScale = 1.0 + 1.45 * ease;
      const standX = Math.max(95, Math.min(1105, this._trueUltAnvilX - this.facing * 95));
      this.x += (standX - this.x) * Math.min(1, dt * 10);
      this.y = this.groundY;
      this.trueUltFrameOverride = 120 + Math.min(7, Math.floor((t / 1.20) * 8));
      return;
    }

    // Phase 2 (`t >= 1.45s` Strike 1 & `t >= 2.25s` Strike 2 — Rhythmic God-Hammer Tempering Strikes)
    if (t < 3.20) {
      this.giantScale = 2.45;
      const standX = Math.max(95, Math.min(1105, this._trueUltAnvilX - this.facing * 95));
      this.x += (standX - this.x) * Math.min(1, dt * 10);

      if (t >= 1.45 && this._trueUltStep < 2) {
        this._trueUltStep = 2;
        game?.audio?.play?.('parry_clang', this._trueUltAnvilX);
        game?.audio?.play?.('thunder_slam', this._trueUltAnvilX);
        game?.renderer?.shake?.(14, 0.25);
        game?.renderer?.triggerShake?.(14, 0.25);
        game?.vfx?.spawnDamageText?.(
          this._trueUltAnvilX,
          this.groundY - 190,
          0,
          true,
          'TEMPERING STRIKE I!',
          '#fbbf24'
        );
        this.fx?.spawn('tectonicCraterSlam', this._trueUltAnvilX, this.groundY - 4, {
          flip: this.facing < 0,
          palette: FORGE_GOLD_PALETTE,
          light: 1.4,
          extra: { maxRx: 155 }
        });
        this.fx?.spawn('moltenAnvilSparks', this._trueUltAnvilX, this.groundY - 82, {
          flip: this.facing < 0,
          palette: FORGE_GOLD_PALETTE,
          light: 1.38
        });
        this.spawnSheetBurst(6, this._trueUltAnvilX, this.groundY - 120, {
          w: 340,
          h: 340,
          maxLife: 0.56,
          flipX: this.facing < 0,
          glowColor: 'gold',
          inFront: true
        });
      }

      if (t >= 2.25 && this._trueUltStep < 3) {
        this._trueUltStep = 3;
        game?.audio?.play?.('parry_clang', this._trueUltAnvilX);
        game?.audio?.play?.('thunder_slam', this._trueUltAnvilX);
        game?.renderer?.shake?.(14, 0.25);
        game?.renderer?.triggerShake?.(14, 0.25);
        game?.vfx?.spawnDamageText?.(
          this._trueUltAnvilX,
          this.groundY - 195,
          0,
          true,
          'TEMPERING STRIKE II!',
          '#f97316'
        );
        this.fx?.spawn('tectonicCraterSlam', this._trueUltAnvilX, this.groundY - 4, {
          flip: this.facing < 0,
          palette: FORGE_JADE_PALETTE,
          light: 1.44,
          extra: { maxRx: 168 }
        });
        this.fx?.spawn('moltenAnvilSparks', this._trueUltAnvilX, this.groundY - 86, {
          flip: this.facing < 0,
          palette: FORGE_JADE_PALETTE,
          light: 1.42
        });
        this.spawnSheetBurst(6, this._trueUltAnvilX, this.groundY - 120, {
          w: 340,
          h: 340,
          maxLife: 0.62,
          flipX: this.facing < 0,
          glowColor: 'emerald',
          inFront: true
        });
      }

      // Leap (`2.20s .. 3.18s`) before bringing the God-Hammer down at `t = 3.20s`
      if (t >= 2.20 && t < 3.18) {
        const leapU = Math.max(0, Math.min(1, (t - 2.20) / 0.98));
        this.y = this.groundY - Math.sin(leapU * Math.PI) * 138;
        this.trueUltFrameOverride = 136 + Math.min(4, Math.floor(leapU * 5));
      } else {
        this.y = this.groundY;
        const strikeU = Math.max(0, Math.min(1, (t - 1.20) / 1.0));
        this.trueUltFrameOverride = 128 + Math.min(7, Math.floor(strikeU * 8));
      }
      return;
    }

    // Phase 3 (`t >= 3.20s`, `_trueUltStep < 4` — 3rd Apocalyptic Blow: Continental Sunder)
    if (this._trueUltStep < 4) {
      this._trueUltStep = 4;
      this._trueUltGeyserTimer = 1.05;
      this.y = this.groundY;
      this.trueUltFrameOverride = 120 + 21;

      game?.renderer?.triggerImpactFrame?.(0.12, this._trueUltAnvilX, this.groundY - 96, 'forge');
      if (game?.renderer && game.renderer.impactFrameTimer > 1) {
        game.renderer.triggerImpactFrame?.(this._trueUltAnvilX, this.groundY - 96, 0.12, 'forge');
      }
      game?.renderer?.shake?.(30, 0.80);
      game?.renderer?.triggerShake?.(30, 0.80);
      game?.renderer?.flash?.(0.32, '#fff7ed');
      game?.renderer?.triggerAberration?.(16);
      game?.renderer?.triggerHitStop?.(0.09);

      game?.audio?.play?.('ult_cast', this._trueUltAnvilX);
      game?.audio?.play?.('earthshatter', this._trueUltAnvilX);
      game?.audio?.play?.('parry_clang', this._trueUltAnvilX);

      this.heal(Math.round(this.maxHp * 0.16), 'WORLD-FORGE TEMPER');
      this.forgeArmorTimer = 4.5;

      this.fx?.spawn('ragnarokWorldForgeWave', this._trueUltAnvilX, this.groundY - 4, {
        flip: this.facing < 0,
        palette: FORGE_GOLD_PALETTE,
        light: 1.55,
        extra: { stage: 3 }
      });
      this.fx?.spawn('tectonicCraterSlam', this._trueUltAnvilX, this.groundY - 4, {
        flip: this.facing < 0,
        palette: FORGE_JADE_PALETTE,
        light: 1.52,
        extra: { maxRx: 215 }
      });

      for (let i = 0; i < 7; i++) {
        const gx = 120 + i * 160;
        this.spawnSheetBurst(7, gx, this.groundY - 145, {
          w: 240,
          h: 340,
          maxLife: 1.05,
          flipX: i % 2 === 1,
          glowColor: i % 2 === 0 ? 'gold' : 'emerald',
          inFront: i % 2 === 0
        });
      }

      game?.vfx?.spawnDamageText?.(
        this._trueUltAnvilX,
        this.groundY - 210,
        0,
        true,
        '★ CONTINENTAL SUNDER! ★',
        '#f97316'
      );

      // Deal a SINGLE CATACLYSMIC INSTANT BURST of 735 Crit damage to all active enemies!
      const targets = game?.getEnemiesOf ? game.getEnemiesOf(this) : enemy ? [enemy] : [];
      for (const t of targets) {
        if (t && !t.isDead && !t.isBenched) {
          t.takeDamage(735, this, true, 340, -290);
        }
      }
    }

    // Phase 4 (`3.20s .. 4.55s` — Smoothly ease `giantScale` back to `1.0` and return to `IDLE`)
    this.y = this.groundY;
    const postU = Math.max(0, Math.min(1, (t - 3.20) / Math.max(0.01, dur - 3.20)));
    const easeBack = postU * postU * (3 - 2 * postU);
    this.giantScale = 2.45 - 1.45 * easeBack;

    if (t < 3.85) {
      const slamFrameU = Math.max(0, Math.min(1, (t - 3.20) / 0.65));
      this.trueUltFrameOverride = 120 + 21 + Math.min(4, Math.floor(slamFrameU * 5)); // Row 4 frame 21..25
    } else {
      const recU = Math.max(0, Math.min(1, (t - 3.85) / Math.max(0.01, dur - 3.85)));
      this.trueUltFrameOverride = 120 + 26 + Math.min(3, Math.floor(recU * 4)); // Row 4 frame 26..29
    }

    if (t >= dur) {
      this.y = this.groundY;
      this.giantScale = 1.0;
      this.isInvulnerable = false;
      this.trueUltFrameOverride = null;
      this._trueUltGeyserTimer = 0;
      this.setState('IDLE');
    }
  }

  drawBehind(ctx, renderer = null) {
    if (this.state !== 'TRUE_ULTIMATE') return;
    const t = this.stateTimer || 0;
    if (t >= 3.20) return;

    const sprites = typeof Image !== 'undefined' ? PixelForge.initAssets()?.titan : null;
    const vfxSheet = sprites?.vfx;
    const col = Math.floor(t * 30) % 30;
    const ax = this._trueUltAnvilX || 600;
    const ay = this.groundY - 110;

    // Render `titan_vfx.png` Row 5 (Colossal World-Forge Crucible Anvil Altar, 320x320) at `this._trueUltAnvilX, this.groundY - 110`
    if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        5,
        col,
        ax,
        ay,
        320,
        320,
        0.96,
        this.facing < 0,
        renderer,
        'gold'
      );
    } else if (vfxSheet && ctx?.drawImage) {
      ctx.save();
      ctx.drawImage(vfxSheet, col * 208, 5 * 208, 208, 208, ax - 160, ay - 160, 320, 320);
      ctx.restore();
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
    glowColor = 'gold'
  ) {
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;
    const cell = 208;
    const sx = Math.max(0, Math.min(29, Math.floor(col))) * cell;
    const sy = Math.max(0, Math.min(7, Math.floor(row))) * cell;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(x), Math.round(y));
    if (flipX) ctx.scale(-1, 1);

    const glowSprite =
      glowColor === 'emerald'
        ? renderer?.glowEmerald || renderer?.glowGold || renderer?.glowOrange
        : renderer?.glowGold || renderer?.glowOrange;
    if (glowSprite) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, alpha * 0.38);
      const gw = Math.round(w * 1.15);
      const gh = Math.round(h * 1.15);
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
   * Stamps active 30fps `titan_vfx.png` rows:
   * - Row 0: Spinning Flaming Horned Dwarven Forge-Anvil Projectile
   * - Row 1: Khazad Dwarven Octagonal Ram-Horn & Crossed-Warhammer Aegis Crest
   * - Row 2: Colossal Sky-Falling God-Hammer & 5-Spire Volcanic Basalt-Jade Eruption
   * - Row 3: 8-Cog Interlocking Dwarven World-Forge Crucible Gear Mandala & Glowing Horned Anvil
   * - Row 4: Tectonic Basalt Plate Split & 8-Spoke Magma-Jade Star-Crater Nova
   * - Row 5: Colossal World-Forge Crucible Anvil Altar (`320x320`)
   * - Row 6: God-Hammer Lightning-Magma Strike Arc (`340x340`)
   * - Row 7: Continental Sunder Volcanic Rune Geysers (`240x340`)
   */
  drawActiveAnvilAndQuakes(ctx, vfxSheet = null, renderer = null, inFront = false) {
    const sheet =
      vfxSheet || (typeof Image !== 'undefined' ? PixelForge.initAssets()?.titan?.vfx : null);
    if (!sheet || !sheet.complete) return;

    if (!inFront) {
      // 1. Background 30fps `titan_vfx.png` cell animations (Row 2 Colossal God-Hammer & 5-Spire Eruption + Row 3 8-Cog Crucible Mandala)
      for (const v of this.activeVfxAnims) {
        if (v.inFront) continue;
        const u = Math.min(1, Math.max(0, v.age / v.maxLife));
        const span = Math.max(1, v.endFrame - v.startFrame + 1);
        const col = Math.min(29, v.startFrame + Math.floor(u * span));
        const fade = u < 0.12 ? u / 0.12 : u > 0.78 ? (1 - u) / 0.22 : 1.0;
        this.drawBloomedVfxCell(
          ctx,
          sheet,
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

      // 2. Planted Runic World-Forge Anvil Seal (`Row 3` 8-Cog Crucible Mandala & Glowing Horned Anvil)
      if (this.activeAnvil && this.activeAnvil.state === 'planted') {
        const a = this.activeAnvil;
        const col = Math.floor(a.age * 30) % 30;
        const fade = a.age > 1.25 ? Math.max(0, (1.5 - a.age) / 0.25) : 1.0;
        this.drawBloomedVfxCell(
          ctx,
          sheet,
          3,
          col,
          a.x,
          a.y - 54,
          204,
          204,
          fade * 0.96,
          a.dir < 0,
          renderer,
          'emerald'
        );
      }
      return;
    }

    // 3. Active Magma Armor Fortify Runic Shield Crest (`Row 1` Khazad Octagonal Ram-Horn & Crossed-Warhammer Aegis Crest)
    if (this.forgeArmorTimer > 0 && !this.isDead) {
      const col = Math.floor((this.walkPhase || 0) * 12) % 30;
      const alpha = Math.min(1, this.forgeArmorTimer * 1.5) * 0.82;
      this.drawBloomedVfxCell(
        ctx,
        sheet,
        1,
        col,
        this.x + this.facing * 20,
        this.y - 78,
        192,
        192,
        alpha,
        this.facing < 0,
        renderer,
        'gold'
      );
    }

    // 4. Flying Anvil Cannonball (`Row 0` Spinning Flaming Horned Anvil Projectile + `Row 3` 8-Cog Crucible Mandala trail)
    if (this.activeAnvil && this.activeAnvil.state === 'flying') {
      const a = this.activeAnvil;
      const col = Math.floor(a.age * 30) % 30;
      this.drawBloomedVfxCell(
        ctx,
        sheet,
        3,
        col,
        a.x - a.dir * 22,
        a.y - 48,
        192,
        192,
        0.9,
        a.dir < 0,
        renderer,
        'emerald'
      );
      this.drawBloomedVfxCell(
        ctx,
        sheet,
        0,
        col,
        a.x,
        a.y - 48,
        208,
        208,
        0.96,
        a.dir < 0,
        renderer,
        'gold'
      );
    }

    // 5. Foreground 30fps `titan_vfx.png` cell bursts (`Row 1` Aegis Crest & `Row 4` Tectonic Basalt Plate Split Nova)
    for (const v of this.activeVfxAnims) {
      if (!v.inFront) continue;
      const u = Math.min(1, Math.max(0, v.age / v.maxLife));
      const span = Math.max(1, v.endFrame - v.startFrame + 1);
      const col = Math.min(29, v.startFrame + Math.floor(u * span));
      const fade = u < 0.12 ? u / 0.12 : u > 0.78 ? (1 - u) / 0.22 : 1.0;
      this.drawBloomedVfxCell(
        ctx,
        sheet,
        v.row,
        col,
        v.x,
        v.y,
        v.w,
        v.h,
        fade * 0.96,
        v.flipX,
        renderer,
        v.glowColor
      );
    }
  }

  drawForegroundOverlay(ctx, renderer = null) {
    const sprites = typeof Image !== 'undefined' ? PixelForge.initAssets()?.titan : null;
    const vfxSheet = sprites?.vfx;

    this.drawBehind(ctx, renderer);

    if (vfxSheet?.complete) {
      this.drawActiveAnvilAndQuakes(ctx, vfxSheet, renderer, false);
    }

    // Live 120Hz `ArcaneShaderFX` "back" layer (2.5D Orbiting Magma Mantle, Crater Shockwaves, Sky Anvil Drops, Ragnarok Waves)
    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    this.fx.renderLayer(ctx, 'back', arenaCenterX, this.groundY, 0.96);
  }

  drawUltimateForeground(ctx, renderer = null) {
    // Live 120Hz `ArcaneShaderFX` "front" layer (World-Breaker Anvil Cleaves, Sky Anvil Drops, Front 2.5D Rings & Sparks)
    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    this.fx.renderLayer(ctx, 'front', arenaCenterX, this.groundY, 0.98);

    const sprites = typeof Image !== 'undefined' ? PixelForge.initAssets()?.titan : null;
    const vfxSheet = sprites?.vfx;
    if (!vfxSheet?.complete) return;

    this.drawActiveAnvilAndQuakes(ctx, vfxSheet, renderer, true);
  }

  draw(ctx, isReflection = false, renderer = null) {
    const sprites = typeof Image !== 'undefined' ? PixelForge.initAssets()?.titan : null;
    if (!sprites) return;
    const vfxSheet = sprites.vfx;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const scale = this.giantScale || 1.0;
    const w = 208;
    const h = 208;
    const frameIdx = PixelForge.getFrameIndex(this, this.walkPhase);
    const groundPlantOffset = 4;

    ctx.translate(
      Math.round(this.x),
      Math.round(this.y + groundPlantOffset)
    );
    ctx.scale(this.facing * scale, scale);

    PixelForge.drawSheetFrame(ctx, sprites, this, w, h, this.walkPhase, isReflection, renderer);

    if (this.hitFlash > 0 && !isReflection) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5;
      PixelForge.drawGhostFrame(ctx, sprites, frameIdx, w, h);
    }

    ctx.restore();

    if (!isReflection && this.state === 'TRUE_ULTIMATE') {
      const t = this.stateTimer || 0;
      const ax = this._trueUltAnvilX || 600;
      // Render Row 6 (God-Hammer Lightning-Magma Strike Arc, 340x340) slamming onto the Crucible Anvil during Phase 2
      if (t >= 1.45 && t < 3.20) {
        const col = Math.floor(t * 30) % 30;
        const ay = this.groundY - 120;
        if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
          this.drawBloomedVfxCell(
            ctx,
            vfxSheet,
            6,
            col,
            ax,
            ay,
            340,
            340,
            0.95,
            this.facing < 0,
            renderer,
            this._trueUltStep >= 3 ? 'emerald' : 'gold'
          );
        } else if (vfxSheet && ctx?.drawImage) {
          ctx.save();
          ctx.drawImage(vfxSheet, col * 208, 6 * 208, 208, 208, ax - 170, ay - 170, 340, 340);
          ctx.restore();
        }
      }
    }

    // Erupt 7 full-stage `titan_vfx.png` Row 7 (Continental Sunder Volcanic Rune Geysers, 240x340) spaced across the 1200px arena
    if (!isReflection && this._trueUltGeyserTimer > 0) {
      const u = Math.max(0, Math.min(1, 1 - this._trueUltGeyserTimer / 1.05));
      const baseCol = Math.min(29, Math.floor(u * 30));
      const fade = this._trueUltGeyserTimer < 0.22 ? this._trueUltGeyserTimer / 0.22 : 1.0;
      for (let i = 0; i < 7; i++) {
        const gx = 120 + i * 160;
        const gy = this.groundY - 145;
        const col = (baseCol + i * 2) % 30;
        if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
          this.drawBloomedVfxCell(
            ctx,
            vfxSheet,
            7,
            col,
            gx,
            gy,
            240,
            340,
            fade * 0.96,
            i % 2 === 1,
            renderer,
            i % 2 === 0 ? 'gold' : 'emerald'
          );
        } else if (vfxSheet && ctx?.drawImage) {
          ctx.save();
          ctx.drawImage(vfxSheet, col * 208, 7 * 208, 208, 208, gx - 120, gy - 170, 240, 340);
          ctx.restore();
        }
      }
    }
  }
}
