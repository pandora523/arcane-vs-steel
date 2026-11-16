import { Fighter } from './Fighter.js?v=30fps115';
import { PixelForge } from '../engine/PixelForge.js?v=30fps115';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps115';
import { STORM_EFFECT_REGISTRY } from '../engine/shaders/stormShaders.js?v=30fps115';

const wrapStormPaddedPen = (pen) =>
  new Proxy(pen, {
    get(target, prop) {
      if (prop === 'shadeBox') {
        return (x0, y0, x1, y1, fn) => target.shadeBox(x0 - 4, y0 - 4, x1 + 4, y1 + 4, fn);
      }
      const val = target[prop];
      return typeof val === 'function' ? val.bind(target) : val;
    }
  });

const STORM_EX_EFFECT_REGISTRY = Object.fromEntries(
  Object.entries(STORM_EFFECT_REGISTRY).map(([key, spec]) => [
    key,
    {
      ...spec,
      create(cfg) {
        const inst = spec.create(cfg);
        return {
          ...inst,
          renderBack: inst.renderBack
            ? (pen, ...args) => inst.renderBack.call(inst, wrapStormPaddedPen(pen), ...args)
            : undefined,
          renderFront: inst.renderFront
            ? (pen, ...args) => inst.renderFront.call(inst, wrapStormPaddedPen(pen), ...args)
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
  [60, 8], // Beat 1 (V0, 0.34s): Coiled Nukitsuke Draw-Slash -> snaps at F03 (63)
  [68, 7], // Beat 2 (V1, 0.32s): Reverse Rising Kiri-age Heaven-Arc -> snaps at F09 (69)
  [75, 8], // Beat 3 (V2, 0.36s): 2.5D Shunpo Horizontal Vortex (2-hit) -> snaps at F17/F18 (77/78)
  [83, 7]  // Beat 4 (V3, 0.48s): Grounded Two-Handed Morote Zantetsuken (3-hit + ronin_slash wave) -> snaps at F25 (85)
];

const BEAT_DURATIONS = [0.34, 0.32, 0.36, 0.48];
const INTRA_COMBO_LINK = 0.015;

/**
 * Crisp 4x4 Bayer-stippled pixel halo (alpha <= 0.18, zero blurry radial gradient blobs, zero ellipse primitives!).
 */
function drawStormBayerHalo(ctx, cx, cy, rx, ry, outerHex, coreHex, alpha = 0.15) {
  if (alpha <= 0.01 || rx < 4 || ry < 3) return;
  const step = 4;
  const x0 = Math.floor((cx - rx) / step) * step;
  const x1 = Math.ceil((cx + rx) / step) * step;
  const y0 = Math.floor((cy - ry) / step) * step;
  const y1 = Math.ceil((cy + ry) / step) * step;

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = Math.min(0.18, alpha);
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
      if (falloff * 0.92 > thresh) {
        ctx.fillStyle = d2 < 0.32 ? coreHex : outerHex;
        ctx.fillRect(px, py, step, step);
      }
    }
  }
  ctx.restore();
}

/**
 * Ultra-crisp 2-pass pixel-stepped hairline (Pass 1 all 3px outer glow -> Pass 2 all 1-2px #ffffff core).
 * Guarantees ZERO overlapping `>>>>>>>` chevron stripes or fat 24px caterpillars!
 */
function drawTwoPassStormHairline(ctx, x0, y0, x1, y1, outerHex, coreHex = '#ffffff', alpha = 0.92, coreSize = 2) {
  if (alpha <= 0.02) return;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.max(Math.abs(dx), Math.abs(dy));
  if (dist < 2) return;
  const steps = Math.max(2, Math.ceil(dist / 2));

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';

  // Pass 1: Entire outer 3px electric aura line
  ctx.globalAlpha = Math.min(0.76, alpha * 0.74);
  ctx.fillStyle = outerHex;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const px = Math.round((x0 + dx * u) / 2) * 2;
    const py = Math.round((y0 + dy * u) / 2) * 2;
    ctx.fillRect(px - 1, py - 1, 3, 3);
  }

  // Pass 2: Entire inner 1px-2px white-hot katana/lightning core on top
  ctx.globalAlpha = Math.min(0.98, alpha);
  ctx.fillStyle = coreHex;
  const cSz = coreSize >= 2 ? 2 : 1;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const px = Math.round((x0 + dx * u) / 2) * 2;
    const py = Math.round((y0 + dy * u) / 2) * 2;
    ctx.fillRect(px, py, cSz, cSz);
  }

  ctx.restore();
}

/**
 * Multi-segment stepped pixel lightning bolt rendered in 2 full passes (0 chevrons, 0 canvas rotation).
 */
function drawSteppedPixelBolt(ctx, x0, y0, x1, y1, segs, jagAmp, outerHex, midHex, seed, alpha = 0.94) {
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

  // Pass 1: All segments outer electric sheath
  for (let s = 0; s < pts.length - 1; s++) {
    const [ax, ay] = pts[s];
    const [bx, by] = pts[s + 1];
    const d = Math.max(2, Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay)) / 2));
    ctx.fillStyle = outerHex;
    ctx.globalAlpha = Math.min(0.68, alpha * 0.65);
    for (let k = 0; k <= d; k++) {
      const u = k / d;
      const px = Math.round((ax + (bx - ax) * u) / 2) * 2;
      const py = Math.round((ay + (by - ay) * u) / 2) * 2;
      ctx.fillRect(px - 2, py - 2, 4, 4);
    }
  }
  // Pass 2: All segments mid & white core
  for (let s = 0; s < pts.length - 1; s++) {
    const [ax, ay] = pts[s];
    const [bx, by] = pts[s + 1];
    const d = Math.max(2, Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay)) / 2));
    for (let k = 0; k <= d; k++) {
      const u = k / d;
      const px = Math.round((ax + (bx - ax) * u) / 2) * 2;
      const py = Math.round((ay + (by - ay) * u) / 2) * 2;
      ctx.fillStyle = midHex;
      ctx.globalAlpha = Math.min(0.88, alpha * 0.85);
      ctx.fillRect(px - 1, py - 1, 3, 3);
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = Math.min(0.98, alpha);
      ctx.fillRect(px, py, 2, 2);
    }
  }
}

/**
 * Crisp asymmetric 4-frame anime pixel hit-starburst (zero chevron bars!).
 */
function drawStormHitStarburst(ctx, cx, cy, u, primaryHex = '#38bdf8', accentHex = '#fde047') {
  const fade = 1 - u;
  if (fade <= 0.04) return;
  const snap = (v) => Math.round(v / 2) * 2;
  const sx = snap(cx);
  const sy = snap(cy);
  const longArm = Math.round((26 - u * 10) * (u < 0.18 ? u / 0.18 : 1));
  const shortArm = Math.round(longArm * 0.58);

  drawTwoPassStormHairline(ctx, sx - longArm, sy - Math.round(longArm * 0.25), sx + longArm, sy + Math.round(longArm * 0.25), primaryHex, '#ffffff', fade, 2);
  drawTwoPassStormHairline(ctx, sx + Math.round(shortArm * 0.25), sy - shortArm, sx - Math.round(shortArm * 0.25), sy + shortArm, accentHex, '#ffffff', fade * 0.92, 2);

  ctx.save();
  ctx.globalAlpha = Math.min(0.96, fade);
  ctx.fillStyle = accentHex;
  ctx.fillRect(sx - 4, sy - 2, 8, 4);
  ctx.fillRect(sx - 2, sy - 4, 4, 8);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(sx - 2, sy - 2, 4, 4);
  ctx.restore();
}

