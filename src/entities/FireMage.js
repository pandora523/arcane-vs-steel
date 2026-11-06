import { Fighter } from './Fighter.js';
import { PixelForge } from '../engine/PixelForge.js';

export class FireMage extends Fighter {
  constructor(x, groundY) {
    super({
      name: 'Ignis Sol',
      x,
      groundY,
      facing: -1,
      maxHp: 950,
      attackRange: 470,
      moveSpeed: 145,
      autoInterval: 1.35,
      lightColor: 'rgba(251, 146, 60, 1)',
      primaryColor: '#fb923c'
    });
    this.ultName = 'METEOR CATACLYSM';
    this.skillName = 'PILLAR';
    this.staffAngle = 0.2;
    this.runeOrbit = 0;
  }

  update(dt, enemy, game) {
    this.runeOrbit += dt * 2.8;
    if (enemy && !enemy.isDead && (this.state === 'IDLE' || this.state === 'WALK')) {
      const dist = Math.abs(enemy.x - this.x);
      if (dist < 230) {
        this.x -= this.facing * this.moveSpeed * 0.9 * dt;
      }
    }
    super.update(dt, enemy, game);
  }

  updateAutoAttack(dt, enemy, game) {
    const t = this.stateTimer;
    if (t < 0.28) {
      this.torsoAngle = -this.facing * 0.25;
      this.staffAngle = -0.55;
    } else if (t < 0.55) {
      if (!this.didActionFrame) {
        this.didActionFrame = true;
        this.vx -= this.facing * 125;
        this.torsoVel = -this.facing * 12;
        this.staffAngle = 0.75;

        const spawnX = this.x + this.facing * 38;
        const spawnY = this.y - 52;
        const targetY = enemy ? enemy.y - 46 : spawnY;
        const dx = enemy ? enemy.x - spawnX : this.facing * 450;
        const dy = targetY - spawnY;
        const dist = Math.hypot(dx, dy) || 1;
        const speed = 560;

        game.vfx.spawnProjectile({
          x: spawnX,
          y: spawnY,
          vx: (dx / dist) * speed,
          vy: (dy / dist) * speed,
          radius: 13,
          color: '#fb923c',
          coreColor: '#fef08a',
          owner: this,
          damage: 58,
          isMeteor: false
        });
        game.vfx.spawnBurst(spawnX, spawnY, 10, '#fb923c', 150);
      }
    } else {
      this.staffAngle = 0.2;
      this.setState('IDLE');
    }
  }

  updateSkill(dt, enemy, game) {
    const t = this.stateTimer;
    if (t < 0.35) {
      this.staffAngle = -0.95;
      if (!this.didActionFrame && enemy) {
        this.didActionFrame = true;
        this.vx -= this.facing * 150;
        game.vfx.spawnFlamePillar(enemy.x + enemy.vx * 0.15, this.groundY, this, enemy);
        game.vfx.spawnShockwave(this.x, this.y - 70, 55, '#fb923c', 0.35);
      }
    } else if (t >= 0.85) {
      this.staffAngle = 0.2;
      this.setState('IDLE');
    }
  }

  updateUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    if (t < 0.75) {
      this.vy = -40;
      this.y = Math.max(this.groundY - 125, this.y - 160 * dt);
      this.staffAngle = -1.1;
      this.runeOrbit += dt * 9;

      if (Math.random() < 0.85) {
        const a = Math.random() * Math.PI * 2;
        game.vfx.spawnParticle({
          x: this.x + Math.cos(a) * 55,
          y: this.y - 45 + Math.sin(a) * 55,
          vx: -Math.cos(a) * 90,
          vy: -Math.sin(a) * 90,
          size: 6,
          color: '#facc15',
          maxLife: 0.4
        });
      }
    } else if (!this.didActionFrame) {
      this.didActionFrame = true;
      const targetX = enemy ? enemy.x : game.renderer.worldWidth * 0.35;
      const startX = this.x - this.facing * 180;
      const startY = -140;
      const dx = targetX - startX;
      const dy = this.groundY - startY;
      const len = Math.hypot(dx, dy) || 1;
      const speed = 780;

      game.vfx.spawnProjectile({
        x: startX,
        y: startY,
        vx: (dx / len) * speed,
        vy: (dy / len) * speed,
        radius: 42,
        color: '#ea580c',
        coreColor: '#fef08a',
        owner: this,
        damage: 225,
        isMeteor: true
      });
    } else if (t >= 1.55) {
      this.staffAngle = 0.2;
      this.setState('IDLE');
    }
  }

  draw(ctx, isReflection = false) {
    const sprites = PixelForge.initAssets().mage;
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Pixel-Art Flowing Ember Cloak
    for (let i = 0; i < this.capeNodes.length - 1; i++) {
      const a = this.capeNodes[i];
      const b = this.capeNodes[i + 1];
      ctx.strokeStyle = this.hitFlash > 0 ? '#ffffff' : i === 0 ? '#7c2d12' : '#9a3412';
      ctx.lineWidth = 20 - i * 2.5;
      ctx.lineCap = 'square';
      ctx.beginPath();
      ctx.moveTo(Math.round(a.x), Math.round(a.y));
      ctx.lineTo(Math.round(b.x), Math.round(b.y));
      ctx.stroke();
    }

    ctx.translate(Math.round(this.x), Math.round(this.y));
    ctx.scale(this.facing, 1);

    // Spinning Arcane Sigil Ring when casting/ulting
    if (this.state === 'ULTIMATE' || this.state === 'SKILL') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.translate(0, -48);
      ctx.rotate(this.runeOrbit);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 52, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        ctx.fillStyle = '#fb923c';
        ctx.fillRect(Math.cos(a) * 52 - 4, Math.sin(a) * 52 - 4, 8, 8);
      }
      ctx.restore();
    }

    const stride = this.state === 'WALK' ? Math.sin(this.walkPhase) * 0.45 : 0;
    const breathe = Math.sin(this.walkPhase) * 2;

    // 2. Back Leg & Back Arm
    ctx.save();
    ctx.translate(-6, -30);
    ctx.rotate(-stride);
    ctx.drawImage(sprites.leg, -12, 0);
    ctx.restore();

    ctx.save();
    ctx.translate(-10, -58 + breathe);
    ctx.rotate(stride * 0.6);
    ctx.drawImage(sprites.arm, -12, -6);
    ctx.restore();

    // 3. Spring-Rigged Pixel Robe Torso & Hooded Head
    ctx.translate(0, -30 + this.headBob * 0.45);
    ctx.rotate(this.torsoAngle * this.facing);

    ctx.drawImage(sprites.torso, -24, -46 + breathe * 0.5);

    ctx.save();
    ctx.translate(0, -64 + breathe);
    ctx.rotate(Math.sin(this.walkPhase * 0.5) * 0.05);
    ctx.drawImage(sprites.head, -21, -24);
    ctx.restore();

    // 4. Orbiting Pixel Arcane Runes
    for (let i = 0; i < 3; i++) {
      const a = this.runeOrbit + i * ((Math.PI * 2) / 3);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(Math.round(Math.cos(a) * 28) - 3, Math.round(-38 + Math.sin(a) * 9) - 3, 6, 6);
    }

    // 5. Front Leg
    ctx.save();
    ctx.translate(6, 0);
    ctx.rotate(stride);
    ctx.drawImage(sprites.leg, -12, 0);
    ctx.restore();

    // 6. Front Arm & Levitating Pixel Ember Staff
    ctx.save();
    const floatY = Math.sin(this.runeOrbit * 1.5) * 4;
    ctx.translate(14, -26 + floatY);
    ctx.rotate(this.staffAngle);

    if (!isReflection) {
      ctx.shadowColor = '#fb923c';
      ctx.shadowBlur = 16;
    }
    ctx.drawImage(sprites.staff, -15, -62);
    ctx.shadowBlur = 0;
    ctx.drawImage(sprites.arm, -12, -10);
    ctx.restore();

    ctx.restore();
  }
}
