import { Fighter } from './Fighter.js';
import { PixelForge } from '../engine/PixelForge.js';

export class Archer extends Fighter {
  constructor(x, groundY, facing = 1) {
    super({
      name: 'Sylvara',
      x,
      groundY,
      facing,
      maxHp: 1180,
      attackRange: 520,
      moveSpeed: 158,
      autoInterval: 1.18,
      lightColor: 'rgba(16, 185, 129, 1)',
      primaryColor: '#10b981'
    });
    this.heroId = 'archer';
    this.theme = 'emerald';
    this.deathSfx = 'death_archer';
    this.skillMaxCooldown = 4.8;
    this.ultName = 'ASTRAL HURRICANE';
    this.skillName = 'STARFALL VOLLEY';
    this.windPhase = 0;
    this.shotCombo = 0;
    this.stepTimer = 0;
    this.dodgeMaxCooldown = 2.6;
    this.dashMaxCooldown = 3.5;
    this.wallFlipCooldown = 0;
    this.isFlipVault = false;
    this.flipStartX = x;
    this.flipTargetX = x;
    this.flipAngle = 0;
  }

  onStartDodge(enemy, game, dir) {
    const ww = game.renderer.worldWidth;
    const dist = enemy ? Math.abs(enemy.x - this.x) : 300;
    const retreatX = this.x - this.facing * 260;
    const nearWallOrCornered =
      this.x < 330 ||
      this.x > ww - 330 ||
      retreatX < 190 ||
      retreatX > ww - 190 ||
      dist < 225;

    this.isFlipVault = true;
    this.flipStartX = this.x;
    this.flipAngle = 0;

    if (enemy && nearWallOrCornered) {
      // Vault completely OVER the enemy to the open side of the arena!
      this.dashDuration = 0.58;
      const openSideDir = enemy.x < ww * 0.5 ? 1 : -1;
      let target = enemy.x + openSideDir * 310;
      // If enemy is near center, always vault to the opposite side of where Archer started
      if (Math.abs(target - this.x) < 220) {
        const crossDir = this.x < enemy.x ? 1 : -1;
        target = enemy.x + crossDir * 300;
      }
      this.flipTargetX = Math.max(150, Math.min(ww - 150, target));
      this.dashDir = Math.sign(this.flipTargetX - this.flipStartX) || 1;
      game.vfx.spawnDamageText(this.x, this.y - 130, 0, false, 'ZEPHYR BACKFLIP!', '#34d399');
    } else {
      // Open-arena acrobatic backflip retreat
      this.dashDuration = 0.5;
      this.flipTargetX = Math.max(150, Math.min(ww - 150, this.x + dir * 270));
      this.dashDir = dir;
      game.vfx.spawnDamageText(this.x, this.y - 125, 0, false, 'ZEPHYR VAULT!', '#34d399');
    }

    this.vx = 0;
    this.vy = 0;
    if (game.audio) game.audio.play('blink', this.x);
    game.vfx.spawnShockwave(this.x, this.groundY, 96, '#34d399', 0.32, true);
    game.vfx.spawnSlash(this.x, this.y - 55, 82, 0, Math.PI * 2, '#10b981', 0.26);
    game.vfx.spawnGlyphBurst(this.x, this.y - 60, 7, 'emerald');
  }

  onStartDash(enemy, game, dir) {
    this.isFlipVault = false;
    this.flipAngle = 0;
    this.dashDuration = 0.4;
    this.vx = dir * 390;
    if (game.audio) game.audio.play('arrow_shoot', this.x);
    game.vfx.spawnShockwave(this.x, this.y - 55, 72, '#34d399', 0.25, false, true);
    game.vfx.spawnGlyphBurst(this.x, this.y - 55, 5, 'emerald');
    game.vfx.spawnDamageText(this.x, this.y - 120, 0, false, 'GALE STRIDE!', '#34d399');
  }

