import { Fighter } from './Fighter.js?v=30fps114';
import { PixelForge } from '../engine/PixelForge.js?v=30fps114';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps114';
import { SOLAR_EFFECT_REGISTRY } from '../engine/shaders/solarShaders.js?v=30fps114';

const AUTO_SLICES_EX = [
  [60, 8], // Beat 1 (V0, 0.36s): Coiled Downward Helios Solar-Cleave + Blazing Fireball -> snaps at F03 (63)
  [68, 7], // Beat 2 (V1, 0.34s): Instant Reverse Rising Phoenix Uppercut + Twin Corona -> snaps at F09 (69)
  [75, 8], // Beat 3 (V2, 0.38s): 2.5D 360 Solar-Ring Vortex (2-Hit Scorch + Prominence Orb) -> snaps at F17/F18 (77/78)
  [83, 7]  // Beat 4 (V3, 0.52s): Airborne Helios Hop-Slam -> Meteoric Flame-Pillar (3-Hit + Explosive Fireball) -> snaps at F25 (85)
];

const BEAT_DURATIONS = [0.36, 0.34, 0.38, 0.52];
const INTRA_COMBO_LINK = 0.015;

/**
 * Ignis Sol EX (`mage_ex`) — Helios Spell-Blade & Solar Archmage.
 * Next-Gen Wide-Canvas (`320x240`, `anchorX=112, anchorY=230`, right-facing `+X` native)
 * FFBE / Last Cloudia Spell-Blade + Arcane Artillery Champion.
 * Coexists 100% independently alongside Legacy Ignis Sol (`mage`).
 */
export class FireMageEx extends Fighter {
  constructor(x, groundY, facing = 1) {
    const opts = typeof x === 'object' && x !== null ? x : { x, groundY, facing };
    super({
      ...opts,
      name: opts.name || 'Ignis Sol EX',
      maxHp: 3780,
      attackRange: 232,
      moveSpeed: 184,
      autoInterval: 0.98,
      lightColor: 'rgba(251, 146, 60, 1)',
      primaryColor: '#fb923c',
      hasTrueUltimate: true,
      trueUltName: 'CATACLYSM: LAYWASTE OF INFERNO',
      trueUltDuration: 5.20
    });

    this.heroId = 'mage_ex';
    this.theme = 'arcane';
    this.secondaryColor = '#fef08a';
    this.deathSfx = 'death_mage';
    this.hasPoise = true;

    this.autoDuration = BEAT_DURATIONS[0];
    this._postFlurryInterval = 1.48;

    this.skillName = 'TRIPLE SOLAR PILLAR';
    this.skillMaxCooldown = 4.20;
    this.skillCooldown = 1.10;
    this.skillDuration = 1.05;
    this.skillTriggerRange = 460;

    this.ultName = 'BLACK-SUN SUPERNOVA';
    this.ultSub = 'ECLIPSE SINGULARITY & METEOR RAIN';
    this.ultDuration = 1.62;

    this.trueUltName = 'CATACLYSM: LAYWASTE OF INFERNO';
    this.trueUltSub = 'SUPREME FINISHER - ASTRAL DREADNOUGHT METEOR';
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

    // 4-Beat FFBE / Last Cloudia Spell-Blade Combo State
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
    this._dragSparkAcc = 0;
    this._drewPalmFocus = false;

    // Skill / Overdrive / True Ultimate State
    this.didSkillAura = false;
    this.spawnedEclipse = false;
    this.didSupernovaFinisher = false;
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

    // Pixel-pure visual layers (zero canvas rotation, zero smooth ellipses)
    this._overrideFrameIdx = null;
    this.solarEchoes = [];
    this.afterimageAccum = 0;
    this.activeVfxAnims = [];
    this.razorScars = [];
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

  isHackAndSlashCaster() {
    return true;
  }

  hasHackAndSlashCombo() {
    return true;
  }

  getHackAndSlashLockRange() {
    return 510;
  }

  getAiStyleProfile() {
    return {
      archetype: 'SPELLBLADE_ARCHMAGE',
      preferredDist: 210,
      minSafeDist: 108,
      aggression: 0.84,
      dodgeRate: 0.72,
      skillBias: 0.86
    };
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
    }

    if (newState === 'ULTIMATE') {
      this.spawnedEclipse = false;
      this.didSupernovaFinisher = false;
      this.isInvulnerable = true;
    }

    if (newState === 'TRUE_ULTIMATE') {
      this._trueUltInit = false;
      this._trueUltStage = 0;
      this._trueUltTick = 0;
      this.isInvulnerable = true;
      this.unstoppablePoise = true;
    } else {
      this._trueUltInit = false;
      this.unstoppablePoise = false;
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
      this.razorScars.length = 0;
      if (this.trueUltMeteor) {
        this.trueUltMeteor.active = false;
        this.trueUltMeteor.phase = 'none';
      }
    }
  }

