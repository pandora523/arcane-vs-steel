import { Fighter } from './Fighter.js?v=30fps41';
import { PixelForge } from '../engine/PixelForge.js?v=30fps53';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps53';
import { SOLAR_EFFECT_REGISTRY } from '../engine/shaders/solarShaders.js?v=30fps53';

/**
 * Ignis Sol (`mage`) — Solar Archmage & Black-Sun Eclipse Sovereign.
 * Powered natively by `ArcaneShaderFX` (dual-buffer 120Hz HD-2D shader & particle engine)
 * + `assets/sprites/mage_sheet.png` & `assets/sprites/mage_vfx.png`.
 */
export class FireMage extends Fighter {
  constructor(x, groundY, facing = -1) {
    const opts = typeof x === 'object' && x !== null ? x : { x, groundY, facing };
    super({
      ...opts,
      name: opts.name || 'Ignis Sol',
      maxHp: 1275,
      attackRange: 520,
      moveSpeed: 138,
      autoInterval: 1.18,
      lightColor: 'rgba(251, 146, 60, 1)',
      primaryColor: '#fb923c'
    });
    this.heroId = 'mage';
    this.theme = 'arcane';
    this.deathSfx = 'death_mage';
    this.skillMaxCooldown = 4.55;
    this.autoDuration = 0.96;
    this.skillDuration = 1.05;
    this.ultDuration = 1.56;
    this.ultName = 'ECLIPSE SUPERNOVA';
    this.skillName = 'SOLAR PILLAR';
    this.runeOrbit = 0;
    this.castCombo = 0;
    this.stepTimer = 0;
    this.dodgeMaxCooldown = 2.88;
    this.dashMaxCooldown = 3.25;
    this.wallFlipCooldown = 0;
    this.crouchCooldown = 0;
    this.crouchDuration = 0.96;
    this.isCrouching = false;
    this.isFlipVault = false;
    this.flipStartX = this.x;
    this.flipTargetX = this.x;
    this.flipAngle = 0;
    this.dashStartX = this.x;
    this.dashTargetX = this.x;
    this.afterimageAccum = 0;
    this.isBlinkTeleport = false;
    this.didBlink = false;
    this.blinkOriginX = this.x;
    this.blinkTargetX = this.x;
    this.blinkPortalTimer = 0;
    this.solarEchoes = [];
    this.spawnedEclipse = false;
    this.didSupernovaFinisher = false;
    this.didSkillAura = false;
    this._drewPalmFocus = false;
    this._orbitSlot = null;

    this.fx = new ArcaneShaderFX(SOLAR_EFFECT_REGISTRY, {
      pixelScale: 3,
      viewW: 440,
      viewH: 220
    });

    if (typeof Image !== 'undefined') {
      const mageAssets = PixelForge.initAssets()?.mage;
      if (mageAssets?.vfx?.src && !mageAssets.vfx.src.includes('v=30fps49')) {
        mageAssets.vfx.src = 'assets/sprites/mage_vfx.png?v=30fps49';
      }
    }
  }

  setState(newState) {
    super.setState(newState);
    this._drewPalmFocus = false;
    if (newState !== 'JUMP' && newState !== 'DODGE' && newState !== 'DASH') {
      this.fx?.stopByKey('solarGlideTrail');
    }
  }

  ensureOrbitingSuns() {
    if (!this.fx) return;
    if (this.isDead || this.state === 'DEATH') {
      this.fx.stopByKey('heliosOrbitingSuns');
      this._orbitSlot = null;
      return;
    }
    const isPrimed = (this.castCombo + 1) % 3 === 0;
    let slot = this.fx.active.find((s) => s.key === 'heliosOrbitingSuns');
    if (!slot) {
      slot = this.fx.spawn('heliosOrbitingSuns', this.x, this.y - 98, {
        follow: this,
        offsetX: 0,
        offsetY: -98,
        flip: false,
        light: 1.16,
        extra: { primed: isPrimed }
      });
    } else if (slot.inst?.cfg) {
      slot.inst.cfg.primed = isPrimed;
    }
    this._orbitSlot = slot;
  }

  ensureSolarGlideTrail() {
    if (!this.fx) return;
    if (!this.fx.active.some((s) => s.key === 'solarGlideTrail')) {
      this.fx.spawn('solarGlideTrail', this.x - this.facing * 12, this.y - 88, {
        follow: this,
        offsetX: -12,
        offsetY: -88,
        flip: this.facing < 0,
        light: 1.18
      });
    }
  }

  spawnSolarEcho(frameIdx, alphaScale = 1.0, maxLife = 0.42) {
    if (this.solarEchoes.length > 6) this.solarEchoes.shift();
    this.solarEchoes.push({
      x: this.x,
      y: this.y,
      facing: this.facing,
      frameIdx,
      alphaScale,
      life: 0,
      maxLife
    });
  }

