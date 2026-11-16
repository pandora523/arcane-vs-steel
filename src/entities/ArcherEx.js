import { Fighter } from './Fighter.js?v=30fps114';
import { PixelForge } from '../engine/PixelForge.js?v=30fps114';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps114';
import {
  SYLVAN_EFFECT_REGISTRY,
  SYLVAN_EMERALD_PALETTE,
  SYLVAN_STARLIGHT_PALETTE
} from '../engine/shaders/sylvanShaders.js?v=30fps114';

const AUTO_SLICES_EX = [
  [60, 8], // Beat 1 (V0, 0.36s): Astral Bow-Arc Snap + Close-Range Bow-Glaive -> snaps at F03 (63)
  [68, 7], // Beat 2 (V1, 0.35s): Rising Upward Twin-Star 2-Arrow Volley -> snaps at F09 (69)
  [75, 8], // Beat 3 (V2, 0.38s): Spinning Astral Wind-Crescent + Rapid 2-Arrow Streak -> snaps at F17/F18 (77/78)
  [83, 7]  // Beat 4 (V3, 0.48s): Airborne Backstep/Hop Apex 3-Arrow Astral Dragon-Piercer -> snaps at F25 (85)
];

const BEAT_DURATIONS = [0.36, 0.35, 0.38, 0.48];
const INTRA_COMBO_LINK = 0.015;

/**
 * SYLVARA EX (`archer_ex`) - Yggdrasil Astral Star-Huntress.
 * Next-Gen Wide-Canvas (`320x240`, `anchorX=112, anchorY=230`) FFBE / Last Cloudia Champion.
 * Wields luminous Yggdrasil Astral Recurve Greatbow (doubling as a bladed Elven Twin-Arc Bow-Glaive
 * at close quarters) + Back Quiver + 6-Pinion Astral Light-Wings on Row 4 & Row 9.
 * Coexists 100% independently alongside classic Sylvara (`archer`).
 */
export class ArcherEx extends Fighter {
  constructor(x, groundY, facing = 1) {
    const opts = typeof x === 'object' && x !== null ? x : { x, groundY, facing };
    super({
      ...opts,
      name: opts.name || 'Sylvara EX',
      maxHp: 3680,
      attackRange: 520,
      moveSpeed: 192,
      autoInterval: 0.88,
      lightColor: 'rgba(16, 185, 129, 1)',
      primaryColor: '#34d399',
      hasTrueUltimate: true,
      trueUltName: 'ARROW OF YGGDRASIL: SUPERNOVA PIERCE',
      trueUltDuration: 4.55
    });

    this.heroId = 'archer_ex';
    this.secondaryColor = '#fde047';
    this.theme = 'emerald';
    this.deathSfx = 'death_archer';
    this.skillMaxCooldown = 4.00;
    this.autoDuration = BEAT_DURATIONS[0];
    this._postFlurryInterval = 1.24;
    this.skillName = 'VERDANT SNARE & SEEKERS';
    this.ultName = 'ZEPHYR VAULT: 180 STARLOCK';
    this.ultSub = 'INVERTED AERIAL LOCK BARRAGE';
    this.ultDuration = 2.04;
    this.hasTrueUltimate = true;
    this.trueUltName = 'ARROW OF YGGDRASIL: SUPERNOVA PIERCE';
    this.trueUltSub = 'SUPREME WORLD-TREE ASTRAL LANCE';
    this.trueUltDuration = 4.55;

    this.windPhase = 0;
    this.shotCombo = 0;
    this.stepTimer = 0;
    this.dodgeMaxCooldown = 2.85;
    this.dashMaxCooldown = 3.15;
    this.wallFlipCooldown = 0;
    this.crouchCooldown = 0;
    this.vaultCooldown = 0;
    this.crouchDuration = 0.96;
    this.isCrouching = false;
    this.isFlipVault = false;
    this.flipStartX = this.x;
    this.flipTargetX = this.x;
    this.flipAngle = 0;

    // 4-Beat FFBE / Last Cloudia Ranged-Acrobat + Bow-Glaive Combo State
    this.comboStep = 0;
    this._autoVariant = 0;
    this._comboPersistTimer = 0;
    this._queuedNextBeat = false;
    this._intraLinkTimer = 0;
    this._beatHitMask = 0;
    this._beatStartX = this.x;
    this._beatTargetX = this.x;
    this._bootsPlanted = false;
    this._overrideFrameIdx = null;

    this.activeVfxAnims = [];
    this.glaiveScars = [];
    this._ultPhase = 0;
    this._ultShotMask = 0;
    this._ultChargeDir = this.facing;
    this._ultStartX = this.x;
    this._ultPivotX = this.x + this.facing * 200;
    this._trueUltStep = 0;
    this._trueUltBeamTimer = 0;
    this._trueUltMoteTimer = 0;
    this._trueUltTargetX = this.x + this.facing * 320;
    this._trueUltJumpStartX = this.x;
    this._trueUltFarEdgeX = 108;
    this._trueUltRootedTargets = [];
    this.brambleSnareZones = [];

    this.fx = new ArcaneShaderFX(SYLVAN_EFFECT_REGISTRY, {
      pixelScale: 3,
      viewW: 720,
      viewH: 460,
      topRatio: 0.72
    });

    if (typeof Image !== 'undefined') {
      PixelForge.ensureHeroLoaded?.('archer_ex');
    }

    this.afterimages = [];
    this._afterimageTimer = 0;
    this._drewBowVortex = false;
    this._skillLockSpawned = false;
    this._deathBurstTriggered = false;
  }

  getAiStyleProfile() {
    return {
      comboGoal: 4,
      sweetMin: 340,
      sweetMax: 455,
      counterCrouchBias: 0.50,
      midLeapMin: 0,
      midLeapMax: 0,
      midLeapChance: 0,
      postStyle: 'marksman'
    };
  }

  getExSprites() {
    if (typeof Image === 'undefined') return null;
    const assets = PixelForge.initAssets?.();
    return assets?.archer_ex || assets?.archer || null;
  }

  _clampArenaX(xv, game, margin = 84) {
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
      ? Math.min(rawMaxX, (game.adventure.bossEntity.anchorX || 9335) - 96)
      : rawMaxX;
    return Math.max(minX, Math.min(maxX, xv));
  }

  getEnemyTargets(enemy, game) {
    if (game?.getEnemiesOf) {
      const list = game.getEnemiesOf(this).filter((f) => f && !f.isDead && !f.isBenched);
      if (list.length > 0) return list;
    }
    return enemy && !enemy.isDead ? [enemy] : [];
  }

  setState(newState) {
    const prevState = this.state;
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

    if (newState !== 'CROUCH') {
      this.isDeflecting = false;
      this.fx?.stopByKey('sylvanLeafCloakDome');
    }
    if (
      newState !== 'DASH' &&
      newState !== 'JUMP' &&
      newState !== 'DODGE' &&
      newState !== 'ULTIMATE' &&
      newState !== 'TRUE_ULTIMATE'
    ) {
      this.fx?.stopByKey('zephyrVaultSlipstream');
    }
    if (newState !== 'ULTIMATE' && newState !== 'TRUE_ULTIMATE') {
      this.fx?.stopByKey('astralWingPlume');
      this.cameraAirLift = 0;
      if (newState !== 'AUTO_ATTACK') {
        this._overrideFrameIdx = null;
      }
    }
    if (newState === 'ULTIMATE') {
      this._ultPhase = 0;
      this._ultShotMask = 0;
      this._ultChargeDir = this.facing;
      this._ultStartX = this.x;
      this._ultPivotX = this.x + this.facing * 200;
      this.isFlipVault = false;
      this._overrideFrameIdx = 120;
    }
    if (newState === 'TRUE_ULTIMATE') {
      this._trueUltStep = 0;
      this._trueUltBeamTimer = 0;
      this._trueUltMoteTimer = 0;
      this._trueUltTargetX = this.x + this.facing * 320;
      this._trueUltJumpStartX = this.x;
      this._trueUltFarEdgeX = 108;
      this._trueUltRootedTargets = [];
      this.isFlipVault = false;
      this.trueUltFrameOverride = 120;
      this._overrideFrameIdx = 120;
    } else {
      this.releaseRootedTargets();
      this._trueUltStep = 0;
      this._trueUltBeamTimer = 0;
      this._trueUltMoteTimer = 0;
      if (newState !== 'AUTO_ATTACK') {
        this.trueUltFrameOverride = null;
      }
    }
    if (newState === 'AUTO_ATTACK') {
      this._autoVariant = (((this.comboStep || 0) % 4) + 4) % 4;
      this._beginComboBeat(this._autoVariant, this.game);
    }
    if (newState === 'DEATH') {
      this.fx?.clear();
      this.glaiveScars = [];
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
    }
    this._drewBowVortex = false;
    this._skillLockSpawned = false;
    this._afterimageTimer = 0;
  }

  queueNextComboBeat() {
    this._queuedNextBeat = true;
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
    this._drewBowVortex = false;
    this._comboPersistTimer = 0.72;
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
    let desiredX = this.x;
    if (v === 3) {
      // Beat 4 (`V3`): Agile airborne backstep-hop kiting away as she looses the 3-arrow Dragon-Piercer!
      desiredX = this.x - this.facing * 44;
    } else if (enemy && !enemy.isDead) {
      const dist = Math.abs(enemy.x - this.x);
      if (dist < 105) {
        desiredX = this.x - this.facing * 18;
      } else if (dist > 165 && dist < 215) {
        desiredX = this.x + this.facing * 14;
      } else {
        desiredX = this.x + this.facing * (v === 2 ? 12 : 6);
      }
    }
    this._beatTargetX = this._clampArenaX(desiredX, game, 84);
  }

  releaseRootedTargets() {
    if (!Array.isArray(this._trueUltRootedTargets) || this._trueUltRootedTargets.length === 0) return;
    for (const entry of this._trueUltRootedTargets) {
      const foe = entry?.foe;
      if (foe) {
        foe.isRooted = false;
      }
    }
    this._trueUltRootedTargets = [];
  }