  /**
   * Initializes one beat (`0..3`) of Ignis Sol EX's 4-beat Spell-Blade + Arcane Artillery combo
   * without ever resetting to Row 0 IDLE.
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
    this._dragSparkAcc = 0;
    this._drewPalmFocus = false;
    this._comboPersistTimer = 0.76;
    this.unstoppablePoise = v >= 2;

    const startFrame = AUTO_SLICES_EX[v][0];
    this.trueUltFrameOverride = startFrame;
    this._overrideFrameIdx = startFrame;

    const enemy = this._currentEnemy || null;
    if (enemy && !enemy.isDead && !enemy.isDummyFocal) {
      this.facing = enemy.x >= this.x ? 1 : -1;
    }

    this._beatStartX = this.x;
    let desiredX = this.x + this.facing * (v === 0 ? 22 : v === 2 ? 20 : 14);

    if (enemy && !enemy.isDead) {
      const horizDist = Math.abs(enemy.x - this.x);
      if (horizDist <= 285) {
        const sweetDist = v === 2 ? 110 : 116;
        const idealStandX = enemy.x - this.facing * sweetDist;
        const rawDelta = (idealStandX - this.x) * this.facing;
        const maxForward = v === 0 ? 112 : v === 2 ? 48 : 34;
        const clampedForward = Math.max(0, Math.min(maxForward, rawDelta));
        desiredX = this.x + this.facing * clampedForward;
      } else {
        // Long-range Arcane Artillery cast-step into grounded snap plant
        const castStep = v === 0 ? 28 : v === 2 ? 24 : 16;
        desiredX = this.x + this.facing * castStep;
      }
    }

    this._beatTargetX = this._clampArenaX(desiredX, game);
  }

  queueNextComboBeat() {
    this._queuedNextBeat = true;
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
        light: 1.16,
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
        light: 1.18
      });
    }
  }

  spawnSolarEcho(
    frameIdx,
    alphaScale = 1.0,
    maxLife = 0.32,
    customX = null,
    customY = null,
    customFacing = null
  ) {
    if (this.solarEchoes.length >= 12) this.solarEchoes.shift();
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

  spawnVfxAnim(row, x, y, w = 188, h = 188, maxLife = 0.30, opts = {}) {
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

  _gatherMeleeTargets(primaryEnemy, game, reachFront = 216, reachBack = 42) {
    const targets = [];
    const seen = new Set();
    const isAdv = Boolean(game?.isAdventureMode?.() && game?.adventure?.active);
    const myGy = this.groundY || this.y;

    const consider = (foe) => {
      if (!foe || foe === this || foe.isDead || foe.isBenched || seen.has(foe)) return;
      const relX = (foe.x - this.x) * this.facing;
      const hitPad = foe.isColossalBoss ? 82 : 0;
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

  _resolveRangedTarget(primaryEnemy, game) {
    if (
      primaryEnemy &&
      !primaryEnemy.isDead &&
      !primaryEnemy.isBenched &&
      !primaryEnemy.isDummyFocal &&
      (primaryEnemy.x - this.x) * this.facing >= -32 &&
      Math.abs(primaryEnemy.x - this.x) <= 580
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
        if (rel >= -28 && d <= 580 && d < bestDist) {
          bestDist = d;
          best = f;
        }
      }
    }
    return best;
  }

  _applyHeliosGlaiveStrike(primaryEnemy, game, cfg) {
    const {
      damage = 24,
      reachFront = 216,
      reachBack = 38,
      hitStop = 0.044,
      shakeDur = 0.056,
      knockX = 28,
      knockY = 0,
      isCrit = false,
      scarDx = 104,
      scarDy = 82,
      isGold = false,
      sfx = 'slash'
    } = cfg;

    if (game?.audio) game.audio.play(sfx, this.x + this.facing * 72);
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
      const hitY = foe.y - (foe.isColossalBoss ? 128 : 92);
      this.spawnRazorScar(hitX, hitY, this.facing * scarDx, scarDy, 0.22, isGold);
      this.spawnVfxAnim(4, hitX, hitY, 184, 184, 0.24, {
        flipX: this.facing < 0,
        inFront: true
      });
      this.fx?.burst(hitX, hitY, {
        count: isCrit ? 10 : 7,
        speedMin: 48,
        speedMax: 170,
        lifeMin: 0.12,
        lifeMax: 0.26,
        gravity: 42,
        colors: ['#ffffff', '#fef08a', '#fb923c', '#dc2626']
      });
      landedAny = true;
    }

    if (hitStop > 0) {
      const selfStop = landedAny ? hitStop : Math.max(0.042, hitStop);
      this._hitStopTimer = Math.max(this._hitStopTimer || 0, selfStop);
      if (landedAny) {
        game?.renderer?.triggerHitStop?.(hitStop * 0.65);
      }
    }

    return landedAny;
  }

  onProjectileTrail(p) {
    if (!this.fx || !p || (p.type !== 'fireball' && p.type !== 'meteor')) return;
    p.ringTimer = (p.ringTimer || 0) + 0.016;
    if (p.ringTimer >= (p.isMeteor ? 0.038 : 0.052)) {
      p.ringTimer = 0;
      this.fx.burst(p.x - Math.sign(p.vx || 1) * 16, p.y, {
        count: p.isMeteor ? 5 : 3,
        speedMin: 24,
        speedMax: p.isMeteor ? 95 : 68,
        lifeMin: 0.16,
        lifeMax: 0.28,
        gravity: -16,
        spread: 1.15,
        angle: Math.atan2(-(p.vy || 0), -(p.vx || 1)),
        colors: ['#ffffff', '#fef08a', '#facc15', '#fb923c', '#ea580c']
      });
    }
  }

  onProjectileHit(p, _hitTarget, isCrit, game) {
    if (!this.fx) return false;
    const isMeteor = Boolean(p.isMeteor || p.type === 'meteor');
    this.fx.spawn('solarMeteorImpactBurst', p.x, p.y, {
      light: isMeteor || isCrit ? 1.38 : 1.22,
      extra: { isMeteor: isMeteor || isCrit }
    });
    this.fx.burst(p.x, p.y, {
      count: isMeteor ? 22 : isCrit ? 16 : 12,
      speedMin: 55,
      speedMax: isMeteor ? 235 : 180,
      lifeMin: 0.18,
      lifeMax: 0.38,
      gravity: 85,
      colors: ['#ffffff', '#fef08a', '#facc15', '#fb923c', '#dc2626']
    });
    if (game?.vfx) {
      game.vfx.spawnGlyphBurst(p.x, p.y, isMeteor ? 7 : 4, 'arcane');
    }
    return true;
  }

  /**
   * Passive Mobility: `ARCANE BLINK` Solar Rift Warp (Dash / Dodge) & `SOLAR VAULT` (Jump).
   */
  onStartDash(enemy, game, dir) {
    this.dashDuration = 0.38;
    this.dashDir = dir || this.facing;
    this.isBlinkTeleport = true;
    this.didBlink = false;
    this.blinkOriginX = this.x;
    this.blinkPortalTimer = 0.54;

    let desiredX = this.x + this.dashDir * 245;
    if (enemy && !enemy.isDead && this.dashDir === (enemy.x >= this.x ? 1 : -1)) {
      desiredX = enemy.x - this.dashDir * 116;
    }
    this.blinkTargetX = this._clampArenaX(desiredX, game);
    this.vx = 0;
    this.vy = 0;

    if (game?.audio) game.audio.play('blink', this.x);
    this.spawnSolarEcho(PixelForge.getFrameIndex(this, this.runeOrbit), 0.92, 0.36);
    this.fx?.spawn('arcaneBlinkRift', this.x, this.groundY, {
      light: 1.28,
      extra: { isArrival: false }
    });
    game?.vfx?.spawnGlyphBurst(this.x, this.y - 84, 6, 'arcane');
  }

  onStartDodge(enemy, game, dir) {
    const retreatDir = dir || -this.facing;
    this.dashDuration = 0.42;
    this.dashDir = retreatDir;
    this.isBlinkTeleport = true;
    this.isInvulnerable = true;
    this.didBlink = false;
    this.blinkOriginX = this.x;
    this.blinkPortalTimer = 0.56;

    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    let targetX = this.x + retreatDir * 285;
    if (targetX < 130 || targetX > ww - 130) {
      targetX = this.x - retreatDir * 285;
    }
    this.blinkTargetX = this._clampArenaX(targetX, game);
    this.vx = 0;
    this.vy = 0;

    if (game?.audio) game.audio.play('blink', this.x);
    this.spawnSolarEcho(PixelForge.getFrameIndex(this, this.runeOrbit), 0.94, 0.38);
    this.fx?.spawn('arcaneBlinkRift', this.x, this.groundY, {
      light: 1.30,
      extra: { isArrival: false }
    });
    game?.vfx?.spawnDamageText(this.x, this.y - 132, 0, false, 'ARCANE BLINK!', '#fef08a');
  }

