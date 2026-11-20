import { Fighter } from './Fighter.js?v=30fps172';
import { PixelForge } from '../engine/PixelForge.js?v=30fps172';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps172';
import { NEBULA_EFFECT_REGISTRY } from '../engine/shaders/nebulaShaders.js?v=30fps172';
import { ExParticleSystem, drawExBayerHalo } from '../engine/shaders/exNextGenFX.js?v=30fps172';

const AUTO_SLICES_EX = [
  [60, 8], // Beat 1 (V0, 0.38s): Coil + Forward lunge + finger-tap -> Twin Star-Packet Bolts
  [68, 7], // Beat 2 (V1, 0.36s): Low coil + Baggy sleeve swipe -> Spinning Holo-Window Projectile
  [75, 8], // Beat 3 (V2, 0.42s): Pose-B knee-tuck hop + paw boop -> Remote 404 Pop-Up & Galaxy Burst
  [83, 7]  // Beat 4 (V3, 0.50s): Aerial backstep kite + [ENTER] slam -> Neko-AI Orb Star-Stream
];

const BEAT_DURATIONS = [0.38, 0.36, 0.42, 0.50];
const INTRA_COMBO_LINK = 0.015;

const KERNEL_OVERCLOCK_PALETTE = Object.freeze({
  core: [255, 255, 255],
  bright: [253, 164, 175],
  mid: [244, 63, 94],
  deep: [136, 19, 55],
  glow: [34, 211, 238]
});

