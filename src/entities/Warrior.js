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
    this.swordAngle = -0.75;
    this.shieldOffsetX = 14;
    this.shieldOffsetY = -26;
    this.comboStep = 0;
    this.spinAngle = 0;
    this.isDeflecting = false;
    this.stepDustTimer = 0;
  }

  update(dt, enemy, game) {
    if (this.state === 'WALK') {
      this.stepDustTimer += dt;
      if (this.stepDustTimer >= 0.28) {
        this.stepDustTimer = 0;
        game.vfx.spawnBurst(this.x - this.facing * 10, this.groundY - 2, 3, '#64748b', 60, {
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

    if (t < 0.18) {
      this.torsoAngle = -this.facing * 0.38 * (t / 0.18);
      this.swordAngle = mode === 2 ? 1.35 : -2.25;
      this.shieldOffsetX = 8;
    } else if (t < 0.4) {
      if (!this.didActionFrame) {
        this.didActionFrame = true;
        this.comboStep++;
        this.vx += this.facing * 195;
        this.torsoVel = this.facing * 18;
        this.shieldOffsetX = 18;
        if (game.audio) game.audio.play('slash');

        const cx = this.x + this.facing * 24;
        const cy = this.y - 50;
        const startA = this.facing === 1 ? -1.55 : Math.PI - 0.9;
        const endA = this.facing === 1 ? 0.95 : Math.PI + 1.55;

        game.vfx.spawnSlash(cx, cy, 90, startA, endA, '#0284c7', 0.24);
        game.vfx.spawnSlash(cx, cy, 76, startA, endA, '#38bdf8', 0.2);
        game.vfx.spawnSlash(cx, cy, 62, startA, endA, '#ffffff', 0.15);

        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= this.attackRange + 42) {
          const isCrit = mode === 2 || Math.random() < 0.25;
          const dmg = isCrit ? 116 : 76;
          enemy.takeDamage(dmg, this, isCrit, 145, mode === 2 ? -150 : -75);
          if (game.audio) game.audio.play('clang');
          game.vfx.spawnBurst(enemy.x, enemy.y - 50, 10, '#bae6fd', 220);
        }
      }
      this.swordAngle = mode === 2 ? -1.6 : 1.05;
    } else if (t >= 0.58) {
      this.swordAngle = -0.75;
      this.shieldOffsetX = 14;
      this.setState('IDLE');
    }
  }

  updateSkill(dt, enemy, game) {
    const t = this.stateTimer;
    this.isDeflecting = t >= 0.1 && t <= 0.9;

    if (t < 0.1) {
      this.torsoAngle = -this.facing * 0.32;
      this.shieldOffsetX = 20;
    } else if (t < 0.9) {
      if (!this.didActionFrame) {
        this.didActionFrame = true;
        if (game.audio) game.audio.play('whirlwind');
      }
      this.spinAngle += dt * 34;
      this.x += this.facing * 435 * dt;
      this.swordAngle = Math.sin(this.spinAngle) * 1.75;

      if (Math.random() < 0.5) {
        game.vfx.spawnShockwave(this.x, this.y - 44, 78, '#7dd3fc', 0.2, true);
      }

      for (const proj of game.vfx.projectiles) {
        if (proj.owner !== this && !proj.isMeteor && Math.hypot(proj.x - this.x, proj.y - (this.y - 48)) < 88) {
          proj.owner = this;
          proj.vx = -proj.vx * 1.3;
          proj.vy = -40;
          proj.color = '#38bdf8';
          if (game.audio) game.audio.play('clang');
          game.vfx.spawnDamageText(this.x, this.y - 98, 0, false, 'AEGIS REFLECT!');
          game.vfx.spawnBurst(proj.x, proj.y, 10, '#38bdf8', 210);
          game.renderer.triggerShake(6, 0.14);
        }
      }

      if (!this.lastSpinTick || t - this.lastSpinTick >= 0.18) {
        this.lastSpinTick = t;
        game.vfx.spawnSlash(this.x, this.y - 48, 84, 0, Math.PI * 2, '#38bdf8', 0.15);
        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 110) {
          enemy.takeDamage(42, this, false, 95, -55);
        }
      }
    } else {
      this.isDeflecting = false;
      this.lastSpinTick = 0;
      this.swordAngle = -0.75;
      this.shieldOffsetX = 14;
      this.setState('IDLE');
    }
  }

  updateUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    if (t < 0.35) {
      this.swordAngle = -1.95;
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
      this.swordAngle = -2.45;
    } else if (!this.didActionFrame) {
      this.vy = 1750;
      if (this.y >= this.groundY - 8) {
        this.y = this.groundY;
        this.vy = 0;
        this.didActionFrame = true;
        this.swordAngle = 1.15;
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
      this.swordAngle = -0.75;
      this.setState('IDLE');
    }
  }

  draw(ctx) {
    const sprites = PixelForge.initAssets().warrior;
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    for (let i = 0; i < this.capeNodes.length - 1; i++) {
      const a = this.capeNodes[i];
      const b = this.capeNodes[i + 1];
      ctx.strokeStyle = this.hitFlash > 0 ? '#ffffff' : i === 0 ? '#0369a1' : '#0284c7';
      ctx.lineWidth = 22 - i * 2.5;
      ctx.lineCap = 'square';
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    ctx.translate(this.x, this.y);
    ctx.scale(this.facing, 1);

    const stride = this.state === 'WALK' ? Math.sin(this.walkPhase) * 0.6 : 0;
    const stompLift = this.state === 'WALK' ? Math.max(0, -Math.sin(this.walkPhase) * 8) : 0;
    const breathe = Math.sin(this.walkPhase) * 2;

    ctx.save();
    ctx.translate(-9, -28);
    ctx.rotate(-stride);
    ctx.drawImage(sprites.leg, -12, 0);
    ctx.restore();

    ctx.translate(0, -30 + this.headBob * 0.45);
    ctx.rotate(this.torsoAngle * this.facing);

    ctx.drawImage(sprites.torso, -27, -50 + breathe * 0.5);

    ctx.save();
    ctx.translate(0, -68 + breathe);
    ctx.rotate(Math.sin(this.walkPhase * 0.5) * 0.05);
    ctx.drawImage(sprites.helmet, -26, -30);
    ctx.restore();

    ctx.save();
    ctx.translate(9, -stompLift * 0.4);
    ctx.rotate(stride);
    ctx.drawImage(sprites.leg, -12, 0);
    ctx.restore();

    ctx.save();
    ctx.translate(this.shieldOffsetX, this.shieldOffsetY + breathe * 0.7);
    ctx.rotate(this.isDeflecting ? 0.15 : -0.08);
    ctx.drawImage(sprites.shield, -18, -30);
    ctx.restore();

    ctx.save();
    ctx.translate(-6, -34 + breathe);
    ctx.rotate(this.swordAngle + Math.PI * 0.5);
    ctx.drawImage(sprites.sword, -21, -92);
    ctx.drawImage(sprites.arm, -18, -12);
    ctx.restore();

    ctx.restore();
  }
}
