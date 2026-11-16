import { Fighter } from './Fighter.js?v=30fps114';
import { PixelForge } from '../engine/PixelForge.js?v=30fps114';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps114';
import { STORM_EFFECT_REGISTRY } from '../engine/shaders/stormShaders.js?v=30fps114';

const AUTO_SLICES_EX = [
  [60, 8], // Beat 1 (V0, 0.34s): Coiled Nukitsuke Draw-Slash -> snaps at F03 (63)
  [68, 7], // Beat 2 (V1, 0.32s): Reverse Rising Kiri-age Heaven-Arc -> snaps at F09 (69)
  [75, 8], // Beat 3 (V2, 0.36s): 2.5D Shunpo Horizontal Vortex (2-hit) -> snaps at F17/F18 (77/78)
  [83, 7]  // Beat 4 (V3, 0.48s): Grounded Two-Handed Morote Zantetsuken (3-hit + ronin_slash wave) -> snaps at F25 (85)
];

const BEAT_DURATIONS = [0.34, 0.32, 0.36, 0.48];
const INTRA_COMBO_LINK = 0.015;

/**
 * KAZE-MARU EX (`ronin_ex`) - Raijin Storm-Blade Iaido Ronin.
 * Next-Gen Wide-Canvas (`320x240`, `anchorX=112, anchorY=230`) FFBE / Last Cloudia Champion.
 * Wields curved Raijin Thunder-Odachi + waist Saya scabbard + 5-Drum Raijin Taiko Halo Ring.
 * Coexists 100% independently alongside classic Kaze-Maru (`ronin`).
 */
export class RoninEx extends Fighter {
  constructor(x, groundY, facing = 1) {
    const opts = typeof x === 'object' && x !== null ? x : { x, groundY, facing };
    super({
      ...opts,
      name: opts.name || 'Kaze-Maru EX',
      maxHp: 3680,
      moveSpeed: 238,
      attackRange: 162,
      autoInterval: 0.88,
      lightColor: 'rgba(129, 140, 248, 1)',
      primaryColor: '#38bdf8',
      hasTrueUltimate: true,
      trueUltName: 'AMAKAKERU: SHOGUNATE REALM SLICE',
      trueUltDuration: 3.70
    });

    this.heroId = 'ronin_ex';
    this.secondaryColor = '#fde047';
    this.deathSfx = 'death_ronin';
    this.skillName = 'ZANTETSUKEN FLASH';
    this.ultName = 'SUSANOO THUNDERSTORM';
    this.ultSub = 'SIX-FOLD RAIJIN BLITZ';
    this.hasTrueUltimate = true;
    this.trueUltName = 'AMAKAKERU: SHOGUNATE REALM SLICE';
    this.trueUltSub = 'SUPREME IAIDO - REALM SEVERANCE';
    this.trueUltDuration = 3.70;
    this.theme = 'storm';
    this.hasPoise = false;

    this.skillTriggerRange = 445;
    this.skillMaxCooldown = 4.70;
    this.dodgeMaxCooldown = 3.40;
    this.dashMaxCooldown = 3.30;
    this.autoDuration = BEAT_DURATIONS[0];
    this._postFlurryInterval = 1.48;
    this.skillDuration = 0.90;
    this.ultDuration = 1.80;
    this.crouchDuration = 0.62;
    this.crouchCooldown = 0;
    this.vaultCooldown = 0;
    this.dashDuration = 0.28;

    // 4-Beat Grounded Battojutsu Combo State
    this.comboStep = 0;
    this._autoVariant = 0;
    this._comboPersistTimer = 0;
    this._queuedNextBeat = false;
    this._intraLinkTimer = 0;
    this._beatHitMask = 0;
    this._beatStartX = this.x;
    this._beatTargetX = this.x;
    this._beatCrossedFlank = false;
    this._beatPostFacing = this.facing;
    this._bootsPlanted = false;
    this._dragSparkAcc = 0;
    this._overrideFrameIdx = null;

    this.stepDustTimer = 0;
    this.divePitchRad = 0;

    // Signature Iaido & Raijin Storm-God Layers
    this.afterimages = [];
    this.afterimageSpawnAccum = 0;
    this.activeSlashLines = [];
    this.delayedJudgmentCuts = [];
    this.iaidoCounterActive = false;
    this.activeVfxAnims = [];
    this.cleanBladeCuts = [];
    this._ultTargetX = 600;
    this.susanooAvatar = null;

    // Supreme Ultimate (`AMAKAKERU: SHOGUNATE REALM SLICE`) state
    this._trueUltInit = false;
    this._trueUltStep = 0;
    this._trueUltCutsDone = 0;
    this._trueUltTargetX = 600;
    this._trueUltDashDir = 1;
    this._trueUltStartX = 300;
    this._trueUltBackX = 750;
    this.raijinEyeSeal = null;
    this.amakakeruCleaves = [];
    this.trueUltLightningSurge = null;

    this.fx = new ArcaneShaderFX(STORM_EFFECT_REGISTRY, {
      pixelScale: 3,
      viewW: 440,
      viewH: 220
    });

    if (typeof Image !== 'undefined') {
      PixelForge.ensureHeroLoaded?.('ronin_ex');
    }
  }

  getAiStyleProfile() {
    return {
      comboGoal: 4,
      sweetMin: 98,
      sweetMax: 126,
      counterCrouchBias: 0.66,
      midLeapMin: 175,
      midLeapMax: 285,
      midLeapChance: 0.44,
      postStyle: 'iaido'
    };
  }

  isHackAndSlashMelee() {
    return true;
  }

  isCrossSlashDuelist() {
    return true;
  }

  getEffectiveAttackRange() {
    const nextVar = (((this.comboStep || 0) % 4) + 4) % 4;
    return nextVar === 3 ? 176 : nextVar === 2 ? 168 : this.attackRange;
  }

  getExSprites() {
    if (typeof Image === 'undefined') return null;
    const assets = PixelForge.initAssets?.();
    return assets?.ronin_ex || assets?.ronin || null;
  }

  _clampArenaX(xv, game, margin = 80) {
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
    if (
      prevState === 'AUTO_ATTACK' &&
      newState !== 'AUTO_ATTACK' &&
      newState !== 'JUMP' &&
      newState !== 'SKILL' &&
      newState !== 'ULTIMATE' &&
      newState !== 'TRUE_ULTIMATE'
    ) {
      this.y = this.groundY;
      this.vy = 0;
    }

    super.setState(newState);

    if (newState !== 'CROUCH') {
      this.iaidoCounterActive = false;
      this.fx?.stopByKey('sereneMindParryWard');
    }
    if (newState !== 'SKILL' && newState !== 'ULTIMATE' && newState !== 'TRUE_ULTIMATE') {
      this.fx?.stopByKey('shunpoSpearMachCone');
    }
    if (newState !== 'ULTIMATE' && newState !== 'TRUE_ULTIMATE') {
      this.susanooAvatar = null;
      this.fx?.stopByKey('susanooStormDomain');
    }
    if (
      newState !== 'SKILL' &&
      newState !== 'ULTIMATE' &&
      newState !== 'TRUE_ULTIMATE' &&
      newState !== 'DASH' &&
      newState !== 'WALK'
    ) {
      this.divePitchRad = 0;
    }

    if (newState === 'SKILL') {
      this._zantetsuStep = 0;
      this._skillOriginX = this.x;
      this._skillOriginY = this.y;
    }

    if (newState === 'ULTIMATE') {
      this._omniStep = 0;
      this._ultOriginX = this.x;
      this._ultOriginY = this.y;
      this._ultApexStartX = this.x;
      this._ultApexStartY = this.y;
    }

    if (newState === 'TRUE_ULTIMATE') {
      this._trueUltInit = false;
      this._trueUltStep = 0;
      this._trueUltCutsDone = 0;
      this._trueUltDashDir = this.facing || 1;
      this._trueUltStartX = this.x;
      this._trueUltBackX = this.x;
      this.raijinEyeSeal = null;
      this.amakakeruCleaves = [];
      this.trueUltLightningSurge = null;
      this.trueUltFrameOverride = 214;
      this._overrideFrameIdx = 214;
    } else {
      this._trueUltInit = false;
      this.raijinEyeSeal = null;
      this.cameraAirLift = 0;
      if (newState !== 'AUTO_ATTACK') {
        this.unstoppablePoise = false;
      }
      if (newState !== 'AUTO_ATTACK' && newState !== 'ULTIMATE') {
        this.trueUltFrameOverride = null;
        this._overrideFrameIdx = null;
      }
    }

    if (newState === 'AUTO_ATTACK') {
      if (this._comboPersistTimer <= 0 && prevState !== 'AUTO_ATTACK') {
        this._autoVariant = (((this.comboStep || 0) % 4) + 4) % 4;
      } else {
        this._autoVariant = (((this.comboStep || 0) % 4) + 4) % 4;
      }
      this._beginComboBeat(this._autoVariant, this.game);
    }

    if (newState === 'DEATH') {
      this.fx?.clear();
      this.cleanBladeCuts = [];
      this.trueUltLightningSurge = null;
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
    }
  }

  queueNextComboBeat() {
    this._queuedNextBeat = true;
  }

