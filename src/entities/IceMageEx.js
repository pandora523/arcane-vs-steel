import { Fighter } from './Fighter.js?v=30fps114';
import { PixelForge } from '../engine/PixelForge.js?v=30fps114';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps114';
import {
  GLACIAL_EFFECT_REGISTRY,
  GLACIAL_CRYO_PALETTE,
  BOREALIS_PRISM_PALETTE
} from '../engine/shaders/glacialShaders.js?v=30fps114';

const AUTO_SLICES_EX = [
  [60, 8], // Beat 1 (V0, 0.35s): Hydroblade Lunge Downward Cryo-Crescent -> snaps at F03 (63)
  [68, 7], // Beat 2 (V1, 0.33s): Instant Reverse Rising Arabesque Frost-Arc -> snaps at F09 (69)
  [75, 8], // Beat 3 (V2, 0.37s): 2.5D Figure-Skating Borealis Pirouette 360 Vortex (2-hit) -> snaps at F17/F18 (77/78)
  [83, 7]  // Beat 4 (V3, 0.50s): Airborne Borealis Axel Leap -> Permafrost Glaive-Slam (3-hit) -> snaps at F25 (85)
];

const BEAT_DURATIONS = [0.35, 0.33, 0.37, 0.50];
const INTRA_COMBO_LINK = 0.015;

/**
 * Lyra EX (`icemage_ex`) - Borealis Sovereign & Skating Frost-Glaive Spell-Blade.
 * Next-Gen Wide-Canvas (`320x240`, `anchorX=112, anchorY=230`) FFBE / Last Cloudia Champion.
 * Wields an ornate 2H Borealis Prism Frost-Glaive (`104-116px` reach) + floating Borealis Snowflake Crown Halo.
 * Coexists 100% independently alongside classic Lyra (`icemage`).
 */
export class IceMageEx extends Fighter {
  constructor(x, groundY, facing = 1) {
    const opts = typeof x === 'object' && x !== null ? x : { x, groundY, facing };
    super({
      ...opts,
      name: opts.name || 'Lyra EX',
      maxHp: 3820,
      attackRange: 184,
      moveSpeed: 196,
      autoInterval: 1.02,
      lightColor: 'rgba(103, 232, 249, 1)',
      primaryColor: '#67e8f9',
      secondaryColor: '#e879f9',
      hasTrueUltimate: true,
      trueUltName: 'ETERNAL BOREALIS: AGE OF PERMAFROST',
      trueUltDuration: 4.60
    });

    this.heroId = 'icemage_ex';
    this.theme = 'glacial';
    this.secondaryColor = '#e879f9';
    this.deathSfx = 'death_icemage';
    this.hasPoise = true;

    this.autoDuration = BEAT_DURATIONS[0];
    this._postFlurryInterval = 1.44;

    this.skillName = 'GLACIAL JAWS: CRYO SHATTER';
    this.skillMaxCooldown = 4.65;
    this.skillCooldown = 1.15;
    this.skillDuration = 1.04;
    this.skillTriggerRange = 460;

    this.ultName = 'ABSOLUTE ZERO CATHEDRAL';
    this.ultSub = 'SEVEN CELESTIAL ICE-CLAYMORES';
    this.ultDuration = 1.96;

    this.trueUltName = 'ETERNAL BOREALIS: AGE OF PERMAFROST';
    this.trueUltSub = 'SOVEREIGN SCEPTER-TAP - 0.00 K DOMAIN';
    this.trueUltDuration = 4.60;

    this.dodgeMaxCooldown = 3.08;
    this.dashMaxCooldown = 3.02;
    this.wallFlipCooldown = 0;
    this.crouchCooldown = 0;
    this.crouchDuration = 0.92;
    this.isCrouching = false;
    this.isDeflecting = false;
    this.vaultCooldown = 0;
    this.isFlipVault = false;
    this.flipStartX = this.x;
    this.flipTargetX = this.x;
    this.cameraAirLift = 0;
    this._spawnedJumpSteps = 0;

    // 4-Beat FFBE Skating Spell-Blade State
    this.comboStep = 0;
    this._autoVariant = 0;
    this._comboPersistTimer = 0;
    this._queuedNextBeat = false;
    this._intraLinkTimer = 0;
    this._beatHitMask = 0;
    this._beatStartX = this.x;
    this._beatTargetX = this.x;
    this._bootsPlanted = false;
    this._skateSparkAcc = 0;

    // Bespoke Borealis Sovereign Constructs & Passive Stasis State
    this.permafrostZones = [];
    this.activeChakrams = [];
    this.activeMarchingSpires = [];
    this.activeSkyIcicles = [];
    this.activeCrystalPrisons = [];
    this.skyIceSteps = [];
    this.iceDecoy = null;
    this.iceWall = null;
    this.glacierJaws = null;
    this.coronationDomain = null;
    this.activeFrostRings = [];
    this.razorScars = [];
    this.afterimages = [];
    this.afterimageAccum = 0;
    this.activeVfxAnims = [];
    this.stepDustTimer = 0;

    // Skill / Overdrive / True Ultimate State
    this._skillStepMask = 0;
    this._ultInit = false;
    this._ultSwordsDropped = 0;
    this._ultDidCrownPlunge = false;
    this._ultCenterX = 600;
    this._trueUltStep = 0;
    this._trueUltCoffinX = 600;
    this._trueUltShatterTimer = 0;
    this._trueUltCracks = [];
    this._trueUltGlassShards = [];
    this._trueUltDiamondDust = [];
    this._overrideFrameIdx = null;

    // Wide 1440x780 world-space dual-buffer coverage so Ultimate / True Ultimate shaders never clip borders
    this.fx = new ArcaneShaderFX(GLACIAL_EFFECT_REGISTRY, {
      pixelScale: 3,
      viewW: 480,
      viewH: 260,
      topRatio: 0.82
    });

    if (typeof Image !== 'undefined') {
      this.getExSprites();
      PixelForge.ensureHeroLoaded?.('icemage_ex');
    }
  }

  getExSprites() {
    if (typeof Image === 'undefined') return null;
    const assets = PixelForge.initAssets?.();
    if (!assets) return null;
    if (!assets.icemage_ex) {
      const sheet = new Image();
      sheet.src = 'assets/sprites/icemage_ex_sheet.png?v=30fps114';
      const vfx = new Image();
      vfx.src = 'assets/sprites/icemage_ex_vfx.png?v=30fps114';
      const portrait = new Image();
      portrait.src = 'assets/sprites/icemage_ex_portrait.png?v=30fps114';
      assets.icemage_ex = {
        sheet,
        vfx,
        portrait,
        cellW: 320,
        cellH: 240,
        anchorX: 112,
        anchorY: 230
      };
    }
    return assets.icemage_ex;
  }

  setState(newState) {
    const prevState = this.state;
    super.setState(newState);

    if (newState === 'AUTO_ATTACK') {
      if (this._comboPersistTimer <= 0 && prevState !== 'AUTO_ATTACK') {
        this.comboStep = 0;
      }
      this._beginComboBeat(this.comboStep % 4, this.game);
    } else if (newState !== 'ULTIMATE' && newState !== 'TRUE_ULTIMATE') {
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
    }

    if (newState === 'SKILL') {
      this._skillStepMask = 0;
      this.afterimageAccum = 0;
      this.isDeflecting = false;
      this.glacierJaws = null;
      this.skillCooldown = Math.max(this.skillCooldown || 0, this.skillMaxCooldown);
    }

    if (newState === 'ULTIMATE') {
      this._ultInit = false;
      this._ultSwordsDropped = 0;
      this._ultDidCrownPlunge = false;
      this.coronationDomain = null;
      this.isInvulnerable = true;
    } else {
      this._ultInit = false;
    }

    if (newState === 'TRUE_ULTIMATE') {
      this._trueUltStep = 0;
      this.isInvulnerable = true;
      this.unstoppablePoise = true;
      this.clearPermafrostZones();
      this._buildTrueUltFracturesAndShards();
    } else {
      if (prevState === 'TRUE_ULTIMATE') {
        this.cameraAirLift = 0;
        this.unstoppablePoise = false;
      }
    }

    if (
      newState !== 'JUMP' &&
      newState !== 'DODGE' &&
      newState !== 'DASH' &&
      newState !== 'AUTO_ATTACK'
    ) {
      this.fx?.stopByKey('glacialSkateRibbon');
    }

    if (newState === 'DEATH' || newState === 'VICTORY') {
      this.activeSkyIcicles.length = 0;
      this.clearPermafrostZones();
      this.glacierJaws = null;
      this.coronationDomain = null;
      this.cameraAirLift = 0;
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      if (newState === 'DEATH') {
        this.fx?.clear();
      }
    }
  }

  _clampArenaX(xv, game) {
    const g = game || this.game;
    const margin = 84;
    const advBounds =
      g?.adventure?.active && typeof g.adventure.getActiveStageBounds === 'function'
        ? g.adventure.getActiveStageBounds()
        : null;
    const minX =
      g?.adventure?.lockActive && Number.isFinite(g.adventure.lockMinX)
        ? g.adventure.lockMinX
        : advBounds
          ? advBounds.minX + 44
          : margin;
    const ww = g?.renderer ? g.renderer.worldWidth : 1200;
    const rawMaxX =
      g?.adventure?.lockActive && Number.isFinite(g.adventure.lockMaxX)
        ? g.adventure.lockMaxX
        : advBounds
          ? advBounds.maxX - 44
          : ww - margin;
    const bossAlive = Boolean(
      g?.adventure?.bossEntity &&
        !g.adventure.bossEntity.isDead &&
        g.adventure.bossEntity.isColossalBoss
    );
    const maxX = bossAlive
      ? Math.min(rawMaxX, (g.adventure.bossEntity.anchorX || 9335) - 94)
      : rawMaxX;
    return Math.max(minX, Math.min(maxX, xv));
  }

  _safeFxX(xv, game) {
    const g = game || this.game;
    const ww = g?.renderer ? g.renderer.worldWidth : 1200;
    const center = ww * 0.5;
    return Math.max(center - 540, Math.min(center + 540, Math.max(88, Math.min(ww - 88, xv))));
  }

  _safeFxY(yv) {
    return Math.max(58, Math.min(this.groundY + 18, yv));
  }

  clearPermafrostZones() {
    this.permafrostZones.length = 0;
  }

  /**
   * Initializes one beat (`0..3`) of Lyra EX's 4-beat FFBE Skating Frost-Glaive Spell-Blade combo
   * without returning to IDLE. Computes hydroblade pre-snap glide into the `110..118px` smear sweet-spot!
   */
  _beginComboBeat(beatIdx, game) {
    const g = game || this.game;
    const v = ((beatIdx % 4) + 4) % 4;
    this._autoVariant = v;
    this.comboStep = (v + 1) % 4;
    this.autoDuration = BEAT_DURATIONS[v];
    this.stateTimer = 0;
    this._intraLinkTimer = 0;
    this._beatHitMask = 0;
    this.didActionFrame = false;
    this._queuedNextBeat = false;
    this._bootsPlanted = false;
    this._skateSparkAcc = 0;
    this._comboPersistTimer = 0.74;
    this.unstoppablePoise = v >= 2;

    const startFrame = AUTO_SLICES_EX[v][0];
    this.trueUltFrameOverride = startFrame;
    this._overrideFrameIdx = startFrame;

    const enemy = this._currentEnemy || g?.getTargetFor?.(this) || null;
    if (enemy && !enemy.isDead && !enemy.isDummyFocal) {
      this.facing = enemy.x >= this.x ? 1 : -1;
    }

    this._beatStartX = this.x;
    let desiredX = this.x + this.facing * (v === 0 ? 20 : v === 2 ? 16 : 12);

    if (enemy && !enemy.isDead) {
      const sweetDist = v === 2 ? 110 : 114;
      const idealStandX = enemy.x - this.facing * sweetDist;
      const rawDelta = (idealStandX - this.x) * this.facing;
      const maxForward = v === 0 ? 114 : v === 2 ? 46 : 34;
      const clampedForward = Math.max(0, Math.min(maxForward, rawDelta));
      desiredX = this.x + this.facing * clampedForward;
    }

    this._beatTargetX = this._clampArenaX(desiredX, g);
    this.ensureGlacialSkateRibbon();
  }

