import { Fighter } from './Fighter.js?v=30fps41';
import { PixelForge } from '../engine/PixelForge.js?v=30fps54';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps53';
import {
  FORGE_EFFECT_REGISTRY,
  FORGE_GOLD_PALETTE,
  FORGE_JADE_PALETTE
} from '../engine/shaders/forgeShaders.js?v=30fps54';

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
      maxHp: 1520,
      moveSpeed: 164,
      attackRange: 185,
      autoInterval: 1.04,
      lightColor: 'rgba(245, 158, 11, 1)',
      primaryColor: '#f59e0b'
    });
    this.heroId = 'titan';
    this.deathSfx = 'death_knight';
    this.skillName = 'ANVIL CANNONBALL';
    this.ultName = 'WORLD-FORGE RAGNAROK';
    this.theme = 'forge';
    this.hasPoise = true;
    this.unstoppablePoise = false;
    this.skillTriggerRange = 460;
    this.skillMaxCooldown = 4.25;
    this.dashMaxCooldown = 2.65;
    this.autoDuration = 0.86;
    this.skillDuration = 0.94;
    this.ultDuration = 1.52;
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
        titanAssets.vfx.src = 'assets/sprites/titan_vfx.png?v=30fps53';
      }
    }
  }

  setState(newState) {
    super.setState(newState);
    if (newState !== 'ULTIMATE') {
      this.giantScale = 1.0;
      this._ultCastTriggered = false;
    }
    this.unstoppablePoise =
      newState === 'AUTO_ATTACK' ||
      newState === 'SKILL' ||
      newState === 'CROUCH' ||
      newState === 'ULTIMATE';
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
              t.takeDamage(64, this, true, 340, -165);
              if (game.audio) game.audio.play('thunder_slam', t.x);
              game.renderer.triggerShake(11, 0.22);
              game.renderer.triggerHitStop(0.05);
              game.vfx.spawnShockwave(t.x, t.y - 45, 145, '#f59e0b', 0.32);
              game.vfx.spawnBurst(t.x, t.y - 55, 22, '#fef08a', 280, { upBias: 95, size: 6 });

              this.fx.spawn('colossalSkyAnvilDrop', t.x, this.groundY - 6, {
                flip: a.dir < 0,
                palette: FORGE_GOLD_PALETTE,
                light: 1.32
              });
              this.fx.spawn('tectonicCraterShockwave', t.x, this.groundY - 6, {
                flip: a.dir < 0,
                palette: FORGE_GOLD_PALETTE,
                light: 1.28,
                extra: { maxRx: 124 }
              });
              this.spawnVfxAnim(2, t.x, this.groundY - 82, 224, 224, 0.44, {
                glowColor: 'gold',
                inFront: false
              });
              this.spawnVfxAnim(4, t.x, t.y - 68, 224, 224, 0.40, {
                flipX: a.dir < 0,
                glowColor: 'gold',
                inFront: true
              });

              // Check if enemy is slammed into or near the arena wall for WALL CRUSH bonus!
              const ww = game.renderer ? game.renderer.worldWidth : 1200;
              if (t.x <= 185 || t.x >= ww - 185) {
                t.takeDamage(26, this, true, -140, -220);
                game.vfx.spawnDamageText(
                  t.x,
                  t.y - 165,
                  0,
                  true,
                  '★ ANVIL WALL-CRUSH! ★',
                  '#fef08a'
                );
                game.vfx.spawnShockwave(t.x, t.y - 55, 185, '#10b981', 0.38);
                this.fx.spawn('colossalSkyAnvilDrop', t.x, this.groundY - 6, {
                  flip: a.dir < 0,
                  palette: FORGE_JADE_PALETTE,
                  light: 1.38
                });
                this.spawnVfxAnim(2, t.x, this.groundY - 84, 232, 232, 0.46, {
                  glowColor: 'emerald',
                  inFront: false
                });
                this.spawnVfxAnim(3, t.x, this.groundY - 64, 220, 220, 0.44, {
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
          game.vfx.spawnShockwave(a.x, a.y - 28, 120, '#f59e0b', 0.28);
          game.vfx.spawnBurst(a.x, a.y - 28, 16, '#f59e0b', 220, { upBias: 90, size: 5 });
          this.spawnVfxAnim(4, a.x, a.y - 52, 208, 208, 0.34, {
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
        game.vfx.spawnBurst(this.x - this.facing * 14, this.groundY - 2, 5, '#f59e0b', 65, {
          upBias: 30,
          size: 4.5,
          life: 0.34,
          additive: true
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
    this.heal(30, 'FORGE TEMPER');
    this.vx = 0;
    const frontX = this.x + this.facing * 118;

    this.fx.spawn('tectonicCraterShockwave', this.x, this.groundY - 4, {
      flip: this.facing < 0,
      palette: FORGE_GOLD_PALETTE,
      light: 1.18,
      extra: { maxRx: 96 }
    });
    this.spawnVfxAnim(1, this.x + this.facing * 26, this.y - 78, 212, 212, 0.52, {
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
      game.vfx.spawnShockwave(frontX, this.groundY - 6, 128, '#f59e0b', 0.34, true);
      game.vfx.spawnBurst(frontX, this.groundY - 32, 16, '#fbbf24', 180, {
        upBias: 85,
        size: 5
      });
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
          game.vfx.spawnShockwave(proj.x, proj.y, 88, '#fef08a', 0.24);
          game.vfx.spawnDamageText(this.x, this.y - 156, 0, false, 'ANVIL DEFLECT!', '#fef08a');
          this.spawnVfxAnim(1, proj.x, proj.y, 196, 196, 0.32, {
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

      this.fx.spawn('tectonicCraterShockwave', slamX, this.groundY - 6, {
        flip: this.facing < 0,
        palette: FORGE_GOLD_PALETTE,
        light: 1.24,
        extra: { maxRx: 112 }
      });
      this.spawnVfxAnim(2, slamX, this.groundY - 80, 216, 216, 0.44, {
        glowColor: 'gold',
        inFront: false
      });
      this.spawnVfxAnim(4, slamX, this.groundY - 68, 220, 220, 0.38, {
        flipX: this.facing < 0,
        glowColor: 'gold',
        inFront: true
      });

      game.vfx.spawnShockwave(slamX, this.groundY - 6, 195, '#f59e0b', 0.36, true);
      game.vfx.spawnBurst(slamX, this.groundY - 24, 24, '#f97316', 250, {
        upBias: 110,
        size: 6
      });
      if (enemy && !enemy.isDead && Math.abs(enemy.x - slamX) <= 185) {
        enemy.takeDamage(28, this, false, 235, -165);
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

    this.fx.spawn('tectonicCraterShockwave', this.x, this.groundY - 4, {
      flip: this.facing < 0,
      palette: FORGE_GOLD_PALETTE,
      light: 1.12,
      extra: { maxRx: 92 }
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
      game.vfx.spawnShockwave(this.x, this.groundY - 4, 110, '#f59e0b', 0.28, true);
    }
  }

  onStartDash(_enemy, game, _dir) {
    this.isFlipVault = false;
    this.unstoppablePoise = true;

    this.fx.spawn('tectonicCraterShockwave', this.x, this.groundY - 4, {
      flip: this.facing < 0,
      palette: FORGE_GOLD_PALETTE,
      light: 1.1,
      extra: { maxRx: 86 }
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
      game.vfx.spawnShockwave(this.x, this.groundY - 4, 98, '#f59e0b', 0.26, true);
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

        this.fx.spawn('worldBreakerAnvilCleave', this.x + this.facing * 64, this.y - 84, {
          flip: this.facing < 0,
          palette: FORGE_GOLD_PALETTE,
          light: 1.24,
          extra: { radius: 32, width: 12, isFinisher: true }
        });
        this.fx.spawn('colossalSkyAnvilDrop', slamX, this.groundY - 6, {
          flip: this.facing < 0,
          palette: FORGE_JADE_PALETTE,
          light: 1.32
        });
        this.fx.spawn('tectonicCraterShockwave', slamX, this.groundY - 6, {
          flip: this.facing < 0,
          palette: FORGE_JADE_PALETTE,
          light: 1.28,
          extra: { maxRx: 124 }
        });
        this.spawnVfxAnim(2, slamX, this.groundY - 82, 224, 224, 0.44, {
          glowColor: 'emerald',
          inFront: false
        });
        this.spawnVfxAnim(4, slamX, this.groundY - 68, 224, 224, 0.38, {
          flipX: this.facing < 0,
          glowColor: 'gold',
          inFront: true
        });

        game.vfx.spawnShockwave(slamX, this.groundY - 4, 210, '#f59e0b', 0.36, true);
        game.vfx.spawnDecal(slamX, 180, 'fissure', '#f59e0b', 4.5);
        game.vfx.spawnBurst(slamX, this.groundY - 18, 22, '#fbbf24', 250, {
          upBias: 135,
          size: 6
        });
        if (enemy && !enemy.isDead && Math.abs(enemy.x - slamX) <= 215 && enemy.y >= this.groundY - 70) {
          enemy.takeDamage(46, this, true, 165, -210);
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
      enemy.takeDamage(34, this, false, 240, -145);
      if (game.audio) game.audio.play('heavy_cleave', this.x);
      game.renderer.triggerShake(7, 0.16);
      game.vfx.spawnDamageText(enemy.x, enemy.y - 150, 0, false, 'SHOULDER RAM!', '#fbbf24');
      this.fx.spawn('worldBreakerAnvilCleave', this.x + this.facing * 52, this.y - 82, {
        flip: this.facing < 0,
        palette: FORGE_GOLD_PALETTE,
        light: 1.2,
        extra: { radius: 28, width: 10.5, isFinisher: false }
      });
      this.spawnVfxAnim(1, enemy.x, enemy.y - 78, 196, 196, 0.34, {
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

  updateAutoAttack(_dt, enemy, game) {
    const t = this.stateTimer;
    if (t < 0.26) {
      this.armAngle = -2.35;
    } else if (t >= 0.28 && !this.didActionFrame) {
      this.didActionFrame = true;
      const step = this.comboStep;
      const isFinisher = step === 2;
      this.comboStep = (this.comboStep + 1) % 3;
      this.vx = this.facing * (isFinisher ? 165 : 115);
      this.armVel = 36;

      // Hammerhead slams far IN FRONT of Torgar (132px ahead), never on his feet!
      const slamX = this.x + this.facing * 132;
      const slamY = this.groundY - 4;
      if (game.audio) game.audio.play('thunder_slam', slamX);
      game.renderer.triggerShake(isFinisher ? 10 : 7, 0.18);

      // 1. Every swing spawns `worldBreakerAnvilCleave` + `tectonicCraterShockwave`
      this.fx.spawn('worldBreakerAnvilCleave', this.x + this.facing * 64, this.y - 86, {
        flip: this.facing < 0,
        palette: isFinisher ? FORGE_JADE_PALETTE : FORGE_GOLD_PALETTE,
        light: isFinisher ? 1.34 : 1.2,
        extra: {
          radius: isFinisher ? 34 : 29,
          width: isFinisher ? 12.5 : 10.5,
          isFinisher
        }
      });
      this.fx.spawn('tectonicCraterShockwave', slamX, slamY, {
        flip: this.facing < 0,
        palette: isFinisher ? FORGE_JADE_PALETTE : FORGE_GOLD_PALETTE,
        light: isFinisher ? 1.3 : 1.18,
        extra: { maxRx: isFinisher ? 132 : 102 }
      });

      // 2. On the 3rd combo finisher (`isFinisher`), ALSO spawn `colossalSkyAnvilDrop` right on the enemy / impact point!
      if (isFinisher) {
        const dropX = enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= 260 ? enemy.x : slamX;
        this.fx.spawn('colossalSkyAnvilDrop', dropX, slamY, {
          flip: this.facing < 0,
          palette: FORGE_JADE_PALETTE,
          light: 1.38
        });
        this.spawnVfxAnim(3, dropX, slamY - 62, 224, 224, 0.46, {
          flipX: this.facing < 0,
          glowColor: 'emerald',
          inFront: false
        });
      }

      // If Torgar's swing hits his planted anvil, launch it into a magma cannonball & spawn `colossalSkyAnvilDrop`!
      if (
        this.activeAnvil &&
        this.activeAnvil.state === 'planted' &&
        Math.abs(this.activeAnvil.x - slamX) <= 135
      ) {
        this.activeAnvil.state = 'flying';
        this.activeAnvil.dir = this.facing;
        this.activeAnvil.vx = this.facing * 940;
        this.activeAnvil.age = 0;
        this.fx.spawn('colossalSkyAnvilDrop', this.activeAnvil.x, slamY, {
          flip: this.facing < 0,
          palette: FORGE_GOLD_PALETTE,
          light: 1.35
        });
      }

      this.spawnVfxAnim(
        2,
        slamX,
        slamY - 78,
        isFinisher ? 228 : 204,
        isFinisher ? 228 : 204,
        0.44,
        {
          glowColor: isFinisher ? 'emerald' : 'gold',
          inFront: false
        }
      );
      this.spawnVfxAnim(
        4,
        slamX,
        slamY - 66,
        isFinisher ? 232 : 204,
        isFinisher ? 232 : 204,
        0.38,
        {
          flipX: this.facing < 0,
          glowColor: isFinisher ? 'emerald' : 'gold',
          inFront: true
        }
      );

      const sA = this.facing === 1 ? -1.85 : Math.PI - 1.25;
      const eA = this.facing === 1 ? 1.25 : Math.PI + 1.85;
      game.vfx.spawnSlash(this.x + this.facing * 64, this.y - 86, 148, sA, eA, '#f59e0b', 0.30);
      game.vfx.spawnShockwave(slamX, slamY, isFinisher ? 205 : 155, '#f59e0b', 0.32, true);
      game.vfx.spawnDecal(slamX, 150, 'fissure', '#f59e0b', 4.0);
      game.vfx.spawnBurst(slamX, slamY - 14, isFinisher ? 24 : 16, '#fbbf24', 250, {
        upBias: 125,
        size: 6
      });

      const reach = isFinisher ? 245 : 215;
      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= reach) {
        const isCrit = isFinisher || Math.random() < 0.28;
        const dmg = (isFinisher ? 51 : 38) * (isCrit ? 1.35 : 1);
        const knockX = isFinisher ? 165 : -78;
        const knockY = isFinisher ? -225 : -135;
        enemy.takeDamage(dmg, this, isCrit, knockX, knockY);
        if (!isFinisher) {
          game.vfx.spawnDamageText(enemy.x, enemy.y - 150, 0, false, 'TECTONIC PULL!', '#fbbf24');
        } else {
          game.vfx.spawnDamageText(enemy.x, enemy.y - 162, 0, true, 'WORLD-BREAKER SLAM!', '#10b981');
        }
        this.gainMana(14);
      }
    }

    if (t >= 0.64) {
      this.setState('IDLE');
    }
  }

  updateSkill(_dt, enemy, game) {
    const t = this.stateTimer;
    // Phase 1 (`t >= 0.14`, during the 360° Whirlwind Maul Spin `F02..F15`):
    // Spawn `worldBreakerAnvilCleave` (whirlwind arc around Torgar) + `tectonicCraterShockwave`
    // + launch/summon `activeAnvil` (Row 0 Spinning Flaming Horned Anvil + Row 3 Crucible Gear Mandala)
    if (t >= 0.14 && !this.didActionFrame) {
      this.didActionFrame = true;
      this.vx = this.facing * 125;
      const anvilX = Math.max(95, Math.min(game.renderer.worldWidth - 95, this.x + this.facing * 118));
      this.activeAnvil = {
        x: anvilX,
        y: this.groundY,
        vx: 0,
        dir: this.facing,
        rot: 0,
        age: 0,
        trailAccum: 0,
        state: 'planted',
        hitTargets: new Set()
      };

      this.fx.spawn('worldBreakerAnvilCleave', this.x + this.facing * 42, this.y - 84, {
        flip: this.facing < 0,
        palette: FORGE_JADE_PALETTE,
        light: 1.28,
        extra: { radius: 34, width: 12.5, isFinisher: true }
      });
      this.fx.spawn('tectonicCraterShockwave', anvilX, this.groundY - 6, {
        flip: this.facing < 0,
        palette: FORGE_JADE_PALETTE,
        light: 1.26,
        extra: { maxRx: 108 }
      });
      this.spawnVfxAnim(0, anvilX, this.groundY - 58, 204, 204, 0.38, {
        flipX: this.facing < 0,
        glowColor: 'gold',
        inFront: true
      });
      this.spawnVfxAnim(3, anvilX, this.groundY - 62, 220, 220, 0.46, {
        flipX: this.facing < 0,
        glowColor: 'emerald',
        inFront: false
      });

      if (game.audio) game.audio.play('skill_cast', anvilX);
      game.renderer.triggerShake(7, 0.14);
      game.vfx.spawnSpecialCastAura(this, this.skillName, '✦ WORLD-FORGE ANVIL ✦', 'forge', false);
      game.vfx.spawnShockwave(anvilX, this.groundY - 8, 125, '#10b981', 0.28, true);
      game.vfx.spawnDamageText(anvilX, this.groundY - 115, 0, false, 'FORGE ANVIL!', '#10b981');

      if (enemy && !enemy.isDead && Math.abs(enemy.x - anvilX) < 115) {
        enemy.takeDamage(26, this, false, 45, -135);
      }
    }

    // Phase 2 (`t >= 0.44`, during the Leaping Seismic Anvil Slam):
    // Spawn `colossalSkyAnvilDrop` + `tectonicCraterShockwave` (erupting 5-Spire Volcanic Basalt-Jade Obelisks)
    // + launch `activeAnvil` into a high-speed magma cannonball!
    if (t >= 0.44 && !this.didSecondaryAction) {
      this.didSecondaryAction = true;
      this.vx = this.facing * 155;
      const slamX = this.activeAnvil ? this.activeAnvil.x : this.x + this.facing * 128;
      if (game.audio) game.audio.play('thunder_slam', slamX);
      game.renderer.triggerShake(11, 0.22);

      this.fx.spawn('colossalSkyAnvilDrop', slamX, this.groundY - 6, {
        flip: this.facing < 0,
        palette: FORGE_GOLD_PALETTE,
        light: 1.38
      });
      this.fx.spawn('tectonicCraterShockwave', slamX, this.groundY - 6, {
        flip: this.facing < 0,
        palette: FORGE_JADE_PALETTE,
        light: 1.32,
        extra: { maxRx: 128 }
      });
      this.fx.spawn('worldBreakerAnvilCleave', this.x + this.facing * 68, this.y - 88, {
        flip: this.facing < 0,
        palette: FORGE_GOLD_PALETTE,
        light: 1.32,
        extra: { radius: 34, width: 12.5, isFinisher: true }
      });
      this.spawnVfxAnim(2, slamX, this.groundY - 82, 224, 224, 0.46, {
        glowColor: 'emerald',
        inFront: false
      });
      this.spawnVfxAnim(3, slamX, this.groundY - 64, 216, 216, 0.44, {
        flipX: this.facing < 0,
        glowColor: 'gold',
        inFront: false
      });
      this.spawnVfxAnim(4, slamX, this.groundY - 68, 228, 228, 0.40, {
        flipX: this.facing < 0,
        glowColor: 'gold',
        inFront: true
      });

      const sA = this.facing === 1 ? -1.6 : Math.PI - 1.2;
      const eA = this.facing === 1 ? 1.2 : Math.PI + 1.6;
      game.vfx.spawnSlash(this.x + this.facing * 68, this.y - 88, 152, sA, eA, '#fef08a', 0.32);
      game.vfx.spawnShockwave(slamX, this.groundY - 6, 165, '#f59e0b', 0.30, true);
      game.vfx.spawnDamageText(
        slamX,
        this.y - 156,
        0,
        true,
        '★ CANNONBALL SMASH! ★',
        '#fbbf24'
      );

      if (this.activeAnvil) {
        this.activeAnvil.state = 'flying';
        this.activeAnvil.dir = this.facing;
        this.activeAnvil.vx = this.facing * 940;
        this.activeAnvil.age = 0;
      }
      if (enemy && !enemy.isDead && Math.abs(enemy.x - slamX) < 165) {
        enemy.takeDamage(34, this, true, 220, -145);
      }
    }

    if (t >= 0.78) {
      this.setState('IDLE');
    }
  }

  updateUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    this.giantScale = 1.0 + 0.25 * Math.min(1, t / 0.28);
    this.forgeArmorTimer = Math.max(this.forgeArmorTimer, 0.5);

    if (!this._ultCastTriggered) {
      this._ultCastTriggered = true;
      if (game?.vfx) {
        game.vfx.spawnSpecialCastAura(this, this.ultName, '★ WORLD-FORGE RAGNAROK ★', 'forge', true);
      }
      this.spawnVfxAnim(3, this.x, this.groundY - 82, 240, 240, 0.56, {
        followOwner: true,
        offsetX: 0,
        offsetY: -82,
        flipX: this.facing < 0,
        glowColor: 'gold',
        inFront: false
      });
    }

    if (enemy && !enemy.isDead) {
      this.facing = enemy.x >= this.x ? 1 : -1;
      const dist = Math.abs(enemy.x - this.x);
      if (dist > 145) {
        this.x += this.facing * 215 * dt;
      }
    }
    this.walkPhase += dt * 7.5;
    this.headBob = Math.abs(Math.sin(this.walkPhase)) * 4.5;

    const triggerQuakeWave = (waveIdx) => {
      const slamX = this.x + this.facing * 138;
      const slamY = this.groundY - 8;
      if (game.audio) {
        game.audio.play('thunder_slam', slamX);
      }
      game.renderer.triggerShake(13 + waveIdx * 2, 0.26);
      game.renderer.triggerAberration(6 + waveIdx * 2);

      // Every stage spawns `ragnarokWorldForgeWave` (`stage: waveIdx`) + `tectonicCraterShockwave`
      this.fx.spawn('ragnarokWorldForgeWave', slamX, slamY, {
        flip: this.facing < 0,
        palette: waveIdx % 2 === 0 ? FORGE_JADE_PALETTE : FORGE_GOLD_PALETTE,
        light: 1.4,
        extra: { stage: waveIdx }
      });
      this.fx.spawn('tectonicCraterShockwave', slamX, slamY, {
        flip: this.facing < 0,
        palette: waveIdx % 2 === 0 ? FORGE_JADE_PALETTE : FORGE_GOLD_PALETTE,
        light: 1.34,
        extra: { maxRx: 128 + waveIdx * 12 }
      });

      // Stage 1 (Wide 2H Forge-Sweep) & Stage 3 spawn `worldBreakerAnvilCleave`
      if (waveIdx === 1 || waveIdx === 3) {
        this.fx.spawn('worldBreakerAnvilCleave', this.x + this.facing * 72, this.y - 96, {
          flip: this.facing < 0,
          palette: waveIdx === 3 ? FORGE_JADE_PALETTE : FORGE_GOLD_PALETTE,
          light: 1.36,
          extra: { radius: 36, width: 13, isFinisher: true }
        });
      }

      // Stage 2 (Rising 2H Volcanic Uppercut) & Stage 3 (Airborne Meteoric World-Breaker Impact) spawn `colossalSkyAnvilDrop`!
      if (waveIdx >= 2) {
        const dropX = enemy && !enemy.isDead ? enemy.x : slamX;
        this.fx.spawn('colossalSkyAnvilDrop', dropX, slamY, {
          flip: this.facing < 0,
          palette: waveIdx === 3 ? FORGE_JADE_PALETTE : FORGE_GOLD_PALETTE,
          light: 1.42
        });
      }

      this.spawnVfxAnim(2, slamX, this.groundY - 86, 236, 236, 0.50, {
        glowColor: waveIdx % 2 === 0 ? 'emerald' : 'gold',
        inFront: false
      });
      this.spawnVfxAnim(3, slamX, this.groundY - 66, 224, 224, 0.46, {
        flipX: this.facing < 0,
        glowColor: 'gold',
        inFront: false
      });
      this.spawnVfxAnim(4, slamX, this.groundY - 72, 240, 240, 0.44, {
        flipX: this.facing < 0,
        glowColor: waveIdx === 3 ? 'emerald' : 'gold',
        inFront: true
      });

      game.vfx.spawnDecal(slamX, 220, 'fissure', '#f59e0b', 5.5);
      game.vfx.spawnShockwave(slamX, this.groundY - 6, 260, '#fbbf24', 0.38, true);
      game.vfx.spawnBurst(slamX, this.groundY - 36, 28, '#fef08a', 310, {
        upBias: 165,
        size: 7
      });

      const targets = game.getEnemiesOf ? game.getEnemiesOf(this) : enemy ? [enemy] : [];
      for (const target of targets) {
        if (target && !target.isDead && !target.isBenched) {
          game.vfx.spawnShockwave(target.x, this.groundY - 6, 145, '#10b981', 0.34, true);
          game.vfx.spawnBurst(target.x, this.groundY - 42, 20, '#f97316', 260, {
            upBias: 185,
            size: 6
          });
          this.spawnVfxAnim(2, target.x, this.groundY - 82, 224, 224, 0.44, {
            glowColor: 'emerald',
            inFront: false
          });
          target.takeDamage(
            waveIdx === 3 ? 68 : 48,
            this,
            true,
            waveIdx === 3 ? 280 : -65,
            waveIdx === 3 ? -260 : -165
          );
        }
      }
    };

    // Slam 1 (`t >= 0.28`, Wide 2H Forge-Sweep)
    if (t >= 0.28 && !this.didActionFrame) {
      this.didActionFrame = true;
      triggerQuakeWave(1);
    }
    // Slam 2 (`t >= 0.56`, Rising 2H Volcanic Uppercut)
    if (t >= 0.56 && !this.didSecondaryAction) {
      this.didSecondaryAction = true;
      triggerQuakeWave(2);
    }
    // Slam 3 (`t >= 0.84`, Airborne Meteoric World-Breaker Impact)
    if (t >= 0.84 && !this.didWave3) {
      this.didWave3 = true;
      triggerQuakeWave(3);
    }

    if (t >= (this.ultDuration || 1.52)) {
      this.didWave3 = false;
      this.giantScale = 1.0;
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
    glowColor = 'gold'
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
  }
}