  /**
   * Initializes one grounded Battojutsu beat (`0..3`) with 0px vertical float (`y = groundY`)!
   * - Beats 0, 1, 3 step cleanly into the 104..116px Raijin Odachi smear belly in front of the enemy.
   * - Beat 2 (`V2`) performs Kaze-Maru EX's signature Shunpo Cross-Slash onto the opposite flank when within <= 165px!
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
    this._beatCrossedFlank = false;
    this._dragSparkAcc = 0;
    this._comboPersistTimer = 0.72;
    this.unstoppablePoise = v >= 2;
    this.y = this.groundY;
    this.vy = 0;

    const startFrame = AUTO_SLICES_EX[v][0];
    this.trueUltFrameOverride = startFrame;
    this._overrideFrameIdx = startFrame;

    const enemy = this._resolveFrontComboTarget(this._currentEnemy, game);
    if (enemy && !enemy.isDead && !enemy.isDummyFocal) {
      this.facing = enemy.x >= this.x ? 1 : -1;
    }
    this._beatPostFacing = this.facing;
    this._beatStartX = this.x;

    let desiredX = this.x + this.facing * (v === 0 ? 34 : v === 1 ? 30 : v === 2 ? 48 : 36);

    if (enemy && !enemy.isDead) {
      const dist = Math.abs(enemy.x - this.x);
      if (v === 2 && !enemy.isColossalBoss && dist <= 165) {
        // Single supersonic Shunpo cross-step onto the opposite flank within <= 165px!
        const crossDir = enemy.x >= this.x ? 1 : -1;
        const flankTarget = enemy.x + crossDir * 98;
        desiredX = this._clampArenaX(flankTarget, game, 72);
        this._beatCrossedFlank = true;
        this._beatPostFacing = -crossDir;
      } else {
        const sweetDist = enemy.isColossalBoss ? 118 : v === 3 ? 98 : 104;
        const idealStandX = enemy.x - this.facing * sweetDist;
        const rawDelta = (idealStandX - this.x) * this.facing;
        const maxForward = v === 0 ? 96 : v === 2 ? 58 : 44;
        const minForward = dist > sweetDist + 8 ? Math.min(28, Math.max(0, rawDelta)) : 0;
        const clampedForward = Math.max(minForward, Math.min(maxForward, rawDelta));
        desiredX = this.x + this.facing * clampedForward;
      }
    }

    this._beatTargetX = this._clampArenaX(desiredX, game, 72);
  }

  _resolveFrontComboTarget(primaryEnemy, game) {
    const isAdv = Boolean(game?.adventure?.active);
    const myGy = this.groundY || this.y;
    const validFoe = (f, maxDist) =>
      f &&
      f !== this &&
      !f.isDead &&
      !f.isBenched &&
      !f.isDestructibleProp &&
      !f.isDummyFocal &&
      Math.abs(f.x - this.x) <= maxDist &&
      (!isAdv || f.isColossalBoss || Math.abs((f.groundY || f.y) - myGy) <= 88);

    if (validFoe(primaryEnemy, 225)) {
      if (!isAdv || (primaryEnemy.x - this.x) * this.facing >= -36) {
        return primaryEnemy;
      }
    }

    const rawFoes = game?.getEnemiesOf ? game.getEnemiesOf(this) : primaryEnemy ? [primaryEnemy] : [];
    for (let i = 0; i < rawFoes.length; i++) {
      const f = rawFoes[i];
      if (validFoe(f, 225) && (f.x - this.x) * this.facing >= -24) {
        return f;
      }
    }
    if (!isAdv) {
      for (let i = 0; i < rawFoes.length; i++) {
        if (validFoe(rawFoes[i], 205)) return rawFoes[i];
      }
    }
    return null;
  }

  _gatherBattoTargets(primaryEnemy, game, reachFront = 206, reachBack = 46) {
    const targets = [];
    const seen = new Set();
    const isAdv = Boolean(game?.isAdventureMode?.() || game?.adventure?.active);
    const myGy = this.groundY || this.y;

    const consider = (foe) => {
      if (!foe || foe === this || foe.isDead || foe.isBenched || seen.has(foe)) return;
      const relX = (foe.x - this.x) * this.facing;
      const hitPad = foe.isColossalBoss ? 78 : 0;
      if (relX < -reachBack - hitPad || relX > reachFront + hitPad) return;
      if (isAdv && !foe.isColossalBoss) {
        const foeGy = foe.groundY || foe.y;
        if (Math.abs(foeGy - myGy) > 72) return;
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
    if (isAdv && Array.isArray(game?.adventure?.enemies)) {
      for (let i = 0; i < game.adventure.enemies.length; i++) {
        consider(game.adventure.enemies[i]);
      }
    }
    if (isAdv && game?.adventure?.bossEntity) {
      consider(game.adventure.bossEntity);
    }
    return targets;
  }

  _applyBattoStrike(primaryEnemy, game, cfg) {
    const {
      damage = 26,
      reachFront = 208,
      reachBack = 48,
      hitStop = 0.044,
      shakeDur = 0.058,
      knockX = 28,
      knockY = 0,
      isCrit = false,
      cutSlope = -0.14,
      manaGain = 2.2,
      sfx = 'slash'
    } = cfg;

    if (game?.audio) game.audio.play(sfx, this.x + this.facing * 72);
    this.didActionFrame = true;

    const cutCenterY = this.groundY - 78;
    this.cleanBladeCuts.push({
      type: 'blade',
      x0: this.x + this.facing * 24,
      y0: cutCenterY - cutSlope * 38,
      x1: this.x + this.facing * 148,
      y1: cutCenterY + cutSlope * 38,
      age: 0,
      maxLife: 0.14
    });

    const targets = this._gatherBattoTargets(primaryEnemy, game, reachFront, reachBack);
    const struckFoes = [];

    for (let i = 0; i < targets.length; i++) {
      const foe = targets[i];
      const dmg = i === 0 ? damage : Math.max(10, Math.round(damage * 0.85));
      foe.takeDamage(dmg, this, isCrit, knockX, knockY);
      struckFoes.push(foe);

      if (!foe.isDead && !foe.isColossalBoss) {
        foe._hitStopTimer = Math.max(foe._hitStopTimer || 0, hitStop);
        foe._hitShakeTimer = Math.max(foe._hitShakeTimer || 0, shakeDur);
      } else if (!foe.isDead && foe.isColossalBoss) {
        foe._hitShakeTimer = Math.max(foe._hitShakeTimer || 0, shakeDur * 0.75);
      }

      const hitX = foe.x;
      const hitY = (foe.y || this.groundY) - (foe.isColossalBoss ? 124 : 82);
      this.cleanBladeCuts.push({
        type: 'wound',
        x: hitX,
        y: hitY,
        dir: this.facing,
        slope: cutSlope,
        isCrit,
        seed: (this._autoVariant + 1) * 19 + Math.round((this.stateTimer || 0) * 120) + i * 7,
        age: 0,
        maxLife: 0.22
      });
      this.fx?.burst(hitX, hitY, {
        count: isCrit ? 9 : 6,
        speedMin: 48,
        speedMax: isCrit ? 180 : 140,
        lifeMin: 0.12,
        lifeMax: 0.25,
        gravity: 45,
        colors: ['#ffffff', '#fde047', '#38bdf8', '#818cf8']
      });
    }

    if (struckFoes.length > 0) {
      this.gainMana(manaGain);
      if (hitStop > 0) {
        this._hitStopTimer = Math.max(this._hitStopTimer || 0, hitStop);
        game?.renderer?.triggerHitStop?.(hitStop * 0.65);
      }
    }

    return struckFoes;
  }

  /**
   * Spawns ONLY a piercing crescent katana wave (`type: 'ronin_slash'`) -- NEVER spherical orbs!
   */
  fireRaijinSlashWave(game, opts = {}) {
    if (!game?.vfx) return;
    const dir = opts.dir || this.facing || 1;
    const spawnX = opts.x ?? this.x + dir * 68;
    const spawnY = opts.y ?? (this.y || this.groundY) - 78;
    game.vfx.spawnProjectile({
      x: spawnX,
      y: spawnY,
      groundY: this.groundY || this.y,
      vx: dir * (opts.speed ?? 790),
      vy: 0,
      radius: opts.radius ?? 20,
      color: '#38bdf8',
      coreColor: '#fde047',
      owner: this,
      damage: opts.damage ?? 34,
      type: 'ronin_slash',
      pierce: true,
      maxRange: opts.maxRange ?? 580,
      ignoreTargets: opts.ignoreTargets || []
    });
    this.spawnVfxAnim(0, spawnX, spawnY, 200, 200, 0.26, {
      vx: dir * 285,
      flipX: dir < 0,
      glowColor: 'cyan'
    });
  }

  onProjectileTrail(p, game) {
    if (!p) return;
    const sx = Number.isFinite(p.startX) ? p.startX : p.x;
    const sy = Number.isFinite(p.startY) ? p.startY : p.y;
    p.travelDist = Math.hypot(p.x - sx, p.y - sy);
    if (p.maxRange > 0 && p.travelDist >= p.maxRange) {
      p._expiredByRange = true;
      p.vx = 0;
      p.vy = 0;
      p.x = -9999;
      p.y = -9999;
      return;
    }

    if (
      game &&
      typeof game.getEnemiesOf === 'function' &&
      !game._roninProjFilterActive &&
      ((p.ignoreTargets && p.ignoreTargets.size > 0) ||
        (Array.isArray(p.ignoreTargets) && p.ignoreTargets.length > 0) ||
        (p.pierce && p._hitTargets && p._hitTargets.size > 0) ||
        (p.type === 'ronin_slash' && (game.isAdventureMode?.() || game.adventure?.active)))
    ) {
      const origGetEnemiesOf = game.getEnemiesOf;
      game._roninProjFilterActive = true;
      game.getEnemiesOf = function roninExSlashEnemies(fighter) {
        game.getEnemiesOf = origGetEnemiesOf;
        game._roninProjFilterActive = false;
        const list = origGetEnemiesOf.call(this, fighter);
        if (fighter !== p.owner || !Array.isArray(list)) return list;
        const isAdvNow = Boolean(this.isAdventureMode?.() || this.adventure?.active);
        const slashGy = Number.isFinite(p.groundY)
          ? p.groundY
          : Number.isFinite(p.owner?.groundY)
            ? p.owner.groundY
            : null;
        return list.filter((cand) => {
          if (!cand) return false;
          if (p.ignoreTargets instanceof Set && p.ignoreTargets.has(cand)) return false;
          if (Array.isArray(p.ignoreTargets) && p.ignoreTargets.includes(cand)) return false;
          if (p.pierce && p._hitTargets && p._hitTargets.has(cand)) return false;
          if (
            isAdvNow &&
            !cand.isColossalBoss &&
            Number.isFinite(slashGy) &&
            Math.abs(p.vy || 0) < 25 &&
            Math.abs((cand.groundY || cand.y) - slashGy) > 64
          ) {
            return false;
          }
          return true;
        });
      };
    }

    if (this.fx && (p.type === 'ronin_slash' || p.type === 'storm_wave') && (p.ringTimer || 0) >= 0.048) {
      p.ringTimer = 0;
      const dir = Math.sign(p.vx || this.facing || 1);
      this.fx.burst(p.x - dir * 18, p.y + (((Math.round(p.travelDist || 0) >> 3) % 3) - 1) * 14, {
        count: 2,
        speedMin: 24,
        speedMax: 72,
        lifeMin: 0.12,
        lifeMax: 0.22,
        gravity: 0,
        spread: 0.45,
        angle: dir >= 0 ? Math.PI : 0,
        colors: ['#ffffff', '#fde047', '#38bdf8']
      });
    }
  }

  onProjectileHit(p, hitTarget, isCrit, game) {
    if (!p) return false;
    if (hitTarget) {
      if (!p._hitTargets) p._hitTargets = new Set();
      p._hitTargets.add(hitTarget);
      if (p.hitSet && p.hitSet !== p._hitTargets) {
        p.hitSet.add(hitTarget);
      }
      if (!hitTarget.isDead && !hitTarget.isColossalBoss) {
        hitTarget._hitShakeTimer = Math.max(hitTarget._hitShakeTimer || 0, 0.052);
      }
    }
    const dir = Math.sign(p.vx || this.facing || 1);
    const hx = hitTarget ? hitTarget.x : p.x;
    const hy = hitTarget ? (hitTarget.y || this.groundY) - 82 : p.y;
    this.cleanBladeCuts.push({
      type: 'wound',
      x: hx,
      y: hy,
      dir,
      slope: p.isTwinSlash ? -0.22 : -0.14,
      isCrit: Boolean(isCrit || p.isTwinSlash),
      seed: Math.round((p.age || 0) * 1000) + 31,
      age: 0,
      maxLife: 0.22
    });
    if (game?.audio) {
      game.audio.play(isCrit ? 'hit_crit' : 'slash', hx);
    }
    this.fx?.burst(hx, hy, {
      count: isCrit ? 10 : 6,
      speedMin: 55,
      speedMax: isCrit ? 195 : 145,
      lifeMin: 0.14,
      lifeMax: 0.26,
      gravity: 55,
      colors: ['#ffffff', '#fde047', '#38bdf8', '#818cf8']
    });
    return true;
  }

  spawnSayaGlint(isSheath = false) {
    if (!this.fx) return;
    this.fx.spawn('iaidoSayaGlint', this.x - this.facing * 14, this.y - 68, {
      flip: this.facing < 0,
      light: isSheath ? 1.42 : 1.24,
      extra: { isSheath }
    });
  }

  spawnAfterimage(x, y, facing, row = 6, col = 14, maxLife = 0.28, pitch = 0) {
    if (this.afterimages.length >= 16) this.afterimages.shift();
    this.afterimages.push({
      x,
      y,
      facing,
      frameIdx: row * 30 + (col % 30),
      age: 0,
      maxLife,
      pitch
    });
  }

