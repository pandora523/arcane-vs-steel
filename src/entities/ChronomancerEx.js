import { Fighter } from './Fighter.js?v=30fps204';
import { PixelForge } from '../engine/PixelForge.js?v=30fps204';
import { PixelFont } from '../engine/PixelFont.js?v=30fps204';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps204';
import {
  CHRONO_EFFECT_REGISTRY,
  CHRONO_TEAL_PALETTE,
  CHRONO_BRASS_PALETTE
} from '../engine/shaders/chronoShaders.js?v=30fps204';

const wrapPaddedPen = (pen) =>
  new Proxy(pen, {
    get(target, prop) {
      if (prop === 'shadeBox') {
        return (x0, y0, x1, y1, fn) => target.shadeBox(x0 - 4, y0 - 4, x1 + 4, y1 + 4, fn);
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
          renderBack: inst.renderBack
            ? (pen, ...args) => inst.renderBack.call(inst, wrapPaddedPen(pen), ...args)
            : undefined,
          renderFront: inst.renderFront
            ? (pen, ...args) => inst.renderFront.call(inst, wrapPaddedPen(pen), ...args)
            : undefined
        };
      }
    }
  ])
);

const BAYER_4X4 = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5
];

const ROMAN_CLOCK_HOURS = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];

const AUTO_SLICES_EX = [
  [60, 8], // Beat 1 (V0, 0.36s): Coiled Minute-Glaive Diagonal Cleave -> snaps at F03 (63)
  [68, 7], // Beat 2 (V1, 0.34s): Reverse Twin-Blade X-Scissor + Cyan Paradox Clone -> snaps at F09 (69)
  [75, 8], // Beat 3 (V2, 0.38s): 2.5D Foreshortened XII-Dial Vortex Spin (2-hit) -> snaps at F17/F18 (77/78)
  [83, 7]  // Beat 4 (V3, 0.52s): Airborne Twelfth-Chime Guillotine Slam (3-hit + slow) -> snaps at F25 (85)
];

const BEAT_DURATIONS = [0.36, 0.34, 0.38, 0.52];
const INTRA_COMBO_LINK = 0.015;

const PARADOX_CRIMSON_PALETTE = [
  '#18061c',
  '#4a044e',
  '#86198f',
  '#be185d',
  '#e879f9',
  '#f472b6',
  '#fde047',
  '#ffffff'
];

/**
 * Crisp 4x4 Bayer-stippled pixel floor/rim halo (`lighter`, luminous colors, alpha <= 0.13, zero blurry radial blobs, zero ellipse primitives!).
 */
function drawChronoBayerHalo(ctx, cx, cy, rx, ry, outerHex, coreHex, alpha = 0.13) {
  if (alpha <= 0.01 || rx < 4 || ry < 3) return;
  const step = 4;
  const x0 = Math.floor((cx - rx) / step) * step;
  const x1 = Math.ceil((cx + rx) / step) * step;
  const y0 = Math.floor((cy - ry) / step) * step;
  const y1 = Math.ceil((cy + ry) / step) * step;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.min(0.13, alpha);
  for (let py = y0; py <= y1; py += step) {
    const ny = (py - cy) / ry;
    const ny2 = ny * ny;
    if (ny2 >= 1) continue;
    const by = ((py >> 2) & 3) << 2;
    for (let px = x0; px <= x1; px += step) {
      const nx = (px - cx) / rx;
      const d2 = nx * nx + ny2;
      if (d2 >= 1) continue;
      const falloff = 1 - d2;
      const thresh = (BAYER_4X4[by + ((px >> 2) & 3)] + 0.5) / 16;
      if (falloff * 0.92 > thresh) {
        ctx.fillStyle = d2 < 0.34 ? coreHex : outerHex;
        ctx.fillRect(px, py, step, step);
      }
    }
  }
  ctx.restore();
}

/**
 * Ultra-crisp 2-pass pixel-stepped temporal hairline (Pass 1 all 3px outer glow -> Pass 2 all 1-2px #ffffff core).
 * Guarantees ZERO overlapping `>>>>>>>` chevron stripes or fat 24px caterpillars!
 */
function drawTwoPassChronoHairline(ctx, x0, y0, x1, y1, outerHex, coreHex = '#ffffff', alpha = 0.94, coreSize = 2) {
  if (alpha <= 0.02) return;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.max(Math.abs(dx), Math.abs(dy));
  if (dist < 2) return;
  const steps = Math.max(2, Math.ceil(dist / 2));

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';

  // Pass 1: Entire outer 3px temporal glow line
  ctx.globalAlpha = Math.min(0.76, alpha * 0.72);
  ctx.fillStyle = outerHex;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const px = Math.round((x0 + dx * u) / 2) * 2;
    const py = Math.round((y0 + dy * u) / 2) * 2;
    ctx.fillRect(px - 1, py - 1, 3, 3);
  }

  // Pass 2: Entire inner 1px-2px white-hot core on top
  ctx.globalAlpha = Math.min(0.98, alpha);
  ctx.fillStyle = coreHex;
  const cSz = coreSize >= 2 ? 2 : 1;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const px = Math.round((x0 + dx * u) / 2) * 2;
    const py = Math.round((y0 + dy * u) / 2) * 2;
    ctx.fillRect(px, py, cSz, cSz);
  }

  ctx.restore();
}

/**
 * Asymmetric 4-frame anime horological hit-starburst (zero chevron bars!).
 */
function drawChronoHitStarburst(ctx, cx, cy, u, primaryHex = '#2dd4bf', accentHex = '#facc15') {
  const fade = 1 - u;
  if (fade <= 0.04) return;
  const snap = (v) => Math.round(v / 2) * 2;
  const sx = snap(cx);
  const sy = snap(cy);
  const longArm = Math.round((28 - u * 10) * (u < 0.16 ? u / 0.16 : 1));
  const shortArm = Math.round(longArm * 0.56);

  drawTwoPassChronoHairline(ctx, sx - longArm, sy + Math.round(longArm * 0.24), sx + longArm, sy - Math.round(longArm * 0.24), primaryHex, '#ffffff', fade, 2);
  drawTwoPassChronoHairline(ctx, sx - Math.round(shortArm * 0.24), sy - shortArm, sx + Math.round(shortArm * 0.24), sy + shortArm, accentHex, '#ffffff', fade * 0.92, 2);

  ctx.save();
  ctx.globalAlpha = Math.min(0.96, fade);
  ctx.fillStyle = accentHex;
  ctx.fillRect(sx - 4, sy - 2, 8, 4);
  ctx.fillRect(sx - 2, sy - 4, 4, 8);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(sx - 2, sy - 2, 4, 4);
  ctx.restore();
}

