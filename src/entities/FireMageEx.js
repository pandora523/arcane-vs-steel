import { Fighter } from './Fighter.js?v=30fps118';
import { PixelForge } from '../engine/PixelForge.js?v=30fps118';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps118';
import { SOLAR_EFFECT_REGISTRY } from '../engine/shaders/solarShaders.js?v=30fps118';
import { ExParticleSystem, drawExBayerHalo } from '../engine/shaders/exNextGenFX.js?v=30fps118';

const AUTO_SLICES_EX = [
  [60, 8], // Beat 1 (V0, 0.38s): Golden Solar Rune Magic Circle + Blazing Solar Fireball Comet -> snaps at F03 (63)
  [68, 7], // Beat 2 (V1, 0.36s): Twin Concentric Helios Sun-Sigils + Twin Converging Corona Bolts -> snaps at F09 (69)
  [75, 8], // Beat 3 (V2, 0.40s): Grand Archmage Invocation -> Remote Solar Prominence Pillar (2-Hit) -> snaps at F17 (77)
  [83, 7]  // Beat 4 (V3, 0.52s): -42px Arcane Backstep-Hover -> Triple Meteoric Fireball Barrage + Helios Sunburst (3-Hit) -> snaps at F25 (85)
];

const BEAT_DURATIONS = [0.38, 0.36, 0.40, 0.52];
const INTRA_COMBO_LINK = 0.015;

// Pad astralCataclysmImpactDome's shadeBox bounds so craggy dome peaks never touch a box edge
const MAGE_EX_SOLAR_REGISTRY = {
  ...SOLAR_EFFECT_REGISTRY,
  astralCataclysmImpactDome: {
    ...SOLAR_EFFECT_REGISTRY.astralCataclysmImpactDome,
    create(cfg) {
      const inner = SOLAR_EFFECT_REGISTRY.astralCataclysmImpactDome.create(cfg);
      return {
        step: inner.step ? (dt, c) => inner.step(dt, c) : undefined,
        renderBack(pen, localT, c) {
          if (!inner.renderBack) return;
          const origShadeBox = pen.shadeBox;
          pen.shadeBox = (x0, y0, x1, y1, fn) =>
            origShadeBox.call(pen, x0 - 16, y0 - 20, x1 + 16, y1 + 4, fn);
          try {
            inner.renderBack(pen, localT, c);
          } finally {
            pen.shadeBox = origShadeBox;
          }
        },
        renderFront: inner.renderFront
          ? (pen, localT, c) => inner.renderFront(pen, localT, c)
          : undefined
      };
    }
  }
};

/**
 * Ignis Sol EX (`mage_ex`) — Solar Archmage (Neo-Vision Awakening).
 * Classic Wide-Brimmed Wizard Hat + Glowing Molten-Gold Eyes + Golden Crescent-Sun Staff
 * (`320x240`, `anchorX=112, anchorY=230`, native `+X` right-facing, `520px` Pure Long-Range Sorcery).
 * Coexists 100% independently alongside Legacy Ignis Sol (`mage`).
 */
export class FireMageEx extends Fighter {
  constructor(x, groundY, facing = 1) {
    const opts = typeof x === 'object' && x !== null ? x : { x, groundY, facing };
    super({
      ...opts,
      name: opts.name || 'Ignis Sol EX',
      maxHp: 3780,
      attackRange: 520,
      moveSpeed: 168,
      autoInterval: 0.98,
      lightColor: 'rgba(251, 146, 60, 1)',
      primaryColor: '#fb923c',
      hasTrueUltimate: true,
      trueUltName: 'CATACLYSM: GRAND HELIOS APOCALYPSE',
      trueUltDuration: 5.20
    });

    this.heroId = 'mage_ex';
    this.theme = 'arcane';
    this.secondaryColor = '#fef08a';
    this.deathSfx = 'death_mage';
    this.hasPoise = true;

    this.autoDuration = BEAT_DURATIONS[0];
    this._postFlurryInterval = 1.48;

    this.skillName = 'SOLAR TRINITY CATACLYSM';
    this.skillMaxCooldown = 4.20;
    this.skillCooldown = 1.10;
    this.skillDuration = 1.08;
    this.skillTriggerRange = 520;

    this.ultName = 'BLACK-SUN ECLIPSE SINGULARITY';
    this.ultSub = 'SEVEN SOLAR LANCES & SUPERNOVA RING';
    this.ultDuration = 1.66;

    this.trueUltName = 'CATACLYSM: GRAND HELIOS APOCALYPSE';
    this.trueUltSub = 'SUPREME FINISHER - DREADNOUGHT SUN-METEOR';
    this.trueUltDuration = 5.20;

    // Mobility, Blink Warp & Ward State
    this.dodgeMaxCooldown = 2.95;
    this.dashMaxCooldown = 3.10;
    this.wallFlipCooldown = 0;
    this.crouchCooldown = 0;
    this.crouchDuration = 0.94;
    this.isCrouching = false;
    this.isDeflecting = false;
    this.isFlipVault = false;
    this.flipStartX = this.x;
    this.flipTargetX = this.x;
    this.isBlinkTeleport = false;
    this.didBlink = false;
    this.blinkOriginX = this.x;
    this.blinkTargetX = this.x;
    this.blinkPortalTimer = 0;
    this.cameraAirLift = 0;

    // 4-Beat Pure Long-Range High-Sorcery Combo State
    this.runeOrbit = 0;
    this.castCombo = 0;
    this.comboStep = 0;
    this._autoVariant = 0;
    this._comboPersistTimer = 0;
    this._queuedNextBeat = false;
    this._intraLinkTimer = 0;
    this._beatHitMask = 0;
    this._beatStartX = this.x;
    this._beatTargetX = this.x;
    this._bootsPlanted = false;
    this._drewPalmFocus = false;
    this._v2RemoteTargetX = this.x + 320;
    this._v3RemoteTargetX = this.x + 340;

    // Newly Born Skill / Overdrive / Supreme Finisher State
    this.didSkillAura = false;
    this._skillTrinitySeals = [];
    this.spawnedEclipse = false;
    this.didSupernovaFinisher = false;
    this._ultLanceStep = 0;
    this._ultLockedTargetX = null;
    this._ultLockedEclipseX = null;
    this._eclipseVisual = { active: false, x: 0, y: 156, groundY: 580, age: 0, maxLife: 1.66 };
    this._orbitSlot = null;
    this._trueUltInit = false;
    this._trueUltStage = 0;
    this._trueUltTick = 0;
    this.trueUltMeteor = {
      active: false,
      phase: 'none',
      dir: this.facing || 1,
      x: this.x,
      y: this.groundY - 680,
      startX: this.x,
      startY: this.groundY - 680,
      targetX: this.x + (this.facing || 1) * 320,
      targetY: this.groundY - 30,
      progress: 0,
      riftScale: 0,
      rot: 0,
      trailNodes: []
    };

    // Pixel-pure visual layers (zero canvas rotation, zero smooth ellipses, zero blurry glow blobs)
    this._overrideFrameIdx = null;
    this.solarEchoes = [];
    this.afterimageAccum = 0;
    this.activeVfxAnims = [];
    this.remoteSeals = [];
    this.stepDustTimer = 0;
    this._exParticles = new ExParticleSystem('mage_ex', '#fb923c');

    this.fx = new ArcaneShaderFX(MAGE_EX_SOLAR_REGISTRY, {
      pixelScale: 3,
      viewW: 540,
      viewH: 360
    });

    if (typeof Image !== 'undefined') {
      PixelForge.ensureHeroLoaded?.('mage_ex');
    }
  }

  isHackAndSlashMelee() {
    return false;
  }

  isHackAndSlashCaster() {
    return false;
  }

  hasHackAndSlashCombo() {
    return false;
  }

  getAiStyleProfile() {
    return {
      comboGoal: 4,
      sweetMin: 305,
      sweetMax: 430,
      counterCrouchBias: 0.48,
      midLeapMin: 0,
      midLeapMax: 0,
      midLeapChance: 0,
      postStyle: 'pyromancer'
    };
  }

  _clampArenaX(xv, game) {
    const margin = 84;
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
      ? Math.min(rawMaxX, (game.adventure.bossEntity.anchorX || 9335) - 96)
      : rawMaxX;
    return Math.max(minX, Math.min(maxX, xv));
  }

  _safeFxX(xv, game = this.game) {
    const ww = game?.renderer?.worldWidth || 1200;
    return Math.max(48, Math.min(ww - 48, Number.isFinite(xv) ? xv : this.x));
  }

  _resolveShaderCenterX(renderer) {
    const ww = renderer?.worldWidth || 1200;
    if (ww <= 1600) return ww * 0.5;
    const camCenter = Number.isFinite(renderer?.cameraX) ? renderer.cameraX + 640 : this.x;
    return Math.max(810, Math.min(ww - 810, camCenter));
  }

  setState(newState) {
    const prevState = this.state;
    super.setState(newState);
    this._drewPalmFocus = false;

    if (newState === 'WALK' || newState === 'IDLE') {
      this._overrideFrameIdx = null;
      this.trueUltFrameOverride = null;
    }

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
      this.didSkillAura = false;
      this.isDeflecting = false;
      this._skillTrinitySeals.length = 0;
    }

    if (newState === 'ULTIMATE') {
      this.spawnedEclipse = false;
      this.didSupernovaFinisher = false;
      this._ultLanceStep = 0;
      this._ultLockedTargetX = null;
      this._ultLockedEclipseX = null;
      this.isInvulnerable = true;
    } else {
      this._ultLockedTargetX = null;
      this._ultLockedEclipseX = null;
      if (this._eclipseVisual) {
        this._eclipseVisual.active = false;
      }
    }

    if (newState === 'TRUE_ULTIMATE') {
      this._trueUltInit = false;
      this._trueUltStage = 0;
      this._trueUltTick = 0;
      this.isInvulnerable = true;
      this.unstoppablePoise = true;
    } else {
      this._trueUltInit = false;
      if (newState !== 'AUTO_ATTACK') {
        this.unstoppablePoise = false;
      }
      this.cameraAirLift = 0;
      if (this.trueUltMeteor) {
        this.trueUltMeteor.active = false;
        this.trueUltMeteor.phase = 'none';
      }
    }

    if (
      newState !== 'JUMP' &&
      newState !== 'DODGE' &&
      newState !== 'DASH' &&
      newState !== 'AUTO_ATTACK'
    ) {
      this.fx?.stopByKey('solarGlideTrail');
    }

