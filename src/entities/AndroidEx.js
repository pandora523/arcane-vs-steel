import { Fighter } from './Fighter.js?v=30fps170';
import { PixelForge } from '../engine/PixelForge.js?v=30fps170';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps170';
import {
  CYBER_EFFECT_REGISTRY,
  CYBER_NEON_PALETTE,
  CYBER_MAGENTA_PALETTE
} from '../engine/shaders/cyberShaders.js?v=30fps170';

const wrapCyberPaddedPen = (pen) =>
  new Proxy(pen, {
    get(target, prop) {
      if (prop === 'shadeBox') {
        return (x0, y0, x1, y1, fn) => target.shadeBox(x0 - 4, y0 - 4, x1 + 4, y1 + 4, fn);
      }
      const val = target[prop];
      return typeof val === 'function' ? val.bind(target) : val;
    }
  });

const CYBER_EX_EFFECT_REGISTRY = Object.fromEntries(
  Object.entries(CYBER_EFFECT_REGISTRY).map(([key, spec]) => [
    key,
    {
      ...spec,
      create(cfg) {
        const inst = spec.create(cfg);
        return {
          ...inst,
          renderBack: inst.renderBack
            ? (pen, ...args) => inst.renderBack.call(inst, wrapCyberPaddedPen(pen), ...args)
            : undefined,
          renderFront: inst.renderFront
            ? (pen, ...args) => inst.renderFront.call(inst, wrapCyberPaddedPen(pen), ...args)
            : undefined
        };
      }
    }
  ])
);

const BAYER_4X4 = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5
];

const AUTO_SLICES_EX = [
  [60, 8], // Beat 1 (V0, 0.35s): Downward HF-Plasma Odachi Crescent -> snaps at F03 (63)
  [68, 7], // Beat 2 (V1, 0.33s): Reverse Rising Singularity Uppercut + Funnel Volley -> snaps at F09 (69)
  [75, 8], // Beat 3 (V2, 0.37s): 2.5D Horizontal Overdrive Spin-Rip (2-hit, allowV2Cross: false) -> snaps at F17/F18 (77/78)
  [83, 7]  // Beat 4 (V3, 0.50s): Thruster-Boosted Aerial Guillotine Cleave (3-hit + cyber_disc) -> snaps at F25 (85)
];

const BEAT_DURATIONS = [0.35, 0.33, 0.37, 0.50];
const INTRA_COMBO_LINK = 0.015;

const POSITRON_CRIMSON_PALETTE = [
  '#1a0514',
  '#4a0832',
  '#9d174d',
  '#e11d48',
  '#ff2e93',
  '#fb7185',
  '#fde047',
  '#ffffff'
];

const QUANTUM_AEGIS_PALETTE = [
  '#061326',
  '#0c2e59',
  '#0284c7',
  '#06b6d4',
  '#22d3ee',
  '#67e8f9',
  '#bae6fd',
  '#ffffff'
];

/**
 * Crisp 4x4 Bayer-stippled pixel floor/rim halo (alpha <= 0.14, zero blurry radial blobs, zero ellipse primitives!).
 */
function drawCyberBayerHalo(ctx, cx, cy, rx, ry, outerHex, coreHex, alpha = 0.13) {
  if (alpha <= 0.01 || rx < 4 || ry < 3) return;
  const step = 4;
  const x0 = Math.floor((cx - rx) / step) * step;
  const x1 = Math.ceil((cx + rx) / step) * step;
  const y0 = Math.floor((cy - ry) / step) * step;
  const y1 = Math.ceil((cy + ry) / step) * step;

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = Math.min(0.14, alpha);
  for (let py = y0; py <= y1; py += step) {
    const ny = (py - cy) / ry;
    const ny2 = ny * ny;
    if (ny2 >= 1) continue;
    const by = ((py >> 2) & 3) << 2;
    for (let px = x0; px <= x1; px += step) {
      const nx = (px - cx) / rx;
      const d2 = nx * nx + ny2;
      if (d2 >= 1) continue;
      const falloff = 1 - d2;
      const thresh = (BAYER_4X4[by + ((px >> 2) & 3)] + 0.5) / 16;
      if (falloff * 0.90 > thresh) {
        ctx.fillStyle = d2 < 0.34 ? coreHex : outerHex;
        ctx.fillRect(px, py, step, step);
      }
    }
  }
  ctx.restore();
}

/**
 * Ultra-crisp 2-pass pixel-stepped plasma hairline / laser beam:
 * Pass 1 draws ALL outer 3px-4px plasma sheath pixels -> Pass 2 draws ALL 1px-2px #ffffff core pixels!
 * Guarantees ZERO overlapping `>>>>>>>` chevron stripes or fat 24px caterpillars!
 */
function drawTwoPassCyberBeam(ctx, x0, y0, x1, y1, outerHex, coreHex = '#ffffff', alpha = 0.92, outerSize = 4, coreSize = 2) {
  if (alpha <= 0.02) return;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.max(Math.abs(dx), Math.abs(dy));
  if (dist < 2) return;
  const steps = Math.max(2, Math.ceil(dist / 2));
  const oHalf = Math.floor(outerSize / 2);

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';

  // Pass 1: Full outer plasma sheath
  ctx.globalAlpha = Math.min(0.76, alpha * 0.72);
  ctx.fillStyle = outerHex;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const px = Math.round((x0 + dx * u) / 2) * 2;
    const py = Math.round((y0 + dy * u) / 2) * 2;
    ctx.fillRect(px - oHalf, py - oHalf, outerSize, outerSize);
  }

  // Pass 2: Full white-hot optical core on top
  ctx.globalAlpha = Math.min(0.96, alpha);
  ctx.fillStyle = coreHex;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const px = Math.round((x0 + dx * u) / 2) * 2;
    const py = Math.round((y0 + dy * u) / 2) * 2;
    ctx.fillRect(px, py, coreSize, coreSize);
  }

  ctx.restore();
}

/**
 * Asymmetric 4-frame anime cyber-prism hit-starburst (zero chevron bars!).
 */
function drawCyberHitStarburst(ctx, cx, cy, u, isMagenta = false) {
  const fade = 1 - u;
  if (fade <= 0.04) return;
  const snap = (v) => Math.round(v / 2) * 2;
  const sx = snap(cx);
  const sy = snap(cy);
  const longArm = Math.round((28 - u * 10) * (u < 0.16 ? u / 0.16 : 1));
  const shortArm = Math.round(longArm * 0.56);
  const primaryHex = isMagenta ? '#ec4899' : '#22d3ee';
  const accentHex = isMagenta ? '#22d3ee' : '#ec4899';

  drawTwoPassCyberBeam(ctx, sx - longArm, sy - Math.round(longArm * 0.25), sx + longArm, sy + Math.round(longArm * 0.25), primaryHex, '#ffffff', fade, 3, 2);
  drawTwoPassCyberBeam(ctx, sx + Math.round(shortArm * 0.25), sy - shortArm, sx - Math.round(shortArm * 0.25), sy + shortArm, accentHex, '#ffffff', fade * 0.92, 3, 2);

  ctx.save();
  ctx.globalAlpha = Math.min(0.95, fade);
  ctx.fillStyle = accentHex;
  ctx.fillRect(sx - 4, sy - 2, 8, 4);
  ctx.fillRect(sx - 2, sy - 4, 4, 8);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(sx - 2, sy - 2, 4, 4);
  ctx.restore();
}

/**
 * VEX-09 EX (`android_ex`) - Newly-Born Singularity Valkyrie & HF-Plasma Odachi Duelist.
 * Next-Gen Wide-Canvas (`320x240`, `anchorX=112, anchorY=230`) FFBE / Last Cloudia Champion.
 * Wields a Muramasa-09 High-Frequency Plasma Odachi (`106-118px` reach) + 4 articulated Cyber Fin-Funnel Wing Pylons.
 * Coexists 100% independently alongside classic VEX-09 (`android`).
 */
export class AndroidEx extends Fighter {
  constructor(x, groundY, facing = 1) {
    const opts = typeof x === 'object' && x !== null ? x : { x, groundY, facing };
    super({
      ...opts,
      name: opts.name || 'VEX-09 EX',
      maxHp: 3980,
      moveSpeed: 232,
      attackRange: 178,
      autoInterval: 0.94,
      lightColor: 'rgba(34, 211, 238, 1)',
      primaryColor: '#22d3ee',
      secondaryColor: '#ec4899',
      hasTrueUltimate: true,
      trueUltName: 'PROJECT GUNG-09: ORBITAL SINGULARITY BUSTER',
      trueUltDuration: 3.55
    });

    this.heroId = 'android_ex';
    this.theme = 'cyber';
    this.secondaryColor = '#ec4899';
    this.deathSfx = 'death_android';
    this.hasPoise = true;
    this.allowV2Cross = false;

    this.autoDuration = BEAT_DURATIONS[0];
    this._postFlurryInterval = 1.25;

    this.skillName = 'SINGULARITY FUNNEL OVERDRIVE';
    this.skillMaxCooldown = 4.08;
    this.skillCooldown = 1.15;
    this.skillDuration = 0.98;
    this.skillTriggerRange = 450;

    this.ultName = 'VALKYRIE HYPER-PRISM BARRAGE';
    this.ultSub = 'MULTI-BAND VISOR & SIX-FUNNEL STRIKE';
    this.ultDuration = 1.92;

    this.trueUltName = 'PROJECT GUNG-09: ORBITAL SINGULARITY BUSTER';
    this.trueUltSub = 'HEX-MATRIX CAGE - ORBITAL RELAY COLUMN';
    this.trueUltDuration = 3.55;

    this.dodgeMaxCooldown = 3.4;
    this.dashMaxCooldown = 3.3;
    this.crouchCooldown = 0;
    this.crouchMaxCooldown = 4.0;
    this.crouchDuration = 0.86;
    this.dashDuration = 0.34;
    this.vaultCooldown = 0;
    this.isCrouching = false;
    this.isDeflecting = false;
    this.isFlipVault = false;
    this.flipStartX = this.x;
    this.flipTargetX = this.x;

    // Grounded Front-Line Cyber-Samurai 4-Beat Blitz State
    this.comboStep = 0;
    this._autoVariant = 0;
    this._comboPersistTimer = 0;
    this._queuedNextBeat = false;
    this._intraLinkTimer = 0;
    this._beatHitMask = 0;
    this._beatStartX = this.x;
    this._beatTargetX = this.x;
    this._bootsPlanted = false;
    this._thrusterSparkAcc = 0;

    // 4 Articulated Autonomous Cyber Fin-Funnel Drones, 2-Pass Plasma Beams & Data-Hex Particles
    this.funnelDrones = [
      { angle: 0, x: this.x, y: this.y - 122 },
      { angle: Math.PI * 0.5, x: this.x, y: this.y - 122 },
      { angle: Math.PI, x: this.x, y: this.y - 122 },
      { angle: Math.PI * 1.5, x: this.x, y: this.y - 122 }
    ];
    this.funnelLaserBeams = [];
    this.hitStarbursts = [];
    this.cyberParticles = [];
    this.afterimages = [];
    this.afterimageAccum = 0;
    this.activeVfxAnims = [];
    this.diamondFunnelGrid = null;
    this.hudTargetMatrix = null;
    this.orbitalStrikeFunnels = [];

    // Skill / Overdrive / True Ultimate State
    this._skillStepMask = 0;
    this._ultStep = 0;
    this._ultStartX = this.x;
    this._ultRetreatX = this.x;
    this._ultFocusX = this.x + this.facing * 220;
    this._trueUltStep = 0;
    this._trueUltStartX = this.x;
    this._trueUltRetreatX = this.x;
    this._trueUltTargetX = 600;
    this._trueUltBusterTimer = 0;
    this._busterMoteAccum = 0;
    this._deathSparksTriggered = false;
    this._overrideFrameIdx = null;

    this.fx = new ArcaneShaderFX(CYBER_EX_EFFECT_REGISTRY, {
      pixelScale: 3,
      viewW: 640,
      viewH: 460,
      topRatio: 0.70
    });

    if (typeof Image !== 'undefined') {
      this.getExSprites();
      PixelForge.ensureHeroLoaded?.('android_ex');
    }
  }

  applySovereignAspectStats(aspect) {
    if (aspect === 1) {
      this.maxHp = 3620;
      this.hp = this.maxHp;
      this.moveSpeed = 238;
      this._postFlurryInterval = 1.30;
    } else if (aspect === 2) {
      this.maxHp = 3740;
      this.hp = this.maxHp;
      this.moveSpeed = 212;
      this.crouchMaxCooldown = 3.8;
      this._postFlurryInterval = 1.44;
    }
  }

  getExSprites() {
    if (typeof Image === 'undefined') return null;
    const assets = PixelForge.initAssets?.();
    if (!assets) return null;
    if (!assets.android_ex) {
      const mkImg = (src) => {
        const img = new Image();
        img._origSrc = src;
        img.src = src;
        return img;
      };
      assets.android_ex = {
        sheet: mkImg('assets/sprites/android_ex_sheet.png?v=30fps170'),
        vfx: mkImg('assets/sprites/android_ex_vfx.png?v=30fps170'),
        portrait: mkImg('assets/sprites/android_ex_portrait.png?v=30fps170'),
        cellW: 320,
        cellH: 240,
        anchorX: 112,
        anchorY: 230
      };
    } else {
      PixelForge.ensureHeroLoaded?.('android_ex');
    }
    return assets.android_ex;
  }

  spawnCyberParticle(kind, x, y, vx, vy, maxLife, isMagenta = false, size = 3) {
    if (this.cyberParticles.length >= 96) this.cyberParticles.shift();
    this.cyberParticles.push({
      kind, // 'hex' | 'data' | 'star4'
      x,
      y,
      vx,
      vy,
      age: 0,
      maxLife,
      isMagenta,
      size
    });
  }

