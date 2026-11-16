import { Fighter } from './Fighter.js?v=30fps114';
import { PixelForge } from '../engine/PixelForge.js?v=30fps114';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps114';
import { SERAPHIC_EFFECT_REGISTRY } from '../engine/shaders/seraphicShaders.js?v=30fps114';

const AUTO_SLICES_EX = [
  [60, 8], // Beat 1 (V0, 0.36s): Grounded Wide Sanctum Sweep + Holy Light Bolt -> snaps at F03 (63)
  [68, 7], // Beat 2 (V1, 0.34s): Grounded Reverse Rising Benediction Arc + Twin Holy Bolts -> snaps at F09 (69)
  [75, 8], // Beat 3 (V2, 0.38s): Grounded 2.5D Cathedral Rose-Halo Vortex (2-Hit + Holy Spear) -> snaps at F17/F18 (77/78)
  [83, 7]  // Beat 4 (V3, 0.52s): Grounded Radiant Star-Pillar Finisher (3-Hit + Dawn Grace + Holy Bolt) -> snaps at F25 (85)
];

const BEAT_DURATIONS = [0.36, 0.34, 0.38, 0.52];
const INTRA_COMBO_LINK = 0.015;

/**
 * Seraphina EX (`priestess_ex`) — Neo-Vision Seraphic Sovereign.
 * Next-Gen Wide-Canvas (`320x240`, `anchorX=112, anchorY=230`, right-facing `+X` native)
 * FFBE / Last Cloudia Sunburst Cathedral Scepter-Lance + Sacred Artillery Champion.
 * Coexists 100% independently alongside Legacy Seraphina (`priestess`).
 */
export class PriestessEx extends Fighter {
  constructor(x, groundY, facing = 1) {
    const opts = typeof x === 'object' && x !== null ? x : { x, groundY, facing };
    super({
      ...opts,
      name: opts.name || 'Seraphina EX',
      maxHp: 3720,
      attackRange: 228,
      moveSpeed: 180,
      autoInterval: 1.02,
      lightColor: 'rgba(253, 224, 71, 1)',
      primaryColor: '#fde047',
      secondaryColor: '#ffffff',
      hasTrueUltimate: true,
      trueUltName: 'FINAL GRACE',
      trueUltDuration: 4.25
    });

    this.heroId = 'priestess_ex';
    this.theme = 'radiant';
    this.deathSfx = 'death_priestess';
    this.hasPoise = true;

    this.autoDuration = BEAT_DURATIONS[0];
    this._postFlurryInterval = 1.50;

    this.skillName = 'DIVINE SANCTUARY';
    this.skillMaxCooldown = 4.80;
    this.skillCooldown = 1.20;
    this.skillDuration = 0.98;
    this.skillTriggerRange = 460;

    this.ultName = 'SERAPHIC CATHEDRAL';
    this.ultSub = 'ARCHANGEL ASCENT & SANCTUM SPIRES';
    this.ultDuration = 1.56;

    this.trueUltName = 'FINAL GRACE';
    this.trueUltSub = 'SUPREME FINISHER - PURIFYING HORIZON BEAM';
    this.trueUltDuration = 4.25;

    // Mobility, Seraphic Wing Vault & Benediction Ward State
    this.haloPhase = 0;
    this.shotCombo = 0;
    this.dodgeMaxCooldown = 3.55;
    this.dashMaxCooldown = 3.40;
    this.wallWingCooldown = 0;
    this.crouchCooldown = 0;
    this.crouchDuration = 0.94;
    this.isCrouching = false;
    this.isDeflecting = false;
    this.isFlipVault = false;
    this.isBlinkTeleport = false;
    this.isAngelicAscent = false;
    this.ascentStartX = this.x;
    this.ascentTargetX = this.x;
    this.wingSpearCount = 0;

    // 4-Beat Strictly Grounded Scepter-Lance Combo State (`0px` float across V0..V3!)
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
    this._drewScepterFocus = false;

    // Skill / Overdrive / Final Grace State
    this.didSanctuaryHeal = false;
    this.didUltMiracle = false;
    this.ultChakramStep = 0;
    this._spawnedBenedictionWard = false;

    this.finalGraceBeamActive = false;
    this.finalGraceBeamTimer = 0;
    this.finalGraceChargeProgress = 0;
    this.finalGraceDidHeal = false;
    this.finalGraceDidFire = false;
    this.finalGraceBeamY = 0;
    this.finalGraceMuzzleX = 0;
    this._finalGracePlayedChargeSfx = false;
    this._finalGracePulseAccum = 0;
    this._finalGraceMoteAccum = 0;

    // Pixel-pure visual layers (zero canvas rotation, zero smooth ellipses)
    this._overrideFrameIdx = null;
    this.afterimages = [];
    this.afterimageAccum = 0;
    this.activeVfxAnims = [];
    this.razorScars = [];
    this.stepDustTimer = 0;

    this.fx = new ArcaneShaderFX(SERAPHIC_EFFECT_REGISTRY, {
      pixelScale: 3,
      viewW: 540,
      viewH: 320
    });

    if (typeof Image !== 'undefined') {
      PixelForge.ensureHeroLoaded?.('priestess_ex');
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
      archetype: 'SERAPHIC_SOVEREIGN',
      preferredDist: 208,
      minSafeDist: 108,
      aggression: 0.80,
      dodgeRate: 0.74,
      skillBias: 0.88
    };
  }

  takeDamage(amount, attacker, isCrit = false, knockX = 0, knockY = 0) {
    // Unbreakable Final Grace Charge: absorbs incoming strikes into tankedDamage without losing HP
    if (this.state === 'TRUE_ULTIMATE' && !this.finalGraceDidFire) {
      const absorbed = Math.max(0, Math.round(amount || 0));
      this.tankedDamage = (this.tankedDamage || 0) + absorbed;
      return 0;
    }
    return super.takeDamage(amount, attacker, isCrit, knockX, knockY);
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
    this._drewScepterFocus = false;
    this._spawnedBenedictionWard = false;

    if (
      newState !== 'JUMP' &&
      newState !== 'DODGE' &&
      newState !== 'SKILL' &&
      newState !== 'ULTIMATE' &&
      newState !== 'TRUE_ULTIMATE'
    ) {
      this.fx?.stopByKey('sanctuaryCathedralSeal');
    }
    if (
      newState !== 'JUMP' &&
      newState !== 'DODGE' &&
      newState !== 'DASH' &&
      newState !== 'ULTIMATE' &&
      newState !== 'TRUE_ULTIMATE'
    ) {
      this.fx?.stopByKey('seraphicSlipstreamTrail');
    }
    if (newState !== 'ULTIMATE' && newState !== 'TRUE_ULTIMATE') {
      this.fx?.stopByKey('ophanimChakramWheel');
    }

    if (newState === 'AUTO_ATTACK') {
      if (this._comboPersistTimer <= 0 && prevState !== 'AUTO_ATTACK') {
        this.comboStep = 0;
      }
      this.isAngelicAscent = false;
      this.isFlipVault = false;
      this.y = this.groundY;
      this.vy = 0;
      this._beginComboBeat(this.comboStep % 4, this.game);
    } else if (newState !== 'ULTIMATE' && newState !== 'TRUE_ULTIMATE') {
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
    }

    if (newState === 'SKILL') {
      this.didSanctuaryHeal = false;
      this.isAngelicAscent = false;
      this.y = this.groundY;
    }

    if (newState === 'ULTIMATE') {
      this.didUltMiracle = false;
      this.ultChakramStep = 0;
      this.isInvulnerable = true;
    }

    if (newState === 'TRUE_ULTIMATE') {
      this.isInvulnerable = true;
      this.unstoppablePoise = true;
      this.hurtTimer = 0;
      this.isCrouching = false;
      this.isDeflecting = false;
      this.isFlipVault = false;
      this.isBlinkTeleport = false;
      this.isAngelicAscent = false;
      this.finalGraceBeamActive = false;
      this.finalGraceBeamTimer = 0;
      this.finalGraceChargeProgress = 0;
      this.finalGraceDidHeal = false;
      this.finalGraceDidFire = false;
      this._finalGracePlayedChargeSfx = false;
      this._finalGracePulseAccum = 0.24;
      this._finalGraceMoteAccum = 0;
    } else {
      this.finalGraceBeamActive = false;
      this.finalGraceBeamTimer = 0;
      this.finalGraceChargeProgress = 0;
      this.finalGraceDidHeal = false;
      this.finalGraceDidFire = false;
      this._finalGracePulseAccum = 0;
      this._finalGraceMoteAccum = 0;
      if (newState !== 'AUTO_ATTACK') {
        this.unstoppablePoise = false;
      }
      this.fx?.stopByKey('seraphicFinalGraceCharge');
    }

    if (newState === 'DEATH') {
      this.fx?.clear();
      this.isAngelicAscent = false;
      this.finalGraceBeamActive = false;
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      this.razorScars.length = 0;
    }
  }

