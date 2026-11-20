import { Fighter } from './Fighter.js?v=30fps178';
import { PixelForge } from '../engine/PixelForge.js?v=30fps178';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps178';
import { ExParticleSystem, drawExBayerHalo } from '../engine/shaders/exNextGenFX.js?v=30fps178';

const AUTO_SLICES_EX = [
  [60, 8], // Beat 1 (V0, 0.30s): Snappy stepping storm jab -> snaps at F03 (63)
  [68, 7], // Beat 2 (V1, 0.30s): Cross-step spinning thunder backfist/hook -> snaps at F10 (70)
  [75, 8], // Beat 3 (V2, 0.36s): Rising sky-breaker uppercut (lightning trail) -> snaps at F17/F18 (77/78)
  [83, 7]  // Beat 4 (V3, 0.46s): Heavy one-inch THUNDERCLAP PALM shockwave finisher -> snaps at F25 (85)
];

const BEAT_DURATIONS = [0.30, 0.30, 0.36, 0.46];
const INTRA_COMBO_LINK = 0.015;

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
      attackRange: 128,
      moveSpeed: 224,
      autoInterval: 0.85,
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
    this._postFlurryInterval = 1.04;

    this.skillName = 'THUNDERSTEP BREAKER';
    this.skillMaxCooldown = 3.90;
    this.skillCooldown = 1.05;
    this.skillDuration = 0.94;
    this.skillTriggerRange = 390;

    this.ultName = 'TEMPEST HUNDRED FISTS';
    this.ultSub = 'PHANTOM THUNDER FIST BARRAGE & SKY-BREAKER';
    this.ultDuration = 1.78;

    this.trueUltName = 'HEAVEN-SPLITTING RAIJIN CRASH';
    this.trueUltSub = 'STORM-PILLAR LEAP & THUNDER-CRATER DIVE SLAM';
    this.trueUltDuration = 4.10;

    this.dodgeMaxCooldown = 3.05;
    this.dashMaxCooldown = 2.75;
    this.crouchCooldown = 0;
    this.crouchDuration = 0.86;
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
    this._trueUltTargetX = this.x;
    this._trueUltStartX = this.x;
    this._stormCrashTimer = 0;

    this._overrideFrameIdx = null;
    this.afterimages = [];
    this.afterimageAccum = 0;
    this.activeVfxAnims = [];
    this.tempestBolts = [];
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
      this.moveSpeed = 234;
      this._postFlurryInterval = 0.96;
    } else if (aspect === 2) {
      // Aspect III: IRON-BODY COUNTER (fortified armor & guard parry)
      this.maxHp = 3980;
      this.hp = this.maxHp;
      this.moveSpeed = 212;
      this._postFlurryInterval = 1.15;
    }
  }

  getAiStyleProfile() {
    return {
      comboGoal: 4,
      sweetMin: 78,
      sweetMax: 122,
      counterCrouchBias: 0.56,
      midLeapMin: 165,
      midLeapMax: 330,
      midLeapChance: 0.42,
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
        sheet: mkImg('assets/sprites/brawler_ex_sheet.png?v=30fps178'),
        vfx: mkImg('assets/sprites/brawler_ex_vfx.png?v=30fps178'),
        portrait: mkImg('assets/sprites/brawler_ex_portrait.png?v=30fps178'),
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
      this.groundSeals.length = 0;
      this._stormCrashTimer = 0;
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
    this.comboStep = (v + 1) % 4;
    this.autoDuration = BEAT_DURATIONS[v];
    this.stateTimer = 0;
    this._intraLinkTimer = 0;
    this._beatHitMask = 0;
    this.didActionFrame = false;
    this._queuedNextBeat = false;
    this._bootsPlanted = false;
    this._comboPersistTimer = 0.78;
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
    // Crisp forward martial step-in footsies!
    let stepDelta = v === 0 ? 22 : v === 1 ? 26 : v === 2 ? 20 : 28;
    if (enemy && !enemy.isDead) {
      const horizDist = Math.abs(enemy.x - this.x);
      if (horizDist < 72) stepDelta = 6;
      else if (horizDist > 110) stepDelta = Math.min(48, Math.max(stepDelta, horizDist - 84));
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

      const dealt = foe.takeDamage(damage, this, isCrit, this.facing * knockX, knockY);
      if (dealt > 0 || foe.isDead) {
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
        this.gainMana(isCrit ? 11 : 7);
        this.gainFinisher(isCrit ? 5.5 : 3.2);
      }
    }
    this._activeHitTier = prevTier;

    if (landed) {
      if (game?.audio) game.audio.play(sfx, this.x + this.facing * 60);
      if (hitStop > 0) game?.addHitStop?.(hitStop);
      if (shakeDur > 0) game?.renderer?.addShake?.(isCrit ? 9 : 5, shakeDur);
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
    const moveU = Math.min(1, u / 0.45);
    const easedMove = 1 - Math.pow(1 - moveU, 2.2);
    this.x = this._beatStartX + (this._beatTargetX - this._beatStartX) * easedMove;

    // Beat 3 Rising Sky-Breaker Uppercut micro-hop returning cleanly to groundY
    if (v === 2) {
      if (u >= 0.24 && u <= 0.78) {
        const hopU = (u - 0.24) / 0.54;
        this.y = this.groundY - Math.sin(hopU * Math.PI) * 34;
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
      const foeInRange =
        enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= this.attackRange + 75;
      if (v < 3 && (this._queuedNextBeat || (!this.isManualControlled && foeInRange))) {
        this._beginComboBeat(v + 1, game);
      } else {
        this.autoCooldown = v === 3 ? this._postFlurryInterval : INTRA_COMBO_LINK;
        this.setState('IDLE');
      }
    }
  }

  updateSkill(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.skillDuration || 0.94;
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
        const desiredDist = Math.min(340, Math.max(96, dist - 74));
        this._skillTargetX = this._clampArenaX(this.x + this.facing * desiredDist, game);
      } else {
        this._skillTargetX = this._clampArenaX(this.x + this.facing * 200, game);
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

    // Phase 1 -> 2 (u = 0.22..0.48): Explosive Lightning Dash-Rush with afterimages!
    if (u >= 0.22 && u <= 0.48) {
      const du = (u - 0.22) / 0.26;
      const eased = 1 - Math.pow(1 - du, 2.4);
      this.x = this._skillStartX + (this._skillTargetX - this._skillStartX) * eased;
      this.afterimageAccum += dt;
      if (this.afterimageAccum >= 0.042) {
        this.afterimageAccum = 0;
        this.spawnAfterimage(this.x, this.y, this.facing, 3, Math.min(13, Math.floor(u * 30)), 0.24);
      }
      if (this._skillPhase === 1) {
        this._skillPhase = 2;
        this.spawnVfxAnim(2, (this._skillStartX + this._skillTargetX) * 0.5, this.y - 84, 210, 148, 0.36, {
          inFront: true
        });
        this.spawnTempestBolt(this._skillStartX, this.y - 82, this._skillTargetX, this.y - 88, 0.28, 16);
      }
    }

    // Phase 2 -> 3 (u >= 0.48): Explosive Storm Cross-Punch Detonation!
    if (this._skillPhase < 3 && u >= 0.48) {
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
    const dur = this.ultDuration || 1.78;
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
        this._ultTargetX = this._clampArenaX(enemy.x - this.facing * 86, game);
      } else {
        this._ultTargetX = this._clampArenaX(this.x + this.facing * 120, game);
      }
      this.spawnVfxAnim(7, this.x, this.y - 86, 208, 208, 0.92, { inFront: false, followOwner: true, offsetY: -86 });
      this.spawnGroundSeal(this.x, this.groundY, 118, 0.96);
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
    if (u < 0.2) {
      const approach = Math.min(1, u / 0.18);
      this.x = this.x + (this._ultTargetX - this.x) * Math.min(1, dt * 16 + approach * 0.2);
    }

    // 6-hit rapid TEMPEST HUNDRED FISTS phantom barrage (u = 0.20..0.66)
    const barrageTimes = [0.22, 0.30, 0.38, 0.46, 0.54, 0.62];
    while (this._ultHitStep < barrageTimes.length && u >= barrageTimes[this._ultHitStep]) {
      const idx = this._ultHitStep++;
      const strikeX = this._clampArenaX(this.x + this.facing * (76 + (idx % 3) * 14), game);
      const strikeY = this.y - 78 - ((idx % 3) - 1) * 20;
      this.spawnVfxAnim(3, strikeX, strikeY, 188, 178, 0.28, { inFront: true });
      this.spawnAfterimage(this.x - this.facing * 10, this.y, this.facing, 4, 3 + (idx % 6), 0.18);
      this.spawnTempestBolt(this.x + this.facing * 26, this.y - 90, strikeX + this.facing * 32, strikeY, 0.16, 12);
      const hitDmg = vsUlt === 1 ? 48 : vsUlt === 2 ? 37 : 43;
      this._applyTempestStrike(enemy, game, {
        damage: hitDmg,
        reachFront: 235,
        hitStop: 0.022,
        shakeDur: 0.032,
        knockX: 14,
        knockY: -10,
        sfx: 'slash',
        tier: 'ULTIMATE'
      });
    }

    // Climax Rising Shockwave Uppercut (u >= 0.70, F10..F11 -> grounded F12..F14)
    if (u >= 0.68 && u <= 0.84) {
      const riseU = (u - 0.68) / 0.16;
      this.y = this.groundY - Math.sin(riseU * Math.PI) * 52;
    } else {
      this.y = this.groundY;
      this.vy = 0;
    }

    if (this._ultHitStep === barrageTimes.length && u >= 0.70) {
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
    const u = Math.min(1, Math.max(0, t / dur));

    // Row 4 F15..F29 (`135..149`):
    //   0.00..0.28 -> F15..F17 storm-pillar crouch gather
    //   0.28..0.48 -> F18..F20 storm-pillar sky leap
    //   0.48..0.64 -> F21..F22 apex meteor-fist poise tracking target
    //   0.64..0.76 -> F23..F25 jagged golden-indigo lightning dive-slam crashing to ground!
    //   0.76..1.00 -> F26..F29 planted touchdown kneel & stance recovery (`cellMaxY = 229..231`)
    let colOffset = 0;
    if (u < 0.28) colOffset = Math.min(2, Math.floor((u / 0.28) * 3));
    else if (u < 0.48) colOffset = 3 + Math.min(2, Math.floor(((u - 0.28) / 0.20) * 3));
    else if (u < 0.64) colOffset = 6 + Math.min(1, Math.floor(((u - 0.48) / 0.16) * 2));
    else if (u < 0.76) colOffset = 8 + Math.min(2, Math.floor(((u - 0.64) / 0.12) * 3));
    else colOffset = 11 + Math.min(3, Math.floor(((u - 0.76) / 0.24) * 4));

    this.trueUltFrameOverride = 135 + colOffset;
    this._overrideFrameIdx = 135 + colOffset;

    if (!this._trueUltInit) {
      this._trueUltInit = true;
      this._trueUltStage = 0;
      this._trueUltStartX = this.x;
      this.isInvulnerable = true;
      this.unstoppablePoise = true;
      const aimX =
        enemy && !enemy.isDead ? enemy.x : this.x + this.facing * 200;
      this._trueUltTargetX = this._clampArenaX(aimX, game);
      this.facing = this._trueUltTargetX >= this.x ? 1 : -1;

      this.spawnVfxAnim(7, this.x, this.y - 84, 240, 240, 1.15, { inFront: false, followOwner: true, offsetY: -84 });
      this.spawnGroundSeal(this.x, this.groundY, 134, 1.18);
      game?.vfx?.triggerCinematicCutIn?.(this, this.trueUltName, '#fbbf24');
      game?.vfx?.spawnSpecialCastAura?.(this, this.trueUltName, this.trueUltSub, 'tempest', true);
      this.fx?.spawn('tempestPillar', this._safeFxX(this.x, game), this.groundY - 8, {
        extra: { halfW: 30, height: 176 }
      });
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
      game?.renderer?.addShake?.(7, 0.24);
    }

    // Stage 1: Storm-Pillar Sky Leap (u = 0.28..0.48)
    if (u >= 0.28 && u < 0.48) {
      const lu = (u - 0.28) / 0.20;
      const eased = 1 - Math.pow(1 - lu, 2.2);
      this.y = this.groundY - eased * 188;
      this.cameraAirLift = eased * 74;
      if (this._trueUltStage < 1) {
        this._trueUltStage = 1;
        this.spawnVfxAnim(4, this.x, this.groundY - 148, 224, 310, 0.72, { inFront: false });
        this.spawnVfxAnim(1, this.x, this.groundY - 130, 188, 224, 0.62, { inFront: true });
        this.spawnTempestBolt(this.x - 16, this.groundY, this.x + 12, this.groundY - 260, 0.36, 18);
        if (game?.audio) game.audio.play('storm_leap', this.x);
      }
      this.afterimageAccum += dt;
      if (this.afterimageAccum >= 0.05) {
        this.afterimageAccum = 0;
        this.spawnAfterimage(this.x, this.y, this.facing, 4, 18, 0.22);
      }
    }

    // Stage 2: Apex Meteor-Fist Lock-On Overhead (u = 0.48..0.64)
    if (u >= 0.48 && u < 0.64) {
      const au = (u - 0.48) / 0.16;
      if (enemy && !enemy.isDead) {
        this._trueUltTargetX = this._clampArenaX(enemy.x, game);
      }
      const hoverX = this._clampArenaX(this._trueUltTargetX - this.facing * 42, game);
      this.x = this._trueUltStartX + (hoverX - this._trueUltStartX) * Math.min(1, au * 1.35);
      this.y = this.groundY - 188 - Math.sin(au * Math.PI) * 18;
      this.cameraAirLift = 74;
      if (this._trueUltStage < 2) {
        this._trueUltStage = 2;
        this.spawnGroundSeal(this._trueUltTargetX, this.groundY, 152, 1.32);
        this.fx?.spawn('tempestCrater', this._safeFxX(this._trueUltTargetX, game), this.groundY - 6, {
          extra: { rx: 94, ry: 22 }
        });
        this.spawnTempestBolt(this.x, this.y - 80, this._trueUltTargetX, this.groundY - 6, 0.32, 20);
      }
    }

    // Stage 3: Jagged Golden-Indigo Lightning DIVE-SLAM Crashing Down (u = 0.64..0.76)
    if (u >= 0.64 && u < 0.76) {
      const du = (u - 0.64) / 0.12;
      const slamEase = du * du * du;
      const landX = this._clampArenaX(this._trueUltTargetX - this.facing * 56, game);
      this.x = this.x + (landX - this.x) * Math.min(1, dt * 22);
      this.y = this.groundY - 188 * (1 - slamEase);
      this.cameraAirLift = 74 * (1 - slamEase);
      this.afterimageAccum += dt;
      if (this.afterimageAccum >= 0.032) {
        this.afterimageAccum = 0;
        this.spawnAfterimage(this.x, this.y, this.facing, 4, 24, 0.24);
      }
    }

    // Impact Detonation at u >= 0.73 (clean planted touchdown!)
    if (this._trueUltStage < 3 && u >= 0.73) {
      this._trueUltStage = 3;
      this.didActionFrame = true;
      this.y = this.groundY;
      this.vy = 0;
      this.cameraAirLift = 0;
      this._stormCrashTimer = 0.92;

      const crashX = this._clampArenaX(this.x + this.facing * 58, game);
      // Colossal Heaven-Splitting Storm Pillar + Thunder-Crater Ground Shatter!
      this.spawnVfxAnim(4, crashX, this.groundY - 156, 268, 356, 0.88, { inFront: true });
      this.spawnVfxAnim(5, crashX, this.groundY - 18, 296, 162, 0.92, { inFront: false });
      this.spawnGroundSeal(crashX, this.groundY, 178, 0.98);
      this.fx?.spawn('tempestPillar', this._safeFxX(crashX, game), this.groundY - 8, {
        extra: { halfW: 38, height: 204 }
      });
      this.fx?.spawn('tempestCrater', this._safeFxX(crashX, game), this.groundY - 6, {
        extra: { rx: 108, ry: 24 }
      });
      for (const off of [-84, -36, 36, 84]) {
        const bx = this._clampArenaX(crashX + off, game);
        this.spawnTempestBolt(bx + (off < 0 ? 18 : -18), this.groundY - 280, bx, this.groundY - 6, 0.42, 22);
      }
      this._exParticles?.burst(crashX, this.groundY - 46, {
        count: 24,
        shapes: ['bolt', 'star4', 'diamond'],
        speedMin: 95,
        speedMax: 320,
        upBias: 95,
        color: '#fbbf24',
        accent: '#6366f1',
        core: '#ffffff',
        layer: 'front'
      });

      game?.renderer?.triggerFlash?.('rgba(254, 240, 138, 0.52)', 0.16);
      game?.renderer?.addShake?.(16, 0.34);
      game?.audio?.playHeroVoice?.(this.heroId, 'true_ult_fire', {
        worldX: crashX,
        speakerKey: this,
        priority: 4,
        cooldownMs: 200,
        duckSfx: true
      });

      this._applyTempestStrike(enemy, game, {
        damage: 445,
        reachFront: 340,
        reachBack: 150,
        hitStop: 0.095,
        shakeDur: 0.24,
        knockX: 165,
        knockY: -130,
        isCrit: true,
        sfx: 'thunder_slam',
        tier: 'TRUE_ULTIMATE'
      });
    }

    // Secondary storm-crater aftershock pulse at u >= 0.82
    if (this._trueUltStage === 3 && u >= 0.82) {
      this._trueUltStage = 4;
      this.y = this.groundY;
      this.vy = 0;
      const crashX = this._clampArenaX(this.x + this.facing * 58, game);
      this.spawnVfxAnim(0, crashX, this.groundY - 88, 224, 224, 0.42, { inFront: true });
      this._applyTempestStrike(enemy, game, {
        damage: 255,
        reachFront: 360,
        reachBack: 160,
        hitStop: 0.068,
        shakeDur: 0.16,
        knockX: 120,
        knockY: -96,
        isCrit: true,
        sfx: 'heavy_cleave',
        tier: 'TRUE_ULTIMATE'
      });
    }

    // Planted grounded recovery F26..F29
    if (u >= 0.76) {
      this.y = this.groundY;
      this.vy = 0;
      this.cameraAirLift = 0;
    }

    if (t >= dur) {
      this.y = this.groundY;
      this.vy = 0;
      this.cameraAirLift = 0;
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

  startJump(enemy, game, dirOverride = null) {
    if (this._advPureDodge) return;
    const dir = dirOverride || this.facing;
    this.facing = dir;
    this.vaultCooldown = 2.6;
    this.jumpCooldown = 2.6;
    this.dashDuration = 0.50;
    this.isFlipVault = true;
    this.isInvulnerable = true;
    this.didSecondaryAction = false;
    this.flipStartX = this.x;

    let jumpDist = 186;
    if (enemy && !enemy.isDead && dir === (enemy.x >= this.x ? 1 : -1)) {
      const frontDist = Math.abs(enemy.x - this.x);
      if (frontDist > 120 && frontDist < 300) {
        jumpDist = Math.min(186, Math.max(88, frontDist - 96));
      }
    }
    this.flipTargetX = this._clampArenaX(this.x + dir * jumpDist, game);
    this.vx = 0;
    this.vy = 0;
    this.setState('JUMP');
    if (game?.audio) game.audio.play('storm_leap', this.x);
    this.spawnGroundSeal(this.x, this.groundY, 64, 0.26);
  }

  updateJump(dt, enemy, game) {
    if (this._advPureDodge) {
      super.updateDashOrDodge?.(dt, enemy, game);
      return;
    }
    const t = this.stateTimer;
    const dur = this.dashDuration || 0.50;
    const u = Math.min(1, Math.max(0, t / dur));

    this.x = this.flipStartX + (this.flipTargetX - this.flipStartX) * (1 - Math.pow(1 - u, 1.8));
    this.y = this.groundY - Math.sin(u * Math.PI) * 108;
    this.isInvulnerable = u < 0.62;

    this.afterimageAccum += dt;
    if (this.afterimageAccum >= 0.055 && u < 0.82) {
      this.afterimageAccum = 0;
      this.spawnAfterimage(this.x, this.y, this.facing, 8, Math.min(28, Math.floor(u * 30)), 0.20);
    }

    if (!this.didSecondaryAction && u >= 0.54) {
      this.didSecondaryAction = true;
      if (enemy && !enemy.isDead) this.facing = enemy.x >= this.x ? 1 : -1;
      const hitX = this._clampArenaX(this.x + this.facing * 56, game);
      this.spawnVfxAnim(0, hitX, this.y - 68, 144, 144, 0.26, { inFront: true });
      this._applyTempestStrike(enemy, game, {
        damage: 34,
        reachFront: 164,
        hitStop: 0.038,
        shakeDur: 0.048,
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

  /**
   * Called by `Fighter.prototype.draw` BEFORE drawing Raijin EX's sprite frame (inherits DeathFX,
   * floor reflections, rim-light, hit-flashes, and shadow projection automatically!).
   */
  drawForegroundOverlay(ctx, renderer = null) {
    const sprites = this.getExSprites();
    const sheet = PixelForge.ensureImage?.(sprites?.sheet) || sprites?.sheet;
    const arenaCenterX = this._resolveShaderCenterX(renderer);

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
        const u = Math.min(1, a.age / Math.max(0.001, a.duration));
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
