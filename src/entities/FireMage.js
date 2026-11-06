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
      attackRange: 480,
      moveSpeed: 150,
      autoInterval: 1.3,
      lightColor: 'rgba(251, 146, 60, 1)',
      primaryColor: '#fb923c'
    });
    this.ultName = 'METEOR CATACLYSM';
    this.skillName = 'PILLAR';
    this.staffAngle = 0.18;
    this.runeOrbit = 0;
  }

  update(dt, enemy, game) {
    this.runeOrbit += dt * 3.1;
    if (enemy && !enemy.isDead && (this.state === 'IDLE' || this.state === 'WALK')) {
      const dist = Math.abs(enemy.x - this.x);
      if (dist < 240) {
        this.x -= this.facing * this.moveSpeed * 0.92 * dt;
      }
    }
    super.update(dt, enemy, game);
  }

  updateAutoAttack(dt, enemy, game) {
    const t = this.stateTimer;
    if (t < 0.26) {
      this.torsoAngle = -this.facing * 0.22;
      this.staffAngle = -0.6;
    } else if (t < 0.54) {
      if (!this.didActionFrame) {
        this.didActionFrame = true;
        this.vx -= this.facing * 120;
        this.torsoVel = -this.facing * 11;
        this.staffAngle = 0.78;
        if (game.audio) game.audio.play('fireball');

        const spawnX = this.x + this.facing * 42;
        const spawnY = this.y - 64;
        const targetY = enemy ? enemy.y - 48 : spawnY;
        const dx = enemy ? enemy.x - spawnX : this.facing * 460;
        const dy = targetY - spawnY;
        const dist = Math.hypot(dx, dy) || 1;
        const speed = 580;

        game.vfx.spawnProjectile({
          x: spawnX,
          y: spawnY,
          vx: (dx / dist) * speed,
          vy: (dy / dist) * speed,
          radius: 14,
          color: '#fb923c',
          coreColor: '#fef08a',
          owner: this,
          damage: 60,
          isMeteor: false
        });
        game.vfx.spawnBurst(spawnX, spawnY, 12, '#fb923c', 165);
      }
    } else {
      this.staffAngle = 0.18;
      this.setState('IDLE');
    }
  }

  updateSkill(dt, enemy, game) {
    const t = this.stateTimer;
    if (t < 0.35) {
      this.staffAngle = -0.95;
      if (!this.didActionFrame && enemy) {
        this.didActionFrame = true;
        this.vx -= this.facing * 155;
        if (game.audio) game.audio.play('flame_pillar');
        game.vfx.spawnFlamePillar(enemy.x + enemy.vx * 0.15, this.groundY, this, enemy);
        game.vfx.spawnShockwave(this.x, this.y - 75, 65, '#fb923c', 0.38);
      }
    } else if (t >= 0.85) {
      this.staffAngle = 0.18;
      this.setState('IDLE');
    }
  }

  updateUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    if (t < 0.75) {
      this.vy = -45;
      this.y = Math.max(this.groundY - 135, this.y - 170 * dt);
      this.staffAngle = -1.15;
      this.runeOrbit += dt * 9.5;

      if (Math.random() < 0.85) {
        const a = Math.random() * Math.PI * 2;
        game.vfx.spawnParticle({
          x: this.x + Math.cos(a) * 60,
          y: this.y - 55 + Math.sin(a) * 60,
          vx: -Math.cos(a) * 95,
          vy: -Math.sin(a) * 95,
          size: 7,
          color: '#facc15',
          maxLife: 0.4
        });
      }
    } else if (!this.didActionFrame) {
      this.didActionFrame = true;
      if (game.audio) game.audio.play('meteor');
      const targetX = enemy ? enemy.x : game.renderer.worldWidth * 0.35;
      const startX = this.x - this.facing * 190;
      const startY = -160;
      const dx = targetX - startX;
      const dy = this.groundY - startY;
      const len = Math.hypot(dx, dy) || 1;
      const speed = 800;

      game.vfx.spawnProjectile({
        x: startX,
        y: startY,
        vx: (dx / len) * speed,
        vy: (dy / len) * speed,
        radius: 46,
        color: '#ea580c',
        coreColor: '#fef08a',
        owner: this,
        damage: 230,
        isMeteor: true
      });
    } else if (t >= 1.55) {
      this.staffAngle = 0.18;
      this.setState('IDLE');
    }
  }

  draw(ctx, isReflection = false) {
    const sprites = PixelForge.initAssets().mage;
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const hoverY = -16 + Math.sin(this.runeOrbit * 1.4) * 6;

    // 1. Billowing Flame Scarf / Cloak Ribbon
    for (let i = 0; i < this.capeNodes.length - 1; i++) {
      const a = this.capeNodes[i];
      const b = this.capeNodes[i + 1];
      ctx.strokeStyle = this.hitFlash > 0 ? '#ffffff' : i < 2 ? '#9a3412' : '#ea580c';
      ctx.lineWidth = 18 - i * 2.5;
      ctx.lineCap = 'square';
      ctx.beginPath();
      ctx.moveTo(Math.round(a.x), Math.round(a.y + hoverY * 0.5));
      ctx.lineTo(Math.round(b.x), Math.round(b.y + hoverY * 0.5));
      ctx.stroke();
    }

    ctx.translate(Math.round(this.x), Math.round(this.y + hoverY));
    ctx.scale(this.facing, 1);

    // 2. Ground Levitation Ember Vortex (Replaces legs)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(0, -hoverY - 3);
    ctx.scale(1, 0.28);
    ctx.strokeStyle = '#fb923c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 26 + Math.sin(this.runeOrbit * 2) * 4, this.runeOrbit, this.runeOrbit + Math.PI * 1.5);
    ctx.stroke();
    ctx.restore();

    // 3. Kael'thas-Style Halo of 5 Blazing Fire Orbs Behind Shoulders
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) {
      const baseA = -Math.PI * 0.85 + (i / 4) * (Math.PI * 0.7);
      const bob = Math.sin(this.runeOrbit * 2 + i) * 4;
      const ox = Math.cos(baseA) * 38;
      const oy = -52 + Math.sin(baseA) * 34 + bob;
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(ox - 5, oy - 5, 10, 10);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(ox - 3, oy - 3, 6, 6);
    }
    ctx.restore();

    // 4. Levitating Arch-Mage Robe Skirt & Tall Wizard Hat
    ctx.translate(0, -10);
    ctx.rotate(this.torsoAngle * this.facing * 0.8);

    ctx.drawImage(sprites.torso, -27, -64);

    ctx.save();
    ctx.translate(0, -68 + Math.sin(this.runeOrbit * 1.5) * 2);
    ctx.rotate(Math.sin(this.runeOrbit * 0.7) * 0.05);
    ctx.drawImage(sprites.head, -27, -48);
    ctx.restore();

    // 5. Floating Open Spellbook / Grimoire in Front of Mage
    ctx.save();
    const bookBob = Math.sin(this.runeOrbit * 2.2) * 5;
    ctx.translate(28, -42 + bookBob);
    ctx.rotate(this.state === 'AUTO_ATTACK' || this.state === 'SKILL' ? -0.25 : 0.08);
    if (!isReflection) {
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 12;
    }
    ctx.drawImage(sprites.book, -18, -15);
    ctx.restore();

    // 6. Twin-Horn Dragon Flame Staff
    ctx.save();
    const staffFloat = Math.sin(this.runeOrbit * 1.6) * 4;
    ctx.translate(-10, -40 + staffFloat);
    ctx.rotate(this.staffAngle);

    if (!isReflection) {
      ctx.shadowColor = '#fb923c';
      ctx.shadowBlur = 18;
    }
    ctx.drawImage(sprites.staff, -18, -58);
    ctx.restore();

    ctx.restore();
  }
}