    if (newState === 'DEATH') {
      this.fx?.clear();
      this._orbitSlot = null;
      this.cameraAirLift = 0;
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      this._exParticles?.clear();
      this.remoteSeals.length = 0;
      if (this._eclipseVisual) this._eclipseVisual.active = false;
      if (this.trueUltMeteor) {
        this.trueUltMeteor.active = false;
        this.trueUltMeteor.phase = 'none';
      }
    } else if (
      newState === 'SKILL' ||
      newState === 'ULTIMATE' ||
      newState === 'TRUE_ULTIMATE' ||
      newState === 'DASH' ||
      newState === 'DODGE' ||
      newState === 'JUMP'
    ) {
      this._exParticles?.emitStateFlourish(this, newState);
    }
  }

  /**
   * Initializes one beat (`0..3`) of Ignis Sol EX's 4-beat Long-Range Solar Sorcery combo:
   * - ZERO melee rush-in!
   * - If `horizDist < 210`, steps backward (`-28px`) away from melee danger.
   * - At `210..540px`, takes a poised `10..16px` arcane cast-step on `V0..V2`.
   * - Executes an agile `-42px` Arcane Backstep-Kite on `V3`!
   */
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
    this._drewPalmFocus = false;
    this._comboPersistTimer = 0.80;
    this.unstoppablePoise = v >= 2;

    const startFrame = AUTO_SLICES_EX[v][0];
    this.trueUltFrameOverride = startFrame;
    this._overrideFrameIdx = startFrame;

    const enemy = this._currentEnemy || null;
    if (enemy && !enemy.isDead && !enemy.isDummyFocal) {
      this.facing = enemy.x >= this.x ? 1 : -1;
    }

    this._beatStartX = this.x;
    let stepDelta = v === 3 ? -42 : v === 0 ? 14 : v === 1 ? 10 : 16;

    if (enemy && !enemy.isDead) {
      const horizDist = Math.abs(enemy.x - this.x);
      if (v === 3) {
        stepDelta = -42;
      } else if (horizDist < 210) {
        stepDelta = -28;
      } else {
        stepDelta = v === 0 ? 14 : v === 1 ? 10 : 16;
      }
    }

    const desiredX = this.x + this.facing * stepDelta;
    this._beatTargetX = this._clampArenaX(desiredX, game);
  }

  queueNextComboBeat() {
    this._queuedNextBeat = true;
  }

  // ============================================================================
  // PIXEL-PURE NEXT-GEN PARTICLE, STAR-GLINT & BAYER HALO ENGINE
  // ============================================================================
  spawnExParticle(opts) {
    if (!opts || !Number.isFinite(opts.x) || !Number.isFinite(opts.y)) return;
    if (opts.shape === 'ring') {
      this._exParticles?.spawnRing(
        opts.x,
        opts.y,
        opts.size || 56,
        opts.color || '#fb923c',
        opts.coreColor || '#fef08a',
        false,
        opts.maxLife || 0.24
      );
      return;
    }
    this._exParticles?.spawn({
      shape: opts.shape || 'ember',
      x: opts.x,
      y: opts.y,
      vx: opts.vx || 0,
      vy: opts.vy || 0,
      gravity: opts.gravity ?? -28,
      swayAmp: opts.shape === 'ember' ? 14 : 6,
      swayFreq: 5.2,
      size: opts.size || 3,
      color: opts.color || '#fb923c',
      accent: '#fde047',
      core: opts.coreColor || '#fef08a',
      maxLife: opts.maxLife || 0.36,
      layer: opts.layer || 'front'
    });
  }

  spawnSolarStarCluster(x, y, count = 6, speed = 135, isEclipse = false) {
    this._exParticles?.burst(x, y, {
      count,
      shapes: ['star4', 'ember', 'diamond', 'rune'],
      speedMin: Math.max(40, speed * 0.44),
      speedMax: speed,
      upBias: 38,
      color: isEclipse ? '#c026d3' : '#fb923c',
      accent: '#fde047',
      core: '#fef08a',
      layer: 'front'
    });
  }

  spawnHitStarburst(x, y, primaryHex = '#fb923c', accentHex = '#fef08a', _scale = 1.0) {
    this._exParticles?.spawnHitStarburst(Math.round(x), Math.round(y), primaryHex, accentHex, 0.18);
  }

  spawnRemoteSeal(x, groundY, radius = 64, maxLife = 0.56, isEclipse = false) {
    if (this.remoteSeals.length >= 12) this.remoteSeals.shift();
    this.remoteSeals.push({
      x: Math.round(this._safeFxX(x)),
      groundY: Math.round(groundY),
      radius,
      age: 0,
      maxLife,
      isEclipse
    });
  }

  ensureOrbitingSuns() {
    if (!this.fx) return;
    if (this.isDead || this.state === 'DEATH') {
      this.fx.stopByKey('heliosOrbitingSuns');
      this._orbitSlot = null;
      return;
    }
    const isPrimed = (((this.comboStep || 0) % 4) + 4) % 4 === 3;
    let slot = this.fx.active.find((s) => s.key === 'heliosOrbitingSuns');
    if (!slot) {
      slot = this.fx.spawn('heliosOrbitingSuns', this._safeFxX(this.x), this.y - 98, {
        follow: this,
        offsetX: 0,
        offsetY: -98,
        flip: false,
        light: 1.12,
        extra: { primed: isPrimed }
      });
    } else if (slot.inst?.cfg) {
      slot.inst.cfg.primed = isPrimed;
    }
    this._orbitSlot = slot;
  }

  ensureSolarGlideTrail() {
    if (!this.fx) return;
    if (!this.fx.active.some((s) => s.key === 'solarGlideTrail')) {
      this.fx.spawn('solarGlideTrail', this._safeFxX(this.x - this.facing * 12), this.y - 88, {
        follow: this,
        offsetX: -12,
        offsetY: -88,
        flip: this.facing < 0,
        light: 1.14
      });
    }
  }

  spawnSolarEcho(
    frameIdx,
    alphaScale = 1.0,
    maxLife = 0.30,
    customX = null,
    customY = null,
    customFacing = null
  ) {
    if (this.solarEchoes.length >= 10) this.solarEchoes.shift();
    this.solarEchoes.push({
      x: customX !== null ? customX : this.x,
      y: customY !== null ? customY : this.y,
      facing: customFacing !== null ? customFacing : this.facing,
      frameIdx,
      alphaScale,
      life: 0,
      maxLife
    });
  }

  spawnVfxAnim(row, x, y, w = 184, h = 184, maxLife = 0.30, opts = {}) {
    if (this.activeVfxAnims.length >= 22) this.activeVfxAnims.shift();
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
      flipX: opts.flipX !== undefined ? Boolean(opts.flipX) : this.facing < 0,
      followOwner: Boolean(opts.followOwner),
      offsetX: opts.offsetX || 0,
      offsetY: opts.offsetY || 0,
      inFront: opts.inFront !== undefined ? Boolean(opts.inFront) : true,
      startFrame: opts.startFrame ?? 0,
      endFrame: opts.endFrame ?? 29
    });
  }

  _resolveRangedTarget(primaryEnemy, game, maxDist = 620) {
    if (
      primaryEnemy &&
      !primaryEnemy.isDead &&
      !primaryEnemy.isBenched &&
      !primaryEnemy.isDummyFocal &&
      (primaryEnemy.x - this.x) * this.facing >= -40 &&
      Math.abs(primaryEnemy.x - this.x) <= maxDist
    ) {
      return primaryEnemy;
    }
    const list = game?.getEnemiesOf ? game.getEnemiesOf(this) : [];
    let best = null;
    let bestDist = Infinity;
    if (Array.isArray(list)) {
      for (let i = 0; i < list.length; i++) {
        const f = list[i];
        if (!f || f.isDead || f.isBenched || f.isDestructibleProp) continue;
        const rel = (f.x - this.x) * this.facing;
        const d = Math.abs(f.x - this.x);
        if (rel >= -36 && d <= maxDist && d < bestDist) {
          bestDist = d;
          best = f;
        }
      }
    }
    if (
      !best &&
      game?.isAdventureMode?.() &&
      game?.adventure?.bossEntity &&
      !game.adventure.bossEntity.isDead
    ) {
      const boss = game.adventure.bossEntity;
      if (Math.abs(boss.x - this.x) <= maxDist + 140) return boss;
    }
    return best;
  }

  /**
   * Applies remote AoE spell eruption damage centered at `centerX` (`radius` horizontal reach),
   * hitting enemies at long range (`up to 560px+` away) with crisp pixel hit-starbursts!
   */
  _applyRemoteSolarEruption(centerX, radius, damage, game, primaryEnemy, opts = {}) {
    const {
      isCrit = false,
      knockX = 28,
      knockY = -36,
      hitStop = 0.042,
      shakeDur = 0.056,
      isEclipse = false
    } = opts;

    const isAdv = Boolean(game?.isAdventureMode?.() && game?.adventure?.active);
    const myGy = this.groundY || this.y;
    const seen = new Set();
    const cands = [];

    const pushCand = (f) => {
      if (!f || f === this || f.isDead || f.isBenched || seen.has(f)) return;
      seen.add(f);
      cands.push(f);
    };

    pushCand(primaryEnemy);
    if (game?.getEnemiesOf) {
      const list = game.getEnemiesOf(this);
      if (Array.isArray(list)) {
        for (let i = 0; i < list.length; i++) pushCand(list[i]);
      }
    }
    if (isAdv && Array.isArray(game.adventure.enemies)) {
      for (let i = 0; i < game.adventure.enemies.length; i++) pushCand(game.adventure.enemies[i]);
    }
    if (isAdv && game.adventure.bossEntity) pushCand(game.adventure.bossEntity);

    let landed = false;
    for (let i = 0; i < cands.length; i++) {
      const foe = cands[i];
      const pad = foe.isColossalBoss ? 92 : 0;
      if (Math.abs(foe.x - centerX) > radius + pad) continue;
      if (isAdv && !foe.isColossalBoss) {
        const foeGy = foe.groundY || foe.y;
        if (Math.abs(foeGy - myGy) > 76) continue;
      }
      const dmg = i === 0 ? damage : Math.max(12, Math.round(damage * 0.85));
      foe.takeDamage(dmg, this, isCrit, knockX, knockY);
      if (!foe.isDead && !foe.isColossalBoss) {
        foe._hitStopTimer = Math.max(foe._hitStopTimer || 0, hitStop);
        foe._hitShakeTimer = Math.max(foe._hitShakeTimer || 0, shakeDur);
      }
      const hitY = foe.y - (foe.isColossalBoss ? 128 : 92);
      this.spawnHitStarburst(
        foe.x,
        hitY,
        isEclipse ? '#c026d3' : '#fb923c',
        '#fef08a',
        isCrit ? 1.25 : 1.0
      );
      this.spawnSolarStarCluster(foe.x, hitY, isCrit ? 7 : 5, 130, isEclipse);
      landed = true;
    }

    if (landed && hitStop > 0) {
      this._hitStopTimer = Math.max(this._hitStopTimer || 0, Math.min(0.036, hitStop));
    }
    return landed;
  }

  onProjectileTrail(p) {
    if (!p || (p.type !== 'fireball' && p.type !== 'meteor')) return;
    p.ringTimer = (p.ringTimer || 0) + 0.016;
    if (p.ringTimer >= (p.isMeteor ? 0.038 : 0.048)) {
      p.ringTimer = 0;
      const backX = p.x - Math.sign(p.vx || 1) * 14;
      this.spawnExParticle({
        x: backX,
        y: p.y + (((p.age * 60) | 0) % 2 === 0 ? -3 : 3),
        vx: -Math.sign(p.vx || 1) * 38,
        vy: -18,
        gravity: -22,
        shape: p.isMeteor ? 'diamond' : 'star4',
        size: p.isMeteor ? 5 : 4,
        color: '#fb923c',
        coreColor: '#fef08a',
        maxLife: 0.22
      });
    }
  }

  onProjectileHit(p, _hitTarget, isCrit, game) {
    const isMeteor = Boolean(p.isMeteor || p.type === 'meteor');
    this.fx?.spawn('solarMeteorImpactBurst', p.x, p.y, {
      light: isMeteor || isCrit ? 1.30 : 1.16,
      extra: { isMeteor: isMeteor || isCrit }
    });
    this.spawnHitStarburst(p.x, p.y, '#fb923c', '#fef08a', isMeteor ? 1.35 : isCrit ? 1.18 : 1.0);
    this.spawnSolarStarCluster(p.x, p.y, isMeteor ? 10 : isCrit ? 8 : 6, isMeteor ? 175 : 140, false);
    this.spawnExParticle({
      x: p.x,
      y: p.y,
      shape: 'ring',
      size: isMeteor ? 44 : 30,
      color: '#fb923c',
      coreColor: '#fef08a',
      maxLife: 0.22
    });
    if (game?.vfx && isMeteor) {
      game.vfx.spawnGlyphBurst(p.x, p.y, 4, 'arcane');
    }
    return true;
  }

  /**
   * Passive Mobility: `ARCANE BLINK` Solar Rift Warp (maintains `340..365px` Archmage spacing, NEVER blinks into melee!).
   */
  onStartDash(enemy, game, dir) {
    this.dashDuration = 0.38;
    this.dashDir = dir || this.facing;
    this.isBlinkTeleport = true;
    this.didBlink = false;
    this.blinkOriginX = this.x;
    this.blinkPortalTimer = 0.54;

    let desiredX = this.x + this.dashDir * 195;
    if (enemy && !enemy.isDead) {
      const dist = Math.abs(enemy.x - this.x);
      const toEnemy = enemy.x >= this.x ? 1 : -1;
      if (dist < 280) {
        desiredX = enemy.x - toEnemy * 365;
      } else if (this.dashDir === toEnemy && dist > 440) {
        desiredX = enemy.x - toEnemy * 355;
      }
    }
    this.blinkTargetX = this._clampArenaX(desiredX, game);
    this.vx = 0;
    this.vy = 0;

    if (game?.audio) game.audio.play('blink', this.x);
    this.spawnSolarEcho(PixelForge.getFrameIndex(this, this.runeOrbit), 0.90, 0.34);
    this.fx?.spawn('arcaneBlinkRift', this.x, this.groundY, {
      light: 1.20,
      extra: { isArrival: false }
    });
    this.spawnSolarStarCluster(this.x, this.y - 84, 6, 125, false);
  }

  onStartDodge(enemy, game, dir) {
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const retreatDir = dir || -this.facing;
    this.dashDuration = 0.40;
    this.dashDir = retreatDir;
    this.isBlinkTeleport = true;
    this.isInvulnerable = true;
    this.didBlink = false;
    this.blinkOriginX = this.x;
    this.blinkPortalTimer = 0.56;

    let targetX = this.x + retreatDir * 290;
    if (enemy && !enemy.isDead && (this.x < 290 || this.x > ww - 290 || Math.abs(enemy.x - this.x) < 235)) {
      const openDir = enemy.x < ww * 0.5 ? 1 : -1;
      targetX = enemy.x + openDir * 355;
      if (Math.abs(targetX - this.x) < 230) {
        targetX = enemy.x + (this.x < enemy.x ? 1 : -1) * 345;
      }
    }
    this.blinkTargetX = this._clampArenaX(targetX, game);
    this.vx = 0;
    this.vy = 0;

    if (game?.audio) game.audio.play('blink', this.x);
    this.spawnSolarEcho(PixelForge.getFrameIndex(this, this.runeOrbit), 0.92, 0.36);
    this.fx?.spawn('arcaneBlinkRift', this.x, this.groundY, {
      light: 1.24,
      extra: { isArrival: false }
    });
    this.spawnSolarStarCluster(this.x, this.y - 88, 7, 135, false);
    game?.vfx?.spawnDamageText(this.x, this.y - 134, 0, false, 'ARCANE BLINK!', '#fef08a');
  }

  updateDash(_dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.dashDuration || 0.38;
    this.vy = 0;
    this.y = this.groundY;

    if (this.isBlinkTeleport) {
      if (!this.didBlink && t >= 0.13) {
        this.didBlink = true;
        this.x = this.blinkTargetX;
        if (enemy && !enemy.isDead) {
          this.facing = enemy.x >= this.x ? 1 : -1;
        }
        if (game?.audio) game.audio.play('dash_whoosh', this.x);
        this.spawnSolarEcho(244, 0.88, 0.32, this.x, this.y, this.facing);
        this.fx?.spawn('arcaneBlinkRift', this.x, this.groundY, {
          light: 1.24,
          extra: { isArrival: true }
        });
        this.spawnRemoteSeal(this.x, this.groundY, 54, 0.34, false);
      }
      if (t >= dur) {
        this.vx = 0;
        this.isBlinkTeleport = false;
        this.isInvulnerable = false;
        this.setState('IDLE');
      }
      return;
    }

    if (t >= dur) {
      this.vx = 0;
      this.setState('IDLE');
    }
  }

  startJump(enemy, game, customDir = null) {
    this.dodgeCooldown = this.dodgeMaxCooldown * (0.86 + Math.random() * 0.28);
    this.setState('JUMP');
    this.isInvulnerable = true;
    this.isBlinkTeleport = false;
    this.isFlipVault = true;
    this.didSecondaryAction = false;
    this.flipStartX = this.x;
    this.afterimageAccum = 0;
    this.wallFlipCooldown = 2.8;

    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    let dir = customDir !== null ? customDir : -this.facing;
    if (this.x < 185) dir = 1;
    else if (this.x > ww - 185) dir = -1;

    let desiredX = this.x + dir * 295;
    if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 245) {
      const openSide = enemy.x < ww * 0.5 ? 1 : -1;
      desiredX = enemy.x + openSide * 355;
    }
    this.flipTargetX = this._clampArenaX(desiredX, game);
    this.dashDuration = 0.56;
    this.vx = 0;
    this.vy = 0;

    this.spawnSolarEcho(242, 0.84, 0.32);
    this.ensureSolarGlideTrail();
    this.fx?.spawn('arcaneBlinkRift', this.x, this.groundY, {
      light: 1.18,
      extra: { isArrival: false }
    });
    if (game?.audio) game.audio.play('blink', this.x);
    this.spawnSolarStarCluster(this.x, this.y - 72, 6, 120, false);
  }

  updateJump(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.dashDuration || 0.56;
    const u = Math.min(1, Math.max(0, t / dur));

    this.x = this.flipStartX + (this.flipTargetX - this.flipStartX) * (1 - Math.pow(1 - u, 1.8));
    this.y = this.groundY - Math.sin(u * Math.PI) * 96;
    this.isInvulnerable = u < 0.68;

    this.afterimageAccum += dt;
    if (this.afterimageAccum >= 0.06 && u < 0.84) {
      this.afterimageAccum = 0;
      this.spawnSolarEcho(240 + Math.min(28, Math.floor(u * 30)), 0.72, 0.22);
    }

    if (!this.didSecondaryAction && u >= 0.50) {
      this.didSecondaryAction = true;
      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }
      const spawnX = this.x + this.facing * 56;
      const spawnY = this.y - 78;
      if (game?.audio) game.audio.play('fireball', spawnX);
      this.spawnVfxAnim(4, spawnX, spawnY, 152, 152, 0.26, {
        flipX: this.facing < 0,
        inFront: true
      });
      if (game?.vfx) {
        const aimFoe = this._resolveRangedTarget(enemy, game);
        const tx = aimFoe ? aimFoe.x : spawnX + this.facing * 420;
        const ty = aimFoe ? aimFoe.y - 92 : this.groundY - 88;
        const dx = tx - spawnX;
        const dy = ty - spawnY;
        const len = Math.hypot(dx, dy) || 1;
        game.vfx.spawnProjectile({
          x: spawnX,
          y: spawnY,
          vx: (dx / len) * 725,
          vy: (dy / len) * 725,
          radius: 15,
          maxRange: 640,
          color: '#fb923c',
          coreColor: '#fef08a',
          owner: this,
          damage: 44,
          type: 'fireball',
          isMeteor: false
        });
      }
    }

    if (u >= 1) {
      this.y = this.groundY;
      this.vx = 0;
      this.vy = 0;
      this.isFlipVault = false;
      this.isInvulnerable = false;
      this.spawnRemoteSeal(this.x, this.groundY, 48, 0.28, false);
      this.setState('IDLE');
    }
  }

  updateDodge(dt, enemy, game) {
    if (this.isBlinkTeleport) {
      this.updateDash(dt, enemy, game);
    } else {
      this.updateJump(dt, enemy, game);
    }
  }

  updateDashOrDodge(dt, enemy, game) {
    if (this.state === 'DASH' || this.isBlinkTeleport) {
      this.updateDash(dt, enemy, game);
    } else {
      this.updateJump(dt, enemy, game);
    }
  }

  startCrouch(_enemy, game) {
    this.crouchCooldown = 3.2;
    this.crouchDuration = 0.94;
    this.setState('CROUCH');
    this.isCrouching = true;
    this.isDeflecting = true;
    this.didSecondaryAction = false;
    this.vx = 0;
    this.y = this.groundY;

    if (game?.audio) game.audio.play('parry_clang', this.x);
    this.heal(12, 'SOLAR WARD');
    this.fx?.spawn('solarFlameWard', this.x, this.groundY - 92, {
      follow: this,
      offsetX: 0,
      offsetY: -92,
      light: 1.24
    });
    this.spawnRemoteSeal(this.x, this.groundY, 68, 0.65, false);
  }

  updateCrouch(_dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.crouchDuration || 0.94;
    this.vx = 0;
    this.y = this.groundY;
    this.isCrouching = true;
    this.isDeflecting = t < 0.56;

    if (this.isDeflecting && game?.vfx?.projectiles) {
      for (const proj of game.vfx.projectiles) {
        if (
          proj.owner !== this &&
          !proj._reflectedByMageEx &&
          Math.abs(proj.x - this.x) < 96 &&
          Math.abs(proj.y - (this.y - 88)) < 96
        ) {
          proj._reflectedByMageEx = true;
          proj.owner = this;
          proj.vx = -proj.vx * 1.25;
          proj.color = '#fb923c';
          proj.coreColor = '#fef08a';
          if (game?.audio) game.audio.play('clang', proj.x);
          this.gainMana(14);
          this.gainFinisher(8);
          this.spawnHitStarburst(proj.x, proj.y, '#fb923c', '#fef08a', 1.1);
          this.spawnSolarStarCluster(proj.x, proj.y, 6, 130, false);
        }
      }
    }

    if (!this.didSecondaryAction && t >= 0.46) {
      this.didSecondaryAction = true;
      this.isDeflecting = false;
      const spawnX = this.x + this.facing * 68;
      const spawnY = this.y - 94;
      if (game?.audio) game.audio.play('fireball', spawnX);

      // Repel any close melee rusher with a Solar Ward Ring pulse
      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= 175) {
        this._applyRemoteSolarEruption(this.x + this.facing * 64, 125, 34, game, enemy, {
          isCrit: true,
          knockX: 115,
          knockY: -45,
          hitStop: 0.036
        });
      }

      this.spawnVfxAnim(4, spawnX, spawnY, 156, 156, 0.26, {
        flipX: this.facing < 0,
        inFront: true
      });
      const aimFoe = this._resolveRangedTarget(enemy, game);
      const tx = aimFoe ? aimFoe.x : spawnX + this.facing * 440;
      const ty = aimFoe ? aimFoe.y - 96 : spawnY;
      const dx = tx - spawnX;
      const dy = ty - spawnY;
      const len = Math.hypot(dx, dy) || 1;
      this.fx?.spawn('solarFireballMachCone', spawnX, spawnY, {
        flip: this.facing < 0,
        light: 1.20,
        extra: { aimAngle: Math.atan2(dy, Math.abs(dx)), isTwin: false }
      });
      game?.vfx?.spawnProjectile({
        x: spawnX,
        y: spawnY,
        vx: (dx / len) * 740,
        vy: (dy / len) * 740,
        radius: 16,
        maxRange: 640,
        color: '#fb923c',
        coreColor: '#fef08a',
        owner: this,
        damage: 52,
        type: 'fireball',
        isMeteor: false
      });
    }

    if (t >= dur) {
      this.isCrouching = false;
      this.isDeflecting = false;
      this.setState('IDLE');
    }
  }

  /**
   * Row 2 `AUTO_ATTACK` (`[[60,8],[68,7],[75,8],[83,7]]`):
   * 100% Pure Long-Range High-Sorcery Casting (`attackRange: 520`, `0` melee requirement!):
   * - `V0 (F03)`: Golden Solar Rune Magic Circle + fast blazing Solar `'fireball'` Comet (`speed: 740, maxRange: 640`)
   * - `V1 (F09)`: Twin concentric Helios Sun-Sigils + twin converging Corona `'fireball'` Bolts
   * - `V2 (F17)`: Grand Archmage Invocation -> remote Solar Prominence Pillar + Scorch Shockwave under `enemy.x` (`2-hit` up to `560px`)
   * - `V3 (F25)`: `-42px` Arcane Backstep-Hover -> Triple Meteoric Fireball Barrage + remote Helios Sunburst (`3-hit` artillery finisher)
   */
  updateAutoAttack(dt, enemy, game) {
    this._currentEnemy = enemy;
    this._comboPersistTimer = 0.80;

    if (this._intraLinkTimer > 0) {
      this._intraLinkTimer = Math.max(0, this._intraLinkTimer - dt);
      this.vx = 0;
      this.vy = 0;
      if (this._intraLinkTimer <= 0) {
        this._beginComboBeat(this.comboStep, game);
        this._aiComboCount = (this._aiComboCount || 0) + 1;
        this._aiComboChainTimer = 0.96;
      }
      return;
    }

    const v = this._autoVariant;
    const dur = this.autoDuration || BEAT_DURATIONS[v];
    const t = this.stateTimer;
    const [sliceStart, sliceLen] = AUTO_SLICES_EX[v];
    const snapT = v === 0 ? 0.10 : v === 1 ? 0.07 : v === 2 ? 0.09 : 0.15;

    let localStep = 0;
    if (v === 0) {
      if (t < 0.10) localStep = Math.min(2, Math.floor((t / 0.10) * 3));
      else if (t < 0.16) localStep = 3;
      else if (t < 0.26) localStep = 4 + Math.min(1, Math.floor(((t - 0.16) / 0.10) * 2));
      else localStep = 6 + Math.min(1, Math.floor(((t - 0.26) / 0.12) * 2));
    } else if (v === 1) {
      if (t < 0.07) localStep = 0;
      else if (t < 0.13) localStep = 1;
      else if (t < 0.23) localStep = 2 + Math.min(1, Math.floor(((t - 0.13) / 0.10) * 2));
      else localStep = 4 + Math.min(2, Math.floor(((t - 0.23) / 0.13) * 3));
    } else if (v === 2) {
      if (t < 0.09) localStep = Math.min(1, Math.floor((t / 0.09) * 2));
      else if (t < 0.16) localStep = 2;
      else if (t < 0.26) localStep = 3 + Math.min(1, Math.floor(((t - 0.16) / 0.10) * 2));
      else localStep = 5 + Math.min(2, Math.floor(((t - 0.26) / 0.14) * 3));
    } else {
      if (t < 0.15) localStep = Math.min(1, Math.floor((t / 0.15) * 2));
      else if (t < 0.23) localStep = 2;
      else if (t < 0.36) localStep = 3 + Math.min(1, Math.floor(((t - 0.23) / 0.13) * 2));
      else localStep = 5 + Math.min(1, Math.floor(((t - 0.36) / 0.16) * 2));
    }

    const frameIdx = sliceStart + Math.min(sliceLen - 1, Math.max(0, localStep));
    this.trueUltFrameOverride = frameIdx;
    this._overrideFrameIdx = frameIdx;

    // 1. Poised Arcane Cast-Step / Retreat / V3 -42px Backstep-Kite -> Planted Cast (`vx = 0`)
    this.vx = 0;
    if (t < snapT) {
      const u = Math.min(1, Math.max(0, t / snapT));
      const eased = 1 - Math.pow(1 - u, 2.1);
      this.x = this._beatStartX + (this._beatTargetX - this._beatStartX) * eased;

      if (!this._drewPalmFocus) {
        this._drewPalmFocus = true;
        this.fx?.spawn('heliosPalmFocus', this.x + this.facing * 36, this.y - 106, {
          follow: this,
          offsetX: 36,
          offsetY: -106,
          flip: this.facing < 0,
          light: v === 3 ? 1.24 : 1.15
        });
      }
    } else if (!this._bootsPlanted) {
      this._bootsPlanted = true;
      this.x = this._beatTargetX;
      this.vx = 0;
    }

    // V3 Arcane Hover-Kite: hovers smoothly over a glowing ley-seal during the -42px backstep cast
    if (v === 3 && t < 0.36) {
      const hoverEnv = Math.sin(Math.min(1, t / 0.36) * Math.PI);
      this.y = this.groundY - hoverEnv * 22;
      this.vy = 0;
    } else {
      this.y = this.groundY;
      this.vy = 0;
    }

    const spawnX = this.x + this.facing * 72;
    const spawnY = this.y - 96;
    const aimFoe = this._resolveRangedTarget(enemy, game, 620);
    const targetY = aimFoe ? aimFoe.y - (aimFoe.isColossalBoss ? 128 : 94) : this.groundY - 94;
    const dx = aimFoe ? aimFoe.x - spawnX : this.facing * 480;
    const dy = targetY - spawnY;
    const dist = Math.hypot(dx, dy) || 1;
    const aimAng = Math.atan2(dy, Math.abs(dx));

    // 2. Beat-Specific Pure Long-Range Sorcery Casts
    if (v === 0) {
      if ((this._beatHitMask & 1) === 0 && t >= 0.10) {
        this._beatHitMask |= 1;
        this.castCombo++;
        this.didActionFrame = true;
        if (game?.audio) game.audio.play('fireball', spawnX);
        this.spawnVfxAnim(4, spawnX, spawnY, 154, 154, 0.26, {
          flipX: this.facing < 0,
          inFront: true
        });
        this.fx?.spawn('solarFireballMachCone', spawnX, spawnY, {
          flip: this.facing < 0,
          light: 1.18,
          extra: { aimAngle: aimAng, isTwin: false }
        });
        this.spawnSolarStarCluster(spawnX, spawnY, 5, 115, false);
        game?.vfx?.spawnProjectile({
          x: spawnX,
          y: spawnY,
          vx: (dx / dist) * 740,
          vy: (dy / dist) * 740,
          radius: 16,
          maxRange: 640,
          color: '#fb923c',
          coreColor: '#fef08a',
          owner: this,
          damage: 46,
          type: 'fireball',
          isMeteor: false
        });
      }
    } else if (v === 1) {
      if ((this._beatHitMask & 1) === 0 && t >= 0.07) {
        this._beatHitMask |= 1;
        this.castCombo++;
        this.didActionFrame = true;
        if (game?.audio) game.audio.play('fireball', spawnX);
        this.spawnVfxAnim(4, spawnX, spawnY - 12, 138, 138, 0.24, {
          flipX: this.facing < 0,
          inFront: true
        });
        this.fx?.spawn('solarFireballMachCone', spawnX, spawnY, {
          flip: this.facing < 0,
          light: 1.20,
          extra: { aimAngle: aimAng, isTwin: true }
        });
        this.spawnSolarStarCluster(spawnX, spawnY, 6, 120, false);
        if (game?.vfx) {
          const speed = 720;
          game.vfx.spawnProjectile({
            x: spawnX,
            y: spawnY - 14,
            vx: (dx / dist) * speed,
            vy: (dy / dist) * speed - 22,
            radius: 14,
            maxRange: 640,
            color: '#fb923c',
            coreColor: '#fef08a',
            owner: this,
            damage: 28,
            type: 'fireball',
            isMeteor: false
          });
          game.vfx.spawnProjectile({
            x: spawnX - this.facing * 10,
            y: spawnY + 14,
            vx: (dx / dist) * speed,
            vy: (dy / dist) * speed + 22,
            radius: 14,
            maxRange: 640,
            color: '#ea580c',
            coreColor: '#fef08a',
            owner: this,
            damage: 26,
            type: 'fireball',
            isMeteor: false
          });
        }
      }
    } else if (v === 2) {
      // Beat 3 (V2): Remote Solar Prominence Pillar + Scorch Shockwave directly under target (up to 560px away, 2-hit!)
      if ((this._beatHitMask & 1) === 0 && t >= 0.09) {
        this._beatHitMask |= 1;
        this.didActionFrame = true;
        const rawRemoteX = aimFoe
          ? Math.abs(aimFoe.x - this.x) <= 560
            ? aimFoe.x
            : this.x + this.facing * 520
          : this.x + this.facing * 360;
        this._v2RemoteTargetX = this._clampArenaX(rawRemoteX, game);
        if (game?.audio) game.audio.play('eclipse_charge', this._v2RemoteTargetX);
        this.spawnRemoteSeal(this._v2RemoteTargetX, this.groundY, 72, 0.42, true);
        this.spawnVfxAnim(2, this._v2RemoteTargetX, this.groundY - 118, 152, 152, 0.28, {
          flipX: false,
          inFront: true
        });
        this._applyRemoteSolarEruption(this._v2RemoteTargetX, 86, 24, game, aimFoe || enemy, {
          knockX: 16,
          knockY: -22,
          hitStop: 0.032,
          isEclipse: true
        });
      }
      if ((this._beatHitMask & 2) === 0 && t >= 0.16) {
        this._beatHitMask |= 2;
        this.castCombo++;
        const px = this._v2RemoteTargetX;
        if (game?.audio) game.audio.play('fireball', px);
        game?.renderer?.triggerShake?.(8, 0.18);
        game?.vfx?.spawnShockwave(px, this.groundY - 4, 88, '#fb923c', 0.24, true, false);
        game?.vfx?.spawnFlamePillar(px, this.groundY, this, aimFoe || enemy, {
          theme: 'arcane',
          delay: 0.02,
          maxLife: 0.82,
          scaleWidth: 0.88
        });
        this.fx?.spawn('hellfireSolarPillar', px, this.groundY - 4, {
          light: 1.26,
          extra: { scaleWidth: 0.88 }
        });
        this.spawnVfxAnim(1, px, this.groundY - 94, 188, 188, 0.34, {
          flipX: this.facing < 0,
          inFront: true
        });
        this._applyRemoteSolarEruption(px, 92, 30, game, aimFoe || enemy, {
          isCrit: true,
          knockX: 28,
          knockY: -54,
          hitStop: 0.040
        });
      }
    } else {
      // Beat 4 (V3): -42px Backstep-Hover Cast -> Triple Meteoric Fireball Barrage + Remote Helios Sunburst (3-hit!)
      if ((this._beatHitMask & 1) === 0 && t >= 0.15) {
        this._beatHitMask |= 1;
        this.castCombo++;
        this.didActionFrame = true;
        this.spawnSolarEcho(85, 0.80, 0.24);
        const rawRemoteX = aimFoe
          ? Math.abs(aimFoe.x - this.x) <= 580
            ? aimFoe.x
            : this.x + this.facing * 530
          : this.x + this.facing * 380;
        this._v3RemoteTargetX = this._clampArenaX(rawRemoteX, game);
        if (game?.audio) game.audio.play('fireball', spawnX);
        this.spawnVfxAnim(4, spawnX + this.facing * 8, spawnY, 174, 174, 0.30, {
          flipX: this.facing < 0,
          inFront: true
        });
        this.spawnRemoteSeal(this.x, this.groundY, 58, 0.36, false);
        this.spawnSolarStarCluster(spawnX, spawnY, 8, 145, false);

        // Fire Meteoric Comet #1 & #2
        if (game?.vfx) {
          const speed = 745;
          game.vfx.spawnProjectile({
            x: spawnX + this.facing * 8,
            y: spawnY - 22,
            vx: (dx / dist) * speed,
            vy: (dy / dist) * speed + 16,
            radius: 15,
            maxRange: 660,
            color: '#ea580c',
            coreColor: '#fef08a',
            owner: this,
            damage: 24,
            type: 'fireball',
            isMeteor: false
          });
          game.vfx.spawnProjectile({
            x: spawnX + this.facing * 14,
            y: spawnY,
            vx: (dx / dist) * (speed * 1.03),
            vy: (dy / dist) * (speed * 1.03),
            radius: 17,
            maxRange: 660,
            color: '#dc2626',
            coreColor: '#ffffff',
            owner: this,
            damage: 30,
            type: 'fireball',
            isMeteor: false
          });
        }
      }
      if ((this._beatHitMask & 2) === 0 && t >= 0.21) {
        this._beatHitMask |= 2;
        // Fire Meteoric Comet #3
        if (game?.vfx) {
          const speed = 735;
          game.vfx.spawnProjectile({
            x: spawnX + this.facing * 6,
            y: spawnY + 22,
            vx: (dx / dist) * speed,
            vy: (dy / dist) * speed - 18,
            radius: 15,
            maxRange: 660,
            color: '#fb923c',
            coreColor: '#fef08a',
            owner: this,
            damage: 24,
            type: 'fireball',
            isMeteor: false
          });
        }
      }
      if ((this._beatHitMask & 4) === 0 && t >= 0.27) {
        this._beatHitMask |= 4;
        // Remote Helios Sunburst detonation at target!
        const burstX = this._v3RemoteTargetX;
        if (game?.audio) game.audio.play('supernova_detonate', burstX);
        game?.renderer?.triggerShake?.(9, 0.20);
        this.spawnRemoteSeal(burstX, this.groundY, 84, 0.38, false);
        this.spawnVfxAnim(3, burstX, this.groundY - 88, 176, 176, 0.28, {
          flipX: false,
          inFront: true
        });
        this._applyRemoteSolarEruption(burstX, 94, 24, game, aimFoe || enemy, {
          isCrit: true,
          knockX: 64,
          knockY: -58,
          hitStop: 0.044
        });
      }
    }

    // 3. Direct Zero-Idle Beat Chaining (`0.015s` link)
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
        Math.abs(enemy.x - this.x) <= 560;

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
        this.autoCooldown = isManualPlayer
          ? 0.06
          : this._postFlurryInterval * (0.92 + Math.random() * 0.16);
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
   * NEWLY BORN SPECIAL SKILL (`SOLAR TRINITY CATACLYSM`, Row 3 `90..119`):
   * Inscribes 3 cascading Heliacal Rune Seals (`targetX - 96`, `targetX`, `targetX + 96`)
   * that erupt braided Corona Pillars + a swirling 4-point Solar Star-Glint Vortex + Twin Corona Comets!
   */
  updateSkill(_dt, enemy, game) {
    const t = this.stateTimer;
    this.vy = 0;
    this.y = this.groundY;
    this.vx = 0;

    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const rawBase = enemy ? enemy.x : this.x + this.facing * 360;
    const baseTargetX = this._safeFxX(Math.max(135, Math.min(ww - 135, rawBase)), game);

    if (!this.didSkillAura) {
      this.didSkillAura = true;
      this.heal(16, 'HELIOS AEGIS');
      game?.vfx?.spawnSpecialCastAura(this, this.skillName, 'SOLAR ARCHMAGE', 'arcane', false);
      this.fx?.spawn('heliosPalmFocus', this._safeFxX(this.x + this.facing * 28, game), this.y - 108, {
        follow: this,
        offsetX: 28,
        offsetY: -108,
        flip: this.facing < 0,
        light: 1.24
      });
      this._skillTrinitySeals = [
        this._safeFxX(Math.max(95, Math.min(ww - 95, baseTargetX - 96)), game),
        baseTargetX,
        this._safeFxX(Math.max(95, Math.min(ww - 95, baseTargetX + 96)), game)
      ];
      for (let i = 0; i < this._skillTrinitySeals.length; i++) {
        this.spawnRemoteSeal(this._skillTrinitySeals[i], this.groundY, i === 1 ? 82 : 64, 0.90, false);
      }
    }

    if (t >= 0.26 && !this.didActionFrame) {
      this.didActionFrame = true;
      const centerSealX = this._skillTrinitySeals[1] || baseTargetX;
      if (game?.audio) game.audio.play('fireball', centerSealX);
      game?.renderer?.triggerShake?.(10, 0.22);

      const delays = [0.16, 0.04, 0.16];
      const widths = [0.86, 1.22, 0.86];
      for (let i = 0; i < this._skillTrinitySeals.length; i++) {
        const px = this._skillTrinitySeals[i];
        game?.vfx?.spawnFlamePillar(px, this.groundY, this, enemy, {
          theme: 'arcane',
          delay: delays[i],
          maxLife: i === 1 ? 1.44 : 1.24,
          scaleWidth: widths[i]
        });
        this.fx?.spawn('hellfireSolarPillar', px, this.groundY - 4, {
          light: i === 1 ? 1.34 : 1.20,
          extra: { scaleWidth: widths[i] }
        });
        this.spawnVfxAnim(1, px, this.groundY - 98, i === 1 ? 212 : 174, i === 1 ? 216 : 176, 0.44, {
          flipX: i === 0,
          inFront: true
        });
        this.spawnSolarStarCluster(px, this.groundY - 76, i === 1 ? 9 : 6, 150, false);
      }
      this.spawnVfxAnim(4, centerSealX, this.groundY - 124, 196, 196, 0.40, {
        flipX: false,
        inFront: true
      });
    } else if (t >= 0.56 && !this.didSecondaryAction) {
      this.didSecondaryAction = true;
      if (game?.audio) game.audio.play('fireball', this.x);

      const sx = this._safeFxX(this.x + this.facing * 64, game);
      const sy = this.y - 102;
      this.spawnVfxAnim(4, sx, sy, 168, 168, 0.28, {
        flipX: this.facing < 0,
        inFront: true
      });
      this.spawnSolarStarCluster(sx, sy, 8, 140, false);

      const dx = enemy ? enemy.x - sx : this.facing * 440;
      const dy = enemy ? enemy.y - 98 - sy : 0;
      const dist = Math.hypot(dx, dy) || 1;
      for (const vyOff of [-32, 32]) {
        game?.vfx?.spawnProjectile({
          x: sx,
          y: sy,
          vx: (dx / dist) * 705,
          vy: (dy / dist) * 705 + vyOff,
          radius: 15,
          maxRange: 660,
          color: '#fb923c',
          coreColor: '#fef08a',
          owner: this,
          damage: 56,
          type: 'fireball',
          isMeteor: false
        });
      }
    } else if (t >= this.skillDuration) {
      this.didSkillAura = false;
      this.vx = 0;
      this.setState('IDLE');
    }
  }

  /**
   * NEWLY BORN OVERDRIVE (`BLACK-SUN ECLIPSE SINGULARITY`, Row 4 `120..149`):
   * Conjures a Black-Sun Eclipse Singularity (`spawnEclipseSupernova`) high above the target,
   * pulling enemies inward with gravitational force while raining 7 Meteoric Solar Bombardments
   * and collapsing into a Supernova Judgment Beam!
   */
  updateUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    this.vx = 0;
    this.vy = 0;
    this.y = this.groundY;
    this.isInvulnerable = true;

    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const rawTarget = enemy ? enemy.x : this.x + this.facing * 360;
    const initTargetX = this._safeFxX(Math.max(180, Math.min(ww - 180, rawTarget)), game);
    const initEclipseX = this._safeFxX(
      Math.max(180, Math.min(ww - 180, this.x * 0.25 + initTargetX * 0.75)),
      game
    );
    const eclipseY = this.groundY - 372;

    if (!this.spawnedEclipse) {
      this.spawnedEclipse = true;
      this._ultLanceStep = 0;
      this._ultLockedTargetX = initTargetX;
      this._ultLockedEclipseX = initEclipseX;
      this.heal(18, 'ECLIPSE CORONA');
      if (game?.audio) game.audio.play('eclipse_charge', initEclipseX);
      game?.vfx?.spawnSpecialCastAura(this, this.ultName, 'NEO-VISION OVERDRIVE', 'arcane', true);

      this._eclipseVisual = {
        active: true,
        x: initEclipseX,
        y: eclipseY,
        groundY: this.groundY,
        age: 0,
        maxLife: this.ultDuration
      };

      this.fx?.spawn('eclipseSupernovaDomain', initTargetX, this.groundY, {
        light: 1.34
      });
      this.fx?.spawn('arcaneBlinkRift', this._safeFxX(this.x, game), this.groundY, {
        light: 1.24,
        extra: { isArrival: false }
      });
      this.spawnRemoteSeal(initTargetX, this.groundY, 136, 1.45, true);
      this.spawnSolarStarCluster(initEclipseX, eclipseY, 10, 160, true);
    }

    const targetX = this._ultLockedTargetX ?? initTargetX;
    const eclipseX = this._ultLockedEclipseX ?? initEclipseX;

    if (this._eclipseVisual?.active) {
      this._eclipseVisual.age = t;
      this._eclipseVisual.x = eclipseX;
      this._eclipseVisual.groundY = this.groundY;
    }

    // Gravitational Singularity Pull during Eclipse Rain (`0.00..0.92s`)
    const foes = game?.getEnemiesOf ? game.getEnemiesOf(this) : enemy ? [enemy] : [];
    if (t < 0.92) {
      for (const foe of foes) {
        if (foe && !foe.isDead && !foe.isBenched && !foe.isColossalBoss) {
          if (Math.abs(targetX - foe.x) > 8) {
            foe.x += Math.sign(targetX - foe.x) * 124 * dt;
          }
        }
      }
    }

    // Rain 7 Meteoric Bombardment Lances & Solar Meteors from the Black-Sun Eclipse Ring!
    const lanceOffsets = [-156, -104, -52, 0, 52, 104, 156];
    const lanceTimes = [0.22, 0.30, 0.38, 0.46, 0.54, 0.62, 0.70];
    while (this._ultLanceStep < lanceTimes.length && t >= lanceTimes[this._ultLanceStep]) {
      const idx = this._ultLanceStep;
      this._ultLanceStep++;
      const destX = this._safeFxX(Math.max(95, Math.min(ww - 95, targetX + lanceOffsets[idx])), game);
      const dirX = destX - eclipseX;
      if (game?.audio && idx % 2 === 0) game.audio.play('fireball', destX);
      this.spawnRemoteSeal(destX, this.groundY, 46, 0.36, idx % 2 === 0);
      game?.vfx?.spawnSkyStrike({
        x: eclipseX + lanceOffsets[idx] * 0.25,
        y: eclipseY + 18,
        targetX: destX,
        groundY: this.groundY,
        vx: dirX * 2.8,
        vy: 1320,
        type: 'solar_lance',
        color: idx === 3 ? '#fef08a' : '#fb923c',
        coreColor: '#ffffff',
        owner: this,
        target: enemy,
        damage: idx === 3 ? 44 : 26,
        isUltimate: true
      });
      if (idx % 3 === 0) {
        const mDx = destX - eclipseX;
        const mDy = (this.groundY - 56) - eclipseY;
        const mLen = Math.hypot(mDx, mDy) || 1;
        game?.vfx?.spawnProjectile({
          x: eclipseX,
          y: eclipseY + 12,
          vx: (mDx / mLen) * 820,
          vy: (mDy / mLen) * 820,
          radius: 17,
          maxRange: 640,
          color: '#ea580c',
          coreColor: '#fef08a',
          owner: this,
          damage: 18,
          type: 'meteor',
          isMeteor: true
        });
      }
    }

    // Supernova Singularity Collapse & Solar Beam (`t >= 0.96s`)
    if (t >= 0.96 && !this.didActionFrame) {
      this.didActionFrame = true;
      if (game?.audio) {
        game.audio.play('solar_beam', targetX);
        game.audio.play('supernova_detonate', targetX);
      }
      game?.renderer?.triggerShake?.(22, 0.52);
      game?.renderer?.triggerAberration?.(12);
      game?.renderer?.triggerHitStop?.(0.08);

      game?.vfx?.spawnBeam({
        x1: eclipseX,
        y1: eclipseY,
        x2: targetX,
        y2: this.groundY - 10,
        width: 78,
        color: '#fb923c',
        coreColor: '#fef08a',
        maxLife: 0.56
      });

      this.fx?.spawn('solarMeteorImpactBurst', targetX, this.groundY - 78, {
        light: 1.38,
        extra: { isMeteor: true }
      });
      this.spawnVfxAnim(2, targetX, this.groundY - 104, 240, 240, 0.48, {
        flipX: false,
        inFront: true
      });
      this.spawnSolarStarCluster(targetX, this.groundY - 92, 14, 195, true);

      [-118, 0, 118].forEach((off, idx) => {
        const px = this._safeFxX(Math.max(95, Math.min(ww - 95, targetX + off)), game);
        game?.vfx?.spawnFlamePillar(px, this.groundY, this, enemy, {
          theme: 'arcane',
          delay: idx === 1 ? 0.02 : 0.10,
          maxLife: 1.08,
          scaleWidth: idx === 1 ? 1.14 : 0.80,
          isUltimate: true
        });
        this.fx?.spawn('hellfireSolarPillar', px, this.groundY - 4, {
          light: idx === 1 ? 1.36 : 1.22,
          extra: { scaleWidth: idx === 1 ? 1.14 : 0.80 }
        });
      });

      this._applyRemoteSolarEruption(targetX, 185, 158, game, enemy, {
        isCrit: true,
        knockX: 155,
        knockY: -205,
        hitStop: 0.06,
        isEclipse: true
      });

      game?.vfx?.spawnDamageText(
        targetX,
        this.groundY - 182,
        0,
        true,
        'BLACK-SUN ECLIPSE SINGULARITY!',
        '#fef08a'
      );
    }

    if (t >= this.ultDuration) {
      this.y = this.groundY;
      this.isInvulnerable = false;
      this._ultLockedTargetX = null;
      this._ultLockedEclipseX = null;
      if (this._eclipseVisual) this._eclipseVisual.active = false;
      this.setState('IDLE');
    }
  }

  /**
   * NEWLY BORN SUPREME FINISHER (`CATACLYSM: GRAND HELIOS APOCALYPSE`, `5.20s`):
   * - Phase 1 (`0.00..1.55s`): Full-stage Golden Astrolabe Seal + Jagged Celestial Rift (`Row 5`)
   * - Phase 2 (`1.55..3.22s`): Colossal 3D-Tumbling Dreadnought Sun-Meteor (`Row 6`) + 7 Comet Wake Plumes (`Row 7`)
   * - Phase 3 (`t >= 3.22s..5.20s`): Whiteout Deletion + triggers `triggerInfernoStage()` strictly at `t >= 3.22s`!
   */
  updateTrueUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.trueUltDuration || 5.20;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    this.vx = 0;
    this.vy = 0;
    this.y = this.groundY;
    this.isInvulnerable = true;
    this.unstoppablePoise = true;
    this.runeOrbit += dt * 11.5;

    if (!this._trueUltInit) {
      this._trueUltInit = true;
      this._trueUltStage = 0;
      this._trueUltTick = 0;

      const rawTargetX = enemy ? enemy.x : this.x + this.facing * 360;
      const targetX = this._safeFxX(Math.max(250, Math.min(ww - 250, rawTargetX)), game);

      let meteorDir = targetX >= this.x ? 1 : -1;
      if (targetX - meteorDir * 310 < 150) meteorDir = -1;
      else if (targetX - meteorDir * 310 > ww - 150) meteorDir = 1;

      const startX = this._safeFxX(Math.max(145, Math.min(ww - 145, targetX - meteorDir * 315)), game);
      const startY = this.groundY - 680;

      this.trueUltMeteor = {
        active: true,
        phase: 'rift',
        dir: meteorDir,
        x: startX,
        y: startY + 4,
        startX,
        startY,
        targetX,
        targetY: this.groundY - 30,
        progress: 0,
        riftScale: 0.14,
        rot: 0,
        trailNodes: []
      };
      this.cameraAirLift = 280;

      if (game?.audio) game.audio.play('eclipse_charge', this.x);
      game?.renderer?.triggerShake?.(14, 0.55);
      game?.renderer?.triggerAberration?.(10);

      this.fx?.spawn('astralBlackMageLeyLines', this._safeFxX(this.x, game), this.groundY, {
        light: 1.58
      });
      this.fx?.spawn('solarFlameWard', this._safeFxX(this.x, game), this.groundY - 92, {
        follow: this,
        offsetX: 0,
        offsetY: -92,
        light: 1.48
      });
      this.fx?.spawn('heliosPalmFocus', this._safeFxX(this.x + this.facing * 26, game), this.groundY - 126, {
        follow: this,
        offsetX: 26,
        offsetY: -126,
        flip: this.facing < 0,
        light: 1.45
      });
      this.fx?.spawn('eclipseSupernovaDomain', targetX, this.groundY, {
        light: 1.54
      });
      this.fx?.spawn('eclipseSupernovaDomain', this._safeFxX(this.x, game), this.groundY, {
        light: 1.40
      });

      game?.vfx?.spawnShockwave(this.x, this.groundY - 12, 220, '#fb923c', 0.52, true);
      game?.vfx?.spawnGlyphBurst?.(this.x, this.groundY - 96, 12, 'arcane');
      this.spawnSolarStarCluster(this.x, this.groundY - 96, 12, 165, false);
      game?.vfx?.spawnDamageText(
        this.x,
        this.groundY - 212,
        0,
        true,
        'CATACLYSM: GRAND HELIOS APOCALYPSE!',
        '#fef08a'
      );
    }

    const m = this.trueUltMeteor;
    const targetX = this._safeFxX(m ? m.targetX : enemy ? enemy.x : ww * 0.5, game);

    if (t < 1.55) {
      const u = Math.min(1, t / 1.55);
      this.y = this.groundY;
      this.cameraAirLift = 635 * Math.min(1, 0.35 + u * 0.85);

      const fIdx =
        t < 0.42
          ? 120 + Math.min(4, Math.floor((t / 0.42) * 5))
          : 124 + ((Math.floor((t - 0.42) * 14) % 8) <= 4
              ? Math.floor((t - 0.42) * 14) % 8
              : 8 - (Math.floor((t - 0.42) * 14) % 8));
      this.trueUltFrameOverride = fIdx;
      this._overrideFrameIdx = fIdx;

      if (m) {
        m.active = true;
        m.phase = 'rift';
        m.riftScale = Math.min(1, u * 1.22);
        m.progress = u * 0.14;
        m.x = m.startX + (m.targetX - m.startX) * (u * 0.085);
        m.y = m.startY + 4 + 52 * u;
      }

      if (game?.renderer) {
        game.renderer.ultDim = Math.max(game.renderer.ultDim || 0, 0.72);
      }

      if (t >= 0.82 && this._trueUltStage < 1) {
        this._trueUltStage = 1;
        if (game?.audio) game.audio.play('solar_beam', targetX);
        game?.renderer?.triggerShake?.(16, 0.42);
        const breachX = this._safeFxX(m ? m.startX : targetX, game);
        const breachY = m ? m.startY - 18 : this.groundY - 698;
        game?.vfx?.spawnLightning(this._safeFxX(breachX - 88, game), breachY + 14, this.groundY, '#fef08a', '#fb923c');
        game?.vfx?.spawnLightning(this._safeFxX(breachX + 88, game), breachY + 14, this.groundY, '#ffffff', '#ea580c');
        this.fx?.spawn('eclipseSupernovaDomain', targetX, this.groundY, {
          light: 1.48
        });
        this.fx?.spawn('magmaFissureCrack', this._safeFxX(this.x, game), this.groundY, {
          light: 1.32,
          extra: { spanX: targetX - this.x }
        });
      }
    } else if (t < 3.22) {
      const u = Math.max(0, Math.min(1, (t - 1.55) / 1.67));
      const eased = u * u * (0.58 + 0.42 * u);
      this.y = this.groundY;
      this.cameraAirLift = Math.max(0, 635 * (1 - Math.pow(eased, 1.45)));

      const fIdx =
        u < 0.38
          ? 129 + Math.min(7, Math.floor((u / 0.38) * 8))
          : 134 + (Math.floor((t - 1.55) * 12) % 3);
      this.trueUltFrameOverride = fIdx;
      this._overrideFrameIdx = fIdx;

      if (this._trueUltStage < 2) {
        this._trueUltStage = 2;
        if (game?.audio) game.audio.play('fireball', targetX);
        game?.renderer?.triggerShake?.(20, 1.65);
        game?.renderer?.triggerAberration?.(14);
        this.fx?.spawn('eclipseSupernovaDomain', targetX, this.groundY, {
          light: 1.52
        });
        game?.vfx?.spawnDamageText(
          targetX,
          this.groundY - 258,
          0,
          true,
          'DREADNOUGHT SUN-METEOR DESCENT!',
          '#fb923c'
        );
      }

      if (m) {
        const launchX = m.startX + (m.targetX - m.startX) * 0.085;
        const launchY = m.startY + 56;
        m.active = true;
        m.phase = 'descent';
        m.riftScale = 1.0 - 0.18 * eased;
        m.progress = u;
        m.x = launchX + (m.targetX - launchX) * eased;
        m.y = launchY + (m.targetY - launchY) * eased;
        m.rot += dt * 1.55;

        this._trueUltTick += dt;
        if (this._trueUltTick >= 0.065) {
          this._trueUltTick = 0;
          m.trailNodes.push({
            x: m.x - m.dir * 26,
            y: m.y - 52,
            size: 215 + u * 115,
            frameOffset: m.trailNodes.length * 4
          });
          if (m.trailNodes.length > 8) m.trailNodes.shift();

          if (m.y > this.groundY - 680) {
            this.fx?.spawn('astralMeteorSlipstreamWake', this._safeFxX(m.x - m.dir * 18, game), m.y - 36, {
              light: 1.48,
              extra: { scale: 0.88 + u * 0.52 }
            });
          }

          game?.vfx?.spawnShockwave(m.x, m.y + 34, 145 + u * 95, '#fb923c', 0.24, true, true);
          this.fx?.burst(
            this._safeFxX(m.x + (Math.random() - 0.5) * 140, game),
            m.y + (Math.random() - 0.5) * 90,
            {
              count: 8,
              speedMin: 65,
              speedMax: 220,
              lifeMin: 0.22,
              lifeMax: 0.45,
              gravity: -65,
              colors: ['#ffffff', '#fef08a', '#fb923c', '#ea580c', '#dc2626']
            }
          );
          this.spawnSolarStarCluster(m.x, m.y, 5, 165, false);
          this.spawnExParticle({
            x: m.x,
            y: m.y + 24,
            shape: 'ring',
            size: 64 + u * 48,
            color: '#fb923c',
            coreColor: '#fef08a',
            maxLife: 0.24
          });
        }
      }

      if (game?.renderer) {
        game.renderer.ultDim = Math.max(game.renderer.ultDim || 0, 0.78);
      }

      const enemies = game?.getEnemiesOf ? game.getEnemiesOf(this) : enemy ? [enemy] : [];
      for (const cand of enemies) {
        if (cand && !cand.isDead && !cand.isBenched && !cand.isColossalBoss) {
          const pullDir = Math.sign(targetX - cand.x);
          cand.x += pullDir * 165 * dt;
        }
      }
    } else if (t < dur) {
      // PHASE 3 (STRICTLY at t >= 3.22s): Cataclysmic Ground Impact & Permanent Inferno Stage!
      this.y = this.groundY;
      this.cameraAirLift = 0;
      const postU = Math.max(0, Math.min(1, (t - 3.22) / (dur - 3.22)));
      const fIdx = 137 + Math.min(12, Math.floor(postU * 13));
      this.trueUltFrameOverride = fIdx;
      this._overrideFrameIdx = fIdx;

      if (this._trueUltStage < 3) {
        this._trueUltStage = 3;
        if (m) {
          m.phase = 'detonated';
          m.active = false;
        }

        if (game?.audio) {
          game.audio.play('meteor_impact', targetX);
          game.audio.play('supernova_detonate', targetX);
        }

        if (game?.renderer) {
          game.renderer.triggerImpactFrame?.(targetX, this.groundY - 90, 0.16, 'inferno');
          game.renderer.triggerWhiteoutDeletion?.(targetX, this.groundY - 64, 1.45, 'inferno');
          game.renderer.triggerInfernoStage?.();
          game.renderer.setStageTransformation?.('inferno', 1.0, true, 0);
          game.renderer.triggerShake?.(42, 1.25);
          game.renderer.triggerAberration?.(26);
          game.renderer.triggerHitStop?.(0.14);
        }
        if (game?.hudEls?.stageBadge) {
          game.hudEls.stageBadge.textContent = 'LAYWASTE OF INFERNO';
        }

        // Colossal 120Hz `ArcaneShaderFX` Thermonuclear Cataclysm Impact Domes
        this.fx?.spawn('astralCataclysmImpactDome', targetX, this.groundY, {
          light: 1.85
        });
        [-190, 0, 190].forEach((off, idx) => {
          const bx = this._safeFxX(Math.max(120, Math.min(ww - 120, targetX + off)), game);
          if (idx !== 1) {
            this.fx?.spawn('astralCataclysmImpactDome', bx, this.groundY, {
              light: 1.55
            });
          }
          this.fx?.spawn('solarMeteorImpactBurst', bx, this.groundY - 78, {
            light: idx === 1 ? 1.65 : 1.42,
            extra: { isMeteor: true }
          });
          this.spawnSolarStarCluster(bx, this.groundY - 82, 10, 210, idx !== 1);
        });

        [-360, -240, -120, 0, 120, 240, 360].forEach((off, idx) => {
          const px = this._safeFxX(Math.max(95, Math.min(ww - 95, targetX + off)), game);
          const isCenter = idx === 3;
          game?.vfx?.spawnFlamePillar(px, this.groundY, this, enemy, {
            theme: 'arcane',
            delay: Math.abs(idx - 3) * 0.06,
            maxLife: 1.75,
            scaleWidth: isCenter ? 1.38 : 0.95,
            isUltimate: true
          });
          this.fx?.spawn('hellfireSolarPillar', px, this.groundY - 4, {
            light: isCenter ? 1.55 : 1.32,
            extra: { scaleWidth: isCenter ? 1.38 : 0.95 }
          });
        });

        const fissureStartX = ww <= 1600 ? 140 : Math.max(140, targetX - 270);
        const fissureSpanX = ww <= 1600 ? ww - 280 : 540;
        this.fx?.spawn('magmaFissureCrack', this._safeFxX(fissureStartX, game), this.groundY, {
          light: 1.5,
          extra: { spanX: fissureSpanX }
        });

        game?.vfx?.spawnShockwave(targetX, this.groundY - 12, 480, '#fef08a', 0.85, true);
        game?.vfx?.spawnShockwave(targetX, this.groundY - 42, 380, '#fb923c', 0.68, false);
        game?.vfx?.spawnDecal?.(targetX, 280, 'fissure', '#fb923c', 12.0);
        game?.vfx?.spawnBurst(targetX, this.groundY - 24, 52, '#fef08a', 460, { upBias: 210, size: 10 });
        game?.vfx?.spawnBurst(targetX, this.groundY - 24, 44, '#ea580c', 420, { upBias: 185, size: 9 });
        game?.vfx?.spawnGlyphBurst?.(targetX, this.groundY - 72, 16, 'arcane');

        this.heal(Math.round(this.maxHp * 0.14), 'ASTRAL LEY-WARD');
        const enemies = game?.getEnemiesOf ? game.getEnemiesOf(this) : enemy ? [enemy] : [];
        for (const cand of enemies) {
          if (cand && !cand.isDead && !cand.isBenched) {
            cand.takeDamage(760, this, true, 320, -380);
          }
        }

        game?.vfx?.spawnDamageText(
          targetX,
          this.groundY - 224,
          0,
          true,
          'CATACLYSM: LAYWASTE OF INFERNO!',
          '#fef08a'
        );
      }
    } else {
      this.y = this.groundY;
      this.cameraAirLift = 0;
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      this.isInvulnerable = false;
      this.unstoppablePoise = false;
      if (m) {
        m.active = false;
        m.phase = 'none';
      }
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

    this.blinkPortalTimer = Math.max(0, this.blinkPortalTimer - dt);

    for (let i = this.solarEchoes.length - 1; i >= 0; i--) {
      this.solarEchoes[i].life += dt;
      if (this.solarEchoes[i].life >= this.solarEchoes[i].maxLife) {
        this.solarEchoes.splice(i, 1);
      }
    }

    for (let i = this.activeVfxAnims.length - 1; i >= 0; i--) {
      const v = this.activeVfxAnims[i];
      v.age += dt;
      if (v.followOwner) {
        v.x = this.x + this.facing * v.offsetX;
        v.y = this.y + v.offsetY;
      } else {
        v.x += (v.vx || 0) * dt;
        v.y += (v.vy || 0) * dt;
      }
      if (v.age >= v.maxLife) {
        this.activeVfxAnims.splice(i, 1);
      }
    }

    for (let i = this.remoteSeals.length - 1; i >= 0; i--) {
      this.remoteSeals[i].age += dt;
      if (this.remoteSeals[i].age >= this.remoteSeals[i].maxLife) {
        this.remoteSeals.splice(i, 1);
      }
    }

    this._exParticles?.emitAmbient(dt, this);
    this._exParticles?.update(dt);
  }

  update(dt, enemy, game) {
    this._currentEnemy = enemy;
    this.runeOrbit += dt * 3.1;
    this.crouchCooldown = Math.max(0, this.crouchCooldown - dt);
    this.wallFlipCooldown = Math.max(0, this.wallFlipCooldown - dt);
    this.updateCustomVfx(dt);

    if (this.state === 'WALK' || this.state === 'IDLE') {
      this._overrideFrameIdx = null;
      this.trueUltFrameOverride = null;
    }

    if (this.fx) {
      this.ensureOrbitingSuns();
      this.fx.update(dt);
    }

    if (!this.isDead && this.state === 'WALK') {
      this.stepDustTimer += dt;
      if (this.stepDustTimer >= 0.30) {
        this.stepDustTimer = 0;
        this.spawnExParticle({
          x: this.x - this.facing * 12,
          y: this.groundY - 4,
          vx: -this.facing * 24,
          vy: -28,
          gravity: -16,
          shape: 'ember',
          size: 3,
          color: '#fb923c',
          coreColor: '#fef08a',
          maxLife: 0.24,
          layer: 'back'
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
      if (this.crouchCooldown <= 0 && game?.vfx?.projectiles) {
        for (const proj of game.vfx.projectiles) {
          if (
            proj.owner !== this &&
            Math.abs(proj.x - this.x) < 235 &&
            Math.sign(proj.vx) === Math.sign(this.x - proj.x)
          ) {
            this.startCrouch(enemy, game);
            return;
          }
        }
      }
    }

    super.update(dt, enemy, game);

    if (this.state === 'WALK' || this.state === 'IDLE') {
      this._overrideFrameIdx = null;
      this.trueUltFrameOverride = null;
    }
  }

  getExSprites() {
    if (typeof Image === 'undefined') return null;
    const assets = PixelForge.initAssets();
    if (!assets) return null;
    if (!assets.mage_ex) {
      const mkImg = (src) => {
        const img = new Image();
        img.src = src;
        return img;
      };
      assets.mage_ex = {
        sheet: mkImg('assets/sprites/mage_ex_sheet.png?v=30fps118'),
        vfx: mkImg('assets/sprites/mage_ex_vfx.png?v=30fps118'),
        portrait: mkImg('assets/sprites/mage_ex_portrait.png?v=30fps118'),
        cellW: 320,
        cellH: 240,
        anchorX: 112,
        anchorY: 230
      };
    } else if (assets.mage_ex.vfx) {
      const vfxImg = assets.mage_ex.vfx;
      if (vfxImg._deferredSrc && !vfxImg._deferredSrc.includes('v=30fps118')) {
        vfxImg._deferredSrc = 'assets/sprites/mage_ex_vfx.png?v=30fps118';
        vfxImg._origSrc = 'assets/sprites/mage_ex_vfx.png?v=30fps118';
      } else if (!vfxImg._deferredSrc && !String(vfxImg.src || '').includes('v=30fps118')) {
        vfxImg._origSrc = 'assets/sprites/mage_ex_vfx.png?v=30fps118';
        vfxImg.src = 'assets/sprites/mage_ex_vfx.png?v=30fps118';
      }
    }
    return assets.mage_ex;
  }

  // ============================================================================
  // NEXT-GEN HD-2D BLOOMED PIXEL VFX, SOLAR ASTROLABES & METEOR CATACLYSM
  // ============================================================================
  _drawBloomedVfxCell(
    ctx,
    renderer,
    vfxSheet,
    col,
    row,
    dx,
    dy,
    dw,
    dh,
    glowCol = '#fb923c',
    alpha = 1.0,
    isReflection = false
  ) {
    PixelForge.ensureImage?.(vfxSheet);
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth || alpha <= 0.01) return;
    const sx = (((col % 30) + 30) % 30) * 208;
    const sy = row * 208;
    const vfxMgr = this.game?.vfx;
    if (vfxMgr?.drawBloomedSprite) {
      const safeRenderer =
        renderer && typeof renderer.getGlowForColor === 'function' && renderer.getGlowForColor(glowCol)
          ? renderer
          : null;
      vfxMgr.drawBloomedSprite(
        ctx,
        safeRenderer,
        vfxSheet,
        sx,
        sy,
        208,
        208,
        dx,
        dy,
        dw,
        dh,
        glowCol,
        alpha,
        isReflection
      );
      return;
    }
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = isReflection ? 'lighter' : 'source-over';
    ctx.globalAlpha = Math.min(1, alpha * (isReflection ? 0.28 : 0.96));
    ctx.drawImage(vfxSheet, sx, sy, 208, 208, Math.round(dx), Math.round(dy), Math.round(dw), Math.round(dh));
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, alpha * (isReflection ? 0.14 : 0.30));
    ctx.drawImage(vfxSheet, sx, sy, 208, 208, Math.round(dx), Math.round(dy), Math.round(dw), Math.round(dh));
    ctx.restore();
  }

  drawRemoteSeals(ctx, renderer = null) {
    if (!this.remoteSeals.length) return;
    const sprites = this.getExSprites();
    const vfxSheet = PixelForge.ensureImage(sprites?.vfx);
    const baseCol = Math.floor(this.runeOrbit * 9.5) % 30;

    for (let i = 0; i < this.remoteSeals.length; i++) {
      const s = this.remoteSeals[i];
      const u = Math.min(1, s.age / Math.max(0.01, s.maxLife));
      const fade = Math.sin(u * Math.PI);
      if (fade <= 0.02) continue;
      const w = Math.round(s.radius * 2.4 * (0.74 + 0.30 * u));
      const h = Math.max(24, Math.round(w * 0.30));
      const cx = Math.round(s.x);
      const cy = Math.round(s.groundY - 4);
      const outer = s.isEclipse ? '#c026d3' : '#fb923c';
      drawExBayerHalo(ctx, cx, cy, Math.min(76, w * 0.42), Math.min(26, h * 0.55), outer, '#fef08a', 0.16 * fade);

      if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
        const col = (baseCol + i * 5) % 30;
        this._drawBloomedVfxCell(
          ctx,
          renderer,
          vfxSheet,
          col,
          s.isEclipse ? 2 : 4,
          Math.round(cx - w * 0.5),
          Math.round(cy - h * 0.5),
          w,
          h,
          outer,
          0.90 * fade,
          false
        );
      }
    }
  }

  drawBlackSunEclipseOverlay(ctx, renderer = null) {
    const e = this._eclipseVisual;
    if (!e || !e.active) return;
    const u = Math.min(1, e.age / Math.max(0.01, e.maxLife));
    const fade = u < 0.14 ? u / 0.14 : u > 0.80 ? (1 - u) / 0.20 : 1.0;
    if (fade <= 0.02) return;

    const sprites = this.getExSprites();
    const vfxSheet = PixelForge.ensureImage(sprites?.vfx);
    const col = Math.floor(e.age * 30) % 30;
    const revCol = (30 - col) % 30;
    const cx = Math.round(e.x);
    const cy = Math.round(e.y);

    drawExBayerHalo(ctx, cx, cy, 80 * fade, 68 * fade, '#c026d3', '#fb923c', 0.18 * fade);

    if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      const outerSz = Math.round(258 * (0.86 + 0.14 * fade));
      const innerSz = Math.round(224 * (0.86 + 0.14 * fade));
      this._drawBloomedVfxCell(
        ctx,
        renderer,
        vfxSheet,
        revCol,
        4,
        Math.round(cx - outerSz * 0.5),
        Math.round(cy - outerSz * 0.5),
        outerSz,
        outerSz,
        '#fb923c',
        0.72 * fade,
        false
      );
      this._drawBloomedVfxCell(
        ctx,
        renderer,
        vfxSheet,
        col,
        2,
        Math.round(cx - innerSz * 0.5),
        Math.round(cy - innerSz * 0.5),
        innerSz,
        innerSz,
        '#c026d3',
        0.96 * fade,
        false
      );
    }
  }

  drawSolarEchoes(ctx) {
    if (!this.solarEchoes.length) return;
    const sprites = this.getExSprites();
    const sheet = PixelForge.ensureImage(sprites?.sheet);
    if (!sheet || !sheet.complete || !sheet.naturalWidth) return;

    for (let i = 0; i < this.solarEchoes.length; i++) {
      const ec = this.solarEchoes[i];
      const fade = Math.max(0, 1 - ec.life / ec.maxLife) * (ec.alphaScale || 1.0);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(Math.round(ec.x / 2) * 2, Math.round((ec.y + 4) / 2) * 2);
      ctx.scale(ec.facing, 1);
      ctx.globalAlpha = fade * 0.52;
      PixelForge.drawSilhouetteFrame(ctx, sprites, ec.frameIdx, 208, 208, '#fb923c');
      ctx.restore();
    }
  }

  drawBlinkPortals(ctx, renderer = null) {
    if (this.blinkPortalTimer <= 0) return;
    const sprites = this.getExSprites();
    const vfxSheet = PixelForge.ensureImage(sprites?.vfx);
    const fade = Math.min(1, this.blinkPortalTimer / 0.42);
    const col = Math.floor((0.56 - this.blinkPortalTimer) * 52) % 30;
    const portals = [this.blinkOriginX];
    if (this.didBlink || this.blinkPortalTimer < 0.44) {
      portals.push(this.blinkTargetX);
    }

    for (let idx = 0; idx < portals.length; idx++) {
      const px = Math.round(portals[idx]);
      const py = Math.round(this.groundY - 96);
      const size = Math.round(164 * (0.84 + 0.16 * fade));
      const half = Math.round(size * 0.5);

      drawExBayerHalo(ctx, px, py, size * 0.48, size * 0.48, '#fb923c', '#fef08a', 0.16 * fade);
      if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
        this._drawBloomedVfxCell(
          ctx,
          renderer,
          vfxSheet,
          (col + idx * 7) % 30,
          4,
          px - half,
          py - half,
          size,
          size,
          '#fb923c',
          fade * 0.92,
          false
        );
      }
    }
  }

  drawMageExVfxAnims(ctx, inFront = true, renderer = null) {
    if (!this.activeVfxAnims.length) return;
    const sprites = this.getExSprites();
    const vfxSheet = PixelForge.ensureImage(sprites?.vfx);
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < this.activeVfxAnims.length; i++) {
      const v = this.activeVfxAnims[i];
      if (Boolean(v.inFront) !== Boolean(inFront)) continue;
      const u = Math.max(0, Math.min(0.999, v.age / Math.max(0.01, v.maxLife)));
      const span = Math.max(1, v.endFrame - v.startFrame + 1);
      const col = v.startFrame + Math.min(span - 1, Math.floor(u * span));
      const fade = Math.sin(u * Math.PI);
      const px = Math.round(v.x);
      const py = Math.round(v.y);
      const halfW = Math.round(v.w * 0.5);
      const halfH = Math.round(v.h * 0.5);

      drawExBayerHalo(ctx, px, py, halfW * 0.84, halfH * 0.84, '#fb923c', '#fef08a', 0.15 * fade);
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(v.flipX ? -1 : 1, 1);
      this._drawBloomedVfxCell(
        ctx,
        renderer,
        vfxSheet,
        col,
        v.row,
        -halfW,
        -halfH,
        v.w,
        v.h,
        v.row === 2 ? '#c026d3' : '#fb923c',
        Math.min(1, 0.36 + fade * 0.64),
        false
      );
      ctx.restore();
    }
    ctx.restore();
  }

  /**
   * Renders `CATACLYSM: GRAND HELIOS APOCALYPSE`:
   * 2.5D Ground Cataclysm Target Seal (`Row 5` + `Row 4` + `Row 1`),
   * 9 scrolling Starfall Lock-On Motes, High-Cosmos Dimensional Heavensfall Sky Breach (`Row 5` + `Row 2`),
   * 7 Comet Wake Plumes (`Row 7`), and native `208x208` 30fps 3D-Tumbling Obsidian-Magma Dreadnought
   * Sun-Meteor (`Row 6`, zero `ctx.rotate`!).
   */
  drawTrueUltimateMeteor(ctx, renderer = null) {
    void renderer;
    const m = this.trueUltMeteor;
    if (!m || !m.active) return;

    const sprites = this.getExSprites();
    const vfxSheet = PixelForge.ensureImage(sprites?.vfx);
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;

    const animTime = Number.isFinite(this.stateTimer) ? this.stateTimer : performance.now() * 0.001;
    const baseCol = Math.floor(animTime * 30) % 30;
    const revCol = (30 - baseCol) % 30;
    const meteorDir = m.dir || 1;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // =========================================================================
    // 1. 2.5D PIXEL-ART GROUND CATACLYSM TARGET SEAL (`mage_ex_vfx.png` Rows 5, 4, 1)
    // =========================================================================
    const gx = Math.round(m.targetX);
    const gy = Math.round(this.groundY - 6);
    const ringScale = m.phase === 'descent' ? 0.94 + 0.36 * m.progress : Math.max(0.25, m.riftScale);
    const sealW = Math.round(580 * ringScale);
    const sealH = Math.round(168 * ringScale);

    drawExBayerHalo(
      ctx,
      gx,
      gy,
      Math.min(116, sealW * 0.42),
      Math.min(42, sealH * 0.58),
      '#ea580c',
      '#fef08a',
      0.19 * Math.min(1, ringScale)
    );

    ctx.save();
    ctx.translate(gx, gy);

    // Outer 2.5D Accretion Target Seal (Row 5 `y = 1040`, native `208x208` `astralSkyBreachPortalCell`)
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.95 * Math.min(1, ringScale * 1.15);
    ctx.drawImage(
      vfxSheet,
      baseCol * 208,
      1040,
      208,
      208,
      Math.round(-sealW * 0.5),
      Math.round(-sealH * 0.5),
      sealW,
      sealH
    );

    // Inner Rotating Seamless Golden Solar Astrolabe Magic Circle (Row 4 `y = 832`)
    const innerW = Math.round(sealW * 0.72);
    const innerH = Math.round(sealH * 0.72);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.90 * Math.min(1, ringScale * 1.15);
    ctx.drawImage(
      vfxSheet,
      ((baseCol + 9) % 30) * 208,
      832,
      208,
      208,
      Math.round(-innerW * 0.5),
      Math.round(-innerH * 0.5),
      innerW,
      innerH
    );

    // Stepped Pixel-Art Catastrophe Lock-On Flare rising from the Target Seal (Row 1 `y = 208`)
    const pillarCol = (baseCol + 4) % 30;
    const pillarW = Math.round(126 * ringScale);
    const pillarH = Math.round(196 * ringScale);
    ctx.drawImage(
      vfxSheet,
      pillarCol * 208,
      208,
      208,
      208,
      Math.round(-pillarW * 0.5),
      Math.round(-pillarH * 0.88),
      pillarW,
      pillarH
    );
    ctx.restore();

    // =========================================================================
    // 2. HIGH-COSMOS DIMENSIONAL HEAVENSFALL SKY BREACH (`ry = startY - 18`)
    // =========================================================================
    const rx = Math.round(m.startX);
    const ry = Math.round(m.startY - 18);
    const riftScale = Math.max(0.24, m.riftScale);
    const breachW = Math.round(780 * riftScale);
    const breachH = Math.round(320 * riftScale);

    // 9 Scrolling Pixel Starfall Lock-On Motes pulsing along `(rx, ry) -> (gx, gy)`
    const guideFade =
      m.phase === 'rift' ? riftScale * 0.78 : Math.max(0, (1 - m.progress * 1.15) * 0.65);
    if (guideFade > 0.04) {
      const moteCount = 9;
      const scroll = (animTime * 2.4) % 1;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < moteCount; i++) {
        const uGuide = (i + scroll) / moteCount;
        if (uGuide < 0.08 || uGuide > 0.94) continue;
        const px = Math.round((rx + (gx - rx) * uGuide) / 2) * 2;
        const py = Math.round((ry + (gy - ry) * uGuide) / 2) * 2;
        const env = Math.sin(uGuide * Math.PI) * guideFade;
        ctx.globalAlpha = env * 0.85;
        ctx.fillStyle = i % 2 === 0 ? '#fef08a' : '#fb923c';
        ctx.fillRect(px - 2, py - 6, 4, 12);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px - 1, py - 3, 2, 6);
      }
      ctx.restore();
    }

    drawExBayerHalo(
      ctx,
      rx,
      ry,
      Math.min(128, breachW * 0.42),
      Math.min(58, breachH * 0.48),
      '#c026d3',
      '#fb923c',
      0.18 * Math.min(1, riftScale)
    );

    ctx.save();
    ctx.translate(rx, ry);

    // Primary Native `208x208` 30fps Dimensional Sky Breach Portal (Row 5 `y = 1040`)
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(1, riftScale * 1.15);
    ctx.drawImage(
      vfxSheet,
      baseCol * 208,
      1040,
      208,
      208,
      Math.round(-breachW * 0.5),
      Math.round(-breachH * 0.5),
      breachW,
      breachH
    );

    // Counter-Rotating Black-Sun Eclipse Singularity Core inside the Breach (Row 2 `y = 416`)
    const coreW = Math.round(440 * riftScale);
    const coreH = Math.round(240 * riftScale);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.88 * riftScale;
    ctx.drawImage(
      vfxSheet,
      revCol * 208,
      416,
      208,
      208,
      Math.round(-coreW * 0.5),
      Math.round(-coreH * 0.5),
      coreW,
      coreH
    );
    ctx.restore();

    // =========================================================================
    // 3. 7 STAGGERED `Row 7` (`y = 1456`) PIXEL-ART COMET WAKE PLUMES (ZERO `ctx.rotate`!)
    // =========================================================================
    const mx = Math.round(m.x);
    const my = Math.round(m.y);

    if (m.phase === 'descent') {
      const wakeNodes = 7;
      for (let i = wakeNodes - 1; i >= 0; i--) {
        const uNode = (i + 0.65) / (wakeNodes + 0.6);
        const wx = Math.round(mx + (rx - mx) * uNode);
        const wy = Math.round(my + (ry - my) * uNode);
        const wSize = Math.round((520 - uNode * 190) * (0.92 + 0.34 * m.progress));
        const wCol = (baseCol + i * 4) % 30;
        const wOffX = Math.round(-wSize * ((104 + 24) / 208));
        const wOffY = Math.round(-wSize * ((104 + 48) / 208));

        ctx.save();
        ctx.translate(wx, wy);
        ctx.scale(meteorDir, 1);
        ctx.imageSmoothingEnabled = false;
        ctx.globalCompositeOperation = i < 4 ? 'source-over' : 'lighter';
        ctx.globalAlpha = (1 - uNode * 0.62) * 0.95;
        ctx.drawImage(vfxSheet, wCol * 208, 1456, 208, 208, wOffX, wOffY, wSize, wSize);
        ctx.restore();
      }
    }

    // =========================================================================
    // 4. COLOSSAL NATIVE `208x208` 30FPS 3D-TUMBLING OBSIDIAN-MAGMA DREADNOUGHT METEOR (`Row 6`, `y = 1248`)
    // =========================================================================
    const meteorScale =
      m.phase === 'rift' ? 1.28 + 0.96 * m.riftScale : 2.26 + 1.16 * m.progress;
    const meteorSize = Math.round((208 * meteorScale) / 2) * 2;
    const drawOffX = Math.round((-meteorSize * ((104 + 18) / 208)) / 2) * 2;
    const drawOffY = Math.round((-meteorSize * ((104 + 27) / 208)) / 2) * 2;
    const meteorAlpha = m.phase === 'rift' ? Math.min(1, m.riftScale * 1.25) : 1.0;

    drawExBayerHalo(
      ctx,
      mx,
      my,
      Math.min(132, meteorSize * 0.36),
      Math.min(112, meteorSize * 0.36),
      '#ea580c',
      '#fef08a',
      0.20 * meteorAlpha
    );

    ctx.save();
    ctx.translate(mx, my);
    ctx.scale(meteorDir, 1);
    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = meteorAlpha;
    ctx.drawImage(
      vfxSheet,
      baseCol * 208,
      1248,
      208,
      208,
      drawOffX,
      drawOffY,
      meteorSize,
      meteorSize
    );
    ctx.restore();

    if (m.phase === 'descent') {
      const dxFlight = gx - rx;
      const dyFlight = gy - ry;
      const flightLen = Math.hypot(dxFlight, dyFlight) || 1;
      const ux = dxFlight / flightLen;
      const uy = dyFlight / flightLen;
      const nx = -uy;
      const ny = ux;
      const snap2 = (v) => Math.round(v * 0.5) * 2;
      const noseDist = meteorSize * 0.10;
      const noseX = mx + ux * noseDist;
      const noseY = my + uy * noseDist;
      const bowRadius = meteorSize * 0.24;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      const sparkCount = 18;
      for (let s = 0; s < sparkCount; s++) {
        const frac = (s / (sparkCount - 1)) * 2 - 1;
        const shimmer = (animTime * 9.5 + s * 0.37) % 1;
        const lead = (1 - frac * frac * 0.72) * (14 + shimmer * 16) + 4;
        const sweep = frac * frac * 18;
        const sx = snap2(noseX + nx * frac * bowRadius + ux * (lead - sweep));
        const sy = snap2(noseY + ny * frac * bowRadius + uy * (lead - sweep));
        const env = Math.max(0.25, (1 - shimmer * 0.65) * (1 - Math.abs(frac) * 0.45));
        ctx.globalAlpha = Math.min(0.96, env);
        ctx.fillStyle = s % 3 === 0 ? '#ffffff' : s % 2 === 0 ? '#fef08a' : '#fb923c';
        const sz = s % 4 === 0 ? 4 : 2;
        ctx.fillRect(sx - (sz >> 1), sy - (sz >> 1), sz, sz);
        if (s % 3 === 0) {
          ctx.fillStyle = '#fb923c';
          ctx.fillRect(snap2(sx - ux * 6), snap2(sy - uy * 6), 2, 2);
        }
      }

      ctx.globalCompositeOperation = 'source-over';
      const debrisCount = 10;
      for (let d = 0; d < debrisCount; d++) {
        const phase = animTime * (2.6 + (d % 3) * 0.8) + d * 1.47;
        const side = (d % 2 === 0 ? 1 : -1) * (0.28 + ((d * 3) % 7) * 0.14);
        const ahead = 18 + ((d * 17) % 52) + Math.sin(phase) * 8;
        const orbitPerp = side * meteorSize * 0.25 + Math.cos(phase * 1.3) * 10;
        const cxD = snap2(noseX + ux * ahead + nx * orbitPerp);
        const cyD = snap2(noseY + uy * ahead + ny * orbitPerp);
        ctx.globalAlpha = 0.94;
        ctx.fillStyle = '#fb923c';
        ctx.fillRect(cxD - 2, cyD - 2, 4, 4);
        ctx.fillStyle = d % 2 === 0 ? '#fef08a' : '#ffffff';
        ctx.fillRect(cxD, cyD - 2, 2, 2);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(snap2(cxD - ux * 4), snap2(cyD - uy * 4), 2, 2);
      }

      ctx.restore();
    }

    ctx.restore();
  }

  drawForegroundOverlay(ctx, renderer = null) {
    const arenaCenterX = this._resolveShaderCenterX(renderer);
    if (!this.isDead) {
      drawExBayerHalo(ctx, Math.round(this.x), Math.round(this.groundY - 4), 48, 14, '#fb923c', '#fef08a', 0.15);
    }
    this.drawRemoteSeals(ctx, renderer);
    this._exParticles?.renderBack(ctx);
    if (this.fx && !this.isDead) {
      this.fx.renderLayer(ctx, 'back', arenaCenterX, this.groundY, 0.96);
    }
    this.drawBlinkPortals(ctx, renderer);
    this.drawSolarEchoes(ctx);
    this.drawMageExVfxAnims(ctx, false, renderer);
  }

  drawUltimateForeground(ctx, renderer = null) {
    const arenaCenterX = this._resolveShaderCenterX(renderer);
    if (this.fx && !this.isDead) {
      this.fx.renderLayer(ctx, 'front', arenaCenterX, this.groundY, 0.98);
    }
    this.drawBlackSunEclipseOverlay(ctx, renderer);
    this.drawMageExVfxAnims(ctx, true, renderer);
    this._exParticles?.renderFront(ctx);
    this.drawTrueUltimateMeteor(ctx, renderer);
  }

  draw(ctx, isReflection = false, renderer = null) {
    const sprites = this.getExSprites();
    if (!sprites) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const w = 208;
    const h = 208;
    const groundPlantOffset = 4;
    ctx.translate(Math.round(this.x), Math.round(this.y + groundPlantOffset));
    ctx.scale(this.facing, 1);

    if (isReflection && !this.isDead) {
      const vfxSheet = PixelForge.ensureImage(sprites?.vfx);
      if (
        vfxSheet &&
        vfxSheet.complete &&
        vfxSheet.naturalWidth &&
        (this.state === 'SKILL' || this.state === 'ULTIMATE' || this.state === 'TRUE_ULTIMATE')
      ) {
        const col = Math.floor(this.runeOrbit * 9.5) % 30;
        const reflRow = this.state === 'ULTIMATE' ? 2 : 4;
        this._drawBloomedVfxCell(
          ctx,
          renderer,
          vfxSheet,
          col,
          reflRow,
          -92,
          -48,
          184,
          64,
          '#fb923c',
          0.58,
          true
        );
      }

      if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth && this.trueUltMeteor?.active) {
        const m = this.trueUltMeteor;
        const baseCol = Math.floor((this.stateTimer || 0) * 30) % 30;
        const ringScale = m.phase === 'descent' ? 0.94 + 0.36 * m.progress : Math.max(0.25, m.riftScale);
        const sealRelX = Math.round((m.targetX - this.x) * this.facing);
        const sealW = Math.round(418 * ringScale);
        const sealH = Math.round(120 * ringScale);

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.44 * Math.min(1, ringScale);
        ctx.drawImage(
          vfxSheet,
          ((baseCol + 9) % 30) * 208,
          832,
          208,
          208,
          Math.round(sealRelX - sealW * 0.5),
          Math.round(-sealH * 0.5 - 6),
          sealW,
          sealH
        );

        if (m.phase === 'descent') {
          const meteorScale = 2.26 + 1.16 * m.progress;
          const meteorSize = Math.round((208 * meteorScale) / 2) * 2;
          const drawOffX = Math.round((-meteorSize * ((104 + 18) / 208)) / 2) * 2;
          const drawOffY = Math.round((-meteorSize * ((104 + 27) / 208)) / 2) * 2;
          const meteorRelX = Math.round((m.x - this.x) * this.facing);
          const meteorRelY = Math.round(m.y - this.y - groundPlantOffset);
          ctx.save();
          ctx.translate(meteorRelX, meteorRelY);
          ctx.scale((m.dir || 1) * this.facing, 1);
          ctx.globalAlpha = 0.34 + 0.24 * m.progress;
          ctx.drawImage(
            vfxSheet,
            baseCol * 208,
            1248,
            208,
            208,
            drawOffX,
            drawOffY,
            meteorSize,
            meteorSize
          );
          ctx.restore();
        }
        ctx.restore();
      }
    }

    PixelForge.drawSheetFrame(ctx, sprites, this, w, h, this.runeOrbit, isReflection, renderer);

    ctx.restore();
  }
}
