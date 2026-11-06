import { Fighter } from './Fighter.js';
import { PixelForge } from '../engine/PixelForge.js';

export class Warrior extends Fighter {
  constructor(x, groundY) {
    super({
      name: 'Aethelgard',
      x,
      groundY,
      facing: 1,
      maxHp: 1260,
      attackRange: 138,
      moveSpeed: 138,
      autoInterval: 1.35,
      lightColor: 'rgba(56, 189, 248, 1)',
      primaryColor: '#38bdf8'
    });
    this.skillMaxCooldown = 5.2;
    this.ultName = 'HEAVENLY EARTHSHATTER';
    this.skillName = 'WHIRLWIND';
    this.comboStep = 0;
    this.spinAngle = 0;
    this.isDeflecting = false;
    this.stepDustTimer = 0;
  }

  update(dt, enemy, game) {
    if (this.state === 'WALK') {
      this.stepDustTimer += dt;
      if (this.stepDustTimer >= 0.34) {
        this.stepDustTimer = 0;
        game.vfx.spawnBurst(this.x - this.facing * 14, this.groundY - 2, 3, '#64748b', 55, {
          upBias: 24,
          size: 4,
          life: 0.32,
          additive: false
        });
      }
    }
    super.update(dt, enemy, game);
  }

  updateAutoAttack(dt, enemy, game) {
    const t = this.stateTimer;
    const mode = this.comboStep % 3;

    if (t < 0.36) {
      // Frames 16, 17, 18: Deliberate two-handed overhead greatsword windup
      this.torsoAngle = -this.facing * 0.24 * (t / 0.36);
    } else if (t < 0.72) {
      // Frames 19, 20, 21: Forward lunge cleave & impact
      if (!this.didActionFrame) {
        this.didActionFrame = true;
        this.comboStep++;
        this.vx += this.facing * 135;
        this.torsoVel = this.facing * 12;
        if (game.audio) game.audio.play('slash');

        const cx = this.x + this.facing * 34;
        const cy = this.y - 68;
        const startA = this.facing === 1 ? -1.55 : Math.PI - 0.9;
        const endA = this.facing === 1 ? 0.95 : Math.PI + 1.55;

        game.vfx.spawnSlash(cx, cy, 98, startA, endA, '#0284c7', 0.32);
        game.vfx.spawnSlash(cx, cy, 84, startA, endA, '#38bdf8', 0.26);
        game.vfx.spawnSlash(cx, cy, 70, startA, endA, '#ffffff', 0.2);

        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= this.attackRange + 46) {
          const isCrit = mode === 2 || Math.random() < 0.25;
          const dmg = isCrit ? 124 : 84;
          enemy.takeDamage(dmg, this, isCrit, 125, mode === 2 ? -135 : 0);
          if (game.audio) game.audio.play('clang');
          if (game.renderer) game.renderer.triggerHitStop(0.065);
          game.vfx.spawnBurst(enemy.x, enemy.y - 65, 10, '#bae6fd', 210);
        }
      }
    } else if (t >= 0.96) {
      // Frames 22, 23: Low follow-through & recovery back to guard stance
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
        if (game.audio) game.audio.play('whirlwind');
      }
      this.spinAngle += dt * 22;
      this.x += this.facing * 265 * dt;

      if (Math.random() < 0.45) {
        game.vfx.spawnShockwave(this.x, this.y - 54, 86, '#7dd3fc', 0.24, true);
      }

      for (const proj of game.vfx.projectiles) {
        if (proj.owner !== this && !proj.isMeteor && Math.hypot(proj.x - this.x, proj.y - (this.y - 60)) < 92) {
          proj.owner = this;
          proj.vx = -proj.vx * 1.25;
          proj.vy = -35;
          proj.color = '#38bdf8';
          if (game.audio) game.audio.play('clang');
          game.vfx.spawnDamageText(this.x, this.y - 125, 0, false, 'AEGIS REFLECT!');
          game.vfx.spawnBurst(proj.x, proj.y, 10, '#38bdf8', 210);
          game.renderer.triggerShake(6, 0.14);
        }
      }

