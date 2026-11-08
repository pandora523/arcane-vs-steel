import { Fighter } from './Fighter.js';
import { PixelForge } from '../engine/PixelForge.js';

export class Ronin extends Fighter {
  constructor(x, groundY, facing = 1) {
    const isBool = typeof facing === 'boolean';
    const dir = isBool ? (facing ? 1 : -1) : facing || 1;
    super({
      name: 'Kaze-Maru',
      x,
      groundY,
      facing: dir,
      maxHp: 1240,
      attackRange: 165,
      moveSpeed: 188,
      autoInterval: 0.94,
      lightColor: 'rgba(129, 140, 248, 1)',
      primaryColor: '#818cf8'
    });

    this.heroId = 'ronin';
    this.theme = 'storm';
    this.primaryColor = '#818cf8'; // Electric Raijin Indigo
    this.secondaryColor = '#38bdf8'; // Susanoo Sky-Cyan
    this.lightColor = 'rgba(129, 140, 248, 1)';
    this.deathSfx = 'death_warrior';
    this.hasPoise = true; // Storm-Samurai Sword-Saint Poise resists ranged knockback

    // Specification & engine stat properties
    this.speed = 252;
    this.attackCooldownMax = 0.78;
    this.skillName = 'RAIJIN THUNDER-PILLAR';
    this.skillMaxCooldown = 4.4;
    this.skillCooldownMax = 4.4;
    this.skillDuration = 0.96;
    this.skillTriggerRange = 470;
    this.ultName = 'SUSANOO THUNDERSTORM';

    this.dashSpeed = 740;
    this.dashDuration = 0.40;
    this.dashMaxCooldown = 2.7;
    this.dashCooldownMax = 2.6;
    this.dodgeMaxCooldown = 3.0;

    // 30fps animation speed tracking
    this.animSpeed = 0.042;
    this.comboStep = 0;
    this.stepDustTimer = 0;

    // Custom state properties for Raijin Thunder-Pillar, Thunder-Drum Parry, Sky-Vault & Susanoo Ultimate
    this.odachiDropped = false;
    this.pillarsErupted = false;
    this.activeOdachiX = 0;
    this.activeOdachiTimer = 0;
    this.ultStrike1 = false;
    this.ultStrike2 = false;
    this.ultStrike3 = false;
    this.ultStage = 0;
    this.stormAvatarTimer = 0;

    this.crouchCooldown = 0;
    this.crouchDuration = 0.90;
    this.crouchFired = false;
    this.isCrouching = false;
    this.isDeflecting = false;
    this.reflectedInSkill = false;

    this.vaultCooldown = 0;
    this.isFlipVault = false;
    this.flipStartX = x;
    this.flipTargetX = x;
    this.flipAngle = 0;
    this.jumpDuration = 0.60;
    this.jumpHeight = 88;
    this.jumpShotFired = false;
    this.attackHitDealt = false;

    // Bespoke 30fps HD-2D Storm-Samurai Visual Systems (rendered from ronin_vfx.png + ghost echoes)
    this.lightningEchoes = []; // 4 electric indigo-cyan ghost afterimages during Dash / Dodge / Iaido Flash-Cut
    this.raijinSkyOdachis = []; // Row 1 (y = 208): Descending Raijin Sky-Odachi Blades
    this.raijinDragonPillars = []; // Row 2 (y = 416): Coiling Raijin Lightning Dragon-Pillars
    this.susanooAvatar = null; // Row 3 (y = 624) & Row 4 (y = 832): Colossal Susanoo Storm-God Avatar & Thousand-Blade Slash Ring
    this.vfxSheet = null;
    this._drewOverlayThisFrame = false;
  }

  getSprites() {
    const assets = PixelForge.initAssets();
    if (!assets.ronin && typeof Image !== 'undefined') {
      const loadImg = (src, onLoad) => {
        const img = new Image();
        img.decoding = 'async';
        if (onLoad) img.onload = () => onLoad(img);
        img.src = src;
        return img;
      };
      assets.ronin = {
        sheet: loadImg('assets/sprites/ronin_sheet.png?v=30fps15'),
        vfx: loadImg('assets/sprites/ronin_vfx.png?v=30fps15'),
        portrait: loadImg('assets/sprites/ronin_portrait.png?v=2', () => PixelForge.refreshPortraits())
      };
    }
    if (assets.ronin?.vfx) {
      this.vfxSheet = assets.ronin.vfx;
    }
    return assets.ronin;
  }

  getEffectiveAttackRange() {
    // Every 3rd strike unleashes an IAIDO FLASH-CUT surge + high-velocity storm_wave up to 440px
    return this.comboStep % 3 === 2 ? 440 : this.attackRange;
  }

  /**
   * Spawns 4 electric indigo-cyan ghost afterimages along Kaze-Maru's Iaido Flash-Step trajectory
   */
  spawnLightningEchoes(fromX, fromY, toX, toY, facing, count = 4) {
    const frames = [184, 188, 72, 194];
    for (let i = 0; i < count; i++) {
      const u = i / Math.max(1, count);
      this.lightningEchoes.push({
        x: fromX + (toX - fromX) * u,
        y: fromY + (toY - fromY) * u,
        facing: facing || this.facing,
        frameIdx: frames[i % frames.length],
        color: i % 2 === 0 ? '#818cf8' : '#38bdf8',
        life: 0,
        maxLife: 0.34 + i * 0.045
      });
    }
  }

  /**
   * Spawns a descending Raijin Sky-Odachi (Row 1 of ronin_vfx.png, y = 208)
   */
  spawnRaijinSkyOdachi(targetX, delay = 0, isUltimate = false, enemy = null, game = null) {
    const g = game || this.game;
    const ww = g?.renderer ? g.renderer.worldWidth : 1200;
    const ox = Math.max(90, Math.min(ww - 90, targetX));
    const maxLife = isUltimate ? 0.72 : 0.64;

    this.raijinSkyOdachis.push({
      x: ox,
      y: this.groundY - 240,
      groundY: this.groundY,
      vy: 1950,
      delay,
      impacted: false,
      life: maxLife,
      maxLife,
      isUltimate
    });

    if (g && g.vfx) {
      if (typeof g.vfx.spawnSkyStrike === 'function') {
        g.vfx.spawnSkyStrike({
          x: ox,
          y: -190,
          groundY: this.groundY,
          vx: 0,
          vy: 1750,
          type: 'raijin_odachi',
          color: '#818cf8',
          coreColor: '#38bdf8',
          owner: this,
          target: enemy,
          damage: isUltimate ? 16 : 0,
          delay,
          maxLinger: 0.48,
          isUltimate
        });
      }
      if (typeof g.vfx.spawnLightning === 'function') {
        g.vfx.spawnLightning(ox, this.groundY - 240, this.groundY, '#e0f2fe', '#818cf8');
      }
    }
  }

