import { Fighter } from './Fighter.js?v=30fps113';
import { PixelForge } from '../engine/PixelForge.js?v=30fps113';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps113';
import {
  RUNIC_STEEL_EFFECT_REGISTRY,
  RUNIC_CYAN_PALETTE,
  RUNIC_GOLD_PALETTE
} from '../engine/shaders/runicSteelShaders.js?v=30fps113';

const AUTO_SLICES_EX = [
  [60, 8], // Beat 1 (V0, 0.36s): Coiled Downward Dawn-Cleave -> snaps at F03 (63)
  [68, 7], // Beat 2 (V1, 0.34s): Instant Reverse Rising Heaven-Slash -> snaps at F09 (69)
  [75, 8], // Beat 3 (V2, 0.38s): Spinning Vortex Cross-Rip (2-hit) -> snaps at F17/F18 (77/78)
  [83, 7]  // Beat 4 (V3, 0.52s): Airborne Heavensplitter Execution -> leaps 83..84, slams at F25 (85)
];

const BEAT_DURATIONS = [0.36, 0.34, 0.38, 0.52];
const INTRA_COMBO_LINK = 0.015;

/**
 * Aethelgard EX (`warrior_ex`) — Exvius Sovereign of the Dawn-Breaker Greatsword.
 * Next-Gen Wide-Canvas (`320x240`, `anchorX=112, anchorY=230`) FFBE / Last Cloudia Hack-and-Slash Champion.
 * Coexists 100% independently alongside classic Aethelgard (`warrior`).
 */
export class WarriorEx extends Fighter {
  constructor(x, groundY, facing = 1) {
    const opts = typeof x === 'object' && x !== null ? x : { x, groundY, facing };
    super({
      ...opts,
      name: opts.name || 'Aethelgard EX',
      maxHp: 4060,
      attackRange: 178,
      moveSpeed: 192,
      autoInterval: 1.04,
      lightColor: 'rgba(125, 211, 252, 1)',
      primaryColor: '#38bdf8',
      hasTrueUltimate: true,
      trueUltName: 'EXVIUS DAWN: SOVEREIGN OF LIGHT',
      trueUltDuration: 4.35
    });

    this.heroId = 'warrior_ex';
    this.theme = 'exvius';
    this.secondaryColor = '#facc15';
    this.deathSfx = 'death_warrior';
    this.hasPoise = true;

    this.autoDuration = BEAT_DURATIONS[0];
    this._postFlurryInterval = 1.38;
    this.skillName = 'ASTRAL BLADE-RUSH';
    this.skillMaxCooldown = 4.6;
    this.skillCooldown = 1.2;
    this.skillDuration = 1.02;
    this.skillTriggerRange = 380;

    this.ultName = 'RADIANT OMNISLASH';
    this.ultSub = 'FIVE-FOLD SMEAR BLITZ';
    this.ultDuration = 1.92;

    this.trueUltName = 'EXVIUS DAWN: SOVEREIGN OF LIGHT';
    this.trueUltSub = 'SUPREME FINISHER - CATHEDRAL DAWN-BREAKER';
    this.trueUltDuration = 4.35;

    this.dodgeMaxCooldown = 3.4;
    this.dashMaxCooldown = 3.1;
    this.crouchCooldown = 0;
    this.crouchDuration = 0.92;
    this.isCrouching = false;
    this.isDeflecting = false;
    this.vaultCooldown = 0;
    this.isFlipVault = false;
    this.flipStartX = this.x;
    this.flipTargetX = this.x;
    this.cameraAirLift = 0;

    // 4-Beat FFBE / Last Cloudia Hack-and-Slash State
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

    // Skill / Overdrive / True Ultimate State
    this._skillSlashMask = 0;
    this._skillStartX = this.x;
    this._ultInit = false;
    this._ultSlashStep = 0;
    this._ultDidPlunge = false;
    this._ultTargetX = 600;
    this._trueUltInit = false;
    this._trueUltStage = 0;
    this._trueUltCageStep = 0;
    this.justiceWingsActive = false;
    this.justiceWingSpread = 0;
    this.justiceFeatherTimer = 0;
    this.justiceFeathers = [];
    this.justiceSlashes = [];

    // Pixel-pure visual layers (zero canvas rotation, zero smooth ellipses)
    this._overrideFrameIdx = null;
    this.afterimages = [];
    this.afterimageAccum = 0;
    this.activeVfxAnims = [];
    this.razorScars = [];
    this.cathedralBeams = [];
    this.stepDustTimer = 0;

    this.fx = new ArcaneShaderFX(RUNIC_STEEL_EFFECT_REGISTRY, {
      pixelScale: 3,
      viewW: 480,
      viewH: 280
    });
    this.haloFxSlot = null;

    if (typeof Image !== 'undefined') {
      PixelForge.ensureHeroLoaded?.('warrior_ex');
    }
  }

  setState(newState) {
    const prevState = this.state;
    super.setState(newState);

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
      this._skillSlashMask = 0;
      this._skillStartX = this.x;
      this.afterimageAccum = 0;
      this.isDeflecting = false;
    }

    if (newState === 'ULTIMATE') {
      this._ultInit = false;
      this._ultSlashStep = 0;
      this._ultDidPlunge = false;
      this.isInvulnerable = true;
      this.isOmnislashing = true;
    } else {
      this._ultInit = false;
      if (newState !== 'TRUE_ULTIMATE') {
        this.isOmnislashing = false;
      }
    }

    if (newState === 'TRUE_ULTIMATE') {
      this._trueUltInit = false;
      this._trueUltStage = 0;
      this._trueUltCageStep = 0;
      this.isInvulnerable = true;
      this.unstoppablePoise = true;
      this.isOmnislashing = true;
    } else {
      this._trueUltInit = false;
      this.justiceWingsActive = false;
      this.unstoppablePoise = false;
      if (newState !== 'ULTIMATE') {
        this.cameraAirLift = 0;
      }
    }

