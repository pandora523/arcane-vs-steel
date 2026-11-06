import { Fighter } from './Fighter.js';
import { PixelForge } from '../engine/PixelForge.js';

export class FireMage extends Fighter {
  constructor(x, groundY, facing = -1) {
    super({
      name: 'Ignis Sol',
      x,
      groundY,
      facing,
      maxHp: 1220,
      attackRange: 490,
      moveSpeed: 98,
      autoInterval: 1.5,
      lightColor: 'rgba(251, 146, 60, 1)',
      primaryColor: '#fb923c'
    });
    this.heroId = 'mage';
    this.theme = 'arcane';
    this.deathSfx = 'death_mage';
    this.skillMaxCooldown = 5.2;
    this.ultName = 'METEOR CATACLYSM';
    this.skillName = 'SOLAR PILLAR';
    this.runeOrbit = 0;
    this.blinkCooldown = 2.5;
  }

  update(dt, enemy, game) {
    this.runeOrbit += dt * 2.4;
    this.blinkCooldown = Math.max(0, this.blinkCooldown - dt);

    if (enemy && !enemy.isDead && (this.state === 'IDLE' || this.state === 'WALK')) {
      const dist = Math.abs(enemy.x - this.x);
      if (dist < 145 && this.blinkCooldown <= 0) {
        this.blinkCooldown = 8.5;
        const oldX = this.x;
        const ww = game.renderer.worldWidth;
        const destX = enemy.x < ww * 0.5 ? Math.min(ww - 110, enemy.x + 265) : Math.max(110, enemy.x - 265);

        game.vfx.spawnShockwave(oldX, this.y - 55, 95, '#facc15', 0.34);
        game.vfx.spawnBurst(oldX, this.y - 55, 16, '#fb923c', 220);
        game.vfx.spawnGlyphBurst(oldX, this.y - 60, 5, 'arcane');
        enemy.takeDamage(24, this, false, 75, 0);

        this.x = destX;
        this.vx = 0;
        for (let i = 0; i < this.capeNodes.length; i++) {
          this.capeNodes[i].x = this.x;
        }
        if (game.audio) game.audio.play('blink', this.x);
        game.vfx.spawnShockwave(this.x, this.y - 55, 95, '#fb923c', 0.34);
        game.vfx.spawnGlyphBurst(this.x, this.y - 60, 5, 'arcane');
        game.vfx.spawnDamageText(this.x, this.y - 125, 0, false, 'ARCANE BLINK!', '#fb923c');
      } else if (dist < 215) {
        this.x -= this.facing * this.moveSpeed * 0.65 * dt;
      }
    }
    super.update(dt, enemy, game);
  }

  updateAutoAttack(dt, enemy, game) {
    const t = this.stateTimer;
    if (t < 0.36) {
      // Frames 16, 17, 18: Deliberate overhead staff channeling windup + dynamic solar rune sparks
      this.torsoAngle = -this.facing * 0.18 * (t / 0.36);
      if (Math.random() < 0.55) {
        const a = t * 18;
        game.vfx.spawnParticle({
          x: this.x + this.facing * 42 + Math.cos(a) * 22,
          y: this.y - 78 + Math.sin(a) * 22,
          vx: -Math.cos(a) * 45,
          vy: -Math.sin(a) * 45,
          size: 5,
          color: '#fef08a',
          maxLife: 0.25
        });
      }
    } else if (t < 0.72) {
      // Frames 19, 20, 21: Forward spell release & Solar Comet Fireball
      if (!this.didActionFrame) {
        this.didActionFrame = true;
        this.vx -= this.facing * 65;
        this.torsoVel = -this.facing * 8;
        if (game.audio) game.audio.play('fireball', this.x);

        const spawnX = this.x + this.facing * 52;
        const spawnY = this.y - 78;
        const targetY = enemy ? enemy.y - 60 : spawnY;
        const dx = enemy ? enemy.x - spawnX : this.facing * 460;
        const dy = targetY - spawnY;
        const dist = Math.hypot(dx, dy) || 1;
        const speed = 475;

        game.vfx.spawnProjectile({
          x: spawnX,
          y: spawnY,
          vx: (dx / dist) * speed,
          vy: (dy / dist) * speed,
          radius: 15,
          color: '#fb923c',
          coreColor: '#fef08a',
          owner: this,
          damage: 94,
          type: 'fireball',
          isMeteor: false
        });
        game.vfx.spawnShockwave(spawnX, spawnY, 54, '#facc15', 0.24, false, true);
        game.vfx.spawnBurst(spawnX, spawnY, 12, '#fb923c', 180);
        game.vfx.spawnGlyphBurst(spawnX, spawnY, 4, 'arcane');
      }
    } else if (t >= 0.96) {
      this.setState('IDLE');
    }
  }

