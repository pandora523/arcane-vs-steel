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
      moveSpeed: 128,
      autoInterval: 1.24,
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
    this.stepTimer = 0;
    this.dodgeMaxCooldown = 2.88;
    this.dashMaxCooldown = 3.4;
    this.wallFlipCooldown = 0;
    this.crouchCooldown = 0;
    this.crouchDuration = 0.96;
    this.isCrouching = false;
    this.isFlipVault = false;
    this.flipStartX = x;
    this.flipTargetX = x;
    this.flipAngle = 0;
    this.isBlinkTeleport = false;
    this.didBlink = false;
    this.blinkOriginX = x;
    this.blinkTargetX = x;
    this.blinkPortalTimer = 0;
    this.solarEchoes = [];
    this.spawnedEclipse = false;
    this.didSupernovaFinisher = false;
  }

  spawnSolarEcho(frameIdx) {
    if (this.solarEchoes.length > 4) this.solarEchoes.shift();
    this.solarEchoes.push({
      x: this.x,
      y: this.groundY,
      facing: this.facing,
      frameIdx,
      life: 0,
      maxLife: 0.58
    });
  }

  startJump(enemy, game, customDir = null) {
    this.dodgeCooldown = this.dodgeMaxCooldown * (0.86 + Math.random() * 0.28);
    this.setState('JUMP');
    this.isInvulnerable = true;
    this.isBlinkTeleport = false;
    this.isFlipVault = true;
    this.flipStartX = this.x;
    this.flipAngle = 0;
    this.wallFlipCooldown = 3.0;

    const ww = game.renderer.worldWidth;
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
      game.vfx.spawnDamageText(this.x, this.y - 130, 0, false, 'FLAME GLIDE!', '#facc15');
    } else {
      this.dashDuration = 0.60;
      this.flipTargetX = Math.max(150, Math.min(ww - 150, this.x + dir * 335));
      this.dashDir = dir;
      game.vfx.spawnDamageText(this.x, this.y - 125, 0, false, 'SOLAR VAULT!', '#fb923c');
    }

    this.vx = 0;
    this.vy = 0;
    this.spawnSolarEcho(PixelForge.getFrameIndex(this, this.runeOrbit));
    if (game.audio) game.audio.play('blink', this.x);
    game.vfx.spawnShockwave(this.x, this.groundY, 98, '#fb923c', 0.32, true);
    game.vfx.spawnBurst(this.x, this.groundY - 12, 14, '#fef08a', 210);
    game.vfx.spawnGlyphBurst(this.x, this.y - 65, 7, 'arcane');
  }

  startCrouch(enemy, game) {
    this.crouchCooldown = 3.2;
    this.crouchDuration = 0.96;
    this.setState('CROUCH');
    this.isCrouching = true;
    this.isDeflecting = true;
    this.vx = 0;
    if (game && game.vfx) {
      game.vfx.spawnShockwave(this.x, this.groundY - 2, 66, '#fb923c', 0.26, true);
      game.vfx.spawnShockwave(this.x + this.facing * 42, this.y - 92, 48, '#fef08a', 0.24, false, true);
      game.vfx.spawnDamageText(this.x, this.y - 122, 0, false, 'FLAME WARD!', '#fef08a');
    }
  }

  onStartDodge(enemy, game, dir) {
    const ww = game.renderer.worldWidth;
    const dist = enemy ? Math.abs(enemy.x - this.x) : 300;
    const nearLeft = this.x < 320;
    const nearRight = this.x > ww - 320;

    // ★ SIGNATURE FIREMAGE EVASION: "ARCANE BLINK!" (Instant Solar Rift Phase-Shift Teleport)
    this.isFlipVault = false;
    this.flipAngle = 0;
    this.isBlinkTeleport = true;
    this.didBlink = false;
    this.dashDuration = 0.40;
    this.blinkOriginX = this.x;
    this.blinkPortalTimer = 0.56;
    this.vx = 0;
    this.vy = 0;

    let targetX;
    if (enemy && (nearLeft || nearRight || dist < 245)) {
      const openSideDir = enemy.x < ww * 0.5 ? 1 : -1;
      targetX = enemy.x + openSideDir * 340;
      if (Math.abs(targetX - this.x) < 250) {
        const crossDir = this.x < enemy.x ? 1 : -1;
        targetX = enemy.x + crossDir * 330;
      }
    } else {
      const smartDir = nearLeft ? 1 : nearRight ? -1 : dir;
      targetX = this.x + smartDir * 295;
    }
    this.blinkTargetX = Math.max(140, Math.min(ww - 140, targetX));
    this.dashDir = Math.sign(this.blinkTargetX - this.blinkOriginX) || dir || 1;

    this.spawnSolarEcho(PixelForge.getFrameIndex(this, this.runeOrbit));
    if (game.audio) game.audio.play('blink', this.x);

    // Departure Solar Rift Detonation + Vertical Solar Lightning!
    game.vfx.spawnShockwave(this.x, this.y - 92, 112, '#fef08a', 0.34, false, true);
    game.vfx.spawnShockwave(this.x, this.groundY, 124, '#fb923c', 0.34, true);
    game.vfx.spawnBurst(this.x, this.y - 90, 20, '#fb923c', 240);
    game.vfx.spawnGlyphBurst(this.x, this.y - 95, 9, 'arcane');
    game.vfx.spawnLightning(this.x, this.y - 185, this.groundY, '#fef08a', '#fb923c');
    game.vfx.spawnDamageText(this.x, this.y - 142, 0, false, 'ARCANE BLINK!', '#fef08a');

    // Volatile Solar Remnant scorches melee pursuers at departure point!
    if (enemy && !enemy.isDead && dist < 210) {
      enemy.takeDamage(30, this, false, 95, -55);
      game.vfx.spawnDamageText(enemy.x, enemy.y - 132, 0, false, 'SOLAR REMNANT!', '#fb923c');
    }
  }

  onStartDash(enemy, game, dir) {
    this.isFlipVault = false;
    this.isBlinkTeleport = false;
    this.flipAngle = 0;
    this.dashDuration = 0.44;
    this.vx = dir * 370;
    this.spawnSolarEcho(PixelForge.getFrameIndex(this, this.runeOrbit));
    if (game.audio) game.audio.play('fireball', this.x);
    game.vfx.spawnShockwave(this.x, this.y - 95, 76, '#fb923c', 0.26, false, true);
    game.vfx.spawnGlyphBurst(this.x, this.y - 100, 5, 'arcane');
    game.vfx.spawnDamageText(this.x, this.y - 135, 0, false, 'FLAME STEP!', '#facc15');
  }

  updateDashOrDodge(dt, enemy, game) {
    const t = this.stateTimer;

    if ((this.state === 'DODGE' || this.state === 'JUMP') && this.isFlipVault) {
      const u = Math.min(1, t / this.dashDuration);
      const airU = Math.max(0, Math.min(1, (u - 0.10) / 0.76));

      // Smooth horizontal flame-glide with hang-time hover plateau during downward fireball cast (airU = 0.35..0.70)
      const horizU =
        airU < 0.35
          ? (airU / 0.35) * 0.44
          : airU < 0.70
            ? 0.44 + ((airU - 0.35) / 0.35) * 0.28
            : 0.72 + ((airU - 0.70) / 0.30) * 0.28;
      this.x = this.flipStartX + (this.flipTargetX - this.flipStartX) * horizU;

      // Sleek 86px-high Flame-Glide arc (matching Archer's 86px height, zero steep bouncy-ball spike!)
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

      if (airU > 0.05 && airU < 0.95 && Math.random() < 0.82) {
        game.vfx.spawnParticle({
          x: this.x + (Math.random() - 0.5) * 26,
          y: this.y - 65 + (Math.random() - 0.5) * 24,
          vx: -this.dashDir * 75,
          vy: 28,
          size: 5.5,
          color: Math.random() > 0.4 ? '#fb923c' : '#fef08a',
          maxLife: 0.28
        });
      }

      // At Frame F15 (u >= 0.50) during his apex mid-air hover, Ignis aims his Sun-Staff downward (+35°)
      // and fires a blazing aerial Solar Fireball!
      if (u >= 0.50 && !this.didActionFrame && enemy && !enemy.isDead) {
        this.didActionFrame = true;
        if (game.audio) game.audio.play('fireball', this.x);
        const sx = this.x + this.facing * 46;
        const sy = this.y - 108;
        const dx = enemy.x - sx;
        const dy = (enemy.y - 96) - sy;
        const td = Math.hypot(dx, dy) || 1;
        game.vfx.spawnProjectile({
          x: sx,
          y: sy,
          vx: (dx / td) * 685,
          vy: (dy / td) * 685,
          radius: 14,
          color: '#fb923c',
          coreColor: '#fef08a',
          owner: this,
          damage: 62,
          type: 'fireball'
        });
        const shotAng = Math.atan2(dy, dx);
        game.vfx.spawnSlash(sx, sy, 58, shotAng - 0.85, shotAng + 0.85, '#fb923c', 0.24);
        game.vfx.spawnShockwave(sx, sy, 66, '#fef08a', 0.25, false, false);
        game.vfx.spawnGlyphBurst(sx, sy, 5, 'arcane');
      }

      if (t >= this.dashDuration) {
        this.y = this.groundY;
        this.vy = 0;
        this.isFlipVault = false;
        this.flipAngle = 0;
        this.isInvulnerable = false;
        game.vfx.spawnShockwave(this.x, this.groundY, 78, '#fb923c', 0.26, true);
        this.setState('IDLE');
      }
      return;
    }

    // ★ Row 6 (30-frame DODGE - ARCANE BLINK TELEPORT): Instant Solar Rift Phase-Out & Phase-In!
    if (this.isBlinkTeleport) {
      if (t >= 0.13 && !this.didBlink) {
        this.didBlink = true;
        this.x = this.blinkTargetX;
        if (enemy && !enemy.isDead) {
          this.facing = enemy.x >= this.x ? 1 : -1;
        }
        this.spawnSolarEcho(PixelForge.getFrameIndex(this, this.runeOrbit));

        // Arrival Solar Rift Detonation + Lightning Flash + Instant Snap Solar Bolt!
        game.vfx.spawnShockwave(this.x, this.y - 92, 114, '#fef08a', 0.34, false, true);
        game.vfx.spawnShockwave(this.x, this.groundY, 128, '#fb923c', 0.32, true);
        game.vfx.spawnBurst(this.x, this.y - 92, 22, '#fef08a', 255);
        game.vfx.spawnGlyphBurst(this.x, this.y - 96, 10, 'arcane');
        game.vfx.spawnLightning(this.x, this.y - 185, this.groundY, '#fef08a', '#fb923c');

        if (enemy && !enemy.isDead) {
          if (game.audio) game.audio.play('fireball', this.x);
          const sx = this.x + this.facing * 44;
          const sy = this.y - 108;
          const dx = enemy.x - sx;
          const dy = (enemy.y - 108) - sy;
          const d = Math.hypot(dx, dy) || 1;
          game.vfx.spawnProjectile({
            x: sx,
            y: sy,
            vx: (dx / d) * 655,
            vy: (dy / d) * 655,
            radius: 14,
            color: '#fb923c',
            coreColor: '#fef08a',
            owner: this,
            damage: 48,
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

    // Row 6 (30-frame DASH - Flame-Step Glide): aerodynamic horizontal flame glide + mid-dash snap fireball
    this.x += this.dashDir * 295 * dt;
    if (Math.random() < 0.75) {
      game.vfx.spawnParticle({
        x: this.x - this.dashDir * 16,
        y: this.y - 82 + (Math.random() - 0.5) * 34,
        vx: -this.dashDir * 85,
        vy: -30 - Math.random() * 25,
        size: 5.5,
        color: Math.random() > 0.4 ? '#fb923c' : '#fef08a',
        maxLife: 0.28
      });
    }

    if (t >= 0.20 && !this.didActionFrame && enemy && !enemy.isDead) {
      this.didActionFrame = true;
      const sx = this.x + this.facing * 46;
      const sy = this.y - 108;
      const dx = enemy.x - sx;
      const dy = (enemy.y - 108) - sy;
      const d = Math.hypot(dx, dy) || 1;
      game.vfx.spawnProjectile({
        x: sx,
        y: sy,
        vx: (dx / d) * 645,
        vy: (dy / d) * 645,
        radius: 13,
        color: '#fb923c',
        coreColor: '#fef08a',
        owner: this,
        damage: 45,
        type: 'fireball'
      });
      game.vfx.spawnShockwave(sx, sy, 54, '#fef08a', 0.22, false, true);
    }

    if (t >= this.dashDuration) {
      this.isFlipVault = false;
      this.isBlinkTeleport = false;
      this.flipAngle = 0;
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

    // Frames F00..F10 (t < 0.36s): Low 7px kneeling crouch conjuring spinning Flame-Ward shield ring
    if (t >= 0.10 && t < 0.36) {
      if (Math.random() < 0.72) {
        const a = t * 28;
        const wx = this.x + this.facing * 48;
        const wy = this.y - 92;
        game.vfx.spawnParticle({
          x: wx + Math.cos(a) * 20,
          y: wy + Math.sin(a) * 24,
          vx: -Math.cos(a) * 55,
          vy: -Math.sin(a) * 55,
          size: 4.5,
          color: Math.random() > 0.4 ? '#fb923c' : '#fef08a',
          maxLife: 0.22
        });
      }
    } else if (t >= 0.36 && !this.didActionFrame) {
      // Frame F11..F16 (t = 0.36s): Low skimming Solar Fireball launched from crouched stance!
      this.didActionFrame = true;
      this.castCombo++;
      this.vx -= this.facing * 42;
      if (game.audio) game.audio.play('fireball', this.x);

      const spawnX = this.x + this.facing * 52;
      const spawnY = this.y - 92;
      const targetY = enemy ? enemy.y - 96 : spawnY;
      const dx = enemy ? enemy.x - spawnX : this.facing * 500;
      const dy = targetY - spawnY;
      const dist = Math.hypot(dx, dy) || 1;
      const speed = 665;

      game.vfx.spawnProjectile({
        x: spawnX,
        y: spawnY,
        vx: (dx / dist) * speed,
        vy: (dy / dist) * speed,
        radius: 15,
        color: '#fb923c',
        coreColor: '#fef08a',
        owner: this,
        damage: 86,
        type: 'fireball',
        isMeteor: false
      });

      const cAng = this.facing === 1 ? 0 : Math.PI;
      game.vfx.spawnSlash(spawnX, spawnY, 60, cAng - 0.85, cAng + 0.85, '#fb923c', 0.24);
      game.vfx.spawnShockwave(spawnX, spawnY, 64, '#fb923c', 0.26, false, true);
      game.vfx.spawnShockwave(spawnX + this.facing * 14, spawnY, 44, '#fef08a', 0.20, false, true);
      game.vfx.spawnGlyphBurst(spawnX, spawnY, 5, 'arcane');
    }

    if (t >= dur) {
      this.isCrouching = false;
      this.isDeflecting = false;
      this.setState('IDLE');
    }
  }

  update(dt, enemy, game) {
    this.runeOrbit += dt * 3.0;
    this.wallFlipCooldown = Math.max(0, this.wallFlipCooldown - dt);
    this.crouchCooldown = Math.max(0, this.crouchCooldown - dt);
    this.blinkPortalTimer = Math.max(0, this.blinkPortalTimer - dt);

    for (let i = this.solarEchoes.length - 1; i >= 0; i--) {
      const ec = this.solarEchoes[i];
      ec.life += dt;
      if (ec.life >= ec.maxLife) {
        this.solarEchoes.splice(i, 1);
      }
    }

    if (!this.isDead && this.state === 'WALK') {
      this.stepTimer += dt;
      if (this.stepTimer >= 0.32) {
        this.stepTimer = 0;
        game.vfx.spawnBurst(this.x - this.facing * 12, this.groundY - 2, 4, '#fb923c', 65, {
          upBias: 30,
          size: 4,
          life: 0.30,
          additive: true
        });
      }
    }

    if (enemy && !enemy.isDead && (this.state === 'IDLE' || this.state === 'WALK')) {
      const dist = Math.abs(enemy.x - this.x);
      const ww = game.renderer.worldWidth;
      const nearWall = this.x < 260 || this.x > ww - 260;
      const pinnedLeft = this.x < 240 && enemy.x > this.x;
      const pinnedRight = this.x > ww - 240 && enemy.x < this.x;
      const incomingProj =
        game.vfx &&
        game.vfx.projectiles.some((p) => p.owner === enemy && Math.abs(p.x - this.x) < 155);

      // Proactive Arcane Blink Teleport when pressured, cornered, or evading incoming projectiles!
      if ((dist < 235 || (nearWall && dist < 305) || incomingProj) && this.dodgeCooldown <= 0) {
        this.startDodge(enemy, game);
        return;
      }

      if ((pinnedLeft || pinnedRight) && dist < 265 && this.dodgeCooldown <= 0 && this.wallFlipCooldown <= 0) {
        this.wallFlipCooldown = 3.0;
        this.startJump(enemy, game);
        return;
      }

      // Tactical Flame-Ward Crouch & Low Skimming Fireball when at pyromancer artillery range every 2nd cast!
      if (
        dist >= 265 &&
        dist <= this.attackRange &&
        this.autoCooldown <= 0 &&
        this.crouchCooldown <= 0 &&
        this.castCombo % 2 === 1
      ) {
        this.autoCooldown = this.autoInterval * (0.92 + Math.random() * 0.2);
        this.startCrouch(enemy, game);
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
      // Row 2 Frames F00..F09: Drawing the Sun-Staff back while igniting a swirling solar sphere in his left palm
      this.torsoAngle = -this.facing * 0.16 * (t / 0.34);
      if (Math.random() < 0.6) {
        const a = t * 20;
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
      // Row 2 Frames F10..F18: Forward Sun-Staff thrust & blazing Solar Fireball projection
      if (!this.didActionFrame) {
        this.didActionFrame = true;
        this.castCombo++;
        this.vx -= this.facing * 52;
        this.torsoVel = -this.facing * 8;
        if (game.audio) game.audio.play('fireball', this.x);

        const spawnX = this.x + this.facing * 52;
        const spawnY = this.y - 115;
        const targetY = enemy ? enemy.y - 112 : spawnY;
        const dx = enemy ? enemy.x - spawnX : this.facing * 460;
        const dy = targetY - spawnY;
        const dist = Math.hypot(dx, dy) || 1;
        const speed = 625;
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
          damage: isTwinFlare ? 68 : 79,
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
            damage: 42,
            type: 'fireball',
            isMeteor: false
          });
        }

        game.vfx.spawnShockwave(spawnX, spawnY, 58, '#facc15', 0.24, false, true);
        game.vfx.spawnBurst(spawnX, spawnY, 12, '#fb923c', 180);
        game.vfx.spawnGlyphBurst(spawnX, spawnY, 4, 'arcane');
      }
    } else if (t >= 0.96) {
      this.setState('IDLE');
    }
  }

  updateSkill(dt, enemy, game) {
    const t = this.stateTimer;
    if (t >= 0.26 && !this.didActionFrame && enemy) {
      // Row 3 Phase 1 (F07..F14): Slams the butt of the Sun-Staff into the ground with a magma shockwave ring
      // to erupt Triple Hellfire Magma Pillars!
      this.didActionFrame = true;
      if (game.audio) game.audio.play('flame_pillar', enemy.x);

      game.vfx.spawnShockwave(this.x + this.facing * 24, this.groundY, 115, '#fb923c', 0.36, true);
      game.vfx.spawnShockwave(this.x + this.facing * 24, this.groundY, 78, '#fef08a', 0.28, true);
      game.vfx.spawnGlyphBurst(this.x, this.y - 95, 6, 'arcane');

      game.vfx.spawnFlamePillar(enemy.x, this.groundY, this, enemy, {
        theme: 'arcane',
        delay: 0.24,
        maxLife: 1.45,
        scaleWidth: 1.15
      });
      game.vfx.spawnFlamePillar(enemy.x - 95, this.groundY, this, enemy, {
        theme: 'arcane',
        delay: 0.36,
        maxLife: 1.25,
        scaleWidth: 0.75
      });
      game.vfx.spawnFlamePillar(enemy.x + 95, this.groundY, this, enemy, {
        theme: 'arcane',
        delay: 0.36,
        maxLife: 1.25,
        scaleWidth: 0.75
      });
    } else if (t >= 0.56 && !this.didSecondaryAction && enemy) {
      // Row 3 Phase 2 (F15..F22): Wide forward pyromantic Sun-Staff sweep to detonate the pillars & launch twin orbs!
      this.didSecondaryAction = true;
      this.vx -= this.facing * 65;
      if (game.audio) game.audio.play('fireball', this.x);

      const sx = this.x + this.facing * 50;
      const sy = this.y - 115;
      const fAng = this.facing === 1 ? 0 : Math.PI;
      game.vfx.spawnSlash(sx, sy, 68, fAng - 1.0, fAng + 1.0, '#fb923c', 0.26);
      game.vfx.spawnShockwave(sx, sy, 76, '#fef08a', 0.28, false, true);

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
          damage: 35,
          type: 'fireball'
        });
      });
    } else if (t >= 1.05) {
      this.setState('IDLE');
    }
  }

  updateUltimate(dt, enemy, game) {
    // 3-STAGE ULTIMATE: "ECLIPSE SUPERNOVA" (Cataclysmic Solar Armageddon)
    // Stage 1 (0.0s - 0.55s): Colossal Black-Gold Solar Eclipse Singularity + Gravity Well Lock + Corona Lightning
    // Stage 2 (0.55s - 1.02s): Heaven-to-Earth Obliterating Solar Plasma Beam + 5 High-Velocity Cataclysm Meteors
    // Stage 3 (1.02s - 1.58s): Supernova Cataclysm Eruption + 3 Chaining Hellfire Magma Pillars
    const t = this.stateTimer;
    this.y = this.groundY;
    this.vy = 0;

    const targetX = enemy ? enemy.x : game.renderer.worldWidth * 0.5;
    const eclipseX = enemy ? this.x * 0.3 + enemy.x * 0.7 : game.renderer.worldWidth * 0.5;
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
          enemy.takeDamage(26, this, false, 20, 0);
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
        enemy.takeDamage(96, this, true, 160, -220);
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
          scaleWidth: idx === 1 ? 1.05 : 0.72,
          isUltimate: true
        });
      });
      game.vfx.spawnLightning(targetX - 50, -250, this.groundY, '#fef08a', '#fb923c');
      game.vfx.spawnLightning(targetX + 50, -250, this.groundY, '#ffffff', '#ea580c');
    } else if (t >= 1.56) {
      this.setState('IDLE');
    }
  }

  drawSolarEchoes(ctx) {
    if (!this.solarEchoes.length) return;
    const sprites = PixelForge.initAssets().mage;
    if (!sprites || !sprites.sheet || !sprites.sheet.complete) return;

    for (const ec of this.solarEchoes) {
      const fade = Math.max(0, 1 - ec.life / ec.maxLife);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(Math.round(ec.x), Math.round(ec.y));
      ctx.scale(ec.facing, 1);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * 0.48;
      PixelForge.drawGhostFrame(ctx, sprites, ec.frameIdx, 208, 208);
      ctx.restore();
    }
  }

  drawBlinkPortals(ctx, renderer = null) {
    if (this.blinkPortalTimer <= 0) return;
    const vfxSheet = PixelForge.initAssets().mage?.vfx;
    const fade = Math.min(1, this.blinkPortalTimer / 0.42);
    const col = Math.floor((0.56 - this.blinkPortalTimer) * 52) % 30;
    const portals = [this.blinkOriginX];
    if (this.didBlink || this.blinkPortalTimer < 0.44) {
      portals.push(this.blinkTargetX);
    }

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let idx = 0; idx < portals.length; idx++) {
      const px = Math.round(portals[idx]);
      const py = Math.round(this.groundY - 96);
      const size = Math.round(168 * (0.82 + 0.18 * fade));
      const half = Math.round(-size * 0.5);

      ctx.save();
      ctx.translate(px, py);

      if (renderer) {
        ctx.globalCompositeOperation = 'lighter';
        if (renderer.glowOrange) {
          ctx.globalAlpha = fade * 0.65;
          ctx.drawImage(renderer.glowOrange, -size * 1.1, -size * 1.1, size * 2.2, size * 2.2);
        }
        if (renderer.glowGold) {
          ctx.globalAlpha = fade * 0.55;
          ctx.drawImage(renderer.glowGold, -size * 0.85, -size * 0.85, size * 1.7, size * 1.7);
        }
      }

      if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
        // Row 2 (y = 416) on mage_vfx.png: Blazing Solar Eclipse / Rift Ring
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade * 0.48;
        ctx.drawImage(vfxSheet, col * 208, 416, 208, 208, half - 8, half - 8, size + 16, size + 16);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = fade * 0.92;
        ctx.drawImage(vfxSheet, col * 208, 416, 208, 208, half, half, size, size);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade * 0.40;
        ctx.drawImage(vfxSheet, col * 208, 416, 208, 208, half, half, size, size);
      }

      // Vertical Solar Rift Tear Core (chunky 4px pixel beam)
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * 0.85;
      ctx.fillStyle = '#fb923c';
      ctx.fillRect(-10, -76, 20, 152);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-6, -68, 12, 136);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-2, -56, 4, 112);

      ctx.restore();
    }
    ctx.restore();
  }

  draw(ctx, isReflection = false, renderer = null) {
    const sprites = PixelForge.initAssets().mage;
    if (!isReflection) {
      this.drawBlinkPortals(ctx, renderer);
      this.drawSolarEchoes(ctx);
    }

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const w = 208;
    const h = 208;
    const scaleDir = this.facing;
    const frameIdx = PixelForge.getFrameIndex(this, this.runeOrbit);

    ctx.translate(Math.round(this.x), Math.round(this.y));
    ctx.scale(scaleDir, 1);

    PixelForge.drawSheetFrame(ctx, sprites, this, w, h, this.runeOrbit, isReflection, renderer);

    if (this.hitFlash > 0 && !isReflection) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5;
      PixelForge.drawGhostFrame(ctx, sprites, frameIdx, w, h);
    }

    ctx.restore();
  }
}
