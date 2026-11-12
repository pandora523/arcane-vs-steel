import { Fighter } from './Fighter.js?v=30fps75';
import { PixelForge } from '../engine/PixelForge.js?v=30fps75';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps75';
import { GLACIAL_EFFECT_REGISTRY } from '../engine/shaders/glacialShaders.js?v=30fps75';

/**
 * Lyra (`icemage`) — Winter Empress & Sovereign of Absolute Zero (v6 Full Rework).
 *
 * 100% Bespoke Kit & Visual Identity:
 *  - Passive (`HOARFROST RIME & SOLID CRYSTAL STASIS`): Frost hits stack Hoarfrost Rime [1..4].
 *    At 4 stacks, triggers ★ SOLID CRYSTAL FREEZE! ★ — encasing the foe inside a translucent
 *    Row-6 Ice-Crystal Block (`0.46s` solid freeze stun), dealing crit shatter damage, and
 *    granting Lyra a Cryo Mirror Shield (`+14 HP`).
 *  - 3-Variant Royal Ballet Auto-Attack (`Row 2`):
 *      1) `RIME-LANCE NEEDLE` (`F00..F09`): Supersonic faceted Borealis cryo-comet + Mach cone.
 *      2) `SNOWFLAKE BOOMERANG HALO` (`F10..F19`): Arabesque pirouette hurling a giant spinning
 *         6-bladed Row-1 Snowflake Chakram that curves through the foe and boomerangs back (`+8 HP` on catch).
 *      3) `GLACIER STALAGMITE MARCH` (`F20..F29`): Overhead Scepter command erupting 3 sequential
 *         ground-marching Row-2 Glacier Spires along the floor that pop foes upward and freeze a Rink.
 *  - Mobility & Tactical Figure-Skating:
 *      - `JUMP` (`TRIPLE-AXEL SKY-STAIRCASE`): Materializes 3 stepped mid-air crystalline ice platforms
 *        beneath her skates along her high vault arc while firing an apex cryo-comet.
 *      - `DASH` (`ARABESQUE RIME GLIDE`): Freezes a Permafrost Rink and launches a returning Snowflake Chakram.
 *      - `DODGE` (`ICE-SCULPTURE DECOY`): Leaves a solid crystal statue that shatters when approached.
 *      - `CROUCH` (`HYDROBLADE MIRROR WALL`): Raises an angled Row-2 Glacier Mirror Wall that splits
 *        enemy projectiles into twin homing cryo-lances.
 *  - Signature Skill (`GLACIAL JAWS: TWIN ICEBERG CRUSH`, `Row 3`):
 *      Erupts TWO towering flanking Row-2 Glacier Iceberg Walls to the left and right of the enemy,
 *      then SLAMS both icebergs inward together in a seismic pincer crush (`+2` Rime stacks).
 *  - Overdrive Ultimate (`WINTER CORONATION: SEVEN CELESTIAL ICE-SWORDS`, `Row 4`):
 *      Summons 7 Giant Celestial Ice-Claymores (`Row 4`) in a Coronation Halo overhead; 6 outer swords
 *      rain down sequentially to impale the floor in a hexagonal palisade cage before a colossal 7th
 *      Sovereign Crown-Claymore plunges into the center, detonating all 7 swords (`+32 HP`).
 *  - 3-Overdrive Supreme Ultimate (`ABSOLUTE ZERO: DIAMOND DUST ETERNITY`, `4.60s`):
 *      Act I: Polar Night sky + multi-ribbon Northern Lights (Aurora Borealis) + Full-Stage Crystal Mirror
 *             Lake + overhead Celestial Astrolabe (`Row 5`) as Lyra ascends 90px on a floating Ice-Lotus Pedestal.
 *      Act II: Live thermodynamic readout plunges to `-273.15°C • 0.00 K` while entombing foes in the
 *              towering Row-6 Diamond-Coffin Monolith inside a 6-Mirror Borealis Star-Snowflake Cathedral.
 *      Act III: Reality freezes brittle with arena-wide branching glass fault-lines as Lyra performs her
 *               vertical Sovereign Scepter-Tap (`Row 4 F17..F23`).
 *      Act IV: ★ DIAMOND DUST ETERNITY! ★ — Reality shatters into 28 faceted stained-glass ice panes +
 *              triple Row-7 Prismatic Starbursts + `diamondDustCataclysmNova` for an instantaneous
 *              `695` Crit Execution + `16%` Max HP Sovereign Heal!
 */
export class IceMage extends Fighter {
  constructor(x, groundY, facing = 1) {
    const opts = typeof x === 'object' && x !== null ? x : { x, groundY, facing };
    super({
      ...opts,
      name: opts.name || 'Lyra',
      maxHp: 3630,
      attackRange: 510,
      moveSpeed: 182,
      autoInterval: 1.07,
      lightColor: 'rgba(103, 232, 249, 1)',
      primaryColor: '#67e8f9'
    });
    this.heroId = 'icemage';
    this.theme = 'glacial';
    this.deathSfx = 'death_icemage';
    this.skillMaxCooldown = 4.70;
    this.skillTriggerRange = 545;
    this.skillName = 'GLACIAL JAWS: TWIN ICEBERG CRUSH';
    this.ultName = 'WINTER CORONATION: SEVEN CELESTIAL ICE-SWORDS';
    this.hasTrueUltimate = true;
    this.trueUltName = 'ABSOLUTE ZERO: DIAMOND DUST ETERNITY';
    this.trueUltDuration = 4.60;

    this._trueUltStep = 0;
    this._trueUltCoffinX = 600;
    this._trueUltShatterTimer = 0;
    this._trueUltCracks = [];
    this._trueUltGlassShards = [];
    this._trueUltDiamondDust = [];

    this.comboStep = 0;
    this._autoVariant = 0;
    this.stepDustTimer = 0;

    // Bespoke Winter Empress Combat Constructs
    this.cryoPrisms = []; // Preserved array for telemetry / ambient floating snow-halos
    this.prismBeams = []; // Active Borealis light chords
    this.permafrostZones = []; // Shimmering 2.5D Permafrost Ice-Rinks on the arena floor
    this.activeChakrams = []; // Returning curved 6-bladed Row-1 Snowflake Boomerang Chakrams
    this.activeMarchingSpires = []; // Sequential ground-erupting Row-2 Glacier Stalagmite Spires
    this.activeCrystalPrisons = []; // Solid 4-stack Brittle Freeze Row-6 Ice-Crystal Sarcophagi
    this.skyIceSteps = []; // Stepped mid-air Crystalline Ice-Staircase platforms from Jump
    this.iceDecoy = null; // Sculpted crystal statue left behind on Dodge
    this.iceWall = null; // Angled Refractive Row-2 Glacier Mirror Wall erected on Crouch
    this.glacierJaws = null; // Flanking Left & Right Towering Row-2 Iceberg Pincer Walls during SKILL
    this.coronationDomain = null; // 7-Sword Celestial Coronation Palisade & Crown-Sword during ULTIMATE
    this.borealisCathedral = null; // Alias kept clean on reset
    this.triMatrixCage = null; // Alias kept clean on reset
    this.skateRibbons = [];
    this.activeFrostRings = [];

    this.dodgeMaxCooldown = 3.06;
    this.dashMaxCooldown = 3.02;
    this.wallFlipCooldown = 0;
    this.crouchCooldown = 0;
    this.crouchDuration = 0.92;
    this.isCrouching = false;
    this.isFlipVault = false;
    this.flipStartX = this.x;
    this.flipTargetX = this.x;
    this.flipAngle = 0;
    this._spawnedJumpSteps = 0;

    this.didJawsErupt = false;
    this.didJawsSlam = false;
    this._drewScepterFocus = false;
    this.ultStage = 0;
    this._ultSwordsDropped = 0;

    // Wide 1440x780 world-space dual-buffer coverage so Ultimate / True Ultimate shaders never clip borders
    this.fx = new ArcaneShaderFX(GLACIAL_EFFECT_REGISTRY, {
      pixelScale: 3,
      viewW: 480,
      viewH: 260,
      topRatio: 0.82
    });

    if (typeof Image !== 'undefined') {
      const iceAssets = PixelForge.initAssets()?.icemage;
      if (iceAssets?.vfx?.src && !iceAssets.vfx.src.includes('v=30fps75')) {
        iceAssets.vfx.src = 'assets/sprites/icemage_vfx.png?v=30fps75';
      }
    }
  }

  setState(newState) {
    const prevState = this.state;
    super.setState(newState);
    this._drewScepterFocus = false;

    if (newState === 'AUTO_ATTACK') {
      this._autoVariant = this.comboStep % 3;
      this.trueUltFrameOverride = 60 + this._autoVariant * 10;
    } else if (newState === 'TRUE_ULTIMATE') {
      this._trueUltStep = 0;
      this._buildTrueUltFracturesAndShards();
    } else {
      this.trueUltFrameOverride = null;
    }

    if (prevState === 'TRUE_ULTIMATE' && newState !== 'TRUE_ULTIMATE') {
      this.cameraAirLift = 0;
    }

    if (newState !== 'JUMP' && newState !== 'DODGE' && newState !== 'DASH') {
      this.fx?.stopByKey('glacialSkateRibbon');
    }
  }

  ensureGlacialSkateRibbon() {
    if (!this.fx) return;
    if (!this.fx.active.some((s) => s.key === 'glacialSkateRibbon')) {
      this.fx.spawn('glacialSkateRibbon', this.x - this.facing * 12, this.y - 10, {
        follow: this,
        offsetX: -12,
        offsetY: -10,
        flip: this.facing < 0,
        light: 1.16
      });
    }
  }

  /**
   * Spawns a 120Hz `ArcaneShaderFX` Hoarfrost Shatter Burst + optional Row-7 Prismatic Starburst sprite.
   */
  spawnPixelFrostRing(x, y, maxRadius = 110, color = '#67e8f9', maxLife = 0.30, isFloor = false, hasSpikes = false) {
    if (this.fx) {
      const safeX = Math.max(80, Math.min(1120, x));
      const safeY = Math.max(40, Math.min(this.groundY + 24, y));
      this.fx.spawn('absoluteZeroShatterBurst', safeX, safeY, {
        light: hasSpikes ? 1.34 : 1.15,
        extra: { isLarge: maxRadius >= 115 || hasSpikes }
      });
    }
    if (hasSpikes) {
      this.activeFrostRings.push({
        x,
        y,
        maxRadius,
        color,
        life: 0,
        maxLife,
        isFloor,
        hasSpikes
      });
    }
  }

  onProjectileTrail(p) {
    if (!this.fx || p.type !== 'cryo_shard') return;
    if (p.ringTimer >= 0.16) {
      p.ringTimer = 0;
      const sx = Math.max(80, Math.min(1120, p.x - Math.sign(p.vx || 1) * 16));
      const sy = Math.max(50, Math.min(this.groundY + 12, p.y));
      this.fx.burst(sx, sy, {
        count: 1,
        speedMin: 18,
        speedMax: 46,
        lifeMin: 0.11,
        lifeMax: 0.18,
        gravity: -8,
        spread: 0.65,
        angle: Math.atan2(-(p.vy || 0), -(p.vx || 1)),
        colors: ['#ffffff', '#bae6fd', '#67e8f9', '#e879f9']
      });
    }
  }

  onProjectileHit(p, _hitTarget, isCrit, _game) {
    if (!this.fx) return false;
    const sx = Math.max(80, Math.min(1120, p.x));
    const sy = Math.max(50, Math.min(this.groundY + 16, p.y));
    this.fx.spawn('absoluteZeroShatterBurst', sx, sy, {
      light: isCrit ? 1.30 : 1.14,
      extra: { isLarge: Boolean(isCrit) }
    });
    this.fx.burst(sx, sy, {
      count: isCrit ? 5 : 3,
      speedMin: 42,
      speedMax: isCrit ? 165 : 125,
      lifeMin: 0.13,
      lifeMax: 0.24,
      gravity: 75,
      colors: ['#ffffff', '#bae6fd', '#67e8f9', '#38bdf8', '#e879f9']
    });
    return true;
  }

  /**
   * Freezes a stretch of the arena floor into a shimmering 2.5D Permafrost Ice-Rink.
   */
  spawnPermafrostZone(centerX, radius = 155, duration = 4.6) {
    const ww = this.game && this.game.renderer ? this.game.renderer.worldWidth : 1200;
    const cx = Math.max(150, Math.min(ww - 150, centerX));
    for (const z of this.permafrostZones) {
      if (Math.abs(z.x - cx) < 95) {
        z.x = (z.x + cx) * 0.5;
        z.radius = Math.max(z.radius, radius);
        z.life = 0;
        z.maxLife = Math.max(z.maxLife, duration);
        if (z.fxSlot) {
          z.fxSlot.x = z.x;
          if (z.fxSlot.inst?.cfg) z.fxSlot.inst.cfg.radiusWorld = Math.min(240, z.radius);
        }
        return z;
      }
    }
    if (this.permafrostZones.length >= 3) {
      const removed = this.permafrostZones.shift();
      if (removed?.fxSlot) removed.fxSlot.done = true;
    }
    const fxSlot = this.fx
      ? this.fx.spawn('permafrostSnowflakeSigil', cx, this.groundY, {
          light: 1.16,
          extra: { radiusWorld: Math.min(240, radius) }
        })
      : null;
    const zone = {
      x: cx,
      y: this.groundY,
      radius,
      life: 0,
      maxLife: duration,
      fxSlot
    };
    this.permafrostZones.push(zone);
    return zone;
  }

