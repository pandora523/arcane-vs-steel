import { Fighter } from './Fighter.js?v=30fps19';
import { PixelForge } from '../engine/PixelForge.js?v=30fps19';

export class Titan extends Fighter {
  constructor(x, groundY, facing = 1) {
    const opts = typeof x === 'object' && x !== null ? x : { x, groundY, facing };
    super({
      ...opts,
      name: opts.name || 'Torgar',
      maxHp: 1520,
      moveSpeed: 138,
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
    this.skillMaxCooldown = 4.7;
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
              t.takeDamage(54, this, true, 340, -165);
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
    this.forgeArmorTimer = 2.6;
    this.heal(38, 'FORGE TEMPER');
    this.vx = 0;
    if (game && game.audio) game.audio.play('clang', this.x);
    if (game && game.vfx) {
      game.vfx.spawnDamageText(
        this.x,
        this.y - 148,
        0,
        false,
        'MAGMA ARMOR FORTIFY!',
        '#fbbf24'
      );
      game.vfx.spawnShockwave(this.x, this.groundY - 6, 128, '#f59e0b', 0.34, true);
      game.vfx.spawnBurst(this.x, this.y - 72, 16, '#fbbf24', 180, {
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

    // Deflect incoming enemy projectiles with molten anvil clang
    if (this.isDeflecting && game && game.vfx) {
      for (const proj of game.vfx.projectiles) {
        if (
          proj.owner !== this &&
          (!this.team || !proj.owner?.team || proj.owner.team !== this.team) &&
          Math.abs(proj.x - this.x) < 105
        ) {
          proj.owner = this;
          proj.vx = -proj.vx * 1.25;
          proj.vy = -Math.abs(proj.vy) * 0.4;
          proj.color = '#f59e0b';
          this.gainMana(12);
          if (game.audio) game.audio.play('clang', this.x);
          game.vfx.spawnShockwave(proj.x, proj.y, 88, '#fef08a', 0.24);
          game.vfx.spawnDamageText(this.x, this.y - 156, 0, false, 'ANVIL DEFLECT!', '#fef08a');
        }
      }
    }

    // At t = 0.36s: Erupt a 360-degree Point-Blank Molten Magma Nova around Torgar
    if (t >= 0.36 && !this.didActionFrame) {
      this.didActionFrame = true;
      if (game.audio) game.audio.play('thunder_slam', this.x);
      game.renderer.triggerShake(8, 0.18);
      this.activeGroundQuakes.push({
        x: this.x,
        y: this.groundY - 4,
        radius: 28,
        speed: 480,
        age: 0,
        maxAge: 0.38,
        color: '#f59e0b'
      });
      game.vfx.spawnShockwave(this.x, this.groundY - 6, 195, '#f59e0b', 0.36, true);
      game.vfx.spawnBurst(this.x, this.y - 54, 24, '#f97316', 250, {
        upBias: 110,
        size: 6
      });
      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= 195) {
        enemy.takeDamage(36, this, false, 235, -165);
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
    const targetDist = enemy && !enemy.isDead ? Math.min(240, Math.max(95, Math.abs(enemy.x - this.x) - 45)) : 165;
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
        if (game.audio) game.audio.play('thunder_slam', this.x);
        game.renderer.triggerShake(10, 0.22);
        this.activeGroundQuakes.push({
          x: this.x,
          y: this.groundY - 4,
          radius: 24,
          speed: 540,
          age: 0,
          maxAge: 0.42,
          color: '#10b981'
        });
        game.vfx.spawnShockwave(this.x, this.groundY - 4, 210, '#f59e0b', 0.36, true);
        game.vfx.spawnDecal(this.x, 180, 'fissure', '#f59e0b', 4.5);
        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= 245 && enemy.y >= this.groundY - 70) {
          enemy.takeDamage(46, this, true, 165, -210);
          game.vfx.spawnDamageText(enemy.x, enemy.y - 155, 0, true, 'SEISMIC STOMP!', '#fef08a');
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
      this.vx = this.facing * (step === 2 ? 185 : 135);
      this.armVel = 36;

      const slamX = this.x + this.facing * 92;
      const slamY = this.groundY - 4;
      if (game.audio) game.audio.play('thunder_slam', slamX);
      game.renderer.triggerShake(step === 2 ? 10 : 7, 0.18);

      this.activeGroundQuakes.push({
        x: slamX,
        y: slamY,
        radius: 18,
        speed: step === 2 ? 560 : 460,
        age: 0,
        maxAge: 0.38,
        color: step === 2 ? '#10b981' : '#f59e0b'
      });

      const sA = this.facing === 1 ? -1.85 : Math.PI - 1.25;
      const eA = this.facing === 1 ? 1.25 : Math.PI + 1.85;
      game.vfx.spawnSlash(this.x + this.facing * 42, this.y - 86, 135, sA, eA, '#f59e0b', 0.30);
      game.vfx.spawnShockwave(slamX, slamY, step === 2 ? 195 : 145, '#f59e0b', 0.32, true);
      game.vfx.spawnDecal(slamX, 140, 'fissure', '#f59e0b', 4.0);
      game.vfx.spawnBurst(slamX, slamY - 12, step === 2 ? 22 : 14, '#fbbf24', 240, {
        upBias: 115,
        size: 6
      });

      const reach = step === 2 ? 235 : 205;
      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= reach) {
        const isCrit = step === 2 || Math.random() < 0.28;
        const dmg = (step === 2 ? 56 : 42) * (isCrit ? 1.35 : 1);
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
      const anvilX = Math.max(95, Math.min(game.renderer.worldWidth - 95, this.x + this.facing * 88));
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
      game.vfx.spawnShockwave(anvilX, this.groundY - 8, 115, '#10b981', 0.28, true);
      game.vfx.spawnDamageText(anvilX, this.groundY - 115, 0, false, 'FORGE ANVIL!', '#10b981');

      if (enemy && !enemy.isDead && Math.abs(enemy.x - anvilX) < 82) {
        enemy.takeDamage(26, this, false, 45, -135);
      }
    }

    if (t >= 0.44 && !this.didSecondaryAction) {
      this.didSecondaryAction = true;
      this.vx = this.facing * 175;
      if (game.audio) game.audio.play('thunder_slam', this.x);
      game.renderer.triggerShake(11, 0.22);
      const sA = this.facing === 1 ? -1.6 : Math.PI - 1.2;
      const eA = this.facing === 1 ? 1.2 : Math.PI + 1.6;
      game.vfx.spawnSlash(this.x + this.facing * 45, this.y - 88, 142, sA, eA, '#fef08a', 0.32);
      game.vfx.spawnDamageText(
        this.x + this.facing * 45,
        this.y - 156,
        0,
        true,
        '★ CANNONBALL SMASH! ★',
        '#fbbf24'
      );

      if (this.activeAnvil) {
        this.activeAnvil.state = 'flying';
        this.activeAnvil.vx = this.facing * 840;
        this.activeAnvil.age = 0;
      }
      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 165) {
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
      if (dist > 115) {
        this.x += this.facing * 215 * dt;
      }
    }
    this.walkPhase += dt * 7.5;
    this.headBob = Math.abs(Math.sin(this.walkPhase)) * 4.5;

    const triggerQuakeWave = (waveIdx) => {
      if (game.audio) {
        game.audio.play('thunder_slam', this.x);
      }
      game.renderer.triggerShake(13 + waveIdx * 2, 0.26);
      game.renderer.triggerAberration(6 + waveIdx * 2);
      const slamX = this.x + this.facing * 105;
      this.activeGroundQuakes.push({
        x: slamX,
        y: this.groundY - 4,
        radius: 26,
        speed: 640,
        age: 0,
        maxAge: 0.48,
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

  drawForegroundOverlay(ctx) {
    const vfxSheet = PixelForge.initAssets().titan?.vfx;

    if (this.activeGroundQuakes.length > 0) {
      ctx.save();
      for (const q of this.activeGroundQuakes) {
        const alpha = Math.max(0, 1 - q.age / q.maxAge);
        ctx.globalAlpha = alpha * 0.9;
        ctx.fillStyle = q.color;
        ctx.fillRect(Math.round(q.x - q.radius), Math.round(q.y - 4), Math.round(q.radius * 2), 6);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(Math.round(q.x - q.radius), Math.round(q.y - 10), 8, 12);
        ctx.fillRect(Math.round(q.x + q.radius - 8), Math.round(q.y - 10), 8, 12);
      }
      ctx.restore();
    }

    if (this.activeAnvil && vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth > 0) {
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
      ctx.globalAlpha = Math.min(1, this.forgeArmorTimer * 1.5) * 0.85;
      for (let i = 0; i < 4; i++) {
        const ang = this.walkPhase * 2.4 + (i * Math.PI) / 2;
        const ox = Math.round(this.x + Math.cos(ang) * 44);
        const oy = Math.round(this.y - 74 + Math.sin(ang) * 18);
        ctx.fillStyle = i % 2 === 0 ? '#f59e0b' : '#10b981';
        ctx.fillRect(ox - 5, oy - 7, 10, 14);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(ox - 2, oy - 4, 4, 8 * pulse);
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

    const groundPlantOffset = 6;
    const walkBob =
      !isReflection && this.state === 'WALK'
        ? Math.round(Math.abs(Math.sin(this.walkPhase * 4.0)) * 3)
        : 0;

    ctx.translate(
      Math.round(this.x),
      Math.round(this.y + groundPlantOffset - walkBob)
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