  updateSkill(dt, enemy, game) {
    const t = this.stateTimer;
    if (t >= 0.42 && !this.didActionFrame && enemy) {
      this.didActionFrame = true;
      this.vx -= this.facing * 85;
      if (game.audio) game.audio.play('flame_pillar', enemy.x);

      // Central Solar Cataclysm Tornado Pillar + 2 Flanking Hellfire Geysers + 3 Sky Solar Lances
      game.vfx.spawnFlamePillar(enemy.x, this.groundY, this, enemy, {
        theme: 'arcane',
        delay: 0.34,
        maxLife: 1.55,
        scaleWidth: 1.15
      });
      game.vfx.spawnFlamePillar(enemy.x - 95, this.groundY, this, enemy, {
        theme: 'arcane',
        delay: 0.52,
        maxLife: 1.35,
        scaleWidth: 0.72
      });
      game.vfx.spawnFlamePillar(enemy.x + 95, this.groundY, this, enemy, {
        theme: 'arcane',
        delay: 0.52,
        maxLife: 1.35,
        scaleWidth: 0.72
      });

      [-55, 0, 55].forEach((off, idx) => {
        game.vfx.spawnSkyStrike({
          x: enemy.x + off,
          y: -180 - idx * 45,
          groundY: this.groundY,
          vx: 0,
          vy: 1250,
          type: 'solar_lance',
          color: '#fb923c',
          coreColor: '#fef08a',
          owner: this,
          target: enemy,
          damage: 16,
          delay: 0.15 + idx * 0.1
        });
      });

      game.vfx.spawnShockwave(this.x, this.y - 75, 85, '#fb923c', 0.38);
      game.vfx.spawnGlyphBurst(this.x, this.y - 80, 6, 'arcane');
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

      if (Math.random() < 0.85) {
        const a = Math.random() * Math.PI * 2;
        game.vfx.spawnParticle({
          x: this.x + Math.cos(a) * 75,
          y: this.y - 65 + Math.sin(a) * 75,
          vx: -Math.cos(a) * 110,
          vy: -Math.sin(a) * 110,
          size: 7,
          color: Math.random() > 0.35 ? '#facc15' : '#fb923c',
          maxLife: 0.38
        });
      }
    } else if (!this.didActionFrame) {
      this.didActionFrame = true;
      if (game.audio) game.audio.play('meteor', this.x);
      const targetX = enemy ? enemy.x : game.renderer.worldWidth * 0.35;
      const startX = this.x - this.facing * 180;
      const startY = -160;
      const dx = targetX - startX;
      const dy = this.groundY - startY;
      const len = Math.hypot(dx, dy) || 1;
      const speed = 640;

      // Diagonal Solar Eclipse Orbital Laser Beam + Colossal Doomsday Meteor + Flanking Solar Lances
      game.vfx.spawnBeam({
        x1: startX,
        y1: startY,
        x2: targetX,
        y2: this.groundY,
        width: 58,
        color: '#fb923c',
        coreColor: '#fef08a',
        maxLife: 0.55
      });

      game.vfx.spawnProjectile({
        x: startX,
        y: startY,
        vx: (dx / len) * speed,
        vy: (dy / len) * speed,
        radius: 48,
        color: '#ea580c',
        coreColor: '#fef08a',
        owner: this,
        damage: 210,
        type: 'meteor',
        isMeteor: true
      });

      [-115, -55, 55, 115].forEach((off, idx) => {
        game.vfx.spawnSkyStrike({
          x: targetX + off,
          y: -220 - idx * 50,
          groundY: this.groundY,
          vx: 0,
          vy: 1320,
          type: 'solar_lance',
          color: '#fb923c',
          coreColor: '#fef08a',
          owner: this,
          target: enemy,
          damage: 22,
          delay: 0.08 * idx
        });
      });

      game.vfx.spawnGlyphBurst(this.x, this.y - 75, 10, 'arcane');
    } else if (t >= 1.65) {
      this.setState('IDLE');
    }
  }

  draw(ctx, isReflection = false) {
    const sprites = PixelForge.initAssets().mage;
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const hoverScale = this.isDead ? Math.max(0, 1 - (this.deathTimer || 0) * 2.5) : 1;
    const hoverY = Math.round((-8 + Math.sin(this.runeOrbit * 1.4) * 5) * hoverScale);
    const w = 208;
    const h = 208;
    const scaleDir = -this.facing;
    const frameIdx = PixelForge.getFrameIndex(this, this.runeOrbit);

    ctx.translate(Math.round(this.x), Math.round(this.y + hoverY));
    ctx.scale(scaleDir, 1);

    PixelForge.drawSheetFrame(ctx, sprites, this, w, h, this.runeOrbit, isReflection);

    if (this.hitFlash > 0 && !isReflection) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5;
      PixelForge.drawGhostFrame(ctx, sprites, frameIdx, w, h);
    }

    ctx.restore();
  }
}