  queueNextComboBeat() {
    this._queuedNextBeat = true;
  }

  ensureGlacialSkateRibbon() {
    if (!this.fx) return;
    if (!this.fx.active.some((s) => s.key === 'glacialSkateRibbon')) {
      this.fx.spawn('glacialSkateRibbon', this._safeFxX(this.x - this.facing * 12), this._safeFxY(this.y - 10), {
        follow: this,
        offsetX: -12,
        offsetY: -10,
        flip: this.facing < 0,
        light: 1.14
      });
    }
  }

  spawnAfterimage(x, y, facing, row = 2, col = 3, maxLife = 0.22, tint = 'cryo') {
    if (this.afterimages.length >= 12) this.afterimages.shift();
    this.afterimages.push({
      x,
      y,
      facing,
      frameIdx: row * 30 + (col % 30),
      age: 0,
      maxLife,
      tint
    });
  }

  spawnVfxAnim(row, x, y, w = 208, h = 208, maxLife = 0.30, opts = {}) {
    if (this.activeVfxAnims.length >= 22) this.activeVfxAnims.shift();
    this.activeVfxAnims.push({
      row,
      x,
      y,
      w,
      h,
      age: 0,
      maxLife,
      startFrame: opts.startFrame ?? 0,
      endFrame: opts.endFrame ?? 29,
      vx: opts.vx ?? 0,
      vy: opts.vy ?? 0,
      flipX: Boolean(opts.flipX),
      foreground: opts.foreground !== false,
      followOwner: Boolean(opts.followOwner),
      offsetX: opts.offsetX || 0,
      offsetY: opts.offsetY || 0
    });
  }

  spawnRazorScar(cx, cy, dx, dy, maxLife = 0.22, isAurora = false) {
    if (this.razorScars.length >= 18) this.razorScars.shift();
    this.razorScars.push({
      x0: Math.round(cx - dx * 0.5),
      y0: Math.round(cy - dy * 0.5),
      x1: Math.round(cx + dx * 0.5),
      y1: Math.round(cy + dy * 0.5),
      age: 0,
      maxLife,
      isAurora
    });
  }