  /**
   * Spawns sequential Coiling Raijin Lightning Dragon-Pillars (Row 2 of ronin_vfx.png, y = 416)
   */
  spawnRaijinPillars(originX, dir, count, spacing, isUltimate, enemy, game) {
    const g = game || this.game;
    const ww = g?.renderer ? g.renderer.worldWidth : 1200;
    for (let i = 0; i < count; i++) {
      const px = Math.max(90, Math.min(ww - 90, originX + dir * (i * spacing)));
      const height = 142 + (i % 2 === 0 ? 42 : 22) + (isUltimate ? 24 : 0);
      const width = 44 + (i % 2) * 8;
      const delay = i * 0.045;
      const maxLife = isUltimate ? 1.05 : 0.86;

      this.raijinDragonPillars.push({
        x: px,
        groundY: this.groundY,
        height,
        width,
        tilt: dir * (0.14 + i * 0.025),
        delay,
        life: maxLife,
        maxLife,
        isUltimate
      });

      if (g && g.vfx) {
        if (typeof g.vfx.spawnCrystalSpike === 'function') {
          g.vfx.spawnCrystalSpike({
            x: px,
            groundY: this.groundY,
            height,
            width,
            tilt: dir * (0.18 + i * 0.03),
            color: i % 2 === 0 ? '#818cf8' : '#38bdf8',
            coreColor: '#e0f2fe',
            owner: this,
            target: enemy,
            damage: isUltimate ? 18 : 16,
            delay,
            maxLife,
            isUltimate
          });
        }
        if (typeof g.vfx.spawnLightning === 'function' && i % 2 === 0) {
          g.vfx.spawnLightning(px, this.groundY - 220, this.groundY, '#ffffff', '#38bdf8');
        }
      }
    }
  }

  /**
   * Raijin Thunder-Drum Wheel Shield projectile deflection:
   * Parries incoming enemy projectiles, converts them to storm_wave, and grants +12 mana.
   */
  deflectNearbyProjectiles(game) {
    const g = game || this.game;
    if (!g || !g.vfx || !Array.isArray(g.vfx.projectiles)) return;
    for (const proj of g.vfx.projectiles) {
      if (proj.owner !== this && !proj.isMeteor) {
        const dx = Math.abs(proj.x - this.x);
        const dy = Math.abs(proj.y - (this.y - 96));
        if (dx < 120 && dy < 110) {
          proj.owner = this;
          proj.vx = -proj.vx * 1.32;
          proj.vy = -6;
          proj.type = 'storm_wave';
          proj.color = '#818cf8';
          proj.coreColor = '#38bdf8';
          this.gainMana(12);
          if (g.audio) g.audio.play('reflect', this.x);
          g.vfx.spawnDamageText(proj.x, proj.y - 28, 0, false, 'RAIJIN PARRY!', '#38bdf8');
          const startA = this.facing === 1 ? -1.35 : Math.PI - 1.35;
          const endA = this.facing === 1 ? 1.35 : Math.PI + 1.35;
          g.vfx.spawnSlash(proj.x, proj.y, 96, startA, endA, '#818cf8', 0.28);
          g.vfx.spawnBurst(proj.x, proj.y, 14, '#38bdf8', 240);
          g.vfx.spawnShockwave(proj.x, proj.y, 84, '#818cf8', 0.26);
          if (g.renderer) g.renderer.triggerShake(6, 0.14);
          break;
        }
      }
    }
  }

  /**
   * CROUCH — Row 7: RAIJIN THUNDER-DRUM PARRY (30 frames)
   * Raises a spinning Raijin Thunder-Drum Wheel Shield (F00..F11) that deflects projectiles,
   * then at t >= 0.38 (F12) unleashes a high-speed low storm_wave counter-slash!
   */
  startCrouch(enemy, game) {
    this.crouchCooldown = 3.0;
    this.crouchDuration = 0.90;
    this.setState('CROUCH');
    this.animSpeed = 0.018;
    this.isCrouching = true;
    this.isDeflecting = true;
    this.crouchFired = false;
    this.reflectedInSkill = false;
    this.vx = 0;

    const g = game || this.game;
    this.deflectNearbyProjectiles(g);
    if (g && g.audio) g.audio.play('reflect', this.x);
    if (g && g.vfx) {
      g.vfx.spawnBurst(this.x + this.facing * 28, this.y - 86, 12, '#818cf8', 185);
      g.vfx.spawnShockwave(this.x, this.groundY - 4, 74, '#38bdf8', 0.26, true);
      g.vfx.spawnGlyphBurst(this.x, this.y - 84, 5, 'storm');
      g.vfx.spawnDamageText(this.x, this.y - 128, 0, false, 'RAIJIN PARRY!', '#38bdf8');
    }
  }

  updateCrouch(dt, enemy, game) {
    const g = game || this.game;
    const t = this.stateTimer;
    const dur = this.crouchDuration || 0.90;
    this.vx *= Math.pow(0.001, dt);
    this.isCrouching = t < dur * 0.82;
    this.isDeflecting = this.isCrouching;
    this.animSpeed = 0.018;

    if (t < 0.64) {
      this.deflectNearbyProjectiles(g);
    }

    // Frames F00..F11 (t < 0.38s): Spinning Raijin Thunder-Drum Wheel Shield
    if (t >= 0.08 && t < 0.38) {
      if (g && g.vfx && Math.random() < 0.74) {
        const a = t * 28;
        const shX = this.x + this.facing * 42;
        const shY = this.y - 86;
        g.vfx.spawnParticle({
          x: shX + Math.cos(a) * 22,
          y: shY + Math.sin(a) * 22,
          vx: -Math.cos(a) * 58,
          vy: -Math.sin(a) * 58,
          size: 4.5,
          color: Math.random() > 0.45 ? '#818cf8' : '#38bdf8',
          maxLife: 0.22
        });
      }
    } else if (t >= 0.38 && !this.crouchFired) {
      // Frame F12 (t >= 0.38s): High-speed low storm_wave counter-slash!
      this.crouchFired = true;
      this.didActionFrame = true;
      this.vx += this.facing * 98;
      if (g && g.audio) g.audio.play('blade_wave', this.x);

      const spawnX = this.x + this.facing * 52;
      const spawnY = this.y - 88;
      if (g && g.vfx) {
        g.vfx.spawnProjectile({
          x: spawnX,
          y: spawnY,
          vx: this.facing * 690,
          vy: 0,
          radius: 22,
          color: '#818cf8',
          coreColor: '#38bdf8',
          owner: this,
          damage: 64,
          type: 'storm_wave'
        });

        const cAng = this.facing === 1 ? 0 : Math.PI;
        g.vfx.spawnSlash(spawnX, spawnY, 102, cAng - 1.15, cAng + 1.15, '#818cf8', 0.28);
        g.vfx.spawnSlash(spawnX, spawnY, 84, cAng - 1.0, cAng + 1.0, '#38bdf8', 0.22);
        g.vfx.spawnShockwave(spawnX, this.groundY - 4, 80, '#38bdf8', 0.26, true);
        g.vfx.spawnGlyphBurst(spawnX, spawnY, 5, 'storm');
      }

      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= this.attackRange + 48) {
        enemy.takeDamage(62, this, true, 120, -75);
      }
    }

