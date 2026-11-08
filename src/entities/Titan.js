import { Fighter } from './Fighter.js';
import { PixelForge } from '../engine/PixelForge.js';

export class Titan extends Fighter {
  constructor(x, groundY, facing = 1) {
    const isBool = typeof facing === 'boolean';
    const dir = isBool ? (facing ? 1 : -1) : facing || 1;
    super({
      name: isBool && !facing ? 'Torgar (Shadow)' : 'Torgar',
      x,
      groundY,
      facing: dir,
      maxHp: 1390,
      attackRange: 162,
      moveSpeed: 158,
      autoInterval: 1.16,
      lightColor: 'rgba(245, 158, 11, 1)',
      primaryColor: '#f59e0b'
    });

    this.heroId = 'titan';
    this.theme = 'forge';
    this.primaryColor = '#f59e0b'; // Molten Forge Amber-Gold
    this.secondaryColor = '#10b981'; // Runic Emerald-Jade
    this.deathSfx = 'death_warrior';
    this.hasPoise = true; // Heavy Runic Juggernaut poise resists ranged knockback

    // Specification & engine stat properties
    this.speed = 235;
    this.attackCooldownMax = 0.88;
    this.skillName = 'MOUNTAIN ANVIL';
    this.skillMaxCooldown = 4.8;
    this.skillCooldownMax = 4.8;
    this.skillDuration = 0.98;
    this.skillTriggerRange = 460;
    this.ultName = 'WORLD-FORGE RAGNAROK';

    this.dashSpeed = 680;
    this.dashDuration = 0.42;
    this.dashMaxCooldown = 2.8;
    this.dashCooldownMax = 2.6;
    this.dodgeMaxCooldown = 3.2;

    // 30fps animation speed tracking
    this.animSpeed = 0.045;
    this.comboStep = 0;
    this.stepDustTimer = 0;

    // Custom state properties for Mountain Anvil, Bulwark Crouch, Meteor Leap & Ragnarok Ultimate
    this.anvilDropped = false;
    this.anvilSmashed = false;
    this.activeAnvilX = 0;
    this.activeAnvilTimer = 0;
    this.ultSlam1 = false;
    this.ultSlam2 = false;
    this.ultSlam3 = false;
    this.ultStage = 0;
    this.forgeArmorTimer = 0;
    this.forgeAvatarTimer = 0;

    this.crouchCooldown = 0;
    this.crouchDuration = 0.92;
    this.crouchFired = false;
    this.isCrouching = false;
    this.isDeflecting = false;
    this.reflectedInSkill = false;

    this.vaultCooldown = 0;
    this.isFlipVault = false;
    this.flipStartX = x;
    this.flipTargetX = x;
    this.flipAngle = 0;
    this.jumpDuration = 0.62;
    this.jumpHeight = 86;
    this.jumpShotFired = false;
    this.attackHitDealt = false;

    // Bespoke 30fps HD-2D Runic Titan-Forger Visual Systems (rendered from titan_vfx.png)
    this.runicAnvils = []; // Row 1: Descending & Ground-Planted Runic Forge Anvils
    this.basaltMonoliths = []; // Row 2: Erupting Volcanic Basalt & Emerald-Jade Monoliths
    this.ragnarokAvatar = null; // Row 3 & Row 4: Colossal Ragnarok Titan Avatar & Nordic Forge-Wheel Seal
    this.vfxSheet = null;
    this._drewOverlayThisFrame = false;
  }

  getSprites() {
    const assets = PixelForge.initAssets();
    if (!assets.titan && typeof Image !== 'undefined') {
      const loadImg = (src, onLoad) => {
        const img = new Image();
        img.decoding = 'async';
        if (onLoad) img.onload = () => onLoad(img);
        img.src = src;
        return img;
      };
      assets.titan = {
        sheet: loadImg('assets/sprites/titan_sheet.png?v=30fps10'),
        vfx: loadImg('assets/sprites/titan_vfx.png?v=30fps10'),
        portrait: loadImg('assets/sprites/titan_portrait.png?v=2', () => PixelForge.refreshPortraits())
      };
    }
    if (assets.titan?.vfx) {
      this.vfxSheet = assets.titan.vfx;
    }
    return assets.titan;
  }

  getEffectiveAttackRange() {
    // Every 3rd tectonic hammer slam unleashes a long-range Magma-Jade Forge-Wave up to 430px
    return this.comboStep % 3 === 2 ? 430 : this.attackRange;
  }

  /**
   * Spawns Volcanic Basalt & Jade-Rune Monoliths (Row 2 of titan_vfx.png) + engine crystalSpikes
   */
  spawnBasaltMonoliths(originX, dir, count, spacing, isUltimate, enemy, game) {
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    for (let i = 0; i < count; i++) {
      const mx = Math.max(90, Math.min(ww - 90, originX + dir * (i * spacing)));
      const height = 128 + (i % 2 === 0 ? 44 : 20) + (isUltimate ? 22 : 0);
      const width = 42 + (i % 2) * 8;
      const delay = i * 0.04;
      const maxLife = isUltimate ? 1.05 : 0.84;

      this.basaltMonoliths.push({
        x: mx,
        groundY: this.groundY,
        height,
        width,
        tilt: dir * (0.18 + i * 0.03),
        delay,
        life: maxLife,
        maxLife,
        isUltimate
      });

      if (game && game.vfx && typeof game.vfx.spawnCrystalSpike === 'function') {
        game.vfx.spawnCrystalSpike({
          x: mx,
          groundY: this.groundY,
          height,
          width,
          tilt: dir * (0.22 + i * 0.035),
          color: i % 2 === 0 ? '#f59e0b' : '#10b981',
          coreColor: '#fef08a',
          owner: this,
          target: enemy,
          damage: isUltimate ? 18 : 16,
          delay,
          maxLife,
          isUltimate
        });
      }
    }
  }

