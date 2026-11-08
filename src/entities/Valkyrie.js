import { Fighter } from './Fighter.js';
import { PixelForge } from '../engine/PixelForge.js';

export class Valkyrie extends Fighter {
  constructor(x, groundY, facing = 1) {
    const isBool = typeof facing === 'boolean';
    const dir = isBool ? (facing ? 1 : -1) : facing || 1;
    super({
      name: 'Freyja',
      x,
      groundY,
      facing: dir,
      maxHp: 1290,
      attackRange: 175,
      moveSpeed: 178,
      autoInterval: 0.98,
      lightColor: 'rgba(244, 63, 94, 1)',
      primaryColor: '#f43f5e'
    });

    this.heroId = 'valkyrie';
    this.theme = 'crimson';
    this.primaryColor = '#f43f5e'; // Dragonfire Ruby-Crimson
    this.secondaryColor = '#fbbf24'; // Imperial Valhalla Gold
    this.lightColor = 'rgba(244, 63, 94, 1)';
    this.deathSfx = 'death_priestess';
    this.hasPoise = true; // Crimson Dragon-Valkyrie Poise resists ranged knockback

    // Specification & engine stat properties
    this.speed = 242;
    this.attackCooldownMax = 0.82;
    this.skillName = 'GUNGNIR SKY-LANCE';
    this.skillMaxCooldown = 4.5;
    this.skillCooldownMax = 4.5;
    this.skillDuration = 0.98;
    this.skillTriggerRange = 485;
    this.ultName = 'BAHAMUT CATACLYSM';

    this.dashSpeed = 710;
    this.dashDuration = 0.42;
    this.dashMaxCooldown = 2.8;
    this.dashCooldownMax = 2.7;
    this.dodgeMaxCooldown = 3.1;

    // 30fps animation speed tracking
    this.animSpeed = 0.043;
    this.comboStep = 0;
    this.stepDustTimer = 0;

    // Custom state properties for Gungnir Sky-Lance, Dragon Phalanx Shield, Dragoon Sky-Dive & Bahamut Ultimate
    this.lanceRained = false;
    this.obelisksErupted = false;
    this.activeLanceX = 0;
    this.activeLanceTimer = 0;
    this.ultWave1 = false;
    this.ultWave2 = false;
    this.ultWave3 = false;
    this.ultStage = 0;
    this.bahamutAvatarTimer = 0;

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
    this.jumpHeight = 96;
    this.jumpShotFired = false;
    this.attackHitDealt = false;

    // Bespoke 30fps HD-2D Crimson Dragon-Valkyrie Visual Systems (rendered from valkyrie_vfx.png)
    this.valkyrieEchoes = []; // Crimson-Gold afterimages during Wyvern Charge / Dragoon Sky-Dive
    this.gungnirSkyLances = []; // Row 1 (y = 208): Descending Colossal Gungnir Sky-Lances
    this.dragonfireObelisks = []; // Row 2 (y = 416): Erupting Dragonfire Ruby-Gold Obelisk Spires
    this.bahamutAvatar = null; // Row 3 (y = 624) & Row 4 (y = 832): Colossal Bahamut Elder Wyvern Sovereign & Valhalla Seal
    this.vfxSheet = null;
    this._drewOverlayThisFrame = false;
  }

  getSprites() {
    const assets = PixelForge.initAssets();
    if (!assets.valkyrie && typeof Image !== 'undefined') {
      const loadImg = (src, onLoad) => {
        const img = new Image();
        img.decoding = 'async';
        if (onLoad) img.onload = () => onLoad(img);
        img.src = src;
        return img;
      };
      assets.valkyrie = {
        sheet: loadImg('assets/sprites/valkyrie_sheet.png?v=30fps15'),
        vfx: loadImg('assets/sprites/valkyrie_vfx.png?v=30fps15'),
        portrait: loadImg('assets/sprites/valkyrie_portrait.png?v=2', () => PixelForge.refreshPortraits())
      };
    }
    if (assets.valkyrie?.vfx) {
      this.vfxSheet = assets.valkyrie.vfx;
    }
    return assets.valkyrie;
  }

  getEffectiveAttackRange() {
    // Every 3rd thrust unleashes a twin-spiral WYVERN BREAKER! dragon_lance wave up to 445px
    return this.comboStep % 3 === 2 ? 445 : this.attackRange;
  }

  /**
   * Spawns Crimson-Gold Dragon-Valkyrie afterimages along Freyja's charge/jump trajectory
   */
  spawnValkyrieEchoes(fromX, fromY, toX, toY, facing, count = 4) {
    const frames = [184, 189, 250, 194];
    for (let i = 0; i < count; i++) {
      const u = i / Math.max(1, count);
      this.valkyrieEchoes.push({
        x: fromX + (toX - fromX) * u,
        y: fromY + (toY - fromY) * u,
        facing: facing || this.facing,
        frameIdx: frames[i % frames.length],
        life: 0,
        maxLife: 0.34 + i * 0.045
      });
    }
  }

  /**
   * Spawns a descending Colossal Gungnir Sky-Lance (Row 1 of valkyrie_vfx.png, y = 208)
   */
  spawnGungnirSkyLance(targetX, delay = 0, isUltimate = false, enemy = null, game = null) {
    const g = game || this.game;
    const ww = g?.renderer ? g.renderer.worldWidth : 1200;
    const lx = Math.max(90, Math.min(ww - 90, targetX));
    const maxLife = isUltimate ? 0.74 : 0.64;

    this.gungnirSkyLances.push({
      x: lx,
      y: this.groundY - 250,
      groundY: this.groundY,
      vy: 1980,
      delay,
      impacted: false,
      life: maxLife,
      maxLife,
      isUltimate
    });

    if (g && g.vfx && typeof g.vfx.spawnSkyStrike === 'function') {
      g.vfx.spawnSkyStrike({
        x: lx,
        y: -200,
        groundY: this.groundY,
        vx: 0,
        vy: 1780,
        type: 'gungnir_lance',
        color: '#f43f5e',
        coreColor: '#fbbf24',
        owner: this,
        target: enemy,
        damage: isUltimate ? 16 : 0,
        delay,
        maxLinger: 0.50,
        isUltimate
      });
    }
  }

