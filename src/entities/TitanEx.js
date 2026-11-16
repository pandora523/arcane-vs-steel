import { Fighter } from './Fighter.js?v=30fps114';
import { PixelForge } from '../engine/PixelForge.js?v=30fps114';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps114';
import {
  FORGE_EFFECT_REGISTRY,
  FORGE_GOLD_PALETTE,
  FORGE_JADE_PALETTE
} from '../engine/shaders/forgeShaders.js?v=30fps114';

const AUTO_SLICES_EX = [
  [60, 8], // Beat 1 (V0, 0.42s): Overhead Earth-Crush Smash Smear -> snaps at F03 (63)
  [68, 7], // Beat 2 (V1, 0.40s): Rising Volcanic Uppercut Maul Smear -> snaps at F09 (69)
  [75, 8], // Beat 3 (V2, 0.44s): 2.5D Baseball-Swing Horizontal Concussion Ring (2-Hit) -> snaps at F17/F18 (77/78)
  [83, 7]  // Beat 4 (V3, 0.58s): High Jump -> Meteoric World-Anvil Ground-Fissure Slam (3-Hit + forge_wave) -> snaps at F25 (85)
];

const BEAT_DURATIONS = [0.42, 0.40, 0.44, 0.58];
const INTRA_COMBO_LINK = 0.015;

/**
 * Torgar EX (`titan_ex`) — World-Breaker Forge King.
 * Next-Gen Wide-Canvas (`320x240`, `9600x2400` 10x30 sheet, `anchorX=112, anchorY=230`)
 * FFBE / Last Cloudia Hack-and-Slash Remake. Coexists 100% independently alongside classic Torgar (`titan`).
 *
 * Weapon & Smear Invariant:
 * - Wields a colossal Symmetric Double-Faced Molten World-Maul (Mjolnir) + World-Forge Crucible Back-Halo!
 * - ZERO sword-tip slash crescents anywhere: Row 2 snap frames (`F03`, `F09`, `F17`, `F25`) and hit bursts use
 *   blunt, broad-headed Molten Magma & Emerald-Jade Heavy Kinetic Shock-Smear Fans (`#ffffff -> #fde047 -> #f59e0b -> #10b981 / #78350f`)
 *   + blunt anvil shock-bars + flying molten forge sparks!
 *
 * Signature Kit:
 * - Heavy Earth-Shaking 4-Beat Auto (`[[60,8],[68,7],[75,8],[83,7]]`, `vx = 0` snap plants + `52-68ms` bone-crunching `_hitStopTimer`):
 *   V0 Overhead Earth-Crush Smash + Magnetic Fissure Wave; V1 Rising Volcanic Uppercut Maul + Magma-Jade Rune Pillar;
 *   V2 2.5D Baseball-Swing Horizontal Concussion Ring (2-Hit + Khazad Forge-Ancestor + Anvil Resonance);
 *   V3 High Jump -> Meteoric World-Anvil Ground-Fissure Slam (3-Hit + `'forge_wave'` projectile + World-Breaker Temper).
 * - Orbiting `0..5` Molten Crucible Cores + `Magma Bulwark` (`CROUCH`) + `Juggernaut Bull-Rush` (`DASH`) + `Tectonic Crush Leap` (`JUMP`).
 * - `WORLD-ANVIL CATACLYSM` (`SKILL` wall-ricochet cannonball), `WORLD-BREAKER HOME RUN` (`ULTIMATE` horizontal baseball-bat home-run),
 *   and Colossal `2.15x` 4-Beat `GOD-HAMMER MJOLNIR: CONTINENTAL SUNDER` (`TRUE_ULTIMATE`).
 */
export class TitanEx extends Fighter {
  constructor(x, groundY, facing = 1) {
    const opts = typeof x === 'object' && x !== null ? x : { x, groundY, facing };
    super({
      ...opts,
      name: opts.name || 'Torgar EX',
      maxHp: 4200,
      moveSpeed: 190,
      attackRange: 208,
      autoInterval: 0.99,
      lightColor: 'rgba(245, 158, 11, 1)',
      primaryColor: '#f59e0b',
      hasTrueUltimate: true,
      trueUltName: 'GOD-HAMMER MJOLNIR: CONTINENTAL SUNDER',
      trueUltDuration: 3.80
    });

    this.heroId = 'titan_ex';
    this.theme = 'forge';
    this.secondaryColor = '#10b981';
    this.deathSfx = 'death_titan';
    this.hasPoise = true;
    this.unstoppablePoise = false;

    this.skillName = 'WORLD-ANVIL CATACLYSM';
    this.ultName = 'WORLD-BREAKER HOME RUN';
    this.ultSub = 'HORIZONTAL BASEBALL GRAND SLAM';
    this.hasTrueUltimate = true;
    this.trueUltName = 'GOD-HAMMER MJOLNIR: CONTINENTAL SUNDER';
    this.trueUltSub = 'SUPREME FINISHER - 2.15X COLOSSUS';
    this.trueUltDuration = 3.80;

    this.skillTriggerRange = 465;
    this.skillMaxCooldown = 5.25;
    this.dashMaxCooldown = 2.95;
    this.autoDuration = BEAT_DURATIONS[0];
    this._postFlurryInterval = 1.50;
    this.skillDuration = 0.94;
    this.ultDuration = 1.46;
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

    // Blunt Molten Anvil Concussion Shock-Bursts (0 sword slash crescents!)
    this.anvilShockBursts = [];
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

    // World-Anvil Altar + Ricocheting Anvil Cannonball + Magnetic Fissure Waves
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
    this._ultWaveStep = 0;

    this.fx = new ArcaneShaderFX(FORGE_EFFECT_REGISTRY, {
      pixelScale: 3,
      viewW: 480,
      viewH: 260
    });
    this._mantleSlot = null;

    if (typeof Image !== 'undefined') {
      PixelForge.ensureHeroLoaded?.('titan_ex');
      PixelForge.ensureHeroLoaded?.('titan');
    }
  }

