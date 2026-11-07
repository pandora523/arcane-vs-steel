import { Fighter } from './Fighter.js';
import { PixelForge } from '../engine/PixelForge.js';

export class FireMage extends Fighter {
  constructor(x, groundY, facing = -1) {
    super({
      name: 'Ignis Sol',
      x,
      groundY,
      facing,
      maxHp: 1286,
      attackRange: 520,
      moveSpeed: 120,
      autoInterval: 1.30,
      lightColor: 'rgba(251, 146, 60, 1)',
      primaryColor: '#fb923c'
    });
    this.heroId = 'mage';
    this.theme = 'arcane';
    this.deathSfx = 'death_mage';
    this.skillMaxCooldown = 4.78;
    this.ultName = 'ECLIPSE SUPERNOVA';
    this.skillName = 'SOLAR PILLAR';
    this.runeOrbit = 0;
    this.castCombo = 0;
    this.dodgeMaxCooldown = 2.88;
    this.dashMaxCooldown = 3.4;
    this.spawnedEclipse = false;
    this.didSupernovaFinisher = false;
  }

  onStartDodge(enemy, game, dir) {
    const ww = game.renderer.worldWidth;
    this.dashDuration = 0.4;
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
    // Departure Solar Rift Portal + Volatile Remnant Detonation
    game.vfx.spawnShockwave(this.x, this.y - 95, 105, '#facc15', 0.34, false, true);
    game.vfx.spawnShockwave(this.x, this.groundY, 120, '#fb923c', 0.32, true);
    game.vfx.spawnLightning(this.x, this.groundY - 220, this.groundY, '#fef08a', '#fb923c');
    game.vfx.spawnBurst(this.x, this.y - 95, 18, '#fb923c', 230);
    game.vfx.spawnGlyphBurst(this.x, this.y - 100, 7, 'arcane');
    game.vfx.spawnDamageText(this.x, this.y - 145, 0, false, 'ARCANE BLINK!', '#facc15');

    // Volatile Solar Remnant damages melee pursuers at departure point!
    if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 200) {
      enemy.takeDamage(30, this, false, 95, -50);
    }
  }

  onStartDash(enemy, game, dir) {
    this.dashDuration = 0.4;
    this.isBlinkTeleport = false;
    this.vx = dir * 365;
    if (game.audio) game.audio.play('fireball', this.x);
    game.vfx.spawnShockwave(this.x, this.y - 95, 76, '#fb923c', 0.26, false, true);
    game.vfx.spawnGlyphBurst(this.x, this.y - 100, 5, 'arcane');
    game.vfx.spawnDamageText(this.x, this.y - 140, 0, false, 'IGNIS SURGE!', '#facc15');
  }

  updateDashOrDodge(dt, enemy, game) {
    const t = this.stateTimer;

    if (this.isBlinkTeleport) {
      if (t >= 0.13 && !this.didBlink) {
        this.didBlink = true;
        this.x = this.blinkTargetX;
        if (enemy) {
          this.facing = enemy.x >= this.x ? 1 : -1;
        }
        // Arrival Solar Rift Portal + Lightning Flash + Snap Solar Bolt
        game.vfx.spawnShockwave(this.x, this.y - 95, 108, '#fef08a', 0.36, false, true);
        game.vfx.spawnShockwave(this.x, this.groundY, 124, '#fb923c', 0.34, true);
        game.vfx.spawnLightning(this.x, this.groundY - 220, this.groundY, '#ffffff', '#fb923c');
        game.vfx.spawnBurst(this.x, this.y - 95, 20, '#fef08a', 250);
        game.vfx.spawnGlyphBurst(this.x, this.y - 105, 8, 'arcane');

        if (enemy && !enemy.isDead) {
          const sx = this.x + this.facing * 46;
          const sy = this.y - 115;
          const dx = enemy.x - sx;
          const dy = (enemy.y - 112) - sy;
          const d = Math.hypot(dx, dy) || 1;
          game.vfx.spawnProjectile({
            x: sx,
            y: sy,
            vx: (dx / d) * 635,
            vy: (dy / d) * 635,
            radius: 13,
            color: '#fb923c',
            coreColor: '#fef08a',
            owner: this,
            damage: 45,
            type: 'fireball'
          });
        }
      }
      if (t >= this.dashDuration) {
        this.isBlinkTeleport = false;
        this.isInvulnerable = false;
        this.setState('IDLE');
      }
      return;
    }

    this.x += this.dashDir * 320 * dt;

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
      const incomingProj =
        game.vfx &&
        game.vfx.projectiles.some((p) => p.owner === enemy && Math.abs(p.x - this.x) < 156);
      if ((dist < 215 || (nearWall && dist < 275) || incomingProj) && this.dodgeCooldown <= 0) {
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
    if (t < 0.34) {
      this.torsoAngle = -this.facing * 0.18 * (t / 0.34);
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
    } else if (t < 0.7) {
      if (!this.didActionFrame) {
        this.didActionFrame = true;
        this.castCombo++;
        this.vx -= this.facing * 55;
        this.torsoVel = -this.facing * 8;
        if (game.audio) game.audio.play('fireball', this.x);

        const spawnX = this.x + this.facing * 52;
        const spawnY = this.y - 115;
        const targetY = enemy ? enemy.y - 112 : spawnY;
        const dx = enemy ? enemy.x - spawnX : this.facing * 460;
        const dy = targetY - spawnY;
        const dist = Math.hypot(dx, dy) || 1;
        const speed = 615;
        const isTwinFlare = this.castCombo % 3 === 0;

        game.vfx.spawnProjectile({
          x: spawnX,
          y: spawnY,
          vx: (dx / dist) * speed,
          vy: (dy / dist) * speed,
          radius: 15,
          color: '#fb923c',
          coreColor: '#fef08a',
          owner: this,
          damage: isTwinFlare ? 72 : 84,
          type: 'fireball',
          isMeteor: false
        });

        if (isTwinFlare) {
          game.vfx.spawnProjectile({
            x: spawnX - this.facing * 16,
            y: spawnY - 14,
            vx: (dx / dist) * (speed * 0.94),
            vy: (dy / dist) * (speed * 0.94) - 22,
            radius: 13,
            color: '#ea580c',
            coreColor: '#fef08a',
            owner: this,
            damage: 46,
            type: 'fireball',
            isMeteor: false
          });
        }

        game.vfx.spawnShockwave(spawnX, spawnY, 58, '#facc15', 0.24, false, true);
        game.vfx.spawnBurst(spawnX, spawnY, 12, '#fb923c', 180);
        game.vfx.spawnGlyphBurst(spawnX, spawnY, 4, 'arcane');
      }
    } else if (t >= 0.92) {
      this.setState('IDLE');
    }
  }

  updateSkill(dt, enemy, game) {
    const t = this.stateTimer;
    if (t >= 0.38 && !this.didActionFrame && enemy) {
      this.didActionFrame = true;
      this.vx -= this.facing * 75;
      if (game.audio) game.audio.play('flame_pillar', enemy.x);

      // Signature Pyromancer Skill: Triple Hellfire Eruption Pillars + Twin Arcing Solar Fire-Orbs
      game.vfx.spawnFlamePillar(enemy.x, this.groundY, this, enemy, {
        theme: 'arcane',
        delay: 0.26,
        maxLife: 1.45,
        scaleWidth: 1.15
      });
      game.vfx.spawnFlamePillar(enemy.x - 95, this.groundY, this, enemy, {
        theme: 'arcane',
        delay: 0.4,
        maxLife: 1.25,
        scaleWidth: 0.75
      });
      game.vfx.spawnFlamePillar(enemy.x + 95, this.groundY, this, enemy, {
        theme: 'arcane',
        delay: 0.4,
        maxLife: 1.25,
        scaleWidth: 0.75
      });

      const sx = this.x + this.facing * 48;
      const sy = this.y - 115;
      const dx = enemy.x - sx;
      const dy = (enemy.y - 112) - sy;
      const dist = Math.hypot(dx, dy) || 1;
      [-38, 38].forEach((vyOff) => {
        game.vfx.spawnProjectile({
          x: sx,
          y: sy,
          vx: (dx / dist) * 595,
          vy: (dy / dist) * 595 + vyOff,
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
    } else if (t >= 0.98) {
      this.setState('IDLE');
    }
  }

  updateUltimate(dt, enemy, game) {
    // OVERHAULED 3-STAGE ULTIMATE: "ECLIPSE SUPERNOVA" (Cataclysmic Solar Armageddon)
    // Stage 1 (0.0s - 0.55s): Colossal Black-Gold Solar Eclipse Singularity + Gravity Well Lock + Corona Lightning
    // Stage 2 (0.55s - 1.05s): Heaven-to-Earth Obliterating Solar Plasma Beam + 5 High-Velocity Cataclysm Meteors
    // Stage 3 (1.05s - 1.58s): Supernova Cataclysm Eruption + 3 Chaining Hellfire Magma Pillars
    const t = this.stateTimer;
    this.y = this.groundY;
    this.vy = 0;

    const targetX = enemy ? enemy.x : game.renderer.worldWidth * 0.5;
    const eclipseX = enemy ? (this.x * 0.3 + enemy.x * 0.7) : game.renderer.worldWidth * 0.5;
    const eclipseY = 148;

    if (t < 0.55) {
      this.runeOrbit += dt * 8.5;
      this.didSupernovaFinisher = false;

      if (!this.spawnedEclipse) {
        this.spawnedEclipse = true;
        if (game.audio) game.audio.play('eclipse_charge', eclipseX);
        game.vfx.spawnEclipseSupernova({
          x: eclipseX,
          y: eclipseY,
          groundY: this.groundY,
          maxRadius: 112,
          color: '#fb923c',
          coreColor: '#fef08a',
          maxLife: 1.55
        });
        game.vfx.spawnShockwave(targetX, this.groundY, 175, '#facc15', 0.48, true);
        game.vfx.spawnLightning(targetX, eclipseY, this.groundY, '#fef08a', '#fb923c');
        if (enemy && !enemy.isDead) {
          enemy.takeDamage(28, this, false, 20, 0);
        }
      }

      if (enemy && !enemy.isDead) {
        const pullDir = Math.sign(eclipseX - enemy.x);
        enemy.x += pullDir * 105 * dt;
      }

      if (Math.random() < 0.88) {
        const a = Math.random() * Math.PI * 2;
        game.vfx.spawnParticle({
          x: eclipseX + Math.cos(a) * 110,
          y: eclipseY + Math.sin(a) * 110,
          vx: -Math.cos(a) * 165,
          vy: -Math.sin(a) * 165,
          size: 7,
          color: Math.random() > 0.35 ? '#facc15' : '#fb923c',
          maxLife: 0.36
        });
      }
    } else if (!this.didActionFrame) {
      // Stage 2: Heaven-to-Earth Solar Plasma Beam + 5 High-Velocity Cataclysm Meteors!
      this.didActionFrame = true;
      this.spawnedEclipse = false;
      if (game.audio) {
        game.audio.play('solar_beam', targetX);
        game.audio.play('meteor', eclipseX);
      }

      game.renderer.triggerShake(26, 0.65);
      game.renderer.triggerAberration(16);
      game.renderer.triggerHitStop(0.09);

      // 1. Colossal Heaven-to-Earth Solar Plasma Beam searing straight from the Eclipse Sphere into the Enemy!
      game.vfx.spawnBeam({
        x1: eclipseX,
        y1: eclipseY,
        x2: targetX,
        y2: this.groundY - 24,
        width: 84,
        color: '#fb923c',
        coreColor: '#fef08a',
        maxLife: 0.68
      });

      for (let r = 0; r < 5; r++) {
        const u = (r + 1) / 5;
        const rx = eclipseX + (targetX - eclipseX) * u;
        const ry = eclipseY + (this.groundY - 24 - eclipseY) * u;
        game.vfx.spawnShockwave(rx, ry, 95 + r * 14, r % 2 === 0 ? '#fef08a' : '#fb923c', 0.45, true);
      }

      if (enemy && !enemy.isDead) {
        enemy.takeDamage(105, this, true, 160, -220);
      }

      // 2. Erupt 5 High-Velocity Molten Cataclysm Meteors fanning across the arena!
      [-150, -75, 0, 75, 150].forEach((off, idx) => {
        const destX = targetX + off;
        const dx = destX - eclipseX;
        const dy = this.groundY - eclipseY;
        const len = Math.hypot(dx, dy) || 1;
        const speed = 860 - Math.abs(idx - 2) * 40;

        game.vfx.spawnProjectile({
          x: eclipseX + off * 0.22,
          y: eclipseY,
          vx: (dx / len) * speed,
          vy: (dy / len) * speed,
          radius: idx === 2 ? 46 : 32,
          color: '#ea580c',
          coreColor: '#fef08a',
          owner: this,
          damage: idx === 2 ? 48 : 24,
          type: 'meteor',
          isMeteor: true
        });
      });

      game.vfx.spawnShockwave(eclipseX, eclipseY, 270, '#fef08a', 0.52);
      game.vfx.spawnShockwave(eclipseX, eclipseY, 195, '#fb923c', 0.42);
      game.vfx.spawnBurst(eclipseX, eclipseY, 32, '#fef08a', 340, { size: 8 });
      game.vfx.spawnGlyphBurst(this.x, this.y - 110, 10, 'arcane');
    } else if (t >= 1.02 && !this.didSupernovaFinisher) {
      // Stage 3: Supernova Cataclysm Eruption + 3 Chaining Hellfire Magma Pillars!
      this.didSupernovaFinisher = true;
      if (game.audio) game.audio.play('supernova_detonate', targetX);
      [-115, 0, 115].forEach((off, idx) => {
        game.vfx.spawnFlamePillar(targetX + off, this.groundY, this, enemy, {
          theme: 'arcane',
          delay: idx === 1 ? 0.04 : 0.14,
          maxLife: 1.05,
          scaleWidth: idx === 1 ? 1.05 : 0.72
        });
      });
      game.vfx.spawnLightning(targetX - 50, -250, this.groundY, '#fef08a', '#fb923c');
      game.vfx.spawnLightning(targetX + 50, -250, this.groundY, '#ffffff', '#ea580c');
    } else if (t >= 1.56) {
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
