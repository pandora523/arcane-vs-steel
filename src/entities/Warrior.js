import { Fighter } from './Fighter.js?v=30fps74';
import { PixelForge } from '../engine/PixelForge.js?v=30fps74';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps74';
import {
  RUNIC_STEEL_EFFECT_REGISTRY,
  RUNIC_CYAN_PALETTE,
  RUNIC_GOLD_PALETTE
} from '../engine/shaders/runicSteelShaders.js?v=30fps74';

/**
 * Aethelgard (`warrior`) — Sovereign Paladin of Celestial Frost & Runic Steel (`v4`).
 * Powered natively by `ArcaneShaderFX` (dual-buffer 120Hz 2.5D shader & particle engine)
 * + `assets/sprites/warrior_sheet.png` (v4) & `assets/sprites/warrior_vfx.png` (8-row x 30fps).
 */
export class Warrior extends Fighter {
  constructor(x, groundY, facing = 1) {
    const opts = typeof x === 'object' && x !== null ? x : { x, groundY, facing };
    super({
      ...opts,
      name: opts.name || 'Aethelgard',
      maxHp: 4020,
      attackRange: 158,
      moveSpeed: 180,
      autoInterval: 1.16,
      lightColor: 'rgba(125, 211, 252, 1)',
      primaryColor: '#38bdf8',
      hasTrueUltimate: true,
      trueUltName: 'CELESTIAL SWORD OF JUSTICE',
      trueUltDuration: 4.45
    });
    this.heroId = 'warrior';
    this.theme = 'steel';
    this.deathSfx = 'death_warrior';
    this.hasPoise = true; // Runic Juggernaut Poise resists ranged knockback/hitstun
    this.skillDuration = 1.04;
    this.ultDuration = 1.86;
    this.trueUltDuration = 4.45;
    this.skillMaxCooldown = 5.05;
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
    this.cameraAirLift = 0;
    this._overrideFrameIdx = null;
    this.afterimages = [];
    this.afterimageAccum = 0;
    this.activeVfxAnims = [];
    this._ultTargetX = 600;

    // Supreme Finishing Move ("TRUE_ULTIMATE": Celestial Sword of Justice) state:
    // - 2.35s Sovereign Paladin Sacred Vow & Cathedral Consecration (NO stage background replacement!)
    // - High-Sky Teleport (`groundY - 445`) with Seraphim Wings + 2H Celestial Claymore Pointing at Enemy + Cut Lock-On Line
    // - Pixel-Art Row 5 Great-Slashes of Justice -> Supersonic Winged Dive & Touchdown -> 5.2s Stage-Wide Row 7 Pixel Feathers!
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
      viewH: 260
    });
    this.haloFxSlot = null;

    if (typeof Image !== 'undefined') {
      const warriorAssets = PixelForge.initAssets()?.warrior;
      if (warriorAssets?.vfx?.src && !warriorAssets.vfx.src.includes('v=30fps60')) {
        warriorAssets.vfx.src = 'assets/sprites/warrior_vfx.png?v=30fps74';
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
    } else {
      if (this._ultInit) this._ultInit = false;
      this._overrideFrameIdx = null;
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
    if (newState !== 'ULTIMATE' && newState !== 'TRUE_ULTIMATE') {
      this.cameraAirLift = 0;
    }
    if (newState === 'DEATH') {
      this.fx?.clear();
      this.haloFxSlot = null;
      this.justiceWingsActive = false;
      this.justiceSwordPointActive = false;
      this.cameraAirLift = 0;
      this._overrideFrameIdx = null;
    }
  }

  onProjectileTrail(proj, _game) {
    if (!this.fx || !proj) return;
    proj._trailAcc = (proj._trailAcc || 0) + 0.016;
    if (proj._trailAcc >= 0.042) {
      proj._trailAcc = 0;
      const dir = Math.sign(proj.vx || this.facing || 1);
      this.fx.burst(proj.x - dir * 16, proj.y, {
        count: proj.isUltimate ? 4 : 3,
        speedMin: 24,
        speedMax: 84,
        lifeMin: 0.14,
        lifeMax: 0.28,
        gravity: -18,
        colors: ['#ffffff', '#e0f2fe', '#7dd3fc', '#38bdf8', '#fde047']
      });
      if (proj.isUltimate) {
        this.spawnVfxAnim(0, proj.x - dir * 10, proj.y, 168, 168, 0.18, {
          flipX: dir < 0,
          glowColor: 'cyan',
          foreground: true
        });
      }
    }
  }

  onProjectileHit(proj, target, isCrit, game) {
    if (!proj) return false;
    const hx = target ? target.x : proj.x;
    const hy = target ? target.y - 96 : proj.y;
    const flip = (proj.vx || this.facing || 1) < 0;
    this.fx?.spawn('runebladeCrescentSlash', hx, hy, {
      flip,
      palette: isCrit || proj.isUltimate ? RUNIC_GOLD_PALETTE : RUNIC_CYAN_PALETTE,
      light: isCrit ? 1.42 : 1.28,
      extra: {
        radius: proj.isUltimate ? 34 : 28,
        width: proj.isUltimate ? 12 : 10.5,
        isGold: Boolean(isCrit || proj.isUltimate)
      }
    });
    this.fx?.burst(hx, hy, {
      count: isCrit ? 18 : 12,
      speedMin: 55,
      speedMax: isCrit ? 220 : 165,
      lifeMin: 0.16,
      lifeMax: 0.34,
      gravity: 40,
      colors: ['#ffffff', '#e0f2fe', '#7dd3fc', '#38bdf8', '#fde047']
    });
    this.spawnVfxAnim(4, hx, hy, isCrit ? 216 : 188, isCrit ? 216 : 188, 0.30, {
      flipX: flip,
      glowColor: isCrit ? 'gold' : 'cyan',
      foreground: true
    });
    if (proj.isUltimate) {
      this.spawnVfxAnim(5, hx, hy, 236, 236, 0.34, {
        flipX: flip,
        glowColor: 'white',
        foreground: true
      });
    }
    game?.vfx?.spawnGlyphBurst?.(hx, hy, isCrit ? 7 : 5, 'steel');
    return true;
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
    if (this.activeVfxAnims.length > 64) this.activeVfxAnims.shift();
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
    this.spawnVfxAnim(5, (x1 + x2) * 0.5, (y1 + y2) * 0.5, 228, 228, maxLife, {
      flipX: x2 < x1,
      glowColor: isGold ? 'gold' : 'cyan',
      foreground: true
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
        game.vfx.spawnBurst(proj.x, proj.y, 14, '#38bdf8', 240);
        game.vfx.spawnShockwave(proj.x, proj.y, 85, '#7dd3fc', 0.26);
        game.renderer.triggerShake(6, 0.14);

        this.spawnVfxAnim(1, proj.x, proj.y, 204, 204, 0.36, {
          startFrame: 10,
          endFrame: 29,
          flipX: this.facing < 0,
          glowColor: 'gold',
          foreground: true
        });
        this.spawnVfxAnim(5, proj.x, proj.y, 208, 208, 0.30, {
          flipX: this.facing < 0,
          glowColor: 'cyan',
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
        this.spawnVfxAnim(5, sx + this.facing * 18, sy + 14, 212, 212, 0.28, {
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
      enemy.takeDamage(64, this, false, 125, -80);
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
      this.spawnVfxAnim(5, this.x + this.facing * 44, this.y - 94, 212, 212, 0.28, {
        flipX: this.facing < 0,
        glowColor: 'gold',
        foreground: true
      });
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
      this.heal(24, 'RUNIC RESOLVE');
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
        damage: 66,
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
      this.spawnVfxAnim(5, spawnX, spawnY, 208, 208, 0.28, {
        flipX: this.facing < 0,
        glowColor: 'gold',
        foreground: true
      });

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
          const dmg = mode === 2 ? 78 : mode === 1 ? 68 : 60;
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
          enemy.takeDamage(22, this, false, -35, -24);
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
        enemy.takeDamage(74, this, true, 135, -155);
      }
    } else if (t >= this.skillDuration) {
      this.isDeflecting = false;
      this.spinHitStep = 0;
      this.y = this.groundY;
      this.setState('IDLE');
    }
  }

  updateUltimate(dt, enemy, game) {
    // SOVEREIGN PALADIN OVERDRIVE ART: "HEAVENLY EARTHSHATTER" (ultDuration = 1.86s, v4 Row 4 F00..F29)
    // Stage 0 (0.000s - 0.186s, F00..F05): Two-Handed Vertical Sacred Vow & Elder-Rune Domain Ignition
    // Stage 1 (0.186s - 0.496s, F06..F08): Teleport LEFT of enemy -> Wide Horizontal Runeblade Cleave!
    // Stage 2 (0.496s - 0.806s, F09..F12): Teleport RIGHT of enemy -> Reverse Rising Cross-Slash!
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
      this.cameraAirLift = 0;

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

    // STAGE 0 (0.000s - 0.186s, Row 4 F00..F05): Grounded Two-Handed Sacred Vow Awakening
    if (t < 0.186) {
      this.y = this.groundY;
      this.cameraAirLift = 0;
      this.facing = targetX >= this.x ? 1 : -1;
      this._overrideFrameIdx = 120 + Math.min(5, Math.floor((t / 0.186) * 6));
      return;
    }

    // STAGE 1 (0.186s - 0.496s, Row 4 F06..F08): TELEPORT LEFT -> Wide Horizontal Cleave!
    if (t < 0.496) {
      this.y = this.groundY;
      this.cameraAirLift = 0;
      this._overrideFrameIdx = 126 + Math.min(2, Math.floor(((t - 0.186) / 0.310) * 3));
      const leftBaseX = clampX(targetX - 118);
      if (this.ultSlashStep < 1) {
        this.ultSlashStep = 1;
        this.spawnAfterimage(this.x, this.y, this.facing, 4, 4, 0.32);
        this.spawnRuneBlinkPillar(this.x, this.groundY, 0.32, 184, false);
        this.x = leftBaseX;
        this.facing = targetX >= this.x ? 1 : -1;
        this.dashDir = this.facing;
        this.spawnRuneBlinkPillar(this.x, this.groundY, 0.34, 184, false);
        if (game?.audio) game.audio.play('storm_leap', this.x);
      }

      const u = Math.min(1, Math.max(0, (t - 0.22) / 0.16));
      this.x = clampX(leftBaseX + this.facing * 26 * u);
      if (t >= 0.27 && this.ultSlashStep < 2) {
        this.ultSlashStep = 2;
        this.spawnAfterimage(leftBaseX, this.groundY, this.facing, 4, 7, 0.38);
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
          enemy.takeDamage(42, this, false, 18, -32);
        }
      }
      return;
    }

    // STAGE 2 (0.496s - 0.806s, Row 4 F09..F12): TELEPORT RIGHT -> Reverse Rising Cross-Slash!
    if (t < 0.806) {
      this.y = this.groundY;
      this.cameraAirLift = 0;
      this._overrideFrameIdx = 129 + Math.min(3, Math.floor(((t - 0.496) / 0.310) * 4));
      const rightBaseX = clampX(targetX + 118);
      if (this.ultSlashStep < 3) {
        this.ultSlashStep = 3;
        this.spawnAfterimage(this.x, this.y, this.facing, 4, 8, 0.34);
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
        this.spawnAfterimage(rightBaseX, this.groundY, this.facing, 4, 11, 0.38);
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
          enemy.takeDamage(44, this, true, -18, -48);
        }
      }
      return;
    }

    // STAGE 3 (0.806s - 1.054s, Row 4 F13..F16): TELEPORT FLANK -> Heavy Launching Cross-Slash!
    if (t < 1.054) {
      this.y = this.groundY;
      this.cameraAirLift = 0;
      this._overrideFrameIdx = 133 + Math.min(3, Math.floor(((t - 0.806) / 0.248) * 4));
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
          enemy.takeDamage(48, this, true, 12, -165);
        }
      }
      return;
    }

    // STAGE 4 (1.054s - 1.364s, Row 4 F17..F21): TELEPORT DIRECTLY ABOVE (TOP!) & Skyward Elder-Rune Charge!
    if (t < 1.364) {
      const hoverU = (t - 1.054) / 0.31;
      const apexX = clampX(targetX - this.facing * 26);
      const apexY = this.groundY - 218 - Math.sin(hoverU * Math.PI * 0.5) * 14;
      this.cameraAirLift = 190;
      this._overrideFrameIdx = 137 + Math.min(4, Math.floor(hoverU * 5));

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

    // STAGE 5A (1.364s - 1.488s, Row 4 F22..F23): METEORIC TOP-DOWN VERTICAL SLASH PLUNGE!
    if (t < 1.488) {
      const diveU = Math.min(1, Math.max(0, (t - 1.364) / 0.124));
      const easeIn = diveU * diveU;
      const apexX = clampX(targetX - this.facing * 26);
      this.x = apexX;
      this.y = this.groundY - 232 + 232 * easeIn;
      this.cameraAirLift = Math.round(190 * (1 - easeIn));
      this._overrideFrameIdx = 142 + Math.min(1, Math.floor(diveU * 2));

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

    // STAGE 5B (1.488s - 1.860s, Row 4 F24..F29): EARTHSHATTER IMPACT — Chaining Grounded Glacial Frost-Crystal Spires + Twin Blade Waves!
    this.y = this.groundY;
    this.cameraAirLift = 0;
    this.isOmnislashing = false;
    this._overrideFrameIdx = 144 + Math.min(5, Math.floor(((t - 1.488) / 0.372) * 6));

    if (!this.didActionFrame) {
      this.didActionFrame = true;
      if (game?.audio) game.audio.play('earthshatter', this.x);

      game?.renderer?.triggerShake(28, 0.65);
      game?.renderer?.triggerAberration(16);
      game?.renderer?.triggerHitStop(0.095);

      const dir = this.facing;
      const slamX = this.x + dir * 44;

      // 1. Chaining Wave of 5 Ground-Planted Glacial Frost-Crystal Spire Eruptions along `this.groundY`!
      //    Each Row 2 (`skyJudgmentBladePillarCell`) is centered at `this.groundY - Math.round(spireH * 0.32)` so its
      //    `baseY = +34` crystal crater sits 100% flush in `this.groundY`!
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

      // Ground-planted Sanctuary Seal at impact center + Cathedral Column + Starburst impact flashes
      this.spawnVfxAnim(6, slamX, this.groundY - 148, 256, 310, 0.56, {
        flipX: dir < 0,
        glowColor: 'white',
        foreground: false
      });
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
          damage: 46,
          type: 'blade_wave',
          isMeteor: false,
          isUltimate: true
        });
      });

      game?.vfx?.spawnGlyphBurst(slamX, this.groundY - 75, 12, 'steel');

      if (enemy && !enemy.isDead) {
        enemy.takeDamage(168, this, true, 220, -320);
      }
    } else if (t >= this.ultDuration) {
      this._ultInit = false;
      this._overrideFrameIdx = null;
      this.cameraAirLift = 0;
      this.isOmnislashing = false;
      this.isInvulnerable = false;
      this.y = this.groundY;
      this.setState('IDLE');
    }
  }

  /**
   * Spawns a colossal 100% HD-2D pixel-art "Slash of Justice" across `(x1, y1) -> (x2, y2)`
   * using native `208x208` 30fps `warrior_vfx.png` Row 5 (`celestialJusticeGreatSlashCell`) & Row 4 Starburst Novas!
   * ZERO `ctx.rotate`, ZERO `quadraticCurveTo` smooth vector fills, ZERO smooth Canvas2D `spawnSlash`!
   */
  spawnJusticeGreatSlash(x1, y1, x2, y2, maxLife = 0.62, isGoldAccent = false, game = null) {
    const mx = (x1 + x2) * 0.5;
    const my = (y1 + y2) * 0.5;
    const flipX = x2 < x1;
    this.justiceSlashes.push({
      x1,
      y1,
      x2,
      y2,
      mx,
      my,
      flipX,
      age: 0,
      maxLife,
      isGoldAccent
    });

    const glowCol = isGoldAccent ? 'gold' : 'white';
    this.spawnVfxAnim(4, mx, my, 276, 276, maxLife * 0.88, {
      flipX,
      glowColor: glowCol,
      foreground: true
    });
    this.fx?.spawn('runebladeCrescentSlash', mx, my, {
      flip: flipX,
      palette: isGoldAccent ? RUNIC_GOLD_PALETTE : RUNIC_CYAN_PALETTE,
      light: 1.48,
      maxDuration: maxLife,
      extra: {
        dx: x2 - x1,
        dy: y2 - y1,
        radius: 44,
        width: 14,
        isGold: isGoldAccent,
        customDuration: maxLife
      }
    });
    this.fx?.burst(mx, my, {
      count: 24,
      speedMin: 68,
      speedMax: 240,
      lifeMin: 0.18,
      lifeMax: 0.42,
      gravity: -22,
      colors: ['#ffffff', '#e0f2fe', '#7dd3fc', '#38bdf8', '#fde047']
    });

    if (game?.vfx) {
      const col = isGoldAccent ? '#fef08a' : '#7dd3fc';
      game.vfx.spawnShockwave?.(mx, my, 158, col, 0.36, false, true);
      game.vfx.spawnBurst?.(mx, my, 20, '#e0f2fe', 265, { upBias: 65, size: 6, additive: true });
      game.vfx.spawnGlyphBurst?.(mx, my, 8, 'steel');
    }
  }

  /**
   * Fills the ENTIRE 1200px stage with 78 fluttering 30fps pixel-art Seraphim Feathers (`Row 7` of `warrior_vfx.png`)
   * that linger across the whole stage for `durationSec` (~5.2 seconds after landing!).
   */
  triggerStageWideBluishFeathers(durationSec = 5.2, ww = 1200) {
    this.justiceFeatherTimer = Math.max(this.justiceFeatherTimer, durationSec);
    this.justiceFeathers = [];
    const count = 78;
    for (let i = 0; i < count; i++) {
      const laneX = 36 + ((i * 14.8) % (ww - 72)) + (Math.random() - 0.5) * 26;
      const startY = this.groundY - 24 - ((i * 43) % 490);
      const drawSize = i % 5 === 0 ? 84 : i % 2 === 0 ? 68 : 56;
      this.justiceFeathers.push({
        x: laneX,
        y: startY,
        vx: (Math.random() - 0.5) * 18,
        vy: 18 + (i % 5) * 5.8,
        swayFreq: 2.1 + (i % 4) * 0.42,
        swayAmp: 22 + (i % 5) * 7.5,
        phase: i * 0.87,
        drawSize,
        flipX: i % 2 === 1,
        frameOffset: (i * 7) % 30,
        isIceBright: i % 2 === 0,
        age: 0,
        maxLife: durationSec + (i % 6) * 0.22
      });
    }
  }

  /**
   * SUPREME FINISHING MOVE ("ULTIMATE" Gauge): "CELESTIAL SWORD OF JUSTICE" (`trueUltDuration = 4.45s`)
   *   - NEVER replaces the stage background (`setStageTransformation` removed so Aethelgard never conflicts with Ignis Sol!).
   *   - Instead consecrates the active arena with 120Hz `celestialCathedralConsecration` light-columns & Row 6 Cathedral Sword-Pillars!
   *   1. Phase 1 (`0.00s - 2.35s`): 2.35-Second Sovereign Paladin Sacred Vow (`v4` Row 4 `F00..F05` Two-Handed Vertical Claymore Oath)
   *      on the ground (`this.groundY`), unfurling 30fps Feathered Seraphim Wings (`seraphim_wings.png`) & erupting Cathedral Light-Columns.
   *   2. Phase 2 (`2.35s - 3.45s`): Teleports HIGH TO THE TOP OF THE STAGE (`this.groundY - 445`, `this.cameraAirLift = 485` wide-sky zoom),
   *      unfurls Colossal Feathered White & Ice-Blue Seraphim Wings, thrusts his 2H Celestial Claymore downward toward the enemy (`v4` Row 8 `F12..F19`)
   *      with a pixel-stepped Cut Ice-Sapphire Lock-On Trajectory Line, and unleashes Row 5 Pixel-Art Great-Slashes of Justice!
   *   3. Phase 3 (`3.45s - 4.45s`): Supersonic winged dive-attack (`Row 8 F20..F24`) straight down into the enemy, Anime Impact Frame,
   *      Cathedral Judgment Pillar + 6 grounded Glacial Frost-Crystal Spire clusters, and 5.2s of Whole-Stage Row 7 Pixel Seraphim Feathers!
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
    const topOfStageY = this.groundY - 445;

    // Subtle dramatic celestial dimming over the active stage (WITHOUT changing or overwriting the stage background!)
    if (game?.renderer && t < 4.10) {
      game.renderer.ultDim = Math.max(game.renderer.ultDim || 0, 0.56);
    }

    if (!this._trueUltInit) {
      this._trueUltInit = true;
      this._trueUltStage = 0;
      this._trueUltPosePulse = 0;
      this._trueUltDiveAfterimage = 0;
      this.cameraAirLift = 0;
      this.y = this.groundY;
      this.facing = targetX >= this.x ? 1 : -1;

      // Consecrate the active arena floor with 120Hz Cathedral Light-Columns & Sanctuary Seals (zero background replacement!)
      this.fx?.spawn('celestialCathedralConsecration', this.x, this.groundY - 4, {
        flip: false,
        palette: RUNIC_CYAN_PALETTE,
        light: 1.5,
        maxDuration: 2.35,
        extra: {
          customDuration: 2.35,
          widthRadius: 72,
          heightPx: 84
        }
      });
      this.fx?.spawn('blinkTeleportPillar', this.x, this.groundY - 4, {
        flip: false,
        palette: RUNIC_CYAN_PALETTE,
        light: 1.45,
        maxDuration: 2.35,
        extra: {
          isDomain: true,
          customDuration: 2.35
        }
      });
      this.spawnVfxAnim(6, this.x, this.groundY - 165, 290, 350, 2.30, {
        flipX: this.facing < 0,
        glowColor: 'white',
        foreground: false
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
    // PHASE 1 (0.00s - 2.35s): 2.35-SECOND SOVEREIGN PALADIN SACRED VOW & CATHEDRAL CONSECRATION
    // =========================================================================
    if (t < 2.35) {
      this.y = this.groundY;
      this.cameraAirLift = 0;
      this.facing = targetX >= this.x ? 1 : -1;

      // Unfurl White-Blue Feathered Seraphim Wings progressively on the ground starting at t = 0.65s!
      this.justiceWingsActive = t >= 0.65;
      this.justiceWingSpread = t >= 0.65 ? Math.min(1.02, (t - 0.65) / 1.35) : 0;
      this.justiceSwordPointActive = false;

      // Clean 3-Stage Sovereign Paladin Vow Choreography using v4's dedicated Sacred Vow frames:
      // 0.00s..0.55s: Low Runic Cross-Guard Oath (Row 7 F03..F08, frameIdx 213..218)
      // 0.55s..1.75s: Noble Two-Handed Vertical Celestial Claymore Sacred Vow before T-Visor (Row 4 F00..F05, frameIdx 120..125)
      // 1.75s..2.35s: Ascension Coil & Skyward Launch Stance (Row 8 F00..F06, frameIdx 240..246)
      if (t < 0.55) {
        this.trueUltFrameOverride = 213 + Math.min(5, Math.floor((t / 0.55) * 6));
      } else if (t < 1.75) {
        this.trueUltFrameOverride = 120 + Math.min(5, Math.floor(((t - 0.55) / 1.20) * 6));
      } else {
        this.trueUltFrameOverride = 240 + Math.min(6, Math.floor(((t - 1.75) / 0.60) * 7));
      }

      // Rising celestial frost & gold motes during the 2.35s Vow
      if (Math.random() < 0.75) {
        this.fx?.burst(this.x + (Math.random() - 0.5) * 92, this.groundY - 10, {
          count: 2,
          speedMin: 48,
          speedMax: 128,
          lifeMin: 0.18,
          lifeMax: 0.38,
          gravity: -110,
          colors: ['#ffffff', '#e0f2fe', '#7dd3fc', '#38bdf8', '#fde047']
        });
      }

      // Periodic Consecration Pulses, Cathedral Light-Columns & Grounded Frost-Crystal Spires at 0.55s, 1.10s, 1.65s, and 2.10s
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
          // Flanking Cathedral Sword-Columns (Row 6) + Ground-Planted Frost-Crystal Spires (Row 2)!
          const spireOff = wantPulse === 1 ? 130 : 205;
          for (const side of [-1, 1]) {
            const sx = clampX(this.x + side * spireOff);
            const sh = 216;
            this.spawnVfxAnim(6, sx, this.groundY - 148, 232, 296, 0.68, {
              flipX: side < 0,
              glowColor: wantPulse === 3 ? 'gold' : 'white',
              foreground: false
            });
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
              '★ AWAKENING SERAPHIM WINGS! ★',
              '#e0f2fe'
            );
          }
        }
      }
      return;
    }

    // =========================================================================
    // PHASE 2 (2.35s - 3.45s): TELEPORT HIGH TO THE TOP OF THE STAGE (`groundY - 445`, `cameraAirLift = 485`)
    // + LUMINOUS WHITE-BLUE SERAPHIM WINGS + 2H CLAYMORE POINTING AT ENEMY + CUT LOCK-ON LINE
    // + COLOSSAL PIXEL-ART ROW 5 GREAT-SLASHES OF JUSTICE!
    // =========================================================================
    if (t < 3.45) {
      const hoverU = (t - 2.35) / 1.10;
      const skyX = clampX(targetX - (targetX >= ww * 0.5 ? 195 : -195));
      const skyY = topOfStageY - Math.sin(hoverU * Math.PI) * 18;
      this.cameraAirLift = 485;

      if (this._trueUltStage < 1) {
        this._trueUltStage = 1;
        // Ground-planted departure Cathedral Column & Glacial Spire on `this.groundY`
        this.spawnAfterimage(this.x, this.groundY, this.facing, 4, 4, 0.48);
        this.spawnRuneBlinkPillar(this.x, this.groundY, 0.56, 236, false);
        this.spawnVfxAnim(6, this.x, this.groundY - 165, 280, 350, 0.62, {
          flipX: this.facing < 0,
          glowColor: 'white',
          foreground: false
        });
        if (game?.vfx) {
          game.vfx.spawnLightning?.(this.x, topOfStageY - 80, this.groundY, '#ffffff', '#38bdf8');
          game.vfx.spawnShockwave?.(this.x, this.groundY - 4, 195, '#38bdf8', 0.38, true);
        }

        // Teleport HIGH TO THE TOP OF THE STAGE (`this.groundY - 445`)!
        this.x = skyX;
        this.y = skyY;
        this.facing = targetX >= this.x ? 1 : -1;

        // Sky arrival Starburst + Consecrated Cathedral Target Seal directly under the enemy!
        this.spawnVfxAnim(4, this.x, this.y - 88, 290, 290, 0.52, {
          glowColor: 'white',
          foreground: true
        });
        this.fx?.spawn('celestialCathedralConsecration', targetX, this.groundY - 4, {
          flip: false,
          palette: RUNIC_GOLD_PALETTE,
          light: 1.5,
          maxDuration: 1.45,
          extra: {
            customDuration: 1.45,
            widthRadius: 76,
            heightPx: 88
          }
        });
        this.spawnRuneBlinkPillar(targetX, this.groundY, 0.56, 208, true);
        this.spawnVfxAnim(3, targetX, this.groundY - 18, 320, 148, 1.25, {
          glowColor: 'gold',
          foreground: false
        });

        // Unfurl Full White-Blue Feathered Seraphim Wings & start the Stage-Wide Row 7 Pixel Feathers!
        this.justiceWingsActive = true;
        this.justiceWingSpread = 1.22;
        this.justiceSwordPointActive = true;
        this.triggerStageWideBluishFeathers(6.5, ww);

        if (game?.audio) game.audio.play('storm_leap', this.x);
        if (game?.renderer) {
          game.renderer.triggerUltimateCamera?.((this.x + targetX) * 0.5, this.groundY - 240);
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
      this.justiceWingSpread = 1.22 + Math.sin(hoverU * Math.PI * 3) * 0.08;
      this.justiceSwordPointActive = true;
      this._justiceLockTargetX = targetX;
      this._justiceLockTargetY = targetY;

      const dx = (targetX - this.x) * this.facing;
      const dy = targetY - (this.y - 68);
      this.justiceSwordAimAngle = Math.max(0.20, Math.min(1.18, Math.atan2(dy, Math.max(36, dx))));

      // Dedicated v4 Sky-Hover Sword-Pointing-At-Enemy Stance (`Row 8 F12..F19`, frameIdx 252..259)
      // interleaved with aerial 2H Cleaves on Slashes I & II!
      if (t < 2.52) {
        this.trueUltFrameOverride = 252 + Math.min(3, Math.floor(((t - 2.35) / 0.17) * 4));
      } else if (t < 2.78) {
        this.trueUltFrameOverride = 68 + Math.min(6, Math.floor(((t - 2.52) / 0.26) * 7));
      } else if (t < 2.84) {
        this.trueUltFrameOverride = 255;
      } else if (t < 3.10) {
        this.trueUltFrameOverride = 126 + Math.min(6, Math.floor(((t - 2.84) / 0.26) * 7));
      } else {
        this.trueUltFrameOverride = 254 + Math.min(5, Math.floor(((t - 3.10) / 0.35) * 6));
      }

      // Unleashing 3 Colossal Pixel-Art Row 5 "Slashes of Justice" from the high sky across the enemy!
      if (t >= 2.52 && this._trueUltStage < 2) {
        this._trueUltStage = 2;
        this.spawnJusticeGreatSlash(
          targetX - 270,
          this.groundY - 340,
          targetX + 270,
          this.groundY - 18,
          0.66,
          false,
          game
        );
        this.spawnJusticeGreatSlash(
          this.x + this.facing * 56,
          this.y - 52,
          targetX + this.facing * 72,
          this.groundY - 24,
          0.62,
          false,
          game
        );
        if (game?.audio) game.audio.play('blade_wave', targetX);
        game?.renderer?.triggerShake?.(16, 0.22);
        game?.vfx?.spawnDamageText?.(targetX, this.groundY - 188, 0, true, '★ SLASH OF JUSTICE I! ★', '#e0f2fe');
        if (enemy && !enemy.isDead) {
          enemy.takeDamage(68, this, true, 16, -45);
        }
      }

      if (t >= 2.84 && this._trueUltStage < 3) {
        this._trueUltStage = 3;
        this.spawnJusticeGreatSlash(
          targetX + 275,
          this.groundY - 345,
          targetX - 275,
          this.groundY - 18,
          0.66,
          true,
          game
        );
        this.spawnJusticeGreatSlash(
          this.x + this.facing * 56,
          this.y - 52,
          targetX - this.facing * 52,
          this.groundY - 24,
          0.62,
          true,
          game
        );
        if (game?.audio) game.audio.play('heavy_cleave', targetX);
        game?.renderer?.triggerShake?.(18, 0.24);
        game?.vfx?.spawnDamageText?.(targetX, this.groundY - 204, 0, true, '★ SLASH OF JUSTICE II! ★', '#fef08a');
        if (enemy && !enemy.isDead) {
          enemy.takeDamage(72, this, true, -16, -60);
        }
      }

      if (t >= 3.12 && this._trueUltStage < 4) {
        this._trueUltStage = 4;
        this.spawnJusticeGreatSlash(
          targetX - 285,
          this.groundY - 330,
          targetX + 285,
          this.groundY - 18,
          0.68,
          false,
          game
        );
        this.spawnVfxAnim(6, targetX, this.groundY - 168, 300, 370, 0.70, {
          flipX: false,
          glowColor: 'white',
          foreground: false
        });
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
          enemy.takeDamage(78, this, true, 0, -95);
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
      const startX = clampX(targetX - this.facing * 195);
      const endX = clampX(targetX - this.facing * 36);
      const startY = topOfStageY;

      this.x = startX + (endX - startX) * easeIn;
      this.y = startY + (this.groundY - startY) * easeIn;
      this.cameraAirLift = Math.round(485 * (1 - easeIn));
      this.justiceWingsActive = true;
      this.justiceWingSpread = 1.28;
      this.justiceSwordPointActive = diveU < 0.78;
      this._justiceLockTargetX = targetX;
      this._justiceLockTargetY = targetY;
      // v4 Row 8 F20..F24 (`frameIdx = 260..264`): Supersonic Downward Diving 2H Cleave!
      this.trueUltFrameOverride = 260 + Math.min(4, Math.floor(diveU * 5));

      const wantDiveGhost = Math.floor(diveU * 7) + 1;
      if (this._trueUltDiveAfterimage < wantDiveGhost) {
        this._trueUltDiveAfterimage = wantDiveGhost;
        this.spawnAfterimage(this.x, this.y, this.facing, 8, 21 + Math.min(3, wantDiveGhost >> 1), 0.46);
        if (wantDiveGhost === 1) {
          if (game?.audio) game.audio.play('storm_leap', this.x);
          this.spawnJusticeGreatSlash(
            startX + this.facing * 42,
            startY - 56,
            targetX + this.facing * 85,
            this.groundY - 8,
            0.72,
            true,
            game
          );
        }
      }
      return;
    }

    // =========================================================================
    // PHASE 3B (3.74s - 4.45s): LANDING IMPACT, ANIME IMPACT FRAME, CATHEDRAL PILLAR & 5.2S STAGE-WIDE PIXEL FEATHERS!
    // =========================================================================
    this.y = this.groundY;
    this.cameraAirLift = 0;
    this.justiceSwordPointActive = false;
    this.justiceWingsActive = true;
    const landU = Math.min(1, (t - 3.74) / 0.71);
    this.justiceWingSpread = Math.max(0, 1.25 * (1 - landU * 0.65));
    this.trueUltFrameOverride = 144 + Math.min(5, Math.floor(landU * 6));

    if (this._trueUltStage < 5) {
      this._trueUltStage = 5;
      const dir = this.facing;
      const slamX = this.x + dir * 48;

      // Refresh the Stage-Wide Floating Pixel Seraphim Feathers (`Row 7`) for 5.2s WITHOUT overwriting the stage background!
      this.triggerStageWideBluishFeathers(5.2, ww);
      game?.renderer?.triggerImpactFrame?.(slamX, this.groundY - 90, 0.12, 'justice');

      if (game?.audio) game.audio.play('earthshatter', this.x);
      game?.renderer?.triggerShake?.(34, 0.72);
      game?.renderer?.triggerAberration?.(20);
      game?.renderer?.triggerHitStop?.(0.095);

      // Consecrate touchdown with 120Hz Cathedral Light-Columns + Colossal Row 6 Cathedral Sword-Pillars!
      this.fx?.spawn('celestialCathedralConsecration', slamX, this.groundY - 4, {
        flip: dir < 0,
        palette: RUNIC_CYAN_PALETTE,
        light: 1.55,
        maxDuration: 1.85,
        extra: {
          customDuration: 1.85,
          widthRadius: 96,
          heightPx: 92
        }
      });
      this.spawnVfxAnim(6, slamX, this.groundY - 182, 350, 420, 0.92, {
        flipX: dir < 0,
        glowColor: 'white',
        foreground: false
      });

      // Colossal X-Crossed Pixel-Art Row 5 Great-Slashes of Justice across the stage on touchdown!
      this.spawnJusticeGreatSlash(
        slamX - 320,
        this.groundY - 340,
        slamX + 320,
        this.groundY - 14,
        0.78,
        false,
        game
      );
      this.spawnJusticeGreatSlash(
        slamX + 320,
        this.groundY - 340,
        slamX - 320,
        this.groundY - 14,
        0.78,
        true,
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

      this.spawnVfxAnim(3, slamX, this.groundY - 18, 330, 152, 0.85, {
        glowColor: 'cyan',
        foreground: false
      });
      this.spawnVfxAnim(1, targetX, this.groundY - 98, 272, 272, 0.62, {
        startFrame: 12,
        endFrame: 29,
        glowColor: 'gold',
        foreground: true
      });
      this.spawnVfxAnim(4, targetX, this.groundY - 96, 284, 284, 0.60, {
        glowColor: 'white',
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

      this.heal(Math.round(this.maxHp * 0.12), 'SACRED VOW');
      const enemies = game?.getEnemiesOf ? game.getEnemiesOf(this) : enemy ? [enemy] : [];
      for (const foe of enemies) {
        if (foe && !foe.isDead && !foe.isBenched) {
          foe.takeDamage(580, this, true, 240, -330);
        }
      }
    }

    if (t >= (this.trueUltDuration || 4.45)) {
      this._trueUltInit = false;
      this.cameraAirLift = 0;
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
   * Draws Aethelgard's Pixel-Stepped Cut Ice-Sapphire Lock-On Trajectory Indicator & 4-Bracket Pixel Crosshair:
   * - Anchored directly at Aethelgard's real v4 2H Celestial Claymore tip (`Row 8 F12..F19` -> `(this.x + dir * 68, this.y - 46)`),
   *   so there is ZERO duplicate blocky procedural sword drawn on top!
   * - Uses 3px-quantized pixel-stepped cut dashes (`dashLen = 24`, `gapLen = 20`) + pixel `>` chevrons + non-rotated
   *   L-bracket pixel crosshair (ZERO continuous laser beam, ZERO smooth vector stroke, ZERO `ctx.rotate`!).
   */
  drawPointingSwordOfJustice(ctx, renderer = null) {
    if (!this.justiceSwordPointActive) return;
    const dir = this.facing;
    const px = 3;
    const snap = (v) => Math.round(v / px) * px;

    // Real v4 2H Winged Celestial Claymore tip in world space during Sky-Hover Aim (`Row 8 F12..F19`)
    const tipX = snap(this.x + dir * 68);
    const tipY = snap(this.y - 46);
    const lockX = snap(this._justiceLockTargetX !== undefined ? this._justiceLockTargetX : tipX + dir * 320);
    const lockY = snap(this._justiceLockTargetY !== undefined ? this._justiceLockTargetY : this.groundY - 88);

    const rayDx = lockX - tipX;
    const rayDy = lockY - tipY;
    const rayDist = Math.hypot(rayDx, rayDy) || 1;
    const ux = rayDx / rayDist;
    const uy = rayDy / rayDist;
    const nx = -uy;
    const ny = ux;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Luminous Celestial Bloom + Pixel Star Glint at the v4 Claymore Blade Tip
    if (renderer?.glowCyan || renderer?.glowWhite) {
      ctx.globalCompositeOperation = 'lighter';
      if (renderer.glowCyan) {
        ctx.globalAlpha = 0.68;
        ctx.drawImage(renderer.glowCyan, tipX - 68, tipY - 68, 136, 136);
      }
      if (renderer.glowWhite) {
        ctx.globalAlpha = 0.76;
        ctx.drawImage(renderer.glowWhite, tipX - 42, tipY - 42, 84, 84);
      }
    }

    const starReach = ((Math.floor((this.stateTimer || 0) * 18) % 2) + 3) * px;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.96;
    ctx.fillStyle = '#082f49';
    ctx.fillRect(tipX - starReach - px, tipY - px, starReach * 2 + px * 2, px * 3);
    ctx.fillRect(tipX - px, tipY - starReach - px, px * 3, starReach * 2 + px * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(tipX - starReach, tipY, starReach * 2 + px, px);
    ctx.fillRect(tipX, tipY - starReach, px, starReach * 2 + px);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(tipX - px, tipY - px, px * 3, px * 3);

    // 2. Pixel-Stepped Cut / Segmented Blue Lock-On Trajectory Line (`dashLen = 24px`, `gapLen = 20px`)
    const dashLen = 24;
    const gapLen = 20;
    const stride = dashLen + gapLen;
    const marchOffset = ((this.stateTimer || 0) * 165) % stride;

    let segIdx = 0;
    for (let d = marchOffset - stride; d < rayDist - 26; d += stride) {
      segIdx++;
      const d0 = Math.max(16, d);
      const d1 = Math.min(rayDist - 30, d + dashLen);
      if (d1 <= d0 + 5) continue;

      // Pass A: 1px Dark Sapphire Selout Border (`#082f49`) behind each discrete cut dash
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.90;
      ctx.fillStyle = '#082f49';
      for (let s = d0; s <= d1; s += px) {
        const bx = snap(tipX + ux * s);
        const by = snap(tipY + uy * s);
        ctx.fillRect(bx - px, by - px, px * 3, px * 3);
      }

      // Pass B: Crisp Ice-Sapphire & Pure-White Stepped Pixel Dash Core
      for (let s = d0; s <= d1; s += px) {
        const bx = snap(tipX + ux * s);
        const by = snap(tipY + uy * s);
        const isHead = s >= d1 - px;
        ctx.fillStyle = isHead ? '#ffffff' : '#38bdf8';
        ctx.fillRect(bx, by, px, px);
        if (!isHead) {
          ctx.fillStyle = '#e0f2fe';
          ctx.fillRect(bx, by - px, px, px);
        }
      }

      // Pass C: Forward-pointing Pixel-Stepped Lock-On Chevron (`>`) on every 2nd cut segment
      if (segIdx % 2 === 0 && d1 < rayDist - 42) {
        const cx = tipX + ux * (d1 + 6);
        const cy = tipY + uy * (d1 + 6);
        for (let k = 0; k <= 3; k++) {
          for (const wingSide of [-1, 1]) {
            const wx = snap(cx - ux * k * px + nx * wingSide * k * px);
            const wy = snap(cy - uy * k * px + ny * wingSide * k * px);
            ctx.fillStyle = '#082f49';
            ctx.fillRect(wx - px, wy - px, px * 3, px * 3);
          }
        }
        for (let k = 0; k <= 3; k++) {
          for (const wingSide of [-1, 1]) {
            const wx = snap(cx - ux * k * px + nx * wingSide * k * px);
            const wy = snap(cy - uy * k * px + ny * wingSide * k * px);
            ctx.fillStyle = k === 0 ? '#ffffff' : k === 1 ? '#e0f2fe' : '#38bdf8';
            ctx.fillRect(wx, wy, px, px);
          }
        }
      }
    }

    // 3. Crisp Non-Rotated 4-Corner Pixel L-Bracket Target Crosshair on the Enemy
    if (renderer?.glowCyan) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.45;
      ctx.drawImage(renderer.glowCyan, lockX - 56, lockY - 56, 112, 112);
    }

    const pulseStep = (Math.floor((this.stateTimer || 0) * 10) % 3) * px;
    const brkR = 33 + pulseStep;
    const armL = 12;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.96;

    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        const cornerX = lockX + sx * brkR;
        const cornerY = lockY + sy * brkR;
        const hStart = sx < 0 ? cornerX : cornerX - armL;
        const vStart = sy < 0 ? cornerY : cornerY - armL;

        ctx.fillStyle = '#082f49';
        ctx.fillRect(hStart - px, cornerY - px, armL + px * 3, px * 3);
        ctx.fillRect(cornerX - px, vStart - px, px * 3, armL + px * 3);

        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(hStart, cornerY, armL + px, px);
        ctx.fillRect(cornerX, vStart, px, armL + px);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cornerX, cornerY, px, px);
      }
    }

    // Center diamond pixel pip inside the target crosshair
    ctx.fillStyle = '#082f49';
    ctx.fillRect(lockX - px, lockY - px, px * 3, px * 3);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(lockX, lockY, px, px);

    ctx.restore();
  }

  /**
   * Draws the Epic Multi-Layered Pixel-Art Great-Slashes of Justice (`Row 5` of `warrior_vfx.png`)
   * and the 5.2-Second Whole-Stage Fluttering Pixel Seraphim Feathers (`Row 7` of `warrior_vfx.png`)!
   * ZERO `ctx.rotate`, ZERO smooth vector `quadraticCurveTo`, and ZERO `fillRect` feather bricks!
   */
  drawJusticeSlashesAndFeathers(ctx, renderer = null) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const sprites = typeof Image !== 'undefined' ? PixelForge.initAssets()?.warrior : null;
    const vfxSheet = sprites?.vfx;
    const hasSheet = Boolean(vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth > 0);

    // 1. Render Colossal 30fps Pixel-Art Great-Slashes of Justice (`Row 5` of `warrior_vfx.png`)
    for (const s of this.justiceSlashes) {
      const u = Math.min(1, s.age / s.maxLife);
      const alpha = u < 0.10 ? u / 0.10 : Math.max(0, 1 - (u - 0.10) / 0.90);
      if (alpha <= 0.01) continue;

      const dx = s.x2 - s.x1;
      const dy = s.y2 - s.y1;

      if (renderer?.glowCyan) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha * 0.54;
        ctx.drawImage(renderer.glowCyan, s.mx - 230, s.my - 145, 460, 290);
        const coreGlow = s.isGoldAccent ? renderer.glowGold || renderer.glowWhite : renderer.glowWhite;
        if (coreGlow) {
          ctx.globalAlpha = alpha * 0.48;
          ctx.drawImage(coreGlow, s.mx - 170, s.my - 108, 340, 216);
        }
      }

      if (hasSheet) {
        const baseCol = Math.min(29, Math.floor(u * 30));
        const glowTone = s.isGoldAccent ? 'gold' : 'white';
        const nodes = [
          { off: -0.24, sz: 336, colShift: -2, aMult: 0.86 },
          { off: 0.0, sz: 408, colShift: 0, aMult: 0.98 },
          { off: 0.24, sz: 336, colShift: 2, aMult: 0.86 }
        ];
        for (const node of nodes) {
          const wx = s.mx + dx * node.off;
          const wy = s.my + dy * node.off;
          const nodeCol = Math.max(0, Math.min(29, baseCol + node.colShift));
          this.drawBloomedVfxCell(
            ctx,
            vfxSheet,
            5,
            nodeCol,
            wx,
            wy,
            node.sz,
            node.sz,
            alpha * node.aMult,
            Boolean(s.flipX),
            renderer,
            glowTone
          );
        }
      }
    }

    // 2. Render 5.2-Second Stage-Wide Fluttering Pixel-Art Seraphim Feathers (`Row 7` of `warrior_vfx.png`)
    if (this.justiceFeathers.length > 0 && hasSheet) {
      for (let i = 0; i < this.justiceFeathers.length; i++) {
        const f = this.justiceFeathers[i];
        const u = f.age / f.maxLife;
        const fade = u < 0.08 ? u / 0.08 : u > 0.80 ? Math.max(0, (1 - u) / 0.20) : 1.0;
        if (fade <= 0.01) continue;

        const col = (Math.floor(f.age * 24) + (f.frameOffset || 0)) % 30;
        const sz = f.drawSize || 68;
        this.drawBloomedVfxCell(
          ctx,
          vfxSheet,
          7,
          col,
          Math.round(f.x),
          Math.round(f.y),
          sz,
          sz,
          fade * 0.96,
          Boolean(f.flipX),
          i % 3 === 0 ? renderer : null,
          f.isIceBright ? 'white' : 'cyan'
        );
      }
    }

    ctx.restore();
  }

  /**
   * 3-Pass HD-2D Additive Bloom Renderer for Aethelgard's 8-Row x 30-Col 208x208 VFX Sheet (`assets/sprites/warrior_vfx.png`).
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
    const sy = Math.max(0, Math.min(7, Math.floor(row))) * cell;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(x), Math.round(y));
    if (flipX) ctx.scale(-1, 1);

    const glowSprite =
      glowColor === 'gold'
        ? renderer?.glowGold || renderer?.glowCyan
        : glowColor === 'white'
          ? renderer?.glowWhite || renderer?.glowCyan
          : renderer?.glowCyan;
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