  onProjectileTrail(p) {
    if (!this.fx || (p.type !== 'fireball' && p.type !== 'meteor')) return;
    if (p.ringTimer >= (p.isMeteor ? 0.038 : 0.052)) {
      p.ringTimer = 0;
      this.fx.burst(p.x - Math.sign(p.vx || 1) * 16, p.y, {
        count: p.isMeteor ? 5 : 3,
        speedMin: 24,
        speedMax: p.isMeteor ? 95 : 68,
        lifeMin: 0.16,
        lifeMax: 0.28,
        gravity: -16,
        spread: 1.15,
        angle: Math.atan2(-(p.vy || 0), -(p.vx || 1)),
        colors: ['#ffffff', '#fef08a', '#facc15', '#fb923c', '#ea580c']
      });
    }
  }

  onProjectileHit(p, _hitTarget, isCrit, game) {
    if (!this.fx) return false;
    const isMeteor = Boolean(p.isMeteor || p.type === 'meteor');
    this.fx.spawn('solarMeteorImpactBurst', p.x, p.y, {
      light: isMeteor || isCrit ? 1.38 : 1.22,
      extra: { isMeteor: isMeteor || isCrit }
    });
    this.fx.burst(p.x, p.y, {
      count: isMeteor ? 22 : isCrit ? 16 : 12,
      speedMin: 55,
      speedMax: isMeteor ? 235 : 180,
      lifeMin: 0.18,
      lifeMax: 0.38,
      gravity: 85,
      colors: ['#ffffff', '#fef08a', '#facc15', '#fb923c', '#dc2626']
    });
    if (game?.vfx) {
      game.vfx.spawnGlyphBurst(p.x, p.y, isMeteor ? 7 : 4, 'arcane');
    }
    return true;
  }

  startJump(enemy, game, customDir = null) {
    this.dodgeCooldown = this.dodgeMaxCooldown * (0.86 + Math.random() * 0.28);
    this.setState('JUMP');
    this.isInvulnerable = true;
    this.isBlinkTeleport = false;
    this.isFlipVault = true;
    this.flipStartX = this.x;
    this.flipAngle = 0;
    this.afterimageAccum = 0;
    this.wallFlipCooldown = 3.0;

    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    let dir = customDir !== null ? customDir : -this.facing;
    if (this.x < 180) dir = 1;
    else if (this.x > ww - 180) dir = -1;

    const dist = enemy ? Math.abs(enemy.x - this.x) : 300;
    const retreatX = this.x - this.facing * 260;
    const nearWallOrCornered =
      this.x < 330 ||
      this.x > ww - 330 ||
      retreatX < 190 ||
      retreatX > ww - 190 ||
      dist < 225;

    if (enemy && nearWallOrCornered) {
      this.dashDuration = 0.62;
      const openSideDir = enemy.x < ww * 0.5 ? 1 : -1;
      let target = enemy.x + openSideDir * 350;
      if (Math.abs(target - this.x) < 250) {
        const crossDir = this.x < enemy.x ? 1 : -1;
        target = enemy.x + crossDir * 340;
      }
      this.flipTargetX = Math.max(140, Math.min(ww - 140, target));
      this.dashDir = Math.sign(this.flipTargetX - this.flipStartX) || 1;
      game.vfx.spawnDamageText(this.x, this.y - 130, 0, false, 'SOLAR GLIDE!', '#facc15');
    } else {
      this.dashDuration = 0.58;
      let target = Math.max(140, Math.min(ww - 140, this.x + dir * 320));
      if (Math.abs(target - this.x) < 220) {
        target = Math.max(140, Math.min(ww - 140, this.x - dir * 320));
      }
      this.flipTargetX = target;
      this.dashDir = Math.sign(this.flipTargetX - this.flipStartX) || dir;
      game.vfx.spawnDamageText(this.x, this.y - 125, 0, false, 'SOLAR VAULT!', '#fb923c');
    }

    this.vx = 0;
    this.vy = 0;
    this.spawnSolarEcho(PixelForge.getFrameIndex(this, this.runeOrbit), 0.85, 0.36);
    this.ensureSolarGlideTrail();
    this.fx.spawn('arcaneBlinkRift', this.x, this.groundY, {
      light: 1.18,
      extra: { isArrival: false }
    });
    if (game.audio) game.audio.play('blink', this.x);
    game.vfx.spawnGlyphBurst(this.x, this.y - 65, 6, 'arcane');
  }

