import { Fighter } from './Fighter.js?v=30fps41';
import { PixelForge } from '../engine/PixelForge.js?v=30fps53';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps53';
import { STORM_EFFECT_REGISTRY } from '../engine/shaders/stormShaders.js?v=30fps53';

/**
 * Kaze-Maru (`ronin`) — Storm-Blade Iaido Samurai & Raijin Thunder Vanguard.
 * Powered natively by `ArcaneShaderFX` (dual-buffer 120Hz HD-2D shader & particle engine)
 * + `assets/sprites/ronin_sheet.png` & `assets/sprites/ronin_vfx.png`.
 */
export class Ronin extends Fighter {
  constructor(x, groundY, facing = 1) {
    const opts = typeof x === 'object' && x !== null ? x : { x, groundY, facing };
    super({
      ...opts,
      name: opts.name || 'Kaze-Maru',
      maxHp: 1125,
      moveSpeed: 222,
      attackRange: 175,
      autoInterval: 0.86,
      lightColor: 'rgba(129, 140, 248, 1)',
      primaryColor: '#818cf8'
    });
    this.heroId = 'ronin';
    this.deathSfx = 'death_knight';
    this.skillName = 'ZANTETSUKEN FLASH';
    this.ultName = 'SUSANOO OMNISLASH';
    this.theme = 'storm';
    this.hasPoise = false;
    this.skillTriggerRange = 440;
    this.skillMaxCooldown = 4.85;
    this.dodgeMaxCooldown = 3.45;
    this.dashMaxCooldown = 3.40;
    this.autoDuration = 0.46;
    this.skillDuration = 0.90;
    this.ultDuration = 1.80;
    this.crouchDuration = 0.62;
    this.dashDuration = 0.26;
    this.comboStep = 0;
    this.stepDustTimer = 0;
    this.divePitchRad = 0;

    // Kaze-Maru Unique Iaido & Storm-God Mechanics:
    // 1. Lightning Afterimage Clones left behind during Shunpo / Flash-Through / Zantetsuken / Omnislash
    this.afterimages = [];
    this.afterimageSpawnAccum = 0;
    // 2. Active Persistent Judgment-Cut Slash Lines (tracked for Zantetsuken Noto Sheath Detonation)
    this.activeSlashLines = [];
    // 3. Queued Delayed Judgment-Cut Sheath Detonations
    this.delayedJudgmentCuts = [];
    // 4. Iaido Serene Mind Counter-Blink state
    this.iaidoCounterActive = false;
    // 5. Active 30fps HD-2D VFX sheet animations (Row 0..4 of assets/sprites/ronin_vfx.png)
    this.activeVfxAnims = [];
    this._ultTargetX = 600;
    this.susanooAvatar = null;

    this.fx = new ArcaneShaderFX(STORM_EFFECT_REGISTRY, {
      pixelScale: 3,
      viewW: 440,
      viewH: 220
    });

    if (typeof Image !== 'undefined') {
      const roninAssets = PixelForge.initAssets()?.ronin;
      if (roninAssets?.vfx?.src && !roninAssets.vfx.src.includes('v=30fps51')) {
        roninAssets.vfx.src = 'assets/sprites/ronin_vfx.png?v=30fps51';
      }
    }
  }

  setState(newState) {
    super.setState(newState);
    if (newState !== 'CROUCH') {
      this.iaidoCounterActive = false;
      this.fx?.stopByKey('sereneMindParryWard');
    }
    if (newState !== 'SKILL' && newState !== 'ULTIMATE') {
      this.fx?.stopByKey('shunpoSpearMachCone');
    }
    if (newState !== 'ULTIMATE') {
      this.susanooAvatar = null;
      this.fx?.stopByKey('susanooStormDomain');
    }
    if (newState !== 'SKILL' && newState !== 'ULTIMATE' && newState !== 'DASH' && newState !== 'WALK') {
      this.divePitchRad = 0;
    }
    if (newState === 'SKILL') {
      this._zantetsuStep = 0;
      this._skillOriginX = this.x;
      this._skillOriginY = this.y;
    }
    if (newState === 'ULTIMATE') {
      this._omniStep = 0;
      this._ultOriginX = this.x;
      this._ultOriginY = this.y;
      this._ultApexStartX = this.x;
      this._ultApexStartY = this.y;
    }
    if (newState === 'DEATH') {
      this.fx?.clear();
    }
  }

  spawnSayaGlint(isSheath = false) {
    if (!this.fx) return;
    this.fx.spawn('iaidoSayaGlint', this.x - this.facing * 14, this.y - 68, {
      flip: this.facing < 0,
      light: isSheath ? 1.42 : 1.22,
      extra: { isSheath }
    });
  }

  spawnAfterimage(x, y, facing, row = 6, col = 14, maxLife = 0.28, pitch = 0) {
    this.afterimages.push({
      x,
      y,
      facing,
      frameIdx: row * 30 + col,
      age: 0,
      maxLife,
      pitch
    });
  }

