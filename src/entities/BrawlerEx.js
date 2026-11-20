import { Fighter } from './Fighter.js?v=30fps180';
import { PixelForge } from '../engine/PixelForge.js?v=30fps180';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps180';
import { ExParticleSystem, drawExBayerHalo } from '../engine/shaders/exNextGenFX.js?v=30fps180';

const AUTO_SLICES_EX = [
  [60, 8], // Beat 1 (V0, 0.22s): Explosive stepping storm jab -> snaps at F02/F03 (62/63)
  [68, 7], // Beat 2 (V1, 0.22s): Full-body whipping thunder cross-hook -> snaps at F10 (70)
  [75, 8], // Beat 3 (V2, 0.27s): Knee-tucked rising Sky-Breaker Uppercut -> snaps at F17/F18 (77/78)
  [83, 7]  // Beat 4 (V3, 0.36s): Heavy one-inch THUNDERCLAP PALM shockwave finisher -> snaps at F25 (85)
];

const BEAT_DURATIONS = [0.22, 0.22, 0.27, 0.36];
const INTRA_COMBO_LINK = 0.012;

// Pixel-pure storm-gold & midnight-indigo ArcaneShaderFX registry with strict radial/margin tapering
// so every shadeBox call produces ZERO boundary clips across x = 110 / 600 / 1090 / 7400!
const BRAWLER_SHADER_PALETTE = [
  '#0f172a',
  '#1e1b4b',
  '#4338ca',
  '#6366f1',
  '#fbbf24',
  '#fef08a',
  '#ffffff'
];

const BRAWLER_TEMPEST_EFFECT_REGISTRY = {
  tempestBurst: {
    duration: 0.48,
    create(cfg) {
      const cx = cfg.x || 0;
      const cy = cfg.y || 0;
      const maxR = cfg.extra?.radius || 46;
      return {
        age: 0,
        duration: 0.48,
        done: false,
        step(dt) {
          this.age += dt;
          if (this.age >= this.duration) this.done = true;
        },
        renderFront(pen) {
          const u = Math.min(1, this.age / this.duration);
          const env = Math.sin(u * Math.PI);
          if (env <= 0.02) return;
          const r = 10 + u * maxR;
          const pad = Math.ceil(r + 14);
          pen.shadeBox(cx - pad, cy - pad, cx + pad, cy + pad, (lx, ly, out) => {
            const dx = lx - cx;
            const dy = ly - cy;
            const d = Math.hypot(dx, dy);
            if (d > r + 4) return null;
            const edgeFade = Math.max(0, 1 - d / (pad - 3));
            const ring = Math.max(0, 1 - Math.abs(d - r * 0.78) / 7.5);
            const alpha = ring * env * edgeFade;
            if (alpha < 0.06) return null;
            out.alpha = Math.min(1, alpha * 1.15);
            out.glowStrength = alpha * 0.55;
            out.color = ring > 0.72 ? '#ffffff' : ring > 0.44 ? '#fef08a' : ring > 0.22 ? '#fbbf24' : '#6366f1';
            return out.color;
          });
        }
      };
    }
  },
  tempestPillar: {
    duration: 0.92,
    create(cfg) {
      const cx = cfg.x || 0;
      const gy = cfg.y || 0;
      const halfW = cfg.extra?.halfW || 28;
      const height = cfg.extra?.height || 156;
      return {
        age: 0,
        duration: 0.92,
        done: false,
        step(dt) {
          this.age += dt;
          if (this.age >= this.duration) this.done = true;
        },
        renderFront(pen) {
          const u = Math.min(1, this.age / this.duration);
          const env = u < 0.14 ? u / 0.14 : Math.max(0, 1 - Math.max(0, u - 0.56) / 0.44);
          if (env <= 0.02) return;
          const curW = halfW * (0.72 + 0.28 * Math.sin(u * Math.PI));
          const xPad = Math.ceil(curW + 14);
          const topY = gy - height;
          const yPad = 14;
          pen.shadeBox(cx - xPad, topY - yPad, cx + xPad, gy + yPad, (lx, ly, out) => {
            if (ly < topY || ly > gy) return null;
            const vFade = Math.min(1, (ly - topY) / 22, (gy - ly) / 14);
            const sway = Math.sin(ly * 0.14 + u * 26) * 4.2;
            const dx = Math.abs(lx - (cx + sway));
            if (dx > curW) return null;
            const core = Math.max(0, 1 - dx / Math.max(2, curW));
            const alpha = core * vFade * env;
            if (alpha < 0.06) return null;
            out.alpha = Math.min(1, alpha * 1.1);
            out.glowStrength = alpha * 0.6;
            out.color = core > 0.72 ? '#ffffff' : core > 0.46 ? '#fef08a' : core > 0.24 ? '#fbbf24' : '#6366f1';
            return out.color;
          });
        }
      };
    }
  },
  tempestCrater: {
    duration: 0.84,
    create(cfg) {
      const cx = cfg.x || 0;
      const gy = cfg.y || 0;
      const maxRx = cfg.extra?.rx || 82;
      const maxRy = cfg.extra?.ry || 20;
      return {
        age: 0,
        duration: 0.84,
        done: false,
        step(dt) {
          this.age += dt;
          if (this.age >= this.duration) this.done = true;
        },
        renderBack(pen) {
          const u = Math.min(1, this.age / this.duration);
          const env = u < 0.12 ? u / 0.12 : Math.max(0, 1 - Math.max(0, u - 0.45) / 0.55);
          if (env <= 0.02) return;
          const rx = 18 + u * maxRx;
          const ry = 6 + u * maxRy;
          const padX = Math.ceil(rx + 14);
          const padY = Math.ceil(ry + 12);
          pen.shadeBox(cx - padX, gy - padY, cx + padX, gy + padY, (lx, ly, out) => {
            const nx = (lx - cx) / Math.max(1, rx);
            const ny = (ly - gy) / Math.max(1, ry);
            const r = Math.hypot(nx, ny);
            if (r > 1.05) return null;
            const ring = Math.max(0, 1 - Math.abs(r - 0.82) / 0.24);
            const spoke = Math.abs(Math.sin(Math.atan2(ny, nx) * 4 + u * 2.4)) > 0.88 && r < 0.86 ? 0.68 : 0;
            const s = Math.max(ring, spoke * (1 - r * 0.35));
            const alpha = s * env * Math.max(0, 1 - Math.max(0, r - 0.85) / 0.2);
            if (alpha < 0.06) return null;
            out.alpha = Math.min(1, alpha);
            out.glowStrength = alpha * 0.45;
            out.color = s > 0.72 ? '#fef08a' : s > 0.42 ? '#fbbf24' : '#4338ca';
            return out.color;
          });
        }
      };
    }
  }
};

/**
 * Multi-segment stepped pixel lightning bolt rendered in 3 full passes (`0` chevrons, `0` canvas rotation).
 */
function drawTempestPixelBolt(ctx, x0, y0, x1, y1, segs, jagAmp, seed, alpha = 0.94) {
  if (alpha <= 0.02) return;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const pts = [[Math.round(x0), Math.round(y0)]];
  for (let s = 1; s < segs; s++) {
    const f = s / segs;
    const env = Math.sin(f * Math.PI);
    const h = Math.sin((seed + s * 13.7) * 127.1) * 43758.5453;
    const off = ((h - Math.floor(h)) * 2 - 1) * jagAmp * (0.4 + 0.6 * env);
    pts.push([
      Math.round((x0 + dx * f + nx * off) / 2) * 2,
      Math.round((y0 + dy * f + ny * off) / 2) * 2
    ]);
  }
  pts.push([Math.round(x1), Math.round(y1)]);

  const tracePass = (fillHex, passAlpha, size) => {
    ctx.fillStyle = fillHex;
    ctx.globalAlpha = passAlpha;
    const half = Math.floor(size * 0.5);
    for (let s = 0; s < pts.length - 1; s++) {
      const [ax, ay] = pts[s];
      const [bx, by] = pts[s + 1];
      const steps = Math.max(2, Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay)) / 2));
      for (let k = 0; k <= steps; k++) {
        const u = k / steps;
        const px = Math.round((ax + (bx - ax) * u) / 2) * 2;
        const py = Math.round((ay + (by - ay) * u) / 2) * 2;
        ctx.fillRect(px - half, py - half, size, size);
      }
    }
  };

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  tracePass('#4338ca', Math.min(0.62, alpha * 0.62), 6);
  tracePass('#fbbf24', Math.min(0.92, alpha * 0.9), 4);
  tracePass('#ffffff', Math.min(0.98, alpha), 2);
  ctx.restore();
}

/**
 * RAIJIN EX (`brawler_ex`) — "THE TEMPEST FIST" (Champion #13 EX, EX-Only Wide-Canvas `9600x2400`).
 * Pure close-range melee rushdown / thunder-fist martial artist (`attackRange: 118`, crisp forward
 * step-in footsies, `hasHackAndSlashCombo() => true`).
 */