      if (!this.lastSpinTick || t - this.lastSpinTick >= 0.22) {
        this.lastSpinTick = t;
        game.vfx.spawnSlash(this.x, this.y - 58, 92, 0, Math.PI * 2, '#38bdf8', 0.2);
        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 115) {
          enemy.takeDamage(46, this, false, 80, 0);
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
    if (t < 0.42) {
      if (Math.random() < 0.7) {
        game.vfx.spawnParticle({
          x: this.x + (Math.random() - 0.5) * 75,
          y: this.y,
          vx: 0,
          vy: -260,
          size: 7,
          color: '#facc15',
          maxLife: 0.38
        });
      }
    } else if (t < 0.9) {
      if (this.y >= this.groundY - 5 && this.vy >= 0) {
        this.vy = -960;
        game.vfx.spawnShockwave(this.x, this.groundY, 130, '#38bdf8', 0.38, true);
      }
      if (enemy) {
        const targetX = enemy.x - this.facing * 45;
        this.x += (targetX - this.x) * 6.5 * dt;
      }
    } else if (!this.didActionFrame) {
      this.vy = 1650;
      if (this.y >= this.groundY - 8) {
        this.y = this.groundY;
        this.vy = 0;
        this.didActionFrame = true;
        if (game.audio) game.audio.play('earthshatter');

        game.renderer.triggerShake(26, 0.65);
        game.renderer.triggerAberration(16);
        game.renderer.triggerHitStop(0.09);

        game.vfx.spawnLightning(this.x - 25, -220, this.groundY, '#fef08a');
        game.vfx.spawnLightning(this.x, -260, this.groundY, '#ffffff');
        game.vfx.spawnLightning(this.x + 30, -220, this.groundY, '#38bdf8');
        game.vfx.spawnShockwave(this.x, this.groundY, 310, '#facc15', 0.65, true);
        game.vfx.spawnShockwave(this.x, this.groundY - 35, 230, '#38bdf8', 0.5, false);
        game.vfx.spawnDecal(this.x, 170, 'fissure', '#facc15', 6.5);
        game.vfx.spawnBurst(this.x, this.groundY - 10, 32, '#facc15', 390, { upBias: 165, size: 9 });
        game.vfx.spawnBurst(this.x, this.groundY - 10, 22, '#38bdf8', 330, { upBias: 120, size: 7 });

        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 295) {
          enemy.takeDamage(235, this, true, 240, -380);
        }
      }
    } else if (t >= 1.65) {
      this.setState('IDLE');
    }
  }

  draw(ctx, isReflection = false) {
    const sprites = PixelForge.initAssets().warrior;
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const w = 192;
    const h = 192;
    const frameIdx = PixelForge.getFrameIndex(this, this.walkPhase);

    if (!isReflection && (this.state === 'SKILL' || this.state === 'ULTIMATE' || this.state === 'AUTO_ATTACK')) {
      for (let g = 1; g <= 2; g++) {
        ctx.save();
        ctx.globalAlpha = 0.2 / g;
        ctx.translate(Math.round(this.x - this.facing * g * 18), Math.round(this.y));
        ctx.scale(this.facing, 1);
        const ghostIdx = Math.max(0, frameIdx - g);
        PixelForge.drawGhostFrame(ctx, sprites, ghostIdx, w, h);
        ctx.restore();
      }
    }

    // Keep the Knight's boots firmly planted on the stone floor
    ctx.translate(Math.round(this.x), Math.round(this.y));
    ctx.scale(this.facing, 1);

    PixelForge.drawSheetFrame(ctx, sprites, this, w, h, this.walkPhase, isReflection);

    if (this.hitFlash > 0 && !isReflection) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.6;
      PixelForge.drawGhostFrame(ctx, sprites, frameIdx, w, h);
    }

    ctx.restore();
  }
}
