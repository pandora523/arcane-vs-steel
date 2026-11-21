import { Fighter } from './Fighter.js?v=30fps201';
import { PixelForge } from '../engine/PixelForge.js?v=30fps201';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps201';
import {
  FORGE_EFFECT_REGISTRY,
  FORGE_GOLD_PALETTE,
  FORGE_JADE_PALETTE
} from '../engine/shaders/forgeShaders.js?v=30fps201';

const AUTO_SLICES_EX = [
  [60, 8], // Beat 1 (V0, 0.42s): Overhead Earth-Crush Smash Smear -> snaps at F03 (63)
  [68, 7], // Beat 2 (V1, 0.40s): Rising Volcanic Uppercut Maul Smear -> snaps at F09 (69)
  [75, 8], // Beat 3 (V2, 0.44s): 2.5D Baseball-Swing Horizontal Concussion Ring (2-Hit) -> snaps at F17/F18 (77/78)
  [83, 7]  // Beat 4 (V3, 0.58s): High Jump -> Meteoric World-Anvil Ground-Fissure Slam (3-Hit + forge_wave) -> snaps at F25 (85)
];

const BEAT_DURATIONS = [0.42, 0.40, 0.44, 0.58];
const INTRA_COMBO_LINK = 0.015;

const CATACLYSM_MAGMA_PALETTE = [
  '#1a0606',
  '#450a0a',
  '#991b1b',
  '#dc2626',
  '#f97316',
  '#fbbf24',
  '#fef08a',
  '#ffffff'
];

// 4x4 Bayer ordered stipple matrix for pixel-pure Neo-Vision molten/jade floor halos (zero radial blur!)
const BAYER_4X4 = [
  0.0625, 0.5625, 0.1875, 0.6875,
  0.8125, 0.3125, 0.9375, 0.4375,
  0.2500, 0.7500, 0.1250, 0.6250,
  1.0000, 0.5000, 0.8750, 0.3750
];

/**
 * Torgar EX (`titan_ex`) — Newly-Born Neo-Vision World-Breaker Forge King.
 * Wide-Canvas (`320x240`, `9600x2400` 10x30 sheet, `anchorX=112, anchorY=230`)
 * FFBE / Last Cloudia Hack-and-Slash Champion. Coexists 100% independently alongside classic Torgar (`titan`).
 *
 * Weapon & Visual Invariant:
 * - Strictly Blunt Symmetric Double-Faced Molten World-Maul (Mjolnir) + Ignited Crucible Back-Halo!
 * - ZERO sword-tip arcs anywhere; 100% blunt anvil shock-plates, octagonal concussion rings,
 *   stepped molten magma fissures, bouncing molten slag sparks, and 4x4 Bayer-stippled pixel halos!
 *
 * Newly-Born Neo-Vision Kit:
 * - `SKILL` (`TECTONIC FORGE-ANVIL RICOCHET`): Slams a glowing Runic Dwarven Anvil Monolith that
 *   ricochets off the arena wall with stepped molten magma fissures & emerald-jade shock-rings!
 * - `ULTIMATE` (`RAGNAROK GRAND-SLAM CRUSHER`): Ignites his Crucible Back-Halo, launches a seismic
 *   upward Maul eruption + horizontal World-Breaker Home-Run concussion shock-cone (`0.80s` wall-impact
 *   tectonic stun + flying molten slag chunks)!
 * - `TRUE_ULTIMATE` (`MJOLNIR GENESIS: CONTINENTAL SUNDER`): Colossal `2.15x` World-Forge God-King
 *   awakening — Sky-Uppercut -> Volcanic Leap -> Meteoric Mjolnir Ground-Anvil Smash carving a
 *   multi-layered 2.5D Pixel Magma Crater, 5 erupting Jade-Gold Lava Geysers, & stepped pixel lightning (`735` Crit)!
 */
export class TitanEx extends Fighter {
  constructor(x, groundY, facing = 1) {
    const opts = typeof x === 'object' && x !== null ? x : { x, groundY, facing };
    super({
      ...opts,
      name: opts.name || 'Torgar EX',
      maxHp: 4060,
      moveSpeed: 190,
      attackRange: 208,
      autoInterval: 0.99,
      lightColor: 'rgba(245, 158, 11, 1)',
      primaryColor: '#f59e0b',
      hasTrueUltimate: true,
      trueUltName: 'MJOLNIR GENESIS: CONTINENTAL SUNDER',
      trueUltDuration: 3.80
    });

    this.heroId = 'titan_ex';
    this.theme = 'forge';
    this.secondaryColor = '#10b981';
    this.deathSfx = 'death_titan';
    this.hasPoise = true;
    this.unstoppablePoise = false;

    this.skillName = 'TECTONIC FORGE-ANVIL RICOCHET';
    this.ultName = 'RAGNAROK GRAND-SLAM CRUSHER';
    this.ultSub = 'CRUCIBLE ERUPTION & HOME-RUN CONCUSSION';
    this.hasTrueUltimate = true;
    this.trueUltName = 'MJOLNIR GENESIS: CONTINENTAL SUNDER';
    this.trueUltSub = 'SUPREME FINISHER - 2.15X WORLD-FORGE GOD-KING';
    this.trueUltDuration = 3.80;

    this.skillTriggerRange = 465;
    this.skillMaxCooldown = 5.50;
    this.dashMaxCooldown = 2.95;
    this.autoDuration = BEAT_DURATIONS[0];
    this._postFlurryInterval = 1.58;
    this.skillDuration = 0.96;
    this.ultDuration = 1.54;
    this.crouchDuration = 0.80;
    this.dashDuration = 0.42;

    // 4-Beat Heavy Maul Combo State (`vx = 0` snap plants + 52-68ms hit-stop)
    this.comboStep = 0;
    this._autoVariant = 0;
    this._activeComboStage = 0;
    this._comboPersistTimer = 0;
    this._queuedNextBeat = false;
    this._intraLinkTimer = 0;
    this._beatHitMask = 0;
    this._beatStartX = this.x;
    this._beatTargetX = this.x;
    this._bootsPlanted = false;
    this._dragSparkAcc = 0;
    this._overrideFrameIdx = null;
    this.stepDustTimer = 0;
    this._ambientSparkTimer = 0;

    // Blunt Molten Anvil Concussion Shock-Bursts & Multi-Shape Pixel Forge Particles
    this.anvilShockBursts = [];
    this.forgeParticles = [];
    this.magmaFissureNodes = [];
    this.mjolnirLightningBolts = [];
    this.lavaGeyserQueue = [];
    this._magmaCrater = null;
    this._crucibleBackHaloTimer = 0;
    this.afterimages = [];

    // True Ultimate & Home-Run State
    this._trueUltStep = 0;
    this._trueUltDir = 1;
    this._trueUltMidAirClanged = false;
    this._trueUltAnvilX = 600;
    this._trueUltGeyserTimer = 0;
    this._trueUltBoundFoes = [];
    this._trueUltAirSparkAccum = 0;
    this._superJumpTrail = [];
    this.cameraAirLift = 0;

    // Orbiting Molten Crucible Cores (`0..5`) + Magma Bulwark
    this.crucibleStacks = 2;
    this.maxCrucibleStacks = 5;
    this._crucibleGainIcd = 0;
    this._crucibleOrbitPhase = 0;
    this.forgeArmorTimer = 0;

    // World-Anvil Altar + Ricocheting Anvil Monolith + Magnetic Fissure Waves
    this.worldAnvilAltar = null;
    this.activeAnvil = null;
    this.fissureWaves = [];
    this.ancestorSpiritTimer = 0;
    this.giantScale = 1.0;

    this.activeVfxAnims = [];
    this._soilRockChunks = [];
    this._soilDustPlumes = [];

    this._homeRunFlights = [];
    this._homeRunTargetWallX = 1118;
    this._homeRunDir = 1;
    this._homeRunSwingStreak = null;
    this._ultCastTriggered = false;
    this._ultErupted = false;
    this._ultWaveStep = 0;

    this.fx = new ArcaneShaderFX(FORGE_EFFECT_REGISTRY, {
      pixelScale: 3,
      viewW: 480,
      viewH: 260
    });
    this._mantleSlot = null;

    if (typeof Image !== 'undefined') {
      PixelForge.ensureHeroLoaded?.('titan_ex');
    }
  }

  applySovereignAspectStats(aspect) {
    if (aspect === 1) {
      this.maxHp = 3840;
      this.hp = this.maxHp;
      this.moveSpeed = 198;
      this._postFlurryInterval = 1.56;
    } else if (aspect === 2) {
      this.maxHp = 3730;
      this.hp = this.maxHp;
      this.moveSpeed = 179;
      this.dashMaxCooldown = 2.88;
      this._postFlurryInterval = 1.76;
    }
  }

  getExSprites() {
    if (typeof Image === 'undefined') return null;
    PixelForge.ensureHeroLoaded?.('titan_ex');
    return PixelForge.initAssets()?.titan_ex || null;
  }

  _clampArenaX(xv, game) {
    const margin = 84;
    const minX =
      game?.adventure?.lockActive && Number.isFinite(game.adventure.lockMinX)
        ? game.adventure.lockMinX + 24
        : margin;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const rawMaxX =
      game?.adventure?.lockActive && Number.isFinite(game.adventure.lockMaxX)
        ? game.adventure.lockMaxX - 24
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

  getActiveEnemies(enemy, game) {
    const isAdv = Boolean(game?.isAdventureMode?.() && game?.adventure?.active);
    const raw = game?.getEnemiesOf ? game.getEnemiesOf(this) : enemy ? [enemy] : [];
    const seen = new Set();
    const out = [];
    const canHitBurrowed = this.state === 'ULTIMATE' || this.state === 'TRUE_ULTIMATE';
    const pushIfValid = (foe) => {
      if (!foe || foe === this || foe.isDead || foe.isBenched || (foe.isFullyBurrowed && !canHitBurrowed) || seen.has(foe)) return;
      seen.add(foe);
      out.push(foe);
    };
    if (Array.isArray(raw)) {
      for (let i = 0; i < raw.length; i++) pushIfValid(raw[i]);
    }
    if (enemy) pushIfValid(enemy);
    if (isAdv && Array.isArray(game.adventure.enemies)) {
      for (let i = 0; i < game.adventure.enemies.length; i++) pushIfValid(game.adventure.enemies[i]);
    }
    if (isAdv && game.adventure.bossEntity) {
      pushIfValid(game.adventure.bossEntity);
    }
    return out;
  }

  spawnForgeParticles(cx, cy, count = 8, opts = {}) {
    const shapes = opts.shapes || ['slag', 'diamond', 'star4'];
    const speedMin = opts.speedMin ?? 55;
    const speedMax = opts.speedMax ?? 195;
    const lifeMin = opts.lifeMin ?? 0.22;
    const lifeMax = opts.lifeMax ?? 0.48;
    const gravity = opts.gravity ?? 260;
    const upwardBias = opts.upwardBias ?? -85;
    const isJade = Boolean(opts.isJade);

    for (let i = 0; i < count; i++) {
      if (this.forgeParticles.length >= 84) this.forgeParticles.shift();
      const ang = opts.dirBias !== undefined
        ? opts.dirBias + (Math.random() - 0.5) * (opts.spread || 0.9)
        : Math.random() * Math.PI * 2;
      const spd = speedMin + Math.random() * (speedMax - speedMin);
      const kind = shapes[i % shapes.length];
      this.forgeParticles.push({
        kind,
        x: cx + (Math.random() - 0.5) * 18,
        y: cy + (Math.random() - 0.5) * 14,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd + upwardBias,
        gravity,
        bounces: 0,
        age: 0,
        maxLife: lifeMin + Math.random() * (lifeMax - lifeMin),
        size: 3 + (i % 3),
        isJade: isJade ? i % 3 !== 1 : i % 3 === 0
      });
    }
  }

  spawnForgeShockRing(cx, groundY, maxRx = 96, isJade = false, maxLife = 0.34) {
    if (this.forgeParticles.length >= 84) this.forgeParticles.shift();
    this.forgeParticles.push({
      kind: 'ring',
      x: Math.round(cx / 2) * 2,
      y: Math.round(groundY / 2) * 2,
      vx: 0,
      vy: 0,
      gravity: 0,
      bounces: 0,
      age: 0,
      maxLife,
      size: maxRx,
      isJade
    });
  }

  spawnMagmaFissureNode(x, groundY, isJade = false, maxLife = 0.58) {
    if (this.magmaFissureNodes.length >= 24) this.magmaFissureNodes.shift();
    this.magmaFissureNodes.push({
      x: Math.round(x / 2) * 2,
      y: Math.round(groundY),
      w: 22 + Math.floor(Math.random() * 14),
      age: 0,
      maxLife,
      isJade
    });
  }

  spawnMjolnirLightning(x, groundY, topOffset = 380, isJade = false, maxLife = 0.36) {
    if (this.mjolnirLightningBolts.length >= 10) this.mjolnirLightningBolts.shift();
    const pts = [];
    const segs = 9;
    const topY = groundY - topOffset;
    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const jitter = i === 0 || i === segs ? 0 : ((i % 2 === 0 ? 1 : -1) * (10 + Math.floor(Math.random() * 16)));
      pts.push([Math.round((x + jitter) / 2) * 2, Math.round((topY + (groundY - topY) * u) / 2) * 2]);
    }
    this.mjolnirLightningBolts.push({
      pts,
      age: 0,
      maxLife,
      isJade
    });
  }

  gainCrucibleCore(amount = 1, game = null) {
    const prev = this.crucibleStacks;
    this.crucibleStacks = Math.max(0, Math.min(this.maxCrucibleStacks, this.crucibleStacks + amount));
    if (prev < this.maxCrucibleStacks && this.crucibleStacks >= this.maxCrucibleStacks) {
      this._crucibleBackHaloTimer = Math.max(this._crucibleBackHaloTimer, 1.4);
      this.spawnForgeParticles(this.x, this.y - 84, 10, { isJade: true });
      const g = game || this.game;
      g?.vfx?.spawnDamageText?.(this.x, this.y - 166, 0, false, 'CRUCIBLE MAX TEMPER!', '#10b981');
    }
  }

  triggerWorldBreakerTemper(targetX, enemy, game) {
    const g = game || this.game;
    const isAdv = Boolean(g?.isAdventureMode?.());
    const vsAspect = isAdv ? 0 : this.buildAspect || 0;
    if (this.crucibleStacks < this.maxCrucibleStacks) return false;
    this.crucibleStacks = 0;
    this.forgeArmorTimer = Math.max(this.forgeArmorTimer, vsAspect === 2 ? 0.68 : 0.58);
    this._crucibleBackHaloTimer = Math.max(this._crucibleBackHaloTimer, 0.95);

    const suppressHeal =
      !isAdv &&
      (vsAspect === 1 ||
        (this.state === 'SKILL' && (this.buildSkill || 0) === 1) ||
        (this.state === 'ULTIMATE' && (this.buildUlt || 0) === 1));
    if (!suppressHeal) {
      this.heal(19, 'WORLD-BREAKER TEMPER');
    }

    const ww = g?.renderer ? g.renderer.worldWidth : 1200;
    const obeliskX = Math.max(75, Math.min(ww - 75, targetX));
    this.fx?.spawn('tectonicCraterSlam', obeliskX, this.groundY - 4, {
      flip: this.facing < 0,
      palette: vsAspect === 1 ? CATACLYSM_MAGMA_PALETTE : FORGE_JADE_PALETTE,
      light: 1.32,
      extra: { maxRx: 136 }
    });
    this.spawnSheetBurst(2, obeliskX, this.groundY - 84, {
      w: 232,
      h: 232,
      maxLife: 0.54,
      flipX: this.facing < 0,
      glowColor: vsAspect === 1 ? 'gold' : 'emerald',
      inFront: false
    });
    this.spawnForgeShockRing(obeliskX, this.groundY - 2, 128, vsAspect !== 1, 0.36);
    g?.vfx?.spawnDamageText?.(
      this.x,
      this.y - 172,
      0,
      true,
      'WORLD-BREAKER TEMPER!',
      vsAspect === 1 ? '#fbbf24' : '#34d399'
    );

    const temperDmg = vsAspect === 1 ? 28 : vsAspect === 2 ? 18 : 24;
    for (const t of this.getActiveEnemies(enemy, g)) {
      if (Math.abs(t.x - obeliskX) <= 156) {
        t.takeDamage(temperDmg, this, true, 110 * this.facing, -185);
      }
    }
    return true;
  }

  manifestAncestorAvatar(duration = 0.72, light = 1.36) {
    this.ancestorSpiritTimer = Math.max(this.ancestorSpiritTimer, duration);
    this.fx?.spawn('khazadForgeAncestorAvatar', this.x - this.facing * 22, this.y - 102, {
      follow: this,
      offsetX: -this.facing * 22,
      offsetY: -102,
      flip: this.facing < 0,
      palette: FORGE_GOLD_PALETTE,
      light,
      maxDuration: duration
    });
  }

  triggerAnvilResonance(enemy, game, dmgBase = 36) {
    const altar = this.worldAnvilAltar;
    if (!altar || altar.life <= 0 || altar.resonanceCd > 0) return false;
    altar.resonanceCd = 0.65;

    const ax = altar.x;
    game?.audio?.play?.('clang', ax);
    game?.renderer?.triggerShake?.(9, 0.18);

    this.fx?.spawn('tectonicCraterSlam', ax, this.groundY - 4, {
      flip: this.facing < 0,
      palette: FORGE_JADE_PALETTE,
      light: 1.30,
      extra: { maxRx: 142 }
    });
    this.spawnForgeShockRing(ax, this.groundY - 2, 136, true, 0.36);
    this.spawnForgeParticles(ax, this.groundY - 58, 10, { isJade: true });
    this.spawnSheetBurst(4, ax, this.groundY - 66, {
      w: 224,
      h: 224,
      maxLife: 0.40,
      flipX: this.facing < 0,
      glowColor: 'emerald',
      inFront: true
    });
    this.spawnSheetBurst(2, ax, this.groundY - 84, {
      w: 216,
      h: 216,
      maxLife: 0.48,
      flipX: this.facing < 0,
      glowColor: 'gold',
      inFront: false
    });

    game?.vfx?.spawnDamageText?.(ax, this.groundY - 142, 0, true, 'ANVIL RESONANCE!', '#34d399');

    let hitAny = false;
    for (const t of this.getActiveEnemies(enemy, game)) {
      if (Math.abs(t.x - ax) <= 188) {
        const pullDir = ax >= t.x ? 1 : -1;
        t.takeDamage(dmgBase, this, true, pullDir * 105, -175);
        hitAny = true;
      }
    }
    return hitAny;
  }

