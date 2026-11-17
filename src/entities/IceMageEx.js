import { Fighter } from './Fighter.js?v=30fps127';
import { PixelForge } from '../engine/PixelForge.js?v=30fps127';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps127';
import {
  GLACIAL_EFFECT_REGISTRY,
  GLACIAL_CRYO_PALETTE,
  BOREALIS_PRISM_PALETTE
} from '../engine/shaders/glacialShaders.js?v=30fps127';

const AUTO_SLICES_EX = [
  [60, 8], // Beat 1 (V0, 0.35s): Borealis Snowflake Circle -> 'cryo_shard' Diamond Comet -> snaps at F03 (63)
  [68, 7], // Beat 2 (V1, 0.33s): Giant Returning 6-Point Snowflake Boomerang Chakram -> snaps at F09 (69)
  [75, 8], // Beat 3 (V2, 0.37s): 3 Sequential Ground-Marching Aurora Glacier Spires (2-hit) -> snaps at F17/F18 (77/78)
  [83, 7]  // Beat 4 (V3, 0.50s): -44px Axel Backstep-Kite -> Sky-Rift 3x Prismatic Diamond-Icicle Lances (3-hit) -> snaps at F25 (85)
];

const BEAT_DURATIONS = [0.35, 0.33, 0.37, 0.50];
const INTRA_COMBO_LINK = 0.015;

// 4x4 Ordered Bayer Stipple Matrix (0..15) for crisp pixel-pure frost pools (alpha <= 0.18, zero radial blur!)
const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5]
];

function drawBayerFrostPool(ctx, cx, cy, rx, ry, hexColor, alpha = 0.16, step = 4) {
  if (alpha <= 0.01 || rx < 4 || ry < 2) return;
  const clampedAlpha = Math.min(0.18, Math.max(0, alpha));
  const gx = Math.round(cx / 2) * 2;
  const gy = Math.round(cy / 2) * 2;
  const irx = Math.round(rx / step) * step;
  const iry = Math.max(step, Math.round(ry / step) * step);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = hexColor;
  ctx.globalAlpha = clampedAlpha;

  for (let dy = -iry; dy <= iry; dy += step) {
    const ny = dy / Math.max(1, iry);
    for (let dx = -irx; dx <= irx; dx += step) {
      const nx = dx / Math.max(1, irx);
      const d2 = nx * nx + ny * ny;
      if (d2 > 1.0) continue;
      const falloff = 1.0 - d2;
      const bx = ((dx / step) & 3 + 4) & 3;
      const by = ((dy / step) & 3 + 4) & 3;
      if (falloff * 16.0 > BAYER_4X4[by][bx]) {
        ctx.fillRect(gx + dx, gy + dy, step, step);
      }
    }
  }
  ctx.restore();
}

function drawPixelSnowflakeMote(ctx, x, y, arm = 4, coreHex = '#ffffff', tipHex = '#67e8f9', alpha = 0.92) {
  if (alpha <= 0.02) return;
  const px = Math.round(x / 2) * 2;
  const py = Math.round(y / 2) * 2;
  const s = Math.max(2, Math.round(arm / 2) * 2);
  ctx.save();
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.fillStyle = tipHex;
  // 6-branch pixel snowflake silhouette on 2x2 grid
  ctx.fillRect(px - s, py, s * 2 + 2, 2);
  ctx.fillRect(px, py - s, 2, s * 2 + 2);
  ctx.fillRect(px - s + 2, py - s + 2, 2, 2);
  ctx.fillRect(px + s - 2, py - s + 2, 2, 2);
  ctx.fillRect(px - s + 2, py + s - 2, 2, 2);
  ctx.fillRect(px + s - 2, py + s - 2, 2, 2);
  ctx.fillStyle = coreHex;
  ctx.fillRect(px, py, 2, 2);
  ctx.restore();
}

function drawPixelDiamondShard(ctx, x, y, size = 4, fillHex = '#67e8f9', rimHex = '#e879f9', alpha = 0.94) {
  if (alpha <= 0.02) return;
  const px = Math.round(x / 2) * 2;
  const py = Math.round(y / 2) * 2;
  const r = Math.max(2, Math.round(size / 2) * 2);
  ctx.save();
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.fillStyle = '#0a0e1e';
  ctx.fillRect(px - r - 2, py, r * 2 + 6, 2);
  ctx.fillRect(px, py - r - 2, 2, r * 2 + 6);
  ctx.fillStyle = rimHex;
  ctx.fillRect(px - r, py, r * 2 + 2, 2);
  ctx.fillRect(px, py - r, 2, r * 2 + 2);
  ctx.fillStyle = fillHex;
  ctx.fillRect(px - r + 2, py - r + 2, Math.max(2, r * 2 - 2), Math.max(2, r * 2 - 2));
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(px, py - 2, 2, 2);
  ctx.restore();
}

function drawAuroraStarGlint(ctx, x, y, arm = 6, accentHex = '#e879f9', alpha = 0.95) {
  if (alpha <= 0.02) return;
  const px = Math.round(x / 2) * 2;
  const py = Math.round(y / 2) * 2;
  const L = Math.max(4, Math.round(arm / 2) * 2);
  ctx.save();
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.fillStyle = accentHex;
  ctx.fillRect(px - L, py, L * 2 + 2, 2);
  ctx.fillRect(px, py - L, 2, L * 2 + 2);
  ctx.fillStyle = '#ffffff';
  const half = Math.max(2, Math.round((L * 0.5) / 2) * 2);
  ctx.fillRect(px - half, py, half * 2 + 2, 2);
  ctx.fillRect(px, py - half, 2, half * 2 + 2);
  ctx.restore();
}

/**
 * Lyra EX (`icemage_ex`) - Newly Born `510px` Winter Empress.
 * Next-Gen Wide-Canvas (`320x240`, `anchorX=112, anchorY=230`) True Long-Range Cryo Artillery Sovereign.
 * Wields the Ornate Borealis Diamond-Snowflake Scepter, conjuring 3D Snowflake Magic Circles,
 * Returning Snowflake Chakrams, Ground-Marching Aurora Spires, Borealis Prism Jaws,
 * Coronation of Nine Ice-Swords, and Eternal Borealis: Zero Kelvin Cathedral.
 * Coexists 100% independently alongside classic Lyra (`icemage`).
 */
export class IceMageEx extends Fighter {
  constructor(x, groundY, facing = 1) {
    const opts = typeof x === 'object' && x !== null ? x : { x, groundY, facing };
    super({
      ...opts,
      name: opts.name || 'Lyra EX',
      maxHp: 3820,
      attackRange: 510,
      moveSpeed: 196,
      autoInterval: 0.96,
      lightColor: 'rgba(103, 232, 249, 1)',
      primaryColor: '#67e8f9',
      secondaryColor: '#e879f9',
      hasTrueUltimate: true,
      trueUltName: 'ETERNAL BOREALIS: ZERO KELVIN CATHEDRAL',
      trueUltDuration: 4.60
    });

    this.heroId = 'icemage_ex';
    this.theme = 'glacial';
    this.secondaryColor = '#e879f9';
    this.deathSfx = 'death_icemage';
    this.hasPoise = true;

    this.autoDuration = BEAT_DURATIONS[0];
    this._postFlurryInterval = 1.32;

    this.skillName = 'BOREALIS PRISM JAWS';
    this.skillMaxCooldown = 4.65;
    this.skillCooldown = 1.10;
    this.skillDuration = 1.06;
    this.skillTriggerRange = 520;

    this.ultName = 'CORONATION OF NINE ICE-SWORDS';
    this.ultSub = 'AURORA CROWN HALO & SOVEREIGN PALISADE';
    this.ultDuration = 2.04;

    this.trueUltName = 'ETERNAL BOREALIS: ZERO KELVIN CATHEDRAL';
    this.trueUltSub = 'SOVEREIGN SCEPTER-TAP - 0.00 K SANCTUARY';
    this.trueUltDuration = 4.60;

    this.dodgeMaxCooldown = 3.00;
    this.dashMaxCooldown = 3.02;
    this.wallFlipCooldown = 0;
    this.crouchCooldown = 0;
    this.crouchDuration = 0.92;
    this.isCrouching = false;
    this.isDeflecting = false;
    this.vaultCooldown = 0;
    this.isFlipVault = false;
    this.flipStartX = this.x;
    this.flipTargetX = this.x;
    this.cameraAirLift = 0;
    this._spawnedJumpSteps = 0;

    // 4-Beat Long-Range Winter Empress Combo State
    this.comboStep = 0;
    this._autoVariant = 0;
    this._comboPersistTimer = 0;
    this._queuedNextBeat = false;
    this._intraLinkTimer = 0;
    this._beatHitMask = 0;
    this._beatStartX = this.x;
    this._beatTargetX = this.x;
    this._bootsPlanted = false;
    this._skateSparkAcc = 0;

    // Bespoke Borealis Sovereign Constructs & Pixel-Pure Particle Pools (0 blurry radial blobs!)
    this.permafrostZones = [];
    this.activeChakrams = [];
    this.activeMarchingSpires = [];
    this.activeSkyIcicles = [];
    this.activeCrystalPrisons = [];
    this.skyIceSteps = [];
    this.iceDecoy = null;
    this.iceWall = null;
    this.glacierJaws = null;
    this.coronationDomain = null;
    this.activeFrostRings = [];
    this.pixelSnowMotes = [];
    this.pixelDiamondShards = [];
    this.auroraGlints = [];
    this.afterimages = [];
    this.afterimageAccum = 0;
    this.activeVfxAnims = [];
    this.ambientMoteAccum = 0;

    // Skill / Overdrive / True Ultimate State
    this._skillStepMask = 0;
    this._ultInit = false;
    this._ultSwordsDropped = 0;
    this._ultDidCrownPlunge = false;
    this._ultCenterX = 600;
    this._trueUltStep = 0;
    this._trueUltCoffinX = 600;
    this._trueUltShatterTimer = 0;
    this._trueUltCracks = [];
    this._trueUltGlassShards = [];
    this._trueUltDiamondDust = [];
    this._trueUltSnowfall = [];
    this._trueUltSnowfallInit = false;
    this._overrideFrameIdx = null;

    // Wide 2160x1380 world-space dual-buffer coverage so Ultimate / True Ultimate shaders never clip borders
    this.fx = new ArcaneShaderFX(GLACIAL_EFFECT_REGISTRY, {
      pixelScale: 3,
      viewW: 720,
      viewH: 460,
      topRatio: 0.78
    });

    if (typeof Image !== 'undefined') {
      this.getExSprites();
      PixelForge.ensureHeroLoaded?.('icemage_ex');
    }
  }

  getAiStyleProfile() {
    return {
      comboGoal: 4,
      sweetMin: 310,
      sweetMax: 435,
      counterCrouchBias: 0.58,
      midLeapMin: 0,
      midLeapMax: 0,
      midLeapChance: 0,
      postStyle: 'cryo_artillery'
    };
  }

  isHackAndSlashMelee() {
    return false;
  }

  getExSprites() {
    if (typeof Image === 'undefined') return null;
    const assets = PixelForge.initAssets?.();
    if (!assets) return null;
    if (!assets.icemage_ex) {
      const mkImg = (src) => {
        const img = new Image();
        img._origSrc = src;
        img.src = src;
        return img;
      };
      assets.icemage_ex = {
        sheet: mkImg('assets/sprites/icemage_ex_sheet.png?v=30fps127'),
        vfx: mkImg('assets/sprites/icemage_ex_vfx.png?v=30fps127'),
        portrait: mkImg('assets/sprites/icemage_ex_portrait.png?v=30fps127'),
        cellW: 320,
        cellH: 240,
        anchorX: 112,
        anchorY: 230
      };
    } else {
      PixelForge.ensureHeroLoaded?.('icemage_ex');
    }
    return assets.icemage_ex;
  }

  setState(newState) {
    const prevState = this.state;
    if (
      prevState === 'AUTO_ATTACK' &&
      newState !== 'AUTO_ATTACK' &&
      newState !== 'JUMP' &&
      newState !== 'DODGE' &&
      newState !== 'ULTIMATE' &&
      newState !== 'TRUE_ULTIMATE'
    ) {
      this.y = this.groundY;
      this.vy = 0;
    }

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
      this._skillStepMask = 0;
      this.afterimageAccum = 0;
      this.isDeflecting = false;
      this.glacierJaws = null;
      this.skillCooldown = Math.max(this.skillCooldown || 0, this.skillMaxCooldown);
    }

    if (newState === 'ULTIMATE') {
      this._ultInit = false;
      this._ultSwordsDropped = 0;
      this._ultDidCrownPlunge = false;
      this.coronationDomain = null;
      this.isInvulnerable = true;
    } else {
      this._ultInit = false;
    }

    if (newState === 'TRUE_ULTIMATE') {
      this._trueUltStep = 0;
      this.isInvulnerable = true;
      this.unstoppablePoise = true;
      this.clearPermafrostZones();
      this._buildTrueUltFracturesAndShards();
      this._trueUltSnowfallInit = false;
      for (let i = 0; i < this._trueUltSnowfall.length; i++) {
        this._trueUltSnowfall[i].active = false;
      }
    } else if (prevState === 'TRUE_ULTIMATE') {
      this.cameraAirLift = 0;
      this.unstoppablePoise = false;
    }

    if (
      newState !== 'JUMP' &&
      newState !== 'DODGE' &&
      newState !== 'DASH' &&
      newState !== 'AUTO_ATTACK'
    ) {
      this.fx?.stopByKey('glacialSkateRibbon');
    }

