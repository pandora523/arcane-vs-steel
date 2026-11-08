import { Fighter } from './Fighter.js';
import { PixelForge } from '../engine/PixelForge.js';

export class Titan extends Fighter {
  constructor(opts) {
    super({
      ...opts,
      name: opts.name || 'TORGAR',
      maxHp: 1520,
      moveSpeed: 138,
      attackRange: 185,
      autoInterval: 1.04,
      lightColor: 'rgba(245, 158, 11, 1)',
      primaryColor: '#f59e0b'
    });
    this.heroId = 'titan';
    this.skillName = 'ANVIL CANNONBALL SMASH';
    this.ultName = 'RAGNAROK: GIANT MARCH';
    this.theme = 'forge';
    this.hasPoise = true;
    this.unstoppablePoise = false;
    this.skillTriggerRange = 460;
    this.skillMaxCooldown = 5.4;
    this.comboStep = 0;

    // Torgar Unique Mechanics:
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
        // Trail molten forge sparks behind the cannonball anvil
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
        // Check collision with enemy
        const targets = game.getOpponentsOf ? game.getOpponentsOf(this) : enemy ? [enemy] : [];
        for (const t of targets) {
          if (t && !t.isDead && !a.hitTargets.has(t)) {
            if (Math.abs(t.x - a.x) < 68 && Math.abs(t.y - a.y) < 110) {
              a.hitTargets.add(t);
              t.takeDamage(54, this, true, 340, -165);
              if (game.audio) game.audio.playSkillHit('forge');
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
                  t.y - 235,
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
        // Physical obstacle: push enemy out if they try to walk through the planted anvil
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

    super.update(dt, enemy, game);
  }

  startDodge(enemy, game) {
    this.dodgeCooldown = this.dodgeMaxCooldown * (0.86 + Math.random() * 0.28);
    const dist = enemy && !enemy.isDead ? Math.abs(enemy.x - this.x) : 999;
    // Torgar prefers Magma Armor Fortify when enemies or projectiles threaten him, or Heavy Belly-Crush Leap at mid-range
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
    // Activate Magma Armor Fortify for 2.6 seconds + heal +38 HP!
    this.forgeArmorTimer = 2.6;
    this.heal(38, 'FORGE TEMPER');
    this.vx = 0;
    if (game && game.audio) game.audio.playDash('forge');
    if (game && game.vfx) {
      game.vfx.spawnDamageText(
        this.x,
        this.y - 208,
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
          if (game.audio) game.audio.playClash();
          game.vfx.spawnShockwave(proj.x, proj.y, 88, '#fef08a', 0.24);
          game.vfx.spawnDamageText(this.x, this.y - 216, 0, false, 'ANVIL DEFLECT!', '#fef08a');
        }
      }
    }

    // At t = 0.36s: Erupt a 360-degree Point-Blank Molten Magma Nova around Torgar (NO horizontal projectile clone!)
    if (t >= 0.36 && !this.didActionFrame) {
      this.didActionFrame = true;
      if (game.audio) game.audio.playSkillHit('forge');
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
        game.vfx.spawnDamageText(enemy.x, enemy.y - 210, 0, false, 'MOLTEN NOVA!', '#fbbf24');
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
    if (game && game.audio) game.audio.playDash('forge');
    if (game && game.vfx) {
      game.vfx.spawnDamageText(
        this.x,
        this.y - 204,
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
    if (game && game.audio) game.audio.playDash('forge');
    if (game && game.vfx) {
      game.vfx.spawnDamageText(
        this.x,
        this.y - 196,
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
      // Heavy low-arcing Juggernaut Belly-Crush (58px max height — NO aerial projectile wave!)
      const easeU = 1 - Math.pow(1 - u, 1.55);
      this.x = this.vaultStartX + (this.vaultTargetX - this.vaultStartX) * easeU;
      const jumpHeight = 58;
      this.y = this.groundY - Math.sin(u * Math.PI) * jumpHeight;
      this.vx = 0;
      this.vy = 0;

      // Heavy Landing Seismic Stomp at u >= 0.82!
      if (u >= 0.82 && !this.didActionFrame) {
        this.didActionFrame = true;
        this.y = this.groundY;
        if (game.audio) game.audio.playSkillHit('forge');
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
        game.vfx.spawnGroundFissure(this.x - 110, this.x + 110, '#f59e0b');
        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= 245 && enemy.y >= this.groundY - 70) {
          enemy.takeDamage(46, this, true, 165, -210);
          game.vfx.spawnDamageText(enemy.x, enemy.y - 215, 0, true, 'SEISMIC STOMP!', '#fef08a');
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

    // Grounded Juggernaut Bull-Rush Shoulder Tackle
    const rushSpeed = 520 * (1 - u * 0.45);
    this.vx = this.dashDir * rushSpeed;
    if (enemy && !enemy.isDead && !this.didActionFrame && Math.abs(enemy.x - this.x) < 115) {
      this.didActionFrame = true;
      enemy.takeDamage(34, this, false, 240, -145);
      if (game.audio) game.audio.playMeleeHit(true);
      game.renderer.triggerShake(7, 0.16);
      game.vfx.spawnDamageText(enemy.x, enemy.y - 205, 0, false, 'SHOULDER RAM!', '#fbbf24');
    }

    if (t >= dur) {
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  updateAutoAttack(dt, enemy, game) {
    const t = this.stateTimer;
    // Torgar's Pure Melee Seismic Maul Slams (ZERO horizontal projectile spam!)
    // Slams the floor, creating expanding Tectonic Ground Quakes & inward Seismic Suction on Hits 1 & 2!
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
      if (game.audio) game.audio.playSkillHit('forge');
      game.renderer.triggerShake(step === 2 ? 10 : 7, 0.18);

      // Spawn Expanding Ground Quake Ring at the Hammer Impact Point
      this.activeGroundQuakes.push({
        x: slamX,
        y: slamY,
        radius: 18,
        speed: step === 2 ? 560 : 460,
        age: 0,
        maxAge: 0.38,
        color: step === 2 ? '#10b981' : '#f59e0b'
      });

      game.vfx.spawnSlashArc(this.x, this.y - 76, this.facing, '#f59e0b', 135, 1);
      game.vfx.spawnShockwave(slamX, slamY, step === 2 ? 195 : 145, '#f59e0b', 0.32, true);
      game.vfx.spawnGroundFissure(this.x, slamX + this.facing * 95, '#f59e0b');
      game.vfx.spawnBurst(slamX, slamY - 12, step === 2 ? 22 : 14, '#fbbf24', 240, {
        upBias: 115,
        size: 6
      });

      const reach = step === 2 ? 235 : 205;
      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= reach) {
        const isCrit = step === 2 || Math.random() < 0.28;
        const dmg = (step === 2 ? 56 : 42) * (isCrit ? 1.35 : 1);
        // Hits 1 & 2 create TECTONIC SUCTION (negative knockX pulls enemy toward Torgar!);
        // Hit 3 launches enemy skyward with a Molten Geyser!
        const knockX = step === 2 ? 165 : -78;
        const knockY = step === 2 ? -225 : -135;
        enemy.takeDamage(dmg, this, isCrit, knockX, knockY);
        if (step < 2) {
          game.vfx.spawnDamageText(enemy.x, enemy.y - 210, 0, false, 'TECTONIC PULL!', '#fbbf24');
        } else {
          game.vfx.spawnDamageText(enemy.x, enemy.y - 222, 0, true, 'WORLD-BREAKER SLAM!', '#10b981');
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
    // TORGAR UNIQUE SKILL: ANVIL CANNONBALL SMASH!
    // Phase 1 (t = 0.16s): Summon a physical Runic Forge Anvil onto the floor 88px in front of Torgar.
    // Phase 2 (t = 0.44s): Swing the World-Breaker War-Hammer horizontally like a colossal baseball bat,
    // launching the entire physical Anvil across the arena at 840 px/s to Wall-Crush the enemy!
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
      if (game.audio) game.audio.playSkillCast('forge');
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
      if (game.audio) game.audio.playSkillHit('forge');
      game.renderer.triggerShake(11, 0.22);
      game.vfx.spawnSlashArc(this.x, this.y - 82, this.facing, '#fef08a', 142, 1);
      game.vfx.spawnDamageText(
        this.x + this.facing * 45,
        this.y - 216,
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
      // Point-blank batter swing also hits enemies right in front of Torgar
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
    // TORGAR UNIQUE ULTIMATE: RAGNAROK GIANT MARCH!
    // Torgar grows to 1.25x Colossal Giant Scale and marches unstoppably toward the enemy
    // while delivering 3 Earth-Shaker Hammer Quakes (t = 0.45s, 0.92s, 1.40s) that erupt molten lava geysers!
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
        game.audio.playUltimate('forge');
        game.audio.playSkillHit('forge');
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
      game.vfx.spawnGroundFissure(this.x - 160, this.x + 280 * this.facing, '#f59e0b');
      game.vfx.spawnShockwave(slamX, this.groundY - 6, 260, '#fbbf24', 0.38, true);
      game.vfx.spawnBurst(slamX, this.groundY - 36, 28, '#fef08a', 310, {
        upBias: 165,
        size: 7
      });

      const targets = game.getOpponentsOf ? game.getOpponentsOf(this) : enemy ? [enemy] : [];
      for (const target of targets) {
        if (target && !target.isDead) {
          // Erupt a targeted Molten Geyser directly beneath the enemy's feet + deal heavy quake damage!
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
    const assets = PixelForge.initAssets();
    const vfxSheet = assets.titanVfxSheet;

    // 1. Render Expanding Tectonic Ground Quake Rings & Lava Fissures
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

    // 2. Render Physical / Cannonball Runic Forge Anvil
    if (this.activeAnvil && vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth > 0) {
      const a = this.activeAnvil;
      const cellW = vfxSheet.naturalWidth / 30;
      const cellH = vfxSheet.naturalHeight / 3;
      const frameIdx = Math.floor(a.age * 30) % 30;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(Math.round(a.x), Math.round(a.y - 46));
      ctx.rotate(a.rot);
      ctx.drawImage(vfxSheet, frameIdx * cellW, 1 * cellH, cellW, cellH, -64, -64, 128, 128);
      ctx.restore();
    }

    // 3. Render Magma Armor Fortify Rock-Plates around Torgar when forgeArmorTimer > 0
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

  draw(ctx, isReflection = false) {
    const assets = PixelForge.initAssets();
    const sheet = assets.titanSheet;
    if (!sheet || !sheet.complete || sheet.naturalWidth === 0) return;

    const totalCols = 30;
    const totalRows = 9;
    const cellW = sheet.naturalWidth / totalCols;
    const cellH = sheet.naturalHeight / totalRows;

    let row = 0;
    let col = 0;

    if (this.isDead || this.state === 'DEATH') {
      row = 5;
      col = Math.min(29, Math.floor((this.deathTimer / 1.05) * 30));
    } else if (this.state === 'HURT' || this.hurtTimer > 0.08) {
      row = 5;
      col = Math.min(8, Math.floor((1 - this.hurtTimer / 0.34) * 9));
    } else if (this.state === 'ULTIMATE') {
      row = 4;
      col = Math.min(29, Math.floor((this.stateTimer / 1.85) * 30));
    } else if (this.state === 'SKILL') {
      row = 3;
      col = Math.min(29, Math.floor((this.stateTimer / 0.78) * 30));
    } else if (this.state === 'AUTO_ATTACK') {
      row = 2;
      col = Math.min(29, Math.floor((this.stateTimer / 0.64) * 30));
    } else if (this.state === 'JUMP') {
      row = 8;
      const dur = Math.max(0.01, this.dashDuration || 0.62);
      col = Math.min(29, Math.floor((this.stateTimer / dur) * 30));
    } else if (this.state === 'CROUCH') {
      row = 7;
      const dur = Math.max(0.01, this.crouchDuration || 0.82);
      col = Math.min(29, Math.floor((this.stateTimer / dur) * 30));
    } else if (this.state === 'DASH' || this.state === 'DODGE') {
      row = 6;
      const dur = Math.max(0.01, this.dashDuration || 0.44);
      col = Math.min(29, Math.floor((this.stateTimer / dur) * 30));
    } else if (this.state === 'WALK') {
      row = 1;
      col = Math.floor(((this.walkPhase / (Math.PI * 2)) % 1 + 1) * 30) % 30;
    } else {
      row = 0;
      col = Math.floor(((this.walkPhase / (Math.PI * 2)) % 1 + 1) * 30) % 30;
    }

    const scale = this.giantScale || 1.0;
    const drawW = Math.round(208 * scale);
    const drawH = Math.round(208 * scale);
    const anchorFootY = Math.round((45.5 / 52) * drawH);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(this.x), Math.round(this.y));
    ctx.scale(this.facing, 1);

    if (this.hitFlash > 0 && !isReflection) {
      ctx.filter = 'brightness(2.2) contrast(1.4)';
    }

    ctx.drawImage(
      sheet,
      col * cellW,
      row * cellH,
      cellW,
      cellH,
      -Math.round(drawW * 0.5),
      -anchorFootY,
      drawW,
      drawH
    );
    ctx.restore();
  }
}
