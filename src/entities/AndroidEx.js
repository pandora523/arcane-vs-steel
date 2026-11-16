import { Fighter } from './Fighter.js?v=30fps114';
import { PixelForge } from '../engine/PixelForge.js?v=30fps114';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps114';
import {
  CYBER_EFFECT_REGISTRY,
  CYBER_NEON_PALETTE,
  CYBER_MAGENTA_PALETTE
} from '../engine/shaders/cyberShaders.js?v=30fps114';

const AUTO_SLICES_EX = [
  [60, 8], // Beat 1 (V0, 0.35s): Downward HF-Plasma Odachi Crescent -> snaps at F03 (63)
  [68, 7], // Beat 2 (V1, 0.33s): Reverse Rising Singularity Uppercut + Funnel Volley -> snaps at F09 (69)
  [75, 8], // Beat 3 (V2, 0.37s): 2.5D Horizontal Overdrive Spin-Rip (2-hit, allowV2Cross: false) -> snaps at F17/F18 (77/78)
  [83, 7]  // Beat 4 (V3, 0.50s): Thruster-Boosted Aerial Guillotine Cleave (3-hit + cyber_disc) -> snaps at F25 (85)
];

const BEAT_DURATIONS = [0.35, 0.33, 0.37, 0.50];
const INTRA_COMBO_LINK = 0.015;

