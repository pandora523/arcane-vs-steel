import { Fighter } from './Fighter.js?v=30fps29';
import { PixelForge } from '../engine/PixelForge.js?v=30fps29';
import { PixelFont } from '../engine/PixelFont.js?v=30fps29';

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

export class Chronomancer extends Fighter {
  constructor(x, groundY, facing = 1) {
    super({
      name: 'Zephyros',
      x,
      groundY,
      facing,
      maxHp: 1205,
      attackRange: 510,
      moveSpeed: 168,
      autoInterval: 1.09,
      lightColor: 'rgba(45, 212, 191, 1)',
      primaryColor: '#2dd4bf'
    });
    this.heroId = 'chronomancer';
    this.theme = 'chrono';
    this.deathSfx = 'death_chrono';
    this.skillMaxCooldown = 5.15;
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
    this.dodgeMaxCooldown = 3.12;
    this.dashMaxCooldown = 3.10;
    this.isChronoWarp = false;
    this.didChronoWarp = false;
    this.warpOriginX = x;
    this.warpTargetX = x;
    this.warpPortalTimer = 0;
    this.wallFlipCooldown = 0;
    this.crouchCooldown = 0;
    this.crouchDuration = 0.96;
    this.isCrouching = false;
    this.isFlipVault = false;
    this.flipStartX = x;
    this.flipTargetX = x;
    this.flipAngle = 0;
  }

  startJump(enemy, game, customDir = null) {
    this.dodgeCooldown = this.dodgeMaxCooldown * (0.86 + Math.random() * 0.28);
    this.setState('JUMP');
    this.isInvulnerable = true;
    this.isChronoWarp = false;
    this.isFlipVault = true;
    this.flipStartX = this.x;
    this.flipAngle = 0;
    this.wallFlipCooldown = 3.0;

    const ww = game.renderer ? game.renderer.worldWidth : 1200;
    let dir = customDir !== null ? customDir : -this.facing;
    if (this.x < 180) dir = 1;
    else if (this.x > ww - 180) dir = -1;

    const dist = enemy ? Math.abs(enemy.x - this.x) : 300;
    const retreatX = this.x - this.facing * 260;
    const nearWallOrCornered =
      this.x < 330 ||
      this.x > ww - 330 ||
      retreatX < 190 ||
      retreatX > ww - 190 ||
      dist < 225;

    if (enemy && nearWallOrCornered) {
      this.dashDuration = 0.64;
      const openSideDir = enemy.x < ww * 0.5 ? 1 : -1;
      let target = enemy.x + openSideDir * 350;
      if (Math.abs(target - this.x) < 260) {
        const crossDir = this.x < enemy.x ? 1 : -1;
        target = enemy.x + crossDir * 340;
      }
      this.flipTargetX = Math.max(150, Math.min(ww - 150, target));
      this.dashDir = Math.sign(this.flipTargetX - this.flipStartX) || 1;
      if (game && game.vfx) {
        game.vfx.spawnDamageText(this.x, this.y - 135, 0, false, 'TIME-GLIDE VAULT!', '#2dd4bf');
      }
    } else {
      this.dashDuration = 0.60;
      this.flipTargetX = Math.max(150, Math.min(ww - 150, this.x + dir * 340));
      this.dashDir = dir;
      if (game && game.vfx) {
        game.vfx.spawnDamageText(this.x, this.y - 130, 0, false, 'TIME-GLIDE LEAP!', '#2dd4bf');
      }
    }

    this.vx = 0;
    this.vy = 0;
    this.spawnTemporalEcho(PixelForge.getFrameIndex(this, this.walkPhase));
    if (game && game.audio) game.audio.play('time_rewind', this.x);
    if (game && game.vfx) {
      game.vfx.spawnShockwave(this.x, this.groundY, 96, '#2dd4bf', 0.32, true);
      game.vfx.spawnGlyphBurst(this.x, this.y - 60, 7, 'chrono');
    }
  }

