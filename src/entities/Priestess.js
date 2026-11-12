import { Fighter } from './Fighter.js?v=30fps80';
import { PixelForge } from '../engine/PixelForge.js?v=30fps80';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps80';
import {
  SERAPHIC_EFFECT_REGISTRY,
  SERAPHIC_GOLD_PALETTE,
  SERAPHIC_GRACE_PALETTE,
  SERAPHIC_STAINED_PALETTE
} from '../engine/shaders/seraphicShaders.js?v=30fps80';

/**
 * Seraphina (`priestess`) — High Priestess & Sanctuary Archangel Weaver.
 * Powered natively by `ArcaneShaderFX` (dual-buffer 120Hz HD-2D shader & particle engine)
 * + `assets/sprites/priestess_sheet.png`, `assets/sprites/seraphim_wings.png`, & `assets/sprites/priestess_vfx.png`.
 */
export class Priestess extends Fighter {
  constructor(x, groundY, facing = -1) {
    const opts = typeof x === 'object' && x !== null ? x : { x, groundY, facing };
    super({
      ...opts,
      name: opts.name || 'Seraphina',
      maxHp: 3620,
      attackRange: 512,
      moveSpeed: 148,
      autoInterval: 1.12,
      lightColor: 'rgba(253, 224, 71, 1)',
      primaryColor: '#fde047',
      hasTrueUltimate: true,
      trueUltName: 'FINAL GRACE',
      trueUltDuration: 4.25
    });
    this.heroId = 'priestess';
    this.theme = 'radiant';
    this.deathSfx = 'death_priestess';
    this.skillMaxCooldown = 5.00;
    this.autoDuration = 0.90;
    this.skillDuration = 0.98;
    this.ultDuration = 1.52;
    this.ultName = 'SERAPHIC APOTHEOSIS';
    this.skillName = 'DIVINE SANCTUARY';
    this.hasTrueUltimate = true;
    this.trueUltName = 'FINAL GRACE';
    this.trueUltDuration = 4.25;
    this.haloPhase = 0;
    this.shotCombo = 0;
    this.evadeToggle = 0;
    this.dodgeMaxCooldown = 3.90;
    this.dashMaxCooldown = 3.85;
    this.wallWingCooldown = 0;
    this.crouchCooldown = 0;
    this.crouchDuration = 0.96;
    this.isCrouching = false;
    this.isFlipVault = false;
    this.isBlinkTeleport = false;
    this.isAngelicAscent = false;
    this.ascentStartX = this.x;
    this.ascentTargetX = this.x;
    this.didSanctuaryHeal = false;
    this.didUltMiracle = false;
    this.ultChakramStep = 0;
    this.wingSpearCount = 0;
    this._drewScepterFocus = false;
    this._spawnedBenedictionWard = false;

    // Supreme Ultimate ("FINAL GRACE") state
    this.finalGraceBeamActive = false;
    this.finalGraceBeamTimer = 0;
    this.finalGraceChargeProgress = 0;
    this.finalGraceDidHeal = false;
    this.finalGraceDidFire = false;
    this.finalGraceBeamY = 0;
    this.finalGraceMuzzleX = 0;
    this._finalGracePulseAccum = 0;
    this._finalGraceMoteAccum = 0;

    this.fx = new ArcaneShaderFX(SERAPHIC_EFFECT_REGISTRY, {
      pixelScale: 3,
      viewW: 540,
      viewH: 320
    });

    if (typeof Image !== 'undefined') {
      const priestessAssets = PixelForge.initAssets()?.priestess;
      if (priestessAssets?.vfx?.src && !priestessAssets.vfx.src.includes('v=30fps62')) {
        priestessAssets.vfx.src = 'assets/sprites/priestess_vfx.png?v=30fps80';
      }
    }
  }

  setState(newState) {
    super.setState(newState);
    this._drewScepterFocus = false;
    this._spawnedBenedictionWard = false;

    if (
      newState !== 'JUMP' &&
      newState !== 'DODGE' &&
      newState !== 'DASH' &&
      newState !== 'SKILL' &&
      newState !== 'ULTIMATE' &&
      newState !== 'TRUE_ULTIMATE'
    ) {
      this.fx?.stopByKey('seraphicSlipstreamTrail');
      this.fx?.stopByKey('sanctuaryCathedralSeal');
    }
    if (
      newState !== 'JUMP' &&
      newState !== 'DODGE' &&
      newState !== 'DASH' &&
      newState !== 'ULTIMATE' &&
      newState !== 'TRUE_ULTIMATE'
    ) {
      this.fx?.stopByKey('seraphicSlipstreamTrail');
    }
    if (newState !== 'ULTIMATE' && newState !== 'TRUE_ULTIMATE') {
      this.fx?.stopByKey('ophanimChakramWheel');
    }

    if (newState === 'TRUE_ULTIMATE') {
      this.isInvulnerable = true;
      this.unstoppablePoise = true;
      this.hurtTimer = 0;
      this.isCrouching = false;
      this.isDeflecting = false;
      this.isFlipVault = false;
      this.isBlinkTeleport = false;
      this.isAngelicAscent = false;
      this.finalGraceBeamActive = false;
      this.finalGraceBeamTimer = 0;
      this.finalGraceChargeProgress = 0;
      this.finalGraceDidHeal = false;
      this.finalGraceDidFire = false;
      this._finalGracePlayedChargeSfx = false;
      this._finalGracePulseAccum = 0.24;
      this._finalGraceMoteAccum = 0;
    } else {
      this.finalGraceBeamActive = false;
      this.finalGraceBeamTimer = 0;
      this.finalGraceChargeProgress = 0;
      this.finalGraceDidHeal = false;
      this.finalGraceDidFire = false;
      this._finalGracePulseAccum = 0;
      this._finalGraceMoteAccum = 0;
      this.unstoppablePoise = false;
      this.fx?.stopByKey('seraphicFinalGraceCharge');
    }
  }

  ensureSlipstream() {
    if (!this.fx) return;
    if (!this.fx.active.some((s) => s.key === 'seraphicSlipstreamTrail')) {
      this.fx.spawn('seraphicSlipstreamTrail', this.x - this.facing * 8, this.y - 114, {
        follow: this,
        offsetX: -8,
        offsetY: -114,
        flip: this.facing < 0,
        light: 1.15
      });
    }
  }

  ensureSanctuarySeal(isUltimate = false) {
    if (!this.fx) return;
    if (!this.fx.active.some((s) => s.key === 'sanctuaryCathedralSeal')) {
      this.fx.spawn('sanctuaryCathedralSeal', this.x, this.groundY, {
        follow: this,
        offsetX: 0,
        offsetY: 0,
        useGroundY: true,
        flip: false,
        light: isUltimate ? 1.32 : 1.18,
        extra: { isUltimate }
      });
    }
  }

  ensureOphanimWheel() {
    if (!this.fx) return;
    if (!this.fx.active.some((s) => s.key === 'ophanimChakramWheel')) {
      this.fx.spawn('ophanimChakramWheel', this.x, this.y - 118, {
        follow: this,
        offsetX: 0,
        offsetY: -118,
        flip: this.facing < 0,
        light: 1.34
      });
    }
  }

  onProjectileTrail(p) {
    if (!this.fx || p.type !== 'holy_light') return;
    if (p.ringTimer >= 0.05) {
      p.ringTimer = 0;
      this.fx.burst(p.x - Math.sign(p.vx || 1) * 16, p.y, {
        count: 3,
        speedMin: 22,
        speedMax: 68,
        lifeMin: 0.16,
        lifeMax: 0.28,
        gravity: -18,
        spread: 1.15,
        angle: Math.atan2(-(p.vy || 0), -(p.vx || 1)),
        colors: ['#ffffff', '#fef08a', '#facc15', '#38bdf8']
      });
    }
  }