  startCrouch(_enemy, game) {
    this.crouchCooldown = 3.2;
    this.crouchDuration = 0.96;
    this.setState('CROUCH');
    this.isCrouching = true;
    this.isDeflecting = true;
    this.isFlipVault = false;
    this.isBlinkTeleport = false;
    this.vx = 0;
    this.vy = 0;
    this.y = this.groundY;
    this.heal(13, 'FLAME WARD');
    this.fx.spawn('solarFlameWard', this.x, this.groundY, {
      follow: this,
      offsetX: 0,
      offsetY: 0,
      useGroundY: true,
      flip: this.facing < 0,
      light: 1.25
    });
    if (game && game.vfx) {
      game.vfx.spawnDamageText(this.x, this.y - 122, 0, false, 'FLAME WARD!', '#fef08a');
    }
  }

  onStartDodge(enemy, game, dir) {
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const dist = enemy ? Math.abs(enemy.x - this.x) : 300;
    const nearLeft = this.x < 320;
    const nearRight = this.x > ww - 320;

    this.isFlipVault = false;
    this.flipAngle = 0;
    this.isBlinkTeleport = true;
    this.didBlink = false;
    this.dashDuration = 0.40;
    this.blinkOriginX = this.x;
    this.blinkPortalTimer = 0.56;
    this.vx = 0;
    this.vy = 0;
    this.y = this.groundY;
    this.heal(16, 'SOLAR PHOENIX');

    let targetX;
    if (enemy && (nearLeft || nearRight || dist < 245)) {
      const openSideDir = enemy.x < ww * 0.5 ? 1 : -1;
      targetX = enemy.x + openSideDir * 340;
      if (Math.abs(targetX - this.x) < 250) {
        const crossDir = this.x < enemy.x ? 1 : -1;
        targetX = enemy.x + crossDir * 330;
      }
    } else {
      const smartDir = nearLeft ? 1 : nearRight ? -1 : dir;
      targetX = this.x + smartDir * 295;
    }
    this.blinkTargetX = Math.max(140, Math.min(ww - 140, targetX));
    this.dashDir = Math.sign(this.blinkTargetX - this.blinkOriginX) || dir || 1;

    this.spawnSolarEcho(PixelForge.getFrameIndex(this, this.runeOrbit), 1.0, 0.46);
    this.fx.spawn('arcaneBlinkRift', this.x, this.groundY, {
      light: 1.32,
      extra: { isArrival: false }
    });
    if (game.audio) game.audio.play('blink', this.x);

    game.vfx.spawnGlyphBurst(this.x, this.y - 95, 8, 'arcane');
    game.vfx.spawnDamageText(this.x, this.y - 142, 0, false, 'ARCANE BLINK!', '#fef08a');

    if (enemy && !enemy.isDead && dist < 210) {
      enemy.takeDamage(32, this, false, 95, -55);
      game.vfx.spawnDamageText(enemy.x, enemy.y - 132, 0, false, 'SOLAR REMNANT!', '#fb923c');
    }
  }

  onStartDash(_enemy, game, dir) {
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    this.isFlipVault = false;
    this.isBlinkTeleport = false;
    this.flipAngle = 0;
    this.afterimageAccum = 0;
    this.dashDuration = 0.44;
    this.dashStartX = this.x;
    this.dashTargetX = Math.max(115, Math.min(ww - 115, this.x + dir * 165));
    this.vx = 0;
    this.vy = 0;
    this.spawnSolarEcho(PixelForge.getFrameIndex(this, this.runeOrbit), 0.85, 0.32);
    this.ensureSolarGlideTrail();
    if (game.audio) game.audio.play('fireball', this.x);
    game.vfx.spawnGlyphBurst(this.x, this.y - 96, 5, 'arcane');
    game.vfx.spawnDamageText(this.x, this.y - 135, 0, false, 'FLAME STEP!', '#facc15');
  }

