import { Fighter } from './Fighter.js?v=30fps114';
import { PixelForge } from '../engine/PixelForge.js?v=30fps114';
import { PixelFont } from '../engine/PixelFont.js?v=30fps114';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps114';
import {
  CHRONO_EFFECT_REGISTRY,
  CHRONO_TEAL_PALETTE,
  CHRONO_BRASS_PALETTE
} from '../engine/shaders/chronoShaders.js?v=30fps114';

const wrapPaddedPen = (pen) =>
  new Proxy(pen, {
    get(target, prop) {
      if (prop === 'shadeBox') {
        return (x0, y0, x1, y1, fn) => target.shadeBox(x0 - 3, y0 - 3, x1 + 3, y1 + 3, fn);
      }
      const val = target[prop];
      return typeof val === 'function' ? val.bind(target) : val;
    }
  });

const CHRONO_EX_EFFECT_REGISTRY = Object.fromEntries(
  Object.entries(CHRONO_EFFECT_REGISTRY).map(([key, spec]) => [
    key,
    {
      ...spec,
      create(cfg) {
        const inst = spec.create(cfg);
        return {
          ...inst,
          renderBack: inst.renderBack ? (pen) => inst.renderBack(wrapPaddedPen(pen)) : undefined,
          renderFront: inst.renderFront ? (pen) => inst.renderFront(wrapPaddedPen(pen)) : undefined
        };
      }
    }
  ])
);

const ROMAN_CLOCK_HOURS = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];

const AUTO_SLICES_EX = [
  [60, 8], // Beat 1 (V0, 0.36s): Coiled Minute-Glaive Diagonal Cleave -> snaps at F03 (63)
  [68, 7], // Beat 2 (V1, 0.34s): Reverse Twin-Blade X-Scissor + Cyan Paradox Clone -> snaps at F09 (69)
  [75, 8], // Beat 3 (V2, 0.38s): 2.5D Foreshortened XII-Dial Vortex Spin (2-hit) -> snaps at F17/F18 (77/78)
  [83, 7]  // Beat 4 (V3, 0.52s): Airborne Twelfth-Chime Guillotine Slam (3-hit + slow) -> snaps at F25 (85)
];

const BEAT_DURATIONS = [0.36, 0.34, 0.38, 0.52];
const INTRA_COMBO_LINK = 0.015;

/**
 * Chronos EX (`chronomancer_ex`) - Paradox Clock-Blade Sovereign.
 * Next-Gen Wide-Canvas (`320x240`, `anchorX=112, anchorY=230`) FFBE / Last Cloudia Hack-and-Slash Champion.
 * Dual-wields Twin Hands of Fate (Brass-Turquoise Minute-Glaive + Crimson-Gold Hour Short-Blade)
 * beneath a rotating XII Brass Escapement Clock-Wheel Halo.
 * Coexists 100% independently alongside classic Chronos (`chronomancer`).
 */
export class ChronomancerEx extends Fighter {
  constructor(x, groundY, facing = 1) {
    const opts = typeof x === 'object' && x !== null ? x : { x, groundY, facing };
    super({
      ...opts,
      name: opts.name || 'Chronos EX',
      maxHp: 3820,
      attackRange: 178,
      moveSpeed: 224,
      autoInterval: 0.92,
      lightColor: 'rgba(45, 212, 191, 1)',
      primaryColor: '#2dd4bf',
      hasTrueUltimate: true,
      trueUltName: 'ETERNAL ZERO: TWELFTH BELL',
      trueUltDuration: 4.55
    });

    this.heroId = 'chronomancer_ex';
    this.theme = 'chrono';
    this.secondaryColor = '#facc15';
    this.deathSfx = 'death_chrono';
    this.hasPoise = true;

    this.autoDuration = BEAT_DURATIONS[0];
    this._postFlurryInterval = 1.44;
    this.skillMaxCooldown = 4.58;
    this.skillCooldown = 1.25;
    this.skillDuration = 1.08;
    this.skillTriggerRange = 435;
    this.skillName = 'CHRONO-SCHISM REWIND';

    this.ultName = 'TRI-TIMELINE CONVERGENCE';
    this.ultSub = 'PAST & FUTURE PARADOX CROSS-SLASH';
    this.ultDuration = 1.68;

    this.hasTrueUltimate = true;
    this.trueUltName = 'ETERNAL ZERO: TWELFTH BELL';
    this.trueUltSub = 'STOPPED-TIME SIX-SPEAR MIDNIGHT SHATTER';
    this.trueUltDuration = 4.55;

    // 4-Beat FFBE / Last Cloudia Twin-Blade Combo State (zero `clock_gear` auto spam!)
    this.comboStep = 0;
    this._autoVariant = 0;
    this._currentAutoStage = 0;
    this._comboPersistTimer = 0;
    this._queuedNextBeat = false;
    this._intraLinkTimer = 0;
    this._beatHitMask = 0;
    this._beatStartX = this.x;
    this._beatTargetX = this.x;
    this._bootsPlanted = false;
    this._dragSparkAcc = 0;

    this.stepDustTimer = 0;
    this.chronoPhase = 0;
    this._overrideFrameIdx = null;

    // Temporal Afterimage / Paradox Clone, Pixel Razor Scars & Horological Field State
    this.phantomClones = [];
    this.temporalEchoes = [];
    this.rewindRibbons = [];
    this.activeVfxAnims = [];
    this.razorScars = [];

    // Skill: Past-Timeline Anchor & Time-Dilation Stasis Field
    this.anchorActive = false;
    this.anchorX = this.x;
    this.anchorY = this.groundY;
    this.anchorHp = this.maxHp;
    this._skillStage = 0;
    this.stasisField = null;

    // Overdrive (`ULTIMATE`): Tri-Timeline Convergence
    this._ultStage = 0;
    this._ultTargetX = this.x;
    this.triHorologium = null;

    // Supreme Ultimate (`TRUE_ULTIMATE`): Eternal Zero: Twelfth Bell
    this._trueUltInit = false;
    this._trueUltStage = 0;
    this._trueUltTickStage = 0;
    this._trueUltBarrageCount = 0;
    this._eternalStartFacing = this.facing;
    this.eternalTargetX = this.x;
    this.eternalTargetY = this.groundY;
    this.eternalZeroDome = null;
    this.suspendedClockSpears = [];
    this.shatterClockShards = [];
    this._frozenEnemiesRef = [];

    // Native 120Hz dual-buffer HD-2D Horological Shader & Particle Runtime
    this.fx = new ArcaneShaderFX(CHRONO_EX_EFFECT_REGISTRY, {
      pixelScale: 3,
      viewW: 540,
      viewH: 320
    });

    if (typeof Image !== 'undefined') {
      PixelForge.ensureHeroLoaded?.('chronomancer_ex');
      const chronoExAssets = PixelForge.initAssets()?.chronomancer_ex;
      if (chronoExAssets?.vfx?.src && !chronoExAssets.vfx.src.includes('v=30fps114')) {
        chronoExAssets.vfx.src = 'assets/sprites/chronomancer_ex_vfx.png?v=30fps114';
      }
    }

    this.dodgeMaxCooldown = 3.05;
    this.dashMaxCooldown = 2.95;
    this.isChronoWarp = false;
    this.didChronoWarp = false;
    this.warpOriginX = this.x;
    this.warpTargetX = this.x;
    this.warpPortalTimer = 0;
    this.wallFlipCooldown = 0;
    this.crouchCooldown = 0;
    this.crouchDuration = 0.90;
    this.isCrouching = false;
    this.isDeflecting = false;
    this.isFlipVault = false;
    this.flipStartX = this.x;
    this.flipTargetX = this.x;
    this.flipAngle = 0;
    this._deathBurstTriggered = false;
  }

  getAiStyleProfile() {
    return {
      comboGoal: 4,
      sweetMin: 108,
      sweetMax: 128,
      counterCrouchBias: 0.58,
      midLeapMin: 180,
      midLeapMax: 295,
      midLeapChance: 0.40,
      postStyle: 'chrono'
    };
  }

  isHackAndSlashMelee() {
    return true;
  }

  isCrossSlashDuelist() {
    return true;
  }

  getExSprites() {
    return typeof Image !== 'undefined' ? PixelForge.initAssets()?.chronomancer_ex : null;
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
      this._skillStage = 0;
    } else if (prevState === 'SKILL' && this.anchorActive) {
      this.anchorActive = false;
    }

    if (newState === 'ULTIMATE') {
      this._ultStage = 0;
      this.isInvulnerable = true;
    } else if (prevState === 'ULTIMATE') {
      this.triHorologium = null;
      if (newState !== 'TRUE_ULTIMATE') {
        this.isInvulnerable = false;
        this.y = this.groundY;
      }
    }

    if (newState === 'TRUE_ULTIMATE') {
      this._trueUltInit = false;
      this._trueUltStage = 0;
      this._trueUltTickStage = 0;
      this._trueUltBarrageCount = 0;
      this.isInvulnerable = true;
      this.unstoppablePoise = true;
    } else if (prevState === 'TRUE_ULTIMATE') {
      this._releaseAllTimeStoppedEnemies();
      this._trueUltInit = false;
      if (newState !== 'AUTO_ATTACK') {
        this.trueUltFrameOverride = null;
        this._overrideFrameIdx = null;
      }
      this.unstoppablePoise = false;
      this.isInvulnerable = false;
      this.eternalZeroDome = null;
      this.suspendedClockSpears = [];
      this.y = this.groundY;
    }

