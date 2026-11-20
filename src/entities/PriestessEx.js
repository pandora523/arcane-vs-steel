import { Fighter } from './Fighter.js?v=30fps185';
import { PixelForge } from '../engine/PixelForge.js?v=30fps185';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps185';
import { SERAPHIC_EFFECT_REGISTRY } from '../engine/shaders/seraphicShaders.js?v=30fps185';
import { ExParticleSystem, drawExBayerHalo } from '../engine/shaders/exNextGenFX.js?v=30fps185';

const AUTO_SLICES_EX = [
  [60, 8], // Beat 1 (V0, 0.38s): Grounded Rose-Window Magic Circle + Sanctum Light-Ray -> snaps at F03 (63)
  [68, 7], // Beat 2 (V1, 0.36s): Grounded Twin Benediction Halos + Twin Converging Holy Light Spears -> snaps at F09 (69)
  [75, 8], // Beat 3 (V2, 0.40s): Grounded Choir Invocation -> Remote Rose-Cathedral Sanctum Pillar (2-Hit) -> snaps at F17 (77)
  [83, 7]  // Beat 4 (V3, 0.52s): -38px Grounded Sanctum Backstep Kite -> Purifying Star-Pillar + Holy Bolt + Dawn Grace (3-Hit) -> snaps at F25 (85)
];

const BEAT_DURATIONS = [0.38, 0.36, 0.40, 0.52];
const INTRA_COMBO_LINK = 0.015;

const CRIMSON_INQUISITOR_PALETTE = Object.freeze({
  core: [255, 255, 255],
  bright: [253, 164, 175],
  mid: [244, 63, 94],
  deep: [136, 19, 55],
  glow: [251, 113, 133]
});

const ASTRAL_SERAPH_PALETTE = Object.freeze({
  core: [255, 255, 255],
  bright: [224, 242, 254],
  mid: [56, 189, 248],
  deep: [30, 58, 138],
  glow: [125, 211, 252]
});

/**
 * Seraphina EX (`priestess_ex`) — Neo-Vision High Priestess & Sanctuary Sovereign.
 * Ornate Sunburst Cathedral Scepter / Holy Crozier + Pure Stained-Glass Sacred Artillery
 * (`320x240`, `anchorX=112, anchorY=230`, native `+X` right-facing, `512px` Long-Range Sorcery,
 * strictly grounded `0px` float across `Row 2`).
 * Coexists 100% independently alongside Legacy Seraphina (`priestess`).
 */
export class PriestessEx extends Fighter {
  constructor(x, groundY, facing = 1) {
    const opts = typeof x === 'object' && x !== null ? x : { x, groundY, facing };
    super({
      ...opts,
      name: opts.name || 'Seraphina EX',
      maxHp: 3630,
      attackRange: 512,
      moveSpeed: 164,
      autoInterval: 1.02,
      lightColor: 'rgba(253, 224, 71, 1)',
      primaryColor: '#fde047',
      secondaryColor: '#ffffff',
      hasTrueUltimate: true,
      trueUltName: 'FINAL GRACE: GENESIS LUMEN',
      trueUltDuration: 4.25
    });

    this.heroId = 'priestess_ex';
    this.theme = 'radiant';
    this.deathSfx = 'death_priestess';
    this.hasPoise = true;

    this.autoDuration = BEAT_DURATIONS[0];
    this._postFlurryInterval = 1.55;

    this.skillName = 'STAINED-GLASS BENEDICTION';
    this.skillMaxCooldown = 5.08;
    this.skillCooldown = 1.20;
    this.skillDuration = 1.02;
    this.skillTriggerRange = 512;

    this.ultName = 'SERAPHIC ORGAN OF LIGHT';
    this.ultSub = 'FIVE-PILLAR CATHEDRAL & DESCENDING HALO';
    this.ultDuration = 1.62;

    this.trueUltName = 'FINAL GRACE: GENESIS LUMEN';
    this.trueUltSub = 'SUPREME FINISHER - PRISMATIC HORIZON BEAM';
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

    // 4-Beat Strictly Grounded (`0px` float) Sacred Sorcery Combo State
    this.comboStep = 0;
    this._autoVariant = 0;
    this._comboPersistTimer = 0;
    this._queuedNextBeat = false;
    this._intraLinkTimer = 0;
    this._beatHitMask = 0;
    this._beatStartX = this.x;
    this._beatTargetX = this.x;
    this._bootsPlanted = false;
    this._drewScepterFocus = false;
    this._v2RemoteX = this.x + 320;
    this._v3RemoteX = this.x + 340;

    // Newly Born Skill / Overdrive / Genesis Lumen State
    this.didSanctuaryHeal = false;
    this.didUltMiracle = false;
    this.ultOrganStep = 0;
    this._organVisual = { active: false, centerX: 0, groundY: 580, age: 0, maxLife: 1.62 };
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

    // Pixel-pure visual layers (zero canvas rotation, zero smooth ellipses, zero blurry glow blobs)
    this._overrideFrameIdx = null;
    this.afterimages = [];
    this.afterimageAccum = 0;
    this.activeVfxAnims = [];
    this.prismSeals = [];
    this.stepDustTimer = 0;
    this._exParticles = new ExParticleSystem('priestess_ex', '#fde047');

    this.fx = new ArcaneShaderFX(SERAPHIC_EFFECT_REGISTRY, {
      pixelScale: 3,
      viewW: 680,
      viewH: 440
    });

    if (typeof Image !== 'undefined') {
      PixelForge.ensureHeroLoaded?.('priestess_ex');
    }
  }

  isHackAndSlashMelee() {
    return false;
  }

  isHackAndSlashCaster() {
    return false;
  }

  applySovereignAspectStats(aspect) {
    if (aspect === 1) {
      this.maxHp = 3510;
      this.hp = this.maxHp;
      this._postFlurryInterval = 1.44;
    } else if (aspect === 2) {
      this.maxHp = 3590;
      this.hp = this.maxHp;
      this.moveSpeed = 175;
      this.dodgeMaxCooldown = 3.05;
      this.wallWingCooldown = 0;
      this._postFlurryInterval = 1.54;
    }
  }

  hasHackAndSlashCombo() {
    return false;
  }

  getAiStyleProfile() {
    return {
      comboGoal: 4,
      sweetMin: 315,
      sweetMax: 445,
      counterCrouchBias: 0.56,
      midLeapMin: 0,
      midLeapMax: 0,
      midLeapChance: 0,
      postStyle: 'sanctuary'
    };
  }

  takeDamage(amount, attacker, isCrit = false, knockX = 0, knockY = 0) {
    // Sovereign Super Armor during Genesis Lumen Dome: accumulates sanctuary energy cleanly via super.takeDamage
    if (this.state === 'TRUE_ULTIMATE' && !this.finalGraceDidFire && (this.stateTimer || 0) >= 0.35) {
      const absorbed = Math.max(0, Math.round((amount || 0) * 0.65));
      this.tankedDamage = (this.tankedDamage || 0) + absorbed;
    }
    return super.takeDamage(amount, attacker, isCrit, knockX, knockY);
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
    const ww = renderer?.worldWidth || 1280;
    if (ww <= 1600) return ww * 0.5;
    const camCenter = Number.isFinite(renderer?.cameraX) ? renderer.cameraX + 640 : this.x;
    return Math.max(810, Math.min(ww - 810, camCenter));
  }

  setState(newState) {
    const prevState = this.state;
    super.setState(newState);
    if (
      (prevState === 'ULTIMATE' || prevState === 'TRUE_ULTIMATE' || prevState === 'SKILL') &&
      newState !== 'JUMP' &&
      newState !== 'DODGE' &&
      newState !== 'SKILL' &&
      newState !== 'ULTIMATE' &&
      newState !== 'TRUE_ULTIMATE'
    ) {
      this.y = this.groundY;
      this.vy = 0;
      this.cameraAirLift = 0;
    }
    this._drewScepterFocus = false;
    this._spawnedBenedictionWard = false;

    if (newState === 'WALK' || newState === 'IDLE') {
      this._overrideFrameIdx = null;
      this.trueUltFrameOverride = null;
    }

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
      this.ultOrganStep = 0;
      this.isInvulnerable = true;
    } else if (this._organVisual) {
      this._organVisual.active = false;
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
      this._exParticles?.clear();
      this.prismSeals.length = 0;
      if (this._organVisual) this._organVisual.active = false;
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
   * Initializes one strictly grounded beat (`0..3`) of Seraphina EX's 4-beat Long-Range Sacred Sorcery combo:
   * - `0px` float (`y = groundY, vy = 0`) across `V0..V3`!
   * - `-26px` retreat step when `horizDist < 215`.
   * - Poised `10..14px` cast-step at range on `V0..V2`.
   * - `-38px` grounded Sanctum Backstep Kite on `V3`!
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
    this._drewScepterFocus = false;
    this._comboPersistTimer = 0.80;
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
    const vsAspect = game?.isAdventureMode?.() ? 0 : this.buildAspect || 0;
    const v3Backstep = vsAspect === 2 ? -54 : -38;
    const closeRetreat = vsAspect === 2 ? -36 : -26;
    let stepDelta = v === 3 ? v3Backstep : v === 0 ? 12 : v === 1 ? 10 : 14;

    if (enemy && !enemy.isDead) {
      const horizDist = Math.abs(enemy.x - this.x);
      if (v === 3) {
        stepDelta = v3Backstep;
      } else if (horizDist < (vsAspect === 2 ? 245 : 215)) {
        stepDelta = closeRetreat;
      } else {
        stepDelta = v === 0 ? 12 : v === 1 ? 10 : 14;
      }
    }

    const desiredX = this.x + this.facing * stepDelta;
    this._beatTargetX = this._clampArenaX(desiredX, game);
  }

