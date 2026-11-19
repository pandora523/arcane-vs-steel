import { Fighter } from './Fighter.js?v=30fps157';
import { PixelForge } from '../engine/PixelForge.js?v=30fps157';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps157';
import {
  VALKYRIE_EFFECT_REGISTRY,
  VALKYRIE_CRIMSON_PALETTE,
  VALKYRIE_GOLD_PALETTE
} from '../engine/shaders/valkyrieShaders.js?v=30fps157';

const AUTO_SLICES_EX = [
  [60, 8], // Beat 1 (V0, 0.36s): Supersonic Gungnir Lightning-Javelin + Valhalla Rune Seal -> snaps at F03 (63)
  [68, 7], // Beat 2 (V1, 0.34s): Twin Angled Valkyrie Lightning-Javelin Volley -> snaps at F09 (69)
  [75, 8], // Beat 3 (V2, 0.38s): Coaxial Valhalla Lock-On + Remote Sky-Spear (2-hit) -> snaps at F17/F18 (77/78)
  [83, 7]  // Beat 4 (V3, 0.52s): -38px 6-Winged Backstep-Vault -> Sky-Gate Triple Javelin Rain (3-hit) -> snaps at F25 (85)
];

const BEAT_DURATIONS = [0.36, 0.34, 0.38, 0.52];
const INTRA_COMBO_LINK = 0.015;

const RAGNAROK_STORM_PALETTE = [
  '#18051a',
  '#4a044e',
  '#86198f',
  '#be185d',
  '#f43f5e',
  '#f472b6',
  '#fde047',
  '#ffffff'
];

const EINHERJAR_AEGIS_PALETTE = [
  '#081426',
  '#1e3a8a',
  '#0284c7',
  '#38bdf8',
  '#7dd3fc',
  '#fbbf24',
  '#fef08a',
  '#ffffff'
];

// 4x4 Ordered Bayer Stipple Matrix for crisp pixel-pure crimson-gold halos (alpha <= 0.18, zero blurry radial glow!)
const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5]
];

