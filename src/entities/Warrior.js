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
      attackRange: 135,
      moveSpeed: 215,
      autoInterval: 0.98,
      lightColor: 'rgba(56, 189, 248, 1)',
      primaryColor: '#38bdf8'
    });
    this.skillMaxCooldown = 4.4;
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
      if (this.stepDustTimer >= 0.26) {
        this.stepDustTimer = 0;
        game.vfx.spawnBurst(this.x - this.facing * 14, this.groundY - 2, 3, '#64748b', 60, {
          upBias: 30,
          size: 4,
          life: 0.3,
          additive: false
        });
      }
    }
    super.update(dt, enemy, game);
  }

  updateAutoAttack(dt, enemy, game) {
    const t = this.stateTimer;
    const mode = this.comboStep % 3;

    if (t < 0.22) {
      // Overhead Windup Pose (warrior_windup.png)
      this.torsoAngle = -this.facing * 0.24 * (t / 0.22);
    } else if (t < 0.48) {
      // Explosive Cleave Pose (warrior_attack.png)
      if (!this.didActionFrame) {
        this.didActionFrame = true;
        this.comboStep++;
        this.vx += this.facing * 195;
        this.torsoVel = this.facing * 15;
        if (game.audio) game.audio.play('slash');

        const cx = this.x + this.facing * 32;
        const cy = this.y - 68;
        const startA = this.facing === 1 ? -1.55 : Math.PI - 0.9;
        const endA = this.facing === 1 ? 0.95 : Math.PI + 1.55;

        game.vfx.spawnSlash(cx, cy, 98, startA, endA, '#0284c7', 0.24);
        game.vfx.spawnSlash(cx, cy, 84, startA, endA, '#38bdf8', 0.2);
        game.vfx.spawnSlash(cx, cy, 70, startA, endA, '#ffffff', 0.15);

        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= this.attackRange + 42) {
          const isCrit = mode === 2 || Math.random() < 0.25;
          const dmg = isCrit ? 116 : 76;
          enemy.takeDamage(dmg, this, isCrit, 145, mode === 2 ? -150 : -75);
          if (game.audio) game.audio.play('clang');
          game.vfx.spawnBurst(enemy.x, enemy.y - 65, 10, '#bae6fd', 220);
        }
      }
    } else if (t >= 0.62) {
      this.setState('IDLE');
    }
  }

  updateSkill(dt, enemy, game) {
    const t = this.stateTimer;
    this.isDeflecting = t >= 0.1 && t <= 0.9;

    if (t < 0.12) {
      this.torsoAngle = -this.facing * 0.2;
    } else if (t < 0.9) {
      if (!this.didActionFrame) {
        this.didActionFrame = true;
        if (game.audio) game.audio.play('whirlwind');
      }
      this.spinAngle += dt * 34;
      this.x += this.facing * 435 * dt;

      if (Math.random() < 0.5) {
        game.vfx.spawnShockwave(this.x, this.y - 54, 86, '#7dd3fc', 0.2, true);
      }

      for (const proj of game.vfx.projectiles) {
        if (proj.owner !== this && !proj.isMeteor && Math.hypot(proj.x - this.x, proj.y - (this.y - 60)) < 92) {
          proj.owner = this;
          proj.vx = -proj.vx * 1.3;
          proj.vy = -40;
          proj.color = '#38bdf8';
          if (game.audio) game.audio.play('clang');
          game.vfx.spawnDamageText(this.x, this.y - 125, 0, false, 'AEGIS REFLECT!');
          game.vfx.spawnBurst(proj.x, proj.y, 10, '#38bdf8', 210);
          game.renderer.triggerShake(6, 0.14);
        }
      }

      if (!this.lastSpinTick || t - this.lastSpinTick >= 0.18) {
        this.lastSpinTick = t;
        game.vfx.spawnSlash(this.x, this.y - 58, 92, 0, Math.PI * 2, '#38bdf8', 0.15);
        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 110) {
          enemy.takeDamage(42, this, false, 95, -55);
        }
      }
    } else {
      this.isDeflecting = false;
      this.lastSpinTick = 0;
      this.setState('IDLE');
    }
  }

  updateUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    if (t < 0.35) {
      if (Math.random() < 0.7) {
        game.vfx.spawnParticle({
          x: this.x + (Math.random() - 0.5) * 75,
          y: this.y,
          vx: 0,
          vy: -280,
          size: 7,
          color: '#facc15',
          maxLife: 0.35
        });
      }
    } else if (t < 0.78) {
      if (this.y >= this.groundY - 5 && this.vy >= 0) {
        this.vy = -1020;
        game.vfx.spawnShockwave(this.x, this.groundY, 130, '#38bdf8', 0.35, true);
      }
      if (enemy) {
        const targetX = enemy.x - this.facing * 45;
        this.x += (targetX - this.x) * 7.5 * dt;
      }
    } else if (!this.didActionFrame) {
      this.vy = 1750;
      if (this.y >= this.groundY - 8) {
        this.y = this.groundY;
        this.vy = 0;
        this.didActionFrame = true;
        if (game.audio) game.audio.play('earthshatter');

        game.renderer.triggerShake(26, 0.65);
        game.renderer.triggerAberration(16);

        game.vfx.spawnLightning(this.x - 25, -220, this.groundY, '#fef08a');
        game.vfx.spawnLightning(this.x, -260, this.groundY, '#ffffff');
        game.vfx.spawnLightning(this.x + 30, -220, this.groundY, '#38bdf8');
        game.vfx.spawnShockwave(this.x, this.groundY, 310, '#facc15', 0.65, true);
        game.vfx.spawnShockwave(this.x, this.groundY - 35, 230, '#38bdf8', 0.5, false);
        game.vfx.spawnDecal(this.x, 170, 'fissure', '#facc15', 6.5);
        game.vfx.spawnBurst(this.x, this.groundY - 10, 32, '#facc15', 390, { upBias: 165, size: 9 });
        game.vfx.spawnBurst(this.x, this.groundY - 10, 22, '#38bdf8', 330, { upBias: 120, size: 7 });

        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 290) {
          enemy.takeDamage(235, this, true, 260, -440);
        }
      }
    } else if (t >= 1.35) {
      this.setState('IDLE');
    }
  }

  draw(ctx, isReflection = false) {
    const sprites = PixelForge.initAssets().warrior;
    const img = PixelForge.selectFrame(sprites, this);
    if (!img || !img.complete || !img.naturalWidth) return;

    ctx.save();
    ctx.imageSmoothingEnabled = true;

    const w = 178;
    const h = 174;

    // Multi-ghost afterimage trail during attacks, Whirlwind, or Ultimate
    if (!isReflection && (this.state === 'SKILL' || this.state === 'ULTIMATE' || this.state === 'AUTO_ATTACK')) {
      for (let g = 1; g <= 2; g++) {
        ctx.save();
        ctx.globalAlpha = 0.18 / g;
        ctx.translate(this.x - this.facing * g * 20, this.y);
        ctx.scale(this.facing, 1);
        ctx.drawImage(img, -w * 0.5, -h + 8, w, h);
        ctx.restore();
      }
    }

    const walkBob = this.state === 'WALK' ? Math.abs(Math.sin(this.walkPhase * 1.5)) * -12 : 0;
    const breatheY = 1 + Math.sin(this.walkPhase * 1.4) * 0.032;
    const breatheX = 1 - Math.sin(this.walkPhase * 1.4) * 0.02;
    const tilt =
      this.state === 'WALK'
        ? Math.sin(this.walkPhase * 1.5) * 0.08 + 0.06
        : this.torsoAngle * this.facing * 0.5;

    ctx.translate(this.x, this.y + walkBob);
    ctx.scale(this.facing * breatheX, breatheY);
    ctx.rotate(tilt);

    PixelForge.drawDeformedSprite(ctx, img, w, h, this.walkPhase, this.state, isReflection);

    if (this.hitFlash > 0 && !isReflection) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.55;
      ctx.drawImage(img, -w * 0.5, -h + 8, w, h);
    }

    ctx.restore();
  }
}