  spawnVfxAnim(row, x, y, w = 208, h = 208, maxLife = 0.48, opts = {}) {
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
      glowColor: opts.glowColor || 'cyan',
      followOwner: Boolean(opts.followOwner),
      offsetX: opts.offsetX || 0,
      offsetY: opts.offsetY || 0,
      inFront: opts.inFront !== undefined ? Boolean(opts.inFront) : row >= 3
    });
  }

  spawnPixelShockwave(x, y, maxR = 135, colorType = 'cyan', maxLife = 0.32, isGround = false) {
    if (!this.fx) return;
    this.fx.spawn('raijinTaikoShockwave', x, y, {
      flip: false,
      light: colorType === 'gold' ? 1.38 : 1.24,
      maxDuration: maxLife,
      extra: { maxRWorld: maxR, colorType, isGround }
    });
  }

  spawnPixelLightningBolt(x, topY, botY, colorType = 'cyan', maxLife = 0.34) {
    if (!this.fx) return;
    this.fx.spawn('raijinSkyThunderbolt', x, botY, {
      flip: false,
      light: colorType === 'gold' ? 1.42 : 1.28,
      maxDuration: maxLife,
      extra: { spanWorldY: Math.max(90, botY - topY), colorType }
    });
    this.fx.burst(x, botY - 8, {
      count: 8,
      speedMin: 45,
      speedMax: 155,
      lifeMin: 0.14,
      lifeMax: 0.28,
      gravity: 65,
      colors: colorType === 'gold' ? ['#ffffff', '#fef08a', '#eab308'] : ['#ffffff', '#67e8f9', '#a78bfa']
    });
  }

  addSlashLine(x1, y1, x2, y2, maxLife = 0.65, detonated = false) {
    this.activeSlashLines.push({
      x1,
      y1,
      x2,
      y2,
      age: 0,
      maxLife,
      detonated
    });
    if (this.fx) {
      this.fx.spawn('judgmentSlashBeam', x1, y1, {
        flip: false,
        light: detonated ? 1.44 : 1.24,
        maxDuration: maxLife,
        extra: {
          dx: x2 - x1,
          dy: y2 - y1,
          detonated,
          customDuration: maxLife
        }
      });
    }
  }

  syncSpearMachCone() {
    if (!this.fx) return;
    const isSkillDive = this.state === 'SKILL' && this.stateTimer >= 0.18 && this.stateTimer < 0.48;
    const isUltDive = this.state === 'ULTIMATE' && this.stateTimer >= 0.30 && this.stateTimer < 1.26;
    const isTrueUltBlitz =
      this.state === 'TRUE_ULTIMATE' && this.stateTimer >= 0.92 && this.stateTimer < 1.28;
    if (isSkillDive || isUltDive || isTrueUltBlitz) {
      const isHeavenSplit = this.state === 'ULTIMATE' && this.stateTimer >= 1.02;
      let slot = this.fx.active.find((s) => s.key === 'shunpoSpearMachCone');
      if (!slot) {
        slot = this.fx.spawn('shunpoSpearMachCone', this.x, this.y - 72, {
          follow: this,
          offsetX: 0,
          offsetY: -72,
          flip: this.facing < 0,
          light: isHeavenSplit ? 1.42 : 1.28,
          extra: { pitchAngle: this.divePitchRad || 0, isHeavenSplit }
        });
      } else {
        slot.inst.cfg.pitchAngle = this.divePitchRad || 0;
        slot.inst.cfg.isHeavenSplit = isHeavenSplit;
      }
    } else {
      this.fx.stopByKey('shunpoSpearMachCone');
    }
  }

  triggerIaidoCounterBlink(attacker, game) {
    if (!attacker || attacker.isDead) return;
    this.iaidoCounterActive = false;
    this.isDeflecting = false;
    this.fx?.stopByKey('sereneMindParryWard');
    const oldX = this.x;
    this.spawnAfterimage(oldX, this.y, this.facing, 7, 10, 0.34);

    const behindDir = attacker.facing || -this.facing;
    this.x = this._clampArenaX(attacker.x - behindDir * 94, game, 85);
    this.y = this.groundY;
    this.facing = attacker.x >= this.x ? 1 : -1;
    this.spawnAfterimage((oldX + this.x) * 0.5, this.y - 12, this.facing, 6, 12, 0.28);
    this.spawnSayaGlint(true);

    this.addSlashLine(attacker.x - 62, attacker.y - 138, attacker.x + 62, attacker.y - 22, 0.42, true);
    this.addSlashLine(attacker.x - 62, attacker.y - 22, attacker.x + 62, attacker.y - 138, 0.42, true);
    this.spawnVfxAnim(3, attacker.x, attacker.y - 78, 216, 216, 0.42, { glowColor: 'cyan' });
    this.spawnVfxAnim(1, attacker.x, attacker.groundY - 92, 208, 208, 0.44, {
      startFrame: 18,
      endFrame: 29,
      glowColor: 'purple'
    });
    this.spawnVfxAnim(4, attacker.x, attacker.y - 80, 196, 196, 0.34, { glowColor: 'cyan' });
    this.spawnPixelShockwave(attacker.x, attacker.y - 80, 128, 'cyan', 0.30, false);
    this.spawnPixelLightningBolt(attacker.x, attacker.groundY - 260, attacker.groundY, 'cyan', 0.34);

    if (game) {
      if (game.audio) {
        game.audio.play('dash_whoosh', this.x);
        game.audio.play('slash', attacker.x);
      }
      game.renderer?.triggerShake?.(9, 0.18);
      game.renderer?.triggerHitStop?.(0.045);
      game.vfx?.spawnDamageText?.(
        this.x,
        this.y - 156,
        0,
        true,
        'IAIDO COUNTER-BLINK!',
        '#38bdf8'
      );
    }

    this._hitStopTimer = Math.max(this._hitStopTimer || 0, 0.045);
    attacker.takeDamage(74, this, true, 145, -155);
    if (!attacker.isDead && !attacker.isColossalBoss) {
      attacker._hitShakeTimer = Math.max(attacker._hitShakeTimer || 0, 0.065);
    }
    this.heal(20, 'SERENE FOCUS');
    this.gainMana(4);
    this.didActionFrame = true;
  }

  update(dt, enemy, game) {
    this._currentEnemy = enemy;
    this.crouchCooldown = Math.max(0, (this.crouchCooldown || 0) - dt);
    this.vaultCooldown = Math.max(0, (this.vaultCooldown || 0) - dt);
    if (this.state !== 'AUTO_ATTACK' && this._comboPersistTimer > 0) {
      this._comboPersistTimer = Math.max(0, this._comboPersistTimer - dt);
    }

    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      this.afterimages[i].age += dt;
      if (this.afterimages[i].age >= this.afterimages[i].maxLife) {
        this.afterimages.splice(i, 1);
      }
    }

    for (let i = this.activeSlashLines.length - 1; i >= 0; i--) {
      this.activeSlashLines[i].age += dt;
      if (this.activeSlashLines[i].age >= this.activeSlashLines[i].maxLife) {
        this.activeSlashLines.splice(i, 1);
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

    for (let i = this.cleanBladeCuts.length - 1; i >= 0; i--) {
      this.cleanBladeCuts[i].age += dt;
      if (this.cleanBladeCuts[i].age >= this.cleanBladeCuts[i].maxLife) {
        this.cleanBladeCuts.splice(i, 1);
      }
    }

    if (this.trueUltLightningSurge) {
      this.trueUltLightningSurge.age += dt;
      if (this.trueUltLightningSurge.age >= this.trueUltLightningSurge.maxLife) {
        this.trueUltLightningSurge = null;
      }
    }

    for (let i = this.delayedJudgmentCuts.length - 1; i >= 0; i--) {
      const jc = this.delayedJudgmentCuts[i];
      jc.timer -= dt;
      if (jc.timer <= 0) {
        this.delayedJudgmentCuts.splice(i, 1);
      }
    }

    if (!this.isDead && this.state === 'WALK') {
      this.divePitchRad = 0;
      this.stepDustTimer += dt;
      if (this.stepDustTimer >= 0.24) {
        this.stepDustTimer = 0;
        if (game?.audio) game.audio.play('footstep_steel', this.x);
        this.fx?.burst(this.x - this.facing * 14, this.groundY - 2, {
          count: 4,
          speedMin: 30,
          speedMax: 85,
          lifeMin: 0.14,
          lifeMax: 0.26,
          gravity: 35,
          colors: ['#ffffff', '#67e8f9', '#818cf8']
        });
      }
    } else if (this.state === 'IDLE') {
      this.divePitchRad *= Math.pow(0.001, dt);
    }

    super.update(dt, enemy, game);
    this.syncSpearMachCone();
    this.fx.update(dt);
  }

  startDodge(enemy, game) {
    this.dodgeCooldown = this.dodgeMaxCooldown * (0.84 + Math.random() * 0.26);
    if (Math.random() < 0.58) {
      this.startCrouch(enemy, game);
    } else {
      this.startJump(enemy, game);
    }
  }

  startCrouch(_enemy, game) {
    this.crouchCooldown = 3.0;
    this.crouchDuration = 0.62;
    this.setState('CROUCH');
    this.isCrouching = true;
    this.iaidoCounterActive = true;
    this.isDeflecting = true;
    this.vx = 0;
    this.spawnSayaGlint(false);
    this.fx?.spawn('sereneMindParryWard', this.x, this.groundY - 4, {
      follow: this,
      useGroundY: true,
      offsetX: 0,
      offsetY: -4,
      flip: false,
      light: 1.24
    });
    this.spawnPixelShockwave(this.x, this.groundY - 4, 88, 'purple', 0.26, true);
    if (game?.audio) game.audio.play('clang', this.x);
    if (game?.vfx) {
      game.vfx.spawnDamageText(
        this.x,
        this.y - 144,
        0,
        false,
        'SERENE MIND COUNTER!',
        '#38bdf8'
      );
    }
  }

  updateCrouch(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.crouchDuration || 0.62;
    this.vx *= Math.pow(0.001, dt);

    if (this.iaidoCounterActive && game?.vfx?.projectiles) {
      for (const proj of game.vfx.projectiles) {
        if (
          proj.owner !== this &&
          (!this.team || !proj.owner?.team || proj.owner.team !== this.team) &&
          Math.abs(proj.x - this.x) < 145
        ) {
          proj.owner = this;
          proj.vx = -proj.vx * 1.4;
          proj.color = '#38bdf8';
          if (enemy && !enemy.isDead) {
            this.triggerIaidoCounterBlink(enemy, game);
          }
          break;
        }
      }
      if (
        this.iaidoCounterActive &&
        enemy &&
        !enemy.isDead &&
        Math.abs(enemy.x - this.x) < 195 &&
        (enemy.state === 'AUTO_ATTACK' || enemy.state === 'SKILL') &&
        enemy.stateTimer >= 0.12
      ) {
        this.triggerIaidoCounterBlink(enemy, game);
      }
    }

    // If unprovoked by t = 0.38s, unleash Shunpo Draw-Cut Dash + piercing `ronin_slash` crescent wave!
    if (t >= 0.38 && !this.didActionFrame) {
      this.didActionFrame = true;
      this.iaidoCounterActive = false;
      this.isDeflecting = false;
      this.fx?.stopByKey('sereneMindParryWard');
      const oldX = this.x;
      this.spawnAfterimage(oldX, this.y, this.facing, 7, 14, 0.28);
      this.x = this._clampArenaX(this.x + this.facing * 165, game, 85);
      this.spawnSayaGlint(false);
      this.addSlashLine(oldX, this.y - 68, this.x, this.y - 68, 0.32);
      this.spawnPixelShockwave(this.x, this.y - 72, 108, 'cyan', 0.26, false);
      if (game?.audio) game.audio.play('slash', this.x);
      const crouchHitFoes = [];
      if (enemy && !enemy.isDead && Math.abs(enemy.x - (oldX + this.x) * 0.5) < 155) {
        enemy.takeDamage(52, this, true, 125, -135);
        if (!enemy.isDead && !enemy.isColossalBoss) {
          enemy._hitShakeTimer = Math.max(enemy._hitShakeTimer || 0, 0.058);
        }
        crouchHitFoes.push(enemy);
      }
      this.fireRaijinSlashWave(game, {
        x: this.x + this.facing * 56,
        y: (this.y || this.groundY) - 76,
        damage: 36,
        speed: 780,
        maxRange: 580,
        ignoreTargets: crouchHitFoes
      });
    }

    if (t >= dur) {
      this.iaidoCounterActive = false;
      this.isDeflecting = false;
      this.isCrouching = false;
      this.setState('IDLE');
    }
  }

  startJump(enemy, game) {
    this.vaultCooldown = 2.8;
    this.dashDuration = 0.56;
    this.setState('JUMP');
    this.isInvulnerable = true;
    this.isFlipVault = true;
    const dir = enemy && !enemy.isDead ? Math.sign(enemy.x - this.x) || this.facing : this.facing;
    this.dashDir = dir;
    this.vaultStartX = this.x;
    const targetX =
      enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 285
        ? enemy.x + dir * 88
        : this.x + dir * 215;
    this.vaultTargetX = this._clampArenaX(targetX, game, 85);
    this.vx = 0;
    this.vy = 0;
    this.spawnAfterimage(this.x, this.y, this.facing, 8, 4, 0.26);
    this.spawnPixelShockwave(this.x, this.groundY - 4, 84, 'cyan', 0.24, true);
    if (game?.audio) game.audio.play('dash_whoosh', this.x);
    if (game?.vfx) {
      game.vfx.spawnDamageText(
        this.x,
        this.y - 144,
        0,
        false,
        'TSUBAME GAESHI!',
        '#38bdf8'
      );
    }
  }

  onStartDash(_enemy, game, dir) {
    this.isFlipVault = false;
    this.dashDir = dir || this.facing;
    this.dashStartX = this.x;
    this.spawnAfterimage(this.x, this.y, this.facing, 6, 6, 0.28, 0.12);
    this.spawnSayaGlint(false);
    this.spawnPixelShockwave(this.x, this.groundY - 4, 78, 'cyan', 0.22, true);
    if (game?.audio) game.audio.play('dash_whoosh', this.x);
    if (game?.vfx) {
      game.vfx.spawnDamageText(
        this.x,
        this.y - 144,
        0,
        false,
        'SHUNPO FLASH-STEP!',
        '#38bdf8'
      );
    }
  }

  updateDashOrDodge(_dt, enemy, game) {
    const t = this.stateTimer;
    const dur = Math.max(0.01, this.dashDuration || 0.42);
    const u = Math.min(1, t / dur);

    if (this.isFlipVault) {
      const easeU = 1 - Math.pow(1 - u, 1.8);
      this.x = this.vaultStartX + (this.vaultTargetX - this.vaultStartX) * easeU;
      this.y = this.groundY - Math.sin(u * Math.PI) * 98;
      this.vx = 0;
      this.vy = 0;

      if (Math.random() < 0.38) {
        this.spawnAfterimage(this.x, this.y, this.facing, 8, Math.floor(u * 28), 0.20);
      }

      if (u >= 0.36 && !this.didActionFrame) {
        this.didActionFrame = true;
        if (game?.audio) game.audio.play('slash', this.x);
        this.addSlashLine(this.x - 45, this.y - 110, this.x + this.facing * 75, this.y - 20, 0.28);
        this.spawnVfxAnim(0, this.x + this.facing * 28, this.y - 68, 192, 192, 0.26, {
          vx: this.facing * 210,
          flipX: this.facing < 0,
          glowColor: 'cyan'
        });
        this.spawnPixelShockwave(this.x, this.y - 68, 96, 'cyan', 0.24, false);
        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 155) {
          enemy.takeDamage(34, this, false, 45, -130);
        }
      }

      if (u >= 0.58 && !this.didSecondaryAction) {
        this.didSecondaryAction = true;
        if (game?.audio) game.audio.play('slash', this.x);
        this.addSlashLine(this.x - 45, this.y - 20, this.x + this.facing * 75, this.y - 110, 0.28);
        this.spawnVfxAnim(0, this.x + this.facing * 32, this.y - 64, 196, 196, 0.28, {
          vx: this.facing * 230,
          flipX: this.facing < 0,
          glowColor: 'purple'
        });
        this.spawnPixelShockwave(this.x, this.y - 68, 106, 'purple', 0.26, false);
        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 165) {
          enemy.takeDamage(38, this, true, 95, 120);
        }
      }

      if (t >= dur) {
        this.y = this.groundY;
        this.isFlipVault = false;
        this.isInvulnerable = false;
        this.setState('IDLE');
      }
      return;
    }

    const burst = 720 * (1 - u * 0.58);
    this.vx = this.dashDir * burst;
    this.divePitchRad = Math.sin(u * Math.PI) * 0.14;
    if (Math.random() < 0.45) {
      this.spawnAfterimage(this.x, this.y, this.facing, 6, Math.floor(u * 28), 0.22, this.divePitchRad);
    }
    if (t >= dur) {
      this.divePitchRad = 0;
      this.isDeflecting = false;
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  /**
   * 4-Beat 100% Grounded (`0px` float!) Next-Gen Battojutsu Combo (`[[60,8],[68,7],[75,8],[83,7]]`):
   * - V0 (`F03` `63`): Coiled Nukitsuke lightning draw-slash (1-hit, 42ms hit-stop)
   * - V1 (`F09` `69`): Reverse rising Kiri-age heaven-arc (1-hit, 44ms hit-stop)
   * - V2 (`F17/F18` `77/78`): 2.5D Shunpo horizontal vortex (2-hit, single flank cross-step when <= 165px)
   * - V3 (`F25` `85`): Grounded two-handed Morote Zantetsuken full-reach lightning cleave (3-hit + piercing `ronin_slash` wave, 56ms hit-stop)
   */
  updateAutoAttack(dt, enemy, game) {
    this._currentEnemy = enemy;
    this._comboPersistTimer = 0.72;
    this.y = this.groundY;
    this.vy = 0;

    if (this._intraLinkTimer > 0) {
      this._intraLinkTimer = Math.max(0, this._intraLinkTimer - dt);
      this.vx = 0;
      this.vy = 0;
      this.y = this.groundY;
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

    // Snap times aligned 1:1 with Row 2 1-frame lightning smear frames (`F03`, `F09`, `F17`, `F25`)
    const snapT = v === 0 ? 0.09 : v === 1 ? 0.06 : v === 2 ? 0.08 : 0.14;

    let localStep = 0;
    if (v === 0) {
      if (t < 0.09) localStep = Math.min(2, Math.floor((t / 0.09) * 3));
      else if (t < 0.145) localStep = 3;
      else if (t < 0.24) localStep = 4 + Math.min(1, Math.floor(((t - 0.145) / 0.095) * 2));
      else localStep = 6 + Math.min(1, Math.floor(((t - 0.24) / 0.10) * 2));
    } else if (v === 1) {
      if (t < 0.06) localStep = 0;
      else if (t < 0.115) localStep = 1;
      else if (t < 0.21) localStep = 2 + Math.min(1, Math.floor(((t - 0.115) / 0.095) * 2));
      else localStep = 4 + Math.min(2, Math.floor(((t - 0.21) / 0.11) * 3));
    } else if (v === 2) {
      if (t < 0.08) localStep = Math.min(1, Math.floor((t / 0.08) * 2));
      else if (t < 0.14) localStep = 2;
      else if (t < 0.195) localStep = 3;
      else localStep = 4 + Math.min(3, Math.floor(((t - 0.195) / 0.165) * 4));
    } else {
      if (t < 0.14) localStep = Math.min(1, Math.floor((t / 0.14) * 2));
      else if (t < 0.22) localStep = 2;
      else localStep = 3 + Math.min(3, Math.floor(((t - 0.22) / 0.26) * 4));
    }

    const frameIdx = sliceStart + Math.min(sliceLen - 1, Math.max(0, localStep));
    this.trueUltFrameOverride = frameIdx;
    this._overrideFrameIdx = frameIdx;

    // Grounded Fumikomi / Shunpo Pre-Snap Advance -> Hard-Planted Boots (`vx = 0`) right at `snapT`!
    this.vx = 0;
    if (t < snapT) {
      const lungeU = Math.min(1, Math.max(0, t / snapT));
      const eased = 1 - Math.pow(1 - lungeU, 2.3);
      this.x = this._beatStartX + (this._beatTargetX - this._beatStartX) * eased;

      if (this._beatCrossedFlank || Math.abs(this._beatTargetX - this._beatStartX) > 28) {
        this._dragSparkAcc += dt;
        if (this._dragSparkAcc >= 0.025) {
          this._dragSparkAcc = 0;
          this.spawnAfterimage(
            this.x,
            this.groundY,
            this.facing,
            2,
            sliceStart - 60 + localStep,
            0.20,
            0
          );
        }
      }
    } else if (!this._bootsPlanted) {
      this._bootsPlanted = true;
      this.x = this._beatTargetX;
      this.vx = 0;
      if (this._beatCrossedFlank) {
        this.facing = this._beatPostFacing;
        this.spawnAfterimage(
          (this._beatStartX + this._beatTargetX) * 0.5,
          this.groundY,
          -this.facing,
          2,
          17,
          0.22,
          0
        );
      }
    }

    // Beat-Specific 1-Frame Smear Impacts
    if (v === 0) {
      if ((this._beatHitMask & 1) === 0 && t >= 0.09) {
        this._beatHitMask |= 1;
        this.spawnSayaGlint(false);
        this.spawnPixelShockwave(this.x + this.facing * 52, this.groundY - 6, 68, 'cyan', 0.20, true);
        this._applyBattoStrike(enemy, game, {
          damage: 28,
          reachFront: 212,
          hitStop: 0.042,
          shakeDur: 0.056,
          knockX: 28,
          knockY: 0,
          cutSlope: -0.14,
          manaGain: 2.2,
          sfx: 'slash'
        });
      }
    } else if (v === 1) {
      if ((this._beatHitMask & 1) === 0 && t >= 0.06) {
        this._beatHitMask |= 1;
        this.spawnPixelShockwave(this.x + this.facing * 64, this.groundY - 76, 74, 'purple', 0.22, false);
        this._applyBattoStrike(enemy, game, {
          damage: 30,
          reachFront: 214,
          hitStop: 0.044,
          shakeDur: 0.058,
          knockX: 26,
          knockY: -82,
          cutSlope: 0.16,
          manaGain: 2.4,
          sfx: 'slash'
        });
      }
    } else if (v === 2) {
      if ((this._beatHitMask & 1) === 0 && t >= 0.08) {
        this._beatHitMask |= 1;
        if (game?.audio) game.audio.play('dash_whoosh', this.x);
        this.spawnAfterimage(this.x - this.facing * 22, this.groundY, this.facing, 2, 17, 0.20, 0);
        this.spawnPixelShockwave(this.x + this.facing * 58, this.groundY - 78, 86, 'cyan', 0.22, false);
        this._applyBattoStrike(enemy, game, {
          damage: 21,
          reachFront: 216,
          reachBack: 62,
          hitStop: 0.036,
          shakeDur: 0.048,
          knockX: 18,
          knockY: -28,
          cutSlope: -0.22,
          manaGain: 1.4,
          sfx: 'slash'
        });
      }
      if ((this._beatHitMask & 2) === 0 && t >= 0.14) {
        this._beatHitMask |= 2;
        this._applyBattoStrike(enemy, game, {
          damage: 24,
          reachFront: 218,
          reachBack: 62,
          hitStop: 0.046,
          shakeDur: 0.056,
          knockX: 24,
          knockY: -45,
          isCrit: true,
          cutSlope: 0.18,
          manaGain: 1.6,
          sfx: 'raijin_slash'
        });
      }
    } else {
      // V3 (F25 = 85): Grounded Two-Handed Morote Zantetsuken -> 3-hit cascading cleave + long-range `ronin_slash` crescent wave!
      if ((this._beatHitMask & 1) === 0 && t >= 0.14) {
        this._beatHitMask |= 1;
        const cleaveX = this.x + this.facing * 78;
        this.spawnSayaGlint(true);
        game?.renderer?.triggerShake?.(11, 0.22);
        this.spawnPixelShockwave(cleaveX, this.groundY - 6, 112, 'gold', 0.26, true);
        this.spawnPixelLightningBolt(cleaveX, this.groundY - 245, this.groundY, 'gold', 0.28);
        const meleeHitFoes = this._applyBattoStrike(enemy, game, {
          damage: 24,
          reachFront: 224,
          hitStop: 0.056,
          shakeDur: 0.080,
          knockX: 34,
          knockY: -42,
          isCrit: true,
          cutSlope: 0.08,
          manaGain: 1.8,
          sfx: 'raijin_slash'
        });
        this._lastAutoMeleeHitFoes = meleeHitFoes;
        this.fireRaijinSlashWave(game, {
          x: this.x + this.facing * 64,
          y: this.groundY - 76,
          damage: 34,
          speed: 790,
          maxRange: 580,
          ignoreTargets: meleeHitFoes
        });
      }
      if ((this._beatHitMask & 2) === 0 && t >= 0.20) {
        this._beatHitMask |= 2;
        this._applyBattoStrike(enemy, game, {
          damage: 16,
          reachFront: 226,
          hitStop: 0,
          shakeDur: 0.046,
          knockX: 28,
          knockY: -36,
          cutSlope: -0.12,
          manaGain: 0.8,
          sfx: 'clang'
        });
      }
      if ((this._beatHitMask & 4) === 0 && t >= 0.26) {
        this._beatHitMask |= 4;
        this._applyBattoStrike(enemy, game, {
          damage: 24,
          reachFront: 228,
          hitStop: 0,
          shakeDur: 0.056,
          knockX: 88,
          knockY: -96,
          isCrit: true,
          cutSlope: 0.14,
          manaGain: 1.2,
          sfx: 'slash'
        });
      }
    }

    if (t >= dur) {
      this.y = this.groundY;
      this.vy = 0;
      this.vx = 0;

      const isManualPlayer = Boolean(
        (this.isPlayerControlled && !this.adventureAutoPlay) || this.isManualAdventureControl
      );
      const advHoldingAttack = Boolean(
        (game?.isAdventureMode?.() || game?.adventure?.active) &&
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

      if (v < 3 && (this._queuedNextBeat || advHoldingAttack || aiWantsChain)) {
        if (game?.adventure?.queuedAction === 'attack') {
          game.adventure.queuedAction = null;
        }
        this._intraLinkTimer = INTRA_COMBO_LINK;
        return;
      }

      if (v === 3) {
        this.comboStep = 0;
        this._aiComboReadyFinisher = 0.90;
        this._aiOutstepTimer = 0.20;
        this._aiOutstepDir = -1;
        this.autoCooldown = isManualPlayer ? 0.05 : this._postFlurryInterval * (0.92 + Math.random() * 0.16);
      } else {
        this.autoCooldown = 0.015;
      }

      this.unstoppablePoise = false;
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      this.setState('IDLE');
    }
  }

  updateSkill(dt, enemy, game) {
    const t = this.stateTimer;
    if (!this._zantetsuStep) this._zantetsuStep = 0;
    this.isInvulnerable = t < 0.66;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const clampX = (xVal) => this._clampArenaX(xVal, game, 85);
    const originX = this._skillOriginX !== undefined ? this._skillOriginX : this.x;
    const center =
      enemy && !enemy.isDead
        ? enemy.x
        : Math.max(220, Math.min(ww - 220, originX + this.facing * 165));
    const dir = center >= originX ? 1 : -1;

    if (t < 0.18) {
      this.vx = 0;
      this.vy = 0;
      this.y = this.groundY;
      this.divePitchRad = 0;
      if (this._zantetsuStep === 0) {
        this._zantetsuStep = 1;
        this._skillOriginX = this.x;
        this._skillOriginY = this.groundY;
        this.spawnSayaGlint(false);
        this.spawnVfxAnim(3, this.x, this.groundY - 76, 176, 176, 0.24, {
          followOwner: true,
          offsetX: 0,
          offsetY: -76,
          glowColor: 'cyan'
        });
        this.spawnPixelShockwave(this.x, this.groundY - 4, 96, 'cyan', 0.24, true);
      }
      return;
    }

    const passWindows = [
      {
        t0: 0.18,
        t1: 0.27,
        p0: { x: originX, y: this.groundY },
        p1: { x: clampX(center + dir * 130), y: this.groundY - 82 }
      },
      {
        t0: 0.27,
        t1: 0.36,
        p0: { x: clampX(center + dir * 130), y: this.groundY - 82 },
        p1: { x: clampX(center - dir * 130), y: this.groundY - 76 }
      },
      {
        t0: 0.36,
        t1: 0.48,
        p0: { x: clampX(center - dir * 130), y: this.groundY - 76 },
        p1: { x: clampX(center + dir * 108), y: this.groundY }
      }
    ];

    if (t >= 0.18 && t < 0.48) {
      let passIdx = 0;
      if (t >= 0.36) passIdx = 2;
      else if (t >= 0.27) passIdx = 1;

      const win = passWindows[passIdx];
      const localU = Math.min(1, Math.max(0, (t - win.t0) / (win.t1 - win.t0)));
      const easeU = localU < 0.5 ? 2 * localU * localU : 1 - Math.pow(-2 * localU + 2, 2) / 2;

      const { p0, p1 } = win;
      this.x = p0.x + (p1.x - p0.x) * easeU;
      this.y = p0.y + (p1.y - p0.y) * easeU;
      this.vx = 0;
      this.vy = 0;

      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      this.facing = dx >= 0 ? 1 : -1;
      this.divePitchRad = Math.atan2(dy, Math.max(1, Math.abs(dx)));

      this.afterimageSpawnAccum += dt;
      if (this.afterimageSpawnAccum >= 0.024) {
        this.afterimageSpawnAccum = 0;
        const col = Math.min(15, Math.max(6, Math.floor((t / this.skillDuration) * 30)));
        this.spawnAfterimage(this.x, this.y, this.facing, 3, col, 0.28, 0);
      }

      const targetStep = passIdx + 2;
      if (this._zantetsuStep < targetStep) {
        this._zantetsuStep = targetStep;
        this.addSlashLine(p0.x, p0.y - 62, p1.x, p1.y - 62, 0.64);
        const midY = (p0.y + p1.y) * 0.5 - 64;
        this.spawnVfxAnim(0, center, midY, 208, 208, 0.28, {
          vx: this.facing * 280,
          flipX: this.facing < 0,
          glowColor: passIdx % 2 === 0 ? 'cyan' : 'purple'
        });
        this.spawnPixelShockwave(
          center,
          midY,
          112,
          passIdx % 2 === 0 ? 'cyan' : 'purple',
          0.26,
          false
        );
        if (game?.audio) game.audio.play('dash_whoosh', center);
        if (enemy && !enemy.isDead && Math.abs(enemy.x - center) < 245) {
          enemy.takeDamage(35, this, passIdx === 2, 22, -98);
        }
      }
      return;
    }

    if (t >= 0.48 && t < 0.66) {
      this.y = this.groundY;
      this.divePitchRad = 0;
      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }
    }

    if (t >= 0.66 && !this.didSecondaryAction) {
      this.didSecondaryAction = true;
      this.y = this.groundY;
      this.divePitchRad = 0;
      this.spawnSayaGlint(true);
      if (game?.audio) game.audio.play('slash', this.x);
      game?.renderer?.triggerShake?.(11, 0.22);
      game?.renderer?.triggerAberration?.(6);
      game?.renderer?.triggerHitStop?.(0.05);
      this._hitStopTimer = Math.max(this._hitStopTimer || 0, 0.05);
      game?.vfx?.spawnDamageText?.(
        this.x,
        this.y - 156,
        0,
        true,
        'ZANTETSUKEN: SHEATH!',
        '#38bdf8'
      );

      for (const line of this.activeSlashLines) {
        line.detonated = true;
        const mx = (line.x1 + line.x2) * 0.5;
        const my = (line.y1 + line.y2) * 0.5;
        this.fx?.spawn('judgmentSlashBeam', line.x1, line.y1, {
          flip: false,
          light: 1.45,
          maxDuration: 0.34,
          extra: {
            dx: line.x2 - line.x1,
            dy: line.y2 - line.y1,
            detonated: true,
            customDuration: 0.34
          }
        });
        this.fx?.burst(mx, my, {
          count: 8,
          speedMin: 55,
          speedMax: 185,
          lifeMin: 0.14,
          lifeMax: 0.28,
          gravity: 40,
          colors: ['#ffffff', '#fef08a', '#67e8f9', '#a78bfa']
        });
      }

      const strikeX = enemy && !enemy.isDead ? enemy.x : center;
      this.spawnVfxAnim(1, strikeX, this.groundY - 94, 220, 220, 0.46, {
        startFrame: 18,
        endFrame: 29,
        glowColor: 'cyan'
      });
      this.spawnVfxAnim(2, strikeX, this.groundY - 96, 212, 212, 0.46, {
        startFrame: 18,
        endFrame: 29,
        glowColor: 'purple'
      });
      this.spawnVfxAnim(4, strikeX, this.groundY - 86, 212, 212, 0.36, {
        glowColor: 'cyan'
      });
      this.spawnPixelShockwave(strikeX, this.groundY - 6, 155, 'cyan', 0.34, true);
      this.spawnPixelLightningBolt(strikeX, this.groundY - 270, this.groundY, 'cyan', 0.36);

      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 350) {
        enemy.takeDamage(74, this, true, 165, -210);
        if (!enemy.isDead && !enemy.isColossalBoss) {
          enemy._hitShakeTimer = Math.max(enemy._hitShakeTimer || 0, 0.072);
        }
      }
      this.heal(18, 'ZANSHIN FOCUS');
    }

    if (t >= this.skillDuration) {
      this._zantetsuStep = 0;
      this.y = this.groundY;
      this.divePitchRad = 0;
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  updateUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    if (!this._omniStep) this._omniStep = 0;
    this.isInvulnerable = true;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const clampX = (xVal) => this._clampArenaX(xVal, game, 85);
    const originX = this._ultOriginX !== undefined ? this._ultOriginX : this.x;
    const targetX = enemy && !enemy.isDead ? enemy.x : ww * 0.5;
    this._ultTargetX = targetX;
    this.susanooAvatar = { x: targetX, y: this.groundY };
    const dir = targetX >= originX ? 1 : -1;
    const landX = clampX(targetX - dir * 68);

    if (t < 0.30) {
      if (this._omniStep === 0) {
        this._omniStep = 1;
        this._ultOriginX = this.x;
        this._ultOriginY = this.groundY;
        this.spawnSayaGlint(false);
        this.fx?.spawn('susanooStormDomain', targetX, this.groundY - 4, {
          flip: false,
          light: 1.34
        });
        this.spawnVfxAnim(3, targetX, this.groundY - 82, 236, 236, 1.32, {
          glowColor: 'cyan'
        });
        this.spawnPixelShockwave(this.x, this.groundY - 4, 145, 'purple', 0.34, true);
        this.spawnPixelLightningBolt(this.x, this.groundY - 280, this.groundY, 'cyan', 0.36);
      }
      this.x = this._ultOriginX;
      this.y = this.groundY;
      this.vx = 0;
      this.vy = 0;
      this.facing = targetX >= this.x ? 1 : -1;
      this.divePitchRad = 0;
      return;
    }

    const omniPasses = [
      {
        t0: 0.30,
        t1: 0.48,
        p0: { x: originX, y: this.groundY },
        p1: { x: clampX(targetX + dir * 135), y: this.groundY - 128 }
      },
      {
        t0: 0.48,
        t1: 0.60,
        p0: { x: clampX(targetX + dir * 135), y: this.groundY - 128 },
        p1: { x: clampX(targetX - dir * 130), y: this.groundY - 16 }
      },
      {
        t0: 0.60,
        t1: 0.72,
        p0: { x: clampX(targetX - dir * 130), y: this.groundY - 16 },
        p1: { x: clampX(targetX + dir * 130), y: this.groundY - 142 }
      },
      {
        t0: 0.72,
        t1: 0.84,
        p0: { x: clampX(targetX + dir * 130), y: this.groundY - 142 },
        p1: { x: clampX(targetX - dir * 140), y: this.groundY - 124 }
      },
      {
        t0: 0.84,
        t1: 1.02,
        p0: { x: clampX(targetX - dir * 140), y: this.groundY - 124 },
        p1: { x: clampX(targetX + dir * 145), y: this.groundY - 188 }
      },
      {
        t0: 1.02,
        t1: 1.26,
        p0: { x: clampX(targetX + dir * 145), y: this.groundY - 188 },
        p1: { x: landX, y: this.groundY }
      }
    ];

    if (t >= 0.30 && t < 1.26) {
      let passIdx = 0;
      for (let i = omniPasses.length - 1; i >= 0; i--) {
        if (t >= omniPasses[i].t0) {
          passIdx = i;
          break;
        }
      }

      const pass = omniPasses[passIdx];
      const localU = Math.min(1, Math.max(0, (t - pass.t0) / (pass.t1 - pass.t0)));
      const easeDive =
        passIdx === 5
          ? localU * localU * (3 - 2 * localU)
          : localU < 0.5
            ? 2 * localU * localU
            : 1 - Math.pow(-2 * localU + 2, 2) / 2;

      const { p0, p1 } = pass;
      this.x = p0.x + (p1.x - p0.x) * easeDive;
      this.y = p0.y + (p1.y - p0.y) * easeDive;
      this.vx = 0;
      this.vy = 0;

      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      this.facing = dx >= 0 ? 1 : -1;
      this.divePitchRad = Math.atan2(dy, Math.max(1, Math.abs(dx)));

      this.afterimageSpawnAccum += dt;
      const spawnInterval = passIdx === 5 ? 0.018 : 0.022;
      if (this.afterimageSpawnAccum >= spawnInterval) {
        this.afterimageSpawnAccum = 0;
        const col = Math.min(20, Math.max(5, Math.floor((t / this.ultDuration) * 30)));
        this.spawnAfterimage(this.x, this.y, this.facing, 4, col, 0.32, 0);
      }

      if (passIdx < 5) {
        const stepTrigger = passIdx + 2;
        if (this._omniStep < stepTrigger && localU >= 0.25) {
          this._omniStep = stepTrigger;
          this.addSlashLine(p0.x, p0.y - 62, p1.x, p1.y - 62, 0.58);
          const hitY = (p0.y + p1.y) * 0.5 - 62;
          this.spawnVfxAnim(0, targetX, hitY, 212, 212, 0.26, {
            vx: this.facing * 260,
            flipX: this.facing < 0,
            glowColor: passIdx % 2 === 0 ? 'cyan' : 'purple'
          });
          this.spawnPixelShockwave(
            targetX,
            hitY,
            124,
            passIdx % 2 === 0 ? 'cyan' : 'purple',
            0.26,
            false
          );
          if (passIdx % 2 === 1) {
            this.spawnPixelLightningBolt(
              targetX + (passIdx - 2) * 26,
              this.groundY - 260,
              this.groundY,
              'cyan',
              0.28
            );
          }
          if (game?.audio) game.audio.play('slash', targetX);
          game?.renderer?.triggerShake?.(8, 0.12);
          if (enemy && !enemy.isDead) {
            enemy.takeDamage(36, this, true, 16, -95);
          }
        }
      }
      return;
    }

    if (t >= 1.26 && !this.didSecondaryAction) {
      this.didSecondaryAction = true;
      this.x = landX;
      this.y = this.groundY;
      this.facing = targetX >= this.x ? 1 : -1;
      this.divePitchRad = 0;
      this.spawnSayaGlint(true);

      const apexPt = omniPasses[5].p0;
      this.addSlashLine(apexPt.x, apexPt.y - 62, landX, this.groundY - 42, 0.58, true);
      this.addSlashLine(targetX, this.groundY - 275, targetX, this.groundY, 0.54, true);

      this.spawnVfxAnim(1, targetX, this.groundY - 98, 248, 248, 0.52, {
        startFrame: 18,
        endFrame: 29,
        glowColor: 'cyan'
      });
      this.spawnVfxAnim(2, targetX, this.groundY - 104, 240, 240, 0.56, {
        startFrame: 18,
        endFrame: 29,
        glowColor: 'purple'
      });
      this.spawnVfxAnim(3, targetX, this.groundY - 84, 244, 244, 0.48, {
        glowColor: 'cyan'
      });
      this.spawnVfxAnim(4, targetX, this.groundY - 92, 232, 232, 0.42, {
        glowColor: 'cyan'
      });

      this.spawnPixelShockwave(targetX, this.groundY - 6, 235, 'cyan', 0.44, true);
      this.spawnPixelShockwave(targetX, this.groundY - 82, 175, 'gold', 0.38, false);
      this.spawnPixelLightningBolt(targetX, this.groundY - 310, this.groundY, 'gold', 0.44);
      this.spawnPixelLightningBolt(targetX - 56, this.groundY - 270, this.groundY, 'cyan', 0.38);
      this.spawnPixelLightningBolt(targetX + 56, this.groundY - 270, this.groundY, 'purple', 0.38);

      if (game?.audio) game.audio.play('thunder_slam', targetX);
      game?.renderer?.triggerShake?.(15, 0.28);
      game?.renderer?.triggerAberration?.(9);
      game?.renderer?.triggerHitStop?.(0.06);
      this._hitStopTimer = Math.max(this._hitStopTimer || 0, 0.06);
      game?.vfx?.spawnBurst?.(targetX, this.groundY - 68, 32, '#818cf8', 320, {
        upBias: 175,
        size: 7
      });
      game?.vfx?.spawnDamageText?.(
        targetX,
        this.groundY - 176,
        0,
        true,
        'SUSANOO THUNDERSTORM!',
        '#38bdf8'
      );

      this.heal(22, 'SUSANOO FOCUS');
      if (enemy && !enemy.isDead) {
        enemy.takeDamage(96, this, true, 220, -245);
        if (!enemy.isDead && !enemy.isColossalBoss) {
          enemy._hitShakeTimer = Math.max(enemy._hitShakeTimer || 0, 0.082);
        }
      }
    }

    if (t >= this.ultDuration) {
      this._omniStep = 0;
      this.y = this.groundY;
      this.divePitchRad = 0;
      this.isInvulnerable = false;
      this.susanooAvatar = null;
      this.setState('IDLE');
    }
  }

  updateTrueUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    const ww = game?.renderer?.worldWidth || 1200;

    this.isInvulnerable = true;
    this.unstoppablePoise = true;
    this.isFlipVault = false;
    this.isCrouching = false;
    this.isBlinkTeleport = false;
    this.vx = 0;
    this.vy = 0;

    const foes = game?.getEnemiesOf ? game.getEnemiesOf(this) : enemy ? [enemy] : [];
    let focusEnemy = enemy && !enemy.isDead && !enemy.isBenched ? enemy : null;
    if (!focusEnemy && foes.length > 0) {
      let bestDist = Infinity;
      for (const f of foes) {
        if (f && !f.isDead && !f.isBenched) {
          const d = Math.abs(f.x - this.x);
          if (d < bestDist) {
            bestDist = d;
            focusEnemy = f;
          }
        }
      }
    }

    if (!this._trueUltInit) {
      this._trueUltInit = true;
      this._trueUltStep = 0;
      this._trueUltCutsDone = 0;
      this._trueUltAfterimageAcc = 0;

      const rawEnemyX = focusEnemy
        ? focusEnemy.x
        : this.x + (this.facing || 1) * 280;
      const dashDir =
        Math.abs(rawEnemyX - this.x) > 4
          ? rawEnemyX >= this.x
            ? 1
            : -1
          : this.facing || 1;
      this._trueUltDashDir = dashDir;

      const minTargetX = dashDir === 1 ? 195 : 235;
      const maxTargetX = dashDir === 1 ? ww - 235 : ww - 195;
      const initTargetX = Math.max(minTargetX, Math.min(maxTargetX, rawEnemyX));
      this._trueUltTargetX = initTargetX;

      let startX = this.x;
      if ((initTargetX - startX) * dashDir < 110) {
        startX = Math.max(80, Math.min(ww - 80, initTargetX - dashDir * 145));
      }
      this._trueUltStartX = startX;
      this._trueUltBackX = Math.max(80, Math.min(ww - 80, initTargetX + dashDir * 148));
      this.x = startX;
      this.y = this.groundY;
      this.facing = dashDir;

      if (game?.audio) {
        game.audio.play('ult_cast', this.x);
        game.audio.play('parry_clang', this.x);
      }
      if (game?.renderer) {
        game.renderer.ultDim = Math.max(game.renderer.ultDim || 0, 0.54);
        game.renderer.triggerShake?.(7, 0.20);
      }

      this.raijinEyeSeal = {
        x: this.x - dashDir * 10,
        y: this.groundY - 108,
        age: 0,
        alpha: 1.0,
        floorLockAlpha: 0
      };
      this.amakakeruCleaves = [];

      this.spawnSayaGlint(false);
      this.spawnPixelShockwave(this.x, this.groundY - 4, 150, 'cyan', 0.34, true);
      this.fx.spawn('susanooStormDomain', this.x, this.groundY, {
        key: 'susanooStormDomain',
        follow: this,
        offsetX: 0,
        offsetY: 0,
        useGroundY: true,
        light: 1.34
      });

      game?.vfx?.triggerCinematicCutIn?.(this, this.trueUltName, '#38bdf8');
      if (game?.vfx) {
        game.vfx.spawnShockwave(this.x, this.groundY - 4, 160, '#38bdf8', 0.34, true);
        game.vfx.spawnDamageText(
          this.x,
          this.groundY - 168,
          0,
          true,
          'AMAKAKERU: SHOGUNATE REALM SLICE',
          '#38bdf8'
        );
      }
    }

    const dashDir = this._trueUltDashDir || 1;

    if (game?.renderer && t < 2.65) {
      const dimTarget = t <= 1.95 ? 0.54 : 0.54 * Math.max(0, 1 - (t - 1.95) / 0.70);
      game.renderer.ultDim = Math.max(game.renderer.ultDim || 0, dimTarget);
    }

    if (t < 0.90 && focusEnemy && !focusEnemy.isDead) {
      const minTargetX = dashDir === 1 ? 195 : 235;
      const maxTargetX = dashDir === 1 ? ww - 235 : ww - 195;
      const desiredX = Math.max(minTargetX, Math.min(maxTargetX, focusEnemy.x));
      this._trueUltTargetX += (desiredX - this._trueUltTargetX) * Math.min(1, dt * 9.0);
      if (!focusEnemy.isColossalBoss) {
        if (focusEnemy.x > maxTargetX) focusEnemy.x -= Math.min(focusEnemy.x - maxTargetX, dt * 320);
        if (focusEnemy.x < minTargetX) focusEnemy.x += Math.min(minTargetX - focusEnemy.x, dt * 320);
      }
      if ((this._trueUltTargetX - this._trueUltStartX) * dashDir < 105) {
        this._trueUltStartX = Math.max(
          80,
          Math.min(ww - 80, this._trueUltTargetX - dashDir * 140)
        );
      }
      this._trueUltBackX = Math.max(
        80,
        Math.min(ww - 80, this._trueUltTargetX + dashDir * 148)
      );
    }

    const targetX = this._trueUltTargetX;
    const startX = this._trueUltStartX;
    const backSideX = this._trueUltBackX;

    if (this.raijinEyeSeal) {
      this.raijinEyeSeal.age += dt;
      this.raijinEyeSeal.x = this.x - this.facing * 10;
      this.raijinEyeSeal.y = this.y - 106;
      this.raijinEyeSeal.alpha =
        t < 2.25 ? Math.min(1, t / 0.20) : Math.max(0, 1 - (t - 2.25) / 0.55);
      this.raijinEyeSeal.floorLockAlpha =
        t >= 0.92 && t < 2.15
          ? Math.min(1, (t - 0.92) / 0.14) * (t <= 1.95 ? 1 : Math.max(0, 1 - (t - 1.95) / 0.20))
          : 0;
    }

    for (let i = this.amakakeruCleaves.length - 1; i >= 0; i--) {
      const c = this.amakakeruCleaves[i];
      c.age += dt;
      if (c.age >= c.maxLife) {
        this.amakakeruCleaves.splice(i, 1);
      }
    }

    if (t >= 1.04 && t < 1.95 && focusEnemy && !focusEnemy.isDead && !focusEnemy.isColossalBoss) {
      const drift = focusEnemy.x - targetX;
      if (Math.abs(drift) > 18) {
        focusEnemy.x -= Math.sign(drift) * Math.min(Math.abs(drift) - 18, dt * 420);
      }
      focusEnemy.vx = 0;
      focusEnemy.vy = Math.min(0, focusEnemy.vy || 0);
    }

    // BEAT 1 (`0.00s .. 0.92s`): Grounded Iaido Battojutsu Charge & Pose
    if (t < 0.92) {
      this.x = startX;
      this.y = this.groundY;
      this.facing = dashDir;
      this.cameraAirLift = 0;
      this.divePitchRad = 0;
      const fIdx = 214 + Math.min(4, Math.floor((t / 0.92) * 5));
      this.trueUltFrameOverride = fIdx;
      this._overrideFrameIdx = fIdx;

      if (t >= 0.46 && this._trueUltStep < 1) {
        this._trueUltStep = 1;
        if (game?.audio) game.audio.play('parry_clang', this.x);
        this.spawnSayaGlint(true);
        this.spawnPixelShockwave(this.x, this.groundY - 4, 132, 'gold', 0.28, true);
      }
      return;
    }

    // BEAT 2 (`0.92s .. 1.34s`): Single Supersonic Iaido Flash-Dash Through Enemy onto Back Side
    if (t < 1.34) {
      if (this._trueUltStep < 2) {
        this._trueUltStep = 2;
        if (game?.audio) {
          game.audio.play('blink', this.x);
          game.audio.play('dash_whoosh', this.x);
        }
        this.spawnAfterimage(startX, this.groundY, dashDir, 7, 8, 0.34);
        this.spawnPixelShockwave(startX, this.groundY - 4, 155, 'cyan', 0.28, true);
      }

      const dashSpan = 0.28;
      const rawU = Math.min(1, Math.max(0, (t - 0.92) / dashSpan));
      const easeDash = 1 - Math.pow(1 - rawU, 3.0);

      this.x = startX + (backSideX - startX) * easeDash;
      this.y = this.groundY;
      this.facing = dashDir;
      this.divePitchRad = 0;
      this.cameraAirLift = 0;

      if (rawU < 0.55) {
        this.trueUltFrameOverride = rawU < 0.28 ? 132 : 133;
        this.syncSpearMachCone();
      } else if (rawU < 0.96) {
        this.fx?.stopByKey('shunpoSpearMachCone');
        this.trueUltFrameOverride = rawU < 0.72 ? 65 : rawU < 0.86 ? 66 : 67;
      } else {
        this.fx?.stopByKey('shunpoSpearMachCone');
        this.trueUltFrameOverride = 237;
      }
      this._overrideFrameIdx = this.trueUltFrameOverride;

      if (rawU < 0.95) {
        this._trueUltAfterimageAcc += dt;
        if (this._trueUltAfterimageAcc >= 0.022) {
          this._trueUltAfterimageAcc = 0;
          this.spawnAfterimage(this.x, this.groundY, dashDir, 4, 12, 0.34);
        }
      }

      if (this._trueUltCutsDone === 0 && rawU >= 0.42) {
        this._trueUltCutsDone = 1;
        if (
          focusEnemy &&
          !focusEnemy.isDead &&
          !focusEnemy.isColossalBoss &&
          (backSideX - focusEnemy.x) * dashDir < 48
        ) {
          focusEnemy.x = targetX;
        }

        this.addSlashLine(
          targetX - dashDir * 245,
          this.groundY - 66,
          targetX + dashDir * 245,
          this.groundY - 122,
          1.05,
          false
        );
        this.spawnPixelLightningBolt(targetX, this.groundY - 260, this.groundY, 'cyan', 0.26);
        this.spawnPixelShockwave(targetX, this.groundY - 88, 145, 'cyan', 0.26, false);

        if (game?.audio) game.audio.play('raijin_slash', targetX);
        if (game?.renderer) {
          game.renderer.triggerShake?.(9, 0.14);
          game.renderer.triggerHitStop?.(0.045);
        }
        if (game?.vfx) {
          game.vfx.spawnDamageText(
            targetX,
            this.groundY - 158,
            0,
            true,
            'IAIDO FLASH-CUT!',
            '#67e8f9'
          );
        }

        let slashedAny = false;
        for (const foe of foes) {
          if (foe && !foe.isDead && !foe.isBenched && Math.abs(foe.x - targetX) < 235) {
            foe.takeDamage(foe === focusEnemy ? 120 : 95, this, true, 12, -18);
            foe.vx = 0;
            slashedAny = true;
          }
        }
        if (!slashedAny && focusEnemy && !focusEnemy.isDead) {
          focusEnemy.takeDamage(120, this, true, 12, -18);
          focusEnemy.vx = 0;
        }
      }
      return;
    }

    // BEAT 3 (`1.34s .. 3.70s`): Zanshin Back-Side Pause -> Noto Resheath -> t = 1.95s Tsuba Click -> 3-Way Shogunate Realm Slice!
    if (this._trueUltStep < 3) {
      this._trueUltStep = 3;
      this.fx?.stopByKey('shunpoSpearMachCone');
      this.x = backSideX;
      this.y = this.groundY;
      this.facing = dashDir;
      this.divePitchRad = 0;
      this.cameraAirLift = 0;
      this.spawnPixelShockwave(this.x, this.groundY - 4, 96, 'cyan', 0.24, true);
    }

    if (t < 1.95) {
      const uSheath = (t - 1.34) / 0.61;
      const sheathFrames = [237, 236, 210, 211, 212, 213, 214];
      const fIdx =
        sheathFrames[Math.min(sheathFrames.length - 1, Math.floor(uSheath * sheathFrames.length))];
      this.trueUltFrameOverride = fIdx;
      this._overrideFrameIdx = fIdx;
      this.x = backSideX;
      this.y = this.groundY;
      this.facing = dashDir;
      return;
    }

    if (this._trueUltStep < 4) {
      this._trueUltStep = 4;
      this.x = backSideX;
      this.y = this.groundY;
      this.facing = dashDir;
      this.spawnSayaGlint(true);

      // 3-Way Bidirectional Stage Domain Synergy (`shogunate` / `shogunate_inferno` / `shogunate_glacial`)!
      const activeStageNow = game?.renderer?.getActiveStageId?.() || game?.renderer?.stageId || 'cathedral';
      const permStageNow = game?.renderer?.permanentStageOverride || '';
      const stageAlreadyBurning =
        activeStageNow === 'inferno' ||
        activeStageNow === 'shogunate_inferno' ||
        permStageNow === 'inferno' ||
        permStageNow === 'shogunate_inferno';
      const stageAlreadyGlacial =
        !stageAlreadyBurning &&
        (activeStageNow === 'glacial' ||
          activeStageNow === 'shogunate_glacial' ||
          permStageNow === 'glacial' ||
          permStageNow === 'shogunate_glacial');
      const destStageKey = stageAlreadyBurning
        ? 'shogunate_inferno'
        : stageAlreadyGlacial
          ? 'shogunate_glacial'
          : 'shogunate';

      if (game?.audio) {
        game.audio.play('parry_clang', this.x);
        game.audio.play('raijin_slash', targetX);
        game.audio.play('thunder_slam', targetX);
        game.audio.play('hit_crit', targetX);
      }
      if (game?.renderer) {
        game.renderer.triggerShogunateStage?.(destStageKey);
        game.renderer.setStageTransformation?.(destStageKey, 1.0, true);
        game.renderer.triggerDimensionalStageSlice?.({
          fromStageId: activeStageNow,
          toStageId: game.renderer.permanentStageOverride || destStageKey,
          focusX: targetX,
          focusY: this.groundY - 92,
          dir: dashDir,
          duration: 1.08
        });
        game.renderer.triggerImpactFrame?.(
          targetX,
          this.groundY - 92,
          0.14,
          stageAlreadyBurning ? 'inferno' : 'storm'
        );
        game.renderer.triggerShake?.(22, 0.38);
        game.renderer.triggerAberration?.(12);
        game.renderer.triggerHitStop?.(0.085);
      }

      for (const line of this.activeSlashLines) {
        line.detonated = true;
      }
      this.triggerTrueUltLightningSurge(
        targetX,
        this.groundY,
        dashDir,
        ww,
        stageAlreadyBurning,
        stageAlreadyGlacial
      );

      const boltColor = stageAlreadyBurning ? 'gold' : 'cyan';
      this.spawnPixelShockwave(targetX, this.groundY - 6, 320, boltColor, 0.46, true);
      for (const offX of [-270, -90, 90, 270]) {
        const bx = Math.max(50, Math.min(ww - 50, targetX + offX));
        this.spawnPixelLightningBolt(
          bx,
          this.groundY - 480,
          this.groundY,
          offX % 180 === 0 ? boltColor : 'purple',
          0.46
        );
      }

      if (game?.vfx) {
        const waveCol = stageAlreadyBurning ? '#fb923c' : stageAlreadyGlacial ? '#a5f3fc' : '#38bdf8';
        const callout = stageAlreadyBurning
          ? 'BURNING SHOGUNATE REALM SLICE!'
          : stageAlreadyGlacial
            ? 'FROZEN SHOGUNATE REALM SLICE!'
            : 'SHOGUNATE REALM SLICE!';
        game.vfx.spawnShockwave(targetX, this.groundY - 6, 320, waveCol, 0.48, true);
        game.vfx.spawnBurst(targetX, this.groundY - 76, 36, waveCol, 365, { upBias: 205, size: 5 });
        game.vfx.spawnDamageText(targetX, this.groundY - 198, 0, true, callout, waveCol);
      }

      this.heal(Math.round(this.maxHp * 0.12), 'ZANSHIN RENEWAL');
      let hitFinisher = false;
      for (const foe of foes) {
        if (foe && !foe.isDead && !foe.isBenched && Math.abs(foe.x - targetX) < 265) {
          foe.takeDamage(foe === focusEnemy ? 560 : 425, this, true, 255 * dashDir, -285);
          hitFinisher = true;
        }
      }
      if (!hitFinisher && focusEnemy && !focusEnemy.isDead) {
        focusEnemy.takeDamage(560, this, true, 255 * dashDir, -285);
      }
    }

    if (t < 3.25) {
      const uHold = (t - 1.95) / 1.30;
      this.x = backSideX;
      this.y = this.groundY;
      this.facing = dashDir;
      const fIdx = 215 + Math.min(3, Math.floor(uHold * 4));
      this.trueUltFrameOverride = fIdx;
      this._overrideFrameIdx = fIdx;
      return;
    }

    const uRise = Math.min(1, (t - 3.25) / 0.45);
    this.y = this.groundY;
    const riseIdx = 235 + Math.min(4, Math.floor(uRise * 5));
    this.trueUltFrameOverride = riseIdx;
    this._overrideFrameIdx = riseIdx;

    if (t >= this.trueUltDuration) {
      this.y = this.groundY;
      this.divePitchRad = 0;
      this.cameraAirLift = 0;
      this.isInvulnerable = false;
      this.unstoppablePoise = false;
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      this.raijinEyeSeal = null;
      this.trueUltLightningSurge = null;
      if (focusEnemy && !focusEnemy.isDead && Math.abs(focusEnemy.x - this.x) > 8) {
        this.facing = focusEnemy.x >= this.x ? 1 : -1;
      }
      this.setState('IDLE');
    }
  }

  triggerTrueUltLightningSurge(
    focusX,
    groundY,
    dir = 1,
    worldWidth = 1200,
    isInferno = false,
    isGlacial = false
  ) {
    this.trueUltLightningSurge = {
      focusX,
      groundY,
      dir: dir >= 0 ? 1 : -1,
      worldWidth: worldWidth || 1200,
      isInferno: Boolean(isInferno),
      isGlacial: Boolean(isGlacial),
      age: 0,
      maxLife: 1.18
    };
  }

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

    if (row !== 0) {
      const glowSprite =
        glowColor === 'gold'
          ? renderer?.glowGold || renderer?.glowCyan
          : glowColor === 'purple'
            ? renderer?.glowViolet || renderer?.glowPurple || renderer?.glowCyan
            : renderer?.glowCyan;
      if (glowSprite) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(0.16, alpha * 0.16);
        const gw = Math.round(w * 1.04);
        const gh = Math.round(h * 1.04);
        ctx.drawImage(glowSprite, -gw * 0.5, -gh * 0.5, gw, gh);
      }
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.drawImage(vfxSheet, sx, sy, cell, cell, -w * 0.5, -h * 0.5, w, h);

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(0.24, alpha * (row === 0 ? 0.18 : 0.24));
    ctx.drawImage(vfxSheet, sx, sy, cell, cell, -w * 0.5, -h * 0.5, w, h);

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  drawCleanBladeCutsWorld(ctx) {
    if (!this.cleanBladeCuts || this.cleanBladeCuts.length === 0) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';

    for (const c of this.cleanBladeCuts) {
      const u = Math.min(1, Math.max(0, c.age / Math.max(0.01, c.maxLife)));
      const fade = 1 - u;
      if (fade <= 0.02) continue;

      if (c.type === 'blade') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = fade * 0.56;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(Math.round(c.x0), Math.round(c.y0));
        ctx.lineTo(Math.round(c.x1), Math.round(c.y1));
        ctx.stroke();

        ctx.globalAlpha = fade * 0.94;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(Math.round(c.x0), Math.round(c.y0));
        ctx.lineTo(Math.round(c.x1), Math.round(c.y1));
        ctx.stroke();
      } else if (c.type === 'wound') {
        const span = (c.isCrit ? 34 : 26) * (0.65 + 0.35 * Math.min(1, u * 3.2));
        const dx = c.dir * span;
        const dy = span * (c.slope || -0.14);
        const x0 = Math.round(c.x - dx);
        const y0 = Math.round(c.y - dy);
        const x1 = Math.round(c.x + dx);
        const y1 = Math.round(c.y + dy);

        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = fade * 0.94;
        ctx.strokeStyle = c.isCrit ? '#4f46e5' : '#9f1239';
        ctx.lineWidth = c.isCrit ? 5 : 4;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();

        ctx.strokeStyle = c.isCrit ? '#38bdf8' : '#fb7185';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(Math.round(c.x - dx * 0.72), Math.round(c.y - dy * 0.72));
        ctx.lineTo(Math.round(c.x + dx * 0.72), Math.round(c.y + dy * 0.72));
        ctx.stroke();

        for (let k = 0; k < 6; k++) {
          const spd = 72 + ((c.seed + k * 23) % 88);
          const spreadY = ((k % 3) - 1) * 24 + (c.slope || 0) * 65;
          const sx = Math.round((c.x + c.dir * (10 + u * spd) + (k - 2.5) * 4) / 2) * 2;
          const sy = Math.round((c.y + u * spreadY + u * u * 38) / 2) * 2;
          ctx.fillStyle = k % 3 === 0 ? '#ffffff' : k % 2 === 0 ? '#fde047' : '#38bdf8';
          const sz = k === 0 ? 4 : 3;
          ctx.fillRect(sx, sy, sz, sz - (k % 2));
        }
      }
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  drawLightningSurgeWorld(ctx, renderer = null) {
    const surge = this.trueUltLightningSurge;
    if (!surge) return;
    const u = Math.min(1, Math.max(0, surge.age / Math.max(0.05, surge.maxLife)));
    const fade = u < 0.14 ? 1.0 : Math.pow(1 - (u - 0.14) / 0.86, 1.25);
    if (fade <= 0.015) return;

    const fx = surge.focusX;
    const gy = surge.groundY;
    const isInf = surge.isInferno;
    const isGlac = surge.isGlacial;
    const outerCol = isInf ? '#ea580c' : isGlac ? '#0284c7' : '#4f46e5';
    const midCol = isInf ? '#fb923c' : isGlac ? '#a5f3fc' : '#38bdf8';
    const hiCol = isInf ? '#fef08a' : '#e0f2fe';
    const glowTex = isInf ? renderer?.glowOrange || renderer?.glowGold : renderer?.glowCyan;
    const tick = Math.floor(surge.age * 24);

    const hashSigned = (n) => {
      const s = Math.sin(n * 127.1 + tick * 311.7) * 43758.5453;
      return (s - Math.floor(s)) * 2 - 1;
    };

    const strokeJaggedBolt = (x0, y0, x1, y1, segs, jitterAmp, wOuter, wMid, wCore, seedBase, alphaScale = 1) => {
      const pts = [[Math.round(x0), Math.round(y0)]];
      const dx = x1 - x0;
      const dy = y1 - y0;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      for (let s = 1; s < segs; s++) {
        const f = s / segs;
        const env = Math.sin(f * Math.PI);
        const off = hashSigned(seedBase + s * 13.7) * jitterAmp * (0.45 + 0.55 * env);
        pts.push([
          Math.round((x0 + dx * f + nx * off) / 2) * 2,
          Math.round((y0 + dy * f + ny * off) / 2) * 2
        ]);
      }
      pts.push([Math.round(x1), Math.round(y1)]);

      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(0.75, fade * 0.58 * alphaScale);
      ctx.strokeStyle = outerCol;
      ctx.lineWidth = wOuter;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let s = 1; s < pts.length; s++) ctx.lineTo(pts[s][0], pts[s][1]);
      ctx.stroke();

      ctx.globalAlpha = Math.min(0.92, fade * 0.84 * alphaScale);
      ctx.strokeStyle = midCol;
      ctx.lineWidth = wMid;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let s = 1; s < pts.length; s++) ctx.lineTo(pts[s][0], pts[s][1]);
      ctx.stroke();

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = Math.min(1, fade * 0.96 * alphaScale);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = wCore;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let s = 1; s < pts.length; s++) ctx.lineTo(pts[s][0], pts[s][1]);
      ctx.stroke();

      return pts;
    };

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';

    if (u < 0.24) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (1 - u / 0.24) * 0.14;
      ctx.fillStyle = midCol;
      ctx.fillRect(fx - 900, gy - 680, 1800, 860);
    }

    const skyOffsets = [-540, -405, -270, -135, 0, 135, 270, 405, 540];
    for (let b = 0; b < skyOffsets.length; b++) {
      const stagger = (b % 3) * 0.05;
      if (u < stagger) continue;
      const isCenter = skyOffsets[b] === 0;
      const bxTop = fx + skyOffsets[b] + hashSigned(b * 19 + 3) * 34;
      const bxBot = fx + skyOffsets[b] + hashSigned(b * 31 + 7) * 26;
      const byTop = gy - 580;
      const byBot = gy + ((b % 3) - 1) * 10;
      const spine = strokeJaggedBolt(
        bxTop,
        byTop,
        bxBot,
        byBot,
        12,
        isCenter ? 38 : 30,
        isCenter ? 9 : 6,
        isCenter ? 4.5 : 3,
        isCenter ? 2.2 : 1.5,
        100 + b * 41,
        isCenter ? 1.0 : 0.88
      );

      const forkA = spine[4] || [bxTop, gy - 360];
      const forkB = spine[8] || [bxBot, gy - 180];
      const sideA = b % 2 === 0 ? -1 : 1;
      strokeJaggedBolt(
        forkA[0],
        forkA[1],
        forkA[0] + sideA * (64 + (b % 3) * 22),
        forkA[1] + 96,
        5,
        14,
        3.5,
        2.0,
        1.0,
        500 + b * 29,
        0.78
      );
      strokeJaggedBolt(
        forkB[0],
        forkB[1],
        forkB[0] - sideA * (54 + (b % 2) * 24),
        forkB[1] + 84,
        4,
        12,
        3.0,
        1.8,
        1.0,
        700 + b * 37,
        0.74
      );

      if (glowTex && b % 2 === 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(0.20, fade * 0.18);
        ctx.drawImage(glowTex, bxBot - 36, byBot - 22, 72, 44);
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = fade * 0.92;
      ctx.fillStyle = hiCol;
      ctx.fillRect(Math.round(bxBot) - 14, Math.round(byBot) - 2, 28, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(bxBot) - 6, Math.round(byBot) - 6, 12, 12);
    }

    const webHeights = [-410, -305, -210, -125, -68, -26];
    for (let w = 0; w < webHeights.length; w++) {
      const reach = (260 + u * 440) * (0.85 + (w % 2) * 0.18);
      const wy0 = gy + webHeights[w] + hashSigned(900 + w * 17) * 24;
      const wy1 = gy + webHeights[w] - surge.dir * (w % 2 === 0 ? 46 : -38);
      strokeJaggedBolt(fx - reach, wy0, fx + reach, wy1, 14, 26, 5.5, 2.6, 1.3, 1100 + w * 53, 0.84);
    }

    for (let g = 0; g < 14; g++) {
      const gDir = g % 2 === 0 ? 1 : -1;
      const lane = Math.floor(g / 2);
      const startX = fx + gDir * (14 + lane * 26);
      const endX = startX + gDir * (130 + lane * 68) * (0.45 + 0.55 * Math.min(1, u * 2.2));
      const gy0 = gy - 8 + ((g * 7) % 30);
      const gy1 = gy - 6 + (((g + 3) * 11) % 32);
      strokeJaggedBolt(startX, gy0, endX, gy1, 6, 11, 4.0, 2.0, 1.0, 1600 + g * 23, 0.80);
    }

    for (let e = 0; e < 8; e++) {
      const ang = (e / 8) * Math.PI * 2 + tick * 0.35;
      const rIn = 10 + (e % 2) * 8;
      const rOut = 74 + (e % 3) * 28;
      const cy = gy - 88;
      strokeJaggedBolt(
        fx + Math.cos(ang) * rIn,
        cy + Math.sin(ang) * rIn * 0.85,
        fx + Math.cos(ang + 0.45) * rOut,
        cy + Math.sin(ang + 0.45) * rOut * 0.85,
        5,
        15,
        5.0,
        2.5,
        1.3,
        2100 + e * 31,
        0.92
      );
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  drawForegroundOverlay(ctx, renderer = null) {
    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    if (this.fx && !this.isDead) {
      this.fx.renderLayer(ctx, 'back', arenaCenterX, this.groundY, 0.96);
    }

    const sprites = this.getExSprites();
    const sheet = PixelForge.ensureImage?.(sprites?.sheet) || sprites?.sheet;
    const vfxSheet = PixelForge.ensureImage?.(sprites?.vfx) || sprites?.vfx;

    if (this.raijinEyeSeal && vfxSheet?.complete && vfxSheet.naturalWidth) {
      const seal = this.raijinEyeSeal;
      const col = Math.floor(seal.age * 30) % 30;
      if (seal.floorLockAlpha > 0.02) {
        const cell = 208;
        const sx = ((col + 10) % 30) * cell;
        const sy = 5 * cell;
        const fw = 328;
        const fh = 328;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(Math.round(this._trueUltTargetX), Math.round(this.groundY - 4));
        ctx.scale(1, 0.32);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = seal.floorLockAlpha * 0.88;
        ctx.drawImage(vfxSheet, sx, sy, cell, cell, -fw * 0.5, -fh * 0.5, fw, fh);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = seal.floorLockAlpha * 0.55;
        ctx.drawImage(vfxSheet, sx, sy, cell, cell, -fw * 0.5, -fh * 0.5, fw, fh);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.restore();
      }
      if (seal.alpha > 0.02) {
        const deploy = Math.min(1, seal.age / 0.20);
        const sz = Math.round(258 * (0.6 + 0.4 * deploy));
        this.drawBloomedVfxCell(
          ctx,
          vfxSheet,
          5,
          col,
          seal.x,
          seal.y,
          sz,
          sz,
          seal.alpha * 0.94,
          false,
          renderer,
          'cyan'
        );
      }
    }

    if (this.afterimages.length > 0 && sheet?.complete && sheet.naturalWidth) {
      for (let i = 0; i < this.afterimages.length; i++) {
        const img = this.afterimages[i];
        const alpha = Math.max(0, (1 - img.age / img.maxLife) * 0.58);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(Math.round(img.x / 2) * 2, Math.round((img.y + 4) / 2) * 2);
        ctx.scale(img.facing, 1);
        ctx.globalAlpha = alpha;
        PixelForge.drawSilhouetteFrame(ctx, sprites, img.frameIdx || 190, 208, 208, '#38bdf8');
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    }

    if (this.activeVfxAnims.length > 0 && vfxSheet?.complete && vfxSheet.naturalWidth) {
      for (let i = 0; i < this.activeVfxAnims.length; i++) {
        const v = this.activeVfxAnims[i];
        const isFront = v.inFront !== undefined ? v.inFront : v.row >= 3;
        if (isFront) continue;
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
    const sprites = this.getExSprites();
    const vfxSheet = PixelForge.ensureImage?.(sprites?.vfx) || sprites?.vfx;

    this.drawCleanBladeCutsWorld(ctx);
    this.drawLightningSurgeWorld(ctx, renderer);

    if (this.activeVfxAnims.length > 0 && vfxSheet?.complete && vfxSheet.naturalWidth) {
      for (let i = 0; i < this.activeVfxAnims.length; i++) {
        const v = this.activeVfxAnims[i];
        const isFront = v.inFront !== undefined ? v.inFront : v.row >= 3;
        if (!isFront) continue;
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

    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    if (this.fx && !this.isDead) {
      this.fx.renderLayer(ctx, 'front', arenaCenterX, this.groundY, 0.98);
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

    if (this.hitFlash > 0 && !isReflection) {
      const frameIdx = PixelForge.getFrameIndex(this, this.walkPhase);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5;
      PixelForge.drawGhostFrame(ctx, sprites, frameIdx, w, h);
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