    if (newState === 'DEATH') {
      this.fx?.clear();
      this.haloFxSlot = null;
      this.justiceWingsActive = false;
      this.isOmnislashing = false;
      this.cameraAirLift = 0;
      this._overrideFrameIdx = null;
      this.trueUltFrameOverride = null;
      this.razorScars.length = 0;
      this.cathedralBeams.length = 0;
    }
  }

  _clampArenaX(xv, game) {
    const margin = 80;
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

  /**
   * Initializes one beat (`0..3`) of Aethelgard EX's 4-beat FFBE / Last Cloudia combo without returning to IDLE.
   * Computes exact grounded pre-snap lunge target into the `110..120px` Dawn-Breaker smear belly!
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
    this._comboPersistTimer = 0.72;
    this.unstoppablePoise = v >= 2;

    const startFrame = AUTO_SLICES_EX[v][0];
    this.trueUltFrameOverride = startFrame;
    this._overrideFrameIdx = startFrame;

    const enemy = this._currentEnemy || null;
    if (enemy && !enemy.isDead && !enemy.isDummyFocal) {
      this.facing = enemy.x >= this.x ? 1 : -1;
    }

    this._beatStartX = this.x;
    let desiredX = this.x + this.facing * (v === 0 ? 18 : v === 2 ? 16 : 10);

    if (enemy && !enemy.isDead) {
      const sweetDist = v === 2 ? 108 : 114;
      const idealStandX = enemy.x - this.facing * sweetDist;
      const rawDelta = (idealStandX - this.x) * this.facing;
      // Beat 1 closes gap up to +112px with a low sword-drag dash-step when out of melee range;
      // Subsequent beats step cleanly forward (0..42px) into the 108..120px smear belly without chest overlap!
      const maxForward = v === 0 ? 112 : v === 2 ? 44 : 32;
      const clampedForward = Math.max(0, Math.min(maxForward, rawDelta));
      desiredX = this.x + this.facing * clampedForward;
    }

    this._beatTargetX = this._clampArenaX(desiredX, game);
  }

  queueNextComboBeat() {
    this._queuedNextBeat = true;
  }

  spawnAfterimage(x, y, facing, row, col, maxLife = 0.22, tint = 'cyan') {
    if (this.afterimages.length >= 14) this.afterimages.shift();
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
      glowColor: opts.glowColor || 'cyan',
      foreground: opts.foreground !== false,
      followOwner: Boolean(opts.followOwner),
      offsetX: opts.offsetX || 0,
      offsetY: opts.offsetY || 0
    });
  }

  /**
   * Spawns a crisp integer-stepped pixel-art razor slash-scar (zero canvas rotation, zero smooth ellipses).
   */
  spawnRazorScar(cx, cy, dx, dy, maxLife = 0.22, isGold = false) {
    if (this.razorScars.length >= 18) this.razorScars.shift();
    this.razorScars.push({
      x0: Math.round(cx - dx * 0.5),
      y0: Math.round(cy - dy * 0.5),
      x1: Math.round(cx + dx * 0.5),
      y1: Math.round(cy + dy * 0.5),
      age: 0,
      maxLife,
      isGold
    });
  }

  spawnCathedralBeam(x, groundY, width = 88, maxLife = 0.52) {
    this.cathedralBeams.push({
      x: Math.round(x),
      groundY: Math.round(groundY),
      width,
      age: 0,
      maxLife
    });
  }

  spawnExviusFeathers(game, count = 28) {
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const camX = game?.renderer?.cameraX || 0;
    const minX = game?.isAdventureMode?.() ? Math.max(40, camX - 80) : 50;
    const spanX = game?.isAdventureMode?.() ? 1360 : Math.max(960, ww - 100);
    this.justiceFeatherTimer = 4.8;
    for (let i = 0; i < count; i++) {
      if (this.justiceFeathers.length >= 36) break;
      this.justiceFeathers.push({
        x: minX + Math.random() * spanX,
        y: this.groundY - 120 - Math.random() * 380,
        vx: (Math.random() - 0.5) * 28,
        vy: 38 + Math.random() * 36,
        swayAmp: 18 + Math.random() * 20,
        swayFreq: 2.2 + Math.random() * 1.8,
        phase: Math.random() * Math.PI * 2,
        age: 0,
        maxLife: 4.2 + Math.random() * 0.9,
        drawSize: 56 + Math.floor(Math.random() * 20),
        frameOffset: Math.floor(Math.random() * 30),
        flipX: Math.random() < 0.5,
        isGold: i % 3 === 0
      });
    }
  }

  /**
   * Collects all valid melee targets in range (single opponent + Tag VS active foes + Adventure Mode monster packs).
   */
  _gatherMeleeTargets(primaryEnemy, game, reachFront = 212, reachBack = 42) {
    const targets = [];
    const seen = new Set();
    const isAdv = Boolean(game?.isAdventureMode?.() && game?.adventure?.active);
    const myGy = this.groundY || this.y;

    const consider = (foe) => {
      if (!foe || foe === this || foe.isDead || foe.isBenched || seen.has(foe)) return;
      const relX = (foe.x - this.x) * this.facing;
      const hitPad = foe.isColossalBoss ? 78 : 0;
      if (relX < -reachBack - hitPad || relX > reachFront + hitPad) return;
      if (isAdv && !foe.isColossalBoss) {
        const foeGy = foe.groundY || foe.y;
        if (Math.abs(foeGy - myGy) > 64) return;
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
      for (let i = 0; i < game.adventure.enemies.length; i++) {
        consider(game.adventure.enemies[i]);
      }
    }
    if (isAdv && game.adventure.bossEntity) {
      consider(game.adventure.bossEntity);
    }
    return targets;
  }

  /**
   * Applies crunchy anime hit-stop (`_hitStopTimer`), `+-3px` target `_hitShakeTimer`, damage, and razor slash VFX!
   */
  _applyExviusStrike(primaryEnemy, game, cfg) {
    const {
      damage = 28,
      reachFront = 212,
      reachBack = 38,
      hitStop = 0.042,
      shakeDur = 0.055,
      knockX = 28,
      knockY = 0,
      isCrit = false,
      scarDx = 96,
      scarDy = 74,
      isGold = false,
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
      this.spawnRazorScar(hitX, hitY, this.facing * scarDx, scarDy, 0.22, isGold);
      this.spawnVfxAnim(4, hitX, hitY, 188, 188, 0.22, {
        flipX: this.facing < 0,
        glowColor: isGold ? 'gold' : 'cyan',
        foreground: true
      });
      this.fx?.burst(hitX, hitY, {
        count: isCrit ? 9 : 6,
        speedMin: 48,
        speedMax: 165,
        lifeMin: 0.12,
        lifeMax: 0.26,
        gravity: 40,
        colors: isGold
          ? ['#ffffff', '#fef08a', '#facc15', '#38bdf8']
          : ['#ffffff', '#bae6fd', '#38bdf8', '#facc15']
      });
      landedAny = true;
    }

    if (landedAny && hitStop > 0) {
      this._hitStopTimer = Math.max(this._hitStopTimer || 0, hitStop);
      game?.renderer?.triggerHitStop?.(hitStop * 0.65);
    }

    return landedAny;
  }

  fireDawnBladeWave(game, opts = {}) {
    if (!game?.vfx) return;
    const dir = this.facing;
    const spawnX = opts.x ?? this.x + dir * 88;
    const spawnY = opts.y ?? this.y - 78;
    const dmg = opts.damage ?? 28;
    game.vfx.spawnProjectile({
      x: spawnX,
      y: spawnY,
      vx: dir * (opts.speed ?? 660),
      vy: 0,
      radius: opts.radius ?? 22,
      damage: dmg,
      owner: this,
      color: '#38bdf8',
      coreColor: '#fef08a',
      type: 'blade_wave',
      pierce: opts.pierce !== false,
      isUltimate: Boolean(opts.isUltimate),
      maxRange: opts.maxRange ?? 430
    });
    this.spawnVfxAnim(0, spawnX, spawnY, 196, 196, 0.26, {
      vx: dir * 280,
      flipX: dir < 0,
      glowColor: opts.isGold ? 'gold' : 'cyan',
      foreground: true
    });
  }

  onProjectileTrail(proj, _game) {
    if (!this.fx || !proj) return;
    proj._trailAcc = (proj._trailAcc || 0) + 0.016;
    if (proj._trailAcc >= 0.044) {
      proj._trailAcc = 0;
      const dir = Math.sign(proj.vx || this.facing || 1);
      this.fx.burst(proj.x - dir * 14, proj.y, {
        count: proj.isUltimate ? 4 : 3,
        speedMin: 24,
        speedMax: 80,
        lifeMin: 0.12,
        lifeMax: 0.24,
        gravity: -16,
        colors: ['#ffffff', '#bae6fd', '#38bdf8', '#facc15']
      });
    }
  }

  onStartDash(enemy, game, dir) {
    this.dashDuration = 0.36;
    this.dashDir = dir || this.facing;
    if (game?.audio) game.audio.play('dash_whoosh', this.x);
    this.fx?.spawn('blinkTeleportPillar', this.x, this.groundY - 4, {
      flip: this.dashDir < 0,
      light: 1.2
    });
    game?.vfx?.spawnShockwave(this.x, this.groundY - 6, 62, '#38bdf8', 0.22, false, true);
    if (enemy && !enemy.isDead) {
      const targetStandX = enemy.x - this.dashDir * 114;
      this._dashStopX = this._clampArenaX(targetStandX, game);
    } else {
      this._dashStopX = null;
    }
  }

  updateDash(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.dashDuration || 0.36;
    const dir = this.dashDir || this.facing;
    this.vy = 0;
    this.y = this.groundY;

    // Low anime sword-drag vanguard sprint that brakes crisply at the 114px Dawn-Breaker sweet-spot!
    if (t < dur * 0.78) {
      const distToEnemy = enemy && !enemy.isDead ? (enemy.x - this.x) * dir : 999;
      if (distToEnemy <= 116 && distToEnemy >= 70) {
        this.vx = 0;
      } else {
        this.vx = dir * 640;
      }
      this._dragSparkAcc += dt;
      if (this._dragSparkAcc >= 0.035) {
        this._dragSparkAcc = 0;
        this.spawnAfterimage(this.x, this.y, this.facing, 6, Math.min(24, Math.floor((t / dur) * 30)), 0.18);
        this.fx?.burst(this.x - dir * 42, this.groundY - 3, {
          count: 4,
          speedMin: 36,
          speedMax: 112,
          lifeMin: 0.12,
          lifeMax: 0.24,
          gravity: 85,
          colors: ['#ffffff', '#fef08a', '#facc15', '#38bdf8']
        });
      }
    } else {
      this.vx = 0;
    }

    if (t >= dur) {
      this.vx = 0;
      this.setState('IDLE');
    }
  }

  startCrouch(_enemy, game) {
    this.crouchCooldown = 3.2;
    this.dodgeCooldown = Math.max(this.dodgeCooldown, 1.4);
    this.isCrouching = true;
    this.isDeflecting = true;
    this.didSecondaryAction = false;
    this.vx = 0;
    this.setState('CROUCH');
    if (game?.audio) game.audio.play('parry_clang', this.x);
    this.spawnVfxAnim(1, this.x + this.facing * 24, this.y - 84, 184, 184, 0.36, {
      flipX: this.facing < 0,
      glowColor: 'gold',
      foreground: true,
      followOwner: true,
      offsetX: 24,
      offsetY: -84
    });
  }

  updateCrouch(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.crouchDuration || 0.92;
    this.vx = 0;
    this.isCrouching = true;
    this.isDeflecting = t < 0.56;

    // Reflect incoming enemy projectiles off the 2H Dawn-Breaker Greatsword crossguard!
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
          proj.vx = -proj.vx * 1.25;
          proj.color = '#38bdf8';
          proj.coreColor = '#fef08a';
          if (game?.audio) game.audio.play('clang', proj.x);
          this.gainMana(14);
          this.gainFinisher(8);
          this.fx?.burst(proj.x, proj.y, {
            count: 8,
            speedMin: 55,
            speedMax: 160,
            lifeMin: 0.14,
            lifeMax: 0.28,
            gravity: 25,
            colors: ['#ffffff', '#fef08a', '#38bdf8']
          });
        }
      }
    }

    // Explosive Exvius Smear Counter-Riposte at t = 0.50s
    if (!this.didSecondaryAction && t >= 0.50) {
      this.didSecondaryAction = true;
      this.isDeflecting = false;
      const spawnX = this.x + this.facing * 78;
      const spawnY = this.y - 84;
      this.fx?.spawn('runebladeCrescentSlash', spawnX, spawnY, {
        flip: this.facing < 0,
        light: 1.32,
        extra: { radius: 34, width: 12, isGold: true }
      });
      this.fireDawnBladeWave(game, {
        x: spawnX,
        y: spawnY,
        damage: 34,
        speed: 690,
        maxRange: 480,
        isGold: true
      });
      this._applyExviusStrike(enemy, game, {
        damage: 44,
        reachFront: 215,
        hitStop: 0.045,
        shakeDur: 0.06,
        knockX: 95,
        knockY: -65,
        isCrit: true,
        scarDx: 112,
        scarDy: -64,
        isGold: true,
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
    const dir = dirOverride || this.facing;
    this.facing = dir;
    this.vaultCooldown = 2.8;
    this.dodgeCooldown = Math.max(this.dodgeCooldown, 1.5);
    this.dashDuration = 0.54;
    this.isFlipVault = true;
    this.isInvulnerable = true;
    this.didSecondaryAction = false;
    this.flipStartX = this.x;

    let desiredX = this.x + dir * 195;
    if (enemy && !enemy.isDead && dir === (enemy.x >= this.x ? 1 : -1)) {
      desiredX = enemy.x - dir * 114;
    }
    this.flipTargetX = this._clampArenaX(desiredX, game);
    this.vx = 0;
    this.vy = 0;
    this.setState('JUMP');
    if (game?.audio) game.audio.play('storm_leap', this.x);
    game?.vfx?.spawnShockwave(this.x, this.groundY - 4, 58, '#7dd3fc', 0.22, false, true);
  }

  updateJump(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.dashDuration || 0.54;
    const u = Math.min(1, Math.max(0, t / dur));

    this.x = this.flipStartX + (this.flipTargetX - this.flipStartX) * (1 - Math.pow(1 - u, 1.8));
    this.y = this.groundY - Math.sin(u * Math.PI) * 112;
    this.isInvulnerable = u < 0.65;

    this.afterimageAccum += dt;
    if (this.afterimageAccum >= 0.055 && u < 0.82) {
      this.afterimageAccum = 0;
      this.spawnAfterimage(this.x, this.y, this.facing, 8, Math.min(28, Math.floor(u * 30)), 0.20);
    }

    // Mid-air Dawn-Breaker downward cleave at apex -> descent (u >= 0.54)
    if (!this.didSecondaryAction && u >= 0.54) {
      this.didSecondaryAction = true;
      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }
      this.fx?.spawn('runebladeCrescentSlash', this.x + this.facing * 56, this.y - 68, {
        flip: this.facing < 0,
        light: 1.28,
        extra: { radius: 34, width: 11.5, isGold: false }
      });
      this.fireDawnBladeWave(game, {
        x: this.x + this.facing * 68,
        y: Math.min(this.groundY - 68, this.y - 44),
        damage: 30,
        speed: 650,
        maxRange: 380
      });
      this._applyExviusStrike(enemy, game, {
        damage: 36,
        reachFront: 210,
        hitStop: 0.042,
        shakeDur: 0.055,
        knockX: 64,
        knockY: -45,
        scarDx: 102,
        scarDy: 88,
        sfx: 'heavy_cleave'
      });
    }

    if (u >= 1) {
      this.y = this.groundY;
      this.vx = 0;
      this.vy = 0;
      this.isFlipVault = false;
      this.isInvulnerable = false;
      game?.vfx?.spawnShockwave(this.x, this.groundY - 4, 64, '#38bdf8', 0.22, false, true);
      this.setState('IDLE');
    }
  }

  updateDodge(dt, enemy, game) {
    this.updateJump(dt, enemy, game);
  }

  updateDashOrDodge(dt, enemy, game) {
    if (this.state === 'DASH') {
      this.updateDash(dt, enemy, game);
    } else {
      this.updateJump(dt, enemy, game);
    }
  }

  /**
   * 4-Beat Escalating FFBE / Last Cloudia Hack-and-Slash Combo (`[[60,8],[68,7],[75,8],[83,7]]`):
   * - Grounded Pre-Snap Impulse -> Hard-Locked Boots (`vx = 0`) right on the 1-frame smear snap!
   * - `0.015s` intra-combo link holding the beat end-pose frame with ZERO return to `IDLE`!
   * - Crunchy `_hitStopTimer` (`42ms`, `42ms`, `32ms+38ms`, `58ms`) + `+-3px` target `_hitShakeTimer`!
   */
  updateAutoAttack(dt, enemy, game) {
    this._currentEnemy = enemy;
    this._comboPersistTimer = 0.72;

    // 0.015s Zero-Idle Intra-Combo Link: holds end-pose frame of previous beat before snapping into next beat!
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

    //Snap times aligned to exact art keyposes: V0->F03(0.10s), V1->F09(0.06s), V2->F17(0.08s), V3->F25(0.16s)
    const snapT = v === 0 ? 0.10 : v === 1 ? 0.06 : v === 2 ? 0.08 : 0.16;

    // Exact frame timeline mapping so the 1-frame smear snap lands cleanly at `snapT` and holds during hit-stop!
    let localStep = 0;
    if (v === 0) {
      // 8 frames (60..67): 60..62 pre-snap coil (0..0.10s), 63 SNAP (0.10..0.15s), 64..65 erosion (0.15..0.24s), 66..67 hold
      if (t < 0.10) localStep = Math.min(2, Math.floor((t / 0.10) * 3));
      else if (t < 0.15) localStep = 3;
      else if (t < 0.25) localStep = 4 + Math.min(1, Math.floor(((t - 0.15) / 0.10) * 2));
      else localStep = 6 + Math.min(1, Math.floor(((t - 0.25) / 0.11) * 2));
    } else if (v === 1) {
      // 7 frames (68..74): 68 micro-torque (0..0.06s), 69 REVERSE SNAP (0.06..0.115s), 70..71 erosion, 72..74 high guard
      if (t < 0.06) localStep = 0;
      else if (t < 0.115) localStep = 1;
      else if (t < 0.21) localStep = 2 + Math.min(1, Math.floor(((t - 0.115) / 0.095) * 2));
      else localStep = 4 + Math.min(2, Math.floor(((t - 0.21) / 0.13) * 3));
    } else if (v === 2) {
      // 8 frames (75..82): 75..76 coil (0..0.08s), 77 SNAP-1 (0.08..0.14s), 78 SNAP-2 (0.14..0.195s), 79..82 erosion & crouch coil
      if (t < 0.08) localStep = Math.min(1, Math.floor((t / 0.08) * 2));
      else if (t < 0.14) localStep = 2;
      else if (t < 0.195) localStep = 3;
      else localStep = 4 + Math.min(3, Math.floor(((t - 0.195) / 0.185) * 4));
    } else {
      // 7 frames (83..89): 83..84 airborne hoist (0..0.16s), 85 GUILLOTINE SLAM SNAP (0.16..0.24s), 86..89 shock-peel & rise
      if (t < 0.16) localStep = Math.min(1, Math.floor((t / 0.16) * 2));
      else if (t < 0.24) localStep = 2;
      else localStep = 3 + Math.min(3, Math.floor(((t - 0.24) / 0.28) * 4));
    }
    const frameIdx = sliceStart + Math.min(sliceLen - 1, Math.max(0, localStep));
    this.trueUltFrameOverride = frameIdx;
    this._overrideFrameIdx = frameIdx;

    // 1. Grounded Impulse-Then-Plant Footwork (Zero Ice-Skating!)
    this.vx = 0;
    if (t < snapT) {
      const lungeU = Math.min(1, Math.max(0, t / snapT));
      const eased = 1 - Math.pow(1 - lungeU, 2.2);
      this.x = this._beatStartX + (this._beatTargetX - this._beatStartX) * eased;

      // Low sword-drag floor sparks when Beat 1 closes gap (> 26px dash-step)
      if (v === 0 && Math.abs(this._beatTargetX - this._beatStartX) > 26) {
        this._dragSparkAcc += dt;
        if (this._dragSparkAcc >= 0.032) {
          this._dragSparkAcc = 0;
          this.spawnAfterimage(this.x, this.y, this.facing, 2, localStep, 0.16);
          this.fx?.burst(this.x - this.facing * 36, this.groundY - 2, {
            count: 4,
            speedMin: 34,
            speedMax: 95,
            lifeMin: 0.10,
            lifeMax: 0.22,
            gravity: 75,
            colors: ['#ffffff', '#fef08a', '#38bdf8']
          });
        }
      }
    } else if (!this._bootsPlanted) {
      // HARD-LOCK boots right on the 1-frame smear snap!
      this._bootsPlanted = true;
      this.x = this._beatTargetX;
      this.vx = 0;
    }

    // Airborne hoist arc on Beat 4 (V3: leaps skyward F23..F24, slams hard onto groundY right at F25 t = 0.16s!)
    if (v === 3) {
      if (t < 0.16) {
        const airU = t / 0.16;
        const liftCurve = Math.sin(airU * Math.PI * 0.86);
        this.y = this.groundY - liftCurve * 64;
        this.vy = 0;
      } else {
        this.y = this.groundY;
        this.vy = 0;
      }
    } else {
      this.y = this.groundY;
      this.vy = 0;
    }

    // 2. Beat-Specific Smear Snap Impacts, Hit-Stop & Cascading Multi-Tick Bite
    if (v === 0) {
      // Beat 1 (V0): Coiled Downward Dawn-Cleave at F03 (t = 0.10s) -> 42ms hit-stop + diagonal razor scar + dust puff!
      if ((this._beatHitMask & 1) === 0 && t >= 0.10) {
        this._beatHitMask |= 1;
        game?.vfx?.spawnShockwave(this.x + this.facing * 42, this.groundY - 4, 56, '#7dd3fc', 0.20, false, true);
        this.fx?.burst(this.x + this.facing * 28, this.groundY - 2, {
          count: 6,
          speedMin: 35,
          speedMax: 110,
          lifeMin: 0.14,
          lifeMax: 0.26,
          gravity: 55,
          colors: ['#e0f2fe', '#7dd3fc', '#fde047']
        });
        this.fx?.spawn('runebladeCrescentSlash', this.x + this.facing * 68, this.y - 84, {
          flip: this.facing < 0,
          light: 1.24,
          extra: { radius: 34, width: 11, isGold: false }
        });
        this._applyExviusStrike(enemy, game, {
          damage: 28,
          reachFront: 214,
          hitStop: 0.042,
          shakeDur: 0.055,
          knockX: 24,
          knockY: 0,
          scarDx: 108,
          scarDy: 86,
          isGold: false,
          sfx: 'slash'
        });
      }
    } else if (v === 1) {
      // Beat 2 (V1): Instant Reverse Rising Heaven-Slash at F09 (t = 0.06s) -> 42ms hit-stop + rising golden-cyan shockwave + enemy pop!
      if ((this._beatHitMask & 1) === 0 && t >= 0.06) {
        this._beatHitMask |= 1;
        const waveX = this.x + this.facing * 76;
        game?.vfx?.spawnShockwave(waveX, this.groundY - 8, 68, '#fde047', 0.22, false, true);
        this.fx?.spawn('runebladeCrescentSlash', waveX, this.y - 96, {
          flip: this.facing < 0,
          palette: RUNIC_GOLD_PALETTE,
          light: 1.28,
          extra: { radius: 36, width: 11.5, isGold: true }
        });
        this.spawnVfxAnim(2, waveX, this.groundY - 68, 176, 176, 0.28, {
          flipX: this.facing < 0,
          glowColor: 'gold',
          foreground: false
        });
        this._applyExviusStrike(enemy, game, {
          damage: 30,
          reachFront: 216,
          hitStop: 0.042,
          shakeDur: 0.058,
          knockX: 22,
          knockY: -138,
          scarDx: 106,
          scarDy: -92,
          isGold: true,
          sfx: 'slash'
        });
      }
    } else if (v === 2) {
      // Beat 3 (V2): Last Cloudia Spinning Vortex Cross-Rip -> 2-Hit Rapid Cross-Slice (t = 0.08s & t = 0.14s)!
      if ((this._beatHitMask & 1) === 0 && t >= 0.08) {
        this._beatHitMask |= 1;
        this.fx?.spawn('runebladeCrescentSlash', this.x + this.facing * 70, this.y - 86, {
          flip: this.facing < 0,
          light: 1.24,
          extra: { radius: 34, width: 10.5, eccentricity: 0.34, isGold: false }
        });
        this._applyExviusStrike(enemy, game, {
          damage: 19,
          reachFront: 214,
          hitStop: 0.032,
          shakeDur: 0.046,
          knockX: 14,
          knockY: -22,
          scarDx: 112,
          scarDy: 34,
          isGold: false,
          sfx: 'slash'
        });
      }
      if ((this._beatHitMask & 2) === 0 && t >= 0.14) {
        this._beatHitMask |= 2;
        this.fx?.spawn('runebladeCrescentSlash', this.x + this.facing * 74, this.y - 90, {
          flip: this.facing > 0,
          palette: RUNIC_GOLD_PALETTE,
          light: 1.28,
          extra: { radius: 35, width: 11, eccentricity: 0.34, isGold: true }
        });
        this._applyExviusStrike(enemy, game, {
          damage: 22,
          reachFront: 216,
          hitStop: 0.038,
          shakeDur: 0.052,
          knockX: 18,
          knockY: -36,
          scarDx: 112,
          scarDy: -42,
          isGold: true,
          sfx: 'clang'
        });
      }
    } else {
      // Beat 4 (V3): Airborne Heavensplitter Execution at F25 (t = 0.16s) -> 58ms heavy hit-stop + 3 cascading ticks + piercing blade_wave!
      if ((this._beatHitMask & 1) === 0 && t >= 0.16) {
        this._beatHitMask |= 1;
        const slamX = this.x + this.facing * 82;
        game?.renderer?.triggerShake?.(13, 0.26);
        if (game?.audio) game.audio.play('thunder_slam', slamX);
        game?.vfx?.spawnShockwave(slamX, this.groundY - 4, 96, '#fde047', 0.28, false, true);
        this.fx?.spawn('earthshatterJudgmentWave', slamX, this.groundY - 2, {
          flip: this.facing < 0,
          light: 1.36,
          extra: { isUltimate: false }
        });
        this.fx?.spawn('runebladeCrescentSlash', slamX, this.groundY - 88, {
          flip: this.facing < 0,
          palette: RUNIC_GOLD_PALETTE,
          light: 1.38,
          extra: { radius: 36, width: 13, isGold: true, groundWrap: true }
        });
        this.spawnVfxAnim(2, slamX, this.groundY - 76, 224, 224, 0.38, {
          flipX: this.facing < 0,
          glowColor: 'gold',
          foreground: false
        });
        this._applyExviusStrike(enemy, game, {
          damage: 24,
          reachFront: 222,
          hitStop: 0.058,
          shakeDur: 0.082,
          knockX: 36,
          knockY: -45,
          isCrit: true,
          scarDx: 24,
          scarDy: 136,
          isGold: true,
          sfx: 'heavy_cleave'
        });
        this.fireDawnBladeWave(game, {
          x: slamX,
          y: this.groundY - 76,
          damage: 26,
          speed: 680,
          maxRange: 430,
          pierce: true,
          isGold: true
        });
      }
      // Cascading Dawn-Breaker aftershock ticks 2 & 3 (t = 0.21s & t = 0.26s)
      if ((this._beatHitMask & 2) === 0 && t >= 0.21) {
        this._beatHitMask |= 2;
        this._applyExviusStrike(enemy, game, {
          damage: 16,
          reachFront: 224,
          hitStop: 0,
          shakeDur: 0.045,
          knockX: 28,
          knockY: -35,
          scarDx: 92,
          scarDy: 78,
          isGold: false,
          sfx: 'clang'
        });
      }
      if ((this._beatHitMask & 4) === 0 && t >= 0.26) {
        this._beatHitMask |= 4;
        this._applyExviusStrike(enemy, game, {
          damage: 22,
          reachFront: 226,
          hitStop: 0,
          shakeDur: 0.055,
          knockX: 92,
          knockY: -88,
          isCrit: true,
          scarDx: 98,
          scarDy: -84,
          isGold: true,
          sfx: 'slash'
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
        Math.abs(enemy.x - this.x) <= 245;

      // Chain V0 -> V1 -> V2 -> V3 directly inside AUTO_ATTACK without touching Row 0 IDLE!
      if (v < 3 && (aiWantsChain || advHoldingAttack)) {
        if (game?.adventure?.queuedAction === 'attack') {
          game.adventure.queuedAction = null;
        }
        this._intraLinkTimer = INTRA_COMBO_LINK;
        return;
      }

      // If player holds Attack past Beat 4 in Adventure Mode, loop cleanly into a fresh 4-beat string after brief 0.06s breath
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
   * SPECIAL SKILL (`4.6s CD`, `1.02s`, Row 3 `90..119`):
   * `ASTRAL BLADE-RUSH` — Rapid 3-slash advancing FFBE chain-flurry ending in a rising Dragon-Fang uppercut pillar!
   */
  updateSkill(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.skillDuration || 1.02;
    this.unstoppablePoise = true;
    this.isDeflecting = t < 0.56;

    // Deflect projectiles during advancing rush
    if (this.isDeflecting && game?.vfx?.projectiles) {
      for (const proj of game.vfx.projectiles) {
        if (
          proj.owner !== this &&
          !proj._reflectedByExSkill &&
          Math.abs(proj.x - this.x) < 88 &&
          Math.abs(proj.y - (this.y - 80)) < 88
        ) {
          proj._reflectedByExSkill = true;
          proj.owner = this;
          proj.vx = -proj.vx * 1.15;
          if (game?.audio) game.audio.play('clang', proj.x);
        }
      }
    }

    // Advancing 3-slash blitz bursts (0.04..0.52s) that plant right at 110px sweet-spot!
    if (t < 0.54) {
      const dist = enemy && !enemy.isDead ? (enemy.x - this.x) * this.facing : 150;
      const inBurstWindow =
        (t >= 0.04 && t < 0.13) || (t >= 0.20 && t < 0.29) || (t >= 0.36 && t < 0.45);
      if (inBurstWindow && dist > 108) {
        this.vx = this.facing * Math.min(560, (dist - 104) * 9.5 + 220);
      } else {
        this.vx = 0;
      }
      this.afterimageAccum += dt;
      if (this.afterimageAccum >= 0.042) {
        this.afterimageAccum = 0;
        const col = Math.min(18, Math.floor((t / dur) * 30));
        this.spawnAfterimage(this.x, this.y, this.facing, 3, col, 0.22);
      }
    } else {
      this.vx = 0;
    }

    // Slash 1 (t = 0.14s): Advancing Astral Diagonal Cut
    if ((this._skillSlashMask & 1) === 0 && t >= 0.14) {
      this._skillSlashMask |= 1;
      this.vx = 0;
      this.fx?.spawn('runebladeCrescentSlash', this.x + this.facing * 72, this.y - 86, {
        flip: this.facing < 0,
        light: 1.28,
        extra: { radius: 34, width: 11.5, isGold: false }
      });
      this._applyExviusStrike(enemy, game, {
        damage: 24,
        reachFront: 218,
        hitStop: 0.032,
        shakeDur: 0.048,
        knockX: 22,
        knockY: -18,
        scarDx: 114,
        scarDy: 82,
        isGold: false,
        sfx: 'slash'
      });
    }

    // Slash 2 (t = 0.30s): Reverse Golden Cross-Blitz
    if ((this._skillSlashMask & 2) === 0 && t >= 0.30) {
      this._skillSlashMask |= 2;
      this.vx = 0;
      this.fx?.spawn('runebladeCrescentSlash', this.x + this.facing * 76, this.y - 90, {
        flip: this.facing > 0,
        palette: RUNIC_GOLD_PALETTE,
        light: 1.30,
        extra: { radius: 35, width: 11.5, isGold: true }
      });
      this._applyExviusStrike(enemy, game, {
        damage: 26,
        reachFront: 220,
        hitStop: 0.032,
        shakeDur: 0.048,
        knockX: 22,
        knockY: -28,
        scarDx: 114,
        scarDy: -84,
        isGold: true,
        sfx: 'clang'
      });
    }

    // Slash 3 (t = 0.46s): Deep Spinning Vortex Cleave
    if ((this._skillSlashMask & 4) === 0 && t >= 0.46) {
      this._skillSlashMask |= 4;
      this.vx = 0;
      this.fx?.spawn('tempestCycloneRing', this.x + this.facing * 42, this.y - 72, {
        flip: this.facing < 0,
        light: 1.28
      });
      this._applyExviusStrike(enemy, game, {
        damage: 28,
        reachFront: 222,
        hitStop: 0.036,
        shakeDur: 0.052,
        knockX: 16,
        knockY: -55,
        scarDx: 120,
        scarDy: 26,
        isGold: false,
        sfx: 'slash'
      });
    }

    // Finisher (t = 0.68s): Rising Dragon-Fang Uppercut Pillar + Piercing Dawn-Breaker Wave!
    if (t >= 0.58 && t < 0.84) {
      const hopU = (t - 0.58) / 0.26;
      this.y = this.groundY - Math.sin(hopU * Math.PI) * 52;
    } else {
      this.y = this.groundY;
    }

    if ((this._skillSlashMask & 8) === 0 && t >= 0.68) {
      this._skillSlashMask |= 8;
      const pillarX = this.x + this.facing * 86;
      game?.renderer?.triggerShake?.(14, 0.28);
      if (game?.audio) game.audio.play('thunder_slam', pillarX);
      this.fx?.spawn('skyJudgmentPillar', pillarX, this.groundY - 2, {
        flip: this.facing < 0,
        light: 1.38
      });
      this.fx?.spawn('earthshatterJudgmentWave', pillarX, this.groundY - 2, {
        flip: this.facing < 0,
        light: 1.34,
        extra: { isUltimate: false }
      });
      this.spawnVfxAnim(2, pillarX, this.groundY - 82, 232, 232, 0.40, {
        flipX: this.facing < 0,
        glowColor: 'gold',
        foreground: true
      });
      this._applyExviusStrike(enemy, game, {
        damage: 46,
        reachFront: 232,
        hitStop: 0.052,
        shakeDur: 0.075,
        knockX: 118,
        knockY: -165,
        isCrit: true,
        scarDx: 32,
        scarDy: -142,
        isGold: true,
        sfx: 'heavy_cleave'
      });
      this.fireDawnBladeWave(game, {
        x: pillarX,
        y: this.groundY - 78,
        damage: 28,
        speed: 700,
        maxRange: 460,
        isGold: true
      });
    }

    if (t >= dur) {
      this.y = this.groundY;
      this.vx = 0;
      this.isDeflecting = false;
      this.unstoppablePoise = false;
      this.setState('IDLE');
    }
  }

  /**
   * OVERDRIVE (`1.92s`, Row 4 `120..149`):
   * `RADIANT OMNISLASH` — 5 rapid multi-angle teleporting slash-smear cuts leaving golden-cyan silhouettes into a skyward plunge!
   */
  updateUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.ultDuration || 1.92;
    this.isInvulnerable = true;
    this.isOmnislashing = true;
    this.vx = 0;
    this.vy = 0;

    if (!this._ultInit) {
      this._ultInit = true;
      this._ultSlashStep = 0;
      this._ultDidPlunge = false;
      this._ultTargetX =
        enemy && !enemy.isDead
          ? enemy.x
          : this._clampArenaX(this.x + this.facing * 180, game);
      if (game?.audio) game.audio.play('ult_cast', this.x);
      this.fx?.spawn('blinkTeleportPillar', this.x, this.groundY - 4, {
        flip: this.facing < 0,
        light: 1.35
      });
      this.spawnVfxAnim(3, this._ultTargetX, this.groundY - 18, 240, 120, 0.55, {
        flipX: false,
        glowColor: 'gold',
        foreground: false
      });
    }

    if (enemy && !enemy.isDead) {
      this._ultTargetX = enemy.x;
    }
    const tx = this._ultTargetX;

    // 5-Fold Multi-Angle Teleporting Omnislash Cuts (t = 0.20, 0.44, 0.68, 0.92, 1.16s)
    const cutSchedule = [
      { time: 0.20, ox: -116, oy: 0, face: 1, frame: 126, dx: 132, dy: 84, gold: false },
      { time: 0.44, ox: 116, oy: -28, face: -1, frame: 130, dx: -132, dy: -88, gold: true },
      { time: 0.68, ox: -108, oy: -54, face: 1, frame: 134, dx: 136, dy: -46, gold: false },
      { time: 0.92, ox: 112, oy: -18, face: -1, frame: 138, dx: -136, dy: 92, gold: true },
      { time: 1.16, ox: 0, oy: -148, face: this.facing, frame: 142, dx: 42, dy: 148, gold: true }
    ];

    while (this._ultSlashStep < 5 && t >= cutSchedule[this._ultSlashStep].time) {
      const cut = cutSchedule[this._ultSlashStep];
      this._ultSlashStep++;
      // Leave luminous golden-cyan silhouette at departure point
      this.spawnAfterimage(
        this.x,
        this.y,
        this.facing,
        4,
        (cut.frame - 120 + 28) % 30,
        0.34,
        cut.gold ? 'gold' : 'cyan'
      );

      this.x = this._clampArenaX(tx + cut.ox, game);
      this.y = this.groundY + cut.oy;
      this.facing = cut.face;
      this.trueUltFrameOverride = cut.frame;
      this._overrideFrameIdx = cut.frame;

      this.spawnAfterimage(
        this.x,
        this.y,
        this.facing,
        4,
        cut.frame - 120,
        0.32,
        cut.gold ? 'gold' : 'cyan'
      );
      this.fx?.spawn('runebladeCrescentSlash', tx, this.groundY - 92, {
        flip: cut.face < 0,
        palette: cut.gold ? RUNIC_GOLD_PALETTE : RUNIC_CYAN_PALETTE,
        light: 1.34,
        extra: { radius: 38, width: 12, isGold: cut.gold }
      });
      this.spawnVfxAnim(4, tx, this.groundY - 92, 208, 208, 0.26, {
        flipX: cut.face < 0,
        glowColor: cut.gold ? 'gold' : 'cyan',
        foreground: true
      });
      this._applyExviusStrike(enemy, game, {
        damage: 30,
        reachFront: 245,
        reachBack: 145,
        hitStop: 0.028,
        shakeDur: 0.052,
        knockX: 8,
        knockY: -32,
        isCrit: cut.gold,
        scarDx: cut.dx,
        scarDy: cut.dy,
        isGold: cut.gold,
        sfx: 'slash'
      });
    }

    // Stage 6 (1.28..1.52s): High-sky hover above target -> Supersonic Dawn-Breaker Plunge at t = 1.52s!
    if (t >= 1.28 && t < 1.52) {
      const hoverU = (t - 1.28) / 0.24;
      this.x = this._clampArenaX(tx - this.facing * 52, game);
      this.y = this.groundY - 165 * (1 - Math.pow(hoverU, 2.4));
      this.cameraAirLift = Math.max(0, (this.groundY - this.y) * 0.45);
      this.trueUltFrameOverride = 143;
      this._overrideFrameIdx = 143;
      this.afterimageAccum += dt;
      if (this.afterimageAccum >= 0.04) {
        this.afterimageAccum = 0;
        this.spawnAfterimage(this.x, this.y, this.facing, 4, 23, 0.26, 'gold');
      }
    } else if (t >= 1.52) {
      this.y = this.groundY;
      this.cameraAirLift = 0;
      const finCol = 24 + Math.min(5, Math.floor(((t - 1.52) / 0.40) * 6));
      this.trueUltFrameOverride = 120 + finCol;
      this._overrideFrameIdx = 120 + finCol;

      if (!this._ultDidPlunge) {
        this._ultDidPlunge = true;
        const impactX = this._clampArenaX(tx, game);
        if (game?.audio) game.audio.play('thunder_slam', impactX);
        game?.renderer?.triggerShake?.(18, 0.36);
        game?.vfx?.spawnShockwave(impactX, this.groundY - 4, 138, '#fde047', 0.34, true, true);
        this.fx?.spawn('skyJudgmentPillar', impactX, this.groundY - 2, {
          flip: this.facing < 0,
          light: 1.45
        });
        this.fx?.spawn('earthshatterJudgmentWave', impactX, this.groundY - 2, {
          flip: this.facing < 0,
          light: 1.42,
          extra: { isUltimate: true }
        });
        this.spawnCathedralBeam(impactX, this.groundY, 68, 0.38);
        this._applyExviusStrike(enemy, game, {
          damage: 78,
          reachFront: 265,
          reachBack: 150,
          hitStop: 0.056,
          shakeDur: 0.09,
          knockX: 145,
          knockY: -175,
          isCrit: true,
          scarDx: 28,
          scarDy: 168,
          isGold: true,
          sfx: 'heavy_cleave'
        });
        this.fireDawnBladeWave(game, {
          x: impactX,
          y: this.groundY - 80,
          damage: 38,
          speed: 740,
          maxRange: 540,
          isUltimate: true,
          isGold: true
        });
      }
    }

    if (t >= dur) {
      this.y = this.groundY;
      this.cameraAirLift = 0;
      this.isInvulnerable = false;
      this.isOmnislashing = false;
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      this.setState('IDLE');
    }
  }

  /**
   * SUPREME FINISHER (`4.35s`):
   * `EXVIUS DAWN: SOVEREIGN OF LIGHT`
   * - Phase 1 (`0.00..1.25s`): Neo-Vision Blade Consecration (NO stage background replacement!)
   * - Phase 2 (`1.25..2.60s`): 6-Slash Celestial Smear Cage boxing the target in golden-cyan light!
   * - Phase 3 (`2.60..3.42s`): High-Sky Seraphic Winged Ascent (`cameraAirLift`) & Sovereign Lock-On!
   * - Phase 4 (`3.42..4.35s`): Colossal Dawn-Breaker Cathedral Beam-Cleave + 4.8s Seraphim Feathers!
   */
  updateTrueUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.trueUltDuration || 4.35;
    this.isInvulnerable = true;
    this.unstoppablePoise = true;
    this.isOmnislashing = true;
    this.vx = 0;
    this.vy = 0;

    if (!this._trueUltInit) {
      this._trueUltInit = true;
      this._trueUltStage = 1;
      this._trueUltCageStep = 0;
      this._ultTargetX =
        enemy && !enemy.isDead
          ? enemy.x
          : this._clampArenaX(this.x + this.facing * 200, game);
      if (game?.audio) game.audio.play('ult_cast', this.x);
      this.fx?.spawn('celestialCathedralConsecration', this.x, this.groundY - 4, {
        flip: this.facing < 0,
        light: 1.45
      });
      this.spawnVfxAnim(3, this.x, this.groundY - 18, 256, 128, 1.15, {
        flipX: false,
        glowColor: 'gold',
        foreground: false
      });
    }

    if (enemy && !enemy.isDead) {
      this._ultTargetX = enemy.x;
    }
    const tx = this._ultTargetX;

    // Phase 1 (0.00..1.25s): Solemn Neo-Vision Blade Consecration
    if (t < 1.25) {
      const vowFrame = 120 + Math.min(5, Math.floor((t / 1.25) * 6));
      this.trueUltFrameOverride = vowFrame;
      this._overrideFrameIdx = vowFrame;
      this.justiceWingsActive = t >= 0.45;
      this.justiceWingSpread = Math.min(1, Math.max(0, (t - 0.45) / 0.65));
      return;
    }

    // Phase 2 (1.25..2.60s): 6-Slash Celestial Smear Cage
    if (t < 2.60) {
      this.justiceWingsActive = true;
      this.justiceWingSpread = 1.0;
      const cageCuts = [
        { time: 1.30, ox: -124, oy: 0, face: 1, frame: 63, dx: 152, dy: 96, gold: false },
        { time: 1.50, ox: 124, oy: -24, face: -1, frame: 69, dx: -152, dy: -96, gold: true },
        { time: 1.70, ox: -116, oy: -58, face: 1, frame: 77, dx: 158, dy: 24, gold: false },
        { time: 1.90, ox: 116, oy: -58, face: -1, frame: 78, dx: -158, dy: -24, gold: true },
        { time: 2.10, ox: -92, oy: -96, face: 1, frame: 134, dx: 138, dy: -118, gold: false },
        { time: 2.30, ox: 92, oy: -96, face: -1, frame: 138, dx: -138, dy: 118, gold: true }
      ];

      while (this._trueUltCageStep < 6 && t >= cageCuts[this._trueUltCageStep].time) {
        const c = cageCuts[this._trueUltCageStep];
        this._trueUltCageStep++;
        this.spawnAfterimage(this.x, this.y, this.facing, 4, 14, 0.42, c.gold ? 'gold' : 'cyan');
        this.x = this._clampArenaX(tx + c.ox, game);
        this.y = this.groundY + c.oy;
        this.facing = c.face;
        this.trueUltFrameOverride = c.frame;
        this._overrideFrameIdx = c.frame;
        this.spawnAfterimage(this.x, this.y, this.facing, 4, 18, 0.42, c.gold ? 'gold' : 'cyan');

        // Persistent Celestial Smear Cage Scar that stays locked around the target until Phase 4 shatters it!
        this.spawnRazorScar(tx, this.groundY - 96, c.dx, c.dy, 1.35, c.gold);
        this.spawnVfxAnim(5, tx, this.groundY - 96, 216, 216, 0.34, {
          flipX: c.face < 0,
          glowColor: c.gold ? 'gold' : 'cyan',
          foreground: true
        });
        this.fx?.spawn('runebladeCrescentSlash', tx, this.groundY - 96, {
          flip: c.face < 0,
          palette: c.gold ? RUNIC_GOLD_PALETTE : RUNIC_CYAN_PALETTE,
          light: 1.38,
          extra: { radius: 40, width: 12.5, isGold: c.gold }
        });
        this._applyExviusStrike(enemy, game, {
          damage: 24,
          reachFront: 280,
          reachBack: 180,
          hitStop: 0.022,
          shakeDur: 0.048,
          knockX: 4,
          knockY: -26,
          isCrit: c.gold,
          scarDx: c.dx,
          scarDy: c.dy,
          isGold: c.gold,
          sfx: 'slash'
        });
      }
      return;
    }

    // Phase 3 (2.60..3.42s): High-Sky Winged Ascent & Sovereign Lock-On (Row 4 F17..F21 = 137..141)
    if (t < 3.42) {
      if (this._trueUltStage < 3) {
        this._trueUltStage = 3;
        if (game?.audio) game.audio.play('dash_whoosh', this.x);
        this.fx?.spawn('blinkTeleportPillar', this.x, this.y, {
          flip: this.facing < 0,
          light: 1.4
        });
      }
      const ascU = Math.min(1, (t - 2.60) / 0.82);
      const lift = 420 * (1 - Math.pow(1 - ascU, 2.2));
      this.x = this._clampArenaX(tx - this.facing * 64, game);
      this.y = this.groundY - lift;
      this.cameraAirLift = lift * 0.86;
      this.justiceWingsActive = true;
      this.justiceWingSpread = 1.0 + 0.12 * Math.sin(t * 9.0);
      const ascFrame = 137 + Math.min(4, Math.floor(ascU * 5));
      this.trueUltFrameOverride = ascFrame;
      this._overrideFrameIdx = ascFrame;
      return;
    }

    // Phase 4 (3.42..4.35s): Colossal Dawn-Breaker Cathedral Beam-Cleave (Row 4 F22..F29 = 142..149)!
    if (t < 3.56) {
      const diveU = (t - 3.42) / 0.14;
      this.x = this._clampArenaX(tx - this.facing * 56, game);
      this.y = this.groundY - 420 * (1 - diveU * diveU);
      this.cameraAirLift = Math.max(0, (this.groundY - this.y) * 0.85);
      const diveFrame = 142 + Math.min(2, Math.floor(diveU * 3));
      this.trueUltFrameOverride = diveFrame;
      this._overrideFrameIdx = diveFrame;
      this.spawnAfterimage(this.x, this.y, this.facing, 4, diveFrame - 120, 0.30, 'gold');
      return;
    }

    this.y = this.groundY;
    this.cameraAirLift = Math.max(0, this.cameraAirLift - dt * 980);
    const finStep = Math.min(4, Math.floor(((t - 3.56) / 0.79) * 5));
    const impactFrame = 145 + finStep;
    this.trueUltFrameOverride = impactFrame;
    this._overrideFrameIdx = impactFrame;

    if (this._trueUltStage < 4) {
      this._trueUltStage = 4;
      const beamX = this._clampArenaX(tx, game);
      if (game?.audio) game.audio.play('thunder_slam', beamX);
      game?.renderer?.triggerShake?.(24, 0.48);
      game?.vfx?.spawnShockwave(beamX, this.groundY - 4, 185, '#fde047', 0.42, true, true);
      this.spawnCathedralBeam(beamX, this.groundY, 118, 0.68);
      this.spawnExviusFeathers(game, 30);

      this.fx?.spawn('skyJudgmentPillar', beamX, this.groundY - 2, {
        flip: this.facing < 0,
        light: 1.5
      });
      this.fx?.spawn('earthshatterJudgmentWave', beamX, this.groundY - 2, {
        flip: this.facing < 0,
        light: 1.5,
        extra: { isUltimate: true }
      });
      this.spawnVfxAnim(6, beamX, this.groundY - 104, 240, 240, 0.55, {
        flipX: false,
        glowColor: 'gold',
        foreground: true
      });
      this._applyExviusStrike(enemy, game, {
        damage: 142,
        reachFront: 340,
        reachBack: 240,
        hitStop: 0.065,
        shakeDur: 0.12,
        knockX: 165,
        knockY: -195,
        isCrit: true,
        scarDx: 36,
        scarDy: 204,
        isGold: true,
        sfx: 'heavy_cleave'
      });
      this.fireDawnBladeWave(game, {
        x: beamX,
        y: this.groundY - 84,
        damage: 44,
        speed: 780,
        maxRange: 620,
        isUltimate: true,
        isGold: true
      });
    }

    if (t >= dur) {
      this.y = this.groundY;
      this.cameraAirLift = 0;
      this.justiceWingsActive = false;
      this.isInvulnerable = false;
      this.unstoppablePoise = false;
      this.isOmnislashing = false;
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      this.setState('IDLE');
    }
  }

  updateCustomVfx(dt) {
    if (this._comboPersistTimer > 0 && this.state !== 'AUTO_ATTACK') {
      this._comboPersistTimer = Math.max(0, this._comboPersistTimer - dt);
      if (this._comboPersistTimer <= 0) {
        this.comboStep = 0;
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

    for (let i = this.razorScars.length - 1; i >= 0; i--) {
      this.razorScars[i].age += dt;
      if (this.razorScars[i].age >= this.razorScars[i].maxLife) {
        this.razorScars.splice(i, 1);
      }
    }

    for (let i = this.cathedralBeams.length - 1; i >= 0; i--) {
      this.cathedralBeams[i].age += dt;
      if (this.cathedralBeams[i].age >= this.cathedralBeams[i].maxLife) {
        this.cathedralBeams.splice(i, 1);
      }
    }

    if (this.justiceFeatherTimer > 0) {
      this.justiceFeatherTimer = Math.max(0, this.justiceFeatherTimer - dt);
    }
    for (let i = this.justiceFeathers.length - 1; i >= 0; i--) {
      const f = this.justiceFeathers[i];
      f.age += dt;
      f.x += (f.vx + Math.sin(f.age * f.swayFreq + f.phase) * f.swayAmp) * dt;
      f.y += f.vy * dt;
      if (f.y > this.groundY - 6 && f.age < f.maxLife * 0.78) {
        f.y = this.groundY - 410 - Math.random() * 70;
      }
      if (f.age >= f.maxLife) {
        this.justiceFeathers.splice(i, 1);
      }
    }
  }

  update(dt, enemy, game) {
    this._currentEnemy = enemy;
    this.crouchCooldown = Math.max(0, this.crouchCooldown - dt);
    this.vaultCooldown = Math.max(0, this.vaultCooldown - dt);
    this.updateCustomVfx(dt);

    if (this.fx) {
      if (!this.isDead && !this.haloFxSlot) {
        this.haloFxSlot = this.fx.spawn('runicVanguardAura', this.x, this.groundY - 4, {
          follow: this,
          useGroundY: true,
          offsetX: 0,
          offsetY: -4,
          flip: this.facing < 0,
          light: 1.18,
          extra: { radius: 25, isAegis: false }
        });
      }
      if (this.haloFxSlot) {
        this.haloFxSlot.inst.cfg.isAegis = Boolean(this.isDeflecting || this.isCrouching);
        this.haloFxSlot.inst.cfg.radius = this.isDeflecting ? 29 : 25;
        if (this.isDead) {
          this.haloFxSlot.inst.release();
          this.haloFxSlot = null;
        }
      }
      this.fx.update(dt);
    }

    if (!this.isDead && this.state === 'WALK') {
      this.stepDustTimer += dt;
      if (this.stepDustTimer >= 0.30) {
        this.stepDustTimer = 0;
        if (game?.audio) game.audio.play('footstep_steel', this.x);
        this.fx?.burst(this.x - this.facing * 14, this.groundY - 2, {
          count: 4,
          speedMin: 26,
          speedMax: 74,
          lifeMin: 0.12,
          lifeMax: 0.24,
          gravity: 32,
          colors: ['#ffffff', '#38bdf8', '#facc15']
        });
      }
    }

    const inMidCombo = (this._aiComboCount || 0) > 0 && (this._aiComboChainTimer || 0) > 0;
    if (
      !this.isPlayerControlled &&
      !inMidCombo &&
      enemy &&
      !enemy.isDead &&
      (this.state === 'IDLE' || this.state === 'WALK') &&
      (this.finisherGauge || 0) < (this.maxFinisherGauge || 100)
    ) {
      const dist = Math.abs(enemy.x - this.x);
      let projectileApproaching = false;
      if (game?.vfx?.projectiles) {
        for (const proj of game.vfx.projectiles) {
          if (
            proj.owner !== this &&
            Math.abs(proj.x - this.x) < 235 &&
            Math.sign(proj.vx) === Math.sign(this.x - proj.x)
          ) {
            projectileApproaching = true;
            break;
          }
        }
      }
      if (this.crouchCooldown <= 0 && projectileApproaching) {
        this.startCrouch(enemy, game);
        return;
      }
      if (
        dist >= 245 &&
        dist <= 395 &&
        this.vaultCooldown <= 0 &&
        this.dodgeCooldown <= 0 &&
        this.skillCooldown > 0.65 &&
        !game?.isAdventureMode?.()
      ) {
        this.startJump(enemy, game, this.facing);
        return;
      }
    }

    super.update(dt, enemy, game);
  }

  getExSprites() {
    return typeof Image !== 'undefined' ? PixelForge.initAssets()?.warrior_ex : null;
  }

  drawArchangelExviusWings(ctx) {
    const sprites = this.getExSprites();
    const wingsImg = PixelForge.ensureImage(sprites?.wings);
    if (!wingsImg || !wingsImg.complete || !wingsImg.naturalWidth) return;

    const spread = Math.max(0.25, this.justiceWingSpread || 1.0);
    const cols = Math.max(1, Math.round(wingsImg.naturalWidth / 320));
    const cellW = Math.round(wingsImg.naturalWidth / cols) || 320;
    const cellH = wingsImg.naturalHeight || 232;
    const flapCol = Math.floor(((this.stateTimer || 0) * 28) % cols);
    const drawW = Math.round(256 * spread);
    const drawH = 186;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(this.x), Math.round(this.y - 98));
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.88;
    ctx.drawImage(
      wingsImg,
      flapCol * cellW,
      0,
      cellW,
      cellH,
      Math.round(-drawW * 0.5),
      Math.round(-drawH * 0.5),
      drawW,
      drawH
    );
    ctx.restore();
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
    glowColor = 'cyan'
  ) {
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;
    const rows = Math.max(1, Math.round(vfxSheet.naturalHeight / 208));
    const cell = 208;
    const sx = Math.max(0, Math.min(29, Math.floor(col))) * cell;
    const sy = Math.max(0, Math.min(rows - 1, Math.floor(row))) * cell;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(x), Math.round(y));
    if (flipX) ctx.scale(-1, 1);

    const glowSprite =
      glowColor === 'gold'
        ? renderer?.glowGold || renderer?.glowCyan
        : glowColor === 'white'
          ? renderer?.glowWhite || renderer?.glowCyan
          : renderer?.glowCyan;
    if (glowSprite) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, alpha * 0.40);
      const gw = Math.round(w * 1.12);
      const gh = Math.round(h * 1.12);
      ctx.drawImage(glowSprite, -gw * 0.5, -gh * 0.5, gw, gh);
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.drawImage(vfxSheet, sx, sy, cell, cell, -w * 0.5, -h * 0.5, w, h);

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, alpha * 0.48);
    ctx.drawImage(vfxSheet, sx, sy, cell, cell, -w * 0.5, -h * 0.5, w, h);

    ctx.restore();
  }

  /**
   * Renders pixel-stepped razor slash-scars, Cathedral Dawn-Breaker beam pillars, and fluttering Seraphim feathers
   * using strictly integer-snapped `fillRect` pixel clusters (zero canvas rotation, zero smooth ellipses!).
   */
  drawPixelScarsAndBeams(ctx, renderer = null) {
    const sprites = this.getExSprites();
    const vfxSheet = PixelForge.ensureImage(sprites?.vfx);
    const hasVfx = Boolean(vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth > 0);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Colossal Cathedral Dawn-Breaker Beam-Cleave Pillars
    for (let i = 0; i < this.cathedralBeams.length; i++) {
      const b = this.cathedralBeams[i];
      const u = Math.min(1, b.age / b.maxLife);
      const env = u < 0.12 ? u / 0.12 : Math.max(0, 1 - (u - 0.12) / 0.88);
      const halfW = Math.max(4, Math.round(b.width * 0.5 * env));
      const topY = Math.round(b.groundY - 620);
      const beamH = Math.round(b.groundY - topY);

      ctx.globalAlpha = Math.min(1, env * 0.92);
      ctx.fillStyle = '#0c2e59';
      ctx.fillRect(b.x - halfW - 4, topY, (halfW + 4) * 2, beamH);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(b.x - halfW, topY, halfW * 2, beamH);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(b.x - Math.round(halfW * 0.72), topY, Math.round(halfW * 1.44), beamH);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(b.x - Math.round(halfW * 0.42), topY, Math.round(halfW * 0.84), beamH);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(b.x - Math.max(2, Math.round(halfW * 0.20)), topY, Math.max(4, Math.round(halfW * 0.40)), beamH);

      // Stepped horizontal sanctum shock-bars at ground base
      const barW = Math.round(halfW * 2.8);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(b.x - barW, b.groundY - 8, barW * 2, 6);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(b.x - Math.round(barW * 0.65), b.groundY - 6, Math.round(barW * 1.3), 2);
    }

    // 2. Integer-Stepped Bresenham Pixel Razor Slash-Scars across struck targets
    for (let i = 0; i < this.razorScars.length; i++) {
      const s = this.razorScars[i];
      const u = Math.min(1, s.age / s.maxLife);
      const fade = u < 0.15 ? 1.0 : Math.max(0, 1 - (u - 0.15) / 0.85);
      if (fade <= 0.02) continue;

      const dx = s.x1 - s.x0;
      const dy = s.y1 - s.y0;
      const steps = Math.max(12, Math.round(Math.max(Math.abs(dx), Math.abs(dy)) / 4));
      ctx.globalAlpha = Math.min(1, fade * 0.96);

      for (let k = 0; k <= steps; k++) {
        const su = k / steps;
        const taper = Math.sin(su * Math.PI);
        if (taper <= 0.08) continue;
        const px = Math.round((s.x0 + dx * su) / 2) * 2;
        const py = Math.round((s.y0 + dy * su) / 2) * 2;
        const rad = Math.max(2, Math.round(taper * 6) * 2);

        ctx.fillStyle = s.isGold ? '#b45309' : '#0284c7';
        ctx.fillRect(px - rad, py - rad, rad * 2, rad * 2);
        const mid = Math.max(2, rad - 2);
        ctx.fillStyle = s.isGold ? '#fde047' : '#38bdf8';
        ctx.fillRect(px - mid, py - mid, mid * 2, mid * 2);
        if (taper > 0.35) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(px - 2, py - 2, 4, 4);
        }
      }
    }

    // 3. Fluttering Seraphim Feathers (uses warrior_ex_vfx Row 7 when loaded, with crisp pixel-cluster fallback)
    for (let i = 0; i < this.justiceFeathers.length; i++) {
      const f = this.justiceFeathers[i];
      const u = f.age / f.maxLife;
      const fade = u < 0.08 ? u / 0.08 : u > 0.80 ? Math.max(0, (1 - u) / 0.20) : 1.0;
      if (fade <= 0.02) continue;

      if (hasVfx && vfxSheet.naturalHeight >= 1664) {
        const col = (Math.floor(f.age * 24) + f.frameOffset) % 30;
        this.drawBloomedVfxCell(
          ctx,
          vfxSheet,
          7,
          col,
          Math.round(f.x),
          Math.round(f.y),
          f.drawSize,
          f.drawSize,
          fade * 0.94,
          f.flipX,
          i % 3 === 0 ? renderer : null,
          f.isGold ? 'gold' : 'cyan'
        );
      } else {
        const fx = Math.round(f.x / 2) * 2;
        const fy = Math.round(f.y / 2) * 2;
        ctx.globalAlpha = fade * 0.92;
        ctx.fillStyle = '#061228';
        ctx.fillRect(fx - 4, fy - 6, 8, 12);
        ctx.fillStyle = f.isGold ? '#facc15' : '#38bdf8';
        ctx.fillRect(fx - 2, fy - 4, 4, 8);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(fx - 2, fy - 2, 2, 4);
      }
    }

    ctx.restore();
  }

  drawForegroundOverlay(ctx, renderer = null) {
    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    if (this.fx && !this.isDead) {
      this.fx.renderLayer(ctx, 'back', arenaCenterX, this.groundY, 0.96);
    }

    if (this.justiceWingsActive && !this.isDead) {
      this.drawArchangelExviusWings(ctx);
    }

    const sprites = this.getExSprites();
    const sheet = PixelForge.ensureImage(sprites?.sheet);
    const vfxSheet = PixelForge.ensureImage(sprites?.vfx);

    if (this.afterimages.length > 0 && sheet && sheet.complete && sheet.naturalWidth) {
      for (let i = 0; i < this.afterimages.length; i++) {
        const img = this.afterimages[i];
        const alpha = Math.max(0, (1 - img.age / img.maxLife) * 0.62);
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
          img.tint === 'gold' ? '#fde047' : '#38bdf8'
        );
        ctx.restore();
      }
    }

    if (this.activeVfxAnims.length > 0 && vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      for (let i = 0; i < this.activeVfxAnims.length; i++) {
        const v = this.activeVfxAnims[i];
        if (v.foreground) continue;
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
    const vfxSheet = PixelForge.ensureImage(sprites?.vfx);

    if (this.activeVfxAnims.length > 0 && vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      for (let i = 0; i < this.activeVfxAnims.length; i++) {
        const v = this.activeVfxAnims[i];
        if (!v.foreground) continue;
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

    if (
      this.razorScars.length > 0 ||
      this.cathedralBeams.length > 0 ||
      this.justiceFeathers.length > 0
    ) {
      this.drawPixelScarsAndBeams(ctx, renderer);
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

    ctx.restore();
  }
}