  /**
   * Initializes one strictly grounded beat (`0..3`) of Seraphina EX's 4-beat Sunburst Cathedral Scepter-Lance combo.
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
    this._drewScepterFocus = false;
    this._comboPersistTimer = 0.76;
    this.unstoppablePoise = v >= 2;
    this.isAngelicAscent = false;
    this.y = this.groundY;
    this.vy = 0;

    const startFrame = AUTO_SLICES_EX[v][0];
    this.trueUltFrameOverride = startFrame;
    this._overrideFrameIdx = startFrame;

    const enemy = this._currentEnemy || null;
    if (enemy && !enemy.isDead && !enemy.isDummyFocal) {
      this.facing = enemy.x >= this.x ? 1 : -1;
    }

    this._beatStartX = this.x;
    let desiredX = this.x + this.facing * (v === 0 ? 20 : v === 2 ? 18 : 12);

    if (enemy && !enemy.isDead) {
      const horizDist = Math.abs(enemy.x - this.x);
      if (horizDist <= 280) {
        const sweetDist = v === 2 ? 110 : 116;
        const idealStandX = enemy.x - this.facing * sweetDist;
        const rawDelta = (idealStandX - this.x) * this.facing;
        const maxForward = v === 0 ? 108 : v === 2 ? 46 : 32;
        const clampedForward = Math.max(0, Math.min(maxForward, rawDelta));
        desiredX = this.x + this.facing * clampedForward;
      } else {
        const flashStep = v === 0 ? 26 : v === 2 ? 22 : 14;
        desiredX = this.x + this.facing * flashStep;
      }
    }

    this._beatTargetX = this._clampArenaX(desiredX, game);
  }

  queueNextComboBeat() {
    this._queuedNextBeat = true;
  }

  ensureSlipstream() {
    if (!this.fx) return;
    if (!this.fx.active.some((s) => s.key === 'seraphicSlipstreamTrail')) {
      this.fx.spawn('seraphicSlipstreamTrail', this.x - this.facing * 8, this.y - 114, {
        follow: this,
        offsetX: -8,
        offsetY: -114,
        flip: this.facing < 0,
        light: 1.15
      });
    }
  }

  ensureSanctuarySeal(isUltimate = false) {
    if (!this.fx) return;
    if (!this.fx.active.some((s) => s.key === 'sanctuaryCathedralSeal')) {
      this.fx.spawn('sanctuaryCathedralSeal', this.x, this.groundY, {
        follow: this,
        offsetX: 0,
        offsetY: 0,
        useGroundY: true,
        flip: false,
        light: isUltimate ? 1.32 : 1.18,
        extra: { isUltimate }
      });
    }
  }

  ensureOphanimWheel() {
    if (!this.fx) return;
    if (!this.fx.active.some((s) => s.key === 'ophanimChakramWheel')) {
      this.fx.spawn('ophanimChakramWheel', this.x, this.y - 118, {
        follow: this,
        offsetX: 0,
        offsetY: -118,
        flip: this.facing < 0,
        light: 1.34
      });
    }
  }

  spawnAfterimage(x, y, facing, row = 2, col = 4, maxLife = 0.22) {
    if (this.afterimages.length >= 12) this.afterimages.shift();
    this.afterimages.push({
      x,
      y,
      facing,
      frameIdx: row * 30 + (col % 30),
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

  spawnRazorScar(cx, cy, dx, dy, maxLife = 0.22, isRose = false) {
    if (this.razorScars.length >= 18) this.razorScars.shift();
    this.razorScars.push({
      x0: Math.round(cx - dx * 0.5),
      y0: Math.round(cy - dy * 0.5),
      x1: Math.round(cx + dx * 0.5),
      y1: Math.round(cy + dy * 0.5),
      age: 0,
      maxLife,
      isRose
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

  _applyCathedralLanceStrike(primaryEnemy, game, cfg) {
    const {
      damage = 22,
      reachFront = 216,
      reachBack = 38,
      hitStop = 0.042,
      shakeDur = 0.054,
      knockX = 24,
      knockY = 0,
      isCrit = false,
      scarDx = 104,
      scarDy = 78,
      isRose = false,
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
      this.spawnRazorScar(hitX, hitY, this.facing * scarDx, scarDy, 0.22, isRose);
      this.spawnVfxAnim(4, hitX, hitY, 184, 184, 0.24, {
        flipX: this.facing < 0,
        inFront: true
      });
      this.fx?.burst(hitX, hitY, {
        count: isCrit ? 10 : 7,
        speedMin: 48,
        speedMax: 168,
        lifeMin: 0.12,
        lifeMax: 0.26,
        gravity: 38,
        colors: ['#ffffff', '#fef08a', '#fde047', '#f472b6', '#38bdf8']
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
    if (!this.fx || !p || p.type !== 'holy_light') return;
    p.ringTimer = (p.ringTimer || 0) + 0.016;
    if (p.ringTimer >= 0.05) {
      p.ringTimer = 0;
      this.fx.burst(p.x - Math.sign(p.vx || 1) * 16, p.y, {
        count: 3,
        speedMin: 22,
        speedMax: 68,
        lifeMin: 0.16,
        lifeMax: 0.28,
        gravity: -18,
        spread: 1.15,
        angle: Math.atan2(-(p.vy || 0), -(p.vx || 1)),
        colors: ['#ffffff', '#fef08a', '#facc15', '#f472b6', '#38bdf8']
      });
    }
  }

  onProjectileHit(p, _hitTarget, isCrit, game) {
    if (!this.fx) return false;
    this.fx.spawn('holyStarImpactBurst', p.x, p.y, {
      flip: false,
      light: isCrit ? 1.34 : 1.18,
      extra: { isCrit }
    });
    this.fx.burst(p.x, p.y, {
      count: isCrit ? 18 : 12,
      speedMin: 58,
      speedMax: isCrit ? 220 : 172,
      lifeMin: 0.2,
      lifeMax: 0.4,
      gravity: 78,
      colors: ['#ffffff', '#fef08a', '#facc15', '#f472b6', '#38bdf8']
    });
    if (game?.vfx) {
      game.vfx.spawnGlyphBurst(p.x, p.y, 5, 'radiant');
    }
    return true;
  }

  /**
   * Grounded Radiant Flash-Step Dash & Winged Seraphic Vault (`JUMP` / `DODGE`).
   */
  onStartDash(enemy, game, dir) {
    this.dashDuration = 0.36;
    this.dashDir = dir || this.facing;
    this.isAngelicAscent = false;
    this.isFlipVault = false;
    if (game?.audio) game.audio.play('dash_whoosh', this.x);
    this.ensureSlipstream();
    game?.vfx?.spawnShockwave(this.x, this.groundY - 4, 62, '#fde047', 0.22, false, true);
    if (enemy && !enemy.isDead) {
      this._dashStopX = this._clampArenaX(enemy.x - this.dashDir * 114, game);
    } else {
      this._dashStopX = null;
    }
  }

  updateDash(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.dashDuration || 0.36;
    const dir = this.dashDir || this.facing;
    this.vy = 0;
    this.y = this.groundY;
    this.isAngelicAscent = false;

    if (t < dur * 0.78) {
      const distToEnemy = enemy && !enemy.isDead ? (enemy.x - this.x) * dir : 999;
      if (distToEnemy <= 116 && distToEnemy >= 72) {
        this.vx = 0;
      } else {
        this.vx = dir * 610;
      }
      this._dragSparkAcc += dt;
      if (this._dragSparkAcc >= 0.038) {
        this._dragSparkAcc = 0;
        this.spawnAfterimage(this.x, this.groundY, this.facing, 6, Math.min(24, Math.floor((t / dur) * 30)), 0.18);
      }
    } else {
      this.vx = 0;
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
    this.isAngelicAscent = true;
    this.wallWingCooldown = 3.2;

    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    let dir = customDir !== null ? customDir : -this.facing;
    if (this.x < 180) dir = 1;
    else if (this.x > ww - 180) dir = -1;

    this.ascentStartX = this.x;
    this.wingSpearCount = 0;
    this.dashDuration = 0.60;

    let target = this.x + dir * 320;
    if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 235) {
      const openDir = enemy.x < ww * 0.5 ? 1 : -1;
      target = enemy.x + openDir * 330;
    }
    this.ascentTargetX = this._clampArenaX(target, game);
    this.dashDir = Math.sign(this.ascentTargetX - this.ascentStartX) || dir;

    this.vx = 0;
    this.vy = 0;
    if (game?.audio) game.audio.play('holy_heal', this.x);
    this.heal(8, 'WINGS OF GRACE');
    this.ensureSlipstream();
    this.ensureSanctuarySeal(false);
    this.fx?.spawn('graceHealBloom', this.x, this.groundY, {
      follow: this,
      offsetX: 0,
      offsetY: 0,
      useGroundY: true,
      light: 1.2
    });
    game?.vfx?.spawnGlyphBurst(this.x, this.y - 100, 8, 'radiant');
    game?.vfx?.spawnDamageText(this.x, this.y - 142, 0, false, 'SERAPHIC WING VAULT!', '#fef08a');
  }

  onStartDodge(enemy, game, dir) {
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const retreatDir = dir || -this.facing;
    this.isBlinkTeleport = false;
    this.isAngelicAscent = true;
    this.isFlipVault = true;
    this.isInvulnerable = true;
    this.wallWingCooldown = 3.2;
    this.ascentStartX = this.x;
    this.wingSpearCount = 0;
    this.dashDuration = 0.58;

    let target = this.x + retreatDir * 310;
    if (target < 140 || target > ww - 140) {
      target = this.x - retreatDir * 310;
    }
    this.ascentTargetX = this._clampArenaX(target, game);
    this.dashDir = Math.sign(this.ascentTargetX - this.ascentStartX) || retreatDir;
    this.vx = 0;
    this.vy = 0;
    if (game?.audio) game.audio.play('holy_heal', this.x);
    this.ensureSlipstream();
    this.ensureSanctuarySeal(false);
    game?.vfx?.spawnGlyphBurst(this.x, this.y - 96, 6, 'radiant');
  }

