import { Fighter } from './Fighter.js?v=30fps127';
import { PixelForge } from '../engine/PixelForge.js?v=30fps127';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps127';
import { NEBULA_EFFECT_REGISTRY } from '../engine/shaders/nebulaShaders.js?v=30fps127';
import { ExParticleSystem, drawExBayerHalo } from '../engine/shaders/exNextGenFX.js?v=30fps127';

const AUTO_SLICES_EX = [
  [60, 8], // Beat 1 (V0, 0.34s): Forward lunge + finger-tap -> Twin Star-Packet Bolts (snaps F03/63)
  [68, 7], // Beat 2 (V1, 0.32s): Baggy sleeve swipe -> Spinning Holo-Window Projectile (snaps F09/69)
  [75, 8], // Beat 3 (V2, 0.38s): Pose-B knee-tuck hop + paw boop -> Remote 404 Pop-Up & Nebula Plasma (snaps F17/77)
  [83, 7]  // Beat 4 (V3, 0.48s): -42px aerial backstep kite + [ENTER] slam -> Neko-AI Orb Nebula Laser (snaps F25/85)
];

const BEAT_DURATIONS = [0.34, 0.32, 0.38, 0.48];
const INTRA_COMBO_LINK = 0.015;

/**
 * Nyx EX (`nyx_ex`) — Next-Gen Cosmic Nebula AI Assistant Created by Cob.
 * Pure Ranged Holographic UI Caster & Agile Kiter (`320x240`, `anchorX=112, anchorY=230`,
 * `516px` range, autonomous 2.5D Neko-AI Orb, Auto-Patch Holo-Shield, Ctrl+Z Glitch Blink,
 * & Fourth-Wall `cob_monitor` Creator Stage Transformation with live "Cob Helping Nyx" Assist).
 */
export class NyxEx extends Fighter {
  constructor(x, groundY, facing = 1) {
    const opts = typeof x === 'object' && x !== null ? x : { x, groundY, facing };
    super({
      ...opts,
      name: opts.name || 'Nyx EX',
      maxHp: 3740,
      attackRange: 516,
      moveSpeed: 170,
      autoInterval: 1.00,
      lightColor: 'rgba(192, 132, 252, 1)',
      primaryColor: '#c084fc',
      secondaryColor: '#22d3ee',
      hasTrueUltimate: true,
      trueUltName: 'GENESIS PROMPT: POWERED BY COB',
      trueUltDuration: 4.10
    });

    this.heroId = 'nyx_ex';
    this.theme = 'nebula';
    this.deathSfx = 'death_mage';
    this.hasPoise = true;

    this.autoDuration = BEAT_DURATIONS[0];
    this._postFlurryInterval = 1.42;

    this.skillName = '404 POP-UP CASCADE';
    this.skillMaxCooldown = 4.40;
    this.skillCooldown = 1.10;
    this.skillDuration = 1.02;
    this.skillTriggerRange = 516;

    this.ultName = 'COB-OS: STARLIGHT OVERCLOCK';
    this.ultSub = 'SIX-WINDOW ORBITAL RING & NEBULA ORGAN';
    this.ultDuration = 1.76;

    this.trueUltName = 'GENESIS PROMPT: POWERED BY COB';
    this.trueUltSub = 'FOURTH WALL MONITOR - CREATOR LINK';
    this.trueUltDuration = 4.10;

    // Passive, Autonomous Neko-AI Orb & Fourth-Wall Creator Link State
    this.haloPhase = 0;
    this.contextTokens = 0;
    this.holoPatchShield = 0;
    this.holoPatchTimer = 0;
    this._ctrlZCd = 0;
    this.dodgeMaxCooldown = 3.30;
    this.dashMaxCooldown = 3.15;
    this.crouchCooldown = 0;
    this.crouchDuration = 0.88;
    this.isCrouching = false;
    this.isDeflecting = false;
    this.isBlinkTeleport = false;
    this.isFlipVault = false;

    this.nekoOrb = {
      x: this.x - this.facing * 30,
      y: this.groundY - 110,
      scale: 1.0,
      inFront: true,
      eyeMode: 'happy',
      moteAcc: 0
    };

    // 4-Beat Combo State
    this.comboStep = 0;
    this._autoVariant = 0;
    this._comboPersistTimer = 0;
    this._queuedNextBeat = false;
    this._intraLinkTimer = 0;
    this._beatHitMask = 0;
    this._beatStartX = this.x;
    this._beatTargetX = this.x;
    this._bootsPlanted = false;
    this._v2RemoteX = this.x + 320;
    this._v3RemoteX = this.x + 340;
    this._beat4Laser = null;

    // Skill / Overdrive / Supreme True Ult & Creator Assist State
    this._skillPhase = 0;
    this._skillTargetX = this.x + 320;
    this._ultNodesActive = false;
    this._ultTargetX = this.x + 320;
    this._ultStep = 0;
    this._overclockVisual = { active: false, centerX: 0, groundY: 560, age: 0, maxLife: 1.76 };
    this._trueUltStep = 0;
    this._trueUltTargetX = this.x + 360;
    this._supernovaFired = false;
    this._supernovaBeamTimer = 0;
    this._supernovaTargetX = this.x + 360;
    this._supernovaMuzzleX = this.x + 48;
    this._supernovaBeamY = this.y - 108;
    this._trueUltStarfield = [];
    this._trueUltStarInit = false;

    this._cobCreatorLinkActive = false;
    this._cobAssistCd = 0;
    this._cobUplinkVisualTimer = 0;
    this._cobUplinkMaxTimer = 0.90;
    this._cobUplinkTargetX = this.x + 320;

    this._overrideFrameIdx = null;
    this.afterimages = [];
    this.afterimageAccum = 0;
    this.activeVfxAnims = [];
    this.nebulaFloorSeals = [];
    this.afkDecoys = [];
    this._exParticles = new ExParticleSystem('nyx_ex', '#c084fc');

    this.fx = new ArcaneShaderFX(NEBULA_EFFECT_REGISTRY, {
      pixelScale: 2,
      viewW: 736,
      viewH: 464
    });

    if (typeof Image !== 'undefined') {
      PixelForge.ensureHeroLoaded?.('nyx_ex');
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
      sweetMin: 315,
      sweetMax: 440,
      counterCrouchBias: 0.52,
      midLeapMin: 0,
      midLeapMax: 0,
      midLeapChance: 0,
      postStyle: 'nebula_ai'
    };
  }

  getExSprites() {
    const assets = PixelForge.initAssets();
    if (!assets) return null;
    if (!assets.nyx_ex) {
      const mkImg = (src) => {
        if (typeof Image === 'undefined') return { complete: false, naturalWidth: 0, width: 0, src };
        const im = new Image();
        im.src = src;
        return im;
      };
      assets.nyx_ex = {
        sheet: mkImg('assets/sprites/nyx_ex_sheet.png?v=30fps127'),
        vfx: mkImg('assets/sprites/nyx_ex_vfx.png?v=30fps127'),
        portrait: mkImg('assets/sprites/nyx_ex_portrait.png?v=30fps127')
      };
    } else if (typeof Image !== 'undefined') {
      PixelForge.ensureHeroLoaded?.('nyx_ex');
    }
    return assets.nyx_ex;
  }