  queueNextComboBeat() {
    this._queuedNextBeat = true;
  }

  // ============================================================================
  // PIXEL-PURE NEXT-GEN PARTICLE, FEATHER, ROSE PRISM & BAYER HALO ENGINE
  // ============================================================================
  spawnExParticle(opts) {
    if (!opts || !Number.isFinite(opts.x) || !Number.isFinite(opts.y)) return;
    if (opts.shape === 'ring') {
      this._exParticles?.spawnRing(
        opts.x,
        opts.y,
        opts.size || 52,
        opts.color || '#fde047',
        opts.coreColor || '#ffffff',
        false,
        opts.maxLife || 0.24
      );
      return;
    }
    this._exParticles?.spawn({
      shape: opts.shape || 'star4',
      x: opts.x,
      y: opts.y,
      vx: opts.vx || 0,
      vy: opts.vy || 0,
      gravity: opts.gravity ?? -20,
      swayAmp: opts.shape === 'feather' ? 24 : 8,
      swayFreq: 4.8,
      size: opts.size || 3,
      color: opts.color || '#fde047',
      accent: '#f9a8d4',
      core: opts.coreColor || '#ffffff',
      maxLife: opts.maxLife || 0.40,
      layer: opts.layer || 'front'
    });
  }

  spawnSanctumCluster(x, y, count = 6, speed = 130, withFeathers = false) {
    this._exParticles?.burst(x, y, {
      count,
      shapes: withFeathers ? ['feather', 'star4', 'diamond', 'rune'] : ['star4', 'diamond', 'rune'],
      speedMin: Math.max(36, speed * 0.42),
      speedMax: speed,
      upBias: 34,
      color: '#fde047',
      accent: '#fb7185',
      core: '#ffffff',
      layer: 'front'
    });
  }

  spawnHitStarburst(x, y, primaryHex = '#fde047', accentHex = '#fb7185', _scale = 1.0) {
    this._exParticles?.spawnHitStarburst(Math.round(x), Math.round(y), primaryHex, accentHex, 0.18);
  }

  spawnPrismSeal(x, groundY, radius = 64, maxLife = 0.58) {
    if (this.prismSeals.length >= 12) this.prismSeals.shift();
    this.prismSeals.push({
      x: Math.round(this._safeFxX(x)),
      groundY: Math.round(groundY),
      radius,
      age: 0,
      maxLife
    });
  }

  ensureSlipstream() {
    if (!this.fx) return;
    if (!this.fx.active.some((s) => s.key === 'seraphicSlipstreamTrail')) {
      this.fx.spawn('seraphicSlipstreamTrail', this._safeFxX(this.x - this.facing * 8), this.y - 114, {
        follow: this,
        offsetX: -8,
        offsetY: -114,
        flip: this.facing < 0,
        light: 1.12
      });
    }
  }

  ensureSanctuarySeal(isUltimate = false) {
    if (!this.fx) return;
    if (!this.fx.active.some((s) => s.key === 'sanctuaryCathedralSeal')) {
      this.fx.spawn('sanctuaryCathedralSeal', this._safeFxX(this.x), this.groundY, {
        follow: this,
        offsetX: 0,
        offsetY: 0,
        useGroundY: true,
        flip: false,
        light: isUltimate ? 1.24 : 1.14,
        extra: { isUltimate }
      });
    }
  }

  ensureOphanimWheel() {
    if (!this.fx) return;
    if (!this.fx.active.some((s) => s.key === 'ophanimChakramWheel')) {
      this.fx.spawn('ophanimChakramWheel', this._safeFxX(this.x), this.y - 118, {
        follow: this,
        offsetX: 0,
        offsetY: -118,
        flip: this.facing < 0,
        light: 1.24
      });
    }
  }

  spawnAfterimage(x, y, facing, row = 2, col = 4, maxLife = 0.22) {
    if (this.afterimages.length >= 10) this.afterimages.shift();
    this.afterimages.push({
      x,
      y,
      facing,
      frameIdx: row * 30 + (col % 30),
      life: 0,
      maxLife
    });
  }