  updateDashOrDodge(dt, enemy, game) {
    const t = this.stateTimer;

    if (this.state === 'DODGE' && this.isFlipVault) {
      const u = Math.min(1, t / this.dashDuration);
      // Smooth ease-in-out horizontal traversal + high parabolic arc over the enemy
      const easeU = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      this.x = this.flipStartX + (this.flipTargetX - this.flipStartX) * easeU;
      this.y = this.groundY - Math.sin(u * Math.PI) * 175;
      // Full 360-degree mid-air acrobatic backflip rotation
      this.flipAngle = -Math.PI * 2 * u;

      if (Math.random() < 0.8) {
        game.vfx.spawnParticle({
          x: this.x + (Math.random() - 0.5) * 24,
          y: this.y - 70 + (Math.random() - 0.5) * 24,
          vx: -this.dashDir * 70,
          vy: 25,
          size: 5,
          color: Math.random() > 0.4 ? '#34d399' : '#fef08a',
          maxLife: 0.28
        });
      }

      // At the apex of her mid-air flip over the enemy, Sylvara looses a Twin Aerial Counter Shot!
      if (u >= 0.42 && !this.didActionFrame && enemy && !enemy.isDead) {
        this.didActionFrame = true;
        if (game.audio) game.audio.play('arrow_shoot', this.x);
        const sx = this.x;
        const sy = this.y - 72;
        const dx = enemy.x - sx;
        const dy = (enemy.y - 55) - sy;
        const d = Math.hypot(dx, dy) || 1;
        [-28, 28].forEach((spreadX) => {
          const tx = dx + spreadX;
          const td = Math.hypot(tx, dy) || 1;
          game.vfx.spawnProjectile({
            x: sx,
            y: sy,
            vx: (tx / td) * 740,
            vy: (dy / td) * 740,
            radius: 13,
            color: '#34d399',
            coreColor: '#fef08a',
            owner: this,
            damage: 42,
            type: 'arrow'
          });
        });
        game.vfx.spawnShockwave(sx, sy, 64, '#fef08a', 0.24, false, false);
        game.vfx.spawnGlyphBurst(sx, sy, 5, 'emerald');
      }

      if (t >= this.dashDuration) {
        this.y = this.groundY;
        this.vy = 0;
        this.isFlipVault = false;
        this.flipAngle = 0;
        this.isInvulnerable = false;
        game.vfx.spawnShockwave(this.x, this.groundY, 76, '#34d399', 0.26, true);
        this.setState('IDLE');
      }
      return;
    }

    this.x += this.dashDir * 290 * dt;
    if (Math.random() < 0.65) {
      game.vfx.spawnParticle({
        x: this.x,
        y: this.y - 55 + (Math.random() - 0.5) * 30,
        vx: -this.dashDir * 85,
        vy: -25,
        size: 5,
        color: '#34d399',
        maxLife: 0.25
      });
    }

    if (t >= this.dashDuration) {
      this.isFlipVault = false;
      this.flipAngle = 0;
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  update(dt, enemy, game) {
    this.windPhase += dt * 3.0;
    this.wallFlipCooldown = Math.max(0, this.wallFlipCooldown - dt);

    if (!this.isDead && this.state === 'WALK') {
      this.stepTimer += dt;
      if (this.stepTimer >= 0.3) {
        this.stepTimer = 0;
        game.vfx.spawnBurst(this.x - this.facing * 14, this.groundY - 2, 4, '#34d399', 70, {
          upBias: 32,
          size: 4,
          life: 0.32,
          additive: true
        });
      }
    }

    if (enemy && !enemy.isDead && (this.state === 'IDLE' || this.state === 'WALK')) {
      const ww = game.renderer.worldWidth;
      const dist = Math.abs(enemy.x - this.x);
      const pinnedLeft = this.x < 250 && enemy.x > this.x;
      const pinnedRight = this.x > ww - 250 && enemy.x < this.x;

      // If Archer is near a wall and enemy closes within 285px, immediately backflip OVER the enemy to the other side!
      if ((pinnedLeft || pinnedRight) && dist < 285 && this.wallFlipCooldown <= 0) {
        this.wallFlipCooldown = 1.8;
        this.startDodge(enemy, game);
        return;
      }

      if (dist < 235) {
        this.x -= this.facing * this.moveSpeed * 0.75 * dt;
      }
    }

    super.update(dt, enemy, game);
  }

  updateAutoAttack(dt, enemy, game) {
    const t = this.stateTimer;
    if (t < 0.34) {
      // Frames 16, 17, 18: Drawing the recurve bow taut + emerald vortex convergence at arrowtip
      this.torsoAngle = -this.facing * 0.14 * (t / 0.34);
      if (Math.random() < 0.65) {
        const a = t * 24;
        const tipX = this.x + this.facing * 54;
        const tipY = this.y - 76;
        game.vfx.spawnParticle({
          x: tipX + Math.cos(a) * 26,
          y: tipY + Math.sin(a) * 26,
          vx: -Math.cos(a) * 65,
          vy: -Math.sin(a) * 65,
          size: 5,
          color: Math.random() > 0.4 ? '#34d399' : '#fef08a',
          maxLife: 0.24
        });
      }
    } else if (t < 0.7) {
      // Frames 19, 20, 21: High-velocity Tempest Piercer arrow release + vertical sonic boom ring
      if (!this.didActionFrame) {
        this.didActionFrame = true;
        this.shotCombo++;
        this.vx -= this.facing * 55;
        if (game.audio) game.audio.play('arrow_shoot', this.x);

        const spawnX = this.x + this.facing * 54;
        const spawnY = this.y - 76;
        const targetY = enemy ? enemy.y - 62 : spawnY;
        const dx = enemy ? enemy.x - spawnX : this.facing * 520;
        const dy = targetY - spawnY;
        const dist = Math.hypot(dx, dy) || 1;
        const speed = 680;
        const isTwinShot = this.shotCombo % 3 === 0;

        // Primary Supersonic Astral Arrow
        game.vfx.spawnProjectile({
          x: spawnX,
          y: spawnY,
          vx: (dx / dist) * speed,
          vy: (dy / dist) * speed,
          radius: 14,
          color: '#10b981',
          coreColor: '#fef08a',
          owner: this,
          damage: isTwinShot ? 76 : 82,
          type: 'arrow'
        });

        // Every 3rd attack fires a Twin Gale Volley
        if (isTwinShot) {
          game.vfx.spawnProjectile({
            x: spawnX - this.facing * 18,
            y: spawnY - 14,
            vx: (dx / dist) * (speed * 0.94),
            vy: (dy / dist) * (speed * 0.94) - 22,
            radius: 13,
            color: '#34d399',
            coreColor: '#fef08a',
            owner: this,
            damage: 58,
            type: 'arrow'
          });
        }

        // Vertical Sonic-Boom Ring + Crescent Wind Wave at Bowtip
        game.vfx.spawnShockwave(spawnX, spawnY, 68, '#34d399', 0.28, false, true);
        game.vfx.spawnShockwave(spawnX + this.facing * 16, spawnY, 48, '#fef08a', 0.22, false, true);
        const startA = this.facing === 1 ? -1.1 : Math.PI - 1.1;
        const endA = this.facing === 1 ? 1.1 : Math.PI + 1.1;
        game.vfx.spawnSlash(spawnX, spawnY, 64, startA, endA, '#34d399', 0.22);
        game.vfx.spawnBurst(spawnX, spawnY, 12, '#6ee7b7', 210);
        game.vfx.spawnGlyphBurst(spawnX, spawnY, 4, 'emerald');
      }
    } else if (t >= 0.96) {
      this.setState('IDLE');
    }
  }

  updateSkill(dt, enemy, game) {
    const t = this.stateTimer;
    if (t < 0.32) {
      if (Math.random() < 0.65) {
        game.vfx.spawnParticle({
          x: this.x + (Math.random() - 0.5) * 48,
          y: this.y - 75,
          vx: 0,
          vy: -180,
          size: 5,
          color: '#34d399',
          maxLife: 0.28
        });
      }
    } else if (t >= 0.32 && !this.didActionFrame) {
      this.didActionFrame = true;
      this.vx -= this.facing * 95;
      if (game.audio) game.audio.play('arrow_rain', enemy ? enemy.x : this.x);

      // Skyward bow launch sonic rings & 3-Arrow Direct Fan Spread + 9 Diagonal Starfall Arrows (zero flame pillars!)
      const bowX = this.x + this.facing * 44;
      const bowY = this.y - 84;
      game.vfx.spawnShockwave(bowX, bowY, 82, '#34d399', 0.32, false, true);
      game.vfx.spawnShockwave(bowX + this.facing * 14, bowY - 10, 56, '#fef08a', 0.24, false, true);
      game.vfx.spawnGlyphBurst(bowX, bowY, 7, 'emerald');

      // 3 Direct Fan-Spread Wind Arrows from the bow
      [-0.16, 0, 0.16].forEach((angOff) => {
        const baseAng = this.facing === 1 ? 0 : Math.PI;
        const a = baseAng + angOff;
        game.vfx.spawnProjectile({
          x: bowX,
          y: bowY,
          vx: Math.cos(a) * 650,
          vy: Math.sin(a) * 650,
          radius: 12,
          color: '#34d399',
          coreColor: '#fef08a',
          owner: this,
          damage: 32,
          type: 'arrow'
        });
      });

      const centerTargetX = enemy ? enemy.x : this.x + this.facing * 320;
      // Rain 9 Diagonal Emerald-Gold Starfall Arrows from the Heavens
      for (let i = 0; i < 9; i++) {
        const spread = (i - 4) * 34 + (Math.random() - 0.5) * 14;
        game.vfx.spawnSkyStrike({
          x: centerTargetX + spread - this.facing * 90,
          y: -160 - i * 32,
          groundY: this.groundY,
          vx: this.facing * 240,
          vy: 1280,
          type: 'starfall_arrow',
          color: i % 2 === 0 ? '#10b981' : '#34d399',
          coreColor: '#fef08a',
          owner: this,
          target: enemy,
          damage: 20,
          delay: i * 0.06,
          maxLinger: 0.55
        });
      }
    } else if (t >= 1.05) {
      this.setState('IDLE');
    }
  }

  updateUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    if (t < 0.72) {
      // Levitate into an emerald hurricane vortex while charging the Astral Dragon-Arrow
      this.vy = -35;
      this.y = Math.max(this.groundY - 95, this.y - 115 * dt);
      if (Math.random() < 0.85) {
        const a = Math.random() * Math.PI * 2;
        game.vfx.spawnParticle({
          x: this.x + Math.cos(a) * 80,
          y: this.y - 70 + Math.sin(a) * 80,
          vx: -Math.cos(a) * 135,
          vy: -Math.sin(a) * 135,
          size: 7,
          color: Math.random() > 0.35 ? '#34d399' : '#fef08a',
          maxLife: 0.34
        });
      }
    } else if (!this.didActionFrame) {
      this.didActionFrame = true;
      if (game.audio) game.audio.play('archer_ult', this.x);

      const startX = this.x + this.facing * 48;
      const startY = this.y - 72;
      const endX = this.facing === 1 ? game.renderer.worldWidth + 240 : -240;
      const targetX = enemy ? enemy.x : this.x + this.facing * 380;

      game.renderer.triggerShake(26, 0.65);
      game.renderer.triggerAberration(15);
      game.renderer.triggerHitStop(0.09);

      // 1. Colossal Across-Screen Astral Dragon-Arrow Beam
      game.vfx.spawnBeam({
        x1: startX,
        y1: startY,
        x2: endX,
        y2: this.groundY - 62,
        width: 64,
        color: '#10b981',
        coreColor: '#fef08a',
        maxLife: 0.62
      });

      // 2. 6 Cascading Vertical Sonic-Boom Rings along the Beam Path
      for (let r = 0; r < 6; r++) {
        const rx = startX + this.facing * (70 + r * 95);
        game.vfx.spawnShockwave(rx, startY, 92 + r * 8, r % 2 === 0 ? '#34d399' : '#fef08a', 0.45, false, true);
      }

      // 3. Colossal Emerald Tempest Tornado + Jade Lightning Bolts on the Enemy
      game.vfx.spawnTornado({
        x: targetX,
        groundY: this.groundY,
        vx: this.facing * 45,
        radius: 95,
        height: 310,
        color: '#10b981',
        coreColor: '#fef08a',
        maxLife: 1.35
      });

      game.vfx.spawnLightning(targetX - 35, -240, this.groundY, '#fef08a', '#10b981');
      game.vfx.spawnLightning(targetX, -280, this.groundY, '#ffffff', '#34d399');
      game.vfx.spawnLightning(targetX + 35, -240, this.groundY, '#fef08a', '#10b981');
      game.vfx.spawnShockwave(targetX, this.groundY, 310, '#34d399', 0.62, true);
      game.vfx.spawnDecal(targetX, 175, 'fissure', '#10b981', 6.0);
      game.vfx.spawnBurst(targetX, this.groundY - 35, 36, '#34d399', 390, { upBias: 170, size: 9 });
      game.vfx.spawnBurst(targetX, this.groundY - 35, 24, '#fef08a', 320, { upBias: 140, size: 8 });
      game.vfx.spawnGlyphBurst(targetX, this.groundY - 70, 12, 'emerald');

      if (enemy && !enemy.isDead) {
        enemy.takeDamage(225, this, true, 240, -370);
      }
    } else if (t >= 1.6) {
      this.setState('IDLE');
    }
  }

  draw(ctx, isReflection = false) {
    const sprites = PixelForge.initAssets().archer;
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const w = 208;
    const h = 208;
    const frameIdx = PixelForge.getFrameIndex(this, this.windPhase);

    ctx.translate(Math.round(this.x), Math.round(this.y));
    ctx.scale(this.facing, 1);
    if (this.isFlipVault && this.flipAngle) {
      ctx.translate(0, -96);
      ctx.rotate(this.flipAngle);
      ctx.translate(0, 96);
    }

    PixelForge.drawSheetFrame(ctx, sprites, this, w, h, this.windPhase, isReflection);

    if (this.hitFlash > 0 && !isReflection) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5;
      PixelForge.drawGhostFrame(ctx, sprites, frameIdx, w, h);
    }

    ctx.restore();
  }
}
