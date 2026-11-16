import { Fighter } from './Fighter.js?v=30fps120';
import { PixelForge } from '../engine/PixelForge.js?v=30fps120';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps120';
import {
  RUNIC_STEEL_EFFECT_REGISTRY,
  RUNIC_CYAN_PALETTE,
  RUNIC_GOLD_PALETTE
} from '../engine/shaders/runicSteelShaders.js?v=30fps120';

const AUTO_SLICES_EX = [
  [60, 8], // Beat 1 (V0, 0.36s): Coiled Downward Dawn-Cleave -> snaps at F03 (63)
  [68, 7], // Beat 2 (V1, 0.34s): Instant Reverse Rising Heaven-Slash -> snaps at F09 (69)
  [75, 8], // Beat 3 (V2, 0.38s): Spinning Vortex Cross-Rip (2-hit) -> snaps at F17/F18 (77/78)
  [83, 7]  // Beat 4 (V3, 0.52s): Airborne Heavensplitter Execution -> leaps 83..84, slams at F25 (85)
];

const BEAT_DURATIONS = [0.36, 0.34, 0.38, 0.52];
const INTRA_COMBO_LINK = 0.015;

// 4x4 Bayer ordered stipple matrix for pixel-pure Neo-Vision floor & rim halos (zero radial blur!)
const BAYER_4X4 = [
  0.0625, 0.5625, 0.1875, 0.6875,
  0.8125, 0.3125, 0.9375, 0.4375,
  0.2500, 0.7500, 0.1250, 0.6250,
  1.0000, 0.5000, 0.8750, 0.3750
];

/**
 * Aethelgard EX (`warrior_ex`) — Newly-Born Neo-Vision Sovereign of the Dawn-Breaker Greatsword.
 * Wide-Canvas (`320x240`, `anchorX=112, anchorY=230`) FFBE / Last Cloudia Hack-and-Slash Champion.
 * Coexists 100% independently alongside untouched classic Aethelgard (`warrior`).
 *
 * Newly-Born Neo-Vision Kit:
 * - `SKILL` (`DAWN-BREAKER TRINITY RUSH`): Consecrates a golden-cyan Runic Sword-Seal underfoot,
 *   executes a 3-beat advancing Dawn-Breaker shockwave combo with `warrior_ex_vfx.png` sword-pillars,
 *   and finishes with a rising Sovereign Sky-Pillar Uppercut raining 4-point pixel star-glints!
 * - `ULTIMATE` (`CELESTIAL PENTAGRAM OMNISLASH`): Locks target inside a 5-point pixel Star-Sanctuary
 *   floor sigil, flashes through 5 golden-cyan Neo-Vision silhouettes linked by 3-pass `2px` astral
 *   light-threads, and plunges a towering Runic Monolith Greatsword from above!
 * - `TRUE_ULTIMATE` (`EXVIUS DAWN: CATHEDRAL OF SEVEN SWORDS`): Unfurls luminous pixel Seraphim Dawn-Wings,
 *   consecrates a full-stage Stained-Glass Runic Sanctuary, drops 6 flanking Celestial Greatswords of Light
 *   around the target, and cleaves Heaven-to-Earth with a Colossal Sovereign Dawn-Pillar & fluttering feathers!
 */
export class WarriorEx extends Fighter {
  constructor(x, groundY, facing = 1) {
    const opts = typeof x === 'object' && x !== null ? x : { x, groundY, facing };
    super({
      ...opts,
      name: opts.name || 'Aethelgard EX',
      maxHp: 4060,
      attackRange: 178,
      moveSpeed: 192,
      autoInterval: 1.04,
      lightColor: 'rgba(125, 211, 252, 1)',
      primaryColor: '#38bdf8',
      hasTrueUltimate: true,
      trueUltName: 'EXVIUS DAWN: CATHEDRAL OF SEVEN SWORDS',
      trueUltDuration: 4.35
    });

    this.heroId = 'warrior_ex';
    this.theme = 'exvius';
    this.secondaryColor = '#facc15';
    this.deathSfx = 'death_warrior';
    this.hasPoise = true;

    this.autoDuration = BEAT_DURATIONS[0];
    this._postFlurryInterval = 1.38;

    this.skillName = 'DAWN-BREAKER TRINITY RUSH';
    this.skillMaxCooldown = 4.6;
    this.skillCooldown = 1.2;
    this.skillDuration = 1.04;
    this.skillTriggerRange = 380;

    this.ultName = 'CELESTIAL PENTAGRAM OMNISLASH';
    this.ultSub = 'FIVE-POINT STAR SANCTUARY';
    this.ultDuration = 1.94;

    this.trueUltName = 'EXVIUS DAWN: CATHEDRAL OF SEVEN SWORDS';
    this.trueUltSub = 'SUPREME FINISHER - SEVEN SWORDS OF LIGHT';
    this.trueUltDuration = 4.35;

    this.dodgeMaxCooldown = 3.4;
    this.dashMaxCooldown = 3.1;
    this.crouchCooldown = 0;
    this.crouchDuration = 0.92;
    this.isCrouching = false;
    this.isDeflecting = false;
    this.vaultCooldown = 0;
    this.isFlipVault = false;
    this.flipStartX = this.x;
    this.flipTargetX = this.x;
    this.cameraAirLift = 0;

    // 4-Beat FFBE / Last Cloudia Grounded Hack-and-Slash State
    this.comboStep = 0;
    this._autoVariant = 0;
    this._comboPersistTimer = 0;
    this._queuedNextBeat = false;
    this._intraLinkTimer = 0;
    this._beatHitMask = 0;
    this._beatStartX = this.x;
    this._beatTargetX = this.x;
    this._bootsPlanted = false;
    this._dragSparkAcc = 0;

    // Skill / Overdrive / True Ultimate State
    this._skillSlashMask = 0;
    this._skillStartX = this.x;
    this._skillSeal = null;

    this._ultInit = false;
    this._ultSlashStep = 0;
    this._ultDidPlunge = false;
    this._ultTargetX = 600;
    this._pentagramSeal = null;

    this._trueUltInit = false;
    this._trueUltStage = 0;
    this._trueUltCageStep = 0;
    this._sanctuaryTimer = 0;
    this._sanctuaryCenterX = 600;
    this.pinnedCelestialSwords = [];

    this.justiceWingsActive = false;
    this.justiceWingSpread = 0;
    this.justiceFeatherTimer = 0;
    this.justiceFeathers = [];

    // Pixel-pure Neo-Vision visual layers (0 canvas rotation, 0 smooth ellipses, 0 chevron bars!)
    this._overrideFrameIdx = null;
    this.afterimages = [];
    this.afterimageAccum = 0;
    this.activeVfxAnims = [];
    this.astralThreads = [];
    this.hitStarbursts = [];
    this.exParticles = [];
    this.cathedralBeams = [];
    this.stepDustTimer = 0;
    this._ambientGlintTimer = 0;

    this.fx = new ArcaneShaderFX(RUNIC_STEEL_EFFECT_REGISTRY, {
      pixelScale: 3,
      viewW: 480,
      viewH: 280
    });
    this.haloFxSlot = null;

    if (typeof Image !== 'undefined') {
      PixelForge.ensureHeroLoaded?.('warrior_ex');
    }
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
      this._skillSlashMask = 0;
      this._skillStartX = this.x;
      this.afterimageAccum = 0;
      this.isDeflecting = false;
    }

    if (newState === 'ULTIMATE') {
      this._ultInit = false;
      this._ultSlashStep = 0;
      this._ultDidPlunge = false;
      this.isInvulnerable = true;
      this.isOmnislashing = true;
    } else {
      this._ultInit = false;
      if (newState !== 'TRUE_ULTIMATE') {
        this.isOmnislashing = false;
      }
    }

    if (newState === 'TRUE_ULTIMATE') {
      this._trueUltInit = false;
      this._trueUltStage = 0;
      this._trueUltCageStep = 0;
      this.pinnedCelestialSwords.length = 0;
      this.isInvulnerable = true;
      this.unstoppablePoise = true;
      this.isOmnislashing = true;
    } else {
      this._trueUltInit = false;
      this.justiceWingsActive = false;
      this.unstoppablePoise = false;
      if (newState !== 'ULTIMATE') {
        this.cameraAirLift = 0;
      }
    }