export class BrawlerEx extends Fighter {
  constructor(x, groundY, facing = 1) {
    const opts = typeof x === 'object' && x !== null ? x : { x, groundY, facing };
    super({
      ...opts,
      name: opts.name || 'Raijin EX',
      maxHp: 3940,
      attackRange: 132,
      moveSpeed: 256,
      autoInterval: 0.56,
      lightColor: 'rgba(251, 191, 36, 1)',
      primaryColor: '#fbbf24',
      secondaryColor: '#6366f1',
      hasTrueUltimate: true,
      trueUltName: 'HEAVEN-SPLITTING RAIJIN CRASH',
      trueUltDuration: 4.10
    });

    this.heroId = 'brawler_ex';
    this.theme = 'tempest';
    this.deathSfx = 'death_warrior';
    this.hasPoise = true;

    this.autoDuration = BEAT_DURATIONS[0];
    this._postFlurryInterval = 0.56;

    this.skillName = 'THUNDERSTEP BREAKER';
    this.skillMaxCooldown = 3.70;
    this.skillCooldown = 0.90;
    this.skillDuration = 0.72;
    this.skillTriggerRange = 410;

    this.ultName = 'TEMPEST HUNDRED FISTS';
    this.ultSub = 'PHANTOM THUNDER FIST BARRAGE & SKY-BREAKER';
    this.ultDuration = 1.32;

    this.trueUltName = 'HEAVEN-SPLITTING RAIJIN CRASH';
    this.trueUltSub = 'STORM-PILLAR LEAP & THUNDER-CRATER DIVE SLAM';
    this.trueUltDuration = 4.10;

    this.dodgeMaxCooldown = 2.60;
    this.dashMaxCooldown = 1.75;
    this.crouchCooldown = 0;
    this.crouchDuration = 0.68;
    this.isCrouching = false;
    this.isDeflecting = false;
    this.vaultCooldown = 0;
    this.isFlipVault = false;
    this.flipStartX = this.x;
    this.flipTargetX = this.x;
    this.cameraAirLift = 0;

    // Static Barrier / Iron-Body Counter Passive
    this.staticBarrier = 0;
    this.staticBarrierTimer = 0;
    this.tempestComboStacks = 0;

    // 4-Beat Martial Combo State
    this.comboStep = 0;
    this._autoVariant = 0;
    this._comboPersistTimer = 0;
    this._queuedNextBeat = false;
    this._intraLinkTimer = 0;
    this._beatHitMask = 0;
    this._beatStartX = this.x;
    this._beatTargetX = this.x;
    this._bootsPlanted = false;

    // Skill / Overdrive / True Ult Choreography State
    this._skillPhase = 0;
    this._skillStartX = this.x;
    this._skillTargetX = this.x;
    this._ultInit = false;
    this._ultHitStep = 0;
    this._ultTargetX = this.x;
    this._trueUltInit = false;
    this._trueUltStage = 0;
    this._trueUltBlitzStep = 0;
    this._trueUltDomainAlpha = 0;
    this._trueUltTargetX = this.x;
    this._trueUltStartX = this.x;
    this._stormCrashTimer = 0;

    this._overrideFrameIdx = null;
    this.afterimages = [];
    this.afterimageAccum = 0;
    this.activeVfxAnims = [];
    this.tempestBolts = [];
    this._blitzTethers = [];
    this.groundSeals = [];
    this._exParticles = new ExParticleSystem('brawler_ex', '#fbbf24');

    this.fx = new ArcaneShaderFX(BRAWLER_TEMPEST_EFFECT_REGISTRY, {
      pixelScale: 2,
      viewW: 960,
      viewH: 560
    });

    if (typeof Image !== 'undefined') {
      PixelForge.ensureHeroLoaded?.('brawler_ex');
    }
  }

  isHackAndSlashMelee() {
    return true;
  }

  isHackAndSlashCaster() {
    return false;
  }

  hasHackAndSlashCombo() {
    return true;
  }

  applySovereignAspectStats(aspect) {
    if (aspect === 1) {
      // Aspect II: STORM-EMPEROR BURST (zero-heal high-speed shockwave burst)
      this.maxHp = 3740;
      this.hp = this.maxHp;
      this.moveSpeed = 268;
      this._postFlurryInterval = 0.48;
    } else if (aspect === 2) {
      // Aspect III: IRON-BODY COUNTER (fortified armor & guard parry)
      this.maxHp = 3980;
      this.hp = this.maxHp;
      this.moveSpeed = 242;
      this._postFlurryInterval = 0.66;
    }
  }

  getAiStyleProfile() {
    return {
      comboGoal: 4,
      sweetMin: 72,
      sweetMax: 120,
      counterCrouchBias: 0.54,
      midLeapMin: 155,
      midLeapMax: 340,
      midLeapChance: 0.48,
      postStyle: 'brawler'
    };
  }

