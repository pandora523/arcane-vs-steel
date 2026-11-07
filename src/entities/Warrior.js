import { Fighter } from './Fighter.js';
import { PixelForge } from '../engine/PixelForge.js';

export class Warrior extends Fighter {
  constructor(x, groundY, facing = 1) {
    super({
      name: 'Aethelgard',
      x,
      groundY,
      facing,
      maxHp: 1280,
      attackRange: 138,
      moveSpeed: 142,
      autoInterval: 1.32,
      lightColor: 'rgba(56, 189, 248, 1)',
      primaryColor: '#38bdf8'
    });
    this.heroId = 'warrior';
    this.theme = 'steel';
    this.deathSfx = 'death_warrior';
    this.skillMaxCooldown = 5.0;
    this.ultName = 'HEAVENLY EARTHSHATTER';
    this.skillName = 'WHIRLWIND';
    this.comboStep = 0;
    this.spinAngle = 0;
    this.isDeflecting = false;
    this.stepDustTimer = 0;
    this.spawnedSkyBlades = false;
    this.dodgeMaxCooldown = 3.2;
    this.dashMaxCooldown = 3.4;
  }

  onStartDash(enemy, game, dir) {
    this.dashDuration = 0.42;
    this.vx = dir * 420;
    if (game.audio) game.audio.play('slash', this.x);
    game.vfx.spawnShockwave(this.x, this.y - 50, 78, '#38bdf8', 0.26, false, true);
    game.vfx.spawnGlyphBurst(this.x, this.y - 55, 5, 'steel');
    game.vfx.spawnDamageText(this.x, this.y - 120, 0, false, 'VALKYRIE RUSH!', '#38bdf8');
  }

  onStartDodge(enemy, game, dir) {
    this.dashDuration = 0.4;
    this.vx = dir * 350;
    if (game.audio) game.audio.play('reflect', this.x);
    game.vfx.spawnShockwave(this.x, this.y - 55, 84, '#bae6fd', 0.28);
    game.vfx.spawnGlyphBurst(this.x, this.y - 60, 5, 'steel');
    game.vfx.spawnDamageText(this.x, this.y - 120, 0, false, 'AEGIS DODGE!', '#7dd3fc');
  }

