import { Fighter } from './Fighter.js';
import { PixelForge } from '../engine/PixelForge.js';

export class Warrior extends Fighter {
  constructor(x, groundY, facing = 1) {
    super({
      name: 'Aethelgard',
      x,
      groundY,
      facing,
      maxHp: 1290,
      attackRange: 152,
      moveSpeed: 162,
      autoInterval: 1.24,
      lightColor: 'rgba(56, 189, 248, 1)',
      primaryColor: '#38bdf8'
    });
    this.heroId = 'warrior';
    this.theme = 'steel';
    this.deathSfx = 'death_warrior';
    this.hasPoise = true; // Runic Juggernaut Poise resists ranged knockback/hitstun
    this.skillMaxCooldown = 5.1;
    this.skillTriggerRange = 480;
    this.ultName = 'HEAVENLY EARTHSHATTER';
    this.skillName = 'TEMPEST VANGUARD';
    this.comboStep = 0;
    this.spinAngle = 0;
    this.isDeflecting = false;
    this.reflectedInSkill = false;
    this.stepDustTimer = 0;
    this.spawnedSkyBlades = false;
    this.didSlamFinisher = false;
    this.dodgeMaxCooldown = 3.4;
    this.dashMaxCooldown = 3.2;
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
        Math.hypot(proj.x - this.x, proj.y - (this.y - 110)) < 108
      ) {
        this.reflectedInSkill = true;
        proj.owner = this;
        proj.vx = -proj.vx * 1.25;
        proj.vy = -8;
        proj.color = '#38bdf8';
        proj.coreColor = '#fef08a';
        if (game.audio) game.audio.play('reflect', this.x);
        game.vfx.spawnDamageText(this.x, this.y - 145, 0, false, 'AEGIS REFLECT!', '#38bdf8');
        game.vfx.spawnBurst(proj.x, proj.y, 14, '#38bdf8', 240);
        game.vfx.spawnShockwave(proj.x, proj.y, 85, '#fef08a', 0.26);
        game.renderer.triggerShake(6, 0.14);
        break;
      }
    }
  }

  onStartDash(enemy, game, dir) {
    this.dashDuration = 0.42;
    this.isDeflecting = true;
    this.vx = dir * 485;
    if (game.audio) game.audio.play('storm_leap', this.x);
    game.vfx.spawnShockwave(this.x, this.y - 80, 88, '#38bdf8', 0.28, false, true);
    game.vfx.spawnGlyphBurst(this.x, this.y - 85, 6, 'steel');
    game.vfx.spawnDamageText(this.x, this.y - 140, 0, false, 'VALKYRIE CHARGE!', '#38bdf8');
  }

  onStartDodge(enemy, game, dir) {
    this.dashDuration = 0.38;
    this.isDeflecting = true;
    const smartDir = enemy && Math.abs(enemy.x - this.x) > 240 ? this.facing : dir;
    this.dashDir = smartDir;
    this.vx = smartDir * 390;
    if (game.audio) game.audio.play('reflect', this.x);
    game.vfx.spawnShockwave(this.x, this.y - 90, 92, '#bae6fd', 0.28);
    game.vfx.spawnGlyphBurst(this.x, this.y - 90, 6, 'steel');
    game.vfx.spawnDamageText(this.x, this.y - 140, 0, false, 'AEGIS PARRY!', '#7dd3fc');

    // Retaliatory Frost-Crescent Counter Wave on parry!
    if (enemy && !enemy.isDead && Math.random() < 0.65) {
      const spawnX = this.x + this.facing * 48;
      const spawnY = this.y - 108;
      game.vfx.spawnProjectile({
        x: spawnX,
        y: spawnY,
        vx: this.facing * 610,
        vy: 0,
        radius: 18,
        color: '#38bdf8',
        coreColor: '#fef08a',
        owner: this,
        damage: 42,
        type: 'blade_wave'
      });
    }
  }

  updateDashOrDodge(dt, enemy, game) {
    const t = this.stateTimer;
    const speed = this.state === 'DASH' ? 485 : 360;
    this.x += this.dashDir * speed * dt;

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

  update(dt, enemy, game) {
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
    super.update(dt, enemy, game);
  }

  updateAutoAttack(dt, enemy, game) {
    const t = this.stateTimer;
    const mode = this.comboStep % 3;

    if (t < 0.32) {
      // Frames 16, 17, 18: Runeblade windup + azure rune convergence
      this.torsoAngle = -this.facing * 0.24 * (t / 0.32);
      if (Math.random() < 0.55) {
        game.vfx.spawnParticle({
          x: this.x - this.facing * 18 + (Math.random() - 0.5) * 26,
          y: this.y - 105 + (Math.random() - 0.5) * 26,
          vx: this.facing * 45,
          vy: -75,
          size: 5,
          color: mode === 2 ? '#fef08a' : '#7dd3fc',
          maxLife: 0.26
        });
      }
    } else if (t < 0.68) {
      // Frames 19, 20, 21: Dynamic 3-Part Runeblade Combo
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
            coreColor: '#fef08a',
            owner: this,
            damage: 66,
            type: 'blade_wave'
          });
          game.vfx.spawnShockwave(cx, cy, 82, '#fef08a', 0.26, false, true);
        } else {
          if (game.audio) game.audio.play(mode === 1 ? 'heavy_cleave' : 'slash', this.x);
        }

        game.vfx.spawnSlash(cx, cy, 114, startA, endA, '#0284c7', 0.32);
        game.vfx.spawnSlash(cx, cy, 96, startA, endA, '#38bdf8', 0.26);
        game.vfx.spawnSlash(cx, cy, 78, startA, endA, '#ffffff', 0.2);
        game.vfx.spawnShockwave(cx, this.groundY, 96, '#38bdf8', 0.28, true);
        game.vfx.spawnGlyphBurst(cx, cy, 5, 'steel');

        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= this.attackRange + 50) {
          const isCrit = mode === 2 || Math.random() < 0.25;
          const dmg = mode === 2 ? 96 : mode === 1 ? 82 : 74;
          enemy.takeDamage(dmg, this, isCrit, 115, mode === 2 ? -130 : 0);
          if (game.audio) game.audio.play(isCrit ? 'hit_crit' : 'clang', enemy.x);
          if (game.renderer) game.renderer.triggerHitStop(0.06);
          game.vfx.spawnBurst(enemy.x, enemy.y - 95, 14, '#bae6fd', 230);
          game.vfx.spawnGlyphBurst(enemy.x, enemy.y - 95, 5, 'steel');
          if (isCrit || mode === 1) {
            game.vfx.spawnLightning(enemy.x, -140, this.groundY, '#ffffff', '#38bdf8');
            game.vfx.spawnShockwave(enemy.x, enemy.y - 85, 95, '#fef08a', 0.28);
          }
        }
      }
    } else if (t >= 0.9) {
      this.setState('IDLE');
    }
  }

  updateSkill(dt, enemy, game) {
    // OVERHAULED SKILL KIT: "TEMPEST VANGUARD" (2-Phase Dynamic Assault)
    // Phase 1 (0.0s - 0.58s): High-Speed Cyclone Vortex Rush + Aegis Spell Reflection
    // Phase 2 (0.58s - 1.02s): Thunderous Judgment Slam + Erupting Glacial Crystal Spires under Enemy
    const t = this.stateTimer;
    this.isDeflecting = t >= 0.08 && t <= 0.85;
    if (t >= 0.08 && t <= 0.62) {
      this.reflectNearbyProjectiles(game);
    }

    if (t < 0.12) {
      this.didSlamFinisher = false;
      this.reflectedInSkill = false;
      this.torsoAngle = -this.facing * 0.22;
    } else if (t < 0.58) {
      if (!this.didActionFrame) {
        this.didActionFrame = true;
        if (game.audio) game.audio.play('whirlwind', this.x);
        game.vfx.spawnGlyphBurst(this.x, this.y - 95, 8, 'steel');
        game.vfx.spawnTornado({
          x: this.x + this.facing * 24,
          groundY: this.groundY,
          vx: this.facing * 350,
          radius: 68,
          height: 220,
          color: '#38bdf8',
          coreColor: '#fef08a',
          maxLife: 0.52
        });
      }

      this.spinAngle += dt * 24;
      const distToEnemy = enemy ? Math.abs(enemy.x - this.x) : 200;
      const rushSpeed = distToEnemy > 95 ? 430 : 120;
      this.x += this.facing * rushSpeed * dt;

      if (Math.random() < 0.6) {
        game.vfx.spawnShockwave(this.x, this.y - 80, 96, '#7dd3fc', 0.22, true);
      }

      if (!this.lastSpinTick || t - this.lastSpinTick >= 0.18) {
        this.lastSpinTick = t;
        game.vfx.spawnSlash(this.x, this.y - 92, 114, 0, Math.PI * 2, '#38bdf8', 0.22);
        game.vfx.spawnSlash(this.x, this.y - 116, 86, 0, Math.PI * 2, '#bae6fd', 0.18);
        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 136) {
          enemy.takeDamage(28, this, false, 60, 0);
          if (game.audio) game.audio.play('clang', enemy.x);
          game.vfx.spawnGlyphBurst(enemy.x, enemy.y - 95, 3, 'steel');
        }
      }
    } else if (!this.didSlamFinisher) {
      // Phase 2 Culmination: Thunder-Breaker Greatsword Slam + Erupting Glacial Spires!
      this.didSlamFinisher = true;
      if (game.audio) game.audio.play('thunder_slam', this.x);
      game.renderer.triggerShake(14, 0.32);
      game.renderer.triggerHitStop(0.055);

      const slamX = this.x + this.facing * 52;
      game.vfx.spawnLightning(slamX, -220, this.groundY, '#ffffff', '#38bdf8');
      game.vfx.spawnShockwave(slamX, this.groundY, 195, '#38bdf8', 0.42, true);
      game.vfx.spawnShockwave(slamX, this.groundY - 40, 145, '#fef08a', 0.34, false);
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
          damage: 16,
          delay: idx * 0.04,
          maxLife: 0.78
        });
      });

      if (enemy && !enemy.isDead && Math.abs(enemy.x - slamX) < 175) {
        enemy.takeDamage(52, this, true, 135, -150);
      }
    } else if (t >= 0.98) {
      this.isDeflecting = false;
      this.lastSpinTick = 0;
      this.setState('IDLE');
    }
  }

  updateUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    // Stay planted firmly on the arena floor while channeling and slamming the greatsword
    this.y = this.groundY;
    this.vy = 0;

    if (t < 0.36) {
      this.spawnedSkyBlades = false;
      if (Math.random() < 0.85) {
        game.vfx.spawnParticle({
          x: this.x + (Math.random() - 0.5) * 95,
          y: this.y,
          vx: 0,
          vy: -310,
          size: 7,
          color: Math.random() > 0.4 ? '#38bdf8' : '#facc15',
          maxLife: 0.38
        });
      }
    } else if (t < 0.66) {
      if (!this.spawnedSkyBlades && enemy) {
        this.spawnedSkyBlades = true;
        if (game.audio) game.audio.play('storm_leap', this.x);
        game.vfx.spawnShockwave(this.x, this.groundY, 155, '#38bdf8', 0.38, true);
        game.vfx.spawnGlyphBurst(this.x, this.groundY - 95, 8, 'steel');
        // Summon 5 Colossal Spectral Runeblades raining from the heavens around the target
        const offsets = [-120, -60, 0, 60, 120];
        offsets.forEach((off, idx) => {
          game.vfx.spawnSkyStrike({
            x: enemy.x + off,
            y: -220 - idx * 48,
            groundY: this.groundY,
            vx: 0,
            vy: 1450,
            type: 'runeblade',
            color: '#38bdf8',
            coreColor: '#fef08a',
            owner: this,
            target: enemy,
            damage: 24,
            delay: idx * 0.065,
            maxLinger: 0.68
          });
        });
      }
    } else if (!this.didActionFrame) {
      this.didActionFrame = true;
      if (game.audio) game.audio.play('earthshatter', this.x);

      game.renderer.triggerShake(26, 0.65);
      game.renderer.triggerAberration(15);
      game.renderer.triggerHitStop(0.095);

      // 1. Full-Arena Chaining Glacial Frost-Crystal Spire Wave (9 Spires spanning 640px!)
      for (let i = 0; i < 9; i++) {
        const dir = this.facing;
        const spikeX = this.x + dir * (48 + i * 66);
        game.vfx.spawnCrystalSpike({
          x: spikeX,
          groundY: this.groundY,
          height: 118 + (i % 2 === 0 ? 48 : 18),
          width: 36 + (i % 2) * 8,
          tilt: dir * (0.32 + i * 0.05),
          color: '#38bdf8',
          coreColor: '#e0f2fe',
          owner: this,
          target: enemy,
          damage: 16,
          delay: i * 0.045,
          maxLife: 0.95
        });
      }

      // 2. Ancestral Runic Judgment Pillar + Triple Heaven-Thunderbolts directly at the enemy's position!
      const targetX = enemy ? enemy.x : this.x + this.facing * 320;
      game.vfx.spawnFlamePillar(targetX, this.groundY, this, enemy, {
        theme: 'steel',
        delay: 0.08,
        maxLife: 1.25,
        scaleWidth: 1.22
      });
      game.vfx.spawnLightning(targetX - 45, -260, this.groundY, '#fef08a', '#38bdf8');
      game.vfx.spawnLightning(targetX, -320, this.groundY, '#ffffff', '#38bdf8');
      game.vfx.spawnLightning(targetX + 45, -260, this.groundY, '#38bdf8', '#0284c7');

      game.vfx.spawnShockwave(this.x, this.groundY, 330, '#facc15', 0.65, true);
      game.vfx.spawnShockwave(targetX, this.groundY, 280, '#38bdf8', 0.58, true);
      game.vfx.spawnDecal(this.x, 190, 'fissure', '#38bdf8', 6.5);
      game.vfx.spawnDecal(targetX, 175, 'fissure', '#38bdf8', 6.0);
      game.vfx.spawnBurst(targetX, this.groundY - 20, 34, '#facc15', 390, { upBias: 175, size: 9 });
      game.vfx.spawnBurst(targetX, this.groundY - 20, 28, '#38bdf8', 350, { upBias: 135, size: 8 });
      game.vfx.spawnGlyphBurst(targetX, this.groundY - 70, 12, 'steel');

      if (enemy && !enemy.isDead) {
        enemy.takeDamage(165, this, true, 220, -340);
      }
    } else if (t >= 1.55) {
      this.setState('IDLE');
    }
  }

  draw(ctx, isReflection = false) {
    const sprites = PixelForge.initAssets().warrior;
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const w = 208;
    const h = 208;
    const frameIdx = PixelForge.getFrameIndex(this, this.walkPhase);

    ctx.translate(Math.round(this.x), Math.round(this.y));
    ctx.scale(this.facing, 1);

    PixelForge.drawSheetFrame(ctx, sprites, this, w, h, this.walkPhase, isReflection);

    if (this.hitFlash > 0 && !isReflection) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5;
      PixelForge.drawGhostFrame(ctx, sprites, frameIdx, w, h);
    }

    ctx.restore();
  }
}