  spawnPixelFrostRing(x, y, maxRadius = 112, color = '#67e8f9', maxLife = 0.30, isFloor = false, hasSpikes = false) {
    if (this.fx) {
      const sx = this._safeFxX(x);
      const sy = this._safeFxY(y);
      this.fx.spawn('absoluteZeroShatterBurst', sx, sy, {
        light: hasSpikes ? 1.28 : 1.12,
        extra: { isLarge: maxRadius >= 115 || hasSpikes }
      });
    }
    if (hasSpikes) {
      if (this.activeFrostRings.length >= 10) this.activeFrostRings.shift();
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

  /**
   * 4-Stack Crystal Freeze Passive (`HOARFROST RIME [1..4]` -> `SOLID CRYSTAL FREEZE!`):
   * Stacks Hoarfrost Rime on frost strikes; at 4 stacks encases foe in a translucent Row-6
   * Crystal Sarcophagus (`0.42s` solid freeze stun), deals crit shatter damage, and heals `+14 HP`!
   */
  applyBrittleFrost(enemy, game, stacksToAdd = 1) {
    if (!enemy || enemy.isDead) return;
    enemy.brittleStacks = (enemy.brittleStacks || 0) + stacksToAdd;
    enemy.brittleDecayTimer = 5.4;

    if (enemy.brittleStacks >= 4) {
      this.triggerBrittleShatter(enemy, game || this.game, enemy.x, enemy.y - 88);
    } else if (game?.vfx) {
      const sCount = Math.min(3, enemy.brittleStacks);
      game.vfx.spawnDamageText(
        enemy.x,
        enemy.y - 148,
        0,
        false,
        `HOARFROST RIME [${sCount}/4]`,
        '#a5f3fc'
      );
    }
  }

  triggerBrittleShatter(enemy, game, _originX, _originY) {
    if (!enemy || enemy.isDead) return;
    enemy.brittleStacks = 0;
    enemy.brittleDecayTimer = 0;

    const isVanguard = enemy.hasPoise && enemy.attackRange <= 160;
    const shatterDmg = isVanguard ? 44 : 50;
    enemy.takeDamage(shatterDmg, this, true, 68, -82);

    if (
      enemy.state !== 'ULTIMATE' &&
      enemy.state !== 'TRUE_ULTIMATE' &&
      !enemy.isDead &&
      !enemy.isColossalBoss
    ) {
      enemy.stunTimer = Math.max(enemy.stunTimer || 0, 0.42);
      enemy.vx *= 0.15;
    }

    if (this.activeCrystalPrisons.length >= 6) this.activeCrystalPrisons.shift();
    this.activeCrystalPrisons.push({
      target: enemy,
      x: enemy.x,
      y: enemy.y,
      life: 0,
      maxLife: 0.48
    });

    this.heal(14, 'CRYO MIRROR SHIELD');

    if (game) {
      game.audio?.play?.('ice_shatter', enemy.x);
      game.renderer?.triggerShake?.(12, 0.22);
      game.renderer?.triggerAberration?.(7);
      game.vfx?.spawnDamageText?.(enemy.x, enemy.y - 176, 0, true, 'SOLID CRYSTAL FREEZE!', '#67e8f9');
      game.vfx?.spawnGlyphBurst?.(enemy.x, enemy.y - 96, 4, 'glacial');
      this.spawnPixelFrostRing(enemy.x, enemy.y - 96, 128, '#67e8f9', 0.34, false, true);
    }
    this.fx?.burst(this._safeFxX(enemy.x, game), this._safeFxY(enemy.y - 96), {
      count: 10,
      speedMin: 55,
      speedMax: 190,
      lifeMin: 0.16,
      lifeMax: 0.32,
      gravity: 82,
      colors: ['#ffffff', '#cffafe', '#67e8f9', '#e879f9']
    });
  }

  _gatherMeleeTargets(primaryEnemy, game, reachFront = 216, reachBack = 42) {
    const targets = [];
    const seen = new Set();
    const isAdv = Boolean(game?.isAdventureMode?.() && game?.adventure?.active);
    const myGy = this.groundY || this.y;

    const consider = (foe) => {
      if (!foe || foe === this || foe.isDead || foe.isBenched || seen.has(foe)) return;
      const relX = (foe.x - this.x) * this.facing;
      const hitPad = foe.isColossalBoss ? 80 : 0;
      if (relX < -reachBack - hitPad || relX > reachFront + hitPad) return;
      if (isAdv && !foe.isColossalBoss) {
        const foeGy = foe.groundY || foe.y;
        if (Math.abs(foeGy - myGy) > 66) return;
      }
      seen.add(foe);
      targets.push(foe);
    };

    consider(primaryEnemy);
    if (game?.getEnemiesOf) {
      const list = game.getEnemiesOf(this);
      if (Array.isArray(list)) {
        for (let i = 0; i < list.length; i++) consider(list[i]);
      }
    }
    if (isAdv && Array.isArray(game.adventure.enemies)) {
      for (let i = 0; i < game.adventure.enemies.length; i++) {
        consider(game.adventure.enemies[i]);
      }
    }
    if (isAdv && game.adventure.bossEntity) {
      consider(game.adventure.bossEntity);
    }
    return targets;
  }

  /**
   * Applies crunchy anime Frost-Glaive hit-stop (`42-56ms`), `+-3px` target `_hitShakeTimer`,
   * crystalline cryo-scars, Row-7 Diamond Starbursts, and optional Hoarfrost Rime stacks!
   */
  _applyBorealisGlaiveStrike(primaryEnemy, game, cfg) {
    const {
      damage = 25,
      reachFront = 218,
      reachBack = 40,
      hitStop = 0.044,
      shakeDur = 0.058,
      knockX = 24,
      knockY = 0,
      isCrit = false,
      scarDx = 104,
      scarDy = 82,
      isAurora = false,
      frostStacks = 0,
      sfx = 'frost_cast'
    } = cfg;

    if (game?.audio) game.audio.play(sfx, this.x + this.facing * 76);
    this.didActionFrame = true;

    const targets = this._gatherMeleeTargets(primaryEnemy, game, reachFront, reachBack);
    let landedAny = false;

    for (let i = 0; i < targets.length; i++) {
      const foe = targets[i];
      const dmg = i === 0 ? damage : Math.max(10, Math.round(damage * 0.85));
      foe.takeDamage(dmg, this, isCrit, knockX, knockY);
      if (!foe.isDead && !foe.isColossalBoss) {
        foe._hitStopTimer = Math.max(foe._hitStopTimer || 0, hitStop);
        foe._hitShakeTimer = Math.max(foe._hitShakeTimer || 0, shakeDur);
      } else if (!foe.isDead && foe.isColossalBoss) {
        foe._hitShakeTimer = Math.max(foe._hitShakeTimer || 0, shakeDur * 0.75);
      }

      const hitX = foe.x;
      const hitY = foe.y - (foe.isColossalBoss ? 128 : 88);
      this.spawnRazorScar(hitX, hitY, this.facing * scarDx, scarDy, 0.22, isAurora);
      this.spawnVfxAnim(7, hitX, hitY, 176, 176, 0.22, {
        flipX: this.facing < 0,
        foreground: true
      });
      this.fx?.burst(this._safeFxX(hitX, game), this._safeFxY(hitY), {
        count: isCrit ? 9 : 6,
        speedMin: 46,
        speedMax: 162,
        lifeMin: 0.12,
        lifeMax: 0.25,
        gravity: 36,
        colors: isAurora
          ? ['#ffffff', '#fae8ff', '#e879f9', '#38bdf8']
          : ['#ffffff', '#cffafe', '#67e8f9', '#a855f7']
      });

      if (frostStacks > 0 && !foe.isDead) {
        this.applyBrittleFrost(foe, game, frostStacks);
      }
      landedAny = true;
    }

    if (landedAny && hitStop > 0) {
      this._hitStopTimer = Math.max(this._hitStopTimer || 0, hitStop);
      game?.renderer?.triggerHitStop?.(hitStop * 0.65);
    }
    return landedAny;
  }

  fireCryoShardBurst(game, opts = {}) {
    if (!game?.vfx?.spawnProjectile && !game?.spawnProjectile) return;
    const dir = opts.dir ?? this.facing;
    const spawnX = opts.x ?? this.x + dir * 88;
    const spawnY = opts.y ?? this.y - 82;
    const proj = {
      x: spawnX,
      y: spawnY,
      vx: dir * (opts.speed ?? 670),
      vy: opts.vy ?? 0,
      radius: opts.radius ?? 20,
      damage: opts.damage ?? 22,
      owner: this,
      color: '#67e8f9',
      coreColor: '#ffffff',
      type: 'cryo_shard',
      pierce: opts.pierce !== false,
      isUltimate: Boolean(opts.isUltimate),
      maxRange: opts.maxRange ?? 460,
      ringTimer: 0,
      onHit: (target, g) => {
        this.applyBrittleFrost(target, g || game, 1);
      }
    };
    if (game.vfx?.spawnProjectile) {
      game.vfx.spawnProjectile(proj);
    } else if (game.spawnProjectile) {
      game.spawnProjectile(proj);
    }
    this.spawnVfxAnim(0, spawnX, spawnY, 188, 188, 0.24, {
      vx: dir * 260,
      flipX: dir < 0,
      foreground: true
    });
  }

  spawnSnowflakeChakram(enemy, game) {
    if (this.activeChakrams.length >= 3) this.activeChakrams.shift();
    const dir = this.facing;
    const targetX =
      enemy && !enemy.isDead
        ? enemy.x + dir * 48
        : this._clampArenaX(this.x + dir * 260, game);
    this.activeChakrams.push({
      startX: this.x + dir * 64,
      startY: this.y - 92,
      apexX: targetX,
      apexY: this.y - 96,
      x: this.x + dir * 64,
      y: this.y - 92,
      age: 0,
      maxLife: 0.68,
      hitOut: false,
      hitBack: false,
      caught: false
    });
    this.fx?.spawn('snowflakeChakramBurst', this._safeFxX(this.x + dir * 68, game), this._safeFxY(this.y - 92), {
      flip: dir < 0,
      light: 1.18
    });
  }

  spawnMarchingGlacierSpires(game) {
    const dir = this.facing;
    for (let i = 0; i < 3; i++) {
      const sx = this._clampArenaX(this.x + dir * (96 + i * 74), game);
      this.activeMarchingSpires.push({
        x: sx,
        y: this.groundY,
        delay: i * 0.07,
        age: 0,
        maxLife: 0.56,
        erupted: false
      });
    }
    if (this.permafrostZones.length >= 2) this.permafrostZones.shift();
    this.permafrostZones.push({
      x: this._clampArenaX(this.x + dir * 136, game),
      y: this.groundY,
      radius: 136,
      life: 0,
      maxLife: 2.2
    });
  }

  spawnBorealisSkyIcicles(enemy, game) {
    const baseTargetX =
      enemy && !enemy.isDead
        ? enemy.x
        : this._clampArenaX(this.x + this.facing * 165, game);
    for (let i = 0; i < 3; i++) {
      const tx = this._clampArenaX(baseTargetX + (i - 1) * 52, game);
      const startX = tx - this.facing * 92;
      const startY = this.groundY - 268 - i * 24;
      this.activeSkyIcicles.push({
        x0: startX,
        y0: startY,
        tx,
        ty: this.groundY - 8,
        x: startX,
        y: startY,
        delay: i * 0.055,
        age: 0,
        flightDur: 0.20,
        impacted: false
      });
    }
    this.fx?.spawn('borealisIcicleHail', this._safeFxX(baseTargetX, game), this._safeFxY(this.groundY - 120), {
      flip: this.facing < 0,
      light: 1.2
    });
  }

  onProjectileTrail(p) {
    if (!this.fx || !p || p.type !== 'cryo_shard') return;
    p.ringTimer = (p.ringTimer || 0) + 0.016;
    if (p.ringTimer >= 0.08) {
      p.ringTimer = 0;
      const sx = this._safeFxX(p.x - Math.sign(p.vx || 1) * 14);
      const sy = this._safeFxY(p.y);
      this.fx.burst(sx, sy, {
        count: 2,
        speedMin: 20,
        speedMax: 52,
        lifeMin: 0.11,
        lifeMax: 0.19,
        gravity: -8,
        colors: ['#ffffff', '#cffafe', '#67e8f9', '#e879f9']
      });
    }
  }

  startCrouch(_enemy, game) {
    this.crouchCooldown = 3.2;
    this.crouchDuration = 0.92;
    this.setState('CROUCH');
    this.isCrouching = true;
    this.isDeflecting = true;
    this.didSecondaryAction = false;
    this.vx = 0;

    const wallX = this._clampArenaX(this.x + this.facing * 76, game);
    this.iceWall = {
      x: wallX,
      y: this.groundY,
      facing: this.facing,
      life: 0,
      maxLife: 2.2,
      refractedCount: 0
    };
    this.fx?.burst(this._safeFxX(wallX, game), this._safeFxY(this.groundY - 22), {
      count: 6,
      speedMin: 36,
      speedMax: 108,
      lifeMin: 0.12,
      lifeMax: 0.24,
      gravity: 68,
      colors: ['#ffffff', '#cffafe', '#67e8f9', '#e879f9']
    });
    game?.audio?.play?.('frost_cast', wallX);
    game?.vfx?.spawnDamageText?.(this.x, this.y - 134, 0, false, 'HYDROBLADE MIRROR WALL!', '#a5f3fc');
  }

  updateCrouch(_dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.crouchDuration || 0.92;
    this.vx = 0;
    this.isCrouching = true;
    this.isDeflecting = t < 0.58;

    // Split incoming enemy projectiles through the Hydroblade Mirror Wall into twin Borealis Cryo-Shards!
    if (this.isDeflecting && game?.vfx?.projectiles) {
      const checkX = this.iceWall ? this.iceWall.x : this.x + this.facing * 64;
      for (const proj of game.vfx.projectiles) {
        if (
          proj.owner !== this &&
          !proj._refractedByLyraEx &&
          Math.abs(proj.x - checkX) < 96 &&
          Math.abs(proj.y - (this.y - 84)) < 96
        ) {
          proj._refractedByLyraEx = true;
          proj.owner = this;
          proj.vx = this.facing * Math.max(620, Math.abs(proj.vx) * 1.2);
          proj.vy = -48;
          proj.color = '#67e8f9';
          proj.coreColor = '#ffffff';
          this.fireCryoShardBurst(game, {
            x: checkX,
            y: proj.y + 12,
            dir: this.facing,
            vy: 48,
            damage: 24,
            speed: 640
          });
          this.gainMana(14);
          this.gainFinisher(8);
          game?.audio?.play?.('prism_beam', checkX);
        }
      }
    }

    // Frost-Glaive Prism Counter-Riposte at t = 0.52s
    if (!this.didSecondaryAction && t >= 0.52) {
      this.didSecondaryAction = true;
      this.isDeflecting = false;
      const sx = this.x + this.facing * 78;
      this.fx?.spawn('cryoPrismMachCone', this._safeFxX(sx, game), this._safeFxY(this.y - 84), {
        flip: this.facing < 0,
        light: 1.24
      });
      this.fireCryoShardBurst(game, {
        x: sx,
        y: this.y - 84,
        damage: 28,
        speed: 700,
        maxRange: 500
      });
      this._applyBorealisGlaiveStrike(enemy, game, {
        damage: 38,
        reachFront: 218,
        hitStop: 0.044,
        shakeDur: 0.06,
        knockX: 84,
        knockY: -62,
        isCrit: true,
        scarDx: 112,
        scarDy: -68,
        isAurora: true,
        frostStacks: 1,
        sfx: 'frost_cast'
      });
    }

    if (t >= dur) {
      this.isCrouching = false;
      this.isDeflecting = false;
      this.setState('IDLE');
    }
  }

  startJump(enemy, game, dirOverride = null) {
    const dir = dirOverride !== null ? dirOverride : this.facing;
    this.facing = dir || 1;
    this.vaultCooldown = 2.8;
    this.dodgeCooldown = Math.max(this.dodgeCooldown || 0, 1.5);
    this.dashDuration = 0.56;
    this.isFlipVault = true;
    this.isInvulnerable = true;
    this.didSecondaryAction = false;
    this._spawnedJumpSteps = 0;
    this.flipStartX = this.x;

    let desiredX = this.x + this.facing * 220;
    if (enemy && !enemy.isDead && this.facing === (enemy.x >= this.x ? 1 : -1)) {
      desiredX = enemy.x - this.facing * 114;
    }
    this.flipTargetX = this._clampArenaX(desiredX, game);
    this.vx = 0;
    this.vy = 0;
    this.setState('JUMP');
    this.ensureGlacialSkateRibbon();
    game?.audio?.play?.('zephyr_flip', this.x);
    game?.vfx?.spawnDamageText?.(this.x, this.y - 138, 0, false, 'TRIPLE-AXEL SKY-STAIR!', '#67e8f9');
  }

  updateJump(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.dashDuration || 0.56;
    const u = Math.min(1, Math.max(0, t / dur));

    this.x = this.flipStartX + (this.flipTargetX - this.flipStartX) * (1 - Math.pow(1 - u, 1.85));
    this.y = this.groundY - Math.sin(u * Math.PI) * 114;
    this.isInvulnerable = u < 0.68;

    // Spawn 3 stepped mid-air crystalline platforms beneath her skates!
    const stepTarget = u >= 0.62 ? 3 : u >= 0.36 ? 2 : u >= 0.14 ? 1 : 0;
    while (this._spawnedJumpSteps < stepTarget) {
      this._spawnedJumpSteps++;
      if (this.skyIceSteps.length >= 6) this.skyIceSteps.shift();
      this.skyIceSteps.push({
        x: this.x,
        y: this.y + 6,
        width: 58,
        life: 0,
        maxLife: 0.72
      });
    }

    this.afterimageAccum += dt;
    if (this.afterimageAccum >= 0.055 && u < 0.82) {
      this.afterimageAccum = 0;
      this.spawnAfterimage(this.x, this.y, this.facing, 8, Math.min(28, Math.floor(u * 30)), 0.20, 'aurora');
    }

    if (!this.didSecondaryAction && u >= 0.52) {
      this.didSecondaryAction = true;
      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }
      this.fireCryoShardBurst(game, {
        x: this.x + this.facing * 64,
        y: Math.min(this.groundY - 68, this.y - 46),
        vy: 64,
        damage: 26,
        speed: 660
      });
      this._applyBorealisGlaiveStrike(enemy, game, {
        damage: 32,
        reachFront: 212,
        hitStop: 0.042,
        shakeDur: 0.055,
        knockX: 56,
        knockY: -44,
        scarDx: 102,
        scarDy: 86,
        frostStacks: 1,
        sfx: 'frost_cast'
      });
    }

    if (u >= 1) {
      this.y = this.groundY;
      this.vx = 0;
      this.vy = 0;
      this.isFlipVault = false;
      this.isInvulnerable = false;
      game?.vfx?.spawnShockwave?.(this.x, this.groundY - 4, 62, '#67e8f9', 0.22, false, true);
      this.setState('IDLE');
    }
  }

  onStartDodge(_enemy, game, _dir) {
    // Leave an Ice-Sculpture Decoy statue at departure point!
    this.iceDecoy = {
      x: this.x,
      y: this.groundY,
      facing: this.facing,
      life: 0,
      maxLife: 1.65,
      shattered: false
    };
    this.ensureGlacialSkateRibbon();
    game?.audio?.play?.('frost_cast', this.x);
  }

  updateDodge(dt, enemy, game) {
    if (!this.iceDecoy && this.stateTimer < 0.06) {
      this.onStartDodge(enemy, game, this.dashDir);
    }
    this.updateJump(dt, enemy, game);
  }

  onStartDash(enemy, game, dir) {
    this.dashDuration = 0.36;
    this.dashDir = dir || this.facing;
    this.ensureGlacialSkateRibbon();
    game?.audio?.play?.('dash_whoosh', this.x);
    if (this.permafrostZones.length >= 2) this.permafrostZones.shift();
    this.permafrostZones.push({
      x: this._clampArenaX(this.x + this.dashDir * 96, game),
      y: this.groundY,
      radius: 118,
      life: 0,
      maxLife: 1.85
    });
    this.spawnSnowflakeChakram(enemy, game);
  }

  updateDash(dt, enemy, _game) {
    const t = this.stateTimer;
    const dur = this.dashDuration || 0.36;
    const dir = this.dashDir || this.facing;
    this.vy = 0;
    this.y = this.groundY;

    if (t < dur * 0.78) {
      const distToEnemy = enemy && !enemy.isDead ? (enemy.x - this.x) * dir : 999;
      if (distToEnemy <= 116 && distToEnemy >= 72) {
        this.vx = 0;
      } else {
        this.vx = dir * 610;
      }
      this._skateSparkAcc += dt;
      if (this._skateSparkAcc >= 0.036) {
        this._skateSparkAcc = 0;
        this.spawnAfterimage(this.x, this.y, this.facing, 6, Math.min(24, Math.floor((t / dur) * 30)), 0.18, 'cryo');
      }
    } else {
      this.vx = 0;
    }

    if (t >= dur) {
      this.vx = 0;
      this.setState('IDLE');
    }
  }

  updateDashOrDodge(dt, enemy, game) {
    if (this.state === 'DASH') {
      this.updateDash(dt, enemy, game);
    } else {
      this.updateDodge(dt, enemy, game);
    }
  }

  /**
   * 4-Beat FFBE Skating Frost-Glaive Spell-Blade Choreography (`[[60,8],[68,7],[75,8],[83,7]]`):
   * - `V0 (F03)`: 1-frame snap hydroblade lunge downward cryo-crescent smear (`44ms` hit-stop + `'cryo_shard'`)!
   * - `V1 (F09)`: Instant reverse rising Arabesque frost-arc smear (`44ms` hit-stop + Snowflake Chakram)!
   * - `V2 (F17/F18)`: 2.5D figure-skating Borealis pirouette 360 cryo-vortex (`2-hit` + frost stack + Spires)!
   * - `V3 (F25)`: Airborne Borealis Axel leap -> shattering Permafrost Glaive-Slam (`3-hit` + `56ms` hit-stop + `'cryo_shard'` burst)!
   * - Crisp `vx = 0` skate-edge stop plant on snap, `0.015s` link, and zero IDLE reset!
   */
  updateAutoAttack(dt, enemy, game) {
    this._currentEnemy = enemy;
    this._comboPersistTimer = 0.74;

    if (this._intraLinkTimer > 0) {
      this._intraLinkTimer = Math.max(0, this._intraLinkTimer - dt);
      this.vx = 0;
      this.vy = 0;
      if (this._intraLinkTimer <= 0) {
        this._beginComboBeat(this.comboStep, game);
        this._aiComboCount = (this._aiComboCount || 0) + 1;
        this._aiComboChainTimer = 0.92;
      }
      return;
    }

    const v = this._autoVariant;
    const dur = this.autoDuration || BEAT_DURATIONS[v];
    const t = this.stateTimer;
    const [sliceStart, sliceLen] = AUTO_SLICES_EX[v];
    const snapT = v === 0 ? 0.10 : v === 1 ? 0.06 : v === 2 ? 0.08 : 0.16;

    let localStep = 0;
    if (v === 0) {
      if (t < 0.10) localStep = Math.min(2, Math.floor((t / 0.10) * 3));
      else if (t < 0.15) localStep = 3;
      else if (t < 0.25) localStep = 4 + Math.min(1, Math.floor(((t - 0.15) / 0.10) * 2));
      else localStep = 6 + Math.min(1, Math.floor(((t - 0.25) / 0.10) * 2));
    } else if (v === 1) {
      if (t < 0.06) localStep = 0;
      else if (t < 0.115) localStep = 1;
      else if (t < 0.205) localStep = 2 + Math.min(1, Math.floor(((t - 0.115) / 0.09) * 2));
      else localStep = 4 + Math.min(2, Math.floor(((t - 0.205) / 0.125) * 3));
    } else if (v === 2) {
      if (t < 0.08) localStep = Math.min(1, Math.floor((t / 0.08) * 2));
      else if (t < 0.14) localStep = 2;
      else if (t < 0.195) localStep = 3;
      else localStep = 4 + Math.min(3, Math.floor(((t - 0.195) / 0.175) * 4));
    } else {
      if (t < 0.16) localStep = Math.min(1, Math.floor((t / 0.16) * 2));
      else if (t < 0.24) localStep = 2;
      else localStep = 3 + Math.min(3, Math.floor(((t - 0.24) / 0.26) * 4));
    }

    const frameIdx = sliceStart + Math.min(sliceLen - 1, Math.max(0, localStep));
    this.trueUltFrameOverride = frameIdx;
    this._overrideFrameIdx = frameIdx;

    // 1. Hydroblade Impulse -> Crisp Skate-Edge Stop Plant (`vx = 0`) right at `snapT`!
    this.vx = 0;
    if (t < snapT) {
      const lungeU = Math.min(1, Math.max(0, t / snapT));
      const eased = 1 - Math.pow(1 - lungeU, 2.2);
      this.x = this._beatStartX + (this._beatTargetX - this._beatStartX) * eased;

      if (v === 0 && Math.abs(this._beatTargetX - this._beatStartX) > 24) {
        this._skateSparkAcc += dt;
        if (this._skateSparkAcc >= 0.032) {
          this._skateSparkAcc = 0;
          this.spawnAfterimage(this.x, this.y, this.facing, 2, localStep, 0.16, 'cryo');
          this.fx?.burst(this._safeFxX(this.x - this.facing * 32, game), this._safeFxY(this.groundY - 4), {
            count: 3,
            speedMin: 30,
            speedMax: 88,
            lifeMin: 0.10,
            lifeMax: 0.20,
            gravity: 65,
            colors: ['#ffffff', '#cffafe', '#67e8f9']
          });
        }
      }
    } else if (!this._bootsPlanted) {
      this._bootsPlanted = true;
      this.x = this._beatTargetX;
      this.vx = 0;
    }

    // Airborne Borealis Axel leap on Beat 4 (V3: lifts 58px on F23..F24, plants groundY at F25 t = 0.16s!)
    if (v === 3) {
      if (t < 0.16) {
        const airU = t / 0.16;
        this.y = this.groundY - Math.sin(airU * Math.PI * 0.86) * 58;
        this.vy = 0;
      } else {
        this.y = this.groundY;
        this.vy = 0;
      }
    } else {
      this.y = this.groundY;
      this.vy = 0;
    }

    // 2. Beat-Specific Smear Snap Impacts (`42-56ms` hit-stop, `1 -> 1 -> 2 -> 3` hits + cryo constructs)
    if (v === 0) {
      if ((this._beatHitMask & 1) === 0 && t >= 0.10) {
        this._beatHitMask |= 1;
        const slashX = this.x + this.facing * 72;
        game?.vfx?.spawnShockwave?.(this.x + this.facing * 38, this.groundY - 4, 56, '#67e8f9', 0.20, false, true);
        this.fx?.spawn('cryoPrismMachCone', this._safeFxX(slashX, game), this._safeFxY(this.y - 84), {
          flip: this.facing < 0,
          light: 1.22
        });
        this._applyBorealisGlaiveStrike(enemy, game, {
          damage: 24,
          reachFront: 218,
          hitStop: 0.044,
          shakeDur: 0.056,
          knockX: 22,
          knockY: 0,
          scarDx: 108,
          scarDy: 84,
          isAurora: false,
          frostStacks: 1,
          sfx: 'frost_cast'
        });
      }
    } else if (v === 1) {
      if ((this._beatHitMask & 1) === 0 && t >= 0.06) {
        this._beatHitMask |= 1;
        const slashX = this.x + this.facing * 76;
        game?.vfx?.spawnShockwave?.(slashX, this.groundY - 6, 66, '#e879f9', 0.22, false, true);
        this.spawnSnowflakeChakram(enemy, game);
        this._applyBorealisGlaiveStrike(enemy, game, {
          damage: 26,
          reachFront: 220,
          hitStop: 0.044,
          shakeDur: 0.058,
          knockX: 20,
          knockY: -124,
          scarDx: 106,
          scarDy: -90,
          isAurora: true,
          frostStacks: 1,
          sfx: 'frost_cast'
        });
      }
    } else if (v === 2) {
      if ((this._beatHitMask & 1) === 0 && t >= 0.08) {
        this._beatHitMask |= 1;
        this.spawnVfxAnim(3, this.x + this.facing * 24, this.groundY - 12, 212, 92, 0.34, {
          flipX: this.facing < 0,
          foreground: false
        });
        this._applyBorealisGlaiveStrike(enemy, game, {
          damage: 18,
          reachFront: 218,
          hitStop: 0.042,
          shakeDur: 0.048,
          knockX: 12,
          knockY: -20,
          scarDx: 114,
          scarDy: 32,
          isAurora: false,
          frostStacks: 0,
          sfx: 'frost_cast'
        });
      }
      if ((this._beatHitMask & 2) === 0 && t >= 0.14) {
        this._beatHitMask |= 2;
        this.spawnMarchingGlacierSpires(game);
        this._applyBorealisGlaiveStrike(enemy, game, {
          damage: 21,
          reachFront: 220,
          hitStop: 0.044,
          shakeDur: 0.054,
          knockX: 16,
          knockY: -36,
          scarDx: 114,
          scarDy: -38,
          isAurora: true,
          frostStacks: 1,
          sfx: 'prism_beam'
        });
      }
    } else {
      if ((this._beatHitMask & 1) === 0 && t >= 0.16) {
        this._beatHitMask |= 1;
        const slamX = this.x + this.facing * 82;
        game?.renderer?.triggerShake?.(13, 0.25);
        game?.audio?.play?.('ice_shatter', slamX);
        game?.vfx?.spawnShockwave?.(slamX, this.groundY - 4, 96, '#67e8f9', 0.28, false, true);
        this.fx?.spawn('permafrostSnowflakeSigil', this._safeFxX(slamX, game), this._safeFxY(this.groundY - 4), {
          flip: this.facing < 0,
          light: 1.26
        });
        this.spawnVfxAnim(2, slamX, this.groundY - 78, 212, 212, 0.36, {
          flipX: this.facing < 0,
          foreground: false
        });
        this._applyBorealisGlaiveStrike(enemy, game, {
          damage: 23,
          reachFront: 224,
          hitStop: 0.056,
          shakeDur: 0.080,
          knockX: 34,
          knockY: -44,
          isCrit: true,
          scarDx: 26,
          scarDy: 136,
          isAurora: true,
          frostStacks: 1,
          sfx: 'ice_shatter'
        });
        this.fireCryoShardBurst(game, {
          x: slamX,
          y: this.groundY - 78,
          damage: 24,
          speed: 690,
          maxRange: 470,
          pierce: true
        });
        this.spawnBorealisSkyIcicles(enemy, game);
      }
      if ((this._beatHitMask & 2) === 0 && t >= 0.21) {
        this._beatHitMask |= 2;
        this._applyBorealisGlaiveStrike(enemy, game, {
          damage: 15,
          reachFront: 226,
          hitStop: 0,
          shakeDur: 0.045,
          knockX: 26,
          knockY: -34,
          scarDx: 92,
          scarDy: 76,
          isAurora: false,
          frostStacks: 0,
          sfx: 'frost_cast'
        });
      }
      if ((this._beatHitMask & 4) === 0 && t >= 0.26) {
        this._beatHitMask |= 4;
        this._applyBorealisGlaiveStrike(enemy, game, {
          damage: 20,
          reachFront: 228,
          hitStop: 0,
          shakeDur: 0.055,
          knockX: 88,
          knockY: -84,
          isCrit: true,
          scarDx: 98,
          scarDy: -82,
          isAurora: true,
          frostStacks: 1,
          sfx: 'prism_beam'
        });
      }
    }

    // 3. Seamless Direct Beat Chaining (`0.015s` link, ZERO return to IDLE!)
    if (t >= dur) {
      this.y = this.groundY;
      this.vx = 0;
      const isManualPlayer = Boolean(
        (this.isPlayerControlled && !this.adventureAutoPlay) || this.isManualAdventureControl
      );
      const advHoldingAttack = Boolean(
        game?.isAdventureMode?.() &&
          (game?.adventure?.heldAttack ||
            game?.adventure?.uiHeldAttack ||
            game?.adventure?.queuedAction === 'attack' ||
            this._queuedNextBeat)
      );
      const aiWantsChain =
        !isManualPlayer &&
        enemy &&
        !enemy.isDead &&
        !enemy.isInvulnerable &&
        Math.abs(enemy.x - this.x) <= 248;

      if (v < 3 && (this._queuedNextBeat || aiWantsChain || advHoldingAttack)) {
        if (game?.adventure?.queuedAction === 'attack') {
          game.adventure.queuedAction = null;
        }
        this._queuedNextBeat = false;
        this._intraLinkTimer = INTRA_COMBO_LINK;
        return;
      }

      if (v === 3) {
        this.comboStep = 0;
        this._aiComboReadyFinisher = 0.92;
        this._aiOutstepTimer = 0.22;
        this._aiOutstepDir = -1;
        this.autoCooldown = isManualPlayer ? 0.06 : this._postFlurryInterval * (0.92 + Math.random() * 0.16);
      } else {
        this.autoCooldown = 0.015;
      }

      this.unstoppablePoise = false;
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      this.setState('IDLE');
    }
  }

  /**
   * SPECIAL SKILL (`4.65s CD`, `1.04s`, Row 3 `90..119`):
   * `GLACIAL JAWS: CRYO SHATTER` — Advancing Borealis Frost-Glaive cut + Twin Flanking Row-2
   * Glacier Iceberg Walls that slam inward together in a seismic Cryo Shatter (`+2` Rime stacks)!
   */
  updateSkill(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.skillDuration || 1.04;
    this.unstoppablePoise = true;

    const targetCenter =
      enemy && !enemy.isDead
        ? enemy.x
        : this._clampArenaX(this.x + this.facing * 155, game);

    if (t < 0.34) {
      const dist = enemy && !enemy.isDead ? (enemy.x - this.x) * this.facing : 150;
      if (t >= 0.04 && t < 0.24 && dist > 114) {
        this.vx = this.facing * Math.min(520, (dist - 108) * 8.5 + 190);
      } else {
        this.vx = 0;
      }
      this.afterimageAccum += dt;
      if (this.afterimageAccum >= 0.045) {
        this.afterimageAccum = 0;
        this.spawnAfterimage(this.x, this.y, this.facing, 3, Math.min(14, Math.floor((t / dur) * 30)), 0.20, 'cryo');
      }
    } else {
      this.vx = 0;
    }

    // Step 1 (t = 0.14s): Erupt Twin Flanking Glacier Iceberg Walls around target!
    if ((this._skillStepMask & 1) === 0 && t >= 0.14) {
      this._skillStepMask |= 1;
      const clampedCx = this._clampArenaX(targetCenter, game);
      this.glacierJaws = {
        centerX: clampedCx,
        span: 146,
        slammed: false,
        fade: 1.0
      };
      game?.audio?.play?.('frost_cast', clampedCx);
      game?.vfx?.spawnDamageText?.(clampedCx, this.groundY - 196, 0, false, 'GLACIAL JAWS!', '#67e8f9');
      this.fx?.spawn('blizzardJawsVortex', this._safeFxX(clampedCx, game), this._safeFxY(this.groundY - 82), {
        flip: this.facing < 0,
        light: 1.24
      });
    }

    // Step 2 (t = 0.30s): Advancing Borealis Frost-Glaive Slash
    if ((this._skillStepMask & 2) === 0 && t >= 0.30) {
      this._skillStepMask |= 2;
      this.vx = 0;
      this._applyBorealisGlaiveStrike(enemy, game, {
        damage: 28,
        reachFront: 235,
        hitStop: 0.036,
        shakeDur: 0.052,
        knockX: 14,
        knockY: -28,
        scarDx: 118,
        scarDy: 84,
        isAurora: false,
        frostStacks: 1,
        sfx: 'frost_cast'
      });
    }

    // Animate Jaws closing inward (`0.36..0.62s`)
    if (this.glacierJaws) {
      if (t >= 0.36 && t < 0.62) {
        const closeU = (t - 0.36) / 0.26;
        this.glacierJaws.span = 146 * (1 - closeU * closeU * 0.84);
      } else if (t >= 0.62) {
        this.glacierJaws.span = 22;
        this.glacierJaws.fade = Math.max(0, 1 - (t - 0.62) / 0.38);
      }
    }

    // Step 3 (t = 0.62s): Twin Icebergs SLAM inward -> CRYO SHATTER!
    if ((this._skillStepMask & 4) === 0 && t >= 0.62) {
      this._skillStepMask |= 4;
      const slamX = this.glacierJaws ? this.glacierJaws.centerX : targetCenter;
      if (this.glacierJaws) this.glacierJaws.slammed = true;
      game?.audio?.play?.('ice_shatter', slamX);
      game?.renderer?.triggerShake?.(15, 0.28);
      this.spawnPixelFrostRing(slamX, this.groundY - 88, 146, '#e879f9', 0.36, false, true);

      const foes = this._gatherMeleeTargets(enemy, game, 320, 160);
      let hitAny = false;
      for (const foe of foes) {
        if (Math.abs(foe.x - slamX) <= 190 || foe === enemy) {
          foe.takeDamage(54, this, true, 88, -142);
          foe._hitShakeTimer = Math.max(foe._hitShakeTimer || 0, 0.075);
          this.applyBrittleFrost(foe, game, 2);
          this.spawnRazorScar(foe.x, foe.y - 92, 124, -92, 0.26, true);
          hitAny = true;
        }
      }
      if (hitAny) {
        this._hitStopTimer = Math.max(this._hitStopTimer || 0, 0.050);
      }
    }

    if (t >= dur) {
      this.vx = 0;
      this.y = this.groundY;
      this.glacierJaws = null;
      this.unstoppablePoise = false;
      this.setState('IDLE');
    }
  }

  /**
   * OVERDRIVE (`1.96s`, Row 4 `120..149`):
   * `ABSOLUTE ZERO CATHEDRAL` — Summons 7 Celestial Ice-Claymores (`Row 4` of `icemage_ex_vfx.png`)
   * in a hexagonal Borealis palisade around the target before plunging the 7th Sovereign Crown-Sword
   * into the center (`+26 HP` Sovereign Heal)!
   */
  updateUltimate(_dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.ultDuration || 1.96;
    this.isInvulnerable = true;
    this.vx = 0;
    this.vy = 0;

    if (!this._ultInit) {
      this._ultInit = true;
      this._ultSwordsDropped = 0;
      this._ultDidCrownPlunge = false;
      this._ultCenterX = this._clampArenaX(
        enemy && !enemy.isDead ? enemy.x : this.x + this.facing * 185,
        game
      );
      this.coronationDomain = {
        centerX: this._ultCenterX,
        swords: [],
        crownY: this.groundY - 320,
        crownDropped: false
      };
      game?.audio?.play?.('ult_cast', this.x);
      game?.audio?.play?.('frost_cast', this._ultCenterX);
      game?.vfx?.spawnDamageText?.(
        this._ultCenterX,
        this.groundY - 224,
        0,
        true,
        'ABSOLUTE ZERO CATHEDRAL!',
        '#67e8f9'
      );
      this.fx?.spawn('borealisCathedralDomain', this._safeFxX(this._ultCenterX, game), this._safeFxY(this.groundY - 4), {
        flip: this.facing < 0,
        light: 1.32
      });
    }

    if (enemy && !enemy.isDead && t < 1.18) {
      this._ultCenterX = this._clampArenaX(enemy.x, game);
      if (this.coronationDomain) this.coronationDomain.centerX = this._ultCenterX;
    }
    const cx = this._ultCenterX;

    // Slight levitation during Coronation Choir (`0.12..1.42s`)
    if (t < 1.42) {
      const liftU = Math.min(1, t / 0.28);
      this.y = this.groundY - 46 * Math.sin(liftU * Math.PI * 0.5);
      this.trueUltFrameOverride = 120 + Math.min(18, Math.floor((t / 1.42) * 19));
      this._overrideFrameIdx = this.trueUltFrameOverride;
    } else {
      const descU = Math.min(1, (t - 1.42) / 0.42);
      this.y = this.groundY - 46 * (1 - descU);
      this.trueUltFrameOverride = 139 + Math.min(10, Math.floor(descU * 11));
      this._overrideFrameIdx = this.trueUltFrameOverride;
    }

    // Drop 6 outer Celestial Ice-Claymores sequentially (`0.22, 0.35, 0.48, 0.61, 0.74, 0.87s`)
    const offsets = [-148, 148, -98, 98, -48, 48];
    while (this._ultSwordsDropped < 6 && t >= 0.22 + this._ultSwordsDropped * 0.13) {
      const idx = this._ultSwordsDropped++;
      const sx = this._clampArenaX(cx + offsets[idx], game);
      if (this.coronationDomain) {
        this.coronationDomain.swords.push({
          x: sx,
          y: this.groundY - 62,
          age: 0
        });
      }
      game?.audio?.play?.('frost_cast', sx);
      this.fx?.spawn('coronationSwordImpact', this._safeFxX(sx, game), this._safeFxY(this.groundY - 4), {
        light: 1.24,
        extra: { isCenter: false }
      });

      const foes = this._gatherMeleeTargets(enemy, game, 360, 220);
      for (const foe of foes) {
        if (Math.abs(foe.x - cx) <= 210 || foe === enemy) {
          if (!foe.isColossalBoss) {
            foe.x += (cx - foe.x) * 0.22;
          }
          foe.takeDamage(24, this, idx % 2 === 1, 10, -24);
          foe._hitShakeTimer = Math.max(foe._hitShakeTimer || 0, 0.048);
          this.spawnRazorScar(foe.x, foe.y - 92, idx % 2 === 0 ? 118 : -118, 86, 0.24, idx % 2 === 1);
        }
      }
    }

    // Drop 7th Sovereign Crown-Claymore at t = 1.42s -> Cathedral Shatter + 26 HP Heal!
    if (!this._ultDidCrownPlunge && t >= 1.42) {
      this._ultDidCrownPlunge = true;
      if (this.coronationDomain) {
        this.coronationDomain.crownDropped = true;
        this.coronationDomain.crownY = this.groundY - 82;
      }
      game?.audio?.play?.('ice_shatter', cx);
      game?.renderer?.triggerShake?.(18, 0.34);
      this.fx?.spawn('coronationSwordImpact', this._safeFxX(cx, game), this._safeFxY(this.groundY - 4), {
        light: 1.38,
        extra: { isCenter: true }
      });
      this.spawnPixelFrostRing(cx, this.groundY - 96, 168, '#67e8f9', 0.42, false, true);
      this.heal(26, 'SOVEREIGN CORONATION');

      const foes = this._gatherMeleeTargets(enemy, game, 380, 240);
      for (const foe of foes) {
        if (Math.abs(foe.x - cx) <= 240 || foe === enemy) {
          foe.takeDamage(92, this, true, 148, -168);
          this.applyBrittleFrost(foe, game, 2);
          this.spawnRazorScar(foe.x, foe.y - 98, 36, 168, 0.32, true);
        }
      }
    }

    if (t >= dur) {
      this.y = this.groundY;
      this.isInvulnerable = false;
      this.coronationDomain = null;
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      this.setState('IDLE');
    }
  }

  _buildTrueUltFracturesAndShards() {
    this._trueUltCracks = [];
    for (let i = 0; i < 10; i++) {
      const baseAng = (i / 10) * Math.PI * 2 + 0.19;
      const segs = [];
      let px = 0;
      let py = 0;
      for (let s = 1; s <= 4; s++) {
        const jitter = ((i * 17 + s * 31) % 11 - 5) * 0.05;
        const nx = px + Math.cos(baseAng + jitter) * 56;
        const ny = py + Math.sin(baseAng + jitter) * 38;
        segs.push({ x0: Math.round(px), y0: Math.round(py), x1: Math.round(nx), y1: Math.round(ny) });
        px = nx;
        py = ny;
      }
      this._trueUltCracks.push({
        threshold: (i % 5) * 0.14,
        magenta: i % 3 === 0,
        segs
      });
    }

    this._trueUltGlassShards = [];
    for (let i = 0; i < 28; i++) {
      const ang = (i / 28) * Math.PI * 2;
      const spd = 160 + (i % 5) * 44;
      this._trueUltGlassShards.push({
        x: this.x,
        y: this.groundY - 140,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd * 0.75 - 75,
        angle: ang,
        vAngle: (i % 2 === 0 ? 1 : -1) * (3.2 + (i % 4) * 0.8),
        r1: 16 + (i % 4) * 5,
        r2: 9 + (i % 3) * 4,
        fill: i % 3 === 0 ? '#e879f9' : i % 2 === 0 ? '#67e8f9' : '#bae6fd',
        facet: '#ffffff'
      });
    }

    this._trueUltDiamondDust = [];
    for (let i = 0; i < 34; i++) {
      this._trueUltDiamondDust.push({
        x: 60 + ((i * 97) % 1080),
        y: 28 + ((i * 53) % 380),
        vx: ((i % 5) - 2) * 14,
        vy: 42 + (i % 4) * 16,
        size: i % 3 === 0 ? 4 : 3,
        magenta: i % 3 === 0
      });
    }
  }

  /**
   * 3-Overdrive Supreme Finisher (`4.60s`):
   * `ETERNAL BOREALIS: AGE OF PERMAFROST`
   * Strictly triggers `game.renderer.triggerGlacialStage()` and `setStageTransformation('glacial', ...)`
   * ONLY at Sovereign Scepter-Tap impact `t >= 3.28s` (`_trueUltStep < 4`) for full `glacial` & `shogunate_glacial` synergy!
   */
  updateTrueUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    const advBounds =
      game?.adventure?.active && typeof game.adventure.getActiveStageBounds === 'function'
        ? game.adventure.getActiveStageBounds()
        : null;
    this.isInvulnerable = true;
    this.unstoppablePoise = true;
    this.vx = 0;
    this.vy = 0;

    const targets = this._gatherMeleeTargets(enemy, game, 680, 680);
    if (enemy && !enemy.isDead && !targets.includes(enemy)) {
      targets.unshift(enemy);
    }

    if (t <= 2.95) {
      const rawX = enemy && !enemy.isDead ? enemy.x : this.x + this.facing * 220;
      this._trueUltCoffinX = this._clampArenaX(rawX, game);
      if (Math.abs(this._trueUltCoffinX - this.x) > 8) {
        this.facing = this._trueUltCoffinX >= this.x ? 1 : -1;
      }
    }

    // Act I (`0.00..1.12s`): Borealis Aurora Consecration & Floating Ice-Lotus Ascension
    if (t < 1.12) {
      const liftU = Math.min(1, t / 0.34);
      const smoothLift = 1 - Math.pow(1 - liftU, 2.2);
      this.y = this.groundY - 92 * smoothLift;
      this.cameraAirLift = 112 * smoothLift;
      this.trueUltFrameOverride = 120 + Math.min(8, Math.floor((t / 1.12) * 9));
      this._overrideFrameIdx = this.trueUltFrameOverride;

      if (t >= 0.04 && this._trueUltStep < 1) {
        this._trueUltStep = 1;
        game?.audio?.play?.('ult_cast', this.x);
        game?.audio?.play?.('frost_cast', this.x);
        game?.vfx?.triggerCinematicCutIn?.(this, this.trueUltName, '#67e8f9');
        game?.vfx?.spawnDamageText?.(
          this.x,
          this.y - 172,
          0,
          true,
          'ETERNAL BOREALIS: POLAR NIGHT!',
          '#67e8f9'
        );
        this.fx?.spawn(
          'absoluteZeroAuroraVeil',
          this._safeFxX(this._trueUltCoffinX, game),
          this._safeFxY(this.groundY - 6),
          { light: 1.26 }
        );
      }
      return;
    }

    // Act II & Act III (`1.12..3.28s`): 0.00 K Diamond-Lotus Sarcophagus & Sovereign Scepter-Tap Windup
    if (t >= 1.12 && this._trueUltStep < 2) {
      this._trueUltStep = 2;
      game?.audio?.play?.('frost_cast', this._trueUltCoffinX);
      game?.audio?.play?.('prism_beam', this._trueUltCoffinX);
      game?.vfx?.spawnDamageText?.(
        this._trueUltCoffinX,
        this.groundY - 248,
        0,
        true,
        'DIAMOND-LOTUS MONOLITH - 0.00 K!',
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
        '-273.15 C / REALITY FREEZING!',
        '#e879f9'
      );
    }

    if (t >= 1.12 && t < 3.28) {
      this.y = this.groundY - 92 + Math.sin((t - 1.12) * 3.2) * 4;
      this.cameraAirLift = 112;

      if (t < 2.32) {
        const uCmd = (t - 1.12) / 1.20;
        this.trueUltFrameOverride = 129 + Math.min(7, Math.floor(uCmd * 8));
      } else {
        const uTap = (t - 2.32) / 0.96;
        this.trueUltFrameOverride = 137 + Math.min(6, Math.floor(uTap * 7));
      }
      this._overrideFrameIdx = this.trueUltFrameOverride;

      for (const foe of targets) {
        if (foe && !foe.isDead) {
          if (!foe.isColossalBoss) {
            foe.x += (this._trueUltCoffinX - foe.x) * Math.min(1, dt * 18);
            foe.vx = 0;
            foe.vy = 0;
          }
          foe.chronoTimeStopTimer = Math.max(foe.chronoTimeStopTimer || 0, 0.16);
        }
      }
      return;
    }

    // Act IV (`t >= 3.28s`): Sovereign Scepter-Tap Impact -> AGE OF PERMAFROST!
    if (t >= 3.28 && this._trueUltStep < 4) {
      this._trueUltStep = 4;
      this._trueUltShatterTimer = 1.28;

      const cx = this._trueUltCoffinX;
      const cy = this.groundY - 152;
      for (const s of this._trueUltGlassShards) {
        s.x = cx + Math.cos(s.angle) * 42;
        s.y = cy + Math.sin(s.angle) * 48;
      }
      if (advBounds) {
        for (let i = 0; i < this._trueUltDiamondDust.length; i++) {
          this._trueUltDiamondDust[i].x = cx - 520 + ((i * 97) % 1040);
          this._trueUltDiamondDust[i].y = 30 + ((i * 53) % 360);
        }
      }

      for (const foe of targets) {
        if (foe) foe.chronoTimeStopTimer = 0;
      }

      // Strictly trigger Glacial / Shogunate-Glacial Stage Domain Synergy at t >= 3.28s!
      game?.renderer?.triggerGlacialStage?.();
      game?.renderer?.setStageTransformation?.('glacial', 1.0, true, 0);
      if (!advBounds) {
        const finalStg = game?.renderer?.permanentStageOverride || 'glacial';
        game?.renderer?.triggerStageEvent?.(
          finalStg === 'shogunate_glacial' ? 'FROZEN SAKURA SHOGUNATE' : 'PERMAFROST AURORA SANCTUM',
          finalStg === 'shogunate_glacial'
            ? 'BOREALIS RIME-ICE ENCASES THE SHOGUNATE CASTLE'
            : 'ABSOLUTE ZERO CRYSTALLIZES THE ARENA',
          '#67e8f9',
          7.5
        );
      }

      game?.renderer?.triggerImpactFrame?.(cx, this.groundY - 120, 0.06, 'glacial');
      game?.renderer?.triggerShake?.(28, 0.72);
      game?.renderer?.triggerAberration?.(18);
      game?.renderer?.triggerHitStop?.(0.095);

      game?.audio?.play?.('ice_shatter', cx);
      game?.audio?.play?.('time_shatter', cx);
      game?.audio?.play?.('supernova_detonate', cx);
      game?.audio?.play?.('prism_beam', cx);

      this.heal(Math.round(this.maxHp * 0.12), 'BOREALIS SOVEREIGNTY');

      this.fx?.spawn('diamondDustCataclysmNova', this._safeFxX(cx, game), this._safeFxY(this.groundY - 156), {
        light: 1.42
      });
      this.spawnPixelFrostRing(cx, this.groundY - 136, 280, '#67e8f9', 0.52, false, true);
      this.fx?.burst(this._safeFxX(cx, game), this._safeFxY(this.groundY - 136), {
        count: 20,
        speedMin: 95,
        speedMax: 300,
        lifeMin: 0.24,
        lifeMax: 0.48,
        gravity: 80,
        colors: ['#ffffff', '#cffafe', '#67e8f9', '#38bdf8', '#e879f9']
      });
      game?.vfx?.spawnGlyphBurst?.(cx, this.groundY - 136, 7, 'glacial');
      game?.vfx?.spawnDamageText?.(
        cx,
        this.groundY - 284,
        0,
        true,
        'AGE OF PERMAFROST!',
        '#f0f9ff'
      );

      for (const foe of targets) {
        if (foe && !foe.isDead) {
          foe.chronoTimeStopTimer = 0;
          foe.brittleStacks = 0;
          foe.takeDamage(675, this, true, 320, -250);
        }
      }
    }

    const descU = Math.min(1, Math.max(0, (t - 3.28) / Math.max(0.01, this.trueUltDuration - 3.28)));
    const smoothDesc = descU * descU * (3 - 2 * descU);
    this.y = this.groundY - 92 * (1 - smoothDesc);
    this.cameraAirLift = 112 * (1 - smoothDesc);
    this.trueUltFrameOverride = 144 + Math.min(5, Math.floor(descU * 6));
    this._overrideFrameIdx = this.trueUltFrameOverride;

    if (t >= this.trueUltDuration) {
      this.y = this.groundY;
      this.vy = 0;
      this.cameraAirLift = 0;
      this.isInvulnerable = false;
      this.unstoppablePoise = false;
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      if (enemy) enemy.chronoTimeStopTimer = 0;
      this.setState('IDLE');
    }
  }