  updateDashOrDodge(dt, enemy, game) {
    const t = this.stateTimer;
    const speed = this.state === 'DASH' ? 420 : 330;
    this.x += this.dashDir * speed * dt;

    if (Math.random() < 0.65) {
      game.vfx.spawnParticle({
        x: this.x - this.dashDir * 18,
        y: this.groundY - 6 - Math.random() * 45,
        vx: -this.dashDir * 90,
        vy: -30,
        size: 5,
        color: '#7dd3fc',
        maxLife: 0.25
      });
    }

    // Valkyrie Rush shoulder-cleave impact if he reaches the enemy during DASH
    if (this.state === 'DASH' && !this.didActionFrame && enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= 130) {
      this.didActionFrame = true;
      enemy.takeDamage(54, this, false, 130, -80);
      if (game.audio) game.audio.play('clang', enemy.x);
      game.vfx.spawnSlash(this.x + this.facing * 36, this.y - 64, 86, -1.2, 1.2, '#38bdf8', 0.24);
      game.vfx.spawnShockwave(enemy.x, enemy.y - 55, 82, '#38bdf8', 0.26);
    }

    if (t >= this.dashDuration) {
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  update(dt, enemy, game) {
    if (!this.isDead && this.state === 'WALK') {
      this.stepDustTimer += dt;
      if (this.stepDustTimer >= 0.34) {
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

    if (t < 0.36) {
      // Frames 16, 17, 18: Deliberate two-handed overhead greatsword windup + rune charge
      this.torsoAngle = -this.facing * 0.24 * (t / 0.36);
      if (Math.random() < 0.45) {
        game.vfx.spawnParticle({
          x: this.x - this.facing * 18 + (Math.random() - 0.5) * 24,
          y: this.y - 95 + (Math.random() - 0.5) * 24,
          vx: this.facing * 35,
          vy: -65,
          size: 5,
          color: '#7dd3fc',
          maxLife: 0.28
        });
      }
    } else if (t < 0.72) {
      // Frames 19, 20, 21: Forward lunge cleave & impact
      if (!this.didActionFrame) {
        this.didActionFrame = true;
        this.comboStep++;
        this.vx += this.facing * 140;
        this.torsoVel = this.facing * 12;
        if (game.audio) game.audio.play('slash', this.x);

        const cx = this.x + this.facing * 38;
        const cy = this.y - 68;
        const startA = this.facing === 1 ? -1.6 : Math.PI - 0.95;
        const endA = this.facing === 1 ? 1.0 : Math.PI + 1.6;

        game.vfx.spawnSlash(cx, cy, 108, startA, endA, '#0284c7', 0.34);
        game.vfx.spawnSlash(cx, cy, 92, startA, endA, '#38bdf8', 0.28);
        game.vfx.spawnSlash(cx, cy, 76, startA, endA, '#ffffff', 0.22);
        game.vfx.spawnShockwave(cx, this.groundY, 92, '#38bdf8', 0.3, true);
        game.vfx.spawnGlyphBurst(cx, cy, 4, 'steel');

        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= this.attackRange + 48) {
          const isCrit = mode === 2 || Math.random() < 0.28;
          const dmg = isCrit ? 128 : 86;
          enemy.takeDamage(dmg, this, isCrit, 125, mode === 2 ? -140 : 0);
          if (game.audio) game.audio.play(isCrit ? 'hit_crit' : 'clang', enemy.x);
          if (game.renderer) game.renderer.triggerHitStop(0.065);
          game.vfx.spawnBurst(enemy.x, enemy.y - 65, 14, '#bae6fd', 230);
          game.vfx.spawnGlyphBurst(enemy.x, enemy.y - 70, 5, 'steel');
          if (isCrit) {
            game.vfx.spawnLightning(enemy.x, -140, this.groundY, '#ffffff', '#38bdf8');
            game.vfx.spawnShockwave(enemy.x, enemy.y - 55, 95, '#fef08a', 0.28);
          }
        }
      }
    } else if (t >= 0.96) {
      this.setState('IDLE');
    }
  }

  updateSkill(dt, enemy, game) {
    const t = this.stateTimer;
    this.isDeflecting = t >= 0.12 && t <= 1.05;

    if (t < 0.16) {
      this.torsoAngle = -this.facing * 0.2;
    } else if (t < 1.05) {
      if (!this.didActionFrame) {
        this.didActionFrame = true;
        if (game.audio) game.audio.play('whirlwind', this.x);
        game.vfx.spawnGlyphBurst(this.x, this.y - 75, 7, 'steel');
      }
      this.spinAngle += dt * 22;
      this.x += this.facing * 265 * dt;

      if (Math.random() < 0.55) {
        game.vfx.spawnShockwave(this.x, this.y - 54, 96, '#7dd3fc', 0.24, true);
      }

      for (const proj of game.vfx.projectiles) {
        if (proj.owner !== this && !proj.isMeteor && Math.hypot(proj.x - this.x, proj.y - (this.y - 110)) < 106) {
          proj.owner = this;
          proj.vx = -proj.vx * 1.3;
          proj.vy = -12;
          proj.color = '#38bdf8';
          if (game.audio) game.audio.play('reflect', this.x);
          game.vfx.spawnDamageText(this.x, this.y - 140, 0, false, 'AEGIS REFLECT!', '#38bdf8');
          game.vfx.spawnBurst(proj.x, proj.y, 14, '#38bdf8', 240);
          game.vfx.spawnShockwave(proj.x, proj.y, 85, '#fef08a', 0.26);
          game.renderer.triggerShake(6, 0.14);
        }
      }

      if (!this.lastSpinTick || t - this.lastSpinTick >= 0.2) {
        this.lastSpinTick = t;
        game.vfx.spawnSlash(this.x, this.y - 88, 108, 0, Math.PI * 2, '#38bdf8', 0.22);
        game.vfx.spawnSlash(this.x, this.y - 112, 82, 0, Math.PI * 2, '#bae6fd', 0.18);
        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 126) {
          enemy.takeDamage(48, this, false, 80, 0);
          if (game.audio) game.audio.play('clang', enemy.x);
          game.vfx.spawnGlyphBurst(enemy.x, enemy.y - 95, 3, 'steel');
        }
      }
    } else if (t >= 1.15) {
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

    if (t < 0.38) {
      this.spawnedSkyBlades = false;
      if (Math.random() < 0.85) {
        game.vfx.spawnParticle({
          x: this.x + (Math.random() - 0.5) * 90,
          y: this.y,
          vx: 0,
          vy: -290,
          size: 7,
          color: Math.random() > 0.4 ? '#38bdf8' : '#facc15',
          maxLife: 0.38
        });
      }
    } else if (t < 0.68) {
      if (!this.spawnedSkyBlades && enemy) {
        this.spawnedSkyBlades = true;
        game.vfx.spawnShockwave(this.x, this.groundY, 145, '#38bdf8', 0.38, true);
        game.vfx.spawnGlyphBurst(this.x, this.groundY - 95, 8, 'steel');
        // Summon 4 Colossal Spectral Runeblades raining from the heavens around the target
        const offsets = [-110, -42, 42, 110];
        offsets.forEach((off, idx) => {
          game.vfx.spawnSkyStrike({
            x: enemy.x + off,
            y: -220 - idx * 55,
            groundY: this.groundY,
            vx: 0,
            vy: 1380,
            type: 'runeblade',
            color: '#38bdf8',
            coreColor: '#fef08a',
            owner: this,
            target: enemy,
            damage: 26,
            delay: idx * 0.08,
            maxLinger: 0.65
          });
        });
      }
    } else if (!this.didActionFrame) {
      this.didActionFrame = true;
      if (game.audio) game.audio.play('earthshatter', this.x);

      game.renderer.triggerShake(28, 0.68);
      game.renderer.triggerAberration(16);
      game.renderer.triggerHitStop(0.095);

        // Chaining Glacial Frost-Crystal Spire Wave erupting sequentially across the arena floor!
        for (let i = 0; i < 7; i++) {
          const dir = this.facing;
          const spikeX = this.x + dir * (42 + i * 44);
          game.vfx.spawnCrystalSpike({
            x: spikeX,
            groundY: this.groundY,
            height: 110 + (i % 2 === 0 ? 45 : 15),
            width: 34 + (i % 2) * 8,
            tilt: dir * (0.35 + i * 0.06),
            color: '#38bdf8',
            coreColor: '#e0f2fe',
            owner: this,
            target: enemy,
            damage: 18,
            delay: i * 0.055,
            maxLife: 0.92
          });
        }

        game.vfx.spawnLightning(this.x - 55, -240, this.groundY, '#fef08a', '#38bdf8');
        game.vfx.spawnLightning(this.x, -300, this.groundY, '#ffffff', '#38bdf8');
        game.vfx.spawnLightning(this.x + 55, -240, this.groundY, '#38bdf8', '#0284c7');

        game.vfx.spawnShockwave(this.x, this.groundY, 330, '#facc15', 0.65, true);
        game.vfx.spawnShockwave(this.x, this.groundY - 35, 250, '#38bdf8', 0.52, false);
        game.vfx.spawnDecal(this.x, 190, 'fissure', '#38bdf8', 6.5);
        game.vfx.spawnBurst(this.x, this.groundY - 10, 34, '#facc15', 390, { upBias: 175, size: 9 });
        game.vfx.spawnBurst(this.x, this.groundY - 10, 28, '#38bdf8', 350, { upBias: 135, size: 8 });
        game.vfx.spawnGlyphBurst(this.x, this.groundY - 60, 10, 'steel');

      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 295) {
        enemy.takeDamage(205, this, true, 240, -380);
      }
    } else if (t >= 1.65) {
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
