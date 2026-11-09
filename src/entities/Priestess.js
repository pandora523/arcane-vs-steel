import { Fighter } from './Fighter.js?v=30fps36';
import { PixelForge } from '../engine/PixelForge.js?v=30fps36';

export class Priestess extends Fighter {
  constructor(x, groundY, facing = -1) {
    super({
      name: 'Seraphina',
      x,
      groundY,
      facing,
      maxHp: 1160,
      attackRange: 512,
      moveSpeed: 132,
      autoInterval: 1.33,
      lightColor: 'rgba(253, 224, 71, 1)',
      primaryColor: '#fde047'
    });
    this.heroId = 'priestess';
    this.theme = 'radiant';
    this.deathSfx = 'death_priestess';
    this.skillMaxCooldown = 5.55;
    this.autoDuration = 0.90;
    this.skillDuration = 0.98;
    this.ultDuration = 1.52;
    this.ultName = 'SERAPHIC APOTHEOSIS';
    this.skillName = 'DIVINE SANCTUARY';
    this.haloPhase = 0;
    this.shotCombo = 0;
    this.evadeToggle = 0;
    this.dodgeMaxCooldown = 3.90;
    this.dashMaxCooldown = 3.85;
    this.wallWingCooldown = 0;
    this.crouchCooldown = 0;
    this.crouchDuration = 0.96;
    this.isCrouching = false;
    this.isFlipVault = false;
    this.isBlinkTeleport = false;
    this.isAngelicAscent = false;
    this.ascentStartX = x;
    this.ascentTargetX = x;
    this.didSanctuaryHeal = false;
    this.didUltMiracle = false;
    this.ultChakramStep = 0;
    this.wingSpearCount = 0;
  }

  startJump(enemy, game, customDir = null) {
    // Sleek Shallow Seraphic Wing-Glide (Row 8 JUMP: max 34px skim — zero steep bounce!)
    this.dodgeCooldown = this.dodgeMaxCooldown * (0.86 + Math.random() * 0.28);
    this.setState('JUMP');
    this.isInvulnerable = true;
    this.isBlinkTeleport = false;
    this.isFlipVault = true;
    this.isAngelicAscent = true;
    this.wallWingCooldown = 3.5;

    const ww = game.renderer.worldWidth;
    let dir = customDir !== null ? customDir : -this.facing;
    if (this.x < 185) dir = 1;
    else if (this.x > ww - 185) dir = -1;

    const dist = enemy ? Math.abs(enemy.x - this.x) : 300;
    const retreatX = this.x - this.facing * 250;
    const pressuredOrCornered =
      this.x < 310 ||
      this.x > ww - 310 ||
      retreatX < 185 ||
      retreatX > ww - 185 ||
      dist < 235;

    this.ascentStartX = this.x;
    this.wingSpearCount = 0;

    if (enemy && pressuredOrCornered) {
      this.dashDuration = 0.58;
      const openSideDir = enemy.x < ww * 0.5 ? 1 : -1;
      let target = enemy.x + openSideDir * 335;
      if (Math.abs(target - this.x) < 245) {
        const crossDir = this.x < enemy.x ? 1 : -1;
        target = enemy.x + crossDir * 325;
      }
      this.ascentTargetX = Math.max(140, Math.min(ww - 140, target));
      this.dashDir = Math.sign(this.ascentTargetX - this.ascentStartX) || 1;
      if (game.vfx) {
        game.vfx.spawnDamageText(this.x, this.y - 140, 0, false, 'SERAPHIC WING GLIDE!', '#fef08a');
      }
    } else {
      this.dashDuration = 0.56;
      this.ascentTargetX = Math.max(140, Math.min(ww - 140, this.x + dir * 315));
      this.dashDir = dir;
      if (game.vfx) {
        game.vfx.spawnDamageText(this.x, this.y - 138, 0, false, 'SERAPHIC GLIDE!', '#fef08a');
      }
    }

    this.vx = 0;
    this.vy = 0;
    if (game.audio) game.audio.play('holy_heal', this.x);
    this.heal(16, 'WINGS OF GRACE');
    if (game.vfx) {
      game.vfx.spawnShockwave(this.x, this.groundY, 112, '#fde047', 0.32, true);
      game.vfx.spawnBurst(this.x, this.y - 92, 14, '#fef9c3', 210, { upBias: 95 });
      game.vfx.spawnGlyphBurst(this.x, this.y - 96, 7, 'radiant');
    }
  }

  startCrouch(enemy, game) {
    this.crouchCooldown = 4.0;
    this.crouchDuration = 0.96;
    this.setState('CROUCH');
    this.isCrouching = true;
    this.isDeflecting = true;
    this.vx = 0;
    this.y = this.groundY;
    if (game && game.vfx) {
      if (game.audio) game.audio.play('holy_heal', this.x);
      this.heal(13, 'BENEDICTION');
      game.vfx.spawnShockwave(this.x, this.groundY - 2, 68, '#fde047', 0.26, true);
      game.vfx.spawnGlyphBurst(this.x, this.y - 88, 6, 'radiant');
      game.vfx.spawnDamageText(this.x, this.y - 122, 0, false, 'BENEDICTION PRAYER!', '#fef08a');
    }
  }

