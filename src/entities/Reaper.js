import { Fighter } from './Fighter.js';
import { PixelForge } from '../engine/PixelForge.js';

export class Reaper extends Fighter {
  constructor(x, groundY, facing = 1) {
    super({
      name: 'Malakor',
      x,
      groundY,
      facing,
      maxHp: 1240,
      attackRange: 175,
      moveSpeed: 192,
      autoInterval: 1.08,
      lightColor: 'rgba(192, 132, 252, 1)',
      primaryColor: '#c084fc'
    });
    this.heroId = 'reaper';
    this.theme = 'abyssal';
    this.deathSfx = 'death_reaper';
    this.hasPoise = true;
    this.skillMaxCooldown = 4.9;
    this.skillTriggerRange = 540;
    this.skillName = 'SPECTRAL CHAIN';
    this.ultName = 'GRIM HARVEST';
    this.comboStep = 0;
    this.stepDustTimer = 0;
    this.didChainPull = false;
    this.didReapFinisher = false;
    this.chainTargetX = null;
    this.chainTargetY = null;
    this.ultStep = 0;
    this.didPhantomAscent = false;
    this.dodgeMaxCooldown = 3.2;
    this.dashMaxCooldown = 3.0;
  }

  getEffectiveAttackRange() {
    // Every 3rd swing unleashes an Abyssal Crescent Scythe-Wave up to 390px!
    return this.comboStep % 3 === 2 ? 390 : this.attackRange;
  }

  onStartDash(enemy, game, dir) {
    this.dashDuration = 0.40;
    this.vx = dir * 515;
    if (game.audio) game.audio.play('scythe_reap', this.x);
    game.vfx.spawnShockwave(this.x, this.y - 84, 88, '#c084fc', 0.28, false, true);
    game.vfx.spawnGlyphBurst(this.x, this.y - 88, 6, 'abyssal');
    game.vfx.spawnDamageText(this.x, this.y - 142, 0, false, 'WRAITH LUNGE!', '#c084fc');
  }

  onStartDodge(enemy, game, dir) {
    this.dashDuration = 0.38;
    // Phase forward through ranged projectiles when kited, or step away from melee
    const smartDir = enemy && Math.abs(enemy.x - this.x) > 220 ? this.facing : dir;
    this.dashDir = smartDir;
    this.vx = smartDir * 440;
    if (game.audio) game.audio.play('blink', this.x);
    game.vfx.spawnShockwave(this.x, this.y - 90, 92, '#e879f9', 0.28);
    game.vfx.spawnGlyphBurst(this.x, this.y - 90, 6, 'abyssal');
    game.vfx.spawnDamageText(this.x, this.y - 142, 0, false, 'WRAITH PHASE!', '#e879f9');
  }

