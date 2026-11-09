import { Fighter } from './Fighter.js?v=30fps22';
import { PixelForge } from '../engine/PixelForge.js?v=30fps22';

export class Archer extends Fighter {
  constructor(x, groundY, facing = 1) {
    super({
      name: 'Sylvara',
      x,
      groundY,
      facing,
      maxHp: 1335,
      attackRange: 520,
      moveSpeed: 173,
      autoInterval: 1.01,
      lightColor: 'rgba(16, 185, 129, 1)',
      primaryColor: '#10b981'
    });
    this.heroId = 'archer';
    this.theme = 'emerald';
    this.deathSfx = 'death_archer';
    this.skillMaxCooldown = 4.25;
    this.ultName = 'ASTRAL HURRICANE';
    this.skillName = 'STARFALL VOLLEY';
    this.windPhase = 0;
    this.shotCombo = 0;
    this.stepTimer = 0;
    this.dodgeMaxCooldown = 2.88;
    this.dashMaxCooldown = 3.20;
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
    const ww = game.renderer.worldWidth;
    let dir = customDir !== null ? customDir : -this.facing;
    if (this.x < 180) dir = 1;
    else if (this.x > ww - 180) dir = -1;
    this.dashDir = dir;
    this.onStartDodge(enemy, game, dir);
  }

  startCrouch(enemy, game) {
    this.crouchCooldown = 3.2;
    this.crouchDuration = 0.96;
    this.setState('CROUCH');
    this.isCrouching = true;
    this.isDeflecting = true;
    this.vx = 0;
    if (game && game.vfx) {
      game.vfx.spawnShockwave(this.x, this.groundY - 2, 62, '#34d399', 0.24, true);
      game.vfx.spawnDamageText(this.x, this.y - 118, 0, false, 'STEALTH CROUCH!', '#6ee7b7');
    }
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
    this.wallFlipCooldown = 3.0;

    if (enemy && nearWallOrCornered) {
      // Sleek, wide horizontal vault across the arena using Row 8 (30-frame JUMP)!
      this.dashDuration = 0.64;
      const openSideDir = enemy.x < ww * 0.5 ? 1 : -1;
      let target = enemy.x + openSideDir * 350;
      if (Math.abs(target - this.x) < 260) {
        const crossDir = this.x < enemy.x ? 1 : -1;
        target = enemy.x + crossDir * 340;
      }
      this.flipTargetX = Math.max(150, Math.min(ww - 150, target));
      this.dashDir = Math.sign(this.flipTargetX - this.flipStartX) || 1;
      game.vfx.spawnDamageText(this.x, this.y - 125, 0, false, 'ZEPHYR VAULT!', '#34d399');
    } else {
      // Long, low-slung acrobatic glide-jump & mid-air bow shot using Row 8 (30-frame JUMP)!
      this.dashDuration = 0.60;
      this.flipTargetX = Math.max(150, Math.min(ww - 150, this.x + dir * 340));
      this.dashDir = dir;
      game.vfx.spawnDamageText(this.x, this.y - 120, 0, false, 'ZEPHYR LEAP!', '#34d399');
    }

    this.vx = 0;
    this.vy = 0;
    this.heal(13, 'SYLVAN BREEZE');
    if (game.audio) game.audio.play('zephyr_flip', this.x);
    game.vfx.spawnShockwave(this.x, this.groundY, 96, '#34d399', 0.32, true);
    game.vfx.spawnGlyphBurst(this.x, this.y - 60, 7, 'emerald');
  }

  onStartDash(enemy, game, dir) {
    this.isFlipVault = false;
    this.flipAngle = 0;
    this.dashDuration = 0.44;
    this.vx = dir * 380;
    if (game.audio) game.audio.play('arrow_shoot', this.x);
    game.vfx.spawnShockwave(this.x, this.y - 55, 72, '#34d399', 0.25, false, true);
    game.vfx.spawnGlyphBurst(this.x, this.y - 55, 5, 'emerald');
    game.vfx.spawnDamageText(this.x, this.y - 120, 0, false, 'GALE STRIDE!', '#34d399');
  }

