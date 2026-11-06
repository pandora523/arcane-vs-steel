import { Fighter } from './Fighter.js';
import { PixelForge } from '../engine/PixelForge.js';

export class FireMage extends Fighter {
  constructor(x, groundY) {
    super({
      name: 'Ignis Sol',
      x,
      groundY,
      facing: -1,
      maxHp: 1220,
      attackRange: 490,
      moveSpeed: 148,
      autoInterval: 1.25,
      lightColor: 'rgba(251, 146, 60, 1)',
      primaryColor: '#fb923c'
    });
    this.ultName = 'METEOR CATACLYSM';
    this.skillName = 'PILLAR';
    this.runeOrbit = 0;
    this.blinkCooldown = 2.0;
  }

  update(dt, enemy, game) {
    this.runeOrbit += dt * 3.2;
    this.blinkCooldown = Math.max(0, this.blinkCooldown - dt);

    if (enemy && !enemy.isDead && (this.state === 'IDLE' || this.state === 'WALK')) {
      const dist = Math.abs(enemy.x - this.x);
      if (dist < 155 && this.blinkCooldown <= 0) {
        this.blinkCooldown = 8.5;
        const oldX = this.x;
        const ww = game.renderer.worldWidth;
        const destX = enemy.x < ww * 0.5 ? Math.min(ww - 110, enemy.x + 265) : Math.max(110, enemy.x - 265);

        game.vfx.spawnShockwave(oldX, this.y - 55, 85, '#facc15', 0.3);
        game.vfx.spawnBurst(oldX, this.y - 55, 12, '#fb923c', 200);
        enemy.takeDamage(22, this, false, 95, -50);

        this.x = destX;
        this.vx = 0;
        for (let i = 0; i < this.capeNodes.length; i++) {
          this.capeNodes[i].x = this.x;
        }
        if (game.audio) game.audio.play('fireball');
        game.vfx.spawnShockwave(this.x, this.y - 55, 85, '#fb923c', 0.3);
        game.vfx.spawnDamageText(this.x, this.y - 125, 0, false, 'ARCANE BLINK!');
      } else if (dist < 220) {
        this.x -= this.facing * this.moveSpeed * 0.72 * dt;
      }
    }
    super.update(dt, enemy, game);
  }

  updateAutoAttack(dt, enemy, game) {
    const t = this.stateTimer;
    if (t < 0.22) {
      // Overhead Rune-Arc Channeling Pose (mage_windup.png)
      this.torsoAngle = -this.facing * 0.18;
    } else if (t < 0.5) {
      // Forward Staff Flame Thrust Pose (mage_attack.png)
      if (!this.didActionFrame) {
        this.didActionFrame = true;
        this.vx -= this.facing * 95;
        this.torsoVel = -this.facing * 9;
        if (game.audio) game.audio.play('fireball');

        const spawnX = this.x + this.facing * 52;
        const spawnY = this.y - 78;
        const targetY = enemy ? enemy.y - 60 : spawnY;
        const dx = enemy ? enemy.x - spawnX : this.facing * 460;
        const dy = targetY - spawnY;
        const dist = Math.hypot(dx, dy) || 1;
        const speed = 600;

        game.vfx.spawnProjectile({
          x: spawnX,
          y: spawnY,
          vx: (dx / dist) * speed,
          vy: (dy / dist) * speed,
          radius: 14,
          color: '#fb923c',
          coreColor: '#fef08a',
          owner: this,
          damage: 98,
          isMeteor: false
        });
        game.vfx.spawnBurst(spawnX, spawnY, 8, '#fb923c', 160);
      }
    } else {
      this.setState('IDLE');
    }
  }

  updateSkill(dt, enemy, game) {
    const t = this.stateTimer;
    if (t < 0.32) {
      if (!this.didActionFrame && enemy) {
        this.didActionFrame = true;
        this.vx -= this.facing * 110;
        if (game.audio) game.audio.play('flame_pillar');
        game.vfx.spawnFlamePillar(enemy.x, this.groundY, this, enemy);
        game.vfx.spawnShockwave(this.x, this.y - 75, 65, '#fb923c', 0.35);
      }
    } else if (t >= 0.78) {
      this.setState('IDLE');
    }
  }

  updateUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    if (t < 0.7) {
      this.vy = -45;
      this.y = Math.max(this.groundY - 135, this.y - 170 * dt);
      this.runeOrbit += dt * 9.5;

      if (Math.random() < 0.7) {
        const a = Math.random() * Math.PI * 2;
        game.vfx.spawnParticle({
          x: this.x + Math.cos(a) * 65,
          y: this.y - 65 + Math.sin(a) * 65,
          vx: -Math.cos(a) * 95,
          vy: -Math.sin(a) * 95,
          size: 7,
          color: '#facc15',
          maxLife: 0.38
        });
      }
    } else if (!this.didActionFrame) {
      this.didActionFrame = true;
      if (game.audio) game.audio.play('meteor');
      const targetX = enemy ? enemy.x : game.renderer.worldWidth * 0.35;
      const startX = this.x - this.facing * 180;
      const startY = -160;
      const dx = targetX - startX;
      const dy = this.groundY - startY;
      const len = Math.hypot(dx, dy) || 1;
      const speed = 820;

      game.vfx.spawnProjectile({
        x: startX,
        y: startY,
        vx: (dx / len) * speed,
        vy: (dy / len) * speed,
        radius: 46,
        color: '#ea580c',
        coreColor: '#fef08a',
        owner: this,
        damage: 220,
        isMeteor: true
      });
    } else if (t >= 1.45) {
      this.setState('IDLE');
    }
  }

  draw(ctx, isReflection = false) {
    const sprites = PixelForge.initAssets().mage;
    const img = PixelForge.selectFrame(sprites, this);
    if (!img || !img.complete || !img.naturalWidth) return;

    ctx.save();
    ctx.imageSmoothingEnabled = true;

    const hoverY = -14 + Math.sin(this.runeOrbit * 1.6) * 9;
    const w = 178;
    const h = 180;
    const scaleDir = -this.facing;

    if (!isReflection && (this.state === 'SKILL' || this.state === 'ULTIMATE' || this.state === 'AUTO_ATTACK')) {
      for (let g = 1; g <= 2; g++) {
        ctx.save();
        ctx.globalAlpha = 0.18 / g;
        ctx.translate(this.x - this.facing * g * 18, this.y + hoverY);
        ctx.scale(scaleDir, 1);
        ctx.drawImage(img, -w * 0.5, -h + 8, w, h);
        ctx.restore();
      }
    }

    const breatheY = 1 + Math.sin(this.runeOrbit * 1.1) * 0.032;
    const breatheX = 1 - Math.sin(this.runeOrbit * 1.1) * 0.02;
    const tilt =
      this.state === 'WALK'
        ? Math.sin(this.runeOrbit * 1.5) * 0.06 - 0.05
        : this.torsoAngle * scaleDir * 0.4;

    ctx.translate(this.x, this.y + hoverY);
    ctx.scale(scaleDir * breatheX, breatheY);
    ctx.rotate(tilt);

    PixelForge.drawDeformedSprite(ctx, img, w, h, this.runeOrbit, this.state, isReflection);

    if (this.hitFlash > 0 && !isReflection) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.55;
      ctx.drawImage(img, -w * 0.5, -h + 8, w, h);
    }

    ctx.restore();
  }
}
