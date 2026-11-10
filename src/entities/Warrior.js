import { Fighter } from './Fighter.js?v=30fps59';
import { PixelForge } from '../engine/PixelForge.js?v=30fps59';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps59';
import {
  RUNIC_STEEL_EFFECT_REGISTRY,
  RUNIC_CYAN_PALETTE,
  RUNIC_GOLD_PALETTE
} from '../engine/shaders/runicSteelShaders.js?v=30fps59';

/**
 * Aethelgard (`warrior`) — Elder Rune Knight & Runic Vanguard.
 * Powered natively by `ArcaneShaderFX` (dual-buffer 120Hz 2.5D shader & particle engine)
 * + `assets/sprites/warrior_sheet.png` & `assets/sprites/warrior_vfx.png`.
 */
export class Warrior extends Fighter {
  constructor(x, groundY, facing = 1) {
    const opts = typeof x === 'object' && x !== null ? x : { x, groundY, facing };
    super({
      ...opts,
      name: opts.name || 'Aethelgard',
      maxHp: 1260,
      attackRange: 152,
      moveSpeed: 156,
      autoInterval: 1.29,
      lightColor: 'rgba(56, 189, 248, 1)',
      primaryColor: '#38bdf8',
      hasTrueUltimate: true,
      trueUltName: 'CELESTIAL SWORD OF JUSTICE',
      trueUltDuration: 4.35
    });
    this.heroId = 'warrior';
    this.theme = 'steel';
    this.deathSfx = 'death_warrior';
    this.hasPoise = true; // Runic Juggernaut Poise resists ranged knockback/hitstun
    this.skillDuration = 1.04;
    this.ultDuration = 1.86;
    this.trueUltDuration = 4.35;
    this.skillMaxCooldown = 5.4;
    this.skillTriggerRange = 480;
    this.ultName = 'HEAVENLY EARTHSHATTER';
    this.trueUltName = 'CELESTIAL SWORD OF JUSTICE';
    this.skillName = 'TEMPEST VANGUARD';
    this.comboStep = 0;
    this.spinAngle = 0;
    this.spinHitStep = 0;
    this.isDeflecting = false;
    this.reflectedInSkill = false;
    this.stepDustTimer = 0;
    this.spawnedSkyBlades = false;
    this.didSlamFinisher = false;
    this.dodgeMaxCooldown = 3.6;
    this.dashMaxCooldown = 3.35;
    this.crouchCooldown = 0;
    this.crouchDuration = 0.96;
    this.isCrouching = false;
    this.vaultCooldown = 0;
    this.isFlipVault = false;
    this.flipStartX = this.x;
    this.flipTargetX = this.x;
    this.flipAngle = 0;
    this.afterimages = [];
    this.afterimageAccum = 0;
    this.activeVfxAnims = [];
    this._ultTargetX = 600;

    // Supreme Finishing Move ("TRUE_ULTIMATE": Celestial Sword of Justice) state:
    // - 2.35s Sacred Pose -> Top-of-Stage Teleport with Bluish Archangel Wings & Sword Pointing at Enemy
    // - Big Slashes of Justice -> Supersonic Dive Attack & Landing -> 5.0s Whole-Stage Floating Bluish Feathers!
    this._trueUltInit = false;
    this._trueUltStage = 0;
    this.justiceWingsActive = false;
    this.justiceWingSpread = 0;
    this.justiceSwordPointActive = false;
    this.justiceSwordAimAngle = 0;
    this.justiceFeatherTimer = 0;
    this.justiceFeathers = [];
    this.justiceSlashes = [];

    // Native 120Hz dual-buffer HD-2D Runic Steel shader & particle runtime (`back` + `front` 2.5D layers)
    this.fx = new ArcaneShaderFX(RUNIC_STEEL_EFFECT_REGISTRY, {
      pixelScale: 3,
      viewW: 440,
      viewH: 220
    });
    this.haloFxSlot = null;

    if (typeof Image !== 'undefined') {
      const warriorAssets = PixelForge.initAssets()?.warrior;
      if (warriorAssets?.vfx?.src && !warriorAssets.vfx.src.includes('v=30fps53')) {
        warriorAssets.vfx.src = 'assets/sprites/warrior_vfx.png?v=30fps59';
      }
    }
  }

  setState(newState) {
    super.setState(newState);
    if (newState !== 'SKILL') {
      this.fx?.stopByKey('tempestCycloneRing');
    }
    if (newState === 'ULTIMATE') {
      this._ultInit = false;
      this.isInvulnerable = true;
    } else if (this._ultInit) {
      this._ultInit = false;
    }
    if (newState === 'TRUE_ULTIMATE') {
      this._trueUltInit = false;
      this._trueUltStage = 0;
      this.isInvulnerable = true;
      this.unstoppablePoise = true;
    } else {
      this._trueUltInit = false;
      this.justiceWingsActive = false;
      this.justiceSwordPointActive = false;
      this.unstoppablePoise = false;
    }
    if (newState === 'DEATH') {
      this.fx?.clear();
      this.haloFxSlot = null;
      this.justiceWingsActive = false;
      this.justiceSwordPointActive = false;
    }
  }

  spawnAfterimage(x, y, facing, row, col, maxLife = 0.34) {
    const frameIdx = row * 30 + Math.max(0, Math.min(29, col | 0));
    this.afterimages.push({
      x,
      y,
      facing: facing || 1,
      frameIdx,
      age: 0,
      maxLife
    });
    if (this.afterimages.length > 20) this.afterimages.shift();
  }

  spawnRuneBlinkPillar(x, _y, maxLife = 0.36, height = 188, isSky = false) {
    const groundY = this.groundY;
    const h = Math.max(196, Math.min(260, Math.round((height || 208) * 1.1)));
    const w = h;
    if (this.fx) {
      this.fx.spawn('blinkTeleportPillar', x, groundY - 4, {
        flip: false,
        palette: RUNIC_CYAN_PALETTE,
        light: isSky ? 1.38 : 1.28,
        maxDuration: maxLife,
        extra: {
          heightWorld: height,
          isSky,
          isDomain: false,
          customDuration: maxLife
        }
      });
      this.fx.burst(x, groundY - 12, {
        count: 10,
        speedMin: 45,
        speedMax: 155,
        lifeMin: 0.14,
        lifeMax: 0.28,
        gravity: -45,
        colors: ['#ffffff', '#38bdf8', '#facc15', '#bae6fd']
      });
    }
    this.spawnVfxAnim(2, x, groundY - Math.round(h * 0.32), w, h, maxLife, {
      glowColor: 'cyan',
      foreground: false
    });
    this.spawnVfxAnim(3, x, groundY - 18, 220, 110, maxLife, {
      glowColor: isSky ? 'gold' : 'cyan',
      foreground: false
    });
  }

  spawnVfxAnim(row, x, y, w = 208, h = 208, maxLife = 0.42, opts = {}) {
    this.activeVfxAnims.push({
      row,
      x,
      y,
      w,
      h,
      age: 0,
      maxLife,
      vx: opts.vx || 0,
      vy: opts.vy || 0,
      startFrame: opts.startFrame !== undefined ? opts.startFrame : 0,
      endFrame: opts.endFrame !== undefined ? opts.endFrame : 29,
      flipX: Boolean(opts.flipX),
      foreground: Boolean(opts.foreground ?? opts.inFront),
      glowColor: opts.glowColor || 'cyan',
      followOwner: Boolean(opts.followOwner),
      offsetX: opts.offsetX || 0,
      offsetY: opts.offsetY || 0
    });
    if (this.activeVfxAnims.length > 56) this.activeVfxAnims.shift();
  }

  spawnSlashBeam(x1, y1, x2, y2, maxLife = 0.34, isGold = false) {
    if (!this.fx) return;
    this.fx.spawn('runebladeCrescentSlash', x1, y1, {
      flip: x2 < x1,
      palette: isGold ? RUNIC_GOLD_PALETTE : RUNIC_CYAN_PALETTE,
      light: 1.36,
      maxDuration: maxLife,
      extra: {
        dx: x2 - x1,
        dy: y2 - y1,
        radius: 26,
        width: 10,
        isGold,
        customDuration: maxLife
      }
    });
  }

  getEffectiveAttackRange() {
    // Every 3rd swing unleashes a long-range Glacial Crescent Sword-Wave up to 440px!
    return this.comboStep % 3 === 2 ? 440 : this.attackRange;
  }

  reflectNearbyProjectiles(game) {
    if (this.reflectedInSkill || !game?.vfx) return;
    for (const proj of game.vfx.projectiles) {
      if (
        proj.owner !== this &&
        !proj.isMeteor &&
        Math.hypot(proj.x - this.x, proj.y - (this.y - 110)) < 124
      ) {
        this.reflectedInSkill = true;
        proj.owner = this;
        proj.vx = -proj.vx * 1.25;
        proj.vy = -8;
        proj.type = 'blade_wave';
        proj.color = '#38bdf8';
        proj.coreColor = '#e0f2fe';
        if (game.audio) game.audio.play('reflect', this.x);
        game.vfx.spawnDamageText(this.x, this.y - 145, 0, false, 'AEGIS REFLECT!', '#38bdf8');
        const startA = this.facing === 1 ? -1.35 : Math.PI - 1.35;
        const endA = this.facing === 1 ? 1.35 : Math.PI + 1.35;
        game.vfx.spawnSlash(proj.x, proj.y, 92, startA, endA, '#38bdf8', 0.28);
        game.vfx.spawnBurst(proj.x, proj.y, 14, '#38bdf8', 240);
        game.vfx.spawnShockwave(proj.x, proj.y, 85, '#7dd3fc', 0.26);
        game.renderer.triggerShake(6, 0.14);

        this.spawnVfxAnim(1, proj.x, proj.y, 196, 196, 0.34, {
          startFrame: 12,
          endFrame: 29,
          flipX: this.facing < 0,
          glowColor: 'gold',
          foreground: true
        });
        this.fx?.spawn('runebladeCrescentSlash', proj.x, proj.y, {
          flip: this.facing < 0,
          palette: RUNIC_GOLD_PALETTE,
          light: 1.34,
          extra: { radius: 28, width: 10.5, isGold: true }
        });
        break;
      }
    }
  }

  startCrouch(enemy, game) {
    this.crouchCooldown = 3.2;
    this.crouchDuration = 0.96;
    this.setState('CROUCH');
    this.isCrouching = true;
    this.isDeflecting = true;
    this.reflectedInSkill = false;
    this.vx = 0;
    this.heal(8, 'RUNIC RESOLVE');
    this.reflectNearbyProjectiles(game);
    this.spawnVfxAnim(1, this.x + this.facing * 24, this.y - 88, 192, 192, 0.42, {
      followOwner: true,
      offsetX: 24,
      offsetY: -88,
      startFrame: 12,
      endFrame: 29,
      flipX: this.facing < 0,
      glowColor: 'gold',
      foreground: true
    });
    if (game && game.audio) game.audio.play('reflect', this.x);
    if (game && game.vfx) {
      game.vfx.spawnShockwave(this.x, this.groundY - 2, 74, '#38bdf8', 0.26, true);
      game.vfx.spawnGlyphBurst(this.x, this.y - 82, 5, 'steel');
      game.vfx.spawnDamageText(this.x, this.y - 128, 0, false, 'AEGIS STANCE!', '#7dd3fc');
    }
  }

  startJump(enemy, game, customDir = null) {
    this.dodgeCooldown = this.dodgeMaxCooldown * (0.86 + Math.random() * 0.28);
    this.vaultCooldown = 3.2;
    this.setState('JUMP');
    this.isInvulnerable = true;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    let dir = customDir !== null ? customDir : this.facing;
    if (this.x < 180) dir = 1;
    else if (this.x > ww - 180) dir = -1;
    this.dashDir = dir;
    this.onStartJumpVault(enemy, game, dir);
  }

  onStartJumpVault(enemy, game, dir) {
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const dist = enemy ? Math.abs(enemy.x - this.x) : 280;
    this.isFlipVault = true;
    this.flipStartX = this.x;
    this.flipAngle = 0;
    this.dashDuration = 0.62;
    this.isDeflecting = true;

    if (enemy && !enemy.isDead) {
      const toEnemy = Math.sign(enemy.x - this.x) || this.facing;
      if (dist > 210) {
        // Aggressive Rune-Knight Aerial Leap closing toward the enemy's flank!
        const target = enemy.x - toEnemy * 95;
        this.flipTargetX = Math.max(140, Math.min(ww - 140, target));
        this.dashDir = Math.sign(this.flipTargetX - this.flipStartX) || toEnemy;
      } else {
        // Tactical Rune-Knight Vault across or away from close pressure
        const openDir = this.x < 260 ? 1 : this.x > ww - 260 ? -1 : dir;
        this.flipTargetX = Math.max(140, Math.min(ww - 140, this.x + openDir * 270));
        this.dashDir = openDir;
      }
    } else {
      this.flipTargetX = Math.max(140, Math.min(ww - 140, this.x + dir * 270));
      this.dashDir = dir;
    }

    this.vx = 0;
    this.vy = 0;
    this.spawnAfterimage(this.x, this.y, this.facing, 8, 2, 0.24);
    this.spawnRuneBlinkPillar(this.x, this.groundY, 0.28, 136, false);
    if (game?.audio) game.audio.play('storm_leap', this.x);
    if (game?.vfx) {
      game.vfx.spawnShockwave(this.x, this.groundY, 98, '#38bdf8', 0.32, true);
      game.vfx.spawnGlyphBurst(this.x, this.y - 65, 6, 'steel');
      game.vfx.spawnDamageText(this.x, this.y - 135, 0, false, 'RUNIC VAULT!', '#38bdf8');
    }
  }

