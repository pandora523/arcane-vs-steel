import { Fighter } from './Fighter.js';

export class Warrior extends Fighter {
  constructor(x, groundY) {
    super({
      name: 'Aethelgard',
      x,
      groundY,
      facing: 1,
      maxHp: 1200,
      attackRange: 105,
      moveSpeed: 175,
      autoInterval: 1.15,
      lightColor: 'rgba(56, 189, 248, 1)',
      primaryColor: '#38bdf8'
    });
    this.ultName = 'HEAVENLY EARTHSHATTER';
    this.skillName = 'Whirlwind';
    this.swordAngle = -0.8;
    this.spinAngle = 0;
    this.isDeflecting = false;
  }

  updateAutoAttack(dt, enemy, game) {
    const t = this.stateTimer;
    if (t < 0.24) {
      // Wind-up
      this.torsoAngle = -this.facing * 0.35 * (t / 0.24);
      this.swordAngle = -2.1;
    } else if (t < 0.42) {
      // Strike & Recoil
      if (!this.didActionFrame) {
        this.didActionFrame = true;
        this.vx += this.facing * 150;
        this.torsoVel = this.facing * 16;
        const startA = this.facing === 1 ? -1.4 : Math.PI - 0.8;
        const endA = this.facing === 1 ? 0.9 : Math.PI + 1.4;
        game.vfx.spawnSlash(this.x + this.facing * 18, this.y - 45, 76, startA, endA, '#38bdf8', 0.24);
        game.vfx.spawnSlash(this.x + this.facing * 18, this.y - 45, 62, startA, endA, '#ffffff', 0.18);

        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= this.attackRange + 32) {
          const isCrit = Math.random() < 0.28;
          const dmg = isCrit ? 98 : 64;
          enemy.takeDamage(dmg, this, isCrit, 160, -90);
          game.vfx.spawnBurst(enemy.x, enemy.y - 48, 14, '#bae6fd', 220);
        }
      }
      this.swordAngle = 0.85;
    } else if (t >= 0.65) {
      this.swordAngle = -0.8;
      this.setState('IDLE');
    }
  }

  updateSkill(dt, enemy, game) {
    const t = this.stateTimer;
    this.isDeflecting = t >= 0.15 && t <= 0.95;

    if (t < 0.15) {
      // Telegraph crouch
      this.torsoAngle = -this.facing * 0.3;
    } else if (t < 0.95) {
      // Whirlwind Dash spin forward
      this.spinAngle += dt * 32;
      this.x += this.facing * 350 * dt;
      this.swordAngle = Math.sin(this.spinAngle) * 1.6;

      if (Math.random() < 0.6) {
        game.vfx.spawnShockwave(this.x, this.y - 42, 68, '#7dd3fc', 0.25, true);
      }

      // Deflect enemy projectiles
      for (const proj of game.vfx.projectiles) {
        if (proj.owner !== this && !proj.isMeteor && Math.hypot(proj.x - this.x, proj.y - (this.y - 45)) < 75) {
          proj.owner = this;
          proj.vx = -proj.vx * 1.25;
          proj.vy = -60;
          proj.color = '#38bdf8';
          game.vfx.spawnDamageText(this.x, this.y - 90, 0, false, 'DEFLECT!');
          game.vfx.spawnBurst(proj.x, proj.y, 12, '#38bdf8', 210);
          game.renderer.triggerShake(6, 0.15);
        }
      }

      // Multi-hit spin ticks
      if (!this.lastSpinTick || t - this.lastSpinTick >= 0.18) {
        this.lastSpinTick = t;
        game.vfx.spawnSlash(this.x, this.y - 44, 72, 0, Math.PI * 2, '#38bdf8', 0.16);
        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 92) {
          enemy.takeDamage(34, this, false, 110, -65);
        }
      }
    } else {
      this.isDeflecting = false;
      this.lastSpinTick = 0;
      this.swordAngle = -0.8;
      this.setState('IDLE');
    }
  }

  updateUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    if (t < 0.35) {
      // Charge golden aura before leap
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
      // Leap high off-screen
      if (this.y >= this.groundY - 5 && this.vy >= 0) {
        this.vy = -980;
        game.vfx.spawnShockwave(this.x, this.groundY, 110, '#38bdf8', 0.35, true);
      }
      if (enemy) {
        const targetX = enemy.x - this.facing * 45;
        this.x += (targetX - this.x) * 6 * dt;
      }
      this.swordAngle = -2.4;
    } else if (!this.didActionFrame) {
      // Slam down with blinding lightning & gold shockwave
      this.vy = 1650;
      if (this.y >= this.groundY - 8) {
        this.y = this.groundY;
        this.vy = 0;
        this.didActionFrame = true;
        this.swordAngle = 1.1;

        game.renderer.triggerShake(26, 0.65);
        game.renderer.triggerAberration(16);
        game.renderer.triggerHitStop(0.09);

        game.vfx.spawnLightning(this.x, -120, this.groundY, '#fef08a');
        game.vfx.spawnLightning(this.x + 28, -120, this.groundY, '#38bdf8');
        game.vfx.spawnShockwave(this.x, this.groundY, 280, '#facc15', 0.65, true);
        game.vfx.spawnShockwave(this.x, this.groundY - 30, 210, '#38bdf8', 0.5, false);
        game.vfx.spawnDecal(this.x, 155, 'fissure', '#facc15', 6.5);
        game.vfx.spawnBurst(this.x, this.groundY - 10, 42, '#facc15', 380, { upBias: 160, size: 9 });
        game.vfx.spawnBurst(this.x, this.groundY - 10, 30, '#38bdf8', 320, { upBias: 120, size: 7 });

        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 270) {
          enemy.takeDamage(215, this, true, 260, -440);
        }
      }
    } else if (t >= 1.35) {
      this.swordAngle = -0.8;
      this.setState('IDLE');
    }
  }

  draw(ctx, isReflection = false) {
    ctx.save();

    // 1. Flowing Physics Cape
    ctx.beginPath();
    ctx.moveTo(this.capeNodes[0].x, this.capeNodes[0].y);
    for (let i = 1; i < this.capeNodes.length; i++) {
      ctx.lineTo(this.capeNodes[i].x, this.capeNodes[i].y);
    }
    ctx.strokeStyle = this.hitFlash > 0 ? '#ffffff' : '#0284c7';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    ctx.translate(this.x, this.y);
    ctx.scale(this.facing, 1);

    // 2. Articulated Bouncy Legs
    const legSwing = this.state === 'WALK' ? Math.sin(this.walkPhase) * 14 : 0;
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-5, -26);
    ctx.lineTo(-8 - legSwing, 0);
    ctx.moveTo(5, -26);
    ctx.lineTo(8 + legSwing, 0);
    ctx.stroke();

    // 3. Spring-Rigged Plated Torso & Head
    ctx.translate(0, -26 + this.headBob * 0.4);
    ctx.rotate(this.torsoAngle * this.facing);

    // Armor Chestplate
    ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : '#475569';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-13, -32, 26, 32, 6);
    ctx.fill();
    ctx.stroke();

    // Glowing Core Crest
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(2, -18, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Helmet & Glowing Visor
    ctx.save();
    ctx.translate(0, -42 + this.headBob * 0.4);
    ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : '#64748b';
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();

    // Plume
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-2, -11);
    ctx.quadraticCurveTo(-14, -20, -18, -8);
    ctx.stroke();

    // Glowing Cyan Visor Slit
    ctx.fillStyle = '#bae6fd';
    ctx.fillRect(3, -3, 8, 3.5);
    ctx.restore();

    // 4. Articulated Sword Arm & Glowing Greatsword
    ctx.save();
    ctx.translate(6, -22);
    ctx.rotate(this.swordAngle);

    // Pauldron
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();

    // Greatsword Hilt
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(14, 0);
    ctx.moveTo(12, -9);
    ctx.lineTo(12, 9);
    ctx.stroke();

    // Glowing Runed Blade
    if (!isReflection) {
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 16;
    }
    const bladeGrad = ctx.createLinearGradient(14, 0, 74, 0);
    bladeGrad.addColorStop(0, '#ffffff');
    bladeGrad.addColorStop(0.5, '#7dd3fc');
    bladeGrad.addColorStop(1, '#0284c7');
    ctx.fillStyle = bladeGrad;
    ctx.beginPath();
    ctx.moveTo(14, -5);
    ctx.lineTo(66, -3);
    ctx.lineTo(76, 0);
    ctx.lineTo(66, 3);
    ctx.lineTo(14, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }
}