  updateDashOrDodge(dt, enemy, game) {
    const t = this.stateTimer;

    if ((this.state === 'DODGE' || this.state === 'JUMP') && this.isFlipVault) {
      const dur = this.dashDuration || 0.58;
      const u = Math.min(1, t / dur);
      const easeX = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;

      this.vx = 0;
      this.vy = 0;
      this.x = this.flipStartX + (this.flipTargetX - this.flipStartX) * easeX;
      this.y = this.groundY - Math.sin(u * Math.PI) * 46;
      this.flipAngle = 0;

      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }

      this.afterimageAccum += dt;
      if (this.afterimageAccum >= 0.055) {
        this.afterimageAccum = 0;
        this.spawnSolarEcho(240 + Math.min(29, Math.floor(u * 29)), 0.65, 0.24);
      }

      if (u >= 0.50 && !this.didActionFrame && enemy && !enemy.isDead) {
        this.didActionFrame = true;
        if (game.audio) game.audio.play('fireball', this.x);
        const sx = this.x + this.facing * 46;
        const sy = this.y - 102;
        const dx = enemy.x - sx;
        const dy = enemy.y - 96 - sy;
        const td = Math.hypot(dx, dy) || 1;
        game.vfx.spawnProjectile({
          x: sx,
          y: sy,
          vx: (dx / td) * 675,
          vy: (dy / td) * 675,
          radius: 14,
          color: '#fb923c',
          coreColor: '#fef08a',
          owner: this,
          damage: 62,
          type: 'fireball'
        });
        this.fx.spawn('solarFireballMachCone', sx, sy, {
          flip: this.facing < 0,
          light: 1.25,
          extra: { aimAngle: Math.atan2(dy, Math.abs(dx)), isTwin: false }
        });
        const shotAng = Math.atan2(dy, dx);
        game.vfx.spawnSlash(sx, sy, 56, shotAng - 0.8, shotAng + 0.8, '#fb923c', 0.22);
        game.vfx.spawnGlyphBurst(sx, sy, 5, 'arcane');
      }

      if (t >= dur) {
        this.y = this.groundY;
        this.vy = 0;
        this.isFlipVault = false;
        this.flipAngle = 0;
        this.isInvulnerable = false;
        this.fx.burst(this.x, this.groundY - 4, {
          count: 10,
          speedMin: 40,
          speedMax: 120,
          gravity: 85,
          colors: ['#ffffff', '#fef08a', '#fb923c', '#ea580c']
        });
        this.setState('IDLE');
      }
      return;
    }

    if (this.isBlinkTeleport) {
      this.vx = 0;
      this.vy = 0;
      this.y = this.groundY;

      if (t >= 0.13 && !this.didBlink) {
        this.didBlink = true;
        this.x = this.blinkTargetX;
        if (enemy && !enemy.isDead) {
          this.facing = enemy.x >= this.x ? 1 : -1;
        }
        this.spawnSolarEcho(PixelForge.getFrameIndex(this, this.runeOrbit), 1.0, 0.42);
        this.fx.spawn('arcaneBlinkRift', this.x, this.groundY, {
          light: 1.36,
          extra: { isArrival: true }
        });
        game.vfx.spawnGlyphBurst(this.x, this.y - 96, 8, 'arcane');

        if (enemy && !enemy.isDead) {
          if (game.audio) game.audio.play('fireball', this.x);
          const sx = this.x + this.facing * 46;
          const sy = this.y - 106;
          const dx = enemy.x - sx;
          const dy = enemy.y - 106 - sy;
          const d = Math.hypot(dx, dy) || 1;
          game.vfx.spawnProjectile({
            x: sx,
            y: sy,
            vx: (dx / d) * 675,
            vy: (dy / d) * 675,
            radius: 14,
            color: '#fb923c',
            coreColor: '#fef08a',
            owner: this,
            damage: 50,
            type: 'fireball'
          });
          this.fx.spawn('solarFireballMachCone', sx, sy, {
            flip: this.facing < 0,
            light: 1.24,
            extra: { aimAngle: Math.atan2(dy, Math.abs(dx)), isTwin: false }
          });
        }
      }

      if (t >= this.dashDuration) {
        this.y = this.groundY;
        this.isBlinkTeleport = false;
        this.isInvulnerable = false;
        this.setState('IDLE');
      }
      return;
    }

    const dur = this.dashDuration || 0.44;
    const u = Math.min(1, t / dur);
    const easeOut = 1 - Math.pow(1 - u, 2.2);
    this.vx = 0;
    this.vy = 0;
    this.x = this.dashStartX + (this.dashTargetX - this.dashStartX) * easeOut;
    this.y = this.groundY - Math.sin(u * Math.PI) * 8;

    this.afterimageAccum += dt;
    if (this.afterimageAccum >= 0.05) {
      this.afterimageAccum = 0;
      this.spawnSolarEcho(180 + Math.min(29, Math.floor(u * 29)), 0.6, 0.22);
    }

    if (t >= 0.20 && !this.didActionFrame && enemy && !enemy.isDead) {
      this.didActionFrame = true;
      const sx = this.x + this.facing * 46;
      const sy = this.y - 106;
      const dx = enemy.x - sx;
      const dy = enemy.y - 106 - sy;
      const d = Math.hypot(dx, dy) || 1;
      game.vfx.spawnProjectile({
        x: sx,
        y: sy,
        vx: (dx / d) * 665,
        vy: (dy / d) * 665,
        radius: 13,
        color: '#fb923c',
        coreColor: '#fef08a',
        owner: this,
        damage: 45,
        type: 'fireball'
      });
      this.fx.spawn('solarFireballMachCone', sx, sy, {
        flip: this.facing < 0,
        light: 1.2,
        extra: { aimAngle: Math.atan2(dy, Math.abs(dx)), isTwin: false }
      });
    }