  /**
   * Launches a curved Returning 6-Bladed Snowflake Boomerang Chakram (`Row 1`) that slices outward
   * through the enemy's trajectory and curves back to Lyra's scepter!
   */
  spawnSnowflakeChakram(startX, startY, targetX, targetY, outDmg = 50, returnDmg = 22, target = null) {
    const ww = this.game?.renderer ? this.game.renderer.worldWidth : 1200;
    const dir = targetX >= startX ? 1 : -1;
    const rawSpan = Math.max(220, Math.min(545, Math.abs(targetX - startX) + 64));
    const apexX = Math.max(85, Math.min(ww - 85, startX + dir * rawSpan));
    const apexY = Math.max(this.groundY - 195, Math.min(this.groundY - 56, targetY));

    if (this.activeChakrams.length >= 3) {
      this.activeChakrams.shift();
    }

    this.activeChakrams.push({
      startX,
      startY,
      apexX,
      apexY,
      target,
      x: startX,
      y: startY,
      arcLift: -36,
      life: 0,
      outDuration: 0.30,
      totalDuration: 0.64,
      outDmg,
      returnDmg,
      hitOutSet: new Set(),
      hitRetSet: new Set(),
      trailTimer: 0
    });
  }

  /**
   * Summons a sequential wave of 3 ground-erupting Row-2 Glacier Stalagmite Spires racing across the floor!
   */
  spawnGlacierStalagmiteMarch(enemy, baseDmg = 54) {
    const ww = this.game?.renderer ? this.game.renderer.worldWidth : 1200;
    const dir = enemy ? (enemy.x >= this.x ? 1 : -1) : this.facing;
    const distToEnemy = enemy ? Math.max(195, Math.min(530, Math.abs(enemy.x - this.x))) : 285;
    const step1 = Math.max(95, Math.round(distToEnemy * 0.36));
    const step2 = Math.max(165, Math.round(distToEnemy * 0.68));
    const step3 = distToEnemy;

    const offsets = [step1, step2, step3];
    for (let i = 0; i < 3; i++) {
      const sx = Math.max(95, Math.min(ww - 95, this.x + dir * offsets[i]));
      this.activeMarchingSpires.push({
        x: sx,
        y: this.groundY,
        target: i === 2 ? enemy : null,
        delay: i * 0.075,
        life: 0,
        maxLife: 0.54,
        erupted: false,
        didHit: false,
        isFinal: i === 2,
        dmg: i === 2 ? baseDmg : Math.round(baseDmg * 0.48),
        size: i === 2 ? 176 : 136 + i * 16
      });
    }
  }

  /**
   * Applies Hoarfrost Rime stacks (1..4) to an enemy; at 4 stacks triggers ★ SOLID CRYSTAL FREEZE! ★
   */
  applyBrittleFrost(enemy, stacks, game, sourceX = null, sourceY = null) {
    if (!enemy || enemy.isDead || enemy.isInvulnerable) return;
    enemy.brittleStacks = (enemy.brittleStacks || 0) + stacks;
    enemy.brittleDecayTimer = 4.9;

    if (enemy.brittleStacks >= 4) {
      this.triggerBrittleShatter(enemy, game, sourceX ?? enemy.x, sourceY ?? (enemy.y - 96));
    } else if (game && game.vfx && stacks >= 1) {
      const sCount = Math.floor(enemy.brittleStacks);
      game.vfx.spawnDamageText(
        enemy.x,
        enemy.y - 144,
        0,
        false,
        `HOARFROST RIME [${sCount}/4]`,
        '#a5f3fc'
      );
    }
  }

  /**
   * Detonates 4 Hoarfrost Rime stacks into ★ SOLID CRYSTAL FREEZE! ★ — encasing the enemy in a
   * translucent Row-6 Ice-Crystal Block (`0.40s` solid stun), dealing crit shatter damage, and
   * granting Lyra a Cryo Mirror Shield!
   */
  triggerBrittleShatter(enemy, game, _originX, _originY) {
    if (!enemy || enemy.isDead) return;
    enemy.brittleStacks = 0;
    enemy.brittleDecayTimer = 0;

    const isVanguard = enemy.hasPoise && enemy.attackRange <= 160;
    const isHarvester = enemy.hasPoise && enemy.attackRange > 160;
    const isGroundedCaster = !enemy.hasPoise && enemy.moveSpeed <= 122;
    const shatterDmg = isVanguard ? 43 : isHarvester ? 46 : isGroundedCaster ? 49 : 52;

    enemy.takeDamage(shatterDmg, this, true, 68, -80);

    // Genuine Solid Ice-Block Freeze Stasis (unless target is mid-Ultimate)
    if (enemy.state !== 'ULTIMATE' && enemy.state !== 'TRUE_ULTIMATE' && !enemy.isDead) {
      enemy.stunTimer = Math.max(enemy.stunTimer || 0, 0.40);
      enemy.vx *= 0.15;
    }

    this.activeCrystalPrisons.push({
      target: enemy,
      x: enemy.x,
      y: enemy.y,
      life: 0,
      maxLife: 0.48
    });

    this.heal(12, 'CRYO MIRROR SHIELD');

    if (game) {
      if (game.audio) game.audio.play('ice_shatter', enemy.x);
      if (game.renderer) {
        game.renderer.triggerShake(12, 0.22);
        game.renderer.triggerAberration(7);
      }
      if (game.vfx) {
        game.vfx.spawnDamageText(enemy.x, enemy.y - 176, 0, true, '★ SOLID CRYSTAL FREEZE! ★', '#67e8f9');
        this.spawnPixelFrostRing(enemy.x, enemy.y - 96, 128, '#67e8f9', 0.34, false, true);
        game.vfx.spawnGlyphBurst(enemy.x, enemy.y - 96, 4, 'glacial');
      }
    }
    if (this.fx) {
      const sx = Math.max(80, Math.min(1120, enemy.x));
      const sy = Math.max(60, Math.min(this.groundY, enemy.y - 96));
      this.fx.burst(sx, sy, {
        count: 10,
        speedMin: 55,
        speedMax: 195,
        lifeMin: 0.16,
        lifeMax: 0.32,
        gravity: 85,
        colors: ['#ffffff', '#bae6fd', '#67e8f9', '#e879f9']
      });
    }
  }

  startJump(enemy, game, customDir = null) {
    this.dodgeCooldown = this.dodgeMaxCooldown * (0.86 + Math.random() * 0.26);
    this.setState('JUMP');
    this.isInvulnerable = true;
    this.isFlipVault = true;
    this.flipStartX = this.x;
    this.flipAngle = 0;
    this._spawnedJumpSteps = 0;
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
      this.dashDuration = 0.62;
      const openSideDir = enemy.x < ww * 0.5 ? 1 : -1;
      let target = enemy.x + openSideDir * 350;
      if (Math.abs(target - this.x) < 260) {
        const crossDir = this.x < enemy.x ? 1 : -1;
        target = enemy.x + crossDir * 340;
      }
      this.flipTargetX = Math.max(150, Math.min(ww - 150, target));
      this.dashDir = Math.sign(this.flipTargetX - this.flipStartX) || 1;
    } else {
      this.dashDuration = 0.58;
      this.flipTargetX = Math.max(150, Math.min(ww - 150, this.x + dir * 335));
      this.dashDir = dir;
    }

