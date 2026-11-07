import { Fighter } from './Fighter.js';
import { PixelForge } from '../engine/PixelForge.js';
import { PixelFont } from '../engine/PixelFont.js';

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

export class Chronomancer extends Fighter {
  constructor(x, groundY, facing = 1) {
    super({
      name: 'Zephyros',
      x,
      groundY,
      facing,
      maxHp: 1255,
      attackRange: 510,
      moveSpeed: 168,
      autoInterval: 1.04,
      lightColor: 'rgba(45, 212, 191, 1)',
      primaryColor: '#2dd4bf'
    });
    this.heroId = 'chronomancer';
    this.theme = 'chrono';
    this.deathSfx = 'death_chrono';
    this.skillMaxCooldown = 4.90;
    this.skillTriggerRange = 540;
    this.skillName = 'HOURGLASS STASIS';
    this.ultName = 'DOOMSDAY MIDNIGHT';
    this.comboStep = 0;
    this.stepDustTimer = 0;

    // 100% Bespoke Chronomancer Visual Systems (Zero recycled VFX from other champions)
    this.stasisHourglass = null; // 16-bit HD-2D Brass & Teal Stasis Hourglass encasing the enemy
    this.doomsdayClock = null; // Colossal 320x320 16-bit HD-2D Astral Clockface + spinning hands
    this.temporalEchoes = []; // Frozen golden-teal Temporal Echo silhouettes & astrolabe dials
    this.rewindRibbons = []; // Reverse-flowing golden-teal Roman numeral streams rewinding into Zephyros

    this.didStasisCast = false;
    this.didStasisShatter = false;
    this.ultStage = 0;
    this.dodgeMaxCooldown = 3.20;
    this.dashMaxCooldown = 3.25;
  }

  /**
   * Rewinds Zephyros's personal timeline to restore lost HP with reverse-flowing Roman numeral ribbons
   */
  rewindTimeline(amount, sourceX, sourceY, game, label = 'TIME REWIND') {
    if (this.isDead || amount <= 0) return 0;
    const prevHp = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    const actual = Math.max(1, Math.round(amount));

    if (game && game.vfx) {
      game.vfx.spawnDamageText(this.x, this.y - 146, 0, false, `${label} +${actual}`, '#2dd4bf');
      game.vfx.spawnGlyphBurst(this.x, this.y - 98, 5, 'chrono');
    }

    const fromX = sourceX ?? this.x - this.facing * 110;
    const fromY = sourceY ?? this.y - 98;
    for (let i = 0; i < 5; i++) {
      this.rewindRibbons.push({
        startX: fromX + (Math.random() - 0.5) * 44,
        startY: fromY + (Math.random() - 0.5) * 44,
        arcHeight: (i % 2 === 0 ? -1 : 1) * (40 + Math.random() * 45),
        numeral: ROMAN_NUMERALS[(i * 3 + Math.floor(Math.random() * 12)) % 12],
        life: -i * 0.04,
        maxLife: 0.48 + Math.random() * 0.12
      });
    }
    return this.hp - prevHp;
  }

  spawnTemporalEcho(frameIdx) {
    if (this.temporalEchoes.length > 4) this.temporalEchoes.shift();
    this.temporalEchoes.push({
      x: this.x,
      y: this.groundY,
      facing: this.facing,
      frameIdx,
      life: 0,
      maxLife: 0.58
    });
  }

  onStartDash(enemy, game, dir) {
    this.dashDuration = 0.38;
    this.isDeflecting = false;
    this.vx = dir * 390;
    this.spawnTemporalEcho(PixelForge.getFrameIndex(this, this.walkPhase));
    if (game.audio) game.audio.play('time_rewind', this.x);
    game.vfx.spawnGlyphBurst(this.x, this.y - 88, 6, 'chrono');
    game.vfx.spawnDamageText(this.x, this.y - 144, 0, false, 'CHRONO SURGE!', '#2dd4bf');
  }

