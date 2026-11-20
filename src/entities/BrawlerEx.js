import { Fighter } from './Fighter.js?v=30fps190';
import { PixelForge } from '../engine/PixelForge.js?v=30fps190';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps190';
import { ExParticleSystem, drawExBayerHalo } from '../engine/shaders/exNextGenFX.js?v=30fps190';

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
 * Razor-sharp fractal-forked pixel lightning bolt (`2px` white core + `4px` electric rim + acute hairline sub-branches).
 * Zero fat noodles, zero chevrons, zero canvas rotation!
 */
function drawTempestPixelBolt(ctx, x0, y0, x1, y1, segs, jagAmp, seed, alpha = 0.94, opts = null) {
  if (alpha <= 0.02) return;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const segCount = Math.max(4, segs || 7);
  const pts = [[Math.round(x0), Math.round(y0)]];
  for (let s = 1; s < segCount; s++) {
    const f = s / segCount;
    const env = Math.sin(f * Math.PI);
    const h = Math.sin((seed + s * 17.3) * 127.1) * 43758.5453;
    const off = ((h - Math.floor(h)) * 2 - 1) * jagAmp * (0.35 + 0.65 * env);
    pts.push([
      Math.round((x0 + dx * f + nx * off) / 2) * 2,
      Math.round((y0 + dy * f + ny * off) / 2) * 2
    ]);
  }
  pts.push([Math.round(x1), Math.round(y1)]);

  const rimHex = opts?.rimColor || (seed % 2 === 0 ? '#38bdf8' : '#fbbf24');
  const haloHex = opts?.haloColor || (seed % 2 === 0 ? '#6366f1' : '#f59e0b');
  const allowForks = opts?.forks !== false && len >= 68;

  const tracePoly = (poly, fillHex, passAlpha, size) => {
    if (passAlpha <= 0.01) return;
    ctx.fillStyle = fillHex;
    ctx.globalAlpha = passAlpha;
    const half = Math.floor(size * 0.5);
    for (let s = 0; s < poly.length - 1; s++) {
      const [ax, ay] = poly[s];
      const [bx, by] = poly[s + 1];
      const steps = Math.max(2, Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay)) / 2));
      for (let k = 0; k <= steps; k++) {
        const u = k / steps;
        const px = Math.round((ax + (bx - ax) * u) / 2) * 2;
        const py = Math.round((ay + (by - ay) * u) / 2) * 2;
        ctx.fillRect(px - half, py - half, size, size);
      }
    }
  };

  // Build 2-3 razor-thin acute fractal sub-branches off mid-elbows!
  const forks = [];
  if (allowForks) {
    const mainAng = Math.atan2(dy, dx);
    for (let s = 1; s < pts.length - 1; s++) {
      if ((s + seed) % 2 !== 0 && pts.length > 5) continue;
      if (forks.length >= 3) break;
      const [ex, ey] = pts[s];
      const side = (s + seed) % 2 === 0 ? 1 : -1;
      const h2 = Math.sin((seed * 3.1 + s * 29.7) * 91.7) * 43758.5453;
      const r01 = h2 - Math.floor(h2);
      const bAng = mainAng + side * (0.44 + r01 * 0.36);
      const bLen = Math.min(82, len * (0.24 + r01 * 0.18));
      const mx = Math.round((ex + Math.cos(bAng) * bLen * 0.52 - Math.sin(bAng) * side * 9) / 2) * 2;
      const my = Math.round((ey + Math.sin(bAng) * bLen * 0.52 + Math.cos(bAng) * side * 9) / 2) * 2;
      const tx = Math.round((ex + Math.cos(bAng) * bLen) / 2) * 2;
      const ty = Math.round((ey + Math.sin(bAng) * bLen) / 2) * 2;
      forks.push([
        [ex, ey],
        [mx, my],
        [tx, ty]
      ]);
    }
  }

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  // 1. Subtle narrow electric aura (`6px` @ low alpha — silky rim, ZERO blobby pipe!)
  ctx.globalCompositeOperation = 'lighter';
  tracePoly(pts, haloHex, Math.min(0.24, alpha * 0.24), 6);
  tracePoly(pts, rimHex, Math.min(0.76, alpha * 0.78), 4);
  for (let f = 0; f < forks.length; f++) {
    tracePoly(forks[f], rimHex, Math.min(0.62, alpha * 0.64), 2);
  }
  // 2. Razor-sharp `2px` incandescent white core on main bolt + tiny elbow sparks
  ctx.globalCompositeOperation = 'source-over';
  tracePoly(pts, '#ffffff', Math.min(0.98, alpha), 2);
  for (let f = 0; f < forks.length; f++) {
    tracePoly(forks[f].slice(0, 2), '#ffffff', Math.min(0.84, alpha * 0.85), 2);
  }
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = '#fef08a';
  ctx.globalAlpha = Math.min(0.92, alpha * 0.92);
  for (let s = 1; s < pts.length - 1; s += 2) {
    const [ex, ey] = pts[s];
    ctx.fillRect(ex - 2, ey - 2, 4, 4);
  }
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
      trueUltDuration: 3.85
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
    this.trueUltSub = 'ONE-INCH RAIJIN MACH RAIL-PUNCH & SONIC DETONATION';
    this.trueUltDuration = 3.85;

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
    this._trueUltDomainAlpha = 0;
    this._trueUltTargetX = this.x;
    this._trueUltStartX = this.x;
    this._trueUltChargeX = this.x;
    this._trueUltSkidX = this.x;
    this._trueUltFacing = this.facing;
    this._raijinDrumsAlpha = 0;
    this._fistChargeCore = null; // { x, y, u, alpha } tight one-inch hip-fist singularity (never blocks Raijin!)
    this._sonicRings = [];       // 5 stacked vertical expanding Mach sonic-boom pressure rings!
    this._sonicRail = null;      // { x0, x1, y, age, maxLife, dir }
    this._shockWall = null;      // { x, groundY, age, maxLife, dir }
    this._shockWallZaps = 0;
    this._lightningImpacts = []; // Blinding radial lightning impact domes + cross-flares + fractal arcs!
    this._groundCracks = [];     // Animated perspective glowing stone fissures zipping outward across groundY!
    this._debrisShards = [];     // Physically tumbling pixel stone slabs & electric embers!
    this._thunderSlashes = [];   // Sweeping Zenitsu-style razor-tapered thunderclap slash ribbons!
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
        sheet: mkImg('assets/sprites/brawler_ex_sheet.png?v=30fps190'),
        vfx: mkImg('assets/sprites/brawler_ex_vfx.png?v=30fps190'),
        portrait: mkImg('assets/sprites/brawler_ex_portrait.png?v=30fps190'),
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

  spawnLightningImpact(x, y, maxRadius = 160, maxLife = 0.42, rayCount = 10) {
    if (this._lightningImpacts.length >= 8) this._lightningImpacts.shift();
    this._lightningImpacts.push({
      x: Math.round(x),
      y: Math.round(y),
      age: 0,
      maxLife,
      maxR: maxRadius,
      rayCount,
      seed: Math.floor(Math.random() * 997) + 1
    });
  }

  spawnGroundCrackNetwork(cx, gy, radius = 180, count = 8, maxLife = 1.25) {
    for (let i = 0; i < count; i++) {
      if (this._groundCracks.length >= 28) this._groundCracks.shift();
      const ang = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
      const len = radius * (0.62 + Math.random() * 0.48);
      const segs = 5;
      const pts = [[Math.round(cx), Math.round(gy - 2)]];
      for (let s = 1; s <= segs; s++) {
        const f = s / segs;
        const jx = (Math.random() - 0.5) * 26 * f;
        const jy = (Math.random() - 0.5) * 8 * f;
        pts.push([
          Math.round((cx + Math.cos(ang) * len * f + jx) / 2) * 2,
          Math.round((gy - 2 + Math.sin(ang) * len * 0.24 * f + jy) / 2) * 2
        ]);
      }
      this._groundCracks.push({
        pts,
        age: 0,
        maxLife,
        isGold: i % 2 === 0
      });
    }
  }

  spawnDebrisBurst(cx, gy, count = 16, power = 1.0) {
    for (let i = 0; i < count; i++) {
      if (this._debrisShards.length >= 48) this._debrisShards.shift();
      const dir = (Math.random() - 0.5) * 2;
      this._debrisShards.push({
        x: cx + (Math.random() - 0.5) * 56,
        y: gy - 4 - Math.random() * 14,
        vx: dir * (120 + Math.random() * 260) * power,
        vy: -(220 + Math.random() * 340) * power,
        w: 4 + Math.floor(Math.random() * 3) * 2,
        h: 4 + Math.floor(Math.random() * 2) * 2,
        groundY: gy,
        age: 0,
        maxLife: 0.58 + Math.random() * 0.46,
        rimHex: i % 2 === 0 ? '#fbbf24' : '#38bdf8'
      });
    }
  }

  spawnThunderSlash(x0, y0, x1, y1, maxLife = 0.32, width = 10, isGold = true) {
    if (this._thunderSlashes.length >= 16) this._thunderSlashes.shift();
    this._thunderSlashes.push({
      x0: Math.round(x0),
      y0: Math.round(y0),
      x1: Math.round(x1),
      y1: Math.round(y1),
      age: 0,
      maxLife,
      width,
      isGold
    });
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
      this._trueUltDomainAlpha = 0;
      this._raijinDrumsAlpha = 0;
      this._fistChargeCore = null;
      this._sonicRings.length = 0;
      this._sonicRail = null;
      this._shockWall = null;
      this._shockWallZaps = 0;
      this._lightningImpacts.length = 0;
      this._groundCracks.length = 0;
      this._debrisShards.length = 0;
      this._thunderSlashes.length = 0;
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
      this._sonicRings.length = 0;
      this._fistChargeCore = null;
      this._sonicRail = null;
      this._shockWall = null;
      this._shockWallZaps = 0;
      this._lightningImpacts.length = 0;
      this._groundCracks.length = 0;
      this._debrisShards.length = 0;
      this._thunderSlashes.length = 0;
      this._raijinDrumsAlpha = 0;
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
      this.spawnLightningImpact(hitX, this.y - 88, 126, 0.32, 8);
      this.spawnThunderSlash(this.x - this.facing * 20, this.y - 124, hitX + this.facing * 80, this.y - 52, 0.28, 10, true);
      this.spawnGroundCrackNetwork(hitX, this.groundY, 125, 6, 0.85);
      this.spawnDebrisBurst(hitX, this.groundY, 10, 0.72);
      game?.renderer?.triggerImpactFrame?.(hitX, this.y - 88, 0.06, 'tempest');
      this.fx?.spawn('tempestBurst', this._safeFxX(hitX, game), this.y - 88, {
        extra: { radius: 56 }
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
      this.spawnLightningImpact(finX, this.groundY - 108, 178, 0.44, 10);
      this.spawnThunderSlash(finX - this.facing * 50, this.groundY - 24, finX + this.facing * 60, this.groundY - 210, 0.36, 12, true);
      this.spawnGroundCrackNetwork(finX, this.groundY, 165, 8, 1.05);
      this.spawnDebrisBurst(finX, this.groundY, 14, 0.90);
      game?.renderer?.triggerImpactFrame?.(finX, this.groundY - 108, 0.10, 'tempest');
      this.fx?.spawn('tempestBurst', this._safeFxX(finX, game), this.groundY - 104, {
        extra: { radius: 68 }
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
    const foeAlive = Boolean(enemy && !enemy.isDead);
    const liveFoeX = foeAlive ? enemy.x : this._trueUltTargetX;

    // 100% grounded bare-knuckle martial arts finisher (ZERO sky float / ZERO teleport cage!)
    this.y = this.groundY;
    this.vy = 0;
    this.cameraAirLift = 0;

    // Smooth dark storm eclipse domain across Acts 2 & 3
    if (t < 0.66) {
      this._trueUltDomainAlpha = Math.min(0.42, (t / 0.66) * 0.42);
    } else if (t < 0.96) {
      this._trueUltDomainAlpha = 0.42 + ((t - 0.66) / 0.30) * 0.58;
    } else if (t > dur - 0.50) {
      this._trueUltDomainAlpha = Math.max(0, (dur - t) / 0.50);
    } else {
      this._trueUltDomainAlpha = 1;
    }

    // ==================== INIT ====================
    if (!this._trueUltInit) {
      this._trueUltInit = true;
      this._trueUltStage = 0;
      this._trueUltStartX = this.x;
      this._raijinDrumsAlpha = 0;
      this._fistChargeCore = null;
      this._sonicRings.length = 0;
      this._sonicRail = null;
      this._shockWall = null;
      this._shockWallZaps = 0;
      this.isInvulnerable = true;
      this.unstoppablePoise = true;

      const aimX = foeAlive ? enemy.x : this.x + this.facing * 200;
      this._trueUltTargetX = this._clampArenaX(aimX, game);
      this._trueUltFacing = this._trueUltTargetX >= this.x ? 1 : -1;
      this.facing = this._trueUltFacing;
      this._trueUltGutX = this._clampArenaX(this._trueUltTargetX - this._trueUltFacing * 74, game);

      if (game?.audio) {
        game.audio.play('ult_cast', this.x);
      }
      if (!game?.isAdventureMode?.()) {
        this.heal(Math.round(this.maxHp * 0.072), 'RAIJIN SECOND WIND');
      }
      this.spawnGroundSeal(this.x, this.groundY, 108, 0.55);
      game?.renderer?.triggerShake?.(8, 0.20);
    }

    const dir = this._trueUltFacing || 1;

    // ==================== ACT 1 (0.00..0.66s): POINT-BLANK LIGHTNING GUT-CHECK ====================
    if (t < 0.66) {
      if (t < 0.20) {
        // Lightning sprint straight into point-blank gut-check pocket!
        const du = t / 0.20;
        const eased = 1 - Math.pow(1 - du, 2.6);
        this.x = this._trueUltStartX + (this._trueUltGutX - this._trueUltStartX) * eased;
        this.trueUltFrameOverride = 135;
        this._overrideFrameIdx = 135;
        this.afterimageAccum += dt;
        if (this.afterimageAccum >= 0.032) {
          this.afterimageAccum = 0;
          this.spawnAfterimage(this.x, this.y, dir, 6, Math.min(28, Math.floor(du * 28)), 0.18);
        }
      } else {
        // Deliver crushing point-blank gut-check blasting opponent back into a crackling Thunder Shock-Barrier!
        this.trueUltFrameOverride = t < 0.42 ? 136 : 137;
        this._overrideFrameIdx = this.trueUltFrameOverride;
        if (this._trueUltStage < 1) {
          this._trueUltStage = 1;
          this.x = this._trueUltGutX;
          const wallX = this._clampArenaX(this.x + dir * 260, game);
          this._trueUltWallX = wallX;
          this._trueUltChargeX = this._clampArenaX(wallX - dir * 280, game);
          this._trueUltSkidX = this._clampArenaX(wallX + dir * 185, game);

          // Ensure comfortable room behind opponent even near arena wall
          if (Math.abs(this._trueUltSkidX - wallX) < 115) {
            this._trueUltSkidX = this._clampArenaX(wallX + dir * 105, game);
          }

          const gutHitX = this.x + dir * 70;
          game?.renderer?.triggerImpactFrame?.(gutHitX, this.groundY - 92, 0.08, 'tempest');
          this.spawnLightningImpact(gutHitX, this.groundY - 92, 138, 0.38, 8);
          this.spawnThunderSlash(gutHitX - dir * 55, this.groundY - 135, wallX + dir * 30, this.groundY - 58, 0.34, 10, true);
          this.spawnGroundCrackNetwork(gutHitX, this.groundY, 150, 7, 1.15);
          this.spawnDebrisBurst(gutHitX, this.groundY, 12, 0.85);
          this.spawnVfxAnim(0, gutHitX, this.groundY - 92, 224, 224, 0.34, {
            flipX: dir < 0,
            inFront: true
          });
          this.spawnVfxAnim(6, gutHitX, this.groundY - 92, 178, 178, 0.28, {
            inFront: true
          });
          this.fx?.spawn('tempestBurst', this._safeFxX(gutHitX, game), this.groundY - 92, {
            extra: { radius: 66 }
          });
          for (const dy of [-55, -18, 18, 52]) {
            this.spawnTempestBolt(gutHitX, this.groundY - 92, wallX, this.groundY - 92 + dy, 0.28, 15);
          }
          this._shockWall = { x: wallX, groundY: this.groundY, age: 0, maxLife: 1.75, dir };

          this._applyTempestStrike(enemy, game, {
            damage: 95,
            reachFront: 220,
            reachBack: 60,
            hitStop: 0.055,
            shakeDur: 0.20,
            knockX: 210,
            knockY: -36,
            isCrit: true,
            sfx: 'thunder_slam',
            tier: 'TRUE_ULTIMATE'
          });
          if (foeAlive && !enemy.isColossalBoss) {
            enemy.stunTimer = Math.max(enemy.stunTimer || 0, 1.85);
            enemy.x = this._clampArenaX(wallX - dir * 18, game);
            enemy.vx = 0;
          }
          game?.renderer?.triggerShake?.(14, 0.20);
        }
        // Step smoothly into wide deep horse-stance charge spot
        const backU = Math.min(1, (t - 0.30) / 0.36);
        if (backU > 0) {
          const e = 1 - Math.pow(1 - backU, 2.0);
          this.x = this._trueUltGutX + (this._trueUltChargeX - this._trueUltGutX) * e;
        }
      }
      return;
    }

    // ==================== ACT 2 (0.66..1.90s): RAIJIN TOMOE MANDALA & ONE-INCH FIST SINGULARITY ====================
    if (t < 1.90) {
      const cu = Math.min(1, (t - 0.66) / 1.24);
      this.x = this._trueUltChargeX;
      this.facing = dir;
      this.trueUltFrameOverride = 138 + Math.min(3, Math.floor(cu * 4));
      this._overrideFrameIdx = this.trueUltFrameOverride;

      // Grand 6-Drum Raijin High Crown + crisp Row 7 Tomoe Mandala BEHIND Raijin (NEVER covers his face/body!)
      this._raijinDrumsAlpha = Math.min(1, cu * 2.4);
      // Compact blinding One-Inch Singularity right on his chambered hip-fist!
      this._fistChargeCore = {
        x: this.x - dir * 16,
        y: this.groundY - 82,
        u: cu,
        alpha: Math.min(1, cu * 2.0)
      };

      if (this._trueUltStage < 2) {
        this._trueUltStage = 2;
        this.spawnGroundSeal(this.x, this.groundY, 156, 1.32);
        this.spawnGroundCrackNetwork(this.x, this.groundY, 195, 9, 1.45);
        this.spawnDebrisBurst(this.x, this.groundY, 10, 0.65);
        // Lossless 30fps Row 7 Spinning Raijin Tomoe Drum Storm-Crest Mandala behind Raijin's shoulders!
        this.spawnVfxAnim(7, this.x - dir * 4, this.groundY - 102, 276, 276, 1.28, {
          inFront: false,
          followOwner: true,
          offsetX: -4,
          offsetY: -102
        });
        this.fx?.spawn('tempestCrater', this._safeFxX(this.x, game), this.groundY - 4, {
          extra: { rx: 92, ry: 20 }
        });
        game?.audio?.playHeroVoice?.(this.heroId, 'true_ult_charge', {
          worldX: this.x,
          speakerKey: this,
          priority: 4,
          cooldownMs: 300,
          duckSfx: true
        });
        game?.renderer?.triggerShake?.(9, 0.30);
      }

      // Pin opponent crackling against the Thunder Shock-Barrier + 2 electric pressure micro-ticks (keeps combo live!)
      if (foeAlive && !enemy.isColossalBoss) {
        enemy.stunTimer = Math.max(enemy.stunTimer || 0, 0.55);
        enemy.vx *= 0.5;
      }
      const zapTimes = [1.10, 1.52];
      while (this._shockWallZaps < zapTimes.length && t >= zapTimes[this._shockWallZaps]) {
        this._shockWallZaps++;
        const zx = foeAlive ? enemy.x : this._trueUltWallX;
        this.spawnLightningImpact(zx, this.groundY - 90, 96, 0.26, 6);
        this.spawnVfxAnim(6, zx, this.groundY - 90, 146, 146, 0.22, { inFront: true });
        this.spawnTempestBolt(zx - dir * 30, this.groundY - 260, zx, this.groundY - 90, 0.22, 16);
        this._applyTempestStrike(enemy, game, {
          damage: 25,
          reachFront: 460,
          reachBack: 120,
          hitStop: 0.022,
          shakeDur: 0.08,
          knockX: 6,
          knockY: -8,
          isCrit: false,
          sfx: 'slash',
          tier: 'TRUE_ULTIMATE'
        });
      }

      this.afterimageAccum += dt;
      if (this.afterimageAccum >= 0.072) {
        this.afterimageAccum = 0;
        // Lightning bolts rushing INWARD from across the storm arena & Raijin's 6 drums straight into his clenched hip-fist!
        const ang = Math.random() * Math.PI * 2;
        const rad = 165 + Math.random() * 125;
        const fistX = this.x - dir * 16;
        const fistY = this.groundY - 82;
        this.spawnTempestBolt(
          fistX + Math.cos(ang) * rad,
          fistY + Math.sin(ang) * rad * 0.62,
          fistX,
          fistY,
          0.18,
          15
        );
        // Periodic dramatic sky-to-ground lightning strike cracking behind the charge stance!
        if (Math.random() < 0.45) {
          const sx = this.x + (Math.random() - 0.5) * 340;
          this.spawnTempestBolt(sx, this.groundY - 420, sx + (Math.random() - 0.5) * 70, this.groundY - 6, 0.22, 22);
        }
        this._exParticles?.burst(fistX, fistY, {
          count: 6,
          shapes: ['bolt', 'star4', 'diamond'],
          speedMin: 45,
          speedMax: 145,
          upBias: 22,
          color: '#fbbf24',
          accent: '#38bdf8',
          core: '#ffffff',
          layer: 'front'
        });
      }
      return;
    }

    // ==================== ACT 3A (1.90..2.24s): MACH HORIZONTAL SONIC-BOOM RAIL-PUNCH ====================
    if (t < 2.24) {
      const pu = Math.min(1, (t - 1.90) / 0.34);
      const eased = 1 - Math.pow(1 - pu, 2.8);
      this.x = this._trueUltChargeX + (this._trueUltSkidX - this._trueUltChargeX) * eased;
      this.facing = dir;
      this.trueUltFrameOverride = 142 + Math.min(3, Math.floor(pu * 4));
      this._overrideFrameIdx = this.trueUltFrameOverride;
      this._raijinDrumsAlpha = Math.max(0, 1 - pu * 2.2);
      this._fistChargeCore = null;

      if (this._trueUltStage < 3) {
        this._trueUltStage = 3;
        this._shockWall = null;
        if (game?.audio) game.audio.play('storm_leap', this.x);
        const midX = (this._trueUltChargeX + this._trueUltSkidX) * 0.5;
        // High-speed Row 2 horizontal Mach wind-streaks + Row 3 sculpted pixel kinetic punch bursts across the rail!
        this.spawnVfxAnim(2, midX, this.groundY - 94, 480, 178, 0.52, {
          flipX: dir < 0,
          inFront: true
        });
        this.spawnVfxAnim(3, this._trueUltChargeX + dir * 130, this.groundY - 94, 240, 210, 0.34, {
          flipX: dir < 0,
          inFront: true
        });
        this.spawnVfxAnim(3, this._trueUltWallX, this.groundY - 94, 260, 220, 0.38, {
          flipX: dir < 0,
          inFront: true
        });
        this._sonicRail = {
          x0: this._trueUltChargeX - dir * 50,
          x1: this._trueUltSkidX + dir * 70,
          y: this.groundY - 94,
          age: 0,
          maxLife: 0.92,
          dir
        };
        // Spawn 5 stacked vertical expanding Sonic-Boom Pressure Rings along the horizontal Mach corridor!
        for (let r = 0; r < 5; r++) {
          const frac = (r + 0.5) / 5.2;
          this._sonicRings.push({
            x: this._trueUltChargeX + (this._trueUltSkidX - this._trueUltChargeX) * frac,
            y: this.groundY - 94,
            age: -r * 0.032,
            maxLife: 0.86,
            maxRy: 126 + r * 14,
            maxRx: 26 + r * 4,
            isGold: r % 2 === 0
          });
        }
      }

      this.afterimageAccum += dt;
      if (this.afterimageAccum >= 0.032) {
        this.afterimageAccum = 0;
        this.spawnAfterimage(this.x, this.y, dir, 4, 23, 0.38);
      }

      // Mid-corridor chest penetration impact (`t >= 2.02s`) — EPIC 'tempest' Anime Lightning-Shatter Impact Frame!
      if (this._trueUltStage === 3 && t >= 2.02) {
        this._trueUltStage = 4;
        this.didActionFrame = true;
        const hitX = foeAlive ? enemy.x : (this._trueUltChargeX + this._trueUltSkidX) * 0.5;
        game?.renderer?.triggerImpactFrame?.(hitX, this.groundY - 94, 0.18, 'tempest');
        game?.renderer?.triggerShake?.(30, 0.50);
        game?.renderer?.triggerHitStop?.(0.11);
        game?.audio?.playHeroVoice?.(this.heroId, 'true_ult_fire', {
          worldX: hitX,
          speakerKey: this,
          priority: 4,
          cooldownMs: 200,
          duckSfx: true
        });
        this.spawnLightningImpact(hitX, this.groundY - 94, 215, 0.54, 10);
        this.spawnThunderSlash(this._trueUltChargeX - dir * 40, this.groundY - 122, this._trueUltSkidX + dir * 90, this.groundY - 68, 0.44, 12, true);
        this.spawnThunderSlash(this._trueUltChargeX - dir * 20, this.groundY - 66, this._trueUltSkidX + dir * 70, this.groundY - 124, 0.42, 10, false);
        this.spawnGroundCrackNetwork(hitX, this.groundY, 210, 9, 1.35);
        this.spawnDebrisBurst(hitX, this.groundY, 18, 1.12);
        this.spawnVfxAnim(0, hitX, this.groundY - 94, 320, 320, 0.46, {
          flipX: dir < 0,
          inFront: true
        });
        this.spawnVfxAnim(6, hitX, this.groundY - 94, 290, 290, 0.36, {
          inFront: true
        });
        game?.vfx?.spawnShockwave?.(hitX, this.groundY - 94, 240, '#fbbf24', 0.38);
        this.fx?.spawn('tempestBurst', this._safeFxX(hitX, game), this.groundY - 94, {
          extra: { radius: 108 }
        });
        for (let b = 0; b < 8; b++) {
          const ang = (b / 8) * Math.PI * 2 + 0.25;
          this.spawnTempestBolt(
            hitX,
            this.groundY - 94,
            hitX + Math.cos(ang) * 210,
            this.groundY - 94 + Math.sin(ang) * 165,
            0.34,
            18
          );
        }
        this._exParticles?.burst(hitX, this.groundY - 94, {
          count: 28,
          shapes: ['bolt', 'star4', 'diamond'],
          speedMin: 130,
          speedMax: 340,
          upBias: 55,
          color: '#fbbf24',
          accent: '#38bdf8',
          core: '#ffffff',
          layer: 'front'
        });
        this._applyTempestStrike(enemy, game, {
          damage: 350,
          reachFront: 480,
          reachBack: 420,
          hitStop: 0.095,
          shakeDur: 0.28,
          knockX: 30,
          knockY: -40,
          isCrit: true,
          sfx: 'thunder_slam',
          tier: 'TRUE_ULTIMATE'
        });
      }
      return;
    }

    // ==================== ACT 3B/C (2.24..3.85s): HEROIC SKID-STOP & BEHIND-THE-BACK LIGHTNING CATACLYSM ====================
    this.x = this._trueUltSkidX;
    this.facing = dir;
    this._raijinDrumsAlpha = 0;
    this._fistChargeCore = null;

    if (t < 2.86) {
      this.trueUltFrameOverride = 145;
      this._overrideFrameIdx = 145;
      // Tension buildup (`2.24..2.74s`): unstable electric spider-web crackling across the opponent BEHIND Raijin!
      if (this._trueUltStage < 5) {
        this.afterimageAccum += dt;
        if (this.afterimageAccum >= 0.095) {
          this.afterimageAccum = 0;
          const bx = foeAlive ? enemy.x : this._clampArenaX(this._trueUltSkidX - dir * 170, game);
          const ang = Math.random() * Math.PI * 2;
          this.spawnTempestBolt(
            bx + Math.cos(ang) * 110,
            this.groundY - 94 + Math.sin(ang) * 84,
            bx - Math.cos(ang) * 70,
            this.groundY - 94 - Math.sin(ang) * 60,
            0.18,
            16
          );
          this._exParticles?.burst(bx, this.groundY - 94, {
            count: 6,
            shapes: ['bolt', 'star4'],
            speedMin: 60,
            speedMax: 180,
            upBias: 30,
            color: '#38bdf8',
            accent: '#fbbf24',
            core: '#ffffff',
            layer: 'front'
          });
        }
      }
    } else {
      const recU = Math.min(1, (t - 2.86) / Math.max(0.1, dur - 2.86));
      const recFrame = 146 + Math.min(3, Math.floor(recU * 4));
      this.trueUltFrameOverride = recFrame;
      this._overrideFrameIdx = recFrame;
    }

    if (this._trueUltStage < 5 && t >= 2.76) {
      this._trueUltStage = 5;
      const blastX = foeAlive ? enemy.x : this._clampArenaX(this._trueUltSkidX - dir * 170, game);
      // SECOND EPIC 'tempest' Anime Lightning-Shatter Impact Frame + Behind-the-Back Lightning Cataclysm!
      game?.renderer?.triggerImpactFrame?.(blastX, this.groundY - 94, 0.20, 'tempest');
      game?.renderer?.triggerShake?.(32, 0.55);
      game?.renderer?.triggerHitStop?.(0.11);
      game?.vfx?.spawnDecal?.(blastX, this.groundY, 'crater', 210);
      game?.vfx?.spawnShockwave?.(blastX, this.groundY - 94, 320, '#fbbf24', 0.48);
      game?.vfx?.spawnShockwave?.(blastX, this.groundY - 4, 360, '#38bdf8', 0.54);
      this.spawnLightningImpact(blastX, this.groundY - 94, 285, 0.92, 12);
      // Crossing Zenitsu-style razor thunderclap slash ribbons + shattering stone debris + glowing ground crack network!
      this.spawnThunderSlash(blastX - dir * 240, this.groundY - 210, blastX + dir * 110, this.groundY - 16, 0.72, 12, true);
      this.spawnThunderSlash(blastX - dir * 230, this.groundY - 18, blastX + dir * 105, this.groundY - 215, 0.72, 10, false);
      this.spawnThunderSlash(blastX - dir * 270, this.groundY - 96, blastX + dir * 115, this.groundY - 92, 0.66, 10, true);
      this.spawnGroundCrackNetwork(blastX, this.groundY, 260, 12, 1.65);
      this.spawnDebrisBurst(blastX, this.groundY, 26, 1.35);
      this.spawnVfxAnim(1, blastX, this.groundY - 148, 270, 340, 0.62, { flipX: dir < 0, inFront: true });
      this.spawnVfxAnim(0, blastX, this.groundY - 94, 340, 340, 0.50, { flipX: dir < 0, inFront: true });
      this.spawnVfxAnim(6, blastX, this.groundY - 94, 330, 330, 0.44, { inFront: true });
      this.spawnVfxAnim(5, blastX, this.groundY - 18, 420, 210, 0.88, { inFront: false });
      this.fx?.spawn('tempestBurst', this._safeFxX(blastX, game), this.groundY - 92, {
        extra: { radius: 120 }
      });
      this.fx?.spawn('tempestCrater', this._safeFxX(blastX, game), this.groundY - 6, {
        extra: { rx: 148, ry: 30 }
      });
      // Dual Diagonal Cross-Sky Thunderbolts converging straight into the detonation BEHIND Raijin's back!
      this.spawnTempestBolt(blastX - dir * 230, this.groundY - 430, blastX, this.groundY - 94, 0.46, 26);
      this.spawnTempestBolt(blastX + dir * 130, this.groundY - 430, blastX, this.groundY - 94, 0.46, 26);
      this.spawnTempestBolt(blastX - dir * 140, this.groundY - 420, blastX - dir * 20, this.groundY - 12, 0.44, 24);
      // Horizontal floor & chest-height lightning shock-fissures bursting cleanly BEHIND Raijin's back!
      for (const dyOff of [-144, -104, -64, -22]) {
        this.spawnTempestBolt(
          this._clampArenaX(blastX - dir * 250, game),
          this.groundY + dyOff + (Math.random() - 0.5) * 32,
          this._clampArenaX(blastX + dir * 88, game),
          this.groundY + dyOff + (Math.random() - 0.5) * 26,
          0.48,
          20
        );
      }
      this._exParticles?.burst(blastX, this.groundY - 86, {
        count: 48,
        shapes: ['bolt', 'star4', 'diamond'],
        speedMin: 140,
        speedMax: 420,
        upBias: 110,
        color: '#fbbf24',
        accent: '#38bdf8',
        core: '#ffffff',
        layer: 'front'
      });

      this._applyTempestStrike(enemy, game, {
        damage: 210,
        reachFront: 480,
        reachBack: 480,
        hitStop: 0.085,
        shakeDur: 0.30,
        knockX: 190,
        knockY: -140,
        isCrit: true,
        sfx: 'thunder_slam',
        tier: 'TRUE_ULTIMATE'
      });
    }

    if (t >= dur) {
      this.y = this.groundY;
      this.vy = 0;
      this.cameraAirLift = 0;
      this._trueUltDomainAlpha = 0;
      this._raijinDrumsAlpha = 0;
      this._fistChargeCore = null;
      this._sonicRings.length = 0;
      this._sonicRail = null;
      this._shockWall = null;
      this._shockWallZaps = 0;
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
    for (let i = this._sonicRings.length - 1; i >= 0; i--) {
      this._sonicRings[i].age += dt;
      if (this._sonicRings[i].age >= this._sonicRings[i].maxLife) this._sonicRings.splice(i, 1);
    }
    for (let i = this._lightningImpacts.length - 1; i >= 0; i--) {
      this._lightningImpacts[i].age += dt;
      if (this._lightningImpacts[i].age >= this._lightningImpacts[i].maxLife) this._lightningImpacts.splice(i, 1);
    }
    for (let i = this._groundCracks.length - 1; i >= 0; i--) {
      this._groundCracks[i].age += dt;
      if (this._groundCracks[i].age >= this._groundCracks[i].maxLife) this._groundCracks.splice(i, 1);
    }
    for (let i = this._debrisShards.length - 1; i >= 0; i--) {
      const d = this._debrisShards[i];
      d.age += dt;
      d.vy += 980 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      if (d.y > d.groundY - 2) {
        d.y = d.groundY - 2;
        d.vy = -Math.abs(d.vy) * 0.36;
        d.vx *= 0.68;
      }
      if (d.age >= d.maxLife) this._debrisShards.splice(i, 1);
    }
    for (let i = this._thunderSlashes.length - 1; i >= 0; i--) {
      this._thunderSlashes[i].age += dt;
      if (this._thunderSlashes[i].age >= this._thunderSlashes[i].maxLife) this._thunderSlashes.splice(i, 1);
    }
    if (this._sonicRail) {
      this._sonicRail.age += dt;
      if (this._sonicRail.age >= this._sonicRail.maxLife) this._sonicRail = null;
    }
    if (this._shockWall) {
      this._shockWall.age += dt;
      if (this._shockWall.age >= this._shockWall.maxLife) this._shockWall = null;
    }
    if (this.state !== 'TRUE_ULTIMATE') {
      if (this._trueUltDomainAlpha > 0) this._trueUltDomainAlpha = Math.max(0, this._trueUltDomainAlpha - dt * 2.4);
      if (this._raijinDrumsAlpha > 0) this._raijinDrumsAlpha = Math.max(0, this._raijinDrumsAlpha - dt * 3.0);
      this._fistChargeCore = null;
    }
    for (let i = this.groundSeals.length - 1; i >= 0; i--) {
      this.groundSeals[i].age += dt;
      if (this.groundSeals[i].age >= this.groundSeals[i].maxLife) this.groundSeals.splice(i, 1);
    }

    this.fx?.update(dt);
    this._exParticles?.update(dt);

    super.update(dt, enemy, game);
  }

  _drawBloomGlow(ctx, renderer, x, y, w, h, color = '#fbbf24', alpha = 0.42) {
    if (!renderer?.getGlowForColor || alpha <= 0.01) return;
    const glowTex = renderer.getGlowForColor(color);
    if (!glowTex) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.drawImage(glowTex, Math.round(x - w * 0.5), Math.round(y - h * 0.5), Math.round(w), Math.round(h));
    ctx.restore();
  }

  _drawVfxLayer(ctx, sprites, inFront, renderer = null) {
    const vfxSheet = PixelForge.ensureImage?.(sprites?.vfx) || sprites?.vfx;
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;
    for (let i = 0; i < this.activeVfxAnims.length; i++) {
      const a = this.activeVfxAnims[i];
      if (Boolean(a.inFront) !== inFront) continue;
      const u = Math.min(0.999, Math.max(0, a.age / Math.max(0.001, a.maxLife)));
      const fade = u > 0.78 ? Math.max(0, (1 - u) / 0.22) : 1.0;
      const col = Math.min(a.endFrame, a.startFrame + Math.floor(u * (a.endFrame - a.startFrame + 1)));
      const sx = col * 208;
      const sy = a.row * 208;
      const cx = Math.round(a.x);
      const cy = Math.round(a.y);
      const dw = Math.round(a.w);
      const dh = Math.round(a.h);
      const glowCol = a.row === 1 || a.row === 2 || a.row === 5 ? '#38bdf8' : '#fbbf24';

      // 1. Radiant HD-2D radial glow lightmap behind the pixel VFX cell
      this._drawBloomGlow(ctx, renderer, cx, cy, dw * 1.65, dh * 1.65, glowCol, 0.34 * fade);
      if (a.row === 0 || a.row === 6 || a.row === 7) {
        this._drawBloomGlow(ctx, renderer, cx, cy, dw * 1.15, dh * 1.15, '#fbbf24', 0.28 * fade);
      }

      // 2. Crisp nearest-neighbor VFX sprite blit + additive 'lighter' luminescence bloom pass!
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(cx, cy);
      if (a.flipX) ctx.scale(-1, 1);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = Math.min(1, 0.96 * fade);
      ctx.drawImage(vfxSheet, sx, sy, 208, 208, Math.round(-dw * 0.5), Math.round(-dh * 0.5), dw, dh);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(0.42, 0.36 * fade);
      ctx.drawImage(vfxSheet, sx, sy, 208, 208, Math.round(-dw * 0.5), Math.round(-dh * 0.5), dw, dh);
      ctx.restore();
    }
  }

  _drawGroundSeals(ctx, renderer = null) {
    for (let i = 0; i < this.groundSeals.length; i++) {
      const s = this.groundSeals[i];
      const u = Math.min(1, s.age / Math.max(0.001, s.maxLife));
      const env = Math.sin(u * Math.PI);
      if (env <= 0.02) continue;
      const rx = s.radius * (0.65 + 0.35 * u);
      const ry = Math.max(6, rx * 0.22);
      this._drawBloomGlow(ctx, renderer, s.x, s.groundY - 4, rx * 3.0, ry * 4.2, '#38bdf8', 0.32 * env);
      this._drawBloomGlow(ctx, renderer, s.x, s.groundY - 4, rx * 2.1, ry * 2.8, '#fbbf24', 0.38 * env);
      drawExBayerHalo(ctx, s.x, s.groundY - 2, rx, ry, '#6366f1', '#fbbf24', 0.28 * env);
      const steps = 28;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.85 * env;
      for (let k = 0; k < steps; k++) {
        const ang = (k / steps) * Math.PI * 2 + u * 2.2;
        const px = Math.round((s.x + Math.cos(ang) * rx) / 2) * 2;
        const py = Math.round((s.groundY - 2 + Math.sin(ang) * ry) / 2) * 2;
        ctx.fillStyle = k % 3 === 0 ? '#ffffff' : k % 2 === 0 ? '#fbbf24' : '#38bdf8';
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

    // Soft upper-vault storm atmosphere glow (NO blocky cloud rectangles cluttering cathedral architecture!)
    const flashIdx = Math.floor(t * 7.5);
    const stormPulse = flashIdx % 3 === 0 ? 1.0 : 0.38;
    if (renderer) {
      this._drawBloomGlow(ctx, renderer, cx - 220, gy - 350, 560, 220, '#38bdf8', 0.20 * stormPulse * a);
      this._drawBloomGlow(ctx, renderer, cx + 220, gy - 340, 560, 220, '#6366f1', 0.24 * stormPulse * a);
      if (flashIdx % 3 === 0) {
        this._drawBloomGlow(ctx, renderer, cx, gy - 330, 620, 240, '#fbbf24', 0.16 * a);
      }
    }

    // Horizontal anime Mach speedlines & vacuum wind-streaks (top & bottom dramatic framing!)
    const dir = this._trueUltFacing || this.facing || 1;
    const isMachDash = Boolean(this._sonicRail);
    ctx.globalCompositeOperation = 'lighter';
    const streakCount = isMachDash ? 34 : 22;
    for (let i = 0; i < streakCount; i++) {
      const speed = isMachDash ? 1850 : 940;
      const len = isMachDash ? 42 + (i % 4) * 26 : 18 + (i % 4) * 12;
      const rx = Math.round(cx - 680 + (((i * 197 - Math.floor(t * speed * dir)) % 1360) + 1360) % 1360);
      const inBand = i < 12;
      const ry = inBand
        ? (i % 2 === 0 ? Math.round(gy - 372 + (i * 9)) : Math.round(gy - 22 - (i * 5)))
        : Math.round(gy - 36 - ((i * 47) % 310));
      ctx.globalAlpha = (inBand ? 0.56 : 0.38) * a;
      ctx.fillStyle = i % 3 === 0 ? '#fef08a' : i % 2 === 0 ? '#38bdf8' : '#818cf8';
      ctx.fillRect(rx, ry, len, 2);
    }
    ctx.globalCompositeOperation = 'source-over';

    // Periodic distant horizon forked sky-lightning flashes behind the fighters
    if (flashIdx % 3 === 0) {
      const bx = Math.round(cx + Math.sin(flashIdx * 3.7) * 340);
      drawTempestPixelBolt(ctx, bx, gy - 410, bx + Math.sin(flashIdx) * 52, gy - 34, 8, 22, flashIdx * 11, 0.52 * a);
    }
    ctx.restore();

    // Act 1 -> Act 2: Crisp Multi-Strand Electric Containment Lattice + HD-2D Bloom pinning staggered opponent!
    if (this._shockWall) {
      const sw = this._shockWall;
      const sa = Math.min(1, sw.age * 8) * Math.max(0, 1 - Math.max(0, sw.age - (sw.maxLife - 0.25)) / 0.25);
      if (sa > 0.02) {
        const wx = Math.round(sw.x);
        const wgy = Math.round(sw.groundY);
        const sdir = sw.dir || 1;
        this._drawBloomGlow(ctx, renderer, wx, wgy - 108, 210, 330, '#38bdf8', 0.44 * sa);
        this._drawBloomGlow(ctx, renderer, wx, wgy - 108, 120, 260, '#fbbf24', 0.32 * sa);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalCompositeOperation = 'lighter';
        // Concave containment barrier column + horizontal electric diamond lattice
        ctx.globalAlpha = 0.34 * sa;
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(wx - 16, wgy - 216, 32, 216);
        ctx.globalAlpha = 0.46 * sa;
        ctx.fillStyle = '#6366f1';
        ctx.fillRect(wx - 8, wgy - 216, 16, 216);
        ctx.globalAlpha = 0.90 * sa;
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(wx - 2, wgy - 216, 4, 216);
        // Crisp 2px pixel containment lattice crossbars & ground lock plate
        const scanShift = Math.floor(t * 22) % 16;
        for (let py = wgy - 208 + scanShift; py < wgy - 8; py += 16) {
          ctx.globalAlpha = 0.80 * sa;
          ctx.fillStyle = (py & 16) ? '#38bdf8' : '#fbbf24';
          ctx.fillRect(wx - 18, py, 36, 2);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(wx - 6, py, 12, 2);
        }
        // Ground clamp ring under containment wall
        ctx.globalAlpha = 0.86 * sa;
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(wx - 30, wgy - 4, 60, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(wx - 16, wgy - 3, 32, 2);
        ctx.restore();
        drawTempestPixelBolt(ctx, wx - sdir * 6, wgy - 218, wx + sdir * 4, wgy, 6, 14, Math.floor(t * 24) * 7, 0.95 * sa);
        drawTempestPixelBolt(ctx, wx + sdir * 8, wgy - 214, wx - sdir * 6, wgy - 4, 5, 10, Math.floor(t * 24) * 13 + 3, 0.78 * sa);
      }
    }

    // Act 2: Majestic High 6-Drum Raijin Crown + Golden-Indigo HD-2D Bloom Aura BEHIND & ABOVE Raijin!
    if (this._raijinDrumsAlpha > 0.02) {
      const da = this._raijinDrumsAlpha;
      const arcCx = Math.round(this.x - dir * 4);
      const arcCy = Math.round(this.y - 110);
      const drumR = 132;
      const drumPts = [];
      // Radiant golden-azure Thunder-God bloom illuminating the storm backdrop behind Raijin!
      this._drawBloomGlow(ctx, renderer, arcCx, arcCy + 10, 460, 400, '#38bdf8', 0.34 * da);
      this._drawBloomGlow(ctx, renderer, arcCx, arcCy + 8, 340, 320, '#fbbf24', 0.42 * da);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      // Counter-rotating dashed Raijin electric circuit rings + orbiting pixel diamond glyphs behind Tomoe Mandala!
      ctx.globalCompositeOperation = 'lighter';
      for (let ring = 0; ring < 2; ring++) {
        const rad = ring === 0 ? 114 : 148;
        const rot = t * (ring === 0 ? 1.8 : -1.35);
        const segs = ring === 0 ? 36 : 48;
        for (let k = 0; k < segs; k++) {
          if (k % 3 === 2) continue;
          const a0 = rot + (k / segs) * Math.PI * 2;
          const px = Math.round((arcCx + Math.cos(a0) * rad) / 2) * 2;
          const py = Math.round((arcCy + 6 + Math.sin(a0) * rad * 0.92) / 2) * 2;
          ctx.globalAlpha = (ring === 0 ? 0.62 : 0.44) * da;
          ctx.fillStyle = ring === 0 ? '#38bdf8' : '#fbbf24';
          ctx.fillRect(px - 1, py - 1, 2, 2);
        }
        // 4 crisp orbiting diamond glyph nodes on each circuit ring
        for (let g = 0; g < 4; g++) {
          const ga = rot * 1.4 + (g * Math.PI) / 2;
          const gx = Math.round((arcCx + Math.cos(ga) * rad) / 2) * 2;
          const gy2 = Math.round((arcCy + 6 + Math.sin(ga) * rad * 0.92) / 2) * 2;
          ctx.globalAlpha = 0.85 * da;
          ctx.fillStyle = ring === 0 ? '#fef08a' : '#bae6fd';
          ctx.fillRect(gx - 4, gy2 - 1, 8, 2);
          ctx.fillRect(gx - 1, gy2 - 4, 2, 8);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(gx - 1, gy2 - 1, 2, 2);
        }
      }
      ctx.globalCompositeOperation = 'source-over';
      for (let d = 0; d < 6; d++) {
        // High sweeping crown (-160° .. -20°) framing Raijin from cleanly above & outside!
        const ang = (-160 + d * 28) * (Math.PI / 180) + Math.sin(t * 3.2) * 0.035;
        const dx = Math.round((arcCx + Math.cos(ang) * drumR) / 2) * 2;
        const dy = Math.round((arcCy + Math.sin(ang) * drumR * 0.84) / 2) * 2;
        drumPts.push([dx, dy]);
        // Warm golden halo blooming around each taiko drum
        this._drawBloomGlow(ctx, renderer, dx, dy, 84, 84, '#fbbf24', 0.40 * da);
        // Crisp 2px-stepped pixel Taiko Drum (ornate dark indigo rim -> bronze -> gold -> parchment -> spinning tomoe!)
        const fillDrum = (r, hex, alp) => {
          ctx.globalAlpha = alp * da;
          ctx.fillStyle = hex;
          ctx.fillRect(dx - r, dy - Math.round(r * 0.6), r * 2, Math.round(r * 1.2));
          ctx.fillRect(dx - Math.round(r * 0.6), dy - r, Math.round(r * 1.2), r * 2);
        };
        fillDrum(12, '#141242', 0.96);
        fillDrum(10, '#d97706', 0.96);
        fillDrum(8, '#fef08a', 0.96);
        // Dark-indigo spinning tomoe comma core + white highlight pip
        const ta = t * 5.2 + d * 1.05;
        ctx.globalAlpha = 0.96 * da;
        ctx.fillStyle = '#141242';
        ctx.fillRect(dx + Math.round(Math.cos(ta) * 2) - 2, dy + Math.round(Math.sin(ta) * 2) - 2, 4, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(dx - Math.round(Math.cos(ta) * 3) - 1, dy - Math.round(Math.sin(ta) * 3) - 1, 2, 2);
      }
      ctx.restore();
      for (let d = 0; d < drumPts.length - 1; d++) {
        drawTempestPixelBolt(
          ctx,
          drumPts[d][0],
          drumPts[d][1],
          drumPts[d + 1][0],
          drumPts[d + 1][1],
          5,
          7,
          Math.floor(t * 22) + d * 13,
          0.90 * da
        );
      }
    }
  }

  _drawFistChargeCore(ctx, renderer = null) {
    const fc = this._fistChargeCore;
    if (!fc || fc.alpha <= 0.02) return;
    const fx = Math.round(fc.x / 2) * 2;
    const fy = Math.round(fc.y / 2) * 2;
    const a = fc.alpha;
    const u = fc.u || 0;
    const t = this.stateTimer || 0;

    // Intense pulsing super-charged HD-2D bloom orb right at his chambered hip-fist!
    const pulse = 1 + Math.sin(t * 24) * 0.14;
    this._drawBloomGlow(ctx, renderer, fx, fy, (150 + u * 90) * pulse, (150 + u * 90) * pulse, '#38bdf8', 0.52 * a);
    this._drawBloomGlow(ctx, renderer, fx, fy, (96 + u * 64) * pulse, (96 + u * 64) * pulse, '#fbbf24', 0.72 * a);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = 'lighter';

    // 2 rapidly contracting electric-azure/gold compression rings pulling INWARD into his clenched hip-fist!
    for (let ringIdx = 0; ringIdx < 2; ringIdx++) {
      const cyc = (t * 2.4 + ringIdx * 0.5) % 1.0;
      const rad = Math.round((1 - cyc) * 46 + 8);
      const rAlp = Math.sin(cyc * Math.PI) * 0.92 * a;
      if (rAlp <= 0.04) continue;
      const steps = 24;
      for (let k = 0; k < steps; k++) {
        const ang = (k / steps) * Math.PI * 2 + t * 4;
        const px = Math.round((fx + Math.cos(ang) * rad) / 2) * 2;
        const py = Math.round((fy + Math.sin(ang) * rad) / 2) * 2;
        ctx.globalAlpha = rAlp;
        ctx.fillStyle = ringIdx === 0 ? '#38bdf8' : '#fbbf24';
        ctx.fillRect(px - 2, py - 2, 4, 4);
      }
    }

    // Blinding compressed 4-point One-Inch Singularity Star right at his fist knuckle (compact <= 36px!)
    const arm = Math.round(16 + u * 20 + Math.sin(t * 28) * 3);
    ctx.globalAlpha = 0.92 * a;
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(fx - arm, fy - 2, arm * 2, 4);
    ctx.fillRect(fx - 2, fy - arm, 4, arm * 2);
    ctx.globalAlpha = 0.98 * a;
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(fx - Math.round(arm * 0.72), fy - 2, Math.round(arm * 1.44), 4);
    ctx.fillRect(fx - 2, fy - Math.round(arm * 0.72), 4, Math.round(arm * 1.44));
    // Hot white singularity diamond core
    ctx.globalAlpha = 1.0 * a;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(fx - 6, fy - 4, 12, 8);
    ctx.fillRect(fx - 4, fy - 6, 8, 12);
    ctx.restore();
  }

  _drawGroundCracks(ctx, renderer = null) {
    if (this._groundCracks.length === 0) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < this._groundCracks.length; i++) {
      const cr = this._groundCracks[i];
      const u = Math.min(1, cr.age / Math.max(0.01, cr.maxLife));
      const grow = Math.min(1, cr.age / 0.14);
      const fade = u > 0.65 ? Math.max(0, (1 - u) / 0.35) : 1.0;
      if (fade <= 0.02) continue;
      const pts = cr.pts;
      const maxSeg = Math.max(1, Math.ceil((pts.length - 1) * grow));
      const glowHex = cr.isGold ? '#fbbf24' : '#38bdf8';
      for (let s = 0; s < maxSeg; s++) {
        const [ax, ay] = pts[s];
        const [bx, by] = pts[s + 1];
        const segFrac = s === maxSeg - 1 ? Math.min(1, (pts.length - 1) * grow - s) : 1;
        const ex = ax + (bx - ax) * segFrac;
        const ey = ay + (by - ay) * segFrac;
        const steps = Math.max(3, Math.ceil(Math.hypot(ex - ax, ey - ay) / 2));
        for (let k = 0; k <= steps; k++) {
          const f = k / steps;
          const px = Math.round((ax + (ex - ax) * f) / 2) * 2;
          const py = Math.round((ay + (ey - ay) * f) / 2) * 2;
          // Dark shattered stone seam underneath
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = 0.78 * fade;
          ctx.fillStyle = '#090b18';
          ctx.fillRect(px - 2, py - 1, 4, 4);
          // Glowing electric fissure core inside the crack
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 0.84 * fade;
          ctx.fillStyle = glowHex;
          ctx.fillRect(px - 1, py - 1, 2, 2);
          if (k % 3 === 0) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(px, py, 2, 2);
          }
        }
        // Tiny electric embers drifting upward out of the cracked stone
        if (s >= 1 && s % 2 === 1 && fade > 0.25) {
          const rise = Math.round((cr.age * 42 + i * 7) % 24);
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 0.78 * fade * (1 - rise / 24);
          ctx.fillStyle = cr.isGold ? '#fef08a' : '#bae6fd';
          ctx.fillRect(Math.round(ex), Math.round(ey - rise), 2, 2);
        }
      }
      if (i % 4 === 0 && renderer) {
        this._drawBloomGlow(ctx, renderer, pts[0][0], pts[0][1], 140, 38, glowHex, 0.22 * fade);
      }
    }
    ctx.restore();
  }

  _drawDebrisShards(ctx) {
    if (this._debrisShards.length === 0) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < this._debrisShards.length; i++) {
      const d = this._debrisShards[i];
      const u = Math.min(1, d.age / Math.max(0.01, d.maxLife));
      const fade = u > 0.72 ? Math.max(0, (1 - u) / 0.28) : 1.0;
      if (fade <= 0.02) continue;
      const px = Math.round(d.x / 2) * 2;
      const py = Math.round(d.y / 2) * 2;
      // Dark sculpted cathedral stone slab + blazing golden/cyan electric rim highlight!
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.94 * fade;
      ctx.fillStyle = '#14122b';
      ctx.fillRect(px - (d.w >> 1), py - (d.h >> 1), d.w, d.h);
      ctx.fillStyle = '#334155';
      ctx.fillRect(px - (d.w >> 1), py - (d.h >> 1), d.w - 2, d.h - 2);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.92 * fade;
      ctx.fillStyle = d.rimHex;
      ctx.fillRect(px - (d.w >> 1), py - (d.h >> 1), d.w, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px - (d.w >> 1), py - (d.h >> 1), 2, 2);
    }
    ctx.restore();
  }

  _drawThunderSlashes(ctx, renderer = null) {
    if (this._thunderSlashes.length === 0) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < this._thunderSlashes.length; i++) {
      const sl = this._thunderSlashes[i];
      const u = Math.min(1, sl.age / Math.max(0.01, sl.maxLife));
      const env = u < 0.14 ? u / 0.14 : Math.max(0, 1 - (u - 0.14) / 0.86);
      if (env <= 0.02) continue;
      // Head sweeps rapidly (`0 -> 1` in first 28%), tail chases cleanly behind for anime ribbon feel!
      const headT = Math.min(1, u / 0.28);
      const tailT = Math.max(0, (u - 0.18) / 0.82);
      if (headT <= tailT + 0.02) continue;
      const dx = sl.x1 - sl.x0;
      const dy = sl.y1 - sl.y0;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const midT = (headT + tailT) * 0.5;
      const mx = sl.x0 + dx * midT;
      const my = sl.y0 + dy * midT;
      const edgeHex = sl.isGold ? '#fbbf24' : '#38bdf8';
      const innerHex = sl.isGold ? '#fef08a' : '#bae6fd';
      this._drawBloomGlow(ctx, renderer, mx, my, len * 0.72, 96, edgeHex, 0.30 * env);

      const segs = 36;
      ctx.globalCompositeOperation = 'lighter';
      for (let s = 0; s <= segs; s++) {
        const localF = s / segs;
        const t = tailT + (headT - tailT) * localF;
        // Slight graceful anime ribbon curve + razor taper to needle points at both ends!
        const bow = Math.sin(t * Math.PI) * 14 * (sl.isGold ? 1 : -1);
        const taper = Math.sin(localF * Math.PI);
        const halfW = Math.max(1, Math.round(sl.width * 0.5 * taper * env));
        const px = Math.round((sl.x0 + dx * t + nx * bow) / 2) * 2;
        const py = Math.round((sl.y0 + dy * t + ny * bow) / 2) * 2;
        // Electric edge ribbon
        ctx.globalAlpha = 0.72 * env * taper;
        ctx.fillStyle = edgeHex;
        ctx.fillRect(px - halfW, py - halfW, halfW * 2, halfW * 2);
        // Inner razor spine
        const coreW = Math.max(1, Math.round(halfW * 0.48));
        ctx.globalAlpha = 0.94 * env * taper;
        ctx.fillStyle = innerHex;
        ctx.fillRect(px - coreW, py - coreW, coreW * 2, coreW * 2);
        ctx.globalAlpha = 1.0 * env;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px - 1, py - 1, 2, 2);
      }
    }
    ctx.restore();
  }

  _drawSonicTunnelPunch(ctx, renderer = null) {
    // Razor-tapered horizontal Mach Shock-Lance + Silky HD-2D Corridor Bloom!
    if (this._sonicRail) {
      const sr = this._sonicRail;
      const u = Math.min(1, sr.age / Math.max(0.01, sr.maxLife));
      const env = u < 0.10 ? u / 0.10 : Math.max(0, 1 - (u - 0.10) / 0.90);
      if (env > 0.02) {
        const minX = Math.round(Math.min(sr.x0, sr.x1));
        const spanW = Math.max(80, Math.round(Math.abs(sr.x1 - sr.x0)));
        const midX = minX + spanW * 0.5;
        const ry = Math.round(sr.y);
        const hOuter = Math.max(4, Math.round(28 * env));
        const hMid = Math.max(2, Math.round(14 * env));
        const hCore = Math.max(2, Math.round(6 * env));

        // Silky horizontal HD-2D electric corridor glow lighting up the entire arena (NO thick white wall!)
        this._drawBloomGlow(ctx, renderer, midX, ry, spanW * 1.32, 180 * env + 60, '#38bdf8', 0.44 * env);
        this._drawBloomGlow(ctx, renderer, midX, ry, spanW * 1.12, 108 * env + 36, '#fbbf24', 0.48 * env);

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalCompositeOperation = 'lighter';
        // Draw razor-tapered pixel lance segments (needle tips at both ends!)
        const segs = 32;
        const segW = Math.ceil(spanW / segs);
        for (let s = 0; s < segs; s++) {
          const f = (s + 0.5) / segs;
          const endTaper = Math.min(1, Math.min(f, 1 - f) / 0.20);
          const sx = minX + Math.round((s / segs) * spanW);
          const ho = Math.max(2, Math.round((hOuter * endTaper) / 2) * 2);
          const hm = Math.max(2, Math.round((hMid * endTaper) / 2) * 2);
          const hc = Math.max(2, Math.round((hCore * endTaper) / 2) * 2);
          ctx.globalAlpha = 0.52 * env * endTaper;
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(sx, ry - Math.round(ho * 0.5), segW, ho);
          ctx.globalAlpha = 0.84 * env * endTaper;
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(sx, ry - Math.round(hm * 0.5), segW, hm);
          ctx.globalAlpha = 0.98 * env * endTaper;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(sx, ry - Math.round(hc * 0.5), segW, hc);
        }
        // Razor horizontal Mach air-shear filaments flanking top & bottom of the rail
        for (let i = 0; i < 8; i++) {
          const syOff = (i % 2 === 0 ? -1 : 1) * (Math.round(hOuter * 0.65) + 10 + (i * 6));
          const sx = minX + 20 + ((i * 89 + Math.floor(sr.age * 820)) % Math.max(60, spanW - 96));
          ctx.globalAlpha = 0.78 * env;
          ctx.fillStyle = i % 2 === 0 ? '#fef08a' : '#38bdf8';
          ctx.fillRect(sx, ry + syOff, 58, 2);
        }
        ctx.restore();
        // Twin razor-thin forked crackling lightning filaments spiraling along the Mach corridor!
        drawTempestPixelBolt(ctx, sr.x0 + 28, ry - 12, sr.x1 - 28, ry - 10, 10, 11, Math.floor(sr.age * 28) * 5, 0.88 * env, { rimColor: '#38bdf8' });
        drawTempestPixelBolt(ctx, sr.x0 + 28, ry + 12, sr.x1 - 28, ry + 10, 10, 11, Math.floor(sr.age * 28) * 11 + 7, 0.88 * env, { rimColor: '#fbbf24' });
      }
    }

    // 5 Stacked Vertical Expanding Razor-Sharp 2px Sonic-Boom Pressure Rings + Silky Halos!
    if (this._sonicRings.length > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < this._sonicRings.length; i++) {
        const rg = this._sonicRings[i];
        if (rg.age < 0) continue;
        const u = Math.min(1, rg.age / Math.max(0.01, rg.maxLife));
        const env = u < 0.12 ? u / 0.12 : Math.max(0, 1 - (u - 0.12) / 0.88);
        if (env <= 0.02) continue;
        const rx = 8 + u * rg.maxRx;
        const ry = 26 + Math.pow(u, 0.62) * rg.maxRy;
        this._drawBloomGlow(ctx, renderer, rg.x, rg.y, rx * 4.8, ry * 2.3, rg.isGold ? '#fbbf24' : '#38bdf8', 0.24 * env);
        const steps = 120;
        for (let k = 0; k < steps; k++) {
          const ang = (k / steps) * Math.PI * 2;
          const px = Math.round((rg.x + Math.cos(ang) * rx) / 2) * 2;
          const py = Math.round((rg.y + Math.sin(ang) * ry) / 2) * 2;
          ctx.globalAlpha = 0.68 * env;
          ctx.fillStyle = rg.isGold ? '#fbbf24' : '#38bdf8';
          ctx.fillRect(px - 2, py - 2, 4, 4);
          ctx.globalAlpha = 0.98 * env;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(px - 1, py - 1, 2, 2);
        }
      }
      ctx.restore();
    }
  }

  _drawLightningImpacts(ctx, renderer = null) {
    if (this._lightningImpacts.length === 0) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < this._lightningImpacts.length; i++) {
      const imp = this._lightningImpacts[i];
      const u = Math.min(1, imp.age / Math.max(0.01, imp.maxLife));
      const env = u < 0.14 ? u / 0.14 : Math.max(0, 1 - (u - 0.14) / 0.86);
      if (env <= 0.02) continue;
      const cx = imp.x;
      const cy = imp.y;
      const curR = 24 + Math.pow(u, 0.56) * imp.maxR;

      // 0. SILKY MULTI-LAYER HD-2D RADIANT BLOOM LIGHTMAPS illuminating the arena, floor & cathedral!
      this._drawBloomGlow(ctx, renderer, cx, cy, curR * 3.8, curR * 3.3, '#38bdf8', 0.56 * env);
      this._drawBloomGlow(ctx, renderer, cx, cy, curR * 2.5, curR * 2.2, '#fbbf24', 0.64 * env);
      if (u < 0.80) {
        const coreB = Math.pow(1 - u / 0.80, 0.85);
        this._drawBloomGlow(ctx, renderer, cx, cy, curR * 1.5, curR * 1.5, '#fef08a', 0.78 * coreB);
      }

      // 1. Razor-Tapered Needle-Tip 4-Point Anime Lens-Flare Cross (`u < 0.55`)
      ctx.globalCompositeOperation = 'lighter';
      if (u < 0.55) {
        const coreEnv = 1 - u / 0.55;
        const flareW = Math.round(imp.maxR * (1.2 + u * 0.95) * coreEnv);
        const flareH = Math.round(imp.maxR * (0.85 + u * 0.65) * coreEnv);
        const segs = 12;
        for (let s = 0; s < segs; s++) {
          const f0 = s / segs;
          const f1 = (s + 1) / segs;
          const fall = Math.pow(1 - f0, 1.5);
          const hh = Math.max(1, Math.round(6 * fall));
          const x0 = Math.round(flareW * f0);
          const x1 = Math.round(flareW * f1);
          const dx = Math.max(2, x1 - x0);
          ctx.globalAlpha = 0.76 * coreEnv * fall;
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(cx + x0, cy - hh, dx, hh * 2);
          ctx.fillRect(cx - x1, cy - hh, dx, hh * 2);
          ctx.globalAlpha = 0.98 * coreEnv * fall;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(cx + x0, cy - 1, dx, 2);
          ctx.fillRect(cx - x1, cy - 1, dx, 2);

          const y0 = Math.round(flareH * f0);
          const y1 = Math.round(flareH * f1);
          const dy = Math.max(2, y1 - y0);
          ctx.globalAlpha = 0.76 * coreEnv * fall;
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(cx - hh, cy + y0, hh * 2, dy);
          ctx.fillRect(cx - hh, cy - y1, hh * 2, dy);
          ctx.globalAlpha = 0.98 * coreEnv * fall;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(cx - 1, cy + y0, 2, dy);
          ctx.fillRect(cx - 1, cy - y1, 2, dy);
        }
        const cr = Math.round(12 + 16 * coreEnv);
        ctx.globalAlpha = 0.95 * coreEnv;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - cr, cy - Math.round(cr * 0.5), cr * 2, Math.round(cr));
        ctx.fillRect(cx - Math.round(cr * 0.5), cy - cr, Math.round(cr), cr * 2);
      }

      // 2. Crisp Razor-Thin Dual Expanding Jagged Electric Wave-Fronts (`2px` white + `4px` rim — ZERO thick ring blobs!)
      const ringSteps = 148;
      const tick = Math.floor(imp.age * 32);
      for (let k = 0; k < ringSteps; k++) {
        const ang = (k / ringSteps) * Math.PI * 2;
        const jag1 = Math.sin(k * 7.3 + imp.seed + tick) * (4 + 7 * env);
        const r1 = curR + jag1;
        const px1 = Math.round((cx + Math.cos(ang) * r1) / 2) * 2;
        const py1 = Math.round((cy + Math.sin(ang) * r1 * 0.88) / 2) * 2;
        ctx.globalAlpha = 0.76 * env;
        ctx.fillStyle = k % 2 === 0 ? '#38bdf8' : '#fbbf24';
        ctx.fillRect(px1 - 2, py1 - 2, 4, 4);
        ctx.globalAlpha = 0.98 * env;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px1 - 1, py1 - 1, 2, 2);

        if (k % 3 !== 2) {
          const r2 = curR * 0.68 - jag1 * 0.5;
          const px2 = Math.round((cx + Math.cos(ang) * r2) / 2) * 2;
          const py2 = Math.round((cy + Math.sin(ang) * r2 * 0.88) / 2) * 2;
          ctx.globalAlpha = 0.72 * env;
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(px2 - 1, py2 - 1, 2, 2);
        }
      }

      // 3. Razor-Sharp Fractal-Forked Radial Lightning Bolts exploding outward from core!
      const rays = imp.rayCount || 10;
      for (let r = 0; r < rays; r++) {
        const ang = (r / rays) * Math.PI * 2 + (imp.seed % 7) * 0.19;
        const rayLen = curR * (0.86 + (r % 3) * 0.24);
        const startR = curR * 0.14;
        drawTempestPixelBolt(
          ctx,
          cx + Math.cos(ang) * startR,
          cy + Math.sin(ang) * startR * 0.88,
          cx + Math.cos(ang) * rayLen,
          cy + Math.sin(ang) * rayLen * 0.88,
          7,
          16 + Math.round(env * 8),
          imp.seed + r * 17 + tick * 3,
          0.92 * env,
          { rimColor: r % 2 === 0 ? '#38bdf8' : '#fbbf24' }
        );
      }
    }
    ctx.restore();
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
      this._drawBloomGlow(ctx, renderer, Math.round(this.x), Math.round(this.groundY - 4), 170, 56, '#fbbf24', 0.24);
      drawExBayerHalo(ctx, Math.round(this.x), Math.round(this.groundY - 4), 52, 16, '#6366f1', '#fbbf24', 0.18);
    }

    this._drawGroundSeals(ctx, renderer);
    this._drawGroundCracks(ctx, renderer);
    this._exParticles?.renderBack(ctx);
    if (this.fx && !this.isDead) {
      this.fx.renderLayer(ctx, 'back', arenaCenterX, this.groundY, 0.96);
    }
    this._drawVfxLayer(ctx, sprites, false, renderer);

    // Static Barrier subtle rim aura when Iron-Body shield is active
    if (!this.isDead && this.staticBarrier > 0 && this.staticBarrierTimer > 0) {
      this._drawBloomGlow(ctx, renderer, Math.round(this.x), Math.round(this.y - 84), 170, 210, '#38bdf8', 0.26);
      drawExBayerHalo(ctx, Math.round(this.x), Math.round(this.y - 84), 52, 68, '#6366f1', '#fef08a', 0.20);
    }

    // Golden-indigo lightning afterimages behind character
    if (this.afterimages.length > 0 && sheet && sheet.complete && sheet.naturalWidth) {
      for (let i = 0; i < this.afterimages.length; i++) {
        const g = this.afterimages[i];
        const alpha = Math.max(0, (1 - g.life / g.maxLife) * 0.52);
        if (alpha <= 0.02) continue;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(Math.round(g.x / 2) * 2, Math.round((g.y + 4) / 2) * 2);
        ctx.scale(g.facing, 1);
        ctx.globalAlpha = alpha;
        PixelForge.drawSilhouetteFrame(ctx, sprites, g.frameIdx, 208, 208, i % 2 === 0 ? '#fbbf24' : '#38bdf8');
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
    this._drawDebrisShards(ctx);
    this._drawSonicTunnelPunch(ctx, renderer);
    this._drawThunderSlashes(ctx, renderer);
    this._drawLightningImpacts(ctx, renderer);
    this._drawFistChargeCore(ctx, renderer);
    this._drawVfxLayer(ctx, sprites, true, renderer);

    for (let i = 0; i < this.tempestBolts.length; i++) {
      const b = this.tempestBolts[i];
      const alpha = Math.max(0, 1 - b.age / Math.max(0.001, b.maxLife));
      drawTempestPixelBolt(ctx, b.x0, b.y0, b.x1, b.y1, 8, b.jag, b.seed, alpha);
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
