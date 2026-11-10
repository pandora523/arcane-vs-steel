import { Fighter } from './Fighter.js?v=30fps40';
import { PixelForge } from '../engine/PixelForge.js?v=30fps40';

export class Warrior extends Fighter {
  constructor(x, groundY, facing = 1) {
    super({
      name: 'Aethelgard',
      x,
      groundY,
      facing,
      maxHp: 1260,
      attackRange: 152,
      moveSpeed: 156,
      autoInterval: 1.29,
      lightColor: 'rgba(56, 189, 248, 1)',
      primaryColor: '#38bdf8'
    });
    this.heroId = 'warrior';
    this.theme = 'steel';
    this.deathSfx = 'death_warrior';
    this.hasPoise = true; // Runic Juggernaut Poise resists ranged knockback/hitstun
    this.skillDuration = 1.04;
    this.ultDuration = 1.86;
    this.skillMaxCooldown = 5.4;
    this.skillTriggerRange = 480;
    this.ultName = 'HEAVENLY EARTHSHATTER';
    this.skillName = 'TEMPEST VANGUARD';
    this.comboStep = 0;
    this.spinAngle = 0;
    this.spinHitStep = 0;
    this.isDeflecting = false;
    this.reflectedInSkill = false;
    this.stepDustTimer = 0;
    this.spawnedSkyBlades = false;
    this.didSlamFinisher = false;
    this.dodgeMaxCooldown = 3.6;
    this.dashMaxCooldown = 3.35;
    this.crouchCooldown = 0;
    this.crouchDuration = 0.96;
    this.isCrouching = false;
    this.vaultCooldown = 0;
    this.isFlipVault = false;
    this.flipStartX = x;
    this.flipTargetX = x;
    this.flipAngle = 0;
    this.afterimages = [];
    this.afterimageAccum = 0;
    this.runeBlinkPillars = [];
    this.activeVfxAnims = [];
    this.slashBeams = [];
  }

  setState(newState) {
    super.setState(newState);
    if (newState === 'ULTIMATE') {
      this._ultInit = false;
      this.isInvulnerable = true;
    } else if (this._ultInit) {
      this._ultInit = false;
    }
  }

  spawnAfterimage(x, y, facing, row, col, maxLife = 0.34) {
    const frameIdx = row * 30 + Math.max(0, Math.min(29, col | 0));
    this.afterimages.push({
      x,
      y,
      facing: facing || 1,
      frameIdx,
      age: 0,
      maxLife
    });
    if (this.afterimages.length > 20) this.afterimages.shift();
  }

  spawnRuneBlinkPillar(x, y, maxLife = 0.36, height = 188, isSky = false) {
    this.runeBlinkPillars.push({
      x,
      y,
      height,
      isSky,
      age: 0,
      maxLife
    });
    if (this.runeBlinkPillars.length > 14) this.runeBlinkPillars.shift();
  }