/**
 * VEX-09 EX (`android_ex`) - Singularity Valkyrie & HF Plasma Odachi Duelist.
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
      maxHp: 3920,
      moveSpeed: 232,
      attackRange: 178,
      autoInterval: 0.94,
      lightColor: 'rgba(34, 211, 238, 1)',
      primaryColor: '#22d3ee',
      secondaryColor: '#ec4899',
      hasTrueUltimate: true,
      trueUltName: 'PROJECT GUNG-09: ORBITAL SINGULARITY BUSTER',
      trueUltDuration: 4.45
    });

    this.heroId = 'android_ex';
    this.theme = 'cyber';
    this.secondaryColor = '#ec4899';
    this.deathSfx = 'death_android';
    this.hasPoise = true;
    this.allowV2Cross = false;

    this.autoDuration = BEAT_DURATIONS[0];
    this._postFlurryInterval = 1.42;

    this.skillName = 'EMP OVERLOAD BLITZ';
    this.skillMaxCooldown = 4.35;
    this.skillCooldown = 1.15;
    this.skillDuration = 0.98;
    this.skillTriggerRange = 450;

    this.ultName = 'VALKYRIE VISOR HYPER-LASER';
    this.ultSub = 'OPTICAL SINGULARITY CONVERGENCE';
    this.ultDuration = 1.92;

    this.trueUltName = 'PROJECT GUNG-09: ORBITAL SINGULARITY BUSTER';
    this.trueUltSub = 'ALL-RANGE FUNNEL LOCK - ORBITAL COLUMN';
    this.trueUltDuration = 4.45;

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

    // 4 Articulated Autonomous Cyber Fin-Funnel Drones & coordinated laser beams
    this.funnelDrones = [
      { angle: 0, x: this.x, y: this.y - 122 },
      { angle: Math.PI * 0.5, x: this.x, y: this.y - 122 },
      { angle: Math.PI, x: this.x, y: this.y - 122 },
      { angle: Math.PI * 1.5, x: this.x, y: this.y - 122 }
    ];
    this.funnelLaserBeams = [];
    this.razorScars = [];
    this.afterimages = [];
    this.afterimageAccum = 0;
    this.activeVfxAnims = [];

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
    this._deathSparksTriggered = false;
    this._overrideFrameIdx = null;

    // Expanded 640x460 shader viewport (1920x1380 world coverage @ pixelScale 3) ensures zero border clips on cross-stage Visor Lasers
    this.fx = new ArcaneShaderFX(CYBER_EFFECT_REGISTRY, {
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

  getExSprites() {
    if (typeof Image === 'undefined') return null;
    const assets = PixelForge.initAssets?.();
    if (!assets) return null;
    if (!assets.android_ex) {
      const sheet = new Image();
      sheet.src = 'assets/sprites/android_ex_sheet.png?v=30fps114';
      const vfx = new Image();
      vfx.src = 'assets/sprites/android_ex_vfx.png?v=30fps114';
      const portrait = new Image();
      portrait.src = 'assets/sprites/android_ex_portrait.png?v=30fps114';
      assets.android_ex = {
        sheet,
        vfx,
        portrait,
        cellW: 320,
        cellH: 240,
        anchorX: 112,
        anchorY: 230
      };
    }
    return assets.android_ex;
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
      this.afterimageAccum = 0;
    }

    if (newState === 'ULTIMATE') {
      this._ultStep = 0;
      this.isInvulnerable = true;
    }

    if (newState === 'TRUE_ULTIMATE') {
      this._trueUltStep = 0;
      this._trueUltStartX = this.x;
      this._trueUltRetreatX = this.x;
      this.isInvulnerable = true;
      this.unstoppablePoise = true;
    } else if (prevState === 'TRUE_ULTIMATE') {
      this.unstoppablePoise = false;
    }

    if (newState === 'DEATH') {
      this.fx?.clear();
      this.funnelLaserBeams.length = 0;
      this.razorScars.length = 0;
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
    const center = ww * 0.5;
    return Math.max(center - 740, Math.min(center + 740, Math.max(84, Math.min(ww - 84, xv))));
  }

  _safeFxY(yv) {
    return Math.max(52, Math.min(this.groundY + 24, yv));
  }

  /**
   * Initializes one beat (`0..3`) of VEX-09 EX's grounded front-line Cyber-Samurai blitz
   * (`allowV2Cross: false`: never crosses through enemy chest, always thruster-brakes cleanly at `108..118px`!).
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
    let desiredX = this.x + this.facing * (v === 0 ? 18 : v === 2 ? 14 : 10);

    if (enemy && !enemy.isDead) {
      // Strictly grounded front-line sweet-spot (`110..116px`) with allowV2Cross === false!
      const sweetDist = v === 2 ? 110 : 114;
      const idealStandX = enemy.x - this.facing * sweetDist;
      const rawDelta = (idealStandX - this.x) * this.facing;
      const maxForward = v === 0 ? 114 : v === 2 ? 38 : 30;
      const clampedForward = Math.max(0, Math.min(maxForward, rawDelta));
      desiredX = this.x + this.facing * clampedForward;
    }

    this._beatTargetX = this._clampArenaX(desiredX, g);
  }

  queueNextComboBeat() {
    this._queuedNextBeat = true;
  }

  spawnAfterimage(x, y, facing, row = 2, col = 3, maxLife = 0.22, isMagenta = false) {
    if (this.afterimages.length >= 12) this.afterimages.shift();
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

  spawnRazorScar(cx, cy, dx, dy, maxLife = 0.22, isMagenta = false) {
    if (this.razorScars.length >= 18) this.razorScars.shift();
    this.razorScars.push({
      x0: Math.round(cx - dx * 0.5),
      y0: Math.round(cy - dy * 0.5),
      x1: Math.round(cx + dx * 0.5),
      y1: Math.round(cy + dy * 0.5),
      age: 0,
      maxLife,
      isMagenta
    });
  }

  /**
   * Coordinated Fin-Funnel Laser Volley (`<= 0.14` bloom):
   * Fires `count` synchronized optical plasma lances from VEX-09 EX's orbiting Cyber Fin-Funnel Pylons!
   */
  fireFinFunnelVolley(enemy, game, count = 1, bonusDmg = 12) {
    if (!Array.isArray(this.funnelDrones) || this.funnelDrones.length === 0) return;
    const tx = enemy && !enemy.isDead ? enemy.x : this.x + this.facing * 140;
    const ty = enemy && !enemy.isDead ? enemy.y - (enemy.isColossalBoss ? 124 : 88) : this.groundY - 88;
    const n = Math.min(count, this.funnelDrones.length);

    for (let i = 0; i < n; i++) {
      const drone = this.funnelDrones[(this.comboStep + i) % this.funnelDrones.length];
      if (this.funnelLaserBeams.length >= 10) this.funnelLaserBeams.shift();
      this.funnelLaserBeams.push({
        x0: Math.round(drone.x),
        y0: Math.round(drone.y),
        x1: Math.round(tx + (i - (n - 1) * 0.5) * 14),
        y1: Math.round(ty + (i % 2 === 0 ? -8 : 8)),
        age: 0,
        maxLife: 0.20,
        isMagenta: i % 2 === 1
      });
    }

    if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= 340) {
      enemy.takeDamage(bonusDmg, this, false, 10, 0);
      this.fx?.spawn('cyberImpactSpark', this._safeFxX(tx, game), this._safeFxY(ty), {
        palette: count > 1 ? CYBER_MAGENTA_PALETTE : CYBER_NEON_PALETTE,
        light: 1.08
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
    if (!this.fx || !proj) return;
    proj._trailAcc = (proj._trailAcc || 0) + 0.016;
    if (proj._trailAcc >= 0.065) {
      proj._trailAcc = 0;
      const dir = Math.sign(proj.vx || this.facing || 1);
      this.fx.burst(this._safeFxX(proj.x - dir * 14), this._safeFxY(proj.y), {
        count: 2,
        speedMin: 24,
        speedMax: 72,
        lifeMin: 0.11,
        lifeMax: 0.20,
        gravity: -10,
        colors: ['#ffffff', '#67e8f9', '#22d3ee', '#ec4899']
      });
    }
  }

  takeDamage(amount, attacker, isCrit = false, knockX = 95, knockY = 0) {
    if (this.isDeflecting && !this.isDead) {
      const reduced = Math.max(1, Math.round(amount * 0.35));
      this.fx?.spawn('cyberImpactSpark', this._safeFxX(this.x + this.facing * 42), this._safeFxY(this.y - 78), {
        palette: CYBER_NEON_PALETTE,
        flip: this.facing < 0,
        light: 1.12
      });
      this.game?.vfx?.spawnDamageText?.(this.x, this.y - 176, 0, false, 'HEX MATRIX GUARD!', '#22d3ee');
      this.game?.audio?.play?.('reflect', this.x);
      super.takeDamage(reduced, attacker, false, knockX * 0.25, 0);
      return;
    }

    super.takeDamage(amount, attacker, isCrit, knockX, knockY);

    if (this.isDead && !this._deathSparksTriggered) {
      this._deathSparksTriggered = true;
      this.fx?.spawn('rgbGlitchTear', this._safeFxX(this.x), this._safeFxY(this.groundY), {
        palette: CYBER_MAGENTA_PALETTE,
        light: 1.05
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
   * Row-4 Cyber-Glitch scars, and neon-cyan / hot-magenta plasma bursts!
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
      scarDx = 108,
      scarDy = 82,
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
      this.spawnRazorScar(hitX, hitY, this.facing * scarDx, scarDy, 0.22, isMagenta);
      this.spawnVfxAnim(4, hitX, hitY, 184, 184, 0.22, {
        flipX: this.facing < 0,
        foreground: true
      });
      this.fx?.burst(this._safeFxX(hitX, game), this._safeFxY(hitY), {
        count: isCrit ? 9 : 6,
        speedMin: 50,
        speedMax: 168,
        lifeMin: 0.12,
        lifeMax: 0.25,
        gravity: 38,
        colors: isMagenta
          ? ['#ffffff', '#f9a8d4', '#ec4899', '#22d3ee']
          : ['#ffffff', '#67e8f9', '#22d3ee', '#ec4899']
      });
      landedAny = true;
    }

    if (landedAny && hitStop > 0) {
      this._hitStopTimer = Math.max(this._hitStopTimer || 0, hitStop);
      game?.renderer?.triggerHitStop?.(hitStop * 0.65);
    }
    return landedAny;
  }

  startCrouch(_enemy, game) {
    this.setState('CROUCH');
    this.isCrouching = true;
    this.isDeflecting = true;
    this.didSecondaryAction = false;
    this.crouchDuration = 0.86;
    this.crouchCooldown = this.crouchMaxCooldown || 4.0;
    this.vx = 0;

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
    this.spawnVfxAnim(1, this.x + this.facing * 24, this.y - 84, 184, 184, 0.36, {
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
        light: 1.18
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
    this.dodgeCooldown = Math.max(this.dodgeCooldown || 0, 1.5);
    this.dashDuration = 0.54;
    this.isFlipVault = true;
    this.isInvulnerable = true;
    this.didSecondaryAction = false;
    this.flipStartX = this.x;

    let desiredX = this.x + this.facing * 205;
    if (enemy && !enemy.isDead && this.facing === (enemy.x >= this.x ? 1 : -1)) {
      desiredX = enemy.x - this.facing * 114;
    }
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
      light: 1.08,
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

  updateDodge(dt, enemy, game) {
    this.updateJump(dt, enemy, game);
  }

  onStartDash(_enemy, game, dir) {
    this.dashDuration = 0.34;
    this.dashDir = dir || this.facing;
    game?.audio?.play?.('dash_whoosh', this.x);
    this.fx?.spawn('wingPylonThruster', this._safeFxX(this.x - this.dashDir * 16, game), this._safeFxY(this.y - 114), {
      follow: this,
      offsetX: -16,
      offsetY: -114,
      flip: this.dashDir < 0,
      palette: CYBER_NEON_PALETTE,
      maxDuration: 0.32,
      light: 1.08,
      extra: { length: 22, tilt: -0.25 }
    });
  }

  updateDash(dt, enemy, _game) {
    const t = this.stateTimer;
    const dur = this.dashDuration || 0.34;
    const dir = this.dashDir || this.facing;
    this.vy = 0;
    this.y = this.groundY;

    // Thruster-braked vanguard sprint that locks at 114px Odachi sweet-spot (`allowV2Cross: false`)!
    if (t < dur * 0.78) {
      const distToEnemy = enemy && !enemy.isDead ? (enemy.x - this.x) * dir : 999;
      if (distToEnemy <= 116 && distToEnemy >= 70) {
        this.vx = 0;
      } else {
        this.vx = dir * 660;
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
   * 4-Beat Grounded Cyber-Samurai HF-Plasma Odachi Blitz (`[[60,8],[68,7],[75,8],[83,7]]`):
   * - `allowV2Cross: false`: stays strictly in front of foe, thruster-braked `vx = 0` hard snap plants!
   * - `V0 (F03)`: 1-frame snap downward HF-Plasma Odachi serrated crescent smear (`44ms` hit-stop)!
   * - `V1 (F09)`: Reverse rising Singularity uppercut slash smear (`46ms` hit-stop + Fin-Funnel volley)!
   * - `V2 (F17/F18)`: 2.5D horizontal Overdrive spin-rip (`2-hit` + `44ms/46ms` hit-stop + 2 Fin-Funnel lances)!
   * - `V3 (F25)`: Thruster-boosted aerial guillotine cleave (`3-hit` + `60ms` hit-stop + `'cyber_disc'` chakram)!
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

    // 1. Thruster-Assisted Pre-Snap Lunge -> Hard-Braked Boots Plant (`vx = 0`) at `snapT`!
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
          this.fx?.burst(this._safeFxX(this.x - this.facing * 34, game), this._safeFxY(this.groundY - 3), {
            count: 3,
            speedMin: 34,
            speedMax: 96,
            lifeMin: 0.10,
            lifeMax: 0.20,
            gravity: 72,
            colors: ['#ffffff', '#67e8f9', '#ec4899']
          });
        }
      }
    } else if (!this._bootsPlanted) {
      this._bootsPlanted = true;
      this.x = this._beatTargetX;
      this.vx = 0;
    }

    // Thruster-boosted aerial guillotine arc on Beat 4 (`62px` lift on F23..F24 -> slams onto `groundY` at F25 `t = 0.16s`)
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

    // 2. Beat-Specific HF-Plasma Odachi Smear Impacts (`44-60ms` `_hitStopTimer`, `1 -> 1 -> 2 -> 3` hits)
    if (v === 0) {
      if ((this._beatHitMask & 1) === 0 && t >= 0.10) {
        this._beatHitMask |= 1;
        const slashX = this.x + this.facing * 72;
        game?.vfx?.spawnShockwave?.(this.x + this.facing * 40, this.groundY - 4, 56, '#22d3ee', 0.20, false, true);
        this.fx?.spawn('plasmaCrescentSlash', this._safeFxX(slashX, game), this._safeFxY(this.y - 84), {
          flip: this.facing < 0,
          palette: CYBER_NEON_PALETTE,
          light: 1.16
        });
        this._applyOdachiStrike(enemy, game, {
          damage: 28,
          reachFront: 218,
          hitStop: 0.044,
          shakeDur: 0.056,
          knockX: 24,
          knockY: 0,
          scarDx: 108,
          scarDy: 86,
          isMagenta: false,
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
          palette: CYBER_MAGENTA_PALETTE,
          light: 1.18
        });
        this.fireFinFunnelVolley(enemy, game, 1, 10);
        this._applyOdachiStrike(enemy, game, {
          damage: 28,
          reachFront: 220,
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
          palette: CYBER_NEON_PALETTE,
          light: 1.16
        });
        this._applyOdachiStrike(enemy, game, {
          damage: 20,
          reachFront: 218,
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
        this.fireFinFunnelVolley(enemy, game, 2, 12);
        this._applyOdachiStrike(enemy, game, {
          damage: 22,
          reachFront: 220,
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
        game?.vfx?.spawnShockwave?.(slamX, this.groundY - 4, 98, '#ec4899', 0.28, false, true);
        this.spawnVfxAnim(2, slamX, this.groundY - 82, 212, 212, 0.36, {
          flipX: this.facing < 0,
          foreground: false
        });
        this._applyOdachiStrike(enemy, game, {
          damage: 25,
          reachFront: 224,
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
          damage: 26,
          speed: 700,
          maxRange: 460,
          pierce: true
        });
      }
      if ((this._beatHitMask & 2) === 0 && t >= 0.21) {
        this._beatHitMask |= 2;
        this._applyOdachiStrike(enemy, game, {
          damage: 16,
          reachFront: 226,
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
          damage: 22,
          reachFront: 228,
          hitStop: 0,
          shakeDur: 0.056,
          knockX: 92,
          knockY: -86,
          isCrit: true,
          scarDx: 98,
          scarDy: -84,
          isMagenta: true,
          sfx: 'slash'
        });
      }
    }

    // 3. Seamless Direct Beat Chaining (`0.015s` link, ZERO return to IDLE!)
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
        Math.abs(enemy.x - this.x) <= 248;

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
   * SPECIAL SKILL (`4.35s CD`, `0.98s`, Row 3 `90..119`):
   * `EMP OVERLOAD BLITZ` — Holo-Target Lock + advancing Muramasa-09 X-cross blitz + Fin-Funnel
   * coordinated barrage + `empOverloadDome` detonation (`+32 HP` `NANO SHIELD`)!
   */
  updateSkill(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.skillDuration || 0.98;
    this.unstoppablePoise = true;

    if (t < 0.48) {
      const dist = enemy && !enemy.isDead ? (enemy.x - this.x) * this.facing : 150;
      const inBurst = (t >= 0.04 && t < 0.16) || (t >= 0.24 && t < 0.36);
      if (inBurst && dist > 110) {
        this.vx = this.facing * Math.min(580, (dist - 106) * 9.5 + 220);
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

    // Step 1 (t = 0.06s): Holo-Target Reticle Lock on enemy
    if ((this._skillStepMask & 1) === 0 && t >= 0.06) {
      this._skillStepMask |= 1;
      const lockX = enemy && !enemy.isDead ? enemy.x : this.x + this.facing * 150;
      this.spawnVfxAnim(3, lockX, this.groundY - 92, 188, 188, 0.42, { foreground: true });
      this.fx?.spawn('holoTargetReticle', this._safeFxX(lockX, game), this._safeFxY(this.groundY), {
        palette: CYBER_NEON_PALETTE,
        light: 1.12,
        extra: { boxW: 24, boxH: 60 }
      });
    }

    // Step 2 (t = 0.20s): Advancing Neon-Cyan Odachi Blitz Slash + Fin-Funnel Volley
    if ((this._skillStepMask & 2) === 0 && t >= 0.20) {
      this._skillStepMask |= 2;
      this.vx = 0;
      this.fireFinFunnelVolley(enemy, game, 2, 12);
      this._applyOdachiStrike(enemy, game, {
        damage: 26,
        reachFront: 222,
        hitStop: 0.036,
        shakeDur: 0.050,
        knockX: 18,
        knockY: -22,
        scarDx: 116,
        scarDy: 82,
        isMagenta: false,
        sfx: 'slash'
      });
    }

    // Step 3 (t = 0.38s): Reverse Hot-Magenta Twin Cross-Slash
    if ((this._skillStepMask & 4) === 0 && t >= 0.38) {
      this._skillStepMask |= 4;
      this.vx = 0;
      this.fx?.spawn(
        'twinCrossSlash',
        this._safeFxX(this.x + this.facing * 76, game),
        this._safeFxY(this.y - 88),
        {
          flip: this.facing < 0,
          palette: CYBER_MAGENTA_PALETTE,
          light: 1.18
        }
      );
      this._applyOdachiStrike(enemy, game, {
        damage: 28,
        reachFront: 224,
        hitStop: 0.038,
        shakeDur: 0.054,
        knockX: 18,
        knockY: -34,
        scarDx: 116,
        scarDy: -84,
        isMagenta: true,
        sfx: 'clang'
      });
    }

    // Step 4 (t = 0.60s): EMP Overload Dome Detonation + +32 HP NANO SHIELD!
    if ((this._skillStepMask & 8) === 0 && t >= 0.60) {
      this._skillStepMask |= 8;
      const empX = this.x + this.facing * 82;
      game?.renderer?.triggerShake?.(14, 0.26);
      game?.audio?.play?.('emp_blast', empX);
      this.fx?.spawn('empOverloadDome', this._safeFxX(empX, game), this._safeFxY(this.groundY), {
        palette: CYBER_NEON_PALETTE,
        warmup: 0.36,
        light: 1.18,
        extra: { radius: 48, fringe: '#ec4899' }
      });
      this.spawnVfxAnim(2, empX, this.groundY - 82, 212, 212, 0.38, {
        flipX: this.facing < 0,
        foreground: true
      });
      this.heal(32, 'NANO SHIELD');
      this._applyOdachiStrike(enemy, game, {
        damage: 48,
        reachFront: 236,
        hitStop: 0.052,
        shakeDur: 0.076,
        knockX: 112,
        knockY: -152,
        isCrit: true,
        scarDx: 32,
        scarDy: -140,
        isMagenta: true,
        sfx: 'emp_blast'
      });
    }

    if (t >= dur) {
      this.vx = 0;
      this.y = this.groundY;
      this.unstoppablePoise = false;
      this.setState('IDLE');
    }
  }

  /**
   * OVERDRIVE (`1.92s`, Row 4 `120..149`):
   * `VALKYRIE VISOR HYPER-LASER` — Backstep thruster vault + Singularity Reactor charge +
   * 3 rapid Visor Hyper-Laser pulses + final overcharged Supernova Detonation!
   */
  updateUltimate(_dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.ultDuration || 1.92;
    this.isInvulnerable = true;
    this.vx = 0;
    this.vy = 0;

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
      this.fx?.spawn('singularityReactor', this._safeFxX(this._ultFocusX, game), this._safeFxY(this.groundY), {
        palette: CYBER_NEON_PALETTE,
        light: 1.18,
        extra: { radius: 40, coreY: -32 }
      });
      this.spawnVfxAnim(5, this._ultFocusX, this.groundY - 10, 260, 128, 1.55, {
        foreground: false
      });
    }

    if (enemy && !enemy.isDead && t < 1.35) {
      this._ultFocusX = this._clampArenaX(enemy.x, game);
    }

    if (t < 0.36) {
      const backU = t / 0.36;
      const ease = 1 - Math.pow(1 - backU, 2.2);
      this.x = this._ultStartX + (this._ultRetreatX - this._ultStartX) * ease;
      this.y = this.groundY - Math.sin(backU * Math.PI) * 44;
      this.trueUltFrameOverride = 120 + Math.min(7, Math.floor(backU * 8));
      this._overrideFrameIdx = this.trueUltFrameOverride;
    } else {
      this.y = this.groundY;
      const fireU = Math.min(1, (t - 0.36) / (dur - 0.36));
      this.trueUltFrameOverride = 128 + Math.min(21, Math.floor(fireU * 22));
      this._overrideFrameIdx = this.trueUltFrameOverride;
    }

    // 3 Rapid Visor Laser Pulses (`0.68s, 0.96s, 1.22s`)
    const pulseTimes = [0.68, 0.96, 1.22];
    while (this._ultStep >= 1 && this._ultStep <= 3 && t >= pulseTimes[this._ultStep - 1]) {
      const pulseIdx = this._ultStep;
      this._ultStep++;
      const visorX = this.x + this.facing * 20;
      const visorY = this.groundY - 134;
      const beamDx = Math.max(-200, Math.min(200, (this._ultFocusX - visorX) / 3));
      const beamDy = Math.max(-60, Math.min(52, (this.groundY - 94 - visorY) / 3));

      this.fx?.spawn('visorHyperLaserBeam', this._safeFxX(visorX, game), this._safeFxY(visorY), {
        flip: false,
        palette: pulseIdx % 2 === 0 ? CYBER_MAGENTA_PALETTE : CYBER_NEON_PALETTE,
        light: 1.22,
        extra: {
          dx: beamDx,
          dy: beamDy,
          width: 5.8,
          seed: 21 + pulseIdx * 7
        }
      });
      this.fireFinFunnelVolley(enemy, game, 2, 10);

      const foes = this.getEnemyTargets(enemy, game);
      for (const foe of foes) {
        if (Math.abs(foe.x - this._ultFocusX) <= 320 || foe === enemy) {
          if (!foe.isColossalBoss) {
            foe.x += (this._ultFocusX - foe.x) * 0.28;
          }
          foe.takeDamage(34, this, false, 24, 0);
          foe._hitShakeTimer = Math.max(foe._hitShakeTimer || 0, 0.05);
        }
      }
      game?.renderer?.triggerShake?.(7, 0.12);
      game?.audio?.play?.('cyber_beam', this._ultFocusX);
    }

    // Final Overcharged Visor Hyper-Laser + Supernova Detonation at t >= 1.48s
    if (this._ultStep === 4 && t >= 1.48) {
      this._ultStep = 5;
      const visorX = this.x + this.facing * 20;
      const visorY = this.groundY - 134;
      const beamDx = Math.max(-200, Math.min(200, (this._ultFocusX - visorX) / 3));
      const beamDy = Math.max(-60, Math.min(52, (this.groundY - 92 - visorY) / 3));

      this.fx?.spawn('visorHyperLaserBeam', this._safeFxX(visorX, game), this._safeFxY(visorY), {
        flip: false,
        palette: CYBER_MAGENTA_PALETTE,
        light: 1.28,
        extra: {
          dx: beamDx,
          dy: beamDy,
          width: 7.4,
          seed: 55
        }
      });
      this.fx?.spawn('supernovaExplosion', this._safeFxX(this._ultFocusX, game), this._safeFxY(this.groundY - 88), {
        palette: CYBER_MAGENTA_PALETTE,
        light: 1.24
      });
      this.fx?.spawn('empOverloadDome', this._safeFxX(this._ultFocusX, game), this._safeFxY(this.groundY), {
        palette: CYBER_NEON_PALETTE,
        warmup: 0.42,
        light: 1.2,
        extra: { radius: 52, fringe: '#ec4899' }
      });

      const foes = this.getEnemyTargets(enemy, game);
      for (const foe of foes) {
        if (Math.abs(foe.x - this._ultFocusX) <= 370 || foe === enemy) {
          foe.takeDamage(148, this, true, 200, -180);
          this.spawnRazorScar(foe.x, foe.y - 96, 144, -96, 0.30, true);
        }
      }
      game?.renderer?.triggerShake?.(15, 0.28);
      game?.renderer?.triggerAberration?.(8);
      game?.renderer?.triggerHitStop?.(0.05);
      game?.audio?.play?.('emp_blast', this._ultFocusX);
    }

    if (t >= dur) {
      this.y = this.groundY;
      this.isInvulnerable = false;
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      this.setState('IDLE');
    }
  }

  /**
   * 3-Overdrive Supreme Finisher (`4.45s`):
   * `PROJECT GUNG-09: ORBITAL SINGULARITY BUSTER`
   * Never changes stage background image (`overrideArena` / `setStageTransformation` is never called).
   */
  updateTrueUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const advBounds =
      game?.adventure?.active && typeof game.adventure.getActiveStageBounds === 'function'
        ? game.adventure.getActiveStageBounds()
        : null;
    this.isInvulnerable = true;
    this.unstoppablePoise = true;
    this.vx = 0;
    this.vy = 0;

    const targets = this.getEnemyTargets(enemy, game);

    if (t <= 2.75) {
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

    // Phase 1 (`0.00..1.15s`): Wing-Pylon Ascension & Orbital Satellite Target-Lock
    if (t < 1.15) {
      const uAsc = Math.min(1, t / 1.15);
      const ease = 1 - Math.pow(1 - uAsc, 2.4);
      this.y = this.groundY - 72 * ease;
      this.trueUltFrameOverride = 120 + Math.min(8, Math.floor(uAsc * 9));
      this._overrideFrameIdx = this.trueUltFrameOverride;

      if (t >= 0.04 && this._trueUltStep < 1) {
        this._trueUltStep = 1;
        this._trueUltStartX = this.x;
        this._trueUltRetreatX = this._clampArenaX(this.x - this.facing * 165, game);
        game?.audio?.play?.('ult_cast', this.x);
        game?.audio?.play?.('emp_blast', this.x);
        game?.vfx?.triggerCinematicCutIn?.(this, this.trueUltName, '#22d3ee');
        game?.vfx?.spawnDamageText?.(
          this.x,
          this.y - 188,
          0,
          true,
          'PROJECT GUNG-09: ORBITAL LOCK!',
          '#22d3ee'
        );
        this.fx?.spawn('wingPylonThruster', this._safeFxX(this.x - this.facing * 18, game), this._safeFxY(this.y - 146), {
          follow: this,
          offsetX: -18,
          offsetY: -146,
          flip: this.facing < 0,
          palette: CYBER_NEON_PALETTE,
          maxDuration: 3.15,
          light: 1.12,
          extra: { length: 22, tilt: -0.58 }
        });
        this.fx?.spawn('holoTargetReticle', this._safeFxX(this._trueUltTargetX, game), this._safeFxY(this.groundY), {
          palette: CYBER_NEON_PALETTE,
          light: 1.16,
          extra: { boxW: 26, boxH: 66 }
        });
      }
      if (this._trueUltStep >= 1) {
        this.x = this._trueUltStartX + (this._trueUltRetreatX - this._trueUltStartX) * ease;
      }
      return;
    }

    // Phase 2 (`1.15..3.05s`): 8-Drone All-Range Octagonal Funnel Convergence Grid
    if (t < 3.05) {
      this.y = this.groundY - 72 + Math.sin((t - 1.15) * 6.0) * 4;
      const uLock = Math.min(1, (t - 1.15) / 1.90);
      this.trueUltFrameOverride = 128 + Math.min(5, Math.floor(uLock * 6));
      this._overrideFrameIdx = this.trueUltFrameOverride;

      if (t >= 1.15 && this._trueUltStep < 2) {
        this._trueUltStep = 2;
        game?.audio?.play?.('cyber_beam', this._trueUltTargetX);
        game?.audio?.play?.('blink', this.x);
        game?.vfx?.spawnDamageText?.(
          this._trueUltTargetX,
          this.groundY - 196,
          0,
          true,
          'ALL-RANGE FUNNEL LOCK!',
          '#ec4899'
        );
      }

      if (t <= 3.00) {
        for (const foe of targets) {
          if (!foe.isDead && !foe.isColossalBoss) {
            foe.x += (this._trueUltTargetX - foe.x) * Math.min(1, dt * 7);
            foe.vx *= 0.2;
          }
        }
      }
      return;
    }

    // Phase 3 (`t >= 3.05s`, `_trueUltStep < 3`): Visor Hyper-Laser + Orbital Singularity Buster Column!
    if (t >= 3.05 && this._trueUltStep < 3) {
      this._trueUltStep = 3;
      this._trueUltBusterTimer = 1.00;

      const visorX = this.x + this.facing * 20;
      const visorY = this.y - 134;
      const beamDx = Math.max(-200, Math.min(200, (this._trueUltTargetX - visorX) / 3));
      const beamDy = Math.max(-60, Math.min(52, (this.groundY - 104 - visorY) / 3));
      this.fx?.spawn('visorHyperLaserBeam', this._safeFxX(visorX, game), this._safeFxY(visorY), {
        flip: false,
        palette: CYBER_NEON_PALETTE,
        light: 1.28,
        extra: {
          dx: beamDx,
          dy: beamDy,
          width: 7.5,
          seed: 99
        }
      });

      game?.renderer?.triggerImpactFrame?.(this._trueUltTargetX, this.groundY - 110, 0.10, 'cyber');
      game?.renderer?.triggerShake?.(28, 0.75);
      game?.renderer?.triggerAberration?.(12);
      game?.renderer?.triggerHitStop?.(0.08);

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
          light: 1.26
        }
      );
      this.fx?.spawn('empOverloadDome', this._safeFxX(this._trueUltTargetX, game), this._safeFxY(this.groundY), {
        palette: CYBER_MAGENTA_PALETTE,
        warmup: 0.42,
        light: 1.22,
        extra: { radius: 56, fringe: '#22d3ee' }
      });

      for (const foe of targets) {
        if (!foe.isDead) {
          foe.takeDamage(705, this, true, 330, -270);
          this.fx?.spawn('rgbGlitchTear', this._safeFxX(foe.x, game), this._safeFxY(foe.groundY || this.groundY), {
            follow: foe,
            offsetX: 0,
            offsetY: 0,
            palette: CYBER_NEON_PALETTE,
            maxDuration: 0.52,
            light: 1.08
          });
        }
      }
    }

    const uDesc = Math.min(1, Math.max(0, (t - 3.05) / (this.trueUltDuration - 3.05)));
    const easeDesc = uDesc * uDesc * (3 - 2 * uDesc);
    this.y = this.groundY - 72 * (1 - easeDesc);
    this.trueUltFrameOverride =
      t < 3.70
        ? 135 + Math.min(9, Math.floor(((t - 3.05) / 0.65) * 10))
        : 145 + Math.min(4, Math.floor(((t - 3.70) / 0.75) * 5));
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

    if (this.state === 'CROUCH' && !this.isDead && (this.stunTimer || 0) <= 0) {
      this.stateTimer += dt;
      this.updateCrouch(dt, enemy, game);
      return;
    }

    // Cyber-Valkyrie Optical Reflex AI: intercept incoming projectiles with Hex Matrix Guard (`CROUCH`)
    if (
      !this.isDead &&
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
   * Renders any cell `(row, col)` from `android_ex_vfx.png` (`6240x1664`) with strict `<= 0.13` bloom!
   * Zero `ctx.rotate`, zero `ctx.ellipse`!
   */
  drawBloomedVfxCell(ctx, vfxSheet, row, col, x, y, w, h, alpha = 0.95, flipX = false, renderer = null) {
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth || alpha <= 0.01) return;
    const sx = Math.max(0, Math.min(29, Math.floor(col))) * 208;
    const sy = Math.max(0, Math.min(7, Math.floor(row))) * 208;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(x), Math.round(y));
    if (flipX) ctx.scale(-1, 1);

    if (renderer?.glowCyber || renderer?.glowCyan) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(0.12, alpha * 0.10);
      const glowImg = renderer.glowCyber || renderer.glowCyan;
      ctx.drawImage(glowImg, -w * 0.56, -h * 0.56, w * 1.12, h * 1.12);
    }

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
    ctx.globalAlpha = Math.min(0.13, alpha * 0.12);
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

  drawPixelScarsAndFunnelBeams(ctx) {
    if (!this.razorScars.length && !this.funnelLaserBeams.length) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Coordinated Fin-Funnel Laser Pulses (`<= 0.14` bloom, crisp integer-stepped pixel beams)
    for (let i = 0; i < this.funnelLaserBeams.length; i++) {
      const b = this.funnelLaserBeams[i];
      const u = Math.min(1, b.age / b.maxLife);
      const fade = 1 - u;
      if (fade <= 0.02) continue;

      const dx = b.x1 - b.x0;
      const dy = b.y1 - b.y0;
      const steps = Math.max(14, Math.round(Math.max(Math.abs(dx), Math.abs(dy)) / 6));
      ctx.globalAlpha = Math.min(0.92, fade);
      for (let k = 0; k <= steps; k++) {
        const su = k / steps;
        const px = Math.round((b.x0 + dx * su) / 2) * 2;
        const py = Math.round((b.y0 + dy * su) / 2) * 2;
        ctx.fillStyle = b.isMagenta ? '#ec4899' : '#22d3ee';
        ctx.fillRect(px - 3, py - 3, 6, 6);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px - 1, py - 1, 2, 2);
      }
    }

    // 2. Integer-Stepped Cyber-Glitch Razor Slash-Scars
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

        ctx.fillStyle = s.isMagenta ? '#311042' : '#0891b2';
        ctx.fillRect(px - rad, py - rad, rad * 2, rad * 2);
        const mid = Math.max(2, rad - 2);
        ctx.fillStyle = s.isMagenta ? '#ec4899' : '#22d3ee';
        ctx.fillRect(px - mid, py - mid, mid * 2, mid * 2);
        if (taper > 0.35) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(px - 2, py - 2, 4, 4);
        }
      }
    }

    ctx.restore();
  }

  drawBehind(ctx, renderer = null) {
    if (this.state !== 'TRUE_ULTIMATE' && this._trueUltBusterTimer <= 0) return;
    const vfxSheet = PixelForge.ensureImage(this.getExSprites()?.vfx);
    if (!vfxSheet?.complete || !vfxSheet.naturalWidth) return;

    const t = this.stateTimer || 0;
    const col = Math.floor(t * 30) % 30;
    const fadeIn = Math.min(1, t / 0.22);
    const fadeOut =
      this.state === 'TRUE_ULTIMATE' && t > 3.25
        ? Math.max(0, 1 - (t - 3.25) / 0.85)
        : 1.0;
    const alpha = fadeIn * fadeOut * 0.94;
    if (alpha <= 0.02) return;

    this.drawBloomedVfxCell(
      ctx,
      vfxSheet,
      5,
      col,
      this._trueUltTargetX,
      this.groundY - 6,
      310,
      240,
      alpha,
      false,
      renderer
    );
  }

  drawForegroundOverlay(ctx, renderer = null) {
    const sprites = this.getExSprites();
    const sheet = PixelForge.ensureImage(sprites?.sheet);
    const vfxSheet = PixelForge.ensureImage(sprites?.vfx);

    this.drawBehind(ctx, renderer);

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

    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
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

    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    if (this.fx && !this.isDead) {
      this.fx.renderLayer(ctx, 'front', arenaCenterX, this.groundY, 0.98);
    }

    this.drawPixelScarsAndFunnelBeams(ctx);
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

    if (isReflection) return;
    const vfxSheet = PixelForge.ensureImage(sprites.vfx);
    if (!vfxSheet?.complete || !vfxSheet.naturalWidth) return;

    // Supreme Ultimate Phase 2 (`1.15..3.05s`): 8 Orbiting Row 6 Fin-Funnel Nodes in Octagonal Ring
    if (this.state === 'TRUE_ULTIMATE' && this.stateTimer >= 1.15 && this.stateTimer < 3.05) {
      const cx = this._trueUltTargetX;
      const cy = this.groundY - 110;
      const baseCol = Math.floor(this.stateTimer * 30) % 30;
      const ringProgress = Math.min(1, (this.stateTimer - 1.15) / 0.25);

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 8; i++) {
        const ang = i * (Math.PI * 0.25) + this.stateTimer * 2.8;
        const dx = cx + Math.cos(ang) * (168 * ringProgress);
        const dy = cy + Math.sin(ang) * (114 * ringProgress);
        ctx.strokeStyle = i % 2 === 0 ? '#22d3ee' : '#ec4899';
        ctx.globalAlpha = 0.14;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(Math.round(dx), Math.round(dy));
        ctx.lineTo(Math.round(cx), Math.round(cy));
        ctx.stroke();
      }
      ctx.restore();

      for (let i = 0; i < 8; i++) {
        const ang = i * (Math.PI * 0.25) + this.stateTimer * 2.8;
        const dx = cx + Math.cos(ang) * (168 * ringProgress);
        const dy = cy + Math.sin(ang) * (114 * ringProgress);
        this.drawBloomedVfxCell(
          ctx,
          vfxSheet,
          6,
          (baseCol + i * 3) % 30,
          dx,
          dy,
          144,
          144,
          0.92 * ringProgress,
          Math.cos(ang) < 0,
          renderer
        );
      }
    }

    // Supreme Ultimate Phase 3 (`_trueUltBusterTimer > 0`): Seamless vertical Row 7 Orbital Buster Column (`<= 0.14` bloom!)
    if (this._trueUltBusterTimer > 0) {
      const busterProg = 1.0 - Math.max(0, Math.min(1, this._trueUltBusterTimer / 1.0));
      const col = Math.min(29, Math.floor(busterProg * 30));
      const alpha = this._trueUltBusterTimer < 0.28 ? this._trueUltBusterTimer / 0.28 : 0.98;
      const sx = col * 208;
      const sy = 7 * 208;
      const cx = Math.round(this._trueUltTargetX);
      const colW = 340;
      const halfW = Math.round(colW * 0.5);
      const coreSliceY = sy + 32;
      const coreSliceH = 144;
      const baseSliceH = 176;
      const stepH = 180;
      const baseH = 220;
      const baseBotY = Math.round(this.groundY + 24);
      const trunkBotY = baseBotY - baseH;

      ctx.save();
      ctx.imageSmoothingEnabled = false;

      if (renderer?.glowCyber || renderer?.glowCyan) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(0.12, alpha * 0.12);
        const glowImg = renderer.glowCyber || renderer.glowCyan;
        ctx.drawImage(glowImg, cx - colW * 0.72, this.groundY - 660, colW * 1.44, 700);
      }

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = Math.min(1, alpha * 0.97);
      ctx.drawImage(vfxSheet, sx, coreSliceY, 208, baseSliceH, cx - halfW, trunkBotY, colW, baseH);
      for (let seg = 0; seg < 4; seg++) {
        const yTop = trunkBotY - (seg + 1) * stepH;
        ctx.drawImage(vfxSheet, sx, coreSliceY, 208, coreSliceH, cx - halfW, yTop, colW, stepH);
      }

      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(0.13, alpha * 0.13);
      ctx.drawImage(vfxSheet, sx, coreSliceY, 208, baseSliceH, cx - halfW, trunkBotY, colW, baseH);
      for (let seg = 0; seg < 4; seg++) {
        const yTop = trunkBotY - (seg + 1) * stepH;
        ctx.drawImage(vfxSheet, sx, coreSliceY, 208, coreSliceH, cx - halfW, yTop, colW, stepH);
      }

      ctx.restore();
    }
  }
}
