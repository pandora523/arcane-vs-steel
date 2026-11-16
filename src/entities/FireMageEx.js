import { Fighter } from './Fighter.js?v=30fps115';
import { PixelForge } from '../engine/PixelForge.js?v=30fps115';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps115';
import { SOLAR_EFFECT_REGISTRY } from '../engine/shaders/solarShaders.js?v=30fps115';

const AUTO_SLICES_EX = [
  [60, 8], // Beat 1 (V0, 0.38s): Golden Solar Rune Magic Circle + Blazing Solar Fireball Comet -> snaps at F03 (63)
  [68, 7], // Beat 2 (V1, 0.36s): Twin Concentric Helios Sun-Sigils + Twin Converging Corona Bolts -> snaps at F09 (69)
  [75, 8], // Beat 3 (V2, 0.40s): Grand Archmage Invocation -> Remote Solar Prominence Pillar (2-Hit) -> snaps at F17 (77)
  [83, 7]  // Beat 4 (V3, 0.52s): -42px Arcane Backstep-Hover -> Triple Meteoric Fireball Barrage + Helios Sunburst (3-Hit) -> snaps at F25 (85)
];

const BEAT_DURATIONS = [0.38, 0.36, 0.40, 0.52];
const INTRA_COMBO_LINK = 0.015;