  onProjectileHit(p, _hitTarget, isCrit, game) {
    if (!this.fx) return false;
    this.fx.spawn('holyStarImpactBurst', p.x, p.y, {
      flip: false,
      light: isCrit ? 1.34 : 1.18,
      extra: { isCrit }
    });
    this.fx.burst(p.x, p.y, {
      count: isCrit ? 18 : 12,
      speedMin: 58,
      speedMax: isCrit ? 220 : 172,
      lifeMin: 0.2,
      lifeMax: 0.4,
      gravity: 78,
      colors: isCrit
        ? ['#ffffff', '#fef08a', '#facc15', '#38bdf8', '#34d399']
        : ['#ffffff', '#fef08a', '#facc15', '#38bdf8']
    });
    if (game?.vfx) {
      game.vfx.spawnGlyphBurst(p.x, p.y, 5, 'radiant');
    }
    return true;
  }

  startJump(enemy, game, customDir = null) {
    this.dodgeCooldown = this.dodgeMaxCooldown * (0.86 + Math.random() * 0.28);
    this.setState('JUMP');
    this.isInvulnerable = true;
    this.isBlinkTeleport = false;
    this.isFlipVault = true;
    this.isAngelicAscent = true;
    this.wallWingCooldown = 3.5;

    const ww = game.renderer.worldWidth;
    let dir = customDir !== null ? customDir : -this.facing;
    if (this.x < 185) dir = 1;
    else if (this.x > ww - 185) dir = -1;

    const dist = enemy ? Math.abs(enemy.x - this.x) : 300;
    const retreatX = this.x - this.facing * 260;
    const pressuredOrCornered =
      this.x < 330 ||
      this.x > ww - 330 ||
      retreatX < 190 ||
      retreatX > ww - 190 ||
      dist < 245;

    this.ascentStartX = this.x;
    this.wingSpearCount = 0;

    if (enemy && pressuredOrCornered) {
      this.dashDuration = 0.64;
      const openSideDir = enemy.x < ww * 0.5 ? 1 : -1;
      let target = enemy.x + openSideDir * 355;
      if (Math.abs(target - this.x) < 260) {
        const crossDir = this.x < enemy.x ? 1 : -1;
        target = enemy.x + crossDir * 345;
      }
      this.ascentTargetX = Math.max(145, Math.min(ww - 145, target));
      this.dashDir = Math.sign(this.ascentTargetX - this.ascentStartX) || 1;
      if (game.vfx) {
        game.vfx.spawnDamageText(this.x, this.y - 146, 0, false, 'SERAPHIC WING VAULT!', '#fef08a');
      }
    } else {
      this.dashDuration = 0.60;
      this.ascentTargetX = Math.max(145, Math.min(ww - 145, this.x + dir * 340));
      this.dashDir = dir;
      if (game.vfx) {
        game.vfx.spawnDamageText(this.x, this.y - 142, 0, false, 'SERAPHIC GLIDE!', '#fef08a');
      }
    }

    this.vx = 0;
    this.vy = 0;
    if (game.audio) game.audio.play('holy_heal', this.x);
    this.heal(8, 'WINGS OF GRACE');
    this.ensureSlipstream();
    this.ensureSanctuarySeal(false);
    this.fx.spawn('graceHealBloom', this.x, this.groundY, {
      follow: this,
      offsetX: 0,
      offsetY: 0,
      useGroundY: true,
      light: 1.2
    });
    if (game.vfx) {
      game.vfx.spawnGlyphBurst(this.x, this.y - 100, 8, 'radiant');
    }
  }

  startCrouch(enemy, game) {
    this.crouchCooldown = 4.0;
    this.crouchDuration = 0.96;
    this.setState('CROUCH');
    this.isCrouching = true;
    this.isDeflecting = true;
    this.vx = 0;
    this.y = this.groundY;
    this._spawnedBenedictionWard = true;
    this.fx.spawn('benedictionRoseWard', this.x, this.groundY, {
      follow: this,
      offsetX: 0,
      offsetY: 0,
      useGroundY: true,
      flip: this.facing < 0,
      light: 1.22
    });
    this.fx.spawn('graceHealBloom', this.x, this.groundY, {
      follow: this,
      offsetX: 0,
      offsetY: 0,
      useGroundY: true,
      light: 1.15
    });
    if (game && game.vfx) {
      if (game.audio) game.audio.play('holy_heal', this.x);
      this.heal(8, 'BENEDICTION');
      game.vfx.spawnGlyphBurst(this.x, this.y - 88, 6, 'radiant');
      game.vfx.spawnDamageText(this.x, this.y - 122, 0, false, 'BENEDICTION PRAYER!', '#fef08a');
    }
  }

  onStartDodge(enemy, game, dir) {
    const ww = game.renderer.worldWidth;
    const dist = enemy ? Math.abs(enemy.x - this.x) : 300;
    const retreatX = this.x - this.facing * 260;
    const pressuredOrCornered =
      this.x < 330 ||
      this.x > ww - 330 ||
      retreatX < 190 ||
      retreatX > ww - 190 ||
      dist < 245;

    this.isBlinkTeleport = false;
    this.isAngelicAscent = true;
    this.isFlipVault = true;
    this.wallWingCooldown = 3.5;
    this.ascentStartX = this.x;
    this.wingSpearCount = 0;

    if (enemy && pressuredOrCornered) {
      this.dashDuration = 0.64;
      const openSideDir = enemy.x < ww * 0.5 ? 1 : -1;
      let target = enemy.x + openSideDir * 355;
      if (Math.abs(target - this.x) < 260) {
        const crossDir = this.x < enemy.x ? 1 : -1;
        target = enemy.x + crossDir * 345;
      }
      this.ascentTargetX = Math.max(145, Math.min(ww - 145, target));
      this.dashDir = Math.sign(this.ascentTargetX - this.ascentStartX) || 1;
      if (game.vfx) {
        game.vfx.spawnDamageText(this.x, this.y - 146, 0, false, 'SERAPHIC WING VAULT!', '#fef08a');
      }
    } else {
      this.dashDuration = 0.60;
      this.ascentTargetX = Math.max(145, Math.min(ww - 145, this.x + dir * 340));
      this.dashDir = dir;
      if (game.vfx) {
        game.vfx.spawnDamageText(this.x, this.y - 142, 0, false, 'SERAPHIC GLIDE!', '#fef08a');
      }
    }

    this.vx = 0;
    this.vy = 0;
    if (game.audio) game.audio.play('holy_heal', this.x);
    this.heal(8, 'WINGS OF GRACE');
    this.ensureSlipstream();
    this.ensureSanctuarySeal(false);
    this.fx.spawn('graceHealBloom', this.x, this.groundY, {
      follow: this,
      offsetX: 0,
      offsetY: 0,
      useGroundY: true,
      light: 1.2
    });
    if (game.vfx) {
      game.vfx.spawnGlyphBurst(this.x, this.y - 100, 8, 'radiant');
    }
  }

  onStartDash(_enemy, game, dir) {
    this.isBlinkTeleport = false;
    this.isAngelicAscent = true;
    this.isFlipVault = false;
    this.dashDuration = 0.42;
    this.dashDir = dir;
    this.vx = dir * 365;
    this.ensureSlipstream();
    this.ensureSanctuarySeal(false);
    if (game.audio) game.audio.play('holy_bolt', this.x);
    if (game.vfx) {
      game.vfx.spawnGlyphBurst(this.x, this.y - 95, 5, 'radiant');
      game.vfx.spawnDamageText(this.x, this.y - 140, 0, false, 'RADIANT WING GLIDE!', '#fef08a');
    }
  }

