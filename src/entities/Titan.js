import { Fighter } from './Fighter.js?v=30fps39';
import { PixelForge } from '../engine/PixelForge.js?v=30fps39';

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
    // 1. Magma Armor Fortify timer (62% damage reduction + molten thorn reflection)
    this.forgeArmorTimer = 0;
    // 2. Physical Runic Anvil (summoned on floor, then smashed horizontally like a cannonball!)
    this.activeAnvil = null;
    // 3. Expanding Tectonic Ground Quake rings
    this.activeGroundQuakes = [];
    // 4. Giant Titan Scale during Ragnarok Ultimate
    this.giantScale = 1.0;
  }

  setState(newState) {
    super.setState(newState);
    if (newState !== 'ULTIMATE') {
      this.giantScale = 1.0;
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

  update(dt, enemy, game) {
    if (this.forgeArmorTimer > 0) {
      this.forgeArmorTimer = Math.max(0, this.forgeArmorTimer - dt);
    }

    // Update Physical Runic Forge Anvil (sits on floor, then flies horizontally when smashed!)
    if (this.activeAnvil && game) {
      const a = this.activeAnvil;
      a.age += dt;
      if (a.state === 'flying') {
        a.x += a.vx * dt;
        a.rot += a.dir * dt * 11.5;
        if (Math.random() < 0.75) {
          game.vfx.spawnParticle({
            x: a.x - a.dir * 18,
            y: a.y - 28 + (Math.random() - 0.5) * 20,
            vx: -a.vx * 0.25,
            vy: -35 - Math.random() * 45,
            size: 5,
            color: Math.random() < 0.5 ? '#f59e0b' : '#10b981',
            maxLife: 0.35
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
              }
            }
          }
        }
        const ww = game.renderer ? game.renderer.worldWidth : 1200;
        if (a.x < 40 || a.x > ww - 40 || a.age > 1.65) {
          game.vfx.spawnShockwave(a.x, a.y - 28, 120, '#f59e0b', 0.28);
          game.vfx.spawnBurst(a.x, a.y - 28, 16, '#f59e0b', 220, { upBias: 90, size: 5 });
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

    // Update Expanding Ground Quakes
    for (let i = this.activeGroundQuakes.length - 1; i >= 0; i--) {
      const q = this.activeGroundQuakes[i];
      q.age += dt;
      q.radius += q.speed * dt;
      if (q.age >= q.maxAge) {
        this.activeGroundQuakes.splice(i, 1);
      }
    }

    if (!this.isDead && this.state === 'WALK') {
      this.stepDustTimer += dt;
      if (this.stepDustTimer >= 0.36) {
        this.stepDustTimer = 0;
        if (game.audio) game.audio.play('footstep_steel', this.x);
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

  startCrouch(enemy, game) {
    this.crouchDuration = 0.82;
    this.setState('CROUCH');
    this.isCrouching = true;
    this.isDeflecting = true;
    this.forgeArmorTimer = 2.3;
    this.heal(30, 'FORGE TEMPER');
    this.vx = 0;
    const frontX = this.x + this.facing * 118;
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
        }
      }
    }

    // At t = 0.36s: Erupt a Molten Magma Hammer-Slam Nova IN FRONT of Torgar (never on his feet!)
    if (t >= 0.36 && !this.didActionFrame) {
      this.didActionFrame = true;
      const slamX = this.x + this.facing * 124;
      if (game.audio) game.audio.play('thunder_slam', slamX);
      game.renderer.triggerShake(8, 0.18);
      this.activeGroundQuakes.push({
        x: slamX,
        y: this.groundY - 4,
        radius: 28,
        speed: 480,
        age: 0,
        maxAge: 0.42,
        color: '#f59e0b'
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

  onStartDash(enemy, game, dir) {
    this.isFlipVault = false;
    this.unstoppablePoise = true;
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

  updateDashOrDodge(dt, enemy, game) {
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
        this.activeGroundQuakes.push({
          x: slamX,
          y: this.groundY - 4,
          radius: 26,
          speed: 540,
          age: 0,
          maxAge: 0.44,
          color: '#10b981'
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
    }

    if (t >= dur) {
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  updateAutoAttack(dt, enemy, game) {
    const t = this.stateTimer;
    if (t < 0.30) {
      this.armAngle = -2.35;
    } else if (t >= 0.34 && !this.didActionFrame) {
      this.didActionFrame = true;
      const step = this.comboStep;
      this.comboStep = (this.comboStep + 1) % 3;
      this.vx = this.facing * (step === 2 ? 165 : 115);
      this.armVel = 36;

      // Hammerhead slams far IN FRONT of Torgar (132px ahead), never on his feet!
      const slamX = this.x + this.facing * 132;
      const slamY = this.groundY - 4;
      if (game.audio) game.audio.play('thunder_slam', slamX);
      game.renderer.triggerShake(step === 2 ? 10 : 7, 0.18);

      this.activeGroundQuakes.push({
        x: slamX,
        y: slamY,
        radius: 22,
        speed: step === 2 ? 560 : 460,
        age: 0,
        maxAge: 0.42,
        color: step === 2 ? '#10b981' : '#f59e0b'
      });

      const sA = this.facing === 1 ? -1.85 : Math.PI - 1.25;
      const eA = this.facing === 1 ? 1.25 : Math.PI + 1.85;
      game.vfx.spawnSlash(this.x + this.facing * 64, this.y - 86, 148, sA, eA, '#f59e0b', 0.30);
      game.vfx.spawnShockwave(slamX, slamY, step === 2 ? 205 : 155, '#f59e0b', 0.32, true);
      game.vfx.spawnDecal(slamX, 150, 'fissure', '#f59e0b', 4.0);
      game.vfx.spawnBurst(slamX, slamY - 14, step === 2 ? 24 : 16, '#fbbf24', 250, {
        upBias: 125,
        size: 6
      });

      const reach = step === 2 ? 245 : 215;
      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= reach) {
        const isCrit = step === 2 || Math.random() < 0.28;
        const dmg = (step === 2 ? 51 : 38) * (isCrit ? 1.35 : 1);
        const knockX = step === 2 ? 165 : -78;
        const knockY = step === 2 ? -225 : -135;
        enemy.takeDamage(dmg, this, isCrit, knockX, knockY);
        if (step < 2) {
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

  updateSkill(dt, enemy, game) {
    const t = this.stateTimer;
    if (t >= 0.16 && !this.didActionFrame) {
      this.didActionFrame = true;
      const anvilX = Math.max(95, Math.min(game.renderer.worldWidth - 95, this.x + this.facing * 118));
      this.activeAnvil = {
        x: anvilX,
        y: this.groundY,
        vx: 0,
        dir: this.facing,
        rot: 0,
        age: 0,
        state: 'planted',
        hitTargets: new Set()
      };
      if (game.audio) game.audio.play('skill_cast', anvilX);
      game.renderer.triggerShake(7, 0.14);
      game.vfx.spawnShockwave(anvilX, this.groundY - 8, 125, '#10b981', 0.28, true);
      game.vfx.spawnDamageText(anvilX, this.groundY - 115, 0, false, 'FORGE ANVIL!', '#10b981');

      if (enemy && !enemy.isDead && Math.abs(enemy.x - anvilX) < 88) {
        enemy.takeDamage(26, this, false, 45, -135);
      }
    }

    if (t >= 0.44 && !this.didSecondaryAction) {
      this.didSecondaryAction = true;
      this.vx = this.facing * 155;
      const slamX = this.x + this.facing * 128;
      if (game.audio) game.audio.play('thunder_slam', slamX);
      game.renderer.triggerShake(11, 0.22);
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
        this.activeAnvil.vx = this.facing * 920;
        this.activeAnvil.age = 0;
      }
      if (enemy && !enemy.isDead && Math.abs(enemy.x - slamX) < 155) {
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
      if (game.audio) {
        game.audio.play('thunder_slam', slamX);
      }
      game.renderer.triggerShake(13 + waveIdx * 2, 0.26);
      game.renderer.triggerAberration(6 + waveIdx * 2);
      this.activeGroundQuakes.push({
        x: slamX,
        y: this.groundY - 4,
        radius: 32,
        speed: 640,
        age: 0,
        maxAge: 0.52,
        color: waveIdx % 2 === 0 ? '#f59e0b' : '#10b981'
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

    if (t >= 0.45 && !this.didActionFrame) {
      this.didActionFrame = true;
      triggerQuakeWave(1);
    }
    if (t >= 0.92 && !this.didSecondaryAction) {
      this.didSecondaryAction = true;
      triggerQuakeWave(2);
    }
    if (t >= 1.40 && !this.didWave3) {
      this.didWave3 = true;
      triggerQuakeWave(3);
    }

    if (t >= 1.85) {
      this.didWave3 = false;
      this.giantScale = 1.0;
      this.setState('IDLE');
    }
  }

  drawGrowingWorldBreakerHammer(ctx) {
    // Renders Torgar's World-Breaker Hammer visibly GROWING HUGE (up to 2.25x - 2.65x!) as he slams it down IN FRONT of him!
    let swingProg = -1;
    let maxGrowth = 2.15;
    let lingerAlpha = 0;

    const t = this.stateTimer;
    if (this.state === 'AUTO_ATTACK' && t >= 0.10 && t <= 0.56) {
      maxGrowth = this.comboStep === 0 ? 2.25 : 1.95;
      if (t <= 0.34) {
        swingProg = (t - 0.10) / 0.24;
        lingerAlpha = 1.0;
      } else {
        swingProg = 1.0;
        lingerAlpha = Math.max(0, 1.0 - (t - 0.34) / 0.22);
      }
    } else if (this.state === 'SKILL' && t >= 0.22 && t <= 0.64) {
      maxGrowth = 2.05;
      if (t <= 0.44) {
        swingProg = (t - 0.22) / 0.22;
        lingerAlpha = 1.0;
      } else {
        swingProg = 1.0;
        lingerAlpha = Math.max(0, 1.0 - (t - 0.44) / 0.20);
      }
    } else if (this.state === 'JUMP' && this.isFlipVault) {
      const u = Math.min(1, t / Math.max(0.01, this.dashDuration || 0.62));
      if (u >= 0.45 && u <= 0.96) {
        maxGrowth = 2.15;
        swingProg = Math.min(1.0, (u - 0.45) / 0.37);
        lingerAlpha = u <= 0.82 ? 1.0 : Math.max(0, 1.0 - (u - 0.82) / 0.14);
      }
    } else if (this.state === 'ULTIMATE' && t >= 0.20 && t <= 1.72) {
      maxGrowth = 2.55;
      // 3 colossal slam cycles peaking at 0.45s, 0.92s, and 1.40s
      const slamPeaks = [0.45, 0.92, 1.40];
      for (const pk of slamPeaks) {
        if (t >= pk - 0.24 && t <= pk + 0.22) {
          if (t <= pk) {
            swingProg = (t - (pk - 0.24)) / 0.24;
            lingerAlpha = 1.0;
          } else {
            swingProg = 1.0;
            lingerAlpha = Math.max(0, 1.0 - (t - pk) / 0.22);
          }
          break;
        }
      }
    }

    if (swingProg < 0 || lingerAlpha <= 0.02) return;

    const easeSwing = Math.pow(swingProg, 1.65);
    // Hammer grows dramatically from 0.95x at overhead windup to maxGrowth (2.15x - 2.55x!) as it slams into the ground in front!
    const hScale = 0.95 + (maxGrowth - 0.95) * easeSwing;
    // Pivot in front of Titan's chest/shoulder so the colossal hammerhead lands at x + facing * 130, y = groundY - 12
    const pivX = this.x + this.facing * 24;
    const pivY = this.y - 84;
    const localAngle = -2.05 * (1 - easeSwing) + 0.36 * easeSwing;
    const worldAngle = this.facing >= 0 ? localAngle : Math.PI - localAngle;
    const ux = Math.cos(worldAngle);
    const uy = Math.sin(worldAngle);
    const nx = -uy;
    const ny = ux * this.facing;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const shaftLen = Math.round((56 * hScale) / 4) * 4;
    const headW = Math.round((28 * hScale) / 4) * 4;
    const headH = Math.round((44 * hScale) / 4) * 4;

    // 1. Stepped 4x4 Pixel-Art Molten-Jade Swing Crescent Trail behind the growing hammerhead
    if (swingProg > 0.16 && swingProg < 0.98) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const arcR = shaftLen + headW * 0.45;
      for (let s = 1; s <= 14; s++) {
        const trailA = localAngle - s * 0.065;
        const wA = this.facing >= 0 ? trailA : Math.PI - trailA;
        const tx = Math.round((pivX + Math.cos(wA) * arcR) / 4) * 4;
        const ty = Math.round((pivY + Math.sin(wA) * arcR) / 4) * 4;
        const frac = 1 - s / 15;
        ctx.globalAlpha = 0.72 * lingerAlpha * frac;
        ctx.fillStyle = s % 3 === 0 ? '#10b981' : s <= 5 ? '#fef08a' : '#f59e0b';
        const bSz = s <= 6 ? 12 : 8;
        ctx.fillRect(tx - bSz * 0.5, ty - bSz * 0.5, bSz, bSz);
      }
      ctx.restore();
    }

    // Helper to place a stepped 4x4 pixel block in world space along the hammer's local axes
    const putHammerPx = (along, perp, col, sz = 4, alpha = lingerAlpha * 0.98, additive = false) => {
      const wx = pivX + ux * along + nx * perp;
      const wy = pivY + uy * along + ny * perp;
      const px = Math.round(wx / 4) * 4;
      const py = Math.round(wy / 4) * 4;
      ctx.globalCompositeOperation = additive ? 'lighter' : 'source-over';
      ctx.globalAlpha = Math.min(1, alpha);
      ctx.fillStyle = col;
      ctx.fillRect(px - sz * 0.5, py - sz * 0.5, sz, sz);
    };

    // 2. Heavy Obsidian-Bronze Pixel Haft with Molten Gold Grip Rings
    for (let d = -12; d <= shaftLen; d += 4) {
      const isRing = Math.abs(d % 16) < 4;
      putHammerPx(d, -4, isRing ? '#fbbf24' : '#18181b', 4);
      putHammerPx(d, 0, isRing ? '#fef08a' : '#52525b', 4);
      putHammerPx(d, 4, isRing ? '#d97706' : '#27272a', 4);
    }

    // 3. Colossal Growing Stepped 4x4 Pixel-Art World-Breaker Anvil Hammerhead in front!
    const hx0 = Math.round((shaftLen - headW * 0.35) / 4) * 4;
    const hx1 = hx0 + headW;
    const halfH = Math.round((headH * 0.5) / 4) * 4;

    for (let d = hx0; d <= hx1; d += 4) {
      for (let p = -halfH; p <= halfH; p += 4) {
        // Chamfer the 4 outer corners of the pixel anvil head
        if ((d === hx0 || d === hx1) && Math.abs(p) === halfH) continue;

        const isBorder = d === hx0 || d === hx1 || Math.abs(p) === halfH;
        const isStrikeFace = p >= halfH - 8;
        const isBackSpike = p <= -halfH + 4 && Math.abs(d - (hx0 + headW * 0.5)) <= 8;
        const runeDist = Math.abs(d - (hx0 + headW * 0.5)) + Math.abs(p);

        let col = '#27272a';
        let add = false;
        if (runeDist <= Math.max(4, headW * 0.22)) {
          col = runeDist <= 4 ? '#ecfdf5' : '#10b981';
          add = true;
        } else if (isStrikeFace) {
          col = p === halfH ? '#fef08a' : '#f59e0b';
        } else if (isBackSpike || isBorder) {
          col = '#fbbf24';
        } else if ((d + p) % 8 === 0) {
          col = '#3f3f46';
        }
        putHammerPx(d, p, col, 4, lingerAlpha * 0.98, add);
      }
    }

    ctx.restore();
  }

  drawForegroundOverlay(ctx) {
    const vfxSheet = PixelForge.initAssets().titan?.vfx;
    const hasVfx = !!(vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth > 0);

    // 1. Render Torgar's Visibly Growing Colossal World-Breaker Hammer in front during slams!
    this.drawGrowingWorldBreakerHammer(ctx);

    // 2. Forward Ground Quakes & 30fps Molten Magma Crater Eruption at slamX (in front of Titan, never on his feet!)
    if (this.activeGroundQuakes.length > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const q of this.activeGroundQuakes) {
        const u = Math.min(1, q.age / Math.max(0.01, q.maxAge));
        const alpha = Math.max(0, 1 - u);

        // Render the 30fps Molten Magma Crater & Geyser (Row 2 of titan_vfx.png) at the forward impact point!
        if (hasVfx) {
          const fCol = Math.min(29, Math.floor(u * 29));
          ctx.save();
          ctx.imageSmoothingEnabled = false;
          ctx.globalAlpha = Math.min(1, alpha * 1.15);
          const cW = 192;
          const cH = 164;
          ctx.drawImage(
            vfxSheet,
            fCol * 208,
            2 * 208,
            208,
            208,
            Math.round(q.x - cW * 0.5),
            Math.round(q.y - cH + 18),
            cW,
            cH
          );
          ctx.restore();
        }

        // Smooth elliptical tectonic shockwave ring expanding from the forward impact point
        ctx.save();
        ctx.globalAlpha = alpha * 0.85;
        ctx.strokeStyle = q.color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(q.x, q.y - 2, q.radius, Math.max(6, q.radius * 0.18), 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(q.x, q.y - 2, q.radius * 0.72, Math.max(4, q.radius * 0.12), 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }

    if (this.activeAnvil && hasVfx) {
      const a = this.activeAnvil;
      const cellW = 208;
      const cellH = 208;
      const frameIdx = Math.floor(a.age * 30) % 30;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(Math.round(a.x), Math.round(a.y - 46));
      ctx.rotate(a.rot);
      ctx.drawImage(vfxSheet, frameIdx * cellW, 1 * cellH, cellW, cellH, -64, -64, 128, 128);
      ctx.restore();
    }

    if (this.forgeArmorTimer > 0 && !this.isDead) {
      const pulse = 0.65 + 0.35 * Math.sin(this.walkPhase * 4);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, this.forgeArmorTimer * 1.5) * 0.82;
      for (let i = 0; i < 4; i++) {
        const ang = this.walkPhase * 2.4 + (i * Math.PI) / 2;
        const ox = this.x + Math.cos(ang) * 44;
        const oy = this.y - 74 + Math.sin(ang) * 18;
        ctx.fillStyle = i % 2 === 0 ? '#f59e0b' : '#10b981';
        ctx.beginPath();
        ctx.moveTo(ox, oy - 9 * pulse);
        ctx.lineTo(ox + 6, oy);
        ctx.lineTo(ox, oy + 9 * pulse);
        ctx.lineTo(ox - 6, oy);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  }

  draw(ctx, isReflection = false, renderer = null) {
    const sprites = PixelForge.initAssets().titan;
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