    if (t >= dur) {
      this.y = this.groundY;
      this.isFlipVault = false;
      this.isBlinkTeleport = false;
      this.flipAngle = 0;
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  updateCrouch(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.crouchDuration || 0.96;
    this.vx *= Math.pow(0.001, dt);
    this.vy = 0;
    this.y = this.groundY;
    this.isCrouching = t < dur * 0.80;
    this.isDeflecting = this.isCrouching;

    if (t >= 0.36 && !this.didActionFrame) {
      this.didActionFrame = true;
      this.castCombo++;
      this.vx -= this.facing * 38;
      if (game.audio) game.audio.play('fireball', this.x);

      const spawnX = this.x + this.facing * 52;
      const spawnY = this.y - 82;
      const targetY = enemy ? enemy.y - 88 : spawnY;
      const dx = enemy ? enemy.x - spawnX : this.facing * 500;
      const dy = targetY - spawnY;
      const dist = Math.hypot(dx, dy) || 1;
      const speed = 705;

      game.vfx.spawnProjectile({
        x: spawnX,
        y: spawnY,
        vx: (dx / dist) * speed,
        vy: (dy / dist) * speed,
        radius: 15,
        color: '#fb923c',
        coreColor: '#fef08a',
        owner: this,
        damage: 85,
        type: 'fireball',
        isMeteor: false
      });

      this.fx.spawn('solarFireballMachCone', spawnX, spawnY, {
        flip: this.facing < 0,
        light: 1.28,
        extra: { aimAngle: Math.atan2(dy, Math.abs(dx)), isTwin: false }
      });

      const cAng = this.facing === 1 ? 0 : Math.PI;
      game.vfx.spawnSlash(spawnX, spawnY, 58, cAng - 0.85, cAng + 0.85, '#fb923c', 0.24);
      game.vfx.spawnGlyphBurst(spawnX, spawnY, 5, 'arcane');
    }

    if (t >= dur) {
      this.isCrouching = false;
      this.isDeflecting = false;
      this.y = this.groundY;
      this.setState('IDLE');
    }
  }

  update(dt, enemy, game) {
    this.runeOrbit += dt * 3.0;
    this.wallFlipCooldown = Math.max(0, this.wallFlipCooldown - dt);
    this.crouchCooldown = Math.max(0, this.crouchCooldown - dt);
    this.blinkPortalTimer = Math.max(0, this.blinkPortalTimer - dt);

    for (let i = this.solarEchoes.length - 1; i >= 0; i--) {
      const ec = this.solarEchoes[i];
      ec.life += dt;
      if (ec.life >= ec.maxLife) this.solarEchoes.splice(i, 1);
    }

    this.ensureOrbitingSuns();
    this.fx.update(dt);

    if (this.state !== 'SKILL') {
      this.didSkillAura = false;
    }

    if (!this.isDead && this.state === 'WALK') {
      this.stepTimer += dt;
      if (this.stepTimer >= 0.32) {
        this.stepTimer = 0;
        this.fx.burst(this.x - this.facing * 12, this.groundY - 3, {
          count: 4,
          speedMin: 25,
          speedMax: 72,
          gravity: 55,
          colors: ['#fef08a', '#fb923c', '#ea580c']
        });
      }
    }

    if (enemy && !enemy.isDead && (this.state === 'IDLE' || this.state === 'WALK')) {
      const dist = Math.abs(enemy.x - this.x);
      const ww = game.renderer.worldWidth;
      const nearWall = this.x < 260 || this.x > ww - 260;
      const pinnedLeft = this.x < 240 && enemy.x > this.x;
      const pinnedRight = this.x > ww - 240 && enemy.x < this.x;
      const incomingProj =
        game.vfx &&
        game.vfx.projectiles.some((p) => p.owner === enemy && Math.abs(p.x - this.x) < 155);

      if ((dist < 235 || (nearWall && dist < 305) || incomingProj) && this.dodgeCooldown <= 0) {
        this.startDodge(enemy, game);
        return;
      }

      if ((pinnedLeft || pinnedRight) && dist < 265 && this.dodgeCooldown <= 0 && this.wallFlipCooldown <= 0) {
        this.wallFlipCooldown = 3.0;
        this.startJump(enemy, game);
        return;
      }

      if (
        dist >= 265 &&
        dist <= this.attackRange &&
        this.autoCooldown <= 0 &&
        this.crouchCooldown <= 0 &&
        this.castCombo % 2 === 1
      ) {
        this.autoCooldown = this.autoInterval * (0.92 + Math.random() * 0.2);
        this.startCrouch(enemy, game);
        return;
      }

      if (dist < 215) {
        this.x -= this.facing * this.moveSpeed * 0.68 * dt;
      }
    }
    super.update(dt, enemy, game);

    if (
      this.state === 'IDLE' ||
      this.state === 'WALK' ||
      this.state === 'AUTO_ATTACK' ||
      this.state === 'SKILL' ||
      this.state === 'ULTIMATE' ||
      this.state === 'CROUCH'
    ) {
      this.y = this.groundY;
      this.vy = 0;
    }
  }

  updateAutoAttack(_dt, enemy, game) {
    const t = this.stateTimer;
    this.vy = 0;
    this.y = this.groundY;

    if (t < 0.34) {
      if (!this._drewPalmFocus) {
        this._drewPalmFocus = true;
        this.fx.spawn('heliosPalmFocus', this.x + this.facing * 32, this.y - 108, {
          follow: this,
          offsetX: 32,
          offsetY: -108,
          flip: this.facing < 0,
          light: 1.2
        });
      }
    } else if (t < 0.72) {
      if (!this.didActionFrame) {
        this.didActionFrame = true;
        this.castCombo++;
        this.vx -= this.facing * 42;
        if (game.audio) game.audio.play('fireball', this.x);

        const spawnX = this.x + this.facing * 54;
        const spawnY = this.y - 106;
        const targetY = enemy ? enemy.y - 104 : spawnY;
        const dx = enemy ? enemy.x - spawnX : this.facing * 460;
        const dy = targetY - spawnY;
        const dist = Math.hypot(dx, dy) || 1;
        const speed = 665;
        const isTwinFlare = this.castCombo % 3 === 0;

        game.vfx.spawnProjectile({
          x: spawnX,
          y: spawnY,
          vx: (dx / dist) * speed,
          vy: (dy / dist) * speed,
          radius: 15,
          color: '#fb923c',
          coreColor: '#fef08a',
          owner: this,
          damage: isTwinFlare ? 69 : 80,
          type: 'fireball',
          isMeteor: false
        });

        this.fx.spawn('solarFireballMachCone', spawnX, spawnY, {
          flip: this.facing < 0,
          light: isTwinFlare ? 1.35 : 1.22,
          extra: { aimAngle: Math.atan2(dy, Math.abs(dx)), isTwin: isTwinFlare }
        });

        if (isTwinFlare) {
          game.vfx.spawnProjectile({
            x: spawnX - this.facing * 16,
            y: spawnY - 14,
            vx: (dx / dist) * (speed * 0.94),
            vy: (dy / dist) * (speed * 0.94) - 22,
            radius: 13,
            color: '#ea580c',
            coreColor: '#fef08a',
            owner: this,
            damage: 43,
            type: 'fireball',
            isMeteor: false
          });
          game.vfx.spawnDamageText(
            this.x,
            this.y - 148,
            0,
            false,
            'TWIN SOLAR FLARE!',
            '#fef08a'
          );
        }

        game.vfx.spawnGlyphBurst(spawnX, spawnY, 4, 'arcane');
      }
    } else if (t >= this.autoDuration) {
      this.setState('IDLE');
    }
  }

  updateSkill(_dt, enemy, game) {
    const t = this.stateTimer;
    this.vy = 0;
    this.y = this.groundY;

    if (!this.didSkillAura) {
      this.didSkillAura = true;
      this.vx = 0;
      game.vfx.spawnSpecialCastAura(this, this.skillName, '✦ SOLAR ARCHMAGE ✦', 'arcane', false);
      this.fx.spawn('heliosPalmFocus', this.x + this.facing * 26, this.y - 108, {
        follow: this,
        offsetX: 26,
        offsetY: -108,
        flip: this.facing < 0,
        light: 1.28
      });
    }

    if (t >= 0.26 && !this.didActionFrame) {
      this.didActionFrame = true;
      const targetX = enemy ? enemy.x : this.x + this.facing * 360;
      if (game.audio) game.audio.play('flame_pillar', targetX);
      if (game.renderer) game.renderer.triggerShake(8, 0.18);

      const slamX = this.x + this.facing * 26;
      this.fx.spawn('magmaFissureCrack', slamX, this.groundY, {
        light: 1.28,
        extra: { spanX: targetX - slamX }
      });
      game.vfx.spawnGlyphBurst(slamX, this.groundY - 24, 6, 'arcane');

      if (enemy) {
        const pillars = [
          { x: enemy.x, delay: 0.15, maxLife: 1.45, scaleWidth: 1.15 },
          { x: enemy.x - 95, delay: 0.24, maxLife: 1.25, scaleWidth: 0.75 },
          { x: enemy.x + 95, delay: 0.24, maxLife: 1.25, scaleWidth: 0.75 }
        ];
        for (const pl of pillars) {
          game.vfx.spawnFlamePillar(pl.x, this.groundY, this, enemy, {
            theme: 'arcane',
            delay: pl.delay,
            maxLife: pl.maxLife,
            scaleWidth: pl.scaleWidth
          });
          this.fx.spawn('hellfireSolarPillar', pl.x, this.groundY, {
            light: pl.scaleWidth > 1 ? 1.38 : 1.24,
            extra: { scaleWidth: pl.scaleWidth }
          });
        }
      }
    } else if (t >= 0.56 && !this.didSecondaryAction) {
      this.didSecondaryAction = true;
      this.vx -= this.facing * 52;
      if (game.audio) game.audio.play('fireball', this.x);

      const sx = this.x + this.facing * 52;
      const sy = this.y - 106;
      const fAng = this.facing === 1 ? 0 : Math.PI;
      game.vfx.spawnSlash(sx, sy, 68, fAng - 1.0, fAng + 1.0, '#fb923c', 0.26);
      this.fx.spawn('solarFireballMachCone', sx, sy, {
        flip: this.facing < 0,
        light: 1.32,
        extra: { aimAngle: 0, isTwin: true }
      });

      if (enemy) {
        const dx = enemy.x - sx;
        const dy = enemy.y - 106 - sy;
        const dist = Math.hypot(dx, dy) || 1;
        [-38, 38].forEach((vyOff) => {
          game.vfx.spawnProjectile({
            x: sx,
            y: sy,
            vx: (dx / dist) * 635,
            vy: (dy / dist) * 635 + vyOff,
            radius: 13,
            color: '#fb923c',
            coreColor: '#fef08a',
            owner: this,
            damage: 38,
            type: 'fireball'
          });
        });
      }
    } else if (t >= this.skillDuration) {
      this.didSkillAura = false;
      this.setState('IDLE');
    }
  }

  updateUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    this.vx = 0;
    this.vy = 0;
    this.y = this.groundY;

    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const targetX = enemy ? enemy.x : ww * 0.5;
    const eclipseX = enemy ? this.x * 0.3 + enemy.x * 0.7 : ww * 0.5;
    const eclipseY = 148;

    if (t < 0.55) {
      this.runeOrbit += dt * 8.5;
      this.didSupernovaFinisher = false;

      if (!this.spawnedEclipse) {
        this.spawnedEclipse = true;
        if (game.audio) game.audio.play('eclipse_charge', eclipseX);
        game.vfx.spawnSpecialCastAura(this, this.ultName, '★ ECLIPSE SUPERNOVA ★', 'arcane', true);

        game.vfx.spawnEclipseSupernova({
          x: eclipseX,
          y: eclipseY,
          groundY: this.groundY,
          maxRadius: 112,
          color: '#fb923c',
          coreColor: '#fef08a',
          maxLife: 1.55
        });

        this.fx.spawn('eclipseSupernovaDomain', targetX, this.groundY, {
          light: 1.42
        });
        this.fx.spawn('arcaneBlinkRift', this.x, this.groundY, {
          light: 1.28,
          extra: { isArrival: false }
        });

        if (enemy && !enemy.isDead) {
          enemy.takeDamage(26, this, false, 20, 0);
        }
      }

      if (enemy && !enemy.isDead) {
        const pullDir = Math.sign(eclipseX - enemy.x);
        enemy.x += pullDir * 105 * dt;
      }
    } else if (!this.didActionFrame) {
      this.didActionFrame = true;
      this.spawnedEclipse = false;
      if (game.audio) {
        game.audio.play('solar_beam', targetX);
      }

      game.renderer.triggerShake(24, 0.60);
      game.renderer.triggerAberration(14);
      game.renderer.triggerHitStop(0.085);

      game.vfx.spawnBeam({
        x1: eclipseX,
        y1: eclipseY,
        x2: targetX,
        y2: this.groundY - 24,
        width: 84,
        color: '#fb923c',
        coreColor: '#fef08a',
        maxLife: 0.68
      });

      this.fx.spawn('solarMeteorImpactBurst', targetX, this.groundY - 78, {
        light: 1.42,
        extra: { isMeteor: true }
      });

      if (enemy && !enemy.isDead) {
        enemy.takeDamage(96, this, true, 160, -220);
      }

      [-150, -75, 0, 75, 150].forEach((off, idx) => {
        const destX = targetX + off;
        const dx = destX - eclipseX;
        const dy = this.groundY - eclipseY;
        const len = Math.hypot(dx, dy) || 1;
        const speed = 860 - Math.abs(idx - 2) * 40;

        game.vfx.spawnProjectile({
          x: eclipseX + off * 0.22,
          y: eclipseY,
          vx: (dx / len) * speed,
          vy: (dy / len) * speed,
          radius: idx === 2 ? 46 : 32,
          color: '#ea580c',
          coreColor: '#fef08a',
          owner: this,
          damage: idx === 2 ? 48 : 24,
          type: 'meteor',
          isMeteor: true
        });
      });

      game.vfx.spawnGlyphBurst(this.x, this.y - 108, 10, 'arcane');
    } else if (t >= 1.02 && !this.didSupernovaFinisher) {
      this.didSupernovaFinisher = true;
      if (game.audio) game.audio.play('supernova_detonate', targetX);
      [-115, 0, 115].forEach((off, idx) => {
        const px = targetX + off;
        game.vfx.spawnFlamePillar(px, this.groundY, this, enemy, {
          theme: 'arcane',
          delay: idx === 1 ? 0.04 : 0.14,
          maxLife: 1.05,
          scaleWidth: idx === 1 ? 1.05 : 0.72,
          isUltimate: true
        });
        this.fx.spawn('hellfireSolarPillar', px, this.groundY, {
          light: idx === 1 ? 1.42 : 1.28,
          extra: { scaleWidth: idx === 1 ? 1.05 : 0.72 }
        });
      });
      game.vfx.spawnDamageText(
        targetX,
        this.groundY - 178,
        0,
        true,
        '★ ECLIPSE SUPERNOVA! ★',
        '#fef08a'
      );
    } else if (t >= this.ultDuration) {
      this.y = this.groundY;
      this.setState('IDLE');
    }
  }

