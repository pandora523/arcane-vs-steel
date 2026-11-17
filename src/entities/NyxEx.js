import { Fighter } from './Fighter.js?v=30fps126';
import { PixelForge } from '../engine/PixelForge.js?v=30fps126';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps126';
import { NEBULA_EFFECT_REGISTRY } from '../engine/shaders/nebulaShaders.js?v=30fps126';
import { ExParticleSystem, drawExBayerHalo } from '../engine/shaders/exNextGenFX.js?v=30fps126';

const AUTO_SLICES_EX = [
  [60, 8], // Beat 1 (V0, 0.34s): Finger-tap on prompt panel -> Twin Star-Packet Bolts (snaps F03/63)
  [68, 7], // Beat 2 (V1, 0.32s): Galaxy sleeve swipe -> Spinning Holo-Window Projectile (snaps F09/69)
  [75, 8], // Beat 3 (V2, 0.38s): Cute Pose-B paw boop -> Remote 404 Pop-Up zap on enemy.x (snaps F17/77)
  [83, 7]  // Beat 4 (V3, 0.48s): -36px kiting step + [ENTER] slam -> Neko-AI Orb Nebula Laser (snaps F25/85)
];

const BEAT_DURATIONS = [0.34, 0.32, 0.38, 0.48];
const INTRA_COMBO_LINK = 0.015;

/**
 * Nyx EX (`nyx_ex`) — Next-Gen Cosmic Nebula AI Assistant Created by Cob.
 * Pure Ranged Holographic UI Caster & Agile Kiter (`320x240`, `anchorX=112, anchorY=230`,
 * `516px` range, Auto-Patch Holo-Shield, Ctrl+Z Glitch Blink AFK Decoy, & Cob Creator Seals).
 */
export class NyxEx extends Fighter {
  constructor(x, groundY, facing = 1) {
    const opts = typeof x === 'object' && x !== null ? x : { x, groundY, facing };
    super({
      ...opts,
      name: opts.name || 'Nyx EX',
      maxHp: 3740,
      attackRange: 516,
      moveSpeed: 170,
      autoInterval: 1.00,
      lightColor: 'rgba(192, 132, 252, 1)',
      primaryColor: '#c084fc',
      secondaryColor: '#22d3ee',
      hasTrueUltimate: true,
      trueUltName: 'GENESIS PROMPT: POWERED BY COB',
      trueUltDuration: 3.60
    });

    this.heroId = 'nyx_ex';
    this.theme = 'nebula';
    this.deathSfx = 'death_mage';
    this.hasPoise = true;

    this.autoDuration = BEAT_DURATIONS[0];
    this._postFlurryInterval = 1.42;

    this.skillName = '404 POP-UP CASCADE';
    this.skillMaxCooldown = 4.40;
    this.skillCooldown = 1.10;
    this.skillDuration = 1.02;
    this.skillTriggerRange = 516;

    this.ultName = 'COB-OS: STARLIGHT OVERCLOCK';
    this.ultSub = 'SIX-WINDOW ORBITAL RING & COB SEAL';
    this.ultDuration = 1.56;

    this.trueUltName = 'GENESIS PROMPT: POWERED BY COB';
    this.trueUltSub = 'SUPREME CREATOR CORE - SUPERNOVA PROMPT';
    this.trueUltDuration = 3.60;

    // Passive & AI-Assistant Mechanics
    this.haloPhase = 0;
    this.contextTokens = 0;
    this.holoPatchShield = 0;
    this.holoPatchTimer = 0;
    this._ctrlZCd = 0;
    this.dodgeMaxCooldown = 3.30;
    this.dashMaxCooldown = 3.15;
    this.crouchCooldown = 0;
    this.crouchDuration = 0.88;
    this.isCrouching = false;
    this.isDeflecting = false;
    this.isBlinkTeleport = false;
    this.isFlipVault = false;

    // 4-Beat Combo State
    this.comboStep = 0;
    this._autoVariant = 0;
    this._comboPersistTimer = 0;
    this._queuedNextBeat = false;
    this._intraLinkTimer = 0;
    this._beatHitMask = 0;
    this._beatStartX = this.x;
    this._beatTargetX = this.x;
    this._bootsPlanted = false;
    this._v2RemoteX = this.x + 320;
    this._v3RemoteX = this.x + 340;
    this._beat4Laser = null;

    // Skill / Overdrive / Supreme True Ult State
    this._skillPhase = 0;
    this._skillTargetX = this.x + 320;
    this._ultNodesActive = false;
    this._ultTargetX = this.x + 320;
    this._ultStep = 0;
    this._supernovaFired = false;
    this._supernovaBeamTimer = 0;
    this._supernovaTargetX = this.x + 360;
    this._supernovaMuzzleX = this.x + 48;
    this._supernovaBeamY = this.y - 104;

    this._overrideFrameIdx = null;
    this.afterimages = [];
    this.afterimageAccum = 0;
    this.activeVfxAnims = [];
    this.afkDecoys = [];
    this._exParticles = new ExParticleSystem('nyx_ex', '#c084fc');

    this.fx = new ArcaneShaderFX(NEBULA_EFFECT_REGISTRY, {
      pixelScale: 2,
      viewW: 736,
      viewH: 464
    });

    if (typeof Image !== 'undefined') {
      PixelForge.ensureHeroLoaded?.('nyx_ex');
    }
  }

  isHackAndSlashMelee() {
    return false;
  }

  isHackAndSlashCaster() {
    return false;
  }

  hasHackAndSlashCombo() {
    return false;
  }

  getAiStyleProfile() {
    return {
      comboGoal: 4,
      sweetMin: 315,
      sweetMax: 440,
      counterCrouchBias: 0.52,
      midLeapMin: 0,
      midLeapMax: 0,
      midLeapChance: 0,
      postStyle: 'nebula_ai'
    };
  }

  getExSprites() {
    const assets = PixelForge.initAssets();
    if (!assets) return null;
    if (!assets.nyx_ex) {
      const mkImg = (src) => {
        if (typeof Image === 'undefined') return { complete: false, naturalWidth: 0, width: 0, src };
        const im = new Image();
        im.src = src;
        return im;
      };
      assets.nyx_ex = {
        sheet: mkImg('assets/sprites/nyx_ex_sheet.png?v=30fps126'),
        vfx: mkImg('assets/sprites/nyx_ex_vfx.png?v=30fps126'),
        portrait: mkImg('assets/sprites/nyx_ex_portrait.png?v=30fps126')
      };
    } else if (typeof Image !== 'undefined') {
      PixelForge.ensureHeroLoaded?.('nyx_ex');
    }
    return assets.nyx_ex;
  }

  _clampArenaX(xv, game) {
    const bounds = game?.adventure?.isActive && game.adventure.getActiveStageBounds
      ? game.adventure.getActiveStageBounds()
      : null;
    const minX = bounds ? bounds.minX : (
      game?.adventure?.lockActive && Number.isFinite(game.adventure.lockMinX)
        ? game.adventure.lockMinX
        : 84
    );
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const rawMaxX = bounds ? bounds.maxX : (
      game?.adventure?.lockActive && Number.isFinite(game.adventure.lockMaxX)
        ? game.adventure.lockMaxX
        : ww - 84
    );
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
    const ww = game?.renderer?.worldWidth || 1200;
    return Math.max(48, Math.min(ww - 48, Number.isFinite(xv) ? xv : this.x));
  }