/**
 * KAZE-MARU EX (`ronin_ex`) - Newly-Born Raijin Storm-Blade Iaido Sovereign.
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
      trueUltName: 'AMAKAKERU: REALM-SLICING SHOGUNATE',
      trueUltDuration: 3.70
    });

    this.heroId = 'ronin_ex';
    this.secondaryColor = '#fde047';
    this.deathSfx = 'death_ronin';
    this.skillName = 'NARUKAMI THUNDER-GATE FLASH';
    this.ultName = 'TAKEMIKAZUCHI STORM-GOD CAGE';
    this.ultSub = 'EIGHT-DRUM RAIJIN BLITZ';
    this.hasTrueUltimate = true;
    this.trueUltName = 'AMAKAKERU: REALM-SLICING SHOGUNATE';
    this.trueUltSub = 'CRIMSON-MOON TORII IAIDO';
    this.trueUltDuration = 3.70;
    this.theme = 'storm';
    this.hasPoise = false;

    this.skillTriggerRange = 445;
    this.skillMaxCooldown = 4.70;
    this.dodgeMaxCooldown = 3.40;
    this.dashMaxCooldown = 3.30;
    this.autoDuration = BEAT_DURATIONS[0];
    this._postFlurryInterval = 1.48;
    this.skillDuration = 0.94;
    this.ultDuration = 1.84;
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

    // Newly-Born Iaido Hairlines, Torii Pillars, Storm-God Cage & Pixel Particles
    this.afterimages = [];
    this.afterimageSpawnAccum = 0;
    this.activeSlashLines = [];
    this.delayedJudgmentCuts = [];
    this.iaidoCounterActive = false;
    this.activeVfxAnims = [];
    this.cleanBladeCuts = [];
    this.exParticles = [];
    this.toriiPillars = [];
    this._taikoHaloTimer = 0;
    this._taikoLitCount = 0;
    this._ultTargetX = 600;
    this._ultPetalAccum = 0;
    this.stormGodMask = null;

    // Supreme Ultimate (`AMAKAKERU: REALM-SLICING SHOGUNATE`) state
    this._trueUltInit = false;
    this._trueUltStep = 0;
    this._trueUltCutsDone = 0;
    this._trueUltTargetX = 600;
    this._trueUltDashDir = 1;
    this._trueUltStartX = 300;
    this._trueUltBackX = 750;
    this.crimsonMoonSanctuary = null;
    this.suspendedSanctuaryDrops = [];
    this.horizonFaultLine = null;
    this.trueUltLightningSurge = null;

    this.fx = new ArcaneShaderFX(STORM_EX_EFFECT_REGISTRY, {
      pixelScale: 3,
      viewW: 640,
      viewH: 460,
      topRatio: 0.70
    });

    if (typeof Image !== 'undefined') {
      PixelForge.ensureHeroLoaded?.('ronin_ex');
      const roninExAssets = PixelForge.initAssets?.()?.ronin_ex;
      if (roninExAssets?.vfx?.src && roninExAssets.vfx.src.includes('v=30fps114')) {
        roninExAssets.vfx.src = 'assets/sprites/ronin_ex_vfx.png?v=30fps115';
      }
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

  _safeFxX(xv, game) {
    const g = game || this.game;
    const ww = g?.renderer ? g.renderer.worldWidth : 1200;
    const center = ww * 0.5;
    return Math.max(center - 740, Math.min(center + 740, Math.max(84, Math.min(ww - 84, xv))));
  }

  _safeFxY(yv) {
    return Math.max(58, Math.min(this.groundY + 20, yv));
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

  spawnStormParticle(kind, x, y, vx, vy, maxLife, color, accent = '#ffffff', size = 3) {
    if (this.exParticles.length >= 96) this.exParticles.shift();
    this.exParticles.push({
      kind, // 'sakura' | 'star4' | 'mote' | 'rain'
      x,
      y,
      vx,
      vy,
      age: 0,
      maxLife,
      color,
      accent,
      size,
      phase: Math.floor(Math.random() * 16)
    });
  }

  spawnSakuraBurst(cx, cy, count = 8, electrified = true) {
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + (i % 2) * 0.25;
      const spd = 48 + (i % 4) * 32;
      this.spawnStormParticle(
        i % 3 === 0 ? 'star4' : 'sakura',
        cx + Math.cos(ang) * 8,
        cy + Math.sin(ang) * 6,
        Math.cos(ang) * spd,
        Math.sin(ang) * spd - 24,
        0.42 + (i % 3) * 0.12,
        electrified ? (i % 2 === 0 ? '#f472b6' : '#38bdf8') : '#fb7185',
        electrified ? '#fde047' : '#fbcfe8',
        i % 3 === 0 ? 4 : 3
      );
    }
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
      this.stormGodMask = null;
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
      this._taikoHaloTimer = 0.94;
      this._taikoLitCount = 5;
      this.toriiPillars = [];
    }

    if (newState === 'ULTIMATE') {
      this._omniStep = 0;
      this._ultOriginX = this.x;
      this._ultOriginY = this.y;
      this._ultPetalAccum = 0;
    }

    if (newState === 'TRUE_ULTIMATE') {
      this._trueUltInit = false;
      this._trueUltStep = 0;
      this._trueUltCutsDone = 0;
      this._trueUltDashDir = this.facing || 1;
      this._trueUltStartX = this.x;
      this._trueUltBackX = this.x;
      this.crimsonMoonSanctuary = null;
      this.suspendedSanctuaryDrops = [];
      this.horizonFaultLine = null;
      this.trueUltLightningSurge = null;
      this.trueUltFrameOverride = 214;
      this._overrideFrameIdx = 214;
    } else {
      this._trueUltInit = false;
      this.crimsonMoonSanctuary = null;
      this.suspendedSanctuaryDrops = [];
      this.horizonFaultLine = null;
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
      this._autoVariant = (((this.comboStep || 0) % 4) + 4) % 4;
      this._beginComboBeat(this._autoVariant, this.game);
    }

    if (newState === 'DEATH') {
      this.fx?.clear();
      this.cleanBladeCuts = [];
      this.activeSlashLines = [];
      this.toriiPillars = [];
      this.stormGodMask = null;
      this.crimsonMoonSanctuary = null;
      this.suspendedSanctuaryDrops = [];
      this.horizonFaultLine = null;
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
      x0: this.x + this.facing * 26,
      y0: cutCenterY - cutSlope * 36,
      x1: this.x + this.facing * 144,
      y1: cutCenterY + cutSlope * 36,
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
        type: 'starburst',
        x: hitX,
        y: hitY,
        isCrit,
        age: 0,
        maxLife: 0.18
      });
      this.spawnSakuraBurst(hitX, hitY, isCrit ? 6 : 4, true);
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

    if ((p.type === 'ronin_slash' || p.type === 'storm_wave') && (p.ringTimer || 0) >= 0.05) {
      p.ringTimer = 0;
      const dir = Math.sign(p.vx || this.facing || 1);
      this.spawnStormParticle(
        'sakura',
        p.x - dir * 16,
        p.y + (((Math.round(p.travelDist || 0) >> 3) % 3) - 1) * 14,
        -dir * 38,
        14,
        0.24,
        '#38bdf8',
        '#fde047',
        3
      );
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
    const hx = hitTarget ? hitTarget.x : p.x;
    const hy = hitTarget ? (hitTarget.y || this.groundY) - 82 : p.y;
    this.cleanBladeCuts.push({
      type: 'starburst',
      x: hx,
      y: hy,
      isCrit: Boolean(isCrit || p.isTwinSlash),
      age: 0,
      maxLife: 0.20
    });
    if (game?.audio) {
      game.audio.play(isCrit ? 'hit_crit' : 'slash', hx);
    }
    this.spawnSakuraBurst(hx, hy, isCrit ? 7 : 5, true);
    return true;
  }

  spawnSayaGlint(isSheath = false) {
    const gx = this.x - this.facing * 14;
    const gy = this.y - 68;
    this.spawnStormParticle('star4', gx, gy, 0, -8, isSheath ? 0.30 : 0.22, '#38bdf8', '#fde047', isSheath ? 6 : 4);
    if (this.fx) {
      this.fx.spawn('iaidoSayaGlint', this._safeFxX(gx), this._safeFxY(gy), {
        flip: this.facing < 0,
        light: isSheath ? 1.32 : 1.18,
        extra: { isSheath }
      });
    }
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
    if (this.activeVfxAnims.length >= 26) this.activeVfxAnims.shift();
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
    this.fx.spawn('raijinTaikoShockwave', this._safeFxX(x), this._safeFxY(y), {
      flip: false,
      light: colorType === 'gold' ? 1.28 : 1.16,
      maxDuration: maxLife,
      extra: { maxRWorld: Math.min(180, maxR), colorType, isGround }
    });
  }

  spawnPixelLightningBolt(x, topY, botY, colorType = 'cyan', maxLife = 0.34) {
    if (this.fx) {
      this.fx.spawn('raijinSkyThunderbolt', this._safeFxX(x), this._safeFxY(botY), {
        flip: false,
        light: colorType === 'gold' ? 1.32 : 1.20,
        maxDuration: maxLife,
        extra: { spanWorldY: Math.min(240, Math.max(90, botY - topY)), colorType }
      });
    }
    this.spawnSakuraBurst(x, botY - 12, 4, true);
  }

  /**
   * Registers an ultra-thin 2-pass electric hairline thread (`0` chevron stripes!).
   */
  addSlashLine(x1, y1, x2, y2, maxLife = 0.62, detonated = false, colorHex = '#38bdf8') {
    if (this.activeSlashLines.length >= 24) this.activeSlashLines.shift();
    this.activeSlashLines.push({
      x1,
      y1,
      x2,
      y2,
      age: 0,
      maxLife,
      detonated,
      colorHex
    });
  }

  syncSpearMachCone() {
    if (!this.fx) return;
    const isSkillDive = this.state === 'SKILL' && this.stateTimer >= 0.16 && this.stateTimer < 0.56;
    const isUltDive = this.state === 'ULTIMATE' && this.stateTimer >= 0.26 && this.stateTimer < 1.30;
    const isTrueUltBlitz =
      this.state === 'TRUE_ULTIMATE' && this.stateTimer >= 0.92 && this.stateTimer < 1.28;
    if (isSkillDive || isUltDive || isTrueUltBlitz) {
      const isHeavenSplit = this.state === 'ULTIMATE' && this.stateTimer >= 1.06;
      let slot = this.fx.active.find((s) => s.key === 'shunpoSpearMachCone');
      if (!slot) {
        slot = this.fx.spawn('shunpoSpearMachCone', this._safeFxX(this.x), this._safeFxY(this.y - 72), {
          follow: this,
          offsetX: 0,
          offsetY: -72,
          flip: this.facing < 0,
          light: isHeavenSplit ? 1.32 : 1.18,
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

    this.addSlashLine(attacker.x - 62, attacker.y - 138, attacker.x + 62, attacker.y - 22, 0.38, true, '#38bdf8');
    this.addSlashLine(attacker.x - 62, attacker.y - 22, attacker.x + 62, attacker.y - 138, 0.38, true, '#fde047');
    this.spawnVfxAnim(1, attacker.x, attacker.groundY - 88, 212, 212, 0.42, { glowColor: 'cyan' });
    this.spawnVfxAnim(3, attacker.x, attacker.groundY - 12, 212, 212, 0.38, { glowColor: 'cyan', inFront: false });
    this.spawnPixelLightningBolt(attacker.x, attacker.groundY - 240, attacker.groundY, 'cyan', 0.32);

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
    if (this._taikoHaloTimer > 0) {
      this._taikoHaloTimer = Math.max(0, this._taikoHaloTimer - dt);
    }
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

    for (let i = this.toriiPillars.length - 1; i >= 0; i--) {
      this.toriiPillars[i].age += dt;
      if (this.toriiPillars[i].age >= this.toriiPillars[i].maxLife) {
        this.toriiPillars.splice(i, 1);
      }
    }

    for (let i = this.exParticles.length - 1; i >= 0; i--) {
      const p = this.exParticles[i];
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === 'sakura') {
        p.vx += Math.sin(p.age * 9 + p.phase) * 28 * dt;
        p.vy += 26 * dt;
      }
      if (p.age >= p.maxLife) {
        this.exParticles.splice(i, 1);
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

    if (this.horizonFaultLine) {
      this.horizonFaultLine.age += dt;
      if (this.horizonFaultLine.age >= this.horizonFaultLine.maxLife) {
        this.horizonFaultLine = null;
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
        this.spawnStormParticle('star4', this.x - this.facing * 14, this.groundY - 4, -this.facing * 24, -18, 0.22, '#38bdf8', '#fde047', 3);
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
    this.fx?.spawn('sereneMindParryWard', this._safeFxX(this.x, game), this._safeFxY(this.groundY - 4), {
      follow: this,
      useGroundY: true,
      offsetX: 0,
      offsetY: -4,
      flip: false,
      light: 1.18
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

    if (t >= 0.38 && !this.didActionFrame) {
      this.didActionFrame = true;
      this.iaidoCounterActive = false;
      this.isDeflecting = false;
      this.fx?.stopByKey('sereneMindParryWard');
      const oldX = this.x;
      this.spawnAfterimage(oldX, this.y, this.facing, 7, 14, 0.28);
      this.x = this._clampArenaX(this.x + this.facing * 165, game, 85);
      this.spawnSayaGlint(false);
      this.addSlashLine(oldX, this.y - 68, this.x, this.y - 68, 0.30, false, '#38bdf8');
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
        this.addSlashLine(this.x - 45, this.y - 110, this.x + this.facing * 75, this.y - 20, 0.26, false, '#38bdf8');
        this.spawnVfxAnim(0, this.x + this.facing * 28, this.y - 68, 192, 192, 0.26, {
          vx: this.facing * 210,
          flipX: this.facing < 0,
          glowColor: 'cyan'
        });
        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 155) {
          enemy.takeDamage(34, this, false, 45, -130);
        }
      }

      if (u >= 0.58 && !this.didSecondaryAction) {
        this.didSecondaryAction = true;
        if (game?.audio) game.audio.play('slash', this.x);
        this.addSlashLine(this.x - 45, this.y - 20, this.x + this.facing * 75, this.y - 110, 0.26, false, '#818cf8');
        this.spawnVfxAnim(0, this.x + this.facing * 32, this.y - 64, 196, 196, 0.28, {
          vx: this.facing * 230,
          flipX: this.facing < 0,
          glowColor: 'purple'
        });
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
   * 4-Beat 100% Grounded (`0px` float!) Next-Gen Battojutsu Combo (`[[60,8],[68,7],[75,8],[83,7]]`).
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
      if ((this._beatHitMask & 1) === 0 && t >= 0.14) {
        this._beatHitMask |= 1;
        const cleaveX = this.x + this.facing * 78;
        this.spawnSayaGlint(true);
        game?.renderer?.triggerShake?.(11, 0.22);
        this.spawnPixelShockwave(cleaveX, this.groundY - 6, 112, 'gold', 0.26, true);
        this.spawnPixelLightningBolt(cleaveX, this.groundY - 230, this.groundY, 'gold', 0.28);
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

  /**
   * NEWLY BORN SKILL (`0.94s`, `4.70s` CD): `NARUKAMI THUNDER-GATE FLASH`
   * Ignites all 5 Raijin Taiko drums, executes a 5-point lightning Shunpo zig-zag leaving
   * ultra-thin 2px 2-pass electric hairlines + pixel Torii thunder-pillars that detonate
   * simultaneously on the Saya sheath-click!
   */
  updateSkill(dt, enemy, game) {
    const t = this.stateTimer;
    if (!this._zantetsuStep) this._zantetsuStep = 0;
    this.isInvulnerable = t < 0.70;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const clampX = (xVal) => this._clampArenaX(xVal, game, 85);
    const originX = this._skillOriginX !== undefined ? this._skillOriginX : this.x;
    const center =
      enemy && !enemy.isDead
        ? enemy.x
        : Math.max(220, Math.min(ww - 220, originX + this.facing * 165));
    const dir = center >= originX ? 1 : -1;

    // Phase 0 (0.00..0.15s): Ignite all 5 Raijin Taiko Drums + Torii Floor Seal
    if (t < 0.15) {
      this.vx = 0;
      this.vy = 0;
      this.y = this.groundY;
      this.divePitchRad = 0;
      if (this._zantetsuStep === 0) {
        this._zantetsuStep = 1;
        this._skillOriginX = this.x;
        this._skillOriginY = this.groundY;
        this._taikoHaloTimer = 0.94;
        this._taikoLitCount = 5;
        this.spawnSayaGlint(false);
        this.spawnVfxAnim(3, this.x, this.groundY - 12, 184, 184, 0.30, {
          glowColor: 'cyan',
          inFront: false
        });
        this.spawnSakuraBurst(this.x, this.groundY - 82, 6, true);
        if (game?.audio) game.audio.play('clang', this.x);
      }
      return;
    }

    // Phase 1 (0.15..0.55s): 5-Point Lightning Shunpo Zig-Zag + Ultra-Thin 2px 2-Pass Hairlines + Torii Pillars
    const zigWaypoints = [
      { x: originX, y: this.groundY },
      { x: clampX(center + dir * 124), y: this.groundY - 96 },
      { x: clampX(center - dir * 122), y: this.groundY - 32 },
      { x: clampX(center + dir * 116), y: this.groundY - 118 },
      { x: clampX(center - dir * 114), y: this.groundY - 64 },
      { x: clampX(center + dir * 104), y: this.groundY }
    ];

    if (t >= 0.15 && t < 0.55) {
      const segDur = 0.40 / 5;
      const passIdx = Math.min(4, Math.floor((t - 0.15) / segDur));
      const localU = Math.min(1, Math.max(0, (t - (0.15 + passIdx * segDur)) / segDur));
      const p0 = zigWaypoints[passIdx];
      const p1 = zigWaypoints[passIdx + 1];

      this.x = p0.x + (p1.x - p0.x) * localU;
      this.y = p0.y + (p1.y - p0.y) * localU;
      this.vx = 0;
      this.vy = 0;

      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      this.facing = dx >= 0 ? 1 : -1;
      this.divePitchRad = Math.atan2(dy, Math.max(1, Math.abs(dx)));

      this.afterimageSpawnAccum += dt;
      if (this.afterimageSpawnAccum >= 0.024) {
        this.afterimageSpawnAccum = 0;
        const col = Math.min(20, Math.max(5, Math.floor((t / this.skillDuration) * 30)));
        this.spawnAfterimage(this.x, this.y, this.facing, 3, col, 0.24, 0);
      }

      const targetStep = passIdx + 2;
      if (this._zantetsuStep < targetStep) {
        this._zantetsuStep = targetStep;
        const threadCol = passIdx % 2 === 0 ? '#38bdf8' : '#818cf8';
        this.addSlashLine(p0.x, p0.y - 66, p1.x, p1.y - 66, 0.68, false, threadCol);

        // Plant 3 sacred pixel Torii Thunder-Pillars across passes 0, 2, 4
        if (passIdx % 2 === 0) {
          const pxTorii = clampX(center + (passIdx - 2) * 34);
          this.toriiPillars.push({
            x: pxTorii,
            y: this.groundY,
            age: 0,
            maxLife: 0.72,
            detonated: false
          });
          this.spawnVfxAnim(1, pxTorii, this.groundY - 78, 172, 172, 0.44, {
            glowColor: 'cyan',
            inFront: false
          });
        }

        if (game?.audio) game.audio.play('dash_whoosh', center);
        if (enemy && !enemy.isDead && Math.abs(enemy.x - center) < 250) {
          enemy.takeDamage(21, this, passIdx === 4, 16, -64);
        }
      }
      return;
    }

    if (t >= 0.55 && t < 0.68) {
      this.y = this.groundY;
      this.divePitchRad = 0;
      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }
    }

    // Phase 2 (t >= 0.68s): Saya Sheath-Click -> Simultaneous 5-Hairline + Torii Thunder-Pillar Detonation!
    if (t >= 0.68 && !this.didSecondaryAction) {
      this.didSecondaryAction = true;
      this.y = this.groundY;
      this.divePitchRad = 0;
      this.spawnSayaGlint(true);
      if (game?.audio) {
        game.audio.play('parry_clang', this.x);
        game.audio.play('thunder_slam', center);
      }
      game?.renderer?.triggerShake?.(12, 0.22);
      game?.renderer?.triggerAberration?.(6);
      game?.renderer?.triggerHitStop?.(0.05);
      this._hitStopTimer = Math.max(this._hitStopTimer || 0, 0.05);
      game?.vfx?.spawnDamageText?.(
        this.x,
        this.y - 156,
        0,
        true,
        'NARUKAMI: SAYA CLICK!',
        '#fde047'
      );

      for (const line of this.activeSlashLines) {
        line.detonated = true;
        line.colorHex = '#fde047';
      }
      for (const tp of this.toriiPillars) {
        tp.detonated = true;
        this.spawnVfxAnim(2, tp.x, this.groundY - 96, 196, 196, 0.38, {
          glowColor: 'cyan',
          inFront: true
        });
      }

      const strikeX = enemy && !enemy.isDead ? enemy.x : center;
      this.spawnVfxAnim(1, strikeX, this.groundY - 90, 224, 224, 0.42, {
        glowColor: 'cyan',
        inFront: true
      });
      this.spawnPixelShockwave(strikeX, this.groundY - 6, 148, 'gold', 0.32, true);
      this.spawnPixelLightningBolt(strikeX, this.groundY - 250, this.groundY, 'gold', 0.34);
      this.spawnSakuraBurst(strikeX, this.groundY - 88, 10, true);

      const foes = this._gatherBattoTargets(enemy, game, 320, 320);
      let hitAny = false;
      for (const foe of foes) {
        foe.takeDamage(foe === enemy ? 74 : 56, this, true, 165 * dir, -205);
        if (!foe.isDead && !foe.isColossalBoss) {
          foe._hitShakeTimer = Math.max(foe._hitShakeTimer || 0, 0.072);
        }
        hitAny = true;
      }
      if (!hitAny && enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 360) {
        enemy.takeDamage(74, this, true, 165 * dir, -205);
      }
      this.heal(18, 'NARUKAMI FOCUS');
    }

    if (t >= this.skillDuration) {
      this._zantetsuStep = 0;
      this.y = this.groundY;
      this.divePitchRad = 0;
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  /**
   * NEWLY BORN OVERDRIVE (`1.84s`): `TAKEMIKAZUCHI STORM-GOD CAGE`
   * Manifests a crisp pixel-art Indigo-Gold Raijin War-Mask & 8-drum Thunder Ring overhead while
   * Kaze-Maru flashes across 8 angles with `ronin_ex_vfx.png` crescent storm-pillars & falling electrified sakura petals!
   */
  updateUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    if (!this._omniStep) this._omniStep = 0;
    this.isInvulnerable = true;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const clampX = (xVal) => this._clampArenaX(xVal, game, 85);
    const originX = this._ultOriginX !== undefined ? this._ultOriginX : this.x;
    const targetX = enemy && !enemy.isDead ? enemy.x : ww * 0.5;
    this._ultTargetX = targetX;
    this.stormGodMask = {
      x: targetX,
      y: this.groundY - 194,
      age: t,
      collapsed: t >= 1.30
    };
    const dir = targetX >= originX ? 1 : -1;
    const landX = clampX(targetX - dir * 72);

    // Falling electrified sakura petals inside the Storm-God Cage
    this._ultPetalAccum = (this._ultPetalAccum || 0) + dt;
    if (this._ultPetalAccum >= 0.045 && t < 1.55) {
      this._ultPetalAccum = 0;
      const px = targetX + (Math.random() - 0.5) * 290;
      const py = this.groundY - 245 - Math.random() * 40;
      this.spawnStormParticle(
        Math.random() < 0.25 ? 'star4' : 'sakura',
        px,
        py,
        (Math.random() - 0.5) * 42,
        78 + Math.random() * 44,
        0.72,
        Math.random() < 0.5 ? '#f472b6' : '#38bdf8',
        '#fde047',
        3
      );
    }

    if (t < 0.26) {
      if (this._omniStep === 0) {
        this._omniStep = 1;
        this._ultOriginX = this.x;
        this._ultOriginY = this.groundY;
        this.spawnSayaGlint(false);
        this.fx?.spawn('susanooStormDomain', this._safeFxX(targetX, game), this._safeFxY(this.groundY - 4), {
          flip: false,
          light: 1.24
        });
        this.spawnVfxAnim(3, targetX, this.groundY - 12, 248, 248, 1.38, {
          glowColor: 'cyan',
          inFront: false
        });
        this.spawnPixelShockwave(this.x, this.groundY - 4, 140, 'purple', 0.30, true);
        if (game?.audio) game.audio.play('ult_cast', targetX);
        game?.vfx?.spawnDamageText?.(
          targetX,
          this.groundY - 216,
          0,
          true,
          'TAKEMIKAZUCHI STORM-GOD CAGE!',
          '#fde047'
        );
      }
      this.x = this._ultOriginX;
      this.y = this.groundY;
      this.vx = 0;
      this.vy = 0;
      this.facing = targetX >= this.x ? 1 : -1;
      this.divePitchRad = 0;
      return;
    }

    // 8-Angle Storm-God Cage Blitz (`0.26s .. 1.30s`)
    const cageNodes = [
      { x: originX, y: this.groundY },
      { x: clampX(targetX + dir * 142), y: this.groundY - 134 },
      { x: clampX(targetX - dir * 138), y: this.groundY - 18 },
      { x: clampX(targetX + dir * 136), y: this.groundY - 162 },
      { x: clampX(targetX - dir * 144), y: this.groundY - 118 },
      { x: clampX(targetX + dir * 124), y: this.groundY - 24 },
      { x: clampX(targetX - dir * 128), y: this.groundY - 172 },
      { x: clampX(targetX + dir * 146), y: this.groundY - 188 },
      { x: landX, y: this.groundY }
    ];

    if (t >= 0.26 && t < 1.30) {
      const segDur = (1.30 - 0.26) / 8;
      const passIdx = Math.min(7, Math.floor((t - 0.26) / segDur));
      const localU = Math.min(1, Math.max(0, (t - (0.26 + passIdx * segDur)) / segDur));
      const p0 = cageNodes[passIdx];
      const p1 = cageNodes[passIdx + 1];

      this.x = p0.x + (p1.x - p0.x) * localU;
      this.y = p0.y + (p1.y - p0.y) * localU;
      this.vx = 0;
      this.vy = 0;

      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      this.facing = dx >= 0 ? 1 : -1;
      this.divePitchRad = Math.atan2(dy, Math.max(1, Math.abs(dx)));

      this.afterimageSpawnAccum += dt;
      if (this.afterimageSpawnAccum >= 0.022) {
        this.afterimageSpawnAccum = 0;
        const col = Math.min(22, Math.max(5, Math.floor((t / this.ultDuration) * 30)));
        this.spawnAfterimage(this.x, this.y, this.facing, 4, col, 0.28, 0);
      }

      const stepTrigger = passIdx + 2;
      if (this._omniStep < stepTrigger && localU >= 0.22) {
        this._omniStep = stepTrigger;
        this.addSlashLine(
          p0.x,
          p0.y - 62,
          p1.x,
          p1.y - 62,
          0.62,
          false,
          passIdx % 2 === 0 ? '#38bdf8' : '#fde047'
        );
        const pillarX = clampX(targetX + ((passIdx % 3) - 1) * 44);
        this.spawnVfxAnim(2, pillarX, this.groundY - 96, 198, 198, 0.34, {
          flipX: passIdx % 2 === 1,
          glowColor: passIdx % 2 === 0 ? 'cyan' : 'gold',
          inFront: passIdx % 2 === 0
        });
        this.spawnVfxAnim(0, targetX, (p0.y + p1.y) * 0.5 - 64, 196, 196, 0.24, {
          vx: this.facing * 240,
          flipX: this.facing < 0,
          glowColor: 'cyan'
        });
        if (game?.audio) game.audio.play('slash', targetX);
        game?.renderer?.triggerShake?.(7, 0.10);
        if (enemy && !enemy.isDead) {
          enemy.takeDamage(23, this, true, 12, -72);
        }
      }
      return;
    }

    // Final 8-Drum Storm-Cage Convergence & Saya Click at t >= 1.30s
    if (t >= 1.30 && !this.didSecondaryAction) {
      this.didSecondaryAction = true;
      this.x = landX;
      this.y = this.groundY;
      this.facing = targetX >= this.x ? 1 : -1;
      this.divePitchRad = 0;
      this.spawnSayaGlint(true);

      for (const line of this.activeSlashLines) {
        line.detonated = true;
        line.colorHex = '#fde047';
      }
      this.addSlashLine(targetX, this.groundY - 265, targetX, this.groundY, 0.48, true, '#fde047');

      this.spawnVfxAnim(2, targetX, this.groundY - 108, 248, 248, 0.48, {
        glowColor: 'gold',
        inFront: true
      });
      this.spawnVfxAnim(1, targetX, this.groundY - 92, 232, 232, 0.44, {
        glowColor: 'cyan',
        inFront: true
      });
      this.spawnVfxAnim(3, targetX, this.groundY - 10, 256, 256, 0.44, {
        glowColor: 'gold',
        inFront: false
      });

      this.spawnPixelShockwave(targetX, this.groundY - 6, 180, 'gold', 0.40, true);
      this.spawnPixelLightningBolt(targetX, this.groundY - 260, this.groundY, 'gold', 0.40);
      this.spawnPixelLightningBolt(targetX - 58, this.groundY - 230, this.groundY, 'cyan', 0.34);
      this.spawnPixelLightningBolt(targetX + 58, this.groundY - 230, this.groundY, 'purple', 0.34);
      this.spawnSakuraBurst(targetX, this.groundY - 96, 14, true);

      if (game?.audio) game.audio.play('thunder_slam', targetX);
      game?.renderer?.triggerShake?.(15, 0.28);
      game?.renderer?.triggerAberration?.(9);
      game?.renderer?.triggerHitStop?.(0.06);
      this._hitStopTimer = Math.max(this._hitStopTimer || 0, 0.06);
      game?.vfx?.spawnDamageText?.(
        targetX,
        this.groundY - 176,
        0,
        true,
        'EIGHT-DRUM STORM JUDGEMENT!',
        '#38bdf8'
      );

      this.heal(22, 'TAKEMIKAZUCHI FOCUS');
      const foes = this._gatherBattoTargets(enemy, game, 340, 340);
      let hitAny = false;
      for (const foe of foes) {
        foe.takeDamage(foe === enemy ? 96 : 72, this, true, 220 * dir, -245);
        if (!foe.isDead && !foe.isColossalBoss) {
          foe._hitShakeTimer = Math.max(foe._hitShakeTimer || 0, 0.082);
        }
        hitAny = true;
      }
      if (!hitAny && enemy && !enemy.isDead) {
        enemy.takeDamage(96, this, true, 220 * dir, -245);
      }
    }

    if (t >= this.ultDuration) {
      this._omniStep = 0;
      this.y = this.groundY;
      this.divePitchRad = 0;
      this.isInvulnerable = false;
      this.stormGodMask = null;
      this.setState('IDLE');
    }
  }

  /**
   * NEWLY BORN SUPREME ULTIMATE (`3.70s`): `AMAKAKERU: REALM-SLICING SHOGUNATE`
   * Consecrates a Crimson-Moon Torii Sanctuary, suspends raindrops & sakura petals in dead silence,
   * carves a crisp full-screen horizon Iaido fault-line, and clicks his katana home at t = 1.95s
   * to trigger `triggerShogunateStage` (`shogunate` / `shogunate_inferno` / `shogunate_glacial` 3-way synergy intact!)
   * + cascading thunder-pillar Judgement!
   */
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

      const rawEnemyX = focusEnemy ? focusEnemy.x : this.x + (this.facing || 1) * 280;
      const dashDir =
        Math.abs(rawEnemyX - this.x) > 4
          ? rawEnemyX >= this.x
            ? 1
            : -1
          : this.facing || 1;
      this._trueUltDashDir = dashDir;

      const minTargetX = dashDir === 1 ? 195 : 235;
      const maxTargetX = dashDir === 1 ? ww - 235 : ww - 195;
      const initTargetX = this._clampArenaX(
        Math.max(minTargetX, Math.min(maxTargetX, rawEnemyX)),
        game,
        120
      );
      this._trueUltTargetX = initTargetX;

      let startX = this.x;
      if ((initTargetX - startX) * dashDir < 110) {
        startX = this._clampArenaX(initTargetX - dashDir * 145, game, 80);
      }
      this._trueUltStartX = startX;
      this._trueUltBackX = this._clampArenaX(initTargetX + dashDir * 148, game, 80);
      this.x = startX;
      this.y = this.groundY;
      this.facing = dashDir;

      if (game?.audio) {
        game.audio.play('ult_cast', this.x);
        game.audio.play('parry_clang', this.x);
      }
      if (game?.renderer) {
        game.renderer.ultDim = Math.max(game.renderer.ultDim || 0, 0.56);
        game.renderer.triggerShake?.(7, 0.20);
      }

      this.crimsonMoonSanctuary = {
        x: initTargetX,
        y: this.groundY - 168,
        age: 0,
        alpha: 1.0,
        released: false
      };

      // Populate suspended raindrops & sakura blossoms frozen in dead silence!
      this.suspendedSanctuaryDrops = [];
      for (let i = 0; i < 34; i++) {
        const isPetal = i % 3 === 0;
        this.suspendedSanctuaryDrops.push({
          isPetal,
          x: initTargetX + ((i * 53) % 560) - 280,
          y: this.groundY - 36 - ((i * 41) % 310),
          vx: isPetal ? dashDir * (42 + (i % 4) * 18) : -dashDir * 18,
          vy: isPetal ? 85 + (i % 3) * 24 : 340 + (i % 5) * 35,
          phase: i
        });
      }
      this.horizonFaultLine = null;

      this.spawnSayaGlint(false);
      this.spawnPixelShockwave(this.x, this.groundY - 4, 150, 'cyan', 0.34, true);
      this.fx.spawn('susanooStormDomain', this._safeFxX(this.x, game), this._safeFxY(this.groundY), {
        key: 'susanooStormDomain',
        follow: this,
        offsetX: 0,
        offsetY: 0,
        useGroundY: true,
        light: 1.24
      });

      game?.vfx?.triggerCinematicCutIn?.(this, this.trueUltName, '#38bdf8');
      if (game?.vfx) {
        game.vfx.spawnShockwave(this.x, this.groundY - 4, 160, '#38bdf8', 0.34, true);
        game.vfx.spawnDamageText(
          this.x,
          this.groundY - 168,
          0,
          true,
          'AMAKAKERU: REALM-SLICING SHOGUNATE',
          '#fde047'
        );
      }
    }

    const dashDir = this._trueUltDashDir || 1;

    if (game?.renderer && t < 2.65) {
      const dimTarget = t <= 1.95 ? 0.56 : 0.56 * Math.max(0, 1 - (t - 1.95) / 0.70);
      game.renderer.ultDim = Math.max(game.renderer.ultDim || 0, dimTarget);
    }

    if (t < 0.90 && focusEnemy && !focusEnemy.isDead) {
      const desiredX = this._clampArenaX(focusEnemy.x, game, 120);
      this._trueUltTargetX += (desiredX - this._trueUltTargetX) * Math.min(1, dt * 9.0);
      if ((this._trueUltTargetX - this._trueUltStartX) * dashDir < 105) {
        this._trueUltStartX = this._clampArenaX(this._trueUltTargetX - dashDir * 140, game, 80);
      }
      this._trueUltBackX = this._clampArenaX(this._trueUltTargetX + dashDir * 148, game, 80);
    }

    const targetX = this._trueUltTargetX;
    const startX = this._trueUltStartX;
    const backSideX = this._trueUltBackX;

    if (this.crimsonMoonSanctuary) {
      this.crimsonMoonSanctuary.age += dt;
      this.crimsonMoonSanctuary.x = targetX;
      this.crimsonMoonSanctuary.alpha =
        t < 2.45 ? Math.min(1, t / 0.22) : Math.max(0, 1 - (t - 2.45) / 0.65);
      if (this.crimsonMoonSanctuary.released) {
        for (const d of this.suspendedSanctuaryDrops) {
          d.x += d.vx * dt;
          d.y += d.vy * dt;
        }
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

    // BEAT 1 (`0.00s .. 0.92s`): Crimson-Moon Torii Consecration & Dead-Silence Iaido Coil
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

    // BEAT 2 (`0.92s .. 1.34s`): Blinding Horizon Iaido Severance Dash
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

        // Full-screen crisp 2-pass horizon Iaido fault-line!
        this.horizonFaultLine = {
          cx: targetX,
          cy: this.groundY - 94,
          dir: dashDir,
          age: 0,
          maxLife: 1.55,
          detonated: false
        };
        this.spawnVfxAnim(7, targetX, this.groundY - 94, 248, 248, 0.65, {
          glowColor: 'cyan',
          inFront: true
        });
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
            'HORIZON IAIDO FAULT!',
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

    // BEAT 3 (`1.34s .. 3.70s`): Noto Resheath -> t = 1.95s Tsuba Click -> 3-Way Shogunate Realm Slice!
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
      if (this.crimsonMoonSanctuary) {
        this.crimsonMoonSanctuary.released = true;
      }
      if (this.horizonFaultLine) {
        this.horizonFaultLine.detonated = true;
      }

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

      this.triggerTrueUltLightningSurge(
        targetX,
        this.groundY,
        dashDir,
        ww,
        stageAlreadyBurning,
        stageAlreadyGlacial
      );

      // Cascading Storm-Pillar Judgement across the sanctuary!
      for (const offX of [-180, -85, 0, 85, 180]) {
        const px = this._clampArenaX(targetX + offX, game, 64);
        this.spawnVfxAnim(2, px, this.groundY - 106, 224, 224, 0.52, {
          glowColor: offX === 0 ? 'gold' : 'cyan',
          inFront: offX === 0
        });
      }
      this.spawnVfxAnim(7, targetX, this.groundY - 96, 280, 280, 0.56, {
        glowColor: 'gold',
        inFront: true
      });
      this.spawnSakuraBurst(targetX, this.groundY - 96, 18, true);

      if (game?.vfx) {
        const waveCol = stageAlreadyBurning ? '#fb923c' : stageAlreadyGlacial ? '#a5f3fc' : '#38bdf8';
        const callout = stageAlreadyBurning
          ? 'BURNING SHOGUNATE REALM SLICE!'
          : stageAlreadyGlacial
            ? 'FROZEN SHOGUNATE REALM SLICE!'
            : 'SHOGUNATE REALM SLICE!';
        game.vfx.spawnShockwave(targetX, this.groundY - 6, 280, waveCol, 0.48, true);
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
      this.crimsonMoonSanctuary = null;
      this.suspendedSanctuaryDrops = [];
      this.horizonFaultLine = null;
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

  /**
   * Pixel-pure VFX cell draw using subtle 4x4 Bayer floor/rim stippling (zero radial gradient glow blobs!).
   */
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
    _renderer = null,
    glowColor = 'cyan'
  ) {
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth || alpha <= 0.02) return;
    const cell = 208;
    const sx = Math.max(0, Math.min(29, Math.floor(col))) * cell;
    const sy = Math.max(0, Math.min(7, Math.floor(row))) * cell;

    if (row !== 0) {
      const outerHex =
        glowColor === 'gold' ? '#b45309' : glowColor === 'purple' ? '#4f46e5' : '#0284c7';
      const coreHex =
        glowColor === 'gold' ? '#fde047' : glowColor === 'purple' ? '#818cf8' : '#38bdf8';
      drawStormBayerHalo(ctx, x, y, w * 0.36, h * 0.24, outerHex, coreHex, Math.min(0.14, alpha * 0.14));
    }

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(x), Math.round(y));
    if (flipX) ctx.scale(-1, 1);

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.drawImage(vfxSheet, sx, sy, cell, cell, -w * 0.5, -h * 0.5, w, h);

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(0.14, alpha * 0.13);
    ctx.drawImage(vfxSheet, sx, sy, cell, cell, -w * 0.5, -h * 0.5, w, h);

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  drawStormParticlesAndThreads(ctx) {
    // 1. 2-pass ultra-crisp 1px-2px suspended electric hairlines (0 chevron stripes!)
    for (let i = 0; i < this.activeSlashLines.length; i++) {
      const line = this.activeSlashLines[i];
      const u = Math.min(1, line.age / Math.max(0.05, line.maxLife));
      const fade = 1 - u;
      if (fade <= 0.03) continue;
      drawTwoPassStormHairline(
        ctx,
        line.x1,
        line.y1,
        line.x2,
        line.y2,
        line.detonated ? '#fde047' : line.colorHex || '#38bdf8',
        '#ffffff',
        fade,
        line.detonated ? 2 : 1
      );
    }

    // 2. Full-screen Amakakeru Horizon Iaido Fault-Line
    if (this.horizonFaultLine) {
      const hf = this.horizonFaultLine;
      const u = Math.min(1, hf.age / hf.maxLife);
      const fade = u < 0.72 ? 1 : (1 - u) / 0.28;
      if (fade > 0.03) {
        drawTwoPassStormHairline(
          ctx,
          hf.cx - 640,
          hf.cy + hf.dir * 24,
          hf.cx + 640,
          hf.cy - hf.dir * 24,
          hf.detonated ? '#fde047' : '#38bdf8',
          '#ffffff',
          fade,
          hf.detonated ? 2 : 1
        );
      }
    }

    // 3. Clean 2-pass blade hairlines & 4-frame anime hit-starbursts
    for (let i = 0; i < this.cleanBladeCuts.length; i++) {
      const c = this.cleanBladeCuts[i];
      const u = Math.min(1, Math.max(0, c.age / Math.max(0.01, c.maxLife)));
      if (c.type === 'blade') {
        drawTwoPassStormHairline(ctx, c.x0, c.y0, c.x1, c.y1, '#38bdf8', '#ffffff', 1 - u, 1);
      } else {
        drawStormHitStarburst(
          ctx,
          c.x,
          c.y,
          u,
          c.isCrit ? '#38bdf8' : '#818cf8',
          c.isCrit ? '#fde047' : '#fbcfe8'
        );
      }
    }

    // 4. Multi-shape pixel particles (electrified sakura petals & 4-point star-glints, 0 canvas rotation!)
    if (this.exParticles.length > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      for (let i = 0; i < this.exParticles.length; i++) {
        const p = this.exParticles[i];
        const fade = Math.max(0, 1 - p.age / p.maxLife);
        if (fade <= 0.04) continue;
        const px = Math.round(p.x / 2) * 2;
        const py = Math.round(p.y / 2) * 2;
        ctx.globalAlpha = Math.min(0.95, fade);
        if (p.kind === 'star4') {
          const arm = p.size * 2;
          ctx.fillStyle = p.color;
          ctx.fillRect(px - arm, py, arm * 2 + 2, 2);
          ctx.fillRect(px, py - arm, 2, arm * 2 + 2);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(px, py, 2, 2);
        } else {
          // Stepped 2-tone sakura petal silhouette cycling flutter phases via integer pixel rects!
          const flutter = (Math.floor(p.age * 14) + p.phase) % 2;
          ctx.fillStyle = p.color;
          ctx.fillRect(px, py, 4, 2);
          ctx.fillRect(px + (flutter === 0 ? 2 : -2), py + 2, 4, 2);
          ctx.fillStyle = p.accent;
          ctx.fillRect(px, py, 2, 2);
        }
      }
      ctx.restore();
    }
  }

  drawLightningSurgeWorld(ctx) {
    const surge = this.trueUltLightningSurge;
    if (!surge) return;
    const u = Math.min(1, Math.max(0, surge.age / Math.max(0.05, surge.maxLife)));
    const fade = u < 0.14 ? 1.0 : Math.pow(1 - (u - 0.14) / 0.86, 1.25);
    if (fade <= 0.02) return;

    const fx = surge.focusX;
    const gy = surge.groundY;
    const isInf = surge.isInferno;
    const isGlac = surge.isGlacial;
    const outerCol = isInf ? '#ea580c' : isGlac ? '#0284c7' : '#4f46e5';
    const midCol = isInf ? '#fb923c' : isGlac ? '#a5f3fc' : '#38bdf8';
    const hiCol = isInf ? '#fef08a' : '#fde047';
    const tick = Math.floor(surge.age * 24);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const skyOffsets = [-420, -280, -140, 0, 140, 280, 420];
    for (let b = 0; b < skyOffsets.length; b++) {
      const stagger = (b % 3) * 0.05;
      if (u < stagger) continue;
      const bxTop = fx + skyOffsets[b] + ((b % 2 === 0 ? 1 : -1) * 18);
      const bxBot = fx + skyOffsets[b];
      drawSteppedPixelBolt(
        ctx,
        bxTop,
        gy - 520,
        bxBot,
        gy - 2,
        10,
        b === 3 ? 28 : 20,
        outerCol,
        midCol,
        100 + b * 41 + tick,
        fade
      );
      drawStormBayerHalo(ctx, bxBot, gy - 4, 36, 12, midCol, hiCol, fade * 0.16);
      ctx.globalAlpha = fade * 0.92;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(bxBot) - 4, Math.round(gy) - 6, 8, 6);
    }

    ctx.restore();
  }

  drawCrimsonMoonAndToriiSanctuary(ctx, vfxSheet) {
    const sanct = this.crimsonMoonSanctuary;
    if (!sanct || sanct.alpha <= 0.02) return;
    const cx = Math.round(sanct.x / 2) * 2;
    const gy = Math.round(this.groundY);

    drawStormBayerHalo(ctx, cx, gy - 6, 220, 34, '#9f1239', '#fde047', sanct.alpha * 0.16);

    if (vfxSheet?.complete && vfxSheet.naturalWidth) {
      const col = Math.floor(sanct.age * 24) % 30;
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        6,
        col,
        cx,
        sanct.y,
        312,
        312,
        sanct.alpha * 0.92,
        false,
        null,
        'gold'
      );
    }

    // Suspended raindrops & sakura petals frozen in dead silence before the Tsuba click!
    if (this.suspendedSanctuaryDrops.length > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = Math.min(0.92, sanct.alpha);
      for (let i = 0; i < this.suspendedSanctuaryDrops.length; i++) {
        const d = this.suspendedSanctuaryDrops[i];
        if (d.y > gy + 8) continue;
        const dx = Math.round(d.x / 2) * 2;
        const dy = Math.round(d.y / 2) * 2;
        if (d.isPetal) {
          ctx.fillStyle = '#f472b6';
          ctx.fillRect(dx, dy, 4, 2);
          ctx.fillStyle = '#fbcfe8';
          ctx.fillRect(dx + 2, dy + 2, 2, 2);
        } else {
          ctx.fillStyle = '#67e8f9';
          ctx.fillRect(dx, dy, 2, 8);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(dx, dy + 6, 2, 2);
        }
      }
      ctx.restore();
    }
  }

  drawForegroundOverlay(ctx, renderer = null) {
    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    if (this.fx && !this.isDead) {
      this.fx.renderLayer(ctx, 'back', arenaCenterX, this.groundY, 0.96);
    }

    const sprites = this.getExSprites();
    const sheet = PixelForge.ensureImage?.(sprites?.sheet) || sprites?.sheet;
    const vfxSheet = PixelForge.ensureImage?.(sprites?.vfx) || sprites?.vfx;

    // Subtle pixel floor halo under Kaze-Maru EX
    if (!this.isDead) {
      drawStormBayerHalo(ctx, this.x, this.groundY - 2, 54, 14, '#4f46e5', '#38bdf8', 0.14);
    }

    // Crimson-Moon Torii Sanctuary (`TRUE_ULTIMATE`)
    if (this.crimsonMoonSanctuary) {
      this.drawCrimsonMoonAndToriiSanctuary(ctx, vfxSheet);
    }

    // Takemikazuchi Raijin War-Mask & 8-Drum Thunder Ring (`ULTIMATE`)
    if (this.stormGodMask && vfxSheet?.complete && vfxSheet.naturalWidth) {
      const m = this.stormGodMask;
      const col = Math.floor(m.age * 30) % 30;
      const fade = m.collapsed ? Math.max(0, 1 - (m.age - 1.30) / 0.50) : Math.min(1, m.age / 0.18);
      if (fade > 0.03) {
        this.drawBloomedVfxCell(ctx, vfxSheet, 5, col, m.x, m.y, 264, 264, fade * 0.94, false, null, 'gold');
      }
    }

    // 5-Drum Raijin Taiko Pentagon Halo ignited during `NARUKAMI THUNDER-GATE FLASH`
    if (this._taikoHaloTimer > 0 && !this.isDead) {
      const fade = Math.min(1, this._taikoHaloTimer / 0.20);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = fade * 0.94;
      for (let d = 0; d < 5; d++) {
        const ang = -Math.PI * 0.5 + (d * Math.PI * 2) / 5 + (0.94 - this._taikoHaloTimer) * 2.4;
        const dx = Math.round((this.x + Math.cos(ang) * 44) / 2) * 2;
        const dy = Math.round((this.y - 102 + Math.sin(ang) * 36) / 2) * 2;
        ctx.fillStyle = '#09081a';
        ctx.fillRect(dx - 6, dy - 6, 12, 12);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(dx - 4, dy - 4, 8, 8);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(dx - 2, dy - 2, 4, 4);
      }
      ctx.restore();
    }

    // Pixel Torii Thunder-Pillars (`SKILL`)
    if (this.toriiPillars.length > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      for (const tp of this.toriiPillars) {
        const fade = Math.max(0, 1 - tp.age / tp.maxLife);
        const tx = Math.round(tp.x / 2) * 2;
        const by = Math.round(tp.y);
        ctx.globalAlpha = fade * 0.92;
        ctx.fillStyle = '#09081a';
        ctx.fillRect(tx - 24, by - 68, 48, 6);
        ctx.fillRect(tx - 16, by - 62, 6, 62);
        ctx.fillRect(tx + 10, by - 62, 6, 62);
        ctx.fillStyle = tp.detonated ? '#fde047' : '#e11d48';
        ctx.fillRect(tx - 22, by - 66, 44, 4);
        ctx.fillRect(tx - 18, by - 54, 36, 3);
        ctx.fillRect(tx - 14, by - 62, 4, 60);
        ctx.fillRect(tx + 10, by - 62, 4, 60);
        if (tp.detonated) {
          drawSteppedPixelBolt(ctx, tx, by - 180, tx, by, 6, 14, '#4f46e5', '#fde047', tx + Math.floor(tp.age * 30), fade);
        }
      }
      ctx.restore();
    }

    if (this.afterimages.length > 0 && sheet?.complete && sheet.naturalWidth) {
      for (let i = 0; i < this.afterimages.length; i++) {
        const img = this.afterimages[i];
        const alpha = Math.max(0, (1 - img.age / img.maxLife) * 0.56);
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

    this.drawStormParticlesAndThreads(ctx);
    this.drawLightningSurgeWorld(ctx);

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
      ctx.globalAlpha = 0.45;
      PixelForge.drawGhostFrame(ctx, sprites, frameIdx, w, h);
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