    if (newState === 'DEATH' || newState === 'VICTORY') {
      this.activeSkyIcicles.length = 0;
      this.clearPermafrostZones();
      this.glacierJaws = null;
      this.coronationDomain = null;
      this.cameraAirLift = 0;
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      this._trueUltShatterTimer = 0;
      this._trueUltSnowfallInit = false;
      for (let i = 0; i < this._trueUltSnowfall.length; i++) {
        this._trueUltSnowfall[i].active = false;
      }
      if (newState === 'DEATH') {
        this.fx?.clear();
      }
    }
  }

  _clampArenaX(xv, game) {
    const g = game || this.game;
    const margin = 84;
    const advBounds =
      g?.adventure?.active && typeof g.adventure.getActiveStageBounds === 'function'
        ? g.adventure.getActiveStageBounds()
        : null;
    const minX =
      g?.adventure?.lockActive && Number.isFinite(g.adventure.lockMinX)
        ? g.adventure.lockMinX
        : advBounds
          ? advBounds.minX + 44
          : margin;
    const ww = g?.renderer ? g.renderer.worldWidth : 1200;
    const rawMaxX =
      g?.adventure?.lockActive && Number.isFinite(g.adventure.lockMaxX)
        ? g.adventure.lockMaxX
        : advBounds
          ? advBounds.maxX - 44
          : ww - margin;
    const bossAlive = Boolean(
      g?.adventure?.bossEntity &&
        !g.adventure.bossEntity.isDead &&
        g.adventure.bossEntity.isColossalBoss
    );
    const maxX = bossAlive
      ? Math.min(rawMaxX, (g.adventure.bossEntity.anchorX || 9335) - 94)
      : rawMaxX;
    return Math.max(minX, Math.min(maxX, xv));
  }

  _safeFxX(xv, game) {
    const g = game || this.game;
    const ww = g?.renderer ? g.renderer.worldWidth : 1200;
    return Math.max(48, Math.min(ww - 48, xv));
  }

  _safeFxY(yv) {
    return Math.max(-140, Math.min(this.groundY + 18, yv));
  }

  clearPermafrostZones() {
    this.permafrostZones.length = 0;
  }

  /**
   * Initializes one beat (`0..3`) of Lyra EX's 4-beat Long-Range Winter Empress combo:
   * - Maintains `310..435px` cryo artillery spacing (`-28px` figure-skate retreat when `dist < 215`)!
   * - Executes a signature **`-44px` Axel Backstep-Kite on `V3`**!
   */
  _beginComboBeat(beatIdx, game) {
    const g = game || this.game;
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
    this._skateSparkAcc = 0;
    this._comboPersistTimer = 0.78;
    this.unstoppablePoise = v >= 2;

    const startFrame = AUTO_SLICES_EX[v][0];
    this.trueUltFrameOverride = startFrame;
    this._overrideFrameIdx = startFrame;

    const enemy = this._currentEnemy || g?.getTargetFor?.(this) || null;
    if (enemy && !enemy.isDead && !enemy.isDummyFocal) {
      this.facing = enemy.x >= this.x ? 1 : -1;
    }

    this._beatStartX = this.x;
    let desiredX = this.x;
    if (v === 3) {
      // Signature -44px Axel Backstep-Kite on V3!
      desiredX = this.x - this.facing * 44;
    } else if (enemy && !enemy.isDead) {
      const dist = Math.abs(enemy.x - this.x);
      if (dist < 215) {
        desiredX = this.x - this.facing * 28;
      } else if (dist > 455) {
        desiredX = this.x + this.facing * 14;
      } else {
        desiredX = this.x + this.facing * (v === 2 ? 8 : 4);
      }
    } else {
      desiredX = this.x + this.facing * 6;
    }

    this._beatTargetX = this._clampArenaX(desiredX, g);
    this.ensureGlacialSkateRibbon();
  }

  queueNextComboBeat() {
    this._queuedNextBeat = true;
  }

  ensureGlacialSkateRibbon() {
    if (!this.fx) return;
    if (!this.fx.active.some((s) => s.key === 'glacialSkateRibbon')) {
      this.fx.spawn('glacialSkateRibbon', this._safeFxX(this.x - this.facing * 12), this._safeFxY(this.y - 10), {
        follow: this,
        offsetX: -12,
        offsetY: -10,
        flip: this.facing < 0,
        light: 1.12
      });
    }
  }

  spawnSnowflakeBurst(x, y, count = 6, speed = 135, isAurora = false) {
    for (let i = 0; i < count; i++) {
      if (this.pixelSnowMotes.length >= 44) this.pixelSnowMotes.shift();
      const ang = (i / Math.max(1, count)) * Math.PI * 2 + (i % 2) * 0.32;
      const spd = speed * (0.55 + (i % 3) * 0.25);
      this.pixelSnowMotes.push({
        x: x + Math.cos(ang) * 8,
        y: y + Math.sin(ang) * 8,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 28,
        arm: i % 2 === 0 ? 4 : 6,
        tipHex: isAurora && i % 2 === 0 ? '#e879f9' : '#67e8f9',
        age: 0,
        maxLife: 0.38 + (i % 3) * 0.10
      });
    }
  }

  spawnDiamondShardBurst(x, y, count = 8, speed = 185, isAurora = false) {
    for (let i = 0; i < count; i++) {
      if (this.pixelDiamondShards.length >= 48) this.pixelDiamondShards.shift();
      const ang = (i / Math.max(1, count)) * Math.PI * 2 + 0.19;
      const spd = speed * (0.58 + (i % 4) * 0.18);
      this.pixelDiamondShards.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 54,
        size: i % 3 === 0 ? 6 : 4,
        fillHex: i % 2 === 0 ? '#67e8f9' : '#cffafe',
        rimHex: isAurora || i % 3 === 0 ? '#e879f9' : '#38bdf8',
        age: 0,
        maxLife: 0.34 + (i % 3) * 0.08
      });
    }
    this.spawnAuroraGlint(x, y, 8, isAurora ? '#e879f9' : '#67e8f9', 0.24);
  }

  spawnAuroraGlint(x, y, arm = 8, hex = '#e879f9', maxLife = 0.24) {
    if (this.auroraGlints.length >= 28) this.auroraGlints.shift();
    this.auroraGlints.push({
      x,
      y,
      arm,
      hex,
      age: 0,
      maxLife
    });
  }

  spawnAfterimage(x, y, facing, row = 2, col = 3, maxLife = 0.22, tint = 'cryo') {
    if (this.afterimages.length >= 12) this.afterimages.shift();
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
    if (this.activeVfxAnims.length >= 22) this.activeVfxAnims.shift();
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
      foreground: opts.foreground !== false,
      followOwner: Boolean(opts.followOwner),
      offsetX: opts.offsetX || 0,
      offsetY: opts.offsetY || 0
    });
  }

  spawnPixelFrostRing(x, y, maxRadius = 112, color = '#67e8f9', maxLife = 0.30, isFloor = false, hasSpikes = false) {
    if (this.fx) {
      const sx = this._safeFxX(x);
      const sy = this._safeFxY(y);
      this.fx.spawn('absoluteZeroShatterBurst', sx, sy, {
        light: hasSpikes ? 1.24 : 1.08,
        extra: { isLarge: maxRadius >= 115 || hasSpikes }
      });
    }
    this.spawnSnowflakeBurst(x, y, hasSpikes ? 8 : 5, hasSpikes ? 160 : 115, color === '#e879f9');
    if (hasSpikes) {
      if (this.activeFrostRings.length >= 10) this.activeFrostRings.shift();
      this.activeFrostRings.push({
        x,
        y,
        maxRadius,
        color,
        life: 0,
        maxLife,
        isFloor
      });
    }
  }

  /**
   * 4-Stack Crystal Freeze Passive (`HOARFROST RIME [1..4]` -> `SOLID CRYSTAL FREEZE!`):
   * Stacks Hoarfrost Rime on ranged cryo hits; at 4 stacks encases foe in a translucent Row-6
   * Crystal Sarcophagus (`0.44s` solid freeze stun), deals crit shatter damage, and heals `+14 HP`!
   */
  applyBrittleFrost(enemy, game, stacksToAdd = 1) {
    if (!enemy || enemy.isDead) return;
    enemy.brittleStacks = (enemy.brittleStacks || 0) + stacksToAdd;
    enemy.brittleDecayTimer = 5.6;

    if (enemy.brittleStacks >= 4) {
      this.triggerBrittleShatter(enemy, game || this.game, enemy.x, enemy.y - 88);
    } else if (game?.vfx) {
      const sCount = Math.min(3, enemy.brittleStacks);
      game.vfx.spawnDamageText(
        enemy.x,
        enemy.y - 148,
        0,
        false,
        `HOARFROST RIME [${sCount}/4]`,
        '#a5f3fc'
      );
    }
  }

  triggerBrittleShatter(enemy, game, _originX, _originY) {
    if (!enemy || enemy.isDead) return;
    enemy.brittleStacks = 0;
    enemy.brittleDecayTimer = 0;

    const isVanguard = enemy.hasPoise && enemy.attackRange <= 160;
    const shatterDmg = isVanguard ? 46 : 52;
    enemy.takeDamage(shatterDmg, this, true, 68, -82);

    if (
      enemy.state !== 'ULTIMATE' &&
      enemy.state !== 'TRUE_ULTIMATE' &&
      !enemy.isDead &&
      !enemy.isColossalBoss
    ) {
      enemy.stunTimer = Math.max(enemy.stunTimer || 0, 0.44);
      enemy.vx *= 0.15;
    }

    if (this.activeCrystalPrisons.length >= 6) this.activeCrystalPrisons.shift();
    this.activeCrystalPrisons.push({
      target: enemy,
      x: enemy.x,
      y: enemy.y,
      life: 0,
      maxLife: 0.50
    });

    this.heal(14, 'CRYO MIRROR SHIELD');
    this.spawnDiamondShardBurst(enemy.x, enemy.y - 96, 12, 210, true);

    if (game) {
      game.audio?.play?.('ice_shatter', enemy.x);
      game.renderer?.triggerShake?.(12, 0.22);
      game.renderer?.triggerAberration?.(7);
      game.vfx?.spawnDamageText?.(enemy.x, enemy.y - 176, 0, true, 'SOLID CRYSTAL FREEZE!', '#67e8f9');
      game.vfx?.spawnGlyphBurst?.(enemy.x, enemy.y - 96, 4, 'glacial');
      this.spawnPixelFrostRing(enemy.x, enemy.y - 96, 128, '#67e8f9', 0.34, false, true);
    }
  }

  _gatherZoneTargets(primaryEnemy, game, centerX, radius = 180) {
    const targets = [];
    const seen = new Set();
    const isAdv = Boolean(game?.isAdventureMode?.() && game?.adventure?.active);
    const myGy = this.groundY || this.y;

    const consider = (foe) => {
      if (!foe || foe === this || foe.isDead || foe.isBenched || seen.has(foe)) return;
      const hitPad = foe.isColossalBoss ? 90 : 0;
      if (Math.abs(foe.x - centerX) > radius + hitPad) return;
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
    if (isAdv && Array.isArray(game.adventure.enemies)) {
      for (let i = 0; i < game.adventure.enemies.length; i++) consider(game.adventure.enemies[i]);
    }
    if (isAdv && game.adventure.bossEntity) {
      consider(game.adventure.bossEntity);
    }
    return targets;
  }

  /**
   * Fires a high-velocity Borealis `'cryo_shard'` Prismatic Diamond-Snowflake Comet up to `600px`!
   */
  fireCryoShardBurst(game, opts = {}) {
    const dir = opts.dir ?? this.facing;
    const spawnX = opts.x ?? this.x + dir * 74;
    const spawnY = opts.y ?? this.y - 92;
    const frostStacks = opts.frostStacks ?? 1;
    const hitStop = opts.hitStop ?? 0.044;

    this._hitStopTimer = Math.max(this._hitStopTimer || 0, hitStop);
    this.didActionFrame = true;

    const proj = {
      x: spawnX,
      y: spawnY,
      vx: dir * (opts.speed ?? 750),
      vy: opts.vy ?? 0,
      radius: opts.radius ?? 22,
      damage: opts.damage ?? 32,
      owner: this,
      color: '#67e8f9',
      coreColor: '#ffffff',
      type: 'cryo_shard',
      pierce: opts.pierce !== false,
      isUltimate: Boolean(opts.isUltimate),
      maxRange: opts.maxRange ?? 585,
      ringTimer: 0,
      onHit: (target, g) => {
        const activeG = g || game || this.game;
        this._hitStopTimer = Math.max(this._hitStopTimer || 0, hitStop);
        if (target && !target.isDead && !target.isColossalBoss) {
          target._hitShakeTimer = Math.max(target._hitShakeTimer || 0, 0.056);
        }
        this.spawnDiamondShardBurst(target ? target.x : spawnX, (target ? target.y : this.groundY) - 92, 6, 155, true);
        this.spawnVfxAnim(7, target ? target.x : spawnX, (target ? target.y : this.groundY) - 92, 168, 168, 0.22, {
          flipX: dir < 0,
          foreground: true
        });
        if (frostStacks > 0) {
          this.applyBrittleFrost(target, activeG, frostStacks);
        }
      }
    };

    if (game?.vfx?.spawnProjectile) {
      game.vfx.spawnProjectile(proj);
    } else if (game?.spawnProjectile) {
      game.spawnProjectile(proj);
    }

    this.spawnVfxAnim(3, spawnX, spawnY, 124, 156, 0.22, {
      flipX: dir < 0,
      foreground: true
    });
    this.spawnAuroraGlint(spawnX + dir * 12, spawnY, 8, '#67e8f9', 0.20);
    this.spawnSnowflakeBurst(spawnX, spawnY, 4, 95, false);
  }

  /**
   * Beat 2 (`V1`): Giant Returning 6-Point Snowflake Boomerang Chakram flying all the way out past `enemy.x`!
   */
  spawnSnowflakeChakram(enemy, game) {
    if (this.activeChakrams.length >= 3) this.activeChakrams.shift();
    const dir = this.facing;
    const targetX =
      enemy && !enemy.isDead
        ? this._clampArenaX(enemy.x + dir * 56, game)
        : this._clampArenaX(this.x + dir * 430, game);

    this._hitStopTimer = Math.max(this._hitStopTimer || 0, 0.044);
    this.didActionFrame = true;

    this.activeChakrams.push({
      startX: this.x + dir * 68,
      startY: this.y - 96,
      apexX: targetX,
      apexY: (enemy && !enemy.isDead ? enemy.y : this.groundY) - 96,
      x: this.x + dir * 68,
      y: this.y - 96,
      age: 0,
      maxLife: 0.72,
      moteAcc: 0,
      hitOut: false,
      hitBack: false,
      caught: false
    });
    this.fx?.spawn('snowflakeChakramBurst', this._safeFxX(this.x + dir * 68, game), this._safeFxY(this.y - 96), {
      flip: dir < 0,
      light: 1.16
    });
    this.spawnAuroraGlint(this.x + dir * 72, this.y - 96, 8, '#e879f9', 0.22);
  }

  /**
   * Beat 3 (`V2`): 3 Sequential Ground-Marching Aurora Glacier Spires erupting all the way to `enemy.x` (`2-hit`)!
   */
  spawnMarchingGlacierSpires(enemy, game) {
    const dir = this.facing;
    const startX = this.x + dir * 108;
    const endX =
      enemy && !enemy.isDead
        ? this._clampArenaX(enemy.x, game)
        : this._clampArenaX(this.x + dir * 390, game);

    this._hitStopTimer = Math.max(this._hitStopTimer || 0, 0.044);
    this.didActionFrame = true;

    for (let i = 0; i < 3; i++) {
      const frac = (i + 1) / 3;
      const sx = this._clampArenaX(startX + (endX - startX) * frac, game);
      this.activeMarchingSpires.push({
        x: sx,
        y: this.groundY,
        delay: i * 0.055,
        age: 0,
        maxLife: 0.58,
        isAurora: i === 1,
        damage: i === 2 ? 22 : 16,
        frostStacks: i >= 1 ? 1 : 0,
        erupted: false
      });
    }

    if (this.permafrostZones.length >= 3) this.permafrostZones.shift();
    this.permafrostZones.push({
      x: endX,
      y: this.groundY,
      radius: 132,
      life: 0,
      maxLife: 2.1
    });
  }

  /**
   * Beat 4 (`V3`): Overhead Borealis Sky-Rift raining 3x Prismatic Diamond-Icicle Lances onto `enemy.x` (`3-hit`)!
   */
  spawnBorealisSkyIcicles(enemy, game) {
    const baseTargetX =
      enemy && !enemy.isDead
        ? this._clampArenaX(enemy.x, game)
        : this._clampArenaX(this.x + this.facing * 395, game);

    this._hitStopTimer = Math.max(this._hitStopTimer || 0, 0.052);
    this.didActionFrame = true;

    // Overhead Borealis Snowflake Sky-Rift Seal + Foreshortened Ground Snowflake Seal at baseTargetX
    this.spawnVfxAnim(3, baseTargetX, this.groundY - 256, 224, 76, 0.42, {
      flipX: this.facing < 0,
      foreground: true
    });
    this.spawnVfxAnim(5, baseTargetX, this.groundY - 12, 212, 72, 0.42, {
      flipX: this.facing < 0,
      foreground: false
    });

    for (let i = 0; i < 3; i++) {
      const tx = this._clampArenaX(baseTargetX + (i - 1) * 34, game);
      const startX = tx - this.facing * 42;
      const startY = this.groundY - 262 - i * 18;
      this.activeSkyIcicles.push({
        x0: startX,
        y0: startY,
        tx,
        ty: this.groundY - 12,
        x: startX,
        y: startY,
        delay: i * 0.048,
        age: 0,
        flightDur: 0.14,
        damage: i === 1 ? 22 : 16,
        frostStacks: i === 1 ? 2 : 1,
        impacted: false
      });
    }

    this.fx?.spawn('borealisIcicleHail', this._safeFxX(baseTargetX, game), this._safeFxY(this.groundY - 120), {
      flip: this.facing < 0,
      light: 1.2
    });
  }

  onProjectileTrail(p) {
    if (!p || p.type !== 'cryo_shard') return;
    p.ringTimer = (p.ringTimer || 0) + 0.016;
    if (p.ringTimer >= 0.064) {
      p.ringTimer = 0;
      const trailX = p.x - Math.sign(p.vx || 1) * 14;
      if (this.pixelSnowMotes.length < 44) {
        this.pixelSnowMotes.push({
          x: trailX,
          y: p.y + ((Math.round(p.x) % 3) - 1) * 6,
          vx: -Math.sign(p.vx || 1) * 28,
          vy: -14,
          arm: 4,
          tipHex: Math.round(p.x) % 2 === 0 ? '#67e8f9' : '#e879f9',
          age: 0,
          maxLife: 0.24
        });
      }
      this.spawnAuroraGlint(trailX, p.y, 4, '#cffafe', 0.14);
    }
  }

  startCrouch(_enemy, game) {
    this.crouchCooldown = 3.2;
    this.crouchDuration = 0.92;
    this.setState('CROUCH');
    this.isCrouching = true;
    this.isDeflecting = true;
    this.didSecondaryAction = false;
    this.vx = 0;

    const wallX = this._clampArenaX(this.x + this.facing * 82, game);
    this.iceWall = {
      x: wallX,
      y: this.groundY,
      facing: this.facing,
      life: 0,
      maxLife: 2.2,
      refractedCount: 0
    };
    this.spawnSnowflakeBurst(wallX, this.groundY - 64, 6, 110, true);
    game?.audio?.play?.('frost_cast', wallX);
    game?.vfx?.spawnDamageText?.(this.x, this.y - 134, 0, false, 'BOREALIS MIRROR WALL!', '#a5f3fc');
  }

  updateCrouch(_dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.crouchDuration || 0.92;
    this.vx = 0;
    this.isCrouching = true;
    this.isDeflecting = t < 0.58;

    if (this.isDeflecting && game?.vfx?.projectiles) {
      const checkX = this.iceWall ? this.iceWall.x : this.x + this.facing * 72;
      for (const proj of game.vfx.projectiles) {
        if (
          proj.owner !== this &&
          !proj._refractedByLyraEx &&
          Math.abs(proj.x - checkX) < 96 &&
          Math.abs(proj.y - (this.y - 84)) < 96
        ) {
          proj._refractedByLyraEx = true;
          proj.owner = this;
          proj.vx = this.facing * Math.max(640, Math.abs(proj.vx) * 1.2);
          proj.vy = -44;
          proj.color = '#67e8f9';
          proj.coreColor = '#ffffff';
          this.fireCryoShardBurst(game, {
            x: checkX,
            y: proj.y + 12,
            dir: this.facing,
            vy: 44,
            damage: 26,
            speed: 680
          });
          this.gainMana(14);
          this.gainFinisher(8);
          game?.audio?.play?.('prism_beam', checkX);
        }
      }
    }

    // Long-range Borealis Prism Counter-Comet at t = 0.52s
    if (!this.didSecondaryAction && t >= 0.52) {
      this.didSecondaryAction = true;
      this.isDeflecting = false;
      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }
      const sx = this.x + this.facing * 78;
      this.fx?.spawn('cryoPrismMachCone', this._safeFxX(sx, game), this._safeFxY(this.y - 88), {
        flip: this.facing < 0,
        light: 1.22
      });
      this.fireCryoShardBurst(game, {
        x: sx,
        y: this.y - 88,
        damage: 42,
        speed: 780,
        maxRange: 590,
        frostStacks: 2
      });
      game?.audio?.play?.('prism_beam', sx);
    }

    if (t >= dur) {
      this.isCrouching = false;
      this.isDeflecting = false;
      this.setState('IDLE');
    }
  }

  startJump(enemy, game, dirOverride = null) {
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    // Winter Empress kiting Sky-Stair: retreats to long-range sweet-spot (or crosses over if cornered!)
    let retreatDir = dirOverride !== null ? dirOverride : -this.facing;
    if (this.x < 220) retreatDir = 1;
    else if (this.x > ww - 220) retreatDir = -1;

    this.vaultCooldown = 2.8;
    this.dodgeCooldown = Math.max(this.dodgeCooldown || 0, 1.5);
    this.dashDuration = 0.56;
    this.isFlipVault = true;
    this.isInvulnerable = true;
    this.didSecondaryAction = false;
    this._spawnedJumpSteps = 0;
    this.flipStartX = this.x;

    let desiredX = this.x + retreatDir * 285;
    if (enemy && !enemy.isDead && (this.x < 240 || this.x > ww - 240) && Math.abs(enemy.x - this.x) < 230) {
      const openDir = enemy.x < ww * 0.5 ? 1 : -1;
      desiredX = enemy.x + openDir * 355;
    }
    this.flipTargetX = this._clampArenaX(desiredX, game);
    this.vx = 0;
    this.vy = 0;
    this.setState('JUMP');
    this.ensureGlacialSkateRibbon();
    game?.audio?.play?.('zephyr_flip', this.x);
    game?.vfx?.spawnDamageText?.(this.x, this.y - 138, 0, false, 'TRIPLE-AXEL SKY-STAIR!', '#67e8f9');
  }

  updateJump(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.dashDuration || 0.56;
    const u = Math.min(1, Math.max(0, t / dur));

    this.x = this.flipStartX + (this.flipTargetX - this.flipStartX) * (1 - Math.pow(1 - u, 1.85));
    this.y = this.groundY - Math.sin(u * Math.PI) * 114;
    this.isInvulnerable = u < 0.68;

    if (enemy && !enemy.isDead) {
      this.facing = enemy.x >= this.x ? 1 : -1;
    }

    const stepTarget = u >= 0.62 ? 3 : u >= 0.36 ? 2 : u >= 0.14 ? 1 : 0;
    while (this._spawnedJumpSteps < stepTarget) {
      this._spawnedJumpSteps++;
      if (this.skyIceSteps.length >= 6) this.skyIceSteps.shift();
      this.skyIceSteps.push({
        x: this.x,
        y: this.y + 6,
        width: 58,
        life: 0,
        maxLife: 0.72
      });
      this.spawnSnowflakeBurst(this.x, this.y + 4, 3, 75, true);
    }

    this.afterimageAccum += dt;
    if (this.afterimageAccum >= 0.055 && u < 0.82) {
      this.afterimageAccum = 0;
      this.spawnAfterimage(this.x, this.y, this.facing, 8, Math.min(28, Math.floor(u * 30)), 0.20, 'aurora');
    }

    if (!this.didSecondaryAction && u >= 0.50) {
      this.didSecondaryAction = true;
      this.fireCryoShardBurst(game, {
        x: this.x + this.facing * 64,
        y: Math.min(this.groundY - 82, this.y - 46),
        vy: 36,
        damage: 34,
        speed: 740,
        maxRange: 590,
        frostStacks: 1
      });
      game?.audio?.play?.('frost_cast', this.x);
    }

    if (u >= 1) {
      this.y = this.groundY;
      this.vx = 0;
      this.vy = 0;
      this.isFlipVault = false;
      this.isInvulnerable = false;
      game?.vfx?.spawnShockwave?.(this.x, this.groundY - 4, 62, '#67e8f9', 0.22, false, true);
      this.setState('IDLE');
    }
  }

  onStartDodge(_enemy, game, _dir) {
    this.iceDecoy = {
      x: this.x,
      y: this.groundY,
      facing: this.facing,
      life: 0,
      maxLife: 1.65,
      shattered: false
    };
    this.ensureGlacialSkateRibbon();
    game?.audio?.play?.('frost_cast', this.x);
  }

  updateDodge(dt, enemy, game) {
    if (!this.iceDecoy && this.stateTimer < 0.06) {
      this.onStartDodge(enemy, game, this.dashDir);
    }
    this.updateJump(dt, enemy, game);
  }

  onStartDash(enemy, game, dir) {
    this.dashDuration = 0.34;
    this.dashDir = dir || this.facing;
    this.ensureGlacialSkateRibbon();
    game?.audio?.play?.('dash_whoosh', this.x);
    if (this.permafrostZones.length >= 3) this.permafrostZones.shift();
    this.permafrostZones.push({
      x: this._clampArenaX(this.x + this.dashDir * 96, game),
      y: this.groundY,
      radius: 118,
      life: 0,
      maxLife: 1.85
    });
    this.spawnSnowflakeChakram(enemy, game);
  }

  updateDash(dt, enemy, _game) {
    const t = this.stateTimer;
    const dur = this.dashDuration || 0.34;
    const dir = this.dashDir || this.facing;
    this.vy = 0;
    this.y = this.groundY;

    if (t < dur * 0.76) {
      const distToEnemy = enemy && !enemy.isDead ? (enemy.x - this.x) * dir : 999;
      // Brake comfortably at 325px cryo artillery sweet-spot!
      if (distToEnemy <= 325 && distToEnemy >= 190) {
        this.vx = 0;
      } else {
        this.vx = dir * 480;
      }
      this._skateSparkAcc += dt;
      if (this._skateSparkAcc >= 0.038) {
        this._skateSparkAcc = 0;
        this.spawnAfterimage(this.x, this.y, this.facing, 6, Math.min(24, Math.floor((t / dur) * 30)), 0.18, 'cryo');
      }
    } else {
      this.vx = 0;
    }

    if (t >= dur) {
      this.vx = 0;
      this.setState('IDLE');
    }
  }

  updateDashOrDodge(dt, enemy, game) {
    if (this.state === 'DASH') {
      this.updateDash(dt, enemy, game);
    } else {
      this.updateDodge(dt, enemy, game);
    }
  }

  /**
   * 4-Beat Newly Born `510px` Winter Empress Ranged Choreography (`[[60,8],[68,7],[75,8],[83,7]]`):
   * - `V0 (F03)`: Borealis `'cryo_shard'` Prismatic Diamond Comet (`44ms` hit-stop + `1` Freeze stack)!
   * - `V1 (F09)`: Giant Returning 6-Point Snowflake Boomerang Chakram out past `enemy.x`!
   * - `V2 (F17/F18)`: 3 sequential Ground-Marching Aurora Glacier Spires onto `enemy.x` (`2-hit`)!
   * - `V3 (F25)`: `-44px` Axel Backstep-Kite -> Sky-Rift 3x Prismatic Diamond-Icicle Lances + `'cryo_shard'` (`3-hit` + 4-Stack Freeze)!
   */
  updateAutoAttack(dt, enemy, game) {
    this._currentEnemy = enemy;
    this._comboPersistTimer = 0.78;

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
      else localStep = 6 + Math.min(1, Math.floor(((t - 0.25) / 0.10) * 2));
    } else if (v === 1) {
      if (t < 0.06) localStep = 0;
      else if (t < 0.115) localStep = 1;
      else if (t < 0.205) localStep = 2 + Math.min(1, Math.floor(((t - 0.115) / 0.09) * 2));
      else localStep = 4 + Math.min(2, Math.floor(((t - 0.205) / 0.125) * 3));
    } else if (v === 2) {
      if (t < 0.08) localStep = Math.min(1, Math.floor((t / 0.08) * 2));
      else if (t < 0.14) localStep = 2;
      else if (t < 0.195) localStep = 3;
      else localStep = 4 + Math.min(3, Math.floor(((t - 0.195) / 0.175) * 4));
    } else {
      if (t < 0.16) localStep = Math.min(1, Math.floor((t / 0.16) * 2));
      else if (t < 0.24) localStep = 2;
      else localStep = 3 + Math.min(3, Math.floor(((t - 0.24) / 0.26) * 4));
    }

    const frameIdx = sliceStart + Math.min(sliceLen - 1, Math.max(0, localStep));
    this.trueUltFrameOverride = frameIdx;
    this._overrideFrameIdx = frameIdx;

    // Skate positioning -> Crisp Skate-Edge Plant (`vx = 0`) right at `snapT`!
    this.vx = 0;
    if (t < snapT) {
      const glideU = Math.min(1, Math.max(0, t / snapT));
      const eased = 1 - Math.pow(1 - glideU, 2.1);
      this.x = this._beatStartX + (this._beatTargetX - this._beatStartX) * eased;

      if (Math.abs(this._beatTargetX - this._beatStartX) > 20) {
        this._skateSparkAcc += dt;
        if (this._skateSparkAcc >= 0.036) {
          this._skateSparkAcc = 0;
          this.spawnAfterimage(this.x, this.y, this.facing, 2, localStep, 0.16, v === 3 ? 'aurora' : 'cryo');
        }
      }
    } else if (!this._bootsPlanted) {
      this._bootsPlanted = true;
      this.x = this._beatTargetX;
      this.vx = 0;
    }

    // Axel Backstep-Kite Spin-Lift on Beat 4 (`V3`)
    if (v === 3) {
      if (t < 0.24) {
        const airU = t / 0.24;
        this.y = this.groundY - Math.sin(airU * Math.PI) * 56;
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
        const castX = this.x + this.facing * 74;
        game?.audio?.play?.('frost_cast', castX);
        this.fx?.spawn('cryoPrismMachCone', this._safeFxX(castX, game), this._safeFxY(this.y - 92), {
          flip: this.facing < 0,
          light: 1.18
        });
        this.fireCryoShardBurst(game, {
          x: castX,
          y: this.y - 92,
          damage: 34,
          speed: 760,
          maxRange: 590,
          frostStacks: 1,
          hitStop: 0.044
        });
      }
    } else if (v === 1) {
      if ((this._beatHitMask & 1) === 0 && t >= 0.06) {
        this._beatHitMask |= 1;
        game?.audio?.play?.('frost_cast', this.x + this.facing * 72);
        this.spawnSnowflakeChakram(enemy, game);
      }
    } else if (v === 2) {
      if ((this._beatHitMask & 1) === 0 && t >= 0.08) {
        this._beatHitMask |= 1;
        game?.audio?.play?.('frost_cast', this.x);
        this.spawnVfxAnim(3, this.x + this.facing * 24, this.groundY - 10, 208, 76, 0.34, {
          flipX: this.facing < 0,
          foreground: false
        });
        this.spawnMarchingGlacierSpires(enemy, game);
      }
      if ((this._beatHitMask & 2) === 0 && t >= 0.15) {
        this._beatHitMask |= 2;
        game?.audio?.play?.('prism_beam', enemy ? enemy.x : this.x + this.facing * 320);
        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= this.attackRange + 50) {
          enemy.takeDamage(18, this, false, 16, -28);
          enemy._hitShakeTimer = Math.max(enemy._hitShakeTimer || 0, 0.048);
          this.spawnDiamondShardBurst(enemy.x, enemy.y - 88, 6, 150, true);
        }
      }
    } else {
      if ((this._beatHitMask & 1) === 0 && t >= 0.16) {
        this._beatHitMask |= 1;
        game?.audio?.play?.('ice_shatter', enemy ? enemy.x : this.x + this.facing * 340);
        game?.renderer?.triggerShake?.(11, 0.22);
        this.spawnBorealisSkyIcicles(enemy, game);
        this.fireCryoShardBurst(game, {
          x: this.x + this.facing * 72,
          y: Math.min(this.groundY - 82, this.y - 62),
          damage: 28,
          speed: 780,
          maxRange: 595,
          frostStacks: 1,
          hitStop: 0.052
        });
      }
    }

    // Seamless Direct Beat Chaining (`0.015s` link across full `510px` range, ZERO return to IDLE!)
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
        Math.abs(enemy.x - this.x) <= this.attackRange + 35;

      if (v < 3 && (this._queuedNextBeat || aiWantsChain || advHoldingAttack)) {
        if (game?.adventure?.queuedAction === 'attack') {
          game.adventure.queuedAction = null;
        }
        this._queuedNextBeat = false;
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
   * REMADE SKILL (`4.65s CD`, `1.06s`, Row 3 `90..119`):
   * `BOREALIS PRISM JAWS` — Summons Twin Towering Faceted Aurora-Orchid & Cyan Ice-Monoliths
   * flanking `enemy.x` over pixel-dithered Borealis floor mirrors, slamming inward into a
   * shattering Diamond-Lotus Nova!
   */
  updateSkill(_dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.skillDuration || 1.06;
    this.unstoppablePoise = true;
    this.vx = 0;
    this.vy = 0;

    if (enemy && !enemy.isDead && t < 0.20) {
      this.facing = enemy.x >= this.x ? 1 : -1;
    }

    const targetCenter = this._clampArenaX(
      enemy && !enemy.isDead ? enemy.x : this.x + this.facing * 360,
      game
    );

    // Step 1 (t = 0.12s): Erupt Twin Flanking Aurora-Orchid & Cyan Ice-Monoliths over Borealis Floor Mirrors!
    if ((this._skillStepMask & 1) === 0 && t >= 0.12) {
      this._skillStepMask |= 1;
      this.didActionFrame = true;
      this.glacierJaws = {
        centerX: targetCenter,
        span: 156,
        slammed: false,
        fade: 1.0,
        age: 0
      };
      game?.audio?.play?.('frost_cast', targetCenter);
      game?.vfx?.spawnDamageText?.(targetCenter, this.groundY - 208, 0, true, 'BOREALIS PRISM JAWS!', '#e879f9');
      this.fx?.spawn('blizzardJawsVortex', this._safeFxX(targetCenter, game), this._safeFxY(this.groundY - 82), {
        flip: this.facing < 0,
        light: 1.22
      });
      this.spawnSnowflakeBurst(targetCenter - 148, this.groundY - 72, 6, 125, false);
      this.spawnSnowflakeBurst(targetCenter + 148, this.groundY - 72, 6, 125, true);
    }

    // Step 2 (t = 0.28s): Crystalline Mirror Resonance Pulse pulling target between the Monoliths
    if ((this._skillStepMask & 2) === 0 && t >= 0.28) {
      this._skillStepMask |= 2;
      const cx = this.glacierJaws ? this.glacierJaws.centerX : targetCenter;
      const foes = this._gatherZoneTargets(enemy, game, cx, 195);
      for (const foe of foes) {
        if (!foe.isColossalBoss) {
          foe.x += (cx - foe.x) * 0.28;
          foe.vx *= 0.2;
        }
        foe.takeDamage(24, this, false, 12, -24);
        foe._hitShakeTimer = Math.max(foe._hitShakeTimer || 0, 0.048);
        this.applyBrittleFrost(foe, game, 1);
      }
      this.spawnAuroraGlint(cx, this.groundY - 96, 10, '#67e8f9', 0.24);
    }

    // Animate Twin Ice-Monoliths slamming inward (`0.32..0.60s`)
    if (this.glacierJaws) {
      this.glacierJaws.age += 0.016;
      if (t < 0.32 && enemy && !enemy.isDead) {
        this.glacierJaws.centerX = this._clampArenaX(enemy.x, game);
      }
      if (t >= 0.32 && t < 0.60) {
        const closeU = (t - 0.32) / 0.28;
        this.glacierJaws.span = 156 * (1 - closeU * closeU * 0.88);
      } else if (t >= 0.60) {
        this.glacierJaws.span = 18;
        this.glacierJaws.fade = Math.max(0, 1 - (t - 0.60) / 0.42);
      }
    }

    // Step 3 (t = 0.60s): Twin Monoliths SLAM Inward -> Shattering Diamond-Lotus Nova!
    if ((this._skillStepMask & 4) === 0 && t >= 0.60) {
      this._skillStepMask |= 4;
      const slamX = this.glacierJaws ? this.glacierJaws.centerX : targetCenter;
      if (this.glacierJaws) this.glacierJaws.slammed = true;

      game?.audio?.play?.('ice_shatter', slamX);
      game?.audio?.play?.('prism_beam', slamX);
      game?.renderer?.triggerShake?.(15, 0.28);

      this.spawnPixelFrostRing(slamX, this.groundY - 92, 152, '#e879f9', 0.38, false, true);
      this.spawnDiamondShardBurst(slamX, this.groundY - 96, 16, 235, true);
      this.spawnSnowflakeBurst(slamX, this.groundY - 88, 10, 165, true);
      this.spawnAuroraGlint(slamX, this.groundY - 108, 12, '#e879f9', 0.30);

      const foes = this._gatherZoneTargets(enemy, game, slamX, 205);
      let hitAny = false;
      for (const foe of foes) {
        foe.takeDamage(62, this, true, 88, -142);
        foe._hitShakeTimer = Math.max(foe._hitShakeTimer || 0, 0.075);
        this.applyBrittleFrost(foe, game, 2);
        hitAny = true;
      }
      if (hitAny) {
        this._hitStopTimer = Math.max(this._hitStopTimer || 0, 0.050);
      }
    }

    if (t >= dur) {
      this.vx = 0;
      this.y = this.groundY;
      this.glacierJaws = null;
      this.unstoppablePoise = false;
      this.setState('IDLE');
    }
  }

  /**
   * REMADE OVERDRIVE (`2.04s`, Row 4 `120..149`):
   * `CORONATION OF NINE ICE-SWORDS` — Suspends 9 faceted Celestial Diamond-Claymores in a luminous
   * Aurora Crown Halo above `enemy.x`, raining 8 outer blades into a Crystal Palisade before
   * plunging the colossal 9th Sovereign Blade!
   */
  updateUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.ultDuration || 2.04;
    this.isInvulnerable = true;
    this.vx = 0;
    this.vy = 0;

    if (!this._ultInit) {
      this._ultInit = true;
      this._ultSwordsDropped = 0;
      this._ultDidCrownPlunge = false;
      this._ultCenterX = this._clampArenaX(
        enemy && !enemy.isDead ? enemy.x : this.x + this.facing * 365,
        game
      );

      // Build 9 suspended Celestial Diamond-Claymores in an Aurora Crown Halo above `_ultCenterX`!
      const haloOffsets = [-168, 168, -124, 124, -80, 80, -38, 38];
      const haloSwords = haloOffsets.map((offX, idx) => ({
        offsetX: offX,
        x: this._clampArenaX(this._ultCenterX + offX, game),
        y: this.groundY - 262 - (idx % 2) * 18,
        dropped: false,
        landed: false,
        dropAge: 0,
        isAurora: idx % 2 === 1
      }));

      this.coronationDomain = {
        centerX: this._ultCenterX,
        age: 0,
        swords: haloSwords,
        crownY: this.groundY - 304,
        crownDropped: false,
        shattered: false
      };

      game?.audio?.play?.('ult_cast', this.x);
      game?.audio?.play?.('frost_cast', this._ultCenterX);
      game?.vfx?.spawnDamageText?.(
        this._ultCenterX,
        this.groundY - 232,
        0,
        true,
        'CORONATION OF NINE ICE-SWORDS!',
        '#67e8f9'
      );
      this.fx?.spawn('borealisCathedralDomain', this._safeFxX(this._ultCenterX, game), this._safeFxY(this.groundY - 4), {
        flip: this.facing < 0,
        light: 1.28
      });
    }

    if (enemy && !enemy.isDead && t < 1.16) {
      this._ultCenterX = this._clampArenaX(enemy.x, game);
      if (this.coronationDomain) {
        this.coronationDomain.centerX = this._ultCenterX;
        for (const sw of this.coronationDomain.swords) {
          if (!sw.dropped) {
            sw.x = this._clampArenaX(this._ultCenterX + sw.offsetX, game);
          }
        }
      }
    }
    const cx = this._ultCenterX;
    if (this.coronationDomain) this.coronationDomain.age += dt;

    // Regal Scepter Levitation during Coronation Choir (`0.00..1.44s`)
    if (t < 1.44) {
      const liftU = Math.min(1, t / 0.28);
      this.y = this.groundY - 46 * Math.sin(liftU * Math.PI * 0.5);
      this.trueUltFrameOverride = 120 + Math.min(18, Math.floor((t / 1.44) * 19));
      this._overrideFrameIdx = this.trueUltFrameOverride;
    } else {
      const descU = Math.min(1, (t - 1.44) / 0.46);
      const landFrac = Math.min(1, descU / 0.72);
      this.y = this.groundY - Math.round(46 * (1 - landFrac));
      this.trueUltFrameOverride = 139 + Math.min(10, Math.floor(descU * 11));
      this._overrideFrameIdx = this.trueUltFrameOverride;
    }

    // Rain the 8 outer Celestial Diamond-Claymores sequentially (`0.22..0.99s`, every `0.11s`)
    while (this._ultSwordsDropped < 8 && t >= 0.22 + this._ultSwordsDropped * 0.11) {
      const idx = this._ultSwordsDropped++;
      const sw = this.coronationDomain?.swords?.[idx];
      const sx = sw ? sw.x : cx;
      if (sw) {
        sw.dropped = true;
        sw.dropAge = 0;
      }
      game?.audio?.play?.('frost_cast', sx);
      this.spawnAuroraGlint(sx, this.groundY - 248, 8, idx % 2 === 0 ? '#67e8f9' : '#e879f9', 0.22);
    }

    if (this.coronationDomain) {
      for (let i = 0; i < this.coronationDomain.swords.length; i++) {
        const sw = this.coronationDomain.swords[i];
        if (!sw.dropped || sw.landed) continue;
        sw.dropAge += dt;
        const fallU = Math.min(1, sw.dropAge / 0.12);
        const startY = this.groundY - 262 - (i % 2) * 18;
        const pinY = this.groundY - 64;
        sw.y = startY + (pinY - startY) * (fallU * fallU);
        if (fallU >= 1) {
          sw.landed = true;
          sw.y = pinY;
          this.fx?.spawn('coronationSwordImpact', this._safeFxX(sw.x, game), this._safeFxY(this.groundY - 4), {
            light: 1.20,
            extra: { isCenter: false }
          });
          this.spawnSnowflakeBurst(sw.x, this.groundY - 28, 4, 110, sw.isAurora);
          const foes = this._gatherZoneTargets(enemy, game, cx, 225);
          for (const foe of foes) {
            if (!foe.isColossalBoss) {
              foe.x += (cx - foe.x) * 0.18;
            }
            foe.takeDamage(18, this, i % 2 === 1, 8, -18);
            foe._hitShakeTimer = Math.max(foe._hitShakeTimer || 0, 0.044);
          }
        }
      }
    }

    // Plunge the Colossal 9th Sovereign Blade at t = 1.44s!
    if (!this._ultDidCrownPlunge && t >= 1.44) {
      this._ultDidCrownPlunge = true;
      if (this.coronationDomain) {
        this.coronationDomain.crownDropped = true;
        this.coronationDomain.shattered = true;
        this.coronationDomain.crownY = this.groundY - 94;
      }
      game?.audio?.play?.('ice_shatter', cx);
      game?.audio?.play?.('prism_beam', cx);
      game?.renderer?.triggerShake?.(18, 0.34);

      this.fx?.spawn('coronationSwordImpact', this._safeFxX(cx, game), this._safeFxY(this.groundY - 4), {
        light: 1.36,
        extra: { isCenter: true }
      });
      this.spawnPixelFrostRing(cx, this.groundY - 96, 172, '#67e8f9', 0.44, false, true);
      this.spawnDiamondShardBurst(cx, this.groundY - 104, 18, 250, true);
      this.spawnSnowflakeBurst(cx, this.groundY - 92, 12, 180, true);
      this.heal(26, 'SOVEREIGN CORONATION');

      const foes = this._gatherZoneTargets(enemy, game, cx, 250);
      for (const foe of foes) {
        foe.takeDamage(96, this, true, 148, -168);
        this.applyBrittleFrost(foe, game, 2);
      }
    }

    if (t >= dur) {
      this.y = this.groundY;
      this.isInvulnerable = false;
      this.coronationDomain = null;
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      this.setState('IDLE');
    }
  }

  _buildTrueUltFracturesAndShards() {
    this._trueUltCracks = [];
    for (let i = 0; i < 10; i++) {
      const baseAng = (i / 10) * Math.PI * 2 + 0.19;
      const segs = [];
      let px = 0;
      let py = 0;
      for (let s = 1; s <= 4; s++) {
        const jitter = ((i * 17 + s * 31) % 11 - 5) * 0.05;
        const nx = px + Math.cos(baseAng + jitter) * 56;
        const ny = py + Math.sin(baseAng + jitter) * 38;
        segs.push({ x0: Math.round(px), y0: Math.round(py), x1: Math.round(nx), y1: Math.round(ny) });
        px = nx;
        py = ny;
      }
      this._trueUltCracks.push({
        threshold: (i % 5) * 0.14,
        magenta: i % 3 === 0,
        segs
      });
    }

    // 32 Faceted Pixel Glass Prisms (pure integer fillRect bevels on shatter, ZERO ctx.rotate!)
    this._trueUltGlassShards = [];
    for (let i = 0; i < 32; i++) {
      const ang = (i / 32) * Math.PI * 2;
      const spd = 165 + (i % 5) * 46;
      this._trueUltGlassShards.push({
        x: this.x,
        y: this.groundY - 140,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd * 0.75 - 78,
        phase: i * 0.55,
        size: 8 + (i % 3) * 4,
        fillHex: i % 3 === 0 ? '#e879f9' : i % 2 === 0 ? '#67e8f9' : '#cffafe',
        rimHex: i % 2 === 0 ? '#38bdf8' : '#a855f7'
      });
    }

    this._trueUltDiamondDust = [];
    for (let i = 0; i < 36; i++) {
      this._trueUltDiamondDust.push({
        x: 60 + ((i * 97) % 1080),
        y: 28 + ((i * 53) % 380),
        vx: ((i % 5) - 2) * 14,
        vy: 42 + (i % 4) * 16,
        size: i % 3 === 0 ? 6 : 4,
        magenta: i % 3 === 0
      });
    }
  }

  _getTrueUltCamCenter(game) {
    const g = game || this.game;
    if (g?.renderer && Number.isFinite(g.renderer.camX)) return g.renderer.camX;
    if (g?.renderer && Number.isFinite(g.renderer.worldWidth)) return g.renderer.worldWidth * 0.5;
    if (Number.isFinite(this._trueUltCoffinX)) return this._trueUltCoffinX;
    return Number.isFinite(this.x) ? this.x : 600;
  }

  _initTrueUltSnowfall(game) {
    const camCenter = this._getTrueUltCamCenter(game);
    const gy = Number.isFinite(this.groundY) ? this.groundY : 520;
    const minX = camCenter - 780;
    const spanX = 1560;
    const minY = gy - 580;
    const spanY = 600;
    const TOTAL_FLAKES = 72;

    for (let i = 0; i < TOTAL_FLAKES; i++) {
      const layer = i % 3;
      const hx = (i * 0.61803398875 + layer * 0.17) % 1;
      const hy = ((i * 29 + 7) % TOTAL_FLAKES) / TOTAL_FLAKES;
      const x = minX + hx * spanX;
      const y = minY + hy * spanY;
      const arm = layer === 2 ? (i % 2 === 0 ? 6 : 4) : layer === 1 ? (i % 4 === 0 ? 6 : 4) : 2;
      const isStreak = layer === 2 && i % 2 === 1;
      const hex =
        layer === 0
          ? i % 2 === 0
            ? '#93c5fd'
            : '#bae6fd'
          : layer === 1
            ? i % 4 === 0
              ? '#e879f9'
              : '#67e8f9'
            : isStreak
              ? '#38bdf8'
              : '#bae6fd';
      let slot = this._trueUltSnowfall[i];
      if (!slot) {
        slot = {};
        this._trueUltSnowfall[i] = slot;
      }
      slot.layer = layer;
      slot.x = x;
      slot.y = y;
      slot.vx = -48;
      slot.vy = 160 + layer * 40;
      slot.phase = i * 0.87;
      slot.arm = arm;
      slot.isStreak = isStreak;
      slot.hex = hex;
      slot.active = i < 24;
    }
    this._trueUltSnowfall.length = TOTAL_FLAKES;
    this._trueUltSnowfallInit = true;
  }

  _updateTrueUltSnowfall(dt, game) {
    const inUlt = this.state === 'TRUE_ULTIMATE';
    if (inUlt && (this.stateTimer || 0) < 0.04) return;
    if (!inUlt && this._trueUltShatterTimer <= 0) return;

    if (!this._trueUltSnowfallInit || this._trueUltSnowfall.length !== 72) {
      this._initTrueUltSnowfall(game);
    }

    const castChargeU = inUlt ? Math.min(1, Math.max(0, (this.stateTimer || 0) / 3.24)) : 1;
    const activeCount = Math.min(72, Math.max(24, Math.round(24 + 48 * castChargeU)));
    const camCenter = this._getTrueUltCamCenter(game);
    const minX = camCenter - 780;
    const spanX = 1560;
    const gy = Number.isFinite(this.groundY) ? this.groundY : 520;
    const minY = gy - 580;
    const spanY = 600;
    const tVal = inUlt ? this.stateTimer || 0 : 3.4;
    const windStrength = 48 + 168 * castChargeU;

    for (let i = 0; i < this._trueUltSnowfall.length; i++) {
      const p = this._trueUltSnowfall[i];
      p.active = i < activeCount;
      const layerFrac = p.layer * 0.5;
      const speedBlend = Math.min(1, 0.30 * layerFrac + 0.70 * castChargeU);
      const jitterVy = (((i * 13) % 7) - 3) * 6;
      const vy = Math.max(160, Math.min(440, 160 + 280 * speedBlend + jitterVy));
      const vx =
        -windStrength * (0.48 + p.layer * 0.32) +
        Math.sin(tVal * 3.1 + p.phase) * (18 + p.layer * 10);
      p.vx = vx;
      p.vy = vy;
      p.x += vx * dt;
      p.y += vy * dt;
      p.y = minY + ((((p.y - minY) % spanY) + spanY) % spanY);
      p.x = minX + ((((p.x - minX) % spanX) + spanX) % spanX);
    }
  }

  _getTrueUltSnowFade() {
    if (this.isDead || !this._trueUltSnowfallInit || this._trueUltSnowfall.length === 0) return 0;
    if (this.state === 'TRUE_ULTIMATE') {
      const t = this.stateTimer || 0;
      if (t < 0.04) return 0;
      const fadeIn = Math.min(1, Math.max(0.32, (t - 0.04) / 0.18));
      const dur = this.trueUltDuration || 4.60;
      const fadeOut = Math.min(1, Math.max(0, (dur - t) / 0.42));
      return fadeIn * fadeOut;
    }
    if (this._trueUltShatterTimer > 0) {
      return Math.min(1, this._trueUltShatterTimer / 0.45);
    }
    return 0;
  }

  /**
   * REMADE SUPREME ULTIMATE (`4.60s`):
   * `ETERNAL BOREALIS: ZERO KELVIN CATHEDRAL`
   * Multi-curtain Northern Lights pixel tapestry + 6-Pillar Borealis Snowflake Sanctuary +
   * Zero-Kelvin Diamond Monolith entombment + Sovereign Scepter-Tap strictly at `t >= 3.28s`
   * (`triggerGlacialStage()` for `glacial`/`shogunate_glacial` synergy!) shattering into
   * 32 faceted pixel glass prisms & 4-point aurora star-glints!
   */
  updateTrueUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    if (t >= 0.04) {
      this._updateTrueUltSnowfall(dt, game);
    }
    const advBounds =
      game?.adventure?.active && typeof game.adventure.getActiveStageBounds === 'function'
        ? game.adventure.getActiveStageBounds()
        : null;
    this.isInvulnerable = true;
    this.unstoppablePoise = true;
    this.vx = 0;
    this.vy = 0;

    const targets = this._gatherZoneTargets(enemy, game, this.x, 960);
    if (enemy && !enemy.isDead && !targets.includes(enemy)) {
      targets.unshift(enemy);
    }

    if (t <= 2.95) {
      const rawX = enemy && !enemy.isDead ? enemy.x : this.x + this.facing * 260;
      this._trueUltCoffinX = this._clampArenaX(rawX, game);
      if (Math.abs(this._trueUltCoffinX - this.x) > 8) {
        this.facing = this._trueUltCoffinX >= this.x ? 1 : -1;
      }
    }

    // Act I (`0.00..1.12s`): Northern Lights Tapestry & 6-Pillar Borealis Snowflake Sanctuary
    if (t < 1.12) {
      const liftU = Math.min(1, t / 0.34);
      const smoothLift = 1 - Math.pow(1 - liftU, 2.2);
      this.y = this.groundY - 92 * smoothLift;
      this.cameraAirLift = 112 * smoothLift;
      this.trueUltFrameOverride = 120 + Math.min(8, Math.floor((t / 1.12) * 9));
      this._overrideFrameIdx = this.trueUltFrameOverride;

      if (t >= 0.04 && this._trueUltStep < 1) {
        this._trueUltStep = 1;
        game?.audio?.play?.('ult_cast', this.x);
        game?.audio?.play?.('frost_cast', this.x);
        game?.vfx?.triggerCinematicCutIn?.(this, this.trueUltName, '#67e8f9');
        game?.vfx?.spawnDamageText?.(
          this.x,
          this.y - 172,
          0,
          true,
          'ZERO KELVIN CATHEDRAL!',
          '#67e8f9'
        );
        this.fx?.spawn(
          'absoluteZeroAuroraVeil',
          this._safeFxX(this._trueUltCoffinX, game),
          this._safeFxY(this.groundY - 6),
          { light: 1.24 }
        );
      }
      return;
    }

    // Act II & Act III (`1.12..3.28s`): Diamond Monolith Entombment & Sovereign Scepter-Tap Windup
    if (t >= 1.12 && this._trueUltStep < 2) {
      this._trueUltStep = 2;
      game?.audio?.play?.('frost_cast', this._trueUltCoffinX);
      game?.audio?.play?.('prism_beam', this._trueUltCoffinX);
      game?.vfx?.spawnDamageText?.(
        this._trueUltCoffinX,
        this.groundY - 248,
        0,
        true,
        'DIAMOND MONOLITH - 0.00 K!',
        '#a5f3fc'
      );
    }

    if (t >= 2.32 && this._trueUltStep < 3) {
      this._trueUltStep = 3;
      game?.audio?.play?.('frost_cast', this._trueUltCoffinX);
      game?.renderer?.triggerShake?.(9, 0.22);
      game?.vfx?.spawnDamageText?.(
        this._trueUltCoffinX,
        this.groundY - 278,
        0,
        true,
        '-273.15 C / SANCTUARY SEALED!',
        '#e879f9'
      );
    }

    if (t >= 1.12 && t < 3.28) {
      this.y = this.groundY - 92 + Math.sin((t - 1.12) * 3.2) * 4;
      this.cameraAirLift = 112;

      if (t < 2.32) {
        const uCmd = (t - 1.12) / 1.20;
        this.trueUltFrameOverride = 129 + Math.min(7, Math.floor(uCmd * 8));
      } else {
        const uTap = (t - 2.32) / 0.96;
        this.trueUltFrameOverride = 137 + Math.min(6, Math.floor(uTap * 7));
      }
      this._overrideFrameIdx = this.trueUltFrameOverride;

      for (const foe of targets) {
        if (foe && !foe.isDead) {
          if (!foe.isColossalBoss) {
            foe.x += (this._trueUltCoffinX - foe.x) * Math.min(1, dt * 18);
            foe.vx = 0;
            foe.vy = 0;
          }
          foe.chronoTimeStopTimer = Math.max(foe.chronoTimeStopTimer || 0, 0.16);
        }
      }
      return;
    }

    // Act IV (`t >= 3.28s`): Sovereign Scepter-Tap Impact -> ZERO KELVIN CATHEDRAL SHATTER!
    if (t >= 3.28 && this._trueUltStep < 4) {
      this._trueUltStep = 4;
      this._trueUltShatterTimer = 1.28;

      const cx = this._trueUltCoffinX;
      const cy = this.groundY - 148;
      for (let i = 0; i < this._trueUltGlassShards.length; i++) {
        const s = this._trueUltGlassShards[i];
        const ang = (i / this._trueUltGlassShards.length) * Math.PI * 2;
        s.x = cx + Math.cos(ang) * 44;
        s.y = cy + Math.sin(ang) * 48;
      }
      if (advBounds) {
        for (let i = 0; i < this._trueUltDiamondDust.length; i++) {
          this._trueUltDiamondDust[i].x = cx - 520 + ((i * 97) % 1040);
          this._trueUltDiamondDust[i].y = 30 + ((i * 53) % 360);
        }
      }

      for (const foe of targets) {
        if (foe) foe.chronoTimeStopTimer = 0;
      }

      // Capture previous stage ID BEFORE glacial stage domain transformation!
      const rawActiveId = game?.renderer?.getActiveStageId?.();
      const rawStageId = game?.renderer?.stageId;
      const prevStageId =
        typeof rawActiveId === 'string' && rawActiveId
          ? rawActiveId
          : typeof rawStageId === 'string' && rawStageId
            ? rawStageId
            : 'cathedral';

      // Strictly trigger Glacial / Shogunate-Glacial Stage Domain Synergy at t >= 3.28s!
      game?.renderer?.triggerGlacialStage?.();
      game?.renderer?.setStageTransformation?.('glacial', 1.0, true, 0);
      game?.renderer?.triggerGlacialStageTransition?.({
        fromStageId: prevStageId,
        focusX: cx,
        duration: 1.38
      });
      if (!advBounds) {
        const finalStg = game?.renderer?.permanentStageOverride || 'glacial';
        game?.renderer?.triggerStageEvent?.(
          finalStg === 'shogunate_glacial' ? 'FROZEN SAKURA SHOGUNATE' : 'PERMAFROST AURORA SANCTUM',
          finalStg === 'shogunate_glacial'
            ? 'BOREALIS RIME-ICE ENCASES THE SHOGUNATE CASTLE'
            : 'ABSOLUTE ZERO CRYSTALLIZES THE ARENA',
          '#67e8f9',
          7.5
        );
      }

      game?.renderer?.triggerImpactFrame?.(cx, this.groundY - 120, 0.06, 'glacial');
      game?.renderer?.triggerShake?.(28, 0.72);
      game?.renderer?.triggerAberration?.(18);
      game?.renderer?.triggerHitStop?.(0.095);

      game?.audio?.play?.('ice_shatter', cx);
      game?.audio?.play?.('time_shatter', cx);
      game?.audio?.play?.('supernova_detonate', cx);
      game?.audio?.play?.('prism_beam', cx);

      this.heal(Math.round(this.maxHp * 0.12), 'BOREALIS SOVEREIGNTY');

      this.fx?.spawn('diamondDustCataclysmNova', this._safeFxX(cx, game), this._safeFxY(this.groundY - 156), {
        light: 1.38
      });
      this.spawnPixelFrostRing(cx, this.groundY - 136, 280, '#67e8f9', 0.52, false, true);
      this.spawnDiamondShardBurst(cx, this.groundY - 136, 20, 265, true);
      this.spawnSnowflakeBurst(cx, this.groundY - 136, 14, 210, true);
      if (game?.vfx?.spawnCrystalSpike) {
        for (const offX of [-148, 0, 148]) {
          game.vfx.spawnCrystalSpike({
            x: this._clampArenaX(cx + offX, game),
            groundY: this.groundY,
            width: offX === 0 ? 72 : 56,
            height: offX === 0 ? 204 : 164,
            color: offX === 0 ? '#67e8f9' : '#e879f9',
            owner: this,
            target: null,
            damage: 0,
            delay: offX === 0 ? 0 : 0.05
          });
        }
      }
      game?.vfx?.spawnGlyphBurst?.(cx, this.groundY - 136, 7, 'glacial');
      game?.vfx?.spawnDamageText?.(
        cx,
        this.groundY - 284,
        0,
        true,
        'ZERO KELVIN SHATTER!',
        '#f0f9ff'
      );

      for (const foe of targets) {
        if (foe && !foe.isDead) {
          foe.chronoTimeStopTimer = 0;
          foe.brittleStacks = 0;
          foe.takeDamage(675, this, true, 320, -250);
        }
      }
    }

    const descU = Math.min(1, Math.max(0, (t - 3.28) / Math.max(0.01, this.trueUltDuration - 3.28)));
    const landFrac = Math.min(1, descU / 0.70);
    const smoothDesc = landFrac * landFrac * (3 - 2 * landFrac);
    this.y = this.groundY - Math.round(92 * (1 - smoothDesc));
    this.cameraAirLift = 112 * (1 - smoothDesc);
    this.trueUltFrameOverride = 144 + Math.min(5, Math.floor(descU * 6));
    this._overrideFrameIdx = this.trueUltFrameOverride;

    if (t >= this.trueUltDuration) {
      this.y = this.groundY;
      this.vy = 0;
      this.cameraAirLift = 0;
      this.isInvulnerable = false;
      this.unstoppablePoise = false;
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      if (enemy) enemy.chronoTimeStopTimer = 0;
      this.setState('IDLE');
    }
  }

  updateConstructsAndVfx(dt, enemy, game) {
    if (this._comboPersistTimer > 0 && this.state !== 'AUTO_ATTACK') {
      this._comboPersistTimer = Math.max(0, this._comboPersistTimer - dt);
      if (this._comboPersistTimer <= 0) {
        this.comboStep = 0;
      }
    }

    // Subtle ambient 6-pixel snowflake mote around her Diamond-Snowflake Scepter
    if (!this.isDead) {
      this.ambientMoteAccum += dt;
      if (this.ambientMoteAccum >= 0.24) {
        this.ambientMoteAccum = 0;
        if (this.pixelSnowMotes.length < 40) {
          this.pixelSnowMotes.push({
            x: this.x + this.facing * 58 + ((Math.round(this.x) % 5) - 2) * 8,
            y: this.y - 96 + ((Math.round(this.y) % 3) - 1) * 10,
            vx: this.facing * 12,
            vy: 22,
            arm: 4,
            tipHex: Math.random() < 0.35 ? '#e879f9' : '#67e8f9',
            age: 0,
            maxLife: 0.48
          });
        }
      }
    }

    if (this._trueUltShatterTimer > 0) {
      this._trueUltShatterTimer = Math.max(0, this._trueUltShatterTimer - dt);
      if (this.state !== 'TRUE_ULTIMATE') {
        this._updateTrueUltSnowfall(dt, game);
      }
      for (const s of this._trueUltGlassShards) {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vy += 420 * dt;
        s.phase += dt * 7.5;
      }
      for (const d of this._trueUltDiamondDust) {
        d.x += d.vx * dt;
        d.y += d.vy * dt;
      }
    }

    // Returning 6-Point Snowflake Boomerang Chakrams (Row 1)
    for (let i = this.activeChakrams.length - 1; i >= 0; i--) {
      const ch = this.activeChakrams[i];
      ch.age += dt;
      ch.moteAcc = (ch.moteAcc || 0) + dt;
      const u = Math.min(1, ch.age / ch.maxLife);
      if (u <= 0.54) {
        const uOut = u / 0.54;
        const ease = 1 - Math.pow(1 - uOut, 2);
        ch.x = ch.startX + (ch.apexX - ch.startX) * ease;
        ch.y = ch.startY + (ch.apexY - ch.startY) * ease - Math.sin(uOut * Math.PI) * 26;
        if (!ch.hitOut && enemy && !enemy.isDead && Math.abs(enemy.x - ch.x) <= 78) {
          ch.hitOut = true;
          enemy.takeDamage(26, this, false, 20, 0);
          enemy._hitShakeTimer = Math.max(enemy._hitShakeTimer || 0, 0.052);
          this._hitStopTimer = Math.max(this._hitStopTimer || 0, 0.036);
          this.applyBrittleFrost(enemy, game, 1);
          this.spawnDiamondShardBurst(ch.x, ch.y, 6, 150, true);
        }
      } else {
        const uBack = (u - 0.54) / 0.46;
        ch.x = ch.apexX + (this.x - ch.apexX) * uBack;
        ch.y = ch.apexY + (this.y - 88 - ch.apexY) * uBack + Math.sin(uBack * Math.PI) * 22;
        if (!ch.hitBack && enemy && !enemy.isDead && Math.abs(enemy.x - ch.x) <= 78) {
          ch.hitBack = true;
          enemy.takeDamage(20, this, false, -16, 0);
          this.spawnSnowflakeBurst(ch.x, ch.y, 5, 120, true);
        }
        if (!ch.caught && uBack >= 0.88) {
          ch.caught = true;
          this.heal(7, 'CHAKRAM RETURN');
        }
      }
      if (ch.moteAcc >= 0.055) {
        ch.moteAcc = 0;
        this.spawnAuroraGlint(ch.x, ch.y, 4, '#67e8f9', 0.16);
      }
      if (ch.age >= ch.maxLife) {
        this.activeChakrams.splice(i, 1);
      }
    }

    // Ground-Marching Aurora Glacier Spires (Row 2)
    for (let i = this.activeMarchingSpires.length - 1; i >= 0; i--) {
      const sp = this.activeMarchingSpires[i];
      if (sp.delay > 0) {
        sp.delay -= dt;
        continue;
      }
      if (!sp.erupted) {
        sp.erupted = true;
        this.fx?.spawn('glacierStalagmiteErupt', this._safeFxX(sp.x, game), this._safeFxY(sp.y - 4), {
          light: 1.16
        });
        this.spawnSnowflakeBurst(sp.x, sp.y - 48, 4, 115, sp.isAurora);
        if (enemy && !enemy.isDead && Math.abs(enemy.x - sp.x) <= 84) {
          enemy.takeDamage(sp.damage || 18, this, sp.isAurora, 14, -48);
          enemy._hitShakeTimer = Math.max(enemy._hitShakeTimer || 0, 0.048);
          if (sp.frostStacks > 0) {
            this.applyBrittleFrost(enemy, game, sp.frostStacks);
          }
        }
      }
      sp.age += dt;
      if (sp.age >= sp.maxLife) {
        this.activeMarchingSpires.splice(i, 1);
      }
    }

    // Sky-Rift Prismatic Diamond-Icicle Lances
    for (let i = this.activeSkyIcicles.length - 1; i >= 0; i--) {
      const ic = this.activeSkyIcicles[i];
      if (ic.delay > 0) {
        ic.delay -= dt;
        continue;
      }
      ic.age += dt;
      const u = Math.min(1, ic.age / ic.flightDur);
      ic.x = ic.x0 + (ic.tx - ic.x0) * u;
      ic.y = ic.y0 + (ic.ty - ic.y0) * u;
      if (u >= 1 && !ic.impacted) {
        ic.impacted = true;
        if (enemy && !enemy.isDead && Math.abs(enemy.x - ic.tx) <= 88) {
          enemy.takeDamage(ic.damage || 18, this, true, 18, -32);
          enemy._hitShakeTimer = Math.max(enemy._hitShakeTimer || 0, 0.052);
          this.applyBrittleFrost(enemy, game, ic.frostStacks || 1);
        }
        this.spawnDiamondShardBurst(ic.tx, this.groundY - 36, 6, 165, true);
        this.spawnVfxAnim(7, ic.tx, this.groundY - 34, 136, 136, 0.22, { foreground: true });
        this.activeSkyIcicles.splice(i, 1);
      }
    }

    // Pixel Particle Pools
    for (let i = this.pixelSnowMotes.length - 1; i >= 0; i--) {
      const m = this.pixelSnowMotes[i];
      m.age += dt;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.vy += 85 * dt;
      if (m.age >= m.maxLife) this.pixelSnowMotes.splice(i, 1);
    }
    for (let i = this.pixelDiamondShards.length - 1; i >= 0; i--) {
      const d = this.pixelDiamondShards[i];
      d.age += dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vy += 280 * dt;
      if (d.age >= d.maxLife) this.pixelDiamondShards.splice(i, 1);
    }
    for (let i = this.auroraGlints.length - 1; i >= 0; i--) {
      this.auroraGlints[i].age += dt;
      if (this.auroraGlints[i].age >= this.auroraGlints[i].maxLife) {
        this.auroraGlints.splice(i, 1);
      }
    }

    // Permafrost Rink Zones, Crystal Prisons, Sky Steps, Ice Wall, Ice Decoy
    for (let i = this.permafrostZones.length - 1; i >= 0; i--) {
      this.permafrostZones[i].life += dt;
      if (this.permafrostZones[i].life >= this.permafrostZones[i].maxLife) {
        this.permafrostZones.splice(i, 1);
      }
    }
    for (let i = this.activeCrystalPrisons.length - 1; i >= 0; i--) {
      const pr = this.activeCrystalPrisons[i];
      pr.life += dt;
      if (pr.target && !pr.target.isDead) {
        pr.x = pr.target.x;
        pr.y = pr.target.y;
      }
      if (pr.life >= pr.maxLife) {
        this.activeCrystalPrisons.splice(i, 1);
      }
    }
    for (let i = this.skyIceSteps.length - 1; i >= 0; i--) {
      this.skyIceSteps[i].life += dt;
      if (this.skyIceSteps[i].life >= this.skyIceSteps[i].maxLife) {
        this.skyIceSteps.splice(i, 1);
      }
    }
    for (let i = this.activeFrostRings.length - 1; i >= 0; i--) {
      this.activeFrostRings[i].life += dt;
      if (this.activeFrostRings[i].life >= this.activeFrostRings[i].maxLife) {
        this.activeFrostRings.splice(i, 1);
      }
    }
    if (this.iceWall) {
      this.iceWall.life += dt;
      if (this.iceWall.life >= this.iceWall.maxLife) this.iceWall = null;
    }
    if (this.iceDecoy) {
      this.iceDecoy.life += dt;
      if (
        !this.iceDecoy.shattered &&
        enemy &&
        !enemy.isDead &&
        Math.abs(enemy.x - this.iceDecoy.x) <= 74
      ) {
        this.iceDecoy.shattered = true;
        enemy.takeDamage(28, this, true, 48, -42);
        this.applyBrittleFrost(enemy, game, 1);
        this.spawnPixelFrostRing(this.iceDecoy.x, this.iceDecoy.y - 84, 108, '#67e8f9', 0.28, false, true);
        this.iceDecoy = null;
      } else if (this.iceDecoy && this.iceDecoy.life >= this.iceDecoy.maxLife) {
        this.iceDecoy = null;
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
  }

  update(dt, enemy, game) {
    this.game = game || this.game;
    this._currentEnemy = enemy;
    this.fx?.update(dt);
    if (this.crouchCooldown > 0) this.crouchCooldown = Math.max(0, this.crouchCooldown - dt);
    if (this.vaultCooldown > 0) this.vaultCooldown = Math.max(0, this.vaultCooldown - dt);
    if (this.wallFlipCooldown > 0) this.wallFlipCooldown = Math.max(0, this.wallFlipCooldown - dt);

    if (enemy && enemy.brittleStacks > 0 && enemy.brittleDecayTimer > 0) {
      enemy.brittleDecayTimer = Math.max(0, enemy.brittleDecayTimer - dt);
      if (enemy.brittleDecayTimer <= 0) {
        enemy.brittleStacks = 0;
      }
    }

    this.updateConstructsAndVfx(dt, enemy, game);

    if (this.state === 'CROUCH' && !this.isDead && (this.stunTimer || 0) <= 0) {
      this.stateTimer += dt;
      this.updateCrouch(dt, enemy, game);
      return;
    }

    const isManualPlayer = Boolean(
      (this.isPlayerControlled && !this.adventureAutoPlay) || this.isManualAdventureControl
    );
    if (
      !this.isDead &&
      !isManualPlayer &&
      enemy &&
      !enemy.isDead &&
      (this.state === 'IDLE' || this.state === 'WALK')
    ) {
      const dist = Math.abs(enemy.x - this.x);

      // Projectile Refraction Mirror Counter
      if ((this.finisherGauge || 0) < (this.maxFinisherGauge || 100) && this.crouchCooldown <= 0 && game?.vfx?.projectiles) {
        for (const p of game.vfx.projectiles) {
          if (
            p.owner !== this &&
            Math.abs(p.x - this.x) < 235 &&
            Math.sign(p.vx) === Math.sign(this.x - p.x)
          ) {
            this.startCrouch(enemy, game);
            return;
          }
        }
      }

      // Long-range Winter Empress spacing: Sky-Stair kite vault when closely pressured
      if (dist < 175 && this.dodgeCooldown <= 0 && this.wallFlipCooldown <= 0) {
        this.wallFlipCooldown = 3.0;
        this.startJump(enemy, game);
        return;
      }
    }

    super.update(dt, enemy, game);
  }

  /**
   * Renders any cell `(row, col)` from `icemage_ex_vfx.png` (`6240x1664`) with crisp Selout + modest self-bloom (`<= 0.12`).
   * Zero blurry radial glow blobs, zero `ctx.rotate`, zero `ctx.ellipse`!
   */
  drawBloomedVfxRect(ctx, vfxSheet, rowIdx, colIdx, x, y, w, h, fade = 1.0, flipX = false) {
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth || fade <= 0.01) return;
    const c = Math.max(0, Math.min(29, Math.floor(colIdx)));
    const r = Math.max(0, Math.min(7, Math.floor(rowIdx)));
    const drawW = Math.max(8, Math.round(w / 4) * 4);
    const drawH = Math.max(8, Math.round(h / 4) * 4);
    const halfW = Math.round(-drawW * 0.5);
    const halfH = Math.round(-drawH * 0.5);
    const gx = Math.round(x / 2) * 2;
    const gy = Math.round(y / 2) * 2;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(gx, gy);
    if (flipX) ctx.scale(-1, 1);

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(1, fade * 0.97);
    ctx.drawImage(vfxSheet, c * 208, r * 208, 208, 208, halfW, halfH, drawW, drawH);

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(0.30, fade * 0.26);
    ctx.drawImage(vfxSheet, c * 208, r * 208, 208, 208, halfW, halfH, drawW, drawH);
    ctx.restore();
  }

  drawGrowingBluishCastAura(ctx, isReflection = false) {
    if (this.isDead) return;
    const inUlt = this.state === 'TRUE_ULTIMATE';
    let auraFade = 0;
    if (inUlt) {
      const t = this.stateTimer || 0;
      if (t >= 3.64) return;
      const fadeIn = Math.min(1, 0.45 + t / 0.22);
      const fadeOut = t <= 3.28 ? 1 : Math.max(0, 1 - (t - 3.28) / 0.36);
      auraFade = fadeIn * fadeOut;
    } else if (this._trueUltShatterTimer > 0) {
      const elapsedShatter = 1.28 - this._trueUltShatterTimer;
      if (elapsedShatter >= 0.36 || elapsedShatter < 0) return;
      auraFade = Math.max(0, 1 - elapsedShatter / 0.36);
    } else {
      return;
    }
    if (auraFade <= 0.01) return;

    const castChargeU = this.state === 'TRUE_ULTIMATE' ? Math.min(1, Math.max(0, (this.stateTimer || 0) / 3.24)) : 1;
    const reflScale = isReflection ? 0.38 : 1.0;
    const finalAlpha = auraFade * reflScale;
    const cx = Math.round(this.x / 2) * 2;
    const auraCy = Math.round((this.y - 92) / 2) * 2;
    const floorCy = Math.round(((Number.isFinite(this.groundY) ? this.groundY : this.y) - 2) / 2) * 2;

    // 1. 3-tier expanding 4x4 Bayer-stippled bluish aura + expanding floor frost pool (0 arc/ellipse)
    const rx1 = Math.round(44 + (192 - 44) * castChargeU);
    const ry1 = Math.round(56 + (224 - 56) * castChargeU);
    const floorRx = Math.round(56 + (248 - 56) * castChargeU);
    const floorRy = Math.round(14 + 34 * castChargeU);
    drawBayerFrostPool(ctx, cx, auraCy, rx1, ry1, '#1d4ed8', 0.17 * finalAlpha, 4);
    drawBayerFrostPool(ctx, cx, auraCy, Math.round(rx1 * 0.86), Math.round(ry1 * 0.86), '#2563eb', 0.15 * finalAlpha, 4);
    drawBayerFrostPool(ctx, cx, floorCy, floorRx, floorRy, '#1d4ed8', 0.17 * finalAlpha, 4);
    drawBayerFrostPool(ctx, cx, floorCy, Math.round(floorRx * 0.78), Math.round(floorRy * 0.78), '#2563eb', 0.16 * finalAlpha, 4);

    const rx2 = Math.round(30 + (142 - 30) * castChargeU);
    const ry2 = Math.round(40 + (172 - 40) * castChargeU);
    const rx3 = Math.round(18 + (88 - 18) * castChargeU);
    const ry3 = Math.round(24 + (114 - 24) * castChargeU);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = 'lighter';
    drawBayerFrostPool(ctx, cx, auraCy, rx2, ry2, '#0ea5e9', 0.17 * finalAlpha, 4);
    drawBayerFrostPool(ctx, cx, auraCy, Math.round(rx2 * 0.84), Math.round(ry2 * 0.84), '#38bdf8', 0.16 * finalAlpha, 4);
    drawBayerFrostPool(ctx, cx, auraCy, rx3, ry3, '#7dd3fc', 0.17 * finalAlpha, 4);
    drawBayerFrostPool(ctx, cx, auraCy, Math.round(rx3 * 0.76), Math.round(ry3 * 0.76), '#e0f2fe', 0.17 * finalAlpha, 4);

    // 2. 14 rising stepped-pixel (2x2/4x4) bluish energy wisps & spiraling frost-flame pillars
    const spreadX = 34 + (148 - 34) * castChargeU;
    const riseH = 46 + (228 - 46) * castChargeU;
    const animT = inUlt ? this.stateTimer || 0 : 3.4;
    const trailColors = ['#ffffff', '#bae6fd', '#38bdf8', '#1d4ed8'];
    for (let w = 0; w < 14; w++) {
      const phase = (animT * (0.95 + (w % 4) * 0.16) + w / 14) % 1;
      const theta = phase * Math.PI * 2.5 + (w * Math.PI * 2) / 14 + animT * 2.4;
      const orbitR = spreadX * (0.42 + 0.58 * Math.sin(phase * Math.PI * 0.85)) * (0.74 + 0.26 * (w % 3));
      const wY = Math.round((this.y + 6 - phase * riseH) / 2) * 2;
      const wFade = Math.sin(phase * Math.PI) * finalAlpha;
      if (wFade <= 0.03) continue;

      for (let seg = 0; seg < 4; seg++) {
        const segTheta = theta - seg * 0.34;
        const segX = Math.round((cx + Math.cos(segTheta) * orbitR) / 2) * 2;
        const segY = wY + seg * 6;
        const segSize = seg === 0 ? 2 : 4;
        ctx.globalCompositeOperation = seg >= 2 ? 'source-over' : 'lighter';
        ctx.globalAlpha = wFade * (seg === 0 ? 0.96 : seg === 1 ? 0.82 : seg === 2 ? 0.66 : 0.52);
        ctx.fillStyle = trailColors[seg];
        ctx.fillRect(segX - (segSize >> 1), segY - (segSize >> 1), segSize, segSize);
      }
    }
    ctx.restore();

    // 3. Growing icemage_ex_vfx.png cast rings (Row 5 Borealis Mandala 156->344px + Row 7 Diamond-Lotus 120->308px)
    const vfxSheet = PixelForge.ensureImage(this.getExSprites()?.vfx);
    if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      const col5 = Math.floor(animT * 28) % 30;
      const col7 = Math.floor(animT * 24 + 9) % 30;
      const mandalaSz = Math.round((156 + (344 - 156) * castChargeU) / 4) * 4;
      const lotusSz = Math.round((120 + (308 - 120) * castChargeU) / 4) * 4;
      this.drawBloomedVfxRect(
        ctx,
        vfxSheet,
        5,
        col5,
        cx,
        auraCy,
        mandalaSz,
        mandalaSz,
        (0.68 + 0.28 * castChargeU) * finalAlpha,
        false
      );
      this.drawBloomedVfxRect(
        ctx,
        vfxSheet,
        7,
        col7,
        cx,
        auraCy,
        lotusSz,
        lotusSz,
        (0.46 + 0.42 * castChargeU) * finalAlpha,
        true
      );
    }
  }

  drawTrueUltPolarNightBackground(ctx, renderer = null) {
    const inTrueUlt = this.state === 'TRUE_ULTIMATE';
    if (!inTrueUlt && this._trueUltShatterTimer <= 0) return;

    const t = inTrueUlt ? this.stateTimer : 3.35;
    const dur = this.trueUltDuration || 4.60;
    const fadeIn = inTrueUlt ? Math.min(1, t / 0.30) : 1;
    const fadeOut = inTrueUlt
      ? Math.min(1, Math.max(0, (dur - t) / 0.42))
      : Math.min(1, this._trueUltShatterTimer / 0.45);
    const fade = fadeIn * fadeOut;
    if (fade <= 0.01) return;

    const gy = this.groundY;
    const vfxSheet = PixelForge.ensureImage(this.getExSprites()?.vfx);
    const coffinX = Math.round((this._trueUltCoffinX || 600) / 4) * 4;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 4x4 Bayer-stippled Borealis Sky & Cathedral Sanctuary Floor Mirrors (zero boxy fillRect slabs!)
    drawBayerFrostPool(ctx, coffinX, Math.max(76, gy - 412), 268, 36, '#e879f9', 0.16 * fade, 4);
    drawBayerFrostPool(ctx, coffinX, Math.max(96, gy - 384), 212, 26, '#67e8f9', 0.15 * fade, 4);
    drawBayerFrostPool(ctx, coffinX, gy - 4, 248, 34, '#67e8f9', 0.16 * fade, 4);
    drawBayerFrostPool(ctx, coffinX, gy - 4, 156, 22, '#e879f9', 0.14 * fade, 4);

    for (let k = 0; k < 10; k++) {
      const a = t * 1.9 + (k * Math.PI) / 5;
      const sx = coffinX + Math.cos(a) * 210;
      const sy = Math.max(54, gy - 332 + Math.sin(a * 1.5) * 38);
      drawAuroraStarGlint(ctx, sx, sy, k % 2 === 0 ? 6 : 4, k % 2 === 0 ? '#67e8f9' : '#e879f9', fade * 0.86);
    }

    if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      const col = Math.floor(t * 24) % 30;
      const roseCol = (col + 11) % 30;
      this.drawBloomedVfxRect(ctx, vfxSheet, 3, roseCol, coffinX, gy - 356, 396, 132, fade * 0.78, false);
      this.drawBloomedVfxRect(ctx, vfxSheet, 5, col, coffinX, gy - 274, 368, 368, fade * 0.90, false);

      // 6-Pillar Borealis Snowflake Sanctuary Columns flanking the Cathedral!
      if (inTrueUlt && t < 3.28) {
        const pillarOffsets = [-236, -158, -88, 88, 158, 236];
        for (let i = 0; i < pillarOffsets.length; i++) {
          const px = coffinX + pillarOffsets[i];
          const py = gy - (i % 2 === 0 ? 96 : 112);
          const pScale = i % 2 === 0 ? 156 : 176;
          this.drawBloomedVfxRect(ctx, vfxSheet, 2, (col + i * 3) % 20, px, py, pScale, pScale, fade * 0.84, i >= 3);
        }
      }
    }

    // Far parallax snow layer: 2x2 #93c5fd / #bae6fd pixel flakes across arena sky
    const snowFade = this._getTrueUltSnowFade();
    if (snowFade > 0.02 && this._trueUltSnowfall.length > 0) {
      ctx.globalCompositeOperation = 'source-over';
      for (let i = 0; i < this._trueUltSnowfall.length; i++) {
        const p = this._trueUltSnowfall[i];
        if (!p.active || p.layer !== 0) continue;
        const px = Math.round(p.x / 2) * 2;
        const py = Math.round(p.y / 2) * 2;
        ctx.globalAlpha = snowFade * 0.72;
        ctx.fillStyle = p.hex;
        ctx.fillRect(px, py, 2, 2);
      }
    }

    ctx.restore();
  }

  drawForegroundOverlay(ctx, renderer = null) {
    this.drawTrueUltPolarNightBackground(ctx, renderer);

    // Mid parallax snow layer: 6-arm drawPixelSnowflakeMote flakes
    const midSnowFade = this._getTrueUltSnowFade();
    if (midSnowFade > 0.02 && this._trueUltSnowfall.length > 0) {
      for (let i = 0; i < this._trueUltSnowfall.length; i++) {
        const p = this._trueUltSnowfall[i];
        if (!p.active || p.layer !== 1) continue;
        drawPixelSnowflakeMote(ctx, p.x, p.y, p.arm, '#ffffff', p.hex, midSnowFade * 0.86);
      }
    }

    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    if (this.fx && !this.isDead) {
      this.fx.renderLayer(ctx, 'back', arenaCenterX, this.groundY, 0.96);
    }

    const sprites = this.getExSprites();
    const sheet = PixelForge.ensureImage(sprites?.sheet);
    const vfxSheet = PixelForge.ensureImage(sprites?.vfx);

    // Subtle 4x4 Bayer-stippled Empress Skate Frost Halo beneath Lyra EX (alpha <= 0.15)
    if (!this.isDead && this.y >= this.groundY - 12) {
      drawBayerFrostPool(ctx, this.x, this.groundY - 2, 48, 12, '#67e8f9', 0.14, 4);
    }

    // Creeping sapphire-cyan floor permafrost rime carpet (96px -> 620px) spreading outward across t = 1.35..3.28s
    const inUltRime = this.state === 'TRUE_ULTIMATE';
    if (!this.isDead && ((inUltRime && (this.stateTimer || 0) >= 1.35) || this._trueUltShatterTimer > 0)) {
      const tRime = inUltRime ? this.stateTimer || 0 : 3.35;
      const rimeU = inUltRime ? Math.min(1, Math.max(0, (tRime - 1.35) / 1.93)) : 1;
      const easeRime = 1 - Math.pow(1 - rimeU, 1.45);
      const durRime = this.trueUltDuration || 4.60;
      const rimeFadeIn = inUltRime ? Math.min(1, Math.max(0.35, (tRime - 1.35) / 0.24)) : 1;
      const rimeFadeOut = inUltRime
        ? Math.min(1, Math.max(0, (durRime - tRime) / 0.42))
        : Math.min(1, this._trueUltShatterTimer / 0.45);
      const rimeFade = rimeFadeIn * rimeFadeOut;
      if (rimeFade > 0.02) {
        const carpetW = Math.round((96 + 524 * easeRime) / 4) * 4;
        const halfW = Math.round(carpetW * 0.5);
        const gyFloor = Math.round((this.groundY || this.y) - 2);
        const rCenterX = Math.round(this.x / 4) * 4;
        drawBayerFrostPool(ctx, rCenterX, gyFloor, halfW, Math.round(14 + 26 * easeRime), '#1d4ed8', 0.17 * rimeFade, 4);
        drawBayerFrostPool(ctx, rCenterX, gyFloor, Math.round(halfW * 0.78), Math.round(10 + 18 * easeRime), '#0ea5e9', 0.16 * rimeFade, 4);
        drawBayerFrostPool(ctx, rCenterX, gyFloor, Math.round(halfW * 0.46), Math.round(6 + 12 * easeRime), '#67e8f9', 0.15 * rimeFade, 4);

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        const toothCount = Math.max(4, Math.floor(carpetW / 32));
        for (let k = 0; k <= toothCount; k++) {
          const frac = (k / Math.max(1, toothCount)) * 2 - 1;
          const vx = Math.round((rCenterX + frac * (halfW - 6)) / 4) * 4;
          const edgeFade = Math.max(0.25, 1 - Math.abs(frac) * 0.55);
          const spikeH = 4 + ((k * 7) % 10);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = rimeFade * edgeFade * 0.85;
          ctx.fillStyle = '#0284c7';
          ctx.fillRect(vx - 6, gyFloor - 2, 12, 4);
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(vx - 4, gyFloor - spikeH, 4, spikeH + 2);
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = rimeFade * edgeFade * 0.75;
          ctx.fillStyle = '#e0f2fe';
          ctx.fillRect(vx - 2, gyFloor - spikeH - 2, 2, 4);
        }
        ctx.restore();
      }
    }

    if (this.afterimages.length > 0 && sheet && sheet.complete && sheet.naturalWidth) {
      for (let i = 0; i < this.afterimages.length; i++) {
        const img = this.afterimages[i];
        const alpha = Math.max(0, (1 - img.age / img.maxLife) * 0.52);
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
          img.tint === 'aurora' ? '#e879f9' : '#67e8f9'
        );
        ctx.restore();
      }
    }

    if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      for (const z of this.permafrostZones) {
        const fade = Math.min(1, (z.maxLife - z.life) * 1.5) * Math.min(1, z.life / 0.15);
        const col = Math.floor(z.life * 20) % 30;
        drawBayerFrostPool(ctx, z.x, z.y - 2, z.radius * 0.92, 18, '#67e8f9', 0.16 * fade, 4);
        this.drawBloomedVfxRect(ctx, vfxSheet, 3, col, z.x, z.y - 8, z.radius * 1.7, 68, fade * 0.86, false);
      }

      for (const st of this.skyIceSteps) {
        const fade = Math.min(1, (st.maxLife - st.life) * 2.2) * Math.min(1, st.life / 0.08);
        const col = Math.floor(st.life * 24) % 30;
        this.drawBloomedVfxRect(ctx, vfxSheet, 3, col, st.x, st.y + 4, 84, 32, fade * 0.84, false);
      }

      for (const sp of this.activeMarchingSpires) {
        if (!sp.erupted) continue;
        const u = Math.min(1, sp.age / sp.maxLife);
        const col = Math.min(29, Math.floor(u * 30));
        const fade = u > 0.78 ? (1 - u) / 0.22 : 1.0;
        drawBayerFrostPool(ctx, sp.x, sp.y - 2, 44, 12, sp.isAurora ? '#e879f9' : '#67e8f9', 0.16 * fade, 4);
        this.drawBloomedVfxRect(ctx, vfxSheet, 2, col, sp.x, sp.y - 68, 152, 152, fade * 0.94, false);
      }

      if (this.iceWall) {
        const fade = Math.min(1, (this.iceWall.maxLife - this.iceWall.life) * 2.0);
        const col = Math.min(22, 6 + (Math.floor(this.iceWall.life * 18) % 14));
        drawBayerFrostPool(ctx, this.iceWall.x, this.iceWall.y - 2, 54, 14, '#67e8f9', 0.16 * fade, 4);
        this.drawBloomedVfxRect(
          ctx,
          vfxSheet,
          2,
          col,
          this.iceWall.x,
          this.iceWall.y - 76,
          164,
          164,
          fade * 0.94,
          this.iceWall.facing < 0
        );
      }

      if (this.iceDecoy) {
        const fade = Math.min(1, (this.iceDecoy.maxLife - this.iceDecoy.life) * 2.0);
        const decoyCol = Math.floor(this.iceDecoy.life * 24) % 24;
        this.drawBloomedVfxRect(ctx, vfxSheet, 6, decoyCol, this.iceDecoy.x, this.iceDecoy.y - 88, 176, 188, fade * 0.88, false);
      }

      for (const v of this.activeVfxAnims) {
        if (v.foreground) continue;
        const u = Math.min(1, Math.max(0, v.age / v.maxLife));
        const span = Math.max(1, v.endFrame - v.startFrame + 1);
        const col = Math.min(29, v.startFrame + Math.floor(u * span));
        const fade = u < 0.12 ? u / 0.12 : u > 0.78 ? (1 - u) / 0.22 : 1.0;
        this.drawBloomedVfxRect(ctx, vfxSheet, v.row, col, v.x, v.y, v.w, v.h, fade * 0.92, v.flipX);
      }
    }
  }

  drawUltimateForeground(ctx, renderer = null) {
    const sprites = this.getExSprites();
    const vfxSheet = PixelForge.ensureImage(sprites?.vfx);

    if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      // Returning 6-Point Snowflake Boomerang Chakrams (Row 1)
      for (const ch of this.activeChakrams) {
        const col = Math.floor(ch.age * 36) % 30;
        this.drawBloomedVfxRect(ctx, vfxSheet, 1, col, ch.x, ch.y, 144, 144, 0.96, false);
      }

      // Sky-Rift Prismatic Diamond-Icicle Lances (Row 4)
      for (let idxIc = 0; idxIc < this.activeSkyIcicles.length; idxIc++) {
        const ic = this.activeSkyIcicles[idxIc];
        if (ic.delay > 0) continue;
        const icCol = (Math.floor(ic.age * 36) + idxIc * 3) % 30;
        this.drawBloomedVfxRect(ctx, vfxSheet, 4, icCol, ic.x, ic.y, 112, 140, 0.95, this.facing < 0);
      }

      // 4-Stack Solid Crystal Freeze Sarcophagus (Row 6)
      for (const pr of this.activeCrystalPrisons) {
        const u = Math.min(1, pr.life / pr.maxLife);
        const col = Math.min(29, Math.floor(u * 30));
        const fade = u > 0.75 ? (1 - u) / 0.25 : 0.92;
        drawBayerFrostPool(ctx, pr.x, this.groundY - 2, 64, 16, '#67e8f9', 0.16 * fade, 4);
        this.drawBloomedVfxRect(ctx, vfxSheet, 6, col, pr.x, pr.y - 92, 196, 204, fade, false);
      }

      // Skill: BOREALIS PRISM JAWS (Twin Flanking Aurora-Orchid & Cyan Ice-Monoliths + Bayer Mirrors!)
      if (this.glacierJaws && this.glacierJaws.fade > 0.02) {
        const gj = this.glacierJaws;
        const gjAge = gj.age || this.stateTimer || 0;
        const col = gj.slammed
          ? 20 + (Math.floor(gjAge * 28) % 10)
          : Math.min(19, Math.floor(gjAge * 36));
        const sealCol = Math.floor(gjAge * 24) % 30;
        const lx = gj.centerX - gj.span;
        const rx = gj.centerX + gj.span;

        drawBayerFrostPool(ctx, gj.centerX, this.groundY - 2, gj.span + 56, 20, '#67e8f9', 0.17 * gj.fade, 4);
        drawBayerFrostPool(ctx, gj.centerX, this.groundY - 2, gj.span * 0.65 + 28, 12, '#e879f9', 0.15 * gj.fade, 4);
        this.drawBloomedVfxRect(ctx, vfxSheet, 3, sealCol, lx, this.groundY - 6, 152, 52, gj.fade * 0.88, false);
        this.drawBloomedVfxRect(ctx, vfxSheet, 3, sealCol, rx, this.groundY - 6, 152, 52, gj.fade * 0.88, true);

        this.drawBloomedVfxRect(ctx, vfxSheet, 2, col, lx, this.groundY - 96, 212, 220, gj.fade * 0.96, false);
        this.drawBloomedVfxRect(ctx, vfxSheet, 2, col, rx, this.groundY - 96, 212, 220, gj.fade * 0.96, true);
      }

      // Overdrive: CORONATION OF NINE ICE-SWORDS (Aurora Crown Halo + 8 Palisade Swords + 9th Sovereign Blade!)
      if (this.coronationDomain) {
        const cd = this.coronationDomain;
        const cdAge = cd.age || this.stateTimer || 0;
        const haloCol = Math.floor(cdAge * 24) % 30;

        // Overhead Aurora Crown Halo + Floor Palisade Mirror
        drawBayerFrostPool(ctx, cd.centerX, this.groundY - 2, 184, 24, '#67e8f9', 0.16, 4);
        this.drawBloomedVfxRect(ctx, vfxSheet, 3, haloCol, cd.centerX, this.groundY - 268, 340, 84, 0.90, false);

        for (let sIdx = 0; sIdx < cd.swords.length; sIdx++) {
          const sw = cd.swords[sIdx];
          const swCol = (Math.floor(cdAge * 28) + sIdx * 3) % 30;
          this.drawBloomedVfxRect(ctx, vfxSheet, 4, swCol, sw.x, sw.y, 140, 172, 0.95, sw.isAurora);
          if (sw.landed) {
            drawBayerFrostPool(ctx, sw.x, this.groundY - 2, 34, 10, sw.isAurora ? '#e879f9' : '#67e8f9', 0.14, 4);
          }
        }
        // Suspended or Plunged Colossal 9th Sovereign Blade
        const crownCol = Math.floor(cdAge * 30) % 30;
        this.drawBloomedVfxRect(
          ctx,
          vfxSheet,
          4,
          crownCol,
          cd.centerX,
          cd.crownDropped ? cd.crownY : this.groundY - 284,
          cd.crownDropped ? 236 : 188,
          cd.crownDropped ? 268 : 216,
          0.98,
          false
        );
      }

      // Active Diamond-Lotus Starburst Rings (Row 7)
      for (const fr of this.activeFrostRings) {
        const u = Math.min(1, fr.life / fr.maxLife);
        const col = Math.min(29, Math.floor(u * 30));
        const fade = 1 - u;
        this.drawBloomedVfxRect(ctx, vfxSheet, 7, col, fr.x, fr.y, fr.maxRadius * 1.6, fr.maxRadius * 1.6, fade * 0.94, false);
      }

      for (const v of this.activeVfxAnims) {
        if (!v.foreground) continue;
        const u = Math.min(1, Math.max(0, v.age / v.maxLife));
        const span = Math.max(1, v.endFrame - v.startFrame + 1);
        const col = Math.min(29, v.startFrame + Math.floor(u * span));
        const fade = u < 0.12 ? u / 0.12 : u > 0.78 ? (1 - u) / 0.22 : 1.0;
        this.drawBloomedVfxRect(ctx, vfxSheet, v.row, col, v.x, v.y, v.w, v.h, fade * 0.96, v.flipX);
      }

      // Supreme Ultimate Act II & III: Zero-Kelvin Diamond Monolith (Row 6) + Stepped Pixel Fracture Veins
      if (this.state === 'TRUE_ULTIMATE' && this.stateTimer >= 1.12 && this.stateTimer < 3.28) {
        const t = this.stateTimer;
        const coffinX = Math.round(this._trueUltCoffinX);
        const coffinY = Math.round(this.groundY - 126);
        const monoCol = Math.min(24, Math.floor(((t - 1.12) / 2.16) * 24));
        this.drawBloomedVfxRect(ctx, vfxSheet, 6, monoCol, coffinX, coffinY, 264, 288, 0.94, false);

        if (t >= 2.32) {
          const crackProgress = Math.min(1, (t - 2.32) / 0.88);
          ctx.save();
          for (const cr of this._trueUltCracks) {
            if (crackProgress < cr.threshold) continue;
            const localAlpha = Math.min(1, (crackProgress - cr.threshold) * 4.0);
            for (const seg of cr.segs) {
              const steps = 8;
              for (let k = 0; k <= steps; k++) {
                const su = k / steps;
                const qx = Math.round((coffinX + seg.x0 + (seg.x1 - seg.x0) * su) / 2) * 2;
                const qy = Math.round((coffinY + seg.y0 + (seg.y1 - seg.y0) * su) / 2) * 2;
                ctx.globalAlpha = localAlpha * 0.85;
                ctx.fillStyle = cr.magenta ? '#e879f9' : '#38bdf8';
                ctx.fillRect(qx - 2, qy - 2, 4, 4);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(qx, qy, 2, 2);
              }
            }
          }
          ctx.restore();
        }

        const tempProgress = Math.min(1, Math.max(0, (t - 1.12) / 1.24));
        const easedTemp = 1 - Math.pow(1 - tempProgress, 2.4);
        const celsius = -18.0 - 255.15 * easedTemp;
        const kelvin = Math.max(0, 273.15 + celsius);
        const atZero = kelvin <= 0.05 || t >= 2.34;
        const label = atZero
          ? '0.00 K  /  -273.15 C  ABSOLUTE ZERO'
          : `${kelvin.toFixed(1)} K  /  ${celsius.toFixed(1)} C`;

        ctx.save();
        const hudY = Math.max(54, coffinY - 176);
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = atZero ? '#e879f9' : '#38bdf8';
        ctx.fillRect(coffinX - 116, hudY + 8, 232, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(coffinX - 58, hudY + 8, 116, 2);
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#0284c7';
        ctx.fillText(label, coffinX + 1, hudY + 2);
        ctx.fillStyle = atZero ? '#ffffff' : '#e0f2fe';
        ctx.fillText(label, coffinX, hudY + 1);
        ctx.restore();
      }

      // Supreme Ultimate Act IV (`_trueUltShatterTimer > 0`): 32 Faceted Pixel Glass Prisms (ZERO ctx.rotate!)
      if (this._trueUltShatterTimer > 0) {
        const coffinX = Math.round(this._trueUltCoffinX);
        const coffinY = Math.round(this.groundY - 132);
        const uShatter = 1 - Math.max(0, Math.min(1, this._trueUltShatterTimer / 1.28));
        const row7Col = Math.min(29, Math.floor(uShatter * 30));
        const shatterFade = Math.min(1, this._trueUltShatterTimer / 0.34);

        this.drawBloomedVfxRect(ctx, vfxSheet, 7, row7Col, coffinX, coffinY, 432, 384, shatterFade * 0.96, false);

        for (const s of this._trueUltGlassShards) {
          if (s.y > this.groundY + 24) continue;
          const glintPulse = 0.72 + 0.28 * Math.sin(s.phase);
          drawPixelDiamondShard(ctx, s.x, s.y, s.size, s.fillHex, s.rimHex, shatterFade * glintPulse);
        }
        for (const d of this._trueUltDiamondDust) {
          const dy = ((d.y % (this.groundY - 20)) + (this.groundY - 20)) % (this.groundY - 20);
          drawAuroraStarGlint(ctx, d.x, dy, d.size, d.magenta ? '#e879f9' : '#67e8f9', shatterFade * 0.88);
        }
      }
    }

    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    if (this.fx && !this.isDead) {
      this.fx.renderLayer(ctx, 'front', arenaCenterX, this.groundY, 0.98);
    }

    // Near-camera parallax snow layer: larger snowflakes + 2x6 stepped #38bdf8/#ffffff diagonal snow-rain streaks
    const nearSnowFade = this._getTrueUltSnowFade();
    if (nearSnowFade > 0.02 && this._trueUltSnowfall.length > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      for (let i = 0; i < this._trueUltSnowfall.length; i++) {
        const p = this._trueUltSnowfall[i];
        if (!p.active || p.layer !== 2) continue;
        if (p.isStreak) {
          const px = Math.round(p.x / 2) * 2;
          const py = Math.round(p.y / 2) * 2;
          const dxStep = p.vx >= 0 ? 2 : -2;
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = nearSnowFade * 0.88;
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(px, py, 2, 2);
          ctx.fillRect(px + dxStep, py + 2, 2, 2);
          ctx.fillRect(px + dxStep * 2, py + 4, 2, 2);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(px + dxStep, py + 2, 2, 2);
        } else {
          drawPixelSnowflakeMote(ctx, p.x, p.y, p.arm, '#ffffff', p.hex, nearSnowFade * 0.94);
        }
      }
      ctx.restore();
    }

    // Crisp Pixel Snowflake Motes, Faceted Diamond Shards, & 4-Point Aurora Star-Glints!
    for (const m of this.pixelSnowMotes) {
      const fade = 1 - m.age / m.maxLife;
      drawPixelSnowflakeMote(ctx, m.x, m.y, m.arm, '#ffffff', m.tipHex, fade * 0.92);
    }
    for (const d of this.pixelDiamondShards) {
      const fade = 1 - d.age / d.maxLife;
      drawPixelDiamondShard(ctx, d.x, d.y, d.size, d.fillHex, d.rimHex, fade * 0.94);
    }
    for (const g of this.auroraGlints) {
      const fade = 1 - g.age / g.maxLife;
      drawAuroraStarGlint(ctx, g.x, g.y, g.arm, g.hex, fade * 0.96);
    }
  }

  draw(ctx, isReflection = false, renderer = null) {
    const sprites = this.getExSprites();
    if (!sprites) return;

    const vfxSheet = PixelForge.ensureImage(sprites.vfx);
    const hasVfx = Boolean(vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth);
    const reflScale = isReflection ? 0.38 : 1.0;

    this.drawGrowingBluishCastAura(ctx, isReflection);
    if ((this.state === 'TRUE_ULTIMATE' || this._trueUltShatterTimer > 0) && hasVfx && this.groundY - this.y > 12) {
      const col = Math.floor((this.stateTimer || 0) * 28) % 30;
      this.drawBloomedVfxRect(ctx, vfxSheet, 3, col, this.x, this.y + 8, 136, 48, 0.88 * reflScale, false);
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
      ctx.globalAlpha = 0.45;
      PixelForge.drawGhostFrame(ctx, sprites, frameIdx, w, h);
    }

    ctx.restore();

    if (isReflection && hasVfx) {
      for (const z of this.permafrostZones) {
        const fade = Math.min(1, (z.maxLife - z.life) * 1.5) * Math.min(1, z.life / 0.15);
        const col = Math.floor(z.life * 20) % 30;
        this.drawBloomedVfxRect(ctx, vfxSheet, 3, col, z.x, z.y - 8, z.radius * 1.7, 68, fade * 0.36, false);
      }
      if (this.glacierJaws && this.glacierJaws.fade > 0.02) {
        const gj = this.glacierJaws;
        const gjAge = gj.age || this.stateTimer || 0;
        const col = gj.slammed ? 20 + (Math.floor(gjAge * 28) % 10) : Math.min(19, Math.floor(gjAge * 36));
        this.drawBloomedVfxRect(ctx, vfxSheet, 2, col, gj.centerX - gj.span, this.groundY - 96, 212, 220, gj.fade * 0.38, false);
        this.drawBloomedVfxRect(ctx, vfxSheet, 2, col, gj.centerX + gj.span, this.groundY - 96, 212, 220, gj.fade * 0.38, true);
      }
      if (this.coronationDomain) {
        const cd = this.coronationDomain;
        const cdAge = cd.age || this.stateTimer || 0;
        for (let sIdx = 0; sIdx < cd.swords.length; sIdx++) {
          const sw = cd.swords[sIdx];
          this.drawBloomedVfxRect(ctx, vfxSheet, 4, (Math.floor(cdAge * 28) + sIdx * 3) % 30, sw.x, sw.y, 140, 172, 0.36, sw.isAurora);
        }
        this.drawBloomedVfxRect(
          ctx,
          vfxSheet,
          4,
          Math.floor(cdAge * 30) % 30,
          cd.centerX,
          cd.crownDropped ? cd.crownY : this.groundY - 284,
          cd.crownDropped ? 236 : 188,
          cd.crownDropped ? 268 : 216,
          0.38,
          false
        );
      }
      if (this.state === 'TRUE_ULTIMATE' && this.stateTimer >= 1.12 && this.stateTimer < 3.28) {
        const monoCol = Math.min(24, Math.floor(((this.stateTimer - 1.12) / 2.16) * 24));
        this.drawBloomedVfxRect(ctx, vfxSheet, 6, monoCol, Math.round(this._trueUltCoffinX), Math.round(this.groundY - 126), 264, 288, 0.38, false);
      }
      if (this._trueUltShatterTimer > 0) {
        const uShatter = 1 - Math.max(0, Math.min(1, this._trueUltShatterTimer / 1.28));
        const row7Col = Math.min(29, Math.floor(uShatter * 30));
        const shatterFade = Math.min(1, this._trueUltShatterTimer / 0.34);
        this.drawBloomedVfxRect(ctx, vfxSheet, 7, row7Col, Math.round(this._trueUltCoffinX), Math.round(this.groundY - 132), 432, 384, shatterFade * 0.38, false);
      }
      for (const v of this.activeVfxAnims) {
        const u = Math.min(1, Math.max(0, v.age / v.maxLife));
        const span = Math.max(1, v.endFrame - v.startFrame + 1);
        const col = Math.min(29, v.startFrame + Math.floor(u * span));
        const fade = u < 0.12 ? u / 0.12 : u > 0.78 ? (1 - u) / 0.22 : 1.0;
        this.drawBloomedVfxRect(ctx, vfxSheet, v.row, col, v.x, v.y, v.w, v.h, fade * 0.36, v.flipX);
      }
    }
  }
}