  getExSprites() {
    return typeof Image !== 'undefined' ? PixelForge.initAssets()?.titan_ex : null;
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

  getActiveEnemies(enemy, game) {
    const isAdv = Boolean(game?.isAdventureMode?.() && game?.adventure?.active);
    const raw = game?.getEnemiesOf ? game.getEnemiesOf(this) : enemy ? [enemy] : [];
    const seen = new Set();
    const out = [];
    const pushIfValid = (foe) => {
      if (!foe || foe === this || foe.isDead || foe.isBenched || foe.isFullyBurrowed || seen.has(foe)) return;
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

  gainCrucibleCore(amount = 1, game = null) {
    const prev = this.crucibleStacks;
    this.crucibleStacks = Math.max(0, Math.min(this.maxCrucibleStacks, this.crucibleStacks + amount));
    if (prev < this.maxCrucibleStacks && this.crucibleStacks >= this.maxCrucibleStacks) {
      this.fx?.spawn('moltenAnvilSparks', this.x, this.y - 84, {
        flip: this.facing < 0,
        palette: FORGE_JADE_PALETTE,
        light: 1.35
      });
      const g = game || this.game;
      g?.vfx?.spawnDamageText?.(this.x, this.y - 166, 0, false, 'CRUCIBLE MAX TEMPER!', '#10b981');
    }
  }

  triggerWorldBreakerTemper(targetX, enemy, game) {
    if (this.crucibleStacks < this.maxCrucibleStacks) return false;
    this.crucibleStacks = 0;
    this.forgeArmorTimer = Math.max(this.forgeArmorTimer, 0.58);
    this.heal(28, 'WORLD-BREAKER TEMPER');

    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const obeliskX = Math.max(75, Math.min(ww - 75, targetX));
    this.fx?.spawn('tectonicCraterSlam', obeliskX, this.groundY - 4, {
      flip: this.facing < 0,
      palette: FORGE_JADE_PALETTE,
      light: 1.38,
      extra: { maxRx: 136 }
    });
    this.spawnSheetBurst(2, obeliskX, this.groundY - 84, {
      w: 232,
      h: 232,
      maxLife: 0.56,
      flipX: this.facing < 0,
      glowColor: 'emerald',
      inFront: false
    });
    game?.vfx?.spawnDamageText?.(this.x, this.y - 172, 0, true, 'WORLD-BREAKER TEMPER!', '#34d399');

    for (const t of this.getActiveEnemies(enemy, game)) {
      if (Math.abs(t.x - obeliskX) <= 156) {
        t.takeDamage(24, this, true, 110 * this.facing, -185);
      }
    }
    return true;
  }

  manifestAncestorAvatar(duration = 0.72, light = 1.42) {
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
      light: 1.36,
      extra: { maxRx: 142 }
    });
    this.fx?.spawn('moltenAnvilSparks', ax, this.groundY - 64, {
      flip: this.facing < 0,
      palette: FORGE_JADE_PALETTE,
      light: 1.32
    });
    this.spawnSheetBurst(4, ax, this.groundY - 66, {
      w: 228,
      h: 228,
      maxLife: 0.42,
      flipX: this.facing < 0,
      glowColor: 'emerald',
      inFront: true
    });
    this.spawnSheetBurst(2, ax, this.groundY - 82, {
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

    if (newState === 'AUTO_ATTACK') {
      if (this._comboPersistTimer <= 0 && prevState !== 'AUTO_ATTACK') {
        this.comboStep = 0;
      }
      this._beginComboBeat(this.comboStep % 4, this.game);
    }

    if (newState === 'ULTIMATE') {
      this._ultCastTriggered = false;
      this._ultWaveStep = 0;
      this._homeRunFlights = [];
      this._homeRunSwingStreak = null;
    }

    if (newState !== 'ULTIMATE' && newState !== 'TRUE_ULTIMATE') {
      this.giantScale = 1.0;
      this.cameraAirLift = 0;
      this.isInvulnerable = newState === 'JUMP';
      this._ultCastTriggered = false;
      this._ultWaveStep = 0;
    }

    if (newState !== 'ULTIMATE' && newState !== 'TRUE_ULTIMATE' && newState !== 'AUTO_ATTACK') {
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
    }

    if (newState === 'TRUE_ULTIMATE') {
      this._trueUltStep = 0;
      this._trueUltMidAirClanged = false;
      this._trueUltGeyserTimer = 0;
      this._trueUltAirSparkAccum = 0;
      this._trueUltBoundFoes = [];
      this._superJumpTrail = [];
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
      this.fissureWaves.length = 0;
      this.anvilShockBursts.length = 0;
      this._superJumpTrail = [];
    }
  }

  /**
   * Initializes one beat (`0..3`) of Torgar EX's heavy 4-beat World-Maul combo (`0` return to IDLE!).
   * Steps forward during windup, then hard-plants boots (`vx = 0`) right on the blunt anvil-strike snap!
   */
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
    let desiredX = this.x + this.facing * (v === 0 ? 18 : v === 2 ? 16 : 12);

    if (enemy && !enemy.isDead) {
      const sweetDist = v === 2 ? 112 : 118;
      const idealStandX = enemy.x - this.facing * sweetDist;
      const rawDelta = (idealStandX - this.x) * this.facing;
      const maxForward = v === 0 ? 98 : v === 2 ? 42 : 30;
      const clampedForward = Math.max(0, Math.min(maxForward, rawDelta));
      desiredX = this.x + this.facing * clampedForward;
    }

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
   * Spawns a Blunt Squared-Off Molten Anvil Concussion Shock-Burst (`0` pointed sword crescents!).
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
    this.spawnVfxAnim(0, spawnX, this.groundY - 54, 212, 212, 0.34, {
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

    const consider = (foe) => {
      if (!foe || foe === this || foe.isDead || foe.isBenched || foe.isFullyBurrowed || seen.has(foe)) return;
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

  /**
   * Applies Torgar EX's Heavy World-Maul Concussion Impact with `52-68ms` bone-crunching `_hitStopTimer`,
   * target `_hitShakeTimer`, blunt anvil shock-bars, `Row 4` star-crater bursts, and flying forge sparks!
   */
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
        w: 196,
        h: 196,
        maxLife: 0.26,
        flipX: this.facing < 0,
        glowColor: isJade ? 'emerald' : 'gold',
        inFront: true
      });
      this.fx?.burst(hitX, hitY, {
        count: isCrit ? 9 : 6,
        speedMin: 52,
        speedMax: 175,
        lifeMin: 0.12,
        lifeMax: 0.26,
        gravity: 55,
        colors: isJade
          ? ['#ffffff', '#fde047', '#10b981', '#78350f']
          : ['#ffffff', '#fde047', '#f59e0b', '#78350f']
      });

      if (i === 0 && callout && game?.vfx) {
        game.vfx.spawnDamageText(foe.x, foe.y - 156, 0, isCrit, callout, calloutColor);
      }
      landedAny = true;
    }

    if (landedAny && hitStop > 0) {
      this._hitStopTimer = Math.max(this._hitStopTimer || 0, hitStop);
      game?.renderer?.triggerHitStop?.(hitStop * 0.75);
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
      slot = this.fx.spawn('forgeMagmaMantle', this.x, this.y - 78, {
        follow: this,
        offsetX: 0,
        offsetY: -78,
        flip: false,
        palette: FORGE_GOLD_PALETTE,
        light: 1.18,
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
    this.crouchDuration = 0.80;
    this.setState('CROUCH');
    this.isCrouching = true;
    this.isDeflecting = true;
    this.forgeArmorTimer = 1.15;
    this.gainCrucibleCore(1, game);
    this.heal(14, 'FORGE TEMPER');
    this.vx = 0;
    const frontX = this.x + this.facing * 118;

    this.fx?.spawn('runicBulwarkDome', this.x, this.y - 78, {
      follow: this,
      offsetX: 0,
      offsetY: -78,
      flip: this.facing < 0,
      palette: FORGE_GOLD_PALETTE,
      light: 1.22
    });
    this.spawnSheetBurst(3, this.x, this.groundY - 46, {
      w: 204,
      h: 204,
      maxLife: 0.48,
      followOwner: true,
      offsetX: 0,
      offsetY: -46,
      flipX: this.facing < 0,
      glowColor: 'emerald',
      inFront: false
    });

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
          this.spawnSheetBurst(4, proj.x, proj.y, {
            w: 192,
            h: 192,
            maxLife: 0.30,
            flipX: this.facing < 0,
            glowColor: 'gold',
            inFront: true
          });
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
        light: 1.26,
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

  startJump(enemy, game) {
    this.dashDuration = 0.62;
    this.setState('JUMP');
    this.isInvulnerable = true;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    let dir = this.facing;
    if (enemy && !enemy.isDead) {
      dir = Math.sign(enemy.x - this.x) || this.facing;
    }
    this.dashDir = dir;
    this.isFlipVault = true;
    this.vaultStartX = this.x;
    const targetDist =
      enemy && !enemy.isDead ? Math.min(220, Math.max(85, Math.abs(enemy.x - this.x) - 114)) : 145;
    this.vaultTargetX = Math.max(85, Math.min(ww - 85, this.x + dir * targetDist));
    this.vx = 0;
    this.vy = 0;

    this.fx?.spawn('moltenAnvilSparks', this.x, this.groundY - 12, {
      flip: this.facing < 0,
      palette: FORGE_GOLD_PALETTE,
      light: 1.15
    });

    if (game?.audio) game.audio.play('dash_whoosh', this.x);
    game?.vfx?.spawnDamageText?.(this.x, this.y - 144, 0, false, 'TECTONIC CRUSH LEAP!', '#fbbf24');
  }

  onStartDash(_enemy, game, dir) {
    this.isFlipVault = false;
    this.unstoppablePoise = true;
    this.dashDir = dir || this.facing;

    this.fx?.spawn('runicBulwarkDome', this.x, this.y - 78, {
      follow: this,
      offsetX: 0,
      offsetY: -78,
      flip: this.facing < 0,
      palette: FORGE_GOLD_PALETTE,
      light: 1.16
    });

    if (game?.audio) game.audio.play('dash_whoosh', this.x);
    game?.vfx?.spawnDamageText?.(this.x, this.y - 144, 0, false, 'JUGGERNAUT BULL-RUSH!', '#f59e0b');
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
          light: 1.28,
          extra: { maxRx: 132 }
        });
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
    const distToEnemy = enemy && !enemy.isDead ? (enemy.x - this.x) * dir : 999;
    if (distToEnemy <= 114 && distToEnemy >= 65) {
      this.vx = 0;
    } else {
      const rushSpeed = 520 * (1 - u * 0.42);
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
          this.fx?.spawn('moltenAnvilSparks', this.x + this.facing * 52, this.y - 82, {
            flip: this.facing < 0,
            palette: FORGE_GOLD_PALETTE,
            light: 1.22
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
   * - `52-68ms` bone-crunching `_hitStopTimer` + blunt anvil shock-fans (`0` sword-tip crescents!):
   *   * `V0 (F03)`: Overhead earth-crush smash smear (`54ms` hit-stop + `tectonicCraterSlam` + `Magnetic Fissure Wave`).
   *   * `V1 (F09)`: Rising volcanic uppercut maul smear (`56ms` hit-stop + `Row 2` Magma-Jade Pillar + `+1` Core).
   *   * `V2 (F17/F18)`: 2.5D baseball-swing horizontal concussion ring (`2-hit` `52ms+56ms` hit-stop + Ancestor Avatar + Resonance).
   *   * `V3 (F25)`: High jump -> meteoric World-Anvil ground-fissure slam (`3-hit` + `'forge_wave'` + `68ms` hit-stop!).
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

    // Snap times aligned to Row 2 blunt maul smears: V0->F03(0.12s), V1->F09(0.08s), V2->F17(0.09s), V3->F25(0.17s)
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

    // 1. Heavy Forge-King Step -> Hard-Locked Boots (`vx = 0`) right on the blunt anvil-strike snap!
    this.vx = 0;
    if (t < snapT) {
      const lungeU = Math.min(1, Math.max(0, t / snapT));
      const eased = 1 - Math.pow(1 - lungeU, 2.1);
      this.x = this._beatStartX + (this._beatTargetX - this._beatStartX) * eased;

      if (v === 2 && !this.didSecondaryAction && t >= 0.03) {
        this.didSecondaryAction = true;
        this.manifestAncestorAvatar(0.68, 1.44);
      }

      if (v === 0 && Math.abs(this._beatTargetX - this._beatStartX) > 26) {
        this._dragSparkAcc += dt;
        if (this._dragSparkAcc >= 0.036) {
          this._dragSparkAcc = 0;
          this.spawnAfterimage(this.x, this.y, this.facing, 2, localStep, 0.16, false);
          this.fx?.burst(this.x - dir * 32, this.groundY - 2, {
            count: 3,
            speedMin: 32,
            speedMax: 92,
            lifeMin: 0.10,
            lifeMax: 0.22,
            gravity: 80,
            colors: ['#ffffff', '#fde047', '#f59e0b', '#10b981']
          });
        }
      }
    } else if (!this._bootsPlanted) {
      this._bootsPlanted = true;
      this.x = this._beatTargetX;
      this.vx = 0;
    }

    // High Dwarven jump on Beat 4 (`V3`: leaps F23..F24 up to 68px, meteor-slams onto groundY at F25 `t = 0.17s`!)
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

    // 2. Beat-Specific Blunt World-Maul Concussion Impacts & 52-68ms Hit-Stop!
    if (v === 0) {
      // V0 (F03): Overhead Earth-Crush Smash Smear (54ms hit-stop + Crater Slam + Magnetic Fissure Wave)
      if ((this._beatHitMask & 1) === 0 && t >= 0.12) {
        this._beatHitMask |= 1;
        const impactX = this.x + dir * 116;
        game?.renderer?.triggerShake?.(10, 0.20);
        if (game?.audio) game.audio.play('thunder_slam', impactX);

        this.fx?.spawn('tectonicCraterSlam', impactX, this.groundY - 4, {
          flip: dir < 0,
          palette: FORGE_GOLD_PALETTE,
          light: 1.34,
          extra: { maxRx: 132 }
        });
        this.spawnFissureWave(this.x + dir * 94, dir);

        const landed = this._applyWorldMaulCrush(enemy, game, {
          damage: 46,
          reachFront: 238,
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
      // V1 (F09): Rising Volcanic Uppercut Maul Smear (56ms hit-stop + Magma-Jade Rune Pillar + +1 Crucible Core)
      if ((this._beatHitMask & 1) === 0 && t >= 0.08) {
        this._beatHitMask |= 1;
        const pillarX =
          enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= 242
            ? enemy.x
            : this.x + dir * 114;
        game?.renderer?.triggerShake?.(11, 0.22);

        this.spawnSheetBurst(2, pillarX, this.groundY - 82, {
          w: 204,
          h: 204,
          maxLife: 0.44,
          flipX: dir < 0,
          glowColor: 'emerald',
          inFront: false
        });
        this.fx?.spawn('moltenAnvilSparks', pillarX, this.groundY - 68, {
          flip: dir < 0,
          palette: FORGE_JADE_PALETTE,
          light: 1.32
        });

        const landed = this._applyWorldMaulCrush(enemy, game, {
          damage: 50,
          reachFront: 240,
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
      // V2 (F17 & F18): 2.5D Baseball-Swing Horizontal Concussion Ring -> 2-Hit Blunt Ring (52ms + 56ms hit-stop)!
      if ((this._beatHitMask & 1) === 0 && t >= 0.09) {
        this._beatHitMask |= 1;
        const impactX = this.x + dir * 116;
        this.fx?.spawn('moltenAnvilSparks', impactX, this.groundY - 72, {
          flip: dir < 0,
          palette: FORGE_GOLD_PALETTE,
          light: 1.32
        });
        this._applyWorldMaulCrush(enemy, game, {
          damage: 32,
          reachFront: 242,
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
          palette: FORGE_JADE_PALETTE,
          light: 1.38,
          extra: { maxRx: 146 }
        });
        const landed = this._applyWorldMaulCrush(enemy, game, {
          damage: 38,
          reachFront: 246,
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
      // V3 (F25): High Jump -> Meteoric World-Anvil Ground-Fissure Slam (3-Hit + forge_wave + 68ms Hit-Stop!)
      if ((this._beatHitMask & 1) === 0 && t >= 0.17) {
        this._beatHitMask |= 1;
        const slamX =
          enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= 246
            ? enemy.x
            : this.x + dir * 116;
        const ww = game?.renderer ? game.renderer.worldWidth : 1200;

        game?.renderer?.triggerShake?.(15, 0.28);
        if (game?.audio) {
          game.audio.play('thunder_slam', slamX);
          game.audio.play('clang', slamX);
        }

        this.fx?.spawn('tectonicCraterSlam', slamX, this.groundY - 4, {
          flip: dir < 0,
          palette: FORGE_GOLD_PALETTE,
          light: 1.42,
          extra: { maxRx: 152 }
        });
        this.fx?.spawn('moltenAnvilSparks', slamX, this.groundY - 64, {
          flip: dir < 0,
          palette: FORGE_GOLD_PALETTE,
          light: 1.38
        });
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
          damage: 30,
          reachFront: 248,
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
          damage: 26,
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
          damage: 18,
          reachFront: 250,
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
          damage: 24,
          reachFront: 252,
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

    // 3. Seamless Direct Beat Chaining (0.015s link, ZERO return to IDLE!)
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
        Math.abs(enemy.x - this.x) <= 255;

      if (v < 3 && (aiWantsChain || advHoldingAttack)) {
        if (game?.adventure?.queuedAction === 'attack') {
          game.adventure.queuedAction = null;
        }
        this._intraLinkTimer = INTRA_COMBO_LINK;
        return;
      }

      if (v === 3) {
        this.comboStep = 0;
        this._aiComboReadyFinisher = 0.94;
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
   * Signature Skill (`WORLD-ANVIL CATACLYSM`):
   * Plants persistent `3.8s` `worldAnvilAltar` + batters `activeAnvil` cannonball with `bouncesLeft = 1` (`ANVIL WALL-RICOCHET!`)!
   */
  updateSkill(_dt, enemy, game) {
    const t = this.stateTimer;
    const dir = this.facing;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;

    if (t >= 0.06 && !this.didActionFrame) {
      this.didActionFrame = true;
      this.vx = dir * 95;
      this.forgeArmorTimer = Math.max(this.forgeArmorTimer, 0.75);
      this.gainCrucibleCore(1, game);

      const anvilX = Math.max(98, Math.min(ww - 98, this.x + dir * 120));
      this.worldAnvilAltar = {
        x: anvilX,
        y: this.groundY,
        dir,
        age: 0,
        life: 3.8,
        maxLife: 3.8,
        pulseTimer: 1.35,
        resonanceCd: 0.45,
        dashBoostCd: 0
      };

      this.fx?.spawn('runicBulwarkDome', this.x, this.y - 78, {
        follow: this,
        offsetX: 0,
        offsetY: -78,
        flip: dir < 0,
        palette: FORGE_GOLD_PALETTE,
        light: 1.26
      });
      this.fx?.spawn('tectonicCraterSlam', anvilX, this.groundY - 4, {
        flip: dir < 0,
        palette: FORGE_JADE_PALETTE,
        light: 1.28,
        extra: { maxRx: 132 }
      });

      if (game?.audio) {
        game.audio.play('skill_cast', anvilX);
        game.audio.play('clang', anvilX);
      }
      game?.renderer?.triggerShake?.(8, 0.16);
      game?.vfx?.spawnSpecialCastAura?.(this, this.skillName, 'WORLD-ANVIL CATACLYSM', 'forge', false);
      game?.vfx?.spawnDamageText?.(anvilX, this.groundY - 122, 0, false, 'WORLD-ANVIL ALTAR!', '#10b981');

      const advSkillBounds =
        game?.adventure?.active && typeof game.adventure.getActiveStageBounds === 'function'
          ? game.adventure.getActiveStageBounds()
          : null;
      const pullMin = advSkillBounds ? advSkillBounds.minX + 24 : 70;
      const pullMax = advSkillBounds ? advSkillBounds.maxX - 24 : ww - 70;
      for (const foe of this.getActiveEnemies(enemy, game)) {
        if (Math.abs(foe.x - anvilX) <= 208) {
          const pullSign = anvilX >= foe.x ? 1 : -1;
          if (!foe.isColossalBoss) {
            foe.x = Math.max(pullMin, Math.min(pullMax, foe.x + pullSign * 38));
          }
          foe.takeDamage(38, this, false, pullSign * 55, -125);
        }
      }
    }

    if (t >= 0.45 && !this.didSecondaryAction) {
      this.didSecondaryAction = true;
      this.vx = 0;
      const impactX = this.worldAnvilAltar ? this.worldAnvilAltar.x : this.x + dir * 124;
      const impactY = this.groundY - 6;

      if (game?.audio) {
        game.audio.play('thunder_slam', impactX);
        game.audio.play('clang', impactX);
      }
      game?.renderer?.triggerShake?.(12, 0.24);
      this._hitStopTimer = Math.max(this._hitStopTimer || 0, 0.056);
      game?.renderer?.triggerHitStop?.(0.044);

      this.fx?.spawn('tectonicCraterSlam', impactX, impactY, {
        flip: dir < 0,
        palette: FORGE_GOLD_PALETTE,
        light: 1.34,
        extra: { maxRx: 134 }
      });
      this.fx?.spawn('moltenAnvilSparks', impactX, impactY - 52, {
        flip: dir < 0,
        palette: FORGE_GOLD_PALETTE,
        light: 1.34
      });
      this.spawnSheetBurst(4, impactX, impactY - 58, {
        w: 216,
        h: 216,
        maxLife: 0.40,
        flipX: dir < 0,
        glowColor: 'gold',
        inFront: true
      });
      this.spawnAnvilShockBurst(impactX, impactY - 58, 64, 22, 0.26, false);

      this.triggerWorldBreakerTemper(impactX + dir * 64, enemy, game);
      game?.vfx?.spawnDamageText?.(impactX, this.y - 158, 0, true, 'ANVIL CANNONBALL!', '#fbbf24');

      this.activeAnvil = {
        x: impactX + dir * 18,
        y: this.groundY,
        vx: dir * 940,
        dir,
        age: 0,
        trailAccum: 0,
        state: 'flying',
        bouncesLeft: 1,
        rebounded: false,
        hitTargets: new Set()
      };

      for (const foe of this.getActiveEnemies(enemy, game)) {
        if (Math.abs(foe.x - impactX) < 134) {
          foe.takeDamage(36, this, true, dir * 155, -130);
        }
      }
    }

    if (t >= (this.skillDuration || 0.94)) {
      this.vx = 0;
      this.setState('IDLE');
    }
  }

  /**
   * Overdrive (`ULTIMATE` — `WORLD-BREAKER HOME RUN`, `1.46s`):
   * Batter's Box (`Row 4 F00..F05`) -> horizontal baseball-bat home-run swing (`Row 4 F06..F14`)
   * launching hit enemies into the farthest wall + `0.80s` Stun!
   */
  updateUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.ultDuration || 1.46;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;

    this.mana = 0;
    this.giantScale = 1.0;
    this.isInvulnerable = t < 0.88;
    this.forgeArmorTimer = Math.max(this.forgeArmorTimer, 0.55);
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
      this._ultWaveStep = 0;
      this._homeRunFlights = [];
      this.gainCrucibleCore(1, game);

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
        game.vfx.spawnSpecialCastAura(this, this.ultName, 'WORLD-BREAKER HOME RUN!', 'forge', true);
        game.vfx.spawnDamageText(this.x, this.y - 168, 0, true, 'BATTER UP!', '#fde047');
      }
      game?.renderer?.triggerShake?.(9, 0.16);

      const plateX = leadFoe && !leadFoe.isDead ? leadFoe.x : this.x + this._homeRunDir * 108;
      this.spawnSheetBurst(3, plateX, this.groundY - 28, {
        w: 204,
        h: 204,
        maxLife: 0.52,
        flipX: this._homeRunDir < 0,
        glowColor: 'gold',
        inFront: false
      });
    }

    const batDir = this._homeRunDir || this.facing;
    this.facing = batDir;

    if (t < 0.42) {
      const windupU = Math.max(0, Math.min(0.999, t / 0.42));
      this.trueUltFrameOverride = 120 + Math.min(5, Math.floor(windupU * 6));

      if (leadFoe && !leadFoe.isDead) {
        if (leadFoe.isColossalBoss) {
          const bossFace = leadFoe.facing || -1;
          const bossBatterX = Math.max(
            wallMinX,
            Math.min(wallMaxX, (leadFoe.anchorX || leadFoe.x) + bossFace * 116)
          );
          const stepSpeed = t < 0.20 ? 28 : 14;
          this.x += (bossBatterX - this.x) * Math.min(1, dt * stepSpeed);
        } else {
          const clampedFoeX = Math.max(wallMinX + 112, Math.min(wallMaxX - 112, leadFoe.x));
          leadFoe.x += (clampedFoeX - leadFoe.x) * Math.min(1, dt * 16);
          const batterX = Math.max(wallMinX + 4, Math.min(wallMaxX - 4, leadFoe.x - batDir * 110));
          const stepSpeed = t < 0.20 ? 28 : 14;
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

    if (t >= 0.42 && (this._ultWaveStep || 0) < 1) {
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
        palette: FORGE_JADE_PALETTE,
        light: 1.44
      });
      this.spawnAnvilShockBurst(contactX, contactY, 72, 24, 0.28, true);

      this._homeRunSwingStreak = {
        startX: contactX,
        startY: contactY,
        targetWallX: this._homeRunTargetWallX,
        dir: batDir,
        age: 0,
        maxLife: 0.48
      };

      game?.vfx?.spawnDamageText?.(contactX, this.groundY - 178, 0, true, 'HOME-RUN GRAND SLAM!', '#fde047');

      for (const foe of foes) {
        if (foe !== leadFoe && Math.abs(foe.x - contactX) > 195) continue;
        const distRight = wallMaxX - foe.x;
        const distLeft = foe.x - wallMinX;
        const targetWallX = foe.isColossalBoss
          ? foe.anchorX || foe.x
          : this._homeRunTargetWallX || (distRight >= distLeft ? wallMaxX : wallMinX);
        foe.takeDamage(44, this, true, batDir * 680, -110);
        this.mana = 0;
        this._homeRunFlights.push({
          foe,
          startX: foe.x,
          targetWallX,
          dir: batDir,
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
        if (fl.sparkAccum >= 0.085) {
          fl.sparkAccum = 0;
          this.fx?.burst(fl.foe.x - fl.dir * 18, fl.foe.y - 68, {
            count: 2,
            speedMin: 42,
            speedMax: 105,
            lifeMin: 0.12,
            lifeMax: 0.22,
            gravity: 30,
            angle: fl.dir >= 0 ? Math.PI : 0,
            spread: 0.55,
            colors: ['#ffffff', '#fde047', '#f59e0b', '#10b981']
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

          fl.foe.takeDamage(42, this, true, -fl.dir * 35, -110);
          this.mana = 0;
          if (!fl.foe.isColossalBoss) {
            fl.foe.x = wallX;
            fl.foe.y = fl.foe.groundY;
          }
          fl.foe.vx = 0;
          fl.foe.vy = 0;

          fl.foe.stunTimer = Math.max(fl.foe.stunTimer || 0, 0.80);
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
            palette: FORGE_JADE_PALETTE,
            light: 1.44,
            extra: { maxRx: 165 }
          });
          this.fx?.spawn('moltenAnvilSparks', wallX, this.groundY - 68, {
            flip: fl.dir < 0,
            palette: FORGE_GOLD_PALETTE,
            light: 1.38
          });
          this.spawnSheetBurst(4, wallX, this.groundY - 78, {
            w: 208,
            h: 208,
            maxLife: 0.40,
            flipX: fl.dir < 0,
            glowColor: 'gold',
            inFront: true
          });

          game?.vfx?.spawnDamageText?.(wallX, this.groundY - 176, 0, true, 'WALL CRASH! STUNNED 0.8S!', '#34d399');
          this.triggerAnvilResonance(enemy, game, 34);
        }
      }
    }

    if (t < 0.68) {
      const swingU = Math.max(0, Math.min(0.999, (t - 0.42) / 0.26));
      this.trueUltFrameOverride = 120 + 6 + Math.min(4, Math.floor(swingU * 5));
    } else if (t < 1.08) {
      const holdU = Math.max(0, Math.min(0.999, (t - 0.68) / 0.40));
      this.trueUltFrameOverride = 120 + 10 + Math.min(1, Math.floor(holdU * 2));
    } else {
      const recU = Math.max(0, Math.min(0.999, (t - 1.08) / Math.max(0.01, dur - 1.08)));
      this.trueUltFrameOverride = 120 + 12 + Math.min(2, Math.floor(recU * 3));
    }

    if (t >= dur) {
      this._ultWaveStep = 0;
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      this.giantScale = 1.0;
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  /**
   * Supreme Ultimate (`TRUE_ULTIMATE`, `3.80s`):
   * "GOD-HAMMER MJOLNIR: CONTINENTAL SUNDER"
   * Colossal `2.15x` 4-Beat Sky-Uppercut -> Fast-Jump (`Super-Leap`) -> Meteor Ground-Smash + 2.5D Soil/Bedrock Crater Splash!
   */
  updateTrueUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.trueUltDuration || 3.80;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    this.isInvulnerable = true;
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
      game?.vfx?.spawnSpecialCastAura?.(this, this.trueUltName, 'GOD-HAMMER MJOLNIR!', 'forge', true);
      game?.vfx?.spawnDamageText?.(this.x, this.y - 185, 0, true, 'COLOSSUS AWAKENING!', '#f97316');

      this.fx?.spawn('tectonicCraterSlam', this._trueUltAnvilX, this.groundY - 4, {
        flip: ultDir < 0,
        palette: FORGE_GOLD_PALETTE,
        light: 1.38,
        extra: { maxRx: 165 }
      });
      this.spawnSheetBurst(5, this._trueUltAnvilX, this.groundY - 96, {
        w: 288,
        h: 288,
        maxLife: 2.40,
        flipX: ultDir < 0,
        glowColor: 'gold',
        inFront: false
      });
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
          light: 1.42,
          extra: { maxRx: 168 }
        });
        this.fx?.spawn('moltenAnvilSparks', this._trueUltAnvilX, this.groundY - 92, {
          flip: ultDir < 0,
          palette: FORGE_GOLD_PALETTE,
          light: 1.42
        });
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
      if (this._trueUltAirSparkAccum >= 0.095) {
        this._trueUltAirSparkAccum = 0;
        this.fx?.burst(this._trueUltAnvilX, targetFoeY - 46, {
          count: 2,
          speedMin: 35,
          speedMax: 90,
          lifeMin: 0.12,
          lifeMax: 0.20,
          gravity: 35,
          angle: -Math.PI * 0.5,
          spread: 0.85,
          colors: ['#ffffff', '#fde047', '#f59e0b']
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
            light: 1.38,
            extra: { maxRx: 156 }
          });
          this.fx?.spawn('moltenAnvilSparks', standX, this.groundY - 24, {
            flip: ultDir < 0,
            palette: FORGE_GOLD_PALETTE,
            light: 1.36
          });
          this.triggerSoilRockSplash(standX, this.groundY, ww, 'leap');
          game?.vfx?.spawnDamageText?.(standX, this.groundY - 190, 0, true, 'COLOSSUS SKY-LEAP!', '#fbbf24');
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
        this.fx?.spawn('moltenAnvilSparks', this._trueUltAnvilX, this.groundY - 215, {
          flip: ultDir < 0,
          palette: FORGE_GOLD_PALETTE,
          light: 1.46
        });
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

    if (this._trueUltStep < 4) {
      this._trueUltStep = 4;
      this._superJumpTrail = [];
      this._trueUltGeyserTimer = 1.05;
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

      this.heal(Math.round(this.maxHp * 0.09), 'WORLD-FORGE TEMPER');
      this.forgeArmorTimer = 1.25;
      this.crucibleStacks = this.maxCrucibleStacks;

      this.fx?.spawn('ragnarokWorldForgeWave', this._trueUltAnvilX, this.groundY - 4, {
        flip: ultDir < 0,
        palette: FORGE_GOLD_PALETTE,
        light: 1.55,
        extra: { stage: 3 }
      });
      this.fx?.spawn('tectonicCraterSlam', this._trueUltAnvilX, this.groundY - 4, {
        flip: ultDir < 0,
        palette: FORGE_GOLD_PALETTE,
        light: 1.48,
        extra: { maxRx: 215 }
      });

      this.spawnSheetBurst(7, this._trueUltAnvilX, this.groundY - 64, {
        w: 420,
        h: 256,
        maxLife: 0.98,
        flipX: ultDir < 0,
        glowColor: 'none',
        inFront: false
      });
      for (const side of [-1, 1]) {
        const splashX = Math.max(110, Math.min(ww - 110, this._trueUltAnvilX + side * 190));
        this.spawnSheetBurst(7, splashX, this.groundY - 46, {
          w: 284,
          h: 184,
          maxLife: 0.90,
          flipX: side < 0,
          glowColor: 'none',
          inFront: true
        });
      }
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
        foe.takeDamage(735, this, true, ultDir * 120, 0);
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
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      this._trueUltGeyserTimer = 0;
      this._superJumpTrail = [];
      this.setState('IDLE');
    }
  }

  update(dt, enemy, game) {
    this._currentEnemy = enemy;
    if (this._comboPersistTimer > 0 && this.state !== 'AUTO_ATTACK') {
      this._comboPersistTimer = Math.max(0, this._comboPersistTimer - dt);
      if (this._comboPersistTimer <= 0) {
        this.comboStep = 0;
      }
    }
    if (this.forgeArmorTimer > 0) {
      this.forgeArmorTimer = Math.max(0, this.forgeArmorTimer - dt);
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
    this._crucibleOrbitPhase += dt * (this.crucibleStacks >= this.maxCrucibleStacks ? 4.4 : 2.8);

    if (this.isDead) {
      this.worldAnvilAltar = null;
      this.activeAnvil = null;
      this.fissureWaves.length = 0;
      this._homeRunFlights.length = 0;
      this._homeRunSwingStreak = null;
      this._soilRockChunks.length = 0;
      this._soilDustPlumes.length = 0;
      this.anvilShockBursts.length = 0;
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
            this.fx?.spawn('moltenAnvilSparks', t.x, this.groundY - 36, {
              flip: wv.dir < 0,
              palette: FORGE_JADE_PALETTE,
              light: 1.22
            });
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
        this.fx?.spawn('tectonicCraterSlam', altar.x, this.groundY - 4, {
          flip: altar.dir < 0,
          palette: FORGE_JADE_PALETTE,
          light: 1.18,
          extra: { maxRx: 108 }
        });
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
        if (a.trailAccum >= 0.085) {
          a.trailAccum = 0;
          this.fx?.burst(a.x - a.dir * 20, a.y - 42, {
            count: 1,
            speedMin: 35,
            speedMax: 90,
            lifeMin: 0.12,
            lifeMax: 0.22,
            gravity: 45,
            angle: a.dir >= 0 ? Math.PI : 0,
            spread: 0.65,
            colors: ['#ffffff', '#fde047', '#f59e0b', '#10b981']
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
            const hitDmg = a.rebounded ? 54 : 82;
            t.takeDamage(hitDmg, this, true, a.dir * 265, -155);
            this.gainCrucibleCore(1, game);
            if (game.audio) game.audio.play('thunder_slam', t.x);
            game.renderer?.triggerShake?.(11, 0.22);
            game.renderer?.triggerHitStop?.(0.052);

            this.fx?.spawn('tectonicCraterSlam', t.x, this.groundY - 6, {
              flip: a.dir < 0,
              palette: a.rebounded ? FORGE_JADE_PALETTE : FORGE_GOLD_PALETTE,
              light: 1.28,
              extra: { maxRx: 124 }
            });
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
              this.fx?.spawn('moltenAnvilSparks', t.x, t.y - 54, {
                flip: a.dir < 0,
                palette: FORGE_JADE_PALETTE,
                light: 1.38
              });
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
          this.fx?.spawn('moltenAnvilSparks', a.x, a.y - 44, {
            flip: a.dir < 0,
            palette: FORGE_JADE_PALETTE,
            light: 1.36
          });
        } else if (a.x < wallMin - 28 || a.x > wallMax + 28 || a.age > 2.35) {
          this.fx?.spawn('moltenAnvilSparks', a.x, a.y - 38, {
            flip: a.dir < 0,
            palette: FORGE_GOLD_PALETTE,
            light: 1.22
          });
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
      }
    }

    super.update(dt, enemy, game);
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
      ctx.fillStyle = '#0d0f1c';
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

      ctx.fillStyle = '#0d0f1c';
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

  /**
   * Renders blunt squared-off Molten Anvil Concussion Shock-Bars (`0` pointed sword crescents, `fillRect` only!).
   */
  drawAnvilShockBursts(ctx) {
    if (!ctx?.fillRect || this.anvilShockBursts.length === 0) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < this.anvilShockBursts.length; i++) {
      const b = this.anvilShockBursts[i];
      const u = Math.min(1, b.age / b.maxLife);
      const fade = u < 0.14 ? 1.0 : Math.max(0, 1 - (u - 0.14) / 0.86);
      if (fade <= 0.02) continue;

      const expand = 1 + u * 0.42;
      const hw = Math.max(12, Math.round((b.halfW * expand) / 2) * 2);
      const hh = Math.max(6, Math.round((b.halfH * (1 - u * 0.48)) / 2) * 2);

      ctx.globalAlpha = Math.min(1, fade * 0.92);
      // Outer scorched bronze-iron / jade anvil concussion plate
      ctx.fillStyle = b.isJade ? '#064e3b' : '#78350f';
      ctx.fillRect(b.cx - hw - 4, b.cy - hh - 2, (hw + 4) * 2, (hh + 2) * 2);

      // Molten amber / emerald shock body
      ctx.fillStyle = b.isJade ? '#10b981' : '#f59e0b';
      ctx.fillRect(b.cx - hw, b.cy - hh, hw * 2, hh * 2);

      // Molten sun-gold crest
      const midW = Math.max(8, Math.round(hw * 0.78));
      const midH = Math.max(4, Math.round(hh * 0.62));
      ctx.fillStyle = '#fde047';
      ctx.fillRect(b.cx - midW, b.cy - midH, midW * 2, midH * 2);

      // Blunt squared-off pure white anvil-strike core
      const coreW = Math.max(6, Math.round(hw * 0.52));
      const coreH = Math.max(2, Math.round(hh * 0.34));
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(b.cx - coreW, b.cy - coreH, coreW * 2, coreH * 2);
    }
    ctx.restore();
  }

  drawBehind(ctx, renderer = null) {
    if (this.state !== 'TRUE_ULTIMATE') return;
    const t = this.stateTimer || 0;
    const dur = this.trueUltDuration || 3.80;
    const ww = renderer?.worldWidth || 1200;

    if (ctx?.fillRect) {
      const envAlpha =
        t < 0.30 ? t / 0.30 : t > dur - 0.55 ? Math.max(0, (dur - t) / 0.55) : 1.0;
      ctx.save();
      ctx.fillStyle = `rgba(18, 8, 4, ${(0.44 * envAlpha).toFixed(3)})`;
      ctx.fillRect(0, -480, ww, this.groundY + 620);
      ctx.fillStyle = `rgba(245, 158, 11, ${(0.14 * envAlpha).toFixed(3)})`;
      ctx.fillRect(0, this.groundY - 12, ww, 16);

      if (t >= 1.50 && t < 2.36) {
        const ax = Math.round(this._trueUltAnvilX || 600);
        const topY = Math.round(this.y - 210);
        const beamH = Math.max(24, Math.round(this.groundY - topY));
        ctx.fillStyle = 'rgba(245, 158, 11, 0.14)';
        ctx.fillRect(ax - 18, topY, 36, beamH);
        ctx.fillStyle = 'rgba(251, 191, 36, 0.24)';
        ctx.fillRect(ax - 6, topY, 12, beamH);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
        ctx.fillRect(ax - 2, topY, 4, beamH);
      }
      ctx.restore();
    }

    if (t >= 2.36) return;

    const sprites = this.getExSprites();
    const vfxSheet = PixelForge.ensureImage?.(sprites?.vfx) || sprites?.vfx;
    const col = Math.floor(t * 30) % 30;
    const ax = this._trueUltAnvilX || 600;
    const ay = this.groundY - 110;

    if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      this.drawBloomedVfxCell(ctx, vfxSheet, 5, col, ax, ay, 336, 336, 0.96, this.facing < 0, renderer, 'gold');

      if (t >= 1.50) {
        this.drawBloomedVfxCell(ctx, vfxSheet, 3, col, this.x, this.y - 185, 312, 312, 0.88, this.facing < 0, renderer, 'emerald');
      }
    }

    const foes = this.game ? this.getActiveEnemies(null, this.game) : [];
    for (const foe of foes) {
      if (t >= 1.50) {
        this.drawPixelForgeChain(ctx, this.x, this.y - 140, foe.x, foe.y - 64, t);
      } else {
        this.drawPixelForgeChain(ctx, ax, this.groundY - 64, foe.x, foe.y - 68, t);
      }
    }
  }

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
    renderer = null,
    glowColor = 'gold'
  ) {
    const sheet = PixelForge.ensureImage?.(vfxSheet) || vfxSheet;
    if (!sheet || !sheet.complete || !sheet.naturalWidth) return;
    const cell = 208;
    const sx = Math.max(0, Math.min(29, Math.floor(col))) * cell;
    const sy = Math.max(0, Math.min(7, Math.floor(row))) * cell;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(x), Math.round(y));
    if (flipX) ctx.scale(-1, 1);

    const useGlow = glowColor !== 'none';
    const glowSprite = !useGlow
      ? null
      : glowColor === 'emerald'
        ? renderer?.glowEmerald || renderer?.glowGold || renderer?.glowOrange
        : renderer?.glowGold || renderer?.glowOrange;
    if (glowSprite) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, alpha * 0.14);
      const gw = Math.round(w * 1.06);
      const gh = Math.round(h * 1.06);
      ctx.drawImage(glowSprite, -gw * 0.5, -gh * 0.5, gw, gh);
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.drawImage(sheet, sx, sy, cell, cell, -w * 0.5, -h * 0.5, w, h);

    if (useGlow) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, alpha * 0.16);
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
        this.drawBloomedVfxCell(ctx, sheet, 3, col, altar.x, altar.y - 36, 212, 212, fade * 0.92, altar.dir < 0, renderer, 'emerald');
        this.drawBloomedVfxCell(ctx, sheet, 1, col, altar.x, altar.y - 54, 196, 196, fade * 0.98, altar.dir < 0, renderer, 'gold');
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
      this.drawBloomedVfxCell(ctx, sheet, 0, col, a.x - a.dir * 28, a.y - 48, 192, 192, 0.88, a.dir < 0, renderer, a.rebounded ? 'emerald' : 'gold');
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

      ctx.fillStyle = c.isRock ? '#292524' : '#362214';
      ctx.fillRect(cx - hs, cy - hs, s, s);

      ctx.fillStyle = c.isRock ? '#57534e' : '#5c3d26';
      ctx.fillRect(cx - hs, cy - hs, Math.max(2, s - 2), Math.max(2, s - 2));

      ctx.fillStyle = c.isRock ? '#a8a29e' : '#a67c52';
      ctx.fillRect(cx - hs + 2, cy - hs, Math.max(2, s - 4), Math.max(2, Math.round(s * 0.45)));
    }
    ctx.restore();
  }

  drawForegroundOverlay(ctx, renderer = null) {
    const sprites = this.getExSprites();
    const sheet = PixelForge.ensureImage?.(sprites?.sheet) || sprites?.sheet;
    const vfxSheet = PixelForge.ensureImage?.(sprites?.vfx) || sprites?.vfx;

    this.drawBehind(ctx, renderer);

    if (this.afterimages.length > 0 && sheet && sheet.complete && sheet.naturalWidth) {
      for (let i = 0; i < this.afterimages.length; i++) {
        const img = this.afterimages[i];
        const alpha = Math.max(0, (1 - img.age / img.maxLife) * 0.36);
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

    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    this.fx?.renderLayer(ctx, 'back', arenaCenterX, this.groundY, 0.96);

    this.drawCrucibleCores(ctx, false);
  }

  drawHomeRunTrajectory(ctx) {
    if (!ctx?.fillRect || !this._homeRunSwingStreak) return;
    const st = this._homeRunSwingStreak;
    const u = Math.min(1, st.age / st.maxLife);
    const alpha = u < 0.15 ? u / 0.15 : Math.max(0, 1 - (u - 0.15) / 0.85);
    if (alpha <= 0.02) return;

    const flight = this._homeRunFlights?.[0];
    const endX = flight?.foe
      ? Math.round(flight.foe.x)
      : Math.round(st.startX + (st.targetWallX - st.startX) * Math.min(1, u * 1.4));
    const startX = Math.round(st.startX);
    const minX = Math.min(startX, endX);
    const spanW = Math.max(12, Math.abs(endX - startX));
    const cy = Math.round(st.startY);

    ctx.save();
    ctx.globalAlpha = alpha * 0.82;
    ctx.fillStyle = '#0d0f1c';
    ctx.fillRect(minX, cy - 4, spanW, 8);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(minX, cy - 3, spanW, 6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(minX, cy - 1, spanW, 2);

    const ringCount = Math.min(6, Math.max(2, Math.floor(spanW / 135)));
    for (let i = 1; i <= ringCount; i++) {
      const rx = Math.round(startX + ((endX - startX) * i) / (ringCount + 1));
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(rx - 2, cy - 20, 4, 40);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(rx - 1, cy - 16, 2, 32);
    }
    ctx.restore();
  }

  drawUltimateForeground(ctx, renderer = null) {
    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    this.fx?.renderLayer(ctx, 'front', arenaCenterX, this.groundY, 0.98);

    this.drawAnvilShockBursts(ctx);
    this.drawHomeRunTrajectory(ctx);
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

    // Wide-canvas (`320x240`) compatible 2-ghost upward motion trail during `2.15x` Super-Leap!
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