  spawnVfxAnim(row, x, y, w = 208, h = 208, maxLife = 0.42, opts = {}) {
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
      startFrame: opts.startFrame !== undefined ? opts.startFrame : 0,
      endFrame: opts.endFrame !== undefined ? opts.endFrame : 29,
      flipX: !!opts.flipX,
      foreground: !!opts.foreground
    });
    if (this.activeVfxAnims.length > 18) this.activeVfxAnims.shift();
  }

  spawnSlashBeam(x1, y1, x2, y2, maxLife = 0.34) {
    this.slashBeams.push({ x1, y1, x2, y2, age: 0, maxLife });
    if (this.slashBeams.length > 14) this.slashBeams.shift();
  }

  getEffectiveAttackRange() {
    // Every 3rd swing unleashes a long-range Glacial Crescent Sword-Wave up to 440px!
    return this.comboStep % 3 === 2 ? 440 : this.attackRange;
  }

  reflectNearbyProjectiles(game) {
    if (this.reflectedInSkill) return;
    for (const proj of game.vfx.projectiles) {
      if (
        proj.owner !== this &&
        !proj.isMeteor &&
        Math.hypot(proj.x - this.x, proj.y - (this.y - 110)) < 124
      ) {
        this.reflectedInSkill = true;
        proj.owner = this;
        proj.vx = -proj.vx * 1.25;
        proj.vy = -8;
        proj.type = 'blade_wave';
        proj.color = '#38bdf8';
        proj.coreColor = '#e0f2fe';
        if (game.audio) game.audio.play('reflect', this.x);
        game.vfx.spawnDamageText(this.x, this.y - 145, 0, false, 'AEGIS REFLECT!', '#38bdf8');
        const startA = this.facing === 1 ? -1.35 : Math.PI - 1.35;
        const endA = this.facing === 1 ? 1.35 : Math.PI + 1.35;
        game.vfx.spawnSlash(proj.x, proj.y, 92, startA, endA, '#38bdf8', 0.28);
        game.vfx.spawnBurst(proj.x, proj.y, 14, '#38bdf8', 240);
        game.vfx.spawnShockwave(proj.x, proj.y, 85, '#7dd3fc', 0.26);
        game.renderer.triggerShake(6, 0.14);
        break;
      }
    }
  }

  startCrouch(enemy, game) {
    this.crouchCooldown = 3.2;
    this.crouchDuration = 0.96;
    this.setState('CROUCH');
    this.isCrouching = true;
    this.isDeflecting = true;
    this.reflectedInSkill = false;
    this.vx = 0;
    this.heal(8, 'RUNIC RESOLVE');
    this.reflectNearbyProjectiles(game);
    if (game && game.audio) game.audio.play('reflect', this.x);
    if (game && game.vfx) {
      game.vfx.spawnShockwave(this.x, this.groundY - 2, 74, '#38bdf8', 0.26, true);
      game.vfx.spawnGlyphBurst(this.x, this.y - 82, 5, 'steel');
      game.vfx.spawnDamageText(this.x, this.y - 128, 0, false, 'AEGIS STANCE!', '#7dd3fc');
    }
  }

  startJump(enemy, game, customDir = null) {
    this.dodgeCooldown = this.dodgeMaxCooldown * (0.86 + Math.random() * 0.28);
    this.vaultCooldown = 3.2;
    this.setState('JUMP');
    this.isInvulnerable = true;
    const ww = game.renderer.worldWidth;
    let dir = customDir !== null ? customDir : this.facing;
    if (this.x < 180) dir = 1;
    else if (this.x > ww - 180) dir = -1;
    this.dashDir = dir;
    this.onStartJumpVault(enemy, game, dir);
  }

  onStartJumpVault(enemy, game, dir) {
    const ww = game.renderer.worldWidth;
    const dist = enemy ? Math.abs(enemy.x - this.x) : 280;
    this.isFlipVault = true;
    this.flipStartX = this.x;
    this.flipAngle = 0;
    this.dashDuration = 0.62;
    this.isDeflecting = true;

    if (enemy && !enemy.isDead) {
      const toEnemy = Math.sign(enemy.x - this.x) || this.facing;
      if (dist > 210) {
        // Aggressive Rune-Knight Aerial Leap closing toward the enemy's flank!
        const target = enemy.x - toEnemy * 95;
        this.flipTargetX = Math.max(140, Math.min(ww - 140, target));
        this.dashDir = Math.sign(this.flipTargetX - this.flipStartX) || toEnemy;
      } else {
        // Tactical Rune-Knight Vault across or away from close pressure
        const openDir = this.x < 260 ? 1 : this.x > ww - 260 ? -1 : dir;
        this.flipTargetX = Math.max(140, Math.min(ww - 140, this.x + openDir * 270));
        this.dashDir = openDir;
      }
    } else {
      this.flipTargetX = Math.max(140, Math.min(ww - 140, this.x + dir * 270));
      this.dashDir = dir;
    }

    this.vx = 0;
    this.vy = 0;
    if (game.audio) game.audio.play('storm_leap', this.x);
    game.vfx.spawnShockwave(this.x, this.groundY, 98, '#38bdf8', 0.32, true);
    game.vfx.spawnGlyphBurst(this.x, this.y - 65, 6, 'steel');
    game.vfx.spawnDamageText(this.x, this.y - 135, 0, false, 'RUNIC VAULT!', '#38bdf8');
  }

  onStartDash(enemy, game, dir) {
    this.isFlipVault = false;
    this.flipAngle = 0;
    this.dashDuration = 0.44;
    this.isDeflecting = true;
    this.vx = dir * 485;
    if (game.audio) game.audio.play('storm_leap', this.x);
    game.vfx.spawnShockwave(this.x, this.y - 80, 88, '#38bdf8', 0.28, false, true);
    game.vfx.spawnGlyphBurst(this.x, this.y - 85, 6, 'steel');
    game.vfx.spawnDamageText(this.x, this.y - 140, 0, false, 'RUNE CHARGE!', '#38bdf8');
  }

  onStartDodge(enemy, game, dir) {
    // Check if an enemy projectile is approaching: if so and crouch is ready, brace behind Aegis Greatshield (CROUCH)!
    let hasIncomingProjectile = false;
    if (game && game.vfx) {
      for (const proj of game.vfx.projectiles) {
        if (proj.owner !== this && Math.abs(proj.x - this.x) < 220 && Math.sign(proj.vx) === Math.sign(this.x - proj.x)) {
          hasIncomingProjectile = true;
          break;
        }
      }
    }

    if (hasIncomingProjectile && this.crouchCooldown <= 0) {
      this.startCrouch(enemy, game);
      return;
    }

    // Otherwise execute the 30-frame Row 8 Valkyrie Aerial Vault & Mid-Air Frost Cleave (JUMP)!
    const smartDir = enemy && Math.abs(enemy.x - this.x) > 220 ? this.facing : dir;
    this.setState('JUMP');
    this.isInvulnerable = true;
    this.onStartJumpVault(enemy, game, smartDir);
  }

  updateDashOrDodge(dt, enemy, game) {
    const t = this.stateTimer;

    // Row 8 (30-frame JUMP — Valkyrie Aerial Vault & Mid-Air Downward Frost-Blade Cleave)
    if ((this.state === 'DODGE' || this.state === 'JUMP') && this.isFlipVault) {
      const u = Math.min(1, t / this.dashDuration);
      const airU = Math.max(0, Math.min(1, (u - 0.12) / 0.74));

      // Smooth horizontal glide with apex hang-time plateau during two-handed overhead Frost Cleave (airU = 0.32..0.68)
      const horizU =
        airU < 0.32
          ? (airU / 0.32) * 0.44
          : airU < 0.68
            ? 0.44 + ((airU - 0.32) / 0.36) * 0.28
            : 0.72 + ((airU - 0.68) / 0.32) * 0.28;
      this.x = this.flipStartX + (this.flipTargetX - this.flipStartX) * horizU;

      // Sleek 86px-high non-steep Valkyrie vault trajectory with mid-air apex plateau (matching Archer.js!)
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
      this.reflectNearbyProjectiles(game);

      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }

      if (airU > 0.05 && airU < 0.95 && Math.random() < 0.75) {
        game.vfx.spawnParticle({
          x: this.x + (Math.random() - 0.5) * 26,
          y: this.y - 72 + (Math.random() - 0.5) * 24,
          vx: -this.dashDir * 75,
          vy: 25,
          size: 5,
          color: Math.random() > 0.4 ? '#38bdf8' : '#fef08a',
          maxLife: 0.26
        });
      }

      // At Frame F13..F14 (u >= 0.44), Aethelgard unleashes his mid-air downward-angled Frost-Crescent Blade-Wave!
      if (u >= 0.44 && !this.didActionFrame && enemy && !enemy.isDead) {
        this.didActionFrame = true;
        if (game.audio) game.audio.play('blade_wave', this.x);
        const sx = this.x + this.facing * 44;
        const sy = this.y - 104;
        const dx = enemy.x - sx;
        const dy = (enemy.y - 92) - sy;
        const td = Math.hypot(dx, dy) || 1;
        game.vfx.spawnProjectile({
          x: sx,
          y: sy,
          vx: (dx / td) * 660,
          vy: (dy / td) * 660,
          radius: 18,
          color: '#38bdf8',
          coreColor: '#fef08a',
          owner: this,
          damage: 62,
          type: 'blade_wave'
        });
        const cleaveAng = Math.atan2(dy, dx);
        game.vfx.spawnSlash(sx, sy, 98, cleaveAng - 1.15, cleaveAng + 1.15, '#38bdf8', 0.28);
        game.vfx.spawnShockwave(sx, sy, 76, '#7dd3fc', 0.24, false, false);
        game.vfx.spawnGlyphBurst(sx, sy, 5, 'steel');

        if (Math.abs(enemy.x - this.x) <= 165) {
          enemy.takeDamage(54, this, true, 115, -90);
        }
      }

      if (t >= this.dashDuration) {
        this.y = this.groundY;
        this.vy = 0;
        this.isFlipVault = false;
        this.flipAngle = 0;
        this.isDeflecting = false;
        this.isInvulnerable = false;
        game.vfx.spawnShockwave(this.x, this.groundY, 84, '#38bdf8', 0.26, true);
        this.setState('IDLE');
      }
      return;
    }

    // Row 6 (30-frame DASH — Valkyrie Assault Charge)
    const speed = this.state === 'DASH' ? 485 : 360;
    this.x += this.dashDir * speed * dt;
    this.reflectNearbyProjectiles(game);

    if (Math.random() < 0.72) {
      game.vfx.spawnParticle({
        x: this.x - this.dashDir * 18,
        y: this.groundY - 12 - Math.random() * 65,
        vx: -this.dashDir * 110,
        vy: -30,
        size: 6,
        color: Math.random() > 0.4 ? '#38bdf8' : '#bae6fd',
        maxLife: 0.26
      });
    }

    // Valkyrie Charge Thunder-Bash impact when reaching the enemy
    if (
      this.state === 'DASH' &&
      !this.didActionFrame &&
      enemy &&
      !enemy.isDead &&
      Math.abs(enemy.x - this.x) <= 142
    ) {
      this.didActionFrame = true;
      enemy.takeDamage(52, this, false, 125, -80);
      if (game.audio) game.audio.play('heavy_cleave', enemy.x);
      game.vfx.spawnSlash(this.x + this.facing * 40, this.y - 95, 96, -1.2, 1.2, '#38bdf8', 0.26);
      game.vfx.spawnShockwave(enemy.x, enemy.y - 85, 95, '#38bdf8', 0.28);
      game.vfx.spawnLightning(enemy.x, this.groundY - 210, this.groundY, '#ffffff', '#38bdf8');
    }

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
    this.isCrouching = t < dur * 0.82;
    this.isDeflecting = this.isCrouching;

    if (t < 0.62) {
      this.reflectNearbyProjectiles(game);
    }

    // Frames F05..F12 (0.16s <= t < 0.42s): Bracing behind glowing Frost-Gold Aegis Greatshield
    if (t >= 0.16 && t < 0.42) {
      if (Math.random() < 0.7) {
        const a = t * 24;
        const shX = this.x + this.facing * 42;
        const shY = this.y - 88;
        game.vfx.spawnParticle({
          x: shX + Math.cos(a) * 20,
          y: shY + Math.sin(a) * 20,
          vx: -Math.cos(a) * 55,
          vy: -Math.sin(a) * 55,
          size: 4.5,
          color: Math.random() > 0.4 ? '#38bdf8' : '#fef08a',
          maxLife: 0.22
        });
      }
    } else if (t >= 0.42 && !this.didActionFrame) {
      // Frame F13 (t = 0.42s): Low horizontal Frost-Crescent Counter-Slash from behind Aegis Greatshield!
      this.didActionFrame = true;
      this.vx += this.facing * 95;
      if (game.audio) game.audio.play('blade_wave', this.x);

      const spawnX = this.x + this.facing * 48;
      const spawnY = this.y - 92;
      game.vfx.spawnProjectile({
        x: spawnX,
        y: spawnY,
        vx: this.facing * 655,
        vy: 0,
        radius: 19,
        color: '#38bdf8',
        coreColor: '#fef08a',
        owner: this,
        damage: 68,
        type: 'blade_wave'
      });

      const cAng = this.facing === 1 ? 0 : Math.PI;
      game.vfx.spawnSlash(spawnX, spawnY, 96, cAng - 1.15, cAng + 1.15, '#38bdf8', 0.26);
      game.vfx.spawnShockwave(spawnX, spawnY, 72, '#7dd3fc', 0.26, false, true);
      game.vfx.spawnGlyphBurst(spawnX, spawnY, 5, 'steel');

      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= this.attackRange + 45) {
        enemy.takeDamage(64, this, true, 110, -70);
      }
    }

    if (t >= dur) {
      this.isCrouching = false;
      this.isDeflecting = false;
      this.setState('IDLE');
    }
  }

  updateCustomVfx(dt) {
    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      this.afterimages[i].age += dt;
      if (this.afterimages[i].age >= this.afterimages[i].maxLife) {
        this.afterimages.splice(i, 1);
      }
    }
    for (let i = this.runeBlinkPillars.length - 1; i >= 0; i--) {
      this.runeBlinkPillars[i].age += dt;
      if (this.runeBlinkPillars[i].age >= this.runeBlinkPillars[i].maxLife) {
        this.runeBlinkPillars.splice(i, 1);
      }
    }
    for (let i = this.activeVfxAnims.length - 1; i >= 0; i--) {
      const v = this.activeVfxAnims[i];
      v.age += dt;
      v.x += v.vx * dt;
      v.y += v.vy * dt;
      if (v.age >= v.maxLife) {
        this.activeVfxAnims.splice(i, 1);
      }
    }
    for (let i = this.slashBeams.length - 1; i >= 0; i--) {
      this.slashBeams[i].age += dt;
      if (this.slashBeams[i].age >= this.slashBeams[i].maxLife) {
        this.slashBeams.splice(i, 1);
      }
    }
  }

  update(dt, enemy, game) {
    this.crouchCooldown = Math.max(0, this.crouchCooldown - dt);
    this.vaultCooldown = Math.max(0, this.vaultCooldown - dt);
    this.updateCustomVfx(dt);

    if (!this.isDead && this.state === 'WALK') {
      this.stepDustTimer += dt;
      if (this.stepDustTimer >= 0.32) {
        this.stepDustTimer = 0;
        if (game.audio) game.audio.play('footstep_steel', this.x);
        game.vfx.spawnBurst(this.x - this.facing * 14, this.groundY - 2, 4, '#7dd3fc', 65, {
          upBias: 28,
          size: 4,
          life: 0.34,
          additive: true
        });
      }
    }

    if (enemy && !enemy.isDead && (this.state === 'IDLE' || this.state === 'WALK')) {
      const dist = Math.abs(enemy.x - this.x);

      // 1. Defensive Aegis Crouch & Frost-Crescent Counter-Slash when enemy projectiles approach or at mid-range (185..340px)
      let projectileApproaching = false;
      if (game && game.vfx) {
        for (const proj of game.vfx.projectiles) {
          if (proj.owner !== this && Math.abs(proj.x - this.x) < 235 && Math.sign(proj.vx) === Math.sign(this.x - proj.x)) {
            projectileApproaching = true;
            break;
          }
        }
      }
      if (
        this.crouchCooldown <= 0 &&
        (projectileApproaching || (dist >= 195 && dist <= 340 && this.autoCooldown > 0.25 && Math.random() < 0.04))
      ) {
        this.startCrouch(enemy, game);
        return;
      }

      // 2. Runic Aerial Vault (Row 8 JUMP) to close mid-far distance (250..410px) with an aerial Frost-Crescent cleave!
      if (
        dist >= 250 &&
        dist <= 410 &&
        this.vaultCooldown <= 0 &&
        this.dodgeCooldown <= 0 &&
        this.skillCooldown > 0.6
      ) {
        this.startJump(enemy, game, this.facing);
        return;
      }
    }

    super.update(dt, enemy, game);
  }

  updateAutoAttack(dt, enemy, game) {
    const t = this.stateTimer;
    const mode = this.comboStep % 3;

    if (t < 0.32) {
      // Row 2 Frames F00..F09: Progressive overhead/back-shoulder windup + frost-gold rune charge
      this.torsoAngle = -this.facing * 0.24 * (t / 0.32);
      if (Math.random() < 0.55) {
        game.vfx.spawnParticle({
          x: this.x - this.facing * 18 + (Math.random() - 0.5) * 26,
          y: this.y - 105 + (Math.random() - 0.5) * 26,
          vx: this.facing * 45,
          vy: -75,
          size: 5,
          color: mode === 2 ? '#e0f2fe' : '#7dd3fc',
          maxLife: 0.26
        });
      }
    } else if (t < 0.68) {
      // Row 2 Frames F10..F18: Explosive forward Runeblade cleave & Frost-Crescent slash arc
      if (!this.didActionFrame) {
        this.didActionFrame = true;
        this.comboStep++;
        this.vx += this.facing * 165;
        this.torsoVel = this.facing * 13;

        const cx = this.x + this.facing * 42;
        const cy = this.y - 96;
        const startA = this.facing === 1 ? -1.65 : Math.PI - 0.95;
        const endA = this.facing === 1 ? 1.05 : Math.PI + 1.65;

        if (mode === 2) {
          // Combo Finisher (Strike 3): Launches a Ranged Glacial Crescent Sword-Wave across the arena!
          if (game.audio) game.audio.play('blade_wave', this.x);
          game.vfx.spawnDamageText(this.x, this.y - 145, 0, false, 'FROST CRESCENT!', '#38bdf8');
          game.vfx.spawnProjectile({
            x: this.x + this.facing * 54,
            y: this.y - 106,
            vx: this.facing * 635,
            vy: 0,
            radius: 20,
            color: '#38bdf8',
            coreColor: '#e0f2fe',
            owner: this,
            damage: 66,
            type: 'blade_wave'
          });
          game.vfx.spawnShockwave(cx, cy, 82, '#7dd3fc', 0.26, false, true);
        } else {
          if (game.audio) game.audio.play(mode === 1 ? 'heavy_cleave' : 'slash', this.x);
        }

        game.vfx.spawnSlash(cx, cy, 114, startA, endA, '#0284c7', 0.32);
        game.vfx.spawnSlash(cx, cy, 96, startA, endA, '#38bdf8', 0.26);
        game.vfx.spawnSlash(cx, cy, 78, startA, endA, '#e0f2fe', 0.2);
        game.vfx.spawnShockwave(cx, this.groundY, 96, '#38bdf8', 0.28, true);
        game.vfx.spawnGlyphBurst(cx, cy, 5, 'steel');

        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= this.attackRange + 50) {
          const isCrit = mode === 2 || Math.random() < 0.25;
          const dmg = mode === 2 ? 78 : mode === 1 ? 66 : 59;
          enemy.takeDamage(dmg, this, isCrit, 115, mode === 2 ? -130 : 0);
          if (game.audio) game.audio.play(isCrit ? 'hit_crit' : 'clang', enemy.x);
          if (game.renderer) game.renderer.triggerHitStop(0.06);
          game.vfx.spawnBurst(enemy.x, enemy.y - 95, 14, '#bae6fd', 230);
          game.vfx.spawnGlyphBurst(enemy.x, enemy.y - 95, 5, 'steel');
          if (isCrit || mode === 1) {
            game.vfx.spawnLightning(enemy.x, -140, this.groundY, '#ffffff', '#38bdf8');
            game.vfx.spawnShockwave(enemy.x, enemy.y - 85, 95, '#7dd3fc', 0.28);
          }
        }
      }
    } else if (t >= 0.96) {
      this.setState('IDLE');
    }
  }

  updateSkill(dt, enemy, game) {
    // RUNE KNIGHT SKILL: "TEMPEST VANGUARD" (Synced 1:1 to Row 3 F00..F29 across skillDuration = 1.04s)
    // Phase 0 (0.00s - 0.104s -> F00..F02): Grounded Elder-Rune Windup Coil
    // Phase 1 (0.104s - 0.624s -> F03..F17): 2.5-Revolution 360° Whirlwind Spin-Slash Rush + Spell Reflection!
    // Phase 2 (0.624s - 1.040s -> F18..F29): Leaping Thunder-Breaker Overhead Runeblade Slam + Glacial Spires!
    const t = this.stateTimer;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    this.isDeflecting = t >= 0.08 && t <= 0.86;
    if (t >= 0.08 && t <= 0.64) {
      this.reflectNearbyProjectiles(game);
    }

    if (t < 0.104) {
      this.didSlamFinisher = false;
      this.reflectedInSkill = false;
      this.spinHitStep = 0;
      this.afterimageAccum = 0;
      this.vx = 0;
      this.y = this.groundY;
      this.torsoAngle = -this.facing * 0.18;
      return;
    }

    // Phase 1 (F03..F17): Multi-Revolution 360° Runic Cyclone Spin-Slash!
    if (t < 0.624) {
      this.y = this.groundY;
      if (!this.didActionFrame) {
        this.didActionFrame = true;
        if (game.audio) game.audio.play('whirlwind', this.x);
        game.vfx.spawnDamageText(this.x, this.y - 148, 0, false, 'CYCLONE SLASH!', '#38bdf8');
        game.vfx.spawnGlyphBurst(this.x, this.y - 95, 8, 'steel');
        game.vfx.spawnSlash(this.x, this.y - 96, 128, 0, Math.PI * 2, '#38bdf8', 0.28);
        game.vfx.spawnShockwave(this.x, this.groundY, 138, '#38bdf8', 0.32, true);
      }

      // Spin angle tracks the exact 2.5 full revolutions across 0.52s
      const spinU = (t - 0.104) / 0.52;
      this.spinAngle = spinU * Math.PI * 5.0;

      if (enemy && !enemy.isDead) {
        const dx = enemy.x - this.x;
        const distToEnemy = Math.abs(dx);
        if (distToEnemy > 26) {
          this.facing = dx >= 0 ? 1 : -1;
        }
        const rushSpeed = distToEnemy > 88 ? 445 : 125;
        this.x = Math.max(85, Math.min(ww - 85, this.x + this.facing * rushSpeed * dt));
      } else {
        this.x = Math.max(85, Math.min(ww - 85, this.x + this.facing * 260 * dt));
      }

      // Crisp 30fps spinning Rune-Knight afterimage ribbon
      this.afterimageAccum += dt;
      if (this.afterimageAccum >= 0.044) {
        this.afterimageAccum = 0;
        const col = Math.min(17, Math.max(3, Math.floor((t / this.skillDuration) * 30)));
        this.spawnAfterimage(this.x, this.y, this.facing, 3, col, 0.24);
      }

      // 3 distinct 360° Whirlwind Cleave Hits (at 0.14s, 0.31s, 0.48s) that pull enemies inward!
      const hitTimes = [0.14, 0.31, 0.48];
      if (this.spinHitStep < 3 && t >= hitTimes[this.spinHitStep]) {
        this.spinHitStep++;
        game.vfx.spawnSlash(this.x, this.y - 90, 118, 0, Math.PI * 2, '#38bdf8', 0.22);
        game.vfx.spawnSlash(this.x, this.y - 112, 92, 0, Math.PI * 2, '#e0f2fe', 0.18);
        game.vfx.spawnShockwave(this.x, this.groundY - 4, 112, '#7dd3fc', 0.22, true);
        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 148) {
          // Gently pull foe inward toward the cyclone eye so all 3 spin slashes + slam connect!
          enemy.takeDamage(18, this, false, -35, -24);
          if (game.audio) game.audio.play('clang', enemy.x);
          game.vfx.spawnGlyphBurst(enemy.x, enemy.y - 92, 4, 'steel');
        }
      }
      return;
    }

    // Phase 2A (0.624s - 0.695s -> F18..F19): Short Thunder-Hop raising Runeblade overhead!
    if (t < 0.695) {
      const hopU = (t - 0.624) / 0.071;
      this.y = this.groundY - Math.sin(hopU * Math.PI) * 38;
      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }
      return;
    }

    // Phase 2B (t >= 0.695s -> F20..F29): Thunder-Breaker Overhead Greatsword Slam + Glacial Spires!
    this.y = this.groundY;
    if (!this.didSlamFinisher) {
      this.didSlamFinisher = true;
      if (game.audio) game.audio.play('thunder_slam', this.x);
      game.renderer.triggerShake(15, 0.32);
      game.renderer.triggerHitStop(0.055);

      const slamX = this.x + this.facing * 52;
      this.spawnVfxAnim(4, slamX, this.groundY - 96, 212, 212, 0.34, {
        flipX: this.facing < 0,
        foreground: true
      });
      game.vfx.spawnLightning(slamX, -220, this.groundY, '#ffffff', '#38bdf8');
      game.vfx.spawnShockwave(slamX, this.groundY, 198, '#38bdf8', 0.42, true);
      game.vfx.spawnShockwave(slamX, this.groundY - 40, 145, '#7dd3fc', 0.34, false);
      game.vfx.spawnDecal(slamX, 120, 'fissure', '#38bdf8', 4.5);
      game.vfx.spawnBurst(slamX, this.groundY - 12, 20, '#38bdf8', 290, { upBias: 140, size: 7 });

      const targetX = enemy ? enemy.x : slamX + this.facing * 120;
      [-55, 0, 55].forEach((off, idx) => {
        game.vfx.spawnCrystalSpike({
          x: targetX + off,
          groundY: this.groundY,
          height: idx === 1 ? 138 : 102,
          width: idx === 1 ? 38 : 30,
          tilt: (off / 55) * 0.25,
          color: '#38bdf8',
          coreColor: '#e0f2fe',
          owner: this,
          target: enemy,
          damage: 15,
          delay: idx * 0.04,
          maxLife: 0.78
        });
      });

      if (enemy && !enemy.isDead && Math.abs(enemy.x - slamX) < 198) {
        enemy.takeDamage(46, this, true, 135, -155);
      }
    } else if (t >= this.skillDuration) {
      this.isDeflecting = false;
      this.spinHitStep = 0;
      this.y = this.groundY;
      this.setState('IDLE');
    }
  }

  updateUltimate(dt, enemy, game) {
    // RUNE KNIGHT ULTIMATE ART: "HEAVENLY EARTHSHATTER" (ultDuration = 1.86s, Row 4 F00..F29)
    // Stage 0 (0.000s - 0.186s, F00..F02): Elder-Rune Domain Ignition & Blink Coil
    // Stage 1 (0.186s - 0.496s, F03..F07): Teleport LEFT of enemy -> Wide Horizontal Runeblade Cleave!
    // Stage 2 (0.496s - 0.806s, F08..F12): Teleport RIGHT of enemy -> Reverse Rising Cross-Slash!
    // Stage 3 (0.806s - 1.054s, F13..F16): Teleport LEFT Flank -> Heavy Launching Runic Slash!
    // Stage 4 (1.054s - 1.364s, F17..F21): Teleport DIRECTLY ABOVE (TOP) -> Skyward Elder-Rune Charge!
    // Stage 5 (1.364s - 1.860s, F22..F29): Meteoric Top-Down Vertical Slash Plunge & 11-Spire Earthshatter!
    const t = this.stateTimer;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const clampX = (xv) => Math.max(95, Math.min(ww - 95, xv));
    this.isInvulnerable = true;
    this.isFlipVault = false;
    this.vx = 0;
    this.vy = 0;

    if (!this._ultInit) {
      this._ultInit = true;
      this.ultSlashStep = 0;
      this.ultPlungeAfterimageStep = 0;
      this.ultStartX = this.x;
      this._ultTargetX = enemy ? enemy.x : clampX(this.x + this.facing * 200);
      this.isOmnislashing = true;
      // Ignite Grand Winged Runic Crest behind target!
      this.spawnVfxAnim(3, this._ultTargetX, this.groundY - 96, 228, 228, 1.48, {
        foreground: false
      });
      this.spawnRuneBlinkPillar(this.x, this.groundY, 0.36, 178, false);
      game.vfx.spawnShockwave(this.x, this.groundY, 145, '#38bdf8', 0.34, true);
      game.vfx.spawnGlyphBurst(this.x, this.groundY - 84, 8, 'steel');
    }

    if (enemy && !enemy.isDead) {
      this._ultTargetX = enemy.x;
    }
    const targetX = this._ultTargetX !== undefined ? this._ultTargetX : ww * 0.5;

    // STAGE 0 (0.000s - 0.186s, F00..F02): Grounded Elder-Rune Awakening
    if (t < 0.186) {
      this.y = this.groundY;
      this.facing = targetX >= this.x ? 1 : -1;
      return;
    }

    // STAGE 1 (0.186s - 0.496s, F03..F07): TELEPORT LEFT -> Wide Horizontal Cleave!
    if (t < 0.496) {
      this.y = this.groundY;
      const leftBaseX = clampX(targetX - 118);
      if (this.ultSlashStep < 1) {
        this.ultSlashStep = 1;
        this.spawnAfterimage(this.x, this.y, this.facing, 4, 2, 0.32);
        this.spawnRuneBlinkPillar(this.x, this.groundY, 0.32, 184, false);
        this.x = leftBaseX;
        this.facing = targetX >= this.x ? 1 : -1;
        this.dashDir = this.facing;
        this.spawnRuneBlinkPillar(this.x, this.groundY, 0.34, 184, false);
        if (game.audio) game.audio.play('storm_leap', this.x);
      }

      // Lunge slightly inward across F04..F06 & unleash Left Horizontal Slash!
      const u = Math.min(1, Math.max(0, (t - 0.22) / 0.16));
      this.x = clampX(leftBaseX + this.facing * 26 * u);
      if (t >= 0.27 && this.ultSlashStep < 2) {
        this.ultSlashStep = 2;
        this.spawnAfterimage(leftBaseX, this.groundY, this.facing, 4, 5, 0.38);
        this.spawnSlashBeam(targetX - 125, this.groundY - 124, targetX + 125, this.groundY - 76, 0.42);
        this.spawnVfxAnim(4, targetX, this.groundY - 98, 208, 208, 0.30, {
          flipX: false,
          foreground: true
        });
        if (game.audio) game.audio.play('slash', targetX);
        game.renderer.triggerShake(10, 0.14);
        game.vfx.spawnSlash(targetX, this.groundY - 100, 122, -0.95, 0.85, '#38bdf8', 0.30);
        game.vfx.spawnBurst(targetX, this.groundY - 100, 16, '#38bdf8', 290);
        game.vfx.spawnDamageText(targetX, this.groundY - 162, 0, false, 'RUNE BLINK: LEFT!', '#7dd3fc');
        if (enemy && !enemy.isDead) {
          enemy.takeDamage(30, this, false, 18, -32);
        }
      }
      return;
    }

    // STAGE 2 (0.496s - 0.806s, F08..F12): TELEPORT RIGHT -> Reverse Rising Cross-Slash!
    if (t < 0.806) {
      this.y = this.groundY;
      const rightBaseX = clampX(targetX + 118);
      if (this.ultSlashStep < 3) {
        this.ultSlashStep = 3;
        this.spawnAfterimage(this.x, this.y, this.facing, 4, 7, 0.34);
        this.spawnRuneBlinkPillar(this.x, this.groundY, 0.32, 184, false);
        this.x = rightBaseX;
        this.facing = targetX <= this.x ? -1 : 1;
        this.dashDir = this.facing;
        this.spawnRuneBlinkPillar(this.x, this.groundY, 0.34, 184, false);
        if (game.audio) game.audio.play('storm_leap', this.x);
      }

      const u = Math.min(1, Math.max(0, (t - 0.54) / 0.16));
      this.x = clampX(rightBaseX + this.facing * 26 * u);
      if (t >= 0.59 && this.ultSlashStep < 4) {
        this.ultSlashStep = 4;
        this.spawnAfterimage(rightBaseX, this.groundY, this.facing, 4, 10, 0.38);
        this.spawnSlashBeam(targetX + 126, this.groundY - 68, targetX - 126, this.groundY - 142, 0.42);
        this.spawnVfxAnim(4, targetX, this.groundY - 104, 212, 212, 0.30, {
          flipX: true,
          foreground: true
        });
        if (game.audio) game.audio.play('heavy_cleave', targetX);
        game.renderer.triggerShake(12, 0.16);
        game.vfx.spawnSlash(targetX, this.groundY - 106, 128, Math.PI - 0.9, Math.PI + 0.95, '#7dd3fc', 0.32);
        game.vfx.spawnBurst(targetX, this.groundY - 106, 18, '#e0f2fe', 310);
        game.vfx.spawnDamageText(targetX, this.groundY - 168, 0, false, 'RUNE BLINK: RIGHT!', '#38bdf8');
        if (enemy && !enemy.isDead) {
          enemy.takeDamage(32, this, true, -18, -48);
        }
      }
      return;
    }

    // STAGE 3 (0.806s - 1.054s, F13..F16): TELEPORT FLANK -> Heavy Launching Cross-Slash!
    if (t < 1.054) {
      this.y = this.groundY;
      const flankBaseX = clampX(targetX - 112);
      if (this.ultSlashStep < 5) {
        this.ultSlashStep = 5;
        this.spawnAfterimage(this.x, this.y, this.facing, 4, 12, 0.34);
        this.spawnRuneBlinkPillar(this.x, this.groundY, 0.32, 184, false);
        this.x = flankBaseX;
        this.facing = targetX >= this.x ? 1 : -1;
        this.dashDir = this.facing;
        this.spawnRuneBlinkPillar(this.x, this.groundY, 0.34, 184, false);
      }

      const u = Math.min(1, Math.max(0, (t - 0.84) / 0.14));
      this.x = clampX(flankBaseX + this.facing * 28 * u);
      if (t >= 0.89 && this.ultSlashStep < 6) {
        this.ultSlashStep = 6;
        this.spawnAfterimage(flankBaseX, this.groundY, this.facing, 4, 15, 0.38);
        this.spawnSlashBeam(targetX - 118, this.groundY - 64, targetX + 118, this.groundY - 148, 0.42);
        if (game.audio) game.audio.play('slash', targetX);
        game.renderer.triggerShake(13, 0.16);
        game.vfx.spawnSlash(targetX, this.groundY - 104, 136, -1.35, 1.35, '#38bdf8', 0.34);
        game.vfx.spawnShockwave(targetX, this.groundY - 102, 125, '#38bdf8', 0.28, false, true);
        game.vfx.spawnGlyphBurst(targetX, this.groundY - 102, 8, 'steel');
        game.vfx.spawnDamageText(targetX, this.groundY - 172, 0, false, 'RUNIC LAUNCH!', '#fef08a');
        if (enemy && !enemy.isDead) {
          enemy.takeDamage(34, this, true, 12, -165);
        }
      }
      return;
    }

    // STAGE 4 (1.054s - 1.364s, F17..F21): TELEPORT DIRECTLY ABOVE (TOP!) & Skyward Elder-Rune Charge!
    if (t < 1.364) {
      const hoverU = (t - 1.054) / 0.31;
      const apexX = clampX(targetX - this.facing * 26);
      const apexY = this.groundY - 214 - Math.sin(hoverU * Math.PI * 0.5) * 12;

      if (this.ultSlashStep < 7) {
        this.ultSlashStep = 7;
        // Departure flash on floor + Arrival Sky-Gate Rune Halo 220px directly above enemy!
        this.spawnAfterimage(this.x, this.groundY, this.facing, 4, 15, 0.34);
        this.spawnRuneBlinkPillar(this.x, this.groundY, 0.36, 210, false);
        this.facing = targetX >= apexX ? 1 : -1;
        this.x = apexX;
        this.y = apexY;
        this.spawnRuneBlinkPillar(this.x, this.y, 0.42, 165, true);
        this.spawnVfxAnim(3, this.x, this.y - 86, 220, 220, 0.42, {
          foreground: false
        });
        if (game.audio) game.audio.play('storm_leap', this.x);
        game.vfx.spawnLightning(this.x, this.y - 160, this.groundY, '#ffffff', '#38bdf8');
        game.vfx.spawnShockwave(this.x, this.y - 78, 136, '#7dd3fc', 0.32, false);
        game.vfx.spawnDamageText(this.x, this.y - 148, 0, true, '★ HEAVENLY RUNE SLASH! ★', '#fef08a');
      }

      this.x = apexX;
      this.y = apexY;
      if (Math.random() < 0.85) {
        game.vfx.spawnParticle({
          x: this.x + (Math.random() - 0.5) * 56,
          y: this.y - 96 + (Math.random() - 0.5) * 42,
          vx: (Math.random() - 0.5) * 65,
          vy: -65,
          size: 6,
          color: Math.random() > 0.4 ? '#38bdf8' : '#fef08a',
          maxLife: 0.26
        });
      }
      return;
    }

    // STAGE 5A (1.364s - 1.488s, F22..F23): METEORIC TOP-DOWN VERTICAL SLASH PLUNGE!
    if (t < 1.488) {
      const diveU = Math.min(1, Math.max(0, (t - 1.364) / 0.124));
      const easeIn = diveU * diveU;
      const apexX = clampX(targetX - this.facing * 26);
      this.x = apexX;
      this.y = (this.groundY - 226) + 226 * easeIn;

      // Spawn a vertical column of 4 crisp downward-slashing Rune-Knight afterimages!
      const wantStep = Math.floor(diveU * 4) + 1;
      if (this.ultPlungeAfterimageStep < wantStep) {
        this.ultPlungeAfterimageStep = wantStep;
        this.spawnAfterimage(this.x, this.y, this.facing, 4, 23, 0.36);
        if (wantStep === 1) {
          this.spawnSlashBeam(targetX, this.groundY - 290, targetX, this.groundY - 8, 0.48);
        }
      }
      return;
    }

    // STAGE 5B (1.488s - 1.860s, F24..F29): EARTHSHATTER IMPACT — 11 Glacial Spires + Heavenly Runeblade + Twin Blade Waves!
    this.y = this.groundY;
    this.isOmnislashing = false;

    if (!this.didActionFrame) {
      this.didActionFrame = true;
      if (game.audio) game.audio.play('earthshatter', this.x);

      game.renderer.triggerShake(28, 0.65);
      game.renderer.triggerAberration(16);
      game.renderer.triggerHitStop(0.095);

      const slamX = this.x + this.facing * 44;
      const startA = this.facing === 1 ? -1.65 : Math.PI - 1.45;
      const endA = this.facing === 1 ? 1.45 : Math.PI + 1.65;
      game.vfx.spawnSlash(slamX, this.groundY - 92, 155, startA, endA, '#38bdf8', 0.42);
      game.vfx.spawnSlash(slamX, this.groundY - 92, 125, startA, endA, '#7dd3fc', 0.35);

      // 1. Full-Arena Chaining Glacial Frost-Crystal Spire Wave (11 Tectonic Spires erupting outward!)
      const dir = this.facing;
      for (let i = 0; i < 11; i++) {
        const spikeX = slamX + dir * (28 + i * 58);
        game.vfx.spawnCrystalSpike({
          x: spikeX,
          groundY: this.groundY,
          height: 124 + (i % 2 === 0 ? 52 : 22),
          width: 38 + (i % 2) * 8,
          tilt: dir * (0.34 + i * 0.045),
          color: i % 3 === 0 ? '#7dd3fc' : '#38bdf8',
          coreColor: '#ffffff',
          owner: this,
          target: enemy,
          damage: 15,
          delay: i * 0.038,
          maxLife: 0.96,
          isUltimate: true
        });
      }

      // 1B. Colossal Heavenly Runeblade Sky-Strike cleaving straight down onto targetX!
      game.vfx.spawnSkyStrike({
        x: targetX,
        y: -220,
        groundY: this.groundY,
        vx: 0,
        vy: 1750,
        type: 'runeblade',
        color: '#38bdf8',
        coreColor: '#ffffff',
        owner: this,
        target: enemy,
        damage: 0,
        delay: 0.01,
        maxLinger: 0.65,
        isUltimate: true
      });

      // 2. Twin Horizontal Piercing Frost-Crescent Blade Waves tearing across the stone!
      [0, 1].forEach((idx) => {
        game.vfx.spawnProjectile({
          x: slamX + dir * (idx * 34),
          y: this.groundY - 98 - idx * 24,
          vx: dir * (740 - idx * 80),
          vy: 0,
          radius: 22 - idx * 3,
          color: idx === 0 ? '#38bdf8' : '#7dd3fc',
          coreColor: '#ffffff',
          owner: this,
          damage: 25,
          type: 'blade_wave',
          isMeteor: false,
          isUltimate: true
        });
      });

      game.vfx.spawnShockwave(slamX, this.groundY, 340, '#38bdf8', 0.62, true);
      game.vfx.spawnShockwave(targetX, this.groundY, 260, '#7dd3fc', 0.52, true);
      game.vfx.spawnDecal(slamX, 210, 'fissure', '#38bdf8', 6.5);
      game.vfx.spawnDecal(targetX, 185, 'fissure', '#38bdf8', 6.0);
      game.vfx.spawnBurst(slamX, this.groundY - 20, 36, '#38bdf8', 410, { upBias: 185, size: 9 });
      game.vfx.spawnBurst(targetX, this.groundY - 20, 28, '#e0f2fe', 350, { upBias: 145, size: 8 });
      game.vfx.spawnGlyphBurst(slamX, this.groundY - 75, 12, 'steel');

      if (enemy && !enemy.isDead) {
        enemy.takeDamage(132, this, true, 220, -320);
      }
    } else if (t >= this.ultDuration) {
      this._ultInit = false;
      this.isOmnislashing = false;
      this.isInvulnerable = false;
      this.y = this.groundY;
      this.setState('IDLE');
    }
  }

  drawPixelRuneDomain4x4(ctx) {
    if (this.state !== 'ULTIMATE') return;
    const snap4 = (v) => Math.round(v / 4) * 4;
    const cx = this._ultTargetX !== undefined ? this._ultTargetX : this.x;
    const gy = this.groundY - 4;
    const phase = this.stateTimer * 7.5;
    const rx = 148;
    const ry = 18;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < 44; i++) {
      const ang = (i / 44) * Math.PI * 2 + phase;
      const px = snap4(cx + Math.cos(ang) * rx);
      const py = snap4(gy + Math.sin(ang) * ry);
      ctx.globalAlpha = 0.76;
      ctx.fillStyle = i % 4 === 0 ? '#ffffff' : i % 2 === 0 ? '#38bdf8' : '#facc15';
      ctx.fillRect(px - 2, py - 2, 4, 4);
    }

    for (let d = 0; d < 8; d++) {
      const da = (d / 8) * Math.PI * 2 - phase * 1.15;
      const dx = snap4(cx + Math.cos(da) * rx);
      const dy = snap4(gy + Math.sin(da) * ry);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(dx - 4, dy - 4, 8, 8);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(dx - 2, dy - 2, 4, 4);

      const moteY = snap4(gy - ((this.stateTimer * 150 + d * 26) % 130));
      ctx.globalAlpha = 0.65;
      ctx.fillStyle = d % 2 === 0 ? '#7dd3fc' : '#fef08a';
      ctx.fillRect(dx - 2, moteY - 2, 4, 4);
    }
    ctx.restore();
  }

  drawPixelBlinkPillar4x4(ctx, p) {
    const snap4 = (v) => Math.round(v / 4) * 4;
    const u = Math.min(1, p.age / p.maxLife);
    const fade = 1 - u;
    const cx = snap4(p.x);
    const baseY = snap4(p.y);
    const halfW = Math.max(4, snap4(34 * (1 - u * 0.65)));

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // Elliptical Elder-Rune Gate Ring at base/sky arrival point
    const ringRx = snap4(42 + u * 26);
    const ringRy = p.isSky ? 12 : 9;
    const ringY = p.isSky ? baseY - 78 : baseY - 4;
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2 + u * 5.0;
      const rx = snap4(cx + Math.cos(a) * ringRx);
      const ry = snap4(ringY + Math.sin(a) * ringRy);
      ctx.globalAlpha = fade * 0.85;
      ctx.fillStyle = i % 3 === 0 ? '#ffffff' : i % 2 === 0 ? '#38bdf8' : '#facc15';
      ctx.fillRect(rx - 2, ry - 2, 4, 4);
    }

    // Stepped 4x4 Vertical Cyan-White Rune-Blink Light Column
    const colH = snap4(p.height * (0.65 + 0.35 * (1 - u)));
    const topY = baseY - colH;
    ctx.globalAlpha = fade * 0.36;
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(cx - halfW, topY, halfW * 2, colH);
    ctx.globalAlpha = fade * 0.68;
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(cx - Math.max(4, snap4(halfW * 0.5)), topY, Math.max(8, snap4(halfW * 0.5) * 2), colH);
    ctx.globalAlpha = fade * 0.92;
    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(cx - 4, topY, 8, colH);

    ctx.restore();
  }

  drawPixelCycloneVortex4x4(ctx) {
    if (this.state !== 'SKILL') return;
    const t = this.stateTimer;
    if (t < 0.104 || t >= 0.624) return;

    const snap4 = (v) => Math.round(v / 4) * 4;
    const cx = this.x;
    const cy = this.y - 84;
    const spinA = ((t - 0.104) / 0.52) * Math.PI * 5.0;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const layer of [
      { rx: 108, ry: 24, dy: 8, off: 0 },
      { rx: 84, ry: 18, dy: -16, off: 2.1 }
    ]) {
      for (let i = 0; i < 36; i++) {
        const a = (i / 36) * Math.PI * 2;
        const rel = (((spinA + layer.off - a) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        if (rel > 4.4) continue;
        const wake = 1 - rel / 4.4;
        const px = snap4(cx + Math.cos(a) * layer.rx);
        const py = snap4(cy + layer.dy + Math.sin(a) * layer.ry);
        ctx.globalAlpha = wake * 0.78;
        ctx.fillStyle = wake > 0.72 ? '#ffffff' : wake > 0.38 ? '#38bdf8' : '#facc15';
        const sz = wake > 0.6 ? 8 : 4;
        ctx.fillRect(px - sz * 0.5, py - 2, sz, 4);
      }
    }
    ctx.restore();
  }

  drawPixelSlashBeam4x4(ctx, beam) {
    const snap4 = (v) => Math.round(v / 4) * 4;
    const u = Math.min(1, beam.age / beam.maxLife);
    const fade = 1 - u;
    const steps = 28;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i <= steps; i++) {
      const s = i / steps;
      const env = Math.sin(s * Math.PI);
      const px = snap4(beam.x1 + (beam.x2 - beam.x1) * s);
      const py = snap4(beam.y1 + (beam.y2 - beam.y1) * s);
      ctx.globalAlpha = fade * (0.45 + 0.5 * env);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(px - 6, py - 6, 12, 12);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px - 2, py - 2, 4, 4);
    }
    ctx.restore();
  }

  drawVfxCell(ctx, vfxSheet, v) {
    const u = Math.min(1, Math.max(0, v.age / v.maxLife));
    const span = Math.max(1, v.endFrame - v.startFrame + 1);
    const col = Math.min(29, v.startFrame + Math.floor(u * span));
    const fade = u < 0.12 ? u / 0.12 : u > 0.78 ? (1 - u) / 0.22 : 1.0;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(v.x), Math.round(v.y));
    if (v.flipX) ctx.scale(-1, 1);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.max(0, fade * 0.9);
    ctx.drawImage(vfxSheet, col * 208, v.row * 208, 208, 208, -v.w * 0.5, -v.h * 0.5, v.w, v.h);
    ctx.restore();
  }

  drawForegroundOverlay(ctx) {
    const sprites = PixelForge.initAssets().warrior;
    const vfxSheet = sprites?.vfx;

    // 1. Elder-Rune Ground Domain Circle during ULTIMATE
    this.drawPixelRuneDomain4x4(ctx);

    // 2. Elder-Rune Teleportation Departure & Arrival Pillars
    for (const p of this.runeBlinkPillars) {
      this.drawPixelBlinkPillar4x4(ctx, p);
    }

    // 3. Crisp Un-Rotated Pixel-Art Rune-Knight Afterimages (Skill Spin + Ult Left/Right/Top Plunge!)
    if (this.afterimages.length > 0 && sprites && sprites.sheet && sprites.sheet.complete) {
      for (const img of this.afterimages) {
        const alpha = Math.max(0, (1 - img.age / img.maxLife) * 0.58);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(Math.round(img.x / 4) * 4, Math.round((img.y + 4) / 4) * 4);
        ctx.scale(img.facing, 1);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha;
        PixelForge.drawAfterimageFrame(ctx, sprites, img.frameIdx, 208, 208);
        ctx.restore();
      }
    }

    // 4. Midground 30fps warrior_vfx cells (e.g. Row 3 Winged Runic Crest Mandala)
    if (this.activeVfxAnims.length > 0 && vfxSheet && vfxSheet.complete) {
      for (const v of this.activeVfxAnims) {
        if (!v.foreground) {
          this.drawVfxCell(ctx, vfxSheet, v);
        }
      }
    }
  }

  drawUltimateForeground(ctx) {
    const sprites = PixelForge.initAssets().warrior;
    const vfxSheet = sprites?.vfx;

    // 1. Real-Time 4x4 Pixel 360° Cyclone Blade-Rings during SKILL Whirlwind Rush
    this.drawPixelCycloneVortex4x4(ctx);

    // 2. Foreground 30fps warrior_vfx cells (Row 4 Crescent Cleave Impacts)
    if (this.activeVfxAnims.length > 0 && vfxSheet && vfxSheet.complete) {
      for (const v of this.activeVfxAnims) {
        if (v.foreground) {
          this.drawVfxCell(ctx, vfxSheet, v);
        }
      }
    }

    // 3. Stepped 4x4 Pixel Omnislash & Top-Down Judgment Slash Beams
    for (const beam of this.slashBeams) {
      this.drawPixelSlashBeam4x4(ctx, beam);
    }
  }

  draw(ctx, isReflection = false, renderer = null) {
    const sprites = PixelForge.initAssets().warrior;
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const w = 208;
    const h = 208;
    const frameIdx = PixelForge.getFrameIndex(this, this.walkPhase);

    const groundPlantOffset = 4;
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
