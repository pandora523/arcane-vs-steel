import { Fighter } from './Fighter.js';
import { PixelForge } from '../engine/PixelForge.js';

export class Warrior extends Fighter {
  constructor(x, groundY, facing = 1) {
    super({
      name: 'Aethelgard',
      x,
      groundY,
      facing,
      maxHp: 1280,
      attackRange: 138,
      moveSpeed: 142,
      autoInterval: 1.32,
      lightColor: 'rgba(56, 189, 248, 1)',
      primaryColor: '#38bdf8'
    });
    this.heroId = 'warrior';
    this.theme = 'steel';
    this.deathSfx = 'death_warrior';
    this.skillMaxCooldown = 5.0;
    this.ultName = 'HEAVENLY EARTHSHATTER';
    this.skillName = 'WHIRLWIND';
    this.comboStep = 0;
    this.spinAngle = 0;
    this.isDeflecting = false;
    this.stepDustTimer = 0;
    this.spawnedSkyBlades = false;
  }

  update(dt, enemy, game) {
    if (!this.isDead && this.state === 'WALK') {
      this.stepDustTimer += dt;
      if (this.stepDustTimer >= 0.34) {
        this.stepDustTimer = 0;
        if (game.audio) game.audio.play('footstep_steel', this.x);
        game.vfx.spawnBurst(this.x - this.facing * 14, this.groundY - 2, 4, '#7dd3fc', 65, {
          upBias: 28,
          size: 4,
          life: 0.34,
          additive: true
        });
      }
    }
    super.update(dt, enemy, game);
  }