  onStartDodge(enemy, game, dir) {
    // Grounded Sanctuary Blink-Glide (Row 6 DASH via isBlinkTeleport: 0px vertical lift!)
    const ww = game.renderer.worldWidth;
    const dist = enemy ? Math.abs(enemy.x - this.x) : 300;
    const retreatX = this.x + dir * 270;
    const cornered =
      this.x < 300 ||
      this.x > ww - 300 ||
      retreatX < 175 ||
      retreatX > ww - 175 ||
      dist < 220;

    this.isBlinkTeleport = true;
    this.isFlipVault = false;
    this.isAngelicAscent = false;
    this.dashDuration = 0.44;
    this.ascentStartX = this.x;

    if (enemy && cornered) {
      const openSideDir = enemy.x < ww * 0.5 ? 1 : -1;
      let target = enemy.x + openSideDir * 330;
      if (Math.abs(target - this.x) < 235) {
        const crossDir = this.x < enemy.x ? 1 : -1;
        target = enemy.x + crossDir * 320;
      }
      this.ascentTargetX = Math.max(140, Math.min(ww - 140, target));
      this.dashDir = Math.sign(this.ascentTargetX - this.ascentStartX) || 1;
      if (game.vfx) {
        game.vfx.spawnDamageText(this.x, this.y - 138, 0, false, 'SANCTUARY BLINK!', '#fef08a');
      }
    } else {
      this.ascentTargetX = Math.max(140, Math.min(ww - 140, this.x + dir * 295));
      this.dashDir = dir;
      if (game.vfx) {
        game.vfx.spawnDamageText(this.x, this.y - 136, 0, false, 'GRACE STEP!', '#fef08a');
      }
    }

    this.vx = 0;
    this.vy = 0;
    this.y = this.groundY;
    if (game.audio) game.audio.play('holy_heal', this.x);
    this.heal(16, 'WINGS OF GRACE');
    if (game.vfx) {
      game.vfx.spawnShockwave(this.x, this.groundY, 108, '#fde047', 0.30, true);
      game.vfx.spawnBurst(this.x, this.y - 92, 14, '#fef9c3', 195, { upBias: 85 });
      game.vfx.spawnGlyphBurst(this.x, this.y - 96, 6, 'radiant');
    }
  }

  onStartDash(enemy, game, dir) {
    this.isBlinkTeleport = false;
    this.isAngelicAscent = false;
    this.isFlipVault = false;
    this.dashDuration = 0.38;
    this.dashDir = dir;
    this.vx = dir * 365;
    if (game.audio) game.audio.play('holy_bolt', this.x);
    if (game.vfx) {
      game.vfx.spawnShockwave(this.x, this.y - 95, 76, '#fde047', 0.26, false, true);
      game.vfx.spawnGlyphBurst(this.x, this.y - 95, 5, 'radiant');
      game.vfx.spawnDamageText(this.x, this.y - 138, 0, false, 'RADIANT GLIDE!', '#fef08a');
    }
  }

  updateDashOrDodge(dt, enemy, game) {
    const t = this.stateTimer;

    // 1. Grounded Sanctuary Blink-Glide (DODGE: 0px vertical lift, cosine-smoothed floor glide)
    if (this.state === 'DODGE' && this.isBlinkTeleport) {
      const u = Math.min(1, t / this.dashDuration);
      const ease = 0.5 - 0.5 * Math.cos(u * Math.PI);
      this.x = this.ascentStartX + (this.ascentTargetX - this.ascentStartX) * ease;
      this.y = this.groundY;

      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }

      if (u > 0.08 && u < 0.92 && game.vfx && Math.random() < 0.72) {
        game.vfx.spawnParticle({
          x: this.x + (Math.random() - 0.5) * 28,
          y: this.groundY - 76 + (Math.random() - 0.5) * 34,
          vx: -this.dashDir * 60,
          vy: -24 - Math.random() * 26,
          size: 4,
          color: Math.random() > 0.38 ? '#fde047' : '#38bdf8',
          maxLife: 0.28
        });
      }

      if (t >= this.dashDuration) {
        this.y = this.groundY;
        this.vx = 0;
        this.isBlinkTeleport = false;
        this.isInvulnerable = false;
        if (game.vfx) {
          game.vfx.spawnShockwave(this.x, this.groundY, 92, '#fde047', 0.26, true);
        }
        this.setState('IDLE');
      }
      return;
    }

    // 2. Sleek Shallow Seraphic Wing-Glide (JUMP: max 34px smooth horizontal wing skim + angled Starlight Smite)
    if ((this.state === 'JUMP' || this.state === 'DODGE') && this.isFlipVault) {
      const u = Math.min(1, t / this.dashDuration);
      const airU = Math.max(0, Math.min(1, (u - 0.06) / 0.86));
      const horizEase = 0.5 - 0.5 * Math.cos(airU * Math.PI);
      this.x = this.ascentStartX + (this.ascentTargetX - this.ascentStartX) * horizEase;

      const liftFrac = airU > 0 && airU < 1 ? Math.sin(airU * Math.PI) : 0;
      this.y = this.groundY - liftFrac * 34;

      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }

      if (airU > 0.06 && airU < 0.94 && game.vfx && Math.random() < 0.78) {
        game.vfx.spawnParticle({
          x: this.x + (Math.random() - 0.5) * 32,
          y: this.y - 88 + (Math.random() - 0.5) * 24,
          vx: -this.dashDir * 64 + (Math.random() - 0.5) * 24,
          vy: 18 + Math.random() * 28,
          size: 4,
          color: Math.random() > 0.35 ? '#fde047' : '#ffffff',
          maxLife: 0.30
        });
      }

      // Synced with Row 8 F14..F16 scepter starburst cast (u >= 0.46)
      if (u >= 0.46 && !this.didActionFrame && enemy && !enemy.isDead) {
        this.didActionFrame = true;
        this.wingSpearCount++;
        if (game.audio) game.audio.play('holy_bolt', this.x);
        const sx = this.x + this.facing * 46;
        const sy = this.y - 108;
        const dx = enemy.x - sx;
        const dy = (enemy.y - 98) - sy;
        const d = Math.hypot(dx, dy) || 1;
        game.vfx.spawnProjectile({
          x: sx,
          y: sy,
          vx: (dx / d) * 725,
          vy: (dy / d) * 725,
          radius: 14,
          color: '#fde047',
          coreColor: '#ffffff',
          owner: this,
          damage: 45,
          type: 'holy_light',
          isMeteor: false
        });
        const shotAng = Math.atan2(dy, dx);
        game.vfx.spawnSlash(sx, sy, 52, shotAng - 0.75, shotAng + 0.75, '#fde047', 0.22);
        game.vfx.spawnShockwave(sx, sy, 62, '#fde047', 0.22, false, false);
        game.vfx.spawnGlyphBurst(sx, sy, 5, 'radiant');
      }