  /**
   * Iron-Anvil Bulwark projectile deflection: parries incoming enemy projectiles,
   * converts them into superheated Forge-Waves, and grants +12 Overdrive Mana.
   */
  deflectNearbyProjectiles(game) {
    if (!game || !game.vfx || !Array.isArray(game.vfx.projectiles)) return;
    for (const proj of game.vfx.projectiles) {
      if (proj.owner !== this && !proj.isMeteor) {
        const dx = Math.abs(proj.x - this.x);
        const dy = Math.abs(proj.y - (this.y - 96));
        if (dx < 118 && dy < 108) {
          proj.owner = this;
          proj.vx = -proj.vx * 1.28;
          proj.vy = -6;
          proj.type = 'forge_wave';
          proj.color = '#f59e0b';
          proj.coreColor = '#10b981';
          this.gainMana(12);
          if (game.audio) game.audio.play('reflect', this.x);
          game.vfx.spawnDamageText(proj.x, proj.y - 28, 0, false, 'ANVIL PARRY!', '#fbbf24');
          const startA = this.facing === 1 ? -1.3 : Math.PI - 1.3;
          const endA = this.facing === 1 ? 1.3 : Math.PI + 1.3;
          game.vfx.spawnSlash(proj.x, proj.y, 94, startA, endA, '#f59e0b', 0.28);
          game.vfx.spawnBurst(proj.x, proj.y, 14, '#f59e0b', 240);
          game.vfx.spawnShockwave(proj.x, proj.y, 82, '#10b981', 0.26);
          if (game.renderer) game.renderer.triggerShake(6, 0.14);
          break;
        }
      }
    }
  }

  /**
   * CROUCH — Iron-Anvil Bulwark & Magma-Quake Counter (Row 7, 30 frames)
   */
  startCrouch(enemy, game) {
    this.crouchCooldown = 3.1;
    this.crouchDuration = 0.92;
    this.setState('CROUCH');
    this.animSpeed = 0.018;
    this.isCrouching = true;
    this.isDeflecting = true;
    this.crouchFired = false;
    this.reflectedInSkill = false;
    this.forgeArmorTimer = Math.max(this.forgeArmorTimer, 0.56);
    this.vx = 0;

    const g = game || this.game;
    this.deflectNearbyProjectiles(g);
    if (g && g.audio) g.audio.play('reflect', this.x);
    if (g && g.vfx) {
      g.vfx.spawnBurst(this.x + this.facing * 28, this.y - 86, 12, '#f59e0b', 180);
      g.vfx.spawnShockwave(this.x, this.groundY - 4, 72, '#f59e0b', 0.26, true);
      g.vfx.spawnGlyphBurst(this.x, this.y - 82, 5, 'forge');
      g.vfx.spawnDamageText(this.x, this.y - 128, 0, false, 'ANVIL BULWARK!', '#fbbf24');
    }
  }

  updateCrouch(dt, enemy, game) {
    const g = game || this.game;
    const t = this.stateTimer;
    const dur = this.crouchDuration || 0.92;
    this.vx *= Math.pow(0.001, dt);
    this.isCrouching = t < dur * 0.82;
    this.isDeflecting = this.isCrouching;
    this.animSpeed = 0.018;

    if (t < 0.64) {
      this.deflectNearbyProjectiles(g);
    }

    // Frames F04..F10 (0.12s <= t < 0.34s): Bracing behind glowing Runic Anvil-Guard
    if (t >= 0.12 && t < 0.34) {
      if (g && g.vfx && Math.random() < 0.72) {
        const a = t * 24;
        const shX = this.x + this.facing * 42;
        const shY = this.y - 84;
        g.vfx.spawnParticle({
          x: shX + Math.cos(a) * 20,
          y: shY + Math.sin(a) * 20,
          vx: -Math.cos(a) * 55,
          vy: -Math.sin(a) * 55,
          size: 4.5,
          color: Math.random() > 0.45 ? '#f59e0b' : '#10b981',
          maxLife: 0.22
        });
      }
    } else if (t >= 0.34 && !this.crouchFired) {
      // Frame F11 (t = 0.34s): Low rolling Magma-Quake Wave projectile & molten hammer cleave!
      this.crouchFired = true;
      this.didActionFrame = true;
      this.vx += this.facing * 92;
      if (g && g.audio) g.audio.play('heavy_cleave', this.x);

      const spawnX = this.x + this.facing * 52;
      const spawnY = this.y - 88;
      if (g && g.vfx) {
        g.vfx.spawnProjectile({
          x: spawnX,
          y: spawnY,
          vx: this.facing * 620,
          vy: 0,
          radius: 22,
          color: '#f59e0b',
          coreColor: '#10b981',
          owner: this,
          damage: 64,
          type: 'forge_wave'
        });

        const cAng = this.facing === 1 ? 0 : Math.PI;
        g.vfx.spawnSlash(spawnX, spawnY, 98, cAng - 1.15, cAng + 1.15, '#f59e0b', 0.28);
        g.vfx.spawnSlash(spawnX, spawnY, 82, cAng - 1.0, cAng + 1.0, '#10b981', 0.22);
        g.vfx.spawnShockwave(spawnX, this.groundY - 4, 78, '#fbbf24', 0.26, true);
        g.vfx.spawnGlyphBurst(spawnX, spawnY, 5, 'forge');
      }

      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= this.attackRange + 45) {
        enemy.takeDamage(62, this, true, 125, -75);
      }
    }