  drawSolarEchoes(ctx) {
    if (!this.solarEchoes.length) return;
    const sprites = PixelForge.initAssets().mage;
    if (!sprites || !sprites.sheet || !sprites.sheet.complete) return;

    for (const ec of this.solarEchoes) {
      const fade = Math.max(0, 1 - ec.life / ec.maxLife) * (ec.alphaScale || 1.0);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(Math.round(ec.x), Math.round(ec.y + 4));
      ctx.scale(ec.facing, 1);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * 0.42;
      PixelForge.drawAfterimageFrame(ctx, sprites, ec.frameIdx, 208, 208);
      ctx.restore();
    }
  }

  drawBlinkPortals(ctx, renderer = null) {
    if (this.blinkPortalTimer <= 0) return;
    const vfxSheet = PixelForge.initAssets().mage?.vfx;
    const fade = Math.min(1, this.blinkPortalTimer / 0.42);
    const col = Math.floor((0.56 - this.blinkPortalTimer) * 52) % 30;
    const portals = [this.blinkOriginX];
    if (this.didBlink || this.blinkPortalTimer < 0.44) {
      portals.push(this.blinkTargetX);
    }

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let idx = 0; idx < portals.length; idx++) {
      const px = Math.round(portals[idx]);
      const py = Math.round(this.groundY - 96);
      const size = Math.round(164 * (0.84 + 0.16 * fade));
      const half = Math.round(-size * 0.5);

      ctx.save();
      ctx.translate(px, py);

      if (renderer && renderer.glowOrange) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade * 0.42;
        ctx.drawImage(renderer.glowOrange, -size * 0.95, -size * 0.95, size * 1.9, size * 1.9);
      }