const FIREWALL_EMERALD_PALETTE = Object.freeze({
  core: [255, 255, 255],
  bright: [167, 243, 208],
  mid: [34, 211, 238],
  deep: [15, 118, 110],
  glow: [52, 211, 153]
});

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
      maxHp: 3640,
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
    this._postFlurryInterval = 1.47;

    this.skillName = '404 POP-UP CASCADE';
    this.skillMaxCooldown = 4.65;
    this.skillCooldown = 1.10;
    this.skillDuration = 1.02;
    this.skillTriggerRange = 516;

    this.ultName = 'COB-OS: STARLIGHT OVERCLOCK';
    this.ultSub = 'SIX-WINDOW ORBITAL RING & GALAXY VORTEX';
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

    // Cornered 1.5s–2.5s Far-Side Stage Teleport State
    this._corneredTimer = 0;
    this._corneredThreshold = 1.85;
    this._cornerTeleportCd = 0;
    this._farTeleportInvulnTimer = 0;
    this._farTeleportFx = null;

    this._overrideFrameIdx = null;
    this.afterimages = [];
    this.afterimageAccum = 0;
    this.activeVfxAnims = [];
    this.nebulaFloorSeals = [];
    this.afkDecoys = [];
    this._exParticles = new ExParticleSystem('nyx_ex', '#c084fc');

    this.fx = new ArcaneShaderFX(NEBULA_EFFECT_REGISTRY, {
      pixelScale: 2,
      viewW: 960,
      viewH: 560
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

  applySovereignAspectStats(aspect) {
    if (aspect === 1) {
      this.maxHp = 3520;
      this.hp = this.maxHp;
      this._postFlurryInterval = 1.38;
    } else if (aspect === 2) {
      this.maxHp = 3510;
      this.hp = this.maxHp;
      this.dodgeMaxCooldown = 3.00;
      this._postFlurryInterval = 1.48;
    }
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
        sheet: mkImg('assets/sprites/nyx_ex_sheet.png?v=30fps172'),
        vfx: mkImg('assets/sprites/nyx_ex_vfx.png?v=30fps172'),
        portrait: mkImg('assets/sprites/nyx_ex_portrait.png?v=30fps172'),
        cellW: 320,
        cellH: 240,
        anchorX: 112,
        anchorY: 230
      };
    } else if (typeof Image !== 'undefined') {
      PixelForge.ensureHeroLoaded?.('nyx_ex');
    }
    return assets.nyx_ex;
  }

  _getArenaWallBounds(game) {
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
    return { minX, maxX };
  }

  _isPinnedInCorner(enemy, game = this.game) {
    if (this._advPureDodge || this.isDead) return false;
    const { minX, maxX } = this._getArenaWallBounds(game);
    if (maxX - minX < 500) return false;
    const nearWall = this.x - minX <= 155 || maxX - this.x <= 155;
    if (!nearWall) return false;
    const foe =
      enemy && !enemy.isDead ? enemy : this._resolveRangedTarget(enemy, game, 360);
    return Boolean(foe && !foe.isDead && Math.abs(foe.x - this.x) <= 320);
  }

  _clampArenaX(xv, game) {
    const { minX, maxX } = this._getArenaWallBounds(game);
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
    const preHp = this.hp;
    let finalAmt = Math.max(0, Math.round(amount || 0));
    const incomingTier =
      attacker?._activeHitTier ||
      (attacker && !attacker.isMonster && (attacker.state === 'ULTIMATE' || attacker.state === 'TRUE_ULTIMATE')
        ? attacker.state
        : null);
    if (
      !incomingTier &&
      !this.isInvulnerable &&
      this.state !== 'ULTIMATE' &&
      this.state !== 'TRUE_ULTIMATE' &&
      this.holoPatchTimer > 0 &&
      this.holoPatchShield > 0 &&
      finalAmt > 0
    ) {
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
    const chargingCornerTeleport =
      attacker && this._isPinnedInCorner(attacker, this.game) && this._cornerTeleportCd <= 0;
    if (
      dealt > 0 &&
      !this.isDead &&
      !this._advPureDodge &&
      chargingCornerTeleport &&
      this.holoPatchShield <= 0
    ) {
      // Brief corner emergency Holo-Patch buffer while charging the 1.5s–2.5s Far-Side Warp
      this.holoPatchShield = 45;
      this.holoPatchTimer = 1.6;
    }
    if (
      dealt > 0 &&
      !this.isDead &&
      !this._advPureDodge &&
      !chargingCornerTeleport &&
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

  _triggerCornerFarSideTeleport(enemy, game) {
    if (this._advPureDodge || this.isDead) return false;
    const { minX, maxX } = this._getArenaWallBounds(game);
    const oldX = this.x;
    const pinnedLeft = Math.abs(oldX - minX) <= Math.abs(maxX - oldX);
    const destX = pinnedLeft ? Math.max(minX + 24, maxX - 24) : Math.min(maxX - 24, minX + 24);

    // Leave Row 6 "AFK" Holographic Neko Decoy & departure portal behind at corner
    this.spawnVfxAnim(6, oldX, this.groundY - 96, 168, 168, 1.15, {
      flipX: this.facing < 0,
      inFront: true
    });
    this.spawnNebulaFloorSeal(oldX, this.groundY, 82, 0.58);
    if (this.afkDecoys.length >= 4) this.afkDecoys.shift();
    this.afkDecoys.push({ x: oldX, y: this.groundY - 96, age: 0, maxLife: 1.15, detonated: false });

    this.x = destX;
    this.y = this.groundY;
    this.vx = 0;
    this.vy = 0;
    if (this.state === 'JUMP' || this.state === 'WALK' || this.state === 'HURT') {
      this.setState('IDLE');
    }
    if (enemy && !enemy.isDead) {
      this.facing = enemy.x >= this.x ? 1 : -1;
    } else {
      this.facing = pinnedLeft ? -1 : 1;
    }

    this.isInvulnerable = true;
    this._farTeleportInvulnTimer = 0.45;
    this.holoPatchShield = Math.max(this.holoPatchShield, 75);
    this.holoPatchTimer = Math.max(this.holoPatchTimer, 2.6);
    this.spawnAfterimage(oldX, this.groundY, this.facing, 6, 8, 0.34);
    this.fx?.spawn('nebulaPromptBurst', this._safeFxX(oldX, game), this.groundY - 84, { light: 1.18 });
    this.fx?.spawn('nebulaPromptBurst', this._safeFxX(destX, game), this.groundY - 84, { light: 1.24 });
    this.spawnVfxAnim(0, destX, this.groundY - 96, 136, 136, 0.44, { inFront: true });
    this.spawnNebulaFloorSeal(destX, this.groundY, 96, 0.64);
    this.spawnNebulaCluster(destX, this.groundY - 88, 14, 185);
    this._farTeleportFx = {
      fromX: oldX,
      toX: destX,
      y: this.groundY - 92,
      age: 0,
      maxLife: 0.82
    };
    game?.vfx?.spawnDamageText?.(destX, this.groundY - 148, 0, true, 'FAR-SIDE TELEPORT!', '#22d3ee');
    if (game?.audio) game.audio.play('blink', destX);

    this._corneredTimer = 0;
    this._corneredThreshold = 1.5 + Math.random() * 1.0;
    this._cornerTeleportCd = 6.20;
    return true;
  }

  _triggerCtrlZGlitchBlink(enemy, game) {
    if (this._advPureDodge || this.isDead) return false;
    const vsAspect = game?.isAdventureMode?.() ? 0 : this.buildAspect || 0;
    this._ctrlZCd = vsAspect === 2 ? 3.6 : 4.8;
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
    this._farTeleportInvulnTimer = Math.max(this._farTeleportInvulnTimer || 0, 0.28);
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
    const dur = isDeploy ? 1.24 : 1.12;
    this._cobUplinkTargetX = aimX;
    this._cobUplinkMaxTimer = dur;
    this._cobUplinkVisualTimer = dur;

    game?.renderer?.triggerCobAssistPulse?.(this.x, aimX, dur);

    if (isDeploy) {
      this.spawnNebulaFloorSeal(this.x, this.groundY, 108, 0.64);
      this.spawnExParticle({ x: this.x, y: this.y - 84, shape: 'ring', size: 88, color: '#05ffa1', coreColor: '#fde047', maxLife: 0.34 });
      this.heal(Math.round(this.maxHp * 0.12), 'COB GENESIS');
      this.holoPatchShield = Math.max(this.holoPatchShield, 136);
      this.holoPatchTimer = Math.max(this.holoPatchTimer, 4.0);
      game?.vfx?.spawnDamageText?.(this.x, this.y - 168, 0, true, 'COB ASSIST: CREATOR LINK!', '#fde047');

      // Twin flanking Creator Command Galaxy Bursts framing targetX!
      for (const off of [-96, 96]) {
        const px = this._safeFxX(this._clampArenaX(aimX + off, game), game);
        this.spawnVfxAnim(4, px, this.groundY - 104, 168, 168, 0.56, { inFront: true });
        this.spawnNebulaFloorSeal(px, this.groundY, 84, 0.68);
      }
    } else {
      if (game?.audio) game.audio.play('holy_bolt', aimX);
      // Silent sustain + Holo-Patch shield so ZERO burst/text appears over Nyx during periodic Cob Strikes!
      this.hp = Math.min(this.maxHp, this.hp + 10);
      this.holoPatchShield = Math.max(this.holoPatchShield, 32);
      this.holoPatchTimer = Math.max(this.holoPatchTimer, 2.8);
      game?.vfx?.spawnDamageText?.(aimX, this.groundY - 172, 0, false, 'COB STRIKE!', '#ff2a6d');

      // Cob Signature Neon Crimson / Cyber-Mint Burst strictly onto `aimX` (`0` pastel Nyx skill seal!)
      this.spawnExParticle({ x: aimX, y: this.groundY - 96, shape: 'ring', size: 132, color: '#ff2a6d', coreColor: '#05ffa1', maxLife: 0.40 });
      for (let s = 0; s < 8; s++) {
        this.spawnExParticle({
          x: aimX + (s - 3.5) * 12,
          y: this.groundY - 118 + (s % 2) * 24,
          vx: (s - 3.5) * 34,
          vy: -38 - (s % 3) * 20,
          shape: 'star4',
          size: 4,
          color: s % 3 === 0 ? '#fde047' : s % 2 === 0 ? '#ff2a6d' : '#05ffa1',
          coreColor: '#ffffff',
          maxLife: 0.38
        });
      }
      this._applyRemoteNebulaStrike(aimX, 118, 29, game, enemy, {
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
    this._skillVoiceFired = false;
    this._ultVoiceFired = false;
    this._trueUltChargeVoiced = false;

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
      this.trueUltFrameOverride = 90;
      this._overrideFrameIdx = 90;
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
      orbitRy: opts.orbitRy ?? 58,
      orbitHoldUntil: opts.orbitHoldUntil || 0
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
      this._hitStopTimer = Math.max(this._hitStopTimer || 0, Math.min(0.018, hitStop));
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
    this.jumpCooldown = 2.8;
    this.isBlinkTeleport = false;
    this.setState('JUMP');
    this.isInvulnerable = true;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    let dir = customDir !== null ? customDir : -this.facing;
    if (this.x < 185) dir = 1;
    else if (this.x > ww - 185) dir = -1;
    const pinnedInCorner = this._isPinnedInCorner(enemy, game) && this._cornerTeleportCd <= 0;
    this.dashStartX = this.x;
    this.dashTargetX = pinnedInCorner
      ? this._clampArenaX(this.x + dir * 20, game)
      : this._clampArenaX(this.x + dir * 240, game);
    this.dashDuration = 0.54;
    this.didActionFrame = false;
    this.vx = 0;
    this.vy = 0;
    if (game?.audio) game.audio.play('dash_whoosh', this.x);
    this.spawnNebulaCluster(this.x, this.groundY - 82, 7, 130);
    if (
      !pinnedInCorner &&
      enemy &&
      !enemy.isDead &&
      Math.abs(enemy.x - this.x) < 220 &&
      !this._advPureDodge &&
      this._ctrlZCd <= 0
    ) {
      this._triggerCtrlZGlitchBlink(enemy, game);
      this.setState('IDLE');
    }
  }

  onStartDodge(enemy, game, dir) {
    if (this._advPureDodge) return;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const dist = enemy && !enemy.isDead ? Math.abs(enemy.x - this.x) : 999;
    const nearWall = this.x < 195 || this.x > ww - 195;
    this.isFlipVault = false;
    this.didActionFrame = false;
    this.vx = 0;
    this.vy = 0;
    if (dist < 250 || nearWall) {
      this.isBlinkTeleport = true;
      this.dashDuration = 0.28;
      this._triggerCtrlZGlitchBlink(enemy, game);
      this.dashStartX = this.x;
      this.dashTargetX = this.x;
      this.isInvulnerable = true;
      return;
    }
    this.isBlinkTeleport = false;
    this.isInvulnerable = true;
    this.dashStartX = this.x;
    const stepDir = dir || -this.facing;
    this.dashTargetX = this._clampArenaX(this.x + stepDir * 220, game);
    this.dashDuration = 0.44;
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
    if (!this._advPureDodge && this.isBlinkTeleport) {
      const t = this.stateTimer;
      const dur = this.dashDuration || 0.28;
      this.vx = 0;
      this.vy = 0;
      this.y = this.groundY;
      this.isInvulnerable = t < dur * 0.85;
      if (t >= dur) {
        this.isBlinkTeleport = false;
        this.isInvulnerable = false;
        this.y = this.groundY;
        this.setState('IDLE');
      }
      return;
    }
    this.updateJump(dt, enemy, game);
  }

  updateDashOrDodge(dt, enemy, game) {
    if (this._advPureDodge) {
      this.updateJump(dt, enemy, game);
      return;
    }
    if (this.state === 'DASH') this.updateDash(dt, enemy, game);
    else if (this.state === 'DODGE') this.updateDodge(dt, enemy, game);
    else this.updateJump(dt, enemy, game);
  }

  startCrouch(_enemy, game) {
    const vsAspect = game?.isAdventureMode?.() ? 0 : this.buildAspect || 0;
    this.crouchCooldown = vsAspect === 2 ? 3.2 : 3.6;
    this.crouchDuration = 0.88;
    this.setState('CROUCH');
    this.isCrouching = true;
    this.isDeflecting = true;
    this.vx = 0;
    this.y = this.groundY;
    this.holoPatchShield = Math.max(this.holoPatchShield, vsAspect === 1 ? 22 : vsAspect === 2 ? 68 : 46);
    this.holoPatchTimer = Math.max(this.holoPatchTimer, vsAspect === 2 ? 2.5 : 2.2);
    this.spawnNebulaFloorSeal(this.x, this.groundY, 82, 0.60);
    this.fx?.spawn('nebulaPromptBurst', this._safeFxX(this.x, game), this.groundY - 76, {
      palette:
        vsAspect === 1
          ? KERNEL_OVERCLOCK_PALETTE
          : vsAspect === 2
            ? FIREWALL_EMERALD_PALETTE
            : undefined,
      light: 1.15
    });
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
    const snapT = v === 0 ? 0.10 : v === 1 ? 0.08 : v === 2 ? 0.10 : 0.15;

    const localStep = Math.min(sliceLen - 1, Math.max(0, Math.floor((t / Math.max(0.05, dur)) * sliceLen)));
    const frameIdx = sliceStart + localStep;
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

    const vsAspect = game?.isAdventureMode?.() ? 0 : this.buildAspect || 0;
    const aspectPal =
      vsAspect === 1
        ? KERNEL_OVERCLOCK_PALETTE
        : vsAspect === 2
          ? FIREWALL_EMERALD_PALETTE
          : undefined;
    const autoScale = vsAspect === 2 ? 0.89 : 1.0;

    if (v === 0) {
      if ((this._beatHitMask & 1) === 0 && t >= 0.09) {
        this._beatHitMask |= 1;
        this.didActionFrame = true;
        this._hitStopTimer = Math.max(this._hitStopTimer || 0, 0.018);
        this.contextTokens = Math.min(3, this.contextTokens + 1);
        if (game?.audio) game.audio.play('clock_gear', spawnX);
        this.fx?.spawn('nebulaPromptBurst', this._safeFxX(spawnX, game), spawnY, {
          palette: aspectPal,
          light: 1.18
        });
        this.spawnVfxAnim(0, spawnX, spawnY, 128, 128, 0.24, { inFront: true });
        this._spawnProj(game, {
          x: spawnX,
          y: spawnY - 12,
          vx: (dx / dist) * 745,
          vy: (dy / dist) * 745 - 14,
          radius: 14,
          maxRange: 640,
          color: vsAspect === 1 ? '#fb7185' : vsAspect === 2 ? '#34d399' : '#22d3ee',
          coreColor: '#ffffff',
          owner: this,
          damage: vsAspect === 1 ? 21 : vsAspect === 2 ? 21 : 24,
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
          damage: vsAspect === 1 ? 21 : vsAspect === 2 ? 21 : 24,
          type: 'nebula_packet',
          isMeteor: false
        });
        if (vsAspect === 1) {
          // Aspect II (Kernel Overclock): 3rd DDoS packet!
          this._spawnProj(game, {
            x: spawnX + this.facing * 8,
            y: spawnY,
            vx: (dx / dist) * 785,
            vy: (dy / dist) * 785,
            radius: 13,
            maxRange: 640,
            color: '#22d3ee',
            coreColor: '#ffffff',
            owner: this,
            damage: 16,
            type: 'nebula_packet',
            isMeteor: false
          });
        }
      }
    } else if (v === 1) {
      if ((this._beatHitMask & 1) === 0 && t >= 0.07) {
        this._beatHitMask |= 1;
        this.didActionFrame = true;
        this._hitStopTimer = Math.max(this._hitStopTimer || 0, 0.018);
        this.contextTokens = Math.min(3, this.contextTokens + 1);
        if (vsAspect === 2) {
          this.holoPatchShield = Math.max(this.holoPatchShield, 20);
          this.holoPatchTimer = Math.max(this.holoPatchTimer, 1.5);
        }
        if (game?.audio) game.audio.play('skill_cast', spawnX);
        this.spawnNebulaFloorSeal(this.x, this.groundY, 64, 0.36);
        this.fx?.spawn('nebulaPromptBurst', this._safeFxX(spawnX, game), spawnY, {
          palette: aspectPal,
          light: 1.22
        });
        this._spawnProj(game, {
          x: spawnX,
          y: spawnY,
          vx: (dx / dist) * 760,
          vy: (dy / dist) * 760,
          radius: 18,
          maxRange: 650,
          pierce: true,
          color: vsAspect === 1 ? '#fb7185' : vsAspect === 2 ? '#34d399' : '#c084fc',
          coreColor: '#22d3ee',
          owner: this,
          damage: vsAspect === 0 ? 46 : Math.round(46 * autoScale),
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
        this._applyRemoteNebulaStrike(
          this._v2RemoteX,
          88,
          vsAspect === 0 ? 26 : Math.round(26 * autoScale),
          game,
          aimFoe || enemy,
          {
            knockX: 16,
            knockY: -18,
            hitStop: 0.030
          }
        );
      }
      if ((this._beatHitMask & 2) === 0 && t >= 0.17) {
        this._beatHitMask |= 2;
        this.spawnVfxAnim(4, this._v2RemoteX, this.groundY - 96, 172, 172, 0.34, { inFront: true });
        this.fx?.spawn('nebulaPromptBurst', this._safeFxX(this._v2RemoteX, game), this.groundY - 94, {
          palette: aspectPal,
          light: 1.24
        });
        this._applyRemoteNebulaStrike(
          this._v2RemoteX,
          92,
          vsAspect === 0 ? 30 : Math.round(30 * autoScale),
          game,
          aimFoe || enemy,
          {
            isCrit: true,
            knockX: 28,
            knockY: -36,
            hitStop: 0.018
          }
        );
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
        const tokenBonus = this.contextTokens * (vsAspect === 1 ? 14 : vsAspect === 2 ? 8 : 10);
        this.contextTokens = 0;

        this._beat4Laser = {
          x1: orbMuzzleX,
          y1: orbMuzzleY,
          x2: this._v3RemoteX,
          y2: this.groundY - 92,
          age: 0,
          maxLife: 0.30
        };
        if (game?.audio) game.audio.play('cyber_slash', this._v3RemoteX);
        game?.audio?.playHeroVoice?.(this.heroId, 'attack', { worldX: this.x, speakerKey: this, priority: 1, cooldownMs: 3600 });
        this.spawnNebulaFloorSeal(this._v3RemoteX, this.groundY, 96, 0.46);
        this.spawnVfxAnim(3, this._v3RemoteX, this.groundY - 88, 196, 196, 0.32, { inFront: false });
        this.spawnVfxAnim(4, this._v3RemoteX, this.groundY - 98, 188, 188, 0.36, { inFront: true });
        const baseB4 = vsAspect === 0 ? 38 : Math.round(38 * autoScale);
        this._applyRemoteNebulaStrike(this._v3RemoteX, 96, baseB4 + tokenBonus, game, aimFoe || enemy, {
          isCrit: true,
          knockX: 54,
          knockY: -44,
          hitStop: 0.018
        });
        this._spawnProj(game, {
          x: orbMuzzleX,
          y: orbMuzzleY,
          vx: (dx / dist) * 760,
          vy: (dy / dist) * 760,
          radius: 15,
          maxRange: 640,
          color: vsAspect === 1 ? '#fb7185' : '#22d3ee',
          coreColor: '#ffffff',
          owner: this,
          damage: vsAspect === 0 ? 28 : Math.round(28 * autoScale),
          type: 'nebula_packet',
          isMeteor: false
        });
      }
      if ((this._beatHitMask & 2) === 0 && t >= 0.24) {
        this._beatHitMask |= 2;
        this._applyRemoteNebulaStrike(
          this._v3RemoteX,
          96,
          vsAspect === 0 ? 26 : Math.round(26 * autoScale),
          game,
          aimFoe || enemy,
          {
            isCrit: true,
            knockX: 48,
            knockY: -48,
            hitStop: 0.040
          }
        );
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
   * Buoyant `26px` conductor-hop -> rises 3 converging Row 1 `404` Holograms & converging Star-Prisms ->
   * slams descending Row 2 `Cob` Creator Seal + square Galaxy Burst onto `targetX` & activates Auto-Patch Holo-Shield!
   */
  updateSkill(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.skillDuration || 1.02;
    this.vx = 0;
    this.vy = 0;

    const skillStep = Math.min(29, Math.max(0, Math.floor((t / Math.max(0.1, dur)) * 30)));
    this.trueUltFrameOverride = 90 + skillStep;
    this._overrideFrameIdx = 90 + skillStep;

    // 26px buoyant conductor-hop, landing cleanly on groundY by 0.68s!
    if (t < 0.68) {
      this.y = this.groundY - Math.round(Math.sin((t / 0.68) * Math.PI) * 26);
    } else {
      this.y = this.groundY;
    }

    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const rawTarget = enemy ? enemy.x : this.x + this.facing * 350;
    const targetX = this._safeFxX(Math.max(115, Math.min(ww - 115, rawTarget)), game);
    this._skillTargetX = targetX;

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
    const skillPal =
      vsSkill === 1
        ? KERNEL_OVERCLOCK_PALETTE
        : vsSkill === 2
          ? FIREWALL_EMERALD_PALETTE
          : undefined;

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
      if (vsSkill === 1) {
        // Skill II (BSOD Fatal Exception): Zero heal & zero shield, extra glitch window!
        this.spawnVfxAnim(1, targetX, this.groundY - 124, 156, 156, 0.52, {
          inFront: true,
          vy: 64
        });
      } else if (vsSkill === 2) {
        // Skill III (Auto-Patch Firewall v2.0): Fortified Holo-Patch + Tag-Ally Restore!
        this.heal(24, 'FIREWALL PATCH');
        this.holoPatchShield = 98;
        this.holoPatchTimer = 2.9;
        this.healTeammateTagGrace(28, 'AUTO-PATCH', 42, 2.4);
        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 225) {
          enemy.vx += (Math.sign(enemy.x - this.x) || this.facing) * 210;
        }
      } else {
        this.heal(31, 'AUTO-PATCH');
        this.holoPatchShield = 106;
        this.holoPatchTimer = 2.9;
      }
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
      // Twin Flanking Converging Holographic Star-Prisms (0 vertical poles!)
      this.spawnVfxAnim(0, targetX - 68, this.groundY - 108, 144, 144, 0.48, { inFront: false, vx: 64 });
      this.spawnVfxAnim(0, targetX + 68, this.groundY - 108, 144, 144, 0.48, { inFront: false, vx: -64 });
      this._applyRemoteNebulaStrike(
        targetX,
        114,
        vsSkill === 1 ? 40 : vsSkill === 2 ? 25 : 34,
        game,
        enemy,
        {
          knockX: 18,
          knockY: -22,
          hitStop: 0.018
        }
      );
    }

    if (this._skillPhase === 2 && t >= 0.46) {
      this._skillPhase = 3;
      this.didActionFrame = true;
      if (game?.audio) game.audio.play('holy_bolt', targetX);
      game?.renderer?.triggerShake?.(12, 0.24);
      // Descending Row 2 `Cob` Creator Holo-Crest + Expanding Row 4 Supernova Galaxy Burst!
      this.spawnVfxAnim(2, targetX, this.groundY - 224, 220, 220, 0.54, { inFront: true, vy: 225 });
      this.spawnVfxAnim(4, targetX, this.groundY - 108, 216, 216, 0.52, { inFront: false });
      this.fx?.spawn('cobCreatorCrestSeal', targetX, this.groundY, {
        palette: skillPal,
        light: 1.36
      });
      this.spawnExParticle({
        x: targetX,
        y: this.groundY - 86,
        shape: 'ring',
        size: 120,
        color: vsSkill === 1 ? '#fb7185' : vsSkill === 2 ? '#34d399' : '#22d3ee',
        maxLife: 0.32
      });
      const hitSk = this._applyRemoteNebulaStrike(
        targetX,
        128,
        vsSkill === 1 ? 100 : vsSkill === 2 ? 68 : 86,
        game,
        enemy,
        {
          isCrit: true,
          knockX: vsSkill === 1 ? 26 : 64,
          knockY: -54,
          hitStop: 0.018
        }
      );
      if (vsSkill === 1 && hitSk && enemy) {
        enemy.applyBuildRoot?.(0.36, 'BSOD PIN!', '#fb7185');
      }
      if (vsSkill === 1) {
        for (const vyOff of [-18, 18]) {
          this._spawnProj(game, {
            x: this.x + this.facing * 54,
            y: this.groundY - 96 + vyOff * 0.4,
            vx: this.facing * 790,
            vy: vyOff,
            radius: 15,
            maxRange: 650,
            pierce: true,
            color: '#fb7185',
            coreColor: '#22d3ee',
            owner: this,
            damage: 26,
            type: 'nebula_packet',
            isMeteor: false
          });
        }
      } else {
        this._spawnProj(game, {
          x: this.x + this.facing * 54,
          y: this.groundY - 96,
          vx: this.facing * 730,
          vy: 0,
          radius: 16,
          maxRange: 640,
          color: vsSkill === 2 ? '#34d399' : '#22d3ee',
          coreColor: '#fde047',
          owner: this,
          damage: vsSkill === 2 ? 29 : 38,
          type: 'nebula_packet',
          isMeteor: false
        });
      }
    }

    if (t >= dur) {
      this.y = this.groundY;
      this.vx = 0;
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
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
    this.isInvulnerable = t < 0.22;
    this.unstoppablePoise = true;
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
    if (game?.renderer && t < dur * 0.86) {
      const dimWave = Math.sin((t / (dur * 0.86)) * Math.PI);
      game.renderer.ultDim = Math.max(game.renderer.ultDim || 0, 0.24 * dimWave);
    }

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
    const ultPal =
      vsUlt === 1
        ? KERNEL_OVERCLOCK_PALETTE
        : vsUlt === 2
          ? FIREWALL_EMERALD_PALETTE
          : undefined;

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
      if (vsUlt === 1) {
        this.gainFinisher(12);
      } else if (vsUlt === 2) {
        this.heal(20, 'COB SANCTUARY');
        this.holoPatchShield = Math.max(this.holoPatchShield, 48);
        this.holoPatchTimer = Math.max(this.holoPatchTimer, 2.5);
        this.healTeammateTagGrace(36, 'COB RESTORE', 46, 2.6);
      }
      this.spawnNebulaFloorSeal(this.x, this.groundY, 114, 1.45);
      this.spawnNebulaFloorSeal(targetX, this.groundY, 196, 1.56);
      this.fx?.spawn('nebulaOrbitalMatrix', targetX, this.groundY, {
        palette: ultPal,
        light: 1.44
      });
      // Translucent Row 2 Command Crest framed behind target while casting
      this.spawnVfxAnim(2, targetX, this.groundY - 118, 176, 176, 1.05, { inFront: false });

      // Spawn 6 wide-spaced Cyber-Neko Terminal Drones (`96x96`, `orbitRx=216, orbitRy=86`) in a crisp 3D Hex Cathedral Ring!
      for (let k = 0; k < 6; k++) {
        const ang = (k / 6) * Math.PI * 2;
        this.spawnVfxAnim(
          5,
          targetX + Math.cos(ang) * 216,
          this.groundY - 122 + Math.sin(ang) * 86,
          96,
          96,
          1.28,
          {
            inFront: Math.sin(ang) >= 0,
            orbitCenterX: targetX,
            orbitIdx: k,
            orbitTotal: 6,
            orbitRx: 216,
            orbitRy: 86,
            orbitHoldUntil: 0.68
          }
        );
      }
    }

    if (this._overclockVisual?.active) {
      this._overclockVisual.age = t;
      this._overclockVisual.centerX = targetX;
      this._overclockVisual.groundY = this.groundY;
    }

    // Sequentially ignite the 5 Constellation Starlight Prism Waves (`[-148, 148, -76, 76, 0]`)!
    const organTimes = [0.28, 0.40, 0.52, 0.64, 0.78];
    const organOffsets = [-148, 148, -76, 76, 0];
    while (this._ultStep >= 1 && this._ultStep <= 5 && t >= organTimes[this._ultStep - 1]) {
      const idx = this._ultStep - 1;
      this._ultStep++;
      const px = this._safeFxX(Math.max(85, Math.min(ww - 85, targetX + organOffsets[idx])), game);
      if (game?.audio) game.audio.play('holy_bolt', px);
      this.spawnNebulaCluster(px, this.groundY - 104, organOffsets[idx] === 0 ? 12 : 6, 165);
      this.spawnVfxAnim(0, px, this.groundY - 110 - (idx % 2) * 32, 112, 112, 0.42, { inFront: true });
      this.spawnExParticle({ x: px, y: this.groundY - 104, shape: 'ring', size: 84, color: idx % 2 === 0 ? '#22d3ee' : '#d946ef', coreColor: '#fde047', maxLife: 0.30 });
      if (idx === 4) {
        this._applyRemoteNebulaStrike(
          targetX,
          182,
          vsUlt === 1 ? 78 : vsUlt === 2 ? 52 : 68,
          game,
          enemy,
          {
            isCrit: false,
            knockX: 24,
            knockY: -44,
            hitStop: 0.018
          }
        );
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
      if (vsUlt === 1) {
        game?.vfx?.spawnBeam?.({
          x1: targetX,
          y1: this.groundY - 410,
          x2: targetX,
          y2: this.groundY - 8,
          width: 64,
          color: '#fb7185',
          coreColor: '#22d3ee',
          maxLife: 0.46
        });
      }
      this.spawnVfxAnim(2, targetX, this.groundY - 210, 212, 212, 0.62, { inFront: true, vy: 185 });
      this.spawnVfxAnim(4, targetX, this.groundY - 110, 236, 236, 0.56, { inFront: false });
      this.spawnNebulaCluster(targetX, this.groundY - 112, 18, 225);
      this.spawnExParticle({ x: targetX, y: this.groundY - 110, shape: 'ring', size: 235, color: vsUlt === 1 ? '#fb7185' : vsUlt === 2 ? '#34d399' : '#22d3ee', coreColor: '#fde047', maxLife: 0.46 });
      this._applyRemoteNebulaStrike(
        targetX,
        198,
        vsUlt === 1 ? 166 : vsUlt === 2 ? 112 : 142,
        game,
        enemy,
        {
          isCrit: true,
          knockX: 118,
          knockY: -165,
          hitStop: 0.02
        }
      );
      game?.vfx?.spawnDamageText?.(
        targetX,
        this.groundY - 196,
        0,
        true,
        vsUlt === 1
          ? 'ROOT-ACCESS HYPER-LASER!'
          : vsUlt === 2
            ? 'COB-OS SANCTUARY!'
            : 'COB-OS OVERCLOCK!',
        '#22d3ee'
      );
    }

    if (t >= dur) {
      this.y = this.groundY;
      this.vx = 0;
      this.vy = 0;
      this.isInvulnerable = false;
      this.unstoppablePoise = false;
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

    this.isInvulnerable = t < 0.35;
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

    if (!this._trueUltChargeVoiced) {
      this._trueUltChargeVoiced = true;
      game?.audio?.playHeroVoice?.(this.heroId, 'true_ult_charge', {
        worldX: this.x,
        speakerKey: this,
        priority: 3,
        cooldownMs: 400,
        duckSfx: true
      });
    }

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
      game?.audio?.playHeroVoice?.(this.heroId, 'true_ult_fire', {
        worldX: this.x,
        speakerKey: this,
        priority: 4,
        cooldownMs: 200,
        duckSfx: true
      });
      this.didActionFrame = true;
      this._supernovaBeamTimer = 0.01;
      this._supernovaMuzzleX = this.x + this.facing * 48;
      this._supernovaBeamY = this.groundY - 108;

      if (!advBounds && game?.renderer) {
        const rawActiveId = game.renderer.getActiveStageId?.();
        const isCobVariant =
          rawActiveId === 'cob_monitor' ||
          rawActiveId === 'cob_monitor_inferno' ||
          rawActiveId === 'cob_monitor_glacial';
        const prevStageId =
          typeof rawActiveId === 'string' && rawActiveId && !isCobVariant
            ? rawActiveId
            : typeof game.renderer.stageId === 'string' && game.renderer.stageId
              ? game.renderer.stageId
              : 'cathedral';
        game.renderer.setStageTransformation?.('cob_monitor', 1.0, true, 0);
        const deployedId = game.renderer.getActiveStageId?.() || 'cob_monitor';
        game.renderer.triggerCobMonitorTransition?.({
          fromStageId: prevStageId,
          focusX: targetX,
          duration: 1.28
        });
        const evtTitle =
          deployedId === 'cob_monitor_inferno'
            ? 'COB-OS: OVERHEATED INFERNO TERMINAL'
            : deployedId === 'cob_monitor_glacial'
              ? 'COB-OS: CRYO-LOCKED BOREALIS TERMINAL'
              : 'COB-OS: FOURTH WALL TERMINAL';
        const evtCol =
          deployedId === 'cob_monitor_inferno'
            ? '#fb923c'
            : deployedId === 'cob_monitor_glacial'
              ? '#67e8f9'
              : '#22d3ee';
        game.renderer.triggerStageEvent?.(
          evtTitle,
          'CREATOR COB ASSISTS NYX FROM BEYOND THE MONITOR',
          evtCol,
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
      this.spawnVfxAnim(4, targetX, this.groundY - 112, 256, 256, 0.76, { inFront: false });
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

    // Ongoing "Cob Helping Nyx" Creator Assist while any `cob_monitor*` stage is deployed!
    if (this._cobUplinkVisualTimer > 0) {
      this._cobUplinkVisualTimer = Math.max(0, this._cobUplinkVisualTimer - dt);
    }
    const activeCobStage = game?.renderer?.getActiveStageId?.();
    const isCobStageActive =
      activeCobStage === 'cob_monitor' ||
      activeCobStage === 'cob_monitor_inferno' ||
      activeCobStage === 'cob_monitor_glacial' ||
      this._cobCreatorLinkActive;
    if (
      isCobStageActive &&
      !this.isDead &&
      !this.isBenched &&
      !this._advPureDodge &&
      this.state !== 'TRUE_ULTIMATE' &&
      this.state !== 'DEATH'
    ) {
      this._cobAssistCd = Math.max(0, this._cobAssistCd - dt);
      if (this._cobAssistCd <= 0) {
        const assistFoe = this._resolveRangedTarget(enemy, game, 920) || (enemy && !enemy.isDead ? enemy : null);
        if (assistFoe) {
          this._cobAssistCd = 3.55;
          this._triggerCobCreatorAssist(assistFoe, game, false);
        }
      }
    }

    // Cornered 1.5s–2.5s Far-Side Stage Teleport tracker (`CTRL+HOME`)
    this._cornerTeleportCd = Math.max(0, this._cornerTeleportCd - dt);
    if (this._farTeleportInvulnTimer > 0) {
      this._farTeleportInvulnTimer = Math.max(0, this._farTeleportInvulnTimer - dt);
      if (this._farTeleportInvulnTimer <= 0 && this.state !== 'ULTIMATE' && this.state !== 'TRUE_ULTIMATE' && this.state !== 'DODGE' && this.state !== 'JUMP') {
        this.isInvulnerable = false;
      }
    }
    if (this._farTeleportFx) {
      this._farTeleportFx.age += dt;
      if (this._farTeleportFx.age >= this._farTeleportFx.maxLife) {
        this._farTeleportFx = null;
      }
    }
    if (
      !this._advPureDodge &&
      !this.isDead &&
      !this.isBenched &&
      this.state !== 'ULTIMATE' &&
      this.state !== 'TRUE_ULTIMATE' &&
      this.state !== 'DEATH' &&
      this._cornerTeleportCd <= 0
    ) {
      const checkFoe =
        (enemy && !enemy.isDead ? enemy : null) || this._resolveRangedTarget(enemy, game, 360);
      if (this._isPinnedInCorner(checkFoe, game)) {
        this._corneredTimer += dt;
        if (this._corneredTimer >= this._corneredThreshold) {
          this._triggerCornerFarSideTeleport(checkFoe, game);
        }
      } else {
        this._corneredTimer = Math.max(0, this._corneredTimer - dt * 1.5);
      }
    } else if (this._advPureDodge || this.isDead) {
      this._corneredTimer = 0;
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
        // Live 3D Elliptical Orbital Convergence with wide Hex Cathedral Orbit hold!
        const u = Math.min(1, v.age / Math.max(0.01, v.maxLife));
        const holdU = v.orbitHoldUntil || 0;
        const convU = u <= holdU ? 0 : (u - holdU) / Math.max(0.01, 1 - holdU);
        const shrink =
          u <= holdU
            ? 0.94 + 0.06 * Math.sin(u * Math.PI * 3)
            : Math.max(0.14, 1 - 0.86 * Math.pow(convU, 1.7));
        const ang = (v.orbitIdx / Math.max(1, v.orbitTotal)) * Math.PI * 2 + v.age * 5.2;
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

  _drawNebulaBeam(ctx, renderer, vfxSheet, x1, y1, x2, y2, halfW, outerCol, midCol, alpha, impactX = null) {
    if (alpha <= 0.02) return;
    const leftX = Math.round(Math.min(x1, x2) / 2) * 2;
    const rightX = Math.round(Math.max(x1, x2) / 2) * 2;
    const midY = Math.round(((y1 + y2) * 0.5) / 2) * 2;
    const width = Math.max(24, rightX - leftX);
    const tCol = Math.floor(this.haloPhase * 30) % 30;
    const bloomImpactX = Math.round((Number.isFinite(impactX) ? impactX : x2) / 2) * 2;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    // Sleek Cosmic Nebula Star-Stream (0 vertical pole stamping!)
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(1, alpha * 0.84);
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

    // Stepped 4x4 dual-helix stardust ribbons & racing cosmic packets along horizontal stream!
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
      const muzSz = Math.max(76, Math.min(144, Math.round(halfW * 3.0)));
      this._drawBloomedVfxCell(
        ctx,
        renderer,
        vfxSheet,
        tCol,
        0,
        Math.round(x1 - muzSz * 0.5),
        Math.round(midY - muzSz * 0.5),
        muzSz,
        muzSz,
        '#22d3ee',
        0.88 * alpha,
        false
      );
      const impSz = Math.max(128, Math.min(236, Math.round(halfW * 4.8)));
      this._drawBloomedVfxCell(
        ctx,
        renderer,
        vfxSheet,
        (tCol + 9) % 30,
        4,
        Math.round(bloomImpactX - impSz * 0.5),
        Math.round(midY - impSz * 0.5),
        impSz,
        impSz,
        '#d946ef',
        0.92 * alpha,
        false
      );
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

  _drawOverclockGalaxyVortex(ctx, renderer = null) {
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
    const tgtY = Math.round(gy - 110);
    const baseCol = Math.floor(o.age * 30) % 30;
    const grow = Math.min(1, u * 4.0);
    const holdU = 0.68;
    const convU = u <= holdU ? 0 : (u - holdU) / Math.max(0.01, 1 - holdU);
    const shrink =
      u <= holdU
        ? 0.94 + 0.06 * Math.sin(u * Math.PI * 3)
        : Math.max(0.14, 1 - 0.86 * Math.pow(convU, 1.7));

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Caster Command Conduit & Twin Counter-Rotating Astrolabe Rings Around Nyx
    const nyxCx = Math.round(this.x);
    const nyxCy = Math.round(this.y - 110);
    for (let k = 0; k < 12; k++) {
      const a1 = (k / 12) * Math.PI * 2 + o.age * 4.6;
      const rx1 = Math.round(nyxCx + Math.cos(a1) * 74);
      const ry1 = Math.round(nyxCy + Math.sin(a1) * 26);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = Math.min(0.42, fade * (0.24 + 0.18 * Math.sin(a1)));
      ctx.fillStyle = k % 2 === 0 ? '#22d3ee' : '#fde047';
      ctx.fillRect(rx1 - 2, ry1 - 2, 4, 4);

      const a2 = (k / 12) * Math.PI * 2 - o.age * 3.8;
      const rx2 = Math.round(nyxCx + Math.cos(a2) * 54);
      const ry2 = Math.round(nyxCy + Math.sin(a2) * 54);
      ctx.fillStyle = k % 2 === 0 ? '#d946ef' : '#22d3ee';
      ctx.fillRect(rx2 - 2, ry2 - 2, 4, 4);
    }
    const startX = nyxCx + this.facing * 36;
    const startY = nyxCy - 6;
    const apexX = cx;
    const apexY = gy - 198;
    const cSteps = Math.max(24, Math.min(180, Math.round(Math.hypot(apexX - startX, apexY - startY) / 4)));
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(0.26, fade * 0.26);
    ctx.fillStyle = '#22d3ee';
    for (let s = 0; s <= cSteps; s++) {
      const cu = s / cSteps;
      const px = Math.round((startX + (apexX - startX) * cu) / 2) * 2;
      const py = Math.round((startY + (apexY - startY) * cu - 42 * Math.sin(cu * Math.PI)) / 2) * 2;
      ctx.fillRect(px - 3, py - 3, 6, 6);
    }
    for (let s = 0; s < 16; s++) {
      const cu = (s / 15 + o.age * 1.9) % 1;
      const px = Math.round((startX + (apexX - startX) * cu) / 2) * 2;
      const py = Math.round((startY + (apexY - startY) * cu - 42 * Math.sin(cu * Math.PI)) / 2) * 2;
      ctx.globalAlpha = Math.min(0.46, fade * Math.sin(cu * Math.PI) * 0.46);
      ctx.fillStyle = s % 3 === 0 ? '#fde047' : s % 2 === 0 ? '#22d3ee' : '#d946ef';
      ctx.fillRect(px - 3, py - 3, 6, 6);
    }

    // 2. Wide 3D Hexagonal Orbital Track Ring (`Rx=216*shrink, Ry=86*shrink`) + Continuous Hex Constellation Edges
    const trackRx = 216 * shrink;
    const trackRy = 86 * shrink;
    const trackCx = cx;
    const trackCy = gy - 122;
    ctx.globalCompositeOperation = 'source-over';
    for (let k = 0; k < 36; k++) {
      const th = (k / 36) * Math.PI * 2 + o.age * 2.4;
      const tx = Math.round((trackCx + Math.cos(th) * trackRx) / 2) * 2;
      const ty = Math.round((trackCy + Math.sin(th) * trackRy) / 2) * 2;
      ctx.globalAlpha = Math.min(0.36, fade * (0.20 + 0.16 * Math.sin(th)));
      ctx.fillStyle = k % 3 === 0 ? '#fde047' : k % 2 === 0 ? '#22d3ee' : '#d946ef';
      ctx.fillRect(tx - 2, ty - 2, 4, 4);
    }

    const drones = this.activeVfxAnims.filter((v) => v.row === 5 && v.orbitTotal === 6);
    if (drones.length >= 2) {
      drones.sort((a, b) => (a.orbitIdx || 0) - (b.orbitIdx || 0));
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = Math.min(0.30, fade * 0.30);
      ctx.fillStyle = '#22d3ee';
      for (let i = 0; i < drones.length; i++) {
        const dA = drones[i];
        const dB = drones[(i + 1) % drones.length];
        const eSteps = Math.max(8, Math.min(80, Math.round(Math.hypot(dB.x - dA.x, dB.y - dA.y) / 6)));
        for (let s = 0; s <= eSteps; s++) {
          const eu = s / eSteps;
          const ex = Math.round((dA.x + (dB.x - dA.x) * eu) / 2) * 2;
          const ey = Math.round((dA.y + (dB.y - dA.y) * eu) / 2) * 2;
          ctx.fillRect(ex - 2, ey - 2, 4, 4);
        }
      }
    }

    // 3. 6-Drone Continuous 3px-Stepped Translucent Neon Prism Laser Crossfire (`u = 0.05..0.74`)
    if (u >= 0.05 && u <= 0.76) {
      const prismEnv =
        u < 0.12 ? 0.55 + 0.45 * ((u - 0.05) / 0.07) : u > 0.64 ? Math.max(0, (0.76 - u) / 0.12) : 1.0;
      const laserCols = ['#22d3ee', '#ff2a85', '#fde047'];
      for (let i = 0; i < drones.length; i++) {
        const v = drones[i];
        const pulse = 0.68 + 0.32 * Math.sin(o.age * 22 + (v.orbitIdx || 0) * 1.1);
        const lx0 = Math.round(v.x);
        const ly0 = Math.round(v.y);
        const dx = cx - lx0;
        const dy = tgtY - ly0;
        const len = Math.hypot(dx, dy) || 1;
        const lx1 = Math.round(cx + (dx / len) * 42);
        const ly1 = Math.round(tgtY + (dy / len) * 42);
        const steps = Math.max(20, Math.min(180, Math.round((len + 42) / 3)));
        const col = laserCols[(v.orbitIdx || 0) % laserCols.length];

        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = Math.min(0.16, prismEnv * pulse * 0.16 * fade);
        ctx.fillStyle = col;
        for (let s = 0; s <= steps; s++) {
          const su = s / steps;
          const bx = Math.round((lx0 + (lx1 - lx0) * su) / 2) * 2;
          const by = Math.round((ly0 + (ly1 - ly0) * su) / 2) * 2;
          ctx.fillRect(bx - 5, by - 5, 10, 10);
        }
        ctx.globalAlpha = Math.min(0.38, prismEnv * pulse * 0.38 * fade);
        for (let s = 0; s <= steps; s++) {
          const su = s / steps;
          const bx = Math.round((lx0 + (lx1 - lx0) * su) / 2) * 2;
          const by = Math.round((ly0 + (ly1 - ly0) * su) / 2) * 2;
          ctx.fillRect(bx - 2, by - 2, 4, 4);
        }
        ctx.globalAlpha = Math.min(0.46, prismEnv * pulse * 0.46 * fade);
        ctx.fillStyle = '#ffffff';
        for (let s = 0; s <= steps; s += 2) {
          const su = s / steps;
          const bx = Math.round((lx0 + (lx1 - lx0) * su) / 2) * 2;
          const by = Math.round((ly0 + (ly1 - ly0) * su) / 2) * 2;
          ctx.fillRect(bx - 1, by - 1, 2, 2);
        }
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(0.13, prismEnv * pulse * 0.13 * fade);
        ctx.fillStyle = col;
        for (let s = 0; s <= steps; s += 2) {
          const su = s / steps;
          const bx = Math.round((lx0 + (lx1 - lx0) * su) / 2) * 2;
          const by = Math.round((ly0 + (ly1 - ly0) * su) / 2) * 2;
          ctx.fillRect(bx - 3, by - 3, 6, 6);
        }
      }
    }
    ctx.restore();

    // 4. Central `Row 4` Cosmic Supernova Galaxy Vortex (`236x236` square, `0` vertical poles!)
    const vortexSz = Math.round(236 * (0.68 + 0.32 * grow));
    this._drawBloomedVfxCell(
      ctx,
      renderer,
      vfxSheet,
      baseCol,
      4,
      Math.round(cx - vortexSz * 0.5),
      Math.round(tgtY - vortexSz * 0.5),
      vortexSz,
      vortexSz,
      '#22d3ee',
      0.82 * fade,
      false
    );

    // 5. 8 Diagonal Cosmic Shooting-Star Comets + 3-Wave Supernova Climax Shockwaves (`o.age >= 1.00s`)
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = 'source-over';
    for (let s = 0; s < 8; s++) {
      const cyc = (u * 2.4 + s * 0.125) % 1;
      const sx0 = cx + (s % 2 === 0 ? -185 : 185) * (1 - cyc);
      const sy0 = gy - 275 + (s >> 1) * 14 + cyc * 162;
      const dirX = s % 2 === 0 ? 1 : -1;
      const sFade = Math.sin(cyc * Math.PI) * fade;
      ctx.globalAlpha = Math.min(0.44, sFade * 0.44);
      for (let d = 0; d < 7; d++) {
        const px = Math.round((sx0 - dirX * d * 5) / 2) * 2;
        const py = Math.round((sy0 - d * 5) / 2) * 2;
        ctx.fillStyle = d === 0 ? '#ffffff' : s % 3 === 0 ? '#fde047' : s % 2 === 0 ? '#22d3ee' : '#d946ef';
        ctx.fillRect(px - 2, py - 2, 4, 4);
      }
    }

    if (o.age >= 1.0) {
      const waveU = Math.min(1, (o.age - 1.0) / Math.max(0.1, o.maxLife - 1.0));
      for (let wv = 0; wv < 3; wv++) {
        const localU = Math.max(0, Math.min(1, waveU * 1.4 - wv * 0.22));
        if (localU <= 0 || localU >= 1) continue;
        const wFade = Math.sin(localU * Math.PI) * fade;
        const rx = 48 + localU * 252;
        const ry = 20 + localU * 92;
        const col = wv === 0 ? '#22d3ee' : wv === 1 ? '#d946ef' : '#fde047';
        ctx.globalAlpha = Math.min(0.44, wFade * 0.44);
        ctx.fillStyle = col;
        for (let k = 0; k < 32; k++) {
          const th = (k / 32) * Math.PI * 2 + localU * 1.6;
          const bx = Math.round((cx + Math.cos(th) * rx) / 2) * 2;
          const by = Math.round((tgtY + Math.sin(th) * ry) / 2) * 2;
          ctx.fillRect(bx - 3, by - 2, 6, 4);
        }
      }
      // 12 radial diagonal/horizontal starburst rays (skip steep +/-90deg poles!)
      const rayEnv = Math.max(0, 1 - waveU * 1.35) * fade;
      if (rayEnv > 0.03) {
        const angles = [0.18, 0.55, 0.92, 2.22, 2.59, 2.96, 3.32, 3.69, 4.06, 5.36, 5.73, 6.10];
        ctx.globalAlpha = Math.min(0.42, rayEnv * 0.42);
        for (let a = 0; a < angles.length; a++) {
          const cosA = Math.cos(angles[a]);
          const sinA = Math.sin(angles[a]);
          ctx.fillStyle = a % 3 === 0 ? '#fde047' : a % 2 === 0 ? '#22d3ee' : '#d946ef';
          for (let r = 28; r <= 184; r += 12) {
            const px = Math.round((cx + cosA * r) / 2) * 2;
            const py = Math.round((tgtY + sinA * r * 0.72) / 2) * 2;
            ctx.fillRect(px - 2, py - 2, 5, 5);
          }
        }
      }
    }
    ctx.restore();
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

    // Cornered 1.5s–2.5s Far-Side Warp Charge Halo (`alpha <= 0.42`)
    if (
      !this.isDead &&
      this._cornerTeleportCd <= 0 &&
      this._corneredTimer >= Math.max(0.6, (this._corneredThreshold || 1.85) - 0.70)
    ) {
      const chgSpan = Math.max(0.25, (this._corneredThreshold || 1.85) - Math.max(0.6, (this._corneredThreshold || 1.85) - 0.70));
      const chgU = Math.min(1, (this._corneredTimer - Math.max(0.6, (this._corneredThreshold || 1.85) - 0.70)) / chgSpan);
      const gx = Math.round(this.x);
      const gy = Math.round(this.groundY - 6);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = Math.min(0.42, (0.20 + 0.22 * chgU) * (0.72 + 0.28 * Math.sin(this.haloPhase * 18)));
      for (let k = 0; k < 12; k++) {
        const ang = (k / 12) * Math.PI * 2 + this.haloPhase * 7.5;
        const px = Math.round((gx + Math.cos(ang) * (44 + chgU * 14)) / 2) * 2;
        const py = Math.round((gy + Math.sin(ang) * 14) / 2) * 2;
        ctx.fillStyle = k % 2 === 0 ? '#22d3ee' : '#d946ef';
        ctx.fillRect(px - 2, py - 2, 4, 4);
      }
      ctx.restore();
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
    this._drawOverclockGalaxyVortex(ctx, renderer);
    this._drawVfxAnims(ctx, true, renderer);
    this._exParticles?.renderFront(ctx);

    if (this.nekoOrb && this.nekoOrb.inFront) {
      this._drawNebulaOrb(ctx, renderer, false);
    }

    // Orbiting 2.5D Creator Halo Ring circling Nyx when Cob intervenes (0 vertical pole tether!)
    if (!this.isDead && this._cobUplinkVisualTimer > 0) {
      const u = Math.min(1, this._cobUplinkVisualTimer / Math.max(0.01, this._cobUplinkMaxTimer || 0.90));
      const fade = Math.sin(u * Math.PI);
      const cx = Math.round(this.x / 2) * 2;
      const cy = Math.round((this.y - 96) / 2) * 2;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalCompositeOperation = 'source-over';
      for (let k = 0; k < 8; k++) {
        const ang = (k / 8) * Math.PI * 2 + this.haloPhase * 6.5;
        const px = Math.round((cx + Math.cos(ang) * 56) / 2) * 2;
        const py = Math.round((cy + Math.sin(ang) * 18) / 2) * 2;
        const frontScale = Math.sin(ang) >= 0 ? 1 : 0;
        ctx.globalAlpha = fade * (0.64 + 0.32 * frontScale);
        ctx.fillStyle = k % 2 === 0 ? '#fde047' : '#22d3ee';
        ctx.fillRect(px - 3 - frontScale, py - 1, 6 + frontScale * 2, 2);
        ctx.fillRect(px - 1, py - 3 - frontScale, 2, 6 + frontScale * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px - 1, py - 1, 2, 2);
      }
      ctx.restore();
    }

    // Cross-Stage Neon Far-Side Warp Streak + Departure/Arrival Portals (`this._farTeleportFx`)
    if (this._farTeleportFx) {
      const fx = this._farTeleportFx;
      const fu = Math.min(1, fx.age / Math.max(0.01, fx.maxLife));
      const fFade = Math.sin(fu * Math.PI);
      if (fFade > 0.02) {
        const fY = Math.round(fx.y);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalCompositeOperation = 'source-over';
        // Departure & arrival translucent `[ ]` neon warp gates (`alpha <= 0.44`)
        for (const [gx, col] of [[fx.fromX, '#d946ef'], [fx.toX, '#22d3ee']]) {
          const px = Math.round(gx);
          ctx.globalAlpha = Math.min(0.44, fFade * 0.44);
          ctx.fillStyle = col;
          for (const sx of [-1, 1]) {
            for (const sy of [-1, 1]) {
              const bx = px + sx * 38;
              const by = fY + sy * 44;
              ctx.fillRect(sx < 0 ? bx : bx - 14, by - 2, 14, 4);
              ctx.fillRect(bx - 2, sy < 0 ? by : by - 14, 4, 14);
            }
          }
          for (let k = 0; k < 8; k++) {
            const ang = (k / 8) * Math.PI * 2 + this.haloPhase * 9.0;
            const ox = Math.round(px + Math.cos(ang) * (28 + fu * 18));
            const oy = Math.round(fY + Math.sin(ang) * (48 * 0.45));
            ctx.fillStyle = k % 2 === 0 ? '#fde047' : col;
            ctx.fillRect(ox - 2, oy - 2, 4, 4);
          }
        }
        // Horizontal cross-stage neon starlight ribbon zipping from `fromX` to `toX` (`alpha <= 0.40`)
        ctx.globalAlpha = Math.min(0.40, fFade * 0.40);
        for (let s = 0; s < 28; s++) {
          const su = s / 27;
          const sx = Math.round((fx.fromX + (fx.toX - fx.fromX) * su) / 2) * 2;
          const sy = Math.round((fY + Math.sin(su * Math.PI * 4 - fu * 12) * 14) / 2) * 2;
          ctx.fillStyle = s % 3 === 0 ? '#fde047' : s % 2 === 0 ? '#22d3ee' : '#d946ef';
          ctx.fillRect(sx - 5, sy - 2, 10, 4);
        }
        ctx.restore();
      }
    }

    if (this._beat4Laser) {
      const bl = this._beat4Laser;
      const env = Math.sin(Math.min(1, bl.age / bl.maxLife) * Math.PI);
      this._drawNebulaBeam(ctx, renderer, vfxSheet, bl.x1, bl.y1, bl.x2, bl.y2, 16, '#c084fc', '#22d3ee', env, bl.x2);
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
          env,
          this._supernovaTargetX
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
    PixelForge.drawSheetFrame(ctx, sprites, this, 208, 208, this.walkPhase, isReflection, renderer);
    if (this.hitFlash > 0 && !isReflection) {
      const frameIdx = PixelForge.getFrameIndex(this, this.walkPhase);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.42;
      PixelForge.drawGhostFrame(ctx, sprites, frameIdx, 208, 208);
    }
    ctx.restore();
  }
}