  updateJump(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.dashDuration || 0.60;
    const u = Math.min(1, Math.max(0, t / dur));

    this.isAngelicAscent = true;
    this.x = this.ascentStartX + (this.ascentTargetX - this.ascentStartX) * (1 - Math.pow(1 - u, 1.85));
    this.y = this.groundY - Math.sin(u * Math.PI) * 118;
    this.isInvulnerable = u < 0.68;

    if (this.wingSpearCount === 0 && u >= 0.48) {
      this.wingSpearCount = 1;
      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }
      const sx = this.x + this.facing * 52;
      const sy = this.y - 84;
      if (game?.audio) game.audio.play('holy_bolt', sx);
      const aimFoe = this._resolveRangedTarget(enemy, game);
      const tx = aimFoe ? aimFoe.x : sx + this.facing * 380;
      const ty = aimFoe ? aimFoe.y - 94 : this.groundY - 84;
      const dx = tx - sx;
      const dy = ty - sy;
      const len = Math.hypot(dx, dy) || 1;
      this.fx?.spawn('scepterStarburstCone', sx, sy, {
        flip: this.facing < 0,
        light: 1.24,
        extra: { aimAngle: Math.atan2(dy, Math.abs(dx)) }
      });
      game?.vfx?.spawnProjectile({
        x: sx,
        y: sy,
        vx: (dx / len) * 685,
        vy: (dy / len) * 685,
        radius: 15,
        color: '#fde047',
        coreColor: '#ffffff',
        owner: this,
        damage: 38,
        type: 'holy_light',
        isMeteor: false
      });
    }

