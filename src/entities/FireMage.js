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
      moveSpeed: 98,
      autoInterval: 1.55,
      lightColor: 'rgba(251, 146, 60, 1)',
      primaryColor: '#fb923c'
    });
    this.skillMaxCooldown = 5.4;
    this.ultName = 'METEOR CATACLYSM';
    this.skillName = 'PILLAR';
    this.runeOrbit = 0;
    this.blinkCooldown = 2.5;
  }

  update(dt, enemy, game) {
    this.runeOrbit += dt * 2.4;
    this.blinkCooldown = Math.max(0, this.blinkCooldown - dt);

    if (enemy && !enemy.isDead && (this.state === 'IDLE' || this.state === 'WALK')) {
      const dist = Math.abs(enemy.x - this.x);
      if (dist < 145 && this.blinkCooldown <= 0) {
        this.blinkCooldown = 9.0;
        const oldX = this.x;
        const ww = game.renderer.worldWidth;
        const destX = enemy.x < ww * 0.5 ? Math.min(ww - 110, enemy.x + 255) : Math.max(110, enemy.x - 255);

        game.vfx.spawnShockwave(oldX, this.y - 55, 85, '#facc15', 0.32);
        game.vfx.spawnBurst(oldX, this.y - 55, 12, '#fb923c', 200);
        enemy.takeDamage(22, this, false, 75, 0);

        this.x = destX;
        this.vx = 0;
        for (let i = 0; i < this.capeNodes.length; i++) {
          this.capeNodes[i].x = this.x;
        }
        if (game.audio) game.audio.play('fireball');
        game.vfx.spawnShockwave(this.x, this.y - 55, 85, '#fb923c', 0.32);
        game.vfx.spawnDamageText(this.x, this.y - 125, 0, false, 'ARCANE BLINK!');
      } else if (dist < 215) {
        this.x -= this.facing * this.moveSpeed * 0.65 * dt;
      }
    }
    super.update(dt, enemy, game);
  }

  updateAutoAttack(dt, enemy, game) {
    const t = this.stateTimer;
    if (t < 0.36) {
      // Frames 16, 17, 18: Deliberate overhead rune-circle channeling windup
      this.torsoAngle = -this.facing * 0.18 * (t / 0.36);
    } else if (t < 0.72) {
      // Frames 19, 20, 21: Forward Dragon Staff pyre thrust & fireball release
      if (!this.didActionFrame) {
        this.didActionFrame = true;
        this.vx -= this.facing * 65;
        this.torsoVel = -this.facing * 8;
        if (game.audio) game.audio.play('fireball');

        const spawnX = this.x + this.facing * 52;
        const spawnY = this.y - 78;
        const targetY = enemy ? enemy.y - 60 : spawnY;
        const dx = enemy ? enemy.x - spawnX : this.facing * 460;
        const dy = targetY - spawnY;
        const dist = Math.hypot(dx, dy) || 1;
        const speed = 460;

        game.vfx.spawnProjectile({
          x: spawnX,
          y: spawnY,
          vx: (dx / dist) * speed,
          vy: (dy / dist) * speed,
          radius: 14,
          color: '#fb923c',
          coreColor: '#fef08a',
          owner: this,
          damage: 96,
          isMeteor: false
        });
        game.vfx.spawnBurst(spawnX, spawnY, 8, '#fb923c', 160);
      }
    } else if (t >= 0.96) {
      // Frames 22, 23: Staff follow-through & recovery
      this.setState('IDLE');
    }
  }

  updateSkill(dt, enemy, game) {
    const t = this.stateTimer;
    if (t >= 0.42 && !this.didActionFrame && enemy) {
      this.didActionFrame = true;
      this.vx -= this.facing * 85;
      if (game.audio) game.audio.play('flame_pillar');
      game.vfx.spawnFlamePillar(enemy.x, this.groundY, this, enemy);
      game.vfx.spawnShockwave(this.x, this.y - 75, 65, '#fb923c', 0.38);
    } else if (t >= 1.05) {
      this.setState('IDLE');
    }
  }

  updateUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    if (t < 0.85) {
      this.vy = -40;
      this.y = Math.max(this.groundY - 130, this.y - 145 * dt);
      this.runeOrbit += dt * 7.5;

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
      const speed = 640;

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
    } else if (t >= 1.65) {
      this.setState('IDLE');
    }
  }

  draw(ctx, isReflection = false) {
    const sprites = PixelForge.initAssets().mage;
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Subtle arcane levitation for the Fire Mage (exempted by user request)
    const hoverY = Math.round(-8 + Math.sin(this.runeOrbit * 1.4) * 5);
    const w = 192;
    const h = 192;
    const scaleDir = -this.facing;
    const frameIdx = PixelForge.getFrameIndex(this, this.runeOrbit);

    if (!isReflection && (this.state === 'SKILL' || this.state === 'ULTIMATE' || this.state === 'AUTO_ATTACK')) {
      for (let g = 1; g <= 2; g++) {
        ctx.save();
        ctx.globalAlpha = 0.2 / g;
        ctx.translate(Math.round(this.x - this.facing * g * 16), Math.round(this.y + hoverY));
        ctx.scale(scaleDir, 1);
        const ghostIdx = Math.max(0, frameIdx - g);
        PixelForge.drawGhostFrame(ctx, sprites, ghostIdx, w, h);
        ctx.restore();
      }
    }

    ctx.translate(Math.round(this.x), Math.round(this.y + hoverY));
    ctx.scale(scaleDir, 1);

    PixelForge.drawSheetFrame(ctx, sprites, this, w, h, this.runeOrbit, isReflection);

    if (this.hitFlash > 0 && !isReflection) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.6;
      PixelForge.drawGhostFrame(ctx, sprites, frameIdx, w, h);
    }

    ctx.restore();
  }
}