  onStartDash(enemy, game, dir) {
    this.isFlipVault = false;
    this.flipAngle = 0;
    this.dashDuration = 0.44;
    this.isDeflecting = true;
    this.vx = dir * 485;
    this.spawnAfterimage(this.x, this.y, this.facing, 6, 4, 0.24);
    this.fx?.burst(this.x, this.y - 78, {
      count: 10,
      speedMin: 45,
      speedMax: 145,
      lifeMin: 0.14,
      lifeMax: 0.26,
      gravity: 25,
      colors: ['#ffffff', '#38bdf8', '#facc15']
    });
    if (game?.audio) game.audio.play('storm_leap', this.x);
    if (game?.vfx) {
      game.vfx.spawnShockwave(this.x, this.y - 80, 88, '#38bdf8', 0.28, false, true);
      game.vfx.spawnGlyphBurst(this.x, this.y - 85, 6, 'steel');
      game.vfx.spawnDamageText(this.x, this.y - 140, 0, false, 'RUNE CHARGE!', '#38bdf8');
    }
  }

  onStartDodge(enemy, game, dir) {
    // Check if an enemy projectile is approaching: if so and crouch is ready, brace behind Aegis Greatshield (CROUCH)!
    let hasIncomingProjectile = false;
    if (game && game.vfx) {
      for (const proj of game.vfx.projectiles) {
        if (
          proj.owner !== this &&
          Math.abs(proj.x - this.x) < 220 &&
          Math.sign(proj.vx) === Math.sign(this.x - proj.x)
        ) {
          hasIncomingProjectile = true;
          break;
        }
      }
    }

    if (hasIncomingProjectile && this.crouchCooldown <= 0) {
      this.startCrouch(enemy, game);
      return;
    }

    // Otherwise execute the 30-frame Row 8 Valkyrie Aerial Vault & Mid-Air Frost Cleave (JUMP)!
    const smartDir = enemy && Math.abs(enemy.x - this.x) > 220 ? this.facing : dir;
    this.setState('JUMP');
    this.isInvulnerable = true;
    this.onStartJumpVault(enemy, game, smartDir);
  }

  updateDashOrDodge(dt, enemy, game) {
    const t = this.stateTimer;

    // Row 8 (30-frame JUMP — Aerial Vault & Mid-Air Downward Frost-Blade Cleave)
    if ((this.state === 'DODGE' || this.state === 'JUMP') && this.isFlipVault) {
      const u = Math.min(1, t / this.dashDuration);
      const airU = Math.max(0, Math.min(1, (u - 0.12) / 0.74));

      // Smooth horizontal glide with apex hang-time plateau during two-handed overhead Frost Cleave (airU = 0.32..0.68)
      const horizU =
        airU < 0.32
          ? (airU / 0.32) * 0.44
          : airU < 0.68
            ? 0.44 + ((airU - 0.32) / 0.36) * 0.28
            : 0.72 + ((airU - 0.68) / 0.32) * 0.28;
      this.x = this.flipStartX + (this.flipTargetX - this.flipStartX) * horizU;

      // Sleek 86px-high non-steep vault trajectory with mid-air apex plateau
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
      this.reflectNearbyProjectiles(game);

      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }

      if (airU > 0.05 && airU < 0.95 && Math.random() < 0.38) {
        this.spawnAfterimage(this.x, this.y, this.facing, 8, Math.min(29, Math.floor(u * 29)), 0.20);
      }

      // At Frame F13..F14 (u >= 0.44), Aethelgard unleashes his mid-air downward-angled Frost-Crescent Blade-Wave!
      if (u >= 0.44 && !this.didActionFrame && enemy && !enemy.isDead) {
        this.didActionFrame = true;
        if (game?.audio) game.audio.play('blade_wave', this.x);
        const sx = this.x + this.facing * 44;
        const sy = this.y - 104;
        const dx = enemy.x - sx;
        const dy = enemy.y - 92 - sy;
        const td = Math.hypot(dx, dy) || 1;
        game?.vfx?.spawnProjectile({
          x: sx,
          y: sy,
          vx: (dx / td) * 660,
          vy: (dy / td) * 660,
          radius: 18,
          color: '#38bdf8',
          coreColor: '#fef08a',
          owner: this,
          damage: 62,
          type: 'blade_wave'
        });
        const cleaveAng = Math.atan2(dy, dx);
        game?.vfx?.spawnSlash(sx, sy, 98, cleaveAng - 1.15, cleaveAng + 1.15, '#38bdf8', 0.28);
        game?.vfx?.spawnShockwave(sx, sy, 76, '#7dd3fc', 0.24, false, false);
        game?.vfx?.spawnGlyphBurst(sx, sy, 5, 'steel');

        this.fx?.spawn('runebladeCrescentSlash', sx, sy, {
          flip: this.facing < 0,
          light: 1.32,
          extra: { radius: 30, width: 11, isGold: false }
        });
        this.spawnVfxAnim(0, sx, sy, 192, 192, 0.28, {
          vx: this.facing * 240,
          flipX: this.facing < 0,
          glowColor: 'cyan',
          foreground: true
        });

        if (Math.abs(enemy.x - this.x) <= 165) {
          enemy.takeDamage(54, this, true, 115, -90);
        }
      }

      if (t >= this.dashDuration) {
        this.y = this.groundY;
        this.vy = 0;
        this.isFlipVault = false;
        this.flipAngle = 0;
        this.isDeflecting = false;
        this.isInvulnerable = false;
        game?.vfx?.spawnShockwave(this.x, this.groundY, 84, '#38bdf8', 0.26, true);
        this.setState('IDLE');
      }
      return;
    }

    // Row 6 (30-frame DASH — Runic Vanguard Assault Charge)
    const speed = this.state === 'DASH' ? 485 : 360;
    this.x += this.dashDir * speed * dt;
    this.reflectNearbyProjectiles(game);

    if (Math.random() < 0.38) {
      const u = Math.min(1, t / Math.max(0.01, this.dashDuration));
      this.spawnAfterimage(this.x, this.y, this.facing, 6, Math.min(29, Math.floor(u * 29)), 0.20);
    }

    // Vanguard Charge Thunder-Bash impact when reaching the enemy
    if (
      this.state === 'DASH' &&
      !this.didActionFrame &&
      enemy &&
      !enemy.isDead &&
      Math.abs(enemy.x - this.x) <= 142
    ) {
      this.didActionFrame = true;
      enemy.takeDamage(52, this, false, 125, -80);
      if (game?.audio) game.audio.play('heavy_cleave', enemy.x);
      this.fx?.spawn('runebladeCrescentSlash', this.x + this.facing * 40, this.y - 92, {
        flip: this.facing < 0,
        light: 1.32,
        extra: { radius: 30, width: 11, isGold: true }
      });
      this.spawnVfxAnim(4, enemy.x, enemy.y - 88, 196, 196, 0.30, {
        flipX: this.facing < 0,
        glowColor: 'cyan',
        foreground: true
      });
      game?.vfx?.spawnSlash(this.x + this.facing * 40, this.y - 95, 96, -1.2, 1.2, '#38bdf8', 0.26);
      game?.vfx?.spawnShockwave(enemy.x, enemy.y - 85, 95, '#38bdf8', 0.28);
      game?.vfx?.spawnLightning(enemy.x, this.groundY - 210, this.groundY, '#ffffff', '#38bdf8');
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
    this.isCrouching = t < dur * 0.82;
    this.isDeflecting = this.isCrouching;

    if (t < 0.62) {
      this.reflectNearbyProjectiles(game);
    }

    // Frame F13 (t >= 0.42s): Low Two-Handed Frost-Crescent Counter-Slash out of Cross-Guard Parry!
    if (t >= 0.42 && !this.didActionFrame) {
      this.didActionFrame = true;
      this.vx += this.facing * 95;
      if (game?.audio) game.audio.play('blade_wave', this.x);

      const spawnX = this.x + this.facing * 48;
      const spawnY = this.y - 92;
      game?.vfx?.spawnProjectile({
        x: spawnX,
        y: spawnY,
        vx: this.facing * 655,
        vy: 0,
        radius: 19,
        color: '#38bdf8',
        coreColor: '#fef08a',
        owner: this,
        damage: 68,
        type: 'blade_wave'
      });

      this.fx?.spawn('runebladeCrescentSlash', spawnX, spawnY, {
        flip: this.facing < 0,
        light: 1.34,
        extra: { radius: 32, width: 11.5, isGold: true }
      });
      this.spawnVfxAnim(0, spawnX, spawnY, 196, 196, 0.28, {
        vx: this.facing * 250,
        flipX: this.facing < 0,
        glowColor: 'cyan',
        foreground: true
      });

      const cAng = this.facing === 1 ? 0 : Math.PI;
      game?.vfx?.spawnSlash(spawnX, spawnY, 96, cAng - 1.15, cAng + 1.15, '#38bdf8', 0.26);
      game?.vfx?.spawnShockwave(spawnX, spawnY, 72, '#7dd3fc', 0.26, false, true);
      game?.vfx?.spawnGlyphBurst(spawnX, spawnY, 5, 'steel');

      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= this.attackRange + 45) {
        enemy.takeDamage(64, this, true, 110, -70);
      }
    }