/**
 * Chronos EX (`chronomancer_ex`) - Newly-Born Paradox Clock-Blade Sovereign.
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
      maxHp: 3900,
      attackRange: 178,
      moveSpeed: 224,
      autoInterval: 0.92,
      lightColor: 'rgba(45, 212, 191, 1)',
      primaryColor: '#2dd4bf',
      hasTrueUltimate: true,
      trueUltName: 'ETERNAL ZERO: TWELFTH BELL CATACLYSM',
      trueUltDuration: 4.55
    });

    this.heroId = 'chronomancer_ex';
    this.theme = 'chrono';
    this.secondaryColor = '#facc15';
    this.deathSfx = 'death_chrono';
    this.hasPoise = true;

    this.autoDuration = BEAT_DURATIONS[0];
    this._postFlurryInterval = 1.33;
    this.skillMaxCooldown = 4.58;
    this.skillCooldown = 1.25;
    this.skillDuration = 1.08;
    this.skillTriggerRange = 435;
    this.skillName = 'CHRONO-SCHISM: HOURGLASS SCHISM';

    this.ultName = 'PARADOX CONVERGENCE: BROKEN TIMELINES';
    this.ultSub = 'PAST GOLD & FUTURE TEAL SHATTER';
    this.ultDuration = 1.72;

    this.hasTrueUltimate = true;
    this.trueUltName = 'ETERNAL ZERO: TWELFTH BELL CATACLYSM';
    this.trueUltSub = 'TWELVE-SPEAR TIME-STOP SHATTER';
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

    // Newly-Born Temporal Clones, 2-Pass Hairline Threads, Clockwork Motes & Horological Constructs
    this.phantomClones = [];
    this.temporalEchoes = [];
    this.rewindRibbons = [];
    this.activeVfxAnims = [];
    this.temporalThreads = [];
    this.hitStarbursts = [];
    this.chronoParticles = [];

    // Skill: Roman-Numeral XII Floor Dial & Paradox Hourglass Prism
    this.anchorActive = false;
    this.anchorX = this.x;
    this.anchorY = this.groundY;
    this.anchorHp = this.maxHp;
    this._skillStage = 0;
    this.stasisField = null;
    this.rewindPrismFlash = null;

    // Overdrive (`ULTIMATE`): Trinity of Broken Timelines & Giant Escapement Pendulum Seal
    this._ultStage = 0;
    this._ultTargetX = this.x;
    this.pendulumSeal = null;

    // Supreme Ultimate (`TRUE_ULTIMATE`): Eternal Zero: Cathedral of the Twelfth Bell
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

    this.fx = new ArcaneShaderFX(CHRONO_EX_EFFECT_REGISTRY, {
      pixelScale: 3,
      viewW: 640,
      viewH: 460,
      topRatio: 0.70
    });

    if (typeof Image !== 'undefined') {
      PixelForge.ensureHeroLoaded?.('chronomancer_ex');
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
      sweetMin: 152,
      sweetMax: 222,
      counterCrouchBias: 0.58,
      midLeapMin: 230,
      midLeapMax: 340,
      midLeapChance: 0.30,
      postStyle: 'chrono'
    };
  }

  applySovereignAspectStats(aspect) {
    if (aspect === 1) {
      this.maxHp = 3670;
      this.hp = this.maxHp;
      this.moveSpeed = 235;
      this._postFlurryInterval = 1.28;
    } else if (aspect === 2) {
      this.maxHp = 3800;
      this.hp = this.maxHp;
      this.moveSpeed = 209;
      this.dodgeMaxCooldown = 2.88;
      this._postFlurryInterval = 1.42;
    }
  }

  isHackAndSlashMelee() {
    return true;
  }

  isCrossSlashDuelist() {
    return true;
  }

  getExSprites() {
    if (typeof Image === 'undefined') return null;
    PixelForge.ensureHeroLoaded?.('chronomancer_ex');
    return PixelForge.initAssets()?.chronomancer_ex || null;
  }

  _safeFxX(xv, game) {
    const g = game || this.game;
    const ww = g?.renderer ? g.renderer.worldWidth : 1200;
    return Math.max(48, Math.min(ww - 48, xv));
  }

  _safeFxY(yv) {
    return Math.max(58, Math.min(this.groundY + 20, yv));
  }

  spawnChronoParticle(kind, x, y, vx, vy, maxLife, color, accent = '#ffffff', size = 3) {
    if (this.chronoParticles.length >= 96) this.chronoParticles.shift();
    this.chronoParticles.push({
      kind, // 'star4' | 'cog' | 'prism'
      x,
      y,
      vx,
      vy,
      age: 0,
      maxLife,
      color,
      accent,
      size
    });
  }

  spawnClockworkBurst(cx, cy, count = 7, variant = 'teal') {
    const colMain =
      variant === 'gold' ? '#facc15' : variant === 'violet' ? '#e879f9' : '#2dd4bf';
    const colAcc =
      variant === 'gold' ? '#fef08a' : variant === 'violet' ? '#fb7185' : '#99f6e4';
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + (i % 2) * 0.22;
      const spd = 46 + (i % 4) * 34;
      const kind = i % 3 === 0 ? 'star4' : i % 2 === 0 ? 'cog' : 'prism';
      this.spawnChronoParticle(
        kind,
        cx + Math.cos(ang) * 6,
        cy + Math.sin(ang) * 6,
        Math.cos(ang) * spd,
        Math.sin(ang) * spd - 26,
        0.38 + (i % 3) * 0.10,
        colMain,
        colAcc,
        i % 3 === 0 ? 4 : 3
      );
    }
  }

  spawnTemporalThread(x0, y0, x1, y1, maxLife = 0.26, colorHex = '#2dd4bf', coreSize = 2) {
    if (this.temporalThreads.length >= 26) this.temporalThreads.shift();
    this.temporalThreads.push({
      x0: Math.round(x0),
      y0: Math.round(y0),
      x1: Math.round(x1),
      y1: Math.round(y1),
      age: 0,
      maxLife,
      colorHex,
      coreSize
    });
  }

  spawnHitStarburst(cx, cy, maxLife = 0.18, primaryHex = '#2dd4bf', accentHex = '#facc15') {
    if (this.hitStarbursts.length >= 18) this.hitStarbursts.shift();
    this.hitStarbursts.push({
      x: Math.round(cx),
      y: Math.round(cy),
      age: 0,
      maxLife,
      primaryHex,
      accentHex
    });
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
      this._skillVoiceFired = false;
    } else if (prevState === 'SKILL' && this.anchorActive) {
      this.anchorActive = false;
    }

    if (newState === 'ULTIMATE') {
      this._ultStage = 0;
      this._ultVoiceFired = false;
      this.isInvulnerable = true;
    } else if (prevState === 'ULTIMATE') {
      this.pendulumSeal = null;
      if (newState !== 'TRUE_ULTIMATE') {
        this.isInvulnerable = false;
        this.y = this.groundY;
        this.vy = 0;
        this.cameraAirLift = 0;
      }
    }

    if (newState === 'TRUE_ULTIMATE') {
      this._trueUltInit = false;
      this._trueUltStage = 0;
      this._trueUltTickStage = 0;
      this._trueUltBarrageCount = 0;
      this._trueUltChargeVoiceFired = false;
      this._trueUltFireVoiceFired = false;
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
      this.vy = 0;
      this.cameraAirLift = 0;
    }

    if (newState === 'DEATH') {
      this._cleanupChronoFxState();
    }
  }

  onDeath() {
    this._cleanupChronoFxState();
  }

  _cleanupChronoFxState() {
    this._releaseAllTimeStoppedEnemies();
    this.fx?.clear();
    this.activeVfxAnims = [];
    this.phantomClones = [];
    this.temporalEchoes = [];
    this.anchorActive = false;
    this.stasisField = null;
    this.rewindPrismFlash = null;
    this.pendulumSeal = null;
    this.eternalZeroDome = null;
    this.suspendedClockSpears = [];
    this.shatterClockShards = [];
    this.temporalThreads.length = 0;
    this.hitStarbursts.length = 0;
    this.trueUltFrameOverride = null;
    this._overrideFrameIdx = null;
    this.unstoppablePoise = false;
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
      const vsAspect = this.game?.isAdventureMode?.() ? 0 : this.buildAspect || 0;
      const auraPal =
        vsAspect === 1
          ? PARADOX_CRIMSON_PALETTE
          : vsAspect === 2
            ? CHRONO_BRASS_PALETTE
            : CHRONO_TEAL_PALETTE;
      this.fx.spawn('chronoAstrolabeAura', this._safeFxX(this.x), this._safeFxY(this.y - 102), {
        follow: this,
        offsetX: 0,
        offsetY: -102,
        flip: this.facing < 0,
        palette: auraPal,
        light: 1.12
      });
    }
  }

  _beginComboBeat(beatIdx, game) {
    const v = ((beatIdx % 4) + 4) % 4;
    this._autoVariant = v;
    this._currentAutoStage = v;
    this.comboStep = (v + 1) % 4;
    this.autoDuration = BEAT_DURATIONS[v];
    this.stateTimer = 0;
    this._intraLinkTimer = 0;
    this._beatHitMask = 0;
    this._beatLandedHit = false;
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
    const baseStep = v === 0 ? 36 : v === 2 ? 24 : 18;
    let stepDist = baseStep;
    if (enemy && !enemy.isDead) {
      const frontDist = (enemy.x - this.x) * this.facing;
      if (frontDist > 0) {
        const minClear = v === 2 ? 116 : 120;
        stepDist = Math.max(0, Math.min(baseStep, frontDist - minClear));
      }
    }
    const desiredX = this.x + this.facing * stepDist;
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

  /**
   * Manifests a crisp HD-2D Temporal Paradox Mirage (`'past'` Amber-Gold `#facc15`,
   * `'future'` Turquoise `#2dd4bf`, or `'future_violet'` Crimson-Violet `#e879f9`).
   * Rendered strictly with un-rotated wide-canvas sprite cells (`ZERO canvas rotation`!).
   */
  spawnPhantomClone(x, y, facing, variant = 'future', opts = {}) {
    if (this.phantomClones.length >= 16) {
      this.phantomClones.shift();
    }
    const normVariant =
      variant === 'past' ? 'past' : variant === 'future_violet' ? 'future_violet' : 'future';
    const clone = {
      x: Math.round(x),
      y: Math.round(y),
      vx: opts.vx || 0,
      vy: opts.vy || 0,
      facing: facing >= 0 ? 1 : -1,
      variant: normVariant,
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

    this.spawnClockworkBurst(
      clone.x,
      clone.y - 92,
      5,
      normVariant === 'past' ? 'gold' : normVariant === 'future_violet' ? 'violet' : 'teal'
    );
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
      maxLife: 0.40
    });
  }

  spawnRewindRibbons(fromX, fromY) {
    for (let i = 0; i < 4; i++) {
      this.rewindRibbons.push({
        startX: fromX + (i - 1.5) * 16,
        startY: fromY + (i % 2 === 0 ? -18 : 18),
        arcHeight: (i % 2 === 0 ? -1 : 1) * (32 + i * 10),
        life: -i * 0.025,
        maxLife: 0.42,
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
   * Applies crunchy FFBE / Last Cloudia hit-stop (`42-58ms`), target `_hitShakeTimer`,
   * 2-pass ultra-thin temporal hairlines (`0` chevron bars!), and 4-frame anime hit-starbursts!
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
      scarDx = 96,
      scarDy = 72,
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
      const threadCol = isGold ? '#facc15' : '#2dd4bf';
      this.spawnTemporalThread(
        hitX - this.facing * scarDx * 0.42,
        hitY - scarDy * 0.42,
        hitX + this.facing * scarDx * 0.42,
        hitY + scarDy * 0.42,
        0.18,
        threadCol,
        1
      );
      this.spawnHitStarburst(
        hitX,
        hitY,
        0.18,
        isGold ? '#facc15' : '#2dd4bf',
        isGold ? '#2dd4bf' : '#fde047'
      );
      this.spawnVfxAnim(vfxRow, hitX, hitY, 180, 180, 0.22, {
        flipX: this.facing < 0,
        glowColor: isGold ? 'gold' : 'teal',
        inFront: true
      });
      this.spawnClockworkBurst(hitX, hitY, isCrit ? 6 : 4, isGold ? 'gold' : 'teal');
      landedAny = true;
    }

    if (landedAny) {
      this._beatLandedHit = true;
      if (hitStop > 0) {
        this._hitStopTimer = Math.max(this._hitStopTimer || 0, hitStop);
        game?.renderer?.triggerHitStop?.(hitStop * 0.65);
      }
    }

    return landedAny;
  }

  onProjectileTrail(p) {
    if (p.type !== 'clock_gear') return;
    if ((p.ringTimer || 0) >= 0.05) {
      p.ringTimer = 0;
      const dir = Math.sign(p.vx || 1);
      this.spawnChronoParticle('cog', p.x - dir * 14, p.y, -dir * 34, -12, 0.22, '#2dd4bf', '#facc15', 3);
    }
  }

  onProjectileHit(p, hitTarget, isCrit, game) {
    const hx = hitTarget ? hitTarget.x : p.x;
    const hy = hitTarget ? hitTarget.y - 96 : p.y;
    const hitAngle = Math.atan2(p.vy || 0, p.vx || 1);
    this.fx?.spawn('temporalCrescentRift', this._safeFxX(hx, game), this._safeFxY(hy), {
      flip: (p.vx || 1) < 0,
      palette: isCrit ? CHRONO_BRASS_PALETTE : CHRONO_TEAL_PALETTE,
      light: isCrit ? 1.26 : 1.14,
      extra: {
        aimAngle: hitAngle,
        isGold: isCrit,
        radius: isCrit ? 26 : 22,
        width: isCrit ? 10 : 8
      }
    });
    this.spawnHitStarburst(hx, hy, 0.20, isCrit ? '#facc15' : '#2dd4bf', '#ffffff');
    this.spawnVfxAnim(4, hx, hy, isCrit ? 192 : 168, isCrit ? 192 : 168, 0.26, {
      flipX: (p.vx || 1) < 0,
      glowColor: isCrit ? 'gold' : 'teal',
      inFront: true
    });
    return true;
  }

  takeDamage(amount, attacker, isCrit = false, knockX = 95, knockY = 0) {
    super.takeDamage(amount, attacker, isCrit, knockX, knockY);
    if (this.isDead && !this._deathBurstTriggered) {
      this._deathBurstTriggered = true;
      this._releaseAllTimeStoppedEnemies();
      this.fx?.stopByKey('chronoAstrolabeAura');
      this.fx?.spawn('warpPortalPairRift', this._safeFxX(this.x), this._safeFxY(this.groundY - 78), {
        palette: CHRONO_BRASS_PALETTE,
        light: 1.18,
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
    this.jumpCooldown = 2.8;
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
      if (dist < 175 && dir === (enemy.x >= this.x ? 1 : -1)) {
        const crossSign = this.x < enemy.x ? 1 : -1;
        const crossTravel = Math.min(230, Math.max(155, dist + 92));
        let target = this.x + crossSign * crossTravel;
        if (target < 135 || target > ww - 135) {
          target = this.x - crossSign * 185;
        }
        this.flipTargetX = this.clampArenaX(target, game, 115);
      } else {
        let jumpDist = 205;
        if (dir === (enemy.x >= this.x ? 1 : -1) && dist > 136 && dist < 320) {
          jumpDist = Math.min(200, Math.max(100, dist - 132));
        }
        this.flipTargetX = this.clampArenaX(this.x + dir * jumpDist, game, 115);
      }
      this.dashDir = Math.sign(this.flipTargetX - this.flipStartX) || dir;
    } else {
      this.flipTargetX = this.clampArenaX(this.x + dir * 210, game, 115);
      this.dashDir = dir;
    }

    this.dashDuration = 0.56;
    this.vx = 0;
    this.vy = 0;
    this.spawnTemporalEcho(PixelForge.getFrameIndex(this, this.walkPhase));
    this.fx?.spawn('warpPortalPairRift', this._safeFxX(this.x, game), this._safeFxY(this.y - 88), {
      flip: this.facing < 0,
      palette: CHRONO_TEAL_PALETTE,
      light: 1.16,
      extra: { isArrival: false }
    });
    if (game?.audio) game.audio.play('time_rewind', this.x);
    game?.vfx?.spawnShockwave?.(this.x, this.groundY, 92, '#2dd4bf', 0.28, true);
    game?.vfx?.spawnDamageText?.(this.x, this.y - 134, 0, false, 'TIME-GLIDE VAULT!', '#2dd4bf');
  }

  startCrouch(_enemy, game) {
    const vsAspect = game?.isAdventureMode?.() ? 0 : this.buildAspect || 0;
    this.crouchCooldown = 3.1;
    this.crouchDuration = 0.90;
    this.setState('CROUCH');
    this.isCrouching = true;
    this.isDeflecting = true;
    this.vx = 0;
    if (vsAspect === 2) {
      this.grantBuildShield(48, 2.3, 'CHRONO BARRIER!', '#2dd4bf');
    }
    this.fx?.spawn('warpPortalPairRift', this._safeFxX(this.x + this.facing * 36, game), this._safeFxY(this.y - 90), {
      follow: this,
      offsetX: 36,
      offsetY: -90,
      flip: this.facing < 0,
      palette: vsAspect === 1 ? PARADOX_CRIMSON_PALETTE : CHRONO_BRASS_PALETTE,
      light: 1.18,
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
    this._dashStartX = this.x;
    this._dashMaxTravel = 185;
    this.facing = this.dashDir;
    this.vx = this.dashDir * 550;
    this.spawnTemporalEcho(PixelForge.getFrameIndex(this, this.walkPhase));
    this.fx?.spawn('temporalCrescentRift', this._safeFxX(this.x, game), this._safeFxY(this.y - 94), {
      follow: this,
      offsetX: 16,
      offsetY: -94,
      flip: this.dashDir < 0,
      palette: CHRONO_TEAL_PALETTE,
      light: 1.16,
      extra: { isGold: false, radius: 24, width: 7 }
    });
    if (game?.audio) game.audio.play('time_rewind', this.x);
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

    if (enemy && !enemy.isDead && (dist < 250 || nearWall)) {
      const vsAspect = game?.isAdventureMode?.() ? 0 : this.buildAspect || 0;
      this.isChronoWarp = true;
      this.didChronoWarp = false;
      this.dashDuration = 0.38;
      this.warpPortalTimer = 0.48;
      this.warpOriginX = this.x;
      this.vx = 0;
      if (vsAspect === 2) {
        this.grantBuildShield(38, 2.0, 'ASTROLABE SLIP!', '#facc15');
      }

      const crossSign = this.x < enemy.x ? 1 : -1;
      let targetX = enemy.x + crossSign * 120;
      if (targetX < 130 || targetX > ww - 130) {
        targetX = enemy.x - crossSign * 126;
      }
      this.warpTargetX = this.clampArenaX(targetX, game, 115);
      this.dashDir = Math.sign(this.warpTargetX - this.warpOriginX) || 1;

      this.fx?.spawn('warpPortalPairRift', this._safeFxX(this.warpOriginX, game), this._safeFxY(this.groundY - 94), {
        flip: this.facing < 0,
        palette: vsAspect === 1 ? PARADOX_CRIMSON_PALETTE : CHRONO_TEAL_PALETTE,
        light: 1.20,
        extra: { isArrival: false }
      });
      this.spawnPhantomClone(
        this.warpOriginX,
        this.groundY,
        this.facing,
        vsAspect === 1 ? 'future_violet' : 'past',
        {
          frameIdx: 184,
          maxLife: 0.34
        }
      );

      game?.vfx?.spawnShockwave?.(this.x, this.groundY, 112, '#2dd4bf', 0.30, true);
      game?.vfx?.spawnDamageText?.(this.x, this.y - 156, 0, false, 'PARADOX SLIP!', '#facc15');
      return;
    }

    this.isChronoWarp = false;
    this.dashDuration = 0.36;
    const smartDir = this.x < 220 ? 1 : this.x > ww - 220 ? -1 : dir;
    this.dashDir = smartDir;
    this.vx = smartDir * 390;
    this.spawnClockworkBurst(this.x, this.y - 88, 5, 'teal');
  }

  updateDashOrDodge(dt, enemy, game) {
    const t = this.stateTimer;

    if ((this.state === 'JUMP' || this.state === 'DODGE') && this.isFlipVault) {
      const u = Math.min(1, t / (this.dashDuration || 0.56));
      this.x = this.flipStartX + (this.flipTargetX - this.flipStartX) * (1 - Math.pow(1 - u, 1.8));
      this.y = this.groundY - Math.sin(u * Math.PI) * 92;
      this.flipAngle = 0;

      if (u >= 0.50 && !this.didActionFrame) {
        this.didActionFrame = true;
        this.fx?.spawn('chronoTimeRiftSlash', this._safeFxX(this.x + this.facing * 64, game), this._safeFxY(this.y - 78), {
          flip: this.facing < 0,
          palette: CHRONO_TEAL_PALETTE,
          light: 1.18,
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
        this.fx?.spawn('warpPortalPairRift', this._safeFxX(this.x, game), this._safeFxY(this.groundY - 94), {
          flip: this.facing < 0,
          palette: CHRONO_BRASS_PALETTE,
          light: 1.20,
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

    if (this.state === 'DASH') {
      const dir = this.dashDir || this.facing;
      const traveled = (this.x - (this._dashStartX ?? this.x)) * dir;
      const distToEnemy = enemy && !enemy.isDead ? (enemy.x - this.x) * dir : 999;
      if (t < (this.dashDuration || 0.36) * 0.78) {
        if (traveled >= (this._dashMaxTravel || 185) || (distToEnemy <= 136 && distToEnemy >= 55)) {
          this.vx = 0;
        } else {
          this.vx = dir * 550;
          this.x = this.clampArenaX(this.x + this.vx * dt, game, 80);
        }
      } else {
        this.vx = 0;
      }

      if (!this.didActionFrame && enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= 162) {
        this.fx?.spawn('chronoTimeRiftSlash', this._safeFxX(enemy.x, game), this._safeFxY(enemy.y - 94), {
          flip: this.facing < 0,
          light: 1.18,
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
      this.fx?.spawn('chronoTimeRiftSlash', this._safeFxX(spawnX, game), this._safeFxY(spawnY), {
        flip: this.facing < 0,
        palette: CHRONO_BRASS_PALETTE,
        light: 1.20,
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
  // MAIN FRAME UPDATE
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

    for (let i = this.temporalThreads.length - 1; i >= 0; i--) {
      this.temporalThreads[i].age += dt;
      if (this.temporalThreads[i].age >= this.temporalThreads[i].maxLife) {
        this.temporalThreads.splice(i, 1);
      }
    }

    for (let i = this.hitStarbursts.length - 1; i >= 0; i--) {
      this.hitStarbursts[i].age += dt;
      if (this.hitStarbursts[i].age >= this.hitStarbursts[i].maxLife) {
        this.hitStarbursts.splice(i, 1);
      }
    }

    for (let i = this.chronoParticles.length - 1; i >= 0; i--) {
      const p = this.chronoParticles[i];
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === 'prism') {
        p.vy += 65 * dt;
      }
      if (p.age >= p.maxLife) {
        this.chronoParticles.splice(i, 1);
      }
    }

    if (this.rewindPrismFlash) {
      this.rewindPrismFlash.age += dt;
      if (this.rewindPrismFlash.age >= this.rewindPrismFlash.maxLife) {
        this.rewindPrismFlash = null;
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
      if (c.vx) c.x += c.vx * dt;
      if (c.vy) c.y += c.vy * dt;
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
      if (rr.life >= 0) {
        rr.sparkTimer = (rr.sparkTimer || 0) + dt;
        if (rr.sparkTimer >= 0.05) {
          rr.sparkTimer = 0;
          const u = Math.min(1, rr.life / rr.maxLife);
          const rx = rr.startX + (this.x - rr.startX) * u;
          const ry =
            rr.startY + (this.y - 98 - rr.startY) * u + Math.sin(u * Math.PI) * rr.arcHeight;
          this.spawnChronoParticle('star4', rx, ry, 0, -14, 0.20, '#2dd4bf', '#facc15', 3);
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

    if (this.pendulumSeal) {
      this.pendulumSeal.life += dt;
      if (this.pendulumSeal.life >= this.pendulumSeal.maxLife) {
        this.pendulumSeal = null;
      }
    }

    const inMidCombo =
      (this._aiComboCount || 0) > 0 && (this._aiComboChainTimer || 0) > 0;
    if (
      !this.isBenched &&
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

      if ((pinnedLeft || pinnedRight) && dist < 250 && this.dodgeCooldown <= 50) {
        if (this.dodgeCooldown <= 0) {
          this.startDodge(enemy, game);
          return;
        }
        if ((this.jumpCooldown || 0) <= 0 && this.wallFlipCooldown <= 0) {
          this.startJump(enemy, game);
          return;
        }
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
          this.spawnChronoParticle('cog', this.x - this.facing * 26, this.groundY - 4, -this.facing * 24, -18, 0.20, '#2dd4bf', '#facc15', 3);
        }
      }
    } else if (!this._bootsPlanted) {
      this._bootsPlanted = true;
      this.x = this._beatTargetX;
      this.vx = 0;
    }

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

    const vsAspect = game?.isAdventureMode?.() ? 0 : this.buildAspect || 0;
    const dmgMult = vsAspect === 1 ? 1.09 : vsAspect === 2 ? 0.88 : 1.0;
    const slashPal = vsAspect === 1 ? PARADOX_CRIMSON_PALETTE : CHRONO_TEAL_PALETTE;

    if (v === 0) {
      if ((this._beatHitMask & 1) === 0 && t >= 0.10) {
        this._beatHitMask |= 1;
        const slashX = this.x + this.facing * 72;
        const slashY = this.y - 92;
        if (vsAspect === 1) {
          this.spawnPhantomClone(this.clampArenaX(this.x - this.facing * 26, game, 80), this.groundY, this.facing, 'future_violet', {
            startFrame: 60,
            endFrame: 66,
            maxLife: 0.34,
            inFront: false
          });
        }
        game?.vfx?.spawnShockwave?.(this.x + this.facing * 42, this.groundY - 4, 58, vsAspect === 1 ? '#e879f9' : '#2dd4bf', 0.20, false, true);
        this.fx?.spawn('chronoTimeRiftSlash', this._safeFxX(slashX, game), this._safeFxY(slashY), {
          flip: this.facing < 0,
          palette: slashPal,
          light: 1.18,
          extra: { cross: false, angle: 0.30, radius: 32 }
        });
        this.spawnVfxAnim(0, slashX, slashY, 172, 172, 0.22, {
          flipX: this.facing < 0,
          glowColor: 'teal',
          inFront: true
        });
        this._applyChronoExStrike(enemy, game, {
          damage: vsAspect === 0 ? 28 : Math.round(28 * dmgMult),
          reachFront: 164,
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
      if ((this._beatHitMask & 1) === 0 && t >= 0.06) {
        this._beatHitMask |= 1;
        const inRangeEnemy = enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= 178 ? enemy : null;
        const strikeX = inRangeEnemy ? inRangeEnemy.x : this.clampArenaX(this.x + this.facing * 92, game, 85);
        const strikeY = inRangeEnemy ? inRangeEnemy.groundY || inRangeEnemy.y : this.groundY;
        const cloneX = this.clampArenaX(strikeX + this.facing * 78, game, 82);

        this.spawnPhantomClone(
          cloneX,
          strikeY,
          -this.facing,
          vsAspect === 1 ? 'future_violet' : 'future',
          {
            startFrame: 68,
            endFrame: 74,
            maxLife: 0.42,
            inFront: false
          }
        );
        this.fx?.spawn('warpPortalPairRift', this._safeFxX(cloneX, game), this._safeFxY(strikeY - 94), {
          flip: this.facing > 0,
          palette: slashPal,
          light: 1.16,
          extra: { isArrival: true }
        });
        this.fx?.spawn('chronoTimeRiftSlash', this._safeFxX(strikeX, game), this._safeFxY(strikeY - 94), {
          flip: this.facing < 0,
          palette: slashPal,
          light: 1.22,
          extra: { cross: true, radius: 32 }
        });
        game?.vfx?.spawnDamageText?.(
          strikeX,
          strikeY - 154,
          0,
          false,
          'PARADOX PINCER!',
          vsAspect === 1 ? '#e879f9' : '#2dd4bf'
        );
        if (game?.audio) game.audio.play('time_rewind', cloneX);

        this._applyChronoExStrike(enemy, game, {
          damage: vsAspect === 0 ? 30 : Math.round(30 * dmgMult),
          reachFront: 170,
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
      if ((this._beatHitMask & 1) === 0 && t >= 0.08) {
        this._beatHitMask |= 1;
        this.fx?.spawn('chronoTimeRiftSlash', this._safeFxX(this.x + this.facing * 72, game), this._safeFxY(this.y - 88), {
          flip: this.facing < 0,
          palette: slashPal,
          light: 1.18,
          extra: { cross: false, angle: -0.05, radius: 34 }
        });
        this._applyChronoExStrike(enemy, game, {
          damage: vsAspect === 0 ? 20 : Math.round(20 * dmgMult),
          reachFront: 170,
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
        this.fx?.spawn('chronoTimeRiftSlash', this._safeFxX(this.x + this.facing * 76, game), this._safeFxY(this.y - 92), {
          flip: this.facing > 0,
          palette: vsAspect === 1 ? PARADOX_CRIMSON_PALETTE : CHRONO_BRASS_PALETTE,
          light: 1.20,
          extra: { cross: true, radius: 34 }
        });
        this._applyChronoExStrike(enemy, game, {
          damage: vsAspect === 0 ? 22 : Math.round(22 * dmgMult),
          reachFront: 172,
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
      const slowDurV3 = vsAspect === 2 ? 1.65 : 1.20;
      if ((this._beatHitMask & 1) === 0 && t >= 0.16) {
        this._beatHitMask |= 1;
        const slamX = this.x + this.facing * 84;
        const slamY = this.groundY - 92;
        game?.renderer?.triggerShake?.(12, 0.22);
        if (game?.audio) game.audio.play('chrono_hit', slamX);
        game?.audio?.playHeroVoice?.(this.heroId, 'attack', {
          worldX: this.x,
          speakerKey: this,
          priority: 1,
          cooldownMs: 3600
        });
        game?.vfx?.spawnShockwave?.(slamX, this.groundY - 4, 98, '#fde047', 0.28, false, true);
        game?.vfx?.spawnDamageText?.(slamX, slamY - 62, 0, true, 'XII CHIME!', '#fde047');
        this.gainMana(6.5);

        this.fx?.spawn('chronoTimeRiftSlash', this._safeFxX(slamX, game), this._safeFxY(slamY), {
          flip: this.facing < 0,
          palette: vsAspect === 1 ? PARADOX_CRIMSON_PALETTE : CHRONO_BRASS_PALETTE,
          light: 1.24,
          extra: { cross: true, radius: 36 }
        });
        this.spawnVfxAnim(7, slamX, slamY, 208, 208, 0.32, {
          flipX: this.facing < 0,
          glowColor: 'gold',
          inFront: true
        });
        if (vsAspect === 1) {
          game?.vfx?.spawnProjectile?.({
            x: slamX,
            y: this.groundY - 78,
            vx: this.facing * 720,
            vy: 0,
            radius: 18,
            damage: 18,
            color: '#e879f9',
            coreColor: '#fde047',
            owner: this,
            type: 'clock_gear',
            pierce: true
          });
        }
        this._applyChronoExStrike(enemy, game, {
          damage: vsAspect === 0 ? 26 : Math.round(26 * dmgMult),
          reachFront: 176,
          hitStop: 0.058,
          shakeDur: 0.082,
          knockX: 34,
          knockY: -44,
          isCrit: true,
          scarDx: 26,
          scarDy: 136,
          isGold: true,
          slowDur: slowDurV3,
          vfxRow: 5,
          sfx: 'heavy_cleave'
        });
      }
      if ((this._beatHitMask & 2) === 0 && t >= 0.21) {
        this._beatHitMask |= 2;
        this._applyChronoExStrike(enemy, game, {
          damage: vsAspect === 0 ? 18 : Math.round(18 * dmgMult),
          reachFront: 178,
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
          damage: vsAspect === 0 ? 24 : Math.round(24 * dmgMult),
          reachFront: 180,
          hitStop: 0,
          shakeDur: 0.056,
          knockX: 118,
          knockY: -86,
          isCrit: true,
          scarDx: 102,
          scarDy: -84,
          isGold: true,
          slowDur: slowDurV3,
          vfxRow: 5,
          sfx: 'slash'
        });
      }
    }

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
      const relEnemyX = enemy && !enemy.isDead ? (enemy.x - this.x) * this.facing : 999;
      const aiWantsChain =
        !isManualPlayer &&
        enemy &&
        !enemy.isDead &&
        !enemy.isInvulnerable &&
        relEnemyX >= -36 &&
        relEnemyX <= 178 &&
        (this._beatLandedHit || relEnemyX <= 156);

      if (v < 3 && (this._queuedNextBeat || aiWantsChain || advHoldingAttack)) {
        this._queuedNextBeat = false;
        if (game?.adventure?.queuedAction === 'attack') {
          game.adventure.queuedAction = null;
        }
        this._intraLinkTimer = INTRA_COMBO_LINK;
        return;
      }

      if (v === 3 || (!isManualPlayer && !this._beatLandedHit && !advHoldingAttack)) {
        this.comboStep = 0;
        this._aiComboReadyFinisher = v === 3 ? 0.92 : 0;
        this._aiOutstepTimer =
          !game?.isAdventureMode?.() && enemy && Math.abs(enemy.x - this.x) < 214
            ? 0.54 + Math.random() * 0.26
            : 0;
        this._aiOutstepDir = -1;
        this.autoCooldown = isManualPlayer
          ? 0.06
          : v === 3
            ? this._postFlurryInterval * (0.98 + Math.random() * 0.22)
            : 0.50 + Math.random() * 0.26;
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
  // NEWLY BORN SKILL - `PARADOX HOURGLASS SCHISM` (`1.08s`, `4.58s` CD)
  // Stamps a glowing Roman-Numeral XII Floor Dial, executes a Twin-Blade +
  // Future-Clone pincer slice, and rewinds through a turquoise-gold temporal prism!
  // ============================================================================

  /**
   * SKILL (`1.08s`, `4.58s` CD): `CHRONO-SCHISM: HOURGLASS SCHISM` (Temporal Rewind)
   * Opens a luminous horological warp rift, launches twin clock-hand spears + Hourglass Stasis,
   * and snaps Chronos EX back in a golden rewind echo!
   */
  updateSkill(_dt, enemy, game) {
    const t = this.stateTimer;
    const vsSkill = game?.isAdventureMode?.() ? 0 : this.buildSkill || 0;
    if (!this._skillVoiceFired) {
      this._skillVoiceFired = true;
      game?.audio?.playHeroVoice?.(this.heroId, vsSkill === 1 ? 'skill_alt' : 'skill_std', {
        worldX: this.x,
        speakerKey: this,
        priority: 2,
        cooldownMs: 400,
        duckSfx: true
      });
    }
    this.vx *= 0.82;

    const foes = this.getActiveEnemies(enemy, game);
    const primary = enemy && !enemy.isDead ? enemy : foes[0] || null;

    if (this._skillStage === 0) {
      this._skillStage = 1;
      this.isDeflecting = true;
      this.anchorX = this.x;
      this.anchorY = this.groundY;
      this.anchorHp = this.hp;
      this.anchorActive = vsSkill !== 1;
      // Commit directional warp target at startup (capped <= 265px — zero cross-map teleport snap!)
      const skillDir = primary ? Math.sign(primary.x - this.x) || this.facing || 1 : this.facing || 1;
      const rawDist = primary ? Math.abs(primary.x - this.x) : 185;
      this._skillDir = skillDir;
      this._skillCommittedTargetX = this.clampArenaX(
        this.anchorX + skillDir * Math.min(265, Math.max(120, rawDist)),
        game,
        105
      );

      if (game?.audio) game.audio.play('time_rewind', this.x);
      this.fx?.spawn('warpPortalPairRift', this._safeFxX(this.anchorX, game), this._safeFxY(this.groundY - 88), {
        flip: this.facing < 0,
        palette: vsSkill === 1 ? PARADOX_CRIMSON_PALETTE : CHRONO_BRASS_PALETTE,
        light: 1.22,
        extra: { isArrival: false }
      });
      this.spawnVfxAnim(3, this.anchorX, this.groundY - 88, 176, 176, 0.42, {
        glowColor: 'gold',
        inFront: false
      });
      this.spawnClockworkBurst(this.anchorX, this.groundY - 12, 6, vsSkill === 1 ? 'violet' : 'gold');
      game?.vfx?.spawnShockwave?.(
        this.anchorX,
        this.groundY - 2,
        96,
        vsSkill === 1 ? '#e879f9' : '#facc15',
        0.28,
        true
      );
      game?.vfx?.spawnDamageText?.(
        this.anchorX,
        this.y - 148,
        0,
        false,
        vsSkill === 1
          ? 'PARADOX SCISSOR RIFT!'
          : vsSkill === 2
            ? 'HOROLOGIUM SANCTUM!'
            : 'CHRONO-SCHISM ANCHOR!',
        vsSkill === 1 ? '#e879f9' : '#facc15'
      );
    }

    // Stage 2 (t >= 0.24s): Warp Rift Arrival at committed rift coordinate (dodging during telegraph can whiff!)
    if (t >= 0.24 && this._skillStage === 1) {
      this._skillStage = 2;
      this.spawnTemporalEcho(PixelForge.getFrameIndex(this, this.walkPhase));

      const approachFacing = this._skillDir || this.facing || 1;
      const targetX =
        this._skillCommittedTargetX !== undefined
          ? this._skillCommittedTargetX
          : this.clampArenaX(this.x + approachFacing * 190, game, 105);
      const warpX = this.clampArenaX(targetX - approachFacing * 96, game, 95);
      const pincerCloneX = this.clampArenaX(targetX + approachFacing * 96, game, 95);

      this.x = warpX;
      this.facing = approachFacing;
      this.vx = 0;

      // Opposite-flank Mirage + Twin Clock-Hand Spears (`Row 6`) converging on targetX!
      this.spawnPhantomClone(
        pincerCloneX,
        this.groundY,
        -this.facing,
        vsSkill === 1 ? 'future_violet' : 'future',
        {
          startFrame: 68,
          endFrame: 80,
          maxLife: 0.48,
          inFront: true
        }
      );
      this.spawnVfxAnim(6, warpX + this.facing * 28, this.groundY - 96, 192, 192, 0.36, {
        vx: this.facing * 185,
        flipX: this.facing < 0,
        glowColor: 'gold',
        inFront: true
      });
      this.spawnVfxAnim(6, pincerCloneX - this.facing * 28, this.groundY - 96, 192, 192, 0.36, {
        vx: -this.facing * 185,
        flipX: this.facing >= 0,
        glowColor: 'teal',
        inFront: true
      });
      this.spawnTemporalThread(
        warpX,
        this.groundY - 110,
        pincerCloneX,
        this.groundY - 56,
        0.34,
        vsSkill === 1 ? '#e879f9' : '#2dd4bf',
        2
      );
      this.spawnTemporalThread(pincerCloneX, this.groundY - 110, warpX, this.groundY - 56, 0.34, '#facc15', 2);

      if (game?.audio) {
        game.audio.play('hourglass_trap', targetX);
        game.audio.play('chrono_hit', targetX);
      }

      const stage2Pal =
        vsSkill === 1
          ? PARADOX_CRIMSON_PALETTE
          : vsSkill === 2
            ? CHRONO_BRASS_PALETTE
            : CHRONO_TEAL_PALETTE;
      this.fx?.spawn('chronoTimeRiftSlash', this._safeFxX(targetX, game), this._safeFxY(this.groundY - 96), {
        flip: this.facing < 0,
        palette: stage2Pal,
        light: 1.24,
        extra: { cross: true, radius: 36 }
      });
      this.spawnVfxAnim(5, targetX, this.groundY - 96, 224, 224, 0.36, {
        flipX: this.facing < 0,
        glowColor: vsSkill === 2 ? 'gold' : 'teal',
        inFront: true
      });

      const fieldRadius = vsSkill === 2 ? 195 : 165;
      const fieldDur = vsSkill === 2 ? 4.4 : 3.8;
      this.stasisField = {
        x: targetX,
        y: this.groundY,
        radius: fieldRadius,
        life: 0,
        maxLife: fieldDur
      };
      this.fx?.spawn('chronoStasisField', this._safeFxX(targetX, game), this._safeFxY(this.groundY), {
        useGroundY: true,
        palette: stage2Pal,
        light: 1.20,
        maxDuration: fieldDur,
        extra: { customDuration: fieldDur, radius: vsSkill === 2 ? 64 : 56 }
      });

      this.spawnClockworkBurst(targetX, this.groundY - 92, 8, vsSkill === 1 ? 'violet' : 'teal');
      game?.vfx?.spawnShockwave?.(
        targetX,
        this.groundY - 2,
        fieldRadius,
        vsSkill === 1 ? '#e879f9' : '#2dd4bf',
        0.36,
        true
      );
      game?.vfx?.spawnDamageText?.(
        targetX,
        this.groundY - 166,
        0,
        true,
        vsSkill === 1
          ? 'PARADOX SCISSOR EXECUTION!'
          : vsSkill === 2
            ? 'HOROLOGIUM REWIND SANCTUM!'
            : 'CHRONO-SCHISM: TWIN SPEARS!',
        vsSkill === 1 ? '#e879f9' : vsSkill === 2 ? '#facc15' : '#2dd4bf'
      );
      game?.renderer?.triggerShake?.(12, 0.20);

      const hitRange2 = vsSkill === 2 ? 200 : 175;
      const slowDur2 = vsSkill === 2 ? 2.1 : 1.6;
      const primDmg2 = vsSkill === 1 ? 116 : vsSkill === 2 ? 80 : 105;
      const splashDmg2 = vsSkill === 1 ? 80 : vsSkill === 2 ? 55 : 72;
      for (const foe of foes) {
        if (Math.abs(foe.x - targetX) <= hitRange2 || Math.abs(foe.x - this.x) <= hitRange2) {
          foe.chronoSlowTimer = Math.max(foe.chronoSlowTimer || 0, slowDur2);
          foe.takeDamage(foe === primary ? primDmg2 : splashDmg2, this, true, 45, -65);
        }
      }
    }

    // Stage 3 (t >= 0.76s): Golden Rewind Echo or Aggressive Flank Execution at committed rift zone!
    if (t >= 0.76 && this._skillStage === 2) {
      this._skillStage = 3;
      this.isDeflecting = false;

      const riftCloneX = this.x;
      const riftCloneFacing = this.facing;
      const echoTargetX =
        this._skillCommittedTargetX !== undefined
          ? this._skillCommittedTargetX
          : this.stasisField
            ? this.stasisField.x
            : riftCloneX + riftCloneFacing * 86;

      this.spawnPhantomClone(
        riftCloneX,
        this.groundY,
        riftCloneFacing,
        vsSkill === 1 ? 'future_violet' : 'past',
        {
          startFrame: 68,
          endFrame: 82,
          maxLife: 0.52,
          inFront: false
        }
      );
      this.spawnVfxAnim(4, echoTargetX, this.groundY - 94, 216, 216, 0.36, {
        flipX: riftCloneFacing < 0,
        glowColor: 'gold',
        inFront: true
      });
      this.spawnVfxAnim(3, this.anchorX, this.groundY - 92, 196, 196, 0.38, {
        glowColor: 'gold',
        inFront: false
      });
      this.rewindPrismFlash = {
        x: (riftCloneX + this.anchorX) * 0.5,
        y: this.groundY - 92,
        age: 0,
        maxLife: 0.36
      };
      this.spawnTemporalThread(riftCloneX, this.groundY - 88, this.anchorX, this.groundY - 88, 0.32, '#facc15', 2);
      this.spawnTemporalThread(
        riftCloneX,
        this.groundY - 102,
        this.anchorX,
        this.groundY - 102,
        0.32,
        vsSkill === 1 ? '#e879f9' : '#2dd4bf',
        1
      );

      const primDmg3 = vsSkill === 1 ? 60 : vsSkill === 2 ? 40 : 54;
      const splashDmg3 = vsSkill === 1 ? 43 : vsSkill === 2 ? 28 : 38;
      for (const foe of foes) {
        if (Math.abs(foe.x - echoTargetX) <= 165 || Math.abs(foe.x - riftCloneX) <= 175) {
          foe.takeDamage(foe === primary ? primDmg3 : splashDmg3, this, false, 70, -45);
          if (vsSkill === 1) {
            foe.applyBuildRoot?.(0.32, 'TIME PIN!', '#e879f9');
          }
        }
      }

      if (vsSkill === 1) {
        this.x = this.clampArenaX(echoTargetX - riftCloneFacing * 108, game, 95);
      } else {
        this.x = this.anchorX;
      }
      this.y = this.groundY;
      this.vx = 0;
      this.anchorActive = false;
      if (primary) {
        this.facing = primary.x >= this.x ? 1 : -1;
      }

      if (game?.audio) game.audio.play('time_rewind', this.x);
      this.spawnRewindRibbons(riftCloneX, this.groundY - 92);
      this.spawnClockworkBurst(this.x, this.groundY - 88, 8, vsSkill === 1 ? 'violet' : 'gold');
      this.fx?.spawn('warpPortalPairRift', this._safeFxX(this.x, game), this._safeFxY(this.groundY - 92), {
        flip: this.facing < 0,
        palette: vsSkill === 1 ? PARADOX_CRIMSON_PALETTE : CHRONO_BRASS_PALETTE,
        light: 1.24,
        extra: { isArrival: true }
      });

      if (vsSkill === 0) {
        const rewindHeal = Math.max(32, Math.min(88, Math.round(Math.max(0, this.anchorHp - this.hp) * 0.40)));
        this.heal(rewindHeal, 'TEMPORAL REWIND');
      } else if (vsSkill === 1) {
        this.gainMana(7);
      } else {
        const rewindHeal = Math.max(44, Math.min(78, Math.round(Math.max(0, this.anchorHp - this.hp) * 0.45)));
        this.heal(rewindHeal, 'HOROLOGIUM REWIND');
        this.grantBuildShield(50, 2.4, 'ASTROLABE BARRIER!', '#facc15');
        this.healTeammateTagGrace(18, 'TEMPORAL MEND', 20, 2.2);
      }
    }

    if (t >= (this.skillDuration || 1.08)) {
      this.isDeflecting = false;
      this.anchorActive = false;
      this.setState('IDLE');
    }
  }

  // ============================================================================
  // OVERDRIVE (`ULTIMATE`) - `PARADOX CONVERGENCE: BROKEN TIMELINES` (`1.72s`)
  // Past Gold & Future Teal mirage clones converge from both sides into a
  // blooming circular `chronomancer_ex_vfx.png` Roman Astrolabe shatter!
  // ============================================================================

  updateUltimate(_dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.ultDuration || 1.72;
    const vsUlt = game?.isAdventureMode?.() ? 0 : this.buildUlt || 0;
    if (!this._ultVoiceFired) {
      this._ultVoiceFired = true;
      game?.audio?.playHeroVoice?.(this.heroId, vsUlt === 1 ? 'ult_alt' : 'ult_std', {
        worldX: this.x,
        speakerKey: this,
        priority: 3,
        cooldownMs: 400,
        duckSfx: true
      });
    }
    this.vx = 0;
    this.vy = 0;
    this.isInvulnerable = t < 0.22;
    this.unstoppablePoise = true;

    let liftFrac = 0;
    if (t < 0.25) {
      liftFrac = 1 - Math.pow(1 - t / 0.25, 2.0);
    } else if (t <= 1.38) {
      liftFrac = 1.0;
    } else {
      liftFrac = Math.max(0, 1 - (t - 1.38) / Math.max(0.08, dur - 1.38));
    }
    this.y = this.groundY - Math.round(36 * liftFrac);

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

      this.pendulumSeal = {
        x: targetX,
        y: this.groundY - 134,
        life: 0,
        maxLife: 1.62
      };

      const dialPal =
        vsUlt === 1
          ? PARADOX_CRIMSON_PALETTE
          : vsUlt === 2
            ? CHRONO_BRASS_PALETTE
            : CHRONO_TEAL_PALETTE;
      this.fx?.spawn('doomsdayGrandHorologium', this._safeFxX(targetX, game), this._safeFxY(this.groundY), {
        useGroundY: true,
        palette: dialPal,
        light: 1.24,
        maxDuration: 1.64,
        extra: { customDuration: 1.64, radius: 70 }
      });

      const leftPastX = this.clampArenaX(targetX - 152, game, 85);
      const rightFutureX = this.clampArenaX(targetX + 152, game, 85);
      // Past Gold Mirage converging rightward + Future Teal/Violet Mirage converging leftward!
      this.spawnPhantomClone(leftPastX, this.groundY, 1, 'past', {
        startFrame: 60,
        endFrame: 88,
        vx: 72,
        maxLife: 1.36,
        inFront: true
      });
      this.spawnPhantomClone(
        rightFutureX,
        this.groundY,
        -1,
        vsUlt === 1 ? 'future_violet' : 'future',
        {
          startFrame: 60,
          endFrame: 88,
          vx: -72,
          maxLife: 1.36,
          inFront: true
        }
      );
      if (vsUlt === 1) {
        this.spawnPhantomClone(targetX, this.groundY, this.facing, 'future_violet', {
          startFrame: 68,
          endFrame: 88,
          vx: 0,
          maxLife: 1.32,
          inFront: true
        });
      }

      game?.vfx?.spawnDamageText?.(
        targetX,
        this.groundY - 228,
        0,
        true,
        vsUlt === 1
          ? 'SHATTERED TIMELINE BLITZ!'
          : vsUlt === 2
            ? 'ETERNAL PENDULUM AEGIS!'
            : 'PARADOX CONVERGENCE: TWIN-CLONE SHATTER!',
        vsUlt === 1 ? '#e879f9' : vsUlt === 2 ? '#facc15' : '#2dd4bf'
      );
    }

    if (primary && !primary.hasPoise && t < 1.34) {
      primary.vx *= 0.2;
    }

    // Beat 1 (t = 0.44s): Past Gold Mirage Convergence Slash
    if (t >= 0.44 && this._ultStage === 1) {
      this._ultStage = 2;
      if (game?.audio) game.audio.play('slash', targetX);
      game?.renderer?.triggerShake?.(11, 0.18);

      this.spawnTemporalThread(targetX - 118, this.groundY - 142, targetX + 94, this.groundY - 46, 0.36, '#facc15', 2);
      this.spawnVfxAnim(5, targetX, this.groundY - 96, 224, 224, 0.32, {
        flipX: false,
        glowColor: 'gold',
        inFront: true
      });
      this.spawnClockworkBurst(targetX, this.groundY - 96, 7, 'gold');

      const p1 = vsUlt === 1 ? 82 : vsUlt === 2 ? 58 : 78;
      const s1 = vsUlt === 1 ? 58 : vsUlt === 2 ? 40 : 54;
      for (const foe of foes) {
        if (Math.abs(foe.x - targetX) <= 185) {
          foe.takeDamage(foe === primary ? p1 : s1, this, true, -16, -35);
        }
      }
    }

    // Beat 2 (t = 0.84s): Future Teal/Violet Mirage Convergence Slash
    if (t >= 0.84 && this._ultStage === 2) {
      this._ultStage = 3;
      if (game?.audio) game.audio.play('clock_gear', targetX);
      game?.renderer?.triggerShake?.(13, 0.20);

      this.spawnTemporalThread(
        targetX + 118,
        this.groundY - 142,
        targetX - 94,
        this.groundY - 46,
        0.36,
        vsUlt === 1 ? '#e879f9' : '#2dd4bf',
        2
      );
      this.spawnVfxAnim(5, targetX, this.groundY - 98, 236, 236, 0.34, {
        flipX: true,
        glowColor: 'teal',
        inFront: true
      });
      this.spawnClockworkBurst(targetX, this.groundY - 98, 7, vsUlt === 1 ? 'violet' : 'teal');

      const p2 = vsUlt === 1 ? 88 : vsUlt === 2 ? 62 : 84;
      const s2 = vsUlt === 1 ? 60 : vsUlt === 2 ? 44 : 58;
      for (const foe of foes) {
        if (Math.abs(foe.x - targetX) <= 185) {
          foe.takeDamage(foe === primary ? p2 : s2, this, true, 16, -45);
        }
      }
    }

    // Beat 3 (t = 1.28s): Blooming Roman Astrolabe Twin-Clone Convergence Shatter!
    if (t >= 1.28 && this._ultStage === 3) {
      this._ultStage = 4;
      if (game?.audio) game.audio.play('chrono_hit', targetX);
      game?.renderer?.triggerShake?.(22, 0.42);
      game?.renderer?.triggerAberration?.(9);
      game?.renderer?.triggerHitStop?.(0.08);

      const topX = targetX;
      const topY = this.groundY - 188;
      const leftX = targetX - 112;
      const rightX = targetX + 112;
      const baseY = this.groundY - 34;
      this.spawnTemporalThread(leftX, baseY, topX, topY, 0.42, '#facc15', 2);
      this.spawnTemporalThread(topX, topY, rightX, baseY, 0.42, vsUlt === 1 ? '#e879f9' : '#2dd4bf', 2);
      this.spawnTemporalThread(rightX, baseY, leftX, baseY, 0.42, '#fde047', 2);

      this.fx?.spawn('eternalZeroClockPulse', this._safeFxX(targetX, game), this._safeFxY(this.groundY - 98), {
        palette: vsUlt === 1 ? PARADOX_CRIMSON_PALETTE : CHRONO_BRASS_PALETTE,
        light: 1.28,
        extra: { isShatter: true }
      });
      this.spawnVfxAnim(3, targetX, this.groundY - 102, 268, 268, 0.42, {
        glowColor: 'gold',
        inFront: false
      });
      this.spawnVfxAnim(7, targetX, this.groundY - 98, 276, 276, 0.44, {
        glowColor: 'gold',
        inFront: true
      });
      this.spawnVfxAnim(4, targetX, this.groundY - 98, 232, 232, 0.36, {
        glowColor: 'teal',
        inFront: true
      });

      this.spawnClockworkBurst(targetX, this.groundY - 98, 8, 'gold');
      this.spawnClockworkBurst(targetX, this.groundY - 98, 8, vsUlt === 1 ? 'violet' : 'teal');

      if (vsUlt === 0) {
        this.heal(44, 'PARADOX MEND');
      } else if (vsUlt === 1) {
        this.gainFinisher(10);
      } else {
        this.heal(46, 'PENDULUM AEGIS');
        this.grantBuildShield(72, 2.6, 'HOROLOGIUM BARRIER!', '#facc15');
        this.healTeammateTagGrace(20, 'HOROLOGIUM GRACE', 22, 2.4);
      }
      game?.vfx?.spawnDamageText?.(
        targetX,
        this.groundY - 240,
        0,
        true,
        'ROMAN ASTROLABE SHATTER!',
        '#fde047'
      );

      const p3 = vsUlt === 1 ? 154 : vsUlt === 2 ? 110 : 140;
      const s3 = vsUlt === 1 ? 106 : vsUlt === 2 ? 78 : 98;
      for (const foe of foes) {
        if (Math.abs(foe.x - targetX) <= 215) {
          foe.takeDamage(foe === primary ? p3 : s3, this, true, 165, -185);
          if (vsUlt === 2) {
            foe.applyBuildRoot?.(0.42, 'TIME-LOCK!', '#2dd4bf');
          }
        }
      }
    }

    if (t >= dur) {
      this.y = this.groundY;
      this.isInvulnerable = false;
      this.unstoppablePoise = false;
      this.pendulumSeal = null;
      this.setState('IDLE');
    }
  }

  // ============================================================================
  // SUPREME ULTIMATE (`TRUE_ULTIMATE`) - `4.55s`
  // `ETERNAL ZERO: TWELFTH BELL CATACLYSM`
  // Mid-Air Time-Stop freezing enemies + Colossal Luminous `chronomancer_ex_vfx.png`
  // Doomsday Astrolabe Clock with `drawBloomedSprite` teal-gold glow + `12` Radial
  // Clock-Hand Spears converging + `680` dmg `ETERNAL ZERO` shatter at `t = 3.53s`!
  // ============================================================================

  updateTrueUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    if (!this._trueUltChargeVoiceFired && t < 3.53) {
      this._trueUltChargeVoiceFired = true;
      game?.audio?.playHeroVoice?.(this.heroId, 'true_ult_charge', {
        worldX: this.x,
        speakerKey: this,
        priority: 3,
        cooldownMs: 400,
        duckSfx: true
      });
    }
    const dur = this.trueUltDuration || 4.55;
    this.isInvulnerable = t < 0.35;
    this.unstoppablePoise = true;
    this.vx = 0;
    this.vy = 0;

    const foes = this.getActiveEnemies(enemy, game);
    const primary = enemy && !enemy.isDead ? enemy : foes[0] || null;

    if (game?.renderer && t < 4.15) {
      const dimTarget = t < 3.53 ? 0.54 : Math.max(0, 0.54 * (1 - (t - 3.53) / 0.62));
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
        this.x * 0.35 + this.eternalTargetX * 0.65,
        game,
        245
      );
      this.eternalZeroDome = {
        x: domeX,
        y: this.groundY - 198,
        radius: 196,
        phase: 0,
        minuteHandDeg: -90,
        hourHandDeg: 180,
        timeStopped: false,
        shattered: false,
        alpha: 1
      };

      if (game?.audio) game.audio.play('chrono_ult', domeX);
      game?.renderer?.triggerShake?.(14, 0.26);

      this.fx?.spawn('doomsdayGrandHorologium', this._safeFxX(domeX, game), this._safeFxY(this.groundY), {
        useGroundY: true,
        palette: CHRONO_TEAL_PALETTE,
        light: 1.24,
        maxDuration: 3.6,
        extra: { customDuration: 3.6, radius: 78 }
      });
      this.fx?.spawn('eternalZeroClockPulse', this._safeFxX(this.x, game), this._safeFxY(this.y - 98), {
        palette: CHRONO_BRASS_PALETTE,
        light: 1.22,
        extra: { isShatter: false }
      });
      game?.vfx?.triggerCinematicCutIn?.(this, this.trueUltName, '#2dd4bf');
      game?.vfx?.spawnDamageText?.(
        domeX,
        this.groundY - 372,
        0,
        true,
        'DOOMSDAY ASTROLABE: TWELFTH BELL...',
        '#fde047'
      );
    }

    if (this.eternalZeroDome) {
      this.eternalZeroDome.phase += dt;
    }

    // PHASE 1 (`0.00s .. 1.15s`): MID-AIR ASCENT & DOOMSDAY ASTROLABE COUNTDOWN (`IX -> X -> XI -> XII`)
    if (t < 1.15) {
      const u1 = clamp01Local(t / 1.15);
      const lift = Math.round(58 * (1 - Math.pow(1 - u1, 2.2)));
      this.y = this.groundY - lift;
      this.trueUltFrameOverride = 120 + Math.min(11, Math.floor(u1 * 12));

      if (primary) {
        this.eternalTargetX = primary.x;
        this.eternalTargetY = primary.y;
        this.facing = primary.x >= this.x ? 1 : -1;
      }

      if (this.eternalZeroDome) {
        const dome = this.eternalZeroDome;
        dome.x = this.clampArenaX(this.x * 0.30 + this.eternalTargetX * 0.70, game, 230);
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

    // PHASE 2 (`t = 1.15s`): MID-AIR TIME-STOP (`"ETERNAL ZERO - TIME STOP!"`)
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
        if (!foe.isColossalBoss && foe.y >= this.groundY - 8) {
          foe.y = this.groundY - 28;
        }
        foe.chronoTimeStopTimer = 2.45;
        foe._timeStopLockX = foe.x;
        foe._timeStopLockY = foe.y;
        foe.chronoTimeStopFrame = PixelForge.getFrameIndex(foe, foe.walkPhase || 0);
        foe.vx = 0;
        foe.vy = 0;
      }
      if (primary) {
        this.eternalTargetY = primary.y;
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

      this.fx?.spawn('eternalZeroClockPulse', this._safeFxX(this.eternalTargetX, game), this._safeFxY(this.eternalTargetY - 94), {
        palette: CHRONO_TEAL_PALETTE,
        light: 1.28,
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

    // PHASE 3 (`1.15s .. 3.52s`): `12` RADIAL CLOCK-HAND SPEARS (`XII..XI`) MATERIALIZING IN STOPPED TIME!
    if (t < 3.53) {
      for (const foe of this._frozenEnemiesRef) {
        if (foe && !foe.isDead) {
          foe.chronoTimeStopTimer = Math.max(foe.chronoTimeStopTimer || 0, 3.56 - t);
        }
      }

      const tx = this.eternalTargetX;
      const ty = this.eternalTargetY;
      const aimCenterY = ty - 88;
      const radialR = 176;
      const spearPoses = [134, 253, 72, 194, 76, 85, 255, 196, 72, 253, 194, 136];

      while (
        this._trueUltBarrageCount < 12 &&
        t >= 1.24 + this._trueUltBarrageCount * 0.165
      ) {
        const idx = this._trueUltBarrageCount;
        this._trueUltBarrageCount++;

        const dialAng = -Math.PI * 0.5 + (idx / 12) * Math.PI * 2;
        const rawSpearX = tx + Math.cos(dialAng) * radialR;
        const spearOriginX = this.clampArenaX(rawSpearX, game, 68);
        const spearOriginY = Math.max(76, Math.min(this.groundY - 18, aimCenterY + Math.sin(dialAng) * (radialR * 0.78)));
        const variant = idx % 2 === 0 ? 'past' : 'future';
        const numeral = ROMAN_CLOCK_HOURS[idx];
        const pose = spearPoses[idx];

        if (idx % 3 === 0) {
          const warpX = this.clampArenaX(tx + (Math.cos(dialAng) >= 0 ? 156 : -156), game, 88);
          const warpY = Math.min(this.groundY, Math.max(this.groundY - 210, spearOriginY + 72));
          const faceDir = tx >= warpX ? 1 : -1;
          this.x = warpX;
          this.y = warpY;
          this.facing = faceDir;
          this.trueUltFrameOverride = pose;

          this.fx?.spawn('warpPortalPairRift', this._safeFxX(warpX, game), this._safeFxY(warpY - 90), {
            flip: faceDir < 0,
            palette: variant === 'past' ? CHRONO_BRASS_PALETTE : CHRONO_TEAL_PALETTE,
            light: 1.20,
            extra: { isArrival: true }
          });
          this.spawnPhantomClone(warpX, warpY, faceDir, variant, {
            frameIdx: pose,
            maxLife: 0.56,
            holdUntilTimeStopEnd: true,
            romanTag: numeral
          });
        }

        if (game?.audio && idx % 2 === 0) game.audio.play('clock_gear', spearOriginX);
        game?.renderer?.triggerShake?.(5, 0.08);

        const aimAngle = Math.atan2(aimCenterY - spearOriginY, tx - spearOriginX);
        this.suspendedClockSpears.push({
          x: spearOriginX,
          y: spearOriginY,
          originX: spearOriginX,
          originY: spearOriginY,
          targetX: tx,
          targetY: aimCenterY,
          angle: aimAngle,
          numeral,
          variant,
          spawnTime: t,
          launched: false,
          launchProgress: 0
        });
      }

      if (t >= 3.26 && this._trueUltStage === 1) {
        this._trueUltStage = 2;
        const vantageX = this.clampArenaX(tx - this._eternalStartFacing * 208, game, 96);
        this.x = vantageX;
        this.y = this.groundY - 42;
        this.facing = tx >= this.x ? 1 : -1;
        this.trueUltFrameOverride = 136;

        if (game?.audio) game.audio.play('time_rewind', this.x);
        this.fx?.spawn('warpPortalPairRift', this._safeFxX(this.x, game), this._safeFxY(this.y - 92), {
          flip: this.facing < 0,
          palette: CHRONO_BRASS_PALETTE,
          light: 1.24,
          extra: { isArrival: true }
        });
        game?.vfx?.spawnDamageText?.(
          this.x,
          this.y - 166,
          0,
          true,
          'TWELFTH BELL... TOLL!',
          '#fde047'
        );
      } else if (t >= 3.26) {
        const subU = clamp01Local((t - 3.26) / 0.26);
        this.trueUltFrameOverride = 136 + Math.min(2, Math.floor(subU * 3));
      }

      return;
    }

    // PHASE 4 (`t >= 3.53s`): `12` RADIAL SPEARS CONVERGE & `680` DMG `ETERNAL ZERO` SHATTER!
    if (this._trueUltStage < 3) {
      this._trueUltStage = 3;
      if (!this._trueUltFireVoiceFired) {
        this._trueUltFireVoiceFired = true;
        game?.audio?.playHeroVoice?.(this.heroId, 'true_ult_fire', {
          worldX: this.x,
          speakerKey: this,
          priority: 4,
          cooldownMs: 200,
          duckSfx: true
        });
      }
      const tx = this.eternalTargetX;
      const ty = this.eternalTargetY;
      const impactY = ty - 94;

      this._releaseAllTimeStoppedEnemies();
      for (const foe of foes) {
        if (!foe.isColossalBoss && foe.y < this.groundY) {
          foe.y = this.groundY;
        }
      }

      for (const sp of this.suspendedClockSpears) {
        sp.launched = true;
        sp.launchProgress = 0;
      }

      if (this.eternalZeroDome) {
        const dome = this.eternalZeroDome;
        dome.shattered = true;
        for (let i = 0; i < 44; i++) {
          const ang = (i / 44) * Math.PI * 2 + (i % 2) * 0.08;
          const rStart = 38 + (i % 4) * 42;
          const spd = 165 + (i % 5) * 62;
          this.shatterClockShards.push({
            x: dome.x + Math.cos(ang) * rStart,
            y: dome.y + Math.sin(ang) * rStart * 0.85,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd - 65,
            size: i % 3 === 0 ? 12 : 9,
            tone: i % 2 === 0 ? 'gold' : 'teal',
            age: 0,
            maxLife: 0.74 + (i % 4) * 0.08
          });
        }
      }

      if (game?.audio) game.audio.play('time_shatter', tx);
      game?.renderer?.triggerImpactFrame?.(tx, impactY, 0.18, 'chrono');
      game?.renderer?.triggerShake?.(28, 0.58);
      game?.renderer?.triggerAberration?.(14);
      game?.renderer?.triggerHitStop?.(0.11);

      this.fx?.spawn('eternalZeroClockPulse', this._safeFxX(tx, game), this._safeFxY(impactY), {
        palette: CHRONO_BRASS_PALETTE,
        light: 1.32,
        extra: { isShatter: true }
      });
      this.fx?.spawn('chronoTimeRiftSlash', this._safeFxX(tx, game), this._safeFxY(impactY), {
        palette: CHRONO_TEAL_PALETTE,
        light: 1.28,
        extra: { radius: 42 }
      });

      this.spawnVfxAnim(7, tx, impactY, 344, 344, 0.54, {
        glowColor: 'gold',
        inFront: true
      });
      this.spawnVfxAnim(3, tx, impactY, 296, 296, 0.44, {
        glowColor: 'teal',
        inFront: false
      });
      this.spawnVfxAnim(4, tx, impactY, 264, 264, 0.42, {
        flipX: true,
        glowColor: 'teal',
        inFront: true
      });
      this.spawnClockworkBurst(tx, impactY, 12, 'gold');
      this.spawnClockworkBurst(tx, impactY, 12, 'teal');

      game?.vfx?.spawnShockwave?.(tx, this.groundY - 4, 265, '#fde047', 0.46, true);

      const rewindUltHeal = Math.round(this.maxHp * 0.12);
      this.heal(rewindUltHeal, 'TWELFTH BELL GRACE');
      this.spawnRewindRibbons(tx, impactY);

      game?.vfx?.spawnDamageText?.(
        tx,
        impactY - 122,
        0,
        true,
        'ETERNAL ZERO - TWELFTH BELL SHATTER!',
        '#fde047'
      );

      const postFreezeFoes = this.getActiveEnemies(enemy, game);
      for (const foe of postFreezeFoes) {
        foe.takeDamage(680, this, true, 245, -215);
      }
    }

    const postU = clamp01Local((t - 3.53) / Math.max(0.1, dur - 3.53));
    const landFrac = Math.min(1, postU / 0.33);
    this.y = this.groundY - Math.round(42 * (1 - landFrac));
    this.trueUltFrameOverride = 139 + Math.min(10, Math.floor(postU * 11));
    this._overrideFrameIdx = this.trueUltFrameOverride;

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
  // PIXEL-PURE HD-2D RENDERING (ZERO CANVAS ROTATION, ZERO ELLIPSE PRIMITIVES, ZERO RADIAL GLOW BLOBS, ZERO CHEVRON BARS)
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
    glowColor = 'teal',
    isReflection = false
  ) {
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth || alpha <= 0.01) return;
    const cell = 208;
    const sx = Math.max(0, Math.min(29, Math.floor(col))) * cell;
    const sy = Math.max(0, Math.min(7, Math.floor(row))) * cell;
    const outerHex =
      glowColor === 'gold' ? '#fde047' : glowColor === 'violet' ? '#c084fc' : '#2dd4bf';
    const coreHex =
      glowColor === 'gold' ? '#fde047' : glowColor === 'violet' ? '#c084fc' : '#2dd4bf';

    if (row !== 0 && !isReflection) {
      drawChronoBayerHalo(ctx, x, y, w * 0.34, h * 0.22, outerHex, coreHex, Math.min(0.13, alpha * 0.13));
    }

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(x), Math.round(y));
    if (flipX) ctx.scale(-1, 1);

    const vfxMgr = this.game?.vfx;
    if (vfxMgr && typeof vfxMgr.drawBloomedSprite === 'function') {
      vfxMgr.drawBloomedSprite(
        ctx,
        renderer,
        vfxSheet,
        sx,
        sy,
        cell,
        cell,
        Math.round(-w * 0.5),
        Math.round(-h * 0.5),
        w,
        h,
        coreHex,
        Math.min(1, alpha),
        isReflection
      );
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = Math.min(1, alpha);
      ctx.drawImage(vfxSheet, sx, sy, cell, cell, -w * 0.5, -h * 0.5, w, h);

      if (!isReflection) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(0.22, alpha * 0.20);
        ctx.drawImage(vfxSheet, sx, sy, cell, cell, -w * 0.5, -h * 0.5, w, h);
      }
    }

    ctx.restore();
  }

  /**
   * Renders one of the 12 Radial Clock-Hand Spears using 2-pass sightlines +
   * blooming circular `Row 1` Escapement Wheel + tapered 2px pixel needle (`ZERO canvas rotation`, `ZERO boxy rects`!).
   */
  drawPixelClockSpear(ctx, sp, vfxSheet, renderer = null) {
    const px = 2;
    const snap = (v) => Math.round(v / px) * px;
    const age = Math.max(0, (this.stateTimer || 0) - sp.spawnTime);
    const pop = Math.min(1, age / 0.12);
    const fade = sp.launched ? Math.max(0, 1 - sp.launchProgress * 0.75) : 1.0;
    if (fade <= 0.02) return;

    const tremor = sp.launched ? 0 : Math.round(Math.sin((this.stateTimer || 0) * 58 + sp.angle * 3) * 1.5);
    const ox = sp.x + tremor;
    const oy = sp.y;
    const ux = Math.cos(sp.angle);
    const uy = Math.sin(sp.angle);
    const nx = -uy;
    const ny = ux;
    const isPast = sp.variant === 'past';
    const mainHex = isPast ? '#facc15' : '#2dd4bf';
    const rimHex = isPast ? '#fef08a' : '#99f6e4';

    // 1. 2-Pass Ultra-Thin Sightline Thread before Shatter
    if (!sp.launched) {
      drawTwoPassChronoHairline(
        ctx,
        ox + ux * 36,
        oy + uy * 36,
        sp.targetX,
        sp.targetY,
        mainHex,
        '#ffffff',
        fade * 0.62,
        1
      );
    }

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = fade;

    // 2. Circular Blooming Escapement Wheel (`Row 1`) at Spear Hilt
    if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      const wheelCol = Math.floor((this.stateTimer || 0) * 30 + sp.angle * 4) % 30;
      const wheelSize = Math.round(78 * (0.75 + 0.25 * pop));
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        1,
        wheelCol,
        ox - ux * 12,
        oy - uy * 12,
        wheelSize,
        wheelSize,
        fade * 0.90,
        false,
        renderer,
        isPast ? 'gold' : 'teal'
      );
    }

    // 3. Sleek Tapered Clock-Hand Spear Needle (2px crisp pixel grid)
    const halfSpan = Math.round(52 * (0.72 + 0.28 * pop));
    for (let s = -Math.round(halfSpan * 0.65); s <= halfSpan; s += px) {
      const frac = (s + halfSpan * 0.65) / (halfSpan * 1.65);
      const isHead = frac > 0.60 && frac < 0.88;
      const halfW = isHead ? 4 : frac >= 0.88 ? Math.max(0, Math.round((1 - frac) * 34)) : 2;
      for (let w = -halfW - px; w <= halfW + px; w += px) {
        ctx.fillStyle = '#050814';
        ctx.fillRect(snap(ox + ux * s + nx * w), snap(oy + uy * s + ny * w), px, px);
      }
    }
    for (let s = -Math.round(halfSpan * 0.65); s <= halfSpan; s += px) {
      const frac = (s + halfSpan * 0.65) / (halfSpan * 1.65);
      const isHead = frac > 0.60 && frac < 0.88;
      const halfW = isHead ? 4 : frac >= 0.88 ? Math.max(0, Math.round((1 - frac) * 34)) : 2;
      for (let w = -halfW; w <= halfW; w += px) {
        ctx.fillStyle = w === 0 || frac > 0.84 ? '#ffffff' : Math.abs(w) <= px ? rimHex : mainHex;
        ctx.fillRect(snap(ox + ux * s + nx * w), snap(oy + uy * s + ny * w), px, px);
      }
    }

    if (!sp.launched && sp.numeral) {
      const badgeX = snap(ox - ux * 38);
      const badgeY = snap(oy - uy * 38 - 16);
      PixelFont.drawCentered(ctx, sp.numeral, badgeX, badgeY, 2, rimHex, '#ffffff', true);
    }

    ctx.restore();
  }

  /**
   * Renders the Blooming Circular Roman Astrolabe & Swinging Escapement Wheel Seal during
   * `PARADOX CONVERGENCE: BROKEN TIMELINES` (`ULTIMATE` — ZERO square pendulum bob!).
   */
  drawEscapementPendulumSeal(ctx, vfxSheet, renderer = null) {
    const ps = this.pendulumSeal;
    if (!ps) return;
    const pop = Math.min(1, ps.life / 0.18);
    const fade = Math.min(1, (ps.maxLife - ps.life) * 3.2);
    if (fade <= 0.03) return;

    const cx = Math.round(ps.x / 2) * 2;
    const cy = Math.round(ps.y / 2) * 2;
    const col = Math.floor(ps.life * 30) % 30;
    const wheelCol = (col + 15) % 30;
    const size = Math.round(296 * (0.82 + 0.18 * pop));

    if (vfxSheet?.complete && vfxSheet.naturalWidth) {
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        3,
        col,
        cx,
        cy,
        size,
        size,
        fade * 0.92,
        false,
        renderer,
        'teal'
      );

      // Swinging Circular Escapement Wheel Bob (0 square fillRect boxes!)
      const swingAng = Math.sin(ps.life * 7.2) * 0.44;
      const rodLen = 112 * pop;
      const pivotY = cy - 64;
      const bobX = Math.round((cx + Math.sin(swingAng) * rodLen) / 2) * 2;
      const bobY = Math.round((pivotY + Math.cos(swingAng) * rodLen) / 2) * 2;
      drawTwoPassChronoHairline(ctx, cx, pivotY, bobX, bobY, '#facc15', '#ffffff', fade * 0.85, 1);
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        1,
        wheelCol,
        bobX,
        bobY,
        92,
        92,
        fade * 0.94,
        false,
        renderer,
        'gold'
      );
    }
  }

  /**
   * Renders the Colossal Luminous `chronomancer_ex_vfx.png` Doomsday Astrolabe Clock
   * (`Row 3` Grand XII Roman Astrolabe + `Row 1` Counter-Rotating Escapement Ring + `Row 2` Crown Hourglass)
   * with `drawBloomedSprite` teal-gold glow — ZERO striped dome bars & ZERO square bell box!
   */
  drawEternalZeroClockDome(ctx, vfxSheet, renderer = null) {
    const dome = this.eternalZeroDome;
    if (!dome || dome.alpha <= 0.02 || dome.shattered) return;

    const px = 2;
    const snap = (v) => Math.round(v / px) * px;
    const cx = snap(dome.x);
    const cy = snap(dome.y);
    const R = dome.radius;
    const fade = dome.alpha;

    // Always animate VFX columns at 30fps (0..29) so the luminous horological aura shimmers continuously!
    const colMain = Math.floor(dome.phase * 30) % 30;
    const colInner = Math.floor(dome.phase * 24 + 11) % 30;
    const colCrown = Math.floor(dome.phase * 22 + 5) % 30;

    if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      // Layer 1: Colossal Outer Roman Astrolabe Clock (`Row 3`) with `drawBloomedSprite` teal-gold glow
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        3,
        colMain,
        cx,
        cy,
        424,
        424,
        fade * 0.92,
        false,
        renderer,
        dome.timeStopped ? 'teal' : 'gold'
      );
      // Layer 2: Inner Counter-Rotating Brass Escapement Gear (`Row 1`)
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        1,
        colInner,
        cx,
        cy,
        244,
        244,
        fade * 0.80,
        true,
        renderer,
        'gold'
      );
      // Layer 3: Crown XII Hourglass Crest (`Row 2`) suspended at the Midnight Apex (replaces square bell box!)
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        2,
        colCrown,
        cx,
        cy - R - 10,
        104,
        104,
        fade * 0.90,
        false,
        renderer,
        'gold'
      );
    }

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = fade;

    for (let h = 0; h < 12; h++) {
      const ang = -Math.PI * 0.5 + (h / 12) * Math.PI * 2;
      const nx = snap(cx + Math.cos(ang) * (R - 22));
      const ny = snap(cy + Math.sin(ang) * (R - 22));
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

    // Crisp 2-pass horological Hour & Minute hands
    const hourRad = (dome.hourHandDeg * Math.PI) / 180;
    const minRad = (dome.minuteHandDeg * Math.PI) / 180;
    drawTwoPassChronoHairline(
      ctx,
      cx - Math.cos(hourRad) * 16,
      cy - Math.sin(hourRad) * 16,
      cx + Math.cos(hourRad) * (R - 76),
      cy + Math.sin(hourRad) * (R - 76),
      '#facc15',
      '#fef08a',
      fade * 0.95,
      2
    );
    drawTwoPassChronoHairline(
      ctx,
      cx - Math.cos(minRad) * 20,
      cy - Math.sin(minRad) * 20,
      cx + Math.cos(minRad) * (R - 36),
      cy + Math.sin(minRad) * (R - 36),
      '#2dd4bf',
      '#ffffff',
      fade * 0.98,
      2
    );
    drawChronoHitStarburst(ctx, cx, cy, 0.22, '#2dd4bf', '#fde047');

    ctx.restore();
  }

  drawPhantomClonesPass(ctx, sprites, vfxSheet, _renderer, inFrontPass = false) {
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
      const isViolet = c.variant === 'future_violet';
      const tintMain = isPast ? '#facc15' : isViolet ? '#e879f9' : '#2dd4bf';
      const tintRim = isPast ? '#fef08a' : isViolet ? '#fbcfe8' : '#99f6e4';

      if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
        const gearCol = Math.floor(this.chronoPhase * 12) % 30;
        this.drawBloomedVfxCell(
          ctx,
          vfxSheet,
          1,
          gearCol,
          c.x,
          c.y - 88,
          108,
          108,
          alpha * 0.68,
          c.facing < 0,
          null,
          isPast ? 'gold' : isViolet ? 'violet' : 'teal'
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
      ctx.globalAlpha = alpha * 0.30;
      PixelForge.drawSilhouetteFrame(ctx, sprites, frameIdx, 208, 208, tintMain);

      ctx.translate(-2, 0);
      ctx.globalAlpha = alpha * 0.16;
      PixelForge.drawSilhouetteFrame(ctx, sprites, frameIdx, 208, 208, tintRim);

      ctx.restore();
    }
  }

  drawChronoThreadsAndParticles(ctx) {
    // 1. 2-pass ultra-crisp 1px-2px temporal threads (zero chevrons!)
    for (let i = 0; i < this.temporalThreads.length; i++) {
      const th = this.temporalThreads[i];
      const u = Math.min(1, th.age / Math.max(0.04, th.maxLife));
      drawTwoPassChronoHairline(ctx, th.x0, th.y0, th.x1, th.y1, th.colorHex, '#ffffff', 1 - u, th.coreSize || 1);
    }

    // 2. Asymmetric 4-frame anime horological hit-starbursts
    for (let i = 0; i < this.hitStarbursts.length; i++) {
      const hs = this.hitStarbursts[i];
      const u = Math.min(1, hs.age / Math.max(0.04, hs.maxLife));
      drawChronoHitStarburst(ctx, hs.x, hs.y, u, hs.primaryHex, hs.accentHex);
    }

    // 3. Rewind Temporal Prism flash (`SKILL`)
    if (this.rewindPrismFlash) {
      const pf = this.rewindPrismFlash;
      const u = Math.min(1, pf.age / pf.maxLife);
      const fade = 1 - u;
      const r = Math.round(28 + u * 24);
      drawTwoPassChronoHairline(ctx, pf.x, pf.y - r, pf.x + r, pf.y, '#2dd4bf', '#ffffff', fade, 2);
      drawTwoPassChronoHairline(ctx, pf.x + r, pf.y, pf.x, pf.y + r, '#facc15', '#ffffff', fade, 2);
      drawTwoPassChronoHairline(ctx, pf.x, pf.y + r, pf.x - r, pf.y, '#2dd4bf', '#ffffff', fade, 2);
      drawTwoPassChronoHairline(ctx, pf.x - r, pf.y, pf.x, pf.y - r, '#facc15', '#ffffff', fade, 2);
    }

    // 4. Multi-shape pixel particles ('star4', 'cog', 'prism')
    if (this.chronoParticles.length > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      for (let i = 0; i < this.chronoParticles.length; i++) {
        const p = this.chronoParticles[i];
        const fade = Math.max(0, 1 - p.age / p.maxLife);
        if (fade <= 0.04) continue;
        const px = Math.round(p.x / 2) * 2;
        const py = Math.round(p.y / 2) * 2;
        ctx.globalAlpha = Math.min(0.95, fade);
        if (p.kind === 'star4') {
          const arm = p.size * 2;
          ctx.fillStyle = p.color;
          ctx.fillRect(px - arm, py, arm * 2 + 2, 2);
          ctx.fillRect(px, py - arm, 2, arm * 2 + 2);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(px, py, 2, 2);
        } else if (p.kind === 'cog') {
          ctx.fillStyle = p.color;
          ctx.fillRect(px - 2, py - 2, 6, 6);
          ctx.fillStyle = '#050814';
          ctx.fillRect(px, py, 2, 2);
        } else {
          // Faceted temporal glass shard
          ctx.fillStyle = p.color;
          ctx.fillRect(px - 2, py, 6, 2);
          ctx.fillRect(px, py - 2, 2, 6);
          ctx.fillStyle = p.accent;
          ctx.fillRect(px, py, 2, 2);
        }
      }
      ctx.restore();
    }
  }

  _resolveShaderCenterX(renderer) {
    if (renderer?.worldWidth > 2400) {
      return Number.isFinite(renderer.camX) ? renderer.camX : this.x;
    }
    return renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
  }

  drawForegroundOverlay(ctx, renderer = null) {
    const arenaCenterX = this._resolveShaderCenterX(renderer);
    const sprites = this.getExSprites();
    const sheet = PixelForge.ensureImage(sprites?.sheet);
    const vfxSheet = PixelForge.ensureImage(sprites?.vfx);

    if (!this.isDead) {
      drawChronoBayerHalo(ctx, this.x, this.groundY - 2, 54, 14, '#2dd4bf', '#2dd4bf', 0.12);
    }

    if (this.eternalZeroDome) {
      this.drawEternalZeroClockDome(ctx, vfxSheet, renderer);
    }

    if (this.pendulumSeal) {
      this.drawEscapementPendulumSeal(ctx, vfxSheet, renderer);
    }

    this.fx?.renderLayer(ctx, 'back', arenaCenterX, this.groundY, 0.96);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Roman-Numeral XII Floor Dial (`CHRONO-SCHISM: HOURGLASS SCHISM` Rewind Anchor)
    if (this.anchorActive && vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      drawChronoBayerHalo(ctx, this.anchorX, this.anchorY - 4, 88, 22, '#fde047', '#fde047', 0.13);
      const col = Math.floor(this.chronoPhase * 14) % 30;
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        1,
        col,
        this.anchorX,
        this.anchorY - 76,
        156,
        156,
        0.94,
        false,
        renderer,
        'gold'
      );
      PixelFont.drawCentered(ctx, 'XII', Math.round(this.anchorX), Math.round(this.anchorY - 12), 2, '#fde047', '#ffffff', true);
      drawTwoPassChronoHairline(ctx, this.anchorX, this.anchorY - 76, this.x, this.y - 88, '#facc15', '#ffffff', 0.72, 1);
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
      drawChronoBayerHalo(ctx, sf.x, sf.y - 4, 142, 26, '#2dd4bf', '#2dd4bf', Math.min(0.13, fade * 0.13));
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        2,
        col,
        sf.x,
        sf.y - 102,
        220,
        220,
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
        156,
        156,
        fade * 0.84,
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
        168,
        168,
        fade * 0.88,
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
        ctx.globalAlpha = fade * 0.42;
        PixelForge.drawSilhouetteFrame(ctx, sprites, ec.frameIdx, 208, 208, '#fde047');
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
        62,
        62,
        0.86,
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
        54,
        54,
        0.86,
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
    const arenaCenterX = this._resolveShaderCenterX(renderer);
    const sprites = this.getExSprites();
    const vfxSheet = PixelForge.ensureImage(sprites?.vfx);

    this.drawPhantomClonesPass(ctx, sprites, vfxSheet, renderer, true);

    this.fx?.renderLayer(ctx, 'front', arenaCenterX, this.groundY, 0.98);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Circular Blooming Roman Astrolabe Stasis Ring around Mid-Air Time-Stopped Enemies (0 boxy corner brackets!)
    if (this._frozenEnemiesRef && this._frozenEnemiesRef.length > 0 && vfxSheet?.complete && vfxSheet.naturalWidth) {
      const lockCol = Math.floor((this.stateTimer || 0) * 30) % 30;
      for (const foe of this._frozenEnemiesRef) {
        if (!foe || foe.isDead || !(foe.chronoTimeStopTimer > 0)) continue;
        this.drawBloomedVfxCell(
          ctx,
          vfxSheet,
          3,
          lockCol,
          foe.x,
          foe.y - 94,
          176,
          176,
          0.78,
          false,
          renderer,
          'teal'
        );
      }
    }

    if (this.suspendedClockSpears.length > 0) {
      for (let i = 0; i < this.suspendedClockSpears.length; i++) {
        this.drawPixelClockSpear(ctx, this.suspendedClockSpears[i], vfxSheet, renderer);
      }
    }

    // Crisp Cross-Needle Temporal Glass Spark Shards (0 boxy black background squares!)
    if (this.shatterClockShards.length > 0) {
      const px = 2;
      const snap = (v) => Math.round(v / px) * px;
      for (const sh of this.shatterClockShards) {
        const u = clamp01Local(sh.age / sh.maxLife);
        if (u >= 1) continue;
        const sx = snap(sh.x);
        const sy = snap(sh.y);
        const arm = u > 0.65 ? 4 : 6;
        ctx.globalAlpha = 1 - u * 0.85;
        ctx.fillStyle = sh.tone === 'gold' ? '#facc15' : '#2dd4bf';
        ctx.fillRect(sx - arm, sy, arm * 2 + px, px);
        ctx.fillRect(sx, sy - arm, px, arm * 2 + px);
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

    this.drawChronoThreadsAndParticles(ctx);
  }

  draw(ctx, isReflection = false, renderer = null) {
    const sprites = this.getExSprites();
    if (!sprites) return;

    const vfxSheet = PixelForge.ensureImage(sprites?.vfx);

    // Floor reflection pass: reflect active Doomsday Astrolabe, Hourglass & VFX animations at 0.35 alpha!
    if (isReflection && vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      if (this.eternalZeroDome && !this.eternalZeroDome.shattered && this.eternalZeroDome.alpha > 0.03) {
        const dome = this.eternalZeroDome;
        const col = Math.floor(dome.phase * 30) % 30;
        this.drawBloomedVfxCell(
          ctx,
          vfxSheet,
          3,
          col,
          dome.x,
          dome.y,
          388,
          388,
          dome.alpha * 0.35,
          false,
          renderer,
          dome.timeStopped ? 'teal' : 'gold',
          true
        );
      }
      if (this.pendulumSeal) {
        const ps = this.pendulumSeal;
        const fade = Math.min(1, (ps.maxLife - ps.life) * 3.2);
        if (fade > 0.03) {
          const col = Math.floor(ps.life * 30) % 30;
          this.drawBloomedVfxCell(
            ctx,
            vfxSheet,
            3,
            col,
            ps.x,
            ps.y,
            264,
            264,
            fade * 0.35,
            false,
            renderer,
            'teal',
            true
          );
        }
      }
      if (this.stasisField) {
        const sf = this.stasisField;
        const col = Math.floor(sf.life * 20) % 30;
        const fade = sf.life / sf.maxLife > 0.9 ? Math.max(0, (1 - sf.life / sf.maxLife) / 0.1) : 1;
        this.drawBloomedVfxCell(
          ctx,
          vfxSheet,
          2,
          col,
          sf.x,
          sf.y - 102,
          208,
          208,
          fade * 0.35,
          false,
          renderer,
          'teal',
          true
        );
      }
      for (let i = 0; i < this.activeVfxAnims.length; i++) {
        const v = this.activeVfxAnims[i];
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
          fade * 0.35,
          v.flipX,
          renderer,
          v.glowColor,
          true
        );
      }
    }

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
