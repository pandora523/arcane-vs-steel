import { Fighter } from './Fighter.js?v=30fps66';
import { PixelForge } from '../engine/PixelForge.js?v=30fps66';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps66';
import { STORM_EFFECT_REGISTRY } from '../engine/shaders/stormShaders.js?v=30fps66';

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
      maxHp: 3600,
      moveSpeed: 234,
      attackRange: 182,
      autoInterval: 0.88,
      lightColor: 'rgba(129, 140, 248, 1)',
      primaryColor: '#818cf8'
    });
    this.heroId = 'ronin';
    this.deathSfx = 'death_ronin';
    this.skillName = 'ZANTETSUKEN FLASH';
    this.ultName = 'SUSANOO OMNISLASH';
    this.hasTrueUltimate = true;
    this.trueUltName = 'AMAKAKERU: THOUSAND THUNDER JUDGMENTS';
    this.trueUltDuration = 4.40;
    this.theme = 'storm';
    this.hasPoise = false;
    this.skillTriggerRange = 440;
    this.skillMaxCooldown = 4.75;
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
    // 5. Active 30fps HD-2D VFX sheet animations (Row 0..7 of assets/sprites/ronin_vfx.png)
    this.activeVfxAnims = [];
    this._ultTargetX = 600;
    this.susanooAvatar = null;

    // 6. Supreme Ultimate (`AMAKAKERU: THOUSAND THUNDER JUDGMENTS`) state
    this._trueUltInit = false;
    this._trueUltStep = 0;
    this._trueUltCutsDone = 0;
    this._trueUltTargetX = 600;
    this.raijinEyeSeal = null;
    this.spatialJudgmentRifts = [];
    this.amakakeruCleaves = [];

    this.fx = new ArcaneShaderFX(STORM_EFFECT_REGISTRY, {
      pixelScale: 3,
      viewW: 440,
      viewH: 220
    });

    if (typeof Image !== 'undefined') {
      const roninAssets = PixelForge.initAssets()?.ronin;
      if (roninAssets?.vfx?.src && !roninAssets.vfx.src.includes('v=30fps63')) {
        roninAssets.vfx.src = 'assets/sprites/ronin_vfx.png?v=30fps66';
      }
    }
  }

  setState(newState) {
    super.setState(newState);
    if (newState !== 'CROUCH') {
      this.iaidoCounterActive = false;
      this.fx?.stopByKey('sereneMindParryWard');
    }
    if (newState !== 'SKILL' && newState !== 'ULTIMATE' && newState !== 'TRUE_ULTIMATE') {
      this.fx?.stopByKey('shunpoSpearMachCone');
    }
    if (newState !== 'ULTIMATE' && newState !== 'TRUE_ULTIMATE') {
      this.susanooAvatar = null;
      this.fx?.stopByKey('susanooStormDomain');
    }
    if (
      newState !== 'SKILL' &&
      newState !== 'ULTIMATE' &&
      newState !== 'TRUE_ULTIMATE' &&
      newState !== 'DASH' &&
      newState !== 'WALK'
    ) {
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
    if (newState === 'TRUE_ULTIMATE') {
      this._trueUltInit = false;
      this._trueUltStep = 0;
      this._trueUltCutsDone = 0;
      this.raijinEyeSeal = null;
      this.spatialJudgmentRifts = [];
      this.amakakeruCleaves = [];
      this.trueUltFrameOverride = 214;
    } else {
      this._trueUltInit = false;
      this.trueUltFrameOverride = null;
      this.raijinEyeSeal = null;
      this.spatialJudgmentRifts = [];
      this.amakakeruCleaves = [];
      this.cameraAirLift = 0;
      this.unstoppablePoise = false;
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
      offsetY: opts.offsetY || 0,
      inFront: opts.inFront !== undefined ? Boolean(opts.inFront) : row >= 3
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
    const isTrueUltBlitz =
      this.state === 'TRUE_ULTIMATE' && this.stateTimer >= 1.05 && this.stateTimer < 2.85;
    if (isSkillDive || isUltDive || isTrueUltBlitz) {
      const isHeavenSplit =
        (this.state === 'ULTIMATE' && this.stateTimer >= 1.02) ||
        (this.state === 'TRUE_ULTIMATE' && this.stateTimer >= 2.35);
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

    attacker.takeDamage(72, this, true, 145, -155);
    this.heal(20, 'SERENE FOCUS');
    this.gainMana(4);
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
          if (game.audio) game.audio.play('raijin_slash', t.x);
          game.renderer.triggerShake(7, 0.15);
          game.vfx.spawnBurst(t.x, t.y - 82, 16, '#818cf8', 235, { upBias: 95, size: 5 });
          game.vfx.spawnDamageText(t.x, t.y - 156, 0, true, 'JUDGMENT SHEATH!', '#38bdf8');
          t.takeDamage(38, this, true, 95, -145);
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
        enemy.takeDamage(52, this, true, 125, -135);
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
          enemy.takeDamage(34, this, false, 45, -130);
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
          enemy.takeDamage(38, this, true, 95, 120);
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
          const dmg = (step === 0 ? 47 : 52) * (isCrit ? 1.35 : 1);
          enemy.takeDamage(dmg, this, isCrit, 75, step === 1 ? -145 : 0);
          this.gainMana(2.4);
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
          enemy.takeDamage(55, this, true, 35, -125);
          this.gainMana(3.5);

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
          enemy.takeDamage(34, this, passIdx === 2, 22, -98);
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
        enemy.takeDamage(72, this, true, 165, -210);
      }
      this.heal(18, 'ZANSHIN FOCUS');
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
            enemy.takeDamage(35, this, true, 16, -95);
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

      this.heal(22, 'SUSANOO FOCUS');
      if (enemy && !enemy.isDead) {
        enemy.takeDamage(94, this, true, 220, -245);
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

  updateTrueUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    const ww = game?.renderer?.worldWidth || 1600;

    // Guarantee PixelForge.getFrameIndex honors trueUltFrameOverride (isCrouching/isFlipVault/isBlinkTeleport = false)
    this.isInvulnerable = true;
    this.unstoppablePoise = true;
    this.isFlipVault = false;
    this.isCrouching = false;
    this.isBlinkTeleport = false;
    this.vx = 0;
    this.vy = 0;

    // Resolve active enemy target (supports 1v1 & 3v3 tag modes)
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

    if (!this._trueUltInit) {
      this._trueUltInit = true;
      this._trueUltStep = 0;
      this._trueUltCutsDone = 0;
      this._trueUltOriginX = this.x;
      this._trueUltAfterimageAcc = 0;

      const initTargetX = focusEnemy
        ? Math.max(160, Math.min(ww - 160, focusEnemy.x))
        : Math.max(160, Math.min(ww - 160, this.x + this.facing * 290));
      this._trueUltTargetX = initTargetX;
      if (Math.abs(initTargetX - this.x) > 8) {
        this.facing = initTargetX >= this.x ? 1 : -1;
      }
      this.y = this.groundY;

      if (game?.audio) {
        game.audio.play('ult_cast', this.x);
        game.audio.play('parry_clang', this.x);
      }
      if (game?.renderer) {
        game.renderer.ultDim = Math.max(game.renderer.ultDim || 0, 0.52);
        game.renderer.triggerShake(7, 0.20);
      }

      // Manifest Row 5 Raijin Thunder-Drum Eye Seal behind Kaze-Maru + 2.5D Susanoo Storm Domain
      this.raijinEyeSeal = {
        x: this.x - this.facing * 8,
        y: this.groundY - 108,
        age: 0,
        alpha: 1.0,
        floorLockAlpha: 0
      };
      this.spatialJudgmentRifts = [];
      this.amakakeruCleaves = [];

      this.spawnSayaGlint(false);
      this.spawnPixelShockwave(this.x, this.groundY - 4, 155, 'cyan', 0.36, true);
      this.fx.spawn('susanooStormDomain', this.x, this.groundY, {
        key: 'susanooStormDomain',
        follow: this,
        offsetX: 0,
        offsetY: 0,
        useGroundY: true,
        light: 1.38
      });

      if (game?.vfx) {
        game.vfx.spawnShockwave(this.x, this.groundY - 4, 165, '#38bdf8', 0.34, true);
        game.vfx.spawnDamageText(
          this.x,
          this.groundY - 168,
          0,
          true,
          '★ AMAKAKERU: THOUSAND THUNDER JUDGMENTS ★',
          '#38bdf8'
        );
      }
    }

    // Sustain dramatic 0.52 Ult Dim through the 8-angle blitz & tense Saya resheath, fading cleanly after 3.35s
    if (game?.renderer && t < 3.90) {
      const dimTarget = t <= 3.35 ? 0.52 : 0.52 * Math.max(0, 1 - (t - 3.35) / 0.55);
      game.renderer.ultDim = Math.max(game.renderer.ultDim || 0, dimTarget);
    }

    // Track active target smoothly before blitz locks the storm-web center
    if (t < 1.25 && focusEnemy && !focusEnemy.isDead) {
      const desiredX = Math.max(160, Math.min(ww - 160, focusEnemy.x));
      this._trueUltTargetX += (desiredX - this._trueUltTargetX) * Math.min(1, dt * 8.5);
    }
    const targetX = this._trueUltTargetX;

    // Step Row 5 Raijin Thunder-Drum Eye Seal
    if (this.raijinEyeSeal) {
      this.raijinEyeSeal.age += dt;
      if (t < 1.05 || t >= 2.85) {
        this.raijinEyeSeal.x = this.x - this.facing * 8;
        this.raijinEyeSeal.y = this.y - 106;
      } else {
        this.raijinEyeSeal.x = targetX;
        this.raijinEyeSeal.y = this.groundY - 118;
      }
      this.raijinEyeSeal.alpha =
        t < 3.65 ? Math.min(1, t / 0.22) : Math.max(0, 1 - (t - 3.65) / 0.45);
      this.raijinEyeSeal.floorLockAlpha =
        t >= 1.05 && t < 3.65
          ? Math.min(1, (t - 1.05) / 0.20) * (t <= 3.35 ? 1 : Math.max(0, 1 - (t - 3.35) / 0.30))
          : 0;
    }

    // Step 8 persistent suspended Row 6 Spatial Judgment-Cut Rifts
    for (let i = this.spatialJudgmentRifts.length - 1; i >= 0; i--) {
      const rift = this.spatialJudgmentRifts[i];
      rift.age += dt;
      if (rift.detonated) {
        rift.detonateAge += dt;
        if (rift.detonateAge >= 0.46) {
          this.spatialJudgmentRifts.splice(i, 1);
        }
      }
    }

    // Step Row 7 Amakakeru Heaven-Splitting Thunder Cleaves
    for (let i = this.amakakeruCleaves.length - 1; i >= 0; i--) {
      const c = this.amakakeruCleaves[i];
      c.age += dt;
      if (c.age >= c.maxLife) {
        this.amakakeruCleaves.splice(i, 1);
      }
    }

    // Pin target inside the 8-rift storm web between 1.05s and 3.35s detonation
    if (t >= 1.08 && t < 3.35 && focusEnemy && !focusEnemy.isDead && this.spatialJudgmentRifts.length > 0) {
      const drift = focusEnemy.x - targetX;
      if (Math.abs(drift) > 40) {
        focusEnemy.x -= Math.sign(drift) * Math.min(Math.abs(drift) - 40, dt * 380);
      }
      focusEnemy.vx *= 0.18;
    }

    // =========================================================================
    // PHASE 1 (0.00s..1.05s): Motionless Iaido Battoujutsu Crouch (Row 7 F04..F08)
    //                         & Row 5 Raijin Thunder-Drum Eye Seal
    // =========================================================================
    if (t < 1.05) {
      this.y = this.groundY;
      this.cameraAirLift = 0;
      this.divePitchRad = 0;
      if (focusEnemy && !focusEnemy.isDead && Math.abs(focusEnemy.x - this.x) > 8) {
        this.facing = focusEnemy.x >= this.x ? 1 : -1;
      }
      // Row 7 F04..F08 = indices 214..218 (motionless deep coiled Iaido crouch with Koiguchi sparks)
      this.trueUltFrameOverride = 214 + Math.min(4, Math.floor((t / 1.05) * 5));

      if (t >= 0.52 && this._trueUltStep < 1) {
        this._trueUltStep = 1;
        if (game?.audio) game.audio.play('parry_clang', this.x);
        this.spawnSayaGlint(false);
        this.spawnPixelShockwave(this.x, this.groundY - 4, 130, 'gold', 0.28, true);
      }
      return;
    }

    // =========================================================================
    // PHASE 2 (1.05s..2.85s): Vanish at Godspeed, 8-Angle Lightning Blitz &
    //                         8 Persistent Suspended Row 6 Spatial Judgment-Cut Rifts
    // =========================================================================
    if (t < 2.85) {
      if (this._trueUltStep < 2) {
        this._trueUltStep = 2;
        if (game?.audio) {
          game.audio.play('blink', this.x);
          game.audio.play('dash_whoosh', this.x);
        }
        this.spawnAfterimage(this.x, this.groundY, this.facing, 7, 6, 0.34);
        this.spawnPixelShockwave(this.x, this.groundY - 4, 145, 'cyan', 0.28, true);
      }

      // 8 distinct geometric blitz angles around (targetX, groundY - 92), 0.22s per pass across 1.05s..2.81s
      const PASS_SPECS = [
        // [startDX, startDY, endDX, endDY, riftDX, riftDY, riftAngleDeg, frameStart, frameSpan, inFront]
        [-195, -24, 185, -142, -68, -74, -22, 125, 3, true],
        [190, -168, -185, -26, 68, -78, 28, 128, 2, false],
        [-175, -18, 175, -196, -38, -138, -42, 130, 2, true],
        [205, -88, -205, -84, 82, -108, 4, 132, 2, true],
        [-165, -215, 168, -20, -78, -118, 48, 137, 3, false],
        [168, -22, -165, -212, 42, -144, -52, 134, 3, true],
        [-210, -96, 210, -92, -26, -54, 14, 132, 2, false],
        [48, -245, -52, -12, 24, -92, 74, 138, 3, true]
      ];

      const blitzElapsed = Math.max(0, t - 1.05);
      const passDur = 0.22;
      const passIdx = Math.min(7, Math.floor(blitzElapsed / passDur));
      const passU = Math.min(1, (blitzElapsed - passIdx * passDur) / passDur);
      const spec = PASS_SPECS[passIdx];

      // Trigger cut SFX, persistent Row 6 Spatial Judgment-Cut Rift & 12 dmg light cut as each pass crosses target!
      while (this._trueUltCutsDone <= passIdx && (passU >= 0.28 || this._trueUltCutsDone < passIdx)) {
        const k = this._trueUltCutsDone;
        this._trueUltCutsDone++;
        const s = PASS_SPECS[k];
        const rx = targetX + s[4];
        const ry = this.groundY + s[5];
        const baseRiftAngle = Math.atan2(20, 35); // Row 6 intrinsic diagonal (~29.7 deg)
        const desiredAngle = (s[6] * Math.PI) / 180;

        this.spatialJudgmentRifts.push({
          index: k,
          x: rx,
          y: ry,
          angleRad: desiredAngle - baseRiftAngle,
          inFront: s[9],
          glowColor: k % 3 === 0 ? 'gold' : k % 2 === 0 ? 'cyan' : 'purple',
          age: 0,
          detonated: false,
          detonateAge: 0
        });

        this.addSlashLine(
          targetX + s[0] * 0.72,
          this.groundY + s[1],
          targetX + s[2] * 0.72,
          this.groundY + s[3],
          2.35 - k * 0.21,
          false
        );

        if (game?.audio) {
          game.audio.play('raijin_slash', rx);
          game.audio.play('dash_whoosh', rx);
        }
        if (game?.renderer) {
          game.renderer.triggerShake(5, 0.10);
          game.renderer.triggerHitStop(0.016);
        }
        this.spawnPixelShockwave(rx, ry, 108, k % 2 === 0 ? 'cyan' : 'purple', 0.24, false);

        // 8 x 18 light pinning cuts keeping the foe suspended inside the storm web!
        let cutAny = false;
        for (const foe of foes) {
          if (foe && !foe.isDead && !foe.isBenched && Math.abs(foe.x - targetX) < 205) {
            foe.takeDamage(foe === focusEnemy ? 17 : 13, this, false, 14, -24);
            foe.vx = (targetX - foe.x) * 3.4;
            foe.x += (targetX - foe.x) * 0.35;
            cutAny = true;
          }
        }
        if (!cutAny && focusEnemy && !focusEnemy.isDead) {
          focusEnemy.takeDamage(17, this, false, 14, -24);
          focusEnemy.vx = (targetX - focusEnemy.x) * 3.4;
          focusEnemy.x += (targetX - focusEnemy.x) * 0.35;
        }
      }

      const startX = Math.max(85, Math.min(ww - 85, targetX + spec[0]));
      const startY = this.groundY + spec[1];
      const endX = Math.max(85, Math.min(ww - 85, targetX + spec[2]));
      const endY = this.groundY + spec[3];
      const easePass = 1 - Math.pow(1 - passU, 2.2);

      this.x = startX + (endX - startX) * easePass;
      this.y = Math.min(this.groundY, startY + (endY - startY) * easePass + 28);
      this.facing = endX >= startX ? 1 : -1;
      this.divePitchRad = Math.atan2(endY - startY, Math.abs(endX - startX) || 1);
      this.cameraAirLift = Math.max(0, (this.groundY - this.y) * 0.55);

      const fIdx = spec[7] + Math.min(spec[8] - 1, Math.floor(passU * spec[8]));
      this.trueUltFrameOverride = fIdx;
      this.syncSpearMachCone();

      this._trueUltAfterimageAcc += dt;
      if (this._trueUltAfterimageAcc >= 0.024) {
        this._trueUltAfterimageAcc = 0;
        this.spawnAfterimage(this.x, this.y, this.facing, 4, fIdx - 120, 0.30);
      }
      return;
    }

    // =========================================================================
    // PHASE 3 (2.85s..4.40s): Reappear on Far Flank Facing AWAY, Slow Saya Slide,
    //                         t = 3.35s Guard Click -> 8-Rift + Row 7 Cleave (590 Crit!)
    // =========================================================================
    if (this._trueUltStep < 3) {
      this._trueUltStep = 3;
      this.divePitchRad = 0;
      this.cameraAirLift = 0;
      this.fx?.stopByKey('shunpoSpearMachCone');

      // Pick roomy far flank opposite origin (or whichever side has clear arena room)
      const preferredFlank = this._trueUltOriginX <= targetX ? 1 : -1;
      let flankX = targetX + preferredFlank * 215;
      if (flankX < 115 || flankX > ww - 115) {
        flankX = targetX - preferredFlank * 215;
      }
      this.x = Math.max(110, Math.min(ww - 110, flankX));
      this.y = this.groundY;
      // Face AWAY from the enemy for the iconic Iaido Noto resheath execution!
      this.facing = this.x >= targetX ? 1 : -1;

      if (game?.audio) game.audio.play('blink', this.x);
      this.spawnAfterimage(targetX - this.facing * 45, this.groundY - 30, this.facing, 4, 20, 0.28);
      this.spawnPixelShockwave(this.x, this.groundY - 4, 118, 'cyan', 0.26, true);
    }

    if (t < 3.35) {
      // 2.85s..3.35s: Slowly slide katana into Saya scabbard (Row 7 F27->F26->F00..F04)
      const uSheath = (t - 2.85) / 0.50;
      const sheathFrames = [237, 236, 210, 211, 212, 213, 214];
      this.trueUltFrameOverride =
        sheathFrames[Math.min(sheathFrames.length - 1, Math.floor(uSheath * sheathFrames.length))];
      this.y = this.groundY;
      return;
    }

    // t >= 3.35s: TSUBA GUARD CLICKS SHUT -> DETONATE ALL 8 RIFTS + COLOSSAL ROW 7 AMAKAKERU CLEAVE!
    if (this._trueUltStep < 4) {
      this._trueUltStep = 4;
      this.y = this.groundY;
      this.spawnSayaGlint(true);

      if (game?.audio) {
        game.audio.play('parry_clang', this.x);
        game.audio.play('raijin_slash', targetX);
        game.audio.play('thunder_slam', targetX);
        game.audio.play('hit_crit', targetX);
      }
      if (game?.renderer) {
        game.renderer.triggerImpactFrame?.(targetX, this.groundY - 92, 0.15, 'storm');
        game.renderer.triggerShake(22, 0.38);
        game.renderer.triggerAberration(12);
        game.renderer.triggerHitStop(0.085);
      }

      // Simultaneously detonate all 8 suspended Row 6 Spatial Judgment-Cut Rifts!
      for (const rift of this.spatialJudgmentRifts) {
        rift.detonated = true;
        rift.detonateAge = 0;
        this.spawnPixelShockwave(rift.x, rift.y, 132, 'gold', 0.32, false);
      }

      // Erupt colossal screen-tall Row 7 Amakakeru Heaven-Splitting Thunder Cleave!
      const cleaveSpecs = [
        { x: targetX, w: 312, h: 528, maxLife: 0.98, glow: 'cyan', inFront: true },
        { x: Math.max(90, targetX - 106), w: 228, h: 392, maxLife: 0.86, glow: 'purple', inFront: false },
        { x: Math.min(ww - 90, targetX + 106), w: 228, h: 392, maxLife: 0.86, glow: 'gold', inFront: false }
      ];
      for (const cs of cleaveSpecs) {
        this.amakakeruCleaves.push({
          x: cs.x,
          groundY: this.groundY,
          w: cs.w,
          h: cs.h,
          age: 0,
          maxLife: cs.maxLife,
          glowColor: cs.glow,
          inFront: cs.inFront
        });
      }

      this.spawnPixelShockwave(targetX, this.groundY - 6, 310, 'cyan', 0.48, true);
      this.spawnPixelShockwave(targetX, this.groundY - 92, 225, 'gold', 0.40, false);
      this.spawnPixelLightningBolt(targetX, this.groundY - 460, this.groundY, 'gold', 0.48);
      this.spawnPixelLightningBolt(targetX - 78, this.groundY - 380, this.groundY, 'cyan', 0.42);
      this.spawnPixelLightningBolt(targetX + 78, this.groundY - 380, this.groundY, 'purple', 0.42);
      this.spawnVfxAnim(4, targetX, this.groundY - 96, 260, 260, 0.44, {
        glowColor: 'cyan',
        inFront: true
      });

      if (game?.vfx) {
        game.vfx.spawnShockwave(targetX, this.groundY - 6, 325, '#38bdf8', 0.48, true);
        game.vfx.spawnSlash(targetX, this.groundY - 92, 235, -Math.PI, Math.PI, '#67e8f9', 0.42);
        game.vfx.spawnBurst(targetX, this.groundY - 76, 36, '#818cf8', 355, {
          upBias: 210,
          size: 7
        });
        game.vfx.spawnDamageText(
          targetX,
          this.groundY - 198,
          0,
          true,
          '★ THOUSAND THUNDER JUDGMENTS! ★',
          '#fef08a'
        );
      }

      this.heal(Math.round(this.maxHp * 0.12), 'RAIJIN RENEWAL');
      // Deal ONE massive 545 Crit burst!
      let hitFinisher = false;
      for (const foe of foes) {
        if (foe && !foe.isDead && !foe.isBenched && Math.abs(foe.x - targetX) < 255) {
          foe.takeDamage(foe === focusEnemy ? 545 : 415, this, true, 255, -285);
          hitFinisher = true;
        }
      }
      if (!hitFinisher && focusEnemy && !focusEnemy.isDead) {
        focusEnemy.takeDamage(545, this, true, 255, -285);
      }
    }

    if (t < 4.05) {
      // 3.35s..4.05s: Motionless sheathed Zanshin crouch facing away (Row 7 F05..F08 = 215..218)
      const uHold = (t - 3.35) / 0.70;
      this.y = this.groundY;
      this.trueUltFrameOverride = 215 + Math.min(3, Math.floor(uHold * 4));
      return;
    }

    // 4.05s..4.40s: Smooth rise from sheathed Iaido crouch back to standing neutral (Row 7 F25..F29 = 235..239)
    const uRise = Math.min(1, (t - 4.05) / 0.35);
    this.y = this.groundY;
    this.trueUltFrameOverride = 235 + Math.min(4, Math.floor(uRise * 5));

    if (t >= this.trueUltDuration) {
      this.y = this.groundY;
      this.divePitchRad = 0;
      this.cameraAirLift = 0;
      this.isInvulnerable = false;
      this.unstoppablePoise = false;
      this.trueUltFrameOverride = null;
      this.raijinEyeSeal = null;
      this.spatialJudgmentRifts = [];
      this.amakakeruCleaves = [];
      if (focusEnemy && !focusEnemy.isDead && Math.abs(focusEnemy.x - this.x) > 8) {
        this.facing = focusEnemy.x >= this.x ? 1 : -1;
      }
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
    glowColor = 'cyan',
    angleRad = 0
  ) {
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;
    const cell = 208;
    const sx = Math.max(0, Math.min(29, Math.floor(col))) * cell;
    const sy = Math.max(0, Math.min(7, Math.floor(row))) * cell;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(x), Math.round(y));
    if (angleRad) ctx.rotate(angleRad);
    if (flipX) ctx.scale(-1, 1);

    const glowSprite =
      glowColor === 'gold'
        ? renderer?.glowGold || renderer?.glowCyan
        : glowColor === 'purple'
          ? renderer?.glowPurple || renderer?.glowCyan
          : renderer?.glowCyan;
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

  drawSpatialRiftsLayer(ctx, vfxSheet, renderer, inFrontPass) {
    if (!this.spatialJudgmentRifts || this.spatialJudgmentRifts.length === 0 || !vfxSheet?.complete) {
      return;
    }
    const isPreClickTension =
      this.state === 'TRUE_ULTIMATE' && this.stateTimer >= 2.85 && this.stateTimer < 3.35;
    for (const rift of this.spatialJudgmentRifts) {
      if (Boolean(rift.inFront) !== inFrontPass) continue;
      const col = Math.floor(rift.age * 30) % 30;
      const appear = Math.min(1, rift.age / 0.10);
      const detFade = rift.detonated ? Math.max(0, 1 - rift.detonateAge / 0.46) : 1.0;
      if (detFade <= 0.02) continue;

      const scaleBoost = rift.detonated
        ? 1 + rift.detonateAge * 1.65
        : isPreClickTension
          ? 1.05 + Math.sin(this.stateTimer * 44 + rift.index) * 0.06
          : 1.0;
      const jx = isPreClickTension ? Math.sin(this.stateTimer * 62 + rift.index * 2.1) * 2.5 : 0;
      const jy = isPreClickTension ? Math.cos(this.stateTimer * 58 + rift.index * 1.7) * 2.5 : 0;

      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        6,
        col,
        rift.x + jx,
        rift.y + jy,
        Math.round(218 * appear * scaleBoost),
        Math.round(218 * appear * scaleBoost),
        0.96 * detFade,
        rift.index % 2 === 1,
        renderer,
        rift.detonated ? 'gold' : rift.glowColor,
        rift.angleRad
      );
    }
  }

  drawAmakakeruCleavesLayer(ctx, vfxSheet, renderer, inFrontPass) {
    if (!this.amakakeruCleaves || this.amakakeruCleaves.length === 0 || !vfxSheet?.complete) return;
    for (const c of this.amakakeruCleaves) {
      if (Boolean(c.inFront) !== inFrontPass) continue;
      const u = Math.min(1, Math.max(0, c.age / c.maxLife));
      const col = Math.min(29, Math.floor(u * 30));
      const fade = u > 0.78 ? (1 - u) / 0.22 : 1.0;
      // Row 7 floorY is at logical y = +36 (out of [-52, +52]), so anchor center at groundY - h * (36/104)
      const anchorY = c.groundY - c.h * (36 / 104);
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        7,
        col,
        c.x,
        anchorY,
        c.w,
        c.h,
        fade * 0.98,
        false,
        renderer,
        c.glowColor
      );
    }
  }

  drawForegroundOverlay(ctx, renderer = null) {
    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    this.fx.renderLayer(ctx, 'back', arenaCenterX, this.groundY, 0.96);

    const sprites = PixelForge.initAssets().ronin;
    const vfxSheet = sprites?.vfx;

    // 0. Supreme Ultimate Row 5 Raijin Thunder-Drum Eye Seal behind Kaze-Maru + 2.5D storm-wheel lock beneath target!
    if (this.raijinEyeSeal && vfxSheet?.complete) {
      const seal = this.raijinEyeSeal;
      const col = Math.floor(seal.age * 30) % 30;
      if (seal.floorLockAlpha > 0.02) {
        const cell = 208;
        const sx = ((col + 10) % 30) * cell;
        const sy = 5 * cell;
        const fw = 328;
        const fh = 328;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(Math.round(this._trueUltTargetX), Math.round(this.groundY - 4));
        ctx.scale(1, 0.32);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = seal.floorLockAlpha * 0.88;
        ctx.drawImage(vfxSheet, sx, sy, cell, cell, -fw * 0.5, -fh * 0.5, fw, fh);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = seal.floorLockAlpha * 0.55;
        ctx.drawImage(vfxSheet, sx, sy, cell, cell, -fw * 0.5, -fh * 0.5, fw, fh);
        ctx.restore();
      }
      if (seal.alpha > 0.02) {
        const deploy = Math.min(1, seal.age / 0.20);
        const sz = Math.round(258 * (0.6 + 0.4 * deploy));
        this.drawBloomedVfxCell(
          ctx,
          vfxSheet,
          5,
          col,
          seal.x,
          seal.y,
          sz,
          sz,
          seal.alpha * 0.94,
          false,
          renderer,
          'cyan'
        );
      }
    }

    this.drawSpatialRiftsLayer(ctx, vfxSheet, renderer, false);
    this.drawAmakakeruCleavesLayer(ctx, vfxSheet, renderer, false);

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

    // 2. Render Background/Midground 3-Pass Bloomed 30fps Ronin VFX Sheet Animations
    if (this.activeVfxAnims.length > 0 && vfxSheet && vfxSheet.complete) {
      for (const v of this.activeVfxAnims) {
        const isFront = v.inFront !== undefined ? v.inFront : v.row >= 3;
        if (isFront) continue;
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

    // 0. Crackling Storm-Web Lightning Cage linking the 8 Spatial Judgment-Cut Rifts (straight line segments only!)
    if (this.spatialJudgmentRifts.length >= 2) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const n = this.spatialJudgmentRifts.length;
      const seedTick = Math.floor((this.stateTimer || 0) * 30);
      for (let i = 0; i < n; i++) {
        const a = this.spatialJudgmentRifts[i];
        const b = this.spatialJudgmentRifts[(i + 1) % n];
        const fade = a.detonated ? Math.max(0, 1 - a.detonateAge / 0.32) : 0.82;
        if (fade <= 0.03) continue;

        const mx = (a.x + b.x) * 0.5 + (((seedTick * 17 + i * 31) % 19) - 9);
        const my = (a.y + b.y) * 0.5 + (((seedTick * 23 + i * 13) % 19) - 9);

        ctx.strokeStyle = a.detonated ? '#fef08a' : i % 2 === 0 ? '#67e8f9' : '#a78bfa';
        ctx.lineWidth = a.detonated ? 3.2 : 2.0;
        ctx.globalAlpha = fade * 0.85;
        ctx.beginPath();
        ctx.moveTo(Math.round(a.x), Math.round(a.y));
        ctx.lineTo(Math.round(mx), Math.round(my));
        ctx.lineTo(Math.round(b.x), Math.round(b.y));
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.0;
        ctx.globalAlpha = fade;
        ctx.stroke();
      }
      ctx.restore();
    }

    this.drawSpatialRiftsLayer(ctx, vfxSheet, renderer, true);
    this.drawAmakakeruCleavesLayer(ctx, vfxSheet, renderer, true);

    // 1. Render Foreground Row-3 Raijin Halo Crest & Row-4 Thousand-Blade Slash Ring IN FRONT of characters!
    if (this.activeVfxAnims.length > 0 && vfxSheet && vfxSheet.complete) {
      for (const v of this.activeVfxAnims) {
        const isFront = v.inFront !== undefined ? v.inFront : v.row >= 3;
        if (!isFront) continue;
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