  updateDashOrDodge(dt, enemy, game) {
    const t = this.stateTimer;

    if ((this.state === 'JUMP' || this.state === 'DODGE') && this.isFlipVault) {
      const u = Math.min(1, t / this.dashDuration);
      const airU = Math.max(0, Math.min(1, (u - 0.10) / 0.76));

      const horizU = airU < 0.35
        ? (airU / 0.35) * 0.44
        : airU < 0.70
          ? 0.44 + ((airU - 0.35) / 0.35) * 0.28
          : 0.72 + ((airU - 0.70) / 0.30) * 0.28;
      this.x = this.ascentStartX + (this.ascentTargetX - this.ascentStartX) * horizU;

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

      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }

      if (u >= 0.48 && !this.didActionFrame && enemy && !enemy.isDead) {
        this.didActionFrame = true;
        this.wingSpearCount++;
        if (game.audio) game.audio.play('holy_bolt', this.x);
        const sx = this.x + this.facing * 44;
        const sy = this.y - 110;
        const dx = enemy.x - sx;
        const dy = (enemy.y - 96) - sy;
        const d = Math.hypot(dx, dy) || 1;
        game.vfx.spawnProjectile({
          x: sx,
          y: sy,
          vx: (dx / d) * 725,
          vy: (dy / d) * 725,
          radius: 14,
          color: '#fde047',
          coreColor: '#ffffff',
          owner: this,
          damage: 58,
          type: 'holy_light',
          isMeteor: false
        });
        const localAim = Math.atan2(dy, Math.abs(dx));
        this.fx.spawn('scepterStarburstCone', sx, sy, {
          flip: this.facing < 0,
          light: 1.25,
          extra: { aimAngle: localAim }
        });
        const shotAng = Math.atan2(dy, dx);
        game.vfx.spawnSlash(sx, sy, 56, shotAng - 0.8, shotAng + 0.8, '#fde047', 0.24);
        game.vfx.spawnGlyphBurst(sx, sy, 5, 'radiant');
      }

      if (t >= this.dashDuration) {
        this.y = this.groundY;
        this.vy = 0;
        this.isAngelicAscent = false;
        this.isFlipVault = false;
        this.isInvulnerable = false;
        this.fx.burst(this.x, this.groundY - 6, {
          count: 10,
          speedMin: 40,
          speedMax: 120,
          gravity: 80,
          colors: ['#ffffff', '#fef08a', '#facc15', '#34d399']
        });
        this.setState('IDLE');
      }
      return;
    }

    const uDash = Math.min(1, t / (this.dashDuration || 0.42));
    this.x += this.dashDir * 355 * (1 - 0.22 * uDash) * dt;
    this.y = this.groundY - Math.sin(uDash * Math.PI) * 26;

    if (t >= this.dashDuration) {
      this.y = this.groundY;
      this.isAngelicAscent = false;
      this.isBlinkTeleport = false;
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  updateCrouch(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.crouchDuration || 0.96;
    this.vx *= Math.pow(0.001, dt);
    this.y = this.groundY;
    this.isCrouching = t < dur * 0.82;
    this.isDeflecting = this.isCrouching;

    if (!this._spawnedBenedictionWard && t < 0.42) {
      this._spawnedBenedictionWard = true;
      this.fx.spawn('benedictionRoseWard', this.x, this.groundY, {
        follow: this,
        offsetX: 0,
        offsetY: 0,
        useGroundY: true,
        flip: this.facing < 0,
        light: 1.22
      });
    }

    if (t >= 0.44 && !this.didActionFrame) {
      this.didActionFrame = true;
      this.shotCombo++;
      this.vx -= this.facing * 32;
      if (game.audio) game.audio.play('holy_bolt', this.x);

      const spawnX = this.x + this.facing * 52;
      const spawnY = this.y - 96;
      const targetY = enemy ? enemy.y - 100 : spawnY;
      const dx = enemy ? enemy.x - spawnX : this.facing * 510;
      const dy = targetY - spawnY;
      const dist = Math.hypot(dx, dy) || 1;
      const speed = 710;

      game.vfx.spawnProjectile({
        x: spawnX,
        y: spawnY,
        vx: (dx / dist) * speed,
        vy: (dy / dist) * speed,
        radius: 15,
        color: '#fde047',
        coreColor: '#ffffff',
        owner: this,
        damage: 80,
        type: 'holy_light',
        isMeteor: false
      });

      this.fx.spawn('scepterStarburstCone', spawnX, spawnY, {
        flip: this.facing < 0,
        light: 1.24,
        extra: { aimAngle: Math.atan2(dy, Math.abs(dx)) }
      });

      const cAng = this.facing === 1 ? 0 : Math.PI;
      game.vfx.spawnSlash(spawnX, spawnY, 54, cAng - 0.8, cAng + 0.8, '#fde047', 0.22);
      game.vfx.spawnGlyphBurst(spawnX, spawnY, 5, 'radiant');
    }

    if (t >= dur) {
      this.isCrouching = false;
      this.isDeflecting = false;
      this.setState('IDLE');
    }
  }

  update(dt, enemy, game) {
    this.haloPhase += dt * 2.8;
    this.wallWingCooldown = Math.max(0, this.wallWingCooldown - dt);
    this.crouchCooldown = Math.max(0, this.crouchCooldown - dt);
    this.fx.update(dt);

    const readyForTrueUlt =
      this.hasTrueUltimate && (this.finisherGauge || 0) >= (this.maxFinisherGauge || 100);

    if (
      !readyForTrueUlt &&
      enemy &&
      !enemy.isDead &&
      (this.state === 'IDLE' || this.state === 'WALK')
    ) {
      const dist = Math.abs(enemy.x - this.x);
      const ww = game.renderer.worldWidth;
      const nearWall = this.x < 260 || this.x > ww - 260;
      const incomingProj =
        game.vfx &&
        game.vfx.projectiles.some((p) => p.owner === enemy && Math.abs(p.x - this.x) < 145);
      if ((dist < 225 || (nearWall && dist < 295) || incomingProj) && this.dodgeCooldown <= 0) {
        this.startJump(enemy, game);
        return;
      }

      if (
        dist >= 270 &&
        dist <= this.attackRange &&
        this.autoCooldown <= 0 &&
        this.crouchCooldown <= 0 &&
        this.shotCombo % 2 === 1
      ) {
        this.autoCooldown = this.autoInterval * (0.92 + Math.random() * 0.2);
        this.startCrouch(enemy, game);
        return;
      }

      if (dist < 235) {
        this.x -= this.facing * this.moveSpeed * 0.68 * dt;
      }
    }
    super.update(dt, enemy, game);
  }

  updateAutoAttack(dt, enemy, game) {
    const t = this.stateTimer;
    this.y = this.groundY;

    const isDawnGrace = (this.shotCombo + (this.didActionFrame ? 0 : 1)) % 3 === 0;
    if (isDawnGrace) {
      this.ensureSanctuarySeal(false);
    }

    if (t < 0.34) {
      this.torsoAngle = -this.facing * 0.12 * (t / 0.34);
      if (!this._drewScepterFocus) {
        this._drewScepterFocus = true;
        this.fx.spawn('scepterStarFocus', this.x + this.facing * 48, this.y - 116, {
          follow: this,
          offsetX: 48,
          offsetY: -116,
          flip: this.facing < 0,
          light: 1.16
        });
      }
    } else if (t < 0.70) {
      if (!this.didActionFrame) {
        this.didActionFrame = true;
        this.shotCombo++;
        this.vx -= this.facing * 44;
        this.torsoVel = -this.facing * 6;
        if (game.audio) game.audio.play('holy_bolt', this.x);

        const spawnX = this.x + this.facing * 52;
        const spawnY = this.y - 116;
        const targetY = enemy ? enemy.y - 110 : spawnY;
        const dx = enemy ? enemy.x - spawnX : this.facing * 460;
        const dy = targetY - spawnY;
        const dist = Math.hypot(dx, dy) || 1;
        const speed = 648;
        const mode = this.shotCombo % 3;
        const isGraceCast = mode === 0;

        game.vfx.spawnProjectile({
          x: spawnX,
          y: spawnY,
          vx: (dx / dist) * speed,
          vy: (dy / dist) * speed,
          radius: 15,
          color: '#fde047',
          coreColor: '#ffffff',
          owner: this,
          damage: isGraceCast ? 68 : 90,
          type: 'holy_light',
          isMeteor: false
        });

        this.fx.spawn('scepterStarburstCone', spawnX, spawnY, {
          flip: this.facing < 0,
          light: isGraceCast ? 1.3 : 1.2,
          extra: { aimAngle: Math.atan2(dy, Math.abs(dx)), isGrace: isGraceCast }
        });

        if (isGraceCast) {
          this.heal(16, 'DAWN GRACE');
          this.fx.spawn('graceHealBloom', this.x, this.groundY, {
            follow: this,
            offsetX: 0,
            offsetY: 0,
            useGroundY: true,
            light: 1.24
          });
          game.vfx.spawnProjectile({
            x: spawnX - this.facing * 14,
            y: spawnY - 14,
            vx: (dx / dist) * (speed * 0.95),
            vy: (dy / dist) * (speed * 0.95) - 18,
            radius: 13,
            color: '#facc15',
            coreColor: '#fef9c3',
            owner: this,
            damage: 34,
            type: 'holy_light',
            isMeteor: false
          });

          if (enemy && !enemy.isDead) {
            this.fx.spawn('holySpearReticle', enemy.x - this.facing * 24, this.groundY, {
              light: 1.22
            });
            game.vfx.spawnSkyStrike({
              x: enemy.x - this.facing * 24,
              y: -150,
              groundY: this.groundY,
              vx: this.facing * 85,
              vy: 1180,
              type: 'holy_spear',
              color: '#fde047',
              coreColor: '#ffffff',
              owner: this,
              target: enemy,
              damage: 36,
              isUltimate: false
            });
          }
        }

        game.vfx.spawnGlyphBurst(spawnX, spawnY, 5, 'radiant');
      }
    } else if (t >= this.autoDuration) {
      this.y = this.groundY;
      this.setState('IDLE');
    }
  }

  updateSkill(dt, enemy, game) {
    const t = this.stateTimer;
    this.y = this.groundY;

    this.ensureSanctuarySeal(false);

    if (t < 0.18) {
      this.didSanctuaryHeal = false;
    } else if (t >= 0.20 && !this.didSanctuaryHeal) {
      this.didSanctuaryHeal = true;
      if (game.audio) game.audio.play('holy_heal', this.x);
      this.heal(38, 'SANCTUARY');
      this.fx.spawn('graceHealBloom', this.x, this.groundY, {
        follow: this,
        offsetX: 0,
        offsetY: 0,
        useGroundY: true,
        light: 1.3
      });
      game.vfx.spawnGlyphBurst(this.x, this.y - 110, 10, 'heal');

      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 215) {
        const pushDir = Math.sign(enemy.x - this.x) || this.facing;
        enemy.vx += pushDir * 175;
      }
    }

    if (t >= 0.46 && !this.didActionFrame && enemy) {
      this.didActionFrame = true;
      this.vx -= this.facing * 46;
      if (game.audio) game.audio.play('holy_smite', enemy.x);

      const sx = this.x + this.facing * 52;
      const sy = this.y - 118;
      const dx = enemy.x - sx;
      const dy = (enemy.y - 108) - sy;
      const dist = Math.hypot(dx, dy) || 1;
      const horizDist = Math.abs(enemy.x - this.x);

      this.fx.spawn('scepterStarburstCone', sx, sy, {
        flip: this.facing < 0,
        light: 1.32,
        extra: { aimAngle: Math.atan2(dy, Math.abs(dx)), isGrace: true }
      });

      game.vfx.spawnBeam({
        x1: enemy.x - 135,
        y1: -120,
        x2: enemy.x + 25,
        y2: this.groundY - 8,
        width: 38,
        color: '#fde047',
        coreColor: '#ffffff',
        maxLife: 0.44
      });
      game.vfx.spawnBeam({
        x1: enemy.x + 135,
        y1: -120,
        x2: enemy.x - 25,
        y2: this.groundY - 8,
        width: 38,
        color: '#facc15',
        coreColor: '#ffffff',
        maxLife: 0.44
      });

      game.vfx.spawnFlamePillar(enemy.x, this.groundY, this, null, {
        theme: 'radiant',
        delay: 0.02,
        maxLife: 0.76,
        scaleWidth: 0.94
      });
      this.fx.spawn('cathedralSanctumPillar', enemy.x, this.groundY, {
        light: 1.36,
        extra: { scaleWidth: 1.0 }
      });

      if (!enemy.isDead) {
        const beamDmg = horizDist >= 260 ? 84 : 74;
        enemy.takeDamage(beamDmg, this, false, 60, -45);
      }

      for (const side of [-1, 1]) {
        this.fx.spawn('holySpearReticle', enemy.x + side * 44, this.groundY, {
          light: 1.24
        });
        game.vfx.spawnSkyStrike({
          x: enemy.x + side * 44,
          y: -160,
          groundY: this.groundY,
          vx: -side * 90,
          vy: 1220,
          type: 'holy_spear',
          color: '#fde047',
          coreColor: '#ffffff',
          owner: this,
          target: enemy,
          damage: 26,
          delay: side < 0 ? 0 : 0.06,
          isUltimate: false
        });
      }

      game.vfx.spawnProjectile({
        x: sx,
        y: sy,
        vx: (dx / dist) * 645,
        vy: (dy / dist) * 645,
        radius: 16,
        color: '#fde047',
        coreColor: '#ffffff',
        owner: this,
        damage: 52,
        type: 'holy_light',
        isMeteor: false
      });

      game.vfx.spawnGlyphBurst(enemy.x, this.groundY - 95, 11, 'radiant');
    } else if (t >= this.skillDuration) {
      this.y = this.groundY;
      this.setState('IDLE');
    }
  }

  updateUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    const ww = game.renderer ? game.renderer.worldWidth : 1200;
    const targetX = enemy ? enemy.x : ww * 0.5;
    this.isFlipVault = false;
    this.isBlinkTeleport = false;
    this.isAngelicAscent = false;
    this.vx = 0;
    this.vy = 0;

    this.ensureSlipstream();
    this.ensureSanctuarySeal(true);
    this.ensureOphanimWheel();

    if (t < 0.08) {
      this.didUltMiracle = false;
      this.ultChakramStep = 0;
    }

    let lift = 0;
    if (t < 0.38) {
      lift = Math.sin((t / 0.38) * (Math.PI * 0.5)) * 122;
    } else if (t < 1.18) {
      lift = 122 + Math.sin((t - 0.38) * 8.0) * 7;
    } else {
      lift = Math.max(0, Math.cos(((t - 1.18) / 0.34) * (Math.PI * 0.5)) * 122);
    }
    this.y = this.groundY - lift;

    if (t >= 0.16 && !this.didUltMiracle) {
      this.didUltMiracle = true;
      if (game.audio) game.audio.play('holy_heal', this.x);
      this.heal(46, 'MIRACLE');
      this.fx.spawn('graceHealBloom', this.x, this.groundY, {
        follow: this,
        offsetX: 0,
        offsetY: 0,
        useGroundY: true,
        light: 1.36
      });
      game.vfx.spawnGlyphBurst(this.x, this.y - 115, 14, 'heal');
    }

    const volleyTimes = [0.44, 0.56, 0.68, 0.80];
    if (
      this.ultChakramStep < volleyTimes.length &&
      t >= volleyTimes[this.ultChakramStep] &&
      enemy &&
      !enemy.isDead
    ) {
      const step = this.ultChakramStep;
      this.ultChakramStep++;
      if (game.audio) game.audio.play('holy_bolt', this.x);

      const haloX = this.x + Math.cos(step * 1.57) * 72;
      const haloY = this.y - 122 + Math.sin(step * 1.57) * 42;
      const aimX = enemy.x + (step - 1.5) * 44;
      const aimY = this.groundY - 12;

      game.vfx.spawnBeam({
        x1: haloX,
        y1: haloY,
        x2: aimX,
        y2: aimY,
        width: 30,
        color: '#fde047',
        coreColor: '#ffffff',
        maxLife: 0.42
      });

      this.fx.spawn('holySpearReticle', aimX, this.groundY, {
        light: 1.28
      });

      game.vfx.spawnSkyStrike({
        x: aimX,
        y: -160,
        groundY: this.groundY,
        vx: 0,
        vy: 1260,
        type: 'holy_spear',
        color: '#fde047',
        coreColor: '#ffffff',
        owner: this,
        target: enemy,
        damage: 18,
        isUltimate: true
      });

      game.vfx.spawnGlyphBurst(aimX, this.groundY - 45, 5, 'radiant');
      enemy.takeDamage(28, this, false, 28, 0);
    }

