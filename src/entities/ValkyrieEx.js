import { Fighter } from './Fighter.js?v=30fps114';
import { PixelForge } from '../engine/PixelForge.js?v=30fps114';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps114';
import {
  VALKYRIE_EFFECT_REGISTRY,
  VALKYRIE_CRIMSON_PALETTE,
  VALKYRIE_GOLD_PALETTE
} from '../engine/shaders/valkyrieShaders.js?v=30fps114';

const AUTO_SLICES_EX = [
  [60, 8], // Beat 1 (V0, 0.36s): Wide Gungnir Halberd Crescent Cleave -> snaps at F03 (63)
  [68, 7], // Beat 2 (V1, 0.34s): Reverse Rising Dragon-Fang Lance Sweep -> snaps at F09 (69)
  [75, 8], // Beat 3 (V2, 0.38s): Supersonic Mach-Cone + 2.5D Crimson Vortex (2-hit) -> snaps at F17/F18 (77/78)
  [83, 7]  // Beat 4 (V3, 0.52s): High Valkyrie Leap -> Plunging Gungnir Crescent Slam (3-hit + dragon_lance) -> snaps at F25 (85)
];

const BEAT_DURATIONS = [0.36, 0.34, 0.38, 0.52];
const INTRA_COMBO_LINK = 0.015;

/**
 * Freyja EX (`valkyrie_ex`) - Ragnarok Sky-Sovereign Valkyrie.
 * Next-Gen Wide-Canvas (`320x240`, `anchorX=112, anchorY=230`) FFBE / Last Cloudia Hack-and-Slash Champion.
 * Wields the long Crimson-Gold Winged Gungnir War-Lance + 6-Pinion Crimson-Gold Feathered Valkyrie Wings.
 * Coexists 100% independently alongside classic Freyja (`valkyrie`).
 */
export class ValkyrieEx extends Fighter {
  constructor(x, groundY, facing = 1) {
    const opts = typeof x === 'object' && x !== null ? x : { x, groundY, facing };
    super({
      ...opts,
      name: opts.name || 'Freyja EX',
      maxHp: 3920,
      moveSpeed: 212,
      attackRange: 192,
      autoInterval: 0.98,
      lightColor: 'rgba(244, 63, 94, 1)',
      primaryColor: '#f43f5e',
      hasTrueUltimate: true,
      trueUltName: 'TWILIGHT OF RAGNAROK: GUNGNIR',
      trueUltDuration: 4.35
    });

    this.heroId = 'valkyrie_ex';
    this.secondaryColor = '#fbbf24';
    this.deathSfx = 'death_valkyrie';
    this.theme = 'crimson';
    this.hasPoise = true;

    this.autoDuration = BEAT_DURATIONS[0];
    this._postFlurryInterval = 1.40;
    this.skillName = 'GUNGNIR SKY-LANCE';
    this.skillTriggerRange = 560;
    this.skillMaxCooldown = 4.85;
    this.skillCooldown = 1.25;
    this.skillDuration = 0.92;

    this.ultName = 'BAHAMUT CATACLYSM';
    this.ultSub = 'SOVEREIGN SKY-LANCE & DRAGONFIRE JUDGMENT';
    this.ultDuration = 1.80;

    this.hasTrueUltimate = true;
    this.trueUltName = 'TWILIGHT OF RAGNAROK: GUNGNIR';
    this.trueUltSub = 'SUPREME FINISHER - SIX EINHERJAR SPEARS & FALCON DIVE';
    this.trueUltDuration = 4.35;

    this.dodgeMaxCooldown = 3.25;
    this.dashMaxCooldown = 3.05;
    this.crouchCooldown = 0;
    this.crouchDuration = 0.68;
    this.dashDuration = 0.36;
    this.vaultCooldown = 0;

    // 4-Beat FFBE / Last Cloudia Gungnir War-Lance State
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
    this._overrideFrameIdx = null;

    // Grounded Stance by default (0 hover float on IDLE / WALK / AUTO_ATTACK / Cast Startups)
    this.hoverOffset = 0;
    this.divePitchRad = 0;
    this.cameraAirLift = 0;
    this.dragoonTargetX = null;
    this.activeSkySpears = [];
    this.bahamutAvatar = null;
    this.afterimages = [];
    this.afterimageSpawnAccum = 0;
    this.activeVfxAnims = [];
    this.razorScars = [];
    this._ultTargetX = 600;
    this.stepTimer = 0;

    // Supreme Ultimate (`TWILIGHT OF RAGNAROK: GUNGNIR`) state
    this._trueUltInit = false;
    this._trueUltStep = 0;
    this._trueUltLancesSpawned = 0;
    this._trueUltTargetX = 600;
    this.ragnarokSeal = null;
    this.einherjarSkyLances = [];
    this.ragnarokDiveBeam = null;
    this.ragnarokPillars = [];

    // Native 120Hz dual-buffer HD-2D Crimson-Gold Valkyrie shader & particle runtime
    this.fx = new ArcaneShaderFX(VALKYRIE_EFFECT_REGISTRY, {
      pixelScale: 3,
      viewW: 480,
      viewH: 260
    });

    if (typeof Image !== 'undefined') {
      PixelForge.ensureHeroLoaded?.('valkyrie_ex');
      const valkyrieExAssets = PixelForge.initAssets()?.valkyrie_ex;
      if (valkyrieExAssets?.vfx?.src && !valkyrieExAssets.vfx.src.includes('v=30fps114')) {
        valkyrieExAssets.vfx.src = 'assets/sprites/valkyrie_ex_vfx.png?v=30fps114';
      }
    }

    this._volleySlot = null;
    this._drewSpearFocus = false;
    this._deathBurstTriggered = false;
  }

  getAiStyleProfile() {
    return {
      comboGoal: 4,
      sweetMin: 112,
      sweetMax: 132,
      counterCrouchBias: 0.62,
      midLeapMin: 185,
      midLeapMax: 310,
      midLeapChance: 0.42,
      postStyle: 'vanguard'
    };
  }

  isHackAndSlashMelee() {
    return true;
  }

  getExSprites() {
    return typeof Image !== 'undefined' ? PixelForge.initAssets()?.valkyrie_ex : null;
  }

  setState(newState) {
    const prevState = this.state;
    super.setState(newState);

    if (
      newState !== 'SKILL' &&
      newState !== 'ULTIMATE' &&
      newState !== 'TRUE_ULTIMATE' &&
      newState !== 'DASH'
    ) {
      this.divePitchRad = 0;
    }
    if (
      newState !== 'CROUCH' &&
      newState !== 'JUMP' &&
      newState !== 'DASH' &&
      newState !== 'SKILL' &&
      newState !== 'ULTIMATE' &&
      newState !== 'TRUE_ULTIMATE'
    ) {
      this.fx?.stopByKey('valkyrieSlipstreamTrail');
    }
    if (newState !== 'SKILL' && newState !== 'ULTIMATE' && newState !== 'TRUE_ULTIMATE') {
      this.fx?.stopByKey('valkyrieHaloArray');
    }
    if (
      newState !== 'JUMP' &&
      newState !== 'SKILL' &&
      newState !== 'ULTIMATE' &&
      newState !== 'TRUE_ULTIMATE'
    ) {
      this.fx?.stopByKey('valkyrieWingPlume');
    }

    this._drewSpearFocus = false;

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
      this._skillJavelinsFired = 0;
      this._skillOriginX = this.x;
      this._skillSkimTargetX = null;
      this._skillStep = 0;
    }

    if (newState === 'ULTIMATE') {
      this._spearsFired = 0;
      this._ultOriginX = this.x;
      this._ultWaypoints = null;
      this._ultStep = 0;
      this._ultPassCone1 = false;
      this._ultPassCone3 = false;
      this.isInvulnerable = true;
    }

    if (newState === 'TRUE_ULTIMATE') {
      this._trueUltInit = false;
      this._trueUltStep = 0;
      this._trueUltLancesSpawned = 0;
      this.ragnarokSeal = null;
      this.einherjarSkyLances = [];
      this.ragnarokDiveBeam = null;
      this.ragnarokPillars = [];
      this.trueUltFrameOverride = 120;
      this.isInvulnerable = true;
      this.unstoppablePoise = true;
    } else {
      this._trueUltInit = false;
      this.ragnarokSeal = null;
      this.einherjarSkyLances = [];
      this.ragnarokDiveBeam = null;
      this.ragnarokPillars = [];
      this.cameraAirLift = 0;
      if (newState !== 'AUTO_ATTACK') {
        this.unstoppablePoise = false;
      }
    }