  spawnVfxAnim(row, x, y, w = 208, h = 208, maxLife = 0.48, opts = {}) {
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
      glowColor: opts.glowColor || 'cyan',
      followOwner: Boolean(opts.followOwner),
      offsetX: opts.offsetX || 0,
      offsetY: opts.offsetY || 0
    });
  }

  spawnPixelShockwave(x, y, maxR = 135, colorType = 'cyan', maxLife = 0.32, isGround = false) {
    if (!this.fx) return;
    this.fx.spawn('raijinTaikoShockwave', x, y, {
      flip: false,
      light: colorType === 'gold' ? 1.38 : 1.24,
      maxDuration: maxLife,
      extra: { maxRWorld: maxR, colorType, isGround }
    });
  }

  spawnPixelLightningBolt(x, topY, botY, colorType = 'cyan', maxLife = 0.34) {
    if (!this.fx) return;
    this.fx.spawn('raijinSkyThunderbolt', x, botY, {
      flip: false,
      light: colorType === 'gold' ? 1.42 : 1.28,
      maxDuration: maxLife,
      extra: { spanWorldY: Math.max(90, botY - topY), colorType }
    });
    this.fx.burst(x, botY - 8, {
      count: 8,
      speedMin: 45,
      speedMax: 155,
      lifeMin: 0.14,
      lifeMax: 0.28,
      gravity: 65,
      colors: colorType === 'gold' ? ['#ffffff', '#fef08a', '#eab308'] : ['#ffffff', '#67e8f9', '#a78bfa']
    });
  }

  addSlashLine(x1, y1, x2, y2, maxLife = 0.65, detonated = false) {
    this.activeSlashLines.push({
      x1,
      y1,
      x2,
      y2,
      age: 0,
      maxLife,
      detonated
    });
    if (this.fx) {
      this.fx.spawn('judgmentSlashBeam', x1, y1, {
        flip: false,
        light: detonated ? 1.44 : 1.24,
        maxDuration: maxLife,
        extra: {
          dx: x2 - x1,
          dy: y2 - y1,
          detonated,
          customDuration: maxLife
        }
      });
    }
  }

  syncSpearMachCone() {
    if (!this.fx) return;
    const isSkillDive = this.state === 'SKILL' && this.stateTimer >= 0.18 && this.stateTimer < 0.48;
    const isUltDive = this.state === 'ULTIMATE' && this.stateTimer >= 0.30 && this.stateTimer < 1.26;
    if (isSkillDive || isUltDive) {
      const isHeavenSplit = this.state === 'ULTIMATE' && this.stateTimer >= 1.02;
      let slot = this.fx.active.find((s) => s.key === 'shunpoSpearMachCone');
      if (!slot) {
        slot = this.fx.spawn('shunpoSpearMachCone', this.x, this.y - 72, {
          follow: this,
          offsetX: 0,
          offsetY: -72,
          flip: this.facing < 0,
          light: isHeavenSplit ? 1.42 : 1.28,
          extra: { pitchAngle: this.divePitchRad || 0, isHeavenSplit }
        });
      } else {
        slot.inst.cfg.pitchAngle = this.divePitchRad || 0;
        slot.inst.cfg.isHeavenSplit = isHeavenSplit;
      }
    } else {
      this.fx.stopByKey('shunpoSpearMachCone');
    }
  }

  triggerIaidoCounterBlink(attacker, game) {
    if (!attacker || attacker.isDead) return;
    this.iaidoCounterActive = false;
    this.isDeflecting = false;
    this.fx?.stopByKey('sereneMindParryWard');
    const oldX = this.x;
    this.spawnAfterimage(oldX, this.y, this.facing, 7, 10, 0.34);

    // Teleport directly BEHIND the attacker's back!
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const behindDir = attacker.facing || -this.facing;
    this.x = Math.max(85, Math.min(ww - 85, attacker.x - behindDir * 86));
    this.y = this.groundY;
    this.facing = attacker.x >= this.x ? 1 : -1;
    this.spawnAfterimage((oldX + this.x) * 0.5, this.y - 12, this.facing, 6, 12, 0.28);
    this.spawnSayaGlint(true);

    // Add X-shaped Judgment Cut slash lines + Row-3 Raijin Ring + Row-1 Cross-Slash seal across attacker
    this.addSlashLine(attacker.x - 62, attacker.y - 138, attacker.x + 62, attacker.y - 22, 0.42, true);
    this.addSlashLine(attacker.x - 62, attacker.y - 22, attacker.x + 62, attacker.y - 138, 0.42, true);
    this.spawnVfxAnim(3, attacker.x, attacker.y - 78, 216, 216, 0.42, { glowColor: 'cyan' });
    this.spawnVfxAnim(1, attacker.x, attacker.groundY - 92, 208, 208, 0.44, {
      startFrame: 18,
      endFrame: 29,
      glowColor: 'purple'
    });
    this.spawnVfxAnim(4, attacker.x, attacker.y - 80, 196, 196, 0.34, { glowColor: 'cyan' });
    this.spawnPixelShockwave(attacker.x, attacker.y - 80, 128, 'cyan', 0.30, false);
    this.spawnPixelLightningBolt(attacker.x, attacker.groundY - 260, attacker.groundY, 'cyan', 0.34);

    if (game) {
      if (game.audio) {
        game.audio.play('dash_whoosh', this.x);
        game.audio.play('slash', attacker.x);
      }
      game.renderer.triggerShake(9, 0.18);
      game.renderer.triggerHitStop(0.045);
      game.vfx.spawnDamageText(
        this.x,
        this.y - 156,
        0,
        true,
        '★ IAIDO COUNTER-BLINK! ★',
        '#38bdf8'
      );
    }

    attacker.takeDamage(48, this, true, 145, -155);
    this.heal(16, 'SERENE FOCUS');
    this.gainMana(15);
    this.didActionFrame = true;
  }

  update(dt, enemy, game) {
    // 1. Update Lightning Afterimages
    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      this.afterimages[i].age += dt;
      if (this.afterimages[i].age >= this.afterimages[i].maxLife) {
        this.afterimages.splice(i, 1);
      }
    }

    // 2. Update Persistent Slash Lines
    for (let i = this.activeSlashLines.length - 1; i >= 0; i--) {
      this.activeSlashLines[i].age += dt;
      if (this.activeSlashLines[i].age >= this.activeSlashLines[i].maxLife) {
        this.activeSlashLines.splice(i, 1);
      }
    }

    // 3. Update Active 30fps Ronin VFX Sheet Animations
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

    // 4. Update Delayed Judgment-Cut Sheath Detonations (from 3rd Auto-Attack Flash-Through)
    for (let i = this.delayedJudgmentCuts.length - 1; i >= 0; i--) {
      const jc = this.delayedJudgmentCuts[i];
      jc.timer -= dt;
      if (jc.timer <= 0) {
        this.delayedJudgmentCuts.splice(i, 1);
        const t = jc.target;
        if (t && !t.isDead && game) {
          this.spawnSayaGlint(true);
          this.addSlashLine(t.x - 56, t.y - 134, t.x + 56, t.y - 26, 0.34, true);
          this.addSlashLine(t.x - 56, t.y - 26, t.x + 56, t.y - 134, 0.34, true);
          this.spawnVfxAnim(2, t.x, t.groundY - 94, 208, 208, 0.44, {
            startFrame: 18,
            endFrame: 29,
            glowColor: 'cyan'
          });
          this.spawnVfxAnim(3, t.x, t.y - 78, 188, 188, 0.34, { glowColor: 'purple' });
          this.spawnVfxAnim(4, t.x, t.y - 80, 184, 184, 0.32, { glowColor: 'cyan' });
          this.spawnPixelShockwave(t.x, t.y - 80, 118, 'cyan', 0.28, false);
          this.spawnPixelLightningBolt(t.x, t.groundY - 240, t.groundY, 'purple', 0.30);
          if (game.audio) game.audio.play('slash', t.x);
          game.renderer.triggerShake(7, 0.15);
          game.vfx.spawnBurst(t.x, t.y - 82, 16, '#818cf8', 235, { upBias: 95, size: 5 });
          game.vfx.spawnDamageText(t.x, t.y - 156, 0, true, 'JUDGMENT SHEATH!', '#38bdf8');
          t.takeDamage(24, this, true, 95, -145);
        }
      }
    }

    if (!this.isDead && this.state === 'WALK') {
      this.divePitchRad = 0.05;
      this.stepDustTimer += dt;
      if (this.stepDustTimer >= 0.24) {
        this.stepDustTimer = 0;
        if (game.audio) game.audio.play('footstep_steel', this.x);
        this.fx?.burst(this.x - this.facing * 14, this.groundY - 2, {
          count: 4,
          speedMin: 30,
          speedMax: 85,
          lifeMin: 0.14,
          lifeMax: 0.26,
          gravity: 35,
          colors: ['#ffffff', '#67e8f9', '#818cf8']
        });
      }
    } else if (this.state === 'IDLE') {
      this.divePitchRad *= Math.pow(0.001, dt);
    }

    super.update(dt, enemy, game);
    this.syncSpearMachCone();
    this.fx.update(dt);
  }

  startDodge(enemy, game) {
    this.dodgeCooldown = this.dodgeMaxCooldown * (0.84 + Math.random() * 0.26);
    if (Math.random() < 0.58) {
      this.startCrouch(enemy, game);
    } else {
      this.startJump(enemy, game);
    }
  }

  startCrouch(enemy, game) {
    this.crouchDuration = 0.62;
    this.setState('CROUCH');
    this.isCrouching = true;
    this.iaidoCounterActive = true;
    this.isDeflecting = true;
    this.vx = 0;
    this.spawnSayaGlint(false);
    this.fx?.spawn('sereneMindParryWard', this.x, this.groundY - 4, {
      follow: this,
      useGroundY: true,
      offsetX: 0,
      offsetY: -4,
      flip: false,
      light: 1.24
    });
    this.spawnPixelShockwave(this.x, this.groundY - 4, 88, 'purple', 0.26, true);
    if (game && game.audio) game.audio.play('clang', this.x);
    if (game && game.vfx) {
      game.vfx.spawnDamageText(
        this.x,
        this.y - 144,
        0,
        false,
        'SERENE MIND COUNTER!',
        '#38bdf8'
      );
    }
  }

  updateCrouch(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.crouchDuration || 0.62;
    this.vx *= Math.pow(0.001, dt);

    if (this.iaidoCounterActive && game && game.vfx) {
      for (const proj of game.vfx.projectiles) {
        if (
          proj.owner !== this &&
          (!this.team || !proj.owner?.team || proj.owner.team !== this.team) &&
          Math.abs(proj.x - this.x) < 145
        ) {
          proj.owner = this;
          proj.vx = -proj.vx * 1.4;
          proj.color = '#38bdf8';
          if (enemy && !enemy.isDead) {
            this.triggerIaidoCounterBlink(enemy, game);
          }
          break;
        }
      }
      if (
        this.iaidoCounterActive &&
        enemy &&
        !enemy.isDead &&
        Math.abs(enemy.x - this.x) < 190 &&
        (enemy.state === 'AUTO_ATTACK' || enemy.state === 'SKILL') &&
        enemy.stateTimer >= 0.14
      ) {
        this.triggerIaidoCounterBlink(enemy, game);
      }
    }

    // If no attack triggered the counter by t = 0.38s, unleash a fast 165px Shunpo Draw-Cut Dash forward!
    if (t >= 0.38 && !this.didActionFrame) {
      this.didActionFrame = true;
      this.iaidoCounterActive = false;
      this.isDeflecting = false;
      this.fx?.stopByKey('sereneMindParryWard');
      const oldX = this.x;
      const ww = game?.renderer ? game.renderer.worldWidth : 1200;
      this.spawnAfterimage(oldX, this.y, this.facing, 7, 14, 0.28);
      this.x = Math.max(85, Math.min(ww - 85, this.x + this.facing * 165));
      this.spawnSayaGlint(false);
      this.addSlashLine(oldX, this.y - 68, this.x, this.y - 68, 0.32);
      this.spawnVfxAnim(0, this.x + this.facing * 32, this.y - 74, 196, 196, 0.30, {
        vx: this.facing * 240,
        flipX: this.facing < 0,
        glowColor: 'cyan'
      });
      this.spawnPixelShockwave(this.x, this.y - 72, 108, 'cyan', 0.26, false);
      if (game?.audio) game.audio.play('slash', this.x);
      if (enemy && !enemy.isDead && Math.abs(enemy.x - (oldX + this.x) * 0.5) < 145) {
        enemy.takeDamage(34, this, true, 125, -135);
      }
    }

    if (t >= dur) {
      this.iaidoCounterActive = false;
      this.isDeflecting = false;
      this.isCrouching = false;
      this.setState('IDLE');
    }
  }

  startJump(enemy, game) {
    this.dashDuration = 0.56;
    this.setState('JUMP');
    this.isInvulnerable = true;
    this.isFlipVault = true;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const dir = enemy && !enemy.isDead ? Math.sign(enemy.x - this.x) || this.facing : this.facing;
    this.dashDir = dir;
    this.vaultStartX = this.x;
    const targetX =
      enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 280
        ? enemy.x + dir * 82
        : this.x + dir * 215;
    this.vaultTargetX = Math.max(85, Math.min(ww - 85, targetX));
    this.vx = 0;
    this.vy = 0;
    this.spawnAfterimage(this.x, this.y, this.facing, 8, 4, 0.26);
    this.spawnPixelShockwave(this.x, this.groundY - 4, 84, 'cyan', 0.24, true);
    if (game && game.audio) game.audio.play('dash_whoosh', this.x);
    if (game && game.vfx) {
      game.vfx.spawnDamageText(
        this.x,
        this.y - 144,
        0,
        false,
        'TSUBAME GAESHI!',
        '#38bdf8'
      );
    }
  }

  onStartDash(enemy, game, dir) {
    this.isFlipVault = false;
    this.dashStartX = this.x;
    this.spawnAfterimage(this.x, this.y, this.facing, 6, 6, 0.28, 0.12);
    this.spawnSayaGlint(false);
    this.spawnPixelShockwave(this.x, this.groundY - 4, 78, 'cyan', 0.22, true);
    if (game && game.audio) game.audio.play('dash_whoosh', this.x);
    if (game && game.vfx) {
      game.vfx.spawnDamageText(
        this.x,
        this.y - 144,
        0,
        false,
        'SHUNPO FLASH-STEP!',
        '#38bdf8'
      );
    }
  }

  updateDashOrDodge(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = Math.max(0.01, this.dashDuration || 0.42);
    const u = Math.min(1, t / dur);

    if (this.isFlipVault) {
      const easeU = 1 - Math.pow(1 - u, 1.8);
      this.x = this.vaultStartX + (this.vaultTargetX - this.vaultStartX) * easeU;
      this.y = this.groundY - Math.sin(u * Math.PI) * 98;
      this.vx = 0;
      this.vy = 0;

      if (Math.random() < 0.38) {
        this.spawnAfterimage(this.x, this.y, this.facing, 8, Math.floor(u * 28), 0.20);
      }

      if (u >= 0.36 && !this.didActionFrame) {
        this.didActionFrame = true;
        if (game?.audio) game.audio.play('slash', this.x);
        this.addSlashLine(this.x - 45, this.y - 110, this.x + this.facing * 75, this.y - 20, 0.28);
        this.spawnVfxAnim(0, this.x + this.facing * 28, this.y - 68, 192, 192, 0.26, {
          vx: this.facing * 210,
          flipX: this.facing < 0,
          glowColor: 'cyan'
        });
        this.spawnPixelShockwave(this.x, this.y - 68, 96, 'cyan', 0.24, false);
        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 145) {
          enemy.takeDamage(22, this, false, 45, -130);
        }
      }

      if (u >= 0.58 && !this.didSecondaryAction) {
        this.didSecondaryAction = true;
        if (game?.audio) game.audio.play('slash', this.x);
        this.addSlashLine(this.x - 45, this.y - 20, this.x + this.facing * 75, this.y - 110, 0.28);
        this.spawnVfxAnim(0, this.x + this.facing * 32, this.y - 64, 196, 196, 0.28, {
          vx: this.facing * 230,
          flipX: this.facing < 0,
          glowColor: 'purple'
        });
        this.spawnPixelShockwave(this.x, this.y - 68, 106, 'purple', 0.26, false);
        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 155) {
          enemy.takeDamage(25, this, true, 95, 120);
        }
      }

      if (t >= dur) {
        this.y = this.groundY;
        this.isFlipVault = false;
        this.isInvulnerable = false;
        this.setState('IDLE');
      }
      return;
    }

    const burst = 720 * (1 - u * 0.58);
    this.vx = this.dashDir * burst;
    this.divePitchRad = Math.sin(u * Math.PI) * 0.14;
    if (Math.random() < 0.45) {
      this.spawnAfterimage(this.x, this.y, this.facing, 6, Math.floor(u * 28), 0.22, this.divePitchRad);
    }
    if (t >= dur) {
      this.divePitchRad = 0;
      this.isDeflecting = false;
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  updateAutoAttack(dt, enemy, game) {
    const t = this.stateTimer;
    if (t >= 0.04 && !this._drewAutoGlint) {
      this._drewAutoGlint = true;
      this.spawnSayaGlint(false);
    }

    if (t >= 0.18 && !this.didActionFrame) {
      this.didActionFrame = true;
      const step = this.comboStep;
      this.comboStep = (this.comboStep + 1) % 3;

      if (step < 2) {
        this.vx = this.facing * 255;
        if (game?.audio) game.audio.play('slash', this.x);
        this.spawnVfxAnim(0, this.x + this.facing * 44, this.y - 82, 196, 196, 0.28, {
          vx: this.facing * 260,
          flipX: this.facing < 0,
          glowColor: step === 0 ? 'cyan' : 'purple'
        });
        this.spawnPixelShockwave(
          this.x + this.facing * 38,
          this.y - 80,
          98,
          step === 0 ? 'cyan' : 'purple',
          0.24,
          false
        );
        this.addSlashLine(
          this.x + this.facing * 18,
          this.y - (step === 0 ? 78 : 35),
          this.x + this.facing * 145,
          this.y - (step === 0 ? 68 : 125),
          0.26
        );

        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= this.attackRange + 30) {
          const isCrit = Math.random() < 0.30;
          const dmg = (step === 0 ? 27 : 30) * (isCrit ? 1.35 : 1);
          enemy.takeDamage(dmg, this, isCrit, 75, step === 1 ? -145 : 0);
          this.gainMana(9);
        }
      } else {
        // Step 2 (3rd Hit): IAIDO FLASH-THROUGH SLASH & DELAYED JUDGMENT CUT!
        const oldX = this.x;
        const ww = game?.renderer ? game.renderer.worldWidth : 1200;
        this.spawnAfterimage(oldX, this.y, this.facing, 2, 16, 0.30);

        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= 215) {
          const newX = Math.max(85, Math.min(ww - 85, enemy.x + this.facing * 94));
          this.spawnAfterimage((oldX + newX) * 0.5, this.y, this.facing, 3, 10, 0.28);
          this.x = newX;
          this.facing = enemy.x >= this.x ? 1 : -1;
          this.addSlashLine(oldX, this.y - 76, newX, this.y - 76, 0.38);
          this.spawnVfxAnim(0, (oldX + newX) * 0.5, this.y - 80, 208, 208, 0.30, {
            flipX: newX < oldX,
            glowColor: 'cyan'
          });
          this.spawnPixelShockwave(enemy.x, enemy.y - 78, 112, 'cyan', 0.26, false);

          if (game?.audio) {
            game.audio.play('dash_whoosh', this.x);
            game.audio.play('slash', enemy.x);
          }
          game?.vfx?.spawnDamageText(
            this.x,
            this.y - 148,
            0,
            true,
            'IAIDO FLASH-THROUGH!',
            '#38bdf8'
          );
          enemy.takeDamage(32, this, true, 35, -125);
          this.gainMana(11);

          this.delayedJudgmentCuts.push({
            target: enemy,
            timer: 0.24
          });
        } else {
          this.x = Math.max(85, Math.min(ww - 85, this.x + this.facing * 145));
          this.addSlashLine(oldX, this.y - 76, this.x, this.y - 76, 0.28);
          this.spawnVfxAnim(0, this.x + this.facing * 32, this.y - 78, 196, 196, 0.28, {
            vx: this.facing * 240,
            flipX: this.facing < 0,
            glowColor: 'cyan'
          });
          if (game?.audio) game.audio.play('slash', this.x);
        }
      }
    }

    if (t >= 0.44) {
      this._drewAutoGlint = false;
      this.setState('IDLE');
    }
  }

  updateSkill(dt, enemy, game) {
    const t = this.stateTimer;
    if (!this._zantetsuStep) this._zantetsuStep = 0;
    this.isInvulnerable = t < 0.66;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const clampX = (xVal) => Math.max(85, Math.min(ww - 85, xVal));
    const originX = this._skillOriginX !== undefined ? this._skillOriginX : this.x;
    const center =
      enemy && !enemy.isDead
        ? enemy.x
        : Math.max(220, Math.min(ww - 220, originX + this.facing * 165));
    const dir = center >= originX ? 1 : -1;

    // Phase 0 (0.00s .. 0.18s -> Row 3 F00..F05): 100% Grounded Coiled Iaido Cast (zero floating!)
    if (t < 0.18) {
      this.vx = 0;
      this.vy = 0;
      this.y = this.groundY;
      this.divePitchRad = 0;
      if (this._zantetsuStep === 0) {
        this._zantetsuStep = 1;
        this._skillOriginX = this.x;
        this._skillOriginY = this.groundY;
        this.spawnSayaGlint(false);
        this.spawnVfxAnim(3, this.x, this.groundY - 76, 176, 176, 0.24, {
          followOwner: true,
          offsetX: 0,
          offsetY: -76,
          glowColor: 'cyan'
        });
        this.spawnPixelShockwave(this.x, this.groundY - 4, 96, 'cyan', 0.24, true);
      }
      return;
    }

    // Phase 1 (0.18s .. 0.48s -> Row 3 F06..F15): 3 Frame-Locked Multi-Angle Spear-Dashes!
    const passWindows = [
      {
        t0: 0.18,
        t1: 0.27,
        p0: { x: originX, y: this.groundY },
        p1: { x: clampX(center + dir * 130), y: this.groundY - 82 }
      },
      {
        t0: 0.27,
        t1: 0.36,
        p0: { x: clampX(center + dir * 130), y: this.groundY - 82 },
        p1: { x: clampX(center - dir * 130), y: this.groundY - 76 }
      },
      {
        t0: 0.36,
        t1: 0.48,
        p0: { x: clampX(center - dir * 130), y: this.groundY - 76 },
        p1: { x: clampX(center + dir * 108), y: this.groundY }
      }
    ];

    if (t >= 0.18 && t < 0.48) {
      let passIdx = 0;
      if (t >= 0.36) passIdx = 2;
      else if (t >= 0.27) passIdx = 1;

      const win = passWindows[passIdx];
      const localU = Math.min(1, Math.max(0, (t - win.t0) / (win.t1 - win.t0)));
      const easeU = localU < 0.5 ? 2 * localU * localU : 1 - Math.pow(-2 * localU + 2, 2) / 2;

      const { p0, p1 } = win;
      this.x = p0.x + (p1.x - p0.x) * easeU;
      this.y = p0.y + (p1.y - p0.y) * easeU;
      this.vx = 0;
      this.vy = 0;

      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      this.facing = dx >= 0 ? 1 : -1;
      this.divePitchRad = Math.atan2(dy, Math.max(1, Math.abs(dx)));

      this.afterimageSpawnAccum += dt;
      if (this.afterimageSpawnAccum >= 0.024) {
        this.afterimageSpawnAccum = 0;
        const col = Math.min(15, Math.max(6, Math.floor((t / this.skillDuration) * 30)));
        this.spawnAfterimage(this.x, this.y, this.facing, 3, col, 0.28, 0);
      }

      const targetStep = passIdx + 2; // 2, 3, 4
      if (this._zantetsuStep < targetStep) {
        this._zantetsuStep = targetStep;
        this.addSlashLine(p0.x, p0.y - 62, p1.x, p1.y - 62, 0.64);
        const midY = (p0.y + p1.y) * 0.5 - 64;
        this.spawnVfxAnim(0, center, midY, 208, 208, 0.28, {
          vx: this.facing * 280,
          flipX: this.facing < 0,
          glowColor: passIdx % 2 === 0 ? 'cyan' : 'purple'
        });
        this.spawnPixelShockwave(
          center,
          midY,
          112,
          passIdx % 2 === 0 ? 'cyan' : 'purple',
          0.26,
          false
        );
        if (game?.audio) game.audio.play('dash_whoosh', center);
        if (enemy && !enemy.isDead && Math.abs(enemy.x - center) < 235) {
          enemy.takeDamage(20, this, passIdx === 2, 22, -98);
        }
      }
      return;
    }

    // Phase 2 (0.48s .. 0.66s -> Row 3 F16..F21): Grounded Landing & Slide-Brake
    if (t >= 0.48 && t < 0.66) {
      this.y = this.groundY;
      this.divePitchRad = 0;
      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }
    }

    // Phase 3 (0.66s -> Row 3 F22): NOTO SHEATHING CLICK! Detonates all slash lines & erupts Judgement Pillar!
    if (t >= 0.66 && !this.didSecondaryAction) {
      this.didSecondaryAction = true;
      this.y = this.groundY;
      this.divePitchRad = 0;
      this.spawnSayaGlint(true);
      if (game?.audio) game.audio.play('slash', this.x);
      game?.renderer?.triggerShake(11, 0.22);
      game?.renderer?.triggerAberration(6);
      game?.renderer?.triggerHitStop(0.05);
      game?.vfx?.spawnDamageText(
        this.x,
        this.y - 156,
        0,
        true,
        '★ ZANTETSUKEN: SHEATH! ★',
        '#38bdf8'
      );

      for (const line of this.activeSlashLines) {
        line.detonated = true;
        const mx = (line.x1 + line.x2) * 0.5;
        const my = (line.y1 + line.y2) * 0.5;
        this.fx?.spawn('judgmentSlashBeam', line.x1, line.y1, {
          flip: false,
          light: 1.45,
          maxDuration: 0.34,
          extra: {
            dx: line.x2 - line.x1,
            dy: line.y2 - line.y1,
            detonated: true,
            customDuration: 0.34
          }
        });
        this.fx?.burst(mx, my, {
          count: 8,
          speedMin: 55,
          speedMax: 185,
          lifeMin: 0.14,
          lifeMax: 0.28,
          gravity: 40,
          colors: ['#ffffff', '#fef08a', '#67e8f9', '#a78bfa']
        });
      }

      const strikeX = enemy && !enemy.isDead ? enemy.x : center;
      this.spawnVfxAnim(1, strikeX, this.groundY - 94, 220, 220, 0.46, {
        startFrame: 18,
        endFrame: 29,
        glowColor: 'cyan'
      });
      this.spawnVfxAnim(2, strikeX, this.groundY - 96, 212, 212, 0.46, {
        startFrame: 18,
        endFrame: 29,
        glowColor: 'purple'
      });
      this.spawnVfxAnim(4, strikeX, this.groundY - 86, 212, 212, 0.36, {
        glowColor: 'cyan'
      });
      this.spawnPixelShockwave(strikeX, this.groundY - 6, 155, 'cyan', 0.34, true);
      this.spawnPixelLightningBolt(strikeX, this.groundY - 270, this.groundY, 'cyan', 0.36);

      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 340) {
        enemy.takeDamage(36, this, true, 165, -210);
      }
    }

    if (t >= this.skillDuration) {
      this._zantetsuStep = 0;
      this.y = this.groundY;
      this.divePitchRad = 0;
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  updateUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    if (!this._omniStep) this._omniStep = 0;
    this.isInvulnerable = true;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const clampX = (xVal) => Math.max(85, Math.min(ww - 85, xVal));
    const originX = this._ultOriginX !== undefined ? this._ultOriginX : this.x;
    const targetX = enemy && !enemy.isDead ? enemy.x : ww * 0.5;
    this._ultTargetX = targetX;
    this.susanooAvatar = { x: targetX, y: this.groundY };
    const dir = targetX >= originX ? 1 : -1;
    const landX = clampX(targetX - dir * 68);

    // Stage 0 (0.00s .. 0.30s -> Row 4 F00..F04): 100% GROUNDED Susanoo Awakening Cast (ZERO lifting / ZERO floating!)
    if (t < 0.30) {
      if (this._omniStep === 0) {
        this._omniStep = 1;
        this._ultOriginX = this.x;
        this._ultOriginY = this.groundY;
        this.spawnSayaGlint(false);
        this.fx?.spawn('susanooStormDomain', targetX, this.groundY - 4, {
          flip: false,
          light: 1.34
        });
        this.spawnVfxAnim(3, targetX, this.groundY - 82, 236, 236, 1.32, {
          glowColor: 'cyan'
        });
        this.spawnPixelShockwave(this.x, this.groundY - 4, 145, 'purple', 0.34, true);
        this.spawnPixelLightningBolt(this.x, this.groundY - 280, this.groundY, 'cyan', 0.36);
      }
      this.x = this._ultOriginX;
      this.y = this.groundY;
      this.vx = 0;
      this.vy = 0;
      this.facing = targetX >= this.x ? 1 : -1;
      this.divePitchRad = 0;
      return;
    }

    // Stage 1 & 2 (0.30s .. 1.26s -> Row 4 F05..F20): 6 Continuous Frame-Locked Multi-Angle Spear-Dashes!
    const omniPasses = [
      {
        t0: 0.30,
        t1: 0.48,
        p0: { x: originX, y: this.groundY },
        p1: { x: clampX(targetX + dir * 135), y: this.groundY - 128 }
      },
      {
        t0: 0.48,
        t1: 0.60,
        p0: { x: clampX(targetX + dir * 135), y: this.groundY - 128 },
        p1: { x: clampX(targetX - dir * 130), y: this.groundY - 16 }
      },
      {
        t0: 0.60,
        t1: 0.72,
        p0: { x: clampX(targetX - dir * 130), y: this.groundY - 16 },
        p1: { x: clampX(targetX + dir * 130), y: this.groundY - 142 }
      },
      {
        t0: 0.72,
        t1: 0.84,
        p0: { x: clampX(targetX + dir * 130), y: this.groundY - 142 },
        p1: { x: clampX(targetX - dir * 140), y: this.groundY - 124 }
      },
      {
        t0: 0.84,
        t1: 1.02,
        p0: { x: clampX(targetX - dir * 140), y: this.groundY - 124 },
        p1: { x: clampX(targetX + dir * 145), y: this.groundY - 188 }
      },
      {
        t0: 1.02,
        t1: 1.26,
        p0: { x: clampX(targetX + dir * 145), y: this.groundY - 188 },
        p1: { x: landX, y: this.groundY }
      }
    ];

    if (t >= 0.30 && t < 1.26) {
      let passIdx = 0;
      for (let i = omniPasses.length - 1; i >= 0; i--) {
        if (t >= omniPasses[i].t0) {
          passIdx = i;
          break;
        }
      }

      const pass = omniPasses[passIdx];
      const localU = Math.min(1, Math.max(0, (t - pass.t0) / (pass.t1 - pass.t0)));
      const easeDive =
        passIdx === 5
          ? localU * localU * (3 - 2 * localU)
          : localU < 0.5
            ? 2 * localU * localU
            : 1 - Math.pow(-2 * localU + 2, 2) / 2;

      const { p0, p1 } = pass;
      this.x = p0.x + (p1.x - p0.x) * easeDive;
      this.y = p0.y + (p1.y - p0.y) * easeDive;
      this.vx = 0;
      this.vy = 0;

      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      this.facing = dx >= 0 ? 1 : -1;
      this.divePitchRad = Math.atan2(dy, Math.max(1, Math.abs(dx)));

      this.afterimageSpawnAccum += dt;
      const spawnInterval = passIdx === 5 ? 0.018 : 0.022;
      if (this.afterimageSpawnAccum >= spawnInterval) {
        this.afterimageSpawnAccum = 0;
        const col = Math.min(20, Math.max(5, Math.floor((t / this.ultDuration) * 30)));
        this.spawnAfterimage(this.x, this.y, this.facing, 4, col, 0.32, 0);
      }

      if (passIdx < 5) {
        const stepTrigger = passIdx + 2; // 2..6
        if (this._omniStep < stepTrigger && localU >= 0.25) {
          this._omniStep = stepTrigger;
          this.addSlashLine(p0.x, p0.y - 62, p1.x, p1.y - 62, 0.58);
          const hitY = (p0.y + p1.y) * 0.5 - 62;
          this.spawnVfxAnim(0, targetX, hitY, 212, 212, 0.26, {
            vx: this.facing * 260,
            flipX: this.facing < 0,
            glowColor: passIdx % 2 === 0 ? 'cyan' : 'purple'
          });
          this.spawnPixelShockwave(
            targetX,
            hitY,
            124,
            passIdx % 2 === 0 ? 'cyan' : 'purple',
            0.26,
            false
          );
          if (passIdx % 2 === 1) {
            this.spawnPixelLightningBolt(
              targetX + (passIdx - 2) * 26,
              this.groundY - 260,
              this.groundY,
              'cyan',
              0.28
            );
          }
          if (game?.audio) game.audio.play('slash', targetX);
          game?.renderer?.triggerShake(8, 0.12);
          if (enemy && !enemy.isDead) {
            enemy.takeDamage(25, this, true, 16, -95);
          }
        }
      }
      return;
    }

    // Stage 3 (1.26s -> Row 4 F21..F29): SUSANOO GROUNDED HEAVEN-SPLIT IMPACT, JUDGEMENT PILLAR & RAIJIN STORM!
    if (t >= 1.26 && !this.didSecondaryAction) {
      this.didSecondaryAction = true;
      this.x = landX;
      this.y = this.groundY;
      this.facing = targetX >= this.x ? 1 : -1;
      this.divePitchRad = 0;
      this.spawnSayaGlint(true);

      const apexPt = omniPasses[5].p0;
      this.addSlashLine(apexPt.x, apexPt.y - 62, landX, this.groundY - 42, 0.58, true);
      this.addSlashLine(targetX, this.groundY - 275, targetX, this.groundY, 0.54, true);

      // Erupt Row-1 Cross-Slash Detonation + Row-2 Judgement Thunder Pillar + Row-3 Raijin Storm Ring + Row-4 Slash Ring!
      this.spawnVfxAnim(1, targetX, this.groundY - 98, 248, 248, 0.52, {
        startFrame: 18,
        endFrame: 29,
        glowColor: 'cyan'
      });
      this.spawnVfxAnim(2, targetX, this.groundY - 104, 240, 240, 0.56, {
        startFrame: 18,
        endFrame: 29,
        glowColor: 'purple'
      });
      this.spawnVfxAnim(3, targetX, this.groundY - 84, 244, 244, 0.48, {
        glowColor: 'cyan'
      });
      this.spawnVfxAnim(4, targetX, this.groundY - 92, 232, 232, 0.42, {
        glowColor: 'cyan'
      });

      this.spawnPixelShockwave(targetX, this.groundY - 6, 235, 'cyan', 0.44, true);
      this.spawnPixelShockwave(targetX, this.groundY - 82, 175, 'gold', 0.38, false);
      this.spawnPixelLightningBolt(targetX, this.groundY - 310, this.groundY, 'gold', 0.44);
      this.spawnPixelLightningBolt(targetX - 56, this.groundY - 270, this.groundY, 'cyan', 0.38);
      this.spawnPixelLightningBolt(targetX + 56, this.groundY - 270, this.groundY, 'purple', 0.38);

      if (game?.audio) {
        game.audio.play('thunder_slam', targetX);
      }
      game?.renderer?.triggerShake(15, 0.28);
      game?.renderer?.triggerAberration(9);
      game?.renderer?.triggerHitStop(0.06);
      game?.vfx?.spawnBurst(targetX, this.groundY - 68, 32, '#818cf8', 320, {
        upBias: 175,
        size: 7
      });
      game?.vfx?.spawnDamageText(
        targetX,
        this.groundY - 176,
        0,
        true,
        '★ SUSANOO HEAVEN-SPLIT! ★',
        '#38bdf8'
      );

      if (enemy && !enemy.isDead) {
        enemy.takeDamage(54, this, true, 220, -245);
      }
    }

    if (t >= this.ultDuration) {
      this._omniStep = 0;
      this.y = this.groundY;
      this.divePitchRad = 0;
      this.isInvulnerable = false;
      this.susanooAvatar = null;
      this.setState('IDLE');
    }
  }

  /**
   * 3-Pass HD-2D Additive Bloom Renderer for Kaze-Maru's 208x208 VFX Sheet (`assets/sprites/ronin_vfx.png`).
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
    renderer = null,
    glowColor = 'cyan'
  ) {
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;
    const cell = 208;
    const sx = Math.max(0, Math.min(29, Math.floor(col))) * cell;
    const sy = Math.max(0, Math.min(4, Math.floor(row))) * cell;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(x), Math.round(y));
    if (flipX) ctx.scale(-1, 1);

    const glowSprite =
      glowColor === 'purple' ? renderer?.glowPurple || renderer?.glowCyan : renderer?.glowCyan;
    if (glowSprite) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, alpha * 0.42);
      const gw = Math.round(w * 1.15);
      const gh = Math.round(h * 1.15);
      ctx.drawImage(glowSprite, -gw * 0.5, -gh * 0.5, gw, gh);
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.drawImage(vfxSheet, sx, sy, cell, cell, -w * 0.5, -h * 0.5, w, h);

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, alpha * 0.52);
    ctx.drawImage(vfxSheet, sx, sy, cell, cell, -w * 0.5, -h * 0.5, w, h);

    ctx.restore();
  }

  drawForegroundOverlay(ctx, renderer = null) {
    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    this.fx.renderLayer(ctx, 'back', arenaCenterX, this.groundY, 0.96);

    const sprites = PixelForge.initAssets().ronin;
    const vfxSheet = sprites?.vfx;

    // 1. Render Indigo-Cyan Lightning Afterimage Clones (pure un-rotated HD-2D frames!)
    if (this.afterimages.length > 0 && sprites && sprites.sheet && sprites.sheet.complete) {
      for (const img of this.afterimages) {
        const alpha = Math.max(0, (1 - img.age / img.maxLife) * 0.58);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(Math.round(img.x / 4) * 4, Math.round(img.y / 4) * 4);
        ctx.scale(img.facing, 1);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha;
        PixelForge.drawAfterimageFrame(ctx, sprites, img.frameIdx || 190, 208, 208);
        ctx.restore();
      }
    }

    // 2. Render Background/Midground 3-Pass Bloomed 30fps Ronin VFX Sheet Animations (Rows 0..2: Crescent Waves, Sky-Odachi, Dragon Pillar)
    if (this.activeVfxAnims.length > 0 && vfxSheet && vfxSheet.complete) {
      for (const v of this.activeVfxAnims) {
        if (v.row >= 3) continue;
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
    const sprites = PixelForge.initAssets().ronin;
    const vfxSheet = sprites?.vfx;

    // 1. Render Foreground Row-3 Raijin Halo Crest & Row-4 Thousand-Blade Slash Ring IN FRONT of characters!
    if (this.activeVfxAnims.length > 0 && vfxSheet && vfxSheet.complete) {
      for (const v of this.activeVfxAnims) {
        if (v.row < 3) continue;
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

    // 2. Render 120Hz ArcaneShaderFX `front` layer (Mach-Cone, Judgment Beams, Sky Thunderbolts, Front Raijin Rings & Motes)
    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    this.fx.renderLayer(ctx, 'front', arenaCenterX, this.groundY, 0.98);
  }

  draw(ctx, isReflection = false, renderer = null) {
    const sprites = PixelForge.initAssets().ronin;
    if (!sprites) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const w = 208;
    const h = 208;
    const frameIdx = PixelForge.getFrameIndex(this, this.walkPhase);

    const groundPlantOffset = 4;

    ctx.translate(
      Math.round(this.x),
      Math.round(this.y + groundPlantOffset)
    );
    ctx.scale(this.facing, 1);

    PixelForge.drawSheetFrame(ctx, sprites, this, w, h, this.walkPhase, isReflection, renderer);

    if (this.hitFlash > 0 && !isReflection) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5;
      PixelForge.drawGhostFrame(ctx, sprites, frameIdx, w, h);
    }

    ctx.restore();
  }
}