  onStartDodge(enemy, game, dir) {
    this.dashDuration = 0.38;
    this.isDeflecting = false;
    // Smart corner escape: if backed near the wall, phase-shift across the enemy toward open arena space!
    const ww = game.renderer ? game.renderer.worldWidth : 1200;
    const nearLeftWall = this.x < 210 && dir < 0;
    const nearRightWall = this.x > ww - 210 && dir > 0;
    const smartDir = nearLeftWall ? 1 : nearRightWall ? -1 : dir;
    this.dashDir = smartDir;
    this.vx = smartDir * 345;

    this.spawnTemporalEcho(PixelForge.getFrameIndex(this, this.walkPhase));
    if (game.audio) game.audio.play('time_rewind', this.x);
    const isVanguard = enemy && enemy.hasPoise && enemy.attackRange <= 160;
    const isHarvester = enemy && enemy.hasPoise && enemy.attackRange > 160;
    const isGroundedCaster = enemy && !enemy.hasPoise && enemy.moveSpeed <= 122;
    this.rewindTimeline(
      isVanguard ? 15 : isHarvester ? 16 : isGroundedCaster ? 13 : 14,
      this.x,
      this.y - 96,
      game,
      'TIME SLIP'
    );
    game.vfx.spawnGlyphBurst(this.x, this.y - 88, 7, 'chrono');

    // Leave a spinning Pendulum Saw-Gear at his departure echo when dodging
    if (enemy && !enemy.isDead) {
      const aimDir = Math.sign(enemy.x - this.x) || this.facing;
      const spawnX = this.x + aimDir * 36;
      const spawnY = this.y - 104;
      const dx = enemy.x - spawnX;
      const dy = (enemy.y - 108) - spawnY;
      const dist = Math.hypot(dx, dy) || 1;
      const gearDmg = isVanguard ? 34 : isHarvester ? 36 : isGroundedCaster ? 41 : 44;
      game.vfx.spawnProjectile({
        x: spawnX,
        y: spawnY,
        vx: (dx / dist) * 645,
        vy: (dy / dist) * 645,
        radius: 19,
        color: '#2dd4bf',
        coreColor: '#facc15',
        owner: this,
        damage: gearDmg,
        type: 'clock_gear'
      });
    }
  }