  updateConstructsAndVfx(dt, enemy, game) {
    if (this._comboPersistTimer > 0 && this.state !== 'AUTO_ATTACK') {
      this._comboPersistTimer = Math.max(0, this._comboPersistTimer - dt);
      if (this._comboPersistTimer <= 0) {
        this.comboStep = 0;
      }
    }

    if (this._trueUltShatterTimer > 0) {
      this._trueUltShatterTimer = Math.max(0, this._trueUltShatterTimer - dt);
      for (const s of this._trueUltGlassShards) {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vy += 420 * dt;
        s.angle += s.vAngle * dt;
      }
      for (const d of this._trueUltDiamondDust) {
        d.x += d.vx * dt;
        d.y += d.vy * dt;
      }
    }

    // Returning 6-Bladed Snowflake Boomerang Chakrams (Row 1)
    for (let i = this.activeChakrams.length - 1; i >= 0; i--) {
      const ch = this.activeChakrams[i];
      ch.age += dt;
      const u = Math.min(1, ch.age / ch.maxLife);
      if (u <= 0.5) {
        const uOut = u * 2;
        const ease = 1 - Math.pow(1 - uOut, 2);
        ch.x = ch.startX + (ch.apexX - ch.startX) * ease;
        ch.y = ch.startY + (ch.apexY - ch.startY) * ease - Math.sin(uOut * Math.PI) * 28;
        if (!ch.hitOut && enemy && !enemy.isDead && Math.abs(enemy.x - ch.x) <= 72) {
          ch.hitOut = true;
          enemy.takeDamage(16, this, false, 18, 0);
          this.applyBrittleFrost(enemy, game, 1);
        }
      } else {
        const uBack = (u - 0.5) * 2;
        ch.x = ch.apexX + (this.x - ch.apexX) * uBack;
        ch.y = ch.apexY + (this.y - 88 - ch.apexY) * uBack + Math.sin(uBack * Math.PI) * 22;
        if (!ch.hitBack && enemy && !enemy.isDead && Math.abs(enemy.x - ch.x) <= 72) {
          ch.hitBack = true;
          enemy.takeDamage(14, this, false, -14, 0);
        }
        if (!ch.caught && uBack >= 0.88) {
          ch.caught = true;
          this.heal(7, 'CHAKRAM RETURN');
        }
      }
      if (ch.age >= ch.maxLife) {
        this.activeChakrams.splice(i, 1);
      }
    }

    // Ground-Marching Glacier Stalagmite Spires (Row 2)
    for (let i = this.activeMarchingSpires.length - 1; i >= 0; i--) {
      const sp = this.activeMarchingSpires[i];
      if (sp.delay > 0) {
        sp.delay -= dt;
        continue;
      }
      if (!sp.erupted) {
        sp.erupted = true;
        this.fx?.spawn('glacierStalagmiteErupt', this._safeFxX(sp.x, game), this._safeFxY(sp.y - 4), {
          light: 1.18
        });
        if (enemy && !enemy.isDead && Math.abs(enemy.x - sp.x) <= 68) {
          enemy.takeDamage(15, this, false, 12, -58);
          this.applyBrittleFrost(enemy, game, 1);
        }
      }
      sp.age += dt;
      if (sp.age >= sp.maxLife) {
        this.activeMarchingSpires.splice(i, 1);
      }
    }

    // Diagonal Borealis Sky-Icicle Lances
    for (let i = this.activeSkyIcicles.length - 1; i >= 0; i--) {
      const ic = this.activeSkyIcicles[i];
      if (ic.delay > 0) {
        ic.delay -= dt;
        continue;
      }
      ic.age += dt;
      const u = Math.min(1, ic.age / ic.flightDur);
      ic.x = ic.x0 + (ic.tx - ic.x0) * u;
      ic.y = ic.y0 + (ic.ty - ic.y0) * u;
      if (u >= 1 && !ic.impacted) {
        ic.impacted = true;
        if (enemy && !enemy.isDead && Math.abs(enemy.x - ic.tx) <= 78) {
          enemy.takeDamage(14, this, false, 16, -24);
          this.applyBrittleFrost(enemy, game, 1);
        }
        this.spawnVfxAnim(7, ic.tx, this.groundY - 28, 128, 128, 0.22, { foreground: true });
        this.activeSkyIcicles.splice(i, 1);
      }
    }

    // Permafrost Rink Zones, Crystal Prisons, Sky Steps, Ice Wall, Ice Decoy
    for (let i = this.permafrostZones.length - 1; i >= 0; i--) {
      this.permafrostZones[i].life += dt;
      if (this.permafrostZones[i].life >= this.permafrostZones[i].maxLife) {
        this.permafrostZones.splice(i, 1);
      }
    }
    for (let i = this.activeCrystalPrisons.length - 1; i >= 0; i--) {
      const pr = this.activeCrystalPrisons[i];
      pr.life += dt;
      if (pr.target && !pr.target.isDead) {
        pr.x = pr.target.x;
        pr.y = pr.target.y;
      }
      if (pr.life >= pr.maxLife) {
        this.activeCrystalPrisons.splice(i, 1);
      }
    }
    for (let i = this.skyIceSteps.length - 1; i >= 0; i--) {
      this.skyIceSteps[i].life += dt;
      if (this.skyIceSteps[i].life >= this.skyIceSteps[i].maxLife) {
        this.skyIceSteps.splice(i, 1);
      }
    }
    for (let i = this.activeFrostRings.length - 1; i >= 0; i--) {
      this.activeFrostRings[i].life += dt;
      if (this.activeFrostRings[i].life >= this.activeFrostRings[i].maxLife) {
        this.activeFrostRings.splice(i, 1);
      }
    }
    if (this.iceWall) {
      this.iceWall.life += dt;
      if (this.iceWall.life >= this.iceWall.maxLife) this.iceWall = null;
    }
    if (this.iceDecoy) {
      this.iceDecoy.life += dt;
      if (
        !this.iceDecoy.shattered &&
        enemy &&
        !enemy.isDead &&
        Math.abs(enemy.x - this.iceDecoy.x) <= 74
      ) {
        this.iceDecoy.shattered = true;
        enemy.takeDamage(28, this, true, 48, -42);
        this.applyBrittleFrost(enemy, game, 1);
        this.spawnPixelFrostRing(this.iceDecoy.x, this.iceDecoy.y - 84, 108, '#67e8f9', 0.28, false, true);
        this.iceDecoy = null;
      } else if (this.iceDecoy && this.iceDecoy.life >= this.iceDecoy.maxLife) {
        this.iceDecoy = null;
      }
    }

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
    for (let i = this.razorScars.length - 1; i >= 0; i--) {
      this.razorScars[i].age += dt;
      if (this.razorScars[i].age >= this.razorScars[i].maxLife) {
        this.razorScars.splice(i, 1);
      }
    }
  }