  takeDamage(amount, attacker, isCrit = false, knockX = 0, knockY = 0) {
    const prevHp = this.hp;
    const ret = super.takeDamage(amount, attacker, isCrit, knockX, knockY);
    if (
      !this.isDead &&
      prevHp > this.hp &&
      (this.forgeArmorTimer > 0 || this.isDeflecting) &&
      this._crucibleGainIcd <= 0
    ) {
      this._crucibleGainIcd = 0.85;
      this.gainCrucibleCore(1, this.game);
      this.gainMana(1.0);
    }
    return ret;
  }

  setState(newState) {
    const prevState = this.state;
    if (this.state === 'TRUE_ULTIMATE' && newState !== 'TRUE_ULTIMATE') {
      this.cameraAirLift = 0;
      this.isFlipVault = false;
      this._superJumpTrail = [];
      if (Array.isArray(this._trueUltBoundFoes)) {
        for (const f of this._trueUltBoundFoes) {
          if (f) {
            f.isRooted = false;
            if (!f.isDead && f.y < f.groundY) f.y = f.groundY;
          }
        }
        this._trueUltBoundFoes = [];
      }
    }
    if (
      this.state === 'AUTO_ATTACK' &&
      newState !== 'AUTO_ATTACK' &&
      newState !== 'JUMP' &&
      newState !== 'ULTIMATE' &&
      newState !== 'TRUE_ULTIMATE'
    ) {
      this.y = this.groundY;
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
    }

    if (newState === 'SKILL') {
      this._skillVoiceFired = false;
    }

    if (newState === 'ULTIMATE') {
      this._ultVoiceFired = false;
      this._ultCastTriggered = false;
      this._ultErupted = false;
      this._ultWaveStep = 0;
      this._homeRunFlights = [];
      this._homeRunSwingStreak = null;
      this._crucibleBackHaloTimer = 1.65;
    }

    if (newState !== 'ULTIMATE' && newState !== 'TRUE_ULTIMATE') {
      this.giantScale = 1.0;
      this.cameraAirLift = 0;
      this.isInvulnerable = newState === 'JUMP';
      this._ultCastTriggered = false;
      this._ultErupted = false;
      this._ultWaveStep = 0;
    }

    if (newState !== 'ULTIMATE' && newState !== 'TRUE_ULTIMATE' && newState !== 'AUTO_ATTACK') {
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
    }

    if (newState === 'TRUE_ULTIMATE') {
      this._trueUltChargeVoiceFired = false;
      this._trueUltFireVoiceFired = false;
      this._trueUltStep = 0;
      this._trueUltMidAirClanged = false;
      this._trueUltGeyserTimer = 0;
      this._trueUltAirSparkAccum = 0;
      this._trueUltBoundFoes = [];
      this._superJumpTrail = [];
      this.lavaGeyserQueue.length = 0;
      this._crucibleBackHaloTimer = 3.90;
      this.isInvulnerable = true;
    }

    this.unstoppablePoise =
      newState === 'AUTO_ATTACK' ||
      newState === 'SKILL' ||
      newState === 'CROUCH' ||
      newState === 'ULTIMATE' ||
      newState === 'TRUE_ULTIMATE';

    if (newState === 'DEATH') {
      this.fx?.clear();
      this._mantleSlot = null;
      this.giantScale = 1.0;
      this.cameraAirLift = 0;
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      this.worldAnvilAltar = null;
      this.activeAnvil = null;
      this._magmaCrater = null;
      this._crucibleBackHaloTimer = 0;
      this.fissureWaves.length = 0;
      this.anvilShockBursts.length = 0;
      this.forgeParticles.length = 0;
      this.magmaFissureNodes.length = 0;
      this.mjolnirLightningBolts.length = 0;
      this.lavaGeyserQueue.length = 0;
      this._superJumpTrail = [];
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
    this._beatLandedHit = false;
    this.didActionFrame = false;
    this.didSecondaryAction = false;
    this._queuedNextBeat = false;
    this._bootsPlanted = false;
    this._dragSparkAcc = 0;
    this._comboPersistTimer = 0.80;
    this.unstoppablePoise = true;

    const startFrame = AUTO_SLICES_EX[v][0];
    this.trueUltFrameOverride = startFrame;
    this._overrideFrameIdx = startFrame;

    const enemy = this._currentEnemy || null;
    if (enemy && !enemy.isDead && !enemy.isDummyFocal) {
      this.facing = enemy.x >= this.x ? 1 : -1;
    }

    this._beatStartX = this.x;
    const baseStep = v === 0 ? 30 : v === 2 ? 22 : 16;
    let stepDist = baseStep;
    if (enemy && !enemy.isDead) {
      const frontDist = (enemy.x - this.x) * this.facing;
      if (frontDist > 0) {
        const minClear = v === 2 ? 118 : 122;
        stepDist = Math.max(0, Math.min(baseStep, frontDist - minClear));
      }
    }
    const desiredX = this.x + this.facing * stepDist;
    this._beatTargetX = this._clampArenaX(desiredX, game);
  }

  queueNextComboBeat() {
    this._queuedNextBeat = true;
  }

  getEffectiveAttackRange() {
    return [245, 218, 240, 232][(((this.comboStep || 0) % 4) + 4) % 4];
  }

  spawnAfterimage(x, y, facing, row, col, maxLife = 0.20, isJade = false) {
    if (this.afterimages.length >= 12) this.afterimages.shift();
    this.afterimages.push({
      x,
      y,
      facing,
      frameIdx: row * 30 + (col % 30),
      age: 0,
      maxLife,
      isJade
    });
  }

  spawnVfxAnim(row, x, y, w = 208, h = 208, maxLife = 0.44, opts = {}) {
    if (this.activeVfxAnims.length >= 28) this.activeVfxAnims.shift();
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
      glowColor: opts.glowColor || 'gold',
      followOwner: Boolean(opts.followOwner),
      offsetX: opts.offsetX || 0,
      offsetY: opts.offsetY || 0,
      inFront: Boolean(opts.inFront)
    });
  }

  spawnSheetBurst(row, x, y, opts = {}) {
    this.spawnVfxAnim(row, x, y, opts.w || 208, opts.h || 208, opts.maxLife || 0.42, opts);
  }

  /**
   * Spawns a Blunt Squared-Off Molten Anvil Concussion Shock-Burst (`0` pointed sword arcs!).
   */
  spawnAnvilShockBurst(cx, cy, halfW = 48, halfH = 18, maxLife = 0.22, isJade = false) {
    if (this.anvilShockBursts.length >= 16) this.anvilShockBursts.shift();
    this.anvilShockBursts.push({
      cx: Math.round(cx / 2) * 2,
      cy: Math.round(cy / 2) * 2,
      halfW,
      halfH,
      age: 0,
      maxLife,
      isJade
    });
  }

  spawnFissureWave(startX, dir) {
    this.fissureWaves.push({
      x: startX,
      y: this.groundY,
      startX,
      dir,
      vx: dir * 570,
      maxDist: 395,
      age: 0,
      maxLife: 0.72,
      hitTargets: new Set()
    });
  }

  fireWorldForgeWave(game, opts = {}) {
    const dir = this.facing;
    const spawnX = opts.x ?? this.x + dir * 96;
    const spawnY = opts.y ?? this.groundY - 68;
    if (game?.vfx?.spawnProjectile) {
      game.vfx.spawnProjectile({
        x: spawnX,
        y: spawnY,
        vx: dir * (opts.speed ?? 650),
        vy: 0,
        radius: opts.radius ?? 28,
        damage: opts.damage ?? 26,
        owner: this,
        color: '#f59e0b',
        coreColor: '#fde047',
        type: 'forge_wave',
        pierce: true,
        isUltimate: Boolean(opts.isUltimate),
        maxRange: opts.maxRange ?? 430
      });
    }
    this.spawnVfxAnim(0, spawnX, this.groundY - 52, 212, 212, 0.34, {
      vx: dir * 290,
      flipX: dir < 0,
      glowColor: 'emerald',
      inFront: true
    });
  }

  _gatherMaulTargets(primaryEnemy, game, reachFront = 236, reachBack = 42) {
    const targets = [];
    const seen = new Set();
    const isAdv = Boolean(game?.isAdventureMode?.() && game?.adventure?.active);
    const myGy = this.groundY || this.y;

    const canHitBurrowed = this.state === 'ULTIMATE' || this.state === 'TRUE_ULTIMATE';
    const consider = (foe) => {
      if (!foe || foe === this || foe.isDead || foe.isBenched || (foe.isFullyBurrowed && !canHitBurrowed) || seen.has(foe)) return;
      const relX = (foe.x - this.x) * this.facing;
      const hitPad = foe.isColossalBoss ? 84 : 0;
      if (relX < -reachBack - hitPad || relX > reachFront + hitPad) return;
      if (isAdv && !foe.isColossalBoss) {
        const foeGy = foe.groundY || foe.y;
        if (Math.abs(foeGy - myGy) > 68) return;
      }
      seen.add(foe);
      targets.push(foe);
    };

    consider(primaryEnemy);
    for (const foe of this.getActiveEnemies(primaryEnemy, game)) {
      consider(foe);
    }
    return targets;
  }

  _applyWorldMaulCrush(primaryEnemy, game, cfg) {
    const {
      damage = 34,
      reachFront = 236,
      reachBack = 42,
      hitStop = 0.054,
      shakeDur = 0.078,
      knockX = 120,
      knockY = -140,
      isCrit = false,
      isJade = false,
      shockW = 52,
      shockH = 20,
      callout = null,
      calloutColor = '#fbbf24',
      sfx = 'heavy_cleave'
    } = cfg;

    if (game?.audio) game.audio.play(sfx, this.x + this.facing * 92);
    this.didActionFrame = true;

    const targets = this._gatherMaulTargets(primaryEnemy, game, reachFront, reachBack);
    let landedAny = false;

    for (let i = 0; i < targets.length; i++) {
      const foe = targets[i];
      const dmg = i === 0 ? damage : Math.max(12, Math.round(damage * 0.85));
      foe.takeDamage(dmg, this, isCrit, knockX * this.facing, knockY);

      if (!foe.isDead && !foe.isColossalBoss) {
        foe._hitStopTimer = Math.max(foe._hitStopTimer || 0, hitStop);
        foe._hitShakeTimer = Math.max(foe._hitShakeTimer || 0, shakeDur);
      } else if (!foe.isDead && foe.isColossalBoss) {
        foe._hitShakeTimer = Math.max(foe._hitShakeTimer || 0, shakeDur * 0.80);
      }

      const hitX = foe.x;
      const hitY = foe.y - (foe.isColossalBoss ? 124 : 86);
      this.spawnAnvilShockBurst(hitX, hitY, shockW, shockH, 0.24, isJade);
      this.spawnSheetBurst(4, hitX, hitY, {
        w: 192,
        h: 192,
        maxLife: 0.24,
        flipX: this.facing < 0,
        glowColor: isJade ? 'emerald' : 'gold',
        inFront: true
      });
      this.spawnForgeParticles(hitX, hitY, isCrit ? 9 : 6, {
        shapes: ['slag', 'diamond', 'star4'],
        isJade
      });

      if (i === 0 && callout && game?.vfx) {
        game.vfx.spawnDamageText(foe.x, foe.y - 156, 0, isCrit, callout, calloutColor);
      }
      landedAny = true;
    }

    if (landedAny) {
      this._beatLandedHit = true;
      if (hitStop > 0) {
        this._hitStopTimer = Math.max(this._hitStopTimer || 0, hitStop);
        game?.renderer?.triggerHitStop?.(hitStop * 0.75);
      }
    }

    return landedAny;
  }

  ensureForgeMagmaMantle() {
    if (!this.fx) return;
    const shouldShowMantle =
      !this.isDead &&
      !this.isFlipVault &&
      this.state !== 'DEATH' &&
      (this.forgeArmorTimer > 0 || this.state === 'ULTIMATE' || this.state === 'TRUE_ULTIMATE');
    if (!shouldShowMantle) {
      this.fx.stopByKey('forgeMagmaMantle');
      this._mantleSlot = null;
      return;
    }
    const isFortified = this.forgeArmorTimer > 0 || this.crucibleStacks >= this.maxCrucibleStacks;
    let slot = this.fx.active.find((s) => s.key === 'forgeMagmaMantle');
    if (!slot) {
      const vsAspect = this.game?.isAdventureMode?.() ? 0 : this.buildAspect || 0;
      slot = this.fx.spawn('forgeMagmaMantle', this.x, this.y - 78, {
        follow: this,
        offsetX: 0,
        offsetY: -78,
        flip: false,
        palette:
          vsAspect === 1
            ? CATACLYSM_MAGMA_PALETTE
            : vsAspect === 2
              ? FORGE_JADE_PALETTE
              : FORGE_GOLD_PALETTE,
        light: 1.14,
        extra: { fortified: isFortified }
      });
    } else if (slot.inst?.cfg) {
      slot.inst.cfg.fortified = isFortified;
    }
    this._mantleSlot = slot;
  }

  startDodge(enemy, game) {
    this.dodgeCooldown = this.dodgeMaxCooldown * (0.86 + Math.random() * 0.28);
    const dist = enemy && !enemy.isDead ? Math.abs(enemy.x - this.x) : 999;
    if (dist < 230 || Math.random() < 0.65) {
      this.startCrouch(enemy, game);
    } else {
      this.startJump(enemy, game);
    }
  }

  startCrouch(_enemy, game) {
    const vsAspect = game?.isAdventureMode?.() ? 0 : this.buildAspect || 0;
    this.crouchDuration = 0.80;
    this.setState('CROUCH');
    this.isCrouching = true;
    this.isDeflecting = true;
    this.forgeArmorTimer = 1.15;
    this._crucibleBackHaloTimer = Math.max(this._crucibleBackHaloTimer, 0.90);
    this.gainCrucibleCore(1, game);
    if (vsAspect !== 1) {
      this.heal(14, 'FORGE TEMPER');
      if (vsAspect === 2) {
        this.grantBuildShield(16, 2.0, 'ADAMANT BARRIER!', '#10b981');
      }
    }
    this.vx = 0;
    const frontX = this.x + this.facing * 118;

    this.fx?.spawn('runicBulwarkDome', this.x, this.y - 78, {
      follow: this,
      offsetX: 0,
      offsetY: -78,
      flip: this.facing < 0,
      palette:
        vsAspect === 1
          ? CATACLYSM_MAGMA_PALETTE
          : vsAspect === 2
            ? FORGE_JADE_PALETTE
            : FORGE_GOLD_PALETTE,
      light: 1.18
    });
    this.spawnForgeShockRing(this.x, this.groundY - 2, 86, true, 0.28);

    if (game?.audio) game.audio.play('clang', frontX);
    game?.vfx?.spawnDamageText?.(this.x, this.y - 148, 0, false, 'MAGMA BULWARK!', '#fbbf24');
  }

  updateCrouch(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.crouchDuration || 0.80;
    this.vx *= Math.pow(0.001, dt);
    this.isDeflecting = t < 0.64;

    if (this.isDeflecting && game?.vfx?.projectiles) {
      for (const proj of game.vfx.projectiles) {
        if (
          proj.owner !== this &&
          (!this.team || !proj.owner?.team || proj.owner.team !== this.team) &&
          Math.abs(proj.x - (this.x + this.facing * 60)) < 118
        ) {
          proj.owner = this;
          proj.vx = -proj.vx * 1.28;
          proj.vy = -Math.abs(proj.vy) * 0.4;
          proj.color = '#f59e0b';
          this.gainMana(8);
          this.gainCrucibleCore(1, game);
          if (game?.audio) game.audio.play('clang', proj.x);
          game.vfx.spawnDamageText(this.x, this.y - 156, 0, false, 'ANVIL DEFLECT!', '#fef08a');
          this.spawnAnvilShockBurst(proj.x, proj.y, 42, 16, 0.22, true);
        }
      }
    }

    if (t >= 0.35 && !this.didActionFrame) {
      this.didActionFrame = true;
      const slamX = this.x + this.facing * 124;
      if (game?.audio) game.audio.play('thunder_slam', slamX);
      game?.renderer?.triggerShake?.(9, 0.18);

      this.fx?.spawn('tectonicCraterSlam', slamX, this.groundY - 6, {
        flip: this.facing < 0,
        palette: FORGE_GOLD_PALETTE,
        light: 1.22,
        extra: { maxRx: 118 }
      });
      this._applyWorldMaulCrush(enemy, game, {
        damage: 36,
        reachFront: 236,
        hitStop: 0.052,
        shakeDur: 0.072,
        knockX: 195,
        knockY: -155,
        isCrit: false,
        isJade: false,
        shockW: 54,
        shockH: 20,
        callout: 'MOLTEN NOVA!',
        calloutColor: '#fbbf24',
        sfx: 'thunder_slam'
      });
      this.triggerAnvilResonance(enemy, game, 30);
    }

    if (t >= dur) {
      this.isDeflecting = false;
      this.isCrouching = false;
      this.setState('IDLE');
    }
  }

  startJump(enemy, game, dirOverride = null) {
    this.jumpCooldown = 2.8;
    this.dashDuration = 0.62;
    this.setState('JUMP');
    this.isInvulnerable = true;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    let dir = dirOverride !== null ? dirOverride : this.facing;
    if (dirOverride === null && enemy && !enemy.isDead) {
      dir = Math.sign(enemy.x - this.x) || this.facing;
    }
    this.dashDir = dir;
    this.isFlipVault = true;
    this.vaultStartX = this.x;
    let targetDist = 185;
    if (enemy && !enemy.isDead && dir === (enemy.x >= this.x ? 1 : -1)) {
      const frontDist = Math.abs(enemy.x - this.x);
      if (frontDist > 136 && frontDist < 320) {
        targetDist = Math.min(185, Math.max(92, frontDist - 134));
      }
    }
    this.vaultTargetX = Math.max(85, Math.min(ww - 85, this.x + dir * targetDist));
    this.vx = 0;
    this.vy = 0;

    this.spawnForgeParticles(this.x, this.groundY - 8, 7, { isJade: false });
    if (game?.audio) game.audio.play('dash_whoosh', this.x);
    game?.vfx?.spawnDamageText?.(this.x, this.y - 144, 0, false, 'TECTONIC CRUSH LEAP!', '#fbbf24');
  }

  onStartDash(_enemy, game, dir) {
    this.isFlipVault = false;
    this.unstoppablePoise = true;
    this.dashDir = dir || this.facing;
    this._dashStartX = this.x;
    this._dashMaxTravel = 190;

    this.fx?.spawn('runicBulwarkDome', this.x, this.y - 78, {
      follow: this,
      offsetX: 0,
      offsetY: -78,
      flip: this.facing < 0,
      palette: FORGE_GOLD_PALETTE,
      light: 1.14
    });

    if (game?.audio) game.audio.play('dash_whoosh', this.x);
    game?.vfx?.spawnDamageText?.(this.x, this.y - 144, 0, false, 'JUGGERNAUT BULL-RUSH!', '#f59e0b');
  }

  onStartDodge(_enemy, game, dir) {
    const moveDir = dir || -this.facing;
    this.dashDir = moveDir;
    this.dashDuration = 0.38;
    this._dashStartX = this.x;
    this._dashMaxTravel = 160;
    this.didActionFrame = true;
    this.isFlipVault = false;
    this.isInvulnerable = true;
    game?.audio?.play?.('dash_whoosh', this.x);
    this.spawnForgeShockRing(this.x, this.groundY - 2, 56, false, 0.20);
  }

  updateDashOrDodge(_dt, enemy, game) {
    const t = this.stateTimer;
    const dur = Math.max(0.01, this.dashDuration || 0.44);
    const u = Math.min(1, t / dur);

    if (this.isFlipVault) {
      const easeU = 1 - Math.pow(1 - u, 1.55);
      this.x = this.vaultStartX + (this.vaultTargetX - this.vaultStartX) * easeU;
      this.y = this.groundY - Math.sin(u * Math.PI) * 64;
      this.vx = 0;
      this.vy = 0;

      if (u >= 0.80 && !this.didActionFrame) {
        this.didActionFrame = true;
        this.y = this.groundY;
        const slamX = this.x + this.facing * 120;
        game?.renderer?.triggerShake?.(11, 0.22);

        this.fx?.spawn('tectonicCraterSlam', slamX, this.groundY - 6, {
          flip: this.facing < 0,
          palette: FORGE_JADE_PALETTE,
          light: 1.24,
          extra: { maxRx: 132 }
        });
        this.spawnForgeShockRing(slamX, this.groundY - 2, 118, true, 0.30);
        this._applyWorldMaulCrush(enemy, game, {
          damage: 48,
          reachFront: 242,
          hitStop: 0.056,
          shakeDur: 0.080,
          knockX: 155,
          knockY: -200,
          isCrit: true,
          isJade: true,
          shockW: 58,
          shockH: 22,
          callout: 'SEISMIC SLAM!',
          calloutColor: '#fef08a',
          sfx: 'thunder_slam'
        });
        this.triggerAnvilResonance(enemy, game, 34);
      }

      if (t >= dur) {
        this.y = this.groundY;
        this.isFlipVault = false;
        this.isInvulnerable = false;
        this.setState('IDLE');
      }
      return;
    }

    const dir = this.dashDir || this.facing;
    const traveled = (this.x - (this._dashStartX ?? this.x)) * dir;
    const distToEnemy = enemy && !enemy.isDead ? (enemy.x - this.x) * dir : 999;
    if (traveled >= (this._dashMaxTravel || 190) || (distToEnemy <= 138 && distToEnemy >= 55)) {
      this.vx = 0;
    } else {
      const rushSpeed = 510 * (1 - u * 0.42);
      this.vx = dir * rushSpeed;
    }

    if (
      this.worldAnvilAltar &&
      this.worldAnvilAltar.dashBoostCd <= 0 &&
      Math.abs(this.x - this.worldAnvilAltar.x) < 76
    ) {
      this.worldAnvilAltar.dashBoostCd = 2.2;
      this.forgeArmorTimer = Math.max(this.forgeArmorTimer, 0.65);
      this.gainCrucibleCore(1, game);
      this.triggerAnvilResonance(enemy, game, 32);
      game?.audio?.play?.('clang', this.worldAnvilAltar.x);
      game?.vfx?.spawnDamageText?.(
        this.worldAnvilAltar.x,
        this.groundY - 135,
        0,
        true,
        'CRUCIBLE OVERCHARGE!',
        '#34d399'
      );
    }

    if (!this.didActionFrame) {
      for (const foe of this.getActiveEnemies(enemy, game)) {
        if (Math.abs(foe.x - this.x) < 126) {
          this._applyWorldMaulCrush(foe, game, {
            damage: 38,
            reachFront: 150,
            hitStop: 0.052,
            shakeDur: 0.070,
            knockX: 215,
            knockY: -135,
            isCrit: false,
            isJade: false,
            shockW: 48,
            shockH: 18,
            callout: 'SHOULDER RAM!',
            calloutColor: '#fbbf24',
            sfx: 'heavy_cleave'
          });
          break;
        }
      }
    }

    if (t >= dur) {
      this.vx = 0;
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  /**
   * 4-BEAT HEAVY WORLD-MAUL AUTO-ATTACK (`Row 2 [[60,8],[68,7],[75,8],[83,7]]`):
   * - Earth-shaking pre-snap lunge -> hard-locked `vx = 0` planted boots right on the blunt maul snap!
   * - `0.015s` intra-combo link (`V0 -> V1 -> V2 -> V3`) with ZERO return to `IDLE`!
   */
  updateAutoAttack(dt, enemy, game) {
    this._currentEnemy = enemy;
    this._comboPersistTimer = 0.80;

    if (this._intraLinkTimer > 0) {
      this._intraLinkTimer = Math.max(0, this._intraLinkTimer - dt);
      this.vx = 0;
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
    const dir = this.facing;
    const [sliceStart, sliceLen] = AUTO_SLICES_EX[v];

    const snapT = v === 0 ? 0.12 : v === 1 ? 0.08 : v === 2 ? 0.09 : 0.17;

    let localStep = 0;
    if (v === 0) {
      if (t < 0.12) localStep = Math.min(2, Math.floor((t / 0.12) * 3));
      else if (t < 0.185) localStep = 3;
      else if (t < 0.29) localStep = 4 + Math.min(1, Math.floor(((t - 0.185) / 0.105) * 2));
      else localStep = 6 + Math.min(1, Math.floor(((t - 0.29) / 0.13) * 2));
    } else if (v === 1) {
      if (t < 0.08) localStep = 0;
      else if (t < 0.145) localStep = 1;
      else if (t < 0.25) localStep = 2 + Math.min(1, Math.floor(((t - 0.145) / 0.105) * 2));
      else localStep = 4 + Math.min(2, Math.floor(((t - 0.25) / 0.15) * 3));
    } else if (v === 2) {
      if (t < 0.09) localStep = Math.min(1, Math.floor((t / 0.09) * 2));
      else if (t < 0.16) localStep = 2;
      else if (t < 0.23) localStep = 3;
      else localStep = 4 + Math.min(3, Math.floor(((t - 0.23) / 0.21) * 4));
    } else {
      if (t < 0.17) localStep = Math.min(1, Math.floor((t / 0.17) * 2));
      else if (t < 0.27) localStep = 2;
      else localStep = 3 + Math.min(3, Math.floor(((t - 0.27) / 0.31) * 4));
    }
    const frameIdx = sliceStart + Math.min(sliceLen - 1, Math.max(0, localStep));
    this.trueUltFrameOverride = frameIdx;
    this._overrideFrameIdx = frameIdx;

    this.vx = 0;
    if (t < snapT) {
      const lungeU = Math.min(1, Math.max(0, t / snapT));
      const eased = 1 - Math.pow(1 - lungeU, 2.1);
      this.x = this._beatStartX + (this._beatTargetX - this._beatStartX) * eased;

      if (v === 2 && !this.didSecondaryAction && t >= 0.03) {
        this.didSecondaryAction = true;
        this.manifestAncestorAvatar(0.68, 1.38);
      }

      if (v === 0 && Math.abs(this._beatTargetX - this._beatStartX) > 26) {
        this._dragSparkAcc += dt;
        if (this._dragSparkAcc >= 0.036) {
          this._dragSparkAcc = 0;
          this.spawnAfterimage(this.x, this.y, this.facing, 2, localStep, 0.16, false);
          this.spawnForgeParticles(this.x - dir * 32, this.groundY - 4, 3, { isJade: false });
        }
      }
    } else if (!this._bootsPlanted) {
      this._bootsPlanted = true;
      this.x = this._beatTargetX;
      this.vx = 0;
    }

    if (v === 3) {
      if (t < 0.17) {
        const airU = t / 0.17;
        this.y = this.groundY - Math.sin(airU * Math.PI * 0.86) * 68;
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
    const dmgMult = vsAspect === 1 ? 1.05 : vsAspect === 2 ? 0.81 : 1.0;

    if (v === 0) {
      if ((this._beatHitMask & 1) === 0 && t >= 0.12) {
        this._beatHitMask |= 1;
        const impactX = this.x + dir * 116;
        game?.renderer?.triggerShake?.(10, 0.20);
        if (game?.audio) game.audio.play('thunder_slam', impactX);

        this.fx?.spawn('tectonicCraterSlam', impactX, this.groundY - 4, {
          flip: dir < 0,
          palette: vsAspect === 1 ? CATACLYSM_MAGMA_PALETTE : FORGE_GOLD_PALETTE,
          light: 1.28,
          extra: { maxRx: 132 }
        });
        this.spawnForgeShockRing(impactX, this.groundY - 2, 86, false, 0.26);
        this.spawnFissureWave(this.x + dir * 94, dir);
        if (vsAspect === 1) {
          this.fireWorldForgeWave(game, {
            x: impactX,
            y: this.groundY - 68,
            damage: 18,
            speed: 700,
            maxRange: 460
          });
        }

        const landed = this._applyWorldMaulCrush(enemy, game, {
          damage: vsAspect === 0 ? 46 : Math.round(46 * dmgMult),
          reachFront: 176,
          hitStop: 0.054,
          shakeDur: 0.078,
          knockX: 115,
          knockY: -120,
          isCrit: false,
          isJade: false,
          shockW: 54,
          shockH: 20,
          callout: 'EARTH-SPLITTER!',
          calloutColor: '#f59e0b',
          sfx: 'heavy_cleave'
        });
        if (landed) this.gainMana(3.0);
      }
    } else if (v === 1) {
      if ((this._beatHitMask & 1) === 0 && t >= 0.08) {
        this._beatHitMask |= 1;
        const pillarX = this.x + dir * 116;
        game?.renderer?.triggerShake?.(11, 0.22);

        this.spawnSheetBurst(2, pillarX, this.groundY - 84, {
          w: 204,
          h: 204,
          maxLife: 0.44,
          flipX: dir < 0,
          glowColor: 'emerald',
          inFront: false
        });
        this.spawnForgeShockRing(pillarX, this.groundY - 2, 92, true, 0.28);

        const landed = this._applyWorldMaulCrush(enemy, game, {
          damage: vsAspect === 0 ? 50 : Math.round(50 * dmgMult),
          reachFront: 178,
          hitStop: 0.056,
          shakeDur: 0.082,
          knockX: 98,
          knockY: -195,
          isCrit: false,
          isJade: true,
          shockW: 52,
          shockH: 24,
          callout: 'SKY-BREAKER UPPERCUT!',
          calloutColor: '#fbbf24',
          sfx: 'heavy_cleave'
        });
        if (landed) {
          this.gainCrucibleCore(1, game);
          this.gainMana(3.2);
        }
      }
    } else if (v === 2) {
      if ((this._beatHitMask & 1) === 0 && t >= 0.09) {
        this._beatHitMask |= 1;
        this._applyWorldMaulCrush(enemy, game, {
          damage: vsAspect === 0 ? 32 : Math.round(32 * dmgMult),
          reachFront: 180,
          hitStop: 0.052,
          shakeDur: 0.074,
          knockX: 48,
          knockY: -36,
          isCrit: true,
          isJade: false,
          shockW: 60,
          shockH: 16,
          callout: null,
          sfx: 'clang'
        });
      }
      if ((this._beatHitMask & 2) === 0 && t >= 0.16) {
        this._beatHitMask |= 2;
        const impactX = this.x + dir * 122;
        game?.renderer?.triggerShake?.(12, 0.22);
        this.fx?.spawn('tectonicCraterSlam', impactX, this.groundY - 4, {
          flip: dir < 0,
          palette: vsAspect === 1 ? CATACLYSM_MAGMA_PALETTE : FORGE_JADE_PALETTE,
          light: 1.32,
          extra: { maxRx: 146 }
        });
        this.spawnForgeShockRing(impactX, this.groundY - 2, 108, true, 0.30);
        const landed = this._applyWorldMaulCrush(enemy, game, {
          damage: vsAspect === 0 ? 38 : Math.round(38 * dmgMult),
          reachFront: 184,
          hitStop: 0.056,
          shakeDur: 0.084,
          knockX: 165,
          knockY: -135,
          isCrit: true,
          isJade: true,
          shockW: 64,
          shockH: 18,
          callout: 'BATTERING-RAM SLAM!',
          calloutColor: '#10b981',
          sfx: 'thunder_slam'
        });
        if (landed) {
          this.gainMana(3.4);
          if (!this.triggerWorldBreakerTemper(impactX, enemy, game)) {
            this.gainCrucibleCore(1, game);
          }
        }
        this.triggerAnvilResonance(enemy, game, 38);
      }
    } else {
      if ((this._beatHitMask & 1) === 0 && t >= 0.17) {
        this._beatHitMask |= 1;
        const slamX = this.x + dir * 118;
        const ww = game?.renderer ? game.renderer.worldWidth : 1200;

        game?.renderer?.triggerShake?.(15, 0.28);
        if (game?.audio) {
          game.audio.play('thunder_slam', slamX);
          game.audio.play('clang', slamX);
        }
        game?.audio?.playHeroVoice?.(this.heroId, 'attack', {
          worldX: this.x,
          speakerKey: this,
          priority: 1,
          cooldownMs: 3600
        });

        this.fx?.spawn('tectonicCraterSlam', slamX, this.groundY - 4, {
          flip: dir < 0,
          palette: vsAspect === 1 ? CATACLYSM_MAGMA_PALETTE : FORGE_GOLD_PALETTE,
          light: 1.36,
          extra: { maxRx: 152 }
        });
        this.spawnForgeShockRing(slamX, this.groundY - 2, 126, false, 0.34);
        this.spawnSheetBurst(2, slamX, this.groundY - 82, {
          w: 216,
          h: 216,
          maxLife: 0.46,
          flipX: dir < 0,
          glowColor: 'gold',
          inFront: false
        });
        this.triggerSoilRockSplash(slamX, this.groundY, ww, 'leap');

        const landed = this._applyWorldMaulCrush(enemy, game, {
          damage: vsAspect === 0 ? 30 : Math.round(30 * dmgMult),
          reachFront: 186,
          hitStop: 0.068,
          shakeDur: 0.096,
          knockX: 52,
          knockY: -55,
          isCrit: true,
          isJade: false,
          shockW: 66,
          shockH: 26,
          callout: 'WORLD-ANVIL CRUSH!',
          calloutColor: '#34d399',
          sfx: 'heavy_cleave'
        });

        this.fireWorldForgeWave(game, {
          x: slamX,
          y: this.groundY - 68,
          damage: vsAspect === 0 ? 26 : Math.round(26 * dmgMult),
          speed: 660,
          maxRange: 440
        });

        if (landed) {
          this.gainMana(3.4);
          if (!this.triggerWorldBreakerTemper(slamX, enemy, game)) {
            this.gainCrucibleCore(1, game);
          }
        }
        this.triggerAnvilResonance(enemy, game, 32);
      }
      if ((this._beatHitMask & 2) === 0 && t >= 0.23) {
        this._beatHitMask |= 2;
        this._applyWorldMaulCrush(enemy, game, {
          damage: vsAspect === 0 ? 18 : Math.round(18 * dmgMult),
          reachFront: 188,
          hitStop: 0,
          shakeDur: 0.052,
          knockX: 42,
          knockY: -45,
          isCrit: false,
          isJade: true,
          shockW: 52,
          shockH: 18,
          sfx: 'clang'
        });
      }
      if ((this._beatHitMask & 4) === 0 && t >= 0.29) {
        this._beatHitMask |= 4;
        this._applyWorldMaulCrush(enemy, game, {
          damage: vsAspect === 0 ? 24 : Math.round(24 * dmgMult),
          reachFront: 190,
          hitStop: 0,
          shakeDur: 0.064,
          knockX: 165,
          knockY: -135,
          isCrit: true,
          isJade: false,
          shockW: 58,
          shockH: 22,
          sfx: 'thunder_slam'
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
        relEnemyX <= 192 &&
        (this._beatLandedHit || relEnemyX <= 168);

      if (v < 3 && (this._queuedNextBeat || aiWantsChain || advHoldingAttack)) {
        this._queuedNextBeat = false;
        if (game?.adventure?.queuedAction === 'attack') {
          game.adventure.queuedAction = null;
        }
        this._intraLinkTimer = INTRA_COMBO_LINK;
        return;
      }

      if (v === 3 || (!isManualPlayer && !this._beatLandedHit && !advHoldingAttack)) {
        this.comboStep = 0;
        this._aiComboReadyFinisher = v === 3 ? 0.94 : 0;
        this._aiOutstepTimer =
          !game?.isAdventureMode?.() && enemy && Math.abs(enemy.x - this.x) < 218
            ? 0.54 + Math.random() * 0.24
            : 0;
        this._aiOutstepDir = -1;
        this.autoCooldown = isManualPlayer
          ? 0.06
          : v === 3
            ? this._postFlurryInterval * (0.98 + Math.random() * 0.22)
            : 0.56 + Math.random() * 0.28;
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
   * NEWLY-BORN SKILL (`TECTONIC FORGE-ANVIL RICOCHET`, `0.96s`):
   * - Slams a glowing Runic Dwarven Anvil Monolith (`worldAnvilAltar`) into the floor,
   * - Batters it across the arena so it ricochets off the arena wall (`bouncesLeft = 1`)
   *   carving stepped molten magma fissures & emerald-jade shock-rings!
   */
  updateSkill(_dt, enemy, game) {
    const t = this.stateTimer;
    const dir = this.facing;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
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

    if (t >= 0.06 && !this.didActionFrame) {
      this.didActionFrame = true;
      this.vx = dir * 95;
      this.forgeArmorTimer = Math.max(this.forgeArmorTimer, vsSkill === 2 ? 0.95 : 0.75);
      this._crucibleBackHaloTimer = Math.max(this._crucibleBackHaloTimer, 1.0);
      this.gainCrucibleCore(1, game);
      if (vsSkill === 2) {
        this.heal(22, 'KHAZAD BASTION');
        this.grantBuildShield(36, 2.2, 'KHAZAD BARRIER!', '#10b981');
        this.healTeammateTagGrace(22, 'FORGE GRACE', 24, 2.2);
      }

      const anvilX = Math.max(98, Math.min(ww - 98, this.x + dir * 120));
      const altarLife = vsSkill === 2 ? 4.5 : 3.8;
      this.worldAnvilAltar = {
        x: anvilX,
        y: this.groundY,
        dir,
        age: 0,
        life: altarLife,
        maxLife: altarLife,
        pulseTimer: 1.35,
        resonanceCd: 0.45,
        dashBoostCd: 0
      };

      const slamPal1 = vsSkill === 1 ? CATACLYSM_MAGMA_PALETTE : FORGE_JADE_PALETTE;
      this.fx?.spawn('tectonicCraterSlam', anvilX, this.groundY - 4, {
        flip: dir < 0,
        palette: slamPal1,
        light: 1.28,
        extra: { maxRx: 132 }
      });
      this.fx?.spawn('runicBulwarkDome', this.x, this.groundY - 32, {
        follow: this,
        offsetX: 0,
        offsetY: -32,
        useGroundY: true,
        flip: dir < 0,
        palette: slamPal1,
        light: 1.22
      });
      game?.vfx?.spawnSkyStrike?.({
        x: anvilX,
        groundY: this.groundY,
        owner: this,
        target: null,
        damage: 0,
        delay: 0.01,
        flightDuration: 0.14,
        impactDuration: 0.42,
        type: 'runic_anvil',
        color: vsSkill === 1 ? '#f97316' : '#10b981',
        scale: 1.18,
        isUltimate: false
      });
      game?.vfx?.spawnDecal?.(anvilX, this.groundY, 'fissure', 92);
      game?.vfx?.spawnShockwave?.(anvilX, this.groundY - 2, vsSkill === 1 ? '#f97316' : '#10b981', 124, 0.32);
      this.spawnForgeShockRing(anvilX, this.groundY - 2, 118, vsSkill !== 1, 0.34);
      this.spawnMagmaFissureNode(anvilX, this.groundY, vsSkill !== 1, 0.85);
      this.spawnForgeParticles(anvilX, this.groundY - 48, 8, { isJade: vsSkill !== 1 });

      if (game?.audio) {
        game.audio.play('skill_cast', anvilX);
        game.audio.play('clang', anvilX);
      }
      game?.renderer?.triggerShake?.(8, 0.16);
      game?.vfx?.spawnSpecialCastAura?.(
        this,
        this.skillName,
        vsSkill === 1
          ? 'DOUBLE ANVIL RICOCHET'
          : vsSkill === 2
            ? 'KHAZAD IRON-BASTION'
            : 'TECTONIC ANVIL RICOCHET',
        'forge',
        false
      );
      game?.vfx?.spawnDamageText?.(
        anvilX,
        this.groundY - 126,
        0,
        false,
        vsSkill === 1
          ? 'VOLCANIC DOUBLE-RICOCHET!'
          : vsSkill === 2
            ? 'KHAZAD IRON-BASTION ALTAR!'
            : 'RUNIC ANVIL MONOLITH!',
        vsSkill === 1 ? '#fbbf24' : '#10b981'
      );

      const advSkillBounds =
        game?.adventure?.active && typeof game.adventure.getActiveStageBounds === 'function'
          ? game.adventure.getActiveStageBounds()
          : null;
      const pullMin = advSkillBounds ? advSkillBounds.minX + 24 : 70;
      const pullMax = advSkillBounds ? advSkillBounds.maxX - 24 : ww - 70;
      const pullStep = vsSkill === 2 ? 52 : 38;
      const dropDmg = vsSkill === 1 ? 40 : vsSkill === 2 ? 28 : 38;
      for (const foe of this.getActiveEnemies(enemy, game)) {
        if (Math.abs(foe.x - anvilX) <= 208) {
          const pullSign = anvilX >= foe.x ? 1 : -1;
          if (!foe.isColossalBoss) {
            foe.x = Math.max(pullMin, Math.min(pullMax, foe.x + pullSign * pullStep));
          }
          foe.takeDamage(dropDmg, this, false, pullSign * 55, -125);
        }
      }
    }

    if (t >= 0.44 && !this.didSecondaryAction) {
      this.didSecondaryAction = true;
      this.vx = 0;
      const impactX = this.worldAnvilAltar ? this.worldAnvilAltar.x : this.x + dir * 124;
      const impactY = this.groundY - 6;

      if (game?.audio) {
        game.audio.play('thunder_slam', impactX);
        game.audio.play('clang', impactX);
      }
      game?.renderer?.triggerShake?.(13, 0.24);
      game?.renderer?.triggerImpactFrame?.(impactX, impactY - 58, 0.06, 'forge');
      this._hitStopTimer = Math.max(this._hitStopTimer || 0, 0.058);
      game?.renderer?.triggerHitStop?.(0.048);

      const slamPal2 =
        vsSkill === 1
          ? CATACLYSM_MAGMA_PALETTE
          : vsSkill === 2
            ? FORGE_JADE_PALETTE
            : FORGE_GOLD_PALETTE;
      this.fx?.spawn('tectonicCraterSlam', impactX, impactY, {
        flip: dir < 0,
        palette: slamPal2,
        light: 1.30,
        extra: { maxRx: 134 }
      });
      this.fx?.spawn('moltenAnvilSparks', impactX, impactY - 48, {
        flip: dir < 0,
        palette: slamPal2,
        light: 1.26
      });
      game?.vfx?.spawnShockwave?.(impactX, this.groundY - 2, vsSkill === 2 ? '#10b981' : '#f59e0b', 136, 0.34);
      this.spawnSheetBurst(4, impactX, impactY - 58, {
        w: 212,
        h: 212,
        maxLife: 0.36,
        flipX: dir < 0,
        glowColor: vsSkill === 2 ? 'emerald' : 'gold',
        inFront: true
      });
      this.spawnAnvilShockBurst(impactX, impactY - 58, 66, 22, 0.26, vsSkill === 2);
      this.spawnForgeShockRing(impactX, this.groundY - 2, 132, vsSkill === 2, 0.34);
      this.spawnForgeParticles(impactX, impactY - 48, 12, {
        dirBias: dir > 0 ? 0 : Math.PI,
        spread: 0.85,
        isJade: vsSkill === 2
      });

      this.triggerWorldBreakerTemper(impactX + dir * 64, enemy, game);
      if (vsSkill === 1) {
        this.fireWorldForgeWave(game, {
          x: impactX,
          y: this.groundY - 68,
          damage: 18,
          speed: 700,
          maxRange: 460
        });
      }
      game?.vfx?.spawnDamageText?.(impactX, this.y - 158, 0, true, 'ANVIL RICOCHET LAUNCH!', '#fbbf24');

      this.activeAnvil = {
        x: impactX + dir * 18,
        y: this.groundY,
        vx: dir * (vsSkill === 1 ? 1020 : 940),
        dir,
        age: 0,
        trailAccum: 0,
        state: 'flying',
        bouncesLeft: 1,
        tier: vsSkill,
        rebounded: false,
        hitTargets: new Set()
      };

      const launchSplashDmg = vsSkill === 1 ? 38 : vsSkill === 2 ? 26 : 36;
      for (const foe of this.getActiveEnemies(enemy, game)) {
        if (Math.abs(foe.x - impactX) < 134) {
          foe.takeDamage(launchSplashDmg, this, true, dir * 155, -130);
        }
      }
    }

    if (t >= (this.skillDuration || 0.96)) {
      this.vx = 0;
      this.setState('IDLE');
    }
  }

  /**
   * NEWLY-BORN OVERDRIVE (`ULTIMATE` — `RAGNAROK GRAND-SLAM CRUSHER`, `1.54s`):
   * - Ignites his 8-Cog Crucible Back-Halo (`Row 3`),
   * - Launches a Seismic Upward Maul Eruption (`t = 0.22s`, `Row 2` Jade-Gold Lava Geyser) popping targets into the Batter's Box,
   * - Swings a Horizontal World-Breaker Home-Run Concussion Shock-Cone (`t = 0.46s`, `0.80s` wall-impact tectonic stun + molten slag chunks)!
   */
  updateUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.ultDuration || 1.54;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
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

    this.mana = 0;
    this.giantScale = 1.0;
    this.isInvulnerable = t < 0.22;
    this.unstoppablePoise = true;
    this.forgeArmorTimer = Math.max(this.forgeArmorTimer, vsUlt === 2 ? 0.95 : 0.60);
    this._crucibleBackHaloTimer = Math.max(this._crucibleBackHaloTimer, 0.45);
    this.vx = 0;
    this.vy = 0;

    const foes = this.getActiveEnemies(enemy, game);
    const leadFoe =
      foes.length > 0
        ? foes.reduce((best, f) => (Math.abs(f.x - this.x) < Math.abs(best.x - this.x) ? f : best))
        : enemy;

    const advBounds =
      game?.adventure?.active && typeof game.adventure.getActiveStageBounds === 'function'
        ? game.adventure.getActiveStageBounds()
        : null;
    const wallMinX = advBounds ? advBounds.minX + 24 : 82;
    const wallMaxX = advBounds ? advBounds.maxX - 24 : ww - 82;

    if (t >= 0.02 && !this._ultCastTriggered) {
      this._ultCastTriggered = true;
      this._ultErupted = false;
      this._ultWaveStep = 0;
      this._homeRunFlights = [];
      this.gainCrucibleCore(1, game);
      if (vsUlt === 2) {
        this.heal(30, 'WORLD-FORGE AEGIS');
        this.grantBuildShield(52, 2.4, 'WORLD-ANVIL BARRIER!', '#10b981');
        this.healTeammateTagGrace(24, 'ANVIL GRACE', 28, 2.4);
      }

      const refX = leadFoe && !leadFoe.isDead ? leadFoe.x : this.x;
      if (leadFoe?.isColossalBoss) {
        const bossFace = leadFoe.facing || -1;
        this._homeRunTargetWallX = leadFoe.anchorX || leadFoe.x;
        this._homeRunDir = bossFace < 0 ? 1 : -1;
      } else {
        const distRight = wallMaxX - refX;
        const distLeft = refX - wallMinX;
        this._homeRunTargetWallX = distRight >= distLeft ? wallMaxX : wallMinX;
        this._homeRunDir = this._homeRunTargetWallX >= refX ? 1 : -1;
      }
      this.facing = this._homeRunDir;

      if (game?.audio) {
        game.audio.play('ult_cast', this.x);
        game.audio.play('clang', this.x);
      }
      if (game?.vfx) {
        game.vfx.spawnSpecialCastAura(
          this,
          this.ultName,
          vsUlt === 1
            ? 'CALDERA METEOR GRAND-SLAM!'
            : vsUlt === 2
              ? 'AEGIS OF THE WORLD-FORGE!'
              : 'RAGNAROK GRAND-SLAM!',
          'forge',
          true
        );
        game.vfx.spawnDamageText(this.x, this.y - 168, 0, true, 'CRUCIBLE HALO IGNITE!', '#fde047');
      }
      game?.renderer?.triggerShake?.(9, 0.16);
      this.spawnForgeShockRing(this.x, this.groundY - 2, 112, vsUlt === 2, 0.32);
    }

    const batDir = this._homeRunDir || this.facing;
    this.facing = batDir;

    // Beat 1 (t = 0.22s): Seismic Upward Maul Eruption popping targets into the Batter's Box!
    if (t >= 0.22 && !this._ultErupted) {
      this._ultErupted = true;
      const eruptX = leadFoe && !leadFoe.isDead ? leadFoe.x : this.x + batDir * 110;
      if (game?.audio) game.audio.play('thunder_slam', eruptX);
      game?.renderer?.triggerShake?.(12, 0.20);
      game?.vfx?.spawnFlamePillar?.(eruptX, this.groundY, this, null, {
        theme: vsUlt === 1 ? 'fire' : 'emerald',
        damage: 0,
        width: 112,
        height: 244,
        delay: 0.02,
        maxLife: 0.46
      });
      game?.vfx?.spawnShockwave?.(eruptX, this.groundY - 2, vsUlt === 1 ? '#f97316' : '#10b981', 128, 0.32);
      this.spawnSheetBurst(2, eruptX, this.groundY - 86, {
        w: 228,
        h: 228,
        maxLife: 0.44,
        flipX: batDir < 0,
        glowColor: vsUlt === 1 ? 'gold' : 'emerald',
        inFront: false
      });
      this.spawnForgeShockRing(eruptX, this.groundY - 2, 108, vsUlt !== 1, 0.30);
      this.spawnForgeParticles(eruptX, this.groundY - 48, 8, { isJade: vsUlt !== 1 });
      const eruptDmg = vsUlt === 1 ? 20 : vsUlt === 2 ? 12 : 16;
      for (const f of foes) {
        if (f === leadFoe || Math.abs(f.x - eruptX) <= 185) {
          f.takeDamage(eruptDmg, this, false, 0, -95);
          this.mana = 0;
        }
      }
    }

    if (t < 0.46) {
      const windupU = Math.max(0, Math.min(0.999, t / 0.46));
      this.trueUltFrameOverride = 120 + Math.min(5, Math.floor(windupU * 6));

      if (leadFoe && !leadFoe.isDead) {
        if (leadFoe.isColossalBoss) {
          const bossFace = leadFoe.facing || -1;
          const bossBatterX = Math.max(
            wallMinX,
            Math.min(wallMaxX, (leadFoe.anchorX || leadFoe.x) + bossFace * 116)
          );
          const stepSpeed = t < 0.22 ? 28 : 14;
          this.x += (bossBatterX - this.x) * Math.min(1, dt * stepSpeed);
        } else {
          const clampedFoeX = Math.max(wallMinX + 112, Math.min(wallMaxX - 112, leadFoe.x));
          leadFoe.x += (clampedFoeX - leadFoe.x) * Math.min(1, dt * 16);
          const batterX = Math.max(wallMinX + 4, Math.min(wallMaxX - 4, leadFoe.x - batDir * 110));
          const stepSpeed = t < 0.22 ? 28 : 14;
          this.x += (batterX - this.x) * Math.min(1, dt * stepSpeed);
          const sweetSpotX = Math.max(wallMinX + 68, Math.min(wallMaxX - 68, this.x + batDir * 110));
          for (const f of foes) {
            if (!f.isColossalBoss && (f === leadFoe || Math.abs(f.x - sweetSpotX) <= 185)) {
              f.x += (sweetSpotX - f.x) * Math.min(1, dt * 15);
              f.vx = 0;
            }
          }
        }
      }
      return;
    }

    // Beat 2 (t >= 0.46s): Horizontal World-Breaker Home-Run Concussion Shock-Cone!
    if (t >= 0.46 && (this._ultWaveStep || 0) < 1) {
      this._ultWaveStep = 1;
      const contactX = leadFoe?.isColossalBoss
        ? (leadFoe.anchorX || leadFoe.x) + (leadFoe.facing || -1) * 20
        : Math.max(wallMinX + 8, Math.min(wallMaxX - 8, this.x + batDir * 112));
      const contactY = this.groundY - 82;

      if (game?.audio) {
        game.audio.play('parry_clang', contactX);
        game.audio.play('thunder_slam', contactX);
        game.audio.play('heavy_cleave', contactX);
      }
      game?.renderer?.triggerImpactFrame?.(0.08, contactX, contactY, 'forge');
      if (game?.renderer && game.renderer.impactFrameTimer > 1) {
        game.renderer.triggerImpactFrame?.(contactX, contactY, 0.08, 'forge');
      }
      game?.renderer?.triggerShake?.(20, 0.30);
      game?.renderer?.triggerAberration?.(10);
      game?.renderer?.triggerHitStop?.(0.065);
      this._hitStopTimer = Math.max(this._hitStopTimer || 0, 0.064);

      this.fx?.spawn('moltenAnvilSparks', contactX, contactY, {
        flip: batDir < 0,
        palette: vsUlt === 1 ? CATACLYSM_MAGMA_PALETTE : FORGE_JADE_PALETTE,
        light: 1.32
      });
      game?.vfx?.spawnBeam?.({
        x1: contactX,
        y1: contactY,
        x2: this._homeRunTargetWallX,
        y2: contactY,
        width: 24,
        color: vsUlt === 1 ? '#f97316' : '#10b981',
        coreColor: '#fde047',
        maxLife: 0.28,
        owner: this
      });
      this.spawnAnvilShockBurst(contactX, contactY, 76, 26, 0.28, vsUlt !== 1);
      this.spawnSheetBurst(4, contactX, contactY, {
        w: 224,
        h: 224,
        maxLife: 0.34,
        flipX: batDir < 0,
        glowColor: 'gold',
        inFront: true
      });
      this.spawnForgeParticles(contactX, contactY, 14, {
        dirBias: batDir > 0 ? 0 : Math.PI,
        spread: 0.65,
        speedMin: 95,
        speedMax: 260,
        isJade: vsUlt !== 1
      });
      if (vsUlt === 1) {
        this.fireWorldForgeWave(game, {
          x: contactX,
          y: this.groundY - 68,
          damage: 22,
          speed: 740,
          maxRange: 520,
          isUltimate: true
        });
        this.gainFinisher(8);
      }

      this._homeRunSwingStreak = {
        startX: contactX,
        startY: contactY,
        targetWallX: this._homeRunTargetWallX,
        dir: batDir,
        age: 0,
        maxLife: 0.52
      };

      game?.vfx?.spawnDamageText?.(
        contactX,
        this.groundY - 178,
        0,
        true,
        vsUlt === 1
          ? 'CALDERA METEOR GRAND-SLAM!'
          : vsUlt === 2
            ? 'AEGIS OF THE WORLD-FORGE!'
            : 'RAGNAROK GRAND-SLAM!',
        '#fde047'
      );

      const swingDmg = vsUlt === 1 ? 40 : vsUlt === 2 ? 24 : 34;
      for (const foe of foes) {
        if (foe !== leadFoe && Math.abs(foe.x - contactX) > 195) continue;
        const distRight = wallMaxX - foe.x;
        const distLeft = foe.x - wallMinX;
        const targetWallX = foe.isColossalBoss
          ? foe.anchorX || foe.x
          : this._homeRunTargetWallX || (distRight >= distLeft ? wallMaxX : wallMinX);
        foe.takeDamage(swingDmg, this, true, batDir * 680, -110);
        this.mana = 0;
        this._homeRunFlights.push({
          foe,
          startX: foe.x,
          targetWallX,
          dir: batDir,
          tier: vsUlt,
          elapsed: 0,
          duration: 0.38,
          sparkAccum: 0,
          crashed: false
        });
      }
    }

    if (this._homeRunFlights && this._homeRunFlights.length > 0) {
      for (const fl of this._homeRunFlights) {
        if (!fl.foe || fl.foe.isDead || fl.crashed) continue;
        fl.elapsed += dt;
        const u = Math.min(1, fl.elapsed / fl.duration);
        const easeU = 1 - Math.pow(1 - u, 1.75);

        if (!fl.foe.isColossalBoss) {
          fl.foe.x = fl.startX + (fl.targetWallX - fl.startX) * easeU;
          fl.foe.y = fl.foe.groundY - Math.sin(u * Math.PI) * 38;
        }
        fl.foe.vx = 0;
        fl.foe.vy = 0;
        fl.foe.hurtTimer = Math.max(fl.foe.hurtTimer || 0, 0.18);

        fl.sparkAccum += dt;
        if (fl.sparkAccum >= 0.065) {
          fl.sparkAccum = 0;
          this.spawnForgeParticles(fl.foe.x - fl.dir * 18, fl.foe.y - 68, 3, {
            dirBias: fl.dir >= 0 ? Math.PI : 0,
            spread: 0.55,
            speedMin: 45,
            speedMax: 120,
            isJade: false
          });
        }

        if (u >= 1.0 && !fl.crashed) {
          fl.crashed = true;
          const wallX = fl.targetWallX;
          if (!fl.foe.isColossalBoss) {
            fl.foe.x = wallX;
            fl.foe.y = fl.foe.groundY;
          }
          fl.foe.vx = 0;
          fl.foe.vy = 0;

          const crashDmg = fl.tier === 1 ? 42 : fl.tier === 2 ? 24 : 36;
          const crashStun = fl.tier === 2 ? 0.85 : 0.80;
          fl.foe.takeDamage(crashDmg, this, true, -fl.dir * 35, -110);
          this.mana = 0;
          if (!fl.foe.isColossalBoss) {
            fl.foe.x = wallX;
            fl.foe.y = fl.foe.groundY;
          }
          fl.foe.vx = 0;
          fl.foe.vy = 0;

          fl.foe.stunTimer = Math.max(fl.foe.stunTimer || 0, crashStun);
          fl.foe.hurtTimer = 0.28;

          if (game?.audio) {
            game.audio.play('earthshatter', wallX);
            game.audio.play('thunder_slam', wallX);
            game.audio.play('clang', wallX);
          }
          game?.renderer?.triggerShake?.(24, 0.36);
          game?.renderer?.triggerAberration?.(12);

          this.fx?.spawn('tectonicCraterSlam', wallX, this.groundY - 4, {
            flip: fl.dir < 0,
            palette: fl.tier === 1 ? CATACLYSM_MAGMA_PALETTE : FORGE_JADE_PALETTE,
            light: 1.38,
            extra: { maxRx: 165 }
          });
          game?.vfx?.spawnSkyStrike?.({
            x: wallX,
            groundY: this.groundY,
            owner: this,
            target: null,
            damage: 0,
            delay: 0.01,
            flightDuration: 0.12,
            impactDuration: 0.42,
            type: 'runic_anvil',
            color: fl.tier === 1 ? '#f97316' : '#10b981',
            scale: 1.28,
            isUltimate: true
          });
          game?.vfx?.spawnDecal?.(wallX, this.groundY, 'fissure', 112);
          game?.vfx?.spawnShockwave?.(wallX, this.groundY - 2, fl.tier === 1 ? '#f97316' : '#10b981', 148, 0.36);
          this.spawnSheetBurst(4, wallX, this.groundY - 78, {
            w: 216,
            h: 216,
            maxLife: 0.40,
            flipX: fl.dir < 0,
            glowColor: 'gold',
            inFront: true
          });
          this.spawnForgeShockRing(wallX, this.groundY - 2, 138, fl.tier !== 1, 0.38);
          this.spawnForgeParticles(wallX, this.groundY - 68, 12, {
            dirBias: fl.dir >= 0 ? Math.PI : 0,
            spread: 1.1,
            speedMin: 68,
            speedMax: 210,
            isJade: fl.tier !== 1
          });
          this.triggerSoilRockSplash(wallX, this.groundY, ww, 'leap');

          game?.vfx?.spawnDamageText?.(
            wallX,
            this.groundY - 176,
            0,
            true,
            fl.tier === 2 ? 'TECTONIC WALL-STUN 0.95S!' : 'TECTONIC WALL-STUN 0.8S!',
            '#34d399'
          );
          this.triggerAnvilResonance(enemy, game, 34);
        }
      }
    }

    if (t < 0.72) {
      const swingU = Math.max(0, Math.min(0.999, (t - 0.46) / 0.26));
      this.trueUltFrameOverride = 120 + 6 + Math.min(4, Math.floor(swingU * 5));
    } else if (t < 1.14) {
      const holdU = Math.max(0, Math.min(0.999, (t - 0.72) / 0.42));
      this.trueUltFrameOverride = 120 + 10 + Math.min(1, Math.floor(holdU * 2));
    } else {
      const recU = Math.max(0, Math.min(0.999, (t - 1.14) / Math.max(0.01, dur - 1.14)));
      this.trueUltFrameOverride = 120 + 12 + Math.min(2, Math.floor(recU * 3));
    }

    if (t >= dur) {
      this._ultWaveStep = 0;
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      this.giantScale = 1.0;
      this.isInvulnerable = false;
      this.unstoppablePoise = false;
      this.setState('IDLE');
    }
  }

  /**
   * NEWLY-BORN SUPREME FINISHER (`TRUE_ULTIMATE`, `3.80s`):
   * `MJOLNIR GENESIS: CONTINENTAL SUNDER`
   * - Colossal `2.15x` World-Forge God-King awakening -> Sky-Uppercut -> Volcanic Leap ->
   *   Meteoric Mjolnir Ground-Anvil Smash (`735` Crit) carving a multi-layered 2.5D Pixel Magma Crater,
   *   5 erupting Jade-Gold Lava Geysers, & stepped pixel lightning!
   */
  updateTrueUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    if (!this._trueUltChargeVoiceFired && t < 2.36) {
      this._trueUltChargeVoiceFired = true;
      game?.audio?.playHeroVoice?.(this.heroId, 'true_ult_charge', {
        worldX: this.x,
        speakerKey: this,
        priority: 3,
        cooldownMs: 400,
        duckSfx: true
      });
    }
    const dur = this.trueUltDuration || 3.80;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    this.isInvulnerable = t < 0.35;
    this.vx = 0;
    this.vy = 0;
    this.hasPoise = true;
    this.unstoppablePoise = true;

    if (this._trueUltStep >= 4 && this._trueUltGeyserTimer > 0) {
      this._trueUltGeyserTimer = Math.max(0, this._trueUltGeyserTimer - dt);
    }

    const activeFoes = this.getActiveEnemies(enemy, game);
    const advBounds =
      game?.adventure?.active && typeof game.adventure.getActiveStageBounds === 'function'
        ? game.adventure.getActiveStageBounds()
        : null;
    const zMin = advBounds ? advBounds.minX : 0;
    const zMax = advBounds ? advBounds.maxX : ww;

    if (this._trueUltStep < 1) {
      const anchorFoe = activeFoes[0] || enemy;
      if (anchorFoe?.isColossalBoss) {
        const bossFace = anchorFoe.facing || -1;
        this._trueUltAnvilX = (anchorFoe.anchorX || anchorFoe.x) + bossFace * 40;
        this._trueUltDir = bossFace < 0 ? 1 : -1;
      } else {
        const margin = advBounds ? 95 : 240;
        this._trueUltAnvilX = anchorFoe
          ? Math.max(zMin + margin, Math.min(zMax - margin, anchorFoe.x))
          : Math.max(zMin + margin, Math.min(zMax - margin, this.x + this.facing * 180));
        this._trueUltDir = this._trueUltAnvilX >= this.x ? 1 : -1;
      }
    }

    const ultDir = this._trueUltDir || this.facing;
    this.facing = ultDir;
    const standX = Math.max(zMin + 24, Math.min(zMax - 24, this._trueUltAnvilX - ultDir * 136));
    const skyApexX = Math.max(zMin + 28, Math.min(zMax - 28, this._trueUltAnvilX - ultDir * 42));

    if (t >= 0.04 && this._trueUltStep < 1) {
      this._trueUltStep = 1;
      this._superJumpTrail = [];
      this.forgeArmorTimer = 6.0;
      this._crucibleBackHaloTimer = 4.2;
      this.crucibleStacks = this.maxCrucibleStacks;
      this._trueUltBoundFoes = [...activeFoes];
      for (const foe of activeFoes) {
        foe.isRooted = true;
        foe.vx = 0;
        foe.vy = 0;
      }

      game?.audio?.play?.('ult_cast', this.x);
      game?.audio?.play?.('parry_clang', this._trueUltAnvilX);
      game?.vfx?.triggerCinematicCutIn?.(this, this.trueUltName, '#f97316');
      game?.vfx?.spawnSpecialCastAura?.(this, this.trueUltName, 'MJOLNIR GENESIS!', 'forge', true);
      game?.vfx?.spawnDamageText?.(this.x, this.y - 185, 0, true, 'WORLD-FORGE GOD-KING!', '#f97316');

      this.fx?.spawn('tectonicCraterSlam', this._trueUltAnvilX, this.groundY - 4, {
        flip: ultDir < 0,
        palette: FORGE_GOLD_PALETTE,
        light: 1.32,
        extra: { maxRx: 165 }
      });
      this.spawnSheetBurst(5, this._trueUltAnvilX, this.groundY - 46, {
        w: 312,
        h: 312,
        maxLife: 2.35,
        flipX: ultDir < 0,
        glowColor: 'gold',
        inFront: false
      });
      this.spawnMjolnirLightning(this._trueUltAnvilX, this.groundY, 360, false, 0.34);
    }

    if (t < 0.62) {
      const growU = Math.max(0, Math.min(1, t / 0.52));
      const easeGrow = growU * growU * (3 - 2 * growU);
      this.giantScale = 1.0 + 1.15 * easeGrow;
      this.isFlipVault = false;
      this.cameraAirLift = Math.round(420 * easeGrow);
      this._superJumpTrail = [];

      for (const foe of activeFoes) {
        if (!this._trueUltBoundFoes.includes(foe)) this._trueUltBoundFoes.push(foe);
        if (!foe.isColossalBoss) {
          foe.isRooted = true;
          foe.vx = 0;
          foe.vy = 0;
          foe.x += (this._trueUltAnvilX - foe.x) * Math.min(1, dt * 16);
          foe.y = foe.groundY;
        }
      }
      this.x += (standX - this.x) * Math.min(1, dt * 18);
      this.y = this.groundY;

      if (t < 0.24) {
        this.trueUltFrameOverride = 120;
      } else {
        const coilU = Math.max(0, Math.min(0.999, (t - 0.24) / 0.38));
        this.trueUltFrameOverride = 120 + 15 + Math.min(1, Math.floor(coilU * 2));
      }
      return;
    }

    if (t < 1.96) {
      this.giantScale = 2.15;
      this.cameraAirLift = 680;

      if (t >= 0.62 && this._trueUltStep < 2) {
        this._trueUltStep = 2;
        game?.audio?.play?.('parry_clang', this._trueUltAnvilX);
        game?.audio?.play?.('thunder_slam', this._trueUltAnvilX);
        game?.audio?.play?.('heavy_cleave', this._trueUltAnvilX);
        game?.renderer?.triggerShake?.(18, 0.26);
        game?.renderer?.triggerHitStop?.(0.055);
        this._hitStopTimer = Math.max(this._hitStopTimer || 0, 0.056);

        game?.vfx?.spawnDamageText?.(
          this._trueUltAnvilX,
          this.groundY - 205,
          0,
          true,
          'MJOLNIR SKY-UPPERCUT!',
          '#fbbf24'
        );
        this.fx?.spawn('tectonicCraterSlam', this._trueUltAnvilX, this.groundY - 4, {
          flip: ultDir < 0,
          palette: FORGE_GOLD_PALETTE,
          light: 1.36,
          extra: { maxRx: 168 }
        });
        this.spawnSheetBurst(2, this._trueUltAnvilX, this.groundY - 102, {
          w: 276,
          h: 276,
          maxLife: 0.56,
          flipX: ultDir < 0,
          glowColor: 'gold',
          inFront: false
        });
        this.spawnMjolnirLightning(this._trueUltAnvilX, this.groundY, 390, true, 0.38);
      }

      const launchU = Math.max(0, Math.min(1, (t - 0.62) / 0.44));
      const easeUp = 1 - Math.pow(1 - launchU, 3);
      const hoverBob = launchU >= 1 ? Math.sin((t - 1.06) * 10.0) * 4 : 0;
      const targetFoeY = this.groundY - 210 * easeUp + hoverBob;

      for (let fIdx = 0; fIdx < activeFoes.length; fIdx++) {
        const foe = activeFoes[fIdx];
        if (!this._trueUltBoundFoes.includes(foe)) this._trueUltBoundFoes.push(foe);
        if (!foe.isColossalBoss) {
          const staggerX = fIdx === 0 ? 0 : fIdx % 2 === 1 ? 102 : -102;
          foe.isRooted = true;
          foe.vx = 0;
          foe.vy = 0;
          foe.x = Math.max(95, Math.min(ww - 95, this._trueUltAnvilX + staggerX));
          foe.y = targetFoeY;
        }
        foe.hurtTimer = Math.max(foe.hurtTimer || 0, 0.24);
      }

      this._trueUltAirSparkAccum = (this._trueUltAirSparkAccum || 0) + dt;
      if (this._trueUltAirSparkAccum >= 0.085) {
        this._trueUltAirSparkAccum = 0;
        this.spawnForgeParticles(this._trueUltAnvilX, targetFoeY - 42, 3, {
          isJade: true
        });
      }

      if (t < 1.10) {
        this._superJumpTrail = [];
        this.isFlipVault = false;
        this.x = standX;
        this.y = this.groundY;
        const upU = Math.max(0, Math.min(0.999, (t - 0.62) / 0.48));
        this.trueUltFrameOverride = 120 + 17 + Math.min(2, Math.floor(upU * 3));
      } else if (t < 1.20) {
        this._superJumpTrail = [];
        this.isFlipVault = false;
        this.x = standX;
        this.y = this.groundY;
        this.trueUltFrameOverride = 120 + 16;
      } else if (t < 1.56) {
        if (this._trueUltStep < 3) {
          this._trueUltStep = 3;
          this._superJumpTrail = [];
          game?.audio?.play?.('dash_whoosh', standX);
          game?.audio?.play?.('thunder_slam', standX);
          game?.renderer?.triggerShake?.(14, 0.20);

          this.fx?.spawn('tectonicCraterSlam', standX, this.groundY - 4, {
            flip: ultDir < 0,
            palette: FORGE_GOLD_PALETTE,
            light: 1.32,
            extra: { maxRx: 156 }
          });
          this.triggerSoilRockSplash(standX, this.groundY, ww, 'leap');
          game?.vfx?.spawnDamageText?.(standX, this.groundY - 190, 0, true, 'VOLCANIC GOD-LEAP!', '#fbbf24');
        }

        const prevFrame = this.trueUltFrameOverride || 120 + 20;
        if (!Array.isArray(this._superJumpTrail)) this._superJumpTrail = [];
        this._superJumpTrail.push({ x: this.x, y: this.y, frameIdx: prevFrame });
        if (this._superJumpTrail.length > 2) this._superJumpTrail.shift();

        const jumpU = Math.max(0, Math.min(1, (t - 1.20) / 0.36));
        const easeJump = 1 - (1 - jumpU) * (1 - jumpU);
        this.isFlipVault = true;
        this.x = standX + (skyApexX - standX) * easeJump;
        this.y = this.groundY - 380 * easeJump;
        this.trueUltFrameOverride = jumpU < 0.48 ? 120 + 20 : 120 + 21;
      } else {
        this._superJumpTrail = [];
        this.isFlipVault = true;
        const hangU = Math.max(0, Math.min(1, (t - 1.56) / 0.40));
        this.x = skyApexX;
        this.y = this.groundY - 380 - Math.sin(hangU * Math.PI * 0.5) * 10;
        this.trueUltFrameOverride = hangU < 0.5 ? 120 + 22 : 120 + 23;
      }
      return;
    }

    if (t < 2.36) {
      this._superJumpTrail = [];
      this.giantScale = 2.15;
      this.isFlipVault = true;
      const plungeU = Math.max(0, Math.min(1, (t - 1.96) / 0.40));
      const accel = plungeU * plungeU;
      this.cameraAirLift = Math.round(680 * (1 - accel * 0.62));

      const advTrueBounds =
        game?.adventure?.active && typeof game.adventure.getActiveStageBounds === 'function'
          ? game.adventure.getActiveStageBounds()
          : null;
      const landMin = advTrueBounds ? advTrueBounds.minX + 36 : 115;
      const landMax = advTrueBounds ? advTrueBounds.maxX - 36 : ww - 115;
      const targetLandX = Math.max(landMin, Math.min(landMax, this._trueUltAnvilX - ultDir * 96));
      this.x = skyApexX + (targetLandX - skyApexX) * accel;
      this.y = this.groundY - 390 * (1 - accel);

      if (plungeU >= 0.34 && !this._trueUltMidAirClanged) {
        this._trueUltMidAirClanged = true;
        game?.audio?.play?.('parry_clang', this._trueUltAnvilX);
        game?.renderer?.triggerHitStop?.(0.045);
        this.spawnAnvilShockBurst(this._trueUltAnvilX, this.groundY - 210, 72, 24, 0.24, false);
        this.spawnForgeParticles(this._trueUltAnvilX, this.groundY - 210, 10, { isJade: false });
      }

      const foeDriveU = plungeU < 0.34 ? 0 : Math.min(1, (plungeU - 0.34) / 0.66);
      const foeY = this.groundY - 210 * (1 - foeDriveU * foeDriveU);
      for (let fIdx = 0; fIdx < activeFoes.length; fIdx++) {
        const foe = activeFoes[fIdx];
        if (!foe.isColossalBoss) {
          const staggerX = fIdx === 0 ? 0 : fIdx % 2 === 1 ? 102 : -102;
          foe.isRooted = true;
          foe.vx = 0;
          foe.vy = 0;
          foe.x = Math.max(95, Math.min(ww - 95, this._trueUltAnvilX + staggerX));
          foe.y = foeY;
        }
        foe.hurtTimer = Math.max(foe.hurtTimer || 0, 0.24);
      }

      this.trueUltFrameOverride = plungeU < 0.28 ? 120 + 24 : plungeU < 0.65 ? 120 + 25 : 120 + 26;
      return;
    }

    // Beat 4 (t >= 2.36s): Meteoric Mjolnir Ground-Anvil Smash -> 2.5D Pixel Magma Crater + 5 Jade-Gold Lava Geysers + Stepped Lightning!
    if (this._trueUltStep < 4) {
      this._trueUltStep = 4;
      this._superJumpTrail = [];
      this._trueUltGeyserTimer = 1.25;
      this.isFlipVault = false;
      this.y = this.groundY;
      this.trueUltFrameOverride = 120 + 27;

      game?.renderer?.triggerImpactFrame?.(0.12, this._trueUltAnvilX, this.groundY - 96, 'forge');
      if (game?.renderer && game.renderer.impactFrameTimer > 1) {
        game.renderer.triggerImpactFrame?.(this._trueUltAnvilX, this.groundY - 96, 0.12, 'forge');
      }
      game?.renderer?.shake?.(30, 0.80);
      game?.renderer?.triggerShake?.(30, 0.80);
      game?.renderer?.flash?.(0.30, '#fff7ed');
      game?.renderer?.triggerAberration?.(16);
      game?.renderer?.triggerHitStop?.(0.09);
      this._hitStopTimer = Math.max(this._hitStopTimer || 0, 0.068);

      game?.audio?.play?.('ult_cast', this._trueUltAnvilX);
      game?.audio?.play?.('earthshatter', this._trueUltAnvilX);
      game?.audio?.play?.('parry_clang', this._trueUltAnvilX);
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

      this.heal(Math.round(this.maxHp * 0.09), 'WORLD-FORGE TEMPER');
      this.forgeArmorTimer = 1.25;
      this.crucibleStacks = this.maxCrucibleStacks;

      this.fx?.spawn('ragnarokWorldForgeWave', this._trueUltAnvilX, this.groundY - 4, {
        flip: ultDir < 0,
        palette: FORGE_GOLD_PALETTE,
        light: 1.44,
        extra: { stage: 3 }
      });
      this.fx?.spawn('tectonicCraterSlam', this._trueUltAnvilX, this.groundY - 4, {
        flip: ultDir < 0,
        palette: FORGE_GOLD_PALETTE,
        light: 1.40,
        extra: { maxRx: 215 }
      });

      // Multi-layered 2.5D Molten Caldera + SkyStrike Runic Anvil + 5 Volcanic Fissure Pillars (`0` boxy fillRect slabs!)
      game?.vfx?.spawnSkyStrike?.({
        x: this._trueUltAnvilX,
        groundY: this.groundY,
        owner: this,
        target: null,
        damage: 0,
        delay: 0.01,
        flightDuration: 0.14,
        impactDuration: 0.56,
        type: 'runic_anvil',
        color: '#f59e0b',
        scale: 1.65,
        isUltimate: true
      });
      game?.vfx?.spawnDecal?.(this._trueUltAnvilX, this.groundY, 'fissure', 168);
      game?.vfx?.spawnShockwave?.(this._trueUltAnvilX, this.groundY - 2, '#f59e0b', 228, 0.48);

      this._magmaCrater = {
        x: this._trueUltAnvilX,
        y: this.groundY,
        rx: 218,
        ry: 28,
        age: 0,
        maxLife: 2.35
      };
      this.spawnSheetBurst(7, this._trueUltAnvilX, this.groundY - 48, {
        w: 392,
        h: 248,
        maxLife: 1.15,
        flipX: ultDir < 0,
        glowColor: 'gold',
        inFront: false
      });

      // Queue 5 Erupting Jade-Gold Lava Geysers + Volcanic Flame Pillars + Stepped Pixel Lightning across the sundered fault!
      const geyserOffsets = [0, -108, 108, -214, 214];
      this.lavaGeyserQueue = [];
      for (let gIdx = 0; gIdx < geyserOffsets.length; gIdx++) {
        const gx = Math.max(96, Math.min(ww - 96, this._trueUltAnvilX + geyserOffsets[gIdx]));
        const gDelay = Math.floor(gIdx / 2) * 0.085;
        this.lavaGeyserQueue.push({
          x: gx,
          delay: gDelay,
          isJade: gIdx % 2 === 1,
          size: gIdx === 0 ? 284 : 228
        });
        game?.vfx?.spawnFlamePillar?.(gx, this.groundY, this, null, {
          theme: 'emerald',
          damage: 0,
          width: gIdx === 0 ? 132 : 98,
          height: gIdx === 0 ? 286 : 232,
          delay: Math.max(0.02, gDelay + 0.02),
          maxLife: 0.62
        });
      }
      this.spawnMjolnirLightning(this._trueUltAnvilX, this.groundY, 440, false, 0.46);
      this.spawnMjolnirLightning(Math.max(96, this._trueUltAnvilX - 118), this.groundY, 390, true, 0.42);
      this.spawnMjolnirLightning(Math.min(ww - 96, this._trueUltAnvilX + 118), this.groundY, 390, true, 0.42);

      this.spawnForgeShockRing(this._trueUltAnvilX, this.groundY - 2, 208, false, 0.48);
      this.spawnForgeParticles(this._trueUltAnvilX, this.groundY - 58, 22, {
        speedMin: 85,
        speedMax: 265,
        isJade: true
      });
      this.triggerSoilRockSplash(this._trueUltAnvilX, this.groundY, ww, 'cataclysm');

      game?.vfx?.spawnDamageText?.(
        this._trueUltAnvilX,
        this.groundY - 210,
        0,
        true,
        'CONTINENTAL SUNDER! STUNNED!',
        '#f97316'
      );

      for (const foe of this._trueUltBoundFoes) {
        if (foe) foe.isRooted = false;
      }
      this._trueUltBoundFoes = [];

      for (const foe of activeFoes) {
        if (!foe.isColossalBoss) {
          foe.isRooted = false;
          foe.y = foe.groundY;
          foe.vx = 0;
          foe.vy = 0;
        }
        foe.takeDamage(680, this, true, ultDir * 120, 0);
        if (!foe.isDead && !foe.isColossalBoss) {
          foe.y = foe.groundY;
          foe.vx = 0;
          foe.vy = 0;
          foe.stunTimer = Math.max(foe.stunTimer || 0, 1.85);
          foe.hurtTimer = 0.36;
        }
      }
    }

    this.y = this.groundY;
    this.isFlipVault = false;
    const postU = Math.max(0, Math.min(1, (t - 2.36) / Math.max(0.01, dur - 2.36)));
    const easeBack = postU * postU * (3 - 2 * postU);
    this.giantScale = 2.15 - 1.15 * easeBack;
    this.cameraAirLift = Math.round(250 * Math.max(0, 1 - postU * 2.1));

    if (t < 2.95) {
      this.trueUltFrameOverride = 120 + 27;
    } else {
      const recU = Math.max(0, Math.min(0.999, (t - 2.95) / Math.max(0.01, dur - 2.95)));
      this.trueUltFrameOverride = 120 + 28 + Math.min(1, Math.floor(recU * 2));
    }

    if (t >= dur) {
      this.y = this.groundY;
      this.giantScale = 1.0;
      this.cameraAirLift = 0;
      this.isFlipVault = false;
      this.isInvulnerable = false;
      this.unstoppablePoise = false;
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      this._trueUltGeyserTimer = 0;
      this._superJumpTrail = [];
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
    if (this._comboPersistTimer > 0 && this.state !== 'AUTO_ATTACK') {
      this._comboPersistTimer = Math.max(0, this._comboPersistTimer - dt);
      if (this._comboPersistTimer <= 0) {
        this.comboStep = 0;
      }
    }
    if (this.forgeArmorTimer > 0) {
      this.forgeArmorTimer = Math.max(0, this.forgeArmorTimer - dt);
    }
    if (this._crucibleBackHaloTimer > 0) {
      this._crucibleBackHaloTimer = Math.max(0, this._crucibleBackHaloTimer - dt);
    }
    if (this._crucibleGainIcd > 0) {
      this._crucibleGainIcd = Math.max(0, this._crucibleGainIcd - dt);
    }
    if (this.ancestorSpiritTimer > 0) {
      this.ancestorSpiritTimer = Math.max(0, this.ancestorSpiritTimer - dt);
    }
    if (this._homeRunSwingStreak) {
      this._homeRunSwingStreak.age += dt;
      if (this._homeRunSwingStreak.age >= this._homeRunSwingStreak.maxLife) {
        this._homeRunSwingStreak = null;
      }
    }
    if (this._magmaCrater) {
      this._magmaCrater.age += dt;
      if (this._magmaCrater.age >= this._magmaCrater.maxLife) {
        this._magmaCrater = null;
      }
    }
    this._crucibleOrbitPhase += dt * (this.crucibleStacks >= this.maxCrucibleStacks ? 4.4 : 2.8);

    // Process staggered 5-Geyser eruptions during Continental Sunder
    for (let i = this.lavaGeyserQueue.length - 1; i >= 0; i--) {
      const g = this.lavaGeyserQueue[i];
      g.delay -= dt;
      if (g.delay <= 0) {
        this.spawnSheetBurst(2, g.x, this.groundY - Math.round(g.size * 0.42), {
          w: g.size,
          h: g.size,
          maxLife: 0.72,
          flipX: g.isJade,
          glowColor: g.isJade ? 'emerald' : 'gold',
          inFront: g.isJade
        });
        this.spawnSheetBurst(6, g.x, this.groundY - 96, {
          w: 196,
          h: 196,
          maxLife: 0.44,
          flipX: g.isJade,
          glowColor: g.isJade ? 'emerald' : 'gold',
          inFront: true
        });
        this.spawnForgeParticles(g.x, this.groundY - 52, 6, { isJade: g.isJade });
        this.lavaGeyserQueue.splice(i, 1);
      }
    }

    if (!this.isDead && (this.state === 'IDLE' || this.state === 'WALK')) {
      this._ambientSparkTimer += dt;
      if (this._ambientSparkTimer >= 0.48) {
        this._ambientSparkTimer = 0;
        this.spawnForgeParticles(this.x - this.facing * 12, this.y - 88, 1, {
          shapes: ['star4'],
          speedMin: 10,
          speedMax: 28,
          lifeMin: 0.30,
          lifeMax: 0.48,
          gravity: -28,
          upwardBias: -16,
          isJade: this.crucibleStacks >= this.maxCrucibleStacks
        });
      }
    }

    if (this.isDead) {
      this.worldAnvilAltar = null;
      this.activeAnvil = null;
      this._magmaCrater = null;
      this.fissureWaves.length = 0;
      this._homeRunFlights.length = 0;
      this._homeRunSwingStreak = null;
      this._soilRockChunks.length = 0;
      this._soilDustPlumes.length = 0;
      this.anvilShockBursts.length = 0;
      this.forgeParticles.length = 0;
      this.magmaFissureNodes.length = 0;
      this.mjolnirLightningBolts.length = 0;
      this.lavaGeyserQueue.length = 0;
    }

    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      this.afterimages[i].age += dt;
      if (this.afterimages[i].age >= this.afterimages[i].maxLife) {
        this.afterimages.splice(i, 1);
      }
    }

    for (let i = this.anvilShockBursts.length - 1; i >= 0; i--) {
      this.anvilShockBursts[i].age += dt;
      if (this.anvilShockBursts[i].age >= this.anvilShockBursts[i].maxLife) {
        this.anvilShockBursts.splice(i, 1);
      }
    }

    for (let i = this.magmaFissureNodes.length - 1; i >= 0; i--) {
      this.magmaFissureNodes[i].age += dt;
      if (this.magmaFissureNodes[i].age >= this.magmaFissureNodes[i].maxLife) {
        this.magmaFissureNodes.splice(i, 1);
      }
    }

    for (let i = this.mjolnirLightningBolts.length - 1; i >= 0; i--) {
      this.mjolnirLightningBolts[i].age += dt;
      if (this.mjolnirLightningBolts[i].age >= this.mjolnirLightningBolts[i].maxLife) {
        this.mjolnirLightningBolts.splice(i, 1);
      }
    }

    for (let i = this.forgeParticles.length - 1; i >= 0; i--) {
      const p = this.forgeParticles[i];
      p.age += dt;
      if (p.kind !== 'ring') {
        p.x += p.vx * dt;
        p.vy += p.gravity * dt;
        p.y += p.vy * dt;
        if (p.y >= this.groundY - 2) {
          p.y = this.groundY - 2;
          if (p.bounces < 1 && Math.abs(p.vy) > 65) {
            p.bounces++;
            p.vy = -Math.abs(p.vy) * 0.36;
            p.vx *= 0.65;
          } else {
            p.vy = 0;
            p.vx *= 0.4;
          }
        }
      }
      if (p.age >= p.maxLife) {
        this.forgeParticles.splice(i, 1);
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

    for (let i = this._soilRockChunks.length - 1; i >= 0; i--) {
      const c = this._soilRockChunks[i];
      c.age += dt;
      c.x += c.vx * dt;
      c.vy += c.grav * dt;
      c.y += c.vy * dt;
      if (c.y >= this.groundY - 2) {
        c.y = this.groundY - 2;
        if (c.bounces < 1 && Math.abs(c.vy) > 90) {
          c.bounces += 1;
          c.vy = -Math.abs(c.vy) * 0.30;
          c.vx *= 0.58;
        } else {
          c.vy = 0;
          c.vx *= Math.pow(0.02, dt);
        }
      }
      if (c.age >= c.maxLife) {
        this._soilRockChunks.splice(i, 1);
      }
    }
    for (let i = this._soilDustPlumes.length - 1; i >= 0; i--) {
      const p = this._soilDustPlumes[i];
      p.age += dt;
      p.x += p.vx * dt;
      p.vx *= Math.pow(0.18, dt);
      p.y += p.vy * dt;
      if (p.age >= p.maxLife) {
        this._soilDustPlumes.splice(i, 1);
      }
    }

    if (this.fissureWaves.length > 0 && game) {
      const ww = game.renderer ? game.renderer.worldWidth : 1200;
      const targets = this.getActiveEnemies(enemy, game);
      for (let i = this.fissureWaves.length - 1; i >= 0; i--) {
        const wv = this.fissureWaves[i];
        wv.age += dt;
        wv.x += wv.vx * dt;

        for (const t of targets) {
          if (!wv.hitTargets.has(t) && Math.abs(t.x - wv.x) < 62 && Math.abs(t.y - wv.y) < 96) {
            wv.hitTargets.add(t);
            const pullSign = this.x >= t.x ? 1 : -1;
            if (!t.isColossalBoss) {
              t.x = Math.max(65, Math.min(ww - 65, t.x + pullSign * 38));
            }
            t.takeDamage(24, this, false, pullSign * 85, -88);
            this.gainMana(1.0);
            game.vfx?.spawnDamageText?.(t.x, t.y - 146, 0, false, 'MAGNETIC FISSURE!', '#34d399');
            this.spawnForgeParticles(t.x, this.groundY - 36, 6, { isJade: true });
          }
        }

        if (
          this.worldAnvilAltar &&
          this.worldAnvilAltar.resonanceCd <= 0 &&
          Math.abs(wv.x - this.worldAnvilAltar.x) < 42
        ) {
          this.triggerAnvilResonance(enemy, game, 28);
        }

        if (
          wv.age >= wv.maxLife ||
          Math.abs(wv.x - wv.startX) >= wv.maxDist ||
          wv.x < 45 ||
          wv.x > ww - 45
        ) {
          this.fissureWaves.splice(i, 1);
        }
      }
    }

    if (this.worldAnvilAltar && game) {
      const altar = this.worldAnvilAltar;
      altar.age += dt;
      altar.life -= dt;
      if (altar.resonanceCd > 0) altar.resonanceCd = Math.max(0, altar.resonanceCd - dt);
      if (altar.dashBoostCd > 0) altar.dashBoostCd = Math.max(0, altar.dashBoostCd - dt);

      altar.pulseTimer -= dt;
      if (altar.pulseTimer <= 0 && altar.life > 0.25) {
        altar.pulseTimer = 1.35;
        const ww = game.renderer ? game.renderer.worldWidth : 1200;
        this.spawnForgeShockRing(altar.x, this.groundY - 2, 108, true, 0.32);
        const advBounds =
          game.adventure?.active && typeof game.adventure.getActiveStageBounds === 'function'
            ? game.adventure.getActiveStageBounds()
            : null;
        const pMin = advBounds ? advBounds.minX + 24 : 65;
        const pMax = advBounds ? advBounds.maxX - 24 : ww - 65;
        for (const t of this.getActiveEnemies(enemy, game)) {
          if (Math.abs(t.x - altar.x) <= 185) {
            const pullSign = altar.x >= t.x ? 1 : -1;
            if (!t.isColossalBoss) {
              t.x = Math.max(pMin, Math.min(pMax, t.x + pullSign * 28));
            }
            t.takeDamage(10, this, false, pullSign * 45, -40);
          }
        }
      }

      if (altar.life <= 0) {
        this.worldAnvilAltar = null;
      }
    }

    if (this.activeAnvil && game) {
      const a = this.activeAnvil;
      a.age += dt;
      if (a.state === 'flying') {
        a.x += a.vx * dt;
        a.trailAccum = (a.trailAccum || 0) + dt;
        if (a.trailAccum >= 0.048) {
          a.trailAccum = 0;
          this.spawnMagmaFissureNode(a.x, a.y, a.rebounded, 0.48);
          this.spawnForgeParticles(a.x - a.dir * 20, a.y - 36, 2, {
            dirBias: a.dir >= 0 ? Math.PI : 0,
            spread: 0.6,
            isJade: a.rebounded
          });
        }

        const ww = game.renderer ? game.renderer.worldWidth : 1200;
        const advBounds =
          game.adventure?.active && typeof game.adventure.getActiveStageBounds === 'function'
            ? game.adventure.getActiveStageBounds()
            : null;
        const wallMin = advBounds ? advBounds.minX + 18 : 64;
        const wallMax = advBounds ? advBounds.maxX - 18 : ww - 64;
        const targets = this.getActiveEnemies(enemy, game);
        for (const t of targets) {
          if (
            !a.hitTargets.has(t) &&
            Math.abs(t.x - a.x) < (t.isColossalBoss ? 125 : 66) &&
            (t.isColossalBoss || Math.abs(t.y - a.y) < 110)
          ) {
            a.hitTargets.add(t);
            const hitDmg =
              a.tier === 1
                ? a.rebounded
                  ? 50
                  : 84
                : a.tier === 2
                  ? a.rebounded
                    ? 36
                    : 55
                  : a.rebounded
                    ? 54
                    : 82;
            t.takeDamage(hitDmg, this, true, a.dir * 265, -155);
            this.gainCrucibleCore(1, game);
            if (game.audio) game.audio.play('thunder_slam', t.x);
            game.renderer?.triggerShake?.(11, 0.22);
            game.renderer?.triggerHitStop?.(0.052);

            this.spawnForgeShockRing(t.x, this.groundY - 2, 114, a.rebounded, 0.30);
            this.spawnSheetBurst(4, t.x, t.y - 68, {
              w: 196,
              h: 196,
              maxLife: 0.34,
              flipX: a.dir < 0,
              glowColor: a.rebounded ? 'emerald' : 'gold',
              inFront: true
            });

            if (t.isColossalBoss || t.x <= wallMin + 121 || t.x >= wallMax - 121) {
              t.takeDamage(34, this, true, -a.dir * 135, -205);
              game.vfx?.spawnDamageText?.(t.x, t.y - 165, 0, true, 'ANVIL WALL-CRUSH!', '#fef08a');
              this.spawnForgeParticles(t.x, t.y - 54, 10, { isJade: true });
            }
          }
        }

        if ((a.x <= wallMin || a.x >= wallMax) && a.bouncesLeft > 0) {
          a.bouncesLeft -= 1;
          a.rebounded = true;
          a.x = Math.max(wallMin + 2, Math.min(wallMax - 2, a.x));
          a.dir = -a.dir;
          a.vx = a.dir * 820;
          a.hitTargets.clear();

          game.audio?.play?.('clang', a.x);
          game.renderer?.triggerShake?.(9, 0.16);
          game.vfx?.spawnDamageText?.(a.x, this.groundY - 128, 0, true, 'ANVIL WALL-RICOCHET!', '#34d399');
          this.spawnForgeShockRing(a.x, this.groundY - 2, 128, true, 0.36);
          this.spawnForgeParticles(a.x, a.y - 44, 10, { isJade: true });
        } else if (a.x < wallMin - 28 || a.x > wallMax + 28 || a.age > 2.35) {
          this.spawnForgeParticles(a.x, a.y - 38, 6, { isJade: a.rebounded });
          this.activeAnvil = null;
        }
      }
    }

    this.ensureForgeMagmaMantle();
    this.fx?.update(dt);

    if (!this.isDead && this.state === 'WALK') {
      this.stepDustTimer += dt;
      if (this.stepDustTimer >= 0.36) {
        this.stepDustTimer = 0;
        if (game?.audio) game.audio.play('footstep_steel', this.x);
        this.spawnForgeParticles(this.x - this.facing * 14, this.groundY - 3, 2, {
          shapes: ['slag'],
          speedMin: 24,
          speedMax: 65,
          isJade: false
        });
      }
    }

    super.update(dt, enemy, game);
  }

  /**
   * Renders a `4x4` Bayer-stippled pixel floor/rim halo (`alpha <= 0.18`, zero blurry radial gradient sprites!).
   */
  drawBayerPixelHalo(ctx, cx, cy, rx, ry, outerHex, coreHex, alpha = 0.16) {
    if (!ctx?.fillRect || alpha <= 0.015 || rx < 4 || ry < 2) return;
    const step = 4;
    const icx = Math.round(cx / step) * step;
    const icy = Math.round(cy / step) * step;
    const irx = Math.max(step, Math.round(rx / step) * step);
    const iry = Math.max(step, Math.round(ry / step) * step);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = Math.min(0.18, alpha);
    for (let dy = -iry; dy <= iry; dy += step) {
      const ny = dy / iry;
      const maxDx = Math.round((irx * Math.sqrt(Math.max(0, 1 - ny * ny))) / step) * step;
      const by = ((dy / step) & 3 + 4) & 3;
      for (let dx = -maxDx; dx <= maxDx; dx += step) {
        const nx = dx / irx;
        const r2 = nx * nx + ny * ny;
        if (r2 > 1) continue;
        const intensity = 1 - r2;
        const bx = ((dx / step) & 3 + 4) & 3;
        if (intensity > BAYER_4X4[(by << 2) | bx] * 0.92) {
          ctx.fillStyle = r2 < 0.36 ? coreHex : outerHex;
          ctx.fillRect(icx + dx, icy + dy, step, step);
        }
      }
    }
    ctx.restore();
  }

  drawPixelForgeChain(ctx, x1, y1, x2, y2, phase = 0) {
    if (!ctx?.fillRect) return;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy);
    if (dist < 12) return;
    const steps = Math.max(4, Math.min(28, Math.floor(dist / 14)));

    ctx.save();
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const sag = Math.sin(u * Math.PI) * 12;
      const px = Math.round(x1 + dx * u);
      const py = Math.round(y1 + dy * u + sag);
      const isJade = (i + Math.floor(phase * 10)) % 3 === 0;
      ctx.fillStyle = '#0d0907';
      ctx.fillRect(px - 4, py - 4, 8, 8);
      ctx.fillStyle = isJade ? '#10b981' : '#f59e0b';
      ctx.fillRect(px - 3, py - 3, 6, 6);
      ctx.fillStyle = isJade ? '#a7f3d0' : '#fef08a';
      ctx.fillRect(px - 1, py - 1, 2, 2);
    }
    ctx.restore();
  }

  drawCrucibleCores(ctx, inFront = false) {
    if (!ctx?.fillRect || this.isDead || this.crucibleStacks <= 0) return;
    const scale = this.giantScale || 1.0;
    const count = this.crucibleStacks;
    const isMax = count >= this.maxCrucibleStacks;
    const cx = this.x;
    const cy = this.y - Math.round(92 * scale);
    const rx = Math.round(54 * scale);
    const ry = Math.round(16 * scale);

    ctx.save();
    for (let i = 0; i < count; i++) {
      const ang = this._crucibleOrbitPhase + (i * Math.PI * 2) / this.maxCrucibleStacks;
      const depth = Math.sin(ang);
      if (inFront ? depth < 0 : depth >= 0) continue;

      const ox = Math.round(cx + Math.cos(ang) * rx);
      const oy = Math.round(cy + depth * ry + Math.sin(this._crucibleOrbitPhase * 1.8 + i) * 3);
      const s = scale >= 1.8 ? 2 : 1;

      ctx.fillStyle = '#0d0907';
      ctx.fillRect(ox - 5 * s, oy - 3 * s, 10 * s, 6 * s);
      ctx.fillRect(ox - 3 * s, oy - 5 * s, 6 * s, 10 * s);

      ctx.fillStyle = isMax ? '#047857' : '#b45309';
      ctx.fillRect(ox - 4 * s, oy - 2 * s, 8 * s, 4 * s);
      ctx.fillRect(ox - 2 * s, oy - 4 * s, 4 * s, 8 * s);

      ctx.fillStyle = isMax ? '#34d399' : '#fbbf24';
      ctx.fillRect(ox - 2 * s, oy - 2 * s, 4 * s, 4 * s);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(ox - 1 * s, oy - 1 * s, 2 * s, 2 * s);
    }
    ctx.restore();
  }

  drawAnvilShockBursts(ctx) {
    if (this.anvilShockBursts.length === 0) return;
    const sprites = this.getExSprites();
    const vfxSheet = PixelForge.ensureImage?.(sprites?.vfx) || sprites?.vfx;
    const hasVfx = Boolean(vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth > 0);
    if (!hasVfx) return;

    for (let i = 0; i < this.anvilShockBursts.length; i++) {
      const b = this.anvilShockBursts[i];
      const u = Math.min(1, b.age / Math.max(0.04, b.maxLife));
      const fade = u < 0.14 ? 1.0 : Math.max(0, 1 - (u - 0.14) / 0.86);
      if (fade <= 0.02) continue;

      const col = Math.min(29, Math.floor(u * 30));
      const drawW = Math.max(132, Math.round(b.halfW * 2.6 * (0.85 + 0.30 * u)));
      const drawH = Math.max(96, Math.round(b.halfH * 4.8 * (0.90 + 0.22 * u)));
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        4,
        col,
        b.cx,
        b.cy,
        drawW,
        drawH,
        fade * 0.94,
        i % 2 === 1,
        null,
        b.isJade ? 'emerald' : 'gold'
      );
    }
  }

  /**
   * Renders Molten Magma Fissure Wakes, 2.5D Caldera Seal (`0` boxy fillRect slabs!), Stepped Mjolnir Lightning, & Forge Particles!
   */
  drawForgeFloorAndParticles(ctx, inFront = false) {
    if (!ctx?.fillRect) return;
    const sprites = this.getExSprites();
    const vfxSheet = PixelForge.ensureImage?.(sprites?.vfx) || sprites?.vfx;
    const hasVfx = Boolean(vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth > 0);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    if (!inFront) {
      // 1. Persistent Multi-Layered 2.5D Molten Caldera (`MJOLNIR GENESIS: CONTINENTAL SUNDER` — sculpted Row 5 + Row 7 cells!)
      if (this._magmaCrater) {
        const mc = this._magmaCrater;
        const u = mc.age / Math.max(0.05, mc.maxLife);
        const fade = u > 0.72 ? (1 - u) / 0.28 : 1.0;
        this.drawBayerPixelHalo(ctx, mc.x, mc.y - 2, mc.rx + 28, mc.ry + 10, '#9a3412', '#fde047', 0.18 * fade);
        if (hasVfx) {
          const col = Math.floor((mc.age * 24) % 30);
          this.drawBloomedVfxCell(ctx, vfxSheet, 5, col, mc.x, mc.y - 16, Math.round(mc.rx * 1.65), 148, 0.86 * fade, false, null, 'gold');
          this.drawBloomedVfxCell(ctx, vfxSheet, 7, (col + 8) % 30, mc.x, mc.y - 42, Math.round(mc.rx * 1.48), 184, 0.74 * fade, true, null, 'emerald');
        }
      }

      // 2. Sculpted Molten Magma Fissure Nodes (`Row 0` Tectonic Magma Wave cells — 0 rectangular fillRect slabs!)
      for (let i = 0; i < this.magmaFissureNodes.length; i++) {
        const fn = this.magmaFissureNodes[i];
        const u = Math.min(1, fn.age / Math.max(0.04, fn.maxLife));
        const fade = u > 0.68 ? (1 - u) / 0.32 : 1.0;
        this.drawBayerPixelHalo(ctx, fn.x, fn.y - 2, fn.w + 18, 9, fn.isJade ? '#065f46' : '#9a3412', '#fde047', 0.15 * fade);
        if (hasVfx) {
          const col = Math.min(29, Math.floor(u * 30));
          this.drawBloomedVfxCell(
            ctx,
            vfxSheet,
            0,
            col,
            fn.x,
            fn.y - 24,
            Math.max(96, fn.w * 4),
            88,
            fade * 0.84,
            fn.isJade,
            null,
            fn.isJade ? 'emerald' : 'gold'
          );
        }
      }
      ctx.restore();
      return;
    }

    // Foreground: Stepped Pixel Mjolnir Lightning Bolts (3-pass full-bolt rendering -> 0 chevrons!)
    for (let i = 0; i < this.mjolnirLightningBolts.length; i++) {
      const bolt = this.mjolnirLightningBolts[i];
      const u = bolt.age / bolt.maxLife;
      const fade = u > 0.65 ? (1 - u) / 0.35 : 1.0;

      for (const pass of [0, 1, 2]) {
        ctx.globalAlpha = pass === 0 ? fade * 0.80 : fade * 0.98;
        ctx.fillStyle = pass === 0 ? '#0d0907' : pass === 1 ? (bolt.isJade ? '#10b981' : '#f59e0b') : '#ffffff';
        const thick = pass === 0 ? 8 : pass === 1 ? 4 : 2;
        for (let s = 0; s < bolt.pts.length - 1; s++) {
          const [x0, y0] = bolt.pts[s];
          const [x1, y1] = bolt.pts[s + 1];
          const steps = Math.max(2, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) / 3));
          for (let k = 0; k <= steps; k++) {
            const su = k / steps;
            const px = Math.round((x0 + (x1 - x0) * su) / 2) * 2;
            const py = Math.round((y0 + (y1 - y0) * su) / 2) * 2;
            ctx.fillRect(px - Math.floor(thick * 0.5), py - Math.floor(thick * 0.5), thick, thick);
          }
        }
      }
    }

    // Foreground: Multi-Shape Pixel Forge Particles (`slag`, `diamond`, `star4`, `ring`)
    for (let i = 0; i < this.forgeParticles.length; i++) {
      const p = this.forgeParticles[i];
      const u = Math.min(1, p.age / p.maxLife);
      const fade = u > 0.72 ? (1 - u) / 0.28 : 1.0;
      if (fade <= 0.03) continue;

      const px = Math.round(p.x / 2) * 2;
      const py = Math.round(p.y / 2) * 2;
      const accent = p.isJade ? '#10b981' : '#f59e0b';

      if (p.kind === 'ring') {
        const rx = Math.round((p.size * (0.32 + 0.68 * (1 - Math.pow(1 - u, 2.2)))) / 2) * 2;
        const ry = Math.max(4, Math.round((rx * 0.22) / 2) * 2);
        ctx.globalAlpha = fade * 0.86;
        for (let aIdx = 0; aIdx < 24; aIdx++) {
          if (u > 0.55 && (aIdx & 1) === 1) continue;
          const a = (aIdx / 24) * Math.PI * 2;
          const rxp = Math.round((px + Math.cos(a) * rx) / 2) * 2;
          const ryp = Math.round((py + Math.sin(a) * ry) / 2) * 2;
          ctx.fillStyle = '#0d0907';
          ctx.fillRect(rxp - 2, ryp, 6, 4);
          ctx.fillStyle = aIdx % 3 === 0 ? '#fde047' : accent;
          ctx.fillRect(rxp, ryp, 4, 2);
        }
      } else if (p.kind === 'star4') {
        const arm = p.size * 2;
        ctx.globalAlpha = fade * 0.96;
        ctx.fillStyle = '#0d0907';
        ctx.fillRect(px - arm - 2, py - 2, (arm + 2) * 2 + 2, 6);
        ctx.fillRect(px - 2, py - arm - 2, 6, (arm + 2) * 2 + 2);
        ctx.fillStyle = accent;
        ctx.fillRect(px - arm, py, arm * 2 + 2, 2);
        ctx.fillRect(px, py - arm, 2, arm * 2 + 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px, py, 2, 2);
      } else {
        // Bouncing Molten Slag / Jade Diamond Shard
        ctx.globalAlpha = fade * 0.96;
        ctx.fillStyle = '#0d0907';
        ctx.fillRect(px - 4, py - 4, 8, 8);
        ctx.fillStyle = accent;
        ctx.fillRect(px - 2, py - 2, 6, 6);
        ctx.fillStyle = '#fde047';
        ctx.fillRect(px - 2, py - 2, 2, 2);
      }
    }
    ctx.restore();
  }

  drawBehind(ctx, renderer = null) {
    const sprites = this.getExSprites();
    const vfxSheet = PixelForge.ensureImage?.(sprites?.vfx) || sprites?.vfx;
    const hasVfx = Boolean(vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth > 0);

    // Ignited 8-Cog Crucible Back-Halo behind Torgar's shoulders (`RAGNAROK GRAND-SLAM CRUSHER` & Max Temper!)
    if (!this.isDead && (this._crucibleBackHaloTimer > 0 || this.crucibleStacks >= this.maxCrucibleStacks) && hasVfx) {
      const sc = this.giantScale || 1.0;
      const haloSize = Math.round(168 * sc);
      const haloCol = Math.floor((this._crucibleOrbitPhase * 6) % 30);
      const fade = this.crucibleStacks >= this.maxCrucibleStacks ? 0.90 : Math.min(0.92, this._crucibleBackHaloTimer * 1.4);
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        3,
        haloCol,
        this.x - this.facing * Math.round(8 * sc),
        this.y - Math.round(104 * sc),
        haloSize,
        haloSize,
        fade,
        this.facing < 0
      );
    }

    if (this.state !== 'TRUE_ULTIMATE') return;
    const t = this.stateTimer || 0;
    const dur = this.trueUltDuration || 3.80;
    const ww = renderer?.worldWidth || 1200;

    if (ctx?.fillRect) {
      const envAlpha =
        t < 0.30 ? t / 0.30 : t > dur - 0.55 ? Math.max(0, (dur - t) / 0.55) : 1.0;
      ctx.save();
      ctx.fillStyle = `rgba(18, 8, 4, ${(0.38 * envAlpha).toFixed(3)})`;
      ctx.fillRect(0, -480, ww, this.groundY + 620);
      ctx.restore();
    }

    if (t >= 2.36) return;

    const col = Math.floor(t * 30) % 30;
    const ax = this._trueUltAnvilX || 600;
    const ay = this.groundY - 56;

    if (hasVfx) {
      this.drawBloomedVfxCell(ctx, vfxSheet, 5, col, ax, ay, 312, 312, 0.94, this.facing < 0);
    }

    const foes = this.game ? this.getActiveEnemies(null, this.game) : [];
    for (const foe of foes) {
      if (t >= 1.50) {
        this.drawPixelForgeChain(ctx, this.x, this.y - 140, foe.x, foe.y - 64, t);
      } else {
        this.drawPixelForgeChain(ctx, ax, this.groundY - 36, foe.x, foe.y - 68, t);
      }
    }
  }

  /**
   * Crisp pixel-pure VFX sheet blit with Bayer pixel floor/rim halo (`<= 0.14` highlight).
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
    glowColor = 'gold'
  ) {
    const sheet = PixelForge.ensureImage?.(vfxSheet) || vfxSheet;
    if (!sheet || !sheet.complete || !sheet.naturalWidth || alpha <= 0.01) return;
    const cell = 208;
    const clampedRow = Math.max(0, Math.min(7, Math.floor(row)));
    const clampedCol = Math.max(0, Math.min(29, Math.floor(col)));
    if (this.game?.vfx?.drawBloomedSprite && glowColor !== 'none') {
      this.game.vfx.drawBloomedSprite(
        ctx,
        sheet,
        clampedCol * cell,
        clampedRow * cell,
        cell,
        cell,
        Math.round(x),
        Math.round(y),
        w,
        h,
        { alpha, bloomAlpha: Math.min(0.28, alpha * 0.24), bloomScale: 1.04, flipX }
      );
      return;
    }
    const sx = clampedCol * cell;
    const sy = clampedRow * cell;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(x), Math.round(y));
    if (flipX) ctx.scale(-1, 1);

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.drawImage(sheet, sx, sy, cell, cell, -w * 0.5, -h * 0.5, w, h);

    if (glowColor !== 'none') {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(0.24, alpha * 0.22);
      ctx.drawImage(sheet, sx, sy, cell, cell, -w * 0.5, -h * 0.5, w, h);
    }

    ctx.restore();
  }

  drawActiveAnvilAndQuakes(ctx, vfxSheet = null, renderer = null, inFront = false) {
    const sheet =
      PixelForge.ensureImage?.(vfxSheet) ||
      vfxSheet ||
      (typeof Image !== 'undefined' ? PixelForge.initAssets()?.titan_ex?.vfx : null);
    if (!sheet || !sheet.complete || !sheet.naturalWidth) return;

    if (!inFront) {
      for (const v of this.activeVfxAnims) {
        if (v.inFront) continue;
        const u = Math.min(1, Math.max(0, v.age / v.maxLife));
        const span = Math.max(1, v.endFrame - v.startFrame + 1);
        const col = Math.min(29, v.startFrame + Math.floor(u * span));
        const fade = u < 0.12 ? u / 0.12 : u > 0.78 ? (1 - u) / 0.22 : 1.0;
        this.drawBloomedVfxCell(ctx, sheet, v.row, col, v.x, v.y, v.w, v.h, fade * 0.96, v.flipX, renderer, v.glowColor);
      }

      if (this.worldAnvilAltar && this.worldAnvilAltar.life > 0) {
        const altar = this.worldAnvilAltar;
        const col = Math.floor(altar.age * 30) % 30;
        const fade = altar.life < 0.45 ? Math.max(0, altar.life / 0.45) : 1.0;
        this.drawBayerPixelHalo(ctx, altar.x, altar.y - 2, 76, 16, '#065f46', '#f59e0b', 0.16 * fade);
        this.drawBloomedVfxCell(ctx, sheet, 5, col, altar.x, altar.y - 24, 212, 212, fade * 0.88, altar.dir < 0, renderer, 'emerald');
        this.drawBloomedVfxCell(ctx, sheet, 1, col, altar.x, altar.y - 52, 196, 196, fade * 0.98, altar.dir < 0, renderer, 'gold');
      }
      return;
    }

    for (const wv of this.fissureWaves) {
      const col = Math.floor(wv.age * 36) % 30;
      const u = Math.min(1, wv.age / wv.maxLife);
      const fade = u > 0.76 ? Math.max(0, (1 - u) / 0.24) : 1.0;
      this.drawBloomedVfxCell(ctx, sheet, 0, col, wv.x, wv.y - 54, 212, 212, fade * 0.96, wv.dir < 0, renderer, 'emerald');
    }

    if (this.activeAnvil && this.activeAnvil.state === 'flying') {
      const a = this.activeAnvil;
      const col = Math.floor(a.age * 30) % 30;
      this.drawBayerPixelHalo(ctx, a.x, a.y - 2, 68, 14, a.rebounded ? '#10b981' : '#f59e0b', '#fde047', 0.16);
      this.drawBloomedVfxCell(ctx, sheet, 0, col, a.x - a.dir * 28, a.y - 48, 184, 184, 0.88, a.dir < 0, renderer, a.rebounded ? 'emerald' : 'gold');
      this.drawBloomedVfxCell(ctx, sheet, 1, col, a.x, a.y - 52, 208, 208, 0.98, a.dir < 0, renderer, a.rebounded ? 'emerald' : 'gold');
    }

    for (const v of this.activeVfxAnims) {
      if (!v.inFront) continue;
      const u = Math.min(1, Math.max(0, v.age / v.maxLife));
      const span = Math.max(1, v.endFrame - v.startFrame + 1);
      const col = Math.min(29, v.startFrame + Math.floor(u * span));
      const fade = u < 0.12 ? u / 0.12 : u > 0.78 ? (1 - u) / 0.22 : 1.0;
      this.drawBloomedVfxCell(ctx, sheet, v.row, col, v.x, v.y, v.w, v.h, fade * 0.96, v.flipX, renderer, v.glowColor);
    }
  }

  triggerSoilRockSplash(originX, groundY, ww = 1200, preset = 'cataclysm') {
    const isBig = preset === 'cataclysm';
    const chunkCount = isBig ? 32 : 12;
    const plumeCount = isBig ? 16 : 6;
    const cx = Math.max(80, Math.min(ww - 80, originX));

    for (let i = 0; i < chunkCount; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const lane = Math.floor(i / 2) / Math.max(1, Math.floor(chunkCount / 2) - 1);
      const speedX = isBig ? 95 + lane * 495 : 65 + lane * 215;
      const speedY = isBig
        ? -(690 - lane * 360 + ((i * 37) % 90))
        : -(340 - lane * 130 + ((i * 29) % 55));
      const size = isBig ? 8 + ((i * 5) % 11) : 5 + ((i * 3) % 6);
      this._soilRockChunks.push({
        x: cx + side * (12 + lane * 34),
        y: groundY - 6 - ((i * 7) % 14),
        vx: side * speedX,
        vy: speedY,
        grav: isBig ? 1520 : 1280,
        size,
        isRock: i % 3 !== 1,
        inFront: i % 2 === 0,
        bounces: 0,
        age: 0,
        maxLife: isBig ? 0.96 + (i % 4) * 0.11 : 0.52 + (i % 3) * 0.08
      });
    }

    for (let i = 0; i < plumeCount; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const lane = Math.floor(i / 2) / Math.max(1, Math.floor(plumeCount / 2) - 1);
      this._soilDustPlumes.push({
        x: cx + side * (18 + lane * 48),
        y: groundY - 8 - (i % 3) * 8,
        vx: side * (isBig ? 110 + lane * 340 : 75 + lane * 165),
        vy: -(isBig ? 18 + (i % 4) * 12 : 12 + (i % 3) * 8),
        r: isBig ? 18 + ((i * 7) % 16) : 11 + ((i * 5) % 9),
        inFront: i % 3 !== 0,
        age: 0,
        maxLife: isBig ? 0.88 + (i % 4) * 0.10 : 0.46 + (i % 3) * 0.06
      });
    }
  }

  drawSoilRockSplash(ctx, inFront = false) {
    if (!ctx?.fillRect) return;
    const hasPlumes = this._soilDustPlumes?.length > 0;
    const hasChunks = this._soilRockChunks?.length > 0;
    if (!hasPlumes && !hasChunks) return;

    ctx.save();
    for (let i = 0; i < this._soilDustPlumes.length; i++) {
      const p = this._soilDustPlumes[i];
      if (Boolean(p.inFront) !== inFront) continue;
      const u = Math.min(1, p.age / p.maxLife);
      const alpha = u < 0.12 ? u / 0.12 : Math.max(0, 1 - (u - 0.12) / 0.88);
      if (alpha <= 0.03) continue;

      const rad = Math.max(6, Math.round((p.r * (0.65 + 0.65 * u)) / 2) * 2);
      const px = Math.round(p.x / 2) * 2;
      const py = Math.round(p.y / 2) * 2;
      const h = Math.max(6, Math.round(rad * 0.62));

      ctx.globalAlpha = alpha * 0.76;
      ctx.fillStyle = '#362214';
      ctx.fillRect(px - rad, py - Math.round(h * 0.45), rad * 2, h);
      ctx.fillStyle = '#5c3d26';
      ctx.fillRect(px - rad + 2, py - Math.round(h * 0.65), rad * 2 - 4, h - 2);
      ctx.fillStyle = '#8c6240';
      ctx.fillRect(px - Math.round(rad * 0.76), py - Math.round(h * 0.80), Math.round(rad * 1.52), Math.round(h * 0.68));
      ctx.fillStyle = '#c2a37e';
      ctx.fillRect(px - Math.round(rad * 0.52), py - Math.round(h * 0.90), Math.round(rad * 1.04), Math.round(h * 0.42));
    }

    for (let i = 0; i < this._soilRockChunks.length; i++) {
      const c = this._soilRockChunks[i];
      if (Boolean(c.inFront) !== inFront) continue;
      const u = Math.min(1, c.age / c.maxLife);
      const alpha = u > 0.76 ? Math.max(0, (1 - u) / 0.24) : 1.0;
      if (alpha <= 0.03) continue;

      const s = Math.max(4, Math.round(c.size / 2) * 2);
      const hs = Math.round(s * 0.5);
      const cx = Math.round(c.x / 2) * 2;
      const cy = Math.round(c.y / 2) * 2;

      ctx.globalAlpha = alpha * 0.98;
      ctx.fillStyle = '#120d0a';
      ctx.fillRect(cx - hs - 2, cy - hs, s + 4, s);
      ctx.fillRect(cx - hs, cy - hs - 2, s, s + 4);

      ctx.fillStyle = c.isRock ? '#292524' : '#f97316';
      ctx.fillRect(cx - hs, cy - hs, s, s);

      ctx.fillStyle = c.isRock ? '#57534e' : '#fde047';
      ctx.fillRect(cx - hs, cy - hs, Math.max(2, s - 2), Math.max(2, s - 2));
    }
    ctx.restore();
  }

  drawForegroundOverlay(ctx, renderer = null) {
    const sprites = this.getExSprites();
    const sheet = PixelForge.ensureImage?.(sprites?.sheet) || sprites?.sheet;
    const vfxSheet = PixelForge.ensureImage?.(sprites?.vfx) || sprites?.vfx;

    if (!this.isDead) {
      this.drawBayerPixelHalo(
        ctx,
        this.x,
        this.groundY - 1,
        Math.round(58 * (this.giantScale || 1)),
        13,
        this.crucibleStacks >= this.maxCrucibleStacks ? '#065f46' : '#9a3412',
        '#fde047',
        this.state === 'ULTIMATE' || this.state === 'TRUE_ULTIMATE' ? 0.17 : 0.11
      );
      this.drawForgeFloorAndParticles(ctx, false);
    }

    this.drawBehind(ctx, renderer);

    if (this.afterimages.length > 0 && sheet && sheet.complete && sheet.naturalWidth) {
      for (let i = 0; i < this.afterimages.length; i++) {
        const img = this.afterimages[i];
        const alpha = Math.max(0, (1 - img.age / img.maxLife) * 0.42);
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
          img.isJade ? '#10b981' : '#f59e0b'
        );
        ctx.restore();
      }
    }

    if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      this.drawActiveAnvilAndQuakes(ctx, vfxSheet, renderer, false);
    }

    this.drawSoilRockSplash(ctx, false);

    const arenaCenterX = this._resolveShaderCenterX(renderer);
    this.fx?.renderLayer(ctx, 'back', arenaCenterX, this.groundY, 0.96);

    this.drawCrucibleCores(ctx, false);
  }

  /**
   * Renders the Horizontal World-Breaker Home-Run Concussion Shock-Cone via sculpted blunt shock-rings (`0` sword crescents, `0` boxy slabs!).
   */
  drawHomeRunShockCone(ctx) {
    if (!this._homeRunSwingStreak) return;
    const st = this._homeRunSwingStreak;
    const u = Math.min(1, st.age / Math.max(0.04, st.maxLife));
    const alpha = u < 0.15 ? u / 0.15 : Math.max(0, 1 - (u - 0.15) / 0.85);
    if (alpha <= 0.02) return;

    const sprites = this.getExSprites();
    const vfxSheet = PixelForge.ensureImage?.(sprites?.vfx) || sprites?.vfx;
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;

    const flight = this._homeRunFlights?.[0];
    const endX = flight?.foe
      ? Math.round(flight.foe.x)
      : Math.round(st.startX + (st.targetWallX - st.startX) * Math.min(1, u * 1.4));
    const startX = Math.round(st.startX);
    const spanW = Math.max(12, Math.abs(endX - startX));
    const cy = Math.round(st.startY);
    const baseCol = Math.min(29, Math.floor(u * 30));

    const ringCount = Math.min(5, Math.max(2, Math.floor(spanW / 120)));
    for (let i = 1; i <= ringCount; i++) {
      const frac = i / (ringCount + 1);
      const rx = Math.round(startX + (endX - startX) * frac);
      const sz = Math.round(118 + frac * 76);
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        i % 2 === 0 ? 4 : 0,
        (baseCol + i * 4) % 30,
        rx,
        cy,
        sz,
        sz,
        alpha * 0.86,
        st.dir < 0,
        null,
        i % 2 === 0 ? 'emerald' : 'gold'
      );
    }
  }

  drawUltimateForeground(ctx, renderer = null) {
    const arenaCenterX = this._resolveShaderCenterX(renderer);
    this.fx?.renderLayer(ctx, 'front', arenaCenterX, this.groundY, 0.98);

    this.drawAnvilShockBursts(ctx);
    this.drawHomeRunShockCone(ctx);
    this.drawForgeFloorAndParticles(ctx, true);
    this.drawCrucibleCores(ctx, true);

    const sprites = this.getExSprites();
    const vfxSheet = PixelForge.ensureImage?.(sprites?.vfx) || sprites?.vfx;
    if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      this.drawActiveAnvilAndQuakes(ctx, vfxSheet, renderer, true);
    }

    this.drawSoilRockSplash(ctx, true);
  }

  draw(ctx, isReflection = false, renderer = null) {
    const sprites = this.getExSprites();
    if (!sprites) return;

    const scale = this.giantScale || 1.0;
    const w = 208;
    const h = 208;
    const frameIdx = PixelForge.getFrameIndex(this, this.walkPhase);
    const groundPlantOffset = 4;
    const sheet = PixelForge.ensureImage?.(sprites.sheet) || sprites.sheet;

    if (isReflection && !this.isDead) {
      const vfxSheet = PixelForge.ensureImage?.(sprites?.vfx) || sprites?.vfx;
      const hasVfx = Boolean(vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth > 0);
      if (hasVfx) {
        if (this._crucibleBackHaloTimer > 0 || this.crucibleStacks >= this.maxCrucibleStacks) {
          const haloCol = Math.floor((this._crucibleOrbitPhase * 6) % 30);
          this.drawBloomedVfxCell(
            ctx,
            vfxSheet,
            3,
            haloCol,
            this.x - this.facing * Math.round(8 * scale),
            this.y - Math.round(104 * scale),
            Math.round(164 * scale),
            Math.round(164 * scale),
            0.38,
            this.facing < 0,
            renderer,
            'gold'
          );
        }
        if (this.worldAnvilAltar && this.worldAnvilAltar.life > 0) {
          const altar = this.worldAnvilAltar;
          const col = Math.floor(altar.age * 30) % 30;
          const fade = altar.life < 0.45 ? Math.max(0, altar.life / 0.45) : 1.0;
          this.drawBloomedVfxCell(ctx, vfxSheet, 1, col, altar.x, altar.y - 52, 188, 188, 0.40 * fade, altar.dir < 0, renderer, 'gold');
        }
        if (this.activeAnvil && this.activeAnvil.state === 'flying') {
          const a = this.activeAnvil;
          const col = Math.floor(a.age * 30) % 30;
          this.drawBloomedVfxCell(ctx, vfxSheet, 1, col, a.x, a.y - 52, 196, 196, 0.40, a.dir < 0, renderer, a.rebounded ? 'emerald' : 'gold');
        }
        if (this.state === 'TRUE_ULTIMATE' && (this.stateTimer || 0) < 2.36) {
          const col = Math.floor((this.stateTimer || 0) * 30) % 30;
          this.drawBloomedVfxCell(ctx, vfxSheet, 5, col, this._trueUltAnvilX || this.x, this.groundY - 56, 268, 268, 0.38, this.facing < 0, renderer, 'gold');
        }
      }
    }

    if (
      !isReflection &&
      sheet &&
      sheet.complete &&
      sheet.naturalWidth &&
      Array.isArray(this._superJumpTrail) &&
      this._superJumpTrail.length > 0
    ) {
      for (let gi = 0; gi < this._superJumpTrail.length; gi++) {
        const g = this._superJumpTrail[gi];
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = gi === 0 ? 0.16 : 0.28;
        ctx.translate(Math.round(g.x), Math.round(g.y + groundPlantOffset));
        ctx.scale(this.facing * scale, scale);
        PixelForge.drawAfterimageFrame(ctx, sprites, g.frameIdx, w, h);
        ctx.restore();
      }
    }

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    ctx.translate(
      Math.round(this.x),
      Math.round(this.y + groundPlantOffset)
    );
    ctx.scale(this.facing * scale, scale);

    PixelForge.drawSheetFrame(ctx, sprites, this, w, h, this.walkPhase, isReflection, renderer);

    if (this.hitFlash > 0 && !isReflection) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5;
      PixelForge.drawGhostFrame(ctx, sprites, frameIdx, w, h);
    }

    ctx.restore();
  }
}
