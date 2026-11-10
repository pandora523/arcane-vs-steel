import { Fighter } from './Fighter.js?v=30fps41';
import { PixelForge } from '../engine/PixelForge.js?v=30fps52';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps52';
import {
  SERAPHIC_EFFECT_REGISTRY,
  SERAPHIC_GOLD_PALETTE,
  SERAPHIC_GRACE_PALETTE,
  SERAPHIC_STAINED_PALETTE
} from '../engine/shaders/seraphicShaders.js?v=30fps52';

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
      maxHp: 1160,
      attackRange: 512,
      moveSpeed: 132,
      autoInterval: 1.33,
      lightColor: 'rgba(253, 224, 71, 1)',
      primaryColor: '#fde047'
    });
    this.heroId = 'priestess';
    this.theme = 'radiant';
    this.deathSfx = 'death_priestess';
    this.skillMaxCooldown = 5.55;
    this.autoDuration = 0.90;
    this.skillDuration = 0.98;
    this.ultDuration = 1.52;
    this.ultName = 'SERAPHIC APOTHEOSIS';
    this.skillName = 'DIVINE SANCTUARY';
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

    this.fx = new ArcaneShaderFX(SERAPHIC_EFFECT_REGISTRY, {
      pixelScale: 3,
      viewW: 440,
      viewH: 220
    });

    if (typeof Image !== 'undefined') {
      const priestessAssets = PixelForge.initAssets()?.priestess;
      if (priestessAssets?.vfx?.src && !priestessAssets.vfx.src.includes('v=30fps48')) {
        priestessAssets.vfx.src = 'assets/sprites/priestess_vfx.png?v=30fps48';
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
      newState !== 'ULTIMATE'
    ) {
      this.fx?.stopByKey('seraphicSlipstreamTrail');
      this.fx?.stopByKey('sanctuaryCathedralSeal');
    }
    if (newState !== 'ULTIMATE') {
      this.fx?.stopByKey('ophanimChakramWheel');
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
    this.heal(16, 'WINGS OF GRACE');
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
      this.heal(13, 'BENEDICTION');
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
    this.heal(16, 'WINGS OF GRACE');
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
          damage: 45,
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
        damage: 66,
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

    if (enemy && !enemy.isDead && (this.state === 'IDLE' || this.state === 'WALK')) {
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
    const castLift = t < 0.78 ? Math.sin((t / 0.78) * Math.PI) * 20 : 0;
    this.y = this.groundY - castLift;

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
          damage: isGraceCast ? 41 : 62,
          type: 'holy_light',
          isMeteor: false
        });

        this.fx.spawn('scepterStarburstCone', spawnX, spawnY, {
          flip: this.facing < 0,
          light: isGraceCast ? 1.3 : 1.2,
          extra: { aimAngle: Math.atan2(dy, Math.abs(dx)), isGrace: isGraceCast }
        });

        if (isGraceCast) {
          this.heal(17, 'DAWN GRACE');
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
            damage: 20,
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
              damage: 24,
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
    const skillLift = t < 0.92 ? Math.sin((t / 0.92) * Math.PI) * 44 : 0;
    this.y = this.groundY - skillLift;

    this.ensureSlipstream();
    this.ensureSanctuarySeal(false);

    if (t < 0.18) {
      this.didSanctuaryHeal = false;
    } else if (t >= 0.20 && !this.didSanctuaryHeal) {
      this.didSanctuaryHeal = true;
      if (game.audio) game.audio.play('holy_heal', this.x);
      this.heal(62, 'SANCTUARY');
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
        const beamDmg = horizDist >= 260 ? 54 : 48;
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
          damage: 12,
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
        damage: 33,
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
      this.heal(86, 'MIRACLE');
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
        damage: 7,
        isUltimate: true
      });

      game.vfx.spawnGlyphBurst(aimX, this.groundY - 45, 5, 'radiant');
      enemy.takeDamage(13, this, false, 28, 0);
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
        enemy.takeDamage(96, this, true, 150, -210);
      }
    } else if (t >= this.ultDuration) {
      this.y = this.groundY;
      this.setState('IDLE');
    }
  }

  drawSeraphimVFX(ctx, sprites, isReflection, renderer = null) {
    if (isReflection) return;
    const isDawnGraceAuto =
      this.state === 'AUTO_ATTACK' &&
      (this.shotCombo + (this.didActionFrame ? 0 : 1)) % 3 === 0;
    const isDeathFade = this.isDead && (this.deathTimer || 0) < 0.46;
    const showWings =
      isDeathFade ||
      (!this.isDead &&
        (this.isAngelicAscent ||
          this.state === 'ULTIMATE' ||
          this.state === 'SKILL' ||
          isDawnGraceAuto));
    if (!showWings) return;

    let env = 1.0;
    if (isDeathFade) {
      env = Math.max(0, 1 - (this.deathTimer || 0) / 0.46) * 0.82;
    } else if (this.state === 'SKILL') {
      const dur = this.skillDuration || 0.98;
      const u = Math.min(1, this.stateTimer / dur);
      env = Math.min(1, Math.sin(u * Math.PI) * 1.65);
    } else if (this.state === 'ULTIMATE') {
      const dur = this.ultDuration || 1.52;
      const u = Math.min(1, this.stateTimer / dur);
      env = Math.min(1, Math.sin(u * Math.PI) * 1.85);
    } else if (this.isAngelicAscent) {
      const dur = this.dashDuration || 0.60;
      const u = Math.min(1, this.stateTimer / dur);
      env = Math.min(1, Math.sin(u * Math.PI) * 1.65);
    } else if (isDawnGraceAuto) {
      const dur = this.autoDuration || 0.90;
      const u = Math.min(1, this.stateTimer / dur);
      env = Math.min(0.88, Math.sin(u * Math.PI) * 1.35);
    }
    if (env <= 0.02) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const isFullArchangel = this.isAngelicAscent || this.state === 'ULTIMATE';
    const cx = -6;
    const cy = -124;
    const vfxSheet = sprites && sprites.vfx;

    // 1. Radiant Celestial Gold + Emerald-Grace Radial Light Halos behind Seraphina
    if (renderer && renderer.glowGold) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const bigR = (isFullArchangel ? 255 : 205) * (0.85 + 0.15 * env);
      ctx.globalAlpha = (isFullArchangel ? 0.36 : 0.28) * env;
      ctx.drawImage(renderer.glowGold, cx - bigR, cy - bigR, bigR * 2, bigR * 2);
      if (renderer.glowEmerald) {
        const graceR = (isFullArchangel ? 180 : 145) * (0.85 + 0.15 * env);
        ctx.globalAlpha = 0.20 * env;
        ctx.drawImage(renderer.glowEmerald, cx - graceR, cy - graceR, graceR * 2, graceR * 2);
      }
      ctx.restore();
    }

    const col = Math.floor(this.stateTimer * 30) % 30;

    // 2. 30fps Stained-Glass Cathedral Rose Mandala behind the wings during SKILL & ULTIMATE (`Row 3` of `priestess_vfx.png`)
    if (
      (this.state === 'SKILL' || this.state === 'ULTIMATE') &&
      vfxSheet &&
      vfxSheet.complete &&
      vfxSheet.naturalWidth > 0
    ) {
      const haloSize = Math.round((this.state === 'ULTIMATE' ? 256 : 212) * (0.86 + 0.14 * env));
      const gateBob = Math.round(Math.sin(this.haloPhase * 2.4) * 4);
      ctx.save();
      ctx.translate(cx, cy + gateBob);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, env * 0.28);
      ctx.drawImage(vfxSheet, col * 208, 624, 208, 208, -haloSize * 0.54, -haloSize * 0.54, haloSize * 1.08, haloSize * 1.08);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = Math.min(1, env * 0.92);
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
      const scaleW = 0.86 + 0.14 * env;
      const scaleH = 0.90 + 0.10 * env;
      const drawW = Math.round(cellW * scaleW);
      const drawH = Math.round(cellH * scaleH);
      const shoulderX = -6 + recoilX;
      const shoulderY = -124 + recoilY;
      const dx = Math.round(shoulderX - drawW * 0.5);
      const dy = Math.round(shoulderY - drawH * (88 / 232));

      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.18 * env;
      ctx.drawImage(wingSheet, wingFrame * cellW, 0, cellW, cellH, dx - 2, dy - 2, drawW + 4, drawH + 4);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = Math.min(1, 0.98 * env);
      ctx.drawImage(wingSheet, wingFrame * cellW, 0, cellW, cellH, dx, dy, drawW, drawH);
    }

    ctx.restore();
  }

  drawForegroundOverlay(ctx, renderer = null) {
    // 1. Live 120Hz `ArcaneShaderFX` "back" layer (2.5D Sanctuary Cathedral Seal, Ophanim Back Ring, Slipstream Feathers & Back Sanctum Pillars)
    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
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
    if (this.state === 'ULTIMATE') {
      const u = Math.min(1, this.stateTimer / (this.ultDuration || 1.52));
      const env = Math.min(1, Math.sin(u * Math.PI) * 1.75);
      if (env > 0.02) {
        const sprites = PixelForge.initAssets().priestess;
        const vfxSheet = sprites && sprites.vfx;
        const hasVfx = !!(vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth > 0);

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(Math.round(this.x / 4) * 4, Math.round((this.y - 120) / 4) * 4);
        ctx.scale(this.facing, 1);

        const orbitR = 136 * (0.88 + 0.12 * env);

        // 1. Spinning Double-Ringed Golden Ophanim Wheel around Seraphina (Stepped 4x4 Pixel-Art Ring!)
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const ringRot = this.haloPhase * 1.4;
        for (let deg = 0; deg < 360; deg += 8) {
          const a = (deg * Math.PI) / 180 + ringRot;
          const rx1 = Math.round((Math.cos(a) * orbitR) / 4) * 4;
          const ry1 = Math.round((Math.sin(a) * orbitR) / 4) * 4;
          ctx.globalAlpha = env * 0.72;
          ctx.fillStyle = deg % 24 === 0 ? '#ffffff' : '#fde047';
          ctx.fillRect(rx1 - 2, ry1 - 2, 4, 4);

          if (deg % 16 === 0) {
            const rx2 = Math.round((Math.cos(-a) * orbitR * 0.82) / 4) * 4;
            const ry2 = Math.round((Math.sin(-a) * orbitR * 0.82) / 4) * 4;
            ctx.globalAlpha = env * 0.56;
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(rx2 - 2, ry2 - 2, 4, 4);
          }
        }
        ctx.restore();

        // 2. 6 Orbiting 30fps Pixel-Art Sacred Star Chakrams (`Row 0: holy_light` of `priestess_vfx.png`)
        for (let i = 0; i < 6; i++) {
          const a = -this.haloPhase * 2.4 + (i * Math.PI * 2) / 6;
          const ox = Math.round((Math.cos(a) * orbitR) / 4) * 4;
          const oy = Math.round((Math.sin(a) * orbitR) / 4) * 4;

          ctx.save();
          ctx.translate(ox, oy);

          if (renderer && renderer.glowGold) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = env * 0.42;
            ctx.drawImage(renderer.glowGold, -42, -42, 84, 84);
          }

          if (hasVfx) {
            const starCol = (Math.floor(this.stateTimer * 30) + i * 5) % 30;
            const sz = 108;
            const half = -54;
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = env * 0.34;
            ctx.drawImage(vfxSheet, starCol * 208, 0, 208, 208, half - 4, half - 4, sz + 8, sz + 8);
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = env * 0.96;
            ctx.drawImage(vfxSheet, starCol * 208, 0, 208, 208, half, half, sz, sz);
          }

          ctx.restore();
        }

        ctx.restore();
      }
    }

    // 3. Live 120Hz `ArcaneShaderFX` "front" layer across ALL states
    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    this.fx.renderLayer(ctx, 'front', arenaCenterX, this.groundY, 0.98);
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

    if (isReflection) {
      this.drawSeraphimVFX(ctx, sprites, true, renderer);
    }

    PixelForge.drawSheetFrame(ctx, sprites, this, w, h, this.haloPhase, isReflection, renderer);

    // Crisp 4x4 Pixel-Art Sanctuary Rose-Gold Benediction Ward during CROUCH parry window (t < 0.42s)
    if (!isReflection && this.state === 'CROUCH' && this.stateTimer < 0.42) {
      const wardEnv = Math.sin((this.stateTimer / 0.42) * Math.PI);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, wardEnv * 1.15);
      for (let i = -8; i <= 8; i++) {
        const u = i / 8;
        const wx = Math.round((52 + Math.cos(u * 1.25) * 14) / 4) * 4;
        const wy = Math.round((-88 + u * 48) / 4) * 4;
        ctx.fillStyle = Math.abs(i) % 3 === 0 ? '#38bdf8' : '#f59e0b';
        ctx.fillRect(wx - 2, wy - 2, 8, 4);
        if (Math.abs(i) <= 6) {
          ctx.fillStyle = Math.abs(i) <= 2 ? '#ffffff' : '#fde047';
          ctx.fillRect(wx + 2, wy - 2, 4, 4);
        }
      }
      ctx.restore();
    }

    ctx.restore();
  }
}