  update(dt, enemy, game) {
    this.game = game || this.game;
    this._currentEnemy = enemy;
    this.fx?.update(dt);
    if (this.crouchCooldown > 0) this.crouchCooldown = Math.max(0, this.crouchCooldown - dt);
    if (this.vaultCooldown > 0) this.vaultCooldown = Math.max(0, this.vaultCooldown - dt);
    if (this.wallFlipCooldown > 0) this.wallFlipCooldown = Math.max(0, this.wallFlipCooldown - dt);

    if (enemy && enemy.brittleStacks > 0 && enemy.brittleDecayTimer > 0) {
      enemy.brittleDecayTimer = Math.max(0, enemy.brittleDecayTimer - dt);
      if (enemy.brittleDecayTimer <= 0) {
        enemy.brittleStacks = 0;
      }
    }

    this.updateConstructsAndVfx(dt, enemy, game);

    if (this.state === 'CROUCH' && !this.isDead && (this.stunTimer || 0) <= 0) {
      this.stateTimer += dt;
      this.updateCrouch(dt, enemy, game);
      return;
    }

    if (
      !this.isDead &&
      !this.isPlayerControlled &&
      enemy &&
      !enemy.isDead &&
      (this.state === 'IDLE' || this.state === 'WALK') &&
      (this.finisherGauge || 0) < (this.maxFinisherGauge || 100)
    ) {
      if (this.crouchCooldown <= 0 && game?.vfx?.projectiles) {
        for (const p of game.vfx.projectiles) {
          if (
            p.owner !== this &&
            Math.abs(p.x - this.x) < 225 &&
            Math.sign(p.vx) === Math.sign(this.x - p.x)
          ) {
            this.startCrouch(enemy, game);
            return;
          }
        }
      }
    }

    super.update(dt, enemy, game);
  }