  updateDash(dt, enemy, game) {
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
        this.spawnSolarEcho(194, 0.92, 0.34, this.x, this.y, this.facing);
        this.fx?.spawn('arcaneBlinkRift', this.x, this.groundY, {
          light: 1.34,
          extra: { isArrival: true }
        });
        game?.vfx?.spawnShockwave(this.x, this.groundY - 6, 78, '#fb923c', 0.24, false, true);
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
    let dir = customDir !== null ? customDir : this.facing;
    if (this.x < 165) dir = 1;
    else if (this.x > ww - 165) dir = -1;

    let desiredX = this.x + dir * 240;
    if (enemy && !enemy.isDead && dir === (enemy.x >= this.x ? 1 : -1) && Math.abs(enemy.x - this.x) < 360) {
      desiredX = enemy.x - dir * 118;
    }
    this.flipTargetX = this._clampArenaX(desiredX, game);
    this.dashDuration = 0.56;
    this.vx = 0;
    this.vy = 0;

    this.spawnSolarEcho(242, 0.86, 0.34);
    this.ensureSolarGlideTrail();
    this.fx?.spawn('arcaneBlinkRift', this.x, this.groundY, {
      light: 1.20,
      extra: { isArrival: false }
    });
    if (game?.audio) game.audio.play('blink', this.x);
    game?.vfx?.spawnGlyphBurst(this.x, this.y - 68, 6, 'arcane');
  }

