import { Fighter } from './Fighter.js';
import { PixelForge } from '../engine/PixelForge.js';

export class Priestess extends Fighter {
  constructor(x, groundY, facing = -1) {
    super({
      name: 'Seraphina',
      x,
      groundY,
      facing,
      maxHp: 1180,
      attackRange: 505,
      moveSpeed: 116,
      autoInterval: 1.35,
      lightColor: 'rgba(253, 224, 71, 1)',
      primaryColor: '#fde047'
    });
    this.heroId = 'priestess';
    this.theme = 'radiant';
    this.deathSfx = 'death_priestess';
    this.skillMaxCooldown = 5.5;
    this.ultName = 'SERAPHIC APOTHEOSIS';
    this.skillName = 'DIVINE SANCTUARY';
    this.haloPhase = 0;
    this.shotCombo = 0;
    this.dodgeMaxCooldown = 3.75;
    this.dashMaxCooldown = 3.6;
    this.didSanctuaryHeal = false;
    this.didUltMiracle = false;
    this.didUltSpears = false;
  }

  onStartDodge(enemy, game, dir) {
    const ww = game.renderer.worldWidth;
    const nearLeftWall = this.x < 210 && dir < 0;
    const nearRightWall = this.x > ww - 210 && dir > 0;

    // Angelic Wings of Grace: if cornered against a wall, Seraphina ascends in a golden feather-flash over the enemy
    if ((nearLeftWall || nearRightWall) && enemy) {
      this.isAngelicAscent = true;
      this.dashDuration = 0.44;
      this.ascentStartX = this.x;
      const leapDir = nearLeftWall ? 1 : -1;
      const desiredX = enemy.x + leapDir * 250;
      this.ascentTargetX = Math.max(145, Math.min(ww - 145, desiredX));
      this.vx = 0;

      if (game.audio) game.audio.play('holy_heal', this.x);
      this.heal(28, 'GRACE');
      game.vfx.spawnShockwave(this.x, this.groundY, 115, '#fde047', 0.34, true);
      game.vfx.spawnBurst(this.x, this.y - 95, 18, '#fef9c3', 220, { upBias: 110 });
      game.vfx.spawnGlyphBurst(this.x, this.y - 105, 8, 'radiant');
      game.vfx.spawnDamageText(this.x, this.y - 148, 0, false, 'SERAPHIC ASCENT!', '#fef08a');
      return;
    }

    this.isAngelicAscent = false;
    this.dashDuration = 0.38;
    this.vx = dir * 355;
    if (game.audio) game.audio.play('holy_heal', this.x);
    this.heal(24, 'AEGIS');
    game.vfx.spawnShockwave(this.x, this.y - 95, 92, '#fde047', 0.3, false, true);
    game.vfx.spawnGlyphBurst(this.x, this.y - 100, 7, 'heal');
    game.vfx.spawnDamageText(this.x, this.y - 145, 0, false, 'AEGIS SANCTUARY!', '#4ade80');
  }

  onStartDash(enemy, game, dir) {
    this.isAngelicAscent = false;
    this.dashDuration = 0.36;
    this.vx = dir * 360;
    if (game.audio) game.audio.play('holy_bolt', this.x);
    game.vfx.spawnShockwave(this.x, this.y - 95, 76, '#fde047', 0.26, false, true);
    game.vfx.spawnGlyphBurst(this.x, this.y - 95, 5, 'radiant');
    game.vfx.spawnDamageText(this.x, this.y - 140, 0, false, 'RADIANT GLIDE!', '#fef08a');
  }

  updateDashOrDodge(dt, enemy, game) {
    const t = this.stateTimer;

    if (this.isAngelicAscent) {
      const p = Math.min(1, t / this.dashDuration);
      const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);
      this.x = this.ascentStartX + (this.ascentTargetX - this.ascentStartX) * ease;
      this.y = this.groundY - Math.sin(p * Math.PI) * 145;
      if (enemy) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }

      if (Math.random() < 0.8) {
        game.vfx.spawnParticle({
          x: this.x + (Math.random() - 0.5) * 32,
          y: this.y - 90 + (Math.random() - 0.5) * 28,
          vx: (Math.random() - 0.5) * 50,
          vy: 30 + Math.random() * 40,
          size: 6,
          color: Math.random() > 0.4 ? '#fde047' : '#ffffff',
          maxLife: 0.32
        });
      }