    if (t >= 0.94 && !this.didActionFrame) {
      this.didActionFrame = true;
      if (game.audio) game.audio.play('priestess_ult', targetX);

      game.renderer.triggerShake(24, 0.58);
      game.renderer.triggerAberration(14);
      game.renderer.triggerHitStop(0.085);

      game.vfx.spawnBeam({
        x1: targetX - 240,
        y1: -140,
        x2: targetX + 65,
        y2: this.groundY - 8,
        width: 74,
        color: '#fde047',
        coreColor: '#ffffff',
        maxLife: 0.78
      });

      game.vfx.spawnBeam({
        x1: targetX + 240,
        y1: -140,
        x2: targetX - 65,
        y2: this.groundY - 8,
        width: 74,
        color: '#facc15',
        coreColor: '#ffffff',
        maxLife: 0.78
      });

      game.vfx.spawnBeam({
        x1: this.x + this.facing * 52,
        y1: this.y - 118,
        x2: targetX,
        y2: this.groundY - 95,
        width: 48,
        color: '#fef08a',
        coreColor: '#ffffff',
        maxLife: 0.68
      });

      const pillarOffsets = [0, -135, 135];
      pillarOffsets.forEach((off, idx) => {
        const px = Math.max(75, Math.min(ww - 75, targetX + off));
        game.vfx.spawnFlamePillar(px, this.groundY, this, null, {
          theme: 'radiant',
          delay: idx === 0 ? 0.01 : 0.06,
          maxLife: idx === 0 ? 0.86 : 0.72,
          scaleWidth: idx === 0 ? 1.18 : 0.86,
          isUltimate: idx === 0
        });
        this.fx.spawn('cathedralSanctumPillar', px, this.groundY, {
          light: idx === 0 ? 1.42 : 1.28,
          extra: { scaleWidth: idx === 0 ? 1.18 : 0.86 }
        });
      });

      this.fx.spawn('holyStarImpactBurst', targetX, this.groundY - 92, {
        light: 1.4,
        extra: { isCrit: true }
      });

      game.vfx.spawnGlyphBurst(targetX, this.groundY - 90, 14, 'radiant');
      game.vfx.spawnGlyphBurst(targetX, this.groundY - 90, 8, 'heal');

      if (enemy && !enemy.isDead) {
        enemy.takeDamage(168, this, true, 150, -210);
      }
    } else if (t >= this.ultDuration) {
      this.y = this.groundY;
      this.setState('IDLE');
    }
  }

  /**
   * Supreme Ultimate: `"FINAL GRACE"` (`TRUE_ULTIMATE`, `4.25s`).
   * Phase 1 (`0.00s..3.00s`): Invulnerable winged flight + 30% Max HP heal (`1,104 HP`) + whole-screen expanding celestial bloom charge.
   * Phase 2 (`3.00s..3.92s`): Single instant stored tanked-damage horizontal counter-beam (`———`), then smooth descent (`3.92s..4.25s`).
   * Never replaces the arena stage background (`setStageTransformation` is never called).
   */
  updateTrueUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    this.isInvulnerable = true;
    this.unstoppablePoise = true;
    this.hurtTimer = 0;
    this.isFlipVault = false;
    this.isBlinkTeleport = false;
    this.isAngelicAscent = false;
    this.vx = 0;
    this.vy = 0;

    // Face nearest active enemy during 0.00s..2.85s, then lock facing cleanly before firing
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
    if (focusEnemy && !focusEnemy.isDead && t < 2.85) {
      this.facing = focusEnemy.x >= this.x ? 1 : -1;
    }

    this.ensureSlipstream();
    this.ensureSanctuarySeal(true);
    this.ensureOphanimWheel();

    if (!this._finalGracePlayedChargeSfx) {
      this._finalGracePlayedChargeSfx = true;
      if (game?.audio) game.audio.play('final_grace_charge', this.x);
    }

    if (t < 3.0) {
      // Phase 1 (0.00s..3.00s): 3.0s Invulnerable Winged Flight + 30% Max HP Heal + Whole-Screen Charge
      const ascU = Math.min(1, t / 0.55);
      const ascEase = 1 - Math.pow(1 - ascU, 2.4);
      const hoverBob = t >= 0.55 ? Math.sin(t * 4.2) * 4 : 0;
      const lift = 66 * ascEase + hoverBob;
      this.y = this.groundY - lift;

      if (t < 0.45) {
        this.trueUltFrameOverride = 120 + Math.min(4, Math.floor((t / 0.45) * 5));
      } else if (t < 2.45) {
        this.trueUltFrameOverride = 125 + (Math.floor((t - 0.45) * 10) % 5);
      } else {
        this.trueUltFrameOverride = 130 + Math.min(3, Math.floor(((t - 2.45) / 0.55) * 4));
      }

      if (t >= 0.55 && !this.finalGraceDidHeal) {
        this.finalGraceDidHeal = true;
        const healAmt = Math.round(this.maxHp * 0.18);
        if (game?.audio) game.audio.play('holy_heal', this.x);
        this.heal(healAmt, 'FINAL GRACE');
        this.fx.spawn('graceHealBloom', this.x, this.groundY, {
          follow: this,
          offsetX: 0,
          offsetY: 0,
          useGroundY: true,
          light: 1.45
        });
        this.fx.burst(this.x, this.y - 98, {
          count: 24,
          speedMin: 48,
          speedMax: 185,
          lifeMin: 0.28,
          lifeMax: 0.56,
          gravity: -42,
          colors: ['#ffffff', '#fef08a', '#fde047', '#34d399', '#6ee7b7']
        });
        if (game?.vfx) {
          game.vfx.spawnGlyphBurst(this.x, this.y - 104, 14, 'heal');
        }
      }

      const muzzleX = this.x + this.facing * 56;
      const beamY = this.y - 104;
      this.finalGraceMuzzleX = muzzleX;
      this.finalGraceBeamY = beamY;
      this.finalGraceChargeProgress = Math.min(1, t / 3.0);

      this._finalGracePulseAccum += dt;
      if (this._finalGracePulseAccum >= 0.24) {
        this._finalGracePulseAccum = 0;
        this.fx.spawn('seraphicFinalGraceCharge', this.x, this.y - 98, {
          follow: this,
          offsetX: 0,
          offsetY: -98,
          flip: this.facing < 0,
          light: 1.25 + 0.35 * this.finalGraceChargeProgress,
          extra: { chargeU: this.finalGraceChargeProgress }
        });
      }

      this._finalGraceMoteAccum += dt;
      if (this._finalGraceMoteAccum >= 0.09) {
        this._finalGraceMoteAccum = 0;
        this.fx.burst(muzzleX, beamY, {
          count: 3 + Math.floor(this.finalGraceChargeProgress * 4),
          speedMin: 26,
          speedMax: 92 + this.finalGraceChargeProgress * 65,
          lifeMin: 0.2,
          lifeMax: 0.38,
          gravity: -36,
          colors: ['#ffffff', '#fef08a', '#fde08a', '#38bdf8', '#34d399']
        });
      }
      return;
    }

    // Phase 2 (t >= 3.00s): Single Instant Tanked-Damage Counter Beam (`———`)
    if (!this.finalGraceDidFire) {
      this.finalGraceDidFire = true;
      this.finalGraceBeamActive = true;
      this.finalGraceBeamTimer = 0;
      this.finalGraceChargeProgress = 1;
      this.y = this.groundY - 66;
      const muzzleX = this.x + this.facing * 56;
      const beamY = this.y - 104;
      this.finalGraceMuzzleX = muzzleX;
      this.finalGraceBeamY = beamY;

      const rawTanked = Math.round(this.tankedDamage || 0);
      const counterDmg = Math.min(Math.round(this.maxHp * 0.28), Math.max(620, rawTanked));
      this.tankedDamage = 0;

      if (game?.audio) game.audio.play('final_grace_beam', this.x);
      game?.renderer?.triggerImpactFrame?.(this.x + this.facing * 260, beamY, 0.16, 'radiant');
      game?.renderer?.triggerShake?.(24, 0.52);
      game?.renderer?.triggerAberration?.(9);
      game?.renderer?.triggerHitStop?.(0.10);

      let hitAny = false;
      for (const foe of foes) {
        if (!foe || foe.isDead || foe.isBenched) continue;
        const inFront = (foe.x - this.x) * this.facing >= -48;
        const inBeamBand = Math.abs(foe.y - 95 - beamY) <= 165;
        if (inFront && inBeamBand) {
          hitAny = true;
          foe.takeDamage(counterDmg, this, true, 255, -185);
          this.fx.spawn('sanctuaryNovaBurst', foe.x, beamY, {
            flip: this.facing < 0,
            light: 1.48
          });
          this.fx.burst(foe.x, beamY, {
            count: 26,
            speedMin: 80,
            speedMax: 285,
            lifeMin: 0.24,
            lifeMax: 0.52,
            gravity: 40,
            colors: ['#ffffff', '#fef08a', '#fde047', '#38bdf8', '#34d399']
          });
          if (game?.vfx) {
            game.vfx.spawnGlyphBurst(foe.x, beamY, 14, 'radiant');
            game.vfx.spawnDamageText(
              foe.x,
              foe.y - 156,
              0,
              true,
              `★ FINAL GRACE: ${counterDmg}! ★`,
              '#fde047'
            );
          }
        }
      }

      if (!hitAny && game?.vfx) {
        const missX = this.x + this.facing * 240;
        this.fx.spawn('sanctuaryNovaBurst', missX, beamY, {
          flip: this.facing < 0,
          light: 1.36
        });
        game.vfx.spawnDamageText(
          missX,
          beamY - 48,
          0,
          true,
          `★ FINAL GRACE: ${counterDmg}! ★`,
          '#fde047'
        );
      }
    }

    if (t < 3.92) {
      this.y = this.groundY - 66;
      this.finalGraceMuzzleX = this.x + this.facing * 56;
      this.finalGraceBeamY = this.y - 104;
      this.finalGraceBeamTimer = t - 3.0;
      this.trueUltFrameOverride = 134 + (Math.floor((t - 3.0) * 24) % 6);
    } else if (t < this.trueUltDuration) {
      this.finalGraceBeamActive = false;
      const descU = Math.min(1, Math.max(0, (t - 3.92) / 0.33));
      const smoothDesc = descU * descU * (3 - 2 * descU);
      this.y = this.groundY - 66 * (1 - smoothDesc);
      this.trueUltFrameOverride = 144 + Math.min(5, Math.floor(descU * 6));
    } else {
      this.y = this.groundY;
      this.trueUltFrameOverride = null;
      this.finalGraceBeamActive = false;
      this.isInvulnerable = false;
      this.unstoppablePoise = false;
      this.setState('IDLE');
    }
  }

  drawPixelOctagonRing(ctx, cx, cy, rx, ry, stepPx, color, alpha) {
    if (rx < 8 || ry < 8 || alpha <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.fillStyle = color;
    const s = Math.max(2, stepPx | 0);
    const k = 0.7071;
    const pts = [
      [rx, 0],
      [rx * k, ry * k],
      [0, ry],
      [-rx * k, ry * k],
      [-rx, 0],
      [-rx * k, -ry * k],
      [0, -ry],
      [rx * k, -ry * k]
    ];
    for (let i = 0; i < 8; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[(i + 1) % 8];
      const steps = Math.max(3, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (s * 1.5)));
      for (let j = 0; j < steps; j++) {
        const u = j / steps;
        const px = Math.round((cx + x0 + (x1 - x0) * u) / s) * s;
        const py = Math.round((cy + y0 + (y1 - y0) * u) / s) * s;
        ctx.fillRect(px, py, s, s);
      }
    }
    ctx.restore();
  }

  drawSeraphimVFX(ctx, sprites, isReflection, renderer = null) {
    if (isReflection) return;
    const isDeathFade = this.isDead && (this.deathTimer || 0) < 0.46;
    const showWings =
      isDeathFade ||
      (!this.isDead &&
        (this.isAngelicAscent ||
          this.state === 'ULTIMATE' ||
          this.state === 'TRUE_ULTIMATE'));
    if (!showWings) return;

    let env = 1.0;
    if (isDeathFade) {
      env = Math.max(0, 1 - (this.deathTimer || 0) / 0.46) * 0.82;
    } else if (this.state === 'TRUE_ULTIMATE') {
      const t = this.stateTimer || 0;
      const dur = this.trueUltDuration || 4.25;
      const fadeIn = Math.min(1, t / 0.30);
      const fadeOut = t > dur - 0.28 ? Math.max(0, (dur - t) / 0.28) : 1.0;
      env = fadeIn * fadeOut;
    } else if (this.state === 'ULTIMATE') {
      const dur = this.ultDuration || 1.52;
      const u = Math.min(1, this.stateTimer / dur);
      env = Math.min(1, Math.sin(u * Math.PI) * 1.85);
    } else if (this.isAngelicAscent) {
      const dur = this.dashDuration || 0.60;
      const u = Math.min(1, this.stateTimer / dur);
      env = Math.min(1, Math.sin(u * Math.PI) * 1.65);
    }
    if (env <= 0.02) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const isFullArchangel =
      this.isAngelicAscent || this.state === 'ULTIMATE' || this.state === 'TRUE_ULTIMATE';
    const cx = -6;
    const cy = -124;
    const vfxSheet = sprites && sprites.vfx;

    // 1. Radiant Celestial Gold + Emerald-Grace Radial Light Halos behind Seraphina
    if (renderer && renderer.glowGold) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const bigR =
        (this.state === 'TRUE_ULTIMATE' ? 310 : isFullArchangel ? 255 : 205) *
        (0.85 + 0.15 * env);
      ctx.globalAlpha = (this.state === 'TRUE_ULTIMATE' ? 0.44 : isFullArchangel ? 0.36 : 0.28) * env;
      ctx.drawImage(renderer.glowGold, cx - bigR, cy - bigR, bigR * 2, bigR * 2);
      if (renderer.glowEmerald) {
        const graceR = (isFullArchangel ? 195 : 145) * (0.85 + 0.15 * env);
        ctx.globalAlpha = 0.22 * env;
        ctx.drawImage(renderer.glowEmerald, cx - graceR, cy - graceR, graceR * 2, graceR * 2);
      }
      ctx.restore();
    }

    const col = Math.floor(this.stateTimer * 30) % 30;

    // 2. 30fps Stained-Glass Cathedral Rose Mandala behind wings during ULTIMATE & TRUE_ULTIMATE (`Row 3` of `priestess_vfx.png`)
    if (
      (this.state === 'ULTIMATE' || this.state === 'TRUE_ULTIMATE') &&
      vfxSheet &&
      vfxSheet.complete &&
      vfxSheet.naturalWidth > 0
    ) {
      const baseHalo = this.state === 'TRUE_ULTIMATE' ? 276 : 256;
      const haloSize = Math.round(baseHalo * (0.86 + 0.14 * env));
      const gateBob = Math.round(Math.sin(this.haloPhase * 2.4) * 4);
      ctx.save();
      ctx.translate(cx, cy + gateBob);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, env * 0.32);
      ctx.drawImage(vfxSheet, col * 208, 624, 208, 208, -haloSize * 0.54, -haloSize * 0.54, haloSize * 1.08, haloSize * 1.08);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = Math.min(1, env * 0.94);
      ctx.drawImage(vfxSheet, col * 208, 624, 208, 208, -haloSize * 0.5, -haloSize * 0.5, haloSize, haloSize);
      ctx.restore();
    }

    // 3. Authentic 30-Frame 16-Bit HD-2D Feathered Archangel Wings (`seraphim_wings.png`, 320x232 per cell, root-locked to shoulder blades -6, -124)
    const wingSheet = sprites && sprites.wings;
    if (wingSheet && wingSheet.complete && wingSheet.naturalWidth > 0) {
      const cellW = 320;
      const cellH = 232;
      const wingFrame = Math.floor(this.stateTimer * 30) % 30;
      let recoilX = 0;
      let recoilY = 0;
      if (!this.isDead && this.hurtTimer > 0) {
        recoilX = -6 + Math.round((Math.sin(this.hurtTimer * 60) * 4) / 2) * 2;
        recoilY = -2;
      }
      const scaleW = (this.state === 'TRUE_ULTIMATE' ? 0.92 : 0.86) + 0.14 * env;
      const scaleH = (this.state === 'TRUE_ULTIMATE' ? 0.94 : 0.90) + 0.10 * env;
      const drawW = Math.round(cellW * scaleW);
      const drawH = Math.round(cellH * scaleH);
      const shoulderX = -6 + recoilX;
      const shoulderY = -124 + recoilY;
      const dx = Math.round(shoulderX - drawW * 0.5);
      const dy = Math.round(shoulderY - drawH * (88 / 232));

      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.20 * env;
      ctx.drawImage(wingSheet, wingFrame * cellW, 0, cellW, cellH, dx - 2, dy - 2, drawW + 4, drawH + 4);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = Math.min(1, 0.98 * env);
      ctx.drawImage(wingSheet, wingFrame * cellW, 0, cellW, cellH, dx, dy, drawW, drawH);
    }

    ctx.restore();
  }

  drawForegroundOverlay(ctx, renderer = null) {
    const ww = renderer?.worldWidth || 1280;
    const arenaCenterX = ww * 0.5;

    // 0. Whole-screen expanding Celestial Grace Glow/Bloom Wave during 3.0s `FINAL GRACE` charge (never replaces stage!)
    if (this.state === 'TRUE_ULTIMATE' && !this.finalGraceDidFire) {
      const chargeP = Math.max(0, Math.min(1, this.finalGraceChargeProgress || this.stateTimer / 3.0));
      const focusX = Math.round(this.x);
      const focusY = Math.round(this.y - 104);

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalCompositeOperation = 'lighter';

      // Expanding radial golden-white & emerald-cyan bloom waves across the whole stage
      if (renderer?.glowGold) {
        const outerR = Math.round(240 + chargeP * ww * 0.82);
        ctx.globalAlpha = 0.12 + chargeP * 0.30;
        ctx.drawImage(renderer.glowGold, focusX - outerR, focusY - outerR, outerR * 2, outerR * 2);
      }
      if (renderer?.glowEmerald) {
        const emR = Math.round(180 + chargeP * ww * 0.56);
        ctx.globalAlpha = 0.08 + chargeP * 0.20;
        ctx.drawImage(renderer.glowEmerald, focusX - emR, focusY - emR, emR * 2, emR * 2);
      }
      if (renderer?.glowCyan) {
        const cyR = Math.round(150 + chargeP * ww * 0.48);
        ctx.globalAlpha = 0.06 + chargeP * 0.18;
        ctx.drawImage(renderer.glowCyan, focusX - cyR, focusY - cyR, cyR * 2, cyR * 2);
      }
      if (renderer?.glowWhite) {
        const whR = Math.round(130 + Math.pow(chargeP, 1.7) * ww * 0.65);
        ctx.globalAlpha = 0.10 + Math.pow(chargeP, 1.8) * 0.34;
        ctx.drawImage(renderer.glowWhite, focusX - whR, focusY - whR, whR * 2, whR * 2);
      }

      // Soft whole-screen golden-ivory atmospheric bloom wash building toward 3.00s blowout
      const washAlpha = 0.03 + Math.pow(chargeP, 2.2) * 0.22;
      ctx.fillStyle = `rgba(254, 240, 138, ${washAlpha.toFixed(3)})`;
      ctx.fillRect(-4000, -3000, ww + 8000, 6000);

      // 3 pixel-stepped expanding octagonal sacred light rings sweeping across the arena
      const ringCols = ['#fde047', '#6ee7b7', '#ffffff'];
      for (let rIdx = 0; rIdx < 3; rIdx++) {
        const phase = ((this.stateTimer * 0.68 + rIdx / 3) % 1 + 1) % 1;
        const ringR = 72 + phase * (280 + chargeP * (ww * 0.62));
        const ringAlpha = Math.sin(phase * Math.PI) * (0.28 + chargeP * 0.44);
        this.drawPixelOctagonRing(
          ctx,
          focusX,
          focusY,
          ringR,
          ringR * 0.68,
          4,
          ringCols[rIdx],
          ringAlpha
        );
      }

      // Rising golden-white & prismatic pixel motes across the entire arena width
      const moteCount = 26;
      const moteColors = ['#ffffff', '#fef08a', '#fde047', '#34d399', '#38bdf8'];
      for (let i = 0; i < moteCount; i++) {
        const seed = (i * 137.5) % 1;
        const mx = Math.round((((i + 0.5) / moteCount) * ww + Math.sin(this.stateTimer * 2.1 + i) * 26) / 2) * 2;
        const riseU = ((this.stateTimer * (0.36 + (i % 5) * 0.07) + seed) % 1 + 1) % 1;
        const my = Math.round((this.groundY + 12 - riseU * (this.groundY + 110)) / 2) * 2;
        const mAlpha = Math.sin(riseU * Math.PI) * (0.32 + chargeP * 0.58);
        ctx.globalAlpha = Math.min(1, mAlpha);
        ctx.fillStyle = moteColors[i % moteColors.length];
        ctx.fillRect(mx - 1, my - 4, 2, 8);
        ctx.fillRect(mx - 4, my - 1, 8, 2);
      }

      ctx.restore();
    }

    // 1. Live 120Hz `ArcaneShaderFX` "back" layer (2.5D Sanctuary Cathedral Seal, Ophanim Back Ring, Slipstream Feathers & Back Sanctum Pillars)
    this.fx.renderLayer(ctx, 'back', arenaCenterX, this.groundY, 0.96);

    // 2. Stained-Glass Cathedral Rose Mandala + 30fps HD-2D Feathered Archangel Wings behind Seraphina
    const sprites = PixelForge.initAssets().priestess;
    const groundPlantOffset = 4;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(this.x), Math.round(this.y + groundPlantOffset));
    ctx.scale(this.facing, 1);
    this.drawSeraphimVFX(ctx, sprites, false, renderer);
    ctx.restore();
  }

  drawUltimateForeground(ctx, renderer = null) {
    const ww = renderer?.worldWidth || 1280;
    const arenaCenterX = ww * 0.5;

    // 1. Live 120Hz `ArcaneShaderFX` "front" layer across ALL states
    this.fx.renderLayer(ctx, 'front', arenaCenterX, this.groundY, 0.98);

    if (this.state !== 'TRUE_ULTIMATE') return;

    const sprites = PixelForge.initAssets().priestess;
    const vfxSheet = sprites?.vfx;
    const muzzleX = Math.round(this.finalGraceMuzzleX || this.x + this.facing * 56);
    const beamY = Math.round(this.finalGraceBeamY || this.y - 104);

    // 2A. Charge Phase (0.00s..3.00s): Scepter Charge Core (`Row 5`) + Pixel-Stepped Horizontal Focusing Sightline (`———`) + Pre-Fire Screen Blowout
    if (!this.finalGraceDidFire) {
      const chargeP = Math.max(0, Math.min(1, this.finalGraceChargeProgress || this.stateTimer / 3.0));
      ctx.save();
      ctx.imageSmoothingEnabled = false;

      // Crisp pixel-stepped horizontal focusing sightline (`———`) stretching across the entire stage
      const sightLen = ww + 180;
      const pulse = 0.65 + 0.35 * Math.sin(this.stateTimer * 22);
      const sightAlpha = Math.min(1, (0.28 + chargeP * 0.68) * pulse);
      ctx.save();
      ctx.translate(muzzleX, beamY);
      ctx.scale(this.facing, 1);

      // 1px dark selective-contrast outline rails around the sightline
      ctx.globalAlpha = sightAlpha * 0.55;
      ctx.fillStyle = '#422006';
      ctx.fillRect(16, -4, sightLen, 2);
      ctx.fillRect(16, 2, sightLen, 2);

      // Golden-ivory & pure-white pixel-dashed horizontal sightline (`———`)
      const dashPeriod = 28;
      const dashShift = Math.round(this.stateTimer * 240) % dashPeriod;
      for (let sx = 12 - dashShift; sx < sightLen; sx += dashPeriod) {
        if (sx < 8) continue;
        const segW = chargeP > 0.82 ? 24 : 18;
        ctx.globalAlpha = sightAlpha;
        ctx.fillStyle = '#fde047';
        ctx.fillRect(sx, -2, segW, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx + 2, -1, Math.max(4, segW - 4), 2);
      }

      // Converging prismatic reticle ticks along the horizontal beam axis
      for (let tick = 1; tick <= 7; tick++) {
        const tx = Math.round(tick * 160 - ((this.stateTimer * 180) % 160));
        if (tx > 24 && tx < sightLen) {
          const tickH = Math.round((14 - chargeP * 6) / 2) * 2;
          ctx.globalAlpha = sightAlpha * 0.85;
          ctx.fillStyle = tick % 2 === 0 ? '#38bdf8' : '#fef08a';
          ctx.fillRect(tx, -tickH, 2, tickH * 2);
        }
      }
      ctx.restore();

      // Stamp 30fps `Row 5` (`finalGraceChargeSphereCell`, sy = 1040) scaling up at `(muzzleX, beamY)`
      if (renderer?.glowGold) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const orbGlowR = Math.round(95 + chargeP * 145);
        ctx.globalAlpha = 0.34 + chargeP * 0.42;
        ctx.drawImage(renderer.glowGold, muzzleX - orbGlowR, beamY - orbGlowR, orbGlowR * 2, orbGlowR * 2);
        ctx.restore();
      }
      if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth > 0) {
        const col = Math.floor(this.stateTimer * 30) % 30;
        const orbSize = Math.round(208 * (0.64 + 0.72 * chargeP));
        const halfOrb = Math.round(orbSize * 0.5);
        ctx.save();
        ctx.translate(muzzleX, beamY);
        ctx.scale(this.facing, 1);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.28 + chargeP * 0.34;
        ctx.drawImage(vfxSheet, col * 208, 1040, 208, 208, -halfOrb - 4, -halfOrb - 4, orbSize + 8, orbSize + 8);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = Math.min(1, 0.88 + chargeP * 0.12);
        ctx.drawImage(vfxSheet, col * 208, 1040, 208, 208, -halfOrb, -halfOrb, orbSize, orbSize);
        ctx.restore();
      }

      // Final 0.35s pre-ignition whole-screen golden-white blowout crest
      if (chargeP > 0.88) {
        const preU = (chargeP - 0.88) / 0.12;
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(255, 251, 235, ${(preU * preU * 0.36).toFixed(3)})`;
        ctx.fillRect(-4000, -3000, ww + 8000, 6000);
      }

      ctx.restore();
      return;
    }

    // 2B. Detonation Phase (3.00s..3.92s): Whole-Screen Radiant Flash + Welded 30fps `208x208` Horizontal Pixel Beam (`Row 6` + 10x `Row 7`)
    if (this.finalGraceBeamActive) {
      const beamT = Math.max(0, this.finalGraceBeamTimer || 0);
      const env =
        beamT < 0.06
          ? Math.max(0.3, beamT / 0.06)
          : beamT < 0.68
            ? 1.0
            : Math.max(0, 1 - (beamT - 0.68) / 0.24);

      if (env <= 0.01) return;

      ctx.save();
      ctx.imageSmoothingEnabled = false;

      // Whole-screen golden-white detonation flash & horizontal corridor bloom
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      if (beamT < 0.32) {
        const flashA = Math.pow(1 - beamT / 0.32, 1.6) * 0.46;
        ctx.fillStyle = `rgba(255, 251, 235, ${flashA.toFixed(3)})`;
        ctx.fillRect(-4000, -3000, ww + 8000, 6000);
      }
      if (renderer?.glowGold) {
        ctx.globalAlpha = 0.34 * env;
        for (let gx = 0; gx <= 1350; gx += 270) {
          const wx = muzzleX + this.facing * gx;
          ctx.drawImage(renderer.glowGold, wx - 240, beamY - 155, 480, 310);
        }
      }
      if (renderer?.glowWhite) {
        const mR = Math.round(210 * env);
        ctx.globalAlpha = 0.48 * env;
        ctx.drawImage(renderer.glowWhite, muzzleX - mR, beamY - mR, mR * 2, mR * 2);
      }
      ctx.restore();

      // Synchronized 30fps column for `Row 6` Muzzle & `Row 7` Horizon Beam Segments (exact 1-to-1 height & 148px phase match!)
      let col = 10;
      if (beamT < 0.08) {
        col = Math.min(2, Math.floor((beamT / 0.08) * 3));
      } else if (beamT < 0.68) {
        col = 3 + (Math.floor((beamT - 0.08) * 30) % 15);
      } else {
        col = 22 + Math.min(7, Math.floor(((beamT - 0.68) / 0.24) * 8));
      }

      const beamH = Math.max(32, Math.round(208 * (1.06 + 0.20 * env)));
      const halfH = Math.round(beamH * 0.5);

      if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth > 0) {
        ctx.save();
        ctx.translate(muzzleX, beamY);
        ctx.scale(this.facing, 1);

        // Slice the seamless 148px interior of Row 7 (x=30..178) and 178px of Row 6 (x=0..178) so Row 6 meets Row 7 at dx=74 with 0 overlap and exact phase match
        const sliceX = col * 208 + 30;
        const sliceW = 148;
        const muzzleSliceW = 178;

        // Additive celestial bloom pass along welded beam
        const bloomH = beamH + 14;
        const halfBloomH = Math.round(bloomH * 0.5);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.32 * env;
        for (let seg = 0; seg < 11; seg++) {
          const segLeftX = 74 + seg * sliceW;
          ctx.drawImage(vfxSheet, sliceX, 1456, sliceW, 208, segLeftX, -halfBloomH, sliceW, bloomH);
        }
        ctx.drawImage(vfxSheet, col * 208, 1248, muzzleSliceW, 208, -104, -halfBloomH, muzzleSliceW, bloomH);

        // Crisp 100% opaque cel-clustered pixel-art beam pass (`Row 7` tiled 11x at 148px step + `Row 6` cannon muzzle)
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
        for (let seg = 0; seg < 11; seg++) {
          const segLeftX = 74 + seg * sliceW;
          ctx.drawImage(vfxSheet, sliceX, 1456, sliceW, 208, segLeftX, -halfH, sliceW, beamH);
        }
        ctx.drawImage(vfxSheet, col * 208, 1248, muzzleSliceW, 208, -104, -halfH, muzzleSliceW, beamH);

        ctx.restore();
      }

      ctx.restore();
    }
  }

  draw(ctx, isReflection = false, renderer = null) {
    const sprites = PixelForge.initAssets().priestess;
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const w = 208;
    const h = 208;
    const scaleDir = this.facing;
    const groundPlantOffset = 4;

    if (
      !isReflection &&
      !this.isDead &&
      (this.state === 'DODGE' || this.state === 'JUMP' || this.state === 'DASH')
    ) {
      const frameIdx = PixelForge.getFrameIndex(this, this.haloPhase);
      const trailSign = this.dashDir || this.facing;
      for (let g = 2; g >= 1; g--) {
        ctx.save();
        ctx.globalAlpha = g === 2 ? 0.16 : 0.28;
        ctx.translate(
          Math.round(this.x - trailSign * g * 22),
          Math.round(this.y + groundPlantOffset + (this.isFlipVault ? g * 4 : 0))
        );
        ctx.scale(scaleDir, 1);
        PixelForge.drawAfterimageFrame(ctx, sprites, Math.max(0, frameIdx - g), w, h);
        ctx.restore();
      }
    }

    ctx.translate(Math.round(this.x), Math.round(this.y + groundPlantOffset));
    ctx.scale(scaleDir, 1);

    PixelForge.drawSheetFrame(ctx, sprites, this, w, h, this.haloPhase, isReflection, renderer);

    ctx.restore();
  }
}