  /**
   * Renders any cell `(row, col)` from `icemage_ex_vfx.png` (`6240x1664`) with crisp Selout + modest bloom (`<= 0.12`).
   * Zero `ctx.rotate`, zero `ctx.ellipse`!
   */
  drawBloomedVfxRect(ctx, vfxSheet, rowIdx, colIdx, x, y, w, h, fade = 1.0, renderer = null, flipX = false) {
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth || fade <= 0.01) return;
    const c = Math.max(0, Math.min(29, Math.floor(colIdx)));
    const r = Math.max(0, Math.min(7, Math.floor(rowIdx)));
    const drawW = Math.max(8, Math.round(w / 4) * 4);
    const drawH = Math.max(8, Math.round(h / 4) * 4);
    const halfW = Math.round(-drawW * 0.5);
    const halfH = Math.round(-drawH * 0.5);
    const gx = Math.round(x / 2) * 2;
    const gy = Math.round(y / 2) * 2;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(gx, gy);
    if (flipX) ctx.scale(-1, 1);

    if (renderer?.glowGlacial || renderer?.glowCyan) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(0.12, fade * 0.10);
      const glowImg = renderer.glowGlacial || renderer.glowCyan;
      ctx.drawImage(glowImg, -drawW * 0.56, -drawH * 0.56, drawW * 1.12, drawH * 1.12);
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(1, fade * 0.97);
    ctx.drawImage(vfxSheet, c * 208, r * 208, 208, 208, halfW, halfH, drawW, drawH);

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(0.12, fade * 0.10);
    ctx.drawImage(vfxSheet, c * 208, r * 208, 208, 208, halfW, halfH, drawW, drawH);
    ctx.restore();
  }

  drawTrueUltPolarNightBackground(ctx, renderer = null) {
    const inTrueUlt = this.state === 'TRUE_ULTIMATE';
    if (!inTrueUlt && this._trueUltShatterTimer <= 0) return;

    const t = inTrueUlt ? this.stateTimer : 3.35;
    const dur = this.trueUltDuration || 4.60;
    const fadeIn = inTrueUlt ? Math.min(1, t / 0.30) : 1;
    const fadeOut = inTrueUlt
      ? Math.min(1, Math.max(0, (dur - t) / 0.42))
      : Math.min(1, this._trueUltShatterTimer / 0.45);
    const fade = fadeIn * fadeOut;
    if (fade <= 0.01) return;

    const ww = renderer?.worldWidth || 1200;
    const gy = this.groundY;
    const vfxSheet = PixelForge.ensureImage(this.getExSprites()?.vfx);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const skyGrad = ctx.createLinearGradient(0, -520, 0, gy + 80);
    skyGrad.addColorStop(0, `rgba(14, 42, 78, ${(0.18 * fade).toFixed(3)})`);
    skyGrad.addColorStop(0.55, `rgba(56, 189, 248, ${(0.10 * fade).toFixed(3)})`);
    skyGrad.addColorStop(1, `rgba(186, 230, 253, ${(0.04 * fade).toFixed(3)})`);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(-2400, -1600, ww + 4800, gy + 2800);

    const ribbons = [
      { baseY: 30, amp: 24, freq: 0.009, speed: 2.1, h: 76, colTop: '#34d399', colBot: '#67e8f9', alpha: 0.22 },
      { baseY: 74, amp: 28, freq: 0.012, speed: -1.7, h: 84, colTop: '#c084fc', colBot: '#38bdf8', alpha: 0.20 },
      { baseY: 116, amp: 20, freq: 0.015, speed: 2.5, h: 66, colTop: '#67e8f9', colBot: '#e879f9', alpha: 0.18 }
    ];
    const ribbonMinX = -360;
    const ribbonMaxX = ww + 360;
    for (const rb of ribbons) {
      for (let x = ribbonMinX; x <= ribbonMaxX; x += 12) {
        const edgeDist = Math.min(x - ribbonMinX, ribbonMaxX - x);
        const edgeTaper = Math.max(0, Math.min(1, edgeDist / 220));
        if (edgeTaper <= 0.01) continue;
        const wave =
          Math.sin(x * rb.freq + t * rb.speed) * rb.amp +
          Math.cos(x * rb.freq * 1.9 - t * rb.speed * 0.8) * (rb.amp * 0.45);
        const pulse = 0.65 + 0.35 * Math.sin(x * 0.035 + t * 4.2);
        const ry = Math.round((rb.baseY + wave) / 4) * 4;
        const rh = Math.round((rb.h * pulse) / 4) * 4;
        ctx.globalAlpha = fade * rb.alpha * pulse * edgeTaper;
        ctx.fillStyle = rb.colTop;
        ctx.fillRect(x, ry, 10, Math.max(8, Math.round(rh * 0.48)));
        ctx.fillStyle = rb.colBot;
        ctx.fillRect(x, ry + Math.round(rh * 0.42), 10, Math.max(8, Math.round(rh * 0.58)));
      }
    }

    if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      const col = Math.floor(t * 24) % 30;
      const coffinX = Math.round((this._trueUltCoffinX || 600) / 4) * 4;
      this.drawBloomedVfxRect(ctx, vfxSheet, 5, col, coffinX, gy - 274, 368, 368, fade * 0.88, renderer);
    }

    ctx.restore();
  }

  drawPixelRazorScars(ctx) {
    if (!this.razorScars.length) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < this.razorScars.length; i++) {
      const s = this.razorScars[i];
      const u = Math.min(1, s.age / s.maxLife);
      const fade = u < 0.15 ? 1.0 : Math.max(0, 1 - (u - 0.15) / 0.85);
      if (fade <= 0.02) continue;

      const dx = s.x1 - s.x0;
      const dy = s.y1 - s.y0;
      const steps = Math.max(12, Math.round(Math.max(Math.abs(dx), Math.abs(dy)) / 4));
      ctx.globalAlpha = Math.min(1, fade * 0.96);

      for (let k = 0; k <= steps; k++) {
        const su = k / steps;
        const taper = Math.sin(su * Math.PI);
        if (taper <= 0.08) continue;
        const px = Math.round((s.x0 + dx * su) / 2) * 2;
        const py = Math.round((s.y0 + dy * su) / 2) * 2;
        const rad = Math.max(2, Math.round(taper * 6) * 2);

        ctx.fillStyle = s.isAurora ? '#6b21a8' : '#1e3a8a';
        ctx.fillRect(px - rad, py - rad, rad * 2, rad * 2);
        const mid = Math.max(2, rad - 2);
        ctx.fillStyle = s.isAurora ? '#e879f9' : '#38bdf8';
        ctx.fillRect(px - mid, py - mid, mid * 2, mid * 2);
        if (taper > 0.35) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(px - 2, py - 2, 4, 4);
        }
      }
    }
    ctx.restore();
  }

  drawForegroundOverlay(ctx, renderer = null) {
    this.drawTrueUltPolarNightBackground(ctx, renderer);

    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    if (this.fx && !this.isDead) {
      this.fx.renderLayer(ctx, 'back', arenaCenterX, this.groundY, 0.96);
    }

    const sprites = this.getExSprites();
    const sheet = PixelForge.ensureImage(sprites?.sheet);
    const vfxSheet = PixelForge.ensureImage(sprites?.vfx);

    if (this.afterimages.length > 0 && sheet && sheet.complete && sheet.naturalWidth) {
      for (let i = 0; i < this.afterimages.length; i++) {
        const img = this.afterimages[i];
        const alpha = Math.max(0, (1 - img.age / img.maxLife) * 0.56);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(Math.round(img.x / 2) * 2, Math.round((img.y + 4) / 2) * 2);
        ctx.scale(img.facing, 1);
        ctx.globalAlpha = alpha;
        PixelForge.drawSilhouetteFrame(
          ctx,
          sprites,
          img.frameIdx,
          208,
          208,
          img.tint === 'aurora' ? '#e879f9' : '#67e8f9'
        );
        ctx.restore();
      }
    }

    if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      for (const z of this.permafrostZones) {
        const fade = Math.min(1, (z.maxLife - z.life) * 1.5) * Math.min(1, z.life / 0.15);
        const col = Math.floor(z.life * 20) % 30;
        this.drawBloomedVfxRect(ctx, vfxSheet, 3, col, z.x, z.y - 8, z.radius * 1.8, 72, fade * 0.88, renderer);
      }

      for (const st of this.skyIceSteps) {
        const fade = Math.min(1, (st.maxLife - st.life) * 2.2) * Math.min(1, st.life / 0.08);
        const col = Math.floor(st.life * 24) % 30;
        this.drawBloomedVfxRect(ctx, vfxSheet, 3, col, st.x, st.y + 4, 84, 32, fade * 0.84, renderer);
      }

      for (const sp of this.activeMarchingSpires) {
        if (!sp.erupted) continue;
        const u = Math.min(1, sp.age / sp.maxLife);
        const col = Math.min(29, Math.floor(u * 30));
        const fade = u > 0.78 ? (1 - u) / 0.22 : 1.0;
        this.drawBloomedVfxRect(ctx, vfxSheet, 2, col, sp.x, sp.y - 68, 152, 152, fade * 0.94, renderer);
      }

      if (this.iceWall) {
        const fade = Math.min(1, (this.iceWall.maxLife - this.iceWall.life) * 2.0);
        const col = Math.min(22, 6 + (Math.floor(this.iceWall.life * 18) % 14));
        this.drawBloomedVfxRect(
          ctx,
          vfxSheet,
          2,
          col,
          this.iceWall.x,
          this.iceWall.y - 76,
          164,
          164,
          fade * 0.94,
          renderer,
          this.iceWall.facing < 0
        );
      }

      if (this.iceDecoy) {
        const fade = Math.min(1, (this.iceDecoy.maxLife - this.iceDecoy.life) * 2.0);
        this.drawBloomedVfxRect(ctx, vfxSheet, 6, 12, this.iceDecoy.x, this.iceDecoy.y - 88, 176, 188, fade * 0.88, renderer);
      }

      for (const v of this.activeVfxAnims) {
        if (v.foreground) continue;
        const u = Math.min(1, Math.max(0, v.age / v.maxLife));
        const span = Math.max(1, v.endFrame - v.startFrame + 1);
        const col = Math.min(29, v.startFrame + Math.floor(u * span));
        const fade = u < 0.12 ? u / 0.12 : u > 0.78 ? (1 - u) / 0.22 : 1.0;
        this.drawBloomedVfxRect(ctx, vfxSheet, v.row, col, v.x, v.y, v.w, v.h, fade * 0.92, renderer, v.flipX);
      }
    }
  }

  drawUltimateForeground(ctx, renderer = null) {
    const sprites = this.getExSprites();
    const vfxSheet = PixelForge.ensureImage(sprites?.vfx);

    if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      // Returning Snowflake Boomerang Chakrams (Row 1)
      for (const ch of this.activeChakrams) {
        const col = Math.floor(ch.age * 36) % 30;
        this.drawBloomedVfxRect(ctx, vfxSheet, 1, col, ch.x, ch.y, 136, 136, 0.96, renderer);
      }

      // Diagonal Borealis Sky-Icicle Lances (Row 4)
      for (const ic of this.activeSkyIcicles) {
        if (ic.delay > 0) continue;
        this.drawBloomedVfxRect(ctx, vfxSheet, 4, 14, ic.x, ic.y, 112, 136, 0.94, renderer, this.facing < 0);
      }

      // 4-Stack Solid Crystal Freeze Sarcophagus (Row 6)
      for (const pr of this.activeCrystalPrisons) {
        const u = Math.min(1, pr.life / pr.maxLife);
        const col = Math.min(29, Math.floor(u * 30));
        const fade = u > 0.75 ? (1 - u) / 0.25 : 0.92;
        this.drawBloomedVfxRect(ctx, vfxSheet, 6, col, pr.x, pr.y - 92, 196, 204, fade, renderer);
      }

      // Skill: Flanking Twin Glacier Iceberg Jaws (Row 2)
      if (this.glacierJaws && this.glacierJaws.fade > 0.02) {
        const gj = this.glacierJaws;
        const col = gj.slammed ? 24 : 12;
        this.drawBloomedVfxRect(
          ctx,
          vfxSheet,
          2,
          col,
          gj.centerX - gj.span,
          this.groundY - 92,
          196,
          196,
          gj.fade * 0.96,
          renderer,
          false
        );
        this.drawBloomedVfxRect(
          ctx,
          vfxSheet,
          2,
          col,
          gj.centerX + gj.span,
          this.groundY - 92,
          196,
          196,
          gj.fade * 0.96,
          renderer,
          true
        );
      }

      // Overdrive: 7 Celestial Coronation Ice-Claymores (Row 4)
      if (this.coronationDomain) {
        const cd = this.coronationDomain;
        for (const sw of cd.swords) {
          this.drawBloomedVfxRect(ctx, vfxSheet, 4, 16, sw.x, sw.y, 148, 176, 0.95, renderer);
        }
        if (cd.crownDropped) {
          this.drawBloomedVfxRect(ctx, vfxSheet, 4, 18, cd.centerX, cd.crownY, 212, 236, 0.98, renderer);
        }
      }

      // Active Frost Starburst Rings (Row 7)
      for (const fr of this.activeFrostRings) {
        const u = Math.min(1, fr.life / fr.maxLife);
        const col = Math.min(29, Math.floor(u * 30));
        const fade = 1 - u;
        this.drawBloomedVfxRect(ctx, vfxSheet, 7, col, fr.x, fr.y, fr.maxRadius * 1.6, fr.maxRadius * 1.6, fade * 0.94, renderer);
      }

      for (const v of this.activeVfxAnims) {
        if (!v.foreground) continue;
        const u = Math.min(1, Math.max(0, v.age / v.maxLife));
        const span = Math.max(1, v.endFrame - v.startFrame + 1);
        const col = Math.min(29, v.startFrame + Math.floor(u * span));
        const fade = u < 0.12 ? u / 0.12 : u > 0.78 ? (1 - u) / 0.22 : 1.0;
        this.drawBloomedVfxRect(ctx, vfxSheet, v.row, col, v.x, v.y, v.w, v.h, fade * 0.96, renderer, v.flipX);
      }

      // Supreme Ultimate Act II & III: Diamond-Lotus Monolith (Row 6) + Thermodynamic Readout
      if (this.state === 'TRUE_ULTIMATE' && this.stateTimer >= 1.12 && this.stateTimer < 3.28) {
        const t = this.stateTimer;
        const coffinX = Math.round(this._trueUltCoffinX);
        const coffinY = Math.round(this.groundY - 126);
        const monoCol = Math.min(24, Math.floor(((t - 1.12) / 2.16) * 24));
        this.drawBloomedVfxRect(ctx, vfxSheet, 6, monoCol, coffinX, coffinY, 264, 288, 0.94, renderer);

        if (t >= 2.32) {
          const crackProgress = Math.min(1, (t - 2.32) / 0.88);
          ctx.save();
          for (const cr of this._trueUltCracks) {
            if (crackProgress < cr.threshold) continue;
            const localAlpha = Math.min(1, (crackProgress - cr.threshold) * 4.0);
            for (const seg of cr.segs) {
              ctx.strokeStyle = cr.magenta ? '#e879f9' : '#38bdf8';
              ctx.lineWidth = 4;
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
        }

        const tempProgress = Math.min(1, Math.max(0, (t - 1.12) / 1.24));
        const easedTemp = 1 - Math.pow(1 - tempProgress, 2.4);
        const celsius = -18.0 - 255.15 * easedTemp;
        const kelvin = Math.max(0, 273.15 + celsius);
        const atZero = kelvin <= 0.05 || t >= 2.34;
        const label = atZero
          ? '0.00 K  /  -273.15 C  ABSOLUTE ZERO'
          : `${kelvin.toFixed(1)} K  /  ${celsius.toFixed(1)} C`;

        ctx.save();
        const hudY = Math.max(54, coffinY - 176);
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = atZero ? '#e879f9' : '#38bdf8';
        ctx.fillRect(coffinX - 116, hudY + 8, 232, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(coffinX - 58, hudY + 8, 116, 2);
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#0284c7';
        ctx.fillText(label, coffinX + 1, hudY + 2);
        ctx.fillStyle = atZero ? '#ffffff' : '#e0f2fe';
        ctx.fillText(label, coffinX, hudY + 1);
        ctx.restore();
      }

      // Supreme Ultimate Act IV (`_trueUltShatterTimer > 0`): 28 Pure-Math Glass Shards (ZERO ctx.rotate!)
      if (this._trueUltShatterTimer > 0) {
        const coffinX = Math.round(this._trueUltCoffinX);
        const coffinY = Math.round(this.groundY - 132);
        const uShatter = 1 - Math.max(0, Math.min(1, this._trueUltShatterTimer / 1.28));
        const row7Col = Math.min(29, Math.floor(uShatter * 30));
        const shatterFade = Math.min(1, this._trueUltShatterTimer / 0.34);

        this.drawBloomedVfxRect(ctx, vfxSheet, 7, row7Col, coffinX, coffinY, 432, 384, shatterFade * 0.96, renderer);

        ctx.save();
        ctx.globalAlpha = shatterFade * 0.94;
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

          ctx.fillStyle = s.fill;
          ctx.beginPath();
          ctx.moveTo(p0x, p0y);
          ctx.lineTo(p1x, p1y);
          ctx.lineTo(p2x, p2y);
          ctx.lineTo(p3x, p3y);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = s.facet;
          ctx.beginPath();
          ctx.moveTo(p0x, p0y);
          ctx.lineTo(p1x, p1y);
          ctx.lineTo(Math.round(s.x), Math.round(s.y));
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(p0x, p0y);
          ctx.lineTo(p2x, p2y);
          ctx.stroke();
        }
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

    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    if (this.fx && !this.isDead) {
      this.fx.renderLayer(ctx, 'front', arenaCenterX, this.groundY, 0.98);
    }

    this.drawPixelRazorScars(ctx);
  }

  draw(ctx, isReflection = false, renderer = null) {
    const sprites = this.getExSprites();
    if (!sprites) return;

    const vfxSheet = PixelForge.ensureImage(sprites.vfx);
    if (!isReflection && (this.state === 'TRUE_ULTIMATE' || this._trueUltShatterTimer > 0) && vfxSheet?.complete) {
      const col = Math.floor((this.stateTimer || 0) * 28) % 30;
      this.drawBloomedVfxRect(ctx, vfxSheet, 5, col, this.x, this.y - 104, 288, 288, 0.88, renderer);
      if (this.groundY - this.y > 12) {
        this.drawBloomedVfxRect(ctx, vfxSheet, 3, col, this.x, this.y + 8, 136, 48, 0.88, renderer);
      }
    }

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const w = 208;
    const h = 208;
    const groundPlantOffset = 4;
    ctx.translate(Math.round(this.x), Math.round(this.y + groundPlantOffset));
    ctx.scale(this.facing, 1);

    PixelForge.drawSheetFrame(ctx, sprites, this, w, h, this.walkPhase, isReflection, renderer);

    if (this.hitFlash > 0 && !isReflection) {
      const frameIdx = PixelForge.getFrameIndex(this, this.walkPhase);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.45;
      PixelForge.drawGhostFrame(ctx, sprites, frameIdx, w, h);
    }

    ctx.restore();
  }
}