    if (newState === 'DEATH') {
      this.fx?.clear();
      this.haloFxSlot = null;
      this.justiceWingsActive = false;
      this.isOmnislashing = false;
      this.cameraAirLift = 0;
      this._overrideFrameIdx = null;
      this.trueUltFrameOverride = null;
      this._skillSeal = null;
      this._pentagramSeal = null;
      this._sanctuaryTimer = 0;
      this.pinnedCelestialSwords.length = 0;
      this.astralThreads.length = 0;
      this.hitStarbursts.length = 0;
      this.exParticles.length = 0;
      this.cathedralBeams.length = 0;
    }
  }

  _clampArenaX(xv, game) {
    const margin = 80;
    const minX =
      game?.adventure?.lockActive && Number.isFinite(game.adventure.lockMinX)
        ? game.adventure.lockMinX
        : margin;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const rawMaxX =
      game?.adventure?.lockActive && Number.isFinite(game.adventure.lockMaxX)
        ? game.adventure.lockMaxX
        : ww - margin;
    const bossAlive = Boolean(
      game?.adventure?.bossEntity &&
        !game.adventure.bossEntity.isDead &&
        game.adventure.bossEntity.isColossalBoss
    );
    const maxX = bossAlive
      ? Math.min(rawMaxX, (game.adventure.bossEntity.anchorX || 9335) - 92)
      : rawMaxX;
    return Math.max(minX, Math.min(maxX, xv));
  }

  _safeFxX(xv, game = this.game) {
    const g = game || this.game;
    const ww = g?.renderer ? g.renderer.worldWidth : 1200;
    return Math.max(48, Math.min(ww - 48, xv));
  }

  _resolveShaderCenterX(renderer) {
    const ww = renderer?.worldWidth || 1200;
    if (ww > 2400) {
      return Number.isFinite(renderer?.camX) ? renderer.camX : this.x;
    }
    return ww * 0.5;
  }

  _beginComboBeat(beatIdx, game) {
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
    let desiredX = this.x + this.facing * (v === 0 ? 18 : v === 2 ? 16 : 10);

    if (enemy && !enemy.isDead) {
      const sweetDist = v === 2 ? 108 : 114;
      const idealStandX = enemy.x - this.facing * sweetDist;
      const rawDelta = (idealStandX - this.x) * this.facing;
      const maxForward = v === 0 ? 112 : v === 2 ? 44 : 32;
      const clampedForward = Math.max(0, Math.min(maxForward, rawDelta));
      desiredX = this.x + this.facing * clampedForward;
    }

    this._beatTargetX = this._clampArenaX(desiredX, game);
  }

  queueNextComboBeat() {
    this._queuedNextBeat = true;
  }

  spawnAfterimage(x, y, facing, row, col, maxLife = 0.22, tint = 'cyan') {
    if (this.afterimages.length >= 16) this.afterimages.shift();
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
    if (this.activeVfxAnims.length >= 26) this.activeVfxAnims.shift();
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
      glowColor: opts.glowColor || 'cyan',
      foreground: opts.foreground !== false,
      followOwner: Boolean(opts.followOwner),
      offsetX: opts.offsetX || 0,
      offsetY: opts.offsetY || 0
    });
  }

  /**
   * Spawns a hairline 3-pass `2px` Astral Light-Thread (Pass 1 Selout -> Pass 2 Bevel -> Pass 3 White Core).
   * Zero per-step nested squares so overlapping chevrons can NEVER occur!
   */
  spawnAstralThread(x0, y0, x1, y1, maxLife = 0.42, isGold = false) {
    if (this.astralThreads.length >= 18) this.astralThreads.shift();
    this.astralThreads.push({
      x0: Math.round(x0 / 2) * 2,
      y0: Math.round(y0 / 2) * 2,
      x1: Math.round(x1 / 2) * 2,
      y1: Math.round(y1 / 2) * 2,
      age: 0,
      maxLife,
      isGold
    });
  }

  /**
   * Spawns an asymmetric 4-frame Neo-Vision pixel hit-starburst (zero chevron bars!).
   */
  spawnHitStarburst(x, y, isGold = false, scale = 1.0) {
    if (this.hitStarbursts.length >= 14) this.hitStarbursts.shift();
    this.hitStarbursts.push({
      x: Math.round(x / 2) * 2,
      y: Math.round(y / 2) * 2,
      age: 0,
      maxLife: 0.16,
      isGold,
      scale,
      flip: this.facing < 0
    });
  }

  /**
   * Spawns multi-shape Neo-Vision pixel particles (`star4`, `diamond`, `ring`, `rune`).
   */
  spawnExParticles(cx, cy, count = 8, opts = {}) {
    const shapes = opts.shapes || ['star4', 'diamond'];
    const speedMin = opts.speedMin ?? 42;
    const speedMax = opts.speedMax ?? 165;
    const lifeMin = opts.lifeMin ?? 0.24;
    const lifeMax = opts.lifeMax ?? 0.52;
    const gravity = opts.gravity ?? 80;
    const upwardBias = opts.upwardBias ?? -45;
    const spreadX = opts.spreadX ?? 16;
    const spreadY = opts.spreadY ?? 14;
    const isGold = Boolean(opts.isGold);

    for (let i = 0; i < count; i++) {
      if (this.exParticles.length >= 76) this.exParticles.shift();
      const ang = opts.rainDown
        ? Math.PI * 0.5 + (Math.random() - 0.5) * 0.6
        : Math.random() * Math.PI * 2;
      const spd = speedMin + Math.random() * (speedMax - speedMin);
      const kind = shapes[i % shapes.length];
      this.exParticles.push({
        kind,
        x: cx + (Math.random() - 0.5) * spreadX * 2,
        y: cy + (Math.random() - 0.5) * spreadY * 2,
        vx: Math.cos(ang) * spd * (opts.rainDown ? 0.35 : 1),
        vy: Math.sin(ang) * spd + upwardBias,
        gravity,
        age: 0,
        maxLife: lifeMin + Math.random() * (lifeMax - lifeMin),
        size: kind === 'ring' ? (opts.ringRadius || 54) : 3 + (i % 3),
        isGold: isGold ? i % 3 !== 1 : i % 3 === 0,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  spawnPixelShockRing(cx, groundY, maxRx = 92, isGold = false, maxLife = 0.34) {
    if (this.exParticles.length >= 76) this.exParticles.shift();
    this.exParticles.push({
      kind: 'ring',
      x: Math.round(cx / 2) * 2,
      y: Math.round(groundY / 2) * 2,
      vx: 0,
      vy: 0,
      gravity: 0,
      age: 0,
      maxLife,
      size: maxRx,
      isGold,
      phase: 0
    });
  }

  spawnCathedralBeam(x, groundY, width = 88, maxLife = 0.52) {
    this.cathedralBeams.push({
      x: Math.round(x),
      groundY: Math.round(groundY),
      width,
      age: 0,
      maxLife
    });
  }

  spawnExviusFeathers(game, count = 30) {
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const camX = game?.renderer?.cameraX || 0;
    const minX = game?.isAdventureMode?.() ? Math.max(40, camX - 80) : 50;
    const spanX = game?.isAdventureMode?.() ? 1360 : Math.max(960, ww - 100);
    this.justiceFeatherTimer = 4.8;
    for (let i = 0; i < count; i++) {
      if (this.justiceFeathers.length >= 38) break;
      this.justiceFeathers.push({
        x: minX + Math.random() * spanX,
        y: this.groundY - 120 - Math.random() * 380,
        vx: (Math.random() - 0.5) * 28,
        vy: 38 + Math.random() * 36,
        swayAmp: 18 + Math.random() * 20,
        swayFreq: 2.2 + Math.random() * 1.8,
        phase: Math.random() * Math.PI * 2,
        age: 0,
        maxLife: 4.2 + Math.random() * 0.9,
        drawSize: 54 + Math.floor(Math.random() * 18),
        frameOffset: Math.floor(Math.random() * 30),
        flipX: Math.random() < 0.5,
        isGold: i % 3 === 0
      });
    }
  }

  _gatherMeleeTargets(primaryEnemy, game, reachFront = 212, reachBack = 42) {
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
        if (Math.abs(foeGy - myGy) > 64) return;
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
   * Applies crunchy anime hit-stop (`_hitStopTimer`), `+-3px` target `_hitShakeTimer`, damage,
   * and crisp Neo-Vision 4-frame pixel hit-starbursts + multi-shape star/diamond particles!
   */
  _applyExviusStrike(primaryEnemy, game, cfg) {
    const {
      damage = 28,
      reachFront = 212,
      reachBack = 38,
      hitStop = 0.042,
      shakeDur = 0.055,
      knockX = 28,
      knockY = 0,
      isCrit = false,
      isGold = false,
      sfx = 'slash'
    } = cfg;

    if (game?.audio) game.audio.play(sfx, this.x + this.facing * 80);
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
      this.spawnHitStarburst(hitX, hitY, isGold, isCrit ? 1.25 : 1.0);
      this.spawnVfxAnim(4, hitX, hitY, 176, 176, 0.20, {
        flipX: this.facing < 0,
        glowColor: isGold ? 'gold' : 'cyan',
        foreground: true
      });
      this.spawnExParticles(hitX, hitY, isCrit ? 8 : 5, {
        shapes: ['star4', 'diamond'],
        speedMin: 56,
        speedMax: 175,
        lifeMin: 0.16,
        lifeMax: 0.34,
        gravity: 95,
        isGold
      });
      landedAny = true;
    }

    if (landedAny && hitStop > 0) {
      this._hitStopTimer = Math.max(this._hitStopTimer || 0, hitStop);
      game?.renderer?.triggerHitStop?.(hitStop * 0.65);
    }

    return landedAny;
  }

  fireDawnBladeWave(game, opts = {}) {
    if (!game?.vfx) return;
    const dir = this.facing;
    const spawnX = opts.x ?? this.x + dir * 88;
    const spawnY = opts.y ?? this.y - 78;
    const dmg = opts.damage ?? 28;
    game.vfx.spawnProjectile({
      x: spawnX,
      y: spawnY,
      vx: dir * (opts.speed ?? 660),
      vy: 0,
      radius: opts.radius ?? 22,
      damage: dmg,
      owner: this,
      color: '#38bdf8',
      coreColor: '#fef08a',
      type: 'blade_wave',
      pierce: opts.pierce !== false,
      isUltimate: Boolean(opts.isUltimate),
      maxRange: opts.maxRange ?? 430
    });
    this.spawnVfxAnim(0, spawnX, spawnY, 192, 192, 0.26, {
      vx: dir * 280,
      flipX: dir < 0,
      glowColor: opts.isGold ? 'gold' : 'cyan',
      foreground: true
    });
  }

  onProjectileTrail(proj, _game) {
    if (!proj) return;
    proj._trailAcc = (proj._trailAcc || 0) + 0.016;
    if (proj._trailAcc >= 0.048) {
      proj._trailAcc = 0;
      const dir = Math.sign(proj.vx || this.facing || 1);
      this.spawnExParticles(proj.x - dir * 16, proj.y, proj.isUltimate ? 3 : 2, {
        shapes: ['star4', 'diamond'],
        speedMin: 18,
        speedMax: 64,
        lifeMin: 0.14,
        lifeMax: 0.28,
        gravity: -18,
        upwardBias: -10,
        isGold: Boolean(proj.isUltimate)
      });
    }
  }

  onStartDash(enemy, game, dir) {
    this.dashDuration = 0.36;
    this.dashDir = dir || this.facing;
    if (game?.audio) game.audio.play('dash_whoosh', this.x);
    this.fx?.spawn('blinkTeleportPillar', this.x, this.groundY - 4, {
      flip: this.dashDir < 0,
      light: 1.2
    });
    this.spawnPixelShockRing(this.x, this.groundY - 2, 64, false, 0.24);
    if (enemy && !enemy.isDead) {
      const targetStandX = enemy.x - this.dashDir * 114;
      this._dashStopX = this._clampArenaX(targetStandX, game);
    } else {
      this._dashStopX = null;
    }
  }

  updateDash(dt, enemy, _game) {
    const t = this.stateTimer;
    const dur = this.dashDuration || 0.36;
    const dir = this.dashDir || this.facing;
    this.vy = 0;
    this.y = this.groundY;

    if (t < dur * 0.78) {
      const distToEnemy = enemy && !enemy.isDead ? (enemy.x - this.x) * dir : 999;
      if (distToEnemy <= 116 && distToEnemy >= 70) {
        this.vx = 0;
      } else {
        this.vx = dir * 640;
      }
      this._dragSparkAcc += dt;
      if (this._dragSparkAcc >= 0.036) {
        this._dragSparkAcc = 0;
        this.spawnAfterimage(this.x, this.y, this.facing, 6, Math.min(24, Math.floor((t / dur) * 30)), 0.18);
        this.spawnExParticles(this.x - dir * 42, this.groundY - 4, 3, {
          shapes: ['star4', 'diamond'],
          speedMin: 36,
          speedMax: 108,
          lifeMin: 0.14,
          lifeMax: 0.26,
          gravity: 120,
          upwardBias: -36,
          isGold: true
        });
      }
    } else {
      this.vx = 0;
    }

    if (t >= dur) {
      this.vx = 0;
      this.setState('IDLE');
    }
  }

  startCrouch(_enemy, game) {
    this.crouchCooldown = 3.2;
    this.dodgeCooldown = Math.max(this.dodgeCooldown, 1.4);
    this.isCrouching = true;
    this.isDeflecting = true;
    this.didSecondaryAction = false;
    this.vx = 0;
    this.setState('CROUCH');
    if (game?.audio) game.audio.play('parry_clang', this.x);
    this.spawnVfxAnim(1, this.x + this.facing * 20, this.y - 78, 188, 188, 0.38, {
      flipX: this.facing < 0,
      glowColor: 'gold',
      foreground: true,
      followOwner: true,
      offsetX: 20,
      offsetY: -78
    });
    this.spawnPixelShockRing(this.x, this.groundY - 2, 74, true, 0.28);
  }

  updateCrouch(_dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.crouchDuration || 0.92;
    this.vx = 0;
    this.isCrouching = true;
    this.isDeflecting = t < 0.56;

    if (this.isDeflecting && game?.vfx?.projectiles) {
      for (const proj of game.vfx.projectiles) {
        if (
          proj.owner !== this &&
          !proj._reflectedByEx &&
          Math.abs(proj.x - this.x) < 92 &&
          Math.abs(proj.y - (this.y - 82)) < 92
        ) {
          proj._reflectedByEx = true;
          proj.owner = this;
          proj.vx = -proj.vx * 1.25;
          proj.color = '#38bdf8';
          proj.coreColor = '#fef08a';
          if (game?.audio) game.audio.play('clang', proj.x);
          this.gainMana(14);
          this.gainFinisher(8);
          this.spawnHitStarburst(proj.x, proj.y, true, 1.15);
          this.spawnExParticles(proj.x, proj.y, 7, {
            shapes: ['star4', 'diamond'],
            isGold: true
          });
        }
      }
    }

    if (!this.didSecondaryAction && t >= 0.50) {
      this.didSecondaryAction = true;
      this.isDeflecting = false;
      const spawnX = this.x + this.facing * 78;
      const spawnY = this.y - 84;
      this.fx?.spawn('runebladeCrescentSlash', spawnX, spawnY, {
        flip: this.facing < 0,
        light: 1.28,
        extra: { radius: 34, width: 12, isGold: true }
      });
      this.fireDawnBladeWave(game, {
        x: spawnX,
        y: spawnY,
        damage: 34,
        speed: 690,
        maxRange: 480,
        isGold: true
      });
      this._applyExviusStrike(enemy, game, {
        damage: 44,
        reachFront: 215,
        hitStop: 0.045,
        shakeDur: 0.06,
        knockX: 95,
        knockY: -65,
        isCrit: true,
        isGold: true,
        sfx: 'heavy_cleave'
      });
    }

    if (t >= dur) {
      this.isCrouching = false;
      this.isDeflecting = false;
      this.setState('IDLE');
    }
  }

  startJump(enemy, game, dirOverride = null) {
    const dir = dirOverride || this.facing;
    this.facing = dir;
    this.vaultCooldown = 2.8;
    this.dodgeCooldown = Math.max(this.dodgeCooldown, 1.5);
    this.dashDuration = 0.54;
    this.isFlipVault = true;
    this.isInvulnerable = true;
    this.didSecondaryAction = false;
    this.flipStartX = this.x;

    let desiredX = this.x + dir * 195;
    if (enemy && !enemy.isDead && dir === (enemy.x >= this.x ? 1 : -1)) {
      desiredX = enemy.x - dir * 114;
    }
    this.flipTargetX = this._clampArenaX(desiredX, game);
    this.vx = 0;
    this.vy = 0;
    this.setState('JUMP');
    if (game?.audio) game.audio.play('storm_leap', this.x);
    this.spawnPixelShockRing(this.x, this.groundY - 2, 62, false, 0.24);
  }

  updateJump(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.dashDuration || 0.54;
    const u = Math.min(1, Math.max(0, t / dur));

    this.x = this.flipStartX + (this.flipTargetX - this.flipStartX) * (1 - Math.pow(1 - u, 1.8));
    this.y = this.groundY - Math.sin(u * Math.PI) * 112;
    this.isInvulnerable = u < 0.65;

    this.afterimageAccum += dt;
    if (this.afterimageAccum >= 0.055 && u < 0.82) {
      this.afterimageAccum = 0;
      this.spawnAfterimage(this.x, this.y, this.facing, 8, Math.min(28, Math.floor(u * 30)), 0.20);
    }

    if (!this.didSecondaryAction && u >= 0.54) {
      this.didSecondaryAction = true;
      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }
      this.fx?.spawn('runebladeCrescentSlash', this.x + this.facing * 56, this.y - 68, {
        flip: this.facing < 0,
        light: 1.24,
        extra: { radius: 34, width: 11.5, isGold: false }
      });
      this.fireDawnBladeWave(game, {
        x: this.x + this.facing * 68,
        y: Math.min(this.groundY - 68, this.y - 44),
        damage: 30,
        speed: 650,
        maxRange: 380
      });
      this._applyExviusStrike(enemy, game, {
        damage: 36,
        reachFront: 210,
        hitStop: 0.042,
        shakeDur: 0.055,
        knockX: 64,
        knockY: -45,
        sfx: 'heavy_cleave'
      });
    }

    if (u >= 1) {
      this.y = this.groundY;
      this.vx = 0;
      this.vy = 0;
      this.isFlipVault = false;
      this.isInvulnerable = false;
      this.spawnPixelShockRing(this.x, this.groundY - 2, 68, false, 0.24);
      this.setState('IDLE');
    }
  }

  updateDodge(dt, enemy, game) {
    this.updateJump(dt, enemy, game);
  }

  updateDashOrDodge(dt, enemy, game) {
    if (this.state === 'DASH') {
      this.updateDash(dt, enemy, game);
    } else {
      this.updateJump(dt, enemy, game);
    }
  }

  /**
   * 4-Beat Escalating FFBE / Last Cloudia Grounded Hack-and-Slash Combo (`[[60,8],[68,7],[75,8],[83,7]]`):
   * - Grounded Pre-Snap Impulse -> Hard-Locked Boots (`vx = 0`) right on the 1-frame smear snap!
   * - `0.015s` intra-combo link holding the beat end-pose frame with ZERO return to `IDLE`!
   * - Crunchy `_hitStopTimer` (`42ms`, `42ms`, `32ms+38ms`, `58ms`) + `+-3px` target `_hitShakeTimer`!
   */
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

      if (v === 0 && Math.abs(this._beatTargetX - this._beatStartX) > 26) {
        this._dragSparkAcc += dt;
        if (this._dragSparkAcc >= 0.034) {
          this._dragSparkAcc = 0;
          this.spawnAfterimage(this.x, this.y, this.facing, 2, localStep, 0.16);
          this.spawnExParticles(this.x - this.facing * 36, this.groundY - 4, 3, {
            shapes: ['star4', 'diamond'],
            speedMin: 32,
            speedMax: 92,
            lifeMin: 0.12,
            lifeMax: 0.24,
            gravity: 95,
            isGold: false
          });
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
        this.y = this.groundY - liftCurve * 64;
        this.vy = 0;
      } else {
        this.y = this.groundY;
        this.vy = 0;
      }
    } else {
      this.y = this.groundY;
      this.vy = 0;
    }

    if (v === 0) {
      if ((this._beatHitMask & 1) === 0 && t >= 0.10) {
        this._beatHitMask |= 1;
        this.spawnPixelShockRing(this.x + this.facing * 42, this.groundY - 2, 58, false, 0.22);
        this.fx?.spawn('runebladeCrescentSlash', this.x + this.facing * 68, this.y - 84, {
          flip: this.facing < 0,
          light: 1.20,
          extra: { radius: 34, width: 11, isGold: false }
        });
        this._applyExviusStrike(enemy, game, {
          damage: 28,
          reachFront: 214,
          hitStop: 0.042,
          shakeDur: 0.055,
          knockX: 24,
          knockY: 0,
          isGold: false,
          sfx: 'slash'
        });
      }
    } else if (v === 1) {
      if ((this._beatHitMask & 1) === 0 && t >= 0.06) {
        this._beatHitMask |= 1;
        const waveX = this.x + this.facing * 76;
        this.spawnPixelShockRing(waveX, this.groundY - 2, 72, true, 0.24);
        this.fx?.spawn('runebladeCrescentSlash', waveX, this.y - 96, {
          flip: this.facing < 0,
          palette: RUNIC_GOLD_PALETTE,
          light: 1.24,
          extra: { radius: 36, width: 11.5, isGold: true }
        });
        this.spawnVfxAnim(2, waveX, this.groundY - 72, 180, 180, 0.28, {
          flipX: this.facing < 0,
          glowColor: 'gold',
          foreground: false
        });
        this._applyExviusStrike(enemy, game, {
          damage: 30,
          reachFront: 216,
          hitStop: 0.042,
          shakeDur: 0.058,
          knockX: 22,
          knockY: -138,
          isGold: true,
          sfx: 'slash'
        });
      }
    } else if (v === 2) {
      if ((this._beatHitMask & 1) === 0 && t >= 0.08) {
        this._beatHitMask |= 1;
        this.fx?.spawn('runebladeCrescentSlash', this.x + this.facing * 70, this.y - 86, {
          flip: this.facing < 0,
          light: 1.20,
          extra: { radius: 34, width: 10.5, eccentricity: 0.34, isGold: false }
        });
        this._applyExviusStrike(enemy, game, {
          damage: 19,
          reachFront: 214,
          hitStop: 0.032,
          shakeDur: 0.046,
          knockX: 14,
          knockY: -22,
          isGold: false,
          sfx: 'slash'
        });
      }
      if ((this._beatHitMask & 2) === 0 && t >= 0.14) {
        this._beatHitMask |= 2;
        this.fx?.spawn('runebladeCrescentSlash', this.x + this.facing * 74, this.y - 90, {
          flip: this.facing > 0,
          palette: RUNIC_GOLD_PALETTE,
          light: 1.24,
          extra: { radius: 35, width: 11, eccentricity: 0.34, isGold: true }
        });
        this._applyExviusStrike(enemy, game, {
          damage: 22,
          reachFront: 216,
          hitStop: 0.038,
          shakeDur: 0.052,
          knockX: 18,
          knockY: -36,
          isGold: true,
          sfx: 'clang'
        });
      }
    } else {
      if ((this._beatHitMask & 1) === 0 && t >= 0.16) {
        this._beatHitMask |= 1;
        const slamX = this.x + this.facing * 82;
        game?.renderer?.triggerShake?.(13, 0.26);
        if (game?.audio) game.audio.play('thunder_slam', slamX);
        this.spawnPixelShockRing(slamX, this.groundY - 2, 102, true, 0.30);
        this.fx?.spawn('earthshatterJudgmentWave', slamX, this.groundY - 2, {
          flip: this.facing < 0,
          light: 1.30,
          extra: { isUltimate: false }
        });
        this.spawnVfxAnim(2, slamX, this.groundY - 78, 224, 224, 0.38, {
          flipX: this.facing < 0,
          glowColor: 'gold',
          foreground: false
        });
        this._applyExviusStrike(enemy, game, {
          damage: 24,
          reachFront: 222,
          hitStop: 0.058,
          shakeDur: 0.082,
          knockX: 36,
          knockY: -45,
          isCrit: true,
          isGold: true,
          sfx: 'heavy_cleave'
        });
        this.fireDawnBladeWave(game, {
          x: slamX,
          y: this.groundY - 76,
          damage: 26,
          speed: 680,
          maxRange: 430,
          pierce: true,
          isGold: true
        });
      }
      if ((this._beatHitMask & 2) === 0 && t >= 0.21) {
        this._beatHitMask |= 2;
        this._applyExviusStrike(enemy, game, {
          damage: 16,
          reachFront: 224,
          hitStop: 0,
          shakeDur: 0.045,
          knockX: 28,
          knockY: -35,
          isGold: false,
          sfx: 'clang'
        });
      }
      if ((this._beatHitMask & 4) === 0 && t >= 0.26) {
        this._beatHitMask |= 4;
        this._applyExviusStrike(enemy, game, {
          damage: 22,
          reachFront: 226,
          hitStop: 0,
          shakeDur: 0.055,
          knockX: 92,
          knockY: -88,
          isCrit: true,
          isGold: true,
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
            game?.adventure?.queuedAction === 'attack' ||
            this._queuedNextBeat)
      );
      const aiWantsChain =
        !isManualPlayer &&
        enemy &&
        !enemy.isDead &&
        !enemy.isInvulnerable &&
        Math.abs(enemy.x - this.x) <= 245;

      if (v < 3 && (aiWantsChain || advHoldingAttack)) {
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

  /**
   * NEWLY-BORN SKILL (`4.6s CD`, `1.04s`, Row 3 `90..119`):
   * `DAWN-BREAKER TRINITY RUSH`
   * - Consecrates a golden-cyan Runic Sword-Seal underfoot (`t = 0.02s`),
   * - Executes a 3-beat advancing Dawn-Breaker shockwave combo with crisp `warrior_ex_vfx.png` sword-pillars,
   * - Finishes with a rising Sovereign Sky-Pillar Uppercut raining 4-point pixel star-glints!
   */
  updateSkill(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.skillDuration || 1.04;
    this.unstoppablePoise = true;
    this.isDeflecting = t < 0.56;

    // Beat 0 (t = 0.02s): Consecrate Golden-Cyan Runic Sword-Seal Underfoot!
    if ((this._skillSlashMask & 16) === 0 && t >= 0.02) {
      this._skillSlashMask |= 16;
      if (game?.audio) game.audio.play('skill_cast', this.x);
      this._skillSeal = {
        x: this.x,
        y: this.groundY,
        age: 0,
        maxLife: 0.96
      };
      this.spawnVfxAnim(3, this.x, this.groundY - 12, 224, 128, 0.72, {
        flipX: false,
        glowColor: 'gold',
        foreground: false
      });
      this.spawnVfxAnim(1, this.x, this.groundY - 46, 204, 204, 0.52, {
        flipX: this.facing < 0,
        glowColor: 'gold',
        foreground: false
      });
      game?.vfx?.spawnShockwave?.(this.x, this.groundY - 2, '#38bdf8', 96, 0.28);
      this.spawnPixelShockRing(this.x, this.groundY - 2, 86, true, 0.30);
      game?.vfx?.spawnDamageText?.(this.x, this.y - 154, 0, false, 'DAWN SWORD-SEAL!', '#fde047');
    }

    if (this.isDeflecting && game?.vfx?.projectiles) {
      for (const proj of game.vfx.projectiles) {
        if (
          proj.owner !== this &&
          !proj._reflectedByExSkill &&
          Math.abs(proj.x - this.x) < 88 &&
          Math.abs(proj.y - (this.y - 80)) < 88
        ) {
          proj._reflectedByExSkill = true;
          proj.owner = this;
          proj.vx = -proj.vx * 1.15;
          if (game?.audio) game.audio.play('clang', proj.x);
          this.spawnHitStarburst(proj.x, proj.y, true, 1.0);
        }
      }
    }

    // Advancing 3-Beat Trinity Rush bursts into 108px sweet-spot
    if (t < 0.54) {
      const dist = enemy && !enemy.isDead ? (enemy.x - this.x) * this.facing : 150;
      const inBurstWindow =
        (t >= 0.04 && t < 0.13) || (t >= 0.20 && t < 0.29) || (t >= 0.36 && t < 0.45);
      if (inBurstWindow && dist > 108) {
        this.vx = this.facing * Math.min(560, (dist - 104) * 9.5 + 220);
      } else {
        this.vx = 0;
      }
      this.afterimageAccum += dt;
      if (this.afterimageAccum >= 0.042) {
        this.afterimageAccum = 0;
        const col = Math.min(18, Math.floor((t / dur) * 30));
        this.spawnAfterimage(this.x, this.y, this.facing, 3, col, 0.24, col % 2 === 0 ? 'gold' : 'cyan');
      }
    } else {
      this.vx = 0;
    }

    // Beat 1 (t = 0.14s): First Dawn-Breaker Sword-Pillar Shockwave
    if ((this._skillSlashMask & 1) === 0 && t >= 0.14) {
      this._skillSlashMask |= 1;
      this.vx = 0;
      const p1X = this.x + this.facing * 74;
      this.spawnVfxAnim(2, p1X, this.groundY - 70, 184, 184, 0.32, {
        flipX: this.facing < 0,
        glowColor: 'cyan',
        foreground: false
      });
      game?.vfx?.spawnCrystalSpike?.({
        x: p1X,
        groundY: this.groundY,
        height: 82,
        width: 26,
        tilt: this.facing * 0.14,
        color: '#38bdf8',
        coreColor: '#ffffff',
        owner: this,
        target: null,
        damage: 0,
        delay: 0.01,
        maxLife: 0.34,
        isUltimate: false
      });
      this.spawnPixelShockRing(p1X, this.groundY - 2, 68, false, 0.24);
      this._applyExviusStrike(enemy, game, {
        damage: 24,
        reachFront: 218,
        hitStop: 0.032,
        shakeDur: 0.048,
        knockX: 22,
        knockY: -18,
        isGold: false,
        sfx: 'slash'
      });
    }

    // Beat 2 (t = 0.30s): Second Golden Dawn-Breaker Sword-Pillar Shockwave
    if ((this._skillSlashMask & 2) === 0 && t >= 0.30) {
      this._skillSlashMask |= 2;
      this.vx = 0;
      const p2X = this.x + this.facing * 82;
      this.spawnVfxAnim(2, p2X, this.groundY - 76, 198, 198, 0.34, {
        flipX: this.facing > 0,
        glowColor: 'gold',
        foreground: true
      });
      this.spawnPixelShockRing(p2X, this.groundY - 2, 76, true, 0.26);
      this._applyExviusStrike(enemy, game, {
        damage: 26,
        reachFront: 220,
        hitStop: 0.032,
        shakeDur: 0.048,
        knockX: 22,
        knockY: -28,
        isGold: true,
        sfx: 'clang'
      });
    }

    // Beat 3 (t = 0.46s): Third Sovereign Trinity Sword-Pillar Shockwave
    if ((this._skillSlashMask & 4) === 0 && t >= 0.46) {
      this._skillSlashMask |= 4;
      this.vx = 0;
      const p3X = this.x + this.facing * 90;
      this.spawnVfxAnim(2, p3X, this.groundY - 82, 212, 212, 0.36, {
        flipX: this.facing < 0,
        glowColor: 'cyan',
        foreground: true
      });
      this._applyExviusStrike(enemy, game, {
        damage: 28,
        reachFront: 222,
        hitStop: 0.036,
        shakeDur: 0.052,
        knockX: 16,
        knockY: -55,
        isGold: false,
        sfx: 'slash'
      });
    }

    // Finisher (t = 0.68s): Rising Sovereign Sky-Pillar Uppercut + Raining 4-Point Pixel Star-Glints!
    if (t >= 0.58 && t < 0.86) {
      const hopU = (t - 0.58) / 0.28;
      this.y = this.groundY - Math.sin(hopU * Math.PI) * 58;
    } else {
      this.y = this.groundY;
    }

    if ((this._skillSlashMask & 8) === 0 && t >= 0.68) {
      this._skillSlashMask |= 8;
      const pillarX = this._safeFxX(this.x + this.facing * 88, game);
      game?.renderer?.triggerShake?.(15, 0.28);
      game?.renderer?.triggerImpactFrame?.(pillarX, this.groundY - 96, 0.06, 'exvius');
      if (game?.audio) game.audio.play('thunder_slam', pillarX);

      this.fx?.spawn('skyJudgmentPillar', pillarX, this.groundY - 2, {
        flip: this.facing < 0,
        light: 1.34
      });
      game?.vfx?.spawnSkyStrike?.({
        x: pillarX,
        groundY: this.groundY,
        owner: this,
        target: null,
        damage: 0,
        delay: 0.01,
        flightDuration: 0.13,
        impactDuration: 0.36,
        type: 'runeblade',
        color: '#fde047',
        scale: 1.18,
        isUltimate: false
      });
      game?.vfx?.spawnCrystalSpike?.({
        x: pillarX,
        groundY: this.groundY,
        height: 118,
        width: 34,
        tilt: this.facing * 0.08,
        color: '#fde047',
        coreColor: '#ffffff',
        owner: this,
        target: null,
        damage: 0,
        delay: 0.02,
        maxLife: 0.42,
        isUltimate: false
      });
      game?.vfx?.spawnDecal?.(pillarX, this.groundY, 'crater', 84);
      game?.vfx?.spawnShockwave?.(pillarX, this.groundY - 2, '#fde047', 128, 0.32);
      this.spawnCathedralBeam(pillarX, this.groundY, 54, 0.36);
      this.spawnVfxAnim(2, pillarX, this.groundY - 88, 244, 244, 0.44, {
        flipX: this.facing < 0,
        glowColor: 'gold',
        foreground: true
      });
      this.spawnPixelShockRing(pillarX, this.groundY - 2, 114, true, 0.34);

      // Rain of 14 twinkling 4-point pixel star-glints down through the Sky-Pillar!
      this.spawnExParticles(pillarX, this.groundY - 196, 14, {
        shapes: ['star4', 'star4', 'diamond'],
        speedMin: 35,
        speedMax: 95,
        lifeMin: 0.38,
        lifeMax: 0.68,
        gravity: 165,
        upwardBias: 15,
        spreadX: 54,
        spreadY: 42,
        rainDown: true,
        isGold: true
      });

      game?.vfx?.spawnDamageText?.(pillarX, this.groundY - 178, 0, true, 'SOVEREIGN SKY-PILLAR!', '#fde047');

      this._applyExviusStrike(enemy, game, {
        damage: 46,
        reachFront: 232,
        hitStop: 0.052,
        shakeDur: 0.075,
        knockX: 118,
        knockY: -165,
        isCrit: true,
        isGold: true,
        sfx: 'heavy_cleave'
      });
      this.fireDawnBladeWave(game, {
        x: pillarX,
        y: this.groundY - 78,
        damage: 28,
        speed: 700,
        maxRange: 460,
        isGold: true
      });
    }

    if (t >= dur) {
      this.y = this.groundY;
      this.vx = 0;
      this.isDeflecting = false;
      this.unstoppablePoise = false;
      this.setState('IDLE');
    }
  }

  /**
   * NEWLY-BORN OVERDRIVE (`1.94s`, Row 4 `120..149`):
   * `CELESTIAL PENTAGRAM OMNISLASH`
   * - Locks `enemy` inside a 5-point pixel Star-Sanctuary floor sigil (`Row 3` + 5-vertex star chords),
   * - Flashes through 5 golden-cyan Neo-Vision silhouettes linked by hairline 3-pass `2px` astral light-threads,
   * - Plunges a towering Runic Monolith Greatsword (`Row 6`) from above!
   */
  updateUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.ultDuration || 1.94;
    this.isInvulnerable = true;
    this.isOmnislashing = true;
    this.vx = 0;
    this.vy = 0;

    if (!this._ultInit) {
      this._ultInit = true;
      this._ultSlashStep = 0;
      this._ultDidPlunge = false;
      this._ultTargetX =
        enemy && !enemy.isDead
          ? enemy.x
          : this._clampArenaX(this.x + this.facing * 180, game);
      if (game?.audio) game.audio.play('ult_cast', this.x);
      this.fx?.spawn('blinkTeleportPillar', this.x, this.groundY - 4, {
        flip: this.facing < 0,
        light: 1.30
      });
      this._pentagramSeal = {
        x: this._ultTargetX,
        y: this.groundY,
        rx: 158,
        ry: 34,
        age: 0,
        maxLife: 1.82
      };
      this.spawnVfxAnim(3, this._ultTargetX, this.groundY - 12, 296, 156, 1.68, {
        flipX: false,
        glowColor: 'gold',
        foreground: false
      });
      game?.vfx?.spawnDamageText?.(this._ultTargetX, this.groundY - 196, 0, true, 'PENTAGRAM SANCTUARY!', '#38bdf8');
    }

    if (enemy && !enemy.isDead) {
      this._ultTargetX = enemy.x;
      if (this._pentagramSeal) this._pentagramSeal.x = enemy.x;
    }
    const tx = this._ultTargetX;

    // 5-Vertex Pentagram Star-Flash Blitz (`0->2->4->1->3->0` star chords in 3-pass `2px` astral light-threads!)
    const cutSchedule = [
      { time: 0.18, ox: -124, oy: -4, face: 1, frame: 126, txOff: 124, tyOff: -78, gold: false },
      { time: 0.40, ox: 124, oy: -68, face: -1, frame: 130, txOff: -96, tyOff: -12, gold: true },
      { time: 0.62, ox: -96, oy: -12, face: 1, frame: 134, txOff: 0, tyOff: -124, gold: false },
      { time: 0.84, ox: 96, oy: -12, face: -1, frame: 138, txOff: -124, tyOff: -68, gold: true },
      { time: 1.06, ox: 0, oy: -136, face: this.facing, frame: 142, txOff: 0, tyOff: -14, gold: true }
    ];

    while (this._ultSlashStep < 5 && t >= cutSchedule[this._ultSlashStep].time) {
      const cut = cutSchedule[this._ultSlashStep];
      this._ultSlashStep++;

      const prevX = this.x;
      const prevY = this.y - 72;
      this.spawnAfterimage(
        this.x,
        this.y,
        this.facing,
        4,
        (cut.frame - 120 + 28) % 30,
        0.46,
        cut.gold ? 'gold' : 'cyan'
      );

      this.x = this._clampArenaX(tx + cut.ox, game);
      this.y = this.groundY + cut.oy;
      this.facing = cut.face;
      this.trueUltFrameOverride = cut.frame;
      this._overrideFrameIdx = cut.frame;

      // Crisp golden-cyan Neo-Vision silhouette at vertex
      this.spawnAfterimage(
        this.x,
        this.y,
        this.facing,
        4,
        cut.frame - 120,
        0.52,
        cut.gold ? 'gold' : 'cyan'
      );

      // Hairline 3-pass `2px` astral light-thread tracing the Pentagram Star chord!
      this.spawnAstralThread(
        prevX,
        prevY,
        this._clampArenaX(tx + cut.txOff, game),
        this.groundY + cut.tyOff,
        0.64,
        cut.gold
      );

      this.fx?.spawn('runebladeCrescentSlash', tx, this.groundY - 92, {
        flip: cut.face < 0,
        palette: cut.gold ? RUNIC_GOLD_PALETTE : RUNIC_CYAN_PALETTE,
        light: 1.28,
        extra: { radius: 38, width: 12, isGold: cut.gold }
      });
      this._applyExviusStrike(enemy, game, {
        damage: 30,
        reachFront: 245,
        reachBack: 145,
        hitStop: 0.028,
        shakeDur: 0.052,
        knockX: 8,
        knockY: -32,
        isCrit: cut.gold,
        isGold: cut.gold,
        sfx: 'slash'
      });
    }

    // Stage 6 (1.22..1.50s): Hover -> Plunge Towering Runic Monolith Greatsword from above at t = 1.50s!
    if (t >= 1.22 && t < 1.50) {
      const hoverU = (t - 1.22) / 0.28;
      this.x = this._clampArenaX(tx - this.facing * 52, game);
      this.y = this.groundY - 172 * (1 - Math.pow(hoverU, 2.4));
      this.cameraAirLift = Math.max(0, (this.groundY - this.y) * 0.45);
      this.trueUltFrameOverride = 143;
      this._overrideFrameIdx = 143;
      this.afterimageAccum += dt;
      if (this.afterimageAccum >= 0.044) {
        this.afterimageAccum = 0;
        this.spawnAfterimage(this.x, this.y, this.facing, 4, 23, 0.28, 'gold');
      }
    } else if (t >= 1.50) {
      this.y = this.groundY;
      this.cameraAirLift = 0;
      const finCol = 24 + Math.min(5, Math.floor(((t - 1.50) / 0.44) * 6));
      this.trueUltFrameOverride = 120 + finCol;
      this._overrideFrameIdx = 120 + finCol;

      if (!this._ultDidPlunge) {
        this._ultDidPlunge = true;
        const impactX = this._clampArenaX(tx, game);
        if (game?.audio) game.audio.play('thunder_slam', impactX);
        game?.renderer?.triggerShake?.(18, 0.36);
        game?.renderer?.triggerImpactFrame?.(impactX, this.groundY - 108, 0.09, 'exvius');
        game?.renderer?.triggerHitStop?.(0.065);

        // Towering Runic Monolith Greatsword (`Row 6`) + SkyStrike Runeblade plunging straight into the Pentagram heart!
        game?.vfx?.spawnSkyStrike?.({
          x: impactX,
          groundY: this.groundY,
          owner: this,
          target: null,
          damage: 0,
          delay: 0.01,
          flightDuration: 0.12,
          impactDuration: 0.44,
          type: 'runeblade',
          color: '#fde047',
          scale: 1.42,
          isUltimate: true
        });
        for (const side of [-1, 1]) {
          game?.vfx?.spawnCrystalSpike?.({
            x: this._safeFxX(impactX + side * 74, game),
            groundY: this.groundY,
            height: 112,
            width: 32,
            tilt: side * 0.16,
            color: side < 0 ? '#38bdf8' : '#fde047',
            coreColor: '#ffffff',
            owner: this,
            target: null,
            damage: 0,
            delay: 0.03,
            maxLife: 0.46,
            isUltimate: true
          });
        }
        game?.vfx?.spawnDecal?.(impactX, this.groundY, 'crater', 118);
        game?.vfx?.spawnShockwave?.(impactX, this.groundY - 2, '#fde047', 164, 0.38);
        this.spawnVfxAnim(6, impactX, this.groundY - 118, 296, 296, 0.48, {
          flipX: false,
          glowColor: 'gold',
          foreground: true
        });
        this.spawnCathedralBeam(impactX, this.groundY, 72, 0.40);
        this.spawnPixelShockRing(impactX, this.groundY - 2, 152, true, 0.38);
        this.spawnExParticles(impactX, this.groundY - 96, 16, {
          shapes: ['star4', 'diamond'],
          speedMin: 68,
          speedMax: 210,
          lifeMin: 0.24,
          lifeMax: 0.54,
          gravity: 110,
          isGold: true
        });

        this.fx?.spawn('skyJudgmentPillar', impactX, this.groundY - 2, {
          flip: this.facing < 0,
          light: 1.38
        });
        this.fx?.spawn('earthshatterJudgmentWave', impactX, this.groundY - 2, {
          flip: this.facing < 0,
          light: 1.36,
          extra: { isUltimate: true }
        });

        this._applyExviusStrike(enemy, game, {
          damage: 78,
          reachFront: 265,
          reachBack: 150,
          hitStop: 0.056,
          shakeDur: 0.09,
          knockX: 145,
          knockY: -175,
          isCrit: true,
          isGold: true,
          sfx: 'heavy_cleave'
        });
        this.fireDawnBladeWave(game, {
          x: impactX,
          y: this.groundY - 80,
          damage: 38,
          speed: 740,
          maxRange: 540,
          isUltimate: true,
          isGold: true
        });
      }
    }

    if (t >= dur) {
      this.y = this.groundY;
      this.cameraAirLift = 0;
      this.isInvulnerable = false;
      this.isOmnislashing = false;
      this._pentagramSeal = null;
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      this.setState('IDLE');
    }
  }

  /**
   * NEWLY-BORN SUPREME FINISHER (`4.35s`):
   * `EXVIUS DAWN: CATHEDRAL OF SEVEN SWORDS`
   * - Phase 1 (`0.00..1.20s`): Unfurls luminous Seraphim Dawn-Wings & consecrates a full-stage Stained-Glass Runic Sanctuary!
   * - Phase 2 (`1.20..2.58s`): Drops 6 flanking Celestial Greatswords of Light around the target!
   * - Phase 3 (`2.58..3.42s`): High-Sky Seraphic Ascent framed by the Stained-Glass Rose-Window!
   * - Phase 4 (`3.42..4.35s`): Cleaves Heaven-to-Earth with the 7th Colossal Sovereign Dawn-Pillar & 32 fluttering feathers!
   */
  updateTrueUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.trueUltDuration || 4.35;
    this.isInvulnerable = true;
    this.unstoppablePoise = true;
    this.isOmnislashing = true;
    this.vx = 0;
    this.vy = 0;

    if (!this._trueUltInit) {
      this._trueUltInit = true;
      this._trueUltStage = 1;
      this._trueUltCageStep = 0;
      this.pinnedCelestialSwords.length = 0;
      this._ultTargetX =
        enemy && !enemy.isDead
          ? enemy.x
          : this._clampArenaX(this.x + this.facing * 200, game);
      this._sanctuaryCenterX = this._ultTargetX;
      this._sanctuaryTimer = 4.25;

      if (game?.audio) game.audio.play('ult_cast', this.x);
      game?.vfx?.triggerCinematicCutIn?.(this, this.trueUltName, '#38bdf8');
      this.fx?.spawn('celestialCathedralConsecration', this.x, this.groundY - 4, {
        flip: this.facing < 0,
        light: 1.38
      });
      this.spawnVfxAnim(3, this._ultTargetX, this.groundY - 12, 312, 160, 2.55, {
        flipX: false,
        glowColor: 'gold',
        foreground: false
      });
      this.spawnPixelShockRing(this.x, this.groundY - 2, 136, true, 0.42);
    }

    if (enemy && !enemy.isDead && t < 2.58) {
      this._ultTargetX = enemy.x;
      this._sanctuaryCenterX = enemy.x;
    }
    const tx = this._ultTargetX;

    // Phase 1 (0.00..1.20s): Unfurl Luminous Seraphim Dawn-Wings & Consecrate Stained-Glass Sanctuary
    if (t < 1.20) {
      const vowFrame = 120 + Math.min(5, Math.floor((t / 1.20) * 6));
      this.trueUltFrameOverride = vowFrame;
      this._overrideFrameIdx = vowFrame;
      this.justiceWingsActive = t >= 0.36;
      this.justiceWingSpread = Math.min(1, Math.max(0, (t - 0.36) / 0.62));
      return;
    }

    // Phase 2 (1.20..2.58s): Drop 6 Flanking Celestial Greatswords of Light around Target!
    if (t < 2.58) {
      this.justiceWingsActive = true;
      this.justiceWingSpread = 1.0;
      const swordSchedule = [
        { time: 1.26, swordOff: -198, heroOff: -126, oy: 0, face: 1, frame: 63, gold: false },
        { time: 1.46, swordOff: 198, heroOff: 126, oy: -22, face: -1, frame: 69, gold: true },
        { time: 1.66, swordOff: -134, heroOff: -112, oy: -52, face: 1, frame: 77, gold: false },
        { time: 1.86, swordOff: 134, heroOff: 112, oy: -52, face: -1, frame: 78, gold: true },
        { time: 2.06, swordOff: -70, heroOff: -88, oy: -88, face: 1, frame: 134, gold: false },
        { time: 2.26, swordOff: 70, heroOff: 88, oy: -88, face: -1, frame: 138, gold: true }
      ];

      while (this._trueUltCageStep < 6 && t >= swordSchedule[this._trueUltCageStep].time) {
        const s = swordSchedule[this._trueUltCageStep];
        this._trueUltCageStep++;
        const prevX = this.x;
        const prevY = this.y - 74;

        this.spawnAfterimage(this.x, this.y, this.facing, 4, 14, 0.44, s.gold ? 'gold' : 'cyan');
        this.x = this._clampArenaX(tx + s.heroOff, game);
        this.y = this.groundY + s.oy;
        this.facing = s.face;
        this.trueUltFrameOverride = s.frame;
        this._overrideFrameIdx = s.frame;
        this.spawnAfterimage(this.x, this.y, this.facing, 4, 18, 0.44, s.gold ? 'gold' : 'cyan');

        const swordX = this._clampArenaX(tx + s.swordOff, game);
        this.pinnedCelestialSwords.push({
          x: swordX,
          groundY: this.groundY,
          age: 0,
          maxLife: 2.65,
          isGold: s.gold,
          erupted: false
        });
        game?.vfx?.spawnSkyStrike?.({
          x: swordX,
          groundY: this.groundY,
          owner: this,
          target: null,
          damage: 0,
          delay: 0.01,
          flightDuration: 0.14,
          impactDuration: 0.38,
          type: 'runeblade',
          color: s.gold ? '#fde047' : '#38bdf8',
          scale: 1.15,
          isUltimate: true
        });
        game?.vfx?.spawnCrystalSpike?.({
          x: swordX,
          groundY: this.groundY,
          height: 104,
          width: 30,
          tilt: s.swordOff < 0 ? -0.14 : 0.14,
          color: s.gold ? '#fde047' : '#38bdf8',
          coreColor: '#ffffff',
          owner: this,
          target: null,
          damage: 0,
          delay: 0.05,
          maxLife: 0.52,
          isUltimate: true
        });
        this.spawnAstralThread(prevX, prevY, swordX, this.groundY - 92, 0.72, s.gold);
        this.spawnPixelShockRing(swordX, this.groundY - 2, 68, s.gold, 0.28);
        this.spawnExParticles(swordX, this.groundY - 42, 7, {
          shapes: ['star4', 'diamond'],
          isGold: s.gold
        });

        this.fx?.spawn('runebladeCrescentSlash', tx, this.groundY - 96, {
          flip: s.face < 0,
          palette: s.gold ? RUNIC_GOLD_PALETTE : RUNIC_CYAN_PALETTE,
          light: 1.30,
          extra: { radius: 40, width: 12.5, isGold: s.gold }
        });
        this._applyExviusStrike(enemy, game, {
          damage: 24,
          reachFront: 280,
          reachBack: 180,
          hitStop: 0.022,
          shakeDur: 0.048,
          knockX: 4,
          knockY: -26,
          isCrit: s.gold,
          isGold: s.gold,
          sfx: 'slash'
        });
      }
      return;
    }

    // Phase 3 (2.58..3.42s): High-Sky Winged Ascent & Stained-Glass Rose Lock-On
    if (t < 3.42) {
      if (this._trueUltStage < 3) {
        this._trueUltStage = 3;
        if (game?.audio) game.audio.play('dash_whoosh', this.x);
        this.fx?.spawn('blinkTeleportPillar', this.x, this.y, {
          flip: this.facing < 0,
          light: 1.32
        });
      }
      const ascU = Math.min(1, (t - 2.58) / 0.84);
      const lift = 420 * (1 - Math.pow(1 - ascU, 2.2));
      this.x = this._clampArenaX(tx - this.facing * 64, game);
      this.y = this.groundY - lift;
      this.cameraAirLift = lift * 0.86;
      this.justiceWingsActive = true;
      this.justiceWingSpread = 1.0 + 0.12 * Math.sin(t * 9.0);
      const ascFrame = 137 + Math.min(4, Math.floor(ascU * 5));
      this.trueUltFrameOverride = ascFrame;
      this._overrideFrameIdx = ascFrame;
      return;
    }

    // Phase 4 (3.42..4.35s): 7th Colossal Sovereign Dawn-Pillar & Sympathetic 6-Sword Eruption!
    if (t < 3.56) {
      const diveU = (t - 3.42) / 0.14;
      this.x = this._clampArenaX(tx - this.facing * 56, game);
      this.y = this.groundY - 420 * (1 - diveU * diveU);
      this.cameraAirLift = Math.max(0, (this.groundY - this.y) * 0.85);
      const diveFrame = 142 + Math.min(2, Math.floor(diveU * 3));
      this.trueUltFrameOverride = diveFrame;
      this._overrideFrameIdx = diveFrame;
      this.spawnAfterimage(this.x, this.y, this.facing, 4, diveFrame - 120, 0.32, 'gold');
      return;
    }

    this.y = this.groundY;
    this.cameraAirLift = Math.max(0, this.cameraAirLift - dt * 980);
    const finStep = Math.min(4, Math.floor(((t - 3.56) / 0.79) * 5));
    const impactFrame = 145 + finStep;
    this.trueUltFrameOverride = impactFrame;
    this._overrideFrameIdx = impactFrame;

    if (this._trueUltStage < 4) {
      this._trueUltStage = 4;
      const beamX = this._clampArenaX(tx, game);
      if (game?.audio) game.audio.play('thunder_slam', beamX);
      game?.renderer?.triggerShake?.(24, 0.48);
      game?.renderer?.triggerImpactFrame?.(beamX, this.groundY - 118, 0.12, 'exvius');
      game?.renderer?.triggerHitStop?.(0.085);

      // 7th Colossal Sovereign Dawn-Pillar + all 6 flanking Greatswords erupting skyward!
      game?.vfx?.spawnSkyStrike?.({
        x: beamX,
        groundY: this.groundY,
        owner: this,
        target: null,
        damage: 0,
        delay: 0.01,
        flightDuration: 0.12,
        impactDuration: 0.56,
        type: 'runeblade',
        color: '#fde047',
        scale: 1.65,
        isUltimate: true
      });
      game?.vfx?.spawnBeam?.({
        x1: beamX,
        y1: this.groundY - 560,
        x2: beamX,
        y2: this.groundY,
        width: 52,
        color: '#38bdf8',
        coreColor: '#fde047',
        maxLife: 0.52,
        owner: this
      });
      game?.vfx?.spawnDecal?.(beamX, this.groundY, 'crater', 156);
      game?.vfx?.spawnShockwave?.(beamX, this.groundY - 2, '#fde047', 216, 0.46);
      this.spawnCathedralBeam(beamX, this.groundY, 128, 0.72);
      for (const sw of this.pinnedCelestialSwords) {
        sw.erupted = true;
        this.spawnCathedralBeam(sw.x, sw.groundY, 34, 0.56);
        game?.vfx?.spawnBeam?.({
          x1: sw.x,
          y1: sw.groundY - 420,
          x2: sw.x,
          y2: sw.groundY,
          width: 24,
          color: sw.isGold ? '#fde047' : '#38bdf8',
          coreColor: '#ffffff',
          maxLife: 0.42,
          owner: this
        });
      }
      this.spawnExviusFeathers(game, 32);
      this.spawnPixelShockRing(beamX, this.groundY - 2, 198, true, 0.46);
      this.spawnExParticles(beamX, this.groundY - 124, 22, {
        shapes: ['star4', 'diamond'],
        speedMin: 75,
        speedMax: 240,
        lifeMin: 0.32,
        lifeMax: 0.68,
        gravity: 85,
        isGold: true
      });

      this.fx?.spawn('skyJudgmentPillar', beamX, this.groundY - 2, {
        flip: this.facing < 0,
        light: 1.44
      });
      this.fx?.spawn('earthshatterJudgmentWave', beamX, this.groundY - 2, {
        flip: this.facing < 0,
        light: 1.42,
        extra: { isUltimate: true }
      });
      this.spawnVfxAnim(6, beamX, this.groundY - 134, 332, 332, 0.62, {
        flipX: false,
        glowColor: 'gold',
        foreground: true
      });
      this._applyExviusStrike(enemy, game, {
        damage: 142,
        reachFront: 340,
        reachBack: 240,
        hitStop: 0.065,
        shakeDur: 0.12,
        knockX: 165,
        knockY: -195,
        isCrit: true,
        isGold: true,
        sfx: 'heavy_cleave'
      });
      this.fireDawnBladeWave(game, {
        x: beamX,
        y: this.groundY - 84,
        damage: 44,
        speed: 780,
        maxRange: 620,
        isUltimate: true,
        isGold: true
      });
    }

    if (t >= dur) {
      this.y = this.groundY;
      this.cameraAirLift = 0;
      this.justiceWingsActive = false;
      this.isInvulnerable = false;
      this.unstoppablePoise = false;
      this.isOmnislashing = false;
      this.pinnedCelestialSwords.length = 0;
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      this.setState('IDLE');
    }
  }

  updateCustomVfx(dt) {
    if (this._comboPersistTimer > 0 && this.state !== 'AUTO_ATTACK') {
      this._comboPersistTimer = Math.max(0, this._comboPersistTimer - dt);
      if (this._comboPersistTimer <= 0) {
        this.comboStep = 0;
      }
    }

    if (this._skillSeal) {
      this._skillSeal.age += dt;
      if (this._skillSeal.age >= this._skillSeal.maxLife) this._skillSeal = null;
    }
    if (this._pentagramSeal) {
      this._pentagramSeal.age += dt;
      if (this._pentagramSeal.age >= this._pentagramSeal.maxLife) this._pentagramSeal = null;
    }
    if (this._sanctuaryTimer > 0) {
      this._sanctuaryTimer = Math.max(0, this._sanctuaryTimer - dt);
    }

    for (let i = this.pinnedCelestialSwords.length - 1; i >= 0; i--) {
      this.pinnedCelestialSwords[i].age += dt;
      if (this.pinnedCelestialSwords[i].age >= this.pinnedCelestialSwords[i].maxLife) {
        this.pinnedCelestialSwords.splice(i, 1);
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

    for (let i = this.astralThreads.length - 1; i >= 0; i--) {
      this.astralThreads[i].age += dt;
      if (this.astralThreads[i].age >= this.astralThreads[i].maxLife) {
        this.astralThreads.splice(i, 1);
      }
    }

    for (let i = this.hitStarbursts.length - 1; i >= 0; i--) {
      this.hitStarbursts[i].age += dt;
      if (this.hitStarbursts[i].age >= this.hitStarbursts[i].maxLife) {
        this.hitStarbursts.splice(i, 1);
      }
    }

    for (let i = this.exParticles.length - 1; i >= 0; i--) {
      const p = this.exParticles[i];
      p.age += dt;
      if (p.kind !== 'ring') {
        p.x += p.vx * dt;
        p.vy += p.gravity * dt;
        p.y += p.vy * dt;
        if (p.y > this.groundY - 2) {
          p.y = this.groundY - 2;
          p.vy = -Math.abs(p.vy) * 0.25;
          p.vx *= 0.6;
        }
      }
      if (p.age >= p.maxLife) {
        this.exParticles.splice(i, 1);
      }
    }

    for (let i = this.cathedralBeams.length - 1; i >= 0; i--) {
      this.cathedralBeams[i].age += dt;
      if (this.cathedralBeams[i].age >= this.cathedralBeams[i].maxLife) {
        this.cathedralBeams.splice(i, 1);
      }
    }

    if (this.justiceFeatherTimer > 0) {
      this.justiceFeatherTimer = Math.max(0, this.justiceFeatherTimer - dt);
    }
    for (let i = this.justiceFeathers.length - 1; i >= 0; i--) {
      const f = this.justiceFeathers[i];
      f.age += dt;
      f.x += (f.vx + Math.sin(f.age * f.swayFreq + f.phase) * f.swayAmp) * dt;
      f.y += f.vy * dt;
      if (f.y > this.groundY - 6 && f.age < f.maxLife * 0.78) {
        f.y = this.groundY - 410 - Math.random() * 70;
      }
      if (f.age >= f.maxLife) {
        this.justiceFeathers.splice(i, 1);
      }
    }
  }

  update(dt, enemy, game) {
    this.game = game || this.game;
    this._currentEnemy = enemy;
    if ((this.state === 'IDLE' || this.state === 'WALK') && !this._advPureDodge) {
      this._overrideFrameIdx = null;
      this.trueUltFrameOverride = null;
    }
    this.crouchCooldown = Math.max(0, this.crouchCooldown - dt);
    this.vaultCooldown = Math.max(0, this.vaultCooldown - dt);
    this.updateCustomVfx(dt);

    // Subtle Neo-Vision ambient star-glint mote around the Dawn-Breaker Greatsword
    if (!this.isDead && (this.state === 'IDLE' || this.state === 'WALK')) {
      this._ambientGlintTimer += dt;
      if (this._ambientGlintTimer >= 0.42) {
        this._ambientGlintTimer = 0;
        this.spawnExParticles(this.x - this.facing * 18, this.y - 84, 1, {
          shapes: ['star4'],
          speedMin: 8,
          speedMax: 24,
          lifeMin: 0.34,
          lifeMax: 0.52,
          gravity: -22,
          upwardBias: -18,
          spreadX: 22,
          spreadY: 28,
          isGold: Math.random() < 0.5
        });
      }
    }

    if (this.fx) {
      if (!this.isDead && !this.haloFxSlot) {
        this.haloFxSlot = this.fx.spawn('runicVanguardAura', this.x, this.groundY - 4, {
          follow: this,
          useGroundY: true,
          offsetX: 0,
          offsetY: -4,
          flip: this.facing < 0,
          light: 1.14,
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
      if (this.stepDustTimer >= 0.30) {
        this.stepDustTimer = 0;
        if (game?.audio) game.audio.play('footstep_steel', this.x);
        this.spawnExParticles(this.x - this.facing * 14, this.groundY - 3, 2, {
          shapes: ['star4', 'diamond'],
          speedMin: 22,
          speedMax: 58,
          lifeMin: 0.14,
          lifeMax: 0.26,
          gravity: 40,
          upwardBias: -24,
          isGold: false
        });
      }
    }

    const inMidCombo = (this._aiComboCount || 0) > 0 && (this._aiComboChainTimer || 0) > 0;
    if (
      !this.isPlayerControlled &&
      !inMidCombo &&
      enemy &&
      !enemy.isDead &&
      (this.state === 'IDLE' || this.state === 'WALK') &&
      (this.finisherGauge || 0) < (this.maxFinisherGauge || 100)
    ) {
      const dist = Math.abs(enemy.x - this.x);
      let projectileApproaching = false;
      if (game?.vfx?.projectiles) {
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
      if (this.crouchCooldown <= 0 && projectileApproaching) {
        this.startCrouch(enemy, game);
        return;
      }
      if (
        dist >= 245 &&
        dist <= 395 &&
        this.vaultCooldown <= 0 &&
        this.dodgeCooldown <= 0 &&
        this.skillCooldown > 0.65 &&
        !game?.isAdventureMode?.()
      ) {
        this.startJump(enemy, game, this.facing);
        return;
      }
    }

    super.update(dt, enemy, game);
  }

  getExSprites() {
    return typeof Image !== 'undefined' ? PixelForge.initAssets()?.warrior_ex : null;
  }

  /**
   * Renders a `4x4` Bayer-stippled pixel floor/rim halo (`alpha <= 0.18`, zero blurry radial gradient sprites!).
   */
  drawBayerPixelHalo(ctx, cx, cy, rx, ry, outerHex, coreHex, alpha = 0.16) {
    if (!ctx?.fillRect || alpha <= 0.015 || rx < 4 || ry < 2) return;
    const step = 4;
    const icx = Math.round(cx / step) * step;
    const icy = Math.round(cy / step) * step;
    const irx = Math.max(step, Math.round(rx / step) * step);
    const iry = Math.max(step, Math.round(ry / step) * step);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = Math.min(0.18, alpha);
    for (let dy = -iry; dy <= iry; dy += step) {
      const ny = dy / iry;
      const maxDx = Math.round((irx * Math.sqrt(Math.max(0, 1 - ny * ny))) / step) * step;
      const by = ((dy / step) & 3 + 4) & 3;
      for (let dx = -maxDx; dx <= maxDx; dx += step) {
        const nx = dx / irx;
        const r2 = nx * nx + ny * ny;
        if (r2 > 1) continue;
        const intensity = 1 - r2;
        const bx = ((dx / step) & 3 + 4) & 3;
        if (intensity > BAYER_4X4[(by << 2) | bx] * 0.92) {
          ctx.fillStyle = r2 < 0.34 ? coreHex : outerHex;
          ctx.fillRect(icx + dx, icy + dy, step, step);
        }
      }
    }
    ctx.restore();
  }

  drawArchangelExviusWings(ctx, alphaScale = 1.0) {
    const sprites = this.getExSprites();
    const wingsImg = PixelForge.ensureImage(sprites?.wings);
    if (!wingsImg || !wingsImg.complete || !wingsImg.naturalWidth) return;

    const spread = Math.max(0.25, this.justiceWingSpread || 1.0);
    const cols = Math.max(1, Math.round(wingsImg.naturalWidth / 320));
    const cellW = Math.round(wingsImg.naturalWidth / cols) || 320;
    const cellH = wingsImg.naturalHeight || 232;
    const flapCol = Math.floor(((this.stateTimer || 0) * 28) % cols);
    const drawW = Math.round(258 * spread);
    const drawH = 188;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(this.x), Math.round(this.y - 98));
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.92 * alphaScale;
    ctx.drawImage(
      wingsImg,
      flapCol * cellW,
      0,
      cellW,
      cellH,
      Math.round(-drawW * 0.5),
      Math.round(-drawH * 0.5),
      drawW,
      drawH
    );
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.22 * alphaScale;
    ctx.drawImage(
      wingsImg,
      flapCol * cellW,
      0,
      cellW,
      cellH,
      Math.round(-drawW * 0.5),
      Math.round(-drawH * 0.5),
      drawW,
      drawH
    );
    ctx.restore();
  }

  /**
   * Crisp pixel-pure VFX sheet blit with glowing HD-2D luminescence.
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
    flipX = false
  ) {
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth || alpha <= 0.01) return;
    const rows = Math.max(1, Math.round(vfxSheet.naturalHeight / 208));
    const cell = 208;
    const clampedRow = Math.max(0, Math.min(rows - 1, Math.floor(row)));
    const clampedCol = Math.max(0, Math.min(29, Math.floor(col)));
    if (this.game?.vfx?.drawBloomedSprite) {
      this.game.vfx.drawBloomedSprite(
        ctx,
        vfxSheet,
        clampedCol * cell,
        clampedRow * cell,
        cell,
        cell,
        Math.round(x),
        Math.round(y),
        w,
        h,
        { alpha, bloomAlpha: Math.min(0.28, alpha * 0.24), bloomScale: 1.04, flipX }
      );
      return;
    }
    const sx = clampedCol * cell;
    const sy = clampedRow * cell;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(x), Math.round(y));
    if (flipX) ctx.scale(-1, 1);

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.drawImage(vfxSheet, sx, sy, cell, cell, -w * 0.5, -h * 0.5, w, h);

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(0.24, alpha * 0.22);
    ctx.drawImage(vfxSheet, sx, sy, cell, cell, -w * 0.5, -h * 0.5, w, h);

    ctx.restore();
  }

  /**
   * Renders a crisp 3-pass `2px` pixel-stepped hairline between `(x0, y0)` and `(x1, y1)` (`0` chevrons!).
   */
  drawThreePassHairline(ctx, x0, y0, x1, y1, sheathHex, bevelHex, coreHex, alpha = 1.0) {
    if (!ctx?.fillRect || alpha <= 0.02) return;
    const dx = x1 - x0;
    const dy = y1 - y0;
    const steps = Math.max(4, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 2));

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Pass 1: Full-line dark Selout outer sheath
    ctx.globalAlpha = Math.min(0.72, alpha * 0.72);
    ctx.fillStyle = sheathHex;
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const px = Math.round((x0 + dx * u) / 2) * 2;
      const py = Math.round((y0 + dy * u) / 2) * 2;
      ctx.fillRect(px - 2, py - 2, 6, 6);
    }

    // Pass 2: Full-line luminous colored bevel
    ctx.globalAlpha = Math.min(0.92, alpha * 0.92);
    ctx.fillStyle = bevelHex;
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const px = Math.round((x0 + dx * u) / 2) * 2;
      const py = Math.round((y0 + dy * u) / 2) * 2;
      ctx.fillRect(px - 1, py - 1, 4, 4);
    }

    // Pass 3: Unbroken `2px` razor white core on top of everything!
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.fillStyle = coreHex;
    for (let i = 1; i < steps; i++) {
      const u = i / steps;
      const px = Math.round((x0 + dx * u) / 2) * 2;
      const py = Math.round((y0 + dy * u) / 2) * 2;
      ctx.fillRect(px, py, 2, 2);
    }
    ctx.restore();
  }

  /**
   * Renders the Stained-Glass Runic Cathedral Sanctuary & 6 Pinned Celestial Greatswords behind fighters!
   */
  drawStainedGlassSanctuary(ctx, vfxSheet) {
    if (!ctx?.fillRect) return;
    const hasVfx = Boolean(vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth > 0);

    // 1. Skill Runic Sword-Seal floor halo
    if (this._skillSeal) {
      const u = this._skillSeal.age / this._skillSeal.maxLife;
      const fade = u > 0.72 ? (1 - u) / 0.28 : 1.0;
      this.drawBayerPixelHalo(ctx, this._skillSeal.x, this._skillSeal.y - 2, 92, 18, '#0284c7', '#facc15', 0.16 * fade);
    }

    // 2. Celestial Pentagram Star-Sanctuary Floor Chords (`ULTIMATE`)
    if (this._pentagramSeal) {
      const ps = this._pentagramSeal;
      const u = ps.age / ps.maxLife;
      const fade = u < 0.10 ? u / 0.10 : u > 0.80 ? (1 - u) / 0.20 : 1.0;
      this.drawBayerPixelHalo(ctx, ps.x, ps.y - 2, ps.rx, ps.ry, '#0284c7', '#fde047', 0.17 * fade);

      const verts = [];
      for (let k = 0; k < 5; k++) {
        const a = -Math.PI * 0.5 + ps.age * 0.85 + (k * Math.PI * 2) / 5;
        verts.push([ps.x + Math.cos(a) * ps.rx, ps.y - 4 + Math.sin(a) * ps.ry]);
      }
      const order = [0, 2, 4, 1, 3, 0];
      for (let s = 0; s < 5; s++) {
        const [x0, y0] = verts[order[s]];
        const [x1, y1] = verts[order[s + 1]];
        this.drawThreePassHairline(
          ctx,
          x0,
          y0,
          x1,
          y1,
          '#080d1a',
          s % 2 === 0 ? '#facc15' : '#38bdf8',
          '#ffffff',
          fade * 0.88
        );
      }
    }

    // 3. Full-Stage Stained-Glass Runic Cathedral Sanctuary (`TRUE_ULTIMATE` — sculpted shader cells, 0 solid fillRect columns!)
    if (this._sanctuaryTimer > 0) {
      const fade = Math.min(1, this._sanctuaryTimer / 0.65);
      const cx = Math.round(this._sanctuaryCenterX);
      const gy = Math.round(this.groundY);
      const sanctAge = Math.max(0, 4.35 - this._sanctuaryTimer);

      this.drawBayerPixelHalo(ctx, cx, gy - 2, 260, 32, '#0284c7', '#facc15', 0.18 * fade);

      if (hasVfx) {
        const sealCol = Math.floor((sanctAge * 24) % 30);
        this.drawBloomedVfxCell(ctx, vfxSheet, 3, sealCol, cx, gy - 10, 336, 152, 0.88 * fade, false);

        const offsets = [-210, -105, 0, 105, 210];
        for (let idx = 0; idx < offsets.length; idx++) {
          const ax = cx + offsets[idx];
          const pilH = idx === 2 ? 268 : Math.abs(offsets[idx]) === 105 ? 232 : 198;
          const pilW = idx === 2 ? 184 : 148;
          const pilCol = Math.floor((sanctAge * 22 + idx * 5) % 30);
          this.drawBloomedVfxCell(
            ctx,
            vfxSheet,
            6,
            pilCol,
            ax,
            gy - Math.round(pilH * 0.46),
            pilW,
            pilH,
            0.62 * fade,
            idx % 2 === 1
          );
        }

        const roseCol = Math.floor((sanctAge * 18) % 30);
        this.drawBloomedVfxCell(ctx, vfxSheet, 5, roseCol, cx, gy - 216, 244, 244, 0.88 * fade, false);
      }
    }

    // 4. Six Flanking Celestial Greatswords of Light pinned around Target (`CATHEDRAL OF SEVEN SWORDS`)
    if (this.pinnedCelestialSwords.length > 0 && hasVfx) {
      for (const sw of this.pinnedCelestialSwords) {
        const u = Math.min(1, sw.age / sw.maxLife);
        const dropCol = sw.age < 0.24 ? Math.min(8, Math.floor((sw.age / 0.24) * 8)) : 12 + (Math.floor(sw.age * 20) % 10);
        const fade = u > 0.82 ? (1 - u) / 0.18 : 1.0;
        this.drawBayerPixelHalo(
          ctx,
          sw.x,
          sw.groundY - 2,
          38,
          10,
          sw.isGold ? '#d97706' : '#0284c7',
          '#ffffff',
          0.15 * fade
        );
        this.drawBloomedVfxCell(ctx, vfxSheet, 6, dropCol, sw.x, sw.groundY - 82, 212, 212, 0.95 * fade, sw.isGold);
      }
    }
  }

  /**
   * Renders Cathedral Dawn-Pillars, 3-pass Astral Light-Threads, 4-frame Starbursts, Multi-Shape Particles & Feathers!
   */
  drawNeoVisionForegroundFX(ctx) {
    const sprites = this.getExSprites();
    const vfxSheet = PixelForge.ensureImage(sprites?.vfx);
    const hasVfx = Boolean(vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth > 0);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Sculpted Cathedral Dawn-Breaker Light-Pillars (`Row 6` + `Row 2` shader cells — 0 blocky fillRect beams!)
    if (hasVfx) {
      for (let i = 0; i < this.cathedralBeams.length; i++) {
        const b = this.cathedralBeams[i];
        const u = Math.min(1, b.age / Math.max(0.04, b.maxLife));
        const env = u < 0.12 ? u / 0.12 : Math.max(0, 1 - (u - 0.12) / 0.88);
        if (env <= 0.02) continue;
        const col = Math.min(29, Math.floor(u * 30));
        const pilW = Math.max(156, Math.round(b.width * 2.45));
        const pilH = Math.max(256, Math.round(b.width * 3.35));
        this.drawBayerPixelHalo(ctx, b.x, b.groundY - 2, Math.round(pilW * 0.42), 14, '#0284c7', '#fde047', 0.17 * env);
        this.drawBloomedVfxCell(ctx, vfxSheet, 6, col, b.x, b.groundY - Math.round(pilH * 0.45), pilW, pilH, env * 0.94, i % 2 === 1);
        this.drawBloomedVfxCell(ctx, vfxSheet, 2, (col + 6) % 30, b.x, b.groundY - Math.round(pilH * 0.86), Math.round(pilW * 0.84), Math.round(pilH * 0.78), env * 0.78, false);
      }
    }

    // 2. Hairline 3-Pass `2px` Astral Light-Threads (Pentagram & 7-Sword Chords — 0 chevrons!)
    for (let i = 0; i < this.astralThreads.length; i++) {
      const th = this.astralThreads[i];
      const u = Math.min(1, th.age / th.maxLife);
      const fade = u < 0.12 ? 1.0 : Math.max(0, 1 - (u - 0.12) / 0.88);
      this.drawThreePassHairline(
        ctx,
        th.x0,
        th.y0,
        th.x1,
        th.y1,
        '#080d1a',
        th.isGold ? '#facc15' : '#38bdf8',
        '#ffffff',
        fade * 0.94
      );
    }

    // 3. Asymmetric 4-Frame Pixel Hit-Starbursts
    for (let i = 0; i < this.hitStarbursts.length; i++) {
      const hb = this.hitStarbursts[i];
      const frame = Math.min(3, Math.floor((hb.age / hb.maxLife) * 4));
      const fade = 1 - frame * 0.22;
      const armMain = Math.round((28 - frame * 4) * hb.scale);
      const armCross = Math.round((18 - frame * 3) * hb.scale);
      const bevel = hb.isGold ? '#facc15' : '#38bdf8';
      const dir = hb.flip ? -1 : 1;

      this.drawThreePassHairline(
        ctx,
        hb.x - dir * 8,
        hb.y + armMain,
        hb.x + dir * 8,
        hb.y - armMain,
        '#080d1a',
        bevel,
        '#ffffff',
        fade
      );
      this.drawThreePassHairline(
        ctx,
        hb.x - armCross,
        hb.y - 4,
        hb.x + armCross,
        hb.y + 4,
        '#080d1a',
        hb.isGold ? '#38bdf8' : '#fde047',
        '#ffffff',
        fade * 0.92
      );
    }

    // 4. Multi-Shape Pixel Particles (`star4` glints, `diamond` shards, `ring` Bayer floor ripples)
    for (let i = 0; i < this.exParticles.length; i++) {
      const p = this.exParticles[i];
      const u = Math.min(1, p.age / p.maxLife);
      const fade = u > 0.72 ? (1 - u) / 0.28 : 1.0;
      if (fade <= 0.03) continue;

      const px = Math.round(p.x / 2) * 2;
      const py = Math.round(p.y / 2) * 2;
      const accent = p.isGold ? '#facc15' : '#38bdf8';

      if (p.kind === 'ring') {
        const rx = Math.round((p.size * (0.32 + 0.68 * (1 - Math.pow(1 - u, 2.2)))) / 2) * 2;
        const ry = Math.max(4, Math.round((rx * 0.22) / 2) * 2);
        ctx.globalAlpha = fade * 0.82;
        for (let aIdx = 0; aIdx < 24; aIdx++) {
          if (u > 0.55 && (aIdx & 1) === 1) continue;
          const a = (aIdx / 24) * Math.PI * 2;
          const rxp = Math.round((px + Math.cos(a) * rx) / 2) * 2;
          const ryp = Math.round((py + Math.sin(a) * ry) / 2) * 2;
          ctx.fillStyle = '#080d1a';
          ctx.fillRect(rxp - 2, ryp, 6, 4);
          ctx.fillStyle = aIdx % 3 === 0 ? '#ffffff' : accent;
          ctx.fillRect(rxp, ryp, 4, 2);
        }
      } else if (p.kind === 'star4') {
        const twinkle = Math.sin(p.age * 28 + p.phase) > 0 ? 2 : 0;
        const arm = Math.max(2, p.size * 2 + twinkle);
        ctx.globalAlpha = fade * 0.96;
        ctx.fillStyle = '#080d1a';
        ctx.fillRect(px - arm - 2, py - 2, (arm + 2) * 2 + 2, 6);
        ctx.fillRect(px - 2, py - arm - 2, 6, (arm + 2) * 2 + 2);
        ctx.fillStyle = accent;
        ctx.fillRect(px - arm, py, arm * 2 + 2, 2);
        ctx.fillRect(px, py - arm, 2, arm * 2 + 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px - 2, py, 6, 2);
        ctx.fillRect(px, py - 2, 2, 6);
      } else {
        // Faceted `diamond` shard
        ctx.globalAlpha = fade * 0.95;
        ctx.fillStyle = '#080d1a';
        ctx.fillRect(px - 4, py - 6, 8, 12);
        ctx.fillStyle = accent;
        ctx.fillRect(px - 2, py - 4, 4, 8);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px - 2, py - 2, 2, 4);
      }
    }

    // 5. Fluttering Seraphim Dawn-Feathers (`warrior_ex_vfx.png` Row 7 + pixel cluster fallback)
    for (let i = 0; i < this.justiceFeathers.length; i++) {
      const f = this.justiceFeathers[i];
      const u = f.age / f.maxLife;
      const fade = u < 0.08 ? u / 0.08 : u > 0.80 ? Math.max(0, (1 - u) / 0.20) : 1.0;
      if (fade <= 0.02) continue;

      if (hasVfx && vfxSheet.naturalHeight >= 1664) {
        const col = (Math.floor(f.age * 24) + f.frameOffset) % 30;
        this.drawBloomedVfxCell(
          ctx,
          vfxSheet,
          7,
          col,
          Math.round(f.x),
          Math.round(f.y),
          f.drawSize,
          f.drawSize,
          fade * 0.94,
          f.flipX
        );
      } else {
        const fx = Math.round(f.x / 2) * 2;
        const fy = Math.round(f.y / 2) * 2;
        ctx.globalAlpha = fade * 0.92;
        ctx.fillStyle = '#080d1a';
        ctx.fillRect(fx - 4, fy - 6, 8, 12);
        ctx.fillStyle = f.isGold ? '#facc15' : '#38bdf8';
        ctx.fillRect(fx - 2, fy - 4, 4, 8);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(fx - 2, fy - 2, 2, 4);
      }
    }

    ctx.restore();
  }

  drawForegroundOverlay(ctx, renderer = null) {
    const sprites = this.getExSprites();
    const sheet = PixelForge.ensureImage(sprites?.sheet);
    const vfxSheet = PixelForge.ensureImage(sprites?.vfx);

    if (!this.isDead) {
      this.drawBayerPixelHalo(
        ctx,
        this.x,
        this.groundY - 1,
        54,
        12,
        '#0284c7',
        '#facc15',
        this.state === 'ULTIMATE' || this.state === 'TRUE_ULTIMATE' ? 0.17 : 0.11
      );
      this.drawStainedGlassSanctuary(ctx, vfxSheet);
    }

    const arenaCenterX = this._resolveShaderCenterX(renderer);
    if (this.fx && !this.isDead) {
      this.fx.renderLayer(ctx, 'back', arenaCenterX, this.groundY, 0.96);
    }

    if (this.justiceWingsActive && !this.isDead) {
      this.drawArchangelExviusWings(ctx);
    }

    if (this.afterimages.length > 0 && sheet && sheet.complete && sheet.naturalWidth) {
      for (let i = 0; i < this.afterimages.length; i++) {
        const img = this.afterimages[i];
        const alpha = Math.max(0, (1 - img.age / img.maxLife) * 0.64);
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
          img.tint === 'gold' ? '#fde047' : '#38bdf8'
        );
        ctx.restore();
      }
    }

    if (this.activeVfxAnims.length > 0 && vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      for (let i = 0; i < this.activeVfxAnims.length; i++) {
        const v = this.activeVfxAnims[i];
        if (v.foreground) continue;
        const u = Math.min(1, Math.max(0, v.age / v.maxLife));
        const span = Math.max(1, v.endFrame - v.startFrame + 1);
        const col = Math.min(29, v.startFrame + Math.floor(u * span));
        const fade = u < 0.12 ? u / 0.12 : u > 0.78 ? (1 - u) / 0.22 : 1.0;
        this.drawBloomedVfxCell(ctx, vfxSheet, v.row, col, v.x, v.y, v.w, v.h, fade * 0.92, v.flipX);
      }
    }
  }

  drawUltimateForeground(ctx, renderer = null) {
    const sprites = this.getExSprites();
    const vfxSheet = PixelForge.ensureImage(sprites?.vfx);

    if (this.activeVfxAnims.length > 0 && vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      for (let i = 0; i < this.activeVfxAnims.length; i++) {
        const v = this.activeVfxAnims[i];
        if (!v.foreground) continue;
        const u = Math.min(1, Math.max(0, v.age / v.maxLife));
        const span = Math.max(1, v.endFrame - v.startFrame + 1);
        const col = Math.min(29, v.startFrame + Math.floor(u * span));
        const fade = u < 0.12 ? u / 0.12 : u > 0.78 ? (1 - u) / 0.22 : 1.0;
        this.drawBloomedVfxCell(ctx, vfxSheet, v.row, col, v.x, v.y, v.w, v.h, fade * 0.96, v.flipX);
      }
    }

    const arenaCenterX = this._resolveShaderCenterX(renderer);
    if (this.fx && !this.isDead) {
      this.fx.renderLayer(ctx, 'front', arenaCenterX, this.groundY, 0.98);
    }

    if (
      this.astralThreads.length > 0 ||
      this.hitStarbursts.length > 0 ||
      this.exParticles.length > 0 ||
      this.cathedralBeams.length > 0 ||
      this.justiceFeathers.length > 0
    ) {
      this.drawNeoVisionForegroundFX(ctx);
    }
  }

  draw(ctx, isReflection = false, renderer = null) {
    const sprites = this.getExSprites();
    if (!sprites) return;

    if (isReflection && !this.isDead) {
      const vfxSheet = PixelForge.ensureImage(sprites?.vfx);
      const hasVfx = Boolean(vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth > 0);
      if (this.justiceWingsActive) {
        this.drawArchangelExviusWings(ctx, 0.42);
      }
      if (hasVfx) {
        if (this._sanctuaryTimer > 0) {
          const fade = Math.min(1, this._sanctuaryTimer / 0.65);
          const col = Math.floor(((4.35 - this._sanctuaryTimer) * 20) % 30);
          this.drawBloomedVfxCell(ctx, vfxSheet, 5, col, this._sanctuaryCenterX, this.groundY - 120, 212, 212, 0.34 * fade, false);
        }
        for (const sw of this.pinnedCelestialSwords) {
          const u = Math.min(1, sw.age / sw.maxLife);
          const fade = u > 0.82 ? (1 - u) / 0.18 : 1.0;
          const col = 12 + (Math.floor(sw.age * 20) % 10);
          this.drawBloomedVfxCell(ctx, vfxSheet, 6, col, sw.x, sw.groundY - 78, 196, 196, 0.38 * fade, sw.isGold);
        }
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
      ctx.globalAlpha = 0.48;
      PixelForge.drawGhostFrame(ctx, sprites, frameIdx, w, h);
    }

    ctx.restore();
  }
}