  startCrouch(enemy, game) {
    this.crouchCooldown = 3.2;
    this.crouchDuration = 0.96;
    this.setState('CROUCH');
    this.isCrouching = true;
    this.isDeflecting = true;
    this.vx = 0;
    if (game && game.vfx) {
      game.vfx.spawnShockwave(this.x, this.groundY - 2, 66, '#2dd4bf', 0.24, true);
      game.vfx.spawnDamageText(this.x, this.y - 122, 0, false, 'ESCAPEMENT SHIELD!', '#facc15');
    }
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
      maxLife: 0.65
    });
  }

  onStartDash(enemy, game, dir) {
    const ww = game.renderer ? game.renderer.worldWidth : 1200;
    this.dashDuration = 0.38;
    this.isDeflecting = false;
    this.isChronoWarp = false;
    this.isFlipVault = false;
    this.flipAngle = 0;
    // If backed near a wall, surge toward the open arena center!
    const escapeDir = this.x < 240 ? 1 : this.x > ww - 240 ? -1 : dir;
    this.dashDir = escapeDir;
    this.vx = escapeDir * 395;
    this.spawnTemporalEcho(PixelForge.getFrameIndex(this, this.walkPhase));
    if (game.audio) game.audio.play('time_rewind', this.x);
    game.vfx.spawnGlyphBurst(this.x, this.y - 88, 6, 'chrono');
    game.vfx.spawnDamageText(this.x, this.y - 144, 0, false, 'CHRONO SURGE!', '#2dd4bf');
  }

  onStartDodge(enemy, game, dir) {
    const ww = game.renderer ? game.renderer.worldWidth : 1200;
    const dist = enemy ? Math.abs(enemy.x - this.x) : 999;
    const nearLeft = this.x < 310;
    const nearRight = this.x > ww - 310;
    const pressuredOrCornered = dist < 265 || nearLeft || nearRight;

    this.isDeflecting = false;
    this.isFlipVault = false;
    this.flipAngle = 0;
    this.spawnTemporalEcho(PixelForge.getFrameIndex(this, this.walkPhase));
    if (game.audio) game.audio.play('time_rewind', this.x);

    const isVanguard = enemy && enemy.hasPoise && enemy.attackRange <= 160;
    const isHarvester = enemy && enemy.hasPoise && enemy.attackRange > 160;
    const isGroundedCaster = enemy && !enemy.hasPoise && enemy.moveSpeed <= 122;

    // ★ SIGNATURE CHRONOMANCER GAP-MAKER: "CHRONO PORTAL WARP & STASIS TIME-MINE!"
    if (enemy && pressuredOrCornered) {
      this.isChronoWarp = true;
      this.didChronoWarp = false;
      this.dashDuration = 0.42;
      this.warpPortalTimer = 0.56;
      this.warpOriginX = this.x;
      this.vx = 0;

      const openSideDir = enemy.x < ww * 0.5 ? 1 : -1;
      let targetX = enemy.x + openSideDir * 375;
      if (Math.abs(targetX - this.x) < 250) {
        const crossDir = this.x < enemy.x ? 1 : -1;
        targetX = enemy.x + crossDir * 365;
      }
      this.warpTargetX = Math.max(140, Math.min(ww - 140, targetX));
      this.dashDir = Math.sign(this.warpTargetX - this.warpOriginX) || 1;

      game.vfx.spawnShockwave(this.x, this.y - 96, 118, '#2dd4bf', 0.36, false, true);
      game.vfx.spawnShockwave(this.x, this.groundY, 132, '#facc15', 0.34, true);
      game.vfx.spawnBurst(this.x, this.y - 96, 18, '#2dd4bf', 235);
      game.vfx.spawnGlyphBurst(this.x, this.y - 96, 8, 'chrono');
      game.vfx.spawnDamageText(this.x, this.y - 168, 0, false, 'CHRONO PORTAL WARP!', '#facc15');

      if (!enemy.isDead && dist < 225) {
        const pushDir = Math.sign(enemy.x - this.x) || this.facing;
        enemy.vx = pushDir * 145;
        enemy.takeDamage(16, this, false, 95, -45);
        game.vfx.spawnDamageText(enemy.x, enemy.y - 136, 0, false, 'STASIS MINE!', '#2dd4bf');
      }

      this.rewindTimeline(
        13,
        this.x,
        this.y - 96,
        game,
        'TIME SLIP'
      );
      return;
    }

    this.isChronoWarp = false;
    this.dashDuration = 0.38;
    const smartDir = nearLeft ? 1 : nearRight ? -1 : dir;
    this.dashDir = smartDir;
    this.vx = smartDir * 355;

    this.rewindTimeline(
      13,
      this.x,
      this.y - 96,
      game,
      'TIME SLIP'
    );
    game.vfx.spawnGlyphBurst(this.x, this.y - 88, 7, 'chrono');

    if (enemy && !enemy.isDead) {
      const aimDir = Math.sign(enemy.x - this.x) || this.facing;
      const spawnX = this.x + aimDir * 36;
      const spawnY = this.y - 104;
      const dx = enemy.x - spawnX;
      const dy = (enemy.y - 108) - spawnY;
      const d = Math.hypot(dx, dy) || 1;
      const gearDmg = isVanguard ? 34 : isHarvester ? 36 : isGroundedCaster ? 41 : 44;
      game.vfx.spawnProjectile({
        x: spawnX,
        y: spawnY,
        vx: (dx / d) * 645,
        vy: (dy / d) * 645,
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

    // Row 8 (30-frame JUMP — Time-Glide Aerial Vault & apex downward 35-deg Clock-Gear shot, 86px height)
    if ((this.state === 'JUMP' || this.state === 'DODGE') && this.isFlipVault) {
      const u = Math.min(1, t / this.dashDuration);
      const airU = Math.max(0, Math.min(1, (u - 0.10) / 0.76));

      const horizU = airU < 0.35
        ? (airU / 0.35) * 0.44
        : airU < 0.70
          ? 0.44 + ((airU - 0.35) / 0.35) * 0.28
          : 0.72 + ((airU - 0.70) / 0.30) * 0.28;
      this.x = this.flipStartX + (this.flipTargetX - this.flipStartX) * horizU;

      let liftFrac = 0;
      if (airU > 0 && airU < 1) {
        if (airU < 0.28) {
          const p = airU / 0.28;
          liftFrac = 1 - Math.pow(1 - p, 2.2);
        } else if (airU <= 0.68) {
          const h = (airU - 0.28) / 0.40;
          liftFrac = 1.0 - Math.sin(h * Math.PI) * 0.06;
        } else {
          const p = (airU - 0.68) / 0.32;
          liftFrac = 1 - Math.pow(p, 1.85);
        }
      }
      this.y = this.groundY - liftFrac * 86;
      this.flipAngle = 0;

      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }

      if (airU > 0.05 && airU < 0.95 && Math.random() < 0.8) {
        game.vfx.spawnParticle({
          x: this.x + (Math.random() - 0.5) * 24,
          y: this.y - 70 + (Math.random() - 0.5) * 24,
          vx: -this.dashDir * 70,
          vy: 25,
          size: 5,
          color: Math.random() > 0.4 ? '#2dd4bf' : '#facc15',
          maxLife: 0.28
        });
      }

      // Apex downward Clock-Gear volley at Frame F15 (u >= 0.50)
      if (u >= 0.50 && !this.didActionFrame && enemy && !enemy.isDead) {
        this.didActionFrame = true;
        if (game.audio) game.audio.play('clock_gear', this.x);
        const sx = this.x + this.facing * 42;
        const sy = this.y - 108;
        const dx = enemy.x - sx;
        const dy = (enemy.y - 98) - sy;
        const td = Math.hypot(dx, dy) || 1;
        const isVanguard = enemy.hasPoise && enemy.attackRange <= 160;
        const isHarvester = enemy.hasPoise && enemy.attackRange > 160;
        const isGroundedCaster = !enemy.hasPoise && enemy.moveSpeed <= 122;
        const gearDmg = isVanguard ? 34 : isHarvester ? 36 : isGroundedCaster ? 41 : 44;

        game.vfx.spawnProjectile({
          x: sx,
          y: sy,
          vx: (dx / td) * 710,
          vy: (dy / td) * 710,
          radius: 19,
          color: '#2dd4bf',
          coreColor: '#facc15',
          owner: this,
          damage: gearDmg,
          type: 'clock_gear'
        });
        const shotAng = Math.atan2(dy, dx);
        game.vfx.spawnSlash(sx, sy, 58, shotAng - 0.85, shotAng + 0.85, '#2dd4bf', 0.24);
        game.vfx.spawnShockwave(sx, sy, 64, '#facc15', 0.24, false, false);
        game.vfx.spawnGlyphBurst(sx, sy, 5, 'chrono');
      }

      if (t >= this.dashDuration) {
        this.y = this.groundY;
        this.vy = 0;
        this.isFlipVault = false;
        this.flipAngle = 0;
        this.isInvulnerable = false;
        game.vfx.spawnShockwave(this.x, this.groundY, 76, '#2dd4bf', 0.26, true);
        this.setState('IDLE');
      }
      return;
    }

    if (this.isChronoWarp) {
      if (t >= 0.13 && !this.didChronoWarp) {
        this.didChronoWarp = true;
        this.x = this.warpTargetX;
        if (enemy) {
          this.facing = enemy.x >= this.x ? 1 : -1;
        }
        this.spawnTemporalEcho(PixelForge.getFrameIndex(this, this.walkPhase));

        // Arrival Dimensional Clockface Rift + Counter Saw-Gear!
        game.vfx.spawnShockwave(this.x, this.y - 96, 118, '#facc15', 0.36, false, true);
        game.vfx.spawnShockwave(this.x, this.groundY, 132, '#2dd4bf', 0.34, true);
        game.vfx.spawnBurst(this.x, this.y - 96, 20, '#facc15', 250);
        game.vfx.spawnGlyphBurst(this.x, this.y - 100, 9, 'chrono');

        if (enemy && !enemy.isDead) {
          const isVanguard = enemy.hasPoise && enemy.attackRange <= 160;
          const isHarvester = enemy.hasPoise && enemy.attackRange > 160;
          const isGroundedCaster = !enemy.hasPoise && enemy.moveSpeed <= 122;
          const gearDmg = isVanguard ? 24 : isHarvester ? 26 : isGroundedCaster ? 31 : 34;
          const sx = this.x + this.facing * 44;
          const sy = this.y - 106;
          const dx = enemy.x - sx;
          const dy = (enemy.y - 108) - sy;
          const d = Math.hypot(dx, dy) || 1;
          game.vfx.spawnProjectile({
            x: sx,
            y: sy,
            vx: (dx / d) * 665,
            vy: (dy / d) * 665,
            radius: 19,
            color: '#2dd4bf',
            coreColor: '#facc15',
            owner: this,
            damage: gearDmg,
            type: 'clock_gear'
          });
        }
      }

      if (t >= this.dashDuration) {
        this.isChronoWarp = false;
        this.isDeflecting = false;
        this.isInvulnerable = false;
        this.setState('IDLE');
      }
      return;
    }

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

  updateCrouch(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.crouchDuration || 0.96;
    this.vx *= Math.pow(0.001, dt);
    this.isCrouching = t < dur * 0.80;
    this.isDeflecting = this.isCrouching;

    // Frames F02..F10: Spinning Escapement Shield calibration in front of crouched Zephyros
    if (t >= 0.08 && t < 0.36) {
      if (Math.random() < 0.7) {
        const a = t * 26;
        const tipX = this.x + this.facing * 50;
        const tipY = this.y - 92;
        game.vfx.spawnParticle({
          x: tipX + Math.cos(a) * 22,
          y: tipY + Math.sin(a) * 22,
          vx: -Math.cos(a) * 55,
          vy: -Math.sin(a) * 55,
          size: 4.5,
          color: Math.random() > 0.4 ? '#2dd4bf' : '#facc15',
          maxLife: 0.22
        });
      }
    } else if (t >= 0.36 && !this.didActionFrame) {
      // Frame F11 (t = 0.36s): High-velocity low Saw-Gear launch from crouched stance!
      this.didActionFrame = true;
      this.comboStep++;
      this.vx -= this.facing * 32;
      if (game.audio) game.audio.play('clock_gear', this.x);

      const spawnX = this.x + this.facing * 52;
      const spawnY = this.y - 92;
      const targetY = enemy ? enemy.y - 98 : spawnY;
      const dx = enemy ? enemy.x - spawnX : this.facing * 510;
      const dy = targetY - spawnY;
      const dist = Math.hypot(dx, dy) || 1;
      const speed = 710;

      const isVanguard = enemy && enemy.hasPoise && enemy.attackRange <= 160;
      const isHarvester = enemy && enemy.hasPoise && enemy.attackRange > 160;
      const isGroundedCaster = enemy && !enemy.hasPoise && enemy.moveSpeed <= 122;
      const crouchGearDmg = isVanguard ? 52 : isHarvester ? 55 : isGroundedCaster ? 58 : 61;

      game.vfx.spawnProjectile({
        x: spawnX,
        y: spawnY,
        vx: (dx / dist) * speed,
        vy: (dy / dist) * speed,
        radius: 20,
        color: '#2dd4bf',
        coreColor: '#facc15',
        owner: this,
        damage: crouchGearDmg,
        type: 'clock_gear'
      });

      const cAng = this.facing === 1 ? 0 : Math.PI;
      game.vfx.spawnSlash(spawnX, spawnY, 60, cAng - 0.9, cAng + 0.9, '#2dd4bf', 0.24);
      game.vfx.spawnShockwave(spawnX, spawnY, 64, '#2dd4bf', 0.26, false, true);
      game.vfx.spawnShockwave(spawnX + this.facing * 14, spawnY, 44, '#facc15', 0.20, false, true);
      game.vfx.spawnGlyphBurst(spawnX, spawnY, 5, 'chrono');
    }

    if (t >= dur) {
      this.isCrouching = false;
      this.isDeflecting = false;
      this.setState('IDLE');
    }
  }

  update(dt, enemy, game) {
    this.wallFlipCooldown = Math.max(0, this.wallFlipCooldown - dt);
    this.crouchCooldown = Math.max(0, this.crouchCooldown - dt);
    this.warpPortalTimer = Math.max(0, this.warpPortalTimer - dt);

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

    // Proactive Temporal Tactician Corner-Escape, Time-Glide Jump & Escapement Crouch AI!
    if (enemy && !enemy.isDead && (this.state === 'IDLE' || this.state === 'WALK')) {
      const dist = Math.abs(enemy.x - this.x);
      const ww = game.renderer ? game.renderer.worldWidth : 1200;
      const nearWall = this.x < 260 || this.x > ww - 260;
      const pinnedLeft = this.x < 240 && enemy.x > this.x;
      const pinnedRight = this.x > ww - 240 && enemy.x < this.x;
      const incomingProj =
        game.vfx &&
        game.vfx.projectiles.some((p) => p.owner === enemy && Math.abs(p.x - this.x) < 150);

      if ((pinnedLeft || pinnedRight) && dist < 265 && this.dodgeCooldown <= 0 && this.wallFlipCooldown <= 0) {
        this.wallFlipCooldown = 3.0;
        this.startJump(enemy, game);
        return;
      }

      if ((dist < 235 || (nearWall && dist < 305) || incomingProj) && this.dodgeCooldown <= 0) {
        this.startDodge(enemy, game);
        return;
      }

      // Tactical Temporal Calibration Crouch & Low Saw-Gear Shot at ranged distance
      if (
        dist >= 270 &&
        dist <= this.attackRange &&
        this.autoCooldown <= 0 &&
        this.crouchCooldown <= 0 &&
        this.comboStep % 3 === 1
      ) {
        this.autoCooldown = this.autoInterval * (0.92 + Math.random() * 0.2);
        this.startCrouch(enemy, game);
        return;
      }

      if (dist < 245) {
        this.x -= this.facing * this.moveSpeed * 0.72 * dt;
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
    const t = this.stateTimer;

    if (t < 0.10) {
      this.didStasisCast = false;
      this.didStasisShatter = false;
      this.isDeflecting = true;
    } else if (t < 0.46) {
      if (!this.didStasisCast) {
        this.didStasisCast = true;
        if (game.audio) game.audio.play('hourglass_trap', enemy ? enemy.x : this.x);

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

        this.rewindTimeline(
          28,
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
    const t = this.stateTimer;
    const ww = game.renderer.worldWidth;
    const centerX = Math.max(
      260,
      Math.min(ww - 260, this.x * 0.65 + (enemy ? enemy.x : ww * 0.5) * 0.35)
    );
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

    if (t >= 0.05 && this.ultStage === 0) {
      this.ultStage = 1;
      if (game.audio) game.audio.play('chrono_ult', centerX);
      game.renderer.triggerShake(14, 0.26);

      this.doomsdayClock = {
        x: centerX,
        y: this.groundY - 195,
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
        this.groundY - 195,
        game,
        'ASTRAL REWIND'
      );
    }

    if (enemy && !enemy.isDead && !enemy.hasPoise && t < 1.02) {
      enemy.vx *= 0.15;
    }

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

    if (t >= 0.98 && this.ultStage === 2) {
      this.ultStage = 3;
      if (this.doomsdayClock) {
        this.doomsdayClock.shattered = true;
      }
      if (game.audio) game.audio.play('chrono_hit', centerX);

      game.renderer.triggerShake(26, 0.52);
      game.renderer.triggerAberration(15);
      game.renderer.triggerHitStop(0.09);

      const cx = this.doomsdayClock ? this.doomsdayClock.x : centerX;
      const cy = this.groundY - 195;
      game.vfx.spawnDamageText(cx, this.groundY - 380, 0, true, 'MIDNIGHT XII — SHATTER!', '#facc15');
      game.vfx.spawnGlyphBurst(cx, cy, 14, 'chrono');
      game.vfx.spawnBurst(cx, cy, 26, '#2dd4bf', 320, { upBias: 80, size: 7 });
      game.vfx.spawnBurst(cx, cy, 22, '#facc15', 290, { upBias: 60, size: 6 });

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
   * Renders the Colossal 320x320 16-bit HD-2D Gothic Astral Clockface & Sleek Tapered Clock Hands (Zero Stepped Square Blocks!)
   */
  drawDoomsdayClock(ctx, renderer = null) {
    if (!this.doomsdayClock) return;
    const vfxSheet = PixelForge.initAssets().chronomancer?.vfx;
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;

    const dc = this.doomsdayClock;
    const pop = Math.min(1, dc.life / 0.22);
    const fade = Math.min(1, (dc.maxLife - dc.life) * 3.0);
    const cx = Math.round(dc.x);
    const cy = Math.round(dc.y);
    const size = Math.round(344 * (0.78 + 0.22 * pop));

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(cx, cy);

    if (renderer) {
      ctx.globalCompositeOperation = 'lighter';
      if (renderer.glowTeal) {
        ctx.globalAlpha = fade * 0.68;
        ctx.drawImage(renderer.glowTeal, -size * 1.15, -size * 1.15, size * 2.3, size * 2.3);
      }
      if (renderer.glowGold) {
        ctx.globalAlpha = fade * 0.62;
        ctx.drawImage(renderer.glowGold, -size * 0.85, -size * 0.85, size * 1.7, size * 1.7);
      }
    }

    const dHalf = Math.round(-size * 0.5);
    const col = Math.max(0, Math.min(29, Math.floor(((1 - dc.life / dc.maxLife)) * 30)));
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fade * 0.42;
    ctx.drawImage(vfxSheet, col * 208, 624, 208, 208, dHalf - 12, dHalf - 12, size + 24, size + 24);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = fade * (dc.shattered ? 0.92 : 0.98);
    ctx.drawImage(vfxSheet, col * 208, 624, 208, 208, dHalf, dHalf, size, size);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fade * 0.34;
    ctx.drawImage(vfxSheet, col * 208, 624, 208, 208, dHalf, dHalf, size, size);

    const progressToMidnight = Math.min(1, dc.life / 0.96);
    const ease = 1 - Math.pow(1 - progressToMidnight, 2.4);
    const minuteAngle = -Math.PI * 0.5 - (1 - ease) * Math.PI * 4.0;
    const hourAngle = -Math.PI * 0.5 - (1 - ease) * Math.PI * 1.35;

    const drawTaperedClockHand = (angle, length, isMinute) => {
      ctx.save();
      ctx.rotate(angle);
      const baseW = isMinute ? 7 : 10;

      // 1. Smooth additive bloom along the clock hand
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * 0.48;
      ctx.fillStyle = isMinute ? '#2dd4bf' : '#facc15';
      ctx.beginPath();
      ctx.moveTo(-14, -baseW * 1.2);
      ctx.lineTo(length * 0.78, -baseW * 0.65);
      ctx.lineTo(length + 8, 0);
      ctx.lineTo(length * 0.78, baseW * 0.65);
      ctx.lineTo(-14, baseW * 1.2);
      ctx.closePath();
      ctx.fill();

      // 2. Dark obsidian-bronze bevel outline
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = fade * 0.98;
      ctx.fillStyle = '#0b0f19';
      ctx.beginPath();
      ctx.moveTo(-12, -baseW);
      ctx.lineTo(length * 0.76, -baseW * 0.45);
      ctx.lineTo(length + 4, 0);
      ctx.lineTo(length * 0.76, baseW * 0.45);
      ctx.lineTo(-12, baseW);
      ctx.closePath();
      ctx.fill();

      // 3. Radiant gold/teal inner blade & white core line
      ctx.fillStyle = isMinute ? '#5eead4' : '#facc15';
      ctx.beginPath();
      ctx.moveTo(-8, -(baseW - 3));
      ctx.lineTo(length * 0.76, -2.5);
      ctx.lineTo(length, 0);
      ctx.lineTo(length * 0.76, 2.5);
      ctx.lineTo(-8, baseW - 3);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-4, -1.5, length * 0.85, 3);
      ctx.restore();
    };

    drawTaperedClockHand(hourAngle, Math.round(size * 0.27), false);
    drawTaperedClockHand(minuteAngle, Math.round(size * 0.39), true);

    // Central Brass & Cyan Escapement Pivot Hub
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = fade;
    ctx.fillStyle = '#0b0f19';
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2dd4bf';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    // Midnight XII bloom pulse at detonation
    if (dc.shattered) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * 0.48;
      ctx.drawImage(
        vfxSheet,
        col * 208,
        624,
        208,
        208,
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
      PixelForge.drawAfterimageFrame(ctx, sprites, ec.frameIdx, 208, 208);
      ctx.restore();
    }
  }

  /**
   * Renders 2 Counter-Rotating Chunky-Pixel Glowing Brass Clockwork Satellite Gears behind Zephyros's shoulders
   */
  drawOrbitingGears(ctx, renderer = null) {
    if (this.isDead) return;
    const vfxSheet = PixelForge.initAssets().chronomancer?.vfx;
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;

    const t = performance.now() * 0.001;
    const col = Math.floor(this.stateTimer * 30) % 30;
    const gears = [
      { ox: -this.facing * 42, oy: -128 + Math.round(Math.sin(t * 3.2) * 3) * 2, size: 54, dir: 1 },
      { ox: this.facing * 36, oy: -146 + Math.round(Math.cos(t * 3.2) * 3) * 2, size: 46, dir: -1 }
    ];

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (const g of gears) {
      ctx.save();
      ctx.translate(Math.round((this.x + g.ox) / 2) * 2, Math.round((this.y + g.oy) / 2) * 2);
      if (renderer && renderer.glowTeal) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.45;
        ctx.drawImage(renderer.glowTeal, -g.size * 1.1, -g.size * 1.1, g.size * 2.2, g.size * 2.2);
      }
      // Step rotation in exact 90-degree (Math.PI * 0.5) mechanical escapement ticks so pixels stay 100% orthogonal!
      const tickStep = Math.floor(t * 5.0) * (Math.PI * 0.5) * g.dir;
      ctx.rotate(tickStep);
      const gh = Math.round(-g.size * 0.5);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.42;
      ctx.drawImage(vfxSheet, col * 208, 0, 208, 208, gh - 4, gh - 4, g.size + 8, g.size + 8);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.98;
      ctx.drawImage(vfxSheet, col * 208, 0, 208, 208, gh, gh, g.size, g.size);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.34;
      ctx.drawImage(vfxSheet, col * 208, 0, 208, 208, gh, gh, g.size, g.size);
      ctx.restore();
    }
    ctx.restore();
  }

  /**
   * Renders the Chunky-Pixel Glowing Ornate Brass & Teal Stasis Hourglass encasing the enemy
   */
  drawStasisHourglass(ctx, renderer = null) {
    if (!this.stasisHourglass) return;
    const vfxSheet = PixelForge.initAssets().chronomancer?.vfx;
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;

    const hg = this.stasisHourglass;
    const pop = Math.min(1, hg.life / 0.14);
    const fade = Math.min(1, (hg.maxLife - hg.life) * 3.2);
    const vibrateX = Math.round(Math.sin(hg.life * 28) * 2) * 2;
    const hx = Math.round(hg.x / 4) * 4 + vibrateX;
    const hy = Math.round(hg.y / 4) * 4;
    const drawW = Math.round((204 * (0.82 + 0.18 * pop)) / 4) * 4;
    const drawH = Math.round((220 * (0.82 + 0.18 * pop)) / 4) * 4;
    const col = Math.max(0, Math.min(29, Math.floor(((1 - hg.life / hg.maxLife)) * 30)));

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(hx, hy - drawH * 0.5 + 8);

    // 1. Luminous Dual-Layer Gold + Teal Radial Light Halos around the Stasis Hourglass!
    if (renderer) {
      ctx.globalCompositeOperation = 'lighter';
      if (renderer.glowGold) {
        ctx.globalAlpha = fade * 0.65;
        ctx.drawImage(renderer.glowGold, -drawW * 1.15, -drawH * 1.05, drawW * 2.3, drawH * 2.1);
      }
      if (renderer.glowTeal) {
        ctx.globalAlpha = fade * 0.58;
        ctx.drawImage(renderer.glowTeal, -drawW * 0.95, -drawH * 0.9, drawW * 1.9, drawH * 1.8);
      }
    }

    const hw = Math.round(-drawW * 0.5);
    const hh = Math.round(-drawH * 0.5);
    // Stepped outer teal-gold pixel bloom aura
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fade * 0.46;
    ctx.drawImage(vfxSheet, col * 208, 208, 208, 208, hw - 12, hh - 12, drawW + 24, drawH + 24);
    // Main chunky-pixel hourglass (orthogonal, zero diagonal rotation)
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = fade * 0.98;
    ctx.drawImage(vfxSheet, col * 208, 208, 208, 208, hw, hh, drawW, drawH);
    // Boosted inner sand & rune bloom pass
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fade * 0.38;
    ctx.drawImage(vfxSheet, col * 208, 208, 208, 208, hw, hh, drawW, drawH);
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
   * Normal skill pass (behind fighters)
   */
  drawForegroundOverlay(ctx, renderer = null) {
    this.drawStasisHourglass(ctx, renderer);
    this.drawRewindRibbons(ctx);
  }

  /**
   * Ultimate pass (rendered IN FRONT of all fighters!)
   */
  drawUltimateForeground(ctx, renderer = null) {
    this.drawDoomsdayClock(ctx, renderer);
  }

  /**
   * Renders Dual 12-Hour Clockface Temporal Rift Wormhole Portals (Row 2 of chronomancer_vfx.png) at departure & arrival coordinates during CHRONO PORTAL WARP!
   */
  drawWarpPortals(ctx, renderer = null) {
    if (this.warpPortalTimer <= 0 && !this.isChronoWarp) return;
    const vfxSheet = PixelForge.initAssets().chronomancer?.vfx;
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;

    const fade = Math.min(1, this.warpPortalTimer / 0.22);
    const col = Math.floor(performance.now() * 0.035) % 30;
    const portals = [
      { x: this.warpOriginX, y: this.groundY - 96, scale: 0.94 },
      { x: this.warpTargetX, y: this.groundY - 96, scale: 1.04 }
    ];

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (const p of portals) {
      const size = Math.round(176 * p.scale);
      const half = Math.round(-size * 0.5);
      ctx.save();
      ctx.translate(Math.round(p.x), Math.round(p.y));
      if (renderer) {
        ctx.globalCompositeOperation = 'lighter';
        if (renderer.glowTeal) {
          ctx.globalAlpha = fade * 0.56;
          ctx.drawImage(renderer.glowTeal, -size * 1.15, -size * 1.15, size * 2.3, size * 2.3);
        }
        if (renderer.glowGold) {
          ctx.globalAlpha = fade * 0.48;
          ctx.drawImage(renderer.glowGold, -size * 0.85, -size * 0.85, size * 1.7, size * 1.7);
        }
      }
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * 0.45;
      ctx.drawImage(vfxSheet, col * 208, 416, 208, 208, half - 8, half - 8, size + 16, size + 16);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = fade * 0.94;
      ctx.drawImage(vfxSheet, col * 208, 416, 208, 208, half, half, size, size);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * 0.36;
      ctx.drawImage(vfxSheet, col * 208, 416, 208, 208, half, half, size, size);
      ctx.restore();
    }
    ctx.restore();
  }

  draw(ctx, isReflection = false, renderer = null) {
    const sprites = PixelForge.initAssets().chronomancer;
    if (!sprites) return;

    if (!isReflection) {
      this.drawWarpPortals(ctx, renderer);
      this.drawTemporalEchoes(ctx);
      this.drawOrbitingGears(ctx, renderer);
    }

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const w = 208;
    const h = 208;
    const frameIdx = PixelForge.getFrameIndex(this, this.walkPhase);

    ctx.translate(Math.round(this.x), Math.round(this.y));
    ctx.scale(this.facing, 1);

    PixelForge.drawSheetFrame(ctx, sprites, this, w, h, this.walkPhase, isReflection, renderer);

    if (this.hitFlash > 0 && !isReflection) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5;
      PixelForge.drawGhostFrame(ctx, sprites, frameIdx, w, h);
    }

    ctx.restore();
  }
}