  /**
   * Spawns erupting Dragonfire Ruby-Gold Obelisk Spires (Row 2 of valkyrie_vfx.png, y = 416 + spawnCrystalSpike)
   */
  spawnDragonfireObelisks(originX, dir, count, spacing, isUltimate, enemy, game) {
    const g = game || this.game;
    const ww = g?.renderer ? g.renderer.worldWidth : 1200;
    for (let i = 0; i < count; i++) {
      const ox = Math.max(90, Math.min(ww - 90, originX + dir * (i * spacing)));
      const height = 136 + (i % 2 === 0 ? 44 : 22) + (isUltimate ? 24 : 0);
      const width = 42 + (i % 2) * 8;
      const delay = i * 0.042;
      const maxLife = isUltimate ? 1.06 : 0.86;

      this.dragonfireObelisks.push({
        x: ox,
        groundY: this.groundY,
        height,
        width,
        tilt: dir * (0.16 + i * 0.03),
        delay,
        life: maxLife,
        maxLife,
        isUltimate
      });

      if (g && g.vfx && typeof g.vfx.spawnCrystalSpike === 'function') {
        g.vfx.spawnCrystalSpike({
          x: ox,
          groundY: this.groundY,
          height,
          width,
          tilt: dir * (0.20 + i * 0.035),
          color: i % 2 === 0 ? '#f43f5e' : '#fbbf24',
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
   * Crimson-Gold Dragon-Crest Phalanx Greatshield projectile deflection:
   * Parries incoming projectiles ("PHALANX PARRY!"), converts to dragon_lance, grants +12 mana.
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
          proj.vx = -proj.vx * 1.30;
          proj.vy = -6;
          proj.type = 'dragon_lance';
          proj.color = '#f43f5e';
          proj.coreColor = '#fbbf24';
          this.gainMana(12);
          if (g.audio) g.audio.play('reflect', this.x);
          g.vfx.spawnDamageText(proj.x, proj.y - 28, 0, false, 'PHALANX PARRY!', '#fbbf24');
          const startA = this.facing === 1 ? -1.35 : Math.PI - 1.35;
          const endA = this.facing === 1 ? 1.35 : Math.PI + 1.35;
          g.vfx.spawnSlash(proj.x, proj.y, 96, startA, endA, '#f43f5e', 0.28);
          g.vfx.spawnBurst(proj.x, proj.y, 14, '#fbbf24', 240);
          g.vfx.spawnShockwave(proj.x, proj.y, 84, '#f43f5e', 0.26);
          if (g.renderer) g.renderer.triggerShake(6, 0.14);
          break;
        }
      }
    }
  }

  /**
   * CROUCH — Row 7: DRAGON PHALANX SHIELD (30 frames)
   * Braces behind her Crimson-Gold Dragon-Crest Phalanx Greatshield (F00..F11),
   * parrying incoming projectiles ("PHALANX PARRY!", converts to dragon_lance, grants +12 mana),
   * then at t >= 0.38 (F12) fires a low piercing dragon_lance counter-wave!
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
    this.vx = 0;

    const g = game || this.game;
    this.deflectNearbyProjectiles(g);
    if (g && g.audio) g.audio.play('reflect', this.x);
    if (g && g.vfx) {
      g.vfx.spawnBurst(this.x + this.facing * 28, this.y - 86, 12, '#f43f5e', 185);
      g.vfx.spawnShockwave(this.x, this.groundY - 4, 74, '#fbbf24', 0.26, true);
      g.vfx.spawnGlyphBurst(this.x, this.y - 84, 5, 'crimson');
      g.vfx.spawnDamageText(this.x, this.y - 128, 0, false, 'PHALANX PARRY!', '#fbbf24');
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

    // Frames F00..F11 (t < 0.38s): Bracing behind Crimson-Gold Dragon-Crest Phalanx Greatshield
    if (t >= 0.08 && t < 0.38) {
      if (g && g.vfx && Math.random() < 0.72) {
        const a = t * 26;
        const shX = this.x + this.facing * 42;
        const shY = this.y - 86;
        g.vfx.spawnParticle({
          x: shX + Math.cos(a) * 20,
          y: shY + Math.sin(a) * 20,
          vx: -Math.cos(a) * 56,
          vy: -Math.sin(a) * 56,
          size: 4.5,
          color: Math.random() > 0.45 ? '#f43f5e' : '#fbbf24',
          maxLife: 0.22
        });
      }
    } else if (t >= 0.38 && !this.crouchFired) {
      // Frame F12 (t >= 0.38s): Low piercing dragon_lance counter-wave!
      this.crouchFired = true;
      this.didActionFrame = true;
      this.vx += this.facing * 96;
      if (g && g.audio) g.audio.play('heavy_cleave', this.x);

      const spawnX = this.x + this.facing * 54;
      const spawnY = this.y - 88;
      if (g && g.vfx) {
        g.vfx.spawnProjectile({
          x: spawnX,
          y: spawnY,
          vx: this.facing * 680,
          vy: 0,
          radius: 22,
          color: '#f43f5e',
          coreColor: '#fbbf24',
          owner: this,
          damage: 64,
          type: 'dragon_lance'
        });

        const cAng = this.facing === 1 ? 0 : Math.PI;
        g.vfx.spawnSlash(spawnX, spawnY, 102, cAng - 1.15, cAng + 1.15, '#f43f5e', 0.28);
        g.vfx.spawnSlash(spawnX, spawnY, 84, cAng - 1.0, cAng + 1.0, '#fbbf24', 0.22);
        g.vfx.spawnShockwave(spawnX, this.groundY - 4, 80, '#fbbf24', 0.26, true);
        g.vfx.spawnGlyphBurst(spawnX, spawnY, 5, 'crimson');
      }

      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= this.attackRange + 48) {
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
   * JUMP — Row 8: DRAGOON SKY-DIVE (30 frames)
   * Signature Dragoon High-Jump (96px apex lift) with unfurled crimson-gold dragon-wings,
   * firing a devastating downward diagonal dragon_lance dive-strike at apex (u >= 0.48, "DRAGOON SKY-DIVE!").
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
    const dist = enemy ? Math.abs(enemy.x - this.x) : 300;
    this.isFlipVault = true;
    this.flipStartX = this.x;
    this.flipAngle = 0;
    this.dashDuration = 0.62;
    this.jumpDuration = 0.62;
    this.jumpHeight = 96;
    this.jumpShotFired = false;
    this.isDeflecting = true;

    if (enemy && !enemy.isDead) {
      const toEnemy = Math.sign(enemy.x - this.x) || this.facing;
      if (dist > 210) {
        const target = enemy.x - toEnemy * 92;
        this.flipTargetX = Math.max(140, Math.min(ww - 140, target));
        this.dashDir = Math.sign(this.flipTargetX - this.flipStartX) || toEnemy;
      } else {
        const openDir = this.x < 260 ? 1 : this.x > ww - 260 ? -1 : dir;
        this.flipTargetX = Math.max(140, Math.min(ww - 140, this.x + openDir * 290));
        this.dashDir = openDir;
      }
    } else {
      this.flipTargetX = Math.max(140, Math.min(ww - 140, this.x + dir * 290));
      this.dashDir = dir;
    }

    this.spawnValkyrieEchoes(
      this.flipStartX,
      this.groundY,
      this.flipStartX + this.dashDir * 95,
      this.groundY - 56,
      this.facing,
      4
    );

    this.vx = 0;
    this.vy = 0;
    if (g && g.audio) g.audio.play('storm_leap', this.x);
    if (g && g.vfx) {
      g.vfx.spawnShockwave(this.x, this.groundY, 98, '#f43f5e', 0.30, true);
      g.vfx.spawnGlyphBurst(this.x, this.y - 65, 6, 'crimson');
      g.vfx.spawnDamageText(this.x, this.y - 138, 0, false, 'DRAGOON SKY-DIVE!', '#fbbf24');
    }
  }

  onStartDash(enemy, game, dir) {
    const g = game || this.game;
    this.isFlipVault = false;
    this.flipAngle = 0;
    this.dashDuration = 0.42;
    this.animSpeed = 0.012;
    this.isDeflecting = true;
    this.vx = dir * 515;
    this.spawnValkyrieEchoes(this.x, this.y, this.x + dir * 180, this.y, dir, 4);
    if (g && g.audio) g.audio.play('storm_leap', this.x);
    if (g && g.vfx) {
      g.vfx.spawnShockwave(this.x, this.y - 82, 88, '#f43f5e', 0.28, false, true);
      g.vfx.spawnGlyphBurst(this.x, this.y - 86, 6, 'crimson');
      g.vfx.spawnDamageText(this.x, this.y - 140, 0, false, 'WYVERN CHARGE!', '#f43f5e');
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

    const smartDir = enemy && Math.abs(enemy.x - this.x) > 215 ? this.facing : dir;
    this.setState('JUMP');
    this.isInvulnerable = true;
    this.onStartJumpVault(enemy, g, smartDir);
  }

  updateDashOrDodge(dt, enemy, game) {
    const g = game || this.game;
    const t = this.stateTimer;

    // Row 8 (30-frame JUMP — Dragoon Sky-Dive with 96px apex lift)
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

      // 96px-high Dragoon High-Jump trajectory with unfurled dragon-wings apex hang-time
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
      this.y = this.groundY - liftFrac * 96;
      this.flipAngle = 0;
      this.deflectNearbyProjectiles(g);

      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }

      if (g && g.vfx && airU > 0.05 && airU < 0.95 && Math.random() < 0.78) {
        g.vfx.spawnParticle({
          x: this.x + (Math.random() - 0.5) * 30,
          y: this.y - 76 + (Math.random() - 0.5) * 26,
          vx: -this.dashDir * 74,
          vy: 28,
          size: 5,
          color: Math.random() > 0.4 ? '#f43f5e' : '#fbbf24',
          maxLife: 0.26
        });
      }

      // Apex (u >= 0.48): Devastating downward diagonal dragon_lance dive-strike ("DRAGOON SKY-DIVE!")
      if (u >= 0.48 && !this.jumpShotFired) {
        this.jumpShotFired = true;
        this.didActionFrame = true;
        if (g && g.audio) g.audio.play('thunder_slam', this.x);

        const sx = this.x + this.facing * 46;
        const sy = this.y - 106;
        const dx = enemy ? enemy.x - sx : this.facing * 260;
        const dy = enemy ? enemy.y - 92 - sy : 145;
        const td = Math.hypot(dx, dy) || 1;

        if (g && g.vfx) {
          g.vfx.spawnDamageText(this.x, this.y - 144, 0, false, 'DRAGOON SKY-DIVE!', '#fbbf24');
          g.vfx.spawnProjectile({
            x: sx,
            y: sy,
            vx: (dx / td) * 680,
            vy: (dy / td) * 680,
            radius: 22,
            color: '#f43f5e',
            coreColor: '#fbbf24',
            owner: this,
            damage: 62,
            type: 'dragon_lance'
          });
          const diveAng = Math.atan2(dy, dx);
          g.vfx.spawnSlash(sx, sy, 110, diveAng - 1.2, diveAng + 1.2, '#f43f5e', 0.30);
          g.vfx.spawnSlash(sx, sy, 88, diveAng - 1.0, diveAng + 1.0, '#fbbf24', 0.24);
          g.vfx.spawnShockwave(sx, sy, 84, '#fbbf24', 0.26, false, false);
          g.vfx.spawnGlyphBurst(sx, sy, 6, 'crimson');
        }

        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= 172) {
          enemy.takeDamage(58, this, true, 130, -95);
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
          g.vfx.spawnShockwave(this.x, this.groundY, 88, '#f43f5e', 0.28, true);
        }
        this.setState('IDLE');
      }
      return;
    }

    // Row 6 (30-frame DASH — Wyvern Wing-Assault)
    this.animSpeed = 0.012;
    const speed = this.state === 'DASH' ? 515 : 395;
    this.x += this.dashDir * speed * dt;
    this.deflectNearbyProjectiles(g);

    if (g && g.vfx && Math.random() < 0.78) {
      g.vfx.spawnParticle({
        x: this.x - this.dashDir * 20,
        y: this.groundY - 14 - Math.random() * 68,
        vx: -this.dashDir * 115,
        vy: -32,
        size: 5.5,
        color: Math.random() > 0.4 ? '#f43f5e' : '#fbbf24',
        maxLife: 0.26
      });
    }

    // Wyvern Lance Charge impact
    if (
      this.state === 'DASH' &&
      !this.didActionFrame &&
      enemy &&
      !enemy.isDead &&
      Math.abs(enemy.x - this.x) <= 152
    ) {
      this.didActionFrame = true;
      enemy.takeDamage(52, this, false, 130, -80);
      if (g && g.audio) g.audio.play('heavy_cleave', enemy.x);
      if (g && g.vfx) {
        g.vfx.spawnSlash(this.x + this.facing * 44, this.y - 96, 106, -1.2, 1.2, '#f43f5e', 0.28);
        g.vfx.spawnShockwave(enemy.x, enemy.y - 85, 96, '#fbbf24', 0.28);
        g.vfx.spawnGlyphBurst(enemy.x, enemy.y - 90, 5, 'crimson');
      }
    }

    if (t >= this.dashDuration) {
      this.isDeflecting = false;
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  /**
   * Smart Dragon-Valkyrie AI decision layer
   */
  updateAI(dt, enemy, game) {
    if (!enemy || enemy.isDead || (this.state !== 'IDLE' && this.state !== 'WALK')) return false;
    const dist = Math.abs(enemy.x - this.x);
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;

    // 1. Dragon Phalanx Shield (CROUCH) against incoming projectiles or mid-range counter
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
        (dist >= 195 && dist <= 345 && this.autoCooldown > 0.25 && Math.random() < 0.045))
    ) {
      this.startCrouch(enemy, game);
      return true;
    }