  spawnVfxAnim(row, x, y, w = 180, h = 180, maxLife = 0.30, opts = {}) {
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

  _applyRemoteSanctumJudgment(centerX, radius, damage, game, primaryEnemy, opts = {}) {
    const {
      isCrit = false,
      knockX = 24,
      knockY = -34,
      hitStop = 0.040,
      shakeDur = 0.052
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
      this.spawnHitStarburst(foe.x, hitY, '#fde047', '#fb7185', isCrit ? 1.25 : 1.0);
      this.spawnSanctumCluster(foe.x, hitY, isCrit ? 7 : 5, 130, true);
      landed = true;
    }

    if (landed && hitStop > 0) {
      this._hitStopTimer = Math.max(this._hitStopTimer || 0, Math.min(0.036, hitStop));
    }
    return landed;
  }

  onProjectileTrail(p) {
    if (!p || p.type !== 'holy_light') return;
    p.ringTimer = (p.ringTimer || 0) + 0.016;
    if (p.ringTimer >= 0.048) {
      p.ringTimer = 0;
      this.spawnExParticle({
        x: p.x - Math.sign(p.vx || 1) * 14,
        y: p.y + (((p.age * 60) | 0) % 2 === 0 ? -3 : 3),
        vx: -Math.sign(p.vx || 1) * 34,
        vy: -16,
        gravity: -20,
        shape: ((p.age * 30) | 0) % 2 === 0 ? 'star4' : 'diamond',
        size: 4,
        color: '#fb7185',
        coreColor: '#fef08a',
        maxLife: 0.22
      });
    }
  }

  onProjectileHit(p, _hitTarget, isCrit, game) {
    this.fx?.spawn('holyStarImpactBurst', p.x, p.y, {
      flip: false,
      light: isCrit ? 1.26 : 1.14,
      extra: { isCrit }
    });
    this.spawnHitStarburst(p.x, p.y, '#fde047', '#38bdf8', isCrit ? 1.22 : 1.0);
    this.spawnSanctumCluster(p.x, p.y, isCrit ? 8 : 6, 145, isCrit);
    this.spawnExParticle({
      x: p.x,
      y: p.y,
      shape: 'ring',
      size: isCrit ? 38 : 28,
      color: '#fde047',
      coreColor: '#ffffff',
      maxLife: 0.22
    });
    if (game?.vfx && isCrit) {
      game.vfx.spawnGlyphBurst(p.x, p.y, 4, 'radiant');
    }
    return true;
  }

  /**
   * Grounded Radiant Flash-Step Dash (maintains `340..365px` High-Priestess spacing, NEVER rushes into melee!)
   * & Winged Seraphic Vault (`JUMP` / `DODGE`).
   */
  onStartDash(_enemy, game, dir) {
    this.dashDuration = 0.36;
    this.dashDir = dir || this.facing;
    this.isAngelicAscent = false;
    this.isFlipVault = false;
    if (game?.audio) game.audio.play('dash_whoosh', this.x);
    this.ensureSlipstream();
    this.spawnPrismSeal(this.x, this.groundY, 52, 0.30);
  }

  updateDash(dt, enemy, _game) {
    const t = this.stateTimer;
    const dur = this.dashDuration || 0.36;
    const dir = this.dashDir || this.facing;
    this.vy = 0;
    this.y = this.groundY;
    this.isAngelicAscent = false;

    if (t < dur * 0.78) {
      const distToEnemy = enemy && !enemy.isDead ? (enemy.x - this.x) * dir : 999;
      if (distToEnemy <= 345 && distToEnemy >= 0) {
        this.vx = 0;
      } else {
        this.vx = dir * 485;
      }
      this.afterimageAccum += dt;
      if (this.afterimageAccum >= 0.048) {
        this.afterimageAccum = 0;
        this.spawnAfterimage(this.x, this.groundY, this.facing, 1, Math.min(28, Math.floor((t / dur) * 30)), 0.18);
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
    this.jumpCooldown = 2.8;
    this.setState('JUMP');
    this.isInvulnerable = true;
    this.isBlinkTeleport = false;
    this.isFlipVault = true;
    this.isAngelicAscent = true;
    this.wallWingCooldown = 3.2;

    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    let dir = customDir !== null ? customDir : -this.facing;
    if (this.x < 185) dir = 1;
    else if (this.x > ww - 185) dir = -1;

    this.ascentStartX = this.x;
    this.wingSpearCount = 0;
    this.dashDuration = 0.60;

    let target = this.x + dir * 320;
    if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 245) {
      const openDir = enemy.x < ww * 0.5 ? 1 : -1;
      target = enemy.x + openDir * 355;
    }
    this.ascentTargetX = this._clampArenaX(target, game);
    this.dashDir = Math.sign(this.ascentTargetX - this.ascentStartX) || dir;

    this.vx = 0;
    this.vy = 0;
    if (game?.audio) game.audio.play('holy_heal', this.x);
    this.heal(6, 'WINGS OF GRACE');
    this.ensureSlipstream();
    this.ensureSanctuarySeal(false);
    this.spawnSanctumCluster(this.x, this.y - 96, 8, 130, true);
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

    let target = this.x + retreatDir * 315;
    if (enemy && !enemy.isDead && (this.x < 285 || this.x > ww - 285 || Math.abs(enemy.x - this.x) < 240)) {
      const openDir = enemy.x < ww * 0.5 ? 1 : -1;
      target = enemy.x + openDir * 355;
      if (Math.abs(target - this.x) < 230) {
        target = enemy.x + (this.x < enemy.x ? 1 : -1) * 345;
      }
    }
    this.ascentTargetX = this._clampArenaX(target, game);
    this.dashDir = Math.sign(this.ascentTargetX - this.ascentStartX) || retreatDir;
    this.vx = 0;
    this.vy = 0;
    if (game?.audio) game.audio.play('holy_heal', this.x);
    this.ensureSlipstream();
    this.ensureSanctuarySeal(false);
    this.spawnSanctumCluster(this.x, this.y - 96, 7, 125, true);
  }

  updateJump(_dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.dashDuration || 0.60;
    const u = Math.min(1, Math.max(0, t / dur));

    this.isAngelicAscent = true;
    this.x = this.ascentStartX + (this.ascentTargetX - this.ascentStartX) * (1 - Math.pow(1 - u, 1.85));
    this.y = this.groundY - Math.sin(u * Math.PI) * 112;
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
      const tx = aimFoe ? aimFoe.x : sx + this.facing * 420;
      const ty = aimFoe ? aimFoe.y - 94 : this.groundY - 88;
      const dx = tx - sx;
      const dy = ty - sy;
      const len = Math.hypot(dx, dy) || 1;
      this.spawnVfxAnim(4, sx, sy, 148, 148, 0.24, {
        flipX: this.facing < 0,
        inFront: true
      });
      const vsAspect = game?.isAdventureMode?.() ? 0 : this.buildAspect || 0;
      if (vsAspect === 2) {
        // Aspect III (Astral Seraph): Twin aerial starlight bolts on Winged Vault!
        for (const vyOff of [-22, 22]) {
          game?.vfx?.spawnProjectile({
            x: sx,
            y: sy + vyOff * 0.4,
            vx: (dx / len) * 760,
            vy: (dy / len) * 760 + vyOff,
            radius: 14,
            maxRange: 650,
            color: vyOff < 0 ? '#7dd3fc' : '#fde047',
            coreColor: '#ffffff',
            owner: this,
            damage: 24,
            type: 'holy_light',
            isMeteor: false
          });
        }
      } else {
        const boltSpd = vsAspect === 1 ? 825 : 725;
        game?.vfx?.spawnProjectile({
          x: sx,
          y: sy,
          vx: (dx / len) * boltSpd,
          vy: (dy / len) * boltSpd,
          radius: 15,
          maxRange: 640,
          color: vsAspect === 1 ? '#fb7185' : '#fde047',
          coreColor: '#ffffff',
          owner: this,
          damage: vsAspect === 1 ? 46 : 42,
          type: 'holy_light',
          isMeteor: false
        });
      }
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
    const vsAspect = game?.isAdventureMode?.() ? 0 : this.buildAspect || 0;
    this.crouchCooldown = vsAspect === 2 ? 3.3 : 3.8;
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
      palette:
        vsAspect === 1
          ? CRIMSON_INQUISITOR_PALETTE
          : vsAspect === 2
            ? ASTRAL_SERAPH_PALETTE
            : undefined,
      light: 1.18
    });
    if (game?.audio) game.audio.play('holy_heal', this.x);
    if (vsAspect !== 1) {
      this.heal(7, 'BENEDICTION');
    }
    if (vsAspect === 2) {
      this.grantBuildShield(20, 1.6, 'ASTRAL AEGIS!', '#7dd3fc');
    }
    this.spawnPrismSeal(this.x, this.groundY, 68, 0.65);
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
          this.spawnHitStarburst(proj.x, proj.y, '#fde047', '#38bdf8', 1.1);
        }
      }
    }

    if (t >= 0.46 && !this.didActionFrame) {
      this.didActionFrame = true;
      this.shotCombo++;
      const spawnX = this.x + this.facing * 68;
      const spawnY = this.y - 96;
      if (game?.audio) game.audio.play('holy_bolt', spawnX);

      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= 175) {
        this._applyRemoteSanctumJudgment(this.x + this.facing * 62, 122, 32, game, enemy, {
          isCrit: true,
          knockX: 112,
          knockY: -42,
          hitStop: 0.036
        });
      }

      this.spawnVfxAnim(4, spawnX, spawnY, 152, 152, 0.26, {
        flipX: this.facing < 0,
        inFront: true
      });
      const aimFoe = this._resolveRangedTarget(enemy, game);
      const tx = aimFoe ? aimFoe.x : spawnX + this.facing * 460;
      const ty = aimFoe ? aimFoe.y - 96 : spawnY;
      const dx = tx - spawnX;
      const dy = ty - spawnY;
      const dist = Math.hypot(dx, dy) || 1;
      this.fx?.spawn('scepterStarburstCone', spawnX, spawnY, {
        flip: this.facing < 0,
        light: 1.20,
        extra: { aimAngle: Math.atan2(dy, Math.abs(dx)) }
      });
      game?.vfx?.spawnProjectile({
        x: spawnX,
        y: spawnY,
        vx: (dx / dist) * 735,
        vy: (dy / dist) * 735,
        radius: 15,
        maxRange: 640,
        color: '#fde047',
        coreColor: '#ffffff',
        owner: this,
        damage: 43,
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
   * Pure Long-Range High-Priestess Sacred Artillery (`attackRange: 512`):
   * - `V0 (F03)`: Rose-Window Magic Circle + fast `'holy_light'` Sanctum Ray (`speed: 735, maxRange: 640`)
   * - `V1 (F09)`: Twin Golden Benediction Halos + twin converging `'holy_light'` Spears
   * - `V2 (F17)`: Remote Rose-Cathedral Sanctum Pillar erupting at `enemy.x` (`2-hit` up to `560px`)
   * - `V3 (F25)`: `-38px` grounded Sanctum Backstep Kite -> Purifying Star-Pillar Judgment at `enemy.x` + `'holy_light'` bolt + Dawn Grace micro-heal (`3-hit`)
   */
  updateAutoAttack(dt, enemy, game) {
    this._currentEnemy = enemy;
    this._comboPersistTimer = 0.80;

    // Hard grounded lock (`0px` float) on every tick of Row 2 AUTO_ATTACK!
    this.y = this.groundY;
    this.vy = 0;
    this.isAngelicAscent = false;

    if (this._intraLinkTimer > 0) {
      this._intraLinkTimer = Math.max(0, this._intraLinkTimer - dt);
      this.vx = 0;
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

    // 1. Grounded Cast-Step / Retreat / V3 -38px Sanctum Backstep Kite -> Planted Boots (`vx = 0`)
    this.vx = 0;
    if (t < snapT) {
      const u = Math.min(1, Math.max(0, t / snapT));
      const eased = 1 - Math.pow(1 - u, 2.1);
      this.x = this._beatStartX + (this._beatTargetX - this._beatStartX) * eased;

      if (!this._drewScepterFocus) {
        this._drewScepterFocus = true;
        this.fx?.spawn('scepterStarFocus', this.x + this.facing * 34, this.groundY - 108, {
          follow: this,
          offsetX: 34,
          offsetY: -108,
          flip: this.facing < 0,
          light: v === 3 ? 1.22 : 1.14
        });
      }
    } else if (!this._bootsPlanted) {
      this._bootsPlanted = true;
      this.x = this._beatTargetX;
      this.vx = 0;
    }

    const spawnX = this.x + this.facing * 70;
    const spawnY = this.groundY - 96;
    const aimFoe = this._resolveRangedTarget(enemy, game, 620);
    const targetY = aimFoe ? aimFoe.y - (aimFoe.isColossalBoss ? 128 : 94) : spawnY;
    const dx = aimFoe ? aimFoe.x - spawnX : this.facing * 470;
    const dy = targetY - spawnY;
    const dist = Math.hypot(dx, dy) || 1;
    const aimAng = Math.atan2(dy, Math.abs(dx));

    const vsAspect = game?.isAdventureMode?.() ? 0 : this.buildAspect || 0;
    const aspectPal =
      vsAspect === 1
        ? CRIMSON_INQUISITOR_PALETTE
        : vsAspect === 2
          ? ASTRAL_SERAPH_PALETTE
          : undefined;
    const boltColor = vsAspect === 1 ? '#fb7185' : vsAspect === 2 ? '#7dd3fc' : '#fde047';
    const boltSpeedMult = vsAspect === 1 ? 1.14 : vsAspect === 2 ? 1.07 : 1.0;
    const dmgScale = vsAspect === 1 ? 1.12 : vsAspect === 2 ? 0.85 : 1.0;

    // 2. Beat-Specific Pure Long-Range Sacred Casts
    if (v === 0) {
      if ((this._beatHitMask & 1) === 0 && t >= 0.10) {
        this._beatHitMask |= 1;
        this.shotCombo++;
        this.didActionFrame = true;
        if (game?.audio) game.audio.play('holy_bolt', spawnX);
        this.spawnVfxAnim(4, spawnX, spawnY, 152, 152, 0.26, {
          flipX: this.facing < 0,
          inFront: true
        });
        this.fx?.spawn('scepterStarburstCone', spawnX, spawnY, {
          flip: this.facing < 0,
          palette: aspectPal,
          light: 1.18,
          extra: { aimAngle: aimAng }
        });
        this.spawnSanctumCluster(spawnX, spawnY, 5, 115, false);
        const spd0 = 735 * boltSpeedMult;
        game?.vfx?.spawnProjectile({
          x: spawnX,
          y: spawnY,
          vx: (dx / dist) * spd0,
          vy: (dy / dist) * spd0,
          radius: 15,
          maxRange: 640,
          color: boltColor,
          coreColor: '#ffffff',
          owner: this,
          damage: vsAspect === 0 ? 39 : Math.round(39 * dmgScale),
          type: 'holy_light',
          isMeteor: false
        });
      }
    } else if (v === 1) {
      if ((this._beatHitMask & 1) === 0 && t >= 0.07) {
        this._beatHitMask |= 1;
        this.shotCombo++;
        this.didActionFrame = true;
        if (game?.audio) game.audio.play('holy_bolt', spawnX);
        this.spawnVfxAnim(4, spawnX, spawnY - 10, 140, 140, 0.24, {
          flipX: this.facing < 0,
          inFront: true
        });
        this.fx?.spawn('scepterStarburstCone', spawnX, spawnY, {
          flip: this.facing < 0,
          palette: aspectPal,
          light: 1.20,
          extra: { aimAngle: aimAng, isGrace: true }
        });
        this.spawnSanctumCluster(spawnX, spawnY, 6, 120, true);
        if (game?.vfx) {
          const speed = 715 * boltSpeedMult;
          game.vfx.spawnProjectile({
            x: spawnX,
            y: spawnY - 14,
            vx: (dx / dist) * speed,
            vy: (dy / dist) * speed - 20,
            radius: 14,
            maxRange: 640,
            color: boltColor,
            coreColor: '#ffffff',
            owner: this,
            damage: vsAspect === 0 ? 23 : Math.round(23 * dmgScale),
            type: 'holy_light',
            isMeteor: false
          });
          game.vfx.spawnProjectile({
            x: spawnX - this.facing * 10,
            y: spawnY + 14,
            vx: (dx / dist) * speed,
            vy: (dy / dist) * speed + 20,
            radius: 14,
            maxRange: 640,
            color: vsAspect === 2 ? '#fde047' : '#fb7185',
            coreColor: '#fef9c3',
            owner: this,
            damage: vsAspect === 0 ? 21 : Math.round(21 * dmgScale),
            type: 'holy_light',
            isMeteor: false
          });
        }
      }
    } else if (v === 2) {
      // Beat 3 (V2): Remote Rose-Cathedral Sanctum Pillar erupting at enemy.x (2-hit up to 560px away!)
      if ((this._beatHitMask & 1) === 0 && t >= 0.09) {
        this._beatHitMask |= 1;
        this.didActionFrame = true;
        const rawRemoteX = aimFoe
          ? Math.abs(aimFoe.x - this.x) <= 560
            ? aimFoe.x
            : this.x + this.facing * 515
          : this.x + this.facing * 355;
        this._v2RemoteX = this._clampArenaX(rawRemoteX, game);
        if (game?.audio) game.audio.play('holy_bolt', this._v2RemoteX);
        this.spawnPrismSeal(this._v2RemoteX, this.groundY, 72, 0.44);
        this.spawnVfxAnim(3, this._v2RemoteX, this.groundY - 104, 168, 168, 0.30, {
          flipX: false,
          inFront: false
        });
        this._applyRemoteSanctumJudgment(
          this._v2RemoteX,
          86,
          vsAspect === 0 ? 22 : Math.round(22 * dmgScale),
          game,
          aimFoe || enemy,
          {
            knockX: 16,
            knockY: -20,
            hitStop: 0.032
          }
        );
      }
      if ((this._beatHitMask & 2) === 0 && t >= 0.16) {
        this._beatHitMask |= 2;
        this.shotCombo++;
        const px = this._v2RemoteX;
        if (game?.audio) game.audio.play('holy_bolt', px);
        game?.renderer?.triggerShake?.(8, 0.18);
        game?.vfx?.spawnFlamePillar(px, this.groundY, this, null, {
          theme: 'radiant',
          delay: 0.02,
          maxLife: 0.80,
          scaleWidth: 0.90,
          tickDamage: 0
        });
        this.fx?.spawn('cathedralSanctumPillar', px, this.groundY, {
          palette: aspectPal,
          light: 1.24,
          extra: { scaleWidth: 0.90 }
        });
        this.spawnVfxAnim(2, px, this.groundY - 94, 188, 188, 0.34, {
          flipX: this.facing < 0,
          inFront: true
        });
        const hitV2 = this._applyRemoteSanctumJudgment(
          px,
          92,
          vsAspect === 0 ? 28 : Math.round(28 * dmgScale),
          game,
          aimFoe || enemy,
          {
            isCrit: true,
            knockX: vsAspect === 1 ? 10 : 26,
            knockY: -48,
            hitStop: 0.038
          }
        );
        if (vsAspect === 1 && hitV2 && (aimFoe || enemy)) {
          (aimFoe || enemy).applyBuildRoot?.(0.36, 'SPEAR ROOT!', '#fb7185');
        }
      }
    } else {
      // Beat 4 (V3): -38px Grounded Sanctum Backstep Kite -> Purifying Star-Pillar at enemy.x + holy_light bolt + Dawn Grace micro-heal (3-hit!)
      if ((this._beatHitMask & 1) === 0 && t >= 0.15) {
        this._beatHitMask |= 1;
        this.shotCombo++;
        this.didActionFrame = true;
        this.spawnAfterimage(this.x + this.facing * 24, this.groundY, this.facing, 2, 25, 0.22);
        const rawRemoteX = aimFoe
          ? Math.abs(aimFoe.x - this.x) <= 580
            ? aimFoe.x
            : this.x + this.facing * 520
          : this.x + this.facing * 375;
        this._v3RemoteX = this._clampArenaX(rawRemoteX, game);

        if (game?.audio) {
          game.audio.play('holy_bolt', spawnX);
          if (vsAspect !== 1) game.audio.play('holy_heal', this.x);
          game.audio.playHeroVoice?.(this.heroId, 'attack', {
            worldX: this.x,
            speakerKey: this,
            priority: 1,
            cooldownMs: 3600
          });
        }
        if (vsAspect !== 1) {
          this.heal(12, 'DAWN GRACE');
          this.fx?.spawn('graceHealBloom', this.x, this.groundY, {
            follow: this,
            offsetX: 0,
            offsetY: 0,
            useGroundY: true,
            palette: aspectPal,
            light: 1.20
          });
        } else {
          // Aspect II (Crimson Inquisitor): zero heal, drops pinning Crimson Sky-Spear!
          game?.vfx?.spawnSkyStrike({
            x: this._v3RemoteX,
            y: -140,
            groundY: this.groundY,
            vx: 0,
            vy: 1380,
            type: 'holy_spear',
            color: '#fb7185',
            coreColor: '#ffffff',
            owner: this,
            target: aimFoe || enemy,
            damage: 14,
            delay: 0.02,
            isUltimate: false
          });
        }
        if (vsAspect === 2) {
          this.gainMana(3);
        }
        this.spawnPrismSeal(this.x, this.groundY, 58, 0.38);
        this.spawnVfxAnim(4, spawnX + this.facing * 8, spawnY, 168, 168, 0.28, {
          flipX: this.facing < 0,
          inFront: true
        });
        this.spawnSanctumCluster(spawnX, spawnY, 8, 140, true);

        const spd3 = 740 * boltSpeedMult;
        game?.vfx?.spawnProjectile({
          x: spawnX + this.facing * 10,
          y: spawnY,
          vx: (dx / dist) * spd3,
          vy: (dy / dist) * spd3,
          radius: 16,
          maxRange: 650,
          color: boltColor,
          coreColor: '#ffffff',
          owner: this,
          damage: vsAspect === 0 ? 29 : Math.round(29 * dmgScale),
          type: 'holy_light',
          isMeteor: false
        });

        this.spawnPrismSeal(this._v3RemoteX, this.groundY, 82, 0.44);
        this._applyRemoteSanctumJudgment(
          this._v3RemoteX,
          90,
          vsAspect === 0 ? 19 : Math.round(19 * dmgScale),
          game,
          aimFoe || enemy,
          {
            knockX: 20,
            knockY: -28,
            hitStop: 0.034
          }
        );
      }
      if ((this._beatHitMask & 2) === 0 && t >= 0.24) {
        this._beatHitMask |= 2;
        const px = this._v3RemoteX;
        game?.renderer?.triggerShake?.(9, 0.20);
        game?.vfx?.spawnFlamePillar(px, this.groundY, this, null, {
          theme: 'radiant',
          delay: 0.02,
          maxLife: 0.84,
          scaleWidth: 0.96,
          tickDamage: 0
        });
        this.fx?.spawn('cathedralSanctumPillar', px, this.groundY, {
          palette: aspectPal,
          light: 1.28,
          extra: { scaleWidth: 0.96 }
        });
        this.spawnVfxAnim(2, px, this.groundY - 96, 198, 198, 0.34, {
          flipX: false,
          inFront: true
        });
        const hitV3 = this._applyRemoteSanctumJudgment(
          px,
          96,
          vsAspect === 0 ? 23 : Math.round(23 * dmgScale),
          game,
          aimFoe || enemy,
          {
            isCrit: true,
            knockX: vsAspect === 1 ? 18 : 62,
            knockY: -56,
            hitStop: 0.044
          }
        );
        if (vsAspect === 1 && hitV3 && (aimFoe || enemy)) {
          (aimFoe || enemy).applyBuildRoot?.(0.36, 'SPEAR ROOT!', '#fb7185');
        }
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
   * NEWLY BORN SPECIAL SKILL (`STAINED-GLASS BENEDICTION`, Row 3 `90..119`):
   * Consecrates a Stained-Glass Rose-Cathedral floor prism healing `+42 HP` while
   * erupting 3 Purifying Judgment Rays (`targetX - 54`, `targetX`, `targetX + 54`) at `enemy.x`!
   */
  updateSkill(_dt, enemy, game) {
    const t = this.stateTimer;
    this.y = this.groundY;
    this.vy = 0;
    this.vx = 0;
    this.isAngelicAscent = false;
    this.ensureSanctuarySeal(false);

    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const rawTarget = enemy ? enemy.x : this.x + this.facing * 355;
    const targetX = this._safeFxX(Math.max(115, Math.min(ww - 115, rawTarget)), game);

    const vsSkill = game?.isAdventureMode?.() ? 0 : this.buildSkill || 0;
    const skillPal =
      vsSkill === 1
        ? CRIMSON_INQUISITOR_PALETTE
        : vsSkill === 2
          ? ASTRAL_SERAPH_PALETTE
          : undefined;

    if (t >= 0.16 && !this.didSanctuaryHeal) {
      this.didSanctuaryHeal = true;
      if (game?.audio) {
        game.audio.play(vsSkill === 1 ? 'holy_bolt' : 'holy_heal', this.x);
        game.audio.playHeroVoice?.(
          this.heroId,
          vsSkill === 1 ? 'skill_crimson' : 'skill_std',
          {
            worldX: this.x,
            speakerKey: this,
            priority: 2,
            cooldownMs: 400,
            duckSfx: true
          }
        );
      }
      game?.vfx?.spawnSpecialCastAura(this, this.skillName, 'SERAPHIC SOVEREIGN', 'radiant', false);
      if (vsSkill === 1) {
        // Skill II (Crimson Spear-Tribunal): Zero self-heal!
        this.spawnPrismSeal(this.x, this.groundY, 84, 0.72);
      } else if (vsSkill === 2) {
        // Skill III (Eternal Sanctuary Aegis): Barrier + Self & Tag-Partner Heal!
        this.heal(32, 'ETERNAL SANCTUARY');
        this.grantBuildShield(48, 2.5, 'SANCTUARY BARRIER!', '#fde047');
        this.healTeammateTagGrace(34, 'TAG SANCTUARY', 40, 2.4);
        this.fx?.spawn('graceHealBloom', this._safeFxX(this.x, game), this.groundY, {
          follow: this,
          offsetX: 0,
          offsetY: 0,
          useGroundY: true,
          palette: ASTRAL_SERAPH_PALETTE,
          light: 1.32
        });
        this.spawnPrismSeal(this.x, this.groundY, 102, 0.88);
      } else {
        this.heal(30, 'SANCTUARY');
        this.fx?.spawn('graceHealBloom', this._safeFxX(this.x, game), this.groundY, {
          follow: this,
          offsetX: 0,
          offsetY: 0,
          useGroundY: true,
          light: 1.28
        });
        this.spawnPrismSeal(this.x, this.groundY, 88, 0.76);
      }
      this.spawnPrismSeal(targetX, this.groundY, 104, 0.84);
      this.spawnVfxAnim(3, this.x, this.groundY - 104, 192, 192, 0.48, {
        flipX: false,
        inFront: false
      });
      this.spawnSanctumCluster(this.x, this.y - 104, 8, 135, true);

      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 215) {
        const pushDir = Math.sign(enemy.x - this.x) || this.facing;
        enemy.vx += pushDir * (vsSkill === 2 ? 230 : 180);
      }
    }

    if (t >= 0.44 && !this.didActionFrame) {
      this.didActionFrame = true;
      if (game?.audio) game.audio.play('holy_bolt', targetX);
      game?.renderer?.triggerShake?.(10, 0.22);

      const rayOffsets =
        vsSkill === 1
          ? [-88, -44, 0, 44, 88]
          : vsSkill === 2
            ? [0]
            : [-56, 0, 56];

      for (let i = 0; i < rayOffsets.length; i++) {
        const off = rayOffsets[i];
        const rx = this._safeFxX(Math.max(85, Math.min(ww - 85, targetX + off)), game);
        const isCenter = off === 0;
        this.fx?.spawn('holySpearReticle', rx, this.groundY, {
          palette: skillPal,
          light: 1.22
        });
        if (vsSkill !== 1 || Math.abs(off) <= 44) {
          game?.vfx?.spawnFlamePillar(rx, this.groundY, this, enemy, {
            theme: 'radiant',
            delay: isCenter ? 0.01 : 0.05,
            maxLife: isCenter ? 0.86 : 0.68,
            scaleWidth: isCenter ? 1.04 : 0.74,
            tickDamage: vsSkill === 2 ? 6 : 10
          });
        }
        game?.vfx?.spawnSkyStrike({
          x: rx,
          y: -160,
          groundY: this.groundY,
          vx: 0,
          vy: vsSkill === 1 ? 1420 : 1320,
          type: 'holy_spear',
          color: vsSkill === 1 ? '#fb7185' : isCenter ? '#fde047' : '#fb7185',
          coreColor: '#ffffff',
          owner: this,
          target: enemy,
          damage: vsSkill === 1 ? (isCenter ? 26 : 15) : vsSkill === 2 ? 20 : isCenter ? 28 : 18,
          delay: isCenter ? 0 : 0.04,
          isUltimate: false
        });
        this.spawnVfxAnim(2, rx, this.groundY - (isCenter ? 102 : 86), isCenter ? 204 : 164, isCenter ? 216 : 172, 0.44, {
          flipX: off < 0,
          inFront: true
        });
      }

      this.fx?.spawn('cathedralSanctumPillar', targetX, this.groundY, {
        palette: skillPal,
        light: 1.30,
        extra: { scaleWidth: 1.02 }
      });
      this.spawnVfxAnim(3, targetX, this.groundY - 108, 208, 208, 0.44, {
        flipX: false,
        inFront: false
      });

      const hitSkill = this._applyRemoteSanctumJudgment(
        targetX,
        118,
        vsSkill === 1 ? 64 : vsSkill === 2 ? 39 : 55,
        game,
        enemy,
        {
          isCrit: true,
          knockX: vsSkill === 1 ? 22 : 60,
          knockY: -48,
          hitStop: 0.042
        }
      );
      if (vsSkill === 1 && hitSkill && enemy) {
        enemy.applyBuildRoot?.(0.46, 'INQUISITOR ROOT!', '#fb7185');
      }

      const sx = this._safeFxX(this.x + this.facing * 64, game);
      const sy = this.y - 108;
      const dx = targetX - sx;
      const dy = (enemy ? enemy.y - 98 : this.groundY - 98) - sy;
      const dist = Math.hypot(dx, dy) || 1;
      game?.vfx?.spawnProjectile({
        x: sx,
        y: sy,
        vx: (dx / dist) * (vsSkill === 1 ? 810 : 710),
        vy: (dy / dist) * (vsSkill === 1 ? 810 : 710),
        radius: 15,
        maxRange: 650,
        color: vsSkill === 1 ? '#fb7185' : vsSkill === 2 ? '#7dd3fc' : '#fde047',
        coreColor: '#ffffff',
        owner: this,
        damage: vsSkill === 1 ? 43 : vsSkill === 2 ? 26 : 38,
        type: 'holy_light',
        isMeteor: false
      });
    } else if (t >= this.skillDuration) {
      this.y = this.groundY;
      this.vx = 0;
      this.setState('IDLE');
    }
  }

  /**
   * NEWLY BORN OVERDRIVE (`SERAPHIC ORGAN OF LIGHT`, Row 4 `120..149`):
   * Unfurls 30-frame `seraphim_wings.png` (`86px` Angelic Wing Vault hover) + `+48 HP` Miracle Heal +
   * Cathedral Rose Window Crest + 5-Pillar Golden Cathedral Organ-of-Light (`[-160, -80, 0, 80, 160]`)!
   */
  updateUltimate(_dt, enemy, game) {
    const t = this.stateTimer;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const rawTarget = enemy ? enemy.x : this.x + this.facing * 360;
    const targetX = this._safeFxX(Math.max(190, Math.min(ww - 190, rawTarget)), game);

    this.isFlipVault = false;
    this.isBlinkTeleport = false;
    this.isAngelicAscent = false;
    this.isInvulnerable = t < 0.22;
    this.unstoppablePoise = true;
    this.vx = 0;
    this.vy = 0;

    this.ensureSlipstream();
    this.ensureSanctuarySeal(true);
    this.ensureOphanimWheel();

    // 86px Angelic Wing Vault hover curve
    let lift = 0;
    if (t < 0.38) {
      lift = Math.sin((t / 0.38) * (Math.PI * 0.5)) * 86;
    } else if (t < 1.22) {
      lift = 86 + Math.sin((t - 0.38) * 8.0) * 4;
    } else {
      lift = Math.max(0, Math.cos(((t - 1.22) / 0.40) * (Math.PI * 0.5)) * 86);
    }
    this.y = this.groundY - lift;

    const vsUlt = game?.isAdventureMode?.() ? 0 : this.buildUlt || 0;
    const ultPal =
      vsUlt === 1
        ? CRIMSON_INQUISITOR_PALETTE
        : vsUlt === 2
          ? ASTRAL_SERAPH_PALETTE
          : undefined;

    if (t >= 0.14 && !this.didUltMiracle) {
      this.didUltMiracle = true;
      this.ultOrganStep = 0;
      if (game?.audio) {
        game.audio.play(vsUlt === 1 ? 'holy_bolt' : 'holy_heal', this.x);
        game.audio.playHeroVoice?.(
          this.heroId,
          vsUlt === 1 ? 'ult_crimson' : 'ult_std',
          {
            worldX: this.x,
            speakerKey: this,
            priority: 3,
            cooldownMs: 400,
            duckSfx: true
          }
        );
      }
      game?.vfx?.spawnSpecialCastAura(this, this.ultName, 'NEO-VISION OVERDRIVE', 'radiant', true);
      if (vsUlt === 1) {
        // Ult II (Crimson Inquisitor Crucible): Zero Miracle heal!
      } else if (vsUlt === 2) {
        // Ult III (Choir of Eternal Sanctuary): Enhanced Miracle + Tag-Partner Heal + Radiant Barrier!
        this.heal(40, 'ETERNAL CHOIR');
        this.grantBuildShield(58, 2.8, 'ETERNAL BARRIER!', '#fde047');
        this.healTeammateTagGrace(46, 'CHOIR GRACE', 48, 2.8);
        this.fx?.spawn('graceHealBloom', this._safeFxX(this.x, game), this.groundY, {
          follow: this,
          offsetX: 0,
          offsetY: 0,
          useGroundY: true,
          palette: ASTRAL_SERAPH_PALETTE,
          light: 1.34
        });
      } else {
        this.heal(32, 'MIRACLE');
        this.fx?.spawn('graceHealBloom', this._safeFxX(this.x, game), this.groundY, {
          follow: this,
          offsetX: 0,
          offsetY: 0,
          useGroundY: true,
          light: 1.30
        });
      }
      this._organVisual = {
        active: true,
        centerX: targetX,
        groundY: this.groundY,
        age: 0,
        maxLife: this.ultDuration
      };
      this.spawnPrismSeal(targetX, this.groundY, 176, 1.48);
      this.spawnSanctumCluster(this.x, this.y - 108, 12, 155, true);
    }

    if (this._organVisual?.active) {
      this._organVisual.age = t;
      this._organVisual.centerX = targetX;
      this._organVisual.groundY = this.groundY;
    }

    // Sequentially ignite the 5 Golden Cathedral Organ-of-Light Pipes!
    const pipeOffsets = [-160, 160, -80, 80, 0];
    const pipeTimes = [0.36, 0.46, 0.56, 0.66, 0.78];
    while (this.ultOrganStep < pipeTimes.length && t >= pipeTimes[this.ultOrganStep]) {
      const idx = this.ultOrganStep;
      this.ultOrganStep++;
      const px = this._safeFxX(Math.max(85, Math.min(ww - 85, targetX + pipeOffsets[idx])), game);
      const isCenter = pipeOffsets[idx] === 0;
      if (game?.audio) game.audio.play('holy_bolt', px);
      this.spawnVfxAnim(2, px, this.groundY - (isCenter ? 116 : 96), isCenter ? 232 : 188, isCenter ? 248 : 198, 0.56, {
        flipX: pipeOffsets[idx] < 0,
        inFront: true
      });
      game?.vfx?.spawnFlamePillar(px, this.groundY, this, enemy, {
        theme: 'radiant',
        delay: 0.01,
        maxLife: isCenter ? 0.96 : 0.80,
        scaleWidth: isCenter ? 1.22 : 0.86,
        isUltimate: isCenter,
        tickDamage: 0
      });
      game?.vfx?.spawnBeam({
        x1: px,
        y1: this.groundY - (isCenter ? 390 : 300),
        x2: px,
        y2: this.groundY - 6,
        width: isCenter ? 54 : 38,
        color: vsUlt === 1 ? '#fb7185' : vsUlt === 2 ? '#7dd3fc' : '#fde047',
        coreColor: '#ffffff',
        maxLife: isCenter ? 0.54 : 0.42
      });
      if (vsUlt === 1) {
        game?.vfx?.spawnSkyStrike({
          x: px,
          y: -170,
          groundY: this.groundY,
          vx: 0,
          vy: 1450,
          type: 'holy_spear',
          color: '#fb7185',
          coreColor: '#ffffff',
          owner: this,
          target: enemy,
          damage: 8,
          delay: 0.01,
          isUltimate: true
        });
      }
      this.fx?.spawn('cathedralSanctumPillar', px, this.groundY, {
        palette: ultPal,
        light: isCenter ? 1.36 : 1.22,
        extra: { scaleWidth: isCenter ? 1.22 : 0.86 }
      });
      this.spawnSanctumCluster(px, this.groundY - 92, isCenter ? 10 : 6, 150, true);
      if (enemy && !enemy.isDead && Math.abs(enemy.x - px) <= 135) {
        enemy.takeDamage(vsUlt === 1 ? 25 : vsUlt === 2 ? 14 : 22, this, false, 24, 0);
      }
    }

    // Grand Descending Cathedral Rose-Window Climax (`t >= 0.96s`)
    if (t >= 0.96 && !this.didActionFrame) {
      this.didActionFrame = true;
      if (game?.audio) game.audio.play('priestess_ult', targetX);
      game?.renderer?.triggerShake?.(22, 0.54);
      game?.renderer?.triggerAberration?.(12);
      game?.renderer?.triggerHitStop?.(0.08);

      this.fx?.spawn('sanctuaryNovaBurst', targetX, this.groundY - 118, {
        flip: false,
        palette: ultPal,
        light: 1.38
      });
      this.spawnVfxAnim(3, targetX, this.groundY - 118, 256, 256, 0.58, {
        flipX: false,
        inFront: true
      });
      this.spawnSanctumCluster(targetX, this.groundY - 118, 16, 195, true);

      const hitUlt = this._applyRemoteSanctumJudgment(
        targetX,
        195,
        vsUlt === 1 ? 162 : vsUlt === 2 ? 99 : 136,
        game,
        enemy,
        {
          isCrit: true,
          knockX: vsUlt === 1 ? 95 : 145,
          knockY: -195,
          hitStop: 0.06
        }
      );
      if (vsUlt === 1 && hitUlt && enemy) {
        enemy.applyBuildRoot?.(0.42, 'CRUCIBLE PIN!', '#fb7185');
      }

      game?.vfx?.spawnDamageText(
        targetX,
        this.groundY - 186,
        0,
        true,
        'SERAPHIC ORGAN OF LIGHT!',
        '#fde047'
      );
    }

    if (t >= this.ultDuration) {
      this.y = this.groundY;
      this.isInvulnerable = false;
      this.unstoppablePoise = false;
      if (this._organVisual) this._organVisual.active = false;
      this.setState('IDLE');
    }
  }

  /**
   * NEWLY BORN SUPREME FINISHER (`FINAL GRACE: GENESIS LUMEN`, `4.25s`):
   * - Phase 1 (`0.00..3.03s`): Stained-Glass Celestial Dome + `+30%` MaxHP Miracle + unbreakable absorption
   * - Phase 2 (`t >= 3.03s`): Divine Cathedral Judgment Beam (`>= 740` dmg) + Seraphic Light-Feathers!
   */
  updateTrueUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    this.vx = 0;
    this.vy = 0;
    this.isInvulnerable = t < 0.35;
    this.unstoppablePoise = true;
    this.isCrouching = false;
    this.isDeflecting = false;
    this.isFlipVault = false;
    this.isBlinkTeleport = false;
    this.isAngelicAscent = false;

    const foes = game?.getEnemiesOf ? game.getEnemiesOf(this) : enemy ? [enemy] : [];
    let focusEnemy = enemy && !enemy.isDead && !enemy.isBenched ? enemy : null;
    if (!focusEnemy) {
      for (const f of foes) {
        if (f && !f.isDead && !f.isBenched) {
          focusEnemy = f;
          break;
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
      if (game?.audio) {
        game.audio.play('final_grace_charge', this.x);
        game.audio.playHeroVoice?.(this.heroId, 'true_ult_charge', {
          worldX: this.x,
          speakerKey: this,
          priority: 3,
          cooldownMs: 400,
          duckSfx: true
        });
      }
    }

    if (t < 3.03) {
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
        const healAmt = Math.round(this.maxHp * 0.16);
        if (game?.audio) game.audio.play('holy_heal', this.x);
        this.heal(healAmt, 'GENESIS LUMEN');
        this.fx?.spawn('graceHealBloom', this._safeFxX(this.x, game), this.groundY, {
          follow: this,
          offsetX: 0,
          offsetY: 0,
          useGroundY: true,
          light: 1.34
        });
        this.spawnSanctumCluster(this.x, this.y - 98, 16, 165, true);
      }

      const muzzleX = this.x + this.facing * 56;
      const beamY = this.y - 104;
      this.finalGraceMuzzleX = muzzleX;
      this.finalGraceBeamY = beamY;
      this.finalGraceChargeProgress = Math.min(1, t / 3.03);

      this._finalGracePulseAccum += dt;
      if (this._finalGracePulseAccum >= 0.24) {
        this._finalGracePulseAccum = 0;
        this.fx?.spawn('seraphicFinalGraceCharge', this._safeFxX(this.x, game), this.y - 98, {
          follow: this,
          offsetX: 0,
          offsetY: -98,
          flip: this.facing < 0,
          light: 1.20 + 0.24 * this.finalGraceChargeProgress,
          extra: { chargeU: this.finalGraceChargeProgress }
        });
      }

      this._finalGraceMoteAccum += dt;
      if (this._finalGraceMoteAccum >= 0.11) {
        this._finalGraceMoteAccum = 0;
        this.spawnSanctumCluster(muzzleX, beamY, 3, 95, true);
      }
      return;
    }

    // Phase 2 (STRICTLY at t >= 3.03s): Divine Cathedral Judgment Beam (`>= 740` dmg!)
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
      const counterDmg = Math.min(790, Math.max(640, Math.round(rawTanked * 0.55)));
      this.tankedDamage = 0;

      if (game?.audio) {
        game.audio.play('final_grace_beam', this.x);
        game.audio.playHeroVoice?.(this.heroId, 'true_ult_fire', {
          worldX: this.x,
          speakerKey: this,
          priority: 4,
          cooldownMs: 200,
          duckSfx: true
        });
      }
      game?.renderer?.triggerImpactFrame?.(this._safeFxX(this.x + this.facing * 260, game), beamY, 0.16, 'radiant');
      game?.renderer?.triggerShake?.(24, 0.52);
      game?.renderer?.triggerAberration?.(9);
      game?.renderer?.triggerHitStop?.(0.10);

      const ww = game?.renderer?.worldWidth || 1280;
      const beamEndX = this.facing > 0 ? ww + 160 : -160;
      game?.vfx?.spawnBeam({
        x1: muzzleX,
        y1: beamY,
        x2: beamEndX,
        y2: beamY,
        width: 108,
        color: '#fde047',
        coreColor: '#ffffff',
        maxLife: 0.88
      });

      for (let step = 1; step <= 6; step++) {
        const bx = this._safeFxX(muzzleX + this.facing * step * 155, game);
        this.spawnSanctumCluster(bx, beamY, 4, 150, true);
      }

      let hitAny = false;
      for (const foe of foes) {
        if (!foe || foe.isDead || foe.isBenched) continue;
        const inFront = (foe.x - this.x) * this.facing >= -48;
        const inBeamBand = Math.abs(foe.y - 95 - beamY) <= 168;
        if (inFront && inBeamBand) {
          hitAny = true;
          foe.takeDamage(counterDmg, this, true, 255, -185);
          const safeFoeX = this._safeFxX(foe.x, game);
          this.fx?.spawn('sanctuaryNovaBurst', safeFoeX, beamY, {
            flip: this.facing < 0,
            light: 1.38
          });
          game?.vfx?.spawnFlamePillar(safeFoeX, this.groundY, this, foe, {
            theme: 'radiant',
            delay: 0.02,
            maxLife: 0.92,
            scaleWidth: 1.12,
            isUltimate: true,
            tickDamage: 0
          });
          this.spawnHitStarburst(foe.x, beamY, '#fde047', '#fb7185', 1.45);
          this.spawnSanctumCluster(foe.x, beamY, 14, 210, true);
          if (game?.vfx) {
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
        const missX = this._safeFxX(this.x + this.facing * 240, game);
        this.fx?.spawn('sanctuaryNovaBurst', missX, beamY, {
          flip: this.facing < 0,
          light: 1.30
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
      const fIdx = 137 + (Math.floor((t - 3.03) * 24) % 7);
      this.trueUltFrameOverride = fIdx;
      this._overrideFrameIdx = fIdx;
    } else if (t < this.trueUltDuration) {
      this.finalGraceBeamActive = false;
      const descU = Math.min(1, Math.max(0, (t - 3.92) / 0.33));
      const smoothDesc = descU * descU * (3 - 2 * descU);
      this.y = this.groundY - 66 * (1 - smoothDesc);
      const fIdx = 145 + Math.min(4, Math.floor(descU * 5));
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

    for (let i = this.prismSeals.length - 1; i >= 0; i--) {
      this.prismSeals[i].age += dt;
      if (this.prismSeals[i].age >= this.prismSeals[i].maxLife) {
        this.prismSeals.splice(i, 1);
      }
    }

    this._exParticles?.emitAmbient(dt, this);
    this._exParticles?.update(dt);
  }

  update(dt, enemy, game) {
    this._currentEnemy = enemy;
    this.haloPhase += dt * 2.8;
    this.wallWingCooldown = Math.max(0, this.wallWingCooldown - dt);
    this.crouchCooldown = Math.max(0, this.crouchCooldown - dt);
    this.updateCustomVfx(dt);

    if (this.state === 'WALK' || this.state === 'IDLE') {
      this._overrideFrameIdx = null;
      this.trueUltFrameOverride = null;
    }

    if (this.fx) {
      this.fx.update(dt);
    }

    if (!this.isDead && this.state === 'WALK') {
      this.stepDustTimer += dt;
      if (this.stepDustTimer >= 0.30) {
        this.stepDustTimer = 0;
        this.spawnExParticle({
          x: this.x - this.facing * 12,
          y: this.groundY - 4,
          vx: -this.facing * 20,
          vy: -24,
          gravity: -14,
          shape: 'star4',
          size: 3,
          color: '#fde047',
          coreColor: '#ffffff',
          maxLife: 0.24,
          layer: 'back'
        });
      }
    }

    const inMidCombo = (this._aiComboCount || 0) > 0 && (this._aiComboChainTimer || 0) > 0;
    if (
      !this.isBenched &&
      !this.isPlayerControlled &&
      !inMidCombo &&
      enemy &&
      !enemy.isDead &&
      (this.state === 'IDLE' || this.state === 'WALK') &&
      (this.finisherGauge || 0) < (this.maxFinisherGauge || 100)
    ) {
      if (!this._isRangedOpponent?.(enemy) && this.crouchCooldown <= 0 && game?.vfx?.projectiles) {
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
        img._origSrc = src;
        img.src = src;
        return img;
      };
      assets.priestess_ex = {
        sheet: mkImg('assets/sprites/priestess_ex_sheet.png?v=30fps185'),
        vfx: mkImg('assets/sprites/priestess_ex_vfx.png?v=30fps185'),
        wings: assets.priestess?.wings || mkImg('assets/sprites/seraphim_wings.png?v=30fps185'),
        portrait: mkImg('assets/sprites/priestess_ex_portrait.png?v=30fps185'),
        cellW: 320,
        cellH: 240,
        anchorX: 112,
        anchorY: 230
      };
    } else {
      PixelForge.ensureHeroLoaded?.('priestess_ex');
      if (!assets.priestess_ex.wings && assets.priestess?.wings) {
        assets.priestess_ex.wings = assets.priestess.wings;
      }
    }
    return assets.priestess_ex;
  }

  // ============================================================================
  // NEXT-GEN HD-2D BLOOMED PIXEL VFX, CATHEDRAL ROSE WINDOWS & FLOOR REFLECTIONS
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
    glowCol = '#fde047',
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

  drawSanctuaryPrismCrests(ctx, renderer = null) {
    if (!this.prismSeals.length) return;
    const sprites = this.getExSprites();
    const vfxSheet = PixelForge.ensureImage(sprites?.vfx);
    const baseCol = Math.floor(this.haloPhase * 10.5) % 30;

    for (let i = 0; i < this.prismSeals.length; i++) {
      const s = this.prismSeals[i];
      const u = Math.min(1, s.age / Math.max(0.01, s.maxLife));
      const fade = Math.sin(u * Math.PI);
      if (fade <= 0.02) continue;
      const w = Math.round(s.radius * 2.35 * (0.76 + 0.28 * u));
      const h = Math.max(24, Math.round(w * 0.30));
      const cx = Math.round(s.x);
      const cy = Math.round(s.groundY - 4);
      drawExBayerHalo(ctx, cx, cy, Math.min(76, w * 0.42), Math.min(26, h * 0.55), '#fb7185', '#fde047', 0.16 * fade);
      if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
        const col = (baseCol + i * 6) % 30;
        this._drawBloomedVfxCell(
          ctx,
          renderer,
          vfxSheet,
          col,
          4,
          Math.round(cx - w * 0.5),
          Math.round(cy - h * 0.5),
          w,
          h,
          '#fde047',
          0.90 * fade,
          false
        );
      }
    }
  }

  drawCathedralOrganSanctuary(ctx, renderer = null) {
    const o = this._organVisual;
    if (!o || !o.active) return;
    const u = Math.min(1, o.age / Math.max(0.01, o.maxLife));
    const fade = u < 0.14 ? u / 0.14 : u > 0.82 ? (1 - u) / 0.18 : 1.0;
    if (fade <= 0.02) return;

    const sprites = this.getExSprites();
    const vfxSheet = PixelForge.ensureImage(sprites?.vfx);
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;

    const cx = Math.round(o.centerX);
    const gy = Math.round(o.groundY);
    const baseCol = Math.floor(o.age * 30) % 30;

    // Descending Golden-Ivory Cathedral Rose-Window Crest above the 5-Pillar Organ
    const haloY = Math.round(gy - 335 + Math.min(1, u * 1.25) * 118);
    const crestSize = Math.round(236 * (0.86 + 0.14 * fade));
    drawExBayerHalo(ctx, cx, haloY, 84, 36, '#fde047', '#ffffff', 0.18 * fade);
    this._drawBloomedVfxCell(
      ctx,
      renderer,
      vfxSheet,
      baseCol,
      3,
      Math.round(cx - crestSize * 0.5),
      Math.round(haloY - crestSize * 0.5),
      crestSize,
      crestSize,
      '#fde047',
      0.92 * fade,
      false
    );

    // 5 Graduated Luminous Cathedral Organ-of-Light Columns (`priestess_ex_vfx.png` Row 2, 0 fillRect slabs!)
    const pipeSpecs = [
      { off: -160, w: 148, h: 248, glow: '#38bdf8', colShift: 0 },
      { off: -80, w: 176, h: 318, glow: '#fb7185', colShift: 6 },
      { off: 0, w: 224, h: 396, glow: '#fde047', colShift: 12 },
      { off: 80, w: 176, h: 318, glow: '#fb7185', colShift: 18 },
      { off: 160, w: 148, h: 248, glow: '#38bdf8', colShift: 24 }
    ];
    for (let i = 0; i < pipeSpecs.length; i++) {
      const p = pipeSpecs[i];
      const px = cx + p.off;
      const grow = Math.min(1, u * 2.3);
      const pw = Math.round(p.w * (0.82 + 0.18 * fade));
      const ph = Math.max(48, Math.round(p.h * grow));
      const pCol = (baseCol + p.colShift) % 30;
      this._drawBloomedVfxCell(
        ctx,
        renderer,
        vfxSheet,
        pCol,
        2,
        Math.round(px - pw * 0.5),
        Math.round(gy - ph + 16),
        pw,
        ph,
        p.glow,
        0.92 * fade,
        false
      );
    }
  }

  drawSeraphimVFX(ctx, sprites, isReflection, renderer = null) {
    if (this.state === 'AUTO_ATTACK') return;
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
      const dur = this.ultDuration || 1.62;
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
    const cx = -6;
    const cy = -124;
    const vfxSheet = PixelForge.ensureImage(sprites?.vfx);

    if (!isReflection) {
      drawExBayerHalo(ctx, cx, cy, 78 * env, 48 * env, '#fde047', '#ffffff', 0.18 * env);
    }

    const col = Math.floor(this.stateTimer * 30) % 30;
    if (
      (this.state === 'ULTIMATE' || this.state === 'TRUE_ULTIMATE') &&
      vfxSheet &&
      vfxSheet.complete &&
      vfxSheet.naturalWidth > 0
    ) {
      const baseHalo = this.state === 'TRUE_ULTIMATE' ? 268 : 248;
      const haloSize = Math.round(baseHalo * (0.86 + 0.14 * env));
      const gateBob = Math.round(Math.sin(this.haloPhase * 2.4) * 4);
      this._drawBloomedVfxCell(
        ctx,
        renderer,
        vfxSheet,
        col,
        3,
        Math.round(cx - haloSize * 0.5),
        Math.round(cy + gateBob - haloSize * 0.5),
        haloSize,
        haloSize,
        '#fde047',
        env * (isReflection ? 0.34 : 0.94),
        isReflection
      );
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

      if (isReflection) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(1, 0.24 * env);
        ctx.drawImage(wingSheet, wingFrame * cellW, 0, cellW, cellH, dx, dy, drawW, drawH);
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = Math.min(1, 0.98 * env);
        ctx.drawImage(wingSheet, wingFrame * cellW, 0, cellW, cellH, dx, dy, drawW, drawH);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(1, 0.24 * env);
        ctx.drawImage(wingSheet, wingFrame * cellW, 0, cellW, cellH, dx, dy, drawW, drawH);
      }
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

      drawExBayerHalo(ctx, px, py, halfW * 0.82, halfH * 0.82, '#fde047', '#ffffff', 0.14 * fade);
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
        v.row === 3 ? '#fb7185' : '#fde047',
        Math.min(1, 0.34 + fade * 0.66),
        false
      );
      ctx.restore();
    }
    ctx.restore();
  }

  drawForegroundOverlay(ctx, renderer = null) {
    const arenaCenterX = this._resolveShaderCenterX(renderer);

    if (!this.isDead) {
      drawExBayerHalo(ctx, Math.round(this.x), Math.round(this.groundY - 4), 48, 14, '#fde047', '#ffffff', 0.15);
    }

    // Stained-Glass Cathedral Rose-Window Celestial Dome during `FINAL GRACE: GENESIS LUMEN` charge
    if (this.state === 'TRUE_ULTIMATE' && !this.finalGraceDidFire) {
      const chargeP = Math.max(0, Math.min(1, this.finalGraceChargeProgress || this.stateTimer / 3.03));
      const focusX = Math.round(this.x);
      const focusY = Math.round(this.y - 104);
      const sprites = this.getExSprites();
      const vfxSheet = PixelForge.ensureImage(sprites?.vfx);
      const baseCol = Math.floor(this.stateTimer * 30) % 30;
      const domeSize = Math.round(280 + chargeP * 140);

      drawExBayerHalo(ctx, focusX, Math.round(this.groundY - 6), 88, 24, '#fb7185', '#fde047', 0.18);
      if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
        this._drawBloomedVfxCell(
          ctx,
          renderer,
          vfxSheet,
          baseCol,
          4,
          Math.round(focusX - domeSize * 0.5),
          Math.round(focusY - domeSize * 0.5),
          domeSize,
          domeSize,
          '#fde047',
          0.42 + 0.36 * chargeP,
          false
        );
      }
    }

    this.drawSanctuaryPrismCrests(ctx, renderer);
    this._exParticles?.renderBack(ctx);

    if (this.fx && !this.isDead) {
      this.fx.renderLayer(ctx, 'back', arenaCenterX, this.groundY, 0.96);
    }
    this.drawPriestessExVfxAnims(ctx, false, renderer);

    const sprites = this.getExSprites();
    const sheet = PixelForge.ensureImage(sprites?.sheet);
    if (this.afterimages.length > 0 && sheet && sheet.complete && sheet.naturalWidth) {
      for (let i = 0; i < this.afterimages.length; i++) {
        const img = this.afterimages[i];
        const alpha = Math.max(0, (1 - img.life / img.maxLife) * 0.52);
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
    const arenaCenterX = this._resolveShaderCenterX(renderer);

    if (this.fx && !this.isDead) {
      this.fx.renderLayer(ctx, 'front', arenaCenterX, this.groundY, 0.98);
    }
    this.drawCathedralOrganSanctuary(ctx, renderer);
    this.drawPriestessExVfxAnims(ctx, true, renderer);
    this._exParticles?.renderFront(ctx);

    if (this.state !== 'TRUE_ULTIMATE') return;

    const sprites = this.getExSprites();
    const vfxSheet = PixelForge.ensureImage(sprites?.vfx);
    const muzzleX = Math.round(this.finalGraceMuzzleX || this.x + this.facing * 56);
    const beamY = Math.round(this.finalGraceBeamY || this.y - 104);

    if (!this.finalGraceDidFire) {
      const chargeP = Math.max(0, Math.min(1, this.finalGraceChargeProgress || this.stateTimer / 3.03));
      drawExBayerHalo(ctx, muzzleX, beamY, 68 + chargeP * 56, 68 + chargeP * 56, '#fde047', '#ffffff', 0.20);

      if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth > 0) {
        const col = Math.floor(this.stateTimer * 30) % 30;
        const orbSize = Math.round(208 * (0.66 + 0.68 * chargeP));
        const halfOrb = Math.round(orbSize * 0.5);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(muzzleX, beamY);
        ctx.scale(this.facing, 1);
        this._drawBloomedVfxCell(
          ctx,
          renderer,
          vfxSheet,
          col,
          5,
          -halfOrb,
          -halfOrb,
          orbSize,
          orbSize,
          '#fde047',
          Math.min(1, 0.88 + chargeP * 0.12),
          false
        );
        // Subtle pulsing animated prism aim-orbs ahead of the scepter (0 fillRect bars!)
        for (let k = 1; k <= 5; k++) {
          const aimCol = (col + k * 5) % 30;
          const aimSz = Math.round(48 + chargeP * 24);
          this._drawBloomedVfxCell(
            ctx,
            renderer,
            vfxSheet,
            aimCol,
            0,
            k * 168 - Math.round(aimSz * 0.5),
            -Math.round(aimSz * 0.5),
            aimSz,
            aimSz,
            k % 2 === 0 ? '#fb7185' : '#fde047',
            (0.24 + 0.48 * chargeP) * (1 - k * 0.10),
            false
          );
        }
        ctx.restore();
      }
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

      const baseCol = Math.floor(beamT * 30) % 30;
      const beamH = Math.max(48, Math.round(212 * (0.98 + 0.18 * env)));
      const halfH = Math.round(beamH * 0.5);

      drawExBayerHalo(ctx, muzzleX, beamY, 108 * env, 96 * env, '#fde047', '#ffffff', 0.20 * env);

      if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth > 0) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(muzzleX, beamY);
        ctx.scale(this.facing, 1);

        // Overlapping 30fps spindle-tapered Row 7 segments weld into a continuous blazing Cathedral Judgment Beam!
        const segW = 208;
        const stepX = 112;
        for (let seg = 0; seg < 13; seg++) {
          const segCol = (baseCol + seg * 2) % 30;
          const segLeftX = 52 + seg * stepX;
          this._drawBloomedVfxCell(
            ctx,
            renderer,
            vfxSheet,
            segCol,
            7,
            segLeftX,
            -halfH,
            segW,
            beamH,
            seg % 2 === 0 ? '#fde047' : '#fb7185',
            0.94 * env,
            false
          );
        }

        // Row 6 Prismatic Scepter Muzzle + Row 3 Cathedral Rose-Window Crest at muzzle origin
        const muzzleSize = Math.round(224 * (0.94 + 0.12 * env));
        this._drawBloomedVfxCell(
          ctx,
          renderer,
          vfxSheet,
          baseCol,
          3,
          -Math.round(muzzleSize * 0.5),
          -Math.round(muzzleSize * 0.5),
          muzzleSize,
          muzzleSize,
          '#fb7185',
          0.78 * env,
          false
        );
        this._drawBloomedVfxCell(
          ctx,
          renderer,
          vfxSheet,
          baseCol,
          6,
          -104,
          -halfH,
          208,
          beamH,
          '#fde047',
          env,
          false
        );

        ctx.restore();
      }
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

    if (isReflection && !this.isDead) {
      this.drawSeraphimVFX(ctx, sprites, true, renderer);
      const vfxSheet = PixelForge.ensureImage(sprites?.vfx);
      if (
        vfxSheet &&
        vfxSheet.complete &&
        vfxSheet.naturalWidth &&
        (this.state === 'SKILL' || this.state === 'ULTIMATE' || this.state === 'TRUE_ULTIMATE')
      ) {
        const col = Math.floor(this.haloPhase * 10.5) % 30;
        this._drawBloomedVfxCell(ctx, renderer, vfxSheet, col, 4, -84, -44, 168, 56, '#fde047', 0.55, true);
      }
    }

    PixelForge.drawSheetFrame(ctx, sprites, this, w, h, this.haloPhase, isReflection, renderer);

    ctx.restore();
  }
}