    if (newState === 'DEATH') {
      this.fx?.clear();
      this._volleySlot = null;
      this.bahamutAvatar = null;
      this.ragnarokSeal = null;
      this.einherjarSkyLances = [];
      this.ragnarokDiveBeam = null;
      this.ragnarokPillars = [];
      this.razorScars.length = 0;
      this.cameraAirLift = 0;
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      this.unstoppablePoise = false;
    }
  }

  _clampArenaX(xv, game, margin = 82) {
    const minX =
      game?.adventure?.lockActive && Number.isFinite(game.adventure.lockMinX)
        ? game.adventure.lockMinX + 24
        : margin;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const rawMaxX =
      game?.adventure?.lockActive && Number.isFinite(game.adventure.lockMaxX)
        ? game.adventure.lockMaxX - 24
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

  /**
   * Initializes one beat (`0..3`) of Freyja EX's 4-beat FFBE / Last Cloudia Gungnir War-Lance chain
   * without returning to `IDLE`, computing grounded pre-snap lunge into the `112..120px` smear belly!
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
      const sweetDist = v === 2 ? 112 : 118;
      const idealStandX = enemy.x - this.facing * sweetDist;
      const rawDelta = (idealStandX - this.x) * this.facing;
      const maxForward = v === 0 ? 116 : v === 2 ? 46 : 34;
      const clampedForward = Math.max(0, Math.min(maxForward, rawDelta));
      desiredX = this.x + this.facing * clampedForward;
    }

    this._beatTargetX = this._clampArenaX(desiredX, game, 80);
  }

  queueNextComboBeat() {
    this._queuedNextBeat = true;
  }

  takeDamage(amount, attacker, isCrit = false, knockX = 95, knockY = 0) {
    super.takeDamage(amount, attacker, isCrit, knockX, knockY);

    if (this.isDead && !this._deathBurstTriggered) {
      this._deathBurstTriggered = true;
      this.fx.spawn('valhallaGroundBurst', this.x, this.groundY, {
        palette: VALKYRIE_GOLD_PALETTE,
        light: 1.08,
        extra: { radius: 30 }
      });
      this.fx.spawn('gungnirImpactStarburst', this.x, this.groundY - 66, {
        flip: false,
        palette: VALKYRIE_CRIMSON_PALETTE,
        light: 1.05,
        extra: { aimAngle: -Math.PI * 0.5, isCrit: true }
      });
    }
  }

  spawnAfterimage(x, y, facing, row = 6, col = 14, maxLife = 0.22) {
    if (this.afterimages.length >= 16) this.afterimages.shift();
    this.afterimages.push({
      x,
      y,
      facing,
      frameIdx: row * 30 + (col % 30),
      age: 0,
      maxLife
    });
  }

  spawnVfxAnim(row, x, y, w = 208, h = 208, maxLife = 0.40, opts = {}) {
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
      glowColor: opts.glowColor || 'crimson',
      followOwner: Boolean(opts.followOwner),
      offsetX: opts.offsetX || 0,
      offsetY: opts.offsetY || 0,
      inFront: Boolean(opts.inFront)
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

  _gatherMeleeTargets(primaryEnemy, game, reachFront = 224, reachBack = 42) {
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
   * damage, and integer-stepped crimson-gold Valkyrie razor scars!
   */
  _applyValkyrieExStrike(primaryEnemy, game, cfg) {
    const {
      damage = 28,
      reachFront = 224,
      reachBack = 42,
      hitStop = 0.044,
      shakeDur = 0.056,
      knockX = 28,
      knockY = 0,
      isCrit = false,
      scarDx = 112,
      scarDy = 86,
      isGold = false,
      vfxRow = 4,
      sfx = 'holy_spear'
    } = cfg;

    if (game?.audio) game.audio.play(sfx, this.x + this.facing * 84);
    this.didActionFrame = true;

    const targets = this._gatherMeleeTargets(primaryEnemy, game, reachFront, reachBack);
    let landedAny = false;

    for (let i = 0; i < targets.length; i++) {
      const foe = targets[i];
      const dmg = i === 0 ? damage : Math.max(10, Math.round(damage * 0.84));
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
      this.spawnVfxAnim(vfxRow, hitX, hitY, 192, 192, 0.24, {
        flipX: this.facing < 0,
        glowColor: isGold ? 'gold' : 'crimson',
        inFront: true
      });
      this.fx?.burst(hitX, hitY, {
        count: isCrit ? 9 : 6,
        speedMin: 48,
        speedMax: 168,
        lifeMin: 0.12,
        lifeMax: 0.26,
        gravity: 40,
        colors: isGold
          ? ['#ffffff', '#fef08a', '#fbbf24', '#fb7185']
          : ['#ffffff', '#fecdd3', '#fb7185', '#fbbf24']
      });
      landedAny = true;
    }

    if (landedAny && hitStop > 0) {
      this._hitStopTimer = Math.max(this._hitStopTimer || 0, hitStop);
      game?.renderer?.triggerHitStop?.(hitStop * 0.65);
    }

    return landedAny;
  }

  /**
   * Fires a piercing Crimson-Gold `'dragon_lance'` shockwave along the arena floor!
   */
  fireDragonLanceShock(game, opts = {}) {
    if (!game?.vfx) return;
    const dir = this.facing;
    const spawnX = opts.x ?? this.x + dir * 92;
    const spawnY = opts.y ?? this.groundY - 78;
    const dmg = opts.damage ?? 26;
    game.vfx.spawnProjectile({
      x: spawnX,
      y: spawnY,
      vx: dir * (opts.speed ?? 690),
      vy: 0,
      radius: opts.radius ?? 22,
      damage: dmg,
      owner: this,
      color: '#f43f5e',
      coreColor: '#fde047',
      type: 'dragon_lance',
      pierce: opts.pierce !== false,
      isUltimate: Boolean(opts.isUltimate),
      maxRange: opts.maxRange ?? 450
    });
    this.spawnVfxAnim(0, spawnX, spawnY, 196, 196, 0.26, {
      vx: dir * 285,
      flipX: dir < 0,
      glowColor: 'gold',
      inFront: true
    });
  }

  onProjectileTrail(proj) {
    if (!this.fx || !proj) return;
    proj._trailAcc = (proj._trailAcc || 0) + 0.016;
    if (proj._trailAcc >= 0.044) {
      proj._trailAcc = 0;
      const dir = Math.sign(proj.vx || this.facing || 1);
      this.fx.burst(proj.x - dir * 14, proj.y, {
        count: 3,
        speedMin: 26,
        speedMax: 84,
        lifeMin: 0.12,
        lifeMax: 0.24,
        gravity: -16,
        colors: ['#ffffff', '#fef08a', '#fb7185', '#be123c']
      });
    }
  }

  ensureBezierVolleySlot() {
    if (this._volleySlot && this.fx.active.includes(this._volleySlot)) {
      this._volleySlot.worldX = Math.round(this.x / 3) * 3;
      this._volleySlot.worldY = Math.round(this.groundY / 3) * 3;
      return;
    }
    const anchorX = Math.round(this.x / 3) * 3;
    const anchorY = Math.round(this.groundY / 3) * 3;
    this._volleySlot = this.fx.spawn('gungnirBezierVolley', anchorX, anchorY, {
      flip: false,
      palette: VALKYRIE_CRIMSON_PALETTE,
      light: 1.15,
      extra: {
        spears: this.activeSkySpears,
        getOrigin: () => ({
          x: this._volleySlot ? this._volleySlot.worldX : Math.round(this.x / 3) * 3,
          y: this._volleySlot ? this._volleySlot.worldY : Math.round(this.groundY / 3) * 3
        }),
        scale: 3
      }
    });
  }

  spawnGungnirSkySpear(
    startX,
    startY,
    targetX,
    targetY,
    damage = 22,
    isUlt = false,
    arcSpread = null,
    verticalArc = null
  ) {
    const spread =
      arcSpread !== null
        ? arcSpread
        : (Math.random() - 0.5) * (isUlt ? 160 : 95);
    const vArc =
      verticalArc !== null
        ? verticalArc
        : isUlt
          ? -38 + (Math.random() - 0.5) * 44
          : -24 + (Math.random() - 0.5) * 32;
    const flightDuration = isUlt ? 0.38 + Math.random() * 0.08 : 0.30;
    const ctrlX = startX + (targetX - startX) * 0.46 + spread * 0.35;
    const midY = (startY + targetY) * 0.5;
    const ctrlY = Math.max(this.groundY - 210, Math.min(this.groundY - 26, midY + vArc));

    this.activeSkySpears.push({
      startX,
      startY,
      ctrlX,
      ctrlY,
      targetX,
      targetY,
      spreadOffset: (Math.random() - 0.5) * 36,
      x: startX,
      y: startY,
      angle: targetX >= startX ? 0 : Math.PI,
      damage,
      isUlt,
      age: 0,
      wakeAccum: 0,
      flightDuration,
      maxLife: flightDuration + 0.06,
      trail: [{ x: startX, y: startY }],
      spiralPhase: Math.random() * Math.PI * 2,
      hitTargets: new Set()
    });

    this.ensureBezierVolleySlot();
  }

  update(dt, enemy, game) {
    if (this.crouchCooldown > 0) this.crouchCooldown = Math.max(0, this.crouchCooldown - dt);
    if (this.vaultCooldown > 0) this.vaultCooldown = Math.max(0, this.vaultCooldown - dt);
    if (this._comboPersistTimer > 0 && this.state !== 'AUTO_ATTACK') {
      this._comboPersistTimer = Math.max(0, this._comboPersistTimer - dt);
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

    if (this.bahamutAvatar) {
      this.bahamutAvatar.life += dt;
      this.bahamutAvatar.x = this.x;
      this.bahamutAvatar.y = this.y;
      if (
        this.bahamutAvatar.life >= this.bahamutAvatar.maxLife ||
        (this.state !== 'ULTIMATE' && this.state !== 'TRUE_ULTIMATE')
      ) {
        this.bahamutAvatar = null;
      }
    }

    if (!this.isDead && this.state === 'WALK') {
      this.stepTimer += dt;
      if (this.stepTimer >= 0.34) {
        this.stepTimer = 0;
        if (game?.audio) game.audio.play('footstep_steel', this.x);
        this.fx.spawn('valhallaGroundBurst', this.x - this.facing * 12, this.groundY, {
          palette: VALKYRIE_CRIMSON_PALETTE,
          light: 0.82,
          extra: { radius: 12 }
        });
      }
    }

    // Update Active Shallow-Curving Gungnir Light-Javelins
    if (this.activeSkySpears.length > 0 && game) {
      this.ensureBezierVolleySlot();
      const ww = game.renderer ? game.renderer.worldWidth : 1600;
      const targets = this.getActiveEnemies(enemy, game);
      for (let i = this.activeSkySpears.length - 1; i >= 0; i--) {
        const sp = this.activeSkySpears[i];
        sp.age += dt;
        const u = Math.min(1, sp.age / Math.max(0.05, sp.flightDuration));

        if (u < 0.55 && enemy && !enemy.isDead) {
          const desiredTx = Math.max(85, Math.min(ww - 85, enemy.x + sp.spreadOffset));
          const desiredTy = Math.min(this.groundY - 28, enemy.y - (sp.isUlt ? 48 : 72));
          sp.targetX += (desiredTx - sp.targetX) * Math.min(1, dt * 7.0);
          sp.targetY += (desiredTy - sp.targetY) * Math.min(1, dt * 7.0);
        }

        const tB = Math.min(1, u * (0.65 + 0.35 * u));
        const invT = 1 - tB;

        const prevX = sp.x;
        const prevY = sp.y;
        sp.x = invT * invT * sp.startX + 2 * invT * tB * sp.ctrlX + tB * tB * sp.targetX;
        sp.y = invT * invT * sp.startY + 2 * invT * tB * sp.ctrlY + tB * tB * sp.targetY;

        const dxB = 2 * invT * (sp.ctrlX - sp.startX) + 2 * tB * (sp.targetX - sp.ctrlX);
        const dyB = 2 * invT * (sp.ctrlY - sp.startY) + 2 * tB * (sp.targetY - sp.ctrlY);
        if (Math.hypot(dxB, dyB) > 0.01) {
          sp.angle = Math.atan2(dyB, dxB);
        } else if (Math.hypot(sp.x - prevX, sp.y - prevY) > 0.01) {
          sp.angle = Math.atan2(sp.y - prevY, sp.x - prevX);
        }

        sp.trail.push({ x: sp.x, y: sp.y });
        if (sp.trail.length > 13) sp.trail.shift();

        sp.wakeAccum = (sp.wakeAccum || 0) + dt;
        if (sp.wakeAccum >= 0.032) {
          sp.wakeAccum = 0;
          this.fx.burst(sp.x, sp.y, {
            count: 1,
            speedMin: 35,
            speedMax: 95,
            lifeMin: 0.14,
            lifeMax: 0.24,
            gravity: 35,
            angle: sp.angle + Math.PI,
            spread: 0.75,
            colors: ['#fde047', '#f43f5e', '#ffffff']
          });
        }

        let hitSomeone = false;
        for (const tFoe of targets) {
          if (tFoe && !tFoe.isDead && !tFoe.isBenched && !sp.hitTargets.has(tFoe)) {
            if (Math.abs(tFoe.x - sp.x) < 62 && Math.abs(tFoe.y - 68 - sp.y) < 84) {
              sp.hitTargets.add(tFoe);
              hitSomeone = true;
              tFoe.takeDamage(sp.damage, this, sp.isUlt, 65, sp.isUlt ? -115 : -45);
              this.gainMana(sp.isUlt ? 0 : 1.05);
              if (game.audio) game.audio.play('holy_spear', sp.x);

              this.fx.spawn('gungnirImpactStarburst', sp.x, sp.y, {
                flip: false,
                palette: sp.isUlt ? VALKYRIE_GOLD_PALETTE : VALKYRIE_CRIMSON_PALETTE,
                light: sp.isUlt ? 1.2 : 1.08,
                extra: { aimAngle: sp.angle, isCrit: sp.isUlt }
              });

              if (game.vfx) {
                game.vfx.spawnSlash(sp.x, sp.y, 96, sp.angle - 0.85, sp.angle + 0.85, '#f43f5e', 0.22);
                game.vfx.spawnBurst(sp.x, sp.y, 8, '#fbbf24', 185, { upBias: 55, size: 4 });
              }
            }
          }
        }

        if (hitSomeone || u >= 1.0 || sp.y >= this.groundY - 4 || sp.age >= sp.maxLife) {
          const impX = sp.x;
          if (!hitSomeone) {
            this.fx.spawn('gungnirImpactStarburst', impX, sp.y, {
              flip: false,
              palette: VALKYRIE_CRIMSON_PALETTE,
              light: 1.0,
              extra: { aimAngle: sp.angle, isCrit: false }
            });
            if (game.vfx) {
              game.vfx.spawnBurst(impX, sp.y, sp.isUlt ? 8 : 6, '#fbbf24', 165, {
                upBias: 65,
                size: 4
              });
            }
          }
          if (sp.isUlt && game.vfx) {
            game.vfx.spawnShockwave(impX, this.groundY - 4, 108, '#f43f5e', 0.26, true);
          }
          this.activeSkySpears.splice(i, 1);
        }
      }
    } else if (this._volleySlot) {
      this._volleySlot.inst.release();
      this._volleySlot = null;
    }

    this.fx.update(dt);

    super.update(dt, enemy, game);

    this.hoverOffset = 0;
  }

  // ============================================================================
  // VALKYRIE MOBILITY: `-360 deg` BACKFLIP (`CROUCH`), WING-VAULT (`JUMP`) & WING-SKIM (`DASH`)
  // ============================================================================

  startDodge(enemy, game) {
    this.dodgeCooldown = this.dodgeMaxCooldown * (0.85 + Math.random() * 0.26);
    const dist = enemy && !enemy.isDead ? Math.abs(enemy.x - this.x) : 999;
    if (dist < 225 && this.crouchCooldown <= 0) {
      this.startCrouch(enemy, game);
    } else {
      this.startJump(enemy, game);
    }
  }

  startCrouch(_enemy, game) {
    // Athletic -360 deg Backward Valkyrie Aerial Backflip (Row 7 CROUCH, ZERO ctx.rotate!)
    this.crouchCooldown = 3.1;
    this.crouchDuration = 0.68;
    this.setState('CROUCH');
    this.isCrouching = true;
    this.isInvulnerable = true;
    this.isFlipVault = true;
    this._backflipStep = 0;
    this._didBackflipLand = false;

    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    let retreatDir = -this.facing;
    if (this.x < 220) retreatDir = 1;
    else if (this.x > ww - 220) retreatDir = -1;

    this.vaultStartX = this.x;
    this.vaultTargetX = this._clampArenaX(this.x + retreatDir * 195, game, 85);
    this.vx = 0;
    this.vy = 0;
    this.heal(8, 'VALKYRIE GRACE');
    this.spawnAfterimage(this.x, this.y, this.facing, 7, 2, 0.20);

    this.fx.spawn('valhallaGroundBurst', this.x, this.groundY, {
      palette: VALKYRIE_CRIMSON_PALETTE,
      light: 1.08,
      extra: { radius: 28 }
    });
    this.fx.spawn('valkyrieSlipstreamTrail', this.x - this.facing * 14, this.y - 88, {
      follow: this,
      offsetX: -14,
      offsetY: -88,
      flip: this.facing < 0,
      palette: VALKYRIE_CRIMSON_PALETTE,
      maxDuration: 0.56,
      light: 1.05,
      extra: { length: 28, tilt: -0.14 }
    });

    if (game?.audio) game.audio.play('dash_whoosh', this.x);
    if (game?.vfx) {
      game.vfx.spawnDamageText(
        this.x,
        this.y - 148,
        0,
        true,
        'VALKYRIE BACKFLIP!',
        '#fbbf24'
      );
      game.vfx.spawnShockwave(this.x, this.groundY - 6, 98, '#f43f5e', 0.24, true);
    }
  }

  updateCrouch(_dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.crouchDuration || 0.68;
    const u = Math.min(1, t / dur);

    const moveU = u <= 0.06 ? 0 : u >= 0.82 ? 1 : (u - 0.06) / 0.76;
    const easeMove = 1 - Math.pow(1 - moveU, 1.85);
    this.x = this.vaultStartX + (this.vaultTargetX - this.vaultStartX) * easeMove;

    if (u >= 0.08 && u <= 0.80) {
      const airU = (u - 0.08) / 0.72;
      this.y = this.groundY - Math.sin(airU * Math.PI) * 96;
    } else {
      this.y = this.groundY;
    }
    this.vx = 0;
    this.vy = 0;

    if (enemy && !enemy.isDead) {
      this.facing = enemy.x >= this.x ? 1 : -1;
    }

    const flipThresholds = [0.24, 0.44, 0.64];
    if (this._backflipStep < flipThresholds.length && u >= flipThresholds[this._backflipStep]) {
      this._backflipStep++;
      this.spawnAfterimage(this.x, this.y, this.facing, 7, Math.min(29, Math.floor(u * 29)), 0.22);
    }

    if (t >= 0.26 && !this.didActionFrame) {
      this.didActionFrame = true;
      const sx = this.x + this.facing * 28;
      const sy = this.y - 72;
      const tx = enemy && !enemy.isDead ? enemy.x : this.x + this.facing * 320;
      const ty = enemy && !enemy.isDead ? enemy.y - 74 : this.groundY - 74;
      this.spawnGungnirSkySpear(sx, sy, tx, ty, 22, false, -45, -22);

      this.fx.spawn('gungnirSpearThrustCone', sx, sy, {
        flip: false,
        palette: VALKYRIE_CRIMSON_PALETTE,
        light: 1.12,
        extra: { aimAngle: Math.atan2(ty - sy, tx - sx), radius: 22, twin: false }
      });
      if (game?.audio) game.audio.play('holy_spear', this.x);
    }

    if (t >= 0.42 && !this.didSecondaryAction) {
      this.didSecondaryAction = true;
      const sx = this.x + this.facing * 28;
      const sy = this.y - 72;
      const tx = enemy && !enemy.isDead ? enemy.x : this.x + this.facing * 340;
      const ty = enemy && !enemy.isDead ? enemy.y - 68 : this.groundY - 68;
      this.spawnGungnirSkySpear(sx, sy, tx, ty, 24, false, 45, 16);

      this.fx.spawn('gungnirSpearThrustCone', sx, sy, {
        flip: false,
        palette: VALKYRIE_GOLD_PALETTE,
        light: 1.12,
        extra: { aimAngle: Math.atan2(ty - sy, tx - sx), radius: 22, twin: false }
      });
      if (game?.audio) game.audio.play('holy_spear', this.x);
    }

    if (u >= 0.80 && !this._didBackflipLand) {
      this._didBackflipLand = true;
      this.fx.spawn('valhallaGroundBurst', this.x, this.groundY, {
        palette: VALKYRIE_GOLD_PALETTE,
        light: 1.0,
        extra: { radius: 22 }
      });
      if (game?.vfx) {
        game.vfx.spawnShockwave(this.x, this.groundY - 4, 82, '#fbbf24', 0.20, true);
      }
    }

    if (t >= dur) {
      this.y = this.groundY;
      this.isFlipVault = false;
      this.isInvulnerable = false;
      this.isCrouching = false;
      this.setState('IDLE');
    }
  }

  startJump(enemy, game, dirOverride = null) {
    this.vaultCooldown = 2.8;
    this.dashDuration = 0.58;
    this.setState('JUMP');
    this.isInvulnerable = true;
    this.isFlipVault = true;
    this.didSecondaryAction = false;
    this.heal(8, 'VALHALLA WINGS');

    const dir = dirOverride || (enemy && !enemy.isDead ? (enemy.x >= this.x ? 1 : -1) : this.facing);
    this.facing = dir;
    this.vaultStartX = this.x;

    let desiredX = this.x + dir * 210;
    if (enemy && !enemy.isDead && dir === (enemy.x >= this.x ? 1 : -1)) {
      desiredX = enemy.x - dir * 116;
    }
    this.dragoonTargetX = this._clampArenaX(desiredX, game, 92);
    this.vx = 0;
    this.vy = 0;
    this.spawnAfterimage(this.x, this.y, this.facing, 8, 2, 0.22);

    this.fx.spawn('valhallaGroundBurst', this.x, this.groundY, {
      palette: VALKYRIE_GOLD_PALETTE,
      light: 1.1,
      extra: { radius: 30 }
    });
    this.fx.spawn('valkyrieWingPlume', this.x - this.facing * 18, this.y - 116, {
      follow: this,
      offsetX: -18,
      offsetY: -116,
      flip: this.facing < 0,
      palette: VALKYRIE_CRIMSON_PALETTE,
      maxDuration: 0.54,
      light: 1.12,
      extra: { wingSpan: 27 }
    });
    this.fx.spawn('valkyrieSlipstreamTrail', this.x - this.facing * 18, this.y - 94, {
      follow: this,
      offsetX: -18,
      offsetY: -94,
      flip: this.facing < 0,
      palette: VALKYRIE_GOLD_PALETTE,
      maxDuration: 0.52,
      light: 1.05,
      extra: { length: 30, tilt: -0.08 }
    });

    if (game?.audio) game.audio.play('dash_whoosh', this.x);
    if (game?.vfx) {
      game.vfx.spawnDamageText(
        this.x,
        this.y - 148,
        0,
        true,
        'VALKYRIE WING-VAULT!',
        '#fbbf24'
      );
      game.vfx.spawnShockwave(this.x, this.groundY - 4, 108, '#fbbf24', 0.26, true);
    }
  }

  onStartDash(enemy, game, dir) {
    this.dashDuration = 0.36;
    this.isFlipVault = false;
    this.dashDir = enemy && !enemy.isDead ? Math.sign(enemy.x - this.x) || dir || this.facing : dir || this.facing;
    this.facing = this.dashDir;

    this.fx.spawn('valhallaGroundBurst', this.x, this.groundY, {
      palette: VALKYRIE_CRIMSON_PALETTE,
      light: 1.05,
      extra: { radius: 24 }
    });
    this.fx.spawn('valkyrieSlipstreamTrail', this.x - this.facing * 18, this.y - 92, {
      follow: this,
      offsetX: -18,
      offsetY: -92,
      flip: this.facing < 0,
      palette: VALKYRIE_CRIMSON_PALETTE,
      maxDuration: 0.34,
      light: 1.08,
      extra: { length: 28, tilt: -0.05 }
    });

    if (game?.audio) game.audio.play('dash_whoosh', this.x);
    if (game?.vfx) {
      game.vfx.spawnDamageText(
        this.x,
        this.y - 144,
        0,
        false,
        'VALKYRIE WING-SKIM!',
        '#f43f5e'
      );
    }
  }

  updateDashOrDodge(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = Math.max(0.01, this.dashDuration || 0.36);
    const u = Math.min(1, t / dur);

    if (this.isFlipVault) {
      const targetX = this.dragoonTargetX ?? this.x;
      const easeU = 1 - Math.pow(1 - u, 1.85);
      this.x = this.vaultStartX + (targetX - this.vaultStartX) * easeU;
      this.y = this.groundY - Math.sin(u * Math.PI) * 108;
      this.vx = 0;
      this.vy = 0;
      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }

      this.afterimageSpawnAccum += dt;
      if (this.afterimageSpawnAccum >= 0.052) {
        this.afterimageSpawnAccum = 0;
        this.spawnAfterimage(this.x, this.y, this.facing, 8, Math.min(29, Math.floor(u * 29)), 0.22);
      }

      if (!this.didSecondaryAction && u >= 0.54) {
        this.didSecondaryAction = true;
        this.fx.spawn('gungnirSpearThrustCone', this.x + this.facing * 58, this.y - 68, {
          flip: false,
          palette: VALKYRIE_GOLD_PALETTE,
          light: 1.24,
          extra: { aimAngle: this.facing >= 0 ? 0.32 : Math.PI - 0.32, radius: 28, twin: true }
        });
        this.fireDragonLanceShock(game, {
          x: this.x + this.facing * 72,
          y: Math.min(this.groundY - 72, this.y - 44),
          damage: 28,
          speed: 660,
          maxRange: 390
        });
        this._applyValkyrieExStrike(enemy, game, {
          damage: 38,
          reachFront: 218,
          hitStop: 0.042,
          shakeDur: 0.056,
          knockX: 68,
          knockY: -45,
          scarDx: 108,
          scarDy: 92,
          isGold: true,
          vfxRow: 4,
          sfx: 'holy_spear'
        });
      }

      if (t >= dur) {
        this.y = this.groundY;
        this.fx.spawn('valhallaGroundBurst', this.x, this.groundY, {
          palette: VALKYRIE_CRIMSON_PALETTE,
          light: 1.0,
          extra: { radius: 22 }
        });
        this.dragoonTargetX = null;
        this.isFlipVault = false;
        this.isInvulnerable = false;
        this.setState('IDLE');
      }
      return;
    }

    // Supersonic Low Wing-Skim Assault braking right at the 116px Gungnir War-Lance sweet-spot!
    const dir = this.dashDir || this.facing;
    this.y = this.groundY - Math.sin(u * Math.PI) * 10;
    if (t < dur * 0.78) {
      const distToEnemy = enemy && !enemy.isDead ? (enemy.x - this.x) * dir : 999;
      if (distToEnemy <= 118 && distToEnemy >= 72) {
        this.vx = 0;
      } else {
        this.vx = dir * 620;
      }
      this.afterimageSpawnAccum += dt;
      if (this.afterimageSpawnAccum >= 0.038) {
        this.afterimageSpawnAccum = 0;
        this.spawnAfterimage(this.x, this.y, this.facing, 6, Math.min(29, Math.floor(u * 29)), 0.18);
      }
    } else {
      this.vx = 0;
    }

    if (!this.didActionFrame && enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= 172) {
      this.fx.spawn('gungnirSpearThrustCone', this.x + this.facing * 64, this.groundY - 88, {
        flip: false,
        palette: VALKYRIE_CRIMSON_PALETTE,
        light: 1.22,
        extra: { aimAngle: this.facing >= 0 ? 0 : Math.PI, radius: 28, twin: false }
      });
      this._applyValkyrieExStrike(enemy, game, {
        damage: 42,
        reachFront: 205,
        hitStop: 0.042,
        shakeDur: 0.056,
        knockX: 84,
        knockY: -42,
        scarDx: 112,
        scarDy: 34,
        isGold: false,
        vfxRow: 4,
        sfx: 'holy_spear'
      });
    }

    if (t >= dur) {
      this.y = this.groundY;
      this.vx = 0;
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  // ============================================================================
  // 4-BEAT FFBE / LAST CLOUDIA GUNGNIR WAR-LANCE AUTO-ATTACK (`Row 2`)
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

    // Snap times aligned 1:1 to Freyja EX Row 2 keyposes: V0->F03(0.10s), V1->F09(0.06s), V2->F17(0.08s), V3->F25(0.16s)
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

    // 1. Grounded Wing-Thrust Impulse -> Hard-Locked Sabatons (`vx = 0`) right on snap!
    this.vx = 0;
    if (t < snapT) {
      const lungeU = Math.min(1, Math.max(0, t / snapT));
      const eased = 1 - Math.pow(1 - lungeU, 2.2);
      this.x = this._beatStartX + (this._beatTargetX - this._beatStartX) * eased;

      if (v === 0 && Math.abs(this._beatTargetX - this._beatStartX) > 26) {
        this._dragSparkAcc += dt;
        if (this._dragSparkAcc >= 0.032) {
          this._dragSparkAcc = 0;
          this.spawnAfterimage(this.x, this.y, this.facing, 2, localStep, 0.16);
          this.fx.burst(this.x - this.facing * 36, this.groundY - 3, {
            count: 4,
            speedMin: 34,
            speedMax: 98,
            lifeMin: 0.10,
            lifeMax: 0.22,
            gravity: 75,
            colors: ['#ffffff', '#fef08a', '#fb7185']
          });
        }
      }
    } else if (!this._bootsPlanted) {
      this._bootsPlanted = true;
      this.x = this._beatTargetX;
      this.vx = 0;
    }

    // High Valkyrie Winged Leap on Beat 4 (V3: leaps skyward F23..F24, plunges onto groundY at F25 t = 0.16s!)
    if (v === 3) {
      if (t < 0.16) {
        const airU = t / 0.16;
        const liftCurve = Math.sin(airU * Math.PI * 0.86);
        this.y = this.groundY - liftCurve * 68;
        this.vy = 0;
      } else {
        this.y = this.groundY;
        this.vy = 0;
      }
    } else {
      this.y = this.groundY;
      this.vy = 0;
    }

    // 2. Beat-Specific Smear Snap Impacts, Hit-Stop & Cascading Multi-Tick Bite
    if (v === 0) {
      // V0 (F03 = 63, t = 0.10s): 1-frame snap wide Gungnir halberd crescent cleave smear!
      if ((this._beatHitMask & 1) === 0 && t >= 0.10) {
        this._beatHitMask |= 1;
        const cleaveX = this.x + this.facing * 76;
        game?.vfx?.spawnShockwave?.(this.x + this.facing * 44, this.groundY - 4, 62, '#f43f5e', 0.20, false, true);
        this.fx.spawn('valhallaGroundBurst', this.x + this.facing * 32, this.groundY, {
          palette: VALKYRIE_CRIMSON_PALETTE,
          light: 1.06,
          extra: { radius: 22 }
        });
        this.fx.spawn('gungnirSpearThrustCone', cleaveX, this.y - 88, {
          flip: false,
          palette: VALKYRIE_CRIMSON_PALETTE,
          light: 1.22,
          extra: { aimAngle: this.facing >= 0 ? 0.18 : Math.PI - 0.18, radius: 30, twin: false }
        });
        this._applyValkyrieExStrike(enemy, game, {
          damage: 28,
          reachFront: 222,
          hitStop: 0.044,
          shakeDur: 0.056,
          knockX: 26,
          knockY: 0,
          scarDx: 114,
          scarDy: 88,
          isGold: false,
          vfxRow: 4,
          sfx: 'slash'
        });
      }
    } else if (v === 1) {
      // V1 (F09 = 69, t = 0.06s): 1-frame snap reverse rising Dragon-Fang lance sweep smear!
      if ((this._beatHitMask & 1) === 0 && t >= 0.06) {
        this._beatHitMask |= 1;
        const sweepX = this.x + this.facing * 80;
        game?.vfx?.spawnShockwave?.(sweepX, this.groundY - 8, 72, '#fbbf24', 0.22, false, true);
        this.fx.spawn('gungnirSpearThrustCone', sweepX, this.y - 96, {
          flip: false,
          palette: VALKYRIE_GOLD_PALETTE,
          light: 1.26,
          extra: { aimAngle: this.facing >= 0 ? -0.28 : Math.PI + 0.28, radius: 32, twin: false }
        });
        this.spawnVfxAnim(2, sweepX, this.groundY - 72, 180, 180, 0.28, {
          flipX: this.facing < 0,
          glowColor: 'gold',
          inFront: false
        });
        this._applyValkyrieExStrike(enemy, game, {
          damage: 30,
          reachFront: 224,
          hitStop: 0.044,
          shakeDur: 0.058,
          knockX: 22,
          knockY: -134,
          scarDx: 112,
          scarDy: -94,
          isGold: true,
          vfxRow: 4,
          sfx: 'holy_spear'
        });
      }
    } else if (v === 2) {
      // V2 (F17/F18 = 77/78, t = 0.08s & 0.14s): Supersonic multi-thrust Mach-cone + 2.5D crimson vortex smear (2-hit)!
      if ((this._beatHitMask & 1) === 0 && t >= 0.08) {
        this._beatHitMask |= 1;
        this.fx.spawn('gungnirSpearThrustCone', this.x + this.facing * 78, this.y - 88, {
          flip: false,
          palette: VALKYRIE_CRIMSON_PALETTE,
          light: 1.26,
          extra: { aimAngle: this.facing >= 0 ? 0 : Math.PI, radius: 34, twin: true }
        });
        this._applyValkyrieExStrike(enemy, game, {
          damage: 20,
          reachFront: 226,
          hitStop: 0.042,
          shakeDur: 0.048,
          knockX: 16,
          knockY: -22,
          scarDx: 118,
          scarDy: 24,
          isGold: false,
          vfxRow: 4,
          sfx: 'holy_spear'
        });
      }
      if ((this._beatHitMask & 2) === 0 && t >= 0.14) {
        this._beatHitMask |= 2;
        this.gainMana(4.5);
        this.fx.spawn('gungnirSpearThrustCone', this.x + this.facing * 82, this.y - 92, {
          flip: false,
          palette: VALKYRIE_GOLD_PALETTE,
          light: 1.30,
          extra: { aimAngle: this.facing >= 0 ? -0.08 : Math.PI + 0.08, radius: 35, twin: true }
        });
        this._applyValkyrieExStrike(enemy, game, {
          damage: 22,
          reachFront: 228,
          hitStop: 0.044,
          shakeDur: 0.054,
          knockX: 18,
          knockY: -36,
          scarDx: 116,
          scarDy: -40,
          isGold: true,
          vfxRow: 4,
          sfx: 'clang'
        });
      }
    } else {
      // V3 (F25 = 85, t = 0.16s): Plunging Gungnir Crescent Slam (3-hit + piercing 'dragon_lance' shock + 58ms hit-stop)!
      if ((this._beatHitMask & 1) === 0 && t >= 0.16) {
        this._beatHitMask |= 1;
        const slamX = this.x + this.facing * 88;
        game?.renderer?.triggerShake?.(13, 0.24);
        if (game?.audio) game.audio.play('dragon_dive', slamX);
        game?.vfx?.spawnShockwave?.(slamX, this.groundY - 4, 102, '#fbbf24', 0.28, false, true);
        this.gainMana(6.5);

        this.fx.spawn('dragonfireObeliskPillar', slamX, this.groundY, {
          palette: VALKYRIE_CRIMSON_PALETTE,
          light: 1.30,
          extra: { baseRadius: 15, height: 80, isUltimate: false }
        });
        this.fx.spawn('gungnirSpearThrustCone', slamX, this.groundY - 88, {
          flip: false,
          palette: VALKYRIE_GOLD_PALETTE,
          light: 1.34,
          extra: { aimAngle: this.facing >= 0 ? 0.22 : Math.PI - 0.22, radius: 36, twin: true }
        });
        this.spawnVfxAnim(2, slamX, this.groundY - 78, 220, 220, 0.36, {
          flipX: this.facing < 0,
          glowColor: 'gold',
          inFront: false
        });
        this._applyValkyrieExStrike(enemy, game, {
          damage: 25,
          reachFront: 232,
          hitStop: 0.058,
          shakeDur: 0.082,
          knockX: 36,
          knockY: -46,
          isCrit: true,
          scarDx: 30,
          scarDy: 138,
          isGold: true,
          vfxRow: 4,
          sfx: 'heavy_cleave'
        });
        this.fireDragonLanceShock(game, {
          x: slamX,
          y: this.groundY - 78,
          damage: 26,
          speed: 690,
          maxRange: 450,
          pierce: true
        });
      }
      if ((this._beatHitMask & 2) === 0 && t >= 0.21) {
        this._beatHitMask |= 2;
        this._applyValkyrieExStrike(enemy, game, {
          damage: 16,
          reachFront: 234,
          hitStop: 0,
          shakeDur: 0.046,
          knockX: 28,
          knockY: -36,
          scarDx: 98,
          scarDy: 82,
          isGold: false,
          vfxRow: 4,
          sfx: 'clang'
        });
      }
      if ((this._beatHitMask & 4) === 0 && t >= 0.26) {
        this._beatHitMask |= 4;
        this._applyValkyrieExStrike(enemy, game, {
          damage: 22,
          reachFront: 236,
          hitStop: 0,
          shakeDur: 0.056,
          knockX: 94,
          knockY: -88,
          isCrit: true,
          scarDx: 104,
          scarDy: -86,
          isGold: true,
          vfxRow: 4,
          sfx: 'holy_spear'
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
        Math.abs(enemy.x - this.x) <= 255;

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
  // SKILL - `GUNGNIR SKY-LANCE` (`0.92s`, `4.85s` CD)
  // ============================================================================

  updateSkill(dt, enemy, game) {
    const t = this.stateTimer;
    if (!this._skillJavelinsFired) this._skillJavelinsFired = 0;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const clampX = (xVal) => this._clampArenaX(xVal, game, 92);
    const originX = this._skillOriginX !== undefined ? this._skillOriginX : this.x;

    if (!this.didActionFrame) {
      this.didActionFrame = true;
      this._skillOriginX = this.x;

      let skimX = clampX(originX + this.facing * 124);
      if (enemy && !enemy.isDead) {
        const toEnemy = enemy.x >= originX ? 1 : -1;
        this.facing = toEnemy;
        skimX = clampX(enemy.x - toEnemy * 116);
      }
      this._skillSkimTargetX = skimX;

      const lockTargetX =
        enemy && !enemy.isDead ? clampX(enemy.x) : clampX(this.x + this.facing * 260);

      this.fx.spawn('valhallaGroundBurst', this.x, this.groundY, {
        palette: VALKYRIE_GOLD_PALETTE,
        light: 1.12,
        extra: { radius: 30 }
      });
      this.fx.spawn('valkyrieHaloArray', this.x, this.y - 94, {
        follow: this,
        offsetX: 0,
        offsetY: -94,
        palette: VALKYRIE_CRIMSON_PALETTE,
        maxDuration: 0.56,
        light: 1.15,
        extra: { rx: 24, ry: 12 }
      });
      this.fx.spawn('valkyrieWingPlume', this.x - this.facing * 18, this.y - 118, {
        follow: this,
        offsetX: -18,
        offsetY: -118,
        flip: this.facing < 0,
        palette: VALKYRIE_CRIMSON_PALETTE,
        maxDuration: 0.72,
        light: 1.15,
        extra: { wingSpan: 28 }
      });
      this.fx.spawn('valhallaTargetReticle', lockTargetX, this.groundY, {
        palette: VALKYRIE_GOLD_PALETTE,
        maxDuration: 0.72,
        light: 1.12,
        extra: { radius: 32, beaconH: 46, duration: 0.74 }
      });

      if (game?.vfx) {
        game.vfx.spawnSpecialCastAura(this, this.skillName, 'VALKYRIE SKILL', 'crimson', false);
        game.vfx.spawnShockwave(this.x, this.groundY - 4, 108, '#fbbf24', 0.26, true);
      }
      this.spawnVfxAnim(3, this.x, this.groundY - 92, 196, 196, 0.30, {
        followOwner: true,
        offsetX: 0,
        offsetY: -92,
        glowColor: 'crimson'
      });
    }

    if (t < 0.18) {
      this.vx = 0;
      this.vy = 0;
      this.x = originX;
      this.y = this.groundY;
      this.divePitchRad = 0;
      return;
    }

    const skimTargetX = this._skillSkimTargetX !== null ? this._skillSkimTargetX : originX;

    if (t >= 0.18 && t < 0.57) {
      if (this._skillStep < 1) {
        this._skillStep = 1;
        this.fx.spawn('valkyrieSlipstreamTrail', this.x - this.facing * 18, this.y - 96, {
          follow: this,
          offsetX: -18,
          offsetY: -96,
          flip: this.facing < 0,
          palette: VALKYRIE_CRIMSON_PALETTE,
          maxDuration: 0.38,
          light: 1.1,
          extra: { length: 28, tilt: -0.06 }
        });
      }

      const uSkim = (t - 0.18) / 0.39;
      const easeX = uSkim < 0.5 ? 2 * uSkim * uSkim : 1 - Math.pow(-2 * uSkim + 2, 2) / 2;
      this.vx = 0;
      this.vy = 0;
      this.x = originX + (skimTargetX - originX) * easeX;
      this.y = this.groundY - Math.sin(uSkim * Math.PI) * 18;
      this.divePitchRad = 0;
      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }

      this.afterimageSpawnAccum += dt;
      if (this.afterimageSpawnAccum >= 0.045) {
        this.afterimageSpawnAccum = 0;
        const col = Math.min(18, Math.max(6, Math.floor((t / this.skillDuration) * 30)));
        this.spawnAfterimage(this.x, this.y, this.facing, 3, col, 0.22);
      }
    }

    const volleyTimes = [0.18, 0.24, 0.30, 0.36, 0.42, 0.48];
    const arcSpreads = [-85, 85, -55, 55, -28, 28];
    const verticalArcs = [-44, 20, -28, 14, -16, -6];

    while (
      this._skillJavelinsFired < volleyTimes.length &&
      t >= volleyTimes[this._skillJavelinsFired]
    ) {
      const idx = this._skillJavelinsFired;
      this._skillJavelinsFired++;
      const syOffsets = [-112, -74, -104, -80, -96, -88];
      const sx = this.x + this.facing * (18 + (idx % 3) * 10);
      const sy = this.y + syOffsets[idx];
      const tx =
        enemy && !enemy.isDead
          ? enemy.x + (idx - 2.5) * 12
          : this.x + this.facing * (280 + idx * 18);
      const ty = enemy && !enemy.isDead ? enemy.y - 72 : this.groundY - 72;

      this.spawnGungnirSkySpear(sx, sy, tx, ty, 15, false, arcSpreads[idx], verticalArcs[idx]);
      if (game?.audio) game.audio.play('holy_spear', sx);
    }

    if (t >= 0.57) {
      this.x = skimTargetX;
      this.y = this.groundY;
      this.divePitchRad = 0;

      if (!this.didSecondaryAction) {
        this.didSecondaryAction = true;
        const strikeX =
          enemy && !enemy.isDead
            ? Math.max(85, Math.min(ww - 85, enemy.x))
            : Math.max(85, Math.min(ww - 85, this.x + this.facing * 125));

        this.fx.spawn('gungnirSpearThrustCone', this.x + this.facing * 58, this.groundY - 90, {
          flip: false,
          palette: VALKYRIE_GOLD_PALETTE,
          light: 1.28,
          extra: { aimAngle: this.facing >= 0 ? 0 : Math.PI, radius: 32, twin: true }
        });
        this.fx.spawn('dragonfireObeliskPillar', strikeX, this.groundY, {
          palette: VALKYRIE_CRIMSON_PALETTE,
          light: 1.24,
          extra: { baseRadius: 16, height: 86, isUltimate: false }
        });

        if (game?.audio) game.audio.play('holy_spear', strikeX);
        if (game?.renderer) game.renderer.triggerShake(10, 0.18);
        if (game?.vfx) {
          game.vfx.spawnShockwave(strikeX, this.groundY - 6, 152, '#f43f5e', 0.32, true);
          game.vfx.spawnBurst(strikeX, this.groundY - 42, 16, '#fbbf24', 230, {
            upBias: 135,
            size: 5
          });
        }
        this.spawnVfxAnim(4, strikeX, this.groundY - 82, 208, 208, 0.34, {
          glowColor: 'gold',
          inFront: true
        });
        this.spawnVfxAnim(2, strikeX, this.groundY - 78, 212, 212, 0.36, {
          glowColor: 'crimson',
          inFront: false
        });

        const foes = this.getActiveEnemies(enemy, game);
        for (const foe of foes) {
          if (Math.abs(foe.x - strikeX) <= 172 || Math.abs(foe.x - this.x) <= 215) {
            foe.takeDamage(foe === enemy ? 46 : 34, this, true, 92, -68);
          }
        }
      }
    }

    if (t >= this.skillDuration) {
      this._skillJavelinsFired = 0;
      this.y = this.groundY;
      this.divePitchRad = 0;
      this.setState('IDLE');
    }
  }

  // ============================================================================
  // OVERDRIVE (`ULTIMATE`) - `BAHAMUT CATACLYSM` (`1.80s`)
  // ============================================================================

  updateUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    if (!this._spearsFired) this._spearsFired = 0;
    this.isInvulnerable = true;

    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const clampX = (xVal) => this._clampArenaX(xVal, game, 102);
    const originX = this._ultOriginX !== undefined ? this._ultOriginX : this.x;
    const enemyX = enemy && !enemy.isDead ? enemy.x : ww * 0.5 + this.facing * 180;
    this._ultTargetX = enemyX;

    if (!this.didActionFrame) {
      this.didActionFrame = true;
      this._ultOriginX = this.x;

      const openSide = enemyX >= ww * 0.5 ? -1 : 1;
      const outerEdgeX = clampX(enemyX + openSide * 265);
      const innerEdgeX = clampX(enemyX + openSide * 165);
      const midRunwayX = Math.round((outerEdgeX + innerEdgeX) * 0.5);

      this._ultWaypoints = {
        climb: { x: outerEdgeX, y: this.groundY - 54 },
        drift: { x: midRunwayX, y: this.groundY - 46 },
        land: { x: clampX(enemyX + openSide * 124), y: this.groundY }
      };

      this.bahamutAvatar = {
        x: this.x,
        y: this.y,
        life: 0,
        maxLife: 1.80
      };

      this.fx.spawn('valhallaGroundBurst', this.x, this.groundY, {
        palette: VALKYRIE_GOLD_PALETTE,
        light: 1.2,
        extra: { radius: 36 }
      });
      this.fx.spawn('valkyrieWingPlume', this.x - this.facing * 18, this.y - 120, {
        follow: this,
        offsetX: -18,
        offsetY: -120,
        flip: this.facing < 0,
        palette: VALKYRIE_CRIMSON_PALETTE,
        maxDuration: 1.54,
        light: 1.25,
        extra: { wingSpan: 34 }
      });
      this.fx.spawn('valkyrieHaloArray', this.x, this.y - 98, {
        follow: this,
        offsetX: 0,
        offsetY: -98,
        palette: VALKYRIE_GOLD_PALETTE,
        maxDuration: 1.44,
        light: 1.2,
        extra: { rx: 28, ry: 14 }
      });
      this.fx.spawn('valhallaTargetReticle', clampX(enemyX), this.groundY, {
        palette: VALKYRIE_CRIMSON_PALETTE,
        maxDuration: 1.52,
        light: 1.2,
        extra: { radius: 44, beaconH: 58, duration: 1.55 }
      });

      if (game?.vfx) {
        game.vfx.spawnSpecialCastAura(this, this.ultName, 'ULTIMATE OVERDRIVE', 'crimson', true);
        game.vfx.spawnShockwave(this.x, this.groundY - 4, 155, '#fbbf24', 0.34, true);
      }
    }

    if (t < 0.30) {
      this.vx = 0;
      this.vy = 0;
      this.x = originX;
      this.y = this.groundY;
      this.divePitchRad = 0;
      this.trueUltFrameOverride = 120 + Math.min(3, Math.floor((t / 0.30) * 4));
      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }
      return;
    }

    const wps = this._ultWaypoints || {
      climb: { x: clampX(originX - this.facing * 180), y: this.groundY - 54 },
      drift: { x: clampX(originX - this.facing * 110), y: this.groundY - 46 },
      land: { x: originX, y: this.groundY }
    };

    if (t >= 0.30 && t < 1.44) {
      this.vx = 0;
      this.vy = 0;
      const uGlide = Math.max(0, Math.min(0.999, (t - 0.30) / 1.14));
      const glideCol = 4 + Math.min(4, Math.floor(uGlide * 5));
      this.trueUltFrameOverride = 120 + glideCol;
      let spawnTrail = false;

      if (!this._ultPassCone1) {
        this._ultPassCone1 = true;
        this.fx.spawn('valkyrieSlipstreamTrail', this.x - this.facing * 18, this.y - 98, {
          follow: this,
          offsetX: -18,
          offsetY: -98,
          flip: this.facing < 0,
          palette: VALKYRIE_CRIMSON_PALETTE,
          maxDuration: 1.12,
          light: 1.18,
          extra: { length: 32, tilt: -0.1 }
        });
      }

      if (t < 0.68) {
        const u = (t - 0.30) / 0.38;
        const ease = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
        const dx = wps.climb.x - originX;
        this.x = originX + dx * ease;
        this.y = this.groundY + (wps.climb.y - this.groundY) * ease;
        this.facing = Math.abs(dx) > 25 ? (dx >= 0 ? 1 : -1) : enemyX >= this.x ? 1 : -1;
        this.divePitchRad = -0.17;
        spawnTrail = true;
      } else if (t < 1.10) {
        const u = (t - 0.68) / 0.42;
        const ease = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
        this.x = wps.climb.x + (wps.drift.x - wps.climb.x) * ease;
        this.y = wps.climb.y + (wps.drift.y - wps.climb.y) * ease;
        this.facing = enemyX >= this.x ? 1 : -1;
        this.divePitchRad = -0.04;
        if (this._ultStep < 1 && u >= 0.25) {
          this._ultStep = 1;
          this.spawnVfxAnim(0, this.x + this.facing * 38, this.y - 84, 208, 208, 0.28, {
            vx: this.facing * 260,
            flipX: this.facing < 0,
            glowColor: 'gold'
          });
        }
      } else {
        const u = (t - 1.10) / 0.34;
        const ease = u * u * (3 - 2 * u);
        this.x = wps.drift.x + (wps.land.x - wps.drift.x) * ease;
        this.y = wps.drift.y + (wps.land.y - wps.drift.y) * ease;
        this.facing = enemyX >= this.x ? 1 : -1;
        this.divePitchRad = 0.17;
        spawnTrail = true;

        if (!this._ultPassCone3) {
          this._ultPassCone3 = true;
          this.fx.spawn('gungnirSpearThrustCone', this.x + this.facing * 36, this.y - 86, {
            flip: false,
            palette: VALKYRIE_GOLD_PALETTE,
            light: 1.2,
            extra: { aimAngle: this.facing >= 0 ? 0.16 : Math.PI - 0.16, radius: 28, twin: true }
          });
        }
      }

      if (spawnTrail) {
        this.afterimageSpawnAccum += dt;
        if (this.afterimageSpawnAccum >= 0.034) {
          this.afterimageSpawnAccum = 0;
          this.spawnAfterimage(this.x, this.y, this.facing, 4, glideCol, 0.24);
        }
      }

      const spearInterval = 0.082;
      const expectedSpears = Math.min(12, Math.floor(Math.max(0, t - 0.34) / spearInterval) + 1);
      while (this._spearsFired < expectedSpears) {
        const idx = this._spearsFired;
        this._spearsFired++;

        const sySlots = [-124, -76, -114, -84, -104, -92, -128, -72, -110, -80, -118, -88];
        const sx = this.x + this.facing * (14 + (idx % 4) * 10);
        const sy = this.y + sySlots[idx % sySlots.length];

        const arcSpreadSlots = [-95, 95, -65, 65, -35, 35, -115, 115, -45, 45, -80, 80];
        const vArcSlots = [-56, 18, -42, 12, -28, -8, -62, 22, -34, 8, -48, 14];

        const tx =
          enemy && !enemy.isDead
            ? enemy.x + (Math.random() - 0.5) * 76
            : ww * 0.5 + (idx - 5.5) * 58;
        const ty = enemy && !enemy.isDead ? enemy.y - 44 : this.groundY - 44;
        const clampedTx = Math.max(90, Math.min(ww - 90, tx));

        this.spawnGungnirSkySpear(
          sx,
          sy,
          clampedTx,
          ty,
          14,
          true,
          arcSpreadSlots[idx % arcSpreadSlots.length],
          vArcSlots[idx % vArcSlots.length]
        );
        if (game?.audio) game.audio.play('holy_spear', sx);
      }
      return;
    }

    this.x = wps.land.x;
    this.y = this.groundY;
    this.divePitchRad = 0;
    this.trueUltFrameOverride = 145 + Math.min(4, Math.floor(Math.max(0, (t - 1.44) / 0.36) * 5));
    if (enemy && !enemy.isDead) {
      this.facing = enemy.x >= this.x ? 1 : -1;
    }

    if (!this.didSecondaryAction) {
      this.didSecondaryAction = true;
      const impactX = Math.max(90, Math.min(ww - 90, enemy && !enemy.isDead ? enemy.x : ww * 0.5));

      if (game?.audio) game.audio.play('dragon_dive', impactX);
      if (game?.renderer) {
        game.renderer.triggerShake(16, 0.30);
        game.renderer.triggerAberration(9);
        game.renderer.triggerHitStop(0.065);
      }

      this.fx.spawn('gungnirSpearThrustCone', this.x + this.facing * 50, this.groundY - 92, {
        flip: false,
        palette: VALKYRIE_GOLD_PALETTE,
        light: 1.3,
        extra: { aimAngle: this.facing >= 0 ? 0 : Math.PI, radius: 34, twin: true }
      });
      this.fx.spawn('valhallaGroundBurst', this.x, this.groundY, {
        palette: VALKYRIE_GOLD_PALETTE,
        light: 1.15,
        extra: { radius: 30 }
      });
      this.fx.spawn('dragonfireObeliskPillar', impactX, this.groundY, {
        palette: VALKYRIE_CRIMSON_PALETTE,
        light: 1.35,
        extra: { baseRadius: 19, height: 92, isUltimate: true }
      });
      for (const sideOff of [-110, 110]) {
        const flankX = Math.max(85, Math.min(ww - 85, impactX + sideOff));
        this.fx.spawn('dragonfireObeliskPillar', flankX, this.groundY, {
          palette: VALKYRIE_GOLD_PALETTE,
          light: 1.2,
          extra: { baseRadius: 14, height: 76, isUltimate: false }
        });
      }

      if (game?.vfx) {
        game.vfx.spawnShockwave(this.x, this.groundY - 4, 128, '#fbbf24', 0.30, true);
        game.vfx.spawnShockwave(impactX, this.groundY - 6, 265, '#fbbf24', 0.44, true);
        game.vfx.spawnBurst(impactX, this.groundY - 58, 28, '#f43f5e', 320, {
          upBias: 195,
          size: 6
        });
        game.vfx.spawnDamageText(
          impactX,
          this.groundY - 178,
          0,
          true,
          'BAHAMUT CATACLYSM!',
          '#fbbf24'
        );
      }

      this.spawnVfxAnim(4, impactX, this.groundY - 96, 236, 236, 0.42, {
        glowColor: 'gold',
        inFront: true
      });
      this.spawnVfxAnim(7, impactX, this.groundY - 132, 248, 320, 0.46, {
        glowColor: 'crimson',
        inFront: false
      });

      const foes = this.getActiveEnemies(enemy, game);
      for (const foe of foes) {
        if (Math.abs(foe.x - impactX) <= 235) {
          foe.takeDamage(foe === enemy ? 86 : 64, this, true, 235, -245);
        }
      }
    }

    if (t >= this.ultDuration) {
      this._spearsFired = 0;
      this.bahamutAvatar = null;
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      this.y = this.groundY;
      this.divePitchRad = 0;
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  // ============================================================================
  // SUPREME ULTIMATE (`TRUE_ULTIMATE`) - `TWILIGHT OF RAGNAROK: GUNGNIR` (`4.35s`)
  // ============================================================================

  updateTrueUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    const ww = game?.renderer?.worldWidth || 1600;

    this.isInvulnerable = true;
    this.unstoppablePoise = true;
    this.isFlipVault = false;
    this.isCrouching = false;
    this.isBlinkTeleport = false;
    this.vx = 0;
    this.vy = 0;

    const foes = this.getActiveEnemies(enemy, game);
    let focusEnemy = enemy && !enemy.isDead && !enemy.isBenched ? enemy : null;
    if (!focusEnemy && foes.length > 0) {
      let bestDist = Infinity;
      for (const f of foes) {
        const d = Math.abs(f.x - this.x);
        if (d < bestDist) {
          bestDist = d;
          focusEnemy = f;
        }
      }
    }

    if (!this._trueUltInit) {
      this._trueUltInit = true;
      this._trueUltStep = 0;
      this._trueUltLancesSpawned = 0;
      this._trueUltOriginX = this.x;
      this._trueUltDiveStartX = this.x;
      this._trueUltLandX = this.x;
      this._trueUltAfterimageAcc = 0;

      const initTargetX = focusEnemy
        ? Math.max(150, Math.min(ww - 150, focusEnemy.x))
        : Math.max(150, Math.min(ww - 150, this.x + this.facing * 320));
      this._trueUltTargetX = initTargetX;
      if (Math.abs(initTargetX - this.x) > 8) {
        this.facing = initTargetX >= this.x ? 1 : -1;
      }

      if (game?.audio) {
        game.audio.play('ult_cast', this.x);
        game.audio.play('holy_spear', initTargetX);
      }
      if (game?.renderer) {
        game.renderer.ultDim = Math.max(game.renderer.ultDim || 0, 0.48);
        game.renderer.triggerShake(8, 0.22);
      }

      this.bahamutAvatar = {
        x: this.x,
        y: this.y,
        life: 0,
        maxLife: 3.16
      };
      this.ragnarokSeal = {
        x: initTargetX,
        y: this.groundY - 4,
        age: 0,
        skyAlpha: 1.0,
        shattered: false
      };
      this.einherjarSkyLances = [];
      this.ragnarokDiveBeam = null;
      this.ragnarokPillars = [];

      this.fx.spawn('valkyrieWingPlume', this.x, this.y - 92, {
        key: 'valkyrieWingPlume',
        follow: this,
        offsetX: -14,
        offsetY: -92,
        flip: this.facing < 0,
        palette: VALKYRIE_CRIMSON_PALETTE,
        light: 1.02,
        extra: { wingSpan: 26 }
      });
      this.fx.spawn('valkyrieHaloArray', this.x, this.y - 104, {
        key: 'valkyrieHaloArray',
        follow: this,
        offsetX: -4,
        offsetY: -104,
        maxDuration: 0.78,
        flip: false,
        palette: VALKYRIE_GOLD_PALETTE,
        light: 1.08,
        extra: { rx: 24, ry: 10 }
      });
      this.fx.spawn('valkyrieSlipstreamTrail', this.x, this.y - 68, {
        key: 'valkyrieSlipstreamTrail',
        follow: this,
        offsetX: -12,
        offsetY: -68,
        maxDuration: 0.92,
        flip: this.facing < 0,
        palette: VALKYRIE_CRIMSON_PALETTE,
        light: 1.05,
        extra: { length: 30, tilt: -0.95 }
      });
      this.fx.spawn('valhallaGroundBurst', this.x, this.groundY, {
        palette: VALKYRIE_GOLD_PALETTE,
        light: 1.25,
        extra: { radius: 34 }
      });
      this.fx.spawn('valhallaTargetReticle', initTargetX, this.groundY, {
        palette: VALKYRIE_GOLD_PALETTE,
        light: 1.25,
        extra: { radius: 44, beaconH: 68, duration: 2.95 }
      });

      if (game?.vfx) {
        game.vfx.spawnShockwave(this.x, this.groundY - 4, 155, '#fbbf24', 0.34, true);
        game.vfx.spawnShockwave(initTargetX, this.groundY - 4, 165, '#f43f5e', 0.36, true);
        game.vfx.spawnDamageText(
          this.x,
          this.groundY - 168,
          0,
          true,
          'TWILIGHT OF RAGNAROK: GUNGNIR',
          '#fbbf24'
        );
      }
    }

    if (game?.renderer && t < 3.60) {
      const dimTarget = t <= 3.10 ? 0.48 : 0.48 * Math.max(0, 1 - (t - 3.10) / 0.50);
      game.renderer.ultDim = Math.max(game.renderer.ultDim || 0, dimTarget);
    }

    if (t < 2.65 && focusEnemy && !focusEnemy.isDead) {
      const desiredX = Math.max(150, Math.min(ww - 150, focusEnemy.x));
      const trackSpeed = t < 1.10 ? 9.5 : 4.2;
      this._trueUltTargetX += (desiredX - this._trueUltTargetX) * Math.min(1, dt * trackSpeed);
      if (Math.abs(this._trueUltTargetX - this.x) > 12) {
        this.facing = this._trueUltTargetX >= this.x ? 1 : -1;
      }
    }
    const targetX = this._trueUltTargetX;

    if (this.ragnarokSeal) {
      this.ragnarokSeal.age += dt;
      if (!this.ragnarokSeal.shattered) {
        this.ragnarokSeal.x = targetX;
      }
      this.ragnarokSeal.skyAlpha = t < 2.82 ? Math.min(1, t / 0.35) : Math.max(0, 1 - (t - 2.82) / 0.24);
    }

    for (let i = this.einherjarSkyLances.length - 1; i >= 0; i--) {
      const lance = this.einherjarSkyLances[i];
      lance.age += dt;
      if (!lance.impacted) {
        const uFall = Math.min(1, lance.age / lance.fallDuration);
        const easeFall = uFall * uFall * (0.4 + 0.6 * uFall);
        lance.x = lance.startX + (lance.targetX - lance.startX) * easeFall;
        lance.y = lance.startY + (lance.pinY - lance.startY) * easeFall;
        if (uFall >= 1) {
          lance.impacted = true;
          lance.x = lance.targetX;
          lance.y = lance.pinY;
          if (game?.audio) game.audio.play('holy_spear', lance.targetX);
          if (game?.renderer) {
            game.renderer.triggerShake(6, 0.14);
            game.renderer.triggerHitStop(0.02);
          }
          this.fx.spawn('gungnirImpactStarburst', lance.targetX, this.groundY - 58, {
            flip: false,
            palette: lance.index % 2 === 0 ? VALKYRIE_GOLD_PALETTE : VALKYRIE_CRIMSON_PALETTE,
            light: 1.22,
            extra: { aimAngle: Math.PI * 0.5, isCrit: true }
          });
          if (game?.vfx) {
            game.vfx.spawnShockwave(lance.targetX, this.groundY - 4, 118, '#fbbf24', 0.24, true);
            game.vfx.spawnBurst(lance.targetX, this.groundY - 44, 10, '#f43f5e', 210, {
              upBias: 95,
              size: 4
            });
          }
          let hitAny = false;
          for (const foe of foes) {
            if (foe && !foe.isDead && !foe.isBenched && Math.abs(foe.x - targetX) < 190) {
              foe.takeDamage(25, this, false, 18, -32);
              foe.vx = (targetX - foe.x) * 3.2;
              foe.x += (targetX - foe.x) * 0.34;
              hitAny = true;
            }
          }
          if (!hitAny && focusEnemy && !focusEnemy.isDead) {
            focusEnemy.takeDamage(25, this, false, 18, -32);
            focusEnemy.vx = (targetX - focusEnemy.x) * 3.2;
            focusEnemy.x += (targetX - focusEnemy.x) * 0.34;
          }
        }
      }
      if (lance.shatterAge !== undefined) {
        lance.shatterAge += dt;
        if (lance.shatterAge >= 0.30) {
          this.einherjarSkyLances.splice(i, 1);
        }
      }
    }

    if (t >= 1.14 && t < 3.10 && focusEnemy && !focusEnemy.isDead && this.einherjarSkyLances.length > 0) {
      const drift = focusEnemy.x - targetX;
      if (Math.abs(drift) > 44) {
        focusEnemy.x -= Math.sign(drift) * Math.min(Math.abs(drift) - 44, dt * 360);
      }
      focusEnemy.vx *= 0.2;
    }

    for (let i = this.ragnarokPillars.length - 1; i >= 0; i--) {
      const p = this.ragnarokPillars[i];
      p.age += dt;
      if (p.age >= p.maxLife) {
        this.ragnarokPillars.splice(i, 1);
      }
    }

    if (this.ragnarokDiveBeam) {
      this.ragnarokDiveBeam.age += dt;
      if (this.ragnarokDiveBeam.age >= this.ragnarokDiveBeam.maxLife) {
        this.ragnarokDiveBeam = null;
      }
    }

    // PHASE 1 (0.00s..1.10s): Ascend 410px into the Heavens & Lock Row 5 Seal
    if (t < 1.10) {
      if (t < 0.22) {
        const uPrep = t / 0.22;
        this.y = this.groundY;
        this.cameraAirLift = 0;
        this.trueUltFrameOverride = 120 + Math.min(3, Math.floor(uPrep * 4));
      } else {
        const uAsc = Math.min(1, (t - 0.22) / 0.88);
        const easeAsc = 1 - Math.pow(1 - uAsc, 3);
        const lift = 410 * easeAsc;
        this.y = this.groundY - lift;
        this.cameraAirLift = lift;
        const driftTowardArena =
          this._trueUltOriginX + (targetX - this.facing * 235 - this._trueUltOriginX) * (easeAsc * 0.65);
        this.x = Math.max(105, Math.min(ww - 105, driftTowardArena));
        const ascCol = 9 + Math.min(3, Math.floor(uAsc * 4));
        this.trueUltFrameOverride = 120 + ascCol;

        this._trueUltAfterimageAcc += dt;
        if (this._trueUltAfterimageAcc >= 0.055) {
          this._trueUltAfterimageAcc = 0;
          this.spawnAfterimage(this.x, this.y, this.facing, 4, ascCol, 0.20);
        }
      }

      if (t >= 0.36 && this._trueUltStep < 1) {
        this._trueUltStep = 1;
        if (game?.audio) game.audio.play('holy_spear', targetX);
        if (game?.vfx) {
          game.vfx.spawnShockwave(targetX, this.groundY - 4, 195, '#fbbf24', 0.32, true);
        }
      }
      return;
    }

    // PHASE 2 (1.10s..2.55s): Poised Twin-Winged Sky-Sovereign Hover & 6x Einherjar Sky-Lance Rain
    if (t < 2.55) {
      const hoverT = t - 1.10;
      if (hoverT < 0.06) {
        this.fx.stopByKey('valkyrieSlipstreamTrail');
      }
      this.y = this.groundY - 410 + Math.sin(hoverT * 6.5) * 6;
      this.cameraAirLift = 410;

      const lanceSchedule = [1.14, 1.36, 1.58, 1.80, 2.02, 2.24];
      const ringOffsets = [-94, 94, -58, 58, -24, 24];
      const ringDepths = [-6, -6, 4, 4, -2, 6];

      while (
        this._trueUltLancesSpawned < 6 &&
        t >= lanceSchedule[this._trueUltLancesSpawned]
      ) {
        const idx = this._trueUltLancesSpawned;
        this._trueUltLancesSpawned++;
        const offsetX = ringOffsets[idx];
        const depthY = ringDepths[idx];
        const pinX = Math.max(95, Math.min(ww - 95, targetX + offsetX));
        const startX = pinX + (idx % 2 === 0 ? -22 : 22);
        const startY = this.groundY - 485;
        const pinY = this.groundY - 92 + depthY;
        const spearTipX = this.x + this.facing * 72;
        const spearTipY = this.y - 48;
        const shotAng = Math.atan2(pinY - spearTipY, pinX - spearTipX);

        this.einherjarSkyLances.push({
          index: idx,
          startX,
          startY,
          targetX: pinX,
          pinY,
          cmdOriginX: spearTipX,
          cmdOriginY: spearTipY,
          x: startX,
          y: startY,
          inFront: depthY > 0,
          age: 0,
          fallDuration: 0.16,
          impacted: false
        });

        this.fx.spawn('gungnirImpactStarburst', spearTipX, spearTipY, {
          flip: false,
          palette: idx % 2 === 0 ? VALKYRIE_GOLD_PALETTE : VALKYRIE_CRIMSON_PALETTE,
          light: 1.12,
          extra: { aimAngle: shotAng, isCrit: false }
        });
      }

      if (this._trueUltLancesSpawned === 0) {
        this.trueUltFrameOverride = t < 1.12 ? 133 : 134;
      } else {
        const lastFireT = lanceSchedule[this._trueUltLancesSpawned - 1];
        const shotDt = Math.max(0, t - lastFireT);
        if (shotDt < 0.045) this.trueUltFrameOverride = 135;
        else if (shotDt < 0.095) this.trueUltFrameOverride = 136;
        else if (shotDt < 0.145) this.trueUltFrameOverride = 137;
        else if (shotDt < 0.185 || this._trueUltLancesSpawned >= 6) this.trueUltFrameOverride = 138;
        else if (shotDt < 0.205) this.trueUltFrameOverride = 133;
        else this.trueUltFrameOverride = 134;
      }
      return;
    }

    // PHASE 3 (2.55s..4.35s): Apex Convergence, Steep Diagonal Falcon Spear-Dive, +12% Heal, 555 Crit & Backflip!
    if (t < 2.80) {
      if (this._trueUltStep < 2) {
        this._trueUltStep = 2;
        this._trueUltDiveStartX = this.x;
        this._trueUltLandX = Math.max(105, Math.min(ww - 105, targetX - this.facing * 52));
        this.facing = targetX >= this._trueUltDiveStartX ? 1 : -1;
        if (game?.audio) {
          game.audio.play('ult_cast', this.x);
          game.audio.play('storm_leap', this.x);
        }
        this.fx.spawn('gungnirSpearFocus', this.x + this.facing * 68, this.y - 50, {
          follow: this,
          offsetX: 68,
          offsetY: -50,
          flip: this.facing < 0,
          palette: VALKYRIE_GOLD_PALETTE,
          light: 1.28,
          extra: { charge: 1.0, twin: true }
        });
      }
      const uCharge = (t - 2.55) / 0.25;
      this.y = this.groundY - 410 - Math.sin(uCharge * Math.PI) * 14;
      this.cameraAirLift = 410;
      this.trueUltFrameOverride = uCharge < 0.5 ? 139 : 140;
      return;
    }

    if (t < 3.10) {
      if (this._trueUltStep < 3) {
        this._trueUltStep = 3;
        if (game?.audio) game.audio.play('dash_whoosh', this.x);
        const dxDive = targetX - this._trueUltDiveStartX;
        const dyDive = 410;
        const diveAng = Math.atan2(dyDive, dxDive);
        this.fx.spawn('gungnirSpearThrustCone', this.x + this.facing * 56, this.y - 40, {
          follow: this,
          offsetX: 56,
          offsetY: -40,
          flip: false,
          palette: VALKYRIE_GOLD_PALETTE,
          light: 1.32,
          extra: { aimAngle: diveAng, radius: 30, twin: true }
        });
        this.ragnarokDiveBeam = {
          x0: this._trueUltDiveStartX + this.facing * 24,
          y0: this.groundY - 436,
          x1: targetX,
          y1: this.groundY - 8,
          headX: this._trueUltDiveStartX + this.facing * 64,
          headY: this.groundY - 446,
          age: 0,
          maxLife: 0.54
        };
      }

      const uDive = Math.min(1, (t - 2.80) / 0.30);
      const easeDive = uDive * uDive * (0.35 + 0.65 * uDive);
      this.x = this._trueUltDiveStartX + (this._trueUltLandX - this._trueUltDiveStartX) * easeDive;
      this.y = this.groundY - 410 * (1 - easeDive);
      this.cameraAirLift = 410 * (1 - easeDive);
      const diveCol = 21 + Math.min(3, Math.floor(uDive * 4));
      this.trueUltFrameOverride = 120 + diveCol;

      if (this.ragnarokDiveBeam) {
        this.ragnarokDiveBeam.headX = this.x + this.facing * 64;
        this.ragnarokDiveBeam.headY = this.y - 36;
      }

      this._trueUltAfterimageAcc += dt;
      if (this._trueUltAfterimageAcc >= 0.025) {
        this._trueUltAfterimageAcc = 0;
        this.spawnAfterimage(this.x, this.y, this.facing, 4, diveCol, 0.24);
      }
      return;
    }

    // t >= 3.10s: GROUND-ZERO GUNGNIR RAGNAROK DETONATION!
    if (this._trueUltStep < 4) {
      this._trueUltStep = 4;
      this.x = this._trueUltLandX;
      this.y = this.groundY;
      this.cameraAirLift = 0;
      this.facing = targetX >= this.x ? 1 : -1;

      if (this.ragnarokDiveBeam) {
        this.ragnarokDiveBeam.headX = targetX;
        this.ragnarokDiveBeam.headY = this.groundY - 6;
      }
      if (this.ragnarokSeal) {
        this.ragnarokSeal.shattered = true;
      }
      for (const lance of this.einherjarSkyLances) {
        lance.impacted = true;
        lance.shatterAge = 0;
      }

      if (game?.audio) {
        game.audio.play('dragon_dive', targetX);
        game.audio.play('thunder_slam', targetX);
        game.audio.play('hit_crit', targetX);
      }
      if (game?.renderer) {
        game.renderer.triggerImpactFrame?.(targetX, this.groundY - 90, 0.15, 'crimson');
        game.renderer.triggerShake(22, 0.38);
        game.renderer.triggerAberration(12);
        game.renderer.triggerHitStop(0.08);
      }

      const pillarSpecs = [
        { x: targetX, w: 284, h: 428, maxLife: 0.96, glow: 'gold', inFront: true },
        { x: Math.max(90, targetX - 118), w: 232, h: 360, maxLife: 0.88, glow: 'crimson', inFront: false },
        { x: Math.min(ww - 90, targetX + 118), w: 232, h: 360, maxLife: 0.88, glow: 'crimson', inFront: false }
      ];
      for (const ps of pillarSpecs) {
        this.ragnarokPillars.push({
          x: ps.x,
          groundY: this.groundY,
          w: ps.w,
          h: ps.h,
          age: 0,
          maxLife: ps.maxLife,
          glowColor: ps.glow,
          inFront: ps.inFront
        });
        this.fx.spawn('dragonfireObeliskPillar', ps.x, this.groundY, {
          palette: ps.glow === 'gold' ? VALKYRIE_GOLD_PALETTE : VALKYRIE_CRIMSON_PALETTE,
          light: 1.4,
          extra: { baseRadius: ps.glow === 'gold' ? 22 : 16, height: ps.glow === 'gold' ? 98 : 82, isUltimate: true }
        });
      }

      this.fx.spawn('valhallaGroundBurst', targetX, this.groundY, {
        palette: VALKYRIE_GOLD_PALETTE,
        light: 1.35,
        extra: { radius: 42 }
      });
      this.fx.spawn('gungnirSpearThrustCone', this.x + this.facing * 48, this.groundY - 88, {
        flip: false,
        palette: VALKYRIE_GOLD_PALETTE,
        light: 1.35,
        extra: { aimAngle: this.facing >= 0 ? 0 : Math.PI, radius: 36, twin: true }
      });

      if (game?.vfx) {
        game.vfx.spawnShockwave(targetX, this.groundY - 6, 320, '#fbbf24', 0.48, true);
        game.vfx.spawnShockwave(targetX, this.groundY - 6, 220, '#f43f5e', 0.36, true);
        game.vfx.spawnSlash(targetX, this.groundY - 84, 220, -Math.PI, Math.PI, '#fbbf24', 0.42);
        game.vfx.spawnBurst(targetX, this.groundY - 64, 34, '#f43f5e', 350, {
          upBias: 220,
          size: 6
        });
        game.vfx.spawnDamageText(
          targetX,
          this.groundY - 196,
          0,
          true,
          'TWILIGHT OF RAGNAROK!',
          '#fbbf24'
        );
      }

      this.heal(Math.round(this.maxHp * 0.12), 'VALHALLA GRACE');

      let hitFinisher = false;
      for (const foe of foes) {
        if (foe && !foe.isDead && !foe.isBenched && Math.abs(foe.x - targetX) < 250) {
          foe.takeDamage(555, this, true, 265, -275);
          hitFinisher = true;
        }
      }
      if (!hitFinisher && focusEnemy && !focusEnemy.isDead) {
        focusEnemy.takeDamage(555, this, true, 265, -275);
      }
    }

    if (t < 3.34) {
      const uHold = (t - 3.10) / 0.24;
      this.y = this.groundY;
      this.trueUltFrameOverride = 145 + Math.min(3, Math.floor(uHold * 4));
      return;
    }

    if (t < 4.06) {
      if (this._trueUltStep < 5) {
        this._trueUltStep = 5;
        this._trueUltFlipStartX = this.x;
        this._trueUltFlipEndX = Math.max(95, Math.min(ww - 95, this.x - this.facing * 150));
        if (game?.audio) game.audio.play('dash_whoosh', this.x);
        this.fx.spawn('valhallaGroundBurst', this.x, this.groundY, {
          palette: VALKYRIE_CRIMSON_PALETTE,
          light: 1.05,
          extra: { radius: 22 }
        });
      }
      const uFlip = Math.min(1, (t - 3.34) / 0.72);
      const easeX = 1 - Math.pow(1 - uFlip, 2);
      this.x = this._trueUltFlipStartX + (this._trueUltFlipEndX - this._trueUltFlipStartX) * easeX;
      this.y = this.groundY - Math.sin(uFlip * Math.PI) * 94;
      this.trueUltFrameOverride = 212 + Math.min(20, Math.floor(uFlip * 21));

      this._trueUltAfterimageAcc += dt;
      if (this._trueUltAfterimageAcc >= 0.06 && uFlip < 0.85) {
        this._trueUltAfterimageAcc = 0;
        this.spawnAfterimage(this.x, this.y, this.facing, 7, 2 + Math.min(18, Math.floor(uFlip * 19)), 0.20);
      }
      return;
    }

    this.y = this.groundY;
    this.cameraAirLift = 0;
    const uRec = Math.min(1, (t - 4.06) / 0.29);
    this.trueUltFrameOverride = 233 + Math.min(6, Math.floor(uRec * 7));

    if (t >= this.trueUltDuration) {
      this.y = this.groundY;
      this.divePitchRad = 0;
      this.cameraAirLift = 0;
      this.isInvulnerable = false;
      this.unstoppablePoise = false;
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      this.bahamutAvatar = null;
      this.ragnarokSeal = null;
      this.einherjarSkyLances = [];
      this.ragnarokDiveBeam = null;
      this.ragnarokPillars = [];
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
    glowColor = 'crimson'
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
      glowColor === 'gold' ? renderer?.glowGold || renderer?.glowCrimson : renderer?.glowCrimson;
    if (glowSprite) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, alpha * 0.38);
      const gw = Math.round(w * 1.15);
      const gh = Math.round(h * 1.15);
      ctx.drawImage(glowSprite, -gw * 0.5, -gh * 0.5, gw, gh);
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.drawImage(vfxSheet, sx, sy, cell, cell, -w * 0.5, -h * 0.5, w, h);

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, alpha * 0.44);
    ctx.drawImage(vfxSheet, sx, sy, cell, cell, -w * 0.5, -h * 0.5, w, h);

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

        ctx.fillStyle = s.isGold ? '#b45309' : '#be123c';
        ctx.fillRect(px - rad, py - rad, rad * 2, rad * 2);
        const mid = Math.max(2, rad - 2);
        ctx.fillStyle = s.isGold ? '#fde047' : '#fb7185';
        ctx.fillRect(px - mid, py - mid, mid * 2, mid * 2);
        if (taper > 0.35) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(px - 2, py - 2, 4, 4);
        }
      }
    }
    ctx.restore();
  }

  drawRagnarokLancesLayer(ctx, vfxSheet, renderer, inFrontPass) {
    if (!this.einherjarSkyLances || this.einherjarSkyLances.length === 0) return;
    const hasVfx = Boolean(vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth);

    for (const lance of this.einherjarSkyLances) {
      if (Boolean(lance.inFront) !== inFrontPass) continue;
      const col = Math.floor(lance.age * 30) % 30;
      const shatterFade =
        lance.shatterAge !== undefined ? Math.max(0, 1 - lance.shatterAge / 0.30) : 1.0;
      if (shatterFade <= 0.02) continue;

      if (lance.cmdOriginX !== undefined && lance.age < 0.14) {
        const cmdAlpha = (1 - lance.age / 0.14) * 0.92 * shatterFade;
        const ox = Math.round(lance.cmdOriginX);
        const oy = Math.round(lance.cmdOriginY);
        const tx = Math.round(lance.x);
        const ty = Math.round(lance.y);
        const dx = tx - ox;
        const dy = ty - oy;
        const dist = Math.hypot(dx, dy) || 1;
        const nx = -dy / dist;
        const ny = dx / dist;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = cmdAlpha * 0.46;
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.moveTo(ox + nx * 6, oy + ny * 6);
        ctx.lineTo(tx + nx * 2, ty + ny * 2);
        ctx.lineTo(tx - nx * 2, ty - ny * 2);
        ctx.lineTo(ox - nx * 6, oy - ny * 6);
        ctx.closePath();
        ctx.fill();

        ctx.globalAlpha = cmdAlpha * 0.88;
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.moveTo(ox + nx * 2.5, oy + ny * 2.5);
        ctx.lineTo(tx, ty);
        ctx.lineTo(ox - nx * 2.5, oy - ny * 2.5);
        ctx.closePath();
        ctx.fill();

        const glintR = Math.round(14 * (1 - lance.age / 0.14) + 5);
        ctx.globalAlpha = cmdAlpha;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(ox - glintR, oy - 1, glintR * 2, 3);
        ctx.fillRect(ox - 1, oy - glintR, 3, glintR * 2);
        ctx.restore();
      }

      if (lance.age < 0.42) {
        const wakeAlpha = (1 - lance.age / 0.42) * 0.72 * shatterFade;
        const x0 = Math.round(lance.startX ?? lance.x);
        const y0 = Math.round(lance.startY);
        const x1 = Math.round(lance.x);
        const y1 = Math.round(lance.y + 24);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = wakeAlpha * 0.52;
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1 - 9, y1);
        ctx.lineTo(x1, y1 + 14);
        ctx.lineTo(x1 + 9, y1);
        ctx.closePath();
        ctx.fill();

        ctx.globalAlpha = wakeAlpha * 0.90;
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1 - 3, y1);
        ctx.lineTo(x1, y1 + 10);
        ctx.lineTo(x1 + 3, y1);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      if (hasVfx) {
        const scalePulse = lance.shatterAge !== undefined ? 1 + lance.shatterAge * 1.2 : 1.0;
        // Row 6 `einherjarSkyLanceCell` is baked upright pointing straight downward (+Y) -> zero ctx.rotate!
        this.drawBloomedVfxCell(
          ctx,
          vfxSheet,
          6,
          col,
          lance.x,
          lance.y,
          Math.round(212 * scalePulse),
          Math.round(236 * scalePulse),
          0.95 * shatterFade,
          lance.index % 2 === 1,
          renderer,
          lance.index % 2 === 0 ? 'gold' : 'crimson'
        );
      }
    }
  }

  drawRagnarokPillarsLayer(ctx, vfxSheet, renderer, inFrontPass) {
    if (!this.ragnarokPillars || this.ragnarokPillars.length === 0) return;
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;
    for (const p of this.ragnarokPillars) {
      if (Boolean(p.inFront) !== inFrontPass) continue;
      const u = Math.min(1, Math.max(0, p.age / p.maxLife));
      const col = Math.min(29, Math.floor(u * 30));
      const fade = u > 0.78 ? (1 - u) / 0.22 : 1.0;
      const anchorY = p.groundY - p.h * (37 / 104);
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        7,
        col,
        p.x,
        anchorY,
        p.w,
        p.h,
        fade * 0.96,
        false,
        renderer,
        p.glowColor
      );
    }
  }

  drawForegroundOverlay(ctx, renderer = null) {
    const sprites = this.getExSprites();
    const sheet = PixelForge.ensureImage(sprites?.sheet);
    const vfxSheet = PixelForge.ensureImage(sprites?.vfx);
    const hasVfx = Boolean(vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    if (this.ragnarokSeal) {
      const s = this.ragnarokSeal;
      const col = Math.floor(s.age * 30) % 30;
      const deploy = Math.min(1, s.age / 0.22);
      const sealAlpha = s.shattered ? Math.max(0, 1 - (this.stateTimer - 3.10) / 0.35) : 0.94 * deploy;

      if (sealAlpha > 0.02 && hasVfx) {
        const cell = 208;
        const sx = col * cell;
        const sy = 5 * cell;
        const sealW = Math.round(330 * (0.55 + 0.45 * deploy));
        const sealH = Math.round(330 * (0.55 + 0.45 * deploy));

        ctx.save();
        ctx.translate(Math.round(s.x), Math.round(s.y));
        ctx.scale(1, 0.34);
        if (renderer?.glowCrimson) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = sealAlpha * 0.42;
          ctx.drawImage(renderer.glowCrimson, -sealW * 0.6, -sealH * 0.6, sealW * 1.2, sealH * 1.2);
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = sealAlpha;
        ctx.drawImage(vfxSheet, sx, sy, cell, cell, -sealW * 0.5, -sealH * 0.5, sealW, sealH);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = sealAlpha * 0.55;
        ctx.drawImage(vfxSheet, sx, sy, cell, cell, -sealW * 0.5, -sealH * 0.5, sealW, sealH);
        ctx.restore();
      }

      if (s.skyAlpha > 0.03 && this.y < this.groundY - 40) {
        const cell = 208;
        const haloCol = (col + 15) % 30;
        const hx = Math.round(this.x - this.facing * 8);
        const hy = Math.round(this.y - 114);
        ctx.save();
        if (hasVfx) {
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = s.skyAlpha * 0.22;
          ctx.drawImage(vfxSheet, haloCol * cell, 5 * cell, cell, cell, hx - 98, hy - 98, 196, 196);
        }

        // Pixel-stepped 2.5D Golden Valkyrie Crown Halo above Freyja EX's winged helm (ZERO ctx.ellipse!)
        if (this.stateTimer < 2.80 && this.y < this.groundY - 80) {
          const crownX = Math.round((this.x - this.facing * 2) / 2) * 2;
          const crownY = Math.round((this.y - 158) / 2) * 2;
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = s.skyAlpha * 0.78;
          ctx.fillStyle = '#fbbf24';
          for (let i = 0; i < 24; i++) {
            const a = (i / 24) * Math.PI * 2;
            const rx = Math.round((crownX + Math.cos(a) * 26) / 2) * 2;
            const ry = Math.round((crownY + Math.sin(a) * 6) / 2) * 2;
            ctx.fillRect(rx, ry, 2, 2);
          }
          ctx.globalAlpha = s.skyAlpha * 0.92;
          ctx.fillStyle = '#fef08a';
          for (let n = 0; n < 4; n++) {
            const na = s.age * 4.2 + (n * Math.PI) / 2;
            const nx = Math.round((crownX + Math.cos(na) * 26) / 2) * 2;
            const ny = Math.round((crownY + Math.sin(na) * 6) / 2) * 2;
            ctx.fillRect(nx - 2, ny - 2, 4, 4);
          }
        }
        ctx.restore();
      }
    }

    this.drawRagnarokLancesLayer(ctx, vfxSheet, renderer, false);
    this.drawRagnarokPillarsLayer(ctx, vfxSheet, renderer, false);

    if (
      this.bahamutAvatar &&
      hasVfx &&
      !(this.state === 'TRUE_ULTIMATE' && this.y < this.groundY - 48)
    ) {
      const u = Math.min(1, Math.max(0, this.bahamutAvatar.life / this.bahamutAvatar.maxLife));
      const col = Math.min(29, Math.floor(u * 30));
      const fade = u < 0.10 ? u / 0.10 : u > 0.84 ? (1 - u) / 0.16 : 1.0;
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        3,
        col,
        this.bahamutAvatar.x,
        this.bahamutAvatar.y - 118,
        244,
        244,
        fade * 0.88,
        this.facing < 0,
        renderer,
        'crimson'
      );
    }

    if (this.afterimages.length > 0 && sheet && sheet.complete && sheet.naturalWidth) {
      for (const img of this.afterimages) {
        const alpha = Math.max(0, (1 - img.age / img.maxLife) * 0.54);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(Math.round(img.x / 2) * 2, Math.round((img.y + 4) / 2) * 2);
        ctx.scale(img.facing, 1);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha;
        PixelForge.drawSilhouetteFrame(ctx, sprites, img.frameIdx || 190, 208, 208, '#fb7185');
        ctx.restore();
      }
    }

    if (this.activeVfxAnims.length > 0 && hasVfx) {
      for (const v of this.activeVfxAnims) {
        if (v.inFront) continue;
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
          fade * 0.90,
          v.flipX,
          renderer,
          v.glowColor
        );
      }
    }

    ctx.restore();

    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    this.fx.renderLayer(ctx, 'back', arenaCenterX, this.groundY, 0.96);
  }

  drawUltimateForeground(ctx, renderer = null) {
    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    this.fx.renderLayer(ctx, 'front', arenaCenterX, this.groundY, 0.98);

    const sprites = this.getExSprites();
    const vfxSheet = PixelForge.ensureImage(sprites?.vfx);
    const hasVfx = Boolean(vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth);

    if (this.ragnarokDiveBeam) {
      const b = this.ragnarokDiveBeam;
      const u = Math.min(1, b.age / b.maxLife);
      const fade = u > 0.55 ? (1 - u) / 0.45 : 1.0;
      const dx = b.headX - b.x0;
      const dy = b.headY - b.y0;
      const len = Math.hypot(dx, dy);
      if (fade > 0.02 && len > 8) {
        const nx = -dy / len;
        const ny = dx / len;
        const drawBeamBand = (halfW, color, alpha) => {
          ctx.fillStyle = color;
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.moveTo(Math.round(b.x0 + nx * halfW * 0.55), Math.round(b.y0 + ny * halfW * 0.55));
          ctx.lineTo(Math.round(b.headX + nx * halfW), Math.round(b.headY + ny * halfW));
          ctx.lineTo(Math.round(b.headX - nx * halfW), Math.round(b.headY - ny * halfW));
          ctx.lineTo(Math.round(b.x0 - nx * halfW * 0.55), Math.round(b.y0 - ny * halfW * 0.55));
          ctx.closePath();
          ctx.fill();
        };
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        drawBeamBand(28 * fade, '#e11d48', 0.36 * fade);
        drawBeamBand(15 * fade, '#fbbf24', 0.68 * fade);
        drawBeamBand(6 * fade, '#ffffff', 0.95 * fade);
        ctx.restore();

        if (hasVfx && b.age < 0.32) {
          this.drawBloomedVfxCell(
            ctx,
            vfxSheet,
            4,
            Math.floor(b.age * 30) % 30,
            b.headX,
            b.headY,
            216,
            216,
            0.92 * fade,
            this.facing < 0,
            renderer,
            'gold'
          );
        }
      }
    }

    this.drawRagnarokLancesLayer(ctx, vfxSheet, renderer, true);
    this.drawRagnarokPillarsLayer(ctx, vfxSheet, renderer, true);

    if (this.activeVfxAnims.length > 0 && hasVfx) {
      for (const v of this.activeVfxAnims) {
        if (!v.inFront) continue;
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
          fade * 0.94,
          v.flipX,
          renderer,
          v.glowColor
        );
      }
    }

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
    const groundPlantOffset = 4;
    ctx.translate(Math.round(this.x), Math.round(this.y + groundPlantOffset));
    ctx.scale(this.facing, 1);

    PixelForge.drawSheetFrame(ctx, sprites, this, w, h, this.walkPhase, isReflection, renderer);

    ctx.restore();
  }
}