    // 2. Dragoon Sky-Dive (Row 8 JUMP) to escape corner pressure or dive-strike mid-far foes (250..420px)
    const pinnedNearWall =
      (this.x < 230 && enemy.x > this.x) || (this.x > ww - 230 && enemy.x < this.x);
    if (
      ((pinnedNearWall && dist < 265) ||
        (dist >= 250 && dist <= 420 && this.skillCooldown > 0.55)) &&
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
    this.bahamutAvatarTimer = Math.max(0, this.bahamutAvatarTimer - dt);
    this.activeLanceTimer = Math.max(0, this.activeLanceTimer - dt);

    // Sync 30fps animation speeds per state
    if (this.state === 'IDLE') this.animSpeed = 0.043;
    else if (this.state === 'WALK') this.animSpeed = 0.023;
    else if (this.state === 'HURT' || this.state === 'DEATH') this.animSpeed = 0.04;

    // Advance Crimson-Gold afterimages
    for (let i = this.valkyrieEchoes.length - 1; i >= 0; i--) {
      const ec = this.valkyrieEchoes[i];
      ec.life += dt;
      if (ec.life >= ec.maxLife) {
        this.valkyrieEchoes.splice(i, 1);
      }
    }

    // Advance descending Gungnir Sky-Lances
    for (let i = this.gungnirSkyLances.length - 1; i >= 0; i--) {
      const gl = this.gungnirSkyLances[i];
      if (gl.delay > 0) {
        gl.delay = Math.max(0, gl.delay - dt);
        continue;
      }
      gl.life -= dt;
      if (!gl.impacted) {
        gl.y += gl.vy * dt;
        if (gl.y >= gl.groundY) {
          gl.y = gl.groundY;
          gl.impacted = true;
        }
      }
      if (gl.life <= 0) {
        this.gungnirSkyLances.splice(i, 1);
      }
    }

    // Advance erupting Dragonfire Obelisk Spires
    for (let i = this.dragonfireObelisks.length - 1; i >= 0; i--) {
      const ob = this.dragonfireObelisks[i];
      if (ob.delay > 0) {
        ob.delay = Math.max(0, ob.delay - dt);
      } else {
        ob.life -= dt;
        if (ob.life <= 0) {
          this.dragonfireObelisks.splice(i, 1);
        }
      }
    }

    // Advance Colossal Bahamut Elder Wyvern Sovereign Avatar
    if (this.bahamutAvatar) {
      this.bahamutAvatar.life -= dt;
      if (this.bahamutAvatar.life <= 0) {
        this.bahamutAvatar = null;
      }
    }

    // Armored Dragon-Greaves Footsteps & Ruby Sparks during WALK
    if (!this.isDead && this.state === 'WALK') {
      this.stepDustTimer += dt;
      if (this.stepDustTimer >= 0.31) {
        this.stepDustTimer = 0;
        if (game && game.audio) game.audio.play('footstep_steel', this.x);
        if (game && game.vfx) {
          game.vfx.spawnBurst(this.x - this.facing * 14, this.groundY - 2, 4, '#f43f5e', 68, {
            upBias: 30,
            size: 4,
            life: 0.33,
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
   * AUTO_ATTACK — Row 2: WYVERN LANCE THRUST (30 frames)
   * Long-reach two-handed Dragon-Lance thrust at t >= 0.33 that ALSO launches a dragon_lance
   * spiral wave projectile (type: 'dragon_lance', color: '#f43f5e', coreColor: '#fbbf24', radius: 22, speed: 680).
   * Every 3rd attack (comboStep % 3 === 2) unleashes a twin-spiral WYVERN BREAKER! thrust.
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

    if (t < 0.33) {
      // Row 2 Frames F00..F09: Two-handed Dragon-Lance coil with crimson-gold wyvern embers
      this.torsoAngle = -this.facing * 0.24 * (t / 0.33);
      if (g && g.vfx && Math.random() < 0.60) {
        g.vfx.spawnParticle({
          x: this.x - this.facing * 20 + (Math.random() - 0.5) * 28,
          y: this.y - 106 + (Math.random() - 0.5) * 28,
          vx: this.facing * 50,
          vy: -76,
          size: 5,
          color: mode === 2 ? '#fbbf24' : '#f43f5e',
          maxLife: 0.26
        });
      }
    } else if (t < 0.68) {
      // Row 2 Frames F10..F19: Explosive Wyvern Lance Thrust + dragon_lance spiral wave projectile!
      if (!this.didActionFrame) {
        this.didActionFrame = true;
        this.attackHitDealt = true;
        this.comboStep++;
        this.vx += this.facing * (mode === 2 ? 195 : 165);
        this.torsoVel = this.facing * 14;

        const cx = this.x + this.facing * 54;
        const cy = this.y - 96;
        const startA = this.facing === 1 ? -1.68 : Math.PI - 1.05;
        const endA = this.facing === 1 ? 1.15 : Math.PI + 1.68;

        if (g && g.vfx) {
          // Primary dragon_lance spiral wave projectile
          g.vfx.spawnProjectile({
            x: this.x + this.facing * 58,
            y: this.y - 98,
            vx: this.facing * 680,
            vy: 0,
            radius: 22,
            color: '#f43f5e',
            coreColor: '#fbbf24',
            owner: this,
            damage: mode === 2 ? 68 : 46,
            type: 'dragon_lance'
          });

          if (mode === 2) {
            // Every 3rd attack (comboStep % 3 === 2): Twin-spiral WYVERN BREAKER! thrust
            g.vfx.spawnDamageText(this.x, this.y - 146, 0, false, 'WYVERN BREAKER!', '#fbbf24');
            g.vfx.spawnProjectile({
              x: this.x + this.facing * 38,
              y: this.y - 110,
              vx: this.facing * 680,
              vy: 0,
              radius: 22,
              color: '#fbbf24',
              coreColor: '#f43f5e',
              owner: this,
              damage: 34,
              type: 'dragon_lance'
            });
          }

          g.vfx.spawnSlash(cx, cy, 126, startA, endA, '#f43f5e', 0.30);
          g.vfx.spawnSlash(cx, cy, 104, startA, endA, '#fbbf24', 0.24);
          g.vfx.spawnSlash(cx, cy, 86, startA, endA, '#fef08a', 0.18);
          g.vfx.spawnShockwave(cx, this.groundY, 104, '#f43f5e', 0.28, true);
          g.vfx.spawnGlyphBurst(cx, cy, 6, 'crimson');
        }

        if (g && g.audio) {
          g.audio.play(mode === 2 ? 'thunder_slam' : 'heavy_cleave', this.x);
        }
        if (g && g.renderer) {
          g.renderer.triggerShake(mode === 2 ? 8 : 6, 0.16);
        }

        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= this.attackRange + 55) {
          const isCrit = mode === 2 || Math.random() < 0.26;
          const dmg = mode === 2 ? 96 : mode === 1 ? 82 : 74;
          enemy.takeDamage(dmg, this, isCrit, 125, mode === 2 ? -135 : 0);
          if (g && g.audio) g.audio.play(isCrit ? 'hit_crit' : 'clang', enemy.x);
          if (g && g.renderer) g.renderer.triggerHitStop(0.055);
          if (g && g.vfx) {
            g.vfx.spawnBurst(enemy.x, enemy.y - 96, 16, '#fbbf24', 240);
            g.vfx.spawnGlyphBurst(enemy.x, enemy.y - 96, 5, 'crimson');
          }
        }
      }
    } else if (t >= 0.94) {
      this.setState('IDLE');
    }
  }

  /**
   * SKILL — Row 3: GUNGNIR SKY-LANCE BARRAGE (30 frames)
   * Phase 1 (t >= 0.20): Rains a colossal Gungnir Sky-Lance (Row 1 of valkyrie_vfx.png, y = 208) onto the target ("GUNGNIR IMPALE!").
   * Phase 2 (t >= 0.50): Erupts 4 Dragonfire Ruby-Gold Obelisk Spires (Row 2 of valkyrie_vfx.png, y = 416 + spawnCrystalSpike) across the floor!
   */
  startSkill(enemy, game) {
    this.setState('SKILL');
    this.animSpeed = 0.025;
    this.lanceRained = false;
    this.obelisksErupted = false;
  }

  updateSkill(dt, enemy, game) {
    const g = game || this.game;
    const t = this.stateTimer;
    const ww = g?.renderer ? g.renderer.worldWidth : 1200;
    this.animSpeed = 0.025;
    this.isDeflecting = t >= 0.06 && t <= 0.82;

    if (t < 0.08) {
      this.lanceRained = false;
      this.obelisksErupted = false;
      this.torsoAngle = -this.facing * 0.20;
    } else if (t >= 0.20 && !this.lanceRained) {
      // Phase 1 (t >= 0.20): Rains a colossal Gungnir Sky-Lance (Row 1 of valkyrie_vfx.png, y = 208) onto the target ("GUNGNIR IMPALE!")
      this.lanceRained = true;
      this.didActionFrame = true;
      const targetX = enemy ? enemy.x : this.x + this.facing * 190;
      const lanceX = Math.max(95, Math.min(ww - 95, targetX));
      this.activeLanceX = lanceX;
      this.activeLanceTimer = 0.56;

      this.spawnGungnirSkyLance(lanceX, 0, false, enemy, g);

      if (g && g.audio) g.audio.play('thunder_slam', lanceX);
      if (g && g.renderer) g.renderer.triggerShake(10, 0.20);
      if (g && g.vfx) {
        g.vfx.spawnShockwave(lanceX, this.groundY, 136, '#f43f5e', 0.34, true);
        g.vfx.spawnDecal(lanceX, 98, 'fissure', '#f43f5e', 4.2);
        g.vfx.spawnGlyphBurst(lanceX, this.groundY - 70, 7, 'crimson');
        g.vfx.spawnDamageText(lanceX, this.groundY - 160, 0, false, 'GUNGNIR IMPALE!', '#fbbf24');
      }

      if (enemy && !enemy.isDead && Math.abs(enemy.x - lanceX) <= 165) {
        enemy.takeDamage(42, this, false, -75, -55);
        enemy.vx *= 0.25;
      }
    } else if (t >= 0.50 && !this.obelisksErupted) {
      // Phase 2 (t >= 0.50): Erupts 4 Dragonfire Ruby-Gold Obelisk Spires (Row 2 of valkyrie_vfx.png, y = 416 + spawnCrystalSpike)
      this.obelisksErupted = true;
      this.vx += this.facing * 140;
      const startX = this.x + this.facing * 82;
      const centerX = enemy ? enemy.x : this.activeLanceX || this.x + this.facing * 170;

      if (g && g.audio) g.audio.play('heavy_cleave', centerX);
      if (g && g.renderer) {
        g.renderer.triggerShake(15, 0.30);
        g.renderer.triggerHitStop(0.06);
      }

      // Erupt 4 Dragonfire Ruby-Gold Obelisk Spires across the floor
      this.spawnDragonfireObelisks(
        startX,
        this.facing,
        4,
        66,
        false,
        enemy,
        g
      );

      if (g && g.vfx) {
        g.vfx.spawnProjectile({
          x: this.x + this.facing * 58,
          y: this.y - 96,
          vx: this.facing * 720,
          vy: 0,
          radius: 24,
          color: '#f43f5e',
          coreColor: '#fbbf24',
          owner: this,
          damage: 60,
          type: 'dragon_lance'
        });

        const startA = this.facing === 1 ? -1.65 : Math.PI - 1.25;
        const endA = this.facing === 1 ? 1.25 : Math.PI + 1.65;
        g.vfx.spawnSlash(centerX, this.y - 96, 146, startA, endA, '#f43f5e', 0.34);
        g.vfx.spawnSlash(centerX, this.y - 96, 118, startA, endA, '#fbbf24', 0.28);
        g.vfx.spawnShockwave(centerX, this.groundY, 190, '#fbbf24', 0.40, true);
        g.vfx.spawnBurst(centerX, this.groundY - 24, 22, '#f43f5e', 290, { upBias: 135, size: 7 });
        g.vfx.spawnGlyphBurst(centerX, this.y - 96, 8, 'crimson');
        g.vfx.spawnDamageText(centerX, this.groundY - 175, 0, true, 'GUNGNIR SKY-LANCE!', '#f43f5e');
      }

      if (enemy && !enemy.isDead && Math.abs(enemy.x - centerX) <= 215) {
        enemy.takeDamage(60, this, true, 145, -145);
      }
    } else if (t >= 0.98) {
      this.isDeflecting = false;
      this.setState('IDLE');
    }
  }

  /**
   * ULTIMATE — Row 4: VALHALLA: BAHAMUT DRAGONFIRE CATACLYSM (1.52s duration)
   * Summons the Colossal Bahamut Elder Wyvern Sovereign & Valhalla Seal
   * (Row 3 y = 624 and Row 4 y = 832 of valkyrie_vfx.png) in drawUltimateForeground(ctx, renderer),
   * unleashing 3 cataclysmic waves of Gungnir Sky-Lances and 6 Dragonfire Obelisk Spires ("BAHAMUT CATACLYSM!").
   */
  startUltimate(enemy, game) {
    this.setState('ULTIMATE');
    this.animSpeed = 0.041;
    this.ultWave1 = false;
    this.ultWave2 = false;
    this.ultWave3 = false;
    this.ultStage = 0;
    this.bahamutAvatarTimer = 1.52;
  }

  updateUltimate(dt, enemy, game) {
    const g = game || this.game;
    const t = this.stateTimer;
    const ww = g?.renderer ? g.renderer.worldWidth : 1200;
    const targetX = enemy ? enemy.x : Math.max(180, Math.min(ww - 180, this.x + this.facing * 230));
    this.vx = 0;
    this.vy = 0;
    this.y = this.groundY;
    this.animSpeed = 0.041;
    this.isInvulnerable = t < 1.26;
    this.isDeflecting = t < 1.46;

    if (t < 0.04 && this.ultStage === 0) {
      this.ultStage = 1;
      this.ultWave1 = false;
      this.ultWave2 = false;
      this.ultWave3 = false;
      this.bahamutAvatarTimer = 1.52;
      this.bahamutAvatar = {
        x: this.x,
        y: this.groundY,
        facing: this.facing,
        life: 1.52,
        maxLife: 1.52,
        breathProgress: 0
      };
    }

    if (this.bahamutAvatar) {
      this.bahamutAvatar.x = this.x;
      this.bahamutAvatar.facing = this.facing;
      this.bahamutAvatar.breathProgress = Math.min(1, t / 1.15);
    }

    // WAVE 1 (t >= 0.08s): Summon Bahamut Elder Wyvern Sovereign & Gungnir Sky-Lance Wave I!
    if (t >= 0.08 && !this.ultWave1) {
      this.ultWave1 = true;
      if (!this.bahamutAvatar) {
        this.bahamutAvatar = {
          x: this.x,
          y: this.groundY,
          facing: this.facing,
          life: 1.52,
          maxLife: 1.52,
          breathProgress: 0.1
        };
      }
      this.spawnGungnirSkyLance(targetX - 55, 0, true, enemy, g);
      this.spawnGungnirSkyLance(targetX + 55, 0.04, true, enemy, g);

      if (g && g.audio) g.audio.play('thunder_slam', targetX);
      if (g && g.renderer) g.renderer.triggerShake(15, 0.25);

      if (g && g.vfx) {
        const sA = this.facing === 1 ? -1.80 : Math.PI - 1.35;
        const eA = this.facing === 1 ? 1.35 : Math.PI + 1.80;
        g.vfx.spawnSlash(targetX, this.groundY - 102, 162, sA, eA, '#f43f5e', 0.36);
        g.vfx.spawnSlash(targetX, this.groundY - 102, 132, sA, eA, '#fbbf24', 0.30);
        g.vfx.spawnShockwave(targetX, this.groundY, 195, '#f43f5e', 0.38, true);
        g.vfx.spawnGlyphBurst(targetX, this.groundY - 92, 8, 'crimson');
        g.vfx.spawnDamageText(targetX, this.groundY - 185, 0, false, 'BAHAMUT CATACLYSM!', '#fbbf24');
      }

      if (enemy && !enemy.isDead) {
        enemy.takeDamage(38, this, false, 65, -55);
      }
    }

    // WAVE 2 (t >= 0.52s): Gungnir Sky-Lance Wave II & Blazing Dragon-Lance Spiral Barrage!
    if (t >= 0.52 && !this.ultWave2) {
      this.ultWave2 = true;
      for (let i = 0; i < 3; i++) {
        const lx = Math.max(95, Math.min(ww - 95, this.x + this.facing * (110 + i * 105)));
        this.spawnGungnirSkyLance(lx, i * 0.04, true, enemy, g);
      }

      if (g && g.audio) g.audio.play('heavy_cleave', targetX);
      if (g && g.renderer) g.renderer.triggerShake(18, 0.30);

      if (g && g.vfx) {
        g.vfx.spawnProjectile({
          x: this.x + this.facing * 58,
          y: this.groundY - 96,
          vx: this.facing * 720,
          vy: 0,
          radius: 26,
          color: '#f43f5e',
          coreColor: '#fbbf24',
          owner: this,
          damage: 32,
          type: 'dragon_lance',
          isUltimate: true
        });
        g.vfx.spawnShockwave(targetX, this.groundY, 225, '#fbbf24', 0.44, true);
        g.vfx.spawnDamageText(targetX, this.groundY - 198, 0, true, 'BAHAMUT CATACLYSM!', '#f43f5e');
      }

      if (enemy && !enemy.isDead) {
        enemy.takeDamage(44, this, true, 85, -80);
      }
    }

    // WAVE 3 (t >= 0.96s): Gungnir Sky-Lance Wave III & 6 Dragonfire Obelisk Spires across the arena!
    if (t >= 0.96 && !this.ultWave3) {
      this.ultWave3 = true;
      const slamX = this.x + this.facing * 66;

      this.spawnGungnirSkyLance(targetX, 0, true, enemy, g);

      if (g && g.audio) g.audio.play('earthshatter', slamX);
      if (g && g.renderer) {
        g.renderer.triggerShake(28, 0.58);
        g.renderer.triggerAberration(16);
        g.renderer.triggerHitStop(0.095);
      }

      // Erupt 6 Dragonfire Ruby-Gold Obelisk Spires across the floor!
      this.spawnDragonfireObelisks(
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
        g.vfx.spawnSlash(slamX, this.groundY - 98, 182, sA, eA, '#f43f5e', 0.44);
        g.vfx.spawnSlash(slamX, this.groundY - 98, 148, sA, eA, '#fbbf24', 0.38);

        [0, 1].forEach((idx) => {
          g.vfx.spawnProjectile({
            x: slamX + this.facing * (idx * 36),
            y: this.groundY - 98 - idx * 24,
            vx: this.facing * (740 - idx * 80),
            vy: 0,
            radius: 25 - idx * 3,
            color: idx === 0 ? '#f43f5e' : '#fbbf24',
            coreColor: '#fef08a',
            owner: this,
            damage: 26,
            type: 'dragon_lance',
            isUltimate: true
          });
        });

        g.vfx.spawnShockwave(slamX, this.groundY, 340, '#f43f5e', 0.62, true);
        g.vfx.spawnShockwave(targetX, this.groundY, 270, '#fbbf24', 0.54, true);
        g.vfx.spawnDecal(slamX, 220, 'fissure', '#f43f5e', 6.4);
        g.vfx.spawnDecal(targetX, 190, 'fissure', '#fbbf24', 6.0);
        g.vfx.spawnBurst(slamX, this.groundY - 22, 36, '#f43f5e', 410, { upBias: 185, size: 9 });
        g.vfx.spawnBurst(targetX, this.groundY - 22, 28, '#fbbf24', 350, { upBias: 150, size: 8 });
        g.vfx.spawnGlyphBurst(slamX, this.groundY - 82, 12, 'crimson');
        g.vfx.spawnDamageText(slamX, this.groundY - 215, 0, true, 'BAHAMUT CATACLYSM!', '#fde047');
      }

      if (enemy && !enemy.isDead) {
        enemy.takeDamage(108, this, true, 215, -290);
      }
      this.heal(34, 'VALHALLA GRACE');
    }

    if (t >= 1.52) {
      this.isInvulnerable = false;
      this.isDeflecting = false;
      this.bahamutAvatar = null;
      this.ultStage = 0;
      this.setState('IDLE');
    }
  }

  /**
   * Renders Crimson-Gold Dragon-Valkyrie afterimages
   */
  drawValkyrieEchoes(ctx) {
    if (!this.valkyrieEchoes || !this.valkyrieEchoes.length) return;
    const sprites = this.getSprites();
    if (!sprites || !sprites.sheet) return;

    for (const ec of this.valkyrieEchoes) {
      const fade = Math.max(0, 1 - ec.life / ec.maxLife);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(Math.round(ec.x), Math.round(ec.y));
      ctx.scale(ec.facing || this.facing, 1);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * 0.46;
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
   * Renders descending Colossal Gungnir Sky-Lances from Row 1 (sy = 208) of valkyrie_vfx.png
   */
  drawGungnirSkyLances(ctx, renderer = null) {
    const vfxSheet = this.getSprites()?.vfx;
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;

    const list =
      this.gungnirSkyLances.length > 0
        ? this.gungnirSkyLances
        : this.activeLanceTimer > 0
          ? [
              {
                x: this.activeLanceX || this.x + this.facing * 120,
                y: this.groundY,
                groundY: this.groundY,
                impacted: true,
                life: this.activeLanceTimer,
                maxLife: 0.56
              }
            ]
          : [];
    if (!list.length) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (const gl of list) {
      if (gl.delay > 0 || gl.life <= 0) continue;
      const fade = Math.min(1, gl.life * 3.8);
      const elapsed = gl.maxLife - gl.life;
      const col = !gl.impacted
        ? Math.min(11, Math.floor(elapsed * 36) % 12)
        : Math.min(29, 12 + Math.floor(Math.min(1, elapsed / Math.max(0.1, gl.maxLife)) * 17));
      const lx = Math.round(gl.x);
      const ly = Math.round(gl.y ?? this.groundY);
      const sz = 198;

      ctx.save();
      ctx.translate(lx, ly);
      if (renderer) {
        ctx.globalCompositeOperation = 'lighter';
        if (renderer.glowGold) {
          ctx.globalAlpha = fade * 0.52;
          ctx.drawImage(renderer.glowGold, -sz * 0.85, -sz * 0.95, sz * 1.7, sz * 1.4);
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
   * Renders Erupting Dragonfire Ruby-Gold Obelisk Spires from Row 2 (sy = 416) of valkyrie_vfx.png
   */
  drawDragonfireObelisks(ctx, renderer = null) {
    if (!this.dragonfireObelisks.length) return;
    const vfxSheet = this.getSprites()?.vfx;
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (const ob of this.dragonfireObelisks) {
      if (ob.delay > 0 || ob.life <= 0) continue;
      const elapsed = ob.maxLife - ob.life;
      const pop = Math.min(1, elapsed / 0.14);
      const fade = Math.min(1, ob.life * 3.0);
      const col = Math.min(29, Math.max(0, Math.floor((elapsed / ob.maxLife) * 30)));
      const ox = Math.round(ob.x);
      const oy = Math.round(ob.groundY ?? this.groundY);

      ctx.save();
      ctx.beginPath();
      ctx.rect(ox - 125, oy - 270, 250, 278);
      ctx.clip();

      const drawW = Math.round(ob.width * 3.8);
      const drawH = Math.round(ob.height * 1.44 * pop);
      ctx.translate(ox, oy + 10);
      ctx.rotate((ob.tilt || 0) * 0.15);

      if (renderer && renderer.glowGold) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade * 0.44;
        ctx.drawImage(renderer.glowGold, -drawW * 0.85, -drawH * 0.95, drawW * 1.7, drawH * 1.3);
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
   * Renders the Colossal Bahamut Elder Wyvern Sovereign (Row 3, y = 624)
   * and Valhalla Seal (Row 4, y = 832) of valkyrie_vfx.png
   */
  drawBahamutAvatar(ctx, renderer = null) {
    if (!this.bahamutAvatar && this.bahamutAvatarTimer <= 0 && this.state !== 'ULTIMATE') return;
    const vfxSheet = this.getSprites()?.vfx;
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;

    const maxLife = this.bahamutAvatar?.maxLife || 1.52;
    const remLife = this.bahamutAvatar ? this.bahamutAvatar.life : this.bahamutAvatarTimer || 1.0;
    const elapsed = Math.max(0, maxLife - remLife);
    const rise = Math.min(1, elapsed / 0.22);
    const fade = Math.min(1, remLife * 3.2);
    const col = Math.min(29, Math.max(0, Math.floor((elapsed / maxLife) * 30)));
    const ax = Math.round(this.x - this.facing * 18);
    const ay = Math.round(this.groundY);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Rotating Valhalla Seal at Freyja's feet (Row 4, sy = 832)
    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(ay - 20));
    ctx.scale(1, 0.40);
    const sealSz = 276;
    const sHalf = Math.round(-sealSz * 0.5);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fade * 0.62;
    ctx.drawImage(vfxSheet, col * 208, 832, 208, 208, sHalf, sHalf, sealSz, sealSz);
    ctx.restore();

    // 2. Colossal Bahamut Elder Wyvern Sovereign looming behind Freyja (Row 3, sy = 624)
    ctx.beginPath();
    ctx.rect(ax - 290, ay - 430, 580, 436);
    ctx.clip();

    const drawSize = 328;
    const riseY = Math.round((1 - rise) * 185);
    const floatBob = Math.round(Math.sin(elapsed * 7.0) * 5);

    ctx.translate(ax, ay - drawSize * 0.5 + 12 + riseY + floatBob);
    ctx.scale(this.facing, 1);

    if (renderer) {
      ctx.globalCompositeOperation = 'lighter';
      if (renderer.glowGold) {
        ctx.globalAlpha = fade * 0.58;
        ctx.drawImage(renderer.glowGold, -220, -220, 440, 440);
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
    this.drawValkyrieEchoes(ctx);
    this.drawDragonfireObelisks(ctx, renderer);
    this.drawGungnirSkyLances(ctx, renderer);
  }

  /**
   * Foreground Ultimate pass (rendered IN FRONT of all fighters!)
   * Summons the Colossal Bahamut Elder Wyvern Sovereign & Valhalla Seal (Row 3 y = 624 and Row 4 y = 832 of valkyrie_vfx.png)
   */
  drawUltimateForeground(ctx, renderer = null) {
    this.drawBahamutAvatar(ctx, renderer);
    if (this.state === 'ULTIMATE') {
      this.drawDragonfireObelisks(ctx, renderer);
      this.drawGungnirSkyLances(ctx, renderer);
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
        this.drawValkyrieEchoes(ctx);
        this.drawDragonfireObelisks(ctx, renderer);
        this.drawGungnirSkyLances(ctx, renderer);
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

    // Dynamic Pixel-Art Crimson-Gold Dragonfire Speed-Streaks during Ultimate / Skill
    if (!isReflection && (this.state === 'ULTIMATE' || this.state === 'SKILL')) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const t = this.stateTimer;
      for (let i = 0; i < 6; i++) {
        const sy = -152 + i * 22 + (((t * 60 + i * 7) | 0) % 6) * 2;
        const sx = -90 - ((i * 19 + ((t * 180) | 0)) % 48);
        const sw = 28 + (i % 3) * 14;
        ctx.fillStyle = i % 2 === 0 ? '#f43f5e' : '#fbbf24';
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