  spawnVfxAnim(row, x, y, w = 208, h = 208, maxLife = 0.55, opts = {}) {
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
      inFront: opts.inFront !== undefined ? Boolean(opts.inFront) : row !== 2 && row !== 5,
      isSeeker: Boolean(opts.isSeeker),
      startFrame: opts.startFrame || 0,
      endFrame: opts.endFrame !== undefined ? opts.endFrame : 29
    });
  }

  spawnAfterimage(x, y, facing, row = 8, col = 14, maxLife = 0.24) {
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

  spawnGlaiveScar(cx, cy, dx, dy, maxLife = 0.22, isGold = false) {
    if (this.glaiveScars.length >= 16) this.glaiveScars.shift();
    this.glaiveScars.push({
      x0: Math.round(cx - dx * 0.5),
      y0: Math.round(cy - dy * 0.5),
      x1: Math.round(cx + dx * 0.5),
      y1: Math.round(cy + dy * 0.5),
      age: 0,
      maxLife,
      isGold
    });
  }

  _gatherCloseGlaiveTargets(primaryEnemy, game, reachFront = 196, reachBack = 42) {
    const targets = [];
    const seen = new Set();
    const isAdv = Boolean(game?.isAdventureMode?.() || game?.adventure?.active);
    const myGy = this.groundY || this.y;

    const consider = (foe) => {
      if (!foe || foe === this || foe.isDead || foe.isBenched || seen.has(foe)) return;
      const relX = (foe.x - this.x) * this.facing;
      const hitPad = foe.isColossalBoss ? 76 : 0;
      if (relX < -reachBack - hitPad || relX > reachFront + hitPad) return;
      if (isAdv && !foe.isColossalBoss) {
        const foeGy = foe.groundY || foe.y;
        if (Math.abs(foeGy - myGy) > 68) return;
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

  /**
   * Close-Quarters Elven Twin-Arc Bow-Glaive sweep: applies crunchy hit-stop + target hit-shake when foes press inside <= 196px!
   */
  _applyBowGlaiveSweep(primaryEnemy, game, cfg) {
    const {
      damage = 28,
      reachFront = 198,
      reachBack = 44,
      hitStop = 0.044,
      shakeDur = 0.056,
      knockX = 48,
      knockY = -36,
      isCrit = false,
      scarDx = 96,
      scarDy = -76,
      isGold = false
    } = cfg;

    const targets = this._gatherCloseGlaiveTargets(primaryEnemy, game, reachFront, reachBack);
    let landed = false;

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
      const hx = foe.x;
      const hy = (foe.y || this.groundY) - (foe.isColossalBoss ? 124 : 90);
      this.spawnGlaiveScar(hx, hy, this.facing * scarDx, scarDy, 0.22, isGold);
      this.spawnVfxAnim(0, hx, hy, 176, 176, 0.26, {
        flipX: this.facing < 0,
        inFront: true
      });
      landed = true;
    }

    if (landed && hitStop > 0) {
      this._hitStopTimer = Math.max(this._hitStopTimer || 0, hitStop);
      game?.renderer?.triggerHitStop?.(hitStop * 0.65);
    }

    return landed;
  }

  onProjectileHit(p, hitTarget, isCrit, game) {
    if (!p) return false;
    if (hitTarget && !hitTarget.isDead) {
      const hs = p.pierce || isCrit ? 0.048 : 0.036;
      if (!hitTarget.isColossalBoss) {
        hitTarget._hitShakeTimer = Math.max(hitTarget._hitShakeTimer || 0, hs + 0.018);
      }
      if (p.pierce || isCrit) {
        this._hitStopTimer = Math.max(this._hitStopTimer || 0, hs);
        game?.renderer?.triggerHitStop?.(hs * 0.55);
      }
    }
    const hx = hitTarget ? hitTarget.x : p.x;
    const hy = hitTarget ? (hitTarget.y || this.groundY) - 92 : p.y;
    const dir = Math.sign(p.vx || this.facing || 1);
    this.spawnGlaiveScar(hx, hy, dir * 82, isCrit ? -64 : 42, 0.20, Boolean(isCrit || p.pierce));
    this.fx?.spawn('sylvanArrowImpactBurst', hx, hy, {
      flip: false,
      palette: isCrit || p.pierce ? SYLVAN_STARLIGHT_PALETTE : SYLVAN_EMERALD_PALETTE,
      light: isCrit ? 1.24 : 1.08,
      extra: { aimAngle: dir >= 0 ? 0 : Math.PI, isCrit: Boolean(isCrit || p.pierce) }
    });
    if (game?.audio) {
      game.audio.play('arrow_hit', hx);
    }
    return true;
  }

  takeDamage(amount, attacker, isCrit = false, knockX = 95, knockY = 0) {
    if (this.isDeflecting && !this.isDead) {
      this.fx.spawn('sylvanArrowImpactBurst', this.x + this.facing * 36, this.y - 84, {
        flip: false,
        palette: SYLVAN_STARLIGHT_PALETTE,
        light: 1.15,
        extra: { aimAngle: this.facing >= 0 ? 0 : Math.PI, isCrit: true }
      });
      if (this.game?.vfx) {
        this.game.vfx.spawnDamageText(this.x, this.y - 168, 0, false, 'LEAF-VEIL PARRY!', '#6ee7b7');
      }
      if (this.game?.audio) {
        this.game.audio.play('reflect', this.x);
      }
    }

    super.takeDamage(amount, attacker, isCrit, knockX, knockY);

    if (this.isDead && !this._deathBurstTriggered) {
      this._deathBurstTriggered = true;
      this.fx.spawn('zephyrGroundBurst', this.x, this.groundY, {
        palette: SYLVAN_STARLIGHT_PALETTE,
        light: 1.05,
        extra: { radius: 30 }
      });
      this.fx.spawn('sylvanArrowImpactBurst', this.x, this.groundY - 64, {
        flip: false,
        palette: SYLVAN_EMERALD_PALETTE,
        light: 1.0,
        extra: { aimAngle: -Math.PI * 0.5, isCrit: true }
      });
    }
  }

  startJump(enemy, game, customDir = null) {
    this.vaultCooldown = 2.8;
    this.dodgeCooldown = this.dodgeMaxCooldown * (0.86 + Math.random() * 0.28);
    this.setState('JUMP');
    this.isInvulnerable = true;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    let dir = customDir !== null ? customDir : -this.facing;
    if (this.x < 180) dir = 1;
    else if (this.x > ww - 180) dir = -1;
    this.dashDir = dir;
    this.onStartDodge(enemy, game, dir);
  }

  startCrouch(_enemy, game) {
    this.crouchCooldown = 3.2;
    this.crouchDuration = 0.96;
    this.setState('CROUCH');
    this.isCrouching = true;
    this.isDeflecting = true;
    this.vx = 0;

    this.fx.spawn('sylvanLeafCloakDome', this.x + this.facing * 4, this.groundY, {
      follow: this,
      offsetX: 4,
      offsetY: 0,
      useGroundY: true,
      flip: this.facing < 0,
      palette: SYLVAN_EMERALD_PALETTE,
      maxDuration: 0.64,
      light: 1.05,
      extra: {
        radius: 42,
        radiusY: 58
      }
    });

    if (game?.vfx) {
      game.vfx.spawnDamageText(this.x, this.y - 118, 0, false, 'STEALTH CROUCH!', '#6ee7b7');
    }
    if (game?.audio) {
      game.audio.play('zephyr_flip', this.x);
    }
  }

  onStartDodge(enemy, game, dir) {
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const dist = enemy ? Math.abs(enemy.x - this.x) : 300;
    const retreatX = this.x - this.facing * 260;
    const nearWallOrCornered =
      this.x < 330 ||
      this.x > ww - 330 ||
      retreatX < 190 ||
      retreatX > ww - 190 ||
      dist < 225;

    this.isFlipVault = true;
    this.flipStartX = this.x;
    this.flipAngle = 0;
    this.wallFlipCooldown = 3.0;

    if (enemy && nearWallOrCornered) {
      this.dashDuration = 0.64;
      const openSideDir = enemy.x < ww * 0.5 ? 1 : -1;
      let target = enemy.x + openSideDir * 350;
      if (Math.abs(target - this.x) < 260) {
        const crossDir = this.x < enemy.x ? 1 : -1;
        target = enemy.x + crossDir * 340;
      }
      this.flipTargetX = this._clampArenaX(target, game, 150);
      this.dashDir = Math.sign(this.flipTargetX - this.flipStartX) || 1;
      if (game?.vfx) {
        game.vfx.spawnDamageText(this.x, this.y - 125, 0, false, 'ZEPHYR VAULT!', '#34d399');
      }
    } else {
      this.dashDuration = 0.60;
      this.flipTargetX = this._clampArenaX(this.x + dir * 340, game, 150);
      this.dashDir = dir;
      if (game?.vfx) {
        game.vfx.spawnDamageText(this.x, this.y - 120, 0, false, 'ZEPHYR LEAP!', '#34d399');
      }
    }

    this.vx = 0;
    this.vy = 0;
    this.heal(13, 'SYLVAN BREEZE');
    if (game?.audio) game.audio.play('zephyr_flip', this.x);

    this.fx.spawn('zephyrGroundBurst', this.x, this.groundY, {
      palette: SYLVAN_EMERALD_PALETTE,
      light: 1.05,
      extra: { radius: 28 }
    });
    this.fx.spawn('zephyrVaultSlipstream', this.x - this.facing * 14, this.y - 108, {
      follow: this,
      offsetX: -14,
      offsetY: -108,
      flip: this.facing < 0,
      palette: SYLVAN_EMERALD_PALETTE,
      maxDuration: this.dashDuration * 0.88,
      light: 1.05,
      extra: { length: 28, tilt: -0.18 }
    });
  }

  onStartDash(_enemy, game, dir) {
    this.isFlipVault = false;
    this.flipAngle = 0;
    this.dashDuration = 0.44;
    this.dashDir = dir || this.facing;
    this.vx = this.dashDir * 380;
    if (game?.audio) game.audio.play('arrow_shoot', this.x);
    if (game?.vfx) {
      game.vfx.spawnDamageText(this.x, this.y - 120, 0, false, 'GALE STRIDE!', '#34d399');
    }

    this.fx.spawn('zephyrVaultSlipstream', this.x - this.facing * 16, this.y - 102, {
      follow: this,
      offsetX: -16,
      offsetY: -102,
      flip: this.facing < 0,
      palette: SYLVAN_STARLIGHT_PALETTE,
      maxDuration: 0.34,
      light: 1.0,
      extra: { length: 24, tilt: -0.08 }
    });
  }

  updateDashOrDodge(dt, enemy, game) {
    const t = this.stateTimer;

    if ((this.state === 'DODGE' || this.state === 'JUMP') && this.isFlipVault) {
      const u = Math.min(1, t / this.dashDuration);
      const airU = Math.max(0, Math.min(1, (u - 0.10) / 0.76));

      const horizU =
        airU < 0.35
          ? (airU / 0.35) * 0.44
          : airU < 0.70
            ? 0.44 + ((airU - 0.35) / 0.35) * 0.28
            : 0.72 + ((airU - 0.70) / 0.30) * 0.28;
      this.x = this.flipStartX + (this.flipTargetX - this.flipStartX) * horizU;

      let liftFrac = 0;
      if (airU > 0 && airU < 1) {
        if (airU < 0.28) {
          const p = airU / 0.28;
          liftFrac = 1 - Math.pow(1 - p, 2.2);
        } else if (airU <= 0.68) {
          const h = (airU - 0.28) / 0.40;
          liftFrac = 1.0 - Math.sin(h * Math.PI) * 0.06;
        } else {
          const p = (airU - 0.68) / 0.32;
          liftFrac = 1 - Math.pow(p, 1.85);
        }
      }
      this.y = this.groundY - liftFrac * 86;
      this.flipAngle = 0;

      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }

      if (airU > 0.08 && airU < 0.88) {
        this._afterimageTimer += dt;
        if (this._afterimageTimer >= 0.14) {
          this._afterimageTimer = 0;
          this.spawnAfterimage(this.x, this.y, this.facing, 8, Math.min(29, Math.floor(u * 30)), 0.18);
        }
      }

      if (u >= 0.58 && !this.didActionFrame && enemy && !enemy.isDead) {
        this.didActionFrame = true;
        if (game?.audio) game.audio.play('arrow_shoot', this.x);
        const sx = this.x + this.facing * 42;
        const sy = this.y - 112;
        const dx = enemy.x - sx;
        const dy = (enemy.y - 98) - sy;
        const td = Math.hypot(dx, dy) || 1;
        const shotAng = Math.atan2(dy, dx);

        if (game?.vfx) {
          game.vfx.spawnProjectile({
            x: sx,
            y: sy,
            vx: (dx / td) * 755,
            vy: (dy / td) * 755,
            radius: 13,
            color: '#34d399',
            coreColor: '#fef08a',
            owner: this,
            damage: enemy.hasPoise && enemy.attackRange <= 160 ? 66 : 58,
            type: 'arrow'
          });
        }

        this.fx.spawn('sonicBowReleaseWave', sx, sy, {
          flip: false,
          palette: SYLVAN_STARLIGHT_PALETTE,
          light: 1.15,
          extra: { aimAngle: shotAng, radius: 24, twin: false }
        });
      }

      if (t >= this.dashDuration) {
        this.y = this.groundY;
        this.vy = 0;
        this.isFlipVault = false;
        this.flipAngle = 0;
        this.isInvulnerable = false;
        this.setState('IDLE');
      }
      return;
    }

    this.x = this._clampArenaX(this.x + this.dashDir * 295 * dt, game, 84);
    this._afterimageTimer += dt;
    if (this._afterimageTimer >= 0.14) {
      this._afterimageTimer = 0;
      const col = Math.min(29, Math.floor((t / Math.max(0.1, this.dashDuration)) * 30));
      this.spawnAfterimage(this.x, this.y, this.facing, 6, col, 0.18);
    }

    if (t >= 0.20 && !this.didActionFrame && enemy && !enemy.isDead) {
      this.didActionFrame = true;
      if (game?.audio) game.audio.play('arrow_shoot', this.x);
      const sx = this.x + this.facing * 46;
      const sy = this.y - 110;
      const dx = enemy.x - sx;
      const dy = (enemy.y - 106) - sy;
      const d = Math.hypot(dx, dy) || 1;
      const shotAng = Math.atan2(dy, dx);

      if (game?.vfx) {
        game.vfx.spawnProjectile({
          x: sx,
          y: sy,
          vx: (dx / d) * 720,
          vy: (dy / d) * 720,
          radius: 13,
          color: '#34d399',
          coreColor: '#fef08a',
          owner: this,
          damage: 45,
          type: 'arrow'
        });
      }

      this.fx.spawn('sonicBowReleaseWave', sx, sy, {
        flip: false,
        palette: SYLVAN_EMERALD_PALETTE,
        light: 1.1,
        extra: { aimAngle: shotAng, radius: 21, twin: false }
      });
    }

    if (t >= this.dashDuration) {
      this.isFlipVault = false;
      this.flipAngle = 0;
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  updateCrouch(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.crouchDuration || 0.96;
    this.vx *= Math.pow(0.001, dt);
    this.isCrouching = t < dur * 0.82;
    this.isDeflecting = this.isCrouching;

    if (t >= 0.16 && t < 0.57 && !this._drewBowVortex) {
      this._drewBowVortex = true;
      this.fx.spawn('sylvanBowDrawVortex', this.x + this.facing * 52, this.y - 96, {
        follow: this,
        offsetX: 52,
        offsetY: -96,
        palette: SYLVAN_STARLIGHT_PALETTE,
        maxDuration: 0.39,
        light: 1.1,
        extra: { radius: 20 }
      });
    } else if (t >= 0.57 && !this.didActionFrame) {
      this.didActionFrame = true;
      this.shotCombo++;
      this.vx -= this.facing * 38;
      if (game?.audio) game.audio.play('arrow_shoot', this.x);

      const spawnX = this.x + this.facing * 52;
      const spawnY = this.y - 96;
      const targetY = enemy ? enemy.y - 102 : spawnY;
      const dx = enemy ? enemy.x - spawnX : this.facing * 520;
      const dy = targetY - spawnY;
      const dist = Math.hypot(dx, dy) || 1;
      const speed = 735;
      const shotAng = Math.atan2(dy, dx);

      if (game?.vfx) {
        game.vfx.spawnProjectile({
          x: spawnX,
          y: spawnY,
          vx: (dx / dist) * speed,
          vy: (dy / dist) * speed,
          radius: 14,
          color: '#10b981',
          coreColor: '#fef08a',
          owner: this,
          damage: 90,
          type: 'arrow'
        });
      }

      this.fx.spawn('sonicBowReleaseWave', spawnX, spawnY, {
        flip: false,
        palette: SYLVAN_STARLIGHT_PALETTE,
        light: 1.2,
        extra: { aimAngle: shotAng, radius: 27, twin: true }
      });
    }

    if (t >= dur) {
      this.isCrouching = false;
      this.isDeflecting = false;
      this.setState('IDLE');
    }
  }

  update(dt, enemy, game) {
    this._currentEnemy = enemy;
    this.windPhase += dt * 3.0;
    this.wallFlipCooldown = Math.max(0, this.wallFlipCooldown - dt);
    this.crouchCooldown = Math.max(0, this.crouchCooldown - dt);
    this.vaultCooldown = Math.max(0, (this.vaultCooldown || 0) - dt);
    if (this._trueUltBeamTimer > 0) {
      this._trueUltBeamTimer = Math.max(0, this._trueUltBeamTimer - dt);
    }
    if (this.state !== 'AUTO_ATTACK' && this._comboPersistTimer > 0) {
      this._comboPersistTimer = Math.max(0, this._comboPersistTimer - dt);
    }

    this.fx.update(dt);

    for (let i = this.activeVfxAnims.length - 1; i >= 0; i--) {
      const v = this.activeVfxAnims[i];
      v.age += dt;
      if (v.followOwner) {
        v.x = this.x + v.offsetX * this.facing;
        v.y = this.y + v.offsetY;
      } else {
        if (v.isSeeker && enemy && !enemy.isDead) {
          const tx = enemy.x;
          const ty = enemy.y - 96;
          const dx = tx - v.x;
          const dy = ty - v.y;
          const dist = Math.hypot(dx, dy) || 1;
          const desiredVx = (dx / dist) * 690;
          const desiredVy = (dy / dist) * 690;
          v.vx += (desiredVx - v.vx) * Math.min(1, dt * 9.0);
          v.vy += (desiredVy - v.vy) * Math.min(1, dt * 9.0);
        }
        v.x += (v.vx || 0) * dt;
        v.y += (v.vy || 0) * dt;
      }
      if (v.age >= v.maxLife) {
        this.activeVfxAnims.splice(i, 1);
      }
    }

    for (let i = this.glaiveScars.length - 1; i >= 0; i--) {
      this.glaiveScars[i].age += dt;
      if (this.glaiveScars[i].age >= this.glaiveScars[i].maxLife) {
        this.glaiveScars.splice(i, 1);
      }
    }

    for (let i = this.brambleSnareZones.length - 1; i >= 0; i--) {
      const z = this.brambleSnareZones[i];
      z.age += dt;
      if (enemy && !enemy.isDead && Math.abs(enemy.x - z.x) <= z.radius) {
        enemy.vx *= 0.25;
      }
      if (z.age >= z.maxLife) {
        this.brambleSnareZones.splice(i, 1);
      }
    }

    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      this.afterimages[i].age += dt;
      if (this.afterimages[i].age >= this.afterimages[i].maxLife) {
        this.afterimages.splice(i, 1);
      }
    }

    const isManualPlayer = Boolean(
      (this.isPlayerControlled && !this.adventureAutoPlay) || this.isManualAdventureControl
    );
    if (!isManualPlayer && enemy && !enemy.isDead && (this.state === 'IDLE' || this.state === 'WALK')) {
      const ww = game?.renderer ? game.renderer.worldWidth : 1200;
      const dist = Math.abs(enemy.x - this.x);
      const pinnedLeft = this.x < 240 && enemy.x > this.x;
      const pinnedRight = this.x > ww - 240 && enemy.x < this.x;

      if ((pinnedLeft || pinnedRight || dist < 185) && dist < 260 && this.dodgeCooldown <= 0 && this.wallFlipCooldown <= 0) {
        this.wallFlipCooldown = 3.0;
        this.startJump(enemy, game);
        return;
      }

      if (
        dist >= 275 &&
        dist <= this.attackRange &&
        this.autoCooldown <= 0 &&
        this.crouchCooldown <= 0 &&
        this.shotCombo % 3 === 2
      ) {
        this.autoCooldown = this.autoInterval * (0.92 + Math.random() * 0.2);
        this.startCrouch(enemy, game);
        return;
      }

      if (dist < 220 && this.autoCooldown > 0 && this.x > 175 && this.x < ww - 175) {
        this.moveDir = -1;
        this.walkPhase += dt * 0.5;
        this.x -= this.facing * this.moveSpeed * 0.12 * dt;
      }
    }

    super.update(dt, enemy, game);
  }

  /**
   * 4-Beat Dynamic FFBE / Last Cloudia Ranged-Acrobat + Close-Quarters Bow-Glaive Flow (`[[60,8],[68,7],[75,8],[83,7]]`):
   * - V0 (`F03` `63`): 1-frame snap wide emerald-gold bow-arc smear + Mach shock-ring arrow (+ Twin-Arc Bow-Glaive slash at close quarters!)
   * - V1 (`F09` `69`): Rising upward Twin-Star 2-arrow volley (+ rising Bow-Glaive uppercut at close quarters!)
   * - V2 (`F17/F18` `77/78`): Spinning astral wind-crescent + rapid 2-arrow emerald streak + starfall sky-shot
   * - V3 (`F25` `85`): Airborne backstep/hop apex (`38px` lift) 3-arrow Astral Dragon-Piercer piercing volley with crunchy hit-stop!
   */
  updateAutoAttack(dt, enemy, game) {
    this._currentEnemy = enemy;
    this._comboPersistTimer = 0.72;

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

    const snapT = v === 0 ? 0.10 : v === 1 ? 0.08 : v === 2 ? 0.09 : 0.16;

    let localStep = 0;
    if (v === 0) {
      if (t < 0.10) localStep = Math.min(2, Math.floor((t / 0.10) * 3));
      else if (t < 0.16) localStep = 3;
      else if (t < 0.26) localStep = 4 + Math.min(1, Math.floor(((t - 0.16) / 0.10) * 2));
      else localStep = 6 + Math.min(1, Math.floor(((t - 0.26) / 0.10) * 2));
    } else if (v === 1) {
      if (t < 0.08) localStep = 0;
      else if (t < 0.14) localStep = 1;
      else if (t < 0.24) localStep = 2 + Math.min(1, Math.floor(((t - 0.14) / 0.10) * 2));
      else localStep = 4 + Math.min(2, Math.floor(((t - 0.24) / 0.11) * 3));
    } else if (v === 2) {
      if (t < 0.09) localStep = Math.min(1, Math.floor((t / 0.09) * 2));
      else if (t < 0.16) localStep = 2;
      else if (t < 0.22) localStep = 3;
      else localStep = 4 + Math.min(3, Math.floor(((t - 0.22) / 0.16) * 4));
    } else {
      if (t < 0.16) localStep = Math.min(1, Math.floor((t / 0.16) * 2));
      else if (t < 0.25) localStep = 2;
      else localStep = 3 + Math.min(3, Math.floor(((t - 0.25) / 0.23) * 4));
    }

    const frameIdx = sliceStart + Math.min(sliceLen - 1, Math.max(0, localStep));
    this.trueUltFrameOverride = frameIdx;
    this._overrideFrameIdx = frameIdx;

    // Footwork & Airborne Backstep/Hop Arc on Beat 4 (`V3`)
    this.vx = 0;
    if (t < snapT) {
      const moveU = Math.min(1, Math.max(0, t / snapT));
      const eased = 1 - Math.pow(1 - moveU, 2.1);
      this.x = this._beatStartX + (this._beatTargetX - this._beatStartX) * eased;

      if (t >= 0.02 && !this._drewBowVortex) {
        this._drewBowVortex = true;
        const isStar = v >= 2;
        const drawOffY = v === 1 ? -98 : v === 3 ? -120 : -110;
        this.fx.spawn('sylvanBowDrawVortex', this.x + this.facing * 54, this.y + drawOffY, {
          follow: this,
          offsetX: 54,
          offsetY: drawOffY,
          palette: isStar ? SYLVAN_STARLIGHT_PALETTE : SYLVAN_EMERALD_PALETTE,
          maxDuration: 0.16,
          light: v === 3 ? 1.20 : 1.08,
          extra: { radius: v === 3 ? 24 : 19 }
        });
      }
    } else if (!this._bootsPlanted) {
      this._bootsPlanted = true;
      this.x = this._beatTargetX;
      this.vx = 0;
    }

    if (v === 3) {
      // Airborne backstep-hop peaking at 38px right at F25 (`t = 0.16s`) and touching down cleanly!
      const hopEnd = dur * 0.84;
      if (t < hopEnd) {
        const hopU = Math.min(1, Math.max(0, t / hopEnd));
        const liftCurve = Math.sin(hopU * Math.PI);
        this.y = this.groundY - liftCurve * 38;
        this.vy = 0;
      } else {
        this.y = this.groundY;
        this.vy = 0;
      }
    } else {
      this.y = this.groundY;
      this.vy = 0;
    }

    const spawnX = this.x + this.facing * 58;
    const spawnY = v === 1 ? this.y - 98 : v === 3 ? this.y - 108 : this.y - 106;
    const targetY = enemy && !enemy.isDead ? (enemy.y || this.groundY) - 96 : spawnY;
    const dx = enemy && !enemy.isDead ? enemy.x - spawnX : this.facing * 520;
    const dy = targetY - spawnY;
    const aimDist = Math.hypot(dx, dy) || 1;
    const shotAng = Math.atan2(dy, dx);

    if (v === 0) {
      // Beat 1 (`V0`, `F03`): 1-frame snap emerald-gold Mach shock-ring arrow + close-quarters Twin-Arc Bow-Glaive sweep!
      if ((this._beatHitMask & 1) === 0 && t >= 0.10) {
        this._beatHitMask |= 1;
        this.didActionFrame = true;
        this.shotCombo++;
        if (game?.audio) game.audio.play('arrow_shoot', this.x);

        this._applyBowGlaiveSweep(enemy, game, {
          damage: 28,
          reachFront: 198,
          hitStop: 0.044,
          shakeDur: 0.056,
          knockX: 34,
          knockY: 0,
          scarDx: 102,
          scarDy: 68,
          isGold: false
        });

        if (game?.vfx) {
          const speed = 755;
          game.vfx.spawnProjectile({
            x: spawnX,
            y: spawnY,
            vx: (dx / aimDist) * speed,
            vy: (dy / aimDist) * speed,
            radius: 14,
            color: '#10b981',
            coreColor: '#fef08a',
            owner: this,
            damage: 86,
            isCrit: false,
            pierce: false,
            type: 'arrow'
          });
        }
        this.fx.spawn('sonicBowReleaseWave', spawnX, spawnY, {
          flip: false,
          palette: SYLVAN_EMERALD_PALETTE,
          light: 1.16,
          extra: { aimAngle: shotAng, radius: 24, twin: false }
        });
      }
    } else if (v === 1) {
      // Beat 2 (`V1`, `F09`): Rising upward Twin-Star 2-arrow volley + close-quarters Bow-Glaive uppercut!
      if ((this._beatHitMask & 1) === 0 && t >= 0.08) {
        this._beatHitMask |= 1;
        this.didActionFrame = true;
        this.shotCombo++;
        if (game?.audio) game.audio.play('arrow_shoot', this.x);

        this._applyBowGlaiveSweep(enemy, game, {
          damage: 30,
          reachFront: 202,
          hitStop: 0.044,
          shakeDur: 0.058,
          knockX: 30,
          knockY: -86,
          scarDx: 98,
          scarDy: -84,
          isGold: true
        });

        this.spawnVfxAnim(0, spawnX, spawnY, 174, 174, 0.28, {
          flipX: this.facing < 0,
          inFront: true
        });

        if (game?.vfx) {
          const speed = 735;
          game.vfx.spawnProjectile({
            x: spawnX,
            y: spawnY - 8,
            vx: (dx / aimDist) * speed,
            vy: (dy / aimDist) * speed - 22,
            radius: 14,
            color: '#10b981',
            coreColor: '#fef08a',
            owner: this,
            damage: 62,
            type: 'arrow'
          });
          game.vfx.spawnProjectile({
            x: spawnX - this.facing * 16,
            y: spawnY + 8,
            vx: (dx / aimDist) * (speed * 0.96),
            vy: (dy / aimDist) * (speed * 0.96) + 18,
            radius: 13,
            color: '#34d399',
            coreColor: '#fef08a',
            owner: this,
            damage: 54,
            type: 'arrow'
          });
        }
        this.fx.spawn('sonicBowReleaseWave', spawnX, spawnY, {
          flip: false,
          palette: SYLVAN_STARLIGHT_PALETTE,
          light: 1.24,
          extra: { aimAngle: shotAng, radius: 27, twin: true }
        });
      }
    } else if (v === 2) {
      // Beat 3 (`V2`, `F17` & `F18`): Spinning astral wind-crescent + rapid 2-arrow emerald streak!
      if ((this._beatHitMask & 1) === 0 && t >= 0.09) {
        this._beatHitMask |= 1;
        this.didActionFrame = true;
        this.shotCombo++;
        if (game?.audio) game.audio.play('arrow_shoot', this.x);
        this.spawnAfterimage(this.x, this.groundY, this.facing, 2, 17, 0.18);

        this._applyBowGlaiveSweep(enemy, game, {
          damage: 20,
          reachFront: 204,
          hitStop: 0.036,
          shakeDur: 0.048,
          knockX: 20,
          knockY: -28,
          scarDx: 108,
          scarDy: 34,
          isGold: false
        });

        if (game?.vfx) {
          const speed = 745;
          game.vfx.spawnProjectile({
            x: spawnX,
            y: spawnY - 6,
            vx: (dx / aimDist) * speed,
            vy: (dy / aimDist) * speed,
            radius: 14,
            color: '#34d399',
            coreColor: '#ffffff',
            owner: this,
            damage: 52,
            type: 'arrow'
          });
        }
        this.fx.spawn('sonicBowReleaseWave', spawnX, spawnY, {
          flip: false,
          palette: SYLVAN_EMERALD_PALETTE,
          light: 1.18,
          extra: { aimAngle: shotAng, radius: 24, twin: false }
        });
      }
      if ((this._beatHitMask & 2) === 0 && t >= 0.16) {
        this._beatHitMask |= 2;
        if (game?.audio) game.audio.play('arrow_shoot', this.x);

        this._applyBowGlaiveSweep(enemy, game, {
          damage: 24,
          reachFront: 206,
          hitStop: 0.044,
          shakeDur: 0.054,
          knockX: 28,
          knockY: -44,
          isCrit: true,
          scarDx: 108,
          scarDy: -42,
          isGold: true
        });

        const strikeX = enemy && !enemy.isDead ? enemy.x : spawnX + this.facing * 280;
        if (game?.vfx) {
          const speed = 760;
          game.vfx.spawnProjectile({
            x: spawnX,
            y: spawnY + 6,
            vx: (dx / aimDist) * speed,
            vy: (dy / aimDist) * speed,
            radius: 14,
            color: '#10b981',
            coreColor: '#fef08a',
            owner: this,
            damage: 56,
            type: 'arrow'
          });
          game.vfx.spawnSkyStrike?.({
            x: strikeX - this.facing * 42,
            y: -80,
            groundY: enemy?.groundY || this.groundY,
            vx: this.facing * 110,
            vy: 1420,
            type: 'starfall_arrow',
            color: '#34d399',
            coreColor: '#fef08a',
            owner: this,
            target: enemy,
            damage: 48,
            delay: 0,
            maxLinger: 0.42
          });
        }
        this.fx.spawn('sonicBowReleaseWave', spawnX, spawnY, {
          flip: false,
          palette: SYLVAN_STARLIGHT_PALETTE,
          light: 1.26,
          extra: { aimAngle: shotAng, radius: 28, twin: true }
        });
      }
    } else {
      // Beat 4 (`V3`, `F25`): Airborne backstep/hop apex 3-arrow Astral Dragon-Piercer smear volley + crunchy hit-stop!
      if ((this._beatHitMask & 1) === 0 && t >= 0.16) {
        this._beatHitMask |= 1;
        this.didActionFrame = true;
        this.shotCombo++;
        if (game?.audio) game.audio.play('arrow_shoot', this.x);
        this.spawnAfterimage(this.x, this.y, this.facing, 2, 25, 0.22);

        this.spawnVfxAnim(3, this.x + this.facing * 58, this.y - 96, 184, 184, 0.36, {
          flipX: this.facing < 0,
          inFront: true
        });

        this._applyBowGlaiveSweep(enemy, game, {
          damage: 28,
          reachFront: 224,
          hitStop: 0.052,
          shakeDur: 0.076,
          knockX: 46,
          knockY: -54,
          isCrit: true,
          scarDx: 112,
          scarDy: -78,
          isGold: true
        });

        if (game?.vfx) {
          const speed = 800;
          const fanOffsets = [-0.065, 0, 0.065];
          for (let k = 0; k < fanOffsets.length; k++) {
            const ang = shotAng + fanOffsets[k];
            game.vfx.spawnProjectile({
              x: spawnX + (k === 1 ? this.facing * 8 : 0),
              y: spawnY + (k - 1) * 9,
              vx: Math.cos(ang) * speed,
              vy: Math.sin(ang) * speed,
              radius: k === 1 ? 16 : 14,
              color: k === 1 ? '#10b981' : '#34d399',
              coreColor: '#fef08a',
              owner: this,
              damage: k === 1 ? 72 : 54,
              isCrit: true,
              pierce: true,
              type: 'arrow'
            });
          }
          game.vfx.spawnDamageText?.(this.x, this.y - 148, 0, true, 'DRAGON-PIERCER!', '#fde047');
        }

        this.fx.spawn('sonicBowReleaseWave', spawnX, spawnY, {
          flip: false,
          palette: SYLVAN_STARLIGHT_PALETTE,
          light: 1.34,
          extra: { aimAngle: shotAng, radius: 31, twin: true }
        });
      }
      if ((this._beatHitMask & 2) === 0 && t >= 0.23) {
        this._beatHitMask |= 2;
        this._applyBowGlaiveSweep(enemy, game, {
          damage: 24,
          reachFront: 226,
          hitStop: 0,
          shakeDur: 0.054,
          knockX: 88,
          knockY: -76,
          isCrit: true,
          scarDx: 106,
          scarDy: 68,
          isGold: true
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
        Math.abs(enemy.x - this.x) <= this.attackRange;

      if (v < 3 && (this._queuedNextBeat || advHoldingAttack || aiWantsChain)) {
        if (game?.adventure?.queuedAction === 'attack') {
          game.adventure.queuedAction = null;
        }
        this._intraLinkTimer = INTRA_COMBO_LINK;
        return;
      }

      if (v === 3) {
        this.comboStep = 0;
        this._aiComboReadyFinisher = 0.88;
        this.autoCooldown = isManualPlayer ? 0.05 : this._postFlurryInterval * (0.92 + Math.random() * 0.16);
      } else {
        this.autoCooldown = 0.015;
      }

      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      this.setState('IDLE');
    }
  }

  updateSkill(_dt, enemy, game) {
    const t = this.stateTimer;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const centerTargetX = Math.max(120, Math.min(ww - 120, enemy ? enemy.x : this.x + this.facing * 320));
    const targetX = enemy ? enemy.x : centerTargetX;
    const groundY = enemy?.groundY || this.groundY;

    if (t < 0.36) {
      if (t >= 0.04 && !this._skillLockSpawned) {
        this._skillLockSpawned = true;
        this.fx.spawn('sylvanBowDrawVortex', this.x + this.facing * 48, this.y - 120, {
          follow: this,
          offsetX: 48,
          offsetY: -120,
          palette: SYLVAN_EMERALD_PALETTE,
          maxDuration: 0.31,
          light: 1.05,
          extra: { radius: 22 }
        });
        this.fx.spawn('starfallCelestialLock', centerTargetX, this.groundY, {
          palette: SYLVAN_STARLIGHT_PALETTE,
          light: 1.1,
          extra: { radius: 34, beaconH: 60 }
        });

        this.spawnVfxAnim(2, targetX, groundY - 84, 220, 220, 1.35, {
          flipX: false,
          inFront: false
        });
        this.brambleSnareZones.push({
          x: targetX,
          groundY,
          radius: 135,
          age: 0,
          maxLife: 1.35
        });
        if (enemy && !enemy.isDead) {
          enemy.vx *= 0.25;
        }

        const bowX = this.x + this.facing * 48;
        const bowY = this.y - 120;
        const dx = targetX - bowX;
        const dy = (groundY - 96) - bowY;
        const dist = Math.hypot(dx, dy) || 1;
        for (const arcSign of [-1, 1]) {
          this.spawnVfxAnim(1, bowX, bowY + arcSign * 14, 176, 176, 0.52, {
            vx: (dx / dist) * 560,
            vy: (dy / dist) * 560 + arcSign * 135,
            flipX: this.facing < 0,
            inFront: true,
            isSeeker: true
          });
          if (game?.vfx) {
            game.vfx.spawnProjectile({
              x: bowX,
              y: bowY + arcSign * 12,
              vx: (dx / dist) * 665,
              vy: (dy / dist) * 665 + arcSign * 45,
              radius: 12,
              color: '#10b981',
              coreColor: '#fef08a',
              owner: this,
              damage: 40,
              type: 'arrow'
            });
          }
        }
      }
    } else if (t >= 0.36 && !this.didActionFrame) {
      this.didActionFrame = true;
      this.vx -= this.facing * 65;
      this.heal(22, 'STARLIGHT GRACE');
      if (game?.audio) game.audio.play('arrow_shoot', this.x);

      this._applyBowGlaiveSweep(enemy, game, {
        damage: 42,
        reachFront: 215,
        hitStop: 0.044,
        shakeDur: 0.058,
        knockX: 52,
        knockY: -55,
        isGold: true
      });

      const bowX = this.x + this.facing * 48;
      const bowY = this.y - 120;
      const fAng = this.facing === 1 ? 0 : Math.PI;

      this.fx.spawn('sonicBowReleaseWave', bowX, bowY, {
        flip: false,
        palette: SYLVAN_EMERALD_PALETTE,
        light: 1.2,
        extra: { aimAngle: fAng, radius: 27, twin: true }
      });

      if (game?.vfx) {
        [-0.16, 0, 0.16].forEach((angOff) => {
          const a = fAng + angOff;
          game.vfx.spawnProjectile({
            x: bowX,
            y: bowY,
            vx: Math.cos(a) * 685,
            vy: Math.sin(a) * 685,
            radius: 12,
            color: '#34d399',
            coreColor: '#fef08a',
            owner: this,
            damage: 64,
            type: 'arrow'
          });
        });
      }
    } else if (t >= 0.76 && !this.didSecondaryAction) {
      this.didSecondaryAction = true;
      this.vx -= this.facing * 45;
      if (game?.audio) game.audio.play('arrow_rain', centerTargetX);

      const bowX = this.x + this.facing * 42;
      const bowY = this.y - 134;
      const skyAng = this.facing === 1 ? -0.58 : Math.PI + 0.58;

      this.fx.spawn('sonicBowReleaseWave', bowX, bowY, {
        flip: false,
        palette: SYLVAN_STARLIGHT_PALETTE,
        light: 1.2,
        extra: { aimAngle: skyAng, radius: 26, twin: true }
      });

      this.fx.spawn('emeraldTempestCyclone', centerTargetX, this.groundY, {
        vx: this.facing * 32,
        palette: SYLVAN_EMERALD_PALETTE,
        light: 1.15,
        extra: {
          baseRadius: 11,
          topRadius: 30,
          height: 84,
          isUltimate: false
        }
      });
      this.fx.spawn('starfallRainBarrage', centerTargetX, this.groundY, {
        palette: SYLVAN_STARLIGHT_PALETTE,
        light: 1.2,
        extra: { spread: 44, count: 7 }
      });

      if (enemy && !enemy.isDead && Math.abs(enemy.x - centerTargetX) <= 155) {
        enemy.takeDamage(54, this, true, 48, -110);
      }

      if (game?.vfx) {
        game.vfx.spawnTornado?.({
          x: centerTargetX,
          groundY: this.groundY,
          vx: this.facing * 38,
          radius: 78,
          height: 265,
          color: '#10b981',
          coreColor: '#fef08a',
          maxLife: 1.10
        });

        for (let i = 0; i < 9; i++) {
          const spread = (i - 4) * 34 + (Math.random() - 0.5) * 14;
          game.vfx.spawnSkyStrike?.({
            x: centerTargetX + spread - this.facing * 90,
            y: -160 - i * 32,
            groundY: this.groundY,
            vx: this.facing * 240,
            vy: 1280,
            type: 'starfall_arrow',
            color: i % 2 === 0 ? '#10b981' : '#34d399',
            coreColor: '#fef08a',
            owner: this,
            target: enemy,
            damage: 40,
            delay: i * 0.06,
            maxLinger: 0.55
          });
        }
      }
    } else if (t >= 1.05) {
      this.setState('IDLE');
    }
  }

  /**
   * 1-Overdrive Ultimate (`state === 'ULTIMATE'`, `2.04s`):
   * "ZEPHYR VAULT: 180 STARLOCK"
   * - Phase 1 (`0.00s .. 0.32s`): Gale Charge-In rush + Twin-Arc Bow-Glaive Vault-Kick (`36` dmg).
   * - Phase 2 (`0.32s .. 1.56s`): 180 semicircular overhead flip-jump (`Row 4` `124..135` inverted somersault frames,
   *   zero `ctx.rotate`!) firing 7 radial Lock-On Homing Arrows around the 180 arc!
   * - Phase 3 (`1.56s .. 2.04s`): Agile opposite-side touchdown (`136`) + Sylvan recovery.
   */
  updateUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;

    this.isInvulnerable = t < 1.56;
    this.unstoppablePoise = true;
    this.hurtTimer = 0;
    this.isFlipVault = false;
    this.isCrouching = false;
    this.vx = 0;
    this.vy = 0;

    const targets = this.getEnemyTargets(enemy, game);
    const primary = enemy && !enemy.isDead ? enemy : targets[0] || null;

    if (t < 0.32) {
      if (this._ultPhase < 1) {
        this._ultPhase = 1;
        this._ultShotMask = 0;
        this._ultStartX = this.x;
        this._ultChargeDir = primary ? (primary.x >= this.x ? 1 : -1) : this.facing;
        this.facing = this._ultChargeDir;

        if (game?.audio) game.audio.play('zephyr_flip', this.x);
        if (game?.vfx) {
          game.vfx.spawnDamageText(this.x, this.y - 138, 0, false, 'ZEPHYR CHARGE!', '#34d399');
        }
        this.fx.spawn('zephyrGroundBurst', this.x, this.groundY, {
          palette: SYLVAN_EMERALD_PALETTE,
          light: 1.1,
          extra: { radius: 30 }
        });
        this.fx.spawn('zephyrVaultSlipstream', this.x - this.facing * 16, this.y - 104, {
          follow: this,
          offsetX: -16,
          offsetY: -104,
          flip: this.facing < 0,
          palette: SYLVAN_EMERALD_PALETTE,
          maxDuration: 1.55,
          light: 1.1,
          extra: { length: 28, tilt: -0.12 }
        });
        this.fx.spawn('astralWingPlume', this.x - this.facing * 16, this.y - 122, {
          follow: this,
          offsetX: -16,
          offsetY: -122,
          flip: this.facing < 0,
          palette: SYLVAN_STARLIGHT_PALETTE,
          maxDuration: 1.85,
          light: 1.2,
          extra: { wingSpan: 30 }
        });
      }

      const advBounds =
        game?.adventure?.active && typeof game.adventure.getActiveStageBounds === 'function'
          ? game.adventure.getActiveStageBounds()
          : null;
      const u = Math.min(1, Math.max(0, t / 0.32));
      const easeRush = 1 - Math.pow(1 - u, 2.25);
      const rawContactX = primary
        ? primary.x - this._ultChargeDir * 48
        : this._ultStartX + this._ultChargeDir * 240;
      const contactX = advBounds
        ? Math.max(advBounds.minX + 36, Math.min(advBounds.maxX - 36, rawContactX))
        : Math.max(120, Math.min(ww - 120, rawContactX));

      this.x = this._ultStartX + (contactX - this._ultStartX) * easeRush;
      this.y = this.groundY;
      this.cameraAirLift = 0;
      this._overrideFrameIdx = u < 0.55 ? 120 : 121;

      this._afterimageTimer += dt;
      if (this._afterimageTimer >= 0.09) {
        this._afterimageTimer = 0;
        this.spawnAfterimage(this.x, this.y, this.facing, 4, u < 0.55 ? 0 : 1, 0.20);
      }
      return;
    }

    const advBounds =
      game?.adventure?.active && typeof game.adventure.getActiveStageBounds === 'function'
        ? game.adventure.getActiveStageBounds()
        : null;

    if (this._ultPhase < 2) {
      this._ultPhase = 2;
      if (primary && !primary.isDead) {
        if (!primary.isColossalBoss) {
          primary.x = advBounds
            ? Math.max(advBounds.minX + 200, Math.min(advBounds.maxX - 200, primary.x))
            : Math.max(265, Math.min(ww - 265, primary.x));
          primary.vx = 0;
        }
        this._ultPivotX = advBounds
          ? Math.max(advBounds.minX + 200, Math.min(advBounds.maxX - 200, primary.x))
          : primary.x;
        primary.takeDamage(38, this, false, 30, -85);
        this.spawnVfxAnim(0, primary.x, (primary.groundY || this.groundY) - 96, 184, 184, 0.28, {
          flipX: this._ultChargeDir < 0,
          inFront: true
        });
        this.fx.spawn('sylvanArrowImpactBurst', primary.x, (primary.groundY || this.groundY) - 96, {
          flip: false,
          palette: SYLVAN_STARLIGHT_PALETTE,
          light: 1.2,
          extra: { aimAngle: -Math.PI * 0.5, isCrit: true }
        });
      } else {
        this._ultPivotX = advBounds
          ? Math.max(advBounds.minX + 200, Math.min(advBounds.maxX - 200, this.x + this._ultChargeDir * 48))
          : Math.max(265, Math.min(ww - 265, this.x + this._ultChargeDir * 48));
      }

      this.fx.spawn('yggdrasilLockReticle', this._ultPivotX, this.groundY - 98, {
        flip: false,
        palette: SYLVAN_STARLIGHT_PALETTE,
        maxDuration: 1.36,
        light: 1.25,
        extra: { radius: 19, chargeDir: this._ultChargeDir }
      });
      this.fx.spawn('zephyrGroundBurst', this.x, this.groundY, {
        palette: SYLVAN_STARLIGHT_PALETTE,
        light: 1.15,
        extra: { radius: 28 }
      });
      if (game?.audio) {
        game.audio.play('archer_ult', this.x);
        game.audio.play('zephyr_flip', this.x);
      }
      if (game?.vfx) {
        game.vfx.spawnDamageText(this._ultPivotX, this.groundY - 172, 0, true, '180 STARLOCK!', '#fef08a');
      }
      if (game?.renderer) {
        game.renderer.triggerShake?.(12, 0.24);
      }
      this._overrideFrameIdx = 123;
    }

    if (t < 1.56) {
      const arcU = Math.min(1, Math.max(0, (t - 0.32) / 1.24));
      const theta = arcU * Math.PI;
      const arcRadiusX = 192;
      const arcHeightY = 194;

      if (
        primary &&
        !primary.isDead &&
        !primary.isColossalBoss &&
        primary.state !== 'DODGE' &&
        primary.state !== 'JUMP'
      ) {
        primary.x += (this._ultPivotX - primary.x) * Math.min(1, dt * 7);
      }

      const rawArcX = this._ultPivotX - this._ultChargeDir * Math.cos(theta) * arcRadiusX;
      this.x = advBounds
        ? Math.max(advBounds.minX + 24, Math.min(advBounds.maxX - 24, rawArcX))
        : Math.max(84, Math.min(ww - 84, rawArcX));
      this.y = this.groundY - Math.sin(theta) * arcHeightY;
      this.cameraAirLift = Math.sin(theta) * 142;

      this.facing = theta >= Math.PI * 0.5 ? -this._ultChargeDir : this._ultChargeDir;

      // Baked Row 4 inverted somersault frames `124..135` (`F04..F15`, zero `ctx.rotate`!)
      const somCol = 4 + Math.min(11, Math.floor(arcU * 12));
      this._overrideFrameIdx = 120 + somCol;

      this._afterimageTimer += dt;
      if (this._afterimageTimer >= 0.11) {
        this._afterimageTimer = 0;
        this.spawnAfterimage(this.x, this.y, this.facing, 4, somCol, 0.22);
      }

      const lockAnglesDeg = [22, 46, 70, 90, 110, 134, 158];
      for (let i = 0; i < lockAnglesDeg.length; i++) {
        const triggerTheta = (lockAnglesDeg[i] * Math.PI) / 180;
        if (theta >= triggerTheta && (this._ultShotMask & (1 << i)) === 0) {
          this._ultShotMask |= 1 << i;

          const tx = primary && !primary.isDead ? primary.x : this._ultPivotX;
          const ty = (primary && !primary.isDead ? primary.y : this.groundY) - 96;
          const bowX = this.x + (tx >= this.x ? 16 : -16);
          const bowY = this.y - 68;
          const dx = tx - bowX;
          const dy = ty - bowY;
          const shotAng = Math.atan2(dy, dx);
          const isZenith = i === 3;
          const isFinisher = i === 6;

          if (game?.audio) {
            game.audio.play('arrow_shoot', this.x);
            if (isZenith || isFinisher) game.audio.play('arrow_hit', tx);
          }

          this.fx.spawn('starlockHomingArrow', bowX, bowY, {
            flip: false,
            palette: isZenith || isFinisher ? SYLVAN_STARLIGHT_PALETTE : SYLVAN_EMERALD_PALETTE,
            light: isZenith || isFinisher ? 1.3 : 1.15,
            extra: {
              dx: dx / 3,
              dy: dy / 3
            }
          });

          this.fx.spawn('sonicBowReleaseWave', bowX, bowY, {
            flip: false,
            palette: isZenith ? SYLVAN_STARLIGHT_PALETTE : SYLVAN_EMERALD_PALETTE,
            light: 1.15,
            extra: { aimAngle: shotAng, radius: isZenith ? 23 : 18, twin: isZenith }
          });

          this.spawnVfxAnim(1, bowX, bowY, 156, 156, 0.22, {
            vx: Math.cos(shotAng) * 860,
            vy: Math.sin(shotAng) * 860,
            flipX: dx < 0,
            inFront: true,
            isSeeker: true
          });

          if (primary && !primary.isDead) {
            const shotDmg = isZenith ? 38 : 28;
            primary.takeDamage(
              shotDmg,
              this,
              isZenith || isFinisher,
              isFinisher ? 140 : 18,
              isFinisher ? -170 : -24
            );
            if (isZenith || isFinisher) {
              this.spawnVfxAnim(4, tx, ty, 184, 184, 0.32, {
                flipX: false,
                inFront: true
              });
              if (game?.renderer) {
                game.renderer.triggerShake?.(isFinisher ? 18 : 11, 0.25);
              }
            }
          }
        }
      }
      return;
    }

    if (this._ultPhase < 3) {
      this._ultPhase = 3;
      this.didActionFrame = true;
      this.y = this.groundY;
      this.vy = 0;
      this.cameraAirLift = 0;
      this.facing = primary && !primary.isDead ? (primary.x >= this.x ? 1 : -1) : -this._ultChargeDir;
      this.autoCooldown = Math.max(this.autoCooldown, 0.52);
      this.fx.spawn('zephyrGroundBurst', this.x, this.groundY, {
        palette: SYLVAN_EMERALD_PALETTE,
        light: 1.1,
        extra: { radius: 28 }
      });
    }

    this.y = this.groundY;
    this.cameraAirLift = 0;
    this._overrideFrameIdx = t < 1.80 ? 135 : 136;

    if (t >= this.ultDuration) {
      this.isInvulnerable = false;
      this.unstoppablePoise = false;
      this._overrideFrameIdx = null;
      this.cameraAirLift = 0;
      this.setState('IDLE');
    }
  }

  /**
   * 3-Overdrive Supreme Ultimate (`state === 'TRUE_ULTIMATE'`, `4.55s`):
   * "ARROW OF YGGDRASIL: SUPERNOVA PIERCE"
   */
  updateTrueUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;

    this.isInvulnerable = true;
    this.unstoppablePoise = true;
    this.hurtTimer = 0;
    this.isFlipVault = false;
    this.isCrouching = false;
    this.vx = 0;
    this.vy = 0;

    const targets = this.getEnemyTargets(enemy, game);
    const primaryTarget = enemy && !enemy.isDead ? enemy : targets[0] || null;

    if (t >= 0.03 && this._trueUltStep < 1) {
      this._trueUltStep = 1;
      this._trueUltRootedTargets = [];

      const advBounds =
        game?.adventure?.active && typeof game.adventure.getActiveStageBounds === 'function'
          ? game.adventure.getActiveStageBounds()
          : null;
      const stageMinX = advBounds ? advBounds.minX : 0;
      const stageMaxX = advBounds ? advBounds.maxX : ww;

      const anchorX = primaryTarget
        ? primaryTarget.isColossalBoss
          ? primaryTarget.anchorX || primaryTarget.x
          : Math.max(stageMinX + 48, Math.min(stageMaxX - 48, primaryTarget.x))
        : Math.max(stageMinX + 72, Math.min(stageMaxX - 72, this.x + this.facing * 320));
      this._trueUltTargetX = anchorX;

      const leftEdgeX = stageMinX + (advBounds ? 44 : 108);
      const rightEdgeX = stageMaxX - (advBounds ? 44 : 108);
      this._trueUltFarEdgeX =
        Math.abs(anchorX - leftEdgeX) >= Math.abs(rightEdgeX - anchorX) ? leftEdgeX : rightEdgeX;
      this._trueUltJumpStartX = this.x;

      if (Math.abs(anchorX - this.x) > 4) {
        this.facing = anchorX >= this.x ? 1 : -1;
      }

      if (game?.audio) {
        game.audio.play('zephyr_flip', this.x);
        game.audio.play('arrow_shoot', this.x);
      }
      game?.vfx?.triggerCinematicCutIn?.(this, this.trueUltName, '#34d399');
      if (game?.vfx) {
        game.vfx.spawnDamageText(
          this.x,
          this.y - 162,
          0,
          true,
          'YGGDRASIL ROOTS: BIND!',
          '#34d399'
        );
      }

      for (const foe of targets) {
        const lockX = foe.isColossalBoss
          ? foe.anchorX || foe.x
          : Math.max(stageMinX + 48, Math.min(stageMaxX - 48, foe.x));
        const lockY = foe.groundY || this.groundY;
        if (!foe.isColossalBoss) {
          if (foe.state !== 'IDLE' && foe.state !== 'TRUE_ULTIMATE') {
            foe.setState('IDLE');
          }
          foe.x = lockX;
          foe.y = lockY;
          foe.vx = 0;
          foe.vy = 0;
          foe.isRooted = true;
          foe.isCrouching = false;
          foe.isDeflecting = false;
          foe.iaidoCounterActive = false;
          foe.stunTimer = Math.max(foe.stunTimer || 0, 3.20);
          foe.crouchCooldown = Math.max(foe.crouchCooldown || 0, 0.25);
          foe.dodgeCooldown = Math.max(foe.dodgeCooldown || 0, 0.25);
          foe.dashCooldown = Math.max(foe.dashCooldown || 0, 0.25);
        }
        this._trueUltRootedTargets.push({ foe, lockX, lockY });

        this.fx.spawn('yggdrasilRootPrison', lockX, lockY, {
          flip: false,
          palette: SYLVAN_EMERALD_PALETTE,
          maxDuration: 3.16,
          light: 1.25,
          extra: { radius: 26, height: 45 }
        });
        this.spawnVfxAnim(2, lockX, lockY - 82, 232, 232, 3.12, {
          flipX: false,
          inFront: false
        });
        this.spawnVfxAnim(5, lockX, lockY - 72, 340, 220, 3.12, {
          flipX: false,
          inFront: false
        });
        if (game?.vfx) {
          game.vfx.spawnDamageText(lockX, lockY - 152, 0, false, 'ROOTED!', '#6ee7b7');
        }
      }

      if (targets.length === 0) {
        this.fx.spawn('yggdrasilRootPrison', anchorX, this.groundY, {
          flip: false,
          palette: SYLVAN_EMERALD_PALETTE,
          maxDuration: 3.16,
          light: 1.25,
          extra: { radius: 26, height: 45 }
        });
      }
    }

    if (t < 3.15) {
      for (const entry of this._trueUltRootedTargets) {
        const foe = entry.foe;
        if (
          foe &&
          !foe.isDead &&
          !foe.isBenched &&
          !foe.isColossalBoss &&
          foe.state !== 'TRUE_ULTIMATE'
        ) {
          if (foe.state !== 'IDLE') {
            foe.setState('IDLE');
          }
          foe.x = entry.lockX;
          foe.y = entry.lockY;
          foe.vx = 0;
          foe.vy = 0;
          foe.isRooted = true;
          foe.isCrouching = false;
          foe.isDeflecting = false;
          foe.iaidoCounterActive = false;
          foe.stunTimer = Math.max(foe.stunTimer || 0, 0.25);
          foe.crouchCooldown = Math.max(foe.crouchCooldown || 0, 0.25);
          foe.dodgeCooldown = Math.max(foe.dodgeCooldown || 0, 0.25);
          foe.dashCooldown = Math.max(foe.dashCooldown || 0, 0.25);
        }
      }
    }

    if (t < 0.42) {
      this.y = this.groundY;
      this.cameraAirLift = 0;
      const fIdx = 120 + Math.min(3, Math.floor((t / 0.42) * 4));
      this.trueUltFrameOverride = fIdx;
      this._overrideFrameIdx = fIdx;
      return;
    }

    if (t < 1.28) {
      if (this._trueUltStep < 2) {
        this._trueUltStep = 2;
        this._trueUltJumpStartX = this.x;
        if (game?.audio) game.audio.play('zephyr_flip', this.x);
        this.fx.spawn('zephyrGroundBurst', this.x, this.groundY, {
          palette: SYLVAN_STARLIGHT_PALETTE,
          light: 1.2,
          extra: { radius: 34 }
        });
        this.fx.spawn('zephyrVaultSlipstream', this.x - this.facing * 16, this.y - 104, {
          follow: this,
          offsetX: -16,
          offsetY: -104,
          flip: this.facing < 0,
          palette: SYLVAN_STARLIGHT_PALETTE,
          maxDuration: 0.88,
          light: 1.15,
          extra: { length: 30, tilt: -0.14 }
        });
        if (game?.vfx) {
          game.vfx.spawnDamageText(this.x, this.y - 138, 0, false, 'FAR-HORIZON VAULT!', '#fef08a');
        }
      }

      const jumpU = Math.min(1, Math.max(0, (t - 0.42) / 0.86));
      const easeX = jumpU < 0.5 ? 2 * jumpU * jumpU : 1 - Math.pow(-2 * jumpU + 2, 2) / 2;
      const lift = Math.sin(jumpU * Math.PI) * 188;

      this.x = this._trueUltJumpStartX + (this._trueUltFarEdgeX - this._trueUltJumpStartX) * easeX;
      this.y = this.groundY - lift;
      this.cameraAirLift = lift * 0.78;

      const jumpDir = Math.sign(this._trueUltFarEdgeX - this._trueUltJumpStartX) || -this.facing;
      this.facing =
        jumpU >= 0.52 ? (this._trueUltTargetX >= this._trueUltFarEdgeX ? 1 : -1) : jumpDir;

      const flipCol = 4 + Math.min(12, Math.floor(jumpU * 13)); // Row 4 F04..F16 (`124..136`)
      this.trueUltFrameOverride = 120 + flipCol;
      this._overrideFrameIdx = 120 + flipCol;

      this._afterimageTimer += dt;
      if (this._afterimageTimer >= 0.10) {
        this._afterimageTimer = 0;
        this.spawnAfterimage(this.x, this.y, this.facing, 4, flipCol, 0.22);
      }
      return;
    }

    // Phase 3 (`1.28s .. 3.15s` -- 6-Pinion Astral Light-Wings Ascension `137..144` & Colossal Greatbow Charge!)
    if (t < 3.15) {
      if (this._trueUltStep < 3) {
        this._trueUltStep = 3;
        this.x = this._trueUltFarEdgeX;
        this.facing = this._trueUltTargetX >= this.x ? 1 : -1;

        if (game?.audio) game.audio.play('archer_ult', this.x);
        if (game?.vfx) {
          game.vfx.spawnDamageText(
            this.x,
            this.groundY - 168,
            0,
            true,
            'ARROW OF YGGDRASIL!',
            '#34d399'
          );
        }

        this.fx.spawn('zephyrGroundBurst', this.x, this.groundY, {
          palette: SYLVAN_EMERALD_PALETTE,
          light: 1.15,
          extra: { radius: 32 }
        });
        this.spawnVfxAnim(5, this.x, this.groundY - 72, 340, 220, 2.15, {
          flipX: false,
          inFront: false
        });
        this.fx.spawn('astralWingPlume', this.x - this.facing * 16, this.y - 124, {
          follow: this,
          offsetX: -16,
          offsetY: -124,
          flip: this.facing < 0,
          palette: SYLVAN_STARLIGHT_PALETTE,
          maxDuration: 3.1,
          light: 1.35,
          extra: { wingSpan: 35 }
        });
        this.fx.spawn('sylvanBowDrawVortex', this.x + this.facing * 38, this.y - 96, {
          follow: this,
          offsetX: 38,
          offsetY: -96,
          palette: SYLVAN_STARLIGHT_PALETTE,
          maxDuration: 1.84,
          light: 1.35,
          extra: { radius: 30 }
        });
      }

      this.x = this._trueUltFarEdgeX;
      this.facing = this._trueUltTargetX >= this.x ? 1 : -1;
      const ascU = Math.min(1, Math.max(0, (t - 1.28) / 0.85));
      const liftY = 64 * Math.sin(ascU * (Math.PI * 0.5));
      this.y = this.groundY - liftY;
      this.cameraAirLift = liftY * 0.5;

      const drawU = Math.min(1, Math.max(0, (t - 1.28) / 1.87));
      const fIdx = 137 + Math.min(7, Math.floor(drawU * 8));
      this.trueUltFrameOverride = fIdx;
      this._overrideFrameIdx = fIdx;

      if (t >= 1.35 && t <= 3.10) {
        this._trueUltMoteTimer += dt;
        if (this._trueUltMoteTimer >= 0.16) {
          this._trueUltMoteTimer = 0;
          const muzzleX = this.x + this.facing * 38;
          const muzzleY = this.y - 96;
          if (game?.vfx?.spawnParticles) {
            game.vfx.spawnParticles(muzzleX, muzzleY, 2, '#34d399');
          } else if (game?.vfx?.spawnParticle) {
            for (let i = 0; i < 2; i++) {
              const ang = Math.PI * i + t * 5.5;
              const rad = 74;
              game.vfx.spawnParticle({
                x: muzzleX + Math.cos(ang) * rad,
                y: muzzleY + Math.sin(ang) * rad,
                vx: -Math.cos(ang) * 195,
                vy: -Math.sin(ang) * 195,
                size: 4.5,
                color: i % 2 === 0 ? '#34d399' : '#fef08a',
                maxLife: 0.34
              });
            }
          }
        }
      }
      return;
    }

    if (this._trueUltStep < 4) {
      this._trueUltStep = 4;
      this._trueUltBeamTimer = 0.96;

      game?.renderer?.triggerImpactFrame?.(0.11, this.x, this.y - 96, 'emerald');
      if (game?.renderer && game.renderer.impactFrameTimer > 1.0) {
        game.renderer.triggerImpactFrame(this.x, this.y - 96, 0.11, 'emerald');
      }
      game?.renderer?.shake?.(26, 0.68);
      game?.renderer?.triggerShake?.(26, 0.68);
      game?.renderer?.flash?.(0.28, '#ecfdf5');
      game?.renderer?.triggerAberration?.(16);
      game?.renderer?.triggerHitStop?.(0.09);

      if (game?.audio) {
        game.audio.play('archer_ult', this.x);
        game.audio.play('solar_beam', this.x);
        game.audio.play('arrow_hit', this._trueUltTargetX);
      }

      this.heal(Math.round(this.maxHp * 0.14), 'WORLD-TREE GRACE');

      const startX = this.x + this.facing * 42;
      const startY = this.y - 96;
      const endX = this.facing >= 0 ? ww - 76 : 76;
      this.fx.spawn('astralHurricaneLance', startX, startY, {
        flip: false,
        palette: SYLVAN_STARLIGHT_PALETTE,
        light: 1.4,
        extra: {
          dx: (endX - startX) / 3,
          dy: 0,
          width: 9.6
        }
      });
      this.fx.spawn('sonicBowReleaseWave', startX, startY, {
        flip: false,
        palette: SYLVAN_STARLIGHT_PALETTE,
        light: 1.35,
        extra: { aimAngle: this.facing >= 0 ? 0 : Math.PI, radius: 34, twin: true }
      });

      const hitSet = new Set();
      const allCandidates = [
        ...this._trueUltRootedTargets.map((e) => e.foe),
        ...targets
      ];
      for (const tFoe of allCandidates) {
        if (tFoe && !tFoe.isDead && !tFoe.isBenched && !hitSet.has(tFoe)) {
          hitSet.add(tFoe);
          tFoe.isRooted = false;
          tFoe.isCrouching = false;
          tFoe.isDeflecting = false;
          tFoe.stunTimer = 0;
          tFoe.takeDamage(700, this, true, 210, -210);
          const impY = (tFoe.groundY || this.groundY) - 96;
          this.spawnVfxAnim(3, tFoe.x, impY, 216, 216, 0.44, {
            flipX: this.facing < 0,
            inFront: true
          });
          this.spawnVfxAnim(4, tFoe.x, impY, 224, 224, 0.42, {
            flipX: false,
            inFront: true
          });
          this.fx.spawn('sylvanArrowImpactBurst', tFoe.x, impY, {
            flip: false,
            palette: SYLVAN_STARLIGHT_PALETTE,
            light: 1.4,
            extra: { aimAngle: this.facing === 1 ? 0 : Math.PI, isCrit: true }
          });
        }
      }
      if (hitSet.size === 0 && primaryTarget && !primaryTarget.isDead) {
        primaryTarget.isRooted = false;
        primaryTarget.isCrouching = false;
        primaryTarget.isDeflecting = false;
        primaryTarget.stunTimer = 0;
        primaryTarget.takeDamage(700, this, true, 210, -210);
      }
      this.releaseRootedTargets();
    }

    const descU = Math.min(1, Math.max(0, (t - 3.15) / (this.trueUltDuration - 3.15)));
    const remLift = 64 * Math.cos(descU * (Math.PI * 0.5));
    this.y = this.groundY - remLift;
    this.cameraAirLift = remLift * 0.5;
    const relIdx = 145 + Math.min(4, Math.floor(descU * 5));
    this.trueUltFrameOverride = relIdx;
    this._overrideFrameIdx = relIdx;

    if (t >= this.trueUltDuration) {
      this.y = this.groundY;
      this.vy = 0;
      this.cameraAirLift = 0;
      this.isInvulnerable = false;
      this.unstoppablePoise = false;
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      this._trueUltBeamTimer = 0;
      this.autoCooldown = Math.max(this.autoCooldown, 0.65);
      this.releaseRootedTargets();
      this.setState('IDLE');
    }
  }

  drawGlaiveScars(ctx) {
    if (!this.glaiveScars || this.glaiveScars.length === 0) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    for (let i = 0; i < this.glaiveScars.length; i++) {
      const s = this.glaiveScars[i];
      const u = Math.min(1, s.age / s.maxLife);
      const fade = u < 0.15 ? 1.0 : Math.max(0, 1 - (u - 0.15) / 0.85);
      if (fade <= 0.02) continue;

      const dx = s.x1 - s.x0;
      const dy = s.y1 - s.y0;
      const steps = Math.max(10, Math.round(Math.max(Math.abs(dx), Math.abs(dy)) / 4));
      ctx.globalAlpha = Math.min(1, fade * 0.94);

      for (let k = 0; k <= steps; k++) {
        const su = k / steps;
        const taper = Math.sin(su * Math.PI);
        if (taper <= 0.08) continue;
        const px = Math.round((s.x0 + dx * su) / 2) * 2;
        const py = Math.round((s.y0 + dy * su) / 2) * 2;
        const rad = Math.max(2, Math.round(taper * 5) * 2);

        ctx.fillStyle = s.isGold ? '#065f46' : '#047857';
        ctx.fillRect(px - rad, py - rad, rad * 2, rad * 2);
        const mid = Math.max(2, rad - 2);
        ctx.fillStyle = s.isGold ? '#fde047' : '#34d399';
        ctx.fillRect(px - mid, py - mid, mid * 2, mid * 2);
        if (taper > 0.35) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(px - 2, py - 2, 4, 4);
        }
      }
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  drawBehind(ctx, _renderer = null) {
    const sprites = this.getExSprites();
    const vfxSheet = PixelForge.ensureImage?.(sprites?.vfx) || sprites?.vfx;
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (const v of this.activeVfxAnims) {
      if (v.inFront) continue;
      const u = Math.min(1, Math.max(0, v.age / Math.max(0.05, v.maxLife)));
      const span = Math.max(1, (v.endFrame ?? 29) - (v.startFrame ?? 0) + 1);
      const col = Math.min(29, (v.startFrame ?? 0) + Math.floor(u * span));
      const sx = col * 208;
      const sy = v.row * 208;
      const alpha = u < 0.10 ? u / 0.10 : u > 0.80 ? (1 - u) / 0.20 : 1.0;

      ctx.save();
      ctx.translate(Math.round(v.x), Math.round(v.y));
      if (v.flipX) ctx.scale(-1, 1);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha * 0.94));
      ctx.drawImage(vfxSheet, sx, sy, 208, 208, -v.w * 0.5, -v.h * 0.5, v.w, v.h);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha * 0.14));
      ctx.drawImage(vfxSheet, sx, sy, 208, 208, -v.w * 0.5, -v.h * 0.5, v.w, v.h);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.restore();
    }
    ctx.restore();
  }

  drawForegroundOverlay(ctx, renderer = null) {
    const sprites = this.getExSprites();
    const sheet = PixelForge.ensureImage?.(sprites?.sheet) || sprites?.sheet;

    this.drawBehind(ctx, renderer);

    if (this.afterimages.length > 0 && sheet?.complete && sheet.naturalWidth) {
      for (let i = 0; i < this.afterimages.length; i++) {
        const img = this.afterimages[i];
        const alpha = Math.max(0, (1 - img.age / img.maxLife) * 0.44);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(Math.round(img.x / 2) * 2, Math.round((img.y + 4) / 2) * 2);
        ctx.scale(img.facing, 1);
        ctx.globalAlpha = alpha;
        PixelForge.drawSilhouetteFrame(ctx, sprites, img.frameIdx, 208, 208, '#34d399');
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    }

    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    if (this.fx && !this.isDead) {
      this.fx.renderLayer(ctx, 'back', arenaCenterX, this.groundY, 0.96);
    }
  }

  drawUltimateForeground(ctx, renderer = null) {
    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    if (this.fx && !this.isDead) {
      this.fx.renderLayer(ctx, 'front', arenaCenterX, this.groundY, 0.98);
    }
    if (this.glaiveScars.length > 0) {
      this.drawGlaiveScars(ctx);
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

    PixelForge.drawSheetFrame(ctx, sprites, this, w, h, this.windPhase, isReflection, renderer);

    if (this.hitFlash > 0 && !isReflection) {
      const frameIdx = PixelForge.getFrameIndex(this, this.windPhase);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5;
      PixelForge.drawGhostFrame(ctx, sprites, frameIdx, w, h);
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();

    if (isReflection) return;

    const vfxSheet = PixelForge.ensureImage?.(sprites?.vfx) || sprites?.vfx;
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    for (const v of this.activeVfxAnims) {
      if (!v.inFront) continue;
      const u = Math.min(1, Math.max(0, v.age / Math.max(0.05, v.maxLife)));
      const span = Math.max(1, (v.endFrame ?? 29) - (v.startFrame ?? 0) + 1);
      const col = Math.min(29, (v.startFrame ?? 0) + Math.floor(u * span));
      const sx = col * 208;
      const sy = v.row * 208;
      const alpha = u < 0.08 ? u / 0.08 : u > 0.78 ? (1 - u) / 0.22 : 1.0;

      ctx.save();
      ctx.translate(Math.round(v.x), Math.round(v.y));
      if (v.flipX) ctx.scale(-1, 1);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha * 0.96));
      ctx.drawImage(vfxSheet, sx, sy, 208, 208, -v.w * 0.5, -v.h * 0.5, v.w, v.h);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha * 0.14));
      ctx.drawImage(vfxSheet, sx, sy, 208, 208, -v.w * 0.5, -v.h * 0.5, v.w, v.h);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // Supreme Ultimate Phase 3 (`1.32s .. 3.14s`): Colossal Drawn Celestial Greatbow (`Row 6`, 280x280) + Sagittarius Sightline
    if (this.state === 'TRUE_ULTIMATE' && this.stateTimer >= 1.32 && this.stateTimer <= 3.14) {
      const chargeU = Math.min(1, Math.max(0, (this.stateTimer - 1.32) / 1.82));
      const col = Math.min(29, Math.floor(chargeU * 30));
      const sx = col * 208;
      const sy = 6 * 208;
      const bowX = Math.round(this.x + this.facing * 38);
      const bowY = Math.round(this.y - 96);

      ctx.save();
      const sightAlpha = Math.min(0.68, 0.20 + chargeU * 0.48);
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 2;
      ctx.globalAlpha = sightAlpha * 0.36;
      ctx.beginPath();
      ctx.moveTo(bowX + this.facing * 42, bowY);
      ctx.lineTo(this._trueUltTargetX, this.groundY - 96);
      ctx.stroke();

      ctx.strokeStyle = '#fef9c3';
      ctx.lineWidth = 1;
      ctx.globalAlpha = sightAlpha * 0.72;
      ctx.beginPath();
      ctx.moveTo(bowX + this.facing * 42, bowY);
      ctx.lineTo(this._trueUltTargetX, this.groundY - 96);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.restore();

      ctx.save();
      ctx.translate(bowX, bowY);
      ctx.scale(this.facing, 1);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.96;
      ctx.drawImage(vfxSheet, sx, sy, 208, 208, -140, -140, 280, 280);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.15;
      ctx.drawImage(vfxSheet, sx, sy, 208, 208, -140, -140, 280, 280);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // Supreme Ultimate Phase 4 (`this._trueUltBeamTimer > 0`): Seamless Tiled Horizontal Row 7 Supernova Dragon-Arrow Beam!
    if (this._trueUltBeamTimer > 0) {
      const beamProg = Math.min(1, Math.max(0, 1 - this._trueUltBeamTimer / 0.96));
      const col = Math.min(29, Math.floor(beamProg * 30));
      const sx = col * 208;
      const sy = 7 * 208;
      const env = this._trueUltBeamTimer < 0.22 ? this._trueUltBeamTimer / 0.22 : 1.0;
      const muzzleX = Math.round(this.x + this.facing * 38);
      const beamY = Math.round(this.y - 96);
      const coreSliceX = sx + 44;
      const coreSliceW = 112;
      const tipSliceX = sx + 156;
      const tipSliceW = 44;
      const segCount = 12;

      ctx.save();
      ctx.translate(muzzleX, beamY);
      ctx.scale(this.facing, 1);

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = Math.max(0, Math.min(1, env * 0.98));
      for (let i = 0; i < segCount; i++) {
        const segX = 24 + i * coreSliceW;
        ctx.drawImage(vfxSheet, coreSliceX, sy, coreSliceW, 208, segX, -112, coreSliceW, 224);
      }
      ctx.drawImage(vfxSheet, tipSliceX, sy, tipSliceW, 208, 24 + segCount * coreSliceW, -112, tipSliceW, 224);
      ctx.drawImage(vfxSheet, sx, 6 * 208, 208, 208, -140, -140, 280, 280);

      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.max(0, Math.min(1, env * 0.16));
      for (let i = 0; i < segCount; i++) {
        const segX = 24 + i * coreSliceW;
        ctx.drawImage(vfxSheet, coreSliceX, sy, coreSliceW, 208, segX, -112, coreSliceW, 224);
      }
      ctx.drawImage(vfxSheet, tipSliceX, sy, tipSliceW, 208, 24 + segCount * coreSliceW, -112, tipSliceW, 224);
      ctx.drawImage(vfxSheet, sx, 6 * 208, 208, 208, -140, -140, 280, 280);

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