  updateJump(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.dashDuration || 0.56;
    const u = Math.min(1, Math.max(0, t / dur));

    this.x = this.flipStartX + (this.flipTargetX - this.flipStartX) * (1 - Math.pow(1 - u, 1.8));
    this.y = this.groundY - Math.sin(u * Math.PI) * 116;
    this.isInvulnerable = u < 0.68;

    this.afterimageAccum += dt;
    if (this.afterimageAccum >= 0.055 && u < 0.84) {
      this.afterimageAccum = 0;
      this.spawnSolarEcho(240 + Math.min(28, Math.floor(u * 30)), 0.78, 0.24);
    }

    if (!this.didSecondaryAction && u >= 0.52) {
      this.didSecondaryAction = true;
      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }
      const spawnX = this.x + this.facing * 56;
      const spawnY = this.y - 72;
      if (game?.audio) game.audio.play('fireball', spawnX);
      this.spawnVfxAnim(4, spawnX, spawnY, 178, 178, 0.24, {
        flipX: this.facing < 0,
        inFront: true
      });
      if (game?.vfx) {
        const aimFoe = this._resolveRangedTarget(enemy, game);
        const tx = aimFoe ? aimFoe.x : spawnX + this.facing * 360;
        const ty = aimFoe ? aimFoe.y - 92 : this.groundY - 82;
        const dx = tx - spawnX;
        const dy = ty - spawnY;
        const len = Math.hypot(dx, dy) || 1;
        game.vfx.spawnProjectile({
          x: spawnX,
          y: spawnY,
          vx: (dx / len) * 690,
          vy: (dy / len) * 690,
          radius: 15,
          color: '#fb923c',
          coreColor: '#fef08a',
          owner: this,
          damage: 38,
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
      game?.vfx?.spawnShockwave(this.x, this.groundY - 4, 66, '#fb923c', 0.22, false, true);
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
    this.fx?.spawn('solarFlameWard', this.x, this.groundY - 92, {
      follow: this,
      offsetX: 0,
      offsetY: -92,
      light: 1.32
    });
    game?.vfx?.spawnGlyphBurst(this.x, this.y - 88, 6, 'arcane');
  }

  updateCrouch(_dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.crouchDuration || 0.94;
    this.vx = 0;
    this.y = this.groundY;
    this.isCrouching = true;
    this.isDeflecting = t < 0.56;

    // Reflect incoming projectiles off the blazing Helios Solar Astrolabe Ward
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
          this.fx?.burst(proj.x, proj.y, {
            count: 8,
            speedMin: 55,
            speedMax: 165,
            lifeMin: 0.14,
            lifeMax: 0.28,
            gravity: 25,
            colors: ['#ffffff', '#fef08a', '#fb923c']
          });
        }
      }
    }

    if (!this.didSecondaryAction && t >= 0.48) {
      this.didSecondaryAction = true;
      this.isDeflecting = false;
      const spawnX = this.x + this.facing * 68;
      const spawnY = this.y - 92;
      if (game?.audio) game.audio.play('fireball', spawnX);

      this._applyHeliosGlaiveStrike(enemy, game, {
        damage: 36,
        reachFront: 218,
        hitStop: 0.044,
        shakeDur: 0.058,
        knockX: 88,
        knockY: -55,
        isCrit: true,
        scarDx: 112,
        scarDy: -64,
        isGold: true,
        sfx: 'heavy_cleave'
      });

      const aimFoe = this._resolveRangedTarget(enemy, game);
      const tx = aimFoe ? aimFoe.x : spawnX + this.facing * 420;
      const ty = aimFoe ? aimFoe.y - 96 : spawnY;
      const dx = tx - spawnX;
      const dy = ty - spawnY;
      const len = Math.hypot(dx, dy) || 1;
      this.fx?.spawn('solarFireballMachCone', spawnX, spawnY, {
        flip: this.facing < 0,
        light: 1.28,
        extra: { aimAngle: Math.atan2(dy, Math.abs(dx)), isTwin: false }
      });
      game?.vfx?.spawnProjectile({
        x: spawnX,
        y: spawnY,
        vx: (dx / len) * 710,
        vy: (dy / len) * 710,
        radius: 16,
        color: '#fb923c',
        coreColor: '#fef08a',
        owner: this,
        damage: 48,
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
   * True FFBE Spell-Blade + Arcane Artillery Hybrid!
   * - `V0 (F03)`: 1-frame snap downward solar-flame serrated crescent smear + blazing solar slash/fireball (`44ms` hit-stop)
   * - `V1 (F09)`: Instant reverse rising Phoenix uppercut flame-smear + twin converging fireballs (`44ms` hit-stop)
   * - `V2 (F17)`: 2.5D foreshortened 360 solar-ring vortex smear (`2-hit` scorch + prominence orb)
   * - `V3 (F25)`: Airborne Helios hop-slam (`F23..F24` lift -> grounded `vx = 0` snap plant at `F25`) meteoric flame-pillar (`3-hit` + explosive `'fireball'` burst, `58ms` hit-stop)
   */
  updateAutoAttack(dt, enemy, game) {
    this._currentEnemy = enemy;
    this._comboPersistTimer = 0.76;

    // 0.015s Zero-Idle Intra-Combo Link: holds beat end-pose frame with zero return to IDLE
    if (this._intraLinkTimer > 0) {
      this._intraLinkTimer = Math.max(0, this._intraLinkTimer - dt);
      this.vx = 0;
      this.vy = 0;
      if (this._intraLinkTimer <= 0) {
        this._beginComboBeat(this.comboStep, game);
        this._aiComboCount = (this._aiComboCount || 0) + 1;
        this._aiComboChainTimer = 0.94;
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

    // 1. Pre-Snap Spell-Step -> Hard-Locked Grounded Boots (`vx = 0`) right on the 1-frame smear snap!
    this.vx = 0;
    if (t < snapT) {
      const lungeU = Math.min(1, Math.max(0, t / snapT));
      const eased = 1 - Math.pow(1 - lungeU, 2.2);
      this.x = this._beatStartX + (this._beatTargetX - this._beatStartX) * eased;

      if (!this._drewPalmFocus) {
        this._drewPalmFocus = true;
        this.fx?.spawn('heliosPalmFocus', this.x + this.facing * 32, this.y - 108, {
          follow: this,
          offsetX: 32,
          offsetY: -108,
          flip: this.facing < 0,
          light: v === 3 ? 1.28 : 1.18
        });
      }

      if (v === 0 && Math.abs(this._beatTargetX - this._beatStartX) > 26) {
        this._dragSparkAcc += dt;
        if (this._dragSparkAcc >= 0.032) {
          this._dragSparkAcc = 0;
          this.spawnSolarEcho(frameIdx, 0.72, 0.18);
          this.fx?.burst(this.x - this.facing * 34, this.groundY - 2, {
            count: 4,
            speedMin: 34,
            speedMax: 95,
            lifeMin: 0.10,
            lifeMax: 0.22,
            gravity: 75,
            colors: ['#ffffff', '#fef08a', '#fb923c', '#dc2626']
          });
        }
      }
    } else if (!this._bootsPlanted) {
      this._bootsPlanted = true;
      this.x = this._beatTargetX;
      this.vx = 0;
    }

    // Beat 4 (V3) Airborne Helios Hop-Slam: lifts on F23..F24 (`t < 0.16s`), snaps grounded (`y = groundY, vx = 0`) at F25!
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

    const spawnX = this.x + this.facing * 68;
    const spawnY = this.groundY - 94;
    const aimFoe = this._resolveRangedTarget(enemy, game);
    const targetY = aimFoe ? aimFoe.y - 96 : spawnY;
    const dx = aimFoe ? aimFoe.x - spawnX : this.facing * 460;
    const dy = targetY - spawnY;
    const dist = Math.hypot(dx, dy) || 1;
    const aimAng = Math.atan2(dy, Math.abs(dx));

    // 2. Beat-Specific Serrated Solar Smear Impacts + Blazing Fireball Artillery
    if (v === 0) {
      if ((this._beatHitMask & 1) === 0 && t >= 0.10) {
        this._beatHitMask |= 1;
        this.castCombo++;
        if (game?.audio) game.audio.play('fireball', spawnX);
        game?.vfx?.spawnShockwave(this.x + this.facing * 44, this.groundY - 4, 58, '#fb923c', 0.20, false, true);
        this.spawnVfxAnim(4, spawnX, spawnY, 178, 178, 0.24, {
          flipX: this.facing < 0,
          inFront: true
        });
        this.fx?.spawn('solarFireballMachCone', spawnX, spawnY, {
          flip: this.facing < 0,
          light: 1.22,
          extra: { aimAngle: aimAng, isTwin: false }
        });
        this._applyHeliosGlaiveStrike(enemy, game, {
          damage: 24,
          reachFront: 218,
          hitStop: 0.044,
          shakeDur: 0.056,
          knockX: 24,
          knockY: 0,
          scarDx: 112,
          scarDy: 86,
          isGold: false,
          sfx: 'slash'
        });
        game?.vfx?.spawnProjectile({
          x: spawnX,
          y: spawnY,
          vx: (dx / dist) * 695,
          vy: (dy / dist) * 695,
          radius: 15,
          color: '#fb923c',
          coreColor: '#fef08a',
          owner: this,
          damage: 36,
          type: 'fireball',
          isMeteor: false
        });
      }
    } else if (v === 1) {
      if ((this._beatHitMask & 1) === 0 && t >= 0.06) {
        this._beatHitMask |= 1;
        this.castCombo++;
        if (game?.audio) game.audio.play('fireball', spawnX);
        game?.vfx?.spawnShockwave(spawnX, this.groundY - 8, 68, '#fef08a', 0.22, false, true);
        this.spawnVfxAnim(4, spawnX, spawnY - 8, 182, 182, 0.24, {
          flipX: this.facing > 0,
          inFront: true
        });
        this.fx?.spawn('solarFireballMachCone', spawnX, spawnY, {
          flip: this.facing < 0,
          light: 1.25,
          extra: { aimAngle: aimAng, isTwin: true }
        });
        this._applyHeliosGlaiveStrike(enemy, game, {
          damage: 24,
          reachFront: 220,
          hitStop: 0.044,
          shakeDur: 0.058,
          knockX: 20,
          knockY: -128,
          scarDx: 108,
          scarDy: -94,
          isGold: true,
          sfx: 'slash'
        });
        if (game?.vfx) {
          const speed = 680;
          game.vfx.spawnProjectile({
            x: spawnX,
            y: spawnY - 10,
            vx: (dx / dist) * speed,
            vy: (dy / dist) * speed - 26,
            radius: 14,
            color: '#fb923c',
            coreColor: '#fef08a',
            owner: this,
            damage: 22,
            type: 'fireball',
            isMeteor: false
          });
          game.vfx.spawnProjectile({
            x: spawnX - this.facing * 14,
            y: spawnY + 10,
            vx: (dx / dist) * speed,
            vy: (dy / dist) * speed + 26,
            radius: 13,
            color: '#ea580c',
            coreColor: '#fef08a',
            owner: this,
            damage: 20,
            type: 'fireball',
            isMeteor: false
          });
        }
      }
    } else if (v === 2) {
      // Beat 3 (V2): 2.5D Foreshortened 360 Solar-Ring Vortex -> 2-Hit Scorch + Prominence Fireball!
      if ((this._beatHitMask & 1) === 0 && t >= 0.08) {
        this._beatHitMask |= 1;
        this.spawnVfxAnim(2, this.x + this.facing * 42, this.groundY - 84, 186, 186, 0.28, {
          flipX: this.facing < 0,
          inFront: true
        });
        this._applyHeliosGlaiveStrike(enemy, game, {
          damage: 18,
          reachFront: 220,
          reachBack: 64,
          hitStop: 0.042,
          shakeDur: 0.048,
          knockX: 14,
          knockY: -22,
          scarDx: 118,
          scarDy: 32,
          isGold: false,
          sfx: 'slash'
        });
      }
      if ((this._beatHitMask & 2) === 0 && t >= 0.14) {
        this._beatHitMask |= 2;
        this.castCombo++;
        if (game?.audio) game.audio.play('fireball', spawnX);
        this.fx?.spawn('solarFireballMachCone', spawnX, spawnY, {
          flip: this.facing < 0,
          light: 1.28,
          extra: { aimAngle: aimAng, isTwin: false }
        });
        this._applyHeliosGlaiveStrike(enemy, game, {
          damage: 20,
          reachFront: 222,
          reachBack: 64,
          hitStop: 0.044,
          shakeDur: 0.054,
          knockX: 18,
          knockY: -36,
          scarDx: 118,
          scarDy: -38,
          isGold: true,
          sfx: 'clang'
        });
        game?.vfx?.spawnProjectile({
          x: spawnX,
          y: spawnY,
          vx: (dx / dist) * 670,
          vy: (dy / dist) * 670,
          radius: 19,
          color: '#ea580c',
          coreColor: '#fde047',
          owner: this,
          damage: 38,
          type: 'fireball',
          isMeteor: false
        });
      }
    } else {
      // Beat 4 (V3): Airborne Helios Hop-Slam -> Grounded Plant (`vx = 0`) 3-Hit Meteoric Flame-Pillar + Explosive Fireball Burst!
      if ((this._beatHitMask & 1) === 0 && t >= 0.16) {
        this._beatHitMask |= 1;
        this.castCombo++;
        this.y = this.groundY;
        this.vx = 0;
        const slamX = this.x + this.facing * 84;
        if (game?.audio) {
          game.audio.play('fireball', slamX);
          game.audio.play('heavy_cleave', slamX);
        }
        game?.renderer?.triggerShake?.(13, 0.26);
        game?.vfx?.spawnShockwave(slamX, this.groundY - 4, 102, '#fb923c', 0.28, false, true);
        game?.vfx?.spawnFlamePillar(slamX, this.groundY, this, enemy, {
          theme: 'arcane',
          delay: 0.02,
          maxLife: 0.88,
          scaleWidth: 0.92
        });
        this.fx?.spawn('hellfireSolarPillar', slamX, this.groundY - 4, {
          light: 1.34,
          extra: { scaleWidth: 0.92 }
        });
        this.spawnVfxAnim(0, slamX, this.groundY - 84, 196, 196, 0.32, {
          flipX: this.facing < 0,
          inFront: true
        });
        this._applyHeliosGlaiveStrike(enemy, game, {
          damage: 22,
          reachFront: 228,
          hitStop: 0.058,
          shakeDur: 0.082,
          knockX: 34,
          knockY: -45,
          isCrit: true,
          scarDx: 26,
          scarDy: 140,
          isGold: true,
          sfx: 'heavy_cleave'
        });
        if (game?.vfx) {
          const speed = 690;
          game.vfx.spawnProjectile({
            x: slamX,
            y: this.groundY - 82,
            vx: (dx / dist) * speed,
            vy: (dy / dist) * speed,
            radius: 17,
            color: '#dc2626',
            coreColor: '#fde047',
            owner: this,
            damage: 38,
            type: 'fireball',
            isMeteor: false
          });
          game.vfx.spawnProjectile({
            x: slamX - this.facing * 18,
            y: this.groundY - 96,
            vx: (dx / dist) * (speed * 0.94),
            vy: (dy / dist) * (speed * 0.94) - 20,
            radius: 13,
            color: '#fb923c',
            coreColor: '#fef08a',
            owner: this,
            damage: 22,
            type: 'fireball',
            isMeteor: false
          });
          game.vfx.spawnGlyphBurst(slamX, this.groundY - 76, 6, 'arcane');
        }
      }
      if ((this._beatHitMask & 2) === 0 && t >= 0.21) {
        this._beatHitMask |= 2;
        this._applyHeliosGlaiveStrike(enemy, game, {
          damage: 15,
          reachFront: 230,
          hitStop: 0,
          shakeDur: 0.045,
          knockX: 26,
          knockY: -34,
          scarDx: 96,
          scarDy: 82,
          isGold: false,
          sfx: 'clang'
        });
      }
      if ((this._beatHitMask & 4) === 0 && t >= 0.26) {
        this._beatHitMask |= 4;
        this._applyHeliosGlaiveStrike(enemy, game, {
          damage: 20,
          reachFront: 232,
          hitStop: 0,
          shakeDur: 0.055,
          knockX: 88,
          knockY: -82,
          isCrit: true,
          scarDx: 102,
          scarDy: -86,
          isGold: true,
          sfx: 'slash'
        });
      }
    }

    // 3. Direct Zero-Idle Beat Chaining (`0.015s` link, never touches Row 0 IDLE mid-string)
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
        Math.abs(enemy.x - this.x) <= 480;

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
   * SPECIAL SKILL (`TRIPLE SOLAR PILLAR`, Row 3 `90..119`):
   * Grounded Helios Sun-Glaive fissure slam + 3 staggered Hellfire Solar Pillars + Twin Solar Fireballs!
   */
  updateSkill(_dt, enemy, game) {
    const t = this.stateTimer;
    this.vy = 0;
    this.y = this.groundY;

    if (!this.didSkillAura) {
      this.didSkillAura = true;
      this.vx = 0;
      this.heal(14, 'SOLAR WARD');
      game?.vfx?.spawnSpecialCastAura(this, this.skillName, 'SOLAR ARCHMAGE', 'arcane', false);
      this.fx?.spawn('heliosPalmFocus', this.x + this.facing * 28, this.y - 108, {
        follow: this,
        offsetX: 28,
        offsetY: -108,
        flip: this.facing < 0,
        light: 1.28
      });
    }

    if (t >= 0.26 && !this.didActionFrame) {
      this.didActionFrame = true;
      const ww = game?.renderer ? game.renderer.worldWidth : 1200;
      const targetX = enemy
        ? Math.max(120, Math.min(ww - 120, enemy.x))
        : Math.max(120, Math.min(ww - 120, this.x + this.facing * 320));
      if (game?.audio) game.audio.play('fireball', targetX);
      game?.renderer?.triggerShake?.(9, 0.20);

      const slamX = this.x + this.facing * 28;
      this.fx?.spawn('magmaFissureCrack', slamX, this.groundY, {
        light: 1.28,
        extra: { spanX: targetX - slamX }
      });
      game?.vfx?.spawnGlyphBurst(slamX, this.groundY - 24, 6, 'arcane');

      const pillars = [
        { x: targetX, delay: 0.14, maxLife: 1.45, scaleWidth: 1.15 },
        { x: Math.max(90, Math.min(ww - 90, targetX - 95)), delay: 0.24, maxLife: 1.25, scaleWidth: 0.78 },
        { x: Math.max(90, Math.min(ww - 90, targetX + 95)), delay: 0.24, maxLife: 1.25, scaleWidth: 0.78 }
      ];
      for (const pl of pillars) {
        game?.vfx?.spawnFlamePillar(pl.x, this.groundY, this, enemy, {
          theme: 'arcane',
          delay: pl.delay,
          maxLife: pl.maxLife,
          scaleWidth: pl.scaleWidth
        });
        this.fx?.spawn('hellfireSolarPillar', pl.x, this.groundY - 4, {
          light: pl.scaleWidth > 1 ? 1.38 : 1.24,
          extra: { scaleWidth: pl.scaleWidth }
        });
      }
    } else if (t >= 0.56 && !this.didSecondaryAction) {
      this.didSecondaryAction = true;
      this.vx = 0;
      if (game?.audio) game.audio.play('fireball', this.x);

      const sx = this.x + this.facing * 56;
      const sy = this.y - 104;
      this.spawnVfxAnim(4, sx, sy, 184, 184, 0.26, {
        flipX: this.facing < 0,
        inFront: true
      });
      this.fx?.spawn('solarFireballMachCone', sx, sy, {
        flip: this.facing < 0,
        light: 1.32,
        extra: { aimAngle: 0, isTwin: true }
      });

      const dx = enemy ? enemy.x - sx : this.facing * 420;
      const dy = enemy ? enemy.y - 102 - sy : 0;
      const dist = Math.hypot(dx, dy) || 1;
      for (const vyOff of [-36, 36]) {
        game?.vfx?.spawnProjectile({
          x: sx,
          y: sy,
          vx: (dx / dist) * 645,
          vy: (dy / dist) * 645 + vyOff,
          radius: 14,
          color: '#fb923c',
          coreColor: '#fef08a',
          owner: this,
          damage: 58,
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
   * OVERDRIVE (`BLACK-SUN SUPERNOVA`, Row 4 `120..149`):
   * Gravitational Black-Sun Eclipse Singularity -> Solar Beam + 5-Meteor Fan + Triple Hellfire Detonation!
   */
  updateUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    this.vx = 0;
    this.vy = 0;
    this.y = this.groundY;
    this.isInvulnerable = true;

    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const targetX = enemy ? enemy.x : ww * 0.5;
    const eclipseX = enemy ? this.x * 0.3 + enemy.x * 0.7 : ww * 0.5;
    const eclipseY = 148;

    if (t < 0.55) {
      this.runeOrbit += dt * 8.5;
      this.didSupernovaFinisher = false;

      if (!this.spawnedEclipse) {
        this.spawnedEclipse = true;
        this.heal(18, 'SOLAR CORONA');
        if (game?.audio) game.audio.play('eclipse_charge', eclipseX);
        game?.vfx?.spawnSpecialCastAura(this, this.ultName, 'BLACK-SUN SUPERNOVA', 'arcane', true);

        game?.vfx?.spawnEclipseSupernova({
          x: eclipseX,
          y: eclipseY,
          groundY: this.groundY,
          maxRadius: 112,
          color: '#fb923c',
          coreColor: '#fef08a',
          maxLife: 1.55
        });

        this.fx?.spawn('eclipseSupernovaDomain', targetX, this.groundY, {
          light: 1.42
        });
        this.fx?.spawn('arcaneBlinkRift', this.x, this.groundY, {
          light: 1.28,
          extra: { isArrival: false }
        });

        if (enemy && !enemy.isDead) {
          enemy.takeDamage(44, this, false, 20, 0);
        }
      }

      if (enemy && !enemy.isDead) {
        const pullDir = Math.sign(eclipseX - enemy.x);
        enemy.x += pullDir * 105 * dt;
      }
    } else if (!this.didActionFrame) {
      this.didActionFrame = true;
      this.spawnedEclipse = false;
      if (game?.audio) game.audio.play('solar_beam', targetX);

      game?.renderer?.triggerShake?.(24, 0.60);
      game?.renderer?.triggerAberration?.(14);
      game?.renderer?.triggerHitStop?.(0.085);

      game?.vfx?.spawnBeam({
        x1: eclipseX,
        y1: eclipseY,
        x2: targetX,
        y2: this.groundY - 24,
        width: 84,
        color: '#fb923c',
        coreColor: '#fef08a',
        maxLife: 0.68
      });

      this.fx?.spawn('solarMeteorImpactBurst', targetX, this.groundY - 78, {
        light: 1.42,
        extra: { isMeteor: true }
      });

      if (enemy && !enemy.isDead) {
        enemy.takeDamage(165, this, true, 160, -220);
      }

      [-150, -75, 0, 75, 150].forEach((off, idx) => {
        const destX = targetX + off;
        const dx = destX - eclipseX;
        const dy = this.groundY - eclipseY;
        const len = Math.hypot(dx, dy) || 1;
        const speed = 860 - Math.abs(idx - 2) * 40;

        game?.vfx?.spawnProjectile({
          x: eclipseX + off * 0.22,
          y: eclipseY,
          vx: (dx / len) * speed,
          vy: (dy / len) * speed,
          radius: idx === 2 ? 46 : 32,
          color: '#ea580c',
          coreColor: '#fef08a',
          owner: this,
          damage: idx === 2 ? 74 : 40,
          type: 'meteor',
          isMeteor: true
        });
      });

      game?.vfx?.spawnGlyphBurst(this.x, this.y - 108, 10, 'arcane');
    } else if (t >= 1.02 && !this.didSupernovaFinisher) {
      this.didSupernovaFinisher = true;
      if (game?.audio) game.audio.play('supernova_detonate', targetX);
      [-115, 0, 115].forEach((off, idx) => {
        const px = Math.max(90, Math.min(ww - 90, targetX + off));
        game?.vfx?.spawnFlamePillar(px, this.groundY, this, enemy, {
          theme: 'arcane',
          delay: idx === 1 ? 0.04 : 0.14,
          maxLife: 1.05,
          scaleWidth: idx === 1 ? 1.05 : 0.72,
          isUltimate: true
        });
        this.fx?.spawn('hellfireSolarPillar', px, this.groundY - 4, {
          light: idx === 1 ? 1.42 : 1.28,
          extra: { scaleWidth: idx === 1 ? 1.05 : 0.72 }
        });
      });
      game?.vfx?.spawnDamageText(
        targetX,
        this.groundY - 178,
        0,
        true,
        'BLACK-SUN SUPERNOVA!',
        '#fef08a'
      );
    } else if (t >= this.ultDuration) {
      this.y = this.groundY;
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  /**
   * SUPREME FINISHER (`CATACLYSM: LAYWASTE OF INFERNO`, `5.20s`):
   * - Phase 1 (`0.00..1.55s`): Grounded Black Mage Ley-Lines + High-Cosmos Heavensfall Breach (`Row 5`)
   * - Phase 2 (`1.55..3.22s`): `208x208` 30fps Obsidian-Magma Dreadnought Meteor (`Row 6`) + 7 `Row 7` Comet Wake Plumes
   * - Phase 3 (`t >= 3.22s..5.20s`): Cataclysmic Ground Detonation -> Triggers `triggerInfernoStage()` &
   *   `setStageTransformation('inferno', 1.0, true, 0)` STRICTLY at meteor impact `t >= 3.22s`!
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
        light: 1.58
      });
      this.fx?.spawn('solarFlameWard', this.x, this.groundY - 92, {
        follow: this,
        offsetX: 0,
        offsetY: -92,
        light: 1.48
      });
      this.fx?.spawn('heliosPalmFocus', this.x + this.facing * 26, this.groundY - 126, {
        follow: this,
        offsetX: 26,
        offsetY: -126,
        flip: this.facing < 0,
        light: 1.45
      });
      this.fx?.spawn('eclipseSupernovaDomain', targetX, this.groundY, {
        light: 1.58
      });
      this.fx?.spawn('eclipseSupernovaDomain', this.x, this.groundY, {
        light: 1.42
      });

      game?.vfx?.spawnShockwave(this.x, this.groundY - 12, 220, '#fb923c', 0.52, true);
      game?.vfx?.spawnGlyphBurst(this.x, this.groundY - 96, 12, 'arcane');
      game?.vfx?.spawnDamageText(
        this.x,
        this.groundY - 212,
        0,
        true,
        'CATACLYSM: ASTRAL METEOR!',
        '#fef08a'
      );
    }

    const m = this.trueUltMeteor;
    const targetX = m ? m.targetX : enemy ? enemy.x : ww * 0.5;

    // PHASE 1 (0.00..1.55s): Ley-Lines Invocation & High-Cosmos Heavensfall Breach
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
        game?.vfx?.spawnLightning(breachX - 95, breachY + 12, targetX - 45, this.groundY, '#fb923c', 0.48);
        game?.vfx?.spawnLightning(breachX + 95, breachY + 12, targetX + 45, this.groundY, '#fef08a', 0.48);
        this.fx?.spawn('eclipseSupernovaDomain', targetX, this.groundY, {
          light: 1.62
        });
        this.fx?.spawn('magmaFissureCrack', this.x, this.groundY, {
          light: 1.42,
          extra: { spanX: targetX - this.x }
        });
      }
    }
    // PHASE 2 (1.55..3.22s): Dreadnought Meteor Descent Across 650px of Sky
    else if (t < 3.22) {
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
          light: 1.68
        });
        game?.vfx?.spawnDamageText(
          targetX,
          this.groundY - 258,
          0,
          true,
          'HEAVENSFALL METEOR DESCENT!',
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
              light: 1.48,
              extra: { scale: 0.88 + u * 0.52 }
            });
          }

          game?.vfx?.spawnShockwave(m.x, m.y + 34, 145 + u * 95, '#fb923c', 0.24, true, true);
          this.fx?.burst(m.x + (Math.random() - 0.5) * 140, m.y + (Math.random() - 0.5) * 90, {
            count: 8,
            speedMin: 65,
            speedMax: 220,
            lifeMin: 0.22,
            lifeMax: 0.45,
            gravity: -65,
            colors: ['#ffffff', '#fef08a', '#fb923c', '#ea580c', '#dc2626']
          });
        }
      }

      if (game?.renderer) {
        game.renderer.ultDim = Math.max(game.renderer.ultDim || 0, 0.78);
      }

      const enemies = game?.getEnemiesOf ? game.getEnemiesOf(this) : enemy ? [enemy] : [];
      for (const cand of enemies) {
        if (cand && !cand.isDead && !cand.isBenched) {
          const pullDir = Math.sign(targetX - cand.x);
          cand.x += pullDir * 165 * dt;
        }
      }
    }
    // PHASE 3 (t >= 3.22s..5.20s): Cataclysmic Ground Impact & Permanent LAYWASTE OF INFERNO Stage!
    else if (t < dur) {
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

        this.fx?.spawn('eclipseSupernovaDomain', targetX, this.groundY, {
          light: 1.85
        });
        this.spawnVfxAnim(2, targetX, this.groundY - 98, 256, 256, 0.62, {
          flipX: false,
          inFront: true
        });
        [-190, 0, 190].forEach((off, idx) => {
          const bx = Math.max(120, Math.min(ww - 120, targetX + off));
          if (idx !== 1) {
            this.fx?.spawn('eclipseSupernovaDomain', bx, this.groundY, {
              light: 1.55
            });
          }
          this.fx?.spawn('solarMeteorImpactBurst', bx, this.groundY - 78, {
            light: idx === 1 ? 1.65 : 1.42,
            extra: { isMeteor: true }
          });
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
            light: isCenter ? 1.55 : 1.32,
            extra: { scaleWidth: isCenter ? 1.38 : 0.95 }
          });
        });

        this.fx?.spawn('magmaFissureCrack', 140, this.groundY, {
          light: 1.5,
          extra: { spanX: ww - 280 }
        });

        game?.vfx?.spawnShockwave(targetX, this.groundY - 12, 480, '#fef08a', 0.85, true);
        game?.vfx?.spawnShockwave(targetX, this.groundY - 42, 380, '#fb923c', 0.68, false);
        game?.vfx?.spawnDecal?.(targetX, 280, 'fissure', '#fb923c', 12.0);
        game?.vfx?.spawnBurst?.(targetX, this.groundY - 24, 52, '#fef08a', 460, { upBias: 210, size: 10 });
        game?.vfx?.spawnBurst?.(targetX, this.groundY - 24, 44, '#ea580c', 420, { upBias: 185, size: 9 });
        game?.vfx?.spawnGlyphBurst(targetX, this.groundY - 72, 16, 'arcane');

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

    for (let i = this.razorScars.length - 1; i >= 0; i--) {
      this.razorScars[i].age += dt;
      if (this.razorScars[i].age >= this.razorScars[i].maxLife) {
        this.razorScars.splice(i, 1);
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
        if (game?.audio) game.audio.play('footstep_steel', this.x);
        this.fx?.burst(this.x - this.facing * 14, this.groundY - 2, {
          count: 4,
          speedMin: 24,
          speedMax: 70,
          lifeMin: 0.12,
          lifeMax: 0.24,
          gravity: 30,
          colors: ['#ffffff', '#fef08a', '#fb923c']
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
            Math.abs(proj.x - this.x) < 230 &&
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
        sheet: mkImg('assets/sprites/mage_ex_sheet.png?v=30fps114'),
        vfx: mkImg('assets/sprites/mage_ex_vfx.png?v=30fps114'),
        portrait: mkImg('assets/sprites/mage_ex_portrait.png?v=30fps114'),
        cellW: 320,
        cellH: 240,
        anchorX: 112,
        anchorY: 230
      };
    }
    return assets.mage_ex;
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

        ctx.fillStyle = s.isGold ? '#b45309' : '#dc2626';
        ctx.fillRect(px - rad, py - rad, rad * 2, rad * 2);
        const mid = Math.max(2, rad - 2);
        ctx.fillStyle = s.isGold ? '#fef08a' : '#fb923c';
        ctx.fillRect(px - mid, py - mid, mid * 2, mid * 2);
        if (taper > 0.35) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(px - 2, py - 2, 4, 4);
        }
      }
    }
    ctx.restore();
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
      ctx.globalAlpha = fade * 0.56;
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

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let idx = 0; idx < portals.length; idx++) {
      const px = Math.round(portals[idx]);
      const py = Math.round(this.groundY - 96);
      const size = Math.round(164 * (0.84 + 0.16 * fade));
      const half = Math.round(-size * 0.5);

      ctx.save();
      ctx.translate(px, py);
      if (renderer?.glowOrange) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade * 0.40;
        ctx.drawImage(renderer.glowOrange, -size * 0.9, -size * 0.9, size * 1.8, size * 1.8);
      }
      if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = fade * 0.92;
        ctx.drawImage(vfxSheet, col * 208, 416, 208, 208, half, half, size, size);
      }
      ctx.restore();
    }
    ctx.restore();
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

      ctx.save();
      ctx.translate(px, py);
      ctx.scale(v.flipX ? -1 : 1, 1);
      if (renderer?.glowOrange) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(1, fade * 0.36);
        ctx.drawImage(renderer.glowOrange, -halfW, -halfH, v.w, v.h);
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = Math.min(1, 0.32 + fade * 0.68);
      ctx.drawImage(vfxSheet, col * 208, v.row * 208, 208, 208, -halfW, -halfH, v.w, v.h);
      ctx.restore();
    }
    ctx.restore();
  }

  /**
   * Renders the High-Cosmos Heavensfall Sky Breach (`Row 5`), Ground Target Seal (`Row 5` + `Row 4`),
   * 7 Axis-Aligned Comet Wake Plumes (`Row 7`), and `208x208` 30fps Dreadnought Meteor (`Row 6`)
   * using strictly `ctx.scale(meteorDir, 1)` (ZERO `ctx.rotate`!).
   */
  drawTrueUltimateMeteor(ctx, renderer = null) {
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

    const gx = Math.round(m.targetX);
    const gy = Math.round(this.groundY - 6);
    const ringScale = m.phase === 'descent' ? 0.94 + 0.36 * m.progress : Math.max(0.25, m.riftScale);
    const sealW = Math.round(480 * ringScale);
    const sealH = Math.round(140 * ringScale);

    ctx.save();
    ctx.translate(gx, gy);
    if (renderer?.glowOrange) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.42 * Math.min(1, ringScale);
      ctx.drawImage(renderer.glowOrange, -sealW * 0.58, -sealH * 0.85, sealW * 1.16, sealH * 1.7);
    }
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

    const innerW = Math.round(sealW * 0.72);
    const innerH = Math.round(sealH * 0.72);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.9 * Math.min(1, ringScale * 1.15);
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

    const rx = Math.round(m.startX);
    const ry = Math.round(m.startY - 18);
    const riftScale = Math.max(0.24, m.riftScale);
    const breachW = Math.round(620 * riftScale);
    const breachH = Math.round(256 * riftScale);

    ctx.save();
    ctx.translate(rx, ry);
    if (renderer?.glowOrange) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.44 * riftScale;
      ctx.drawImage(renderer.glowOrange, -breachW * 0.56, -breachH * 0.6, breachW * 1.12, breachH * 1.2);
    }
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
    const coreW = Math.round(340 * riftScale);
    const coreH = Math.round(188 * riftScale);
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
        ctx.globalCompositeOperation = i < 4 ? 'source-over' : 'lighter';
        ctx.globalAlpha = (1 - uNode * 0.62) * 0.95;
        ctx.drawImage(vfxSheet, wCol * 208, 1456, 208, 208, wOffX, wOffY, wSize, wSize);
        ctx.restore();
      }
    }

    const meteorScale =
      m.phase === 'rift' ? 0.82 + 0.66 * m.riftScale : 1.54 + 0.72 * m.progress;
    const meteorSize = Math.round(208 * meteorScale);
    const drawOffX = Math.round(-meteorSize * ((104 + 18) / 208));
    const drawOffY = Math.round(-meteorSize * ((104 + 27) / 208));

    ctx.save();
    ctx.translate(mx, my);
    ctx.scale(meteorDir, 1);
    ctx.imageSmoothingEnabled = false;

    if (renderer?.glowOrange) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.36;
      const glowR = Math.round(meteorSize * 0.48);
      ctx.drawImage(renderer.glowOrange, -glowR, -glowR, glowR * 2, glowR * 2);
    }

    ctx.globalCompositeOperation = 'source-over';
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
    if (this.fx && !this.isDead) {
      this.fx.renderLayer(ctx, 'back', arenaCenterX, this.groundY, 0.96);
    }
    this.drawBlinkPortals(ctx, renderer);
    this.drawSolarEchoes(ctx);
    this.drawMageExVfxAnims(ctx, false, renderer);
  }

  drawUltimateForeground(ctx, renderer = null) {
    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    if (this.fx && !this.isDead) {
      this.fx.renderLayer(ctx, 'front', arenaCenterX, this.groundY, 0.98);
    }
    this.drawMageExVfxAnims(ctx, true, renderer);
    this.drawPixelRazorScars(ctx);
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

    PixelForge.drawSheetFrame(ctx, sprites, this, w, h, this.runeOrbit, isReflection, renderer);

    ctx.restore();
  }
}