  updateDashOrDodge(dt, enemy, game) {
    const t = this.stateTimer;
    const speed = this.state === 'DASH' ? 515 : 410;
    this.x += this.dashDir * speed * dt;

    if (Math.random() < 0.78) {
      game.vfx.spawnParticle({
        x: this.x - this.dashDir * 18,
        y: this.groundY - 14 - Math.random() * 68,
        vx: -this.dashDir * 115,
        vy: -32,
        size: 6,
        color: Math.random() > 0.4 ? '#c084fc' : '#f43f5e',
        maxLife: 0.28
      });
    }

    if (
      this.state === 'DASH' &&
      !this.didActionFrame &&
      enemy &&
      !enemy.isDead &&
      Math.abs(enemy.x - this.x) <= 156
    ) {
      this.didActionFrame = true;
      enemy.takeDamage(46, this, false, 90, -60);
      this.heal(14, 'DRAIN');
      if (game.audio) game.audio.play('scythe_reap', enemy.x);
      game.vfx.spawnSlash(this.x + this.facing * 44, this.y - 96, 108, -1.3, 1.2, '#c084fc', 0.28);
      game.vfx.spawnSlash(this.x + this.facing * 44, this.y - 96, 86, -1.3, 1.2, '#f43f5e', 0.22);
      game.vfx.spawnShockwave(enemy.x, enemy.y - 88, 92, '#c084fc', 0.26);
    }

    if (t >= this.dashDuration) {
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  update(dt, enemy, game) {
    if (!this.isDead && this.state === 'WALK') {
      this.stepDustTimer += dt;
      if (this.stepDustTimer >= 0.32) {
        this.stepDustTimer = 0;
        if (game.audio) game.audio.play('footstep_steel', this.x);
        game.vfx.spawnBurst(this.x - this.facing * 14, this.groundY - 2, 4, '#c084fc', 65, {
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

    if (t < 0.30) {
      this.torsoAngle = -this.facing * 0.24 * (t / 0.30);
      if (Math.random() < 0.58) {
        game.vfx.spawnParticle({
          x: this.x - this.facing * 18 + (Math.random() - 0.5) * 28,
          y: this.y - 106 + (Math.random() - 0.5) * 28,
          vx: this.facing * 48,
          vy: -78,
          size: 5,
          color: mode === 2 ? '#f43f5e' : '#c084fc',
          maxLife: 0.26
        });
      }
    } else if (t < 0.66) {
      if (!this.didActionFrame) {
        this.didActionFrame = true;
        this.comboStep++;
        this.vx += this.facing * 175;
        this.torsoVel = this.facing * 14;

        const cx = this.x + this.facing * 48;
        const cy = this.y - 98;
        const startA = this.facing === 1 ? -1.75 : Math.PI - 1.05;
        const endA = this.facing === 1 ? 1.15 : Math.PI + 1.75;

        if (mode === 2) {
          if (game.audio) game.audio.play('scythe_reap', this.x);
          game.vfx.spawnDamageText(this.x, this.y - 146, 0, false, 'ABYSSAL REAP!', '#e879f9');
          game.vfx.spawnProjectile({
            x: this.x + this.facing * 56,
            y: this.y - 106,
            vx: this.facing * 640,
            vy: 0,
            radius: 20,
            color: '#c084fc',
            coreColor: '#f43f5e',
            owner: this,
            damage: 58,
            type: 'blade_wave'
          });
          game.vfx.spawnShockwave(cx, cy, 86, '#f43f5e', 0.26, false, true);
        } else {
          if (game.audio) game.audio.play('scythe_reap', this.x);
        }

        game.vfx.spawnSlash(cx, cy, 126, startA, endA, '#7e22ce', 0.32);
        game.vfx.spawnSlash(cx, cy, 106, startA, endA, '#c084fc', 0.26);
        game.vfx.spawnSlash(cx, cy, 84, startA, endA, '#f43f5e', 0.20);
        game.vfx.spawnShockwave(cx, this.groundY, 98, '#c084fc', 0.28, true);
        game.vfx.spawnGlyphBurst(cx, cy, 5, 'abyssal');

        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= this.attackRange + 52) {
          const isCrit = mode === 2 || Math.random() < 0.24;
          const dmg = mode === 2 ? 84 : mode === 1 ? 74 : 68;
          enemy.takeDamage(dmg, this, isCrit, 85, mode === 2 ? -115 : 0);
          // Signature Soulreaper Passive: Melee Scythe hits leech vital force!
          this.heal(mode === 2 ? 22 : 15, 'DRAIN');
          if (game.audio) game.audio.play(mode === 2 ? 'soul_drain' : 'scythe_reap', enemy.x);
          if (game.renderer) game.renderer.triggerHitStop(0.055);
          game.vfx.spawnBurst(enemy.x, enemy.y - 96, 14, '#c084fc', 235);
          game.vfx.spawnGlyphBurst(enemy.x, enemy.y - 96, 5, 'abyssal');
        }
      }
    } else if (t >= 0.88) {
      this.setState('IDLE');
    }
  }

  updateSkill(dt, enemy, game) {
    // SIGNATURE SKILL: "SPECTRAL CHAIN" (Soul-Hook Drag -> Abyssal Guillotine Reap + Lifesteal)
    // Phase 1 (0.00s - 0.50s): Launches a barbed Spectral Chain across the arena, hooking & dragging the enemy into Scythe range!
    // Phase 2 (0.50s - 0.96s): Unleashes a 360° Crimson-Amethyst Guillotine Harvest that drains +52 HP!
    const t = this.stateTimer;
    const ww = game.renderer.worldWidth;

    if (t < 0.10) {
      this.didChainPull = false;
      this.didReapFinisher = false;
      this.torsoAngle = -this.facing * 0.22;
      this.chainTargetX = enemy ? enemy.x : this.x + this.facing * 320;
      this.chainTargetY = enemy ? enemy.y - 96 : this.y - 96;
    } else if (t < 0.50) {
      if (!this.didChainPull) {
        this.didChainPull = true;
        if (game.audio) game.audio.play('chain_hook', this.x);

        const targetX = enemy ? enemy.x : this.x + this.facing * 320;
        const targetY = enemy ? enemy.y - 96 : this.y - 96;
        this.chainTargetX = targetX;
        this.chainTargetY = targetY;

        game.vfx.spawnBeam(this.x + this.facing * 36, this.y - 98, targetX, targetY, '#c084fc', 18, 0.38);
        game.vfx.spawnShockwave(targetX, targetY, 96, '#f43f5e', 0.30);
        game.vfx.spawnGlyphBurst(targetX, targetY, 7, 'abyssal');

        if (enemy && !enemy.isDead) {
          enemy.takeDamage(28, this, false, -180, -60);
          game.vfx.spawnDamageText(enemy.x, enemy.y - 152, 0, false, 'SOUL HOOKED!', '#e879f9');
          game.renderer.triggerShake(10, 0.20);
        }
      }

      // Actively reel the hooked enemy in toward Malakor's scythe range!
      if (enemy && !enemy.isDead) {
        const desiredX = Math.max(95, Math.min(ww - 95, this.x + this.facing * 122));
        enemy.x += (desiredX - enemy.x) * Math.min(1, dt * 11.5);
        this.chainTargetX = enemy.x;
        this.chainTargetY = enemy.y - 96;
        if (Math.random() < 0.7) {
          game.vfx.spawnParticle({
            x: enemy.x + (Math.random() - 0.5) * 30,
            y: enemy.y - 92 + (Math.random() - 0.5) * 30,
            vx: (this.x - enemy.x) * 2.2,
            vy: -35,
            size: 6,
            color: Math.random() > 0.4 ? '#c084fc' : '#f43f5e',
            maxLife: 0.25
          });
        }
      }
    } else if (!this.didReapFinisher) {
      this.didReapFinisher = true;
      this.chainTargetX = null;
      if (game.audio) game.audio.play('scythe_reap', this.x);
      if (game.audio) game.audio.play('soul_drain', this.x);
      game.renderer.triggerShake(14, 0.30);
      game.renderer.triggerHitStop(0.06);

      const reapX = this.x + this.facing * 52;
      game.vfx.spawnSlash(this.x, this.y - 96, 138, 0, Math.PI * 2, '#c084fc', 0.34);
      game.vfx.spawnSlash(this.x, this.y - 96, 112, 0, Math.PI * 2, '#f43f5e', 0.28);
      game.vfx.spawnShockwave(reapX, this.groundY, 185, '#c084fc', 0.40, true);
      game.vfx.spawnDecal(reapX, 118, 'fissure', '#c084fc', 4.2);

      const spikeCenter = enemy ? enemy.x : reapX;
      [-48, 0, 48].forEach((off, idx) => {
        game.vfx.spawnCrystalSpike({
          x: spikeCenter + off,
          groundY: this.groundY,
          height: idx === 1 ? 132 : 98,
          width: idx === 1 ? 36 : 28,
          tilt: (off / 48) * 0.24,
          color: '#9333ea',
          coreColor: '#f43f5e',
          owner: this,
          target: enemy,
          damage: 14,
          delay: idx * 0.04,
          maxLife: 0.76
        });
      });

      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 220) {
        enemy.takeDamage(56, this, true, 115, -135);
        this.heal(48, 'SOUL DRAIN');
      }
    } else if (t >= 0.96) {
      this.chainTargetX = null;
      this.setState('IDLE');
    }
  }

  updateUltimate(dt, enemy, game) {
    // 3-STAGE ABYSSAL ULTIMATE ART: "GRIM HARVEST"
    // Stage 1 (0.00s - 0.48s): Shadow-Step Double Reap Blitz + Soul Shackle Chains
    // Stage 2 (0.48s - 0.90s): Phantom Guillotine Ascent (155px high above enemy with giant X-Scythe Slashes)
    // Stage 3 (0.90s - 1.52s): Netherworld Cataclysm Reap (9 Obsidian-Amethyst Spires + Twin Death-Waves + Soul Drain)
    const t = this.stateTimer;
    const ww = game.renderer.worldWidth;
    const targetX = enemy ? enemy.x : ww * 0.5;
    this.vx = 0;
    this.vy = 0;

    if (t < 0.04) {
      this.ultStep = 0;
      this.didPhantomAscent = false;
      this.isOmnislashing = true;
    }

    // STAGE 1: Shadow-Step Double Reap Blitz + Soul Chains
    if (t < 0.48 && enemy && !enemy.isDead) {
      this.isOmnislashing = true;
      this.y = this.groundY;

      if (t >= 0.06 && this.ultStep === 0) {
        this.ultStep = 1;
        const side = this.x <= enemy.x ? 1 : -1;
        this.dashDir = side;
        this.x = Math.max(105, Math.min(ww - 105, enemy.x + side * 108));
        this.facing = -side;
        if (game.audio) game.audio.play('chain_hook', enemy.x);
        if (game.audio) game.audio.play('scythe_reap', enemy.x);
        game.renderer.triggerShake(11, 0.16);
        game.vfx.spawnBeam(enemy.x - 110, this.groundY, enemy.x, enemy.y - 98, '#c084fc', 14, 0.35);
        game.vfx.spawnBeam(enemy.x + 110, this.groundY, enemy.x, enemy.y - 98, '#f43f5e', 14, 0.35);
        game.vfx.spawnSlash(enemy.x, enemy.y - 104, 126, -1.05, 0.95, '#c084fc', 0.32);
        game.vfx.spawnSlash(enemy.x, enemy.y - 104, 102, 2.1, 3.9, '#f43f5e', 0.28);
        game.vfx.spawnDamageText(enemy.x, enemy.y - 160, 0, false, 'SOUL SHACKLE!', '#c084fc');
        enemy.takeDamage(32, this, false, 30, -50);
        this.heal(26, 'HARVEST');
      }

      if (t >= 0.26 && this.ultStep === 1) {
        this.ultStep = 2;
        const side = this.x <= enemy.x ? 1 : -1;
        this.dashDir = side;
        this.x = Math.max(105, Math.min(ww - 105, enemy.x + side * 112));
        this.facing = -side;
        if (game.audio) game.audio.play('scythe_reap', enemy.x);
        if (game.audio) game.audio.play('soul_drain', enemy.x);
        game.renderer.triggerShake(13, 0.18);
        game.vfx.spawnSlash(enemy.x, enemy.y - 108, 136, 0.3, 2.8, '#f43f5e', 0.34);
        game.vfx.spawnSlash(enemy.x, enemy.y - 108, 114, -2.6, -0.3, '#c084fc', 0.30);
        game.vfx.spawnShockwave(enemy.x, enemy.y - 104, 128, '#c084fc', 0.28, false, true);
        game.vfx.spawnDamageText(enemy.x, enemy.y - 165, 0, false, 'DEATH REAP!', '#f43f5e');
        enemy.takeDamage(34, this, true, 40, -90);
        this.heal(28, 'HARVEST');
      }
      return;
    }

    // STAGE 2: Phantom Guillotine Ascent (0.48s - 0.90s)
    if (t >= 0.48 && t < 0.90) {
      this.isOmnislashing = true;
      this.isFlipVault = true;
      const u = (t - 0.48) / 0.42;
      if (!this.didPhantomAscent) {
        this.didPhantomAscent = true;
        this.vaultStartX = this.x;
        const dirToEnemy = enemy ? Math.sign(enemy.x - this.x) || this.facing : this.facing;
        this.facing = dirToEnemy;
        this.vaultTargetX = enemy
          ? Math.max(115, Math.min(ww - 115, enemy.x - dirToEnemy * 64))
          : this.x;
        if (game.audio) game.audio.play('blink', this.x);
        game.vfx.spawnShockwave(this.x, this.groundY, 165, '#c084fc', 0.36, true);
        game.vfx.spawnSlash(this.x + this.facing * 42, this.y - 110, 132, -1.8, 0.8, '#c084fc', 0.34);
        game.vfx.spawnDamageText(this.x, this.y - 165, 0, false, 'PHANTOM GUILLOTINE!', '#e879f9');
      }

      if (enemy) {
        const dirToEnemy = Math.sign(enemy.x - this.x) || this.facing;
        this.facing = dirToEnemy;
        this.vaultTargetX = Math.max(115, Math.min(ww - 115, enemy.x - dirToEnemy * 64));
      }
      this.x = this.vaultStartX + (this.vaultTargetX - this.vaultStartX) * u;
      const heightCurve =
        u < 0.68
          ? Math.sin((u / 0.68) * (Math.PI * 0.5))
          : Math.cos(((u - 0.68) / 0.32) * (Math.PI * 0.5));
      this.y = this.groundY - heightCurve * 158;

      if (Math.random() < 0.85) {
        game.vfx.spawnParticle({
          x: this.x + (Math.random() - 0.5) * 68,
          y: this.y - 84 + (Math.random() - 0.5) * 48,
          vx: -this.facing * 95,
          vy: 88,
          size: 7,
          color: Math.random() > 0.4 ? '#c084fc' : '#f43f5e',
          maxLife: 0.30
        });
      }
      return;
    }

    // STAGE 3: Netherworld Cataclysm Reap (0.90s - 1.52s)
    this.y = this.groundY;
    this.isFlipVault = false;
    this.isOmnislashing = false;

    if (!this.didActionFrame) {
      this.didActionFrame = true;
      if (game.audio) game.audio.play('reaper_ult', this.x);
      if (game.audio) game.audio.play('scythe_reap', this.x);

      game.renderer.triggerShake(28, 0.62);
      game.renderer.triggerAberration(16);
      game.renderer.triggerHitStop(0.095);

      const slamX = this.x + this.facing * 52;
      const startA = this.facing === 1 ? -1.75 : Math.PI - 1.55;
      const endA = this.facing === 1 ? 1.55 : Math.PI + 1.75;
      game.vfx.spawnSlash(slamX, this.groundY - 94, 162, startA, endA, '#c084fc', 0.44);
      game.vfx.spawnSlash(slamX, this.groundY - 94, 132, startA, endA, '#f43f5e', 0.36);

      const dir = this.facing;
      for (let i = 0; i < 9; i++) {
        const spikeX = slamX + dir * (28 + i * 62);
        game.vfx.spawnCrystalSpike({
          x: spikeX,
          groundY: this.groundY,
          height: 122 + (i % 2 === 0 ? 50 : 20),
          width: 38 + (i % 2) * 8,
          tilt: dir * (0.32 + i * 0.045),
          color: i % 2 === 0 ? '#9333ea' : '#c084fc',
          coreColor: '#f43f5e',
          owner: this,
          target: enemy,
          damage: 14,
          delay: i * 0.038,
          maxLife: 0.94
        });
      }

      [0, 1].forEach((idx) => {
        game.vfx.spawnProjectile({
          x: slamX + dir * (idx * 34),
          y: this.groundY - 98 - idx * 24,
          vx: dir * (720 - idx * 80),
          vy: 0,
          radius: 22 - idx * 3,
          color: idx === 0 ? '#c084fc' : '#f43f5e',
          coreColor: '#ffffff',
          owner: this,
          damage: 24,
          type: 'blade_wave',
          isMeteor: false
        });
      });

      game.vfx.spawnShockwave(slamX, this.groundY, 330, '#c084fc', 0.60, true);
      game.vfx.spawnShockwave(targetX, this.groundY, 255, '#f43f5e', 0.50, true);
      game.vfx.spawnDecal(slamX, 205, 'fissure', '#c084fc', 6.2);
      game.vfx.spawnDecal(targetX, 180, 'fissure', '#f43f5e', 5.8);
      game.vfx.spawnBurst(slamX, this.groundY - 20, 34, '#c084fc', 395, { upBias: 180, size: 9 });
      game.vfx.spawnBurst(targetX, this.groundY - 20, 26, '#f43f5e', 340, { upBias: 140, size: 8 });
      game.vfx.spawnGlyphBurst(slamX, this.groundY - 75, 12, 'abyssal');

      if (enemy && !enemy.isDead) {
        enemy.takeDamage(118, this, true, 195, -280);
        this.heal(44, 'GRIM HARVEST');
      }
    } else if (t >= 1.52) {
      this.isOmnislashing = false;
      this.isFlipVault = false;
      this.y = this.groundY;
      this.setState('IDLE');
    }
  }

  draw(ctx, isReflection = false) {
    const sprites = PixelForge.initAssets().reaper;
    if (!sprites) return;

    // Draw Pixel-Art Barbed Spectral Chain links in world space when hooking an enemy
    if (!isReflection && this.state === 'SKILL' && this.chainTargetX !== null) {
      ctx.save();
      const x1 = Math.round(this.x + this.facing * 36);
      const y1 = Math.round(this.y - 98);
      const x2 = Math.round(this.chainTargetX);
      const y2 = Math.round(this.chainTargetY || this.y - 96);
      const steps = 14;
      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const lx = Math.round((x1 + (x2 - x1) * u) / 4) * 4;
        const ly = Math.round((y1 + (y2 - y1) * u + Math.sin(u * Math.PI * 3 + this.stateTimer * 35) * 6) / 4) * 4;
        ctx.fillStyle = '#0b0f19';
        ctx.fillRect(lx - 6, ly - 6, 12, 12);
        ctx.fillStyle = i % 2 === 0 ? '#c084fc' : '#f43f5e';
        ctx.fillRect(lx - 4, ly - 4, 8, 8);
      }
      ctx.restore();
    }

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const w = 208;
    const h = 208;
    const frameIdx = PixelForge.getFrameIndex(this, this.walkPhase);

    ctx.translate(Math.round(this.x), Math.round(this.y));
    ctx.scale(this.facing, 1);

    // Dynamic Pixel-Art Abyssal Wraith Speed-Streaks during Ultimate / Skill
    if (!isReflection && (this.state === 'ULTIMATE' || this.state === 'SKILL')) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const t = this.stateTimer;
      for (let i = 0; i < 6; i++) {
        const sy = -152 + i * 22 + (((t * 60 + i * 7) | 0) % 6) * 2;
        const sx = -88 - ((i * 19 + ((t * 180) | 0)) % 48);
        const sw = 28 + (i % 3) * 14;
        ctx.fillStyle = i % 2 === 0 ? '#c084fc' : '#f43f5e';
        ctx.globalAlpha = 0.68;
        ctx.fillRect(sx, sy, sw, 4);
      }
      ctx.restore();
    }

    PixelForge.drawSheetFrame(ctx, sprites, this, w, h, this.walkPhase, isReflection);

    if (this.hitFlash > 0 && !isReflection) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5;
      PixelForge.drawGhostFrame(ctx, sprites, frameIdx, w, h);
    }

    ctx.restore();
  }
}