    if (u >= 1) {
      this.y = this.groundY;
      this.vx = 0;
      this.vy = 0;
      this.isAngelicAscent = false;
      this.isFlipVault = false;
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  updateDodge(dt, enemy, game) {
    this.updateJump(dt, enemy, game);
  }

  updateDashOrDodge(dt, enemy, game) {
    if (this.state === 'DASH' && !this.isAngelicAscent) {
      this.updateDash(dt, enemy, game);
    } else {
      this.updateJump(dt, enemy, game);
    }
  }

  startCrouch(_enemy, game) {
    this.crouchCooldown = 3.8;
    this.crouchDuration = 0.94;
    this.setState('CROUCH');
    this.isCrouching = true;
    this.isDeflecting = true;
    this.isAngelicAscent = false;
    this.vx = 0;
    this.y = this.groundY;
    this._spawnedBenedictionWard = true;

    this.fx?.spawn('benedictionRoseWard', this.x, this.groundY, {
      follow: this,
      offsetX: 0,
      offsetY: 0,
      useGroundY: true,
      flip: this.facing < 0,
      light: 1.24
    });
    this.fx?.spawn('graceHealBloom', this.x, this.groundY, {
      follow: this,
      offsetX: 0,
      offsetY: 0,
      useGroundY: true,
      light: 1.16
    });
    if (game?.audio) game.audio.play('holy_heal', this.x);
    this.heal(10, 'BENEDICTION');
    game?.vfx?.spawnGlyphBurst(this.x, this.y - 88, 6, 'radiant');
  }

  updateCrouch(_dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.crouchDuration || 0.94;
    this.vx = 0;
    this.y = this.groundY;
    this.isCrouching = t < dur * 0.80;
    this.isDeflecting = t < 0.54;

    if (this.isDeflecting && game?.vfx?.projectiles) {
      for (const proj of game.vfx.projectiles) {
        if (
          proj.owner !== this &&
          !proj._reflectedByPriestessEx &&
          Math.abs(proj.x - this.x) < 94 &&
          Math.abs(proj.y - (this.y - 88)) < 94
        ) {
          proj._reflectedByPriestessEx = true;
          proj.owner = this;
          proj.vx = -proj.vx * 1.25;
          proj.color = '#fde047';
          proj.coreColor = '#ffffff';
          if (game?.audio) game.audio.play('clang', proj.x);
          this.gainMana(14);
          this.gainFinisher(8);
        }
      }
    }

    if (t >= 0.46 && !this.didActionFrame) {
      this.didActionFrame = true;
      this.shotCombo++;
      const spawnX = this.x + this.facing * 64;
      const spawnY = this.y - 94;
      if (game?.audio) game.audio.play('holy_bolt', spawnX);

      this._applyCathedralLanceStrike(enemy, game, {
        damage: 34,
        reachFront: 218,
        hitStop: 0.044,
        shakeDur: 0.056,
        knockX: 84,
        knockY: -50,
        isCrit: true,
        scarDx: 112,
        scarDy: -60,
        isRose: true,
        sfx: 'heavy_cleave'
      });

      const aimFoe = this._resolveRangedTarget(enemy, game);
      const tx = aimFoe ? aimFoe.x : spawnX + this.facing * 460;
      const ty = aimFoe ? aimFoe.y - 96 : spawnY;
      const dx = tx - spawnX;
      const dy = ty - spawnY;
      const dist = Math.hypot(dx, dy) || 1;
      this.fx?.spawn('scepterStarburstCone', spawnX, spawnY, {
        flip: this.facing < 0,
        light: 1.26,
        extra: { aimAngle: Math.atan2(dy, Math.abs(dx)) }
      });
      game?.vfx?.spawnProjectile({
        x: spawnX,
        y: spawnY,
        vx: (dx / dist) * 705,
        vy: (dy / dist) * 705,
        radius: 15,
        color: '#fde047',
        coreColor: '#ffffff',
        owner: this,
        damage: 52,
        type: 'holy_light',
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
   * STRICTLY GROUNDED (`this.y = this.groundY`, `0px` float across `V0..V3`, `isAngelicAscent = false`!)
   * Graceful Flash-Step Sunburst Cathedral Scepter-Lance Martial Sweeps + 4-Band Stained-Glass Light-Crescent Smears:
   * - `V0 (F03)`: Wide sanctum sweep + `'holy_light'` bolt (`42ms` hit-stop)
   * - `V1 (F09)`: Rising benediction arc + twin `'holy_light'` resonance bolts (`44ms` hit-stop)
   * - `V2 (F17)`: 2.5D cathedral rose-halo vortex (`2-hit` + `'holy_spear'` sky-strike)
   * - `V3 (F25)`: Grounded radiant star-pillar (`3-hit` + `+16 HP` Dawn Grace + `'holy_light'` bolt, `55ms` hit-stop)
   */
  updateAutoAttack(dt, enemy, game) {
    this._currentEnemy = enemy;
    this._comboPersistTimer = 0.76;

    // Enforce 100% grounded footwork (`0px` float) on every tick of Row 2 AUTO_ATTACK!
    this.y = this.groundY;
    this.vy = 0;
    this.isAngelicAscent = false;

    if (this._intraLinkTimer > 0) {
      this._intraLinkTimer = Math.max(0, this._intraLinkTimer - dt);
      this.vx = 0;
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

    // 1. Grounded Flash-Step Glide -> Hard-Locked Boots (`vx = 0`) right on the 1-frame smear snap!
    this.vx = 0;
    if (t < snapT) {
      const lungeU = Math.min(1, Math.max(0, t / snapT));
      const eased = 1 - Math.pow(1 - lungeU, 2.2);
      this.x = this._beatStartX + (this._beatTargetX - this._beatStartX) * eased;

      if (!this._drewScepterFocus) {
        this._drewScepterFocus = true;
        this.fx?.spawn('scepterStarFocus', this.x + this.facing * 32, this.groundY - 108, {
          follow: this,
          offsetX: 32,
          offsetY: -108,
          flip: this.facing < 0,
          light: v === 3 ? 1.28 : 1.18
        });
      }

      if (v === 0 && Math.abs(this._beatTargetX - this._beatStartX) > 24) {
        this._dragSparkAcc += dt;
        if (this._dragSparkAcc >= 0.034) {
          this._dragSparkAcc = 0;
          this.spawnAfterimage(this.x, this.groundY, this.facing, 2, localStep, 0.16);
          this.fx?.burst(this.x - this.facing * 30, this.groundY - 2, {
            count: 4,
            speedMin: 30,
            speedMax: 88,
            lifeMin: 0.10,
            lifeMax: 0.22,
            gravity: 65,
            colors: ['#ffffff', '#fef08a', '#fde047', '#f472b6']
          });
        }
      }
    } else if (!this._bootsPlanted) {
      this._bootsPlanted = true;
      this.x = this._beatTargetX;
      this.vx = 0;
    }

    const spawnX = this.x + this.facing * 68;
    const spawnY = this.groundY - 96;
    const aimFoe = this._resolveRangedTarget(enemy, game);
    const targetY = aimFoe ? aimFoe.y - 96 : spawnY;
    const dx = aimFoe ? aimFoe.x - spawnX : this.facing * 460;
    const dy = targetY - spawnY;
    const dist = Math.hypot(dx, dy) || 1;
    const aimAng = Math.atan2(dy, Math.abs(dx));

    // 2. Beat-Specific Stained-Glass Light-Crescent Smear Impacts & Sacred Artillery
    if (v === 0) {
      if ((this._beatHitMask & 1) === 0 && t >= 0.10) {
        this._beatHitMask |= 1;
        this.shotCombo++;
        if (game?.audio) game.audio.play('holy_bolt', spawnX);
        game?.vfx?.spawnShockwave(this.x + this.facing * 44, this.groundY - 4, 58, '#fde047', 0.20, false, true);
        this.spawnVfxAnim(4, spawnX, spawnY, 178, 178, 0.24, {
          flipX: this.facing < 0,
          inFront: true
        });
        this.fx?.spawn('scepterStarburstCone', spawnX, spawnY, {
          flip: this.facing < 0,
          light: 1.22,
          extra: { aimAngle: aimAng }
        });
        this._applyCathedralLanceStrike(enemy, game, {
          damage: 22,
          reachFront: 218,
          hitStop: 0.042,
          shakeDur: 0.054,
          knockX: 22,
          knockY: 0,
          scarDx: 112,
          scarDy: 82,
          isRose: false,
          sfx: 'slash'
        });
        game?.vfx?.spawnProjectile({
          x: spawnX,
          y: spawnY,
          vx: (dx / dist) * 690,
          vy: (dy / dist) * 690,
          radius: 15,
          color: '#fde047',
          coreColor: '#ffffff',
          owner: this,
          damage: 34,
          type: 'holy_light',
          isMeteor: false
        });
      }
    } else if (v === 1) {
      if ((this._beatHitMask & 1) === 0 && t >= 0.06) {
        this._beatHitMask |= 1;
        this.shotCombo++;
        if (game?.audio) game.audio.play('holy_bolt', spawnX);
        game?.vfx?.spawnShockwave(spawnX, this.groundY - 8, 66, '#fef08a', 0.22, false, true);
        this.spawnVfxAnim(4, spawnX, spawnY - 8, 182, 182, 0.24, {
          flipX: this.facing > 0,
          inFront: true
        });
        this.fx?.spawn('scepterStarburstCone', spawnX, spawnY, {
          flip: this.facing < 0,
          light: 1.25,
          extra: { aimAngle: aimAng, isGrace: true }
        });
        this._applyCathedralLanceStrike(enemy, game, {
          damage: 24,
          reachFront: 220,
          hitStop: 0.044,
          shakeDur: 0.056,
          knockX: 18,
          knockY: -118,
          scarDx: 108,
          scarDy: -90,
          isRose: true,
          sfx: 'slash'
        });
        if (game?.vfx) {
          const speed = 675;
          game.vfx.spawnProjectile({
            x: spawnX,
            y: spawnY - 10,
            vx: (dx / dist) * speed,
            vy: (dy / dist) * speed - 22,
            radius: 14,
            color: '#fde047',
            coreColor: '#ffffff',
            owner: this,
            damage: 20,
            type: 'holy_light',
            isMeteor: false
          });
          game.vfx.spawnProjectile({
            x: spawnX - this.facing * 14,
            y: spawnY + 10,
            vx: (dx / dist) * speed,
            vy: (dy / dist) * speed + 22,
            radius: 13,
            color: '#facc15',
            coreColor: '#fef9c3',
            owner: this,
            damage: 18,
            type: 'holy_light',
            isMeteor: false
          });
        }
      }
    } else if (v === 2) {
      // Beat 3 (V2): Grounded 2.5D Cathedral Rose-Halo Vortex (`2-hit` + Holy Spear Sky-Strike)
      if ((this._beatHitMask & 1) === 0 && t >= 0.08) {
        this._beatHitMask |= 1;
        this.spawnVfxAnim(3, this.x + this.facing * 38, this.groundY - 88, 184, 184, 0.28, {
          flipX: this.facing < 0,
          inFront: false
        });
        this._applyCathedralLanceStrike(enemy, game, {
          damage: 17,
          reachFront: 220,
          reachBack: 64,
          hitStop: 0.042,
          shakeDur: 0.048,
          knockX: 14,
          knockY: -18,
          scarDx: 118,
          scarDy: 30,
          isRose: true,
          sfx: 'slash'
        });
      }
      if ((this._beatHitMask & 2) === 0 && t >= 0.14) {
        this._beatHitMask |= 2;
        this.shotCombo++;
        if (game?.audio) game.audio.play('holy_bolt', spawnX);
        this._applyCathedralLanceStrike(enemy, game, {
          damage: 19,
          reachFront: 222,
          reachBack: 64,
          hitStop: 0.044,
          shakeDur: 0.052,
          knockX: 18,
          knockY: -32,
          scarDx: 118,
          scarDy: -34,
          isRose: false,
          sfx: 'clang'
        });
        if (game?.vfx) {
          game.vfx.spawnProjectile({
            x: spawnX,
            y: spawnY,
            vx: (dx / dist) * 670,
            vy: (dy / dist) * 670,
            radius: 14,
            color: '#fde047',
            coreColor: '#ffffff',
            owner: this,
            damage: 22,
            type: 'holy_light',
            isMeteor: false
          });
          const strikeX = aimFoe ? aimFoe.x - this.facing * 16 : this.x + this.facing * 270;
          this.fx?.spawn('holySpearReticle', strikeX, this.groundY, {
            light: 1.24
          });
          game.vfx.spawnSkyStrike({
            x: strikeX,
            y: -150,
            groundY: this.groundY,
            vx: this.facing * 50,
            vy: 1220,
            type: 'holy_spear',
            color: '#fde047',
            coreColor: '#ffffff',
            owner: this,
            target: aimFoe,
            damage: 30,
            isUltimate: false
          });
        }
      }
    } else {
      // Beat 4 (V3): Strictly Grounded Radiant Star-Pillar (`3-hit` + Dawn Grace Heal + `'holy_light'` Bolt, `55ms` Hit-Stop)
      if ((this._beatHitMask & 1) === 0 && t >= 0.16) {
        this._beatHitMask |= 1;
        this.shotCombo++;
        this.y = this.groundY;
        this.vx = 0;
        const pillarX = this.x + this.facing * 86;
        if (game?.audio) {
          game.audio.play('holy_bolt', pillarX);
          game.audio.play('holy_heal', this.x);
        }
        this.heal(16, 'DAWN GRACE');
        this.fx?.spawn('graceHealBloom', this.x, this.groundY, {
          follow: this,
          offsetX: 0,
          offsetY: 0,
          useGroundY: true,
          light: 1.26
        });
        game?.renderer?.triggerShake?.(12, 0.24);
        game?.vfx?.spawnShockwave(pillarX, this.groundY - 4, 96, '#fde047', 0.26, false, true);
        game?.vfx?.spawnFlamePillar(pillarX, this.groundY, this, null, {
          theme: 'radiant',
          delay: 0.02,
          maxLife: 0.82,
          scaleWidth: 0.94
        });
        this.fx?.spawn('cathedralSanctumPillar', pillarX, this.groundY, {
          light: 1.34,
          extra: { scaleWidth: 0.94 }
        });
        this.spawnVfxAnim(2, pillarX, this.groundY - 86, 198, 198, 0.34, {
          flipX: this.facing < 0,
          inFront: true
        });
        this._applyCathedralLanceStrike(enemy, game, {
          damage: 20,
          reachFront: 226,
          hitStop: 0.055,
          shakeDur: 0.078,
          knockX: 32,
          knockY: -42,
          isCrit: true,
          scarDx: 26,
          scarDy: 138,
          isRose: true,
          sfx: 'heavy_cleave'
        });
        if (game?.vfx) {
          game.vfx.spawnProjectile({
            x: pillarX,
            y: this.groundY - 88,
            vx: (dx / dist) * 680,
            vy: (dy / dist) * 680,
            radius: 16,
            color: '#fde047',
            coreColor: '#ffffff',
            owner: this,
            damage: 36,
            type: 'holy_light',
            isMeteor: false
          });
          game.vfx.spawnGlyphBurst(pillarX, this.groundY - 82, 6, 'radiant');
        }
      }
      if ((this._beatHitMask & 2) === 0 && t >= 0.21) {
        this._beatHitMask |= 2;
        this._applyCathedralLanceStrike(enemy, game, {
          damage: 14,
          reachFront: 228,
          hitStop: 0,
          shakeDur: 0.045,
          knockX: 24,
          knockY: -30,
          scarDx: 94,
          scarDy: 78,
          isRose: false,
          sfx: 'clang'
        });
      }
      if ((this._beatHitMask & 4) === 0 && t >= 0.26) {
        this._beatHitMask |= 4;
        this._applyCathedralLanceStrike(enemy, game, {
          damage: 18,
          reachFront: 230,
          hitStop: 0,
          shakeDur: 0.052,
          knockX: 84,
          knockY: -78,
          isCrit: true,
          scarDx: 98,
          scarDy: -82,
          isRose: true,
          sfx: 'slash'
        });
      }
    }

    // 3. Direct Zero-Idle Beat Chaining (`0.015s` link, strictly grounded `y = groundY`)
    if (t >= dur) {
      this.y = this.groundY;
      this.vy = 0;
      this.vx = 0;
      this.isAngelicAscent = false;

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
   * SPECIAL SKILL (`DIVINE SANCTUARY`, Row 3 `90..119`):
   * Sanctuary Cathedral Seal + `+40 HP` Heal + Converging Sanctum Spires & Holy Spears!
   */
  updateSkill(_dt, enemy, game) {
    const t = this.stateTimer;
    this.y = this.groundY;
    this.vy = 0;
    this.isAngelicAscent = false;
    this.ensureSanctuarySeal(false);

    if (t < 0.18) {
      this.didSanctuaryHeal = false;
    } else if (t >= 0.20 && !this.didSanctuaryHeal) {
      this.didSanctuaryHeal = true;
      if (game?.audio) game.audio.play('holy_heal', this.x);
      this.heal(40, 'SANCTUARY');
      this.fx?.spawn('graceHealBloom', this.x, this.groundY, {
        follow: this,
        offsetX: 0,
        offsetY: 0,
        useGroundY: true,
        light: 1.32
      });
      game?.vfx?.spawnGlyphBurst(this.x, this.y - 110, 10, 'heal');

      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 215) {
        const pushDir = Math.sign(enemy.x - this.x) || this.facing;
        enemy.vx += pushDir * 175;
      }
    }

    if (t >= 0.46 && !this.didActionFrame) {
      this.didActionFrame = true;
      this.vx = 0;
      const ww = game?.renderer ? game.renderer.worldWidth : 1200;
      const targetX = enemy
        ? Math.max(90, Math.min(ww - 90, enemy.x))
        : Math.max(90, Math.min(ww - 90, this.x + this.facing * 320));
      if (game?.audio) game.audio.play('holy_bolt', targetX);

      const sx = this.x + this.facing * 56;
      const sy = this.y - 114;
      const dx = targetX - sx;
      const dy = (enemy ? enemy.y - 104 : this.groundY - 104) - sy;
      const dist = Math.hypot(dx, dy) || 1;

      this.fx?.spawn('scepterStarburstCone', sx, sy, {
        flip: this.facing < 0,
        light: 1.32,
        extra: { aimAngle: Math.atan2(dy, Math.abs(dx)), isGrace: true }
      });

      game?.vfx?.spawnBeam({
        x1: targetX - 135,
        y1: -120,
        x2: targetX + 25,
        y2: this.groundY - 8,
        width: 38,
        color: '#fde047',
        coreColor: '#ffffff',
        maxLife: 0.44
      });
      game?.vfx?.spawnBeam({
        x1: targetX + 135,
        y1: -120,
        x2: targetX - 25,
        y2: this.groundY - 8,
        width: 38,
        color: '#facc15',
        coreColor: '#ffffff',
        maxLife: 0.44
      });

      game?.vfx?.spawnFlamePillar(targetX, this.groundY, this, null, {
        theme: 'radiant',
        delay: 0.02,
        maxLife: 0.76,
        scaleWidth: 0.94
      });
      this.fx?.spawn('cathedralSanctumPillar', targetX, this.groundY, {
        light: 1.36,
        extra: { scaleWidth: 1.0 }
      });

      if (enemy && !enemy.isDead) {
        const horizDist = Math.abs(enemy.x - this.x);
        const beamDmg = horizDist >= 260 ? 84 : 74;
        enemy.takeDamage(beamDmg, this, false, 60, -45);
      }

      for (const side of [-1, 1]) {
        const spX = Math.max(80, Math.min(ww - 80, targetX + side * 44));
        this.fx?.spawn('holySpearReticle', spX, this.groundY, {
          light: 1.24
        });
        game?.vfx?.spawnSkyStrike({
          x: spX,
          y: -160,
          groundY: this.groundY,
          vx: -side * 90,
          vy: 1220,
          type: 'holy_spear',
          color: '#fde047',
          coreColor: '#ffffff',
          owner: this,
          target: enemy,
          damage: 26,
          delay: side < 0 ? 0 : 0.06,
          isUltimate: false
        });
      }

      game?.vfx?.spawnProjectile({
        x: sx,
        y: sy,
        vx: (dx / dist) * 655,
        vy: (dy / dist) * 655,
        radius: 16,
        color: '#fde047',
        coreColor: '#ffffff',
        owner: this,
        damage: 50,
        type: 'holy_light',
        isMeteor: false
      });

      game?.vfx?.spawnGlyphBurst(targetX, this.groundY - 95, 11, 'radiant');
    } else if (t >= this.skillDuration) {
      this.y = this.groundY;
      this.vx = 0;
      this.setState('IDLE');
    }
  }

  /**
   * OVERDRIVE (`SERAPHIC CATHEDRAL`, Row 4 `120..149`):
   * Winged Seraphic Ascent (`seraphim_wings.png` + Stained-Glass Rose Mandala) + Miracle Heal + Cross-Cathedral Beams!
   */
  updateUltimate(_dt, enemy, game) {
    const t = this.stateTimer;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const targetX = enemy ? enemy.x : ww * 0.5;
    this.isFlipVault = false;
    this.isBlinkTeleport = false;
    this.isAngelicAscent = false;
    this.isInvulnerable = true;
    this.vx = 0;
    this.vy = 0;

    this.ensureSlipstream();
    this.ensureSanctuarySeal(true);
    this.ensureOphanimWheel();

    let lift = 0;
    if (t < 0.38) {
      lift = Math.sin((t / 0.38) * (Math.PI * 0.5)) * 122;
    } else if (t < 1.18) {
      lift = 122 + Math.sin((t - 0.38) * 8.0) * 7;
    } else {
      lift = Math.max(0, Math.cos(((t - 1.18) / 0.38) * (Math.PI * 0.5)) * 122);
    }
    this.y = this.groundY - lift;

    if (t >= 0.16 && !this.didUltMiracle) {
      this.didUltMiracle = true;
      if (game?.audio) game.audio.play('holy_heal', this.x);
      this.heal(48, 'MIRACLE');
      this.fx?.spawn('graceHealBloom', this.x, this.groundY, {
        follow: this,
        offsetX: 0,
        offsetY: 0,
        useGroundY: true,
        light: 1.36
      });
      game?.vfx?.spawnGlyphBurst(this.x, this.y - 115, 14, 'heal');
    }

    const volleyTimes = [0.44, 0.56, 0.68, 0.80];
    if (
      this.ultChakramStep < volleyTimes.length &&
      t >= volleyTimes[this.ultChakramStep] &&
      enemy &&
      !enemy.isDead
    ) {
      const step = this.ultChakramStep;
      this.ultChakramStep++;
      if (game?.audio) game.audio.play('holy_bolt', this.x);

      const haloX = this.x + Math.cos(step * 1.57) * 72;
      const haloY = this.y - 122 + Math.sin(step * 1.57) * 42;
      const aimX = Math.max(75, Math.min(ww - 75, enemy.x + (step - 1.5) * 44));
      const aimY = this.groundY - 12;

      game?.vfx?.spawnBeam({
        x1: haloX,
        y1: haloY,
        x2: aimX,
        y2: aimY,
        width: 30,
        color: '#fde047',
        coreColor: '#ffffff',
        maxLife: 0.42
      });

      this.fx?.spawn('holySpearReticle', aimX, this.groundY, {
        light: 1.28
      });

      game?.vfx?.spawnSkyStrike({
        x: aimX,
        y: -160,
        groundY: this.groundY,
        vx: 0,
        vy: 1260,
        type: 'holy_spear',
        color: '#fde047',
        coreColor: '#ffffff',
        owner: this,
        target: enemy,
        damage: 18,
        isUltimate: true
      });

      game?.vfx?.spawnGlyphBurst(aimX, this.groundY - 45, 5, 'radiant');
      enemy.takeDamage(28, this, false, 28, 0);
    }

    if (t >= 0.94 && !this.didActionFrame) {
      this.didActionFrame = true;
      if (game?.audio) game.audio.play('priestess_ult', targetX);

      game?.renderer?.triggerShake?.(24, 0.58);
      game?.renderer?.triggerAberration?.(14);
      game?.renderer?.triggerHitStop?.(0.085);

      game?.vfx?.spawnBeam({
        x1: targetX - 240,
        y1: -140,
        x2: targetX + 65,
        y2: this.groundY - 8,
        width: 74,
        color: '#fde047',
        coreColor: '#ffffff',
        maxLife: 0.78
      });
      game?.vfx?.spawnBeam({
        x1: targetX + 240,
        y1: -140,
        x2: targetX - 65,
        y2: this.groundY - 8,
        width: 74,
        color: '#facc15',
        coreColor: '#ffffff',
        maxLife: 0.78
      });
      game?.vfx?.spawnBeam({
        x1: this.x + this.facing * 52,
        y1: this.y - 118,
        x2: targetX,
        y2: this.groundY - 95,
        width: 48,
        color: '#fef08a',
        coreColor: '#ffffff',
        maxLife: 0.68
      });

      const pillarOffsets = [0, -135, 135];
      pillarOffsets.forEach((off, idx) => {
        const px = Math.max(75, Math.min(ww - 75, targetX + off));
        game?.vfx?.spawnFlamePillar(px, this.groundY, this, null, {
          theme: 'radiant',
          delay: idx === 0 ? 0.01 : 0.06,
          maxLife: idx === 0 ? 0.86 : 0.72,
          scaleWidth: idx === 0 ? 1.18 : 0.86,
          isUltimate: idx === 0
        });
        this.fx?.spawn('cathedralSanctumPillar', px, this.groundY, {
          light: idx === 0 ? 1.42 : 1.28,
          extra: { scaleWidth: idx === 0 ? 1.18 : 0.86 }
        });
      });

      this.fx?.spawn('holyStarImpactBurst', targetX, this.groundY - 92, {
        light: 1.4,
        extra: { isCrit: true }
      });

      game?.vfx?.spawnGlyphBurst(targetX, this.groundY - 90, 14, 'radiant');
      game?.vfx?.spawnGlyphBurst(targetX, this.groundY - 90, 8, 'heal');

      if (enemy && !enemy.isDead) {
        enemy.takeDamage(168, this, true, 150, -210);
      }
    } else if (t >= this.ultDuration) {
      this.y = this.groundY;
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  /**
   * SUPREME FINISHER (`FINAL GRACE`, `4.25s`):
   * - Phase 1 (`0.00..3.03s`): Invulnerable Winged Flight + `+30%` Max HP Heal + Whole-Screen Celestial Bloom Charge
   * - Phase 2 (`t >= 3.03s..3.92s`): Welded `208x208` Horizontal Purifying Beam (`>= 740` stored counter damage!)
   * - Phase 3 (`3.92..4.25s`): Graceful Seraphic Descent (NEVER replaces arena background!)
   */
  updateTrueUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    this.isInvulnerable = true;
    this.unstoppablePoise = true;
    this.hurtTimer = 0;
    this.isFlipVault = false;
    this.isBlinkTeleport = false;
    this.isAngelicAscent = false;
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
    if (focusEnemy && !focusEnemy.isDead && t < 2.88) {
      this.facing = focusEnemy.x >= this.x ? 1 : -1;
    }

    this.ensureSlipstream();
    this.ensureSanctuarySeal(true);
    this.ensureOphanimWheel();

    if (!this._finalGracePlayedChargeSfx) {
      this._finalGracePlayedChargeSfx = true;
      if (game?.audio) game.audio.play('final_grace_charge', this.x);
    }

    if (t < 3.03) {
      // Phase 1 (0.00..3.03s): Winged Hover + +30% Max HP Heal + Expanding Celestial Bloom Charge
      const ascU = Math.min(1, t / 0.55);
      const ascEase = 1 - Math.pow(1 - ascU, 2.4);
      const hoverBob = t >= 0.55 ? Math.sin(t * 4.2) * 4 : 0;
      const lift = 66 * ascEase + hoverBob;
      this.y = this.groundY - lift;

      let fIdx = 120;
      if (t < 0.45) {
        fIdx = 120 + Math.min(4, Math.floor((t / 0.45) * 5));
      } else if (t < 2.48) {
        fIdx = 125 + (Math.floor((t - 0.45) * 10) % 5);
      } else {
        fIdx = 130 + Math.min(3, Math.floor(((t - 2.48) / 0.55) * 4));
      }
      this.trueUltFrameOverride = fIdx;
      this._overrideFrameIdx = fIdx;

      if (t >= 0.55 && !this.finalGraceDidHeal) {
        this.finalGraceDidHeal = true;
        const healAmt = Math.round(this.maxHp * 0.30);
        if (game?.audio) game.audio.play('holy_heal', this.x);
        this.heal(healAmt, 'FINAL GRACE');
        this.fx?.spawn('graceHealBloom', this.x, this.groundY, {
          follow: this,
          offsetX: 0,
          offsetY: 0,
          useGroundY: true,
          light: 1.45
        });
        this.fx?.burst(this.x, this.y - 98, {
          count: 24,
          speedMin: 48,
          speedMax: 185,
          lifeMin: 0.28,
          lifeMax: 0.56,
          gravity: -42,
          colors: ['#ffffff', '#fef08a', '#fde047', '#34d399', '#6ee7b7']
        });
        game?.vfx?.spawnGlyphBurst(this.x, this.y - 104, 14, 'heal');
      }

      const muzzleX = this.x + this.facing * 56;
      const beamY = this.y - 104;
      this.finalGraceMuzzleX = muzzleX;
      this.finalGraceBeamY = beamY;
      this.finalGraceChargeProgress = Math.min(1, t / 3.03);

      this._finalGracePulseAccum += dt;
      if (this._finalGracePulseAccum >= 0.24) {
        this._finalGracePulseAccum = 0;
        this.fx?.spawn('seraphicFinalGraceCharge', this.x, this.y - 98, {
          follow: this,
          offsetX: 0,
          offsetY: -98,
          flip: this.facing < 0,
          light: 1.25 + 0.35 * this.finalGraceChargeProgress,
          extra: { chargeU: this.finalGraceChargeProgress }
        });
      }

      this._finalGraceMoteAccum += dt;
      if (this._finalGraceMoteAccum >= 0.09) {
        this._finalGraceMoteAccum = 0;
        this.fx?.burst(muzzleX, beamY, {
          count: 3 + Math.floor(this.finalGraceChargeProgress * 4),
          speedMin: 26,
          speedMax: 92 + this.finalGraceChargeProgress * 65,
          lifeMin: 0.2,
          lifeMax: 0.38,
          gravity: -36,
          colors: ['#ffffff', '#fef08a', '#fde047', '#f472b6', '#38bdf8']
        });
      }
      return;
    }

    // Phase 2 (t >= 3.03s): Single Instant Purifying Horizontal Beam (`>= 740` damage!)
    if (!this.finalGraceDidFire) {
      this.finalGraceDidFire = true;
      this.finalGraceBeamActive = true;
      this.finalGraceBeamTimer = 0;
      this.finalGraceChargeProgress = 1;
      this.y = this.groundY - 66;
      const muzzleX = this.x + this.facing * 56;
      const beamY = this.y - 104;
      this.finalGraceMuzzleX = muzzleX;
      this.finalGraceBeamY = beamY;

      const rawTanked = Math.round(this.tankedDamage || 0);
      const counterDmg = Math.min(1260, Math.max(740, rawTanked));
      this.tankedDamage = 0;

      if (game?.audio) game.audio.play('final_grace_beam', this.x);
      game?.renderer?.triggerImpactFrame?.(this.x + this.facing * 260, beamY, 0.16, 'radiant');
      game?.renderer?.triggerShake?.(24, 0.52);
      game?.renderer?.triggerAberration?.(9);
      game?.renderer?.triggerHitStop?.(0.10);

      let hitAny = false;
      for (const foe of foes) {
        if (!foe || foe.isDead || foe.isBenched) continue;
        const inFront = (foe.x - this.x) * this.facing >= -48;
        const inBeamBand = Math.abs(foe.y - 95 - beamY) <= 168;
        if (inFront && inBeamBand) {
          hitAny = true;
          foe.takeDamage(counterDmg, this, true, 255, -185);
          this.fx?.spawn('sanctuaryNovaBurst', foe.x, beamY, {
            flip: this.facing < 0,
            light: 1.48
          });
          this.fx?.burst(foe.x, beamY, {
            count: 26,
            speedMin: 80,
            speedMax: 285,
            lifeMin: 0.24,
            lifeMax: 0.52,
            gravity: 40,
            colors: ['#ffffff', '#fef08a', '#fde047', '#f472b6', '#38bdf8']
          });
          if (game?.vfx) {
            game.vfx.spawnGlyphBurst(foe.x, beamY, 14, 'radiant');
            game.vfx.spawnDamageText(
              foe.x,
              foe.y - 156,
              0,
              true,
              `FINAL GRACE: ${counterDmg}!`,
              '#fde047'
            );
          }
        }
      }

      if (!hitAny && game?.vfx) {
        const missX = this.x + this.facing * 240;
        this.fx?.spawn('sanctuaryNovaBurst', missX, beamY, {
          flip: this.facing < 0,
          light: 1.36
        });
        game.vfx.spawnDamageText(
          missX,
          beamY - 48,
          0,
          true,
          `FINAL GRACE: ${counterDmg}!`,
          '#fde047'
        );
      }
    }

    if (t < 3.92) {
      this.y = this.groundY - 66;
      this.finalGraceMuzzleX = this.x + this.facing * 56;
      this.finalGraceBeamY = this.y - 104;
      this.finalGraceBeamTimer = t - 3.03;
      const fIdx = 134 + (Math.floor((t - 3.03) * 24) % 6);
      this.trueUltFrameOverride = fIdx;
      this._overrideFrameIdx = fIdx;
    } else if (t < this.trueUltDuration) {
      this.finalGraceBeamActive = false;
      const descU = Math.min(1, Math.max(0, (t - 3.92) / 0.33));
      const smoothDesc = descU * descU * (3 - 2 * descU);
      this.y = this.groundY - 66 * (1 - smoothDesc);
      const fIdx = 144 + Math.min(5, Math.floor(descU * 6));
      this.trueUltFrameOverride = fIdx;
      this._overrideFrameIdx = fIdx;
    } else {
      this.y = this.groundY;
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      this.finalGraceBeamActive = false;
      this.isInvulnerable = false;
      this.unstoppablePoise = false;
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

    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      this.afterimages[i].life += dt;
      if (this.afterimages[i].life >= this.afterimages[i].maxLife) {
        this.afterimages.splice(i, 1);
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
    this.haloPhase += dt * 2.8;
    this.wallWingCooldown = Math.max(0, this.wallWingCooldown - dt);
    this.crouchCooldown = Math.max(0, this.crouchCooldown - dt);
    this.updateCustomVfx(dt);

    if (this.fx) {
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
          speedMax: 68,
          lifeMin: 0.12,
          lifeMax: 0.24,
          gravity: 28,
          colors: ['#ffffff', '#fef08a', '#fde047', '#f472b6']
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

    // Guarantee Row 2 AUTO_ATTACK stays 100% grounded at groundY (`0px` float) even post-super.update!
    if (this.state === 'AUTO_ATTACK') {
      this.y = this.groundY;
      this.vy = 0;
      this.isAngelicAscent = false;
    }
  }

  getExSprites() {
    if (typeof Image === 'undefined') return null;
    const assets = PixelForge.initAssets();
    if (!assets) return null;
    if (!assets.priestess_ex) {
      const mkImg = (src) => {
        const img = new Image();
        img.src = src;
        return img;
      };
      assets.priestess_ex = {
        sheet: mkImg('assets/sprites/priestess_ex_sheet.png?v=30fps114'),
        vfx: mkImg('assets/sprites/priestess_ex_vfx.png?v=30fps114'),
        wings: assets.priestess?.wings || mkImg('assets/sprites/seraphim_wings.png?v=30fps114'),
        portrait: mkImg('assets/sprites/priestess_ex_portrait.png?v=30fps114'),
        cellW: 320,
        cellH: 240,
        anchorX: 112,
        anchorY: 230
      };
    } else if (!assets.priestess_ex.wings && assets.priestess?.wings) {
      assets.priestess_ex.wings = assets.priestess.wings;
    }
    return assets.priestess_ex;
  }

  drawPixelOctagonRing(ctx, cx, cy, rx, ry, stepPx, color, alpha) {
    if (rx < 8 || ry < 8 || alpha <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.fillStyle = color;
    const s = Math.max(2, stepPx | 0);
    const k = 0.7071;
    const pts = [
      [rx, 0],
      [rx * k, ry * k],
      [0, ry],
      [-rx * k, ry * k],
      [-rx, 0],
      [-rx * k, -ry * k],
      [0, -ry],
      [rx * k, -ry * k]
    ];
    for (let i = 0; i < 8; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[(i + 1) % 8];
      const steps = Math.max(3, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (s * 1.5)));
      for (let j = 0; j < steps; j++) {
        const u = j / steps;
        const px = Math.round((cx + x0 + (x1 - x0) * u) / s) * s;
        const py = Math.round((cy + y0 + (y1 - y0) * u) / s) * s;
        ctx.fillRect(px, py, s, s);
      }
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

        ctx.fillStyle = s.isRose ? '#db2777' : '#d97706';
        ctx.fillRect(px - rad, py - rad, rad * 2, rad * 2);
        const mid = Math.max(2, rad - 2);
        ctx.fillStyle = s.isRose ? '#f9a8d4' : '#fde047';
        ctx.fillRect(px - mid, py - mid, mid * 2, mid * 2);
        if (taper > 0.35) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(px - 2, py - 2, 4, 4);
        }
      }
    }
    ctx.restore();
  }

  drawSeraphimVFX(ctx, sprites, isReflection, renderer = null) {
    if (isReflection || this.state === 'AUTO_ATTACK') return;
    const isDeathFade = this.isDead && (this.deathTimer || 0) < 0.46;
    const showWings =
      isDeathFade ||
      (!this.isDead &&
        (this.isAngelicAscent ||
          this.state === 'ULTIMATE' ||
          this.state === 'TRUE_ULTIMATE'));
    if (!showWings) return;

    let env = 1.0;
    if (isDeathFade) {
      env = Math.max(0, 1 - (this.deathTimer || 0) / 0.46) * 0.82;
    } else if (this.state === 'TRUE_ULTIMATE') {
      const t = this.stateTimer || 0;
      const dur = this.trueUltDuration || 4.25;
      const fadeIn = Math.min(1, t / 0.30);
      const fadeOut = t > dur - 0.28 ? Math.max(0, (dur - t) / 0.28) : 1.0;
      env = fadeIn * fadeOut;
    } else if (this.state === 'ULTIMATE') {
      const dur = this.ultDuration || 1.56;
      const u = Math.min(1, this.stateTimer / dur);
      env = Math.min(1, Math.sin(u * Math.PI) * 1.85);
    } else if (this.isAngelicAscent) {
      const dur = this.dashDuration || 0.60;
      const u = Math.min(1, this.stateTimer / dur);
      env = Math.min(1, Math.sin(u * Math.PI) * 1.65);
    }
    if (env <= 0.02) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const isFullArchangel =
      this.isAngelicAscent || this.state === 'ULTIMATE' || this.state === 'TRUE_ULTIMATE';
    const cx = -6;
    const cy = -124;
    const vfxSheet = PixelForge.ensureImage(sprites?.vfx);

    if (renderer?.glowGold) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const bigR =
        (this.state === 'TRUE_ULTIMATE' ? 310 : isFullArchangel ? 255 : 205) *
        (0.85 + 0.15 * env);
      ctx.globalAlpha = (this.state === 'TRUE_ULTIMATE' ? 0.44 : isFullArchangel ? 0.36 : 0.28) * env;
      ctx.drawImage(renderer.glowGold, cx - bigR, cy - bigR, bigR * 2, bigR * 2);
      if (renderer.glowEmerald) {
        const graceR = (isFullArchangel ? 195 : 145) * (0.85 + 0.15 * env);
        ctx.globalAlpha = 0.22 * env;
        ctx.drawImage(renderer.glowEmerald, cx - graceR, cy - graceR, graceR * 2, graceR * 2);
      }
      ctx.restore();
    }

    const col = Math.floor(this.stateTimer * 30) % 30;

    if (
      (this.state === 'ULTIMATE' || this.state === 'TRUE_ULTIMATE') &&
      vfxSheet &&
      vfxSheet.complete &&
      vfxSheet.naturalWidth > 0
    ) {
      const baseHalo = this.state === 'TRUE_ULTIMATE' ? 276 : 256;
      const haloSize = Math.round(baseHalo * (0.86 + 0.14 * env));
      const gateBob = Math.round(Math.sin(this.haloPhase * 2.4) * 4);
      ctx.save();
      ctx.translate(cx, cy + gateBob);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, env * 0.32);
      ctx.drawImage(
        vfxSheet,
        col * 208,
        624,
        208,
        208,
        -haloSize * 0.54,
        -haloSize * 0.54,
        haloSize * 1.08,
        haloSize * 1.08
      );
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = Math.min(1, env * 0.94);
      ctx.drawImage(vfxSheet, col * 208, 624, 208, 208, -haloSize * 0.5, -haloSize * 0.5, haloSize, haloSize);
      ctx.restore();
    }

    const wingSheet = PixelForge.ensureImage(sprites?.wings);
    if (wingSheet && wingSheet.complete && wingSheet.naturalWidth > 0) {
      const cellW = 320;
      const cellH = 232;
      const wingFrame = Math.floor(this.stateTimer * 30) % 30;
      let recoilX = 0;
      let recoilY = 0;
      if (!this.isDead && this.hurtTimer > 0) {
        recoilX = -6 + Math.round((Math.sin(this.hurtTimer * 60) * 4) / 2) * 2;
        recoilY = -2;
      }
      const scaleW = (this.state === 'TRUE_ULTIMATE' ? 0.92 : 0.86) + 0.14 * env;
      const scaleH = (this.state === 'TRUE_ULTIMATE' ? 0.94 : 0.90) + 0.10 * env;
      const drawW = Math.round(cellW * scaleW);
      const drawH = Math.round(cellH * scaleH);
      const shoulderX = -6 + recoilX;
      const shoulderY = -124 + recoilY;
      const dx = Math.round(shoulderX - drawW * 0.5);
      const dy = Math.round(shoulderY - drawH * (88 / 232));

      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.20 * env;
      ctx.drawImage(wingSheet, wingFrame * cellW, 0, cellW, cellH, dx - 2, dy - 2, drawW + 4, drawH + 4);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = Math.min(1, 0.98 * env);
      ctx.drawImage(wingSheet, wingFrame * cellW, 0, cellW, cellH, dx, dy, drawW, drawH);
    }

    ctx.restore();
  }

  drawPriestessExVfxAnims(ctx, inFront = true, renderer = null) {
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
      if (renderer?.glowGold) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(1, fade * 0.34);
        ctx.drawImage(renderer.glowGold, -halfW, -halfH, v.w, v.h);
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = Math.min(1, 0.32 + fade * 0.68);
      ctx.drawImage(vfxSheet, col * 208, v.row * 208, 208, 208, -halfW, -halfH, v.w, v.h);
      ctx.restore();
    }
    ctx.restore();
  }

  drawForegroundOverlay(ctx, renderer = null) {
    const ww = renderer?.worldWidth || 1280;
    const arenaCenterX = ww * 0.5;

    if (this.state === 'TRUE_ULTIMATE' && !this.finalGraceDidFire) {
      const chargeP = Math.max(0, Math.min(1, this.finalGraceChargeProgress || this.stateTimer / 3.03));
      const focusX = Math.round(this.x);
      const focusY = Math.round(this.y - 104);

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalCompositeOperation = 'lighter';

      if (renderer?.glowGold) {
        const outerR = Math.round(240 + chargeP * ww * 0.82);
        ctx.globalAlpha = 0.12 + chargeP * 0.30;
        ctx.drawImage(renderer.glowGold, focusX - outerR, focusY - outerR, outerR * 2, outerR * 2);
      }
      if (renderer?.glowEmerald) {
        const emR = Math.round(180 + chargeP * ww * 0.56);
        ctx.globalAlpha = 0.08 + chargeP * 0.20;
        ctx.drawImage(renderer.glowEmerald, focusX - emR, focusY - emR, emR * 2, emR * 2);
      }
      if (renderer?.glowWhite) {
        const whR = Math.round(130 + Math.pow(chargeP, 1.7) * ww * 0.65);
        ctx.globalAlpha = 0.10 + Math.pow(chargeP, 1.8) * 0.34;
        ctx.drawImage(renderer.glowWhite, focusX - whR, focusY - whR, whR * 2, whR * 2);
      }

      const washAlpha = 0.03 + Math.pow(chargeP, 2.2) * 0.22;
      ctx.fillStyle = `rgba(254, 240, 138, ${washAlpha.toFixed(3)})`;
      ctx.fillRect(-4000, -3000, ww + 8000, 6000);

      const ringCols = ['#fde047', '#f9a8d4', '#ffffff'];
      for (let rIdx = 0; rIdx < 3; rIdx++) {
        const phase = (((this.stateTimer * 0.68 + rIdx / 3) % 1) + 1) % 1;
        const ringR = 72 + phase * (280 + chargeP * (ww * 0.62));
        const ringAlpha = Math.sin(phase * Math.PI) * (0.28 + chargeP * 0.44);
        this.drawPixelOctagonRing(
          ctx,
          focusX,
          focusY,
          ringR,
          ringR * 0.68,
          4,
          ringCols[rIdx],
          ringAlpha
        );
      }

      ctx.restore();
    }

    if (this.fx && !this.isDead) {
      this.fx.renderLayer(ctx, 'back', arenaCenterX, this.groundY, 0.96);
    }
    this.drawPriestessExVfxAnims(ctx, false, renderer);

    const sprites = this.getExSprites();
    const sheet = PixelForge.ensureImage(sprites?.sheet);
    if (this.afterimages.length > 0 && sheet && sheet.complete && sheet.naturalWidth) {
      for (let i = 0; i < this.afterimages.length; i++) {
        const img = this.afterimages[i];
        const alpha = Math.max(0, (1 - img.life / img.maxLife) * 0.56);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(Math.round(img.x / 2) * 2, Math.round((img.y + 4) / 2) * 2);
        ctx.scale(img.facing, 1);
        ctx.globalAlpha = alpha;
        PixelForge.drawSilhouetteFrame(ctx, sprites, img.frameIdx, 208, 208, '#fde047');
        ctx.restore();
      }
    }

    if (sprites) {
      const groundPlantOffset = 4;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(Math.round(this.x), Math.round(this.y + groundPlantOffset));
      ctx.scale(this.facing, 1);
      this.drawSeraphimVFX(ctx, sprites, false, renderer);
      ctx.restore();
    }
  }

  drawUltimateForeground(ctx, renderer = null) {
    const ww = renderer?.worldWidth || 1280;
    const arenaCenterX = ww * 0.5;

    if (this.fx && !this.isDead) {
      this.fx.renderLayer(ctx, 'front', arenaCenterX, this.groundY, 0.98);
    }
    this.drawPriestessExVfxAnims(ctx, true, renderer);
    this.drawPixelRazorScars(ctx);

    if (this.state !== 'TRUE_ULTIMATE') return;

    const sprites = this.getExSprites();
    const vfxSheet = PixelForge.ensureImage(sprites?.vfx);
    const muzzleX = Math.round(this.finalGraceMuzzleX || this.x + this.facing * 56);
    const beamY = Math.round(this.finalGraceBeamY || this.y - 104);

    if (!this.finalGraceDidFire) {
      const chargeP = Math.max(0, Math.min(1, this.finalGraceChargeProgress || this.stateTimer / 3.03));
      ctx.save();
      ctx.imageSmoothingEnabled = false;

      const sightLen = ww + 180;
      const pulse = 0.65 + 0.35 * Math.sin(this.stateTimer * 22);
      const sightAlpha = Math.min(1, (0.28 + chargeP * 0.68) * pulse);
      ctx.save();
      ctx.translate(muzzleX, beamY);
      ctx.scale(this.facing, 1);

      ctx.globalAlpha = sightAlpha * 0.55;
      ctx.fillStyle = '#422006';
      ctx.fillRect(16, -4, sightLen, 2);
      ctx.fillRect(16, 2, sightLen, 2);

      const dashPeriod = 28;
      const dashShift = Math.round(this.stateTimer * 240) % dashPeriod;
      for (let sx = 12 - dashShift; sx < sightLen; sx += dashPeriod) {
        if (sx < 8) continue;
        const segW = chargeP > 0.82 ? 24 : 18;
        ctx.globalAlpha = sightAlpha;
        ctx.fillStyle = '#fde047';
        ctx.fillRect(sx, -2, segW, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx + 2, -1, Math.max(4, segW - 4), 2);
      }
      ctx.restore();

      if (renderer?.glowGold) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const orbGlowR = Math.round(95 + chargeP * 145);
        ctx.globalAlpha = 0.34 + chargeP * 0.42;
        ctx.drawImage(renderer.glowGold, muzzleX - orbGlowR, beamY - orbGlowR, orbGlowR * 2, orbGlowR * 2);
        ctx.restore();
      }
      if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth > 0) {
        const col = Math.floor(this.stateTimer * 30) % 30;
        const orbSize = Math.round(208 * (0.64 + 0.72 * chargeP));
        const halfOrb = Math.round(orbSize * 0.5);
        ctx.save();
        ctx.translate(muzzleX, beamY);
        ctx.scale(this.facing, 1);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.28 + chargeP * 0.34;
        ctx.drawImage(vfxSheet, col * 208, 1040, 208, 208, -halfOrb - 4, -halfOrb - 4, orbSize + 8, orbSize + 8);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = Math.min(1, 0.88 + chargeP * 0.12);
        ctx.drawImage(vfxSheet, col * 208, 1040, 208, 208, -halfOrb, -halfOrb, orbSize, orbSize);
        ctx.restore();
      }

      if (chargeP > 0.88) {
        const preU = (chargeP - 0.88) / 0.12;
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(255, 251, 235, ${(preU * preU * 0.36).toFixed(3)})`;
        ctx.fillRect(-4000, -3000, ww + 8000, 6000);
      }

      ctx.restore();
      return;
    }

    if (this.finalGraceBeamActive) {
      const beamT = Math.max(0, this.finalGraceBeamTimer || 0);
      const env =
        beamT < 0.06
          ? Math.max(0.3, beamT / 0.06)
          : beamT < 0.65
            ? 1.0
            : Math.max(0, 1 - (beamT - 0.65) / 0.24);

      if (env <= 0.01) return;

      ctx.save();
      ctx.imageSmoothingEnabled = false;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      if (beamT < 0.32) {
        const flashA = Math.pow(1 - beamT / 0.32, 1.6) * 0.46;
        ctx.fillStyle = `rgba(255, 251, 235, ${flashA.toFixed(3)})`;
        ctx.fillRect(-4000, -3000, ww + 8000, 6000);
      }
      if (renderer?.glowGold) {
        ctx.globalAlpha = 0.34 * env;
        for (let gx = 0; gx <= 1350; gx += 270) {
          const wx = muzzleX + this.facing * gx;
          ctx.drawImage(renderer.glowGold, wx - 240, beamY - 155, 480, 310);
        }
      }
      if (renderer?.glowWhite) {
        const mR = Math.round(210 * env);
        ctx.globalAlpha = 0.48 * env;
        ctx.drawImage(renderer.glowWhite, muzzleX - mR, beamY - mR, mR * 2, mR * 2);
      }
      ctx.restore();

      let col = 10;
      if (beamT < 0.08) {
        col = Math.min(2, Math.floor((beamT / 0.08) * 3));
      } else if (beamT < 0.65) {
        col = 3 + (Math.floor((beamT - 0.08) * 30) % 15);
      } else {
        col = 22 + Math.min(7, Math.floor(((beamT - 0.65) / 0.24) * 8));
      }

      const beamH = Math.max(32, Math.round(208 * (1.06 + 0.20 * env)));
      const halfH = Math.round(beamH * 0.5);

      if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth > 0) {
        ctx.save();
        ctx.translate(muzzleX, beamY);
        ctx.scale(this.facing, 1);

        const sliceX = col * 208 + 30;
        const sliceW = 148;
        const muzzleSliceW = 178;
        const bloomH = beamH + 14;
        const halfBloomH = Math.round(bloomH * 0.5);

        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.32 * env;
        for (let seg = 0; seg < 11; seg++) {
          const segLeftX = 74 + seg * sliceW;
          ctx.drawImage(vfxSheet, sliceX, 1456, sliceW, 208, segLeftX, -halfBloomH, sliceW, bloomH);
        }
        ctx.drawImage(vfxSheet, col * 208, 1248, muzzleSliceW, 208, -104, -halfBloomH, muzzleSliceW, bloomH);

        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
        for (let seg = 0; seg < 11; seg++) {
          const segLeftX = 74 + seg * sliceW;
          ctx.drawImage(vfxSheet, sliceX, 1456, sliceW, 208, segLeftX, -halfH, sliceW, beamH);
        }
        ctx.drawImage(vfxSheet, col * 208, 1248, muzzleSliceW, 208, -104, -halfH, muzzleSliceW, beamH);

        ctx.restore();
      }

      ctx.restore();
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

    PixelForge.drawSheetFrame(ctx, sprites, this, w, h, this.haloPhase, isReflection, renderer);

    ctx.restore();
  }
}