    if (t >= dur) {
      this.isCrouching = false;
      this.isDeflecting = false;
      this.setState('IDLE');
    }
  }

  /**
   * JUMP — Row 8: RAIJIN SKY-VAULT (30 frames)
   * Vaults 88px into the air across 320px and fires a downward diagonal storm_wave at apex (u >= 0.48).
   */
  startJump(enemy, game, customDir = null) {
    const g = game || this.game;
    this.dodgeCooldown = this.dodgeMaxCooldown * (0.86 + Math.random() * 0.28);
    this.vaultCooldown = 3.0;
    this.setState('JUMP');
    this.animSpeed = 0.020;
    this.isInvulnerable = true;
    const ww = g?.renderer ? g.renderer.worldWidth : 1200;
    let dir = customDir !== null ? customDir : this.facing;
    if (this.x < 180) dir = 1;
    else if (this.x > ww - 180) dir = -1;
    this.dashDir = dir;
    this.onStartJumpVault(enemy, g, dir);
  }

  onStartJumpVault(enemy, game, dir) {
    const g = game || this.game;
    const ww = g?.renderer ? g.renderer.worldWidth : 1200;
    const dist = enemy ? Math.abs(enemy.x - this.x) : 320;
    this.isFlipVault = true;
    this.flipStartX = this.x;
    this.flipAngle = 0;
    this.dashDuration = 0.60;
    this.jumpDuration = 0.60;
    this.jumpHeight = 88;
    this.jumpShotFired = false;
    this.isDeflecting = true;

    if (enemy && !enemy.isDead) {
      const toEnemy = Math.sign(enemy.x - this.x) || this.facing;
      if (dist > 220) {
        // Vault up to 320px toward enemy flank
        const target = this.x + toEnemy * Math.min(320, Math.max(240, dist - 75));
        this.flipTargetX = Math.max(140, Math.min(ww - 140, target));
        this.dashDir = Math.sign(this.flipTargetX - this.flipStartX) || toEnemy;
      } else {
        const openDir = this.x < 260 ? 1 : this.x > ww - 260 ? -1 : dir;
        this.flipTargetX = Math.max(140, Math.min(ww - 140, this.x + openDir * 320));
        this.dashDir = openDir;
      }
    } else {
      this.flipTargetX = Math.max(140, Math.min(ww - 140, this.x + dir * 320));
      this.dashDir = dir;
    }

    this.spawnLightningEchoes(
      this.flipStartX,
      this.groundY,
      this.flipStartX + this.dashDir * 96,
      this.groundY - 48,
      this.facing,
      4
    );

    this.vx = 0;
    this.vy = 0;
    if (g && g.audio) g.audio.play('storm_leap', this.x);
    if (g && g.vfx) {
      g.vfx.spawnShockwave(this.x, this.groundY, 96, '#818cf8', 0.30, true);
      g.vfx.spawnGlyphBurst(this.x, this.y - 65, 6, 'storm');
      g.vfx.spawnDamageText(this.x, this.y - 136, 0, false, 'RAIJIN SKY-VAULT!', '#38bdf8');
    }
  }

  /**
   * DASH — Row 6: IAIDO FLASH-STEP (30 frames)
   * High-speed lightning dash leaving 4 electric indigo-cyan ghost afterimages.
   */
  onStartDash(enemy, game, dir) {
    const g = game || this.game;
    this.isFlipVault = false;
    this.flipAngle = 0;
    this.dashDuration = 0.40;
    this.animSpeed = 0.012;
    this.isDeflecting = true;
    this.vx = dir * 535;
    this.spawnLightningEchoes(this.x, this.y, this.x + dir * 185, this.y, dir, 4);
    if (g && g.audio) g.audio.play('storm_leap', this.x);
    if (g && g.vfx) {
      g.vfx.spawnShockwave(this.x, this.y - 82, 88, '#818cf8', 0.28, false, true);
      g.vfx.spawnGlyphBurst(this.x, this.y - 86, 6, 'storm');
      g.vfx.spawnDamageText(this.x, this.y - 140, 0, false, 'IAIDO FLASH-STEP!', '#818cf8');
    }
  }

  onStartDodge(enemy, game, dir) {
    const g = game || this.game;
    let hasIncomingProjectile = false;
    if (g && g.vfx && Array.isArray(g.vfx.projectiles)) {
      for (const proj of g.vfx.projectiles) {
        if (
          proj.owner !== this &&
          Math.abs(proj.x - this.x) < 230 &&
          Math.sign(proj.vx) === Math.sign(this.x - proj.x)
        ) {
          hasIncomingProjectile = true;
          break;
        }
      }
    }

    if (hasIncomingProjectile && this.crouchCooldown <= 0) {
      this.startCrouch(enemy, g);
      return;
    }

    const smartDir = enemy && Math.abs(enemy.x - this.x) > 220 ? this.facing : dir;
    this.spawnLightningEchoes(this.x, this.y, this.x + smartDir * 160, this.y, this.facing, 4);
    this.setState('JUMP');
    this.isInvulnerable = true;
    this.onStartJumpVault(enemy, g, smartDir);
  }

  updateDashOrDodge(dt, enemy, game) {
    const g = game || this.game;
    const t = this.stateTimer;

    // Row 8 (30-frame JUMP — Raijin Sky-Vault across 320px & 88px apex lift)
    if ((this.state === 'DODGE' || this.state === 'JUMP') && this.isFlipVault) {
      this.animSpeed = 0.020;
      const u = Math.min(1, t / this.dashDuration);
      const airU = Math.max(0, Math.min(1, (u - 0.10) / 0.76));

      const horizU =
        airU < 0.32
          ? (airU / 0.32) * 0.44
          : airU < 0.68
            ? 0.44 + ((airU - 0.32) / 0.36) * 0.28
            : 0.72 + ((airU - 0.68) / 0.32) * 0.28;
      this.x = this.flipStartX + (this.flipTargetX - this.flipStartX) * horizU;

      // 88px-high Raijin Sky-Vault trajectory with apex hang-time plateau
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
      this.y = this.groundY - liftFrac * 88;
      this.flipAngle = 0;
      this.deflectNearbyProjectiles(g);

      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }

      if (g && g.vfx && airU > 0.05 && airU < 0.95 && Math.random() < 0.78) {
        g.vfx.spawnParticle({
          x: this.x + (Math.random() - 0.5) * 28,
          y: this.y - 72 + (Math.random() - 0.5) * 24,
          vx: -this.dashDir * 76,
          vy: 26,
          size: 5,
          color: Math.random() > 0.4 ? '#818cf8' : '#38bdf8',
          maxLife: 0.25
        });
      }

      // Apex (u >= 0.48): Downward diagonal storm_wave ("RAIJIN SKY-CUT!")
      if (u >= 0.48 && !this.jumpShotFired) {
        this.jumpShotFired = true;
        this.didActionFrame = true;
        if (g && g.audio) g.audio.play('blade_wave', this.x);

        const sx = this.x + this.facing * 44;
        const sy = this.y - 104;
        const dx = enemy ? enemy.x - sx : this.facing * 260;
        const dy = enemy ? enemy.y - 92 - sy : 140;
        const td = Math.hypot(dx, dy) || 1;

        if (g && g.vfx) {
          g.vfx.spawnDamageText(this.x, this.y - 142, 0, false, 'RAIJIN SKY-CUT!', '#38bdf8');
          g.vfx.spawnProjectile({
            x: sx,
            y: sy,
            vx: (dx / td) * 690,
            vy: (dy / td) * 690,
            radius: 22,
            color: '#818cf8',
            coreColor: '#38bdf8',
            owner: this,
            damage: 62,
            type: 'storm_wave'
          });
          const cleaveAng = Math.atan2(dy, dx);
          g.vfx.spawnSlash(sx, sy, 108, cleaveAng - 1.2, cleaveAng + 1.2, '#818cf8', 0.28);
          g.vfx.spawnSlash(sx, sy, 88, cleaveAng - 1.0, cleaveAng + 1.0, '#38bdf8', 0.22);
          g.vfx.spawnShockwave(sx, sy, 82, '#38bdf8', 0.25, false, false);
          g.vfx.spawnGlyphBurst(sx, sy, 6, 'storm');
        }

        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= 170) {
          enemy.takeDamage(56, this, true, 125, -90);
        }
      }

      if (t >= this.dashDuration) {
        this.y = this.groundY;
        this.vy = 0;
        this.isFlipVault = false;
        this.flipAngle = 0;
        this.isDeflecting = false;
        this.isInvulnerable = false;
        if (g && g.vfx) {
          g.vfx.spawnShockwave(this.x, this.groundY, 86, '#818cf8', 0.26, true);
        }
        this.setState('IDLE');
      }
      return;
    }

    // Row 6 (30-frame DASH — Iaido Flash-Step)
    this.animSpeed = 0.012;
    const speed = this.state === 'DASH' ? 535 : 410;
    this.x += this.dashDir * speed * dt;
    this.deflectNearbyProjectiles(g);

    if (g && g.vfx && Math.random() < 0.8) {
      g.vfx.spawnParticle({
        x: this.x - this.dashDir * 20,
        y: this.groundY - 14 - Math.random() * 68,
        vx: -this.dashDir * 120,
        vy: -30,
        size: 5.5,
        color: Math.random() > 0.4 ? '#818cf8' : '#38bdf8',
        maxLife: 0.26
      });
    }

    // Iaido Flash-Step passing slash on enemy
    if (
      this.state === 'DASH' &&
      !this.didActionFrame &&
      enemy &&
      !enemy.isDead &&
      Math.abs(enemy.x - this.x) <= 148
    ) {
      this.didActionFrame = true;
      enemy.takeDamage(50, this, false, 120, -75);
      if (g && g.audio) g.audio.play('slash', enemy.x);
      if (g && g.vfx) {
        g.vfx.spawnSlash(this.x + this.facing * 42, this.y - 96, 106, -1.25, 1.25, '#818cf8', 0.28);
        g.vfx.spawnShockwave(enemy.x, enemy.y - 85, 92, '#38bdf8', 0.26);
        g.vfx.spawnGlyphBurst(enemy.x, enemy.y - 90, 5, 'storm');
      }
    }

    if (t >= this.dashDuration) {
      this.isDeflecting = false;
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  /**
   * Smart Storm-Samurai AI decision layer
   */
  updateAI(dt, enemy, game) {
    if (!enemy || enemy.isDead || (this.state !== 'IDLE' && this.state !== 'WALK')) return false;
    const dist = Math.abs(enemy.x - this.x);
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;

    // 1. Raijin Thunder-Drum Parry (CROUCH) against incoming projectiles or mid-range counter
    let projectileApproaching = false;
    if (game && game.vfx && Array.isArray(game.vfx.projectiles)) {
      for (const proj of game.vfx.projectiles) {
        if (
          proj.owner !== this &&
          Math.abs(proj.x - this.x) < 245 &&
          Math.sign(proj.vx) === Math.sign(this.x - proj.x)
        ) {
          projectileApproaching = true;
          break;
        }
      }
    }
    if (
      this.crouchCooldown <= 0 &&
      (projectileApproaching ||
        (dist >= 190 && dist <= 345 && this.autoCooldown > 0.24 && Math.random() < 0.045))
    ) {
      this.startCrouch(enemy, game);
      return true;
    }

    // 2. Raijin Sky-Vault (Row 8 JUMP) to escape corner pressure or dive-cut mid-far foes (245..415px)
    const pinnedNearWall =
      (this.x < 230 && enemy.x > this.x) || (this.x > ww - 230 && enemy.x < this.x);
    if (
      ((pinnedNearWall && dist < 265) ||
        (dist >= 245 && dist <= 415 && this.skillCooldown > 0.55)) &&
      this.vaultCooldown <= 0 &&
      this.dodgeCooldown <= 0
    ) {
      this.startJump(enemy, game, this.facing);
      return true;
    }

    return false;
  }

  update(dt, enemy, game) {
    this.crouchCooldown = Math.max(0, this.crouchCooldown - dt);
    this.vaultCooldown = Math.max(0, this.vaultCooldown - dt);
    this.stormAvatarTimer = Math.max(0, this.stormAvatarTimer - dt);
    this.activeOdachiTimer = Math.max(0, this.activeOdachiTimer - dt);

    // Sync 30fps animation speeds per state
    if (this.state === 'IDLE') this.animSpeed = 0.042;
    else if (this.state === 'WALK') this.animSpeed = 0.022;
    else if (this.state === 'HURT' || this.state === 'DEATH') this.animSpeed = 0.04;

    // Advance electric indigo-cyan ghost afterimages
    for (let i = this.lightningEchoes.length - 1; i >= 0; i--) {
      const ec = this.lightningEchoes[i];
      ec.life += dt;
      if (ec.life >= ec.maxLife) {
        this.lightningEchoes.splice(i, 1);
      }
    }

    // Advance descending Raijin Sky-Odachis
    for (let i = this.raijinSkyOdachis.length - 1; i >= 0; i--) {
      const od = this.raijinSkyOdachis[i];
      if (od.delay > 0) {
        od.delay = Math.max(0, od.delay - dt);
        continue;
      }
      od.life -= dt;
      if (!od.impacted) {
        od.y += od.vy * dt;
        if (od.y >= od.groundY) {
          od.y = od.groundY;
          od.impacted = true;
        }
      }
      if (od.life <= 0) {
        this.raijinSkyOdachis.splice(i, 1);
      }
    }

    // Advance Coiling Raijin Lightning Dragon-Pillars
    for (let i = this.raijinDragonPillars.length - 1; i >= 0; i--) {
      const dp = this.raijinDragonPillars[i];
      if (dp.delay > 0) {
        dp.delay = Math.max(0, dp.delay - dt);
      } else {
        dp.life -= dt;
        if (dp.life <= 0) {
          this.raijinDragonPillars.splice(i, 1);
        }
      }
    }

    // Advance Colossal Susanoo Storm-God Avatar
    if (this.susanooAvatar) {
      this.susanooAvatar.life -= dt;
      if (this.susanooAvatar.life <= 0) {
        this.susanooAvatar = null;
      }
    }

    // Crackling Raijin Storm Footsteps during WALK
    if (!this.isDead && this.state === 'WALK') {
      this.stepDustTimer += dt;
      if (this.stepDustTimer >= 0.30) {
        this.stepDustTimer = 0;
        if (game && game.audio) game.audio.play('footstep_steel', this.x);
        if (game && game.vfx) {
          game.vfx.spawnBurst(this.x - this.facing * 14, this.groundY - 2, 4, '#818cf8', 68, {
            upBias: 30,
            size: 4,
            life: 0.32,
            additive: true
          });
        }
      }
    }

    if (!this.isDead && this.updateAI(dt, enemy, game)) {
      return;
    }

    super.update(dt, enemy, game);
  }

  /**
   * AUTO_ATTACK — Row 2: THUNDER IAIDO (30 frames)
   * Melee Odachi slash at t >= 0.32 that ALSO fires a fast storm_wave projectile
   * (type: 'storm_wave', color: '#818cf8', coreColor: '#38bdf8', radius: 22, speed: 690).
   * Every 3rd attack (comboStep % 3 === 2) performs an IAIDO FLASH-CUT! that surges forward +70px
   * with lightning afterimages and bonus damage!
   */
  startAutoAttack(enemy, game) {
    this.setState('AUTO_ATTACK');
    this.animSpeed = 0.018;
    this.attackHitDealt = false;
  }

  updateAutoAttack(dt, enemy, game) {
    const g = game || this.game;
    const t = this.stateTimer;
    const mode = this.comboStep % 3;
    this.animSpeed = 0.018;

    if (t < 0.04) {
      this.attackHitDealt = false;
    }

    if (t < 0.32) {
      // Row 2 Frames F00..F09: Coiled Iaido scabbard draw stance with crackling indigo-cyan lightning
      this.torsoAngle = -this.facing * 0.24 * (t / 0.32);
      if (g && g.vfx && Math.random() < 0.62) {
        g.vfx.spawnParticle({
          x: this.x - this.facing * 18 + (Math.random() - 0.5) * 26,
          y: this.y - 102 + (Math.random() - 0.5) * 26,
          vx: this.facing * 52,
          vy: -76,
          size: 5,
          color: mode === 2 ? '#38bdf8' : '#818cf8',
          maxLife: 0.25
        });
      }
    } else if (t < 0.68) {
      // Row 2 Frames F10..F19: Supersonic Odachi Draw-Slash + storm_wave projectile!
      if (!this.didActionFrame) {
        this.didActionFrame = true;
        this.attackHitDealt = true;
        this.comboStep++;

        const ww = g?.renderer ? g.renderer.worldWidth : 1200;
        if (mode === 2) {
          // 3rd Strike: IAIDO FLASH-CUT! Surges forward +70px with 4 lightning afterimages
          const prevX = this.x;
          this.x = Math.max(85, Math.min(ww - 85, this.x + this.facing * 70));
          this.spawnLightningEchoes(prevX, this.y, this.x, this.y, this.facing, 4);
          if (g && g.vfx) {
            g.vfx.spawnDamageText(this.x, this.y - 146, 0, false, 'IAIDO FLASH-CUT!', '#38bdf8');
          }
        }

        this.vx += this.facing * 175;
        this.torsoVel = this.facing * 14;

        const cx = this.x + this.facing * 50;
        const cy = this.y - 96;
        const startA = this.facing === 1 ? -1.72 : Math.PI - 1.05;
        const endA = this.facing === 1 ? 1.15 : Math.PI + 1.72;

        if (g && g.vfx) {
          // Fast storm_wave projectile fired on every Odachi slash
          g.vfx.spawnProjectile({
            x: this.x + this.facing * 56,
            y: this.y - 98,
            vx: this.facing * 690,
            vy: 0,
            radius: 22,
            color: '#818cf8',
            coreColor: '#38bdf8',
            owner: this,
            damage: mode === 2 ? 68 : 46,
            type: 'storm_wave'
          });

          g.vfx.spawnSlash(cx, cy, 126, startA, endA, '#818cf8', 0.30);
          g.vfx.spawnSlash(cx, cy, 104, startA, endA, '#38bdf8', 0.24);
          g.vfx.spawnSlash(cx, cy, 86, startA, endA, '#e0f2fe', 0.18);
          g.vfx.spawnShockwave(cx, this.groundY, 102, '#818cf8', 0.28, true);
          g.vfx.spawnGlyphBurst(cx, cy, 6, 'storm');
        }

        if (g && g.audio) {
          g.audio.play(mode === 2 ? 'blade_wave' : 'slash', this.x);
        }
        if (g && g.renderer) {
          g.renderer.triggerShake(mode === 2 ? 8 : 6, 0.15);
        }

        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= this.attackRange + 55) {
          const isCrit = mode === 2 || Math.random() < 0.26;
          const dmg = mode === 2 ? 96 : mode === 1 ? 80 : 72;
          enemy.takeDamage(dmg, this, isCrit, 120, mode === 2 ? -130 : 0);
          if (g && g.audio) g.audio.play(isCrit ? 'hit_crit' : 'clang', enemy.x);
          if (g && g.renderer) g.renderer.triggerHitStop(0.055);
          if (g && g.vfx) {
            g.vfx.spawnBurst(enemy.x, enemy.y - 96, 16, '#38bdf8', 240);
            g.vfx.spawnGlyphBurst(enemy.x, enemy.y - 96, 5, 'storm');
            if (mode === 2 && typeof g.vfx.spawnLightning === 'function') {
              g.vfx.spawnLightning(enemy.x, this.groundY - 220, this.groundY, '#ffffff', '#818cf8');
            }
          }
        }
      }
    } else if (t >= 0.90) {
      this.setState('IDLE');
    }
  }

  /**
   * SKILL — Row 3: RAIJIN THUNDER-PILLAR (30 frames)
   * Phase 1 (t >= 0.20): Drops a descending Raijin Sky-Odachi (Row 1 of ronin_vfx.png, y = 208) onto the enemy ("RAIJIN STRIKE!").
   * Phase 2 (t >= 0.50): Erupts 3 sequential Coiling Raijin Lightning Dragon-Pillars (Row 2 of ronin_vfx.png, y = 416) across the enemy's position!
   */
  startSkill(enemy, game) {
    this.setState('SKILL');
    this.animSpeed = 0.025;
    this.odachiDropped = false;
    this.pillarsErupted = false;
  }

  updateSkill(dt, enemy, game) {
    const g = game || this.game;
    const t = this.stateTimer;
    const ww = g?.renderer ? g.renderer.worldWidth : 1200;
    this.animSpeed = 0.025;
    this.isDeflecting = t >= 0.06 && t <= 0.82;

    if (t < 0.08) {
      this.odachiDropped = false;
      this.pillarsErupted = false;
      this.torsoAngle = -this.facing * 0.20;
    } else if (t >= 0.20 && !this.odachiDropped) {
      // Phase 1 (t >= 0.20): Descending Raijin Sky-Odachi (Row 1 of ronin_vfx.png, y = 208) onto the enemy!
      this.odachiDropped = true;
      this.didActionFrame = true;
      const targetX = enemy ? enemy.x : this.x + this.facing * 185;
      const odachiX = Math.max(95, Math.min(ww - 95, targetX));
      this.activeOdachiX = odachiX;
      this.activeOdachiTimer = 0.56;

      this.spawnRaijinSkyOdachi(odachiX, 0, false, enemy, g);

      if (g && g.audio) g.audio.play('thunder_slam', odachiX);
      if (g && g.renderer) g.renderer.triggerShake(10, 0.20);
      if (g && g.vfx) {
        g.vfx.spawnShockwave(odachiX, this.groundY, 136, '#818cf8', 0.34, true);
        g.vfx.spawnDecal(odachiX, 98, 'fissure', '#818cf8', 4.2);
        g.vfx.spawnGlyphBurst(odachiX, this.groundY - 70, 7, 'storm');
        g.vfx.spawnDamageText(odachiX, this.groundY - 160, 0, false, 'RAIJIN STRIKE!', '#38bdf8');
      }

      if (enemy && !enemy.isDead && Math.abs(enemy.x - odachiX) <= 165) {
        enemy.takeDamage(42, this, false, -75, -55);
        enemy.vx *= 0.25;
      }
    } else if (t >= 0.50 && !this.pillarsErupted) {
      // Phase 2 (t >= 0.50): Erupts 3 sequential Coiling Raijin Lightning Dragon-Pillars (Row 2 of ronin_vfx.png, y = 416)
      this.pillarsErupted = true;
      this.vx += this.facing * 135;
      const centerX = enemy ? enemy.x : this.activeOdachiX || this.x + this.facing * 165;

      if (g && g.audio) g.audio.play('heavy_cleave', centerX);
      if (g && g.renderer) {
        g.renderer.triggerShake(14, 0.30);
        g.renderer.triggerHitStop(0.06);
      }

      // Erupt 3 sequential Coiling Raijin Lightning Dragon-Pillars across the enemy's position
      this.spawnRaijinPillars(
        centerX - this.facing * 58,
        this.facing,
        3,
        64,
        false,
        enemy,
        g
      );

      if (g && g.vfx) {
        g.vfx.spawnProjectile({
          x: this.x + this.facing * 56,
          y: this.y - 96,
          vx: this.facing * 720,
          vy: 0,
          radius: 24,
          color: '#818cf8',
          coreColor: '#38bdf8',
          owner: this,
          damage: 58,
          type: 'storm_wave'
        });

        const startA = this.facing === 1 ? -1.65 : Math.PI - 1.25;
        const endA = this.facing === 1 ? 1.25 : Math.PI + 1.65;
        g.vfx.spawnSlash(centerX, this.y - 96, 142, startA, endA, '#818cf8', 0.34);
        g.vfx.spawnSlash(centerX, this.y - 96, 116, startA, endA, '#38bdf8', 0.28);
        g.vfx.spawnShockwave(centerX, this.groundY, 185, '#38bdf8', 0.40, true);
        g.vfx.spawnBurst(centerX, this.groundY - 24, 20, '#818cf8', 285, { upBias: 135, size: 7 });
        g.vfx.spawnGlyphBurst(centerX, this.y - 96, 8, 'storm');
        g.vfx.spawnDamageText(centerX, this.groundY - 175, 0, true, 'RAIJIN THUNDER-PILLAR!', '#818cf8');
      }

      if (enemy && !enemy.isDead && Math.abs(enemy.x - centerX) <= 215) {
        enemy.takeDamage(62, this, true, 140, -145);
      }
    } else if (t >= 0.96) {
      this.isDeflecting = false;
      this.setState('IDLE');
    }
  }

  /**
   * ULTIMATE — Row 4: SUSANOO: THOUSAND-BLADE THUNDERSTORM (1.50s duration)
   * Manifests the Colossal Susanoo Storm-God Avatar & Thousand-Blade Slash Ring
   * (Row 3 y = 624 and Row 4 y = 832 of ronin_vfx.png) in drawUltimateForeground(ctx, renderer),
   * striking at t = 0.08, t = 0.52, and t = 0.96 ("SUSANOO: THOUSAND BLADES!")
   * and erupting 5 Raijin Lightning Pillars across the stage!
   */
  startUltimate(enemy, game) {
    this.setState('ULTIMATE');
    this.animSpeed = 0.040;
    this.ultStrike1 = false;
    this.ultStrike2 = false;
    this.ultStrike3 = false;
    this.ultStage = 0;
    this.stormAvatarTimer = 1.50;
  }

  updateUltimate(dt, enemy, game) {
    const g = game || this.game;
    const t = this.stateTimer;
    const ww = g?.renderer ? g.renderer.worldWidth : 1200;
    const targetX = enemy ? enemy.x : Math.max(180, Math.min(ww - 180, this.x + this.facing * 220));
    this.vx = 0;
    this.vy = 0;
    this.y = this.groundY;
    this.animSpeed = 0.040;
    this.isInvulnerable = t < 1.25;
    this.isDeflecting = t < 1.45;

    if (t < 0.04 && this.ultStage === 0) {
      this.ultStage = 1;
      this.ultStrike1 = false;
      this.ultStrike2 = false;
      this.ultStrike3 = false;
      this.stormAvatarTimer = 1.50;
      this.susanooAvatar = {
        x: this.x,
        y: this.groundY,
        facing: this.facing,
        life: 1.50,
        maxLife: 1.50,
        slashProgress: 0
      };
    }

    if (this.susanooAvatar) {
      this.susanooAvatar.x = this.x;
      this.susanooAvatar.facing = this.facing;
      this.susanooAvatar.slashProgress = Math.min(1, t / 1.15);
    }

    // STRIKE 1 (t >= 0.08s): Manifest Colossal Susanoo Storm-God Avatar & First Thousand-Blade Tempest Cleave!
    if (t >= 0.08 && !this.ultStrike1) {
      this.ultStrike1 = true;
      if (!this.susanooAvatar) {
        this.susanooAvatar = {
          x: this.x,
          y: this.groundY,
          facing: this.facing,
          life: 1.50,
          maxLife: 1.50,
          slashProgress: 0.1
        };
      }
      this.spawnRaijinSkyOdachi(targetX, 0, true, enemy, g);
      if (g && g.audio) g.audio.play('thunder_slam', targetX);
      if (g && g.renderer) g.renderer.triggerShake(15, 0.25);

      if (g && g.vfx) {
        const sA = this.facing === 1 ? -1.85 : Math.PI - 1.35;
        const eA = this.facing === 1 ? 1.35 : Math.PI + 1.85;
        g.vfx.spawnSlash(targetX, this.groundY - 102, 164, sA, eA, '#818cf8', 0.36);
        g.vfx.spawnSlash(targetX, this.groundY - 102, 132, sA, eA, '#38bdf8', 0.30);
        g.vfx.spawnShockwave(targetX, this.groundY, 195, '#818cf8', 0.38, true);
        g.vfx.spawnGlyphBurst(targetX, this.groundY - 92, 8, 'storm');
        g.vfx.spawnDamageText(targetX, this.groundY - 185, 0, false, 'SUSANOO: THOUSAND BLADES!', '#38bdf8');
      }

      if (enemy && !enemy.isDead) {
        enemy.takeDamage(38, this, false, 65, -55);
      }
    }

    // STRIKE 2 (t >= 0.52s): Second Susanoo Cross-Tempest & Twin Sky-Odachi Barrage!
    if (t >= 0.52 && !this.ultStrike2) {
      this.ultStrike2 = true;
      const dir = enemy ? Math.sign(enemy.x - this.x) || this.facing : this.facing;
      this.spawnLightningEchoes(this.x, this.groundY, targetX - dir * 80, this.groundY, dir, 4);
      this.spawnRaijinSkyOdachi(targetX - 65, 0, true, enemy, g);
      this.spawnRaijinSkyOdachi(targetX + 65, 0.04, true, enemy, g);

      if (g && g.audio) g.audio.play('blade_wave', targetX);
      if (g && g.renderer) g.renderer.triggerShake(18, 0.30);

      if (g && g.vfx) {
        g.vfx.spawnProjectile({
          x: this.x + this.facing * 58,
          y: this.groundY - 96,
          vx: this.facing * 720,
          vy: 0,
          radius: 25,
          color: '#818cf8',
          coreColor: '#38bdf8',
          owner: this,
          damage: 32,
          type: 'storm_wave',
          isUltimate: true
        });
        g.vfx.spawnSlash(targetX, this.groundY - 108, 178, -2.1, 1.4, '#38bdf8', 0.36);
        g.vfx.spawnSlash(targetX, this.groundY - 108, 152, Math.PI - 1.4, Math.PI + 2.1, '#818cf8', 0.32);
        g.vfx.spawnShockwave(targetX, this.groundY, 225, '#38bdf8', 0.44, true);
        g.vfx.spawnDamageText(targetX, this.groundY - 198, 0, true, 'SUSANOO: THOUSAND BLADES!', '#818cf8');
      }

      if (enemy && !enemy.isDead) {
        enemy.takeDamage(44, this, true, 85, -80);
      }
    }

    // STRIKE 3 (t >= 0.96s): Final Thousand-Blade Thunderstorm Finisher & 5 Raijin Lightning Pillars across the stage!
    if (t >= 0.96 && !this.ultStrike3) {
      this.ultStrike3 = true;
      const slamX = this.x + this.facing * 64;

      if (g && g.audio) g.audio.play('earthshatter', slamX);
      if (g && g.renderer) {
        g.renderer.triggerShake(26, 0.56);
        g.renderer.triggerAberration(15);
        g.renderer.triggerHitStop(0.09);
      }

      // Erupt 5 Raijin Lightning Dragon-Pillars across the stage!
      this.spawnRaijinPillars(
        this.x + this.facing * 68,
        this.facing,
        5,
        82,
        true,
        enemy,
        g
      );

      if (g && g.vfx) {
        const sA = this.facing === 1 ? -1.85 : Math.PI - 1.45;
        const eA = this.facing === 1 ? 1.45 : Math.PI + 1.85;
        g.vfx.spawnSlash(slamX, this.groundY - 98, 184, sA, eA, '#818cf8', 0.44);
        g.vfx.spawnSlash(slamX, this.groundY - 98, 152, sA, eA, '#38bdf8', 0.38);

        [0, 1].forEach((idx) => {
          g.vfx.spawnProjectile({
            x: slamX + this.facing * (idx * 36),
            y: this.groundY - 98 - idx * 22,
            vx: this.facing * (750 - idx * 80),
            vy: 0,
            radius: 24 - idx * 2,
            color: idx === 0 ? '#818cf8' : '#38bdf8',
            coreColor: '#e0f2fe',
            owner: this,
            damage: 26,
            type: 'storm_wave',
            isUltimate: true
          });
        });

        g.vfx.spawnShockwave(slamX, this.groundY, 330, '#818cf8', 0.60, true);
        g.vfx.spawnShockwave(targetX, this.groundY, 265, '#38bdf8', 0.52, true);
        g.vfx.spawnDecal(slamX, 210, 'fissure', '#818cf8', 6.2);
        g.vfx.spawnDecal(targetX, 185, 'fissure', '#38bdf8', 5.8);
        g.vfx.spawnBurst(slamX, this.groundY - 22, 34, '#818cf8', 400, { upBias: 180, size: 8 });
        g.vfx.spawnBurst(targetX, this.groundY - 22, 26, '#38bdf8', 340, { upBias: 150, size: 7 });
        g.vfx.spawnGlyphBurst(slamX, this.groundY - 82, 12, 'storm');
        g.vfx.spawnDamageText(slamX, this.groundY - 215, 0, true, 'SUSANOO: THOUSAND BLADES!', '#38bdf8');
      }

      if (enemy && !enemy.isDead) {
        enemy.takeDamage(106, this, true, 210, -280);
      }
      this.heal(32, 'STORM FOCUS');
    }

    if (t >= 1.50) {
      this.isInvulnerable = false;
      this.isDeflecting = false;
      this.susanooAvatar = null;
      this.ultStage = 0;
      this.setState('IDLE');
    }
  }

  /**
   * Renders 4 electric indigo-cyan ghost afterimages (this.lightningEchoes) via PixelForge.drawGhostFrame
   */
  drawLightningEchoes(ctx) {
    if (!this.lightningEchoes || !this.lightningEchoes.length) return;
    const sprites = this.getSprites();
    if (!sprites || !sprites.sheet) return;

    for (const ec of this.lightningEchoes) {
      const fade = Math.max(0, 1 - ec.life / ec.maxLife);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(Math.round(ec.x), Math.round(ec.y));
      ctx.scale(ec.facing || this.facing, 1);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * 0.48;
      if (sprites.sheet.complete && sprites.sheet.naturalWidth) {
        const col = (ec.frameIdx || 184) % 30;
        const row = Math.floor((ec.frameIdx || 184) / 30);
        ctx.drawImage(sprites.sheet, col * 208, row * 208, 208, 208, -104, -202, 208, 208);
      }
      PixelForge.drawGhostFrame(ctx, sprites, ec.frameIdx || 184, 208, 208);
      ctx.restore();
    }
  }

  /**
   * Renders descending Raijin Sky-Odachis from Row 1 (sy = 208) of ronin_vfx.png
   */
  drawRaijinSkyOdachis(ctx, renderer = null) {
    const vfxSheet = this.getSprites()?.vfx;
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;

    const list =
      this.raijinSkyOdachis.length > 0
        ? this.raijinSkyOdachis
        : this.activeOdachiTimer > 0
          ? [
              {
                x: this.activeOdachiX || this.x + this.facing * 120,
                y: this.groundY,
                groundY: this.groundY,
                impacted: true,
                life: this.activeOdachiTimer,
                maxLife: 0.56
              }
            ]
          : [];
    if (!list.length) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (const od of list) {
      if (od.delay > 0 || od.life <= 0) continue;
      const fade = Math.min(1, od.life * 3.8);
      const elapsed = od.maxLife - od.life;
      const col = !od.impacted
        ? Math.min(11, Math.floor(elapsed * 36) % 12)
        : Math.min(29, 12 + Math.floor(Math.min(1, elapsed / Math.max(0.1, od.maxLife)) * 17));
      const ox = Math.round(od.x);
      const oy = Math.round(od.y ?? this.groundY);
      const sz = 196;

      ctx.save();
      ctx.translate(ox, oy);
      if (renderer) {
        ctx.globalCompositeOperation = 'lighter';
        if (renderer.glowCyan) {
          ctx.globalAlpha = fade * 0.52;
          ctx.drawImage(renderer.glowCyan, -sz * 0.85, -sz * 0.95, sz * 1.7, sz * 1.4);
        }
        if (renderer.glowViolet) {
          ctx.globalAlpha = fade * 0.40;
          ctx.drawImage(renderer.glowViolet, -sz * 0.65, -sz * 0.85, sz * 1.3, sz * 1.1);
        }
      }

      const dx = Math.round(-sz * 0.5);
      const dy = Math.round(-sz * 0.84);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * 0.34;
      ctx.drawImage(vfxSheet, col * 208, 208, 208, 208, dx - 8, dy - 8, sz + 16, sz + 16);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = fade * 0.98;
      ctx.drawImage(vfxSheet, col * 208, 208, 208, 208, dx, dy, sz, sz);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * 0.28;
      ctx.drawImage(vfxSheet, col * 208, 208, 208, 208, dx, dy, sz, sz);
      ctx.restore();
    }
    ctx.restore();
  }

  /**
   * Renders Coiling Raijin Lightning Dragon-Pillars from Row 2 (sy = 416) of ronin_vfx.png
   */
  drawRaijinDragonPillars(ctx, renderer = null) {
    if (!this.raijinDragonPillars.length) return;
    const vfxSheet = this.getSprites()?.vfx;
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (const dp of this.raijinDragonPillars) {
      if (dp.delay > 0 || dp.life <= 0) continue;
      const elapsed = dp.maxLife - dp.life;
      const pop = Math.min(1, elapsed / 0.14);
      const fade = Math.min(1, dp.life * 3.0);
      const col = Math.min(29, Math.max(0, Math.floor((elapsed / dp.maxLife) * 30)));
      const px = Math.round(dp.x);
      const py = Math.round(dp.groundY ?? this.groundY);

      ctx.save();
      ctx.beginPath();
      ctx.rect(px - 125, py - 270, 250, 278);
      ctx.clip();

      const drawW = Math.round(dp.width * 3.8);
      const drawH = Math.round(dp.height * 1.44 * pop);
      ctx.translate(px, py + 10);
      ctx.rotate((dp.tilt || 0) * 0.15);

      if (renderer && renderer.glowCyan) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade * 0.44;
        ctx.drawImage(renderer.glowCyan, -drawW * 0.85, -drawH * 0.95, drawW * 1.7, drawH * 1.3);
      }

      const dx = Math.round(-drawW * 0.5);
      const dy = Math.round(-drawH);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * 0.32;
      ctx.drawImage(vfxSheet, col * 208, 416, 208, 208, dx - 6, dy - 6, drawW + 12, drawH + 12);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = fade * 0.96;
      ctx.drawImage(vfxSheet, col * 208, 416, 208, 208, dx, dy, drawW, drawH);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * 0.26;
      ctx.drawImage(vfxSheet, col * 208, 416, 208, 208, dx, dy, drawW, drawH);
      ctx.restore();
    }
    ctx.restore();
  }

  /**
   * Renders the Colossal Susanoo Storm-God Avatar (Row 3, y = 624)
   * and Thousand-Blade Slash Ring (Row 4, y = 832) of ronin_vfx.png
   */
  drawSusanooAvatar(ctx, renderer = null) {
    if (!this.susanooAvatar && this.stormAvatarTimer <= 0 && this.state !== 'ULTIMATE') return;
    const vfxSheet = this.getSprites()?.vfx;
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;

    const maxLife = this.susanooAvatar?.maxLife || 1.50;
    const remLife = this.susanooAvatar ? this.susanooAvatar.life : this.stormAvatarTimer || 1.0;
    const elapsed = Math.max(0, maxLife - remLife);
    const rise = Math.min(1, elapsed / 0.22);
    const fade = Math.min(1, remLife * 3.2);
    const col = Math.min(29, Math.max(0, Math.floor((elapsed / maxLife) * 30)));
    const ax = Math.round(this.x - this.facing * 16);
    const ay = Math.round(this.groundY);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Thousand-Blade Slash Ring (Row 4, sy = 832) spinning around Kaze-Maru
    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(ay - 22));
    ctx.scale(1, 0.42);
    const ringSz = 276;
    const rHalf = Math.round(-ringSz * 0.5);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fade * 0.64;
    ctx.drawImage(vfxSheet, col * 208, 832, 208, 208, rHalf, rHalf, ringSz, ringSz);
    ctx.restore();

    // 2. Colossal Susanoo Storm-God Avatar (Row 3, sy = 624) manifesting above Kaze-Maru
    ctx.beginPath();
    ctx.rect(ax - 290, ay - 430, 580, 436);
    ctx.clip();

    const drawSize = 324;
    const riseY = Math.round((1 - rise) * 185);
    const floatBob = Math.round(Math.sin(elapsed * 7.2) * 5);

    ctx.translate(ax, ay - drawSize * 0.5 + 12 + riseY + floatBob);
    ctx.scale(this.facing, 1);

    if (renderer) {
      ctx.globalCompositeOperation = 'lighter';
      if (renderer.glowCyan) {
        ctx.globalAlpha = fade * 0.58;
        ctx.drawImage(renderer.glowCyan, -220, -220, 440, 440);
      }
      if (renderer.glowViolet) {
        ctx.globalAlpha = fade * 0.46;
        ctx.drawImage(renderer.glowViolet, -185, -185, 370, 370);
      }
    }

    const dHalf = Math.round(-drawSize * 0.5);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fade * 0.38;
    ctx.drawImage(vfxSheet, col * 208, 624, 208, 208, dHalf - 10, dHalf - 10, drawSize + 20, drawSize + 20);

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = fade * 0.94;
    ctx.drawImage(vfxSheet, col * 208, 624, 208, 208, dHalf, dHalf, drawSize, drawSize);

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fade * 0.30;
    ctx.drawImage(vfxSheet, col * 208, 624, 208, 208, dHalf, dHalf, drawSize, drawSize);

    ctx.restore();
  }

  /**
   * Background skill & afterimage pass (rendered BEHIND the fighters)
   */
  drawForegroundOverlay(ctx, renderer = null) {
    this._drewOverlayThisFrame = true;
    this.drawLightningEchoes(ctx);
    this.drawRaijinDragonPillars(ctx, renderer);
    this.drawRaijinSkyOdachis(ctx, renderer);
  }

  /**
   * Foreground Ultimate pass (rendered IN FRONT of all fighters!)
   * Manifests the Colossal Susanoo Storm-God Avatar & Thousand-Blade Slash Ring (Row 3 y = 624 and Row 4 y = 832 of ronin_vfx.png)
   */
  drawUltimateForeground(ctx, renderer = null) {
    this.drawSusanooAvatar(ctx, renderer);
    if (this.state === 'ULTIMATE') {
      this.drawRaijinDragonPillars(ctx, renderer);
      this.drawRaijinSkyOdachis(ctx, renderer);
    }
  }

  draw(ctx, isReflection = false, renderer = null) {
    if (typeof super.draw === 'function') {
      super.draw(ctx, isReflection, renderer);
    }

    const sprites = this.getSprites();
    if (!sprites) return;

    if (!isReflection) {
      if (!this._drewOverlayThisFrame) {
        this.drawLightningEchoes(ctx);
        this.drawRaijinDragonPillars(ctx, renderer);
        this.drawRaijinSkyOdachis(ctx, renderer);
      }
      this._drewOverlayThisFrame = false;
    }

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const w = 208;
    const h = 208;
    const frameIdx = PixelForge.getFrameIndex(this, this.walkPhase);

    ctx.translate(Math.round(this.x), Math.round(this.y));
    ctx.scale(this.facing, 1);

    // Dynamic Pixel-Art Raijin Indigo-Cyan Speed-Streaks during Ultimate / Skill
    if (!isReflection && (this.state === 'ULTIMATE' || this.state === 'SKILL')) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const t = this.stateTimer;
      for (let i = 0; i < 6; i++) {
        const sy = -152 + i * 22 + (((t * 60 + i * 7) | 0) % 6) * 2;
        const sx = -90 - ((i * 19 + ((t * 180) | 0)) % 48);
        const sw = 28 + (i % 3) * 14;
        ctx.fillStyle = i % 2 === 0 ? '#818cf8' : '#38bdf8';
        ctx.globalAlpha = 0.65;
        ctx.fillRect(sx, sy, sw, 4);
      }
      ctx.restore();
    }

    PixelForge.drawSheetFrame(ctx, sprites, this, w, h, this.walkPhase, isReflection, renderer);

    if (this.hitFlash > 0 && !isReflection) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5;
      PixelForge.drawGhostFrame(ctx, sprites, frameIdx, w, h);
    }

    ctx.restore();
  }
}