  spawnCyberHexBurst(cx, cy, count = 6, isMagenta = false) {
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + (i % 2) * 0.25;
      const spd = 46 + (i % 4) * 32;
      const kind = i % 3 === 0 ? 'star4' : i % 2 === 0 ? 'hex' : 'data';
      this.spawnCyberParticle(
        kind,
        cx + Math.cos(ang) * 8,
        cy + Math.sin(ang) * 8,
        Math.cos(ang) * spd,
        Math.sin(ang) * spd - 36,
        0.38 + (i % 3) * 0.12,
        i % 2 === 0 ? isMagenta : !isMagenta,
        i % 3 === 0 ? 4 : 3
      );
    }
  }

  spawnHitStarburst(cx, cy, isMagenta = false, maxLife = 0.18) {
    if (this.hitStarbursts.length >= 18) this.hitStarbursts.shift();
    this.hitStarbursts.push({
      x: Math.round(cx),
      y: Math.round(cy),
      age: 0,
      maxLife,
      isMagenta
    });
  }

  spawnPlasmaBeam(x0, y0, x1, y1, maxLife = 0.20, isMagenta = false, outerSize = 4, coreSize = 2) {
    if (this.funnelLaserBeams.length >= 26) this.funnelLaserBeams.shift();
    this.funnelLaserBeams.push({
      x0: Math.round(x0),
      y0: Math.round(y0),
      x1: Math.round(x1),
      y1: Math.round(y1),
      age: 0,
      maxLife,
      isMagenta,
      outerSize,
      coreSize
    });
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

    if (newState === 'AUTO_ATTACK') {
      if (this._comboPersistTimer <= 0 && prevState !== 'AUTO_ATTACK') {
        this.comboStep = 0;
      }
      this._beginComboBeat(this.comboStep % 4, this.game);
    } else if (newState !== 'ULTIMATE' && newState !== 'TRUE_ULTIMATE') {
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
    }

    if (newState !== 'CROUCH') {
      this.isDeflecting = false;
      this.fx?.stopByKey('aegisHexDome');
    }

    if (
      newState !== 'AUTO_ATTACK' &&
      newState !== 'DASH' &&
      newState !== 'DODGE' &&
      newState !== 'JUMP' &&
      newState !== 'ULTIMATE' &&
      newState !== 'TRUE_ULTIMATE'
    ) {
      this.fx?.stopByKey('wingPylonThruster');
    }

    if (newState === 'SKILL') {
      this._skillStepMask = 0;
      this._skillVoiceFired = false;
      this._skillStartX = this.x;
      this._skillDir = this.facing || 1;
      this._skillCommittedLockX = undefined;
      this.afterimageAccum = 0;
      this.diamondFunnelGrid = null;
    } else if (prevState === 'SKILL') {
      this.diamondFunnelGrid = null;
    }

    if (newState === 'ULTIMATE') {
      this._ultStep = 0;
      this._ultVoiceFired = false;
      this.isInvulnerable = true;
      this.hudTargetMatrix = null;
      this.orbitalStrikeFunnels = [];
    } else if (prevState === 'ULTIMATE') {
      this.hudTargetMatrix = null;
      this.orbitalStrikeFunnels = [];
    }

    if (newState === 'TRUE_ULTIMATE') {
      this._trueUltStep = 0;
      this._trueUltChargeVoiceFired = false;
      this._trueUltFireVoiceFired = false;
      this._trueUltStartX = this.x;
      this._trueUltRetreatX = this.x;
      this._busterMoteAccum = 0;
      this._trueUltAfterAccum = 0;
      this._trueUltAfterStep = 0;
      this._trueUltBusterTimer = 0;
      this.isInvulnerable = true;
      this.unstoppablePoise = true;
    } else if (prevState === 'TRUE_ULTIMATE') {
      this.unstoppablePoise = false;
    }

    if (newState === 'DEATH') {
      this.fx?.clear();
      this.funnelLaserBeams.length = 0;
      this.hitStarbursts.length = 0;
      this.diamondFunnelGrid = null;
      this.hudTargetMatrix = null;
      this.orbitalStrikeFunnels = [];
      this._trueUltBusterTimer = 0;
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
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

  _resolveShaderCenterX(renderer) {
    const ww = renderer?.worldWidth || 1200;
    if (ww > 2400) {
      return Number.isFinite(renderer?.camX) ? renderer.camX : this.x;
    }
    return ww * 0.5;
  }

  _safeFxY(yv) {
    return Math.max(58, Math.min(this.groundY + 20, yv));
  }

  _beginComboBeat(beatIdx, game) {
    const g = game || this.game;
    const v = ((beatIdx % 4) + 4) % 4;
    this._autoVariant = v;
    this.comboStep = (v + 1) % 4;
    this.autoDuration = BEAT_DURATIONS[v];
    this.stateTimer = 0;
    this._intraLinkTimer = 0;
    this._beatHitMask = 0;
    this._beatLandedHit = false;
    this.didActionFrame = false;
    this._queuedNextBeat = false;
    this._bootsPlanted = false;
    this._thrusterSparkAcc = 0;
    this._comboPersistTimer = 0.74;
    this.unstoppablePoise = v >= 2;

    const startFrame = AUTO_SLICES_EX[v][0];
    this.trueUltFrameOverride = startFrame;
    this._overrideFrameIdx = startFrame;

    const enemy = this._currentEnemy || g?.getTargetFor?.(this) || null;
    if (enemy && !enemy.isDead && !enemy.isDummyFocal) {
      this.facing = enemy.x >= this.x ? 1 : -1;
    }

    this._beatStartX = this.x;
    const baseStep = v === 0 ? 34 : v === 2 ? 24 : 18;
    let stepDist = baseStep;
    if (enemy && !enemy.isDead) {
      const frontDist = (enemy.x - this.x) * this.facing;
      if (frontDist > 0) {
        const minClear = v === 2 ? 116 : 120;
        stepDist = Math.max(0, Math.min(baseStep, frontDist - minClear));
      }
    }
    const desiredX = this.x + this.facing * stepDist;
    this._beatTargetX = this._clampArenaX(desiredX, g);
  }

  queueNextComboBeat() {
    this._queuedNextBeat = true;
  }

  spawnAfterimage(x, y, facing, row = 2, col = 3, maxLife = 0.22, isMagenta = false) {
    if (this.afterimages.length >= 18) this.afterimages.shift();
    this.afterimages.push({
      x,
      y,
      facing,
      frameIdx: row * 30 + (col % 30),
      age: 0,
      maxLife,
      isMagenta
    });
  }

  spawnVfxAnim(row, x, y, w = 208, h = 208, maxLife = 0.30, opts = {}) {
    if (this.activeVfxAnims.length >= 22) this.activeVfxAnims.shift();
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
      foreground: opts.foreground !== false,
      followOwner: Boolean(opts.followOwner),
      offsetX: opts.offsetX || 0,
      offsetY: opts.offsetY || 0
    });
  }

  /**
   * Coordinated Fin-Funnel Laser Volley (`<= 0.14` bloom, 2-pass crisp 2px plasma beams!):
   */
  fireFinFunnelVolley(enemy, game, count = 1, bonusDmg = 12) {
    if (!Array.isArray(this.funnelDrones) || this.funnelDrones.length === 0) return;
    const tx = enemy && !enemy.isDead ? enemy.x : this.x + this.facing * 140;
    const ty = enemy && !enemy.isDead ? enemy.y - (enemy.isColossalBoss ? 124 : 88) : this.groundY - 88;
    const n = Math.min(count, this.funnelDrones.length);

    for (let i = 0; i < n; i++) {
      const drone = this.funnelDrones[(this.comboStep + i) % this.funnelDrones.length];
      this.spawnPlasmaBeam(
        drone.x,
        drone.y,
        tx + (i - (n - 1) * 0.5) * 14,
        ty + (i % 2 === 0 ? -8 : 8),
        0.20,
        i % 2 === 1,
        4,
        2
      );
    }

    if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= 340) {
      enemy.takeDamage(bonusDmg, this, false, 10, 0);
      this.fx?.spawn('cyberImpactSpark', this._safeFxX(tx, game), this._safeFxY(ty), {
        palette: count > 1 ? CYBER_MAGENTA_PALETTE : CYBER_NEON_PALETTE,
        light: 1.06
      });
    }
    game?.audio?.play?.('cyber_beam', tx);
  }

  fireCyberDiscChakram(game, opts = {}) {
    if (!game?.vfx?.spawnProjectile && !game?.spawnProjectile) return;
    const dir = opts.dir ?? this.facing;
    const spawnX = opts.x ?? this.x + dir * 88;
    const spawnY = opts.y ?? this.y - 82;
    const proj = {
      x: spawnX,
      y: spawnY,
      vx: dir * (opts.speed ?? 690),
      vy: opts.vy ?? 0,
      radius: opts.radius ?? 22,
      damage: opts.damage ?? 26,
      owner: this,
      color: '#22d3ee',
      coreColor: '#ec4899',
      type: 'cyber_disc',
      pierce: opts.pierce !== false,
      isUltimate: Boolean(opts.isUltimate),
      maxRange: opts.maxRange ?? 460
    };
    if (game.vfx?.spawnProjectile) {
      game.vfx.spawnProjectile(proj);
    } else if (game.spawnProjectile) {
      game.spawnProjectile(proj);
    }
    this.spawnVfxAnim(0, spawnX, spawnY, 188, 188, 0.24, {
      vx: dir * 280,
      flipX: dir < 0,
      foreground: true
    });
  }

  onProjectileTrail(proj) {
    if (!proj) return;
    proj._trailAcc = (proj._trailAcc || 0) + 0.016;
    if (proj._trailAcc >= 0.065) {
      proj._trailAcc = 0;
      const dir = Math.sign(proj.vx || this.facing || 1);
      this.spawnCyberParticle('hex', proj.x - dir * 14, proj.y, -dir * 32, -16, 0.20, false, 3);
    }
  }

  takeDamage(amount, attacker, isCrit = false, knockX = 95, knockY = 0) {
    const incomingTier =
      attacker?._activeHitTier ||
      (attacker && !attacker.isMonster && (attacker.state === 'ULTIMATE' || attacker.state === 'TRUE_ULTIMATE')
        ? attacker.state
        : null);
    if (
      !incomingTier &&
      !this.isInvulnerable &&
      this.state !== 'ULTIMATE' &&
      this.state !== 'TRUE_ULTIMATE'
    ) {
      if (this.isDeflecting && !this.isDead) {
        const reduced = Math.max(1, Math.round(amount * 0.35));
        this.fx?.spawn('cyberImpactSpark', this._safeFxX(this.x + this.facing * 42), this._safeFxY(this.y - 78), {
          palette: CYBER_NEON_PALETTE,
          flip: this.facing < 0,
          light: 1.08
        });
        this.game?.vfx?.spawnDamageText?.(this.x, this.y - 176, 0, false, 'HEX MATRIX GUARD!', '#22d3ee');
        this.game?.audio?.play?.('reflect', this.x);
        super.takeDamage(reduced, attacker, false, knockX * 0.25, 0);
        return;
      }

      if ((this.shieldHp || 0) > 0 && amount > 0 && !this.game?.isAdventureMode?.()) {
        const abs = Math.min(this.shieldHp, Math.round(amount));
        this.shieldHp -= abs;
        amount = Math.max(0, amount - abs);
        if (amount <= 0) return;
      }
    }
    super.takeDamage(amount, attacker, isCrit, knockX, knockY);

    if (this.isDead && !this._deathSparksTriggered) {
      this._deathSparksTriggered = true;
      this.fx?.spawn('rgbGlitchTear', this._safeFxX(this.x), this._safeFxY(this.groundY), {
        palette: CYBER_MAGENTA_PALETTE,
        light: 1.04
      });
    }
  }

  getEnemyTargets(primaryEnemy, game) {
    const targets = [];
    const seen = new Set();
    const isAdv = Boolean(game?.isAdventureMode?.() && game?.adventure?.active);
    const addFoe = (f) => {
      if (!f || f === this || f.isDead || f.isBenched || seen.has(f)) return;
      seen.add(f);
      targets.push(f);
    };
    addFoe(primaryEnemy);
    if (game?.getEnemiesOf) {
      const list = game.getEnemiesOf(this);
      if (Array.isArray(list)) {
        for (const f of list) addFoe(f);
      }
    }
    if (isAdv && Array.isArray(game.adventure.enemies)) {
      for (const f of game.adventure.enemies) addFoe(f);
    }
    if (isAdv && game.adventure.bossEntity) {
      addFoe(game.adventure.bossEntity);
    }
    return targets;
  }

  _gatherMeleeTargets(primaryEnemy, game, reachFront = 216, reachBack = 40) {
    const all = this.getEnemyTargets(primaryEnemy, game);
    const isAdv = Boolean(game?.isAdventureMode?.() && game?.adventure?.active);
    const myGy = this.groundY || this.y;
    const res = [];
    for (const foe of all) {
      const relX = (foe.x - this.x) * this.facing;
      const hitPad = foe.isColossalBoss ? 80 : 0;
      if (relX < -reachBack - hitPad || relX > reachFront + hitPad) continue;
      if (isAdv && !foe.isColossalBoss) {
        const foeGy = foe.groundY || foe.y;
        if (Math.abs(foeGy - myGy) > 66) continue;
      }
      res.push(foe);
    }
    return res;
  }

  /**
   * Applies crunchy Muramasa-09 HF-Plasma Odachi hit-stop (`44-60ms`), target `_hitShakeTimer`,
   * 2-pass ultra-thin plasma hairlines (`0` chevron bars!), and 4-frame cyber-prism starbursts!
   */
  _applyOdachiStrike(primaryEnemy, game, cfg) {
    const {
      damage = 28,
      reachFront = 218,
      reachBack = 38,
      hitStop = 0.044,
      shakeDur = 0.058,
      knockX = 24,
      knockY = 0,
      isCrit = false,
      scarDx = 96,
      scarDy = 72,
      isMagenta = false,
      sfx = 'slash'
    } = cfg;

    if (game?.audio) game.audio.play(sfx, this.x + this.facing * 80);
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
      const hitY = foe.y - (foe.isColossalBoss ? 128 : 88);
      this.spawnPlasmaBeam(
        hitX - this.facing * scarDx * 0.40,
        hitY - scarDy * 0.40,
        hitX + this.facing * scarDx * 0.40,
        hitY + scarDy * 0.40,
        0.16,
        isMagenta,
        3,
        1
      );
      this.spawnHitStarburst(hitX, hitY, isMagenta, 0.18);
      this.spawnVfxAnim(4, hitX, hitY, 176, 176, 0.22, {
        flipX: this.facing < 0,
        foreground: true
      });
      this.spawnCyberHexBurst(hitX, hitY, isCrit ? 6 : 4, isMagenta);
      landedAny = true;
    }

    if (landedAny) {
      this._beatLandedHit = true;
      if (hitStop > 0) {
        this._hitStopTimer = Math.max(this._hitStopTimer || 0, hitStop);
        game?.renderer?.triggerHitStop?.(hitStop * 0.65);
      }
    }
    return landedAny;
  }

  startCrouch(_enemy, game) {
    const vsAspect = game?.isAdventureMode?.() ? 0 : this.buildAspect || 0;
    this.setState('CROUCH');
    this.isCrouching = true;
    this.isDeflecting = true;
    this.didSecondaryAction = false;
    this.crouchDuration = 0.86;
    this.crouchCooldown = this.crouchMaxCooldown || 4.0;
    this.vx = 0;
    if (vsAspect === 2) {
      this.grantBuildShield(34, 2.2, 'HEX BARRIER!', '#22d3ee');
    }

    this.fx?.spawn('aegisHexDome', this._safeFxX(this.x + this.facing * 6, game), this._safeFxY(this.groundY), {
      follow: this,
      offsetX: 6,
      offsetY: 0,
      useGroundY: true,
      flip: this.facing < 0,
      palette: CYBER_NEON_PALETTE,
      maxDuration: 0.44,
      light: 1.0,
      extra: {
        radius: 42,
        radiusY: 56
      }
    });
    this.spawnVfxAnim(1, this.x + this.facing * 24, this.y - 84, 180, 180, 0.36, {
      flipX: this.facing < 0,
      foreground: true,
      followOwner: true,
      offsetX: 24,
      offsetY: -84
    });
    game?.audio?.play?.('reflect', this.x);
  }

  updateCrouch(_dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.crouchDuration || 0.86;
    this.vx = 0;
    this.isCrouching = true;
    this.isDeflecting = t < 0.52;

    if (this.isDeflecting && game?.vfx?.projectiles) {
      for (const proj of game.vfx.projectiles) {
        if (
          proj.owner !== this &&
          !proj._deflectedByVexEx &&
          Math.abs(proj.x - this.x) < 94 &&
          Math.abs(proj.y - (this.y - 84)) < 94
        ) {
          proj._deflectedByVexEx = true;
          proj.owner = this;
          proj.vx = -proj.vx * 1.28;
          proj.color = '#22d3ee';
          proj.coreColor = '#ec4899';
          this.gainMana(14);
          this.gainFinisher(8);
          game?.audio?.play?.('reflect', proj.x);
        }
      }
    }

    if (!this.didSecondaryAction && t >= 0.48) {
      this.didSecondaryAction = true;
      this.isDeflecting = false;
      const sx = this.x + this.facing * 78;
      this.fx?.spawn('plasmaCrescentSlash', this._safeFxX(sx, game), this._safeFxY(this.y - 84), {
        flip: this.facing < 0,
        palette: CYBER_MAGENTA_PALETTE,
        light: 1.12
      });
      this.fireCyberDiscChakram(game, {
        x: sx,
        y: this.y - 84,
        damage: 28,
        speed: 710
      });
      this._applyOdachiStrike(enemy, game, {
        damage: 40,
        reachFront: 218,
        hitStop: 0.046,
        shakeDur: 0.062,
        knockX: 90,
        knockY: -62,
        isCrit: true,
        scarDx: 112,
        scarDy: -66,
        isMagenta: true,
        sfx: 'heavy_cleave'
      });
    }

    if (t >= dur) {
      this.isCrouching = false;
      this.isDeflecting = false;
      this.setState('IDLE');
    }
  }

  startJump(enemy, game, dirOverride = null) {
    const dir = dirOverride !== null ? dirOverride : this.facing;
    this.facing = dir || 1;
    this.vaultCooldown = 2.8;
    this.jumpCooldown = 2.8;
    this.dashDuration = 0.54;
    this.isFlipVault = true;
    this.isInvulnerable = true;
    this.didSecondaryAction = false;
    this.flipStartX = this.x;

    let jumpDist = 195;
    if (enemy && !enemy.isDead && this.facing === (enemy.x >= this.x ? 1 : -1)) {
      const frontDist = Math.abs(enemy.x - this.x);
      if (frontDist > 136 && frontDist < 315) {
        jumpDist = Math.min(195, Math.max(96, frontDist - 134));
      }
    }
    const desiredX = this.x + this.facing * jumpDist;
    this.flipTargetX = this._clampArenaX(desiredX, game);
    this.vx = 0;
    this.vy = 0;
    this.setState('JUMP');
    this.fx?.spawn('wingPylonThruster', this._safeFxX(this.x - this.facing * 16, game), this._safeFxY(this.y - 118), {
      follow: this,
      offsetX: -16,
      offsetY: -118,
      flip: this.facing < 0,
      palette: CYBER_NEON_PALETTE,
      maxDuration: 0.48,
      light: 1.06,
      extra: { length: 20, tilt: -0.45 }
    });
    game?.audio?.play?.('blink', this.x);
  }

  updateJump(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.dashDuration || 0.54;
    const u = Math.min(1, Math.max(0, t / dur));

    this.x = this.flipStartX + (this.flipTargetX - this.flipStartX) * (1 - Math.pow(1 - u, 1.9));
    this.y = this.groundY - Math.sin(u * Math.PI) * 112;
    this.isInvulnerable = u < 0.65;

    this.afterimageAccum += dt;
    if (this.afterimageAccum >= 0.052 && u < 0.82) {
      this.afterimageAccum = 0;
      this.spawnAfterimage(this.x, this.y, this.facing, 8, Math.min(28, Math.floor(u * 30)), 0.20, u > 0.4);
    }

    if (!this.didSecondaryAction && u >= 0.54) {
      this.didSecondaryAction = true;
      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }
      this.fireFinFunnelVolley(enemy, game, 2, 14);
      this._applyOdachiStrike(enemy, game, {
        damage: 34,
        reachFront: 214,
        hitStop: 0.044,
        shakeDur: 0.056,
        knockX: 58,
        knockY: -44,
        scarDx: 104,
        scarDy: 86,
        isMagenta: true,
        sfx: 'slash'
      });
    }

    if (u >= 1) {
      this.y = this.groundY;
      this.vx = 0;
      this.vy = 0;
      this.isFlipVault = false;
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  onStartDodge(_enemy, game, dir) {
    const moveDir = dir || -this.facing;
    this.dashDir = moveDir;
    this.dashDuration = 0.38;
    this.isFlipVault = true;
    this.isInvulnerable = true;
    this.didSecondaryAction = true;
    this.flipStartX = this.x;
    this.flipTargetX = this._clampArenaX(this.x + moveDir * 165, game);
    this.vx = 0;
    this.vy = 0;
    game?.audio?.play?.('dash_whoosh', this.x);
  }

  updateDodge(dt, enemy, game) {
    if (!Number.isFinite(this.flipStartX) || !Number.isFinite(this.flipTargetX)) {
      this.onStartDodge(enemy, game, this.dashDir);
    }
    this.updateJump(dt, enemy, game);
  }

  onStartDash(_enemy, game, dir) {
    this.dashDuration = 0.34;
    this.dashDir = dir || this.facing;
    this._dashStartX = this.x;
    this._dashMaxTravel = 185;
    game?.audio?.play?.('dash_whoosh', this.x);
    this.fx?.spawn('wingPylonThruster', this._safeFxX(this.x - this.dashDir * 16, game), this._safeFxY(this.y - 114), {
      follow: this,
      offsetX: -16,
      offsetY: -114,
      flip: this.dashDir < 0,
      palette: CYBER_NEON_PALETTE,
      maxDuration: 0.32,
      light: 1.06,
      extra: { length: 22, tilt: -0.25 }
    });
  }

  updateDash(dt, enemy, _game) {
    const t = this.stateTimer;
    const dur = this.dashDuration || 0.34;
    const dir = this.dashDir || this.facing;
    this.vy = 0;
    this.y = this.groundY;

    if (t < dur * 0.78) {
      const traveled = (this.x - (this._dashStartX ?? this.x)) * dir;
      const distToEnemy = enemy && !enemy.isDead ? (enemy.x - this.x) * dir : 999;
      if (traveled >= (this._dashMaxTravel || 185) || (distToEnemy <= 136 && distToEnemy >= 55)) {
        this.vx = 0;
      } else {
        this.vx = dir * 610;
      }
      this._thrusterSparkAcc += dt;
      if (this._thrusterSparkAcc >= 0.034) {
        this._thrusterSparkAcc = 0;
        this.spawnAfterimage(this.x, this.y, this.facing, 6, Math.min(24, Math.floor((t / dur) * 30)), 0.18, false);
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
   * 4-Beat Grounded Cyber-Samurai HF-Plasma Odachi Blitz (`[[60,8],[68,7],[75,8],[83,7]]`, `allowV2Cross: false`).
   */
  updateAutoAttack(dt, enemy, game) {
    this._currentEnemy = enemy;
    this._comboPersistTimer = 0.74;

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

    this.vx = 0;
    if (t < snapT) {
      const lungeU = Math.min(1, Math.max(0, t / snapT));
      const eased = 1 - Math.pow(1 - lungeU, 2.3);
      this.x = this._beatStartX + (this._beatTargetX - this._beatStartX) * eased;

      if (v === 0 && Math.abs(this._beatTargetX - this._beatStartX) > 24) {
        this._thrusterSparkAcc += dt;
        if (this._thrusterSparkAcc >= 0.032) {
          this._thrusterSparkAcc = 0;
          this.spawnAfterimage(this.x, this.y, this.facing, 2, localStep, 0.16, false);
          this.spawnCyberParticle('data', this.x - this.facing * 26, this.groundY - 4, -this.facing * 28, -22, 0.20, false, 3);
        }
      }
    } else if (!this._bootsPlanted) {
      this._bootsPlanted = true;
      this.x = this._beatTargetX;
      this.vx = 0;
    }

    if (v === 3) {
      if (t < 0.16) {
        const airU = t / 0.16;
        this.y = this.groundY - Math.sin(airU * Math.PI * 0.86) * 62;
        this.vy = 0;
      } else {
        this.y = this.groundY;
        this.vy = 0;
      }
    } else {
      this.y = this.groundY;
      this.vy = 0;
    }

    const vsAspect = game?.isAdventureMode?.() ? 0 : this.buildAspect || 0;
    const dmgMult = vsAspect === 1 ? 1.05 : vsAspect === 2 ? 0.84 : 1.0;
    const neonPal =
      vsAspect === 1 ? POSITRON_CRIMSON_PALETTE : vsAspect === 2 ? QUANTUM_AEGIS_PALETTE : CYBER_NEON_PALETTE;
    const magPal =
      vsAspect === 1 ? POSITRON_CRIMSON_PALETTE : vsAspect === 2 ? QUANTUM_AEGIS_PALETTE : CYBER_MAGENTA_PALETTE;

    if (v === 0) {
      if ((this._beatHitMask & 1) === 0 && t >= 0.10) {
        this._beatHitMask |= 1;
        const slashX = this.x + this.facing * 72;
        game?.vfx?.spawnShockwave?.(this.x + this.facing * 40, this.groundY - 4, 56, '#22d3ee', 0.20, false, true);
        this.fx?.spawn('plasmaCrescentSlash', this._safeFxX(slashX, game), this._safeFxY(this.y - 84), {
          flip: this.facing < 0,
          palette: neonPal,
          light: 1.12
        });
        if (vsAspect === 1) {
          this.fireCyberDiscChakram(game, {
            x: slashX,
            y: this.y - 84,
            damage: 16,
            speed: 730,
            maxRange: 460,
            pierce: true
          });
        }
        this._applyOdachiStrike(enemy, game, {
          damage: vsAspect === 0 ? 37 : Math.round(37 * dmgMult),
          reachFront: 166,
          hitStop: 0.044,
          shakeDur: 0.056,
          knockX: 24,
          knockY: 0,
          scarDx: 108,
          scarDy: 86,
          isMagenta: vsAspect === 1,
          sfx: 'slash'
        });
      }
    } else if (v === 1) {
      if ((this._beatHitMask & 1) === 0 && t >= 0.06) {
        this._beatHitMask |= 1;
        const slashX = this.x + this.facing * 76;
        game?.vfx?.spawnShockwave?.(slashX, this.groundY - 8, 66, '#ec4899', 0.22, false, true);
        this.fx?.spawn('plasmaCrescentSlash', this._safeFxX(slashX, game), this._safeFxY(this.y - 94), {
          flip: this.facing < 0,
          palette: magPal,
          light: 1.14
        });
        this.fireFinFunnelVolley(enemy, game, 1, vsAspect === 0 ? 10 : Math.round(10 * dmgMult));
        this._applyOdachiStrike(enemy, game, {
          damage: vsAspect === 0 ? 37 : Math.round(37 * dmgMult),
          reachFront: 168,
          hitStop: 0.046,
          shakeDur: 0.058,
          knockX: 22,
          knockY: -132,
          scarDx: 106,
          scarDy: -92,
          isMagenta: true,
          sfx: 'slash'
        });
      }
    } else if (v === 2) {
      if ((this._beatHitMask & 1) === 0 && t >= 0.08) {
        this._beatHitMask |= 1;
        const slashX = this.x + this.facing * 72;
        this.fx?.spawn('twinCrossSlash', this._safeFxX(slashX, game), this._safeFxY(this.y - 88), {
          flip: this.facing < 0,
          palette: neonPal,
          light: 1.12
        });
        this._applyOdachiStrike(enemy, game, {
          damage: vsAspect === 0 ? 27 : Math.round(27 * dmgMult),
          reachFront: 170,
          hitStop: 0.044,
          shakeDur: 0.048,
          knockX: 14,
          knockY: -22,
          scarDx: 114,
          scarDy: 34,
          isMagenta: false,
          sfx: 'slash'
        });
      }
      if ((this._beatHitMask & 2) === 0 && t >= 0.14) {
        this._beatHitMask |= 2;
        this.fireFinFunnelVolley(enemy, game, 2, vsAspect === 0 ? 12 : Math.round(12 * dmgMult));
        this._applyOdachiStrike(enemy, game, {
          damage: vsAspect === 0 ? 29 : Math.round(29 * dmgMult),
          reachFront: 172,
          hitStop: 0.046,
          shakeDur: 0.054,
          knockX: 18,
          knockY: -36,
          scarDx: 114,
          scarDy: -40,
          isMagenta: true,
          sfx: 'clang'
        });
      }
    } else {
      if ((this._beatHitMask & 1) === 0 && t >= 0.16) {
        this._beatHitMask |= 1;
        const slamX = this.x + this.facing * 82;
        game?.renderer?.triggerShake?.(13, 0.26);
        game?.audio?.play?.('emp_blast', slamX);
        game?.audio?.playHeroVoice?.(this.heroId, 'attack', {
          worldX: this.x,
          speakerKey: this,
          priority: 1,
          cooldownMs: 3600
        });
        game?.vfx?.spawnShockwave?.(slamX, this.groundY - 4, 98, '#ec4899', 0.28, false, true);
        this.spawnVfxAnim(2, slamX, this.groundY - 82, 208, 208, 0.34, {
          flipX: this.facing < 0,
          foreground: false
        });
        if (vsAspect === 2 && !game?.isAdventureMode?.()) {
          this.shieldHp = Math.min(260, (this.shieldHp || 0) + 14);
        }
        this._applyOdachiStrike(enemy, game, {
          damage: vsAspect === 0 ? 33 : Math.round(33 * dmgMult),
          reachFront: 178,
          hitStop: 0.060,
          shakeDur: 0.084,
          knockX: 36,
          knockY: -46,
          isCrit: true,
          scarDx: 26,
          scarDy: 138,
          isMagenta: true,
          sfx: 'heavy_cleave'
        });
        this.fireCyberDiscChakram(game, {
          x: slamX,
          y: this.groundY - 78,
          damage: vsAspect === 0 ? 35 : Math.round(35 * dmgMult),
          speed: vsAspect === 1 ? 750 : 700,
          maxRange: 460,
          pierce: true
        });
      }
      if ((this._beatHitMask & 2) === 0 && t >= 0.21) {
        this._beatHitMask |= 2;
        this._applyOdachiStrike(enemy, game, {
          damage: vsAspect === 0 ? 22 : Math.round(22 * dmgMult),
          reachFront: 180,
          hitStop: 0,
          shakeDur: 0.046,
          knockX: 28,
          knockY: -34,
          scarDx: 94,
          scarDy: 78,
          isMagenta: false,
          sfx: 'clang'
        });
      }
      if ((this._beatHitMask & 4) === 0 && t >= 0.26) {
        this._beatHitMask |= 4;
        this._applyOdachiStrike(enemy, game, {
          damage: vsAspect === 0 ? 29 : Math.round(29 * dmgMult),
          reachFront: 182,
          hitStop: 0,
          shakeDur: 0.056,
          knockX: 118,
          knockY: -86,
          isCrit: true,
          scarDx: 98,
          scarDy: -84,
          isMagenta: true,
          sfx: 'slash'
        });
      }
    }

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
      const relEnemyX = enemy && !enemy.isDead ? (enemy.x - this.x) * this.facing : 999;
      const aiWantsChain =
        !isManualPlayer &&
        enemy &&
        !enemy.isDead &&
        !enemy.isInvulnerable &&
        relEnemyX >= -36 &&
        relEnemyX <= 178 &&
        (this._beatLandedHit || relEnemyX <= 156);

      if (v < 3 && (this._queuedNextBeat || aiWantsChain || advHoldingAttack)) {
        if (game?.adventure?.queuedAction === 'attack') {
          game.adventure.queuedAction = null;
        }
        this._queuedNextBeat = false;
        this._intraLinkTimer = INTRA_COMBO_LINK;
        return;
      }

      if (v === 3 || (!isManualPlayer && !this._beatLandedHit && !advHoldingAttack)) {
        this.comboStep = 0;
        this._aiComboReadyFinisher = v === 3 ? 0.92 : 0;
        this._aiOutstepTimer =
          !game?.isAdventureMode?.() && enemy && Math.abs(enemy.x - this.x) < 214
            ? 0.56 + Math.random() * 0.26
            : 0;
        this._aiOutstepDir = -1;
        this.autoCooldown = isManualPlayer
          ? 0.06
          : v === 3
            ? this._postFlurryInterval * (0.98 + Math.random() * 0.22)
            : 0.52 + Math.random() * 0.26;
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
   * NEWLY BORN SKILL (`0.98s`, `4.35s` CD): `SINGULARITY FUNNEL OVERDRIVE`
   * Deploys 4 Cyber Fin-Funnels in a diamond lock-on grid firing crisp 2px cyan-magenta
   * converging plasma beams while VEX-09 executes a thruster-boosted EMP Odachi cross-cut
   * (`+32 HP` shield recharge)!
   */
  updateSkill(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.skillDuration || 0.98;
    this.unstoppablePoise = true;

    const rushDir = this._skillDir || this.facing || 1;
    if (this._skillCommittedLockX === undefined) {
      const rawDist = enemy && !enemy.isDead ? (enemy.x - this.x) * rushDir : 165;
      const clampedLockDist = Math.max(95, Math.min(260, rawDist > 0 ? rawDist : 165));
      this._skillCommittedLockX = this._clampArenaX(this.x + rushDir * clampedLockDist, game);
    }
    const lockX = this._skillCommittedLockX;
    const lockY = this.groundY - 94;
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
    const skillNeonPal =
      vsSkill === 1 ? POSITRON_CRIMSON_PALETTE : vsSkill === 2 ? QUANTUM_AEGIS_PALETTE : CYBER_NEON_PALETTE;
    const skillMagPal =
      vsSkill === 1 ? POSITRON_CRIMSON_PALETTE : vsSkill === 2 ? QUANTUM_AEGIS_PALETTE : CYBER_MAGENTA_PALETTE;

    // Committed directional thruster bursts (capped <= 145px travel — zero continuous enemy.x magnet!)
    if (t < 0.48) {
      const traveled = (this.x - (this._skillStartX ?? this.x)) * rushDir;
      const frontDist = enemy && !enemy.isDead ? (enemy.x - this.x) * rushDir : 999;
      const inBurst = (t >= 0.04 && t < 0.16) || (t >= 0.24 && t < 0.36);
      if (inBurst && traveled < 145 && !(frontDist <= 122 && frontDist >= 0)) {
        this.vx = rushDir * 485;
      } else {
        this.vx = 0;
      }
      this.afterimageAccum += dt;
      if (this.afterimageAccum >= 0.042) {
        this.afterimageAccum = 0;
        this.spawnAfterimage(
          this.x,
          this.y,
          this.facing,
          3,
          Math.min(18, Math.floor((t / dur) * 30)),
          0.20,
          (this._skillStepMask & 2) !== 0
        );
      }
    } else {
      this.vx = 0;
    }

    // Step 1 (t = 0.05s): Deploy 4 Cyber Fin-Funnels in a Diamond Lock-On Grid!
    if ((this._skillStepMask & 1) === 0 && t >= 0.05) {
      this._skillStepMask |= 1;
      this.diamondFunnelGrid = {
        cx: lockX,
        cy: lockY,
        rx: 92,
        ry: 78,
        age: 0,
        maxLife: 0.72
      };
      this.spawnVfxAnim(3, lockX, lockY, 184, 184, 0.48, { foreground: true });
      this.fx?.spawn('holoTargetReticle', this._safeFxX(lockX, game), this._safeFxY(this.groundY), {
        palette: skillNeonPal,
        light: 1.08,
        extra: { boxW: 24, boxH: 60 }
      });
      game?.audio?.play?.('cyber_beam', lockX);
    }

    // Step 2 (t = 0.20s): 4 Diamond Fin-Funnels fire converging 2px Cyan-Magenta Plasma Beams + Odachi Slash 1!
    if ((this._skillStepMask & 2) === 0 && t >= 0.20) {
      this._skillStepMask |= 2;
      this.vx = 0;
      const g = this.diamondFunnelGrid || { cx: lockX, cy: lockY, rx: 92, ry: 78 };
      const nodes = [
        [g.cx, g.cy - g.ry],
        [g.cx + g.rx, g.cy],
        [g.cx, g.cy + g.ry * 0.72],
        [g.cx - g.rx, g.cy]
      ];
      for (let i = 0; i < nodes.length; i++) {
        this.spawnPlasmaBeam(nodes[i][0], nodes[i][1], lockX, lockY, 0.24, vsSkill === 1 || i % 2 === 1, 4, 2);
        game?.vfx?.spawnBeam?.({
          x1: nodes[i][0],
          y1: nodes[i][1],
          x2: lockX,
          y2: lockY,
          width: 12,
          color: vsSkill === 1 ? '#fb7185' : i % 2 === 1 ? '#ec4899' : '#22d3ee',
          coreColor: '#ffffff',
          maxLife: 0.22,
          owner: this
        });
      }
      if (vsSkill === 1) {
        this.fireCyberDiscChakram(game, {
          x: this.x + this.facing * 80,
          y: this.y - 88,
          damage: 16,
          speed: 740,
          maxRange: 480,
          pierce: true
        });
      }
      this._applyOdachiStrike(enemy, game, {
        damage: vsSkill === 1 ? 39 : vsSkill === 2 ? 26 : 37,
        reachFront: 222,
        hitStop: 0.036,
        shakeDur: 0.050,
        knockX: 18,
        knockY: -22,
        scarDx: 112,
        scarDy: 82,
        isMagenta: vsSkill === 1,
        sfx: 'slash'
      });
    }

    // Step 3 (t = 0.38s): Second Diamond Funnel Cross-Beam Volley + Reverse Hot-Magenta Odachi Cut!
    if ((this._skillStepMask & 4) === 0 && t >= 0.38) {
      this._skillStepMask |= 4;
      this.vx = 0;
      const g = this.diamondFunnelGrid || { cx: lockX, cy: lockY, rx: 92, ry: 78 };
      this.spawnPlasmaBeam(g.cx - g.rx, g.cy, g.cx + g.rx, g.cy, 0.22, true, 4, 2);
      this.spawnPlasmaBeam(g.cx, g.cy - g.ry, g.cx, g.cy + g.ry * 0.72, 0.22, false, 4, 2);
      game?.vfx?.spawnBeam?.({
        x1: g.cx - g.rx,
        y1: g.cy,
        x2: g.cx + g.rx,
        y2: g.cy,
        width: 14,
        color: '#ec4899',
        coreColor: '#ffffff',
        maxLife: 0.20,
        owner: this
      });
      game?.vfx?.spawnBeam?.({
        x1: g.cx,
        y1: g.cy - g.ry,
        x2: g.cx,
        y2: g.cy + g.ry * 0.72,
        width: 14,
        color: '#22d3ee',
        coreColor: '#ffffff',
        maxLife: 0.20,
        owner: this
      });
      this.fx?.spawn(
        'twinCrossSlash',
        this._safeFxX(this.x + this.facing * 76, game),
        this._safeFxY(this.y - 88),
        {
          flip: this.facing < 0,
          palette: skillMagPal,
          light: 1.12
        }
      );
      this._applyOdachiStrike(enemy, game, {
        damage: vsSkill === 1 ? 39 : vsSkill === 2 ? 26 : 37,
        reachFront: 224,
        hitStop: 0.038,
        shakeDur: 0.054,
        knockX: 18,
        knockY: -34,
        scarDx: 112,
        scarDy: -84,
        isMagenta: true,
        sfx: 'clang'
      });
    }

    // Step 4 (t = 0.58s): Thruster-Boosted EMP Odachi Cross-Cut Detonation!
    if ((this._skillStepMask & 8) === 0 && t >= 0.58) {
      this._skillStepMask |= 8;
      const empX = this.x + this.facing * 82;
      game?.renderer?.triggerShake?.(14, 0.26);
      game?.renderer?.triggerImpactFrame?.(empX, this.groundY - 86, 0.06, 'cyber');
      game?.audio?.play?.('emp_blast', empX);
      game?.vfx?.spawnShockwave?.(empX, this.groundY - 2, vsSkill === 2 ? '#22d3ee' : '#ec4899', 132, 0.32);
      game?.vfx?.spawnDecal?.(empX, this.groundY, 'scorch', 88);
      this.fx?.spawn('empOverloadDome', this._safeFxX(empX, game), this._safeFxY(this.groundY), {
        palette: skillNeonPal,
        warmup: 0.36,
        light: 1.14,
        extra: { radius: 48, fringe: vsSkill === 2 ? '#22d3ee' : '#ec4899' }
      });
      this.spawnVfxAnim(2, empX, this.groundY - 82, 212, 212, 0.38, {
        flipX: this.facing < 0,
        foreground: true
      });
      this.spawnCyberHexBurst(empX, this.groundY - 86, 10, true);
      if (vsSkill === 1) {
        // Skill II (Positron Rail-Cross Blitz): Zero heal & zero shield!
      } else if (vsSkill === 2) {
        this.shieldHp = Math.min(260, (this.shieldHp || 0) + 32);
        this.heal(30, 'AEGIS-09 RECHARGE');
        this.grantBuildShield(44, 2.4, 'HEX-AEGIS BARRIER!', '#22d3ee');
        this.healTeammateTagGrace(26, 'NANITE PATCH', 30, 2.4);
      } else {
        this.shieldHp = Math.min(260, (this.shieldHp || 0) + 46);
        this.heal(38, 'SINGULARITY SHIELD');
      }
      const hitStep4 = this._applyOdachiStrike(enemy, game, {
        damage: vsSkill === 1 ? 72 : vsSkill === 2 ? 44 : 66,
        reachFront: 236,
        hitStop: 0.052,
        shakeDur: 0.076,
        knockX: vsSkill === 1 ? 42 : 112,
        knockY: -152,
        isCrit: true,
        scarDx: 32,
        scarDy: -140,
        isMagenta: true,
        sfx: 'emp_blast'
      });
      if (vsSkill === 1 && hitStep4 && enemy && !enemy.isDead) {
        enemy.applyBuildRoot?.(0.36, 'EMP LOCK!', '#fb7185');
      }
    }

    if (this.diamondFunnelGrid) {
      this.diamondFunnelGrid.age += dt;
      if (this.diamondFunnelGrid.age >= this.diamondFunnelGrid.maxLife) {
        this.diamondFunnelGrid = null;
      }
    }

    if (t >= dur) {
      this.vx = 0;
      this.y = this.groundY;
      this.diamondFunnelGrid = null;
      this.unstoppablePoise = false;
      this.setState('IDLE');
    }
  }

  /**
   * NEWLY BORN OVERDRIVE (`1.92s`, Row 4 `120..149`): `VALKYRIE HYPER-PRISM BARRAGE`
   * Hovering on twin plasma wing-thrusters with a pixel HUD target-matrix reticle (`0` ellipse primitives),
   * sweeps a multi-band Neon-Cyan & Hot-Magenta Visor Hyper-Laser + 6 Fin-Funnel orbital strikes (`<= 0.14` bloom)!
   */
  updateUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.ultDuration || 1.92;
    this.isInvulnerable = t < 0.22;
    this.unstoppablePoise = true;
    this.vx = 0;
    this.vy = 0;

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
    const ultNeonPal =
      vsUlt === 1 ? POSITRON_CRIMSON_PALETTE : vsUlt === 2 ? QUANTUM_AEGIS_PALETTE : CYBER_NEON_PALETTE;
    const ultMagPal =
      vsUlt === 1 ? POSITRON_CRIMSON_PALETTE : vsUlt === 2 ? QUANTUM_AEGIS_PALETTE : CYBER_MAGENTA_PALETTE;

    if (this._ultStep === 0) {
      this._ultStep = 1;
      this._ultStartX = this.x;
      this._ultRetreatX = this._clampArenaX(this.x - this.facing * 135, game);
      this._ultFocusX = this._clampArenaX(
        enemy && !enemy.isDead ? enemy.x : this.x + this.facing * 220,
        game
      );
      if (Math.abs(this._ultFocusX - this.x) > 8) {
        this.facing = this._ultFocusX >= this.x ? 1 : -1;
      }
      game?.audio?.play?.('ult_cast', this.x);
      this.fx?.spawn('wingPylonThruster', this._safeFxX(this.x - this.facing * 18, game), this._safeFxY(this.groundY - 152), {
        follow: this,
        offsetX: -18,
        offsetY: -112,
        flip: this.facing < 0,
        palette: ultNeonPal,
        maxDuration: 1.72,
        light: 1.08,
        extra: { length: 22, tilt: -0.52 }
      });
      this.fx?.spawn('singularityReactor', this._safeFxX(this._ultFocusX, game), this._safeFxY(this.groundY), {
        palette: ultNeonPal,
        light: 1.12,
        extra: { radius: 40, coreY: -32 }
      });
      this.hudTargetMatrix = {
        x: this._ultFocusX,
        y: this.groundY - 98,
        age: 0,
        maxLife: 1.72
      };
      // Deploy 6 Autonomous Fin-Funnels in an Upper Orbital Arc!
      this.orbitalStrikeFunnels = [];
      for (let i = 0; i < 6; i++) {
        const frac = i / 5;
        this.orbitalStrikeFunnels.push({
          ox: -150 + frac * 300,
          oy: -228 - Math.sin(frac * Math.PI) * 44,
          fired: false
        });
      }
      game?.vfx?.spawnDamageText?.(
        this._ultFocusX,
        this.groundY - 212,
        0,
        true,
        vsUlt === 1
          ? 'HYPER-POSITRON ANNIHILATOR!'
          : vsUlt === 2
            ? 'ORBITAL AEGIS MATRIX!'
            : 'VALKYRIE HYPER-PRISM BARRAGE!',
        vsUlt === 1 ? '#fb7185' : '#22d3ee'
      );
    }

    if (enemy && !enemy.isDead && t < 1.35) {
      this._ultFocusX = this._clampArenaX(enemy.x, game);
    }
    if (this.hudTargetMatrix) {
      this.hudTargetMatrix.age += dt;
      this.hudTargetMatrix.x = this._ultFocusX;
    }

    // Hovering in mid-air on twin plasma wing-thrusters!
    if (t < 0.34) {
      const backU = t / 0.34;
      const ease = 1 - Math.pow(1 - backU, 2.2);
      this.x = this._ultStartX + (this._ultRetreatX - this._ultStartX) * ease;
      this.y = this.groundY - Math.round(46 * ease);
      this.trueUltFrameOverride = 120 + Math.min(7, Math.floor(backU * 8));
      this._overrideFrameIdx = this.trueUltFrameOverride;
    } else if (t < 1.62) {
      this.y = this.groundY - 46 + Math.round(Math.sin((t - 0.34) * 8) * 3);
      const fireU = Math.min(1, (t - 0.34) / 1.28);
      this.trueUltFrameOverride = 128 + Math.min(16, Math.floor(fireU * 17));
      this._overrideFrameIdx = this.trueUltFrameOverride;
    } else {
      const landU = Math.min(1, (t - 1.62) / Math.max(0.08, dur - 1.62));
      this.y = this.groundY - Math.round(46 * (1 - landU));
      this.trueUltFrameOverride = 145 + Math.min(4, Math.floor(landU * 5));
      this._overrideFrameIdx = this.trueUltFrameOverride;
    }

    // 3 Multi-Band Neon-Cyan & Hot-Magenta Visor Hyper-Laser Sweeps + 6 Fin-Funnel Orbital Strikes!
    const pulseTimes = [0.62, 0.92, 1.20];
    while (this._ultStep >= 1 && this._ultStep <= 3 && t >= pulseTimes[this._ultStep - 1]) {
      const pulseIdx = this._ultStep;
      this._ultStep++;
      const visorX = this.x + this.facing * 20;
      const visorY = this.y - 134;
      const targetY = this.groundY - 94 + (pulseIdx - 2) * 16;
      const beamDx = Math.max(-200, Math.min(200, (this._ultFocusX - visorX) / 3));
      const beamDy = Math.max(-60, Math.min(52, (targetY - visorY) / 3));

      // Multi-band Cyan & Hot-Magenta Visor Lasers + Converging Funnel Plasma Beams
      this.spawnPlasmaBeam(visorX, visorY - 4, this._ultFocusX, targetY - 6, 0.24, false, 4, 2);
      this.spawnPlasmaBeam(visorX, visorY + 4, this._ultFocusX, targetY + 6, 0.24, true, 4, 2);
      game?.vfx?.spawnBeam?.({
        x1: visorX,
        y1: visorY,
        x2: this._ultFocusX,
        y2: targetY,
        width: 18,
        color: pulseIdx % 2 === 0 ? '#ec4899' : '#22d3ee',
        coreColor: '#ffffff',
        maxLife: 0.22,
        owner: this
      });

      this.fx?.spawn('visorHyperLaserBeam', this._safeFxX(visorX, game), this._safeFxY(visorY), {
        flip: false,
        palette: pulseIdx % 2 === 0 ? ultMagPal : ultNeonPal,
        light: 1.16,
        extra: {
          dx: beamDx,
          dy: beamDy,
          width: 5.6,
          seed: 21 + pulseIdx * 7
        }
      });

      // Fire 2 of the 6 Orbital Fin-Funnels per sweep!
      const fIdxA = (pulseIdx - 1) * 2;
      for (let k = 0; k < 2; k++) {
        const fn = this.orbitalStrikeFunnels[fIdxA + k];
        if (fn) {
          fn.fired = true;
          const fx0 = this._ultFocusX + fn.ox;
          const fy0 = this.groundY + fn.oy;
          const tx1 = this._ultFocusX + (k === 0 ? -14 : 14);
          const ty1 = this.groundY - 88;
          this.spawnPlasmaBeam(fx0, fy0, tx1, ty1, 0.26, k === 1, 4, 2);
          game?.vfx?.spawnBeam?.({
            x1: fx0,
            y1: fy0,
            x2: tx1,
            y2: ty1,
            width: 14,
            color: k === 1 ? '#ec4899' : '#22d3ee',
            coreColor: '#ffffff',
            maxLife: 0.24,
            owner: this
          });
        }
      }

      const foes = this.getEnemyTargets(enemy, game);
      const sweepDmg = vsUlt === 1 ? 46 : vsUlt === 2 ? 32 : 43;
      for (const foe of foes) {
        if (Math.abs(foe.x - this._ultFocusX) <= 320 || foe === enemy) {
          if (!foe.isColossalBoss) {
            foe.x += (this._ultFocusX - foe.x) * 0.28;
          }
          foe.takeDamage(sweepDmg, this, false, 24, 0);
          foe._hitShakeTimer = Math.max(foe._hitShakeTimer || 0, 0.05);
        }
      }
      this.spawnCyberHexBurst(this._ultFocusX, targetY, 5, pulseIdx % 2 === 0);
      game?.renderer?.triggerShake?.(7, 0.12);
      game?.audio?.play?.('cyber_beam', this._ultFocusX);
    }

    // Final Overcharged Multi-Band Hyper-Prism Detonation at t >= 1.48s
    if (this._ultStep === 4 && t >= 1.48) {
      this._ultStep = 5;
      const visorX = this.x + this.facing * 20;
      const visorY = this.y - 134;
      const beamDx = Math.max(-200, Math.min(200, (this._ultFocusX - visorX) / 3));
      const beamDy = Math.max(-60, Math.min(52, (this.groundY - 92 - visorY) / 3));

      // Overdrive Railgun Lance + Orbital Column Finisher!
      this.spawnPlasmaBeam(visorX, visorY - 5, this._ultFocusX, this.groundY - 98, 0.30, false, 4, 2);
      this.spawnPlasmaBeam(visorX, visorY + 5, this._ultFocusX, this.groundY - 86, 0.30, true, 4, 2);
      game?.vfx?.spawnBeam?.({
        x1: visorX,
        y1: visorY,
        x2: this._ultFocusX,
        y2: this.groundY - 92,
        width: 32,
        color: '#ec4899',
        coreColor: '#22d3ee',
        maxLife: 0.34,
        owner: this
      });
      this.spawnVfxAnim(7, this._ultFocusX, this.groundY - 112, 224, 288, 0.40, {
        foreground: true
      });
      game?.vfx?.spawnShockwave?.(this._ultFocusX, this.groundY - 2, '#22d3ee', 164, 0.38);
      game?.vfx?.spawnDecal?.(this._ultFocusX, this.groundY, 'scorch', 112);

      this.fx?.spawn('visorHyperLaserBeam', this._safeFxX(visorX, game), this._safeFxY(visorY), {
        flip: false,
        palette: ultMagPal,
        light: 1.20,
        extra: {
          dx: beamDx,
          dy: beamDy,
          width: 7.2,
          seed: 55
        }
      });
      this.fx?.spawn('supernovaExplosion', this._safeFxX(this._ultFocusX, game), this._safeFxY(this.groundY - 88), {
        palette: ultMagPal,
        light: 1.16
      });
      this.fx?.spawn('empOverloadDome', this._safeFxX(this._ultFocusX, game), this._safeFxY(this.groundY), {
        palette: ultNeonPal,
        warmup: 0.42,
        light: 1.14,
        extra: { radius: 52, fringe: '#ec4899' }
      });

      if (vsUlt === 1) {
        this.gainFinisher(8);
      } else if (vsUlt === 2) {
        this.heal(34, 'ORBITAL AEGIS');
        this.grantBuildShield(62, 2.6, 'ORBITAL BARRIER!', '#22d3ee');
        this.healTeammateTagGrace(28, 'AEGIS MATRIX', 32, 2.5);
      }

      const foes = this.getEnemyTargets(enemy, game);
      const finDmg = vsUlt === 1 ? 190 : vsUlt === 2 ? 132 : 176;
      for (const foe of foes) {
        if (Math.abs(foe.x - this._ultFocusX) <= 370 || foe === enemy) {
          foe.takeDamage(finDmg, this, true, 200, -180);
          if (vsUlt === 2 && !foe.isDead) {
            foe.applyBuildRoot?.(0.40, 'EMP STASIS!', '#22d3ee');
          }
          this.spawnHitStarburst(foe.x, foe.y - 94, true, 0.24);
        }
      }
      this.spawnCyberHexBurst(this._ultFocusX, this.groundY - 92, 12, true);
      game?.renderer?.triggerImpactFrame?.(this._ultFocusX, this.groundY - 94, 0.08, 'cyber');
      game?.renderer?.triggerShake?.(16, 0.28);
      game?.renderer?.triggerAberration?.(8);
      game?.renderer?.triggerHitStop?.(0.065);
      game?.audio?.play?.('emp_blast', this._ultFocusX);
    }

    if (t >= dur) {
      this.y = this.groundY;
      this.isInvulnerable = false;
      this.unstoppablePoise = false;
      this.hudTargetMatrix = null;
      this.orbitalStrikeFunnels = [];
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      this.setState('IDLE');
    }
  }

  /**
   * Computes the 6 flanking V-Wing Tactical Fin-Funnel Drone Pod positions
   * behind/above VEX-09 EX's shoulders for Phase 2 charge lock & Phase 3 barrage.
   */
  _getTrueUltVWingBattery(t) {
    const snapU = Math.min(1, Math.max(0, (t - 0.48) / 0.22));
    const easeSnap = 1 - Math.pow(1 - snapU, 3);
    const recoil = t >= 1.68 && t < 2.25 ? Math.sin(((t - 1.68) / 0.57) * Math.PI) * 14 : 0;
    const offsets = [
      { ox: -52, oy: -162, row: 1, size: 108 },
      { ox: -86, oy: -186, row: 6, size: 112 },
      { ox: -122, oy: -210, row: 1, size: 116 },
      { ox: -58, oy: -108, row: 6, size: 104 },
      { ox: -96, oy: -120, row: 1, size: 108 },
      { ox: -134, oy: -134, row: 6, size: 112 }
    ];
    return offsets.map((o, idx) => {
      const hover = Math.sin(t * 7.5 + idx * 1.1) * 4;
      const sx = this.x + this.facing * (-22 + (o.ox + 22) * easeSnap - recoil);
      const sy = this.groundY - 110 + (o.oy + 110) * easeSnap + hover;
      return {
        x: Math.round(sx / 2) * 2,
        y: Math.round(sy / 2) * 2,
        row: o.row,
        size: o.size,
        isMagenta: idx % 2 === 1
      };
    });
  }

  /**
   * NEWLY BORN SUPREME FINISHER (`3.55s`):
   * `PROJECT GUNG-09: ORBITAL SINGULARITY BUSTER`
   * Phase 1 (`0.00..0.48s`): Fast 360-deg Tactical Backflip Vault with cyan/magenta afterimages.
   * Phase 2 (`0.48..1.68s`): Crouched Spec-Ops Charge (Bayer aura, Singularity Sphere, Telemetry Bars,
   *                          6 V-Wing Fin-Funnel Lock Battery, 8-Drone Cage & 5-Tier Sky Gate).
   * Phase 3 (`1.68..3.55s`): Cataclysmic Multi-Vector Bombardment (488px Center + Flanking 184px
   *                          Satellite Rail Columns, 380x260 Reactor Dome, 360x120 Ground Seal, `705` Crit).
   */
  updateTrueUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    if (!this._trueUltChargeVoiceFired && t < 1.68) {
      this._trueUltChargeVoiceFired = true;
      game?.audio?.playHeroVoice?.(this.heroId, 'true_ult_charge', {
        worldX: this.x,
        speakerKey: this,
        priority: 3,
        cooldownMs: 400,
        duckSfx: true
      });
    }
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const advBounds =
      game?.adventure?.active && typeof game.adventure.getActiveStageBounds === 'function'
        ? game.adventure.getActiveStageBounds()
        : null;
    this.isInvulnerable = t < 0.35;
    this.unstoppablePoise = true;
    this.vx = 0;
    this.vy = 0;

    const targets = this.getEnemyTargets(enemy, game);

    if (t <= 1.66) {
      const rawTgtX = enemy && !enemy.isDead ? enemy.x : this.x + this.facing * 240;
      this._trueUltTargetX = advBounds
        ? enemy?.isColossalBoss
          ? enemy.x
          : Math.max(advBounds.minX + 110, Math.min(advBounds.maxX - 110, rawTgtX))
        : Math.max(200, Math.min(ww - 200, rawTgtX));
      if (Math.abs(this._trueUltTargetX - this.x) > 8) {
        this.facing = this._trueUltTargetX >= this.x ? 1 : -1;
      }
    }

    // Phase 1 (`0.00..0.48s`): Fast Tactical Cyber-Valkyrie 360-Deg Backflip Vault!
    if (t < 0.48) {
      const uFlip = Math.min(1, t / 0.48);
      const retreatEase = 1 - Math.pow(1 - uFlip, 1.35);
      this.y = this.groundY - Math.sin(uFlip * Math.PI) * 156;
      const flipCol = Math.min(9, Math.floor(uFlip * 10));
      this.trueUltFrameOverride = 120 + flipCol;
      this._overrideFrameIdx = this.trueUltFrameOverride;

      if (this._trueUltStep < 1) {
        this._trueUltStep = 1;
        this._trueUltStartX = this.x;
        this._trueUltRetreatX = this._clampArenaX(this.x - this.facing * 188, game);
        game?.audio?.play?.('ult_cast', this.x);
        game?.audio?.play?.('emp_blast', this.x);
        game?.vfx?.triggerCinematicCutIn?.(this, this.trueUltName, '#22d3ee');
        game?.vfx?.spawnDamageText?.(
          this.x,
          this.y - 188,
          0,
          true,
          'PROJECT GUNG-09: ORBITAL RELAY!',
          '#22d3ee'
        );
        this.fx?.spawn('wingPylonThruster', this._safeFxX(this.x - this.facing * 18, game), this._safeFxY(this.y - 146), {
          follow: this,
          offsetX: -18,
          offsetY: -146,
          flip: this.facing < 0,
          palette: CYBER_NEON_PALETTE,
          maxDuration: 2.86,
          light: 1.08,
          extra: { length: 22, tilt: -0.58 }
        });
        this.fx?.spawn('holoTargetReticle', this._safeFxX(this._trueUltTargetX, game), this._safeFxY(this.groundY), {
          palette: CYBER_NEON_PALETTE,
          light: 1.12,
          extra: { boxW: 26, boxH: 66 }
        });
      }

      this._trueUltAfterAccum = (this._trueUltAfterAccum || 0) + dt;
      if (this._trueUltAfterAccum >= 0.035) {
        this._trueUltAfterAccum -= 0.035;
        const mag = ((this._trueUltAfterStep || 0) % 2) === 1;
        this._trueUltAfterStep = (this._trueUltAfterStep || 0) + 1;
        this.spawnAfterimage(this.x, this.y, this.facing, 4, flipCol, 0.24, mag);
      }

      this.x = this._trueUltStartX + (this._trueUltRetreatX - this._trueUltStartX) * retreatEase;
      return;
    }

    // Phase 2 (`0.48..1.68s`): 1.20s Braced Tactical Spec-Ops Rail-Charge & Multi-Tier Orbital Lock!
    if (t < 1.68) {
      this.x = this._trueUltRetreatX;
      this.y = this.groundY;
      const uCharge = Math.min(1, (t - 0.48) / 1.20);
      this.trueUltFrameOverride = 130 + Math.min(7, Math.floor(uCharge * 8));
      this._overrideFrameIdx = this.trueUltFrameOverride;

      if (this._trueUltStep < 2) {
        this._trueUltStep = 2;
        game?.audio?.play?.('cyber_beam', this._trueUltTargetX);
        game?.audio?.play?.('blink', this.x);
        for (let k = 0; k < 4; k++) {
          const ang = k * Math.PI * 0.5 + 0.35;
          game?.vfx?.spawnBeam?.({
            x1: this._trueUltTargetX + Math.cos(ang) * 164,
            y1: this.groundY - 110 + Math.sin(ang) * 108,
            x2: this._trueUltTargetX - Math.cos(ang) * 164,
            y2: this.groundY - 110 - Math.sin(ang) * 108,
            width: 12,
            color: k % 2 === 0 ? '#22d3ee' : '#ec4899',
            coreColor: '#ffffff',
            maxLife: 0.34,
            owner: this
          });
        }
        game?.vfx?.spawnDamageText?.(
          this._trueUltTargetX,
          this.groundY - 196,
          0,
          true,
          'HEX-MATRIX CAGE LOCK!',
          '#ec4899'
        );
      }

      if (t <= 1.66) {
        for (const foe of targets) {
          if (!foe.isDead && !foe.isColossalBoss) {
            foe.x += (this._trueUltTargetX - foe.x) * Math.min(1, dt * 8);
            foe.vx *= 0.2;
          }
        }
      }
      return;
    }

    // Phase 3 (`t >= 1.68s`): Cataclysmic Multi-Vector Orbital Singularity Bombardment (`705` Crit)!
    this.x = this._trueUltRetreatX;
    this.y = this.groundY;

    if (t >= 1.68 && this._trueUltStep < 3) {
      this._trueUltStep = 3;
      this._trueUltBusterTimer = 1.18;
      if (!this._trueUltFireVoiceFired) {
        this._trueUltFireVoiceFired = true;
        game?.audio?.playHeroVoice?.(this.heroId, 'true_ult_fire', {
          worldX: this.x,
          speakerKey: this,
          priority: 4,
          cooldownMs: 200,
          duckSfx: true
        });
      }

      const visorX = this.x + this.facing * 20;
      const visorY = this.groundY - 124;
      const beamDx = Math.max(-200, Math.min(200, (this._trueUltTargetX - visorX) / 3));
      const beamDy = Math.max(-60, Math.min(52, (this.groundY - 104 - visorY) / 3));
      this.fx?.spawn('visorHyperLaserBeam', this._safeFxX(visorX, game), this._safeFxY(visorY), {
        flip: false,
        palette: CYBER_NEON_PALETTE,
        light: 1.20,
        extra: {
          dx: beamDx,
          dy: beamDy,
          width: 7.2,
          seed: 99
        }
      });

      this.spawnPlasmaBeam(visorX, visorY, this._trueUltTargetX, this.groundY - 102, 0.78, false, 12, 4);
      const battery = this._getTrueUltVWingBattery(t);
      for (let i = 0; i < battery.length; i++) {
        const pod = battery[i];
        const impactOffX = (i - 2.5) * 28;
        const impactOffY = ((i % 3) - 1) * 26;
        this.spawnPlasmaBeam(
          pod.x,
          pod.y,
          this._trueUltTargetX + impactOffX,
          this.groundY - 96 + impactOffY,
          0.74,
          pod.isMagenta,
          8,
          3
        );
      }

      game?.renderer?.triggerImpactFrame?.(this._trueUltTargetX, this.groundY - 110, 0.11, 'cyber');
      game?.renderer?.triggerShake?.(28, 0.75);
      game?.renderer?.triggerAberration?.(12);
      game?.renderer?.triggerHitStop?.(0.085);

      game?.vfx?.spawnBeam?.({
        x1: visorX,
        y1: visorY,
        x2: this._trueUltTargetX,
        y2: this.groundY - 104,
        width: 30,
        color: '#22d3ee',
        coreColor: '#ffffff',
        maxLife: 0.46,
        owner: this
      });
      game?.vfx?.spawnBeam?.({
        x1: this._trueUltTargetX,
        y1: this.groundY - 620,
        x2: this._trueUltTargetX,
        y2: this.groundY,
        width: 72,
        color: '#22d3ee',
        coreColor: '#ec4899',
        maxLife: 0.96,
        owner: this
      });
      game?.vfx?.spawnDecal?.(this._trueUltTargetX, this.groundY, 'scorch', 176);
      game?.vfx?.spawnShockwave?.(this._trueUltTargetX, this.groundY - 2, '#ec4899', 260, 0.52);

      game?.audio?.play?.('ult_cast', this._trueUltTargetX);
      game?.audio?.play?.('cyber_beam', this._trueUltTargetX);
      game?.audio?.play?.('emp_blast', this._trueUltTargetX);

      this.heal(Math.round(this.maxHp * 0.12), 'NANO-CORE OVERCLOCK');

      this.fx?.spawn(
        'supernovaExplosion',
        this._safeFxX(this._trueUltTargetX, game),
        this._safeFxY(this.groundY - 96),
        {
          palette: CYBER_NEON_PALETTE,
          light: 1.18
        }
      );
      this.fx?.spawn('empOverloadDome', this._safeFxX(this._trueUltTargetX, game), this._safeFxY(this.groundY), {
        palette: CYBER_MAGENTA_PALETTE,
        warmup: 0.42,
        light: 1.16,
        extra: { radius: 56, fringe: '#22d3ee' }
      });
      this.spawnVfxAnim(3, this._trueUltTargetX, this.groundY - 96, 260, 260, 0.52, {
        foreground: true
      });
      this.spawnCyberHexBurst(this._trueUltTargetX, this.groundY - 56, 20, false);

      // Spawn 32 rising `hex`/`star4` neon singularity motes across the bombardment footprint
      for (let p = 0; p < 32; p++) {
        const px = this._trueUltTargetX + (Math.random() - 0.5) * 440;
        const py = this.groundY - 6 - Math.random() * 140;
        this.spawnCyberParticle(
          p % 2 === 0 ? 'hex' : 'star4',
          px,
          py,
          (Math.random() - 0.5) * 52,
          -180 - Math.random() * 190,
          0.62 + Math.random() * 0.28,
          p % 3 === 1,
          p % 3 === 0 ? 4 : 3
        );
      }

      for (const foe of targets) {
        if (!foe.isDead) {
          foe.takeDamage(740, this, true, 330, -270);
          this.fx?.spawn('rgbGlitchTear', this._safeFxX(foe.x, game), this._safeFxY(foe.groundY || this.groundY), {
            follow: foe,
            offsetX: 0,
            offsetY: 0,
            palette: CYBER_NEON_PALETTE,
            maxDuration: 0.52,
            light: 1.06
          });
        }
      }
    }

    // Rising pixel hex/star4 motes while the Orbital Singularity Buster Column roars!
    if (this._trueUltBusterTimer > 0) {
      this._busterMoteAccum += dt;
      if (this._busterMoteAccum >= 0.032) {
        this._busterMoteAccum = 0;
        const mx = this._trueUltTargetX + (Math.random() - 0.5) * 340;
        const my = this.groundY - 12 - Math.random() * 88;
        this.spawnCyberParticle(
          Math.random() < 0.5 ? 'hex' : 'star4',
          mx,
          my,
          (Math.random() - 0.5) * 32,
          -200 - Math.random() * 140,
          0.58,
          Math.random() < 0.5,
          3
        );
      }
    }

    if (t < 2.86) {
      const uFire = Math.min(1, Math.max(0, (t - 1.68) / 1.18));
      this.trueUltFrameOverride = 138 + Math.min(7, Math.floor(uFire * 8));
    } else {
      const uRec = Math.min(1, Math.max(0, (t - 2.86) / (this.trueUltDuration - 2.86)));
      this.trueUltFrameOverride = 146 + Math.min(3, Math.floor(uRec * 4));
    }
    this._overrideFrameIdx = this.trueUltFrameOverride;

    if (t >= this.trueUltDuration) {
      this.y = this.groundY;
      this.isInvulnerable = false;
      this.unstoppablePoise = false;
      this._trueUltStep = 0;
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      this.setState('IDLE');
    }
  }

  update(dt, enemy, game) {
    this.game = game || this.game;
    this._currentEnemy = enemy;
    if ((this.state === 'IDLE' || this.state === 'WALK') && !this._advPureDodge) {
      this._overrideFrameIdx = null;
      this.trueUltFrameOverride = null;
    }
    this.fx?.update(dt);
    if (this.crouchCooldown > 0) this.crouchCooldown = Math.max(0, this.crouchCooldown - dt);
    if (this.vaultCooldown > 0) this.vaultCooldown = Math.max(0, this.vaultCooldown - dt);

    if (this._comboPersistTimer > 0 && this.state !== 'AUTO_ATTACK') {
      this._comboPersistTimer = Math.max(0, this._comboPersistTimer - dt);
      if (this._comboPersistTimer <= 0) {
        this.comboStep = 0;
      }
    }

    if (this._trueUltBusterTimer > 0) {
      this._trueUltBusterTimer = Math.max(0, this._trueUltBusterTimer - dt);
    }

    if (Array.isArray(this.funnelDrones)) {
      for (let i = 0; i < this.funnelDrones.length; i++) {
        const d = this.funnelDrones[i];
        d.angle += dt * 2.7;
        d.x = this.x + Math.cos(d.angle) * 62;
        d.y = this.y - 126 + Math.sin(d.angle * 2) * 14;
      }
    }

    for (let i = this.funnelLaserBeams.length - 1; i >= 0; i--) {
      this.funnelLaserBeams[i].age += dt;
      if (this.funnelLaserBeams[i].age >= this.funnelLaserBeams[i].maxLife) {
        this.funnelLaserBeams.splice(i, 1);
      }
    }

    for (let i = this.hitStarbursts.length - 1; i >= 0; i--) {
      this.hitStarbursts[i].age += dt;
      if (this.hitStarbursts[i].age >= this.hitStarbursts[i].maxLife) {
        this.hitStarbursts.splice(i, 1);
      }
    }

    for (let i = this.cyberParticles.length - 1; i >= 0; i--) {
      const p = this.cyberParticles[i];
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.age >= p.maxLife) {
        this.cyberParticles.splice(i, 1);
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

    if (this.state === 'CROUCH' && !this.isDead && (this.stunTimer || 0) <= 0) {
      this.stateTimer += dt;
      this.updateCrouch(dt, enemy, game);
      return;
    }

    if (
      !this.isDead &&
      !this.isBenched &&
      !this.isPlayerControlled &&
      this.crouchCooldown <= 0 &&
      (this.state === 'IDLE' || this.state === 'WALK') &&
      game?.vfx?.projectiles
    ) {
      for (const p of game.vfx.projectiles) {
        if (p.owner === this || (this.team && p.owner?.team === this.team)) continue;
        const dx = p.x - this.x;
        if (Math.abs(dx) < 185 && dx * p.vx < 0 && Math.abs(p.y - (this.y - 96)) < 95) {
          this.facing = dx >= 0 ? 1 : -1;
          this.startCrouch(enemy, game);
          break;
        }
      }
    }

    super.update(dt, enemy, game);
  }

  /**
   * Renders any cell `(row, col)` from `android_ex_vfx.png` (`6240x1664`) with strict `<= 0.13` bloom
   * and crisp 4x4 Bayer stippled halos (ZERO radial glow blobs, ZERO canvas rotation, ZERO ellipse primitives!).
   */
  drawBloomedVfxCell(ctx, vfxSheet, row, col, x, y, w, h, alpha = 0.95, flipX = false, _renderer = null) {
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth || alpha <= 0.01) return;
    const clampedRow = Math.max(0, Math.min(7, Math.floor(row)));
    const clampedCol = Math.max(0, Math.min(29, Math.floor(col)));

    if (clampedRow !== 0 && clampedRow !== 1) {
      drawCyberBayerHalo(ctx, x, y, w * 0.34, h * 0.22, '#0891b2', '#ec4899', Math.min(0.12, alpha * 0.12));
    }

    if (this.game?.vfx?.drawBloomedSprite) {
      this.game.vfx.drawBloomedSprite(
        ctx,
        vfxSheet,
        clampedCol * 208,
        clampedRow * 208,
        208,
        208,
        Math.round(x),
        Math.round(y),
        Math.round(w),
        Math.round(h),
        { alpha: alpha * 0.96, bloomAlpha: Math.min(0.26, alpha * 0.22), bloomScale: 1.04, flipX }
      );
      return;
    }

    const sx = clampedCol * 208;
    const sy = clampedRow * 208;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(x), Math.round(y));
    if (flipX) ctx.scale(-1, 1);

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(1, alpha * 0.96);
    ctx.drawImage(
      vfxSheet,
      sx,
      sy,
      208,
      208,
      Math.round(-w * 0.5),
      Math.round(-h * 0.5),
      Math.round(w),
      Math.round(h)
    );

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(0.24, alpha * 0.20);
    ctx.drawImage(
      vfxSheet,
      sx,
      sy,
      208,
      208,
      Math.round(-w * 0.5),
      Math.round(-h * 0.5),
      Math.round(w),
      Math.round(h)
    );
    ctx.restore();
  }

  drawOrbitingFunnelPods(ctx, vfxSheet, inFront = false, alphaScale = 1.0) {
    if (this.isDead || !vfxSheet?.complete || !vfxSheet.naturalWidth || !Array.isArray(this.funnelDrones)) return;
    if (this.state === 'ULTIMATE' || (this.state === 'TRUE_ULTIMATE' && (this.stateTimer || 0) >= 0.48)) return;
    for (let i = 0; i < this.funnelDrones.length; i++) {
      const d = this.funnelDrones[i];
      const depth = Math.sin(d.angle);
      if (inFront ? depth < 0 : depth >= 0) continue;
      const col = Math.floor(((d.angle * 4.8 + i * 7) % 30 + 30) % 30);
      const podSize = inFront ? 84 : 74;
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        1,
        col,
        d.x,
        d.y,
        podSize,
        podSize,
        (inFront ? 0.92 : 0.78) * alphaScale,
        this.facing < 0
      );
    }
  }

  drawFunnelBeamsAndCyberParticles(ctx, vfxSheet) {
    // 1. 4-Funnel Diamond Lock-On Grid (`SINGULARITY FUNNEL OVERDRIVE` Skill)
    if (this.diamondFunnelGrid && vfxSheet?.complete && vfxSheet.naturalWidth) {
      const g = this.diamondFunnelGrid;
      const fade = Math.max(0, 1 - g.age / g.maxLife);
      const col = Math.floor(g.age * 30) % 30;
      const nodes = [
        [g.cx, g.cy - g.ry],
        [g.cx + g.rx, g.cy],
        [g.cx, g.cy + g.ry * 0.72],
        [g.cx - g.rx, g.cy]
      ];
      for (let i = 0; i < 4; i++) {
        const next = nodes[(i + 1) % 4];
        drawTwoPassCyberBeam(ctx, nodes[i][0], nodes[i][1], next[0], next[1], i % 2 === 0 ? '#22d3ee' : '#ec4899', '#ffffff', fade * 0.65, 3, 1);
        this.drawBloomedVfxCell(ctx, vfxSheet, 6, (col + i * 5) % 30, nodes[i][0], nodes[i][1], 96, 96, fade * 0.92, i === 1);
      }
    }

    // 2. Holo Target-Matrix Hex Reticle & 6 Orbital Fin-Funnel Nodes (`VALKYRIE HYPER-PRISM BARRAGE` Ultimate — 0 boxy fillRect brackets!)
    if (this.hudTargetMatrix) {
      const m = this.hudTargetMatrix;
      const fade = Math.max(0, 1 - m.age / m.maxLife);
      const mx = Math.round(m.x / 2) * 2;
      const my = Math.round(m.y / 2) * 2;
      if (vfxSheet?.complete && vfxSheet.naturalWidth) {
        const col = Math.floor(m.age * 28) % 30;
        this.drawBloomedVfxCell(ctx, vfxSheet, 3, col, mx, my, 212, 212, fade * 0.92, false);
        for (let i = 0; i < this.orbitalStrikeFunnels.length; i++) {
          const fn = this.orbitalStrikeFunnels[i];
          this.drawBloomedVfxCell(
            ctx,
            vfxSheet,
            6,
            (col + i * 4) % 30,
            mx + fn.ox,
            this.groundY + fn.oy,
            112,
            112,
            fade * 0.94,
            fn.ox > 0
          );
        }
      }
    }

    // 3. 2-Pass Crisp 2px Plasma Beams (`<= 0.14` bloom, zero chevrons!)
    for (let i = 0; i < this.funnelLaserBeams.length; i++) {
      const b = this.funnelLaserBeams[i];
      const u = Math.min(1, b.age / Math.max(0.04, b.maxLife));
      drawTwoPassCyberBeam(
        ctx,
        b.x0,
        b.y0,
        b.x1,
        b.y1,
        b.isMagenta ? '#ec4899' : '#22d3ee',
        '#ffffff',
        1 - u,
        b.outerSize || 4,
        b.coreSize || 2
      );
    }

    // 4. Asymmetric 4-frame Cyber-Prism Hit-Starbursts
    for (let i = 0; i < this.hitStarbursts.length; i++) {
      const hs = this.hitStarbursts[i];
      const u = Math.min(1, hs.age / Math.max(0.04, hs.maxLife));
      drawCyberHitStarburst(ctx, hs.x, hs.y, u, hs.isMagenta);
    }

    // 5. Rising Pixel Data-Hex Motes & Star-Glints
    if (this.cyberParticles.length > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      for (let i = 0; i < this.cyberParticles.length; i++) {
        const p = this.cyberParticles[i];
        const fade = Math.max(0, 1 - p.age / p.maxLife);
        if (fade <= 0.04) continue;
        const px = Math.round(p.x / 2) * 2;
        const py = Math.round(p.y / 2) * 2;
        const col = p.isMagenta ? '#ec4899' : '#22d3ee';
        ctx.globalAlpha = Math.min(0.94, fade);
        if (p.kind === 'star4') {
          const arm = p.size * 2;
          ctx.fillStyle = col;
          ctx.fillRect(px - arm, py, arm * 2 + 2, 2);
          ctx.fillRect(px, py - arm, 2, arm * 2 + 2);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(px, py, 2, 2);
        } else if (p.kind === 'hex') {
          // Hollow 6x6 pixel cyber-hexagon
          ctx.fillStyle = col;
          ctx.fillRect(px - 2, py - 4, 4, 2);
          ctx.fillRect(px - 2, py + 2, 4, 2);
          ctx.fillRect(px - 4, py - 2, 2, 4);
          ctx.fillRect(px + 2, py - 2, 2, 4);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(px - 1, py - 1, 2, 2);
        } else {
          // Rising vertical 2x6 data-bit mote
          ctx.fillStyle = col;
          ctx.fillRect(px, py - 4, 2, 6);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(px, py - 4, 2, 2);
        }
      }
      ctx.restore();
    }
  }

  drawBehind(ctx, renderer = null) {
    if (this.state !== 'TRUE_ULTIMATE' && this._trueUltBusterTimer <= 0) return;
    const vfxSheet = PixelForge.ensureImage(this.getExSprites()?.vfx);
    if (!vfxSheet?.complete || !vfxSheet.naturalWidth) return;

    const t = this.stateTimer || 0;
    const col = Math.floor(t * 30) % 30;
    const revCol = ((29 - (Math.floor(t * 36) % 30)) + 30) % 30;
    const fadeIn = Math.min(1, t / 0.18);
    const fadeOut =
      this.state === 'TRUE_ULTIMATE' && t > 2.90
        ? Math.max(0, 1 - (t - 2.90) / 0.65)
        : 1.0;
    const alpha = fadeIn * fadeOut * 0.95;
    if (alpha <= 0.02) return;

    // 1. Target Ground Hex-Matrix Lock Seal (`Row 5`)
    this.drawBloomedVfxCell(
      ctx,
      vfxSheet,
      5,
      col,
      this._trueUltTargetX,
      this.groundY - 6,
      320,
      230,
      alpha,
      false,
      renderer
    );

    // 2. Phase 2 Spec-Ops Charge Aura beneath VEX-09's boots + Rising Telemetry Scan-Bars
    if (this.state === 'TRUE_ULTIMATE' && t >= 0.48 && t < 1.68) {
      const uCharge = Math.min(1, (t - 0.48) / 1.20);
      drawCyberBayerHalo(ctx, this.x, this.groundY - 2, 74 + 58 * uCharge, 18 + 12 * uCharge, '#0891b2', '#ec4899', 0.14);
      drawCyberBayerHalo(ctx, this.x, this.groundY - 2, 52 + 40 * uCharge, 13 + 9 * uCharge, '#ec4899', '#22d3ee', 0.13);
      drawCyberBayerHalo(ctx, this.x, this.groundY - 2, 28 + 24 * uCharge, 8 + 6 * uCharge, '#22d3ee', '#ffffff', 0.12);

      // Rising pixel telemetry scan-bars flanking VEX-09 (`fillRect`)
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      for (let i = 0; i < 10; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const lane = (i >> 1);
        const rise = ((t * 2.1 + i * 0.23) % 1);
        const bx = Math.round((this.x + side * (40 + lane * 12)) / 2) * 2;
        const by = Math.round((this.groundY - 10 - rise * (146 + uCharge * 42)) / 2) * 2;
        const bh = 8 + (lane % 3) * 4;
        ctx.globalAlpha = (1 - rise) * (0.45 + 0.45 * uCharge);
        ctx.fillStyle = i % 3 === 0 ? '#ffffff' : (i % 2 === 0 ? '#22d3ee' : '#ec4899');
        ctx.fillRect(bx - 1, by - bh, 2, bh);
        ctx.fillRect(bx - 4, by - 2, 8, 2);
      }
      ctx.restore();
    }

    // 3. 5-Tier Stratified Upper-Atmosphere Orbital Relay Gate (`dy=-250..-510`, `w=220..440`)
    if (t >= 0.42 || this._trueUltBusterTimer > 0) {
      const gatePop = this.state === 'TRUE_ULTIMATE' ? Math.min(1, Math.max(0, (t - 0.42) / 0.24)) : 1.0;
      const tiers = [
        { dy: -250, w: 220, h: 88, row: 5, cIdx: col, flip: false },
        { dy: -315, w: 274, h: 102, row: 3, cIdx: revCol, flip: true },
        { dy: -380, w: 330, h: 116, row: 5, cIdx: (col + 7) % 30, flip: false },
        { dy: -445, w: 386, h: 130, row: 3, cIdx: (revCol + 11) % 30, flip: true },
        { dy: -510, w: 440, h: 146, row: 5, cIdx: (col + 15) % 30, flip: false }
      ];
      for (let k = 0; k < tiers.length; k++) {
        const tr = tiers[k];
        this.drawBloomedVfxCell(
          ctx,
          vfxSheet,
          tr.row,
          tr.cIdx,
          this._trueUltTargetX,
          this.groundY + tr.dy,
          tr.w * gatePop,
          tr.h * gatePop,
          alpha * (0.84 + k * 0.025),
          tr.flip,
          renderer
        );
      }

      // Vertical satellite lock-on guide threads (`fillRect` from sky gate to ground seal)
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      const guideOffsets = [-210, -148, -74, 0, 74, 148, 210];
      const cx = Math.round(this._trueUltTargetX / 2) * 2;
      const topY = Math.round(this.groundY - 520);
      const colH = Math.max(120, Math.round(512 * gatePop));
      for (let i = 0; i < guideOffsets.length; i++) {
        const gx = cx + guideOffsets[i];
        const pulse = 0.5 + 0.5 * Math.sin(t * 14 + i * 1.3);
        ctx.globalAlpha = alpha * (0.28 + 0.34 * pulse);
        ctx.fillStyle = i === 3 ? '#ffffff' : (i % 2 === 0 ? '#22d3ee' : '#ec4899');
        ctx.fillRect(gx - 1, topY, 2, colH);
      }
      ctx.restore();
    }
  }

  drawForegroundOverlay(ctx, renderer = null) {
    const sprites = this.getExSprites();
    const sheet = PixelForge.ensureImage(sprites?.sheet);
    const vfxSheet = PixelForge.ensureImage(sprites?.vfx);

    if (!this.isDead) {
      drawCyberBayerHalo(ctx, this.x, this.groundY - 2, 54, 14, '#0891b2', '#ec4899', 0.13);
    }

    this.drawBehind(ctx, renderer);
    this.drawOrbitingFunnelPods(ctx, vfxSheet, false, 1.0);

    if (this.afterimages.length > 0 && sheet?.complete && sheet.naturalWidth) {
      for (const img of this.afterimages) {
        const alpha = Math.max(0, (1 - img.age / img.maxLife) * 0.56);
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
          img.isMagenta ? '#ec4899' : '#22d3ee'
        );
        ctx.restore();
      }
    }

    if (this.activeVfxAnims.length > 0 && vfxSheet?.complete && vfxSheet.naturalWidth) {
      for (const v of this.activeVfxAnims) {
        if (v.foreground) continue;
        const u = Math.min(1, Math.max(0, v.age / v.maxLife));
        const span = Math.max(1, v.endFrame - v.startFrame + 1);
        const col = Math.min(29, v.startFrame + Math.floor(u * span));
        const fade = u < 0.1 ? u / 0.1 : u > 0.8 ? (1 - u) / 0.2 : 1.0;
        this.drawBloomedVfxCell(ctx, vfxSheet, v.row, col, v.x, v.y, v.w, v.h, fade * 0.92, v.flipX, renderer);
      }
    }

    const arenaCenterX = this._resolveShaderCenterX(renderer);
    if (this.fx && !this.isDead) {
      this.fx.renderLayer(ctx, 'back', arenaCenterX, this.groundY, 0.96);
    }
  }

  drawUltimateForeground(ctx, renderer = null) {
    const sprites = this.getExSprites();
    const vfxSheet = PixelForge.ensureImage(sprites?.vfx);

    if (this.activeVfxAnims.length > 0 && vfxSheet?.complete && vfxSheet.naturalWidth) {
      for (const v of this.activeVfxAnims) {
        if (!v.foreground) continue;
        const u = Math.min(1, Math.max(0, v.age / v.maxLife));
        const span = Math.max(1, v.endFrame - v.startFrame + 1);
        const col = Math.min(29, v.startFrame + Math.floor(u * span));
        const fade = u < 0.1 ? u / 0.1 : u > 0.8 ? (1 - u) / 0.2 : 1.0;
        this.drawBloomedVfxCell(ctx, vfxSheet, v.row, col, v.x, v.y, v.w, v.h, fade * 0.94, v.flipX, renderer);
      }
    }

    const arenaCenterX = this._resolveShaderCenterX(renderer);
    if (this.fx && !this.isDead) {
      this.fx.renderLayer(ctx, 'front', arenaCenterX, this.groundY, 0.98);
    }

    this.drawOrbitingFunnelPods(ctx, vfxSheet, true, 1.0);
    this.drawFunnelBeamsAndCyberParticles(ctx, vfxSheet);
  }

  _drawOrbitalRailColumn(ctx, vfxSheet, colFrame, centerX, colW, baseBotY, baseH, stepH, alpha) {
    const sx = (colFrame % 30) * 208;
    const halfW = Math.round(colW * 0.5);
    const rx = Math.round(centerX - halfW);
    const trunkBotY = baseBotY - baseH;
    const coreSliceY = 7 * 208 + 32;
    const coreSliceH = 144;
    const baseSliceH = 176;

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(1, alpha * 0.96);
    ctx.drawImage(vfxSheet, sx, coreSliceY, 208, baseSliceH, rx, trunkBotY, colW, baseH);
    for (let seg = 0; seg < 4; seg++) {
      const yTop = trunkBotY - (seg + 1) * stepH;
      ctx.drawImage(vfxSheet, sx, coreSliceY, 208, coreSliceH, rx, yTop, colW, stepH);
    }

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(0.13, alpha * 0.13);
    ctx.drawImage(vfxSheet, sx, coreSliceY, 208, baseSliceH, rx, trunkBotY, colW, baseH);
    for (let seg = 0; seg < 4; seg++) {
      const yTop = trunkBotY - (seg + 1) * stepH;
      ctx.drawImage(vfxSheet, sx, coreSliceY, 208, coreSliceH, rx, yTop, colW, stepH);
    }
  }

  draw(ctx, isReflection = false, renderer = null) {
    const sprites = this.getExSprites();
    if (!sprites) return;
    const vfxSheet = PixelForge.ensureImage(sprites.vfx);

    if (isReflection && !this.isDead && vfxSheet?.complete && vfxSheet.naturalWidth) {
      this.drawOrbitingFunnelPods(ctx, vfxSheet, false, 0.42);
      this.drawOrbitingFunnelPods(ctx, vfxSheet, true, 0.42);
      if (this.hudTargetMatrix) {
        const m = this.hudTargetMatrix;
        const fade = Math.max(0, 1 - m.age / m.maxLife);
        const col = Math.floor(m.age * 28) % 30;
        this.drawBloomedVfxCell(ctx, vfxSheet, 3, col, m.x, m.y, 184, 184, fade * 0.36, false, renderer);
      }
      if (this.state === 'TRUE_ULTIMATE' || this._trueUltBusterTimer > 0) {
        const t = this.stateTimer || 0;
        const col = Math.floor((t * 30) % 30);
        const cx = this._trueUltTargetX;
        this.drawBloomedVfxCell(ctx, vfxSheet, 5, col, cx, this.groundY - 6, 320, 230, 0.40, false, renderer);
        if (this.state === 'TRUE_ULTIMATE' && t >= 0.48 && t < 2.86) {
          const battery = this._getTrueUltVWingBattery(t);
          for (let i = 0; i < battery.length; i++) {
            const pod = battery[i];
            this.drawBloomedVfxCell(
              ctx,
              vfxSheet,
              pod.row,
              (col + i * 4) % 30,
              pod.x,
              pod.y,
              pod.size,
              pod.size,
              0.38,
              this.facing < 0,
              renderer
            );
          }
        }
        if (this._trueUltBusterTimer > 0) {
          this.drawBloomedVfxCell(ctx, vfxSheet, 3, col, cx, this.groundY - 12, 360, 120, 0.42, false, renderer);
          this.drawBloomedVfxCell(ctx, vfxSheet, 5, (col + 4) % 30, cx, this.groundY - 96, 380, 260, 0.44, false, renderer);
          this.drawBloomedVfxCell(ctx, vfxSheet, 7, (col + 6) % 30, cx - 148, this.groundY - 118, 184, 240, 0.36, false, renderer);
          this.drawBloomedVfxCell(ctx, vfxSheet, 7, (col + 12) % 30, cx + 148, this.groundY - 118, 184, 240, 0.36, true, renderer);
          this.drawBloomedVfxCell(ctx, vfxSheet, 7, col, cx, this.groundY - 150, 488, 340, 0.46, false, renderer);
        }
      }
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

    if (isReflection) return;
    if (!vfxSheet?.complete || !vfxSheet.naturalWidth) return;

    const t = this.stateTimer || 0;
    const baseCol = Math.floor(t * 30) % 30;
    const revCol = ((29 - (Math.floor(t * 36) % 30)) + 30) % 30;

    // 6 Flanking Fin-Funnel Drone Pods in synchronized V-wing battery during Phase 2 charge & Phase 3 fire!
    if (this.state === 'TRUE_ULTIMATE' && t >= 0.48 && t < 2.86) {
      const battery = this._getTrueUltVWingBattery(t);
      const isCharging = t < 1.68;
      const aimX = this._trueUltTargetX;
      const aimY = this.groundY - 98;
      const visorX = this.x + this.facing * 20;
      const visorY = this.groundY - 122;

      if (isCharging) {
        const uCharge = Math.min(1, (t - 0.48) / 1.20);
        // Thin 2px pixel laser sightlines converging from all 6 V-Wing Fin-Funnels & visor onto target!
        for (let i = 0; i < battery.length; i++) {
          const pod = battery[i];
          drawTwoPassCyberBeam(
            ctx,
            pod.x,
            pod.y,
            aimX + (i - 2.5) * 14,
            aimY + ((i % 3) - 1) * 18,
            pod.isMagenta ? '#ec4899' : '#22d3ee',
            '#ffffff',
            0.38 + 0.42 * uCharge,
            2,
            1
          );
        }
        drawTwoPassCyberBeam(
          ctx,
          visorX,
          visorY,
          aimX,
          aimY,
          '#22d3ee',
          '#ffffff',
          0.48 + 0.46 * uCharge,
          2,
          1
        );

        // Growing Row 5 Cyber Singularity Reactor Sphere (92->228) + Counter-Stepping Row 3 Hex Reticle (108->244)
        const chargeX = this.x + this.facing * 26;
        const chargeY = this.groundY - 114;
        const sphereSize = Math.round(92 + (228 - 92) * uCharge);
        const reticleSize = Math.round(108 + (244 - 108) * uCharge);
        this.drawBloomedVfxCell(
          ctx,
          vfxSheet,
          5,
          baseCol,
          chargeX,
          chargeY,
          sphereSize,
          sphereSize,
          0.74 + 0.22 * uCharge,
          false,
          renderer
        );
        this.drawBloomedVfxCell(
          ctx,
          vfxSheet,
          3,
          revCol,
          chargeX,
          chargeY,
          reticleSize,
          reticleSize,
          0.72 + 0.22 * uCharge,
          true,
          renderer
        );

        // Crisp pixel visor HUD cross-glint (`fillRect`)
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        const vx = Math.round(visorX / 2) * 2;
        const vy = Math.round(visorY / 2) * 2;
        const arm = Math.round(10 + 18 * uCharge);
        ctx.globalAlpha = 0.72 + 0.24 * uCharge;
        ctx.fillStyle = (Math.floor(t * 16) % 2 === 0) ? '#22d3ee' : '#ec4899';
        ctx.fillRect(vx - arm, vy - 1, arm * 2, 2);
        ctx.fillRect(vx - 1, vy - Math.round(arm * 0.65), 2, Math.round(arm * 1.3));
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(vx - 3, vy - 3, 6, 6);
        ctx.restore();
      }

      for (let i = 0; i < battery.length; i++) {
        const pod = battery[i];
        this.drawBloomedVfxCell(
          ctx,
          vfxSheet,
          pod.row,
          (baseCol + i * 4) % 30,
          pod.x,
          pod.y,
          pod.size,
          pod.size,
          0.95,
          this.facing < 0,
          renderer
        );
      }
    }

    // Supreme Ultimate Phase 2 (`0.48..1.68s`): 8-Drone Octagonal Containment Cage on `_trueUltTargetX`
    if (this.state === 'TRUE_ULTIMATE' && t >= 0.48 && t < 1.68) {
      const cx = this._trueUltTargetX;
      const cy = this.groundY - 110;
      const ringProgress = Math.min(1, (t - 0.48) / 0.22);

      const cagePts = [];
      for (let i = 0; i < 8; i++) {
        const ang = i * (Math.PI * 0.25) + t * 2.8;
        cagePts.push([
          cx + Math.cos(ang) * (172 * ringProgress),
          cy + Math.sin(ang) * (116 * ringProgress)
        ]);
      }

      for (let i = 0; i < 8; i++) {
        const [dx, dy] = cagePts[i];
        const [nx, ny] = cagePts[(i + 1) % 8];
        drawTwoPassCyberBeam(ctx, dx, dy, nx, ny, i % 2 === 0 ? '#22d3ee' : '#ec4899', '#ffffff', 0.58 * ringProgress, 3, 1);
        drawTwoPassCyberBeam(ctx, dx, dy, cx, cy, i % 2 === 0 ? '#22d3ee' : '#ec4899', '#ffffff', 0.36 * ringProgress, 3, 1);
      }

      for (let i = 0; i < 8; i++) {
        const [dx, dy] = cagePts[i];
        this.drawBloomedVfxCell(
          ctx,
          vfxSheet,
          6,
          (baseCol + i * 3) % 30,
          dx,
          dy,
          138,
          138,
          0.94 * ringProgress,
          dx < cx,
          renderer
        );
      }
    }

    // Supreme Ultimate Phase 3 (`_trueUltBusterTimer > 0`): Colossal 488px Center + Twin 184px Aux Rail Columns + Dome + Glitch Tears!
    if (this._trueUltBusterTimer > 0) {
      const busterProg = 1.0 - Math.max(0, Math.min(1, this._trueUltBusterTimer / 1.18));
      const col = Math.min(29, Math.floor(busterProg * 30));
      const alpha = this._trueUltBusterTimer < 0.28 ? this._trueUltBusterTimer / 0.28 : 0.98;
      const cx = Math.round(this._trueUltTargetX);
      const baseBotY = Math.round(this.groundY + 26);

      drawCyberBayerHalo(ctx, cx, this.groundY - 2, 260, 44, '#0891b2', '#ec4899', alpha * 0.14);

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      // TWO flanking 184px-wide Auxiliary Row 7 Satellite Rail Columns (`cx +- 148`)
      this._drawOrbitalRailColumn(ctx, vfxSheet, col + 6, cx - 148, 184, baseBotY - 6, 176, 168, alpha * 0.86);
      this._drawOrbitalRailColumn(ctx, vfxSheet, col + 12, cx + 148, 184, baseBotY - 6, 176, 168, alpha * 0.86);
      // Colossal 488px-wide Center Row 7 Orbital Singularity Buster Column
      this._drawOrbitalRailColumn(ctx, vfxSheet, col, cx, 488, baseBotY, 240, 196, alpha);

      // Stepped pixel plasma shockwave curtains + vertical RGB pixel glitch-tear columns (`fillRect`)
      const curtainSpread = Math.round(90 + busterProg * 280);
      for (let s = 0; s < 6; s++) {
        const off = Math.round(curtainSpread * ((s + 1) / 6));
        const hBar = Math.max(6, Math.round(28 - s * 3));
        const colWave = s % 2 === 0 ? '#22d3ee' : '#ec4899';
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = Math.max(0.18, (1 - busterProg * 0.65) * 0.72 * alpha);
        ctx.fillStyle = colWave;
        ctx.fillRect(cx - off - 12, Math.round(this.groundY - hBar), 18, hBar);
        ctx.fillRect(cx + off - 6, Math.round(this.groundY - hBar), 18, hBar);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - off - 8, Math.round(this.groundY - hBar * 0.5), 10, 4);
        ctx.fillRect(cx + off - 2, Math.round(this.groundY - hBar * 0.5), 10, 4);
      }

      const rgbCols = ['#22d3ee', '#ec4899', '#a85cf6', '#ffffff'];
      for (let g = 0; g < 12; g++) {
        const gx = cx + Math.round(((g - 5.5) * 44) + Math.sin(busterProg * 24 + g * 1.9) * 14);
        const gh = 68 + ((g * 37) % 160);
        const gy = Math.round(this.groundY - gh - ((g * 53 + col * 19) % 240));
        ctx.globalAlpha = alpha * (0.42 + 0.35 * ((col + g) % 2));
        ctx.fillStyle = rgbCols[g % rgbCols.length];
        ctx.fillRect(gx, gy, g % 3 === 0 ? 6 : 4, gh);
      }
      ctx.restore();

      // Blazing Row 3 Ground Shock-Seal (360x120) + Row 5 Reactor Impact Dome (380x260)
      this.drawBloomedVfxCell(ctx, vfxSheet, 3, revCol, cx, this.groundY - 12, 360, 120, alpha * 0.94, false, renderer);
      this.drawBloomedVfxCell(ctx, vfxSheet, 5, (col + 4) % 30, cx, this.groundY - 96, 380, 260, alpha * 0.96, false, renderer);
    }
  }
}