    if (newState === 'DEATH') {
      this._releaseAllTimeStoppedEnemies();
      this.fx?.clear();
      this.anchorActive = false;
      this.stasisField = null;
      this.triHorologium = null;
      this.eternalZeroDome = null;
      this.suspendedClockSpears = [];
      this.razorScars.length = 0;
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      this.unstoppablePoise = false;
    }
  }

  _releaseAllTimeStoppedEnemies() {
    if (!this._frozenEnemiesRef || this._frozenEnemiesRef.length === 0) return;
    for (const foe of this._frozenEnemiesRef) {
      if (!foe) continue;
      foe.chronoTimeStopTimer = 0;
      foe._timeStopLockX = null;
      foe._timeStopLockY = null;
      foe.chronoTimeStopFrame = null;
    }
    this._frozenEnemiesRef = [];
  }

  clampArenaX(x, game, margin = 90) {
    if (game?.adventure?.active && game.adventure.lockActive) {
      const lMin = (game.adventure.lockMinX || 80) + 28;
      const bossAlive = Boolean(
        game?.adventure?.bossEntity &&
          !game.adventure.bossEntity.isDead &&
          game.adventure.bossEntity.isColossalBoss
      );
      const rawMax = Math.max(lMin + 40, (game.adventure.lockMaxX || 9520) - 28);
      const lMax = bossAlive
        ? Math.min(rawMax, (game.adventure.bossEntity.anchorX || 9335) - 92)
        : rawMax;
      return Math.max(lMin, Math.min(lMax, x));
    }
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    return Math.max(margin, Math.min(ww - margin, x));
  }

  getActiveEnemies(enemy, game) {
    const list = game?.getEnemiesOf ? game.getEnemiesOf(this) : enemy ? [enemy] : [];
    const seen = new Set();
    const out = [];
    const pushFoe = (f) => {
      if (!f || f === this || f.isDead || f.isBenched || seen.has(f)) return;
      seen.add(f);
      out.push(f);
    };
    pushFoe(enemy);
    for (let i = 0; i < list.length; i++) pushFoe(list[i]);
    if (game?.adventure?.active) {
      if (Array.isArray(game.adventure.enemies)) {
        for (let i = 0; i < game.adventure.enemies.length; i++) pushFoe(game.adventure.enemies[i]);
      }
      if (game.adventure.bossEntity) pushFoe(game.adventure.bossEntity);
    }
    return out;
  }

  ensureAstrolabeAura() {
    if (!this.fx || this.isDead) return;
    if (!this.fx.active.some((s) => s.key === 'chronoAstrolabeAura')) {
      this.fx.spawn('chronoAstrolabeAura', this.x, this.y - 102, {
        follow: this,
        offsetX: 0,
        offsetY: -102,
        flip: this.facing < 0,
        palette: CHRONO_TEAL_PALETTE,
        light: 1.18
      });
    }
  }

  /**
   * Initializes one beat (`0..3`) of Chronos EX's 4-beat FFBE / Last Cloudia Twin-Blade chain
   * without returning to `IDLE`, computing grounded pre-snap lunge into the `108..116px` smear belly!
   */
  _beginComboBeat(beatIdx, game) {
    const v = ((beatIdx % 4) + 4) % 4;
    this._autoVariant = v;
    this._currentAutoStage = v;
    this.comboStep = (v + 1) % 4;
    this.autoDuration = BEAT_DURATIONS[v];
    this.stateTimer = 0;
    this._intraLinkTimer = 0;
    this._beatHitMask = 0;
    this.didActionFrame = false;
    this._queuedNextBeat = false;
    this._bootsPlanted = false;
    this._dragSparkAcc = 0;
    this._comboPersistTimer = 0.72;
    this.unstoppablePoise = v >= 2;

    const startFrame = AUTO_SLICES_EX[v][0];
    this.trueUltFrameOverride = startFrame;
    this._overrideFrameIdx = startFrame;

    const enemy = this._currentEnemy || null;
    if (enemy && !enemy.isDead && !enemy.isDummyFocal) {
      this.facing = enemy.x >= this.x ? 1 : -1;
    }

    this._beatStartX = this.x;
    let desiredX = this.x + this.facing * (v === 0 ? 18 : v === 2 ? 16 : 12);

    if (enemy && !enemy.isDead) {
      const sweetDist = v === 2 ? 106 : 112;
      const idealStandX = enemy.x - this.facing * sweetDist;
      const rawDelta = (idealStandX - this.x) * this.facing;
      const maxForward = v === 0 ? 108 : v === 2 ? 42 : 32;
      const clampedForward = Math.max(0, Math.min(maxForward, rawDelta));
      desiredX = this.x + this.facing * clampedForward;
    }

    this._beatTargetX = this.clampArenaX(desiredX, game, 80);
  }

  queueNextComboBeat() {
    this._queuedNextBeat = true;
  }

  spawnVfxAnim(row, x, y, w = 208, h = 208, maxLife = 0.34, opts = {}) {
    if (this.activeVfxAnims.length >= 24) this.activeVfxAnims.shift();
    this.activeVfxAnims.push({
      row,
      x,
      y,
      vx: opts.vx || 0,
      vy: opts.vy || 0,
      w,
      h,
      age: 0,
      maxLife,
      flipX: Boolean(opts.flipX),
      startFrame: opts.startFrame || 0,
      endFrame: opts.endFrame !== undefined ? opts.endFrame : 29,
      glowColor: opts.glowColor || 'teal',
      followOwner: Boolean(opts.followOwner),
      offsetX: opts.offsetX || 0,
      offsetY: opts.offsetY || 0,
      inFront: opts.inFront !== undefined ? Boolean(opts.inFront) : true
    });
  }

  spawnRazorScar(cx, cy, dx, dy, maxLife = 0.22, isGold = false) {
    if (this.razorScars.length >= 18) this.razorScars.shift();
    this.razorScars.push({
      x0: Math.round(cx - dx * 0.5),
      y0: Math.round(cy - dy * 0.5),
      x1: Math.round(cx + dx * 0.5),
      y1: Math.round(cy + dy * 0.5),
      age: 0,
      maxLife,
      isGold
    });
  }

  /**
   * Manifests a crisp HD-2D Temporal Paradox Clone (`variant`: `'future'` Cyan `#2dd4bf` or `'past'` Gold `#facc15`).
   * Rendered strictly with un-rotated wide-canvas sprite cells (`ZERO ctx.rotate`!).
   */
  spawnPhantomClone(x, y, facing, variant = 'future', opts = {}) {
    if (this.phantomClones.length >= 14) {
      this.phantomClones.shift();
    }
    const clone = {
      x: Math.round(x),
      y: Math.round(y),
      facing: facing >= 0 ? 1 : -1,
      variant: variant === 'past' ? 'past' : 'future',
      frameIdx: opts.frameIdx !== undefined ? opts.frameIdx : null,
      startFrame: opts.startFrame !== undefined ? opts.startFrame : 68,
      endFrame: opts.endFrame !== undefined ? opts.endFrame : 74,
      age: 0,
      maxLife: opts.maxLife || 0.42,
      holdUntilTimeStopEnd: Boolean(opts.holdUntilTimeStopEnd),
      romanTag: opts.romanTag || null,
      inFront: Boolean(opts.inFront)
    };
    this.phantomClones.push(clone);

    this.fx?.burst(clone.x, clone.y - 92, {
      count: 8,
      speedMin: 36,
      speedMax: 125,
      lifeMin: 0.14,
      lifeMax: 0.28,
      gravity: -18,
      colors:
        clone.variant === 'past'
          ? ['#ffffff', '#fef08a', '#facc15', '#d97706']
          : ['#ffffff', '#99f6e4', '#2dd4bf', '#14b8a6']
    });
    return clone;
  }

  spawnTemporalEcho(frameIdx) {
    if (this.temporalEchoes.length > 6) this.temporalEchoes.shift();
    this.temporalEchoes.push({
      x: this.x,
      y: this.y,
      facing: this.facing,
      frameIdx,
      life: 0,
      maxLife: 0.44
    });
  }

  spawnRewindRibbons(fromX, fromY) {
    for (let i = 0; i < 6; i++) {
      this.rewindRibbons.push({
        startX: fromX + (Math.random() - 0.5) * 38,
        startY: fromY + (Math.random() - 0.5) * 38,
        arcHeight: (i % 2 === 0 ? -1 : 1) * (36 + Math.random() * 44),
        life: -i * 0.03,
        maxLife: 0.44 + Math.random() * 0.1,
        sparkTimer: 0
      });
    }
  }

  _gatherMeleeTargets(primaryEnemy, game, reachFront = 216, reachBack = 42) {
    const targets = [];
    const seen = new Set();
    const isAdv = Boolean(game?.isAdventureMode?.() && game?.adventure?.active);
    const myGy = this.groundY || this.y;

    const consider = (foe) => {
      if (!foe || foe === this || foe.isDead || foe.isBenched || seen.has(foe)) return;
      const relX = (foe.x - this.x) * this.facing;
      const hitPad = foe.isColossalBoss ? 78 : 0;
      if (relX < -reachBack - hitPad || relX > reachFront + hitPad) return;
      if (isAdv && !foe.isColossalBoss) {
        const foeGy = foe.groundY || foe.y;
        if (Math.abs(foeGy - myGy) > 66) return;
      }
      seen.add(foe);
      targets.push(foe);
    };

    consider(primaryEnemy);
    const active = this.getActiveEnemies(primaryEnemy, game);
    for (let i = 0; i < active.length; i++) consider(active[i]);
    return targets;
  }

  /**
   * Applies crunchy FFBE / Last Cloudia hit-stop (`_hitStopTimer` 42-58ms), target `_hitShakeTimer`,
   * damage, optional temporal slow, and integer-stepped horological razor scars!
   */
  _applyChronoExStrike(primaryEnemy, game, cfg) {
    const {
      damage = 28,
      reachFront = 216,
      reachBack = 42,
      hitStop = 0.044,
      shakeDur = 0.056,
      knockX = 28,
      knockY = 0,
      isCrit = false,
      scarDx = 104,
      scarDy = 82,
      isGold = false,
      slowDur = 0,
      vfxRow = 4,
      sfx = 'slash'
    } = cfg;

    if (game?.audio) game.audio.play(sfx, this.x + this.facing * 80);
    this.didActionFrame = true;

    const targets = this._gatherMeleeTargets(primaryEnemy, game, reachFront, reachBack);
    let landedAny = false;

    for (let i = 0; i < targets.length; i++) {
      const foe = targets[i];
      const dmg = i === 0 ? damage : Math.max(10, Math.round(damage * 0.82));
      if (slowDur > 0) {
        foe.chronoSlowTimer = Math.max(foe.chronoSlowTimer || 0, slowDur);
      }
      foe.takeDamage(dmg, this, isCrit, knockX, knockY);
      if (!foe.isDead && !foe.isColossalBoss) {
        foe._hitStopTimer = Math.max(foe._hitStopTimer || 0, hitStop);
        foe._hitShakeTimer = Math.max(foe._hitShakeTimer || 0, shakeDur);
      } else if (!foe.isDead && foe.isColossalBoss) {
        foe._hitShakeTimer = Math.max(foe._hitShakeTimer || 0, shakeDur * 0.75);
      }

      const hitX = foe.x;
      const hitY = foe.y - (foe.isColossalBoss ? 128 : 92);
      this.spawnRazorScar(hitX, hitY, this.facing * scarDx, scarDy, 0.22, isGold);
      this.spawnVfxAnim(vfxRow, hitX, hitY, 188, 188, 0.24, {
        flipX: this.facing < 0,
        glowColor: isGold ? 'gold' : 'teal',
        inFront: true
      });
      this.fx?.burst(hitX, hitY, {
        count: isCrit ? 9 : 6,
        speedMin: 48,
        speedMax: 165,
        lifeMin: 0.12,
        lifeMax: 0.26,
        gravity: 40,
        colors: isGold
          ? ['#ffffff', '#fef08a', '#facc15', '#2dd4bf']
          : ['#ffffff', '#99f6e4', '#2dd4bf', '#facc15']
      });
      landedAny = true;
    }

    if (landedAny && hitStop > 0) {
      this._hitStopTimer = Math.max(this._hitStopTimer || 0, hitStop);
      game?.renderer?.triggerHitStop?.(hitStop * 0.65);
    }

    return landedAny;
  }

  onProjectileTrail(p) {
    if (!this.fx || p.type !== 'clock_gear') return;
    if ((p.ringTimer || 0) >= 0.045) {
      p.ringTimer = 0;
      this.fx.burst(p.x - Math.sign(p.vx || 1) * 14, p.y, {
        count: 3,
        speedMin: 26,
        speedMax: 78,
        lifeMin: 0.14,
        lifeMax: 0.26,
        gravity: -14,
        spread: 1.0,
        angle: Math.atan2(-(p.vy || 0), -(p.vx || 1)),
        colors: ['#ffffff', '#99f6e4', '#2dd4bf', '#facc15']
      });
    }
  }

  onProjectileHit(p, hitTarget, isCrit, game) {
    if (!this.fx) return false;
    const hx = hitTarget ? hitTarget.x : p.x;
    const hy = hitTarget ? hitTarget.y - 96 : p.y;
    const hitAngle = Math.atan2(p.vy || 0, p.vx || 1);
    this.fx.spawn('temporalCrescentRift', hx, hy, {
      flip: (p.vx || 1) < 0,
      palette: isCrit ? CHRONO_BRASS_PALETTE : CHRONO_TEAL_PALETTE,
      light: isCrit ? 1.34 : 1.2,
      extra: {
        aimAngle: hitAngle,
        isGold: isCrit,
        radius: isCrit ? 28 : 23,
        width: isCrit ? 11 : 8.5
      }
    });
    this.spawnVfxAnim(4, hx, hy, isCrit ? 200 : 172, isCrit ? 200 : 172, 0.28, {
      flipX: (p.vx || 1) < 0,
      glowColor: isCrit ? 'gold' : 'teal',
      inFront: true
    });
    game?.vfx?.spawnGlyphBurst?.(hx, hy, 5, 'chrono');
    return true;
  }

  takeDamage(amount, attacker, isCrit = false, knockX = 95, knockY = 0) {
    super.takeDamage(amount, attacker, isCrit, knockX, knockY);
    if (this.isDead && !this._deathBurstTriggered) {
      this._deathBurstTriggered = true;
      this._releaseAllTimeStoppedEnemies();
      this.fx?.stopByKey('chronoAstrolabeAura');
      this.fx?.spawn('warpPortalPairRift', this.x, this.groundY - 78, {
        palette: CHRONO_BRASS_PALETTE,
        light: 1.24,
        extra: { isArrival: true }
      });
      this.spawnVfxAnim(7, this.x, this.groundY - 82, 224, 224, 0.42, {
        glowColor: 'gold',
        inFront: true
      });
    }
  }

  // ============================================================================
  // AGILE CLOCK-BLADE & CLONE SKIRMISHER MOBILITY (`JUMP`, `CROUCH`, `DASH`, `DODGE`)
  // ============================================================================

  startJump(enemy, game, customDir = null) {
    this.dodgeCooldown = this.dodgeMaxCooldown * (0.86 + Math.random() * 0.26);
    this.setState('JUMP');
    this.isInvulnerable = true;
    this.isChronoWarp = false;
    this.isFlipVault = true;
    this.flipStartX = this.x;
    this.flipAngle = 0;
    this.wallFlipCooldown = 2.8;

    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    let dir = customDir !== null ? customDir : this.facing;
    if (this.x < 190) dir = 1;
    else if (this.x > ww - 190) dir = -1;

    if (enemy && !enemy.isDead) {
      const dist = Math.abs(enemy.x - this.x);
      if (dist < 210) {
        const crossSign = this.x < enemy.x ? 1 : -1;
        let target = enemy.x + crossSign * 124;
        if (target < 135 || target > ww - 135) {
          target = enemy.x - crossSign * 132;
        }
        this.flipTargetX = this.clampArenaX(target, game, 115);
      } else {
        const toEnemy = Math.sign(enemy.x - this.x) || this.facing;
        this.flipTargetX = this.clampArenaX(enemy.x - toEnemy * 116, game, 115);
      }
      this.dashDir = Math.sign(this.flipTargetX - this.flipStartX) || dir;
    } else {
      this.flipTargetX = this.clampArenaX(this.x + dir * 225, game, 115);
      this.dashDir = dir;
    }

    this.dashDuration = 0.56;
    this.vx = 0;
    this.vy = 0;
    this.spawnTemporalEcho(PixelForge.getFrameIndex(this, this.walkPhase));
    this.fx?.spawn('warpPortalPairRift', this.x, this.y - 88, {
      flip: this.facing < 0,
      palette: CHRONO_TEAL_PALETTE,
      light: 1.2,
      extra: { isArrival: false }
    });
    if (game?.audio) game.audio.play('time_rewind', this.x);
    game?.vfx?.spawnShockwave?.(this.x, this.groundY, 92, '#2dd4bf', 0.28, true);
    game?.vfx?.spawnGlyphBurst?.(this.x, this.y - 64, 6, 'chrono');
    game?.vfx?.spawnDamageText?.(this.x, this.y - 134, 0, false, 'TIME-GLIDE VAULT!', '#2dd4bf');
  }

  startCrouch(_enemy, game) {
    this.crouchCooldown = 3.1;
    this.crouchDuration = 0.90;
    this.setState('CROUCH');
    this.isCrouching = true;
    this.isDeflecting = true;
    this.vx = 0;
    this.fx?.spawn('warpPortalPairRift', this.x + this.facing * 36, this.y - 90, {
      follow: this,
      offsetX: 36,
      offsetY: -90,
      flip: this.facing < 0,
      palette: CHRONO_BRASS_PALETTE,
      light: 1.24,
      extra: { isArrival: true }
    });
    this.spawnVfxAnim(1, this.x + this.facing * 34, this.y - 88, 128, 128, 0.32, {
      followOwner: true,
      offsetX: 34,
      offsetY: -88,
      glowColor: 'gold',
      inFront: true
    });
    game?.vfx?.spawnShockwave?.(this.x, this.groundY - 2, 68, '#2dd4bf', 0.24, true);
    game?.vfx?.spawnDamageText?.(this.x, this.y - 124, 0, false, 'ESCAPEMENT PARRY!', '#facc15');
  }

  onStartDash(enemy, game, dir) {
    this.dashDuration = 0.36;
    this.isDeflecting = true;
    this.isChronoWarp = false;
    this.isFlipVault = false;
    this.flipAngle = 0;

    const advanceDir = enemy && !enemy.isDead ? Math.sign(enemy.x - this.x) || dir : dir;
    this.dashDir = advanceDir || this.facing;
    this.facing = this.dashDir;
    this.vx = this.dashDir * 560;
    this.spawnTemporalEcho(PixelForge.getFrameIndex(this, this.walkPhase));
    this.fx?.spawn('temporalCrescentRift', this.x, this.y - 94, {
      follow: this,
      offsetX: 16,
      offsetY: -94,
      flip: this.dashDir < 0,
      palette: CHRONO_TEAL_PALETTE,
      light: 1.22,
      extra: { isGold: false, radius: 24, width: 7 }
    });
    if (game?.audio) game.audio.play('time_rewind', this.x);
    game?.vfx?.spawnGlyphBurst?.(this.x, this.y - 88, 6, 'chrono');
    game?.vfx?.spawnDamageText?.(this.x, this.y - 142, 0, false, 'CHRONO BLADE SURGE!', '#2dd4bf');
  }

  onStartDodge(enemy, game, dir) {
    const incomingProj =
      game?.vfx?.projectiles?.some(
        (p) =>
          p.owner !== this &&
          Math.abs(p.x - this.x) < 215 &&
          Math.sign(p.vx) === Math.sign(this.x - p.x)
      ) || false;

    if (incomingProj && this.crouchCooldown <= 0) {
      this.startCrouch(enemy, game);
      return;
    }

    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const dist = enemy ? Math.abs(enemy.x - this.x) : 999;
    const nearWall = this.x < 245 || this.x > ww - 245;

    this.isDeflecting = false;
    this.isFlipVault = false;
    this.flipAngle = 0;
    this.spawnTemporalEcho(PixelForge.getFrameIndex(this, this.walkPhase));
    if (game?.audio) game.audio.play('time_rewind', this.x);

    if (enemy && !enemy.isDead && (dist < 195 || nearWall)) {
      this.isChronoWarp = true;
      this.didChronoWarp = false;
      this.dashDuration = 0.38;
      this.warpPortalTimer = 0.48;
      this.warpOriginX = this.x;
      this.vx = 0;

      const crossSign = this.x < enemy.x ? 1 : -1;
      let targetX = enemy.x + crossSign * 120;
      if (targetX < 130 || targetX > ww - 130) {
        targetX = enemy.x - crossSign * 126;
      }
      this.warpTargetX = this.clampArenaX(targetX, game, 115);
      this.dashDir = Math.sign(this.warpTargetX - this.warpOriginX) || 1;

      this.fx?.spawn('warpPortalPairRift', this.warpOriginX, this.groundY - 94, {
        flip: this.facing < 0,
        palette: CHRONO_TEAL_PALETTE,
        light: 1.28,
        extra: { isArrival: false }
      });
      this.spawnPhantomClone(this.warpOriginX, this.groundY, this.facing, 'past', {
        frameIdx: 184,
        maxLife: 0.34
      });

      game?.vfx?.spawnShockwave?.(this.x, this.groundY, 112, '#2dd4bf', 0.30, true);
      game?.vfx?.spawnDamageText?.(this.x, this.y - 156, 0, false, 'PARADOX SLIP!', '#facc15');
      return;
    }

    this.isChronoWarp = false;
    this.dashDuration = 0.36;
    const smartDir = this.x < 220 ? 1 : this.x > ww - 220 ? -1 : dir;
    this.dashDir = smartDir;
    this.vx = smartDir * 390;
    game?.vfx?.spawnGlyphBurst?.(this.x, this.y - 88, 6, 'chrono');
  }

  updateDashOrDodge(dt, enemy, game) {
    const t = this.stateTimer;

    if ((this.state === 'JUMP' || this.state === 'DODGE') && this.isFlipVault) {
      const u = Math.min(1, t / (this.dashDuration || 0.56));
      this.x = this.flipStartX + (this.flipTargetX - this.flipStartX) * (1 - Math.pow(1 - u, 1.8));
      this.y = this.groundY - Math.sin(u * Math.PI) * 92;
      this.flipAngle = 0;

      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }

      if (u >= 0.50 && !this.didActionFrame) {
        this.didActionFrame = true;
        this.fx?.spawn('chronoTimeRiftSlash', this.x + this.facing * 64, this.y - 78, {
          flip: this.facing < 0,
          palette: CHRONO_TEAL_PALETTE,
          light: 1.26,
          extra: { cross: false, angle: 0.34, radius: 32 }
        });
        this._applyChronoExStrike(enemy, game, {
          damage: 42,
          reachFront: 215,
          hitStop: 0.042,
          shakeDur: 0.056,
          knockX: 74,
          knockY: -38,
          scarDx: 102,
          scarDy: 86,
          isGold: false,
          vfxRow: 5,
          sfx: 'slash'
        });
      }

      if (t >= (this.dashDuration || 0.56)) {
        this.y = this.groundY;
        this.vx = 0;
        this.vy = 0;
        this.isFlipVault = false;
        this.isInvulnerable = false;
        game?.vfx?.spawnShockwave?.(this.x, this.groundY, 74, '#2dd4bf', 0.24, true);
        this.setState('IDLE');
      }
      return;
    }

    if (this.isChronoWarp) {
      if (t >= 0.12 && !this.didChronoWarp) {
        this.didChronoWarp = true;
        this.x = this.warpTargetX;
        if (enemy && !enemy.isDead) {
          this.facing = enemy.x >= this.x ? 1 : -1;
        }
        this.fx?.spawn('warpPortalPairRift', this.x, this.groundY - 94, {
          flip: this.facing < 0,
          palette: CHRONO_BRASS_PALETTE,
          light: 1.30,
          extra: { isArrival: true }
        });
        this.spawnVfxAnim(4, this.x, this.groundY - 94, 168, 168, 0.26, {
          flipX: this.facing < 0,
          glowColor: 'gold',
          inFront: true
        });
        game?.vfx?.spawnShockwave?.(this.x, this.groundY, 108, '#facc15', 0.28, true);
      }
      if (t >= this.dashDuration) {
        this.isChronoWarp = false;
        this.isDeflecting = false;
        this.isInvulnerable = false;
        this.setState('IDLE');
      }
      return;
    }

    // Row 6 (`DASH` - Chrono Blade Surge braking cleanly at the 112px Twin-Blade sweet-spot!)
    if (this.state === 'DASH') {
      const dir = this.dashDir || this.facing;
      const distToEnemy = enemy && !enemy.isDead ? (enemy.x - this.x) * dir : 999;
      if (t < (this.dashDuration || 0.36) * 0.78) {
        if (distToEnemy <= 116 && distToEnemy >= 72) {
          this.vx = 0;
        } else {
          this.vx = dir * 560;
          this.x = this.clampArenaX(this.x + this.vx * dt, game, 80);
        }
      } else {
        this.vx = 0;
      }

      if (!this.didActionFrame && enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= 162) {
        this.fx?.spawn('chronoTimeRiftSlash', enemy.x, enemy.y - 94, {
          flip: this.facing < 0,
          light: 1.26,
          extra: { cross: true, radius: 30 }
        });
        this._applyChronoExStrike(enemy, game, {
          damage: 44,
          reachFront: 196,
          hitStop: 0.042,
          shakeDur: 0.056,
          knockX: 85,
          knockY: -45,
          scarDx: 108,
          scarDy: 78,
          isGold: false,
          vfxRow: 5,
          sfx: 'slash'
        });
      }
    } else {
      this.x = this.clampArenaX(this.x + this.dashDir * 360 * dt, game, 80);
    }

    if (t >= this.dashDuration) {
      this.vx = 0;
      this.isDeflecting = false;
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  updateCrouch(_dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.crouchDuration || 0.90;
    this.vx = 0;
    this.isCrouching = true;
    this.isDeflecting = t < 0.56;

    // Reflect incoming enemy projectiles off crossed Twin Hands of Fate!
    if (this.isDeflecting && game?.vfx?.projectiles) {
      for (const proj of game.vfx.projectiles) {
        if (
          proj.owner !== this &&
          !proj._reflectedByChronoEx &&
          Math.abs(proj.x - this.x) < 92 &&
          Math.abs(proj.y - (this.y - 84)) < 92
        ) {
          proj._reflectedByChronoEx = true;
          proj.owner = this;
          proj.vx = -proj.vx * 1.25;
          proj.color = '#2dd4bf';
          proj.coreColor = '#fde047';
          if (game?.audio) game.audio.play('clang', proj.x);
          this.gainMana(12);
          this.gainFinisher(7);
        }
      }
    }

    if (t >= 0.44 && !this.didActionFrame) {
      this.didActionFrame = true;
      this.isDeflecting = false;
      const spawnX = this.x + this.facing * 72;
      const spawnY = this.y - 88;
      this.fx?.spawn('chronoTimeRiftSlash', spawnX, spawnY, {
        flip: this.facing < 0,
        palette: CHRONO_BRASS_PALETTE,
        light: 1.30,
        extra: { cross: true, radius: 32 }
      });
      this._applyChronoExStrike(enemy, game, {
        damage: 48,
        reachFront: 215,
        hitStop: 0.044,
        shakeDur: 0.060,
        knockX: 95,
        knockY: -55,
        isCrit: true,
        scarDx: 112,
        scarDy: -72,
        isGold: true,
        vfxRow: 5,
        sfx: 'slash'
      });
    }

    if (t >= dur) {
      this.isCrouching = false;
      this.isDeflecting = false;
      this.setState('IDLE');
    }
  }

  // ============================================================================
  // MAIN FRAME UPDATE: CLONES, STASIS DILATION FIELD & CHRONO SLOW ENFORCEMENT
  // ============================================================================

  update(dt, enemy, game) {
    this.chronoPhase += dt * 2.8;
    this.wallFlipCooldown = Math.max(0, this.wallFlipCooldown - dt);
    this.crouchCooldown = Math.max(0, this.crouchCooldown - dt);
    this.warpPortalTimer = Math.max(0, this.warpPortalTimer - dt);
    if (this._comboPersistTimer > 0 && this.state !== 'AUTO_ATTACK') {
      this._comboPersistTimer = Math.max(0, this._comboPersistTimer - dt);
    }

    if (this.fx) {
      if (!this.isDead) {
        this.ensureAstrolabeAura();
      } else {
        this.fx.stopByKey('chronoAstrolabeAura');
      }
      this.fx.update(dt);
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

    const inTimeStopPhase =
      this.state === 'TRUE_ULTIMATE' && this.stateTimer >= 1.15 && this.stateTimer < 3.53;
    for (let i = this.phantomClones.length - 1; i >= 0; i--) {
      const c = this.phantomClones[i];
      if (c.holdUntilTimeStopEnd && inTimeStopPhase) {
        c.age = Math.min(c.age + dt, c.maxLife * 0.25);
        continue;
      }
      c.age += dt;
      if (c.age >= c.maxLife) {
        this.phantomClones.splice(i, 1);
      }
    }

    for (let i = this.temporalEchoes.length - 1; i >= 0; i--) {
      const ec = this.temporalEchoes[i];
      ec.life += dt;
      if (ec.life >= ec.maxLife) this.temporalEchoes.splice(i, 1);
    }

    for (let i = this.rewindRibbons.length - 1; i >= 0; i--) {
      const rr = this.rewindRibbons[i];
      rr.life += dt;
      if (rr.life >= 0 && this.fx) {
        rr.sparkTimer = (rr.sparkTimer || 0) + dt;
        if (rr.sparkTimer >= 0.045) {
          rr.sparkTimer = 0;
          const u = Math.min(1, rr.life / rr.maxLife);
          const rx = rr.startX + (this.x - rr.startX) * u;
          const ry =
            rr.startY + (this.y - 98 - rr.startY) * u + Math.sin(u * Math.PI) * rr.arcHeight;
          this.fx.burst(rx, ry, {
            count: 2,
            speedMin: 18,
            speedMax: 54,
            lifeMin: 0.14,
            lifeMax: 0.24,
            gravity: -16,
            colors: ['#ffffff', '#fde047', '#2dd4bf']
          });
        }
      }
      if (rr.life >= rr.maxLife) this.rewindRibbons.splice(i, 1);
    }

    for (let i = this.shatterClockShards.length - 1; i >= 0; i--) {
      const sh = this.shatterClockShards[i];
      sh.age += dt;
      sh.vy += 180 * dt;
      sh.x += sh.vx * dt;
      sh.y += sh.vy * dt;
      if (sh.age >= sh.maxLife) {
        this.shatterClockShards.splice(i, 1);
      }
    }

    // Advance `3.8s` Time-Dilation Stasis Hourglass Field (`45%` enemy slow + Chronos EX haste!)
    const foes = this.getActiveEnemies(enemy, game);
    let chronosAccelerated = false;
    if (this.stasisField) {
      this.stasisField.life += dt;
      if (Math.abs(this.x - this.stasisField.x) <= this.stasisField.radius + 75) {
        chronosAccelerated = true;
      }
      if (this.stasisField.life >= this.stasisField.maxLife) {
        this.stasisField = null;
      }
    }

    if (chronosAccelerated && !this.isDead && this.state !== 'TRUE_ULTIMATE') {
      this.autoCooldown = Math.max(0, this.autoCooldown - dt * 0.35);
      this.skillCooldown = Math.max(0, this.skillCooldown - dt * 0.28);
      if (this.state === 'WALK') {
        this.x = this.clampArenaX(this.x + this.facing * this.moveSpeed * 0.22 * dt, game, 80);
      }
    }

    for (const foe of foes) {
      if (foe.chronoSlowTimer > 0) {
        foe.chronoSlowTimer = Math.max(0, foe.chronoSlowTimer - dt);
      }
      const inField =
        Boolean(this.stasisField) &&
        Math.abs(foe.x - this.stasisField.x) <= this.stasisField.radius;
      if ((foe.chronoSlowTimer > 0 || inField) && !(foe.chronoTimeStopTimer > 0)) {
        if (Number.isFinite(foe._chronoLastX)) {
          const stepDx = foe.x - foe._chronoLastX;
          if (Math.abs(stepDx) > 0.01 && Math.abs(stepDx) < 85) {
            foe.x = foe._chronoLastX + stepDx * 0.55;
          }
        }
        foe.vx *= Math.pow(0.06, dt);
      }
      foe._chronoLastX = foe.x;
    }

    if (this.triHorologium) {
      this.triHorologium.life += dt;
      if (this.triHorologium.life >= this.triHorologium.maxLife) {
        this.triHorologium = null;
      }
    }

    const inMidCombo =
      (this._aiComboCount || 0) > 0 && (this._aiComboChainTimer || 0) > 0;
    if (
      !this.isPlayerControlled &&
      !inMidCombo &&
      enemy &&
      !enemy.isDead &&
      (this.state === 'IDLE' || this.state === 'WALK') &&
      (this.finisherGauge || 0) < (this.maxFinisherGauge || 100)
    ) {
      const dist = Math.abs(enemy.x - this.x);
      const ww = game?.renderer ? game.renderer.worldWidth : 1200;
      const pinnedLeft = this.x < 195 && enemy.x > this.x;
      const pinnedRight = this.x > ww - 195 && enemy.x < this.x;

      if (
        (pinnedLeft || pinnedRight) &&
        dist < 220 &&
        this.dodgeCooldown <= 0 &&
        this.wallFlipCooldown <= 0
      ) {
        this.startJump(enemy, game);
        return;
      }
    }

    if (!this.isDead && this.state === 'WALK') {
      this.stepDustTimer += dt;
      if (this.stepDustTimer >= 0.30) {
        this.stepDustTimer = 0;
        if (game?.audio) game.audio.play('footstep_steel', this.x);
      }
    }

    super.update(dt, enemy, game);

    for (const foe of foes) {
      if (foe && !Number.isFinite(foe._chronoLastX)) {
        foe._chronoLastX = foe.x;
      }
    }
  }

  // ============================================================================
  // 4-BEAT FFBE / LAST CLOUDIA TWIN-BLADE & PARADOX CLONE AUTO-ATTACK (`Row 2`)
  // ============================================================================

  updateAutoAttack(dt, enemy, game) {
    this._currentEnemy = enemy;
    this._comboPersistTimer = 0.72;

    // 0.015s Zero-Idle Intra-Combo Link: holds beat end-pose frame before snapping into next beat!
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

    // Snap times aligned 1:1 to Chronos EX Row 2 keyposes: V0->F03(0.10s), V1->F09(0.06s), V2->F17(0.08s), V3->F25(0.16s)
    const snapT = v === 0 ? 0.10 : v === 1 ? 0.06 : v === 2 ? 0.08 : 0.16;

    let localStep = 0;
    if (v === 0) {
      if (t < 0.10) localStep = Math.min(2, Math.floor((t / 0.10) * 3));
      else if (t < 0.15) localStep = 3;
      else if (t < 0.25) localStep = 4 + Math.min(1, Math.floor(((t - 0.15) / 0.10) * 2));
      else localStep = 6 + Math.min(1, Math.floor(((t - 0.25) / 0.11) * 2));
    } else if (v === 1) {
      if (t < 0.06) localStep = 0;
      else if (t < 0.115) localStep = 1;
      else if (t < 0.21) localStep = 2 + Math.min(1, Math.floor(((t - 0.115) / 0.095) * 2));
      else localStep = 4 + Math.min(2, Math.floor(((t - 0.21) / 0.13) * 3));
    } else if (v === 2) {
      if (t < 0.08) localStep = Math.min(1, Math.floor((t / 0.08) * 2));
      else if (t < 0.14) localStep = 2;
      else if (t < 0.195) localStep = 3;
      else localStep = 4 + Math.min(3, Math.floor(((t - 0.195) / 0.185) * 4));
    } else {
      if (t < 0.16) localStep = Math.min(1, Math.floor((t / 0.16) * 2));
      else if (t < 0.24) localStep = 2;
      else localStep = 3 + Math.min(3, Math.floor(((t - 0.24) / 0.28) * 4));
    }

    const frameIdx = sliceStart + Math.min(sliceLen - 1, Math.max(0, localStep));
    this.trueUltFrameOverride = frameIdx;
    this._overrideFrameIdx = frameIdx;

    // 1. Grounded Impulse-Then-Plant Footwork (Zero Ice-Skating, vx = 0 on snap!)
    this.vx = 0;
    if (t < snapT) {
      const lungeU = Math.min(1, Math.max(0, t / snapT));
      const eased = 1 - Math.pow(1 - lungeU, 2.2);
      this.x = this._beatStartX + (this._beatTargetX - this._beatStartX) * eased;

      if (v === 0 && Math.abs(this._beatTargetX - this._beatStartX) > 24) {
        this._dragSparkAcc += dt;
        if (this._dragSparkAcc >= 0.034) {
          this._dragSparkAcc = 0;
          this.spawnTemporalEcho(frameIdx);
          this.fx?.burst(this.x - this.facing * 34, this.groundY - 2, {
            count: 3,
            speedMin: 30,
            speedMax: 90,
            lifeMin: 0.10,
            lifeMax: 0.22,
            gravity: 65,
            colors: ['#ffffff', '#99f6e4', '#2dd4bf', '#fde047']
          });
        }
      }
    } else if (!this._bootsPlanted) {
      this._bootsPlanted = true;
      this.x = this._beatTargetX;
      this.vx = 0;
    }

    // Airborne hop on Beat 4 (V3: leaps F23..F24, plants boots hard on groundY right at F25 t = 0.16s!)
    if (v === 3) {
      if (t < 0.16) {
        const airU = t / 0.16;
        const liftCurve = Math.sin(airU * Math.PI * 0.86);
        this.y = this.groundY - liftCurve * 58;
        this.vy = 0;
      } else {
        this.y = this.groundY;
        this.vy = 0;
      }
    } else {
      this.y = this.groundY;
      this.vy = 0;
    }

    // 2. Beat-Specific Smear Snap Impacts, Paradox Clone Pincer & Hit-Stop (`0` `clock_gear` auto spam!)
    if (v === 0) {
      // V0 (F03 = 63, t = 0.10s): 1-frame snap Minute-Glaive diagonal cleave smear!
      if ((this._beatHitMask & 1) === 0 && t >= 0.10) {
        this._beatHitMask |= 1;
        const slashX = this.x + this.facing * 72;
        const slashY = this.y - 92;
        game?.vfx?.spawnShockwave?.(this.x + this.facing * 42, this.groundY - 4, 58, '#2dd4bf', 0.20, false, true);
        this.fx?.spawn('chronoTimeRiftSlash', slashX, slashY, {
          flip: this.facing < 0,
          palette: CHRONO_TEAL_PALETTE,
          light: 1.26,
          extra: { cross: false, angle: 0.30, radius: 32 }
        });
        this.spawnVfxAnim(0, slashX, slashY, 172, 172, 0.22, {
          flipX: this.facing < 0,
          glowColor: 'teal',
          inFront: true
        });
        this._applyChronoExStrike(enemy, game, {
          damage: 28,
          reachFront: 216,
          hitStop: 0.044,
          shakeDur: 0.056,
          knockX: 24,
          knockY: 0,
          scarDx: 108,
          scarDy: 86,
          isGold: false,
          vfxRow: 4,
          sfx: 'slash'
        });
      }
    } else if (v === 1) {
      // V1 (F09 = 69, t = 0.06s): Reverse Twin-Blade X-Scissor rising snap smear + Cyan Future-Self Paradox Clone pincer behind enemy!
      if ((this._beatHitMask & 1) === 0 && t >= 0.06) {
        this._beatHitMask |= 1;
        const inRangeEnemy = enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= 236 ? enemy : null;
        const strikeX = inRangeEnemy ? inRangeEnemy.x : this.clampArenaX(this.x + this.facing * 92, game, 85);
        const strikeY = inRangeEnemy ? inRangeEnemy.groundY || inRangeEnemy.y : this.groundY;
        const cloneX = this.clampArenaX(strikeX + this.facing * 78, game, 82);

        this.spawnPhantomClone(cloneX, strikeY, -this.facing, 'future', {
          startFrame: 68,
          endFrame: 74,
          maxLife: 0.42,
          inFront: false
        });
        this.fx?.spawn('warpPortalPairRift', cloneX, strikeY - 94, {
          flip: this.facing > 0,
          palette: CHRONO_TEAL_PALETTE,
          light: 1.24,
          extra: { isArrival: true }
        });
        this.fx?.spawn('chronoTimeRiftSlash', strikeX, strikeY - 94, {
          flip: this.facing < 0,
          palette: CHRONO_TEAL_PALETTE,
          light: 1.30,
          extra: { cross: true, radius: 32 }
        });
        game?.vfx?.spawnDamageText?.(
          strikeX,
          strikeY - 154,
          0,
          false,
          'PARADOX PINCER!',
          '#2dd4bf'
        );
        if (game?.audio) game.audio.play('time_rewind', cloneX);

        this._applyChronoExStrike(enemy, game, {
          damage: 30,
          reachFront: 228,
          hitStop: 0.046,
          shakeDur: 0.060,
          knockX: 22,
          knockY: -124,
          scarDx: 108,
          scarDy: -90,
          isGold: true,
          vfxRow: 5,
          sfx: 'slash'
        });
      }
    } else if (v === 2) {
      // V2 (F17/F18 = 77/78, t = 0.08s & 0.14s): 2-hit 2.5D foreshortened XII-dial vortex spin smear!
      if ((this._beatHitMask & 1) === 0 && t >= 0.08) {
        this._beatHitMask |= 1;
        this.fx?.spawn('chronoTimeRiftSlash', this.x + this.facing * 72, this.y - 88, {
          flip: this.facing < 0,
          palette: CHRONO_TEAL_PALETTE,
          light: 1.26,
          extra: { cross: false, angle: -0.05, radius: 34 }
        });
        this._applyChronoExStrike(enemy, game, {
          damage: 20,
          reachFront: 218,
          hitStop: 0.042,
          shakeDur: 0.048,
          knockX: 14,
          knockY: -22,
          scarDx: 114,
          scarDy: 32,
          isGold: false,
          vfxRow: 4,
          sfx: 'slash'
        });
      }
      if ((this._beatHitMask & 2) === 0 && t >= 0.14) {
        this._beatHitMask |= 2;
        this.gainMana(4.5);
        this.fx?.spawn('chronoTimeRiftSlash', this.x + this.facing * 76, this.y - 92, {
          flip: this.facing > 0,
          palette: CHRONO_BRASS_PALETTE,
          light: 1.30,
          extra: { cross: true, radius: 34 }
        });
        this._applyChronoExStrike(enemy, game, {
          damage: 22,
          reachFront: 220,
          hitStop: 0.044,
          shakeDur: 0.054,
          knockX: 18,
          knockY: -36,
          scarDx: 114,
          scarDy: -38,
          isGold: true,
          vfxRow: 5,
          sfx: 'clang'
        });
      }
    } else {
      // V3 (F25 = 85, t = 0.16s): Airborne Twelfth-Chime Twin-Blade Guillotine Slam (3-hit + brief 'XII CHIME!' slow, 58ms hit-stop)!
      if ((this._beatHitMask & 1) === 0 && t >= 0.16) {
        this._beatHitMask |= 1;
        const slamX = this.x + this.facing * 84;
        const slamY = this.groundY - 92;
        game?.renderer?.triggerShake?.(12, 0.22);
        if (game?.audio) game.audio.play('chrono_hit', slamX);
        game?.vfx?.spawnShockwave?.(slamX, this.groundY - 4, 98, '#fde047', 0.28, false, true);
        game?.vfx?.spawnDamageText?.(slamX, slamY - 62, 0, true, 'XII CHIME!', '#fde047');
        game?.vfx?.spawnGlyphBurst?.(slamX, slamY, 6, 'chrono');
        this.gainMana(6.5);

        this.fx?.spawn('chronoTimeRiftSlash', slamX, slamY, {
          flip: this.facing < 0,
          palette: CHRONO_BRASS_PALETTE,
          light: 1.36,
          extra: { cross: true, radius: 36 }
        });
        this.spawnVfxAnim(7, slamX, slamY, 212, 212, 0.34, {
          flipX: this.facing < 0,
          glowColor: 'gold',
          inFront: true
        });
        this._applyChronoExStrike(enemy, game, {
          damage: 26,
          reachFront: 224,
          hitStop: 0.058,
          shakeDur: 0.082,
          knockX: 34,
          knockY: -44,
          isCrit: true,
          scarDx: 26,
          scarDy: 136,
          isGold: true,
          slowDur: 1.20,
          vfxRow: 5,
          sfx: 'heavy_cleave'
        });
      }
      if ((this._beatHitMask & 2) === 0 && t >= 0.21) {
        this._beatHitMask |= 2;
        this._applyChronoExStrike(enemy, game, {
          damage: 18,
          reachFront: 226,
          hitStop: 0,
          shakeDur: 0.046,
          knockX: 28,
          knockY: -36,
          scarDx: 96,
          scarDy: 78,
          isGold: false,
          vfxRow: 4,
          sfx: 'clang'
        });
      }
      if ((this._beatHitMask & 4) === 0 && t >= 0.26) {
        this._beatHitMask |= 4;
        this._applyChronoExStrike(enemy, game, {
          damage: 24,
          reachFront: 228,
          hitStop: 0,
          shakeDur: 0.056,
          knockX: 96,
          knockY: -86,
          isCrit: true,
          scarDx: 102,
          scarDy: -84,
          isGold: true,
          slowDur: 1.20,
          vfxRow: 5,
          sfx: 'slash'
        });
      }
    }

    // 3. Seamless Direct Beat Chaining (0.015s link, ZERO return to IDLE!)
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
            game?.adventure?.queuedAction === 'attack')
      );
      const aiWantsChain =
        !isManualPlayer &&
        enemy &&
        !enemy.isDead &&
        !enemy.isInvulnerable &&
        Math.abs(enemy.x - this.x) <= 245;

      if (v < 3 && (this._queuedNextBeat || aiWantsChain || advHoldingAttack)) {
        this._queuedNextBeat = false;
        if (game?.adventure?.queuedAction === 'attack') {
          game.adventure.queuedAction = null;
        }
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

  // ============================================================================
  // SKILL - `CHRONO-SCHISM REWIND` (`1.08s`, `4.58s` CD)
  // ============================================================================

  updateSkill(_dt, enemy, game) {
    const t = this.stateTimer;
    this.vx *= 0.82;

    const foes = this.getActiveEnemies(enemy, game);
    const primary = enemy && !enemy.isDead ? enemy : foes[0] || null;

    if (this._skillStage === 0) {
      this._skillStage = 1;
      this.isDeflecting = true;
      this.anchorX = this.x;
      this.anchorY = this.groundY;
      this.anchorHp = this.hp;
      this.anchorActive = true;

      if (game?.audio) game.audio.play('time_rewind', this.x);
      this.fx?.spawn('warpPortalPairRift', this.anchorX, this.groundY - 88, {
        flip: this.facing < 0,
        palette: CHRONO_BRASS_PALETTE,
        light: 1.28,
        extra: { isArrival: false }
      });
      game?.vfx?.spawnShockwave?.(this.anchorX, this.groundY - 2, 96, '#facc15', 0.28, true);
      game?.vfx?.spawnDamageText?.(
        this.anchorX,
        this.y - 148,
        0,
        false,
        'PAST ANCHOR!',
        '#facc15'
      );
    }

    if (t >= 0.24 && this._skillStage === 1) {
      this._skillStage = 2;
      this.spawnTemporalEcho(PixelForge.getFrameIndex(this, this.walkPhase));

      const targetX = primary ? primary.x : this.clampArenaX(this.x + this.facing * 230, game, 110);
      const approachFacing = primary ? Math.sign(primary.x - this.x) || this.facing : this.facing;
      const warpX = this.clampArenaX(targetX - approachFacing * 86, game, 95);

      this.x = warpX;
      this.facing = targetX >= this.x ? 1 : -1;
      this.vx = 0;

      if (game?.audio) {
        game.audio.play('hourglass_trap', targetX);
        game.audio.play('chrono_hit', targetX);
      }

      this.fx?.spawn('chronoTimeRiftSlash', targetX, this.groundY - 96, {
        flip: this.facing < 0,
        palette: CHRONO_TEAL_PALETTE,
        light: 1.38,
        extra: { radius: 36 }
      });
      this.spawnVfxAnim(5, targetX, this.groundY - 96, 260, 260, 0.38, {
        flipX: this.facing < 0,
        glowColor: 'teal',
        inFront: true
      });
      this.spawnVfxAnim(4, targetX, this.groundY - 96, 212, 212, 0.32, {
        glowColor: 'gold',
        inFront: true
      });

      this.stasisField = {
        x: targetX,
        y: this.groundY,
        radius: 165,
        life: 0,
        maxLife: 3.8
      };
      this.fx?.spawn('chronoStasisField', targetX, this.groundY, {
        useGroundY: true,
        palette: CHRONO_TEAL_PALETTE,
        light: 1.32,
        maxDuration: 3.8,
        extra: { customDuration: 3.8, radius: 56 }
      });

      game?.vfx?.spawnShockwave?.(targetX, this.groundY - 2, 165, '#2dd4bf', 0.36, true);
      game?.vfx?.spawnGlyphBurst?.(targetX, this.groundY - 96, 9, 'chrono');
      game?.vfx?.spawnDamageText?.(
        targetX,
        this.groundY - 166,
        0,
        true,
        'STASIS RIFT!',
        '#2dd4bf'
      );
      game?.renderer?.triggerShake?.(12, 0.20);

      for (const foe of foes) {
        if (Math.abs(foe.x - targetX) <= 175 || Math.abs(foe.x - this.x) <= 175) {
          foe.chronoSlowTimer = Math.max(foe.chronoSlowTimer || 0, 1.6);
          foe.takeDamage(foe === primary ? 105 : 72, this, true, 45, -65);
        }
      }
    }

    if (t >= 0.76 && this._skillStage === 2) {
      this._skillStage = 3;
      this.isDeflecting = false;

      const riftCloneX = this.x;
      const riftCloneFacing = this.facing;
      const echoTargetX = primary
        ? primary.x
        : this.stasisField
          ? this.stasisField.x
          : riftCloneX + riftCloneFacing * 86;

      this.spawnPhantomClone(riftCloneX, this.groundY, riftCloneFacing, 'past', {
        startFrame: 68,
        endFrame: 82,
        maxLife: 0.48,
        inFront: false
      });
      this.spawnVfxAnim(5, echoTargetX, this.groundY - 94, 216, 216, 0.32, {
        flipX: riftCloneFacing < 0,
        glowColor: 'gold',
        inFront: true
      });
      this.fx?.spawn('chronoTimeRiftSlash', echoTargetX, this.groundY - 94, {
        flip: riftCloneFacing < 0,
        palette: CHRONO_BRASS_PALETTE,
        light: 1.30,
        extra: { radius: 30 }
      });

      for (const foe of foes) {
        if (Math.abs(foe.x - echoTargetX) <= 165 || Math.abs(foe.x - riftCloneX) <= 175) {
          foe.takeDamage(foe === primary ? 54 : 38, this, false, 70, -45);
        }
      }

      this.x = this.anchorX;
      this.y = this.groundY;
      this.vx = 0;
      this.anchorActive = false;
      if (primary) {
        this.facing = primary.x >= this.x ? 1 : -1;
      }

      if (game?.audio) game.audio.play('time_rewind', this.x);
      this.spawnRewindRibbons(riftCloneX, this.groundY - 92);
      this.fx?.spawn('warpPortalPairRift', this.x, this.groundY - 92, {
        flip: this.facing < 0,
        palette: CHRONO_BRASS_PALETTE,
        light: 1.34,
        extra: { isArrival: true }
      });

      const rewindHeal = Math.max(32, Math.min(88, Math.round(Math.max(0, this.anchorHp - this.hp) * 0.40)));
      this.heal(rewindHeal, 'CHRONO REWIND');
    }

    if (t >= (this.skillDuration || 1.08)) {
      this.isDeflecting = false;
      this.anchorActive = false;
      this.setState('IDLE');
    }
  }

  // ============================================================================
  // OVERDRIVE (`ULTIMATE`) - `TRI-TIMELINE CONVERGENCE` (`1.68s`)
  // ============================================================================

  updateUltimate(_dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.ultDuration || 1.68;
    this.vx = 0;
    this.vy = 0;
    this.isInvulnerable = true;

    let liftFrac = 0;
    if (t < 0.25) {
      liftFrac = 1 - Math.pow(1 - t / 0.25, 2.0);
    } else if (t <= 1.36) {
      liftFrac = 1.0;
    } else {
      liftFrac = Math.max(0, 1 - (t - 1.36) / Math.max(0.08, dur - 1.36));
    }
    this.y = this.groundY - Math.round(28 * liftFrac);

    const foes = this.getActiveEnemies(enemy, game);
    const primary = enemy && !enemy.isDead ? enemy : foes[0] || null;
    if (primary) {
      this._ultTargetX = primary.x;
      this.facing = primary.x >= this.x ? 1 : -1;
    }
    const targetX = this.clampArenaX(
      this._ultTargetX || this.x + this.facing * 200,
      game,
      125
    );

    if (t >= 0.04 && this._ultStage === 0) {
      this._ultStage = 1;
      if (game?.audio) game.audio.play('chrono_ult', targetX);
      game?.renderer?.triggerShake?.(13, 0.24);

      this.triHorologium = {
        x: targetX,
        y: this.groundY - 168,
        life: 0,
        maxLife: 1.56
      };

      this.fx?.spawn('doomsdayGrandHorologium', targetX, this.groundY, {
        useGroundY: true,
        palette: CHRONO_TEAL_PALETTE,
        light: 1.38,
        maxDuration: 1.62,
        extra: { customDuration: 1.62, radius: 72 }
      });

      const leftCloneX = this.clampArenaX(targetX - 98, game, 85);
      const rightCloneX = this.clampArenaX(targetX + 98, game, 85);
      this.spawnPhantomClone(leftCloneX, this.groundY, 1, 'past', {
        startFrame: 60,
        endFrame: 88,
        maxLife: 1.32
      });
      this.spawnPhantomClone(rightCloneX, this.groundY, -1, 'future', {
        startFrame: 60,
        endFrame: 88,
        maxLife: 1.32
      });

      game?.vfx?.spawnDamageText?.(
        targetX,
        this.groundY - 228,
        0,
        true,
        'TRI-TIMELINE CONVERGENCE!',
        '#2dd4bf'
      );
    }

    if (primary && !primary.hasPoise && t < 1.32) {
      primary.vx *= 0.2;
    }

    if (t >= 0.45 && this._ultStage === 1) {
      this._ultStage = 2;
      if (game?.audio) game.audio.play('slash', targetX);
      game?.renderer?.triggerShake?.(12, 0.20);

      this.fx?.spawn('chronoTimeRiftSlash', targetX, this.groundY - 96, {
        palette: CHRONO_TEAL_PALETTE,
        light: 1.34,
        extra: { radius: 34 }
      });
      this.spawnVfxAnim(5, targetX, this.groundY - 96, 240, 240, 0.32, {
        flipX: false,
        glowColor: 'teal',
        inFront: true
      });
      game?.vfx?.spawnGlyphBurst?.(targetX, this.groundY - 96, 7, 'chrono');

      for (const foe of foes) {
        if (Math.abs(foe.x - targetX) <= 180) {
          foe.takeDamage(foe === primary ? 78 : 54, this, true, -18, -35);
        }
      }
    }

    if (t >= 0.86 && this._ultStage === 2) {
      this._ultStage = 3;
      if (game?.audio) game.audio.play('clock_gear', targetX);
      game?.renderer?.triggerShake?.(14, 0.22);

      this.fx?.spawn('chronoTimeRiftSlash', targetX, this.groundY - 98, {
        flip: true,
        palette: CHRONO_BRASS_PALETTE,
        light: 1.38,
        extra: { radius: 36 }
      });
      this.spawnVfxAnim(5, targetX, this.groundY - 98, 256, 256, 0.34, {
        flipX: true,
        glowColor: 'gold',
        inFront: true
      });
      this.spawnVfxAnim(4, targetX, this.groundY - 98, 208, 208, 0.30, {
        glowColor: 'teal',
        inFront: true
      });

      for (const foe of foes) {
        if (Math.abs(foe.x - targetX) <= 185) {
          foe.takeDamage(foe === primary ? 84 : 58, this, true, 18, -45);
        }
      }
    }

    if (t >= 1.28 && this._ultStage === 3) {
      this._ultStage = 4;
      if (game?.audio) game.audio.play('chrono_hit', targetX);
      game?.renderer?.triggerShake?.(22, 0.42);
      game?.renderer?.triggerAberration?.(9);
      game?.renderer?.triggerHitStop?.(0.08);

      this.fx?.spawn('eternalZeroClockPulse', targetX, this.groundY - 98, {
        palette: CHRONO_BRASS_PALETTE,
        light: 1.44,
        extra: { isShatter: true }
      });
      this.spawnVfxAnim(7, targetX, this.groundY - 98, 296, 296, 0.44, {
        glowColor: 'gold',
        inFront: true
      });
      this.spawnVfxAnim(5, targetX, this.groundY - 98, 264, 264, 0.36, {
        glowColor: 'teal',
        inFront: true
      });

      this.heal(38, 'TRI-TIMELINE');
      game?.vfx?.spawnDamageText?.(
        targetX,
        this.groundY - 240,
        0,
        true,
        'CONVERGENCE SHATTER!',
        '#fde047'
      );
      game?.vfx?.spawnGlyphBurst?.(targetX, this.groundY - 98, 12, 'chrono');

      for (const foe of foes) {
        if (Math.abs(foe.x - targetX) <= 215) {
          foe.takeDamage(foe === primary ? 140 : 98, this, true, 165, -185);
        }
      }
    }

    if (t >= dur) {
      this.y = this.groundY;
      this.isInvulnerable = false;
      this.triHorologium = null;
      this.setState('IDLE');
    }
  }

  // ============================================================================
  // SUPREME ULTIMATE (`TRUE_ULTIMATE`) - `ETERNAL ZERO: TWELFTH BELL` (`4.55s`)
  // ============================================================================

  updateTrueUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.trueUltDuration || 4.55;
    this.isInvulnerable = true;
    this.unstoppablePoise = true;
    this.vx = 0;
    this.vy = 0;

    const foes = this.getActiveEnemies(enemy, game);
    const primary = enemy && !enemy.isDead ? enemy : foes[0] || null;

    if (game?.renderer && t < 4.15) {
      const dimTarget = t < 3.53 ? 0.52 : Math.max(0, 0.52 * (1 - (t - 3.53) / 0.62));
      game.renderer.ultDim = Math.max(game.renderer.ultDim || 0, dimTarget);
    }

    if (!this._trueUltInit) {
      this._trueUltInit = true;
      this._trueUltStage = 0;
      this._trueUltTickStage = 0;
      this._trueUltBarrageCount = 0;
      this.suspendedClockSpears = [];
      this.shatterClockShards = [];
      this._frozenEnemiesRef = [];

      this._eternalStartFacing = primary
        ? primary.x >= this.x
          ? 1
          : -1
        : this.facing;
      this.facing = this._eternalStartFacing;

      this.eternalTargetX = primary
        ? primary.x
        : this.clampArenaX(this.x + this.facing * 240, game, 150);
      this.eternalTargetY = primary ? primary.y : this.groundY;

      const domeX = this.clampArenaX(
        this.x * 0.42 + this.eternalTargetX * 0.58,
        game,
        255
      );
      this.eternalZeroDome = {
        x: domeX,
        y: this.groundY - 206,
        radius: 214,
        phase: 0,
        minuteHandDeg: -90,
        hourHandDeg: 180,
        timeStopped: false,
        shattered: false,
        alpha: 1
      };

      if (game?.audio) game.audio.play('chrono_ult', domeX);
      game?.renderer?.triggerShake?.(14, 0.26);

      this.fx?.spawn('doomsdayGrandHorologium', domeX, this.groundY, {
        useGroundY: true,
        palette: CHRONO_TEAL_PALETTE,
        light: 1.42,
        maxDuration: 3.6,
        extra: { customDuration: 3.6, radius: 84 }
      });
      this.fx?.spawn('eternalZeroClockPulse', this.x, this.y - 98, {
        palette: CHRONO_BRASS_PALETTE,
        light: 1.35,
        extra: { isShatter: false }
      });
      game?.vfx?.spawnDamageText?.(
        domeX,
        this.groundY - 392,
        0,
        true,
        'THE TWELFTH BELL TOLLS...',
        '#fde047'
      );
    }

    if (this.eternalZeroDome) {
      this.eternalZeroDome.phase += dt;
    }

    // PHASE 1 (`0.00s .. 1.15s`): ASCENT & THE TWELFTH BELL TOLLS (`IX -> X -> XI -> XII`)
    if (t < 1.15) {
      const u1 = clamp01Local(t / 1.15);
      const lift = Math.round(54 * (1 - Math.pow(1 - u1, 2.2)));
      this.y = this.groundY - lift;
      this.trueUltFrameOverride = 120 + Math.min(11, Math.floor(u1 * 12));

      if (primary) {
        this.eternalTargetX = primary.x;
        this.eternalTargetY = primary.y;
        this.facing = primary.x >= this.x ? 1 : -1;
      }

      if (this.eternalZeroDome) {
        const dome = this.eternalZeroDome;
        dome.minuteHandDeg = -90 + u1 * 720;
        if (t < 0.36) dome.hourHandDeg = 180;
        else if (t < 0.72) dome.hourHandDeg = -150;
        else if (t < 1.04) dome.hourHandDeg = -120;
        else dome.hourHandDeg = -90;

        if (t >= 0.24 && this._trueUltTickStage === 0) {
          this._trueUltTickStage = 1;
          if (game?.audio) game.audio.play('clock_gear', dome.x);
          game?.vfx?.spawnDamageText?.(dome.x - 130, dome.y - 24, 0, false, 'IX...', '#2dd4bf');
        } else if (t >= 0.56 && this._trueUltTickStage === 1) {
          this._trueUltTickStage = 2;
          if (game?.audio) game.audio.play('clock_gear', dome.x);
          game?.vfx?.spawnDamageText?.(dome.x - 76, dome.y - 102, 0, false, 'X...', '#99f6e4');
        } else if (t >= 0.86 && this._trueUltTickStage === 2) {
          this._trueUltTickStage = 3;
          if (game?.audio) game.audio.play('clock_gear', dome.x);
          game?.vfx?.spawnDamageText?.(dome.x - 18, dome.y - 154, 0, true, 'XI...', '#fde047');
        }
      }
      return;
    }

    // PHASE 2 (`t = 1.15s`): `"TIME STOP - ETERNAL ZERO!"`
    if (this._trueUltStage === 0) {
      this._trueUltStage = 1;
      if (primary) {
        this.eternalTargetX = primary.x;
        this.eternalTargetY = primary.y;
      }

      if (this.eternalZeroDome) {
        this.eternalZeroDome.minuteHandDeg = -90;
        this.eternalZeroDome.hourHandDeg = -90;
        this.eternalZeroDome.timeStopped = true;
      }

      this._frozenEnemiesRef = [...foes];
      for (const foe of foes) {
        foe.chronoTimeStopTimer = 2.45;
        foe._timeStopLockX = foe.x;
        foe._timeStopLockY = foe.y;
        foe.chronoTimeStopFrame = PixelForge.getFrameIndex(foe, foe.walkPhase || 0);
        foe.vx = 0;
        foe.vy = 0;
      }

      if (game?.audio) game.audio.play('time_stop', this.eternalTargetX);
      game?.renderer?.triggerImpactFrame?.(
        this.eternalTargetX,
        this.eternalTargetY - 95,
        0.13,
        'chrono'
      );
      game?.renderer?.triggerShake?.(16, 0.28);
      game?.renderer?.triggerAberration?.(9);

      this.fx?.spawn('eternalZeroClockPulse', this.eternalTargetX, this.eternalTargetY - 94, {
        palette: CHRONO_TEAL_PALETTE,
        light: 1.45,
        extra: { isShatter: false }
      });
      game?.vfx?.spawnShockwave?.(
        this.eternalTargetX,
        this.eternalTargetY - 94,
        220,
        '#2dd4bf',
        0.38,
        false,
        true
      );
      game?.vfx?.spawnDamageText?.(
        this.eternalTargetX,
        this.eternalTargetY - 196,
        0,
        true,
        'TIME STOP - ETERNAL ZERO!',
        '#2dd4bf'
      );
    }

    // PHASE 3 (`1.15s .. 3.52s`): 6-ANGLE PARADOX CLONE & SUSPENDED GIANT CLOCK-SPEAR BARRAGE IN STOPPED TIME
    if (t < 3.53) {
      for (const foe of this._frozenEnemiesRef) {
        if (foe && !foe.isDead) {
          foe.chronoTimeStopTimer = Math.max(foe.chronoTimeStopTimer || 0, 3.56 - t);
        }
      }

      const tx = this.eternalTargetX;
      const ty = this.eternalTargetY;
      const aimCenterY = ty - 92;

      const barrageSchedule = [
        { time: 1.32, numeral: 'II', ox: 168, oy: -148, variant: 'future', pose: 253 },
        { time: 1.66, numeral: 'X', ox: -168, oy: -148, variant: 'past', pose: 255 },
        { time: 2.00, numeral: 'IV', ox: 196, oy: -54, variant: 'future', pose: 72 },
        { time: 2.34, numeral: 'VIII', ox: -196, oy: -54, variant: 'past', pose: 76 },
        { time: 2.68, numeral: 'VI', ox: 132, oy: 0, variant: 'future', pose: 194 },
        { time: 3.02, numeral: 'XII', ox: -132, oy: -192, variant: 'past', pose: 134 }
      ];

      while (
        this._trueUltBarrageCount < barrageSchedule.length &&
        t >= barrageSchedule[this._trueUltBarrageCount].time
      ) {
        const slot = barrageSchedule[this._trueUltBarrageCount];
        this._trueUltBarrageCount++;

        const warpX = this.clampArenaX(tx + slot.ox, game, 86);
        const warpY = Math.min(this.groundY, Math.max(this.groundY - 235, ty + slot.oy));
        const faceDir = tx >= warpX ? 1 : -1;

        this.x = warpX;
        this.y = warpY;
        this.facing = faceDir;
        this.trueUltFrameOverride = slot.pose;

        if (game?.audio) game.audio.play('clock_gear', warpX);
        game?.renderer?.triggerShake?.(7, 0.12);

        this.fx?.spawn('warpPortalPairRift', warpX, warpY - 90, {
          flip: faceDir < 0,
          palette: slot.variant === 'past' ? CHRONO_BRASS_PALETTE : CHRONO_TEAL_PALETTE,
          light: 1.32,
          extra: { isArrival: true }
        });

        this.spawnPhantomClone(warpX, warpY, faceDir, slot.variant, {
          frameIdx: slot.pose,
          maxLife: 0.56,
          holdUntilTimeStopEnd: true,
          romanTag: slot.numeral
        });

        const spearOriginX = warpX + faceDir * 44;
        const spearOriginY = warpY - 94;
        const aimAngle = Math.atan2(aimCenterY - spearOriginY, tx - spearOriginX);
        this.suspendedClockSpears.push({
          x: spearOriginX,
          y: spearOriginY,
          originX: spearOriginX,
          originY: spearOriginY,
          targetX: tx,
          targetY: aimCenterY,
          angle: aimAngle,
          numeral: slot.numeral,
          variant: slot.variant,
          spawnTime: t,
          launched: false,
          launchProgress: 0
        });

        game?.vfx?.spawnGlyphBurst?.(spearOriginX, spearOriginY, 5, 'chrono');
      }

      if (t >= 3.24 && this._trueUltStage === 1) {
        this._trueUltStage = 2;
        const vantageX = this.clampArenaX(tx - this._eternalStartFacing * 208, game, 96);
        this.x = vantageX;
        this.y = this.groundY - 34;
        this.facing = tx >= this.x ? 1 : -1;
        this.trueUltFrameOverride = 136;

        if (game?.audio) game.audio.play('time_rewind', this.x);
        this.fx?.spawn('warpPortalPairRift', this.x, this.y - 92, {
          flip: this.facing < 0,
          palette: CHRONO_BRASS_PALETTE,
          light: 1.36,
          extra: { isArrival: true }
        });
        game?.vfx?.spawnDamageText?.(
          this.x,
          this.y - 166,
          0,
          true,
          'ZERO HOUR... SNAP!',
          '#fde047'
        );
      } else if (t >= 3.24) {
        const subU = clamp01Local((t - 3.24) / 0.28);
        this.trueUltFrameOverride = 136 + Math.min(2, Math.floor(subU * 3));
      }

      return;
    }

    // PHASE 4 (`t >= 3.53s`): `"TWELFTH BELL - TIME SHATTER!"` (`680` Crit Damage + `12%` MaxHP Heal!)
    if (this._trueUltStage < 3) {
      this._trueUltStage = 3;
      const tx = this.eternalTargetX;
      const ty = this.eternalTargetY;
      const impactY = ty - 94;

      this._releaseAllTimeStoppedEnemies();

      for (const sp of this.suspendedClockSpears) {
        sp.launched = true;
        sp.launchProgress = 0;
      }

      if (this.eternalZeroDome) {
        const dome = this.eternalZeroDome;
        dome.shattered = true;
        for (let i = 0; i < 36; i++) {
          const ang = (i / 36) * Math.PI * 2 + (i % 2) * 0.08;
          const rStart = 42 + (i % 4) * 44;
          const spd = 165 + (i % 5) * 62;
          this.shatterClockShards.push({
            x: dome.x + Math.cos(ang) * rStart,
            y: dome.y + Math.sin(ang) * rStart * 0.85,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd - 65,
            size: i % 3 === 0 ? 12 : 9,
            isGold: i % 3 === 0,
            age: 0,
            maxLife: 0.72 + (i % 4) * 0.08
          });
        }
      }

      if (game?.audio) game.audio.play('time_shatter', tx);
      game?.renderer?.triggerImpactFrame?.(tx, impactY, 0.18, 'chrono');
      game?.renderer?.triggerShake?.(28, 0.58);
      game?.renderer?.triggerAberration?.(14);
      game?.renderer?.triggerHitStop?.(0.11);

      this.fx?.spawn('eternalZeroClockPulse', tx, impactY, {
        palette: CHRONO_BRASS_PALETTE,
        light: 1.52,
        extra: { isShatter: true }
      });
      this.fx?.spawn('chronoTimeRiftSlash', tx, impactY, {
        palette: CHRONO_TEAL_PALETTE,
        light: 1.45,
        extra: { radius: 44 }
      });

      this.spawnVfxAnim(7, tx, impactY, 384, 384, 0.56, {
        glowColor: 'gold',
        inFront: true
      });
      this.spawnVfxAnim(7, tx, impactY, 264, 264, 0.42, {
        flipX: true,
        glowColor: 'teal',
        inFront: true
      });
      this.spawnVfxAnim(5, tx, impactY, 312, 312, 0.40, {
        glowColor: 'gold',
        inFront: true
      });

      game?.vfx?.spawnShockwave?.(tx, this.groundY - 4, 265, '#fde047', 0.46, true);
      game?.vfx?.spawnShockwave?.(tx, impactY, 240, '#2dd4bf', 0.42, false, true);
      game?.vfx?.spawnBurst?.(tx, impactY, 32, '#2dd4bf', 340, { upBias: 110, size: 7 });
      game?.vfx?.spawnBurst?.(tx, impactY, 26, '#fde047', 310, { upBias: 95, size: 6 });
      game?.vfx?.spawnGlyphBurst?.(tx, impactY, 16, 'chrono');

      const rewindUltHeal = Math.round(this.maxHp * 0.12);
      this.heal(rewindUltHeal, 'TEMPORAL REWIND');
      this.spawnRewindRibbons(tx, impactY);

      game?.vfx?.spawnDamageText?.(
        tx,
        impactY - 122,
        0,
        true,
        'TWELFTH BELL - TIME SHATTER!',
        '#fde047'
      );

      const postFreezeFoes = this.getActiveEnemies(enemy, game);
      for (const foe of postFreezeFoes) {
        foe.takeDamage(680, this, true, 245, -215);
      }
    }

    const postU = clamp01Local((t - 3.53) / Math.max(0.1, dur - 3.53));
    this.y = this.groundY - Math.round(34 * Math.max(0, 1 - postU * 1.45));
    this.trueUltFrameOverride = 139 + Math.min(10, Math.floor(postU * 11));

    for (let i = this.suspendedClockSpears.length - 1; i >= 0; i--) {
      const sp = this.suspendedClockSpears[i];
      sp.launchProgress += dt / 0.24;
      const lu = Math.min(1.35, sp.launchProgress);
      const dx = sp.targetX - sp.originX;
      const dy = sp.targetY - sp.originY;
      sp.x = sp.originX + dx * (lu * 1.38);
      sp.y = sp.originY + dy * (lu * 1.38);
      if (sp.launchProgress >= 1.15) {
        this.suspendedClockSpears.splice(i, 1);
      }
    }

    if (this.eternalZeroDome) {
      this.eternalZeroDome.alpha = Math.max(0, 1 - postU * 2.4);
    }

    if (t >= dur) {
      this._releaseAllTimeStoppedEnemies();
      this._trueUltInit = false;
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      this.isInvulnerable = false;
      this.unstoppablePoise = false;
      this.eternalZeroDome = null;
      this.suspendedClockSpears = [];
      this.y = this.groundY;
      this.autoCooldown = Math.max(this.autoCooldown, 0.55);
      this.crouchCooldown = Math.max(this.crouchCooldown, 0.55);
      this.dodgeCooldown = Math.max(this.dodgeCooldown, 0.55);
      this.dashCooldown = Math.max(this.dashCooldown, 0.55);
      this.skillCooldown = Math.max(this.skillCooldown, 0.65);
      this.setState('IDLE');
    }
  }

  // ============================================================================
  // PIXEL-PURE HD-2D RENDERING (ZERO `ctx.rotate`, ZERO `ctx.ellipse`)
  // ============================================================================

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
    glowColor = 'teal'
  ) {
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth || alpha <= 0.01) return;
    const cell = 208;
    const sx = Math.max(0, Math.min(29, Math.floor(col))) * cell;
    const sy = Math.max(0, Math.min(7, Math.floor(row))) * cell;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(x), Math.round(y));
    if (flipX) ctx.scale(-1, 1);

    const glowSprite =
      glowColor === 'gold'
        ? renderer?.glowGold || renderer?.glowTeal
        : glowColor === 'white'
          ? renderer?.glowWhite || renderer?.glowTeal
          : renderer?.glowTeal || renderer?.glowGold;
    if (glowSprite) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, alpha * 0.22);
      const gw = Math.round(w * 1.12);
      const gh = Math.round(h * 1.12);
      ctx.drawImage(glowSprite, -gw * 0.5, -gh * 0.5, gw, gh);
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.drawImage(vfxSheet, sx, sy, cell, cell, -w * 0.5, -h * 0.5, w, h);

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, alpha * 0.24);
    ctx.drawImage(vfxSheet, sx, sy, cell, cell, -w * 0.5, -h * 0.5, w, h);

    ctx.restore();
  }

  /**
   * Renders a Colossal Suspended Giant Clock-Hand Spear along `sp.angle` using strictly integer-stepped
   * `fillRect` pixel clusters + un-rotated `Row 1` Escapement Hilt Wheel (`ZERO ctx.rotate`!).
   */
  drawPixelClockSpear(ctx, sp, vfxSheet, renderer = null) {
    const px = 3;
    const snap = (v) => Math.round(v / px) * px;
    const age = Math.max(0, (this.stateTimer || 0) - sp.spawnTime);
    const pop = Math.min(1, age / 0.12);
    const fade = sp.launched ? Math.max(0, 1 - sp.launchProgress * 0.75) : 1.0;
    if (fade <= 0.02) return;

    const tremor = sp.launched ? 0 : Math.round(Math.sin((this.stateTimer || 0) * 58 + sp.angle * 3) * 2);
    const ox = sp.x + tremor;
    const oy = sp.y;
    const ux = Math.cos(sp.angle);
    const uy = Math.sin(sp.angle);
    const nx = -uy;
    const ny = ux;
    const isPast = sp.variant === 'past';
    const mainHex = isPast ? '#facc15' : '#2dd4bf';
    const rimHex = isPast ? '#fef08a' : '#99f6e4';

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = fade;

    // 1. Pixel-Stepped Sightline before Shatter
    if (!sp.launched) {
      const dx = sp.targetX - ox;
      const dy = sp.targetY - oy;
      const dist = Math.hypot(dx, dy) || 1;
      for (let d = 58; d < dist - 24; d += 24) {
        for (let s = 0; s < 12 && d + s < dist - 24; s += px) {
          const lx = snap(ox + ux * (d + s));
          const ly = snap(oy + uy * (d + s));
          ctx.fillStyle = '#050814';
          ctx.fillRect(lx - px, ly - px, px * 3, px * 3);
          ctx.fillStyle = mainHex;
          ctx.fillRect(lx, ly, px, px);
        }
      }
    }

    // 2. Un-rotated Spinning Escapement Wheel (`Row 1`) at Spear Collar
    if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      const wheelCol = Math.floor((this.stateTimer || 0) * 28) % 30;
      const wheelSize = Math.round(92 * (0.75 + 0.25 * pop));
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        1,
        wheelCol,
        ox - ux * 16,
        oy - uy * 16,
        wheelSize,
        wheelSize,
        fade * 0.88,
        false,
        renderer,
        isPast ? 'gold' : 'teal'
      );
    }

    // 3. Stepped Pixel-Art Giant Clock-Hand Spear Blade (-54px pommel .. +78px diamond tip)
    const halfSpan = Math.round(66 * (0.72 + 0.28 * pop));
    for (let s = -Math.round(halfSpan * 0.72); s <= halfSpan; s += px) {
      const frac = (s + halfSpan * 0.72) / (halfSpan * 1.72);
      const isCollar = Math.abs(s + 8) <= 6;
      const isHead = frac > 0.62 && frac < 0.90;
      const halfW = isCollar ? 9 : isHead ? 6 : frac >= 0.90 ? Math.max(0, Math.round((1 - frac) * 48)) : 3;
      for (let w = -halfW - px; w <= halfW + px; w += px) {
        const bx = snap(ox + ux * s + nx * w);
        const by = snap(oy + uy * s + ny * w);
        ctx.fillStyle = '#050814';
        ctx.fillRect(bx, by, px, px);
      }
    }
    for (let s = -Math.round(halfSpan * 0.72); s <= halfSpan; s += px) {
      const frac = (s + halfSpan * 0.72) / (halfSpan * 1.72);
      const isCollar = Math.abs(s + 8) <= 6;
      const isHead = frac > 0.62 && frac < 0.90;
      const halfW = isCollar ? 9 : isHead ? 6 : frac >= 0.90 ? Math.max(0, Math.round((1 - frac) * 48)) : 3;
      for (let w = -halfW; w <= halfW; w += px) {
        const bx = snap(ox + ux * s + nx * w);
        const by = snap(oy + uy * s + ny * w);
        ctx.fillStyle = w === 0 || frac > 0.86 ? '#ffffff' : Math.abs(w) <= px ? rimHex : isCollar ? '#facc15' : mainHex;
        ctx.fillRect(bx, by, px, px);
      }
    }

    // 4. Roman Numeral Sector Badge (`II`, `X`, `IV`, `VIII`, `VI`, `XII`)
    if (!sp.launched && sp.numeral) {
      const badgeX = snap(ox - ux * 52);
      const badgeY = snap(oy - uy * 52 - 22);
      PixelFont.drawCentered(ctx, sp.numeral, badgeX, badgeY, 2, rimHex, '#ffffff', true);
    }

    ctx.restore();
  }

  drawEternalZeroClockDome(ctx, vfxSheet, renderer = null) {
    const dome = this.eternalZeroDome;
    if (!dome || dome.alpha <= 0.02) return;

    const px = 3;
    const snap = (v) => Math.round(v / px) * px;
    const cx = snap(dome.x);
    const cy = snap(dome.y);
    const R = dome.radius;
    const fade = dome.alpha;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    if (!dome.shattered) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = dome.timeStopped ? 'rgba(4, 15, 28, 0.52)' : 'rgba(6, 14, 28, 0.42)';
      for (let dy = -R; dy <= R; dy += px * 2) {
        const span = Math.sqrt(Math.max(0, R * R - dy * dy));
        const x0 = snap(cx - span);
        const x1 = snap(cx + span);
        if (x1 > x0) {
          ctx.fillRect(x0, snap(cy + dy), x1 - x0, px * 2);
        }
      }

      if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
        const col = dome.timeStopped ? 0 : Math.floor(dome.phase * 24) % 30;
        this.drawBloomedVfxCell(
          ctx,
          vfxSheet,
          3,
          col,
          cx,
          cy,
          376,
          376,
          fade * 0.72,
          false,
          renderer,
          dome.timeStopped ? 'teal' : 'gold'
        );
      }

      const rotStep = dome.timeStopped ? 0 : dome.phase * 0.75;
      const ringSteps = 96;
      for (let i = 0; i < ringSteps; i++) {
        const a = (i / ringSteps) * Math.PI * 2 + rotStep;
        const isCog = i % 4 < 2;
        const rOut = R + (isCog ? 6 : 0);
        const rx = snap(cx + Math.cos(a) * rOut);
        const ry = snap(cy + Math.sin(a) * rOut);
        ctx.fillStyle = '#050814';
        ctx.fillRect(rx - px, ry - px, px * 3, px * 3);
        ctx.fillStyle = isCog ? '#fde047' : '#d97706';
        ctx.fillRect(rx, ry, px, px);

        const aIn = (i / ringSteps) * Math.PI * 2 - rotStep * 1.4;
        const rxIn = snap(cx + Math.cos(aIn) * (R - 54));
        const ryIn = snap(cy + Math.sin(aIn) * (R - 54));
        ctx.fillStyle = i % 3 === 0 ? '#ffffff' : '#2dd4bf';
        ctx.fillRect(rxIn, ryIn, px, px);
      }

      for (let h = 0; h < 12; h++) {
        const ang = -Math.PI * 0.5 + (h / 12) * Math.PI * 2;
        const nx = snap(cx + Math.cos(ang) * (R - 26));
        const ny = snap(cy + Math.sin(ang) * (R - 26));
        const isMidnight = h === 0;
        const isCardinal = h % 3 === 0;
        const mainCol = isMidnight
          ? '#fde047'
          : dome.timeStopped
            ? '#99f6e4'
            : isCardinal
              ? '#facc15'
              : '#2dd4bf';
        PixelFont.drawCentered(
          ctx,
          ROMAN_CLOCK_HOURS[h],
          nx,
          ny,
          isMidnight ? 3 : 2,
          mainCol,
          '#ffffff',
          true
        );
      }

      const drawSteppedClockHand = (deg, len, mainHex, rimHex) => {
        const rad = (deg * Math.PI) / 180;
        const ux = Math.cos(rad);
        const uy = Math.sin(rad);
        ctx.fillStyle = '#050814';
        for (let s = -18; s <= len; s += px) {
          const hx = snap(cx + ux * s);
          const hy = snap(cy + uy * s);
          ctx.fillRect(hx - px, hy - px, px * 3, px * 3);
        }
        for (let s = -15; s <= len; s += px) {
          const hx = snap(cx + ux * s);
          const hy = snap(cy + uy * s);
          ctx.fillStyle = s > len - 18 ? '#ffffff' : s % (px * 3) === 0 ? rimHex : mainHex;
          ctx.fillRect(hx, hy, px, px);
        }
      };

      drawSteppedClockHand(dome.hourHandDeg, R - 78, '#facc15', '#fef08a');
      drawSteppedClockHand(dome.minuteHandDeg, R - 38, '#2dd4bf', '#ffffff');

      ctx.fillStyle = '#050814';
      ctx.fillRect(cx - px * 2, cy - px * 2, px * 5, px * 5);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(cx - px, cy - px, px * 3, px * 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx, cy, px, px);
    }

    ctx.restore();
  }

  drawPhantomClonesPass(ctx, sprites, vfxSheet, renderer, inFrontPass = false) {
    const sheet = PixelForge.ensureImage(sprites?.sheet);
    if (!this.phantomClones.length || !sheet || !sheet.complete || !sheet.naturalWidth) return;

    for (const c of this.phantomClones) {
      if (Boolean(c.inFront) !== inFrontPass) continue;
      const u = clamp01Local(c.age / Math.max(0.05, c.maxLife));
      const alpha =
        c.holdUntilTimeStopEnd && this.state === 'TRUE_ULTIMATE' && this.stateTimer < 3.53
          ? 0.94
          : u < 0.12
            ? u / 0.12
            : Math.max(0, 1 - (u - 0.12) / 0.88);
      if (alpha <= 0.02) continue;

      const frameIdx =
        c.frameIdx !== null && c.frameIdx !== undefined
          ? c.frameIdx
          : c.startFrame +
            Math.min(
              Math.max(0, c.endFrame - c.startFrame),
              Math.floor(u * (c.endFrame - c.startFrame + 1))
            );

      const isPast = c.variant === 'past';
      const tintMain = isPast ? '#facc15' : '#2dd4bf';
      const tintRim = isPast ? '#fef08a' : '#99f6e4';

      if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
        const gearCol = Math.floor(this.chronoPhase * 12) % 30;
        this.drawBloomedVfxCell(
          ctx,
          vfxSheet,
          1,
          gearCol,
          c.x,
          c.y - 88,
          112,
          112,
          alpha * 0.68,
          c.facing < 0,
          renderer,
          isPast ? 'gold' : 'teal'
        );
      }

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(Math.round(c.x), Math.round(c.y + 4));
      ctx.scale(c.facing, 1);

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = alpha * 0.78;
      PixelForge.drawAfterimageFrame(ctx, sprites, frameIdx, 208, 208);

      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha * 0.34;
      PixelForge.drawSilhouetteFrame(ctx, sprites, frameIdx, 208, 208, tintMain);

      ctx.translate(-2, 0);
      ctx.globalAlpha = alpha * 0.18;
      PixelForge.drawSilhouetteFrame(ctx, sprites, frameIdx, 208, 208, tintRim);

      ctx.restore();
    }
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

        ctx.fillStyle = s.isGold ? '#b45309' : '#0f766e';
        ctx.fillRect(px - rad, py - rad, rad * 2, rad * 2);
        const mid = Math.max(2, rad - 2);
        ctx.fillStyle = s.isGold ? '#fde047' : '#2dd4bf';
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
    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    const sprites = this.getExSprites();
    const sheet = PixelForge.ensureImage(sprites?.sheet);
    const vfxSheet = PixelForge.ensureImage(sprites?.vfx);

    if (this.eternalZeroDome) {
      this.drawEternalZeroClockDome(ctx, vfxSheet, renderer);
    }

    this.fx?.renderLayer(ctx, 'back', arenaCenterX, this.groundY, 0.96);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    if (this.triHorologium && vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      const th = this.triHorologium;
      const pop = Math.min(1, th.life / 0.20);
      const fade = Math.min(1, (th.maxLife - th.life) * 3.2);
      const size = Math.round(332 * (0.8 + 0.2 * pop));
      const col = Math.floor(th.life * 24) % 30;
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        3,
        col,
        th.x,
        th.y,
        size,
        size,
        fade * 0.92,
        false,
        renderer,
        'teal'
      );
    }

    if (this.anchorActive && vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      const col = Math.floor(this.chronoPhase * 14) % 30;
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        1,
        col,
        this.anchorX,
        this.anchorY - 76,
        164,
        164,
        0.95,
        false,
        renderer,
        'gold'
      );

      const px = 3;
      const snap = (v) => Math.round(v / px) * px;
      const ax = snap(this.anchorX);
      const ay = snap(this.anchorY - 78);
      const bx = snap(this.x);
      const by = snap(this.y - 88);
      const dist = Math.hypot(bx - ax, by - ay);
      if (dist > 28) {
        const ux = (bx - ax) / dist;
        const uy = (by - ay) / dist;
        for (let d = 18; d < dist - 18; d += 21) {
          for (let s = 0; s < 12 && d + s < dist - 18; s += px) {
            const tx = snap(ax + ux * (d + s));
            const ty = snap(ay + uy * (d + s));
            ctx.fillStyle = '#050814';
            ctx.fillRect(tx - px, ty - px, px * 3, px * 3);
            ctx.fillStyle = s === 0 ? '#ffffff' : '#facc15';
            ctx.fillRect(tx, ty, px, px);
          }
        }
      }
    }

    if (this.stasisField && vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      const sf = this.stasisField;
      const u = sf.life / sf.maxLife;
      let col;
      if (sf.life < 0.24) {
        col = Math.min(6, Math.floor((sf.life / 0.24) * 7));
      } else if (sf.life < sf.maxLife - 0.28) {
        col = 7 + (Math.floor((sf.life - 0.24) * 18) % 15);
      } else {
        const su = (sf.life - (sf.maxLife - 0.28)) / 0.28;
        col = 22 + Math.min(7, Math.floor(su * 8));
      }
      const fade = u > 0.90 ? Math.max(0, (1 - u) / 0.10) : 1;
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        2,
        col,
        sf.x,
        sf.y - 102,
        224,
        224,
        fade * 0.90,
        false,
        renderer,
        'teal'
      );
    }

    if ((this.warpPortalTimer > 0 || this.isChronoWarp) && vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      const fade = Math.min(1, Math.max(0.15, this.warpPortalTimer / 0.22));
      const col = Math.floor(this.chronoPhase * 12) % 30;
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        3,
        col,
        this.warpOriginX,
        this.groundY - 94,
        160,
        160,
        fade * 0.86,
        false,
        renderer,
        'teal'
      );
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        3,
        col,
        this.warpTargetX,
        this.groundY - 94,
        172,
        172,
        fade * 0.90,
        true,
        renderer,
        'gold'
      );
    }

    if (this.temporalEchoes.length > 0 && sheet && sheet.complete && sheet.naturalWidth) {
      for (const ec of this.temporalEchoes) {
        const fade = Math.max(0, 1 - ec.life / ec.maxLife);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(Math.round(ec.x / 2) * 2, Math.round((ec.y + 4) / 2) * 2);
        ctx.scale(ec.facing, 1);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade * 0.44;
        PixelForge.drawSilhouetteFrame(ctx, sprites, ec.frameIdx, 208, 208, '#2dd4bf');
        ctx.restore();
      }
    }

    this.drawPhantomClonesPass(ctx, sprites, vfxSheet, renderer, false);

    if (!this.isDead && vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      const col = Math.floor(this.chronoPhase * 10) % 30;
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        1,
        col,
        this.x - this.facing * 42,
        this.y - 128 + Math.round(Math.sin(this.chronoPhase * 1.3) * 3) * 2,
        64,
        64,
        0.88,
        false,
        renderer,
        'teal'
      );
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        1,
        (col + 15) % 30,
        this.x + this.facing * 36,
        this.y - 146 + Math.round(Math.cos(this.chronoPhase * 1.3) * 3) * 2,
        56,
        56,
        0.88,
        true,
        renderer,
        'gold'
      );
    }

    if (this.activeVfxAnims.length > 0 && vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      for (const v of this.activeVfxAnims) {
        if (v.inFront) continue;
        const u = clamp01Local(v.age / v.maxLife);
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
          fade * 0.90,
          v.flipX,
          renderer,
          v.glowColor
        );
      }
    }

    ctx.restore();
  }

  drawUltimateForeground(ctx, renderer = null) {
    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    const sprites = this.getExSprites();
    const vfxSheet = PixelForge.ensureImage(sprites?.vfx);

    this.drawPhantomClonesPass(ctx, sprites, vfxSheet, renderer, true);

    this.fx?.renderLayer(ctx, 'front', arenaCenterX, this.groundY, 0.98);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    if (this._frozenEnemiesRef && this._frozenEnemiesRef.length > 0) {
      const px = 3;
      const snap = (v) => Math.round(v / px) * px;
      for (const foe of this._frozenEnemiesRef) {
        if (!foe || foe.isDead || !(foe.chronoTimeStopTimer > 0)) continue;
        const fx = snap(foe.x);
        const fy = snap(foe.y - 94);
        const r = 46;
        const arm = 15;
        for (const sx of [-1, 1]) {
          for (const sy of [-1, 1]) {
            const cx = fx + sx * r;
            const cy = fy + sy * r;
            const hx = sx < 0 ? cx : cx - arm;
            const vy = sy < 0 ? cy : cy - arm;
            ctx.fillStyle = '#050814';
            ctx.fillRect(hx - px, cy - px, arm + px * 3, px * 3);
            ctx.fillRect(cx - px, vy - px, px * 3, arm + px * 3);
            ctx.fillStyle = '#2dd4bf';
            ctx.fillRect(hx, cy, arm + px, px);
            ctx.fillRect(cx, vy, px, arm + px);
            ctx.fillStyle = '#fde047';
            ctx.fillRect(cx, cy, px, px);
          }
        }
      }
    }

    if (this.suspendedClockSpears.length > 0) {
      for (let i = 0; i < this.suspendedClockSpears.length; i++) {
        this.drawPixelClockSpear(ctx, this.suspendedClockSpears[i], vfxSheet, renderer);
      }
    }

    if (this.shatterClockShards.length > 0) {
      const px = 3;
      const snap = (v) => Math.round(v / px) * px;
      for (const sh of this.shatterClockShards) {
        const u = clamp01Local(sh.age / sh.maxLife);
        if (u >= 1) continue;
        const sx = snap(sh.x);
        const sy = snap(sh.y);
        const s = u > 0.65 ? px : px * 2;
        ctx.globalAlpha = 1 - u * 0.85;
        ctx.fillStyle = '#050814';
        ctx.fillRect(sx - s, sy - s, s * 3, s * 3);
        ctx.fillStyle = sh.isGold ? '#facc15' : '#2dd4bf';
        ctx.fillRect(sx - px, sy, s + px, px);
        ctx.fillRect(sx, sy - px, px, s + px);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx, sy, px, px);
      }
      ctx.globalAlpha = 1;
    }

    if (this.activeVfxAnims.length > 0 && vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      for (const v of this.activeVfxAnims) {
        if (!v.inFront) continue;
        const u = clamp01Local(v.age / v.maxLife);
        const span = Math.max(1, v.endFrame - v.startFrame + 1);
        const col = Math.min(29, v.startFrame + Math.floor(u * span));
        const fade = u < 0.10 ? u / 0.10 : u > 0.78 ? (1 - u) / 0.22 : 1.0;
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

    ctx.restore();

    if (this.razorScars.length > 0) {
      this.drawPixelRazorScars(ctx);
    }
  }

  draw(ctx, isReflection = false, renderer = null) {
    const sprites = this.getExSprites();
    if (!sprites) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const w = 208;
    const h = 208;
    const frameIdx = PixelForge.getFrameIndex(this, this.walkPhase);
    const groundPlantOffset = 4;

    if (
      !isReflection &&
      !this.isDead &&
      (this.state === 'DODGE' || this.state === 'JUMP' || this.state === 'DASH')
    ) {
      const trailSign = this.dashDir || this.facing;
      for (let g = 2; g >= 1; g--) {
        ctx.save();
        ctx.globalAlpha = g === 2 ? 0.16 : 0.28;
        ctx.translate(
          Math.round(this.x - trailSign * g * 22),
          Math.round(this.y + groundPlantOffset + (this.isFlipVault ? g * 4 : 0))
        );
        ctx.scale(this.facing, 1);
        PixelForge.drawAfterimageFrame(ctx, sprites, Math.max(0, frameIdx - g), w, h);
        ctx.restore();
      }
    }

    ctx.translate(Math.round(this.x), Math.round(this.y + groundPlantOffset));
    ctx.scale(this.facing, 1);

    PixelForge.drawSheetFrame(ctx, sprites, this, w, h, this.walkPhase, isReflection, renderer);

    ctx.restore();
  }
}

function clamp01Local(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