function drawBayerCrimsonGoldHalo(ctx, cx, cy, rx, ry, hexColor, alpha = 0.16, step = 4) {
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

function drawPixelGoldenWingFeather(ctx, x, y, phase = 0, isCrimson = false, alpha = 0.94) {
  if (alpha <= 0.02) return;
  const px = Math.round(x / 2) * 2;
  const py = Math.round(y / 2) * 2;
  const tilt = Math.sin(phase) >= 0 ? 2 : -2;
  ctx.save();
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.fillStyle = '#0a0610';
  ctx.fillRect(px - 4, py - 2, 10, 6);
  ctx.fillStyle = isCrimson ? '#fb7185' : '#fbbf24';
  ctx.fillRect(px - 2, py, 6, 2);
  ctx.fillRect(px, py - 2, 4, 2);
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(px + tilt, py, 2, 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(px + 2, py - 2, 2, 2);
  ctx.restore();
}

function drawValhallaStarGlint(ctx, x, y, arm = 6, accentHex = '#fbbf24', alpha = 0.95) {
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

function drawPixelSteppedLightningChain(ctx, x0, y0, x1, y1, seedPhase = 0, outerHex = '#fb7185', coreHex = '#fef08a', alpha = 0.92) {
  if (alpha <= 0.02) return;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  if (dist < 6) return;
  const nx = -dy / dist;
  const ny = dx / dist;
  const segs = Math.max(5, Math.min(18, Math.round(dist / 18)));

  let prevX = Math.round(x0 / 2) * 2;
  let prevY = Math.round(y0 / 2) * 2;

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  for (let i = 1; i <= segs; i++) {
    const u = i / segs;
    const env = Math.sin(u * Math.PI);
    const zig = (((i + Math.floor(seedPhase * 12)) % 2) === 0 ? 1 : -1) * env * 9;
    const curX = Math.round((x0 + dx * u + nx * zig) / 2) * 2;
    const curY = Math.round((y0 + dy * u + ny * zig) / 2) * 2;

    const steps = Math.max(2, Math.round(Math.max(Math.abs(curX - prevX), Math.abs(curY - prevY)) / 2));
    for (let k = 0; k <= steps; k++) {
      const su = k / steps;
      const sx = Math.round((prevX + (curX - prevX) * su) / 2) * 2;
      const sy = Math.round((prevY + (curY - prevY) * su) / 2) * 2;
      ctx.globalAlpha = Math.min(1, alpha * 0.72);
      ctx.fillStyle = outerHex;
      ctx.fillRect(sx - 2, sy - 2, 6, 6);
      ctx.globalAlpha = Math.min(1, alpha);
      ctx.fillStyle = k % 3 === 0 ? '#ffffff' : coreHex;
      ctx.fillRect(sx, sy, 2, 2);
    }
    prevX = curX;
    prevY = curY;
  }
  ctx.restore();
}

function drawSteppedAngledGungnirLance(ctx, x, y, angle = 0, length = 112, alpha = 0.96, isUlt = false) {
  if (alpha <= 0.02) return;
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const nx = -uy;
  const ny = ux;
  const halfLen = Math.round(length * 0.5);
  const shaftColor = isUlt ? '#fbbf24' : '#f59e0b';
  const rimColor = isUlt ? '#fb7185' : '#e11d48';

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = Math.min(1, alpha);

  // Stepped-pixel Gungnir shaft + outer crimson-gold aura along projectile trajectory
  for (let s = -halfLen; s <= halfLen - 18; s += 2) {
    const px = Math.round((x + ux * s) / 2) * 2;
    const py = Math.round((y + uy * s) / 2) * 2;
    ctx.fillStyle = '#180814';
    ctx.fillRect(px - 2, py - 2, 6, 6);
    ctx.fillStyle = s % 6 === 0 ? '#ffffff' : shaftColor;
    ctx.fillRect(px, py, 2, 2);
    if (s % 4 === 0) {
      const rx = Math.round((x + ux * s + nx * 3) / 2) * 2;
      const ry = Math.round((y + uy * s + ny * 3) / 2) * 2;
      ctx.fillStyle = rimColor;
      ctx.fillRect(rx, ry, 2, 2);
    }
  }

  // Twin Swept Winged Odin Collar Guards (`fillRect` stepped wing-barbs, ZERO ctx.rotate)
  const guardBase = halfLen - 22;
  for (let w = 2; w <= 12; w += 2) {
    const spread = w;
    const sweepBack = w * 0.85;
    for (const side of [-1, 1]) {
      const wx = Math.round((x + ux * (guardBase - sweepBack) + nx * (side * spread)) / 2) * 2;
      const wy = Math.round((y + uy * (guardBase - sweepBack) + ny * (side * spread)) / 2) * 2;
      ctx.fillStyle = '#0f0612';
      ctx.fillRect(wx - 2, wy - 2, 6, 6);
      ctx.fillStyle = w >= 8 ? '#ffffff' : w >= 4 ? '#fbbf24' : rimColor;
      ctx.fillRect(wx, wy, 4, 4);
    }
  }

  // Razor-sharp Broadened Winged Odin Spearhead (`fillRect` stepped chevron tip)
  for (let s = halfLen - 18; s <= halfLen + 4; s += 2) {
    const u = (s - (halfLen - 18)) / 22;
    const halfW = Math.max(0, Math.round((1 - u) * 7));
    for (let o = -halfW; o <= halfW; o += 2) {
      const tx = Math.round((x + ux * s + nx * o) / 2) * 2;
      const ty = Math.round((y + uy * s + ny * o) / 2) * 2;
      ctx.fillStyle = Math.abs(o) <= 2 ? '#ffffff' : u < 0.45 ? '#fbbf24' : '#fde047';
      ctx.fillRect(tx, ty, 2, 2);
    }
  }

  ctx.restore();
}

/**
 * Freyja EX (`valkyrie_ex`) - Newly Born `520px` Valhalla Sky-Javelin Sovereign.
 * Next-Gen Wide-Canvas (`320x240`, `anchorX=112, anchorY=230`) True Long-Range Sky-Lancer Champion.
 * Hurls Supersonic Crimson-Gold Gungnir Lightning-Javelins & Valhalla Target-Rune Seals,
 * Valhalla Lightning Javelins (chain-linked triple javelin detonation),
 * Bahamut Valkyrie Sanctuary (6-wing sky ascent + Dragon-Crest + 5 converging Sky-Lances),
 * and Twilight of Ragnarok: Bifrost Gungnir (multi-band Bifrost Sky-Gate + 8 Einherjar Lances + Falcon Dive).
 * Coexists 100% independently alongside classic Freyja (`valkyrie`).
 */
export class ValkyrieEx extends Fighter {
  constructor(x, groundY, facing = 1) {
    const opts = typeof x === 'object' && x !== null ? x : { x, groundY, facing };
    super({
      ...opts,
      name: opts.name || 'Freyja EX',
      maxHp: 4000,
      moveSpeed: 210,
      attackRange: 520,
      autoInterval: 0.94,
      lightColor: 'rgba(244, 63, 94, 1)',
      primaryColor: '#f43f5e',
      hasTrueUltimate: true,
      trueUltName: 'TWILIGHT OF RAGNAROK: BIFROST GUNGNIR',
      trueUltDuration: 4.35
    });

    this.heroId = 'valkyrie_ex';
    this.secondaryColor = '#fbbf24';
    this.deathSfx = 'death_valkyrie';
    this.theme = 'crimson';
    this.hasPoise = true;

    this.autoDuration = BEAT_DURATIONS[0];
    this._postFlurryInterval = 1.20;
    this.skillName = 'VALHALLA LIGHTNING JAVELINS';
    this.skillTriggerRange = 560;
    this.skillMaxCooldown = 4.45;
    this.skillCooldown = 1.20;
    this.skillDuration = 0.98;

    this.ultName = 'BAHAMUT VALKYRIE SANCTUARY';
    this.ultSub = 'DRAGON-CREST & FIVE CONVERGING SKY-LANCES';
    this.ultDuration = 1.88;

    this.hasTrueUltimate = true;
    this.trueUltName = 'TWILIGHT OF RAGNAROK: BIFROST GUNGNIR';
    this.trueUltSub = 'BIFROST SKY-GATE, EIGHT LANCES & FALCON DIVE';
    this.trueUltDuration = 4.35;

    this.dodgeMaxCooldown = 3.15;
    this.dashMaxCooldown = 3.05;
    this.crouchCooldown = 0;
    this.crouchDuration = 0.68;
    this.dashDuration = 0.36;
    this.vaultCooldown = 0;

    // 4-Beat Long-Range Valhalla Sky-Javelin Sovereign State
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
    this._overrideFrameIdx = null;

    this.hoverOffset = 0;
    this.divePitchRad = 0;
    this.cameraAirLift = 0;
    this._phaseThroughEnemy = false;
    this.dragoonTargetX = null;
    this.activeSkySpears = [];
    this.plantedSkillJavelins = [];
    this.sanctuarySkyLances = [];
    this.bahamutAvatar = null;
    this.afterimages = [];
    this.afterimageSpawnAccum = 0;
    this.activeVfxAnims = [];
    this.pixelWingFeathers = [];
    this.valhallaStarGlints = [];
    this.ambientFeatherAccum = 0;
    this._ultTargetX = 600;
    this.stepTimer = 0;

    // Supreme Ultimate (`TWILIGHT OF RAGNAROK: BIFROST GUNGNIR`) state
    this._trueUltInit = false;
    this._trueUltStep = 0;
    this._trueUltLancesSpawned = 0;
    this._trueUltTargetX = 600;
    this.ragnarokSeal = null;
    this.einherjarSkyLances = [];
    this.ragnarokDiveBeam = null;
    this.ragnarokPillars = [];

    this.fx = new ArcaneShaderFX(VALKYRIE_EFFECT_REGISTRY, {
      pixelScale: 3,
      viewW: 720,
      viewH: 460,
      topRatio: 0.78
    });

    if (typeof Image !== 'undefined') {
      this.getExSprites();
      PixelForge.ensureHeroLoaded?.('valkyrie_ex');
    }

    this._volleySlot = null;
    this._drewSpearFocus = false;
    this._deathBurstTriggered = false;
  }

  getAiStyleProfile() {
    return {
      comboGoal: 4,
      sweetMin: 310,
      sweetMax: 375,
      counterCrouchBias: 0.52,
      midLeapMin: 225,
      midLeapMax: 385,
      midLeapChance: 0.32,
      postStyle: 'sky_lancer'
    };
  }

  isHackAndSlashMelee() {
    return false;
  }

  applySovereignAspectStats(aspect) {
    if (aspect === 1) {
      this.maxHp = 3760;
      this.hp = this.maxHp;
      this.moveSpeed = 216;
      this._postFlurryInterval = 1.18;
    } else if (aspect === 2) {
      this.maxHp = 3740;
      this.hp = this.maxHp;
      this.moveSpeed = 194;
      this.dodgeMaxCooldown = 2.95;
      this._postFlurryInterval = 1.44;
    }
  }

  getExSprites() {
    if (typeof Image === 'undefined') return null;
    const assets = PixelForge.initAssets?.();
    if (!assets) return null;
    if (!assets.valkyrie_ex) {
      const mkImg = (src) => {
        const img = new Image();
        img._origSrc = src;
        img.src = src;
        return img;
      };
      assets.valkyrie_ex = {
        sheet: mkImg('assets/sprites/valkyrie_ex_sheet.png?v=30fps157'),
        vfx: mkImg('assets/sprites/valkyrie_ex_vfx.png?v=30fps157'),
        portrait: mkImg('assets/sprites/valkyrie_ex_portrait.png?v=30fps157'),
        cellW: 320,
        cellH: 240,
        anchorX: 112,
        anchorY: 230
      };
    } else {
      PixelForge.ensureHeroLoaded?.('valkyrie_ex');
    }
    return assets.valkyrie_ex;
  }

  _safeFxX(xv, game) {
    const g = game || this.game;
    const ww = g?.renderer ? g.renderer.worldWidth : 1200;
    return Math.max(48, Math.min(ww - 48, xv));
  }

  _safeFxY(yv) {
    return Math.max(-180, Math.min(this.groundY + 18, yv));
  }

  _resolveShaderCenterX(renderer) {
    const ww = renderer?.worldWidth || 1200;
    if (ww > 2400) {
      return Number.isFinite(renderer?.camX) ? renderer.camX : this.x;
    }
    return ww * 0.5;
  }

  setState(newState) {
    const prevState = this.state;
    this._phaseThroughEnemy = false;
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

    if (
      newState !== 'SKILL' &&
      newState !== 'ULTIMATE' &&
      newState !== 'TRUE_ULTIMATE' &&
      newState !== 'DASH'
    ) {
      this.divePitchRad = 0;
    }
    if (
      newState !== 'CROUCH' &&
      newState !== 'JUMP' &&
      newState !== 'DASH' &&
      newState !== 'SKILL' &&
      newState !== 'ULTIMATE' &&
      newState !== 'TRUE_ULTIMATE'
    ) {
      this.fx?.stopByKey('valkyrieSlipstreamTrail');
    }
    if (newState !== 'SKILL' && newState !== 'ULTIMATE' && newState !== 'TRUE_ULTIMATE') {
      this.fx?.stopByKey('valkyrieHaloArray');
    }
    if (
      newState !== 'JUMP' &&
      newState !== 'SKILL' &&
      newState !== 'ULTIMATE' &&
      newState !== 'TRUE_ULTIMATE'
    ) {
      this.fx?.stopByKey('valkyrieWingPlume');
    }

    this._drewSpearFocus = false;

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
      this._skillJavelinsFired = 0;
      this._skillOriginX = this.x;
      this._skillSkimTargetX = this.x;
      this._skillHopTargetX = this.x;
      this._skillStep = 0;
      this.plantedSkillJavelins = [];
      this.skillCooldown = Math.max(this.skillCooldown || 0, this.skillMaxCooldown);
    } else {
      this.plantedSkillJavelins = [];
    }

    if (newState === 'ULTIMATE') {
      this._spearsFired = 0;
      this._ultOriginX = this.x;
      this._ultStep = 0;
      this._ultPassCone1 = false;
      this._ultPassCone3 = false;
      this._ultRetreatDir = undefined;
      this._ultLandX = undefined;
      this._ultWaypoints = null;
      this._phaseThroughEnemy = false;
      this.sanctuarySkyLances = [];
      this.trueUltFrameOverride = 210;
      this.isInvulnerable = true;
    } else {
      this.sanctuarySkyLances = [];
      this._ultPassCone1 = false;
      this._ultPassCone3 = false;
      this._ultRetreatDir = undefined;
      this._ultLandX = undefined;
    }

    if (newState === 'TRUE_ULTIMATE') {
      this._trueUltInit = false;
      this._trueUltStep = 0;
      this._trueUltLancesSpawned = 0;
      this.ragnarokSeal = null;
      this.einherjarSkyLances = [];
      this.ragnarokDiveBeam = null;
      this.ragnarokPillars = [];
      this.trueUltFrameOverride = 120;
      this.isInvulnerable = true;
      this.unstoppablePoise = true;
    } else {
      this._trueUltInit = false;
      this.ragnarokSeal = null;
      this.einherjarSkyLances = [];
      this.ragnarokDiveBeam = null;
      this.ragnarokPillars = [];
      this.cameraAirLift = 0;
      if (newState !== 'AUTO_ATTACK') {
        this.unstoppablePoise = false;
      }
    }

    if (newState === 'DEATH') {
      this.fx?.clear();
      this._volleySlot = null;
      this.bahamutAvatar = null;
      this.ragnarokSeal = null;
      this.einherjarSkyLances = [];
      this.plantedSkillJavelins = [];
      this.sanctuarySkyLances = [];
      this.ragnarokDiveBeam = null;
      this.ragnarokPillars = [];
      this.cameraAirLift = 0;
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      this.unstoppablePoise = false;
    }
  }

  _clampArenaX(xv, game, margin = 82) {
    const g = game || this.game;
    const advBounds =
      g?.adventure?.active && typeof g.adventure.getActiveStageBounds === 'function'
        ? g.adventure.getActiveStageBounds()
        : null;
    const minX =
      g?.adventure?.lockActive && Number.isFinite(g.adventure.lockMinX)
        ? g.adventure.lockMinX + 24
        : advBounds
          ? advBounds.minX + 44
          : margin;
    const ww = g?.renderer ? g.renderer.worldWidth : 1200;
    const rawMaxX =
      g?.adventure?.lockActive && Number.isFinite(g.adventure.lockMaxX)
        ? g.adventure.lockMaxX - 24
        : advBounds
          ? advBounds.maxX - 44
          : ww - margin;
    const bossAlive = Boolean(
      g?.adventure?.bossEntity &&
        !g.adventure.bossEntity.isDead &&
        g.adventure.bossEntity.isColossalBoss
    );
    const maxX = bossAlive
      ? Math.min(rawMaxX, (g.adventure.bossEntity.anchorX || 9335) - 92)
      : rawMaxX;
    return Math.max(minX, Math.min(maxX, xv));
  }

  getActiveEnemies(enemy, game) {
    const list = game?.getEnemiesOf ? game.getEnemiesOf(this) : enemy ? [enemy] : [];
    const seen = new Set();
    const out = [];
    const pushFoe = (f) => {
      if (!f || f === this || f.isDead || f.isBenched || seen.has(f)) return;
      seen.add(f);
      out.push(f);
    };
    pushFoe(enemy);
    for (let i = 0; i < list.length; i++) pushFoe(list[i]);
    if (game?.adventure?.active) {
      if (Array.isArray(game.adventure.enemies)) {
        for (let i = 0; i < game.adventure.enemies.length; i++) pushFoe(game.adventure.enemies[i]);
      }
      if (game.adventure.bossEntity) pushFoe(game.adventure.bossEntity);
    }
    return out;
  }

  /**
   * Initializes one beat (`0..3`) of Freyja EX's 4-beat `520px` Valhalla Sky-Javelin chain:
   * - Maintains `310..375px` Sky-Lancer sweet-spot (`-24px` retreat when `dist < 215`)!
   * - Executes her signature **`-38px` 6-Winged Backstep-Vault on `V3`**!
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
    this._comboPersistTimer = 0.76;
    this.unstoppablePoise = v >= 2;

    const startFrame = AUTO_SLICES_EX[v][0];
    this.trueUltFrameOverride = startFrame;
    this._overrideFrameIdx = startFrame;

    const enemy = this._currentEnemy || null;
    if (enemy && !enemy.isDead && !enemy.isDummyFocal) {
      this.facing = enemy.x >= this.x ? 1 : -1;
    }

    this._beatStartX = this.x;
    let desiredX = this.x;
    if (v === 3) {
      // Signature -38px 6-winged backstep-vault on V3!
      desiredX = this.x - this.facing * 38;
    } else if (enemy && !enemy.isDead) {
      const dist = Math.abs(enemy.x - this.x);
      if (dist < 215) {
        desiredX = this.x - this.facing * 24;
      } else if (dist > 430) {
        desiredX = this.x + this.facing * 14;
      } else {
        desiredX = this.x + this.facing * (v === 2 ? 8 : 5);
      }
    } else {
      desiredX = this.x + this.facing * 6;
    }

    this._beatTargetX = this._clampArenaX(desiredX, game, 80);
  }

  queueNextComboBeat() {
    this._queuedNextBeat = true;
  }

  spawnFeatherBurst(x, y, count = 6, speed = 135, crimsonMix = true) {
    for (let i = 0; i < count; i++) {
      if (this.pixelWingFeathers.length >= 96) this.pixelWingFeathers.shift();
      const ang = (i / Math.max(1, count)) * Math.PI * 2 + 0.25;
      const spd = speed * (0.52 + (i % 3) * 0.24);
      this.pixelWingFeathers.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 42,
        phase: i * 1.1,
        isCrimson: crimsonMix && i % 3 === 1,
        age: 0,
        maxLife: 0.42 + (i % 3) * 0.10
      });
    }
  }

  spawnValhallaGlint(x, y, arm = 8, hex = '#fbbf24', maxLife = 0.24) {
    if (this.valhallaStarGlints.length >= 84) this.valhallaStarGlints.shift();
    this.valhallaStarGlints.push({
      x,
      y,
      arm,
      hex,
      age: 0,
      maxLife
    });
  }

  takeDamage(amount, attacker, isCrit = false, knockX = 95, knockY = 0) {
    super.takeDamage(amount, attacker, isCrit, knockX, knockY);

    if (this.isDead && !this._deathBurstTriggered) {
      this._deathBurstTriggered = true;
      this.fx.spawn('valhallaGroundBurst', this._safeFxX(this.x), this._safeFxY(this.groundY), {
        palette: VALKYRIE_GOLD_PALETTE,
        light: 1.08,
        extra: { radius: 30 }
      });
      this.fx.spawn('gungnirImpactStarburst', this._safeFxX(this.x), this._safeFxY(this.groundY - 66), {
        flip: false,
        palette: VALKYRIE_CRIMSON_PALETTE,
        light: 1.05,
        extra: { aimAngle: -Math.PI * 0.5, isCrit: true }
      });
    }
  }

  spawnAfterimage(x, y, facing, row = 6, col = 14, maxLife = 0.22) {
    if (this.afterimages.length >= 16) this.afterimages.shift();
    this.afterimages.push({
      x,
      y,
      facing,
      frameIdx: row * 30 + (col % 30),
      age: 0,
      maxLife
    });
  }

  spawnVfxAnim(row, x, y, w = 208, h = 208, maxLife = 0.40, opts = {}) {
    if (this.activeVfxAnims.length >= 24) this.activeVfxAnims.shift();
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
      glowColor: opts.glowColor || 'crimson',
      followOwner: Boolean(opts.followOwner),
      offsetX: opts.offsetX || 0,
      offsetY: opts.offsetY || 0,
      inFront: Boolean(opts.inFront)
    });
  }

  /**
   * Fires a supersonic Crimson-Gold `'dragon_lance'` Gungnir Lightning-Javelin across the arena!
   */
  fireDragonLanceShock(game, opts = {}) {
    const dir = opts.dir ?? this.facing;
    const spawnX = opts.x ?? this.x + dir * 84;
    const spawnY = opts.y ?? this.y - 92;
    const dmg = opts.damage ?? 34;
    const hitStop = opts.hitStop ?? 0.044;

    this._hitStopTimer = Math.max(this._hitStopTimer || 0, hitStop);
    this.didActionFrame = true;

    const proj = {
      x: spawnX,
      y: spawnY,
      vx: dir * (opts.speed ?? 785),
      vy: opts.vy ?? 0,
      radius: opts.radius ?? 22,
      damage: dmg,
      owner: this,
      color: '#f43f5e',
      coreColor: '#fde047',
      type: 'dragon_lance',
      pierce: opts.pierce !== false,
      isUltimate: Boolean(opts.isUltimate),
      maxRange: opts.maxRange ?? 610,
      onHit: (target) => {
        this._hitStopTimer = Math.max(this._hitStopTimer || 0, hitStop);
        if (target && !target.isDead && !target.isColossalBoss) {
          target._hitShakeTimer = Math.max(target._hitShakeTimer || 0, 0.056);
        }
        const hx = target ? target.x : spawnX;
        const hy = (target ? target.y : this.groundY) - 92;
        this.spawnFeatherBurst(hx, hy, 5, 145, true);
        this.spawnValhallaGlint(hx, hy, 8, '#fbbf24', 0.22);
        this.spawnVfxAnim(4, hx, hy, 172, 172, 0.22, {
          flipX: dir < 0,
          glowColor: 'gold',
          inFront: true
        });
      }
    };

    if (game?.vfx?.spawnProjectile) {
      game.vfx.spawnProjectile(proj);
    } else if (game?.spawnProjectile) {
      game.spawnProjectile(proj);
    }

    this.spawnVfxAnim(5, spawnX, spawnY, 108, 152, 0.20, {
      flipX: dir < 0,
      glowColor: 'gold',
      inFront: true
    });
    this.spawnValhallaGlint(spawnX + dir * 10, spawnY, 8, '#fef08a', 0.20);
  }

  onProjectileTrail(proj) {
    if (!proj) return;
    proj._trailAcc = (proj._trailAcc || 0) + 0.016;
    if (proj._trailAcc >= 0.056) {
      proj._trailAcc = 0;
      const dir = Math.sign(proj.vx || this.facing || 1);
      const tx = proj.x - dir * 16;
      if (this.pixelWingFeathers.length < 96) {
        this.pixelWingFeathers.push({
          x: tx,
          y: proj.y + ((Math.round(proj.x) % 3) - 1) * 6,
          vx: -dir * 32,
          vy: -18,
          phase: proj.x * 0.05,
          isCrimson: Math.round(proj.x) % 2 === 0,
          age: 0,
          maxLife: 0.24
        });
      }
      this.spawnValhallaGlint(tx, proj.y, 4, '#fef08a', 0.14);
    }
  }

  ensureBezierVolleySlot() {
    const safeAx = Math.round(this._safeFxX(this.x) / 3) * 3;
    const safeAy = Math.round(this._safeFxY(this.groundY) / 3) * 3;
    if (this._volleySlot && this.fx.active.includes(this._volleySlot)) {
      this._volleySlot.worldX = safeAx;
      this._volleySlot.worldY = safeAy;
      return;
    }
    this._volleySlot = this.fx.spawn('gungnirBezierVolley', safeAx, safeAy, {
      flip: false,
      palette: VALKYRIE_CRIMSON_PALETTE,
      light: 1.15,
      extra: {
        spears: this.activeSkySpears,
        getOrigin: () => ({
          x: this._volleySlot ? this._volleySlot.worldX : safeAx,
          y: this._volleySlot ? this._volleySlot.worldY : safeAy
        }),
        scale: 3
      }
    });
  }

  spawnGungnirSkySpear(
    startX,
    startY,
    targetX,
    targetY,
    damage = 22,
    isUlt = false,
    arcSpread = null,
    verticalArc = null,
    rootDur = 0
  ) {
    const spread =
      arcSpread !== null
        ? arcSpread
        : (Math.random() - 0.5) * (isUlt ? 160 : 88);
    const vArc =
      verticalArc !== null
        ? verticalArc
        : isUlt
          ? -38 + (Math.random() - 0.5) * 44
          : -26 + (Math.random() - 0.5) * 24;
    const flightDuration = isUlt ? 0.34 : 0.24;
    const ctrlX = startX + (targetX - startX) * 0.46 + spread * 0.35;
    const midY = (startY + targetY) * 0.5;
    const ctrlY = Math.max(this.groundY - 210, Math.min(this.groundY - 26, midY + vArc));

    if (!isUlt) {
      this._hitStopTimer = Math.max(this._hitStopTimer || 0, 0.042);
    }
    this.didActionFrame = true;

    this.activeSkySpears.push({
      startX,
      startY,
      ctrlX,
      ctrlY,
      targetX,
      targetY,
      spreadOffset: (Math.random() - 0.5) * 28,
      x: startX,
      y: startY,
      angle: targetX >= startX ? 0 : Math.PI,
      damage,
      isUlt,
      rootDur,
      age: 0,
      wakeAccum: 0,
      flightDuration,
      maxLife: flightDuration + 0.06,
      trail: [{ x: startX, y: startY }],
      spiralPhase: Math.random() * Math.PI * 2,
      hitTargets: new Set()
    });

    this.ensureBezierVolleySlot();
  }

  update(dt, enemy, game) {
    this.game = game || this.game;
    this._currentEnemy = enemy;
    if (this.crouchCooldown > 0) this.crouchCooldown = Math.max(0, this.crouchCooldown - dt);
    if (this.vaultCooldown > 0) this.vaultCooldown = Math.max(0, this.vaultCooldown - dt);
    if (this._comboPersistTimer > 0 && this.state !== 'AUTO_ATTACK') {
      this._comboPersistTimer = Math.max(0, this._comboPersistTimer - dt);
    }

    // Subtle ambient golden wing-feather drift
    if (!this.isDead) {
      this.ambientFeatherAccum += dt;
      if (this.ambientFeatherAccum >= 0.28) {
        this.ambientFeatherAccum = 0;
        if (this.pixelWingFeathers.length < 96) {
          this.pixelWingFeathers.push({
            x: this.x - this.facing * 22 + ((Math.round(this.x) % 3) - 1) * 8,
            y: this.y - 118,
            vx: -this.facing * 18,
            vy: 26,
            phase: (this.walkPhase || 0) * 2.0,
            isCrimson: Math.random() < 0.35,
            age: 0,
            maxLife: 0.48
          });
        }
      }
    }

    for (let i = this.pixelWingFeathers.length - 1; i >= 0; i--) {
      const f = this.pixelWingFeathers[i];
      f.age += dt;
      f.phase += dt * 8.0;
      f.x += (f.vx + Math.sin(f.phase) * 18) * dt;
      f.y += f.vy * dt;
      f.vy += 90 * dt;
      if (f.age >= f.maxLife) this.pixelWingFeathers.splice(i, 1);
    }
    for (let i = this.valhallaStarGlints.length - 1; i >= 0; i--) {
      this.valhallaStarGlints[i].age += dt;
      if (this.valhallaStarGlints[i].age >= this.valhallaStarGlints[i].maxLife) {
        this.valhallaStarGlints.splice(i, 1);
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

    if (this.bahamutAvatar) {
      this.bahamutAvatar.life += dt;
      this.bahamutAvatar.x = this.x;
      this.bahamutAvatar.y = this.y;
      if (
        this.bahamutAvatar.life >= this.bahamutAvatar.maxLife ||
        (this.state !== 'ULTIMATE' && this.state !== 'TRUE_ULTIMATE')
      ) {
        this.bahamutAvatar = null;
      }
    }

    if (!this.isDead && this.state === 'WALK') {
      this.stepTimer += dt;
      if (this.stepTimer >= 0.34) {
        this.stepTimer = 0;
        if (game?.audio) game.audio.play('footstep_steel', this.x);
      }
    }

    // Update Active Shallow-Curving Gungnir Sky-Javelins
    if (this.activeSkySpears.length > 0 && game) {
      this.ensureBezierVolleySlot();
      const ww = game.renderer ? game.renderer.worldWidth : 1600;
      const targets = this.getActiveEnemies(enemy, game);
      for (let i = this.activeSkySpears.length - 1; i >= 0; i--) {
        const sp = this.activeSkySpears[i];
        sp.age += dt;
        const u = Math.min(1, sp.age / Math.max(0.05, sp.flightDuration));

        if (u < 0.55 && enemy && !enemy.isDead) {
          const desiredTx = Math.max(85, Math.min(ww - 85, enemy.x + sp.spreadOffset));
          const desiredTy = Math.min(this.groundY - 28, enemy.y - (sp.isUlt ? 48 : 72));
          sp.targetX += (desiredTx - sp.targetX) * Math.min(1, dt * 8.0);
          sp.targetY += (desiredTy - sp.targetY) * Math.min(1, dt * 8.0);
        }

        const tB = Math.min(1, u * (0.65 + 0.35 * u));
        const invT = 1 - tB;

        const prevX = sp.x;
        const prevY = sp.y;
        sp.x = invT * invT * sp.startX + 2 * invT * tB * sp.ctrlX + tB * tB * sp.targetX;
        sp.y = invT * invT * sp.startY + 2 * invT * tB * sp.ctrlY + tB * tB * sp.targetY;

        const dxB = 2 * invT * (sp.ctrlX - sp.startX) + 2 * tB * (sp.targetX - sp.ctrlX);
        const dyB = 2 * invT * (sp.ctrlY - sp.startY) + 2 * tB * (sp.targetY - sp.ctrlY);
        if (Math.hypot(dxB, dyB) > 0.01) {
          sp.angle = Math.atan2(dyB, dxB);
        } else if (Math.hypot(sp.x - prevX, sp.y - prevY) > 0.01) {
          sp.angle = Math.atan2(sp.y - prevY, sp.x - prevX);
        }

        sp.trail.push({ x: sp.x, y: sp.y });
        if (sp.trail.length > 13) sp.trail.shift();

        sp.wakeAccum = (sp.wakeAccum || 0) + dt;
        if (sp.wakeAccum >= 0.042) {
          sp.wakeAccum = 0;
          this.spawnValhallaGlint(sp.x, sp.y, 4, '#fef08a', 0.14);
        }

        let hitSomeone = false;
        for (const tFoe of targets) {
          if (tFoe && !tFoe.isDead && !tFoe.isBenched && !sp.hitTargets.has(tFoe)) {
            if (Math.abs(tFoe.x - sp.x) < 76 && Math.abs(tFoe.y - 68 - sp.y) < 96) {
              sp.hitTargets.add(tFoe);
              hitSomeone = true;
              const prevTier = this._activeHitTier;
              if (sp.isUlt && prevTier !== 'TRUE_ULTIMATE') {
                this._activeHitTier = 'ULTIMATE';
              }
              try {
                tFoe.takeDamage(sp.damage, this, sp.isUlt, 52, sp.isUlt ? -95 : -38);
              } finally {
                this._activeHitTier = prevTier;
              }
              if (sp.rootDur > 0 && !tFoe.isDead) {
                tFoe.applyBuildRoot?.(sp.rootDur, 'GUNGNIR PIN!', '#fb7185');
              }
              if (!tFoe.isColossalBoss) {
                tFoe._hitShakeTimer = Math.max(tFoe._hitShakeTimer || 0, 0.052);
              }
              if (
                !sp.isUlt &&
                this.state !== 'ULTIMATE' &&
                !(this.state === 'SKILL' && !game?.isAdventureMode?.() && (this.buildSkill || 0) > 0)
              ) {
                this._hitStopTimer = Math.max(this._hitStopTimer || 0, 0.038);
              }
              this.gainMana(sp.isUlt ? 0 : 1.15);
              if (game.audio) game.audio.play('holy_spear', sp.x);

              this.fx.spawn('gungnirImpactStarburst', this._safeFxX(sp.x, game), this._safeFxY(sp.y), {
                flip: false,
                palette: sp.isUlt ? VALKYRIE_GOLD_PALETTE : VALKYRIE_CRIMSON_PALETTE,
                light: sp.isUlt ? 1.2 : 1.08,
                extra: { aimAngle: sp.angle, isCrit: sp.isUlt }
              });
              this.spawnFeatherBurst(sp.x, sp.y, 4, 130, true);
              this.spawnVfxAnim(4, sp.x, sp.y, 156, 156, 0.22, {
                glowColor: sp.isUlt ? 'gold' : 'crimson',
                inFront: true
              });
            }
          }
        }

        if (hitSomeone || u >= 1.0 || sp.y >= this.groundY - 4 || sp.age >= sp.maxLife) {
          const impX = sp.x;
          if (!hitSomeone) {
            this.fx.spawn('gungnirImpactStarburst', this._safeFxX(impX, game), this._safeFxY(sp.y), {
              flip: false,
              palette: VALKYRIE_CRIMSON_PALETTE,
              light: 1.0,
              extra: { aimAngle: sp.angle, isCrit: false }
            });
            this.spawnValhallaGlint(impX, sp.y, 6, '#fbbf24', 0.20);
          }
          if (sp.isUlt && game.vfx) {
            game.vfx.spawnShockwave(impX, this.groundY - 4, 108, '#f43f5e', 0.26, true);
          }
          this.activeSkySpears.splice(i, 1);
        }
      }
    } else if (this._volleySlot) {
      this._volleySlot.inst.release();
      this._volleySlot = null;
    }

    // Long-range Sky-Lancer AI spacing: Backflip hurl when closely pressured
    const isManualPlayer = Boolean(
      (this.isPlayerControlled && !this.adventureAutoPlay) || this.isManualAdventureControl
    );
    if (
      !this.isDead &&
      !this.isBenched &&
      !isManualPlayer &&
      enemy &&
      !enemy.isDead &&
      (this.state === 'IDLE' || this.state === 'WALK')
    ) {
      const dist = Math.abs(enemy.x - this.x);
      if (
        dist < 180 &&
        this.dodgeCooldown <= 50 &&
        this.crouchCooldown <= 0 &&
        (this._aiDefenseBreather || 0) <= 0 &&
        !(game?.is2v2Mode?.() && (this.finisherGauge || 0) >= (this.maxFinisherGauge || 100))
      ) {
        this._aiDefenseBreather = 0.36;
        this.startCrouch(enemy, game);
        return;
      }
    }

    this.fx.update(dt);
    super.update(dt, enemy, game);
    this.hoverOffset = 0;
  }

  // ============================================================================
  // VALKYRIE MOBILITY: `-360 deg` BACKFLIP (`CROUCH`), WING-VAULT (`JUMP`) & WING-SKIM (`DASH`)
  // ============================================================================

  startDodge(enemy, game) {
    this.dodgeCooldown = this.dodgeMaxCooldown * (0.85 + Math.random() * 0.26);
    const dist = enemy && !enemy.isDead ? Math.abs(enemy.x - this.x) : 999;
    if (dist < 245 && this.crouchCooldown <= 0) {
      this.startCrouch(enemy, game);
    } else {
      this.startJump(enemy, game);
    }
  }

  startCrouch(_enemy, game) {
    // Athletic -360 deg Backward Valkyrie Aerial Backflip (Row 7 CROUCH, ZERO ctx.rotate!)
    const vsAspect = game?.isAdventureMode?.() ? 0 : this.buildAspect || 0;
    this.crouchCooldown = vsAspect === 2 ? 2.65 : 3.1;
    this.crouchDuration = 0.68;
    this.setState('CROUCH');
    this.isCrouching = true;
    this.isInvulnerable = true;
    this.isFlipVault = true;
    this._backflipStep = 0;
    this._didBackflipLand = false;

    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    let retreatDir = -this.facing;
    if (this.x < 220) retreatDir = 1;
    else if (this.x > ww - 220) retreatDir = -1;

    this.vaultStartX = this.x;
    this.vaultTargetX = this._clampArenaX(this.x + retreatDir * 215, game, 85);
    this.vx = 0;
    this.vy = 0;
    if (vsAspect !== 1) {
      this.heal(
        vsAspect === 2
          ? game?.is2v2Mode?.()
            ? 22
            : 14
          : game?.is2v2Mode?.()
            ? 21
            : 13,
        'VALKYRIE GRACE'
      );
      if (game?.is2v2Mode?.()) this.gainFinisher(6);
    }
    if (vsAspect === 2) {
      this.grantBuildShield(34, 2.2, 'ASGARD BARRIER!', '#38bdf8');
    }
    this.spawnAfterimage(this.x, this.y, this.facing, 7, 2, 0.20);
    this.spawnFeatherBurst(this.x, this.groundY - 72, 6, 140, true);

    this.fx.spawn('valhallaGroundBurst', this._safeFxX(this.x, game), this._safeFxY(this.groundY), {
      palette: vsAspect === 2 ? EINHERJAR_AEGIS_PALETTE : vsAspect === 1 ? RAGNAROK_STORM_PALETTE : VALKYRIE_CRIMSON_PALETTE,
      light: 1.08,
      extra: { radius: 28 }
    });

    if (game?.audio) game.audio.play('dash_whoosh', this.x);
    if (game?.vfx) {
      game.vfx.spawnDamageText(this.x, this.y - 148, 0, true, 'VALKYRIE BACKFLIP!', '#fbbf24');
      game.vfx.spawnShockwave(this.x, this.groundY - 6, 98, '#f43f5e', 0.24, true);
    }
  }

  updateCrouch(_dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.crouchDuration || 0.68;
    const u = Math.min(1, t / dur);

    const moveU = u <= 0.06 ? 0 : u >= 0.82 ? 1 : (u - 0.06) / 0.76;
    const easeMove = 1 - Math.pow(1 - moveU, 1.85);
    this.x = this.vaultStartX + (this.vaultTargetX - this.vaultStartX) * easeMove;

    if (u >= 0.08 && u <= 0.80) {
      const airU = (u - 0.08) / 0.72;
      this.y = this.groundY - Math.sin(airU * Math.PI) * 96;
    } else {
      this.y = this.groundY;
    }
    this.vx = 0;
    this.vy = 0;

    if (enemy && !enemy.isDead) {
      this.facing = enemy.x >= this.x ? 1 : -1;
    }

    const flipThresholds = [0.24, 0.44, 0.64];
    if (this._backflipStep < flipThresholds.length && u >= flipThresholds[this._backflipStep]) {
      this._backflipStep++;
      this.spawnAfterimage(this.x, this.y, this.facing, 7, Math.min(29, Math.floor(u * 29)), 0.22);
    }

    if (t >= 0.26 && !this.didActionFrame) {
      this.didActionFrame = true;
      const sx = this.x + this.facing * 28;
      const sy = this.y - 72;
      const tx = enemy && !enemy.isDead ? enemy.x : this.x + this.facing * 360;
      const ty = enemy && !enemy.isDead ? enemy.y - 74 : this.groundY - 74;
      this.spawnGungnirSkySpear(sx, sy, tx, ty, 24, false, -45, -22);
      if (game?.audio) game.audio.play('holy_spear', this.x);
    }

    if (t >= 0.42 && !this.didSecondaryAction) {
      this.didSecondaryAction = true;
      const sx = this.x + this.facing * 28;
      const sy = this.y - 72;
      const tx = enemy && !enemy.isDead ? enemy.x : this.x + this.facing * 380;
      const ty = enemy && !enemy.isDead ? enemy.y - 68 : this.groundY - 68;
      this.spawnGungnirSkySpear(sx, sy, tx, ty, 26, false, 45, 16);
      if (game?.audio) game.audio.play('holy_spear', this.x);
    }

    if (u >= 0.80 && !this._didBackflipLand) {
      this._didBackflipLand = true;
      this.fx.spawn('valhallaGroundBurst', this._safeFxX(this.x, game), this._safeFxY(this.groundY), {
        palette: VALKYRIE_GOLD_PALETTE,
        light: 1.0,
        extra: { radius: 22 }
      });
    }

    if (t >= dur) {
      this.y = this.groundY;
      this.isFlipVault = false;
      this.isInvulnerable = false;
      this.isCrouching = false;
      this.setState('IDLE');
    }
  }

  startJump(enemy, game, dirOverride = null) {
    const vsAspect = game?.isAdventureMode?.() ? 0 : this.buildAspect || 0;
    this.vaultCooldown = vsAspect === 2 ? 2.5 : 2.8;
    this.jumpCooldown = this.vaultCooldown;
    this.dashDuration = 0.58;
    this.setState('JUMP');
    this.isInvulnerable = true;
    this.isFlipVault = true;
    this.didSecondaryAction = false;
    if (vsAspect !== 1) {
      this.heal(vsAspect === 2 ? 14 : 13, 'VALHALLA WINGS');
    }
    if (vsAspect === 2) {
      this.grantBuildShield(34, 2.2, 'ASGARD BARRIER!', '#38bdf8');
    }

    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    let desiredX = this.x - this.facing * 240;
    if (enemy && !enemy.isDead) {
      const dist = Math.abs(enemy.x - this.x);
      if (dist > 440) {
        // Mid-leap into her 335px Sky-Lancer sweet-spot!
        const toEnemy = enemy.x >= this.x ? 1 : -1;
        desiredX = enemy.x - toEnemy * 335;
      } else if (this.x < 230 || this.x > ww - 230) {
        const openDir = enemy.x < ww * 0.5 ? 1 : -1;
        desiredX = enemy.x + openDir * 345;
      } else if (dirOverride !== null) {
        desiredX = this.x + dirOverride * 235;
      }
    }

    this.vaultStartX = this.x;
    this.dragoonTargetX = this._clampArenaX(desiredX, game, 92);
    this.facing = enemy && !enemy.isDead ? (enemy.x >= this.x ? 1 : -1) : this.facing;
    this.vx = 0;
    this.vy = 0;
    this.spawnAfterimage(this.x, this.y, this.facing, 8, 2, 0.22);
    this.spawnFeatherBurst(this.x, this.groundY - 84, 7, 150, true);

    this.fx.spawn('valhallaGroundBurst', this._safeFxX(this.x, game), this._safeFxY(this.groundY), {
      palette: VALKYRIE_GOLD_PALETTE,
      light: 1.1,
      extra: { radius: 30 }
    });

    if (game?.audio) game.audio.play('dash_whoosh', this.x);
    if (game?.vfx) {
      game.vfx.spawnDamageText(this.x, this.y - 148, 0, true, 'VALKYRIE WING-VAULT!', '#fbbf24');
    }
  }

  onStartDash(enemy, game, dir) {
    this.dashDuration = 0.36;
    this.isFlipVault = false;
    this.dashDir = enemy && !enemy.isDead ? Math.sign(enemy.x - this.x) || dir || this.facing : dir || this.facing;
    this.facing = this.dashDir;

    this.fx.spawn('valhallaGroundBurst', this._safeFxX(this.x, game), this._safeFxY(this.groundY), {
      palette: VALKYRIE_CRIMSON_PALETTE,
      light: 1.05,
      extra: { radius: 24 }
    });

    if (game?.audio) game.audio.play('dash_whoosh', this.x);
    if (game?.vfx) {
      game.vfx.spawnDamageText(this.x, this.y - 144, 0, false, 'VALKYRIE WING-SKIM!', '#f43f5e');
    }
  }

  updateDashOrDodge(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = Math.max(0.01, this.dashDuration || 0.36);
    const u = Math.min(1, t / dur);

    if (this.isFlipVault) {
      const targetX = this.dragoonTargetX ?? this.x;
      const easeU = 1 - Math.pow(1 - u, 1.85);
      this.x = this.vaultStartX + (targetX - this.vaultStartX) * easeU;
      this.y = this.groundY - Math.sin(u * Math.PI) * 108;
      this.vx = 0;
      this.vy = 0;
      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }

      this.afterimageSpawnAccum += dt;
      if (this.afterimageSpawnAccum >= 0.052) {
        this.afterimageSpawnAccum = 0;
        this.spawnAfterimage(this.x, this.y, this.facing, 8, Math.min(29, Math.floor(u * 29)), 0.22);
      }

      if (!this.didSecondaryAction && u >= 0.50) {
        this.didSecondaryAction = true;
        this.fireDragonLanceShock(game, {
          x: this.x + this.facing * 72,
          y: Math.min(this.groundY - 82, this.y - 48),
          damage: 36,
          speed: 780,
          maxRange: 610
        });
        if (game?.audio) game.audio.play('holy_spear', this.x);
      }

      if (t >= dur) {
        this.y = this.groundY;
        this.dragoonTargetX = null;
        this.isFlipVault = false;
        this.isInvulnerable = false;
        this.setState('IDLE');
      }
      return;
    }

    // Wing-Skim braking comfortably at the 330px Sky-Lancer sweet-spot!
    const dir = this.dashDir || this.facing;
    this.y = this.groundY - Math.sin(u * Math.PI) * 10;
    if (t < dur * 0.78) {
      const distToEnemy = enemy && !enemy.isDead ? (enemy.x - this.x) * dir : 999;
      if (distToEnemy <= 335 && distToEnemy >= 200) {
        this.vx = 0;
      } else {
        this.vx = dir * 510;
      }
      this.afterimageSpawnAccum += dt;
      if (this.afterimageSpawnAccum >= 0.038) {
        this.afterimageSpawnAccum = 0;
        this.spawnAfterimage(this.x, this.y, this.facing, 6, Math.min(29, Math.floor(u * 29)), 0.18);
      }
    } else {
      this.vx = 0;
    }

    if (!this.didActionFrame && t >= 0.16) {
      this.fireDragonLanceShock(game, {
        x: this.x + this.facing * 76,
        y: this.groundY - 88,
        damage: 32,
        speed: 780,
        maxRange: 590
      });
    }

    if (t >= dur) {
      this.y = this.groundY;
      this.vx = 0;
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  // ============================================================================
  // 4-BEAT NEWLY BORN `520px` VALHALLA SKY-JAVELIN AUTO-ATTACK (`Row 2`)
  // ============================================================================

  updateAutoAttack(dt, enemy, game) {
    this._currentEnemy = enemy;
    this._comboPersistTimer = 0.76;

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

    // Sky-Lancer Stance -> Hard-Locked Sabatons (`vx = 0`) right at `snapT`!
    this.vx = 0;
    if (t < snapT) {
      const lungeU = Math.min(1, Math.max(0, t / snapT));
      const eased = 1 - Math.pow(1 - lungeU, 2.15);
      this.x = this._beatStartX + (this._beatTargetX - this._beatStartX) * eased;

      if (Math.abs(this._beatTargetX - this._beatStartX) > 20) {
        this._dragSparkAcc += dt;
        if (this._dragSparkAcc >= 0.036) {
          this._dragSparkAcc = 0;
          this.spawnAfterimage(this.x, this.y, this.facing, 2, localStep, 0.16);
        }
      }
    } else if (!this._bootsPlanted) {
      this._bootsPlanted = true;
      this.x = this._beatTargetX;
      this.vx = 0;
    }

    // -38px 6-Winged Backstep-Vault on Beat 4 (`V3`)
    if (v === 3) {
      if (t < 0.26) {
        const airU = t / 0.26;
        this.y = this.groundY - Math.sin(airU * Math.PI) * 64;
        this.vy = 0;
      } else {
        this.y = this.groundY;
        this.vy = 0;
      }
    } else {
      this.y = this.groundY;
      this.vy = 0;
    }

    const targetX = enemy && !enemy.isDead ? enemy.x : this._clampArenaX(this.x + this.facing * 370, game, 90);
    const targetY = (enemy && !enemy.isDead ? enemy.y : this.groundY) - 78;
    const vsAspect = game?.isAdventureMode?.() ? 0 : this.buildAspect || 0;
    const dmgMult = vsAspect === 1 ? 1.09 : vsAspect === 2 ? 0.85 : 1.0;
    const spdMult = vsAspect === 1 ? 1.12 : 1.0;
    const crimsonPal =
      vsAspect === 1 ? RAGNAROK_STORM_PALETTE : vsAspect === 2 ? EINHERJAR_AEGIS_PALETTE : VALKYRIE_CRIMSON_PALETTE;
    const goldPal =
      vsAspect === 1 ? RAGNAROK_STORM_PALETTE : vsAspect === 2 ? EINHERJAR_AEGIS_PALETTE : VALKYRIE_GOLD_PALETTE;

    if (v === 0) {
      // V0 (F03): Supersonic 'dragon_lance' Gungnir Lightning-Javelin + Valhalla Target-Rune Seal!
      if ((this._beatHitMask & 1) === 0 && t >= 0.10) {
        this._beatHitMask |= 1;
        const hurlX = this.x + this.facing * 80;
        if (game?.audio) game.audio.play('holy_spear', hurlX);
        this.fx.spawn('gungnirSpearThrustCone', this._safeFxX(hurlX, game), this._safeFxY(this.y - 92), {
          flip: false,
          palette: crimsonPal,
          light: 1.18,
          extra: { aimAngle: this.facing >= 0 ? 0 : Math.PI, radius: 28, twin: false }
        });
        this.fireDragonLanceShock(game, {
          x: hurlX,
          y: this.y - 92,
          damage: vsAspect === 0 ? 44 : Math.round(44 * dmgMult),
          speed: Math.round(790 * spdMult),
          maxRange: 615,
          hitStop: 0.044
        });
      }
    } else if (v === 1) {
      // V1 (F09): Twin Angled Valkyrie Lightning-Javelins converging onto enemy.x!
      if ((this._beatHitMask & 1) === 0 && t >= 0.06) {
        this._beatHitMask |= 1;
        const hurlX = this.x + this.facing * 76;
        if (game?.audio) game.audio.play('holy_spear', hurlX);
        this.spawnVfxAnim(5, hurlX, this.y - 96, 112, 156, 0.22, {
          flipX: this.facing < 0,
          glowColor: 'gold',
          inFront: true
        });
        this.spawnGungnirSkySpear(
          hurlX,
          this.y - 108,
          targetX,
          targetY - 12,
          vsAspect === 0 ? 29 : Math.round(29 * dmgMult),
          false,
          -52,
          -32
        );
        this.spawnGungnirSkySpear(
          hurlX,
          this.y - 84,
          targetX,
          targetY + 12,
          vsAspect === 0 ? 27 : Math.round(27 * dmgMult),
          false,
          52,
          14
        );
      }
    } else if (v === 2) {
      // V2 (F17/F18): Coaxial Valhalla Lock-On 'dragon_lance' + Remote Valhalla Sky-Spear onto enemy.x (2-hit)!
      if ((this._beatHitMask & 1) === 0 && t >= 0.08) {
        this._beatHitMask |= 1;
        const hurlX = this.x + this.facing * 82;
        if (game?.audio) game.audio.play('holy_spear', hurlX);
        this.fx.spawn('gungnirSpearThrustCone', this._safeFxX(hurlX, game), this._safeFxY(this.y - 90), {
          flip: false,
          palette: goldPal,
          light: 1.22,
          extra: { aimAngle: this.facing >= 0 ? 0 : Math.PI, radius: 30, twin: true }
        });
        this.fireDragonLanceShock(game, {
          x: hurlX,
          y: this.y - 90,
          damage: vsAspect === 0 ? 32 : Math.round(32 * dmgMult),
          speed: Math.round(810 * spdMult),
          maxRange: 620,
          hitStop: 0.044
        });
      }
      if ((this._beatHitMask & 2) === 0 && t >= 0.14) {
        this._beatHitMask |= 2;
        this.gainMana(4.5);
        this.spawnGungnirSkySpear(
          targetX - this.facing * 56,
          this.groundY - 248,
          targetX,
          this.groundY - 52,
          vsAspect === 0 ? 32 : Math.round(32 * dmgMult),
          false,
          0,
          -18
        );
      }
    } else {
      // V3 (F25): -38px 6-Winged Backstep-Vault -> Sky-Gate Triple Javelin Rain + 'dragon_lance' (3-hit)!
      if ((this._beatHitMask & 1) === 0 && t >= 0.16) {
        this._beatHitMask |= 1;
        game?.renderer?.triggerShake?.(12, 0.22);
        if (game?.audio) game.audio.play('dragon_dive', targetX);
        game?.audio?.playHeroVoice?.(this.heroId, 'attack', { worldX: this.x, speakerKey: this, priority: 1, cooldownMs: 3600 });
        this.gainMana(6.5);
        this.spawnFeatherBurst(this.x, this.y - 96, 8, 155, true);

        // Overhead Valhalla Sky-Gate Seal + Ground Target Seal + Center Descending Spear at targetX
        this.spawnVfxAnim(5, targetX, this.groundY - 252, 232, 76, 0.38, {
          flipX: this.facing < 0,
          glowColor: 'gold',
          inFront: true
        });
        this.spawnVfxAnim(5, targetX, this.groundY - 12, 224, 72, 0.38, {
          flipX: this.facing < 0,
          glowColor: 'gold',
          inFront: false
        });
        this.spawnVfxAnim(1, targetX, this.groundY - 92, 168, 176, 0.34, {
          flipX: this.facing < 0,
          glowColor: 'gold',
          inFront: true
        });
        for (let k = -1; k <= 1; k++) {
          const tx = this._clampArenaX(targetX + k * 36, game, 88);
          const baseSpDmg = k === 0 ? 32 : 23;
          this.spawnGungnirSkySpear(
            tx - this.facing * 24,
            this.groundY - 252,
            tx,
            this.groundY - 42,
            vsAspect === 0 ? baseSpDmg : Math.round(baseSpDmg * dmgMult),
            k === 0,
            k * 18,
            -12,
            vsAspect === 1 && k === 0 ? 0.34 : 0
          );
        }
        this.fireDragonLanceShock(game, {
          x: this.x + this.facing * 74,
          y: Math.min(this.groundY - 80, this.y - 62),
          damage: vsAspect === 0 ? 32 : Math.round(32 * dmgMult),
          speed: Math.round(800 * spdMult),
          maxRange: 620,
          hitStop: 0.056
        });
      }
    }

    // Seamless Direct Beat Chaining (`0.015s` link across full `520px` range, ZERO return to IDLE!)
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
            game?.adventure?.queuedAction === 'attack')
      );
      const aiWantsChain =
        !isManualPlayer &&
        enemy &&
        !enemy.isDead &&
        !enemy.isInvulnerable &&
        Math.abs(enemy.x - this.x) <= this.attackRange + 35;

      if (v < 3 && (this._queuedNextBeat || aiWantsChain || advHoldingAttack)) {
        this._queuedNextBeat = false;
        if (game?.adventure?.queuedAction === 'attack') {
          game.adventure.queuedAction = null;
        }
        this._intraLinkTimer = INTRA_COMBO_LINK;
        return;
      }

      if (v === 3) {
        this.comboStep = 0;
        this._aiComboReadyFinisher = 0.92;
        this._aiOutstepTimer = enemy && Math.abs(enemy.x - this.x) < 304 ? 0.32 : 0;
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

  // ============================================================================
  // REMADE SKILL - `VALHALLA LIGHTNING JAVELINS` (`0.98s`, `4.85s` CD)
  // Grounded Valkyrie invocation -> sleek low `165px` horizontal Valkyrie Wing-Skim
  // (`18px` lift + `valkyrieWingPlume` + feather trail) fanning a 6-Javelin Curved Halo Volley
  // -> Grounded Sovereign Forward Thrust & Dragonfire Pillar Eruption!
  // ============================================================================

  updateSkill(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.skillDuration || 0.98;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const clampX = (xVal) => this._clampArenaX(xVal, game, 92);
    const vsSkill = game?.isAdventureMode?.() ? 0 : this.buildSkill || 0;
    const skillCrimsonPal =
      vsSkill === 1 ? RAGNAROK_STORM_PALETTE : vsSkill === 2 ? EINHERJAR_AEGIS_PALETTE : VALKYRIE_CRIMSON_PALETTE;
    const skillGoldPal =
      vsSkill === 1 ? RAGNAROK_STORM_PALETTE : vsSkill === 2 ? EINHERJAR_AEGIS_PALETTE : VALKYRIE_GOLD_PALETTE;

    if (!this.didActionFrame) {
      this.didActionFrame = true;
      this._skillOriginX = this.x;
      this._skillJavelinsFired = 0;
      this._skillStep = 0;
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

      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }
      const dist = enemy && !enemy.isDead ? Math.abs(enemy.x - this.x) : 360;
      const retreatCandidate = this.x - this.facing * 165;
      const advanceCandidate = this.x + this.facing * 165;
      if (dist < 290 && retreatCandidate >= 92 && retreatCandidate <= ww - 92) {
        this._skillSkimTargetX = clampX(retreatCandidate);
      } else if (dist > 440 && advanceCandidate >= 92 && advanceCandidate <= ww - 92) {
        this._skillSkimTargetX = clampX(advanceCandidate);
      } else {
        const openDir = this.x > ww * 0.5 ? -1 : 1;
        this._skillSkimTargetX = clampX(this.x + openDir * 165);
      }
      this._skillLockX = enemy && !enemy.isDead ? clampX(enemy.x) : clampX(this.x + this.facing * 360);

      this.spawnFeatherBurst(this.x, this.groundY - 92, 10, 155, true);
      this.fx.spawn('valkyrieWingPlume', this._safeFxX(this.x - this.facing * 18, game), this._safeFxY(this.groundY - 118), {
        follow: this,
        offsetX: -18,
        offsetY: -118,
        flip: this.facing < 0,
        palette: skillCrimsonPal,
        maxDuration: 0.72,
        light: 1.18,
        extra: { wingSpan: 30 }
      });
      this.fx.spawn('valkyrieHaloArray', this._safeFxX(this.x, game), this._safeFxY(this.groundY - 98), {
        follow: this,
        offsetX: 0,
        offsetY: -98,
        palette: skillGoldPal,
        maxDuration: 0.64,
        light: 1.15,
        extra: { rx: 24, ry: 12 }
      });
      this.fx.spawn('valhallaTargetReticle', this._safeFxX(this._skillLockX, game), this._safeFxY(this.groundY), {
        palette: skillGoldPal,
        maxDuration: 0.82,
        light: 1.16,
        extra: { radius: 34, beaconH: 48, duration: 0.82 }
      });

      if (game?.vfx) {
        game.vfx.spawnSpecialCastAura(this, this.skillName, 'VALKYRIE SKILL', 'crimson', false);
        game.vfx.spawnDamageText(
          this._skillLockX,
          this.groundY - 196,
          0,
          true,
          vsSkill === 1
            ? 'RAGNAROK JAVELIN TEMPEST!'
            : vsSkill === 2
              ? 'EINHERJAR AEGIS VOLLEY!'
              : 'VALHALLA WING-SKIM VOLLEY!',
          vsSkill === 2 ? '#7dd3fc' : '#fbbf24'
        );
      }
    }

    const originX = this._skillOriginX ?? this.x;
    const skimTargetX = this._skillSkimTargetX ?? originX;

    // Phase 0 (`0.00..0.18s`, Row 3 F00..F05): Grounded Valkyrie Wing-Flare & Invocation!
    if (t < 0.18) {
      this._phaseThroughEnemy = false;
      this.vx = 0;
      this.vy = 0;
      this.x = originX;
      this.y = this.groundY;
      this.divePitchRad = 0;
      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }
      return;
    }

    // Phase 1 (`0.18..0.57s`, Row 3 F06..F18): Sleek Low 165px Horizontal Valkyrie Wing-Skim (`18px` lift)!
    if (t < 0.57) {
      this._phaseThroughEnemy = true;
      if (this._skillStep < 1) {
        this._skillStep = 1;
        this.fx.spawn('valkyrieSlipstreamTrail', this._safeFxX(this.x - this.facing * 18, game), this._safeFxY(this.y - 96), {
          follow: this,
          offsetX: -18,
          offsetY: -96,
          flip: this.facing < 0,
          palette: skillCrimsonPal,
          maxDuration: 0.39,
          light: 1.14,
          extra: { length: 28, tilt: -0.06 }
        });
      }

      const uSkim = (t - 0.18) / 0.39;
      const easeX = uSkim < 0.5 ? 2 * uSkim * uSkim : 1 - Math.pow(-2 * uSkim + 2, 2) / 2;
      this.vx = 0;
      this.vy = 0;
      this.x = originX + (skimTargetX - originX) * easeX;
      this.y = this.groundY - Math.sin(uSkim * Math.PI) * 18;
      this.divePitchRad = 0;
      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
        this._skillLockX = clampX(enemy.x);
      }

      this.afterimageSpawnAccum += dt;
      if (this.afterimageSpawnAccum >= 0.045) {
        this.afterimageSpawnAccum = 0;
        const col = Math.min(18, Math.max(6, Math.floor((t / dur) * 30)));
        this.spawnAfterimage(this.x, this.y, this.facing, 3, col, 0.22);
        this.spawnFeatherBurst(this.x - this.facing * 14, this.y - 88, 2, 90, true);
      }
    }

    // Fan out the Curved Halo Volley across `0.18..0.48s` (`6` baseline, `8` Skill II, `4` Skill III)!
    const volleyTimes =
      vsSkill === 1
        ? [0.18, 0.22, 0.26, 0.30, 0.34, 0.39, 0.44, 0.49]
        : vsSkill === 2
          ? [0.20, 0.28, 0.36, 0.45]
          : [0.18, 0.24, 0.30, 0.36, 0.42, 0.48];
    const arcSpreads = [-85, 85, -55, 55, -28, 28, -70, 70];
    const verticalArcs = [-44, 20, -28, 14, -16, -6, -34, 18];
    const syOffsets = [-112, -74, -104, -80, -96, -88, -108, -76];

    while (
      this._skillJavelinsFired < volleyTimes.length &&
      t >= volleyTimes[this._skillJavelinsFired]
    ) {
      const idx = this._skillJavelinsFired++;
      const sx = this.x + this.facing * (18 + (idx % 3) * 10);
      const sy = this.y + syOffsets[idx % syOffsets.length];
      const midOff = ( volleyTimes.length - 1 ) * 0.5;
      const tx =
        enemy && !enemy.isDead
          ? enemy.x + (idx - midOff) * 12
          : (this._skillLockX || this.x + this.facing * 350) + (idx - midOff) * 14;
      const ty = enemy && !enemy.isDead ? enemy.y - 72 : this.groundY - 72;
      const javelinDmg = vsSkill === 1 ? 18 : vsSkill === 2 ? 16 : 20;

      this.spawnGungnirSkySpear(
        sx,
        sy,
        tx,
        ty,
        javelinDmg,
        false,
        arcSpreads[idx % arcSpreads.length],
        verticalArcs[idx % verticalArcs.length]
      );
      this.spawnValhallaGlint(sx, sy, 6, idx % 2 === 0 ? '#ffffff' : '#fbbf24', 0.18);
      if (game?.audio) game.audio.play('holy_spear', sx);
    }

    // Phase 2 (`0.57..0.98s`, Row 3 F19..F29): Grounded Sovereign Forward Thrust & Dragonfire Pillar Eruption!
    if (t >= 0.57) {
      this._phaseThroughEnemy = false;
      this.x = skimTargetX;
      this.y = this.groundY;
      this.vx = 0;
      this.vy = 0;
      this.divePitchRad = 0;
      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }

      if (!this.didSecondaryAction) {
        this.didSecondaryAction = true;
        if (!game?.isAdventureMode?.()) {
          if (vsSkill === 1) {
            // Skill II (Ragnarok Javelin Tempest): Zero self-heal!
          } else if (vsSkill === 2) {
            this.heal(game?.is2v2Mode?.() ? 28 : 20, 'EINHERJAR AEGIS');
            this.grantBuildShield(42, 2.4, 'VALHALLA BARRIER!', '#38bdf8');
            this.healTeammateTagGrace(28, 'EINHERJAR GRACE', 32, 2.4);
            if (game?.is2v2Mode?.()) this.gainFinisher(5);
          } else {
            this.heal(game?.is2v2Mode?.() ? 36 : 20, 'VALHALLA AEGIS');
            if (game?.is2v2Mode?.()) this.gainFinisher(5);
          }
        }
        const strikeX =
          enemy && !enemy.isDead
            ? clampX(enemy.x)
            : clampX(this._skillLockX || this.x + this.facing * 360);

        this.fx.spawn('gungnirSpearThrustCone', this._safeFxX(this.x + this.facing * 48, game), this._safeFxY(this.groundY - 90), {
          flip: false,
          palette: skillGoldPal,
          light: 1.26,
          extra: { aimAngle: this.facing >= 0 ? 0 : Math.PI, radius: 30, twin: true }
        });
        this.fx.spawn('dragonfireObeliskPillar', this._safeFxX(strikeX, game), this._safeFxY(this.groundY), {
          palette: skillCrimsonPal,
          light: 1.28,
          extra: { baseRadius: 17, height: 86, isUltimate: false }
        });

        if (game?.audio) {
          game.audio.play('thunder_slam', strikeX);
          game.audio.play('holy_spear', strikeX);
        }
        if (game?.renderer) game.renderer.triggerShake(11, 0.20);
        if (game?.vfx) {
          game.vfx.spawnShockwave(strikeX, this.groundY - 6, 162, vsSkill === 2 ? '#38bdf8' : '#fbbf24', 0.30, true);
          game.vfx.spawnCrystalSpike?.({
            x: strikeX,
            groundY: this.groundY,
            width: 58,
            height: 168,
            color: vsSkill === 2 ? '#38bdf8' : '#f43f5e',
            owner: this,
            target: enemy,
            damage: vsSkill === 1 ? 34 : vsSkill === 2 ? 22 : 30,
            delay: 0
          });
        }

        this.spawnVfxAnim(4, strikeX, this.groundY - 88, 208, 208, 0.32, {
          glowColor: 'gold',
          inFront: true
        });
        this.spawnVfxAnim(2, strikeX, this.groundY - 82, 212, 212, 0.36, {
          glowColor: 'crimson',
          inFront: false
        });
        this.spawnFeatherBurst(strikeX, this.groundY - 88, 12, 195, true);
        this.spawnValhallaGlint(strikeX, this.groundY - 96, 12, '#fef08a', 0.28);

        const foes = this.getActiveEnemies(enemy, game);
        let hitAny = false;
        const priDmg = vsSkill === 1 ? 68 : vsSkill === 2 ? 44 : 60;
        const splDmg = vsSkill === 1 ? 50 : vsSkill === 2 ? 34 : 46;
        for (const foe of foes) {
          if (Math.abs(foe.x - strikeX) <= 180) {
            foe.takeDamage(foe === enemy ? priDmg : splDmg, this, true, vsSkill === 1 ? 36 : 88, -112);
            if (vsSkill === 1 && !foe.isDead) {
              foe.applyBuildRoot?.(0.38, 'SPEAR ROOT!', '#fb7185');
            }
            hitAny = true;
          }
        }
        if (hitAny) {
          this._hitStopTimer = Math.max(this._hitStopTimer || 0, 0.045);
        }
      }
    }

    if (t >= dur) {
      this._phaseThroughEnemy = false;
      this._skillJavelinsFired = 0;
      this.plantedSkillJavelins = [];
      this.y = this.groundY;
      this.divePitchRad = 0;
      this.setState('IDLE');
    }
  }

  // ============================================================================
  // REMADE OVERDRIVE (`ULTIMATE`) - `BAHAMUT VALKYRIE SANCTUARY` (`1.88s`)
  // Grounded Valhalla Coil (`210..212`) -> High-Arcing `-360 deg` Aerial Backflip
  // Retreat Away From Enemy (`148px` lift, `255px` retreat) Firing 12 Gungnir
  // War-Spears Forward-Downward -> Crisp Landing & 3-Pillar Judgment!
  // ============================================================================

  updateUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.ultDuration || 1.88;
    if (!this._spearsFired) this._spearsFired = 0;
    this.isInvulnerable = t < 0.22;
    this.unstoppablePoise = true;
    this._phaseThroughEnemy = false;
    this.vx = 0;
    this.vy = 0;

    const clampX = (xVal) => this._clampArenaX(xVal, game, 102);
    const originX = this._ultOriginX !== undefined ? this._ultOriginX : this.x;
    const enemyX =
      enemy && !enemy.isDead
        ? clampX(enemy.x)
        : this._ultTargetX !== undefined
          ? this._ultTargetX
          : clampX(this.x + this.facing * 360);
    this._ultTargetX = enemyX;
    const vsUlt = game?.isAdventureMode?.() ? 0 : this.buildUlt || 0;
    const ultCrimsonPal =
      vsUlt === 1 ? RAGNAROK_STORM_PALETTE : vsUlt === 2 ? EINHERJAR_AEGIS_PALETTE : VALKYRIE_CRIMSON_PALETTE;
    const ultGoldPal =
      vsUlt === 1 ? RAGNAROK_STORM_PALETTE : vsUlt === 2 ? EINHERJAR_AEGIS_PALETTE : VALKYRIE_GOLD_PALETTE;

    if (!this.didActionFrame) {
      this.didActionFrame = true;
      this._ultOriginX = this.x;
      this._ultStep = 0;
      this._ultPassCone1 = false;
      this._ultPassCone3 = false;
      this.sanctuarySkyLances = [];
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

      this.facing = enemyX >= this.x ? 1 : -1;

      const retreatDir = this._ultOriginX <= enemyX ? -1 : 1;
      const landX = clampX(this._ultOriginX + retreatDir * 255);
      this._ultRetreatDir = retreatDir;
      this._ultLandX = landX;
      this._ultWaypoints = {
        land: { x: landX, y: this.groundY }
      };

      this.bahamutAvatar = {
        x: this.x,
        y: this.y,
        life: 0,
        maxLife: dur
      };

      this.fx.spawn('valhallaGroundBurst', this._safeFxX(this.x, game), this._safeFxY(this.groundY), {
        palette: ultGoldPal,
        light: 1.22,
        extra: { radius: 36 }
      });
      this.fx.spawn('valkyrieWingPlume', this._safeFxX(this.x - this.facing * 18, game), this._safeFxY(this.groundY - 120), {
        follow: this,
        offsetX: -18,
        offsetY: -120,
        flip: this.facing < 0,
        palette: ultCrimsonPal,
        maxDuration: 1.56,
        light: 1.25,
        extra: { wingSpan: 34 }
      });
      this.fx.spawn('valkyrieHaloArray', this._safeFxX(this.x, game), this._safeFxY(this.groundY - 98), {
        follow: this,
        offsetX: 0,
        offsetY: -98,
        palette: ultGoldPal,
        maxDuration: 1.46,
        light: 1.2,
        extra: { rx: 28, ry: 14 }
      });
      this.fx.spawn('valhallaTargetReticle', this._safeFxX(enemyX, game), this._safeFxY(this.groundY), {
        palette: ultCrimsonPal,
        maxDuration: 1.58,
        light: 1.22,
        extra: { radius: 44, beaconH: 58, duration: 1.58 }
      });
      this.spawnFeatherBurst(this.x, this.groundY - 96, 12, 175, true);

      if (game?.vfx) {
        game.vfx.spawnSpecialCastAura(this, this.ultName, 'ULTIMATE OVERDRIVE', 'crimson', true);
        game.vfx.spawnShockwave(this.x, this.groundY - 4, 155, vsUlt === 2 ? '#38bdf8' : '#fbbf24', 0.34, true);
        game.vfx.spawnDamageText(
          enemyX,
          this.groundY - 216,
          0,
          true,
          vsUlt === 1
            ? 'BAHAMUT SPEAR-CATACLYSM!'
            : vsUlt === 2
              ? 'ASGARDIAN VALKYRIE CHOIR!'
              : 'VALKYRIE BACKFLIP SPEAR-VOLLEY!',
          vsUlt === 2 ? '#7dd3fc' : '#fbbf24'
        );
      }
    }

    // Stage 0 (`0.00..0.24s`, Row 7 F00..F02 `210..212`): Grounded Valhalla Coil!
    if (t < 0.24) {
      this._phaseThroughEnemy = false;
      this.x = originX;
      this.y = this.groundY;
      this.cameraAirLift = 0;
      this.divePitchRad = 0;
      this.trueUltFrameOverride = 210 + Math.min(2, Math.floor((t / 0.24) * 3));
      this._overrideFrameIdx = this.trueUltFrameOverride;
      this.facing = enemyX >= this.x ? 1 : -1;
      return;
    }

    const landX =
      this._ultLandX !== undefined
        ? this._ultLandX
        : clampX(originX + (originX <= enemyX ? -1 : 1) * 255);

    // Stage 1 (`0.24..1.42s`): High-Arcing `-360 deg` Aerial Backflip Retreat (`213..232` woven cleanly into `133..138` at throw pulses) + 12 Forward-Downward Gungnir War-Spears!
    if (t < 1.42) {
      this._phaseThroughEnemy = false;
      const uFlip = Math.max(0, Math.min(1, (t - 0.24) / (1.42 - 0.24)));
      const easeFlip = 1 - Math.pow(1 - uFlip, 2);
      this.x = originX + (landX - originX) * easeFlip;
      this.y = this.groundY - Math.sin(uFlip * Math.PI) * 148;
      this.cameraAirLift = Math.max(0, (this.groundY - this.y) * 0.65);
      this.facing = enemyX >= this.x ? 1 : -1;

      let frameIdx = 213;
      if (t < 0.54) {
        const subU = Math.min(0.999, (t - 0.24) / 0.30);
        frameIdx = 213 + Math.min(19, Math.floor(subU * 20));
      } else if (t < 0.76) {
        const subU = Math.min(0.999, (t - 0.54) / 0.22);
        frameIdx = 133 + Math.min(5, Math.floor(subU * 6));
      } else if (t < 1.08) {
        const subU = Math.min(0.999, (t - 0.76) / 0.32);
        frameIdx = 213 + Math.min(19, Math.floor(subU * 20));
      } else if (t < 1.32) {
        const subU = Math.min(0.999, (t - 1.08) / 0.24);
        frameIdx = 133 + Math.min(5, Math.floor(subU * 6));
      } else {
        const subU = Math.min(0.999, (t - 1.32) / 0.10);
        frameIdx = 230 + Math.min(2, Math.floor(subU * 3));
      }
      this.trueUltFrameOverride = frameIdx;
      this._overrideFrameIdx = frameIdx;

      if (!this._ultPassCone1) {
        this._ultPassCone1 = true;
        this.fx.spawn('valkyrieSlipstreamTrail', this._safeFxX(this.x - this.facing * 18, game), this._safeFxY(this.y - 98), {
          follow: this,
          offsetX: -18,
          offsetY: -98,
          flip: this.facing < 0,
          palette: VALKYRIE_CRIMSON_PALETTE,
          maxDuration: 1.12,
          light: 1.18,
          extra: { length: 32, tilt: -0.22 }
        });
        this.fx.spawn('gungnirSpearThrustCone', this._safeFxX(this.x + this.facing * 32, game), this._safeFxY(this.y - 92), {
          flip: false,
          palette: VALKYRIE_CRIMSON_PALETTE,
          light: 1.18,
          extra: { aimAngle: this.facing >= 0 ? 0.36 : Math.PI - 0.36, radius: 26, twin: false }
        });
      }

      if (this._ultStep < 1 && uFlip >= 0.35) {
        this._ultStep = 1;
        this.spawnVfxAnim(0, this.x + this.facing * 38, this.y - 84, 208, 208, 0.28, {
          vx: this.facing * 240,
          vy: 110,
          flipX: this.facing < 0,
          glowColor: 'gold'
        });
      }

      if (!this._ultPassCone3 && uFlip >= 0.72) {
        this._ultPassCone3 = true;
        this.fx.spawn('gungnirSpearThrustCone', this._safeFxX(this.x + this.facing * 36, game), this._safeFxY(this.y - 86), {
          flip: false,
          palette: VALKYRIE_GOLD_PALETTE,
          light: 1.2,
          extra: { aimAngle: this.facing >= 0 ? 0.42 : Math.PI - 0.42, radius: 28, twin: true }
        });
      }

      this.afterimageSpawnAccum += dt;
      if (this.afterimageSpawnAccum >= 0.038) {
        this.afterimageSpawnAccum = 0;
        this.spawnAfterimage(
          this.x,
          this.y,
          this.facing,
          Math.floor(frameIdx / 30),
          frameIdx % 30,
          0.24
        );
      }

      // Command Gungnir War-Spears forward-downward onto `enemyX` (`12` baseline, `14` Ult II, `10` Ult III)!
      const totalUltSpears = vsUlt === 1 ? 14 : vsUlt === 2 ? 10 : 12;
      const spearInterval = vsUlt === 1 ? 0.074 : vsUlt === 2 ? 0.105 : 0.088;
      const expectedSpears = t >= 0.28 ? Math.min(totalUltSpears, Math.floor((t - 0.28) / spearInterval) + 1) : 0;
      const sySlots = [-116, -78, -108, -84, -100, -90, -118, -76, -110, -82, -114, -86];
      const arcSpreadSlots = [-62, 62, -44, 44, -24, 24, -74, 74, -36, 36, -52, 52];
      const vArcSlots = [-28, 12, -20, 14, -14, 8, -32, 16, -18, 10, -24, 12];
      const ultSpearDmg = vsUlt === 1 ? 15 : vsUlt === 2 ? 11 : 14;

      while (this._spearsFired < expectedSpears) {
        const idx = this._spearsFired++;
        const sx = this.x + this.facing * (18 + (idx % 4) * 10);
        const sy = this.y + sySlots[idx % sySlots.length];
        const rawTx =
          enemy && !enemy.isDead
            ? enemy.x + ((idx % 5) - 2) * 16
            : enemyX + (idx - (totalUltSpears - 1) * 0.5) * 32;
        const clampedTx = clampX(rawTx);
        const ty = enemy && !enemy.isDead ? enemy.y - 48 : this.groundY - 48;

        this.spawnGungnirSkySpear(
          sx,
          sy,
          clampedTx,
          ty,
          ultSpearDmg,
          true,
          arcSpreadSlots[idx % arcSpreadSlots.length],
          vArcSlots[idx % vArcSlots.length]
        );
        this.spawnFeatherBurst(sx, sy, 3, 125, true);
        this.spawnValhallaGlint(sx, sy, 8, idx % 2 === 0 ? '#fde047' : '#ffffff', 0.22);
        this.spawnValhallaGlint(sx + this.facing * 12, sy - 10, 6, '#fb7185', 0.18);
        if (game?.audio) game.audio.play('holy_spear', sx);
      }
      return;
    }

    // Stage 2 (`1.42..1.88s`, Row 4 F25..F29 `145..149`): Crisp Landing at `landX` & 3-Pillar Judgment!
    this._phaseThroughEnemy = false;
    this.x = landX;
    this.y = this.groundY;
    this.cameraAirLift = 0;
    this.divePitchRad = 0;
    this.trueUltFrameOverride = 145 + Math.min(4, Math.floor(Math.max(0, (t - 1.42) / Math.max(0.05, dur - 1.42)) * 5));
    this._overrideFrameIdx = this.trueUltFrameOverride;
    this.facing = enemyX >= this.x ? 1 : -1;

    if (!this.didSecondaryAction) {
      this.didSecondaryAction = true;
      const impactX = clampX(enemy && !enemy.isDead ? enemy.x : enemyX);

      if (game?.audio) {
        game.audio.play('dragon_dive', impactX);
        game.audio.play('thunder_slam', impactX);
      }
      if (game?.renderer) {
        game.renderer.triggerShake(17, 0.30);
        game.renderer.triggerAberration(9);
        game.renderer.triggerHitStop(0.065);
      }

      if (vsUlt === 1) {
        // Ult II (Bahamut Spear-Cataclysm): Zero Sanctuary heal, +12 Ult gauge!
        this.gainFinisher(12);
      } else if (vsUlt === 2) {
        this.heal(36, 'ASGARDIAN CHOIR');
        this.grantBuildShield(64, 2.7, 'ASGARD BARRIER!', '#38bdf8');
        this.healTeammateTagGrace(34, 'VALKYRIE CHOIR', 42, 2.8);
      } else {
        this.heal(32, 'BAHAMUT SANCTUARY');
      }
      this.fx.spawn('gungnirSpearThrustCone', this._safeFxX(this.x + this.facing * 50, game), this._safeFxY(this.groundY - 92), {
        flip: false,
        palette: ultGoldPal,
        light: 1.3,
        extra: { aimAngle: this.facing >= 0 ? 0 : Math.PI, radius: 34, twin: true }
      });
      this.fx.spawn('valhallaGroundBurst', this._safeFxX(this.x, game), this._safeFxY(this.groundY), {
        palette: ultGoldPal,
        light: 1.15,
        extra: { radius: 30 }
      });
      this.fx.spawn('dragonfireObeliskPillar', this._safeFxX(impactX, game), this._safeFxY(this.groundY), {
        palette: ultCrimsonPal,
        light: 1.35,
        extra: { baseRadius: 19, height: 92, isUltimate: true }
      });
      for (const sideOff of [-110, 110]) {
        const flankX = clampX(impactX + sideOff);
        this.fx.spawn('dragonfireObeliskPillar', this._safeFxX(flankX, game), this._safeFxY(this.groundY), {
          palette: ultGoldPal,
          light: 1.22,
          extra: { baseRadius: 14, height: 76, isUltimate: false }
        });
        this.spawnVfxAnim(2, flankX, this.groundY - 82, 196, 212, 0.42, {
          glowColor: 'gold',
          inFront: false
        });
      }

      if (game?.vfx) {
        game.vfx.spawnShockwave(this.x, this.groundY - 4, 128, vsUlt === 2 ? '#38bdf8' : '#fbbf24', 0.30, true);
        game.vfx.spawnShockwave(impactX, this.groundY - 6, 265, vsUlt === 2 ? '#38bdf8' : '#fbbf24', 0.44, true);
        game.vfx.spawnDamageText(impactX, this.groundY - 196, 0, true, 'GUNGNIR THREE-PILLAR JUDGMENT!', '#fbbf24');
      }

      this.spawnVfxAnim(4, impactX, this.groundY - 96, 236, 236, 0.42, {
        glowColor: 'gold',
        inFront: true
      });
      this.spawnVfxAnim(7, impactX, this.groundY - 132, 248, 320, 0.46, {
        glowColor: 'crimson',
        inFront: false
      });
      this.spawnFeatherBurst(impactX, this.groundY - 110, 16, 220, true);
      this.spawnValhallaGlint(impactX, this.groundY - 120, 14, '#ffffff', 0.32);

      const foes = this.getActiveEnemies(enemy, game);
      const ultPriDmg = vsUlt === 1 ? 134 : vsUlt === 2 ? 92 : 118;
      const ultSplDmg = vsUlt === 1 ? 100 : vsUlt === 2 ? 70 : 90;
      for (const foe of foes) {
        if (Math.abs(foe.x - impactX) <= 245) {
          foe.takeDamage(foe === enemy ? ultPriDmg : ultSplDmg, this, true, 225, -235);
          if (vsUlt === 2 && !foe.isDead) {
            foe.applyBuildRoot?.(0.36, 'VALHALLA BIND!', '#38bdf8');
          }
        }
      }
    }

    if (t >= dur) {
      this._phaseThroughEnemy = false;
      this._spearsFired = 0;
      this.sanctuarySkyLances = [];
      this.bahamutAvatar = null;
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      this.y = this.groundY;
      this.cameraAirLift = 0;
      this.divePitchRad = 0;
      this.isInvulnerable = false;
      this.unstoppablePoise = false;
      this.setState('IDLE');
    }
  }

  // ============================================================================
  // REMADE SUPREME ULTIMATE (`TRUE_ULTIMATE`) - `TWILIGHT OF RAGNAROK: BIFROST GUNGNIR` (`4.35s`)
  // Opens a multi-band pixel Bifrost Sky-Gate, rains 8 Einherjar Runic Lances
  // pinning the arena, and executes a supersonic diagonal Valkyrie Falcon Dive!
  // ============================================================================

  updateTrueUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    const ww = game?.renderer?.worldWidth || 1600;

    this.isInvulnerable = t < 0.35;
    this.unstoppablePoise = true;
    this.isFlipVault = false;
    this.isCrouching = false;
    this.isBlinkTeleport = false;
    this.vx = 0;
    this.vy = 0;

    const foes = this.getActiveEnemies(enemy, game);
    let focusEnemy = enemy && !enemy.isDead && !enemy.isBenched ? enemy : null;
    if (!focusEnemy && foes.length > 0) {
      let bestDist = Infinity;
      for (const f of foes) {
        const d = Math.abs(f.x - this.x);
        if (d < bestDist) {
          bestDist = d;
          focusEnemy = f;
        }
      }
    }

    if (!this._trueUltInit) {
      this._trueUltInit = true;
      this._trueUltStep = 0;
      this._trueUltLancesSpawned = 0;
      this._trueUltOriginX = this.x;
      this._trueUltDiveStartX = this.x;
      this._trueUltLandX = this.x;
      this._trueUltAfterimageAcc = 0;

      const initTargetX = focusEnemy
        ? this._clampArenaX(focusEnemy.x, game, 140)
        : this._clampArenaX(this.x + this.facing * 320, game, 140);
      this._trueUltTargetX = initTargetX;
      if (Math.abs(initTargetX - this.x) > 8) {
        this.facing = initTargetX >= this.x ? 1 : -1;
      }

      if (game?.audio) {
        game.audio.play('ult_cast', this.x);
        game.audio.play('holy_spear', initTargetX);
      }
      game?.vfx?.triggerCinematicCutIn?.(this, this.trueUltName, '#fbbf24');
      if (game?.renderer) {
        game.renderer.ultDim = Math.max(game.renderer.ultDim || 0, 0.46);
        game.renderer.triggerShake(8, 0.22);
      }

      this.bahamutAvatar = {
        x: this.x,
        y: this.y,
        life: 0,
        maxLife: 3.16
      };
      this.ragnarokSeal = {
        x: initTargetX,
        y: this.groundY - 4,
        age: 0,
        skyAlpha: 1.0,
        shattered: false
      };
      this.einherjarSkyLances = [];
      this.ragnarokDiveBeam = null;
      this.ragnarokPillars = [];

      this.fx.spawn('valkyrieWingPlume', this._safeFxX(this.x, game), this._safeFxY(this.y - 92), {
        key: 'valkyrieWingPlume',
        follow: this,
        offsetX: -14,
        offsetY: -92,
        flip: this.facing < 0,
        palette: VALKYRIE_CRIMSON_PALETTE,
        light: 1.12,
        extra: { wingSpan: 28 }
      });
      this.fx.spawn('valkyrieHaloArray', this._safeFxX(this.x, game), this._safeFxY(this.y - 104), {
        key: 'valkyrieHaloArray',
        follow: this,
        offsetX: -4,
        offsetY: -104,
        maxDuration: 0.82,
        flip: false,
        palette: VALKYRIE_GOLD_PALETTE,
        light: 1.12,
        extra: { rx: 24, ry: 10 }
      });
      this.fx.spawn('valkyrieSlipstreamTrail', this._safeFxX(this.x, game), this._safeFxY(this.y - 68), {
        key: 'valkyrieSlipstreamTrail',
        follow: this,
        offsetX: -12,
        offsetY: -68,
        maxDuration: 0.94,
        flip: this.facing < 0,
        palette: VALKYRIE_CRIMSON_PALETTE,
        light: 1.08,
        extra: { length: 30, tilt: -0.95 }
      });
      this.fx.spawn('valhallaGroundBurst', this._safeFxX(this.x, game), this._safeFxY(this.groundY), {
        palette: VALKYRIE_GOLD_PALETTE,
        light: 1.25,
        extra: { radius: 34 }
      });
      this.fx.spawn('valhallaTargetReticle', this._safeFxX(initTargetX, game), this._safeFxY(this.groundY), {
        palette: VALKYRIE_GOLD_PALETTE,
        light: 1.25,
        extra: { radius: 44, beaconH: 68, duration: 2.95 }
      });

      if (game?.vfx) {
        game.vfx.spawnShockwave(this.x, this.groundY - 4, 155, '#fbbf24', 0.34, true);
        game.vfx.spawnShockwave(initTargetX, this.groundY - 4, 165, '#f43f5e', 0.36, true);
        game.vfx.spawnDamageText(
          this.x,
          this.groundY - 168,
          0,
          true,
          'BIFROST SKY-GATE: OPEN!',
          '#fbbf24'
        );
      }
    }

    if (game?.renderer && t < 3.60) {
      const dimTarget = t <= 3.10 ? 0.46 : 0.46 * Math.max(0, 1 - (t - 3.10) / 0.50);
      game.renderer.ultDim = Math.max(game.renderer.ultDim || 0, dimTarget);
    }

    if (t < 2.65 && focusEnemy && !focusEnemy.isDead) {
      const desiredX = this._clampArenaX(focusEnemy.x, game, 140);
      const trackSpeed = t < 1.10 ? 9.5 : 4.2;
      this._trueUltTargetX += (desiredX - this._trueUltTargetX) * Math.min(1, dt * trackSpeed);
      if (Math.abs(this._trueUltTargetX - this.x) > 12) {
        this.facing = this._trueUltTargetX >= this.x ? 1 : -1;
      }
    }
    const targetX = this._trueUltTargetX;

    if (this.ragnarokSeal) {
      this.ragnarokSeal.age += dt;
      if (!this.ragnarokSeal.shattered) {
        this.ragnarokSeal.x = targetX;
      }
      this.ragnarokSeal.skyAlpha = t < 2.82 ? Math.min(1, t / 0.35) : Math.max(0, 1 - (t - 2.82) / 0.24);
    }

    for (let i = this.einherjarSkyLances.length - 1; i >= 0; i--) {
      const lance = this.einherjarSkyLances[i];
      lance.age += dt;
      if (!lance.impacted) {
        const uFall = Math.min(1, lance.age / lance.fallDuration);
        const easeFall = uFall * uFall * (0.4 + 0.6 * uFall);
        lance.x = lance.startX + (lance.targetX - lance.startX) * easeFall;
        lance.y = lance.startY + (lance.pinY - lance.startY) * easeFall;
        if (uFall >= 1) {
          lance.impacted = true;
          lance.x = lance.targetX;
          lance.y = lance.pinY;
          if (game?.audio) game.audio.play('holy_spear', lance.targetX);
          if (game?.renderer) {
            game.renderer.triggerShake(6, 0.12);
          }
          this.fx.spawn('gungnirImpactStarburst', this._safeFxX(lance.targetX, game), this._safeFxY(this.groundY - 58), {
            flip: false,
            palette: lance.index % 2 === 0 ? VALKYRIE_GOLD_PALETTE : VALKYRIE_CRIMSON_PALETTE,
            light: 1.2,
            extra: { aimAngle: lance.angle ?? Math.PI * 0.5, isCrit: true }
          });
          this.spawnFeatherBurst(lance.targetX, this.groundY - 54, 4, 140, true);

          let hitAny = false;
          for (const foe of foes) {
            if (foe && !foe.isDead && !foe.isBenched && Math.abs(foe.x - targetX) < 210) {
              foe.takeDamage(28, this, false, 14, -26);
              if (!foe.isColossalBoss) {
                foe.vx = (targetX - foe.x) * 3.0;
                foe.x += (targetX - foe.x) * 0.28;
              }
              hitAny = true;
            }
          }
          if (!hitAny && focusEnemy && !focusEnemy.isDead) {
            focusEnemy.takeDamage(28, this, false, 14, -26);
          }
        }
      }
      if (lance.shatterAge !== undefined) {
        lance.shatterAge += dt;
        if (lance.shatterAge >= 0.30) {
          this.einherjarSkyLances.splice(i, 1);
        }
      }
    }

    if (t >= 1.14 && t < 3.10 && focusEnemy && !focusEnemy.isDead && this.einherjarSkyLances.length > 0 && !focusEnemy.isColossalBoss) {
      const drift = focusEnemy.x - targetX;
      if (Math.abs(drift) > 44) {
        focusEnemy.x -= Math.sign(drift) * Math.min(Math.abs(drift) - 44, dt * 360);
      }
      focusEnemy.vx *= 0.2;
    }

    for (let i = this.ragnarokPillars.length - 1; i >= 0; i--) {
      const p = this.ragnarokPillars[i];
      p.age += dt;
      if (p.age >= p.maxLife) {
        this.ragnarokPillars.splice(i, 1);
      }
    }

    if (this.ragnarokDiveBeam) {
      this.ragnarokDiveBeam.age += dt;
      if (this.ragnarokDiveBeam.age >= this.ragnarokDiveBeam.maxLife) {
        this.ragnarokDiveBeam = null;
      }
    }

    // PHASE 1 (0.00s..1.10s): Ascend 410px to the Approach Flank & Open Multi-Band Bifrost Sky-Gate
    if (t < 1.10) {
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
      if (t < 0.22) {
        const uPrep = t / 0.22;
        this.y = this.groundY;
        this.cameraAirLift = 0;
        this.trueUltFrameOverride = 120 + Math.min(3, Math.floor(uPrep * 4));
      } else {
        const uAsc = Math.min(1, (t - 0.22) / 0.88);
        const easeAsc = 1 - Math.pow(1 - uAsc, 3);
        const lift = 410 * easeAsc;
        this.y = this.groundY - lift;
        this.cameraAirLift = lift;
        const approachFlankX = this._clampArenaX(targetX - this.facing * 276, game, 105);
        const driftTowardArena =
          this._trueUltOriginX + (approachFlankX - this._trueUltOriginX) * easeAsc;
        this.x = this._clampArenaX(driftTowardArena, game, 105);
        const ascCol = 9 + Math.min(3, Math.floor(uAsc * 4));
        this.trueUltFrameOverride = 120 + ascCol;

        this._trueUltAfterimageAcc += dt;
        if (this._trueUltAfterimageAcc >= 0.055) {
          this._trueUltAfterimageAcc = 0;
          this.spawnAfterimage(this.x, this.y, this.facing, 4, ascCol, 0.20);
        }
      }

      if (t >= 0.36 && this._trueUltStep < 1) {
        this._trueUltStep = 1;
        if (game?.audio) game.audio.play('holy_spear', targetX);
        if (game?.vfx) {
          game.vfx.spawnShockwave(targetX, this.groundY - 4, 195, '#fbbf24', 0.32, true);
        }
      }
      return;
    }

    // PHASE 2 (1.10s..2.55s): Hover Elevated on Approach Flank (`y = groundY - 410`) & Spawn 6 Parallel ~56 deg Diagonal Einherjar Sky-Lances!
    if (t < 2.55) {
      const hoverT = t - 1.10;
      const approachFlankX = this._clampArenaX(targetX - this.facing * 276, game, 105);
      this.x += (approachFlankX - this.x) * Math.min(1, dt * 7.5);
      this.y = this.groundY - 410 + Math.sin(hoverT * 6.5) * 6;
      this.cameraAirLift = 410;
      this.facing = targetX >= this.x ? 1 : -1;

      const lanceSchedule = [1.14, 1.35, 1.56, 1.77, 1.98, 2.19];
      const ringOffsets = [-136, 136, -88, 88, -42, 42];
      const ringDepths = [-6, -6, 4, 4, -4, 6];

      while (
        this._trueUltLancesSpawned < 6 &&
        t >= lanceSchedule[this._trueUltLancesSpawned]
      ) {
        const idx = this._trueUltLancesSpawned++;
        const offsetX = ringOffsets[idx];
        const depthY = ringDepths[idx];
        const pinX = this._clampArenaX(targetX + offsetX, game, 95);
        const pinY = this.groundY - 122 + depthY;
        const lanceFacing = this.facing;
        const startX = pinX - lanceFacing * 228;
        const startY = pinY - 338;
        const lanceAngle = Math.atan2(pinY - startY, pinX - startX);

        this.einherjarSkyLances.push({
          index: idx,
          startX,
          startY,
          targetX: pinX,
          pinY,
          x: startX,
          y: startY,
          facing: lanceFacing,
          angle: lanceAngle,
          inFront: depthY > 0,
          age: 0,
          fallDuration: 0.16,
          impacted: false
        });
        this.spawnFeatherBurst(startX, startY, 6, 155, true);
        this.spawnValhallaGlint(startX, startY, 10, '#fde047', 0.24);
        this.spawnValhallaGlint(pinX, this.groundY - 385, 9, idx % 2 === 0 ? '#67e8f9' : '#fbbf24', 0.24);
      }

      if (this._trueUltLancesSpawned === 0) {
        this.trueUltFrameOverride = 132;
      } else {
        const lastFireT = lanceSchedule[this._trueUltLancesSpawned - 1];
        const shotDt = Math.max(0, t - lastFireT);
        if (shotDt < 0.032) this.trueUltFrameOverride = 134;
        else if (shotDt < 0.068) this.trueUltFrameOverride = 135;
        else if (shotDt < 0.110) this.trueUltFrameOverride = 136;
        else if (shotDt < 0.155) this.trueUltFrameOverride = 137;
        else this.trueUltFrameOverride = 138;
      }
      return;
    }

    // PHASE 3 (2.55s..4.35s): Bifrost Convergence, Supersonic Diagonal Valkyrie Falcon Dive & Backflip!
    if (t < 2.80) {
      if (this._trueUltStep < 2) {
        this._trueUltStep = 2;
        this._trueUltDiveStartX = this.x;
        this._trueUltLandX = this._clampArenaX(targetX - this.facing * 52, game, 105);
        this.facing = targetX >= this._trueUltDiveStartX ? 1 : -1;
        if (game?.audio) {
          game.audio.play('ult_cast', this.x);
          game.audio.play('storm_leap', this.x);
        }
        this.spawnFeatherBurst(this.x, this.y - 64, 10, 175, true);
      }
      const uCharge = (t - 2.55) / 0.25;
      this.y = this.groundY - 410 - Math.sin(uCharge * Math.PI) * 14;
      this.cameraAirLift = 410;
      this.trueUltFrameOverride = uCharge < 0.5 ? 139 : 140;
      return;
    }

    if (t < 3.10) {
      if (this._trueUltStep < 3) {
        this._trueUltStep = 3;
        if (game?.audio) game.audio.play('dash_whoosh', this.x);
        this.ragnarokDiveBeam = {
          x0: this._trueUltDiveStartX + this.facing * 24,
          y0: this.groundY - 436,
          x1: targetX,
          y1: this.groundY - 8,
          headX: this._trueUltDiveStartX + this.facing * 64,
          headY: this.groundY - 446,
          age: 0,
          maxLife: 0.54
        };
      }

      const uDive = Math.min(1, (t - 2.80) / 0.30);
      const easeDive = uDive * uDive * (0.35 + 0.65 * uDive);
      this.x = this._trueUltDiveStartX + (this._trueUltLandX - this._trueUltDiveStartX) * easeDive;
      this.y = this.groundY - 410 * (1 - easeDive);
      this.cameraAirLift = 410 * (1 - easeDive);
      const diveCol = 21 + Math.min(3, Math.floor(uDive * 4));
      this.trueUltFrameOverride = 120 + diveCol;

      if (this.ragnarokDiveBeam) {
        this.ragnarokDiveBeam.headX = this.x + this.facing * 64;
        this.ragnarokDiveBeam.headY = this.y - 36;
      }

      this._trueUltAfterimageAcc += dt;
      if (this._trueUltAfterimageAcc >= 0.025) {
        this._trueUltAfterimageAcc = 0;
        this.spawnAfterimage(this.x, this.y, this.facing, 4, diveCol, 0.24);
        this.spawnFeatherBurst(this.x - this.facing * 18, this.y - 46, 3, 145, true);
        this.spawnValhallaGlint(this.x + this.facing * 38, this.y - 24, 8, '#fde047', 0.18);
      }
      return;
    }

    // t >= 3.10s: BIFROST GUNGNIR RAGNAROK DETONATION!
    if (this._trueUltStep < 4) {
      this._trueUltStep = 4;
      this.x = this._trueUltLandX;
      this.y = this.groundY;
      this.cameraAirLift = 0;
      this.facing = targetX >= this.x ? 1 : -1;

      if (this.ragnarokDiveBeam) {
        this.ragnarokDiveBeam.headX = targetX;
        this.ragnarokDiveBeam.headY = this.groundY - 6;
      }
      if (this.ragnarokSeal) {
        this.ragnarokSeal.shattered = true;
      }
      for (const lance of this.einherjarSkyLances) {
        lance.impacted = true;
        lance.shatterAge = 0;
      }

      if (game?.audio) {
        game.audio.play('dragon_dive', targetX);
        game.audio.play('thunder_slam', targetX);
        game.audio.play('hit_crit', targetX);
      }
      game?.audio?.playHeroVoice?.(this.heroId, 'true_ult_fire', {
        worldX: this.x,
        speakerKey: this,
        priority: 4,
        cooldownMs: 200,
        duckSfx: true
      });
      if (game?.renderer) {
        game.renderer.triggerImpactFrame?.(targetX, this.groundY - 90, 0.15, 'crimson');
        game.renderer.triggerShake(22, 0.38);
        game.renderer.triggerAberration(12);
        game.renderer.triggerHitStop(0.08);
      }

      const pillarSpecs = [
        { x: targetX, w: 284, h: 428, maxLife: 0.96, glow: 'gold', inFront: true },
        { x: Math.max(90, targetX - 118), w: 232, h: 360, maxLife: 0.88, glow: 'crimson', inFront: false },
        { x: Math.min(ww - 90, targetX + 118), w: 232, h: 360, maxLife: 0.88, glow: 'crimson', inFront: false }
      ];
      for (const ps of pillarSpecs) {
        this.ragnarokPillars.push({
          x: ps.x,
          groundY: this.groundY,
          w: ps.w,
          h: ps.h,
          age: 0,
          maxLife: ps.maxLife,
          glowColor: ps.glow,
          inFront: ps.inFront
        });
        this.fx.spawn('dragonfireObeliskPillar', this._safeFxX(ps.x, game), this._safeFxY(this.groundY), {
          palette: ps.glow === 'gold' ? VALKYRIE_GOLD_PALETTE : VALKYRIE_CRIMSON_PALETTE,
          light: 1.35,
          extra: { baseRadius: ps.glow === 'gold' ? 22 : 16, height: ps.glow === 'gold' ? 98 : 82, isUltimate: true }
        });
      }

      this.spawnFeatherBurst(targetX, this.groundY - 120, 22, 260, true);
      this.spawnValhallaGlint(targetX, this.groundY - 128, 16, '#ffffff', 0.36);

      if (game?.vfx) {
        game.vfx.spawnShockwave(targetX, this.groundY - 6, 320, '#fbbf24', 0.48, true);
        game.vfx.spawnShockwave(targetX, this.groundY - 6, 220, '#f43f5e', 0.36, true);
        game.vfx.spawnDamageText(
          targetX,
          this.groundY - 196,
          0,
          true,
          'BIFROST RAGNAROK!',
          '#fbbf24'
        );
      }

      this.heal(Math.round(this.maxHp * (game?.is2v2Mode?.() ? 0.23 : 0.12)), 'VALHALLA GRACE');

      let hitFinisher = false;
      for (const foe of foes) {
        if (foe && !foe.isDead && !foe.isBenched && Math.abs(foe.x - targetX) < 260) {
          foe.takeDamage(615, this, true, 265, -275);
          hitFinisher = true;
        }
      }
      if (!hitFinisher && focusEnemy && !focusEnemy.isDead) {
        focusEnemy.takeDamage(615, this, true, 265, -275);
      }
    }

    if (t < 3.34) {
      const uHold = (t - 3.10) / 0.24;
      this.y = this.groundY;
      this.trueUltFrameOverride = 145 + Math.min(3, Math.floor(uHold * 4));
      return;
    }

    // Backflip dismount into long-range Sky-Lancer spacing!
    if (t < 4.06) {
      if (this._trueUltStep < 5) {
        this._trueUltStep = 5;
        this._trueUltFlipStartX = this.x;
        this._trueUltFlipEndX = this._clampArenaX(this.x - this.facing * 245, game, 95);
        if (game?.audio) game.audio.play('dash_whoosh', this.x);
      }
      const uFlip = Math.min(1, (t - 3.34) / 0.72);
      const easeX = 1 - Math.pow(1 - uFlip, 2);
      this.x = this._trueUltFlipStartX + (this._trueUltFlipEndX - this._trueUltFlipStartX) * easeX;
      this.y = this.groundY - Math.sin(uFlip * Math.PI) * 94;
      this.trueUltFrameOverride = 212 + Math.min(20, Math.floor(uFlip * 21));

      this._trueUltAfterimageAcc += dt;
      if (this._trueUltAfterimageAcc >= 0.06 && uFlip < 0.85) {
        this._trueUltAfterimageAcc = 0;
        this.spawnAfterimage(this.x, this.y, this.facing, 7, 2 + Math.min(18, Math.floor(uFlip * 19)), 0.20);
      }
      return;
    }

    this.y = this.groundY;
    this.cameraAirLift = 0;
    const uRec = Math.min(1, (t - 4.06) / 0.29);
    this.trueUltFrameOverride = 233 + Math.min(6, Math.floor(uRec * 7));

    if (t >= this.trueUltDuration) {
      this.y = this.groundY;
      this.divePitchRad = 0;
      this.cameraAirLift = 0;
      this.isInvulnerable = false;
      this.unstoppablePoise = false;
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      this.bahamutAvatar = null;
      this.ragnarokSeal = null;
      this.einherjarSkyLances = [];
      this.ragnarokDiveBeam = null;
      this.ragnarokPillars = [];
      this.setState('IDLE');
    }
  }

  // ============================================================================
  // PIXEL-PURE HD-2D RENDERING (ZERO blurry radial glow, ZERO `ctx.rotate`, ZERO `ctx.ellipse`)
  // ============================================================================

  drawBloomedVfxCell(ctx, vfxSheet, row, col, x, y, w = 208, h = 208, alpha = 1.0, flipX = false) {
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth || alpha <= 0.01) return;
    const cell = 208;
    const sx = Math.max(0, Math.min(29, Math.floor(col))) * cell;
    const sy = Math.max(0, Math.min(7, Math.floor(row))) * cell;
    const gx = Math.round(x / 2) * 2;
    const gy = Math.round(y / 2) * 2;
    const dw = Math.max(8, Math.round(w / 4) * 4);
    const dh = Math.max(8, Math.round(h / 4) * 4);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(gx, gy);
    if (flipX) ctx.scale(-1, 1);

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.drawImage(vfxSheet, sx, sy, cell, cell, -dw * 0.5, -dh * 0.5, dw, dh);

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(0.32, alpha * 0.28);
    ctx.drawImage(vfxSheet, sx, sy, cell, cell, -dw * 0.5, -dh * 0.5, dw, dh);

    ctx.restore();
  }

  drawBifrostSkyGate(ctx, centerX, skyY, gateAlpha = 1.0, age = 0, vfxSheet = null) {
    if (gateAlpha <= 0.02) return;
    const gx = Math.round(centerX / 4) * 4;
    const gy = Math.round(skyY / 4) * 4;
    const bifrostBands = ['#67e8f9', '#34d399', '#fbbf24', '#f43f5e', '#c084fc'];

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    drawBayerCrimsonGoldHalo(ctx, gx, gy + 18, 178, 28, '#fbbf24', 0.18 * gateAlpha, 4);
    drawBayerCrimsonGoldHalo(ctx, gx, gy + 18, 118, 18, '#f43f5e', 0.16 * gateAlpha, 4);

    if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      const col = Math.floor(age * 28) % 30;
      const crestCol = (col + 9) % 30;
      this.drawBloomedVfxCell(ctx, vfxSheet, 3, crestCol, gx, gy + 6, 260, 148, gateAlpha * 0.72, false);
      this.drawBloomedVfxCell(ctx, vfxSheet, 5, col, gx, gy + 16, 368, 108, gateAlpha * 0.94, false);
    }

    for (let k = 0; k < 10; k++) {
      const a = age * 2.4 + (k * Math.PI) / 5;
      const sx = gx + Math.cos(a) * 144;
      const sy = gy + 16 + Math.sin(a) * 20;
      drawValhallaStarGlint(ctx, sx, sy, k % 2 === 0 ? 6 : 4, bifrostBands[k % bifrostBands.length], gateAlpha * 0.88);
    }
    ctx.restore();
  }

  drawRagnarokLancesLayer(ctx, vfxSheet, inFrontPass) {
    if (!this.einherjarSkyLances || this.einherjarSkyLances.length === 0) return;
    const hasVfx = Boolean(vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth);

    for (let i = 0; i < this.einherjarSkyLances.length; i++) {
      const lance = this.einherjarSkyLances[i];
      if (Boolean(lance.inFront) !== inFrontPass) continue;
      const col = Math.floor(lance.age * 30) % 30;
      const shatterFade =
        lance.shatterAge !== undefined ? Math.max(0, 1 - lance.shatterAge / 0.30) : 1.0;
      if (shatterFade <= 0.02) continue;

      if (lance.impacted) {
        drawBayerCrimsonGoldHalo(
          ctx,
          lance.x + (lance.facing || 1) * 56,
          this.groundY - 2,
          36,
          10,
          lance.index % 2 === 0 ? '#fbbf24' : '#f43f5e',
          0.15 * shatterFade,
          4
        );
      }

      if (hasVfx) {
        const scalePulse = lance.shatterAge !== undefined ? 1 + lance.shatterAge * 1.1 : 1.0;
        const lanceSz = Math.round(312 * scalePulse);
        this.drawBloomedVfxCell(
          ctx,
          vfxSheet,
          6,
          col,
          lance.x,
          lance.y,
          lanceSz,
          lanceSz,
          0.95 * shatterFade,
          (lance.facing || 1) < 0
        );
      }
      if (lance.angle !== undefined) {
        drawSteppedAngledGungnirLance(ctx, lance.x, lance.y, lance.angle, 164, 0.90 * shatterFade, true);
      }
    }

    // Link adjacent impacted Einherjar Lances with pixel-stepped lightning chains!
    if (inFrontPass && this.einherjarSkyLances.length >= 2) {
      const planted = this.einherjarSkyLances.filter((l) => l.impacted && l.shatterAge === undefined);
      planted.sort((a, b) => a.x - b.x);
      for (let i = 0; i < planted.length - 1; i++) {
        drawPixelSteppedLightningChain(
          ctx,
          planted[i].x + (planted[i].facing || 1) * 32,
          this.groundY - 76,
          planted[i + 1].x + (planted[i + 1].facing || 1) * 32,
          this.groundY - 76,
          this.stateTimer * 2.5 + i,
          '#fb7185',
          '#fef08a',
          0.88
        );
      }
    }
  }

  drawRagnarokPillarsLayer(ctx, vfxSheet, inFrontPass) {
    if (!this.ragnarokPillars || this.ragnarokPillars.length === 0) return;
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;
    for (const p of this.ragnarokPillars) {
      if (Boolean(p.inFront) !== inFrontPass) continue;
      const u = Math.min(1, Math.max(0, p.age / p.maxLife));
      const col = Math.min(29, Math.floor(u * 30));
      const fade = u > 0.78 ? (1 - u) / 0.22 : 1.0;
      const anchorY = p.groundY - p.h * (37 / 104);
      drawBayerCrimsonGoldHalo(
        ctx,
        p.x,
        p.groundY - 2,
        p.w * 0.42,
        18,
        p.glowColor === 'gold' ? '#fbbf24' : '#f43f5e',
        0.17 * fade,
        4
      );
      this.drawBloomedVfxCell(ctx, vfxSheet, 7, col, p.x, anchorY, p.w, p.h, fade * 0.96, false);
    }
  }

  drawForegroundOverlay(ctx, renderer = null) {
    const sprites = this.getExSprites();
    const sheet = PixelForge.ensureImage(sprites?.sheet);
    const vfxSheet = PixelForge.ensureImage(sprites?.vfx);
    const hasVfx = Boolean(vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Subtle 4x4 Bayer-dithered Crimson-Gold Valkyrie Halo beneath Freyja EX (alpha <= 0.15)
    if (!this.isDead && this.y >= this.groundY - 12) {
      drawBayerCrimsonGoldHalo(ctx, this.x, this.groundY - 2, 48, 12, '#fbbf24', 0.14, 4);
    }

    if (this.ragnarokSeal) {
      const s = this.ragnarokSeal;
      const col = Math.floor(s.age * 30) % 30;
      const deploy = Math.min(1, s.age / 0.22);
      const sealAlpha = s.shattered ? Math.max(0, 1 - (this.stateTimer - 3.10) / 0.35) : 0.94 * deploy;

      if (sealAlpha > 0.02) {
        drawBayerCrimsonGoldHalo(ctx, s.x, s.y, 178 * deploy, 28 * deploy, '#f43f5e', 0.17 * sealAlpha, 4);
        drawBayerCrimsonGoldHalo(ctx, s.x, s.y, 112 * deploy, 18 * deploy, '#fbbf24', 0.15 * sealAlpha, 4);
        if (hasVfx) {
          this.drawBloomedVfxCell(ctx, vfxSheet, 5, col, s.x, s.y, Math.round(336 * deploy), Math.round(112 * deploy), sealAlpha, false);
        }
      }

      // Overhead Multi-Band Pixel Bifrost Sky-Gate!
      if (s.skyAlpha > 0.03) {
        this.drawBifrostSkyGate(ctx, s.x, this.groundY - 468, s.skyAlpha, s.age, vfxSheet);
      }
    }

    this.drawRagnarokLancesLayer(ctx, vfxSheet, false);
    this.drawRagnarokPillarsLayer(ctx, vfxSheet, false);

    // Overdrive / True Ultimate: Crisp Pixel-Art Crimson-Gold Bahamut Dragon-Crest (`Row 3` VFX)
    if (
      this.bahamutAvatar &&
      hasVfx &&
      !(this.state === 'TRUE_ULTIMATE' && this.y < this.groundY - 48)
    ) {
      const u = Math.min(1, Math.max(0, this.bahamutAvatar.life / this.bahamutAvatar.maxLife));
      const col = Math.min(29, Math.floor(u * 30));
      const fade = u < 0.10 ? u / 0.10 : u > 0.84 ? (1 - u) / 0.16 : 1.0;
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        3,
        col,
        this.bahamutAvatar.x,
        this.bahamutAvatar.y - 126,
        264,
        264,
        fade * 0.92,
        this.facing < 0
      );
    }

    if (this.afterimages.length > 0 && sheet && sheet.complete && sheet.naturalWidth) {
      for (const img of this.afterimages) {
        const alpha = Math.max(0, (1 - img.age / img.maxLife) * 0.50);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(Math.round(img.x / 2) * 2, Math.round((img.y + 4) / 2) * 2);
        ctx.scale(img.facing, 1);
        ctx.globalAlpha = alpha;
        PixelForge.drawSilhouetteFrame(ctx, sprites, img.frameIdx || 190, 208, 208, '#fb7185');
        ctx.restore();
      }
    }

    if (this.activeVfxAnims.length > 0 && hasVfx) {
      for (const v of this.activeVfxAnims) {
        if (v.inFront) continue;
        const u = Math.min(1, Math.max(0, v.age / v.maxLife));
        const span = Math.max(1, v.endFrame - v.startFrame + 1);
        const col = Math.min(29, v.startFrame + Math.floor(u * span));
        const fade = u < 0.12 ? u / 0.12 : u > 0.78 ? (1 - u) / 0.22 : 1.0;
        this.drawBloomedVfxCell(ctx, vfxSheet, v.row, col, v.x, v.y, v.w, v.h, fade * 0.90, v.flipX);
      }
    }

    ctx.restore();

    const shaderCenterX = this._resolveShaderCenterX(renderer);
    const shaderCenterY = Math.min(this.groundY, this.y + 185);
    this.fx.renderLayer(ctx, 'back', shaderCenterX, shaderCenterY, 0.96);
  }

  drawUltimateForeground(ctx, renderer = null) {
    const shaderCenterX = this._resolveShaderCenterX(renderer);
    const shaderCenterY = Math.min(this.groundY, this.y + 185);
    this.fx.renderLayer(ctx, 'front', shaderCenterX, shaderCenterY, 0.98);

    const sprites = this.getExSprites();
    const vfxSheet = PixelForge.ensureImage(sprites?.vfx);
    const hasVfx = Boolean(vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth);

    // Enlarged Winged Gungnir War-Spears (`Row 0`, 228x116 + stepped-pixel angled golden-crimson shaft & Odin spearhead!)
    if (this.activeSkySpears.length > 0) {
      for (let i = 0; i < this.activeSkySpears.length; i++) {
        const sp = this.activeSkySpears[i];
        const fade = Math.max(0.25, Math.min(1, 1 - Math.max(0, sp.age - sp.flightDuration * 0.85) / 0.12));
        const spCol = Math.floor(sp.age * 30 + i * 4) % 30;
        if (hasVfx) {
          this.drawBloomedVfxCell(
            ctx,
            vfxSheet,
            0,
            spCol,
            sp.x,
            sp.y,
            228,
            116,
            fade * 0.94,
            Math.cos(sp.angle) < 0
          );
        }
        drawSteppedAngledGungnirLance(ctx, sp.x, sp.y, sp.angle, sp.isUlt ? 128 : 112, fade * 0.96, sp.isUlt);
      }
    }

    // Skill: VALHALLA LIGHTNING JAVELINS (3 Planted Gungnir Javelins + Stepped Lightning Chains!)
    if (this.plantedSkillJavelins.length > 0 && hasVfx) {
      const plantedList = [];
      for (const jav of this.plantedSkillJavelins) {
        if (jav.detonated) continue;
        if (jav.planted) {
          plantedList.push(jav);
          drawBayerCrimsonGoldHalo(ctx, jav.x, this.groundY - 2, 42, 12, '#fbbf24', 0.16, 4);
        }
        const jCol = (Math.floor(jav.age * 30) + jav.index * 5) % 30;
        this.drawBloomedVfxCell(ctx, vfxSheet, 6, jCol, jav.x, jav.y, 148, 176, 0.96, jav.index % 2 === 1);
      }
      if (plantedList.length >= 2) {
        for (let i = 0; i < plantedList.length - 1; i++) {
          drawPixelSteppedLightningChain(
            ctx,
            plantedList[i].x,
            this.groundY - 68,
            plantedList[i + 1].x,
            this.groundY - 68,
            this.stateTimer * 3.0 + i,
            '#fb7185',
            '#fef08a',
            0.94
          );
        }
      }
    }

    // Overdrive: BAHAMUT VALKYRIE SANCTUARY (5 Converging Sky-Lances + Sanctuary Halo!)
    if (this.sanctuarySkyLances.length > 0 && hasVfx) {
      drawBayerCrimsonGoldHalo(ctx, this._ultTargetX, this.groundY - 2, 148, 22, '#f43f5e', 0.16, 4);
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        5,
        Math.floor(this.stateTimer * 24) % 30,
        this._ultTargetX,
        this.groundY - 4,
        280,
        88,
        0.88,
        false
      );
      const landedLances = [];
      for (const sl of this.sanctuarySkyLances) {
        if (sl.landed) landedLances.push(sl);
        const slCol = (Math.floor(sl.age * 30) + sl.index * 5) % 30;
        this.drawBloomedVfxCell(ctx, vfxSheet, 6, slCol, sl.x, sl.y, 172, 204, 0.96, sl.index % 2 === 1);
      }
      for (let i = 0; i < landedLances.length; i++) {
        drawPixelSteppedLightningChain(
          ctx,
          landedLances[i].x,
          this.groundY - 76,
          this._ultTargetX,
          this.groundY - 88,
          this.stateTimer * 3.2 + i,
          '#fb7185',
          '#ffffff',
          0.90
        );
      }
    }

    // Supreme Ultimate: Supersonic Diagonal Valkyrie Falcon Dive Multi-Band Bifrost Wake!
    if (this.ragnarokDiveBeam) {
      const b = this.ragnarokDiveBeam;
      const u = Math.min(1, b.age / b.maxLife);
      const fade = u > 0.55 ? (1 - u) / 0.45 : 1.0;
      if (fade > 0.02) {
        drawPixelSteppedLightningChain(ctx, b.x0, b.y0, b.headX, b.headY, b.age * 4, '#67e8f9', '#fef08a', fade * 0.92);
        drawPixelSteppedLightningChain(ctx, b.x0 + 8, b.y0 + 6, b.headX, b.headY, b.age * 4 + 1.5, '#f43f5e', '#ffffff', fade * 0.95);
        if (hasVfx && b.age < 0.32) {
          this.drawBloomedVfxCell(
            ctx,
            vfxSheet,
            4,
            Math.floor(b.age * 30) % 30,
            b.headX,
            b.headY,
            216,
            216,
            0.94 * fade,
            this.facing < 0
          );
        }
      }
    }

    this.drawRagnarokLancesLayer(ctx, vfxSheet, true);
    this.drawRagnarokPillarsLayer(ctx, vfxSheet, true);

    if (this.activeVfxAnims.length > 0 && hasVfx) {
      for (const v of this.activeVfxAnims) {
        if (!v.inFront) continue;
        const u = Math.min(1, Math.max(0, v.age / v.maxLife));
        const span = Math.max(1, v.endFrame - v.startFrame + 1);
        const col = Math.min(29, v.startFrame + Math.floor(u * span));
        const fade = u < 0.12 ? u / 0.12 : u > 0.78 ? (1 - u) / 0.22 : 1.0;
        this.drawBloomedVfxCell(ctx, vfxSheet, v.row, col, v.x, v.y, v.w, v.h, fade * 0.94, v.flipX);
      }
    }

    // Crisp Pixel Golden Wing-Feathers & 4-Point Valhalla Star-Glints!
    for (const f of this.pixelWingFeathers) {
      const fade = 1 - f.age / f.maxLife;
      drawPixelGoldenWingFeather(ctx, f.x, f.y, f.phase, f.isCrimson, fade * 0.94);
    }
    for (const g of this.valhallaStarGlints) {
      const fade = 1 - g.age / g.maxLife;
      drawValhallaStarGlint(ctx, g.x, g.y, g.arm, g.hex, fade * 0.96);
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

    ctx.restore();

    if (isReflection) {
      const vfxSheet = PixelForge.ensureImage(sprites?.vfx);
      if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;

      for (const p of this.ragnarokPillars) {
        const u = Math.min(1, Math.max(0, p.age / p.maxLife));
        const col = Math.min(29, Math.floor(u * 30));
        const fade = u > 0.78 ? (1 - u) / 0.22 : 1.0;
        const anchorY = p.groundY - p.h * (37 / 104);
        this.drawBloomedVfxCell(ctx, vfxSheet, 7, col, p.x, anchorY, p.w, p.h, fade * 0.38, false);
      }
      for (const sp of this.activeSkySpears) {
        const col = Math.floor(sp.age * 30) % 30;
        this.drawBloomedVfxCell(ctx, vfxSheet, 0, col, sp.x, sp.y, 228, 116, 0.34, Math.cos(sp.angle) < 0);
      }
      for (const lance of this.einherjarSkyLances) {
        const col = Math.floor(lance.age * 30) % 30;
        const shatterFade = lance.shatterAge !== undefined ? Math.max(0, 1 - lance.shatterAge / 0.30) : 1.0;
        if (shatterFade > 0.02) {
          this.drawBloomedVfxCell(ctx, vfxSheet, 6, col, lance.x, lance.y, 312, 312, shatterFade * 0.36, (lance.facing || 1) < 0);
          if (lance.angle !== undefined) {
            drawSteppedAngledGungnirLance(ctx, lance.x, lance.y, lance.angle, 164, shatterFade * 0.32, true);
          }
        }
      }
      if (this.bahamutAvatar) {
        const u = Math.min(1, Math.max(0, this.bahamutAvatar.life / this.bahamutAvatar.maxLife));
        const col = Math.min(29, Math.floor(u * 30));
        const fade = u < 0.10 ? u / 0.10 : u > 0.84 ? (1 - u) / 0.16 : 1.0;
        this.drawBloomedVfxCell(ctx, vfxSheet, 3, col, this.bahamutAvatar.x, this.bahamutAvatar.y - 126, 264, 264, fade * 0.36, this.facing < 0);
      }
      for (const v of this.activeVfxAnims) {
        const u = Math.min(1, Math.max(0, v.age / v.maxLife));
        const span = Math.max(1, v.endFrame - v.startFrame + 1);
        const col = Math.min(29, v.startFrame + Math.floor(u * span));
        const fade = u < 0.12 ? u / 0.12 : u > 0.78 ? (1 - u) / 0.22 : 1.0;
        this.drawBloomedVfxCell(ctx, vfxSheet, v.row, col, v.x, v.y, v.w, v.h, fade * 0.36, v.flipX);
      }
    }
  }
}