      if (t >= this.dashDuration) {
        this.y = this.groundY;
        this.vy = 0;
        this.isAngelicAscent = false;
        this.isFlipVault = false;
        this.isInvulnerable = false;
        if (game.vfx) {
          game.vfx.spawnShockwave(this.x, this.groundY, 88, '#fde047', 0.26, true);
        }
        this.setState('IDLE');
      }
      return;
    }

    // 3. Forward Radiant Feather-Skim Dash (Row 6 DASH: subtle 5px skim)
    const uDash = Math.min(1, t / (this.dashDuration || 0.38));
    this.x += this.dashDir * 355 * (1 - 0.25 * uDash) * dt;
    this.y = this.groundY - Math.sin(uDash * Math.PI) * 5;

    if (game.vfx && Math.random() < 0.68) {
      game.vfx.spawnParticle({
        x: this.x - this.dashDir * 16,
        y: this.y - 88 + (Math.random() - 0.5) * 32,
        vx: -this.dashDir * 68,
        vy: -28 - Math.random() * 28,
        size: 4,
        color: Math.random() > 0.45 ? '#fde047' : '#38bdf8',
        maxLife: 0.28
      });
    }

    if (t >= this.dashDuration) {
      this.y = this.groundY;
      this.isBlinkTeleport = false;
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  updateCrouch(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.crouchDuration || 0.96;
    this.vx *= Math.pow(0.001, dt);
    this.y = this.groundY;
    this.isCrouching = t < dur * 0.82;
    this.isDeflecting = this.isCrouching;

    // Frames F03..F11 (0.10s <= t < 0.42s): Kneeling Benediction Prayer with shimmering Sanctuary Rose-Gold Ward
    if (t >= 0.10 && t < 0.42) {
      if (game.vfx && Math.random() < 0.68) {
        const a = t * 22;
        const tipX = this.x + this.facing * 52;
        const tipY = this.y - 94;
        game.vfx.spawnParticle({
          x: tipX + Math.cos(a) * 18,
          y: tipY + Math.sin(a) * 18,
          vx: -Math.cos(a) * 48,
          vy: -Math.sin(a) * 48,
          size: 4,
          color: Math.random() > 0.4 ? '#fde047' : '#fef9c3',
          maxLife: 0.22
        });
      }
    } else if (t >= 0.44 && !this.didActionFrame) {
      // Frame F14 (Row 7 crouched release window): Fires low, fast Sacred Starlight counter-orb (holy_light)
      this.didActionFrame = true;
      this.shotCombo++;
      this.vx -= this.facing * 32;
      if (game.audio) game.audio.play('holy_bolt', this.x);

      const spawnX = this.x + this.facing * 52;
      const spawnY = this.y - 96;
      const targetY = enemy ? enemy.y - 100 : spawnY;
      const dx = enemy ? enemy.x - spawnX : this.facing * 510;
      const dy = targetY - spawnY;
      const dist = Math.hypot(dx, dy) || 1;
      const speed = 710;

      game.vfx.spawnProjectile({
        x: spawnX,
        y: spawnY,
        vx: (dx / dist) * speed,
        vy: (dy / dist) * speed,
        radius: 15,
        color: '#fde047',
        coreColor: '#ffffff',
        owner: this,
        damage: 66,
        type: 'holy_light',
        isMeteor: false
      });

      const cAng = this.facing === 1 ? 0 : Math.PI;
      game.vfx.spawnSlash(spawnX, spawnY, 54, cAng - 0.8, cAng + 0.8, '#fde047', 0.22);
      game.vfx.spawnShockwave(spawnX, spawnY, 60, '#fde047', 0.22, false, true);
      game.vfx.spawnGlyphBurst(spawnX, spawnY, 5, 'radiant');
    }

    if (t >= dur) {
      this.isCrouching = false;
      this.isDeflecting = false;
      this.setState('IDLE');
    }
  }

  update(dt, enemy, game) {
    this.haloPhase += dt * 2.8;
    this.wallWingCooldown = Math.max(0, this.wallWingCooldown - dt);
    this.crouchCooldown = Math.max(0, this.crouchCooldown - dt);

    if (enemy && !enemy.isDead && (this.state === 'IDLE' || this.state === 'WALK')) {
      const dist = Math.abs(enemy.x - this.x);
      const ww = game.renderer.worldWidth;
      const nearWall = this.x < 260 || this.x > ww - 260;
      const incomingProj =
        game.vfx &&
        game.vfx.projectiles.some((p) => p.owner === enemy && Math.abs(p.x - this.x) < 145);
      if ((dist < 225 || (nearWall && dist < 295) || incomingProj) && this.dodgeCooldown <= 0) {
        this.evadeToggle++;
        // Alternate smoothly between Grounded Sanctuary Blink (DODGE) and Shallow 34px Wing-Glide (JUMP)
        if (this.evadeToggle % 2 === 1 && !incomingProj) {
          this.dodgeCooldown = this.dodgeMaxCooldown * (0.86 + Math.random() * 0.28);
          this.setState('DODGE');
          this.isInvulnerable = true;
          let dir = -this.facing;
          if (this.x < 185) dir = 1;
          else if (this.x > ww - 185) dir = -1;
          this.dashDir = dir;
          this.onStartDodge(enemy, game, dir);
        } else {
          this.startJump(enemy, game);
        }
        return;
      }

      // Tactical Benediction Prayer Crouch & low Sacred Starlight counter-orb when at sanctuary range!
      if (
        dist >= 270 &&
        dist <= this.attackRange &&
        this.autoCooldown <= 0 &&
        this.crouchCooldown <= 0 &&
        this.shotCombo % 2 === 1
      ) {
        this.autoCooldown = this.autoInterval * (0.92 + Math.random() * 0.2);
        this.startCrouch(enemy, game);
        return;
      }

      if (dist < 235) {
        this.x -= this.facing * this.moveSpeed * 0.68 * dt;
      }
    }
    super.update(dt, enemy, game);
  }

  updateAutoAttack(dt, enemy, game) {
    // Grounded Sacred Starlight Prayer Cast (Row 2 AUTO_ATTACK: 0px vertical float!)
    const t = this.stateTimer;
    this.y = this.groundY;

    if (t < 0.34) {
      this.torsoAngle = -this.facing * 0.08 * (t / 0.34);
      if (game.vfx && Math.random() < 0.60) {
        const a = t * 22;
        game.vfx.spawnParticle({
          x: this.x + this.facing * 46 + Math.cos(a) * 20,
          y: this.y - 118 + Math.sin(a) * 20,
          vx: -Math.cos(a) * 42,
          vy: -Math.sin(a) * 42 - 14,
          size: 4,
          color: Math.random() > 0.4 ? '#fef9c3' : '#fde047',
          maxLife: 0.24
        });
      }
    } else if (t < 0.70) {
      if (!this.didActionFrame) {
        this.didActionFrame = true;
        this.shotCombo++;
        this.vx -= this.facing * 42;
        this.torsoVel = -this.facing * 5;
        if (game.audio) game.audio.play('holy_bolt', this.x);

        const spawnX = this.x + this.facing * 52;
        const spawnY = this.y - 116;
        const targetY = enemy ? enemy.y - 110 : spawnY;
        const dx = enemy ? enemy.x - spawnX : this.facing * 460;
        const dy = targetY - spawnY;
        const dist = Math.hypot(dx, dy) || 1;
        const speed = 648;
        const mode = this.shotCombo % 3;
        const isGraceCast = mode === 0;

        // Primary Luminous Star-Cross Bolt (Row 0 of priestess_vfx.png)
        game.vfx.spawnProjectile({
          x: spawnX,
          y: spawnY,
          vx: (dx / dist) * speed,
          vy: (dy / dist) * speed,
          radius: 15,
          color: '#fde047',
          coreColor: '#ffffff',
          owner: this,
          damage: isGraceCast ? 41 : 62,
          type: 'holy_light',
          isMeteor: false
        });

        // Every 3rd cast: "DAWN GRACE" — mends Seraphina's wounds, fires a twin Star-Bolt, and calls down a Heaven's Valkyrie Light-Spear!
        if (isGraceCast) {
          this.heal(17, 'DAWN GRACE');
          game.vfx.spawnProjectile({
            x: spawnX - this.facing * 14,
            y: spawnY - 14,
            vx: (dx / dist) * (speed * 0.95),
            vy: (dy / dist) * (speed * 0.95) - 18,
            radius: 13,
            color: '#facc15',
            coreColor: '#fef9c3',
            owner: this,
            damage: 20,
            type: 'holy_light',
            isMeteor: false
          });

          if (enemy && !enemy.isDead) {
            game.vfx.spawnSkyStrike({
              x: enemy.x - this.facing * 24,
              y: -150,
              groundY: this.groundY,
              vx: this.facing * 85,
              vy: 1180,
              type: 'holy_spear',
              color: '#fde047',
              coreColor: '#ffffff',
              owner: this,
              target: enemy,
              damage: 24,
              isUltimate: false
            });
          }
        }

        game.vfx.spawnShockwave(spawnX, spawnY, 58, '#fde047', 0.24, false, true);
        game.vfx.spawnBurst(spawnX, spawnY, 14, '#fef9c3', 185);
        game.vfx.spawnGlyphBurst(spawnX, spawnY, 5, 'radiant');
      }
    } else if (t >= this.autoDuration) {
      this.y = this.groundY;
      this.setState('IDLE');
    }
  }

  updateSkill(dt, enemy, game) {
    // SIGNATURE PRIESTESS SKILL: "DIVINE SANCTUARY & VALKYRIE SPEAR JUDGMENT"
    // Grounded Sanctuary Consecration Slam (Row 3 F09) -> Forward Judgment Sweep (Row 3 F16) — 0px float!
    const t = this.stateTimer;
    this.y = this.groundY;

    if (t < 0.24) {
      this.didSanctuaryHeal = false;
    } else if (t >= 0.26 && !this.didSanctuaryHeal) {
      // Synced with Row 3 F08..F09 Scepter-Pommel Sanctuary Floor Consecration Slam!
      this.didSanctuaryHeal = true;
      if (game.audio) game.audio.play('holy_heal', this.x);
      this.heal(62, 'SANCTUARY');
      game.vfx.spawnShockwave(this.x, this.groundY, 165, '#4ade80', 0.44, true);
      game.vfx.spawnShockwave(this.x, this.y - 95, 130, '#fde047', 0.38);
      game.vfx.spawnGlyphBurst(this.x, this.y - 105, 10, 'heal');

      // Sanctuary Repulsion Wave pushes encroaching melee attackers back!
      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 215) {
        const pushDir = Math.sign(enemy.x - this.x) || this.facing;
        enemy.vx += pushDir * 175;
      }
    }

    if (t >= 0.48 && !this.didActionFrame && enemy) {
      // Synced with Row 3 F15..F16 Forward Sunburst Scepter Judgment Sweep!
      this.didActionFrame = true;
      this.vx -= this.facing * 46;
      if (game.audio) game.audio.play('holy_smite', enemy.x);

      const sx = this.x + this.facing * 52;
      const sy = this.y - 118;
      const dx = enemy.x - sx;
      const dy = (enemy.y - 108) - sy;
      const dist = Math.hypot(dx, dy) || 1;
      const horizDist = Math.abs(enemy.x - this.x);

      // 1. Twin Converging Heaven's Judgment Rays
      game.vfx.spawnBeam({
        x1: enemy.x - 135,
        y1: -120,
        x2: enemy.x + 25,
        y2: this.groundY - 8,
        width: 38,
        color: '#fde047',
        coreColor: '#ffffff',
        maxLife: 0.44
      });
      game.vfx.spawnBeam({
        x1: enemy.x + 135,
        y1: -120,
        x2: enemy.x - 25,
        y2: this.groundY - 8,
        width: 38,
        color: '#facc15',
        coreColor: '#ffffff',
        maxLife: 0.44
      });

      // 2. Erupt a 7-Spire Gothic Cathedral Sanctum Pillar of Light on the Enemy (Row 2 of priestess_vfx.png)!
      game.vfx.spawnFlamePillar(enemy.x, this.groundY, this, null, {
        theme: 'radiant',
        delay: 0.02,
        maxLife: 0.76,
        scaleWidth: 0.94
      });

      if (!enemy.isDead) {
        const beamDmg = horizDist >= 260 ? 54 : 48;
        enemy.takeDamage(beamDmg, this, false, 60, -45);
      }

      // 3. Rain 2 Descending Heaven's Valkyrie Light-Spears (`Row 1` of priestess_vfx.png) from the sky onto the enemy!
      for (const side of [-1, 1]) {
        game.vfx.spawnSkyStrike({
          x: enemy.x + side * 44,
          y: -160,
          groundY: this.groundY,
          vx: -side * 90,
          vy: 1220,
          type: 'holy_spear',
          color: '#fde047',
          coreColor: '#ffffff',
          owner: this,
          target: enemy,
          damage: 12,
          delay: side < 0 ? 0 : 0.06,
          isUltimate: false
        });
      }

      // 4. Follow-up Luminous Star-Cross Lance
      game.vfx.spawnProjectile({
        x: sx,
        y: sy,
        vx: (dx / dist) * 645,
        vy: (dy / dist) * 645,
        radius: 16,
        color: '#fde047',
        coreColor: '#ffffff',
        owner: this,
        damage: 33,
        type: 'holy_light',
        isMeteor: false
      });

      game.vfx.spawnShockwave(enemy.x, this.groundY, 175, '#fde047', 0.44, true);
      game.vfx.spawnShockwave(sx, sy, 108, '#fef08a', 0.36, false, true);
      game.vfx.spawnBurst(enemy.x, this.groundY - 95, 24, '#fef08a', 265, { upBias: 115, size: 6 });
      game.vfx.spawnGlyphBurst(enemy.x, this.groundY - 95, 11, 'radiant');
    } else if (t >= this.skillDuration) {
      this.y = this.groundY;
      this.setState('IDLE');
    }
  }

  updateUltimate(dt, enemy, game) {
    // 3-STAGE GROUNDED ARCHANGEL ULTIMATE: "SERAPHIC APOTHEOSIS"
    // Plays dedicated Row 4 ULTIMATE stance planted inside her Cathedral Sanctuary Seal (0px awkward float!)
    const t = this.stateTimer;
    const ww = game.renderer ? game.renderer.worldWidth : 1200;
    const targetX = enemy ? enemy.x : ww * 0.5;
    this.isFlipVault = false;
    this.isBlinkTeleport = false;
    this.isAngelicAscent = false;
    this.vx = 0;
    this.vy = 0;
    this.y = this.groundY;

    if (t < 0.08) {
      this.didUltMiracle = false;
      this.ultChakramStep = 0;
    }

    // Stage 1: Miracle Benediction Self-Heal + Golden Sanctuary Rings as 6-Pinion Seraphim Wings unfurl!
    if (t >= 0.16 && !this.didUltMiracle) {
      this.didUltMiracle = true;
      if (game.audio) game.audio.play('holy_heal', this.x);
      this.heal(86, 'MIRACLE');
      game.vfx.spawnShockwave(this.x, this.groundY, 205, '#4ade80', 0.52, true);
      game.vfx.spawnShockwave(this.x, this.y - 108, 168, '#fde047', 0.48);
      game.vfx.spawnGlyphBurst(this.x, this.y - 115, 14, 'heal');
    }

    // Stage 2 (0.44s - 0.80s): 4 Orbiting Halo Star-Cross Chakrams fire Diagonal Golden Lance Beams + Descending Heaven's Valkyrie Light-Spears!
    const volleyTimes = [0.44, 0.56, 0.68, 0.80];
    if (
      this.ultChakramStep < volleyTimes.length &&
      t >= volleyTimes[this.ultChakramStep] &&
      enemy &&
      !enemy.isDead
    ) {
      const step = this.ultChakramStep;
      this.ultChakramStep++;
      if (game.audio) game.audio.play('holy_bolt', this.x);

      const haloX = this.x + Math.cos(step * 1.57) * 72;
      const haloY = this.y - 122 + Math.sin(step * 1.57) * 42;
      const aimX = enemy.x + (step - 1.5) * 44;
      const aimY = this.groundY - 12;

      game.vfx.spawnBeam({
        x1: haloX,
        y1: haloY,
        x2: aimX,
        y2: aimY,
        width: 30,
        color: '#fde047',
        coreColor: '#ffffff',
        maxLife: 0.42
      });

      game.vfx.spawnSkyStrike({
        x: aimX,
        y: -160,
        groundY: this.groundY,
        vx: 0,
        vy: 1260,
        type: 'holy_spear',
        color: '#fde047',
        coreColor: '#ffffff',
        owner: this,
        target: enemy,
        damage: 7,
        isUltimate: true
      });

      game.vfx.spawnShockwave(aimX, this.groundY, 96, '#fde047', 0.32, true);
      game.vfx.spawnShockwave(haloX, haloY, 66, '#fef08a', 0.26);
      game.vfx.spawnBurst(aimX, this.groundY - 24, 10, '#fef08a', 195, { upBias: 90, size: 6 });
      game.vfx.spawnGlyphBurst(aimX, this.groundY - 45, 5, 'radiant');
      enemy.takeDamage(13, this, false, 28, 0);
    }

    // Stage 3 (0.94s): Twin Diagonal Crisscrossing Heaven's Judgment X-Beams + 3 Cathedral Sanctum Pillars!
    if (t >= 0.94 && !this.didActionFrame) {
      this.didActionFrame = true;
      if (game.audio) game.audio.play('priestess_ult', targetX);

      game.renderer.triggerShake(24, 0.58);
      game.renderer.triggerAberration(14);
      game.renderer.triggerHitStop(0.085);

      game.vfx.spawnBeam({
        x1: targetX - 240,
        y1: -140,
        x2: targetX + 65,
        y2: this.groundY - 8,
        width: 74,
        color: '#fde047',
        coreColor: '#ffffff',
        maxLife: 0.78
      });

      game.vfx.spawnBeam({
        x1: targetX + 240,
        y1: -140,
        x2: targetX - 65,
        y2: this.groundY - 8,
        width: 74,
        color: '#facc15',
        coreColor: '#ffffff',
        maxLife: 0.78
      });

      game.vfx.spawnBeam({
        x1: this.x + this.facing * 52,
        y1: this.y - 118,
        x2: targetX,
        y2: this.groundY - 95,
        width: 48,
        color: '#fef08a',
        coreColor: '#ffffff',
        maxLife: 0.68
      });

      // 3 Towering 7-Spire Gothic Cathedral Pillars of Heaven's Light (Center + Flanking)!
      const pillarOffsets = [0, -135, 135];
      pillarOffsets.forEach((off, idx) => {
        const px = Math.max(75, Math.min(ww - 75, targetX + off));
        game.vfx.spawnFlamePillar(px, this.groundY, this, null, {
          theme: 'radiant',
          delay: idx === 0 ? 0.01 : 0.06,
          maxLife: idx === 0 ? 0.86 : 0.72,
          scaleWidth: idx === 0 ? 1.18 : 0.86,
          isUltimate: idx === 0
        });
      });

      for (let r = 0; r < 4; r++) {
        game.vfx.spawnShockwave(
          targetX,
          this.groundY - 95,
          95 + r * 45,
          r % 2 === 0 ? '#fde047' : '#fef08a',
          0.48,
          false
        );
      }

      game.vfx.spawnShockwave(targetX, this.groundY, 275, '#fde047', 0.55, true);
      game.vfx.spawnShockwave(targetX, this.groundY, 195, '#4ade80', 0.48, true);
      game.vfx.spawnBurst(targetX, this.groundY - 60, 36, '#fef08a', 340, { upBias: 150, size: 8 });
      game.vfx.spawnGlyphBurst(targetX, this.groundY - 90, 14, 'radiant');
      game.vfx.spawnGlyphBurst(targetX, this.groundY - 90, 8, 'heal');

      if (enemy && !enemy.isDead) {
        enemy.takeDamage(96, this, true, 150, -210);
      }
    } else if (t >= this.ultDuration) {
      this.y = this.groundY;
      this.setState('IDLE');
    }
  }

  drawSeraphimVFX(ctx, sprites, isReflection, renderer = null) {
    if (isReflection) return;
    const showWings =
      this.isAngelicAscent || this.state === 'ULTIMATE' || this.state === 'SKILL';
    if (!showWings) return;

    let env = 1.0;
    if (this.state === 'SKILL') {
      const dur = this.skillDuration || 0.98;
      const u = Math.min(1, this.stateTimer / dur);
      env = Math.min(1, Math.sin(u * Math.PI) * 1.65);
    } else if (this.state === 'ULTIMATE') {
      const dur = this.ultDuration || 1.52;
      const u = Math.min(1, this.stateTimer / dur);
      env = Math.min(1, Math.sin(u * Math.PI) * 1.85);
    } else if (this.isAngelicAscent) {
      const dur = this.dashDuration || 0.58;
      const u = Math.min(1, this.stateTimer / dur);
      env = Math.min(1, Math.sin(u * Math.PI) * 1.65);
    }
    if (env <= 0.02) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const isFullArchangel = this.isAngelicAscent || this.state === 'ULTIMATE';
    const cx = -4;
    const cy = -114;
    const vfxSheet = sprites && sprites.vfx;

    // 0. Grounded Stepped 4x4 Pixel-Art Sacred Sanctuary Cathedral Floor Mandala (anchored at groundY!)
    const groundDy = Math.round((this.groundY - this.y) / 4) * 4;
    ctx.save();
    ctx.translate(0, groundDy - 4);
    if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth > 0) {
      const sealCol = Math.floor(this.stateTimer * 30) % 30;
      const sealW = Math.round(((isFullArchangel ? 268 : 220) * (0.85 + 0.15 * env)) / 4) * 4;
      const sealH = Math.round((sealW * 0.42) / 4) * 4;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = env * 0.84;
      ctx.drawImage(
        vfxSheet,
        sealCol * 208,
        832,
        208,
        208,
        Math.round(-sealW * 0.5),
        Math.round(-sealH * 0.58),
        sealW,
        sealH
      );
    }
    const sancRx = (isFullArchangel ? 156 : 128) * (0.85 + 0.15 * env);
    const sancRy = sancRx * 0.24;
    const rot = this.haloPhase * 0.85;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = env * 0.86;
    for (let deg = 0; deg < 360; deg += 12) {
      const a = (deg * Math.PI) / 180 + rot;
      const px1 = Math.round((Math.cos(a) * sancRx) / 4) * 4;
      const py1 = Math.round((Math.sin(a) * sancRy) / 4) * 4;
      ctx.fillStyle = deg % 48 === 0 ? '#ffffff' : '#fde047';
      ctx.fillRect(px1 - 4, py1 - 2, 8, 4);

      if (deg % 24 === 0) {
        const px2 = Math.round((Math.cos(-a) * sancRx * 0.72) / 4) * 4;
        const py2 = Math.round((Math.sin(-a) * sancRy * 0.72) / 4) * 4;
        ctx.fillStyle = deg % 48 === 0 ? '#fde047' : '#38bdf8';
        ctx.fillRect(px2 - 2, py2 - 2, 4, 4);
      }
    }
    ctx.restore();

    // 1. Radiant Celestial Gold + Emerald-Grace Radial Light Halos behind Seraphina
    if (renderer && renderer.glowGold) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const bigR = (isFullArchangel ? 255 : 205) * (0.85 + 0.15 * env);
      ctx.globalAlpha = (isFullArchangel ? 0.42 : 0.34) * env;
      ctx.drawImage(renderer.glowGold, cx - bigR, cy - bigR, bigR * 2, bigR * 2);
      if (renderer.glowEmerald) {
        const graceR = (isFullArchangel ? 180 : 145) * (0.85 + 0.15 * env);
        ctx.globalAlpha = 0.22 * env;
        ctx.drawImage(renderer.glowEmerald, cx - graceR, cy - graceR, graceR * 2, graceR * 2);
      }
      ctx.restore();
    }

    const drawGlowingVfxCell = (sx, sy, sw, sh, dx, dy, dw, dh, alpha) => {
      const auraW = Math.round((dw * 1.12) / 4) * 4;
      const auraH = Math.round((dh * 1.12) / 4) * 4;
      const midX = dx + dw * 0.5;
      const midY = dy + dh * 0.5;
      if (renderer && renderer.glowGold) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(1, alpha * 0.30);
        const gR = Math.max(dw, dh) * 0.75;
        ctx.drawImage(renderer.glowGold, midX - gR, midY - gR, gR * 2, gR * 2);
      }
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, alpha * 0.28);
      ctx.drawImage(vfxSheet, sx, sy, sw, sh, Math.round(midX - auraW * 0.5), Math.round(midY - auraH * 0.5), auraW, auraH);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = Math.min(1, alpha * 0.96);
      ctx.drawImage(vfxSheet, sx, sy, sw, sh, Math.round(dx), Math.round(dy), Math.round(dw), Math.round(dh));
    };

    const col = Math.floor(this.stateTimer * 30) % 30;

    // 2. 30fps Stained-Glass Cathedral Rose Mandala behind the wings (Row 3: col * 208, 624, 208, 208)
    if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth > 0) {
      const haloSize = Math.round((isFullArchangel ? 276 : 228) * (0.86 + 0.14 * env));
      const gateBob = Math.round(Math.sin(this.haloPhase * 2.4) * 4);
      ctx.save();
      ctx.translate(cx, cy + gateBob);
      drawGlowingVfxCell(
        col * 208,
        624,
        208,
        208,
        -haloSize * 0.5,
        -haloSize * 0.5,
        haloSize,
        haloSize,
        (isFullArchangel ? 0.96 : 0.88) * env
      );
      ctx.restore();
    }

    // 3. Authentic 30-Frame 104x104 -> 2x HD-2D Pixel-Art Feathered Seraphim Angel Wings (320x232 per cell)
    const wingSheet = sprites && sprites.wings;
    if (wingSheet && wingSheet.complete && wingSheet.naturalWidth > 0) {
      const cellW = 320;
      const cellH = 232;
      const wingFrame = Math.floor(this.stateTimer * 30) % 30;
      let recoilX = 0;
      let recoilY = 0;
      if (!this.isDead && this.hurtTimer > 0) {
        recoilX = -6 + Math.round((Math.sin(this.hurtTimer * 60) * 4) / 2) * 2;
        recoilY = -2;
      }
      const scaleW = 0.84 + 0.16 * env;
      const drawW = Math.round(cellW * scaleW);
      const drawH = Math.round(cellH * (0.90 + 0.10 * env));
      const dx = Math.round(-drawW * 0.5 + recoilX);
      const dy = Math.round(-drawH - 16 + recoilY);

      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.22 * env;
      ctx.drawImage(wingSheet, wingFrame * cellW, 0, cellW, cellH, dx - 4, dy - 4, drawW + 8, drawH + 8);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.98 * env;
      ctx.drawImage(wingSheet, wingFrame * cellW, 0, cellW, cellH, dx, dy, drawW, drawH);
    }

    ctx.restore();
  }

  drawForegroundOverlay(ctx, renderer = null) {
    const sprites = PixelForge.initAssets().priestess;
    const groundPlantOffset = 4;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(this.x), Math.round(this.y + groundPlantOffset));
    ctx.scale(this.facing, 1);
    this.drawSeraphimVFX(ctx, sprites, false, renderer);
    ctx.restore();
  }

  drawUltimateForeground(ctx, renderer = null) {
    if (this.state !== 'ULTIMATE') return;
    const u = Math.min(1, this.stateTimer / (this.ultDuration || 1.52));
    const env = Math.min(1, Math.sin(u * Math.PI) * 1.75);
    if (env <= 0.02) return;

    const sprites = PixelForge.initAssets().priestess;
    const vfxSheet = sprites && sprites.vfx;
    const hasVfx = !!(vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth > 0);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(this.x / 4) * 4, Math.round((this.y - 110) / 4) * 4);
    ctx.scale(this.facing, 1);

    const orbitR = 132 * (0.88 + 0.12 * env);

    // 1. Spinning Double-Ringed Golden Ophanim Wheel around Seraphina (Stepped 4x4 Pixel-Art Ring!)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const ringRot = this.haloPhase * 1.4;
    for (let deg = 0; deg < 360; deg += 8) {
      const a = (deg * Math.PI) / 180 + ringRot;
      const rx1 = Math.round((Math.cos(a) * orbitR) / 4) * 4;
      const ry1 = Math.round((Math.sin(a) * orbitR) / 4) * 4;
      ctx.globalAlpha = env * 0.72;
      ctx.fillStyle = deg % 24 === 0 ? '#ffffff' : '#fde047';
      ctx.fillRect(rx1 - 2, ry1 - 2, 4, 4);

      if (deg % 16 === 0) {
        const rx2 = Math.round((Math.cos(-a) * orbitR * 0.82) / 4) * 4;
        const ry2 = Math.round((Math.sin(-a) * orbitR * 0.82) / 4) * 4;
        ctx.globalAlpha = env * 0.56;
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(rx2 - 2, ry2 - 2, 4, 4);
      }
    }
    ctx.restore();

    // 2. 6 Orbiting 30fps Pixel-Art Sacred Star Chakrams (`Row 0: holy_light`)
    for (let i = 0; i < 6; i++) {
      const a = -this.haloPhase * 2.4 + (i * Math.PI * 2) / 6;
      const ox = Math.round((Math.cos(a) * orbitR) / 4) * 4;
      const oy = Math.round((Math.sin(a) * orbitR) / 4) * 4;

      ctx.save();
      ctx.translate(ox, oy);

      if (renderer && renderer.glowGold) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = env * 0.42;
        ctx.drawImage(renderer.glowGold, -42, -42, 84, 84);
      }

      if (hasVfx) {
        const starCol = (Math.floor(this.stateTimer * 30) + i * 5) % 30;
        const sz = 108;
        const half = -54;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = env * 0.34;
        ctx.drawImage(vfxSheet, starCol * 208, 0, 208, 208, half - 4, half - 4, sz + 8, sz + 8);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = env * 0.96;
        ctx.drawImage(vfxSheet, starCol * 208, 0, 208, 208, half, half, sz, sz);
      } else {
        ctx.fillStyle = '#fde047';
        ctx.fillRect(-16, -4, 32, 8);
        ctx.fillRect(-4, -16, 8, 32);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-8, -2, 16, 4);
        ctx.fillRect(-2, -8, 4, 16);
      }

      ctx.restore();
    }

    ctx.restore();
  }

  draw(ctx, isReflection = false, renderer = null) {
    const sprites = PixelForge.initAssets().priestess;
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const w = 208;
    const h = 208;
    const scaleDir = this.facing;
    const groundPlantOffset = 4;

    // Crisp Golden-Sapphire Seraphic Echo Afterimages during Sanctuary Blink, Wing-Glide & Radiant Dash
    if (
      !isReflection &&
      !this.isDead &&
      (this.state === 'DODGE' || this.state === 'JUMP' || this.state === 'DASH')
    ) {
      const frameIdx = PixelForge.getFrameIndex(this, this.haloPhase);
      const trailSign = this.dashDir || this.facing;
      for (let g = 2; g >= 1; g--) {
        ctx.save();
        ctx.globalAlpha = g === 2 ? 0.16 : 0.28;
        ctx.translate(
          Math.round(this.x - trailSign * g * 20),
          Math.round(this.y + groundPlantOffset + (this.state === 'JUMP' ? g * 3 : 0))
        );
        ctx.scale(scaleDir, 1);
        PixelForge.drawAfterimageFrame(ctx, sprites, Math.max(0, frameIdx - g), w, h);
        ctx.restore();
      }
    }

    ctx.translate(Math.round(this.x), Math.round(this.y + groundPlantOffset));
    ctx.scale(scaleDir, 1);

    if (isReflection) {
      this.drawSeraphimVFX(ctx, sprites, true, renderer);
    }

    PixelForge.drawSheetFrame(ctx, sprites, this, w, h, this.haloPhase, isReflection, renderer);

    // Crisp 4x4 Pixel-Art Sanctuary Rose-Gold Benediction Ward during CROUCH parry window (t < 0.42s)
    if (!isReflection && this.state === 'CROUCH' && this.stateTimer < 0.42) {
      const wardEnv = Math.sin((this.stateTimer / 0.42) * Math.PI);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, wardEnv * 1.15);
      for (let i = -8; i <= 8; i++) {
        const u = i / 8;
        const wx = Math.round((52 + Math.cos(u * 1.25) * 14) / 4) * 4;
        const wy = Math.round((-88 + u * 48) / 4) * 4;
        ctx.fillStyle = Math.abs(i) % 3 === 0 ? '#38bdf8' : '#f59e0b';
        ctx.fillRect(wx - 2, wy - 2, 8, 4);
        if (Math.abs(i) <= 6) {
          ctx.fillStyle = Math.abs(i) <= 2 ? '#ffffff' : '#fde047';
          ctx.fillRect(wx + 2, wy - 2, 4, 4);
        }
      }
      ctx.restore();
    }

    ctx.restore();
  }
}
