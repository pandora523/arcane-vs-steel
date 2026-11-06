import { Fighter } from './Fighter.js';
import { PixelForge } from '../engine/PixelForge.js';

export class Warrior extends Fighter {
  constructor(x, groundY) {
    super({
      name: 'Aethelgard',
      x,
      groundY,
      facing: 1,
      maxHp: 1200,
      attackRange: 115,
      moveSpeed: 185,
      autoInterval: 1.15,
      lightColor: 'rgba(56, 189, 248, 1)',
      primaryColor: '#38bdf8'
    });
    this.ultName = 'HEAVENLY EARTHSHATTER';
    this.skillName = 'WHIRLWIND';
    this.swordAngle = -0.65;
    this.spinAngle = 0;
    this.isDeflecting = false;
  }

  updateAutoAttack(dt, enemy, game) {
    const t = this.stateTimer;
    if (t < 0.24) {
      this.torsoAngle = -this.facing * 0.35 * (t / 0.24);
      this.swordAngle = -2.1;
    } else if (t < 0.42) {
      if (!this.didActionFrame) {
        this.didActionFrame = true;
        this.vx += this.facing * 150;
        this.torsoVel = this.facing * 16;
        const startA = this.facing === 1 ? -1.4 : Math.PI - 0.8;
        const endA = this.facing === 1 ? 0.9 : Math.PI + 1.4;
        game.vfx.spawnSlash(this.x + this.facing * 20, this.y - 48, 82, startA, endA, '#38bdf8', 0.24);
        game.vfx.spawnSlash(this.x + this.facing * 20, this.y - 48, 66, startA, endA, '#ffffff', 0.18);

        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= this.attackRange + 35) {
          const isCrit = Math.random() < 0.28;
          const dmg = isCrit ? 98 : 64;
          enemy.takeDamage(dmg, this, isCrit, 160, -90);
          game.vfx.spawnBurst(enemy.x, enemy.y - 48, 14, '#bae6fd', 220);
        }
      }
      this.swordAngle = 0.95;
    } else if (t >= 0.65) {
      this.swordAngle = -0.65;
      this.setState('IDLE');
    }
  }

  updateSkill(dt, enemy, game) {
    const t = this.stateTimer;
    this.isDeflecting = t >= 0.15 && t <= 0.95;

    if (t < 0.15) {
      this.torsoAngle = -this.facing * 0.3;
    } else if (t < 0.95) {
      this.spinAngle += dt * 32;
      this.x += this.facing * 360 * dt;
      this.swordAngle = Math.sin(this.spinAngle) * 1.6;

      if (Math.random() < 0.6) {
        game.vfx.spawnShockwave(this.x, this.y - 42, 72, '#7dd3fc', 0.25, true);
      }

      for (const proj of game.vfx.projectiles) {
        if (proj.owner !== this && !proj.isMeteor && Math.hypot(proj.x - this.x, proj.y - (this.y - 45)) < 80) {
          proj.owner = this;
          proj.vx = -proj.vx * 1.25;
          proj.vy = -60;
          proj.color = '#38bdf8';
          game.vfx.spawnDamageText(this.x, this.y - 95, 0, false, 'DEFLECT!');
          game.vfx.spawnBurst(proj.x, proj.y, 12, '#38bdf8', 210);
          game.renderer.triggerShake(6, 0.15);
        }
      }

      if (!this.lastSpinTick || t - this.lastSpinTick >= 0.18) {
        this.lastSpinTick = t;
        game.vfx.spawnSlash(this.x, this.y - 46, 76, 0, Math.PI * 2, '#38bdf8', 0.16);
        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 98) {
          enemy.takeDamage(34, this, false, 110, -65);
        }
      }
    } else {
      this.isDeflecting = false;
      this.lastSpinTick = 0;
      this.swordAngle = -0.65;
      this.setState('IDLE');
    }
  }

  updateUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    if (t < 0.35) {
      this.swordAngle = -1.8;
      if (Math.random() < 0.8) {
        game.vfx.spawnParticle({
          x: this.x + (Math.random() - 0.5) * 65,
          y: this.y,
          vx: 0,
          vy: -260,
          size: 6,
          color: '#facc15',
          maxLife: 0.35
        });
      }
    } else if (t < 0.78) {
      if (this.y >= this.groundY - 5 && this.vy >= 0) {
        this.vy = -980;
        game.vfx.spawnShockwave(this.x, this.groundY, 115, '#38bdf8', 0.35, true);
      }
      if (enemy) {
        const targetX = enemy.x - this.facing * 50;
        this.x += (targetX - this.x) * 6 * dt;
      }
      this.swordAngle = -2.4;
    } else if (!this.didActionFrame) {
      this.vy = 1650;
      if (this.y >= this.groundY - 8) {
        this.y = this.groundY;
        this.vy = 0;
        this.didActionFrame = true;
        this.swordAngle = 1.1;

        game.renderer.triggerShake(26, 0.65);
        game.renderer.triggerAberration(16);
        game.renderer.triggerHitStop(0.09);

        game.vfx.spawnLightning(this.x, -160, this.groundY, '#fef08a');
        game.vfx.spawnLightning(this.x + 28, -160, this.groundY, '#38bdf8');
        game.vfx.spawnShockwave(this.x, this.groundY, 280, '#facc15', 0.65, true);
        game.vfx.spawnShockwave(this.x, this.groundY - 30, 210, '#38bdf8', 0.5, false);
        game.vfx.spawnDecal(this.x, 155, 'fissure', '#facc15', 6.5);
        game.vfx.spawnBurst(this.x, this.groundY - 10, 40, '#facc15', 380, { upBias: 160, size: 9 });
        game.vfx.spawnBurst(this.x, this.groundY - 10, 28, '#38bdf8', 320, { upBias: 120, size: 7 });

        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 270) {
          enemy.takeDamage(215, this, true, 260, -440);
        }
      }
    } else if (t >= 1.35) {
      this.swordAngle = -0.65;
      this.setState('IDLE');
    }
  }

  draw(ctx, isReflection = false) {
    const sprites = PixelForge.initAssets().warrior;
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Pixel-Art Segmented Flowing Cape
    for (let i = 0; i < this.capeNodes.length - 1; i++) {
      const a = this.capeNodes[i];
      const b = this.capeNodes[i + 1];
      ctx.strokeStyle = this.hitFlash > 0 ? '#ffffff' : i === 0 ? '#0369a1' : '#0284c7';
      ctx.lineWidth = 18 - i * 2;
      ctx.lineCap = 'square';
      ctx.beginPath();
      ctx.moveTo(Math.round(a.x), Math.round(a.y));
      ctx.lineTo(Math.round(b.x), Math.round(b.y));
      ctx.stroke();
    }

    ctx.translate(Math.round(this.x), Math.round(this.y));
    ctx.scale(this.facing, 1);

    const stride = this.state === 'WALK' ? Math.sin(this.walkPhase) * 0.55 : 0;
    const breathe = Math.sin(this.walkPhase) * 2;

    // 2. Back Leg & Back Arm (Articulated Pixel Sprites)
    ctx.save();
    ctx.translate(-8, -32);
    ctx.rotate(-stride);
    ctx.drawImage(sprites.leg, -12, 0);
    ctx.restore();

    ctx.save();
    ctx.translate(-10, -64 + breathe);
    ctx.rotate(stride * 0.7);
    ctx.drawImage(sprites.arm, -15, -6);
    ctx.restore();

    // 3. Spring-Rigged Pixel Cuirass & Helmet
    ctx.translate(0, -32 + this.headBob * 0.45);
    ctx.rotate(this.torsoAngle * this.facing);

    ctx.drawImage(sprites.torso, -24, -46 + breathe * 0.5);

    // Pixel Helmet
    ctx.save();
    ctx.translate(0, -64 + breathe);
    ctx.rotate(Math.sin(this.walkPhase * 0.5) * 0.05);
    ctx.drawImage(sprites.helmet, -21, -24);
    ctx.restore();

    // 4. Front Leg
    ctx.save();
    ctx.translate(8, 0);
    ctx.rotate(stride);
    ctx.drawImage(sprites.leg, -12, 0);
    ctx.restore();

    // 5. Front Arm & Runed Pixel Greatsword
    ctx.save();
    ctx.translate(10, -30 + breathe);
    ctx.rotate(this.swordAngle + Math.PI * 0.5);

    if (!isReflection) {
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 14;
    }
    ctx.drawImage(sprites.sword, -18, -82);
    ctx.shadowBlur = 0;
    ctx.drawImage(sprites.arm, -15, -10);
    ctx.restore();

    ctx.restore();
  }
}
