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
    this.ultName = 'ECLIPSE SUPERNOVA';
    this.skillName = 'SOLAR PILLAR';
    this.runeOrbit = 0;
    this.dodgeMaxCooldown = 3.1;
    this.dashMaxCooldown = 3.6;
    this.spawnedEclipse = false;
  }

  onStartDodge(enemy, game, dir) {
    const ww = game.renderer.worldWidth;
    this.dashDuration = 0.42;
    this.isBlinkTeleport = true;
    this.didBlink = false;
    this.blinkOriginX = this.x;
    this.vx = 0;

    // Teleport across the arena to the open side away from the enemy
    if (enemy) {
      const openSideDir = enemy.x < ww * 0.5 ? 1 : -1;
      this.blinkTargetX = Math.max(135, Math.min(ww - 135, enemy.x + openSideDir * 355));
      if (Math.abs(this.blinkTargetX - this.x) < 150) {
        this.blinkTargetX = Math.max(135, Math.min(ww - 135, enemy.x - openSideDir * 340));
      }
    } else {
      this.blinkTargetX = Math.max(135, Math.min(ww - 135, this.x + dir * 290));
    }

    if (game.audio) game.audio.play('blink', this.x);
    // Departure Solar Rift Portal + Lightning Flash
    game.vfx.spawnShockwave(this.x, this.y - 95, 96, '#facc15', 0.34, false, true);
    game.vfx.spawnShockwave(this.x, this.groundY, 110, '#fb923c', 0.32, true);
    game.vfx.spawnLightning(this.x, this.groundY - 220, this.groundY, '#fef08a', '#fb923c');
    game.vfx.spawnBurst(this.x, this.y - 95, 18, '#fb923c', 230);
    game.vfx.spawnGlyphBurst(this.x, this.y - 100, 7, 'arcane');
    game.vfx.spawnDamageText(this.x, this.y - 145, 0, false, 'ARCANE BLINK!', '#facc15');
  }

  onStartDash(enemy, game, dir) {
    this.dashDuration = 0.42;
    this.isBlinkTeleport = false;
    this.vx = dir * 350;
    if (game.audio) game.audio.play('fireball', this.x);
    game.vfx.spawnShockwave(this.x, this.y - 95, 76, '#fb923c', 0.26, false, true);
    game.vfx.spawnGlyphBurst(this.x, this.y - 100, 5, 'arcane');
    game.vfx.spawnDamageText(this.x, this.y - 140, 0, false, 'IGNIS SURGE!', '#facc15');
  }

  updateDashOrDodge(dt, enemy, game) {
    const t = this.stateTimer;

    if (this.isBlinkTeleport) {
      if (t >= 0.14 && !this.didBlink) {
        this.didBlink = true;
        this.x = this.blinkTargetX;
        if (enemy) {
          this.facing = enemy.x >= this.x ? 1 : -1;
        }
        // Arrival Solar Rift Portal + Lightning Flash at teleport destination
        game.vfx.spawnShockwave(this.x, this.y - 95, 105, '#fef08a', 0.36, false, true);
        game.vfx.spawnShockwave(this.x, this.groundY, 120, '#fb923c', 0.34, true);
        game.vfx.spawnLightning(this.x, this.groundY - 220, this.groundY, '#ffffff', '#fb923c');
        game.vfx.spawnBurst(this.x, this.y - 95, 20, '#fef08a', 250);
        game.vfx.spawnGlyphBurst(this.x, this.y - 105, 8, 'arcane');
      }
      if (t >= this.dashDuration) {
        this.isBlinkTeleport = false;
        this.isInvulnerable = false;
        this.setState('IDLE');
      }
      return;
    }

    this.x += this.dashDir * 310 * dt;

    if (Math.random() < 0.72) {
      game.vfx.spawnParticle({
        x: this.x - this.dashDir * 16,
        y: this.y - 90 + (Math.random() - 0.5) * 36,
        vx: -this.dashDir * 75,
        vy: -45 - Math.random() * 35,
        size: 6,
        color: Math.random() > 0.4 ? '#fb923c' : '#fef08a',
        maxLife: 0.3
      });
    }

    if (t >= this.dashDuration) {
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  update(dt, enemy, game) {
    this.runeOrbit += dt * 2.4;

    if (enemy && !enemy.isDead && (this.state === 'IDLE' || this.state === 'WALK')) {
      const dist = Math.abs(enemy.x - this.x);
      const ww = game.renderer.worldWidth;
      const nearWall = this.x < 220 || this.x > ww - 220;
      if ((dist < 220 || (nearWall && dist < 285)) && this.dodgeCooldown <= 0) {
        this.startDodge(enemy, game);
        return;
      }
      if (dist < 215) {
        this.x -= this.facing * this.moveSpeed * 0.68 * dt;
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
          y: this.y - 115 + Math.sin(a) * 22,
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
        const spawnY = this.y - 115;
        const targetY = enemy ? enemy.y - 112 : spawnY;
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

      // Signature Pyromancer Skill: Triple Hellfire Eruption Pillars + Twin Arcing Solar Fire-Orbs (zero sky-lances!)
      game.vfx.spawnFlamePillar(enemy.x, this.groundY, this, enemy, {
        theme: 'arcane',
        delay: 0.32,
        maxLife: 1.55,
        scaleWidth: 1.18
      });
      game.vfx.spawnFlamePillar(enemy.x - 95, this.groundY, this, enemy, {
        theme: 'arcane',
        delay: 0.48,
        maxLife: 1.35,
        scaleWidth: 0.76
      });
      game.vfx.spawnFlamePillar(enemy.x + 95, this.groundY, this, enemy, {
        theme: 'arcane',
        delay: 0.48,
        maxLife: 1.35,
        scaleWidth: 0.76
      });

      // Twin Solar Orbs launched from Ignis Sol's staff
      const sx = this.x + this.facing * 48;
      const sy = this.y - 115;
      const dx = enemy.x - sx;
      const dy = (enemy.y - 112) - sy;
      const dist = Math.hypot(dx, dy) || 1;
      [-45, 45].forEach((vyOff) => {
        game.vfx.spawnProjectile({
          x: sx,
          y: sy,
          vx: (dx / dist) * 510,
          vy: (dy / dist) * 510 + vyOff,
          radius: 13,
          color: '#fb923c',
          coreColor: '#fef08a',
          owner: this,
          damage: 38,
          type: 'fireball'
        });
      });

      game.vfx.spawnShockwave(this.x, this.y - 110, 92, '#fb923c', 0.38);
      game.vfx.spawnGlyphBurst(this.x, this.y - 110, 7, 'arcane');
    } else if (t >= 1.05) {
      this.setState('IDLE');
    }
  }

  updateUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    // Stay planted firmly on the arena flagstones while channeling the Eclipse Supernova
    this.y = this.groundY;
    this.vy = 0;

    if (t < 0.75) {
      this.runeOrbit += dt * 7.5;

      // Conjure the Colossal Black-Gold Solar Eclipse Sphere overhead during channel!
      if (!this.spawnedEclipse) {
        this.spawnedEclipse = true;
        const targetX = enemy ? enemy.x : game.renderer.worldWidth * 0.5;
        game.vfx.spawnEclipseSupernova({
          x: (this.x + targetX) * 0.5,
          y: 165,
          groundY: this.groundY,
          maxRadius: 96,
          color: '#fb923c',
          coreColor: '#fef08a',
          maxLife: 1.45
        });
      }

      if (Math.random() < 0.85) {
        const a = Math.random() * Math.PI * 2;
        game.vfx.spawnParticle({
          x: this.x + Math.cos(a) * 75,
          y: this.y - 105 + Math.sin(a) * 75,
          vx: -Math.cos(a) * 110,
          vy: -Math.sin(a) * 110,
          size: 7,
          color: Math.random() > 0.35 ? '#facc15' : '#fb923c',
          maxLife: 0.38
        });
      }
    } else if (!this.didActionFrame) {
      this.didActionFrame = true;
      this.spawnedEclipse = false;
      if (game.audio) game.audio.play('meteor', this.x);
      const targetX = enemy ? enemy.x : game.renderer.worldWidth * 0.35;
      const eclipseX = (this.x + targetX) * 0.5;
      const eclipseY = 165;

      // Erupt a radial Supernova Shockwave from the Eclipse Sphere + hurl 3 Colossal Molten Meteors!
      game.vfx.spawnShockwave(eclipseX, eclipseY, 260, '#fef08a', 0.52);
      game.vfx.spawnShockwave(eclipseX, eclipseY, 190, '#fb923c', 0.42);
      game.vfx.spawnBurst(eclipseX, eclipseY, 28, '#fef08a', 320, { size: 8 });

      [-90, 0, 90].forEach((off, idx) => {
        const destX = targetX + off;
        const dx = destX - eclipseX;
        const dy = this.groundY - eclipseY;
        const len = Math.hypot(dx, dy) || 1;
        const speed = 640 - idx * 35;

        game.vfx.spawnProjectile({
          x: eclipseX + off * 0.25,
          y: eclipseY,
          vx: (dx / len) * speed,
          vy: (dy / len) * speed,
          radius: idx === 1 ? 46 : 32,
          color: '#ea580c',
          coreColor: '#fef08a',
          owner: this,
          damage: idx === 1 ? 135 : 55,
          type: 'meteor',
          isMeteor: true
        });
      });

      game.vfx.spawnGlyphBurst(this.x, this.y - 110, 10, 'arcane');
    } else if (t >= 1.55) {
      this.setState('IDLE');
    }
  }

  draw(ctx, isReflection = false) {
    const sprites = PixelForge.initAssets().mage;
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const w = 208;
    const h = 208;
    const scaleDir = -this.facing;
    const frameIdx = PixelForge.getFrameIndex(this, this.runeOrbit);

    ctx.translate(Math.round(this.x), Math.round(this.y));
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