    this.vx = 0;
    this.vy = 0;
    this.ensureGlacialSkateRibbon();
    this.spawnPermafrostZone(this.x, 145, 4.2);
    this.spawnPixelFrostRing(this.x, this.groundY, 88, '#67e8f9', 0.28, true, false);
    if (game && game.audio) game.audio.play('zephyr_flip', this.x);
    if (game && game.vfx) {
      game.vfx.spawnDamageText(this.x, this.y - 138, 0, false, 'TRIPLE-AXEL SKY-STAIR!', '#67e8f9');
    }
  }

  startCrouch(_enemy, game) {
    this.crouchCooldown = 3.20;
    this.crouchDuration = 0.92;
    this.setState('CROUCH');
    this.isCrouching = true;
    this.isDeflecting = true;
    this.vx = 0;

    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const wallX = Math.max(100, Math.min(ww - 100, this.x + this.facing * 74));
    this.iceWall = {
      x: wallX,
      y: this.groundY,
      facing: this.facing,
      life: 0,
      maxLife: 2.40,
      refractedCount: 0
    };
    this.spawnPermafrostZone(this.x + this.facing * 50, 165, 4.8);
    this.spawnPixelFrostRing(wallX, this.groundY - 2, 84, '#67e8f9', 0.28, true, false);

    if (game && game.audio) game.audio.play('frost_cast', wallX);
    if (game && game.vfx) {
      game.vfx.spawnDamageText(this.x, this.y - 128, 0, false, 'HYDROBLADE MIRROR WALL!', '#a5f3fc');
    }
  }

  onStartDash(enemy, game, dir) {
    const ww = game.renderer ? game.renderer.worldWidth : 1200;
    this.dashDuration = 0.38;
    this.isDeflecting = false;
    this.isFlipVault = false;
    this.flipAngle = 0;

    const escapeDir = this.x < 240 ? 1 : this.x > ww - 240 ? -1 : dir;
    this.dashDir = escapeDir;
    this.vx = escapeDir * 425;
    this.ensureGlacialSkateRibbon();
    this.spawnPermafrostZone(this.x, 155, 4.5);

    if (enemy && !enemy.isDead) {
      this.spawnSnowflakeChakram(
        this.x,
        this.y - 98,
        enemy.x,
        enemy.y - 98,
        28,
        16
      );
    }

    if (game && game.audio) game.audio.play('frost_cast', this.x);
    if (game && game.vfx) {
      game.vfx.spawnDamageText(this.x, this.y - 144, 0, false, 'ARABESQUE RIME GLIDE!', '#67e8f9');
    }
  }

  onStartDodge(enemy, game, dir) {
    const ww = game.renderer ? game.renderer.worldWidth : 1200;
    const dist = enemy ? Math.abs(enemy.x - this.x) : 999;
    const nearLeft = this.x < 305;
    const nearRight = this.x > ww - 305;

    this.isDeflecting = false;
    this.isFlipVault = false;
    this.flipAngle = 0;
    this.dashDuration = 0.40;

    const decoyX = this.x;
    const decoyFrame = PixelForge.getFrameIndex(this, this.walkPhase);
    this.iceDecoy = {
      x: decoyX,
      y: this.groundY,
      facing: this.facing,
      frameIdx: decoyFrame,
      life: 0,
      maxLife: 0.88,
      shattered: false
    };
    this.ensureGlacialSkateRibbon();
    this.spawnPermafrostZone(decoyX, 160, 4.6);

    let smartDir = nearLeft ? 1 : nearRight ? -1 : dir;
    if (enemy && dist < 245 && (nearLeft || nearRight)) {
      const openSideDir = enemy.x < ww * 0.5 ? 1 : -1;
      smartDir = openSideDir;
      this.vx = smartDir * 468;
    } else {
      this.vx = smartDir * 390;
    }
    this.dashDir = smartDir;

    if (game && game.audio) game.audio.play('frost_cast', decoyX);
    if (game && game.vfx) {
      game.vfx.spawnDamageText(decoyX, this.y - 156, 0, false, 'ICE-SCULPTURE DECOY!', '#a5f3fc');
    }
  }

  /**
   * Detonates Lyra's sculpted Ice-Sculpture Decoy into a radial Row-7 frost starburst + homing frost lance!
   */
  detonateIceDecoy(enemy, game) {
    if (!this.iceDecoy || this.iceDecoy.shattered) return;
    const d = this.iceDecoy;
    d.shattered = true;

    this.spawnPixelFrostRing(d.x, d.y - 92, 120, '#67e8f9', 0.32, false, true);

    if (this.fx) {
      const sx = Math.max(80, Math.min(1120, d.x));
      this.fx.burst(sx, d.y - 92, {
        count: 7,
        speedMin: 55,
        speedMax: 185,
        lifeMin: 0.16,
        lifeMax: 0.30,
        gravity: 80,
        colors: ['#ffffff', '#bae6fd', '#67e8f9', '#e879f9']
      });
    }
    if (game) {
      if (game.audio) game.audio.play('ice_shatter', d.x);
      if (game.vfx) {
        game.vfx.spawnDamageText(d.x, d.y - 162, 0, false, 'STATUE FROST NOVA!', '#67e8f9');
      }
    }

    if (enemy && !enemy.isDead) {
      const dist = Math.abs(enemy.x - d.x);
      if (dist < 230) {
        const isVanguard = enemy.hasPoise && enemy.attackRange <= 160;
        const isHarvester = enemy.hasPoise && enemy.attackRange > 160;
        const isGroundedCaster = !enemy.hasPoise && enemy.moveSpeed <= 122;
        const novaDmg = isVanguard ? 28 : isHarvester ? 31 : isGroundedCaster ? 34 : 36;
        enemy.takeDamage(novaDmg, this, false, 95, -58);
        this.applyBrittleFrost(enemy, 1, game, d.x, d.y - 92);
      } else if (game && game.vfx) {
        const dx = enemy.x - d.x;
        const dy = (enemy.y - 100) - (d.y - 96);
        const len = Math.hypot(dx, dy) || 1;
        game.vfx.spawnProjectile({
          x: d.x,
          y: d.y - 96,
          vx: (dx / len) * 700,
          vy: (dy / len) * 700,
          radius: 17,
          color: '#67e8f9',
          coreColor: '#ffffff',
          owner: this,
          damage: 25,
          type: 'cryo_shard'
        });
      }
    }
    this.iceDecoy = null;
  }

  updateDashOrDodge(_dt, enemy, game) {
    const t = this.stateTimer;
    this.ensureGlacialSkateRibbon();

    // Row 8: Triple-Axel Sky-Staircase (materializes 3 stepped mid-air crystal platforms beneath her skates!)
    if ((this.state === 'JUMP' || this.state === 'DODGE') && this.isFlipVault) {
      const u = Math.min(1, t / this.dashDuration);
      const airU = Math.max(0, Math.min(1, (u - 0.06) / 0.82));
      this.x = this.flipStartX + (this.flipTargetX - this.flipStartX) * airU;

      const liftFrac = Math.sin(airU * Math.PI);
      this.y = this.groundY - liftFrac * 92;
      this.flipAngle = 0;

      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }

      // Materialize 3 stepped Crystalline Sky-Stair Platforms along her arc
      const stepThresholds = [0.16, 0.42, 0.68];
      while (this._spawnedJumpSteps < 3 && u >= stepThresholds[this._spawnedJumpSteps]) {
        this._spawnedJumpSteps++;
        if (this.skyIceSteps.length >= 5) this.skyIceSteps.shift();
        this.skyIceSteps.push({
          x: this.x,
          y: this.y + 4,
          life: 0,
          maxLife: 1.35,
          width: 72
        });
      }

      if (u >= 0.46 && !this.didActionFrame && enemy && !enemy.isDead) {
        this.didActionFrame = true;
        const sx = this.x + this.facing * 30;
        const sy = this.y - 94;
        const dx = enemy.x - sx;
        const dy = (enemy.y - 98) - sy;
        const td = Math.hypot(dx, dy) || 1;
        if (game && game.audio) game.audio.play('prism_beam', this.x);
        if (game && game.vfx) {
          game.vfx.spawnProjectile({
            x: sx,
            y: sy,
            vx: (dx / td) * 725,
            vy: (dy / td) * 725,
            radius: 18,
            color: '#67e8f9',
            coreColor: '#e879f9',
            owner: this,
            damage: 32,
            type: 'cryo_shard'
          });
        }
        this.fx?.spawn('cryoPrismMachCone', Math.max(85, Math.min(1115, sx)), Math.max(55, sy), {
          flip: false,
          light: 1.24,
          extra: { aimAngle: Math.atan2(dy, dx), empowered: true }
        });
      }

      if (t >= this.dashDuration) {
        this.y = this.groundY;
        this.vy = 0;
        this.isFlipVault = false;
        this.flipAngle = 0;
        this.isInvulnerable = false;
        this.spawnPermafrostZone(this.x, 145, 4.2);
        this.spawnPixelFrostRing(this.x, this.groundY, 76, '#67e8f9', 0.25, true, false);
        this.setState('IDLE');
      }
      return;
    }

    if (t >= this.dashDuration) {
      this.isInvulnerable = false;
      this.vx *= 0.25;
      this.setState('IDLE');
    }
  }

  updateCrouch(_dt, enemy, game) {
    const t = this.stateTimer;
    this.vx = 0;
    this.isDeflecting = t < 0.82;

    if (t >= 0.32 && !this.didActionFrame && enemy && !enemy.isDead) {
      this.didActionFrame = true;
      const wallX = this.iceWall ? this.iceWall.x : this.x + this.facing * 72;
      const spawnY = this.groundY - 64;
      const dx = enemy.x - wallX;
      const dy = (enemy.y - 76) - spawnY;
      const d = Math.hypot(dx, dy) || 1;

      if (game && game.audio) game.audio.play('prism_beam', wallX);
      if (game && game.vfx) {
        game.vfx.spawnProjectile({
          x: wallX,
          y: spawnY,
          vx: (dx / d) * 715,
          vy: (dy / d) * 715,
          radius: 19,
          color: '#67e8f9',
          coreColor: '#ffffff',
          owner: this,
          damage: 30,
          type: 'cryo_shard'
        });
      }
      this.fx?.spawn('cryoPrismMachCone', Math.max(85, Math.min(1115, wallX)), spawnY, {
        flip: false,
        light: 1.22,
        extra: { aimAngle: Math.atan2(dy, dx), empowered: false }
      });
      this.applyBrittleFrost(enemy, 1, game, wallX, spawnY);
    }

    if (t >= this.crouchDuration) {
      this.isCrouching = false;
      this.isDeflecting = false;
      this.setState('IDLE');
    }
  }

  update(dt, enemy, game) {
    if (this.wallFlipCooldown > 0) this.wallFlipCooldown = Math.max(0, this.wallFlipCooldown - dt);
    if (this.crouchCooldown > 0) this.crouchCooldown = Math.max(0, this.crouchCooldown - dt);
    if (this._trueUltShatterTimer > 0) {
      this._trueUltShatterTimer = Math.max(0, this._trueUltShatterTimer - dt);
      for (const s of this._trueUltGlassShards) {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vy += s.gravity * dt;
        s.angle += s.spin * dt;
      }
      for (const d of this._trueUltDiamondDust) {
        d.x += (d.vx + Math.sin(d.phase + this._trueUltShatterTimer * 6.0) * 18) * dt;
        d.y += d.vy * dt;
      }
    }

    const activeFoes = game?.fighters
      ? game.fighters.filter(
          (f) => f && f !== this && !f.isDead && !f.isBenched && (!this.team || !f.team || f.team !== this.team)
        )
      : enemy && !enemy.isDead
        ? [enemy]
        : [];
    if (enemy && !enemy.isDead && !activeFoes.includes(enemy)) {
      activeFoes.push(enemy);
    }

    // 1. Update Returning 6-Bladed Snowflake Boomerang Chakrams (Row 1)
    const wwStage = game?.renderer ? game.renderer.worldWidth : 1200;
    for (let i = this.activeChakrams.length - 1; i >= 0; i--) {
      const c = this.activeChakrams[i];
      c.life += dt;
      c.trailTimer += dt;
      const isOutward = c.life <= c.outDuration;

      if (isOutward) {
        if (c.target && !c.target.isDead) {
          const desiredX = Math.max(85, Math.min(wwStage - 85, c.target.x + Math.sign(c.target.x - c.startX || 1) * 44));
          c.apexX += (desiredX - c.apexX) * Math.min(1, dt * 6.5);
          c.apexY += ((c.target.y - 96) - c.apexY) * Math.min(1, dt * 6.5);
        }
        const u = Math.min(1, c.life / c.outDuration);
        const easeU = 1 - Math.pow(1 - u, 1.65);
        c.x = c.startX + (c.apexX - c.startX) * easeU;
        c.y = c.startY + (c.apexY - c.startY) * easeU + Math.sin(u * Math.PI) * c.arcLift;

        for (const foe of activeFoes) {
          if (!c.hitOutSet.has(foe) && Math.abs(foe.x - c.x) < 76 && Math.abs((foe.y - 96) - c.y) < 104) {
            c.hitOutSet.add(foe);
            const isCrit = Math.random() < 0.26;
            foe.takeDamage(isCrit ? Math.round(c.outDmg * 1.32) : c.outDmg, this, isCrit, 48, -34);
            this.mana = Math.min(this.maxMana, (this.mana || 0) + 9);
            this.applyBrittleFrost(foe, 1, game, c.x, c.y);
            if (game?.audio) game.audio.play('slash', c.x);
            this.spawnPixelFrostRing(c.x, c.y, 74, '#67e8f9', 0.22, false, false);
          }
        }
      } else {
        const retDur = Math.max(0.05, c.totalDuration - c.outDuration);
        const u = Math.min(1, (c.life - c.outDuration) / retDur);
        const targetRetX = this.x + this.facing * 32;
        const targetRetY = this.y - 102;
        c.x = c.apexX + (targetRetX - c.apexX) * u;
        c.y = c.apexY + (targetRetY - c.apexY) * u - Math.sin(u * Math.PI) * c.arcLift * 0.72;

        for (const foe of activeFoes) {
          if (!c.hitRetSet.has(foe) && Math.abs(foe.x - c.x) < 68 && Math.abs((foe.y - 96) - c.y) < 96) {
            c.hitRetSet.add(foe);
            foe.takeDamage(c.returnDmg, this, false, -38, -28);
            this.applyBrittleFrost(foe, 1, game, c.x, c.y);
            if (game?.audio) game.audio.play('frost_cast', c.x);
          }
        }
      }

      if (c.life >= c.totalDuration) {
        if (c.hitOutSet.size > 0 || c.hitRetSet.size > 0) {
          this.heal(7, 'CHAKRAM CATCH');
        }
        this.activeChakrams.splice(i, 1);
      }
    }

    // 2. Update Sequential Ground-Marching Row-2 Glacier Stalagmite Spires
    for (let i = this.activeMarchingSpires.length - 1; i >= 0; i--) {
      const sp = this.activeMarchingSpires[i];
      if (sp.delay > 0) {
        sp.delay -= dt;
        continue;
      }
      if (!sp.erupted) {
        sp.erupted = true;
        if (sp.isFinal && sp.target && !sp.target.isDead && Math.abs(sp.target.x - this.x) <= 560) {
          sp.x = Math.max(95, Math.min(wwStage - 95, sp.target.x));
        }
        if (game?.audio) game.audio.play(sp.isFinal ? 'ice_shatter' : 'frost_cast', sp.x);
        if (sp.isFinal) {
          this.spawnPermafrostZone(sp.x, 155, 4.4);
          this.spawnPixelFrostRing(sp.x, sp.y - 36, 98, '#67e8f9', 0.26, true, true);
        }
      }
      sp.life += dt;
      if (!sp.didHit && sp.life >= 0.02 && sp.life <= 0.28) {
        for (const foe of activeFoes) {
          if (Math.abs(foe.x - sp.x) < 78 && Math.abs(foe.y - sp.y) < 108) {
            sp.didHit = true;
            foe.takeDamage(sp.dmg, this, sp.isFinal, 52, sp.isFinal ? -92 : -45);
            if (sp.isFinal) {
              this.mana = Math.min(this.maxMana, (this.mana || 0) + 10);
              this.applyBrittleFrost(foe, 1, game, sp.x, sp.y - 68);
            }
            break;
          }
        }
      }
      if (sp.life >= sp.maxLife) {
        this.activeMarchingSpires.splice(i, 1);
      }
    }

    // 3. Update Solid 4-Stack Crystal Stasis Prisons & Mid-Air Sky-Staircase Platforms
    for (let i = this.activeCrystalPrisons.length - 1; i >= 0; i--) {
      const cp = this.activeCrystalPrisons[i];
      cp.life += dt;
      if (cp.target && !cp.target.isDead) {
        cp.x = cp.target.x;
        cp.y = cp.target.y;
      }
      if (cp.life >= cp.maxLife) {
        this.activeCrystalPrisons.splice(i, 1);
      }
    }
    for (let i = this.skyIceSteps.length - 1; i >= 0; i--) {
      this.skyIceSteps[i].life += dt;
      if (this.skyIceSteps[i].life >= this.skyIceSteps[i].maxLife) {
        this.skyIceSteps.splice(i, 1);
      }
    }

    // 4. Update Permafrost Ice-Rink Floor Zones (smooth figure-skating speed boost, zero walk dust spam!)
    let onPermafrost = false;
    for (let i = this.permafrostZones.length - 1; i >= 0; i--) {
      const z = this.permafrostZones[i];
      z.life += dt;
      if (Math.abs(this.x - z.x) <= z.radius) {
        onPermafrost = true;
      }
      if (enemy && !enemy.isDead && Math.abs(enemy.x - z.x) <= z.radius && Math.abs(enemy.y - this.groundY) < 28) {
        if (!enemy.hasPoise) {
          enemy.vx *= Math.pow(0.45, dt);
        }
        enemy._permafrostTick = (enemy._permafrostTick || 0) + dt;
        if (enemy._permafrostTick >= 1.35) {
          enemy._permafrostTick = 0;
          this.applyBrittleFrost(enemy, 1, game, z.x, this.groundY - 40);
        }
      }
      if (z.life >= z.maxLife) {
        if (z.fxSlot) z.fxSlot.done = true;
        this.permafrostZones.splice(i, 1);
      }
    }

    if (onPermafrost && this.state === 'WALK') {
      this.x += this.facing * (this.moveDir || 1) * 42 * dt;
    }

    for (const foe of activeFoes) {
      if (foe.brittleStacks > 0) {
        foe.brittleDecayTimer = (foe.brittleDecayTimer || 4.5) - dt;
        if (foe.brittleDecayTimer <= 0) {
          foe.brittleStacks = 0;
        }
      }
    }

    // 5. Update Sculpted Ice-Sculpture Decoy
    if (this.iceDecoy) {
      this.iceDecoy.life += dt;
      const enemyNear = enemy && !enemy.isDead && Math.abs(enemy.x - this.iceDecoy.x) < 155;
      if (enemyNear || this.iceDecoy.life >= this.iceDecoy.maxLife) {
        this.detonateIceDecoy(enemy, game);
      }
    }

    // 6. Update Hydroblade Mirror Wall (intercepts & splits incoming enemy projectiles into twin cryo-lances!)
    if (this.iceWall) {
      this.iceWall.life += dt;
      if (game && game.vfx && game.vfx.projectiles) {
        for (let i = game.vfx.projectiles.length - 1; i >= 0; i--) {
          const proj = game.vfx.projectiles[i];
          const isEnemyProj =
            proj.owner !== this && (!this.team || !proj.owner?.team || proj.owner.team !== this.team);
          if (
            isEnemyProj &&
            Math.abs(proj.x - this.iceWall.x) < 48 &&
            Math.abs(proj.y - (this.iceWall.y - 76)) < 86
          ) {
            const origX = proj.x;
            const origY = proj.y;
            game.vfx.projectiles.splice(i, 1);
            this.iceWall.refractedCount++;
            if (game.audio) game.audio.play('reflect', origX);
            game.vfx.spawnDamageText(origX, origY - 36, 0, false, 'MIRROR WALL SPLIT!', '#67e8f9');
            this.fx?.spawn('absoluteZeroShatterBurst', Math.max(80, Math.min(1120, origX)), origY, {
              light: 1.26,
              extra: { isLarge: false }
            });

            if (enemy && !enemy.isDead) {
              for (const offsetAng of [-0.15, 0.15]) {
                const dx = enemy.x - origX;
                const dy = (enemy.y - 98) - origY;
                const baseAng = Math.atan2(dy, dx) + offsetAng;
                game.vfx.spawnProjectile({
                  x: origX,
                  y: origY,
                  vx: Math.cos(baseAng) * 700,
                  vy: Math.sin(baseAng) * 700,
                  radius: 16,
                  color: '#67e8f9',
                  coreColor: '#e879f9',
                  owner: this,
                  damage: 23,
                  type: 'cryo_shard'
                });
              }
            }
          }
        }
      }
      if (this.iceWall.life >= this.iceWall.maxLife) {
        this.iceWall = null;
      }
    }

    // 7. Update Flanking Glacier Jaws (SKILL) & 7-Sword Coronation Domain (ULTIMATE)
    if (this.glacierJaws) {
      this.glacierJaws.life += dt;
      if (this.glacierJaws.life >= this.glacierJaws.maxLife) {
        this.glacierJaws = null;
      }
    }
    if (this.coronationDomain) {
      this.coronationDomain.life += dt;
      if (this.coronationDomain.life >= this.coronationDomain.maxLife) {
        this.coronationDomain = null;
      }
    }
    for (let i = this.activeFrostRings.length - 1; i >= 0; i--) {
      this.activeFrostRings[i].life += dt;
      if (this.activeFrostRings[i].life >= this.activeFrostRings[i].maxLife) {
        this.activeFrostRings.splice(i, 1);
      }
    }

    this.fx.update(dt);

    // 8. Proactive Winter Empress Tactical Figure-Skating AI
    if (enemy && !enemy.isDead && (this.state === 'IDLE' || this.state === 'WALK')) {
      const dist = Math.abs(enemy.x - this.x);
      const ww = game.renderer ? game.renderer.worldWidth : 1200;
      const nearWall = this.x < 255 || this.x > ww - 255;
      const pinnedLeft = this.x < 235 && enemy.x > this.x;
      const pinnedRight = this.x > ww - 235 && enemy.x < this.x;
      const incomingProj =
        game.vfx &&
        game.vfx.projectiles.some((p) => p.owner === enemy && Math.abs(p.x - this.x) < 175);

      if ((pinnedLeft || pinnedRight) && dist < 260 && this.dodgeCooldown <= 0 && this.wallFlipCooldown <= 0) {
        this.wallFlipCooldown = 3.0;
        this.startJump(enemy, game);
        return;
      }

      if (incomingProj && this.crouchCooldown <= 0 && !this.iceWall) {
        this.startCrouch(enemy, game);
        return;
      }

      if ((dist < 225 || (nearWall && dist < 295)) && this.dodgeCooldown <= 0) {
        this.startDodge(enemy, game);
        return;
      }

      if (
        dist >= 265 &&
        dist <= this.attackRange &&
        this.autoCooldown <= 0 &&
        this.crouchCooldown <= 0 &&
        this.comboStep % 5 === 3
      ) {
        this.autoCooldown = this.autoInterval * (0.92 + Math.random() * 0.18);
        this.startCrouch(enemy, game);
        return;
      }
    }

    super.update(dt, enemy, game);
  }

  /**
   * ★ 3-VARIANT DYNAMIC NORMAL ATTACK (`Row 2`):
   *  - Variant 0 (`F00..F09`): Rime-Lance Needle Comet
   *  - Variant 1 (`F10..F19`): Arabesque Snowflake Boomerang Chakram
   *  - Variant 2 (`F20..F29`): 2H Overhead Scepter Glacier Stalagmite March
   */
  updateAutoAttack(_dt, enemy, game) {
    const t = this.stateTimer;
    const dur = 0.78;
    const mode = this._autoVariant || 0;
    const subFrame = Math.min(9, Math.floor((t / dur) * 10));
    this.trueUltFrameOverride = 60 + mode * 10 + subFrame;

    if (t < 0.22) {
      this.torsoAngle = -this.facing * 0.12 * (t / 0.22);
      if (t >= 0.04 && !this._drewScepterFocus) {
        this._drewScepterFocus = true;
        this.fx.spawn('cryoScepterFocus', this.x + this.facing * 44, this.y - 110, {
          follow: this,
          offsetX: 44,
          offsetY: -110,
          flip: this.facing < 0,
          light: 1.22
        });
      }
    } else if (t < 0.56) {
      if (!this.didActionFrame) {
        this.didActionFrame = true;
        this.comboStep++;
        this.torsoVel = this.facing * 8.2;

        const spawnX = this.x + this.facing * 52;
        const spawnY = this.y - 108;
        const targetX = enemy ? enemy.x : spawnX + this.facing * 440;
        const targetY = enemy ? enemy.y - 104 : spawnY;
        const dx = targetX - spawnX;
        const dy = targetY - spawnY;
        const dist = Math.hypot(dx, dy) || 1;

        const isVanguard = enemy && enemy.hasPoise && enemy.attackRange <= 160;
        const isHarvester = enemy && enemy.hasPoise && enemy.attackRange > 160;
        const isGroundedCaster = enemy && !enemy.hasPoise && enemy.moveSpeed <= 122;

        if (mode === 0) {
          // Variant 1: High-Speed Rime-Lance Needle Comet
          const lanceDmg = isVanguard ? 50 : isHarvester ? 53 : isGroundedCaster ? 56 : 58;
          if (game?.audio) game.audio.play('prism_beam', this.x);
          game?.vfx?.spawnProjectile?.({
            x: spawnX,
            y: spawnY,
            vx: (dx / dist) * 725,
            vy: (dy / dist) * 725,
            radius: 19,
            color: '#67e8f9',
            coreColor: '#ffffff',
            owner: this,
            damage: lanceDmg,
            type: 'cryo_shard'
          });
          this.fx.spawn('cryoPrismMachCone', Math.max(85, Math.min(1115, spawnX)), spawnY, {
            flip: false,
            light: 1.22,
            extra: { aimAngle: Math.atan2(dy, dx), empowered: false }
          });
        } else if (mode === 1) {
          // Variant 2: Pure Arabesque Spinning 6-Bladed Snowflake Boomerang Halo!
          const chakramOutDmg = isVanguard ? 50 : isHarvester ? 53 : isGroundedCaster ? 56 : 58;
          if (game?.audio) game.audio.play('frost_cast', this.x);
          this.spawnSnowflakeChakram(spawnX, spawnY, targetX, targetY, chakramOutDmg, 22, enemy);
          if (game?.vfx) {
            game.vfx.spawnDamageText(this.x, this.y - 148, 0, false, 'SNOWFLAKE CHAKRAM!', '#a5f3fc');
          }
        } else {
          // Variant 3: Pure 2H Overhead Scepter Command — 3 Sequential Ground-Marching Glacier Spires!
          const spireBaseDmg = isVanguard ? 54 : isHarvester ? 57 : isGroundedCaster ? 60 : 62;
          if (game?.audio) game.audio.play('frost_cast', this.x);
          this.spawnGlacierStalagmiteMarch(enemy, spireBaseDmg);
          this.fx.spawn('cryoPrismMachCone', Math.max(85, Math.min(1115, spawnX)), spawnY, {
            flip: false,
            light: 1.28,
            extra: { aimAngle: Math.atan2(dy, dx), empowered: true }
          });
        }
      }
    } else if (t >= dur) {
      this.trueUltFrameOverride = null;
      this.setState('IDLE');
    }
  }

  /**
   * ★ SIGNATURE SKILL (`Row 3`, `0.90s`): "GLACIAL JAWS: TWIN ICEBERG CRUSH"
   * Erupts TWO towering Row-2 Glacier Iceberg Monoliths to the LEFT and RIGHT of the enemy,
   * pulling them into the blizzard jaws before SLAMMING both giant icebergs inward together!
   */
  updateSkill(dt, enemy, game) {
    const t = this.stateTimer;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;

    if (t < 0.12) {
      this.didJawsErupt = false;
      this.didJawsSlam = false;
      this.isDeflecting = true;
    } else if (t < 0.52) {
      if (!this.didJawsErupt) {
        this.didJawsErupt = true;
        const rawTx = enemy ? enemy.x : this.x + this.facing * 270;
        const tx = Math.max(210, Math.min(ww - 210, rawTx));
        const ty = enemy ? enemy.groundY : this.groundY;

        if (game?.audio) game.audio.play('frost_cast', tx);
        this.spawnPermafrostZone(tx, 185, 5.0);
        this.fx.spawn('blizzardJawsVortex', tx, ty, { light: 1.28 });

        this.glacierJaws = {
          x: tx,
          y: ty,
          spread: 136,
          life: 0,
          maxLife: 0.84,
          slammed: false
        };

        if (enemy && !enemy.isDead) {
          const isVanguard = enemy.hasPoise && enemy.attackRange <= 160;
          const isHarvester = enemy.hasPoise && enemy.attackRange > 160;
          const isGroundedCaster = !enemy.hasPoise && enemy.moveSpeed <= 122;
          const eruptDmg = isVanguard ? 38 : isHarvester ? 41 : isGroundedCaster ? 44 : 46;
          enemy.takeDamage(eruptDmg, this, false, -16, -32);
          this.applyBrittleFrost(enemy, 1, game, tx, ty - 96);
          if (game?.vfx) {
            game.vfx.spawnDamageText(tx, ty - 196, 0, false, 'GLACIAL JAWS ERUPT!', '#67e8f9');
          }
          if (game?.renderer) game.renderer.triggerShake(10, 0.18);
        }
      }

      // Smoothly accelerate the Twin Flanking Icebergs inward from spread 136px -> 20px!
      if (this.glacierJaws) {
        if (t >= 0.30) {
          const closeU = Math.min(1, (t - 0.30) / 0.22);
          const slamCurve = closeU * closeU;
          this.glacierJaws.spread = 136 - 118 * slamCurve;
        }
        if (enemy && !enemy.isDead && !enemy.hasPoise && Math.abs(enemy.x - this.glacierJaws.x) < 190) {
          enemy.x += (this.glacierJaws.x - enemy.x) * Math.min(1, dt * 8.5);
        }
      }
    } else if (!this.didJawsSlam && t >= 0.52) {
      this.didJawsSlam = true;
      this.isDeflecting = false;
      const tx = this.glacierJaws
        ? this.glacierJaws.x
        : Math.max(210, Math.min(ww - 210, enemy ? enemy.x : this.x + this.facing * 270));
      const ty = this.glacierJaws ? this.glacierJaws.y : this.groundY;

      if (this.glacierJaws) {
        this.glacierJaws.spread = 16;
        this.glacierJaws.slammed = true;
      }

      if (game?.audio) {
        game.audio.play('ice_shatter', tx);
        game.audio.play('thunder_slam', tx);
      }
      if (game?.renderer) {
        game.renderer.triggerShake(17, 0.28);
        game.renderer.triggerAberration(9);
      }
      this.spawnPixelFrostRing(tx, ty - 92, 152, '#67e8f9', 0.36, false, true);
      this.fx.burst(tx, ty - 92, {
        count: 12,
        speedMin: 65,
        speedMax: 225,
        lifeMin: 0.16,
        lifeMax: 0.34,
        gravity: 90,
        colors: ['#ffffff', '#bae6fd', '#67e8f9', '#38bdf8', '#e879f9']
      });

      const targets = game?.fighters
        ? game.fighters.filter(
            (f) => f && f !== this && !f.isDead && !f.isBenched && (!this.team || !f.team || f.team !== this.team)
          )
        : enemy && !enemy.isDead
          ? [enemy]
          : [];
      if (enemy && !enemy.isDead && !targets.includes(enemy)) targets.push(enemy);

      for (const foe of targets) {
        if (Math.abs(foe.x - tx) <= 185) {
          const isVanguard = foe.hasPoise && foe.attackRange <= 160;
          const isHarvester = foe.hasPoise && foe.attackRange > 160;
          const isGroundedCaster = !foe.hasPoise && foe.moveSpeed <= 122;
          const crushDmg = isVanguard ? 52 : isHarvester ? 56 : isGroundedCaster ? 59 : 62;
          foe.takeDamage(crushDmg, this, true, 78, -112);
          this.applyBrittleFrost(foe, 2, game, tx, ty - 92);
        }
      }
      if (game?.vfx) {
        game.vfx.spawnDamageText(tx, ty - 216, 0, true, '★ TWIN ICEBERG CRUSH! ★', '#f0f9ff');
      }
    } else if (t >= 0.90) {
      this.isDeflecting = false;
      this.setState('IDLE');
    }
  }

  /**
   * ★ OVERDRIVE ULTIMATE (`Row 4`, `1.62s`): "WINTER CORONATION: SEVEN CELESTIAL ICE-SWORDS"
   *  - Stage 1 (`0.05s`): Freezes Royal Winter Palace Rink & summons 7 Giant Celestial Ice-Claymores (`Row 4`)
   *                       in a Coronation Halo high above the target.
   *  - Stage 2 (`0.28s..0.73s`): The 6 outer Celestial Ice-Claymores plunge down sequentially to IMPALE
   *                              into the arena floor, caging the target inside a hexagonal sword palisade!
   *  - Stage 3 (`1.02s`): Colossal 7th Sovereign Crown-Claymore plunges into the center, detonating all 7 swords!
   */
  updateUltimate(_dt, enemy, game) {
    const t = this.stateTimer;
    const ww = game.renderer ? game.renderer.worldWidth : 1200;
    const targetX = enemy ? enemy.x : this.x + this.facing * 280;
    const centerX = Math.max(250, Math.min(ww - 250, targetX));

    this.vx = 0;
    this.vy = 0;
    this.y = this.groundY;
    this.isDeflecting = t < 1.48;

    if (t < 0.04) {
      this.ultStage = 0;
      this._ultSwordsDropped = 0;
    }

    const isVanguard = enemy && enemy.hasPoise && enemy.attackRange <= 160;
    const isHarvester = enemy && enemy.hasPoise && enemy.attackRange > 160;
    const isGroundedCaster = enemy && !enemy.hasPoise && enemy.moveSpeed <= 122;

    // Stage 1: Royal Rink & 7-Sword Celestial Coronation Halo
    if (t >= 0.05 && this.ultStage === 0) {
      this.ultStage = 1;
      if (game.audio) game.audio.play('frost_cast', centerX);
      game.renderer.triggerShake(13, 0.24);

      this.spawnPermafrostZone(centerX, 240, 6.0);
      const swordOffsets = [-176, -114, -56, 56, 114, 176];
      const swords = swordOffsets.map((ox, idx) => ({
        skyX: centerX + Math.cos(-Math.PI * 0.88 + (idx / 5) * Math.PI * 0.76) * 188,
        skyY: this.groundY - 268 - Math.sin((idx / 5) * Math.PI) * 44,
        floorX: centerX + ox,
        floorY: this.groundY - 82,
        dropStart: 0.26 + idx * 0.085,
        dropDur: 0.11,
        impacted: false,
        magenta: idx % 2 === 1
      }));

      this.coronationDomain = {
        x: centerX,
        y: this.groundY,
        life: 0,
        maxLife: 1.56,
        swords,
        crownDropStart: 0.88,
        crownDropDur: 0.14,
        shattered: false
      };

      this.fx.spawn('borealisCathedralDomain', centerX, this.groundY, { light: 1.36 });
      game.vfx.spawnDamageText(
        centerX,
        this.groundY - 348,
        0,
        false,
        'WINTER CORONATION — SEVEN ICE-SWORDS!',
        '#67e8f9'
      );

      if (enemy && !enemy.isDead) {
        if (!enemy.hasPoise) enemy.vx = 0;
        const d1 = isVanguard ? 34 : isHarvester ? 37 : isGroundedCaster ? 40 : 42;
        enemy.takeDamage(d1, this, false, -18, 0);
        this.applyBrittleFrost(enemy, 2, game, centerX, this.groundY - 110);
        game.vfx.spawnGlyphBurst(enemy.x, enemy.y - 96, 3, 'glacial');
      }
      if (game?.fighters) {
        for (const foe of game.fighters) {
          if (
            foe &&
            foe !== this &&
            foe !== enemy &&
            !foe.isDead &&
            !foe.isBenched &&
            (!this.team || foe.team !== this.team) &&
            Math.abs(foe.x - centerX) <= 225
          ) {
            foe.takeDamage(32, this, false, -16, 0);
            this.applyBrittleFrost(foe, 2, game, foe.x, this.groundY - 110);
          }
        }
      }
    }

    if (enemy && !enemy.isDead && !enemy.hasPoise && t < 1.02) {
      enemy.vx *= 0.14;
      if (this.coronationDomain) {
        enemy.x += (this.coronationDomain.x - enemy.x) * 0.08;
      }
    }

    // Sequential Floor Impale FX for the 6 outer Celestial Ice-Claymores
    if (this.coronationDomain) {
      for (const sw of this.coronationDomain.swords) {
        if (!sw.impacted && t >= sw.dropStart + sw.dropDur) {
          sw.impacted = true;
          this.fx.spawn('coronationSwordImpact', sw.floorX, this.groundY, {
            light: 1.24,
            extra: { magenta: sw.magenta }
          });
          if (game.audio) game.audio.play(sw.magenta ? 'clang' : 'frost_cast', sw.floorX);
          if (game.renderer) game.renderer.triggerShake(7, 0.10);
        }
      }
    }

    // Stage 2 (`t >= 0.56s`): 6-Sword Hexagonal Palisade Cage Convergence Slash
    if (t >= 0.56 && this.ultStage === 1) {
      this.ultStage = 2;
      const cx = this.coronationDomain ? this.coronationDomain.x : centerX;
      if (game.audio) game.audio.play('prism_beam', cx);
      game.renderer.triggerShake(14, 0.22);

      if (enemy && !enemy.isDead) {
        const d2 = isVanguard ? 40 : isHarvester ? 43 : isGroundedCaster ? 46 : 48;
        enemy.takeDamage(d2, this, true, 0, -48);
        game.vfx.spawnDamageText(cx, this.groundY - 316, 0, false, 'HEXAGONAL ICE-SWORD CAGE!', '#e879f9');
      }
      if (game?.fighters) {
        for (const foe of game.fighters) {
          if (
            foe &&
            foe !== this &&
            foe !== enemy &&
            !foe.isDead &&
            !foe.isBenched &&
            (!this.team || foe.team !== this.team) &&
            Math.abs(foe.x - cx) <= 225
          ) {
            foe.takeDamage(38, this, true, 0, -42);
          }
        }
      }
    }

    // Stage 3 (`t >= 1.02s`): Colossal 7th Sovereign Crown-Claymore Plunge & 7-Sword Lotus Detonation!
    if (t >= 1.02 && this.ultStage === 2) {
      this.ultStage = 3;
      const cx = this.coronationDomain ? this.coronationDomain.x : centerX;
      const cy = this.groundY - 128;
      if (this.coronationDomain) {
        this.coronationDomain.shattered = true;
      }

      if (game.audio) {
        game.audio.play('ice_shatter', cx);
        game.audio.play('hit_crit', cx);
      }
      game.renderer.triggerShake(26, 0.48);
      game.renderer.triggerAberration(15);
      game.renderer.triggerHitStop(0.085);

      this.fx.spawn('coronationSwordImpact', cx, this.groundY, {
        light: 1.42,
        extra: { magenta: true }
      });
      this.spawnPixelFrostRing(cx, cy, 248, '#67e8f9', 0.44, false, true);
      this.fx.burst(cx, cy, {
        count: 15,
        speedMin: 85,
        speedMax: 280,
        lifeMin: 0.20,
        lifeMax: 0.40,
        gravity: 92,
        colors: ['#ffffff', '#bae6fd', '#67e8f9', '#38bdf8', '#e879f9']
      });
      game.vfx.spawnGlyphBurst(cx, cy, 5, 'glacial');
      game.vfx.spawnDamageText(cx, this.groundY - 372, 0, true, '★ SOVEREIGN CROWN-SWORD SHATTER! ★', '#f0f9ff');

      if (enemy && !enemy.isDead) {
        const d3 = isVanguard ? 118 : isHarvester ? 124 : isGroundedCaster ? 130 : 136;
        enemy.takeDamage(d3, this, true, 168, -212);
        this.heal(26, 'WINTER CORONATION');
      }
      if (game?.fighters) {
        for (const foe of game.fighters) {
          if (
            foe &&
            foe !== this &&
            foe !== enemy &&
            !foe.isDead &&
            !foe.isBenched &&
            (!this.team || foe.team !== this.team) &&
            Math.abs(foe.x - cx) <= 235
          ) {
            foe.takeDamage(106, this, true, 148, -185);
            this.applyBrittleFrost(foe, 2, game, foe.x, this.groundY - 105);
          }
        }
      }
    }

    if (t >= 1.62) {
      this.isDeflecting = false;
      this.coronationDomain = null;
      this.setState('IDLE');
    }
  }

  /**
   * Precomputes deterministic arena-wide Reality-Glass Fracture Cracks, 28 Faceted Stained-Glass
   * Ice Shards, and Falling Diamond Dust snow for `TRUE_ULTIMATE` (zero `ctx.rotate` calls!).
   */
  _buildTrueUltFracturesAndShards() {
    this._trueUltCracks = [];
    for (let i = 0; i < 14; i++) {
      const baseAng = (i / 14) * Math.PI * 2 + (i % 2 === 0 ? 0.08 : -0.06);
      const segs = [];
      let cx = 0;
      let cy = 0;
      const reach = 180 + (i % 3) * 85;
      const steps = 5;
      for (let s = 1; s <= steps; s++) {
        const jitter = ((i * 7 + s * 13) % 11 - 5) * 0.055;
        const stepLen = reach / steps;
        const nx = cx + Math.cos(baseAng + jitter) * stepLen * 1.32;
        const ny = cy + Math.sin(baseAng + jitter) * stepLen * 0.78;
        segs.push({ x0: cx, y0: cy, x1: nx, y1: ny });
        if (s === 3) {
          const forkAng = baseAng + (i % 2 === 0 ? 0.52 : -0.52);
          segs.push({
            x0: nx,
            y0: ny,
            x1: nx + Math.cos(forkAng) * 68,
            y1: ny + Math.sin(forkAng) * 46
          });
        }
        cx = nx;
        cy = ny;
      }
      this._trueUltCracks.push({
        threshold: (i / 14) * 0.75,
        magenta: i % 3 === 1,
        segs
      });
    }

    const palette = [
      { fill: '#38bdf8', facet: '#bae6fd' },
      { fill: '#67e8f9', facet: '#f0f9ff' },
      { fill: '#1d4ed8', facet: '#7dd3fc' },
      { fill: '#c084fc', facet: '#f5d0fe' }
    ];
    this._trueUltGlassShards = [];
    for (let i = 0; i < 28; i++) {
      const ang = (i / 28) * Math.PI * 2 + (i % 3) * 0.09;
      const spd = 240 + (i % 5) * 92;
      const r1 = 18 + (i % 4) * 7;
      const r2 = 12 + ((i + 2) % 3) * 6;
      const col = palette[i % palette.length];
      this._trueUltGlassShards.push({
        x: 0,
        y: 0,
        vx: Math.cos(ang) * spd * 1.22,
        vy: Math.sin(ang) * spd * 0.85 - 95,
        gravity: 340,
        angle: ang,
        spin: (i % 2 === 0 ? 1 : -1) * (4.2 + (i % 4) * 1.3),
        r1,
        r2,
        fill: col.fill,
        facet: col.facet
      });
    }

    this._trueUltDiamondDust = [];
    for (let i = 0; i < 42; i++) {
      this._trueUltDiamondDust.push({
        x: 80 + ((i * 97) % 1040),
        y: 30 + ((i * 53) % 360),
        vx: ((i % 5) - 2) * 12,
        vy: 38 + (i % 4) * 16,
        phase: i * 0.7,
        size: i % 3 === 0 ? 6 : 4,
        magenta: i % 4 === 0
      });
    }
  }

  /**
   * ★ 3-OVERDRIVE SUPREME ULTIMATE (`state === 'TRUE_ULTIMATE'`, `4.60s`):
   * "ABSOLUTE ZERO: DIAMOND DUST ETERNITY"
   * Never alters `trueUltStageOverride` or `permanentStageOverride`.
   */
  updateTrueUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    this.isInvulnerable = true;
    this.vx = 0;
    this.vy = 0;

    if (t < 0.04) {
      this._trueUltStep = 0;
    }

    const targets = game?.fighters
      ? game.fighters.filter(
          (f) => f && f !== this && !f.isDead && !f.isBenched && (!this.team || !f.team || f.team !== this.team)
        )
      : [];
    if (enemy && !enemy.isDead && !enemy.isBenched && !targets.includes(enemy)) {
      targets.push(enemy);
    }

    // =========================================================================
    // ACT I (0.00s .. 1.12s — Polar Night, Northern Lights & Sovereign Ascension)
    // =========================================================================
    if (t < 1.12) {
      this._trueUltCoffinX = enemy
        ? Math.max(240, Math.min(960, enemy.x))
        : Math.max(240, Math.min(960, this.x + this.facing * 240));
      if (Math.abs(this._trueUltCoffinX - this.x) > 8) {
        this.facing = this._trueUltCoffinX >= this.x ? 1 : -1;
      }

      const liftU = Math.min(1, t / 0.34);
      const smoothLift = 1 - Math.pow(1 - liftU, 2.2);
      this.y = this.groundY - 90 * smoothLift;
      this.cameraAirLift = 112 * smoothLift;
      this.trueUltFrameOverride = 120 + Math.min(8, Math.floor((t / 1.12) * 9));

      if (t >= 0.04 && this._trueUltStep < 1) {
        this._trueUltStep = 1;
        game?.audio?.play?.('ult_cast', this.x);
        game?.audio?.play?.('frost_cast', this.x);
        game?.vfx?.triggerCinematicCutIn?.(this, this.trueUltName, '#38bdf8');
        game?.vfx?.spawnDamageText?.(
          this.x,
          this.y - 172,
          0,
          true,
          '★ POLAR NIGHT: ABSOLUTE ZERO! ★',
          '#67e8f9'
        );
        this.spawnPermafrostZone(this._trueUltCoffinX, 240, 5.8);
        this.fx?.spawn('absoluteZeroAuroraVeil', 600, this.groundY - 210, { light: 1.32 });
      }
      return;
    }

    // =========================================================================
    // ACT II & ACT III (1.12s .. 3.28s — 0.00 K Diamond-Coffin Entombment,
    // 6-Mirror Borealis Star-Snowflake Cathedral & Reality-Glass Fracture!)
    // =========================================================================
    if (t >= 1.12 && this._trueUltStep < 2) {
      this._trueUltStep = 2;
      game?.audio?.play?.('frost_cast', this._trueUltCoffinX);
      game?.audio?.play?.('prism_beam', this._trueUltCoffinX);
      game?.vfx?.spawnDamageText?.(
        this._trueUltCoffinX,
        this.groundY - 248,
        0,
        true,
        'DIAMOND-LOTUS MONOLITH — 0.00 K!',
        '#a5f3fc'
      );
    }

    if (t >= 2.32 && this._trueUltStep < 3) {
      this._trueUltStep = 3;
      game?.audio?.play?.('frost_cast', this._trueUltCoffinX);
      game?.renderer?.triggerShake?.(9, 0.22);
      game?.vfx?.spawnDamageText?.(
        this._trueUltCoffinX,
        this.groundY - 278,
        0,
        true,
        '★ -273.15°C • REALITY FREEZING! ★',
        '#e879f9'
      );
    }

    if (t >= 1.12 && t < 3.28) {
      this.y = this.groundY - 90 + Math.sin((t - 1.12) * 3.2) * 4;
      this.cameraAirLift = 112;

      if (t < 2.32) {
        // Row 4 F09..F16: Coronation Command Pose
        const uCmd = (t - 1.12) / 1.20;
        this.trueUltFrameOverride = 129 + Math.min(7, Math.floor(uCmd * 8));
      } else {
        // Row 4 F17..F23: Iconic Vertical Sovereign Scepter-Tap Windup & Strike!
        const uTap = (t - 2.32) / 0.96;
        this.trueUltFrameOverride = 137 + Math.min(6, Math.floor(uTap * 7));
      }

      // Hold active foes frozen at the heart of the Diamond-Coffin Monolith (ZERO micro-DoT ticks!)
      if (enemy && !enemy.isDead) {
        enemy.x += (this._trueUltCoffinX - enemy.x) * Math.min(1, dt * 18);
        enemy.vx = 0;
        enemy.vy = 0;
        enemy.chronoTimeStopTimer = Math.max(enemy.chronoTimeStopTimer || 0, 0.16);
      }
      for (const foe of targets) {
        if (foe && !foe.isDead) {
          foe.x += (this._trueUltCoffinX - foe.x) * Math.min(1, dt * 18);
          foe.vx = 0;
          foe.vy = 0;
          foe.chronoTimeStopTimer = Math.max(foe.chronoTimeStopTimer || 0, 0.16);
        }
      }
      return;
    }

    // =========================================================================
    // ACT IV (t >= 3.28s — Sovereign Scepter-Tap & ★ DIAMOND DUST ETERNITY! ★)
    // =========================================================================
    if (t >= 3.28 && this._trueUltStep < 4) {
      this._trueUltStep = 4;
      this._trueUltShatterTimer = 1.28;

      const cx = this._trueUltCoffinX;
      const cy = this.groundY - 152;
      for (const s of this._trueUltGlassShards) {
        s.x = cx + (Math.cos(s.angle) * 42);
        s.y = cy + (Math.sin(s.angle) * 48);
      }

      if (enemy) enemy.chronoTimeStopTimer = 0;
      for (const foe of targets) {
        if (foe) foe.chronoTimeStopTimer = 0;
      }

      game?.renderer?.triggerImpactFrame?.(0.13, cx, this.groundY - 120, 'glacial');
      game?.renderer?.triggerImpactFrame?.(cx, this.groundY - 120, 0.13, 'glacial');
      game?.renderer?.shake?.(28, 0.72);
      game?.renderer?.triggerShake?.(28, 0.72);
      game?.renderer?.flash?.(0.34, '#f0f9ff');
      game?.renderer?.triggerAberration?.(18);
      game?.renderer?.triggerHitStop?.(0.095);

      game?.audio?.play?.('ice_shatter', cx);
      game?.audio?.play?.('time_shatter', cx);
      game?.audio?.play?.('supernova_detonate', cx);
      game?.audio?.play?.('prism_beam', cx);

      this.heal(Math.round(this.maxHp * 0.12), 'AURORA SOVEREIGNTY');

      this.fx?.spawn('diamondDustCataclysmNova', cx, this.groundY - 156, { light: 1.46 });
      this.spawnPixelFrostRing(cx, this.groundY - 136, 280, '#67e8f9', 0.52, false, true);
      this.fx?.burst(cx, this.groundY - 136, {
        count: 20,
        speedMin: 95,
        speedMax: 310,
        lifeMin: 0.24,
        lifeMax: 0.48,
        gravity: 82,
        colors: ['#ffffff', '#f0f9ff', '#bae6fd', '#67e8f9', '#38bdf8', '#e879f9']
      });
      game?.vfx?.spawnGlyphBurst?.(cx, this.groundY - 136, 7, 'glacial');
      game?.vfx?.spawnDamageText?.(
        cx,
        this.groundY - 284,
        0,
        true,
        '★ DIAMOND DUST ETERNITY! ★',
        '#f0f9ff'
      );

      // Single instantaneous Supreme Execution Burst (675 Crit Damage!)
      for (const foe of targets) {
        if (foe && !foe.isDead) {
          foe.chronoTimeStopTimer = 0;
          foe.takeDamage(675, this, true, 325, -255);
        }
      }
    }

    // Smooth regal descent back to groundY (3.28s .. 4.60s)
    const descU = Math.min(1, Math.max(0, (t - 3.28) / Math.max(0.01, this.trueUltDuration - 3.28)));
    const smoothDesc = descU * descU * (3 - 2 * descU);
    this.y = this.groundY - 90 * (1 - smoothDesc);
    this.cameraAirLift = 112 * (1 - smoothDesc);
    this.trueUltFrameOverride = 144 + Math.min(5, Math.floor(descU * 6));

    if (t >= this.trueUltDuration) {
      this.y = this.groundY;
      this.vy = 0;
      this.cameraAirLift = 0;
      this.isInvulnerable = false;
      this.trueUltFrameOverride = null;
      if (enemy) enemy.chronoTimeStopTimer = 0;
      this.setState('IDLE');
    }
  }

  /**
   * Renders any square cell from `icemage_vfx.png` (rows 0..7, cols 0..29) with crisp HD-2D Selout + subtle bloom.
   * Never calls `ctx.rotate`.
   */
  drawBloomedVfxCell(ctx, vfxSheet, rowIdx, colIdx, x, y, size, fade = 1.0, renderer = null, glowScale = 1.65) {
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth || fade <= 0.01) return;
    const c = Math.max(0, Math.min(29, Math.floor(colIdx)));
    const r = Math.max(0, Math.min(7, Math.floor(rowIdx)));
    const drawSize = Math.round(size / 4) * 4;
    const half = Math.round(-drawSize * 0.5);
    const gx = Math.round(x / 4) * 4;
    const gy = Math.round(y / 4) * 4;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(gx, gy);

    if (renderer && renderer.glowGlacial && glowScale > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * (r === 2 ? 0.14 : 0.18);
      const gSize = drawSize * Math.min(1.35, glowScale);
      ctx.drawImage(renderer.glowGlacial, -gSize * 0.5, -gSize * 0.5, gSize, gSize);
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = fade * 0.97;
    ctx.drawImage(vfxSheet, c * 208, r * 208, 208, 208, half, half, drawSize, drawSize);

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fade * (r === 2 ? 0.09 : 0.14);
    ctx.drawImage(vfxSheet, c * 208, r * 208, 208, 208, half, half, drawSize, drawSize);

    ctx.restore();
  }

  /**
   * Renders a rectangular `(w, h)` cell from `icemage_vfx.png` (rows 0..7, cols 0..29).
   * Zero `ctx.rotate` calls so pixel-art remains strictly integer-snapped!
   */
  drawBloomedVfxRect(ctx, vfxSheet, rowIdx, colIdx, x, y, w, h, fade = 1.0, renderer = null, glowScale = 1.55) {
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth || fade <= 0.01) return;
    const c = Math.max(0, Math.min(29, Math.floor(colIdx)));
    const r = Math.max(0, Math.min(7, Math.floor(rowIdx)));
    const drawW = Math.round(w / 4) * 4;
    const drawH = Math.round(h / 4) * 4;
    const halfW = Math.round(-drawW * 0.5);
    const halfH = Math.round(-drawH * 0.5);
    const gx = Math.round(x / 4) * 4;
    const gy = Math.round(y / 4) * 4;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(gx, gy);

    if (renderer && renderer.glowGlacial && glowScale > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * 0.18;
      const gW = drawW * Math.min(1.32, glowScale);
      const gH = drawH * Math.min(1.32, glowScale);
      ctx.drawImage(renderer.glowGlacial, -gW * 0.5, -gH * 0.5, gW, gH);
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = fade * 0.97;
    ctx.drawImage(vfxSheet, c * 208, r * 208, 208, 208, halfW, halfH, drawW, drawH);

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fade * 0.14;
    ctx.drawImage(vfxSheet, c * 208, r * 208, 208, 208, halfW, halfH, drawW, drawH);

    ctx.restore();
  }

  /**
   * Renders Row 5 Sovereign Mandala & Floating Ice-Lotus Pedestal behind Lyra during `TRUE_ULTIMATE`.
   */
  drawBehind(ctx, renderer = null) {
    if (this.state !== 'TRUE_ULTIMATE' && this._trueUltShatterTimer <= 0) return;
    const vfxSheet = PixelForge.initAssets()?.icemage?.vfx;
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;

    const t = this.stateTimer || 0;
    const dur = this.trueUltDuration || 4.60;
    const fadeIn = Math.min(1, t / 0.18);
    const fadeOut =
      this.state === 'TRUE_ULTIMATE'
        ? Math.min(1, Math.max(0, (dur - t) / 0.35))
        : Math.min(1, this._trueUltShatterTimer / 0.35);
    const fade = fadeIn * fadeOut;
    if (fade <= 0.01) return;

    const col = Math.floor(t * 30) % 30;
    this.drawBloomedVfxRect(ctx, vfxSheet, 5, col, this.x, this.y - 104, 304, 304, fade * 0.92, renderer, 1.55);

    // Floating Faceted Ice-Lotus Pedestal beneath Lyra's skates while airborne!
    if (this.groundY - this.y > 12) {
      const px = Math.round(this.x / 4) * 4;
      const py = Math.round((this.y + 8) / 4) * 4;
      this.drawBloomedVfxRect(ctx, vfxSheet, 3, col, px, py + 4, 136, 48, fade * 0.90, renderer, 1.2);
      ctx.save();
      ctx.globalAlpha = fade * 0.94;
      ctx.fillStyle = '#091326';
      ctx.fillRect(px - 44, py - 6, 88, 12);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(px - 40, py - 4, 80, 8);
      ctx.fillStyle = '#f0f9ff';
      ctx.fillRect(px - 32, py - 4, 64, 3);
      ctx.restore();
    }
  }

  /**
   * Renders Polar Night Sky Canopy, Multi-Ribbon Northern Lights (Aurora Borealis), Overhead Celestial
   * Astrolabe (`Row 5`), and Full-Stage Crystal Mirror Lake behind fighters during `TRUE_ULTIMATE`.
   */
  drawTrueUltPolarNightBackground(ctx, renderer = null) {
    const inTrueUlt = this.state === 'TRUE_ULTIMATE';
    if (!inTrueUlt && this._trueUltShatterTimer <= 0) return;

    const t = inTrueUlt ? this.stateTimer : 3.35;
    const dur = this.trueUltDuration || 4.60;
    const fadeIn = inTrueUlt ? Math.min(1, t / 0.32) : 1;
    const fadeOut = inTrueUlt
      ? Math.min(1, Math.max(0, (dur - t) / 0.42))
      : Math.min(1, this._trueUltShatterTimer / 0.45);
    const fade = fadeIn * fadeOut;
    if (fade <= 0.01) return;

    const ww = renderer?.worldWidth || 1200;
    const gy = this.groundY;
    const vfxSheet = PixelForge.initAssets()?.icemage?.vfx;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Translucent Polar Night Sky Canopy (never replaces the stage background!)
    const skyGrad = ctx.createLinearGradient(0, -140, 0, gy + 36);
    skyGrad.addColorStop(0, `rgba(4, 10, 32, ${(0.76 * fade).toFixed(3)})`);
    skyGrad.addColorStop(0.58, `rgba(8, 22, 56, ${(0.56 * fade).toFixed(3)})`);
    skyGrad.addColorStop(1, `rgba(14, 42, 84, ${(0.34 * fade).toFixed(3)})`);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, -140, ww, gy + 190);

    // 2. Multi-Ribbon Undulating Pixel-Stepped Northern Lights (Aurora Borealis) across the 1200px sky!
    const ribbons = [
      { baseY: 36, amp: 24, freq: 0.009, speed: 2.1, h: 78, colTop: '#34d399', colBot: '#67e8f9', alpha: 0.28 },
      { baseY: 78, amp: 30, freq: 0.012, speed: -1.7, h: 86, colTop: '#c084fc', colBot: '#38bdf8', alpha: 0.26 },
      { baseY: 118, amp: 20, freq: 0.015, speed: 2.6, h: 68, colTop: '#67e8f9', colBot: '#e879f9', alpha: 0.24 }
    ];

    for (const rb of ribbons) {
      for (let x = 24; x < ww - 24; x += 12) {
        const wave =
          Math.sin(x * rb.freq + t * rb.speed) * rb.amp +
          Math.cos(x * rb.freq * 1.9 - t * rb.speed * 0.8) * (rb.amp * 0.45);
        const curtainPulse = 0.65 + 0.35 * Math.sin(x * 0.035 + t * 4.2);
        const ry = Math.round((rb.baseY + wave) / 4) * 4;
        const rh = Math.round((rb.h * curtainPulse) / 4) * 4;

        ctx.globalAlpha = fade * rb.alpha * curtainPulse;
        ctx.fillStyle = rb.colTop;
        ctx.fillRect(x, ry, 10, Math.max(8, Math.round(rh * 0.48)));

        ctx.globalAlpha = fade * (rb.alpha * 1.15) * curtainPulse;
        ctx.fillStyle = rb.colBot;
        ctx.fillRect(x, ry + Math.round(rh * 0.42), 10, Math.max(8, Math.round(rh * 0.58)));

        ctx.globalAlpha = fade * 0.34 * curtainPulse;
        ctx.fillStyle = '#f0f9ff';
        ctx.fillRect(x, ry + rh - 6, 10, 4);
      }
    }

    // 3. Full-Stage Crystal Mirror Lake Floor (`x = 56 .. ww - 56`)
    const lakeX = 56;
    const lakeW = ww - 112;
    ctx.globalAlpha = fade * 0.62;
    ctx.fillStyle = '#081b3a';
    ctx.fillRect(lakeX, gy - 14, lakeW, 38);

    ctx.globalAlpha = fade * 0.48;
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(lakeX + 16, gy - 10, lakeW - 32, 24);

    // Specular ice-rink reflection bands
    ctx.globalAlpha = fade * 0.55;
    ctx.fillStyle = '#bae6fd';
    for (let sx = lakeX + 40; sx < lakeX + lakeW - 60; sx += 96) {
      const glintShift = Math.round(Math.sin(t * 2.4 + sx * 0.02) * 12);
      ctx.fillRect(sx + glintShift, gy - 6, 52, 4);
      ctx.fillRect(sx - glintShift + 18, gy + 4, 36, 3);
    }

    // Crisp Selout + White-Cyan Rim around the Mirror Lake
    ctx.globalAlpha = fade * 0.85;
    ctx.strokeStyle = '#67e8f9';
    ctx.lineWidth = 2;
    ctx.strokeRect(lakeX + 8, gy - 12, lakeW - 16, 30);

    // 4. Overhead Colossal Celestial Aurora Astrolabe (`Row 5`) & Flanking Cathedral Ice-Organ Spires (`Row 2`)
    if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      const col = Math.floor(t * 24) % 30;
      const coffinX = Math.round((this._trueUltCoffinX || 600) / 4) * 4;
      this.drawBloomedVfxRect(
        ctx,
        vfxSheet,
        5,
        col,
        coffinX,
        gy - 276,
        376,
        376,
        fade * 0.88,
        renderer,
        1.45
      );

      // 6 Flanking Cathedral Ice-Organ Spires framing the stage wings
      const spireCol = Math.min(20, 8 + (Math.floor(t * 14) % 12));
      const wingPositions = [
        { x: 108, sz: 164 },
        { x: 176, sz: 124 },
        { x: ww - 108, sz: 164 },
        { x: ww - 176, sz: 124 }
      ];
      for (const wp of wingPositions) {
        this.drawBloomedVfxCell(
          ctx,
          vfxSheet,
          2,
          spireCol,
          wp.x,
          gy - Math.round(wp.sz * 0.42),
          wp.sz,
          fade * 0.86,
          renderer,
          1.25
        );
      }
    }

    ctx.restore();
  }

  /**
   * Renders Permafrost Rink Spires, Mid-Air Sky-Staircase Platforms, Marching Glacier Spires,
   * Ice-Sculpture Decoy, Hydroblade Mirror Wall, & Hoarfrost Rime Stacks.
   */
  drawPermafrostAndConstructs(ctx, renderer = null) {
    const sprites = PixelForge.initAssets().icemage;
    const vfxSheet = sprites?.vfx;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Permafrost Rink Floor Bloom & Edge Spires
    for (const z of this.permafrostZones) {
      const fade = Math.min(1, (z.maxLife - z.life) * 1.5) * Math.min(1, z.life / 0.15);
      const rx = Math.round(z.x / 4) * 4;
      const ry = Math.round((z.y - 2) / 4) * 4;
      const rX = Math.round((z.radius * 0.92) / 4) * 4;

      if (renderer && renderer.glowGlacial) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade * 0.14;
        ctx.drawImage(renderer.glowGlacial, rx - rX * 1.2, ry - 42, rX * 2.4, 84);
      }

      if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
        const spireCol = Math.min(20, Math.floor((z.life * 18) % 16) + 5);
        for (const side of [-1, 1]) {
          const ex = Math.round((rx + side * (rX - 12)) / 4) * 4;
          this.drawBloomedVfxCell(ctx, vfxSheet, 2, spireCol, ex, ry - 26, 64, fade * 0.90, renderer, 1.25);
        }
      }
    }

    // 2. Stepped Mid-Air Crystalline Sky-Staircase Platforms (Jump)
    for (const st of this.skyIceSteps) {
      const fade = Math.min(1, (st.maxLife - st.life) * 2.2) * Math.min(1, st.life / 0.08);
      const sx = Math.round(st.x / 4) * 4;
      const sy = Math.round(st.y / 4) * 4;
      const hw = Math.round(st.width * 0.5);

      if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
        const col = Math.floor(st.life * 24) % 30;
        this.drawBloomedVfxRect(ctx, vfxSheet, 3, col, sx, sy + 6, 84, 32, fade * 0.82, renderer, 1.15);
      }

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = fade * 0.95;
      ctx.fillStyle = '#091326';
      ctx.fillRect(sx - hw - 2, sy - 4, hw * 2 + 4, 12);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(sx - hw, sy - 2, hw * 2, 8);
      ctx.fillStyle = '#f0f9ff';
      ctx.fillRect(sx - hw + 4, sy - 2, hw * 2 - 8, 3);
      // Hanging icicle keel
      ctx.fillStyle = '#67e8f9';
      ctx.fillRect(sx - 12, sy + 6, 24, 5);
      ctx.fillRect(sx - 4, sy + 11, 8, 5);
    }

    // 3. Sculpted Ice-Sculpture Decoy (Dodge)
    if (this.iceDecoy && sprites?.sheet && sprites.sheet.complete) {
      const d = this.iceDecoy;
      const fade = Math.min(1, (d.maxLife - d.life) * 3.5);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(Math.round(d.x / 4) * 4, Math.round(d.y / 4) * 4);
      ctx.scale(d.facing, 1);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = fade * 0.88;
      PixelForge.drawAfterimageFrame(ctx, sprites, d.frameIdx, 208, 208);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * 0.45;
      PixelForge.drawGhostFrame(ctx, sprites, d.frameIdx, 208, 208);
      ctx.restore();
    }

    // 4. Hydroblade Mirror Wall (Crouch)
    if (this.iceWall && vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      const iw = this.iceWall;
      const fade = Math.min(1, (iw.maxLife - iw.life) * 2.5);
      const col = Math.min(21, Math.floor((iw.life / iw.maxLife) * 22));
      this.drawBloomedVfxCell(ctx, vfxSheet, 2, col, iw.x, iw.y - 68, 164, fade, renderer, 1.55);
    }

    // 5. Sequential Ground-Marching Glacier Stalagmite Spires (Auto Variant 3)
    if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      for (const sp of this.activeMarchingSpires) {
        if (!sp.erupted) continue;
        const u = Math.min(1, sp.life / sp.maxLife);
        const col = Math.min(29, Math.floor(u * 30));
        const fade = u > 0.75 ? (1 - u) / 0.25 : 1.0;
        this.drawBloomedVfxCell(
          ctx,
          vfxSheet,
          2,
          col,
          sp.x,
          sp.y - Math.round(sp.size * 0.42),
          sp.size,
          fade * 0.96,
          renderer,
          1.45
        );
      }
    }

    // 6. Orbiting Hoarfrost Rime Stacks [1..3] on chilled foes
    if (this.game && this.game.fighters && vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      const baseCol = Math.floor(this.stateTimer * 30) % 30;
      for (const f of this.game.fighters) {
        if (f !== this && !f.isDead && f.brittleStacks >= 1) {
          const count = Math.min(3, Math.floor(f.brittleStacks));
          for (let k = 0; k < count; k++) {
            const ox = (k - 1) * 28;
            const oy = -36 - (k % 2) * 18;
            this.drawBloomedVfxCell(
              ctx,
              vfxSheet,
              1,
              (baseCol + k * 9) % 30,
              f.x + ox,
              f.y + oy,
              36,
              0.92,
              renderer,
              1.15
            );
          }
        }
      }
    }

    ctx.restore();
  }

  /**
   * Renders 2 delicate Counter-Rotating Snowflake Satellites behind Lyra's shoulders.
   */
  drawOrbitingCryoPrisms(ctx, renderer = null) {
    if (this.isDead) return;
    const vfxSheet = PixelForge.initAssets().icemage?.vfx;
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;

    const t = (this.stateTimer || 0) + (this.walkPhase || 0) * 0.25;
    const col = Math.floor((this.stateTimer || 0) * 30) % 30;
    const satellites = [
      { ox: -this.facing * 42, oy: -128 + Math.round(Math.sin(t * 3.0) * 3) * 2, size: 48 },
      { ox: this.facing * 36, oy: -148 + Math.round(Math.cos(t * 3.0) * 3) * 2, size: 40 }
    ];

    for (const s of satellites) {
      this.drawBloomedVfxCell(ctx, vfxSheet, 1, col, this.x + s.ox, this.y + s.oy, s.size, 0.90, renderer, 1.3);
    }
  }

  /**
   * Renders Foreground Combat Constructs:
   *  - Returning 6-Bladed Snowflake Boomerang Chakrams (`Row 1`)
   *  - Solid 4-Stack Crystal Stasis Prisons (`Row 6`)
   *  - Twin Iceberg Pincer Walls (`SKILL`, `Row 2`)
   *  - 7 Celestial Coronation Ice-Claymores (`ULTIMATE`, `Row 4` + `Row 3` Crest + `Row 7` Starburst)
   */
  drawForegroundConstructs(ctx, renderer = null) {
    const vfxSheet = PixelForge.initAssets().icemage?.vfx;
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Returning 6-Bladed Snowflake Boomerang Chakrams (`Row 1`)
    for (const c of this.activeChakrams) {
      const col = Math.floor(c.life * 45) % 30;
      // Subtle motion afterimage
      const prevCol = (col + 27) % 30;
      const dx = c.life <= c.outDuration ? -14 : 14;
      this.drawBloomedVfxCell(ctx, vfxSheet, 1, prevCol, c.x + dx, c.y, 76, 0.42, renderer, 1.1);
      this.drawBloomedVfxCell(ctx, vfxSheet, 1, col, c.x, c.y, 96, 0.98, renderer, 1.55);
    }

    // 2. Solid 4-Stack Crystal Freeze Sarcophagi (`Row 6`)
    for (const cp of this.activeCrystalPrisons) {
      const u = Math.min(1, cp.life / cp.maxLife);
      const col = Math.min(29, 6 + Math.floor(u * 22));
      const fade = u > 0.72 ? (1 - u) / 0.28 : 0.92;
      this.drawBloomedVfxRect(ctx, vfxSheet, 6, col, cp.x, cp.y - 96, 168, 204, fade, renderer, 1.45);
    }

    // 3. Glacial Jaws: Twin Flanking Row-2 Iceberg Pincer Walls (`SKILL`)
    if (this.glacierJaws) {
      const gj = this.glacierJaws;
      const fade = Math.min(1, (gj.maxLife - gj.life) * 3.2);
      const sealCol = Math.floor(gj.life * 28) % 30;
      this.drawBloomedVfxRect(ctx, vfxSheet, 3, sealCol, gj.x, gj.y - 16, 224, 84, fade * 0.85, renderer, 1.3);

      const iceCol = gj.slammed
        ? Math.min(29, 22 + Math.floor(((gj.life - 0.38) / 0.40) * 8))
        : Math.min(21, Math.floor((gj.life / 0.38) * 21));
      for (const side of [-1, 1]) {
        const jx = gj.x + side * gj.spread;
        this.drawBloomedVfxRect(
          ctx,
          vfxSheet,
          2,
          iceCol,
          jx,
          gj.y - 102,
          176,
          228,
          fade * 0.98,
          renderer,
          1.55
        );
      }
      if (gj.slammed) {
        const starCol = Math.min(29, Math.floor(((gj.life - 0.38) / 0.42) * 30));
        this.drawBloomedVfxCell(ctx, vfxSheet, 7, starCol, gj.x, gj.y - 98, 236, fade * 0.92, renderer, 1.65);
      }
    }

    // 4. Winter Coronation: 7 Giant Celestial Ice-Claymores (`ULTIMATE`, `Row 4`)
    if (this.coronationDomain) {
      const cd = this.coronationDomain;
      const fade = Math.min(1, (cd.maxLife - cd.life) * 3.0);
      const cx = Math.round(cd.x / 4) * 4;
      const cy = Math.round(cd.y / 4) * 4;

      // Stained-Glass Winter Palace Sovereign Crest behind the palisade (`Row 3`)
      const crestCol = Math.floor(cd.life * 24) % 30;
      this.drawBloomedVfxCell(ctx, vfxSheet, 3, crestCol, cx, cy - 148, 276, fade * 0.92, renderer, 1.65);

      const swordCol = Math.floor(cd.life * 30) % 30;
      if (!cd.shattered) {
        for (let k = 0; k < cd.swords.length; k++) {
          const sw = cd.swords[k];
          let sx = sw.skyX;
          let sy = sw.skyY;
          if (cd.life >= sw.dropStart) {
            const du = Math.min(1, (cd.life - sw.dropStart) / sw.dropDur);
            const plunge = du * du;
            sx = sw.skyX + (sw.floorX - sw.skyX) * plunge;
            sy = sw.skyY + (sw.floorY - sw.skyY) * plunge;
          }
          this.drawBloomedVfxRect(
            ctx,
            vfxSheet,
            4,
            (swordCol + k * 4) % 30,
            sx,
            sy,
            156,
            204,
            fade * 0.98,
            renderer,
            1.45
          );
        }

        // Colossal 7th Sovereign Crown-Claymore hovering at the zenith -> plunging straight down!
        let crownY = cy - 320;
        if (cd.life >= cd.crownDropStart) {
          const cu = Math.min(1, (cd.life - cd.crownDropStart) / cd.crownDropDur);
          crownY = (cy - 320) + (212 * cu * cu);
        }
        this.drawBloomedVfxRect(ctx, vfxSheet, 4, swordCol, cx, crownY, 248, 304, fade, renderer, 1.75);
      } else {
        const starCol = Math.min(29, Math.floor(((cd.life - 0.96) / 0.56) * 30));
        this.drawBloomedVfxRect(ctx, vfxSheet, 7, starCol, cx, cy - 132, 356, 320, fade * 0.96, renderer, 1.85);
      }
    }

    // 5. Row-7 Prismatic Starbursts for spiked frost detonations
    for (const r of this.activeFrostRings) {
      if (!r.hasSpikes) continue;
      const u = Math.min(1, r.life / r.maxLife);
      const fade = Math.max(0, 1 - u);
      const col = Math.min(29, Math.floor(u * 30));
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        7,
        col,
        r.x,
        r.y,
        Math.round(r.maxRadius * 1.48),
        fade * 0.90,
        renderer,
        1.5
      );
    }

    ctx.restore();
  }

  /**
   * Renders the Breathtaking Foreground Climax of `TRUE_ULTIMATE`:
   *  - Towering Row-6 Crystalline Diamond-Coffin Monolith (`328x376`)
   *  - 6-Mirror Borealis Star-Snowflake Cathedral Lattice (`Row 1` + Sacred Star Chords)
   *  - Live 16-Bit Thermodynamic Readout (`-18.4°C` -> `-273.15°C • 0.00 K`)
   *  - Arena-Wide Branching Reality-Glass Fracture Cracks + 6 Hovering Coronation Swords (`Row 4`)
   *  - Act IV: 28 Faceted Stained-Glass Ice Shards (pure 2D math rotation, zero `ctx.rotate`!) +
   *    Falling Diamond Dust Snow + Triple Row-7 Prismatic Starbursts!
   */
  drawTrueUltForegroundSpectacle(ctx, renderer = null) {
    const vfxSheet = PixelForge.initAssets()?.icemage?.vfx;
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;

    const t = this.stateTimer || 0;
    const coffinX = Math.round((this._trueUltCoffinX || 600) / 4) * 4;
    const coffinY = Math.round((this.groundY - 156) / 4) * 4;

    // Acts II & III (`1.12s .. 3.28s`): Diamond-Coffin Monolith, 6-Mirror Borealis Star Web,
    // Live Thermodynamic Readout, & Reality-Glass Fracture Cracks!
    if (this.state === 'TRUE_ULTIMATE' && t >= 1.12 && t < 3.28) {
      const sealProgress = Math.max(0, Math.min(1, (t - 1.12) / 2.16));
      const row6Col = Math.min(29, Math.floor(sealProgress * 30));
      const fade = Math.min(1, (t - 1.12) / 0.16);

      // 1. Towering Translucent Crystalline Diamond-Coffin Monolith (`Row 6`, `328x376`)
      this.drawBloomedVfxRect(ctx, vfxSheet, 6, row6Col, coffinX, coffinY, 328, 376, fade * 0.96, renderer, 1.75);

      // 2. 6-Mirror Borealis Star-Snowflake Cathedral Web
      const vertices = [];
      const prismCol = Math.floor(t * 30) % 30;
      for (let i = 0; i < 6; i++) {
        const ang = -Math.PI * 0.5 + (i * Math.PI * 2) / 6 + Math.sin(t * 1.8) * 0.08;
        vertices.push({
          x: Math.round(coffinX + Math.cos(ang) * 236),
          y: Math.round(coffinY + Math.sin(ang) * 142)
        });
      }

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      // Star-of-Borealis two interlocking triangles (0-2-4-0 and 1-3-5-1) + spokes to center
      const starPairs = [
        [0, 2], [2, 4], [4, 0],
        [1, 3], [3, 5], [5, 1]
      ];
      for (let idx = 0; idx < starPairs.length; idx++) {
        const [a, b] = starPairs[idx];
        const pA = vertices[a];
        const pB = vertices[b];
        ctx.strokeStyle = idx < 3 ? '#38bdf8' : '#e879f9';
        ctx.lineWidth = 4;
        ctx.globalAlpha = fade * 0.52;
        ctx.beginPath();
        ctx.moveTo(pA.x, pA.y);
        ctx.lineTo(pB.x, pB.y);
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = fade * 0.80;
        ctx.beginPath();
        ctx.moveTo(pA.x, pA.y);
        ctx.lineTo(pB.x, pB.y);
        ctx.stroke();
      }
      ctx.restore();

      for (let i = 0; i < 6; i++) {
        const v = vertices[i];
        this.drawBloomedVfxCell(ctx, vfxSheet, 1, (prismCol + i * 5) % 30, v.x, v.y, 76, fade * 0.92, renderer, 1.35);
      }

      // 3. Act III (`2.32s .. 3.28s`): Arena-Wide Reality-Glass Fracture Cracks & Hovering Coronation Swords!
      if (t >= 2.32) {
        const crackProgress = Math.min(1, (t - 2.32) / 0.88);
        ctx.save();
        for (const cr of this._trueUltCracks) {
          if (crackProgress < cr.threshold) continue;
          const localAlpha = Math.min(1, (crackProgress - cr.threshold) * 4.0);
          for (const seg of cr.segs) {
            ctx.strokeStyle = cr.magenta ? '#e879f9' : '#38bdf8';
            ctx.lineWidth = 5;
            ctx.globalAlpha = localAlpha * 0.65;
            ctx.beginPath();
            ctx.moveTo(coffinX + seg.x0, coffinY + seg.y0);
            ctx.lineTo(coffinX + seg.x1, coffinY + seg.y1);
            ctx.stroke();

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.globalAlpha = localAlpha * 0.95;
            ctx.beginPath();
            ctx.moveTo(coffinX + seg.x0, coffinY + seg.y0);
            ctx.lineTo(coffinX + seg.x1, coffinY + seg.y1);
            ctx.stroke();
          }
        }
        ctx.restore();

        // 4 Hovering Celestial Ice-Claymores flanking the cracked monolith
        for (const ox of [-276, -184, 184, 276]) {
          const sx = Math.max(88, Math.min(1112, coffinX + ox));
          const sy = coffinY - 56 + Math.round(Math.sin(t * 6.0 + ox) * 6);
          this.drawBloomedVfxRect(ctx, vfxSheet, 4, prismCol, sx, sy, 132, 176, crackProgress * 0.92, renderer, 1.35);
        }
      }

      // 4. Crisp 16-Bit Thermodynamic Readout HUD floating above the Monolith!
      const tempProgress = Math.min(1, Math.max(0, (t - 1.12) / 1.24));
      const easedTemp = 1 - Math.pow(1 - tempProgress, 2.4);
      const celsius = -18.0 - 255.15 * easedTemp;
      const kelvin = Math.max(0, 273.15 + celsius);
      const atZero = kelvin <= 0.05 || t >= 2.34;
      const label = atZero
        ? '★ 0.00 K  •  -273.15°C  ABSOLUTE ZERO ★'
        : `${kelvin.toFixed(1)} K  •  ${celsius.toFixed(1)}°C`;

      ctx.save();
      const hudY = Math.max(54, coffinY - 196);
      ctx.fillStyle = 'rgba(6, 15, 38, 0.84)';
      ctx.fillRect(coffinX - 156, hudY - 16, 312, 26);
      ctx.strokeStyle = atZero ? '#e879f9' : '#67e8f9';
      ctx.lineWidth = 2;
      ctx.strokeRect(coffinX - 156, hudY - 16, 312, 26);
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = atZero ? '#f0f9ff' : '#a5f3fc';
      ctx.fillText(label, coffinX, hudY + 2);
      ctx.restore();
    }

    // Act IV (`_trueUltShatterTimer > 0`): Reality-Glass Pane Shatter + Falling Diamond Dust + Triple Row-7 Starbursts!
    if (this._trueUltShatterTimer > 0) {
      const uShatter = 1 - Math.max(0, Math.min(1, this._trueUltShatterTimer / 1.28));
      const row7Col = Math.min(29, Math.floor(uShatter * 30));
      const shatterFade = Math.min(1, this._trueUltShatterTimer / 0.34);

      // 1. Triple Staggered Colossal Row-7 Prismatic Starbursts across the arena
      this.drawBloomedVfxRect(ctx, vfxSheet, 7, row7Col, coffinX, coffinY, 456, 396, shatterFade * 0.98, renderer, 2.0);
      for (const side of [-1, 1]) {
        const wingX = Math.max(150, Math.min(1050, coffinX + side * 276));
        const subCol = Math.min(29, Math.max(0, row7Col - 2));
        this.drawBloomedVfxRect(
          ctx,
          vfxSheet,
          7,
          subCol,
          wingX,
          coffinY - 12,
          336,
          296,
          shatterFade * 0.84,
          renderer,
          1.65
        );
      }

      // 2. 28 Faceted Stained-Glass Ice Reality-Pane Shards (pure 2D math rotation — ZERO `ctx.rotate`!)
      ctx.save();
      ctx.globalAlpha = shatterFade * 0.95;
      for (const s of this._trueUltGlassShards) {
        if (s.y > this.groundY + 28) continue;
        const ca = Math.cos(s.angle);
        const sa = Math.sin(s.angle);
        const p0x = Math.round(s.x + ca * s.r1);
        const p0y = Math.round(s.y + sa * s.r1);
        const p1x = Math.round(s.x - sa * s.r2);
        const p1y = Math.round(s.y + ca * s.r2);
        const p2x = Math.round(s.x - ca * s.r1 * 0.82);
        const p2y = Math.round(s.y - sa * s.r1 * 0.82);
        const p3x = Math.round(s.x + sa * s.r2 * 0.78);
        const p3y = Math.round(s.y - ca * s.r2 * 0.78);

        // Stained-glass facet body
        ctx.fillStyle = s.fill;
        ctx.beginPath();
        ctx.moveTo(p0x, p0y);
        ctx.lineTo(p1x, p1y);
        ctx.lineTo(p2x, p2y);
        ctx.lineTo(p3x, p3y);
        ctx.closePath();
        ctx.fill();

        // Bright upper specular facet triangle
        ctx.fillStyle = s.facet;
        ctx.beginPath();
        ctx.moveTo(p0x, p0y);
        ctx.lineTo(p1x, p1y);
        ctx.lineTo(Math.round(s.x), Math.round(s.y));
        ctx.closePath();
        ctx.fill();

        // Crisp Dark-Navy Selout outline + internal specular ridge
        ctx.strokeStyle = '#091326';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p0x, p0y);
        ctx.lineTo(p1x, p1y);
        ctx.lineTo(p2x, p2y);
        ctx.lineTo(p3x, p3y);
        ctx.closePath();
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p0x, p0y);
        ctx.lineTo(p2x, p2y);
        ctx.stroke();
      }

      // 3. Glittering Arena-Wide Falling Diamond Dust Snow!
      for (const d of this._trueUltDiamondDust) {
        const dy = ((d.y % (this.groundY - 20)) + (this.groundY - 20)) % (this.groundY - 20);
        const dx = Math.round(d.x / 2) * 2;
        const py = Math.round(dy / 2) * 2;
        ctx.fillStyle = d.magenta ? '#f5d0fe' : '#f0f9ff';
        ctx.fillRect(dx - 1, py - d.size, 2, d.size * 2);
        ctx.fillRect(dx - d.size, py - 1, d.size * 2, 2);
      }
      ctx.restore();
    }
  }

  drawForegroundOverlay(ctx, renderer = null) {
    this.drawTrueUltPolarNightBackground(ctx, renderer);
    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    this.fx.renderLayer(ctx, 'back', arenaCenterX, this.groundY, 0.96);
    this.drawPermafrostAndConstructs(ctx, renderer);
  }

  drawUltimateForeground(ctx, renderer = null) {
    this.drawForegroundConstructs(ctx, renderer);
    this.drawTrueUltForegroundSpectacle(ctx, renderer);
    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    this.fx.renderLayer(ctx, 'front', arenaCenterX, this.groundY, 0.98);
  }

  draw(ctx, isReflection = false, renderer = null) {
    const sprites = PixelForge.initAssets().icemage;
    if (!sprites) return;

    if (!isReflection) {
      this.drawBehind(ctx, renderer);
      this.drawOrbitingCryoPrisms(ctx, renderer);
    }

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