      if (t >= this.dashDuration) {
        this.y = this.groundY;
        this.isAngelicAscent = false;
        this.isInvulnerable = false;
        game.vfx.spawnShockwave(this.x, this.groundY, 92, '#fde047', 0.28, true);
        this.setState('IDLE');
      }
      return;
    }

    this.x += this.dashDir * 335 * dt;

    if (Math.random() < 0.72) {
      game.vfx.spawnParticle({
        x: this.x - this.dashDir * 16,
        y: this.y - 90 + (Math.random() - 0.5) * 36,
        vx: -this.dashDir * 70,
        vy: -40 - Math.random() * 35,
        size: 6,
        color: Math.random() > 0.45 ? '#fde047' : '#4ade80',
        maxLife: 0.3
      });
    }

    if (t >= this.dashDuration) {
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  update(dt, enemy, game) {
    this.haloPhase += dt * 2.8;

    if (enemy && !enemy.isDead && (this.state === 'IDLE' || this.state === 'WALK')) {
      const dist = Math.abs(enemy.x - this.x);
      const ww = game.renderer.worldWidth;
      const nearWall = this.x < 215 || this.x > ww - 215;
      const incomingProj =
        game.vfx &&
        game.vfx.projectiles.some((p) => p.owner === enemy && Math.abs(p.x - this.x) < 135);
      if ((dist < 185 || (nearWall && dist < 245) || incomingProj) && this.dodgeCooldown <= 0) {
        this.startDodge(enemy, game);
        return;
      }
      if (dist < 185) {
        this.x -= this.facing * this.moveSpeed * 0.55 * dt;
      }
    }
    super.update(dt, enemy, game);
  }

  updateAutoAttack(dt, enemy, game) {
    const t = this.stateTimer;
    if (t < 0.32) {
      this.torsoAngle = -this.facing * 0.15 * (t / 0.32);
      if (Math.random() < 0.55) {
        const a = t * 20;
        game.vfx.spawnParticle({
          x: this.x + this.facing * 44 + Math.cos(a) * 20,
          y: this.y - 114 + Math.sin(a) * 20,
          vx: -Math.cos(a) * 42,
          vy: -Math.sin(a) * 42,
          size: 5,
          color: '#fef9c3',
          maxLife: 0.24
        });
      }
    } else if (t < 0.68) {
      if (!this.didActionFrame) {
        this.didActionFrame = true;
        this.shotCombo++;
        this.vx -= this.facing * 45;
        this.torsoVel = -this.facing * 7;
        if (game.audio) game.audio.play('holy_bolt', this.x);

        const spawnX = this.x + this.facing * 50;
        const spawnY = this.y - 114;
        const targetY = enemy ? enemy.y - 110 : spawnY;
        const dx = enemy ? enemy.x - spawnX : this.facing * 460;
        const dy = targetY - spawnY;
        const dist = Math.hypot(dx, dy) || 1;
        const speed = 648;
        const isGraceCast = this.shotCombo % 3 === 0;

        // Primary Luminous Star-Cross Bolt
        game.vfx.spawnProjectile({
          x: spawnX,
          y: spawnY,
          vx: (dx / dist) * speed,
          vy: (dy / dist) * speed,
          radius: 15,
          color: '#fde047',
          coreColor: '#ffffff',
          owner: this,
          damage: isGraceCast ? 62 : 72,
          type: 'holy_light',
          isMeteor: false
        });

        // Every 3rd cast: "GRACE OF DAWN!" — fires a second Holy Lance AND mends Seraphina's wounds!
        if (isGraceCast) {
          this.heal(28, 'DAWN GRACE');
          game.vfx.spawnProjectile({
            x: spawnX - this.facing * 14,
            y: spawnY - 14,
            vx: (dx / dist) * (speed * 0.95),
            vy: (dy / dist) * (speed * 0.95) - 18,
            radius: 13,
            color: '#facc15',
            coreColor: '#fef9c3',
            owner: this,
            damage: 38,
            type: 'holy_light',
            isMeteor: false
          });
        }

        game.vfx.spawnShockwave(spawnX, spawnY, 54, '#fde047', 0.22, false, true);
        game.vfx.spawnBurst(spawnX, spawnY, 12, '#fef9c3', 175);
        game.vfx.spawnGlyphBurst(spawnX, spawnY, 4, 'radiant');
      }
    } else if (t >= 0.88) {
      this.setState('IDLE');
    }
  }

  updateSkill(dt, enemy, game) {
    // SIGNATURE PRIESTESS SKILL: "DIVINE SANCTUARY"
    // Phase 1 (0.14s): Consecrated Cathedral Sanctuary blesses Seraphina with a +84 HP Divine Heal & Emerald-Gold Crosses
    // Phase 2 (0.40s): Calls down a Pillar of Heaven's Smite + 2 Seraphic Holy Spears + Homing Luminous Orb on the enemy
    const t = this.stateTimer;

    if (t < 0.14) {
      this.didSanctuaryHeal = false;
    } else if (t >= 0.14 && !this.didSanctuaryHeal) {
      this.didSanctuaryHeal = true;
      if (game.audio) game.audio.play('holy_heal', this.x);
      this.heal(84, 'SANCTUARY');
      game.vfx.spawnShockwave(this.x, this.groundY, 145, '#4ade80', 0.42, true);
      game.vfx.spawnShockwave(this.x, this.y - 95, 110, '#fde047', 0.36);
      game.vfx.spawnGlyphBurst(this.x, this.y - 105, 8, 'heal');
    }

    if (t >= 0.40 && !this.didActionFrame && enemy) {
      this.didActionFrame = true;
      this.vx -= this.facing * 55;
      if (game.audio) game.audio.play('holy_smite', enemy.x);

      // Radiant Pillar of Judgment under the enemy
      game.vfx.spawnFlamePillar(enemy.x, this.groundY, this, enemy, {
        theme: 'radiant',
        delay: 0.22,
        maxLife: 1.35,
        scaleWidth: 1.15
      });

      // 2 Descending Seraphic Holy Spears flanking the enemy
      [-70, 70].forEach((off, idx) => {
        game.vfx.spawnSkyStrike({
          x: enemy.x + off,
          y: -180 - idx * 60,
          targetX: enemy.x + off,
          groundY: this.groundY,
          vx: 0,
          vy: 1450,
          type: 'holy_spear',
          color: '#fde047',
          coreColor: '#ffffff',
          owner: this,
          target: enemy,
          damage: 26,
          delay: idx * 0.08,
          maxLinger: 0.48
        });
      });

      // Direct Holy Light Judgement Orb
      const sx = this.x + this.facing * 48;
      const sy = this.y - 114;
      const dx = enemy.x - sx;
      const dy = (enemy.y - 110) - sy;
      const dist = Math.hypot(dx, dy) || 1;
      game.vfx.spawnProjectile({
        x: sx,
        y: sy,
        vx: (dx / dist) * 630,
        vy: (dy / dist) * 630,
        radius: 15,
        color: '#fde047',
        coreColor: '#ffffff',
        owner: this,
        damage: 48,
        type: 'holy_light'
      });

      game.vfx.spawnShockwave(this.x, this.y - 110, 92, '#fde047', 0.36);
      game.vfx.spawnGlyphBurst(this.x, this.y - 110, 7, 'radiant');
    } else if (t >= 0.96) {
      this.setState('IDLE');
    }
  }

  updateUltimate(dt, enemy, game) {
    // 3-STAGE ULTIMATE ART: "SERAPHIC APOTHEOSIS" (Miracle of Resurrection & Heaven's Judgment)
    // Stage 1 (0.18s): Miracle Benediction restores +128 HP to Seraphina with a towering Golden Cathedral Halo
    // Stage 2 (0.52s): 6 Seraphic Holy Spears rain from the heavens across the enemy's position
    // Stage 3 (0.96s): Colossal Heaven-to-Earth Golden Cathedral Sunbeam + Twin Radiant Pillars smite the enemy
    const t = this.stateTimer;
    this.y = this.groundY;
    this.vy = 0;
    const targetX = enemy ? enemy.x : game.renderer.worldWidth * 0.5;

    if (t < 0.16) {
      this.didUltMiracle = false;
      this.didUltSpears = false;
    }

    // Stage 1: Miracle Benediction Self-Heal + Golden Sanctuary Rings
    if (t >= 0.18 && !this.didUltMiracle) {
      this.didUltMiracle = true;
      if (game.audio) game.audio.play('holy_heal', this.x);
      this.heal(128, 'MIRACLE');
      game.vfx.spawnShockwave(this.x, this.groundY, 190, '#4ade80', 0.5, true);
      game.vfx.spawnShockwave(this.x, this.y - 105, 160, '#fde047', 0.46);
      game.vfx.spawnLightning(this.x, -220, this.groundY, '#ffffff', '#fde047');
      game.vfx.spawnGlyphBurst(this.x, this.y - 115, 10, 'heal');
    }

    // Stage 2: 6 Seraphic Holy Spears rain down from Heaven onto the enemy
    if (t >= 0.52 && !this.didUltSpears) {
      this.didUltSpears = true;
      if (game.audio) game.audio.play('holy_smite', targetX);
      [-125, -75, -25, 25, 75, 125].forEach((off, idx) => {
        game.vfx.spawnSkyStrike({
          x: targetX + off,
          y: -200 - idx * 45,
          targetX: targetX + off,
          groundY: this.groundY,
          vx: 0,
          vy: 1550,
          type: 'holy_spear',
          color: '#fde047',
          coreColor: '#ffffff',
          owner: this,
          target: enemy,
          damage: 21,
          delay: idx * 0.055,
          maxLinger: 0.55
        });
      });
    }

    // Stage 3: Colossal Heaven-to-Earth Golden Cathedral Sunbeam + Twin Radiant Pillars
    if (t >= 0.96 && !this.didActionFrame) {
      this.didActionFrame = true;
      if (game.audio) game.audio.play('priestess_ult', targetX);

      game.renderer.triggerShake(24, 0.58);
      game.renderer.triggerAberration(14);
      game.renderer.triggerHitStop(0.085);

      // Colossal Vertical Heaven-to-Earth Golden Cathedral Sunbeam
      game.vfx.spawnBeam({
        x1: targetX,
        y1: -140,
        x2: targetX,
        y2: this.groundY - 12,
        width: 92,
        color: '#facc15',
        coreColor: '#ffffff',
        maxLife: 0.72
      });

      for (let r = 0; r < 5; r++) {
        const ry = 80 + r * 85;
        game.vfx.spawnShockwave(targetX, ry, 110 + r * 14, r % 2 === 0 ? '#ffffff' : '#fde047', 0.45, true);
      }

      [-85, 85].forEach((off) => {
        game.vfx.spawnFlamePillar(targetX + off, this.groundY, this, enemy, {
          theme: 'radiant',
          delay: 0.08,
          maxLife: 1.05,
          scaleWidth: 0.85
        });
      });

      game.vfx.spawnLightning(targetX, -260, this.groundY, '#ffffff', '#fde047');
      game.vfx.spawnShockwave(targetX, this.groundY, 260, '#fde047', 0.55, true);
      game.vfx.spawnBurst(targetX, this.groundY - 40, 32, '#fef9c3', 320, { upBias: 150, size: 8 });
      game.vfx.spawnGlyphBurst(targetX, this.groundY - 80, 12, 'radiant');

      if (enemy && !enemy.isDead) {
        enemy.takeDamage(122, this, true, 150, -210);
      }
    } else if (t >= 1.52) {
      this.setState('IDLE');
    }
  }

  draw(ctx, isReflection = false) {
    const sprites = PixelForge.initAssets().priestess;
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const w = 208;
    const h = 208;
    const scaleDir = this.facing;
    const frameIdx = PixelForge.getFrameIndex(this, this.haloPhase);

    ctx.translate(Math.round(this.x), Math.round(this.y));
    ctx.scale(scaleDir, 1);

    PixelForge.drawSheetFrame(ctx, sprites, this, w, h, this.haloPhase, isReflection);

    if (this.hitFlash > 0 && !isReflection) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5;
      PixelForge.drawGhostFrame(ctx, sprites, frameIdx, w, h);
    }

    ctx.restore();
  }
}