  updateDashOrDodge(dt, enemy, game) {
    const t = this.stateTimer;
    const speed = this.state === 'DASH' ? 380 : 335;
    this.x += this.dashDir * speed * dt;

    if (Math.random() < 0.78) {
      game.vfx.spawnParticle({
        x: this.x + (Math.random() - 0.5) * 48,
        y: this.y - 40 - Math.random() * 90,
        vx: -this.dashDir * 85,
        vy: -25 + (Math.random() - 0.5) * 40,
        size: 5,
        color: Math.random() > 0.45 ? '#2dd4bf' : '#facc15',
        maxLife: 0.28
      });
    }

    if (t >= this.dashDuration) {
      this.isDeflecting = false;
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  update(dt, enemy, game) {
    // Advance Temporal Echoes
    for (let i = this.temporalEchoes.length - 1; i >= 0; i--) {
      const ec = this.temporalEchoes[i];
      ec.life += dt;
      if (ec.life >= ec.maxLife) {
        this.temporalEchoes.splice(i, 1);
      }
    }

    // Advance Rewind Ribbons
    for (let i = this.rewindRibbons.length - 1; i >= 0; i--) {
      const rr = this.rewindRibbons[i];
      rr.life += dt;
      if (rr.life >= rr.maxLife) {
        this.rewindRibbons.splice(i, 1);
      }
    }

    // Advance Active Stasis Hourglass Cage on the enemy
    if (this.stasisHourglass) {
      const hg = this.stasisHourglass;
      hg.life += dt;
      if (hg.target && !hg.target.isDead) {
        hg.x = hg.target.x;
        hg.y = hg.target.groundY;
        // Temporal Drag: slow enemy horizontal movement (poise-armored melee vanguards resist heavy stasis drag)
        if (!hg.target.hasPoise) {
          hg.target.vx *= 0.50;
        }
        hg.tickTimer += dt;
        if (hg.tickTimer >= 0.34) {
          hg.tickTimer = 0;
          const tEnemy = hg.target;
          const isVanguard = tEnemy.hasPoise && tEnemy.attackRange <= 160;
          const isHarvester = tEnemy.hasPoise && tEnemy.attackRange > 160;
          const isGroundedCaster = !tEnemy.hasPoise && tEnemy.moveSpeed <= 122;
          const tickDmg = isVanguard ? 12 : isHarvester ? 13 : isGroundedCaster ? 16 : 17;
          tEnemy.takeDamage(tickDmg, this, false, 12, 0);
          if (game.vfx) {
            game.vfx.spawnGlyphBurst(hg.x, hg.y - 98, 4, 'chrono');
          }
        }
      }
      if (hg.life >= hg.maxLife) {
        this.stasisHourglass = null;
      }
    }

    // Advance Colossal Doomsday Clockface
    if (this.doomsdayClock) {
      this.doomsdayClock.life += dt;
      if (this.doomsdayClock.life >= this.doomsdayClock.maxLife) {
        this.doomsdayClock = null;
      }
    }

    if (!this.isDead && this.state === 'WALK') {
      this.stepDustTimer += dt;
      if (this.stepDustTimer >= 0.32) {
        this.stepDustTimer = 0;
        if (game.audio) game.audio.play('footstep_steel', this.x);
      }
    }

    super.update(dt, enemy, game);
  }

  updateAutoAttack(dt, enemy, game) {
    const t = this.stateTimer;
    const mode = this.comboStep % 3;

    if (t < 0.28) {
      this.torsoAngle = -this.facing * 0.16 * (t / 0.28);
      if (Math.random() < 0.55) {
        game.vfx.spawnParticle({
          x: this.x + this.facing * 34 + (Math.random() - 0.5) * 24,
          y: this.y - 106 + (Math.random() - 0.5) * 24,
          vx: this.facing * 45,
          vy: -60,
          size: 5,
          color: mode === 2 ? '#facc15' : '#2dd4bf',
          maxLife: 0.24
        });
      }
    } else if (t < 0.62) {
      if (!this.didActionFrame) {
        this.didActionFrame = true;
        this.comboStep++;
        this.torsoVel = this.facing * 9;

        if (game.audio) game.audio.play('clock_gear', this.x);
        const spawnX = this.x + this.facing * 54;
        const spawnY = this.y - 108;
        const targetY = enemy ? enemy.y - 110 : spawnY;
        const dx = enemy ? enemy.x - spawnX : this.facing * 480;
        const dy = targetY - spawnY;
        const dist = Math.hypot(dx, dy) || 1;
        const speed = 665;
        game.vfx.spawnGlyphBurst(spawnX, spawnY, 5, 'chrono');

        const isVanguard = enemy && enemy.hasPoise && enemy.attackRange <= 160;
        const isHarvester = enemy && enemy.hasPoise && enemy.attackRange > 160;
        const isGroundedCaster = enemy && !enemy.hasPoise && enemy.moveSpeed <= 122;
        const primaryDmg = isVanguard
          ? mode === 2 ? 58 : 49
          : isHarvester
            ? mode === 2 ? 61 : 52
            : isGroundedCaster
              ? mode === 2 ? 63 : 54
              : mode === 2 ? 67 : 57;

        // Launch 16-bit HD-2D Razor-Edged Brass Clockwork Saw-Gear!
        game.vfx.spawnProjectile({
          x: spawnX,
          y: spawnY,
          vx: (dx / dist) * speed,
          vy: (dy / dist) * speed,
          radius: 20,
          color: '#2dd4bf',
          coreColor: '#facc15',
          owner: this,
          damage: primaryDmg,
          type: 'clock_gear'
        });

        // Every 3rd attack ("CHRONO ACCELERATION"): fires a twin escapement gear & shaves 0.40s off his skill cooldown!
        if (mode === 2) {
          this.skillCooldown = Math.max(0, this.skillCooldown - 0.40);
          game.vfx.spawnDamageText(this.x, this.y - 148, 0, false, 'CHRONO HASTE!', '#facc15');
          const twinDmg = isVanguard ? 33 : isHarvester ? 34 : isGroundedCaster ? 35 : 37;
          game.vfx.spawnProjectile({
            x: spawnX - this.facing * 18,
            y: spawnY - 16,
            vx: (dx / dist) * (speed * 0.94),
            vy: (dy / dist) * (speed * 0.94) - 16,
            radius: 17,
            color: '#facc15',
            coreColor: '#2dd4bf',
            owner: this,
            damage: twinDmg,
            type: 'clock_gear'
          });
        }
      }
    } else if (t >= 0.86) {
      this.setState('IDLE');
    }
  }

  updateSkill(dt, enemy, game) {
    // SIGNATURE SKILL: "HOURGLASS STASIS & TEMPORAL REWIND"
    // Encases the enemy inside the 16-bit HD-2D Ornate Brass & Teal Stasis Hourglass (`chronomancer_vfx.png`),
    // locking them in swirling temporal sand while rewinding Zephyros's own HP timeline!
    const t = this.stateTimer;

    if (t < 0.10) {
      this.didStasisCast = false;
      this.didStasisShatter = false;
      this.isDeflecting = true;
    } else if (t < 0.46) {
      if (!this.didStasisCast) {
        this.didStasisCast = true;
        if (game.audio) game.audio.play('hourglass_trap', enemy ? enemy.x : this.x);
        if (game.audio) game.audio.play('time_rewind', this.x);

        const tx = enemy ? enemy.x : this.x + this.facing * 280;
        const ty = enemy ? enemy.groundY : this.groundY;
        const isVanguard = enemy && enemy.hasPoise && enemy.attackRange <= 160;
        const isHarvester = enemy && enemy.hasPoise && enemy.attackRange > 160;
        const isGroundedCaster = enemy && !enemy.hasPoise && enemy.moveSpeed <= 122;

        this.stasisHourglass = {
          x: tx,
          y: ty,
          target: enemy,
          life: 0,
          maxLife: 1.30,
          tickTimer: 0,
          shattered: false
        };

        // Rewind Zephyros's personal timeline
        this.rewindTimeline(
          isVanguard ? 32 : isHarvester ? 33 : isGroundedCaster ? 32 : 34,
          tx,
          ty - 98,
          game,
          'CHRONO REWIND'
        );

        if (enemy && !enemy.isDead) {
          if (!enemy.hasPoise) enemy.vx *= 0.25;
          const castDmg = isVanguard ? 35 : isHarvester ? 37 : isGroundedCaster ? 42 : 44;
          enemy.takeDamage(castDmg, this, false, 20, -40);
          game.vfx.spawnDamageText(enemy.x, enemy.y - 156, 0, false, 'TIME LOCK!', '#2dd4bf');
          game.vfx.spawnGlyphBurst(enemy.x, enemy.y - 96, 8, 'chrono');
          game.renderer.triggerShake(10, 0.18);
        }
      }
    } else if (!this.didStasisShatter && t >= 0.68) {
      this.didStasisShatter = true;
      this.isDeflecting = false;
      if (game.audio) game.audio.play('chrono_hit', enemy ? enemy.x : this.x);

      if (enemy && !enemy.isDead) {
        const isVanguard = enemy.hasPoise && enemy.attackRange <= 160;
        const isHarvester = enemy.hasPoise && enemy.attackRange > 160;
        const isGroundedCaster = !enemy.hasPoise && enemy.moveSpeed <= 122;
        const shatterDmg = isVanguard ? 46 : isHarvester ? 49 : isGroundedCaster ? 55 : 58;
        enemy.takeDamage(shatterDmg, this, true, 95, -110);
        game.vfx.spawnGlyphBurst(enemy.x, enemy.y - 96, 9, 'chrono');
        game.vfx.spawnBurst(enemy.x, enemy.y - 96, 16, '#2dd4bf', 225, { upBias: 95, size: 6 });
        game.renderer.triggerShake(12, 0.22);
      }
    } else if (t >= 0.92) {
      this.isDeflecting = false;
      this.setState('IDLE');
    }
  }

  updateUltimate(dt, enemy, game) {
    // 100% BESPOKE CHRONOMANCER ULTIMATE: "DOOMSDAY MIDNIGHT — GRAND ASTRAL CLOCKTOWER"
    // Summons the Colossal 320x320 16-bit HD-2D Gothic Astral Clockface (`chronomancer_vfx.png`) in the sky behind the arena
    // with two articulated Brass & Teal Clock Hands that rapidly spin to XII (MIDNIGHT), freezing time and shattering!
    const t = this.stateTimer;
    const ww = game.renderer.worldWidth;
    const centerX = Math.max(320, Math.min(ww - 320, (this.x + (enemy ? enemy.x : ww * 0.5)) * 0.5));
    this.vx = 0;
    this.vy = 0;
    this.y = this.groundY;
    this.isDeflecting = t < 1.42;

    if (t < 0.04) {
      this.ultStage = 0;
    }

    const isVanguard = enemy && enemy.hasPoise && enemy.attackRange <= 160;
    const isHarvester = enemy && enemy.hasPoise && enemy.attackRange > 160;
    const isGroundedCaster = enemy && !enemy.hasPoise && enemy.moveSpeed <= 122;

    // STAGE 1 (0.05s): Manifest the Colossal 16-bit HD-2D Astral Clocktower Dial & start the 4 Doomsday Ticks!
    if (t >= 0.05 && this.ultStage === 0) {
      this.ultStage = 1;
      if (game.audio) game.audio.play('chrono_ult', centerX);
      if (game.audio) game.audio.play('hourglass_trap', this.x);
      game.renderer.triggerShake(14, 0.26);

      this.doomsdayClock = {
        x: centerX,
        y: this.groundY - 215,
        life: 0,
        maxLife: 1.52,
        shattered: false
      };

      game.vfx.spawnDamageText(centerX, this.groundY - 365, 0, false, 'TIME STOP — IX... X... XI...', '#2dd4bf');
      if (enemy && !enemy.isDead) {
        if (!enemy.hasPoise) enemy.vx = 0;
        const d1 = isVanguard ? 30 : isHarvester ? 31 : isGroundedCaster ? 34 : 35;
        enemy.takeDamage(d1, this, false, -30, 0);
        game.vfx.spawnGlyphBurst(enemy.x, enemy.y - 96, 8, 'chrono');
      }
      this.rewindTimeline(
        isVanguard ? 22 : isHarvester ? 22 : isGroundedCaster ? 23 : 24,
        centerX,
        this.groundY - 215,
        game,
        'ASTRAL REWIND'
      );
    }

    // Freeze/slow enemy inside the Astral Clocktower's temporal field while the hands spin toward XII
    if (enemy && !enemy.isDead && !enemy.hasPoise && t < 1.02) {
      enemy.vx *= 0.15;
    }

    // STAGE 2 (0.52s): Second Pendulum Toll as the minute hand sweeps toward XI
    if (t >= 0.52 && this.ultStage === 1) {
      this.ultStage = 2;
      if (game.audio) game.audio.play('clock_gear', centerX);
      game.renderer.triggerShake(16, 0.28);

      if (enemy && !enemy.isDead) {
        const d2 = isVanguard ? 33 : isHarvester ? 35 : isGroundedCaster ? 37 : 39;
        enemy.takeDamage(d2, this, true, -40, -50);
        game.vfx.spawnGlyphBurst(enemy.x, enemy.y - 96, 10, 'chrono');
      }
    }

    // STAGE 3 (0.98s): Both Clock Hands align vertically at XII ("MIDNIGHT XII!") — Cataclysmic Temporal Shatter!
    if (t >= 0.98 && this.ultStage === 2) {
      this.ultStage = 3;
      if (this.doomsdayClock) {
        this.doomsdayClock.shattered = true;
      }
      if (game.audio) game.audio.play('chrono_hit', centerX);
      if (game.audio) game.audio.play('time_rewind', this.x);

      game.renderer.triggerShake(26, 0.52);
      game.renderer.triggerAberration(15);
      game.renderer.triggerHitStop(0.09);

      const cx = this.doomsdayClock ? this.doomsdayClock.x : centerX;
      const cy = this.groundY - 215;
      game.vfx.spawnDamageText(cx, this.groundY - 380, 0, true, 'MIDNIGHT XII — SHATTER!', '#facc15');
      game.vfx.spawnGlyphBurst(cx, cy, 14, 'chrono');
      game.vfx.spawnBurst(cx, cy, 26, '#2dd4bf', 320, { upBias: 80, size: 8 });
      game.vfx.spawnBurst(cx, cy, 22, '#facc15', 290, { upBias: 60, size: 7 });

      // Radial volley of 4 spinning 16-bit HD-2D Clockwork Saw-Gears bursting outward from the Clockface
      if (enemy && !enemy.isDead) {
        const d3 = isVanguard ? 99 : isHarvester ? 104 : isGroundedCaster ? 112 : 118;
        enemy.takeDamage(d3, this, true, 175, -220);
        this.rewindTimeline(
          isVanguard ? 38 : isHarvester ? 40 : isGroundedCaster ? 39 : 42,
          enemy.x,
          enemy.y - 96,
          game,
          'MIDNIGHT REWIND'
        );
        game.vfx.spawnGlyphBurst(enemy.x, enemy.y - 96, 12, 'chrono');
      }
    }

    if (t >= 1.52) {
      this.isDeflecting = false;
      this.doomsdayClock = null;
      this.setState('IDLE');
    }
  }

  /**
   * Renders the Colossal 320x320 16-bit HD-2D Gothic Astral Clockface & Chunky Stepped Pixel Clock Hands
   */
  drawDoomsdayClock(ctx) {
    if (!this.doomsdayClock) return;
    const vfxSheet = PixelForge.initAssets().chronomancer?.vfx;
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;

    const dc = this.doomsdayClock;
    const pop = Math.min(1, dc.life / 0.22);
    const fade = Math.min(1, (dc.maxLife - dc.life) * 3.0);
    const cx = Math.round(dc.x / 4) * 4;
    const cy = Math.round(dc.y / 4) * 4;
    const size = Math.round((336 * (0.78 + 0.22 * pop)) / 4) * 4;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(cx, cy);

    // Keep the 320x320 pixelated clockface orthogonal so its chunky 64x64->320x320 pixels & Roman numerals stay razor-sharp!
    const dHalf = Math.round(-size * 0.5);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fade * 0.28;
    ctx.drawImage(vfxSheet, 0, 0, 320, 320, dHalf - 12, dHalf - 12, size + 24, size + 24);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = fade * (dc.shattered ? 0.88 : 0.96);
    ctx.drawImage(vfxSheet, 0, 0, 320, 320, dHalf, dHalf, size, size);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fade * 0.24;
    ctx.drawImage(vfxSheet, 0, 0, 320, 320, dHalf, dHalf, size, size);

    // Chunky Stepped Pixel-Art Clock Hands (Hour Hand + Minute Hand) snapped to 4px orthogonal blocks!
    // Both hands sweep rapidly and lock straight up (-Math.PI / 2 = XII Midnight) at t = 0.98s!
    const progressToMidnight = Math.min(1, dc.life / 0.96);
    const ease = 1 - Math.pow(1 - progressToMidnight, 2.4);
    const minuteAngle = -Math.PI * 0.5 - (1 - ease) * Math.PI * 4.0;
    const hourAngle = -Math.PI * 0.5 - (1 - ease) * Math.PI * 1.35;

    const drawPixelClockHand = (angle, length, isMinute) => {
      const steps = Math.max(6, Math.round(length / 5));
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      // 1. Outer balanced HD-2D bloom aura along the pixel hand
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * 0.34;
      ctx.fillStyle = isMinute ? '#14b8a6' : '#eab308';
      for (let i = 0; i <= steps; i += 2) {
        const dist = (i / steps) * length;
        const px = Math.round((cosA * dist) / 4) * 4;
        const py = Math.round((sinA * dist) / 4) * 4;
        ctx.fillRect(px - 8, py - 8, 16, 16);
      }

      // 2. Dark bronze 4px-stepped pixel border
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = fade * 0.98;
      ctx.fillStyle = '#0b0f19';
      for (let i = -2; i <= steps; i++) {
        const dist = (i / steps) * length;
        const px = Math.round((cosA * dist) / 4) * 4;
        const py = Math.round((sinA * dist) / 4) * 4;
        const bSz = isMinute ? 12 : 16;
        ctx.fillRect(px - bSz * 0.5, py - bSz * 0.5, bSz, bSz);
      }

      // 3. Saturated antique gold / celestial teal pixel shaft & diamond spearhead tip
      for (let i = -1; i <= steps; i++) {
        const dist = (i / steps) * length;
        const px = Math.round((cosA * dist) / 4) * 4;
        const py = Math.round((sinA * dist) / 4) * 4;
        const isTip = i >= steps - 2;
        ctx.fillStyle = isTip ? '#facc15' : '#ca8a04';
        const cSz = isTip ? 12 : isMinute ? 8 : 12;
        ctx.fillRect(px - cSz * 0.5, py - cSz * 0.5, cSz, cSz);
        ctx.fillStyle = isMinute ? '#2dd4bf' : '#fef08a';
        ctx.fillRect(px - 2, py - 2, 4, 4);
      }
    };

    drawPixelClockHand(hourAngle, Math.round(size * 0.27), false);
    drawPixelClockHand(minuteAngle, Math.round(size * 0.39), true);

    // Central Brass & Cyan Escapement Pivot Cap (4px pixel blocks)
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = fade;
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(-12, -12, 24, 24);
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(-8, -8, 16, 16);
    ctx.fillStyle = '#14b8a6';
    ctx.fillRect(-4, -4, 8, 8);

    // Midnight XII bloom pulse at detonation
    if (dc.shattered) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * 0.32;
      ctx.drawImage(
        vfxSheet,
        0,
        0,
        320,
        320,
        Math.round(-size * 0.54),
        Math.round(-size * 0.54),
        Math.round(size * 1.08),
        Math.round(size * 1.08)
      );
    }

    ctx.restore();
  }

  /**
   * Renders Zephyros's Frozen Golden-Teal Temporal Echo Silhouettes left behind during Dash/Dodge
   */
  drawTemporalEchoes(ctx) {
    if (!this.temporalEchoes.length) return;
    const sprites = PixelForge.initAssets().chronomancer;
    if (!sprites || !sprites.sheet || !sprites.sheet.complete) return;

    for (const ec of this.temporalEchoes) {
      const fade = Math.max(0, 1 - ec.life / ec.maxLife);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(Math.round(ec.x), Math.round(ec.y));
      ctx.scale(ec.facing, 1);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * 0.42;
      PixelForge.drawGhostFrame(ctx, sprites, ec.frameIdx, 208, 208);
      ctx.restore();
    }
  }

  /**
   * Renders 2 Counter-Rotating Chunky-Pixel Glowing Brass Clockwork Satellite Gears behind Zephyros's shoulders
   */
  drawOrbitingGears(ctx) {
    if (this.isDead) return;
    const vfxSheet = PixelForge.initAssets().chronomancer?.vfx;
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;

    const t = performance.now() * 0.001;
    const gears = [
      { ox: -this.facing * 42, oy: -128 + Math.round(Math.sin(t * 3.2) * 3) * 2, size: 52, dir: 1 },
      { ox: this.facing * 36, oy: -146 + Math.round(Math.cos(t * 3.2) * 3) * 2, size: 44, dir: -1 }
    ];

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (const g of gears) {
      ctx.save();
      ctx.translate(Math.round((this.x + g.ox) / 2) * 2, Math.round((this.y + g.oy) / 2) * 2);
      // Step rotation in exact 90-degree (Math.PI * 0.5) mechanical escapement ticks so pixels stay 100% orthogonal!
      const tickStep = Math.floor(t * 5.0) * (Math.PI * 0.5) * g.dir;
      ctx.rotate(tickStep);
      const gh = Math.round(-g.size * 0.5);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.28;
      ctx.drawImage(vfxSheet, 528, 56, 208, 208, gh - 4, gh - 4, g.size + 8, g.size + 8);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.96;
      ctx.drawImage(vfxSheet, 528, 56, 208, 208, gh, gh, g.size, g.size);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.22;
      ctx.drawImage(vfxSheet, 528, 56, 208, 208, gh, gh, g.size, g.size);
      ctx.restore();
    }
    ctx.restore();
  }

  /**
   * Renders the Chunky-Pixel Glowing Ornate Brass & Teal Stasis Hourglass encasing the enemy
   */
  drawStasisHourglass(ctx) {
    if (!this.stasisHourglass) return;
    const vfxSheet = PixelForge.initAssets().chronomancer?.vfx;
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;

    const hg = this.stasisHourglass;
    const pop = Math.min(1, hg.life / 0.14);
    const fade = Math.min(1, (hg.maxLife - hg.life) * 3.2);
    const vibrateX = Math.round(Math.sin(hg.life * 28) * 2) * 2;
    const hx = Math.round(hg.x / 4) * 4 + vibrateX;
    const hy = Math.round(hg.y / 4) * 4;
    const drawW = Math.round((196 * (0.82 + 0.18 * pop)) / 4) * 4;
    const drawH = Math.round((212 * (0.82 + 0.18 * pop)) / 4) * 4;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(hx, hy - drawH * 0.5 + 8);

    const hw = Math.round(-drawW * 0.5);
    const hh = Math.round(-drawH * 0.5);
    // Stepped outer teal-gold pixel bloom aura
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fade * 0.28;
    ctx.drawImage(vfxSheet, 320, 56, 208, 208, hw - 8, hh - 8, drawW + 16, drawH + 16);
    // Main chunky-pixel hourglass (orthogonal, zero diagonal rotation)
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = fade * 0.96;
    ctx.drawImage(vfxSheet, 320, 56, 208, 208, hw, hh, drawW, drawH);
    // Balanced inner sand & rune bloom pass
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fade * 0.24;
    ctx.drawImage(vfxSheet, 320, 56, 208, 208, hw, hh, drawW, drawH);
    ctx.restore();
  }

  /**
   * Renders Reverse-Flowing Golden-Teal Roman Numeral Ribbons flying into Zephyros during Temporal Rewind
   */
  drawRewindRibbons(ctx) {
    if (!this.rewindRibbons.length) return;
    ctx.save();
    const tx = this.x;
    const ty = this.y - 98;
    for (const rr of this.rewindRibbons) {
      if (rr.life < 0) continue;
      const u = Math.min(1, rr.life / rr.maxLife);
      const rx = Math.round((rr.startX + (tx - rr.startX) * u) / 4) * 4;
      const ry = Math.round((rr.startY + (ty - rr.startY) * u + Math.sin(u * Math.PI) * rr.arcHeight) / 4) * 4;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let tail = 4; tail >= 1; tail--) {
        const tu = Math.max(0, u - tail * 0.045);
        const tlx = Math.round((rr.startX + (tx - rr.startX) * tu) / 4) * 4;
        const tly = Math.round((rr.startY + (ty - rr.startY) * tu + Math.sin(tu * Math.PI) * rr.arcHeight) / 4) * 4;
        ctx.fillStyle = tail % 2 === 0 ? '#2dd4bf' : '#facc15';
        ctx.globalAlpha = ((5 - tail) / 5) * 0.65;
        ctx.fillRect(tlx - 4, tly - 4, 8, 8);
      }
      ctx.globalAlpha = 0.95;
      PixelFont.drawCentered(ctx, rr.numeral, rx, ry, 1, '#2dd4bf', '#fef08a', true);
      ctx.restore();
    }
    ctx.restore();
  }

  /**
   * Foreground pass called by Renderer after all fighters are drawn so Stasis Hourglass & Rewind Ribbons render cleanly over the target
   */
  drawForegroundOverlay(ctx) {
    this.drawStasisHourglass(ctx);
    this.drawRewindRibbons(ctx);
  }

  draw(ctx, isReflection = false) {
    const sprites = PixelForge.initAssets().chronomancer;
    if (!sprites) return;

    if (!isReflection) {
      this.drawDoomsdayClock(ctx);
      this.drawTemporalEchoes(ctx);
      this.drawOrbitingGears(ctx);
    }

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const w = 208;
    const h = 208;
    const walkBob =
      !isReflection && this.state === 'WALK'
        ? Math.round(Math.abs(Math.sin(this.walkPhase * 4.0)) * 2) * 2
        : 0;

    ctx.translate(Math.round(this.x), Math.round(this.y - walkBob));
    ctx.scale(this.facing, 1);

    if (this.hitFlash > 0 && !isReflection) {
      ctx.filter = 'brightness(2.3) contrast(1.35)';
    }

    PixelForge.drawSheetFrame(ctx, sprites, this, w, h, this.walkPhase, isReflection);
    ctx.restore();
  }
}