  updateDashOrDodge(dt, enemy, game) {
    const t = this.stateTimer;

    if ((this.state === 'DODGE' || this.state === 'JUMP') && this.isFlipVault) {
      const u = Math.min(1, t / this.dashDuration);
      // F00..F03 (u < 0.11): launch crouch; F04..F25 (0.11 <= u <= 0.86): airborne glide & hover shot; F26..F29 (u > 0.86): landing!
      const airU = Math.max(0, Math.min(1, (u - 0.10) / 0.76));

      // Smooth horizontal glide with slight hang-time deceleration during bow draw/release (airU = 0.35..0.70)
      const horizU = airU < 0.35
        ? (airU / 0.35) * 0.44
        : airU < 0.70
          ? 0.44 + ((airU - 0.35) / 0.35) * 0.28
          : 0.72 + ((airU - 0.70) / 0.30) * 0.28;
      this.x = this.flipStartX + (this.flipTargetX - this.flipStartX) * horizU;

      // Low-slung athletic vault arc (peak height 86px, NEVER a steep 168px bouncy-ball spike!)
      // with mid-air hang-time hover plateau while drawing & firing the downward bow shot!
      let liftFrac = 0;
      if (airU > 0 && airU < 1) {
        if (airU < 0.28) {
          const p = airU / 0.28;
          liftFrac = 1 - Math.pow(1 - p, 2.2);
        } else if (airU <= 0.68) {
          // Hang-time wind-hover plateau at the apex while drawing & loosing the arrow
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
          color: Math.random() > 0.4 ? '#34d399' : '#fef08a',
          maxLife: 0.28
        });
      }

      // At Frame F18 (u >= 0.58) during her mid-air wind-hover, Sylvara looses her downward (+24°) Aerial Counter-Shot!
      if (u >= 0.58 && !this.didActionFrame && enemy && !enemy.isDead) {
        this.didActionFrame = true;
        if (game.audio) game.audio.play('arrow_shoot', this.x);
        const sx = this.x + this.facing * 42;
        const sy = this.y - 112;
        const dx = enemy.x - sx;
        const dy = (enemy.y - 98) - sy;
        const td = Math.hypot(dx, dy) || 1;
        game.vfx.spawnProjectile({
          x: sx,
          y: sy,
          vx: (dx / td) * 745,
          vy: (dy / td) * 745,
          radius: 13,
          color: '#34d399',
          coreColor: '#fef08a',
          owner: this,
          damage: enemy.hasPoise && enemy.attackRange <= 160 ? 66 : 57,
          type: 'arrow'
        });
        const shotAng = Math.atan2(dy, dx);
        game.vfx.spawnSlash(sx, sy, 58, shotAng - 0.85, shotAng + 0.85, '#34d399', 0.24);
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

    // Row 6 (30-frame DASH — Gale Stride): mid-dash snap-shot at F14 (t >= 0.20)
    this.x += this.dashDir * 295 * dt;
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

    if (t >= 0.20 && !this.didActionFrame && enemy && !enemy.isDead) {
      this.didActionFrame = true;
      if (game.audio) game.audio.play('arrow_shoot', this.x);
      const sx = this.x + this.facing * 46;
      const sy = this.y - 110;
      const dx = enemy.x - sx;
      const dy = (enemy.y - 106) - sy;
      const d = Math.hypot(dx, dy) || 1;
      game.vfx.spawnProjectile({
        x: sx,
        y: sy,
        vx: (dx / d) * 710,
        vy: (dy / d) * 710,
        radius: 13,
        color: '#34d399',
        coreColor: '#fef08a',
        owner: this,
        damage: 44,
        type: 'arrow'
      });
      game.vfx.spawnShockwave(sx, sy, 54, '#fef08a', 0.22, false, true);
    }

    if (t >= this.dashDuration) {
      this.isFlipVault = false;
      this.flipAngle = 0;
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  updateCrouch(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.crouchDuration || 0.96;
    this.vx *= Math.pow(0.001, dt);
    this.isCrouching = t < dur * 0.82;
    this.isDeflecting = this.isCrouching;

    // Frames F06..F17 (0.19s <= t < 0.57s): Crouched knee-braced sniper bow draw at y - 96
    if (t >= 0.19 && t < 0.57) {
      if (Math.random() < 0.7) {
        const a = t * 26;
        const tipX = this.x + this.facing * 52;
        const tipY = this.y - 96;
        game.vfx.spawnParticle({
          x: tipX + Math.cos(a) * 22,
          y: tipY + Math.sin(a) * 22,
          vx: -Math.cos(a) * 60,
          vy: -Math.sin(a) * 60,
          size: 4.5,
          color: Math.random() > 0.4 ? '#34d399' : '#fef08a',
          maxLife: 0.22
        });
      }
    } else if (t >= 0.57 && !this.didActionFrame) {
      // Frame F18 (t = 0.576s): Low-profile knee-braced Sniper Piercer release at y - 96!
      this.didActionFrame = true;
      this.shotCombo++;
      this.vx -= this.facing * 38;
      if (game.audio) game.audio.play('arrow_shoot', this.x);

      const spawnX = this.x + this.facing * 52;
      const spawnY = this.y - 96;
      const targetY = enemy ? enemy.y - 102 : spawnY;
      const dx = enemy ? enemy.x - spawnX : this.facing * 520;
      const dy = targetY - spawnY;
      const dist = Math.hypot(dx, dy) || 1;
      const speed = 715;

      game.vfx.spawnProjectile({
        x: spawnX,
        y: spawnY,
        vx: (dx / dist) * speed,
        vy: (dy / dist) * speed,
        radius: 14,
        color: '#10b981',
        coreColor: '#fef08a',
        owner: this,
        damage: 89,
        type: 'arrow'
      });

      const cAng = this.facing === 1 ? 0 : Math.PI;
      game.vfx.spawnSlash(spawnX, spawnY, 62, cAng - 0.9, cAng + 0.9, '#34d399', 0.24);
      game.vfx.spawnShockwave(spawnX, spawnY, 64, '#34d399', 0.26, false, true);
      game.vfx.spawnShockwave(spawnX + this.facing * 14, spawnY, 44, '#fef08a', 0.20, false, true);
      game.vfx.spawnGlyphBurst(spawnX, spawnY, 5, 'emerald');
    }

    if (t >= dur) {
      this.isCrouching = false;
      this.isDeflecting = false;
      this.setState('IDLE');
    }
  }

  update(dt, enemy, game) {
    this.windPhase += dt * 3.0;
    this.wallFlipCooldown = Math.max(0, this.wallFlipCooldown - dt);
    this.crouchCooldown = Math.max(0, this.crouchCooldown - dt);

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
      const pinnedLeft = this.x < 240 && enemy.x > this.x;
      const pinnedRight = this.x > ww - 240 && enemy.x < this.x;

      if ((pinnedLeft || pinnedRight || dist < 190) && dist < 265 && this.dodgeCooldown <= 0 && this.wallFlipCooldown <= 0) {
        this.wallFlipCooldown = 3.0;
        this.startJump(enemy, game);
        return;
      }

      // Tactical Stealth Crouch & Knee-Braced Sniper Shot when at marksman range (dist >= 275) every 2nd auto-attack!
      if (
        dist >= 275 &&
        dist <= this.attackRange &&
        this.autoCooldown <= 0 &&
        this.crouchCooldown <= 0 &&
        this.shotCombo % 2 === 1
      ) {
        this.autoCooldown = this.autoInterval * (0.92 + Math.random() * 0.2);
        this.startCrouch(enemy, game);
        return;
      }

      if (dist < 220) {
        this.x -= this.facing * this.moveSpeed * 0.65 * dt;
      }
    }

    super.update(dt, enemy, game);
  }

  updateAutoAttack(dt, enemy, game) {
    const t = this.stateTimer;
    if (t < 0.48) {
      // Row 2 Frames F00..F18: Quiver reach (F00..F04), progressive 14-frame bow draw & limb flex (F05..F18)
      this.torsoAngle = -this.facing * 0.12 * (t / 0.48);
      if (t >= 0.16 && Math.random() < 0.65) {
        const a = t * 24;
        const tipX = this.x + this.facing * 54;
        const tipY = this.y - 120;
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
    } else if (t < 0.74) {
      // Row 2 Frame F19: High-velocity Tempest Piercer arrow release + sonic boom ring + vibrating string
      if (!this.didActionFrame) {
        this.didActionFrame = true;
        this.shotCombo++;
        this.vx -= this.facing * 50;
        if (game.audio) game.audio.play('arrow_shoot', this.x);

        const spawnX = this.x + this.facing * 54;
        const spawnY = this.y - 120;
        const targetY = enemy ? enemy.y - 116 : spawnY;
        const dx = enemy ? enemy.x - spawnX : this.facing * 520;
        const dy = targetY - spawnY;
        const dist = Math.hypot(dx, dy) || 1;
        const speed = 705;
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
          damage: isTwinShot ? 84 : 96,
          type: 'arrow'
        });

        // Every 3rd attack fires a Twin Gale Volley
        if (isTwinShot) {
          game.vfx.spawnProjectile({
            x: spawnX - this.facing * 18,
            y: spawnY - 12,
            vx: (dx / dist) * (speed * 0.94),
            vy: (dy / dist) * (speed * 0.94) - 18,
            radius: 13,
            color: '#34d399',
            coreColor: '#fef08a',
            owner: this,
            damage: 64,
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
    } else if (t >= 0.86) {
      this.setState('IDLE');
    }
  }

  updateSkill(dt, enemy, game) {
    const t = this.stateTimer;
    if (t < 0.36) {
      // Row 3 Frames F00..F10: Drawing the 3-Arrow Emerald Fan Volley
      if (Math.random() < 0.65) {
        game.vfx.spawnParticle({
          x: this.x + (Math.random() - 0.5) * 48,
          y: this.y - 115,
          vx: 0,
          vy: -180,
          size: 5,
          color: '#34d399',
          maxLife: 0.28
        });
      }
    } else if (t >= 0.36 && !this.didActionFrame) {
      // Row 3 Frame F11 (t = 0.38s): Release 3 Direct Fan-Spread Wind Arrows horizontally!
      this.didActionFrame = true;
      this.vx -= this.facing * 65;
      this.heal(18, 'STARLIGHT GRACE');
      if (game.audio) game.audio.play('arrow_shoot', this.x);

      const bowX = this.x + this.facing * 48;
      const bowY = this.y - 120;
      const fAng = this.facing === 1 ? 0 : Math.PI;
      game.vfx.spawnSlash(bowX, bowY, 68, fAng - 1.0, fAng + 1.0, '#34d399', 0.25);
      game.vfx.spawnShockwave(bowX, bowY, 76, '#34d399', 0.28, false, true);
      game.vfx.spawnGlyphBurst(bowX, bowY, 5, 'emerald');

      [-0.16, 0, 0.16].forEach((angOff) => {
        const baseAng = this.facing === 1 ? 0 : Math.PI;
        const a = baseAng + angOff;
        game.vfx.spawnProjectile({
          x: bowX,
          y: bowY,
          vx: Math.cos(a) * 675,
          vy: Math.sin(a) * 675,
          radius: 12,
          color: '#34d399',
          coreColor: '#fef08a',
          owner: this,
          damage: 41,
          type: 'arrow'
        });
      });
    } else if (t >= 0.76 && !this.didSecondaryAction) {
      // Row 3 Frame F23 (t = 0.78s): High-angle (-32°) Skyward Starfall Beacon Arrow release!
      this.didSecondaryAction = true;
      this.vx -= this.facing * 45;
      if (game.audio) game.audio.play('arrow_rain', enemy ? enemy.x : this.x);

      const bowX = this.x + this.facing * 42;
      const bowY = this.y - 134;
      const skyAng = this.facing === 1 ? -0.58 : Math.PI + 0.58;
      game.vfx.spawnSlash(bowX, bowY, 72, skyAng - 0.95, skyAng + 0.95, '#34d399', 0.26);
      game.vfx.spawnShockwave(bowX, bowY, 82, '#fef08a', 0.32, false, true);
      game.vfx.spawnGlyphBurst(bowX, bowY, 6, 'emerald');

      const centerTargetX = enemy ? enemy.x : this.x + this.facing * 320;
      // Summon a Swirling Conical Emerald Gale Tornado Funnel at the target zone!
      game.vfx.spawnTornado({
        x: centerTargetX,
        groundY: this.groundY,
        vx: this.facing * 38,
        radius: 78,
        height: 265,
        color: '#10b981',
        coreColor: '#fef08a',
        maxLife: 1.10
      });

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
          damage: 25,
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
    // Row 4 (30 frames) natively animates Sylvara's wind-gather crouch, levitation with Astral Light-Wings, and feather-fall landing
    this.y = this.groundY;
    this.vy = 0;

    if (t < 0.04) {
      this.spawnedChannelTornado = false;
    }

    if (t < 0.56) {
      if (!this.spawnedChannelTornado && t >= 0.05) {
        this.spawnedChannelTornado = true;
        if (game.audio) game.audio.play('zephyr_flip', this.x);
        game.vfx.spawnTornado({
          x: this.x + this.facing * 65,
          groundY: this.groundY,
          vx: this.facing * 120,
          radius: 74,
          height: 260,
          color: '#10b981',
          coreColor: '#fef08a',
          maxLife: 0.92,
          isUltimate: true
        });
      }
      if (Math.random() < 0.85) {
        const a = Math.random() * Math.PI * 2;
        game.vfx.spawnParticle({
          x: this.x + this.facing * 38 + Math.cos(a) * 68,
          y: this.y - 120 + Math.sin(a) * 68,
          vx: -Math.cos(a) * 135,
          vy: -Math.sin(a) * 135,
          size: 7,
          color: Math.random() > 0.35 ? '#34d399' : '#fef08a',
          maxLife: 0.34
        });
      }
    } else if (!this.didActionFrame) {
      // Row 4 Frame F18 (t = 0.56s): Full Astral Light-Wing Dragon-Arrow Release!
      this.didActionFrame = true;
      if (game.audio) game.audio.play('archer_ult', this.x);

      const startX = this.x + this.facing * 52;
      const startY = this.y - 128;
      const targetX = enemy ? enemy.x : this.x + this.facing * 380;
      const endX =
        this.facing === 1
          ? Math.min(game.renderer.worldWidth - 110, Math.max(targetX + 210, this.x + 560))
          : Math.max(110, Math.min(targetX - 210, this.x - 560));

      game.renderer.triggerShake(26, 0.65);
      game.renderer.triggerAberration(15);
      game.renderer.triggerHitStop(0.09);

      // 1. Colossal Across-Screen 30fps Astral Wind-Dragon Beam at levitated bow height
      game.vfx.spawnBeam({
        x1: startX,
        y1: startY,
        x2: endX,
        y2: this.groundY - 128,
        width: 64,
        color: '#10b981',
        coreColor: '#fef08a',
        maxLife: 0.78
      });

      // 2. 6 Cascading Vertical Sonic-Boom Rings along the Beam Path
      for (let r = 0; r < 6; r++) {
        const rx = startX + this.facing * (70 + r * 95);
        game.vfx.spawnShockwave(rx, startY, 92 + r * 8, r % 2 === 0 ? '#34d399' : '#fef08a', 0.45, false, true);
      }

      // 3. Colossal Emerald Tempest Tornado Funnel + Jade Lightning Bolts on the Enemy
      game.vfx.spawnTornado({
        x: targetX,
        groundY: this.groundY,
        vx: this.facing * 45,
        radius: 102,
        height: 325,
        color: '#10b981',
        coreColor: '#fef08a',
        maxLife: 1.45,
        isUltimate: true
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
        enemy.takeDamage(238, this, true, 220, -340);
      }
    } else if (t >= 1.6) {
      this.setState('IDLE');
    }
  }

  draw(ctx, isReflection = false, renderer = null) {
    const sprites = PixelForge.initAssets().archer;
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const w = 208;
    const h = 208;
    const frameIdx = PixelForge.getFrameIndex(this, this.windPhase);

    ctx.translate(Math.round(this.x), Math.round(this.y));
    ctx.scale(this.facing, 1);

    PixelForge.drawSheetFrame(ctx, sprites, this, w, h, this.windPhase, isReflection, renderer);

    if (this.hitFlash > 0 && !isReflection) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5;
      PixelForge.drawGhostFrame(ctx, sprites, frameIdx, w, h);
    }

    ctx.restore();
  }
}