    if (t >= dur) {
      this.isCrouching = false;
      this.isDeflecting = false;
      this.setState('IDLE');
    }
  }

  /**
   * JUMP — Meteor Forge-Leap & Aerial Hammer Dunk (Row 8, 30 frames)
   */
  startJump(enemy, game, customDir = null) {
    const g = game || this.game;
    this.dodgeCooldown = this.dodgeMaxCooldown * (0.86 + Math.random() * 0.28);
    this.vaultCooldown = 3.1;
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
    const dist = enemy ? Math.abs(enemy.x - this.x) : 280;
    this.isFlipVault = true;
    this.flipStartX = this.x;
    this.flipAngle = 0;
    this.dashDuration = 0.62;
    this.jumpDuration = 0.62;
    this.jumpHeight = 86;
    this.jumpShotFired = false;
    this.isDeflecting = true;

    if (enemy && !enemy.isDead) {
      const toEnemy = Math.sign(enemy.x - this.x) || this.facing;
      if (dist > 205) {
        // Aggressive Meteor Forge-Leap closing toward the enemy's flank
        const target = enemy.x - toEnemy * 92;
        this.flipTargetX = Math.max(140, Math.min(ww - 140, target));
        this.dashDir = Math.sign(this.flipTargetX - this.flipStartX) || toEnemy;
      } else {
        // Tactical Forge-Vault out of corner pressure
        const openDir = this.x < 260 ? 1 : this.x > ww - 260 ? -1 : dir;
        this.flipTargetX = Math.max(140, Math.min(ww - 140, this.x + openDir * 265));
        this.dashDir = openDir;
      }
    } else {
      this.flipTargetX = Math.max(140, Math.min(ww - 140, this.x + dir * 265));
      this.dashDir = dir;
    }

    this.vx = 0;
    this.vy = 0;
    if (g && g.audio) g.audio.play('storm_leap', this.x);
    if (g && g.vfx) {
      g.vfx.spawnShockwave(this.x, this.groundY, 96, '#f59e0b', 0.30, true);
      g.vfx.spawnGlyphBurst(this.x, this.y - 65, 6, 'forge');
      g.vfx.spawnDamageText(this.x, this.y - 136, 0, false, 'METEOR FORGE-LEAP!', '#f59e0b');
    }
  }

  onStartDash(enemy, game, dir) {
    const g = game || this.game;
    this.isFlipVault = false;
    this.flipAngle = 0;
    this.dashDuration = 0.42;
    this.animSpeed = 0.011;
    this.isDeflecting = true;
    this.vx = dir * 495;
    if (g && g.audio) g.audio.play('storm_leap', this.x);
    if (g && g.vfx) {
      g.vfx.spawnShockwave(this.x, this.y - 80, 88, '#f59e0b', 0.28, false, true);
      g.vfx.spawnGlyphBurst(this.x, this.y - 85, 6, 'forge');
      g.vfx.spawnDamageText(this.x, this.y - 140, 0, false, 'MOLTEN STAMPEDE!', '#f59e0b');
    }
  }

  onStartDodge(enemy, game, dir) {
    const g = game || this.game;
    let hasIncomingProjectile = false;
    if (g && g.vfx) {
      for (const proj of g.vfx.projectiles) {
        if (
          proj.owner !== this &&
          Math.abs(proj.x - this.x) < 225 &&
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

    const smartDir = enemy && Math.abs(enemy.x - this.x) > 215 ? this.facing : dir;
    this.setState('JUMP');
    this.isInvulnerable = true;
    this.onStartJumpVault(enemy, g, smartDir);
  }

  updateDashOrDodge(dt, enemy, game) {
    const g = game || this.game;
    const t = this.stateTimer;

    // Row 8 (30-frame JUMP — Meteor Forge-Leap & Apex Aerial Hammer Dunk)
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

      // 86px-high Meteor Forge-Leap trajectory with apex hang-time plateau for two-handed overhead Hammer Dunk
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
      this.deflectNearbyProjectiles(g);

      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }

      if (g && g.vfx && airU > 0.05 && airU < 0.95 && Math.random() < 0.78) {
        g.vfx.spawnParticle({
          x: this.x + (Math.random() - 0.5) * 28,
          y: this.y - 72 + (Math.random() - 0.5) * 24,
          vx: -this.dashDir * 72,
          vy: 28,
          size: 5,
          color: Math.random() > 0.4 ? '#f59e0b' : '#10b981',
          maxLife: 0.26
        });
      }

      // Apex (Frame F14..F15, u >= 0.46): Aerial World-Breaker Hammer Dunk + Downward Tectonic Forge-Wave!
      if (u >= 0.46 && !this.jumpShotFired) {
        this.jumpShotFired = true;
        this.didActionFrame = true;
        if (g && g.audio) g.audio.play('thunder_slam', this.x);

        const sx = this.x + this.facing * 44;
        const sy = this.y - 102;
        const dx = enemy ? enemy.x - sx : this.facing * 260;
        const dy = enemy ? enemy.y - 92 - sy : 140;
        const td = Math.hypot(dx, dy) || 1;

        if (g && g.vfx) {
          g.vfx.spawnProjectile({
            x: sx,
            y: sy,
            vx: (dx / td) * 680,
            vy: (dy / td) * 680,
            radius: 22,
            color: '#f59e0b',
            coreColor: '#10b981',
            owner: this,
            damage: 60,
            type: 'forge_wave'
          });
          const cleaveAng = Math.atan2(dy, dx);
          g.vfx.spawnSlash(sx, sy, 108, cleaveAng - 1.2, cleaveAng + 1.2, '#fbbf24', 0.30);
          g.vfx.spawnSlash(sx, sy, 88, cleaveAng - 1.0, cleaveAng + 1.0, '#10b981', 0.24);
          g.vfx.spawnShockwave(sx, sy, 82, '#f59e0b', 0.26, false, false);
          g.vfx.spawnGlyphBurst(sx, sy, 6, 'forge');
        }

        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= 165) {
          enemy.takeDamage(56, this, true, 130, -95);
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
          g.vfx.spawnShockwave(this.x, this.groundY, 88, '#f59e0b', 0.28, true);
        }
        this.setState('IDLE');
      }
      return;
    }

    // Row 6 (30-frame DASH — Molten Juggernaut Stampede)
    this.animSpeed = 0.011;
    const speed = this.state === 'DASH' ? 495 : 370;
    this.x += this.dashDir * speed * dt;
    this.deflectNearbyProjectiles(g);

    if (g && g.vfx && Math.random() < 0.78) {
      g.vfx.spawnParticle({
        x: this.x - this.dashDir * 20,
        y: this.groundY - 12 - Math.random() * 68,
        vx: -this.dashDir * 115,
        vy: -32,
        size: 6,
        color: Math.random() > 0.4 ? '#f59e0b' : '#10b981',
        maxLife: 0.28
      });
    }

    // Molten Juggernaut Ramming Collision once per dash
    if (
      this.state === 'DASH' &&
      !this.didActionFrame &&
      enemy &&
      !enemy.isDead &&
      Math.abs(enemy.x - this.x) <= 145
    ) {
      this.didActionFrame = true;
      enemy.takeDamage(52, this, false, 135, -85);
      if (g && g.audio) g.audio.play('heavy_cleave', enemy.x);
      if (g && g.vfx) {
        g.vfx.spawnSlash(this.x + this.facing * 42, this.y - 96, 102, -1.2, 1.2, '#f59e0b', 0.28);
        g.vfx.spawnShockwave(enemy.x, enemy.y - 85, 98, '#10b981', 0.28);
        g.vfx.spawnGlyphBurst(enemy.x, enemy.y - 90, 5, 'forge');
      }
    }

    if (t >= this.dashDuration) {
      this.isDeflecting = false;
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  /**
   * Smart Juggernaut AI decision layer
   */
  updateAI(dt, enemy, game) {
    if (!enemy || enemy.isDead || (this.state !== 'IDLE' && this.state !== 'WALK')) return false;
    const dist = Math.abs(enemy.x - this.x);
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;

    // 1. Defensive Iron-Anvil Bulwark (CROUCH) when enemy projectiles approach or mid-range counter
    let projectileApproaching = false;
    if (game && game.vfx) {
      for (const proj of game.vfx.projectiles) {
        if (
          proj.owner !== this &&
          Math.abs(proj.x - this.x) < 240 &&
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
        (dist >= 190 && dist <= 335 && this.autoCooldown > 0.25 && Math.random() < 0.045))
    ) {
      this.startCrouch(enemy, game);
      return true;
    }

    // 2. Meteor Forge-Leap (Row 8 JUMP) to escape corner pressure or dunk on mid-far foes (245..410px)
    const pinnedNearWall =
      (this.x < 230 && enemy.x > this.x) || (this.x > ww - 230 && enemy.x < this.x);
    if (
      ((pinnedNearWall && dist < 260) ||
        (dist >= 245 && dist <= 410 && this.skillCooldown > 0.6)) &&
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
    this.forgeArmorTimer = Math.max(0, this.forgeArmorTimer - dt);
    this.forgeAvatarTimer = Math.max(0, this.forgeAvatarTimer - dt);
    this.activeAnvilTimer = Math.max(0, this.activeAnvilTimer - dt);

    // Sync 30fps animation speeds per state
    if (this.state === 'IDLE') this.animSpeed = 0.045;
    else if (this.state === 'WALK') this.animSpeed = 0.024;
    else if (this.state === 'HURT' || this.state === 'DEATH') this.animSpeed = 0.04;

    // Advance active Runic Anvils
    for (let i = this.runicAnvils.length - 1; i >= 0; i--) {
      const av = this.runicAnvils[i];
      if (av.delay > 0) {
        av.delay = Math.max(0, av.delay - dt);
        continue;
      }
      av.life -= dt;
      if (!av.impacted) {
        av.y += av.vy * dt;
        if (av.y >= av.groundY) {
          av.y = av.groundY;
          av.impacted = true;
        }
      }
      if (av.life <= 0) {
        this.runicAnvils.splice(i, 1);
      }
    }

    // Advance erupting Volcanic Basalt & Jade Monoliths
    for (let i = this.basaltMonoliths.length - 1; i >= 0; i--) {
      const bm = this.basaltMonoliths[i];
      if (bm.delay > 0) {
        bm.delay = Math.max(0, bm.delay - dt);
      } else {
        bm.life -= dt;
        if (bm.life <= 0) {
          this.basaltMonoliths.splice(i, 1);
        }
      }
    }

    // Advance Colossal Ragnarok World-Forge Titan Avatar
    if (this.ragnarokAvatar) {
      this.ragnarokAvatar.life -= dt;
      if (this.ragnarokAvatar.life <= 0) {
        this.ragnarokAvatar = null;
      }
    }

    // Heavy Molten-Shod Footstep Thuds & Forge Sparks during WALK
    if (!this.isDead && this.state === 'WALK') {
      this.stepDustTimer += dt;
      if (this.stepDustTimer >= 0.33) {
        this.stepDustTimer = 0;
        if (game && game.audio) game.audio.play('footstep_steel', this.x);
        if (game && game.vfx) {
          game.vfx.spawnBurst(this.x - this.facing * 14, this.groundY - 2, 5, '#f59e0b', 70, {
            upBias: 32,
            size: 4,
            life: 0.34,
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
   * AUTO_ATTACK — Tectonic Hammer Quake (Row 2, 30 frames)
   */
  startAutoAttack(enemy, game) {
    this.setState('AUTO_ATTACK');
    this.animSpeed = 0.0185;
    this.attackHitDealt = false;
  }

  updateAutoAttack(dt, enemy, game) {
    const g = game || this.game;
    const t = this.stateTimer;
    const mode = this.comboStep % 3;
    this.animSpeed = 0.0185;

    if (t < 0.04) {
      this.attackHitDealt = false;
    }

    if (t < 0.32) {
      // Row 2 Frames F00..F10: Heavy two-handed War-Hammer windup with molten gold & jade runes
      this.torsoAngle = -this.facing * 0.25 * (t / 0.32);
      if (g && g.vfx && Math.random() < 0.6) {
        g.vfx.spawnParticle({
          x: this.x - this.facing * 20 + (Math.random() - 0.5) * 28,
          y: this.y - 108 + (Math.random() - 0.5) * 28,
          vx: this.facing * 48,
          vy: -78,
          size: 5,
          color: mode === 2 ? '#10b981' : '#f59e0b',
          maxLife: 0.26
        });
      }
    } else if (t < 0.68) {
      // Row 2 Frames F11..F18: Crushing Earth-Slam & Tectonic Forge-Wave!
      if (!this.didActionFrame) {
        this.didActionFrame = true;
        this.attackHitDealt = true;
        this.comboStep++;
        this.vx += this.facing * 160;
        this.torsoVel = this.facing * 14;

        const cx = this.x + this.facing * 52;
        const cy = this.y - 94;
        const startA = this.facing === 1 ? -1.7 : Math.PI - 1.05;
        const endA = this.facing === 1 ? 1.15 : Math.PI + 1.7;

        if (g && g.vfx) {
          // Ground-hugging Tectonic Forge-Wave projectile
          g.vfx.spawnProjectile({
            x: this.x + this.facing * 56,
            y: this.y - 98,
            vx: this.facing * (mode === 2 ? 650 : 540),
            vy: 0,
            radius: mode === 2 ? 24 : 20,
            color: '#f59e0b',
            coreColor: '#10b981',
            owner: this,
            damage: mode === 2 ? 68 : 44,
            type: 'forge_wave'
          });

          if (mode === 2) {
            g.vfx.spawnDamageText(this.x, this.y - 146, 0, false, 'TECTONIC QUAKE!', '#fbbf24');
            this.spawnBasaltMonoliths(
              this.x + this.facing * 115,
              this.facing,
              2,
              68,
              false,
              enemy,
              g
            );
          }

          g.vfx.spawnSlash(cx, cy, 122, startA, endA, '#f59e0b', 0.32);
          g.vfx.spawnSlash(cx, cy, 102, startA, endA, '#fbbf24', 0.26);
          g.vfx.spawnSlash(cx, cy, 84, startA, endA, '#10b981', 0.20);
          g.vfx.spawnShockwave(cx, this.groundY, 104, '#fbbf24', 0.30, true);
          g.vfx.spawnDecal(cx, 96, 'fissure', '#f59e0b', 4.0);
          g.vfx.spawnGlyphBurst(cx, cy, 6, 'forge');
        }

        if (g && g.audio) {
          g.audio.play(mode === 2 ? 'thunder_slam' : 'heavy_cleave', this.x);
        }
        if (g && g.renderer) {
          g.renderer.triggerShake(7, 0.16);
        }

        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= this.attackRange + 52) {
          const isCrit = mode === 2 || Math.random() < 0.26;
          const dmg = mode === 2 ? 94 : mode === 1 ? 82 : 74;
          enemy.takeDamage(dmg, this, isCrit, 125, mode === 2 ? -135 : 0);
          if (g && g.audio) g.audio.play(isCrit ? 'hit_crit' : 'clang', enemy.x);
          if (g && g.renderer) g.renderer.triggerHitStop(0.06);
          if (g && g.vfx) {
            g.vfx.spawnBurst(enemy.x, enemy.y - 95, 16, '#fbbf24', 240);
            g.vfx.spawnGlyphBurst(enemy.x, enemy.y - 95, 5, 'forge');
          }
        }
      }
    } else if (t >= 0.94) {
      this.setState('IDLE');
    }
  }

  /**
   * SKILL — Anvil of the Mountain King (MOUNTAIN ANVIL, Row 3, 30 frames)
   * Phase 1 (~F09): Summons a colossal Runic Forge Anvil Sky-Strike in front of Torgar that pins/staggers foes.
   * Phase 2 (~F18): Torgar baseball-smashes the planted Anvil with his War-Hammer, launching a superheated
   *                 Runic Anvil Shockwave across the arena + erupting 3 Volcanic Basalt & Jade Monoliths!
   */
  startSkill(enemy, game) {
    this.setState('SKILL');
    this.animSpeed = 0.026;
    this.anvilDropped = false;
    this.anvilSmashed = false;
  }

  updateSkill(dt, enemy, game) {
    const g = game || this.game;
    const t = this.stateTimer;
    const ww = g?.renderer ? g.renderer.worldWidth : 1200;
    this.animSpeed = 0.026;
    this.isDeflecting = t >= 0.06 && t <= 0.82;

    if (t < 0.08) {
      this.anvilDropped = false;
      this.anvilSmashed = false;
      this.torsoAngle = -this.facing * 0.20;
    } else if (t >= 0.22 && !this.anvilDropped) {
      // Phase 1 (~F09): Summon Colossal Runic Forge Anvil Sky-Strike in front of Torgar!
      this.anvilDropped = true;
      this.didActionFrame = true;
      const anvilX = Math.max(105, Math.min(ww - 105, this.x + this.facing * 96));
      this.activeAnvilX = anvilX;
      this.activeAnvilTimer = 0.56;

      this.runicAnvils.push({
        x: anvilX,
        y: this.groundY - 220,
        groundY: this.groundY,
        vy: 1850,
        delay: 0,
        impacted: false,
        shattered: false,
        life: 0.62,
        maxLife: 0.62
      });

      if (g && g.audio) g.audio.play('clang', anvilX);
      if (g && g.renderer) g.renderer.triggerShake(10, 0.20);
      if (g && g.vfx) {
        g.vfx.spawnSkyStrike({
          x: anvilX,
          y: -180,
          groundY: this.groundY,
          vx: 0,
          vy: 1650,
          type: 'runic_anvil',
          color: '#f59e0b',
          coreColor: '#10b981',
          owner: this,
          target: enemy,
          damage: 0,
          delay: 0,
          maxLinger: 0.45
        });
        g.vfx.spawnShockwave(anvilX, this.groundY, 130, '#f59e0b', 0.34, true);
        g.vfx.spawnDecal(anvilX, 95, 'fissure', '#f59e0b', 4.2);
        g.vfx.spawnGlyphBurst(anvilX, this.groundY - 65, 7, 'forge');
        g.vfx.spawnDamageText(anvilX, this.groundY - 155, 0, false, 'MOUNTAIN ANVIL!', '#fbbf24');
      }

      if (enemy && !enemy.isDead && Math.abs(enemy.x - anvilX) <= 155) {
        enemy.takeDamage(38, this, false, -85, -45);
        // Pin/pull enemy near the Runic Anvil for the follow-up War-Hammer smash
        enemy.vx *= 0.25;
      }
    } else if (t >= 0.52 && !this.anvilSmashed) {
      // Phase 2 (~F18): War-Hammer Baseball Smash into the summoned Runic Anvil!
      this.anvilSmashed = true;
      this.vx += this.facing * 145;
      const smashX = this.activeAnvilX || this.x + this.facing * 88;

      for (const av of this.runicAnvils) {
        av.shattered = true;
        av.life = Math.min(av.life, 0.18);
      }
      this.activeAnvilTimer = 0.14;

      if (g && g.audio) g.audio.play('thunder_slam', smashX);
      if (g && g.renderer) {
        g.renderer.triggerShake(15, 0.32);
        g.renderer.triggerHitStop(0.06);
      }

      if (g && g.vfx) {
        // Superheated Runic Anvil Shockwave tearing across the arena
        g.vfx.spawnProjectile({
          x: smashX,
          y: this.y - 96,
          vx: this.facing * 760,
          vy: 0,
          radius: 28,
          color: '#fbbf24',
          coreColor: '#10b981',
          owner: this,
          damage: 64,
          type: 'forge_wave'
        });

        const startA = this.facing === 1 ? -1.65 : Math.PI - 1.25;
        const endA = this.facing === 1 ? 1.25 : Math.PI + 1.65;
        g.vfx.spawnSlash(smashX, this.y - 96, 146, startA, endA, '#fbbf24', 0.34);
        g.vfx.spawnSlash(smashX, this.y - 96, 118, startA, endA, '#10b981', 0.28);
        g.vfx.spawnShockwave(smashX, this.groundY, 195, '#f59e0b', 0.42, true);
        g.vfx.spawnBurst(smashX, this.groundY - 24, 22, '#fbbf24', 295, { upBias: 135, size: 7 });
        g.vfx.spawnGlyphBurst(smashX, this.y - 96, 8, 'forge');
        g.vfx.spawnDamageText(smashX, this.groundY - 170, 0, true, 'ANVIL SHATTER!', '#10b981');
      }

      // Erupt 3 Volcanic Basalt & Jade-Rune Monoliths forward from the shattered anvil
      this.spawnBasaltMonoliths(
        smashX + this.facing * 45,
        this.facing,
        3,
        68,
        false,
        enemy,
        g
      );

      if (enemy && !enemy.isDead && Math.abs(enemy.x - smashX) <= 210) {
        enemy.takeDamage(58, this, true, 145, -145);
      }
    } else if (t >= 0.98) {
      this.isDeflecting = false;
      this.setState('IDLE');
    }
  }

  /**
   * ULTIMATE — Ragnarok: World-Forge Eruption (WORLD-FORGE RAGNAROK, Row 4, 30 frames)
   * Summons the towering Colossal Ragnarok Titan Avatar (Row 3 of titan_vfx.png) & Nordic Forge-Wheel Seal (Row 4),
   * delivering 3 escalating cataclysmic War-Hammer slams across the battlefield!
   */
  startUltimate(enemy, game) {
    this.setState('ULTIMATE');
    this.animSpeed = 0.041;
    this.ultSlam1 = false;
    this.ultSlam2 = false;
    this.ultSlam3 = false;
    this.ultStage = 0;
    this.forgeAvatarTimer = 1.60;
    this.forgeArmorTimer = 1.60;
  }

  updateUltimate(dt, enemy, game) {
    const g = game || this.game;
    const t = this.stateTimer;
    const ww = g?.renderer ? g.renderer.worldWidth : 1200;
    this.vx = 0;
    this.vy = 0;
    this.y = this.groundY;
    this.animSpeed = 0.041;
    this.isInvulnerable = t < 1.25;
    this.isDeflecting = t < 1.48;

    if (t < 0.05 && this.ultStage === 0) {
      this.ultStage = 1;
      this.ultSlam1 = false;
      this.ultSlam2 = false;
      this.ultSlam3 = false;
      this.forgeAvatarTimer = 1.58;
      this.forgeArmorTimer = 1.58;
      this.ragnarokAvatar = {
        x: this.x,
        y: this.groundY,
        facing: this.facing,
        life: 1.56,
        maxLife: 1.56,
        slamProgress: 0
      };
      if (g && g.audio) g.audio.play('earthshatter', this.x);
      if (g && g.renderer) g.renderer.triggerShake(14, 0.25);
    }

    if (this.ragnarokAvatar) {
      this.ragnarokAvatar.x = this.x;
      this.ragnarokAvatar.facing = this.facing;
      this.ragnarokAvatar.slamProgress = Math.min(1, t / 1.15);
    }

    // SLAM 1 (~F09..F11, t >= 0.28s): Seismic War-Hammer Slam I + 4 Volcanic Basalt & Jade Monoliths
    if (t >= 0.28 && !this.ultSlam1) {
      this.ultSlam1 = true;
      const slamX = this.x + this.facing * 58;
      if (g && g.audio) g.audio.play('thunder_slam', slamX);
      if (g && g.renderer) g.renderer.triggerShake(14, 0.24);

      if (g && g.vfx) {
        const sA = this.facing === 1 ? -1.75 : Math.PI - 1.35;
        const eA = this.facing === 1 ? 1.35 : Math.PI + 1.75;
        g.vfx.spawnSlash(slamX, this.groundY - 96, 152, sA, eA, '#f59e0b', 0.36);
        g.vfx.spawnSlash(slamX, this.groundY - 96, 124, sA, eA, '#10b981', 0.30);
        g.vfx.spawnShockwave(slamX, this.groundY, 185, '#f59e0b', 0.38, true);
        g.vfx.spawnDecal(slamX, 135, 'fissure', '#f59e0b', 5.2);
        g.vfx.spawnGlyphBurst(slamX, this.groundY - 88, 8, 'forge');
        g.vfx.spawnDamageText(slamX, this.groundY - 175, 0, false, 'WORLD-FORGE I!', '#f59e0b');
      }

      this.spawnBasaltMonoliths(
        this.x + this.facing * 75,
        this.facing,
        4,
        74,
        true,
        enemy,
        g
      );

      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= 340) {
        enemy.takeDamage(38, this, false, 65, -55);
      }
    }

    // SLAM 2 (~F17..F19, t >= 0.62s): Seismic War-Hammer Slam II + 3 Heaven-Dropped Runic Forge Anvils + Blazing Forge-Wave
    if (t >= 0.62 && !this.ultSlam2) {
      this.ultSlam2 = true;
      const slamX = this.x + this.facing * 64;
      if (g && g.audio) g.audio.play('heavy_cleave', slamX);
      if (g && g.renderer) g.renderer.triggerShake(18, 0.30);

      for (let i = 0; i < 3; i++) {
        const ax = Math.max(95, Math.min(ww - 95, this.x + this.facing * (110 + i * 105)));
        this.runicAnvils.push({
          x: ax,
          y: this.groundY - 260 - i * 45,
          groundY: this.groundY,
          vy: 1950,
          delay: i * 0.05,
          impacted: false,
          shattered: false,
          life: 0.68,
          maxLife: 0.68
        });
        if (g && g.vfx) {
          g.vfx.spawnSkyStrike({
            x: ax,
            y: -210,
            groundY: this.groundY,
            vx: 0,
            vy: 1750,
            type: 'runic_anvil',
            color: '#fbbf24',
            coreColor: '#10b981',
            owner: this,
            target: enemy,
            damage: 14,
            delay: i * 0.05,
            maxLinger: 0.55,
            isUltimate: true
          });
        }
      }

      if (g && g.vfx) {
        g.vfx.spawnProjectile({
          x: slamX,
          y: this.groundY - 96,
          vx: this.facing * 720,
          vy: 0,
          radius: 26,
          color: '#fbbf24',
          coreColor: '#10b981',
          owner: this,
          damage: 32,
          type: 'forge_wave',
          isUltimate: true
        });
        g.vfx.spawnShockwave(slamX, this.groundY, 225, '#10b981', 0.44, true);
        g.vfx.spawnDamageText(slamX, this.groundY - 195, 0, true, 'ANVIL RAIN II!', '#10b981');
      }

      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= 440) {
        enemy.takeDamage(44, this, true, 85, -80);
      }
    }

    // SLAM 3 (~F24..F26, t >= 0.98s): Cataclysmic World-Breaker Plunge & Full-Arena World-Forge Eruption!
    if (t >= 0.98 && !this.ultSlam3) {
      this.ultSlam3 = true;
      const slamX = this.x + this.facing * 68;
      const targetX = enemy ? enemy.x : this.x + this.facing * 240;

      if (g && g.audio) g.audio.play('earthshatter', slamX);
      if (g && g.renderer) {
        g.renderer.triggerShake(28, 0.62);
        g.renderer.triggerAberration(16);
        g.renderer.triggerHitStop(0.095);
      }

      // Erupt 6 Towering Volcanic Basalt & Jade-Rune Monoliths across the arena!
      this.spawnBasaltMonoliths(
        this.x + this.facing * 64,
        this.facing,
        6,
        78,
        true,
        enemy,
        g
      );

      if (g && g.vfx) {
        const sA = this.facing === 1 ? -1.85 : Math.PI - 1.45;
        const eA = this.facing === 1 ? 1.45 : Math.PI + 1.85;
        g.vfx.spawnSlash(slamX, this.groundY - 98, 176, sA, eA, '#fbbf24', 0.44);
        g.vfx.spawnSlash(slamX, this.groundY - 98, 144, sA, eA, '#10b981', 0.38);

        // Twin superheated Forge-Waves tearing across the stage
        [0, 1].forEach((idx) => {
          g.vfx.spawnProjectile({
            x: slamX + this.facing * (idx * 36),
            y: this.groundY - 98 - idx * 24,
            vx: this.facing * (760 - idx * 85),
            vy: 0,
            radius: 26 - idx * 3,
            color: idx === 0 ? '#f59e0b' : '#10b981',
            coreColor: '#fef08a',
            owner: this,
            damage: 26,
            type: 'forge_wave',
            isUltimate: true
          });
        });

        g.vfx.spawnShockwave(slamX, this.groundY, 340, '#fbbf24', 0.62, true);
        g.vfx.spawnShockwave(targetX, this.groundY, 270, '#10b981', 0.54, true);
        g.vfx.spawnDecal(slamX, 220, 'fissure', '#f59e0b', 6.5);
        g.vfx.spawnDecal(targetX, 190, 'fissure', '#10b981', 6.0);
        g.vfx.spawnBurst(slamX, this.groundY - 22, 36, '#f59e0b', 410, { upBias: 185, size: 9 });
        g.vfx.spawnBurst(targetX, this.groundY - 22, 28, '#10b981', 350, { upBias: 150, size: 8 });
        g.vfx.spawnGlyphBurst(slamX, this.groundY - 80, 12, 'forge');
        g.vfx.spawnDamageText(slamX, this.groundY - 215, 0, true, 'WORLD-FORGE RAGNAROK!', '#fde047');
      }

      if (enemy && !enemy.isDead) {
        enemy.takeDamage(108, this, true, 215, -290);
      }
      this.heal(34, 'FORGE TEMPER');
    }

    if (t >= 1.56) {
      this.isInvulnerable = false;
      this.isDeflecting = false;
      this.ragnarokAvatar = null;
      this.ultStage = 0;
      this.setState('IDLE');
    }
  }

  /**
   * Renders Erupting Volcanic Basalt & Jade-Rune Monoliths from Row 2 (sy = 416) of titan_vfx.png
   */
  drawBasaltMonoliths(ctx, renderer = null) {
    if (!this.basaltMonoliths.length) return;
    const vfxSheet = this.getSprites()?.vfx;
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (const bm of this.basaltMonoliths) {
      if (bm.delay > 0 || bm.life <= 0) continue;
      const elapsed = bm.maxLife - bm.life;
      const pop = Math.min(1, elapsed / 0.14);
      const fade = Math.min(1, bm.life * 3.0);
      const col = Math.min(29, Math.max(0, Math.floor((elapsed / bm.maxLife) * 30)));
      const bx = Math.round(bm.x);
      const by = Math.round(bm.groundY ?? this.groundY);

      ctx.save();
      ctx.beginPath();
      ctx.rect(bx - 120, by - 260, 240, 268);
      ctx.clip();

      const drawW = Math.round(bm.width * 3.8);
      const drawH = Math.round(bm.height * 1.42 * pop);
      ctx.translate(bx, by + 10);
      ctx.rotate((bm.tilt || 0) * 0.16);

      if (renderer && renderer.glowOrange) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade * 0.42;
        ctx.drawImage(renderer.glowOrange, -drawW * 0.85, -drawH * 0.95, drawW * 1.7, drawH * 1.3);
      }

      const dx = Math.round(-drawW * 0.5);
      const dy = Math.round(-drawH);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * 0.30;
      ctx.drawImage(vfxSheet, col * 208, 416, 208, 208, dx - 6, dy - 6, drawW + 12, drawH + 12);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = fade * 0.96;
      ctx.drawImage(vfxSheet, col * 208, 416, 208, 208, dx, dy, drawW, drawH);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * 0.24;
      ctx.drawImage(vfxSheet, col * 208, 416, 208, 208, dx, dy, drawW, drawH);
      ctx.restore();
    }
    ctx.restore();
  }

  /**
   * Renders the Mountain King's Runic Forge Anvil from Row 1 (sy = 208) of titan_vfx.png
   */
  drawRunicAnvils(ctx, renderer = null) {
    const vfxSheet = this.getSprites()?.vfx;
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;

    // If activeAnvilTimer > 0 without an entry in runicAnvils, synthesize one for direct state inspection
    const list =
      this.runicAnvils.length > 0
        ? this.runicAnvils
        : this.activeAnvilTimer > 0
          ? [
              {
                x: this.activeAnvilX || this.x + this.facing * 95,
                y: this.groundY,
                groundY: this.groundY,
                impacted: true,
                shattered: false,
                life: this.activeAnvilTimer,
                maxLife: 0.56
              }
            ]
          : [];
    if (!list.length) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (const av of list) {
      if (av.delay > 0 || av.life <= 0) continue;
      const fade = Math.min(1, av.life * 3.8);
      const elapsed = av.maxLife - av.life;
      const col = !av.impacted
        ? Math.min(11, Math.floor(elapsed * 36) % 12)
        : Math.min(25, 12 + Math.floor(Math.min(1, elapsed / Math.max(0.1, av.maxLife)) * 14));
      const ax = Math.round(av.x);
      const ay = Math.round(av.y ?? this.groundY);
      const sz = av.shattered ? 204 : 188;

      ctx.save();
      ctx.translate(ax, ay);
      if (renderer) {
        ctx.globalCompositeOperation = 'lighter';
        if (renderer.glowGold) {
          ctx.globalAlpha = fade * 0.52;
          ctx.drawImage(renderer.glowGold, -sz * 0.85, -sz * 0.95, sz * 1.7, sz * 1.4);
        }
        if (renderer.glowEmerald) {
          ctx.globalAlpha = fade * 0.38;
          ctx.drawImage(renderer.glowEmerald, -sz * 0.65, -sz * 0.85, sz * 1.3, sz * 1.1);
        }
      }

      const dx = Math.round(-sz * 0.5);
      const dy = Math.round(-sz * 0.82);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * 0.32;
      ctx.drawImage(vfxSheet, col * 208, 208, 208, 208, dx - 8, dy - 8, sz + 16, sz + 16);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = fade * 0.98;
      ctx.drawImage(vfxSheet, col * 208, 208, 208, 208, dx, dy, sz, sz);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * 0.26;
      ctx.drawImage(vfxSheet, col * 208, 208, 208, 208, dx, dy, sz, sz);
      ctx.restore();
    }
    ctx.restore();
  }

  /**
   * Renders the Towering Colossal Ragnarok World-Forge Titan Avatar (Row 3, sy = 624)
   * and Rotating Nordic Forge-Wheel Seal (Row 4, sy = 832) behind Torgar during WORLD-FORGE RAGNAROK!
   */
  drawForgeAvatar(ctx, renderer = null) {
    if (!this.ragnarokAvatar && this.forgeAvatarTimer <= 0 && this.state !== 'ULTIMATE') return;
    const vfxSheet = this.getSprites()?.vfx;
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;

    const maxLife = this.ragnarokAvatar?.maxLife || 1.56;
    const remLife = this.ragnarokAvatar ? this.ragnarokAvatar.life : this.forgeAvatarTimer || 1.0;
    const elapsed = Math.max(0, maxLife - remLife);
    const rise = Math.min(1, elapsed / 0.24);
    const fade = Math.min(1, remLife * 3.2);
    const col = Math.min(29, Math.max(0, Math.floor((elapsed / maxLife) * 30)));
    const ax = Math.round(this.x - this.facing * 18);
    const ay = Math.round(this.groundY);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Rotating Nordic Forge-Wheel Seal at Torgar's feet / backdrop (Row 4, sy = 4 * 208 = 832)
    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(ay - 18));
    ctx.scale(1, 0.38);
    const wheelSz = 264;
    const wHalf = Math.round(-wheelSz * 0.5);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fade * 0.58;
    ctx.drawImage(vfxSheet, col * 208, 832, 208, 208, wHalf, wHalf, wheelSz, wheelSz);
    ctx.restore();

    // 2. Towering Colossal Ragnarok World-Forge Titan Avatar looming behind Torgar (Row 3, sy = 3 * 208 = 624)
    ctx.beginPath();
    ctx.rect(ax - 280, ay - 420, 560, 426);
    ctx.clip();

    const drawSize = 312;
    const riseY = Math.round((1 - rise) * 190);
    const floatBob = Math.round(Math.sin(elapsed * 7.0) * 5);

    ctx.translate(ax, ay - drawSize * 0.5 + 12 + riseY + floatBob);
    ctx.scale(this.facing, 1);

    if (renderer) {
      ctx.globalCompositeOperation = 'lighter';
      if (renderer.glowOrange) {
        ctx.globalAlpha = fade * 0.58;
        ctx.drawImage(renderer.glowOrange, -220, -220, 440, 440);
      }
      if (renderer.glowEmerald) {
        ctx.globalAlpha = fade * 0.42;
        ctx.drawImage(renderer.glowEmerald, -180, -180, 360, 360);
      }
    }

    const dHalf = Math.round(-drawSize * 0.5);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fade * 0.36;
    ctx.drawImage(vfxSheet, col * 208, 624, 208, 208, dHalf - 10, dHalf - 10, drawSize + 20, drawSize + 20);

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = fade * 0.94;
    ctx.drawImage(vfxSheet, col * 208, 624, 208, 208, dHalf, dHalf, drawSize, drawSize);

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fade * 0.28;
    ctx.drawImage(vfxSheet, col * 208, 624, 208, 208, dHalf, dHalf, drawSize, drawSize);

    ctx.restore();
  }

  /**
   * Background skill & Ultimate pass (rendered BEHIND the fighters so the Towering Ragnarok Avatar,
   * Mountain Anvil, and Basalt Monoliths frame the duel without obscuring faces!)
   */
  drawForegroundOverlay(ctx, renderer = null) {
    this._drewOverlayThisFrame = true;
    this.worldForgeAvatar = this.ragnarokAvatar;
    this.drawForgeAvatar(ctx, renderer);
    if (!this.game || !this.game.vfx) {
      this.drawBasaltMonoliths(ctx, renderer);
      this.drawRunicAnvils(ctx, renderer);
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
        this.worldForgeAvatar = this.ragnarokAvatar;
        this.drawForgeAvatar(ctx, renderer);
        if (!this.game || !this.game.vfx) {
          this.drawBasaltMonoliths(ctx, renderer);
          this.drawRunicAnvils(ctx, renderer);
        }
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

    // Dynamic Pixel-Art Molten Forge & Jade-Rune Speed-Streaks during Ultimate / Skill
    if (!isReflection && (this.state === 'ULTIMATE' || this.state === 'SKILL')) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const t = this.stateTimer;
      for (let i = 0; i < 6; i++) {
        const sy = -152 + i * 22 + (((t * 60 + i * 7) | 0) % 6) * 2;
        const sx = -90 - ((i * 19 + ((t * 180) | 0)) % 48);
        const sw = 28 + (i % 3) * 14;
        ctx.fillStyle = i % 2 === 0 ? '#f59e0b' : '#10b981';
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