  getExSprites() {
    const assets = PixelForge.initAssets();
    if (!assets) return null;
    if (!assets.brawler_ex) {
      const mkImg = (src) => {
        if (typeof Image === 'undefined') return { complete: false, naturalWidth: 0, width: 0, src };
        const im = new Image();
        im.src = src;
        return im;
      };
      assets.brawler_ex = {
        sheet: mkImg('assets/sprites/brawler_ex_sheet.png?v=30fps180'),
        vfx: mkImg('assets/sprites/brawler_ex_vfx.png?v=30fps180'),
        portrait: mkImg('assets/sprites/brawler_ex_portrait.png?v=30fps180'),
        cellW: 320,
        cellH: 240,
        anchorX: 112,
        anchorY: 230
      };
    } else if (typeof Image !== 'undefined') {
      PixelForge.ensureHeroLoaded?.('brawler_ex');
    }
    return assets.brawler_ex;
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

  _clampArenaX(xv, game) {
    const { minX, maxX } = this._getArenaWallBounds(game);
    return Math.max(minX, Math.min(maxX, xv));
  }

  _safeFxX(xv, game = this.game) {
    const ww = game?.renderer?.worldWidth || 1200;
    return Math.max(120, Math.min(ww - 120, Number.isFinite(xv) ? xv : this.x));
  }

  _resolveShaderCenterX(renderer) {
    const ww = renderer?.worldWidth || 1280;
    if (ww <= 1600) return ww * 0.5;
    const camCenter = Number.isFinite(renderer?.cameraX) ? renderer.cameraX + 640 : this.x;
    return Math.max(810, Math.min(ww - 810, camCenter));
  }

  _spawnProj(game, proj) {
    if (game?.vfx?.spawnProjectile) game.vfx.spawnProjectile(proj);
    else if (game?.spawnProjectile) game.spawnProjectile(proj);
  }

  spawnTempestBolt(x0, y0, x1, y1, maxLife = 0.22, jag = 12) {
    if (this.tempestBolts.length >= 16) this.tempestBolts.shift();
    this.tempestBolts.push({
      x0,
      y0,
      x1,
      y1,
      jag,
      seed: Math.random() * 100,
      age: 0,
      maxLife
    });
  }

  spawnGroundSeal(x, groundY = this.groundY, radius = 92, maxLife = 0.62) {
    if (this.groundSeals.length >= 10) this.groundSeals.shift();
    this.groundSeals.push({ x, groundY, radius, age: 0, maxLife });
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

  spawnVfxAnim(row, x, y, w = 180, h = 180, maxLife = 0.34, opts = {}) {
    if (this.activeVfxAnims.length >= 26) this.activeVfxAnims.shift();
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

  spawnHitStarburst(x, y, primaryHex = '#fbbf24', accentHex = '#6366f1') {
    this._exParticles?.spawnHitStarburst(Math.round(x), Math.round(y), primaryHex, accentHex, 0.18);
  }

  takeDamage(amount, attacker, isCrit = false, knockX = 0, knockY = 0) {
    const preHp = this.hp;
    let finalAmt = Math.max(0, Math.round(amount || 0));
    const incomingTier =
      attacker?._activeHitTier ||
      (attacker && !attacker.isMonster && (attacker.state === 'ULTIMATE' || attacker.state === 'TRUE_ULTIMATE')
        ? attacker.state
        : null);

    // Iron-Body Static Barrier absorption (non-ultimate hits)
    if (
      !incomingTier &&
      !this.isInvulnerable &&
      this.state !== 'ULTIMATE' &&
      this.state !== 'TRUE_ULTIMATE' &&
      this.staticBarrierTimer > 0 &&
      this.staticBarrier > 0 &&
      finalAmt > 0
    ) {
      const absorbed = Math.min(this.staticBarrier, finalAmt);
      this.staticBarrier -= absorbed;
      finalAmt -= absorbed;
      this.spawnHitStarburst(this.x, this.y - 84, '#fbbf24', '#6366f1');
      if (this.staticBarrier <= 0) this.staticBarrierTimer = 0;
      if (finalAmt <= 0) {
        this.game?.vfx?.spawnDamageText?.(this.x, this.y - 134, 0, false, 'IRON GUARD!', '#fef08a');
        return 0;
      }
    }

    // Iron Guard CROUCH damage mitigation & counter shockwave
    if (this.isDeflecting && !incomingTier && finalAmt > 0) {
      finalAmt = Math.round(finalAmt * 0.35);
      this.spawnVfxAnim(6, this.x + this.facing * 26, this.y - 88, 146, 146, 0.28, { inFront: true });
      this.gainMana(12);
      this.gainFinisher(7);
      if (this.game?.audio) this.game.audio.play('clang', this.x);
    }

    super.takeDamage(finalAmt, attacker, isCrit, knockX, knockY);
    return Math.max(0, preHp - this.hp);
  }

  setState(newState) {
    const prevState = this.state;
    super.setState(newState);
    this._skillVoiceFired = false;
    this._ultVoiceFired = false;
    this._trueUltChargeVoiced = false;

    // Mandatory landing ground-snap after aerial/ult/skill states!
    if (
      (prevState === 'ULTIMATE' ||
        prevState === 'TRUE_ULTIMATE' ||
        prevState === 'SKILL' ||
        prevState === 'JUMP' ||
        prevState === 'DODGE') &&
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
      this.isCrouching = false;
      this.isDeflecting = false;
    }

    if (newState === 'AUTO_ATTACK') {
      if (this._comboPersistTimer <= 0 && prevState !== 'AUTO_ATTACK') {
        this.comboStep = 0;
      }
      this.y = this.groundY;
      this.vy = 0;
      this._beginComboBeat(this.comboStep % 4, this.game);
    } else if (newState !== 'ULTIMATE' && newState !== 'TRUE_ULTIMATE' && newState !== 'SKILL') {
      this._overrideFrameIdx = null;
      this.trueUltFrameOverride = null;
    }

    if (newState === 'SKILL') {
      this._skillPhase = 0;
      this._skillStartX = this.x;
      this.y = this.groundY;
      this.vy = 0;
      this.isDeflecting = false;
      this.trueUltFrameOverride = 90;
      this._overrideFrameIdx = 90;
    }

    if (newState === 'ULTIMATE') {
      this._ultInit = false;
      this._ultHitStep = 0;
      this.isInvulnerable = true;
      this.unstoppablePoise = true;
      this.trueUltFrameOverride = 120;
      this._overrideFrameIdx = 120;
    } else if (newState !== 'TRUE_ULTIMATE' && newState !== 'AUTO_ATTACK') {
      this.unstoppablePoise = false;
    }

    if (newState === 'TRUE_ULTIMATE') {
      this._trueUltInit = false;
      this._trueUltStage = 0;
      this._trueUltBlitzStep = 0;
      this._trueUltDomainAlpha = 0;
      this._blitzTethers.length = 0;
      this._trueUltStartX = this.x;
      this.isInvulnerable = true;
      this.unstoppablePoise = true;
      this.hurtTimer = 0;
      this.isCrouching = false;
      this.isDeflecting = false;
      this.trueUltFrameOverride = 135;
      this._overrideFrameIdx = 135;
    }

    if (newState === 'DEATH') {
      this.fx?.clear();
      this._exParticles?.clear();
      this.tempestBolts.length = 0;
      this._blitzTethers.length = 0;
      this.groundSeals.length = 0;
      this._stormCrashTimer = 0;
      this._trueUltDomainAlpha = 0;
      this.cameraAirLift = 0;
      this._overrideFrameIdx = null;
      this.trueUltFrameOverride = null;
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
    this._activeComboStage = v;
    this.comboStep = (v + 1) % 4;
    this.autoDuration = BEAT_DURATIONS[v];
    this.stateTimer = 0;
    this._intraLinkTimer = 0;
    this._beatHitMask = 0;
    this.didActionFrame = false;
    this._queuedNextBeat = false;
    this._bootsPlanted = false;
    this._comboPersistTimer = 0.85;
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
    // Aggressive lightning-brawler step-in footsies!
    let stepDelta = v === 0 ? 30 : v === 1 ? 34 : v === 2 ? 26 : 36;
    if (enemy && !enemy.isDead) {
      const horizDist = Math.abs(enemy.x - this.x);
      if (horizDist < 72) stepDelta = 8;
      else if (horizDist > 105) stepDelta = Math.min(64, Math.max(stepDelta, horizDist - 78));
    }
    this._beatTargetX = this._clampArenaX(this.x + this.facing * stepDelta, game);
  }

  queueNextComboBeat() {
    this._queuedNextBeat = true;
  }

  _applyTempestStrike(enemy, game, opts = {}) {
    const {
      damage = 28,
      reachFront = 148,
      reachBack = 36,
      hitStop = 0.036,
      shakeDur = 0.048,
      knockX = 48,
      knockY = -36,
      isCrit = false,
      sfx = 'slash',
      tier = null
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
    pushCand(enemy);
    if (game?.getEnemiesOf) {
      const list = game.getEnemiesOf(this);
      if (Array.isArray(list)) {
        for (let i = 0; i < list.length; i++) pushCand(list[i]);
      }
    }

    let landed = false;
    const prevTier = this._activeHitTier;
    if (tier) this._activeHitTier = tier;
    for (let i = 0; i < cands.length; i++) {
      const foe = cands[i];
      const rel = (foe.x - this.x) * this.facing;
      const bossBonus = foe.isColossalBoss ? 92 : 0;
      if (rel < -reachBack || rel > reachFront + bossBonus) continue;
      if (isAdv && !foe.isColossalBoss && Math.abs((foe.groundY || foe.y) - myGy) > 88) continue;

      const hpBefore = foe.hp;
      const wasDead = foe.isDead;
      this._attackConnectedThisState = false;
      foe.takeDamage(damage, this, isCrit, this.facing * knockX, knockY);
      const hitConnected =
        (!wasDead && foe.isDead) ||
        foe.hp < hpBefore ||
        Boolean(this._attackConnectedThisState);
      if (hitConnected) {
        landed = true;
        this.tempestComboStacks = Math.min(8, this.tempestComboStacks + 1);
        const hx = foe.x - this.facing * 12;
        const hy = foe.y - 84;
        this.spawnHitStarburst(hx, hy, '#fbbf24', '#6366f1');
        this._exParticles?.burst(hx, hy, {
          count: isCrit ? 9 : 5,
          shapes: ['bolt', 'star4', 'diamond'],
          speedMin: 60,
          speedMax: 185,
          upBias: 36,
          color: '#fbbf24',
          accent: '#6366f1',
          core: '#ffffff',
          layer: 'front'
        });
        this.gainMana(isCrit ? 6.5 : 4.2);
        if (isCrit && tier !== 'ULTIMATE' && tier !== 'TRUE_ULTIMATE') {
          this.gainFinisher(1.4);
        }
      }
    }
    this._activeHitTier = prevTier;

    if (landed) {
      if (game?.audio) game.audio.play(sfx, this.x + this.facing * 60);
      if (hitStop > 0) game?.renderer?.triggerHitStop?.(hitStop);
      if (shakeDur > 0) game?.renderer?.triggerShake?.(isCrit ? 9 : 5, shakeDur);
    }
    return landed;
  }

  _fireThunderclapWave(game, opts = {}) {
    const dir = this.facing || 1;
    const sx = opts.x ?? this.x + dir * 74;
    const sy = opts.y ?? this.y - 88;
    const dmg = opts.damage ?? 34;
    this._spawnProj(game, {
      type: 'thunderclap_wave',
      owner: this,
      heroId: 'brawler_ex',
      x: sx,
      y: sy,
      vx: dir * (opts.speed || 640),
      vy: 0,
      radius: 34,
      damage: dmg,
      isCrit: Boolean(opts.isCrit),
      knockX: dir * 68,
      knockY: -44,
      pierce: Boolean(opts.pierce),
      maxDist: opts.maxRange || 380,
      traveled: 0,
      color: '#fbbf24',
      coreColor: '#ffffff',
      age: 0,
      maxLife: 0.65
    });
  }

  updateAutoAttack(dt, enemy, game) {
    const v = this._autoVariant;
    const dur = BEAT_DURATIONS[v];
    const slice = AUTO_SLICES_EX[v];
    const t = this.stateTimer;
    const u = Math.min(1, Math.max(0, t / dur));
    const vsAspect = game?.isAdventureMode?.() ? 0 : this.buildAspect || 0;

    // Update exact 30fps sub-slice frame
    const localIdx = Math.min(slice[1] - 1, Math.floor(u * slice[1]));
    const frameIdx = slice[0] + localIdx;
    this.trueUltFrameOverride = frameIdx;
    this._overrideFrameIdx = frameIdx;

    // Crisp forward step-in lunge
    const moveU = Math.min(1, u / 0.36);
    const easedMove = 1 - Math.pow(1 - moveU, 2.4);
    this.x = this._beatStartX + (this._beatTargetX - this._beatStartX) * easedMove;

    // Subtle speed afterimage on snappy Beat 2 / Beat 3 / Beat 4 surges
    if (v >= 1 && u >= 0.14 && u <= 0.44) {
      this.afterimageAccum += dt;
      if (this.afterimageAccum >= 0.055) {
        this.afterimageAccum = 0;
        this.spawnAfterimage(this.x, this.y, this.facing, 2, frameIdx - 60, 0.16);
      }
    }

    // Beat 3 Rising Sky-Breaker Uppercut micro-hop returning cleanly to groundY
    if (v === 2) {
      if (u >= 0.18 && u <= 0.76) {
        const hopU = (u - 0.18) / 0.58;
        this.y = this.groundY - Math.sin(hopU * Math.PI) * 38;
      } else {
        this.y = this.groundY;
      }
    } else {
      this.y = this.groundY;
    }

    // Hit timings per martial beat
    if (v === 0) {
      // Beat 1: Snappy Stepping Storm Jab
      if ((this._beatHitMask & 1) === 0 && u >= 0.34) {
        this._beatHitMask |= 1;
        this.didActionFrame = true;
        const dmg = vsAspect === 1 ? 56 : vsAspect === 2 ? 42 : 49;
        game?.audio?.playHeroVoice?.(this.heroId, 'attack', {
          worldX: this.x,
          speakerKey: this,
          priority: 1,
          cooldownMs: 3600
        });
        this.spawnVfxAnim(0, this.x + this.facing * 68, this.y - 88, 128, 128, 0.24, { inFront: true });
        this.spawnTempestBolt(this.x + this.facing * 24, this.y - 92, this.x + this.facing * 108, this.y - 90, 0.16, 8);
        this._applyTempestStrike(enemy, game, {
          damage: dmg,
          reachFront: 152,
          hitStop: 0.028,
          shakeDur: 0.036,
          knockX: 34,
          knockY: -22,
          sfx: 'slash'
        });
      }
    } else if (v === 1) {
      // Beat 2: Cross-Step Spinning Thunder Backfist/Hook (rapid 2-hit whip)
      if ((this._beatHitMask & 1) === 0 && u >= 0.28) {
        this._beatHitMask |= 1;
        this.didActionFrame = true;
        this.spawnVfxAnim(0, this.x + this.facing * 72, this.y - 90, 144, 144, 0.26, { inFront: true });
        this._applyTempestStrike(enemy, game, {
          damage: vsAspect === 1 ? 39 : vsAspect === 2 ? 30 : 34,
          reachFront: 156,
          hitStop: 0.024,
          shakeDur: 0.03,
          knockX: 28,
          knockY: -18,
          sfx: 'slash'
        });
      }
      if ((this._beatHitMask & 2) === 0 && u >= 0.56) {
        this._beatHitMask |= 2;
        this.spawnTempestBolt(this.x + this.facing * 18, this.y - 98, this.x + this.facing * 116, this.y - 80, 0.18, 11);
        this._applyTempestStrike(enemy, game, {
          damage: vsAspect === 1 ? 44 : vsAspect === 2 ? 33 : 38,
          reachFront: 160,
          hitStop: 0.032,
          shakeDur: 0.04,
          knockX: 46,
          knockY: -30,
          sfx: 'heavy_cleave'
        });
      }
    } else if (v === 2) {
      // Beat 3: Rising Sky-Breaker Uppercut (lightning helix trail)
      if ((this._beatHitMask & 1) === 0 && u >= 0.34) {
        this._beatHitMask |= 1;
        this.didActionFrame = true;
        this.spawnVfxAnim(1, this.x + this.facing * 64, this.y - 108, 152, 168, 0.34, { inFront: true });
        this.spawnTempestBolt(this.x + this.facing * 52, this.groundY - 12, this.x + this.facing * 68, this.y - 156, 0.24, 14);
        this._applyTempestStrike(enemy, game, {
          damage: vsAspect === 1 ? 73 : vsAspect === 2 ? 54 : 64,
          reachFront: 158,
          hitStop: 0.042,
          shakeDur: 0.052,
          knockX: 42,
          knockY: -86,
          isCrit: true,
          sfx: 'heavy_cleave'
        });
        if (vsAspect === 2 && !game?.isAdventureMode?.()) {
          this.grantBuildShield?.(24, 2.4, 'STATIC BARRIER!', '#fbbf24');
        }
      }
    } else {
      // Beat 4: Heavy One-Inch THUNDERCLAP PALM Shockwave Finisher!
      if ((this._beatHitMask & 1) === 0 && u >= 0.36) {
        this._beatHitMask |= 1;
        this.didActionFrame = true;
        const impactX = this._clampArenaX(this.x + this.facing * 88, game);
        this.spawnVfxAnim(0, impactX, this.y - 88, 178, 178, 0.34, { inFront: true });
        this.spawnVfxAnim(5, impactX, this.groundY - 18, 172, 108, 0.42, { inFront: false });
        this.spawnGroundSeal(impactX, this.groundY, 84, 0.44);
        this.fx?.spawn('tempestBurst', this._safeFxX(impactX, game), this.y - 88, {
          extra: { radius: 44 }
        });
        this.spawnTempestBolt(this.x + this.facing * 36, this.y - 90, impactX + this.facing * 52, this.y - 110, 0.22, 13);
        this.spawnTempestBolt(this.x + this.facing * 36, this.y - 86, impactX + this.facing * 52, this.y - 68, 0.22, 13);
        this._applyTempestStrike(enemy, game, {
          damage: vsAspect === 1 ? 98 : vsAspect === 2 ? 76 : 92,
          reachFront: 192,
          hitStop: 0.056,
          shakeDur: 0.072,
          knockX: 112,
          knockY: -64,
          isCrit: true,
          sfx: 'thunder_slam'
        });
        // Aspect II: Storm-Emperor Burst launches a piercing Thunderclap shockwave (0 heal)
        if (vsAspect === 1 && !game?.isAdventureMode?.()) {
          this._fireThunderclapWave(game, {
            x: impactX,
            y: this.y - 88,
            damage: 54,
            speed: 740,
            maxRange: 390,
            pierce: true
          });
        } else if (!game?.isAdventureMode?.()) {
          this.heal(vsAspect === 2 ? 8 : 15, 'TEMPEST BREATH');
        }
      }
    }

    // Auto-chain smooth 4-beat combo flow
    if (t >= dur) {
      this.y = this.groundY;
      this.vy = 0;
      const isManual =
        (this.isPlayerControlled && !this.adventureAutoPlay) || this.isManualAdventureControl;
      const foeInRange =
        enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= this.attackRange + 85;
      if (v < 3 && (this._queuedNextBeat || (!isManual && foeInRange))) {
        this._beginComboBeat(v + 1, game);
      } else {
        this.autoCooldown = v === 3 ? this._postFlurryInterval : INTRA_COMBO_LINK;
        this.setState('IDLE');
      }
    }
  }

  updateSkill(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.skillDuration || 0.72;
    const u = Math.min(1, Math.max(0, t / dur));
    const vsSkill = game?.isAdventureMode?.() ? 0 : this.buildSkill || 0;

    const frameIdx = 90 + Math.min(29, Math.floor(u * 30));
    this.trueUltFrameOverride = frameIdx;
    this._overrideFrameIdx = frameIdx;

    if (this._skillPhase === 0) {
      this._skillPhase = 1;
      this._skillStartX = this.x;
      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
        const dist = Math.abs(enemy.x - this.x);
        const desiredDist = Math.min(360, Math.max(110, dist - 68));
        this._skillTargetX = this._clampArenaX(this.x + this.facing * desiredDist, game);
      } else {
        this._skillTargetX = this._clampArenaX(this.x + this.facing * 220, game);
      }
      if (game?.audio) {
        game.audio.play('storm_leap', this.x);
        game.audio.playHeroVoice?.(this.heroId, vsSkill === 1 ? 'skill_alt' : 'skill_std', {
          worldX: this.x,
          speakerKey: this,
          priority: 2,
          cooldownMs: 400,
          duckSfx: true
        });
      }
      this.spawnGroundSeal(this.x, this.groundY, 76, 0.36);
      if (vsSkill === 2 && !game?.isAdventureMode?.()) {
        // Skill III: IRON-BODY BREAKER — single clean buildShield + recovery & unstoppable surge
        this.grantBuildShield?.(40, 2.6, 'IRON-BODY BARRIER!', '#fbbf24');
        this.heal(10, 'IRON-BODY');
        this.unstoppablePoise = true;
      } else if (vsSkill === 0 && !game?.isAdventureMode?.()) {
        // Baseline Skill I: balanced static barrier + martial vitality breath
        this.staticBarrier = Math.min(130, this.staticBarrier + 54);
        this.staticBarrierTimer = Math.max(this.staticBarrierTimer, 2.9);
        this.heal(22, 'STORM BREATH');
        this.unstoppablePoise = true;
      }
    }

    // Phase 1 -> 2 (u = 0.16..0.42): Explosive Lightning Dash-Rush with afterimages!
    if (u >= 0.16 && u <= 0.42) {
      const du = (u - 0.16) / 0.26;
      const eased = 1 - Math.pow(1 - du, 2.6);
      this.x = this._skillStartX + (this._skillTargetX - this._skillStartX) * eased;
      this.afterimageAccum += dt;
      if (this.afterimageAccum >= 0.032) {
        this.afterimageAccum = 0;
        this.spawnAfterimage(this.x, this.y, this.facing, 3, Math.min(12, Math.floor(u * 30)), 0.22);
      }
      if (this._skillPhase === 1) {
        this._skillPhase = 2;
        this.spawnVfxAnim(2, (this._skillStartX + this._skillTargetX) * 0.5, this.y - 84, 210, 148, 0.32, {
          inFront: true
        });
        this.spawnTempestBolt(this._skillStartX, this.y - 82, this._skillTargetX, this.y - 88, 0.24, 16);
      }
    }

    // Phase 2 -> 3 (u >= 0.42): Explosive Storm Cross-Punch Detonation!
    if (this._skillPhase < 3 && u >= 0.42) {
      this._skillPhase = 3;
      this.didActionFrame = true;
      this.x = this._skillTargetX;
      const hitX = this._clampArenaX(this.x + this.facing * 82, game);
      this.spawnVfxAnim(0, hitX, this.y - 88, 192, 192, 0.38, { inFront: true });
      this.spawnVfxAnim(5, hitX, this.groundY - 16, 186, 114, 0.44, { inFront: false });
      this.spawnGroundSeal(hitX, this.groundY, 96, 0.48);
      this.fx?.spawn('tempestBurst', this._safeFxX(hitX, game), this.y - 88, {
        extra: { radius: 52 }
      });
      this.spawnTempestBolt(this.x + this.facing * 24, this.y - 96, hitX + this.facing * 56, this.y - 122, 0.26, 15);
      this.spawnTempestBolt(this.x + this.facing * 24, this.y - 80, hitX + this.facing * 56, this.y - 62, 0.26, 15);

      const baseDmg = vsSkill === 1 ? 150 : vsSkill === 2 ? 112 : 138;
      this._applyTempestStrike(enemy, game, {
        damage: baseDmg,
        reachFront: 215,
        hitStop: 0.056,
        shakeDur: 0.078,
        knockX: 118,
        knockY: -74,
        isCrit: true,
        sfx: 'thunder_slam'
      });

      if (vsSkill === 1 && !game?.isAdventureMode?.()) {
        // Skill II: RAIL-STEP OVERVOLT secondary lightning wave follow-up (zero heal / zero barrier)
        this._fireThunderclapWave(game, {
          x: hitX,
          y: this.y - 88,
          damage: 60,
          speed: 780,
          maxRange: 440,
          isCrit: true,
          pierce: true
        });
      }
    }

    if (t >= dur) {
      this.y = this.groundY;
      this.vy = 0;
      this.unstoppablePoise = false;
      this.setState('IDLE');
    }
  }

  updateUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.ultDuration || 1.32;
    const u = Math.min(1, Math.max(0, t / dur));
    const vsUlt = game?.isAdventureMode?.() ? 0 : this.buildUlt || 0;

    // Row 4 F00..F14 (`120..134`)
    const localCol = Math.min(14, Math.floor(u * 15));
    this.trueUltFrameOverride = 120 + localCol;
    this._overrideFrameIdx = 120 + localCol;

    if (!this._ultInit) {
      this._ultInit = true;
      this._ultHitStep = 0;
      this.isInvulnerable = true;
      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
        this._ultTargetX = this._clampArenaX(enemy.x - this.facing * 82, game);
      } else {
        this._ultTargetX = this._clampArenaX(this.x + this.facing * 120, game);
      }
      this.spawnVfxAnim(7, this.x, this.y - 86, 208, 208, 0.78, { inFront: false, followOwner: true, offsetY: -86 });
      this.spawnGroundSeal(this.x, this.groundY, 118, 0.84);
      game?.vfx?.triggerCinematicCutIn?.(this, this.ultName, '#fbbf24');
      game?.vfx?.spawnSpecialCastAura?.(this, this.ultName, this.ultSub, 'tempest', false);
      if (game?.audio) {
        game.audio.play('ult_cast', this.x);
        game.audio.playHeroVoice?.(this.heroId, vsUlt === 1 ? 'ult_alt' : 'ult_std', {
          worldX: this.x,
          speakerKey: this,
          priority: 3,
          cooldownMs: 400,
          duckSfx: true
        });
      }
      if (vsUlt === 2 && !game?.isAdventureMode?.()) {
        // Ult III: IRON-BODY: RETRIBUTION FISTS — single clean buildShield + martial recovery
        this.grantBuildShield?.(54, 3.0, 'IRON-BODY BARRIER!', '#fbbf24');
        this.heal(24, 'IRON-BODY');
      } else if (vsUlt === 0 && !game?.isAdventureMode?.()) {
        this.heal(50, 'TEMPEST SURGE');
      }
    }

    // Snap rapidly into melee barrage pocket during F00..F02
    if (u < 0.18) {
      const approach = Math.min(1, u / 0.16);
      this.x = this.x + (this._ultTargetX - this.x) * Math.min(1, dt * 22 + approach * 0.28);
    }

    // 6-hit supersonic TEMPEST HUNDRED FISTS phantom barrage (u = 0.18..0.58)
    const barrageTimes = [0.18, 0.25, 0.32, 0.39, 0.46, 0.53];
    while (this._ultHitStep < barrageTimes.length && u >= barrageTimes[this._ultHitStep]) {
      const idx = this._ultHitStep++;
      const strikeX = this._clampArenaX(this.x + this.facing * (76 + (idx % 3) * 14), game);
      const strikeY = this.y - 78 - ((idx % 3) - 1) * 20;
      this.spawnVfxAnim(3, strikeX, strikeY, 188, 178, 0.22, { inFront: true });
      this.spawnAfterimage(this.x - this.facing * 10, this.y, this.facing, 4, 3 + (idx % 6), 0.15);
      this.spawnTempestBolt(this.x + this.facing * 26, this.y - 90, strikeX + this.facing * 32, strikeY, 0.14, 12);
      const hitDmg = vsUlt === 1 ? 48 : vsUlt === 2 ? 37 : 43;
      this._applyTempestStrike(enemy, game, {
        damage: hitDmg,
        reachFront: 235,
        hitStop: 0.016,
        shakeDur: 0.026,
        knockX: 12,
        knockY: -8,
        sfx: 'slash',
        tier: 'ULTIMATE'
      });
    }

    // Climax Rising Shockwave Uppercut (u >= 0.65, F10..F11 -> grounded F12..F14)
    if (u >= 0.64 && u <= 0.80) {
      const riseU = (u - 0.64) / 0.16;
      this.y = this.groundY - Math.sin(riseU * Math.PI) * 56;
    } else {
      this.y = this.groundY;
      this.vy = 0;
    }

    if (this._ultHitStep === barrageTimes.length && u >= 0.66) {
      this._ultHitStep++;
      this.didActionFrame = true;
      const finX = this._clampArenaX(this.x + this.facing * 86, game);
      this.spawnVfxAnim(1, finX, this.groundY - 120, 196, 224, 0.48, { inFront: true });
      this.spawnVfxAnim(5, finX, this.groundY - 18, 210, 124, 0.52, { inFront: false });
      this.fx?.spawn('tempestBurst', this._safeFxX(finX, game), this.groundY - 104, {
        extra: { radius: 64 }
      });
      if (vsUlt === 1 && !game?.isAdventureMode?.()) {
        // Ult II: EMPEROR: SKY-PILLAR HUNDRED FISTS — twin sky-lightning pillars!
        this.spawnVfxAnim(4, finX, this.groundY - 148, 210, 290, 0.56, { inFront: true });
        this.fx?.spawn('tempestPillar', this._safeFxX(finX, game), this.groundY - 8, {
          extra: { halfW: 32, height: 180 }
        });
      }
      this.spawnTempestBolt(finX - 24, this.groundY - 220, finX + 18, this.groundY - 10, 0.34, 18);
      this._applyTempestStrike(enemy, game, {
        damage: vsUlt === 1 ? 186 : vsUlt === 2 ? 134 : 152,
        reachFront: 260,
        hitStop: 0.072,
        shakeDur: 0.11,
        knockX: 145,
        knockY: -118,
        isCrit: true,
        sfx: 'thunder_slam',
        tier: 'ULTIMATE'
      });
    }

    if (t >= dur) {
      this.y = this.groundY;
      this.vy = 0;
      this.isInvulnerable = false;
      this.unstoppablePoise = false;
      this.setState('IDLE');
    }
  }

  updateTrueUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.trueUltDuration || 4.10;
    const tx = enemy && !enemy.isDead ? enemy.x : this._trueUltTargetX || this.x + this.facing * 180;

    // Smooth dark Thunder-God storm domain backdrop alpha across Acts 1..4
    if (t < 0.35) {
      this._trueUltDomainAlpha = Math.min(1, t / 0.35);
    } else if (t > dur - 0.55) {
      this._trueUltDomainAlpha = Math.max(0, (dur - t) / 0.55);
    } else {
      this._trueUltDomainAlpha = 1;
    }

    // ==================== ACT 1 (0.00..0.85s): THUNDER-GOD DOMAIN AWAKENING ====================
    if (!this._trueUltInit) {
      this._trueUltInit = true;
      this._trueUltStage = 0;
      this._trueUltBlitzStep = 0;
      this._blitzTethers.length = 0;
      this._trueUltStartX = this.x;
      this.isInvulnerable = true;
      this.unstoppablePoise = true;
      this._trueUltTargetX = this._clampArenaX(tx, game);
      this.facing = this._trueUltTargetX >= this.x ? 1 : -1;

      this.spawnVfxAnim(7, this.x, this.y - 92, 260, 260, 1.05, { inFront: false, followOwner: true, offsetY: -92 });
      this.spawnGroundSeal(this.x, this.groundY, 146, 1.05);
      this.fx?.spawn('tempestPillar', this._safeFxX(this.x, game), this.groundY - 8, {
        extra: { halfW: 32, height: 184 }
      });
      this.spawnTempestBolt(this.x - 12, this.groundY - 360, this.x, this.groundY - 8, 0.36, 18);
      if (game?.audio) {
        game.audio.play('ult_cast', this.x);
        game.audio.playHeroVoice?.(this.heroId, 'true_ult_charge', {
          worldX: this.x,
          speakerKey: this,
          priority: 4,
          cooldownMs: 300,
          duckSfx: true
        });
      }
      if (!game?.isAdventureMode?.()) {
        this.heal(Math.round(this.maxHp * 0.072), 'RAIJIN SECOND WIND');
      }
      game?.renderer?.triggerShake?.(10, 0.28);
    }

    if (t < 0.85) {
      const fIdx = 135 + Math.min(2, Math.floor((t / 0.85) * 3));
      this.trueUltFrameOverride = fIdx;
      this._overrideFrameIdx = fIdx;
      this.y = this.groundY;
      return;
    }

    // ==================== ACT 2 (0.85..2.15s): 6-STRIKE STAR-CAGE LIGHTNING TELEPORT BLITZ ====================
    if (t < 2.15) {
      if (this._trueUltStage < 1) {
        this._trueUltStage = 1;
        this._trueUltTargetX = this._clampArenaX(tx, game);
      }
      const focusX = this._clampArenaX(enemy && !enemy.isDead ? enemy.x : this._trueUltTargetX, game);
      this._trueUltTargetX = focusX;

      const blitzSchedule = [
        { time: 0.88, offX: -124, oy: 0, face: 1, frame: 63, gold: true },
        { time: 1.08, offX: 124, oy: -10, face: -1, frame: 70, gold: false },
        { time: 1.28, offX: -104, oy: -46, face: 1, frame: 77, gold: true },
        { time: 1.48, offX: 104, oy: -46, face: -1, frame: 85, gold: false },
        { time: 1.68, offX: -82, oy: -98, face: 1, frame: 106, gold: true },
        { time: 1.88, offX: 82, oy: -98, face: -1, frame: 130, gold: false }
      ];

      while (this._trueUltBlitzStep < blitzSchedule.length && t >= blitzSchedule[this._trueUltBlitzStep].time) {
        const s = blitzSchedule[this._trueUltBlitzStep++];
        const prevX = this.x;
        const prevY = this.y - 82;

        this.spawnAfterimage(this.x, this.y, this.facing, 2, 3, 0.34);
        this.x = this._clampArenaX(focusX + s.offX, game);
        this.y = this.groundY + s.oy;
        this.facing = s.face;
        this.trueUltFrameOverride = s.frame;
        this._overrideFrameIdx = s.frame;
        this.spawnAfterimage(this.x, this.y, this.facing, 4, 18, 0.32);

        // Weave persistent blazing lightning tether connecting each blitz point into a Thunder Star-Cage!
        this._blitzTethers.push({
          x0: prevX,
          y0: prevY,
          x1: this.x,
          y1: this.y - 82,
          age: 0,
          maxLife: 1.35,
          seed: Math.random() * 100,
          isGold: s.gold
        });
        this.spawnVfxAnim(0, focusX, this.groundY - 88 + s.oy * 0.45, 198, 198, 0.28, {
          flipX: s.face < 0,
          inFront: true
        });
        this.spawnVfxAnim(3, focusX, this.groundY - 88 + s.oy * 0.4, 186, 176, 0.24, {
          flipX: s.face < 0,
          inFront: true
        });
        this.spawnTempestBolt(this.x, this.y - 82, focusX, this.groundY - 88, 0.22, 16);
        this.spawnGroundSeal(focusX, this.groundY, 118 + this._trueUltBlitzStep * 10, 0.36);

        this._applyTempestStrike(enemy, game, {
          damage: 34,
          reachFront: 280,
          reachBack: 180,
          hitStop: 0.024,
          shakeDur: 0.075,
          knockX: 6,
          knockY: -34,
          isCrit: s.gold,
          sfx: s.gold ? 'heavy_cleave' : 'slash',
          tier: 'TRUE_ULTIMATE'
        });
      }
      return;
    }

    // ==================== ACT 3 (2.15..2.95s): HEAVEN-SPLITTING SKY ASCENT & RAIJIN HALO ====================
    if (t < 2.95) {
      const focusX = this._clampArenaX(enemy && !enemy.isDead ? enemy.x : this._trueUltTargetX, game);
      this._trueUltTargetX = focusX;
      const ascU = Math.min(1, (t - 2.15) / 0.80);

      if (this._trueUltStage < 2) {
        this._trueUltStage = 2;
        if (game?.audio) game.audio.play('storm_leap', this.x);
        this.spawnVfxAnim(1, this.x, this.groundY - 140, 224, 290, 0.62, { inFront: true });
        this.spawnVfxAnim(7, this.x, this.y - 96, 270, 270, 0.82, { inFront: false, followOwner: true, offsetY: -96 });
        this.spawnGroundSeal(focusX, this.groundY, 174, 1.15);
        this.fx?.spawn('tempestCrater', this._safeFxX(focusX, game), this.groundY - 6, {
          extra: { rx: 108, ry: 24 }
        });
      }

      const lift = 300 * (1 - Math.pow(1 - Math.min(1, ascU * 1.25), 2.3));
      const hoverX = this._clampArenaX(focusX - this.facing * 52, game);
      this.x = this.x + (hoverX - this.x) * Math.min(1, dt * 10);
      this.y = this.groundY - lift;
      this.cameraAirLift = lift * 0.68;

      // Smooth knee-tuck launch (F18..F20) -> cocked downward meteor-fist poise (F21..F22)
      const skyFrame = ascU < 0.56 ? 138 + Math.min(2, Math.floor((ascU / 0.56) * 3)) : 141 + (ascU >= 0.78 ? 1 : 0);
      this.trueUltFrameOverride = skyFrame;
      this._overrideFrameIdx = skyFrame;

      this.afterimageAccum += dt;
      if (this.afterimageAccum >= 0.055) {
        this.afterimageAccum = 0;
        this.spawnAfterimage(this.x, this.y, this.facing, 4, skyFrame - 120, 0.22);
        this.spawnTempestBolt(this.x + (Math.random() - 0.5) * 80, this.y - 120, focusX + (Math.random() - 0.5) * 60, this.groundY - 4, 0.16, 18);
      }
      return;
    }

    // ==================== ACT 4 (2.95..4.10s): METEOR RAIJIN FIST CRASH & 5-PILLAR SKY CATACLYSM ====================
    if (t < 3.09) {
      const diveU = Math.min(1, (t - 2.95) / 0.14);
      const landX = this._clampArenaX(this._trueUltTargetX - this.facing * 52, game);
      this.x = this.x + (landX - this.x) * Math.min(1, dt * 28);
      this.y = this.groundY - 300 * (1 - diveU * diveU);
      this.cameraAirLift = Math.max(0, (this.groundY - this.y) * 0.68);
      const diveFrame = 143 + Math.min(1, Math.floor(diveU * 2));
      this.trueUltFrameOverride = diveFrame;
      this._overrideFrameIdx = diveFrame;
      this.spawnAfterimage(this.x, this.y, this.facing, 4, diveFrame - 120, 0.28);
      return;
    }

    // Impact Detonation & Grounded Recovery (3.09..4.10s)
    this.y = this.groundY;
    this.vy = 0;
    this.cameraAirLift = Math.max(0, this.cameraAirLift - dt * 960);
    const recU = Math.min(1, (t - 3.09) / Math.max(0.1, dur - 3.09));
    const impactFrame = recU < 0.24 ? 145 : 146 + Math.min(3, Math.floor(((recU - 0.24) / 0.76) * 4));
    this.trueUltFrameOverride = impactFrame;
    this._overrideFrameIdx = impactFrame;

    if (this._trueUltStage < 3) {
      this._trueUltStage = 3;
      this.didActionFrame = true;
      this._stormCrashTimer = 1.0;

      const crashX = this._clampArenaX(this.x + this.facing * 58, game);
      // Black/Gold Anime Impact Frame + Colossal Shake + HitStop!
      game?.renderer?.triggerImpactFrame?.(crashX, this.groundY - 110, 0.14, 'exvius');
      game?.renderer?.triggerShake?.(24, 0.48);
      game?.renderer?.triggerHitStop?.(0.088);
      game?.audio?.playHeroVoice?.(this.heroId, 'true_ult_fire', {
        worldX: crashX,
        speakerKey: this,
        priority: 4,
        cooldownMs: 200,
        duckSfx: true
      });

      // Colossal Central Heaven-Splitting Raijin Pillar + 2 Flanking Sky-Bolts (reaching clean to top of sky!)
      const pillarSpecs = [
        { off: 0, w: 236, h: 680, life: 0.90, beamW: 58, beamCol: '#fbbf24', inFront: true },
        { off: -148, w: 138, h: 680, life: 0.72, beamW: 28, beamCol: '#38bdf8', inFront: false },
        { off: 148, w: 138, h: 680, life: 0.72, beamW: 28, beamCol: '#38bdf8', inFront: false }
      ];
      for (let i = 0; i < pillarSpecs.length; i++) {
        const ps = pillarSpecs[i];
        const px = this._clampArenaX(crashX + ps.off, game);
        this.spawnVfxAnim(4, px, this.groundY - ps.h * 0.48, ps.w, ps.h, ps.life, {
          inFront: ps.inFront
        });
        game?.vfx?.spawnBeam?.({
          x1: px,
          y1: this.groundY - 640,
          x2: px,
          y2: this.groundY,
          width: ps.beamW,
          color: ps.beamCol,
          coreColor: '#ffffff',
          maxLife: i === 0 ? 0.54 : 0.40,
          owner: this
        });
        this.spawnTempestBolt(px + (i % 2 === 0 ? -28 : 28), this.groundY - 460, px, this.groundY - 6, 0.46, 24);
      }
      // Diagonal outer lightning arcs exploding outward from crater
      this.spawnTempestBolt(crashX, this.groundY - 24, this._clampArenaX(crashX - 220, game), this.groundY - 140, 0.38, 18);
      this.spawnTempestBolt(crashX, this.groundY - 24, this._clampArenaX(crashX + 220, game), this.groundY - 140, 0.38, 18);

      game?.vfx?.spawnDecal?.(crashX, this.groundY, 'crater', 174);
      game?.vfx?.spawnShockwave?.(crashX, this.groundY - 4, 240, '#fbbf24', 0.46);
      game?.vfx?.spawnShockwave?.(crashX, this.groundY - 4, 178, '#38bdf8', 0.34);
      this.spawnVfxAnim(5, crashX, this.groundY - 18, 340, 180, 0.92, { inFront: false });
      this.spawnGroundSeal(crashX, this.groundY, 192, 0.98);
      this.fx?.spawn('tempestPillar', this._safeFxX(crashX, game), this.groundY - 8, {
        extra: { halfW: 40, height: 210 }
      });
      this.fx?.spawn('tempestCrater', this._safeFxX(crashX, game), this.groundY - 6, {
        extra: { rx: 118, ry: 26 }
      });
      this._exParticles?.burst(crashX, this.groundY - 54, {
        count: 28,
        shapes: ['bolt', 'star4', 'diamond'],
        speedMin: 110,
        speedMax: 340,
        upBias: 110,
        color: '#fbbf24',
        accent: '#38bdf8',
        core: '#ffffff',
        layer: 'front'
      });

      this._applyTempestStrike(enemy, game, {
        damage: 380,
        reachFront: 360,
        reachBack: 220,
        hitStop: 0.085,
        shakeDur: 0.24,
        knockX: 165,
        knockY: -155,
        isCrit: true,
        sfx: 'thunder_slam',
        tier: 'TRUE_ULTIMATE'
      });
    }

    // Secondary storm-crater aftershock detonation at t >= 3.40s
    if (this._trueUltStage === 3 && t >= 3.40) {
      this._trueUltStage = 4;
      const crashX = this._clampArenaX(this.x + this.facing * 58, game);
      this.spawnVfxAnim(0, crashX, this.groundY - 96, 250, 250, 0.42, { inFront: true });
      game?.vfx?.spawnShockwave?.(crashX, this.groundY - 4, 268, '#fef08a', 0.36);
      this._applyTempestStrike(enemy, game, {
        damage: 145,
        reachFront: 380,
        reachBack: 220,
        hitStop: 0.055,
        shakeDur: 0.16,
        knockX: 120,
        knockY: -108,
        isCrit: true,
        sfx: 'heavy_cleave',
        tier: 'TRUE_ULTIMATE'
      });
    }

    if (t >= dur) {
      this.y = this.groundY;
      this.vy = 0;
      this.cameraAirLift = 0;
      this._trueUltDomainAlpha = 0;
      this._blitzTethers.length = 0;
      this.isInvulnerable = false;
      this.unstoppablePoise = false;
      this.setState('IDLE');
    }
  }

  startCrouch(enemy, game) {
    if (enemy && !enemy.isDead) this.facing = enemy.x >= this.x ? 1 : -1;
    this.crouchCooldown = 2.6;
    this.isCrouching = true;
    this.isDeflecting = true;
    this.didSecondaryAction = false;
    this.vx = 0;
    this.y = this.groundY;
    this.setState('CROUCH');
    if (game?.audio) game.audio.play('clang', this.x);
    this.spawnVfxAnim(6, this.x + this.facing * 24, this.y - 84, 132, 132, 0.28, {
      followOwner: true,
      offsetX: 24,
      offsetY: -84,
      inFront: true
    });
  }

  updateCrouch(_dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.crouchDuration || 0.86;
    const vsAspect = game?.isAdventureMode?.() ? 0 : this.buildAspect || 0;
    this.vx = 0;
    this.y = this.groundY;
    this.isCrouching = true;
    this.isDeflecting = t < (vsAspect === 2 ? 0.62 : 0.50);

    // Crossed-forearm Iron Guard projectile deflection!
    if (this.isDeflecting && game?.vfx?.projectiles) {
      for (const proj of game.vfx.projectiles) {
        if (
          proj.owner !== this &&
          !proj._reflectedByEx &&
          Math.abs(proj.x - this.x) < 92 &&
          Math.abs(proj.y - (this.y - 82)) < 92
        ) {
          proj._reflectedByEx = true;
          proj.owner = this;
          proj.vx = -proj.vx * 1.28;
          proj.color = '#fbbf24';
          proj.coreColor = '#ffffff';
          if (game?.audio) game.audio.play('clang', proj.x);
          this.gainMana(14);
          this.gainFinisher(8);
          if (vsAspect === 2 && !game?.isAdventureMode?.()) {
            this.grantBuildShield?.(48, 2.8, 'IRON-BODY PARRY!', '#fbbf24');
          }
          this.spawnVfxAnim(6, proj.x, proj.y, 146, 146, 0.28, { inFront: true });
          this.spawnHitStarburst(proj.x, proj.y, '#fbbf24', '#6366f1');
        }
      }
    }

    if (!this.didSecondaryAction && t >= 0.48) {
      this.didSecondaryAction = true;
      this.isDeflecting = false;
      const hitX = this._clampArenaX(this.x + this.facing * 72, game);
      this.spawnVfxAnim(0, hitX, this.y - 86, 152, 152, 0.28, { inFront: true });
      this._applyTempestStrike(enemy, game, {
        damage: vsAspect === 2 ? 88 : vsAspect === 1 ? 88 : 74,
        reachFront: 178,
        hitStop: 0.044,
        shakeDur: 0.056,
        knockX: 94,
        knockY: -54,
        isCrit: true,
        sfx: 'thunder_slam'
      });
      if (vsAspect !== 1 && !game?.isAdventureMode?.()) {
        this.heal(vsAspect === 2 ? 10 : 20, 'IRON GUARD');
      }
    }

    if (t >= dur) {
      this.isCrouching = false;
      this.isDeflecting = false;
      this.setState('IDLE');
    }
  }

  startDash(enemy, game) {
    if (this._advPureDodge) return;
    if (enemy && !enemy.isDead && !this.isPlayerControlled) {
      this.facing = enemy.x >= this.x ? 1 : -1;
    }
    this.dashCooldown = this.dashMaxCooldown * (0.86 + Math.random() * 0.24);
    this.dashDuration = 0.26;
    this.dashDir = this.facing;
    this._dashStartX = this.x;
    let dashDist = 215;
    if (enemy && !enemy.isDead && this.dashDir === (enemy.x >= this.x ? 1 : -1)) {
      const frontDist = Math.abs(enemy.x - this.x);
      if (frontDist > 96) {
        dashDist = Math.min(240, Math.max(96, frontDist - 78));
      }
    }
    this._dashTargetX = this._clampArenaX(this.x + this.dashDir * dashDist, game);
    this.vx = 0;
    this.vy = 0;
    this.y = this.groundY;
    this.setState('DASH');
    if (game?.audio) game.audio.play('storm_leap', this.x);
    this.spawnTempestBolt(this.x, this.y - 76, this._dashTargetX, this.y - 76, 0.18, 12);
    this.spawnGroundSeal(this.x, this.groundY, 56, 0.22);
  }

  updateDash(dt, _enemy, _game) {
    const t = this.stateTimer;
    const dur = this.dashDuration || 0.26;
    const u = Math.min(1, Math.max(0, t / dur));
    const eased = 1 - Math.pow(1 - u, 2.5);
    this.x = (this._dashStartX ?? this.x) + ((this._dashTargetX ?? this.x) - (this._dashStartX ?? this.x)) * eased;
    this.y = this.groundY;
    this.vy = 0;
    this.isInvulnerable = u < 0.45;
    this.afterimageAccum += dt;
    if (this.afterimageAccum >= 0.036) {
      this.afterimageAccum = 0;
      this.spawnAfterimage(this.x, this.y, this.facing, 6, Math.min(28, Math.floor(u * 30)), 0.16);
    }
    if (t >= dur) {
      this.x = this._dashTargetX ?? this.x;
      this.y = this.groundY;
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  startJump(enemy, game, dirOverride = null) {
    if (this._advPureDodge) return;
    const dir = dirOverride || this.facing;
    this.facing = dir;
    this.vaultCooldown = 2.2;
    this.jumpCooldown = 2.2;
    this.dashDuration = 0.38;
    this.isFlipVault = true;
    this.isInvulnerable = true;
    this.didSecondaryAction = false;
    this.flipStartX = this.x;

    let jumpDist = 196;
    if (enemy && !enemy.isDead && dir === (enemy.x >= this.x ? 1 : -1)) {
      const frontDist = Math.abs(enemy.x - this.x);
      if (frontDist > 120 && frontDist < 320) {
        jumpDist = Math.min(196, Math.max(92, frontDist - 88));
      }
    }
    this.flipTargetX = this._clampArenaX(this.x + dir * jumpDist, game);
    this.vx = 0;
    this.vy = 0;
    this.setState('JUMP');
    if (game?.audio) game.audio.play('storm_leap', this.x);
    this.spawnGroundSeal(this.x, this.groundY, 64, 0.24);
  }

  updateJump(dt, enemy, game) {
    if (this._advPureDodge) return;
    const t = this.stateTimer;
    const dur = this.dashDuration || 0.38;
    const u = Math.min(1, Math.max(0, t / dur));

    this.x = this.flipStartX + (this.flipTargetX - this.flipStartX) * (1 - Math.pow(1 - u, 2.0));
    this.y = this.groundY - Math.sin(u * Math.PI) * 104;
    this.isInvulnerable = u < 0.62;

    this.afterimageAccum += dt;
    if (this.afterimageAccum >= 0.042 && u < 0.82) {
      this.afterimageAccum = 0;
      this.spawnAfterimage(this.x, this.y, this.facing, 8, Math.min(28, Math.floor(u * 30)), 0.16);
    }

    if (!this.didSecondaryAction && u >= 0.52) {
      this.didSecondaryAction = true;
      if (enemy && !enemy.isDead) this.facing = enemy.x >= this.x ? 1 : -1;
      const hitX = this._clampArenaX(this.x + this.facing * 56, game);
      this.spawnVfxAnim(0, hitX, this.y - 68, 144, 144, 0.24, { inFront: true });
      this._applyTempestStrike(enemy, game, {
        damage: 34,
        reachFront: 164,
        hitStop: 0.036,
        shakeDur: 0.046,
        knockX: 68,
        knockY: -46,
        sfx: 'heavy_cleave'
      });
    }

    if (t >= dur) {
      this.y = this.groundY;
      this.vy = 0;
      this.isInvulnerable = false;
      this.isFlipVault = false;
      this.setState('IDLE');
    }
  }

  updateDashOrDodge(dt, enemy, game) {
    if (this._advPureDodge) return;
    if (this.state === 'DASH') {
      this.updateDash(dt, enemy, game);
    } else if (this.state === 'JUMP') {
      this.updateJump(dt, enemy, game);
    } else {
      // Snappy invulnerable lightning backstep / roll (`DODGE`)
      const dur = this.dashDuration || 0.28;
      this.x = this._clampArenaX(this.x + (this.dashDir || -this.facing) * 460 * dt, game);
      this.y = this.groundY;
      this.isInvulnerable = this.stateTimer < dur * 0.72;
      this.afterimageAccum += dt;
      if (this.afterimageAccum >= 0.04) {
        this.afterimageAccum = 0;
        this.spawnAfterimage(this.x, this.y, this.facing, 8, Math.min(28, Math.floor((this.stateTimer / dur) * 30)), 0.14);
      }
      if (this.stateTimer >= dur) {
        this.isInvulnerable = false;
        this.setState('IDLE');
      }
    }
  }

  update(dt, enemy, game) {
    this._currentEnemy = enemy;
    this.game = game;

    if (this._comboPersistTimer > 0) this._comboPersistTimer = Math.max(0, this._comboPersistTimer - dt);
    if (this.staticBarrierTimer > 0) {
      this.staticBarrierTimer = Math.max(0, this.staticBarrierTimer - dt);
      if (this.staticBarrierTimer <= 0) this.staticBarrier = 0;
    }
    if (this.crouchCooldown > 0) this.crouchCooldown = Math.max(0, this.crouchCooldown - dt);
    if (this.vaultCooldown > 0) this.vaultCooldown = Math.max(0, this.vaultCooldown - dt);
    if (this._stormCrashTimer > 0) this._stormCrashTimer = Math.max(0, this._stormCrashTimer - dt);

    // Step afterimages, VFX animations, pixel bolts, seals & ArcaneShaderFX
    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      this.afterimages[i].life += dt;
      if (this.afterimages[i].life >= this.afterimages[i].maxLife) this.afterimages.splice(i, 1);
    }
    for (let i = this.activeVfxAnims.length - 1; i >= 0; i--) {
      const a = this.activeVfxAnims[i];
      a.age += dt;
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      if (a.followOwner) {
        a.x = this.x + this.facing * a.offsetX;
        a.y = this.y + a.offsetY;
      }
      if (a.age >= a.maxLife) this.activeVfxAnims.splice(i, 1);
    }
    for (let i = this.tempestBolts.length - 1; i >= 0; i--) {
      this.tempestBolts[i].age += dt;
      if (this.tempestBolts[i].age >= this.tempestBolts[i].maxLife) this.tempestBolts.splice(i, 1);
    }
    for (let i = this._blitzTethers.length - 1; i >= 0; i--) {
      this._blitzTethers[i].age += dt;
      if (this._blitzTethers[i].age >= this._blitzTethers[i].maxLife) this._blitzTethers.splice(i, 1);
    }
    if (this.state !== 'TRUE_ULTIMATE' && this._trueUltDomainAlpha > 0) {
      this._trueUltDomainAlpha = Math.max(0, this._trueUltDomainAlpha - dt * 2.4);
    }
    for (let i = this.groundSeals.length - 1; i >= 0; i--) {
      this.groundSeals[i].age += dt;
      if (this.groundSeals[i].age >= this.groundSeals[i].maxLife) this.groundSeals.splice(i, 1);
    }

    this.fx?.update(dt);
    this._exParticles?.update(dt);

    super.update(dt, enemy, game);
  }

  _drawVfxLayer(ctx, sprites, inFront) {
    const vfxSheet = PixelForge.ensureImage?.(sprites?.vfx) || sprites?.vfx;
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;
    for (let i = 0; i < this.activeVfxAnims.length; i++) {
      const a = this.activeVfxAnims[i];
      if (Boolean(a.inFront) !== inFront) continue;
      const u = Math.min(0.999, Math.max(0, a.age / Math.max(0.001, a.maxLife)));
      const col = Math.min(a.endFrame, a.startFrame + Math.floor(u * (a.endFrame - a.startFrame + 1)));
      const sx = col * 208;
      const sy = a.row * 208;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(Math.round(a.x), Math.round(a.y));
      if (a.flipX) ctx.scale(-1, 1);
      ctx.drawImage(vfxSheet, sx, sy, 208, 208, Math.round(-a.w * 0.5), Math.round(-a.h * 0.5), Math.round(a.w), Math.round(a.h));
      ctx.restore();
    }
  }

  _drawGroundSeals(ctx) {
    for (let i = 0; i < this.groundSeals.length; i++) {
      const s = this.groundSeals[i];
      const u = Math.min(1, s.age / Math.max(0.001, s.maxLife));
      const env = Math.sin(u * Math.PI);
      if (env <= 0.02) continue;
      const rx = s.radius * (0.65 + 0.35 * u);
      const ry = Math.max(6, rx * 0.22);
      drawExBayerHalo(ctx, s.x, s.groundY - 2, rx, ry, '#6366f1', '#fbbf24', 0.24 * env);
      const steps = 28;
      ctx.save();
      ctx.globalAlpha = 0.72 * env;
      for (let k = 0; k < steps; k++) {
        const ang = (k / steps) * Math.PI * 2 + u * 2.2;
        const px = Math.round((s.x + Math.cos(ang) * rx) / 2) * 2;
        const py = Math.round((s.groundY - 2 + Math.sin(ang) * ry) / 2) * 2;
        ctx.fillStyle = k % 3 === 0 ? '#fef08a' : k % 2 === 0 ? '#fbbf24' : '#6366f1';
        ctx.fillRect(px - 2, py - 1, 4, 2);
      }
      ctx.restore();
    }
  }

  _drawTempestDomainBackdrop(ctx, renderer) {
    const a = this._trueUltDomainAlpha || 0;
    if (a <= 0.02 || this.isDead) return;
    const cx = this._resolveShaderCenterX(renderer);
    const gy = this.groundY || 520;
    const t = this.stateTimer || 0;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    // Brooding midnight-indigo Thunder-God storm-sky curtain (seamless stepped alpha fade, 0 hard seams!)
    ctx.globalAlpha = 0.58 * a;
    ctx.fillStyle = '#070a1c';
    ctx.fillRect(Math.round(cx - 1100), Math.round(gy - 720), 2200, 960);

    for (let band = 0; band < 5; band++) {
      const by = Math.round(gy - 420 + band * 84);
      ctx.globalAlpha = (0.04 + band * 0.032) * a;
      ctx.fillStyle = band >= 3 ? '#312e81' : '#1e1b4b';
      ctx.fillRect(Math.round(cx - 1050), by, 2100, 86);
    }

    // Crisp stepped diagonal pixel storm-wind & rain streaks
    ctx.globalAlpha = 0.34 * a;
    for (let i = 0; i < 22; i++) {
      const rx = Math.round(cx - 640 + (((i * 173 + Math.floor(t * 780)) % 1280) + 1280) % 1280);
      const ry = Math.round(gy - 440 + (((i * 97 + Math.floor(t * 620)) % 440) + 440) % 440);
      ctx.fillStyle = i % 3 === 0 ? '#fef08a' : '#38bdf8';
      ctx.fillRect(rx, ry, 2, 16);
      ctx.fillRect(rx - 2, ry + 14, 2, 14);
    }

    // Periodic distant horizon sky-lightning flashes behind the fighters
    const flashIdx = Math.floor(t * 7.5);
    if (flashIdx % 3 === 0) {
      const bx = Math.round(cx + Math.sin(flashIdx * 3.7) * 340);
      drawTempestPixelBolt(ctx, bx, gy - 440, bx + Math.sin(flashIdx) * 48, gy - 40, 7, 20, flashIdx * 11, 0.45 * a);
    }
    ctx.restore();

    // Glowing Star-Cage lightning tethers connecting Act 2 blitz teleport strikes!
    for (let i = 0; i < this._blitzTethers.length; i++) {
      const tr = this._blitzTethers[i];
      const ta = Math.max(0, 1 - tr.age / Math.max(0.01, tr.maxLife));
      drawTempestPixelBolt(ctx, tr.x0, tr.y0, tr.x1, tr.y1, 7, 13, tr.seed, ta * 0.92);
    }
  }

  /**
   * Called by `Fighter.prototype.draw` BEFORE drawing Raijin EX's sprite frame (inherits DeathFX,
   * floor reflections, rim-light, hit-flashes, and shadow projection automatically!).
   */
  drawForegroundOverlay(ctx, renderer = null) {
    const sprites = this.getExSprites();
    const sheet = PixelForge.ensureImage?.(sprites?.sheet) || sprites?.sheet;
    const arenaCenterX = this._resolveShaderCenterX(renderer);

    this._drawTempestDomainBackdrop(ctx, renderer);

    if (!this.isDead) {
      drawExBayerHalo(ctx, Math.round(this.x), Math.round(this.groundY - 4), 52, 16, '#6366f1', '#fbbf24', 0.16);
    }

    this._drawGroundSeals(ctx);
    this._exParticles?.renderBack(ctx);
    if (this.fx && !this.isDead) {
      this.fx.renderLayer(ctx, 'back', arenaCenterX, this.groundY, 0.96);
    }
    this._drawVfxLayer(ctx, sprites, false);

    // Static Barrier subtle rim aura when Iron-Body shield is active
    if (!this.isDead && this.staticBarrier > 0 && this.staticBarrierTimer > 0) {
      drawExBayerHalo(ctx, Math.round(this.x), Math.round(this.y - 84), 52, 68, '#6366f1', '#fef08a', 0.18);
    }

    // Golden-indigo lightning afterimages behind character
    if (this.afterimages.length > 0 && sheet && sheet.complete && sheet.naturalWidth) {
      for (let i = 0; i < this.afterimages.length; i++) {
        const g = this.afterimages[i];
        const alpha = Math.max(0, (1 - g.life / g.maxLife) * 0.46);
        if (alpha <= 0.02) continue;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(Math.round(g.x / 2) * 2, Math.round((g.y + 4) / 2) * 2);
        ctx.scale(g.facing, 1);
        ctx.globalAlpha = alpha;
        PixelForge.drawSilhouetteFrame(ctx, sprites, g.frameIdx, 208, 208, i % 2 === 0 ? '#fbbf24' : '#6366f1');
        ctx.restore();
      }
    }
  }

  /**
   * Called by `Renderer.js` AFTER drawing fighters so front VFX, lightning bolts & shader impacts pop cleanly!
   */
  drawUltimateForeground(ctx, renderer = null) {
    const sprites = this.getExSprites();
    const arenaCenterX = this._resolveShaderCenterX(renderer);

    if (this.fx && !this.isDead) {
      this.fx.renderLayer(ctx, 'front', arenaCenterX, this.groundY, 0.98);
    }
    this._drawVfxLayer(ctx, sprites, true);

    for (let i = 0; i < this.tempestBolts.length; i++) {
      const b = this.tempestBolts[i];
      const alpha = Math.max(0, 1 - b.age / Math.max(0.001, b.maxLife));
      drawTempestPixelBolt(ctx, b.x0, b.y0, b.x1, b.y1, 7, b.jag, b.seed, alpha);
    }

    this._exParticles?.renderFront(ctx);
  }

  /**
   * Primary character render pass (handles live gameplay sprite, floor reflections,
   * directional rim-lighting, hit-flash, and automatic DeathFXManager delegation).
   */
  draw(ctx, isReflection = false, renderer = null) {
    const sprites = this.getExSprites();
    if (!sprites) return;

    const vfxSheet = PixelForge.ensureImage?.(sprites?.vfx) || sprites?.vfx;
    if (isReflection && !this.isDead && vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      for (let i = 0; i < this.activeVfxAnims.length; i++) {
        const a = this.activeVfxAnims[i];
        if (a.row !== 4 && a.row !== 5 && a.row !== 7) continue;
        const u = Math.min(1, a.age / Math.max(0.001, a.maxLife || 0.34));
        const col = Math.min(29, Math.floor(u * 30));
        const fade = u > 0.8 ? (1 - u) / 0.2 : 1.0;
        const dw = Math.round(a.w);
        const dh = Math.round(a.h);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.max(0, 0.36 * fade);
        ctx.drawImage(vfxSheet, col * 208, a.row * 208, 208, 208, Math.round(a.x - dw * 0.5), Math.round(a.y - dh * 0.5), dw, dh);
        ctx.restore();
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
      ctx.globalAlpha = 0.44;
      PixelForge.drawGhostFrame(ctx, sprites, frameIdx, 208, 208);
    }
    ctx.restore();
  }
}