  _resolveShaderCenterX(renderer) {
    const ww = renderer?.worldWidth || 1280;
    if (ww <= 1600) return ww * 0.5;
    const camCenter = Number.isFinite(renderer?.cameraX) ? renderer.cameraX + 640 : this.x;
    return Math.max(810, Math.min(ww - 810, camCenter));
  }

  _spawnProj(game, proj) {
    if (game?.vfx?.spawnProjectile) {
      game.vfx.spawnProjectile(proj);
    } else if (game?.spawnProjectile) {
      game.spawnProjectile(proj);
    }
  }

  takeDamage(amount, attacker, isCrit = false, knockX = 0, knockY = 0) {
    if (this.isInvulnerable || this.state === 'TRUE_ULTIMATE') {
      return 0;
    }
    const preHp = this.hp;
    let finalAmt = Math.max(0, Math.round(amount || 0));
    if (this.holoPatchTimer > 0 && this.holoPatchShield > 0 && finalAmt > 0) {
      const absorbed = Math.min(this.holoPatchShield, finalAmt);
      this.holoPatchShield -= absorbed;
      finalAmt -= absorbed;
      this.spawnHitStarburst(this.x, this.y - 88, '#22d3ee', '#c084fc', 0.9);
      if (this.holoPatchShield <= 0) this.holoPatchTimer = 0;
      if (finalAmt <= 0) {
        this.game?.vfx?.spawnDamageText?.(this.x, this.y - 134, 0, false, 'AUTO-PATCH!', '#a5f3fc');
        return 0;
      }
    }
    super.takeDamage(finalAmt, attacker, isCrit, knockX, knockY);
    const dealt = Math.max(0, preHp - this.hp);
    if (
      dealt > 0 &&
      !this.isDead &&
      !this._advPureDodge &&
      this._ctrlZCd <= 0 &&
      attacker &&
      Math.abs(attacker.x - this.x) < 165 &&
      this.state !== 'SKILL' &&
      this.state !== 'DEATH'
    ) {
      this._triggerCtrlZGlitchBlink(attacker, this.game);
    }
    return dealt;
  }