    if (t >= dur) {
      this.isCrouching = false;
      this.isDeflecting = false;
      this.setState('IDLE');
    }
  }

  updateCustomVfx(dt) {
    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      this.afterimages[i].age += dt;
      if (this.afterimages[i].age >= this.afterimages[i].maxLife) {
        this.afterimages.splice(i, 1);
      }
    }
    for (let i = this.activeVfxAnims.length - 1; i >= 0; i--) {
      const v = this.activeVfxAnims[i];
      v.age += dt;
      if (v.followOwner) {
        v.x = this.x + v.offsetX * this.facing;
        v.y = this.y + v.offsetY;
      } else {
        v.x += v.vx * dt;
        v.y += v.vy * dt;
      }
      if (v.age >= v.maxLife) {
        this.activeVfxAnims.splice(i, 1);
      }
    }

    // Step Big Slashes of Justice
    for (let i = this.justiceSlashes.length - 1; i >= 0; i--) {
      const s = this.justiceSlashes[i];
      s.age += dt;
      if (s.age >= s.maxLife) {
        this.justiceSlashes.splice(i, 1);
      }
    }

    // Step 5-Second Stage-Wide Floating Bluish Feathers
    if (this.justiceFeatherTimer > 0) {
      this.justiceFeatherTimer = Math.max(0, this.justiceFeatherTimer - dt);
    }
    for (let i = this.justiceFeathers.length - 1; i >= 0; i--) {
      const f = this.justiceFeathers[i];
      f.age += dt;
      f.x += (f.vx + Math.sin(f.age * f.swayFreq + f.phase) * f.swayAmp) * dt;
      f.y += f.vy * dt;
      if (f.y > this.groundY - 6) {
        f.y = this.groundY - 420 - Math.random() * 80;
        f.x = 60 + Math.random() * 1080;
      }
      if (f.age >= f.maxLife) {
        this.justiceFeathers.splice(i, 1);
      }
    }
  }

  update(dt, enemy, game) {
    this.crouchCooldown = Math.max(0, this.crouchCooldown - dt);
    this.vaultCooldown = Math.max(0, this.vaultCooldown - dt);
    this.updateCustomVfx(dt);

    if (this.fx) {
      if (!this.isDead && !this.haloFxSlot) {
        this.haloFxSlot = this.fx.spawn('runicVanguardAura', this.x, this.groundY - 4, {
          follow: this,
          useGroundY: true,
          offsetX: 0,
          offsetY: -4,
          flip: this.facing < 0,
          light: 1.15,
          extra: { radius: 24, isAegis: false }
        });
      }
      if (this.haloFxSlot) {
        this.haloFxSlot.inst.cfg.isAegis = Boolean(this.isDeflecting || this.isCrouching);
        this.haloFxSlot.inst.cfg.radius = this.isDeflecting ? 28 : 24;
        if (this.isDead) {
          this.haloFxSlot.inst.release();
          this.haloFxSlot = null;
        }
      }
      this.fx.update(dt);
    }

    if (!this.isDead && this.state === 'WALK') {
      this.stepDustTimer += dt;
      if (this.stepDustTimer >= 0.32) {
        this.stepDustTimer = 0;
        if (game?.audio) game.audio.play('footstep_steel', this.x);
        this.fx?.burst(this.x - this.facing * 14, this.groundY - 2, {
          count: 4,
          speedMin: 28,
          speedMax: 78,
          lifeMin: 0.14,
          lifeMax: 0.26,
          gravity: 30,
          colors: ['#ffffff', '#38bdf8', '#facc15']
        });
      }
    }

    if (
      enemy &&
      !enemy.isDead &&
      (this.state === 'IDLE' || this.state === 'WALK') &&
      (this.finisherGauge || 0) < (this.maxFinisherGauge || 100)
    ) {
      const dist = Math.abs(enemy.x - this.x);

      // 1. Defensive Aegis Crouch & Frost-Crescent Counter-Slash when enemy projectiles approach or at mid-range (185..340px)
      let projectileApproaching = false;
      if (game && game.vfx) {
        for (const proj of game.vfx.projectiles) {
          if (
            proj.owner !== this &&
            Math.abs(proj.x - this.x) < 235 &&
            Math.sign(proj.vx) === Math.sign(this.x - proj.x)
          ) {
            projectileApproaching = true;
            break;
          }
        }
      }
      if (
        this.crouchCooldown <= 0 &&
        (projectileApproaching || (dist >= 195 && dist <= 340 && this.autoCooldown > 0.25 && Math.random() < 0.04))
      ) {
        this.startCrouch(enemy, game);
        return;
      }

      // 2. Runic Aerial Vault (Row 8 JUMP) to close mid-far distance (250..410px) with an aerial Frost-Crescent cleave!
      if (
        dist >= 250 &&
        dist <= 410 &&
        this.vaultCooldown <= 0 &&
        this.dodgeCooldown <= 0 &&
        this.skillCooldown > 0.6
      ) {
        this.startJump(enemy, game, this.facing);
        return;
      }
    }

    super.update(dt, enemy, game);
  }

  updateAutoAttack(dt, enemy, game) {
    const t = this.stateTimer;
    const mode = this.comboStep % 3;

    if (t < 0.32) {
      // Row 2 Frames F00..F09: Progressive overhead/back-shoulder windup + frost-gold rune charge
      this.torsoAngle = -this.facing * 0.24 * (t / 0.32);
    } else if (t < 0.68) {
      // Row 2 Frames F10..F18: Explosive forward Runeblade cleave & Frost-Crescent slash arc
      if (!this.didActionFrame) {
        this.didActionFrame = true;
        this.comboStep++;
        this.vx += this.facing * 165;
        this.torsoVel = this.facing * 13;

        const cx = this.x + this.facing * 42;
        const cy = this.y - 96;

        if (this.fx) {
          this.fx.spawn('runebladeCrescentSlash', cx, cy, {
            flip: this.facing < 0,
            palette: mode === 1 ? RUNIC_GOLD_PALETTE : RUNIC_CYAN_PALETTE,
            light: mode === 2 ? 1.38 : 1.24,
            extra: {
              radius: mode === 2 ? 34 : 28,
              width: mode === 2 ? 12.5 : 10.5,
              isGold: mode === 1,
              groundWrap: mode === 2
            }
          });
        }

        if (mode === 2) {
          // Combo Finisher (Strike 3): Launches a Ranged Glacial Crescent Sword-Wave across the arena!
          if (game?.audio) game.audio.play('blade_wave', this.x);
          game?.vfx?.spawnDamageText(this.x, this.y - 145, 0, false, 'FROST CRESCENT!', '#38bdf8');
          game?.vfx?.spawnProjectile({
            x: this.x + this.facing * 54,
            y: this.y - 106,
            vx: this.facing * 635,
            vy: 0,
            radius: 20,
            color: '#38bdf8',
            coreColor: '#e0f2fe',
            owner: this,
            damage: 66,
            type: 'blade_wave'
          });
          this.spawnVfxAnim(0, cx + this.facing * 14, cy, 196, 196, 0.30, {
            vx: this.facing * 255,
            flipX: this.facing < 0,
            glowColor: 'cyan',
            foreground: true
          });
        } else {
          if (game?.audio) game.audio.play(mode === 1 ? 'heavy_cleave' : 'slash', this.x);
        }

        game?.vfx?.spawnGlyphBurst(cx, cy, 5, 'steel');

        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= this.attackRange + 50) {
          const isCrit = mode === 2 || Math.random() < 0.25;
          const dmg = mode === 2 ? 78 : mode === 1 ? 66 : 59;
          enemy.takeDamage(dmg, this, isCrit, 115, mode === 2 ? -130 : 0);
          if (game?.audio) game.audio.play(isCrit ? 'hit_crit' : 'clang', enemy.x);
          if (game?.renderer) game.renderer.triggerHitStop(0.06);
          this.spawnVfxAnim(4, enemy.x, enemy.y - 92, 196, 196, 0.28, {
            flipX: this.facing < 0,
            glowColor: isCrit ? 'gold' : 'cyan',
            foreground: true
          });
          game?.vfx?.spawnGlyphBurst(enemy.x, enemy.y - 95, 5, 'steel');
          if (isCrit || mode === 1) {
            game?.vfx?.spawnLightning(enemy.x, -140, this.groundY, '#ffffff', '#38bdf8');
          }
        }
      }
    } else if (t >= 0.96) {
      this.setState('IDLE');
    }
  }

  updateSkill(dt, enemy, game) {
    // RUNE KNIGHT SKILL: "TEMPEST VANGUARD" (Synced 1:1 to Row 3 F00..F29 across skillDuration = 1.04s)
    // Phase 0 (0.00s - 0.104s -> F00..F02): Grounded Elder-Rune Windup Coil
    // Phase 1 (0.104s - 0.624s -> F03..F17): 2.5-Revolution 360° Whirlwind Spin-Slash Rush + Spell Reflection!
    // Phase 2 (0.624s - 1.040s -> F18..F29): Leaping Thunder-Breaker Overhead Runeblade Slam + Glacial Spires!
    const t = this.stateTimer;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    this.isDeflecting = t >= 0.08 && t <= 0.86;
    if (t >= 0.08 && t <= 0.64) {
      this.reflectNearbyProjectiles(game);
    }

    if (t < 0.104) {
      this.didSlamFinisher = false;
      this.reflectedInSkill = false;
      this.spinHitStep = 0;
      this.afterimageAccum = 0;
      this.vx = 0;
      this.y = this.groundY;
      this.torsoAngle = -this.facing * 0.18;
      return;
    }

    // Phase 1 (F03..F17): Multi-Revolution 360° Runic Cyclone Spin-Slash!
    if (t < 0.624) {
      this.y = this.groundY;
      if (!this.didActionFrame) {
        this.didActionFrame = true;
        if (game?.audio) game.audio.play('whirlwind', this.x);
        if (this.fx) {
          this.fx.spawn('tempestCycloneRing', this.x, this.y - 84, {
            follow: this,
            offsetX: 0,
            offsetY: -84,
            flip: this.facing < 0,
            light: 1.34
          });
        }
        this.spawnVfxAnim(3, this.x, this.groundY - 18, 220, 110, 0.48, {
          followOwner: true,
          offsetX: 0,
          offsetY: -18,
          glowColor: 'cyan',
          foreground: false
        });
        game?.vfx?.spawnDamageText(this.x, this.y - 148, 0, false, 'CYCLONE SLASH!', '#38bdf8');
        game?.vfx?.spawnGlyphBurst(this.x, this.y - 95, 8, 'steel');
      }

      // Spin angle tracks the exact 2.5 full revolutions across 0.52s
      const spinU = (t - 0.104) / 0.52;
      this.spinAngle = spinU * Math.PI * 5.0;

      if (enemy && !enemy.isDead) {
        const dx = enemy.x - this.x;
        const distToEnemy = Math.abs(dx);
        if (distToEnemy > 26) {
          this.facing = dx >= 0 ? 1 : -1;
        }
        const rushSpeed = distToEnemy > 88 ? 445 : 125;
        this.x = Math.max(85, Math.min(ww - 85, this.x + this.facing * rushSpeed * dt));
      } else {
        this.x = Math.max(85, Math.min(ww - 85, this.x + this.facing * 260 * dt));
      }

      // Crisp 30fps spinning Rune-Knight afterimage ribbon
      this.afterimageAccum += dt;
      if (this.afterimageAccum >= 0.044) {
        this.afterimageAccum = 0;
        const col = Math.min(17, Math.max(3, Math.floor((t / this.skillDuration) * 30)));
        this.spawnAfterimage(this.x, this.y, this.facing, 3, col, 0.24);
      }

      // 3 distinct 360° Whirlwind Cleave Hits (at 0.14s, 0.31s, 0.48s) that pull enemies inward!
      const hitTimes = [0.14, 0.31, 0.48];
      if (this.spinHitStep < 3 && t >= hitTimes[this.spinHitStep]) {
        this.spinHitStep++;
        this.fx?.spawn('runebladeCrescentSlash', this.x, this.y - 88, {
          flip: this.spinHitStep % 2 === 0,
          palette: this.spinHitStep === 2 ? RUNIC_GOLD_PALETTE : RUNIC_CYAN_PALETTE,
          light: 1.28,
          extra: {
            radius: 34,
            width: 11,
            eccentricity: 0.34,
            isGold: this.spinHitStep === 2
          }
        });
        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 148) {
          // Gently pull foe inward toward the cyclone eye so all 3 spin slashes + slam connect!
          enemy.takeDamage(18, this, false, -35, -24);
          if (game?.audio) game.audio.play('clang', enemy.x);
          this.spawnVfxAnim(4, enemy.x, enemy.y - 90, 192, 192, 0.26, {
            flipX: this.spinHitStep % 2 === 0,
            glowColor: 'cyan',
            foreground: true
          });
          game?.vfx?.spawnGlyphBurst(enemy.x, enemy.y - 92, 4, 'steel');
        }
      }
      return;
    }

    // Phase 2A (0.624s - 0.695s -> F18..F19): Short Thunder-Hop raising Runeblade overhead!
    if (t < 0.695) {
      const hopU = (t - 0.624) / 0.071;
      this.y = this.groundY - Math.sin(hopU * Math.PI) * 38;
      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }
      return;
    }

    // Phase 2B (t >= 0.695s -> F20..F29): Thunder-Breaker Overhead Greatsword Slam + Grounded Glacial Frost-Crystal Spires!
    this.y = this.groundY;
    if (!this.didSlamFinisher) {
      this.didSlamFinisher = true;
      if (game?.audio) game.audio.play('thunder_slam', this.x);
      game?.renderer?.triggerShake(15, 0.32);
      game?.renderer?.triggerHitStop(0.055);

      const dir = this.facing;
      const slamX = this.x + dir * 52;
      if (this.fx) {
        this.fx.spawn('runebladeCrescentSlash', slamX, this.groundY - 88, {
          flip: dir < 0,
          light: 1.38,
          extra: {
            radius: 34,
            width: 12.5,
            isGold: false,
            groundWrap: true
          }
        });
        this.fx.spawn('earthshatterJudgmentWave', slamX, this.groundY - 2, {
          flip: dir < 0,
          light: 1.36,
          extra: { isUltimate: false }
        });
      }
      // Ground-planted Glacial Frost-Crystal Spire clusters (baseY = +34 in 104x104 -> center at groundY - round(h * 34 / 104))
      this.spawnVfxAnim(2, slamX, this.groundY - 77, 236, 236, 0.42, {
        flipX: dir < 0,
        glowColor: 'cyan',
        foreground: false
      });
      this.spawnVfxAnim(2, slamX + dir * 72, this.groundY - 68, 208, 208, 0.44, {
        flipX: dir < 0,
        glowColor: 'cyan',
        foreground: false
      });
      this.spawnVfxAnim(3, slamX, this.groundY - 18, 240, 120, 0.44, {
        flipX: dir < 0,
        glowColor: 'cyan',
        foreground: false
      });
      this.spawnVfxAnim(4, slamX, this.groundY - 96, 212, 212, 0.34, {
        flipX: dir < 0,
        glowColor: 'gold',
        foreground: true
      });
      game?.vfx?.spawnLightning(slamX, -220, this.groundY, '#ffffff', '#38bdf8');

      if (enemy && !enemy.isDead && Math.abs(enemy.x - slamX) < 198) {
        enemy.takeDamage(68, this, true, 135, -155);
      }
    } else if (t >= this.skillDuration) {
      this.isDeflecting = false;
      this.spinHitStep = 0;
      this.y = this.groundY;
      this.setState('IDLE');
    }
  }

  updateUltimate(dt, enemy, game) {
    // RUNE KNIGHT ULTIMATE ART: "HEAVENLY EARTHSHATTER" (ultDuration = 1.86s, Row 4 F00..F29)
    // Stage 0 (0.000s - 0.186s, F00..F02): Elder-Rune Domain Ignition & Blink Coil
    // Stage 1 (0.186s - 0.496s, F03..F07): Teleport LEFT of enemy -> Wide Horizontal Runeblade Cleave!
    // Stage 2 (0.496s - 0.806s, F08..F12): Teleport RIGHT of enemy -> Reverse Rising Cross-Slash!
    // Stage 3 (0.806s - 1.054s, F13..F16): Teleport LEFT Flank -> Heavy Launching Runic Slash!
    // Stage 4 (1.054s - 1.364s, F17..F21): Teleport DIRECTLY ABOVE (TOP) -> Skyward Elder-Rune Charge!
    // Stage 5 (1.364s - 1.860s, F22..F29): Meteoric Top-Down Vertical Slash Plunge & Chaining Glacial Frost-Crystal Spire Wave!
    const t = this.stateTimer;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const clampX = (xv) => Math.max(95, Math.min(ww - 95, xv));
    this.isInvulnerable = true;
    this.isFlipVault = false;
    this.vx = 0;
    this.vy = 0;

    if (!this._ultInit) {
      this._ultInit = true;
      this.ultSlashStep = 0;
      this.ultPlungeAfterimageStep = 0;
      this.ultStartX = this.x;
      this._ultTargetX = enemy ? enemy.x : clampX(this.x + this.facing * 200);
      this.isOmnislashing = true;

      // Ignite 2.5D Elder-Rune Sanctuary Domain on the arena floor!
      this.fx?.spawn('blinkTeleportPillar', this._ultTargetX, this.groundY - 4, {
        flip: false,
        palette: RUNIC_CYAN_PALETTE,
        light: 1.38,
        maxDuration: 1.65,
        extra: {
          isDomain: true,
          customDuration: 1.65
        }
      });
      this.spawnVfxAnim(3, this._ultTargetX, this.groundY - 18, 260, 124, 1.48, {
        glowColor: 'cyan',
        foreground: false
      });
      this.spawnRuneBlinkPillar(this.x, this.groundY, 0.36, 178, false);
      game?.vfx?.spawnGlyphBurst(this.x, this.groundY - 84, 8, 'steel');
    }

    if (enemy && !enemy.isDead) {
      this._ultTargetX = enemy.x;
    }
    const targetX = this._ultTargetX !== undefined ? this._ultTargetX : ww * 0.5;

    // STAGE 0 (0.000s - 0.186s, F00..F02): Grounded Elder-Rune Awakening
    if (t < 0.186) {
      this.y = this.groundY;
      this.facing = targetX >= this.x ? 1 : -1;
      return;
    }

    // STAGE 1 (0.186s - 0.496s, F03..F07): TELEPORT LEFT -> Wide Horizontal Cleave!
    if (t < 0.496) {
      this.y = this.groundY;
      const leftBaseX = clampX(targetX - 118);
      if (this.ultSlashStep < 1) {
        this.ultSlashStep = 1;
        this.spawnAfterimage(this.x, this.y, this.facing, 4, 2, 0.32);
        this.spawnRuneBlinkPillar(this.x, this.groundY, 0.32, 184, false);
        this.x = leftBaseX;
        this.facing = targetX >= this.x ? 1 : -1;
        this.dashDir = this.facing;
        this.spawnRuneBlinkPillar(this.x, this.groundY, 0.34, 184, false);
        if (game?.audio) game.audio.play('storm_leap', this.x);
      }

      // Lunge slightly inward across F04..F06 & unleash Left Horizontal Slash!
      const u = Math.min(1, Math.max(0, (t - 0.22) / 0.16));
      this.x = clampX(leftBaseX + this.facing * 26 * u);
      if (t >= 0.27 && this.ultSlashStep < 2) {
        this.ultSlashStep = 2;
        this.spawnAfterimage(leftBaseX, this.groundY, this.facing, 4, 5, 0.38);
        this.spawnSlashBeam(targetX - 125, this.groundY - 124, targetX + 125, this.groundY - 76, 0.42, false);
        this.spawnVfxAnim(4, targetX, this.groundY - 98, 208, 208, 0.30, {
          flipX: false,
          glowColor: 'cyan',
          foreground: true
        });
        if (this.fx) {
          this.fx.spawn('runebladeCrescentSlash', targetX, this.groundY - 98, {
            flip: false,
            light: 1.38,
            extra: { radius: 34, width: 12, isGold: false }
          });
        }
        if (game?.audio) game.audio.play('slash', targetX);
        game?.renderer?.triggerShake(10, 0.14);
        game?.vfx?.spawnDamageText(targetX, this.groundY - 162, 0, false, 'RUNE BLINK: LEFT!', '#7dd3fc');
        if (enemy && !enemy.isDead) {
          enemy.takeDamage(30, this, false, 18, -32);
        }
      }
      return;
    }

    // STAGE 2 (0.496s - 0.806s, F08..F12): TELEPORT RIGHT -> Reverse Rising Cross-Slash!
    if (t < 0.806) {
      this.y = this.groundY;
      const rightBaseX = clampX(targetX + 118);
      if (this.ultSlashStep < 3) {
        this.ultSlashStep = 3;
        this.spawnAfterimage(this.x, this.y, this.facing, 4, 7, 0.34);
        this.spawnRuneBlinkPillar(this.x, this.groundY, 0.32, 184, false);
        this.x = rightBaseX;
        this.facing = targetX <= this.x ? -1 : 1;
        this.dashDir = this.facing;
        this.spawnRuneBlinkPillar(this.x, this.groundY, 0.34, 184, false);
        if (game?.audio) game.audio.play('storm_leap', this.x);
      }

      const u = Math.min(1, Math.max(0, (t - 0.54) / 0.16));
      this.x = clampX(rightBaseX + this.facing * 26 * u);
      if (t >= 0.59 && this.ultSlashStep < 4) {
        this.ultSlashStep = 4;
        this.spawnAfterimage(rightBaseX, this.groundY, this.facing, 4, 10, 0.38);
        this.spawnSlashBeam(targetX + 126, this.groundY - 68, targetX - 126, this.groundY - 142, 0.42, true);
        this.spawnVfxAnim(4, targetX, this.groundY - 104, 212, 212, 0.30, {
          flipX: true,
          glowColor: 'gold',
          foreground: true
        });
        if (this.fx) {
          this.fx.spawn('runebladeCrescentSlash', targetX, this.groundY - 104, {
            flip: true,
            palette: RUNIC_GOLD_PALETTE,
            light: 1.4,
            extra: { radius: 35, width: 12, isGold: true }
          });
        }
        if (game?.audio) game.audio.play('heavy_cleave', targetX);
        game?.renderer?.triggerShake(12, 0.16);
        game?.vfx?.spawnDamageText(targetX, this.groundY - 168, 0, false, 'RUNE BLINK: RIGHT!', '#38bdf8');
        if (enemy && !enemy.isDead) {
          enemy.takeDamage(32, this, true, -18, -48);
        }
      }
      return;
    }

    // STAGE 3 (0.806s - 1.054s, F13..F16): TELEPORT FLANK -> Heavy Launching Cross-Slash!
    if (t < 1.054) {
      this.y = this.groundY;
      const flankBaseX = clampX(targetX - 112);
      if (this.ultSlashStep < 5) {
        this.ultSlashStep = 5;
        this.spawnAfterimage(this.x, this.y, this.facing, 4, 12, 0.34);
        this.spawnRuneBlinkPillar(this.x, this.groundY, 0.32, 184, false);
        this.x = flankBaseX;
        this.facing = targetX >= this.x ? 1 : -1;
        this.dashDir = this.facing;
        this.spawnRuneBlinkPillar(this.x, this.groundY, 0.34, 184, false);
      }

      const u = Math.min(1, Math.max(0, (t - 0.84) / 0.14));
      this.x = clampX(flankBaseX + this.facing * 28 * u);
      if (t >= 0.89 && this.ultSlashStep < 6) {
        this.ultSlashStep = 6;
        this.spawnAfterimage(flankBaseX, this.groundY, this.facing, 4, 15, 0.38);
        this.spawnSlashBeam(targetX - 118, this.groundY - 64, targetX + 118, this.groundY - 148, 0.42, false);
        this.spawnVfxAnim(1, targetX, this.groundY - 98, 212, 212, 0.34, {
          startFrame: 12,
          endFrame: 29,
          glowColor: 'gold',
          foreground: true
        });
        this.spawnVfxAnim(4, targetX, this.groundY - 102, 216, 216, 0.32, {
          flipX: false,
          glowColor: 'cyan',
          foreground: true
        });
        if (game?.audio) game.audio.play('slash', targetX);
        game?.renderer?.triggerShake(13, 0.16);
        game?.vfx?.spawnGlyphBurst(targetX, this.groundY - 102, 8, 'steel');
        game?.vfx?.spawnDamageText(targetX, this.groundY - 172, 0, false, 'RUNIC LAUNCH!', '#fef08a');
        if (enemy && !enemy.isDead) {
          enemy.takeDamage(34, this, true, 12, -165);
        }
      }
      return;
    }

    // STAGE 4 (1.054s - 1.364s, F17..F21): TELEPORT DIRECTLY ABOVE (TOP!) & Skyward Elder-Rune Charge!
    if (t < 1.364) {
      const hoverU = (t - 1.054) / 0.31;
      const apexX = clampX(targetX - this.facing * 26);
      const apexY = this.groundY - 214 - Math.sin(hoverU * Math.PI * 0.5) * 12;

      if (this.ultSlashStep < 7) {
        this.ultSlashStep = 7;
        // Departure & arrival Glacial Frost-Crystal Pillars planted firmly on the arena floor (`this.groundY`)!
        this.spawnAfterimage(this.x, this.groundY, this.facing, 4, 15, 0.34);
        this.spawnRuneBlinkPillar(this.x, this.groundY, 0.36, 210, false);
        this.facing = targetX >= apexX ? 1 : -1;
        this.x = apexX;
        this.y = apexY;
        this.spawnRuneBlinkPillar(this.x, this.groundY, 0.42, 165, true);
        this.spawnVfxAnim(3, this.x, this.groundY - 18, 240, 120, 0.42, {
          glowColor: 'gold',
          foreground: false
        });
        if (game?.audio) game.audio.play('storm_leap', this.x);
        game?.vfx?.spawnLightning(this.x, this.y - 160, this.groundY, '#ffffff', '#38bdf8');
        game?.vfx?.spawnDamageText(this.x, this.y - 148, 0, true, '★ HEAVENLY RUNE SLASH! ★', '#fef08a');
      }

      this.x = apexX;
      this.y = apexY;
      return;
    }

    // STAGE 5A (1.364s - 1.488s, F22..F23): METEORIC TOP-DOWN VERTICAL SLASH PLUNGE!
    if (t < 1.488) {
      const diveU = Math.min(1, Math.max(0, (t - 1.364) / 0.124));
      const easeIn = diveU * diveU;
      const apexX = clampX(targetX - this.facing * 26);
      this.x = apexX;
      this.y = this.groundY - 226 + 226 * easeIn;

      // Spawn a vertical column of 4 crisp downward-slashing Rune-Knight afterimages!
      const wantStep = Math.floor(diveU * 4) + 1;
      if (this.ultPlungeAfterimageStep < wantStep) {
        this.ultPlungeAfterimageStep = wantStep;
        this.spawnAfterimage(this.x, this.y, this.facing, 4, 23, 0.36);
        if (wantStep === 1) {
          this.spawnSlashBeam(targetX, this.groundY - 290, targetX, this.groundY - 8, 0.48, true);
        }
      }
      return;
    }

    // STAGE 5B (1.488s - 1.860s, F24..F29): EARTHSHATTER IMPACT — Chaining Grounded Glacial Frost-Crystal Spires + Twin Blade Waves!
    this.y = this.groundY;
    this.isOmnislashing = false;

    if (!this.didActionFrame) {
      this.didActionFrame = true;
      if (game?.audio) game.audio.play('earthshatter', this.x);

      game?.renderer?.triggerShake(28, 0.65);
      game?.renderer?.triggerAberration(16);
      game?.renderer?.triggerHitStop(0.095);

      const dir = this.facing;
      const slamX = this.x + dir * 44;

      // 1. Chaining Wave of 5 Ground-Planted Glacial Frost-Crystal Spire Eruptions along `this.groundY`!
      //    Rear flanking cluster at `slamX - dir * 75`, plus 4 forward marching clusters at `slamX + dir * (i * 82)` (`i = 0..3`).
      //    Each Row 2 (`skyJudgmentBladePillarCell`) is centered at `this.groundY - Math.round(spireH * 0.32)` so its
      //    `baseY = +34` crystal crater sits 100% flush in `this.groundY` (the ground)!
      const backSpireX = clampX(slamX - dir * 75);
      const backSpireH = 220;
      this.fx?.spawn('earthshatterJudgmentWave', backSpireX, this.groundY - 2, {
        flip: dir > 0,
        light: 1.38,
        extra: { isUltimate: true }
      });
      this.spawnVfxAnim(
        2,
        backSpireX,
        this.groundY - Math.round(backSpireH * 0.32),
        backSpireH,
        backSpireH,
        0.54,
        {
          flipX: dir > 0,
          glowColor: 'cyan',
          foreground: false
        }
      );

      for (let i = 0; i < 4; i++) {
        const spireX = clampX(slamX + dir * (i * 82));
        const spireH = 260 - i * 16;
        const spireW = spireH;
        this.fx?.spawn('earthshatterJudgmentWave', spireX, this.groundY - 2, {
          flip: dir < 0,
          light: 1.45,
          extra: { isUltimate: true }
        });
        this.spawnVfxAnim(
          2,
          spireX,
          this.groundY - Math.round(spireH * 0.32),
          spireW,
          spireH,
          0.54 + i * 0.05,
          {
            flipX: dir < 0,
            glowColor: i % 2 === 1 ? 'gold' : 'cyan',
            foreground: false
          }
        );
      }

      // Ground-planted Sanctuary Seal at impact center + Aegis/Starburst impact flashes on target
      this.spawnVfxAnim(3, slamX, this.groundY - 18, 260, 124, 0.56, {
        glowColor: 'cyan',
        foreground: false
      });
      this.spawnVfxAnim(1, targetX, this.groundY - 96, 236, 236, 0.48, {
        startFrame: 12,
        endFrame: 29,
        glowColor: 'gold',
        foreground: true
      });
      this.spawnVfxAnim(4, targetX, this.groundY - 94, 232, 232, 0.44, {
        glowColor: 'cyan',
        foreground: true
      });

      // 2. Twin Horizontal Piercing Frost-Crescent Blade Waves tearing across the stone!
      [0, 1].forEach((idx) => {
        game?.vfx?.spawnProjectile({
          x: slamX + dir * (idx * 34),
          y: this.groundY - 98 - idx * 24,
          vx: dir * (740 - idx * 80),
          vy: 0,
          radius: 22 - idx * 3,
          color: idx === 0 ? '#38bdf8' : '#7dd3fc',
          coreColor: '#ffffff',
          owner: this,
          damage: 45,
          type: 'blade_wave',
          isMeteor: false,
          isUltimate: true
        });
      });

      game?.vfx?.spawnGlyphBurst(slamX, this.groundY - 75, 12, 'steel');

      if (enemy && !enemy.isDead) {
        enemy.takeDamage(165, this, true, 220, -320);
      }
    } else if (t >= this.ultDuration) {
      this._ultInit = false;
      this.isOmnislashing = false;
      this.isInvulnerable = false;
      this.y = this.groundY;
      this.setState('IDLE');
    }
  }

  /**
   * Spawns a colossal multi-layered "Slash of Justice" across `(x1, y1) -> (x2, y2)`
   * using a 3-node cascade of 30fps `warrior_vfx.png` Row 0 Crescent Blade Waves & Row 4 Starburst Novas
   * (ZERO straight laser beams or old stepped rectangle blocks!).
   */
  spawnJusticeGreatSlash(x1, y1, x2, y2, maxLife = 0.58, isGoldAccent = false, game = null) {
    const mx = (x1 + x2) * 0.5;
    const my = (y1 + y2) * 0.5;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const flipX = x2 < x1;
    this.justiceSlashes.push({
      x1,
      y1,
      x2,
      y2,
      mx,
      my,
      angle,
      flipX,
      age: 0,
      maxLife,
      isGoldAccent
    });

    // 3-Node Cascade of 30fps `warrior_vfx.png` Row 0 (Runic Crescent Wave) & Row 4 (Starburst Nova) along the slash!
    const glowCol = isGoldAccent ? 'gold' : 'cyan';
    for (const uPos of [0.22, 0.50, 0.78]) {
      const sx = x1 + (x2 - x1) * uPos;
      const sy = y1 + (y2 - y1) * uPos;
      const sz = uPos === 0.50 ? 292 : 236;
      this.spawnVfxAnim(0, sx, sy, sz, sz, maxLife, {
        flipX,
        glowColor: glowCol,
        foreground: true
      });
    }
    this.spawnVfxAnim(4, mx, my, 264, 264, maxLife * 0.90, {
      flipX,
      glowColor: glowCol,
      foreground: true
    });
    this.fx?.burst(mx, my, {
      count: 20,
      speedMin: 65,
      speedMax: 225,
      lifeMin: 0.18,
      lifeMax: 0.40,
      gravity: -20,
      colors: ['#ffffff', '#e0f2fe', '#7dd3fc', '#38bdf8', '#fef08a']
    });

    if (game?.vfx) {
      const col = isGoldAccent ? '#fef08a' : '#7dd3fc';
      game.vfx.spawnSlash?.(mx, my, 195, angle - 1.25, angle + 1.25, '#ffffff', maxLife * 0.82);
      game.vfx.spawnSlash?.(mx, my, 230, angle - 1.38, angle + 1.38, '#38bdf8', maxLife * 0.92);
      game.vfx.spawnShockwave?.(mx, my, 155, col, 0.38, false, true);
      game.vfx.spawnBurst?.(mx, my, 22, '#e0f2fe', 270, { upBias: 65, size: 7, additive: true });
      game.vfx.spawnGlyphBurst?.(mx, my, 8, 'steel');
    }
  }

  /**
   * Fills the ENTIRE 1200px stage with 92 floating, swaying, glowing pixel-art White & Ice-Blue Archangel Feathers
   * that linger across the whole stage for `durationSec` (~5.2 seconds after landing!).
   */
  triggerStageWideBluishFeathers(durationSec = 5.2, ww = 1200) {
    this.justiceFeatherTimer = Math.max(this.justiceFeatherTimer, durationSec);
    this.justiceFeathers = [];
    const count = 92;
    for (let i = 0; i < count; i++) {
      const laneX = 40 + ((i * 12.6) % (ww - 80)) + (Math.random() - 0.5) * 24;
      const startY = this.groundY - 20 - ((i * 39) % 480);
      this.justiceFeathers.push({
        x: laneX,
        y: startY,
        vx: (Math.random() - 0.5) * 20,
        vy: 20 + (i % 5) * 6.5,
        swayFreq: 2.2 + (i % 4) * 0.45,
        swayAmp: 24 + (i % 5) * 8,
        phase: i * 0.83,
        size: i % 3 === 0 ? 1.35 : i % 2 === 0 ? 1.1 : 0.9,
        tiltDir: i % 2 === 0 ? 1 : -1,
        isIceBright: i % 2 === 0,
        age: 0,
        maxLife: durationSec + (i % 6) * 0.2
      });
    }
  }

  /**
   * SUPREME FINISHING MOVE ("ULTIMATE" Gauge): "CELESTIAL SWORD OF JUSTICE" (`trueUltDuration = 4.50s`)
   *   1. Phase 1 (`0.00s - 2.35s`): 2.35-Second Sacred Knight's Vow Choreography on the ground (`this.groundY`),
   *      transforming the stage into the "CELESTIAL SANCTUARY OF JUSTICE" (`arena_sanctuary.png`), erupting
   *      flanking Frost-Crystal Spires, and unfurling authentic 30fps Feathered Archangel Wings (`seraphim_wings.png`).
   *   2. Phase 2 (`2.35s - 3.45s`): Teleports HIGH TO THE TOP OF THE STAGE (`this.groundY - 410`), unfurls
   *      Colossal 30fps Feathered White-Blue Archangel Wings (`seraphim_wings.png`), angles his body & glowing
   *      Greatsword directly toward the enemy with a Cut Blue Lock-On Trajectory Line & Reticle, and unleashes
   *      Epic Multi-Layered Crescent Slashes of Justice across the stage!
   *   3. Phase 3 (`3.45s - 4.50s`): Launches a supersonic winged dive-attack straight down his sword vector
   *      into the enemy, triggers a high-contrast Anime Impact Frame on touchdown, erupts 6 grounded Glacial
   *      Frost-Crystal Spire clusters, and fills the WHOLE STAGE with floating White-Blue Feathers for 5.2 seconds!
   */
  updateTrueUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const clampX = (xv) => Math.max(95, Math.min(ww - 95, xv));
    this.isInvulnerable = true;
    this.unstoppablePoise = true;
    this.isFlipVault = false;
    this.vx = 0;
    this.vy = 0;

    if (enemy && !enemy.isDead) {
      this._ultTargetX = enemy.x;
    }
    const targetX = this._ultTargetX !== undefined ? this._ultTargetX : ww * 0.5;
    const targetY = this.groundY - 88;
    const topOfStageY = this.groundY - 410;

    if (!this._trueUltInit) {
      this._trueUltInit = true;
      this._trueUltStage = 0;
      this._trueUltPosePulse = 0;
      this._trueUltDiveAfterimage = 0;
      this.y = this.groundY;
      this.facing = targetX >= this.x ? 1 : -1;

      if (game?.hudEls?.stageBadge) {
        game.hudEls.stageBadge.textContent = 'CELESTIAL SANCTUARY';
      }

      // Grounded Sanctuary Seal + Elder-Rune Domain + VFX Shockwaves under Aethelgard during his 2.35s Sacred Pose
      this.fx?.spawn('blinkTeleportPillar', this.x, this.groundY - 4, {
        flip: false,
        palette: RUNIC_CYAN_PALETTE,
        light: 1.48,
        maxDuration: 2.35,
        extra: {
          isDomain: true,
          customDuration: 2.35
        }
      });
      this.spawnVfxAnim(3, this.x, this.groundY - 18, 320, 148, 2.35, {
        glowColor: 'cyan',
        foreground: false
      });
      this.spawnVfxAnim(1, this.x, this.groundY - 98, 240, 240, 0.58, {
        startFrame: 10,
        endFrame: 29,
        flipX: this.facing < 0,
        glowColor: 'cyan',
        foreground: true
      });
      this.spawnRuneBlinkPillar(this.x, this.groundY, 0.58, 232, false);
      if (game?.audio) game.audio.play('skill_cast', this.x);
      if (game?.vfx) {
        game.vfx.spawnShockwave?.(this.x, this.groundY - 4, 195, '#7dd3fc', 0.44, true);
        game.vfx.spawnBurst?.(this.x, this.groundY - 90, 28, '#e0f2fe', 270, { upBias: 125, size: 7, additive: true });
        game.vfx.spawnGlyphBurst?.(this.x, this.groundY - 96, 12, 'steel');
        game.vfx.spawnLightning?.(this.x, this.groundY - 420, this.groundY, '#ffffff', '#38bdf8');
        game.vfx.spawnDamageText?.(
          this.x,
          this.groundY - 172,
          0,
          true,
          '★ SACRED VOW OF JUSTICE... ★',
          '#e0f2fe'
        );
      }
    }

    // =========================================================================
    // PHASE 1 (0.00s - 2.35s): 2.35-SECOND MULTI-STAGE SACRED VOW & SANCTUARY STAGE TRANSFORMATION
    // =========================================================================
    if (t < 2.35) {
      this.y = this.groundY;
      this.facing = targetX >= this.x ? 1 : -1;
      // Smoothly transform the stage into the Celestial Sanctuary (`arena_sanctuary.png`)!
      const stgAlpha = Math.min(1.0, t / 1.25);
      game?.renderer?.setStageTransformation?.('sanctuary', stgAlpha, false, 6.2);

      // Unfurl White-Blue Archangel Wings progressively on the ground starting at t = 0.75s!
      this.justiceWingsActive = t >= 0.75;
      this.justiceWingSpread = t >= 0.75 ? Math.min(0.95, (t - 0.75) / 1.40) : 0;
      this.justiceSwordPointActive = false;

      // Sophisticated 4-Stage Sacred Vow Choreography across 2.35s:
      // 0.00s..0.55s: Low Runic Cross-Guard Vow (Row 7 F02..F07)
      // 0.55s..1.15s: Sweeping 2H Greatsword Invocation Arc (Row 2 F00..F11)
      // 1.15s..1.80s: Archangel Wing Awakening & Overhead Greatsword Raise (Row 4 F00..F08)
      // 1.80s..2.35s: Ascension Coil & Skyward Launch Stance (Row 8 F00..F07)
      if (t < 0.55) {
        this.trueUltFrameOverride = 212 + Math.min(5, Math.floor((t / 0.55) * 6));
      } else if (t < 1.15) {
        this.trueUltFrameOverride = 60 + Math.min(11, Math.floor(((t - 0.55) / 0.60) * 12));
      } else if (t < 1.80) {
        this.trueUltFrameOverride = 120 + Math.min(8, Math.floor(((t - 1.15) / 0.65) * 9));
      } else {
        this.trueUltFrameOverride = 240 + Math.min(7, Math.floor(((t - 1.80) / 0.55) * 8));
      }

      // Continuous rising white-cyan holy aura particles during the 2.35s pose
      if (Math.random() < 0.72) {
        this.fx?.burst(this.x + (Math.random() - 0.5) * 85, this.groundY - 10, {
          count: 2,
          speedMin: 45,
          speedMax: 120,
          lifeMin: 0.18,
          lifeMax: 0.38,
          gravity: -105,
          colors: ['#ffffff', '#e0f2fe', '#7dd3fc', '#38bdf8', '#fef08a']
        });
      }

      // Periodic Sacred Pose energy pulses & flanking ground spires at 0.55s, 1.10s, 1.65s, and 2.10s
      const wantPulse = Math.floor(t / 0.55);
      if (wantPulse > this._trueUltPosePulse && wantPulse <= 4) {
        this._trueUltPosePulse = wantPulse;
        if (game?.audio) game.audio.play('reflect', this.x);
        game?.renderer?.triggerShake(9 + wantPulse * 2, 0.18);
        this.spawnVfxAnim(1, this.x, this.groundY - 98, 244, 244, 0.48, {
          startFrame: 10,
          endFrame: 29,
          flipX: this.facing < 0,
          glowColor: wantPulse % 2 === 0 ? 'gold' : 'cyan',
          foreground: true
        });
        this.spawnVfxAnim(3, this.x, this.groundY - 18, 300, 140, 0.62, {
          glowColor: 'cyan',
          foreground: false
        });
        if (wantPulse === 1 || wantPulse === 3) {
          // Flanking Ground-Planted Frost-Crystal Spires erupting beside Aethelgard during his Vow!
          const spireOff = wantPulse === 1 ? 125 : 195;
          for (const side of [-1, 1]) {
            const sx = clampX(this.x + side * spireOff);
            const sh = 216;
            this.spawnVfxAnim(2, sx, this.groundY - Math.round(sh * 0.32), sh, sh, 0.58, {
              flipX: side < 0,
              glowColor: wantPulse === 3 ? 'gold' : 'cyan',
              foreground: false
            });
          }
        }
        if (game?.vfx) {
          game.vfx.spawnShockwave?.(this.x, this.groundY - 4, 165 + wantPulse * 24, '#7dd3fc', 0.36, true);
          game.vfx.spawnBurst?.(this.x, this.groundY - 96, 18, '#ffffff', 235, { upBias: 105, size: 6, additive: true });
          game.vfx.spawnGlyphBurst?.(this.x, this.groundY - 96, 7, 'steel');
          if (wantPulse === 2) {
            game.vfx.spawnLightning?.(this.x, this.groundY - 420, this.groundY, '#ffffff', '#7dd3fc');
            game.vfx.spawnDamageText?.(
              this.x,
              this.groundY - 182,
              0,
              true,
              '★ AWAKENING ARCHANGEL WINGS! ★',
              '#e0f2fe'
            );
          }
        }
      }
      return;
    }

    // =========================================================================
    // PHASE 2 (2.35s - 3.45s): TELEPORT HIGH TO THE TOP OF THE STAGE (y = groundY - 410)
    // + BEAUTIFUL WHITE-BLUE FEATHERED WINGS + CUT BLUE LOCK-ON LINE & RETICLE
    // + EPIC MULTI-LAYERED CRESCENT SLASHES OF JUSTICE!
    // =========================================================================
    if (t < 3.45) {
      const hoverU = (t - 2.35) / 1.10;
      const skyX = clampX(targetX - (targetX >= ww * 0.5 ? 185 : -185));
      const skyY = topOfStageY - Math.sin(hoverU * Math.PI) * 18;
      game?.renderer?.setStageTransformation?.('sanctuary', 1.0, false, 5.8);

      if (this._trueUltStage < 1) {
        this._trueUltStage = 1;
        // Ground-planted departure Glacial Frost-Crystal Spire Pillar on `this.groundY`
        this.spawnAfterimage(this.x, this.groundY, this.facing, 4, 4, 0.48);
        this.spawnRuneBlinkPillar(this.x, this.groundY, 0.56, 236, false);
        if (game?.vfx) {
          game.vfx.spawnLightning?.(this.x, topOfStageY - 80, this.groundY, '#ffffff', '#38bdf8');
          game.vfx.spawnShockwave?.(this.x, this.groundY - 4, 195, '#38bdf8', 0.38, true);
        }

        // Teleport HIGH TO THE TOP OF THE STAGE (`this.groundY - 410`)!
        this.x = skyX;
        this.y = skyY;
        this.facing = targetX >= this.x ? 1 : -1;

        // Sky arrival burst + Ground-planted arrival Sanctuary Seal & Spire directly below on `this.groundY`
        this.spawnVfxAnim(4, this.x, this.y - 88, 280, 280, 0.52, {
          glowColor: 'cyan',
          foreground: true
        });
        this.spawnRuneBlinkPillar(targetX, this.groundY, 0.56, 208, true);
        this.spawnVfxAnim(3, targetX, this.groundY - 18, 310, 144, 1.15, {
          glowColor: 'gold',
          foreground: false
        });

        // Unfurl Full White-Blue Feathered Archangel Wings & start the Stage-Wide Floating Feathers!
        this.justiceWingsActive = true;
        this.justiceWingSpread = 1.18;
        this.justiceSwordPointActive = true;
        this.triggerStageWideBluishFeathers(6.4, ww);

        if (game?.audio) game.audio.play('storm_leap', this.x);
        if (game?.renderer) {
          game.renderer.triggerUltimateCamera?.((this.x + targetX) * 0.5, this.groundY - 260);
          game.renderer.triggerShake?.(18, 0.28);
        }
        if (game?.vfx) {
          game.vfx.spawnShockwave?.(this.x, this.y - 88, 210, '#ffffff', 0.42, false, true);
          game.vfx.spawnBurst?.(this.x, this.y - 88, 28, '#ffffff', 310, { upBias: 40, size: 8, additive: true });
          game.vfx.spawnGlyphBurst?.(this.x, this.y - 88, 10, 'steel');
          game.vfx.spawnDamageText?.(
            this.x,
            this.y - 148,
            0,
            true,
            '★ ARCHANGEL OF JUSTICE! ★',
            '#ffffff'
          );
        }
      }

      this.x = skyX;
      this.y = skyY;
      this.facing = targetX >= this.x ? 1 : -1;
      this.justiceWingsActive = true;
      this.justiceWingSpread = 1.18 + Math.sin(hoverU * Math.PI * 3) * 0.08;
      this.justiceSwordPointActive = true;
      this._justiceLockTargetX = targetX;
      this._justiceLockTargetY = targetY;

      // Angle body & Greatsword directly toward the enemy below!
      const dx = (targetX - this.x) * this.facing;
      const dy = targetY - (this.y - 84);
      this.justiceSwordAimAngle = Math.max(0.15, Math.min(1.18, Math.atan2(dy, Math.max(36, dx))));

      // Dynamic aerial Greatsword cleave animation synchronized with each Slash of Justice!
      if (t < 2.52) {
        this.trueUltFrameOverride = 252 + Math.min(3, Math.floor(((t - 2.35) / 0.17) * 4));
      } else if (t < 2.82) {
        this.trueUltFrameOverride = 68 + Math.min(6, Math.floor(((t - 2.52) / 0.30) * 7));
      } else if (t < 3.12) {
        this.trueUltFrameOverride = 130 + Math.min(6, Math.floor(((t - 2.82) / 0.30) * 7));
      } else {
        this.trueUltFrameOverride = 254 + Math.min(5, Math.floor(((t - 3.12) / 0.33) * 6));
      }

      // Unleashing 3 Colossal Multi-Layered "Slashes of Justice" from the high sky across the enemy!
      if (t >= 2.52 && this._trueUltStage < 2) {
        this._trueUltStage = 2;
        this.spawnJusticeGreatSlash(
          targetX - 280,
          this.groundY - 340,
          targetX + 280,
          this.groundY - 18,
          0.66,
          false,
          game
        );
        this.spawnJusticeGreatSlash(
          this.x + this.facing * 28,
          this.y - 78,
          targetX + this.facing * 90,
          this.groundY - 24,
          0.62,
          false,
          game
        );
        this.fx?.spawn('runebladeCrescentSlash', targetX, this.groundY - 108, {
          flip: false,
          light: 1.48,
          extra: { radius: 46, width: 15, isGold: false }
        });
        if (game?.audio) game.audio.play('blade_wave', targetX);
        game?.renderer?.triggerShake?.(16, 0.22);
        game?.vfx?.spawnDamageText?.(targetX, this.groundY - 188, 0, true, '★ SLASH OF JUSTICE I! ★', '#e0f2fe');
        if (enemy && !enemy.isDead) {
          enemy.takeDamage(44, this, true, 16, -45);
        }
      }

      if (t >= 2.82 && this._trueUltStage < 3) {
        this._trueUltStage = 3;
        this.spawnJusticeGreatSlash(
          targetX + 285,
          this.groundY - 345,
          targetX - 285,
          this.groundY - 18,
          0.66,
          true,
          game
        );
        this.spawnJusticeGreatSlash(
          this.x + this.facing * 28,
          this.y - 78,
          targetX - this.facing * 60,
          this.groundY - 24,
          0.62,
          true,
          game
        );
        this.fx?.spawn('runebladeCrescentSlash', targetX, this.groundY - 112, {
          flip: true,
          palette: RUNIC_GOLD_PALETTE,
          light: 1.5,
          extra: { radius: 48, width: 15, isGold: true }
        });
        if (game?.audio) game.audio.play('heavy_cleave', targetX);
        game?.renderer?.triggerShake?.(18, 0.24);
        game?.vfx?.spawnDamageText?.(targetX, this.groundY - 204, 0, true, '★ SLASH OF JUSTICE II! ★', '#fef08a');
        if (enemy && !enemy.isDead) {
          enemy.takeDamage(46, this, true, -16, -60);
        }
      }

      if (t >= 3.12 && this._trueUltStage < 4) {
        this._trueUltStage = 4;
        this.spawnJusticeGreatSlash(
          targetX - 320,
          this.groundY - 140,
          targetX + 320,
          this.groundY - 140,
          0.68,
          false,
          game
        );
        this.spawnJusticeGreatSlash(
          this.x,
          this.y - 76,
          targetX,
          this.groundY - 10,
          0.68,
          true,
          game
        );
        if (game?.audio) game.audio.play('slash', targetX);
        game?.renderer?.triggerShake?.(20, 0.26);
        game?.vfx?.spawnLightning?.(targetX, topOfStageY - 60, this.groundY, '#ffffff', '#7dd3fc');
        game?.vfx?.spawnDamageText?.(
          targetX,
          this.groundY - 220,
          0,
          true,
          '★ SWORD OF JUSTICE DESCENDS! ★',
          '#ffffff'
        );
        if (enemy && !enemy.isDead) {
          enemy.takeDamage(50, this, true, 0, -95);
        }
      }
      return;
    }

    // =========================================================================
    // PHASE 3A (3.45s - 3.74s): SUPERSONIC WHITE-WINGED DIVE ATTACK TO THE GROUND!
    // =========================================================================
    if (t < 3.74) {
      const diveU = Math.min(1, Math.max(0, (t - 3.45) / 0.29));
      const easeIn = diveU * diveU * (2.2 - 1.2 * diveU);
      const startX = clampX(targetX - this.facing * 185);
      const endX = clampX(targetX - this.facing * 32);
      const startY = topOfStageY;

      this.x = startX + (endX - startX) * easeIn;
      this.y = startY + (this.groundY - startY) * easeIn;
      this.justiceWingsActive = true;
      this.justiceWingSpread = 1.28;
      this.justiceSwordPointActive = true;
      this._justiceLockTargetX = targetX;
      this._justiceLockTargetY = targetY;
      this.trueUltFrameOverride = 142 + Math.min(3, Math.floor(diveU * 4));

      const wantDiveGhost = Math.floor(diveU * 7) + 1;
      if (this._trueUltDiveAfterimage < wantDiveGhost) {
        this._trueUltDiveAfterimage = wantDiveGhost;
        this.spawnAfterimage(this.x, this.y, this.facing, 4, 23, 0.46);
        if (wantDiveGhost === 1) {
          if (game?.audio) game.audio.play('storm_leap', this.x);
          this.spawnJusticeGreatSlash(
            startX,
            startY - 70,
            targetX + this.facing * 85,
            this.groundY - 6,
            0.72,
            true,
            game
          );
        }
      }
      return;
    }

    // =========================================================================
    // PHASE 3B (3.74s - 4.45s): LANDING IMPACT, ANIME IMPACT FRAME & 5-SECOND WHOLE-STAGE FEATHERS!
    // =========================================================================
    this.y = this.groundY;
    this.justiceSwordPointActive = false;
    this.justiceWingsActive = true;
    const landU = Math.min(1, (t - 3.74) / 0.71);
    this.justiceWingSpread = Math.max(0, 1.25 * (1 - landU * 0.62));
    this.trueUltFrameOverride = 144 + Math.min(5, Math.floor(landU * 6));

    if (this._trueUltStage < 5) {
      this._trueUltStage = 5;
      const dir = this.facing;
      const slamX = this.x + dir * 48;

      // Refresh the Stage-Wide Floating White & Ice-Blue Feathers & Sanctuary Stage Transformation for 5.2s!
      this.triggerStageWideBluishFeathers(5.2, ww);
      game?.renderer?.setStageTransformation?.('sanctuary', 1.0, false, 5.2);
      game?.renderer?.triggerImpactFrame?.(slamX, this.groundY - 90, 0.12, 'justice');

      if (game?.audio) game.audio.play('earthshatter', this.x);
      game?.renderer?.triggerShake?.(34, 0.72);
      game?.renderer?.triggerAberration?.(20);
      game?.renderer?.triggerHitStop?.(0.095);

      // Colossal X-Crossed Big Slashes of Justice across the stage on touchdown!
      this.spawnJusticeGreatSlash(
        slamX - 340,
        this.groundY - 340,
        slamX + 340,
        this.groundY - 12,
        0.78,
        false,
        game
      );
      this.spawnJusticeGreatSlash(
        slamX + 340,
        this.groundY - 340,
        slamX - 340,
        this.groundY - 12,
        0.78,
        true,
        game
      );
      this.spawnJusticeGreatSlash(
        Math.max(50, slamX - 420),
        this.groundY - 98,
        Math.min(ww - 50, slamX + 420),
        this.groundY - 98,
        0.74,
        false,
        game
      );

      // 6 Ground-Planted Glacial Frost-Crystal Spire Clusters erupting flush out of `this.groundY`!
      const offsets = [-140, -68, 0, 82, 164, 246];
      offsets.forEach((off, idx) => {
        const spireX = clampX(slamX + dir * off);
        const spireH = idx === 2 || idx === 3 ? 276 : 236;
        this.fx?.spawn('earthshatterJudgmentWave', spireX, this.groundY - 2, {
          flip: dir < 0,
          light: 1.5,
          extra: { isUltimate: true }
        });
        this.spawnVfxAnim(
          2,
          spireX,
          this.groundY - Math.round(spireH * 0.32),
          spireH,
          spireH,
          0.66 + idx * 0.04,
          {
            flipX: dir < 0,
            glowColor: idx % 2 === 0 ? 'cyan' : 'gold',
            foreground: false
          }
        );
      });

      this.spawnVfxAnim(3, slamX, this.groundY - 18, 320, 148, 0.80, {
        glowColor: 'cyan',
        foreground: false
      });
      this.spawnVfxAnim(1, targetX, this.groundY - 98, 272, 272, 0.62, {
        startFrame: 12,
        endFrame: 29,
        glowColor: 'gold',
        foreground: true
      });
      this.spawnVfxAnim(4, targetX, this.groundY - 96, 276, 276, 0.58, {
        glowColor: 'cyan',
        foreground: true
      });

      if (game?.vfx) {
        game.vfx.spawnLightning?.(slamX, topOfStageY - 80, this.groundY, '#ffffff', '#38bdf8');
        game.vfx.spawnShockwave?.(slamX, this.groundY - 4, 260, '#ffffff', 0.48, true);
        game.vfx.spawnBurst?.(slamX, this.groundY - 90, 36, '#ffffff', 340, { upBias: 140, size: 8, additive: true });
        game.vfx.spawnGlyphBurst?.(slamX, this.groundY - 90, 14, 'steel');
        game.vfx.spawnDamageText?.(
          slamX,
          this.groundY - 224,
          0,
          true,
          '★ CELESTIAL SWORD OF JUSTICE! ★',
          '#ffffff'
        );
      }

      const enemies = game?.getEnemiesOf ? game.getEnemiesOf(this) : enemy ? [enemy] : [];
      for (const foe of enemies) {
        if (foe && !foe.isDead && !foe.isBenched) {
          foe.takeDamage(195, this, true, 240, -330);
        }
      }
    }

    if (t >= (this.trueUltDuration || 4.45)) {
      this._trueUltInit = false;
      this.justiceWingsActive = false;
      this.justiceSwordPointActive = false;
      this.trueUltFrameOverride = null;
      this.isInvulnerable = false;
      this.unstoppablePoise = false;
      this.y = this.groundY;
      this.setState('IDLE');
    }
  }

  /**
   * Draws Aethelgard's Colossal Luminous White & Ice-Blue Feathered Archangel Wings of Justice:
   * Uses ONLY the authentic 30-frame 16-bit HD-2D feathered wing sprite sheet (`seraphim_wings.png`, 320x232 per cell)
   * anchored cleanly to his shoulder blades `(this.x - this.facing * 6, this.y - 120)` with a radiant White + Ice-Blue
   * celestial halo and `Row 1` Sacred Sanctuary Crest behind the wings (ZERO old procedural rectangle pinions!).
   */
  drawArchangelJusticeWings(ctx, renderer = null) {
    if (!this.justiceWingsActive || this.justiceWingSpread <= 0.02) return;
    const spread = this.justiceWingSpread;
    const groundPlantOffset = 4;
    const shoulderX = -6;
    const shoulderY = -122;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(this.x), Math.round(this.y + groundPlantOffset));
    ctx.scale(this.facing, 1);

    // 1. Radiant Pure-White + Ice-Blue Celestial Archangel Halo behind the wings
    if (renderer?.glowWhite || renderer?.glowCyan) {
      ctx.globalCompositeOperation = 'lighter';
      if (renderer.glowCyan) {
        ctx.globalAlpha = 0.44 * Math.min(1, spread);
        ctx.drawImage(renderer.glowCyan, shoulderX - 240, shoulderY - 180, 480, 340);
      }
      if (renderer.glowWhite) {
        ctx.globalAlpha = 0.52 * Math.min(1, spread);
        ctx.drawImage(renderer.glowWhite, shoulderX - 195, shoulderY - 150, 390, 290);
      }
      if (renderer.glowGold) {
        ctx.globalAlpha = 0.24 * Math.min(1, spread);
        ctx.drawImage(renderer.glowGold, shoulderX - 135, shoulderY - 115, 270, 210);
      }
    }

    // 2. 30fps Sacred Sanctuary Halo Crest behind the Archangel Wings (`Row 1` of `warrior_vfx.png`)
    const assets = typeof Image !== 'undefined' ? PixelForge.initAssets() : null;
    const sprites = assets?.warrior;
    const vfxSheet = sprites?.vfx;
    const col = Math.floor((this.stateTimer || 0) * 30) % 30;
    if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth > 0) {
      const haloSz = Math.round(248 * Math.min(1.12, spread));
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, spread * 0.36);
      ctx.drawImage(
        vfxSheet,
        col * 208,
        208,
        208,
        208,
        shoulderX - haloSz * 0.5,
        shoulderY - haloSz * 0.5,
        haloSz,
        haloSz
      );
    }

    // 3. Authentic 30-Frame 16-Bit HD-2D Feathered Archangel Wings (`seraphim_wings.png`, 320x232 per cell)
    const wingSheet = sprites?.wings || assets?.priestess?.wings;
    if (wingSheet && wingSheet.complete && wingSheet.naturalWidth > 0) {
      const cellW = 320;
      const cellH = 232;
      const wingFrame = Math.floor((this.stateTimer || 0) * 30) % 30;
      const scaleW = 0.96 + 0.22 * Math.min(1.25, spread);
      const scaleH = 0.96 + 0.20 * Math.min(1.25, spread);
      const drawW = Math.round(cellW * scaleW);
      const drawH = Math.round(cellH * scaleH);
      const dx = Math.round(shoulderX - drawW * 0.5);
      const dy = Math.round(shoulderY - drawH * (88 / 232));

      // Subtle Outer Ice-Blue & White Feathered Aura Pass
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, 0.24 * spread);
      ctx.drawImage(wingSheet, wingFrame * cellW, 0, cellW, cellH, dx - 3, dy - 3, drawW + 6, drawH + 6);

      // Main Crisp Feathered Wing Albedo Pass (`seraphim_wings.png` 100% unobstructed!)
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = Math.min(1, 0.98 * spread);
      ctx.drawImage(wingSheet, wingFrame * cellW, 0, cellW, cellH, dx, dy, drawW, drawH);

      // Subtle White-Hot Feather Highlight Pass (keeps individual feather barbs crisp while gleaming white!)
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, 0.22 * spread);
      ctx.drawImage(wingSheet, wingFrame * cellW, 0, cellW, cellH, dx, dy, drawW, drawH);
    }

    ctx.restore();
  }

  /**
   * Draws Aethelgard's Pointing Sword of Justice & Cut/Segmented Blue Lock-On Trajectory Indicator
   * (with marching cut blue dashes, directional chevron ticks, and a rotating target reticle on the enemy!).
   */
  drawPointingSwordOfJustice(ctx, renderer = null) {
    if (!this.justiceSwordPointActive) return;
    const dir = this.facing;
    const angle = this.justiceSwordAimAngle || 0.72;
    const handX = Math.round(this.x + dir * 24);
    const handY = Math.round(this.y - 92);
    const cosA = Math.cos(angle) * dir;
    const sinA = Math.sin(angle);
    const px = 3;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Cut / Segmented Blue Lock-On Trajectory Line & Target Reticle (NEVER a continuous laser beam!)
    const bladeSteps = 44;
    const tipX = handX + cosA * bladeSteps * px;
    const tipY = handY + sinA * bladeSteps * px;
    const lockX = this._justiceLockTargetX !== undefined ? this._justiceLockTargetX : tipX + cosA * 420;
    const lockY = this._justiceLockTargetY !== undefined ? this._justiceLockTargetY : this.groundY - 88;
    const rayDx = lockX - tipX;
    const rayDy = lockY - tipY;
    const rayDist = Math.hypot(rayDx, rayDy) || 1;
    const ux = rayDx / rayDist;
    const uy = rayDy / rayDist;
    const nx = -uy;
    const ny = ux;

    // March discrete cut dashes (`dashLen = 22px`, `gapLen = 20px`) along the trajectory vector
    const dashLen = 22;
    const gapLen = 20;
    const stride = dashLen + gapLen;
    const marchOffset = ((this.stateTimer || 0) * 160) % stride;

    ctx.globalCompositeOperation = 'lighter';
    let segIdx = 0;
    for (let d = marchOffset - stride; d < rayDist - 18; d += stride) {
      segIdx++;
      const d0 = Math.max(8, d);
      const d1 = Math.min(rayDist - 22, d + dashLen);
      if (d1 <= d0 + 4) continue;

      const x0 = tipX + ux * d0;
      const y0 = tipY + uy * d0;
      const x1 = tipX + ux * d1;
      const y1 = tipY + uy * d1;

      // Outer Cut Sapphire Segment Glow
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.72)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();

      // Crisp Inner White-Ice Cut Segment Core
      ctx.strokeStyle = '#e0f2fe';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();

      // Forward-pointing Cut Lock-On Chevron (`>`) at the head of every 2nd segment
      if (segIdx % 2 === 0 && d1 < rayDist - 36) {
        const chevX = x1 + ux * 6;
        const chevY = y1 + uy * 6;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(chevX - ux * 8 + nx * 7, chevY - uy * 8 + ny * 7);
        ctx.lineTo(chevX, chevY);
        ctx.lineTo(chevX - ux * 8 - nx * 7, chevY - uy * 8 - ny * 7);
        ctx.stroke();
      }
    }

    // Rotating 4-Bracket Celestial Target Lock-On Reticle on the Enemy
    ctx.save();
    ctx.translate(Math.round(lockX), Math.round(lockY));
    ctx.rotate((this.stateTimer || 0) * 2.4);
    const brkR = 34 + Math.sin((this.stateTimer || 0) * 12) * 4;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    for (let q = 0; q < 4; q++) {
      ctx.save();
      ctx.rotate((q * Math.PI) / 2);
      ctx.beginPath();
      ctx.moveTo(brkR - 12, -brkR);
      ctx.lineTo(brkR, -brkR);
      ctx.lineTo(brkR, -brkR + 12);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    // 2. Colossal Luminous Pixel-Art Runic Greatsword of Justice pointing directly at the enemy
    ctx.globalCompositeOperation = 'source-over';
    for (let s = -4; s <= bladeSteps; s++) {
      const bx = Math.round((handX + cosA * s * px) / px) * px;
      const by = Math.round((handY + sinA * s * px) / px) * px;
      if (s < 0) {
        ctx.fillStyle = '#06182c';
        ctx.fillRect(bx - px, by - px, px * 3, px * 3);
        ctx.fillStyle = s === -4 ? '#facc15' : '#1e293b';
        ctx.fillRect(bx, by, px, px);
      } else if (s <= 2) {
        const perpX = -sinA;
        const perpY = cosA;
        for (let g = -6; g <= 6; g++) {
          const gx = Math.round((bx + perpX * g * px) / px) * px;
          const gy = Math.round((by + perpY * g * px) / px) * px;
          ctx.fillStyle = '#06182c';
          ctx.fillRect(gx - px, gy - px, px * 3, px * 3);
          ctx.fillStyle = Math.abs(g) >= 4 ? '#ffffff' : '#facc15';
          ctx.fillRect(gx, gy, px, px);
        }
      } else {
        const u = (s - 2) / (bladeSteps - 2);
        const halfW = u > 0.85 ? 0 : u > 0.55 ? 1 : 2;
        const perpX = -sinA;
        const perpY = cosA;
        for (let w = -halfW - 1; w <= halfW + 1; w++) {
          const wx = Math.round((bx + perpX * w * px) / px) * px;
          const wy = Math.round((by + perpY * w * px) / px) * px;
          if (Math.abs(w) === halfW + 1) {
            ctx.fillStyle = '#06182c';
            ctx.fillRect(wx, wy, px, px);
          } else if (w === 0) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(wx, wy, px, px);
          } else {
            ctx.fillStyle = w < 0 ? '#e0f2fe' : '#38bdf8';
            ctx.fillRect(wx, wy, px, px);
          }
        }
      }
    }

    if (renderer?.glowCyan) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.72;
      ctx.drawImage(renderer.glowCyan, tipX - 76, tipY - 76, 152, 152);
    }

    ctx.restore();
  }

  /**
   * Draws the Epic Multi-Layered Big Slashes of Justice (using a 3-wave cascade of rotated 30fps `warrior_vfx.png`
   * Crescent Blade Waves + smooth tapered crescent sword-arcs—ZERO old stepped rectangle blocks!)
   * and the 5-Second Whole-Stage Floating Feathers!
   */
  drawJusticeSlashesAndFeathers(ctx, renderer = null) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const sprites = typeof Image !== 'undefined' ? PixelForge.initAssets()?.warrior : null;
    const vfxSheet = sprites?.vfx;

    // 1. Render Epic Multi-Layered Big Slashes of Justice across the sky & stage
    for (const s of this.justiceSlashes) {
      const u = Math.min(1, s.age / s.maxLife);
      const alpha = u < 0.10 ? u / 0.10 : Math.max(0, 1 - (u - 0.10) / 0.90);
      const dx = s.x2 - s.x1;
      const dy = s.y2 - s.y1;
      const dist = Math.hypot(dx, dy) || 1;
      const nx = -dy / dist;
      const ny = dx / dist;
      const bow = 42 * (s.isGoldAccent ? -1 : 1);
      const ctrlX = s.mx + nx * bow;
      const ctrlY = s.my + ny * bow;

      // Sub-Pass A: Wide Additive Celestial Bloom Halo along the slash
      if (renderer?.glowCyan) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha * 0.58;
        ctx.drawImage(renderer.glowCyan, s.mx - 240, s.my - 150, 480, 300);
        if (renderer.glowWhite) {
          ctx.globalAlpha = alpha * 0.50;
          ctx.drawImage(renderer.glowWhite, s.mx - 175, s.my - 110, 350, 220);
        }
      }

      // Sub-Pass B: 3-Wave Cascade of Rotated 30fps `warrior_vfx.png` Row 0 Crescent Blade Waves + Row 4 Starburst Nova!
      if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth > 0) {
        const col = Math.min(29, Math.floor(u * 30));
        for (const offsetU of [-0.24, 0, 0.24]) {
          const wx = s.mx + dx * offsetU + nx * bow * (1 - Math.abs(offsetU) * 1.8) * 0.45;
          const wy = s.my + dy * offsetU + ny * bow * (1 - Math.abs(offsetU) * 1.8) * 0.45;
          const scale = offsetU === 0 ? 1.08 : 0.84;
          const wSz = Math.round(390 * scale);
          const hSz = Math.round(285 * scale);

          ctx.save();
          ctx.translate(Math.round(wx), Math.round(wy));
          ctx.rotate(s.angle || 0);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = alpha * 0.92;
          ctx.drawImage(vfxSheet, col * 208, 0, 208, 208, -wSz * 0.5, -hSz * 0.5, wSz, hSz);
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = alpha * 0.78;
          ctx.drawImage(vfxSheet, col * 208, 0, 208, 208, -wSz * 0.5, -hSz * 0.5, wSz, hSz);
          ctx.restore();
        }
      }

      // Sub-Pass C: Sleek Tapered Crescent Sword-Arc of Justice (smooth curved crescent blade silhouette, ZERO blocky fillRect steps!)
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha * 0.95;
      ctx.fillStyle = s.isGoldAccent ? '#facc15' : '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.quadraticCurveTo(ctrlX + nx * 18, ctrlY + ny * 18, s.x2, s.y2);
      ctx.quadraticCurveTo(ctrlX - nx * 8, ctrlY - ny * 8, s.x1, s.y1);
      ctx.closePath();
      ctx.fill();

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.quadraticCurveTo(ctrlX + nx * 9, ctrlY + ny * 9, s.x2, s.y2);
      ctx.quadraticCurveTo(ctrlX - nx * 3, ctrlY - ny * 3, s.x1, s.y1);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // 2. Render 5-Second Stage-Wide Floating White & Ice-Blue Archangel Feathers across the entire 1200px stage!
    if (this.justiceFeathers.length > 0) {
      for (let i = 0; i < this.justiceFeathers.length; i++) {
        const f = this.justiceFeathers[i];
        const u = f.age / f.maxLife;
        const fade = u < 0.08 ? u / 0.08 : u > 0.82 ? Math.max(0, (1 - u) / 0.18) : 1.0;
        if (fade <= 0.01) continue;

        const fx = Math.round(f.x / 3) * 3;
        const fy = Math.round(f.y / 3) * 3;
        const sway = Math.sin(f.age * f.swayFreq + f.phase);
        const dir = sway >= 0 ? 1 : -1;

        if (i % 2 === 0 && renderer?.glowCyan) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = fade * 0.38;
          ctx.drawImage(renderer.glowCyan, fx - 20, fy - 20, 40, 40);
        }

        // Articulated Pixel-Art White & Ice-Blue Feather
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = fade * 0.98;

        // 1px Dark Sapphire Outline (`#082f49`)
        ctx.fillStyle = '#082f49';
        ctx.fillRect(fx - 6, fy - 6, 16, 12);

        // Ice-Blue Outer Vane (`#38bdf8` / `#7dd3fc`)
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(fx - 4, fy - 3, 11, 6);

        // Luminous White & Pale-Ice Inner Plume (`#e0f2fe` / `#ffffff`)
        ctx.fillStyle = f.isIceBright ? '#ffffff' : '#bae6fd';
        ctx.fillRect(fx - 3 + dir * 2, fy - 3, 8, 4);

        // Crisp Pure-White Feather Quill & Golden Star Glint
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(fx - 1, fy - 1, 5, 3);
        if (f.isIceBright) {
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(fx - dir * 3, fy + 2, 2, 2);
        }
      }
    }

    ctx.restore();
  }

  /**
   * 3-Pass HD-2D Additive Bloom Renderer for Aethelgard's 208x208 VFX Sheet (`assets/sprites/warrior_vfx.png`).
   */
  drawBloomedVfxCell(
    ctx,
    vfxSheet,
    row,
    col,
    x,
    y,
    w = 208,
    h = 208,
    alpha = 1.0,
    flipX = false,
    renderer = null,
    glowColor = 'cyan'
  ) {
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;
    const cell = 208;
    const sx = Math.max(0, Math.min(29, Math.floor(col))) * cell;
    const sy = Math.max(0, Math.min(4, Math.floor(row))) * cell;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(x), Math.round(y));
    if (flipX) ctx.scale(-1, 1);

    const glowSprite =
      glowColor === 'gold' ? renderer?.glowGold || renderer?.glowCyan : renderer?.glowCyan;
    if (glowSprite) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, alpha * 0.42);
      const gw = Math.round(w * 1.15);
      const gh = Math.round(h * 1.15);
      ctx.drawImage(glowSprite, -gw * 0.5, -gh * 0.5, gw, gh);
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.drawImage(vfxSheet, sx, sy, cell, cell, -w * 0.5, -h * 0.5, w, h);

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, alpha * 0.52);
    ctx.drawImage(vfxSheet, sx, sy, cell, cell, -w * 0.5, -h * 0.5, w, h);

    ctx.restore();
  }

  drawForegroundOverlay(ctx, renderer = null) {
    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    if (this.fx && !this.isDead) {
      this.fx.renderLayer(ctx, 'back', arenaCenterX, this.groundY, 0.96);
    }

    // Draw Aethelgard's Colossal Bluish Archangel Wings behind his body!
    if (this.justiceWingsActive && !this.isDead) {
      this.drawArchangelJusticeWings(ctx, renderer);
    }

    const sprites = PixelForge.initAssets().warrior;
    const vfxSheet = sprites?.vfx;

    // 1. Crisp Un-Rotated Pixel-Art Rune-Knight Afterimages (Skill Spin + Ult Left/Right/Top Plunge!)
    if (this.afterimages.length > 0 && sprites && sprites.sheet && sprites.sheet.complete) {
      for (const img of this.afterimages) {
        const alpha = Math.max(0, (1 - img.age / img.maxLife) * 0.58);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(Math.round(img.x / 4) * 4, Math.round((img.y + 4) / 4) * 4);
        ctx.scale(img.facing, 1);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha;
        PixelForge.drawAfterimageFrame(ctx, sprites, img.frameIdx, 208, 208);
        ctx.restore();
      }
    }

    // 2. Midground 30fps warrior_vfx cells (e.g. Row 2 Glacial Pillar & Row 3 Elder Runic Sanctuary Seal)
    if (this.activeVfxAnims.length > 0 && vfxSheet && vfxSheet.complete) {
      for (const v of this.activeVfxAnims) {
        if (v.foreground) continue;
        const u = Math.min(1, Math.max(0, v.age / v.maxLife));
        const span = Math.max(1, v.endFrame - v.startFrame + 1);
        const col = Math.min(29, v.startFrame + Math.floor(u * span));
        const fade = u < 0.12 ? u / 0.12 : u > 0.78 ? (1 - u) / 0.22 : 1.0;
        this.drawBloomedVfxCell(
          ctx,
          vfxSheet,
          v.row,
          col,
          v.x,
          v.y,
          v.w,
          v.h,
          fade * 0.92,
          v.flipX,
          renderer,
          v.glowColor
        );
      }
    }
  }

  drawUltimateForeground(ctx, renderer = null) {
    const sprites = PixelForge.initAssets().warrior;
    const vfxSheet = sprites?.vfx;

    // 1. Foreground 30fps warrior_vfx cells (Row 0 Wave Arc, Row 1 Aegis Crest, Row 4 Omnislash Starburst Nova)
    if (this.activeVfxAnims.length > 0 && vfxSheet && vfxSheet.complete) {
      for (const v of this.activeVfxAnims) {
        if (!v.foreground) continue;
        const u = Math.min(1, Math.max(0, v.age / v.maxLife));
        const span = Math.max(1, v.endFrame - v.startFrame + 1);
        const col = Math.min(29, v.startFrame + Math.floor(u * span));
        const fade = u < 0.12 ? u / 0.12 : u > 0.78 ? (1 - u) / 0.22 : 1.0;
        this.drawBloomedVfxCell(
          ctx,
          vfxSheet,
          v.row,
          col,
          v.x,
          v.y,
          v.w,
          v.h,
          fade * 0.96,
          v.flipX,
          renderer,
          v.glowColor
        );
      }
    }

    // 2. Live 120Hz ArcaneShaderFX `front` layer (Crescent Slashes, Cyclone Blades, Blink Pillars, Earthshatter Wave & Motes)
    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    if (this.fx && !this.isDead) {
      this.fx.renderLayer(ctx, 'front', arenaCenterX, this.groundY, 0.98);
    }

    // 3. Pointing Sword of Justice, Big Slashes of Justice & 5-Second Whole-Stage Floating Bluish Feathers!
    if (this.justiceSwordPointActive && !this.isDead) {
      this.drawPointingSwordOfJustice(ctx, renderer);
    }
    if (this.justiceSlashes.length > 0 || this.justiceFeathers.length > 0) {
      this.drawJusticeSlashesAndFeathers(ctx, renderer);
    }
  }

  draw(ctx, isReflection = false, renderer = null) {
    const sprites = PixelForge.initAssets().warrior;
    if (!sprites) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const w = 208;
    const h = 208;
    const frameIdx = PixelForge.getFrameIndex(this, this.walkPhase);

    const groundPlantOffset = 4;
    ctx.translate(Math.round(this.x), Math.round(this.y + groundPlantOffset));
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