  _clampArenaX(xv, game) {
    const bounds =
      game?.adventure?.isActive && game.adventure.getActiveStageBounds
        ? game.adventure.getActiveStageBounds()
        : null;
    const minX = bounds
      ? bounds.minX
      : game?.adventure?.lockActive && Number.isFinite(game.adventure.lockMinX)
        ? game.adventure.lockMinX
        : 84;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const rawMaxX = bounds
      ? bounds.maxX
      : game?.adventure?.lockActive && Number.isFinite(game.adventure.lockMaxX)
        ? game.adventure.lockMaxX
        : ww - 84;
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

  _spawnProj(game, proj) {
    if (game?.vfx?.spawnProjectile) {
      game.vfx.spawnProjectile(proj);
    } else if (game?.spawnProjectile) {
      game.spawnProjectile(proj);
    }
  }

  spawnNebulaFloorSeal(x, groundY = this.groundY, radius = 92, maxLife = 0.65) {
    if (this.nebulaFloorSeals.length >= 10) this.nebulaFloorSeals.shift();
    this.nebulaFloorSeals.push({ x, groundY, radius, age: 0, maxLife });
  }

  takeDamage(amount, attacker, isCrit = false, knockX = 0, knockY = 0) {
    if (this.isInvulnerable || this.state === 'TRUE_ULTIMATE') {
      return 0;
    }
    const preHp = this.hp;
    let finalAmt = Math.max(0, Math.round(amount || 0));
    if (this.holoPatchTimer > 0 && this.holoPatchShield > 0 && finalAmt > 0) {
      const absorbed = Math.min(this.holoPatchShield, finalAmt);
      this.holoPatchShield -= absorbed;
      finalAmt -= absorbed;
      this.spawnHitStarburst(this.x, this.y - 88, '#22d3ee', '#c084fc', 0.9);
      if (this.holoPatchShield <= 0) this.holoPatchTimer = 0;
      if (finalAmt <= 0) {
        this.game?.vfx?.spawnDamageText?.(this.x, this.y - 134, 0, false, 'AUTO-PATCH!', '#a5f3fc');
        return 0;
      }
    }
    super.takeDamage(finalAmt, attacker, isCrit, knockX, knockY);
    const dealt = Math.max(0, preHp - this.hp);
    if (
      dealt > 0 &&
      !this.isDead &&
      !this._advPureDodge &&
      this._ctrlZCd <= 0 &&
      attacker &&
      Math.abs(attacker.x - this.x) < 165 &&
      this.state !== 'SKILL' &&
      this.state !== 'DEATH'
    ) {
      this._triggerCtrlZGlitchBlink(attacker, this.game);
    }
    return dealt;
  }

  _triggerCtrlZGlitchBlink(enemy, game) {
    if (this._advPureDodge || this.isDead) return false;
    this._ctrlZCd = 4.2;
    const oldX = this.x;
    const dirAway = enemy ? (this.x >= enemy.x ? 1 : -1) : -this.facing;
    let targetX = this._clampArenaX(oldX + dirAway * 210, game);
    if (Math.abs(targetX - oldX) < 110) {
      targetX = this._clampArenaX(oldX - dirAway * 210, game);
    }

    // Leave behind Row 6 "AFK" Holographic Neko Decoy + glowing floor seal at old position
    this.spawnVfxAnim(6, oldX, this.groundY - 96, 168, 168, 1.15, {
      flipX: this.facing < 0,
      inFront: true
    });
    this.spawnNebulaFloorSeal(oldX, this.groundY, 76, 0.56);
    if (this.afkDecoys.length >= 4) this.afkDecoys.shift();
    this.afkDecoys.push({ x: oldX, y: this.groundY - 96, age: 0, maxLife: 1.15, detonated: false });

    this.x = targetX;
    this.y = this.groundY;
    this.vy = 0;
    if (enemy && !enemy.isDead) {
      this.facing = enemy.x >= this.x ? 1 : -1;
    }
    this.isInvulnerable = true;
    this.spawnAfterimage(oldX, this.groundY, this.facing, 6, 8, 0.28);
    this.fx?.spawn('nebulaPromptBurst', this._safeFxX(oldX, game), this.groundY - 84, { light: 1.16 });
    this.fx?.spawn('nebulaPromptBurst', this._safeFxX(this.x, game), this.groundY - 84, { light: 1.18 });
    this.spawnNebulaCluster(this.x, this.groundY - 84, 9, 145);
    game?.vfx?.spawnDamageText?.(oldX, this.groundY - 138, 0, false, 'CTRL+Z BLINK!', '#22d3ee');
    if (game?.audio) game.audio.play('blink', this.x);
    return true;
  }

  /**
   * "Cob Helping Nyx" Fourth-Wall Creator Assist Intervention (`onDeploy` during Supreme Ult OR
   * ongoing Creator Assist every `3.20s` while `cob_monitor` stage is deployed!).
   */
  _triggerCobCreatorAssist(enemy, game, isDeploy = false) {
    if (this._advPureDodge || this.isDead) return false;
    const rawTarget = enemy && !enemy.isDead ? enemy.x : this.x + this.facing * 350;
    const aimX = this._safeFxX(this._clampArenaX(rawTarget, game), game);
    const dur = isDeploy ? 1.10 : 0.88;
    this._cobUplinkTargetX = aimX;
    this._cobUplinkMaxTimer = dur;
    this._cobUplinkVisualTimer = dur;

    game?.renderer?.triggerCobAssistPulse?.(this.x, aimX, dur);

    // Bestow "Cob" Creator Crest buff onto Nyx EX (`Auto-Patch` + heal!)
    this.spawnVfxAnim(2, this.x, this.y - 156, isDeploy ? 210 : 164, isDeploy ? 210 : 164, 0.62, {
      followOwner: true,
      offsetX: 0,
      offsetY: -156,
      inFront: true,
      vy: 60
    });
    this.spawnNebulaFloorSeal(this.x, this.groundY, isDeploy ? 132 : 94, 0.72);
    this.spawnNebulaCluster(this.x, this.y - 96, isDeploy ? 14 : 8, 155);

    if (isDeploy) {
      this.heal(Math.round(this.maxHp * 0.14), 'COB GENESIS');
      this.holoPatchShield = Math.max(this.holoPatchShield, 180);
      this.holoPatchTimer = Math.max(this.holoPatchTimer, 5.5);
      game?.vfx?.spawnDamageText?.(this.x, this.y - 168, 0, true, 'COB ASSIST: CREATOR LINK!', '#fde047');

      // Twin flanking Creator Command Pillar Strikes framing targetX!
      for (const off of [-96, 96]) {
        const px = this._safeFxX(this._clampArenaX(aimX + off, game), game);
        this.spawnVfxAnim(2, px, this.groundY - 216, 178, 178, 0.66, { inFront: true, vy: 120 });
        this.spawnVfxAnim(4, px, this.groundY - 134, 196, 268, 0.62, { inFront: true });
        this.spawnNebulaFloorSeal(px, this.groundY, 84, 0.68);
      }
    } else {
      if (game?.audio) game.audio.play('holy_bolt', aimX);
      this.heal(14, 'COB ASSIST');
      this.holoPatchShield = Math.max(this.holoPatchShield, 45);
      this.holoPatchTimer = Math.max(this.holoPatchTimer, 2.8);
      game?.vfx?.spawnDamageText?.(this.x, this.groundY - 152, 0, false, 'COB ASSIST!', '#22d3ee');

      // Fourth-Wall Creator Sky-Strike dropping onto `aimX` from beyond the monitor!
      this.spawnNebulaFloorSeal(aimX, this.groundY, 96, 0.60);
      this.spawnVfxAnim(2, aimX, this.groundY - 224, 180, 180, 0.54, { inFront: true, vy: 195 });
      this.spawnVfxAnim(4, aimX, this.groundY - 128, 184, 248, 0.50, { inFront: true });
      this.fx?.spawn('cobCreatorCrestSeal', aimX, this.groundY, { light: 1.24 });
      this._applyRemoteNebulaStrike(aimX, 118, 34, game, enemy, {
        isCrit: false,
        knockX: 28,
        knockY: -36,
        hitStop: 0.028
      });
    }
    return true;
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

    if (newState === 'WALK' || newState === 'IDLE') {
      this._overrideFrameIdx = null;
      this.trueUltFrameOverride = null;
    }

    if (newState === 'AUTO_ATTACK') {
      if (this._comboPersistTimer <= 0 && prevState !== 'AUTO_ATTACK') {
        this.comboStep = 0;
      }
      this.y = this.groundY;
      this.vy = 0;
      this._beginComboBeat(this.comboStep % 4, this.game);
    } else if (newState !== 'ULTIMATE' && newState !== 'TRUE_ULTIMATE') {
      this._overrideFrameIdx = null;
      this.trueUltFrameOverride = null;
    }

    if (newState === 'SKILL') {
      this._skillPhase = 0;
      this.y = this.groundY;
      this.vy = 0;
    }

    if (newState === 'ULTIMATE') {
      this._ultStep = 0;
      this._ultNodesActive = false;
      this.isInvulnerable = true;
      if (this._overclockVisual) this._overclockVisual.active = false;
    } else {
      this._ultNodesActive = false;
      if (this._overclockVisual) this._overclockVisual.active = false;
    }

    if (newState === 'TRUE_ULTIMATE') {
      this.isInvulnerable = true;
      this.unstoppablePoise = true;
      this.hurtTimer = 0;
      this.isCrouching = false;
      this.isDeflecting = false;
      this._trueUltStep = 0;
      this._supernovaFired = false;
      this._supernovaBeamTimer = 0;
      if (typeof Image !== 'undefined' || PixelForge.assets) {
        PixelForge.ensureStageLoaded?.('cob_monitor');
      }
    } else {
      this._supernovaFired = false;
      this._supernovaBeamTimer = 0;
      this._trueUltStep = 0;
      if (newState !== 'AUTO_ATTACK') {
        this.unstoppablePoise = false;
      }
    }

    if (newState === 'DEATH') {
      this.fx?.clear();
      this._exParticles?.clear();
      this._beat4Laser = null;
      this._supernovaBeamTimer = 0;
      this._cobCreatorLinkActive = false;
      this._cobUplinkVisualTimer = 0;
      if (this._overclockVisual) this._overclockVisual.active = false;
      this.nebulaFloorSeals.length = 0;
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
    } else if (
      newState === 'SKILL' ||
      newState === 'ULTIMATE' ||
      newState === 'TRUE_ULTIMATE' ||
      newState === 'DASH' ||
      newState === 'DODGE'
    ) {
      this._exParticles?.emitStateFlourish(this, newState);
    }
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
    this._comboPersistTimer = 0.80;
    this.unstoppablePoise = v >= 2;
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
    let stepDelta = v === 3 ? -42 : v === 0 ? 14 : v === 1 ? 16 : 12;
    if (enemy && !enemy.isDead) {
      const horizDist = Math.abs(enemy.x - this.x);
      if (v === 3) stepDelta = -42;
      else if (horizDist < 220) stepDelta = -28;
    }
    this._beatTargetX = this._clampArenaX(this.x + this.facing * stepDelta, game);
  }

  queueNextComboBeat() {
    this._queuedNextBeat = true;
  }

  spawnExParticle(opts) {
    if (!opts || !Number.isFinite(opts.x) || !Number.isFinite(opts.y)) return;
    if (opts.shape === 'ring') {
      this._exParticles?.spawnRing(
        opts.x,
        opts.y,
        opts.size || 48,
        opts.color || '#c084fc',
        opts.coreColor || '#22d3ee',
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
      gravity: opts.gravity ?? -18,
      swayAmp: 8,
      swayFreq: 4.5,
      size: opts.size || 3,
      color: opts.color || '#c084fc',
      accent: '#22d3ee',
      core: opts.coreColor || '#ffffff',
      maxLife: opts.maxLife || 0.36,
      layer: opts.layer || 'front'
    });
  }

  spawnNebulaCluster(x, y, count = 6, speed = 135) {
    this._exParticles?.burst(x, y, {
      count,
      shapes: ['star4', 'diamond', 'rune'],
      speedMin: Math.max(36, speed * 0.4),
      speedMax: speed,
      upBias: 32,
      color: '#c084fc',
      accent: '#22d3ee',
      core: '#ffffff',
      layer: 'front'
    });
  }

  spawnHitStarburst(x, y, primaryHex = '#c084fc', accentHex = '#22d3ee', _scale = 1.0) {
    this._exParticles?.spawnHitStarburst(Math.round(x), Math.round(y), primaryHex, accentHex, 0.18);
  }

  spawnAfterimage(x, y, facing, row = 2, col = 4, maxLife = 0.24) {
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

  spawnVfxAnim(row, x, y, w = 180, h = 180, maxLife = 0.32, opts = {}) {
    if (this.activeVfxAnims.length >= 28) this.activeVfxAnims.shift();
    this.activeVfxAnims.push({
      row,
      x,
      y,
      w,
      h,
      baseW: w,
      baseH: h,
      age: 0,
      maxLife,
      vx: opts.vx || 0,
      vy: opts.vy || 0,
      flipX: opts.flipX !== undefined ? Boolean(opts.flipX) : false,
      followOwner: Boolean(opts.followOwner),
      offsetX: opts.offsetX || 0,
      offsetY: opts.offsetY || 0,
      inFront: opts.inFront !== undefined ? Boolean(opts.inFront) : true,
      startFrame: opts.startFrame ?? 0,
      endFrame: opts.endFrame ?? 29,
      orbitCenterX: opts.orbitCenterX ?? null,
      orbitIdx: opts.orbitIdx ?? null,
      orbitTotal: opts.orbitTotal ?? 6,
      orbitRx: opts.orbitRx ?? 150,
      orbitRy: opts.orbitRy ?? 58
    });
  }

  _resolveRangedTarget(primaryEnemy, game, maxDist = 640) {
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

  _applyRemoteNebulaStrike(centerX, radius, damage, game, primaryEnemy, opts = {}) {
    const {
      isCrit = false,
      knockX = 24,
      knockY = -30,
      hitStop = 0.036,
      shakeDur = 0.048
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
      this.spawnHitStarburst(foe.x, hitY, '#22d3ee', '#d946ef', isCrit ? 1.2 : 1.0);
      this.spawnNebulaCluster(foe.x, hitY, isCrit ? 7 : 5, 130);
      landed = true;
    }
    if (landed && hitStop > 0) {
      this._hitStopTimer = Math.max(this._hitStopTimer || 0, Math.min(0.036, hitStop));
    }
    return landed;
  }

  onProjectileTrail(p) {
    if (!p || p.type !== 'nebula_packet') return;
    p.ringTimer = (p.ringTimer || 0) + 0.016;
    if (p.ringTimer >= 0.044) {
      p.ringTimer = 0;
      this.spawnExParticle({
        x: p.x - Math.sign(p.vx || 1) * 12,
        y: p.y + (((p.age * 60) | 0) % 2 === 0 ? -4 : 4),
        vx: -Math.sign(p.vx || 1) * 36,
        vy: -16,
        shape: ((p.age * 30) | 0) % 2 === 0 ? 'star4' : 'diamond',
        size: 3.8,
        color: '#22d3ee',
        coreColor: '#ffffff',
        maxLife: 0.24
      });
    }
  }

  onProjectileHit(p, _hitTarget, isCrit, game) {
    this.fx?.spawn('nebulaPromptBurst', this._safeFxX(p.x, game), p.y, {
      light: isCrit ? 1.26 : 1.15
    });
    this.spawnHitStarburst(p.x, p.y, '#c084fc', '#22d3ee', isCrit ? 1.2 : 1.0);
    this.spawnNebulaCluster(p.x, p.y, isCrit ? 8 : 6, 150);
    if (game?.vfx && isCrit) {
      game.vfx.spawnGlyphBurst(p.x, p.y, 4, 'nebula');
    }
    return true;
  }

  onStartDash(_enemy, game, dir) {
    this.dashDuration = 0.34;
    this.dashDir = dir || this.facing;
    this.isBlinkTeleport = false;
    this.isFlipVault = false;
    if (game?.audio) game.audio.play('dash_whoosh', this.x);
    this.spawnNebulaCluster(this.x, this.y - 84, 7, 130);
    this.spawnNebulaFloorSeal(this.x, this.groundY, 68, 0.42);
  }

  updateDash(dt, enemy) {
    const t = this.stateTimer;
    const dur = this.dashDuration || 0.34;
    const dir = this.dashDir || this.facing;
    this.vy = 0;
    this.y = this.groundY;
    if (t < dur * 0.78) {
      const distToEnemy = enemy && !enemy.isDead ? (enemy.x - this.x) * dir : 999;
      this.vx = distToEnemy <= 340 && distToEnemy >= 0 ? 0 : dir * 480;
      this.afterimageAccum += dt;
      if (this.afterimageAccum >= 0.05) {
        this.afterimageAccum = 0;
        this.spawnAfterimage(this.x, this.y, this.facing, 6, Math.min(28, Math.floor((t / dur) * 30)), 0.18);
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
    this.dodgeCooldown = this.dodgeMaxCooldown * 0.92;
    this.setState('JUMP');
    this.isInvulnerable = true;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    let dir = customDir !== null ? customDir : -this.facing;
    if (this.x < 185) dir = 1;
    else if (this.x > ww - 185) dir = -1;
    this.dashStartX = this.x;
    this.dashTargetX = this._clampArenaX(this.x + dir * 240, game);
    this.dashDuration = 0.54;
    this.didActionFrame = false;
    this.vx = 0;
    this.vy = 0;
    if (game?.audio) game.audio.play('dash_whoosh', this.x);
    this.spawnNebulaCluster(this.x, this.groundY - 82, 7, 130);
    if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 220 && !this._advPureDodge && this._ctrlZCd <= 0) {
      this._triggerCtrlZGlitchBlink(enemy, game);
      this.setState('IDLE');
    }
  }

  onStartDodge(_enemy, game, dir) {
    if (this._advPureDodge) return;
    this.isInvulnerable = true;
    this.dashStartX = this.x;
    const stepDir = dir || -this.facing;
    this.dashTargetX = this._clampArenaX(this.x + stepDir * 220, game);
    this.dashDuration = 0.44;
    this.didActionFrame = false;
  }

  updateJump(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.dashDuration || 0.54;
    const u = Math.min(1, Math.max(0, t / dur));
    if (this._advPureDodge) {
      this.y = this.groundY - Math.sin(u * Math.PI) * 34;
      if (u >= 1) {
        this.y = this.groundY;
        this.vx = 0;
        this.vy = 0;
        this.isInvulnerable = false;
        this.setState('IDLE');
      }
      return;
    }
    this.x = (this.dashStartX ?? this.x) + ((this.dashTargetX ?? this.x) - (this.dashStartX ?? this.x)) * (1 - Math.pow(1 - u, 2));
    this.y = this.groundY - Math.sin(u * Math.PI) * 76;
    this.isInvulnerable = u < 0.72;

    this.afterimageAccum += dt;
    if (this.afterimageAccum >= 0.06 && u < 0.85) {
      this.afterimageAccum = 0;
      this.spawnAfterimage(this.x, this.y, this.facing, 8, Math.min(28, Math.floor(u * 30)), 0.18);
    }

    if (!this.didActionFrame && u >= 0.45) {
      this.didActionFrame = true;
      const aimFoe = this._resolveRangedTarget(enemy, game);
      if (aimFoe) this.facing = aimFoe.x >= this.x ? 1 : -1;
      const sx = this.x + this.facing * 42;
      const sy = this.y - 84;
      const dx = aimFoe ? aimFoe.x - sx : this.facing * 420;
      const dy = aimFoe ? aimFoe.y - 90 - sy : 0;
      const len = Math.hypot(dx, dy) || 1;
      this._spawnProj(game, {
        x: sx,
        y: sy,
        vx: (dx / len) * 740,
        vy: (dy / len) * 740,
        radius: 15,
        maxRange: 640,
        color: '#22d3ee',
        coreColor: '#ffffff',
        owner: this,
        damage: 38,
        type: 'nebula_packet',
        isMeteor: false
      });
    }

    if (u >= 1) {
      this.y = this.groundY;
      this.vx = 0;
      this.vy = 0;
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  updateDodge(dt, enemy, game) {
    this.updateJump(dt, enemy, game);
  }

  updateDashOrDodge(dt, enemy, game) {
    if (this._advPureDodge) {
      this.updateJump(dt, enemy, game);
      return;
    }
    if (this.state === 'DASH') this.updateDash(dt, enemy, game);
    else this.updateJump(dt, enemy, game);
  }

  startCrouch(_enemy, game) {
    this.crouchCooldown = 3.6;
    this.crouchDuration = 0.88;
    this.setState('CROUCH');
    this.isCrouching = true;
    this.isDeflecting = true;
    this.vx = 0;
    this.y = this.groundY;
    this.holoPatchShield = Math.max(this.holoPatchShield, 65);
    this.holoPatchTimer = Math.max(this.holoPatchTimer, 2.2);
    this.spawnNebulaFloorSeal(this.x, this.groundY, 82, 0.60);
    this.fx?.spawn('nebulaPromptBurst', this._safeFxX(this.x, game), this.groundY - 76, { light: 1.15 });
    if (game?.audio) game.audio.play('clock_gear', this.x);
  }

  updateCrouch(_dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.crouchDuration || 0.88;
    this.vx = 0;
    this.y = this.groundY;
    this.isCrouching = t < dur * 0.82;
    this.isDeflecting = t < 0.50;

    if (this.isDeflecting && game?.vfx?.projectiles) {
      for (const proj of game.vfx.projectiles) {
        if (
          proj.owner !== this &&
          !proj._reflectedByNyx &&
          Math.abs(proj.x - this.x) < 92 &&
          Math.abs(proj.y - (this.y - 84)) < 92
        ) {
          proj._reflectedByNyx = true;
          proj.owner = this;
          proj.vx = -proj.vx * 1.25;
          proj.color = '#22d3ee';
          proj.coreColor = '#ffffff';
          this.gainMana(12);
          this.gainFinisher(6);
          this.spawnHitStarburst(proj.x, proj.y, '#22d3ee', '#d946ef', 1.1);
        }
      }
    }

    if (t >= 0.42 && !this.didActionFrame) {
      this.didActionFrame = true;
      const aimFoe = this._resolveRangedTarget(enemy, game);
      const sx = this.x + this.facing * 52;
      const sy = this.y - 68;
      const dx = aimFoe ? aimFoe.x - sx : this.facing * 450;
      const dy = aimFoe ? aimFoe.y - 86 - sy : 0;
      const dist = Math.hypot(dx, dy) || 1;
      this._spawnProj(game, {
        x: sx,
        y: sy,
        vx: (dx / dist) * 740,
        vy: (dy / dist) * 740,
        radius: 15,
        maxRange: 640,
        color: '#c084fc',
        coreColor: '#22d3ee',
        owner: this,
        damage: 44,
        type: 'nebula_packet',
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
   * Row 2 `AUTO_ATTACK` (`HOLO-PROMPT QUARTET`, `[[60,8],[68,7],[75,8],[83,7]]`):
   * - Beat 1: Lunge + Finger-tap -> Twin Star-Packet projectiles (`nebula_packet`)
   * - Beat 2: Baggy sleeve swipe -> Spinning Holo-Window projectile (`nebula_packet`) + floor seal
   * - Beat 3: Pose-B 28px knee-tuck hop -> Remote Row 1 `404` Pop-Up + Row 4 Nebula Plasma Burst at `enemy.x`
   * - Beat 4: `-42px` 40px aerial backstep kite + [ENTER] slam -> Blazing Multi-Segment Row 4 Neko-AI Orb Laser!
   */
  updateAutoAttack(dt, enemy, game) {
    this._currentEnemy = enemy;
    this._comboPersistTimer = 0.80;

    if (this._intraLinkTimer > 0) {
      this._intraLinkTimer = Math.max(0, this._intraLinkTimer - dt);
      this.vx = 0;
      this.y = this.groundY;
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
    const snapT = v === 0 ? 0.09 : v === 1 ? 0.07 : v === 2 ? 0.09 : 0.15;

    let localStep = 0;
    if (t < snapT) localStep = Math.min(2, Math.floor((t / snapT) * 2));
    else localStep = 2 + Math.min(sliceLen - 3, Math.floor(((t - snapT) / Math.max(0.05, dur - snapT)) * (sliceLen - 2)));
    const frameIdx = sliceStart + Math.min(sliceLen - 1, Math.max(0, localStep));
    this.trueUltFrameOverride = frameIdx;
    this._overrideFrameIdx = frameIdx;

    this.vx = 0;
    this.vy = 0;
    if (t < snapT) {
      const u = Math.min(1, Math.max(0, t / snapT));
      this.x = this._beatStartX + (this._beatTargetX - this._beatStartX) * (1 - Math.pow(1 - u, 2));
    } else if (!this._bootsPlanted) {
      this._bootsPlanted = true;
      this.x = this._beatTargetX;
      this.vx = 0;
    }

    // Dynamic vertical hops on Beats 3 (Pose-B hop) & 4 (aerial backstep kite), planted cleanly before beat end!
    if (v === 2 && t < 0.28) {
      this.y = this.groundY - Math.round(Math.sin((t / 0.28) * Math.PI) * 28);
    } else if (v === 3 && t < 0.26) {
      this.y = this.groundY - Math.round(Math.sin((t / 0.26) * Math.PI) * 40);
      this.afterimageAccum += dt;
      if (this.afterimageAccum >= 0.05) {
        this.afterimageAccum = 0;
        this.spawnAfterimage(this.x, this.y, this.facing, 2, frameIdx - 60, 0.18);
      }
    } else {
      this.y = this.groundY;
    }

    const spawnX = this.x + this.facing * 58;
    const spawnY = this.y - 96;
    const aimFoe = this._resolveRangedTarget(enemy, game, 640);
    const targetY = aimFoe ? aimFoe.y - (aimFoe.isColossalBoss ? 128 : 94) : spawnY;
    const dx = aimFoe ? aimFoe.x - spawnX : this.facing * 460;
    const dy = targetY - spawnY;
    const dist = Math.hypot(dx, dy) || 1;

    if (v === 0) {
      if ((this._beatHitMask & 1) === 0 && t >= 0.09) {
        this._beatHitMask |= 1;
        this.didActionFrame = true;
        this._hitStopTimer = Math.max(this._hitStopTimer || 0, 0.022);
        this.contextTokens = Math.min(3, this.contextTokens + 1);
        if (game?.audio) game.audio.play('clock_gear', spawnX);
        this.fx?.spawn('nebulaPromptBurst', this._safeFxX(spawnX, game), spawnY, { light: 1.18 });
        this.spawnVfxAnim(0, spawnX, spawnY, 128, 128, 0.24, { inFront: true });
        this._spawnProj(game, {
          x: spawnX,
          y: spawnY - 12,
          vx: (dx / dist) * 745,
          vy: (dy / dist) * 745 - 14,
          radius: 14,
          maxRange: 640,
          color: '#22d3ee',
          coreColor: '#ffffff',
          owner: this,
          damage: 24,
          type: 'nebula_packet',
          isMeteor: false
        });
        this._spawnProj(game, {
          x: spawnX - this.facing * 10,
          y: spawnY + 12,
          vx: (dx / dist) * 745,
          vy: (dy / dist) * 745 + 14,
          radius: 14,
          maxRange: 640,
          color: '#d946ef',
          coreColor: '#a5f3fc',
          owner: this,
          damage: 24,
          type: 'nebula_packet',
          isMeteor: false
        });
      }
    } else if (v === 1) {
      if ((this._beatHitMask & 1) === 0 && t >= 0.07) {
        this._beatHitMask |= 1;
        this.didActionFrame = true;
        this._hitStopTimer = Math.max(this._hitStopTimer || 0, 0.024);
        this.contextTokens = Math.min(3, this.contextTokens + 1);
        if (game?.audio) game.audio.play('skill_cast', spawnX);
        this.spawnNebulaFloorSeal(this.x, this.groundY, 64, 0.36);
        this.fx?.spawn('nebulaPromptBurst', this._safeFxX(spawnX, game), spawnY, { light: 1.22 });
        this._spawnProj(game, {
          x: spawnX,
          y: spawnY,
          vx: (dx / dist) * 760,
          vy: (dy / dist) * 760,
          radius: 18,
          maxRange: 650,
          pierce: true,
          color: '#c084fc',
          coreColor: '#22d3ee',
          owner: this,
          damage: 46,
          type: 'nebula_packet',
          isMeteor: false
        });
      }
    } else if (v === 2) {
      if ((this._beatHitMask & 1) === 0 && t >= 0.09) {
        this._beatHitMask |= 1;
        this.didActionFrame = true;
        this.contextTokens = Math.min(3, this.contextTokens + 1);
        const rawRemoteX = aimFoe ? aimFoe.x : this.x + this.facing * 350;
        this._v2RemoteX = this._clampArenaX(rawRemoteX, game);
        if (game?.audio) game.audio.play('clock_gear', this._v2RemoteX);
        this.spawnNebulaFloorSeal(this._v2RemoteX, this.groundY, 84, 0.44);
        this.spawnVfxAnim(1, this._v2RemoteX, this.groundY - 128, 176, 176, 0.34, { inFront: true, vy: 28 });
        this._applyRemoteNebulaStrike(this._v2RemoteX, 88, 26, game, aimFoe || enemy, {
          knockX: 16,
          knockY: -18,
          hitStop: 0.030
        });
      }
      if ((this._beatHitMask & 2) === 0 && t >= 0.17) {
        this._beatHitMask |= 2;
        this.spawnVfxAnim(4, this._v2RemoteX, this.groundY - 110, 164, 224, 0.32, { inFront: true });
        this.fx?.spawn('nebulaPromptBurst', this._safeFxX(this._v2RemoteX, game), this.groundY - 94, { light: 1.24 });
        this._applyRemoteNebulaStrike(this._v2RemoteX, 92, 30, game, aimFoe || enemy, {
          isCrit: true,
          knockX: 28,
          knockY: -36,
          hitStop: 0.036
        });
      }
    } else {
      if ((this._beatHitMask & 1) === 0 && t >= 0.15) {
        this._beatHitMask |= 1;
        this.didActionFrame = true;
        this.spawnAfterimage(this.x + this.facing * 28, this.groundY, this.facing, 2, 25, 0.24);
        const rawRemoteX = aimFoe ? aimFoe.x : this.x + this.facing * 375;
        this._v3RemoteX = this._clampArenaX(rawRemoteX, game);
        const orbMuzzleX = this.nekoOrb?.x ?? (this.x + this.facing * 32);
        const orbMuzzleY = this.nekoOrb?.y ?? (this.groundY - 112);
        const tokenBonus = this.contextTokens * 10;
        this.contextTokens = 0;

        this._beat4Laser = {
          x1: orbMuzzleX,
          y1: orbMuzzleY,
          x2: this._v3RemoteX,
          y2: this.groundY - 92,
          age: 0,
          maxLife: 0.28
        };
        if (game?.audio) game.audio.play('cyber_slash', this._v3RemoteX);
        this.spawnNebulaFloorSeal(this._v3RemoteX, this.groundY, 96, 0.46);
        this.spawnVfxAnim(3, this._v3RemoteX, this.groundY - 88, 196, 196, 0.32, { inFront: false });
        this.spawnVfxAnim(4, this._v3RemoteX, this.groundY - 114, 184, 240, 0.34, { inFront: true });
        this._applyRemoteNebulaStrike(this._v3RemoteX, 96, 38 + tokenBonus, game, aimFoe || enemy, {
          isCrit: true,
          knockX: 54,
          knockY: -44,
          hitStop: 0.042
        });
        this._spawnProj(game, {
          x: orbMuzzleX,
          y: orbMuzzleY,
          vx: (dx / dist) * 760,
          vy: (dy / dist) * 760,
          radius: 15,
          maxRange: 640,
          color: '#22d3ee',
          coreColor: '#ffffff',
          owner: this,
          damage: 28,
          type: 'nebula_packet',
          isMeteor: false
        });
      }
      if ((this._beatHitMask & 2) === 0 && t >= 0.24) {
        this._beatHitMask |= 2;
        this._applyRemoteNebulaStrike(this._v3RemoteX, 96, 26, game, aimFoe || enemy, {
          isCrit: true,
          knockX: 48,
          knockY: -48,
          hitStop: 0.040
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
   * Signature Skill (`404 POP-UP CASCADE`, Row 3 `90..119`):
   * Buoyant `34px` conductor-hop -> rises 3 converging Row 1 `404` Holograms & twin Row 4 Nebula Columns ->
   * slams descending Row 2 `Cob` Creator Seal onto `targetX` & activates Auto-Patch Holo-Shield!
   */
  updateSkill(dt, enemy, game) {
    const t = this.stateTimer;
    this.vx = 0;
    this.vy = 0;

    // 34px buoyant conductor-hop, landing cleanly on groundY by 0.70s!
    if (t < 0.70) {
      this.y = this.groundY - Math.round(Math.sin((t / 0.70) * Math.PI) * 34);
    } else {
      this.y = this.groundY;
    }

    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const rawTarget = enemy ? enemy.x : this.x + this.facing * 350;
    const targetX = this._safeFxX(Math.max(115, Math.min(ww - 115, rawTarget)), game);
    this._skillTargetX = targetX;

    if (this._skillPhase === 0 && t >= 0.10) {
      this._skillPhase = 1;
      if (game?.audio) game.audio.play('clock_gear', targetX);
      game?.vfx?.spawnSpecialCastAura?.(this, this.skillName, 'NEBULA AI ASSISTANT', 'nebula', false);
      this.spawnAfterimage(this.x, this.y, this.facing, 3, 6, 0.24);
      this.spawnNebulaFloorSeal(this.x, this.groundY, 84, 0.78);
      this.spawnNebulaFloorSeal(targetX, this.groundY, 128, 0.88);
      // Rising Marquee Seal (Row 3) + Converging 404 Windows (Row 1) + Auto-Patch Holo-Shield
      this.spawnVfxAnim(3, targetX, this.groundY - 96, 212, 212, 0.78, { inFront: false });
      this.spawnVfxAnim(1, targetX - 58, this.groundY - 92, 148, 148, 0.56, {
        inFront: true,
        vx: 72,
        vy: -78
      });
      this.heal(42, 'AUTO-PATCH');
      this.holoPatchShield = 110;
      this.holoPatchTimer = 3.5;
      this.spawnNebulaCluster(this.x, this.y - 96, 10, 145);
    }

    if (this._skillPhase === 1 && t >= 0.24) {
      this._skillPhase = 2;
      this.spawnVfxAnim(1, targetX + 58, this.groundY - 104, 152, 152, 0.48, {
        inFront: true,
        vx: -76,
        vy: -72
      });
      this.spawnVfxAnim(1, targetX, this.groundY - 84, 168, 168, 0.44, {
        inFront: true,
        vy: -88
      });
      // Twin Flanking Erupting Nebula Plasma Columns!
      this.spawnVfxAnim(4, targetX - 56, this.groundY - 110, 156, 224, 0.48, { inFront: false });
      this.spawnVfxAnim(4, targetX + 56, this.groundY - 110, 156, 224, 0.48, { inFront: false });
      this._applyRemoteNebulaStrike(targetX, 114, 34, game, enemy, {
        knockX: 18,
        knockY: -22,
        hitStop: 0.030
      });
    }

    if (this._skillPhase === 2 && t >= 0.46) {
      this._skillPhase = 3;
      this.didActionFrame = true;
      if (game?.audio) game.audio.play('holy_bolt', targetX);
      game?.renderer?.triggerShake?.(12, 0.24);
      // Descending Row 2 `Cob` Creator Holo-Crest + Towering Center Row 4 Nebula Pillar!
      this.spawnVfxAnim(2, targetX, this.groundY - 224, 220, 220, 0.54, { inFront: true, vy: 225 });
      this.spawnVfxAnim(4, targetX, this.groundY - 146, 212, 292, 0.50, { inFront: true });
      this.fx?.spawn('cobCreatorCrestSeal', targetX, this.groundY, { light: 1.36 });
      this.spawnExParticle({ x: targetX, y: this.groundY - 86, shape: 'ring', size: 120, color: '#22d3ee', maxLife: 0.32 });
      this._applyRemoteNebulaStrike(targetX, 128, 86, game, enemy, {
        isCrit: true,
        knockX: 64,
        knockY: -54,
        hitStop: 0.044
      });
      this._spawnProj(game, {
        x: this.x + this.facing * 54,
        y: this.groundY - 96,
        vx: this.facing * 730,
        vy: 0,
        radius: 16,
        maxRange: 640,
        color: '#22d3ee',
        coreColor: '#fde047',
        owner: this,
        damage: 38,
        type: 'nebula_packet',
        isMeteor: false
      });
    }

    if (t >= this.skillDuration) {
      this.y = this.groundY;
      this.vx = 0;
      this.setState('IDLE');
    }
  }

  /**
   * Overdrive Ultimate (`COB-OS: STARLIGHT OVERCLOCK`, Row 4 F00..F14 `120..134`, `1.76s`):
   * 68px Starlight Levitation -> 6 live-whirling 3D Elliptical Row 5 Terminal Drones +
   * 5 Sequential Soaring Row 4 Nebula Organ Columns -> Descending Row 2 `Cob` Seal Climax + clean touchdown!
   */
  updateUltimate(_dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.ultDuration || 1.76;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const rawTarget = enemy ? enemy.x : this.x + this.facing * 350;
    const targetX = this._safeFxX(Math.max(185, Math.min(ww - 185, rawTarget)), game);
    this._ultTargetX = targetX;
    this.isInvulnerable = true;
    this.vx = 0;
    this.vy = 0;

    // 68px Levitation across F00..F10 (0.00..1.24s) -> grounded landing across F11..F14 (1.24..1.76s)
    const localCol = Math.min(14, Math.floor((t / dur) * 15));
    this.trueUltFrameOverride = 120 + localCol;
    this._overrideFrameIdx = 120 + localCol;
    if (localCol <= 10) {
      const airU = t / (dur * (11 / 15));
      this.y = this.groundY - Math.round(68 * Math.sin(Math.min(1, airU) * Math.PI));
    } else {
      this.y = this.groundY;
    }

    if (this._ultStep === 0 && t >= 0.08) {
      this._ultStep = 1;
      this._ultNodesActive = true;
      this._overclockVisual = {
        active: true,
        centerX: targetX,
        groundY: this.groundY,
        age: 0,
        maxLife: dur
      };
      if (game?.audio) game.audio.play('ult_cast', this.x);
      game?.vfx?.spawnSpecialCastAura?.(this, this.ultName, 'COB-OS OVERDRIVE', 'nebula', true);
      this.spawnNebulaFloorSeal(this.x, this.groundY, 108, 1.35);
      this.spawnNebulaFloorSeal(targetX, this.groundY, 178, 1.56);
      this.fx?.spawn('nebulaOrbitalMatrix', targetX, this.groundY, { light: 1.38 });

      // Spawn 6 live-whirling 3D Orbital Row 5 Terminal Drones circling & spiraling into targetX!
      for (let k = 0; k < 6; k++) {
        const ang = (k / 6) * Math.PI * 2;
        this.spawnVfxAnim(
          5,
          targetX + Math.cos(ang) * 165,
          this.groundY - 118 + Math.sin(ang) * 64,
          144,
          144,
          1.22,
          {
            inFront: Math.sin(ang) >= 0,
            orbitCenterX: targetX,
            orbitIdx: k,
            orbitTotal: 6,
            orbitRx: 165,
            orbitRy: 64
          }
        );
      }
    }

    if (this._overclockVisual?.active) {
      this._overclockVisual.age = t;
      this._overclockVisual.centerX = targetX;
      this._overclockVisual.groundY = this.groundY;
    }

    // Sequentially ignite the 5 Nebula Data-Organ Columns (`[-156, 156, -78, 78, 0]`)!
    const organTimes = [0.28, 0.40, 0.52, 0.64, 0.78];
    const organOffsets = [-156, 156, -78, 78, 0];
    while (this._ultStep >= 1 && this._ultStep <= 5 && t >= organTimes[this._ultStep - 1]) {
      const idx = this._ultStep - 1;
      this._ultStep++;
      const px = this._safeFxX(Math.max(85, Math.min(ww - 85, targetX + organOffsets[idx])), game);
      if (game?.audio) game.audio.play('holy_bolt', px);
      this.spawnNebulaCluster(px, this.groundY - 104, organOffsets[idx] === 0 ? 12 : 6, 165);
      if (idx === 4) {
        this._applyRemoteNebulaStrike(targetX, 182, 68, game, enemy, {
          isCrit: false,
          knockX: 24,
          knockY: -44,
          hitStop: 0.04
        });
      }
    }

    if (this._ultStep === 6 && t >= 1.04 && !this.didActionFrame) {
      this._ultStep = 7;
      this.didActionFrame = true;
      if (game?.audio) game.audio.play('priestess_ult', targetX);
      game?.renderer?.triggerImpactFrame?.(targetX, this.groundY - 110, 0.14, 'nebula');
      game?.renderer?.triggerAberration?.(12);
      game?.renderer?.triggerShake?.(20, 0.48);
      game?.renderer?.triggerHitStop?.(0.06);
      this.spawnVfxAnim(2, targetX, this.groundY - 235, 256, 256, 0.64, { inFront: true, vy: 215 });
      this.spawnVfxAnim(4, targetX, this.groundY - 156, 240, 340, 0.54, { inFront: true });
      this.spawnExParticle({ x: targetX, y: this.groundY - 110, shape: 'ring', size: 195, color: '#22d3ee', coreColor: '#fde047', maxLife: 0.42 });
      this._applyRemoteNebulaStrike(targetX, 198, 142, game, enemy, {
        isCrit: true,
        knockX: 118,
        knockY: -165,
        hitStop: 0.06
      });
      game?.vfx?.spawnDamageText?.(targetX, this.groundY - 196, 0, true, 'COB-OS OVERCLOCK!', '#22d3ee');
    }

    if (t >= dur) {
      this.y = this.groundY;
      this.vx = 0;
      this.vy = 0;
      this.isInvulnerable = false;
      this._ultNodesActive = false;
      if (this._overclockVisual) this._overclockVisual.active = false;
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      this.setState('IDLE');
    }
  }

  _initTrueUltStarfield() {
    this._trueUltStarfield = [];
    for (let i = 0; i < 64; i++) {
      this._trueUltStarfield.push({
        x: ((i * 97 + 41) % 1400) - 100,
        y: ((i * 53 + 29) % 520) + 18,
        vx: (i % 2 === 0 ? -1 : 1) * (42 + (i % 5) * 22),
        vy: -(48 + (i % 6) * 24),
        size: i % 4 === 0 ? 6 : 4,
        col: i % 4 === 0 ? '#fde047' : i % 2 === 0 ? '#22d3ee' : '#d946ef',
        phase: i * 0.6
      });
    }
    this._trueUltStarInit = true;
  }

  /**
   * Supreme True Ultimate (`GENESIS PROMPT: POWERED BY COB`, Row 4 F15..F29 `135..149`, `4.10s`):
   * - Act I (`0.00..1.10s`): 84px Astral Ascension + `Row 7` Halo + `cobGenesisSanctuaryCore` + Stage Preview
   * - Act II (`1.10..2.32s`): `284x284` `Row 7` `"Cob"` Solar-Astrolabe + 4 Pylons + Supernova Muzzle Charge
   * - Act III (`2.32..2.95s`): PERMANENT Fourth-Wall `cob_monitor` Stage Deploy + "Cob Helping Nyx" Creator
   *   Intervention + 13-Segment `224px`-Tall `Row 4` + Dual-Helix Horizon-Piercing Supernova Beam!
   * - Act IV (`2.95..4.10s`): Cushioned touchdown onto `groundY` (`F26..F29`)!
   */
  updateTrueUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.trueUltDuration || 4.10;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const advBounds =
      game?.adventure?.active && typeof game.adventure.getActiveStageBounds === 'function'
        ? game.adventure.getActiveStageBounds()
        : null;
    const rawTarget = enemy ? enemy.x : this.x + this.facing * 400;
    const targetX = this._safeFxX(Math.max(160, Math.min(ww - 160, rawTarget)), game);
    this._trueUltTargetX = targetX;
    this._supernovaTargetX = targetX;
    this._supernovaMuzzleX = this.x + this.facing * 46;
    this._supernovaBeamY = this.y - 108;

    this.isInvulnerable = true;
    this.unstoppablePoise = true;
    this.vx = 0;
    this.vy = 0;

    if (!this._trueUltStarInit) {
      this._initTrueUltStarfield();
    }
    for (let i = 0; i < this._trueUltStarfield.length; i++) {
      const s = this._trueUltStarfield[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.y < -20) s.y += 560;
      if (s.x < -120) s.x += 1440;
      if (s.x > ww + 120) s.x -= 1440;
    }

    // Ascension / Fire / Grounded Recovery Height Curve
    let localCol = 0;
    if (t < 2.32) {
      const ascU = Math.min(1, t / 0.72);
      const easeU = 1 - Math.pow(1 - ascU, 2.2);
      const lift = Math.round(84 * easeU + (t >= 0.72 ? Math.sin((t - 0.72) * 3.8) * 4 : 0));
      this.y = this.groundY - lift;
      this.cameraAirLift = advBounds ? 0 : Math.round(84 * easeU);
      localCol = Math.min(9, Math.floor((t / 2.32) * 10));
      if (!advBounds && game?.renderer && !game.renderer.permanentStageOverride) {
        game.renderer.setStageTransformation?.('cob_monitor', 0.45 * easeU, false, 0.35);
      }
    } else if (t < 2.95) {
      localCol = 10; // F25: Explosive Supernova Command
      this.y = this.groundY;
      this.cameraAirLift = advBounds ? 0 : Math.round(36 * Math.max(0, 1 - (t - 2.32) / 0.35));
    } else {
      const recU = Math.min(1, (t - 2.95) / Math.max(0.1, dur - 2.95));
      localCol = 11 + Math.min(3, Math.floor(recU * 4));
      this.y = this.groundY;
      this.cameraAirLift = 0;
    }
    this.trueUltFrameOverride = 135 + localCol;
    this._overrideFrameIdx = 135 + localCol;

    if (this._trueUltStep === 0 && t >= 0.06) {
      this._trueUltStep = 1;
      if (game?.audio) game.audio.play('ult_cast', this.x);
      game?.vfx?.triggerCinematicCutIn?.(this, this.trueUltName, '#22d3ee');
      game?.vfx?.spawnSpecialCastAura?.(this, this.trueUltName, 'POWERED BY COB', 'nebula', true);
      this.spawnNebulaFloorSeal(this.x, this.groundY, 138, 2.30);
      this.spawnNebulaFloorSeal(targetX, this.groundY, 175, 2.30);
      this.fx?.spawn('cobGenesisSanctuaryCore', this._safeFxX(this.x, game), this.groundY, { light: 1.44 });
      this.spawnVfxAnim(7, targetX, this.groundY - 220, 260, 260, 2.25, { inFront: true });
    }

    if (this._trueUltStep === 1 && t >= 1.10) {
      this._trueUltStep = 2;
      if (game?.audio) game.audio.play('clock_gear', targetX);
      // 4 Pylons locking around targetX
      for (let k = 0; k < 4; k++) {
        const ang = (k / 4) * Math.PI * 2;
        this.spawnVfxAnim(
          5,
          targetX + Math.cos(ang) * 145,
          this.groundY - 120 + Math.sin(ang) * 58,
          136,
          136,
          1.22,
          {
            inFront: Math.sin(ang) >= 0,
            orbitCenterX: targetX,
            orbitIdx: k,
            orbitTotal: 4,
            orbitRx: 145,
            orbitRy: 58
          }
        );
      }
      game?.vfx?.spawnDamageText?.(targetX, this.groundY - 242, 0, true, 'COB GENESIS PROTOCOL!', '#a5f3fc');
    }

    // Act III (t >= 2.32s): Deploy `cob_monitor` Stage + "Cob Helping Nyx" Creator Intervention + Supernova Beam!
    if (t >= 2.32 && !this._supernovaFired) {
      this._supernovaFired = true;
      this.didActionFrame = true;
      this._supernovaBeamTimer = 0.01;
      this._supernovaMuzzleX = this.x + this.facing * 48;
      this._supernovaBeamY = this.groundY - 108;

      if (!advBounds && game?.renderer) {
        const rawActiveId = game.renderer.getActiveStageId?.();
        const prevStageId =
          typeof rawActiveId === 'string' && rawActiveId && rawActiveId !== 'cob_monitor'
            ? rawActiveId
            : typeof game.renderer.stageId === 'string' && game.renderer.stageId
              ? game.renderer.stageId
              : 'cathedral';
        game.renderer.setStageTransformation?.('cob_monitor', 1.0, true, 0);
        game.renderer.triggerCobMonitorTransition?.({
          fromStageId: prevStageId,
          focusX: targetX,
          duration: 1.28
        });
        game.renderer.triggerStageEvent?.(
          'COB-OS: FOURTH WALL TERMINAL',
          'CREATOR COB ASSISTS NYX FROM BEYOND THE MONITOR',
          '#22d3ee',
          7.5
        );
      }

      this._cobCreatorLinkActive = true;
      this._cobAssistCd = 2.80;
      this._triggerCobCreatorAssist(enemy, game, true);

      if (game?.audio) game.audio.play('cyber_beam', targetX);
      if (game?.audio) game.audio.play('supernova_detonate', targetX);
      game?.renderer?.triggerImpactFrame?.(targetX, this._supernovaBeamY, 0.16, 'nebula');
      game?.renderer?.triggerWhiteoutDeletion?.(targetX, this._supernovaBeamY, 0.34, 'cyber');
      game?.renderer?.triggerAberration?.(16);
      game?.renderer?.triggerShake?.(26, 0.72);
      game?.renderer?.triggerHitStop?.(0.09);
      game?.triggerSlowMo?.(0.55, 0.34);

      this.spawnVfxAnim(7, targetX, this.groundY - 122, 268, 268, 0.96, { inFront: true });
      this.spawnVfxAnim(2, this._supernovaMuzzleX, this._supernovaBeamY, 212, 212, 0.72, { inFront: true });
      this.spawnVfxAnim(4, targetX, this.groundY - 144, 240, 340, 0.76, { inFront: true });
      this.spawnExParticle({ x: targetX, y: this.groundY - 110, shape: 'ring', size: 245, color: '#fde047', coreColor: '#22d3ee', maxLife: 0.48 });
      this.spawnNebulaCluster(targetX, this.groundY - 110, 24, 245);

      this._applyRemoteNebulaStrike(targetX, 290, 420, game, enemy, {
        isCrit: true,
        knockX: 165,
        knockY: -210,
        hitStop: 0.08
      });
      game?.vfx?.spawnDamageText?.(targetX, this.groundY - 216, 0, true, 'POWERED BY COB!', '#fde047');
    }

    if (this._supernovaBeamTimer > 0) {
      this._supernovaBeamTimer += dt;
      if (this._supernovaBeamTimer > 0.92) {
        this._supernovaBeamTimer = 0;
      }
    }

    if (t >= dur) {
      this.y = this.groundY;
      this.vx = 0;
      this.vy = 0;
      this.cameraAirLift = 0;
      this.isInvulnerable = false;
      this.unstoppablePoise = false;
      this._supernovaBeamTimer = 0;
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      this.setState('IDLE');
    }
  }

  _updateNekoOrb(dt, enemy, game) {
    if (!this.nekoOrb) return;
    const t = this.haloPhase;
    let tx = this.x - this.facing * 26 + Math.cos(t * 2.2) * 14;
    let ty = this.y - 114 + Math.sin(t * 3.1) * 9;
    let inFront = Math.sin(t * 2.2) >= 0;
    let eyeMode = 'happy';
    let targetScale = 1.0;

    if (this.isDead) {
      tx = this.x - this.facing * 18;
      ty = this.groundY - 18;
      inFront = true;
      eyeMode = 'sleep';
      targetScale = 0.85;
    } else if (this.state === 'TRUE_ULTIMATE') {
      tx = this.x + this.facing * 42;
      ty = this.y - 112 + Math.sin(t * 8.0) * 5;
      inFront = true;
      eyeMode = 'overclock';
      targetScale = 1.48;
    } else if (this.state === 'ULTIMATE') {
      tx = this.x + this.facing * 32;
      ty = this.y - 122 + Math.sin(t * 7.0) * 6;
      inFront = true;
      eyeMode = 'overclock';
      targetScale = 1.32;
    } else if (this.state === 'SKILL') {
      tx = this.x + this.facing * 38;
      ty = this.y - 114 + Math.cos(t * 6.0) * 6;
      inFront = true;
      eyeMode = 'laser';
      targetScale = 1.24;
    } else if (this.state === 'AUTO_ATTACK') {
      if (this._autoVariant === 3) {
        tx = this.x + this.facing * 34;
        ty = this.y - 112;
      } else {
        tx = this.x + this.facing * 38;
        ty = this.y - 102 + Math.sin(t * 9.0) * 4;
      }
      inFront = true;
      eyeMode = 'laser';
      targetScale = 1.15;
    } else if (this.state === 'DASH' || this.state === 'DODGE' || this.state === 'JUMP') {
      tx = this.x - this.facing * 30;
      ty = this.y - 108;
      inFront = false;
      eyeMode = 'laser';
    }

    const alpha = Math.min(1, dt * 15);
    this.nekoOrb.x += (tx - this.nekoOrb.x) * alpha;
    this.nekoOrb.y += (ty - this.nekoOrb.y) * alpha;
    this.nekoOrb.scale += (targetScale - this.nekoOrb.scale) * alpha;
    this.nekoOrb.inFront = inFront;
    this.nekoOrb.eyeMode = eyeMode;

    if (!this.isDead && game) {
      this.nekoOrb.moteAcc += dt;
      if (this.nekoOrb.moteAcc >= 0.20) {
        this.nekoOrb.moteAcc = 0;
        this.spawnExParticle({
          x: this.nekoOrb.x + ((Math.round(this.haloPhase * 20) % 3) - 1) * 6,
          y: this.nekoOrb.y + 4,
          vx: -this.facing * 12,
          vy: -24,
          shape: 'star4',
          size: 2.5,
          color: eyeMode === 'overclock' ? '#fde047' : '#22d3ee',
          maxLife: 0.34,
          layer: 'front'
        });
      }
    }
  }

  update(dt, enemy, game) {
    this._currentEnemy = enemy;
    this.haloPhase += dt;
    this._ctrlZCd = Math.max(0, this._ctrlZCd - dt);
    if (this.holoPatchTimer > 0) {
      this.holoPatchTimer = Math.max(0, this.holoPatchTimer - dt);
      if (this.holoPatchTimer <= 0) this.holoPatchShield = 0;
    }
    this._comboPersistTimer = Math.max(0, this._comboPersistTimer - dt);
    if (this._comboPersistTimer <= 0 && this.state !== 'AUTO_ATTACK') {
      this.comboStep = 0;
    }

    // Ongoing "Cob Helping Nyx" Creator Assist while `cob_monitor` stage is deployed!
    if (this._cobUplinkVisualTimer > 0) {
      this._cobUplinkVisualTimer = Math.max(0, this._cobUplinkVisualTimer - dt);
    }
    const isCobStageActive =
      game?.renderer?.getActiveStageId?.() === 'cob_monitor' || this._cobCreatorLinkActive;
    if (
      isCobStageActive &&
      !this.isDead &&
      !this._advPureDodge &&
      this.state !== 'TRUE_ULTIMATE' &&
      this.state !== 'DEATH'
    ) {
      this._cobAssistCd = Math.max(0, this._cobAssistCd - dt);
      if (this._cobAssistCd <= 0) {
        const assistFoe = this._resolveRangedTarget(enemy, game, 920) || (enemy && !enemy.isDead ? enemy : null);
        if (assistFoe) {
          this._cobAssistCd = 3.20;
          this._triggerCobCreatorAssist(assistFoe, game, false);
        }
      }
    }

    if (this._beat4Laser) {
      this._beat4Laser.age += dt;
      if (this._beat4Laser.age >= this._beat4Laser.maxLife) {
        this._beat4Laser = null;
      }
    }

    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      this.afterimages[i].life += dt;
      if (this.afterimages[i].life >= this.afterimages[i].maxLife) {
        this.afterimages.splice(i, 1);
      }
    }

    for (let i = this.nebulaFloorSeals.length - 1; i >= 0; i--) {
      this.nebulaFloorSeals[i].age += dt;
      if (this.nebulaFloorSeals[i].age >= this.nebulaFloorSeals[i].maxLife) {
        this.nebulaFloorSeals.splice(i, 1);
      }
    }

    for (let i = this.activeVfxAnims.length - 1; i >= 0; i--) {
      const v = this.activeVfxAnims[i];
      v.age += dt;
      if (v.orbitCenterX !== null && v.orbitIdx !== null) {
        // Live 3D Elliptical Orbital Convergence for Overdrive & True Ult Pylons!
        const u = Math.min(1, v.age / Math.max(0.01, v.maxLife));
        const shrink = Math.max(0.16, 1 - 0.84 * Math.pow(u, 1.8));
        const ang = (v.orbitIdx / Math.max(1, v.orbitTotal)) * Math.PI * 2 + v.age * 5.8;
        const cx = this.state === 'ULTIMATE' ? this._ultTargetX : v.orbitCenterX;
        v.x = cx + Math.cos(ang) * v.orbitRx * shrink;
        v.y = this.groundY - 122 + Math.sin(ang) * v.orbitRy * shrink - 14 * Math.sin(u * Math.PI);
        v.inFront = Math.sin(ang) >= 0;
        const depthScale = 0.86 + 0.24 * Math.sin(ang);
        v.w = Math.round(v.baseW * depthScale);
        v.h = Math.round(v.baseH * depthScale);
      } else if (v.followOwner) {
        v.x = this.x + this.facing * v.offsetX;
        v.y = this.y + v.offsetY + v.vy * v.age;
      } else {
        v.x += v.vx * dt;
        v.y += v.vy * dt;
      }
      if (v.age >= v.maxLife) this.activeVfxAnims.splice(i, 1);
    }

    for (let i = this.afkDecoys.length - 1; i >= 0; i--) {
      const d = this.afkDecoys[i];
      d.age += dt;
      if (!d.detonated && enemy && !enemy.isDead && Math.abs(enemy.x - d.x) < 74 && d.age > 0.16) {
        d.detonated = true;
        this.spawnHitStarburst(d.x, d.y, '#22d3ee', '#d946ef', 1.0);
        enemy.takeDamage(28, this, false, 18, -16);
      }
      if (d.age >= d.maxLife) this.afkDecoys.splice(i, 1);
    }

    this._exParticles?.update(dt);
    this.fx?.update(dt);
    super.update(dt, enemy, game);
    this._updateNekoOrb(dt, enemy, game);
  }

  _drawBloomedVfxCell(ctx, renderer, vfxSheet, col, row, dx, dy, dw, dh, glowCol, alpha = 0.96, isReflection = false) {
    PixelForge.ensureImage?.(vfxSheet);
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth || alpha <= 0.01) return;
    const sx = (((col % 30) + 30) % 30) * 208;
    const sy = row * 208;
    const prevComp = ctx.globalCompositeOperation;
    const prevAlpha = ctx.globalAlpha;

    ctx.imageSmoothingEnabled = false;
    if (renderer && !isReflection) {
      const glowTex = renderer.getGlowForColor?.(glowCol);
      if (glowTex) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(0.22, alpha * 0.22);
        ctx.drawImage(glowTex, Math.round(dx - dw * 0.25), Math.round(dy - dh * 0.25), Math.round(dw * 1.5), Math.round(dh * 1.5));
      }
    }
    ctx.globalCompositeOperation = isReflection ? 'lighter' : 'source-over';
    ctx.globalAlpha = Math.min(1, alpha * (isReflection ? 0.30 : 1.0));
    ctx.drawImage(vfxSheet, sx, sy, 208, 208, Math.round(dx), Math.round(dy), Math.round(dw), Math.round(dh));
    if (!isReflection) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(0.20, alpha * 0.20);
      ctx.drawImage(vfxSheet, sx, sy, 208, 208, Math.round(dx), Math.round(dy), Math.round(dw), Math.round(dh));
    }
    ctx.globalCompositeOperation = prevComp;
    ctx.globalAlpha = prevAlpha;
  }

  _drawNebulaOrb(ctx, renderer = null, isReflection = false) {
    if (!this.nekoOrb) return;
    const ox = Math.round(this.nekoOrb.x / 2) * 2;
    const oy = Math.round(this.nekoOrb.y / 2) * 2;
    const sc = this.nekoOrb.scale || 1.0;
    const r = Math.round(12 * sc);
    const colFrame = Math.floor(this.haloPhase * 30) % 30;
    const mode = this.nekoOrb.eyeMode;
    const rimCol = mode === 'overclock' ? '#fde047' : mode === 'laser' ? '#22d3ee' : colFrame % 2 === 0 ? '#22d3ee' : '#d946ef';

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (!isReflection) {
      drawExBayerHalo(ctx, ox, oy, r * 1.9, r * 1.9, rimCol, '#c084fc', mode === 'overclock' ? 0.20 : 0.14);
    }

    // Crisp pixel Cosmic Neko-AI Orb body + cat ears (`0` Canvas2D arc/ellipse/rotate calls!)
    ctx.globalCompositeOperation = isReflection ? 'lighter' : 'source-over';
    ctx.globalAlpha = isReflection ? 0.28 : 0.98;
    // Left & right pixel cat ears
    for (const side of [-1, 1]) {
      const ex = ox + side * Math.round(r * 0.62);
      const ey = oy - r - 2;
      ctx.fillStyle = '#0f1029';
      ctx.fillRect(ex - 4, ey - 5, 8, 8);
      ctx.fillStyle = side < 0 ? '#22d3ee' : '#d946ef';
      ctx.fillRect(ex - 2, ey - 3, 4, 5);
    }
    // Dark outline + glowing bevel rim + obsidian visor
    ctx.fillStyle = '#0f1029';
    ctx.fillRect(ox - r - 2, oy - r - 2, r * 2 + 4, r * 2 + 4);
    ctx.fillStyle = rimCol;
    ctx.fillRect(ox - r, oy - r, r * 2, r * 2);
    ctx.fillStyle = '#181438';
    ctx.fillRect(ox - r + 3, oy - r + 3, r * 2 - 6, r * 2 - 6);

    // Expressive glowing pixel visor LEDs inside orb
    if (mode === 'sleep') {
      ctx.fillStyle = '#c084fc';
      ctx.fillRect(ox - 5, oy, 10, 2);
    } else if (mode === 'overclock') {
      ctx.fillStyle = '#fde047';
      ctx.fillRect(ox - 6, oy - 3, 12, 6);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(ox - 4, oy - 1, 8, 2);
    } else if (mode === 'laser') {
      ctx.fillStyle = '#22d3ee';
      ctx.fillRect(ox - 6, oy - 2, 12, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(ox - 3, oy - 1, 6, 2);
    } else {
      ctx.fillStyle = '#a5f3fc';
      ctx.fillRect(ox - 5, oy - 3, 3, 4);
      ctx.fillRect(ox + 2, oy - 3, 3, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(ox - 4, oy - 2, 2, 2);
      ctx.fillRect(ox + 3, oy - 2, 2, 2);
    }
    ctx.restore();
  }

  _drawNebulaBeam(ctx, renderer, vfxSheet, x1, y1, x2, y2, halfW, outerCol, midCol, alpha) {
    if (alpha <= 0.02) return;
    const leftX = Math.round(Math.min(x1, x2) / 2) * 2;
    const rightX = Math.round(Math.max(x1, x2) / 2) * 2;
    const midY = Math.round(((y1 + y2) * 0.5) / 2) * 2;
    const width = Math.max(24, rightX - leftX);
    const tCol = Math.floor(this.haloPhase * 30) % 30;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    // Pixel-stepped glowing outer/mid/white lance
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(1, alpha * 0.88);
    ctx.fillStyle = outerCol;
    ctx.fillRect(leftX, midY - halfW, width, halfW * 2);

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(0.22, alpha * 0.22);
    ctx.fillStyle = midCol;
    ctx.fillRect(leftX, midY - Math.round(halfW * 0.72), width, Math.round(halfW * 1.44));

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(leftX, midY - Math.max(4, Math.round(halfW * 0.36)), width, Math.max(8, Math.round(halfW * 0.72)));

    // Stepped 4x4 dual-helix pixel ribbons & racing Row 0 Star-Prisms along beam body!
    const dir = x2 >= x1 ? 1 : -1;
    const startX = dir > 0 ? leftX : rightX;
    for (let step = 0; step < width; step += 12) {
      const px = Math.round((startX + dir * step) / 4) * 4;
      const wave = Math.sin(step * 0.055 - this.haloPhase * 32);
      const hy = Math.round((midY + wave * halfW * 0.92) / 4) * 4;
      ctx.fillStyle = '#fde047';
      ctx.fillRect(px - 2, hy - 2, 6, 4);
      const hy2 = Math.round((midY - wave * halfW * 0.92) / 4) * 4;
      ctx.fillStyle = '#22d3ee';
      ctx.fillRect(px - 2, hy2 - 2, 6, 4);
    }

    if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      const segSize = Math.max(84, Math.min(196, Math.round(halfW * 4.2)));
      const segStep = Math.round(segSize * 0.56);
      const numSegs = Math.max(2, Math.ceil(width / segStep));
      for (let s = 0; s < numSegs; s++) {
        const sx = leftX + s * segStep;
        if (sx > rightX) break;
        const sCol = (tCol + s * 3) % 30;
        const rowUse = s % 3 === 0 ? 0 : 4;
        this._drawBloomedVfxCell(
          ctx,
          renderer,
          vfxSheet,
          sCol,
          rowUse,
          sx - Math.round(segSize * 0.5),
          midY - Math.round(segSize * 0.5),
          segSize,
          segSize,
          s % 2 === 0 ? '#22d3ee' : '#d946ef',
          0.76 * alpha,
          false
        );
      }
    }
    ctx.restore();
  }

  drawNebulaFloorSeals(ctx, renderer = null) {
    if (!this.nebulaFloorSeals.length) return;
    const sprites = this.getExSprites();
    const vfxSheet = PixelForge.ensureImage?.(sprites?.vfx);
    const baseCol = Math.floor(this.haloPhase * 18) % 30;

    for (let i = 0; i < this.nebulaFloorSeals.length; i++) {
      const s = this.nebulaFloorSeals[i];
      const u = Math.min(1, s.age / Math.max(0.01, s.maxLife));
      const fade = Math.sin(u * Math.PI);
      if (fade <= 0.02) continue;
      const w = Math.round(s.radius * 2.25 * (0.76 + 0.28 * u));
      const h = Math.max(24, Math.round(w * 0.30));
      const cx = Math.round(s.x);
      const cy = Math.round(s.groundY - 4);
      drawExBayerHalo(ctx, cx, cy, Math.min(82, w * 0.44), Math.min(28, h * 0.55), '#22d3ee', '#d946ef', 0.16 * fade);
      if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
        this._drawBloomedVfxCell(
          ctx,
          renderer,
          vfxSheet,
          (baseCol + i * 5) % 30,
          3,
          Math.round(cx - w * 0.5),
          Math.round(cy - h * 0.5),
          w,
          h,
          '#22d3ee',
          0.92 * fade,
          false
        );
      }
    }
  }

  _drawOverclockOrganColumns(ctx, renderer = null) {
    const o = this._overclockVisual;
    if (!o || !o.active) return;
    const u = Math.min(1, o.age / Math.max(0.01, o.maxLife));
    const fade = u < 0.14 ? u / 0.14 : u > 0.82 ? (1 - u) / 0.18 : 1.0;
    if (fade <= 0.02) return;
    const sprites = this.getExSprites();
    const vfxSheet = PixelForge.ensureImage?.(sprites?.vfx);
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;

    const cx = Math.round(o.centerX);
    const gy = Math.round(o.groundY);
    const baseCol = Math.floor(o.age * 30) % 30;
    const pipeSpecs = [
      { off: -156, w: 148, h: 244, glow: '#22d3ee', colShift: 0, delay: 0.12 },
      { off: -78, w: 176, h: 312, glow: '#d946ef', colShift: 6, delay: 0.24 },
      { off: 0, w: 224, h: 386, glow: '#fde047', colShift: 12, delay: 0.38 },
      { off: 78, w: 176, h: 312, glow: '#d946ef', colShift: 18, delay: 0.24 },
      { off: 156, w: 148, h: 244, glow: '#22d3ee', colShift: 24, delay: 0.12 }
    ];
    for (let i = 0; i < pipeSpecs.length; i++) {
      const p = pipeSpecs[i];
      if (u < p.delay) continue;
      const grow = Math.min(1, (u - p.delay) * 3.2);
      const pw = Math.round(p.w * (0.82 + 0.18 * fade));
      const ph = Math.max(52, Math.round(p.h * grow));
      const pCol = (baseCol + p.colShift) % 30;
      this._drawBloomedVfxCell(
        ctx,
        renderer,
        vfxSheet,
        pCol,
        4,
        Math.round(cx + p.off - pw * 0.5),
        Math.round(gy - ph + 16),
        pw,
        ph,
        p.glow,
        0.92 * fade,
        false
      );
    }
  }

  _drawVfxAnims(ctx, inFront = true, renderer = null) {
    if (!this.activeVfxAnims.length) return;
    const sprites = this.getExSprites();
    const vfxSheet = PixelForge.ensureImage?.(sprites?.vfx);
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
      const hw = Math.round(v.w * 0.5);
      const hh = Math.round(v.h * 0.5);
      drawExBayerHalo(ctx, px, py, hw * 0.78, hh * 0.78, '#c084fc', '#22d3ee', 0.16 * fade);
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(v.flipX ? -1 : 1, 1);
      this._drawBloomedVfxCell(
        ctx,
        renderer,
        vfxSheet,
        col,
        v.row,
        -hw,
        -hh,
        v.w,
        v.h,
        v.row === 2 || v.row === 7 ? '#22d3ee' : v.row === 4 ? '#a5f3fc' : '#d946ef',
        Math.min(1, 0.42 + fade * 0.58),
        false
      );
      ctx.restore();
    }
    ctx.restore();
  }

  drawForegroundOverlay(ctx, renderer = null) {
    const arenaCenterX = this._resolveShaderCenterX(renderer);
    if (!this.isDead) {
      drawExBayerHalo(ctx, Math.round(this.x), Math.round(this.groundY - 4), 52, 16, '#c084fc', '#22d3ee', 0.16);
    }

    // Screen-wide Cosmic Star-Packets & Creator Data-Rain behind Nyx during TRUE_ULTIMATE!
    if (this.state === 'TRUE_ULTIMATE' && this._trueUltStarInit) {
      const t = this.stateTimer || 0;
      const fade = Math.min(1, t / 0.25) * Math.min(1, Math.max(0, (this.trueUltDuration - t) / 0.35));
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = fade * 0.85;
      for (let i = 0; i < this._trueUltStarfield.length; i++) {
        const s = this._trueUltStarfield[i];
        const sx = Math.round(s.x / 2) * 2;
        const sy = Math.round(s.y / 2) * 2;
        ctx.fillStyle = s.col;
        ctx.fillRect(sx - 1, sy - s.size, 2, s.size * 2);
        ctx.fillRect(sx - s.size, sy - 1, s.size * 2, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx - 1, sy - 1, 2, 2);
      }
      ctx.restore();
    }

    this.drawNebulaFloorSeals(ctx, renderer);
    this._exParticles?.renderBack(ctx);
    if (this.fx && !this.isDead) {
      this.fx.renderLayer(ctx, 'back', arenaCenterX, this.groundY, 0.96);
    }
    this._drawVfxAnims(ctx, false, renderer);

    const sprites = this.getExSprites();
    const vfxSheet = PixelForge.ensureImage?.(sprites?.vfx);
    const sheet = PixelForge.ensureImage?.(sprites?.sheet);

    // Majestic Rotating Back-Halo Behind Nyx during Overdrive (`Row 2 Cob`) & Supreme Ult (`Row 7 Core`)!
    if (!this.isDead && (this.state === 'ULTIMATE' || this.state === 'TRUE_ULTIMATE') && vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      const haloSize = this.state === 'TRUE_ULTIMATE' ? 272 : 232;
      const haloRow = this.state === 'TRUE_ULTIMATE' ? 7 : 2;
      const col = Math.floor(this.haloPhase * 30) % 30;
      const hy = Math.round(this.y - 116);
      drawExBayerHalo(ctx, Math.round(this.x), hy, haloSize * 0.44, haloSize * 0.44, '#22d3ee', '#fde047', 0.18);
      this._drawBloomedVfxCell(
        ctx,
        renderer,
        vfxSheet,
        col,
        haloRow,
        Math.round(this.x - haloSize * 0.5),
        Math.round(hy - haloSize * 0.5),
        haloSize,
        haloSize,
        this.state === 'TRUE_ULTIMATE' ? '#fde047' : '#22d3ee',
        0.88,
        false
      );
    }

    // Holo-Patch Shimmering Pixel Bracket Ward when `holoPatchTimer > 0`
    if (!this.isDead && this.holoPatchTimer > 0 && this.holoPatchShield > 0) {
      const wAlpha = Math.min(0.62, this.holoPatchTimer * 0.35);
      const hx = Math.round(this.x);
      const hy = Math.round(this.y - 92);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = wAlpha;
      ctx.fillStyle = '#22d3ee';
      ctx.fillRect(hx - 48, hy - 54, 16, 4);
      ctx.fillRect(hx - 48, hy - 54, 4, 22);
      ctx.fillRect(hx + 32, hy - 54, 16, 4);
      ctx.fillRect(hx + 44, hy - 54, 4, 22);
      ctx.fillRect(hx - 48, hy + 50, 16, 4);
      ctx.fillRect(hx + 32, hy + 50, 16, 4);
      ctx.restore();
    }

    if (this.afterimages.length > 0 && sheet && sheet.complete && sheet.naturalWidth) {
      for (let i = 0; i < this.afterimages.length; i++) {
        const img = this.afterimages[i];
        const alpha = Math.max(0, (1 - img.life / img.maxLife) * 0.48);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(Math.round(img.x / 2) * 2, Math.round((img.y + 4) / 2) * 2);
        ctx.scale(img.facing, 1);
        ctx.globalAlpha = alpha;
        PixelForge.drawSilhouetteFrame(ctx, sprites, img.frameIdx, 208, 208, i % 2 === 0 ? '#22d3ee' : '#d946ef');
        ctx.restore();
      }
    }

    if (this.nekoOrb && !this.nekoOrb.inFront) {
      this._drawNebulaOrb(ctx, renderer, false);
    }
  }

  drawUltimateForeground(ctx, renderer = null) {
    const arenaCenterX = this._resolveShaderCenterX(renderer);
    const sprites = this.getExSprites();
    const vfxSheet = PixelForge.ensureImage?.(sprites?.vfx);

    if (this.fx && !this.isDead) {
      this.fx.renderLayer(ctx, 'front', arenaCenterX, this.groundY, 0.98);
    }
    this._drawOverclockOrganColumns(ctx, renderer);
    this._drawVfxAnims(ctx, true, renderer);
    this._exParticles?.renderFront(ctx);

    if (this.nekoOrb && this.nekoOrb.inFront) {
      this._drawNebulaOrb(ctx, renderer, false);
    }

    // Visible "Cob Helping Nyx" Creator Assist Uplink Tether connecting monitor horizon to Nyx's Neko Orb!
    if (!this.isDead && this._cobUplinkVisualTimer > 0) {
      const u = Math.min(1, this._cobUplinkVisualTimer / Math.max(0.01, this._cobUplinkMaxTimer || 0.90));
      const fade = Math.sin(u * Math.PI);
      const topX = Math.round(this.x / 4) * 4;
      const topY = Math.round(this.groundY - 290);
      const destY = Math.round(this.y - 96);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalCompositeOperation = 'source-over';
      for (let step = 0; step < 12; step++) {
        const f = (step / 11 + this.haloPhase * 2.5) % 1;
        const py = Math.round((topY + (destY - topY) * f) / 4) * 4;
        const px = topX + Math.round(Math.sin(f * 10 + this.haloPhase * 12) * 14);
        ctx.globalAlpha = fade * Math.sin(f * Math.PI) * 0.92;
        ctx.fillStyle = step % 2 === 0 ? '#fde047' : '#22d3ee';
        ctx.fillRect(px - 3, py - 5, 6, 10);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px - 1, py - 3, 2, 6);
      }
      ctx.restore();
    }

    if (this._beat4Laser) {
      const bl = this._beat4Laser;
      const env = Math.sin(Math.min(1, bl.age / bl.maxLife) * Math.PI);
      this._drawNebulaBeam(ctx, renderer, vfxSheet, bl.x1, bl.y1, bl.x2, bl.y2, 16, '#c084fc', '#22d3ee', env);
    }

    if (this.state === 'TRUE_ULTIMATE') {
      const t = this.stateTimer || 0;
      const col = Math.floor(t * 30) % 30;
      const muzzleX = Math.round(this.nekoOrb?.x ?? (this.x + this.facing * 46));
      const beamY = Math.round(this.nekoOrb?.y ?? (this.y - 108));

      if (!this._supernovaFired && vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
        const chargeP = Math.min(1, t / 2.32);
        const orbSize = Math.round(168 + chargeP * 116);
        drawExBayerHalo(ctx, muzzleX, beamY, 64 + chargeP * 54, 64 + chargeP * 54, '#22d3ee', '#fde047', 0.20);
        this._drawBloomedVfxCell(
          ctx,
          renderer,
          vfxSheet,
          col,
          2,
          Math.round(muzzleX - orbSize * 0.5),
          Math.round(beamY - orbSize * 0.5),
          orbSize,
          orbSize,
          '#22d3ee',
          0.78 + 0.22 * chargeP,
          false
        );
        // 5 pulsing pixel aim-prisms extending downrange toward targetX
        for (let k = 1; k <= 5; k++) {
          const aimSz = Math.round(44 + chargeP * 24);
          const ax = Math.round(muzzleX + this.facing * k * 145);
          this._drawBloomedVfxCell(
            ctx,
            renderer,
            vfxSheet,
            (col + k * 5) % 30,
            0,
            ax - Math.round(aimSz * 0.5),
            beamY - Math.round(aimSz * 0.5),
            aimSz,
            aimSz,
            k % 2 === 0 ? '#d946ef' : '#22d3ee',
            (0.28 + 0.48 * chargeP) * (1 - k * 0.1),
            false
          );
        }
      } else if (this._supernovaBeamTimer > 0) {
        const u = Math.min(1, this._supernovaBeamTimer / 0.92);
        const env = u < 0.08 ? Math.max(0.35, u / 0.08) : u < 0.70 ? 1.0 : Math.max(0, (1 - u) / 0.30);
        const endX = this._supernovaMuzzleX + this.facing * 1020;
        this._drawNebulaBeam(
          ctx,
          renderer,
          vfxSheet,
          this._supernovaMuzzleX,
          this._supernovaBeamY,
          endX,
          this._supernovaBeamY,
          48,
          '#d946ef',
          '#22d3ee',
          env
        );
        if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
          this._drawBloomedVfxCell(
            ctx,
            renderer,
            vfxSheet,
            col,
            7,
            Math.round(this._supernovaMuzzleX - 128),
            Math.round(this._supernovaBeamY - 128),
            256,
            256,
            '#fde047',
            env,
            false
          );
        }
      }
    }
  }

  draw(ctx, isReflection = false, renderer = null) {
    const sprites = this.getExSprites();
    if (!sprites) return;
    const vfxSheet = PixelForge.ensureImage?.(sprites?.vfx);

    if (isReflection && !this.isDead && this.nebulaFloorSeals.length > 0 && vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      const baseCol = Math.floor(this.haloPhase * 18) % 30;
      for (let i = 0; i < this.nebulaFloorSeals.length; i++) {
        const s = this.nebulaFloorSeals[i];
        const fade = Math.sin(Math.min(1, s.age / Math.max(0.01, s.maxLife)) * Math.PI);
        if (fade > 0.05) {
          this._drawBloomedVfxCell(ctx, renderer, vfxSheet, (baseCol + i * 5) % 30, 3, Math.round(s.x - 92), Math.round(s.groundY - 26), 184, 52, '#22d3ee', 0.45 * fade, true);
        }
      }
    }

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(this.x), Math.round(this.y + 4));
    ctx.scale(this.facing, 1);
    PixelForge.drawSheetFrame(ctx, sprites, this, 208, 208, this.haloPhase, isReflection, renderer);
    ctx.restore();
  }
}