      if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = fade * 0.92;
        ctx.drawImage(vfxSheet, col * 208, 416, 208, 208, half, half, size, size);
      }
      ctx.restore();
    }
    ctx.restore();
  }

  drawForegroundOverlay(ctx, renderer = null) {
    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    this.fx.renderLayer(ctx, 'back', arenaCenterX, this.groundY, 0.96);
  }

  drawUltimateForeground(ctx, renderer = null) {
    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    this.fx.renderLayer(ctx, 'front', arenaCenterX, this.groundY, 0.98);
  }

  draw(ctx, isReflection = false, renderer = null) {
    const sprites = PixelForge.initAssets().mage;
    if (!sprites) return;

    if (!isReflection) {
      this.drawBlinkPortals(ctx, renderer);
      this.drawSolarEchoes(ctx);
    }

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const w = 208;
    const h = 208;
    const groundPlantOffset = 4;
    const frameIdx = PixelForge.getFrameIndex(this, this.runeOrbit);

    ctx.translate(Math.round(this.x), Math.round(this.y + groundPlantOffset));
    ctx.scale(this.facing, 1);

    PixelForge.drawSheetFrame(ctx, sprites, this, w, h, this.runeOrbit, isReflection, renderer);

    if (this.hitFlash > 0 && !isReflection) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5;
      PixelForge.drawGhostFrame(ctx, sprites, frameIdx, w, h);
    }

    ctx.restore();
  }
}