  updateAutoAttack(dt, enemy, game) {
    const t = this.stateTimer;
    const mode = this.comboStep % 3;

    if (t < 0.36) {
      // Frames 16, 17, 18: Deliberate two-handed overhead greatsword windup + rune charge
      this.torsoAngle = -this.facing * 0.24 * (t / 0.36);
      if (Math.random() < 0.45) {
        game.vfx.spawnParticle({
          x: this.x - this.facing * 18 + (Math.random() - 0.5) * 24,
          y: this.y - 95 + (Math.random() - 0.5) * 24,
          vx: this.facing * 35,
          vy: -65,
          size: 5,
          color: '#7dd3fc',
          maxLife: 0.28
        });
      }
    } else if (t < 0.72) {
      // Frames 19, 20, 21: Forward lunge cleave & impact
      if (!this.didActionFrame) {
        this.didActionFrame = true;
        this.comboStep++;
        this.vx += this.facing * 140;
        this.torsoVel = this.facing * 12;
        if (game.audio) game.audio.play('slash', this.x);

        const cx = this.x + this.facing * 38;
        const cy = this.y - 68;
        const startA = this.facing === 1 ? -1.6 : Math.PI - 0.95;
        const endA = this.facing === 1 ? 1.0 : Math.PI + 1.6;

        game.vfx.spawnSlash(cx, cy, 108, startA, endA, '#0284c7', 0.34);
        game.vfx.spawnSlash(cx, cy, 92, startA, endA, '#38bdf8', 0.28);
        game.vfx.spawnSlash(cx, cy, 76, startA, endA, '#ffffff', 0.22);
        game.vfx.spawnShockwave(cx, this.groundY, 92, '#38bdf8', 0.3, true);
        game.vfx.spawnGlyphBurst(cx, cy, 4, 'steel');

        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= this.attackRange + 48) {
          const isCrit = mode === 2 || Math.random() < 0.28;
          const dmg = isCrit ? 128 : 86;
          enemy.takeDamage(dmg, this, isCrit, 125, mode === 2 ? -140 : 0);
          if (game.audio) game.audio.play(isCrit ? 'hit_crit' : 'clang', enemy.x);
          if (game.renderer) game.renderer.triggerHitStop(0.065);
          game.vfx.spawnBurst(enemy.x, enemy.y - 65, 14, '#bae6fd', 230);
          game.vfx.spawnGlyphBurst(enemy.x, enemy.y - 70, 5, 'steel');
          if (isCrit) {
            game.vfx.spawnLightning(enemy.x, -140, this.groundY, '#ffffff', '#38bdf8');
            game.vfx.spawnShockwave(enemy.x, enemy.y - 55, 95, '#fef08a', 0.28);
          }
        }
      }
    } else if (t >= 0.96) {
      this.setState('IDLE');
    }
  }

  updateSkill(dt, enemy, game) {
    const t = this.stateTimer;
    this.isDeflecting = t >= 0.12 && t <= 1.05;

    if (t < 0.16) {
      this.torsoAngle = -this.facing * 0.2;
    } else if (t < 1.05) {
      if (!this.didActionFrame) {
        this.didActionFrame = true;
        if (game.audio) game.audio.play('whirlwind', this.x);
        game.vfx.spawnTornado({
          x: this.x,
          groundY: this.groundY,
          followFighter: this,
          radius: 78,
          height: 215,
          color: '#38bdf8',
          coreColor: '#bae6fd',
          maxLife: 0.92
        });
        game.vfx.spawnGlyphBurst(this.x, this.y - 75, 7, 'steel');
      }
      this.spinAngle += dt * 22;
      this.x += this.facing * 265 * dt;

      if (Math.random() < 0.55) {
        game.vfx.spawnShockwave(this.x, this.y - 54, 96, '#7dd3fc', 0.24, true);
      }

      for (const proj of game.vfx.projectiles) {
        if (proj.owner !== this && !proj.isMeteor && Math.hypot(proj.x - this.x, proj.y - (this.y - 60)) < 98) {
          proj.owner = this;
          proj.vx = -proj.vx * 1.3;
          proj.vy = -25;
          proj.color = '#38bdf8';
          if (game.audio) game.audio.play('reflect', this.x);
          game.vfx.spawnDamageText(this.x, this.y - 125, 0, false, 'AEGIS REFLECT!', '#38bdf8');
          game.vfx.spawnBurst(proj.x, proj.y, 14, '#38bdf8', 240);
          game.vfx.spawnShockwave(proj.x, proj.y, 85, '#fef08a', 0.26);
          game.renderer.triggerShake(6, 0.14);
        }
      }

      if (!this.lastSpinTick || t - this.lastSpinTick >= 0.22) {
        this.lastSpinTick = t;
        game.vfx.spawnSlash(this.x, this.y - 58, 102, 0, Math.PI * 2, '#38bdf8', 0.22);
        game.vfx.spawnSlash(this.x, this.y - 84, 78, 0, Math.PI * 2, '#bae6fd', 0.18);
        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 122) {
          enemy.takeDamage(48, this, false, 80, 0);
          if (game.audio) game.audio.play('clang', enemy.x);
          game.vfx.spawnGlyphBurst(enemy.x, enemy.y - 60, 3, 'steel');
        }
      }
    } else if (t >= 1.15) {
      this.isDeflecting = false;
      this.lastSpinTick = 0;
      this.setState('IDLE');
    }
  }

  updateUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    if (t < 0.42) {
      this.spawnedSkyBlades = false;
      if (Math.random() < 0.85) {
        game.vfx.spawnParticle({
          x: this.x + (Math.random() - 0.5) * 90,
          y: this.y,
          vx: 0,
          vy: -290,
          size: 7,
          color: Math.random() > 0.4 ? '#38bdf8' : '#facc15',
          maxLife: 0.38
        });
      }
    } else if (t < 0.9) {
      if (this.y >= this.groundY - 5 && this.vy >= 0) {
        this.vy = -960;
        game.vfx.spawnShockwave(this.x, this.groundY, 145, '#38bdf8', 0.38, true);
        game.vfx.spawnGlyphBurst(this.x, this.groundY - 40, 8, 'steel');
      }
      if (!this.spawnedSkyBlades && enemy) {
        this.spawnedSkyBlades = true;
        // Summon 4 Colossal Spectral Runeblades raining from the heavens around the target
        const offsets = [-110, -42, 42, 110];
        offsets.forEach((off, idx) => {
          game.vfx.spawnSkyStrike({
            x: enemy.x + off,
            y: -220 - idx * 55,
            groundY: this.groundY,
            vx: 0,
            vy: 1380,
            type: 'runeblade',
            color: '#38bdf8',
            coreColor: '#fef08a',
            owner: this,
            target: enemy,
            damage: 26,
            delay: idx * 0.08,
            maxLinger: 0.65
          });
        });
      }
      if (enemy) {
        const targetX = enemy.x - this.facing * 45;
        this.x += (targetX - this.x) * 6.5 * dt;
      }
    } else if (!this.didActionFrame) {
      this.vy = 1650;
      if (this.y >= this.groundY - 8) {
        this.y = this.groundY;
        this.vy = 0;
        this.didActionFrame = true;
        if (game.audio) game.audio.play('earthshatter', this.x);

        game.renderer.triggerShake(28, 0.68);
        game.renderer.triggerAberration(16);
        game.renderer.triggerHitStop(0.095);

        // Cathedral-Height Excalibur Sky Beam + 5 Thunderbolts + Runic Pillar
        game.vfx.spawnBeam({
          x1: this.x,
          y1: -420,
          x2: this.x,
          y2: this.groundY,
          width: 76,
          color: '#38bdf8',
          coreColor: '#fef08a',
          maxLife: 0.58
        });
        game.vfx.spawnFlamePillar(this.x, this.groundY, this, enemy, {
          theme: 'steel',
          delay: 0.05,
          maxLife: 1.15,
          scaleWidth: 1.25
        });

        game.vfx.spawnLightning(this.x - 55, -240, this.groundY, '#fef08a', '#38bdf8');
        game.vfx.spawnLightning(this.x - 22, -260, this.groundY, '#ffffff', '#38bdf8');
        game.vfx.spawnLightning(this.x, -300, this.groundY, '#ffffff', '#38bdf8');
        game.vfx.spawnLightning(this.x + 25, -260, this.groundY, '#fef08a', '#38bdf8');
        game.vfx.spawnLightning(this.x + 60, -240, this.groundY, '#38bdf8', '#0284c7');

        game.vfx.spawnShockwave(this.x, this.groundY, 330, '#facc15', 0.65, true);
        game.vfx.spawnShockwave(this.x, this.groundY - 35, 250, '#38bdf8', 0.52, false);
        game.vfx.spawnDecal(this.x, 190, 'fissure', '#38bdf8', 6.5);
        game.vfx.spawnBurst(this.x, this.groundY - 10, 34, '#facc15', 390, { upBias: 175, size: 9 });
        game.vfx.spawnBurst(this.x, this.groundY - 10, 28, '#38bdf8', 350, { upBias: 135, size: 8 });
        game.vfx.spawnGlyphBurst(this.x, this.groundY - 60, 10, 'steel');

        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 295) {
          enemy.takeDamage(215, this, true, 240, -380);
        }
      }
    } else if (t >= 1.65) {
      this.setState('IDLE');
    }
  }

  draw(ctx, isReflection = false) {
    const sprites = PixelForge.initAssets().warrior;
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const w = 192;
    const h = 192;
    const frameIdx = PixelForge.getFrameIndex(this, this.walkPhase);

    if (!isReflection && (this.state === 'SKILL' || this.state === 'ULTIMATE' || this.state === 'AUTO_ATTACK')) {
      for (let g = 1; g <= 2; g++) {
        ctx.save();
        ctx.globalAlpha = 0.22 / g;
        ctx.translate(Math.round(this.x - this.facing * g * 18), Math.round(this.y));
        ctx.scale(this.facing, 1);
        const ghostIdx = Math.max(0, frameIdx - g);
        PixelForge.drawGhostFrame(ctx, sprites, ghostIdx, w, h);
        ctx.restore();
      }
    }

    ctx.translate(Math.round(this.x), Math.round(this.y));
    ctx.scale(this.facing, 1);

    PixelForge.drawSheetFrame(ctx, sprites, this, w, h, this.walkPhase, isReflection);

    if (this.hitFlash > 0 && !isReflection) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.6;
      PixelForge.drawGhostFrame(ctx, sprites, frameIdx, w, h);
    }

    ctx.restore();
  }
}