  _triggerCtrlZGlitchBlink(enemy, game) {
    if (this._advPureDodge || this.isDead) return false;
    this._ctrlZCd = 4.2;
    const oldX = this.x;
    const dirAway = enemy ? (this.x >= enemy.x ? 1 : -1) : -this.facing;
    let targetX = this._clampArenaX(oldX + dirAway * 210, game);
    if (Math.abs(targetX - oldX) < 110) {
      targetX = this._clampArenaX(oldX - dirAway * 210, game);
    }

    // Leave behind Row 6 "AFK" Holographic Neko Decoy at old position
    this.spawnVfxAnim(6, oldX, this.groundY - 96, 152, 152, 1.15, {
      flipX: this.facing < 0,
      inFront: true
    });
    if (this.afkDecoys.length >= 4) this.afkDecoys.shift();
    this.afkDecoys.push({ x: oldX, y: this.groundY - 96, age: 0, maxLife: 1.15, detonated: false });

    this.x = targetX;
    this.y = this.groundY;
    this.vy = 0;
    if (enemy && !enemy.isDead) {
      this.facing = enemy.x >= this.x ? 1 : -1;
    }
    this.isInvulnerable = true;
    this.spawnAfterimage(oldX, this.groundY, this.facing, 6, 8, 0.24);
    this.fx?.spawn('nebulaPromptBurst', this._safeFxX(oldX, game), this.groundY - 84, { light: 1.12 });
    this.fx?.spawn('nebulaPromptBurst', this._safeFxX(this.x, game), this.groundY - 84, { light: 1.15 });
    this.spawnNebulaCluster(this.x, this.groundY - 84, 7, 130);
    game?.vfx?.spawnDamageText?.(oldX, this.groundY - 138, 0, false, 'CTRL+Z BLINK!', '#22d3ee');
    if (game?.audio) game.audio.play('dash_whoosh', this.x);
    return true;
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

    if (newState === 'WALK' || newState === 'IDLE') {
      this._overrideFrameIdx = null;
      this.trueUltFrameOverride = null;
    }

    if (newState === 'AUTO_ATTACK') {
      if (this._comboPersistTimer <= 0 && prevState !== 'AUTO_ATTACK') {
        this.comboStep = 0;
      }
      this.y = this.groundY;
      this.vy = 0;
      this._beginComboBeat(this.comboStep % 4, this.game);
    } else if (newState !== 'ULTIMATE' && newState !== 'TRUE_ULTIMATE') {
      this._overrideFrameIdx = null;
      this.trueUltFrameOverride = null;
    }

    if (newState === 'SKILL') {
      this._skillPhase = 0;
      this.y = this.groundY;
      this.vy = 0;
    }

    if (newState === 'ULTIMATE') {
      this._ultStep = 0;
      this._ultNodesActive = false;
      this.isInvulnerable = true;
    } else {
      this._ultNodesActive = false;
    }

    if (newState === 'TRUE_ULTIMATE') {
      this.isInvulnerable = true;
      this.unstoppablePoise = true;
      this.hurtTimer = 0;
      this.isCrouching = false;
      this.isDeflecting = false;
      this._supernovaFired = false;
      this._supernovaBeamTimer = 0;
    } else {
      this._supernovaFired = false;
      this._supernovaBeamTimer = 0;
      if (newState !== 'AUTO_ATTACK') {
        this.unstoppablePoise = false;
      }
    }

    if (newState === 'DEATH') {
      this.fx?.clear();
      this._exParticles?.clear();
      this._beat4Laser = null;
      this._supernovaBeamTimer = 0;
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
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
    this._comboPersistTimer = 0.80;
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
    let stepDelta = v === 3 ? -36 : v === 0 ? 10 : v === 1 ? 12 : 8;
    if (enemy && !enemy.isDead) {
      const horizDist = Math.abs(enemy.x - this.x);
      if (v === 3) stepDelta = -36;
      else if (horizDist < 220) stepDelta = -26;
    }
    this._beatTargetX = this._clampArenaX(this.x + this.facing * stepDelta, game);
  }

  queueNextComboBeat() {
    this._queuedNextBeat = true;
  }

  spawnExParticle(opts) {
    if (!opts || !Number.isFinite(opts.x) || !Number.isFinite(opts.y)) return;
    if (opts.shape === 'ring') {
      this._exParticles?.spawnRing(
        opts.x,
        opts.y,
        opts.size || 48,
        opts.color || '#c084fc',
        opts.coreColor || '#22d3ee',
        false,
        opts.maxLife || 0.24
      );
      return;
    }
    this._exParticles?.spawn({
      shape: opts.shape || 'star4',
      x: opts.x,
      y: opts.y,
      vx: opts.vx || 0,
      vy: opts.vy || 0,
      gravity: opts.gravity ?? -18,
      swayAmp: 8,
      swayFreq: 4.5,
      size: opts.size || 3,
      color: opts.color || '#c084fc',
      accent: '#22d3ee',
      core: opts.coreColor || '#ffffff',
      maxLife: opts.maxLife || 0.36,
      layer: opts.layer || 'front'
    });
  }

  spawnNebulaCluster(x, y, count = 6, speed = 135) {
    this._exParticles?.burst(x, y, {
      count,
      shapes: ['star4', 'diamond', 'rune'],
      speedMin: Math.max(36, speed * 0.4),
      speedMax: speed,
      upBias: 32,
      color: '#c084fc',
      accent: '#22d3ee',
      core: '#ffffff',
      layer: 'front'
    });
  }

  spawnHitStarburst(x, y, primaryHex = '#c084fc', accentHex = '#22d3ee', _scale = 1.0) {
    this._exParticles?.spawnHitStarburst(Math.round(x), Math.round(y), primaryHex, accentHex, 0.18);
  }

  spawnAfterimage(x, y, facing, row = 2, col = 4, maxLife = 0.22) {
    if (this.afterimages.length >= 10) this.afterimages.shift();
    this.afterimages.push({
      x,
      y,
      facing,
      frameIdx: row * 30 + (col % 30),
      life: 0,
      maxLife
    });
  }

  spawnVfxAnim(row, x, y, w = 180, h = 180, maxLife = 0.32, opts = {}) {
    if (this.activeVfxAnims.length >= 24) this.activeVfxAnims.shift();
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
      flipX: opts.flipX !== undefined ? Boolean(opts.flipX) : false,
      followOwner: Boolean(opts.followOwner),
      offsetX: opts.offsetX || 0,
      offsetY: opts.offsetY || 0,
      inFront: opts.inFront !== undefined ? Boolean(opts.inFront) : true,
      startFrame: opts.startFrame ?? 0,
      endFrame: opts.endFrame ?? 29
    });
  }

  _resolveRangedTarget(primaryEnemy, game, maxDist = 640) {
    if (
      primaryEnemy &&
      !primaryEnemy.isDead &&
      !primaryEnemy.isBenched &&
      !primaryEnemy.isDummyFocal &&
      (primaryEnemy.x - this.x) * this.facing >= -40 &&
      Math.abs(primaryEnemy.x - this.x) <= maxDist
    ) {
      return primaryEnemy;
    }
    const list = game?.getEnemiesOf ? game.getEnemiesOf(this) : [];
    let best = null;
    let bestDist = Infinity;
    if (Array.isArray(list)) {
      for (let i = 0; i < list.length; i++) {
        const f = list[i];
        if (!f || f.isDead || f.isBenched || f.isDestructibleProp) continue;
        const rel = (f.x - this.x) * this.facing;
        const d = Math.abs(f.x - this.x);
        if (rel >= -36 && d <= maxDist && d < bestDist) {
          bestDist = d;
          best = f;
        }
      }
    }
    if (
      !best &&
      game?.isAdventureMode?.() &&
      game?.adventure?.bossEntity &&
      !game.adventure.bossEntity.isDead
    ) {
      const boss = game.adventure.bossEntity;
      if (Math.abs(boss.x - this.x) <= maxDist + 140) return boss;
    }
    return best;
  }

  _applyRemoteNebulaStrike(centerX, radius, damage, game, primaryEnemy, opts = {}) {
    const {
      isCrit = false,
      knockX = 24,
      knockY = -30,
      hitStop = 0.036,
      shakeDur = 0.048
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
    pushCand(primaryEnemy);
    if (game?.getEnemiesOf) {
      const list = game.getEnemiesOf(this);
      if (Array.isArray(list)) {
        for (let i = 0; i < list.length; i++) pushCand(list[i]);
      }
    }
    if (isAdv && Array.isArray(game.adventure.enemies)) {
      for (let i = 0; i < game.adventure.enemies.length; i++) pushCand(game.adventure.enemies[i]);
    }
    if (isAdv && game.adventure.bossEntity) pushCand(game.adventure.bossEntity);

    let landed = false;
    for (let i = 0; i < cands.length; i++) {
      const foe = cands[i];
      const pad = foe.isColossalBoss ? 92 : 0;
      if (Math.abs(foe.x - centerX) > radius + pad) continue;
      if (isAdv && !foe.isColossalBoss) {
        const foeGy = foe.groundY || foe.y;
        if (Math.abs(foeGy - myGy) > 76) continue;
      }
      const dmg = i === 0 ? damage : Math.max(12, Math.round(damage * 0.85));
      foe.takeDamage(dmg, this, isCrit, knockX, knockY);
      if (!foe.isDead && !foe.isColossalBoss) {
        foe._hitStopTimer = Math.max(foe._hitStopTimer || 0, hitStop);
        foe._hitShakeTimer = Math.max(foe._hitShakeTimer || 0, shakeDur);
      }
      const hitY = foe.y - (foe.isColossalBoss ? 128 : 92);
      this.spawnHitStarburst(foe.x, hitY, '#22d3ee', '#d946ef', isCrit ? 1.2 : 1.0);
      this.spawnNebulaCluster(foe.x, hitY, isCrit ? 7 : 5, 130);
      landed = true;
    }
    if (landed && hitStop > 0) {
      this._hitStopTimer = Math.max(this._hitStopTimer || 0, Math.min(0.036, hitStop));
    }
    return landed;
  }

  onProjectileTrail(p) {
    if (!p || p.type !== 'nebula_packet') return;
    p.ringTimer = (p.ringTimer || 0) + 0.016;
    if (p.ringTimer >= 0.048) {
      p.ringTimer = 0;
      this.spawnExParticle({
        x: p.x - Math.sign(p.vx || 1) * 12,
        y: p.y + (((p.age * 60) | 0) % 2 === 0 ? -3 : 3),
        vx: -Math.sign(p.vx || 1) * 32,
        vy: -14,
        shape: ((p.age * 30) | 0) % 2 === 0 ? 'star4' : 'diamond',
        size: 3.5,
        color: '#22d3ee',
        coreColor: '#ffffff',
        maxLife: 0.22
      });
    }
  }

  onProjectileHit(p, _hitTarget, isCrit, game) {
    this.fx?.spawn('nebulaPromptBurst', this._safeFxX(p.x, game), p.y, {
      light: isCrit ? 1.24 : 1.12
    });
    this.spawnHitStarburst(p.x, p.y, '#c084fc', '#22d3ee', isCrit ? 1.2 : 1.0);
    this.spawnNebulaCluster(p.x, p.y, isCrit ? 7 : 5, 140);
    if (game?.vfx && isCrit) {
      game.vfx.spawnGlyphBurst(p.x, p.y, 4, 'nebula');
    }
    return true;
  }

  onStartDash(_enemy, game, dir) {
    this.dashDuration = 0.34;
    this.dashDir = dir || this.facing;
    this.isBlinkTeleport = false;
    this.isFlipVault = false;
    if (game?.audio) game.audio.play('dash_whoosh', this.x);
    this.spawnNebulaCluster(this.x, this.y - 84, 5, 110);
  }

  updateDash(_dt, enemy) {
    const t = this.stateTimer;
    const dur = this.dashDuration || 0.34;
    const dir = this.dashDir || this.facing;
    this.vy = 0;
    this.y = this.groundY;
    if (t < dur * 0.78) {
      const distToEnemy = enemy && !enemy.isDead ? (enemy.x - this.x) * dir : 999;
      this.vx = distToEnemy <= 340 && distToEnemy >= 0 ? 0 : dir * 480;
    } else {
      this.vx = 0;
    }
    if (t >= dur) {
      this.vx = 0;
      this.setState('IDLE');
    }
  }

  startJump(enemy, game, customDir = null) {
    this.dodgeCooldown = this.dodgeMaxCooldown * 0.92;
    this.setState('JUMP');
    this.isInvulnerable = true;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    let dir = customDir !== null ? customDir : -this.facing;
    if (this.x < 185) dir = 1;
    else if (this.x > ww - 185) dir = -1;
    this.dashStartX = this.x;
    this.dashTargetX = this._clampArenaX(this.x + dir * 240, game);
    this.dashDuration = 0.54;
    this.didActionFrame = false;
    this.vx = 0;
    this.vy = 0;
    if (game?.audio) game.audio.play('dash_whoosh', this.x);
    this.spawnNebulaCluster(this.x, this.groundY - 82, 6, 120);
    if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 220 && !this._advPureDodge && this._ctrlZCd <= 0) {
      this._triggerCtrlZGlitchBlink(enemy, game);
      this.setState('IDLE');
    }
  }

  onStartDodge(_enemy, game, dir) {
    if (this._advPureDodge) return;
    this.isInvulnerable = true;
    this.dashStartX = this.x;
    const stepDir = dir || -this.facing;
    this.dashTargetX = this._clampArenaX(this.x + stepDir * 220, game);
    this.dashDuration = 0.44;
    this.didActionFrame = false;
  }

  updateJump(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.dashDuration || 0.54;
    const u = Math.min(1, Math.max(0, t / dur));
    if (this._advPureDodge) {
      this.y = this.groundY - Math.sin(u * Math.PI) * 34;
      if (u >= 1) {
        this.y = this.groundY;
        this.vx = 0;
        this.vy = 0;
        this.isInvulnerable = false;
        this.setState('IDLE');
      }
      return;
    }
    this.x = (this.dashStartX ?? this.x) + ((this.dashTargetX ?? this.x) - (this.dashStartX ?? this.x)) * (1 - Math.pow(1 - u, 2));
    this.y = this.groundY - Math.sin(u * Math.PI) * 76;
    this.isInvulnerable = u < 0.72;

    if (!this.didActionFrame && u >= 0.45) {
      this.didActionFrame = true;
      const aimFoe = this._resolveRangedTarget(enemy, game);
      if (aimFoe) this.facing = aimFoe.x >= this.x ? 1 : -1;
      const sx = this.x + this.facing * 42;
      const sy = this.y - 84;
      const dx = aimFoe ? aimFoe.x - sx : this.facing * 420;
      const dy = aimFoe ? aimFoe.y - 90 - sy : 0;
      const len = Math.hypot(dx, dy) || 1;
      this._spawnProj(game, {
        x: sx,
        y: sy,
        vx: (dx / len) * 740,
        vy: (dy / len) * 740,
        radius: 15,
        maxRange: 640,
        color: '#22d3ee',
        coreColor: '#ffffff',
        owner: this,
        damage: 38,
        type: 'nebula_packet',
        isMeteor: false
      });
    }

    if (u >= 1) {
      this.y = this.groundY;
      this.vx = 0;
      this.vy = 0;
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  updateDodge(dt, enemy, game) {
    this.updateJump(dt, enemy, game);
  }

  updateDashOrDodge(dt, enemy, game) {
    if (this._advPureDodge) {
      this.updateJump(dt, enemy, game);
      return;
    }
    if (this.state === 'DASH') this.updateDash(dt, enemy, game);
    else this.updateJump(dt, enemy, game);
  }

  startCrouch(_enemy, game) {
    this.crouchCooldown = 3.6;
    this.crouchDuration = 0.88;
    this.setState('CROUCH');
    this.isCrouching = true;
    this.isDeflecting = true;
    this.vx = 0;
    this.y = this.groundY;
    this.holoPatchShield = Math.max(this.holoPatchShield, 65);
    this.holoPatchTimer = Math.max(this.holoPatchTimer, 2.2);
    this.fx?.spawn('nebulaPromptBurst', this._safeFxX(this.x, game), this.groundY - 76, { light: 1.1 });
    if (game?.audio) game.audio.play('clock_gear', this.x);
  }

  updateCrouch(_dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.crouchDuration || 0.88;
    this.vx = 0;
    this.y = this.groundY;
    this.isCrouching = t < dur * 0.82;
    this.isDeflecting = t < 0.50;

    if (this.isDeflecting && game?.vfx?.projectiles) {
      for (const proj of game.vfx.projectiles) {
        if (
          proj.owner !== this &&
          !proj._reflectedByNyx &&
          Math.abs(proj.x - this.x) < 92 &&
          Math.abs(proj.y - (this.y - 84)) < 92
        ) {
          proj._reflectedByNyx = true;
          proj.owner = this;
          proj.vx = -proj.vx * 1.25;
          proj.color = '#22d3ee';
          proj.coreColor = '#ffffff';
          this.gainMana(12);
          this.gainFinisher(6);
          this.spawnHitStarburst(proj.x, proj.y, '#22d3ee', '#d946ef', 1.1);
        }
      }
    }

    if (t >= 0.42 && !this.didActionFrame) {
      this.didActionFrame = true;
      const aimFoe = this._resolveRangedTarget(enemy, game);
      const sx = this.x + this.facing * 52;
      const sy = this.y - 68;
      const dx = aimFoe ? aimFoe.x - sx : this.facing * 450;
      const dy = aimFoe ? aimFoe.y - 86 - sy : 0;
      const dist = Math.hypot(dx, dy) || 1;
      this._spawnProj(game, {
        x: sx,
        y: sy,
        vx: (dx / dist) * 740,
        vy: (dy / dist) * 740,
        radius: 15,
        maxRange: 640,
        color: '#c084fc',
        coreColor: '#22d3ee',
        owner: this,
        damage: 44,
        type: 'nebula_packet',
        isMeteor: false
      });
    }

    if (t >= dur) {
      this.isCrouching = false;
      this.isDeflecting = false;
      this.setState('IDLE');
    }
  }

  /**
   * Row 2 `AUTO_ATTACK` (`HOLO-PROMPT QUARTET`, `[[60,8],[68,7],[75,8],[83,7]]`):
   * - Beat 1: Finger-tap -> Twin Star-Packet projectiles (`nebula_packet`)
   * - Beat 2: Sleeve swipe -> Spinning Holo-Window projectile (`nebula_packet`)
   * - Beat 3: Pose-B paw-boop -> Remote Row 1 `404` Pop-Up + Row 4 Cursor Zap on `enemy.x`
   * - Beat 4: `-36px` backstep kite + [ENTER] slam -> Neko-AI Orb Nebula Laser Beam + Context Token bonus!
   */
  updateAutoAttack(dt, enemy, game) {
    this._currentEnemy = enemy;
    this._comboPersistTimer = 0.80;
    this.y = this.groundY;
    this.vy = 0;

    if (this._intraLinkTimer > 0) {
      this._intraLinkTimer = Math.max(0, this._intraLinkTimer - dt);
      this.vx = 0;
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
    const [sliceStart, sliceLen] = AUTO_SLICES_EX[v];
    const snapT = v === 0 ? 0.09 : v === 1 ? 0.07 : v === 2 ? 0.09 : 0.15;

    let localStep = 0;
    if (t < snapT) localStep = Math.min(2, Math.floor((t / snapT) * 2));
    else localStep = 2 + Math.min(sliceLen - 3, Math.floor(((t - snapT) / Math.max(0.05, dur - snapT)) * (sliceLen - 2)));
    const frameIdx = sliceStart + Math.min(sliceLen - 1, Math.max(0, localStep));
    this.trueUltFrameOverride = frameIdx;
    this._overrideFrameIdx = frameIdx;

    this.vx = 0;
    if (t < snapT) {
      const u = Math.min(1, Math.max(0, t / snapT));
      this.x = this._beatStartX + (this._beatTargetX - this._beatStartX) * (1 - Math.pow(1 - u, 2));
    } else if (!this._bootsPlanted) {
      this._bootsPlanted = true;
      this.x = this._beatTargetX;
      this.vx = 0;
    }

    const spawnX = this.x + this.facing * 58;
    const spawnY = this.groundY - 96;
    const aimFoe = this._resolveRangedTarget(enemy, game, 640);
    const targetY = aimFoe ? aimFoe.y - (aimFoe.isColossalBoss ? 128 : 94) : spawnY;
    const dx = aimFoe ? aimFoe.x - spawnX : this.facing * 460;
    const dy = targetY - spawnY;
    const dist = Math.hypot(dx, dy) || 1;

    if (v === 0) {
      if ((this._beatHitMask & 1) === 0 && t >= 0.09) {
        this._beatHitMask |= 1;
        this.didActionFrame = true;
        this._hitStopTimer = Math.max(this._hitStopTimer || 0, 0.022);
        this.contextTokens = Math.min(3, this.contextTokens + 1);
        if (game?.audio) game.audio.play('clock_gear', spawnX);
        this.fx?.spawn('nebulaPromptBurst', this._safeFxX(spawnX, game), spawnY, { light: 1.12 });
        this._spawnProj(game, {
          x: spawnX,
          y: spawnY - 12,
          vx: (dx / dist) * 745,
          vy: (dy / dist) * 745 - 14,
          radius: 14,
          maxRange: 640,
          color: '#22d3ee',
          coreColor: '#ffffff',
          owner: this,
          damage: 24,
          type: 'nebula_packet',
          isMeteor: false
        });
        this._spawnProj(game, {
          x: spawnX - this.facing * 10,
          y: spawnY + 12,
          vx: (dx / dist) * 745,
          vy: (dy / dist) * 745 + 14,
          radius: 14,
          maxRange: 640,
          color: '#d946ef',
          coreColor: '#a5f3fc',
          owner: this,
          damage: 24,
          type: 'nebula_packet',
          isMeteor: false
        });
      }
    } else if (v === 1) {
      if ((this._beatHitMask & 1) === 0 && t >= 0.07) {
        this._beatHitMask |= 1;
        this.didActionFrame = true;
        this._hitStopTimer = Math.max(this._hitStopTimer || 0, 0.024);
        this.contextTokens = Math.min(3, this.contextTokens + 1);
        if (game?.audio) game.audio.play('skill_cast', spawnX);
        this.fx?.spawn('nebulaPromptBurst', this._safeFxX(spawnX, game), spawnY, { light: 1.15 });
        this._spawnProj(game, {
          x: spawnX,
          y: spawnY,
          vx: (dx / dist) * 760,
          vy: (dy / dist) * 760,
          radius: 18,
          maxRange: 650,
          pierce: true,
          color: '#c084fc',
          coreColor: '#22d3ee',
          owner: this,
          damage: 46,
          type: 'nebula_packet',
          isMeteor: false
        });
      }
    } else if (v === 2) {
      if ((this._beatHitMask & 1) === 0 && t >= 0.09) {
        this._beatHitMask |= 1;
        this.didActionFrame = true;
        this.contextTokens = Math.min(3, this.contextTokens + 1);
        const rawRemoteX = aimFoe ? aimFoe.x : this.x + this.facing * 350;
        this._v2RemoteX = this._clampArenaX(rawRemoteX, game);
        if (game?.audio) game.audio.play('clock_gear', this._v2RemoteX);
        this.spawnVfxAnim(1, this._v2RemoteX, this.groundY - 122, 168, 168, 0.30, { inFront: true });
        this._applyRemoteNebulaStrike(this._v2RemoteX, 88, 26, game, aimFoe || enemy, {
          knockX: 16,
          knockY: -18,
          hitStop: 0.030
        });
      }
      if ((this._beatHitMask & 2) === 0 && t >= 0.17) {
        this._beatHitMask |= 2;
        this.spawnVfxAnim(4, this._v2RemoteX, this.groundY - 94, 176, 176, 0.28, { inFront: true });
        this.fx?.spawn('nebulaPromptBurst', this._safeFxX(this._v2RemoteX, game), this.groundY - 94, { light: 1.18 });
        this._applyRemoteNebulaStrike(this._v2RemoteX, 92, 30, game, aimFoe || enemy, {
          isCrit: true,
          knockX: 28,
          knockY: -36,
          hitStop: 0.036
        });
      }
    } else {
      if ((this._beatHitMask & 1) === 0 && t >= 0.15) {
        this._beatHitMask |= 1;
        this.didActionFrame = true;
        this.spawnAfterimage(this.x + this.facing * 24, this.groundY, this.facing, 2, 25, 0.22);
        const rawRemoteX = aimFoe ? aimFoe.x : this.x + this.facing * 375;
        this._v3RemoteX = this._clampArenaX(rawRemoteX, game);
        const orbMuzzleX = this.x + this.facing * 22;
        const orbMuzzleY = this.groundY - 116;
        const tokenBonus = this.contextTokens * 10;
        this.contextTokens = 0;

        this._beat4Laser = {
          x1: orbMuzzleX,
          y1: orbMuzzleY,
          x2: this._v3RemoteX,
          y2: this.groundY - 92,
          age: 0,
          maxLife: 0.26
        };
        if (game?.audio) game.audio.play('cyber_slash', this._v3RemoteX);
        this.spawnVfxAnim(3, this._v3RemoteX, this.groundY - 88, 180, 180, 0.28, { inFront: false });
        this.spawnVfxAnim(4, this._v3RemoteX, this.groundY - 92, 186, 186, 0.30, { inFront: true });
        this._applyRemoteNebulaStrike(this._v3RemoteX, 96, 38 + tokenBonus, game, aimFoe || enemy, {
          isCrit: true,
          knockX: 54,
          knockY: -44,
          hitStop: 0.042
        });
        this._spawnProj(game, {
          x: orbMuzzleX,
          y: orbMuzzleY,
          vx: (dx / dist) * 760,
          vy: (dy / dist) * 760,
          radius: 15,
          maxRange: 640,
          color: '#22d3ee',
          coreColor: '#ffffff',
          owner: this,
          damage: 28,
          type: 'nebula_packet',
          isMeteor: false
        });
      }
      if ((this._beatHitMask & 2) === 0 && t >= 0.24) {
        this._beatHitMask |= 2;
        this._applyRemoteNebulaStrike(this._v3RemoteX, 96, 26, game, aimFoe || enemy, {
          isCrit: true,
          knockX: 48,
          knockY: -48,
          hitStop: 0.040
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
        Math.abs(enemy.x - this.x) <= 560;

      if (v < 3 && (aiWantsChain || advHoldingAttack)) {
        if (game?.adventure?.queuedAction === 'attack') {
          game.adventure.queuedAction = null;
        }
        this._intraLinkTimer = INTRA_COMBO_LINK;
        return;
      }

      if (v === 3) {
        this.comboStep = 0;
        this._aiComboReadyFinisher = 0.92;
        this.autoCooldown = isManualPlayer
          ? 0.06
          : this._postFlurryInterval * (0.92 + Math.random() * 0.16);
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
   * Signature Skill (`404 POP-UP CASCADE`, Row 3 `90..119`):
   * Drags Row 3 Selection Marquee Box -> stacks 3 staggered Row 1 `404` Warning Pop-Ups ->
   * stamps descending Row 2 `Cob` Creator Holo-Crest onto `enemy.x` & grants Auto-Patch Holo-Shield!
   */
  updateSkill(_dt, enemy, game) {
    const t = this.stateTimer;
    this.y = this.groundY;
    this.vy = 0;
    this.vx = 0;

    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const rawTarget = enemy ? enemy.x : this.x + this.facing * 350;
    const targetX = this._safeFxX(Math.max(115, Math.min(ww - 115, rawTarget)), game);
    this._skillTargetX = targetX;

    if (this._skillPhase === 0 && t >= 0.10) {
      this._skillPhase = 1;
      if (game?.audio) game.audio.play('clock_gear', targetX);
      game?.vfx?.spawnSpecialCastAura?.(this, this.skillName, 'NEBULA AI ASSISTANT', 'nebula', false);
      // Selection Marquee Box (Row 3) + First 404 Pop-Up (Row 1) + Auto-Patch Holo-Shield!
      this.spawnVfxAnim(3, targetX, this.groundY - 96, 208, 208, 0.72, { inFront: false });
      this.spawnVfxAnim(1, targetX - 42, this.groundY - 128, 148, 148, 0.56, { inFront: true });
      this.heal(42, 'AUTO-PATCH');
      this.holoPatchShield = 110;
      this.holoPatchTimer = 3.5;
      this.spawnNebulaCluster(this.x, this.groundY - 96, 8, 130);
    }

    if (this._skillPhase === 1 && t >= 0.24) {
      this._skillPhase = 2;
      this.spawnVfxAnim(1, targetX + 42, this.groundY - 144, 152, 152, 0.46, { inFront: true });
      this.spawnVfxAnim(1, targetX, this.groundY - 104, 162, 162, 0.42, { inFront: true });
      this._applyRemoteNebulaStrike(targetX, 114, 34, game, enemy, {
        knockX: 18,
        knockY: -22,
        hitStop: 0.030
      });
    }

    if (this._skillPhase === 2 && t >= 0.46) {
      this._skillPhase = 3;
      this.didActionFrame = true;
      if (game?.audio) game.audio.play('holy_bolt', targetX);
      game?.renderer?.triggerShake?.(10, 0.22);
      // Descending Row 2 `Cob` Creator Holo-Crest detonating the 3 Pop-Ups!
      this.spawnVfxAnim(2, targetX, this.groundY - 120, 208, 208, 0.52, { inFront: true });
      this.spawnVfxAnim(4, targetX, this.groundY - 96, 198, 198, 0.38, { inFront: true });
      this.fx?.spawn('cobCreatorCrestSeal', targetX, this.groundY, { light: 1.32 });
      this._applyRemoteNebulaStrike(targetX, 128, 86, game, enemy, {
        isCrit: true,
        knockX: 64,
        knockY: -54,
        hitStop: 0.044
      });
      this._spawnProj(game, {
        x: this.x + this.facing * 54,
        y: this.groundY - 96,
        vx: this.facing * 730,
        vy: 0,
        radius: 16,
        maxRange: 640,
        color: '#22d3ee',
        coreColor: '#fde047',
        owner: this,
        damage: 38,
        type: 'nebula_packet',
        isMeteor: false
      });
    }

    if (t >= this.skillDuration) {
      this.y = this.groundY;
      this.vx = 0;
      this.setState('IDLE');
    }
  }

  /**
   * Overdrive Ultimate (`COB-OS: STARLIGHT OVERCLOCK`, Row 4 F00..F14 `120..134`):
   * Frames 120..130 float slightly while 6 Orbital Row 5 Windows converge around `enemy.x`;
   * Frames 131..134 land cleanly on `groundY` while `Row 2` Cob Creator Holo-Crest detonates!
   */
  updateUltimate(_dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.ultDuration || 1.56;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const rawTarget = enemy ? enemy.x : this.x + this.facing * 350;
    const targetX = this._safeFxX(Math.max(185, Math.min(ww - 185, rawTarget)), game);
    this._ultTargetX = targetX;
    this.isInvulnerable = true;
    this.vx = 0;
    this.vy = 0;

    // Grounded touchdown explicitly by F11..F14 (`t >= 1.12s`)
    const localCol = Math.min(14, Math.floor((t / dur) * 15));
    this.trueUltFrameOverride = 120 + localCol;
    this._overrideFrameIdx = 120 + localCol;
    if (localCol <= 10) {
      this.y = this.groundY - 24 * Math.sin((localCol / 10) * Math.PI);
    } else {
      this.y = this.groundY;
    }

    if (this._ultStep === 0 && t >= 0.12) {
      this._ultStep = 1;
      this._ultNodesActive = true;
      if (game?.audio) game.audio.play('ult_cast', this.x);
      game?.vfx?.spawnSpecialCastAura?.(this, this.ultName, 'COB-OS OVERDRIVE', 'nebula', true);
      this.fx?.spawn('nebulaOrbitalMatrix', targetX, this.groundY, { light: 1.32 });
      // Spawn 6 Orbital Row 5 Terminal Windows circling targetX
      for (let k = 0; k < 6; k++) {
        const ang = (k / 6) * Math.PI * 2;
        this.spawnVfxAnim(
          5,
          targetX + Math.cos(ang) * 136,
          this.groundY - 122 + Math.sin(ang) * 74,
          132,
          132,
          1.12,
          { inFront: Math.sin(ang) >= 0 }
        );
      }
    }

    if (this._ultStep === 1 && t >= 0.56) {
      this._ultStep = 2;
      if (game?.audio) game.audio.play('cyber_slash', targetX);
      this._applyRemoteNebulaStrike(targetX, 175, 68, game, enemy, {
        isCrit: false,
        knockX: 24,
        knockY: -36,
        hitStop: 0.04
      });
    }

    if (this._ultStep === 2 && t >= 0.96 && !this.didActionFrame) {
      this._ultStep = 3;
      this.didActionFrame = true;
      if (game?.audio) game.audio.play('priestess_ult', targetX);
      game?.renderer?.triggerShake?.(18, 0.45);
      game?.renderer?.triggerHitStop?.(0.06);
      this.spawnVfxAnim(2, targetX, this.groundY - 118, 224, 224, 0.58, { inFront: true });
      this.spawnVfxAnim(4, targetX, this.groundY - 104, 220, 220, 0.44, { inFront: true });
      this._applyRemoteNebulaStrike(targetX, 190, 142, game, enemy, {
        isCrit: true,
        knockX: 118,
        knockY: -165,
        hitStop: 0.06
      });
      game?.vfx?.spawnDamageText?.(targetX, this.groundY - 182, 0, true, 'COB-OS OVERCLOCK!', '#22d3ee');
    }

    if (t >= dur) {
      this.y = this.groundY;
      this.vx = 0;
      this.vy = 0;
      this.isInvulnerable = false;
      this._ultNodesActive = false;
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      this.setState('IDLE');
    }
  }

  /**
   * Supreme True Ultimate (`GENESIS PROMPT: POWERED BY COB`, Row 4 F15..F29 `135..149`):
   * Consecrates Nebula Cyber-Sanctuary + Grand Sky Row 7 `Cob` Creator Genesis Core,
   * fires Horizon-Piercing Supernova Beam at F25, and settles cleanly on `groundY` across F26..F29!
   */
  updateTrueUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.trueUltDuration || 3.60;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const rawTarget = enemy ? enemy.x : this.x + this.facing * 400;
    const targetX = this._safeFxX(Math.max(160, Math.min(ww - 160, rawTarget)), game);
    this._supernovaTargetX = targetX;
    this._supernovaMuzzleX = this.x + this.facing * 42;
    this._supernovaBeamY = this.groundY - 108;

    this.isInvulnerable = true;
    this.unstoppablePoise = true;
    this.vx = 0;
    this.vy = 0;

    // Frame mapping: 135..144 (channel F15..F24), 145 (F25 fire), 146..149 (F26..F29 grounded settle)
    let localCol = 0;
    if (t < 2.24) {
      localCol = Math.min(9, Math.floor((t / 2.24) * 10));
      this.y = this.groundY - 22 * Math.sin(Math.min(1, t / 0.9) * Math.PI * 0.5);
    } else if (t < 2.68) {
      localCol = 10; // F25 release
      this.y = this.groundY;
    } else {
      const recU = Math.min(1, (t - 2.68) / Math.max(0.1, dur - 2.68));
      localCol = 11 + Math.min(3, Math.floor(recU * 4));
      this.y = this.groundY;
    }
    this.trueUltFrameOverride = 135 + localCol;
    this._overrideFrameIdx = 135 + localCol;

    if (t >= 0.08 && !this.fx?.active?.some((s) => s.key === 'cobGenesisSanctuaryCore')) {
      game?.vfx?.spawnSpecialCastAura?.(this, this.trueUltName, 'POWERED BY COB', 'nebula', true);
      this.fx?.spawn('cobGenesisSanctuaryCore', this._safeFxX(this.x, game), this.groundY, { light: 1.40 });
      this.spawnVfxAnim(7, targetX, this.groundY - 210, 228, 228, 2.25, { inFront: true });
      this.heal(Math.round(this.maxHp * 0.14), 'COB GENESIS');
      this.holoPatchShield = 180;
      this.holoPatchTimer = 5.0;
    }

    if (t >= 2.24 && !this._supernovaFired) {
      this._supernovaFired = true;
      this.didActionFrame = true;
      this._supernovaBeamTimer = 0.01;
      if (game?.audio) game.audio.play('cyber_beam', targetX);
      game?.renderer?.triggerWhiteoutDeletion?.(0.28);
      game?.renderer?.triggerShake?.(26, 0.72);
      game?.renderer?.triggerHitStop?.(0.09);
      game?.triggerSlowMo?.(0.55, 0.34);

      this.spawnVfxAnim(7, targetX, this.groundY - 120, 248, 248, 0.85, { inFront: true });
      this.spawnVfxAnim(2, this._supernovaMuzzleX, this._supernovaBeamY, 190, 190, 0.64, { inFront: true });
      this.spawnVfxAnim(4, targetX, this.groundY - 104, 240, 240, 0.56, { inFront: true });
      this.spawnNebulaCluster(targetX, this.groundY - 110, 22, 230);

      // Full-horizon damage sweep across beam corridor
      const beamHits = [
        { delay: 0, dmg: 185 },
        { delay: 0.18, dmg: 215 }
      ];
      this._applyRemoteNebulaStrike(targetX, 280, beamHits[0].dmg + beamHits[1].dmg, game, enemy, {
        isCrit: true,
        knockX: 165,
        knockY: -210,
        hitStop: 0.08
      });
      game?.vfx?.spawnDamageText?.(targetX, this.groundY - 210, 0, true, 'POWERED BY COB!', '#fde047');
    }

    if (this._supernovaBeamTimer > 0) {
      this._supernovaBeamTimer += dt;
      if (this._supernovaBeamTimer > 0.78) {
        this._supernovaBeamTimer = 0;
      }
    }

    if (t >= dur) {
      this.y = this.groundY;
      this.vx = 0;
      this.vy = 0;
      this.isInvulnerable = false;
      this.unstoppablePoise = false;
      this._supernovaBeamTimer = 0;
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      this.setState('IDLE');
    }
  }

  update(dt, enemy, game) {
    this._currentEnemy = enemy;
    this.haloPhase += dt;
    this._ctrlZCd = Math.max(0, this._ctrlZCd - dt);
    if (this.holoPatchTimer > 0) {
      this.holoPatchTimer = Math.max(0, this.holoPatchTimer - dt);
      if (this.holoPatchTimer <= 0) this.holoPatchShield = 0;
    }
    this._comboPersistTimer = Math.max(0, this._comboPersistTimer - dt);
    if (this._comboPersistTimer <= 0 && this.state !== 'AUTO_ATTACK') {
      this.comboStep = 0;
    }

    if (this._beat4Laser) {
      this._beat4Laser.age += dt;
      if (this._beat4Laser.age >= this._beat4Laser.maxLife) {
        this._beat4Laser = null;
      }
    }

    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      this.afterimages[i].life += dt;
      if (this.afterimages[i].life >= this.afterimages[i].maxLife) {
        this.afterimages.splice(i, 1);
      }
    }

    for (let i = this.activeVfxAnims.length - 1; i >= 0; i--) {
      const v = this.activeVfxAnims[i];
      v.age += dt;
      v.x += v.vx * dt;
      v.y += v.vy * dt;
      if (v.followOwner) {
        v.x = this.x + this.facing * v.offsetX;
        v.y = this.y + v.offsetY;
      }
      if (v.age >= v.maxLife) this.activeVfxAnims.splice(i, 1);
    }

    for (let i = this.afkDecoys.length - 1; i >= 0; i--) {
      const d = this.afkDecoys[i];
      d.age += dt;
      if (!d.detonated && enemy && !enemy.isDead && Math.abs(enemy.x - d.x) < 74 && d.age > 0.16) {
        d.detonated = true;
        this.spawnHitStarburst(d.x, d.y, '#22d3ee', '#d946ef', 1.0);
        enemy.takeDamage(28, this, false, 18, -16);
      }
      if (d.age >= d.maxLife) this.afkDecoys.splice(i, 1);
    }

    this._exParticles?.update(dt);
    this.fx?.update(dt);
    super.update(dt, enemy, game);
  }

  _drawBloomedVfxCell(ctx, renderer, vfxSheet, col, row, dx, dy, dw, dh, glowCol, alpha = 0.96, isReflection = false) {
    PixelForge.ensureImage?.(vfxSheet);
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;
    const sx = (col % 30) * 208;
    const sy = row * 208;
    const prevComp = ctx.globalCompositeOperation;
    const prevAlpha = ctx.globalAlpha;

    ctx.imageSmoothingEnabled = false;
    if (renderer && !isReflection) {
      const glowTex = renderer.getGlowForColor?.(glowCol);
      if (glowTex) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(0.22, alpha * 0.22);
        ctx.drawImage(glowTex, Math.round(dx - dw * 0.25), Math.round(dy - dh * 0.25), Math.round(dw * 1.5), Math.round(dh * 1.5));
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.drawImage(vfxSheet, sx, sy, 208, 208, Math.round(dx), Math.round(dy), Math.round(dw), Math.round(dh));
    if (!isReflection) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(0.20, alpha * 0.20);
      ctx.drawImage(vfxSheet, sx, sy, 208, 208, Math.round(dx), Math.round(dy), Math.round(dw), Math.round(dh));
    }
    ctx.globalCompositeOperation = prevComp;
    ctx.globalAlpha = prevAlpha;
  }

  _drawPixelLaserBeam(ctx, x1, y1, x2, y2, halfW, outerCol, midCol, alpha) {
    if (alpha <= 0.02) return;
    const leftX = Math.round(Math.min(x1, x2) / 2) * 2;
    const rightX = Math.round(Math.max(x1, x2) / 2) * 2;
    const midY = Math.round(((y1 + y2) * 0.5) / 2) * 2;
    const width = Math.max(8, rightX - leftX);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(1, alpha * 0.85);
    ctx.fillStyle = outerCol;
    ctx.fillRect(leftX, midY - halfW, width, halfW * 2);

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(0.22, alpha * 0.22);
    ctx.fillStyle = midCol;
    ctx.fillRect(leftX, midY - Math.max(4, Math.round(halfW * 0.72)), width, Math.max(8, Math.round(halfW * 1.44)));

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(leftX, midY - Math.max(2, Math.round(halfW * 0.35)), width, Math.max(4, Math.round(halfW * 0.7)));
    ctx.restore();
  }

  _drawVfxAnims(ctx, inFront = true, renderer = null) {
    if (!this.activeVfxAnims.length) return;
    const sprites = this.getExSprites();
    const vfxSheet = PixelForge.ensureImage?.(sprites?.vfx);
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < this.activeVfxAnims.length; i++) {
      const v = this.activeVfxAnims[i];
      if (Boolean(v.inFront) !== Boolean(inFront)) continue;
      const u = Math.max(0, Math.min(0.999, v.age / Math.max(0.01, v.maxLife)));
      const span = Math.max(1, v.endFrame - v.startFrame + 1);
      const col = v.startFrame + Math.min(span - 1, Math.floor(u * span));
      const fade = Math.sin(u * Math.PI);
      const px = Math.round(v.x);
      const py = Math.round(v.y);
      const hw = Math.round(v.w * 0.5);
      const hh = Math.round(v.h * 0.5);
      drawExBayerHalo(ctx, px, py, hw * 0.76, hh * 0.76, '#c084fc', '#22d3ee', 0.14 * fade);
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(v.flipX ? -1 : 1, 1);
      this._drawBloomedVfxCell(
        ctx,
        renderer,
        vfxSheet,
        col,
        v.row,
        -hw,
        -hh,
        v.w,
        v.h,
        v.row === 2 || v.row === 7 ? '#22d3ee' : '#d946ef',
        Math.min(1, 0.38 + fade * 0.62),
        false
      );
      ctx.restore();
    }
    ctx.restore();
  }

  drawForegroundOverlay(ctx, renderer = null) {
    const arenaCenterX = this._resolveShaderCenterX(renderer);
    if (!this.isDead) {
      drawExBayerHalo(ctx, Math.round(this.x), Math.round(this.groundY - 4), 46, 14, '#c084fc', '#22d3ee', 0.15);
    }
    this._exParticles?.renderBack(ctx);
    if (this.fx && !this.isDead) {
      this.fx.renderLayer(ctx, 'back', arenaCenterX, this.groundY, 0.96);
    }
    this._drawVfxAnims(ctx, false, renderer);

    const sprites = this.getExSprites();
    const sheet = PixelForge.ensureImage?.(sprites?.sheet);
    if (this.afterimages.length > 0 && sheet && sheet.complete && sheet.naturalWidth) {
      for (let i = 0; i < this.afterimages.length; i++) {
        const img = this.afterimages[i];
        const alpha = Math.max(0, (1 - img.life / img.maxLife) * 0.48);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(Math.round(img.x / 2) * 2, Math.round((img.y + 4) / 2) * 2);
        ctx.scale(img.facing, 1);
        ctx.globalAlpha = alpha;
        PixelForge.drawSilhouetteFrame(ctx, sprites, img.frameIdx, 208, 208, '#22d3ee');
        ctx.restore();
      }
    }
  }

  drawUltimateForeground(ctx, renderer = null) {
    const arenaCenterX = this._resolveShaderCenterX(renderer);
    if (this.fx && !this.isDead) {
      this.fx.renderLayer(ctx, 'front', arenaCenterX, this.groundY, 0.98);
    }
    this._drawVfxAnims(ctx, true, renderer);
    this._exParticles?.renderFront(ctx);

    if (this._beat4Laser) {
      const bl = this._beat4Laser;
      const env = Math.sin(Math.min(1, bl.age / bl.maxLife) * Math.PI);
      this._drawPixelLaserBeam(ctx, bl.x1, bl.y1, bl.x2, bl.y2, 12, '#c084fc', '#22d3ee', env);
    }

    if (this.state === 'TRUE_ULTIMATE' && this._supernovaBeamTimer > 0) {
      const u = Math.min(1, this._supernovaBeamTimer / 0.78);
      const env = Math.sin(u * Math.PI);
      const endX = this._supernovaMuzzleX + this.facing * 980;
      this._drawPixelLaserBeam(
        ctx,
        this._supernovaMuzzleX,
        this._supernovaBeamY,
        endX,
        this._supernovaBeamY,
        42,
        '#d946ef',
        '#22d3ee',
        env
      );
    }
  }

  draw(ctx, isReflection = false, renderer = null) {
    const sprites = this.getExSprites();
    if (!sprites) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(this.x), Math.round(this.y + 4));
    ctx.scale(this.facing, 1);
    PixelForge.drawSheetFrame(ctx, sprites, this, 208, 208, this.haloPhase, isReflection, renderer);
    ctx.restore();
  }
}