const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5]
];

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
    this.exParticles = [];
    this.hitStarbursts = [];
    this.remoteSeals = [];
    this.stepDustTimer = 0;

    this.fx = new ArcaneShaderFX(SOLAR_EFFECT_REGISTRY, {
      pixelScale: 3,
      viewW: 480,
      viewH: 340
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

  setState(newState) {
    const prevState = this.state;
    super.setState(newState);
    this._drewPalmFocus = false;

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
      this.isInvulnerable = true;
    } else if (this._eclipseVisual) {
      this._eclipseVisual.active = false;
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
      this.exParticles.length = 0;
      this.hitStarbursts.length = 0;
      this.remoteSeals.length = 0;
      if (this._eclipseVisual) this._eclipseVisual.active = false;
      if (this.trueUltMeteor) {
        this.trueUltMeteor.active = false;
        this.trueUltMeteor.phase = 'none';
      }
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
  // PIXEL-PURE NEXT-GEN PARTICLE, STAR-GLINT & BAYER HALO ENGINE (`alpha <= 0.20`)
  // ============================================================================
  spawnExParticle(opts) {
    if (!opts || !Number.isFinite(opts.x) || !Number.isFinite(opts.y)) return;
    if (this.exParticles.length >= 96) this.exParticles.shift();
    this.exParticles.push({
      x: opts.x,
      y: opts.y,
      vx: opts.vx || 0,
      vy: opts.vy || 0,
      gravity: opts.gravity ?? -28,
      drag: opts.drag ?? 0.96,
      shape: opts.shape || 'star4', // 'star4' | 'diamond' | 'ember' | 'rune' | 'ring'
      size: opts.size || 4,
      color: opts.color || '#fb923c',
      coreColor: opts.coreColor || '#fef08a',
      age: 0,
      maxLife: opts.maxLife || 0.38
    });
  }

  spawnSolarStarCluster(x, y, count = 6, speed = 135, isEclipse = false) {
    const shapes = ['star4', 'ember', 'diamond', 'rune'];
    for (let i = 0; i < count; i++) {
      const ang = (i / Math.max(1, count)) * Math.PI * 2 + ((i * 1.37) % 0.6);
      const spd = speed * (0.45 + ((i * 37) % 10) * 0.065);
      this.spawnExParticle({
        x: x + Math.cos(ang) * 8,
        y: y + Math.sin(ang) * 8,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 36,
        gravity: i % 2 === 0 ? -34 : 65,
        shape: shapes[i % shapes.length],
        size: i % 3 === 0 ? 6 : 4,
        color: isEclipse ? (i % 2 === 0 ? '#c026d3' : '#fb923c') : i % 2 === 0 ? '#fb923c' : '#dc2626',
        coreColor: '#fef08a',
        maxLife: 0.28 + (i % 3) * 0.08
      });
    }
  }

  spawnHitStarburst(x, y, primaryHex = '#fb923c', accentHex = '#fef08a', scale = 1.0) {
    if (this.hitStarbursts.length >= 14) this.hitStarbursts.shift();
    this.hitStarbursts.push({
      x: Math.round(x),
      y: Math.round(y),
      primaryHex,
      accentHex,
      scale,
      age: 0,
      maxLife: 0.18
    });
  }

  spawnRemoteSeal(x, groundY, radius = 64, maxLife = 0.56, isEclipse = false) {
    if (this.remoteSeals.length >= 12) this.remoteSeals.shift();
    this.remoteSeals.push({
      x: Math.round(x),
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
      slot = this.fx.spawn('heliosOrbitingSuns', this.x, this.y - 98, {
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
      this.fx.spawn('solarGlideTrail', this.x - this.facing * 12, this.y - 88, {
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
    const baseTargetX = enemy
      ? Math.max(135, Math.min(ww - 135, enemy.x))
      : Math.max(135, Math.min(ww - 135, this.x + this.facing * 360));

    if (!this.didSkillAura) {
      this.didSkillAura = true;
      this.heal(16, 'HELIOS AEGIS');
      game?.vfx?.spawnSpecialCastAura(this, this.skillName, 'SOLAR ARCHMAGE', 'arcane', false);
      this.fx?.spawn('heliosPalmFocus', this.x + this.facing * 28, this.y - 108, {
        follow: this,
        offsetX: 28,
        offsetY: -108,
        flip: this.facing < 0,
        light: 1.22
      });
      // Pre-inscribe the 3 Heliacal Rune Seals cleanly on the arena floor
      this._skillTrinitySeals = [
        Math.max(95, Math.min(ww - 95, baseTargetX - 96)),
        baseTargetX,
        Math.max(95, Math.min(ww - 95, baseTargetX + 96))
      ];
      for (let i = 0; i < this._skillTrinitySeals.length; i++) {
        this.spawnRemoteSeal(this._skillTrinitySeals[i], this.groundY, i === 1 ? 78 : 60, 0.88, false);
      }
    }

    if (t >= 0.26 && !this.didActionFrame) {
      this.didActionFrame = true;
      const centerSealX = this._skillTrinitySeals[1] || baseTargetX;
      if (game?.audio) game.audio.play('fireball', centerSealX);
      game?.renderer?.triggerShake?.(10, 0.22);

      const delays = [0.16, 0.04, 0.16];
      const widths = [0.84, 1.18, 0.84];
      for (let i = 0; i < this._skillTrinitySeals.length; i++) {
        const px = this._skillTrinitySeals[i];
        game?.vfx?.spawnFlamePillar(px, this.groundY, this, enemy, {
          theme: 'arcane',
          delay: delays[i],
          maxLife: i === 1 ? 1.42 : 1.22,
          scaleWidth: widths[i]
        });
        this.fx?.spawn('hellfireSolarPillar', px, this.groundY - 4, {
          light: i === 1 ? 1.32 : 1.18,
          extra: { scaleWidth: widths[i] }
        });
        this.spawnVfxAnim(1, px, this.groundY - 96, i === 1 ? 204 : 168, i === 1 ? 204 : 168, 0.42, {
          flipX: i === 0,
          inFront: true
        });
        this.spawnSolarStarCluster(px, this.groundY - 76, i === 1 ? 9 : 6, 150, false);
      }
      this.spawnVfxAnim(4, centerSealX, this.groundY - 124, 188, 188, 0.38, {
        flipX: false,
        inFront: true
      });
    } else if (t >= 0.56 && !this.didSecondaryAction) {
      this.didSecondaryAction = true;
      if (game?.audio) game.audio.play('fireball', this.x);

      const sx = this.x + this.facing * 64;
      const sy = this.y - 102;
      this.spawnVfxAnim(4, sx, sy, 164, 164, 0.28, {
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
   * Conjures a pixel-dithered Black-Sun Eclipse Ring high above the target, raining
   * 7 diagonal Solar Lances into a cascading 4x4 Bayer Supernova Shock-Ring!
   */
  updateUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    this.vx = 0;
    this.vy = 0;
    this.y = this.groundY;
    this.isInvulnerable = true;

    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const rawTarget = enemy ? enemy.x : this.x + this.facing * 360;
    const targetX = Math.max(180, Math.min(ww - 180, rawTarget));
    const eclipseX = Math.max(180, Math.min(ww - 180, this.x * 0.25 + targetX * 0.75));
    const eclipseY = this.groundY - 372;

    if (!this.spawnedEclipse) {
      this.spawnedEclipse = true;
      this._ultLanceStep = 0;
      this.heal(18, 'ECLIPSE CORONA');
      if (game?.audio) game.audio.play('eclipse_charge', eclipseX);
      game?.vfx?.spawnSpecialCastAura(this, this.ultName, 'NEO-VISION OVERDRIVE', 'arcane', true);

      this._eclipseVisual = {
        active: true,
        x: eclipseX,
        y: eclipseY,
        groundY: this.groundY,
        age: 0,
        maxLife: this.ultDuration
      };

      this.fx?.spawn('eclipseSupernovaDomain', targetX, this.groundY, {
        light: 1.32
      });
      this.fx?.spawn('arcaneBlinkRift', this.x, this.groundY, {
        light: 1.22,
        extra: { isArrival: false }
      });
      this.spawnRemoteSeal(targetX, this.groundY, 132, 1.45, true);
      this.spawnSolarStarCluster(eclipseX, eclipseY, 10, 160, true);
    }

    if (this._eclipseVisual?.active) {
      this._eclipseVisual.age = t;
      this._eclipseVisual.x = eclipseX;
      this._eclipseVisual.groundY = this.groundY;
    }

    // Gravitational Singularity Pull during Eclipse Rain (`0.00..0.92s`)
    if (t < 0.92 && enemy && !enemy.isDead && !enemy.isColossalBoss) {
      const pullDir = Math.sign(targetX - enemy.x);
      enemy.x += pullDir * 112 * dt;
    }

    // Rain 7 Diagonal Solar Lances from the Black-Sun Eclipse Ring!
    const lanceOffsets = [-156, -104, -52, 0, 52, 104, 156];
    const lanceTimes = [0.22, 0.30, 0.38, 0.46, 0.54, 0.62, 0.70];
    while (this._ultLanceStep < lanceTimes.length && t >= lanceTimes[this._ultLanceStep]) {
      const idx = this._ultLanceStep;
      this._ultLanceStep++;
      const destX = Math.max(95, Math.min(ww - 95, targetX + lanceOffsets[idx]));
      const dirX = destX - eclipseX;
      if (game?.audio && idx % 2 === 0) game.audio.play('fireball', destX);
      this.spawnRemoteSeal(destX, this.groundY, 44, 0.36, idx % 2 === 0);
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
    }

    // Supernova Shock-Ring Collapse (`t >= 0.96s`)
    if (t >= 0.96 && !this.didActionFrame) {
      this.didActionFrame = true;
      if (game?.audio) {
        game.audio.play('solar_beam', targetX);
        game.audio.play('supernova_detonate', targetX);
      }
      game?.renderer?.triggerShake?.(22, 0.52);
      game?.renderer?.triggerAberration?.(12);
      game?.renderer?.triggerHitStop?.(0.08);

      this.fx?.spawn('solarMeteorImpactBurst', targetX, this.groundY - 78, {
        light: 1.36,
        extra: { isMeteor: true }
      });
      this.spawnVfxAnim(2, targetX, this.groundY - 102, 232, 232, 0.46, {
        flipX: false,
        inFront: true
      });
      this.spawnSolarStarCluster(targetX, this.groundY - 92, 14, 195, true);

      [-118, 0, 118].forEach((off, idx) => {
        const px = Math.max(95, Math.min(ww - 95, targetX + off));
        game?.vfx?.spawnFlamePillar(px, this.groundY, this, enemy, {
          theme: 'arcane',
          delay: idx === 1 ? 0.02 : 0.10,
          maxLife: 1.05,
          scaleWidth: idx === 1 ? 1.12 : 0.78,
          isUltimate: true
        });
        this.fx?.spawn('hellfireSolarPillar', px, this.groundY - 4, {
          light: idx === 1 ? 1.34 : 1.20,
          extra: { scaleWidth: idx === 1 ? 1.12 : 0.78 }
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
      if (this._eclipseVisual) this._eclipseVisual.active = false;
      this.setState('IDLE');
    }
  }

  /**
   * NEWLY BORN SUPREME FINISHER (`CATACLYSM: GRAND HELIOS APOCALYPSE`, `5.20s`):
   * - Phase 1 (`0.00..1.55s`): Full-stage Golden Astrolabe Seal + Jagged Celestial Rift (`Row 5`)
   * - Phase 2 (`1.55..3.22s`): Colossal Dreadnought Sun-Meteor (`Row 6`) + 7 Comet Wake Plumes (`Row 7`)
   * - Phase 3 (`t >= 3.22s..5.20s`): Multi-stage pixel shockwaves + triggers `triggerInfernoStage()` strictly at `t >= 3.22s`!
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
      const targetX = Math.max(250, Math.min(ww - 250, rawTargetX));

      let meteorDir = targetX >= this.x ? 1 : -1;
      if (targetX - meteorDir * 310 < 150) meteorDir = -1;
      else if (targetX - meteorDir * 310 > ww - 150) meteorDir = 1;

      const startX = Math.max(145, Math.min(ww - 145, targetX - meteorDir * 315));
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

      this.fx?.spawn('astralBlackMageLeyLines', this.x, this.groundY, {
        light: 1.44
      });
      this.fx?.spawn('solarFlameWard', this.x, this.groundY - 92, {
        follow: this,
        offsetX: 0,
        offsetY: -92,
        light: 1.34
      });
      this.fx?.spawn('heliosPalmFocus', this.x + this.facing * 26, this.groundY - 126, {
        follow: this,
        offsetX: 26,
        offsetY: -126,
        flip: this.facing < 0,
        light: 1.32
      });
      this.fx?.spawn('eclipseSupernovaDomain', targetX, this.groundY, {
        light: 1.44
      });

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
    const targetX = m ? m.targetX : enemy ? enemy.x : ww * 0.5;

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
        const breachX = m ? m.startX : targetX;
        const breachY = m ? m.startY - 18 : this.groundY - 698;
        game?.vfx?.spawnLightning(breachX - 88, breachY + 14, this.groundY, '#fef08a', '#fb923c');
        game?.vfx?.spawnLightning(breachX + 88, breachY + 14, this.groundY, '#ffffff', '#ea580c');
        this.fx?.spawn('eclipseSupernovaDomain', targetX, this.groundY, {
          light: 1.48
        });
        this.fx?.spawn('magmaFissureCrack', this.x, this.groundY, {
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
            this.fx?.spawn('astralMeteorSlipstreamWake', m.x - m.dir * 18, m.y - 36, {
              light: 1.38,
              extra: { scale: 0.88 + u * 0.52 }
            });
          }

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
          game.renderer.triggerAberration?.(24);
          game.renderer.triggerHitStop?.(0.14);
        }
        if (game?.hudEls?.stageBadge) {
          game.hudEls.stageBadge.textContent = 'LAYWASTE OF INFERNO';
        }

        this.fx?.spawn('eclipseSupernovaDomain', targetX, this.groundY, {
          light: 1.65
        });
        this.spawnVfxAnim(2, targetX, this.groundY - 102, 264, 264, 0.62, {
          flipX: false,
          inFront: true
        });
        this.spawnVfxAnim(4, targetX, this.groundY - 98, 240, 240, 0.52, {
          flipX: false,
          inFront: true
        });

        [-190, 0, 190].forEach((off, idx) => {
          const bx = Math.max(120, Math.min(ww - 120, targetX + off));
          this.fx?.spawn('solarMeteorImpactBurst', bx, this.groundY - 78, {
            light: idx === 1 ? 1.52 : 1.32,
            extra: { isMeteor: true }
          });
          this.spawnSolarStarCluster(bx, this.groundY - 82, 10, 210, idx !== 1);
        });

        [-360, -240, -120, 0, 120, 240, 360].forEach((off, idx) => {
          const px = Math.max(95, Math.min(ww - 95, targetX + off));
          const isCenter = idx === 3;
          game?.vfx?.spawnFlamePillar(px, this.groundY, this, enemy, {
            theme: 'arcane',
            delay: Math.abs(idx - 3) * 0.06,
            maxLife: 1.75,
            scaleWidth: isCenter ? 1.38 : 0.95,
            isUltimate: true
          });
          this.fx?.spawn('hellfireSolarPillar', px, this.groundY - 4, {
            light: isCenter ? 1.45 : 1.24,
            extra: { scaleWidth: isCenter ? 1.38 : 0.95 }
          });
        });

        this.fx?.spawn('magmaFissureCrack', 140, this.groundY, {
          light: 1.38,
          extra: { spanX: ww - 280 }
        });

        game?.vfx?.spawnShockwave(targetX, this.groundY - 12, 480, '#fef08a', 0.85, true);
        game?.vfx?.spawnDecal?.(targetX, 280, 'fissure', '#fb923c', 12.0);

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

    for (let i = this.exParticles.length - 1; i >= 0; i--) {
      const p = this.exParticles[i];
      p.age += dt;
      if (p.age >= p.maxLife) {
        this.exParticles.splice(i, 1);
        continue;
      }
      if (p.shape !== 'ring') {
        p.vx *= p.drag;
        p.vy = p.vy * p.drag + p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
    }

    for (let i = this.hitStarbursts.length - 1; i >= 0; i--) {
      this.hitStarbursts[i].age += dt;
      if (this.hitStarbursts[i].age >= this.hitStarbursts[i].maxLife) {
        this.hitStarbursts.splice(i, 1);
      }
    }

    for (let i = this.remoteSeals.length - 1; i >= 0; i--) {
      this.remoteSeals[i].age += dt;
      if (this.remoteSeals[i].age >= this.remoteSeals[i].maxLife) {
        this.remoteSeals.splice(i, 1);
      }
    }
  }

  update(dt, enemy, game) {
    this._currentEnemy = enemy;
    this.runeOrbit += dt * 3.1;
    this.crouchCooldown = Math.max(0, this.crouchCooldown - dt);
    this.wallFlipCooldown = Math.max(0, this.wallFlipCooldown - dt);
    this.updateCustomVfx(dt);

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
          size: 4,
          color: '#fb923c',
          coreColor: '#fef08a',
          maxLife: 0.24
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
        sheet: mkImg('assets/sprites/mage_ex_sheet.png?v=30fps115'),
        vfx: mkImg('assets/sprites/mage_ex_vfx.png?v=30fps115'),
        portrait: mkImg('assets/sprites/mage_ex_portrait.png?v=30fps115'),
        cellW: 320,
        cellH: 240,
        anchorX: 112,
        anchorY: 230
      };
    }
    return assets.mage_ex;
  }

  // ============================================================================
  // PIXEL-PURE RENDERING (4x4 BAYER HALOS `alpha <= 0.20`, OCTAGRAM SEALS & PARTICLES)
  // ============================================================================
  drawBayerPixelHalo(ctx, cx, cy, rx, ry, outerHex = '#fb923c', coreHex = '#fef08a', alpha = 0.18) {
    if (rx < 6 || ry < 4 || alpha <= 0.01) return;
    const cappedAlpha = Math.min(0.20, alpha);
    const step = 4;
    const x0 = Math.floor((cx - rx) / step) * step;
    const x1 = Math.ceil((cx + rx) / step) * step;
    const y0 = Math.floor((cy - ry) / step) * step;
    const y1 = Math.ceil((cy + ry) / step) * step;

    ctx.save();
    ctx.globalAlpha = cappedAlpha;
    for (let py = y0; py <= y1; py += step) {
      const dy = (py - cy) / ry;
      if (Math.abs(dy) > 1) continue;
      const by = (py >>> 2) & 3;
      for (let px = x0; px <= x1; px += step) {
        const dx = (px - cx) / rx;
        const d2 = dx * dx + dy * dy;
        if (d2 > 1) continue;
        const falloff = 1 - Math.sqrt(d2);
        const thresh = BAYER_4X4[by][(px >>> 2) & 3] / 16.0;
        if (falloff * 1.15 > thresh) {
          ctx.fillStyle = falloff > 0.58 ? coreHex : outerHex;
          ctx.fillRect(px, py, step, step);
        }
      }
    }
    ctx.restore();
  }

  drawPixelOctagramRing(ctx, cx, cy, rx, ry, stepPx, color, alpha, rotRad = 0) {
    if (rx < 6 || ry < 3 || alpha <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.fillStyle = color;
    const s = Math.max(2, stepPx | 0);
    const pts = [];
    for (let i = 0; i < 8; i++) {
      const a = rotRad + (i * Math.PI) / 4;
      pts.push([Math.cos(a) * rx, Math.sin(a) * ry]);
    }
    for (let i = 0; i < 8; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[(i + 1) % 8];
      const segs = Math.max(3, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (s * 1.4)));
      for (let j = 0; j < segs; j++) {
        const u = j / segs;
        const px = Math.round((cx + x0 + (x1 - x0) * u) / s) * s;
        const py = Math.round((cy + y0 + (y1 - y0) * u) / s) * s;
        ctx.fillRect(px, py, s, s);
      }
    }
    // Inscribed star spokes
    for (let i = 0; i < 8; i += 2) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[(i + 3) % 8];
      const segs = Math.max(3, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (s * 2.0)));
      for (let j = 0; j <= segs; j++) {
        const u = j / segs;
        const px = Math.round((cx + x0 + (x1 - x0) * u) / s) * s;
        const py = Math.round((cy + y0 + (y1 - y0) * u) / s) * s;
        ctx.fillRect(px, py, s, s);
      }
    }
    ctx.restore();
  }

  drawRemoteSeals(ctx) {
    if (!this.remoteSeals.length) return;
    for (let i = 0; i < this.remoteSeals.length; i++) {
      const s = this.remoteSeals[i];
      const u = Math.min(1, s.age / Math.max(0.01, s.maxLife));
      const fade = Math.sin(u * Math.PI);
      const rx = s.radius * (0.72 + 0.34 * u);
      const ry = Math.max(8, rx * 0.24);
      const outer = s.isEclipse ? '#c026d3' : '#fb923c';
      const core = '#fef08a';
      this.drawBayerPixelHalo(ctx, s.x, s.groundY - 4, rx, ry * 1.35, outer, core, 0.16 * fade);
      this.drawPixelOctagramRing(
        ctx,
        s.x,
        s.groundY - 4,
        rx,
        ry,
        2,
        s.isEclipse ? '#e879f9' : '#fef08a',
        0.88 * fade,
        this.runeOrbit
      );
    }
  }

  drawExParticlesAndStarbursts(ctx) {
    if (!this.exParticles.length && !this.hitStarbursts.length) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    for (let i = 0; i < this.exParticles.length; i++) {
      const p = this.exParticles[i];
      const u = Math.min(1, p.age / Math.max(0.01, p.maxLife));
      const fade = 1 - u;
      const px = Math.round(p.x / 2) * 2;
      const py = Math.round(p.y / 2) * 2;
      ctx.globalAlpha = Math.min(1, fade * 0.94);

      if (p.shape === 'ring') {
        const rx = p.size * (0.45 + 0.75 * u);
        this.drawPixelOctagramRing(ctx, px, py, rx, rx * 0.65, 2, p.coreColor, fade * 0.78, u * 2.0);
        continue;
      }

      if (p.shape === 'star4') {
        const arm = Math.max(2, Math.round((p.size * (1 - u * 0.35)) / 2) * 2);
        ctx.fillStyle = p.color;
        ctx.fillRect(px - arm - 2, py - 1, (arm + 2) * 2, 2);
        ctx.fillRect(px - 1, py - arm - 2, 2, (arm + 2) * 2);
        ctx.fillStyle = p.coreColor;
        ctx.fillRect(px - arm, py - 1, arm * 2, 2);
        ctx.fillRect(px - 1, py - arm, 2, arm * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px - 1, py - 1, 2, 2);
      } else if (p.shape === 'diamond') {
        ctx.fillStyle = p.color;
        ctx.fillRect(px - 4, py - 2, 8, 4);
        ctx.fillRect(px - 2, py - 4, 4, 8);
        ctx.fillStyle = p.coreColor;
        ctx.fillRect(px - 2, py - 2, 4, 4);
      } else if (p.shape === 'rune') {
        ctx.fillStyle = p.coreColor;
        ctx.fillRect(px - 3, py - 3, 6, 2);
        ctx.fillRect(px - 3, py + 1, 6, 2);
        ctx.fillRect(px - 1, py - 3, 2, 6);
      } else {
        // Tapered rising solar ember
        ctx.fillStyle = p.color;
        ctx.fillRect(px - 2, py, 4, 4);
        ctx.fillStyle = p.coreColor;
        ctx.fillRect(px - 1, py - 2, 2, 4);
      }
    }

    // Crisp 4-frame asymmetric anime pixel hit-starbursts (0 overlapping-square chevrons!)
    for (let i = 0; i < this.hitStarbursts.length; i++) {
      const h = this.hitStarbursts[i];
      const u = Math.min(1, h.age / Math.max(0.01, h.maxLife));
      const fade = 1 - u;
      const reach = Math.round(28 * h.scale * (0.55 + 0.65 * u));
      const diag = Math.round(reach * 0.58);
      ctx.globalAlpha = Math.min(1, fade * 0.95);

      // Pass 1: outer accent rays
      ctx.fillStyle = h.primaryHex;
      ctx.fillRect(h.x - reach, h.y - 2, reach * 2, 4);
      ctx.fillRect(h.x - 2, h.y - reach, 4, reach * 2);
      for (let d = -diag; d <= diag; d += 4) {
        ctx.fillRect(h.x + d - 1, h.y + d - 1, 2, 2);
        ctx.fillRect(h.x + d - 1, h.y - d - 1, 2, 2);
      }
      // Pass 2: inner bright star-core
      const inner = Math.max(4, Math.round(reach * 0.62));
      ctx.fillStyle = h.accentHex;
      ctx.fillRect(h.x - inner, h.y - 1, inner * 2, 2);
      ctx.fillRect(h.x - 1, h.y - inner, 2, inner * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(h.x - 3, h.y - 3, 6, 6);
    }

    ctx.restore();
  }

  drawBlackSunEclipseOverlay(ctx) {
    const e = this._eclipseVisual;
    if (!e || !e.active) return;
    const u = Math.min(1, e.age / Math.max(0.01, e.maxLife));
    const fade = u < 0.14 ? u / 0.14 : u > 0.80 ? (1 - u) / 0.20 : 1.0;
    if (fade <= 0.02) return;

    const sprites = this.getExSprites();
    const vfxSheet = PixelForge.ensureImage(sprites?.vfx);
    const col = Math.floor(e.age * 30) % 30;
    const cx = Math.round(e.x);
    const cy = Math.round(e.y);

    this.drawBayerPixelHalo(ctx, cx, cy, 126 * fade, 118 * fade, '#c026d3', '#fb923c', 0.18 * fade);
    this.drawPixelOctagramRing(ctx, cx, cy, 98 * fade, 92 * fade, 2, '#fef08a', 0.82 * fade, e.age * 2.2);

    if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      const sz = Math.round(212 * (0.85 + 0.15 * fade));
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = Math.min(1, fade * 0.96);
      ctx.drawImage(vfxSheet, col * 208, 416, 208, 208, Math.round(cx - sz * 0.5), Math.round(cy - sz * 0.5), sz, sz);
      ctx.restore();
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

  drawBlinkPortals(ctx) {
    if (this.blinkPortalTimer <= 0) return;
    const sprites = this.getExSprites();
    const vfxSheet = PixelForge.ensureImage(sprites?.vfx);
    const fade = Math.min(1, this.blinkPortalTimer / 0.42);
    const col = Math.floor((0.56 - this.blinkPortalTimer) * 52) % 30;
    const portals = [this.blinkOriginX];
    if (this.didBlink || this.blinkPortalTimer < 0.44) {
      portals.push(this.blinkTargetX);
    }

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let idx = 0; idx < portals.length; idx++) {
      const px = Math.round(portals[idx]);
      const py = Math.round(this.groundY - 96);
      const size = Math.round(158 * (0.84 + 0.16 * fade));
      const half = Math.round(-size * 0.5);

      this.drawBayerPixelHalo(ctx, px, py, size * 0.48, size * 0.48, '#fb923c', '#fef08a', 0.16 * fade);
      if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
        ctx.save();
        ctx.translate(px, py);
        ctx.globalAlpha = fade * 0.92;
        ctx.drawImage(vfxSheet, col * 208, 832, 208, 208, half, half, size, size);
        ctx.restore();
      }
    }
    ctx.restore();
  }

  drawMageExVfxAnims(ctx, inFront = true) {
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

      this.drawBayerPixelHalo(ctx, px, py, halfW * 0.86, halfH * 0.86, '#fb923c', '#fef08a', 0.15 * fade);
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(v.flipX ? -1 : 1, 1);
      ctx.globalAlpha = Math.min(1, 0.34 + fade * 0.66);
      ctx.drawImage(vfxSheet, col * 208, v.row * 208, 208, 208, -halfW, -halfH, v.w, v.h);
      ctx.restore();
    }
    ctx.restore();
  }

  /**
   * Renders `CATACLYSM: GRAND HELIOS APOCALYPSE`:
   * Full-stage Golden Astrolabe Seal + Jagged Celestial Rift (`Row 5`) + 7 Comet Wake Plumes (`Row 7`) +
   * Colossal Dreadnought Sun-Meteor (`Row 6`) using pixel-pure Bayer halos (`alpha <= 0.20`, zero canvas rotation!).
   */
  drawTrueUltimateMeteor(ctx) {
    const m = this.trueUltMeteor;
    if (!m || !m.active) return;

    const sprites = this.getExSprites();
    const vfxSheet = PixelForge.ensureImage(sprites?.vfx);
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;

    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.001;
    const baseCol = Math.floor(now * 30) % 30;
    const revCol = (30 - baseCol) % 30;
    const meteorDir = m.dir || 1;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Full-Stage Golden Astrolabe Target Seal on the Sanctuary Floor
    const gx = Math.round(m.targetX);
    const gy = Math.round(this.groundY - 6);
    const ringScale = m.phase === 'descent' ? 0.94 + 0.36 * m.progress : Math.max(0.25, m.riftScale);
    const sealW = Math.round(480 * ringScale);
    const sealH = Math.round(136 * ringScale);

    this.drawBayerPixelHalo(ctx, gx, gy, sealW * 0.56, sealH * 0.58, '#ea580c', '#fef08a', 0.18 * Math.min(1, ringScale));
    this.drawPixelOctagramRing(ctx, gx, gy, sealW * 0.54, sealH * 0.44, 4, '#fef08a', 0.85 * Math.min(1, ringScale), this.runeOrbit * 0.4);

    ctx.save();
    ctx.translate(gx, gy);
    ctx.globalAlpha = 0.94 * Math.min(1, ringScale * 1.15);
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
    const innerW = Math.round(sealW * 0.72);
    const innerH = Math.round(sealH * 0.72);
    ctx.globalAlpha = 0.88 * Math.min(1, ringScale * 1.15);
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
    ctx.restore();

    // 2. Jagged High-Cosmos Celestial Rift Breach
    const rx = Math.round(m.startX);
    const ry = Math.round(m.startY - 18);
    const riftScale = Math.max(0.24, m.riftScale);
    const breachW = Math.round(620 * riftScale);
    const breachH = Math.round(256 * riftScale);

    this.drawBayerPixelHalo(ctx, rx, ry, breachW * 0.48, breachH * 0.48, '#c026d3', '#fb923c', 0.18 * riftScale);

    ctx.save();
    ctx.translate(rx, ry);
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
    const coreW = Math.round(330 * riftScale);
    const coreH = Math.round(182 * riftScale);
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

    // 3. 7 Enclosed Diagonal Comet Wake Plumes + Colossal Dreadnought Sun-Meteor
    const mx = Math.round(m.x);
    const my = Math.round(m.y);

    if (m.phase === 'descent') {
      const wakeNodes = 7;
      for (let i = wakeNodes - 1; i >= 0; i--) {
        const uNode = (i + 0.65) / (wakeNodes + 0.6);
        const wx = Math.round(mx + (rx - mx) * uNode);
        const wy = Math.round(my + (ry - my) * uNode);
        const wSize = Math.round((384 - uNode * 146) * (0.88 + 0.3 * m.progress));
        const wCol = (baseCol + i * 4) % 30;
        const wOffX = Math.round(-wSize * ((104 + 24) / 208));
        const wOffY = Math.round(-wSize * ((104 + 48) / 208));

        ctx.save();
        ctx.translate(wx, wy);
        ctx.scale(meteorDir, 1);
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = (1 - uNode * 0.62) * 0.92;
        ctx.drawImage(vfxSheet, wCol * 208, 1456, 208, 208, wOffX, wOffY, wSize, wSize);
        ctx.restore();
      }
    }

    const meteorScale =
      m.phase === 'rift' ? 0.82 + 0.66 * m.riftScale : 1.54 + 0.72 * m.progress;
    const meteorSize = Math.round(208 * meteorScale);
    const drawOffX = Math.round(-meteorSize * ((104 + 18) / 208));
    const drawOffY = Math.round(-meteorSize * ((104 + 27) / 208));

    this.drawBayerPixelHalo(ctx, mx, my, meteorSize * 0.44, meteorSize * 0.44, '#ea580c', '#fef08a', 0.20);

    ctx.save();
    ctx.translate(mx, my);
    ctx.scale(meteorDir, 1);
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = m.phase === 'rift' ? Math.min(1, m.riftScale * 1.25) : 1.0;
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

    ctx.restore();
  }

  drawForegroundOverlay(ctx, renderer = null) {
    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    if (!this.isDead) {
      this.drawBayerPixelHalo(ctx, Math.round(this.x), Math.round(this.groundY - 4), 46, 14, '#fb923c', '#fef08a', 0.14);
    }
    this.drawRemoteSeals(ctx);
    if (this.fx && !this.isDead) {
      this.fx.renderLayer(ctx, 'back', arenaCenterX, this.groundY, 0.96);
    }
    this.drawBlinkPortals(ctx);
    this.drawSolarEchoes(ctx);
    this.drawMageExVfxAnims(ctx, false);
  }

  drawUltimateForeground(ctx, renderer = null) {
    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    if (this.fx && !this.isDead) {
      this.fx.renderLayer(ctx, 'front', arenaCenterX, this.groundY, 0.98);
    }
    this.drawBlackSunEclipseOverlay(ctx);
    this.drawMageExVfxAnims(ctx, true);
    this.drawExParticlesAndStarbursts(ctx);
    this.drawTrueUltimateMeteor(ctx);
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

    PixelForge.drawSheetFrame(ctx, sprites, this, w, h, this.runeOrbit, isReflection, renderer);

    ctx.restore();
  }
}
